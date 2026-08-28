# Vue 3 设计思想与整体架构：Monorepo、Tree-shaking、Composition API 三大革新（面试收藏级）

> 面试官抛出一个看似闲聊的问题：「你们项目为什么要从 Vue2 升级到 Vue3？」你答：「性能更好，支持 Composition API。」面试官笑了笑继续追问：「性能好在哪？Composition API 解决了什么问题，不用会怎样？Vue3 源码为什么要拆成一堆包，`@vue/reactivity` 单独拿出来是给谁用的？」一道「为什么升级」的开场题，背后是 Vue3 从设计思想到工程架构的整体重写逻辑。这篇文章是「Vue3 全家桶深度拆解」系列第 1 篇，从声明式框架的本质讲起，一路拆到 Monorepo 架构、Tree-shaking 实现、渲染器工厂设计、Composition API 动机，最后手写一套可独立运行的 Monorepo 环境。

---

## 🎯 这篇文章解决什么问题

如果你已经很熟悉 Vue2，升级到 Vue3 时容易停留在「API 变了」的表层认知：`data` 变成 `ref`，`methods` 变成普通函数。但面试官真正想考察的，是你有没有理解**Vue3 每一个设计决策背后要解决的具体问题**——为什么要拆包、为什么要做 Tree-shaking、为什么要有 Composition API。读完这篇文章，你会同时获得两种确定感：懂原理（知道 Vue3 架构为什么这样设计）和会讲（面试官怎么问都能拆解回答）。

---

## 🧩 一、声明式框架与虚拟 DOM：Vue3 到底「新」在哪

### 命令式和声明式的区别

早在 jQuery 的时代，编写的代码都是命令式的，命令式框架重要特点就是**关注过程**。声明式框架更加关注**结果**，命令式的代码被封装到了 Vue.js 内部，过程交给 Vue.js 来实现。

声明式代码更加简单，不需要关注实现，按照要求填代码就可以（给上原材料就出结果）：

```javascript
// 命令式
let numbers = [1, 2, 3, 4, 5]
let total = 0
for (let i = 0; i < numbers.length; i++) {
  total += numbers[i] // 关注过程
}
console.log(total)

// 声明式
let total2 = numbers.reduce((memo, current) => {
  return memo + current
}, 0)
console.log(total2)
```

Vue 的模板语法就是声明式思想的体现：你只需要写「状态是什么、视图长什么样」，不需要写「视图怎么从旧状态变到新状态」这一步的具体 DOM 操作代码。

> 💬 **面试官**：什么是声明式框架？Vue 的声明式体现在哪？
>
> ✅ 标准答案：声明式框架关注结果，命令式框架关注过程。Vue 的模板语法就是声明式——开发者只描述「状态 → 视图」的映射关系，不需要手写具体的 DOM 操作步骤，这部分过程被 Vue 内部封装。
>
> 🎁 加分答案：可以对比 jQuery 时代的命令式开发——那时候要手动 `$('.item').text(...)`、手动判断要不要插入或删除节点。声明式框架把这些过程抽象成一层运行时（Runtime），开发者的心智负担从「怎么操作 DOM」降低到「状态是什么」。

### MVC、MVVM、MVP、MVI：Vue3 到底属于哪一种

声明式框架把「状态到视图」的映射关系接管过去之后，一个绕不开的面试题就来了：Vue 是 MVVM 框架吗？要回答清楚，得先分清这几种架构模式各自的数据流向。

**MVC（Model-View-Controller）**：View 接收用户操作后转发给 Controller，Controller 修改 Model，Model 更新后通知 View 重新渲染。View 和 Model 理论上不直接通信，但实际项目里 Controller 经常做成薄薄一层，View 还是会直接读 Model，边界很容易模糊。早期后端 MVC 框架（Spring MVC、Rails）和前端 Backbone 是典型代表。

**MVP（Model-View-Presenter）**：在 MVC 基础上把 Controller 换成 Presenter，View 和 Model 完全隔离，只能通过 Presenter 交互。Presenter 持有 View 的接口引用，手动把 Model 的数据「推」给 View、把 View 的事件「转」给 Model。好处是 View 可以单元测试（因为 Presenter 不依赖具体 DOM），代价是每加一个字段都要手写一遍 Presenter 里的同步代码。

**MVVM（Model-View-ViewModel）**：ViewModel 通过双向数据绑定和 View 自动同步——Model 变了，ViewModel 感知到变化，View 自动更新；View 上的用户输入，也会自动同步回 Model。这一步「自动同步」是 MVVM 和 MVP 最大的区别：MVP 靠手写代码同步，MVVM 靠框架的数据绑定机制自动同步。经典代表是早期的 Knockout.js、Angular，以及 Vue2 的 `Object.defineProperty` 双向绑定。

**MVI（Model-View-Intent）**：强调单向数据流和不可变状态——View 产生 Intent（用户意图，比如点击、输入），Intent 驱动 Model 产生一份新的 State（而不是修改旧 State），View 根据新 State 重新渲染。整个链路是单向的环状循环，没有 MVVM 里「双向」这个概念，状态变化可预测、可追溯。Redux、Flux、Elm 架构都属于这一类，Vuex/Pinia 的 `state → action → mutation → state` 本质上也是单向数据流思想的体现。

**Vue3 属于哪一种**：Vue 官方文档和尤雨溪本人都提到过，Vue **并不严格遵循 MVVM 模型**，只是设计上受到了 MVVM 的启发（inspired by）——因为 Vue 的组件实例大致对应 MVVM 里 ViewModel 的角色。但 Vue 没有严格的 Model/View 分层限制，组件里 `template` 是 View，`data`/`setup` 返回的状态是 Model，框架负责两者之间的自动同步，这一点确实是 MVVM 的核心特征。到了 Composition API 阶段，这种「自动同步」的本质没有变——`ref`/`reactive` 变化依然会自动驱动视图更新——但组织代码的方式从「面向 data/methods/computed 分类」变成了「面向逻辑关注点聚合」，这也是三章后要讲的 Composition API 动机的由来。

> 💬 **面试官**：Vue 是 MVVM 框架吗？说说 MVC、MVVM、MVP、MVI 的区别？
>
> ✅ 标准答案：Vue 官方说法是「受 MVVM 启发但不严格遵循 MVVM」。四种模式的核心区别在数据流向：MVC 靠 Controller 转发、View 和 Model 边界模糊；MVP 靠 Presenter 手动同步 View 和 Model；MVVM 靠框架自动双向绑定同步 View 和 Model；MVI 是单向数据流，View 发出 Intent，驱动生成新的不可变 State，再单向渲染回 View。
>
> 🎁 加分答案：可以点出一个容易被问穿的细节——MVVM 的「双向绑定」在 Vue3 里其实只用在 `v-model` 这个语法糖上，本质还是「数据变化驱动视图更新」的单向响应式系统，`v-model` 是框架帮你把「监听 input 事件 + 更新数据」这两步自动做了，包装出了「双向」的效果。真正意义上的严格单向数据流，是 Vuex/Pinia 那一层——组件不能直接改 state，必须通过 action/mutation，这一点上 Vuex/Pinia 反而更接近 MVI 的思想。

🔧 **真实场景**：医疗系统里挂号页面的「患者信息表单」，用 `v-model="patient.name"` 绑定输入框，本质是 Vue 在背后自动生成了 `:value="patient.name"` + `@input="patient.name = $event.target.value"` 这两件事，让开发者感觉是「双向绑定」。而挂号提交后的全局状态（比如「当前挂号科室」「排队号」）如果放进 Pinia，任何组件想改都必须走 action，这一层就是单向数据流的设计——避免多个组件同时改同一个状态导致排队号错乱、难以追踪是谁改的。

### 采用虚拟 DOM

传统更新页面，需要拼接一个完整的字符串 `innerHTML` 全部重新渲染。添加虚拟 DOM 后，可以比较新旧虚拟节点，找到变化再进行更新。虚拟 DOM 就是一个对象，用来描述真实 DOM 的：

```typescript
const vnode = {
  __v_isVNode: true,
  __v_skip: true,
  type,
  props,
  key: props && normalizeKey(props),
  ref: props && normalizeRef(props),
  scopeId: currentScopeId,
  slotScopeIds: null,
  children,
  component: null,
  suspense: null,
  ssContent: null,
  ssFallback: null,
  dirs: null,
  transition: null,
  el: null,
  anchor: null,
  target: null,
  targetStart: null,
  targetAnchor: null,
  staticCount: 0,
  shapeFlag,
  patchFlag,
  dynamicProps,
  dynamicChildren: null,
  appContext: null,
  ctx: currentRenderingInstance,
} as VNode
```

🔧 **真实场景**：医疗场景里，一个患者列表页面，状态更新（比如某个患者的就诊状态从「待诊」变成「就诊中」）如果直接重新拼 `innerHTML`，整个列表都会被销毁重建，输入框的焦点、滚动位置全部丢失。虚拟 DOM 通过新旧对象比较，只更新那一个患者卡片里变化的文本节点，其他 DOM 节点原地不动。

> 💬 **面试官**：为什么要用虚拟 DOM，它一定比直接操作 DOM 快吗？
>
> ✅ 标准答案：虚拟 DOM 不是为了比原生 DOM 操作更快（构造和比较 vnode 本身也有开销），而是为了在**不知道哪里变化**的情况下，用一套统一、可预测的 diff 机制找出最小变更集，避免全量重渲染，同时让跨平台渲染成为可能。
>
> 🎁 加分答案：手写一个能达到虚拟 DOM 效果的组件（比如只更新一个字段）确实可以比通用 diff 更快，但代价是要为每个组件手写更新逻辑，维护成本极高。虚拟 DOM 用少量运行时开销换来了开发效率和可维护性，这是权衡（tradeoff）而不是单纯的性能技巧。

**前沿延伸：Vapor Mode——如果连虚拟 DOM 这层都不要了呢？**

虚拟 DOM 的代价是"运行时始终要构造 vnode 对象、跑一遍 diff 才能知道哪里变了"——即使编译时已经通过 Patch Flags 告诉了运行时"只有这个属性会变"，运行时依然要走一遍创建 vnode、对比 vnode 的流程，这一层中间表示本身就是开销。Vue 团队目前在 3.6 探索的 **Vapor Mode** 正是冲着这一点：编译阶段直接分析出"哪个 DOM 节点的哪个属性绑定了哪个响应式数据"，生成的不再是"返回 vnode 的渲染函数"，而是"直接操作真实 DOM 的更新函数"——响应式数据变化时，effect 直接调用这个更新函数改 DOM，中间完全不经过 vnode 创建和 diff 这一层。这和 SolidJS 的编译期精确绑定思路是同一个方向。Vapor Mode 目前是与现有 vdom 模式并存的可选编译目标，不是替换，普通的 `<template>` 默认还是走 vdom 编译产物。

> 💬 **面试官**：了解 Vue 最近在探索的新方向吗？
>
> ✅ 标准答案：Vapor Mode，跳过虚拟 DOM 这层中间表示，编译时直接生成操作真实 DOM 的更新函数，响应式数据变化时直接触发 DOM 更新，减少运行时 diff 的开销，是对"采用虚拟 DOM"这一设计决策的进一步优化探索。

### 区分编译时和运行时

我们需要有一个虚拟 DOM，调用渲染方法将虚拟 DOM 渲染成真实 DOM（缺点就是虚拟 DOM 编写麻烦）。专门写个编译时，可以将模板编译成虚拟 DOM——在构建的时候进行编译性能更高，不需要在运行时进行编译，而且 Vue3 在编译中做了很多优化。

**为什么编译时优化很重要**：如果没有编译时这一步，模板字符串必须在运行时解析成 AST 再生成渲染函数，每次渲染都要重新解析一次模板，性能开销叠加在每一次更新上。Vue3 把这一步挪到构建阶段一次性完成，运行时只需要执行编译产物（渲染函数），并且编译阶段还能顺带做静态节点标记、PatchFlag 标记等优化（这部分会在系列后续「编译优化」篇深入讲）。

> 💬 **面试官**：Vue 的模板是什么时候变成真实 DOM 的？编译时和运行时各自负责什么？
>
> ✅ 标准答案：编译时（构建阶段）把模板字符串编译成渲染函数（本质是返回 vnode 的 JS 函数）；运行时（浏览器执行阶段）执行渲染函数生成 vnode，再通过渲染器把 vnode 变成真实 DOM，并在更新时做 diff。
>
> 🎁 加分答案：Vue3 允许只用运行时（`runtime-only` 构建），此时不能写模板字符串，必须手写 `render` 函数或用 `.vue` 单文件组件（构建工具在打包阶段完成编译）；也可以用完整版（`vue` 包），支持运行时动态编译模板字符串（体积更大，牺牲了部分 Tree-shaking 收益）。

---

## 🎯 二、Vue3 四大设计思想

Vue2 到 Vue3 的升级，本质是围绕四个设计思想的一次整体重写：

- Vue3.0 注重模块上的拆分，Vue3 中的模块之间耦合度低，模块可以独立使用。**拆分模块**。
- 通过构建工具 Tree-shaking 机制实现按需引入，减少用户打包后体积。**组合式 API**
- Vue3 允许自定义渲染器，扩展能力强。**扩展更方便**
- 使用 RFC 来确保改动和设计都是经过 Vue.js 核心团队探讨并得到确认的，也让用户可以了解每一个功能采用或废弃的前因后果。**采用 RFC**

笔记里这四条是结论性的一句话总结，接下来每一条展开讲清楚「具体怎么做到的」，后面几个章节会逐一深挖，这里先建立整体框架。

---

## 🚀 三、从 `new Vue()` 到 `createApp()`：基本使用层的变化

### 项目初始化对比

Vue2 用构造函数创建一个「全局唯一」的根实例：

```javascript
// Vue2
import Vue from 'vue'
import App from './App.vue'

new Vue({
  render: h => h(App)
}).$mount('#app')
```

Vue3 用工厂函数 `createApp` 创建一个「应用实例」：

```javascript
// Vue3
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

表面上只是 API 换了个名字，背后是一次**全局配置隔离**的架构调整。

### 全局 API 拆分对照

Vue2 的很多全局配置直接挂在 `Vue` 构造函数上，是**全局共享**的：

| Vue2 全局 API | Vue3 应用实例 API | 说明 |
|---|---|---|
| `Vue.component(name, opts)` | `app.component(name, opts)` | 注册全局组件 |
| `Vue.directive(name, opts)` | `app.directive(name, opts)` | 注册全局指令 |
| `Vue.use(plugin)` | `app.use(plugin)` | 安装插件 |
| `Vue.mixin(opts)` | `app.mixin(opts)` | 全局混入 |
| `Vue.prototype.$xxx = xxx` | `app.config.globalProperties.$xxx = xxx` | 挂载全局属性/方法 |

Vue2 的问题在于：`Vue.component('DrugCard', ...)` 注册后，**这个页面里所有用到 `new Vue()` 的实例**都会共享这个全局组件。如果一个页面同时跑了两套 Vue 应用（比如 HIS 系统主应用 + 第三方嵌入的挂号小组件），两者的全局注册会互相污染、互相覆盖。

Vue3 把这些全局配置都挂到了 `app` 实例上，`createApp()` 每次调用都返回一个全新的、彼此隔离的应用实例：

```typescript
// 两个独立的应用实例，互不污染
const app1 = createApp(MainApp)
app1.component('DrugCard', DrugCardComponent)   // 只在 app1 内生效

const app2 = createApp(WidgetApp)
app2.component('DrugCard', AnotherDrugCard)     // 只在 app2 内生效，和 app1 的 DrugCard 无关

app1.mount('#main')
app2.mount('#widget')
```

> 💬 **面试官**：`createApp` 和 `new Vue()` 的区别？多实例有什么意义？
>
> ✅ 标准答案：`new Vue()` 的全局配置（组件、指令、mixin、prototype 属性）挂载在 `Vue` 构造函数上，是所有实例共享的；`createApp()` 每次调用创建一个独立的 `app` 实例，全局配置挂在这个实例上，多个 `createApp` 之间互不影响。这解决了 Vue2 在一个页面里跑多个 Vue 应用时全局配置互相污染的问题。
>
> 🎁 加分答案：这个设计对 SSR 场景也很关键——服务端渲染时同一个 Node 进程要处理多个并发请求，如果全局配置是共享单例，一个请求注册的全局组件会「泄漏」到另一个请求的渲染结果里。`createApp` 每次请求创建全新实例，天然规避了这个并发污染问题。

🔧 **真实场景**：HIS（医院信息系统）里经常要在老的系统页面里内嵌第三方提供的药品查询组件，如果两边都用 Vue2 的全局注册方式，组件名冲突、指令冲突几乎不可避免。Vue3 的多实例模式让「同一页面内嵌多个独立 Vue 应用」变成了官方支持的标准用法，而不是需要 iframe 隔离才能解决的脏活。

### 按需导入：Tree-shaking 的前提

Vue2 通常这样引入 API：

```javascript
// Vue2：从 Vue 这个默认导出对象上取方法
import Vue from 'vue'
Vue.nextTick(() => {})
```

Vue3 改成了具名导入：

```typescript
// Vue3：按需引入具名导出的函数
import { ref, computed, nextTick } from 'vue'

const count = ref(0)
const double = computed(() => count.value * 2)
```

这一步「用什么就导入什么」的写法看起来只是风格变化，但它是后面 Tree-shaking 章节要讲的构建优化能生效的**前提条件**——如果 API 全部挂在一个默认导出对象上，打包工具没法知道你到底用没用到某个方法，也就没法把它从产物里摇掉。

### `app.config.globalProperties` 替代 `Vue.prototype`

Vue2 挂载全局方法/属性常用 `Vue.prototype`：

```javascript
// Vue2
Vue.prototype.$http = axios
Vue.prototype.$formatDate = (date) => dayjs(date).format('YYYY-MM-DD')
```

组件内直接 `this.$http`、`this.$formatDate` 使用。Vue3 用 `app.config.globalProperties`：

```typescript
// Vue3
const app = createApp(App)
app.config.globalProperties.$http = axios
app.config.globalProperties.$formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD')
```

TypeScript 项目里还需要通过模块声明扩展类型，否则 `this.$http` 会报类型错误：

```typescript
// src/global.d.ts
import { AxiosInstance } from 'axios'

declare module 'vue' {
  interface ComponentCustomProperties {
    $http: AxiosInstance
    $formatDate: (date: string) => string
  }
}
```

> 💬 **面试官**：`app.config.globalProperties` 和 Vue2 的 `Vue.prototype` 有什么区别？
>
> ✅ 标准答案：作用相同（都是给所有组件实例挂载共享属性/方法），区别在于挂载位置——`Vue.prototype` 是全局共享的，`app.config.globalProperties` 挂在具体的 `app` 实例上，只对这个实例下挂载的组件树生效，天然支持多实例隔离。
>
> 🎁 加分答案：在 Composition API 的 `setup()` 里无法通过 `this` 访问 `globalProperties`（`setup()` 里没有 `this`），需要用 `getCurrentInstance().appContext.config.globalProperties` 取值，或者更推荐的方式是用 `provide/inject` 显式注入依赖，而不是继续沿用「全局挂属性」这种隐式依赖的老模式。

---

## 🏗️ 四、Monorepo 整体架构：为什么拆成这么多包

### Monorepo 是什么

Monorepo 是管理项目代码的一个方式，指在一个项目仓库（repo）中管理多个模块/包（package）。Vue3 源码采用 Monorepo 方式进行管理，将模块拆分到 `package` 目录中，作为一个个包来管理，这样职责划分更加明确：

- 一个仓库可维护多个模块，不用到处找仓库
- 方便版本管理和依赖管理，模块之间的引用、调用都非常方便

### Vue3 项目结构

![与平台无关的运行时核心 RUNTIME-CORE 与平台无关的编译器核心 COMPILER-CORE 针对浏览器的运行时,包括DOM操作,属性,事件处理等 RUNTIME-DOM 针对浏览器的编译模块 COMPILER-DOM 用于测试的运行时 RUNTIME-TEST 针对单文件解析 COMPILER-SFC 用于服务器端渲染 SERVER-RENDERER 针对服务端渲染的编译模块 COMPILER-SSR VUE3组成 多个包之间共享的内容 SHARED 响应式系统 REACTIVITY 完整版本,包括运行时和编译器 VUE 用于调试编译器输出的开发工具 TEMPLATE-EXPLORER 试验性语法,REF转化器 REF-TRANSFORM 迁移构建,用于兼容VUE2 VUE-COMPAT 用来测试代码体积 SIZE-CHECK](https://cdn.nlark.com/yuque/0/2025/png/738210/1753425741924-930a773d-ba63-42c4-89d6-5980d6f066db.png)

![@VUE/COMPILER-SFC @VUE/COMPILER-DOM @VUE/COMPILER-CORE VUE XX @VUE/RUNTIME-CORE @VUE/REACTIVITY @VUE/RUNTIME-DOM](https://cdn.nlark.com/yuque/0/2025/png/738210/1753426127329-7427b6c8-9e39-4d00-ab94-5aa54fc5440c.png)

**核心包职责拆解**：

| 包名 | 职责 |
|---|---|
| `@vue/shared` | 多个包之间共享的工具函数（如 `isObject`、`isFunction`），无业务逻辑 |
| `@vue/reactivity` | 响应式系统，与平台无关，可脱离 DOM 独立使用 |
| `@vue/runtime-core` | 与平台无关的运行时核心（组件、vnode、渲染器抽象、生命周期） |
| `@vue/runtime-dom` | 针对浏览器的运行时，包括 DOM 操作、属性处理、事件处理等 |
| `@vue/compiler-core` | 与平台无关的编译器核心（模板 → AST → 代码生成的通用逻辑） |
| `@vue/compiler-dom` | 针对浏览器的编译模块，基于 `compiler-core` 扩展浏览器特有指令处理 |
| `@vue/compiler-sfc` | 针对单文件组件（`.vue`）解析 |
| `@vue/server-renderer` | 用于服务器端渲染 |
| `vue` | 完整版本，包括运行时和编译器，重新导出以上各包的公共 API |

依赖关系是自底向上的：`vue` 依赖 `compiler-dom` 和 `runtime-dom`，`runtime-dom` 依赖 `runtime-core` 和 `@vue/shared`，`runtime-core` 依赖 `reactivity` 和 `@vue/shared`。**每一层只依赖比它更底层的包，不存在反向依赖或循环依赖**，这也是模块解耦设计的直接体现。

### `@vue/reactivity` 与渲染器解耦的意义

`reactivity` 包不依赖任何 DOM 相关的东西，纯粹是一套「值变化时通知依赖」的机制。这意味着它可以完全脱离浏览器环境使用：

```typescript
// 在 Node.js 环境下独立使用响应式系统，不依赖任何 DOM API
import { reactive, effect } from '@vue/reactivity'

const state = reactive({ count: 0 })

effect(() => {
  console.log('count changed:', state.count)
})

state.count++ // 打印: count changed: 1
```

这种解耦让响应式系统可以用在浏览器 DOM 渲染之外的场景，比如 Canvas 渲染引擎的状态管理、小程序自定义渲染器、Node.js 端的状态同步逻辑。

### Vue3 采用 TypeScript

复杂的框架项目开发，使用类型语言非常有利于代码的维护，在编码期间就可以帮我们做类型检查，避免错误。所以 TS 已经是主流框架的标配。

> Vue2 早期采用 Flow 来进行类型检测（Vue2 中对 TS 支持并不友好），Vue3 源码采用 TypeScript 来进行重写。同时 Vue2.7 也采用 TS 进行重写。TS 能对代码提供良好的类型检查，同时也支持复杂的类型推导。

> 💬 **面试官**：Vue3 为什么要拆成多个包（Monorepo）？`@vue/reactivity` 单独使用有什么场景？
>
> ✅ 标准答案：Monorepo 让每个包职责单一、可独立发版、可独立使用；`@vue/reactivity` 与渲染器完全解耦，不依赖 DOM，可以脱离 Vue 单独用在任何需要响应式数据管理的场景，比如 Node.js 服务端状态管理、Canvas/WebGL 渲染引擎、跨平台小程序框架。
>
> 🎁 加分答案：Monorepo 还带来了内部协作效率的提升——`packages` 之间通过 `workspace` 协议互相引用本地最新代码，不需要先发布 npm 包再安装依赖，改一个底层包（如 `shared`）能立刻在上层包（如 `reactivity`）里看到效果，这对于像 Vue 这种多包联动开发的项目非常关键。

---

## 🌳 五、Tree-shaking 设计：命名导出如何让没用到的 API 被摇掉

### Vue2 挂载到原型 vs Vue3 命名导出

Vue2 里很多工具方法挂在 `Vue` 这个默认导出对象上：

```javascript
// Vue2 的写法，Vue 对象上挂了一堆方法
import Vue from 'vue'
Vue.nextTick(cb)
Vue.set(obj, key, value)
Vue.observable(state)
```

打包工具（如 webpack、Rollup）做 Tree-shaking 判断的依据是「有没有被引用到」，而 `Vue` 是一个完整的对象，工具没法知道你到底调没调用它上面的某个方法——即使你只用了 `Vue.nextTick`，整个 `Vue` 对象（包括它所有的方法实现）都会被打进最终产物。

Vue3 把这些方法全部改成具名导出：

```typescript
// Vue3：nextTick、reactive、ref 等都是独立的具名导出
export { nextTick } from './scheduler'
export { reactive, ref, computed } from '@vue/reactivity'
```

配合 ES Module 的静态分析特性（`import`/`export` 语句在编译期就能确定引用关系，不像 CommonJS 的 `require` 是运行时动态的），打包工具可以精确知道：如果你的代码里没有出现 `import { computed } from 'vue'`，那么 `computed` 相关的实现代码在最终产物里可以被安全删除。

### 决策表：什么样的写法会破坏 Tree-shaking

| 写法 | 是否支持 Tree-shaking | 原因 |
|---|---|---|
| `import { ref, computed } from 'vue'` | ✅ 支持 | 具名导入，静态可分析引用关系 |
| `import Vue from 'vue'; Vue.ref(...)` | ❌ 不支持（Vue3 里也不存在这种用法） | 默认导出对象，无法判断哪些方法被用到 |
| `import * as Vue from 'vue'; Vue.ref(...)` | ⚠️ 视打包工具而定 | 部分工具能分析出实际用到的具名成员，部分不能，不推荐 |
| 组件内用 `this.$nextTick` （Options API） | ❌ 不支持 | 通过实例方法调用，是运行时动态查找，不是模块级的静态引用 |

> 💬 **面试官**：Vue3 是怎么实现 Tree-shaking 的？和 Vue2 的区别？
>
> ✅ 标准答案：Vue3 把所有全局 API 从挂载到 `Vue` 对象原型的方式，改成了 ES Module 的具名导出（`export { xxx }`）。配合 ESM 静态分析，打包工具能在编译期确定哪些导出被实际用到，没用到的代码会在打包时被移除，从而减小最终产物体积。Vue2 因为方法挂在 `Vue.prototype` 或 `Vue` 对象上，整体作为一个不可拆分的对象被引用，打包工具无法单独摇掉其中某个方法。
>
> 🎁 加分答案：Tree-shaking 生效有前提条件——打包配置里 `mode: 'production'`（webpack）会自动开启，且依赖包的 `package.json` 需要标注 `"sideEffects": false`（表示这个包没有引入即执行的副作用代码，可以安全地按需删除未使用部分）。Vue3 的 `package.json` 就做了这个标注，这也是很多老库升级 ESM 之后依然享受不到 Tree-shaking 收益的常见原因。

---

## 🔌 六、`createRenderer` 渲染器工厂：自定义渲染器的扩展能力

Vue3 允许自定义渲染器，扩展能力强，这是四大设计思想里「扩展更方便」的具体落地。

`runtime-core` 里定义了一个 `createRenderer(options)` 工厂函数，它不关心具体平台是浏览器还是别的什么环境，只依赖调用方传入的一组「平台操作」接口。`runtime-dom` 就是把浏览器的 DOM API 包装成这组接口，传给 `createRenderer` 得到一个「浏览器渲染器」。

**7 个核心平台操作**（`RendererOptions` 接口约定）：

| 操作 | 作用 |
|---|---|
| `createElement` | 创建平台元素节点 |
| `patchProp` | 更新元素属性/事件 |
| `insert` | 把节点插入到父节点的指定位置 |
| `remove` | 移除节点 |
| `createText` | 创建文本节点 |
| `setText` | 更新文本内容 |
| `parentNode` / `nextSibling` | 获取父节点 / 下一个兄弟节点（diff 算法定位用） |

如果要把 Vue3 渲染到 Canvas 而不是 DOM，只需要把这 7 个操作换成 Canvas 上下文的绘制逻辑（比如 `createElement` 变成「记录一个绘制指令」，`insert` 变成「加入绘制队列」），组件系统、响应式系统、diff 算法完全不用改，直接复用 `runtime-core`。

> 💬 **面试官**：Vue3 的自定义渲染器是怎么实现跨平台的？
>
> ✅ 标准答案：`runtime-core` 提供 `createRenderer(options)` 工厂函数，把「创建节点、更新属性、插入/删除节点」等具体的平台操作抽象成一组接口参数。渲染逻辑（diff、组件更新调度）都写在 `runtime-core` 里，与平台无关；不同平台（浏览器 DOM、Canvas、小程序）只需要实现这组接口，传给 `createRenderer` 就能得到一个该平台专用的渲染器。
>
> 🎁 加分答案：这个设计在 Vue2 里做不到——Vue2 的 DOM 操作是直接散落写在渲染逻辑各处的，没有做统一抽象。Vue3 因为提前做了这层解耦，社区才能比较低成本地做出 `@vue/runtime-test`（用于单测的虚拟渲染器）以及各种小程序适配方案。

---

## 🎯 七、Composition API 动机：解决 Options API 的两个核心问题

Options API（`data/methods/computed/watch` 这种按选项组织代码的方式）在中大型组件里会暴露两个核心问题。

**问题一：逻辑碎片化**。一个「药品搜索」功能，搜索关键词的状态在 `data` 里，搜索方法在 `methods` 里，搜索结果的派生计算在 `computed` 里，监听搜索词变化又跑到 `watch` 里——同一个功能的代码被 Options API 的选项类型拆散在文件的四个不同位置，逻辑维护时要上下反复跳转：

```javascript
// Options API：搜索功能的逻辑分散在四个选项里
export default {
  data() {
    return { keyword: '', drugList: [] }       // 状态在这
  },
  computed: {
    filteredList() {                            // 派生计算在这
      return this.drugList.filter(d => d.name.includes(this.keyword))
    }
  },
  watch: {
    keyword() {                                 // 监听逻辑在这
      this.search()
    }
  },
  methods: {
    async search() {                            // 方法逻辑在这
      this.drugList = await api.searchDrug(this.keyword)
    }
  }
}
```

Composition API 把同一个功能的所有逻辑聚合到一个函数里（可复用的叫 Composable 函数），一眼就能看到「搜索」这个功能的完整逻辑：

```typescript
// Composition API：同一个功能的逻辑聚合在一起
function useDrugSearch() {
  const keyword = ref('')
  const drugList = ref<Drug[]>([])

  const filteredList = computed(() =>
    drugList.value.filter(d => d.name.includes(keyword.value))
  )

  const search = async () => {
    drugList.value = await api.searchDrug(keyword.value)
  }

  watch(keyword, search)

  return { keyword, filteredList, search }
}
```

**问题二：类型推断难**。Options API 依赖 `this` 上下文来关联各个选项之间的类型（比如 `computed` 里要推断出 `this.keyword` 是 `data` 里定义的类型），这种基于 `this` 的隐式关联对 TypeScript 的类型系统非常不友好，需要框架做大量类型体操才能勉强支持。Composition API 是纯函数式的写法，变量的类型就是普通 TS 变量的类型推断，天然对 TS 友好，不需要任何框架层的类型魔法。

### `setup()` 执行时机

`setup()` 是 Composition API 的入口，执行时机在 `beforeCreate` 之前：

- 此时组件实例还未创建完成，所以 `setup()` 内部**没有 `this`**
- 接收两个参数：`props`（响应式的，解构会丢失响应性）和 `context`（包含 `attrs/slots/emit/expose`）
- `setup()` 的返回值：如果返回一个对象，对象里的属性和方法会暴露给模板使用；如果返回一个函数，这个函数会被当作组件的 `render` 函数

```typescript
export default {
  props: ['drugId'],
  setup(props, context) {
    // 这里没有 this，props 是响应式对象
    const drug = ref<Drug | null>(null)

    onMounted(async () => {
      drug.value = await api.getDrugDetail(props.drugId)
    })

    return { drug } // 暴露给模板
  }
}
```

> 💬 **面试官**：Composition API 解决了 Options API 的哪两个核心问题？`setup()` 的执行时机是什么？为什么不能用 `this`？
>
> ✅ 标准答案：解决逻辑碎片化（同一功能的状态、计算、方法、监听聚合到一个函数里，可以提炼成 Composable 复用）和类型推断难（去掉了基于 `this` 的隐式类型关联，改为普通函数变量的类型推断）。`setup()` 在 `beforeCreate` 之前执行，此时组件实例尚未创建完成，所以拿不到 `this`。
>
> 🎁 加分答案：正因为 `setup()` 没有 `this`，Composition API 才能摆脱对组件实例生命周期的强依赖，逻辑函数可以被抽出到组件外部的普通 `.ts` 文件里独立测试、独立复用（Composable），这是 Options API 做不到的——Options API 的 `methods` 内部逻辑天然绑定 `this`，脱离组件实例基本无法单独测试。

---

## 📖 八、源码解析：对应官方 vue-next 仓库

> Vue3 源码地址：在 GitHub 上搜索 `vuejs/core`（原 `vuejs/vue-next`），查看 `packages` 目录。

### 包入口：packages/vue/src/index.ts

`vue` 这个完整包的入口文件，核心工作是把各个子包的公共 API 重新导出到一起：

```typescript
// packages/vue/src/index.ts（简化示意，保留核心结构）
import { compile, CompilerOptions, CompilerError } from '@vue/compiler-dom'
import { registerRuntimeCompiler, RenderFunction, CreateAppFunction } from '@vue/runtime-dom'
import * as runtimeDom from '@vue/runtime-dom'

function compileToFunction(template, options) {
  const { code } = compile(template, options)
  return new Function('Vue', code)(runtimeDom) as RenderFunction
}

registerRuntimeCompiler(compileToFunction)

export * from '@vue/runtime-dom'  // 重新导出 runtime-dom 的所有公共 API
export { compile }
```

这里能看到「完整版 vue 包 = compiler-dom（编译能力） + runtime-dom（运行能力）」的组合关系——`vue` 包本身几乎不写任何业务逻辑，只是做能力整合和运行时模板编译的注册。

### `createApp`：packages/runtime-dom/src/index.ts

```typescript
// packages/runtime-dom/src/index.ts（简化示意）
import { createRenderer } from '@vue/runtime-core'
import { nodeOps } from './nodeOps'        // DOM 节点操作实现
import { patchProp } from './patchProp'    // DOM 属性/事件更新实现

const rendererOptions = { patchProp, ...nodeOps }

// 用 DOM 特有的平台操作创建一个渲染器实例（懒创建，首次调用 createApp 时才真正创建）
let renderer
function ensureRenderer() {
  return renderer || (renderer = createRenderer(rendererOptions))
}

export const createApp = ((...args) => {
  const app = ensureRenderer().createApp(...args)  // 委托给 runtime-core 的 createAppAPI

  const { mount } = app
  app.mount = (containerOrSelector) => {
    const container = normalizeContainer(containerOrSelector)
    if (!container) return
    // ...挂载前的容器校验、清空容器已有内容等处理
    return mount(container)
  }

  return app
}) as CreateAppFunction<Element>
```

可以看到 `runtime-dom` 里的 `createApp` 本身不重新发明轮子，而是调用 `ensureRenderer()` 拿到一个绑定了 DOM 操作的渲染器，再委托给 `runtime-core` 里真正的 `createApp` 实现（下面 `apiCreateApp.ts` 会展开），自己只额外处理了 DOM 容器的规范化逻辑（比如支持传选择器字符串或者 DOM 元素）。

### 渲染器工厂：packages/runtime-core/src/renderer.ts

```typescript
// packages/runtime-core/src/renderer.ts（简化示意）
export function createRenderer<HostNode, HostElement>(
  options: RendererOptions<HostNode, HostElement>
): Renderer<HostElement> {
  return baseCreateRenderer(options)
}

function baseCreateRenderer(options) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    // ... 其他平台操作
  } = options

  function patch(n1, n2, container, anchor) {
    // 核心 diff 逻辑：对比新旧 vnode，调用上面这些 host 前缀的方法完成真实更新
    // 这里的实现完全依赖传入的 options，不直接操作 DOM
  }

  function render(vnode, container) {
    patch(container._vnode || null, vnode, container)
    container._vnode = vnode
  }

  return {
    render,
    createApp: createAppAPI(render) // 组合出 createApp API
  }
}
```

这段代码印证了「渲染器工厂」的核心设计：`patch`（diff 算法）内部只调用 `hostInsert`、`hostCreateElement` 这些从 `options` 里解构出来的抽象方法，完全不知道底层是 DOM 还是 Canvas。只要传入的 `options` 实现了这组接口，`createRenderer` 就能在任意平台上跑起来。

### 响应式独立包：packages/reactivity/src/index.ts

```typescript
// packages/reactivity/src/index.ts（简化示意）
export { reactive, readonly, shallowReactive, shallowReadonly, isReactive, isReadonly } from './reactive'
export { ref, isRef, toRef, toRefs, unref } from './ref'
export { computed } from './computed'
export { effect, stop, ReactiveEffect } from './effect'
export { effectScope, EffectScope } from './effectScope'
```

这个包完全不依赖 `runtime-core`、`runtime-dom`，是纯粹的响应式实现，可以单独 `npm install @vue/reactivity` 安装使用，这也印证了前面第四章讲的「与渲染器解耦」。

### 全局 API 迁移对照：packages/runtime-core/src/apiCreateApp.ts

```typescript
// packages/runtime-core/src/apiCreateApp.ts（简化示意）
export function createAppAPI<HostElement>(render, hydrate?) {
  return function createApp(rootComponent, rootProps = null) {
    const context = createAppContext()  // 每个 app 实例独立的上下文，全局配置隔离的关键

    const app = {
      _component: rootComponent,
      _props: rootProps,
      _container: null,
      config: context.config,           // 对应 app.config.xxx

      use(plugin, ...options) {
        plugin.install ? plugin.install(app, ...options) : plugin(app, ...options)
        return app
      },
      mixin(mixin) {
        context.mixins.push(mixin)
        return app
      },
      component(name, component) {
        context.components[name] = component  // 注册到当前 app 的 context 上，不是全局共享
        return app
      },
      directive(name, directive) {
        context.directives[name] = directive
        return app
      },
      mount(rootContainer) {
        const vnode = createVNode(rootComponent, rootProps)
        vnode.appContext = context         // 把 appContext 挂到根 vnode 上，向下传递给所有子组件
        render(vnode, rootContainer)
        return vnode.component!.proxy
      }
    }

    return app
  }
}
```

这段代码是理解「Vue3 多实例互不污染」的关键——每次调用 `createApp()` 都会 `createAppContext()` 创建一个**全新的上下文对象**，`component`/`directive`/`mixin` 注册的内容都存在这个上下文里，而不是像 Vue2 那样写到全局共享的 `Vue` 构造函数上。`mount()` 时把 `appContext` 挂到根 vnode 上，子组件通过 vnode 树逐层拿到自己所属的 `appContext`，从而实现了应用级别的配置隔离。

---

## 🎯 九、生产级最佳实践

- **只引入需要的 API，避免全量导入**：虽然 `vue` 包本身已经做了 re-export 优化，具名导入天然支持 Tree-shaking，但要避免 `import * as Vue from 'vue'` 这种写法降低打包工具的静态分析精度。
- **多 `createApp` 场景**：同一页面内嵌多个独立 Vue 应用（医疗场景：HIS 系统主应用 + 第三方药品查询组件各自 `createApp` 挂载到不同容器），组件、指令注册天然隔离，不需要额外的命名空间约定。
- **`app.config.errorHandler` 统一捕获全局异常**：

```typescript
const app = createApp(App)

app.config.errorHandler = (err, instance, info) => {
  // 统一上报到监控平台，医疗系统尤其要关注患者数据相关组件的异常
  reportToMonitor({ err, componentName: instance?.$options.name, info })
}
```

- **`app.config.globalProperties` 替代 `Vue.prototype`，同时提供 TypeScript 类型扩展**：如前文第三章所示，通过 `declare module 'vue' { interface ComponentCustomProperties {...} }` 扩展类型，避免团队协作时到处出现 `this.$http` 的类型报错。

---

## 🛠️ 十、手写实现：从零搭建 Vue3 风格的 Monorepo 环境

医疗场景：用 pnpm workspace 搭建一个迷你版 Vue3 风格 Monorepo，包含 `shared`（共享工具）、`reactivity`（响应式，可独立使用）、`vue`（整合包）三个子包，体会「模块拆分 + 各包职责单一 + 可独立安装使用」的架构设计。

### 安装 pnpm

```shell
npm install pnpm -g
```

### 初始化项目

```shell
mkdir g-vue-next
pnpm init
```

脚本配置：

```json
{
  "private": true,
  "type": "module",
  "version": "3.4.0",
  "description": "Vue 3.4 源码",
  "scripts": {},
  "license": "ISC",
  "packageManager": "pnpm@10.13.1"
}
```

TypeScript 配置：

```json
{
  "compilerOptions": {
    "outDir": "dist",
    "sourceMap": true,
    "target": "es2016",
    "module": "esnext",
    "moduleResolution": "node",
    "strict": false,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "jsx": "preserve",
    "lib": ["ESNext", "DOM"],
    "baseUrl": ".",
    "paths": {
      "@g-vue-next/*": ["packages/*/src"]
    }
  }
}
```

### 搭建 Monorepo 环境

配置 `pnpm-workspace.yaml`：

```yaml
packages:
  - 'packages/*'

linkWorkspacePackages: true  # 是否允许链接 workspace 包
shamefullyHoist: false       # 是否允许将 workspace 包提升到根目录
```

创建子包：

```shell
cd g-vue-next
mkdir reactivity  # 响应式系统
mkdir shared       # 共享包
mkdir vue          # vue 完整包，包括编译器和运行时
```

**`shared` 包**——放通用工具函数，被其他包依赖，是整个 Monorepo 依赖链的最底层：

```shell
cd shared
mkdir src
touch index.ts
```

```json
{
  "name": "@g-vue-next/shared",
  "version": "3.4.0",
  "description": "",
  "module": "dist/shared.esm.js",
  "buildOptions": {
    "name": "GVueNextShared",
    "formats": ["esm-bundler", "esm", "cjs"]
  },
  "scripts": {},
  "keywords": ["vue-next", "vue", "vue3", "shared"],
  "author": "Robin",
  "license": "ISC",
  "packageManager": "pnpm@10.12.1"
}
```

```typescript
// shared/src/index.ts
export * from './general'
```

```typescript
// shared/src/general.ts
// 判断是否是函数
export const isFunction = (val: any) => typeof val === 'function'
// 判断是否是对象
export const isObject = (val: any) => val !== null && typeof val === 'object'
```

**`reactivity` 包**——依赖 `shared`，通过 `workspace` 协议引用本地代码，体会「独立职责 + 可独立使用」：

```shell
cd reactivity
mkdir src
touch index.ts
```

```json
{
  "name": "@g-vue-next/reactivity",
  "version": "3.4.0",
  "description": "",
  "module": "dist/reactivity.esm.js",
  "unpkg": "dist/reactivity.global.js",
  "buildOptions": {
    "name": "GVueNextReactivity",
    "formats": ["esm-bundler", "esm-browser", "esm", "global", "cjs"]
  },
  "scripts": {},
  "keywords": ["vue-next", "vue", "vue3", "reactivity"],
  "author": "Robin",
  "license": "ISC",
  "packageManager": "pnpm@10.12.1",
  "dependencies": {
    "@g-vue-next/shared": "workspace:^"
  }
}
```

安装依赖：

```shell
pnpm add @g-vue-next/shared@workspace --filter @g-vue-next/reactivity
```

```typescript
// reactivity/src/index.ts
import { isFunction, isObject } from '@g-vue-next/shared'

console.log(isFunction(() => {}))
console.log(isObject({}))
```

**`vue` 包**——整合包，依赖 `shared` 和 `reactivity`，对应真实 Vue3 里 `vue` 包重新导出各子包 API 的做法：

```shell
cd vue
mkdir src
touch index.ts
```

```json
{
  "name": "g-vue-next",
  "version": "3.4.0",
  "description": "",
  "module": "dist/vue.esm.js",
  "unpkg": "dist/vue.global.js",
  "buildOptions": {
    "name": "GVueNext",
    "formats": ["esm-bundler", "esm-browser", "esm", "global", "cjs"]
  },
  "keywords": ["vue", "vue3", "vue-next"],
  "author": "Robin",
  "license": "ISC",
  "dependencies": {
    "@g-vue-next/reactivity": "workspace:^",
    "@g-vue-next/shared": "workspace:^"
  }
}
```

安装依赖：

```shell
pnpm add @g-vue-next/shared@workspace --filter g-vue-next
pnpm add @g-vue-next/reactivity@workspace --filter g-vue-next
```

```typescript
// vue/src/index.ts
export * from '@g-vue-next/shared'
export * from '@g-vue-next/reactivity'
```

### 打包：esbuild 构建脚本

安装依赖：

```shell
pnpm add esbuild http-server minimist typescript -w -D
pnpm add vue -S
```

```diff
{
  "private": true,
  "version": "3.4.0",
  "type": "module",
  "description": "Vue 3.4 源码",
  "scripts": {},
  "license": "ISC",
  "packageManager": "pnpm@10.13.1",
+  "dependencies": {
+    "vue": "^3.5.18"
+  },
+  "devDependencies": {
+    "esbuild": "^0.25.8",
+    "http-server": "^14.1.1",
+    "minimist": "^1.2.8",
+    "typescript": "^5.8.3"
+  }
}
```

编写构建脚本：

```shell
cd g-vue-next
mkdir scripts
cd scripts
touch dev.js
```

```javascript
// scripts/dev.js
import { context } from "esbuild";
import minimist from "minimist";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// 解析命令行参数，返回构建配置
function parseBuildOptions(args) {
  const packageName = args.pkg || "reactivity"; // 默认包名
  const formatArg = args.f || "global"; // 默认格式
  const packageJsonPath = path.resolve(
    __dirname,
    `../packages/${packageName}/package.json`
  );
  const packageJson = require(packageJsonPath);
  // 规范化输出格式
  let outputFormat = "iife";
  if (formatArg.startsWith("esm")) outputFormat = "esm";
  else if (formatArg.startsWith("cjs")) outputFormat = "cjs";
  else if (formatArg.startsWith("umd")) outputFormat = "umd";
  // 输出文件路径
  const outputFile = path.resolve(
    __dirname,
    `../packages/${packageName}/dist/${packageName}.${formatArg}.js`
  );
  return {
    packageName,
    formatArg,
    packageJson,
    outputFormat,
    outputFile,
  };
}

// 执行单个包的构建并监听
async function buildAndWatch({
  packageName,
  packageJson,
  outputFormat,
  outputFile,
}) {
  const ctx = await context({
    entryPoints: [
      path.resolve(__dirname, `../packages/${packageName}/src/index.ts`),
    ],
    outfile: outputFile,
    bundle: true,
    sourcemap: true,
    minify: false,
    format: outputFormat,
    globalName: packageJson?.buildOptions?.name,
    platform: outputFormat === "cjs" ? "node" : "browser",
  });
  await ctx.watch();
  console.log(`watching ${packageName} (${outputFormat})...`);
}

// 获取所有 packages 目录下的包名
function getAllPackageNames() {
  return fs.readdirSync(path.resolve(__dirname, "../packages"));
}

// 主入口，解析参数并批量构建
async function main() {
  const args = minimist(process.argv.slice(2));
  const allPackages = getAllPackageNames();
  // 支持命令行指定包名（如 node dev.js reactivity runtime-core）
  const targetPackages = args._.length ? args._ : allPackages;
  // 支持多格式构建
  const formats =
    !args.f || args.f === "all" ? ["global", "esm", "cjs"] : [args.f || "esm"];
  // 遍历所有包和格式，执行构建
  for (const pkgName of targetPackages) {
    for (const format of formats) {
      const buildOptions = parseBuildOptions({ pkg: pkgName, f: format });
      await buildAndWatch(buildOptions);
    }
  }
}

main();
```

配置指令：

```diff
{
  "private": true,
  "version": "3.4.0",
  "type": "module",
  "description": "Vue 3.4 源码",
+  "scripts": {
+    "dev": "node scripts/dev.js",
+    "dev-reactivity": "node scripts/dev.js reactivity -f all",
+    "dev-runtime-core": "node scripts/dev.js runtime-core -f all",
+    "dev-runtime-dom": "node scripts/dev.js runtime-dom -f all",
+    "dev-shared": "node scripts/dev.js shared -f all",
+    "dev-vue": "node scripts/dev.js vue -f all"
+  },
  "license": "ISC",
  "packageManager": "pnpm@10.13.1",
  "dependencies": {
    "vue": "^3.5.18"
  },
  "devDependencies": {
    "esbuild": "^0.25.8",
    "http-server": "^14.1.1",
    "minimist": "^1.2.8",
    "typescript": "^5.8.3"
  }
}
```

- `pnpm dev`：打包所有子包
- `pnpm dev-xxx`：打包指定的子包
- 手动打包指定的子包：`node scripts/dev.js shared -f esm`
  - 参数一：子包的目录名
  - 参数 `-f`：打包的格式，有 `global`、`esm`、`cjs`

### 测试：验证子包可独立使用

创建测试页面：

```shell
cd g-vue-next
mkdir examples
cd examples
mkdir reactivity
touch reactive.html
```

```html
<!-- examples/reactivity/reactive.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>reactive</title>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { reactive } from '../../packages/reactivity/dist/reactivity.esm.js'

    reactive()
  </script>
</body>
</html>
```

查看结果：

```shell
pnpm dev
pnpm preview
```

这个测试页面直接从 `packages/reactivity/dist` 引入产物，完全不依赖 `vue` 整合包，验证了 Monorepo 架构下「响应式系统可独立打包、独立使用」这一设计目标。

### 目录结构

```shell
├── examples
│   └── reactivity
│       └── reactive.html
├── LICENSE
├── node_modules
├── package.json
├── packages
│   ├── reactivity
│   │   ├── dist
│   │   │   ├── reactivity.cjs.js
│   │   │   ├── reactivity.cjs.js.map
│   │   │   ├── reactivity.esm.js
│   │   │   ├── reactivity.esm.js.map
│   │   │   ├── reactivity.global.js
│   │   │   └── reactivity.global.js.map
│   │   ├── node_modules
│   │   ├── package.json
│   │   └── src
│   │       └── index.ts
│   ├── shared
│   │   ├── dist
│   │   ├── package.json
│   │   └── src
│   │       ├── general.ts
│   │       └── index.ts
│   └── vue
│       ├── dist
│       ├── node_modules
│       ├── package.json
│       └── src
│           └── index.ts
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── readme.md
├── scripts
│   └── dev.js
└── tsconfig.json
```

> 💬 **面试官**：讲一下你手写这套 Monorepo 环境时，觉得最能体现 Vue3 架构设计思想的地方？
>
> ✅ 标准答案：`reactivity` 包通过 `workspace:^` 协议依赖 `shared`，但完全不依赖 `vue` 包或任何 DOM 相关代码，打包产物可以被 `examples/reactivity/reactive.html` 直接单独引入使用——这就是「模块解耦、职责单一、可独立使用」在工程上的真实体现，而不只是文档里的一句口号。
>
> 🎁 加分答案：`buildOptions.formats` 里给每个包配置了 `esm-bundler / esm / cjs / global` 多种格式，对应 Vue3 真实源码里也是这么做的——`esm-bundler` 格式给 webpack/Vite 这类打包工具用（保留 `process.env.NODE_ENV` 之类的写法，交给下游打包工具处理），`global` 格式给 `<script>` 标签直接引入用，`cjs` 给 Node.js 环境用。一个包同时产出多种格式，就是为了让「独立使用」在不同消费场景下都能落地。

### 手写一个最小自定义渲染器：把「六」讲的解耦设计跑起来

「六、`createRenderer` 渲染器工厂」讲的是设计原理——`runtime-core` 不关心平台，只依赖调用方传入的一组 host 操作接口。这里用一份不依赖真实 DOM 的最小实现，把这个抽象落地成可运行代码：渲染目标不是浏览器 DOM，而是一棵普通的 JS 对象树（可以理解成"渲染到内存里的一个自定义数据结构"，比 Canvas 更聚焦在"解耦"这个知识点本身，不引入额外的绘图 API 细节）。

```typescript
// 📚 知识点：host 节点只是普通对象，不是真实 DOM——证明 runtime-core 的 diff/组件调度逻辑与平台无关
interface HostNode {
  type: string
  props: Record<string, any>
  children: HostNode[]
  text?: string
  parent?: HostNode
}

// 自定义平台操作：对应 createRenderer(options) 需要注入的 7 个核心接口
const customNodeOps = {
  createElement(type: string): HostNode {
    return { type, props: {}, children: [] }
  },
  createText(text: string): HostNode {
    return { type: '#text', props: {}, children: [], text }
  },
  setText(node: HostNode, text: string) {
    node.text = text
  },
  insert(child: HostNode, parent: HostNode, anchor?: HostNode) {
    const index = anchor ? parent.children.indexOf(anchor) : -1
    if (index > -1) parent.children.splice(index, 0, child)
    else parent.children.push(child)
    child.parent = parent
  },
  remove(child: HostNode) {
    const parent = child.parent
    if (!parent) return
    const index = parent.children.indexOf(child)
    if (index > -1) parent.children.splice(index, 1)
  },
  patchProp(el: HostNode, key: string, _prevValue: any, nextValue: any) {
    el.props[key] = nextValue
  },
}
```

```typescript
// 使用官方 react-reconciler 同款思路：Vue3 也导出了 createRenderer 供自定义渲染器场景使用
import { createRenderer } from '@vue/runtime-core'

const { createApp } = createRenderer<HostNode, HostNode>(customNodeOps)

const rootContainer: HostNode = { type: 'root', props: {}, children: [] }

createApp({
  render() {
    // 📚 知识点：组件的 render/diff/调度逻辑完全没有改变，变化的只是最终落地的操作对象
    return { type: 'div', props: { class: 'patient-card' }, children: [] } as any
  },
}).mount(rootContainer as any)

console.log(JSON.stringify(rootContainer, null, 2))
```

跑起来能看到 `rootContainer` 被填充成一棵结构化的对象树，而不是真实 DOM 节点——`diff`、组件实例创建、`setup` 执行、响应式更新触发重渲染，这些逻辑全部来自 `runtime-core`，一行都没有改动。这就是「六」里"扩展更方便"这条设计思想的可运行证明：把 `customNodeOps` 换成操作 Canvas 上下文或小程序原生组件的实现，其余部分原样复用。

> 💬 **面试官**：你说 Vue3 的渲染逻辑和平台无关，能证明给我看吗？
>
> ✅ 标准答案：`createRenderer(options)` 接收一组 host 操作（`createElement`/`insert`/`patchProp` 等），内部的组件系统、响应式触发更新、diff 算法全部只调用这组接口，不直接操作 DOM API。把这组接口换成操作任意数据结构（比如一棵普通 JS 对象树）的实现，传给 `createRenderer` 就能得到一个功能完整但不依赖浏览器的渲染器，能实际跑起来渲染出结果。

---

## 💡 十一、一张图总结（面试速记）

| 知识点 | 一句话核心 | 面试考察频率 |
|---|---|---|
| 声明式 vs 命令式 | 声明式关注结果，过程封装进框架内部 | ⭐⭐⭐ |
| 虚拟 DOM | 用对象描述真实 DOM，diff 找最小变更集，不是为了比原生操作更快 | ⭐⭐⭐⭐ |
| 编译时/运行时区分 | 模板编译挪到构建阶段，运行时只需执行渲染函数 | ⭐⭐⭐ |
| `createApp` vs `new Vue()` | 全局配置从共享单例变为每个 app 实例独立的 `appContext` | ⭐⭐⭐⭐⭐ |
| Monorepo 拆包 | 职责单一、可独立使用，自底向上无循环依赖 | ⭐⭐⭐⭐⭐ |
| `@vue/reactivity` 解耦 | 不依赖渲染器，可脱离 DOM 独立使用 | ⭐⭐⭐⭐ |
| Tree-shaking | 命名导出 + ESM 静态分析，未用到的代码可被摇掉 | ⭐⭐⭐⭐⭐ |
| `createRenderer` 渲染器工厂 | 7 个平台操作可替换，diff 逻辑与平台无关 | ⭐⭐⭐ |
| Composition API 动机 | 解决逻辑碎片化 + 类型推断难两个核心问题 | ⭐⭐⭐⭐⭐ |
| `setup()` 执行时机 | `beforeCreate` 之前，无 `this`，接收 `props/context` | ⭐⭐⭐⭐ |

---

## 📌 十二、手写源码仓库

- https://github.com/lotosv2010/g-vue-next

---

## 📚 十三、参考资料

- https://cn.vuejs.org/guide/introduction.html
- https://v3-migration.vuejs.org/zh/
- https://github.com/vuejs/core
- https://jonny-wei.github.io/blog/vue/vue3/reactivity.html
- https://github.com/wbccb/Frontend-Articles?tab=readme-ov-file#vue3

---

## 📝 留个问题

**思考题**：如果一个页面用 `createApp` 挂载了两个独立的 Vue3 应用实例，其中一个应用通过 `app1.config.globalProperties.$http = axios` 挂载了全局属性，另一个应用 `app2` 里的组件能不能访问到这个 `$http`？为什么？结合 `apiCreateApp.ts` 里 `appContext` 的挂载方式说说你的分析过程。

答案留在评论区。

---

> 🔖 这是「Vue3 全家桶深度拆解系列」第 1 篇。下一篇预告：《Vue 3 响应式原理与手写实现：Proxy 如何比 Object.defineProperty 做得更彻底？track/trigger 全链路拆解》
