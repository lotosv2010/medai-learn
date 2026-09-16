# prompt

```text
/publish 下面我们规划React 18全家桶的第11篇文章，具体如下：
{{
## 知识点范围

### 第 11 篇：React 状态管理: Redux Toolkit 源码解析与 MobX/Zustand 选型对比（生产收藏级）

**副标题**：Redux 发布订阅与 Immer、RTK Query、Zustand 极简订阅、MobX 响应式、dva 历史方案

> 说明：本篇合并原大纲中并列的 Redux/MobX/dva/umi 四篇——Redux Toolkit 是主线（篇幅占比最大），MobX 与 Zustand 降级为对比小节，dva 降级为"历史方案"小节，umi 的路由部分已并入第 10 篇。

#### 一、使用与实践
- `createStore(reducer)`（或 RTK 的 `configureStore`）、`store.getState()`、`store.dispatch(action)`、`store.subscribe(listener)`
- reducer 纯函数约定：`(state, action) => newState`
- `react-redux` 的 `<Provider store={store}>`、`useSelector`、`useDispatch()`
- Redux Toolkit 的 `createSlice({ name, initialState, reducers })`：Immer 允许"看似直接修改"的写法
- `createAsyncThunk` 处理异步逻辑，自动生成 `pending`/`fulfilled`/`rejected`
- RTK Query：`createApi` 声明式定义接口，自动生成带缓存、去重能力的 hooks
- **Zustand 基本用法**（新增）：`create((set) => ({ count: 0, inc: () => set(s => ({ count: s.count + 1 })) }))`，不需要 `Provider` 包裹，直接在组件里调用返回的 hook 读取状态
- **MobX 基本用法**（保留自原 10 篇，压缩篇幅）：`observable`/`computed`/`action`/`makeAutoObservable`/`observer`

#### 二、设计与原理
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

#### 四、手写实现（可独立跑通）
用纯 TypeScript 实现一个约 100 行的 mini-Redux（`createStore`/`applyMiddleware`/`combineReducers`），用"处方单状态机"演示；在此基础上新增一个约 30 行的 mini-Zustand（`create` 函数返回一个基于订阅者集合的 hook，直接对接一个简化版 `useSyncExternalStore` 用法），对比两者在同一个"处方单状态机"场景下的代码量和使用方式差异。

#### 五、手写实现源码 GitHub 地址
- https://github.com/lotosv2010/redux-source
- https://github.com/lotosv2010/redux-saga-source

#### 六、参考
- https://redux.js.org/
- https://react-redux.js.org/
- https://redux-toolkit.js.org/
- https://zustand-demo.pmnd.rs/
- https://mobx.js.org/
- https://github.com/dvajs/dva
- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com
- https://github.com/wbccb/Frontend-Articles

**面试核心问**：
- Redux 的核心是什么？用一句话描述它的数据流转过程
- `react-redux` 的 `useSelector` 是怎么做到"只有相关字段变化才重渲染"的，和并发渲染的 tearing 问题有什么关系？
- RTK 的 `createSlice` 为什么可以"直接修改" state？背后的 Immer 是怎么工作的？
- Zustand 为什么不需要 `Provider`？它和 Redux 在状态更新方式上的本质区别是什么？
- 给一个多团队协作的中大型后台系统选型，Redux Toolkit、MobX、Zustand 之间你会怎么权衡？dva 现在还值得选吗？


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
