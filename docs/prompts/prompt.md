# prompt

```text
/publish 下面我们规划React 18全家桶的第1篇文章，具体如下：
{{
## 知识点范围

### 标题（控制在 64个字以内，以（面试收藏级）结尾）

- 第 03 篇：React 18 渲染原理: mount/update/unmount 全流程与 bailout 复用机制（面试收藏级）

**副标题**：mount/update/unmount 完整流程、bailout 复用判断、双缓存机制

#### 一、使用与实践
- `key` 的正确使用对 diff 结果的直接影响：复现"患者列表用数组 index 作 key"在增删排序时导致展开状态/输入框内容错位的 bug
- `React.memo`/`PureComponent` 包裹组件后，父组件重渲染但 props 不变时子组件不会重新渲染的现象——这正是本篇要讲透的 bailout 机制在应用层的直观体现
- React DevTools Profiler 里观察 Fiber 树和各阶段耗时
- `StrictMode` 下 effect 被执行两次的现象，和 Fiber `alternate` 树切换、mount/unmount 模拟之间的关系
- 组件从 DOM 树中移除（如 Tab 切换隐藏某个模块）对应的卸载流程，以及 `useEffect` 清理函数被调用的时机

#### 二、设计与原理
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

#### 四、手写实现（延续第 01/02 篇 `lotosv2010/react-source` monorepo，本篇把 `beginWork`/`completeWork`/`commitRoot` 从占位补成真实实现）
第 01 篇搭骨架时，`beginWork`/`completeWork`/`commitRoot` 都是简化占位（`beginWork` 直接返回 `fiber.child`，`completeWork`/`commitMutationEffects` 是空实现）。本篇在 `packages/react-reconciler` 里正式补全：`ReactFiber.ts` 的 `createWorkInProgress` 已经具备 mount/update 两条分支（第 01 篇已写），本篇在 `ReactFiberBeginWork.ts` 里按 `fiber.tag` 分发处理 `HostRoot`/`HostComponent`/`FunctionComponent`，并加入 bailout 判断（`oldProps === newProps` 时调用 `bailoutOnAlreadyFinishedWork` 直接克隆子 Fiber，跳过渲染）；在 `ReactFiberCompleteWork.ts` 里补上 mount 阶段调用 `document.createElement` 真正创建 DOM 实例、update 阶段做属性 diff（`prepareUpdate`）、并把 `flags` 冒泡到父节点 `subtreeFlags`；`packages/react-dom` 的 Host Config（`createInstance`/`appendChild`/`commitUpdate`/`removeChild`）也在本篇补齐真实的 DOM 操作实现，替换第 01 篇 `commitMutationEffects` 的空函数。用 `examples/prescription.html` 里"添加/删除/原地不变刷新"三种药品项操作验证 mount/update（含 bailout 命中）/unmount 三条路径都正确工作。

#### 五、手写实现源码 GitHub 地址
https://github.com/lotosv2010/react-source

#### 六、参考
- https://react.iamkasong.com
- https://jonny-wei.github.io/blog/react/
- https://pomb.us/build-your-own-react/

**面试核心问**：
- mount、update、unmount 三条路径在 `beginWork`/`completeWork` 里分别是怎么走的？
- Fiber 双缓存机制具体解决了什么问题？如果没有双缓存会出现什么现象？
- `React.memo` 为什么能减少重渲染？在源码层面它命中的是哪条判断逻辑？
- bailout 跳过了某个父节点的渲染，如果它的某个后代组件自己有更新，React 还能找到并渲染这个后代吗，为什么？
- unmount 阶段的清理为什么是自底向上而不是自顶向下？


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
- 保留笔记完整代码和图片，样式格式保持一致和这篇@docs\articles\07 react\2026-09-02-react18-architecture-fiber-evolution.md，不读我没要求到的文件；
- 可以根据你的经验和最佳实践查漏补缺；主线要明确清晰，不要遗漏源码解析章节；每个知识点都要由浅入深的彻底讲透，讲明白。
- react 18 系列的文章中每一篇的知识点讲解中都需要讲清楚问什么要这样设计。
- 手写实现，环境搭建在第一篇中完成，后面的react 18 讲解的文章直接接着上一遍和笔记中的手写实现的代码。手写源码仓库和参考只保留url。
- 手写源码地址为@D:\github\react-source\packages\react\src\index.ts、@D:\github\react-source\packages\react-dom\index.ts
- react 源码我已经下载到本地了地址为@D:\github\react\package.json，查看代码可以使用codegraph
```
