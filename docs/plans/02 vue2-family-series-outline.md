# Vue 2 全家桶系列公众号文章大纲

> 所属系列：Vue 2 深度拆解 · 第二版规划
> 写作原则：基本使用 → 原理 → 源码解析（重点代码，来源 GitHub 仓库）→ 生产级最佳实践 → 手写实现（Rollup）→ GitHub → 参考
> 目标读者：3-8 年前端经验、有 Vue 2 存量项目经验（医疗/金融/政企）、备战面试或寻求晋升的工程师

---

## 系列定位

**「Vue 2 全家桶深度拆解」系列**

- 篇数：14 篇（Vue 2 核心源码拆为 8 篇 + 全家桶工具链 6 篇）
- 核心主线：构建与初始化 → 响应式 → 虚拟DOM/Diff → 组件渲染 → 模板编译 → 插槽原理 → 事件绑定原理 → 内置组件/核心API → Vue Router → Vuex → SSR → 性能优化 → 测试 → Webpack
- 内容结构：基本使用 → 原理 → 源码解析（重点代码，来源 GitHub 仓库）→ 生产级最佳实践 → 手写实现（Rollup）→ GitHub → 参考
- 特色：每篇保留 3-5 个「面试官会问」；示例沿用医疗场景命名（药品/处方/患者）

---

## 文章规划总览

| 编号 | 标题 | 核心主题 | 状态 |
|------|------|----------|------|
| 01 | Vue 2 构建与初始化：三个构建版本 + new Vue() 的完整 _init 链路 | 源码入口 + 初始化 | ⬜ 待写 |
| 02 | Vue 2 响应式原理与手写实现：Observer、Dep、Watcher 三件套 | 响应式系统 + $nextTick | ⬜ 待写 |
| 03 | Vue 2 虚拟 DOM 与 Diff 算法：VNode、patch、双端四指针 | 渲染原理 | ⬜ 待写 |
| 04 | Vue 2 组件渲染原理：实例化、生命周期、组件通信全链路 | 组件系统 | ⬜ 待写 |
| 05 | Vue 2 模板编译原理：parse → optimize → generate 三步拆解 | 编译器 | ⬜ 待写 |
| 06 | Vue 2 插槽原理：普通 / 具名 / 作用域插槽编译产物全对比 | 插槽机制 | ⬜ 待写 |
| 07 | Vue 2 事件绑定原理：$on/$emit/$off + DOM 事件与 .native 修饰符 | 事件系统 | ⬜ 待写 |
| 08 | Vue 2 内置组件与核心 API 原理：keep-alive、transition、mixin、$set | 内置能力 | ⬜ 待写 |
| 09 | Vue Router 原理与手写实现：Hash/History、导航守卫、动态路由 | 前端路由 | ⬜ 待写 |
| 10 | Vuex 原理与手写实现：状态管理为什么要这样设计 | 状态管理 | ⬜ 待写 |
| 11 | Vue 2 SSR 原理与实战：从 renderToString 到 Nuxt.js 生产部署 | 服务端渲染 | ⬜ 待写 |
| 12 | Vue 2 性能优化全攻略：从组件设计到打包，3s 白屏到 800ms 首屏 | 性能 | ⬜ 待写 |
| 13 | Vue 2 单元测试实战：Vue Test Utils + Jest 的组件测试策略 | 测试 | ⬜ 待写 |
| 14 | Webpack + Vue 2 通用工程模板：从零搭建生产级脚手架 | 工程化 | ⬜ 待写 |

---

## 各篇详细大纲

### 第 01 篇：Vue 2 构建与初始化

**副标题**：三个构建版本怎么选？new Vue() 之后 Vue 内部究竟做了什么？

#### 一、基本使用
- 三个构建版本的使用差异：`vue.runtime.js`（无编译器）/ `vue.js`（含编译器）/ `vue.esm.js`（ES Module）
- `vue-cli` / `vite` 默认使用哪个版本？为什么生产构建排除编译器能省 ~30KB
- `new Vue({ el, data, methods, mounted })` 的最小示例
- `Vue.config` 全局配置：`productionTip / silent / errorHandler / warnHandler`

#### 二、原理
- 构建产物目录：`dist/` 下各文件的命名规律（`runtime` / `common` / `esm` / `min`）
- 构建入口文件路径：`src/platforms/web/entry-runtime-with-compiler.js` → `entry-runtime.js` → `src/core/index.js` → `src/core/instance/index.js`
- Vue 构造函数：`function Vue(options) { this._init(options) }`，5 个 `xxxMixin` 挂载原型方法
  - `initMixin`：挂载 `_init`
  - `stateMixin`：挂载 `$data / $props / $set / $delete / $watch`
  - `eventsMixin`：挂载 `$on / $off / $once / $emit`
  - `lifecycleMixin`：挂载 `_update / $forceUpdate / $destroy`
  - `renderMixin`：挂载 `_render / $nextTick`
- `initGlobalAPI(Vue)`：挂载全局静态 API `Vue.use / Vue.mixin / Vue.extend / Vue.component / Vue.directive / Vue.filter / Vue.observable / Vue.set / Vue.delete / Vue.nextTick`
- `_init` 完整初始化序列（按源码顺序）：
  1. `vm._uid` 自增，`vm._isVue = true`，合并 options（`mergeOptions`）
  2. `initLifecycle`：建立父子关系，初始化 `$parent / $root / $children / $refs / _watcher / _inactive / _isMounted` 等
  3. `initEvents`：初始化 `vm._events`，将父组件的事件监听器同步到子组件
  4. `initRender`：绑定 `vm._c`（模板编译用）和 `vm.$createElement`（手写 render 用）；响应式化 `$attrs / $listeners`
  5. `callHook(vm, 'beforeCreate')`
  6. `initInjections`：解析 inject（先于 initState，让 inject 数据可在 data/computed 中使用）
  7. `initState`：按顺序初始化 `props → methods → data → computed → watch`
  8. `initProvide`：初始化 provide（后于 initState，provide 可引用 data/computed）
  9. `callHook(vm, 'created')`
  10. 如有 `el` 选项，自动调用 `vm.$mount(el)`
- `initState` 内部顺序的意义：props 最先（子组件依赖父传值）→ methods 次之（data 函数中可调用 methods）→ data（响应式化）→ computed（依赖 data/props）→ watch（依赖 computed/data）
- `mergeOptions` 策略：生命周期数组合并、data 递归合并、methods/computed/components 后者覆盖前者

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. `Vue` 构造函数：`src/core/instance/index.js` 5 个 xxxMixin 的挂载方式
2. `_init` 骨架：`src/core/instance/init.js` 完整初始化序列
3. `initLifecycle`：`src/core/instance/lifecycle.js` 建立 `$parent / $children` 关系
4. `initState`：`src/core/instance/state.js` props 规范化 + data 响应式化
5. `callHook`：合并后的钩子数组遍历执行
6. `$mount`：`src/platforms/web/runtime/index.js` mountComponent 触发 beforeMount / mounted

#### 四、生产级最佳实践
- 选择 `runtime-only` 版本（配合 `vue-loader` 构建时编译），减少 bundle 体积
- `Vue.config.errorHandler` 统一捕获组件内部错误，对接 Sentry / 监控平台
- `Vue.config.warnHandler` 在测试环境将警告转为异常，提前暴露问题
- `initInjections` 先于 `initState` 的实际意义：`inject` 的值可以在 `data()` 函数中作为初始值使用（医疗场景：全局患者 ID 注入到组件 data 作为请求参数）
- `Vue.observable` 轻量全局状态（Vue 2.6+）：底层调用 `observe()`，适合替代简单 Vuex 场景

#### 五、手写实现（可独立跑通）
医疗场景：Rollup + Babel 搭建 UMD 环境，实现 Vue 构造函数 + _init + initState + callHook + 最简 $mount；诊断模块展示 provide/inject 数据传递与各阶段钩子执行顺序

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://github.com/vuejs/vue/blob/dev/src/core/instance/index.js
- https://v2.vuejs.org/v2/guide/installation.html#Explanation-of-Different-Builds

**面试核心问**：
- Vue 2 有哪几个构建版本？runtime-only 和 runtime+compiler 的区别是什么？
- `new Vue()` 之后 `_init` 的执行顺序是什么？`beforeCreate` 和 `created` 之间做了哪些事？
- `initInjections` 为什么在 `initState` 之前执行？
- `initState` 内部 props/methods/data/computed/watch 的初始化顺序是什么？顺序有什么实际意义？
- Vue 构造函数中的 5 个 `xxxMixin` 分别挂载了什么？为什么要拆开而不写在一起？

---

### 第 02 篇：Vue 2 响应式原理与手写实现

**副标题**：数据变了视图为什么会更新？Observer / Dep / Watcher 三件套全链路


#### 一、基本使用
- data 的响应式触发：直接赋值 vs $set / $delete
- computed 的缓存行为与 watch 的 deep/immediate 选项
- 数组变更检测：push/pop/splice 等 7 个方法 vs 索引赋值的陷阱
- 响应式边界：什么情况下数据变了视图不更新？

#### 二、原理
- Object.defineProperty 的 get/set 拦截机制
- Observer：递归劫持整个对象树；`__ob__` 标记的作用（防重复 observe + 数组依赖挂载点）
- 数组 7 个方法重写原因：defineProperty 监听不到长度和索引变化
- Dep（依赖收集器）：每个响应式属性对应一个 Dep 实例；`dep.id` 去重防止同一 Watcher 重复收集
- Watcher 三种类型：render Watcher / computed Watcher（lazy + dirty flag）/ user Watcher（watch）
- 依赖收集完整链路：render → 访问 data → dep.depend() → Dep.target → watcher.addDep()
- 派发更新完整链路：data 赋值 → dep.notify() → watcher.update() → queueWatcher → flushSchedulerQueue
- computed 惰性求值：dirty=true 时重新计算，dirty=false 直接返回缓存值
- $nextTick：flushSchedulerQueue 完成后 → Promise → MutationObserver → setImmediate → setTimeout 降级链

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. Observer 类：`src/core/observer/index.js`（walk / defineReactive / `__ob__` 标记）
2. Dep 依赖收集器：`src/core/observer/dep.js`（id 去重、depend / notify）
3. Watcher 三种类型：`src/core/observer/watcher.js`（lazy dirty 惰性求值）
4. $nextTick 降级链：`src/core/util/next-tick.js`（Promise → MO → setImmediate → setTimeout）
5. 数组 7 方法重写：`src/core/observer/array.js`

#### 四、生产级最佳实践
- $set / $delete 的使用时机与实现原理（数组走 splice，对象走 defineReactive）
- Object.freeze 冻结大型只读数据集（药品目录、ICD 码表）：freeze 后 defineProperty 无法重写
- 深层嵌套对象的响应式性能风险：避免 3 层以上自动递归
- watch 的 immediate + deep 与内存泄漏风险
- computed vs watch 的选型：有返回值用 computed，有副作用用 watch

#### 五、手写实现（可独立跑通）
医疗场景：Rollup + Babel + rollup-plugin-serve 搭建 UMD 环境，手写 Observer / Dep / Watcher 三件套 + $nextTick；患者信息表单实时响应式验证完整代码

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://v2.vuejs.org/v2/guide/reactivity.html

**面试核心问**：
- defineProperty 和 Proxy 的区别？Vue 3 为什么换掉？
- 数组为什么不用 defineProperty 监听下标？
- computed 和 watch 的 Watcher 有什么区别？lazy/dirty 机制是什么？
- `__ob__` 标记在 Vue 2 响应式系统中有什么作用？
- $nextTick 的降级策略是什么？为什么优先用微任务？
- dep.id 去重机制解决了什么问题？

---

### 第 03 篇：Vue 2 虚拟 DOM 与 Diff 算法

**副标题**：为什么 key 不能用 index？双端四指针 Diff 一次讲透

#### 一、基本使用
- Virtual DOM 解决的问题：跨平台 + 减少直接操作 DOM
- render 函数与 h() 函数：createElement 的参数结构
- v-for 的 key 属性：正确用法与常见误区
- functional component：无实例、无响应式的轻量渲染

#### 二、原理
- VNode 数据结构：tag / data / children / key / componentOptions
- createElement：规范化 children → 创建 VNode
- patch 函数：初始化挂载 vs 更新时的差异比较
- `sameVnode` 判断条件：key + tag + isComment + data 是否定义 + input type 五项全满足才复用
- Diff 算法核心：同层比较原则（为什么不跨层）
- 双端四指针算法：oldStart/oldEnd/newStart/newEnd 四个游标的五种命中情况
  1. oldStart vs newStart（头头相同）
  2. oldEnd vs newEnd（尾尾相同）
  3. oldStart vs newEnd（头尾相同，节点右移）
  4. oldEnd vs newStart（尾头相同，节点左移）
  5. 以上均未命中 → 用 key 映射表查找 or 新建
- `patchVnode` 与 `updateChildren` 的递归关系：patchVnode 负责当前节点更新，子节点交给 updateChildren
- key 的作用：建立旧节点 key→index 映射表，O(n) 复用节点
- key 用 index 的问题：列表逆序/删除时 key 不稳定导致错误复用、输入框内容错位

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. VNode 类：`src/core/vdom/vnode.js`
2. createElement：`src/core/vdom/create-element.js`（children 规范化）
3. `sameVnode`：`src/core/vdom/patch.js` 判断条件
4. patch / createElm：首次挂载与 patchVnode 更新
5. updateChildren：双端四指针五种命中情况完整实现
6. createKeyToOldIdx：key 映射表 O(n) 复用

#### 四、生产级最佳实践
- key 的最佳实践：用数据 ID，不用 index，不用随机数
- functional component 适用场景：纯展示型叶节点组件
- v-if / v-show 选择依据：销毁重建 vs display 切换的性能对比
- 大列表渲染：结合虚拟列表，Diff 的瓶颈在节点数量而非算法
- 组件级别 key 强制重建：`<comp :key="version">` 替代手动重置逻辑

#### 五、手写实现（可独立跑通）
医疗场景：Rollup 搭建环境，手写 VNode + patch + updateChildren 双端四指针；处方药品列表增删改时 key 复用完整演示

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://v2.vuejs.org/v2/guide/list.html#Maintaining-State

**面试核心问**：
- `sameVnode` 的判断条件是什么？为什么 key 不同就不复用？
- Vue 2 Diff 算法双端四指针的五种命中情况分别是什么？
- key 不能用 index 的根本原因是什么？举个具体出错场景
- `patchVnode` 和 `updateChildren` 是什么关系？
- 为什么 Virtual DOM 不一定比直接操作 DOM 快？

---

### 第 04 篇：Vue 2 组件渲染原理

**副标题**：从 new Vue() 到 DOM，组件的完整生命旅程

#### 一、基本使用
- 组件注册：全局 Vue.component vs 局部 components 选项
- 组件通信 8 种方式：props/$emit、.sync、v-model、provide/inject、EventBus、$parent/$children/$refs、Vuex
- 生命周期 11 个钩子：每个钩子的执行时机与典型用途
- 父子组件生命周期顺序：created 父先子后，mounted 子先父后
- 异步组件三种写法：工厂函数 / Promise（() => import()）/ 高级异步对象（loading + error + delay）

#### 二、原理
- Vue 构造函数初始化：_init → initLifecycle → initEvents → initRender → initState
- $mount 流程：编译 template → render → _update → patch
- 组件 VNode 的创建：createComponent → Vue.extend 生成 Sub 构造函数（`Sub._Ctor` 缓存）
- 子组件的实例化：new Sub() → child.$mount()
- 组件 patch 流程：invokeCreateHooks → 挂载真实 DOM
- `$parent / $children / $root / $refs` 的建立时机：mountedComponent 阶段注册
- props 的响应式传递原理：父组件 render 时将 props 注入子组件，props 本身是响应式的
- `$emit / v-on` 的事件机制：事件存储在 `vm._events`，$emit 触发对应函数数组
- `$attrs / $listeners`：非 props 属性和事件的透传；`inheritAttrs: false` 阻止自动挂载到根元素
- 异步组件渲染机制：首次渲染 loading 占位，加载完成后 forceRender 触发重渲染

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. Vue.extend：`src/core/global-api/extend.js`（Sub 构造函数 + `_Ctor` 缓存）
2. createComponent：`src/core/vdom/create-component.js`
3. $mount 流程：`src/platforms/web/runtime/index.js` → mountComponent
4. mergeOptions 策略：`src/core/util/options.js`（props/inject/directives 规范化）
5. updateChildComponent：props 响应式传递
6. 异步组件 forceRender：`src/core/vdom/helpers/resolve-async-component.js`

#### 四、生产级最佳实践
- provide/inject 实现跨层通信（医疗场景：全局患者上下文注入）；用响应式对象保持响应性
- EventBus 内存泄漏：beforeDestroy 中必须 $off；推荐用 `$once + hook:beforeDestroy` 自动清理
- `$attrs / $listeners` 封装二次组件（如 MyInput 透传所有原生属性到 input 标签）
- 异步组件 + Webpack Code Splitting 实现路由级懒加载
- `$refs` 的使用边界：不要用于响应式数据流，只用于直接 DOM/组件方法调用

#### 五、手写实现（可独立跑通）
医疗场景：Rollup 搭建环境，手写 Vue 构造函数 + $mount + mountComponent + mergeOptions + 父子组件 props 传递 + 异步组件 forceRender；诊断表单组件树父子数据流演示

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://v2.vuejs.org/v2/guide/components.html

**面试核心问**：
- Vue 父子组件的生命周期执行顺序是什么？keep-alive 场景下有何不同？
- $emit 的事件是如何传递到父组件的？存在哪里？
- provide/inject 是响应式的吗？怎么让它保持响应式？
- $attrs 和 $listeners 有什么用？inheritAttrs: false 什么时候设置？
- 异步组件的三种写法分别适合什么场景？加载状态如何控制？
- Vue.extend 的作用是什么？命令式弹窗怎么实现？

---

### 第 05 篇：Vue 2 模板编译原理

**副标题**：.vue 文件里的 `<template>` 是怎么变成 render 函数的？

#### 一、基本使用
- render 函数 vs template：何时手写 render 函数
- v-if / v-for / v-model 在 render 函数中的等价写法
- `v-for` 与 `v-if` 同节点优先级：`v-for` 优先级高于 `v-if`（先循环再判断），应用 `<template>` 包裹规避
- JSX 在 Vue 2 中的使用：@vue/babel-plugin-transform-vue-jsx
- vm.$createElement：手动创建 VNode

#### 二、原理
- 编译入口：compileToFunctions（运行时编译）vs vue-loader（构建时编译）
- 第一步 parse：正则扫描 HTML 字符串 → 构建 AST
  - 开始标签、结束标签、文本节点的解析逻辑
  - 属性解析：静态属性 / v-bind / v-on / 指令
- 第二步 optimize：遍历 AST，标记纯静态节点（static / staticRoot）；静态节点跳过 Diff
- 第三步 generate：AST → render 函数字符串
  - `_c / _v / _s / _l` 等辅助函数的含义
  - v-if 编译为三元表达式，v-for 编译为 `_l(list, fn)`
  - v-model 编译产物：`<input v-model="val">` → `_c('input', { domProps: { value: val }, on: { input: fn } })`；组件 v-model 走 `model` 选项（prop + event 可自定义）
  - 自定义指令的编译：生成指令描述对象，运行时按 bind→inserted→update→componentUpdated→unbind 序列调用
- `v-for` 与 `v-if` 优先级的 AST 表现：v-for 先处理生成 `_l`，v-if 作为内层条件

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. 编译入口：`src/compiler/index.js` compileToFunctions 入口
2. parse 阶段：`src/compiler/parser/index.js` 正则扫描 HTML → AST
3. optimize 阶段：`src/compiler/optimizer.js` 标记 static 节点
4. generate 阶段：`src/compiler/codegen/index.js` AST → render 字符串（含 v-if / v-for / v-model）
5. `_c / _v / _s / _l` 辅助函数：`src/core/instance/render-helpers/index.js`

#### 四、生产级最佳实践
- 构建时编译 vs 运行时编译的体积差（约 30KB）：生产环境只用 runtime 版本
- v-pre 指令：跳过编译，提升静态内容渲染性能
- template vs render 的选择：template 可读性好，render 灵活性高（动态组件、条件渲染多分支场景）
- v-for + v-if 同节点反模式：改用 computed 过滤数据源，避免每次渲染都重算

#### 五、手写实现（可独立跑通）
医疗场景：Rollup 搭建环境，~170 行手写 parse + optimize + generate；药品说明书动态模板编译产物可视化

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://v2.vuejs.org/v2/guide/render-function.html

**面试核心问**：
- 模板编译的三个阶段分别做了什么？
- v-model 的编译产物是什么？组件上的 v-model 和原生元素有何不同？
- v-for 和 v-if 同时用在一个元素上，优先级是怎样的？为什么不推荐？
- Vue 2 的静态节点优化是怎么实现的？optimize 阶段做了什么？
- 自定义指令的五个钩子分别在什么时机执行？

---

### 第 06 篇：Vue 2 插槽原理

**副标题**：普通插槽、具名插槽、作用域插槽编译产物全对比，彻底搞清楚父子作用域

#### 一、基本使用
- 默认插槽：`<slot>` 占位 + 父组件传入内容
- 具名插槽：`<slot name="header">` + `v-slot:header`（2.6+ 语法）vs 旧版 `slot="header"`
- 作用域插槽：子组件通过 `<slot :data="item">` 向上暴露数据，父组件通过 `v-slot="{ data }"` 接收
- 插槽默认内容：`<slot>默认文字</slot>`，父组件未传时显示
- `$slots` vs `$scopedSlots`：两者的区别与统一（Vue 2.6 后 `$slots` 也暴露在 `$scopedSlots` 中）

#### 二、原理
- 普通插槽的编译产物：父组件 render 时直接生成插槽内容的 VNode，通过 `vm.$slots.default` 传给子组件；编译时机在**父组件**
- 具名插槽编译产物：`vm.$slots.header`，父组件编译时确定内容，子组件直接渲染
- 作用域插槽编译产物：父组件生成**插槽函数**（`{ default: function(slotData) { return VNode } }`），存入 `vm.$scopedSlots`；子组件 render 时调用该函数并传入数据，编译时机在**子组件**（因此能拿到子组件数据）
- 普通插槽 vs 作用域插槽的本质区别：**渲染时机不同**——普通插槽在父作用域渲染，作用域插槽在子作用域渲染
- Vue 2.6 统一：`normalSlots` 被包装为函数统一进 `$scopedSlots`，减少两套 API 的心智负担
- 动态插槽名：`v-slot:[dynamicSlotName]`，编译为变量取值
- 作用域插槽与 `keep-alive` 的交互：`keep-alive` 通过 `$slots.default[0]` 取第一个子组件 VNode

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. 普通插槽编译产物：`src/compiler/codegen/index.js` genSlot
2. 作用域插槽编译产物：`src/compiler/codegen/index.js` genScopedSlot
3. renderSlot：`src/core/instance/render-helpers/render-slot.js`
4. normalizeScopedSlots：`src/core/vdom/helpers/normalize-scoped-slots.js`（Vue 2.6 统一逻辑）
5. keep-alive 取插槽 VNode：`src/core/components/keep-alive.js`

#### 四、生产级最佳实践
- 优先使用 `v-slot` 语法（Vue 2.6+），废弃 `slot` / `slot-scope` 属性写法
- 作用域插槽实现「renderless 组件」（无渲染组件）：逻辑全在子组件，UI 全由父组件通过作用域插槽控制（医疗场景：`<DataProvider>` 组件提供数据，UI 由业务方定制）
- `$scopedSlots.default` 存在性检测：避免父组件未传插槽时报错
- 插槽内容的响应式：作用域插槽函数在子组件 render 时执行，可响应子组件状态变化；普通插槽在父组件 render 时执行，响应父组件状态

#### 五、手写实现（可独立跑通）
医疗场景：Rollup 搭建环境，手写普通插槽 + 具名插槽 + 作用域插槽三套编译产物；`<DrugList>` 组件通过作用域插槽将每条数据暴露给父组件自定义渲染

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://v2.vuejs.org/v2/guide/components-slots.html

**面试核心问**：
- 普通插槽和作用域插槽的编译产物有什么区别？渲染时机为什么不同？
- `$slots` 和 `$scopedSlots` 的区别是什么？Vue 2.6 做了什么统一？
- 作用域插槽为什么能拿到子组件的数据？父子作用域是怎么隔离的？
- renderless 组件的设计思路是什么？作用域插槽在其中扮演什么角色？
- `keep-alive` 是如何通过插槽获取第一个子组件 VNode 的？

---

### 第 07 篇：Vue 2 事件绑定原理

**副标题**：$on/$emit 存在哪里？DOM 事件和组件事件有什么本质区别？

#### 一、基本使用
- 组件事件：`$emit('event', payload)` + `v-on:event="handler"` / `@event="handler"`
- `$on / $off / $once`：手动监听、移除、单次监听
- 原生 DOM 事件：`@click.native`（监听组件根元素原生事件）
- 事件修饰符：`.stop / .prevent / .capture / .self / .once / .passive`
- 按键修饰符：`@keyup.enter / @keyup.13`
- `$listeners`：父组件绑定的所有事件监听器对象，可透传给子组件

#### 二、原理
- 自定义事件存储结构：`vm._events = Object.create(null)`，key 为事件名，value 为处理函数数组
- `$on(event, fn)`：向 `vm._events[event]` 数组 push fn；支持数组事件名（批量注册）
- `$emit(event, ...args)`：取 `vm._events[event]` 数组，遍历调用每个 fn；fn 执行时 this 指向当前 vm
- `$off(event, fn)`：无参数清空所有；只传 event 清空该事件；同时传 fn 精确移除（splice）
- `$once(event, fn)`：包装为 `on` 函数（内部先 `$off` 再调用 fn），注册后自动注销
- 组件事件 vs DOM 事件的本质区别：
  - 组件事件：存在 `vm._events`，通过 `$emit` 触发，纯 JS 调用，不冒泡
  - DOM 原生事件：通过 `addEventListener` 绑定到真实 DOM，走浏览器事件系统，会冒泡
- `.native` 修饰符原理：编译为 `{ nativeOn: { click: fn } }`；在 `createComponent` 阶段通过 `componentVNodeHooks` 将 nativeOn 绑定到组件根元素的真实 DOM 上
- `v-on` 在原生 HTML 元素上的编译产物：`{ on: { click: fn } }`，patch 时调用 `updateDOMListeners` → `addEventListener`
- 事件修饰符的编译实现：`.stop` → `$event.stopPropagation()`，`.prevent` → `$event.preventDefault()`，`.once` → 使用 `{ once: true }` 选项或包装函数，`.passive` → `addEventListener` 第三个参数 `{ passive: true }`
- `$listeners` 的实现：在 `initRender` 中将父组件传入的事件监听器对象响应式化，挂载到 `vm.$listeners`

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. `$on / $emit / $off / $once`：`src/core/instance/events.js`
2. DOM 事件绑定：`src/platforms/web/runtime/modules/events.js` updateDOMListeners
3. `.native` 处理：`src/core/vdom/create-component.js` componentVNodeHooks.init
4. 事件修饰符编译：`src/compiler/codegen/events.js` genHandler

#### 四、生产级最佳实践
- `$once + hook:beforeDestroy` 自动清理事件监听器，替代在 `beforeDestroy` 中手写 `$off`
  ```js
  mounted() {
    this.$on('hook:beforeDestroy', () => { this.$off('myEvent') })
  }
  ```
- EventBus 内存泄漏防范：组件销毁时必须 `$off`；推荐使用 `$once + hook:beforeDestroy` 自动清理
- `.passive` 修饰符用于滚动事件性能优化：告知浏览器不会调用 `preventDefault`，无需等待 JS 执行（医疗场景：长处方列表的触摸滚动）
- 组件封装时透传 `$listeners`：用 `v-on="$listeners"` + `inheritAttrs: false` 实现完整的事件透传

#### 五、手写实现（可独立跑通）
医疗场景：Rollup 搭建环境，手写 `$on / $emit / $off / $once` + updateDOMListeners；处方审核组件 `$emit` 通知父组件结果、`.native` 绑定表单提交、`$listeners` 透传至输入组件

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://v2.vuejs.org/v2/guide/components-custom-events.html

**面试核心问**：
- `$emit` 触发的事件存在哪里？和 DOM 的 addEventListener 有什么本质区别？
- `.native` 修饰符的原理是什么？它是如何绑定到组件根元素 DOM 的？
- `$once` 是怎么实现「只触发一次后自动移除」的？
- `$listeners` 是什么？如何用它实现完整的事件透传？
- 事件修饰符 `.stop / .prevent / .passive` 分别是如何编译实现的？

---

### 第 08 篇：Vue 2 内置组件与核心 API 原理

**副标题**：keep-alive 怎么缓存组件？mixin 合并策略是什么？

#### 一、基本使用
- keep-alive：include / exclude / max 的使用
- transition：enter/leave 钩子与 CSS 类名序列
- Vue.mixin：全局混入 vs 局部混入
- Vue.use：插件安装机制
- Vue.extend：动态创建组件构造函数（命令式弹窗场景）
- Vue.observable：Vue 2.6 新增的轻量响应式对象（替代简单 Vuex 场景）
- $set / $delete：触发响应式更新的 API
- $attrs / $listeners：非 props 属性和事件的透传（inheritAttrs: false 配合使用）
- errorCaptured：组件树错误捕获钩子

#### 二、原理
- keep-alive 缓存策略：LRU（最近最少使用）
  - 用 Map + Set 维护缓存 key 顺序，超过 max 时淘汰最久未访问的 key
  - activated / deactivated 钩子的触发时机；与 beforeDestroy 的区别
- transition 动画钩子执行序列：
  - enter：before-enter → enter → after-enter / enter-cancelled
  - leave：before-leave → leave → after-leave / leave-cancelled
  - CSS transition / animation 与 JS 钩子的协同机制
- scoped-slot 编译产物：父组件生成插槽函数，子组件 `$scopedSlots.default()` 调用；与普通 slot 编译产物的差异
- Vue.mixin 的合并策略（mergeOptions）：
  - 生命周期：数组合并，mixin 先于组件执行
  - data：递归合并，组件 data 优先
  - methods / computed / components：组件选项覆盖 mixin
- Vue.use 的 install 机制：调用 plugin.install(Vue) + 防重复注册（installedPlugins 数组）
- Vue.extend：创建 Sub 构造函数，缓存在 `Sub._Ctor`，避免重复创建；命令式弹窗的核心
- Vue.observable：对对象调用 `observe()`，返回响应式对象，可作轻量全局状态
- $set：对数组调用 splice，对对象调用 defineReactive + dep.notify
- errorCaptured → Vue.config.errorHandler：错误从子组件向上冒泡，可在任意祖先捕获

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. keep-alive LRU：`src/core/components/keep-alive.js`（Map + keys 数组维护顺序）
2. mergeOptions 策略：`src/core/util/options.js`（strats 策略对象）
3. Vue.use：`src/core/global-api/use.js`（installedPlugins 防重复）
4. Vue.extend：`src/core/global-api/extend.js`（Sub + `_Ctor` 缓存）
5. $set / $delete：`src/core/observer/index.js`（splice / defineReactive 两条路径）

#### 四、生产级最佳实践
- keep-alive + 路由缓存：include 动态白名单控制（医疗场景：问诊页面缓存）
- mixin 的命名冲突风险与替代方案（HOC / 插件；Vue 3 改用 Composable）
- transition 性能优化：transform + will-change，避免触发 layout
- Vue.extend 实现命令式弹窗：`new Ctor().$mount()` + `document.body.appendChild`
- `$once + hook:beforeDestroy` 优雅自清理模式，替代 beforeDestroy 中手写 $off
- Vue.observable 轻量全局状态：适合无需 Vuex 的小型跨组件状态共享

#### 五、手写实现（可独立跑通）
医疗场景：Rollup 搭建环境，手写 keep-alive LRU + mergeOptions + Vue.use + Vue.extend + $set/$delete；科室切换 keep-alive 缓存 + 命令式确认弹窗完整代码

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://v2.vuejs.org/v2/api/#keep-alive
- https://v2.vuejs.org/v2/guide/mixins.html

**面试核心问**：
- keep-alive 的 LRU 缓存是怎么实现的？max 触发时调用哪个生命周期？
- mixin 的合并策略是什么？同名生命周期谁先执行？
- scoped-slot 和普通 slot 的编译产物有什么区别？
- Vue.extend 的使用场景是什么？命令式弹窗怎么实现？
- `$once + hook:beforeDestroy` 模式解决了什么问题？
- Vue.observable 和 Vuex 什么时候选哪个？

---

### 第 09 篇：Vue Router 原理与手写实现

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
（链接占位，写作时填入）

#### 七、参考
- https://router.vuejs.org/zh/

**面试核心问**：
- Hash 和 History 模式各自的优缺点？History 模式为什么需要服务端配合？
- 导航守卫的完整执行顺序是什么？beforeRouteEnter 里能拿到 this 吗？
- router-view 是怎么知道渲染哪个组件的？响应式原理是什么？
- 路由懒加载的实现原理是什么？和 Webpack Code Splitting 的关系？
- 嵌套路由中多个 router-view 是如何递归渲染的？

---

### 第 10 篇：Vuex 原理与手写实现

**副标题**：mutation 为什么必须同步？Vuex 的设计哲学

#### 一、基本使用
- 五个核心概念：State / Getter / Mutation / Action / Module
- mapState / mapGetters / mapMutations / mapActions 辅助函数
- 模块化 namespaced：命名空间隔离；跨模块访问 rootState / rootGetters
- 严格模式：防止 state 被直接修改

#### 二、原理
- Vuex 如何借用 Vue 实例实现数据响应：`new Vue({ data: { $$state: state } })`
- getters 缓存机制：挂载到 `store._vm` 的 computed 属性，依赖不变不重算
- mutation 必须同步：devtools 时间旅行依赖同步状态快照，异步会导致快照不准
- action 的本质：异步操作 + commit mutation，返回 Promise
- install：Vue.mixin beforeCreate 注入 $store，子组件从父组件继承
- modules 命名空间：路径拼接（`moduleName/actionName`）+ installModule 递归注册
- mapState / mapGetters 实现：遍历 keys，生成 computed 函数对象
- 插件机制：subscribe / subscribeAction 订阅 mutation/action
- 严格模式实现：`store._vm.$watch('$$state', handler, { deep: true, sync: true })`，在非 mutation 中修改 state 会报错

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. Store install：`src/store.js`（Vue.mixin beforeCreate 注入 $store）
2. state 响应式化：`src/store.js`（`new Vue({ data: { $$state } })` + resetStoreVM）
3. getters computed 化：`src/store.js` makeLocalGetters
4. commit / dispatch：`src/store.js`（mutation 同步 + action Promise）
5. ModuleCollection + installModule：`src/module/module-collection.js`（命名空间路径拼接）

#### 四、生产级最佳实践
- 什么时候不应该用 Vuex：组件局部状态 vs 跨组件共享状态的边界
- vuex-persistedstate 持久化原理（subscribe + storage）与使用
- 大型项目模块化拆分规范：按业务域分模块（医疗：user/drug/prescription）
- 与 Pinia 的对比：为什么 Vue 3 中更推荐 Pinia（无 mutation、TS 更友好）

#### 五、手写实现（可独立跑通）
医疗场景：Rollup 搭建环境，手写 Store + commit/dispatch + Vue.mixin install + ModuleCollection + installModule + 持久化插件；药品库存全局状态管理含模块化 + 持久化完整代码

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://vuex.vuejs.org/zh/

**面试核心问**：
- mutation 为什么必须是同步函数？异步会有什么问题？
- Vuex 的响应式是怎么实现的？getters 的缓存机制是什么？
- action 和 mutation 的本质区别？什么情况下必须用 action？
- modules 命名空间的路径是怎么拼接的？怎么跨模块调用 action？
- mapState / mapGetters 的实现原理是什么？

---

### 第 11 篇：Vue 2 SSR 原理与实战

**副标题**：医疗门户 SEO 要求必须 SSR，服务端渲染究竟做了什么？

#### 一、基本使用
- 为什么需要 SSR：SEO + 首屏性能
- Nuxt.js 快速上手：约定式路由 / asyncData / fetch
- pages / layouts / components 目录约定
- 静态生成（SSG）vs 服务端渲染（SSR）的选择
- Nuxt.js 与手写 SSR 的核心差异：Nuxt 封装了 webpack 双端配置、路由生成、数据预取

#### 二、原理
- Vue SSR 双端入口设计：entry-client.js + entry-server.js
- createRenderer + renderToString：服务端将组件渲染为 HTML 字符串
- 客户端激活（Hydration）：`data-server-rendered="true"` 标记 + DOM 复用条件（结构必须匹配）
- 数据预取：asyncData 在服务端执行，状态序列化注入 `window.__NUXT__`，客户端直接读取
- 服务端全局状态污染问题：为什么 data / store / router 必须是工厂函数（每次请求独立实例）
- SSR 中不执行的生命周期：beforeMount / mounted / beforeUpdate / updated / beforeDestroy / destroyed 均不在服务端运行
- 浏览器 API 不可用：window / document / localStorage 在服务端不存在，需要 `process.client` 判断
- bundle renderer 与缓存：页面级缓存（LRU-cache）+ 组件级缓存（serverCacheKey）

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. createRenderer：`vue-server-renderer/src/create-renderer.js`
2. renderToString：组件树递归渲染为 HTML 字符串
3. Hydration 入口：`src/platforms/web/runtime/patch.js` hydrate 函数
4. 工厂函数模式：entry-server.js createApp / createStore / createRouter
5. asyncData 数据预取 + window.__NUXT__ 序列化注水

#### 四、生产级最佳实践
- 服务端缓存策略：页面级 LRU 缓存 + 组件级 serverCacheKey
- 浏览器 API 兼容：`process.client` 判断 + 在 mounted 中访问 window
- PM2 进程管理 + Nginx 反向代理 + 健康检查
- Hydration 失败排查：客户端/服务端渲染结构不一致的常见原因

#### 五、手写实现（可独立跑通）
医疗场景：Node.js + Express + vue-server-renderer 搭建双端环境，手写 renderToString + Hydration + asyncData 注水；药品信息门户 SSR + SEO meta 优化完整代码

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://nuxtjs.org/docs/get-started/
- https://ssr.vuejs.org/zh/

**面试核心问**：
- SSR 和 CSR 的渲染流程有何不同？各自适用场景？
- Hydration 失败会发生什么？常见原因和排查思路？
- 为什么 SSR 中 data / store / router 必须是工厂函数？
- SSR 中哪些生命周期不会执行？window/document 怎么处理？
- asyncData 和 fetch 的区别？数据是怎么从服务端传到客户端的？

---

### 第 12 篇：Vue 2 性能优化全攻略

**副标题**：10 个优化手段，从 3s 白屏到 800ms 首屏的真实案例

#### 一、基本使用
- Vue Devtools 性能面板使用
- Chrome Performance + Memory 面板基础操作
- Lighthouse 跑分与指标含义（FCP / LCP / TTI / TBT）

#### 二、原理
- 组件渲染流程中的性能瓶颈点：依赖收集（Observer 递归）、Diff（节点数量）、patch（DOM 操作）
- v-if vs v-show：DOM 销毁重建 vs display 切换的本质；频繁切换用 v-show，条件稳定用 v-if
- computed 缓存原理：dirty flag 机制，依赖不变不重新计算
- 函数式组件：无实例 + 无响应式 = 跳过 initState，渲染更快
- keep-alive LRU 缓存淘汰策略；activated / deactivated 替代 created / destroyed
- 事件监听销毁：beforeDestroy 中清理定时器 / $off EventBus / WebSocket.close()；`$once + hook:beforeDestroy` 自动清理模式

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. Observer.walk 中 `Object.isFrozen` 判断：`src/core/observer/index.js`
2. functional component 跳过 initState：`src/core/vdom/create-functional-component.js`
3. keep-alive activated/deactivated 触发：`src/core/vdom/patch.js` invokeInsertHook
4. flushSchedulerQueue 批量更新：`src/core/observer/scheduler.js`

#### 四、生产级最佳实践
- 路由懒加载 + 组件异步加载（import()）：首屏只加载当前路由 chunk
- externals + CDN 引入第三方库（Element UI / ECharts）：减少 bundle 体积
- gzip / Brotli 压缩配置（compression-webpack-plugin）
- 图片懒加载 + WebP 格式 + 响应式图片
- 内存泄漏排查三板斧：Chrome Memory 快照对比 / Vue Devtools 组件树 / 定时器 ID 追踪
- 医疗场景实战：药品目录 10000 条数据渲染优化全程（虚拟列表 + Object.freeze + 分页）

#### 五、手写实现（可独立跑通）
医疗场景：Rollup 搭建环境，手写虚拟列表核心（~100 行）+ Object.freeze 示例 + v-debounce/v-throttle 自定义指令 + 图片懒加载指令；药品目录 10000 条数据渲染优化完整代码

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://v2.vuejs.org/v2/guide/components-edge-cases.html

**面试核心问**：
- 虚拟列表的核心原理是什么？如何计算可视区范围？
- keep-alive 的缓存策略是什么？max 参数触发哪个生命周期？
- Object.freeze 冻结的数据为什么不是响应式的？Observer 在哪里判断？
- Vue 2 内存泄漏的常见原因有哪些？如何排查和防范？
- 函数式组件为什么渲染性能更好？适用于哪些场景？

---

### 第 13 篇：Vue 2 单元测试实战

**副标题**：组件测试不是 snapshot，是「用户行为驱动」的测试

#### 一、基本使用
- Jest 基础：describe / it / expect / beforeEach / afterEach
- Vue Test Utils 核心 API：mount / shallowMount / wrapper
- 模拟用户操作：trigger('click') / setValue / wrapper.find / wrapper.findComponent
- 异步测试：await nextTick / flushPromises / jest.useFakeTimers
- 快照测试：toMatchSnapshot 的使用与更新

#### 二、原理
- 为什么 Vue 项目单测覆盖率普遍低：难 mock / 难隔离 / 难断言
- shallowMount vs mount：子组件 stub 的意义；何时用 shallowMount（隔离子组件）/ 何时用 mount（集成测试）
- JSDOM：Node.js 环境模拟浏览器 DOM 的原理；与真实浏览器的差异
- 快照测试的本质：序列化 VNode 树做字符串对比；适合纯展示组件，不适合频繁变化的交互组件
- `wrapper.vm.$nextTick`：DOM 更新后再断言的必要性
- `flushPromises`：清空所有 pending 的 Promise（含异步组件加载）

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. Jest + @vue/test-utils 环境搭建：jest.config.js transform / moduleNameMapper / testEnvironment
2. shallowMount stub 原理：@vue/test-utils src/create-instance.js
3. wrapper.trigger 事件模拟：@vue/test-utils src/wrapper.js
4. axios-mock-adapter 网络请求 mock
5. createLocalVue + Vuex store mock 隔离测试

#### 四、生产级最佳实践
- 测什么：用户行为（点击/输入/提交）+ 状态变化 + 边界条件 + 错误状态
- 不测什么：实现细节 / 第三方库内部 / 纯 UI 样式 / 框架本身行为
- 快照测试的适用场景（稳定的纯展示组件）与滥用风险（频繁 snapshot 更新失去意义）
- CI 接入：Jest coverage + GitHub Actions 门禁（coverage 低于阈值 fail）
- 测试 mixin：createLocalVue + mixin 注入后验证行为
- 医疗场景实战：处方单组件的完整测试套件（提交 / 验证 / 加载状态 / 错误处理）

#### 五、手写实现（可独立跑通）
医疗场景：从零搭建 Jest + @vue/test-utils 测试环境，手写处方提交组件完整测试套件（含 Vuex mock + axios mock + 覆盖率配置）

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://vue-test-utils.vuejs.org/zh/

**面试核心问**：
- mount 和 shallowMount 的区别？什么时候选哪个？
- 如何测试 Vuex action 触发后的组件状态变化？
- 快照测试的优缺点？什么场景下不适合用快照？
- 异步操作（如 API 请求）在测试中怎么处理？flushPromises 和 nextTick 的区别？

---

### 第 14 篇：Webpack + Vue 2 通用工程模板

**副标题**：从零搭建生产级 Vue 2 脚手架，彻底理解 vue-cli 背后做了什么

#### 一、基本使用
- Webpack 5 核心概念：entry / output / loader / plugin / mode
- vue-loader：.vue 单文件组件解析原理
- 常用 loader：babel-loader / css-loader / style-loader / file-loader / url-loader
- 常用 plugin：HtmlWebpackPlugin / MiniCssExtractPlugin / DefinePlugin / CopyWebpackPlugin
- 环境变量：`.env` / `.env.development` / `.env.production` 文件 + DefinePlugin 注入

#### 二、原理
- Webpack 构建流程：初始化（读配置）→ 编译（make: 从 entry 出发，递归构建模块依赖图）→ 输出（seal: 生成 chunk → emit: 写文件）
- Tapable 事件系统：SyncHook / AsyncSeriesHook，plugin 本质是注册钩子
- HMR 热更新原理：webpack-dev-server 与浏览器建立 WebSocket 连接，模块更新后推送 hash，浏览器请求新模块并调用 module.hot.accept
- Tree Shaking：ES Module 静态分析 + package.json sideEffects 标记；CommonJS 动态 require 无法静态分析
- Code Splitting：SplitChunksPlugin 分包策略（chunks: 'all'）+ 动态 import() 异步 chunk
- vue-loader 工作原理：将 .vue 拆分为 template / script / style 三个虚拟模块，分别走对应 loader
- `vue.config.js` vs 手写 webpack：chainWebpack（精细链式修改）vs configureWebpack（合并覆盖）

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. Webpack 构建流程：Tapable 钩子注册（SyncHook / AsyncSeriesHook）
2. vue-loader 拆分 .vue：template / script / style 三个虚拟模块
3. HMR 原理：webpack-dev-server WebSocket 推送 hash → browser 拉取新模块 → module.hot.accept
4. Tree Shaking：ES Module 静态分析 + package.json sideEffects 标记
5. SplitChunksPlugin 分包策略：chunks: 'all' + 动态 import() 异步 chunk

#### 四、生产级最佳实践
- 开发/测试/生产三套配置分离（webpack-merge）
- 构建速度优化：cache-loader / thread-loader（happypack 替代方案）/ DllPlugin
- 包体积分析：webpack-bundle-analyzer，找出异常大的依赖
- 路由懒加载与 chunk 命名（webpackChunkName magic comment）
- CDN 资源处理：externals 排除 + publicPath 配置
- 医疗场景实战：医院管理系统 Vue 2 工程模板完整配置（含 Nginx 部署配置）

#### 五、手写实现（可独立跑通）
医疗场景：从零搭建 Webpack 5 + Vue 2 工程模板，含 vue-loader + babel-loader + CSS 方案 + HtmlWebpackPlugin + webpack-dev-server + 环境变量 + 生产优化；可直接 clone 使用的完整配置

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://webpack.js.org/
- https://vue-loader.vuejs.org/zh/

**面试核心问**：
- Webpack 的构建流程是什么？Tapable 在其中的作用？
- HMR 热更新的完整原理？模块替换时发生了什么？
- Tree Shaking 为什么要用 ES Module？CommonJS 为什么不行？
- Code Splitting 有哪些方式？SplitChunksPlugin 的分包策略是什么？
- vue-loader 是怎么处理 .vue 文件的？

---

## 写作规范

- **结构**：严格按七段式（基本使用 → 原理 → 源码解析 → 生产级最佳实践 → 手写实现 → GitHub → 参考）
- **手写实现**：每节均先搭 Rollup/Webpack 环境，代码可独立运行，包含医疗场景完整示例
- **面试模块**：每篇 3-5 个「面试官会问」
- **医疗命名**：所有示例用药品/处方/患者命名
- **禁止**：出现具体公司名、博主名/账号名/人名

---

## 输出目录

`docs/articles/05 vue 2/`

文件命名：`YYYY-MM-DD-vue2-{slug}.md`
