# React 18 全家桶系列公众号文章大纲

> 所属系列：React 18 深度拆解
> 写作原则：基本使用 → 原理 → 源码解析（重点代码，来源 GitHub 仓库）→ 生产级最佳实践 → 手写实现 → GitHub → 参考
> 目标读者：5-10 年前端经验、有 Vue 全家桶背景、正在转型或补齐 React 技术栈、备战面试或寻求晋升为 AI 应用工程师的工程师
> 与 Vue 3 系列关系：结构对称，涉及响应式/渲染/组件通信等可对照的知识点会显式标注「对比 Vue 3」

---

## 系列定位

**「React 18 全家桶深度拆解」系列**

- 篇数：16 篇（React 18 核心原理 7 篇 + 生态与工程化 9 篇）
- 核心主线：设计思想与架构 → Hooks 使用与设计哲学 → Fiber 与协调原理 → Hooks 源码 → 调度器与并发特性 → 事件系统 → Context → React Router → Redux → MobX → dva → umi → SSR/RSC → 性能优化 → ahooks → Monorepo 通用后台管理系统
- 内容结构：延续 Vue 3 系列的七段式（基本使用 → 原理 → 源码解析 → 生产级最佳实践 → 手写实现 → GitHub → 参考）
- 特色：每篇 3-5 个「面试官会问」；示例沿用医疗场景命名（药品/处方/患者）；涉及可与 Vue 3 对照的知识点（响应式 vs 状态更新、组件渲染、路由、状态管理）显式标注「对比 Vue 3」，降低有 Vue 背景读者的迁移成本
- 不设独立 TypeScript 篇：类型系统内容按场景拆分到 Hooks 篇（自定义 Hook 类型设计）、Redux 篇（RTK 类型推导）、Router 篇（loader/action 类型）、后台管理系统篇（类型消费实战）

---

## 文章规划总览

| 编号 | 标题 | 核心主题 | 状态 |
|------|------|----------|------|
| 01 | React 18 设计思想与整体架构：从 Stack Reconciler 到 Fiber，并发模式为什么这样设计 | 架构全景 | ⬜ 待写 |
| 02 | React 18 Hooks 基本使用与设计哲学：useState/useEffect 等核心 Hook 与调用规则 | Hooks 使用 | ⬜ 待写 |
| 03 | React 18 Fiber 架构与协调原理源码解析：Fiber 树、双缓存、Diff 算法 | 渲染/协调原理 | ⬜ 待写 |
| 04 | React 18 Hooks 源码解析：dispatcher、Hook 链表、useState/useEffect/useReducer 实现 | Hooks 源码 | ⬜ 待写 |
| 05 | React 18 调度器与并发特性源码解析：Scheduler 时间切片、Lane 优先级模型、Suspense | 并发原理 | ⬜ 待写 |
| 06 | React 18 事件系统与批处理原理：合成事件、事件委托、Automatic Batching | 事件系统 | ⬜ 待写 |
| 07 | React 18 Context 原理与手写实现：Provider/Consumer、多层 Context 性能陷阱 | Context | ⬜ 待写 |
| 08 | React Router 6/7 原理与实战：Data Router、loader/action、嵌套与权限路由 | 前端路由 | ⬜ 待写 |
| 09 | Redux 原理与手写实现 + Redux Toolkit 生产实践 | 状态管理 | ⬜ 待写 |
| 10 | MobX 原理与响应式对比实战：Proxy 响应式设计与 Vue 3 对照 | 状态管理 | ⬜ 待写 |
| 11 | dva.js 原理与实战：redux + redux-saga 整合，model/effects/reducers 设计 | 状态管理 | ⬜ 待写 |
| 12 | umi 框架原理与工程化实战：约定式路由、插件化架构、微前端整合 | 框架工程化 | ⬜ 待写 |
| 13 | React 18 SSR 与 RSC 原理与实战：renderToString 到流式渲染 renderToPipeableStream，Server Components 边界与序列化，手写极简 SSR | 服务端渲染 | ⬜ 待写 |
| 14 | React 18 性能优化全攻略：memo 系列、虚拟列表、代码分割、并发特性调优 | 性能 | ⬜ 待写 |
| 15 | ahooks 源码解析与自定义 Hook 设计模式 | Hooks 工程化 | ⬜ 待写 |
| 16 | Turborepo + pnpm workspace + Vite + React 18 通用后台管理系统从零搭建 | 工程化 | ⬜ 待写 |

---

## 各篇详细大纲

### 第 01 篇：React 18 设计思想与整体架构

**副标题**：从 Stack Reconciler 到 Fiber，并发模式为什么这样设计？

#### 一、基本使用
- `ReactDOM.render(<App />, container)` → `createRoot(container).render(<App />)`：Legacy 模式与 Concurrent 模式的入口切换
- `createRoot` 后自动批处理（automatic batching）：不论在事件回调、Promise、setTimeout 中调用 `setState`，都会被合并为一次渲染，不再局限于 React 事件处理函数内
- `<StrictMode>` 在开发环境下对函数组件、`useState` initializer、`useReducer` 等故意执行两次，用来暴露不纯的渲染逻辑
- `startTransition(() => setFilterKeyword(value))`：把非紧急更新标记为可中断的低优先级任务
- `React.lazy(() => import('./PrescriptionForm'))` + `<Suspense fallback={...}>`：按路由/模块拆分代码，配合并发渲染实现"渲染挂起不阻塞已完成部分"

#### 二、原理
- Stack Reconciler（React 15 及之前）用递归方式深度遍历组件树，JS 调用栈一旦开始无法中途让出主线程；医疗场景中"患者列表 + 全局检索"一旦触发大范围重渲染，会造成输入卡顿甚至掉帧
- Fiber 把组件树从"递归调用栈"改造成"链表结构"（`return / child / sibling`），遍历逻辑从递归变成循环（work loop），使渲染过程可以在任意 Fiber 节点处暂停、把控制权交还浏览器、之后再恢复
- Lane 模型：用 31 位二进制位表示更新优先级（`SyncLane / InputContinuousLane / DefaultLane / TransitionLane / IdleLane` 等），相比 React 16 的 `expirationTime` 数值模型，位运算可以做"多个优先级合并成一批处理"这种表达式运算（`|` 合并、`&` 判断），精度和灵活性都更高
- 并发渲染：`createRoot` 开启后，渲染任务通过 `scheduler` 包做时间切片（默认 5ms 一帧），每帧渲染若干 Fiber 后检查 `shouldYieldToHost()`，让出主线程给浏览器处理绘制、用户输入等高优先级任务
- 包职责划分：`react` 只定义 Component/Hooks 等 API 和 JSX 运行时，不涉及任何渲染逻辑；`react-dom` 是浏览器宿主环境的渲染器（Host Config 实现）；`react-reconciler` 是平台无关的协调算法核心，被 `react-dom`、`react-native`、`react-test-renderer` 共同依赖；`scheduler` 是独立的任务调度器，只关心优先级和时间切片，不知道 Fiber 是什么
- 对比 Vue 3：`createApp` 对应的是"编译时优化 + 运行时最小化 diff"路线——模板编译阶段通过 PatchFlag 标记动态节点，运行时 Block Tree 只对比这些标记节点；`createRoot` 对应的是"运行时通用调度"路线——JSX 完全动态、无法在编译期确定哪些节点会变化，只能靠 Fiber 链表 + Lane 优先级在运行时做启发式的可中断调度。前者用编译期信息换运行时性能，后者用运行时调度能力换 JSX 的完全动态自由度，是两种不同的性能优化取舍

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. `createRoot` 入口：`packages/react-dom/src/client/ReactDOMRoot.js` — 创建 `FiberRootNode` 与 `HostRootFiber`，返回带 `render/unmount` 方法的 root 对象
2. Root 节点结构：`packages/react-reconciler/src/ReactFiberRoot.js` — `FiberRootNode` 上挂载 `pendingLanes`、`current` 指针等调度所需状态
3. 时间切片调度循环：`packages/scheduler/src/forks/Scheduler.js` — `shouldYieldToHost()` 判断当前帧是否用完时间片
4. Lane 优先级模型：`packages/react-reconciler/src/ReactFiberLane.js` — Lane 常量定义与 `mergeLanes`、`getHighestPriorityLane` 等位运算函数
5. 渲染入口分发：`packages/react-reconciler/src/ReactFiberWorkLoop.js` — `performSyncWorkOnRoot`（同步不可中断）与 `performConcurrentWorkOnRoot`（并发可中断）两条渲染路径

#### 四、生产级最佳实践
- HIS 系统首页存在大量指标卡片 + 患者列表时，用 `createRoot` 开启并发特性，避免全局检索输入时主线程被长时间占用
- 用 `startTransition` 包裹处方列表的筛选/排序逻辑，保证筛选输入框始终响应，列表更新可以被打断
- 按"问诊模块 / 处方模块 / 检验报告模块"用 `React.lazy` 做路由级代码分割，减小 HIS 系统首屏包体积
- 用 `StrictMode` 在开发环境暴露医嘱录入表单组件的副作用不纯问题（重复调用副作用后发现脏读/重复请求）
- 用 `useSyncExternalStore` 订阅医生排班这类外部数据源，避免手写 `useEffect + useState` 组合带来的并发渲染撕裂（tearing）问题

#### 五、手写实现（可独立跑通）
用 Node.js 脚本对比"递归遍历"与"链表遍历"两种方式处理同一棵"处方单渲染树"：递归版模拟 Stack Reconciler，一旦开始无法中断；链表版把节点组织成 `child/sibling/return` 结构，用 `setTimeout` 或 `MessageChannel` 模拟时间切片，每处理若干节点后主动让出执行权，通过日志打印证明遍历可以被打断和恢复。不依赖浏览器环境，纯 JS 即可跑通。

#### 六、手写实现源码 GitHub 地址
（占位，写作时填入实际仓库链接）

#### 七、参考
- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com

**面试核心问**：
- 为什么 React 15 要重构成 Fiber？Fiber 具体解决了什么问题？
- Fiber 链表结构和可中断渲染之间是什么关系？
- Lane 模型相比 React 16 的 `expirationTime` 模型有什么优势？
- concurrent 渲染和 legacy 渲染在调用方式和调度行为上分别有什么核心区别？
- `react-reconciler` 为什么要独立成一个不依赖具体渲染平台的包？

---
### 第 02 篇：React 18 Hooks 基本使用与设计哲学

**副标题**：useState/useEffect 等核心 Hook 用法，以及"只能在顶层调用"规则背后的设计哲学

#### 一、基本使用
- `useState`：基本用法与函数式更新 `setCount(c => c + 1)`，区分"直接传值"与"传函数"两种更新方式的适用场景
- `useEffect`：依赖数组的三种写法（无依赖数组每次渲染都执行、空数组只在挂载执行一次、有依赖数组按依赖变化执行）与清理函数时机，举例：加载患者详情 / 订阅处方状态变化
- `useLayoutEffect`：与 `useEffect` 用法一致但执行时机不同，典型场景是处方单弹窗需要先测量 DOM 再定位，避免闪烁
- `useMemo` / `useCallback`：避免子组件重复渲染，例如给药品列表行组件做 `memo` 化时配合 `useCallback` 固定事件回调引用
- `useRef`：存储 DOM 引用（聚焦处方单输入框）与存储可变值（不触发渲染的计时器 ID）两种典型用途
- `useContext`：跨层级传递当前登录医生信息，避免逐层传递 props
- `useReducer`：管理复杂的问诊表单状态（多字段、多种更新动作）
- 自定义 Hook 设计规范：`usePatientRecord`、`usePrescriptionForm` 的参数与返回值类型设计，遵循"输入配置项、输出状态+操作方法"的约定
- `forwardRef` + `useImperativeHandle`：父组件需要命令式调用子组件方法时的标准写法，例如父组件调用"处方单表单"子组件暴露的 `validate()`/`reset()` 方法，而不是把校验逻辑提升到父组件
- `createPortal`：将"用药提醒"弹窗、Tooltip 等 DOM 结构渲染到 `document.body` 下的独立节点，脱离父组件的 CSS `overflow`/`z-index` 层级限制，但事件冒泡仍沿 React 组件树（而非实际 DOM 树）传播
- `useId`：生成跨服务端/客户端渲染一致的唯一 ID，典型场景是表单 `label` 的 `htmlFor` 关联（如问诊表单的多个字段），避免手写自增计数器在 SSR 场景下服务端和客户端计数不一致导致 hydration 报错
- Error Boundary（错误边界）：类组件通过 `static getDerivedStateFromError` + `componentDidCatch` 捕获子树渲染期间的异常并展示兜底 UI，例如"处方单渲染异常不能导致整个医生工作站白屏"；目前无 Hooks 等价实现，需要保留一个类组件作为错误边界

#### 二、原理
- Hooks 本质是"用函数组件 + 闭包"复用状态逻辑，替代 Class 组件中 `this` 绑定混乱、生命周期方法（`componentDidMount/Update/Unmount`）里拼接不相关逻辑的问题——一个 `useEffect` 就能把"订阅 + 清理"这类相关逻辑聚合在一起
- 调用顺序依赖模型：为什么只能在组件顶层调用 Hook——Hook 的状态是按"调用顺序"对应存储位置的（具体链表结构留给第 04 篇源码解析），条件语句或循环会导致某次渲染多调用或少调用某个 Hook，从而让状态和 Hook 调用错位
- 自定义 Hook 不是新语法，只是"调用其他 Hook 的普通函数"，多个组件使用同一个自定义 Hook 时，各自拥有独立的闭包和状态实例，彼此不共享状态——这一点常被误解为"像 Vue provide/inject 一样共享"
- 对比 Vue 3 Composable：Vue 的 `ref/reactive` 返回响应式对象，被模板渲染函数在执行期间收集为依赖，这套依赖收集天然不依赖调用顺序，因此 Composable 可以写在 `if/for` 里；React Hooks 用调用顺序对应状态存储，换来的是不需要建立一套响应式依赖收集系统、实现更简单，代价是牺牲了控制流书写上的自由度
- `useEffect` 与 `useLayoutEffect` 时机差异的设计意图：`useEffect` 的副作用在浏览器完成绘制后异步调度执行，不阻塞视觉更新；`useLayoutEffect` 在 DOM 变更后、浏览器绘制前同步执行，用于必须同步读取/修改布局的场景，代价是会阻塞绘制
- `useImperativeHandle` 的本质：配合 `forwardRef` 自定义"父组件通过 ref 拿到的实例到底暴露哪些方法/字段"，而不是把子组件内部的真实 DOM 节点或组件实例整个暴露出去——这是一种"最小暴露面"的封装思路，子组件内部实现细节（如具体用了哪个输入框 DOM 结构）可以自由重构，只要对外暴露的方法签名不变，父组件调用方就不受影响
- `createPortal` 为什么事件冒泡仍按 React 树而非 DOM 树传播：React 的合成事件系统是基于 Fiber 树结构做事件收集（详见第 06 篇 `accumulateSinglePhaseListeners`），`createPortal` 只改变了"渲染输出的真实 DOM 挂载位置"，并没有改变对应 Fiber 节点在 Fiber 树里的 `return` 指针关系，因此从"逻辑组件层级"的角度看，Portal 渲染的内容仍然是原组件树的子节点，事件冒泡走的是这条 Fiber 链路而不是真实 DOM 的父子关系
- `useId` 解决的具体问题：SSR 场景下，服务端渲染一棵组件树时会给每个调用 `useId` 的组件按渲染顺序分配一个基于"树中位置"编码的确定性字符串（不是简单自增数字），客户端 hydrate 时用同样的树遍历顺序生成完全相同的 ID；这保证了同一个组件在服务端和客户端生成的 ID 严格一致，避免了开发者手写 `let count = 0; count++` 这类自增计数器在服务端和客户端分别独立执行、各自计数、导致同一个组件两端 ID 不一致引发 hydration mismatch 警告的问题
- Error Boundary 的捕获边界：`componentDidCatch`/`getDerivedStateFromError` 只能捕获"渲染阶段、生命周期方法、以及构造函数中"抛出的异常，无法捕获事件处理函数内部的异常（事件处理函数里的异常需要普通 `try/catch` 自行处理）、异步代码（`setTimeout`/`Promise`）中的异常、以及错误边界组件自身抛出的异常；目前 React 官方没有提供 Hooks 形式的错误边界能力，本质原因是错误边界依赖 Fiber 树"某个子树渲染失败后，向上找到最近一个具备错误捕获能力的祖先节点降级渲染"这套机制，与 class 组件实例的生命周期方法绑定更紧密，社区通常用 `react-error-boundary` 库封装这层复杂度

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. Hooks 对外 API：`packages/react/src/ReactHooks.js` — `useState`、`useEffect` 等实际是调用 `resolveDispatcher().useState(...)`，把调用转发给当前生效的 dispatcher
2. Dispatcher 全局引用：`packages/react/src/ReactCurrentDispatcher.js` — 一个全局可变的容器，持有"当前应该用哪套 Hook 实现"的引用
3. Dispatcher 具体实现（详细展开见第 04 篇）：`packages/react-reconciler/src/ReactFiberHooks.js` — `HooksDispatcherOnMount` 与 `HooksDispatcherOnUpdate` 两套并存的实现
4. `useId` 的树位置编码：`packages/react-reconciler/src/ReactFiberHooks.js` — `mountId`/`updateId` 中基于 Fiber 在树中路径生成确定性字符串的实现
5. 错误边界的捕获与降级渲染：`packages/react-reconciler/src/ReactFiberThrow.js` — `throwException` 中向上查找最近的错误边界 Fiber 并标记降级渲染

#### 四、生产级最佳实践
- 复杂的处方表单用 `useReducer` 代替多个零散 `useState`，避免多字段状态之间难以保证一致性
- 把患者数据请求 + loading + error 状态封装进 `usePatientRecord` 自定义 Hook，供病历页、问诊页复用
- 给传入药品列表虚拟滚动子组件的事件回调用 `useCallback` 包裹，配合 `React.memo` 减少不必要的子组件重渲染
- 在 `useEffect` 清理函数中取消医嘱轮询请求，避免组件卸载后请求返回触发"竞态更新"或内存泄漏警告
- 避免在 `useMemo` 里做发请求等副作用操作，`useMemo` 只应做纯计算结果缓存，副作用一律放进 `useEffect`
- 在医生工作站的路由级布局中用一个 class 组件封装通用 `ErrorBoundary`，包裹各个业务模块（处方模块/检验报告模块），任意一个模块渲染异常只降级展示该模块的错误提示，不影响其他模块正常使用
- "处方单表单"组件用 `forwardRef` + `useImperativeHandle` 只暴露 `validate()`/`getValues()` 两个方法给父组件，不直接把内部 DOM ref 暴露出去，保持子组件内部实现可以自由重构
- 问诊表单的多个字段用 `useId` 生成 `label`/`input` 关联 ID，天然兼容未来可能引入的 SSR 渲染而不需要额外处理

#### 五、手写实现（可独立跑通）
用原生 JS（不依赖 React）实现一个 `createHookedComponent` 函数：内部维护一个 `hooks` 数组和游标 `cursor`，暴露简化版 `useState`/`useEffect` API。场景是"处方单药品清单"组件，连续渲染两次验证状态正确保留；再故意把 `useState` 放进 `if` 条件语句中重新渲染一次，制造状态错位的 bug，用日志对比验证"顶层调用"规则存在的必要性。在此基础上补充一个极简版 `ErrorBoundary` 类组件，故意让子组件渲染时抛出异常，验证错误边界能捕获并展示兜底 UI 而不影响页面其他部分；再手写一个基于树路径编码的极简 `useId` 实现，验证同一组件树按相同遍历顺序两次"渲染"（模拟服务端一次、客户端一次）能生成完全相同的 ID 序列。整个 Demo 可在 Node.js 环境直接运行。

#### 六、手写实现源码 GitHub 地址
（占位，写作时填入实际仓库链接）

#### 七、参考
- https://zh-hans.react.dev/
- https://ahooks.js.org/
- https://github.com/bvaughn/react-error-boundary

**面试核心问**：
- `useEffect` 和 `useLayoutEffect` 的执行时机差异是什么？分别举一个必须用后者的场景
- 为什么 Hooks 不能写在条件语句或循环里？
- 多个组件使用同一个自定义 Hook，它们之间会共享状态吗？为什么
- `useMemo` 和 `useCallback` 的本质区别是什么，分别在什么场景该用
- `setState` 的函数式更新（`setCount(c => c+1)`）和直接传值更新有什么区别，什么场景必须用前者
- 错误边界能捕获哪些类型的异常，不能捕获哪些？为什么 React 至今没有提供 Hooks 形式的错误边界？
- `useImperativeHandle` 解决了什么问题？为什么不直接用 `forwardRef` 把整个 DOM 节点暴露给父组件？
- `useId` 具体解决了什么场景下的问题？如果不用它，手写自增计数器生成 ID 会有什么隐患？

---

### 第 03 篇：React 18 Fiber 架构与协调原理源码解析

**副标题**：Fiber 节点结构、双缓存机制、render/commit 两阶段与 Diff 算法源码精读

#### 一、基本使用
- `key` 的正确使用对 diff 结果的直接影响：复现"患者列表用数组 index 作 key"在增删排序时导致展开状态/输入框内容错位的 bug
- React DevTools Profiler 里观察 Fiber 树和各阶段耗时：定位"患者列表"渲染时 commit 阶段的真实耗时占比
- `StrictMode` 下 effect 被执行两次的现象，和 Fiber `alternate` 树切换、mount/unmount 模拟之间的关系
- `Suspense` 边界挂起时，对应子树的 Fiber 处于"挂起"状态，在 DevTools 中的可视化表现

#### 二、原理
- Fiber 节点数据结构逐字段讲解：`type`（组件类型）、`key`、`pendingProps`/`memoizedProps`（待处理/已生效的 props）、`stateNode`（对应的真实 DOM 或类组件实例）、`return`/`child`/`sibling`（树形指针）、`index`（在兄弟节点中的位置）、`alternate`（指向另一棵树中对应节点）、`flags`（当前节点副作用标记）、`lanes`（优先级）
- 双缓存机制：`current` 树表示当前屏幕上显示的内容，`workInProgress` 树是内存中正在构建的新树，两者通过 `alternate` 互相指向；commit 阶段完成后只需要把 root 的 `current` 指针整体切换到新树，避免用户在渲染过程中看到 DOM 处于中间态
- render 阶段：`beginWork` 自顶向下遍历，对每个 Fiber 判断复用还是新建，并对其子节点做 diff；`completeWork` 自底向上，收集子树的副作用标记、生成 DOM 变更所需的 effect 链表。这一阶段只在内存中操作 Fiber 对象，没有真实 DOM 变更，因此可以被打断、丢弃重来
- commit 阶段：分为 `beforeMutation`（读取 DOM 状态，如 `getSnapshotBeforeUpdate`）、`mutation`（真正的 DOM 增删改）、`layout`（同步执行 `useLayoutEffect`、更新 ref）三个子阶段，整体同步执行不可中断——因为此时已经在操作真实 DOM，如果中途让出主线程，用户会看到不完整的界面
- Diff 算法：单节点 diff 通过对比 `key` 和 `type` 决定是否可以复用旧 Fiber；多节点 diff（`reconcileChildrenArray`）分两轮遍历——第一轮按位置顺序比较处理更新，遇到 `key` 不匹配就跳出；第二轮处理剩余的插入/删除/移动，通过维护 `lastPlacedIndex` 判断某个可复用节点是否需要移动（如果它在旧数组中的位置小于 `lastPlacedIndex` 就标记为移动）
- 对比 Vue 3：React 的 diff 是运行时通用算法，对整棵子树逐层重新比较，不依赖任何编译期信息；Vue 3 通过模板编译阶段生成的 PatchFlag 标记出哪些节点是动态的（Block Tree），运行时只对比这些被标记的节点，直接跳过静态子树的比较。本质是"通用 diff 换取 JSX 完全动态自由度" vs "编译期确定性信息换取运行时定向 diff 性能"两条不同路线，Vue 的方案依赖模板可静态分析这个前提，React 的方案要兼顾 JSX 中任意 JS 表达式带来的完全动态性

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. render 阶段入口：`packages/react-reconciler/src/ReactFiberBeginWork.js` — `beginWork` 主函数按 `fiber.tag` 分发到 `updateFunctionComponent`、`updateHostComponent` 等具体处理函数
2. 多节点 diff 核心：`packages/react-reconciler/src/ReactChildFiber.js` — `reconcileChildrenArray`，两轮遍历 + `lastPlacedIndex` 判断移动的完整实现
3. 副作用收集：`packages/react-reconciler/src/ReactFiberCompleteWork.js` — `completeWork` 自底向上冒泡收集 `subtreeFlags`，构建 effect 链表
4. 工作循环驱动：`packages/react-reconciler/src/ReactFiberWorkLoop.js` — `workLoopConcurrent`/`workLoopSync`，通过 `performUnitOfWork` 依次驱动 `beginWork` 和 `completeWork`
5. 真实 DOM 操作：`packages/react-reconciler/src/ReactFiberCommitWork.js` — `commitMutationEffects` 遍历 effect 链表执行真实的 DOM 增删改

#### 四、生产级最佳实践
- 患者列表统一用稳定的患者 ID 作为 `key`，禁止用数组 `index`，避免增删排序时导致展开状态、输入框内容错位
- 处方单动态子项配合 `React.memo` 和稳定 `key`，缩小无关更新触发的 diff 范围
- 避免渲染函数里根据条件返回不同的标签类型（如同一位置有时渲染 `div` 有时渲染 `section`），`type` 变化会导致整棵子树被销毁重建而不是复用
- 检验报告历史这类大列表用虚拟滚动，减少同时存在的 Fiber 节点数量，降低 diff 和 commit 成本
- 用 DevTools Profiler 定位"药品搜索"页面每次输入触发的 commit 耗时，针对性做 `memo`/拆分组件优化

#### 五、手写实现（可独立跑通）
参考 Didact（`pomb.us/build-your-own-react`）思路，用纯 JS + DOM API 手写一个极简 Fiber 协调器，场景是"处方单药品项"的增删渲染：实现 `createElement` 构造虚拟节点；实现带 `workLoop` 的渲染循环，用 `MessageChannel` 模拟时间切片，处理完一个 Fiber 后检查是否该让出主线程；实现 `beginWork`（diff 子节点并打上 flags）和 `commitRoot`（遍历 effect 链表执行真实 DOM 增删改）。用一个"添加/删除处方药品项"的交互按钮跑通最小的 diff + commit 闭环，可在浏览器直接运行观察效果。

#### 六、手写实现源码 GitHub 地址
（占位，写作时填入实际仓库链接）

#### 七、参考
- https://react.iamkasong.com
- https://jonny-wei.github.io/blog/react/
- https://pomb.us/build-your-own-react/

**面试核心问**：
- render 阶段为什么可以被中断，commit 阶段为什么不能？
- Fiber 双缓存机制具体解决了什么问题？如果没有双缓存会出现什么现象？
- 多节点 diff 算法为什么要分两轮遍历，一轮为什么不够？
- `key` 在 diff 算法中到底起什么作用，用 `index` 作 `key` 在什么场景下会出问题？
- effect 链表是怎么在 `completeWork` 阶段收集起来的，收集顺序对 commit 阶段的执行顺序有什么影响？

---

### 第 04 篇：React 18 Hooks 源码解析

**副标题**：dispatcher 切换、Hook 链表与 useState/useEffect/useReducer 的底层实现

#### 一、基本使用
- 同一个函数组件在 mount 和 update 阶段行为不同的现象：`useState(() => computeExpensiveInitialState())` 的惰性初始化函数只在首次渲染执行一次，之后每次渲染都不会重新调用
- `useReducer` 返回的 `dispatch` 引用永远保持稳定（identity 不变），不需要用 `useCallback` 包裹就能安全放进依赖数组
- 开发环境 `StrictMode` 下 effect 被"挂载 → 卸载 → 再挂载"执行两次的现象，通过 Hook 链表和 Fiber 树的 mount/unmount 模拟机制来解释
- 连续多次调用 `setState` 在同一个事件处理函数中会被合并成一次渲染的现象（批处理），与后面讲的更新队列机制直接相关

#### 二、原理
- dispatcher 机制：`ReactCurrentDispatcher.current` 在渲染函数组件前，由 `renderWithHooks` 根据是 mount 还是 update 阶段，切换指向 `HooksDispatcherOnMount` 或 `HooksDispatcherOnUpdate` 两套完全不同的函数实现；同一个 `useState()` 调用，在组件生命周期的不同阶段实际执行的是不同的底层函数
- Hook 链表：`fiber.memoizedState` 指向该 Fiber 上第一个 Hook 对象，每个 Hook 对象包含 `memoizedState`（当前状态值）、`baseState`、`queue`（更新队列）、`next`（指向下一个 Hook）等字段，多次 Hook 调用在同一个 Fiber 上串成一条单向链表——这正是"Hooks 调用顺序必须保持一致"规则的底层原因：update 阶段严格按照上一次渲染时链表的顺序，逐个取出对应的 Hook 节点，一旦调用顺序变化，某次调用取到的就是本该属于另一个 Hook 的状态节点，导致类型和数据错位
- `useState`/`useReducer` 实现：mount 阶段 `mountState`/`mountReducer` 创建 Hook 节点和 `queue`；update 阶段调用 `dispatch` 触发的 `dispatchSetState`/`dispatchReducerAction` 会把本次更新的 action 追加进 `queue.pending` 这个环形链表，同时给对应 Fiber 标记优先级 lane 并调度重新渲染；真正的状态计算发生在下一次渲染的 `updateReducer` 中，遍历 `pending` 队列依次执行 reducer 得出最终状态——这也解释了为什么同一事件处理函数里连续多次 `setState` 会被合并处理，而不是立即同步生效
- `useEffect`/`useLayoutEffect` 实现：mount/update 对应的 `mountEffect`/`updateEffect` 都会创建一个 Effect 对象，追加进 `fiber.updateQueue` 上的 effect 环形链表，区别只在于打的标记不同（`useLayoutEffect` 是 `HookLayout`，`useEffect` 是 `HookPassive`）；commit 阶段中，layout effect 在 `commitLayoutEffects` 里同步执行，passive effect（`useEffect`）在 `commitPassiveMountEffects` 中通过 `scheduler` 以正常优先级异步调度执行，不阻塞浏览器绘制——这就是二者执行时机差异在源码层面的真正来源

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. dispatcher 定义与状态实现：`packages/react-reconciler/src/ReactFiberHooks.js` — `HooksDispatcherOnMount`/`HooksDispatcherOnUpdate` 两套映射表，`mountState`/`updateState`、`mountEffect`/`updateEffect` 的具体实现
2. 更新触发与调度：`packages/react-reconciler/src/ReactFiberHooks.js` — `dispatchSetState`/`dispatchReducerAction`，负责把 action 入队并触发 `scheduleUpdateOnFiber`
3. dispatcher 切换时机：`packages/react-reconciler/src/ReactFiberWorkLoop.js` — `renderWithHooks` 在渲染函数组件前设置对应 dispatcher，渲染完成后重置当前 Hook 指针
4. effect 链表执行：`packages/react-reconciler/src/ReactFiberCommitWork.js` — `commitHookEffectListMount`/`commitHookEffectListUnmount`，遍历 effect 环形链表分别执行 create/destroy 回调

#### 四、生产级最佳实践
- 依赖数组遗漏医生 ID 导致 `useEffect` 闭包里拿到旧的医生数据（陈旧闭包 bug），根源是 Hook 链表中 `memoizedState` 是渲染那一刻的快照，闭包捕获的正是那次渲染的值
- 用 `useReducer` 管理复杂的处方审核状态机，避免多个 `useState` 之间难以保证的状态一致性问题
- 理解 `setState` 批处理机制后，避免写"`setState` 后立即读取最新 state"的代码，改用函数式更新或 `useEffect` 响应状态变化
- 自定义 Hook 中正确清理 `useEffect` 的订阅（如医嘱变更 WebSocket 订阅），避免组件反复挂载/卸载时 effect 链表残留导致内存泄漏

#### 五、手写实现（可独立跑通）
用纯 JS 手写一个极简 Hooks 系统：维护全局的 `hooks` 数组、游标 `cursor` 和 `isMount` 标记，实现 mount/update 两套 `useState`（返回 `[state, dispatch]`，`dispatch` 修改数组里对应 Hook 的状态并触发重新渲染）与 `useEffect`（比较依赖数组是否变化决定是否执行 effect 及其清理函数）。场景是"处方单药品数量加减"，数量变化时同步打印日志模拟 effect，跑通 mount → 多轮 update 的渲染循环，验证 Hook 链表顺序始终能对应回正确的状态，可在 Node.js 环境直接运行。

#### 六、手写实现源码 GitHub 地址
（占位，写作时填入实际仓库链接）

#### 七、参考
- https://react.iamkasong.com
- https://jonny-wei.github.io/blog/react/

**面试核心问**：
- `useState` 的 `setState` 为什么可能不会立即更新？批处理机制具体是怎么工作的？
- Hook 链表结构和"调用顺序必须一致"这条规则具体是怎么关联起来的？
- mount 阶段和 update 阶段的 dispatcher 有什么不同，为什么要拆成两套实现而不是一套通用逻辑？
- `useEffect` 的 cleanup 函数是在什么时机执行的，和下一次 effect 执行之间的顺序关系是什么？
- 为什么 `useReducer` 返回的 `dispatch` 引用天生稳定，不需要用 `useCallback` 包裹？

---
### 第 05 篇：React 18 调度器与并发特性源码解析

**副标题**：MessageChannel 时间切片、31 位 Lane 位运算、startTransition 如何让"慢更新"不阻塞"快交互"

#### 一、基本使用
- `useTransition`：将非紧急更新标记为可中断的过渡态，例如医生工作站切换"患者列表"筛选条件时，输入框响应保持流畅，列表重渲染可被打断
- `startTransition`：不需要 pending 状态时的轻量版 API，用于标记一段状态更新为低优先级
- `useDeferredValue`：让某个值"延迟跟随"最新值更新，典型场景是处方搜索框实时输入、药品检索结果列表滞后渲染
- `Suspense` 配合 `lazy()`：组件级代码分割 + 加载态兜底，例如"电子处方单详情"组件懒加载
- `Suspense` 配合数据请求：结合支持 Suspense 的数据库（如 React 18.3 之后的实验性 `use()`）实现"读取即挂起"模式
- 并发模式下 `ReactDOM.createRoot` 是开启一切并发特性的前提，`ReactDOM.render` 走的是老的同步 Legacy 模式

#### 二、原理
- 时间切片的本质：JS 主线程是单线程的，React 渲染 Fiber 树本可以一次性同步跑完（Stack Reconciler 时代就是这样），但这样会长时间阻塞主线程导致掉帧、输入卡顿。时间切片把渲染工作拆成一个个不超过 5ms 的"工作单元"，每跑完一个时间片就把控制权交还给浏览器，让浏览器有机会处理用户输入、执行布局绘制
- 为什么用 `MessageChannel` 而不是 `setTimeout(fn, 0)`：`setTimeout` 是宏任务，但浏览器对定时器有最小延迟限制（嵌套调用会被 clamp 到 4ms 起，且不同浏览器实现不一致），而 `MessageChannel` 的 `port.postMessage` 触发的回调是标准的宏任务，延迟更稳定可控，且不会被浏览器的定时器节流策略影响；在不支持 `MessageChannel` 的环境（如某些 SSR/Node 环境）会降级为 `setTimeout`
- Scheduler 的任务队列：内部维护两个小顶堆（`taskQueue` 未过期任务、`timerQueue` 延迟任务），按 `expirationTime` 排序，每次 `performWorkUntilDeadline` 从堆顶取出最紧急的任务执行
- Lane 模型取代 `expirationTime` 的原因：React 16/17 用一个数字表示任务的"过期时间"来间接表达优先级，但数字是线性的，无法表达"多个不同优先级更新同时存在、且需要合并/区分处理"的复杂场景。Lane 用 31 位二进制的每一位代表一种"车道"（如 `SyncLane`、`InputContinuousLane`、`DefaultLane`、`TransitionLane1~16`、`RetryLane`、`IdleLane`），通过位运算（`|` 合并、`&` 判断交集、`~` 排除）可以一次性表达"哪些更新同时在排队""哪些优先级更紧急""哪些可以合并批处理"
- Lane 位运算的核心场景：`mergeLanes` 把多个更新的 lane 合并进 Fiber 的 `lanes` 字段；`getNextLanes` 通过 `getHighestPriorityLanes` 找到当前最该处理的一组 lane；`includesBlockingLane` 判断是否包含同步/阻塞性更新，从而决定本次渲染是否可以被中断
- `startTransition` 的调度降级：调用时把内部的 update 打上 `TransitionLane`，这类 lane 的优先级远低于 `SyncLane`/`InputContinuousLane`，Scheduler 在 `unstable_scheduleCallback` 时传入 `NormalPriority` 甚至更低，使其可以被后续的高优先级更新（比如用户又点击了一次）打断并重新调度，实现"过渡更新可丢弃重启"
- `Suspense` 与并发渲染的协作：当渲染中某个组件抛出一个 Promise（`thenable`），Fiber 会被标记为挂起，`Suspense` 边界捕获后展示 `fallback`，Promise resolve 后触发一次 `pingLanes` 重新调度对应 lane 的渲染，避免整棵树因为一个数据没准备好而无法渲染

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. 时间片主循环：`packages/scheduler/src/forks/Scheduler.js` — `workLoop` 函数中 `shouldYieldToHost()` 判断是否超过当前时间片额度（`frameInterval`，默认 5ms）
2. MessageChannel 调度：`packages/scheduler/src/forks/SchedulerHostConfig.default.js` — `schedulePerformWorkUntilDeadline` 中创建 `MessageChannel`，`port2.postMessage(null)` 触发下一轮宏任务
3. Lane 常量定义：`packages/react-reconciler/src/ReactFiberLane.js` — `SyncLane = 0b0000000000000000000000000000010`、`TransitionLanes` 位掩码、`DefaultLane` 等全部车道声明
4. 优先级计算：`packages/react-reconciler/src/ReactFiberLane.js` — `getHighestPriorityLane`、`getNextLanes` 决定本次 render 处理哪些 lane
5. `startTransition` 实现：`packages/react-reconciler/src/ReactFiberHooks.js` — `startTransition` 中通过 `requestUpdateLane` 获取 `TransitionLane` 并临时切换 `ReactCurrentBatchConfig.transition`
6. Suspense 挂起处理：`packages/react-reconciler/src/ReactFiberThrow.js` — `throwException` 中捕获 thenable，`attachPingListener` 注册 resolve 后的重渲染回调

#### 四、生产级最佳实践
- HIS 系统的"患者列表切换科室筛选"用 `useTransition` 包裹筛选逻辑，避免大列表重渲染阻塞筛选下拉框的交互反馈
- 处方药品检索输入框用 `useDeferredValue` 让搜索结果列表滞后于输入本身，输入始终跟手，结果列表可以"追着"更新
- 医生工作站的复杂表单（如电子处方开具）中，非关键的联动校验（药品相互作用提示）用 `startTransition` 标记为低优先级，避免拖慢核心的表单字段输入
- 避免滥用 `startTransition` 包裹涉及受控输入本身的 `setState`，否则输入框会出现"松手才更新"的延迟感，仅用于包裹"由输入触发的派生渲染"
- 长列表（患者档案、检验报告）配合 `Suspense` 做代码分割懒加载，减少首屏 JS 体积，`fallback` 使用与 HIS 系统视觉规范一致的骨架屏而非简单文字

#### 五、手写实现（可独立跑通）
用纯 Node.js（不依赖 React 本身）搭建一个最小化的"时间切片调度器"沙盘：用 `MessageChannel` 实现宏任务循环，模拟将"渲染 1000 个患者档案节点"这样一个大任务拆成多个不超过 5ms 的小任务分片执行，并加入一个简化版的优先级队列（用普通数组模拟小顶堆，按数字优先级排序），验证高优先级任务（用户点击"紧急呼叫"按钮）可以插队打断正在执行的低优先级任务（后台同步病历数据）。整个实现用 Vite + TypeScript 搭建一个可在浏览器打开的 demo 页面，用 `performance.now()` 打点在页面上可视化展示每个任务分片的执行耗时和让出主线程的时间点。

#### 六、手写实现源码 GitHub 地址
（写作时填入）

#### 七、参考
- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com

**面试核心问**：
- 时间切片的本质是什么？为什么一定要把渲染过程拆成小任务？
- 为什么 Scheduler 选择 `MessageChannel` 而不是 `setTimeout(fn, 0)` 来实现宏任务调度？
- Lane 模型相比 React 16 的 `expirationTime` 优势在哪里？为什么要用二进制位运算表示优先级？
- `startTransition` 和 `useTransition` 的区别是什么？分别在什么场景用？
- `Suspense` 是如何知道子组件"挂起"了的？resolve 之后 React 是怎么重新渲染的？

---

### 第 06 篇：React 18 事件系统与批处理原理

**副标题**：从"挂在 document 上"到"挂在 root 容器"，从"仅合成事件内批处理"到"处处自动批处理"

#### 一、基本使用
- 合成事件绑定：`<button onClick={handleClick}>` 中的 `onClick` 并非原生 DOM 事件，而是 React 封装的 `SyntheticEvent`
- `e.nativeEvent` 访问原始浏览器事件对象，用于需要原生 API（如 `getModifierState`）的场景
- `e.stopPropagation()` 只阻止合成事件在 React 事件系统内的传播，不等价于原生 `stopPropagation`（不会阻止原生事件冒泡到 `document`）
- React 18 中在原生事件回调、`setTimeout`、`Promise.then`、`fetch` 回调里多次 `setState` 会被自动合并为一次渲染（Automatic Batching）
- `flushSync(() => setState(...))` 强制让某次更新同步执行并立刻反映到 DOM，跳出批处理
- 事件委托是自动生效的：不需要开发者手动处理，React 内部把所有事件统一委托到 root 容器上监听

#### 二、原理
- 合成事件为什么要自己实现一套：浏览器事件模型存在跨浏览器差异（早期 IE 与标准 DOM 事件的字段、冒泡机制不一致），React 需要一套统一抹平差异的事件对象；此外自建事件系统才能让事件调度接入 React 自己的优先级和批处理机制，而不是被浏览器原生事件的执行时机所主导
- 事件委托机制：React 并不会给每个有 `onClick` 的 DOM 节点都挂一个原生监听器，而是在 root 容器（`createRoot` 挂载的那个 DOM 节点）上，对每一种事件类型（`click`、`change` 等）委托监听一次；触发时通过 `event.target` 结合 Fiber 树向上收集所有相关的合成事件处理函数，模拟"冒泡"和"捕获"两个阶段依次执行
- React 17 之前事件绑定在 `document` 上、React 17+ 改为绑定在 root 容器上的变化：早期整个页面只可能有一份 React，绑定到 `document` 没有问题；但当页面上同时存在多个 React 版本共存（比如渐进式迁移的大型系统、微前端场景），绑定到 `document` 会导致不同版本的事件系统互相干扰、事件顺序错乱。绑定到 root 容器后，每个 React 应用的事件监听相互隔离，也让"逐步升级 React 版本"的迁移路径变得可行
- 合成事件的两阶段模拟：`DOMPluginEventSystem` 中通过 `accumulateSinglePhaseListeners` 沿着 Fiber 树从触发节点向上收集所有祖先节点上注册的对应事件处理器，分别放入 `capture` 数组（逆序执行，模拟捕获阶段）和 `bubble` 数组（顺序执行，模拟冒泡阶段）
- Automatic Batching 的本质变化：React 17 及之前，`setState` 的批处理是靠"是否处于 React 事件处理函数的执行上下文中"来判断的——`unstable_batchedUpdates` 会在进入合成事件处理函数前设置一个全局标志位 `isBatchingUpdates = true`，多次 `setState` 只会触发一次调度；但脱离这个上下文（`setTimeout`、原生事件监听、`Promise.then`、`fetch` 回调）就没有这个标志位，导致每次 `setState` 都会立刻同步触发一次渲染。React 18 的 `createRoot` 改为在 Scheduler 层面统一批处理：只要是在同一个"微任务/事件循环 tick"内产生的多次更新，无论来源是哪里，都会被合并进同一批 `lanes` 一起处理，不再依赖"是否在 React 事件上下文里"这个判断
- `flushSync` 的实现：强制把传入函数中产生的更新标记为 `SyncLane` 且立刻走一次同步渲染流程（`flushSyncCallbackQueue`），跳过正常的批处理调度队列，常用于需要在下一行代码就读到最新 DOM（如测量元素尺寸）的场景

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. 事件插件注册：`packages/react-dom/src/events/DOMPluginEventSystem.js` — `listenToAllSupportedEvents` 遍历事件类型，统一在 root 容器上通过 `addEventListener` 委托监听
2. 事件分发入口：`packages/react-dom/src/events/DOMPluginEventSystem.js` — `dispatchEventForPluginEventSystem` 是原生事件触发后进入 React 事件系统的统一入口
3. 监听器收集：`packages/react-dom/src/events/DOMPluginEventSystem.js` — `accumulateSinglePhaseListeners` 沿 Fiber 树向上收集捕获/冒泡阶段的处理函数
4. 批处理标记：`packages/react-dom/src/client/ReactDOMRoot.js` 与 `packages/react-reconciler/src/ReactFiberWorkLoop.js` — `createRoot` 挂载的应用在 `scheduleUpdateOnFiber` 中统一走批处理调度路径，不再区分事件来源
5. `flushSync` 实现：`packages/react-reconciler/src/ReactFiberWorkLoop.js` — `flushSync` 中临时切换执行上下文并立刻触发 `flushSyncCallbackQueue`

#### 四、生产级最佳实践
- 医生工作站中"批量勾选患者列表 + 一键批量转诊"的操作，多个 `setState`（勾选状态、转诊目标科室、按钮 loading 态）天然享受 React 18 的自动批处理，不需要手动包裹
- 药品库存扫码枪触发的原生 `keydown`/`scan` 事件回调中更新多个状态（扫码结果、库存数量、校验提示）时，React 18 下不再需要手动调用 `unstable_batchedUpdates` 包裹
- 需要在状态更新后立刻读取 DOM 布局信息的场景（如处方单打印前测量内容高度分页），用 `flushSync` 包裹更新，避免读到过期的 DOM 尺寸
- 自定义事件（如 WebSocket 推送的"检验报告已出"通知）触发的状态更新，评估是否需要 `flushSync`：日常通知类更新无需强制同步，走默认批处理即可，避免不必要的性能开销
- 排查"点击后页面没反应"类问题时，先确认是否误用了原生 `addEventListener` 而不是 JSX 属性绑定，脱离 React 事件委托体系的监听器不会被合成事件的 `stopPropagation` 语义约束

#### 五、手写实现（可独立跑通）
用 Vite + TypeScript 搭建一个不依赖 React 的最小事件委托系统：在一个"患者列表"容器上只挂一个原生 `click` 监听器，内部维护一份"虚拟事件注册表"（节点 -> 处理函数的映射），点击列表项时通过 `event.target` 向上遍历 DOM 树查找注册的处理函数并模拟冒泡阶段依次调用；再实现一个极简的"批处理"机制：用一个 `isBatching` 标志位和一个 `pendingUpdates` 队列，包装多次"更新患者状态"的调用，在当前调用栈结束后（用 `Promise.resolve().then` 模拟微任务）统一合并执行一次渲染，用页面上的渲染次数计数器直观展示"批处理前后渲染次数的差异"。

#### 六、手写实现源码 GitHub 地址
（写作时填入）

#### 七、参考
- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com

**面试核心问**：
- React 18 的自动批处理和 React 17 相比区别在哪？具体是哪些场景下行为发生了变化？
- 合成事件为什么要自己实现一套，而不是直接用原生事件？
- React 17 把事件绑定从 `document` 改到 root 容器，解决了什么问题？
- `e.stopPropagation()` 在合成事件里和原生事件里的行为有什么不同？
- 什么场景下需要用 `flushSync`？滥用会有什么代价？

---

### 第 07 篇：React 18 Context 原理与手写实现

**副标题**：Context 值挂在 Fiber 节点上，Provider 变化时如何精确标记需要更新的子树

#### 一、基本使用
- `createContext(defaultValue)` 创建 Context 对象，`defaultValue` 仅在没有匹配到任何 `Provider` 时生效
- `<XxxContext.Provider value={...}>` 提供值，`value` 变化（`Object.is` 比较）会触发消费该 Context 的组件重渲染
- `useContext(XxxContext)` 在函数组件中读取最近一层匹配的 `Provider` 提供的值
- 类组件中通过 `static contextType = XxxContext` 或 `<XxxContext.Consumer>` 渲染属性模式读取
- 多个 Context 嵌套使用时，`useContext` 只会匹配组件树上"最近"的同一个 Context 的 `Provider`，与声明顺序无关

#### 二、原理
- Context 值存储位置：每个 `Provider` 对应的 Fiber 节点上有一个 `memoizedProps.value`，同时 Context 对象本身维护一个 `_currentValue` 字段（在支持多渲染器/多线程渲染时还有 `_currentValue2` 用于并发场景的双缓冲）；`useContext` 读取的实际是当前渲染过程中 Context 对象的 `_currentValue`，这个值在 `beginWork` 处理到 `Provider` 节点时被压栈更新，处理完子树后出栈恢复
- Provider 变化如何标记依赖子树更新：当 `Provider` 的 `value` 发生变化，React 在 `updateContextProvider` 中会调用 `propagateContextChange`，从 `Provider` 节点开始向下遍历整个子树的 Fiber 节点，检查每个节点的 `dependencies`（记录了这个组件消费了哪些 Context），如果匹配上就把该 Fiber 标记上对应的更新 lane，即使中间隔着没有调用 `useContext` 的组件，也会被遍历经过（但不会被打标记，只是"路过"去找更深层的消费者）
- 为什么"中间组件被 memo 包裹也无法完全规避重渲染"：`propagateContextChange` 的遍历是在 Fiber 树的 `beginWork` 阶段之前做的标记扫描，它是为了找到"谁需要重新渲染"，这个扫描本身不会被 `memo` 挡住（`memo` 只是在真正 `beginWork` 时如果 props 没变且没有更新任务就跳过渲染，但 Context 变化会给消费组件本身打上更新标记，导致它必须重新渲染，`memo` 无法感知"我的某个后代消费的 Context 变了"这件事）
- 多层 Context 性能陷阱的根源：如果把多个不相关的状态塞进同一个 Context 的 `value` 对象（比如把"当前医生信息"和"当前患者列表"都放进一个 `AppContext`），只要其中任意一个字段变化，`value` 引用整体变化，所有消费了这个 Context 的组件（哪怉只用到了另一个字段）都会被标记更新
- 拆分 Context 优化策略：将粒度不同、变化频率不同的状态拆成多个独立的 Context（如 `DoctorContext`、`PatientListContext` 分离），让组件只订阅自己真正关心的那部分，避免"无关状态变化"引发的连锁重渲染
- `use-context-selector` 类库的实现思路：它不使用 React 原生的 Context 传播机制来决定重渲染，而是把 Context 的 value 存到一个自建的可订阅 store（类似简化版 Redux）里，`Provider` 内部用 `useRef`/`useSyncExternalStore` 存储最新值并对外暴露订阅函数；消费者组件通过 `useContextSelector(context, selector)` 注册一个"选择器函数"，只有当 `selector` 计算出的结果真正变化时才强制该组件重渲染（通常用一个内部的 `useState`/`forceUpdate` 手动触发），从而绕开了原生 Context "只要 value 变就全员通知"的机制
- 对比 Vue 3 的 `provide/inject`：Vue 3 的依赖注入基于组件实例的原型链继承——子组件的 `inject` 实际上是从当前组件实例开始沿着父组件链向上查找最近一次 `provide` 注入的值，这个查找发生在组件初始化时一次性完成，之后是普通的响应式依赖收集（`provide` 的值如果是 `ref`/`reactive`，变化时通过响应式系统的依赖追踪精确通知到用到它的渲染函数，粒度可以精确到"这个值被哪个组件的哪次渲染读取过"）；而 React Context 是在每次渲染时通过 Fiber 树的显式遍历（`propagateContextChange`）去广播变化，没有细粒度的依赖追踪，只要 `Provider` 的 `value` 引用变了就是"广播式"通知所有消费者，性能特征上 Vue 的响应式追踪更精细，React 的 Context 传播更"暴力"但实现更简单直接，这也是为什么 React 社区会衍生出 `use-context-selector`、`zustand`、`jotai` 等库来补足细粒度订阅的能力

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. Context 对象创建：`packages/react/src/ReactContext.js` — `createContext` 中定义 `_currentValue`、`Provider`、`Consumer` 的结构
2. Provider 渲染处理：`packages/react-reconciler/src/ReactFiberBeginWork.js` — `updateContextProvider` 中压栈新值并判断是否需要 `propagateContextChange`
3. 变化传播算法：`packages/react-reconciler/src/ReactFiberNewContext.js` — `propagateContextChange_eager` 沿 Fiber 树向下遍历、匹配 `dependencies`、打更新标记
4. Context 读取：`packages/react-reconciler/src/ReactFiberNewContext.js` — `readContext` 中读取 `_currentValue` 并把当前 Fiber 加入 Context 的依赖链表
5. `useContext` Hook 入口：`packages/react-reconciler/src/ReactFiberHooks.js` — `useContext` 最终调用 `readContext`

#### 四、生产级最佳实践
- HIS 系统中"当前登录医生信息"和"当前诊室待诊患者队列"拆成两个独立 Context，避免患者队列频繁刷新连带医生信息展示组件重渲染
- 处方开具页面中"药品字典数据"（几乎不变）和"当前处方单编辑状态"（频繁变化）分离成不同 Context，字典类数据甚至可以考虑不用 Context 而用模块级缓存 + 简单状态管理
- 大型 HIS 系统的角色权限 Context（医生/护士/管理员）作为顶层 Provider，但权限值本身在会话周期内基本不变，避免把易变的 UI 状态也塞进同一个权限 Context
- 消费 Context 的深层组件优先只订阅需要的字段，而不是解构整个 Context 对象后传给一堆 props，减少"看起来没用到但实际上因为组件整体依赖 Context 而被重渲染"的组件数量
- 对确实存在高频更新 + 大范围消费的场景（如实时生命体征监测数据广播给多个图表组件），优先考虑 `zustand` 等基于订阅而非 Context 广播的状态管理方案，而不是硬用原生 Context

#### 五、手写实现（可独立跑通）
用 Vite + TypeScript 搭建一个不依赖真实 React 源码、但模拟其核心机制的极简版 Context 系统：手写 `createContext`（内部维护 `_currentValue` 和一个订阅者集合）、`Provider` 组件（value 变化时遍历订阅者集合逐个通知）、`useContext`（读取当前值并把调用组件注册进订阅者集合），用"医生工作站患者队列广播"作为演示场景——多个"患者卡片"组件消费同一个 Context，观察 Provider 更新时所有消费者是如何被重渲染的；随后在此基础上手写一个 `createContextSelector`，改用订阅 + 选择器函数的方式，让消费者只有在 `selector(value)` 计算结果真正变化时才重渲染，用页面上的重渲染次数计数器对比两种方案在"只有一个患者字段变化"场景下的渲染次数差异。

#### 六、手写实现源码 GitHub 地址
（写作时填入）

#### 七、参考
- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com

**面试核心问**：
- Context 的值变化会导致所有消费组件重渲染吗？具体的传播机制是怎样的？
- 为什么被 `memo` 包裹的组件，在祖先 Context 变化时依旧会重渲染？
- 如何优化多层 Context 导致的性能问题？有哪些具体手段？
- React 的 Context 机制和 Vue 3 的 `provide/inject` 在实现原理和性能特征上有什么本质区别？
- `use-context-selector` 之类的库是怎么绕开原生 Context 的"广播式"更新的？

---

### 第 08 篇：React Router 6/7 原理与实战

**副标题**：从"组件里 useEffect 请求数据"到"路由跳转前预取数据"的范式转变

#### 一、基本使用
- `createBrowserRouter` 创建 Data Router 实例，配合 `<RouterProvider router={router} />` 渲染，替代早期的 `<BrowserRouter>` + `<Routes>` 声明式写法
- 路由配置对象中的 `loader` 字段：在导航到该路由前触发，用于预取该页面所需数据（如"患者详情页"跳转前先加载患者档案）
- `action` 字段：处理该路由下的表单提交/数据变更（如"新建处方"表单提交），配合 `<Form method="post">` 声明式提交，不需要手动 `preventDefault` + `fetch`
- `useLoaderData()` 在组件内读取对应路由 `loader` 返回的数据
- 嵌套路由 + `<Outlet />`：父路由（如"患者详情"布局）渲染子路由内容的占位符，实现"共享布局 + 局部切换"
- `useParams()` 读取动态路由参数（如 `/patients/:patientId`）
- `useNavigate()` / `<Navigate>` 编程式导航，`useRevalidator()` 手动触发 `loader` 重新执行（如提交处方后刷新处方列表）

#### 二、原理
- Data Router 与之前"组件内 `useEffect` 请求数据"方式的本质区别：过去的模式是"先渲染组件（往往先展示 loading），再在 `useEffect` 里发请求，请求回来再触发一次重渲染"，这意味着"路由跳转"和"数据请求"是两个串行且脱节的过程，用户会经历"路由已经跳转、页面骨架已出现、但数据还在加载"的中间态，且容易出现请求瀑布（父组件数据没回来，子组件不知道该不该请求）。Data Router 把数据获取提升到路由匹配层面：在真正渲染目标路由组件之前，先并行触发匹配到的所有层级路由的 `loader`（父子路由的 `loader` 并行执行而不是等父组件渲染完再触发子请求），等数据准备好后再一次性渲染，从架构上解决了请求瀑布和"渲染与请求脱节"的问题
- 对比 Vue Router 4 的导航守卫：Vue Router 的 `beforeEnter`/`beforeRouteEnter` 等导航守卫本质是"在导航流程的某个时机插入一个可以异步等待的钩子函数"，开发者需要自己在守卫里发请求、自己决定把数据放到哪（通常是 Vuex/Pinia 或者 `to.meta`），路由本身不关心数据获取的结果如何供组件使用；而 React Router 的 `loader` 是路由配置的一等公民，返回值通过 `useLoaderData` 有明确的消费方式，数据获取与路由定义强绑定，形成了一套完整的"路由即数据依赖声明"范式，而不只是一个时机钩子
- 嵌套路由与组件树的对应关系：路由配置本身是一棵树（`children` 嵌套），这棵树在匹配阶段（`matchRoutes`）会根据当前 URL 找出从根到叶子的一条匹配链路（`RouteMatch[]`），每一层匹配到的路由对应渲染树中一个 `<Outlet />` 的填充内容，本质上是"路由树"驱动"UI 组件树"的对应关系，父路由的 `element` 中放一个 `<Outlet />` 作为子路由内容的插槽
- 路由匹配算法：React Router 6/7 内部对路由路径按"静态段优先于动态段优先于通配符段"的规则计算出一个打分（`computeScore`），匹配时对所有候选路由排序后取分数最高的，而不是简单的按数组顺序匹配或者构建 Trie 树；动态参数段（`:id`）打分低于静态字面量段，通配符段（`*`）打分最低，这保证了"更具体的路径优先匹配"（如 `/patients/new` 优先于 `/patients/:id`，即使 `:id` 排在配置数组前面）
- History API 监听：底层基于 `history` 库封装的 `createBrowserHistory`，监听浏览器的 `popstate` 事件感知前进/后退，编程式导航（`navigate()`）内部调用 `history.pushState`/`replaceState` 修改 URL 但不触发整页刷新，修改后主动通知 Router 重新执行匹配和渲染流程
- 权限路由的动态生成原理：本质是把角色权限判断放在路由配置的生成函数里（而不是运行时每次渲染都判断），根据当前登录角色（医生/护士/管理员）过滤/裁剪路由配置数组后再传给 `createBrowserRouter`，未授权的路由压根不会出现在路由树里；配合 `loader` 中的权限校验（如访问处方审核页面但角色不是药师，在 `loader` 里 `throw redirect('/403')`）实现"数据加载层面的权限拦截"，比在组件渲染后才判断权限更早、更彻底

#### 三、源码解析（重点代码，来源 GitHub 仓库，以 remix-run/react-router 仓库为准）
1. Data Router 创建：`packages/react-router-dom/index.tsx` — `createBrowserRouter` 内部调用 `createRouter` 并绑定浏览器 `history`
2. 路由匹配与打分：`packages/router/utils.ts` — `matchRoutes`、`computeScore` 实现路径优先级排序算法
3. 导航状态机核心：`packages/router/router.ts` — `createRouter` 中的 `startNavigation` 负责并行触发匹配链路上所有 `loader`、处理竞态取消（`AbortController`）
4. `loader`/`action` 数据流：`packages/router/router.ts` — `callLoaderOrAction` 统一处理两者的调用、错误捕获、`redirect`/`json` 特殊返回值处理
5. `Outlet` 渲染子路由：`packages/react-router/lib/hooks.tsx` — `useOutlet`/`<Outlet>` 中根据当前匹配链路渲染下一层路由元素
6. `useLoaderData` 读取数据：`packages/react-router/lib/hooks.tsx` — 从 `DataRouterStateContext` 中按当前路由 id 取出对应 `loaderData`

#### 四、生产级最佳实践
- HIS 系统"患者详情"页面用 `loader` 预取患者档案 + 最近处方记录，避免组件挂载后再发起多个串行 `useEffect` 请求
- "新建处方"表单用 `<Form method="post">` + `action` 声明式提交，提交成功后在 `action` 内 `return redirect('/prescriptions/:id')` 跳转到详情页，替代手写 `fetch` + `navigate` 的组合
- 权限路由：登录后根据角色（医生/护士/管理员）动态过滤路由配置数组再传入 `createBrowserRouter`，管理员专属的"系统配置"路由对普通医生角色完全不出现在路由树中，而不是渲染后靠组件内 `if` 判断隐藏
- 关键业务路由（如"处方审核"）在对应 `loader` 中做二次权限校验并 `throw redirect('/403')`，防止用户直接改 URL 绕过前端路由过滤访问未授权页面
- 长列表页（患者列表）切换分页/筛选时，用 `useRevalidator` 或者给 `loader` 加请求参数依赖，避免整页重新挂载导致的布局跳动，只重新拉取数据

#### 五、手写实现（可独立跑通）
用 Vite + TypeScript 搭建一个不依赖 react-router 的极简客户端路由：用 `history.pushState` + 监听 `popstate` 实现路由跳转不刷新页面；手写一个简化版路径匹配函数（把 `/patients/:id` 转成正则并提取参数），支持嵌套路由配置和一层 `Outlet` 占位渲染；再手写一个极简的 `loader` 机制——路由配置里声明的 `loader` 函数会在匹配到该路由后、渲染对应组件前被调用并等待其 Promise 完成，加载期间展示 loading 占位，完成后把结果通过一个简单的 Context 传给组件读取。用"医生工作站 -> 患者列表 -> 患者详情（`loader` 预取患者档案数据）"这条路径作为演示场景跑通整个流程。

#### 六、手写实现源码 GitHub 地址
（写作时填入）

#### 七、参考
- https://reactrouter.com/
- https://zh-hans.react.dev/

**面试核心问**：
- Data Router 的 `loader` 解决了什么问题？相比之前在组件里 `useEffect` 请求数据，优势具体在哪？
- React Router 的嵌套路由和 `<Outlet />` 是怎么配合工作的？
- 路由路径匹配时，动态参数段和静态段谁的优先级更高？为什么这样设计？
- 权限路由一般怎么设计？只在组件里做 `if` 判断隐藏够不够？
- React Router 的 `action` 和传统的表单 `onSubmit` + `fetch` 手动处理相比，解决了什么问题？

---
### 第 09 篇：Redux 原理与手写实现 + RTK 生产实践

**副标题**：从 `createStore` 的发布订阅到 Redux Toolkit 的 Immer 加持，为什么大团队协作偏爱"严格可预测"

#### 一、基本使用
- `createStore(reducer)`（或 RTK 的 `configureStore`）创建 store，`store.getState()` 读取状态，`store.dispatch(action)` 触发状态变更，`store.subscribe(listener)` 订阅变化
- reducer 纯函数约定：`(state, action) => newState`，不可直接修改 `state`，必须返回新对象
- `react-redux` 的 `<Provider store={store}>` 注入 store，`useSelector(state => state.xxx)` 读取状态并订阅变化，`useDispatch()` 获取 `dispatch` 函数
- Redux Toolkit 的 `createSlice({ name, initialState, reducers })`：内部用 Immer 允许"看似直接修改"的写法（如 `state.list.push(item)`），自动生成 action creator 和 action type
- `createAsyncThunk` 处理异步逻辑（如提交处方审核请求），自动生成 `pending`/`fulfilled`/`rejected` 三个 action
- RTK Query：`createApi` 声明式定义接口，自动生成带缓存、去重、自动重新请求能力的 hooks（如 `usePrescriptionsQuery`）

#### 二、原理
- 发布订阅模式的核心：`createStore` 内部维护一个 `currentState` 和一个监听器数组 `listeners`；`dispatch(action)` 做的事情就是拿当前 `state` 和 `action` 调用 `reducer` 得到新 `state`，赋值给 `currentState`，然后遍历执行 `listeners` 里的每一个订阅函数；`subscribe(listener)` 只是把函数塞进 `listeners` 数组并返回一个取消订阅的函数
- `applyMiddleware` 的柯里化链条：中间件的签名是 `store => next => action => {}` 三层柯里化函数，`applyMiddleware` 把所有中间件串联成一条链——最后一个中间件的 `next` 指向真正的 `store.dispatch`，倒数第二个中间件的 `next` 指向最后一个中间件包装后的函数，如此往前串联，形成"洋葱模型"：一个 `dispatch(action)` 调用会依次穿过每个中间件的前置逻辑，到达真正的 reducer，再依次穿过每个中间件的后置逻辑（如果中间件在调用 `next(action)` 前后都有代码）
- `combineReducers` 的分治思想：把一个大 reducer 拆成多个"只关心自己那部分 state 字段"的小 reducer，`combineReducers` 返回的合成 reducer 内部遍历每个 key，把整体 `state[key]` 和 `action` 分别传给对应的小 reducer，收集结果组装成新的整体 state 对象；只有当至少一个字段真正变化时才返回新的顶层对象引用，否则保持原引用不变（用于配合 `Object.is` 精确判断"整体是否变化"）
- `react-redux` 的精确订阅机制：`useSelector` 内部基于 `useSyncExternalStore`（React 18 新增的官方 API，用于订阅外部数据源）——把 `store.subscribe` 作为订阅函数传入，每次 store 变化时重新执行 `selector(store.getState())` 并用 `Object.is` 比较新旧结果，只有真正不同才触发该组件重渲染，避免"store 里任何字段变化都导致所有 `useSelector` 组件重渲染"
- RTK 的 Immer 集成原理：`createSlice` 里写的 reducer 函数收到的 `state` 参数实际上是 Immer 生成的一个 Proxy 对象，对这个 Proxy 做"看似直接修改"的操作（`state.list.push(x)`、`state.count++`）会被 Immer 记录下变更路径，最终 Immer 基于这些记录生成一份新的不可变 state（结构共享，没变化的部分复用旧引用），这样开发者写代码时可以用"看起来违反不可变原则"的直观写法，底层依然保持 Redux 要求的不可变数据流
- RTK Query 的缓存和去重原理：基于接口的 `endpoint` 名称 + 参数序列化后的 key 作为缓存标识，多个组件同时发起同一个 key 的请求时只会真正发出一次网络请求，其余订阅者复用结果；组件卸载后引用计数归零，缓存会在配置的过期时间后自动清理；`invalidatesTags`/`providesTags` 机制实现"某个 mutation 执行后，自动让相关的 query 缓存失效并重新拉取"，替代手动管理"提交后要刷新哪些列表"的心智负担

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. store 核心实现：`redux/src/createStore.ts` — `dispatch`、`subscribe`、`getState` 的完整发布订阅实现
2. 中间件链条：`redux/src/applyMiddleware.ts` — 柯里化串联所有中间件，构造增强后的 `dispatch`
3. reducer 合并：`redux/src/combineReducers.ts` — 分治式处理多个子 reducer 并做变化检测
4. 精确订阅：`react-redux/src/hooks/useSelector.ts` — 基于 `useSyncExternalStore` 的选择器订阅实现
5. connect 高阶组件（了解历史演进）：`react-redux/src/components/connectAdvanced.tsx`
6. Immer 集成：`@reduxjs/toolkit/src/createSlice.ts` — reducer 包装为基于 `immer.produce` 执行

#### 四、生产级最佳实践
- 医院管理系统的处方审核流程用 `createSlice` 管理"处方单状态机"（待提交/待审核/已通过/已驳回），reducers 里直接写"看似修改"的语句，Immer 保证数据不可变
- 处方提交、审核通过等异步操作统一用 `createAsyncThunk` 封装，配合 `extraReducers` 处理三态（pending/fulfilled/rejected），loading 和错误态有统一的处理范式
- 患者列表、药品目录等只读为主的数据获取，用 RTK Query 的 `createApi` 声明式定义，自动获得缓存、请求去重、`refetchOnFocus` 等能力，减少手写 `useEffect` + `useState` 管理请求状态的重复代码
- 大团队协作场景（多个开发者同时维护同一个 HIS 系统的不同模块）中，Redux 的单一 store + 严格的 action/reducer 约定让状态变化可追踪、可回放（DevTools 时间旅行调试），排查"患者状态为什么变成了这个值"时可以直接看 action 历史
- 避免把频繁变化的局部 UI 状态（如某个下拉框是否展开）也塞进全局 Redux store，这类状态用组件内 `useState` 更合适，减少不必要的全局状态膨胀

#### 五、手写实现（可独立跑通）
用纯 TypeScript（不依赖 redux 包）实现一个约 100 行的 mini-Redux：包含 `createStore`（发布订阅核心）、`applyMiddleware`（柯里化中间件链，手写一个日志中间件和一个简化版异步 thunk 中间件）、`combineReducers`（分治合并）。用"处方单状态机"作为演示场景——定义 `SUBMIT_PRESCRIPTION`/`APPROVE_PRESCRIPTION`/`REJECT_PRESCRIPTION` 等 action，手写 reducer 处理状态流转，搭配自制的日志中间件在控制台打印每次 `action` 前后的 state 变化，验证中间件链条和订阅通知机制均按预期工作。

#### 六、手写实现源码 GitHub 地址
（写作时填入）

#### 七、参考
- https://redux.js.org/
- https://react-redux.js.org/
- https://redux-toolkit.js.org/

**面试核心问**：
- Redux 的核心是什么？用一句话描述它的数据流转过程。
- `applyMiddleware` 的柯里化链条具体是怎么串联起来的？中间件的执行顺序是什么样的？
- `react-redux` 的 `useSelector` 是怎么做到"只有相关字段变化才重渲染"的？
- RTK 的 `createSlice` 为什么可以"直接修改" state？背后的 Immer 是怎么工作的？
- RTK Query 的缓存去重机制是怎么实现的？和手写 `useEffect` + `useState` 相比解决了什么问题？

---

### 第 10 篇：MobX 原理与响应式对比实战

**副标题**：Proxy 驱动的细粒度响应式，为什么写起来更像"面向对象"而不是"纯函数"

#### 一、基本使用
- `observable` 标记一个对象/数组/Map 为可观察状态，如 `observable({ heartRate: 72, bloodPressure: '120/80' })`
- `computed` 定义基于其他 observable 派生的计算值，自动缓存，依赖不变时不重新计算
- `action` 标记会修改状态的方法，MobX 建议所有状态修改都通过 action 进行，便于批量处理和调试
- `autorun` 立即执行并自动追踪依赖的函数，依赖变化时自动重新执行（常用于日志、同步副作用）
- `reaction(dataFn, effectFn)` 更精细地控制"追踪哪个值、值变化后做什么"，与 `autorun` 相比可以避免副作用函数本身访问到不该被追踪的数据
- `makeAutoObservable(this)` 在类的构造函数中一键把属性转为 observable、方法转为 action、getter 转为 computed，是目前推荐的最简写法
- `observer(Component)` 高阶组件包裹 React 组件，使其能响应内部访问到的 observable 数据变化

#### 二、原理
- Proxy 驱动的响应式追踪：MobX 5+ 默认（`useProxies: true`）用 ES6 `Proxy` 包装 observable 对象，拦截 `get`/`set` 操作——`get` 时记录"当前正在执行的 derivation（衍生计算，如 computed 或 observer 渲染）依赖了这个字段"，`set` 时找出"哪些 derivation 依赖了这个字段"并通知它们重新计算/重新渲染
- 依赖收集与响应式系统的关系：这套机制在原理上与 Vue 3 的 `@vue/reactivity`（`reactive`/`effect`）高度相似——都是"运行时通过 Proxy 拦截读写操作实现自动依赖追踪"的响应式范式，区别主要在于 API 设计哲学和框架集成方式：MobX 是"面向对象"风格（用类和方法组织状态和行为，状态可以是可变的），Vue 3 的响应式系统更多以"函数式 + 组合式"风格出现（`ref`/`reactive` 搭配 `computed`/`watchEffect`），但底层的 Proxy 拦截 + 依赖收集 + 派发通知思路是共通的
- `computed` 的缓存机制：`computed` 内部维护自己的依赖列表和上一次计算结果，只有当依赖的 observable 真正变化时才会重新执行计算函数并缓存新结果；如果没有任何依赖变化，多次读取 `computed` 的值直接返回缓存，不会重复执行计算逻辑，这是它相比"每次渲染都重新计算一个派生值"的性能优势
- `autorun`/`reaction` 与 `observer` 的关系：`observer` HOC 本质上是把"React 组件的渲染函数"包装成了一个特殊的 Reaction（MobX 内部的执行上下文单元），组件渲染时访问到的所有 observable 字段都会被自动收集为这个 Reaction 的依赖；当依赖变化时，这个 Reaction 会被重新执行——也就是触发该组件的强制重渲染（内部通过 `forceUpdate` 或类似机制），这与手写 `autorun(() => console.log(store.value))` 在机制上是一致的，只是"重新执行的函数体"从打日志变成了"重新渲染组件"
- 细粒度响应式与 React 渲染模型的错位：MobX 的响应式追踪可以精确到"某个对象的某个字段"级别，但 React 的渲染单元是"组件"，`observer` 包裹的组件只能整体重渲染或不重渲染，无法做到"只更新组件内某个 DOM 节点"（这一点上 Vue 3 的模板编译产物可以做到更细粒度的 DOM 更新，因为 Vue 的响应式系统是和渲染函数、甚至和编译期生成的 PatchFlag 深度结合的）；因此 MobX 在 React 中的性能收益主要体现在"减少不必要的整组件重渲染次数"，而非细粒度 DOM 更新
- action 批处理原理：被 `action` 包裹的函数在执行期间，MobX 会暂缓通知（类似"事务"），函数内部即使修改了多个 observable 字段，也只会在整个 action 执行完毕后统一触发一次依赖通知，避免"改一个字段就通知一次、连续改三个字段通知三次"的冗余更新

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. Proxy 拦截核心：`mobx/src/types/observableobject.ts` — `get`/`set` 陷阱中调用 `reportObserved`（依赖收集）和 `reportChanged`（变化通知）
2. 依赖收集与派生计算：`mobx/src/core/derivation.ts` — `trackDerivedFunction` 追踪一个函数执行期间访问了哪些 observable
3. Reaction 调度：`mobx/src/core/reaction.ts` — `Reaction` 类的 `track`/`onInvalidate` 实现响应式副作用的重新执行
4. computed 缓存：`mobx/src/core/computedvalue.ts` — `ComputedValue` 中依赖是否变化的判断和缓存复用逻辑
5. React 集成：`mobx-react-lite/src/observer.ts` — 把组件渲染函数包装为 Reaction 的具体实现

#### 四、生产级最佳实践
- 患者体征监测大屏这类"状态天然是对象、变化频繁、逻辑偏面向对象"的场景（如 `PatientVitalsStore` 类封装心率、血压、血氧等字段及其异常判断方法）用 MobX 建模会比 Redux 的纯函数 reducer 写法更直观，样板代码更少
- 所有修改状态的操作统一包一层 `action`，即使 MobX 在非严格模式下允许直接修改，也应该养成显式声明的习惯，便于团队协作时快速定位"状态在哪些地方会被修改"
- 用 `computed` 封装派生逻辑（如"根据心率和血压综合判断是否触发预警"），避免在多个 `observer` 组件里重复计算同样的派生逻辑
- 避免在 `observer` 组件的渲染函数里做"访问 observable 但不希望被追踪"的操作，如需要这种场景用 `runInAction` 或者把逻辑挪出渲染函数
- 大规模团队选型时，MobX 的隐式响应式（不需要显式 selector）在减少样板代码的同时，也意味着"哪里用到了哪个字段"不如 Redux 的显式 `useSelector` 直观，团队规模越大、协作越复杂时，这种隐式性需要更强的代码规范和文档配合

#### 五、手写实现（可独立跑通）
用纯 TypeScript 手写一个简化版的 Proxy 响应式系统（不依赖 mobx 包），实现：`observable(obj)` 用 Proxy 包装对象并在 `get` 时记录依赖、`set` 时触发通知；一个全局的"当前正在追踪的 effect"栈，用于 `autorun(fn)` 执行时把 `fn` 推入栈顶，`fn` 内部访问 observable 字段时能拿到栈顶的 effect 并收集依赖；一个简化版 `computed(fn)`，内部包装为一个特殊的、带缓存判断的 effect。用"患者体征监测"场景演示——创建一个 `vitals` observable 对象（心率、血压），一个 `computed` 派生"是否异常"的布尔值，一个 `autorun` 模拟"异常时自动打印预警日志"，修改心率数值后观察计算值和副作用是如何自动联动更新的。

#### 六、手写实现源码 GitHub 地址
（写作时填入）

#### 七、参考
- https://mobx.js.org/
- https://mobx.js.org/react-integration.html

**面试核心问**：
- MobX 的响应式追踪是怎么实现的？和 Vue 3 的响应式系统有什么相似和不同之处？
- `computed` 为什么比在渲染函数里直接计算派生值性能更好？
- `observer` 包裹的组件是怎么知道"该重新渲染了"的？
- MobX 的细粒度响应式追踪，为什么在 React 里的收益主要体现在"减少整组件重渲染"而不是"精确更新 DOM"？
- 什么样的团队/场景更适合选 MobX 而不是 Redux？

---

### 第 11 篇：dva.js 原理与实战

**副标题**：Redux + Redux-Saga 的约定式封装，Generator 函数如何让异步流程写成"同步代码的样子"

#### 一、基本使用
- `dva()` 创建应用实例，`app.model(model)` 注册一个业务模块，`app.router(routerConfig)` 配置路由，`app.start()` 启动
- model 的四要素：`namespace`（模块命名空间）、`state`（初始状态）、`reducers`（同步修改状态的纯函数集合）、`effects`（处理异步逻辑和业务流程的 Generator 函数集合）、`subscriptions`（订阅数据源，如键盘事件、路由变化）
- 组件中通过 `connect` 或 `dva` 提供的 hooks 把 model 的 state 映射为 props，`dispatch({ type: 'namespace/actionName', payload })` 触发 reducer 或 effect
- effects 内部用 `yield` 配合 `call`（调用异步函数，如请求接口）、`put`（触发另一个 action）、`select`（读取当前 store 状态）等 effect 描述符
- `dva-loading` 插件自动跟踪每个 effect 的 loading 状态，无需手动维护 `isLoading` 字段
- 动态 model 注册：路由级代码分割时，对应页面的 model 可以在路由组件加载时才 `app.model()` 注册，而不是应用启动时全量注册

#### 二、原理
- dva 在 Redux + Redux-Saga 之上做的封装：本质上 dva 没有发明新的状态管理机制，而是把"reducer 定义"、"saga（副作用处理）定义"、"路由配置"这几件原本要分散在多个文件手动组装（`combineReducers`、`sagaMiddleware.run`、`connect` 等）的事情，通过一个约定式的 `model` 对象统一描述，内部自动完成 reducer 合并、saga 注册、connect 包装
- Generator 函数与 Redux-Saga 的协作原理：Generator 函数（`function*`）的特点是执行到 `yield` 表达式时会暂停，把 `yield` 后面的值"抛出"给调用者，等调用者决定好之后通过 `.next(value)` 恢复执行并把 `value` 作为这次 `yield` 表达式的返回值。Redux-Saga 利用这个特性构建了一套"描述式副作用"体系：effect 里写 `yield call(fetchApi, params)`，`call(...)` 本身不是真的去调用函数，而是返回一个"描述对象"（`{ type: 'CALL', fn: fetchApi, args: [params] }`），Saga 的中间调度器（`middleware/runSaga`）拿到这个描述对象后才是真正执行异步调用，等结果回来后再通过 `.next(result)` 把结果喂回 Generator 内部，让 `yield call(...)` 这一行"看起来像"同步获得了返回值
- 为什么这样设计：如果直接在 effect 里 `await fetchApi()`，虽然写法也是"同步的样子"，但 `await` 后面跟的是真实的 Promise，不方便做测试（每次都要真的 mock 网络请求）和统一的错误处理/取消逻辑；而 `yield call(fetchApi, params)` 只是产出一个"描述"，测试时可以直接断言"这一步 yield 出来的是不是 `call(fetchApi, params)` 这个描述对象"而不需要真的执行网络请求，同时 Saga 中间件可以统一在"真正执行副作用"这一层插入取消（`takeLatest` 自动取消前一个未完成的同类型任务）、并发控制、集中错误处理等能力
- `takeEvery`/`takeLatest` 的区别与实现：`takeEvery` 每次匹配到指定 action 类型都启动一个新的 saga 任务（可能并发多个）；`takeLatest` 每次匹配到时会先取消上一个还没执行完的同类型任务再启动新的（利用 Generator 的 `.return()` 提前终止执行），常用于"搜索框连续输入，只关心最后一次请求结果"的场景（如处方药品检索）
- `dva-loading` 的实现原理：本质是一个"围观所有 effect 的执行状态"的插件，它监听每一个被触发的、类型匹配 `namespace/effectName` 的 action，在 effect 真正开始执行前 dispatch 一个内部的 `showLoading` action 把对应字段设为 `true`，effect 执行完毕（无论成功失败）后 dispatch `hideLoading` 设为 `false`，这些内部 loading 状态被合并进一个独立的 `loading` reducer 命名空间，组件通过 `loading.models.namespace` 或 `loading.effects['namespace/effectName']` 读取，不需要每个 effect 手动维护 loading 字段
- 动态注册模块与代码分割的配合：`app.model()` 本质上是往运行时的 store 上动态挂载一个新的 reducer 分支和注册对应的 saga watcher，配合 `combineReducers` 的动态重组（`store.replaceReducer`）实现"路由懒加载到哪个页面，才把该页面对应的 model 注册进 store"，减少应用启动时的初始状态体积和 saga 监听数量

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. 应用创建与 model 注册：`dva-core/src/index.ts` — `create()` 返回的 app 实例，`model()` 方法把 model 对象推入内部数组
2. model 到 reducer/saga 的转换：`dva-core/src/model.ts` — 把 `reducers` 字段转换为标准 Redux reducer，把 `effects` 字段转换为 Redux-Saga 的 watcher saga
3. effects 转 saga 逻辑：`dva-core/src/getSaga.ts` — 遍历 `effects` 对象，用 `takeEvery`/`takeLatest`（根据配置的 type 后缀 `-loading`/`throttle` 等）包装每个 Generator 函数
4. loading 插件：`dva-loading/src/index.ts` — 监听 action 命名规则自动 dispatch loading 状态变化
5. action 处理辅助：`dva-core/src/handleActions.ts` — 处理 reducer 中 `namespace/actionType` 到具体处理函数的映射

#### 四、生产级最佳实践
- 处方审核流程建模为一个 dva model：`namespace: 'prescriptionReview'`，`effects` 里用 `call` 调用审核接口、`put` 触发列表刷新的 action、`select` 读取当前审核人角色信息做前置校验
- 药品检索输入框的实时搜索用 `takeLatest` 包装对应 effect，避免用户连续输入时旧的请求结果"迟到"覆盖新结果
- 复杂的多步骤业务流程（如"处方开具 -> 药师审核 -> 库房发药"跨多个角色的状态流转）用 effects 串联多个 `call`/`put`，配合 `dva-loading` 让每一步的 loading 态在 UI 上有清晰反馈，不需要手写一堆 `isSubmitting`/`isApproving` 状态字段
- 路由级页面对应的 model 按需动态注册，避免 HIS 系统这种模块众多的大型系统所有 model 在启动时全量加载拖慢首屏
- 编写 effects 时优先用 `select` 从 store 里读取需要的状态，而不是把状态作为参数层层传递，保持 effect 函数职责单一且方便单元测试（mock `select` 的返回值即可，不需要构造复杂的调用参数）

#### 五、手写实现（可独立跑通）
用纯 TypeScript 手写一个"简化版 dva-core"，不依赖真实的 redux-saga，而是实现一个 mini 版的 saga-lite 执行器：支持 Generator 函数的 `yield call(fn, ...args)` 和 `yield put(action)` 两种 effect 描述符的识别和执行（内部用一个循环反复调用 `generator.next(lastResult)` 驱动执行，遇到 `call` 描述符就真正执行对应函数并等待结果，遇到 `put` 描述符就分发一个新 action）。在此基础上实现简化版的 `model()` 注册（把 `reducers` 合并进一个总 reducer，把 `effects` 转换为对特定 action 类型的监听）。用"处方审核流程"（提交审核 -> 调用审核接口 -> 成功后触发列表刷新）作为演示场景跑通整条链路。

#### 六、手写实现源码 GitHub 地址
（写作时填入）

#### 七、参考
- https://github.com/dvajs/dva
- https://redux-saga.js.org/

**面试核心问**：
- dva 在 Redux 之上做了哪些封装？解决了什么痛点？
- Generator 函数配合 Redux-Saga 是怎么让异步代码"看起来像同步"的？`yield call(...)` 具体做了什么？
- `takeEvery` 和 `takeLatest` 的区别是什么？分别适合什么场景？
- `dva-loading` 是怎么自动跟踪 effect 执行状态的，不需要手动维护 loading 字段？
- 动态注册 model 是怎么和路由懒加载配合，减少应用启动开销的？

---

### 第 12 篇：umi 框架原理与工程化实战

**副标题**：约定式路由如何从文件目录"长成"路由表，插件架构如何让框架能力可插拔

#### 一、基本使用
- 约定式路由：在 `pages/` 目录下按文件路径组织页面（如 `pages/patients/[id].tsx` 对应 `/patients/:id`），不需要手写路由配置文件
- `umi.ts`/`.umirc.ts` 配置文件声明构建、路由、插件等配置项
- 插件的引入与使用：`umi-plugin-xxx` 通过 npm 包安装后在配置文件中声明启用，插件可以扩展 CLI 命令、修改路由、注入运行时逻辑
- 微前端场景下用 `@umijs/plugin-qiankun` 将 umi 应用注册为 qiankun 的子应用或主应用，几行配置即可接入微前端体系
- `run-time` 配置能力：在 `app.tsx` 里导出 `render`、`rootContainer`、`onRouteChange` 等运行时钩子，定制应用启动流程

#### 二、原理
- 约定式路由的生成机制：umi 在开发/构建启动时会扫描 `pages/` 目录结构，用 `getRoutes` 遍历文件树，根据文件名和目录层级的约定规则（`[id].tsx` 转动态参数、`index.tsx` 对应目录本身路径、`_layout.tsx` 作为该目录下的嵌套布局）生成一份路由配置数据结构，再据此动态生成实际驱动应用的路由相关代码文件（写入 `.umi` 临时目录，如 `core/route.ts`），这些临时文件里包含真实的 `React.lazy(() => import('...'))` 语句实现按路由自动代码分割
- 为什么约定式路由天然带来自动代码分割：因为路由表生成阶段就已经知道"每个路由对应哪个页面文件"，umi 直接在生成的路由代码里用动态 `import()` 引用对应页面组件，不需要开发者手动写 `lazy(() => import(...))`，这是约定式方案相比手写路由配置的一个隐性收益
- 插件架构的核心设计：umi 内部有一个 `Service` 类作为插件系统的调度中心，启动时会加载所有注册的插件（自带插件 + 用户配置的第三方插件 + 项目本地的 `.umirc.ts` 里的自定义逻辑也会被当作一种"隐式插件"处理），每个插件通过 `api.register('modifyRoutes', fn)`、`api.register('modifyConfig', fn)` 等方式往生命周期的各个"插槽"里注册处理函数
- 生命周期钩子的运行机制：整个 umi 的启动/构建过程被拆解为一系列明确命名的生命周期事件（如 `modifyConfig` 修改最终配置、`modifyRoutes` 修改生成的路由数据、`onGenerateFiles` 在生成临时文件阶段插入自定义文件、`addRuntimePlugin` 往运行时注入额外逻辑），`Service` 在跑到某个阶段时会依次调用所有注册在该钩子上的插件函数，并将上一个插件的输出作为下一个插件的输入（类似一条处理管道），这使得多个插件可以：例如插件 A 修改路由表，插件 B 在此基础上继续追加权限过滤逻辑，而互不干扰、按注册顺序叠加
- `PluginAPI` 的职责：每个插件函数实际拿到的是一个 `PluginAPI` 实例，暴露了 `register`（注册生命周期处理函数）、`registerCommand`（新增 CLI 命令，如 `umi block`）、`onGenerateFiles`、`addEntryImport` 等一系列声明式的扩展点方法，插件开发者不需要关心 `Service` 内部具体怎么调度，只需要在合适的扩展点"挂"上自己的逻辑
- qiankun 微前端集成原理：`@umijs/plugin-qiankun` 作为主应用时，插件会在运行时注入 qiankun 的 `registerMicroApps`/`start` 逻辑，把配置里声明的子应用挂载点接入 umi 生成的路由体系，路由匹配到子应用对应的路径时委托 qiankun 去加载和挂载子应用；作为子应用时，插件会自动导出 qiankun 要求的 `bootstrap`/`mount`/`unmount` 生命周期函数并适配 umi 自身的启动流程，让 umi 应用可以"既能独立运行，又能被父应用当微前端子应用加载"两种模式共存

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. 插件调度核心：`packages/core/src/Service/Service.ts` — `Service` 类的 `init`/`run` 方法，加载插件并按生命周期顺序执行
2. 插件扩展点：`packages/core/src/Service/PluginAPI.ts` — `register`/`registerCommand`/`onGenerateFiles` 等方法定义
3. 路由生成算法：`packages/preset-umi/src/features/route/getRoutes.ts` — 扫描 `pages/` 目录并转换为路由配置树
4. 路由临时文件生成：`packages/preset-umi/src/features/route/tmpFiles.ts` — 将路由配置写入 `.umi` 目录生成真实可执行的路由模块（含动态 `import()`）
5. qiankun 主应用集成：`plugins/plugin-qiankun/src/master.ts`
6. qiankun 子应用集成：`plugins/plugin-qiankun/src/slave.ts`

#### 四、生产级最佳实践
- 大型 HIS 系统按业务域拆分子应用（处方管理、药品库存、患者档案独立成子应用），用 umi + qiankun 搭建微前端主应用，各业务域团队独立开发部署，主应用只负责路由分发和公共布局
- 严格遵循约定式路由的目录规范（`_layout.tsx` 统一处理鉴权布局、`[id].tsx` 处理动态详情页），减少路由配置的手工维护成本，新成员也能快速通过目录结构理解页面层级关系
- 针对权限差异较大的角色（医生/药师/管理员），通过自定义插件在 `modifyRoutes` 钩子里根据角色过滤路由树，而不是运行时组件层面判断，与前一篇 React Router 的权限路由思路一致但实现方式是插件化的
- 复用团队内部约定，把公司通用的请求封装、埋点逻辑等做成内部 umi 插件，通过 `onGenerateFiles`/`addRuntimePlugin` 等钩子统一注入，避免每个项目重复手动集成
- 微前端场景下，主应用和子应用的技术栈/依赖版本尽量保持隔离（如子应用各自打包各自的 React 依赖），避免全局变量污染和样式冲突，qiankun 的沙箱机制提供了基础隔离但复杂共享状态场景仍需谨慎设计

#### 五、手写实现（可独立跑通）
用 Node.js + TypeScript 手写一个迷你版"约定式路由生成器"：扫描一个模拟的 `pages/` 目录结构（用普通文件系统读取真实的示例目录，如 `pages/patients/index.tsx`、`pages/patients/[id].tsx`、`pages/patients/_layout.tsx`），按照"目录层级 -> 路由路径、`[xxx]` 转参数、`_layout` 识别为父级布局"的规则生成一份 JSON 格式的路由配置树并打印到控制台，验证与 umi 真实约定规则一致的核心转换逻辑；在此基础上手写一个极简插件系统：定义一个 `Service` 类维护"生命周期钩子名 -> 处理函数数组"的映射，支持 `register(hookName, fn)` 注册和 `applyHook(hookName, initialValue)` 按顺序执行所有注册函数并把上一个的返回值传给下一个，用一个"路由权限过滤插件"演示如何在生成路由树后追加自定义处理逻辑。

#### 六、手写实现源码 GitHub 地址
（写作时填入）

#### 七、参考
- https://umijs.org/
- https://qiankun.umijs.org/

**面试核心问**：
- umi 的约定式路由是怎么从文件目录"生成"出真实路由代码的？为什么天然带有代码分割能力？
- umi 的插件架构是怎么设计的？`Service`、`PluginAPI`、生命周期钩子三者是什么关系？
- 如果要给 umi 项目加一个"根据角色过滤路由"的能力，你会怎么设计这个插件？
- qiankun 微前端的主应用和子应用分别需要做什么适配？umi 插件是怎么帮你屏蔽这些细节的？
- 约定式路由和 React Router 的显式配置式路由，在团队协作和灵活性上各有什么取舍？

---
### 第 13 篇：React 18 SSR 与 RSC 原理与实战

**副标题**：从 `renderToString` 到 `renderToPipeableStream`，再到 Server Components 把"组件"本身搬到服务端

#### 一、基本使用
- `renderToString`：同步把组件树渲染为 HTML 字符串，是最早期的 SSR 方式，需要等整棵树渲染完才能返回
- `renderToPipeableStream`（Node.js 环境）/ `renderToReadableStream`（Web Streams 环境）：React 18 推荐的流式 SSR API，支持逐步把 HTML 分片发送给浏览器
- `<Suspense fallback={...}>` 在 SSR 场景下的作用：被 Suspense 包裹的子树如果还没准备好（数据未加载完），服务端会先用 `fallback` 占位输出，等真正内容准备好后通过内嵌的 `<script>` 补丁流式替换
- `onShellReady`/`onShellError`/`onAllReady`/`onError` 几个生命周期回调的用途区分：外壳（shell，即页面首屏关键内容）准备好即可开始发送 HTML，不需要等所有 Suspense 边界都完成
- `hydrateRoot(container, <App />)`：客户端接管服务端渲染好的 DOM，绑定事件监听、恢复交互能力，替代旧版 `ReactDOM.hydrate`
- React Server Components（RSC）基本用法（以 Next.js App Router 为载体演示，因为纯 React 18 不内置打包器/路由集成）：默认情况下 `app/` 目录下的组件都是 Server Component，只在服务端执行、不会被打包进客户端 JS；文件顶部写 `"use client"` 指令才会被视为 Client Component，可以使用 `useState`/`useEffect` 等客户端能力
- Server Component 中可以直接 `await` 数据库查询/接口请求（如直接查询"患者档案"数据表），不需要额外的 `useEffect` + `loading` 状态
- Server Component 可以直接把 Client Component 作为子节点渲染（如"患者列表"服务端组件里嵌入一个客户端"收藏按钮"组件），但反过来 Client Component 不能直接 `import` 并渲染 Server Component（只能通过 `children`/props 从外部传入已经渲染好的节点）

#### 二、原理
- `renderToString` 的局限：整个渲染过程是同步、阻塞的，且必须等所有组件（包括依赖异步数据的组件）都渲染完毕才能拿到最终字符串，如果某个组件依赖的数据请求很慢，会拖慢整个页面的首字节时间（TTFB）；此外传统 `hydrate` 也要求整棵树一次性、从上到下完整地完成事件绑定，用户在 hydration 完成前的交互可能丢失或延迟响应
- Fizz 渲染器与流式渲染：React 18 内部把 SSR 渲染器重写为基于"流"的架构（代号 Fizz），渲染过程中一旦遇到 `Suspense` 边界包裹的挂起内容，不会阻塞整体输出，而是先把 `fallback` 占位内容写入流，同时在后台继续渲染真实内容；当真实内容准备好后，Fizz 会在流的后续位置写入一段包含真实 HTML 片段和一小段内联 `<script>` 的补丁，客户端接收到这段补丁后通过脚本把占位内容替换为真实内容——这个过程完全是流式的，不需要重新请求页面
- Selective Hydration（选择性激活）：客户端的 `hydrateRoot` 同样不需要等待整棵树的 HTML 和 JS 都下载完成才开始工作。React 会为每个 `Suspense` 边界独立调度 hydration 任务，如果用户在某个还没完成 hydration 的区域进行了交互（如点击），React 会侵入式地提升该区域的 hydration 优先级，优先完成这部分的事件绑定，即使页面其他部分还没 hydrate 完，这部分也可以立刻响应交互
- 为什么"选择性"很重要：一个典型的场景是页面首屏关键内容（如"医生工作台"的患者列表和核心操作按钮）优先 hydrate 完成即可交互，而页面下方的次要模块（如统计图表、历史记录侧栏，通常用 `Suspense` 包裹并做代码分割）可以延后 hydrate，不阻塞用户与核心功能的交互，这比"整页要等全部 hydrate 完才能点任何东西"的旧模型体验好得多
- `onShellReady` 与"外壳"概念："shell"指的是页面不依赖任何异步数据、可以立刻渲染出来的部分（通常是布局骨架 + 关键但同步的内容），`onShellReady` 触发时意味着这部分已经可以发送给浏览器展示，不需要等待所有异步数据加载完成；而 `onAllReady` 则要等到整棵树（包括所有 Suspense 边界的真实内容）全部渲染完成，通常用于对 SEO 更敏感、需要完整 HTML 的场景（如搜索引擎爬虫请求）
- hydration 不匹配问题的原理：如果服务端渲染出的 HTML 结构和客户端首次渲染的结果不一致（常见于使用了 `Date.now()`、`Math.random()`、依赖 `window` 对象等在服务端和客户端表现不同的代码），React 在 hydrate 阶段会检测到 DOM 结构与预期不符，触发警告并在开发模式下回退到客户端重新渲染该部分，这也是为什么涉及时间、随机数、浏览器专有 API 的逻辑要小心处理"服务端渲染值"和"客户端渲染值"的一致性；React 18 新增的 `useId` 正是为了从源头上规避这类问题（见第 02 篇）
- RSC 与传统 SSR 的本质区别：传统 SSR（包括 Fizz 流式渲染）解决的是"首屏 HTML 谁来生成"的问题——组件代码本身仍然会被打包进客户端 JS，服务端只是提前跑一次渲染换取更快的首屏内容和 SEO；RSC 解决的是"组件代码本身要不要打包到客户端"的问题——Server Component 的代码永远只在服务端执行，不会出现在客户端 bundle 里，能够直接访问数据库/文件系统等服务端资源，也天然不会增加客户端 JS 体积。两者可以叠加使用：RSC 渲染出的结果本质上是一段可序列化的"描述"，仍然要经过类似 Fizz 的流式渲染管线才能变成发给浏览器的 HTML
- RSC 的序列化机制：Server Component 渲染的输出不是普通的 HTML 字符串，而是一种特殊的序列化格式（RSC Payload），其中会把"需要交给客户端处理的部分"（Client Component 的引用及其 props）编码成特殊的占位标记；客户端拿到这份 payload 后，通过 React 提供的运行时（`react-server-dom-webpack`/`react-server-dom-turbopack` 等打包器专属实现）解析出"哪些位置该渲染哪个 Client Component"，再用本地已加载的 Client Component 代码去填充这些占位——这也是为什么 Server Component 不能被 Client Component 直接 `import` 渲染：Server Component 从未真正"发送"给客户端，客户端拿到的只是它渲染后的结果序列化数据，不存在可以被导入的组件函数
- "边界"设计的意义：`"use client"` 指令标记的不是"这个文件是客户端代码"，而是"以这个模块为起点，向下的整棵子树在打包时要被切到客户端 bundle 里"；这条边界通常应该尽量下沉到叶子节点（只把真正需要交互状态的部分标记为 Client Component，如上面提到的"收藏按钮"），而不是在顶层组件就整体标记，否则会让本该留在服务端的大量静态展示逻辑也被迫打包到客户端，削弱 RSC 减少客户端 JS 体积的优势
- 对比 Vue 3 生态：Vue 3 目前的官方生态（Nuxt 3）主要提供的是"传统 SSR + 岛屏/Islands 架构的实验性支持"，没有与 RSC 完全对等的"组件级别永不打包到客户端"机制；这是目前 React 生态在架构复杂度上领先但也更难理解的一个特有分支，学习时不需要强行找 Vue 3 的对应物，理解为"React 独有的一种服务端组件模型"更准确

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. 流式渲染入口（Node 环境）：`packages/react-dom/src/server/ReactDOMFizzServerNode.js` — `renderToPipeableStream` 的实现，管理流的生命周期回调
2. Fizz 渲染核心：`packages/react-server/src/ReactFizzServer.js` — 渲染过程中遇到 Suspense 边界的挂起处理、补丁片段生成逻辑
3. 客户端接管入口：`packages/react-dom/src/client/ReactDOMRoot.js` — `hydrateRoot` 的实现
4. Selective Hydration 调度：`packages/react-reconciler/src/ReactFiberHydrationContext.js` — 按 Suspense 边界独立调度 hydration 任务、响应用户交互提升优先级的逻辑
5. RSC 序列化与解析（概览级介绍，来源 `facebook/react` 仓库）：`packages/react-server/src/ReactFlightServer.js` — Server Component 渲染为 Flight Payload 的核心逻辑；`packages/react-client/src/ReactFlightClient.js` — 客户端解析 Flight Payload 并还原为可渲染树

#### 四、生产级最佳实践
- 医生工作台首页用 `renderToPipeableStream`，核心的"待诊患者列表"和"快捷操作栏"作为 shell 部分优先渲染发送，次要的"科室公告"、"统计图表"用 `Suspense` 包裹延后加载，缩短用户感知到的首屏可交互时间
- 涉及患者隐私数据的接口不要在 SSR 阶段直接暴露在 HTML 源码中的注释或调试信息里，服务端渲染过程要和普通接口一样做好数据脱敏
- 涉及 `Date.now()`、`Math.random()`、`localStorage` 等在服务端不可用或结果不一致的逻辑，明确区分"仅客户端执行"的代码路径（如用 `useEffect` 延迟到客户端 hydrate 后才执行），避免 hydration 不匹配警告
- 对 SEO 有强需求的页面（如面向患者的科普内容页）优先保证 `onShellReady` 尽快触发；对纯内部管理系统页面（医生/管理员使用，不需要 SEO），可以更激进地把非核心内容都用 `Suspense` 延后
- 排查 hydration 报错时，先检查是否存在服务端和客户端渲染条件分支不一致（如根据 `typeof window` 判断的渲染逻辑），这是最常见的不匹配来源
- 医院管理系统若采用 Next.js App Router：患者档案、药品目录这类"读多写少、几乎不需要客户端交互"的详情展示页尽量写成 Server Component 直接查询数据，只把"收藏"、"打印"等按钮这类真正需要交互状态的小组件标记 `"use client"`，最大化减少客户端 JS 体积
- 涉及患者隐私数据的查询逻辑放在 Server Component 里执行，数据库连接字符串、内部服务凭证等敏感信息不会被打包进客户端代码，比"客户端发请求、服务端 API 做鉴权"的传统模式在减少敏感信息暴露面上更进一步
- 谨慎评估把"use client"边界放在哪一层：不要因为页面里有一个交互按钮就把整个页面顶层组件标记为 Client Component，尽量让边界下沉到最小的交互单元

#### 五、手写实现（可独立跑通）
用 Express + React 18 + TypeScript 搭建一个"医生工作台"SSR demo：服务端用 `renderToPipeableStream` 渲染页面，"待诊患者列表"作为 shell 立即输出，"最近处方统计图表"组件包裹在 `Suspense` 中并故意加一个 2 秒延迟的模拟异步数据请求，观察浏览器网络面板中 HTML 是分片到达的（先看到列表和骨架屏，2 秒后图表区域被脚本补丁替换为真实内容）；客户端用 `hydrateRoot` 接管，验证列表区域在图表还没 hydrate 完成时依然可以正常点击交互。RSC 部分因为依赖打包器集成（Webpack/Turbopack 的 Flight loader），不适合脱离框架手写完整实现，改为用一个最小化的 Next.js App Router demo 演示："患者列表"页面写成 Server Component 直接读取本地模拟数据（不经过任何 API 请求），内嵌一个标记 `"use client"` 的"收藏"按钮组件，用浏览器 DevTools 的 Network 面板对比该页面客户端 JS 体积与"整页改写成 Client Component"版本的体积差异，直观感受 RSC 减少客户端 JS 的效果。

#### 六、手写实现源码 GitHub 地址
（写作时填入）

#### 七、参考
- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://nextjs.org/docs/app/building-your-application/rendering/server-components

**面试核心问**：
- `renderToString` 和 `renderToPipeableStream` 的本质区别是什么？分别适合什么场景？
- Selective Hydration 解决了什么问题？为什么它比"整页等全部 hydrate 完成"体验更好？
- `onShellReady` 和 `onAllReady` 的触发时机分别是什么？分别应该在什么场景使用？
- SSR 场景下 hydration 不匹配问题通常是怎么产生的？如何排查和规避？
- `Suspense` 在 SSR 和在纯客户端渲染场景下的作用有什么相通和不同之处？
- RSC 和传统 SSR 解决的是同一个问题吗？两者可以叠加使用还是互相替代？
- 为什么 Client Component 不能直接 `import` 并渲染 Server Component？
- `"use client"` 指令的边界应该放在哪一层比较合适？放得太靠上会有什么代价？

---

### 第 14 篇：React 18 性能优化全攻略

**副标题**：从 `memo`/`useMemo` 到虚拟列表和 Transition Lane 调优，一套系统化的性能问题排查方法论

#### 一、基本使用
- `React.memo(Component)`：包裹函数组件，props 没有变化（默认浅比较）时跳过重渲染
- `useMemo(factory, deps)`：缓存计算结果，依赖不变时不重新计算
- `useCallback(fn, deps)`：缓存函数引用，配合 `memo` 组件避免因为父组件重渲染导致子组件因为"函数 prop 引用变了"而跟着重渲染
- 虚拟列表（`react-window`/`@tanstack/react-virtual`）：只渲染可视区域内的列表项，滚动时动态计算并替换渲染内容
- `React.lazy` + `Suspense`：组件级代码分割，减少首屏 JS 体积
- `useTransition`/`useDeferredValue`：把非紧急的渲染工作标记为低优先级，避免阻塞用户输入交互
- React DevTools Profiler：录制渲染过程，分析每次渲染中各组件的耗时和触发原因

#### 二、原理
- `memo` 的浅比较机制：默认对比新旧 props 对象的每一个 key，用 `Object.is` 逐一比较值是否相同（浅比较，只比较第一层），只要有一个 key 的值不同就认为 props 变化，会重新渲染；可以传入第二个参数自定义比较函数替代默认浅比较逻辑
- `useMemo`/`useCallback` 的依赖比较：内部同样用 `Object.is` 逐一比较依赖数组中每一项与上一次渲染时的对应项，只要有一项不同就重新执行 `factory`/返回新的函数引用，否则复用上一次的缓存值/函数引用；这解释了为什么依赖数组里的对象/数组类型的字面量会导致"每次都判定为不同"（因为字面量每次渲染都是新对象，引用比较必然不等）
- 虚拟列表的核心原理：真实 DOM 只渲染当前可视区域（viewport）内可见的少数列表项，通过监听滚动事件（或者 `IntersectionObserver`）动态计算"当前应该显示第几项到第几项"，用一个足够高的占位容器（`total * itemHeight`）撑起完整的滚动高度，可视区域外的内容不渲染真实 DOM 节点，从而把"渲染 1 万条数据"的开销降低到"渲染当前可见的十几条"，避免大量 DOM 节点导致的内存占用和渲染耗时问题
- `React.lazy` 的实现：`lazy(() => import('./Component'))` 返回一个特殊的组件类型，其内部持有一个"惰性初始化的 thenable"，当 React 渲染到这个组件时，如果对应的 `import()` Promise 还没 resolve，会像 Suspense 挂起机制处理其他异步场景一样抛出这个 Promise，被最近的 `Suspense` 边界捕获并展示 `fallback`；Promise resolve（也就是异步 chunk 加载完成）后触发重渲染，此时真正拿到组件定义并渲染
- `useTransition`/`useDeferredValue` 的调优原理：两者都是把某段更新标记为 `TransitionLane`（回顾第 05 篇的 Lane 模型），使其可以被更高优先级的更新（如用户的下一次输入）打断和重新调度；`useDeferredValue(value)` 的具体机制是内部维护一个"滞后值"的 state，正常渲染时立刻返回上一次的旧值，同时在后台用 `TransitionLane` 调度一次"更新为最新值"的渲染，这次渲染由于优先级较低可以被打断，实现"输入框实时响应、派生内容滞后跟随"的效果
- 性能优化的系统化排查方法论：先用 Profiler 录制确认"到底是谁在重渲染、渲染耗时多少"，区分"渲染次数过多"（用 `memo`/`useMemo`/`useCallback`/拆分 Context 解决）和"单次渲染耗时过长"（用虚拟列表减少节点数量，或者用 `useTransition` 把耗时渲染降级为可中断任务），避免不看数据就"到处加 `useMemo`"的盲目优化（`useMemo` 本身也有比较依赖数组的开销，滥用反而可能得不偿失）

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. `memo` 的比较逻辑：`packages/react/src/ReactMemo.js` 与 `packages/shared/src/shallowEqual.js` — 默认浅比较的具体实现
2. `useMemo`/`useCallback` 依赖比较：`packages/react-reconciler/src/ReactFiberHooks.js` — `areHookInputsEqual` 逐项 `Object.is` 比较
3. `useTransition` 的 lane 调度：`packages/react-reconciler/src/ReactFiberHooks.js` — `mountTransition`/`updateTransition` 中如何标记 `TransitionLane`
4. `React.lazy` 挂起机制：`packages/react/src/ReactLazy.js` — 惰性组件的 thenable 状态机（pending/resolved/rejected）
5. Lane 优先级对比：`packages/react-reconciler/src/ReactFiberLane.js`（与第 05 篇联动理解）

#### 四、生产级最佳实践
- 万级药品目录列表用虚拟列表方案（固定高度用 `react-window`，不定高度用 `@tanstack/react-virtual`），避免一次性渲染上万个 DOM 节点导致页面卡顿
- 医生工作站的大表单（如详细病历录入）中，把不涉及当前输入字段的展示型子组件用 `memo` 包裹，配合 `useCallback` 稳定传给子组件的回调函数引用，减少不相关字段联动重渲染
- 药品说明书详情页面、统计报表页面等非首屏关键路径用 `React.lazy` 做路由级/组件级代码分割
- 处方检索输入框结合 `useDeferredValue` 让搜索结果列表滞后渲染，保证输入本身流畅，避免每次按键都触发一次全量列表重新渲染卡顿输入
- 优化前先用 Profiler 量化问题（具体是哪个组件、渲染耗时多少、渲染原因是什占什么），有数据支撑再决定优化手段，避免凭直觉到处套用 `memo`/`useMemo` 增加代码复杂度却收益甚微

#### 五、手写实现（可独立跑通）
用 Vite + TypeScript + React 18 实现一个固定高度虚拟列表组件（不依赖 `react-window`）：接收 `itemHeight`、`totalCount`、`renderItem` 等 props，内部通过监听容器的 `scroll` 事件计算当前应该渲染的起始/结束索引，用一个撑高的空容器 + `transform: translateY` 定位可见区域的真实渲染项，用"万级药品目录"模拟数据演示流畅滚动的效果，并和"不做虚拟化直接渲染全部万级节点"的版本做一个 Profiler 录制对比，直观展示渲染耗时和内存占用的差异。

#### 六、手写实现源码 GitHub 地址
（写作时填入）

#### 七、参考
- https://zh-hans.react.dev/
- https://github.com/bvaughn/react-window
- https://tanstack.com/virtual

**面试核心问**：
- `memo`、`useMemo`、`useCallback` 三者各自解决什么问题？滥用会有什么代价？
- 虚拟列表的核心原理是什么？它是怎么在保持滚动条完整高度的前提下只渲染可视区域内容的？
- `React.lazy` 是怎么和 `Suspense` 配合实现代码分割的？内部的挂起机制是什么？
- `useDeferredValue` 具体是怎么实现"输入流畅、结果滞后"效果的？和 debounce/throttle 有什么本质区别？
- 系统化排查 React 性能问题的思路是什么？怎么避免"盲目加 memo"式的优化？

---

### 第 15 篇：ahooks 源码解析与自定义 Hook 设计模式

**副标题**：`useRequest` 的插件化架构，一个请求 Hook 是怎么长成"请求引擎"的

#### 一、基本使用
- `useRequest(service)`：最基础用法，自动发起请求并返回 `{ data, loading, error, run, refresh }` 等状态和方法
- `manual: true`：手动模式，不自动发起请求，需要主动调用 `run`（常用于表单提交类请求）
- `onSuccess`/`onError`：请求成功/失败的回调
- 防抖/节流配置：`debounceWait`/`throttleWait` 直接通过配置项声明，不需要额外手写防抖节流逻辑
- 轮询：`pollingInterval` 声明式配置轮询间隔，配合 `pollingWhenHidden: false` 控制页面不可见时是否继续轮询
- 缓存与 SWR：`cacheKey` 声明缓存标识，相同 key 的请求可以复用缓存数据并支持 stale-while-revalidate 策略
- 请求竞态处理：默认情况下如果同一个 `useRequest` 实例连续触发多次请求，只有最后一次请求的结果会被采用，早前请求的结果会被丢弃

#### 二、原理
- 插件化架构设计：`useRequest` 本身的核心逻辑非常精简（创建一个 `Fetch` 类实例，管理请求生命周期），几乎所有"高级功能"（防抖、节流、轮询、缓存、竞态处理、自动重试、加载延迟等）都是以"插件"的形式挂载上去的，每个插件本质上是一个自定义 Hook，接收 `Fetch` 实例并返回一组"生命周期钩子"（如 `onBefore`、`onRequest`、`onSuccess`、`onError`、`onFinally`），`useRequest` 内部按顺序执行所有插件返回的对应生命周期钩子，插件之间通过约定的钩子签名协作而不直接耦合
- `Fetch` 类的职责：封装了"发起一次请求"的完整生命周期管理——维护 `loading`/`data`/`error` 状态，提供 `run`/`cancel`/`refresh` 等方法，在请求真正发出前后依次调用注册在各个生命周期钩子上的插件逻辑；`useRequest` 只是这个类在 React 组件生命周期里的一层绑定（用 `useState`/`useRef` 保持 `Fetch` 实例，用 `useEffect` 处理挂载卸载）
- 请求竞态处理的实现：每次调用 `run` 触发新请求时，`Fetch` 内部会生成一个自增的请求 id（`fetchId`）并记录为"当前最新请求"，当某次请求的异步结果返回时，先检查这个结果对应的 `fetchId` 是否仍然等于"当前最新请求 id"，如果不是（说明中途又发起了新请求），就丢弃这个过期结果，不更新状态——这是一种比"取消上一个请求"更轻量的竞态处理方式，不依赖 `AbortController`，对不支持取消的请求方式（如某些第三方 SDK）也能生效
- SWR 缓存策略的实现：`cacheKey` 相同的多个 `useRequest` 实例共享同一份缓存数据（存储在一个模块级的 Map 中），当组件挂载发起请求时，如果缓存中已有数据，会先立刻用缓存数据填充 `data`（stale，展示旧数据不等待），同时在后台静默发起一次新请求（revalidate），新数据回来后更新缓存和所有订阅了该 `cacheKey` 的组件状态，这样用户视觉上几乎没有 loading 空白期，同时数据能保持最终一致
- 自动重试的实现：`retryCount`/`retryInterval` 配置的插件在 `onError` 钩子里判断当前重试次数是否还有余量，若有则用指数退避（每次重试间隔翻倍，或按配置的固定间隔）延迟调度下一次 `run` 调用，直到成功或用尽重试次数
- 自定义 Hook 设计模式的一般性总结：ahooks 的这套"核心状态机 + 插件挂载生命周期钩子"模式，本质上是把"一个功能大而全的 Hook"拆解为"一个小核心 + 多个可插拔能力模块"，这个设计思路可以推广到任何需要"渐进增强、按需组合"的自定义 Hook 设计中（如一个通用的表单 Hook、一个通用的 WebSocket 连接 Hook），核心是先定义清楚"生命周期钩子有哪些"，再让每个能力独立实现这些钩子而不相互耦合

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. useRequest 入口：`packages/hooks/src/useRequest/src/useRequest.ts` — 组装 `Fetch` 实例和所有插件
2. Fetch 核心类：`packages/hooks/src/useRequest/src/Fetch.ts` — 请求生命周期管理、竞态处理的 `fetchId` 机制
3. 插件机制约定：`packages/hooks/src/useRequest/src/utils/composeMiddleware.ts` / 插件类型定义（生命周期钩子签名）
4. 缓存插件：`packages/hooks/src/useRequest/src/plugins/useCachePlugin.ts` — SWR 策略、跨组件共享缓存的实现
5. 重试插件：`packages/hooks/src/useRequest/src/plugins/useRetryPlugin.ts` — 指数退避重试逻辑

#### 四、生产级最佳实践
- 处方列表查询用 `useRequest` 默认自动请求 + `refreshDeps` 声明依赖（筛选条件变化自动重新请求），避免手写 `useEffect` + 依赖数组的重复模式
- 提交类操作（新建处方、审核操作）用 `manual: true` + 表单提交时手动 `run`，配合 `onSuccess` 里做跳转或提示，`onError` 里统一处理错误提示
- 患者搜索输入框配置 `debounceWait` 直接声明式防抖，替代手写 `useMemo` + `debounce` 的组合写法
- 需要准实时更新的数据（如药房库存看板）用 `pollingInterval` 声明式轮询，配合 `pollingWhenHidden: false` 页面不在前台时自动停止轮询节省资源
- 多个页面/组件共享同一份数据（如当前登录医生的基础信息）用相同的 `cacheKey`，避免同一份数据在不同组件里各自发起重复请求

#### 五、手写实现（可独立跑通）
用 TypeScript 手写一个简化版 `useRequest`：核心是一个 `Fetch` 类维护 `loading`/`data`/`error` 状态和一个自增 `fetchId` 做竞态处理；在此基础上实现两个简化插件——一个"防抖插件"（包装 `run` 方法，在指定延迟内多次调用只执行最后一次）、一个"简单缓存插件"（基于模块级 Map，相同 `cacheKey` 的多个组件实例共享数据并在有新数据时通知所有订阅者更新）。用"处方列表查询"场景演示：模拟一个有延迟的请求函数，验证连续调用多次 `run` 时只有最后一次结果生效，以及两个使用相同 `cacheKey` 的组件实例之间数据是如何同步的。

#### 六、手写实现源码 GitHub 地址
（写作时填入）

#### 七、参考
- https://ahooks.js.org/
- https://swr.vercel.app/

**面试核心问**：
- `useRequest` 的插件化架构是怎么设计的？核心状态机和插件之间是怎么协作的？
- 请求竞态问题是怎么产生的？ahooks 是怎么用 `fetchId` 机制解决的，相比 `AbortController` 取消请求有什么优劣？
- SWR 缓存策略的核心思想是什么？"先展示旧数据、后台悄悄更新"这个模式解决了什么用户体验问题？
- 如果要设计一个通用的自定义 Hook（不只是请求场景），怎么借鉴 ahooks 的插件化思路做到"渐进增强"？
- 自动重试的指数退避策略是怎么实现的？为什么不用固定间隔重试？

---

### 第 16 篇：Turborepo + pnpm + Vite + React 18 通用后台管理系统从零搭建

**副标题**：把前 15 篇的知识点串起来，搭一套可以直接拿去用的医院管理系统脚手架

#### 一、基本使用
- 目录结构规划：`apps/`（具体应用，如 `admin` 后台管理系统）、`packages/`（共享包，如 `ui` 组件库、`utils` 工具函数、`request` 请求封装）的 Monorepo 布局
- `pnpm-workspace.yaml` 声明工作区范围，`turbo.json` 声明任务依赖图（如 `build` 依赖所有上游包先 `build` 完成）
- Vite 创建 React 18 + TypeScript 项目模板，配置路径别名、环境变量、代理转发本地 API
- 集成 Ant Design（或其他组件库）搭建后台管理系统的整体布局（侧边栏导航、顶部栏、面包屑）
- 集成 React Router 6/7 做页面路由，集成状态管理方案（结合选型结论）搭建全局状态层

#### 二、原理
- Turborepo 的任务图与缓存机制：`turbo.json` 里声明的 `pipeline`（新版本叫 `tasks`）描述了任务之间的依赖关系（如 `"build": { "dependsOn": ["^build"] }` 表示要先构建完所有上游依赖包），Turborepo 据此构建一个有向无环任务图，按依赖顺序调度执行；每个任务执行前会基于"输入文件内容 + 依赖的环境变量 + 任务命令本身"计算一个哈希值，如果这个哈希值在缓存中已经存在（无论是本地缓存还是团队共享的远程缓存），直接复用之前的执行结果（如构建产物、日志输出）而不重新执行，这是 Monorepo 下"改一个包只重新构建真正受影响的部分"的性能基础
- pnpm workspace 的依赖管理原理：pnpm 用一个全局的"内容寻址存储"（content-addressable store）保存所有版本的包，工作区内每个包的 `node_modules` 中通过符号链接（symlink）指向这个全局存储，同一个包的同一个版本在磁盘上只保存一份物理拷贝，大幅减少多包共享依赖时的磁盘占用；同时 pnpm 默认的"非扁平化"`node_modules` 结构（每个包只能访问自己 `package.json` 里声明过的依赖，通过符号链接严格限制访问范围）避免了"幽灵依赖"问题（代码里用到了一个没有在自己 `package.json` 里声明、但因为被其他包间接安装到了 `node_modules` 顶层而"意外能用"的包，这种隐式依赖在依赖关系变化时容易突然报错）
- Vite 的开发体验优化原理：开发环境下 Vite 基于浏览器原生 ES Module 直接按需编译单个文件（不需要像 Webpack 那样先打包整个依赖图才能启动），配合 esbuild（用 Go 编写，比 JS 实现的转译工具快一到两个数量级）做第三方依赖的预构建（pre-bundling，把 CommonJS/多文件的第三方包预先转换成单个 ESM 文件，减少浏览器请求数量和模块解析开销）；HMR（热更新）方面 React 生态用 `@vitejs/plugin-react` 的 Fast Refresh 能力，修改组件代码后只替换该组件模块并尽量保留组件状态，不需要整页刷新
- Monorepo 下状态管理选型的落地考量（承接第 09-11 篇的选型结论）：本项目搭建的"医院管理系统"后台涉及多角色协作（医生站、药师站、管理员站共享同一套基础框架但各自维护业务模块），状态变化需要在团队协作中保持可追踪、可回放、便于排查问题（如"这条处方数据为什么变成了这个状态，是哪个操作触发的"），因此最终选择 **Redux Toolkit** 作为全局状态管理方案：相比 MobX 的隐式响应式，RTK 的显式 action/reducer 更适合大团队协作时"看 action 日志就能定位问题"的排查需求；相比 dva 的约定式封装，RTK 更贴近社区主流、生态和 TypeScript 支持更成熟，不需要额外学习 Generator/Saga 的心智负担；具体对比见下表

**Redux Toolkit / MobX / dva 选型对比表**

| 维度 | Redux Toolkit | MobX | dva |
|------|---------------|------|-----|
| 学习成本 | 中等，需理解 action/reducer/immer | 较低，接近面向对象直觉写法 | 较高，需理解 Generator/Saga |
| 样板代码量 | 较少（RTK 已大幅简化早期 Redux 的冗余） | 最少 | 中等（model 约定式但仍有固定结构） |
| TypeScript 支持 | 优秀，官方深度支持，类型推导完善 | 良好，但类过多继承场景类型稍复杂 | 一般，社区类型定义存在滞后 |
| 适用团队规模 | 大团队协作、强调可追踪可预测 | 中小团队、逻辑偏面向对象建模 | 中大团队、约定式统一规范的场景 |
| 生态成熟度 | 非常成熟，DevTools/中间件生态丰富 | 成熟但相对小众 | 依赖社区维护活跃度，更新较慢 |

> 结论：医院管理系统涉及多角色、多团队协作，对状态可追溯性要求高，最终选择 **Redux Toolkit + RTK Query** 作为本脚手架的默认状态管理方案。

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. Turborepo 任务调度：`turborepo` 仓库 `crates/turborepo-lib/src/run/` 下任务图构建与调度相关代码（概览级介绍，不逐行展开）
2. Turborepo 缓存哈希计算：`crates/turborepo-lib/src/task_hash.rs`（概览级介绍）
3. pnpm 的内容寻址存储：`pnpm` 仓库 `packages/store/`、`packages/package-store/` 相关实现（概览级介绍）
4. Vite 预构建：`vite` 仓库 `packages/vite/src/node/optimizer/index.ts` — 依赖预构建的入口逻辑（概览级介绍）

> 说明：本篇聚焦"工程化整合与选型落地"，源码解析部分以理解核心机制为主，不逐行深入到 Rust/Go 实现细节，重点仍是第 01-15 篇已深入讲解的 React 生态自身源码。

#### 四、生产级最佳实践
- Monorepo 中 `packages/ui` 组件库、`packages/request` 请求封装、`packages/utils` 工具函数独立版本管理，`apps/admin` 后台应用通过 workspace 协议引用，本地修改立刻生效不需要发包调试
- `turbo.json` 中合理声明任务的 `inputs`/`outputs`，确保缓存判断的准确性（该重新构建时不会因为缓存命中被跳过，该复用缓存时不会误判为需要重新构建）
- CI 流水线中启用 Turborepo 远程缓存，团队成员之间、CI 和本地之间共享构建缓存，减少重复构建耗时
- Vite 生产构建时合理配置 `build.rollupOptions.output.manualChunks` 做代码分割策略（区分第三方库、公共组件、各业务模块），配合前面 React.lazy 路由级分割，控制单个 chunk 体积
- 后台管理系统的权限路由、请求封装、错误处理等通用能力下沉到 `packages/` 共享包，各业务模块（处方管理、药品库存、患者档案）只关注自身业务逻辑，减少重复代码

#### 五、手写实现（可独立跑通）
搭建一个完整可运行的 Monorepo 脚手架：`pnpm-workspace.yaml` + `turbo.json` 配置好任务依赖图；`packages/ui` 提供几个基础组件（如 `Table`、`Form` 的业务封装）；`packages/request` 封装统一的请求实例（含拦截器、错误处理）；`apps/admin` 用 Vite + React 18 + TypeScript + React Router 6/7 + Redux Toolkit + RTK Query + Ant Design 搭建"医院管理系统"后台，包含登录页、患者列表页（RTK Query 拉取数据 + 虚拟列表展示）、处方审核页（Redux Toolkit 管理审核状态机，串联第 09 篇手写的状态管理心智模型）三个核心页面，验证整套工具链从开发到构建的完整流程可以跑通。

#### 六、手写实现源码 GitHub 地址
（写作时填入）

#### 七、参考
- https://turbo.build/repo/docs
- https://pnpm.io/
- https://vitejs.dev/
- https://redux.js.org/
- https://mobx.js.org/
- https://github.com/dvajs/dva
- https://umijs.org/

**面试核心问**：
- Turborepo 的缓存机制是怎么判断"任务是否需要重新执行"的？远程缓存解决了什么协作问题？
- pnpm 的符号链接结构是怎么避免"幽灵依赖"问题的？和 npm/yarn 的扁平化 `node_modules` 相比优劣是什么？
- Vite 的开发环境为什么比 Webpack 启动更快？esbuild 预构建具体做了什么？
- 如果让你在 Redux Toolkit、MobX、dva 之间给一个多团队协作的中大型后台系统选型，你会怎么权衡？
- Monorepo 下多个包之间的本地联调是怎么做到"改了就生效、不需要发包"的？

---

## 参考链接（每篇末尾统一引用池）

```
https://zh-hans.react.dev/
https://jonny-wei.github.io/blog/react/
https://react.iamkasong.com
https://pomb.us/build-your-own-react/
https://github.com/wbccb/Frontend-Articles
https://nextjs.org/
https://reactrouter.com/
https://redux.js.org/
https://mobx.js.org/README.html
https://github.com/dvajs/dva
https://umijs.org/
https://ahooks.js.org/
```

- `react.dev`（中文站）：官方文档，Hooks 基本用法、并发特性说明，覆盖第 01/02/05/06/07/14 篇
- `jonny-wei.github.io/blog/react`、`react.iamkasong.com`：React 源码系列博客，Fiber/Diff/Hooks/Scheduler 源码解读参考，覆盖第 03/04/05/06 篇
- `pomb.us/build-your-own-react`：Fiber 极简手写实现（Didact），第 03 篇「手写实现」章节的核心参照
- `github.com/wbccb/Frontend-Articles`：源码解析文章合集，作为源码解析章节的补充交叉验证素材（沿用 Vue 3 系列同作者笔记的引用惯例）
- `nextjs.org`：第 13 篇 SSR/流式渲染/RSC 的生产级实践参照（App Router、`renderToPipeableStream`、Server Components 生产用法）
- `reactrouter.com`：第 08 篇 Data Router 权威文档
- `redux.js.org`：第 09 篇 Redux + Redux Toolkit 权威文档
- `mobx.js.org`：第 10 篇 MobX 权威文档
- `github.com/dvajs/dva`：第 11 篇 dva.js 源码与文档
- `umijs.org`：第 12 篇 umi 权威文档
- `ahooks.js.org`：第 15 篇 ahooks 权威文档与源码

> 引用要求延续 Vue 3 系列规范：正文中不出现具体博主名/账号名/人名，仅在文末参考池中列 URL；源码解析章节标注的源文件路径以 React 官方仓库（`facebook/react`）目录结构为准，与上述博客的版本号如有差异需在写作时核对当前 React 版本（18.x）。

---

*规划时间：2026-08-27 | 参考：React 官方文档 / React 18 源码 / React Router / Redux / MobX / dva / umi 官方文档*
