# prompt

```text
/publish 下面我们规划React 18全家桶的第1篇文章，具体如下：
{{
## 知识点范围

### 标题（控制在 64个字以内，以（面试收藏级）结尾）

- 第 01 篇：React 18 架构全景: 从 Stack 到 Fiber 的演进与源码调试环境搭建（面试收藏级）

**副标题**：Stack Reconciler 的局限、Fiber 链表如何实现可中断渲染、并发模式设计思想

#### 一、使用与实践

**JSX 编译与 React Element 结构（前置知识）**：
- JSX 语法糖：`<div className="box">{content}</div>` 经 Babel 转换为 `React.createElement(type, props, ...children)`
- React Element 对象结构：`{ type, props, key, ref }` 普通 JS 对象（描述），Fiber 节点是运行时实例（工作单元）
- 对比 Vue 3：Vue 模板编译为 `createVNode`，可做静态分析（PatchFlag）；JSX 完全动态无法编译优化

**基本使用**：
- `ReactDOM.render(<App />, container)` → `createRoot(container).render(<App />)`：Legacy 模式与 Concurrent 模式的入口切换
- `createRoot` 后自动批处理（automatic batching）：不论在事件回调、Promise、setTimeout 中调用 `setState`，都会被合并为一次渲染
- `<StrictMode>` 在开发环境下对函数组件、`useState` initializer、`useReducer` 等故意执行两次，用来暴露不纯的渲染逻辑
- `startTransition(() => setFilterKeyword(value))`：把非紧急更新标记为可中断的低优先级任务
- `React.lazy(() => import('./PrescriptionForm'))` + `<Suspense fallback={...}>`：按路由/模块拆分代码

**本地调试 React 源码环境搭建**：
1. `git clone facebook/react` → `pnpm i`
2. `yarn build react,react-dom,scheduler,react-reconciler --type=NODE_DEV` 打出本地开发版包
3. 业务项目里用 `pnpm link` 或 Vite `resolve.alias` 把 `react`/`react-dom` 指向本地构建产物
4. 在 VSCode 里对 `beginWork`/`dispatchSetState` 打断点，触发一次 `setState` 观察真实调用栈

**场景实战**：
- HIS 系统首页存在大量指标卡片 + 患者列表时，用 `createRoot` 开启并发特性，避免全局检索输入时主线程被长时间占用
- 用 `startTransition` 包裹处方列表的筛选/排序逻辑，保证筛选输入框始终响应，列表更新可以被打断
- 按"问诊模块 / 处方模块 / 检验报告模块"用 `React.lazy` 做路由级代码分割，减小 HIS 系统首屏包体积
- 用 `StrictMode` 在开发环境暴露医嘱录入表单组件的副作用不纯问题
- 用 `useSyncExternalStore` 订阅医生排班这类外部数据源，避免手写 `useEffect + useState` 组合带来的并发渲染撕裂问题

#### 二、设计与原理

**FiberNode 数据结构速览**（先建立第一印象，逐字段详解留给第 03 篇）：
  - `type`：组件类型（函数/类）或宿主标签字符串（`'div'` 等）
  - `key`：列表渲染唯一标识，diff 时用于判断节点能否复用
  - `return`/`child`/`sibling`：父、第一个子、下一个兄弟三个指针，把组件树组织成链表结构
  - `alternate`：指向双缓存树中"另一棵树"的对应节点（`current` ↔ `workInProgress`）
  - `flags`：副作用标记位（Placement / Update / Deletion 等），commit 阶段据此执行真实 DOM 操作
  - `lanes`：该 Fiber 上待处理的更新优先级（详见第 02 篇 Lane 模型）
  - `memoizedProps`/`pendingProps`：上次已提交的 props / 本次处理中的 props
  - `memoizedState`：上次渲染的状态——Class 组件是 state 对象，函数组件是 Hook 链表的头节点
  - `updateQueue`：更新队列（详见第 02 篇）
  - `stateNode`：对应的宿主实例（DOM 元素）或组件实例
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

#### 四、手写实现（可独立跑通）
1. 用 Node.js 脚本对比"递归遍历"与"链表遍历"两种方式处理同一棵"处方单渲染树"：递归版模拟 Stack Reconciler，一旦开始无法中断；链表版把节点组织成 `child/sibling/return` 结构，用 `setTimeout` 或 `MessageChannel` 模拟时间切片，每处理若干节点后主动让出执行权，通过日志打印证明遍历可以被打断和恢复
2. **自定义渲染器实战**：基于真实的 `react-reconciler` 包（不是手写协调算法，是调用官方包）实现一个渲染到终端命令行的极简渲染器——实现 `HostConfig` 里的 `createInstance`（创建一个内存中的"节点对象"而非真实 DOM）、`appendChild`、`commitUpdate`、`removeChild` 等必需方法，把"处方单药品清单"用树状文本结构打印到终端，每次数据变化后重新打印，直观证明"协调算法（Fiber/Diff/调度）与渲染平台完全解耦"这个架构设计的价值——同一套 `react-reconciler` 既能渲染 DOM，也能渲染终端文本

#### 五、手写实现源码 GitHub 地址
https://github.com/lotosv2010/react-source

#### 六、参考
- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com

**面试核心问**：
- 为什么 React 15 要重构成 Fiber？Fiber 具体解决了什么问题？
- Fiber 链表结构和可中断渲染之间是什么关系？
- concurrent 渲染和 legacy 渲染在调用方式和调度行为上分别有什么核心区别？
- `react-reconciler` 为什么要独立成一个不依赖具体渲染平台的包？如果让你给 React 写一个 Canvas 渲染器，大致需要实现哪些接口？
- 本地怎么调试 React 源码？为什么业务项目里直接改 `node_modules` 里的 React 源码不是一个好的调试方式？


## 分析角度（每个子主题都按此展开）

A · 实操五段式（适用于有「手写内核」的篇章）

是什么 → 核心原理 → 手写实现（关键代码） → 生产级最佳实践 → 完整最佳实践代码

B · 概念四段式（适用于概念/架构/方法论篇章）

真实场景引入 → 概念/机制拆解 → 决策矩阵或对比表 → 行动清单

## 已有笔记

- 

## plans 地址

- @docs\plans\react18-family-series-outline.md

## 规则

- 所有的源码解析都是 react 18 的版本，仓库地址 https://github.com/react/react
- 本系列笔记较少，没有笔记的时候，根据你的经验和我提供的url 如 https://react.iamkasong.com/#%E7%AB%A0%E8%8A%82%E8%AF%B4%E6%98%8E等，找出缺失或浅尝辄止的知识点
- 笔记只关注 @docs/notes/07 react 目录下的，其他目录禁止自行读取
- 补全内容（保留原有内容，只增不删），保留图片，一些知识点的说明图片可以从网络上获取，尽量使用图片加以说明，这样跟容易学习和理解
- 将整理后的内容生成公众号文章，输出到 @docs/articles/07 react
- 文章结构：先出大纲等我确认，再逐节写作
}}
，注意⚠️：
- 保留笔记完整代码和图片，样式格式保持一致和这篇@docs\articles\07 react\2026-08-28-react18-design-architecture.md，不读我没要求到的文件；
- 可以根据你的经验和最佳实践查漏补缺；主线要明确清晰，不要遗漏源码解析章节；每个知识点都要由浅入深的彻底讲透，讲明白。
- react 18 系列的文章中每一篇的知识点讲解中都需要讲清楚问什么要这样设计。
- 手写实现，环境搭建在第一篇中完成，后面的react 18 讲解的文章直接接着上一遍和笔记中的手写实现的代码。手写源码仓库和参考只保留url。
- 手写源码地址为@D:\github\react-source\packages\react\src\index.ts、@D:\github\react-source\packages\react-dom\index.ts
- react 源码我已经下载到本地了地址为@D:\github\react\package.json，查看代码可以使用codegraph
```
