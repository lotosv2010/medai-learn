# Vue 3 全家桶系列公众号文章大纲

> 所属系列：Vue 3 深度拆解 · 第一版规划
> 写作原则：由浅入深，从「会用」到「懂原理」，每篇有面试级知识点 + 可跑代码
> 目标读者：有 Vue 2 基础（最好读过 Vue 2 系列）、正在迁移或新建 Vue 3 项目、备战面试或寻求晋升的 3-8 年工程师

---

## 系列定位

**「Vue 3 全家桶深度拆解」系列**

- 篇数：共 12 篇，按「响应式升级 → Composition API → 全家桶 → 工程实战」四层递进
- 内容主线：真实场景引入 → 原理拆解 → 手写实现（关键代码）→ 生产最佳实践 → 完整代码
- 与 Vue 2 系列的关系：可独立阅读，但对比 Vue 2 实现的地方会显式标注「升级点」，降低老读者认知负担
- 特色：每篇保留 3-5 个「面试官会问」对话框；示例沿用医疗场景命名（药品/处方/患者）

---

## 文章规划总览

| 编号 | 标题 | 分类 | 状态 |
|------|------|------|------|
| 01 | Vue 3 响应式原理：Proxy 如何比 Object.defineProperty 做得更彻底 | 响应式升级 | ⬜ 待写 |
| 02 | Composition API 设计哲学：setup() 为什么比 Options API 更适合复杂组件 | Composition API | ⬜ 待写 |
| 03 | `<script setup>` 语法糖全解：编译原理 + defineProps / defineEmits 最佳实践 | Composition API | ⬜ 待写 |
| 04 | Vue 3 编译器优化：静态提升、Patch Flags 与 Block Tree 让 Diff 快多少 | 编译优化 | ⬜ 待写 |
| 05 | Composables 设计模式：用组合式函数替代 Mixin，彻底解决逻辑复用问题 | Composition API | ⬜ 待写 |
| 06 | Vue 3 新内置组件：Teleport / Suspense / Fragment / KeepAlive 升级详解 | 内置特性 | ⬜ 待写 |
| 07 | Vue Router 4 原理与实战：组合式 API 路由 + 数据加载新范式 | 全家桶 | ⬜ 待写 |
| 08 | Pinia 从入门到原理：为什么 Vuex 退场，Pinia 才是 Vue 3 的正确答案 | 全家桶 | ⬜ 待写 |
| 09 | Vue 3 + TypeScript：泛型组件 / defineProps 类型 / 组合式函数类型全攻略 | 工程实战 | ⬜ 待写 |
| 10 | Vue 3 性能优化：编译时优化 + 运行时优化的最优组合 | 工程实战 | ⬜ 待写 |
| 11 | Nuxt 3 深度实战：文件系统路由、Server Components 与 Auto Import 原理 | 工程实战 | ⬜ 待写 |
| 12 | Vue 3 自定义渲染器：从 DOM 到 Canvas，彻底理解渲染器本质 | 进阶收尾 | ⬜ 待写 |

---

## 各篇详细大纲

### 第 01 篇：Vue 3 响应式原理

**副标题**：Proxy 如何比 Object.defineProperty 做得更彻底？

**大纲**
1. Vue 2 响应式的三个历史遗留问题（对象新增属性、数组下标、删除属性）
2. Proxy 基础：`get` / `set` / `deleteProperty` / `has` 拦截器
3. Reflect：为什么配合 Proxy 使用，而不是直接操作 target
4. `reactive()`：深度响应式的实现——WeakMap 缓存 + 递归代理
5. `ref()`：为什么基本类型需要包装对象，`.value` 的本质
6. 响应式系统三件套：`track` / `trigger` / `effect`
7. `computed()`：惰性求值 + 脏标记缓存机制
8. `watch` vs `watchEffect`：依赖收集时机的差异
9. 响应式工具函数：`toRef` / `toRefs` / `isRef` / `unref` 的使用场景
10. 手写极简响应式系统（Proxy + effect + track/trigger，~100 行）

**面试核心问**：
- Proxy 相比 defineProperty 解决了哪些问题？
- `ref` 和 `reactive` 的区别？什么场景用哪个？
- `computed` 的缓存是怎么实现的？为什么依赖没变就不重新计算？

---

### 第 02 篇：Composition API 设计哲学

**副标题**：setup() 为什么比 Options API 更适合复杂组件？

**大纲**
1. Options API 的两个痛点：同一逻辑碎片化 + 类型推断困难
2. `setup()` 的执行时机：在 `beforeCreate` 之前，没有 `this`
3. Composition API 的核心设计：逻辑关注点聚合
4. `setup()` 的参数：`props`（响应式只读）和 `context`（`attrs / slots / emit / expose`）
5. 生命周期在 Composition API 中的映射：`onMounted` / `onUnmounted` 等
6. 模板引用（template refs）：`ref()` 在 `setup` 中的双重身份
7. provide / inject 的组合式写法：类型安全的依赖注入
8. `expose()`：控制组件对外暴露的公共接口
9. 对比 React Hooks：相同思路、不同实现，避免哪些 React Hooks 陷阱
10. 实战：将一个复杂 Options API 组件重构为 Composition API

**面试核心问**：
- Composition API 解决了什么问题？和 React Hooks 的区别？
- setup 里能不能用 this？为什么？
- provide / inject 如何保持响应式？

---

### 第 03 篇：`<script setup>` 语法糖全解

**副标题**：编译产物里藏了什么，一次说清

**大纲**
1. `<script setup>` 是什么：编译时语法糖，不是运行时特性
2. 编译产物对比：`<script setup>` vs `setup()` 函数写法的等价转换
3. `defineProps()`：运行时声明 vs 类型声明，`withDefaults` 设置默认值
4. `defineEmits()`：事件类型约束，调用方式
5. `defineExpose()`：默认不暴露，显式控制父组件可访问的内容
6. `useSlots()` / `useAttrs()`：访问插槽和属性的组合式方式
7. `defineOptions()`：设置组件名、inheritAttrs 等选项（Vue 3.3+）
8. `defineModel()`：双向绑定语法糖（Vue 3.4+）
9. 编译器宏：为什么不需要 import，宏的本质
10. 顶层 `await`：`<script setup>` 中的异步组件天然支持
11. 医疗场景实战：药品搜索组件的完整 `<script setup>` 实现

**面试核心问**：
- `<script setup>` 和普通 `setup()` 有什么区别？
- `defineProps` 的运行时声明和类型声明可以混用吗？
- `defineModel` 解决了什么问题？

---

### 第 04 篇：Vue 3 编译器优化

**副标题**：同样的模板，Vue 3 的 Diff 为什么比 Vue 2 快？

**大纲**
1. Vue 2 Diff 的瓶颈：全量比较，无法跳过静态节点
2. 编译时优化的核心思路：在编译阶段标记动态内容，运行时只比较动态部分
3. 静态提升（Static Hoisting）：静态节点提升到 render 函数外，不参与 Diff
4. Patch Flags：用位运算标记节点的动态类型（CLASS / STYLE / PROPS / TEXT 等）
5. Block Tree：动态节点收集到 dynamicChildren，跳过静态子树
6. 事件侦听器缓存（cacheHandlers）：内联处理函数不再每次重新创建
7. Fragment：多根节点组件，减少不必要的包裹层
8. 手写迷你编译器：parse → transform → generate（~150 行，理解三阶段）
9. 编译器插件：`@vue/compiler-dom` 的 Transform 钩子扩展
10. Vue 2 vs Vue 3 Diff 性能对比：基准测试数据解读

**面试核心问**：
- Vue 3 比 Vue 2 快在哪里？静态提升具体是什么？
- Patch Flags 是什么？用位运算的原因？
- Block Tree 如何减少 Diff 的范围？

---

### 第 05 篇：Composables 设计模式

**副标题**：用组合式函数替代 Mixin，彻底解决逻辑复用

**大纲**
1. Mixin 的三大问题：来源不清晰 / 命名冲突 / 隐式依赖
2. Composable 是什么：在 `setup()` 中调用的函数，封装有状态逻辑
3. 命名约定：`use` 前缀，返回响应式状态 + 方法
4. 基础 Composable：`useFetch` / `useLocalStorage` / `useEventListener`（含代码）
5. 有副作用的 Composable：生命周期自动注册 + `onUnmounted` 自动清理
6. Composable 的组合：Composable 调用 Composable，形成复用链
7. 参数响应式：接受 `ref` 参数，用 `toValue()` 统一处理（Vue 3.3+）
8. 与 React Hooks 的工程实践对比：Vue Composable 的优势（无调用顺序限制）
9. 医疗场景实战：`usePatientSearch` + `useDrugInventory` + `usePrescription` 三个业务 Composable
10. Composable 的测试策略：在 `withSetup` 辅助函数中测试

**面试核心问**：
- Composable 和 Mixin 的区别？解决了什么问题？
- Composable 和 React 自定义 Hook 有什么不同？
- 如何让 Composable 接受普通值和 ref 都能正常工作？

---

### 第 06 篇：Vue 3 新内置组件

**副标题**：Teleport / Suspense / Fragment 解决了哪些老问题？

**大纲**
1. **Teleport**
   - 解决的问题：Modal / Toast 的 z-index 和 CSS 层叠上下文困境
   - 实现原理：将 DOM 渲染到任意目标，但组件树关系不变
   - `to` 属性动态切换 / `disabled` 属性
   - 医疗场景：全屏药品详情弹窗

2. **Suspense**
   - 异步组件加载的协调机制
   - `#default` + `#fallback` 双插槽
   - 与 `<script setup>` 顶层 await 的配合
   - 嵌套 Suspense 的瀑布流问题
   - 错误处理：`onErrorCaptured` + `errorCaptured`

3. **Fragment**
   - 多根节点：不再强制单根，减少包裹层
   - `$attrs` 透传在多根节点时需手动绑定

4. **KeepAlive 升级**
   - `include` / `exclude` 支持正则
   - `max` 属性：LRU 缓存策略
   - `onActivated` / `onDeactivated` 组合式写法
   - 医疗场景：诊断记录列表 ↔ 详情的无缝切换

5. **Transition / TransitionGroup 升级**
   - `v-enter-from` 替代 `v-enter`（命名规范化）
   - `TransitionGroup` 的 `move` 过渡

**面试核心问**：
- Teleport 渲染到 body 后，组件的 provide/inject 还能用吗？
- Suspense 和 async setup 如何配合？
- KeepAlive 的 max 是怎么实现 LRU 的？

---

### 第 07 篇：Vue Router 4 原理与实战

**副标题**：路由从 Options API 迁移到组合式 API，还有哪些新东西？

**大纲**
1. Vue Router 4 vs Vue Router 3：破坏性变更清单
2. 组合式 API 路由钩子：`useRouter()` / `useRoute()` 替代 `this.$router`
3. 路由模式：`createWebHistory` / `createWebHashHistory` / `createMemoryHistory`
4. 动态路由：`addRoute` / `removeRoute` + 权限路由动态注册
5. 导航守卫的组合式写法：`onBeforeRouteLeave` / `onBeforeRouteUpdate`
6. 路由元信息 `meta` 的 TypeScript 类型扩展
7. 数据加载新范式：`RouterView` + `await router.isReady()` vs Navigation Guards 预取
8. 路由懒加载：动态 import + Vite 的 chunk 命名策略
9. 滚动行为：`scrollBehavior` 的异步支持
10. 医疗场景实战：多角色（医生/药剂师/管理员）权限路由动态注册

**面试核心问**：
- `useRoute()` 返回的对象是响应式的吗？为什么？
- `addRoute` 动态添加路由后，如何触发当前路由重新匹配？
- Vue Router 4 的 `<RouterView>` 和 Vue Router 3 有什么变化？

---

### 第 08 篇：Pinia 从入门到原理

**副标题**：Vuex 为什么退场？Pinia 的设计哲学

**大纲**
1. Vuex 在 Vue 3 时代的问题：TypeScript 支持差 / 样板代码多 / 模块设计繁琐
2. Pinia 的核心设计：Store 即 Composable，天然支持组合
3. 三个核心概念：`state` / `getters` / `actions`（没有 Mutation！）
4. `defineStore` 两种写法：Options Store vs Setup Store
5. Pinia 响应式原理：底层借用 `reactive()` + `computed()` 实现
6. Actions 天然支持异步：不需要区分同步 / 异步
7. Store 间互相调用：直接 import 另一个 store，无需 rootGetters
8. 插件系统：`pinia.use()` + 持久化插件 `pinia-plugin-persistedstate` 原理
9. 与 Devtools 集成：时间旅行调试的实现基础
10. 手写极简 Pinia（基于 `reactive` + `computed`，~80 行）
11. 医疗场景实战：`useUserStore` + `useDrugStore` + `usePrescriptionStore` 设计

**面试核心问**：
- Pinia 和 Vuex 的区别？为什么没有 Mutation？
- Pinia 的 Store 是全局单例吗？如何实现响应式？
- Pinia 如何实现持久化，原理是什么？

---

### 第 09 篇：Vue 3 + TypeScript

**副标题**：泛型组件 / 运行时类型 / 组合式函数类型，一篇打通

**大纲**
1. Vue 3 对 TypeScript 的一等公民支持：为什么比 Vue 2 好得多
2. `defineProps` 类型声明：运行时 vs 纯 TypeScript 类型的选择
3. `defineEmits` 类型约束：调用签名的写法
4. 组件 `ref` 的类型：`InstanceType<typeof MyComponent>` 模式
5. 泛型组件（Vue 3.3+）：`<script setup lang="ts" generic="T">`
6. Composable 的类型设计：泛型函数 + 返回类型推断
7. Pinia Store 的完整类型推断：无需额外声明，自动推断
8. 全局组件 / 全局属性类型扩展：`ComponentCustomProperties` / `GlobalComponents`
9. `PropType` 工具类型：复杂对象 Props 的类型化
10. 医疗场景实战：泛型列表组件 `DataTable<T>` + 完整类型约束

**面试核心问**：
- Vue 3 中如何给泛型组件传递类型参数？
- Composable 返回类型应该显式声明还是让 TS 推断？
- 如何给 `app.config.globalProperties` 添加的属性提供类型？

---

### 第 10 篇：Vue 3 性能优化

**副标题**：编译时已经帮你做了很多，运行时还能做什么？

**大纲**
1. Vue 3 内置优化：编译器已经做了的事（静态提升 / 缓存处理函数 / Block Tree）
2. 组件设计优化：
   - `v-memo`：手动标记跳过更新的子树（类似 React.memo）
   - `v-once`：纯静态内容永不更新
   - `shallowRef` / `shallowReactive`：浅层响应式，避免深层代理开销
3. 异步组件与代码分割：
   - `defineAsyncComponent`：懒加载组件 + 加载/错误状态
   - 与 `<Suspense>` 的协作
4. 列表渲染优化：
   - `key` 的正确使用：稳定唯一标识 vs index
   - 虚拟列表：`vue-virtual-scroller` / `@tanstack/vue-virtual`
5. `watchEffect` vs `watch`：避免不必要的副作用执行
6. `computed` 的调试：`onTrack` / `onTrigger`
7. 构建优化（Vite 视角）：
   - 路由懒加载 + Rollup manualChunks
   - Tree Shaking：Vue 3 完全支持，Vue 2 有限制
   - `build.cssCodeSplit` / `build.minify`
8. 内存管理：Composable 中 `onUnmounted` 的清理职责
9. 医疗场景实战：10000 条药品目录的虚拟滚动优化

**面试核心问**：
- `v-memo` 的使用场景和原理？
- `shallowRef` 和 `ref` 什么时候该用 shallow？
- Vue 3 的 Tree Shaking 为什么比 Vue 2 好？

---

### 第 11 篇：Nuxt 3 深度实战

**副标题**：文件即路由、自动导入、Server Components，Nuxt 3 到底做了什么？

**大纲**
1. Nuxt 3 定位：Vue 3 的全栈元框架，不只是 SSR
2. 文件系统路由：`pages/` 目录约定 → 路由自动生成原理
3. 自动导入（Auto Import）：组件 / Composable / Vue API 不需要 import 的实现原理
4. 三种渲染模式：SSR / SSG / SPA 的配置与适用场景
5. 数据获取三件套：`useFetch` / `useAsyncData` / `$fetch` 的区别与选型
6. 服务端路由（Server Routes）：`server/api/` 目录，Node.js 接口无缝集成
7. Nuxt Server Components：服务端渲染组件，zero JS 到客户端
8. `useState`：Nuxt 的 SSR 安全全局状态（替代 `ref` 的服务端共享）
9. Nuxt Modules 体系：`@nuxt/image` / `@pinia/nuxt` / `@nuxtjs/i18n` 接入
10. 部署：静态导出 `nuxt generate` vs Node 服务 `nuxt start` vs Nitro Edge 部署

**面试核心问**：
- Nuxt 3 的自动导入是怎么实现的，有什么注意事项？
- `useFetch` 和 `useAsyncData` 的区别？
- Nuxt Server Components 和 React Server Components 有什么异同？

---

### 第 12 篇：Vue 3 自定义渲染器

**副标题**：从 DOM 到 Canvas，渲染器本质是什么？

**大纲**
1. Vue 渲染器架构：`@vue/runtime-core` 与 `@vue/runtime-dom` 的分离设计
2. `createRenderer(options)`：渲染器工厂函数，渲染目标可替换
3. RendererOptions 接口：`createElement` / `patchProp` / `insert` / `remove` 等 7 个核心操作
4. 手写 Canvas 渲染器（~150 行）：
   - 将 Vue 组件渲染到 `<canvas>` 上
   - 响应式数据驱动重绘
5. 手写极简 DOM 渲染器（~100 行）：理解默认渲染器在做什么
6. 跨平台渲染：`@vue/runtime-test` 的实现思路（测试环境用）
7. 生产案例：uni-app / Taro 如何基于 Vue 3 渲染器实现跨端
8. 自定义渲染器的局限：哪些 Vue 特性是平台无关的，哪些不是

**面试核心问**：
- Vue 3 为什么把 runtime-core 和 runtime-dom 分开？
- 如果要把 Vue 3 渲染到小程序，需要实现哪些接口？
- `createRenderer` 和 React 的 `react-reconciler` 有什么类比关系？

---

## 写作规范

与 Vue 2 系列和已有系列保持一致：

- **结构**：真实场景引入 → 原理拆解 → 手写实现（关键代码）→ 生产最佳实践 → 完整代码
- **代码**：所有示例可独立运行，医疗场景命名（药品/处方/患者）
- **面试模块**：每篇保留 3-5 个「面试官会问」对话框
- **升级对比**：涉及 Vue 2 → Vue 3 变化的地方，显式加「升级点」标注
- **禁止**：出现具体公司名、博主名/账号名（见记忆：feedback-no-company-name / feedback-no-person-name）
- **参考章节**：每篇末尾统一加参考链接

## 参考链接（每篇末尾统一引用）

```
https://cn.vuejs.org/guide/introduction.html
https://cn.vuejs.org/guide/extras/reactivity-in-depth.html
https://cn.vuejs.org/guide/extras/composition-api-faq.html
https://router.vuejs.org/zh/
https://pinia.vuejs.org/zh/
https://nuxt.com/docs/getting-started/introduction
https://cn.vuejs.org/guide/typescript/overview.html
https://v3-migration.vuejs.org/zh/
```

---

## 输出目录

`docs/articles/05 vue/`（与 Vue 2 系列同目录，文件名区分系列）

文件命名格式：`YYYY-MM-DD-vue3-{slug}.md`

---

## 与 Vue 2 系列的关系

| Vue 2 篇 | Vue 3 对应篇 | 关系说明 |
|---------|------------|---------|
| 01 响应式原理 | 01 响应式原理 | Vue 3 篇专注 Proxy 升级点，交叉引用 |
| 03 组件通信 | 02/03 Composition API | Composition API 改变了通信方式 |
| 06 Vuex | 08 Pinia | 替代关系，对比讲解 |
| 05 Vue Router | 07 Vue Router 4 | 升级迁移，重点讲差异 |
| 12 Vue 3 迁移 | — | Vue 2 系列收尾，Vue 3 系列开头，互为入口 |

---

## 待确认问题

1. 是否单独写一篇「Vue 3 单元测试」（Vitest + Vue Test Utils v2）？还是并入第 10 篇性能优化？
2. 是否补充「Vue 3 微前端」实战篇（基于 Module Federation / micro-app）？
3. 每篇篇幅期望：对标现有系列（30-70KB）？
4. Vue 3 系列写完后，是否开 Vue 3 → React 横向对比系列？

---

*规划时间：2026-08-11 | 参考：Vue 3 官方文档 / Vue Router 4 / Pinia / Nuxt 3 官方文档*
