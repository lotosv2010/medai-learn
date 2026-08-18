# prompt

```text
/publish 下面我们规划Vue2全家桶的第9篇文章，具体如下：
{{
## 知识点范围

### 标题

- Vue Router 原理与手写实现

**副标题**：Hash 模式和 History 模式面试怎么答才能加分？

#### 一、基本使用
- 安装与配置：new VueRouter({ mode, routes })
- router-view / router-link 使用；router-link 的 exact 与 active-class
- 动态路由：params / query / 路由懒加载（() => import()）
- 导航守卫：beforeEach / beforeRouteEnter / beforeRouteUpdate / afterEach
- 路由元信息 meta + 权限控制白名单设计
- 嵌套路由：children 配置与嵌套 router-view

#### 二、原理
- 前端路由本质：监听 URL 变化，局部更新视图，不触发服务端请求
- Hash 模式：hashchange 事件 + location.hash；不需要服务端配合
- History 模式：pushState / replaceState + popstate；服务端必须 fallback 到 index.html
- router-view 如何响应式切换组件：响应式 `_route` 对象，route 变化触发重渲染
- 导航守卫完整执行顺序（14步）：组件内离开守卫 → 全局 beforeEach → 路由独享 beforeEnter → 组件内 beforeRouteEnter → 全局 beforeResolve → 全局 afterEach → DOM 更新 → beforeRouteEnter 的 next(vm) 回调
- 嵌套路由的 router-view 递归渲染机制：通过 `$route.matched` 数组按层级渲染
- 路由懒加载原理：动态 import() 返回 Promise + Webpack Code Splitting 生成独立 chunk
- router-link active class 匹配逻辑：exact 精确匹配 vs 包含匹配

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. VueRouter install：`src/install.js`（Vue.mixin beforeCreate 注入 $router/$route）
2. HashHistory：`src/history/hash.js`（hashchange + transitionTo）
3. router-view 组件：`src/components/view.js`（$route.matched 取层级组件）
4. router-link 组件：`src/components/link.js`（active class 计算）
5. 导航守卫队列：`src/history/base.js` runQueue + next 机制

#### 四、生产级最佳实践
- 动态路由参数变化组件不重渲染：watch `$route` 或用 beforeRouteUpdate
- 权限路由动态注册：登录后 addRoutes（医疗：医生/护士/管理员角色）
- 路由懒加载 + webpack magic comment：`/* webpackChunkName: "drug-detail" */`
- 滚动行为恢复：scrollBehavior 返回 savedPosition
- 路由过渡动画：transition + name 动态绑定实现前进/后退方向动画

#### 五、手写实现（可独立跑通）
医疗场景：Rollup 搭建环境，手写 VueRouter install + HashHistory + router-view + router-link + beforeEach 队列；多角色权限路由 + 动态 addRoutes 完整演示

#### 六、手写实现源码 GitHub 地址
- https://github.com/lotosv2010/g-vue-router/tree/3.4

#### 七、参考
- https://v3.router.vuejs.org/
- https://jonny-wei.github.io/blog/vue/vue-router/abstract.html

**面试核心问**：
- Hash 和 History 模式各自的优缺点？History 模式为什么需要服务端配合？
- 导航守卫的完整执行顺序是什么？beforeRouteEnter 里能拿到 this 吗？
- router-view 是怎么知道渲染哪个组件的？响应式原理是什么？
- 路由懒加载的实现原理是什么？和 Webpack Code Splitting 的关系？
- 嵌套路由中多个 router-view 是如何递归渲染的？


## 分析角度（每个子主题都按此展开）

A · 实操五段式（适用于有「手写内核」的篇章）

是什么 → 核心原理 → 手写实现（关键代码） → 生产级最佳实践 → 完整最佳实践代码

B · 概念四段式（适用于概念/架构/方法论篇章）

真实场景引入 → 概念/机制拆解 → 决策矩阵或对比表 → 行动清单

## 已有笔记

- @docs/notes/05 vue 2/04 手写vue-router.md

## plans 地址

- @docs/plans/vue2-family-series-outline.md

## 规则

- 先阅读以上笔记，找出缺失或浅尝辄止的知识点
- 笔记只关注 @docs/notes/vue2 目录下的，其他目录禁止自行读取
- 补全内容（保留原有内容，只增不删），保留图片
- 将整理后的内容生成公众号文章，输出到 docs/articles/vue-2
- 文章结构：先出大纲等我确认，再逐节写作
}}
，保留笔记完整代码和图片，样式格式保持一致和这篇@docs/articles/05 vue 2/2026-08-17-vue2-built-in-components-and-core-api.md，不读我没要求到的文件；可以根据你的经验和最佳实践查漏补缺；主线要明确清晰，不要遗漏源码解析章节；每个知识点都要由浅入深的彻底讲透，讲明白。
```
