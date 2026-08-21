# Vue 3 组件渲染原理：Text/Comment/Fragment 到组件实例的渲染链路（面试收藏级）

> 面试官问：「Vue 3 的组件是怎么渲染出来的？」你答：「调用 render 函数生成 VNode，再 patch 成真实 DOM。」面试官追问：「那 `v-if="false"` 渲染出来的是什么？为什么页面上什么都没有，DOM 里却多了个空节点？」你愣了一下：「……注释节点？」面试官继续：「组件的 `setup()` 执行完之后发生了什么？返回一个函数和返回一个对象，渲染流程有什么不同？」再追一句：「函数式组件为什么比普通组件快？它没有实例，那 `this` 去哪了？」——这道题看似在问「组件怎么渲染」，背后其实是 Text/Comment/Fragment 三种特殊节点、组件实例创建、`setup` 执行链路、组件更新与强制重建、函数式组件五条线拧在一起的完整拼图。这篇文章是「Vue 3 全家桶深度拆解」系列第 4 篇，接着第 3 篇讲完的元素节点 patch 流程，往下拆解 `patch` 遇到组件时到底做了什么。

---

## 🎯 这篇文章解决什么问题

第 3 篇讲清楚了元素节点的挂载、更新、卸载和 Diff 算法，但 `patch` 函数里那个 `switch(type)` 除了元素分支，还有 Text、Comment、Fragment、组件四条路径。这四条路径合起来才是 Vue 3 渲染器的完整面貌：Text/Comment 是两种最基础的特殊节点，Fragment 解决了"多根节点"的老问题，而组件才是 Vue 应用真正的核心——一个组件从"一段 `setup` 代码"变成"屏幕上的真实 DOM"，中间经过创建实例、初始化 props/setup、建立响应式渲染副作用整整一条链路。读完这篇文章，你会同时拿到两样东西：**懂原理**（组件渲染器每一步在解决什么问题）和**会讲**（面试官顺着任何一个分支往下问，你都能拆解回答）。

---

## 🧩 一、基本使用

### 组件的最小定义

Vue 3 组件最精简的写法只需要一个 `setup` 函数：

```typescript
import { render, h } from 'vue'

const App = {
  setup(props, context) {
    // props：组件接收到的属性
    // context：{ attrs, slots, emit, expose }
    return () => h('div', {}, '诊断结果：正常')
  }
}

render(h(App), document.getElementById('app'))
```

> **对比 Vue 2**：Vue 2 组件的最小定义是 `{ data() {}, render() {} }`，`render` 函数里通过 `this` 访问组件实例上挂载的所有数据和方法，`this` 从何而来是隐式的（框架内部把渲染函数的 `this` 绑定到组件实例）。Vue 3 的 `setup(props, context)` 完全没有 `this`——`props` 和 `context` 都是显式传入的参数，这不是简单的语法调整，而是 Composition API「函数优先于选项」设计思路的直接体现：组件逻辑本质上就是一个普通函数，输入是 `props`，输出是渲染函数，不再依赖一个隐式的、运行时才确定的 `this` 上下文。这也是为什么 `setup` 里的代码可以被抽取成独立的 Composable 函数到处复用——它压根不依赖组件实例。

### Text / Comment / Fragment 三种特殊 VNode 的渲染表现

除了元素节点和组件节点，Vue 3 内部还定义了三种"特殊类型"的 VNode，用 `Symbol` 标记，`patch` 时会走独立分支处理：

```typescript
import { render, h, Text, Comment, Fragment } from 'vue'

const app = document.getElementById('app')

// Text：渲染出一个纯文本节点
render(h(Text, '患者：张三'), app)
// 真实 DOM：#text "患者：张三"

// Comment：渲染出一个注释节点，页面上看不到任何内容
render(h(Comment), app)
// 真实 DOM：<!---->

// Fragment：渲染出多个子节点，没有额外的包裹容器
render(h(Fragment, [
  h('div', null, '处方单头部'),
  h('div', null, '处方单内容')
]), app)
// 真实 DOM：<div>处方单头部</div><div>处方单内容</div>（没有外层 div）
```

在医疗场景里，这三种节点分别对应：患者姓名这种纯文本展示用 Text；检验报告的某个条件提示（`v-if="report.abnormal"`）在条件不成立时会退化成一个 Comment 占位；处方单的头部和内容如果是两个平级 `div`，就靠 Fragment 承载。

### 组件 `props` 的声明与校验

```typescript
const DrugDetail = {
  props: {
    drugId: { type: String, required: true },
    quantity: { type: Number, default: 1 }
  },
  setup(props) {
    return () => h('div', {}, `药品 ID：${props.drugId}，数量：${props.quantity}`)
  }
}
```

### 组件根节点：单根 vs 多根

```typescript
// 单根：render 函数返回单个 VNode
setup() {
  return () => h('div', {}, [h('h2', null, '处方单'), h('p', null, '阿莫西林 x2')])
}

// 多根：借助 Fragment，返回多个平级节点
setup() {
  return () => h(Fragment, [
    h('h2', null, '处方单'),
    h('p', null, '阿莫西林 x2')
  ])
}
```

> **升级点**：Vue 2 模板必须有且只有一个根节点，写两个平级标签会直接编译报错。Vue 3 引入 Fragment 类型的 VNode，允许组件返回多个根节点，这也是`<template>` 不再强制包一层无意义 `div` 的底层支撑。

---

## 🧩 二、原理

### 1. Text 节点渲染：从 VNode 到 `document.createTextNode`

`patch` 函数在 `switch(type)` 里遇到 `Text` 类型，会走 `processText`：

```typescript
const processText = (n1, n2, container, anchor) => {
  if (n1 === null) {
    // 首次渲染：创建真实文本节点并插入
    hostInsert(
      n2.el = hostCreateText(n2.children), // 创建文本节点，并挂载到 VNode.el 上
      container,
      anchor
    )
  } else {
    // 更新：复用旧节点的 el，内容变了才调用 setText
    const el = n2.el = n1.el
    if (n2.children !== n1.children) {
      hostSetText(el, n2.children)
    }
  }
}
```

首次渲染直接 `hostCreateText` 创建一个真实的 `#text` 节点；更新时不重新创建 DOM，而是复用 `n1.el`，只在文本内容真的变化时才调用 `hostSetText` 修改内容——这跟元素节点"复用 DOM、只 patch 差异"的思路完全一致。

> **对比 Vue 2**：Vue 2 的虚拟 DOM 里，纯文本子节点通常不会单独包装成一个"文本类型的 VNode"参与 `patch`，而是在 `updateChildren` 里直接判断 `vnode.text` 字段做特殊处理。Vue 3 把 Text 提升为和元素、组件平级的一种独立 VNode 类型（用 `Symbol.for('v-text')` 标记），好处是 `patch` 的分发逻辑统一了——不管遇到什么类型的节点，都走同一套 `switch(type)` 分发，不需要在元素处理逻辑里穿插"顺便处理一下文本子节点"的特判代码。

### 2. Comment 节点渲染：条件渲染的占位符

```typescript
const processCommentNode = (n1, n2, container, anchor) => {
  if (n1 === null) {
    hostInsert(
      (n2.el = hostCreateComment(n2.children || '')),
      container,
      anchor
    )
  } else {
    // 注释节点没有内容更新的场景，直接复用
    n2.el = n1.el
  }
}
```

`v-if` 为 `false` 时，Vue 不会把这个位置的 DOM 彻底清空成"什么都没有"，而是渲染成一个 `<!---->` 注释节点。这样做的核心原因是**保持 DOM 结构的位置稳定**：如果条件为 `false` 时该位置真的没有任何节点，后续条件变为 `true` 需要重新插入内容时，就必须依赖父节点的其他子节点做锚点定位，逻辑会复杂很多；而留一个注释节点占位，`n2.el = n1.el` 直接复用这个占位节点作为锚点，插入新内容时 `anchor` 参数天然就有了着落点。

`normalizeVNode` 里也能看到这个设计的另一处印证——子节点是 `null` 或 `boolean` 时，统一被规范化成一个 Comment 节点，而不是直接跳过：

```typescript
export const normalizeVNode = (child: VNodeChild): VNode => {
  if (child == null || typeof child === 'boolean') {
    return createVNode(Comment)
  }
  // ...
}
```

> **对比 Vue 2**：Vue 2 的 `v-if` 为 `false` 时同样会插入一个空注释节点（`createEmptyVNode` 生成的 VNode 渲染成 `<!---->`），思路是一致的——这不是 Vue 3 的新发明，而是虚拟 DOM 框架处理"条件不成立但要保留位置"的通用解法，Vue 3 只是把它统一到了独立的 VNode 类型体系里。

### 3. Fragment 节点渲染：双锚点系统

Fragment 没有一个真实的容器 DOM 能挂载 `el`，那更新、卸载时怎么知道自己的子节点范围在哪？答案是**用两个空文本节点做首尾锚点**：

```typescript
const processFragment = (n1, n2, container, anchor, parentComponent, parentSuspense, namespace) => {
  // 双锚点系统：标记 Fragment 的边界
  const fragmentStartAnchor = (n2.el = n1 ? n1.el : hostCreateText(''))
  const fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : hostCreateText(''))

  if (n1 == null) {
    // 首次挂载：先插入两个锚点，再把子节点挂载到"结束锚点"之前
    hostInsert(fragmentStartAnchor, container, anchor)
    hostInsert(fragmentEndAnchor, container, anchor)
    mountChildren(n2.children, container, fragmentEndAnchor, parentComponent, parentSuspense, namespace)
  } else {
    // 更新：子节点的 diff 全部以结束锚点为插入参考点
    patchChildren(n1, n2, container, fragmentEndAnchor, parentComponent, parentSuspense, namespace)
  }
}
```

`n2.el` 存的是起始锚点，`n2.anchor` 存的是结束锚点——这也是为什么 VNode 结构里专门多了一个 `anchor` 字段，只有 Fragment 会用到。卸载时同样依赖这两个锚点圈出边界：

```typescript
const removeFragment = (cur, end) => {
  let next
  while (cur !== end) {
    next = hostNextSibling(cur)
    hostRemove(cur)
    cur = next
  }
  hostRemove(end) // 别忘了移除结束锚点本身
}
```

从 `cur`（起始锚点）开始，沿着 DOM 树的兄弟节点一路移除，直到遇到 `end`（结束锚点），最后把结束锚点自己也删掉。

> **对比 Vue 2**：Vue 2 模板层面完全没有 Fragment 概念，模板必须单根节点，这个限制在组件库开发里经常让人头疼（比如一个 `<td>` 组件想要根据条件渲染成多个 `<td>`，Vue 2 只能借助函数式组件的数组返回值这种变通写法）。Vue 3 通过锚点系统正面解决了这个问题，代价是每个 Fragment 会多两个空文本节点，属于"用一点点 DOM 体积换灵活性"的取舍。

### 4. 组件挂载完整流程：三部曲

`patch` 遇到组件类型的 VNode（`shapeFlag & ShapeFlags.COMPONENT`），首次渲染会调用 `mountComponent`，整个流程可以概括成三步（完整函数体见「三、源码解析」）：

```typescript
const instance = (initialVNode.component =
  createComponentInstance(initialVNode, parentComponent, parentSuspense)) // 1. 创建组件实例
setupComponent(instance) // 2. 初始化 props，执行 setup，拿到 render 函数
setupRenderEffect(instance, initialVNode, container, anchor, parentSuspense, namespace) // 3. 建立渲染副作用
```

**第一步**创建一个纯数据结构的组件实例对象，此时还没有任何渲染逻辑执行；**第二步**给这个实例填充 `props`、执行用户写的 `setup` 函数、拿到 `render` 函数；**第三步**把"调用 render 生成 VNode 再 patch 成真实 DOM"这套动作包装成一个响应式副作用（`ReactiveEffect`），首次执行完成挂载，后续只要副作用依赖的响应式数据变化，就会自动重新执行，完成更新。

> **对比 Vue 2**：Vue 2 组件的初始化是一个几乎不可拆分的大函数 `_init`，内部按固定顺序调用 `initLifecycle → initEvents → initRender → initInjections → initState → initProvide → callHook('created')`，`initState` 里又混合了 `props/methods/data/computed/watch` 五种状态的初始化，全部耦合在组件实例的 `_init` 方法里。Vue 3 把这套流程拆成了职责单一的独立阶段——`createComponentInstance` 只管创建实例骨架，`setupComponent` 只管初始化 props/slots 和执行 `setup`，`setupRenderEffect` 只管建立响应式渲染循环。这种拆分不仅让代码更好维护，也让 Vue 3 能够在 `setupComponent` 之外单独复用"创建组件实例"这个能力（比如测试场景、SSR 场景）。

### 5. 组件实例数据结构

`createComponentInstance` 返回的实例对象，核心字段如下（完整字段列表见「三、源码解析」）：

```typescript
export interface ComponentInternalInstance {
  vnode: VNode              // 组件对应的虚拟节点
  subTree: VNode             // render 函数执行后生成的子树 VNode，用于下次更新时 diff
  render: InternalRenderFunction | null  // 最终使用的渲染函数
  proxy: any | null          // 组件实例的代理对象，render 函数里访问 this 实际访问的是它
  props: Data                // 声明过的 props（响应式）
  attrs: Data                // 未在 props 中声明的属性（透传属性）
  setupState: Data           // setup() 返回对象时，proxyRefs 处理后的结果
  isMounted: boolean         // 是否已挂载
}
```

`instance.proxy` 是理解 Vue 3 组件渲染上下文的关键——`render` 函数执行时用的 `this`（或 Composition API 里模板编译产物访问的 `_ctx`）不是直接访问 `data`/`props`/`setupState`，而是通过一层 `Proxy` 统一代理：

```typescript
export const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { data, props, setupState } = instance
    if (data && hasOwn(data, key)) return data[key]
    else if (props && hasOwn(props, key)) return props[key]
    else if (setupState && hasOwn(setupState, key)) return setupState[key]
    // 兜底：$el/$data/$props 等公共属性
    const publicGetter = publicPropertiesMap[key]
    if (publicGetter) return publicGetter(instance)
  }
}
```

按 `data → props → setupState` 的优先级依次查找——这也解释了为什么 `setup()` 返回的同名变量会"覆盖"`props`（实际是查找顺序里 `setupState` 排在后面才对，需要注意实际优先级由具体实现的查找顺序决定，重点是三者被统一到了一个 `Proxy` 之下，模板里不需要关心一个变量究竟来自哪里）。

顺带一提，实例上还有 `instance.slots` 字段——它的完整实现（插槽内容如何跨组件传递、具名插槽/作用域插槽怎么编译）属于下一篇 Composition API 深度拆解的范围，这里先知道字段存在即可；`instance.emit` 已经有最小可用的实现，下一小节讲 `setup()` 的 `context` 参数时会展开。

> **对比 Vue 2**：Vue 2 组件实例是直接就是 `this`——`vm.$data`、`vm.$props`、`vm._data` 这些属性平铺在实例对象上，`data` 里的字段通过 `Object.defineProperty` 代理到 `vm` 本身（即访问 `this.name` 实际访问的是 `vm._data.name` 的代理）。Vue 3 用一层独立的 `Proxy` 把 `data/props/setupState` 收敛到一起，本身不是实例对象的直接属性，而是运行时按需查找——这个设计变化的意义在于：Composition API 下一个组件的状态来源变多了（`data`、`props`、多个 `setup` 返回值合并），如果还像 Vue 2 那样逐个 `defineProperty` 挂到实例上，字段命名冲突、响应式追踪的开销都会显著增加，统一走 `Proxy.get` 动态查找反而更清晰。

### 6. `setup()` 返回值处理：函数还是对象

```typescript
const { setup } = Component
if (setup) {
  const setupContext = createSetupContext(instance)
  setCurrentInstance(instance)
  const setupResult = setup(instance.props, setupContext)
  setCurrentInstance(null)

  if (isFunction(setupResult)) {
    // 返回函数：直接作为组件的 render 函数，优先级高于 render 选项
    instance.render = setupResult
  } else {
    // 返回对象：经过 proxyRefs 处理（自动解包 ref），作为 setupState
    instance.setupState = proxyRefs(setupResult)
  }
}
```

`setup()` 的返回值有两种截然不同的走向：

- **返回一个函数** → 这个函数本身就被当成 `render` 函数使用，写法上等价于「用 JS 完全接管渲染逻辑」，模板编译产物这条路完全被绕开；
- **返回一个对象** → 经过 `proxyRefs` 处理后存到 `instance.setupState`，最终由 `instance.proxy` 统一代理暴露出去，供模板编译产物生成的 `render` 函数访问。

```typescript
const App = {
  setup(props) {
    const name = ref('张三')
    // 写法 A：返回函数，自己接管渲染
    return () => h('div', {}, name.value)
    // 写法 B：返回对象，配合模板/选项式 render 使用
    // return { name }
  }
}
```

`proxyRefs` 的作用是让 `setupState` 里的 ref 在模板/`render` 里访问时自动解包（不需要写 `.value`），这也是为什么 `<template>` 里可以直接 `{{ count }}` 而不是 `{{ count.value }}`。

返回对象这条路，在笔记的完整示例里还有一个高频组合——`reactive` 对象配合 `toRefs` 展开后一起返回：

```typescript
const App = {
  setup(props) {
    const name = ref('张三')
    const age = ref(34)
    const state = reactive({ w: 70, h: 170 }) // 多个字段打包成响应式对象

    return {
      ...toRefs(state), // 解构展开，但保持每个字段与 state 的响应式连接
      name,
      age,
    }
  },
  render(proxy) {
    return h('div', {}, [
      h('p', {}, `姓名：${proxy.name}`),
      h('p', {}, `体重：${proxy.w}`),  // 访问的是 setup 返回对象里的 w
    ])
  }
}
```

这里 `toRefs(state)` 不是可有可无的装饰：`reactive` 对象直接展开成 `{ w, h }` 会丢失与 `state` 的响应式连接（解构出来的只是那一刻的快照值），必须用 `toRefs` 把每个字段包成 `ref` 再展开，`proxy.w` 的访问才能继续收集到 `state.w` 的依赖。

注意上面选项式 `render(proxy)` 的写法——`render` 函数被调用时（`render.call(instance.proxy, instance.proxy)`，见「三、源码解析」），**第一个参数就是组件实例的 `proxy`**，`proxy.name` 与 `this.name` 访问的是同一个代理对象，只是换了种取法。这是笔记里的惯用写法：`setup` 返回对象时，选项式 `render` 通过参数 `proxy` 直接取 `setupState` 里的字段，不依赖 `this` 的隐式绑定。

> **对比 Vue 2**：Vue 2 的 `render(h)` 只能通过 `this.name` 访问 `data` 里的字段，`this` 是框架隐式绑定的组件实例，写法上"名字从哪来"是不可见的。Vue 3 的 `render(proxy)` 把上下文显式化为第一个参数，配合 `setup` 返回对象这一机制，`render` 函数变成了"入参 `proxy`、出参 VNode"的纯函数形态——这与 Vue 3 整个设计里"把隐式的 `this` 上下文换成显式参数"的思路一脉相承（`setup(props, context)` 同理）。

`setup(props, context)` 的第二个参数 `context` 也不是凭空来的，是 `createSetupContext(instance)` 构造出来的 `{ attrs, slots, emit, expose }`，其中 `emit` 已经有了最小可用的实现——把事件名转驼峰再拼成 `onXxx`，去 `instance.vnode.props` 里找父组件传入的处理函数并调用（完整代码见「三、源码解析」）：

```typescript
const emit = (event, ...args) => {
  const name = camelize(event) // my-click ==> myClick
  const eventName = `on${name[0].toUpperCase()}${name.slice(1)}` // myClick ==> onMyClick
  const handler = instance.vnode.props[eventName]
  handler && handler(...args)
}
```

这是组件自定义事件通信的雏形——本质就是"父组件通过 `onXxx` 传一个函数下来，子组件在 `emit` 里把它找出来调用"，没有真正的事件总线。完整的父子组件事件通信机制（含事件名大小写归一化的更多细节）留到下一篇《Composition API 深度拆解》展开。

> **对比 Vue 2**：Vue 2 没有这种"渲染函数二选一"的机制——`render` 选项和 `data`/`methods` 是两条独立的通道，`render(h)` 拿到的 `h` 是唯一的渲染入口。Vue 3 的 `setup` 返回函数这种写法，本质是把"渲染逻辑"下放到 `setup` 内部，让一个组件可以完全脱离 `<template>` 或 `render` 选项，纯靠 Composition API 组织；这也是 `defineComponent` 之外很多无渲染组件库（Headless UI）能实现的基础。

### 7. 组件更新流程

组件的 props 或父组件重新渲染时，`patch` 遇到已存在的组件 VNode 会走 `updateComponent`——先由 `shouldUpdateComponent` 判断 props/children 是否真的变化（没变化就直接复用旧 `el`，跳过整个更新流程），需要更新时标记 `instance.next = n2` 并触发 `instance.update()`（完整代码见「三、源码解析」）：

```typescript
const instance = (n2.component = n1?.component) // 复用组件实例
if (shouldUpdateComponent(n1, n2)) {
  instance.next = n2   // 标记有新的 vnode 待处理（属性/插槽更新）
  instance.update()    // 触发响应式副作用重新执行
} else {
  n2.el = n1.el         // 没变化，直接复用旧 el
}
```

如果确实需要更新，`instance.update()` 触发的 `componentUpdateFn` 里会先调用 `updateComponentPreRender` 把新的 props 同步进实例（内部调用 `updateProps`），再重新执行 `render` 生成新的子树，最后对新旧子树做 `patch`。

完整链路串起来就是：**props 变化或组件内部响应式数据变化 → 触发 render 副作用 → 若有新 vnode 先同步 props → 重新调用 render 生成 nextTree → `patch(prevTree, nextTree)`**，跟第 3 篇讲的元素更新是同一套 `patch` 机制，只是"谁来触发"和"谁负责生成新 VNode"多了一层组件实例的中转。

`updateComponentPreRender` 里调用的 `updateProps` 具体做了两件事：用新的 `rawProps` 逐个覆盖 `instance.props`；再用 `Reflect.deleteProperty` 把旧 props 里、新 props 已经不存在的字段删掉（完整代码见「三、源码解析」）。因为 `instance.props` 本身是 `reactive` 包装过的响应式对象，这里是"就地修改"而不是整体替换引用，这样才能保证 `render` 函数里访问 `props.xxx` 建立的依赖收集在更新后依然有效。

> **对比 Vue 2**：Vue 2 组件更新的触发源是 `Watcher`——`data` 里的响应式属性被访问时收集依赖，变化时通知 `Watcher` 重新执行 `updateComponent`（本质也是重新调用 `render` + `patch`）。Vue 3 把这个角色换成了通用的 `ReactiveEffect`，`props` 变化和内部响应式数据变化统一走同一条"触发副作用重新执行"的路径，不像 Vue 2 里 `props` 更新和 `data` 更新分属父组件 `patchVnode` 触发和子组件 `Watcher` 触发两条不完全相同的路径，Vue 3 的统一性更强。

### 8. 组件的 `key`：变化即强制重建

`patch` 判断新旧节点能否复用的依据是 `isSameVNodeType`：

```typescript
export function isSameVNodeType(n1: VNode, n2: VNode): boolean {
  return n1.type === n2.type && n1.key === n2.key
}
```

这套判断对元素节点和组件节点是同一套逻辑——`type` 和 `key` 必须同时相等才会走"更新"分支，否则直接卸载旧节点、挂载新节点。对元素节点来说，`key` 变化顶多是重新创建一个 DOM 元素；但对组件来说，`key` 变化意味着**整个组件实例被销毁重建**——`setup()` 会重新执行一遍，内部所有 `ref`/`reactive` 状态、注册的响应式副作用全部丢失，取而代之的是一个全新的组件实例。这个后果比元素节点重建严重得多，也正因如此，"用 `key` 强制重建组件"才成为一种常见的生产实践（后文最佳实践部分会展开）。

### 9. 函数式组件的实现原理：没有实例的纯函数

```typescript
const DrugBadge = (props) => {
  return h('span', { class: 'badge' }, props.name)
}

render(h(DrugBadge, { name: '阿莫西林' }), app)
```

函数式组件本质就是一个 `(props, context) => VNode` 的纯函数。它在 `createVNode` 阶段就被区别对待——`isFunction(type)` 时标记为 `ShapeFlags.FUNCTIONAL_COMPONENT`（完整判断分支见「三、源码解析」vnode.ts）；渲染时 `renderComponentRoot` 会根据这个 `shapeFlag` 分流，有状态组件走 `render.call(proxy, proxy)`，函数式组件直接调用这个函数本身，没有 `proxy`，没有 `this`（完整实现见「三、源码解析」componentRenderUtils.ts）：

```typescript
// renderComponentRoot 分流片段
if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
  return normalizeVNode(render.call(proxy, proxy))
} else {
  const render = Component as Function
  const hasProps = Object.keys(props ?? {}).length > 0
  return normalizeVNode(render(hasProps ? props : attrs, null)) // 函数式组件：直接调用
}
```

关键在于函数式组件**从头到尾没有走 `createComponentInstance` 的组件实例创建流程**（准确说是不需要为它建立带响应式渲染副作用的完整实例生命周期），`setupComponent` 里的 `initProps`/`setup()` 调用、`instance.proxy` 的 `Proxy` 包装全部被跳过；每次父组件重新渲染，函数式组件对应的这部分内容就是简单地重新调用一次这个纯函数，没有 `subTree` 缓存可复用，也没有独立的 `ReactiveEffect` ——它的"更新"完全依附在父组件的渲染副作用里发生，自己不产生任何响应式追踪开销。

`renderComponentRoot` 外面还包了一层 `try/catch`（完整代码见「三、源码解析」componentRenderUtils.ts）：不管是有状态组件的 `render.call` 还是函数式组件的直接调用，只要执行过程中抛出异常，都会被捕获并降级为一个空的 `Comment` 节点，而不是让异常直接冒泡炸掉整棵组件树——这跟前面 Comment 小节"用注释节点占位保持 DOM 结构稳定"是同一个思路的延伸：渲染函数出错时，宁可页面上少一块内容，也不能让一个子组件的 bug 拖垮整个应用的渲染。

> **对比 Vue 2**：Vue 2 也支持函数式组件，但需要显式声明 `functional: true` 选项，写法上是 `{ functional: true, render(h, context) { ... } }`，`context` 里包含 `props/children/slots/data` 等信息代替 `this`。Vue 3 不再需要这个显式声明——只要组件本身是一个函数（而不是一个包含 `setup`/`render`/`data` 的选项对象），类型检测阶段就自动识别为函数式组件，写法上更接近"就是一个普通函数"，认知负担更低。两者的性能收益点是一致的：跳过实例化开销、没有响应式状态追踪，适合渲染大量结构简单的纯展示节点。

---

## 🧩 三、源码解析（重点代码，来源 GitHub 仓库，对齐 Vue 3.4）

以下代码按笔记 14 → 18 → 23 的开发主线，从 `vnode.ts` 的类型标记，到 `renderer.ts` 的挂载/更新/卸载，再到 `component.ts`/`componentProps.ts`/`componentPublicInstance.ts`/`componentRenderUtils.ts`/`scheduler.ts` 的支撑代码，按文件逐一走一遍，尽量还原每一处改动解决的具体问题。

### vnode.ts：特殊类型标记与组件相关字段

Text/Comment/Fragment 三个类型标记的定义位置，以及后续组件相关字段的引入：

```typescript
export const Text = Symbol.for('v-text')
export const Comment = Symbol.for('v-cmt')
export const Fragment = Symbol.for('v-fgt')

export type VNodeTypes =
  | string
  | Component
  | VNode
  | typeof Text
  | typeof Comment
  | typeof Fragment
```

`VNode` 接口新增了 `component`（组件实例引用，只有组件类型的 VNode 才会赋值）和 `anchor`（Fragment 专用的结束锚点）两个字段：

```typescript
export interface VNode<
  HostNode = RendererNode,
  HostElement = RendererElement,
  ExtraProps = { [key: string]: any }
> {
  __v_isVNode: true
  type: VNodeTypes
  key: PropertyKey | null
  props: (VNodeProps & ExtraProps) | null
  children: VNodeNormalizedChildren
  component: ComponentInternalInstance | null // 组件实例
  el: HostNode | null
  anchor: HostNode | null // Fragment 结束锚点
  shapeFlag: number
}
```

`createBaseVNode` 的 `shapeFlag` 默认值不能再简单地"是字符串就是元素"——Fragment 没有真实容器，默认值要单独处理为 `0`：

```typescript
function createBaseVNode(
  type: VNodeTypes,
  props: (VNodeProps | Record<string, unknown>) | null = null,
  children: unknown = null,
  shapeFlag: number = type === Fragment ? 0 : ShapeFlags.ELEMENT
) {
  const vnode = {
    __v_isVNode: true,
    type, props, children,
    component: null, // 组件实例
    shapeFlag,
    el: null,
    key: props && normalizeKey(props),
  } as VNode
  // 子节点类型标记逻辑（TEXT_CHILDREN/ARRAY_CHILDREN）与第 3 篇一致，此处省略
  return vnode
}
```

`_createVNode` 需要在"元素"和"无类型"之外，新增"有状态组件"和"函数式组件"两种判断分支——这正是组件和函数式组件在 VNode 创建阶段就被区分对待的地方：

```typescript
function _createVNode(
  type: VNodeTypes,
  props: (VNodeProps | Record<string, unknown>) | null = null,
  children: unknown = null
): VNode {
  const shapeFlag = isString(type)      // 元素节点
    ? ShapeFlags.ELEMENT
    : isObject(type)                     // 有状态组件（选项对象）
    ? ShapeFlags.STATEFUL_COMPONENT
    : isFunction(type)                   // 函数式组件（普通函数）
    ? ShapeFlags.FUNCTIONAL_COMPONENT
    : 0
  return createBaseVNode(type, props, children, shapeFlag)
}
```

组件挂载时，透传属性（`attrs`）需要合并进组件渲染出的根节点 `props` 上，`class`/`style` 要合并而不是覆盖，事件监听器（`onXxx`）要支持多个处理函数并存，这是 `mergeProps` 存在的原因：

```typescript
export function mergeProps(...args: (Data & VNodeProps)[]) {
  const ret: Data = {}
  for (let i = 0; i < args.length; i++) {
    const toMerge = args[i]
    for (const key in toMerge) {
      if (key === 'class') {
        if (ret.class !== toMerge.class) {
          ret.class = normalizeClass([ret.class, toMerge.class])
        }
      } else if (key === 'style') {
        ret.style = normalizeStyle([ret.style, toMerge.style])
      } else if (isOn(key)) {
        const existing = ret[key]
        const incoming = toMerge[key]
        if (
          incoming &&
          existing !== incoming &&
          !(isArray(existing) && existing.includes(incoming))
        ) {
          ret[key] = existing ? [].concat(existing as any, incoming as any) : incoming
        }
      } else if (key !== '') {
        ret[key] = toMerge[key]
      }
    }
  }
  return ret
}
```

### renderer.ts：patch 分发与组件的挂载、更新、卸载

`patch` 的完整分发入口，`processText`/`processCommentNode`/`processFragment` 三个函数的实现见「二、原理」对应小节，这里不重复贴代码：

```typescript
const patch = (n1, n2, container, anchor = null, parentComponent = null, parentSuspense = null, namespace = undefined) => {
  if (n1 === n2) return
  if (n1 && !isSameVNodeType(n1, n2)) {
    unmount(n1, parentComponent, parentSuspense, true)
    n1 = null
  }
  const { type, shapeFlag } = n2
  switch (type) {
    case Text:
      processText(n1, n2, container, anchor)
      break
    case Comment:
      processCommentNode(n1, n2, container, anchor)
      break
    case Fragment:
      processFragment(n1, n2, container, anchor, parentComponent, parentSuspense, namespace)
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(n1, n2, container, anchor, parentComponent, parentSuspense, namespace)
      } else if (shapeFlag & ShapeFlags.COMPONENT) {
        processComponent(n1, n2, container, anchor, parentComponent, parentSuspense, namespace)
      }
      break
  }
}

const processComponent = (n1, n2, container, anchor, parentComponent, parentSuspense, namespace) => {
  if (n1 === null) {
    mountComponent(n2, container, anchor, parentComponent, parentSuspense, namespace)
  } else {
    updateComponent(n1, n2)
  }
}
```

组件挂载三部曲——完整实现（「原理」小节只摘了三行核心调用，这里是完整函数体）：

```typescript
const mountComponent: MountComponentFn = (
  initialVNode, container, anchor, parentComponent, parentSuspense, namespace
) => {
  // vnode 指向组件的虚拟节点，subTree 指向组件 render 函数返回的虚拟节点
  //! 核心逻辑三部曲
  // 1. 创建组件实例
  const instance = (initialVNode.component =
    createComponentInstance(initialVNode, parentComponent, parentSuspense))
  // 2. 初始化组件实例：给实例添加 props、proxy、render 等属性
  setupComponent(instance)
  // 3. 创建组件实例的渲染副作用（render effect）并立即执行
  setupRenderEffect(instance, initialVNode, container, anchor, parentSuspense, namespace)
}
```

`setupRenderEffect` 完整实现（挂载与更新共用一个 `componentUpdateFn`，靠 `instance.isMounted` 分流；笔记 23 之后渲染入口收敛为 `renderComponentRoot`，它内部才是有状态/函数式组件的分流点，见 componentRenderUtils.ts）：

```typescript
const setupRenderEffect: SetupRenderEffectFn = (
  instance, initialVNode, container, anchor, parentSuspense, namespace
) => {
  const componentUpdateFn = () => {
    if (!instance.isMounted) {
      // subTree 缓存首次渲染产生的 vnode，用于后续更新时 diff
      const subTree = (instance.subTree = renderComponentRoot(instance))
      subTree.props = mergeProps(instance.attrs, subTree.props)
      patch(null, subTree, container, anchor, null, parentSuspense, namespace)
      initialVNode.el = subTree.el
      instance.isMounted = true
    } else {
      // 有 next 说明是属性/插槽更新，先同步 props 再重新 render
      if (instance.next) {
        updateComponentPreRender(instance, instance.next)
      }
      const nextTree = renderComponentRoot(instance)
      const prevTree = instance.subTree
      nextTree.props = mergeProps(instance.attrs, nextTree.props)
      instance.subTree = nextTree
      patch(prevTree, nextTree, hostParentNode(prevTree.el), anchor, null, parentSuspense, namespace)
    }
  }

  // 用响应式副作用包装整个更新流程，数据变化时通过调度器异步执行，避免同步频繁更新
  const effect = new ReactiveEffect(componentUpdateFn, () => {
    queueJob(update)
  })
  const update = instance.update = effect.run.bind(effect)
  update() // 立即执行一次，完成首次挂载
}
```

组件更新的入口和 props 预处理：

```typescript
const updateComponent = (n1: VNode, n2: VNode) => {
  //! 组件更新的方式有三种：状态[data]、属性[props]、插槽[slot]
  const instance = (n2.component = n1?.component) // 复用组件实例
  if (shouldUpdateComponent(n1, n2)) {
    instance.next = n2 // 有 next 说明是属性或插槽更新，否则为状态更新
    instance.update()  // 触发响应式副作用重新执行
  } else {
    n2.el = n1.el
    instance.vnode = n2
  }
}

const updateComponentPreRender = (instance: ComponentInternalInstance, nextVNode: VNode) => {
  nextVNode.component = instance
  const prevProps = instance.vnode.props
  instance.vnode = nextVNode
  instance.next = null
  updateProps(instance, nextVNode.props, prevProps) // 更新 props（见 componentProps.ts）
}
```

组件的卸载：`unmount` 不再是简单粗暴地 `hostRemove(vnode.el)`，需要先判断是不是 Fragment（Fragment 要遍历双锚点区间逐个移除，见「二、原理」Fragment 小节的 `removeFragment`），这一段是当前文章此前完全没提到的卸载路径：

```typescript
const unmount: UnmountFn = (vnode, parentComponent, parentSuspense, doRemove = false, optimize = false) => {
  remove(vnode)
}

const remove: RemoveFn = (vnode) => {
  const { el, type, anchor } = vnode
  if (type === Fragment) {
    removeFragment(el, anchor) // 双锚点区间遍历移除，实现见「二、原理」Fragment 小节
    return
  }
  hostRemove(el as HostNode)
}
```

### component.ts：组件实例创建、setup 执行、setup 上下文

`createComponentInstance` 完整字段（「原理」小节只列了核心几个字段辅助理解结构，这里是笔记里的完整初始化）：

```typescript
export function createComponentInstance(
  vnode: VNode,
  parent: ComponentInternalInstance | null,
  suspense: any | null
): ComponentInternalInstance {
  const instance = {
    vnode, parent, root: null, subTree: null, suspense,
    type: vnode.type,
    update: null, render: null, renderCache: [],
    ctx: EMPTY_OBJ,
    exposed: null, exposeProxy: null, proxy: null,
    propsOptions: (vnode.type as any)?.props || {},
    data: EMPTY_OBJ, props: EMPTY_OBJ, attrs: EMPTY_OBJ,
    emit: null, slots: EMPTY_OBJ, setupState: EMPTY_OBJ,
    isMounted: false,
  }
  instance.ctx = { _: instance }
  instance.root = parent ? parent.root : instance
  return instance
}
```

`setupStatefulComponent` 完整实现：

```typescript
function setupStatefulComponent(instance: ComponentInternalInstance) {
  const { props, children } = instance.vnode
  initProps(instance, props)
  const Component = instance.type
  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers)

  const { setup } = Component
  if (setup) {
    const setupContext = createSetupContext(instance)
    setCurrentInstance(instance)
    const setupResult = setup(instance.props, setupContext)
    setCurrentInstance(null)
    if (isFunction(setupResult)) {
      instance.render = setupResult
    } else {
      instance.setupState = proxyRefs(setupResult)
    }
  }

  const data: Function = Component.data
  if (data) {
    instance.data = reactive(data.call(instance.proxy))
  }
  if (!instance.render) {
    instance.render = Component.render
  }
}
```

`setup(props, context)` 里的 `context` 不是凭空来的，是 `createSetupContext` 构造出来的；`emit` 也不是一个空壳，笔记 18 里已经给出了最小可用的实现——把事件名转成驼峰再拼成 `onXxx`，去 `instance.vnode.props` 里找父组件传入的处理函数并调用（完整的父子组件事件通信机制，包括 `emit` 独立拆到 `componentEmits.ts`、增加 `isUnmounted` 卸载后拦截，留到下一篇 Composition API 深度拆解展开）：

```typescript
export let currentInstance: ComponentInternalInstance | null = null

export const getCurrentInstance: () => ComponentInternalInstance | null = () => currentInstance

export function setCurrentInstance(instance: ComponentInternalInstance) {
  currentInstance = instance
  return () => (currentInstance = null)
}

export function createSetupContext(instance: ComponentInternalInstance): SetupContext {
  const expose: SetupContext['expose'] = exposed => {
    instance.exposed = exposed || {}
  }

  const emit = (event, ...args) => {
    const name = camelize(event) // 短横线转驼峰
    const eventName = `on${name[0].toUpperCase()}${name.slice(1)}` // myClick ==> onMyClick
    const handler = instance.vnode.props[eventName]
    handler && handler(...args)
  }

  return {
    attrs: instance.attrs,
    slots: instance.slots,
    emit,
    expose,
  }
}
```

### componentPublicInstance.ts：渲染上下文代理

`PublicInstanceProxyHandlers` 不只有 `get`，还有 `set`——这是"为什么直接修改 `props` 会被拦截并警告"的直接出处：

```typescript
export const publicPropertiesMap = extend(Object.create(null), {
  $i: i => i,
  $el: i => i.vnode.el,
  $data: i => i.data,
  $props: i => i.props,
  $attrs: i => i.attrs,
  $slots: i => i.slots,
  $refs: i => i.refs,
  $parent: i => getPublicInstance(i.parent),
  $root: i => getPublicInstance(i.root),
  $emit: i => i.emit,
  $options: i => i.type
})

export const PublicInstanceProxyHandlers = {
  get({ _: instance }: ComponentRenderContext, key, receiver) {
    const { data, props, setupState } = instance
    if (data && hasOwn(data, key)) {
      return data[key]
    } else if (props && hasOwn(props, key)) {
      return props[key]
    } else if (setupState && hasOwn(setupState, key)) {
      return setupState[key]
    }
    const publicGetter = publicPropertiesMap[key]
    if (publicGetter) {
      return publicGetter(instance)
    }
  },
  set({ _: instance }: ComponentRenderContext, key, value, receiver) {
    const { data, props, setupState } = instance
    if (data && hasOwn(data, key)) {
      data[key] = value
    } else if (props && hasOwn(props, key)) {
      console.warn(`Attempting to mutate prop "${key}". Props are readonly.`)
      return false
    } else if (setupState && hasOwn(setupState, key)) {
      setupState[key] = value
    }
    return true
  }
}
```

### componentProps.ts：props 归类与更新

`initProps` 按组件声明的 `propsOptions` 把父组件传入的原始属性一分为二：

```typescript
export function initProps(instance: ComponentInternalInstance, rawProps: Data | null, isStateful?: number) {
  const props: Data = {}
  const attrs: Data = createInternalObject()
  const propsOptions = instance.propsOptions

  if (rawProps) {
    for (const key in rawProps) {
      const value = rawProps[key]
      if (key in propsOptions) {
        props[key] = value   // 声明过的属性 → props
      } else {
        attrs[key] = value   // 未声明的属性 → attrs（透传属性）
      }
    }
  }
  // 原则上 props 只有第一层是响应式的（源码内部实际使用 shallowReactive）
  instance.props = reactive(props)
  instance.attrs = attrs
}
```

`updateProps` 是「组件更新流程」小节里 `updateComponentPreRender` 调用的那一步，之前文章只提了一句话，这里补上具体实现——用新 `rawProps` 逐个覆盖 `instance.props`，再用 `Reflect.deleteProperty` 把旧 props 里、新 props 已经不存在的字段删掉：

```typescript
export function updateProps(instance: ComponentInternalInstance, rawProps: Data, rawPrevProps: Data) {
  if (hasPropsChanged(rawPrevProps, rawProps)) {
    for (const key in rawProps) {
      instance.props[key] = rawProps[key]
    }
    for (const key in rawPrevProps) {
      if (!(key in rawProps)) {
        Reflect.deleteProperty(instance.props, key)
      }
    }
  }
}
```

### internalObject.ts：给 attrs 打一个"内部对象"标记

`attrs` 用一个特殊原型的对象来创建，而不是普通的 `{}`——目的是后续可以用 `isInternalObject` 快速判断某个对象是不是框架内部生成的 `attrs`，避免和用户自己写的普通对象混淆（比如在做浅比较、序列化时需要区别对待）：

```typescript
const internalObjectProto = {}
export const createInternalObject = () => Object.create(internalObjectProto)
export const isInternalObject = (obj: object) => Object.getPrototypeOf(obj) === internalObjectProto
```

### componentRenderUtils.ts：更新判定与渲染分流

`shouldUpdateComponent`/`hasPropsChanged` 之前只在「原理」部分用文字描述，这里贴出真实源码：

```typescript
export function shouldUpdateComponent(prevVNode: VNode, nextVNode: VNode) {
  const { props: prevProps, children: prevChildren } = prevVNode
  const { props: nextProps, children: nextChildren } = nextVNode

  if (prevChildren || nextChildren) return true // 有插槽，直接重新渲染
  if (prevProps === nextProps) return false
  if (!prevProps) return !!nextProps
  if (!nextProps) return true
  return hasPropsChanged(prevProps, nextProps)
}

export function hasPropsChanged(prevProps: Data, nextProps: Data) {
  const prevKeys = Object.keys(prevProps)
  const nextKeys = Object.keys(nextProps)
  if (prevKeys.length !== nextKeys.length) return true
  for (const key in nextProps) {
    return prevProps[key] !== nextProps[key]
  }
  return false
}
```

`renderComponentRoot` 是组件渲染的统一入口——`setupRenderEffect` 里挂载和更新都通过它拿到子树，它内部再按 `shapeFlag` 在有状态组件和函数式组件之间分流，并且用 `try/catch` 兜底（这是笔记 23 引入函数式组件时把渲染入口收敛到这里的原因）：

```typescript
export function renderComponentRoot(instance: ComponentInternalInstance): VNode {
  const { render, vnode, proxy, props, type: Component, attrs } = instance
  let result
  try {
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      result = normalizeVNode(render.call(proxy, proxy))
    } else {
      const render = Component as Function
      const hasProps = Object.keys(props ?? {}).length > 0
      result = normalizeVNode(render(hasProps ? props : attrs, null))
    }
  } catch (error) {
    result = createVNode(Comment) // 渲染异常时降级为空注释节点，避免整棵树崩溃
    console.error(error)
  }
  return result
}
```

### scheduler.ts：异步更新调度器

组件更新为什么是"异步、合并多次修改只触发一次渲染"，底层就是这个微任务队列——之前文章只用一句话带过，这里贴出完整调度器源码：

```typescript
export interface SchedulerJob extends Function {
  id?: number
  pre?: boolean
  active?: boolean
  computed?: boolean
  allowRecurse?: boolean
  i: any
}

const queue: SchedulerJob[] = []
let isFlushing = false
const resolvePromise = Promise.resolve()

export function queueJob(job: SchedulerJob) {
  // 队列中没有 job 或者 job 不存在于队列中，才添加，避免同一个 job 被重复排队
  if (!queue.length || !queue.includes(job)) {
    queue.push(job)
  }
  queueFlush()
}

function queueFlush() {
  if (!isFlushing) {
    isFlushing = true
    // 借助微任务，等当前这一轮同步代码（可能连续多次修改响应式数据）执行完毕后再统一刷新
    resolvePromise.then(flushJobs)
  }
}

function flushJobs() {
  isFlushing = false
  let job
  while (job = queue.shift()) {
    job()
  }
}
```

`queueJob` 用 `queue.includes(job)` 去重，保证同一个组件在一轮同步代码里被多次触发更新，最终也只会执行一次 `componentUpdateFn`；`resolvePromise.then(flushJobs)` 是把刷新动作丢进微任务队列，等当前宏任务的所有同步代码跑完再统一执行——这就是为什么 `setTimeout` 里连续改两次响应式数据，页面只会重新渲染一次的原因。

---

## 🧩 四、生产级最佳实践

### props 类型校验与默认值

笔记里的极简实现只做了 `props`/`attrs` 的归类拆分，没有做类型校验——生产级的 Vue 3 在开发模式下会有一层独立的 `validateProps`，对照 `propsOptions` 逐一检查：

```typescript
const DrugDetail = {
  props: {
    drugId: { type: String, required: true },       // 必填 + 类型校验
    quantity: { type: Number, default: 1 },           // 默认值
    unit: {
      type: String,
      validator: (value: string) => ['盒', '片', '支'].includes(value) // 自定义校验
    }
  }
}
```

在医疗场景里，`drugId` 缺失或类型不对是一个比普通业务更严重的问题——用错药品 ID 关联到别的药品说明书，属于生产事故级别的 bug，所以 `required: true` 的告警在开发阶段就应该暴露出来，而不是等到线上渲染出错误内容才被发现。

### 函数式组件的适用场景

纯展示型、无状态、不需要生命周期钩子的叶子组件是函数式组件的最佳战场：药品列表里的单条 `DrugListItem`、状态徽标 `StatusBadge`，这类组件在长列表场景下会被高频创建/销毁，用函数式组件跳过实例化（无 `createComponentInstance`、无独立 `ReactiveEffect`）能明显降低渲染开销。反过来，如果组件内部需要 `ref`/生命周期钩子/插槽逻辑，就不适合强行做成函数式——那样反而要在外部手动传入一堆本该由组件自己管理的状态。

### 组件强制重建的场景

```html
<!-- 切换患者时，用 key 强制销毁重建整个诊断表单，避免手写重置逻辑遗漏字段 -->
<DiagnosisForm :key="patientId" :patient-id="patientId" />
```

诊断表单内部往往有一堆 `ref`/`reactive` 状态（当前填写的症状、用药记录、备注），切换患者时如果不重建组件，就必须在 `watch(() => props.patientId, ...)` 里手动把每一个内部状态重置一遍，一旦漏掉一个字段就是线上 bug；用 `key` 绑定 `patientId`，让 `isSameVNodeType` 判定为不同节点直接销毁重建，是最不容易出错的做法——代价是重新执行一次 `setup`，对于表单这种低频操作完全可以接受。

### 组件更新性能排查

Vue Devtools 的组件面板勾选「Highlight updates when components render」，可以直观看到哪些组件在响应式数据变化时被重新渲染；更细粒度的排查依赖 `onRenderTracked`/`onRenderTriggered` 两个生命周期钩子，能精确定位到"这次重渲染是被哪个响应式属性的哪次操作触发的"——这两个钩子的完整实现放在下一篇《Composition API 深度拆解》里展开。

---

## 🧩 五、手写实现（可独立跑通）

环境沿用第 1 篇的 Vite + TypeScript 配置；`mountElement`/`patchElement`/`patchChildren`/`patchKeyedChildren`（Diff 算法）等渲染器基础骨架已经在第 2、3 篇实现完毕，这里不重复贴出。以下是本章新增/改动的完整代码，逐文件列出，与笔记原文逐字一致，可以直接复制到对应文件里跑通。

### vnode.ts（新增部分）

```typescript
export const Text = Symbol.for('v-text')
export const Comment = Symbol.for('v-cmt')
export const Fragment = Symbol.for('v-fgt')

export type VNodeTypes =
  | string
  | Component
  | VNode
  | typeof Text
  | typeof Comment
  | typeof Fragment

export interface VNode<
  HostNode = RendererNode,
  HostElement = RendererElement,
  ExtraProps = { [key: string]: any }
> {
  __v_isVNode: true
  type: VNodeTypes
  key: PropertyKey | null
  props: (VNodeProps & ExtraProps) | null
  children: VNodeNormalizedChildren
  component: ComponentInternalInstance | null
  el: HostNode | null
  anchor: HostNode | null
  shapeFlag: number
}

function createBaseVNode(
  type: VNodeTypes,
  props: (VNodeProps | Record<string, unknown>) | null = null,
  children: unknown = null,
  shapeFlag: number = type === Fragment ? 0 : ShapeFlags.ELEMENT
) {
  const vnode = {
    __v_isVNode: true,
    type,
    props,
    children,
    component: null,
    shapeFlag,
    el: null,
    key: props && normalizeKey(props),
  } as VNode

  if (children) {
    let type = 0
    if (isArray(children)) {
      type = ShapeFlags.ARRAY_CHILDREN
    } else {
      type = ShapeFlags.TEXT_CHILDREN
    }
    vnode.shapeFlag |= type
  }

  return vnode
}

function _createVNode(
  type: VNodeTypes,
  props: (VNodeProps | Record<string, unknown>) | null = null,
  children: unknown = null
): VNode {
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT
    : isFunction(type)
    ? ShapeFlags.FUNCTIONAL_COMPONENT
    : 0
  return createBaseVNode(type, props, children, shapeFlag)
}

export const normalizeVNode = (child: VNodeChild): VNode => {
  if (child == null || typeof child === 'boolean') {
    return createVNode(Comment)
  } else if (isArray(child)) {
    return createVNode(Fragment as any, null, child.slice())
  } else if (isObject(child)) {
    return child as VNode
  } else {
    return createVNode(Text, null, String(child))
  }
}

export function mergeProps(...args: (Data & VNodeProps)[]) {
  const ret: Data = {}
  for (let i = 0; i < args.length; i++) {
    const toMerge = args[i]
    for (const key in toMerge) {
      if (key === 'class') {
        if (ret.class !== toMerge.class) {
          ret.class = normalizeClass([ret.class, toMerge.class])
        }
      } else if (key === 'style') {
        ret.style = normalizeStyle([ret.style, toMerge.style])
      } else if (isOn(key)) {
        const existing = ret[key]
        const incoming = toMerge[key]
        if (
          incoming &&
          existing !== incoming &&
          !(isArray(existing) && existing.includes(incoming))
        ) {
          ret[key] = existing ? [].concat(existing as any, incoming as any) : incoming
        }
      } else if (key !== '') {
        ret[key] = toMerge[key]
      }
    }
  }
  return ret
}

export const createVNode = _createVNode
```

### renderer.ts（新增部分）

```typescript
const patch = (n1, n2, container, anchor = null, parentComponent = null, parentSuspense = null, namespace = undefined) => {
  if (n1 === n2) return
  if (n1 && !isSameVNodeType(n1, n2)) {
    unmount(n1, parentComponent, parentSuspense, true)
    n1 = null
  }
  const { type, shapeFlag } = n2
  switch (type) {
    case Text:
      processText(n1, n2, container, anchor)
      break
    case Comment:
      processCommentNode(n1, n2, container, anchor)
      break
    case Fragment:
      processFragment(n1, n2, container, anchor, parentComponent, parentSuspense, namespace)
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(n1, n2, container, anchor, parentComponent, parentSuspense, namespace)
      } else if (shapeFlag & ShapeFlags.COMPONENT) {
        processComponent(n1, n2, container, anchor, parentComponent, parentSuspense, namespace)
      }
      break
  }
}

// 处理文本节点
const processText = (n1, n2, container, anchor) => {
  if (n1 === null) {
    hostInsert(n2.el = hostCreateText(n2.children), container, anchor)
  } else {
    const el = n2.el = n1.el
    if (n2.children !== n1.children) {
      hostSetText(el, n2.children)
    }
  }
}

// 处理注释节点
const processCommentNode = (n1, n2, container, anchor) => {
  if (n1 === null) {
    hostInsert((n2.el = hostCreateComment(n2.children || '')), container, anchor)
  } else {
    n2.el = n1.el
  }
}

// 处理 Fragment
const processFragment = (n1, n2, container, anchor, parentComponent, parentSuspense, namespace) => {
  const fragmentStartAnchor: any = (n2.el = n1 ? n1.el : hostCreateText(''))
  const fragmentEndAnchor: any = (n2.anchor = n1 ? n1.anchor : hostCreateText(''))

  if (n1 == null) {
    hostInsert(fragmentStartAnchor, container as any, anchor as any)
    hostInsert(fragmentEndAnchor, container as any, anchor as any)
    mountChildren(n2.children as VNodeArrayChildren, container, fragmentEndAnchor, parentComponent, parentSuspense, namespace)
  } else {
    patchChildren(n1, n2, container, fragmentEndAnchor, parentComponent, parentSuspense, namespace)
  }
}

const processComponent = (n1, n2, container, anchor, parentComponent, parentSuspense, namespace) => {
  if (n1 === null) {
    mountComponent(n2, container, anchor, parentComponent, parentSuspense, namespace)
  } else {
    updateComponent(n1, n2)
  }
}

// 挂载组件
const mountComponent: MountComponentFn = (initialVNode, container, anchor, parentComponent, parentSuspense, namespace) => {
  //! 核心逻辑三部曲
  const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent, parentSuspense))
  setupComponent(instance)
  setupRenderEffect(instance, initialVNode, container, anchor, parentSuspense, namespace)
}

// 组件实例的 effect 函数
const setupRenderEffect: SetupRenderEffectFn = (instance, initialVNode, container, anchor, parentSuspense, namespace) => {
  const componentUpdateFn = () => {
    const { render } = instance
    if (!instance.isMounted) {
      const subTree = (instance.subTree = renderComponentRoot(instance))
      subTree.props = mergeProps(instance.attrs, subTree.props)
      patch(null, subTree, container, anchor, null, parentSuspense, namespace)
      initialVNode.el = subTree.el
      instance.isMounted = true
    } else {
      if (instance.next) {
        updateComponentPreRender(instance, instance.next)
      }
      const nextTree = renderComponentRoot(instance)
      const prevTree = instance.subTree
      nextTree.props = mergeProps(instance.attrs, nextTree.props)
      instance.subTree = nextTree
      patch(prevTree, nextTree, hostParentNode(prevTree.el as any), anchor, null, parentSuspense, namespace)
    }
  }

  const effect = new ReactiveEffect(componentUpdateFn, () => {
    queueJob(update)
  })
  const update = instance.update = effect.run.bind(effect)
  update()
}

const updateComponent = (n1: VNode, n2: VNode) => {
  //! 组件更新的方式有三种（状态[data]、属性[props]、插槽[slot]）
  const instance = (n2.component = n1?.component)
  if (shouldUpdateComponent(n1, n2)) {
    instance.next = n2 // 有 next 说明是属性或插槽更新，否则为状态更新
    instance.update()
  } else {
    n2.el = n1.el
    instance.vnode = n2
  }
}

const updateComponentPreRender = (instance: ComponentInternalInstance, nextVNode: VNode) => {
  nextVNode.component = instance
  const prevProps = instance.vnode.props
  instance.vnode = nextVNode
  instance.next = null
  updateProps(instance, nextVNode.props, prevProps)
}

// 卸载节点
const unmount: UnmountFn = (vnode, parentComponent, parentSuspense, doRemove = false, optimize = false) => {
  remove(vnode)
}

const remove: RemoveFn = (vnode) => {
  const { el, type, anchor } = vnode
  if (type === Fragment) {
    removeFragment(el, anchor)
    return
  }
  hostRemove(el as HostNode)
}

const removeFragment = (cur: RendererNode, end: RendererNode) => {
  let next
  while (cur !== end) {
    next = hostNextSibling(cur as HostNode)
    hostRemove(cur as HostNode)
    cur = next
  }
  hostRemove(end as HostNode)
}
```

### component.ts（全量）

```typescript
export function createComponentInstance(
  vnode: VNode,
  parent: ComponentInternalInstance | null,
  suspense: any | null
): ComponentInternalInstance {
  const instance = {
    vnode, parent, root: null, subTree: null, suspense,
    type: vnode.type,
    update: null, render: null, renderCache: [],
    ctx: EMPTY_OBJ,
    exposed: null, exposeProxy: null, proxy: null,
    propsOptions: (vnode.type as any)?.props || {},
    data: EMPTY_OBJ, props: EMPTY_OBJ, attrs: EMPTY_OBJ,
    emit: null, slots: EMPTY_OBJ, setupState: EMPTY_OBJ,
    isMounted: false,
  }
  instance.ctx = { _: instance }
  instance.root = parent ? parent.root : instance
  return instance
}

export function setupComponent(instance: ComponentInternalInstance) {
  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance: ComponentInternalInstance) {
  const { props, children } = instance.vnode
  initProps(instance, props)
  const Component = instance.type
  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers)

  const { setup } = Component
  if (setup) {
    const setupContext = createSetupContext(instance)
    setCurrentInstance(instance)
    const setupResult = setup(instance.props, setupContext)
    setCurrentInstance(null)
    if (isFunction(setupResult)) {
      instance.render = setupResult
    } else {
      instance.setupState = proxyRefs(setupResult)
    }
  }

  const data: Function = Component.data
  if (data) {
    if (isFunction(data)) {
      instance.data = reactive(data.call(instance.proxy))
    } else {
      console.warn('data must be a function')
    }
  }

  if (!instance.render) {
    instance.render = Component.render
  }
}

export let currentInstance: ComponentInternalInstance | null = null

export const getCurrentInstance: () => ComponentInternalInstance | null = () => {
  return currentInstance
}

export function setCurrentInstance(instance: ComponentInternalInstance) {
  currentInstance = instance
  return () => (currentInstance = null)
}

export function createSetupContext(instance: ComponentInternalInstance): SetupContext {
  const expose: SetupContext['expose'] = exposed => {
    instance.exposed = exposed || {}
  }

  const emit = (event, ...args) => {
    const name = camelize(event)
    const eventName = `on${name[0].toUpperCase()}${name.slice(1)}` // myClick ==> onMyClick
    const handler = instance.vnode.props[eventName]
    handler && handler(...args)
  }

  return {
    attrs: instance.attrs,
    slots: instance.slots,
    emit,
    expose,
  }
}
```

### componentPublicInstance.ts（全量）

```typescript
const getPublicInstance = (i: ComponentInternalInstance | null) => {
  if (!i) return null
  if (i.parent && i.parent.proxy) {
    return i.parent.proxy
  }
  return getPublicInstance(i.parent)
}

export const publicPropertiesMap = extend(Object.create(null), {
  $i: i => i,
  $el: i => i.vnode.el,
  $data: i => i.data,
  $props: i => i.props,
  $attrs: i => i.attrs,
  $slots: i => i.slots,
  $refs: i => i.refs,
  $parent: i => getPublicInstance(i.parent),
  $root: i => getPublicInstance(i.root),
  $emit: i => i.emit,
  $options: i => i.type
})

export const PublicInstanceProxyHandlers = {
  get({ _: instance }: ComponentRenderContext, key, receiver) {
    const { data, props, setupState } = instance
    if (data && hasOwn(data, key)) {
      return data[key]
    } else if (props && hasOwn(props, key)) {
      return props[key]
    } else if (setupState && hasOwn(setupState, key)) {
      return setupState[key]
    }
    const publicGetter = publicPropertiesMap[key]
    if (publicGetter) {
      return publicGetter(instance)
    }
  },
  set({ _: instance }: ComponentRenderContext, key, value, receiver) {
    const { data, props, setupState } = instance
    if (data && hasOwn(data, key)) {
      data[key] = value
    } else if (props && hasOwn(props, key)) {
      console.warn(`Attempting to mutate prop "${key}". Props are readonly.`)
      return false
    } else if (setupState && hasOwn(setupState, key)) {
      setupState[key] = value
    }
    return true
  }
}
```

### componentProps.ts（全量）

```typescript
export function initProps(instance: ComponentInternalInstance, rawProps: Data | null, isStateful?: number) {
  const props: Data = {}
  const attrs: Data = createInternalObject()
  const propsOptions = instance.propsOptions

  if (rawProps) {
    for (const key in rawProps) {
      const value = rawProps[key]
      if (key in propsOptions) {
        props[key] = value
      } else {
        attrs[key] = value
      }
    }
  }
  instance.props = reactive(props)
  instance.attrs = attrs
}

export function updateProps(instance: ComponentInternalInstance, rawProps: Data, rawPrevProps: Data) {
  if (hasPropsChanged(rawPrevProps, rawProps)) {
    for (const key in rawProps) {
      instance.props[key] = rawProps[key]
    }
    for (const key in rawPrevProps) {
      if (!(key in rawProps)) {
        Reflect.deleteProperty(instance.props, key)
      }
    }
  }
}
```

### internalObject.ts（全量）

```typescript
const internalObjectProto = {}
export const createInternalObject = () => Object.create(internalObjectProto)
export const isInternalObject = (obj: object) => Object.getPrototypeOf(obj) === internalObjectProto
```

### componentRenderUtils.ts（全量）

```typescript
export function shouldUpdateComponent(prevVNode: VNode, nextVNode: VNode) {
  const { props: prevProps, children: prevChildren } = prevVNode
  const { props: nextProps, children: nextChildren } = nextVNode

  if (prevChildren || nextChildren) {
    return true
  }
  if (prevProps === nextProps) {
    return false
  }
  if (!prevProps) {
    return !!nextProps
  }
  if (!nextProps) {
    return true
  }
  return hasPropsChanged(prevProps, nextProps)
}

export function hasPropsChanged(prevProps: Data, nextProps: Data) {
  const prevKeys = Object.keys(prevProps)
  const nextKeys = Object.keys(nextProps)
  if (prevKeys.length !== nextKeys.length) {
    return true
  }
  for (const key in nextProps) {
    return prevProps[key] !== nextProps[key]
  }
  return false
}

export function renderComponentRoot(instance: ComponentInternalInstance): VNode {
  const { render, vnode, proxy, props, type: Component, attrs } = instance
  let result
  try {
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      result = normalizeVNode(render.call(proxy, proxy))
    } else {
      const render = Component as Function
      const hasProps = Object.keys(props ?? {}).length > 0
      result = normalizeVNode(render(hasProps ? props : attrs, null))
    }
  } catch (error) {
    result = createVNode(Comment)
    console.error(error)
  }
  return result
}
```

### scheduler.ts（全量）

```typescript
export interface SchedulerJob extends Function {
  id?: number
  pre?: boolean
  active?: boolean
  computed?: boolean
  allowRecurse?: boolean
  i: any
}

const queue: SchedulerJob[] = []
let isFlushing = false
const resolvePromise = Promise.resolve()

export function queueJob(job: SchedulerJob) {
  if (!queue.length || !queue.includes(job)) {
    queue.push(job)
  }
  queueFlush()
}

function queueFlush() {
  if (!isFlushing) {
    isFlushing = true
    resolvePromise.then(flushJobs)
  }
}

function flushJobs() {
  isFlushing = false
  let job
  while (job = queue.shift()) {
    job()
  }
}
```

### 运行示例：诊断表单组件树

用上面这套手写渲染器跑一个完整的医疗场景例子——患者信息组件（函数式组件展示只读信息）+ 诊断表单组件（有状态，`setup` 返回 render 函数）+ `Fragment` 包裹的多个提示信息 + `Comment` 占位的条件校验提示：

```typescript
import { render, h, Fragment, ref } from 'vue'

// PatientInfo：函数式组件，纯展示，无实例、无状态
const PatientInfo = (props) => {
  return h('div', { class: 'patient-info' }, `患者：${props.name}，${props.age} 岁`)
}

// DiagnosisForm：有状态组件，setup 返回 render 函数
const DiagnosisForm = {
  props: {
    patientId: { type: String, required: true }
  },
  setup(props) {
    const symptom = ref('')
    const showWarning = ref(false)

    return () => h(Fragment, [
      h(PatientInfo, { name: '张三', age: 34 }),
      h('input', {
        value: symptom.value,
        onInput: (e) => { symptom.value = e.target.value }
      }),
      // Comment 占位：症状为空时的校验提示不显示，但保留结构位置
      showWarning.value
        ? h('p', { class: 'warning' }, '请填写症状')
        : null,
    ])
  }
}

render(h(DiagnosisForm, { patientId: 'p001' }), document.getElementById('app'))

// 切换患者：key 变化，DiagnosisForm 整个销毁重建，symptom/showWarning 状态清零
setTimeout(() => {
  render(h(DiagnosisForm, { patientId: 'p002', key: 'p002' }), document.getElementById('app'))
}, 2000)
```

这段代码完整覆盖了本文讲到的五条线：`PatientInfo` 是函数式组件（跳过实例化，`renderComponentRoot` 走的是 `else` 分支），`DiagnosisForm` 是有状态组件（`setup` 返回渲染函数，内部 `ref` 驱动更新走 `queueJob` 异步调度），`Fragment` 包裹多个平级子节点（双锚点系统），条件为 `false` 的提示信息渲染成 Comment 占位，切换 `key` 触发 `isSameVNodeType` 判定为不同节点、走 `unmount` + `mountComponent` 强制重建。

---

## 六、手写实现源码 GitHub 地址

- https://github.com/lotosv2010/g-vue-next

## 七、参考

- https://cn.vuejs.org/guide/extras/rendering-mechanism.html
- https://github.com/vuejs/core
- https://jonny-wei.github.io/blog/vue/vue3/components.html
- https://github.com/wbccb/

---

> 🔖 这是「Vue 3 全家桶深度拆解系列」第 4 篇。上一篇：《Vue 3 渲染原理与 Diff 算法：从首次渲染到 Diff 优化的完整链路？（面试收藏级）》；下一篇预告：《Vue 3 Composition API 深度拆解：slots/emit/lifecycle/ref/provide-inject 全解析（面试收藏级）》

**关注公众号「Coding沉思录」，第一时间获取 Vue 3 全家桶系列更新！**
