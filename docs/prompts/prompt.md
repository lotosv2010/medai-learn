# prompt

```text
/publish 下面我们规划React 18全家桶的第8篇文章，具体如下：
{{
## 知识点范围

### 第 08 篇：React 18 事件系统: 合成事件、事件委托与自动批处理原理（面试收藏级）

**副标题**：合成事件设计、事件委托从 document 到 root、Automatic Batching 演进

#### 一、使用与实践
- 合成事件绑定：`<button onClick={handleClick}>` 中的 `onClick` 是 React 封装的 `SyntheticEvent`
- `e.nativeEvent` 访问原始浏览器事件对象
- `e.stopPropagation()` 只阻止合成事件在 React 事件系统内的传播，不等价于原生 `stopPropagation`
- React 18 中在原生事件回调、`setTimeout`、`Promise.then`、`fetch` 回调里多次 `setState` 会被自动合并为一次渲染（Automatic Batching，机制详见第 02 篇）
- `flushSync(() => setState(...))` 强制让某次更新同步执行并立刻反映到 DOM
- 事件委托是自动生效的：React 内部把所有事件统一委托到 root 容器上监听

#### 二、设计与原理
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

#### 四、手写实现（延续 `lotosv2010/react-source` monorepo，本篇给 `react-dom` 补上事件系统）
在 `packages/react-dom` 新增事件模块：在 root 容器上对每种事件类型只挂一个原生监听器（`listenToAllSupportedEvents`），维护一份"虚拟事件注册表"，触发时通过 `event.target` 结合 Fiber 树的 `return` 指针向上收集所有相关的合成事件处理函数并模拟冒泡阶段依次调用（`accumulateSinglePhaseListeners`）；`packages/react-reconciler` 的 `scheduleUpdateOnFiber` 改造成统一走批处理调度（不再区分事件来源），并补上 `flushSync`（临时把这次更新标记为 `SyncLane` 并立刻同步渲染）。用 `examples/prescription.html` 里"处方单药品列表"验证：点击列表项能正确冒泡；原生事件回调、`setTimeout`、`Promise.then` 里连续多次 `setState` 都只触发一次渲染。

#### 五、手写实现源码 GitHub 地址
https://github.com/lotosv2010/react-source

#### 六、参考
- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com
- https://github.com/wbccb/Frontend-Articles

**面试核心问**：
- React 18 的自动批处理和 React 17 相比区别在哪？
- 合成事件为什么要自己实现一套，而不是直接用原生事件？
- React 17 把事件绑定从 `document` 改到 root 容器，解决了什么问题？
- `e.stopPropagation()` 在合成事件里和原生事件里的行为有什么不同？
- 什么场景下需要用 `flushSync`？滥用会有什么代价？


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
