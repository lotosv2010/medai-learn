# prompt

```text
/publish 下面我们规划Vue3全家桶的第8篇文章，具体如下：
{{
## 知识点范围

### 标题（控制在 64个字以内，以（面试收藏级）结尾）

- Pinia 原理与手写实现

**副标题**：Vuex 为什么退场？Pinia 才是 Vue 3 的正确答案

#### 一、基本使用
- 三个核心概念：`state / getters / actions`（没有 Mutation！）
- `defineStore` 两种写法：Options Store vs Setup Store
- Store 的使用：`useXxxStore()` 在组件 `setup` 中调用
- Store 间互相调用：直接 import 另一个 store 使用

#### 二、原理
- Vuex 在 Vue 3 时代的问题：TypeScript 支持差、样板代码多（mutation 冗余）、模块 namespaced 设计繁琐
- Pinia 的核心设计：Store 本质是一个特殊的 Composable，底层用 `reactive()` 包装 state，`computed()` 实现 getters
- `defineStore` 实现：返回一个 `useStore` 函数，内部维护单例（基于当前激活的 pinia 实例做缓存，`store._s` Map）
- Setup Store 写法：函数体直接调用 `ref/reactive/computed`，返回值即 store 的公开接口——本质与普通 Composable 完全一致
- Actions 天然支持异步：不像 Vuex 需要区分 mutation（同步）和 action（异步），因为 Pinia 没有依赖同步快照做时间旅行的强约束
- Store 间互相调用：无需 rootGetters/rootState，直接 `import` 另一个 Store 的 `useXxxStore()` 调用即可，因为都是单例
- 插件系统：`pinia.use(plugin)`，插件函数接收 `{ store, options }`，可以给每个 store 扩展属性或方法；持久化插件原理——订阅 `store.$subscribe` 在 state 变化时写入 storage，初始化时从 storage 读取覆盖 state
- Devtools 集成：基于 `$subscribe` 和 `$onAction` 订阅机制记录状态变更，实现时间旅行调试
- Store 的完整类型推断原理：`defineStore` 是一个泛型函数，接收的 `state / getters / actions` 选项对象的字面量类型被 TypeScript 结构化推导，返回类型自动拼装为 `State & Getters & Actions` 的联合接口，因此 `useXxxStore()` 调用处无需手写任何类型声明即可获得完整的属性/方法类型提示

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. `defineStore`：`packages/pinia/src/store.ts`（返回 `useStore`，单例缓存于 `pinia._s`）
2. state 响应式化：`packages/pinia/src/store.ts`（`reactive()` 包装 state）
3. getters computed 化：`packages/pinia/src/store.ts`（遍历 getters 生成 `computed`）
4. Setup Store 处理：`packages/pinia/src/store.ts`（`createSetupStore`，直接执行 setup 函数收集返回值）
5. 插件机制：`packages/pinia/src/store.ts`（`pinia.use` + `_p` 插件数组遍历执行）

#### 四、生产级最佳实践
- Options Store vs Setup Store 的选型：简单 CRUD 用 Options Store（结构清晰），复杂逻辑复用用 Setup Store（可调用其他 Composable）
- `pinia-plugin-persistedstate` 持久化插件的使用与自定义存储策略
- 大型项目模块化拆分规范：按业务域拆 Store（医疗：`useUserStore` / `useDrugStore` / `usePrescriptionStore`）
- Store 的测试：`createTestingPinia` 隔离测试 action 调用
- 与 Vuex 的对比表：Mutation 消失、模块化更简单、TypeScript 类型全自动推断

#### 五、手写实现（可独立跑通）
医疗场景：Vite + TypeScript 搭建环境，手写极简 Pinia（`defineStore` + `reactive` + `computed` + 插件系统，~100 行）；`useDrugStore` 库存管理 + 持久化插件完整代码


#### 六、手写实现源码 GitHub 地址
- https://github.com/lotosv2010/g-pinia


#### 七、参考
- https://pinia.vuejs.org/zh/
- https://jonny-wei.github.io/blog/vue/vue3/pinia.html
- https://github.com/wbccb/

**面试核心问**：
- Pinia 和 Vuex 的核心区别是什么？为什么没有 Mutation？
- Pinia 的 Store 是全局单例吗？底层响应式是怎么实现的？
- Options Store 和 Setup Store 有什么区别？分别适合什么场景？
- Pinia 如何实现持久化？插件系统的设计原理是什么？
- Store 之间互相调用为什么不需要 rootState/rootGetters？


## 分析角度（每个子主题都按此展开）

A · 实操五段式（适用于有「手写内核」的篇章）

是什么 → 核心原理 → 手写实现（关键代码） → 生产级最佳实践 → 完整最佳实践代码

B · 概念四段式（适用于概念/架构/方法论篇章）

真实场景引入 → 概念/机制拆解 → 决策矩阵或对比表 → 行动清单

## 已有笔记


- @docs/notes/06 vue 3/34 pinia-开发环境搭建.md
- @docs/notes/06 vue 3/35 pinia-实现pinia.md

## plans 地址

- @docs/plans/vue3-family-series-outline.md

## 规则

- 所有的源码解析都是pinia 的版本，仓库地址 https://github.com/vuejs/pinia
- 先阅读以上笔记，找出缺失或浅尝辄止的知识点
- 笔记只关注 @docs/notes/06 vue 3 目录下的，其他目录禁止自行读取
- 补全内容（保留原有内容，只增不删），保留图片
- 将整理后的内容生成公众号文章，输出到 @docs/articles/06 vue 3
- 文章结构：先出大纲等我确认，再逐节写作
}}
，注意⚠️：保留笔记完整代码和图片，样式格式保持一致和这篇@docs/articles/06 vue 3/2026-08-24-vue3-compiler.md，不读我没要求到的文件；可以根据你的经验和最佳实践查漏补缺；主线要明确清晰，不要遗漏源码解析章节；每个知识点都要由浅入深的彻底讲透，讲明白。vue 3系列的文章中每一篇的知识点讲解中都需要对比 vue 2中对应的知识点，讲清楚问什么要这样设计。手写实现，环境搭建已经再第一篇完了，这里直接接着上一遍和笔记中的手写实现的代码。手写源码仓库和参考只保留url。
```
