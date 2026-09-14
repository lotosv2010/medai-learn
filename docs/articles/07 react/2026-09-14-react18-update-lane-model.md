# React 18 状态更新: Update 双轨链表与 Lane 优先级模型深度拆解（面试收藏级）

> **副标题**：setState 到重渲染的完整链路、Class/Hook 双轨更新队列、Lane 位运算与优先级饿死兜底

---

## 🎯 这篇文章解决什么问题

上一篇断点调试留下的调用栈里，`dispatchSetState` 之后紧跟着 `scheduleUpdateOnFiber`，再往下是 `performConcurrentWorkOnRoot`。面试官顺着这条调用栈继续追问：「事件处理函数里连续调用三次 `setState`，为什么只触发一次渲染？是三次渲染被合并成了一次，还是本来就只安排了一次？」

大多数人的第一反应是「批处理把三次更新合并了」，这个说法不算错，但没有触及本质——**合并的不是渲染，而是"要不要安排一次新渲染"这个调度动作**；三次 `setState` 产生的三个 Update，最终是在同一次渲染里被一次性处理掉的。这个认知偏差，恰好是本篇要讲透的第一个知识点。

面试官接着可能会追问 Lane 模型：「为什么 React 18 要把 `expirationTime` 换成一堆二进制位？31 位是怎么来的？`lanes & -lanes` 这个位运算在做什么？」这些问题背后的共同答案是：**Update 队列负责"记录变化"，Lane 模型负责"给变化排优先级"，两者配合工作，才是 React 18 并发渲染"可以随时插队、又不会丢更新"的完整地基**。

读完这篇文章，你会同时获得两种确定感：**懂原理**（Update 为什么要排队处理、Lane 为什么必须用位运算表达）和**会讲**（面试官顺着任何一个细节追问都能拆解回答），并且能在本地手写仓库里对着已经跑通的真实代码逐行验证这些结论。

---

## 一、使用与实践

### 1. 对象式更新与函数式更新

`setState`/`dispatch` 支持两种调用方式，区别在于**要不要基于"上一次排队中的状态"计算新值**：

```jsx
// 对象式更新：直接给出新状态的值
this.setState({ count: 1 })

// 函数式更新：接收 prevState，返回新状态
this.setState(prev => ({ count: prev.count + 1 }))
```

为什么函数式更新更安全？看这个连续调用的场景：

```jsx
function handleTripleClick() {
  this.setState({ count: this.state.count + 1 }) // ❌ 这里的 this.state.count 是"旧的"
  this.setState({ count: this.state.count + 1 }) // ❌ 读到的还是同一个旧值
  this.setState({ count: this.state.count + 1 }) // ❌ 三次调用最终只 +1，不是 +3
}

function handleTripleClickFixed() {
  this.setState(prev => ({ count: prev.count + 1 })) // ✅ prev 是"上一次排队中"的最新值
  this.setState(prev => ({ count: prev.count + 1 })) // ✅ 基于前一条 Update 算出的结果继续算
  this.setState(prev => ({ count: prev.count + 1 })) // ✅ 三次调用最终 +3
}
```

对象式更新在调用的那一刻就把新值算好、封装进 Update 对象；`this.state.count` 读到的永远是"当前渲染已生效"的旧值，不会因为这次事件处理函数里已经排了几条 Update 而变化。函数式更新把"怎么算新值"这件事延迟到了 Update 真正被处理的那一刻，用的是"链上前一条 Update 算出的结果"，所以能连续叠加。

> 💬 **面试官会问**：`this.setState({ count: this.state.count + 1 })` 连续调用三次，最终 `count` 只加了 1 而不是 3，为什么？
>
> ✅ **标准答案**：对象式更新在调用瞬间就用当前渲染已生效的 `this.state.count` 算出新值，三次调用读到的都是同一个"旧值"，所以最终只加 1。函数式更新 `prev => ({ count: prev.count + 1 })` 把"新值怎么算"包装成一个函数，延迟到 Update 队列真正处理时才执行，且 `prev` 是"链上前一条 Update 已经算出的结果"，所以能正确累加三次。
>
> 🎁 **加分答案**：这个现象背后是 Update 队列的"链式处理"机制——`processUpdateQueue` 从 `baseState` 出发，依次把每条 Update 的 `payload` 应用上去，前一条算出的结果直接作为后一条的输入。函数式更新之所以安全，是因为它把"读取上一步结果"这件事交给了这套链式处理机制，而不是自己在调用时手动读一次可能过期的 state。

### 2. 基本使用

#### 同一事件处理函数内多次更新只触发一次渲染

```jsx
function PrescriptionQuantityInput() {
  const [count, setCount] = useState(0)

  function handleTripleClick() {
    setCount(c => c + 1) // 排队，不立即渲染
    setCount(c => c + 1) // 排队，不立即渲染
    setCount(c => c + 1) // 排队，不立即渲染
    // 事件处理函数执行完毕后，才触发一次渲染
  }

  return <button onClick={handleTripleClick}>{count}</button>
}
```

不管是 Class 组件的 `this.setState`，还是函数组件 Hook 的 `dispatch`，在同一个事件处理函数里连续调用多次，最终都只会触发**一次**重渲染——这就是批处理（batching）现象。它的底层原理会在「二、5」节展开：不是"合并了三次渲染"，而是"从来只调度了一次渲染，三次 Update 在那一次渲染里被一起处理"。

#### Legacy 模式固定 SyncLane，createRoot 按场景分配 Lane

```javascript
// Legacy 模式：ReactDOM.render 产生的更新固定走 SyncLane
import ReactDOM from 'react-dom'
ReactDOM.render(<App />, container) // 内部触发的 setState 恒为 SyncLane，同步不可中断

// Concurrent 模式：createRoot 产生的更新按触发场景分配不同 Lane
import { createRoot } from 'react-dom/client'
const root = createRoot(container)
root.render(<App />)
// 之后组件内部的 setState，会根据当前事件优先级（点击/输入/过渡态）分配到不同 Lane
```

这个区别在第01篇「二、5」节已经建立过直觉，本篇「二」节会展开 Lane 具体怎么分配、怎么用位运算表达。

#### flushSync 强制跳出批处理

```jsx
import { flushSync } from 'react-dom'

function handleSubmit() {
  flushSync(() => {
    setSaveStatus('saved') // 这次更新会立即同步渲染，不参与批处理
  })
  // 这里已经能读到渲染后的最新 DOM
  const height = statusRef.current.offsetHeight
}
```

> 💬 **面试官会问**：`flushSync` 是怎么"强制跳出批处理"的？
>
> ✅ **标准答案**：`flushSync` 内部把当前的更新优先级临时设成 `DiscreteEventPriority`（对应 `SyncLane`），调用完回调后立即触发同步队列的 flush（`flushSyncCallbacks`），不等本次事件处理函数走完再统一调度。这样这次更新对应的渲染会在 `flushSync` 调用返回前就完成，所以后面能立刻读到渲染后的真实 DOM。
>
> 🎁 **加分答案**：`flushSync` 并不是"绕过了 Update 队列"，它走的还是完整的"创建 Update → enqueueUpdate → 调度渲染"这套流程，只是把调度这一步从"排到批处理结束后统一处理"改成了"立即同步 flush"。这也是为什么滥用 `flushSync` 会有性能代价——它会打断本该被合并的批处理，让原本可以合并的多次更新变成多次同步渲染。

### 3. 场景实战

#### 处方单数量加减按钮的批处理验证

```jsx
function PrescriptionItemRow({ item }) {
  const [quantity, setQuantity] = useState(item.quantity)
  const [subtotal, setSubtotal] = useState(item.price * item.quantity)

  function handleIncreaseThreeTimes() {
    // 医生连续点击三次"+1"按钮触发的场景
    setQuantity(q => q + 1)
    setSubtotal(s => s + item.price)
    setQuantity(q => q + 1)
    setSubtotal(s => s + item.price)
    setQuantity(q => q + 1)
    setSubtotal(s => s + item.price)
    // 六次 setXxx 调用，只触发一次渲染，quantity 和 subtotal 在这一次渲染里一起算好
  }

  return (
    <div>
      <span>数量：{quantity}，小计：{subtotal}</span>
      <button onClick={handleIncreaseThreeTimes}>连点三次+1</button>
    </div>
  )
}
```

打开 React DevTools 的 Profiler 面板录制这次点击，能看到只有一条渲染记录，而不是三条——这是验证批处理最直接的方式。

#### 用函数式更新规避闭包陈旧值

```jsx
// ❌ 错误写法：count 是闭包捕获的旧值，多次调用不会累加
function handleBatchSelect() {
  selectedIds.forEach(() => {
    setCount(count + 1) // 每次都读到同一个闭包里的 count
  })
}

// ✅ 正确写法：函数式更新基于"链上上一步的结果"计算
function handleBatchSelect() {
  selectedIds.forEach(() => {
    setCount(c => c + 1) // 每次都基于最新排队的结果 +1
  })
}
```

处方单页面里"批量勾选药品"这类场景——用户一次性勾选多个药品复选框，每个复选框的 `onChange` 都要更新一个"已选中数量"的计数器，必须用函数式更新，否则最终计数会不准确。

#### 复杂审核状态机：useReducer 与 Class 组件的取舍

处方审核涉及"待审核 → 已通过/已拒绝 → 已发药"等多个字段联动的状态机，如果用多个独立的 `useState` 手工维护，容易出现"字段之间不一致"的 bug（比如"已发药"了但"审核状态"字段忘了同步）：

```jsx
// ❌ 多个独立 useState，字段之间的一致性需要手动维护
const [auditStatus, setAuditStatus] = useState('pending')
const [dispenseStatus, setDispenseStatus] = useState('waiting')
// 容易出现 auditStatus 改了但 dispenseStatus 忘了同步的 bug

// ✅ useReducer 把状态转移逻辑收敛到一个 reducer 里，一次 dispatch 保证多个字段同步变化
function prescriptionReducer(state, action) {
  switch (action.type) {
    case 'APPROVE':
      return { ...state, auditStatus: 'approved', dispenseStatus: 'ready' }
    case 'REJECT':
      return { ...state, auditStatus: 'rejected', dispenseStatus: 'cancelled' }
    default:
      return state
  }
}
const [state, dispatch] = useReducer(prescriptionReducer, initialState)
```

Hook 场景优先用 `useReducer` 把状态转移集中管理；遗留系统里的 Class 组件场景，则倾向于拆分成更小的 Class 组件，让每个组件只负责一小块状态，而不是在一个大 Class 里塞多个 `this.setState` 调用点。

#### 排查"点击按钮但界面没有立刻更新"

```jsx
function handleSaveAndMeasure() {
  setSaveStatus('saved')
  // ❌ 这里立刻读 DOM，可能读到的还是更新前的旧尺寸——渲染是异步排队的，不是立即执行的
  const height = statusRef.current.offsetHeight

  // ✅ 确实需要立刻拿到渲染后的 DOM，用 flushSync 包裹这次更新
  flushSync(() => {
    setSaveStatus('saved')
  })
  const heightAfterFlush = statusRef.current.offsetHeight // 这里才是准确的
}
```

排查这类问题时，第一步先确认是否处于批处理上下文中（是否在事件处理函数/`useEffect`/Promise 回调里），再判断是否真的需要 `flushSync` 强制同步，而不是想着"换一种方式让 setState 立即生效"——setState 从设计上就不是立即生效的。

#### Class 组件与函数组件并存时的独立更新队列提醒

遗留系统里同一个页面可能既有老的 Class 组件、又有新写的函数组件。两者的更新队列结构高度相似（都是"pending 环形链表 + baseState 兜底"），但是**分别独立实现**——修复了 Class 组件更新队列里的一个 bug，不代表函数组件 Hook 的更新队列也会同步修复。排查跨组件的更新问题时，先确认这次的组件是 Class 还是函数组件，再决定去哪个源码文件里定位问题。

---

## 二、设计与原理

### 1. Update 的心智模型：排队处理，而非立即修改

不管是 `this.setState`，还是 Hook 的 `dispatch`，本质都是同一件事：**往一个队列里追加一个描述"本次变化"的 Update 对象，然后调度一次重新渲染；渲染时再统一处理队列里的所有 Update，算出最终状态**。

这是理解 React 状态更新的第一个关键认知：**状态不是被"立即修改"的，而是被"排队等待处理"的**。

```javascript
// 心智模型示意（不是真实源码，帮助建立第一印象）
function setState(newValue) {
  const update = { payload: newValue }         // 1. 把这次变化包装成一个 Update 对象
  enqueueUpdate(fiber, update)                  // 2. 塞进这个 Fiber 的更新队列
  scheduleUpdateOnFiber(fiber)                  // 3. 调度一次重新渲染（不是立即渲染）
}

// 真正的状态计算，发生在渲染阶段
function renderPhase() {
  const finalState = processUpdateQueue(queue)  // 4. 渲染时才统一处理队列里所有 Update
}
```

调用 `setState` 的那一刻，React 只做了"记一笔账"和"预约一次结算"这两件事，真正的"结算"（计算出最终 state）被推迟到了渲染阶段。这个认知是后面「批处理」「优先级跳过」「Lane 模型为什么要和 Update 队列配合」这几个知识点的地基。

> 💬 **面试官会问**：`setState` 调用之后，state 是立即变化的吗？
>
> ✅ **标准答案**：不是。`setState`/`dispatch` 只是把这次变化包装成一个 Update 对象追加到更新队列，然后调度一次渲染；真正的状态计算发生在渲染阶段的 `processUpdateQueue` 里，会一次性处理队列中所有排队的 Update。这也是为什么"`setState` 后立即读取 `this.state`"读到的还是旧值。

### 2. Class 组件的 UpdateQueue：baseState + pending 环形链表

每个 Class 组件（以及 HostRoot）对应的 Fiber 上都挂着一个 `updateQueue`，结构定义在 `ReactFiberClassUpdateQueue.ts` 里：

```typescript
export interface UpdateQueue<State> {
  baseState: State;                        // 上一次跳过 bailout 后的基准状态
  firstBaseUpdate: Update<State> | null;   // 基准 Update 链表的头
  lastBaseUpdate: Update<State> | null;    // 基准 Update 链表的尾
  shared: SharedQueue<State>;              // 本次渲染新增的 Update 先挂在这里
  effects: Update<State>[] | null;
}

export interface SharedQueue<State> {
  pending: Update<State> | null;  // 环形链表：pending 指向最新一条，pending.next 指向最旧一条
  lanes: Lanes;
}
```

`shared.pending` 是一条**环形链表**——新的 Update 追加时，直接把 `pending` 指针指向新节点，`pending.next` 永远指向"最旧的那一条"：

```typescript
// packages/react-reconciler/src/ReactFiberClassUpdateQueue.ts
export function enqueueUpdate<State>(
  fiber: FiberNode,
  update: Update<State>,
  lane: Lane,
): FiberRootNode | null {
  const sharedQueue = fiber.updateQueue.shared;
  const pending = sharedQueue.pending;
  if (pending === null) {
    // 第一条 update，自成环：update.next 指向自己
    update.next = update;
  } else {
    // 插在"最新"和"最旧"之间：新节点接管 pending 位置，同时保持环形
    update.next = pending.next;
    pending.next = update;
  }
  sharedQueue.pending = update;

  return markUpdateLaneFromFiberToRoot(fiber, lane);
}
```

**为什么用环形链表，而不是普通链表 + 尾指针？** 因为只用一个 `pending` 指针就能同时拿到"最新节点"（`pending`）和"最旧节点"（`pending.next`），不需要额外维护 `first`/`last` 两个指针——这是一个常见的环形链表技巧，不是 React 专属。

`processUpdateQueue` 处理时，会先把这条环形链表"解环"、接到 `baseState` 对应的链表后面，再从头遍历依次执行每个 Update 的 `payload`：

```typescript
// packages/react-reconciler/src/ReactFiberClassUpdateQueue.ts（节选）
let pendingQueue = queue.shared.pending;
if (pendingQueue !== null) {
  queue.shared.pending = null;

  // pending 是循环链表，断开首尾指针让它变成普通单向链表
  const lastPendingUpdate = pendingQueue;
  const firstPendingUpdate = lastPendingUpdate.next!;
  lastPendingUpdate.next = null;
  // 追加 pending 到 base 队列尾部
  if (lastBaseUpdate === null) {
    firstBaseUpdate = firstPendingUpdate;
  } else {
    lastBaseUpdate.next = firstPendingUpdate;
  }
  lastBaseUpdate = lastPendingUpdate;
}
```

`payload` 可能是对象也可能是函数，这正对应「一、1」节讲的"对象式 vs 函数式更新"——`getStateFromUpdate` 里会判断 `payload` 的类型分别处理：

```typescript
// 对照官方 getStateFromUpdate
if (typeof payload === "function") {
  partialState = payload.call(instance, prevState, nextProps); // 函数式：拿 prevState 计算
} else {
  partialState = payload; // 对象式：直接用
}
return Object.assign({}, prevState, partialState); // 浅合并
```

这行 `payload.call(instance, prevState, nextProps)` 里的 `prevState`，正是"链上前一条 Update 已经算出的结果"——这就是「一、1」节里函数式更新为什么能连续正确累加的源码级解释。

> 💬 **面试官会问**：`shared.pending` 为什么设计成环形链表？
>
> ✅ **标准答案**：环形链表只需要维护一个 `pending` 指针就能同时定位"最新插入的节点"（`pending` 本身）和"最旧的节点"（`pending.next`），不用像普通链表那样额外维护 `first`/`last` 两个指针。`enqueueUpdate` 每次插入新节点时，把新节点接到"最旧节点"前面、"最新节点"后面，环形结构始终保持不断。

### 3. Hook 的 Update 链表：结构相似，独立实现

`useState`/`useReducer` 对应的每个 Hook 对象上，也有一个结构几乎一样的更新队列——`pending` 环形链表 + `baseState` + `baseQueue`，`updateReducer` 遍历这条链表依次执行 reducer 得出新状态。

这是一个**常被误解的点**：很多人以为 Class 的更新队列和 Hook 的更新队列是同一套代码，实际上分别独立实现在官方源码的 `ReactFiberClassUpdateQueue.js` 和 `ReactFiberHooks.js` 里，只是设计思路高度相似（都是"pending 环形链表 + baseState 兜底 + 遍历执行"）——这是 React 团队刻意复用的一套**通用模式**，而不是共享的同一份代码。

本地手写仓库（见「四」节）里，Hook 风格的 `queue.pending`/`updateReducer` 已经落地在 `ReactFiberHooks.ts` 里（`useState`/`useReducer` 的挂载与更新链路都能跑通）——但本篇仍按计划只在这里建立"两套队列结构相似但独立实现"的认知，不展开源码逐行解读；结合 `renderWithHooks`/Dispatcher 切换机制的完整深度拆解，留给第 06 篇 Hooks 篇专门展开。

> 💬 **面试官会问**：Class 组件的 `UpdateQueue` 和 Hook 的更新队列是同一套实现吗？
>
> ✅ **标准答案**：不是。两者分别独立实现在 `ReactFiberClassUpdateQueue.js`（`shared.pending` 环形链表 + `baseState`/`baseUpdate`）和 `ReactFiberHooks.js`（`queue.pending` 环形链表 + `hook.baseState`/`baseQueue`），字段命名和链表结构高度相似，但代码不共享，是两套并行维护的实现。
>
> 🎁 **加分答案**：这种"相似但独立"背后的原因是 Class 组件和函数组件挂状态的位置不同——Class 组件的状态挂在 Fiber 的 `updateQueue` 上（一个 Fiber 对应一份 state），Hook 的状态挂在 Hook 链表的每个节点上（一个 Fiber 可能有多个 Hook，每个 Hook 各自一份 state），数据结构的挂载位置不同，导致两套实现即使思路相同也没法直接复用同一份代码。

### 4. 为什么跳过的 Update 不能直接丢弃

如果某个 Update 因为优先级不够本次渲染而被跳过（比如先来了一个低优先级更新，中途插入一个高优先级更新），**不能直接丢弃它**，必须留在 `baseQueue`/`baseUpdate` 链表里等下一次渲染补上，否则会导致更新丢失。

`processUpdateQueue` 里能看到这个"跳过但不丢弃"的完整逻辑：

```typescript
// packages/react-reconciler/src/ReactFiberClassUpdateQueue.ts（节选，processUpdateQueue 内部）
if (!isSubsetOfLanes(renderLanes, updateLane)) {
  // 优先级不足：跳过。第一条被跳过的 update 之前的 state 就是新的 baseState，
  // 被跳过的 update 依次克隆进新的 base 队列，留待后续高优先级渲染完成后重放。
  const clone: Update<State> = { ...currentUpdate, next: null };
  if (newLastBaseUpdate === null) {
    newFirstBaseUpdate = clone;
    newLastBaseUpdate = clone;
    newBaseState = newState; // 第一条被跳过的 update 之前的 state，冻结成新的 baseState
  } else {
    newLastBaseUpdate.next = clone;
    newLastBaseUpdate = clone;
  }
  newLanes = mergeLanes(newLanes, updateLane); // 累积被跳过的 lane
} else {
  // 优先级足够，处理该 update。若之前已经跳过过 update，本条也要克隆进 base 队列
  // （lane 置 NoLane，重放时它恒被消费），保证 base 队列重放后的结果顺序正确
  newState = getStateFromUpdate(currentUpdate, newState, props, instance);
}
```

关键细节在于：**一旦某条 Update 被跳过，它之后的所有 Update（即使优先级足够）也要一起被克隆进新的 base 队列**，只是 lane 被置成 `NoLane`（意味着重放时必然会被处理）。这是为了保证**执行顺序不能乱**——如果只把被跳过的那一条单独留到下次处理，而让后面优先级够的 Update 提前算了，会导致"先来的更新反而在结果里排在后面"，破坏了 Update 本该按时间顺序生效的语义。

> 💬 **面试官会问**：为什么被跳过（bailout）的 Update 不能直接丢弃？
>
> ✅ **标准答案**：如果直接丢弃，等下次渲染时这条更新对应的变化就永久丢失了，用户执行过的操作在 UI 上却没有生效。React 的做法是把被跳过的 Update 连同它之后的所有 Update（保证顺序不乱）一起克隆进新的 `baseQueue`，同时把这次渲染出的中间状态冻结成新的 `baseState`，等下一次高优先级足够的渲染时再重放这条链，把之前跳过的更新补上。

### 5. 批处理的本质：只调度了一次，不是合并了三次

回到开篇的问题：事件处理函数里连续三次 `setState`，为什么只触发一次渲染？

`dispatchSetState`/`enqueueSetState` 把 Update 塞进队列后，调用的是 `scheduleUpdateOnFiber`，而不是立即同步渲染：

```typescript
// packages/react-reconciler/src/ReactFiberWorkLoop.ts
export function scheduleUpdateOnFiber(
  root: FiberRootNode,
  _fiber: FiberNode,
  lane: Lane,
  eventTime: number,
): void {
  markRootUpdated(root, lane, eventTime);  // 把 lane 合并进 root.pendingLanes
  ensureRootIsScheduled(root, eventTime);  // 决定要不要调度一次新的渲染任务
}
```

`ensureRootIsScheduled` 里有这样一段去重逻辑：

```typescript
const existingCallbackPriority = root.callbackPriority;
if (existingCallbackPriority === newCallbackPriority) {
  // 优先级没变，复用现有调度任务，不会重复调度
  return;
}
```

只要同一个事件循环内多次调用 `setState`，每次都是"把 Update 塞进队列 + 尝试调度一次"，而"尝试调度"这一步会因为"已经有一个同优先级的任务在排队"而被去重、直接跳过。最终只有**一次**渲染任务被真正调度，等这个任务执行时，`processUpdateQueue` 会遍历队列中排队的所有 Update（这次是三条），一次性算出最终结果。

这解释了"连续三次 `setState` 只重渲染一次"背后真正发生的事情：**不是"合并了三次渲染"，而是"从来只安排了一次渲染，三次 Update 在这一次渲染里被一起处理掉了"**。

> 💬 **面试官会问**：连续三次 `setState` 只触发一次渲染，是"合并了三次渲染"还是"本来就只调度了一次"？
>
> ✅ **标准答案**：本来就只调度了一次。每次 `setState` 都会把 Update 塞进队列，然后尝试调度一次渲染任务；`ensureRootIsScheduled` 里有优先级去重逻辑，发现已经有一个同优先级的任务在排队时会直接跳过，不会重复调度。所以三次调用最终只产生了一个渲染任务，这个任务执行时会一次性处理队列里排队的全部三条 Update。

### 6. Lane 模型详解：31 位二进制表达优先级

链表化的 Update 队列解决了"记录变化"的问题，但紧接着有一个新问题：如果同时有多个不同优先级的更新在排队，**该按什么顺序处理**？这就是 Lane（车道）模型要解决的问题——第01篇「二、5」节已经建立过直觉，这里展开源码级细节。

Lane 用一个 31 位的二进制数，每一位（或一组位）代表一种优先级"车道"：

```typescript
// packages/react-reconciler/src/ReactFiberLane.ts（节选）
export const SyncLane: Lane = 0b0000000000000000000000000000001;
export const InputContinuousLane: Lane = 0b0000000000000000000000000000100;
export const DefaultLane: Lane = 0b0000000000000000000000000010000;
const TransitionLane1: Lane = 0b0000000000000000000000001000000;
// ... TransitionLane2~16
export const IdleLane: Lane = 0b0100000000000000000000000000000;
```

三个基础的位运算助手：

```typescript
export function mergeLanes(a: Lanes | Lane, b: Lanes | Lane): Lanes {
  return a | b; // 并集：把多个 lane 合并进同一个数
}

export function includesSomeLane(a: Lanes | Lane, b: Lanes | Lane): boolean {
  return (a & b) !== NoLanes; // 交集非空：a 和 b 有没有共同的 lane
}

export function isSubsetOfLanes(set: Lanes, subset: Lanes | Lane): boolean {
  return (set & subset) === subset; // 子集判断：subset 的每一位都在 set 里
}
```

`getNextLanes` 从 `root.pendingLanes` 里挑出本次该处理的一组 lane：

```typescript
// packages/react-reconciler/src/ReactFiberLane.ts（节选）
export function getNextLanes(root: FiberRootNode, wipLanes: Lanes): Lanes {
  const pendingLanes = root.pendingLanes;
  if (pendingLanes === NoLanes) return NoLanes;

  const nonIdlePendingLanes = pendingLanes & NonIdleLanes;
  let nextLanes: Lanes;
  if (nonIdlePendingLanes !== NoLanes) {
    nextLanes = getHighestPriorityLanes(nonIdlePendingLanes); // 非 Idle 优先
  } else {
    nextLanes = getHighestPriorityLanes(pendingLanes); // 都是 Idle，才轮到它
  }
  // ...已有更高优先级渲染在进行时不被低优先级打断（wipLanes 分支）
  return nextLanes;
}
```

`includesBlockingLane` 判断本次要处理的 lane 是否包含"阻塞性"更新，决定这次渲染能不能被时间切片打断：

```typescript
export function includesBlockingLane(_root: FiberRootNode, lanes: Lanes): boolean {
  const SyncDefaultLanes =
    InputContinuousHydrationLane | InputContinuousLane | DefaultHydrationLane | DefaultLane;
  return (lanes & SyncDefaultLanes) !== NoLanes;
}
```

三个助手函数看似简单，但组合起来就能表达"多个优先级同时排队""判断有没有某个优先级""是不是某一组优先级的子集"这些复杂的组合逻辑——这是下一节要讲的"位运算相比数值优先级模型"的核心优势所在。

### 7. 为什么是 31 位，不是 32 位

JS 的位运算（`|`/`&`/`~`）把数字当作 **32 位有符号整数**处理，最高位（第 31 位，从 0 开始数）是符号位——一旦这一位被置 1，数字就会被 JS 引擎解释成负数：

```javascript
console.log(1 << 30) // 1073741824，正数，符合预期
console.log(1 << 31) // -2147483648，符号位被置 1，变成负数！
console.log((1 << 31) & (1 << 31)) // -2147483648，看起来"正常"，但一旦和其他位组合运算就会出问题
```

如果 Lane 用满 32 位，第 31 位（最高位）代表的那个"优先级"在做位运算时，符号位翻转会让"某一位代表某种优先级"这个语义彻底错乱——`a | b` 期望结果是"多个优先级的并集"，但因为符号位的存在，结果可能变成一个意料之外的负数，后续所有基于"这一位是不是 1"的判断全部失真。

React 只能安全使用低 31 位（bit 0 到 bit 30），这也是官方源码里 `TotalLanes = 31` 这个常量、以及"Lane 最多只能有 31 条"这个硬性上限的**真正来源**——不是随便定的数字，而是 JS 位运算规则决定的物理边界。

> 💬 **面试官会问**：为什么 Lane 最多只能有 31 条而不是 32 条？
>
> ✅ **标准答案**：JS 的位运算把数字当作 32 位有符号整数处理，最高位（第 31 位）是符号位。如果这一位被置 1，数字会被解释成负数，导致"每一位代表一种优先级"这个语义被破坏——位运算的结果可能变成意料之外的负数，后续所有基于"某一位是不是 1"的判断都会出错。所以 React 只能安全使用低 31 位表达优先级，这是 Lane 数量上限的真正来源。

### 8. 位运算相比数值优先级模型解决的本质问题

React 16 到 17 用的是 `expirationTime`——一个单一数值，数值越小代表越紧急。这个模型本质上只能表达"这一个任务的优先级是多少"，一次只能做**大小比较**。

Lane 用二进制位表示优先级，`lanes` 字段可以**同时置上多个位**。这带来两种单一数值模型做不到的能力：

**`|`（或运算）表达的是集合的并集**：一个 Fiber 或 root 上完全可能同时挂着好几个不同优先级的待处理更新——比如一个 `SyncLane` 的点击更新和一个 `TransitionLane` 的过渡更新同时排队：

```javascript
// 单一数值模型：只能记录"当前最紧急的那一个"，没法同时表达两个都在排队
let expirationTime = Math.min(clickExpirationTime, transitionExpirationTime) // 信息丢失

// Lane 位运算模型：一个数同时装下两种优先级的信息，谁都不会被覆盖掉
let pendingLanes = SyncLane | TransitionLane1 // 0b...010000001，两条都还在排队，清晰可查
```

**`&`（与运算）表达的是集合的交集/包含判断**：判断某个具体 lane 是否属于某一组 lane。`includesBlockingLane`、`includesSomeLane` 的实现原理都是"`&` 之后判断结果是否为 0"：

```javascript
function includesSomeLane(a, b) {
  return (a & b) !== NoLanes // a 和 b 有没有交集
}
```

这种"多个优先级可以共存 + 可以按位筛选出任意子集"的能力，是并发渲染"高优先级先处理、其余的继续留在 `pendingLanes` 排队"这套机制的地基——单一数值优先级模型做不到，因为它每次只能记录"当前最紧急的那一个数"，一旦被更紧急的值覆盖，之前排队的信息就丢失了。

> 💬 **面试官会问**：Lane 模型相比 React 16 的 `expirationTime` 数值模型有什么优势？为什么用二进制位运算表示优先级？
>
> ✅ **标准答案**：`expirationTime` 是单一数值，一次只能表达"当前最紧急的那一个"优先级，多个不同优先级的更新无法同时被记录。Lane 用二进制位表示优先级，`lanes` 字段可以同时置上多个位，`|`（或运算）表达"多个优先级并存"（一个 Fiber 上可以同时有 `SyncLane` 和 `TransitionLane` 在排队），`&`（与运算）表达"判断是否包含某个优先级子集"。这种"共存 + 子集筛选"的能力，是并发渲染"高优先级插队、低优先级继续排队"机制的地基，单一数值模型做不到。

### 9. `lanes & -lanes`：提取最高优先级的位运算技巧

`getHighestPriorityLane` 是源码里出现频率很高、面试常考的一个二进制技巧：

```typescript
// packages/react-reconciler/src/ReactFiberLane.ts
export function getHighestPriorityLane(lanes: Lanes): Lane {
  return lanes & -lanes; // 位运算技巧：提取最低有效位
}
```

`-lanes` 在补码表示下等于"按位取反再加一"（`~lanes + 1`）。用一个具体例子推导一遍，假设 `lanes = 0b10100`（同时有第 2 位和第 4 位两条 lane 在排队）：

```
  lanes  = 0b...00010100
 ~lanes  = 0b...11101011   （按位取反）
~lanes+1 = 0b...11101100   （补码：取反后加一，即 -lanes）

  lanes  = 0b...00010100
& -lanes = 0b...11101100
---------------------------
 结果    = 0b...00000100   （只保留了最低的那个 1）
```

`~lanes` 会把 `lanes` 里所有"最低 1 位右边的 0"都变成 1，加一之后这些 1 又会因为进位被"吃掉"变回 0，只有最低那个原本是 1 的位保持不变（因为它右边全是 0，取反后是 1，加一时不会进位到它）。所以 `lanes & -lanes` 精确地留下了 `lanes` 中**最低的那一位** 1。

这为什么等价于"提取最高优先级"？因为 Lane 常量按"数值越小、优先级越高"的约定排列（`SyncLane = 1`，`DefaultLane = 16`，`IdleLane` 是接近 2^30 的大数），数值上最低的那一位，对应的正是实际最紧急的那个优先级。

这个"提取最低设置位"的位运算技巧本身不是 React 专属，是通用的二进制操作技巧，但结合 Lane"数值越小优先级越高"的排列约定，`lanes & -lanes` 恰好就实现了"O(1) 复杂度取出最高优先级"的效果，比遍历 31 个位逐个判断快得多。

> 💬 **面试官会问**：`lanes & -lanes` 这个位运算是在做什么？为什么能取出最高优先级的 lane？
>
> ✅ **标准答案**：`-lanes` 在补码表示下等于 `~lanes + 1`，`lanes & -lanes` 的结果是 `lanes` 中数值最低的那一位 1（提取"最低设置位"是一个通用的二进制技巧）。因为 React 的 Lane 常量按"数值越小优先级越高"的约定排列，数值最低的那一位对应的正是实际最紧急的优先级，所以这个位运算恰好实现了"O(1) 取出最高优先级 lane"的效果。

### 10. 优先级饿死与兜底机制

如果一直有新的高优先级更新插队，理论上低优先级的 Update 可能永远排不到——`markStarvedLanesAsExpired` 就是用来兜底这个问题的：

```typescript
// packages/react-reconciler/src/ReactFiberLane.ts（节选）
export function markStarvedLanesAsExpired(root: FiberRootNode, currentTime: number): void {
  let lanes = root.pendingLanes;
  while (lanes > 0) {
    const index = pickArbitraryLaneIndex(lanes);
    const lane = 1 << index;

    const expirationTime = root.expirationTimes[index];
    if (expirationTime === NoTimestamp) {
      // 第一次见到这条 lane 排队，计算它的过期时间
      root.expirationTimes[index] = computeExpirationTime(lane, currentTime);
    } else if (expirationTime <= currentTime) {
      // 已经超过过期时间还没处理，强制标记为"过期"
      root.expiredLanes |= lane;
    }
    lanes &= ~lane;
  }
}
```

每个 Lane 在第一次被记录排队时，会算出一个"过期时间"（`computeExpirationTime`）——紧急类的 lane（`SyncLane`/`InputContinuousLane`）给 250ms，`DefaultLane`/`TransitionLane` 给 5000ms：

```typescript
function computeExpirationTime(lane: Lane, currentTime: number): number {
  switch (lane) {
    case SyncLane:
    case InputContinuousLane:
      return currentTime + 250;
    case DefaultLane:
    // ...TransitionLane1~16
      return currentTime + 5000;
    default:
      return NoTimestamp; // Idle/Retry 等永不过期
  }
}
```

如果一个 lane 排队超过这个时间还没被处理，会被强制并入 `root.expiredLanes`。这个标记会在 `performConcurrentWorkOnRoot` 里生效：

```typescript
// packages/react-reconciler/src/ReactFiberWorkLoop.ts（节选）
const shouldTimeSlice =
  !includesBlockingLane(root, lanes) &&
  !includesExpiredLane(root, lanes) && // 👈 已过期的 lane，不再走时间切片
  !didTimeout;

const exitStatus = shouldTimeSlice
  ? renderRootConcurrent(root, lanes) // 正常情况：可中断渲染
  : renderRootSync(root, lanes);      // 过期兜底：强制同步跑完，不再被打断
```

一旦某个 lane 被标记为过期，下一次调度时它会被强制走同步渲染路径，不再给它继续排队等待的机会——保证"低优先级更新最终一定会被执行"，不会无限延后。

> 💬 **面试官会问**：如果 Lane 模型没有"过期"兜底机制，会出现什么现象？React 是怎么解决优先级饿死问题的？
>
> ✅ **标准答案**：没有兜底机制的话，如果高优先级更新持续不断地插队，低优先级的 Update 理论上可能永远得不到处理机会，对应的 UI 更新会一直被推迟，用户会感觉"这部分内容怎么点了很久都没反应"。React 用 `markStarvedLanesAsExpired` 给每条排队中的 lane 计算一个过期时间，一旦超时就强制标记为 `expiredLanes`，下一次调度时这条 lane 会被强制走同步渲染路径，不再参与"可能被打断"的时间切片，保证它一定会被处理完。

### 11. 对比 Vue 3：微任务合并 vs 优先级排队

Vue 3 的响应式更新没有"优先级"概念——`trigger` 触发的副作用统一走微任务队列去重合并（`nextTick`），本质是"同一 tick 内的多次触发合并成一次"：

```javascript
// Vue 3 简化示意：多次触发在同一个 tick 内被去重合并
function trigger(effect) {
  queue.add(effect)          // 加入队列，自动去重（同一个 effect 不会重复加入）
  queueFlush()               // 排一个微任务，本 tick 内多次调用只会排一次
}
```

React 的 Update 队列除了"合并去重"这一层（对应本篇「二、5」节讲的批处理），还叠加了一层"优先级排队"——Lane 模型让"高优先级更新可以打断正在进行的低优先级渲染"成为可能。这是并发模式下核心能力的地基，Vue 3 的调度模型里没有对应机制：Vue 3 的更新一旦进入微任务队列，都是同等地位，不存在"这个更新比那个更紧急，可以插队"的概念。

> 💬 **面试官会问**：React 和 Vue 3 在处理"多次触发只更新一次"这件事上有什么本质区别？
>
> ✅ **标准答案**：Vue 3 的 `trigger` 统一走微任务队列去重合并（`nextTick`），本质是"同一 tick 内的多次触发合并成一次"，所有更新地位相同，没有优先级区分。React 的 Update 队列除了合并去重，还叠加了一层 Lane 优先级模型，不同来源的更新会被打上不同的优先级标记，高优先级更新可以打断正在进行的低优先级渲染——这是并发模式"可插队"能力的地基，Vue 3 目前的响应式调度模型里没有对应机制。

---

## 三、源码解析（重点代码，来源 GitHub 仓库）

> React 18 源码地址：https://github.com/facebook/react（本篇断点调试环境沿用第01篇锁定的 `v18.2.0`）

### 1. Class 组件更新入口：packages/react-reconciler/src/ReactFiberClassComponent.js

```javascript
// packages/react-reconciler/src/ReactFiberClassComponent.js（简化示意，保留核心结构）
const classComponentUpdater = {
  enqueueSetState(inst, payload, callback) {
    const fiber = getInstance(inst)               // 从组件实例反查到对应的 Fiber
    const lane = requestUpdateLane(fiber)          // 请求本次更新的优先级

    const update = createUpdate(lane)
    update.payload = payload                       // this.setState(payload) 的参数原样放进去
    if (callback !== undefined && callback !== null) {
      update.callback = callback
    }

    const root = enqueueUpdate(fiber, update, lane) // 塞进更新队列，返回 FiberRootNode
    if (root !== null) {
      scheduleUpdateOnFiber(root, fiber, lane)      // 调度一次渲染
    }
  },
}
```

**关键点**

1. `this.setState(payload, callback)` 最终调用的正是 `enqueueSetState`——`inst` 是组件实例，`getInstance` 反查出对应的 Fiber
2. `payload` 原样放进 Update 对象，不在这一步区分是对象还是函数——真正的区分逻辑在渲染阶段的 `getStateFromUpdate` 里（对照「二、2」节）
3. 这一步和「二、5」节讲的批处理机制是同一条链路——`scheduleUpdateOnFiber` 只是"尝试调度"，不是"立即渲染"

### 2. Class 组件更新队列：packages/react-reconciler/src/ReactFiberClassUpdateQueue.js

```javascript
// packages/react-reconciler/src/ReactFiberClassUpdateQueue.js（简化示意，保留核心结构）
export function createUpdate(lane) {
  const update = { lane, tag: UpdateState, payload: null, callback: null, next: null }
  return update
}

export function enqueueUpdate(fiber, update, lane) {
  const updateQueue = fiber.updateQueue
  const sharedQueue = updateQueue.shared
  const pending = sharedQueue.pending

  if (pending === null) {
    update.next = update           // 第一条 update，自成环
  } else {
    update.next = pending.next
    pending.next = update
  }
  sharedQueue.pending = update

  return markUpdateLaneFromFiberToRoot(fiber, lane)
}

export function processUpdateQueue(workInProgress, props, instance, renderLanes) {
  const queue = workInProgress.updateQueue
  // ... 解环 pending、拼接到 baseUpdate 链表、遍历执行每个 update 的 payload
  // 完整逻辑见「二、2」「二、4」节的源码节选（本地手写仓库与这段官方实现逐行对齐）
}
```

**关键点**

1. `createUpdate`/`enqueueUpdate`/`processUpdateQueue` 这三个函数，本地手写仓库的 `ReactFiberClassUpdateQueue.ts` 已经 1:1 对齐实现（见「四」节），字段名、链表结构完全一致
2. `markUpdateLaneFromFiberToRoot` 沿 `return` 指针把 lane 一路合并到每个祖先的 `childLanes`，这是 `beginWork` 的 bailout 判断能够"知道子树有没有工作要做"的关键依据

### 3. Hook 更新队列（对照阅读）：packages/react-reconciler/src/ReactFiberHooks.js

```javascript
// packages/react-reconciler/src/ReactFiberHooks.js（简化示意，保留核心结构）
function dispatchSetState(fiber, queue, action) {
  const lane = requestUpdateLane(fiber)
  const update = { lane, action, hasEagerState: false, eagerState: null, next: null }

  const root = enqueueConcurrentHookUpdate(fiber, queue, update, lane) // 👈 与 Class 不同：走并发更新入队
  if (root !== null) {
    scheduleUpdateOnFiber(root, fiber, lane)
  }
}

function updateReducer(reducer, initialArg, init) {
  const hook = updateWorkInProgressHook()
  const queue = hook.queue
  const pendingQueue = queue.pending
  // ... 解环 pending、拼到 hook.baseQueue、遍历执行 reducer 得出新状态
  // 结构与 Class 版 processUpdateQueue 高度相似，但这是完全独立的一份实现
}
```

**关键点**

1. `dispatchSetState`（Hook 版本）和 `enqueueSetState`（Class 版本）名字相似，但内部走的是两条独立的代码路径——这正是「二、3」节讲的"结构相似、代码不共享"
2. 关键差异：Hook 版本调用的是 `enqueueConcurrentHookUpdate`，而不是 Class 版本的直接 `enqueueUpdate`——官方在并发模式下给 Hook 更新多加了一层"先记录到全局队列，commit 前统一刷回 Fiber"的间接层（`ReactFiberConcurrentUpdates.js`），避免渲染中的 Fiber 树被并发触发的更新污染。本地手写仓库这一层已经落地（`ReactFiberConcurrentUpdates.ts`），且 Class 版本的 `enqueueUpdate` 也改造成了走同一套 `enqueueConcurrentClassUpdate` 入口——两条路径（Hook/Class）共用同一个延迟入队模块，见「四」节
3. `updateReducer` 遍历 `baseQueue` 执行 reducer 的逻辑，和 Class 版本 `processUpdateQueue` 遍历 `firstBaseUpdate` 执行 `payload` 的逻辑，结构上是同一个模式的两次独立表达

### 4. Lane 常量与位运算：packages/react-reconciler/src/ReactFiberLane.js

```javascript
// packages/react-reconciler/src/ReactFiberLane.js（简化示意，保留核心结构）
export const SyncLane = 0b0000000000000000000000000000001
export const DefaultLane = 0b0000000000000000000000000010000

export function mergeLanes(a, b) {
  return a | b
}

export function getHighestPriorityLane(lanes) {
  return lanes & -lanes // 提取最低设置位，即最高优先级
}

export function markStarvedLanesAsExpired(root, currentTime) {
  let lanes = root.pendingLanes
  while (lanes !== 0) {
    const index = pickArbitraryLaneIndex(lanes)
    const lane = 1 << index
    const expirationTime = root.expirationTimes[index]
    if (expirationTime !== NoTimestamp && expirationTime <= currentTime) {
      root.expiredLanes |= lane // 过期兜底
    }
    lanes &= ~lane
  }
}
```

**关键点**

1. 这份官方源码和本地手写仓库的 `ReactFiberLane.ts` 逐位对齐——包括常量数值、`mergeLanes`/`getHighestPriorityLane`/`markStarvedLanesAsExpired` 的实现逻辑，是本篇「四」节要逐段解读的对象
2. `getHighestPriorityLane` 这一行就是「二、9」节详细推导的 `lanes & -lanes` 技巧的源码原文

### 5. 调度入口：packages/react-reconciler/src/ReactFiberWorkLoop.js

```javascript
// packages/react-reconciler/src/ReactFiberWorkLoop.js（简化示意，保留核心结构）
export function scheduleUpdateOnFiber(root, fiber, lane, eventTime) {
  markRootUpdated(root, lane, eventTime)

  if (executionContext === NoContext /* 不在批处理上下文中 */) {
    // legacy 模式的同步更新会走一条更直接的路径（本篇不展开，官方还有 unstable_batchedUpdates 相关分支）
  }

  ensureRootIsScheduled(root, eventTime)
}

function ensureRootIsScheduled(root, currentTime) {
  const existingCallbackNode = root.callbackNode
  const nextLanes = getNextLanes(root, NoLanes)
  const newCallbackPriority = getHighestPriorityLane(nextLanes)

  if (root.callbackPriority === newCallbackPriority) {
    return // 👈 优先级没变，复用现有调度任务——这正是批处理去重的关键一步
  }
  // ... 取消旧任务、按优先级调度新任务
}
```

**关键点**

1. `ensureRootIsScheduled` 如何根据当前上下文（是否已经有同优先级任务在排队）决定是否需要真正调度一次新任务，是「二、5」节"批处理的本质"结论的源码依据
2. 这一节和本地手写仓库的 `ReactFiberWorkLoop.ts` 里的 `scheduleUpdateOnFiber`/`ensureRootIsScheduled` 也是逐段对齐的实现（见「四」节）

---

## 四、手写实现（解读已完成代码）

本节基于本地真实项目 `D:\github\react-source`（GitHub：https://github.com/lotosv2010/react-source）编写。需要如实说明一件事：**Class/HostRoot 的 UpdateQueue 和完整的 Lane 模型，在这个仓库里并不是本篇要新写的代码**——它们在项目的 Phase 4（对照仓库 `docs/roadmap.md`）就已经和官方 React 18 源码逐位、逐函数对齐完成了。本节要做的是把这两份已经跑通的真实代码逐段解读清楚，而不是演示"新写了什么"。

按仓库 `docs/roadmap.md` 的说法：

> Phase 2（简版）已完成更新队列（`Update`/`UpdateQueue`/`SharedQueue` 数据结构、`createUpdate`/`enqueueUpdate`/`processUpdateQueue`/`cloneUpdateQueue`/`initializeUpdateQueue`）；Phase 4 完成完整 Lane 模型（30 条 lane 位表逐位对齐官方）与 reconciler 接入 Scheduler 的调度链路。

**⚠️ 一处需要更新的信息**：仓库在本篇写作期间又向前推进了一步——Phase 5（Hooks 主链路，`useState`/`useReducer`）已经落地，同时把并发更新的入队方式从"立即冒泡"整体切换成了"延迟入队"模型（新增 `ReactFiberConcurrentUpdates.ts`）。这意味着「三、3」节提到的 `enqueueConcurrentHookUpdate` 延迟入队层，现在不再是"官方有、本项目没有"的差距项，而是仓库里已经跑通的真实代码；`ReactFiberClassUpdateQueue.ts` 的 `enqueueUpdate` 也同步做了改造，不再自己内联冒泡 lane，而是委托给这套新模块。本节按这份最新代码讲解；Hook 更新队列的逐行源码解读（`mountState`/`updateReducer`/Dispatcher 切换）仍然留到第 06 篇 Hooks 篇专门展开，这里只讲它如何影响 Class/HostRoot 这条链路。

### 1. UpdateQueue 数据结构：ReactFiberClassUpdateQueue.ts

仓库这份实现和「二、2」节讲的官方结构完全对齐，`Update`/`UpdateQueue`/`SharedQueue` 三个接口定义如下：

```typescript
// packages/react-reconciler/src/ReactFiberClassUpdateQueue.ts
export interface Update<State> {
  eventTime: number;
  lane: Lane;
  tag: UpdateTag;
  payload: any;
  callback: (() => void) | null;
  next: Update<State> | null;
}

export interface SharedQueue<State> {
  pending: Update<State> | null;
  lanes: Lanes;
}

export interface UpdateQueue<State> {
  baseState: State;
  firstBaseUpdate: Update<State> | null;
  lastBaseUpdate: Update<State> | null;
  shared: SharedQueue<State>;
  effects: Update<State>[] | null;
}
```

唯一和官方略有差异的地方，是文件头注释里标注的开发边界：

```typescript
// 对照官方 packages/react-reconciler/src/ReactFiberClassUpdateQueue.new.js：Update 对象是
// 不可变的纯数据（payload 携带新 state/新 element），shared.pending 是循环链表（last 指向
// 最新一条，last.next 指向最旧一条），处理时解环拼到 base 队列上。回调 effect 与 forceUpdate
// 等 class 组件特性留到 Phase 8，这里先保留结构、省略 effect 收集。
```

`callback`/`effects` 字段虽然已经在类型定义里预留了，但 Class 组件的 `forceUpdate`、`setState` 回调这些依赖真正 Class 生命周期的特性要到 Phase 8（Class 组件生命周期）才会补全逻辑——目前 `resetHasForceUpdateBeforeProcessing` 是个空函数，就是这个边界的直接体现：

```typescript
export function resetHasForceUpdateBeforeProcessing(): void {
  // forceUpdate 留到 Phase 8
}
```

### 2. enqueueUpdate 与延迟入队模型：ReactFiberConcurrentUpdates.ts

`enqueueUpdate` 现在不再自己内联做环形链表插入和 lane 冒泡，而是直接委托给 `ReactFiberConcurrentUpdates.ts` 里的 `enqueueConcurrentClassUpdate`：

```typescript
// packages/react-reconciler/src/ReactFiberClassUpdateQueue.ts（当前真实代码）
export function enqueueUpdate<State>(
  fiber: FiberNode,
  update: Update<State>,
  lane: Lane,
): FiberRootNode | null {
  const updateQueue = fiber.updateQueue;
  if (updateQueue === null) {
    return null; // fiber 已被卸载
  }

  const sharedQueue: SharedQueue<State> = updateQueue.shared;
  return enqueueConcurrentClassUpdate(fiber, sharedQueue, update, lane);
}
```

真正的环形链表插入、lane 冒泡逻辑搬到了 `ReactFiberConcurrentUpdates.ts` 里：

```typescript
// packages/react-reconciler/src/ReactFiberConcurrentUpdates.ts（当前真实代码，节选）
function enqueueUpdate(fiber, queue, update, lane) {
  concurrentQueues[concurrentQueuesIndex++] = fiber;
  concurrentQueues[concurrentQueuesIndex++] = queue;
  concurrentQueues[concurrentQueuesIndex++] = update;
  concurrentQueues[concurrentQueuesIndex++] = lane;

  // fiber.lanes 需要立刻可见（beginWork 的提前 bailout 判断依赖它），
  // 不能等到 finishQueueingConcurrentUpdates 才更新；childLanes 冒泡可以延迟。
  fiber.lanes = mergeLanes(fiber.lanes, lane);
  const alternate = fiber.alternate;
  if (alternate !== null) {
    alternate.lanes = mergeLanes(alternate.lanes, lane);
  }
}

// 把暂存的 update 刷回各自 fiber 的 updateQueue，并把 lane 冒泡到 root
export function finishQueueingConcurrentUpdates() {
  // ... 遍历 concurrentQueues 数组，把 update 真正接入 queue.pending 环形链表，
  // 并调用 markUpdateLaneFromFiberToRoot 把 lane 冒泡到每个祖先的 childLanes
}
```

**为什么要多绕这一层？** 这不是重构上的随意选择，而是并发渲染下的必要设计：如果 Update 一产生就立即写入 Fiber 的 `updateQueue.shared.pending`（本篇「二、2」节讲的环形链表插入），当渲染正在进行中、又有新的并发事件（比如用户在一次 `TransitionLane` 渲染还没完成时又点击了一次）触发了新的 Update，这条新 Update 会直接"写进"一棵正在被遍历读取的 `workInProgress` 树，可能读到一棵"渲染了一半"的树的中间状态，产生数据不一致。延迟入队模型把"记录这次变化"（`enqueueUpdate` 塞进 `concurrentQueues` 暂存数组）和"真正应用到 Fiber 树上"（`finishQueueingConcurrentUpdates` 在渲染开始前或渲染完成时统一刷回）这两个动作在时间上彻底分开，避免了这种读写竞态。

`fiber.lanes` 这一项做了折中：它需要立刻可见（`beginWork` 里 `attemptEarlyBailoutIfNoScheduledUpdate` 的提前 bailout 判断依赖这个字段判断"这个 Fiber 有没有工作要做"），所以在 `enqueueUpdate` 暂存的同时就直接写了；而 `childLanes` 的冒泡不影响这一判断的正确性，所以可以延迟到 `finishQueueingConcurrentUpdates` 里再做。

`markUpdateLaneFromFiberToRoot` 也整体搬到了这个新文件里，沿 `return` 指针向上冒泡 lane 时依然同时更新 `alternate` 上的 `childLanes`：

```typescript
// packages/react-reconciler/src/ReactFiberConcurrentUpdates.ts（当前真实代码）
function markUpdateLaneFromFiberToRoot(sourceFiber: FiberNode, lane: Lane): FiberRootNode | null {
  let parent = sourceFiber.return;
  let node: FiberNode = sourceFiber;
  while (parent !== null) {
    parent.childLanes = mergeLanes(parent.childLanes, lane);
    const alternate = parent.alternate;
    if (alternate !== null) {
      alternate.childLanes = mergeLanes(alternate.childLanes, lane); // 👈 祖先节点的两棵树也都要标记
    }
    node = parent;
    parent = parent.return;
  }

  if (node.tag === HostRoot) {
    return node.stateNode; // 走到根，HostRoot fiber 的 stateNode 就是 FiberRootNode
  }
  return null;
}
```

**为什么 current 和 alternate 都要标记？** 因为双缓存机制下（第01篇「二、4」节），下一次渲染具体用的是 `current` 还是 `workInProgress` 树上的这个节点，取决于调度时机——如果只标记了其中一棵树，另一棵树在被复用时会"看不到"这条待处理的更新，导致 `attemptEarlyBailoutIfNoScheduledUpdate` 误判为"没有工作可做"而错误地跳过整个子树。

> 💬 **面试官会问**：为什么 Class/HostRoot 的更新要多绕 `ReactFiberConcurrentUpdates.ts` 这一层，不直接写进 Fiber 的更新队列？
>
> ✅ **标准答案**：并发渲染下，一次渲染可能被打断、期间还会收到新的更新。如果新 Update 直接写进正在被渲染遍历的 `workInProgress` 树，会读到一棵"渲染了一半"的中间状态，产生数据不一致。React 把"记录这次变化"（暂存到一个模块级数组）和"真正应用到 Fiber 树"（`finishQueueingConcurrentUpdates` 统一刷回）分成两个时间点，规避了这种读写竞态。
>
> 🎁 **加分答案**：`fiber.lanes` 是个例外，它在入队时就立即写入而不是延迟——因为 `beginWork` 的提前 bailout 判断依赖这个字段实时可见；只有 `childLanes` 的冒泡和真正把 update 接入 `queue.pending` 链表这两步会延迟到 `finishQueueingConcurrentUpdates`。这是一个"哪些状态必须立即一致、哪些状态可以延迟同步"的典型权衡设计。

### 3. processUpdateQueue：跳过与重放的完整实现

这是本地仓库里逻辑最密集的一段，「二、4」节已经贴过跳过分支的核心代码，这里补上完整的调用位置和收尾逻辑：

```typescript
// packages/react-reconciler/src/ReactFiberClassUpdateQueue.ts（节选）
export function processUpdateQueue<State>(
  workInProgress: FiberNode,
  props: any,
  instance: any,
  renderLanes: Lanes,
): void {
  const queue: UpdateQueue<State> = workInProgress.updateQueue;
  let firstBaseUpdate = queue.firstBaseUpdate;
  let lastBaseUpdate = queue.lastBaseUpdate;

  // 1. 把 shared.pending 解环，接到 base 链表尾部（同时同步给 current 队列）
  let pendingQueue = queue.shared.pending;
  if (pendingQueue !== null) {
    // ...（「二、2」节已展示）
  }

  if (firstBaseUpdate !== null) {
    let newState = queue.baseState;
    let newLanes: Lanes = NoLanes;
    // ... 遍历 firstBaseUpdate 链表，按 renderLanes 决定跳过或处理（「二、4」节已展示核心分支）

    if (newLastBaseUpdate === null) {
      newBaseState = newState; // 没有跳过任何 update，baseState 直接等于最终 state
    }

    queue.baseState = newBaseState as State;
    queue.firstBaseUpdate = newFirstBaseUpdate;
    queue.lastBaseUpdate = newLastBaseUpdate;

    markSkippedUpdateLanes(newLanes);        // 把被跳过的 lane 通知给 workLoop
    workInProgress.lanes = newLanes;         // 写回 Fiber，下次调度据此决定要不要再处理这个节点
    workInProgress.memoizedState = newState; // 这次渲染算出的最终状态
  }
}
```

调用方是 `ReactFiberBeginWork.ts` 里的 `updateHostRoot`（本地仓库对 `HostRoot` 场景做了实际接入，Class 组件的调用方要等 Phase 8）：

```typescript
// packages/react-reconciler/src/ReactFiberBeginWork.ts（已读过的真实文件，节选）
function updateHostRoot(current, workInProgress, renderLanes) {
  const nextProps = workInProgress.pendingProps;
  const prevState = workInProgress.memoizedState;
  const prevChildren = prevState.element;

  cloneUpdateQueue(current, workInProgress);                     // 克隆 current 的队列到 workInProgress
  processUpdateQueue(workInProgress, nextProps, null, renderLanes); // 处理更新，算出新的 memoizedState

  const nextState = workInProgress.memoizedState;
  const nextChildren = nextState.element; // DevTools 依赖这个字段名叫 "element"

  if (nextChildren === prevChildren) {
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  }
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}
```

`updateContainer`（`root.render(<App/>)` 最终调用的入口）把要渲染的 `element` 包成一个 Update 的 `payload`，塞进 `HostRoot` fiber 的更新队列，走的正是这条链路：

```typescript
// packages/react-reconciler/src/ReactFiberReconciler.ts（已读过的真实文件）
export function updateContainer(element, container, callback) {
  const current = container.current;
  const eventTime = requestEventTime();
  const lane = requestUpdateLane(current);

  const update = createUpdate(eventTime, lane);
  update.payload = { element }; // 👈 DevTools 依赖这个字段名叫 "element"

  const root = enqueueUpdate(current, update, lane);
  if (root !== null) {
    scheduleUpdateOnFiber(root, current, lane, eventTime);
  }
  return lane;
}
```

这条链路解释了一件容易被忽略的事：**`root.render(<App/>)` 本身也是走 Update 队列的**——不是一条特殊通道，第一次挂载和后续每一次重渲染，在源码层面走的是同一套"创建 Update → 塞队列 → 调度渲染"机制，只是第一次挂载时 `current.memoizedState.element` 是 `null`，`nextChildren !== prevChildren` 恒为真。

### 4. Lane 模型：ReactFiberLane.ts

仓库这份实现的位表和 React 18.3.1 官方源码逐位对齐（连同各条 `TransitionLane1~16`、`RetryLane1~5`、Hydration 变体都完整保留），本篇「二、6」~「二、10」节贴过的 `mergeLanes`/`includesSomeLane`/`isSubsetOfLanes`/`getHighestPriorityLane`/`getNextLanes`/`markStarvedLanesAsExpired`/`computeExpirationTime`，都是这个文件里的真实代码，逐行核对可以确认与官方语义一致。

有一处实现细节值得单独指出——`pickArbitraryLaneIndex`，用来把一个 lane 转换成它在 `eventTimes`/`expirationTimes` 数组里的下标：

```typescript
// packages/react-reconciler/src/ReactFiberLane.ts
function pickArbitraryLaneIndex(lanes: Lanes): number {
  return 31 - Math.clz32(lanes);
}
```

`Math.clz32` 返回一个 32 位整数从最高位开始数、有多少个连续的 0（"count leading zeros"）。假设 `lanes = 0b00010000`（`DefaultLane`，第 4 位是 1），`Math.clz32(lanes)` 会返回 `27`（32 位里前 27 位都是 0），`31 - 27 = 4`——正好是这一位的下标。这是"找出最高设置位的下标"的另一种常见位运算技巧，和「二、9」节的 `lanes & -lanes`（找**最低**设置位）刚好是相对的两种操作，都在这份 Lane 实现里被用到，服务于不同的场景（`getHighestPriorityLane` 找优先级，`pickArbitraryLaneIndex` 找数组下标）。

### 5. 调度链路接入：ReactFiberWorkLoop.ts

`scheduleUpdateOnFiber`/`ensureRootIsScheduled` 这两个函数是本地仓库里"批处理为什么只调度一次"（「二、5」节）的真实实现：

```typescript
// packages/react-reconciler/src/ReactFiberWorkLoop.ts（已读过的真实文件）
export function scheduleUpdateOnFiber(
  root: FiberRootNode,
  _fiber: FiberNode,
  lane: Lane,
  eventTime: number,
): void {
  markRootUpdated(root, lane, eventTime);
  ensureRootIsScheduled(root, eventTime);
}

function ensureRootIsScheduled(root: FiberRootNode, currentTime: number): void {
  const existingCallbackNode = root.callbackNode;
  markStarvedLanesAsExpired(root, currentTime); // 每次调度前先做一次饥饿检测

  const nextLanes = getNextLanes(root, root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes);
  if (nextLanes === NoLanes) {
    if (existingCallbackNode !== null) cancelCallback(existingCallbackNode);
    root.callbackNode = null;
    root.callbackPriority = NoLane;
    return;
  }

  const newCallbackPriority = getHighestPriorityLane(nextLanes);
  const existingCallbackPriority = root.callbackPriority;
  if (existingCallbackPriority === newCallbackPriority) {
    return; // 👈 优先级没变，直接复用现有任务——这就是三次 setState 只调度一次的源码依据
  }
  // ... 取消旧任务，按新优先级调度（SyncLane 走同步队列，其余交给 scheduler 的 scheduleCallback）
}
```

`markStarvedLanesAsExpired` 在这里的调用位置也值得注意——**每次尝试调度前都会先跑一次饥饿检测**，这保证了"低优先级更新被高优先级持续插队"的场景下，饿死检测不需要一个独立的定时器，而是搭在正常的调度流程上，每次有新更新进来时顺带检查一遍。

### 6. 验证方式：复用第01篇的调试环境

这一节没有新增代码，因此验证方式不是"跑一个新 demo"，而是复用第01篇搭好的 `fixtures/` 处方单调试环境，在已经跑通的两个文件上打断点单步验证本篇讲的结论：

```bash
cd D:\github\react-source
pnpm dev   # 沿用第01篇的 vite 调试环境，http://localhost:5173
```

在 `ReactFiberClassUpdateQueue.ts` 的 `processUpdateQueue` 函数入口打断点，在 `fixtures/` 的示例组件里连续触发三次状态更新（可以临时改造 `fixtures/main.tsx` 加一个按钮，`onClick` 里连续调用三次更新触发函数），单步走一遍观察：

1. 断点只会命中**一次**（对应「二、5」节"只调度了一次"的结论），而不是三次
2. 进入函数后，在 `firstBaseUpdate` 这条链表上打监视表达式，能看到链表上确实挂了三个 Update 节点
3. 在 `ReactFiberLane.ts` 的 `getHighestPriorityLane` 上打条件断点，观察 `lanes` 参数的实际二进制值，验证「二、9」节讲的位运算过程

这正是第01篇「一、3」节教的调试方法学在这两个文件上的具体应用——调试对象从"整条渲染主链路"聚焦到了"Update 队列如何被处理"这一个更窄的切面。

> 💬 **面试官**：这份手写实现里 Update/Lane 这部分和真实 React 18 源码的差距在哪？
>
> ✅ **标准答案**：Class/HostRoot 的 UpdateQueue 结构（环形链表、baseState、跳过重放逻辑）、完整的 31 位 Lane 模型（常量表、`mergeLanes`/`getNextLanes`/`markStarvedLanesAsExpired` 等），以及并发更新的延迟入队模型（`ReactFiberConcurrentUpdates.ts`），都已经和官方源码逐位、逐函数对齐，是可以直接拿来断点调试验证的真实实现。当前的边界是：Hook 层（`mountState`/`updateReducer`/Dispatcher 切换机制）已经在 `ReactFiberHooks.ts` 里落地跑通，但本篇不逐行拆解它的实现细节——留给第 06 篇 Hooks 篇结合渲染阶段的完整上下文专门展开。
>
> 🎁 **加分答案**：值得注意的是本项目"补齐延迟入队模型"的时机——不是先写 Hooks、再补这一层，而是把 `markUpdateLaneFromFiberToRoot` 从 `ReactFiberClassUpdateQueue.ts` 整体搬到新建的 `ReactFiberConcurrentUpdates.ts`，让 Class 和 Hook 两条更新路径**从一开始就共用同一套延迟入队机制**，而不是先给 Hook 单独接一套、之后再考虑要不要迁移 Class。这个顺序本身就是一个好的架构判断：延迟入队解决的是"并发渲染期间更新如何安全落到 Fiber 树"这个通用问题，与"更新来自 Class 还是 Hook"无关，提前统一到一层能避免后续再做一次迁移。

---

## 五、手写实现源码地址

- GitHub：https://github.com/lotosv2010/react-source
- 本地路径：`D:\github\react-source`（详细目录结构与开发约定见仓库 `README.md`/`CLAUDE.md`/`docs/roadmap.md`）

---

## 六、参考资料

- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com

---

## 💡 面试核心问

- **为什么同一个事件处理函数里连续三次 `setState` 只会触发一次渲染？是"合并了三次渲染"还是"本来就只调度了一次"？**
- **Class 组件的 `UpdateQueue` 和 Hook 的更新队列是同一套实现吗？两者的相似之处和本质区别是什么？**
- **为什么被跳过（bailout）的 Update 不能直接丢弃，必须留在 `baseQueue` 里？**
- **Lane 模型相比 React 16 的 `expirationTime` 数值模型有什么优势？为什么用二进制位运算表示优先级？**
- **为什么 Lane 最多只能有 31 条而不是 32 条？这个限制的根源是什么？**
- **`lanes & -lanes` 这个位运算是在做什么？为什么能取出最高优先级的 lane？**
- **如果 Lane 模型没有"过期"兜底机制，会出现什么现象？React 是怎么解决优先级饿死问题的？**

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话核心 | 面试考察频率 |
|--------|-----------|-------------|
| Update 心智模型 | 状态不是立即修改，是排队等待渲染阶段统一处理 | ⭐⭐⭐⭐⭐ |
| Class UpdateQueue | `shared.pending` 环形链表 + `baseState` 兜底 + `processUpdateQueue` 遍历执行 | ⭐⭐⭐⭐⭐ |
| Hook 更新队列 | 结构与 Class 高度相似但独立实现，分别挂在 Fiber 和 Hook 节点上 | ⭐⭐⭐⭐ |
| 跳过的 Update 不能丢弃 | 必须克隆进新 baseQueue，等高优先级渲染后重放，否则更新丢失 | ⭐⭐⭐⭐ |
| 批处理的本质 | 不是合并渲染，而是"只调度了一次"，多个 Update 在这一次里被一起处理 | ⭐⭐⭐⭐⭐ |
| Lane 模型 | 31 位二进制位表达优先级，位运算支持多优先级共存与子集判断 | ⭐⭐⭐⭐⭐ |
| 31 位而非 32 位 | JS 位运算按 32 位有符号整数处理，最高位是符号位，只能安全用低 31 位 | ⭐⭐⭐⭐ |
| 位运算 vs 数值优先级 | `\|` 表达并集（多优先级共存），`&` 表达交集/子集判断，单一数值做不到 | ⭐⭐⭐⭐⭐ |
| `lanes & -lanes` | 提取最低设置位，对应"数值越小优先级越高"约定下的最高优先级 | ⭐⭐⭐⭐⭐ |
| 优先级饿死兜底 | `markStarvedLanesAsExpired` 给每条 lane 算过期时间，过期强制同步处理 | ⭐⭐⭐⭐ |
| Vue3 对比 | `nextTick` 微任务合并无优先级区分，React 额外叠加 Lane 排队层 | ⭐⭐⭐ |

---

## 📝 思考题

**留个问题**：本篇「二、4」节讲到，一旦某条 Update 被跳过，它之后所有优先级足够的 Update 也要被克隆进新的 `baseQueue`（lane 置为 `NoLane`）。如果这次渲染完全没有任何 Update 被跳过（所有 Update 优先级都够），`queue.baseState` 最终会等于什么？结合 `processUpdateQueue` 里 `newLastBaseUpdate === null` 这个分支想一想。

答案留在评论区，或者在后续 Hooks 篇涉及类似逻辑时会再次提到。

---

> 🔖 这是「React 18 全家桶深度拆解系列」第 2 篇。上一篇：《React 18 架构全景：从 Stack 到 Fiber 的演进与源码调试环境搭建（面试收藏级）》；下一篇预告：《React 18 渲染原理...》
