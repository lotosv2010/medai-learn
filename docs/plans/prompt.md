# prompt

```text
/publish 下面我们规划Vue3全家桶的第3篇文章，具体如下：
{{
## 知识点范围

### 标题（控制在 64个字以内，以（面试收藏级）结尾）

- Vue 3 组件渲染原理

**副标题**：Text/Comment/Fragment 到组件实例，setup 执行链路全解析

#### 一、基本使用
- 组件的最小定义：`{ setup(props, context) { return () => h(...) } }`
- Text / Comment / Fragment 三种特殊 VNode 类型的渲染表现
- 组件 `props` 的声明与校验：`props: { drugId: { type: String, required: true } }`
- 组件根节点：单根 vs 多根（Fragment）

#### 二、原理
- Text 节点渲染：`createTextVNode` + `mountText` 创建 `document.createTextNode`
- Comment 节点渲染：`v-if` 为 false 时生成注释节点占位，保持 DOM 结构稳定
- Fragment 节点渲染：无真实容器包裹，直接挂载多个子节点，用 `anchor` 锚点标记范围
- 组件挂载完整流程：`mountComponent` → 创建组件实例 `instance` → `setupComponent`（初始化 props/slots + 调用 setup）→ `setupRenderEffect`（创建响应式的 render effect）
- 组件实例数据结构：`instance.props / instance.setupState / instance.ctx / instance.subTree` 等核心字段
- `setup()` 返回值处理：返回函数 → 作为 render 函数；返回对象 → 与模板编译产物的 render 函数合并为渲染上下文
- 组件更新流程：props 变化或内部响应式数据变化 → 触发 render effect → 生成新 subTree → `patch(prevSubTree, nextSubTree)`
- 组件的 `key`：与元素 VNode 不同，组件 key 变化会强制销毁重建（不走更新流程）
- 函数式组件的实现原理：本质是一个普通函数（`props, context) => VNode`），没有组件实例、不执行 `createComponentInstance`、跳过 `setupComponent` 中的响应式初始化，`patch` 时直接调用函数生成 VNode，因此没有 `subTree` 缓存和 render effect，每次都是纯函数调用

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. Text/Comment/Fragment 渲染：`packages/runtime-core/src/renderer.ts` `processText` / `processCommentNode` / `processFragment`
2. 组件挂载：`packages/runtime-core/src/renderer.ts` `mountComponent`
3. 组件实例创建：`packages/runtime-core/src/component.ts` `createComponentInstance`
4. `setupComponent`：`packages/runtime-core/src/component.ts`（初始化 props/slots + 执行 setup）
5. render effect：`packages/runtime-core/src/renderer.ts` `setupRenderEffect`

#### 四、生产级最佳实践
- 组件 `props` 的类型校验与默认值：`type / required / default / validator`
- 函数式组件（无实例、无响应式）适用场景：纯展示型叶节点组件，渲染性能更优
- 组件强制重建的场景：`<comp :key="version">` 替代手动重置内部状态
- 组件更新性能排查：Vue Devtools 组件高亮 + `onRenderTracked / onRenderTriggered` 调试钩子

#### 五、手写实现（可独立跑通）
医疗场景：Vite + TypeScript 搭建环境，手写组件实例创建 + setupComponent + setupRenderEffect + Text/Comment/Fragment 渲染；诊断表单组件树挂载与更新完整演示


#### 六、手写实现源码 GitHub 地址
- https://github.com/lotosv2010/g-vue-next


#### 七、参考
- https://cn.vuejs.org/guide/extras/reactivity-in-depth.html
- https://jonny-wei.github.io/blog/vue/vue3/components.html
- https://github.com/wbccb/

**面试核心问**：
- 组件从挂载到渲染出真实 DOM 经历了哪些阶段？
- `setup()` 返回函数和返回对象两种写法有什么区别？
- 组件实例上有哪些核心属性？`subTree` 是什么？
- 组件的 `key` 变化和元素的 `key` 变化，处理方式有什么不同？
- Comment 节点在什么场景下会被创建？


## 分析角度（每个子主题都按此展开）

A · 实操五段式（适用于有「手写内核」的篇章）

是什么 → 核心原理 → 手写实现（关键代码） → 生产级最佳实践 → 完整最佳实践代码

B · 概念四段式（适用于概念/架构/方法论篇章）

真实场景引入 → 概念/机制拆解 → 决策矩阵或对比表 → 行动清单

## 已有笔记

- @docs/notes/06 vue 3/14 组件渲染原理-实现Text节点渲染.md
- @docs/notes/06 vue 3/15 组件渲染原理-实现Comment节点渲染.md
- @docs/notes/06 vue 3/16 组件渲染原理-实现Fragment节点渲染.md
- @docs/notes/06 vue 3/17 组件渲染原理-实现组件渲染.md
- @docs/notes/06 vue 3/18 组件渲染原理-实现setup.md
- @docs/notes/06 vue 3/19 组件渲染原理-实现slots.md
- @docs/notes/06 vue 3/20 组件渲染原理-实现emit.md
- @docs/notes/06 vue 3/21 组件渲染原理-实现lifecycle.md
- @docs/notes/06 vue 3/22 组件渲染原理-实现ref.md
- @docs/notes/06 vue 3/23 组件渲染原理-实现函数式组件.md
- @docs/notes/06 vue 3/24 组件渲染原理-实现provide 和 inject.md

## plans 地址

- @docs/plans/vue3-family-series-outline.md

## 规则

- 所有的源码解析都是vue 3.4 的版本，手写也是 3.4 的版本，仓库地址 https://github.com/vuejs/core
- 先阅读以上笔记，找出缺失或浅尝辄止的知识点
- 笔记只关注 @docs/notes/06 vue 3 目录下的，其他目录禁止自行读取
- 补全内容（保留原有内容，只增不删），保留图片
- 将整理后的内容生成公众号文章，输出到 @docs/articles/06 vue 3
- 文章结构：先出大纲等我确认，再逐节写作
}}
，注意⚠️：保留笔记完整代码和图片，样式格式保持一致和这篇@docs/articles/06 vue 3/2026-08-20-vue3-render-diff.md，不读我没要求到的文件；可以根据你的经验和最佳实践查漏补缺；主线要明确清晰，不要遗漏源码解析章节；每个知识点都要由浅入深的彻底讲透，讲明白。vue 3系列的文章中每一篇的知识点讲解中都需要对比 vue 2中对应的知识点，讲清楚问什么要这样设计。手写实现，环境搭建已经再第一篇完了，这里直接接着上一遍和笔记中的手写实现的代码。手写源码仓库和参考只保留url。
```
