# prompt

```text
/publish 下面我们规划React 18全家桶的第13篇文章，具体如下：
{{
## 知识点范围

### 第 13 篇：React 18 性能优化: memo/useMemo/虚拟列表与 React Compiler（生产收藏级）

**副标题**：bailout 机制应用、虚拟列表原理、系统化排查方法论、React Compiler 未来方向

> 说明：内容承接原大纲第 14 篇，编号顺移；`memo`/bailout 的源码细节已在第 03 篇讲透，本篇聚焦"怎么系统化排查和应用"。

#### 一、使用与实践
- `React.memo(Component)`、`useMemo`、`useCallback`
- 虚拟列表（`react-window`/`@tanstack/react-virtual`）
- `React.lazy` + `Suspense`
- `useTransition`/`useDeferredValue`
- React DevTools Profiler

#### 二、设计与原理
- `memo` 的浅比较机制与 bailout 的关系（详见第 03 篇，这里回顾结论）
- `useMemo`/`useCallback` 的依赖比较：`Object.is` 逐项比较
- 虚拟列表的核心原理：只渲染可视区域内的列表项
- `React.lazy` 的实现：惰性初始化的 thenable，配合 Suspense 挂起机制
- `useTransition`/`useDeferredValue` 的调优原理（详见第 07 篇，这里聚焦应用场景）
- 性能优化的系统化排查方法论：先用 Profiler 定位"谁在重渲染、耗时多少"，区分"渲染次数过多"和"单次渲染耗时过长"两类问题分别用不同手段解决
- **React Compiler（原 React Forget）的未来方向**（新增）：编译器在编译期自动分析组件函数体内"哪些变量影响了 JSX 输出"，自动在必要位置插入 `memo`/`useMemo`/`useCallback` 等价物，把开发者从"这里要不要手动加 `useCallback`"的决策负担中解放出来——它要解决的历史包袱正是第 03 篇讲的"bailout 依赖 props 引用稳定、需要开发者主动配合"。与 Vue 3 编译优化的方向对比：Vue 3 模板编译生成 PatchFlag 静态标记、静态提升、Block Tree，运行时只 diff 动态节点；React 的 JSX 完全动态无法做静态节点分析，只能在编译期做"自动依赖分析 + 自动插入 memo"。当前（2026 年）仍是实验性特性，Meta 内部已在部分产品线落地，社区可通过 `babel-plugin-react-compiler` 试用，正式 GA 预计随 React 19+ 逐步成熟；短期仍需手动优化并理解本篇原理，长期大部分优化会下沉到编译器

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. `memo` 的比较逻辑：`packages/react/src/ReactMemo.js` 与 `packages/shared/src/shallowEqual.js`
2. `useMemo`/`useCallback` 依赖比较：`packages/react-reconciler/src/ReactFiberHooks.js` — `areHookInputsEqual`
3. `React.lazy` 挂起机制：`packages/react/src/ReactLazy.js`

#### 四、手写实现（可独立跑通）
用 Vite + TypeScript + React 18 实现一个固定高度虚拟列表组件，用"万级药品目录"模拟数据演示流畅滚动效果，并和"不做虚拟化直接渲染全部万级节点"的版本做 Profiler 录制对比。

#### 五、手写实现源码 GitHub 地址
https://github.com/lotosv2010/react-source

#### 六、参考
- https://zh-hans.react.dev/
- https://github.com/bvaughn/react-window
- https://tanstack.com/virtual
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com
- https://github.com/wbccb/Frontend-Articles

**面试核心问**：
- `memo`、`useMemo`、`useCallback` 三者各自解决什么问题？滥用会有什么代价？
- 虚拟列表的核心原理是什么？
- `React.lazy` 是怎么和 `Suspense` 配合实现代码分割的？
- `useDeferredValue` 具体是怎么实现"输入流畅、结果滞后"效果的？和 debounce/throttle 有什么本质区别？
- 系统化排查 React 性能问题的思路是什么？



## 分析角度（每个子主题都按此展开）

A · 实操五段式（适用于有「手写内核」的篇章）

是什么 → 核心原理 → 手写实现（关键代码） → 生产级最佳实践 → 完整最佳实践代码

B · 概念四段式（适用于概念/架构/方法论篇章）

真实场景引入 → 概念/机制拆解 → 决策矩阵或对比表 → 行动清单

## 已有笔记

- @docs\notes\07 react\02 性能优化.md

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
- 手写源码地址为;
- react 源码我已经下载到本地了地址为@D:\github\react\package.json，查看代码可以使用codegraph
```
