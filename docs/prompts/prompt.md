# prompt

```text
/publish 下面我们规划React 18全家桶的第9篇文章，具体如下：
{{
## 知识点范围

### 第 09 篇：React 18 Context: 依赖传播机制与手写实现（面试收藏级）

**副标题**：Context 值挂在 Fiber 节点上，Provider 变化时如何精确标记需要更新的子树

#### 一、使用与实践
- `createContext(defaultValue)` 创建 Context 对象
- `<XxxContext.Provider value={...}>` 提供值，`value` 变化（`Object.is` 比较）会触发消费该 Context 的组件重渲染
- `useContext(XxxContext)` 读取最近一层匹配的 `Provider` 提供的值
- 类组件通过 `static contextType` 或 `<XxxContext.Consumer>` 读取
- 多个 Context 嵌套时，`useContext` 只会匹配组件树上"最近"的同一个 Context 的 `Provider`

#### 二、设计与原理
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

#### 四、手写实现（延续 `lotosv2010/react-source` monorepo，本篇作为 02~09 篇 `react-reconciler` 递增实现的收尾）
在 `packages/react` 新增 `ReactContext.ts` 实现 `createContext`（维护 `_currentValue` 字段）；在 `packages/react-reconciler` 的 `ReactFiberBeginWork.ts` 补上 `updateContextProvider` 处理 Provider 渲染，新增 `ReactFiberNewContext.ts` 实现 `propagateContextChange`（从 Provider 节点向下遍历子树、检查每个 Fiber 的 `dependencies` 并打更新标记）与 `readContext`；`useContext` 接入第 06 篇已经搭好的 dispatcher 体系。用"医生工作站患者队列广播"场景验证多消费者重渲染现象，并额外实现一个 `createContextSelector` 用重渲染次数计数器对比两种方案的差异。至此第 01 篇搭的 monorepo 骨架里 `beginWork`/`completeWork`/`commitRoot`/Diff/Hooks/调度/事件/Context 均已从占位替换为真实实现，形成一份可完整跑通、覆盖 React 18 核心链路的手写版本。

#### 五、手写实现源码 GitHub 地址
https://github.com/lotosv2010/react-source

#### 六、参考
- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com
- https://github.com/wbccb/Frontend-Articles

**面试核心问**：
- Context 的值变化会导致所有消费组件重渲染吗？具体的传播机制是怎样的？
- 为什么被 `memo` 包裹的组件，在祖先 Context 变化时依旧会重渲染？
- 如何优化多层 Context 导致的性能问题？
- React 的 Context 机制和 Vue 3 的 `provide/inject` 在实现原理上有什么本质区别？
- `use-context-selector` 之类的库是怎么绕开原生 Context 的"广播式"更新的？


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
