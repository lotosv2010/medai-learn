# React 18 全家桶系列公众号文章大纲（重构版）

> 所属系列：React 18 深度拆解
> 写作原则：基本使用 → 原理 → 源码解析（重点代码，来源 GitHub 仓库）→ 生产级最佳实践 → 手写实现 → GitHub → 参考
> 目标读者：5-10 年前端经验、有 Vue 全家桶背景、正在转型或补齐 React 技术栈、备战面试或寻求晋升为 AI 应用工程师的工程师
> 与 Vue 3 系列关系：结构对称，涉及响应式/渲染/组件通信等可对照的知识点会显式标注「对比 Vue 3」

---

## 系列定位

**「React 18 全家桶深度拆解」系列（重构版）**

- 篇数：14 篇（React 18 核心原理 9 篇 + 生态与工程化 5 篇）
- 核心主线：设计思想与架构 → 状态更新与批处理（Update/Lane 模型）→ Fiber 渲染原理（mount/update/unmount + bailout）→ Diff 算法 → commit 阶段与副作用系统 → Hooks 全解析（使用 + 设计哲学 + 源码）→ 并发特性与调度器（Suspense）→ 事件系统 → Context → React Router → 状态管理选型 → SSR/RSC → 性能优化 → Monorepo 通用后台管理系统
- 主线对齐 Vue 3 系列的递进节奏：设计思想 → 响应式 → 渲染/Diff → 组件渲染 → Composition API → 内置组件 → 编译优化，对应 React 的 设计思想 → 状态更新 → 渲染/Diff → commit 阶段 → Hooks → 并发特性；两条主线都遵循"是什么 → 怎么运作 → 怎么用 → 怎么用得高级"的节奏，不再是知识点的平铺罗列
- 相比第一版大纲的结构调整：
  1. Hooks 的「基本使用」与「源码解析」合并为一篇，不再被架构/渲染主线打断
  2. 拆出独立的 Diff 算法篇（04）和 commit 阶段/副作用系统篇（05），让渲染主线的颗粒度对齐 Vue 3 系列的"渲染原理→组件渲染"两篇
  3. 状态管理生态原四篇（Redux/MobX/dva/umi）合并为一篇：Redux Toolkit 为主线，MobX/Zustand 降级为对比小节，dva 降级为"历史方案"小节，umi 的约定式路由内容降级并入 Router 篇
  4. 原 ahooks 独立篇降级为后台管理系统篇里的"自定义 Hook 设计模式"小节
  5. 补齐面试高频源码缺口：Class 组件 Update 机制、beginWork 的 bailout 复用判断、effect 执行顺序原则、useInsertionEffect、useSyncExternalStore 与 tearing、事件类型与 Lane 的绑定关系、优先级饿死与兜底、自定义渲染器实战、源码调试环境搭建
- 内容结构：延续七段式（基本使用 → 原理 → 源码解析 → 生产级最佳实践 → 手写实现 → GitHub → 参考）
- 特色：每篇 3-5 个「面试官会问」；示例沿用医疗场景命名（药品/处方/患者）；涉及可与 Vue 3 对照的知识点显式标注「对比 Vue 3」
- 不设独立 TypeScript 篇：类型系统内容按场景拆分到 Hooks 篇（自定义 Hook 类型设计）、状态管理篇（RTK 类型推导）、Router 篇（loader/action 类型）、后台管理系统篇（类型消费实战）

---

## 文章规划总览

| 编号 | 标题 | 核心主题 | 状态 |
|------|------|----------|------|
| 01 | React 18 设计思想与整体架构：从 Stack Reconciler 到 Fiber，附源码调试环境搭建 | 架构全景 | ⬜ 待写 |
| 02 | React 18 状态更新机制与批处理：Update/UpdateQueue、Class 与 Hook 双轨更新链表、Lane 模型 | 状态更新 | ⬜ 待写 |
| 03 | React 18 Fiber 渲染原理：mount/update/unmount 全流程与 bailout 复用机制 | 渲染原理 | ⬜ 待写 |
| 04 | React 18 Diff 算法源码精读：单节点 Diff 与多节点 Diff | Diff 算法 | ⬜ 待写 |
| 05 | React 18 commit 阶段与副作用系统：三个子阶段与 effect 执行顺序 | commit 阶段 | ⬜ 待写 |
| 06 | React 18 Hooks 全解析：设计哲学、基本使用与 dispatcher/Hook 链表源码 | Hooks | ⬜ 待写 |
| 07 | React 18 并发特性与调度器源码解析：Scheduler、Lane、事件优先级与 Suspense | 并发原理 | ⬜ 待写 |
| 08 | React 18 事件系统与批处理原理：合成事件、事件委托、Automatic Batching | 事件系统 | ⬜ 待写 |
| 09 | React 18 Context 原理与手写实现 | Context | ⬜ 待写 |
| 10 | React Router 6/7 原理与实战 | 路由 | ⬜ 待写 |
| 11 | React 状态管理选型：Redux Toolkit 源码与生产实践，对比 MobX/Zustand，兼历史方案 dva | 状态管理 | ⬜ 待写 |
| 12 | React 18 SSR 与 RSC 原理与实战 | SSR/RSC | ⬜ 待写 |
| 13 | React 18 性能优化全攻略 | 性能 | ⬜ 待写 |
| 14 | Turborepo + pnpm + Vite + React 18 通用后台管理系统从零搭建 | 工程化 | ⬜ 待写 |

---

## 各篇详细大纲

### 第 01 篇：React 18 设计思想与整体架构

**副标题**：从 Stack Reconciler 到 Fiber，并发模式为什么这样设计？附源码调试环境搭建

#### 一、基本使用
- `ReactDOM.render(<App />, container)` → `createRoot(container).render(<App />)`：Legacy 模式与 Concurrent 模式的入口切换
- `createRoot` 后自动批处理（automatic batching）：不论在事件回调、Promise、setTimeout 中调用 `setState`，都会被合并为一次渲染
- `<StrictMode>` 在开发环境下对函数组件、`useState` initializer、`useReducer` 等故意执行两次，用来暴露不纯的渲染逻辑
- `startTransition(() => setFilterKeyword(value))`：把非紧急更新标记为可中断的低优先级任务
- `React.lazy(() => import('./PrescriptionForm'))` + `<Suspense fallback={...}>`：按路由/模块拆分代码
- **本地调试 React 源码环境搭建**（新增）：`git clone facebook/react` → `pnpm i` → `yarn build react,react-dom,scheduler,react-reconciler --type=NODE_DEV` 打出本地开发版包 → 业务项目里用 `pnpm link` 或 Vite `resolve.alias` 把 `react`/`react-dom` 指向本地构建产物 → 在 VSCode 里对 `beginWork`/`dispatchSetState` 打断点，触发一次 `setState` 观察真实调用栈，为后续每一篇的源码阅读打好工具基础

#### 二、原理
- Stack Reconciler（React 15 及之前）用递归方式深度遍历组件树，JS 调用栈一旦开始无法中途让出主线程；医疗场景中"患者列表 + 全局检索"一旦触发大范围重渲染，会造成输入卡顿甚至掉帧
- Fiber 把组件树从"递归调用栈"改造成"链表结构"（`return / child / sibling`），遍历逻辑从递归变成循环（work loop），使渲染过程可以在任意 Fiber 节点处暂停、把控制权交还浏览器、之后再恢复
- Lane 模型：用 31 位二进制位表示更新优先级，相比 React 16 的 `expirationTime` 数值模型，位运算可以做"多个优先级合并成一批处理"这种表达式运算，精度和灵活性都更高（详细的位运算规则和源码留给第 02 篇状态更新篇展开，这里只建立"为什么需要它"的直觉）
- 并发渲染：`createRoot` 开启后，渲染任务通过 `scheduler` 包做时间切片（默认 5ms 一帧），每帧渲染若干 Fiber 后检查 `shouldYieldToHost()`，让出主线程给浏览器处理绘制、用户输入等高优先级任务
- 包职责划分：`react` 只定义 Component/Hooks 等 API 和 JSX 运行时，不涉及任何渲染逻辑；`react-dom` 是浏览器宿主环境的渲染器（Host Config 实现）；`react-reconciler` 是平台无关的协调算法核心，被 `react-dom`、`react-native`、`react-test-renderer` 共同依赖；`scheduler` 是独立的任务调度器，只关心优先级和时间切片，不知道 Fiber 是什么
- 对比 Vue 3：`createApp` 对应的是"编译时优化 + 运行时最小化 diff"路线——模板编译阶段通过 PatchFlag 标记动态节点，运行时 Block Tree 只对比这些标记节点；`createRoot` 对应的是"运行时通用调度"路线——JSX 完全动态、无法在编译期确定哪些节点会变化，只能靠 Fiber 链表 + Lane 优先级在运行时做启发式的可中断调度。前者用编译期信息换运行时性能，后者用运行时调度能力换 JSX 的完全动态自由度，是两种不同的性能优化取舍

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. `createRoot` 入口：`packages/react-dom/src/client/ReactDOMRoot.js` — 创建 `FiberRootNode` 与 `HostRootFiber`，返回带 `render/unmount` 方法的 root 对象
2. Root 节点结构：`packages/react-reconciler/src/ReactFiberRoot.js` — `FiberRootNode` 上挂载 `pendingLanes`、`current` 指针等调度所需状态
3. 时间切片调度循环：`packages/scheduler/src/forks/Scheduler.js` — `shouldYieldToHost()` 判断当前帧是否用完时间片
4. 渲染入口分发：`packages/react-reconciler/src/ReactFiberWorkLoop.js` — `performSyncWorkOnRoot`（同步不可中断）与 `performConcurrentWorkOnRoot`（并发可中断）两条渲染路径
5. 自定义渲染器 Host Config 约定：`packages/react-reconciler/src/forks/ReactFiberReconciler.js` 与 `react-reconciler` 包对外暴露的 `createReconciler(hostConfig)` — 只要实现 `createInstance`/`appendChild`/`commitUpdate` 等一组约定方法就能接入协调算法，不依赖具体渲染平台

#### 四、生产级最佳实践
- HIS 系统首页存在大量指标卡片 + 患者列表时，用 `createRoot` 开启并发特性，避免全局检索输入时主线程被长时间占用
- 用 `startTransition` 包裹处方列表的筛选/排序逻辑，保证筛选输入框始终响应，列表更新可以被打断
- 按"问诊模块 / 处方模块 / 检验报告模块"用 `React.lazy` 做路由级代码分割，减小 HIS 系统首屏包体积
- 用 `StrictMode` 在开发环境暴露医嘱录入表单组件的副作用不纯问题
- 用 `useSyncExternalStore` 订阅医生排班这类外部数据源（原理详见第 06 篇），避免手写 `useEffect + useState` 组合带来的并发渲染撕裂问题

#### 五、手写实现（可独立跑通）
1. 用 Node.js 脚本对比"递归遍历"与"链表遍历"两种方式处理同一棵"处方单渲染树"：递归版模拟 Stack Reconciler，一旦开始无法中断；链表版把节点组织成 `child/sibling/return` 结构，用 `setTimeout` 或 `MessageChannel` 模拟时间切片，每处理若干节点后主动让出执行权，通过日志打印证明遍历可以被打断和恢复
2. **自定义渲染器实战**（新增）：基于真实的 `react-reconciler` 包（不是手写协调算法，是调用官方包）实现一个渲染到终端命令行的极简渲染器——实现 `HostConfig` 里的 `createInstance`（创建一个内存中的"节点对象"而非真实 DOM）、`appendChild`、`commitUpdate`、`removeChild` 等必需方法，把"处方单药品清单"用树状文本结构打印到终端，每次数据变化后重新打印，直观证明"协调算法（Fiber/Diff/调度）与渲染平台完全解耦"这个架构设计的价值——同一套 `react-reconciler` 既能渲染 DOM，也能渲染终端文本

#### 六、手写实现源码 GitHub 地址
（占位，写作时填入实际仓库链接）

#### 七、参考
- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com

**面试核心问**：
- 为什么 React 15 要重构成 Fiber？Fiber 具体解决了什么问题？
- Fiber 链表结构和可中断渲染之间是什么关系？
- concurrent 渲染和 legacy 渲染在调用方式和调度行为上分别有什么核心区别？
- `react-reconciler` 为什么要独立成一个不依赖具体渲染平台的包？如果让你给 React 写一个 Canvas 渲染器，大致需要实现哪些接口？
- 本地怎么调试 React 源码？为什么业务项目里直接改 `node_modules` 里的 React 源码不是一个好的调试方式？

---

### 第 02 篇：React 18 状态更新机制与批处理

**副标题**：一次 `setState` 是怎么变成一次渲染的？Class 与 Hook 两条更新链表 + Lane 优先级模型全链路拆解

#### 一、基本使用
- `this.setState({ count: 1 })` 与 `this.setState(prev => ({ count: prev.count + 1 }))`：对象式更新与函数式更新的区别，函数式更新可以安全地基于"上一次排队中的状态"计算
- 同一个事件处理函数里连续调用多次 `setState`，无论是 Class 组件的 `this.setState` 还是 Hook 的 `dispatch`，都只会触发一次重渲染（批处理现象，原理见下）
- `ReactDOM.render` 走的是 Legacy 模式，内部产生的更新固定是 `SyncLane`（同步优先级）；`createRoot` 挂载的应用则会根据触发场景（点击/输入/过渡态）分配不同优先级的 Lane
- `flushSync(() => setState(...))` 强制跳出批处理，立刻同步渲染并反映到真实 DOM
- 医疗场景示例：处方单表单里"数量加减按钮"连续点击三次，只触发一次重渲染而不是三次

#### 二、原理
- Update 的心智模型：不管是 `this.setState` 还是 Hook 的 `dispatch`，本质都是"往一个队列里追加一个描述本次变化的 Update 对象，然后调度一次重新渲染，渲染时再统一处理队列里的所有 Update 得出最终状态"——这是理解 React 状态更新的第一个关键认知：**状态不是被"立即修改"，而是被"排队等待处理"**
- **Class 组件的 UpdateQueue**（新增）：每个 Class 组件对应的 Fiber 上有一个 `updateQueue`，包含 `baseState`（上一次跳过 bail out 后的基准状态）、`firstBaseUpdate`/`lastBaseUpdate`（一条基准 Update 链表）、`shared.pending`（一个环形链表，本次渲染新增的 Update 先临时挂在这里）；`processUpdateQueue` 会把 `shared.pending` 剪开接到 `baseState` 对应的链表后面，再从头遍历依次执行每个 Update 的 `payload`（可能是对象也可能是函数）得到最终 `memoizedState`
- **Hook 的 Update 链表**（对照）：`useState`/`useReducer` 的每个 Hook 对象上也有一个结构几乎一样的 `queue`（`pending` 环形链表 + `baseState` + `baseQueue`），`updateReducer` 遍历这条链表依次执行 reducer 得出新状态——**这是一个常被误解的点：很多人以为 Class 的更新队列和 Hook 的更新队列是同一套代码，实际上分别独立实现在 `ReactFiberClassUpdateQueue.js` 和 `ReactFiberHooks.js` 里，只是设计思路高度相似（都是"pending 环形链表 + baseState 兜底 + 遍历执行"），这是 React 团队刻意复用的一套通用模式，而不是共享的同一份代码**
- 为什么需要 `baseState` 和"跳过的 Update 要保留在链表里"：如果某个 Update 因为优先级不够本次渲染被跳过（比如先来了一个低优先级更新，中途插入一个高优先级更新），不能直接丢弃它，必须留在 `baseQueue`/`baseUpdate` 链表里等下一次渲染补上，否则会导致更新丢失——这也是 Lane 模型要和 UpdateQueue 配合工作的原因
- 批处理的本质：`dispatchSetState`/`enqueueSetState` 在把 Update 塞进队列后，调用的是 `scheduleUpdateOnFiber` 而不是立即同步渲染；只要同一个事件循环内多次调用，都是"塞入队列 + 调度一次（重复调度会被去重）"，最终只触发一轮 `render`，在这一轮里 `processUpdateQueue` 会遍历队列中所有 Update 一次性算出最终结果——这解释了"连续三次 `setState` 只重渲染一次"背后真正发生的事情，不是"合并了三次渲染"，而是"从来只安排了一次渲染，三次 Update 在这一次渲染里被一起处理掉了"
- Lane 模型详解（承接 01 篇的直觉，这里展开源码级细节）：用 31 位二进制的每一位代表一种"车道"（`SyncLane`、`InputContinuousLane`、`DefaultLane`、`TransitionLane1~16`、`RetryLane`、`IdleLane` 等），通过位运算表达"多个更新同时排队""哪些优先级更紧急""哪些可以合并处理"：
  - `mergeLanes(a, b)`：`a | b`，把多个更新的 lane 合并进 Fiber 的 `lanes` 字段和 root 的 `pendingLanes`
  - `getNextLanes`：从 `pendingLanes` 里找出本次该处理的一组 lane（同一个"优先级层级"的 lane 会被合并处理，这也是"多个同优先级更新合并成一批"的位运算基础）
  - `includesBlockingLane`：判断本次要处理的 lane 是否包含同步/阻塞性更新，决定这次渲染能不能被中断
- **优先级饿死与兜底机制**（新增）：如果一直有新的高优先级更新插队，理论上低优先级的 Update 可能永远排不到——React 用 `markStarvedLanesAsExpired` 兜底：每个 Lane 在被创建时会计算一个"过期时间"（`computeExpirationTime`），如果一个 lane 排队超过这个时间还没被处理，会被强制标记为"过期"，下一次 `getNextLanes` 会优先处理过期的 lane 甚至提升为同步优先级处理，保证"低优先级更新最终一定会被执行"，不会无限延后
- 对比 Vue 3：Vue 3 的响应式更新没有"优先级"概念，`trigger` 触发的副作用统一走微任务队列去重合并（`nextTick`），本质是"同一 tick 内的多次触发合并成一次"；React 的 Update 队列除了合并去重，还叠加了一层"优先级排队"，这是并发模式下"高优先级插队打断低优先级"这个能力的地基，Vue 3 的调度模型里没有对应机制

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. Class 组件更新入口：`packages/react-reconciler/src/ReactFiberClassComponent.js` — `classComponentUpdater.enqueueSetState` 创建 Update 对象并调用 `scheduleUpdateOnFiber`
2. Class 组件更新队列：`packages/react-reconciler/src/ReactFiberClassUpdateQueue.js` — `createUpdate`/`enqueueUpdate`/`processUpdateQueue` 完整实现
3. Hook 更新队列（对照阅读）：`packages/react-reconciler/src/ReactFiberHooks.js` — `dispatchSetState`/`updateReducer` 中结构相似但独立实现的 pending 链表处理
4. Lane 常量与位运算：`packages/react-reconciler/src/ReactFiberLane.js` — Lane 常量定义、`mergeLanes`、`getNextLanes`、`markStarvedLanesAsExpired`
5. 调度入口：`packages/react-reconciler/src/ReactFiberWorkLoop.js` — `scheduleUpdateOnFiber` 如何根据当前上下文（是否在批处理中）决定立即调度还是加入队列

#### 四、生产级最佳实践
- 需要"基于上一次状态计算"的场景（如数量加减、多选框批量勾选）统一用函数式更新（`setCount(c => c + 1)`），避免闭包里读到的是过期的 state 快照
- 理解"Update 是排队处理"的心智模型后，不要写"`setState` 后立即读取最新 state"的代码
- 复杂的处方审核状态机优先用 `useReducer`（Hook 场景）或拆分成更小的 Class 组件（遗留系统场景），避免手工维护多个字段之间的一致性
- 排查"点击按钮但界面没有立刻更新"类问题时，先确认是否处于批处理上下文中，是否需要 `flushSync`
- 遗留系统里同时存在 Class 组件和函数组件时，理解两者更新队列结构相似但代码独立，不要假设修复一处 bug 会同时影响另一套实现

#### 五、手写实现（可独立跑通）
用纯 TypeScript 手写一个简化版"双轨更新队列"系统（不依赖 React 本身）：实现一个 `createUpdateQueue()` 工厂函数，分别演示"Class 风格"（`baseState` + `pending` 环形链表 + `processUpdateQueue` 遍历执行 `payload`）和"Hook 风格"（游标 + `queue.pending` + `updateReducer` 遍历执行 reducer）两套结构几乎一样但独立维护的实现；再实现一个极简的"Lane 优先级队列"：用普通数字位运算模拟几个优先级车道，多次触发不同优先级的"更新"后，验证高优先级更新能被优先处理、低优先级更新超过设定的"过期时间"后会被强制提前处理（模拟 `markStarvedLanesAsExpired`）。场景用"处方单审核状态流转"演示，可在 Node.js 环境直接运行。

#### 六、手写实现源码 GitHub 地址
（占位，写作时填入实际仓库链接）

#### 七、参考
- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com

**面试核心问**：
- 为什么同一个事件处理函数里连续三次 `setState` 只会触发一次渲染？是"合并了三次渲染"还是"本来就只调度了一次"？
- Class 组件的 `UpdateQueue` 和 Hook 的更新队列是同一套实现吗？两者的相似之处和本质区别是什么？
- 为什么被跳过（bail out）的 Update 不能直接丢弃，必须留在 `baseQueue` 里？
- Lane 模型相比 React 16 的 `expirationTime` 数值模型有什么优势？为什么用二进制位运算表示优先级？
- 如果 Lane 模型没有"过期"兜底机制，会出现什么现象？React 是怎么解决优先级饿死问题的？

---

### 第 03 篇：React 18 Fiber 渲染原理

**副标题**：mount、update、unmount 全流程拆解，以及 React 怎么判断"这个组件不用重新渲染"

#### 一、基本使用
- `key` 的正确使用对 diff 结果的直接影响：复现"患者列表用数组 index 作 key"在增删排序时导致展开状态/输入框内容错位的 bug
- `React.memo`/`PureComponent` 包裹组件后，父组件重渲染但 props 不变时子组件不会重新渲染的现象——这正是本篇要讲透的 bailout 机制在应用层的直观体现
- React DevTools Profiler 里观察 Fiber 树和各阶段耗时
- `StrictMode` 下 effect 被执行两次的现象，和 Fiber `alternate` 树切换、mount/unmount 模拟之间的关系
- 组件从 DOM 树中移除（如 Tab 切换隐藏某个模块）对应的卸载流程，以及 `useEffect` 清理函数被调用的时机

#### 二、原理
- Fiber 节点数据结构逐字段讲解：`type`、`key`、`pendingProps`/`memoizedProps`、`stateNode`、`return`/`child`/`sibling`、`index`、`alternate`、`flags`、`lanes`
- 双缓存机制：`current` 树表示当前屏幕上显示的内容，`workInProgress` 树是内存中正在构建的新树，两者通过 `alternate` 互相指向；commit 阶段完成后只需要把 root 的 `current` 指针整体切换到新树
- **mount 流程**：首次渲染时不存在 `current` 树，`beginWork` 处理每个 Fiber 时走的是 `mountXxx` 系列逻辑（如 Hooks 的 `HooksDispatcherOnMount`），`completeWork` 阶段需要为每个 Host 类型节点真正创建 DOM 实例（`createInstance`）并挂载 props
- **update 流程**：存在对应的 `current` Fiber 可以复用，`beginWork` 会先尝试 bailout（见下），无法复用时才继续走 diff 子节点的流程，`completeWork` 阶段对比新旧 props 计算出需要更新的 DOM 属性（`prepareUpdate`）而不是重新创建节点
- **unmount 流程**：一个 Fiber 及其子树被标记为需要删除时（`Deletion` flag），会在 commit 的 mutation 阶段调用 `commitDeletion`，递归遍历子树依次执行 `useLayoutEffect`/`useEffect` 的清理函数、Class 组件的 `componentWillUnmount`，再从真实 DOM 中移除对应节点——这个过程也是自底向上的
- **beginWork 的 bailout 复用机制**（新增，重点）：React 并不是每次更新都无条件地重新渲染整棵树，`beginWork` 开头会判断 `oldProps === newProps && !hasContextChanged && !includesSomeLane(fiber.lanes, renderLanes)` 是否同时成立——如果 props 引用没变、没有 Context 变化、这个 Fiber 也没有排队的更新，就会调用 `bailoutOnAlreadyFinishedWork` 直接克隆 `current` 树对应节点跳过渲染（甚至可能整个跳过子树）；`React.memo`/`PureComponent` 的效果正是通过让"新旧 props 浅比较相等时保持引用不变"来命中这条 bailout 路径实现的——**这是很多人只知道"memo 能减少重渲染"却不知道"减少重渲染"具体是怎么在源码层面发生的**
- bailout 和"跳过渲染"不是一回事：即使命中 bailout，如果这个 Fiber 的子树中有某个后代组件自己有排队的更新（比如子组件内部 `setState`），React 仍然会"路过"这个被跳过的父节点继续往下找到那个真正需要更新的子节点渲染，只是父节点本身不会重新执行渲染函数
- render 阶段整体流程：`beginWork` 自顶向下遍历（尝试 bailout，不能复用则处理更新/diff 子节点），`completeWork` 自底向上（收集子树的副作用标记到 `subtreeFlags`，构建 effect 链表，Host 节点做 DOM 创建或属性 diff）
- 对比 Vue 3：Vue 3 的 bailout 判断依赖 PatchFlag 这种编译期产生的静态信息，"跳过静态节点"在编译阶段就已经确定；React 的 bailout 判断完全发生在运行时（比较 props 引用、检查 lanes），没有编译期信息可以利用，这也是为什么 React 需要开发者主动配合（`memo`/`useMemo`/`useCallback` 保持引用稳定）才能让 bailout 真正生效，而 Vue 3 的静态节点跳过是编译器自动完成、不需要开发者手动介入的

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. render 阶段入口：`packages/react-reconciler/src/ReactFiberBeginWork.js` — `beginWork` 主函数按 `fiber.tag` 分发，开头的 bailout 判断逻辑
2. bailout 复用：`packages/react-reconciler/src/ReactFiberBeginWork.js` — `bailoutOnAlreadyFinishedWork`、`cloneChildFibers`
3. mount 阶段 Host 节点创建：`packages/react-reconciler/src/ReactFiberCompleteWork.js` — `completeWork` 中 `case HostComponent` 分支的 `createInstance` 调用
4. update 阶段属性 diff：`packages/react-reconciler/src/ReactFiberCompleteWork.js` — `prepareUpdate`/`diffProperties`
5. unmount 递归清理：`packages/react-reconciler/src/ReactFiberCommitWork.js` — `commitDeletion`/`unmountHostComponents` 自底向上执行清理逻辑
6. 工作循环驱动：`packages/react-reconciler/src/ReactFiberWorkLoop.js` — `workLoopConcurrent`/`workLoopSync`

#### 四、生产级最佳实践
- 患者列表统一用稳定的患者 ID 作为 `key`，禁止用数组 `index`
- 给纯展示型的子组件（如药品列表行）包裹 `React.memo`，并配合 `useCallback`/`useMemo` 保持传入 props 的引用稳定，让 bailout 机制真正生效，而不是"包了 memo 但 props 每次都是新对象/新函数，等于没包"
- 避免渲染函数里根据条件返回不同的标签类型，`type` 变化会导致整棵子树被销毁重建而不是复用
- 检验报告历史这类大列表用虚拟滚动，减少同时存在的 Fiber 节点数量
- Tab 切换场景注意选择"卸载重建"还是"CSS 隐藏保留组件树"，前者会触发完整的 unmount 清理（丢失内部状态和已建立的订阅），后者不会，根据业务场景（是否需要保留表单已填内容）选择

#### 五、手写实现（可独立跑通）
参考 Didact（`pomb.us/build-your-own-react`）思路，用纯 JS + DOM API 手写一个极简 Fiber 协调器，场景是"处方单药品项"的增删渲染：实现 `createElement` 构造虚拟节点；实现带 `workLoop` 的渲染循环；实现 `beginWork`（先判断能否 bailout 复用，不能复用则 diff 子节点并打上 flags）和 `commitRoot`（遍历 effect 链表执行真实 DOM 增删改，删除节点时递归执行清理回调）。用一个"添加/删除/原地不变刷新"三种操作的按钮组验证 mount/update（含 bailout 命中）/unmount 三条路径都能正确工作，可在浏览器直接运行观察效果。

#### 六、手写实现源码 GitHub 地址
（占位，写作时填入实际仓库链接）

#### 七、参考
- https://react.iamkasong.com
- https://jonny-wei.github.io/blog/react/
- https://pomb.us/build-your-own-react/

**面试核心问**：
- mount、update、unmount 三条路径在 `beginWork`/`completeWork` 里分别是怎么走的？
- Fiber 双缓存机制具体解决了什么问题？如果没有双缓存会出现什么现象？
- `React.memo` 为什么能减少重渲染？在源码层面它命中的是哪条判断逻辑？
- bailout 跳过了某个父节点的渲染，如果它的某个后代组件自己有更新，React 还能找到并渲染这个后代吗，为什么？
- unmount 阶段的清理为什么是自底向上而不是自顶向下？

---

### 第 04 篇：React 18 Diff 算法源码精读

**副标题**：单节点 Diff 与多节点 Diff，`key` 到底在算法里扮演什么角色

#### 一、基本使用
- 复现"患者列表用数组 index 作 key"在增删排序时展开状态/输入框内容错位的 bug（承接 03 篇，本篇专门拆解背后的算法原因）
- 数组渲染时给每一项显式声明稳定 `key` 的正确写法，对比"不写 key 时 React 报警告但仍会渲染"的默认行为
- React DevTools Profiler 观察一次列表重排后，哪些 DOM 节点被移动、哪些被重新创建

#### 二、原理
- Diff 算法的前提：只对同一层级的节点进行比较（不会跨层级搬移节点），且只在"新旧 `type` 相同"的前提下才可能复用节点——这是 Diff 算法为了把复杂度从 O(n³) 降到 O(n) 所做的两个关键简化假设
- 单节点 Diff（`reconcileSingleElement`）：对比新 `element` 的 `key`/`type` 和旧 Fiber 链表逐个比较——如果 `key` 相同但 `type` 不同，当前节点及其兄弟全部标记删除；如果 `key` 和 `type` 都相同，复用该 Fiber 并删除其余的旧兄弟节点
- 多节点 Diff（`reconcileChildrenArray`）分两轮遍历：
  - 第一轮：按位置顺序比较新旧数组，只要 `key` 相同就尝试复用（`type` 不同则标记这个位置需要新建），一旦遇到 `key` 不匹配就立刻跳出第一轮，不再继续按顺序比较下去
  - 第二轮：处理第一轮跳出后剩余的节点——把剩余的旧 Fiber 放进一个 `key → Fiber` 的 Map，遍历剩余的新 `element` 数组，在 Map 里查找是否有对应 `key` 的旧节点可以复用；复用时通过 `lastPlacedIndex` 判断该节点是否需要移动：如果它在旧数组中的位置索引小于当前的 `lastPlacedIndex`，说明它在新的顺序里被往前挪动了，需要标记 `Placement`（移动），否则说明相对顺序没变，不需要移动
- `lastPlacedIndex` 判断移动的直觉理解：算法只关心"相对顺序是否被打乱"，而不是真的去计算最小编辑距离——这也是为什么 React 的 Diff 是一种"启发式"算法而非最优解，某些复杂的重排场景可能会比理论最优多移动几个节点，但换来的是线性时间复杂度
- 为什么 index 作 key 会出问题：假如原数组 `[A, B, C]` 删除 A 后变成 `[B, C]`，如果用 index 作 key，React 拿到的新 key 序列是 `[0, 1]`，会去和旧的 `key=0`（对应A）、`key=1`（对应B）比较，误认为"位置0的内容从A变成了B、位置1从B变成了C"，导致本该被删除的A节点被"更新"成B的内容、本该保留状态的B节点被当成新内容处理——所有节点内部状态（如输入框的值、展开的 UI 状态）都会错位地"挪到"下一个位置，而不是跟着真正的数据项移动
- 对比 Vue 3：Vue 3 的多节点 diff（`patchKeyedChildren`）思路上也是"双端比较 + 最长递增子序列"，比 React 的两轮遍历在处理"整体倒序"这类场景时移动次数更少（React 遇到整体倒序会导致几乎所有节点被判定为移动，Vue 3 的最长递增子序列算法可以找出真正不需要移动的最大子集）；这是两者算法设计目标不同导致的差异——Vue 3 在编译期已知模板结构，运行时有余力做更精细的算法；React 的 Diff 要覆盖任意动态的 JSX 结构，选择了实现更简单、常数时间开销更小的两轮遍历方案

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. 单节点 Diff：`packages/react-reconciler/src/ReactChildFiber.js` — `reconcileSingleElement`
2. 多节点 Diff 核心：`packages/react-reconciler/src/ReactChildFiber.js` — `reconcileChildrenArray`，两轮遍历 + `lastPlacedIndex` 判断移动的完整实现
3. Diff 入口分发：`packages/react-reconciler/src/ReactChildFiber.js` — `reconcileChildFibers` 根据新 children 是单个元素/数组/文本等类型分发到不同处理函数
4. `key` 提取与警告：`packages/react-reconciler/src/ReactChildFiber.js` — `warnOnInvalidKey`，未显式声明 key 时的默认行为

#### 四、生产级最佳实践
- 患者列表、处方药品项统一用稳定的业务 ID 作为 `key`，禁止用数组 `index`
- 涉及频繁增删排序的列表（如处方单动态添加药品项）优先保证 `key` 稳定，必要时给列表项数据本身补充一个唯一 ID 字段而不是依赖数组下标
- 明确知道列表"只会在末尾追加、不会中间插入删除排序"这种简单场景，用 index 作 key 的风险可以接受，但仍建议养成用业务 ID 的习惯，避免未来需求变化后忘记改
- 大列表整体重排（如按价格/时间重新排序）会导致大量节点被标记移动，评估是否可以用虚拟滚动 + 数据层排序取代真实 DOM 层面的大规模重排

#### 五、手写实现（可独立跑通）
用纯 JS（不依赖 React）实现一个简化版多节点 Diff 函数：输入旧数组和新数组（元素形如 `{ key, type, text }`），输出一组"patch 指令"（`INSERT`/`DELETE`/`MOVE`/`UPDATE`），按照 React 的两轮遍历思路实现——第一轮按位置比较直到 `key` 不匹配跳出，第二轮用 Map 查找剩余节点并用 `lastPlacedIndex` 判断是否需要移动。用"处方单药品项重排"（如把第 3 项拖到第 1 位）作为测试用例，打印出的 patch 指令要能验证"相对顺序没变的节点不会被错误标记为移动"，并额外用一组"index 作 key" 的对比测试，打印出的 patch 指令直观展示错误的复用行为。

#### 六、手写实现源码 GitHub 地址
（占位，写作时填入实际仓库链接）

#### 七、参考
- https://react.iamkasong.com
- https://jonny-wei.github.io/blog/react/

**面试核心问**：
- 多节点 Diff 算法为什么要分两轮遍历，一轮为什么不够？
- `key` 在 Diff 算法中到底起什么作用？用 `index` 作 `key` 在什么场景下会出问题，具体是怎么出问题的？
- `lastPlacedIndex` 是怎么判断一个节点"是否需要移动"的？
- React 的 Diff 算法复杂度是多少？它做了哪些简化假设才达到这个复杂度？
- Vue 3 的 Diff 算法和 React 相比有什么不同？各自的设计取舍是什么？

---

### 第 05 篇：React 18 commit 阶段与副作用系统

**副标题**：before mutation / mutation / layout 三个子阶段，以及 effect 链表的收集与执行顺序

#### 一、基本使用
- `useLayoutEffect` 在浏览器绘制前同步执行，`useEffect` 在绘制后异步执行——通过"处方单弹窗需要先测量 DOM 再定位"这个场景直观感受两者时机差异
- `getSnapshotBeforeUpdate`（Class 组件生命周期）在 DOM 变更前读取快照，比如聊天记录列表更新前记录当前滚动位置，更新后在 `componentDidUpdate` 里用这个快照恢复滚动位置
- 父子组件都写了 `useEffect` 时，实际打印日志观察谁先执行——验证"子组件的 effect 先于父组件执行"这个顺序规律
- `useRef` 关联的 DOM ref 在 mutation 阶段之后才被赋值，layout 阶段读取 `ref.current` 已经能拿到真实 DOM

#### 二、原理
- commit 阶段为什么整体同步不可中断：render 阶段只在内存中操作 Fiber 对象，可以被打断丢弃重来；commit 阶段是真正操作真实 DOM 的阶段，一旦开始必须保证同步跑完，否则用户会看到不完整的、DOM 结构和状态不一致的中间态界面
- **before mutation 阶段**：此时 DOM 还没有任何变更，用于读取变更前的状态——`getSnapshotBeforeUpdate` 在这里被调用（必须在 DOM 变更前读取，所以不能放在 mutation 或 layout 阶段）
- **mutation 阶段**：真正执行 DOM 的增删改（`commitPlacement`/`commitDeletion`/`commitUpdate`），`useLayoutEffect` 的销毁函数（上一次的 cleanup）也在这个阶段被调用（先清理旧的再挂载新的）
- **layout 阶段**：DOM 已经变更完毕、但浏览器还没有完成绘制，这个阶段同步执行 `useLayoutEffect` 的挂载回调、`componentDidMount`/`componentDidUpdate`、更新 ref 的指向——因为此时可以同步读取到最新的布局信息且修改不会造成视觉闪烁（对比在绘制后才修改布局会有一次可感知的"跳动"）
- effect 链表的收集时机：`completeWork` 阶段自底向上冒泡收集每个 Fiber 的副作用标记到 `subtreeFlags`，同时把带有 `useEffect`/`useLayoutEffect` 的 Fiber 上的 Effect 对象串成一条环形链表挂在 `fiber.updateQueue` 上；这个收集顺序本身是自底向上的，因此后续遍历执行时也天然是"子节点的 effect 先被收集、先被执行"
- **effect 执行顺序原则**（新增，重点）：`useLayoutEffect`（`HookLayout`）在 layout 阶段同步执行，`useEffect`（`HookPassive`）在 commit 全部完成后通过 `scheduler` 以正常优先级异步调度执行；无论哪一种，执行顺序都遵循"子组件先于父组件"——这是因为收集阶段（`completeWork`）本身自底向上，子组件的 Fiber 更早完成、更早被加入 effect 链表；这条规律解释了很多实际问题，比如父组件的 `useEffect` 里访问子组件通过 ref 暴露的方法一定是安全的（子组件的挂载 effect 已经跑完）
- `useInsertionEffect` 的定位（新增，React 18 补齐的第三种 effect）：比 `useLayoutEffect` 更早——在 DOM 变更（mutation）之前执行，专门为 CSS-in-JS 库设计，用于在 DOM 变更前动态插入 `<style>` 标签，避免 `useLayoutEffect` 阶段读取布局信息时样式还没生效导致的测量错误；这是三种 effect 里最少被业务代码直接使用、但理解"三种 effect 分别对应 commit 的哪个阶段"能帮助理清整个 commit 副作用系统的全貌
- 三种 effect 的执行时机总结：`useInsertionEffect`（mutation 之前）→ DOM 变更（mutation）→ `useLayoutEffect`（layout，绘制前同步）→ 浏览器绘制 → `useEffect`（绘制后异步）
- 对比 Vue 3：Vue 3 的 `onMounted`/`onUpdated` 对应 React 的 `useLayoutEffect` 时机（同步，DOM 更新后立即执行），Vue 3 没有内置一个默认异步调度的等价物（需要手动 `nextTick` 或用 `Promise.resolve().then`），这是因为 Vue 3 的更新本身走微任务队列，"绘制后再执行"这件事需要开发者自己额外处理，而 React 默认的 `useEffect` 就是"绘制后执行"，这个默认值的选择本身也体现了两个框架对"副作用默认应该多早/多晚执行"的不同判断

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. commit 阶段总调度：`packages/react-reconciler/src/ReactFiberWorkLoop.js` — `commitRootImpl` 依次调用三个子阶段
2. before mutation：`packages/react-reconciler/src/ReactFiberCommitWork.js` — `commitBeforeMutationEffects`，`getSnapshotBeforeUpdate` 调用点
3. mutation：`packages/react-reconciler/src/ReactFiberCommitWork.js` — `commitMutationEffects` 遍历 effect 链表执行真实 DOM 增删改，`useLayoutEffect` 销毁函数调用点
4. layout：`packages/react-reconciler/src/ReactFiberCommitWork.js` — `commitLayoutEffects`，`useLayoutEffect` 挂载回调、`componentDidMount`/`Update`、ref 赋值
5. passive effect 异步调度：`packages/react-reconciler/src/ReactFiberWorkLoop.js` — `flushPassiveEffects`/`commitPassiveMountEffects`，`useEffect` 如何被异步调度执行
6. `useInsertionEffect` 调用点：`packages/react-reconciler/src/ReactFiberCommitWork.js` — `commitHookEffectListMount` 中 `HookInsertion` 标记对应的执行时机（在 mutation 之前）

#### 四、生产级最佳实践
- 处方单弹窗需要"先测量 DOM 尺寸再定位"的场景必须用 `useLayoutEffect`，用 `useEffect` 会导致弹窗先出现在错误位置、再"跳"到正确位置
- 聊天记录列表/检验报告时间线更新前用 `getSnapshotBeforeUpdate` 记录滚动位置，`componentDidUpdate` 里恢复，避免新增内容导致视觉跳动
- 理解 effect 执行顺序后，父组件 `useEffect` 里安全地调用子组件通过 `useImperativeHandle` 暴露的方法，不需要额外加时序判断
- 自建的 CSS-in-JS 方案或需要在 DOM 变更前插入动态样式的场景使用 `useInsertionEffect`，业务代码日常开发中一般不需要主动使用
- 排查"effect 里读到的 DOM 尺寸不对"类问题，先确认用的是 `useEffect` 还是 `useLayoutEffect`，是否存在绘制后才执行导致的时序问题

#### 五、手写实现（可独立跑通）
用纯 JS + DOM API 手写一个极简的三阶段 commit 系统（承接 03/04 篇的手写协调器）：实现一个 `commitRoot` 函数，按顺序执行 `beforeMutation`（模拟读取"变更前快照"）→`mutation`（真实执行 DOM 增删改）→`layout`（同步执行"布局副作用"回调）三个阶段；再实现一个简化的 effect 收集机制——组件对象上可以声明 `insertionEffect`/`layoutEffect`/`passiveEffect` 三种回调，渲染一棵"父组件包含两个子组件"的树，验证：三种 effect 各自在正确的阶应该阶段被调用；子组件的 effect 始终先于父组件执行；`passiveEffect` 用 `Promise.resolve().then` 模拟异步调度，验证它在整个同步 commit 流程走完之后才执行。

#### 六、手写实现源码 GitHub 地址
（占位，写作时填入实际仓库链接）

#### 七、参考
- https://react.iamkasong.com
- https://jonny-wei.github.io/blog/react/
- https://zh-hans.react.dev/

**面试核心问**：
- commit 阶段为什么必须同步不可中断，render 阶段为什么可以？
- `useLayoutEffect` 和 `useEffect` 的执行时机差异具体是什么，分别对应 commit 的哪个子阶段？
- 父子组件的 `useEffect` 谁先执行？为什么？这个顺序和 `beginWork` 的遍历顺序是什么关系？
- `useInsertionEffect` 解决了什么问题？为什么它必须比 `useLayoutEffect` 更早执行？
- `getSnapshotBeforeUpdate` 为什么必须在 DOM 变更前（before mutation 阶段）调用，放到 mutation 之后会有什么问题？

---

### 第 06 篇：React 18 Hooks 全解析

**副标题**：设计哲学、核心 Hook 用法，与 dispatcher 切换、Hook 链表、useSyncExternalStore 源码全打通

> 说明：本篇合并原大纲中拆开的「Hooks 基本使用」与「Hooks 源码解析」两篇——同一个 Hook 的"怎么用"和"为什么这样设计"放在一起讲，避免中间被架构/渲染篇打断主线。

#### 一、基本使用
- `useState`：基本用法与函数式更新，区分"直接传值"与"传函数"两种更新方式的适用场景；惰性初始化 `useState(() => computeExpensiveInitialState())` 只在首次渲染执行一次
- `useEffect`：依赖数组的三种写法与清理函数时机
- `useLayoutEffect`：处方单弹窗先测量 DOM 再定位，避免闪烁
- `useInsertionEffect`（新增补齐）：三种 effect 中最早执行、最少被业务直接使用的一种，专门给 CSS-in-JS 库在 DOM 变更前插入样式用，这里先建立基本认知，执行时机细节见第 05 篇
- `useMemo` / `useCallback`：配合 `memo` 化组件固定引用，减少子组件重复渲染（对照第 03 篇的 bailout 机制）
- `useRef`：DOM 引用与不触发渲染的可变值两种典型用途
- `useContext`：跨层级传递当前登录医生信息（原理留给第 09 篇 Context 专篇）
- `useReducer`：管理复杂的问诊表单状态；`dispatch` 引用永远保持稳定
- `useSyncExternalStore`（新增补齐，重点）：`const state = useSyncExternalStore(store.subscribe, store.getSnapshot)`，用于订阅"React 外部"的数据源（如医生排班这类模块级单例 store、浏览器 API），是 React 18 官方提供的"安全订阅外部状态"标准方式
- 自定义 Hook 设计规范：`usePatientRecord`、`usePrescriptionForm` 的参数与返回值类型设计
- `forwardRef` + `useImperativeHandle`：父组件命令式调用子组件方法的标准写法
- `createPortal`：脱离父组件 CSS 层级限制渲染到 `document.body`，但事件冒泡仍沿 React 组件树传播
- `useId`：生成跨服务端/客户端渲染一致的唯一 ID
- Error Boundary：类组件通过 `static getDerivedStateFromError` + `componentDidCatch` 捕获子树渲染期间的异常

#### 二、原理
- Hooks 本质是"用函数组件 + 闭包"复用状态逻辑，替代 Class 组件生命周期方法里拼接不相关逻辑的问题
- 调用顺序依赖模型：Hook 的状态是按"调用顺序"对应存储位置的，条件语句或循环会导致某次渲染多调用或少调用某个 Hook，从而让状态和 Hook 调用错位
- 自定义 Hook 不是新语法，只是"调用其他 Hook 的普通函数"，多个组件使用同一个自定义 Hook 时各自拥有独立的闭包和状态实例
- 对比 Vue 3 Composable：Vue 的响应式依赖收集不依赖调用顺序，因此 Composable 可以写在 `if/for` 里；React Hooks 用调用顺序对应状态存储，换来的是不需要建立响应式依赖收集系统、实现更简单，代价是牺牲了控制流书写上的自由度
- `useEffect` 与 `useLayoutEffect` 时机差异的设计意图：见第 05 篇 commit 阶段详解，这里回顾结论——`useEffect` 异步调度不阻塞绘制，`useLayoutEffect` 同步执行用于必须同步读取/修改布局的场景
- `useImperativeHandle` 的本质：配合 `forwardRef` 自定义父组件通过 ref 能拿到哪些方法，"最小暴露面"的封装思路
- `createPortal` 事件冒泡仍按 React 树而非 DOM 树传播的原因：合成事件系统基于 Fiber 树结构做事件收集（详见第 08 篇），Portal 只改变了真实 DOM 挂载位置，没有改变对应 Fiber 节点在 Fiber 树里的 `return` 指针关系
- `useId` 解决的具体问题：SSR 场景下按"树中位置"编码生成确定性字符串，服务端和客户端遍历顺序一致则 ID 严格一致
- Error Boundary 的捕获边界：只能捕获渲染阶段、生命周期方法、构造函数中抛出的异常，无法捕获事件处理函数、异步代码中的异常
- **dispatcher 机制**：`ReactCurrentDispatcher.current` 在渲染函数组件前，由 `renderWithHooks` 根据 mount/update 阶段切换指向 `HooksDispatcherOnMount` 或 `HooksDispatcherOnUpdate` 两套完全不同的函数实现
- **Hook 链表**：`fiber.memoizedState` 指向该 Fiber 上第一个 Hook 对象，多次 Hook 调用在同一个 Fiber 上串成一条单向链表——这正是"Hooks 调用顺序必须保持一致"规则的底层原因
- `useState`/`useReducer` 实现：mount 阶段创建 Hook 节点和 `queue`；`dispatch` 触发的更新追加进 `queue.pending` 环形链表（与第 02 篇 Class 组件的 UpdateQueue 结构做对照回顾），真正的状态计算发生在下一次渲染的 `updateReducer` 中
- `useEffect`/`useLayoutEffect` 实现：都会创建一个 Effect 对象追加进 `fiber.updateQueue` 上的 effect 环形链表，区别只在于打的标记不同（`HookLayout`/`HookPassive`/`HookInsertion`），执行时机详见第 05 篇
- **`useSyncExternalStore` 与并发渲染下的 tearing 问题**（新增，重点）：并发模式下一次渲染可能被高优先级更新打断、中途还会读取多次同一个外部 store 的值——如果只是简单地 `useState` + `useEffect` 手写订阅，在渲染尚未完成、被打断又恢复的过程中，外部 store 的值可能已经在渲染中途发生了变化，导致同一次渲染里不同组件读到了这个外部 store 前后不一致的两个值（这就是"tearing / 撕裂"）；`useSyncExternalStore(subscribe, getSnapshot)` 的实现在每次渲染前后都会用 `getSnapshot()` 比较结果是否变化（`checkIfSnapshotChanged`），如果在渲染过程中发现值已经变了，会强制走一次同步重渲染保证读到的是最新且一致的值，从而保证"同一次渲染里所有读到这个 store 的地方，值一定是一致的"
- `useSyncExternalStore` 是 Redux/Zustand 等外部状态库能在并发模式下安全工作的地基（与第 11 篇状态管理篇联动）

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. Hooks 对外 API：`packages/react/src/ReactHooks.js` — 转发给当前生效的 dispatcher
2. Dispatcher 全局引用：`packages/react/src/ReactCurrentDispatcher.js`
3. Dispatcher 具体实现：`packages/react-reconciler/src/ReactFiberHooks.js` — `HooksDispatcherOnMount`/`HooksDispatcherOnUpdate`，`mountState`/`updateState`、`mountEffect`/`updateEffect`
4. 更新触发与调度：`packages/react-reconciler/src/ReactFiberHooks.js` — `dispatchSetState`/`dispatchReducerAction`
5. `useId` 的树位置编码：`packages/react-reconciler/src/ReactFiberHooks.js` — `mountId`/`updateId`
6. 错误边界：`packages/react-reconciler/src/ReactFiberThrow.js` — `throwException` 中向上查找最近的错误边界 Fiber
7. `useSyncExternalStore` 实现：`packages/react-reconciler/src/ReactFiberHooks.js` — `mountSyncExternalStore`/`updateSyncExternalStore`，`checkIfSnapshotChanged` 的比较逻辑
8. effect 链表执行：`packages/react-reconciler/src/ReactFiberCommitWork.js` — `commitHookEffectListMount`/`commitHookEffectListUnmount`

#### 四、生产级最佳实践
- 复杂的处方表单用 `useReducer` 代替多个零散 `useState`
- 把患者数据请求 + loading + error 状态封装进 `usePatientRecord` 自定义 Hook
- 给传入药品列表虚拟滚动子组件的事件回调用 `useCallback` 包裹，配合 `React.memo` 减少不必要的子组件重渲染
- 在 `useEffect` 清理函数中取消医嘱轮询请求，避免竞态更新或内存泄漏
- 医生排班这类模块级单例数据源用 `useSyncExternalStore` 订阅，而不是手写 `useEffect + useState` 组合（后者在并发模式下有 tearing 风险）
- "处方单表单"组件用 `forwardRef` + `useImperativeHandle` 只暴露 `validate()`/`getValues()` 两个方法给父组件
- 问诊表单的多个字段用 `useId` 生成 `label`/`input` 关联 ID

#### 五、手写实现（可独立跑通）
用原生 JS（不依赖 React）实现一个 `createHookedComponent` 函数：内部维护一个 `hooks` 数组和游标 `cursor`，暴露简化版 `useState`/`useEffect` API，验证"顶层调用"规则存在的必要性（故意把 `useState` 放进 `if` 制造状态错位的 bug 作对比）；补充一个极简版 `ErrorBoundary`；再手写一个基于树路径编码的极简 `useId` 实现。在此基础上新增：手写一个简化版 `useSyncExternalStore`——内部维护一个"渲染前快照"和"渲染后快照"，在模拟的"渲染中途外部 store 发生变化"场景下，验证不加保护的手写订阅会读到不一致的值（tearing），而加上快照比较逻辑后能检测到变化并强制重新读取。整个 Demo 可在 Node.js 环境直接运行。

#### 六、手写实现源码 GitHub 地址
（占位，写作时填入实际仓库链接）

#### 七、参考
- https://zh-hans.react.dev/
- https://ahooks.js.org/
- https://github.com/bvaughn/react-error-boundary

**面试核心问**：
- `useEffect` 和 `useLayoutEffect` 的执行时机差异是什么？`useInsertionEffect` 又插在哪个时机？
- 为什么 Hooks 不能写在条件语句或循环里？Hook 链表结构和这条规则具体是怎么关联的？
- mount 阶段和 update 阶段的 dispatcher 有什么不同，为什么要拆成两套实现？
- 什么是并发渲染下的"tearing"？`useSyncExternalStore` 是怎么解决这个问题的？
- `useImperativeHandle` 解决了什么问题？为什么不直接把整个 DOM 节点暴露给父组件？
- 错误边界能捕获哪些类型的异常，不能捕获哪些？为什么 React 至今没有提供 Hooks 形式的错误边界？

---

### 第 07 篇：React 18 并发特性与调度器源码解析

**副标题**：MessageChannel 时间切片、事件优先级如何映射到 Lane、startTransition 与 Suspense 的协作

#### 一、基本使用
- `useTransition`：将非紧急更新标记为可中断的过渡态
- `startTransition`：不需要 pending 状态时的轻量版 API
- `useDeferredValue`：让某个值"延迟跟随"最新值更新
- `Suspense` 配合 `lazy()`：组件级代码分割 + 加载态兜底
- `Suspense` 配合数据请求：结合支持 Suspense 的数据源实现"读取即挂起"模式
- 并发模式下 `ReactDOM.createRoot` 是开启一切并发特性的前提

#### 二、原理
- 时间切片的本质：把渲染工作拆成不超过 5ms 的"工作单元"，每跑完一个时间片就把控制权交还浏览器
- 为什么用 `MessageChannel` 而不是 `setTimeout(fn, 0)`：`setTimeout` 有浏览器最小延迟 clamp 限制且不稳定，`MessageChannel` 的宏任务延迟更稳定可控；不支持时降级为 `setTimeout`
- Scheduler 的任务队列：内部维护两个小顶堆（`taskQueue`、`timerQueue`），按 `expirationTime` 排序
- Lane 模型的位运算细节承接第 02 篇，这里聚焦"触发场景怎么映射到具体 Lane"
- **事件类型与 Lane 的绑定关系**（新增，重点）：不同触发来源的更新会被赋予不同的默认优先级——`requestUpdateLane` 在事件处理函数中被调用时，会根据当前事件的类型查表得到对应优先级：离散事件（`click`、`keydown`、`input` 等，用户主动触发且期待立即反馈）走 `DiscreteEventPriority` 对应 `SyncLane`；连续事件（`drag`、`scroll`、`mousemove` 等，触发频率高但不需要每次都同步处理）走 `ContinuousEventPriority` 对应 `InputContinuousLane`；没有明确事件上下文的更新（如 `setTimeout` 里的 `setState`）走 `DefaultEventPriority` 对应 `DefaultLane`；`startTransition` 内部的更新被强制标记为 `TransitionLane`，即使触发源是一次点击（离散事件），也会被降级处理——这解释了"同一次点击里，直接写的 `setState` 和被 `startTransition` 包裹的 `setState` 为什么会分别走不同优先级"这个常被问到的细节
- Lane 位运算的核心场景：`mergeLanes`、`getNextLanes`、`includesBlockingLane`（详见第 02 篇）
- `startTransition` 的调度降级：把内部的 update 打上 `TransitionLane`，这类 lane 的优先级远低于 `SyncLane`/`InputContinuousLane`，可以被后续的高优先级更新打断并重新调度
- `Suspense` 与并发渲染的协作：渲染中某个组件抛出一个 Promise，Fiber 被标记为挂起，`Suspense` 边界捕获后展示 `fallback`，Promise resolve 后触发 `pingLanes` 重新调度对应 lane 的渲染
- 优先级饿死与兜底机制的调度器视角（承接第 02 篇 `markStarvedLanesAsExpired`）：Scheduler 层面对应的是任务的 `expirationTime` 排序，两层机制（Lane 的过期兜底 + Scheduler 任务堆排序）共同保证低优先级任务不会无限期得不到执行

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. 时间片主循环：`packages/scheduler/src/forks/Scheduler.js` — `workLoop` 中 `shouldYieldToHost()`
2. MessageChannel 调度：`packages/scheduler/src/forks/SchedulerHostConfig.default.js` — `schedulePerformWorkUntilDeadline`
3. 事件优先级映射：`packages/react-dom/src/events/ReactDOMEventListener.js` — `getEventPriority` 根据 DOM 事件类型返回对应的 `EventPriority`
4. 优先级到 Lane 的转换：`packages/react-reconciler/src/ReactFiberWorkLoop.js` — `requestUpdateLane` 中 `getCurrentEventPriority` 与 lane 的对应关系
5. Lane 常量与优先级计算：`packages/react-reconciler/src/ReactFiberLane.js`（与第 02 篇联动）
6. `startTransition` 实现：`packages/react-reconciler/src/ReactFiberHooks.js` — 通过 `requestUpdateLane` 获取 `TransitionLane`
7. Suspense 挂起处理：`packages/react-reconciler/src/ReactFiberThrow.js` — `throwException` 捕获 thenable，`attachPingListener` 注册 resolve 后的重渲染回调

#### 四、生产级最佳实践
- HIS 系统的"患者列表切换科室筛选"用 `useTransition` 包裹筛选逻辑
- 处方药品检索输入框用 `useDeferredValue` 让搜索结果列表滞后于输入本身
- 非关键的联动校验（药品相互作用提示）用 `startTransition` 标记为低优先级
- 避免滥用 `startTransition` 包裹涉及受控输入本身的 `setState`
- 长列表配合 `Suspense` 做代码分割懒加载，`fallback` 使用与 HIS 系统视觉规范一致的骨架屏
- 排查"为什么这次更新没有被打断"类问题时，先确认触发来源对应的事件优先级，是否被误判为高优先级同步更新

#### 五、手写实现（可独立跑通）
用纯 Node.js（不依赖 React 本身）搭建一个最小化的"时间切片调度器"沙盘：用 `MessageChannel` 实现宏任务循环，模拟将"渲染 1000 个患者档案节点"拆成多个不超过 5ms 的小任务分片执行，加入一个简化版的优先级队列（数组模拟小顶堆），验证高优先级任务可以插队打断正在执行的低优先级任务。在此基础上新增：一个简化版"事件优先级映射表"（`click → sync`、`scroll → continuous`、`setTimeout → default`），根据模拟触发来源查表得到优先级再决定任务的调度顺序，验证同一批任务在不同触发来源下的执行顺序符合预期。用 Vite + TypeScript 搭建可在浏览器打开的 demo 页面，用 `performance.now()` 打点可视化展示。

#### 六、手写实现源码 GitHub 地址
（写作时填入）

#### 七、参考
- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com

**面试核心问**：
- 时间切片的本质是什么？为什么一定要把渲染过程拆成小任务？
- 为什么 Scheduler 选择 `MessageChannel` 而不是 `setTimeout(fn, 0)`？
- 点击事件里直接 `setState` 和用 `startTransition` 包裹 `setState`，分别会被分配到哪个 Lane？为什么表现不同？
- `startTransition` 和 `useTransition` 的区别是什么？分别在什么场景用？
- `Suspense` 是如何知道子组件"挂起"了的？resolve 之后 React 是怎么重新渲染的？

---

### 第 08 篇：React 18 事件系统与批处理原理

**副标题**：从"挂在 document 上"到"挂在 root 容器"，从"仅合成事件内批处理"到"处处自动批处理"

#### 一、基本使用
- 合成事件绑定：`<button onClick={handleClick}>` 中的 `onClick` 是 React 封装的 `SyntheticEvent`
- `e.nativeEvent` 访问原始浏览器事件对象
- `e.stopPropagation()` 只阻止合成事件在 React 事件系统内的传播，不等价于原生 `stopPropagation`
- React 18 中在原生事件回调、`setTimeout`、`Promise.then`、`fetch` 回调里多次 `setState` 会被自动合并为一次渲染（Automatic Batching，机制详见第 02 篇）
- `flushSync(() => setState(...))` 强制让某次更新同步执行并立刻反映到 DOM
- 事件委托是自动生效的：React 内部把所有事件统一委托到 root 容器上监听

#### 二、原理
- 合成事件为什么要自己实现一套：抹平浏览器事件模型的跨浏览器差异，并让事件调度接入 React 自己的优先级和批处理机制（与第 07 篇事件优先级映射联动）
- 事件委托机制：React 在 root 容器上对每一种事件类型委托监听一次，触发时通过 `event.target` 结合 Fiber 树向上收集所有相关的合成事件处理函数
- React 17 之前事件绑定在 `document` 上、React 17+ 改为绑定在 root 容器上：避免多版本 React 共存（渐进式迁移、微前端场景）时事件系统互相干扰
- 合成事件的两阶段模拟：`accumulateSinglePhaseListeners` 沿 Fiber 树向上收集捕获/冒泡阶段的处理函数
- Automatic Batching 的本质变化：React 17 靠"是否处于 React 事件处理函数执行上下文"判断是否批处理；React 18 在 Scheduler 层面统一批处理，不再依赖事件来源（与第 02 篇 Update 队列机制呼应）
- `flushSync` 的实现：强制把传入函数中产生的更新标记为 `SyncLane` 且立刻走一次同步渲染流程，跳过正常的批处理调度队列

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. 事件插件注册：`packages/react-dom/src/events/DOMPluginEventSystem.js` — `listenToAllSupportedEvents`
2. 事件分发入口：`packages/react-dom/src/events/DOMPluginEventSystem.js` — `dispatchEventForPluginEventSystem`
3. 监听器收集：`packages/react-dom/src/events/DOMPluginEventSystem.js` — `accumulateSinglePhaseListeners`
4. 批处理调度路径：`packages/react-reconciler/src/ReactFiberWorkLoop.js` — `scheduleUpdateOnFiber` 统一走批处理调度
5. `flushSync` 实现：`packages/react-reconciler/src/ReactFiberWorkLoop.js` — `flushSync` 临时切换执行上下文并立刻触发 `flushSyncCallbackQueue`

#### 四、生产级最佳实践
- 医生工作站"批量勾选患者列表 + 一键批量转诊"操作，多个 `setState` 天然享受自动批处理
- 药品库存扫码枪触发的原生事件回调中更新多个状态，React 18 下不再需要手动调用 `unstable_batchedUpdates`
- 需要在状态更新后立刻读取 DOM 布局信息的场景（处方单打印前测量内容高度分页）用 `flushSync`
- 排查"点击后页面没反应"类问题，先确认是否误用了原生 `addEventListener` 而不是 JSX 属性绑定

#### 五、手写实现（可独立跑通）
用 Vite + TypeScript 搭建一个不依赖 React 的最小事件委托系统：在"患者列表"容器上只挂一个原生 `click` 监听器，维护一份"虚拟事件注册表"，点击列表项时通过 `event.target` 向上遍历 DOM 树查找注册的处理函数并模拟冒泡阶段依次调用；再实现一个极简的"批处理"机制，用页面上的渲染次数计数器展示批处理前后的差异。

#### 六、手写实现源码 GitHub 地址
（写作时填入）

#### 七、参考
- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com

**面试核心问**：
- React 18 的自动批处理和 React 17 相比区别在哪？
- 合成事件为什么要自己实现一套，而不是直接用原生事件？
- React 17 把事件绑定从 `document` 改到 root 容器，解决了什么问题？
- `e.stopPropagation()` 在合成事件里和原生事件里的行为有什么不同？
- 什么场景下需要用 `flushSync`？滥用会有什么代价？

---

### 第 09 篇：React 18 Context 原理与手写实现

**副标题**：Context 值挂在 Fiber 节点上，Provider 变化时如何精确标记需要更新的子树

#### 一、基本使用
- `createContext(defaultValue)` 创建 Context 对象
- `<XxxContext.Provider value={...}>` 提供值，`value` 变化（`Object.is` 比较）会触发消费该 Context 的组件重渲染
- `useContext(XxxContext)` 读取最近一层匹配的 `Provider` 提供的值
- 类组件通过 `static contextType` 或 `<XxxContext.Consumer>` 读取
- 多个 Context 嵌套时，`useContext` 只会匹配组件树上"最近"的同一个 Context 的 `Provider`

#### 二、原理
- Context 值存储位置：`Provider` 对应 Fiber 的 `memoizedProps.value`，Context 对象本身维护 `_currentValue` 字段
- Provider 变化如何标记依赖子树更新：`propagateContextChange` 从 `Provider` 节点向下遍历整个子树，检查每个节点的 `dependencies`，匹配上就打更新标记
- 为什么被 `memo` 包裹也无法完全规避重渲染：`propagateContextChange` 的扫描不会被 `memo` 挡住
- 多层 Context 性能陷阱：把多个不相关状态塞进同一个 Context 的 `value`，任意字段变化都会导致所有消费组件被标记更新
- 拆分 Context 优化策略：按变化频率和粒度拆分独立的 Context
- `use-context-selector` 类库的实现思路：自建可订阅 store，只有 `selector` 计算结果真正变化才强制重渲染
- 对比 Vue 3 的 `provide/inject`：基于组件实例原型链查找 + 响应式系统精确依赖追踪，粒度比 React Context 的"广播式"通知更细

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. Context 对象创建：`packages/react/src/ReactContext.js`
2. Provider 渲染处理：`packages/react-reconciler/src/ReactFiberBeginWork.js` — `updateContextProvider`
3. 变化传播算法：`packages/react-reconciler/src/ReactFiberNewContext.js` — `propagateContextChange_eager`
4. Context 读取：`packages/react-reconciler/src/ReactFiberNewContext.js` — `readContext`
5. `useContext` Hook 入口：`packages/react-reconciler/src/ReactFiberHooks.js`

#### 四、生产级最佳实践
- HIS 系统"当前登录医生信息"和"当前诊室待诊患者队列"拆成两个独立 Context
- "药品字典数据"和"当前处方单编辑状态"分离成不同 Context
- 消费 Context 的深层组件优先只订阅需要的字段
- 高频更新 + 大范围消费场景优先考虑 `zustand` 等基于订阅而非 Context 广播的方案（与第 11 篇联动）

#### 五、手写实现（可独立跑通）
用 Vite + TypeScript 手写一个极简版 Context 系统：`createContext`（维护 `_currentValue` 和订阅者集合）、`Provider`、`useContext`；用"医生工作站患者队列广播"演示多消费者重渲染现象；再手写一个 `createContextSelector`，用重渲染次数计数器对比两种方案的差异。

#### 六、手写实现源码 GitHub 地址
（写作时填入）

#### 七、参考
- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com

**面试核心问**：
- Context 的值变化会导致所有消费组件重渲染吗？具体的传播机制是怎样的？
- 为什么被 `memo` 包裹的组件，在祖先 Context 变化时依旧会重渲染？
- 如何优化多层 Context 导致的性能问题？
- React 的 Context 机制和 Vue 3 的 `provide/inject` 在实现原理上有什么本质区别？
- `use-context-selector` 之类的库是怎么绕开原生 Context 的"广播式"更新的？

---

### 第 10 篇：React Router 6/7 原理与实战

**副标题**：从"组件里 useEffect 请求数据"到"路由跳转前预取数据"的范式转变，兼谈约定式路由的取舍

#### 一、基本使用
- `createBrowserRouter` 创建 Data Router 实例，配合 `<RouterProvider router={router} />` 渲染
- `loader` 字段：导航到该路由前触发，预取该页面所需数据
- `action` 字段：处理表单提交/数据变更，配合 `<Form method="post">`
- `useLoaderData()` 读取对应路由 `loader` 返回的数据
- 嵌套路由 + `<Outlet />`
- `useParams()`、`useNavigate()`、`useRevalidator()`

#### 二、原理
- Data Router 与"组件内 `useEffect` 请求数据"方式的本质区别：把数据获取提升到路由匹配层面，父子路由的 `loader` 并行执行，解决请求瀑布和"渲染与请求脱节"的问题
- 对比 Vue Router 4 的导航守卫：`beforeEnter` 只是一个时机钩子，开发者自己决定数据放哪；React Router 的 `loader` 是路由配置的一等公民，形成"路由即数据依赖声明"范式
- 嵌套路由与组件树的对应关系：路由树驱动 UI 组件树，`<Outlet />` 是子路由内容的插槽
- 路由匹配算法：按"静态段优先于动态段优先于通配符段"计算打分（`computeScore`），取分数最高的
- History API 监听：基于 `history` 库监听 `popstate`
- 权限路由的动态生成原理：根据角色过滤路由配置数组，配合 `loader` 中的权限校验做"数据加载层面的权限拦截"
- **约定式路由对比（原 umi 篇内容降级并入本篇）**：umi 等框架采用"扫描 `pages/` 目录结构自动生成路由配置"的约定式方案，`[id].tsx` 转动态参数、`_layout.tsx` 识别为嵌套布局，生成阶段直接在路由代码里写入 `React.lazy(() => import(...))` 实现自动代码分割；这是"配置显式声明（React Router）" vs "约定自动生成（umi）"两种路由方案的取舍——约定式减少手工维护成本、新成员通过目录结构就能理解页面层级，代价是路由行为不够直观（需要理解一套目录命名约定才能预判某个文件会生成什么路由）；显式配置式更灵活可控、迁移和调试更直接，代价是路由表需要手工维护同步。大型多团队协作、页面数量巨大且结构规整的系统（如后台管理系统矩阵）适合约定式；路由结构复杂多变、需要精细控制加载时机的场景（C 端产品）更适合显式配置

#### 三、源码解析（重点代码，来源 GitHub 仓库，以 remix-run/react-router 仓库为准）
1. Data Router 创建：`packages/react-router-dom/index.tsx` — `createBrowserRouter`
2. 路由匹配与打分：`packages/router/utils.ts` — `matchRoutes`、`computeScore`
3. 导航状态机核心：`packages/router/router.ts` — `startNavigation` 并行触发匹配链路上所有 `loader`
4. `loader`/`action` 数据流：`packages/router/router.ts` — `callLoaderOrAction`
5. `Outlet` 渲染子路由：`packages/react-router/lib/hooks.tsx`
6. `useLoaderData` 读取数据：`packages/react-router/lib/hooks.tsx`

#### 四、生产级最佳实践
- HIS 系统"患者详情"页面用 `loader` 预取患者档案 + 最近处方记录
- "新建处方"表单用 `<Form method="post">` + `action` 声明式提交
- 权限路由：登录后根据角色动态过滤路由配置数组
- 关键业务路由在对应 `loader` 中做二次权限校验并 `throw redirect('/403')`
- 长列表页切换分页/筛选时用 `useRevalidator`，避免整页重新挂载

#### 五、手写实现（可独立跑通）
用 Vite + TypeScript 搭建一个不依赖 react-router 的极简客户端路由：`history.pushState` + 监听 `popstate`；简化版路径匹配函数（把 `/patients/:id` 转成正则并提取参数），支持嵌套路由和 `Outlet` 占位渲染；手写极简的 `loader` 机制。用"医生工作站 -> 患者列表 -> 患者详情"这条路径演示完整流程。

#### 六、手写实现源码 GitHub 地址
（写作时填入）

#### 七、参考
- https://reactrouter.com/
- https://zh-hans.react.dev/
- https://umijs.org/

**面试核心问**：
- Data Router 的 `loader` 解决了什么问题？
- React Router 的嵌套路由和 `<Outlet />` 是怎么配合工作的？
- 路由路径匹配时，动态参数段和静态段谁的优先级更高？为什么这样设计？
- 权限路由一般怎么设计？
- 约定式路由（umi）和显式配置式路由（React Router）在团队协作和灵活性上各有什么取舍？

---

### 第 11 篇：React 状态管理选型：Redux Toolkit 源码与生产实践

**副标题**：从 `createStore` 的发布订阅到 RTK 的 Immer 加持，兼谈 MobX/Zustand 怎么选，dva 为什么退出主流

> 说明：本篇合并原大纲中并列的 Redux/MobX/dva/umi 四篇——Redux Toolkit 是主线（篇幅占比最大），MobX 与 Zustand 降级为对比小节，dva 降级为"历史方案"小节，umi 的路由部分已并入第 10 篇。

#### 一、基本使用
- `createStore(reducer)`（或 RTK 的 `configureStore`）、`store.getState()`、`store.dispatch(action)`、`store.subscribe(listener)`
- reducer 纯函数约定：`(state, action) => newState`
- `react-redux` 的 `<Provider store={store}>`、`useSelector`、`useDispatch()`
- Redux Toolkit 的 `createSlice({ name, initialState, reducers })`：Immer 允许"看似直接修改"的写法
- `createAsyncThunk` 处理异步逻辑，自动生成 `pending`/`fulfilled`/`rejected`
- RTK Query：`createApi` 声明式定义接口，自动生成带缓存、去重能力的 hooks
- **Zustand 基本用法**（新增）：`create((set) => ({ count: 0, inc: () => set(s => ({ count: s.count + 1 })) }))`，不需要 `Provider` 包裹，直接在组件里调用返回的 hook 读取状态
- **MobX 基本用法**（保留自原 10 篇，压缩篇幅）：`observable`/`computed`/`action`/`makeAutoObservable`/`observer`

#### 二、原理
- 发布订阅模式的核心：`createStore` 内部维护 `currentState` 和监听器数组，`dispatch` 调用 `reducer` 得到新 state 再遍历执行监听器
- `applyMiddleware` 的柯里化链条：三层柯里化函数串联成"洋葱模型"
- `combineReducers` 的分治思想：只有字段真正变化才返回新的顶层对象引用
- **`react-redux` 的精确订阅机制**：`useSelector` 内部基于 `useSyncExternalStore`（与第 06 篇联动回顾）——把 `store.subscribe` 作为订阅函数传入，每次变化重新执行 `selector` 并用 `Object.is` 比较，只有真正不同才触发重渲染，且天然规避了并发模式下的 tearing 问题
- RTK 的 Immer 集成原理：reducer 收到的 `state` 是 Immer 生成的 Proxy，"看似直接修改"的操作被记录下变更路径，最终生成结构共享的新 state
- RTK Query 的缓存和去重原理：`endpoint` 名称 + 参数序列化作为缓存 key，`invalidatesTags`/`providesTags` 机制自动让相关缓存失效
- **Zustand 的实现原理**（新增）：`create` 内部本质是一个极简的发布订阅 store（比 Redux 更薄的一层），配套的 `useStore` hook 直接基于 `useSyncExternalStore` 实现（React 18 之后的版本），这意味着 Zustand 不需要 `Provider`、不需要 `combineReducers`，用最少的抽象直接暴露"读取状态 + 订阅变化"两个能力；相比 Redux 的"严格 action/reducer 约定"，Zustand 允许在 `set` 里直接写更新逻辑，灵活度更接近 MobX，但状态更新仍然是不可变式的（`set` 替换引用，不是 Proxy 拦截可变写法），这是它和 MobX 的本质区别
- **MobX 的响应式原理**（压缩自原篇）：Proxy 拦截 `get`/`set`，自动依赖收集与派发通知，`observer` 把组件渲染函数包装成 Reaction；细粒度追踪但 React 渲染单元是组件级，收益主要体现在"减少整组件重渲染"而非精确 DOM 更新
- **dva 作为历史方案回顾**（原 11 篇内容大幅压缩）：dva 本质是 Redux + Redux-Saga 的约定式封装，用 Generator 函数配合 `call`/`put`/`select` 等 effect 描述符让异步流程"看起来像同步代码"，`dva-loading` 自动跟踪 effect 的 loading 状态；这套方案在 Generator/Saga 心智负担较重、且社区已转向 `async/await` 配合 `createAsyncThunk` 或 Zustand 的今天，新项目已经很少选择，了解其设计思路（描述式副作用、可测试性）即可，不建议新项目采用
- 三种方案的核心差异总结：Redux Toolkit 是"显式 action + 严格不可变"换取大团队可追踪性；MobX 是"隐式响应式 + 面向对象"换取样板代码最少；Zustand 是"极简发布订阅 + 无 Provider"换取最低的心智负担和包体积，是当前中小型项目和库作者最常见的"轻量替代方案"选择

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. store 核心实现：`redux/src/createStore.ts`
2. 中间件链条：`redux/src/applyMiddleware.ts`
3. reducer 合并：`redux/src/combineReducers.ts`
4. 精确订阅：`react-redux/src/hooks/useSelector.ts` — 基于 `useSyncExternalStore` 的选择器订阅实现
5. Immer 集成：`@reduxjs/toolkit/src/createSlice.ts`
6. Zustand 核心实现：`zustand/src/vanilla.ts`（极简 store）与 `zustand/src/react.ts`（`useSyncExternalStore` 绑定）
7. MobX Proxy 拦截：`mobx/src/types/observableobject.ts`

#### 四、生产级最佳实践
- 医院管理系统的处方审核流程用 `createSlice` 管理"处方单状态机"
- 处方提交、审核通过等异步操作统一用 `createAsyncThunk` 封装
- 患者列表、药品目录等只读为主的数据获取用 RTK Query
- 大团队协作场景优先 Redux Toolkit（可追溯、DevTools 时间旅行调试）
- 中小型模块或独立工具组件、快速原型优先考虑 Zustand（无 Provider、包体积小）
- 患者体征监测大屏这类"状态天然是对象、逻辑偏面向对象"的场景可以考虑 MobX，但需要更强的团队规范配合其隐式响应式
- 新项目不建议再引入 dva，存量项目维护阶段理解其设计思路即可
- 避免把频繁变化的局部 UI 状态也塞进全局 store

#### 五、手写实现（可独立跑通）
用纯 TypeScript 实现一个约 100 行的 mini-Redux（`createStore`/`applyMiddleware`/`combineReducers`），用"处方单状态机"演示；在此基础上新增一个约 30 行的 mini-Zustand（`create` 函数返回一个基于订阅者集合的 hook，直接对接一个简化版 `useSyncExternalStore` 用法），对比两者在同一个"处方单状态机"场景下的代码量和使用方式差异。

#### 六、手写实现源码 GitHub 地址
（写作时填入）

#### 七、参考
- https://redux.js.org/
- https://react-redux.js.org/
- https://redux-toolkit.js.org/
- https://zustand-demo.pmnd.rs/
- https://mobx.js.org/
- https://github.com/dvajs/dva

**面试核心问**：
- Redux 的核心是什么？用一句话描述它的数据流转过程
- `react-redux` 的 `useSelector` 是怎么做到"只有相关字段变化才重渲染"的，和并发渲染的 tearing 问题有什么关系？
- RTK 的 `createSlice` 为什么可以"直接修改" state？背后的 Immer 是怎么工作的？
- Zustand 为什么不需要 `Provider`？它和 Redux 在状态更新方式上的本质区别是什么？
- 给一个多团队协作的中大型后台系统选型，Redux Toolkit、MobX、Zustand 之间你会怎么权衡？dva 现在还值得选吗？

---

### 第 12 篇：React 18 SSR 与 RSC 原理与实战

**副标题**：从 `renderToString` 到 `renderToPipeableStream`，再到 Server Components 把"组件"本身搬到服务端

> 说明：内容承接原大纲第 13 篇，编号顺移，正文内容不变。

#### 一、基本使用
- `renderToString`：同步把组件树渲染为 HTML 字符串
- `renderToPipeableStream`（Node.js）/ `renderToReadableStream`（Web Streams）：React 18 推荐的流式 SSR API
- `<Suspense fallback={...}>` 在 SSR 场景下的作用
- `onShellReady`/`onShellError`/`onAllReady`/`onError` 几个生命周期回调的用途区分
- `hydrateRoot(container, <App />)`：客户端接管服务端渲染好的 DOM
- React Server Components（RSC）基本用法（以 Next.js App Router 为载体）：`app/` 目录默认 Server Component，`"use client"` 标记 Client Component
- Server Component 中可以直接 `await` 数据库查询/接口请求
- Server Component 可以直接把 Client Component 作为子节点渲染，但反过来不行

#### 二、原理
- `renderToString` 的局限：同步阻塞，必须等所有组件渲染完毕才能拿到最终字符串
- Fizz 渲染器与流式渲染：遇到 `Suspense` 边界包裹的挂起内容不阻塞整体输出，先写入 `fallback`，真实内容准备好后通过内联 `<script>` 补丁流式替换
- Selective Hydration：为每个 `Suspense` 边界独立调度 hydration 任务，用户交互可以提升该区域的 hydration 优先级
- `onShellReady` 与"外壳"概念：shell 是不依赖异步数据的部分，准备好即可发送
- hydration 不匹配问题的原理：服务端和客户端渲染结果不一致时触发警告并回退客户端重新渲染
- RSC 与传统 SSR 的本质区别：SSR 解决"首屏 HTML 谁来生成"，RSC 解决"组件代码本身要不要打包到客户端"
- RSC 的序列化机制：Server Component 渲染输出是 RSC Payload，Client Component 引用被编码成占位标记
- "边界"设计的意义：`"use client"` 边界应尽量下沉到叶子节点
- 对比 Vue 3 生态：Nuxt 3 提供传统 SSR + 岛屏架构，没有与 RSC 完全对等的机制

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. 流式渲染入口（Node 环境）：`packages/react-dom/src/server/ReactDOMFizzServerNode.js`
2. Fizz 渲染核心：`packages/react-server/src/ReactFizzServer.js`
3. 客户端接管入口：`packages/react-dom/src/client/ReactDOMRoot.js` — `hydrateRoot`
4. Selective Hydration 调度：`packages/react-reconciler/src/ReactFiberHydrationContext.js`
5. RSC 序列化与解析：`packages/react-server/src/ReactFlightServer.js`；`packages/react-client/src/ReactFlightClient.js`

#### 四、生产级最佳实践
- 医生工作台首页用 `renderToPipeableStream`，核心内容作为 shell 优先渲染
- 涉及患者隐私数据的接口不在 SSR 阶段暴露在 HTML 源码注释或调试信息里
- 涉及 `Date.now()`、`Math.random()` 等逻辑明确区分"仅客户端执行"的代码路径
- 对 SEO 有强需求的页面优先保证 `onShellReady` 尽快触发
- 患者档案、药品目录这类详情展示页尽量写成 Server Component 直接查询数据
- 涉及患者隐私数据的查询逻辑放在 Server Component 里执行

#### 五、手写实现（可独立跑通）
用 Express + React 18 + TypeScript 搭建"医生工作台"SSR demo：`renderToPipeableStream` 渲染，"待诊患者列表"作为 shell 立即输出，"最近处方统计图表"包裹在 `Suspense` 中并模拟延迟；客户端用 `hydrateRoot` 接管。RSC 部分用最小化的 Next.js App Router demo 演示 Server/Client Component 边界与客户端 JS 体积对比。

#### 六、手写实现源码 GitHub 地址
（写作时填入）

#### 七、参考
- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://nextjs.org/docs/app/building-your-application/rendering/server-components

**面试核心问**：
- `renderToString` 和 `renderToPipeableStream` 的本质区别是什么？
- Selective Hydration 解决了什么问题？
- SSR 场景下 hydration 不匹配问题通常是怎么产生的？
- RSC 和传统 SSR 解决的是同一个问题吗？两者可以叠加使用吗？
- 为什么 Client Component 不能直接 `import` 并渲染 Server Component？

---

### 第 13 篇：React 18 性能优化全攻略

**副标题**：从 `memo`/`useMemo` 到虚拟列表和 Transition Lane 调优，一套系统化的性能问题排查方法论

> 说明：内容承接原大纲第 14 篇，编号顺移；`memo`/bailout 的源码细节已在第 03 篇讲透，本篇聚焦"怎么系统化排查和应用"。

#### 一、基本使用
- `React.memo(Component)`、`useMemo`、`useCallback`
- 虚拟列表（`react-window`/`@tanstack/react-virtual`）
- `React.lazy` + `Suspense`
- `useTransition`/`useDeferredValue`
- React DevTools Profiler

#### 二、原理
- `memo` 的浅比较机制与 bailout 的关系（详见第 03 篇，这里回顾结论）
- `useMemo`/`useCallback` 的依赖比较：`Object.is` 逐项比较
- 虚拟列表的核心原理：只渲染可视区域内的列表项
- `React.lazy` 的实现：惰性初始化的 thenable，配合 Suspense 挂起机制
- `useTransition`/`useDeferredValue` 的调优原理（详见第 07 篇，这里聚焦应用场景）
- 性能优化的系统化排查方法论：先用 Profiler 定位"谁在重渲染、耗时多少"，区分"渲染次数过多"和"单次渲染耗时过长"两类问题分别用不同手段解决

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. `memo` 的比较逻辑：`packages/react/src/ReactMemo.js` 与 `packages/shared/src/shallowEqual.js`
2. `useMemo`/`useCallback` 依赖比较：`packages/react-reconciler/src/ReactFiberHooks.js` — `areHookInputsEqual`
3. `React.lazy` 挂起机制：`packages/react/src/ReactLazy.js`

#### 四、生产级最佳实践
- 万级药品目录列表用虚拟列表方案
- 大表单中展示型子组件用 `memo` 包裹，配合 `useCallback` 稳定回调引用
- 药品说明书详情页、统计报表页用 `React.lazy` 做代码分割
- 处方检索输入框结合 `useDeferredValue`
- 优化前先用 Profiler 量化问题，避免凭直觉到处套用 `memo`/`useMemo`

#### 五、手写实现（可独立跑通）
用 Vite + TypeScript + React 18 实现一个固定高度虚拟列表组件，用"万级药品目录"模拟数据演示流畅滚动效果，并和"不做虚拟化直接渲染全部万级节点"的版本做 Profiler 录制对比。

#### 六、手写实现源码 GitHub 地址
（写作时填入）

#### 七、参考
- https://zh-hans.react.dev/
- https://github.com/bvaughn/react-window
- https://tanstack.com/virtual

**面试核心问**：
- `memo`、`useMemo`、`useCallback` 三者各自解决什么问题？滥用会有什么代价？
- 虚拟列表的核心原理是什么？
- `React.lazy` 是怎么和 `Suspense` 配合实现代码分割的？
- `useDeferredValue` 具体是怎么实现"输入流畅、结果滞后"效果的？和 debounce/throttle 有什么本质区别？
- 系统化排查 React 性能问题的思路是什么？

---

### 第 14 篇：Turborepo + pnpm + Vite + React 18 通用后台管理系统从零搭建

**副标题**：把前 13 篇的知识点串起来，搭一套可以直接拿去用的医院管理系统脚手架，兼谈自定义 Hook 的插件化设计模式

> 说明：内容承接原大纲第 16 篇，编号顺移；原独立成篇的「第 15 篇 ahooks 源码解析」降级为本篇的第五小节「自定义 Hook 设计模式」。

#### 一、基本使用
- 目录结构规划：`apps/`、`packages/` 的 Monorepo 布局
- `pnpm-workspace.yaml` 声明工作区范围，`turbo.json` 声明任务依赖图
- Vite 创建 React 18 + TypeScript 项目模板
- 集成 Ant Design 搭建后台管理系统整体布局
- 集成 React Router 6/7 + 状态管理方案（第 10/11 篇结论）
- **`useRequest` 基本用法**（原 ahooks 篇内容）：自动请求、`manual: true` 手动模式、`onSuccess`/`onError`、防抖节流配置、`pollingInterval` 轮询、`cacheKey` 缓存与 SWR 策略

#### 二、原理
- Turborepo 的任务图与缓存机制：基于内容哈希判断任务是否需要重新执行
- pnpm workspace 的依赖管理原理：内容寻址存储 + 符号链接，避免幽灵依赖
- Vite 的开发体验优化原理：原生 ESM 按需编译 + esbuild 预构建
- Monorepo 下状态管理选型的落地考量（承接第 11 篇结论）：Redux Toolkit / MobX / Zustand 选型对比表
- **自定义 Hook 设计模式：ahooks 的插件化架构**（原独立篇内容压缩并入）：`useRequest` 核心是一个精简的 `Fetch` 类管理请求生命周期，"高级功能"（防抖、节流、轮询、缓存、竞态处理）都是以插件形式挂载——每个插件是一个自定义 Hook，接收 `Fetch` 实例并返回一组生命周期钩子（`onBefore`/`onRequest`/`onSuccess`/`onError`/`onFinally`）；请求竞态处理用自增的 `fetchId` 判断结果是否过期，比 `AbortController` 更轻量；SWR 缓存策略用模块级 Map 共享缓存并支持"先展示旧数据、后台静默更新"；这套"小核心 + 可插拔能力模块"的设计思路可以推广到任何需要"渐进增强、按需组合"的自定义 Hook 设计中

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. Turborepo 任务调度：`turborepo` 仓库 `crates/turborepo-lib/src/run/`（概览级介绍）
2. pnpm 的内容寻址存储：`pnpm` 仓库 `packages/store/`（概览级介绍）
3. Vite 预构建：`vite` 仓库 `packages/vite/src/node/optimizer/index.ts`（概览级介绍）
4. useRequest 入口：`packages/hooks/src/useRequest/src/useRequest.ts` — 组装 `Fetch` 实例和所有插件
5. Fetch 核心类：`packages/hooks/src/useRequest/src/Fetch.ts` — 竞态处理的 `fetchId` 机制
6. 缓存插件：`packages/hooks/src/useRequest/src/plugins/useCachePlugin.ts`

> 说明：本篇聚焦"工程化整合与选型落地"，Turborepo/pnpm/Vite 源码解析部分以理解核心机制为主，重点仍是前 13 篇已深入讲解的 React 生态自身源码。

#### 四、生产级最佳实践
- Monorepo 中 `packages/ui`、`packages/request`、`packages/utils` 独立版本管理
- `turbo.json` 中合理声明任务的 `inputs`/`outputs`
- CI 流水线中启用 Turborepo 远程缓存
- 处方列表查询用 `useRequest` 自动请求 + `refreshDeps`，提交类操作用 `manual: true`
- 患者搜索输入框配置 `debounceWait` 直接声明式防抖
- 药房库存看板用 `pollingInterval` 声明式轮询

#### 五、手写实现（可独立跑通）
搭建一个完整可运行的 Monorepo 脚手架：`pnpm-workspace.yaml` + `turbo.json`；`packages/ui` 提供基础组件；`packages/request` 封装统一请求实例；`apps/admin` 用 Vite + React 18 + TypeScript + React Router 6/7 + Redux Toolkit + RTK Query + Ant Design 搭建"医院管理系统"后台（登录页、患者列表页、处方审核页）。额外新增：用 TypeScript 手写一个简化版 `useRequest`（`Fetch` 类 + 竞态处理 + 一个防抖插件 + 一个简单缓存插件），验证插件化架构可以正常工作。

#### 六、手写实现源码 GitHub 地址
（写作时填入）

#### 七、参考
- https://turbo.build/repo/docs
- https://pnpm.io/
- https://vitejs.dev/
- https://redux.js.org/
- https://ahooks.js.org/

**面试核心问**：
- Turborepo 的缓存机制是怎么判断"任务是否需要重新执行"的？
- pnpm 的符号链接结构是怎么避免"幽灵依赖"问题的？
- Vite 的开发环境为什么比 Webpack 启动更快？
- `useRequest` 的插件化架构是怎么设计的？核心状态机和插件之间是怎么协作的？
- 请求竞态问题是怎么产生的？ahooks 是怎么用 `fetchId` 机制解决的，相比 `AbortController` 有什么优劣？

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
https://zustand-demo.pmnd.rs/
https://mobx.js.org/README.html
https://github.com/dvajs/dva
https://umijs.org/
https://ahooks.js.org/
```

- `react.dev`（中文站）：官方文档，Hooks 基本用法、并发特性说明，覆盖第 01/02/06/07/08/13 篇
- `jonny-wei.github.io/blog/react`、`react.iamkasong.com`：React 源码系列博客，Fiber/Diff/Hooks/Scheduler 源码解读参考，覆盖第 03/04/05/06/07 篇
- `pomb.us/build-your-own-react`：Fiber 极简手写实现（Didact），第 03 篇「手写实现」章节的核心参照
- `github.com/wbccb/Frontend-Articles`：源码解析文章合集，作为源码解析章节的补充交叉验证素材
- `nextjs.org`：第 12 篇 SSR/流式渲染/RSC 的生产级实践参照
- `reactrouter.com`：第 10 篇 Data Router 权威文档
- `redux.js.org`：第 11 篇 Redux + Redux Toolkit 权威文档
- `zustand-demo.pmnd.rs`：第 11 篇 Zustand 对比小节参照
- `mobx.js.org`：第 11 篇 MobX 对比小节参照
- `github.com/dvajs/dva`：第 11 篇 dva 历史方案小节参照
- `umijs.org`：第 10 篇约定式路由对比小节参照
- `ahooks.js.org`：第 14 篇自定义 Hook 设计模式小节参照

> 引用要求延续 Vue 3 系列规范：正文中不出现具体博主名/账号名/人名，仅在文末参考池中列 URL；源码解析章节标注的源文件路径以 React 官方仓库（`facebook/react`）目录结构为准，与上述博客的版本号如有差异需在写作时核对当前 React 版本（18.x）。

---

*重构时间：2026-08-28 | 参考：React 官方文档 / React 18 源码 / React Router / Redux / Zustand / MobX / dva / umi 官方文档 / 卡颂《深入React技术栈》理念篇目录*

