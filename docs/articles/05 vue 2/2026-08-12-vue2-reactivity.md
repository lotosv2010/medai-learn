# Vue 2 响应式原理全攻略：Observer / Dep / Watcher 三件套与手写实现（面试收藏级）

> 面试官微笑着把白板递给你：「`data` 里的值变了，视图是靠什么知道你变了？把 Observer、Dep、Watcher 三件套写出来。」

---

在开讲之前，先把整条链路的总览图摆出来。全文所有章节，都是围着这条主线转的：

```
① 初始化 data
   observe(data) → new Observer(data)
      ├─ 对象 → walk() 遍历 key → defineReactive()
      │        ↑                              ↓
      │   __ob__ 标记防重复             每个属性一个 Dep 实例
      └─ 数组 → 替换原型(arrayMethods) → observeArray()
② 挂载组件
   mountComponent → new Watcher(vm, updateComponent)
      → get() → pushTarget(this) → 执行 render → 读属性触发 getter
      → dep.depend() → watcher.addDep() → dep.addSub(watcher) ← 双向记忆
      → popTarget()
③ data 赋值
   setter 拦截 → dep.notify() → watcher.update()
      → queueWatcher（去重）→ nextTick(flushSchedulerQueue)
      → watcher.run() → 重新渲染视图
```

记住三条：**① 是把树劫持起来（Observer），② 是记录谁在用我（Dep↔Watcher 双向记忆），③ 是变化后通知重渲染（异步批量）。** 你看懂这三段，响应式就通了 80%。

---

## 🎯 这篇文章解决什么问题

每个面试 Vue 的人都会被问响应式，但 90% 只能背出「defineProperty 劫持」这几个字。一旦追问「依赖收集怎么收集、派发更新怎么派发、computed 缓存靠什么开关、nextTick 为什么优先微任务」，就卡住了。

这篇文章通过完整的手写实现，把整条响应式链路拆开：**懂原理，也懂怎么答面试**。读完你能在白板上画出一条完整的「数据变更 → 视图更新」调用链，并答全六大核心追问。

---

## 🔍 一、先学会用它：响应式到底能做什么、边界在哪

### 先记第一笔：data 为什么必须是函数

组件里 `data` 写成对象会直接报错——因为 **data 函数化是为了每个组件实例拿到独立的数据副本**。Vue 会把函数返回值作为当前实例的 data，若写成对象，多个实例会共享同一份引用，改一个全乱。

```javascript
// ✅ 正确：函数返回新对象，每个组件实例各copy一份
data() {
  return { patient: { name: '', age: null } }
}
// ❌ 错误：对象是共享引用，实例A改了B也变
data: { patient: { name: '', age: null } }
```

这也是响应式生命周期起点：**Vue 拿到这个 data 才交给 Observer 去劫持。**

### 直接赋值、$set、$delete 的触发差异

在 Vue 2 里，同一份 `data`，用三种方式改，结果完全不同：

```javascript
data() {
  return {
    patient: { name: '张伟', age: 45 },
    drugs: ['阿司匹林', '布洛芬']
  }
}
```

```javascript
this.patient.age = 46            // ✅ 触发更新，age 本来就是响应式的
this.patient.height = 175        // ❌ 不触发！新增属性没有被劫持
this.drugs[0] = '对乙酰氨基酚'    // ❌ 不触发！索引赋值监听不到
this.drugs.push('奥美拉唑')      // ✅ 触发，push 被重写过了
```

**响应式的本质，是「提前用 defineProperty 劫持过的属性」才能触发更新。** 所以：

- 直接赋值已有属性 → 触发
- `$set` 新增属性 → 会触发（因为它补了一次劫持）
- `$delete` 删除属性 → 会触发（因为它补了一次删除通知）

### computed 缓存行为与 watch 的 deep/immediate

`computed` 的最大杀手锏是**缓存**：只要依赖的响应式数据没变，多次访问只算一次。

```javascript
computed: {
  dosage() { return this.weight * 2 }   // weight 不变，dosage 不会重算
}
watch: {
  'patient.name': {
    handler(nv, ov) { /* 深层的对象变化也监听 */ },
    deep: true,        // 深度监听对象内部
    immediate: true    // 一初始化就触发一次，nv 是初始值
  }
}
```

### 数组的 7 个魔法方法与索引陷阱

Vue 2 只对数组的 7 个方法做了拦截：`push` `pop` `shift` `unshift` `splice` `sort` `reverse`。**索引赋值和修改 length 都不在拦截范围内。**

```javascript
this.drugs[0] = 'X'          // ❌ 静默失效
this.drugs.length = 0        // ❌ 静默失效
this.drugs.splice(0, 1)      // ✅ 正确姿势
this.$set(this.drugs, 0, 'X') // ✅ 或用 $set
```

### 响应式边界：什么情况「变了不更新」

| 操作 | 是否触发更新 | 原因 |
|------|:---:|------|
| 修改已有属性的值 | ✅ | 属性已被劫持 |
| 新增对象属性 | ❌ | 新属性没被劫持 |
| 删除对象属性 | ❌ | 不需要删除监听 |
| 数组索引赋值 | ❌ | 索引不监听 |
| 修改 `length` | ❌ | length 不监听 |
| 数组 7 大方法 | ✅ | 方法被重写 |
| `$set` / `$delete` | ✅ | 补劫持 / 补通知 |

> 💬 **面试官**：数组为什么不能用 defineProperty 监听下标？
>
> ✅ 标准答案：技术上能监听（为每个下标 defineProperty），但数组常见操作是 push 大量新元素，逐个劫持开销大且监听不到未来新加的下标；而且监听 index 后对 length、新增下标的依赖收集极其复杂。所以 Vue 2 选择只重写会改变数组的 7 个方法。
> 🎁 想加分：本质是**defineProperty 需要对「已知的、确定的 key」预定义**，而数组是动态长度的，先天不匹配这套模型。

### 完整迷你案例：四招联动

光看散片代码容易记不住。下面这个迷你患者表单，把 `data` / `computed` / `watch` / `$set` 四招集中在一起，抄下来就能跑：

```javascript
new Vue({
  el: '#app',
  data() {
    return {
      patient: { name: '张伟', age: 45 },
      drugAllergies: []
    }
  },
  computed: {
    // computed：有缓存，依赖 patient.age 不变就不重算
    riskLevel() {
      return this.patient.age >= 60 ? '高风险' : '普通'
    }
  },
  watch: {
    // watch：监听 age 变化，异步拉剂量建议（有副作用用 watch）
    'patient.age'(newVal) {
      if (newVal) this.fetchDosingSuggestion(newVal)
    }
  },
  methods: {
    addAllergy(drug) {
      this.drugAllergies.push(drug)           // ✅ 7 方法触发更新
    },
    addExtraField() {
      this.$set(this.patient, 'phone', '')    // ✅ 新增属性用 $set
    },
    fetchDosingSuggestion(age) { /* 异步请求 */ }
  }
})
```

四招各司其职：`data` 声明响应式来源，`computed` 缓存派生值，`watch` 响应变化执行副作用，`$set` 补劫持新增字段。

---

## 📐 二、Object.defineProperty：Vue 2 响应式的基石

### get / set 拦截机制

响应式的第一个地基是 `Object.defineProperty`——它能在属性上挂 getter 和 setter，拦截「读」和「写」。

```javascript
let value = 45
Object.defineProperty(this.patient, 'age', {
  get() {
    console.log('读 age')   // 读拦截
    return value
  },
  set(newValue) {
    console.log('写 age')   // 写拦截
    value = newValue
  }
})
```

读时拦截，是为了**收集依赖**（谁在用我）；写时拦截，是为了**派发更新**（我变了通知谁）。两个钩子分别对应下两章的 Dep 和 Watcher。

### 这版模型的痛点，就是 Vue 3 换掉的答案

| 对比维度 | defineProperty（Vue 2） | Proxy（Vue 3） |
|---------|:---:|:---:|
| 能否拦截新增属性 | ❌ 不行 | ✅ 可以 |
| 能否拦截删除属性 | ❌ 不行 | ✅ 可以 |
| 能否拦截数组下标/length | ❌ 不行 | ✅ 可以 |
| 能否拦截 in / for in 操作 | ❌ 不行 | ✅ 可以 |
| 是否要递归一次性劫持全树 | ✅ 需要 | ✅ 仍需要（lazy 化） |
| 性能 | 全量递归，深层对象开销大 | 惰性代理 |
| 兼容性（老 IE） | ✅ 好 | ❌ 不支持 |

```javascript
// Vue 3：新增一个属性，直接赋值就响应式
state.patient.height = 175   // ✅ Proxy 拦得到
```

> 💬 **面试官**：defineProperty 和 Proxy 的区别？Vue 3 为什么换掉？
>
> ✅ 标准答案：defineProperty 只能拦截「已存在的属性」，新增、删除、数组下标都监听不到，才需要 $set / 数组方法重写一堆补丁；Proxy 能拦截对象的所有操作，包括新增删除、数组下标和 length，所以 Vue 3 天然解决这些问题，还支持惰性代理提升性能。
> 🎁 想加分：**Proxy 是惰性的**——访问到哪一层才代理哪一层，而 Vue 2 在初始化时就要递归劫持整个 data 树，这是两者性能差异的深层原因。

---

## 🌳 三、Observer：递归劫持整棵树 + __ob__ 标记

### 数据劫持的入口

Vue 初始化时，`initData` 拿到 `data`，交给 `observe` 函数。`observe` 是响应式的总入口——它判断数据类型，然后创建 `Observer` 实例。

```javascript
// state.js —— 初始化数据，把 data 交给 observe 劫持
function initData(vm) {
  let data = vm.$options.data
  vm._data = data = typeof data === 'function' ? data.call(vm) : data
  observe(data)
}
```

### Observer 类：递归 walk + defineReactive

先看最精简的一版——**对象类型的数据劫持**。`Observer` 构造器会遍历对象的所有 key，对每个 key 调 `defineReactive`。

```javascript
// observer/index.js —— 对象类型拦截（第一版）
class Observer {
  constructor(value) {
    this.walk(value)         // 遍历每个 key
  }
  walk(data) {
    let keys = Object.keys(data)
    keys.forEach(key => {
      defineReactive(data, key, data[key])
    })
  }
}
```

`defineReactive` 是这个系统的核心函数：它用 `Object.defineProperty` 重定义属性，并做**递归劫持**——因为属性的值可能还是对象，得一路劫持到底。

```javascript
function defineReactive(data, key, value) {
  observe(value)                    // 👈 如果值还是对象，递归劫持
  Object.defineProperty(data, key, {
    get() {
      return value                 // 读拦截（后面会加依赖收集）
    },
    set(newValue) {
      if (newValue === value) return
      observe(newValue)            // 👈 新值也可能是对象，也要劫持
      value = newValue             // 写拦截（后面会加派发更新）
    }
  })
}
```

而 `observe` 这个入口需要做两件事：过滤非对象的数据，以及**防止重复劫持**。

```javascript
export function observe(data) {
  if (typeof data !== 'object' || data == null) {
    return                         // 非对象或空值，不做劫持
  }
  if (data.__ob__) {
    return data                    // 👈 已经劫持过，直接返回
  }
  return new Observer(data)
}
```

### __ob__ 的三大作用

这里 `__ob__`（observer 缩写）是整个响应式系统里一个极易被忽略却极其关键的角色：

- **防重复劫持**：`observer` 二次进入时，一看有 `__ob__` 就知道处理过了，直接返回，避免同一对象被 defineProperty 多次、死循环。
- **数组依赖的挂载点**：它保存了当前 Observer 实例，数组的方法重写里要通过 `this.__ob__` 拿到这个实例去通知更新、去劫持新增项。
- **不可枚举防死循环**：`__ob__` 必须用 defineProperty 定义成不可枚举，否则遍历 key 时会把自己也遍历进去，无限递归。

```javascript
Object.defineProperty(value, '__ob__', {
  enumerable: false,       // 👈 不可枚举，避免被 walk 遍历到
  configurable: false,
  value: this              // 保存 Observer 实例
})
```

> 💬 **面试官**：`__ob__` 标记在 Vue 2 响应式里有什么作用？
>
> ✅ 标准答案：三个作用——标志对象已被劫持防止重复 observe；作为数组方法的依赖挂载点（数组重写后靠 `this.__ob__` 触达 Observer 实例）；用 defineProperty 定义成不可枚举防止遍历时死循环。
> 🎁 想加分：**这也是判断一个属性「是否被 Vue 2 响应式接管」的关键标记**，排查「改了不更新」时，打印 `obj.__ob__` 有没有值，能瞬间定位问题。

🔧 **真实场景**：排查「后端接口加了字段，前端改了页面不更新」——打开控制台看 `this.$data.__ob__` 和该字段是否存在。若字段是接口后加的，`__ob__` 还在但字段没被劫持，就是要在 `$set`。

### 数据代理：this.xxx 为什么能直接访问 data

Observer 劫持的是 `vm._data` 上的属性，但我们在组件里写的是 `this.patient.age` 而不是 `this._data.patient.age`——这靠的是**数据代理**。

`initData` 里，Vue 会遍历 data 的每个 key，用 `Object.defineProperty` 在 vm 实例上创建同名属性，代理到 `_data`：

```javascript
// util.js —— 数据代理，让 vm.xxx 映射到 vm._data.xxx
function proxy(vm, data, key) {
  Object.defineProperty(vm, key, {
    get() { return vm[data][key] },   // vm.patient → vm._data.patient
    set(newValue) { vm[data][key] = newValue }
  })
}
// initData 里调用
Object.keys(data).forEach(key => proxy(vm, '_data', key))
```

这样 `this.patient` 实际走的是 `this._data.patient`，而 `_data.patient` 已经被 Observer 劫持过了，所以 get/set 拦截依然生效。

> 💬 **面试官**：`this.xxx` 是怎么访问到 `data` 里的属性的？
>
> ✅ 标准答案：Vue 在 `initData` 时对 data 里每个 key 用 `Object.defineProperty` 在 vm 上做了代理——读 `this.patient` 实际是读 `this._data.patient`，`_data` 才是真正被 Observer 劫持的对象。
> 🎁 想加分：代理发生在劫持之后，顺序是 `observe(_data)` → 再 `proxy(vm, '_data', key)`，拦截链不会断。

---

## 🔄 四、数组重写：defineProperty 监听不到的数组变更

### 为什么要重写数组的 7 个方法

定义里讲了：defineProperty 监听不到数组下标和新增。Vue 2 的解法是**劫持数组的原型**——把数组实例的原型替换成一个继承了 `Array.prototype` 的中间对象，重写 7 个会改变数组的方法。

```javascript
// observer/array.js —— 重写数组的 7 个方法
let oldArrayProtoMethods = Array.prototype
export let arrayMethods = Object.create(oldArrayProtoMethods)

let methods = ['push','pop','shift','unshift','reverse','sort','splice']

methods.forEach(method => {
  arrayMethods[method] = function(...args) {
    const result = oldArrayProtoMethods[method].apply(this, arguments)
    let inserted
    const ob = this.__ob__            // 👈 拿到 Observer 实例
    return result
  }
})
```

然后通过 `Object.setPrototypeOf`（ES5 写法是赋 `__proto__`）把这个改写后的原型挂到数组实例上：

```javascript
if (Array.isArray(value)) {
  Object.setPrototypeOf(value, arrayMethods)   // 替换原型，ES6 写法
  this.observeArray(value)                     // 对数组里的对象再劫持
}
```

### 对新插入项也要劫持

`push`、`unshift`、`splice` 会新增元素，新增的元素可能是对象，必须补一次劫持。所以重写方法里要根据方法类型取出插入项。

```javascript
if (Array.isArray(value)) {
  Object.setPrototypeOf(value, arrayMethods)
  this.observeArray(value)
}
// ...
observeArray(data) {
  data.forEach(item => observe(item))   // 数组里的对象类型再劫持
}
```

7 个方法里，能新增元素的是 `push`、`unshift`、`splice`（新增部分），其余直接透传调用原始方法即可。

> 💬 **面试官**：vue2 数组 7 个方法重写，为什么 splice 要单独取切片？
>
> ✅ 标准答案：push/unshift 的所有参数都是新增元素，splice 只有索引 2 之后的是新增元素（前两个是起始下标和删除个数），所以要 `args.slice(2)`。新增元素可能是对象，必须调 `observeArray` 补劫持。
> 🎁 想加分：`observeArray` 遍历时对已劫持过的对象 `__ob__` 已经存在，`observe` 会直接跳过，天然不会重复劫持——这就是 3-1 就提到 `__ob__` 防重复的价值闭环。

### 数组自身的 dep：数组取值时依赖收集怎么做

对象的每个属性都有一个 dep，但数组本身不是「属性」——那模板里读到一个数组时，哪个 dep 来收集这次依赖？

答案是：**Observer 构造器给每个被劫持的对象（含数组）都挂了一个 `this.dep`**，专门负责「对象/数组整体」的依赖收集：

```javascript
class Observer {
  constructor(value) {
    this.dep = new Dep()   // 👈 对象/数组自身的 dep
    Object.defineProperty(value, '__ob__', {
      enumerable: false,
      value: this
    })
    if (Array.isArray(value)) {
      Object.setPrototypeOf(value, arrayMethods)
      this.observeArray(value)
    } else {
      this.walk(value)
    }
  }
}
```

当 `defineReactive` 的 getter 被触发时，会额外检查值的 `__ob__`，让数组的 dep 也收集当前 watcher：

```javascript
get() {
  if (Dep.target) {
    dep.depend()               // 属性自己的 dep 收集
    if (value.__ob__) {
      value.__ob__.dep.depend() // 👈 数组/对象自身的 dep 也收集
    }
  }
  return value
}
```

数组方法重写里触发更新时，走的正是 `this.__ob__.dep.notify()`——这条链路闭合了。

---

## 🔗 五、Dep + Watcher：依赖收集与派发更新的双向奔赴

这是响应式最核心、也是面试最爱的部分——是整条链路的心脏，前几章的 Observer / defineProperty / 数组重写，都是为这里铺路的。整条链路就是四个角色配合：

**Dep**：依赖收集器，每个响应式属性对应一个。它知道自己被哪些 Watcher 依赖。
**Watcher**：观察者，负责依赖收集和触发更新。渲染视图的是 render Watcher，还有 computed、watch 的 Watcher。

先看骨架——`Dep` 很简单，收一堆 watcher，通知它们更新：

```javascript
// observer/dep.js —— 依赖收集器
class Dep {
  constructor() {
    this.subs = []      // 收集到的 watcher 列表
    this.id = id++      // 每个 dep 唯一 id，用于去重
  }
  depend() {
    Dep.target.addDep(this)   // 让当前 watcher 记住这个 dep
  }
  notify() {
    this.subs.forEach(watcher => watcher.update())  // 通知更新
  }
  addSub(watcher) {
    this.subs.push(watcher)
  }
}
Dep.target = null       // 当前正在收集依赖的 watcher
```

再看 `Watcher` 的骨架——构造函数里就调 `get`，`get` 里先把自己设为 `Dep.target`，再执行渲染函数触发属性取值，从而完成依赖收集：

```javascript
// observer/watcher.js —— 观察者
let id = 0
class Watcher {
  constructor(vm, exprOrFn, cb, options) {
    this.vm = vm
    this.id = id++          // watcher 唯一标识
    this.cb = cb
    this.user = options.user   // user watcher 标记
    this.lazy = options.lazy   // computed 标记，惰性求值
    this.dirty = this.lazy     // 是否脏了，需重算
    this.deps = []          // 记录依赖了哪些 dep
    this.depsId = new Set() // 去重用的 Set
    // 👈 关键：getter 从 exprOrFn 转换而来
    if (typeof exprOrFn === 'function') {
      this.getter = exprOrFn          // render watcher：直接是渲染函数
    } else {
      this.getter = function() {      // user watcher：字符串路径 'a.b.c'
        let path = exprOrFn.split('.')
        let obj = vm
        for (let i = 0; i < path.length; i++) obj = obj[path[i]]
        return obj
      }
    }
    // 👈 默认执行一次 get，完成依赖收集；lazy（computed）则惰性求值
    this.value = this.lazy ? void 0 : this.get()
  }
  get() {
    pushTarget(this)        // Dep.target = this
    let result = this.getter.call(this.vm) // 取值 -> 触发 get -> 收集依赖
    popTarget()
    return result
  }
  update() {                // dep.notify 时调用
    if (this.lazy) {        // computed：依赖变了只置脏
      this.dirty = true
    } else {
      queueWatcher(this)    // 👈 异步批量更新入口
    }
  }
}
```

这段里有两点值得特别注意：**`getter` 是从 `exprOrFn` 转换来的**——render watcher 传入的是函数，user watcher（watch）传入的是字符串路径，构造器里要区分处理；**`this.value = this.lazy ? void 0 : this.get()`**——只有非 lazy 的 watcher 才在初始化时就跑一次 `get` 收集依赖，computed 要等第一次访问（`evaluate`）才求值。

到此，`defineReactive` 里埋的两个钩子终于接上了：

```javascript
function defineReactive(data, key, value) {
  observe(value)
  let dep = new Dep()             // 每个属性一个 dep
  Object.defineProperty(data, key, {
    get() {                       // 读拦截 = 依赖收集
      if (Dep.target) {
        dep.depend()              // 让属性记住当前 watcher
      }
      return value
    },
    set(newValue) {               // 写拦截 = 派发更新
      if (newValue === value) return
      observe(newValue)
      value = newValue
      dep.notify()                // 通知所有依赖它的 watcher
    }
  })
}
```

### render watcher 从哪来

现在依赖收集要真正跑起来，得先有一个 render watcher。组件挂载时，`mountComponent` 创建了它：

```javascript
// lifecycle.js —— 组件挂载
function mountComponent(vm) {
  let updateComponent = () => vm._update(vm._render())
  // 传入渲染函数作为 exprOrFn，且不带 options（默认 render watcher）
  new Watcher(vm, updateComponent, () => {}, {})
}
```

每次数据变化，这个 render watcher 的 `run()` 会重新执行 `updateComponent`，即重新渲染。下面看初次渲染时它和 dep 之间发生了什么。

### 依赖收集的完整链路

把一个组件初次渲染跑一遍，会发生这些事：

```
mountComponent
  → new Watcher(vm, updateComponent)          ← render watcher 诞生
      → get() 里 pushTarget(this)，Dep.target = 当前 watcher
          → 执行 updateComponent = vm._update(vm._render())
              → render 函数读取 this.patient.age
                  → 触发 defineReactive 的 get
                      → dep.depend()
                          → Dep.target.addDep(dep)
                              → dep.addSub(watcher)  ← 双向绑定
      → popTarget()
```

到这里，**属性记住了「谁在用我」（dep 存 watcher），watcher 也记住了「依赖哪些属性」（watcher 存 dep）**——这就是 Vue 2 的「双向记忆」，是面试官最爱的展开点。

### dep.id 去重：解决什么问题

回到 `Watcher.addDep`：

```javascript
addDep(dep) {
  let id = dep.id
  if (!this.depsId.has(id)) {   // 重复的 dep 不重复收集
    this.deps.push(dep)
    this.depsId.add(id)
    dep.addSub(this)
  }
}
```

**为什么需要去重？** 一个渲染函数里同一个属性往往被读取多次（普通循环、模板里多处引用），如果没有去重，同一个 dep 会把同一个 watcher 收集 N 遍。后果是：

- 属性更新时 `notify` 会调 N 次 `watcher.update`，重复渲染
- `dep.subs` 无限膨胀，内存被白白占用

去重后，**同一个 watcher 对同一个 dep 只订阅一次**，更新一次渲染一次。

### 派发更新的完整链路（异步批量）

属性被赋值 → `set` → `dep.notify()` → 每个 watcher 的 `update()`。但注意 `update` 不是立刻 `run`，而是走 `queueWatcher` 批处理：

```javascript
// observer/watcher.js —— 批量异步更新
let queue = []      // 待执行 watcher 队列
let has = {}        // 去重标记
let pending = false

function queueWatcher(watcher) {
  const { id } = watcher
  if (has[id] == null) {           // 同一个 watcher 只进一次队列
    queue.push(watcher)
    has[id] = true
    if (!pending) {                // 只开启一次异步任务
      nextTick(flushSchedulerQueue)
      pending = true
    }
  }
}

function flushSchedulerQueue() {
  queue.forEach(watcher => watcher.run())
  queue = []
  has = {}
  pending = false
}
```

同步代码里连续改 100 次数据，`notify` 触发 100 次 `update`，但 `queueWatcher` 的 `has[id]` 保证**同一个 watcher 只进队列一次**，`pending` 保证**只开一个微任务**，最后统一执行一次 `flushSchedulerQueue`——这就是「异步批量更新」。

```
this.patient.age = 50    // set -> notify -> update -> queueWatcher
this.patient.age = 51    // 同上，但 has 去重，不进队
this.patient.age = 52    // 同上
// 同步代码跑完后，微任务执行一次 flushSchedulerQueue
// 最终只渲染一次，拿到的 age 是 52
```

> 💬 **面试官**：为什么 Vue 2 更新是异步的？dep.id 去重解决什么问题？
>
> ✅ 标准答案：同一帧同步代码里多次改数据，若每次都同步渲染会重复执行 render、浪费性能。虚拟队列 + 去重 + nextTick 保证**同一次同步任务里的多次修改只最终渲染一次**。dep.id 去重解决的是「同一属性被多次读取时 dep 重复收集同一个 watcher 导致重复渲染和内存膨胀」的问题。
> 🎁 想加分：**queueWatcher 去重（has）和 dep.id 去重（depsId）是两套机制**——前者去重的粒度的 watcher（一次更新只渲染一次），后者去重的是「watcher 对 dep 的订阅关系」（避免一个 watcher 被同一个 dep 收多遍）。

### Watcher 的三种类型

同一个 `Watcher` 类，由 `options` 区分出三种角色：

| 类型 | 标识 | 创建时机 | 触发行为 |
|------|------|---------|---------|
| render Watcher | 默认 | 组件挂载时 | `run()` 重新渲染 |
| computed Watcher | `lazy: true` | 初始化 computed | `dirty = true`，惰性求值 |
| user Watcher | `user: true` | watch / $watch | `run()` 对比新旧值调 cb |

### 嵌套 Watcher 场景：Dep.target 栈的必要性

前面用的是简化版——`popTarget` 直接把 `Dep.target` 置为 `null`。这在单层组件里没问题，但**嵌套 watcher** 场景会出 bug。

典型场景：父组件 render watcher 执行 `render` 的过程中，遇到子组件，触发子组件的 render watcher 执行。子组件 render 完毕，`popTarget` 把 `Dep.target` 置为 `null`，父组件剩余的渲染函数再触发 getter，`Dep.target` 已经是 `null`，**依赖收集断了**。

正确的做法是用一个**栈**来管理 `Dep.target`，`popTarget` 时恢复到上一层 watcher：

```javascript
// observer/dep.js —— 正确的栈版本
let stack = []

export function pushTarget(watcher) {
  Dep.target = watcher
  stack.push(watcher)
}

export function popTarget() {
  stack.pop()
  Dep.target = stack[stack.length - 1]  // 恢复上一层 watcher，而不是置 null
}
```

这样父子 watcher 交替出入栈，`Dep.target` 始终指向「当前正在收集依赖的那个 watcher」，不会提前断链。

> 💬 **面试官**：computed 依赖的数据变了，为什么模板里用到 computed 的地方也会更新？
>
> ✅ 标准答案：computed watcher 在 `evaluate()` 求值时，会触发它依赖数据的 getter，完成依赖收集。此时若外层还有 render watcher 在收集（Dep.target 栈上层是 render watcher），computed 会调 `watcher.depend()` 把自己依赖的所有 dep 也订阅给 render watcher，形成**链式依赖**——所以底层数据变了，render watcher 也能感知到。
> 🎁 想加分：这也是为什么要用栈管理 Dep.target，而不是直接置 null——嵌套 watcher 场景下，computed watcher 收集完退出后，外层 render watcher 得能继续收集剩余属性的依赖。

---

## ⚙️ 六、computed 惰性求值：dirty 开关背后的缓存哲学

### lazy + dirty 实现缓存

computed 的核心是**惰性求值**：不是一初始化就算好，而是「第一次访问才计算，之后只要依赖没变就返回缓存」。实现全靠两个标志位：

```javascript
this.lazy = options.lazy      // 是不是计算属性
this.dirty = this.lazy        // 是否"脏"了，需要重新计算
```

computed watcher 初始化时**不会立即求值**（`lazy` 为 true 时 `this.value` 是 `undefined`）：

```javascript
this.value = this.lazy ? void 0 : this.get()   // lazy 时不调用 get
```

访问 computed 属性时触发 `createComputedGetter`，判断脏不脏：

```javascript
return function () {
  const watcher = this._computedWatchers[key]
  if (watcher) {
    if (watcher.dirty) {
      watcher.evaluate()       // 脏了，重新求值
    }
    return watcher.value       // 不脏，直接返回缓存
  }
}
```

`evaluate` 执行完把 `dirty` 置为 false：

```javascript
evaluate() {
  this.value = this.get()      // 真正执行一次求值
  this.dirty = false           // 求值完就不脏了
}
```

### 依赖变了，dirty 怎么被置为 true

计算属性依赖的原始数据变化时，`dep.notify` 会调 watcher 的 `update`。computed watcher 的 `update` 有个特殊分支：

```javascript
update() {
  if (this.lazy) {
    this.dirty = true          // 计算属性：只把脏标记改为 true
  } else {
    queueWatcher(this)         // 其它 watcher：进队列等待渲染
  }
}
```

这就是缓存哲学：**依赖变了，computed 不会立刻重算，只把 `dirty` 置为 true；等下次访问时发现脏了才重算。** 如果中间没人访问，就白白省了一次计算。

### computed 依赖收集的特殊点：链式 depend

computed 还有一个新手必踩的坑：**为什么 computed 依赖的数据变了，模板里用 computed 的地方也能更新？**

因为模板渲染（render watcher）在读 computed 时，computed watcher 会把自己的依赖**转发**给当前渲染 watcher：

```javascript
return function () {
  const watcher = this._computedWatchers[key]
  if (watcher) {
    if (watcher.dirty) watcher.evaluate()
    if (Dep.target) {
      watcher.depend()       // 👈 关键：把依赖转给外层 watcher
    }
    return watcher.value
  }
}
```

`watcher.depend()` 会把 computed watcher 依赖的**所有 dep** 都添加外层 watcher：

```javascript
depend() {
  let i = this.deps.length
  while (i--) {
    this.deps[i].depend()    // 每个底层 dep 都记住渲染 watcher
  }
}
```

> 💬 **面试官**：computed 和 watch 的 Watcher 有什么区别？lazy/dirty 机制是什么？
>
> ✅ 标准答案：两者底层都是 Watcher 类，靠 `options` 区分。computed 是 `lazy: true`，惰性求值，用 `dirty` 标志位做缓存——依赖不变直接返回缓存的 value，依赖变了只把 dirty 置 true，等下次访问再重算；watch 是 `user: true`，数据变化就进队列执行回调，对比新旧值。
> 🎁 想加分：computed 依赖收集要**链式转发**——模板读 computed 时，computed 会把自己依赖的所有 dep 也订阅给渲染 watcher，所以「computed 依赖的数据变了」才能触发「用到 computed 的模板」更新。这是背八股文的人最容易漏的点。

### dirty 状态机：缓存开关是怎么翻转的

整个 computed 缓存逻辑，就是 `dirty` 这一个标志位在四个状态节点间流转：

```
首次访问 computed
      │
      ▼
  dirty = true ──evaluate()──▶ 重新求值 → dirty = false → 返回缓存 value
      ▲                                 │
      │                                 │ 依赖数据变化
      └──────── update() 只置脏 ◀────────┘
              (dirty = true, 不重算)          （中间没人访问就省了一次计算）
```

### computed 也能写 setter

computed 不只是只读的 get，它还支持 `set` 写法——当你要给 computed 赋值时，走 `set` 去改它依赖的某个原始数据：

```javascript
computed: {
  fullName: {
    get() {
      return this.firstName + ' ' + this.lastName
    },
    set(val) {            // 给 fullName 赋值时触发
      const names = val.split(' ')
      this.firstName = names[0]   // 反过去改原始数据
      this.lastName = names[1]
    }
  }
}
```

`this.fullName = 'Zhang Wei'` 会执行 set，把拆分结果写回 `firstName` / `lastName`，这两个原始数据一变，依赖它们的其它 computed / 模板也会跟着更新。注意 set 里改的是**原始 data 属性**，不是直接改缓存值。

---

## ⏱️ 七、watch 与 $nextTick：异步更新的幕后

### watch 其实是点了一盏 Watcher

`watch` 背后就是一个 `user` watcher：初始化时 `get()` 取得初始值存在 `this.value`，数据变化后 `run()` 重新取值、和新旧值对比、调用回调。

先看 `get` 支持字符串路径（如 `'patient.name'`）：

```javascript
get() {
  pushTarget(this)
  let result = this.getter.call(this.vm)
  popTarget()
  return result
}
```

再看 `run()` 如何取出新旧值对比：

```javascript
run() {
  let newValue = this.get()
  let oldValue = this.value
  this.value = newValue              // 更新缓存
  if (this.user) {
    this.cb.call(this.vm, newValue, oldValue)   // 调用户回调
  }
}
```

`$watch` 就是创建一个 `user` watcher，顺便处理 `immediate`：

```javascript
Vue.prototype.$watch = function(exprOrFn, cb, options) {
  let watcher = new Watcher(this, exprOrFn, cb, {
    ...options,
    user: true
  })
  if (options.immediate) {
    cb()                        // immediate：初始化立即执行一次
  }
}
```

### watch handler 的四种写法

```javascript
watch: {
  'patient.name': function(nv, ov) {},      // 函数
  'patient.name': ['fn1', 'fn2'],           // 数组，依次执行
  'patient.name': 'handleName',             // 字符串，调实例方法
  'patient.name': {
    handler() {},                            // 对象 + handler
    deep: true,
    immediate: true
  }
}
```

### deep 的实现逻辑

`deep` 的本质是：监听一个对象时，把对象内部所有的属性都依赖收集一遍。源码里的 `traverse` 会递归读取对象的每个 key，从而触发它们的 `get` 完成依赖收集——读到了，才算是「依赖」。

### $nextTick：为什么优先用微任务

异步批量更新的最后一环是 `nextTick`。它的目标很清楚：**把回调放到「渲染完成后」再执行**。浏览器没有现成 API，Vue 2 做了一整套降级链：

```javascript
let timerFunc
if (Promise) {                       // 1. 微任务，首选
  timerFunc = () => {
    Promise.resolve().then(flushCallback)
  }
} else if (MutationObserver) {       // 2. 微任务的 H5 降级
  let observe = new MutationObserver(flushCallback)
  let textNode = document.createTextNode(1)
  observe.observe(textNode, { characterData: true })
  timerFunc = () => { textNode.textContent = 2 }
} else if (setImmediate) {           // 3. 宏任务（Node/IE）
  timerFunc = () => setImmediate(flushCallback)
} else {
  timerFunc = () => setTimeout(flushCallback)   // 4. 兜底宏任务
}
```

`nextTick` 本体把回调收集进一个数组，靠 `pending` 保证同一时刻只开一个异步任务：

```javascript
let callbacks = []
let pending = false

export function nextTick(cb) {
  callbacks.push(cb)
  if (!pending) {
    timerFunc()             // 开启一个异步任务
    pending = true
  }
}

function flushCallback() {
  while (callbacks.length) callbacks.shift()()  // FIFO 顺序清空，先进先出
  pending = false
}
```

**为什么优先微任务？** 微任务在宏任务之前执行——在同步代码执行完后、浏览器正常渲染 DOM 前就先执行 `flushCallback`，把用户传入 `nextTick` 的回调赶在「渲染后、用户能感知前」跑完，保证用户拿到的 DOM 是最新的。如果用 `setTimeout`（宏任务），要等多一个宏任务轮次，中间可能被别的宏任务插入、甚至发生一次多余渲染。

> 💬 **面试官**：$nextTick 的降级策略是什么？为什么优先用微任务？
>
> ✅ 标准答案：降级链是 Promise → MutationObserver → setImmediate → setTimeout。优先微任务是为了让回调在同步代码执行完、浏览器正式渲染前就执行，拿到最新的 DOM；宏任务要晚一个任务轮次，可能被其它任务插入导致拿到旧 DOM 或多余渲染。
> 🎁 想加分：`nextTick` 内部用数组收集回调 + 一个 `pending` 标志合并成**单个异步任务**；`queueWatcher` 里那层 flushSchedulerQueue 也是塞进同一个 nextTick 里，所以「watcher 排空」和「用户手动 $nextTick」会被合并到一次异步清理里执行，顺序是内部先、用户后。

---

## 📖 八、源码解析（真实 Vue 2 代码）

以下代码来自 Vue 2 官方仓库，为便于阅读做了轻微格式整理，关键逻辑完整保留。

### Observer 类（src/core/observer/index.js）

```javascript
export function observe(value, asRootData) {
  if (!isObject(value) || value instanceof VNode) return
  let ob
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__            // 已劫持过，直接返回
  } else if (
    !value._isVue &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value)
  ) {
    ob = new Observer(value)    // 第一次进来，创建 Observer
  }
  if (asRootData && ob) ob.vmCount++
  return ob
}

export class Observer {
  constructor(value) {
    this.value = value
    this.dep = new Dep()          // 对象/数组自身的 dep
    this.vmCount = 0
    def(value, '__ob__', this)    // 不可枚举挂到对象上（def 内部调 defineProperty）
    if (Array.isArray(value)) {
      // 环境支持 __proto__ 就改原型，否则逐个 copy 方法
      if (hasProto) {
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      this.observeArray(value)
    } else {
      this.walk(value)
    }
  }
  walk(obj) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }
  observeArray(items) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

export function defineReactive(obj, key, val, customSetter, shallow) {
  const dep = new Dep()
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) return

  const getter = property && property.get
  const setter = property && property.set

  let childOb = !shallow && observe(val)   // 递归劫持子对象

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()              // 收集子对象自身的 dep
          if (Array.isArray(value)) {
            dependArray(value)              // 递归收集数组元素的 dep
          }
        }
      }
      return value
    },
    set: function reactiveSetter(newVal) {
      const value = getter ? getter.call(obj) : val
      if (newVal === value || (newVal !== newVal && value !== value)) return
      if (process.env.NODE_ENV !== 'production' && customSetter) customSetter()
      if (getter && !setter) return
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      childOb = !shallow && observe(newVal)  // 新值也劫持
      dep.notify()
    }
  })
}
```

### Dep（src/core/observer/dep.js）

```javascript
let uid = 0

export default class Dep {
  constructor() {
    this.id = uid++
    this.subs = []
  }

  addSub(sub) { this.subs.push(sub) }

  removeSub(sub) { remove(this.subs, sub) }

  depend() {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  notify() {
    const subs = this.subs.slice()     // 复制一份，避免 notify 过程中 subs 被修改
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

Dep.target = null
const targetStack = []                 // 栈管理嵌套 watcher

export function pushTarget(target) {
  targetStack.push(target)
  Dep.target = target
}

export function popTarget() {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]  // 恢复上一层
}
```

### Watcher（src/core/observer/watcher.js）

```javascript
export default class Watcher {
  constructor(vm, expOrFn, cb, options, isRenderWatcher) {
    this.vm = vm
    if (isRenderWatcher) vm._watcher = this
    vm._watchers.push(this)

    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user       // user watcher（来自 watch 选项）
      this.lazy = !!options.lazy       // computed watcher
      this.sync = !!options.sync
      this.before = options.before
    }

    this.cb = cb
    this.id = ++uid
    this.dirty = this.lazy             // dirty = true 时才重新求值
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()

    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)  // 把 'a.b.c' 解析成路径取值函数
    }

    this.value = this.lazy ? undefined : this.get()
  }

  get() {
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) handleError(e, vm, `getter for watcher "${this.expression}"`)
      else throw e
    } finally {
      if (this.deep) traverse(value)    // deep：递归读取所有属性触发依赖收集
      popTarget()
      this.cleanupDeps()               // 清理上一轮的旧依赖
    }
    return value
  }

  addDep(dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) dep.addSub(this)   // 去重：只订阅一次
    }
  }

  update() {
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      queueWatcher(this)                // 异步队列
    }
  }

  run() {
    if (this.active) {
      const value = this.get()
      if (value !== this.value || isObject(value) || this.deep) {
        const oldValue = this.value
        this.value = value
        if (this.user) {
          try { this.cb.call(this.vm, value, oldValue) }
          catch (e) { handleError(e, this.vm, `callback for watcher "${this.expression}"`) }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  evaluate() {
    this.value = this.get()
    this.dirty = false
  }

  depend() {
    let i = this.deps.length
    while (i--) this.deps[i].depend()
  }
}
```

### $nextTick（src/core/util/next-tick.js）

```javascript
const callbacks = []
let pending = false

function flushCallbacks() {
  pending = false
  const copies = callbacks.slice(0)
  callbacks.length = 0              // 清空原数组
  for (let i = 0; i < copies.length; i++) {
    copies[i]()                     // 按顺序执行，FIFO
  }
}

let timerFunc

if (typeof Promise !== 'undefined' && isNative(Promise)) {
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)
    // iOS 奇葩 bug：在 microtask checkpoint 结束前可能阻塞，补一个空的 setTimeout 强制刷新
    if (isIOS) setTimeout(noop)
  }
  isUsingMicroTask = true
} else if (!isIE && typeof MutationObserver !== 'undefined' && (
  isNative(MutationObserver) ||
  MutationObserver.toString() === '[object MutationObserverConstructor]'
)) {
  let counter = 1
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  observer.observe(textNode, { characterData: true })
  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }
  isUsingMicroTask = true
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  timerFunc = () => setImmediate(flushCallbacks)   // Node/IE 宏任务
} else {
  timerFunc = () => setTimeout(flushCallbacks, 0)  // 兜底
}

export function nextTick(cb, ctx) {
  let _resolve
  callbacks.push(() => {
    if (cb) {
      try { cb.call(ctx) } catch (e) { handleError(e, ctx, 'nextTick') }
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
  if (!pending) {
    pending = true
    timerFunc()
  }
  // 不传 cb 时返回 Promise，支持 await this.$nextTick()
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(resolve => { _resolve = resolve })
  }
}
```

### 数组重写（src/core/observer/array.js）

```javascript
const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)

const methodsToPatch = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']

methodsToPatch.forEach(function(method) {
  const original = arrayProto[method]  // 保存原始方法
  def(arrayMethods, method, function mutator(...args) {
    const result = original.apply(this, args)
    const ob = this.__ob__
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)    // splice(start, deleteCount, ...newItems)
        break
    }
    if (inserted) ob.observeArray(inserted)  // 新增元素补劫持
    ob.dep.notify()                          // 通知更新
    return result
  })
})
```

---

## ✍️ 九、手写实现（医疗场景，Rollup 搭起来跑）

前面每章只展示了关键片段。这里把完整的可运行代码按文件模块展示，你可以照着这个结构搭一个本地项目跑起来。

### 环境搭建（Rollup + Babel）

```bash
npm init -y
npm i rollup rollup-plugin-babel @babel/core @babel/preset-env rollup-plugin-serve -D
```

`rollup.config.js`：

```javascript
import babel from 'rollup-plugin-babel'
import serve from 'rollup-plugin-serve'

export default {
  input: './src/index.js',
  output: {
    format: 'umd',
    name: 'Vue',
    file: 'dist/umd/vue.js',
    sourcemap: true
  },
  plugins: [
    babel({ exclude: 'node_modules/**' }),
    serve({ open: true, port: 3000, contentBase: '', openPage: 'index.html' })
  ]
}
```

`.babelrc`：

```json
{
  "presets": ["@babel/preset-env"]
}
```

### observer/dep.js

使用**栈**版本，正确处理嵌套 watcher 场景：

```javascript
let id = 0

class Dep {
  constructor() {
    this.subs = []
    this.id = id++
  }
  depend() {
    Dep.target.addDep(this)
  }
  notify() {
    this.subs.forEach(watcher => watcher.update())
  }
  addSub(watcher) {
    this.subs.push(watcher)
  }
}

Dep.target = null

// 使用栈管理 Dep.target，支持嵌套 watcher 场景
let stack = []

export function pushTarget(watcher) {
  Dep.target = watcher
  stack.push(watcher)
}

export function popTarget() {
  stack.pop()
  Dep.target = stack[stack.length - 1]  // 恢复上一层 watcher
}

export default Dep
```

### observer/array.js

```javascript
let oldArrayProtoMethods = Array.prototype
export let arrayMethods = Object.create(oldArrayProtoMethods)

let methods = ['push', 'pop', 'shift', 'unshift', 'reverse', 'sort', 'splice']

methods.forEach(method => {
  arrayMethods[method] = function(...args) {
    const result = oldArrayProtoMethods[method].apply(this, args)
    let inserted
    const ob = this.__ob__
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)  // splice(start, deleteCount, ...items)
        break
    }
    if (inserted) ob.observeArray(inserted)  // 新增项二次劫持
    ob.dep.notify()    // 数组变化通知
    return result
  }
})
```

### observer/index.js

```javascript
import { arrayMethods } from './array'
import Dep from './dep'

class Observer {
  constructor(value) {
    this.dep = new Dep()    // 数组/对象自身的 dep
    Object.defineProperty(value, '__ob__', {
      enumerable: false,
      configurable: false,
      value: this
    })
    if (Array.isArray(value)) {
      Object.setPrototypeOf(value, arrayMethods)
      this.observeArray(value)
    } else {
      this.walk(value)
    }
  }
  walk(data) {
    Object.keys(data).forEach(key => defineReactive(data, key, data[key]))
  }
  observeArray(data) {
    data.forEach(item => observe(item))
  }
}

function defineReactive(data, key, value) {
  let childOb = observe(value)   // 子对象/数组的 Observer 实例
  let dep = new Dep()
  Object.defineProperty(data, key, {
    get() {
      if (Dep.target) {
        dep.depend()
        if (childOb) childOb.dep.depend()   // 数组/对象整体的依赖收集
      }
      return value
    },
    set(newValue) {
      if (newValue === value) return
      observe(newValue)
      value = newValue
      dep.notify()
    }
  })
}

export function observe(data) {
  if (typeof data !== 'object' || data == null) return
  if (data.__ob__) return data.__ob__
  return new Observer(data)
}
```

### observer/watcher.js

```javascript
import { nextTick } from '../util'
import { pushTarget, popTarget } from './dep'

let id = 0

class Watcher {
  constructor(vm, exprOrFn, cb, options = {}) {
    this.vm = vm
    this.cb = cb
    this.id = id++
    this.user = !!options.user
    this.lazy = !!options.lazy
    this.dirty = this.lazy
    this.deps = []
    this.depsId = new Set()
    if (typeof exprOrFn === 'function') {
      this.getter = exprOrFn
    } else {
      this.getter = function() {
        return exprOrFn.split('.').reduce((obj, key) => obj[key], vm)
      }
    }
    this.value = this.lazy ? void 0 : this.get()
  }
  get() {
    pushTarget(this)
    let result = this.getter.call(this.vm)
    popTarget()
    return result
  }
  addDep(dep) {
    if (!this.depsId.has(dep.id)) {
      this.deps.push(dep)
      this.depsId.add(dep.id)
      dep.addSub(this)
    }
  }
  update() {
    if (this.lazy) {
      this.dirty = true
    } else {
      queueWatcher(this)
    }
  }
  evaluate() {
    this.value = this.get()
    this.dirty = false
  }
  depend() {
    let i = this.deps.length
    while (i--) this.deps[i].depend()
  }
  run() {
    let newValue = this.get()
    let oldValue = this.value
    this.value = newValue
    if (this.user) this.cb.call(this.vm, newValue, oldValue)
  }
}

let queue = [], has = {}, pending = false

function queueWatcher(watcher) {
  const { id } = watcher
  if (has[id] == null) {
    queue.push(watcher)
    has[id] = true
    if (!pending) {
      nextTick(flushSchedulerQueue)
      pending = true
    }
  }
}

function flushSchedulerQueue() {
  queue.forEach(watcher => {
    watcher.run()
    if (!watcher.user) watcher.cb()
  })
  queue = []; has = {}; pending = false
}

export default Watcher
```

### util.js（nextTick + proxy）

```javascript
// ——— nextTick ———
let callbacks = [], pending = false

function flushCallback() {
  while (callbacks.length) callbacks.shift()()  // FIFO 顺序，shift 不是 pop
  pending = false
}

let timerFunc
if (typeof Promise !== 'undefined') {
  timerFunc = () => Promise.resolve().then(flushCallback)
} else if (typeof MutationObserver !== 'undefined') {
  const ob = new MutationObserver(flushCallback)
  const node = document.createTextNode('1')
  ob.observe(node, { characterData: true })
  timerFunc = () => { node.textContent = String(Math.random()) }
} else if (typeof setImmediate !== 'undefined') {
  timerFunc = () => setImmediate(flushCallback)
} else {
  timerFunc = () => setTimeout(flushCallback)
}

export function nextTick(cb) {
  callbacks.push(cb)
  if (!pending) { timerFunc(); pending = true }
}

// ——— proxy：把 vm._data.key 代理到 vm.key ———
export function proxy(vm, data, key) {
  Object.defineProperty(vm, key, {
    get() { return vm[data][key] },
    set(val) { vm[data][key] = val }
  })
}
```

### state.js（initData / initComputed / initWatch / $watch）

```javascript
import { observe } from './observer/index'
import Watcher from './observer/watcher'
import Dep from './observer/dep'
import { nextTick, proxy } from './util'

export function initStateMixin(Vue) {
  Vue.prototype.$nextTick = function(cb) { nextTick(cb) }
  Vue.prototype.$watch = function(exprOrFn, cb, options = {}) {
    const watcher = new Watcher(this, exprOrFn, cb, { ...options, user: true })
    if (options.immediate) cb.call(this, watcher.value)
  }
}

export function initState(vm) {
  const opts = vm.$options
  if (opts.data)     initData(vm)
  if (opts.computed) initComputed(vm)
  if (opts.watch)    initWatch(vm)
}

function initData(vm) {
  let data = vm.$options.data
  vm._data = data = typeof data === 'function' ? data.call(vm) : data
  observe(data)
  Object.keys(data).forEach(key => proxy(vm, '_data', key))
}

function initComputed(vm) {
  const computed = vm.$options.computed
  const watchers = vm._computedWatchers = {}
  for (let key in computed) {
    const userDef = computed[key]
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    watchers[key] = new Watcher(vm, getter, () => {}, { lazy: true })
    Object.defineProperty(vm, key, {
      get() {
        const watcher = watchers[key]
        if (watcher.dirty) watcher.evaluate()
        if (Dep.target) watcher.depend()
        return watcher.value
      },
      set: typeof userDef === 'object' ? userDef.set : undefined
    })
  }
}

function createWatcher(vm, key, handler) {
  if (typeof handler === 'object') {
    const opts = handler
    handler = opts.handler
    return vm.$watch(key, handler, opts)
  }
  if (typeof handler === 'string') handler = vm[handler]
  return vm.$watch(key, handler)
}

function initWatch(vm) {
  const watch = vm.$options.watch
  for (let key in watch) {
    const handler = watch[key]
    if (Array.isArray(handler)) {
      handler.forEach(h => createWatcher(vm, key, h))
    } else {
      createWatcher(vm, key, handler)
    }
  }
}
```

### 医疗场景演示：患者信息表单实时响应式验证

一个完整的医疗电商场景——患者信息表单，实时响应式验证：

```javascript
data() {
  return {
    patient: {
      name: '',
      age: null,
      phone: '',
      drugAllergies: []
    }
  }
}
```

computed 联动验证，用缓存优雅处理多个字段：

```javascript
computed: {
  nameValid() {
    return this.patient.name.trim().length >= 2
  },
  ageValid() {
    return this.patient.age > 0 && this.patient.age < 150
  },
  formValid() {
    return this.nameValid && this.ageValid
  }
}
```

watch 处理异步副作用——年龄变化可能联动推荐更合适的药品方案：

```javascript
watch: {
  'patient.age'(newVal, oldVal) {
    if (!newVal) return
    this.fetchDosingSuggestion(newVal)   // 异步拉取剂量建议
  }
}
```

$set 处理接口回填的动态字段 + 数组更新用重写方法：

```javascript
// 接口返回的动态过敏史字段
this.$set(this.patient, 'hasAllergy', true)
// 数组变更走 7 方法触发更新
this.patient.drugAllergies.push('青霉素')
```

这样一个表单组件，computed（缓存验证结果）、watch（异步副作用）、$set（动态字段）、数组方法（过敏史列表）四大机制全部用上，既贴近真实，又覆盖了本文章全部考点。

---

## 💡 十、生产级最佳实践

### Object.freeze：冻结大规模只读数据

`Object.freeze` 冻结的对象，defineProperty 无法再改它的属性描述符，所以 Vue 2 遇到 frozen 对象会**跳过劫持**——这正好用来优化大规模只读数据。

```javascript
// 药品目录、ICD 码表 —— 只读、量大、绝不修改
const drugCatalog = Object.freeze([
  { code: 'A01AA01', name: '氟化物' },
  { code: 'A02BC01', name: '奥美拉唑' }
])
this.drugs = drugCatalog   // Vue 2 会跳过递归劫持，省大量初始化开销
```

### $set / $delete：使用时机与实现原理

**使用时机**：新增对象属性、数组索引赋值、删除属性时，且该数据必须在 data 里声明过根路径。

**实现原理**（两个分支）：
- 数组：走 `splice(index, 1, value)` 重写方法触发更新
- 对象：手动调一次 `defineReactive` 补劫持 + `dep.notify()`

```javascript
Vue.set(target, key, val)
// 数组：调 target.splice(key, 1, val)      走重写方法
// 对象：defineReactive(target, key, val)    补一次劫持
// 然后 dep.notify() 派发更新
```

### 深层嵌套对象的响应式性能风险

Vue 2 初始化时要递归劫持整个 data 树，**每层嵌套都是 write 损耗**。一个 10 层深的配置对象，初始化瞬间就递归 10 层。经验法则：

- **避免超过 3 层的自动递归**。深层数据宁可展平存储，或用对象数组而非嵌套树。
- 大数据量（上千条）列表，优先用 `Object.freeze` 冻结不会变的字段。
- 需要在数据里临时挂非响应式字段，可用 `this.nonReactive = {}`（不放进 data），或 freeze 后再塞。

### watch deep 与内存泄漏

`deep: true` 会递归遍历整个对象收集依赖，对象越深开销越大；若监听的深层对象里有删除/替换的元素，旧的依赖可能残留导致内存泄漏。取舍：

- 能监听具体路径（`'patient.address.city'`）就别整对象 `deep`
- 组件销毁时 `vm.$off` 或在 `beforeDestroy` 里手动 `$watch` 返回的 watcher 调 `teardown`

### 响应式丢失的常见场景

Vue 2 里「改了但视图没更新」，95% 是以下几种情况：

**① 解构响应式对象**

```javascript
const { patient } = this   // ❌ 解构拿到的是当前值，断开了响应式
patient.age = 46           // 不会触发更新
// ✅ 正确：操作 this.patient.age
this.patient.age = 46
```

**② 直接替换整个响应式对象**

```javascript
this.patient = { name: '新患者', age: 30 }  // ✅ 触发更新（替换了 patient 属性）
// 但 this.patient.address = '北京'         // ❌ address 是新增属性，不触发
```

**③ 给 data 里不存在的根路径赋值**

```javascript
// data 里没有声明 extraInfo，后面赋值不会响应式
this.extraInfo = { note: '过敏' }  // ❌ vm 上挂了个普通属性，无响应式
// ✅ 应该在 data() 里提前声明，或用 Vue.set 的上级路径
```

**④ 数组索引直接赋值 / 修改 length**（已在一章讲过，最常见）

> 💬 **面试官**：什么情况下 Vue 2 数据改了视图不更新？
>
> ✅ 标准答案：新增对象属性、数组索引赋值、修改 `length`、解构拿到的基本类型值——这几种都绕过了 defineProperty 的 setter，用 `$set`/重写方法修复。
> 🎁 想加分：根本原因是 defineProperty **只能拦截已知 key**，不能感知未来新增的 key——这就是 Vue 3 换 Proxy 的核心动机。

### computed vs watch 选型

| | computed | watch |
|---|---|---|
| 有返回值 | ✅ 返回新值用 | ❌ 无返回值 |
| 有副作用（发请求、写数据） | ❌ 不要 | ✅ 适合 |
| 缓存 | ✅ | ❌ |
| 多个依赖联动算一个值 | ✅ | ❌（要手动组合） |
| 异步 | ❌ | ✅ 支持 |

**一句话**：要一个「算出来的值」用 computed，要「监控变化去干什么事」用 watch。

---

## 💊 一张图总结（面试速记）

| 知识点 | 一句话解释 | 面试价值 |
|--------|-----------|:---:|
| defineProperty | get 收集依赖、set 派发更新，但只拦截已存在属性 | 高 |
| Proxy 区别 | 能拦截新增/删除/数组下标，惰性代理，Vue3 换因 | 高 |
| Observer | 递归劫持整棵树，`__ob__` 标记防重复 + 挂载点 | 中 |
| 数组 7 方法 | 重写原型方法，subscribe 新增元素二次劫持 | 中 |
| Dep + Watcher | 属性↔watcher 双向记忆，get 收集、set 通知 | 高 |
| dep.id 去重 | 避免同一 watcher 被同一 dep 重复订阅 | 中 |
| queueWatcher | 同一 watcher 一次同步任务只渲染一次 | 高 |
| computed lazy/dirty | 惰性求值，dirty 控制缓存，依赖变化只置脏 | 高 |
| nextTick | Promise→MutationObserver→setImmediate→setTimeout | 高 |
| 三种 Watcher | render / computed(lazy) / user | 中 |
| Dep.target 栈 | 支持嵌套 watcher，popTarget 恢复上一层而非置 null | 中 |

---

## 📝 留个问题

「Vue 3 的 Proxy 相比 Vue 2 的 defineProperty，在**数组和对象新增属性**上的依赖收集有什么本质不同？展开说说惰性代理是怎么做到按需劫持的。」评论区聊聊你的理解。

---

## 🖥️ 源码地址

https://github.com/lotosv2010/g-vue

---

## 🌍 参考

- https://v2.cn.vuejs.org/v2/guide/reactivity.html
- https://v2.cn.vuejs.org/
- https://jonny-wei.github.io/blog/vue/vue/vue-observer.html
- https://github.com/vuejs/vue/blob/dev/src/core/observer/index.js
- https://github.com/wbccb

---

> 🔖 这是「Vue 2 全家桶系列」第 2 篇。上一篇：《Vue 2 构建与初始化全攻略：三个版本怎么选？new Vue() 之后内部究竟做了什么（面试收藏级）》；下一篇预告：《Vue 2 虚拟 DOM 与 Diff 算法：为什么 key 不能用 index？双端四指针 Diff 一次讲透（面试收藏级）
》
