# React 18 并发渲染: Scheduler 时间切片、Lane 模型与 Suspense 原理（面试收藏级）

> **副标题**：MessageChannel 时间切片、事件优先级到 Lane 映射、startTransition 与 Suspense 协作

---

## 🎯 这篇文章解决什么问题

面试官问到并发渲染，十个人里九个会先背一句"React 18 可以让渲染变得可中断，不会阻塞主线程"。听起来没错，但追问一句就能试出深浅：**如果一个函数组件的渲染函数本身写了一个耗时 200ms 的同步循环，`startTransition` 能让这次渲染不阻塞页面吗？**

大多数人会下意识回答"能"——毕竟"并发渲染"听起来就是为了解决卡顿问题的。但真实答案是不能。这背后是一个经常被混淆的概念：React 的可中断渲染是**协作式调度**，不是操作系统线程调度那种**抢占式调度**。它能在一个个"工作单元"之间的检查点让出主线程，但没有能力打断正在执行中的某一个工作单元本身——如果这个工作单元自己跑了 200ms，React 无能为力，页面照样卡 200ms。

这一篇要讲透的，正是"可中断渲染"具体是怎么实现的：时间切片如何把渲染工作拆成能够让步的小任务，`MessageChannel` 为什么被选中作为调度的心脏，不同触发场景（点击、滚动、`setTimeout`、`startTransition`）的更新分别落到哪条 Lane 上，以及 `Suspense` 怎么知道一个组件"挂起"了、数据到达后又是怎么被重新调度渲染的。读完之后，你会同时获得两种确定感：**懂原理**（时间切片和优先级调度的真实机制边界在哪里）和**会讲**（面试官顺着任意一个环节往下挖都能拆解回答）。

---

## 一、使用与实践

### 1. useTransition：将非紧急更新标记为可中断的过渡态

处方审核列表按状态筛选时，如果列表有几千条数据，筛选逻辑本身的重渲染可能需要几十毫秒。用 `useTransition` 把这次更新标记为"过渡态"，可以在渲染进行期间展示一个 loading 提示，同时保证筛选输入框本身仍然可以立刻响应：

```jsx
function PrescriptionAuditList() {
  const [status, setStatus] = useState('all')
  const [isPending, startTransition] = useTransition()

  const handleStatusChange = (nextStatus) => {
    startTransition(() => {
      setStatus(nextStatus) // 触发大列表重渲染的更新，标记为可中断的过渡态
    })
  }

  return (
    <div>
      <StatusTabs value={status} onChange={handleStatusChange} />
      {isPending && <span className="loading-hint">列表更新中...</span>}
      <AuditTable status={status} />
    </div>
  )
}
```

`isPending` 在 `startTransition(callback)` 被调用后立刻变为 `true`（这是一次紧急优先级更新，立刻反映到 UI），`callback` 内部真正触发的 `setStatus` 更新则被标记为低优先级——如果用户在过渡态渲染进行期间又点了别的 Tab，新的高优先级点击可以直接打断正在进行的旧渲染，不需要排队等它先跑完。

### 2. startTransition：不需要 pending 状态时的轻量版 API

如果不需要展示 loading 状态，可以直接用从 `react` 导出的 `startTransition` 函数，不需要通过 Hook 获取：

```jsx
import { startTransition } from 'react'

function handleFilterInput(keyword) {
  setKeyword(keyword) // 紧急更新：输入框内容立刻反映
  startTransition(() => {
    setFilteredResult(computeFilteredList(keyword)) // 过渡态：可以被打断
  })
}
```

> 💬 **面试官会问**：`startTransition` 和 `useTransition` 的区别是什么？分别在什么场景用？
>
> ✅ **标准答案**：`useTransition` 是 Hook，额外返回一个 `isPending` 布尔值，适合需要在 UI 上展示"过渡中"提示的场景；`startTransition` 是从 `react` 直接导出的函数，不是 Hook，可以在组件外部（比如一个工具函数、事件监听器里）调用，但不提供 `isPending` 状态。两者内部触发更新时走的是同一条 `TransitionLane` 分配逻辑，唯一区别是有没有配套的 pending 状态。
>
> 🎁 **加分答案**：`useTransition` 本质上是 `startTransition` 加了一层 `useState` 包装——内部用 `setPending(true)`/`setPending(false)` 在转场前后同步派发两次更新，`setPending(true)` 特意提升到 `ContinuousEventPriority` 优先级立刻生效，`setPending(false)` 则和 `callback()` 内部真正的状态更新一起落进 `TransitionLane`。

### 3. useDeferredValue：让某个值"延迟跟随"最新值更新

`useDeferredValue` 解决的是另一个场景：不是"我主动决定哪次更新该降级"，而是"给我一个值，让它自动跟一个稍微滞后但不阻塞交互的版本"：

```jsx
function PatientSearchPanel() {
  const [keyword, setKeyword] = useState('')
  const deferredKeyword = useDeferredValue(keyword)

  return (
    <div>
      {/* 输入框绑定的是紧急更新的 keyword，永远流畅 */}
      <input value={keyword} onChange={e => setKeyword(e.target.value)} />
      {/* 搜索结果绑定滞后的 deferredKeyword，允许被打断重算 */}
      <PatientList keyword={deferredKeyword} />
    </div>
  )
}
```

当 `keyword` 快速变化时，`deferredKeyword` 会短暂停留在旧值上（`PatientList` 用旧关键词渲染，不阻塞输入），等紧急更新处理完、主线程有空闲时，React 才用最新的 `keyword` 值单独触发一次低优先级重渲染追上。

### 4. Suspense 配合 lazy()：组件级代码分割 + 加载态兜底

```jsx
const PrescriptionForm = React.lazy(() => import('./PrescriptionForm'))

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <PrescriptionForm />
    </Suspense>
  )
}
```

`React.lazy` 返回的组件在真正被渐染之前会触发一次模块异步加载，这个"加载中"的状态本质上就是一次挂起，由外层最近的 `Suspense` 边界接管展示 `fallback`。

### 5. Suspense 配合数据请求：结合支持 Suspense 的数据源实现"读取即挂起"模式

```jsx
function PatientVitalsCard({ patientId }) {
  // 这里的 readResource 内部约定：数据没到就 throw 一个 Promise，到了就正常 return 数据
  const vitals = readResource(`vitals-${patientId}`)
  return <VitalsChart data={vitals} />
}

function VitalsSection({ patientId }) {
  return (
    <Suspense fallback={<div>体征数据加载中...</div>}>
      <PatientVitalsCard patientId={patientId} />
    </Suspense>
  )
}
```

这种"读取即挂起"模式要求数据源本身实现约定的 `throw Promise` 接口（本篇「四、手写实现」会逐行讲透这个约定在渲染阶段是怎么被捕获的），React 官方目前只有少数数据源（如 `use()` 搭配的 Promise、部分框架的 Suspense-ready 数据请求库）原生支持这种写法。

### 6. 并发模式下 createRoot 是开启一切并发特性的前提

`useTransition`/`startTransition`/`useDeferredValue`/`Suspense` 的可中断能力全部建立在并发渲染之上——如果应用还在用 `ReactDOM.render`（Legacy 模式），这些 API 不会报错，但内部触发的更新会被强制降级为同步的 `SyncLane`，`isPending` 也不会有过渡效果，`Suspense` 会退化成"同步阻塞直到数据到达"的旧行为。这一点在第 01 篇已经建立过直觉，这里再次强调：**并发特性是 `createRoot` 送的能力，不是这几个 API 单独带来的**。

---

## 二、设计与原理

### 1. 时间切片的本质：把渲染拆成不超过 5ms 的工作单元

第 03 篇讲过 Fiber 把组件树从递归调用栈改造成了链表结构，`beginWork`/`completeWork` 处理一个 Fiber 节点就是一个"工作单元"。时间切片要解决的问题是：如果一次渲染要处理几百个 Fiber 节点，一口气跑完可能耗时几十甚至上百毫秒，期间主线程被完全占用，用户的点击、输入、滚动全部得不到响应。

时间切片的做法是：`workLoopConcurrent` 每处理完一个工作单元，就调用一次 `shouldYieldToHost()` 检查这一段预算（默认 5ms）是否用完，用完就立刻 `return`，把主线程还给浏览器；浏览器趁这个间隙去响应用户输入、执行动画、处理其它宏任务；下一段时间片到来时，`workLoopConcurrent` 从刚才中断的 `workInProgress` 指针位置继续处理，直到整棵树处理完毕。用户感知到的效果是"渲染没有一次性占死主线程"，但渲染总耗时并不会因此变短——时间切片换来的是响应性，不是速度。

### 2. 协作式调度 vs 抢占式调度

这是本篇最容易被混淆、也是面试官最爱追问的一点：React Scheduler 本质是**协作式调度（cooperative scheduling）**，不是**抢占式调度（preemptive scheduling）**。

JS 是单线程的，语言和运行时层面根本没有能力在任意一条指令处强行打断一个正在执行的函数——这是硬性的技术前提，不是 React 选择的结果。React 所谓的"可中断渲染"，实际上是把 Fiber 树的遍历拆成一个个工作单元，每处理完一个工作单元后，`workLoopConcurrent` **主动**调用 `shouldYieldToHost()` 检查是否该让步。这是任务自己在"约定好的检查点"选择让出主线程，属于协作式——工作单元本身的执行过程中不存在任何"被打断"的可能，只有工作单元与工作单元之间的空隙才是能被利用的让步窗口。

真正的抢占式调度（比如操作系统对线程的调度、早期 Go 运行时对 goroutine 的调度）是由调度器/运行时在任意时刻强行剥夺执行权，完全不需要任务本身配合——被抢占的任务甚至可能在一条机器指令执行到一半时就被挂起。React 做不到这一点，也从未打算做到这一点。

这个区别直接推翻了一个常见误解：**"并发渲染能让任意耗时的渲染都不卡顿"**——这是不对的。如果单个组件的渲染函数本身写了一个耗时很长的同步循环（比如函数组件体内直接跑一个复杂度很高的同步计算），`workLoopConcurrent` 只能在**工作单元之间**的检查点让步，没有任何机制能打断**正在执行中的某一个工作单元**本身——这个组件的渲染函数不管跑多久，都会阻塞主线程直到函数返回为止，`startTransition` 包裹与否毫无影响，因为它决定的是"这个更新以什么优先级排队"，而不是"这个更新的单次渲染函数能不能被打断"。

> 💬 **面试官会问**：React 的并发渲染是"抢占式调度"吗？为什么？
>
> ✅ **标准答案**：不是。JS 单线程环境里，运行时没有能力在任意指令处强行打断一个正在执行的函数，这是"抢占式"要求的能力，React 做不到。React 的"可中断"是协作式的——把渲染拆成一个个工作单元（对应 Fiber 节点的 `beginWork`/`completeWork`），每跑完一个工作单元后主动检查 `shouldYieldToHost()`，决定要不要把主线程让出去。中断点只存在于工作单元之间，工作单元内部没有任何让步的可能。
>
> 🎁 **加分答案**：这个机制解释了一个常见的性能坑——如果某个函数组件在渲染阶段写了一个昂贵的同步计算（比如没做 `useMemo` 缓存的大数组排序），不管这次更新是同步的还是被 `startTransition` 包裹的低优先级更新，这一次工作单元的执行都会完整阻塞主线程直到跑完，时间切片和优先级调度对此无能为力。真正要解决这类问题，得从"减少单次渲染函数的同步耗时"（拆分组件、`useMemo`、把重计算移出渲染路径）下手，不是靠调度层面的优化。

**对比 Vue 3**：Vue 3 的响应式更新调度同样运行在 JS 单线程环境里，`trigger` 触发的副作用走 `nextTick` 微任务队列，本质是"同一个 tick 内的多次触发合并成一次执行"，一旦真正开始执行这次更新，中途没有任何让步机制——不存在"处理到一半让出主线程再恢复"的概念。这不是 Vue 3 疏漏了什么，而是它的组件树遍历方式（配合编译期 PatchFlag 精确定位动态节点）本身开销远小于 React 需要覆盖的"任意动态 JSX 结构"场景，没有必要引入时间切片这层复杂度。协作式调度的让步能力是 React Fiber 架构为了应对完全动态渲染场景而特有的设计，Vue 3 的调度模型里没有对应机制。

### 3. 为什么用 MessageChannel 而不是 setTimeout(fn, 0)

时间切片依赖"把下一段工作安排到下一个宏任务里执行"这个动作，React 选择 `MessageChannel` 而不是更直觉的 `setTimeout(fn, 0)`，原因是浏览器对 `setTimeout` 的延迟有强制下限：HTML 规范要求嵌套调用 `setTimeout` 超过一定次数后，最小延迟会被 clamp 到 4ms（不同浏览器实现细节略有差异），这个延迟不稳定、也不受 React 控制。`MessageChannel` 的两个 `MessagePort` 之间通过 `postMessage` 触发的 `onmessage` 回调是一个纯粹的宏任务，没有最小延迟限制，调度粒度更稳定可控。

`MessageChannel` 不可用的环境（比如某些非浏览器宿主）才会降级用 `setTimeout(fn, 0)` 兜底。

> 💬 **面试官会问**：为什么 Scheduler 选择 `MessageChannel` 而不是 `setTimeout(fn, 0)`？
>
> ✅ **标准答案**：`setTimeout` 存在浏览器强制的最小延迟 clamp（嵌套调用后普遍被限制在 4ms 左右），这个延迟由浏览器决定、不稳定也不受控；`MessageChannel` 的 `postMessage`/`onmessage` 是纯宏任务调度，没有这个限制，时间片的调度间隔更加稳定可预测。`MessageChannel` 不可用时才降级为 `setTimeout` 兜底。

### 4. Scheduler 的任务队列：taskQueue 与 timerQueue 双小顶堆

Scheduler 内部维护两个小顶堆：`taskQueue` 存放"已经到达可执行时间"的任务，按 `expirationTime`（过期时间，值越小越紧急）排序；`timerQueue` 存放"还没到执行时间"的延迟任务（`unstable_scheduleCallback` 传了 `delay` 选项），按 `startTime` 排序。每次进入工作循环前，`advanceTimers` 会把 `timerQueue` 里已经到期的任务搬进 `taskQueue`。用小顶堆而不是普通数组排序的原因很直接：每次只需要取"最紧急的那个任务"（堆顶），插入和取出的复杂度都是 O(log n)，比每次插入后重新整体排序划算得多。

优先级和过期时间是两个不同的维度——`unstable_scheduleCallback` 接收的 `priorityLevel`（Immediate/UserBlocking/Normal/Low/Idle）会被换算成一个具体的超时时长（Immediate 几乎立即过期、Idle 几乎永不过期），加到当前时间上得到这个任务的 `expirationTime`。堆按 `expirationTime` 排序，本质上是"越紧急的优先级换算出的过期时间越早，因此越先被取出处理"，用一个统一的时间维度间接实现了多优先级调度。

### 5. 事件类型与 Lane 的绑定关系

第 02 篇讲过 Lane 模型的位运算细节，这里聚焦"触发场景怎么映射到具体 Lane"这个问题。不同触发来源的更新会被赋予不同的默认优先级——`requestUpdateLane` 在事件处理函数中被调用时，会根据当前事件的类型查表得到对应优先级：

- **离散事件**（`click`、`keydown`、`input` 等，用户主动触发且期待立即反馈）→ `DiscreteEventPriority` → 对应 `SyncLane`
- **连续事件**（`drag`、`scroll`、`mousemove` 等，触发频率高但不需要每次都同步处理）→ `ContinuousEventPriority` → 对应 `InputContinuousLane`
- **没有明确事件上下文的更新**（如 `setTimeout` 回调里的 `setState`）→ `DefaultEventPriority` → 对应 `DefaultLane`
- **`startTransition` 内部的更新** → 无论触发源是什么事件类型，都被强制标记为 `TransitionLane`，即使触发源是一次点击（本该走 `SyncLane`），也会被降级处理

这解释了一个常被问到的细节：**同一次点击事件里，直接写的 `setState` 和被 `startTransition` 包裹的 `setState` 为什么会分别走不同优先级**——两次调用发生在同一个原生事件回调内，但 `requestUpdateLane` 判断优先级时，第一步是检查 `ReactCurrentBatchConfig.transition` 是否非空（即当前是否处于 `startTransition` 的 `callback` 执行期间）；被包裹的那次调用时这个标记非空，直接分配 `TransitionLane`，不会走到"根据事件类型查表"这一步；没被包裹的那次调用这个标记为空，才会继续往下取当前事件的优先级。

### 6. startTransition 的调度降级

`startTransition(callback)` 内部把 `callback()` 执行期间触发的所有更新打上同一条 `TransitionLane`（同一次 `startTransition` 调用内的多次更新复用同一条 lane，靠一个模块级变量缓存，直到下一次真正进入新的事件才重新分配，这也是"同一事件内多次更新分配同一优先级"这个设计原则的具体体现）。`TransitionLane` 的优先级数值远低于 `SyncLane`/`InputContinuousLane`——按 Lane 模型"数值越小优先级越高"的约定，`TransitionLane` 系列的位排在 `SyncLane`/`InputContinuousLane`/`DefaultLane` 之后，这意味着一旦有更高优先级的更新（比如用户又点了一次别的按钮）插队，`getNextLanes` 会优先处理新来的高优先级更新，正在进行的低优先级过渡渲染会被丢弃、之后重新调度。

### 7. Suspense 与并发渲染的协作

`Suspense` 的挂起机制建立在 JS 异常处理机制之上：渲染中某个组件在函数体内 `throw` 了一个 Promise（而不是 `Error`），`workLoop` 会捕获到这次异常，判断抛出的值是不是一个"带 `then` 方法的对象"（thenable）——是的话就走挂起分支，不是的话按普通错误交给最近的错误边界处理。挂起分支会：

1. 沿 `return` 指针链向上找最近的 `Suspense` 边界，把它标记为 `ShouldCapture`
2. 给这个 Promise 挂一个 `then` 监听（`attachPingListener`），resolve 或 reject 时都调用 `pingSuspendedRoot`
3. 重新进入 `beginWork` 渲染这个 `Suspense` 边界的 `fallback` 内容

Promise resolve 后，`pingSuspendedRoot` 把这次挂起对应的 lane 标记为"已 ping"，重新触发一次调度——之前被挂起打断的渲染会用同一条（或新分配的）lane 重新走一遍，这次数据已经准备好，`readResource` 类的调用不会再 `throw`，组件正常渲染出真实内容，`Suspense` 边界据此判断不需要再展示 `fallback`。

> 💬 **面试官会问**：`Suspense` 是如何知道子组件"挂起"了的？resolve 之后 React 是怎么重新渲染的？
>
> ✅ **标准答案**：子组件在渲染函数执行过程中 `throw` 一个 Promise，`workLoop` 捕获到这个异常后判断它是不是 thenable，是则沿 Fiber 树的 `return` 链向上找到最近的 `Suspense` 边界标记为需要展示 `fallback`，同时给这个 Promise 挂一个 `then` 监听。Promise resolve 时这个监听触发，通知 root 这条 lane"已经可以重试"，React 重新调度一次渲染；这次组件重新执行渲染函数，数据已经就位，不再抛出异常，`Suspense` 边界看到子树正常完成，切换回展示真实内容。
>
> 🎁 **加分答案**：挂起处理会区分两种情况——找到了 `Suspense` 边界就展示 `fallback`；找不到边界，且当前渲染不是同步更新，则会一直向上 unwind 到根节点、不做二次渲染兜底（这种情况适用场景很窄，一般业务代码都会包一层 `Suspense`）。另外同一个 Promise 可能被多个 lane 同时依赖，React 用一个 `pingCache`（`WeakMap<Promise, Set<Lanes>>`）记录"这个 Promise 已经被哪些 lane 监听过"，避免重复挂 `then` 监听。

### 8. 优先级饿死与兜底机制的调度器视角

第 02 篇讲过 Lane 层面的饿死兜底（`markStarvedLanesAsExpired`）：如果一直有新的高优先级更新插队，低优先级更新理论上可能永远排不到，React 给每条 Lane 计算一个过期时间，超时后强制标记为"已过期"，下一次 `getNextLanes` 会优先处理过期的 lane。

这一层机制发生在 `react-reconciler` 内部，和它平行的还有 Scheduler 层面的另一层兜底：`unstable_scheduleCallback` 给每个任务计算 `expirationTime`（由 `priorityLevel` 换算得出），`taskQueue` 小顶堆本身就是按这个过期时间排序——即使一个任务的优先级不高，只要它在队列里等待的时间足够长，`expirationTime` 也会变得比新插入的高优先级任务更早，从而被优先取出执行。这两层机制（Lane 的过期兜底 + Scheduler 任务堆按过期时间排序）在两个不同的抽象层级上共同保证"低优先级任务不会无限期得不到执行"——Lane 层面决定"这批更新该不该被强制提升为同步渲染"，Scheduler 层面决定"这个具体的调度任务该不该在堆里排到前面"。

📍**配图点**：时间切片时间轴图——横向时间轴标出一次并发渲染被拆成的多个 5ms 工作片段，每段结尾标注 `shouldYieldToHost()` 检查点，片段之间插入"浏览器处理用户输入/绘制"的间隙，直观展示协作式让步发生在哪里、不发生在哪里。

📍**配图点**：事件类型 → EventPriority → Lane 映射表图——左列列出具体 DOM 事件类型（click/scroll/setTimeout 无上下文/startTransition），中列对应四档 EventPriority，右列对应具体 Lane 常量，用箭头连接三列，直观呈现「一、5」的映射关系。

📍**配图点**：Suspense 挂起-fallback-ping 时序图——一条时间轴依次标出"渲染开始 → 组件 throw Promise → 找到 Suspense 边界标记 ShouldCapture → 渲染 fallback → commit fallback → Promise resolve 触发 ping → 重新调度 → 重新渲染 → 组件正常返回数据 → commit 真实内容"十个节点。

---

## 三、源码解析（重点代码，来源 GitHub 仓库）

> React 18 源码地址：https://github.com/facebook/react（本篇断点调试环境已锁定 `v18.3.1`）

### 1. 时间片主循环：packages/scheduler/src/forks/Scheduler.js

```javascript
// workLoop（节选，shouldYieldToHost 的调用点）
function workLoop(hasTimeRemaining, initialTime) {
  let currentTime = initialTime;
  advanceTimers(currentTime);
  currentTask = peek(taskQueue);
  while (
    currentTask !== null &&
    !(enableSchedulerDebugging && isSchedulerPaused)
  ) {
    if (
      currentTask.expirationTime > currentTime &&
      (!hasTimeRemaining || shouldYieldToHost())
    ) {
      // This currentTask hasn't expired, and we've reached the deadline.
      break;
    }
    const callback = currentTask.callback;
    if (typeof callback === 'function') {
      currentTask.callback = null;
      currentPriorityLevel = currentTask.priorityLevel;
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
      const continuationCallback = callback(didUserCallbackTimeout);
      currentTime = getCurrentTime();
      if (typeof continuationCallback === 'function') {
        // 还有剩余工作：把续跑函数存回 callback，本段到此结束
        currentTask.callback = continuationCallback;
      } else {
        if (currentTask === peek(taskQueue)) {
          pop(taskQueue);
        }
      }
      advanceTimers(currentTime);
    } else {
      pop(taskQueue);
    }
    currentTask = peek(taskQueue);
  }
  // 返回是否还有剩余工作
  if (currentTask !== null) {
    return true;
  }
  // ...（timerQueue 收尾逻辑省略）
}

// shouldYieldToHost（节选）
function shouldYieldToHost() {
  const timeElapsed = getCurrentTime() - startTime;
  if (timeElapsed < frameInterval) {
    // 本段还没跑够一个时间片长度，不让步
    return false;
  }
  // 已经跑够/超过一个时间片：有 pending paint 或 pending input 时应该让步，
  // enableIsInputPending 关闭时直接进入下面的兜底分支（第 452 行起，此处从略）
  if (enableIsInputPending) {
    // ...（isInputPending 相关分支，本项目未开启这个 feature flag）
  }
  return true;
}
```

**关键点**

1. `currentTask.expirationTime > currentTime && (!hasTimeRemaining || shouldYieldToHost())` 这一行是官方判断"要不要中断当前循环"的核心：只有任务**还没过期**、且（**这次 flush 时间不够**或**shouldYieldToHost 说该让步**）同时成立才会 `break`——任务一旦过期，哪怕已经超出时间片预算也会被强制跑完，这是"优先级饿死兜底"在 Scheduler 层面的直接体现（呼应「二、8」）
2. `callback(didUserCallbackTimeout)` 的返回值决定这个任务算不算跑完：返回函数说明还有剩余工作，直接把这个函数存回 `currentTask.callback` 供下一段继续调用；这正是 `performConcurrentWorkOnRoot` 能"跑一段、还剩下多少留到下一段"的机制来源（`react-reconciler` 侧的 `performConcurrentWorkOnRoot` 本身就是靠返回自身的 bound 函数实现续跑）
3. `shouldYieldToHost` 用 `frameInterval`（默认时间片长度）作为第一道判断——本段还没跑够这个时长就绝不让步，跑够了之后才进入是否有 pending paint/input 的精细判断

### 2. MessageChannel 时间切片调度：同文件

```javascript
// performWorkUntilDeadline / schedulePerformWorkUntilDeadline（节选）
const performWorkUntilDeadline = () => {
  if (scheduledHostCallback !== null) {
    const currentTime = getCurrentTime();
    // 记录本段开始时间，deadline = startTime + frameInterval
    startTime = currentTime;
    const hasTimeRemaining = true;

    let hasMoreWork = true;
    try {
      hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
    } finally {
      if (hasMoreWork) {
        // 还有工作：紧接着上一段结尾再排一段宏任务
        schedulePerformWorkUntilDeadline();
      } else {
        isMessageLoopRunning = false;
        scheduledHostCallback = null;
      }
    }
  } else {
    isMessageLoopRunning = false;
  }
};

let schedulePerformWorkUntilDeadline;
if (typeof localSetImmediate === 'function') {
  // Node.js 环境优先用 setImmediate（不阻止进程退出、且比 MessageChannel 更早触发）
  schedulePerformWorkUntilDeadline = () => {
    localSetImmediate(performWorkUntilDeadline);
  };
} else if (typeof MessageChannel !== 'undefined') {
  // DOM / Worker 环境：优先用 MessageChannel，规避 setTimeout 的 4ms clamp
  const channel = new MessageChannel();
  const port = channel.port2;
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => {
    port.postMessage(null);
  };
} else {
  // 非浏览器环境兜底
  schedulePerformWorkUntilDeadline = () => {
    localSetTimeout(performWorkUntilDeadline, 0);
  };
}
```

**关键点**

1. 三段 `if/else if/else` 按环境能力降级：`setImmediate`（Node）→ `MessageChannel`（浏览器/Worker）→ `setTimeout`（兜底），官方注释直接写明选择 `MessageChannel` 而不是 `setTimeout` 的原因是规避 4ms clamp（呼应「二、3」）
2. `port1.onmessage = performWorkUntilDeadline` 只挂一次监听，之后每次调度只是 `port.postMessage(null)` 触发一次消息事件——消息内容本身不重要，只是借用 `postMessage`/`onmessage` 这对 API 产生一个纯粹的宏任务
3. `performWorkUntilDeadline` 里 `hasMoreWork` 为真时立刻调用 `schedulePerformWorkUntilDeadline()` 排下一段——这就是"一段时间片跑完、还有剩余工作就排下一个宏任务继续"的完整链路，`workLoop` 返回 `true` 时这里才会继续排新的一段

### 3. 事件优先级映射：packages/react-dom/src/events/ReactDOMEventListener.js

```javascript
// getEventPriority（节选，离散/连续两档的判定分支）
export function getEventPriority(domEventName: DOMEventName): * {
  switch (domEventName) {
    // 离散事件：用户主动触发、期待立即反馈
    case 'click':
    case 'contextmenu':
    case 'dblclick':
    case 'focusin':
    case 'focusout':
    case 'input':
    case 'keydown':
    case 'keypress':
    case 'keyup':
    case 'mousedown':
    case 'mouseup':
    case 'submit':
    case 'touchstart':
      // ...（更多离散事件类型，节选）
      return DiscreteEventPriority;

    // 连续事件：触发频率高，不需要每次都同步处理
    case 'drag':
    case 'dragenter':
    case 'dragleave':
    case 'dragover':
    case 'mousemove':
    case 'mouseout':
    case 'mouseover':
    case 'pointermove':
    case 'scroll':
    case 'touchmove':
    case 'wheel':
      return ContinuousEventPriority;

    case 'message': {
      // 可能正处于 Scheduler 回调内部，问一下当前 Scheduler 优先级
      const schedulerPriority = getCurrentSchedulerPriorityLevel();
      switch (schedulerPriority) {
        case ImmediateSchedulerPriority:
          return DiscreteEventPriority;
        case UserBlockingSchedulerPriority:
          return ContinuousEventPriority;
        case NormalSchedulerPriority:
        case LowSchedulerPriority:
          return DefaultEventPriority;
        case IdleSchedulerPriority:
          return IdleEventPriority;
        default:
          return DefaultEventPriority;
      }
    }
    default:
      return DefaultEventPriority;
  }
}
```

**关键点**

1. 函数体是一个巨大的 `switch`，按 DOM 原生事件名字符串直接查表返回优先级档位，没有任何运行时计算——这张表本身就是"事件类型 → EventPriority"映射关系的权威定义（呼应「二、5」表格）
2. `case 'message'` 分支专门处理"事件触发时恰好处于 Scheduler 回调执行期间"的情况，转而去问 Scheduler 当前的调度优先级，把 Scheduler 的五档优先级折算成事件系统的四档——这是两套调度体系（DOM 事件优先级 / Scheduler 任务优先级）唯一的转换桥梁
3. 没有匹配到任何具体分支（比如自定义事件、不常见的原生事件）统一兜底成 `DefaultEventPriority`，对应 `DefaultLane`

### 4. 优先级到 Lane 的转换：packages/react-reconciler/src/ReactFiberWorkLoop.new.js

```javascript
// requestUpdateLane（节选，legacy 兜底 + transition 分支 + 事件优先级兜底）
export function requestUpdateLane(fiber: Fiber): Lane {
  const mode = fiber.mode;
  if ((mode & ConcurrentMode) === NoMode) {
    // legacy 模式（ReactDOM.render）：恒为同步
    return (SyncLane: Lane);
  } else if (
    (executionContext & RenderContext) !== NoContext &&
    workInProgressRootRenderLanes !== NoLanes
  ) {
    // render 阶段更新（不被官方正式支持的用法）：复用正在渲染的 lanes
    return pickArbitraryLane(workInProgressRootRenderLanes);
  }

  const isTransition = requestCurrentTransition() !== NoTransition;
  if (isTransition) {
    // 同一事件内的多次 transition 更新复用同一条 lane，靠 currentEventTransitionLane 缓存
    if (currentEventTransitionLane === NoLane) {
      currentEventTransitionLane = claimNextTransitionLane();
    }
    return currentEventTransitionLane;
  }

  // flushSync 等 React 内部方法主动设置的优先级
  const updateLane: Lane = (getCurrentUpdatePriority(): any);
  if (updateLane !== NoLane) {
    return updateLane;
  }

  // 最后才问宿主环境（react-dom）：这次更新是被哪种 DOM 事件触发的
  const eventLane: Lane = (getCurrentEventPriority(): any);
  return eventLane;
}
```

**关键点**

1. 判断顺序体现了明确的优先级取值链：legacy 模式兜底 → render 阶段更新特殊处理 → **是否处于 `startTransition` 内**（`TransitionLane`）→ **React 内部主动设置的优先级**（如 `flushSync`）→ **宿主环境的事件优先级兜底**——这正是「二、5」讲的"点击里被 `startTransition` 包裹的更新为什么会绕过事件类型查表"的代码依据：`isTransition` 这一步排在事件优先级判断之前，命中就直接返回，根本不会走到 `getCurrentEventPriority()`
2. `currentEventTransitionLane` 是模块级变量，只有在"当前事件"内保持缓存，`performConcurrentWorkOnRoot` 开始新一轮工作循环时会被重置——这保证了"同一次 `startTransition` 回调内的多次更新分配同一条 lane，下一次交互重新分配"
3. `getCurrentEventPriority` 是 `react-dom` 通过 Host Config 提供给 `react-reconciler` 的钩子，内部实现正是「三、3」的 `getEventPriority`——`react-reconciler` 本身不知道任何具体的 DOM 事件类型，靠这层抽象保持平台无关

### 5. Lane 常量与优先级计算：packages/react-reconciler/src/ReactFiberLane.new.js

Lane 常量定义、`mergeLanes`、`getNextLanes`、`markStarvedLanesAsExpired` 的完整位运算细节已经在第 02 篇逐行讲过，这里不重复贴代码，只补一条与本篇强相关的复用关系：`getNextLanes` 内部区分 `suspendedLanes`（被 Suspense 挂起、暂不参与调度的 lane）和 `pingedLanes`（挂起后已经 resolve、可以重新参与调度的 lane）——这两个字段正是「二、7」`pingSuspendedRoot` 操作的对象，Lane 模型从第 02 篇写到本篇，实现了"优先级调度"与"挂起-恢复调度"共用同一套位运算基础设施。

### 6. startTransition 实现：packages/react-reconciler/src/ReactFiberHooks.new.js

```javascript
// startTransition（节选，setPending 两次调用的时机）
function startTransition(setPending, callback, options) {
  const previousPriority = getCurrentUpdatePriority();
  setCurrentUpdatePriority(
    higherEventPriority(previousPriority, ContinuousEventPriority),
  );

  setPending(true); // 提升到至少 ContinuousEventPriority 后立刻同步派发，UI 立即反映 pending

  const prevTransition = ReactCurrentBatchConfig.transition;
  ReactCurrentBatchConfig.transition = {};
  const currentTransition = ReactCurrentBatchConfig.transition;

  try {
    setPending(false); // 与 callback() 一起落在 transition 标记内，走 TransitionLane
    callback();
  } finally {
    setCurrentUpdatePriority(previousPriority);
    ReactCurrentBatchConfig.transition = prevTransition;
    // ...（DEV 下大量更新的警告分支省略）
  }
}
```

**关键点**

1. `setPending(true)` 发生在 `ReactCurrentBatchConfig.transition` 被设置**之前**，此时 `requestUpdateLane` 里 `isTransition` 判断为假，这次更新走的是刚被提升的 `ContinuousEventPriority`——保证"进入过渡态"这个 UI 反馈是立刻生效的，不会被降级排队
2. `setPending(false)` 和 `callback()` 都发生在 `ReactCurrentBatchConfig.transition = {}` **之后**，两者触发的更新都会被 `requestUpdateLane` 分配同一条 `TransitionLane`——这也是为什么"退出 pending 状态"和"真正的数据更新"总是同批次一起完成的
3. `finally` 块保证不管 `callback()` 内部是否抛错，`currentUpdatePriority` 和 `ReactCurrentBatchConfig.transition` 都会恢复成调用前的值，不会污染后续代码的优先级上下文

### 7. Suspense 挂起处理：packages/react-reconciler/src/ReactFiberThrow.new.js

```javascript
// throwException（节选，命中 thenable 之后寻找边界、挂监听两步）
function throwException(
  root: FiberRoot,
  returnFiber: Fiber,
  sourceFiber: Fiber,
  value: mixed,
  rootRenderLanes: Lanes,
) {
  sourceFiber.flags |= Incomplete;

  if (
    value !== null &&
    typeof value === 'object' &&
    typeof value.then === 'function'
  ) {
    // 抛出的是一个 thenable：组件挂起了
    const wakeable: Wakeable = (value: any);
    resetSuspendedComponent(sourceFiber, rootRenderLanes);

    const suspenseBoundary = getNearestSuspenseBoundaryToCapture(returnFiber);
    if (suspenseBoundary !== null) {
      suspenseBoundary.flags &= ~ForceClientRender;
      markSuspenseBoundaryShouldCapture(
        suspenseBoundary, returnFiber, sourceFiber, root, rootRenderLanes,
      );
      if (suspenseBoundary.mode & ConcurrentMode) {
        attachPingListener(root, wakeable, rootRenderLanes);
      }
      attachRetryListener(suspenseBoundary, root, wakeable, rootRenderLanes);
      return;
    }
    // 找不到边界：非同步更新时直接挂起等待，不做二次渲染兜底（此处省略后续分支）
  }
  // ...（非 thenable 的普通错误，交给错误边界处理，此处省略）
}

// attachPingListener（节选，pingCache 去重逻辑）
function attachPingListener(root: FiberRoot, wakeable: Wakeable, lanes: Lanes) {
  let pingCache = root.pingCache;
  let threadIDs;
  if (pingCache === null) {
    pingCache = root.pingCache = new PossiblyWeakMap();
    threadIDs = new Set();
    pingCache.set(wakeable, threadIDs);
  } else {
    threadIDs = pingCache.get(wakeable);
    if (threadIDs === undefined) {
      threadIDs = new Set();
      pingCache.set(wakeable, threadIDs);
    }
  }
  if (!threadIDs.has(lanes)) {
    // 同一个 wakeable + 同一组 lanes 只挂一次 then 监听，避免重复触发
    threadIDs.add(lanes);
    const ping = pingSuspendedRoot.bind(null, root, wakeable, lanes);
    wakeable.then(ping, ping);
  }
}
```

**关键点**

1. `throwException` 判断"是不是挂起"的方式非常朴素——不关心抛出的值是不是原生 `Promise`，只看它是不是一个"有 `then` 方法的对象"（thenable），这个宽松判断让用户可以用任何 Promise-like 对象触发挂起
2. `getNearestSuspenseBoundaryToCapture` 找边界失败时不会立刻报错，而是区分"是否同步更新"决定要不要继续 unwind——同步更新场景下找不到边界会被视为真正的错误
3. `attachPingListener` 用 `pingCache`（`WeakMap<Wakeable, Set<Lanes>>`）做双重去重：同一个 `wakeable` 对象、同一组 `lanes` 只会挂一次 `then` 监听，`WeakMap` 的选择保证 `wakeable` 被回收后这条缓存记录也能被 GC 掉，不会内存泄漏
4. `resolveRetryWakeable`/`pingSuspendedRoot`（在 `ReactFiberWorkLoop.new.js`）是 `wakeable.then(ping, ping)` 真正调用的回调——`ping`/`retry` 都绑定同一个 `resolve` 和 `reject` 回调，意味着 Promise 无论成功还是失败都会触发重新调度，失败的情况下重新渲染会再次执行到抛错的代码路径，交给错误边界处理

---

## 四、手写实现（解读已完成代码）

本节基于本地真实项目 `D:\github\react-source`（GitHub：https://github.com/lotosv2010/react-source）编写。需要先说明一件事：本篇涉及的 Scheduler 小顶堆任务队列、完整 Lane 模型、事件优先级映射、`useTransition`/`useDeferredValue`、Suspense 挂起与重渲染，**全部不是本篇新写的代码**——它们分别对应仓库 commit 历史里的 `88f7b22`（接入 Scheduler 实现完整 Lane 模型与可中断 workLoop）、`60034c2`（实现合成事件系统）、`249fa75`（实现 useTransition/useDeferredValue）、`d0a7f56`（实现 Suspense），在这些提交里就已经落地并跑通。这几块功能在实现顺序上其实**早于**系列大纲第 06 篇讲的 Context/错误边界，也早于第 08 篇要讲的完整事件系统细节——手写仓库的开发节奏和系列文章的讲解节奏并不是严格一一对应的。本篇的任务是把这些已经跑通的真实代码逐段讲透。

### 1. Scheduler：taskQueue/timerQueue 小顶堆 + shouldYieldToHost（已有代码）

```typescript
// packages/scheduler/src/Scheduler.ts（节选）
const taskQueue: Task[] = [];
const timerQueue: Task[] = [];

export function unstable_scheduleCallback(
  priorityLevel: number,
  callback: ((didTimeout: boolean) => any) | null,
  options?: TaskOptions,
): Task {
  const currentTime = getCurrentTime();
  // ...（startTime 计算省略，见「三、1」关键点 1 的过期时间换算原理）
  const expirationTime = startTime + timeout;

  const newTask: Task = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: -1,
  };

  if (startTime > currentTime) {
    newTask.sortIndex = startTime;
    push(timerQueue, newTask); // 延迟任务先进 timerQueue
    // ...
  } else {
    newTask.sortIndex = expirationTime;
    push(taskQueue, newTask); // 立即任务按过期时间进 taskQueue 小顶堆
    if (!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    }
  }
  return newTask;
}
```

`push`/`peek`/`pop` 三个操作来自 `SchedulerMinHeap.ts`，实现的是标准二叉小顶堆——`sortIndex` 字段统一了"按 `startTime` 排（timerQueue）"和"按 `expirationTime` 排（taskQueue）"两种排序需求，堆本身只关心 `sortIndex` 大小，不关心这个数字的业务含义。`workLoop` 里 `advanceTimers`/`peek`/`pop` 的调用方式和「三、1」贴的官方代码逐行对应，唯一的差别是这份实现省去了 `enableProfiling`/`enableSchedulerDebugging` 等 DEV 分支。

`shouldYieldToHost` 的实现（`SchedulerHostConfig.default.ts`）比官方简化了 `isInputPending` 相关分支（`enableIsInputPending` 恒为关闭），核心判断保留：

```typescript
export function shouldYieldToHost(): boolean {
  const currentTime = getCurrentTime();
  if (currentTime >= deadline) {
    if (needsPaint || currentTime >= maxYieldInterval) {
      return true;
    }
    return currentTime >= deadline;
  } else {
    return false;
  }
}
```

`deadline` 在每次 `performWorkUntilDeadline` 开始时被设为 `currentTime + yieldInterval`（`yieldInterval` 默认 5ms），这就是"每个时间片 5ms"这个数字在代码里的落点——对照「二、1」的时间切片本质描述，这里是唯一真正写死 5ms 的地方。

### 2. Lane 模型：ReactFiberLane.ts 的 TransitionLane 与 markStarvedLanesAsExpired（已有代码）

```typescript
// packages/react-reconciler/src/ReactFiberLane.ts（节选，与本篇强相关的 Suspense 字段）
export function markStarvedLanesAsExpired(
  root: FiberRootNode,
  currentTime: number,
): void {
  const pendingLanes = root.pendingLanes;
  const suspendedLanes = root.suspendedLanes;
  const pingedLanes = root.pingedLanes;
  const expirationTimes = root.expirationTimes;

  let lanes = pendingLanes;
  while (lanes > 0) {
    const index = pickArbitraryLaneIndex(lanes);
    const lane = 1 << index;

    const expirationTime = expirationTimes[index];
    if (expirationTime === NoTimestamp) {
      if (
        (lane & suspendedLanes) === NoLanes ||
        (lane & pingedLanes) !== NoLanes
      ) {
        expirationTimes[index] = computeExpirationTime(lane, currentTime);
      }
    } else if (expirationTime <= currentTime) {
      root.expiredLanes |= lane;
    }
    lanes &= ~lane;
  }
}

// 对照官方 markRootPinged：把 wakeable resolve 时传入的 pingedLanes 与 root 当前挂起的
// suspendedLanes 取交集标记到 root.pingedLanes——只有本来就被挂起的 lane 才需要被 ping 唤醒
export function markRootPinged(root: FiberRootNode, pingedLanes: Lanes): void {
  root.pingedLanes |= root.suspendedLanes & pingedLanes;
}
```

`markStarvedLanesAsExpired` 里有一个容易被忽略的细节：一条 lane 只要正处于 `suspendedLanes`（被 Suspense 挂起）之中、又不在 `pingedLanes`（还没 resolve）里，就**不会**给它计算过期时间——这是为了避免"一个正在等待数据的挂起渲染，因为等太久被饥饿兜底强制拉出来同步渲染，结果数据还没到，渲染了个空的"这种情况。只有挂起的 lane 已经被 ping 过（数据到了），才会重新参与过期计算。`TransitionLane` 系列常量（`TransitionLane1`~`16`）和 `claimNextTransitionLane` 的轮转分配逻辑在第 02 篇已经贴过，这里不重复。

### 3. requestUpdateLane：事件优先级映射到 lane（已有代码）

```typescript
// packages/react-reconciler/src/ReactFiberWorkLoop.ts（节选）
export function requestUpdateLane(fiber: FiberNode): Lane {
  const mode = fiber.mode;
  if ((mode & ConcurrentMode) === NoMode) {
    return SyncLane;
  }

  const isTransition = ReactCurrentBatchConfig.transition !== null;
  if (isTransition) {
    if (currentEventTransitionLane === NoLane) {
      currentEventTransitionLane = claimNextTransitionLane();
    }
    return currentEventTransitionLane;
  }

  const updateLane = getCurrentUpdatePriority();
  if (updateLane !== NoLane) {
    return updateLane;
  }
  // 本项目事件系统落地时机稍晚于本篇讲解顺序，这里兜底固定 DefaultLane
  return DefaultLane;
}
```

对照「三、4」贴的官方代码可以看到判断顺序完全一致：legacy 模式兜底 → `isTransition` 判断（`ReactCurrentBatchConfig.transition !== null`，比官方的 `requestCurrentTransition() !== NoTransition` 更直白但语义等价）→ `getCurrentUpdatePriority()`（`flushSync` 等场景主动设置）→ 事件优先级兜底。真正的事件优先级映射（`getEventPriority`，见本节第 4 点）在这份代码里通过 `setCurrentUpdatePriority` 在事件分发入口处提前写入 `currentUpdatePriority`，所以 `requestUpdateLane` 读到的 `getCurrentUpdatePriority()` 其实已经包含了"这次更新是哪个 DOM 事件触发的"这层信息，不需要像官方那样再单独调用一次 `getCurrentEventPriority()`。

`ReactDOMEventListener.ts` 里的 `getEventPriority` 实现了「一、5」表格里离散/连续两档的核心映射（`click`/`keydown`/`input` 等 → `DiscreteEventPriority`；`mousemove`/`mouseover`/`mouseout` → `ContinuousEventPriority`；其余兜底 `DefaultEventPriority`），比官方精简了事件类型的覆盖面，但离散/连续两档的判定原则完全对齐。

### 4. useTransition / useDeferredValue：ReactFiberHooks.ts（已有代码）

```typescript
// startTransition（节选）
function startTransition(
  setPending: Dispatch<BasicStateAction<boolean>>,
  callback: () => void,
): void {
  const previousPriority = getCurrentUpdatePriority();
  setCurrentUpdatePriority(
    higherEventPriority(previousPriority, ContinuousEventPriority),
  );
  setPending(true);

  const prevTransition = ReactCurrentBatchConfig.transition;
  ReactCurrentBatchConfig.transition = {};
  try {
    setPending(false);
    callback();
  } finally {
    setCurrentUpdatePriority(previousPriority);
    ReactCurrentBatchConfig.transition = prevTransition;
  }
}

function mountTransition(): [boolean, (callback: () => void) => void] {
  const [, setPending] = mountState(false);
  const start = startTransition.bind(null, setPending);
  const hook = mountWorkInProgressHook();
  hook.memoizedState = start;
  return [false, start];
}
```

这份实现和「三、6」贴的官方代码几乎逐行对应，注释里特别注明了一个简化范围：**不支持异步 action**——官方 `startTransition` 如果 `callback()` 返回一个 Promise，会额外 entangle 一个 async action scope、把 `isPending` 状态一直保持到 Promise resolve 才结束；这份实现只接受同步回调，`callback()` 跑完就直接进入 `finally` 恢复优先级，不做后续跟踪。

`useDeferredValue` 的核心判断逻辑：

```typescript
function updateDeferredValueImpl<T>(hook: Hook, prevValue: T, value: T): T {
  if (is(value, prevValue)) {
    return value; // Object.is 判断值没变，直接复用，不触发额外渲染
  }

  const shouldDeferValue = !includesOnlyNonUrgentLanes(renderLanes);
  if (shouldDeferValue) {
    // 当前渲染包含紧急 lane：先返回旧值，同时派生一条 deferred lane 稍后单独重渲染
    const deferredLane = requestDeferredLane();
    currentlyRenderingFiber.lanes = mergeLanes(
      currentlyRenderingFiber.lanes,
      deferredLane,
    );
    markSkippedUpdateLanes(deferredLane);
    return prevValue;
  }

  // 当前渲染本身就是那条 deferred lane 触发的重渲染：直接用新值
  markWorkInProgressReceivedUpdate();
  hook.memoizedState = value;
  return value;
}
```

这段代码把「一、3」讲的"`deferredKeyword` 短暂停留在旧值上，之后单独补一次渲染"这个行为落到了具体判断：`includesOnlyNonUrgentLanes(renderLanes)` 判断当前这一轮渲染是不是"混有紧急更新"——是的话就不能让这次紧急渲染被拖慢，先返回 `prevValue`，同时申请一条新的 lane（`requestDeferredLane`，代码注释里说明这是官方 `DeferredLane` 的简化版，复用了 `claimNextTransitionLane` 的轮转分配逻辑而非独立占一个 bit）记下"稍后要单独为这个新值重渲染一次"；等这条 deferred lane 真正被调度到、`renderLanes` 里只剩这一条非紧急 lane 时，`shouldDeferValue` 为假，直接采用最新值。

`mountDeferredValue`/`updateDeferredValue`/`mountTransition`/`updateTransition` 被接入三张 dispatcher 表（`HooksDispatcherOnMount`/`HooksDispatcherOnUpdate`/`ContextOnlyDispatcher`），与其它 Hook 并列，验证脚本在 `fixtures/hooks/index.tsx` 里：

```typescript
// fixtures/hooks/index.tsx（节选）
const [isPending, startTransition] = useTransition()
console.log("useTransition isPending：", isPending)

// count 是紧急更新时，deferredCount 先保留旧值，随后单独一次 TransitionLane 渡染追上
const deferredCount = useDeferredValue(count)
```

### 5. Suspense：throwException/attachPingListener/attachRetryListener + pingSuspendedRoot（已有代码）

`ReactFiberThrow.ts` 的 `throwException` 结构和「三、7」贴的官方代码判断链一致（thenable 判断 → 找边界 → 标记 `ShouldCapture` → 挂 ping 监听 → 挂 retry 监听），这份实现额外拆出了一个独立的 `attachRetryListener`：

```typescript
// packages/react-reconciler/src/ReactFiberThrow.ts（节选）
function attachRetryListener(
  suspenseBoundary: FiberNode,
  _root: FiberRootNode,
  wakeable: Wakeable,
  _lanes: Lanes,
): void {
  let retryQueue: Set<Wakeable> | null = suspenseBoundary.updateQueue;
  if (retryQueue === null) {
    retryQueue = new Set();
    suspenseBoundary.updateQueue = retryQueue;
  }
  retryQueue.add(wakeable);
}
```

`attachPingListener` 负责"通知 root 这条 lane 可以重试了"（面向调度层面），`attachRetryListener` 负责"记住这个 Suspense 边界自己挂起过哪些 wakeable"（面向 commit 阶段）——这里先把 wakeable 记到 `suspenseBoundary.updateQueue`（借用字段名存一个 `Set<Wakeable>`），真正挂 `then` 监听的动作推迟到 commit 阶段的 `attachSuspenseRetryListeners`（`ReactFiberCommitWork.ts`）：

```typescript
// packages/react-reconciler/src/ReactFiberCommitWork.ts（节选）
function attachSuspenseRetryListeners(finishedWork: FiberNode): void {
  const wakeables: Set<Wakeable> | null = finishedWork.updateQueue;
  if (wakeables === null) return;
  finishedWork.updateQueue = null;

  let retryCache: Set<Wakeable> | null = finishedWork.stateNode;
  if (retryCache === null) {
    retryCache = new Set();
    finishedWork.stateNode = retryCache;
  }

  wakeables.forEach((wakeable) => {
    if (!retryCache!.has(wakeable)) {
      retryCache!.add(wakeable);
      const retry = resolveRetryWakeable.bind(null, finishedWork, wakeable);
      wakeable.then(retry, retry);
    }
  });
}
```

`resolveRetryWakeable` 和 `pingSuspendedRoot` 是两条独立但都通向"重新调度"的路径：

```typescript
// packages/react-reconciler/src/ReactFiberWorkLoop.ts（节选）
export function pingSuspendedRoot(
  root: FiberRootNode,
  wakeable: Wakeable,
  pingedLanes: Lanes,
): void {
  const pingCache = root.pingCache;
  if (pingCache !== null) {
    pingCache.delete(wakeable);
  }
  markRootPinged(root, pingedLanes); // 把这条 lane 从 suspendedLanes 挪进 pingedLanes
  ensureRootIsScheduled(root, now());
}

export function resolveRetryWakeable(
  boundaryFiber: FiberNode,
  wakeable: Wakeable,
): void {
  const retryCache: Set<Wakeable> | null = boundaryFiber.stateNode;
  if (retryCache !== null) {
    retryCache.delete(wakeable);
  }
  const retryLane = requestRetryLane(boundaryFiber); // 轮转分配一条新的 RetryLane
  const eventTime = requestEventTime();
  const root = enqueueConcurrentRenderForLane(boundaryFiber, retryLane);
  if (root !== null) {
    markRootUpdated(root, retryLane, eventTime);
    ensureRootIsScheduled(root, eventTime);
  }
}
```

两者都会走到 `ensureRootIsScheduled` 重新触发调度，区别在于：`pingSuspendedRoot`（由 `attachPingListener` 挂的 `then` 触发）只是把**原来渲染时用的那条 lane**从"挂起"状态挪到"可重试"状态，让下一次 `getNextLanes` 能重新选中它；`resolveRetryWakeable`（由 `attachSuspenseRetryListeners` 挂的 `then` 触发）则是重新分配一条全新的 `RetryLane`，直接对 Suspense 边界本身发起一次新的更新。这两条路径在验证脚本 `fixtures/suspense/index.tsx` 里通过一个模拟异步数据源（`fetchData`/`readResource`，数据没到就 `throw resource.promise`）共同生效——单个 `Suspense` 挂两秒后自动切换为真实内容，两个子节点共用一个边界时要等最慢的那个 resolve 才整体切换，都能在浏览器里观察到。

**验证方式**：`pnpm dev` 起本地 Vite 环境后跑 `fixtures/scheduler/index.ts` 的三个演示——长任务在 5ms 时间片内自动 yield（观察每段耗时打印）、5000 项大列表并发渲染期间 `requestAnimationFrame` 帧计数持续跳动（证明没有一次性占死主线程）、`flushSync` 包裹的小列表更新能打断正在进行的大列表低优先级渲染并立即提交；再跑 `fixtures/suspense/index.tsx` 观察 `Suspense` 首次渲染 `fallback`、数据到达后自动切到真实内容的完整链路。`pnpm build` 与 `tsc --noEmit` 均已验证通过。

---

## 五、手写实现源码地址

- GitHub：https://github.com/lotosv2010/react-source

---

## 六、参考资料

- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com
- https://github.com/wbccb/Frontend-Articles

---

## 💡 面试核心问

- **时间切片的本质是什么？为什么一定要把渲染过程拆成小任务？**
- **React 的并发渲染是"抢占式调度"吗？为什么？协作式和抢占式调度的本质区别是什么？**
- **如果某个组件的渲染函数本身包含一个耗时很长的同步循环，`startTransition` 或时间切片能让它不阻塞主线程吗？为什么？**
- **为什么 Scheduler 选择 `MessageChannel` 而不是 `setTimeout(fn, 0)`？**
- **点击事件里直接 `setState` 和用 `startTransition` 包裹 `setState`，分别会被分配到哪个 Lane？为什么表现不同？**
- **`startTransition` 和 `useTransition` 的区别是什么？分别在什么场景用？**
- **`Suspense` 是如何知道子组件"挂起"了的？resolve 之后 React 是怎么重新渲染的？**

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话核心 | 面试考察频率 |
|--------|-----------|-------------|
| 时间切片本质 | 渲染拆成 5ms 工作单元，每单元后检查 shouldYieldToHost | ⭐⭐⭐⭐⭐ |
| 协作式 vs 抢占式 | 让步点只在工作单元之间，单元内部无法被打断 | ⭐⭐⭐⭐⭐ |
| MessageChannel 选型 | 规避 setTimeout 的 4ms clamp，调度粒度更稳定 | ⭐⭐⭐ |
| taskQueue/timerQueue | 双小顶堆按 expirationTime/startTime 排序，O(log n) | ⭐⭐⭐ |
| 事件类型→Lane | 离散→SyncLane，连续→InputContinuousLane，兜底→DefaultLane | ⭐⭐⭐⭐⭐ |
| startTransition 降级 | callback 内更新强制 TransitionLane，可被高优先级打断 | ⭐⭐⭐⭐⭐ |
| Suspense 挂起协作 | throw Promise → 标记边界 → 渲染 fallback → ping 重渲染 | ⭐⭐⭐⭐⭐ |
| 两层饿死兜底 | Lane 过期兜底（reconciler）+ 任务堆按过期时间排序（Scheduler） | ⭐⭐⭐⭐ |

---

## 📝 思考题

**留个问题**：`useDeferredValue` 的 `updateDeferredValueImpl` 在"当前渲染混有紧急 lane"时会先返回 `prevValue`、同时申请一条新的 deferred lane 稍后单独渲染。如果没有这一步"先返回旧值"的判断，直接无条件返回最新的 `value`，会出现什么现象？提示：想一想「一、3」患者检索场景里，输入框飞快打字时，如果搜索结果组件每次都跟着最新值同步重渲染，紧急更新（输入框本身的更新）和这次搜索结果重渲染之间会变成什么关系——这正是 `useDeferredValue` 要避免的情况。

答案留在评论区，或者在后续事件系统篇（第 08 篇）讲自动批处理时会再次提到相关细节。

---

> 🔖 这是「React 18 全家桶深度拆解系列」第 7 篇。上一篇：《React 18 Hooks 深度: 设计哲学、dispatcher 切换与 Hook 链表源码（面试收藏级）》；下一篇预告：《React 18 事件系统: 合成事件、事件委托与自动批处理原理（面试收藏级）》
