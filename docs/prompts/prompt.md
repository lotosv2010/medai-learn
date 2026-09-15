# prompt

```text
/publish 下面我们规划React 18全家桶的第1篇文章，具体如下：
{{
## 知识点范围

### 第 07 篇：React 18 并发渲染: Scheduler 时间切片、Lane 模型与 Suspense 原理（面试收藏级）

**副标题**：MessageChannel 时间切片、事件优先级到 Lane 映射、startTransition 与 Suspense 协作

#### 一、使用与实践
- `useTransition`：将非紧急更新标记为可中断的过渡态
- `startTransition`：不需要 pending 状态时的轻量版 API
- `useDeferredValue`：让某个值"延迟跟随"最新值更新
- `Suspense` 配合 `lazy()`：组件级代码分割 + 加载态兜底
- `Suspense` 配合数据请求：结合支持 Suspense 的数据源实现"读取即挂起"模式
- 并发模式下 `ReactDOM.createRoot` 是开启一切并发特性的前提

#### 二、设计与原理
- 时间切片的本质：把渲染工作拆成不超过 5ms 的"工作单元"，每跑完一个时间片就把控制权交还浏览器
- **协作式调度 vs 抢占式调度**（新增，重点）：React Scheduler 本质是**协作式调度（cooperative scheduling）**，不是真正的**抢占式调度（preemptive scheduling）**——JS 是单线程的，运行时没有能力像操作系统调度线程那样在任意一条指令处强行打断正在执行的函数；React 所谓的"可中断渲染"，实际上是把 Fiber 树的遍历拆成一个个"工作单元"（每个工作单元对应一个 Fiber 节点的 `beginWork`/`completeWork`），每处理完一个工作单元后，`workLoopConcurrent` 主动调用一次 `shouldYieldToHost()` 检查时间片是否用完——这是任务"自己选择在约定好的检查点让步"，属于协作式；真正的抢占式调度（如操作系统线程调度、Go 的 goroutine 早期版本）是由调度器/运行时在任意时刻强行剥夺执行权，不需要任务配合
  - 这个区别解释了一个常见误解："并发渲染能让任意耗时的渲染都不卡顿"——不对：如果单个组件的渲染函数本身写了一个耗时很长的同步循环（比如函数组件体内直接跑一个大计算），React 只能在**工作单元之间**的检查点让步，无法打断**正在执行中的某一个工作单元**本身，这个组件仍然会阻塞主线程直到这次渲染函数跑完
  - 对比 Vue 3：Vue 3 的响应式更新调度同样运行在 JS 单线程环境里，`nextTick` 走的是微任务队列合并再统一执行，本身没有时间切片和"渲染中途让步"的概念，也就不存在协作式/抢占式调度的取舍问题——这一层调度能力是 React Fiber 架构特有的
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

#### 四、手写实现（延续 `lotosv2010/react-source` monorepo，本篇给 `scheduler`/`react-reconciler` 补上优先级调度与 Suspense）
第 01 篇的 `packages/scheduler` 只有单一优先级的任务队列，本篇补成真正的小顶堆任务队列（`taskQueue`/`timerQueue`），验证高优先级任务可以插队打断正在执行的低优先级任务；在 `packages/react-reconciler` 里实现 `requestUpdateLane`，补一个简化版"事件优先级映射表"（`click → SyncLane`、`scroll → InputContinuousLane`、`setTimeout → DefaultLane`），`startTransition` 内部更新强制打上 `TransitionLane`；再实现最小化的 Suspense：组件渲染阶段 `throw` 一个 Promise，`ReactFiberThrow.ts` 捕获后向上找最近的 Suspense 边界渲染 `fallback`，Promise resolve 后通过 `pingLanes` 重新调度。用 `examples/prescription.html` 新增一个"1000 条患者档案列表 + 检索输入框"的场景，验证高优先级的输入框更新能打断正在进行的低优先级列表渲染，并用 Chrome DevTools Performance 面板观察分片。

#### 五、手写实现源码 GitHub 地址
https://github.com/lotosv2010/react-source

#### 六、参考
- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com
- https://github.com/wbccb/Frontend-Articles

**面试核心问**：
- 时间切片的本质是什么？为什么一定要把渲染过程拆成小任务？
- React 的并发渲染是"抢占式调度"吗？为什么？协作式和抢占式调度的本质区别是什么？
- 如果某个组件的渲染函数本身包含一个耗时很长的同步循环，`startTransition` 或时间切片能让它不阻塞主线程吗？为什么？
- 为什么 Scheduler 选择 `MessageChannel` 而不是 `setTimeout(fn, 0)`？
- 点击事件里直接 `setState` 和用 `startTransition` 包裹 `setState`，分别会被分配到哪个 Lane？为什么表现不同？
- `startTransition` 和 `useTransition` 的区别是什么？分别在什么场景用？
- `Suspense` 是如何知道子组件"挂起"了的？resolve 之后 React 是怎么重新渲染的？


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
- 本系列 适用于 5-10年的React 开发者，想要系统性的学习，并且想要完全掌握 react 源码的开发者。
- 保留笔记完整代码和图片，样式格式保持一致和这篇@docs\articles\07 react\2026-09-17-react18-commit-phases.md，不读我没要求到的文件；
- 可以根据你的经验和最佳实践查漏补缺；主线要明确清晰，不要遗漏源码解析章节；每个知识点都要由浅入深的彻底讲透，讲明白。
- react 18 系列的文章中每一篇的知识点讲解中都需要讲清楚问什么要这样设计。
- 手写实现，环境搭建在第一篇中完成，后面的react 18 讲解的文章直接接着上一遍和笔记中的手写实现的代码。手写源码仓库和参考只保留url。
- 手写源码地址为@D:\github\react-source\packages\react\src\index.ts、@D:\github\react-source\packages\react-dom\index.ts
- react 源码我已经下载到本地了地址为@D:\github\react\package.json，查看代码可以使用codegraph
```
