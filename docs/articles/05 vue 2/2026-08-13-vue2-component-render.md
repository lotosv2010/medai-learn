# Vue 2 组件渲染原理：从注册到更新，组件的完整生命旅程（面试收藏级）

> 面试官把白板推过来，微笑着说：「父组件 `created` 触发了，子组件的 `mounted` 是先触发还是后触发？keep-alive 包裹后有什么不同？把完整顺序和原因都写出来。」你盯着白板，脑子里只有一条生命周期顺序……今天，把这道题彻底答完。

---

在看细节之前，先把整条主线摆出来。**全文章节顺序就是这条链路的展开**：

```text
【初次渲染链路】
① 注册
   Vue.component → Vue.extend → Sub 构造函数（_Ctor 缓存）
                                           ↓
② 创建 VNode
   父 render → createElement → createComponent → 组件 VNode（含 init hook）
                                                           ↓
③ 实例化
   patch → createElm → init hook → new Sub() → child._init()
      → mergeOptions → initLifecycle（$parent/$children）
      → initEvents → initRender → initState
      → beforeCreate → created
                              ↓
④ 挂载
   child.$mount() → beforeMount → mountComponent（渲染 watcher）
      → child._render() → child._update() → patch（子树）
      → 子 mounted → 父 mounted

【更新链路】
⑤ 更新
   父 data 变化 → dep.notify() → 父重新 render → 新组件 VNode
      → patchVnode → updateChildComponent
      → props setter 触发 → 子 render watcher → 子重渲染
      → 父/子 beforeUpdate → 子 updated → 父 updated
```

记住两句话：**created 父先子后，mounted 子先父后**。所有顺序问题都从这条链路里找答案。

---

## 🎯 这篇文章解决什么问题

Vue 组件是日常开发的基本单元，但大多数人只知道怎么用，不知道内部怎么转。一旦追问「父子生命周期执行顺序的原理是什么、$emit 的事件存在哪里、provide/inject 为什么默认不响应式」，就卡住了。

这篇文章沿「初次渲染 → 更新」这条链路，把组件系统从注册到更新逐环拆开：**懂原理，也懂怎么答面试**。读完你能在白板上画出父子组件的完整渲染时序，并答全六大核心追问。

---

## 🧩 一、组件注册：全局 vs 局部，Vue.extend 的本质

> 链路位置：① 注册

### 全局注册 vs 局部注册

**全局注册**：通过 `Vue.component(id, definition)` 注册，所有组件内可直接使用。

```javascript
Vue.component('DrugCard', {
  props: ['drug'],
  template: `<div class="drug-card">{{ drug.name }} - {{ drug.dosage }}</div>`
})
```

**局部注册**：在组件的 `components` 选项中声明，只在当前组件树内可用。

```javascript
import DrugCard from './DrugCard.vue'
export default {
  components: { DrugCard },
}
```

两者本质差异在**注册范围**：全局注册写入 `Vue.options.components`，所有子组件通过 `mergeOptions` 继承；局部注册只写入当前组件的 `$options.components`，子树之外不可见。

### Vue.extend：生成 Sub 构造函数

`Vue.extend` 是整个组件系统的基础。它接收组件选项对象，返回一个继承了 Vue 的子类构造函数 `Sub`：

```javascript
// src/core/global-api/extend.js（手写实现版）
Vue.extend = function(extendOptions) {
  const Super = this  // Vue 基类
  const Sub = function VueComponent(options) {
    this._init(options)  // 复用父类的 _init
  }
  Sub.cid = cid++
  Sub.prototype = Object.create(Super.prototype)
  Sub.prototype.constructor = Sub
  Sub.options = mergeOptions(Super.options, extendOptions)
  return Sub
}
```

**`_Ctor` 缓存**：同一个组件定义对象（如从 `.vue` 文件 import 进来的对象）被多个父组件使用时，没有缓存会重复 extend。真实源码在 `extendOptions._Ctor[cid]` 上缓存结果，第二次直接返回：

```javascript
// 真实源码中的缓存逻辑
const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
if (cachedCtors[SuperId]) {
  return cachedCtors[SuperId]
}
// ... 生成 Sub ...
cachedCtors[SuperId] = Sub
return Sub
```

### Vue.component 底层 = extend + 存入全局

```javascript
// src/core/global-api/index.js
Vue.component = function(id, definition) {
  definition.name = definition.name || id
  definition = this.options._base.extend(definition)  // 生成 Sub
  Vue.options.components[id] = definition             // 存入全局
}
```

> 💬 **面试官**：Vue.extend 的作用是什么？命令式弹窗怎么实现？
>
> ✅ 标准答案：`Vue.extend` 接收组件选项，返回继承 Vue 的子类构造函数。命令式弹窗利用这个特性：`const Sub = Vue.extend(DialogComp); new Sub({ propsData: {...} }).$mount()` 然后把 `vm.$el` 挂到 `document.body`，不需要在模板里写 `<Dialog>`。
> 🎁 加分答案：`_Ctor` 缓存避免同一组件定义重复 extend。每个 `.vue` 文件导出的对象在同一父类下只 extend 一次，后续复用 Sub，是单文件组件高效工作的底层保障。

---

## 🏗️ 二、组件 VNode 创建：createComponent 做了什么

> 链路位置：② 创建 VNode

### createElement 如何区分原生标签和组件

父组件 render 时，`_c('DrugCard', ...)` 走到 `createElement`，它通过 `isReservedTag` 判断标签类型：

```javascript
// src/core/vdom/create-element.js（手写实现版）
function createElement(vm, tag, data = {}, ...children) {
  if (isReservedTag(tag)) {
    // 原生 HTML 标签（div/span/input...）
    return vnode(tag, data, data.key, children)
  } else {
    // 组件标签 → 走 createComponent
    let Ctor = vm.$options.components[tag]
    return createComponent(vm, tag, data, data.key, children, Ctor)
  }
}
```

### createComponent：组件 VNode 的完整结构

```javascript
// src/core/vdom/create-component.js（手写实现版）
function createComponent(vm, tag, data, key, children, Ctor) {
  const baseCtor = vm.$options._base  // Vue 基类
  if (typeof Ctor === 'object') {
    Ctor = baseCtor.extend(Ctor)  // 对象选项 → 生成 Sub
  }

  // 挂载组件生命周期 hook
  data.hook = {
    init(vnode) {
      // patch 阶段调用：实例化子组件并挂载
      let child = vnode.componentInstance = new Ctor({})
      child.$mount()  // 无挂载点，渲染到 child.$el
    }
  }

  // 组件 VNode：children 是 undefined，插槽通过 componentOptions 传递
  return vnode(
    `vue-component-${Ctor.cid}-${tag}`,
    data,
    key,
    undefined,           // children 为 undefined（区别于普通元素 VNode）
    undefined,
    { Ctor, children }   // componentOptions：构造函数 + 插槽内容
  )
}
```

### 组件 VNode vs 普通元素 VNode

| 字段 | 普通元素 VNode | 组件 VNode |
|------|--------------|-----------|
| `tag` | `'div'` / `'span'` 等 | `'vue-component-1-DrugCard'` |
| `children` | 子 VNode 数组 | `undefined` |
| `componentOptions` | `undefined` | `{ Ctor, children（插槽）}` |
| `data.hook` | 无 | 含 `init` / `prepatch` / `insert` / `destroy` |

> 💬 **面试官**：组件 VNode 和普通元素 VNode 有什么区别？
>
> ✅ 标准答案：组件 VNode 的 tag 以 `vue-component-` 开头，children 是 undefined（子树在子组件内部渲染），多了 `componentOptions`（存 Ctor 构造函数和插槽内容），data 上挂了 `init/prepatch/insert/destroy` 四个 hook。patch 通过 `data.hook.init` 是否存在来识别组件 VNode。
> 🎁 加分答案：`prepatch` hook 负责父组件更新时同步子组件 props/listeners；`insert` hook 是子组件 `mounted` 触发的时机（insertedVnodeQueue 队列）。

---

## ⚡ 三、子组件实例化：patch → init hook → new Sub()

> 链路位置：③ 实例化

### patch/createElm 如何识别组件 VNode

```javascript
// src/core/vdom/patch.js（手写实现版）
function createElm(vnode, parentElm, refElm) {
  // 尝试作为组件创建
  if (createComponent(vnode, parentElm, refElm)) return

  // 普通元素：创建真实 DOM 并递归处理子节点
  let el = vnode.el = document.createElement(vnode.tag)
  vnode.children.forEach(child => createElm(child, el))
  insert(parentElm, el, refElm)
}

function createComponent(vnode, parentElm, refElm) {
  let i = vnode.data?.hook?.init
  if (!i) return false          // 没有 init hook → 不是组件 VNode

  i(vnode)                      // 触发 init hook → 实例化并挂载子组件
  insert(parentElm, vnode.componentInstance.$el, refElm)  // 插入子组件根 DOM
  return true
}
```

### init hook 触发：new Sub() → child._init()

`init` hook 被调用时，执行 `new Ctor({})` → 子组件 `_init` 开始：

```javascript
// _init 核心流程（src/core/instance/init.js）
Vue.prototype._init = function(options) {
  const vm = this
  vm.$options = mergeOptions(
    resolveConstructorOptions(vm.constructor),
    options || {},
    vm
  )
  initLifecycle(vm)    // 建立 $parent/$children/$root/$refs
  initEvents(vm)       // 处理父组件传入的事件监听
  initRender(vm)       // 初始化 $createElement / $slots
  callHook(vm, 'beforeCreate')
  initInjections(vm)   // resolve injections before data/props
  initState(vm)        // initProps → initMethods → initData → initComputed → initWatch
  initProvide(vm)      // resolve provide after data/props
  callHook(vm, 'created')
}
```

### initLifecycle：建立父子关系

```javascript
// src/core/instance/lifecycle.js
function initLifecycle(vm) {
  const options = vm.$options
  let parent = options.parent
  if (parent && !options.abstract) {
    // 跳过抽象组件（keep-alive / transition）向上找真实父组件
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent
    }
    parent.$children.push(vm)  // 把自己加入父组件的 $children
  }
  vm.$parent = parent
  vm.$root = parent ? parent.$root : vm
  vm.$children = []
  vm.$refs = {}
}
```

### mergeOptions 策略

`mergeOptions` 把父类选项和组件选项合并，不同字段有不同策略：

```javascript
// src/core/util/options.js（手写实现版）
const strats = {}

// 生命周期钩子：合并成数组（父在前，子在后）
LIFECYCLE_HOOKS.forEach(hook => {
  strats[hook] = function(parentVal, childVal) {
    if (!childVal) return parentVal
    if (!parentVal) return [childVal]
    return parentVal.concat(childVal)  // [父钩子, 子钩子]
  }
})

// components / directives / filters：子继承父的原型链
strats.components = function(parentVal = {}, childVal = {}) {
  const res = Object.create(parentVal)  // 父组件的 components 作为原型
  Object.assign(res, childVal)
  return res
}
```

**关键点**：生命周期钩子合并成数组后，`callHook` 遍历数组依次调用，这是 mixin 能混入钩子的底层实现。

> 💬 **面试官**：`$parent/$children/$refs` 分别在哪个阶段建立？
>
> ✅ 标准答案：`$parent` 和 `$children` 在 `initLifecycle`（`beforeCreate` 之前）建立；`$refs` 在组件挂载完成后（`mounted` 阶段）通过 `registerRef` 注册，因此在 `created` 里访问 `$refs` 会拿到 undefined。
> 🎁 加分答案：`initLifecycle` 会跳过 `abstract` 组件（keep-alive、transition）向上找真实父节点，所以被 keep-alive 包裹的组件 `$parent` 是 keep-alive 的父组件，不是 keep-alive 本身。

---

## 🔄 四、生命周期：11 个钩子 + 父子顺序 + keep-alive

> 链路位置：③④ 实例化 → 挂载

### 11 个钩子与链路的对应关系

| 钩子 | 触发时机 | 链路位置 | 典型用途 |
|------|---------|---------|---------|
| `beforeCreate` | `initState` 之前 | ③实例化 | 插件初始化（如 Vuex 注入 $store） |
| `created` | `initState` 之后 | ③实例化 | 发起异步请求、初始化非响应式变量 |
| `beforeMount` | `render` 之前 | ④挂载 | SSR 中最后的钩子（服务端不执行后续） |
| `mounted` | patch 完成，DOM 可用 | ④挂载 | 操作 DOM、初始化第三方库 |
| `beforeUpdate` | 响应式数据变化，re-render 之前 | ⑤更新 | 获取更新前的 DOM 状态 |
| `updated` | re-render + patch 完成 | ⑤更新 | 获取更新后的 DOM（避免在此修改数据） |
| `beforeDestroy` | 组件销毁之前 | 销毁 | 清理定时器、取消订阅、$off 事件 |
| `destroyed` | 组件销毁完成 | 销毁 | 确认资源清理 |
| `activated` | keep-alive 组件激活 | keep-alive | 刷新数据 |
| `deactivated` | keep-alive 组件停用 | keep-alive | 暂停/清理操作 |
| `errorCaptured` | 子孙组件抛出错误 | 任意 | 错误边界处理 |

### 父子生命周期顺序：原理解析

**初次渲染顺序**：

```text
父 beforeCreate → 父 created → 父 beforeMount
  → 子 beforeCreate → 子 created → 子 beforeMount → 子 mounted
→ 父 mounted
```

**原理**：父组件 `patch` 时遇到子组件 VNode，触发 `init hook` → 子组件完整走完实例化+挂载后，`init hook` 才返回 → 父组件继续 `patch`。这是**深度优先递归**，子树必须完全渲染才能回到父层。

**更新顺序**：

```text
父 beforeUpdate
  → 子 beforeUpdate → 子 updated
→ 父 updated
```

**原理**：`updated` 通过 `queue` 排序触发，子组件的 watcher id 更大（后创建），但 flush 时会先处理子组件（`_update` 先执行），所以子 `updated` 先于父。

### keep-alive 差异

keep-alive 包裹的组件**不会销毁**，切换时走 `deactivated/activated` 而非 `destroyed/mounted`：

```text
普通组件切换：destroyed / mounted
keep-alive 组件切换：deactivated / activated
```

`activated` 每次进入都会触发，适合刷新接口；`mounted` 只在首次渲染触发。keep-alive 的缓存用 `LRU` 算法实现，超出 `max` 限制时淘汰最久未访问的组件。

> 💬 **面试官**：父子组件生命周期执行顺序是什么？原理是什么？keep-alive 场景下有何不同？
>
> ✅ 标准答案：初次渲染 created 父先子后，mounted 子先父后。原因是 patch 深度优先递归，遇到子组件 VNode 会触发 init hook 完整走完子组件渲染才返回。keep-alive 场景下首次走 mounted/activated，后续切换只走 deactivated/activated，不触发 destroyed/mounted。
> 🎁 加分答案：`mounted` 子先父后这个顺序是通过 `insertedVnodeQueue` 队列实现的——子组件的 insert hook（触发 mounted）先入队、先执行；父组件的 insert hook 后入队、后执行。

---

## 📡 五、props 与事件：响应式更新的桥梁

> 链路位置：⑤ 更新链路

### props 响应式传递原理

**初次渲染**：子组件 `initProps` 时，对每个 prop 调用 `defineReactive`，使 prop 具备响应式。

```javascript
// src/core/instance/state.js（手写实现版）
function initProps(vm, propsOptions) {
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  for (const key in propsOptions) {
    const value = propsData[key]
    defineReactive(props, key, value)  // prop 变成响应式
    // 代理：vm.propName → vm._props.propName
    proxy(vm, '_props', key)
  }
}
```

**更新时**：父组件数据变化 → 父重新 render → 生成新组件 VNode → `patchVnode` 调用 `prepatch` hook → `updateChildComponent` 更新子组件的 propsData → prop 的 setter 触发 → 子组件 render watcher 重新渲染。

```javascript
// src/core/instance/lifecycle.js（updateChildComponent 核心）
function updateChildComponent(vm, propsData, listeners, ...) {
  // 更新 props
  if (propsData && vm.$options.props) {
    const props = vm._props
    for (const key of propKeys) {
      props[key] = propsData[key]  // 触发 setter → 通知子组件 watcher
    }
  }
  // 更新事件监听
  vm.$listeners = listeners || emptyObject
}
```

### $emit/$on 机制

事件存储在 `vm._events` 对象上，`$on` 注册，`$emit` 触发：

```javascript
// src/core/instance/events.js（手写实现版）
Vue.prototype.$on = function(event, fn) {
  const vm = this
  ;(vm._events[event] || (vm._events[event] = [])).push(fn)
  return vm
}

Vue.prototype.$emit = function(event, ...args) {
  const vm = this
  const cbs = vm._events[event]
  if (cbs) {
    cbs.forEach(cb => cb.apply(vm, args))
  }
  return vm
}
```

**父组件的 `@click="handler"` 怎么传进来的**：父组件渲染时把事件监听写入组件 VNode 的 `data.on`，子组件实例化时 `initEvents` 把 `data.on` 里的监听注册到 `vm._events`：

```javascript
// src/core/instance/events.js
function initEvents(vm) {
  vm._events = Object.create(null)
  const listeners = vm.$options._parentListeners
  if (listeners) {
    updateComponentListeners(vm, listeners)  // 把父传入的监听注册到 _events
  }
}
```

### $attrs/$listeners：非 prop 属性和事件的透传

`$attrs` 包含父组件传入的所有**非 prop** attribute；`$listeners` 包含父组件传入的所有事件监听（不含 `.native` 修饰符的）。

```javascript
// 封装二次组件（透传所有原生 input 属性）
Vue.component('MedInput', {
  inheritAttrs: false,  // 禁止自动把 $attrs 挂到根元素
  template: `
    <label>
      <span>{{ label }}</span>
      <input v-bind="$attrs" v-on="$listeners" />
    </label>
  `,
  props: ['label']
})
```

`inheritAttrs: false` 阻止非 prop attribute 自动挂载到组件根元素（默认行为），配合 `v-bind="$attrs"` 把属性精准透传到内层元素。

> 💬 **面试官**：props 响应式原理？$emit 事件存在哪里？$attrs 的使用场景？
>
> ✅ 标准答案：props 在 `initProps` 阶段通过 `defineReactive` 变成响应式，父更新时 `updateChildComponent` 直接赋新值触发 setter 通知子 watcher。`$emit` 触发 `vm._events[event]` 里注册的回调数组，`$on` 注册、`$off` 移除。`$attrs` 用于封装二次组件，配合 `inheritAttrs: false` 把非 prop attribute 透传到指定的内层元素。
> 🎁 加分答案：Vue 3 移除了 `$listeners`，把事件监听统一合并到 `$attrs` 里（`onXxx` 形式）。

---

## ⏳ 六、异步组件：forceRender 打破同步渲染

> 链路位置：② VNode 创建的特殊分支

### 三种写法对比

```javascript
// 写法一：工厂函数（最简单）
Vue.component('DrugDetail', function(resolve, reject) {
  setTimeout(() => resolve({ template: '<div>药品详情</div>' }), 1000)
})

// 写法二：Promise（推荐，配合 Webpack Code Splitting）
Vue.component('DrugDetail', () => import('./DrugDetail.vue'))

// 写法三：高级异步对象（loading + error + delay）
Vue.component('DrugDetail', () => ({
  component: import('./DrugDetail.vue'),
  loading: LoadingComp,   // 加载中展示
  error: ErrorComp,       // 加载失败展示
  delay: 200,             // 200ms 后才展示 loading（避免闪烁）
  timeout: 3000           // 超时时间
}))
```

| 写法 | 适用场景 | 优点 |
|------|---------|------|
| 工厂函数 | 简单演示、动态加载 | 写法最简单 |
| Promise/import | 路由级懒加载 | 天然支持 Code Splitting |
| 高级异步对象 | 生产环境 | 可控 loading/error/delay/timeout |

### resolveAsyncComponent：首次返回 undefined，加载完 forceRender

```javascript
// src/core/vdom/helpers/resolve-async-component.js（核心逻辑）
function resolveAsyncComponent(factory, baseCtor) {
  // 已加载完成 → 直接返回
  if (factory.resolved) return factory.resolved

  // 加载失败 → 返回 error 组件
  if (factory.error && factory.errorComp) return factory.errorComp

  // 加载中且超过 delay → 返回 loading 组件
  if (factory.loading && factory.loadingComp) return factory.loadingComp

  // 首次调用：发起异步加载
  if (!factory.owners) {
    factory.owners = []
    const resolve = (res) => {
      factory.resolved = ensureCtor(res, baseCtor)  // 生成 Sub 构造函数
      forceRender(true)  // 通知所有依赖此异步组件的父组件重渲染
    }
    const reject = (reason) => {
      factory.error = true
      forceRender(true)
    }
    const res = factory(resolve, reject)  // 调用工厂函数
    // Promise 写法处理...
  }

  // 返回 undefined → createComponent 返回空 VNode → 渲染为注释节点
  return factory.loadingComp
}
```

### forceRender 为何绕过响应式

```javascript
// 通知所有使用这个异步组件的父组件重新渲染
const forceRender = (renderCompleted) => {
  for (let i = 0, l = factory.owners.length; i < l; i++) {
    factory.owners[i].$forceUpdate()  // 直接触发渲染 watcher，绕过 dep 收集
  }
}
```

`$forceUpdate` 直接调用 `vm._watcher.update()`，不需要响应式数据变化就能强制重渲染。异步组件加载完成是外部事件（网络请求），不在 Vue 响应式系统内，只能用这种方式。

> 💬 **面试官**：异步组件加载完成后是怎么触发重渲染的？
>
> ✅ 标准答案：`resolveAsyncComponent` 在组件加载完成的回调里调用 `forceRender`，遍历 `factory.owners` 数组（所有使用这个异步组件的父 vm 实例），对每个实例调用 `$forceUpdate()` 直接触发渲染 watcher，绕过响应式系统。
> 🎁 加分答案：之所以维护一个 `owners` 数组，是因为同一个异步组件可能被多个父组件同时使用。全部父组件都需要在加载完成时重渲染。

---

## 🛠️ 七、生产级最佳实践

### 组件通信 8 种方式决策矩阵

| 方式 | 适用层级 | 方向 | 典型场景 |
|------|---------|------|---------|
| `props/$emit` | 父子 | 单向 | 基本数据传递 |
| `.sync` 修饰符 | 父子 | 双向语法糖 | 弹窗 visible 同步 |
| `v-model` | 父子 | 双向语法糖 | 表单控件封装 |
| `provide/inject` | 跨层（祖孙） | 向下 | 全局上下文（患者信息、主题） |
| `EventBus` | 任意 | 任意 | 非父子组件通信（小型项目） |
| `$parent/$children` | 父子 | 双向 | 极少用，紧耦合 |
| `$refs` | 父→子 | 单向 | 调用子组件方法 / 操作 DOM |
| `Vuex` | 全局 | 任意 | 大型应用共享状态 |

### provide/inject 响应式：用 Vue.observable

`provide/inject` 默认不是响应式的（父组件的 data 变化不会通知 inject 的子组件），解决方案是传入响应式对象：

```javascript
// 父组件：传入响应式对象
export default {
  provide() {
    // Vue.observable 把普通对象变成响应式
    this.patientContext = Vue.observable({ patientId: null, name: '' })
    return { patientContext: this.patientContext }
  },
  methods: {
    selectPatient(patient) {
      // 直接修改响应式对象的属性 → 触发响应式更新
      this.patientContext.patientId = patient.id
      this.patientContext.name = patient.name
    }
  }
}

// 孙组件：inject 后直接用，是响应式的
export default {
  inject: ['patientContext'],
  computed: {
    patientId() { return this.patientContext.patientId }
  }
}
```

### EventBus 内存泄漏防护

```javascript
// 危险：只监听，不清理 → 组件销毁后 handler 依然存活
created() {
  EventBus.$on('drug-selected', this.onDrugSelected)
}

// 安全：$once + hook:beforeDestroy 自动清理（推荐写法）
created() {
  EventBus.$on('drug-selected', this.onDrugSelected)
  // 用 hook 事件监听，无需手写 beforeDestroy
  this.$once('hook:beforeDestroy', () => {
    EventBus.$off('drug-selected', this.onDrugSelected)
  })
}
```

`hook:beforeDestroy` 是 Vue 内部的生命周期事件，可以在组件内部监听自己的钩子，避免在 `beforeDestroy` 里写大量清理代码。

### $refs 使用边界

```javascript
// 正确：调用子组件方法 / 直接操作 DOM
this.$refs.drugForm.validate()
this.$refs.input.focus()

// 错误：用 $refs 做响应式数据流
// $refs 不是响应式的，模板里用 $refs.xxx 不会在值变化时更新视图
watch: {
  '$refs.child.someData': handler  // 不要这样做
}
```

---

## ✍️ 八、手写实现：诊断表单组件树

### 环境搭建（Rollup + Babel）

```bash
# 安装依赖
npm install rollup @rollup/plugin-babel @babel/core @babel/preset-env --save-dev
```

```javascript
// rollup.config.js
import babel from '@rollup/plugin-babel'
export default {
  input: 'src/index.js',
  output: { file: 'dist/vue.js', format: 'umd', name: 'Vue' },
  plugins: [babel({ babelHelpers: 'bundled' })]
}
```

### 核心实现：initGlobalApi

```javascript
// src/global-api/index.js
export function initGlobalApi(Vue) {
  Vue.options = {}
  Vue.options._base = Vue
  Vue.options.components = {}

  // Vue.extend：生成子类构造函数
  Vue.extend = function(extendOptions) {
    function Sub(options) {
      this._init(options)
    }
    Sub.prototype = Object.create(this.prototype)
    Sub.prototype.constructor = Sub
    Sub.options = mergeOptions(this.options, extendOptions)
    return Sub
  }

  // Vue.component：注册全局组件
  Vue.component = function(id, definition) {
    definition = this.extend(definition)
    this.options.components[id] = definition
  }
}
```

### 组件 VNode 创建

```javascript
// src/vdom/create-component.js
export function createComponent(Ctor, data = {}, context, children, tag) {
  const baseCtor = context.$options._base
  if (isObject(Ctor)) {
    Ctor = baseCtor.extend(Ctor)
  }

  // init hook：实例化 + 挂载子组件
  const hooks = { init }
  function init(vnode) {
    const child = vnode.componentInstance = new Ctor({})
    child.$mount()
  }

  if (!data.hook) data.hook = {}
  Object.keys(hooks).forEach(key => {
    const existing = data.hook[key]
    const toMerge = hooks[key]
    data.hook[key] = existing ? mergeHook(existing, toMerge) : toMerge
  })

  return vnode(
    `vue-component-${Ctor.cid}${tag ? `-${tag}` : ''}`,
    data, undefined, undefined, undefined, { Ctor, children }
  )
}
```

### patch：识别并渲染组件

```javascript
// src/vdom/patch.js
function createElm(vnode, parentElm, refElm) {
  if (createComponent(vnode, parentElm, refElm)) return

  const { tag, children, text } = vnode
  if (tag) {
    vnode.el = document.createElement(tag)
    children.forEach(child => createElm(child, vnode.el))
    insert(parentElm, vnode.el, refElm)
  } else {
    vnode.el = document.createTextNode(text)
    insert(parentElm, vnode.el, refElm)
  }
}

function createComponent(vnode, parentElm, refElm) {
  let i = vnode.data?.hook?.init
  if (isDef(i)) {
    i(vnode)
    if (vnode.componentInstance) {
      insert(parentElm, vnode.componentInstance.$el, refElm)
      return true
    }
  }
}
```

### 诊断表单父子组件演示

```javascript
// 父组件：DiagnosisForm
const DiagnosisForm = {
  data() {
    return { patientName: '张三', symptoms: [] }
  },
  components: {
    PatientInfo: {
      props: ['name'],
      template: `<div class="patient">患者：{{ name }}</div>`
    }
  },
  template: `
    <div class="diagnosis-form">
      <patient-info :name="patientName" />
      <textarea v-model="symptomsText" placeholder="请输入症状描述" />
    </div>
  `
}

new Vue({ render: h => h(DiagnosisForm) }).$mount('#app')
```

---

## 📖 九、源码解析（重点代码，来源 GitHub 仓库）

沿「初次渲染 → 更新」链路串联六段关键源码。

### ① Vue.extend：Sub 构造函数 + _Ctor 缓存

**文件**：`src/core/global-api/extend.js`

```javascript
Vue.extend = function(extendOptions) {
  extendOptions = extendOptions || {}
  const Super = this
  const SuperId = Super.cid

  // _Ctor 缓存：同一组件定义在同一父类下只 extend 一次
  const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
  if (cachedCtors[SuperId]) {
    return cachedCtors[SuperId]
  }

  const name = extendOptions.name || Super.options.name
  const Sub = function VueComponent(options) {
    this._init(options)
  }
  Sub.prototype = Object.create(Super.prototype)
  Sub.prototype.constructor = Sub
  Sub.cid = cid++

  // 合并选项：子类可以 override 父类的 data/methods/钩子等
  Sub.options = mergeOptions(Super.options, extendOptions)
  Sub['super'] = Super

  // 把父类的静态方法（extend/mixin/use/component/directive/filter）复制给子类
  Sub.extend = Super.extend
  Sub.mixin = Super.mixin
  Sub.use = Super.use
  ASSET_TYPES.forEach(function(type) {
    Sub[type] = Super[type]
  })

  // 缓存结果
  cachedCtors[SuperId] = Sub
  return Sub
}
```

**关键点**：`_Ctor` 以 `SuperId`（父类的 cid）为 key，支持一个组件定义被多个不同父类 extend（通常只有 Vue 基类，但混入场景可能有多个）。

### ② createComponent：四个 hook 的完整逻辑

**文件**：`src/core/vdom/create-component.js`

```javascript
// 四个 hook 的职责
const componentVNodeHooks = {
  init(vnode, hydrating) {
    // 首次渲染：实例化 + 挂载
    const child = vnode.componentInstance = createComponentInstanceForVnode(vnode, activeInstance)
    child.$mount(hydrating ? vnode.elm : undefined, hydrating)
  },

  prepatch(oldVnode, vnode) {
    // 父组件更新时：同步 props/listeners/$slots 到子组件，不重新实例化
    const options = vnode.componentOptions
    const child = vnode.componentInstance = oldVnode.componentInstance
    updateChildComponent(child, options.propsData, options.listeners, vnode, options.children)
  },

  insert(vnode) {
    // patch 完成，DOM 已插入：触发 mounted（或 activated）
    const { context, componentInstance } = vnode
    if (!componentInstance._isMounted) {
      componentInstance._isMounted = true
      callHook(componentInstance, 'mounted')
    }
    if (vnode.data.keepAlive) {
      if (context._isMounted) {
        queueActivatedComponent(componentInstance)
      } else {
        activateChildComponent(componentInstance, true)
      }
    }
  },

  destroy(vnode) {
    // 组件从 DOM 移除：销毁实例（或 deactivate keep-alive 组件）
    const { componentInstance } = vnode
    if (!componentInstance._isDestroyed) {
      if (!vnode.data.keepAlive) {
        componentInstance.$destroy()
      } else {
        deactivateChildComponent(componentInstance, true)
      }
    }
  }
}
```

### ③ $mount / mountComponent：渲染 watcher 的创建

**文件**：`src/core/instance/lifecycle.js`

```javascript
export function mountComponent(vm, el, hydrating) {
  vm.$el = el
  callHook(vm, 'beforeMount')

  let updateComponent = () => {
    // vm._render() 生成新 VNode，vm._update() 执行 patch
    vm._update(vm._render(), hydrating)
  }

  // 创建渲染 watcher：依赖收集 + 触发更新
  new Watcher(vm, updateComponent, noop, {
    before() {
      if (vm._isMounted && !vm._isDestroyed) {
        callHook(vm, 'beforeUpdate')
      }
    }
  }, true /* isRenderWatcher */)

  if (vm.$vnode == null) {
    // 根实例（非子组件）：直接触发 mounted
    // 子组件的 mounted 由 insert hook 触发
    vm._isMounted = true
    callHook(vm, 'mounted')
  }
  return vm
}
```

**关键点**：子组件的 `mounted` 不在 `mountComponent` 里触发，而是通过 `insert` hook（放入 `insertedVnodeQueue` 队列，patch 全部完成后批量触发），保证**子先父后**的顺序。

### ④ mergeOptions：生命周期数组合并策略

**文件**：`src/core/util/options.js`

```javascript
// 生命周期钩子合并：合并成数组，父在前子在后
function mergeHook(parentVal, childVal) {
  const res = childVal
    ? parentVal
      ? parentVal.concat(childVal)     // 都有：concat
      : Array.isArray(childVal)
        ? childVal
        : [childVal]                   // 只有子：包装成数组
    : parentVal                        // 只有父：直接用父
  return res ? dedupeHooks(res) : res
}

LIFECYCLE_HOOKS.forEach(hook => {
  strats[hook] = mergeHook
})

// 调用钩子：遍历数组依次执行（mixin 的钩子 + 组件自身的钩子都在数组里）
export function callHook(vm, hook) {
  const handlers = vm.$options[hook]
  if (handlers) {
    for (let i = 0, j = handlers.length; i < j; i++) {
      handlers[i].call(vm)
    }
  }
}
```

### ⑤ updateChildComponent：props 响应式更新入口

**文件**：`src/core/instance/lifecycle.js`

```javascript
export function updateChildComponent(vm, propsData, listeners, parentVnode, renderChildren) {
  // 更新 props：直接赋值触发 setter → 通知子组件依赖此 prop 的 watcher
  if (propsData && vm.$options.props) {
    const props = vm._props
    const propKeys = vm.$options._propKeys || []
    for (let i = 0; i < propKeys.length; i++) {
      const key = propKeys[i]
      props[key] = validateProp(key, vm.$options.props, propsData, vm)
      // props[key] = newValue → 触发 defineReactive 的 setter
      // → dep.notify() → 子组件中 watch 这个 prop 的 watcher 重新渲染
    }
  }

  // 更新事件监听（$listeners）
  vm.$listeners = listeners || emptyObject

  // 更新 $attrs（非 prop 的 attribute）
  vm.$attrs = parentVnode.data.attrs || emptyObject
}
```

### ⑥ 异步组件 forceRender：三种写法的统一处理

**文件**：`src/core/vdom/helpers/resolve-async-component.js`

```javascript
export function resolveAsyncComponent(factory, baseCtor) {
  if (isTrue(factory.error) && isDef(factory.errorComp)) {
    return factory.errorComp
  }
  if (isDef(factory.resolved)) {
    return factory.resolved
  }
  if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
    return factory.loadingComp
  }

  const owner = currentRenderingInstance
  if (isDef(owner) && isDef(factory.owners) && factory.owners.indexOf(owner) === -1) {
    factory.owners.push(owner)
  }

  if (isTrue(factory.loading)) return factory.loadingComp
  if (isDef(factory.owners)) return  // 已在加载中

  const owners = factory.owners = [owner]
  let sync = true

  // forceRender：通知所有 owner 父组件强制重渲染
  const forceRender = (renderCompleted) => {
    for (let i = 0, l = owners.length; i < l; i++) {
      owners[i].$forceUpdate()
    }
    if (renderCompleted) owners.length = 0
  }

  const resolve = once((res) => {
    factory.resolved = ensureCtor(res, baseCtor)
    if (!sync) forceRender(true)  // 异步加载完成 → 触发重渲染
  })

  const reject = once(reason => {
    factory.error = true
    forceRender(true)
  })

  // 调用工厂函数（三种写法统一入口）
  const res = factory(resolve, reject)

  if (isObject(res)) {
    if (isPromise(res)) {
      // () => import('./Comp.vue') 写法
      if (isUndef(factory.resolved)) res.then(resolve, reject)
    } else if (isPromise(res.component)) {
      // 高级异步对象写法
      res.component.then(resolve, reject)
      if (isDef(res.error)) factory.errorComp = ensureCtor(res.error, baseCtor)
      if (isDef(res.loading)) {
        factory.loadingComp = ensureCtor(res.loading, baseCtor)
        if (res.delay === 0) {
          factory.loading = true
        } else {
          setTimeout(() => {
            if (isUndef(factory.resolved) && isUndef(factory.error)) {
              factory.loading = true
              forceRender(false)
            }
          }, res.delay || 200)
        }
      }
      if (isDef(res.timeout)) {
        setTimeout(() => {
          if (isUndef(factory.resolved)) reject(null)
        }, res.timeout)
      }
    }
  }

  sync = false
  return factory.loading ? factory.loadingComp : factory.resolved
}
```

---

## 💡 一张图总结（面试速记）

| 知识点 | 一句话 | 面试频率 |
|--------|--------|---------|
| 组件渲染主链路 | _init → $mount → mountComponent → 渲染 watcher → patch | ⭐⭐⭐⭐⭐ |
| 父子生命周期顺序 | created 父先子后；mounted 子先父后（insertedVnodeQueue） | ⭐⭐⭐⭐⭐ |
| Vue.extend | 生成 Sub 构造函数，_Ctor 缓存去重，命令式弹窗原理 | ⭐⭐⭐⭐ |
| keep-alive 差异 | activated/deactivated 替换 mounted/destroyed，LRU 缓存 | ⭐⭐⭐⭐ |
| $emit 原理 | 事件存 vm._events，initEvents 在 _init 时注册父传入监听 | ⭐⭐⭐⭐ |
| provide/inject 响应式 | 默认不响应式；传 Vue.observable 对象或 computed 可实现 | ⭐⭐⭐⭐ |
| $attrs/$listeners | 非 prop attribute / 事件透传，配合 inheritAttrs: false | ⭐⭐⭐⭐ |
| 异步组件重渲染 | forceRender → $forceUpdate 遍历 owners 数组 | ⭐⭐⭐ |
| $parent/$refs 建立时机 | $parent 在 initLifecycle；$refs 在 mounted 后才有值 | ⭐⭐⭐ |
| prepatch hook | 更新时复用实例，updateChildComponent 同步 props/slots | ⭐⭐⭐ |

```text
① 注册  → Vue.extend → Sub（_Ctor 缓存）→ Vue.options.components
② VNode → createComponent → 组件 VNode（含 init hook）
③ 实例化 → patch.init hook → new Sub()._init() → mergeOptions → initLifecycle → created
④ 挂载  → $mount → mountComponent → 渲染 watcher → patch → insertedVnodeQueue → mounted
⑤ 更新  → prepatch hook → updateChildComponent → props setter → 子 watcher
```

---

> 💻 手写实现源码：搜索 GitHub「lotosv2010 g-vue」
>
> 📄 官方参考：搜索「Vue 2 官方文档 components」「vuejs/vue src/core/instance GitHub」

---

## 📝 十一、留个问题

Vue 2 的 `$attrs` 在 Vue 3 里有一个重要变化：`$listeners` 被删除了，事件监听被统一合并进了 `$attrs`（以 `onXxx` 的形式）。

这个改变会影响什么？如果你在 Vue 2 里写了 `v-bind="$attrs" v-on="$listeners"` 的二次封装组件，迁移到 Vue 3 时应该怎么改？欢迎在评论区分享你的答案。

---

> 🔖 这是「Vue 2 全家桶深度拆解系列」第 4 篇。上一篇：《Vue 2 虚拟 DOM 与 Diff 算法：双端四指针的完整推演（面试收藏级）》；下一篇预告：《Vue 2 模板编译原理：parse → optimize → generate 全流程拆解》
