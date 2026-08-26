# prompt

```text
/publish 下面我们规划Vue3全家桶的第11篇文章，具体如下：
{{
## 知识点范围

### 标题（控制在 64个字以内，以（面试收藏级）结尾）

- Vue 3 性能优化全攻略

**副标题**：编译时已经帮你做了很多，运行时还能做什么？

#### 一、基本使用
- Vue Devtools 性能面板 + `onRenderTracked / onRenderTriggered` 调试钩子
- `v-memo` / `v-once` 的基础用法
- `shallowRef` / `shallowReactive` 的基础用法
- `defineAsyncComponent` 懒加载组件的基础配置

#### 二、原理
- Vue 3 内置优化回顾：静态提升 + Patch Flags + Block Tree + 事件处理函数缓存（编译时已完成的工作，见第 03/07 篇）
- `v-memo` 原理：编译为对比依赖数组的条件判断，依赖不变则跳过该节点及子树的 Diff（类似 React.memo 但作用于模板节点）
- `v-once` 原理：编译时标记节点只创建一次，运行时渲染后不再进入 Diff 流程
- `shallowRef` / `shallowReactive` 原理：只代理第一层属性访问，不递归代理嵌套对象，减少 Proxy 创建开销，适合大型只读数据
- 异步组件与代码分割：`defineAsyncComponent` 内部状态机（loading/error/resolved）+ 与 `<Suspense>` 协作调度多个异步依赖
- 列表渲染性能瓶颈分析：Diff 算法本身已优化，瓶颈转移到真实 DOM 节点数量——虚拟列表（`@tanstack/vue-virtual`）通过只渲染可视区域节点解决
- 响应式系统调试：`onTrack` / `onTrigger` 定位 computed/watch 意外触发的依赖来源
- 构建时优化（Vite 视角）：路由懒加载 + Rollup `manualChunks` 手动分包；Tree Shaking 在 Vue 3 完全生效的前提（ESM + 无副作用标记）

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. `v-memo` 编译与运行时：`packages/compiler-core/src/transforms/vMemo.ts` + `packages/runtime-core/src/renderer.ts` 判断逻辑
2. `shallowReactive`：`packages/reactivity/src/reactive.ts`（浅层 handlers）
3. `defineAsyncComponent` 状态机：`packages/runtime-core/src/apiAsyncComponent.ts`
4. `onTrack` / `onTrigger` 调试钩子：`packages/reactivity/src/effect.ts`
5. Vite 分包配置：`vite.config.ts` 中 `build.rollupOptions.output.manualChunks` 实际项目示例

#### 四、生产级最佳实践
- 组件设计优化：`v-memo` 用于大列表中依赖稳定的行组件；`v-once` 用于纯静态展示内容
- `shallowRef` 使用时机：大型第三方数据结构（图表实例、地图实例）避免不必要的深度代理
- 虚拟列表实战：医疗场景 10000 条药品目录的虚拟滚动优化（结合 `@tanstack/vue-virtual`）
- 内存管理：Composable 中 `onUnmounted` 的清理职责（定时器、事件监听、WebSocket 连接）
- 构建优化组合拳：路由懒加载 + `manualChunks` + `build.cssCodeSplit` + Gzip/Brotli 压缩

#### 五、手写实现（可独立跑通）
医疗场景：Vite + TypeScript 搭建环境，手写虚拟列表核心（~100 行）+ 简化版 `v-memo` 效果演示 + `shallowRef` 对比测试；药品目录 10000 条数据渲染优化完整代码


#### 六、手写实现源码 GitHub 地址
- https://github.com/lotosv2010/g-vue-router


#### 七、参考
- https://cn.vuejs.org/guide/best-practices/performance

**面试核心问**：
- `v-memo` 的使用场景和实现原理？和 React.memo 有什么类比关系？
- `shallowRef` 和 `ref` 什么时候该用 shallow？
- Vue 3 的 Tree Shaking 为什么比 Vue 2 好？前提条件是什么？
- 虚拟列表的核心原理是什么？和 Vue 3 的 Diff 优化是互补关系还是替代关系？
- `onTrack` / `onTrigger` 能帮助排查什么问题


## 分析角度（每个子主题都按此展开）

A · 实操五段式（适用于有「手写内核」的篇章）

是什么 → 核心原理 → 手写实现（关键代码） → 生产级最佳实践 → 完整最佳实践代码

B · 概念四段式（适用于概念/架构/方法论篇章）

真实场景引入 → 概念/机制拆解 → 决策矩阵或对比表 → 行动清单

## 已有笔记

- @docs/notes/06 vue 3/36 vue-router.md

## plans 地址

- @docs/plans/vue3-family-series-outline.md

## 规则

- 所有的源码解析都是 router 4/5 的版本，仓库地址 https://github.com/vuejs/router
- 先阅读以上笔记，找出缺失或浅尝辄止的知识点
- 笔记只关注 @docs/notes/06 vue 3 目录下的，其他目录禁止自行读取
- 补全内容（保留原有内容，只增不删），保留图片
- 将整理后的内容生成公众号文章，输出到 @docs/articles/06 vue 3
- 文章结构：先出大纲等我确认，再逐节写作
}}
，注意⚠️：保留笔记完整代码和图片，样式格式保持一致和这篇@docs/articles/06 vue 3/2026-08-26-vue3-pinia.md，不读我没要求到的文件；可以根据你的经验和最佳实践查漏补缺；主线要明确清晰，不要遗漏源码解析章节；每个知识点都要由浅入深的彻底讲透，讲明白。vue 3系列的文章中每一篇的知识点讲解中都需要对比 vue 2中对应的知识点，讲清楚问什么要这样设计。手写实现，环境搭建已经再第一篇完了，这里直接接着上一遍和笔记中的手写实现的代码。手写源码仓库和参考只保留url。
```
