# Vue 3 全家桶系列公众号文章大纲

> 所属系列：Vue 3 深度拆解 · 第二版规划
> 写作原则：基本使用 → 原理 → 源码解析（重点代码，来源 GitHub 仓库）→ 生产级最佳实践 → 手写实现（Vite/Rollup）→ GitHub → 参考
> 目标读者：有 Vue 2 基础（最好读过 Vue 2 系列）、正在迁移或新建 Vue 3 项目、备战面试或寻求晋升的 3-8 年工程师

---

## 系列定位

**「Vue 3 全家桶深度拆解」系列**

- 篇数：12 篇（Vue 3 核心原理 7 篇 + 全家桶与工程化 5 篇）
- 核心主线：设计思想与架构 → 响应式原理 → 渲染原理与 Diff → 组件渲染 → Composition API → 内置组件 → 编译优化 → Pinia → Vue Router 4 → 性能优化 → 组件库搭建 → 通用后台管理系统从零搭建
- 内容结构：基本使用 → 原理 → 源码解析（重点代码，来源 GitHub 仓库）→ 生产级最佳实践 → 手写实现（Vite/Rollup）→ GitHub → 参考
- 特色：每篇保留 3-5 个「面试官会问」；示例沿用医疗场景命名（药品/处方/患者）；涉及 Vue 2 → Vue 3 变化的地方显式标注「升级点」；不设独立 TypeScript 篇，类型系统相关内容按场景拆分到对应篇章（组件库篇讲类型接口设计、后台管理系统篇讲类型消费实战、Composition API/Pinia/编译优化篇讲各自的类型原理）

---

## 文章规划总览

| 编号 | 标题 | 核心主题 | 状态 |
|------|------|----------|------|
| 01 | Vue 3 设计思想与整体架构：Monorepo + Tree-shaking + Composition API 三大革新 | 架构全景 | ⬜ 待写 |
| 02 | Vue 3 响应式原理与手写实现：Proxy + effect + track/trigger 三件套全链路 | 响应式系统 | ⬜ 待写 |
| 03 | Vue 3 渲染原理与 Diff 算法：首次渲染/更新/卸载 + Block Tree + Patch Flags | 渲染原理 | ⬜ 待写 |
| 04 | Vue 3 组件渲染原理：Text/Comment/Fragment + setup 执行链路全解析 | 组件系统 | ✅ 已发布 |
| 05 | Vue 3 Composition API 深度拆解：slots/emit/lifecycle/ref/provide/inject | Composition API | ⬜ 待写 |
| 06 | Vue 3 内置组件全解析：Teleport/Transition/KeepAlive/Suspense 异步编排详解 | 内置能力 | ⬜ 待写 |
| 07 | Vue 3 编译优化与模板编译原理：parse → transform → generate 三步拆解 | 编译器 | ⬜ 待写 |
| 08 | Pinia 原理与手写实现：为什么 Vuex 退场，Pinia 才是 Vue 3 的正确答案 | 状态管理 | ⬜ 待写 |
| 09 | Vue Router 4 原理与实战：组合式 API 路由 + 导航守卫 + 权限动态路由 | 前端路由 | ⬜ 待写 |
| 10 | Vue 3 性能优化全攻略：编译时优化 + 运行时优化的最优组合 | 性能 | ✅ 已发布 |
| 11 | Turborepo + pnpm workspace：Vue 3 前端 AI 组件库从零搭建 | 组件库工程化 | ⬜ 待写 |
| 12 | Vite + Vue 3 通用后台管理系统从零搭建：目录结构设计 + 生产级脚手架 | 工程化 | ⬜ 待写 |

---

## 各篇详细大纲

### 第 01 篇：Vue 3 设计思想与整体架构

**副标题**：Monorepo 拆包、Tree-shaking、Composition API，Vue 3 为什么这样设计？

#### 一、基本使用
- Vue 2 vs Vue 3 项目初始化对比：`new Vue()` → `createApp()`
- 全局 API 拆分：`Vue.component / Vue.directive / Vue.use` → `app.component / app.directive / app.use`
- `createApp` 多实例模式：多个应用实例互不污染全局配置
- 按需导入：`import { ref, computed } from 'vue'` — Tree-shaking 的前提
- `app.config.globalProperties` 替代 `Vue.prototype`

#### 二、原理
- Monorepo 包结构：`@vue/reactivity / @vue/runtime-core / @vue/runtime-dom / @vue/compiler-dom / vue`；每个包职责单一，可独立使用
- Tree-shaking 设计：Vue 3 全部使用命名导出而非挂载到 Vue 原型；未使用的 API 在构建时被摇掉
- `@vue/reactivity` 与渲染器解耦：响应式系统可脱离 DOM 独立运行（Node.js / Canvas / 小程序）
- `createRenderer(options)` 渲染器工厂：7 个平台操作（createElement / patchProp / insert / remove 等）可替换，实现跨平台
- Composition API 动机：解决 Options API 逻辑碎片化 + 类型推断难两个问题；逻辑关注点聚合到 Composable 函数
- `setup()` 执行时机：在 `beforeCreate` 之前，无 `this`，接收 `props` 和 `context`

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. 包入口：`packages/vue/src/index.ts` — 重新导出所有公共 API
2. `createApp`：`packages/runtime-dom/src/index.ts` — 返回 app 实例，挂载 `use / component / directive / mount`
3. 渲染器工厂：`packages/runtime-core/src/renderer.ts` — `createRenderer` 接收 `RendererOptions`
4. 响应式独立包：`packages/reactivity/src/index.ts` — 可脱离 Vue 使用
5. 全局 API 迁移对照：`packages/runtime-core/src/apiCreateApp.ts`

#### 四、生产级最佳实践
- 只引入需要的 API，避免 `import Vue from 'vue'` 全量导入（虽然 vue 包已做 re-export 优化）
- 多 `createApp` 场景：同一页面内嵌多个独立 Vue 应用（医疗：HIS 系统内嵌第三方药品查询组件）
- `app.config.errorHandler` 统一捕获全局异常，对接监控平台
- `app.config.globalProperties` 替代 `Vue.prototype`，同时提供 TypeScript 类型扩展

#### 五、手写实现（可独立跑通）
医疗场景：Vite + TypeScript 搭建环境，手写 `createApp + app.use + app.component + app.mount`；药品查询插件通过 `app.use` 安装，多实例互不污染演示

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://cn.vuejs.org/guide/introduction.html
- https://v3-migration.vuejs.org/zh/

**面试核心问**：
- Vue 3 为什么要拆成多个包（Monorepo）？`@vue/reactivity` 单独使用有什么场景？
- Vue 3 是怎么实现 Tree-shaking 的？和 Vue 2 的区别？
- `createApp` 和 `new Vue()` 的区别？多实例有什么意义？
- Composition API 解决了 Options API 的哪两个核心问题？
- `setup()` 的执行时机是什么？为什么不能用 `this`？

---

### 第 02 篇：Vue 3 响应式原理与手写实现

**副标题**：Proxy 如何比 Object.defineProperty 做得更彻底？track/trigger 全链路拆解

#### 一、基本使用
- `reactive()`：深层响应式对象；只能代理对象类型，不能解构（丢失响应性）
- `ref()`：基本类型响应式包装，模板中自动解包，JS 中需 `.value`
- `computed()`：只读计算属性 vs 可读写 `{ get, set }` 写法
- `watch` 的 source 三种形式：单个 ref / getter 函数 / 响应式对象；`watch` vs `watchEffect` 的基本用法
- `toRef` / `toRefs`：从响应式对象中取出单个属性并保持响应式连接

#### 二、原理
- Vue 2 响应式的三个历史遗留问题：新增属性检测不到、数组下标赋值检测不到、删除属性检测不到 —— Proxy 如何逐一解决
- Proxy 的 `get / set / deleteProperty / has / ownKeys` 拦截器；Reflect 配合使用的原因（保证 `this` 指向正确）
- `reactive()` 实现：`WeakMap` 缓存代理对象（避免重复代理 + 防止内存泄漏）+ 惰性递归代理（访问到嵌套对象时才代理，而非一次性深度遍历）
- `ref()` 实现：为什么基本类型需要包装成对象——闭包在类里维护 `_value`，`get value()` / `set value()` 触发依赖收集与派发更新；对象类型的 ref 内部调用 `reactive()`
- 响应式系统三件套完整链路：
  - `track`：`targetMap`（WeakMap）→ `depsMap`（Map）→ `dep`（Set）三层结构存储依赖
  - `trigger`：从 `targetMap` 找到对应 `dep`，遍历执行 effect
  - `effect`：`activeEffect` 全局变量 + 副作用函数栈，处理嵌套 effect
- `computed()`：惰性求值 + `dirty` 脏标记；依赖的响应式数据变化时只标记 dirty，真正取值时才重新计算
- `watch` vs `watchEffect` 依赖收集时机的差异：`watchEffect` 立即执行并自动收集依赖，`watch` 显式声明依赖源，惰性执行
- `toRef` / `toRefs` 的实现：通过 `get/set` 代理转发到源对象的属性，而非拷贝值
- Collection 类型响应式（`Map/Set/WeakMap/WeakSet`）：无法用 `baseHandlers` 的 `get/set` 拦截器处理（方法调用而非属性访问），需要单独的 `collectionHandlers` 拦截 `.get/.set/.add/.delete/.forEach` 等方法并在内部手动 `track/trigger`——这是 Vue 2 完全无法解决、Proxy 才补上的第四类历史遗留问题
- `effectScope`（3.2+）：批量收集一组 effect（ref/computed/watch）以便统一暂停/恢复/销毁，无需手动逐个清理；`scope.run(fn)` 内创建的所有响应式副作用都会被收集到该 scope，`scope.stop()` 一次性停止；Pinia 的每个 Store 实例、组件卸载时清理内部 watcher，底层都依赖它

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. `reactive`：`packages/reactivity/src/reactive.ts`（`WeakMap` 缓存 + `createReactiveObject`）
2. `baseHandlers`：`packages/reactivity/src/baseHandlers.ts`（get/set/deleteProperty/has/ownKeys 五个拦截器）
3. `ref`：`packages/reactivity/src/ref.ts`（`RefImpl` 类 + `toReactive` 处理对象类型）
4. 依赖收集与派发：`packages/reactivity/src/effect.ts`（`track` / `trigger` / `ReactiveEffect`）
5. `computed`：`packages/reactivity/src/computed.ts`（`ComputedRefImpl` 的 `_dirty` 标记）
6. Collection 类型代理：`packages/reactivity/src/collectionHandlers.ts`（`Map/Set` 的 `get/set/add/delete/forEach` 方法重写）
7. `effectScope`：`packages/reactivity/src/effectScope.ts`（`EffectScope` 类 + `scope.run` / `scope.stop`）

#### 四、生产级最佳实践
- `reactive()` 解构丢失响应性的坑：用 `toRefs()` 解构，或直接用 `.value` 访问 ref
- `shallowReactive` / `shallowRef`：大型只读数据（药品目录、ICD 码表）避免深层递归代理开销
- `computed` 的 getter 必须无副作用：避免在 computed 中修改其他响应式数据导致循环依赖
- `watch` 的 `immediate` + `deep` 选项的性能代价：deep watch 会递归遍历整个对象，大对象慎用
- `markRaw`：明确标记不需要响应式化的数据（如第三方库实例、大型静态配置）
- Collection 类型响应式的实战场景：医疗场景用 `reactive(new Map())` 维护科室 → 医生列表的索引缓存，比数组 `find` 查找性能更优，且天然响应式

#### 五、手写实现（可独立跑通）
医疗场景：Vite + TypeScript 搭建环境，手写极简响应式系统（Proxy + Reflect + track/trigger + effect + ref + computed，~150 行）；患者信息表单实时响应式校验完整代码

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://cn.vuejs.org/guide/extras/reactivity-in-depth.html

**面试核心问**：
- Proxy 相比 defineProperty 解决了哪些问题？为什么必须配合 Reflect 使用？
- `ref` 和 `reactive` 的区别？为什么基本类型需要 `.value`？
- `computed` 的缓存是怎么实现的？`dirty` 标记的作用是什么？
- `track` / `trigger` 的三层依赖存储结构是什么样的？
- `watch` 和 `watchEffect` 依赖收集时机有什么区别？
- 响应式系统是如何支持 `Map/Set` 的？和普通对象的代理方式有什么不同？
- `effectScope` 解决了什么问题？和手动逐个清理 effect 相比有什么优势？

---

### 第 03 篇：Vue 3 渲染原理与 Diff 算法

**副标题**：从首次渲染到 Diff 优化的完整链路，Block Tree + Patch Flags 让更新快多少？

#### 一、基本使用
- `h()` 函数与 JSX：手写渲染函数的两种方式
- Fragment：多根节点组件，不再强制单根
- `key` 在 `v-for` 中的正确用法（延续 Vue 2 的最佳实践，原理层面升级）
- 首次渲染 vs 更新渲染在开发中的直观表现（Vue Devtools 组件高亮）

#### 二、原理

**1. 首次渲染（mount）**
- `render()` 生成 VNode → `patch(null, vnode)` → 走 `mountElement` 递归创建真实 DOM
- 挂载顺序：创建元素 → 设置 props → 递归挂载子节点 → 插入父容器

**2. 节点更新（patch）**
- `patch(n1, n2)` 首先判断新旧 VNode 类型是否相同：类型不同直接卸载旧节点再挂载新节点
- 类型相同走 `patchElement`：对比 props（`patchProps`）+ 对比 children（`patchChildren`，全量 Diff 或结合 Patch Flags 的定向更新）

**3. 节点卸载（unmount）**
- `unmount` 递归卸载子树：先卸载子节点，再移除自身 DOM
- 卸载过程中依次触发 `beforeUnmount → unmounted` 生命周期钩子；组件卸载还需要停止其 render effect、清理 provide/inject 引用

**4. 编译时优化**
- 核心思路：在编译阶段标记动态内容，运行时只比较动态部分，不再逐层全量 Diff（对比 Vue 2 同层全量比较的瓶颈）
- Patch Flags：用位运算标记节点的动态类型（`TEXT / CLASS / STYLE / PROPS` 等），`patchElement` 时按位判断只更新对应部分
- Block Tree：把动态子节点收集到 `dynamicChildren` 数组中，更新时跳过静态子树，直接线性遍历动态节点
- 静态提升（Static Hoisting）：纯静态节点在编译阶段提升到 render 函数外，只创建一次，不参与后续 Diff
- 事件侦听器缓存（cacheHandlers）：内联事件处理函数被缓存，避免每次渲染生成新函数导致子组件不必要的更新
- 本节讲的是运行时如何**消费**这些编译时标记；标记本身在编译阶段如何生成（`hoistStatic` / Patch Flags 分析 / Block 收集的具体实现），见第 07 篇「编译优化与模板编译原理」

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. 首次渲染：`packages/runtime-core/src/renderer.ts` `mountElement`
2. 节点更新：`packages/runtime-core/src/renderer.ts` `patchElement` / `patchChildren`
3. 节点卸载：`packages/runtime-core/src/renderer.ts` `unmount` 递归卸载
4. Patch Flags 定义：`packages/shared/src/patchFlags.ts`
5. Block Tree 收集动态节点：`packages/runtime-core/src/vnode.ts` `openBlock` / `closeBlock`

#### 四、生产级最佳实践
- `key` 的正确使用：稳定唯一标识而非 index，原理与 Vue 2 一致但收益因 Block Tree 更明显
- `v-once`：纯静态内容永不更新，跳过 Diff
- `v-memo`：手动标记跳过更新的子树（类似 React.memo），大列表场景的性能利器
- Fragment 场景下 `$attrs` 透传需手动绑定（多根节点无法自动继承 attrs）
- 医疗场景实战：处方药品列表增删改时，结合 key 与 Block Tree 分析更新范围

#### 五、手写实现（可独立跑通）
医疗场景：Vite + TypeScript 搭建环境，手写 mountElement + patchElement + unmount + 简化版 Patch Flags；处方药品列表渲染性能对比（有无 Patch Flags）完整演示

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://cn.vuejs.org/guide/extras/rendering-mechanism.html

**面试核心问**：
- Vue 3 比 Vue 2 快在哪里？静态提升具体是什么？
- Patch Flags 是什么？用位运算标记的原因是什么？
- Block Tree 如何减少 Diff 的比较范围？
- `v-memo` 的使用场景和实现原理？
- Fragment 多根节点为什么不再需要唯一根元素？

---

### 第 04 篇：Vue 3 组件渲染原理

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
（链接占位，写作时填入）

#### 七、参考
- https://cn.vuejs.org/guide/extras/rendering-mechanism.html

**面试核心问**：
- 组件从挂载到渲染出真实 DOM 经历了哪些阶段？
- `setup()` 返回函数和返回对象两种写法有什么区别？
- 组件实例上有哪些核心属性？`subTree` 是什么？
- 组件的 `key` 变化和元素的 `key` 变化，处理方式有什么不同？
- Comment 节点在什么场景下会被创建？

---

### 第 05 篇：Vue 3 Composition API 深度拆解

**副标题**：slots/emit/lifecycle/ref/provide-inject，组合式 API 底层怎么串起来的？

#### 一、基本使用
- `defineProps` / `defineEmits`：组件对外接口声明
- `defineModel`（3.4+）：组件双向绑定的编译时宏，替代手写 `props: ['modelValue'] + emit('update:modelValue', ...)` 的样板代码
- 插槽在 setup 中的访问：`context.slots` / `useSlots()`
- 生命周期钩子：`onMounted / onUpdated / onUnmounted` 等与 Options API 的映射关系
- 模板引用：`const el = ref(null)` 绑定 DOM 元素或子组件实例
- `provide` / `inject`：跨层级依赖注入的组合式写法
- Composables 设计模式：`use` 前缀命名约定，封装可复用的有状态逻辑

#### 二、原理
- `emit` 实现：编译时将 `emits` 选项与组件事件系统关联，`instance.emit` 调用时从 `vnode.props` 中找到对应的 `onXxx` 处理函数并执行
- `slots` 实现：父组件编译生成插槽函数对象存入 `vnode.children`，子组件通过 `instance.slots` 访问，调用时执行函数生成 VNode（对比 Vue 2 作用域插槽的编译产物，思路一致但统一了普通/作用域插槽）
- 生命周期钩子实现：`onMounted` 等函数将回调 push 到 `instance` 对应的钩子数组（如 `instance.m`），组件生命周期流程中按序 `invokeArrayFns` 调用；必须在 `setup` 同步执行期间调用（依赖 `currentInstance` 全局变量）
- 组合式 `ref`：模板引用如何在 `patch` 过程中通过 `ref` VNode 属性设置到 setup 返回的 ref 变量上
- `provide` / `inject` 实现：`instance.provides` 以原型链方式继承父组件的 provides 对象（避免深拷贝，天然实现层级覆盖）；`inject` 沿 `parent.provides` 原型链向上查找
- Composable 函数：本质是在 `setup()` 同步调用期间执行的普通函数，闭包持有响应式状态；能调用 `onMounted` 等生命周期 API 的原因是仍处于同一个 `currentInstance` 上下文
- Composable 参数响应式：接受 `ref` 或普通值，用 `toValue()` 统一处理（Vue 3.3+）
- 与 React Hooks 的本质区别：Vue Composable 无调用顺序限制（不依赖调用顺序做状态对应，而是闭包直接持有响应式引用）
- `defineModel` 编译原理：本质是 `defineProps` + `defineEmits` 的语法糖，编译时展开为声明一个 `modelValue` prop 并返回一个读写 `ref`——写这个 ref（`model.value = xxx`）会自动编译为 `emit('update:modelValue', xxx)`，因此组件内可以像操作本地 ref 一样操作父组件传入的值（与第 07 篇编译器宏擦除机制呼应）

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. `emit` 实现：`packages/runtime-core/src/componentEmits.ts`
2. `slots` 初始化：`packages/runtime-core/src/componentSlots.ts` `initSlots` / `updateSlots`
3. 生命周期钩子：`packages/runtime-core/src/apiLifecycle.ts`（`createHook` 工厂函数）
4. 模板引用设置：`packages/runtime-core/src/rendererTemplateRef.ts`
5. `provide` / `inject`：`packages/runtime-core/src/apiInject.ts`（原型链继承 provides）
6. `defineModel` 编译：`packages/compiler-sfc/src/script/defineModel.ts`

#### 四、生产级最佳实践
- Composable 命名约定与返回值设计：返回响应式状态 + 方法，命名前缀 `use`
- 有副作用的 Composable：在内部自动注册 `onUnmounted` 清理（定时器、事件监听、WebSocket）
- Composable 组合调用链：`usePrescription` 内部组合 `usePatientSearch` + `useDrugInventory`
- provide/inject 保持响应式：传入 `reactive` 对象或 `ref`，而非普通值
- Composable 的测试策略：`withSetup` 辅助函数模拟组件上下文进行单测
- `defineModel` 实战：医疗场景「药品数量选择器」组件用 `const count = defineModel<number>()` 替代手写 `props.modelValue + emit('update:modelValue')`；配合 `defineModel('visible', { default: false })` 实现多个 `v-model` 绑定（如弹窗同时绑定 `v-model:visible` 和 `v-model:selectedDrug`）
- Composable 的类型设计取舍：参数类型 + 返回类型显式声明 vs 依赖 TypeScript 自动推断——公共 Composable（跨模块复用）建议显式声明返回类型接口，方便调用方查阅；内部私有 Composable 可依赖自动推断减少维护成本；返回联合类型的 ref（如 `Ref<Drug | null>`）在使用处需要类型收窄（`if (drug.value)` 或类型断言）才能安全访问属性

#### 五、手写实现（可独立跑通）
医疗场景：Vite + TypeScript 搭建环境，手写 emit + slots + 生命周期钩子系统 + provide/inject；`usePatientSearch` + `useDrugInventory` + `usePrescription` 三个业务 Composable 组合调用完整演示

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://cn.vuejs.org/guide/reusability/composables.html
- https://cn.vuejs.org/guide/extras/composition-api-faq.html
- https://cn.vuejs.org/guide/typescript/composition-api.html

**面试核心问**：
- `$emit` 在 Composition API 中的实现原理是什么？和 Vue 2 的 `vm._events` 有何不同？
- 作用域插槽和普通插槽在 Vue 3 中的编译产物有何统一？
- `onMounted` 等钩子为什么必须在 `setup` 同步代码中调用？
- provide/inject 底层为什么用原型链实现？有什么好处？
- Composable 和 React 自定义 Hook 的本质区别是什么？为什么 Vue 没有调用顺序限制？
- `defineModel` 是如何替代手写 `modelValue` + `update:modelValue` 的？底层编译产物是什么样的？

---

### 第 06 篇：Vue 3 内置组件全解析

**副标题**：Teleport 传送门、KeepAlive LRU 缓存、Suspense 异步编排，实现原理逐个拆解

#### 一、基本使用
- Teleport：`<Teleport to="body">`，`disabled` 属性动态切换
- Transition：`v-enter-from / v-enter-active / v-enter-to` 等类名规范（相比 Vue 2 `v-enter` 的命名升级）；`TransitionGroup` 的 `move` 过渡
- KeepAlive：`include / exclude`（支持正则）/ `max` 属性；`onActivated / onDeactivated` 组合式写法
- 异步组件：`defineAsyncComponent` 基础用法 + loading/error 状态配置
- Suspense：`<Suspense>` 的 `#default` / `#fallback` 两个插槽，包裹异步组件或含顶层 `await` 的 `<script setup>` 组件

#### 二、原理
- Teleport 实现原理：渲染时将子树挂载到指定目标 DOM，但组件的逻辑树（`parent` 关系、provide/inject）保持不变；`process` 函数中对 Teleport VNode 特殊处理，`move` 时只移动 DOM 不重新创建
- Transition 原理：`beforeEnter → enter → afterEnter` / `beforeLeave → leave → afterLeave` 钩子序列；通过 `nextFrame` 与 CSS transitionend/animationend 事件配合判断动画结束时机
- TransitionGroup 的 FLIP 动画原理：First-Last-Invert-Play，记录移动前后位置差值，用 transform 反向位移再动画归位
- KeepAlive 实现：内部维护 `cache`（Map）+ `keys`（Set）；LRU 淘汰策略——命中的 key 重新插入到 Set 末尾，超过 `max` 时删除 Set 中最旧（首位）的 key 并调用其 `unmount`
- KeepAlive 特殊渲染逻辑：`process` 函数中拦截，命中缓存直接从 `cache` 取出 `vnode.component` 复用实例，不重新创建；`activated / deactivated` 钩子替代 `mounted / unmounted`
- 异步组件实现：`defineAsyncComponent` 返回一个包装组件，内部用 `loader()` 返回的 Promise 状态驱动渲染 loading/error/结果组件
- **Suspense 异步编排原理**：子树中任意后代组件返回一个 Promise（异步组件的 `loader()`，或 `<script setup>` 顶层 `await`），会被 Suspense 拦截并加入 `deps` 计数器；所有依赖 resolve 前渲染 `#fallback` 插槽，全部 resolve 后一次性切换到 `#default` 插槽内容，避免多个异步组件各自 loading 导致的布局抖动；`suspensible` 属性控制嵌套 Suspense 是否向上传播

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. Teleport：`packages/runtime-core/src/components/Teleport.ts`（`process` / `move` 特殊处理）
2. Transition：`packages/runtime-core/src/components/BaseTransition.ts`（钩子序列）
3. TransitionGroup FLIP：`packages/runtime-dom/src/components/TransitionGroup.ts`
4. KeepAlive LRU：`packages/runtime-core/src/components/KeepAlive.ts`（cache Map + keys Set）
5. 异步组件：`packages/runtime-core/src/apiAsyncComponent.ts`（`defineAsyncComponent`）
6. Suspense：`packages/runtime-core/src/components/Suspense.ts`（`deps` 计数器 + `resolve` 切换逻辑）

#### 四、生产级最佳实践
- Teleport + provide/inject：渲染到 body 后依然能访问父组件的注入数据（医疗场景：全屏药品详情弹窗访问全局患者上下文）
- KeepAlive + 路由缓存：`include` 动态白名单控制（医疗场景：问诊页面按需缓存）
- Transition 性能优化：用 `transform` + `will-change`，避免触发 layout 重排
- Suspense + 多个异步组件协作：医疗场景「患者详情页」同时依赖处方数据、检验报告数据两个异步组件，用一个 Suspense 统一 loading，避免逐个组件写 loading 逻辑；`onErrorCaptured` 配合处理异步依赖失败
- 异步组件 + 路由懒加载：结合 Vite 的动态 `import()` 实现路由级代码分割

#### 五、手写实现（可独立跑通）
医疗场景：Vite + TypeScript 搭建环境，手写 Teleport 挂载逻辑 + KeepAlive LRU 缓存 + 简化版 defineAsyncComponent + 简化版 Suspense（deps 计数器）；科室切换 KeepAlive 缓存 + 全屏弹窗 Teleport + 患者详情页 Suspense 统一 loading 完整演示

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://cn.vuejs.org/guide/built-ins/teleport.html
- https://cn.vuejs.org/guide/built-ins/keep-alive.html
- https://cn.vuejs.org/guide/built-ins/suspense.html

**面试核心问**：
- Teleport 渲染到 body 后，组件的 provide/inject 还能用吗？为什么？
- KeepAlive 的 LRU 缓存具体是怎么实现的？`max` 触发时调用哪个生命周期？
- TransitionGroup 的 FLIP 动画原理是什么？
- Suspense 是如何统一调度多个异步依赖的？`deps` 计数器的作用是什么？
- KeepAlive 命中缓存和正常挂载相比，跳过了哪些流程？

---

### 第 07 篇：Vue 3 编译优化与模板编译原理

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
（链接占位，写作时填入）

#### 七、参考
- https://cn.vuejs.org/guide/extras/rendering-mechanism.html
- https://cn.vuejs.org/api/sfc-script-setup.html
- https://cn.vuejs.org/guide/typescript/overview.html

**面试核心问**：
- 模板编译的三个阶段分别做了什么？和 Vue 2 相比核心区别是什么？
- 静态提升是在编译的哪个阶段完成的？如何影响运行时性能？
- `<script setup>` 的编译产物是什么样的？宏为什么不需要 import？
- Vue 3 中 `v-if` 和 `v-for` 同节点的优先级和 Vue 2 有什么不同？
- Block 是如何收集动态子节点的？为什么能减少 Diff 范围？

---

### 第 08 篇：Pinia 原理与手写实现

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
（链接占位，写作时填入）

#### 七、参考
- https://pinia.vuejs.org/zh/

**面试核心问**：
- Pinia 和 Vuex 的核心区别是什么？为什么没有 Mutation？
- Pinia 的 Store 是全局单例吗？底层响应式是怎么实现的？
- Options Store 和 Setup Store 有什么区别？分别适合什么场景？
- Pinia 如何实现持久化？插件系统的设计原理是什么？
- Store 之间互相调用为什么不需要 rootState/rootGetters？

---

### 第 09 篇：Vue Router 4 原理与实战

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
（链接占位，写作时填入）

#### 七、参考
- https://router.vuejs.org/zh/

**面试核心问**：
- `useRoute()` 返回的对象是响应式的吗？底层是怎么实现的？
- 导航守卫的完整执行顺序是什么？和 Vue 2 相比有什么变化？
- `addRoute` 动态添加路由后，为什么当前页面不会自动更新？怎么解决？
- `<RouterView>` 是如何递归渲染嵌套路由的？
- Vue Router 4 相比 3 有哪些破坏性变更？

---

### 第 10 篇：Vue 3 性能优化全攻略

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
（链接占位，写作时填入）

#### 七、参考
- https://cn.vuejs.org/guide/best-practices/performance

**面试核心问**：
- `v-memo` 的使用场景和实现原理？和 React.memo 有什么类比关系？
- `shallowRef` 和 `ref` 什么时候该用 shallow？
- Vue 3 的 Tree Shaking 为什么比 Vue 2 好？前提条件是什么？
- 虚拟列表的核心原理是什么？和 Vue 3 的 Diff 优化是互补关系还是替代关系？
- `onTrack` / `onTrigger` 能帮助排查什么问题？

---

### 第 11 篇：Turborepo + pnpm workspace：Vue 3 前端 AI 组件库从零搭建

**副标题**：从组件子包到 Rspress 文档站，一个可发布的生产级组件库长什么样

#### 一、基本使用
- pnpm workspace 基础命令：`pnpm -F <package> add/run`、根目录统一安装依赖
- Turborepo `turbo.json` pipeline 基础配置：`build / lint / test / dev` 任务声明
- 组件库使用者视角：`pnpm add @xxx/components` 后按需引入某个组件（`import { DrugSelect } from '@xxx/components'`）
- Rspress 文档站本地启动与目录约定（`docs/` + MDX 文件）

#### 二、原理
- pnpm workspace 协议（`workspace:*`）与依赖提升策略：内容寻址存储（content-addressable store）+ 硬链接，对比 npm/yarn 的 node_modules 扁平化提升，天然避免幽灵依赖
- Turborepo 任务编排与缓存：`pipeline` 中 `dependsOn` 声明任务依赖顺序（如 `build` 依赖上游包的 `^build`）；缓存命中基于输入文件内容 hash（源码 + 依赖 + 环境变量），命中后直接复用产物跳过执行
- Monorepo 包职责划分：`packages/components`（组件本体）/ `packages/utils`（无 UI 依赖的纯函数工具）/ `packages/shared`（跨包共享的类型与常量）三层依赖关系，`components` 依赖 `utils` 和 `shared`，禁止反向依赖
- Rspress 文档站原理：基于 Rspack 的 MDX 编译，文档与组件 Demo 源码共存（组件旁自带 `.md` 示例），构建时生成静态站点
- 组件库类型接口设计：泛型组件如何对外暴露类型参数（`<script setup lang="ts" generic="T">` 编译产物保留泛型声明到 `.d.ts`），Props/Emits 通过 `defineProps<Props>()` 纯类型声明统一导出接口，供库使用者在 IDE 中获得精确的类型提示（与第 07 篇编译原理呼应）

#### 三、源码解析（业界参考实现解析，非 Vue 源码）
1. 主流 Vue 3 组件库的 Monorepo 目录结构范式：`packages/{组件包, 工具包, 主题包}` 的通用划分方式
2. `turbo.json` pipeline 配置范式：`build` 任务的 `dependsOn: ["^build"]` 声明与 `outputs` 缓存目录配置
3. `package.json` `exports` 字段设计：区分 ESM/CJS 双格式导出 + 子路径按需导出（`./button`、`./select`）
4. 组件库类型声明文件生成：`vue-tsc` 生成 `.d.ts` 的构建流程集成方式

#### 四、生产级最佳实践
- 版本管理与发布流程：changesets 模式——每次变更记录一个 changeset，合并后自动生成 changelog 并按语义化版本发布
- 组件文档与代码同步维护：组件 Demo 直接从源码目录引入，避免文档示例与实际组件行为脱节
- 按需加载与 Tree Shaking 验证：`package.json` `sideEffects: false` + 子路径导出，构建产物体积对比验证
- CI 流水线：lint → build → test → 版本发布四步门禁
- 泛型列表组件 `DataTable<T>` 类型设计实战：既保留组件复用性（支持药品/患者/处方等不同数据类型），又保证每个使用处的类型精确，是组件库对外类型设计能力的典型产出

#### 五、手写实现（可独立跑通）
医疗场景 AI 组件库：从零搭建 `packages/components`（药品搜索选择器 `DrugSelect` / 处方单表格 `DataTable<T>` / AI 问诊聊天气泡组件 `ChatBubble`）+ `packages/utils` + `packages/shared` + `apps/docs`（Rspress 文档站）+ `apps/playground`（example 示例）完整 Monorepo 骨架

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://turbo.build/repo/docs
- https://pnpm.io/zh/workspaces
- https://rspress.dev/

**面试核心问**：
- pnpm workspace 是如何做到依赖提升又避免幽灵依赖的？
- Turborepo 的缓存命中是基于什么计算的？
- 组件库如何给泛型组件的使用者提供精确的类型提示？
- Rspress 和 VitePress 的定位有什么区别？
- 组件库如何保证按需引入（Tree Shaking）真正生效？

---

### 第 12 篇：Vite + Vue 3 通用后台管理系统从零搭建

**副标题**：目录结构设计 + 类型消费实战，一次搭透生产级脚手架

#### 一、基本使用
- Vite 核心概念：开发环境基于原生 ESM 按需编译 vs 生产构建基于 Rollup 打包
- `create-vue` 脚手架初始化项目结构
- 组件库搭建基础：单文件组件 + 统一导出入口
- 环境变量：`.env` / `.env.development` / `.env.production` + `import.meta.env` 读取

#### 二、原理
- Vite 开发服务器原理：请求到来时才编译对应模块（按需编译），基于浏览器原生 `<script type="module">` 实现零打包启动；相比 Webpack 需要提前打包整个依赖图，冷启动速度量级差异的原因
- 依赖预构建（Pre-bundling）：`esbuild` 将 CommonJS/UMD 依赖预先转换为 ESM 并合并请求，减少浏览器大量小文件请求的网络开销
- HMR 原理：Vite 的模块热替换基于 ESM 的模块边界做精确失效，只重新请求变更模块及其直接依赖，而非 Webpack 需要重新执行整个 chunk
- 目录结构划分模式：按功能域（feature-based）vs 按类型（type-based）的取舍；大型后台管理系统推荐的分层——`api / stores / composables / components / views / router`
- 生产构建优化：Rollup 的 Tree Shaking + `manualChunks` 分包策略 + CSS 代码分割
- 全局属性类型扩展原理：`ComponentCustomProperties` / `GlobalComponents` 接口通过模块增强（`declare module 'vue'`）扩展类型系统，使 TypeScript 能识别 `app.config.globalProperties` 上挂载的自定义属性

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. Vite 依赖预构建：`vite` 源码中 `optimizeDeps` 模块（esbuild 扫描入口 + 预打包）
2. HMR 边界处理：`vite` 客户端运行时 `client.ts` 的 `import.meta.hot.accept`
3. `@vitejs/plugin-vue`：SFC 编译集成，`transform` 钩子调用 `@vue/compiler-sfc`
4. 模块增强接口：`packages/runtime-core/src/componentOptions.ts`（`ComponentCustomProperties`）
5. Rollup 分包配置：`vite.config.ts` 生产项目实际 `manualChunks` 策略

#### 四、生产级最佳实践
- 目录结构设计规范：`src/{api,stores,composables,components,views,router,utils,types}` 分层职责说明
- 通用后台管理系统搭建清单：路由权限 + 请求封装（axios 拦截器）+ 全局状态（Pinia）+ 组件库集成 + 主题定制
- Vite 生产优化：`build.rollupOptions.output.manualChunks` 按业务模块分包、`build.cssCodeSplit`、图片资源 `assetsInlineLimit` 配置
- `app.config.globalProperties` 添加自定义属性的类型声明：通过 `declare module 'vue'` 扩展 `ComponentCustomProperties`（如给挂载的 axios 实例、权限判断函数提供类型支持）
- 请求层类型封装：接口返回值用泛型包装统一响应结构（`ApiResponse<T>`）、分页列表类型（`PageResult<T>`），配合 axios 拦截器实现端到端类型安全
- 医疗场景实战：医院管理系统 Vite + Vue 3 + TypeScript 工程模板完整配置（含 Nginx 部署配置）

#### 五、手写实现（可独立跑通）
医疗场景：从零用 Vite + Vue 3 + TypeScript 搭建通用后台管理系统骨架，含路由权限 + Pinia 状态管理 + axios 请求封装 + 基础组件库集成；可直接 clone 使用的完整配置

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://cn.vitejs.dev/
- https://cn.vuejs.org/guide/scaling-up/tooling.html

**面试核心问**：
- Vite 的冷启动为什么比 Webpack 快？依赖预构建解决了什么问题？
- Vite 的 HMR 原理是什么？和 Webpack HMR 的核心区别？
- 大型后台管理系统的目录结构应该怎么划分？各层职责是什么？
- 如何给 `app.config.globalProperties` 添加的属性提供类型支持？
- 生产构建时如何做合理的分包（manualChunks）策略？

---

## 写作规范

- **结构**：严格按七段式（基本使用 → 原理 → 源码解析 → 生产级最佳实践 → 手写实现 → GitHub → 参考）
- **手写实现**：每节均先搭 Vite/Rollup 环境，代码可独立运行，包含医疗场景完整示例
- **面试模块**：每篇 3-5 个「面试官会问」
- **医疗命名**：所有示例用药品/处方/患者命名
- **升级对比**：涉及 Vue 2 → Vue 3 变化的地方，显式加「升级点」标注，降低老读者认知负担
- **禁止**：出现具体公司名、博主名/账号名/人名

---

## 参考链接（每篇末尾统一引用池）

```
https://cn.vuejs.org/guide/introduction.html
https://cn.vuejs.org/guide/extras/reactivity-in-depth.html
https://cn.vuejs.org/guide/extras/rendering-mechanism.html
https://cn.vuejs.org/guide/extras/composition-api-faq.html
https://cn.vuejs.org/guide/reusability/composables.html
https://cn.vuejs.org/guide/built-ins/teleport.html
https://cn.vuejs.org/guide/built-ins/keep-alive.html
https://cn.vuejs.org/guide/built-ins/suspense.html
https://cn.vuejs.org/guide/typescript/overview.html
https://cn.vuejs.org/guide/typescript/composition-api.html
https://cn.vuejs.org/guide/best-practices/performance.html
https://cn.vitejs.dev/
https://router.vuejs.org/zh/
https://pinia.vuejs.org/zh/
https://v3-migration.vuejs.org/zh/
https://turbo.build/repo/docs
https://pnpm.io/zh/workspaces
https://rspress.dev/

https://jonny-wei.github.io/blog/vue/vue3/reactivity.html
https://github.com/wbccb/
```

---

## 输出目录

`docs/articles/06 vue 3/`

文件命名：`YYYY-MM-DD-vue3-{slug}.md`

---

## 与 Vue 2 系列的关系

| Vue 2 篇 | Vue 3 对应篇 | 关系说明 |
|---------|------------|---------|
| 01 构建与初始化 | 01 设计思想与整体架构 | Monorepo 拆包与 createApp 是架构层面的升级 |
| 02 响应式原理 | 02 响应式原理 | Vue 3 篇专注 Proxy 升级点，交叉引用 |
| 03 虚拟 DOM 与 Diff | 03 渲染原理与 Diff 算法 | Vue 3 篇显式拆出首次渲染/更新/卸载三段，新增 Block Tree / Patch Flags 编译时优化 |
| 04 组件渲染原理 | 04 组件渲染原理 | 组件实例结构变化，setup 执行链路是核心差异 |
| 06 插槽原理 / 07 事件绑定原理 | 05 Composition API 深度拆解 | 插槽/事件从 Options API 迁移到组合式写法 |
| 08 内置组件与核心 API | 06 内置组件全解析 | Teleport/Suspense 为新增，KeepAlive/Transition 为升级 |
| 05 模板编译原理 | 07 编译优化与模板编译原理 | 新增静态提升、Patch Flags、Block Tree，以及 TS 泛型/defineProps 类型编译 |
| 10 Vuex | 08 Pinia | 替代关系，对比讲解 |
| 09 Vue Router | 09 Vue Router 4 | 升级迁移，重点讲组合式 API 路由差异 |
| 12 性能优化 | 10 性能优化 | 新增 v-memo / shallowRef 等 Vue 3 特有优化手段 |
| — | 11 组件库搭建 | Vue 3 新增能力，Vue 2 系列无对应篇；Turborepo + pnpm workspace 组件库工程化 |
| 14 Webpack 工程模板 | 12 通用后台管理系统从零搭建 | 构建工具从 Webpack 迁移到 Vite，新增全局属性类型扩展、请求层类型封装实战 |

---

## 待确认问题

1. 是否单独写一篇「Vue 3 单元测试」（Vitest + Vue Test Utils v2）？当前版本按用户要求不包含 Vuex 和测试篇。
2. 是否补充「Vue 3 微前端」实战篇（基于 Module Federation / micro-app / qiankun）？
3. 每篇篇幅期望：对标 Vue 2 系列（30-70KB）？
4. Vue 3 系列写完后，是否开 Vue 3 → React 横向对比系列？
5. 当前 12 篇已覆盖 `docs/notes/06 vue 3/` 全部 39 个笔记知识点；不再设独立 TypeScript 篇，类型系统内容已按场景拆分到第 05（Composable 类型）、07（类型编译源码）、08（Pinia 类型推导）、11（组件库类型接口设计）、12（全局属性类型扩展 + 请求层类型封装）篇，如需要可以核对是否有遗漏。
6. 已补充笔记目录之外、但市场面试与生态现状高频涉及的知识点：Collection 类型响应式（Map/Set 代理，第 02 篇）、`effectScope`（第 02 篇）、Suspense 独立成节（第 06 篇）、`defineModel`（第 05/07 篇）；SSR/Nuxt 相关内容因笔记目录本身未覆盖，暂未加入，如需要和 Vue 2 系列的 SSR 篇对等，需单独确认是否新增番外篇。

---

*规划时间：2026-08-19 | 参考：Vue 3 官方文档 / Vue Router 4 / Pinia / Vite 官方文档*
