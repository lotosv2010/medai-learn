# prompt

```text
/publish 下面我们规划Vue3全家桶的第9篇文章，具体如下：
{{
## 知识点范围

### 标题（控制在 64个字以内，以（面试收藏级）结尾）

- Vue Router 4 原理与实战

**副标题**：从 Options API 迁移到组合式路由，导航守卫链路怎么变了？

#### 一、基本使用
- 安装与配置：`createRouter({ history, routes })`
- 组合式 API 路由钩子：`useRouter()` / `useRoute()` 替代 `this.$router / this.$route`
- 路由模式：`createWebHistory` / `createWebHashHistory` / `createMemoryHistory`
- 导航守卫的组合式写法：`onBeforeRouteLeave` / `onBeforeRouteUpdate`
- 动态路由：`addRoute` / `removeRoute` + 路由懒加载

#### 二、原理
- 前端路由本质延续 Vue 2：监听 URL 变化，局部更新视图；History 模式基于 `pushState/replaceState + popstate`，需服务端 fallback
- `useRoute()` 返回响应式对象的原理：路由实例内部维护一个 `reactive` 的 `currentRoute`，`useRoute()` 直接返回该响应式引用，路由变化时自动触发依赖组件重渲染
- `<RouterView>` 组件实现：通过 `inject` 获取当前匹配的路由记录（`route.matched`），按嵌套层级递归渲染对应组件，本质是一个基于 provide/inject 的特殊组件（与 Vue 2 `$route.matched` 思路一致，实现方式改为组合式）
- 导航守卫完整执行顺序：组件内 `beforeRouteLeave` → 全局 `beforeEach` → 路由独享 `beforeEnter` → 组件内 `beforeRouteEnter` → 解析异步路由组件 → 全局 `beforeResolve` → 导航确认 → 全局 `afterEach` → DOM 更新 → `beforeRouteEnter` 的 `next(vm)` 回调
- `addRoute` 动态添加路由原理：向路由匹配表（基于路径 Trie / 数组匹配器）插入新记录，需要手动触发 `router.replace(router.currentRoute.value.fullPath)` 才能让当前地址重新匹配
- 路由懒加载：动态 `import()` 返回 Promise，Vite 基于 ES Module 动态导入自动做 chunk 拆分（相比 Vue 2 Webpack 需要 magic comment，Vite 开箱即用）
- `scrollBehavior` 异步支持：返回 Promise 可等待过渡动画结束再滚动

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. `createRouter`：`packages/router/src/router.ts`（初始化 matcher + history + 响应式 currentRoute）
2. `useRouter` / `useRoute`：`packages/router/src/useApi.ts`（基于 inject 获取路由实例）
3. `RouterView` 组件：`packages/router/src/RouterView.ts`（递归渲染 matched 数组）
4. 导航守卫队列：`packages/router/src/navigationGuards.ts`（`runGuardQueue` 串行执行）
5. matcher 路由匹配：`packages/router/src/matcher/index.ts`

#### 四、生产级最佳实践
- 动态路由参数变化组件不重渲染：`watch(() => route.params.id, ...)` 或 `onBeforeRouteUpdate`
- 权限路由动态注册：登录后按角色 `addRoute`（医疗：医生/护士/管理员角色）+ 重新匹配当前地址
- 路由懒加载 + Vite 的 chunk 命名策略：按业务模块划分 chunk
- 路由元信息 `meta` 的 TypeScript 类型扩展：模块增强 `RouteMeta` 接口
- 路由过渡动画：`<Transition>` + `name` 动态绑定实现前进/后退方向动画

#### 五、手写实现（可独立跑通）
医疗场景：Vite + TypeScript 搭建环境，手写 createRouter + 响应式 currentRoute + RouterView + useRouter/useRoute + 导航守卫队列；多角色权限路由 + 动态 addRoute 完整演示


#### 六、手写实现源码 GitHub 地址
- https://github.com/lotosv2010/g-vue-router


#### 七、参考
- https://router.vuejs.org/
- https://jonny-wei.github.io/blog/vue/vue3/vue-router4.html
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
