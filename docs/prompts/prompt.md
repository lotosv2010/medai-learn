# prompt

```text
/publish 下面我们规划React 18全家桶的第1篇文章，具体如下：
{{
## 知识点范围

### 第 06 篇：React 18 Hooks 深度: 设计哲学、dispatcher 切换与 Hook 链表源码（面试收藏级）

**副标题**：Hooks 设计哲学、dispatcher 机制、Hook 链表、useSyncExternalStore 防撕裂原理

> 说明：本篇合并原大纲中拆开的「Hooks 基本使用」与「Hooks 源码解析」两篇——同一个 Hook 的"怎么用"和"为什么这样设计"放在一起讲，避免中间被架构/渲染篇打断主线。

#### 一、使用与实践
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
- **Fragment 内置组件**（新增）：`<></>`（短语法）与 `<React.Fragment key={...}>` 的区别——Fragment 允许返回多个子节点而不额外包裹 DOM 元素；短语法 `<>` 不支持 `key` 属性，列表渲染需要 key 时必须用显式 `<React.Fragment key={...}>`；在 Fiber 树中 `fiber.tag === Fragment`，Diff 时直接处理其子节点数组、不产生额外宿主节点；对比 Vue 3 的 `<template>` 在编译后同样被优化掉、不产生额外 VNode
- Error Boundary：类组件通过 `static getDerivedStateFromError` + `componentDidCatch` 捕获子树渲染期间的异常

#### 二、设计与原理
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

#### 四、手写实现（延续 `lotosv2010/react-source` monorepo，本篇给 `react-reconciler` 补上完整的 Hooks 体系）
在 `packages/react-reconciler` 的 `ReactFiberHooks.ts` 里正式实现 `renderWithHooks`（渲染函数组件前切换 `ReactCurrentDispatcher.current`）与 `HooksDispatcherOnMount`/`HooksDispatcherOnUpdate` 两套 dispatcher，`mountState`/`updateState` 在 Fiber 上维护 Hook 链表（`fiber.memoizedState` 指向链表头），`mountEffect`/`updateEffect` 把 Effect 对象追加进第 05 篇已经搭好的 effect 环形链表（区分 `HookLayout`/`HookPassive`/`HookInsertion` 标记）；故意在 demo 里把 `useState` 放进 `if` 制造状态错位的 bug，验证"顶层调用"规则存在的必要性。再补上 `mountSyncExternalStore`/`updateSyncExternalStore`（含 `checkIfSnapshotChanged` 比较逻辑），用医生排班 store 模拟"渲染中途外部 store 变化"场景，对比有无快照比较时 tearing 是否发生；`packages/react` 补充 `ReactHooks.ts` 转发到当前 dispatcher 的机制。全部改动跑在同一个 `examples/prescription.html` demo 上。

#### 五、手写实现源码 GitHub 地址
https://github.com/lotosv2010/react-source

#### 六、参考
- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com
- https://github.com/wbccb/Frontend-Articles


**面试核心问**：
- `useEffect` 和 `useLayoutEffect` 的执行时机差异是什么？`useInsertionEffect` 又插在哪个时机？
- 为什么 Hooks 不能写在条件语句或循环里？Hook 链表结构和这条规则具体是怎么关联的？
- mount 阶段和 update 阶段的 dispatcher 有什么不同，为什么要拆成两套实现？
- 什么是并发渲染下的"tearing"？`useSyncExternalStore` 是怎么解决这个问题的？
- `useImperativeHandle` 解决了什么问题？为什么不直接把整个 DOM 节点暴露给父组件？
- 错误边界能捕获哪些类型的异常，不能捕获哪些？为什么 React 至今没有提供 Hooks 形式的错误边界？


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
