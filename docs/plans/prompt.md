# prompt

```text
/publish 下面我们规划Vue3全家桶的第7篇文章，具体如下：
{{
## 知识点范围

### 标题（控制在 64个字以内，以（面试收藏级）结尾）

- Vue 3 编译优化与模板编译原理

**副标题**：parse → transform → generate，模板到 render 函数的三步拆解

#### 一、基本使用
- `<template>` vs 手写 `render` 函数：`h()` 与 JSX 的选择
- `v-if` / `v-for` 在 render 函数中的等价写法
- 编译时宏：`<script setup>` 中 `defineProps / defineEmits` 为什么不需要 import
- Vue 3 单文件组件编译产物的直观查看方式（Vue SFC Playground）

#### 二、原理
- 编译入口：`compile()` 整合 parse → transform → generate 三个阶段，与 Vue 2 三阶段思路一致但引入了优化标记
- 第一步 parse：状态机扫描模板字符串 → 构建 AST（相比 Vue 2 正则扫描，Vue 3 用有限状态机解析更严谨）
- 第二步 transform：
  - AST 遍历转换：`transformElement / transformText / vFor / vIf` 等一系列 transform 插件
  - 静态提升标记（`hoistStatic`）：标记纯静态节点，提升到 render 函数外
  - Patch Flags 标记：在 transform 阶段分析每个节点的动态绑定类型，生成对应的位标记
  - Block 收集：`vFor` / 组件等节点作为 Block 边界，收集内部动态子节点到 `dynamicChildren`
  - 缓存事件处理函数（`cacheHandlers`）：内联事件处理器包裹为 `_cache[n] || (_cache[n] = ...)`
  - 本节讲的是这些优化标记在编译阶段如何**生成**；运行时如何消费这些标记做定向 Diff，见第 03 篇「渲染原理与 Diff 算法」
- 第三步 generate：AST → render 函数代码字符串
  - `_createElementVNode / _createTextVNode / _toDisplayString / _renderList` 等辅助函数的含义
  - `v-if` 编译为三元表达式，`v-for` 编译为 `_renderList(list, fn)`
  - `<script setup>` 编译产物：顶层变量自动暴露给模板作用域，`defineProps/defineEmits/defineModel` 编译为 `__props` 运行时选项，宏本身在编译阶段被擦除（`defineModel` 展开为一个 prop 声明 + 一个读写 ref，详见第 05 篇）
- 编译器插件架构：`@vue/compiler-core` 提供平台无关的核心逻辑，`@vue/compiler-dom` 扩展 DOM 特定的 transform（如 v-html、v-model 指令转换）
- `defineProps` 类型编译原理：`<script setup lang="ts">` 中 `defineProps<Props>()` 的纯类型声明，编译器在 `compileScript` 阶段静态分析类型字面量（接口/type alias），生成等价的运行时 `props` 选项对象（`{ type, required }`），使得类型声明和运行时校验合二为一
- 泛型组件（Vue 3.3+）编译原理：`<script setup lang="ts" generic="T">` 会被编译为一个带类型参数的函数组件，`resolveType` 阶段解析泛型声明并保留到生成的 `.d.ts` 类型文件中，供使用处通过 TSX 或类型标注传入具体类型

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. 编译入口：`packages/compiler-core/src/compile.ts`
2. parse 阶段：`packages/compiler-core/src/parse.ts`（状态机扫描 → AST）
3. transform 阶段：`packages/compiler-core/src/transform.ts`（`hoistStatic` / Patch Flags 标记 / Block 收集）
4. generate 阶段：`packages/compiler-core/src/codegen.ts`（AST → render 字符串）
5. `<script setup>` 编译：`packages/compiler-sfc/src/compileScript.ts`
6. `defineProps` 类型编译：`packages/compiler-sfc/src/script/defineProps.ts`（类型字面量 → 运行时 props 选项）
7. 泛型组件编译：`packages/compiler-sfc/src/script/resolveType.ts`

#### 四、生产级最佳实践
- 构建时编译（`vue-loader` / `@vitejs/plugin-vue`）vs 运行时编译体积差：生产环境只用 runtime 版本
- template vs render 的选择：template 可读性好且享受编译时优化，render 灵活性高（动态组件、条件渲染多分支场景）
- 善用 `<script setup>` 减少样板代码，同时理解其编译产物避免踩坑（如顶层 await 的组件会自动变为异步组件）
- 自定义指令的编译与运行时实现：五个钩子 `created/beforeMount/mounted/beforeUpdate/updated/beforeUnmount/unmounted`
- v-for + v-if 同节点反模式：Vue 3 中 `v-if` 优先级高于 `v-for`（与 Vue 2 相反），需重新审视旧代码迁移

#### 五、手写实现（可独立跑通）
医疗场景：Vite + TypeScript 搭建环境，~200 行手写 parse + transform（静态提升 + Patch Flags）+ generate；药品说明书动态模板编译产物可视化对比（有无优化标记）


#### 六、手写实现源码 GitHub 地址
- https://github.com/lotosv2010/g-vue-next


#### 七、参考
- https://cn.vuejs.org/guide/extras/rendering-mechanism.html
- https://cn.vuejs.org/api/sfc-script-setup.html
- https://cn.vuejs.org/guide/typescript/overview.html
- https://jonny-wei.github.io/blog/vue/vue3/components.html
- https://github.com/wbccb/

**面试核心问**：
- 模板编译的三个阶段分别做了什么？和 Vue 2 相比核心区别是什么？
- 静态提升是在编译的哪个阶段完成的？如何影响运行时性能？
- `<script setup>` 的编译产物是什么样的？宏为什么不需要 import？
- Vue 3 中 `v-if` 和 `v-for` 同节点的优先级和 Vue 2 有什么不同？
- Block 是如何收集动态子节点的？为什么能减少 Diff 范围？


## 分析角度（每个子主题都按此展开）

A · 实操五段式（适用于有「手写内核」的篇章）

是什么 → 核心原理 → 手写实现（关键代码） → 生产级最佳实践 → 完整最佳实践代码

B · 概念四段式（适用于概念/架构/方法论篇章）

真实场景引入 → 概念/机制拆解 → 决策矩阵或对比表 → 行动清单

## 已有笔记


- @docs/notes/06 vue 3/29 编译优化.md
- @docs/notes/06 vue 3/30 模板编译原理-初始化子包.md
- @docs/notes/06 vue 3/31 模板编译原理-实现AST编译.md
- @docs/notes/06 vue 3/32 模板编译原理-实现代码转换.md
- @docs/notes/06 vue 3/33 模板编译原理-实现代码生成.md

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
，注意⚠️：保留笔记完整代码和图片，样式格式保持一致和这篇@docs/articles/06 vue 3/2026-08-23-vue3-built-in-components.md，不读我没要求到的文件；可以根据你的经验和最佳实践查漏补缺；主线要明确清晰，不要遗漏源码解析章节；每个知识点都要由浅入深的彻底讲透，讲明白。vue 3系列的文章中每一篇的知识点讲解中都需要对比 vue 2中对应的知识点，讲清楚问什么要这样设计。手写实现，环境搭建已经再第一篇完了，这里直接接着上一遍和笔记中的手写实现的代码。手写源码仓库和参考只保留url。
```
