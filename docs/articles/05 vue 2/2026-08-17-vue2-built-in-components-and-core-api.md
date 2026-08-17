# Vue 2 内置组件与核心 API 原理：keep-alive 缓存策略与 mixin 合并机制全解析（面试收藏级）

> 面试官微笑着问：「keep-alive 的 LRU 缓存是怎么实现的？max 触发时调用的是哪个钩子？」你脱口而出：「用了 LRU 算法」。面试官继续：「具体的数据结构是什么？keys 数组起什么作用？」——大多数人到这里就卡住了。这篇文章，从源码级别把这 9 个 API 全讲透。

---

## 🎯 这篇文章解决什么问题

Vue 2 的内置组件和全局 API 是面试高频考点，但网上大多数资料要么只讲用法，要么源码贴一大段没有串讲。这篇文章既讲原理，也讲面试怎么答：每个知识点讲完立刻跟上面试视角，给出标准答案和加分答案。

覆盖 9 个核心 API：keep-alive、transition、Vue.mixin、Vue.use、Vue.extend、Vue.observable、$set/$delete、$attrs/$listeners、errorCaptured。

---

## 🎯 一、keep-alive：LRU 缓存组件的底层实现

### 基本使用

keep-alive 是一个抽象组件，它本身不渲染 DOM，只是包裹动态组件，让其在切换时不销毁。

```html
<!-- 基本用法 -->
<keep-alive>
  <component :is="currentView" />
</keep-alive>

<!-- include：只缓存名字匹配的组件 -->
<keep-alive :include="['PatientList', 'DepartmentList']">
  <router-view />
</keep-alive>

<!-- exclude：排除某些组件不缓存 -->
<keep-alive exclude="ConfirmDialog">
  <component :is="currentView" />
</keep-alive>

<!-- max：最多缓存多少个组件实例，超出则淘汰最久未访问的 -->
<keep-alive :max="10">
  <router-view />
</keep-alive>
```

`include` / `exclude` 支持字符串、正则、数组三种格式，匹配的是组件的 `name` 选项。

### LRU 缓存原理

keep-alive 的核心是一个 **LRU（最近最少使用）缓存**。LRU 的规则很简单：

- 访问一个缓存中的项，把它移到「最近使用」的位置
- 当缓存满了，淘汰「最久没被访问」的项

Vue 2 用 **Map + keys 数组**实现了这个 LRU：

```
cache = Map { key → vnode }   ← 存缓存的虚拟节点
keys  = ['A', 'B', 'C']       ← 记录访问顺序，队尾 = 最近访问
```

每次渲染时：
- 命中缓存：把这个 key 从 keys 数组中间删掉，重新 push 到末尾（表示「最近刚用过」）
- 未命中：把新 vnode 存入 cache，key push 到 keys 末尾
- 超过 max：删掉 `keys[0]`（队头 = 最久未访问），同时从 cache 中删除对应 vnode

### 源码解析：`src/core/components/keep-alive.js`

下面是 keep-alive 核心逻辑的精简版，对应 Vue 2 官方源码结构：

```javascript
export default {
  name: 'keep-alive',
  abstract: true, // 👈 抽象组件，不渲染自身，不出现在父链中

  props: {
    include: patternTypes,
    exclude: patternTypes,
    max: [String, Number]
  },

  created() {
    this.cache = Object.create(null) // Map: key → vnode
    this.keys = []                    // 访问顺序数组
  },

  destroyed() {
    // keep-alive 销毁时，清空所有缓存并调用 $destroy
    for (const key in this.cache) {
      pruneCacheEntry(this.cache, key, this.keys)
    }
  },

  mounted() {
    // 监听 include/exclude 变化，动态清理不再匹配的缓存
    this.$watch('include', val => {
      pruneCache(this, name => matches(val, name))
    })
    this.$watch('exclude', val => {
      pruneCache(this, name => !matches(val, name))
    })
  },

  render() {
    const slot = this.$slots.default
    const vnode = getFirstComponentChild(slot) // 取第一个子组件的 vnode
    const componentOptions = vnode && vnode.componentOptions
    if (componentOptions) {
      const name = getComponentName(componentOptions)
      const { include, exclude } = this
      // 不在 include 中，或在 exclude 中，直接返回（不缓存）
      if (
        (include && (!name || !matches(include, name))) ||
        (exclude && name && matches(exclude, name))
      ) {
        return vnode
      }

      const { cache, keys } = this
      const key = vnode.key == null
        ? componentOptions.Ctor.cid + (componentOptions.tag ? `::${componentOptions.tag}` : '')
        : vnode.key

      if (cache[key]) {
        // ✅ 命中缓存：复用已有 vnode.componentInstance
        vnode.componentInstance = cache[key].componentInstance
        // 👈 LRU：把 key 移到 keys 末尾（表示最近访问）
        remove(keys, key)
        keys.push(key)
      } else {
        // ✅ 未命中：存入缓存
        cache[key] = vnode
        keys.push(key)
        // 👈 超过 max，淘汰 keys[0]（最久未访问）
        if (this.max && keys.length > parseInt(this.max)) {
          pruneCacheEntry(cache, keys[0], keys, this._vnode)
        }
      }

      vnode.data.keepAlive = true // 标记为 keep-alive 缓存的组件
    }
    return vnode
  }
}

function pruneCacheEntry(cache, key, keys, current) {
  const cached = cache[key]
  // 只有不是当前渲染的组件，才调用 $destroy
  if (cached && (!current || cached.tag !== current.tag)) {
    cached.componentInstance.$destroy() // 👈 超出 max 会触发 beforeDestroy + destroyed
  }
  cache[key] = null
  remove(keys, key)
}
```

### activated / deactivated 钩子

被 keep-alive 包裹的组件，切换时**不走 created/destroyed 生命周期**，而是走：

- 从缓存激活：`activated`
- 回到缓存休眠：`deactivated`

```
首次挂载：beforeCreate → created → beforeMount → mounted → activated
切换离开：deactivated（不会触发 beforeDestroy）
切换回来：activated（不会触发 created）
keep-alive 本身销毁时：beforeDestroy → destroyed（才真正销毁）
```

**与 beforeDestroy 的区别**：`deactivated` 只是「休眠」，DOM 和状态都保留；`beforeDestroy` 才是真正销毁，keep-alive 超出 max 删除缓存时才会触发被淘汰组件的 `beforeDestroy`。

### 最佳实践：医疗场景动态白名单

在医疗 AI 问诊系统里，问诊进行中的页面需要缓存（用户切换到用药记录再回来，填写内容不能丢），而弹窗、确认页面不需要缓存：

```javascript
// store/cache.js
export const cacheStore = Vue.observable({
  cachedViews: ['ConsultationForm', 'DepartmentList', 'PatientProfile']
})

// App.vue
<keep-alive :include="cacheStore.cachedViews">
  <router-view />
</keep-alive>

// 需要临时关闭缓存时（如提交表单后重置）
methods: {
  afterSubmit() {
    const idx = cacheStore.cachedViews.indexOf('ConsultationForm')
    if (idx > -1) cacheStore.cachedViews.splice(idx, 1)
    this.$router.push('/home')
    // 下次进入时重新添加
    this.$nextTick(() => cacheStore.cachedViews.push('ConsultationForm'))
  }
}
```

> 💬 **面试官**：keep-alive 的 LRU 缓存是怎么实现的？max 触发时调用哪个生命周期？
>
> ✅ 标准答案：用 Map 存 `key → vnode` 缓存，用 `keys` 数组维护访问顺序（末尾 = 最近访问）。超过 max 时删除 `keys[0]`，同时从 Map 里删对应缓存，并调用被淘汰组件的 `$destroy()`，触发其 `beforeDestroy` 和 `destroyed`。
>
> 🎁 加分答案：被缓存的组件切换时不走 created/destroyed，走 activated/deactivated；keep-alive 使用了 `abstract: true` 标记，不渲染自身 DOM，不出现在组件父链中。

---

## 🎬 二、transition：动画钩子执行序列全链路

### 基本使用

```html
<transition name="fade">
  <div v-if="show">内容</div>
</transition>
```

Vue 自动在元素进入/离开时添加 CSS 类名，并触发 JS 钩子。

### enter 动画的完整序列

```
元素插入前：添加 v-enter、v-enter-active
    ↓
下一帧（requestAnimationFrame）：移除 v-enter，添加 v-enter-to
    ↓
transition/animation 结束：移除 v-enter-active、v-enter-to
    ↓
触发 after-enter 钩子
```

对应 6 个 CSS 类名：

```
v-enter           → 进入起始状态（元素插入前加，下一帧删）
v-enter-active    → 进入过渡中（贯穿整个 enter 阶段，定义 transition 规则）
v-enter-to        → 进入结束状态（下一帧加，动画完成后删）
v-leave           → 离开起始状态
v-leave-active    → 离开过渡中
v-leave-to        → 离开结束状态
```

### JS 钩子与 CSS 协同

当你同时用 CSS 和 JS 钩子时，Vue 会检测元素上是否有 CSS transition/animation（通过 `getComputedStyle` 判断 `transition-duration` 和 `animation-duration` 是否为空），决定等待 `transitionend` / `animationend` 事件还是直接调用 `done`。

```html
<transition
  @before-enter="beforeEnter"
  @enter="enter"
  @after-enter="afterEnter"
  @enter-cancelled="enterCancelled"
  @before-leave="beforeLeave"
  @leave="leave"
  @after-leave="afterLeave"
  :css="false"
>
  <!-- :css="false" 跳过 CSS 检测，完全由 JS 控制，enter 中必须调用 done() -->
</transition>
```

**完整 JS 钩子序列**：

```
进入：before-enter → enter（此处加 done 回调，不加则不结束） → after-enter
     （如果在 enter 阶段中断：enter-cancelled）
离开：before-leave → leave → after-leave
     （如果在 leave 阶段中断：leave-cancelled）
```

### 性能优化：触发 GPU 加速

```css
.fade-enter-active,
.fade-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
  /* ✅ 用 transform 替代 left/top，不触发 layout */
  will-change: transform, opacity; /* 👈 提示浏览器提前开启 GPU 层 */
}

.fade-enter,
.fade-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}

/* ❌ 避免这样写，会触发 layout（重排） */
.bad-enter {
  left: -20px; /* 触发 layout */
  height: 0;   /* 触发 layout */
}
```

### scoped-slot 编译产物：与普通 slot 的对比

顺带把 slot 编译差异放在这里，因为它和 transition 都涉及组件内容分发的编译机制。

**普通 slot（静态内容分发）**：

```javascript
// 父组件模板：<MyComp><span>内容</span></MyComp>
// 编译结果：
_c('MyComp', [_c('span', [_v('内容')])])
// 子组件渲染时：直接使用 vm.$slots.default（VNode 数组）
```

**scoped-slot（作用域插槽，可传递数据）**：

```javascript
// 父组件模板：
// <MyComp>
//   <template v-slot:default="{ item }">{{ item.name }}</template>
// </MyComp>

// 编译结果（父组件）：传入的是一个函数，不是 VNode
_c('MyComp', {
  scopedSlots: _u([{
    key: "default",
    fn: function({ item }) {  // 👈 插槽是函数，接收子组件传递的数据
      return [_v(_s(item.name))]
    }
  }])
})

// 子组件渲染时：调用函数并传入数据
vm.$scopedSlots.default({ item: this.item }) // 👈 主动调用，控制传参
```

**核心区别**：普通 slot 是静态 VNode，在父组件上下文编译；scoped-slot 是函数，在子组件渲染时调用，可以把子组件内部数据传给父组件的插槽内容。

> 💬 **面试官**：scoped-slot 和普通 slot 的编译产物有什么区别？
>
> ✅ 标准答案：普通 slot 编译成父组件传入的 VNode 数组，子组件通过 `$slots.default` 直接使用；scoped-slot 编译成一个函数，子组件调用 `$scopedSlots.default({ ...data })` 时才执行，可以把子组件的数据传给父组件的插槽内容。
>
> 🎁 加分答案：这是 Vue 2 中数据流「由下往上」的唯一渠道（Props 是由上往下，$emit 是事件；scoped-slot 让父组件的插槽内容能使用子组件的数据），Vue 3 统一成了 `v-slot`，取消了普通 slot 和 scoped-slot 的区分。

---

## 🔀 三、Vue.mixin 合并策略：mergeOptions 的分层规则

### 基本使用

```javascript
// 全局混入（影响所有组件，慎用）
Vue.mixin({
  created() {
    console.log('全局 mixin created')
  }
})

// 局部混入（只影响当前组件）
const loadingMixin = {
  data() {
    return { loading: false }
  },
  methods: {
    async fetchData(fn) {
      this.loading = true
      try { await fn() }
      finally { this.loading = false }
    }
  }
}
export default {
  mixins: [loadingMixin],
  // ...
}
```

### mergeOptions 合并策略源码

Vue 2 的合并策略定义在 `src/core/util/options.js` 中，核心是一个 `strats`（strategies）策略对象——根据不同的选项 key，用不同的合并函数处理。

以下是我们手写 Vue 时实现的完整 `mergeOptions`，与官方源码结构一致：

```javascript
export const LIFECYCLE_HOOKS = [
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeDestroy',
  'destroyed',
  'activated',
  'deactivated',
  'errorCaptured',
  'serverPrefetch'
]
const starts = {}
starts.data = function (parentVal, childVal) {
  // 这里应该有合并 data 的策略
  return childVal
}

starts.components = function(parentVal, childVal) {
  // console.log(parentVal, childVal)
  const res = Object.create(parentVal)
  if(childVal) {
    for (const key in childVal) {
      if (childVal.hasOwnProperty(key)) {
        const val = childVal[key];
        res[key] = val
      }
    }
  }
  return res
}

// 生命周期合并
function mergeHook(parentVal, childVal) { 
  if(childVal) {
    if(parentVal) {
      // 父子进行拼接
      return parentVal.concat(childVal) // 👈 mixin 在前，组件在后
    } else {
      return [childVal] // 子级需要转化成数组
    }
  } else {
    return parentVal // 不合并采用父级
  }
}

LIFECYCLE_HOOKS.forEach(hook => {
  starts[hook] = mergeHook
})

export function mergeOptions(parent, child) {
  // 遍历父级，可能父级有，子级没有
  const options = {}
  for(let key in parent) { // 父级子级都有在这里处理
    mergeField(key)
  }
  // 自己有父级没有在这里处理
  for(let key in child) {
    if(!parent.hasOwnProperty(key)) {
      mergeField(key)
    }
  }

  // 合并字段
  function mergeField(key) {
    // 根据 key 不同的策略进行合并
    if(starts[key]) {
      options[key] = starts[key](parent[key], child[key])
    } else {
      // 默认合并：子覆盖父
      if(child[key]) {
        options[key] = child[key]
      } else {
        options[key] = parent[key]
      }
    }
  }

  return options
}
```

### 三类合并策略总结

| 选项类型 | 合并策略 | 效果 |
|---------|---------|-----|
| 生命周期钩子 | 数组合并（`concat`） | mixin 的钩子先于组件钩子执行 |
| `data` | 递归合并（组件优先） | 组件 data 中同名属性覆盖 mixin |
| `methods`/`computed`/`components` | 组件覆盖 mixin | 组件中的同名方法/组件覆盖 mixin |
| `watch` | 数组合并 | 两个都会触发，mixin 先执行 |

**生命周期执行顺序验证**：

```javascript
const mixin = {
  created() { console.log('mixin created') }
}
export default {
  mixins: [mixin],
  created() { console.log('component created') }
}
// 输出顺序：
// mixin created       ← 先
// component created   ← 后
```

这是因为 `mergeHook` 用的是 `parentVal.concat(childVal)`，mixin 是 parentVal，组件是 childVal，所以 mixin 排在数组前面先执行。

### 命名冲突风险与替代方案

mixin 的命名冲突是它最大的隐患——两个 mixin 都定义了 `handleClick`，用哪个？调试时根本不知道方法从哪来：

```javascript
// ❌ 容易出问题：两个 mixin 都有 loading，组件不知道用哪个
const mixin1 = { data: () => ({ loading: false }) }
const mixin2 = { data: () => ({ loading: false }) }

// ✅ Vue 3 的 Composable 解决了这个问题
function useLoading() {
  const loading = ref(false)
  return { loading }  // 变量名由调用方决定，不会冲突
}
// 使用时：const { loading: listLoading } = useLoading()
```

在 Vue 2 项目中，替代 mixin 的方案：
- **HOC（高阶组件）**：用函数返回一个包装组件，隔离逻辑
- **插件**：通过 Vue.use 注入全局方法，避免重复引入

> 💬 **面试官**：mixin 的合并策略是什么？同名生命周期谁先执行？
>
> ✅ 标准答案：mergeOptions 对不同选项用不同策略。生命周期用数组合并（concat），mixin 的钩子排在前面先执行；data 用递归合并，组件的 data 优先；methods/computed/components 组件的选项直接覆盖 mixin 的同名选项。
>
> 🎁 加分答案：说出 mergeHook 用 `parentVal.concat(childVal)` 的实现细节，以及为什么 Vue 3 用 Composable 替代 mixin（解决命名冲突 + 来源不清晰 + 类型推断困难三个问题）。

---

## 🔌 四、Vue.use + Vue.extend：插件安装与命令式组件

### Vue.use：install 机制

```javascript
// 插件可以是函数，也可以是有 install 方法的对象
const MyPlugin = {
  install(Vue, options) {
    Vue.prototype.$myMethod = function() { /* ... */ }
    Vue.directive('my-directive', { /* ... */ })
    Vue.component('MyComponent', { /* ... */ })
  }
}
Vue.use(MyPlugin)
Vue.use(MyPlugin) // 重复调用无效
```

源码 `src/core/global-api/use.js` 的核心逻辑：

```javascript
Vue.use = function(plugin) {
  const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
  // 👈 防重复注册：检查是否已经安装过
  if (installedPlugins.indexOf(plugin) > -1) {
    return this
  }
  const args = toArray(arguments, 1) // 取 options 参数
  args.unshift(this)                  // 把 Vue 放在第一个参数
  if (typeof plugin.install === 'function') {
    plugin.install.apply(plugin, args) // 调用 install
  } else if (typeof plugin === 'function') {
    plugin.apply(null, args)            // 插件本身就是函数
  }
  installedPlugins.push(plugin)       // 记录已安装
  return this
}
```

**手写 miniVueUse**：

```javascript
function miniUse(plugin) {
  if (!this._installedPlugins) this._installedPlugins = []
  if (this._installedPlugins.includes(plugin)) return this
  plugin.install ? plugin.install(this) : plugin(this)
  this._installedPlugins.push(plugin)
  return this
}
```

### Vue.extend：创建 Sub 构造函数

Vue.extend 的核心是创建一个继承 Vue 的子类。每次传入相同的 `extendOptions`，Vue 会把生成的 Sub 缓存在 `extendOptions._Ctor[superCid]` 上，避免重复创建。

来自我们手写源码的 `src/global-api/extend.js`：

```javascript
export default function initExtend (Vue) {
  let cid = 0
  // 核心就是创造一个子类继承我们父类
  Vue.extend = function(extendOptions) {
    // todo:如果对象相同，应该复用做缓存
    const Super = this // this => Vue
    const Sub = function VueComponent(options) {
      this._init(options) // 继承父类 _init 方法
    }
    Sub.cid = cid++
    // 子类继承父类原型上的方法
    Sub.prototype = Object.create(Super.prototype)
    Sub.prototype.constructor = Sub
    Sub.options = mergeOptions(Super.options, extendOptions)
    Sub.components = Super.components

    return Sub
  }
}
```

Vue 2 官方源码在此基础上增加了 `_Ctor` 缓存：

```javascript
// 官方源码关键片段（src/core/global-api/extend.js）
Vue.extend = function(extendOptions) {
  extendOptions = extendOptions || {}
  const Super = this
  const SuperId = Super.cid
  const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
  // 👈 缓存：同一个 extendOptions 对象，同一个 Super，直接返回缓存的 Sub
  if (cachedCtors[SuperId]) {
    return cachedCtors[SuperId]
  }
  // ... 创建 Sub ...
  cachedCtors[SuperId] = Sub // 存入缓存
  return Sub
}
```

### 命令式弹窗：Vue.extend 的核心场景

命令式弹窗（`this.$confirm('确认删除？')` 这样的用法）是 Vue.extend 最典型的应用场景。

```javascript
// confirm.js
import Vue from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'

let instance = null

export function $confirm(options = {}) {
  return new Promise((resolve, reject) => {
    const Ctor = Vue.extend(ConfirmDialog) // 👈 创建子类构造函数
    instance = new Ctor({                  // 👈 实例化
      propsData: { ...options }
    })
    instance.$mount()                       // 👈 挂载但不插入 DOM
    document.body.appendChild(instance.$el) // 👈 插入到 body

    instance.onConfirm = resolve
    instance.onCancel = reject

    // 关闭时清理
    instance.$once('hook:beforeDestroy', () => {
      if (instance.$el && instance.$el.parentNode) {
        instance.$el.parentNode.removeChild(instance.$el)
      }
      instance = null
    })
  })
}

// 使用时（医疗场景：提交问诊前确认）
async function submitConsultation() {
  try {
    await $confirm({ title: '确认提交？', content: '提交后不可修改问诊信息' })
    await api.submitConsultation(this.form)
    this.$router.push('/success')
  } catch {
    // 用户取消
  }
}
```

### `$once + hook:beforeDestroy` 优雅自清理

这个模式解决了「组件内注册了第三方事件/监听器，但忘记在 beforeDestroy 里注销」的问题：

```javascript
// ❌ 容易忘记清理的写法
export default {
  mounted() {
    this.chart = echarts.init(this.$el)
    window.addEventListener('resize', this.handleResize) // 忘记清理 → 内存泄漏
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize) // 需要手动对应
    this.chart.dispose()
  }
}

// ✅ $once + hook:beforeDestroy，注册和清理写在一起，不会忘
export default {
  mounted() {
    this.chart = echarts.init(this.$el)
    window.addEventListener('resize', this.handleResize)
    // 👈 监听自身销毁事件，自动清理，不需要在 beforeDestroy 里再写
    this.$once('hook:beforeDestroy', () => {
      window.removeEventListener('resize', this.handleResize)
      this.chart.dispose()
    })
  }
}
```

`hook:beforeDestroy` 是 Vue 2 的内部事件机制，在调用对应生命周期钩子时会 `$emit('hook:beforeDestroy')`，用 `$once` 监听可以做到「注册和清理写在一起，自动只执行一次」。

> 💬 **面试官**：Vue.extend 的使用场景是什么？命令式弹窗怎么实现？
>
> ✅ 标准答案：Vue.extend 创建继承 Vue 的子类构造函数，常用于命令式组件（弹窗/Toast/Loading）。实现步骤：Vue.extend(组件配置) → new Ctor({ propsData }) → $mount() → document.body.appendChild(instance.$el)。Vue 会把同一配置的子类缓存在 `_Ctor` 上避免重复创建。
>
> 🎁 加分答案：说出 `$once + hook:beforeDestroy` 优雅自清理模式，并解释这种模式为什么比在 beforeDestroy 中手写 $off 更安全（注册和清理代码在同一位置，不会出现注册了但忘记清理的情况）。

---

## ⚡ 五、Vue.observable + $set / $delete：响应式 API 补全

### Vue.observable：轻量全局状态

Vue 2.6 新增的 `Vue.observable`，让你对一个普通对象调用 `observe()`，返回响应式对象——这就是一个轻量的全局状态方案：

```javascript
// store/theme.js
import Vue from 'vue'

export const themeState = Vue.observable({
  primaryColor: '#1890ff',
  darkMode: false
})

export const themeActions = {
  toggleDarkMode() {
    themeState.darkMode = !themeState.darkMode
  },
  setColor(color) {
    themeState.primaryColor = color
  }
}
```

```html
<!-- 任意组件中直接用，响应式更新 -->
<template>
  <div :class="{ dark: themeState.darkMode }">
    <span :style="{ color: themeState.primaryColor }">内容</span>
  </div>
</template>
<script>
import { themeState } from '@/store/theme'
export default {
  computed: {
    themeState() { return themeState }
  }
}
</script>
```

**vs Vuex 选型决策**：

| 场景 | 推荐 |
|------|------|
| 简单的跨组件共享状态（主题、语言、用户偏好） | Vue.observable |
| 复杂业务状态、需要时间旅行调试、团队协作 | Vuex |
| 状态有多个 mutation、需要 action 异步流 | Vuex |
| 只需要 2-3 个字段的全局状态 | Vue.observable |

### $set 源码解析

`$set` 解决的问题：Vue 2 用 `Object.defineProperty` 在对象初始化时劫持属性，**无法检测新增属性**。`this.obj.newKey = value` 不会触发响应式，必须用 `$set`。

源码对应 `src/core/observer/index.js` 中的 `set` 函数，两条路径：

```javascript
// Vue 源码 set 函数（精简版）
export function set(target, key, val) {
  // 路径1：target 是数组，走 splice（已被拦截，会触发响应式）
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val) // 👈 splice 已被重写，会触发 dep.notify
    return val
  }

  // 如果 key 已经存在，直接赋值即可（已有 getter/setter）
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }

  const ob = target.__ob__
  // target 不是响应式对象（没有 __ob__），直接赋值
  if (!ob) {
    target[key] = val
    return val
  }

  // 路径2：target 是响应式对象，新增属性
  defineReactive(ob.value, key, val) // 👈 给新属性添加 getter/setter
  ob.dep.notify()                    // 👈 通知依赖更新
  return val
}
```

**手写 miniSet**：

```javascript
function miniSet(target, key, val) {
  if (Array.isArray(target)) {
    target.splice(key, 1, val)
    return val
  }
  const ob = target.__ob__
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(target, key, val)
  ob.dep.notify()
  return val
}
```

### $delete 源码解析

`$delete` 的逻辑对称：

```javascript
export function del(target, key) {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1) // 数组走 splice，触发响应式
    return
  }
  const ob = target.__ob__
  if (!hasOwn(target, key)) return // key 不存在，直接返回
  delete target[key]                // 删除属性
  if (!ob) return                   // 非响应式，不通知
  ob.dep.notify()                   // 通知依赖更新
}
```

🔧 **真实场景**：在医疗 AI 问诊系统里，表单数据是动态的——用户选择「复诊」时，需要动态添加 `previousDiagnosis` 字段；切换回「初诊」时删除该字段。必须用 `$set` 和 `$delete`，直接赋值不会触发视图更新。

> 💬 **面试官**：为什么直接给对象新增属性不触发响应式？$set 做了什么？
>
> ✅ 标准答案：Vue 2 在初始化时通过 Object.defineProperty 劫持已有属性，新增属性没有 getter/setter，所以不响应。$set 对数组走 splice（已被重写）；对普通对象，调用 defineReactive 给新属性添加 getter/setter，再通过 `ob.dep.notify()` 触发更新。
>
> 🎁 加分答案：Vue 3 用 Proxy 代理整个对象，可以拦截属性的新增和删除，所以不需要 $set。这是 Vue 3 响应式升级的核心优势之一。

---

## 🌐 六、$attrs / $listeners + errorCaptured：透传与错误边界

### $attrs / $listeners：二次封装组件的标准模式

`$attrs` 包含父组件传下来的、子组件没有在 `props` 里声明的属性。`$listeners` 包含父组件通过 `v-on` 绑定的事件（不含 `.native` 修饰符的事件）。

配合 `inheritAttrs: false` 使用，可以精确控制属性挂载到哪个元素上：

```html
<!-- 封装 Element UI 的 el-input，透传所有属性和事件 -->
<template>
  <div class="my-input-wrapper">
    <label>{{ label }}</label>
    <!-- 👈 v-bind="$attrs" 把非 props 属性透传给 el-input -->
    <!-- 👈 v-on="$listeners" 把事件透传（包括 input、change、focus 等） -->
    <el-input v-bind="$attrs" v-on="$listeners" />
    <span class="error">{{ error }}</span>
  </div>
</template>

<script>
export default {
  name: 'MyInput',
  inheritAttrs: false, // 👈 关键：阻止属性自动挂载到根元素，改为手动绑定
  props: {
    label: String,
    error: String
    // 其他属性（placeholder、disabled、maxlength 等）不声明，
    // 通过 $attrs 透传给 el-input
  }
}
</script>
```

🔧 在医疗问诊系统里，封装了统一的 `<MedInput>` 组件，在 label 和 error 基础上透传所有 Element UI 的输入参数（placeholder、disabled、maxlength、prefix-icon 等）。通过 `$attrs/$listeners` 不需要逐一声明 props，维护成本极低。

### errorCaptured：组件树错误边界

`errorCaptured` 钩子可以捕获子孙组件中抛出的错误：

```javascript
export default {
  name: 'ErrorBoundary',
  data() {
    return { hasError: false, error: null }
  },
  errorCaptured(err, vm, info) {
    this.hasError = true
    this.error = err
    // 返回 false 可以阻止错误继续向上冒泡
    return false
  },
  render(h) {
    if (this.hasError) {
      return h('div', { class: 'error-fallback' }, [
        h('p', '组件加载失败，请刷新重试'),
        h('button', { on: { click: () => { this.hasError = false } } }, '重试')
      ])
    }
    return this.$slots.default[0]
  }
}
```

**错误冒泡链**：

```
子组件抛出错误
    ↓
沿着组件树向上，逐级调用祖先的 errorCaptured
    ↓
如果某个 errorCaptured 返回 false → 停止冒泡
    ↓
最终到达 Vue.config.errorHandler（全局兜底）
    ↓
如果没有配置 errorHandler → 抛到控制台
```

```javascript
// 全局错误兜底，配合监控系统使用
Vue.config.errorHandler = function(err, vm, info) {
  console.error(`[Vue Error] ${info}:`, err)
  // 上报到监控平台
  reportError({ error: err, component: vm.$options.name, info })
}
```

🔧 在 AI 问诊模块里，AI 回复组件可能因为 Markdown 渲染异常、网络错误等原因崩溃。用 `ErrorBoundary` 包裹，捕获到错误后显示「回复加载失败，点击重试」，而不是让整个问诊页白屏。

> 💬 **面试官**：$attrs 和 props 有什么区别？errorCaptured 返回 false 有什么作用？
>
> ✅ 标准答案：$attrs 包含父组件传的、子组件未在 props 里声明的属性，配合 inheritAttrs: false 可精确控制属性绑到哪里；props 是声明式的，有类型检查和默认值。errorCaptured 返回 false 会阻止错误继续向上冒泡，不会再传给祖先的 errorCaptured 也不会到 Vue.config.errorHandler。
>
> 🎁 加分答案：Vue 3 把 $listeners 合并进了 $attrs（因为 v-on 本质上也是属性），所以 Vue 3 里透传只需要 `v-bind="$attrs"` 即可，不需要再写 `v-on="$listeners"`。

---

## 📖 七、源码解析（重点代码，来源 GitHub 仓库）

> 链路位置：keep-alive → mergeOptions → Vue.use → Vue.extend → $set/$delete 完整串联

### keep-alive LRU（src/core/components/keep-alive.js）

```javascript
// 核心 render 函数：LRU 命中/未命中/淘汰三条路径
render() {
  const slot = this.$slots.default
  const vnode = getFirstComponentChild(slot)
  const componentOptions = vnode && vnode.componentOptions
  if (componentOptions) {
    const name = getComponentName(componentOptions)
    const { include, exclude } = this
    if (
      (include && (!name || !matches(include, name))) ||
      (exclude && name && matches(exclude, name))
    ) {
      return vnode  // 不命中 include / 命中 exclude：直接返回，不缓存
    }
    const { cache, keys } = this
    const key = vnode.key == null
      ? componentOptions.Ctor.cid + (componentOptions.tag ? `::${componentOptions.tag}` : '')
      : vnode.key
    if (cache[key]) {
      // ✅ 命中：复用 componentInstance，把 key 移到末尾（LRU 刷新）
      vnode.componentInstance = cache[key].componentInstance
      remove(keys, key)
      keys.push(key)
    } else {
      // ✅ 未命中：存入缓存
      cache[key] = vnode
      keys.push(key)
      // 超过 max：淘汰 keys[0]，触发被淘汰组件的 $destroy
      if (this.max && keys.length > parseInt(this.max)) {
        pruneCacheEntry(cache, keys[0], keys, this._vnode)
      }
    }
    vnode.data.keepAlive = true
  }
  return vnode
}

function pruneCacheEntry(cache, key, keys, current) {
  const cached = cache[key]
  if (cached && (!current || cached.tag !== current.tag)) {
    cached.componentInstance.$destroy()  // 👈 淘汰 → beforeDestroy + destroyed
  }
  cache[key] = null
  remove(keys, key)
}
```

### mergeOptions 策略（src/core/util/options.js）

```javascript
// strats 策略对象：不同 key 用不同合并函数
const strats = config.optionMergeStrategies

// 生命周期：数组合并，parentVal（mixin）排在前面
function mergeHook(parentVal, childVal) {
  const res = childVal
    ? parentVal
      ? parentVal.concat(childVal)  // 👈 concat：mixin 先，组件后
      : Array.isArray(childVal)
        ? childVal
        : [childVal]
    : parentVal
  return res ? dedupeHooks(res) : res
}
LIFECYCLE_HOOKS.forEach(hook => { strats[hook] = mergeHook })

// data：mergeDataOrFn 递归合并，组件 data 优先
strats.data = function(parentVal, childVal, vm) {
  if (!vm) {
    // Vue.extend 场景
    if (!childVal) return parentVal
    if (!parentVal) return childVal
    return function mergedDataFn() {
      return mergeData(
        typeof childVal === 'function' ? childVal.call(this, this) : childVal,
        typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal
      )
    }
  }
  return function mergedInstanceDataFn() {
    const instanceData = typeof childVal === 'function' ? childVal.call(vm, vm) : childVal
    const defaultData = typeof parentVal === 'function' ? parentVal.call(vm, vm) : parentVal
    if (instanceData) {
      return mergeData(instanceData, defaultData)  // 组件 data 优先
    } else {
      return defaultData
    }
  }
}
```

### Vue.use（src/core/global-api/use.js）

```javascript
Vue.use = function(plugin) {
  const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
  if (installedPlugins.indexOf(plugin) > -1) {
    return this  // 👈 防重复：已安装直接返回
  }
  const args = toArray(arguments, 1)
  args.unshift(this)  // args = [Vue, ...options]
  if (typeof plugin.install === 'function') {
    plugin.install.apply(plugin, args)
  } else if (typeof plugin === 'function') {
    plugin.apply(null, args)
  }
  installedPlugins.push(plugin)
  return this
}
```

### Vue.extend（src/core/global-api/extend.js）

```javascript
Vue.extend = function(extendOptions) {
  extendOptions = extendOptions || {}
  const Super = this
  const SuperId = Super.cid
  const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
  if (cachedCtors[SuperId]) {
    return cachedCtors[SuperId]  // 👈 缓存：同一 extendOptions + 同一父类 → 直接返回
  }
  const Sub = function VueComponent(options) {
    this._init(options)
  }
  Sub.prototype = Object.create(Super.prototype)
  Sub.prototype.constructor = Sub
  Sub.cid = cid++
  Sub.options = mergeOptions(Super.options, extendOptions)
  Sub['super'] = Super
  // 继承父类的静态方法（组件注册、指令等）
  Sub.extend = Super.extend
  Sub.mixin = Super.mixin
  Sub.use = Super.use
  Sub.component = Super.component
  Sub.directive = Super.directive
  Sub.filter = Super.filter
  cachedCtors[SuperId] = Sub  // 存入缓存
  return Sub
}
```

### $set / $delete（src/core/observer/index.js）

```javascript
// set：对响应式对象新增属性的完整路径
export function set(target, key, val) {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)  // 👈 splice 已被重写，触发响应式
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val  // 已有属性，直接赋值（已有 getter/setter）
    return val
  }
  const ob = (target).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    warn('Avoid adding reactive properties to a Vue instance or its root $data ...')
    return val
  }
  if (!ob) {
    target[key] = val  // 非响应式对象，直接赋值
    return val
  }
  defineReactive(ob.value, key, val)  // 👈 添加 getter/setter
  ob.dep.notify()                     // 👈 通知所有 watcher 更新
  return val
}

// del：删除属性并触发更新
export function del(target, key) {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    warn('Avoid deleting properties on a Vue instance or its root $data ...')
    return
  }
  if (!hasOwn(target, key)) return
  delete target[key]
  if (!ob) return
  ob.dep.notify()  // 👈 通知更新
}
```

---

## 🛠️ 八、手写实现：医疗场景完整代码

基于前面章节的原理，用 Rollup 搭建的手写 Vue 环境（复用第一章 Rollup 配置），实现核心 API 的可运行版本。

### Rollup 环境（复用已有配置）

项目结构沿用手写 Vue 源码的配置，参考本系列第1篇「Rollup 环境搭建」，`rollup.config.js` 完整配置如下：

```javascript
import babel from 'rollup-plugin-babel'
import serve from 'rollup-plugin-serve'
export default {
  input: './src/index.js', // 入口，以这个入口打包库
  output: {
    format: 'umd',
    name: 'Vue',
    file: 'dist/umd/vue.js',
    sourcemap: true
  },
  plugins: [
    babel({
      exclude: 'node_modules/**'
    }),
    serve({
      open: true,
      port: 3000,
      contentBase: '',
      openPage:'index.html'
    })
  ]
}
```

### 手写 keep-alive LRU（科室切换缓存）

```javascript
// src/components/keep-alive.js
// 医疗场景：科室列表、问诊记录页面缓存，切换科室不重新加载
class LRUCache {
  constructor(max) {
    this.max = max
    this.cache = new Map() // key → vnode
    this.keys = []         // 访问顺序，队尾 = 最近访问
  }

  get(key) {
    if (!this.cache.has(key)) return null
    // 命中：移到末尾（最近访问）
    this._moveToEnd(key)
    return this.cache.get(key)
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this._moveToEnd(key)
      this.cache.set(key, value)
      return
    }
    // 超出 max：淘汰队头（最久未访问）
    if (this.keys.length >= this.max) {
      const oldest = this.keys.shift() // 👈 淘汰
      this.cache.delete(oldest)
      console.log(`[LRU] 淘汰组件: ${oldest}`) // 对应 $destroy
    }
    this.cache.set(key, value)
    this.keys.push(key)
  }

  _moveToEnd(key) {
    const idx = this.keys.indexOf(key)
    if (idx > -1) {
      this.keys.splice(idx, 1)
      this.keys.push(key)
    }
  }
}

// 测试：最多缓存 3 个科室页面
const cache = new LRUCache(3)
cache.set('内科', { name: '内科', scrollTop: 200 })
cache.set('外科', { name: '外科', scrollTop: 0 })
cache.set('儿科', { name: '儿科', scrollTop: 100 })
cache.set('眼科', { name: '眼科', scrollTop: 50 }) // 内科被淘汰
console.log(cache.get('内科')) // null，已淘汰
console.log(cache.get('外科')) // { name: '外科', ... }，命中
```

### 手写 mergeOptions（miniMixin）

```javascript
// src/util/merge.js
// 基于手写源码，完整 mergeOptions 实现（见第三章源码）
// 核心：mergeHook 用 concat，mixin 的钩子排在前面先执行
const LIFECYCLE_HOOKS = [
  'beforeCreate', 'created', 'beforeMount', 'mounted',
  'beforeUpdate', 'updated', 'beforeDestroy', 'destroyed',
  'activated', 'deactivated', 'errorCaptured'
]

function mergeHook(parentVal, childVal) {
  if (childVal) {
    if (parentVal) return parentVal.concat(childVal)
    return [childVal]
  }
  return parentVal
}

const strats = {}
LIFECYCLE_HOOKS.forEach(hook => strats[hook] = mergeHook)
strats.data = (parentVal, childVal) => childVal || parentVal

export function mergeOptions(parent, child) {
  const options = {}
  const mergeField = (key) => {
    if (strats[key]) {
      options[key] = strats[key](parent[key], child[key])
    } else {
      options[key] = child[key] !== undefined ? child[key] : parent[key]
    }
  }
  for (let key in parent) mergeField(key)
  for (let key in child) {
    if (!Object.prototype.hasOwnProperty.call(parent, key)) mergeField(key)
  }
  return options
}
```

### 手写 Vue.use + Vue.extend + 命令式确认弹窗

```javascript
// src/global-api/use.js
export function initUse(Vue) {
  Vue.use = function(plugin) {
    const installed = this._installedPlugins || (this._installedPlugins = [])
    if (installed.includes(plugin)) return this
    const args = Array.from(arguments).slice(1)
    args.unshift(this)
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      plugin.apply(null, args)
    }
    installed.push(plugin)
    return this
  }
}
```

```javascript
// src/components/MedConfirm.js
// 医疗场景：问诊前确认弹窗（命令式调用）
import Vue from '../index'

const ConfirmComponent = {
  name: 'MedConfirm',
  data() {
    return { visible: true, title: '', content: '' }
  },
  template: `
    <div v-if="visible" class="med-confirm-overlay">
      <div class="med-confirm-box">
        <h3>{{ title }}</h3>
        <p>{{ content }}</p>
        <div class="med-confirm-btns">
          <button @click="handleCancel">取消</button>
          <button @click="handleConfirm">确认</button>
        </div>
      </div>
    </div>
  `,
  methods: {
    handleConfirm() {
      this.visible = false
      this.onConfirm && this.onConfirm()
      this.$nextTick(() => this.$destroy())
    },
    handleCancel() {
      this.visible = false
      this.onCancel && this.onCancel(new Error('用户取消'))
      this.$nextTick(() => this.$destroy())
    }
  }
}

export function $medConfirm(options = {}) {
  return new Promise((resolve, reject) => {
    const Ctor = Vue.extend(ConfirmComponent) // 👈 Vue.extend 核心
    const instance = new Ctor({ propsData: options })
    instance.onConfirm = resolve
    instance.onCancel = reject
    instance.$mount()
    document.body.appendChild(instance.$el)
    // $once + hook:beforeDestroy 自动清理
    instance.$once('hook:beforeDestroy', () => {
      document.body.removeChild(instance.$el)
    })
  })
}

// 测试
$medConfirm({ title: '确认提交', content: '提交后问诊单不可修改' })
  .then(() => console.log('用户确认'))
  .catch(() => console.log('用户取消'))
```

### 手写 $set / $delete

```javascript
// src/observer/set-delete.js
import { defineReactive } from './index'

export function set(target, key, val) {
  // 数组走 splice（已被拦截）
  if (Array.isArray(target) && key >= 0 && key < target.length) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  // 已有属性直接赋值
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = target.__ob__
  if (!ob) {
    target[key] = val
    return val
  }
  // 新增属性：添加 getter/setter + 触发更新
  defineReactive(ob.value, key, val) // 👈 核心
  ob.dep.notify()
  return val
}

export function del(target, key) {
  if (Array.isArray(target) && key >= 0) {
    target.splice(key, 1)
    return
  }
  const ob = target.__ob__
  if (!Object.prototype.hasOwnProperty.call(target, key)) return
  delete target[key]
  if (ob) ob.dep.notify()
}
```

---

## 💡 九、一张图总结（面试速记表）

| API / 组件 | 核心机制 | 面试频率 | 一句话记忆 |
|-----------|---------|:-------:|----------|
| keep-alive | LRU：Map + keys 数组 | ⭐⭐⭐⭐⭐ | Map 存缓存，数组维顺序，超 max 删队头触 $destroy |
| transition | 6 类名 + 6 JS 钩子 | ⭐⭐⭐ | enter/leave 各三步，transform 不触发 layout |
| scoped-slot | 插槽编译成函数 | ⭐⭐⭐⭐ | 普通 slot 是 VNode，scoped-slot 是函数（子传父数据） |
| Vue.mixin | mergeOptions strats | ⭐⭐⭐⭐ | 钩子 concat（mixin 先），data 递归（组件优先） |
| Vue.use | install + _installedPlugins | ⭐⭐⭐ | 防重复，调 install(Vue) |
| Vue.extend | Sub + _Ctor 缓存 | ⭐⭐⭐⭐ | 继承 Vue，缓存构造函数，命令式弹窗核心 |
| Vue.observable | observe() | ⭐⭐ | 轻量响应式，3 个字段以下的全局状态 |
| $set / $delete | splice / defineReactive + dep.notify | ⭐⭐⭐⭐⭐ | 数组用 splice，对象用 defineReactive |
| $attrs/$listeners | inheritAttrs: false | ⭐⭐⭐ | 封装组件透传的标准模式，Vue 3 合并进了 $attrs |
| errorCaptured | 向上冒泡 → errorHandler | ⭐⭐⭐ | 返回 false 阻止冒泡，组件树错误边界 |

---

## 📝 留个问题

思考题（欢迎在评论区讨论）：

keep-alive 的 `max` 超出时会调用被淘汰组件的 `$destroy()`。但如果这个被淘汰的组件里有正在进行的异步请求（比如医生的 AI 问诊正在等待 AI 回复），`$destroy` 之后那个请求的回调执行了会发生什么？你会怎么处理这种情况？

---

## 🖥️ 源码地址

https://github.com/lotosv2010/g-vue

---

## 🌍 参考

- https://v2.cn.vuejs.org/
- https://github.com/vuejs/vue/blob/dev/src/core/components/keep-alive.js
- https://github.com/vuejs/vue/blob/dev/src/core/global-api/use.js
- https://github.com/vuejs/vue/blob/dev/src/core/global-api/extend.js
- https://github.com/vuejs/vue/blob/dev/src/core/observer/index.js
- https://ustbhuangyi.github.io/vue-analysis/
- https://github.com/wbccb

---

> 🔖 这是「Vue 2 全家桶系列」第 8 篇。上一篇：《Vue 2 事件绑定原理》；下一篇预告：《Vue Router 原理与手写实现》
