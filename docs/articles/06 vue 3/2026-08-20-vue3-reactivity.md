# Vue 3 响应式原理与手写实现：Proxy + track/trigger 全链路（面试收藏级）

> 面试官微笑着问：「说说 Vue 3 响应式相比 Vue 2 的改进？」你答：「用了 Proxy 替代 Object.defineProperty。」面试官继续追问：「具体解决了哪些问题？为什么必须配合 Reflect 使用？」再追：「track 和 trigger 的三层依赖存储结构是什么样的？computed 的 dirty 标记如何实现缓存？watch 和 watchEffect 依赖收集时机有什么区别？」一道看似基础的响应式问题,背后藏着 WeakMap 防内存泄漏、惰性递归代理、effect 嵌套栈、分支切换 cleanup、Collection 类型响应式整套体系。这篇文章是「Vue3 全家桶深度拆解」系列第 2 篇，从 Vue 2 的四大历史遗留问题讲起，一路拆到 track/trigger/effect 三件套、DirtyLevels 五级脏标记、collectionHandlers 源码、effectScope 批量管理，最后手写一套可独立运行的响应式系统，实现患者信息表单实时校验。

---

## 🎯 这篇文章解决什么问题

如果你已经会用 `reactive`、`ref`、`computed`，很容易停留在「API 会用」的表层认知。但面试官真正想考察的，是你有没有理解**响应式系统每一层设计背后要解决的具体问题**——为什么用 Proxy 而不是继续打磨 defineProperty、为什么 track 要设计成三层结构、为什么 computed 需要 5 个脏值级别而不是一个布尔值。读完这篇文章，你会同时获得两种确定感：懂原理（知道响应式系统为什么这样设计）和会讲（面试官怎么问都能拆解回答）。

---

## 🎯 一、Vue 3 响应式系统概览：从 Vue 2 的遗留问题说起

### Vue 2 响应式的四大历史遗留问题

Vue 2 的响应式系统基于 `Object.defineProperty`，虽然在大部分场景下工作良好，但存在几个无法绕过的痛点：

**1. 新增属性检测不到**

```javascript
// Vue 2 中的问题
const state = new Vue({
  data: {
    user: {
      name: '张三'
    }
  }
})

// 直接新增属性，不会触发响应式更新
state.user.age = 18 // ❌ 视图不会更新

// 必须使用 Vue.set 或 $set
Vue.set(state.user, 'age', 18) // ✅ 视图更新
```

医疗场景举例：在药品管理系统中,药品对象初始化时只有名称和库存,后续想添加「生产批号」字段时,直接赋值无法触发更新。

**2. 数组下标赋值检测不到**

```javascript
// Vue 2 中的问题
const state = new Vue({
  data: {
    prescriptions: ['处方单A', '处方单B', '处方单C']
  }
})

// 直接通过下标修改,不会触发更新
state.prescriptions[1] = '处方单B-修订版' // ❌ 视图不会更新

// 必须使用数组方法或 $set
state.prescriptions.splice(1, 1, '处方单B-修订版') // ✅ 视图更新
this.$set(state.prescriptions, 1, '处方单B-修订版') // ✅ 视图更新
```

**3. 删除属性检测不到**

```javascript
// Vue 2 中的问题
const state = new Vue({
  data: {
    patient: {
      name: '李四',
      phone: '138****1234',
      idCard: '110***********1234'
    }
  }
})

// 直接删除属性,不会触发更新
delete state.patient.idCard // ❌ 视图不会更新

// 必须使用 Vue.delete 或 $delete
Vue.delete(state.patient, 'idCard') // ✅ 视图更新
```

**4. 无法代理 Map/Set 等 Collection 类型**

```javascript
// Vue 2 完全无法响应式化 Map/Set
const state = new Vue({
  data: {
    departmentDoctors: new Map([
      ['内科', ['张医生', '王医生']],
      ['外科', ['李医生', '赵医生']]
    ])
  }
})

// ❌ 任何 Map 操作都不会触发更新
state.departmentDoctors.set('儿科', ['刘医生'])
state.departmentDoctors.delete('外科')
```

医疗场景举例：科室到医生的映射关系用 Map 存储,查询性能更优,但 Vue 2 无法监听其变化。

### Proxy 如何逐一解决

Vue 3 使用 `Proxy` 替代 `Object.defineProperty`,从根本上解决了上述所有问题：

```javascript
const state = reactive({
  user: { name: '张三' },
  prescriptions: ['处方单A', '处方单B'],
  patient: { name: '李四', phone: '138****1234' },
  departmentDoctors: new Map([
    ['内科', ['张医生', '王医生']]
  ])
})

// ✅ 新增属性 - 正常响应
state.user.age = 18

// ✅ 数组下标赋值 - 正常响应
state.prescriptions[1] = '处方单B-修订版'

// ✅ 删除属性 - 正常响应
delete state.patient.phone

// ✅ Map 操作 - 正常响应(需要配合 collectionHandlers)
state.departmentDoctors.set('儿科', ['刘医生'])
```

**Proxy 的五个关键拦截器**：

1. **get**：拦截属性读取,触发依赖收集
2. **set**：拦截属性赋值(包括新增属性),触发更新
3. **deleteProperty**：拦截 `delete` 操作,触发更新
4. **has**：拦截 `in` 操作符
5. **ownKeys**：拦截 `Object.keys()` / `for...in` 等遍历操作

```javascript
// Vue 3 响应式核心实现骨架
const proxy = new Proxy(target, {
  get(target, key, receiver) {
    track(target, 'get', key) // 依赖收集
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    const result = Reflect.set(target, key, value, receiver)
    trigger(target, 'set', key, value) // 触发更新
    return result
  },
  deleteProperty(target, key) {
    const result = Reflect.deleteProperty(target, key)
    trigger(target, 'delete', key) // 触发更新
    return result
  },
  has(target, key) {
    track(target, 'has', key)
    return Reflect.has(target, key)
  },
  ownKeys(target) {
    track(target, 'iterate', ITERATE_KEY)
    return Reflect.ownKeys(target)
  }
})
```

### 为什么必须配合 Reflect 使用

直接使用 `target[key]` 会导致 `this` 指向错误,来看笔记中的经典问题：

**问题一：getter 中的 this 指向丢失**

```javascript
const person = {
  name: 'test',
  age: 18,
  get aliasName() {
    return this.name + ' alias'
  }
}

const proxy = new Proxy(person, {
  get(target, key, receiver) {
    console.log('get', key)
    // ❌ 使用 target[key],this 指向原始对象
    return target[key] 
  }
})

console.log(proxy.aliasName)
// 输出：get aliasName
// 结果：test alias
// 问题：只拦截了 aliasName,没拦截到 name 的访问
// 因为 getter 中的 this.name 指向的是原始对象 person,不走代理
```

**问题二：receiver[key] 导致死循环**

```javascript
const proxy = new Proxy(person, {
  get(target, key, receiver) {
    console.log('get', key)
    // ❌ 使用 receiver[key],会再次触发 get 拦截器,死循环
    return receiver[key]
  }
})
```

**✅ 正确方案：Reflect.get 的第三个参数 receiver**

```javascript
const proxy = new Proxy(person, {
  get(target, key, receiver) {
    console.log('get', key)
    // ✅ Reflect.get 的第三个参数 receiver 会被绑定为 getter 中的 this
    return Reflect.get(target, key, receiver)
  }
})

console.log(proxy.aliasName)
// 输出：get aliasName
//      get name
// 结果：test alias
// ✅ 完整拦截链路：访问 aliasName → 触发 getter → this.name 指向 proxy → 触发 name 的 get
```

**原理解释**：`Reflect.get(target, key, receiver)` 的第三个参数 `receiver` 会作为 getter 函数执行时的 `this` 值。这样当 `aliasName` 的 getter 中访问 `this.name` 时,`this` 指向的是代理对象,而不是原始对象,从而触发代理的 get 拦截器,完成依赖收集。

医疗场景举例：

```javascript
const drug = reactive({
  name: '阿莫西林',
  price: 25,
  get displayPrice() {
    return `¥${this.price}` // 这里的 this 必须指向 proxy
  }
})

effect(() => {
  console.log(drug.displayPrice) // 必须同时追踪 displayPrice 和 price
})

drug.price = 30 // ✅ 触发更新,因为 displayPrice 的 getter 中的 this 指向 proxy
```

### Collection 类型响应式(第四类历史遗留问题)

Vue 2 完全无法监听 `Map/Set/WeakMap/WeakSet` 的变化,Vue 3 通过单独的 `collectionHandlers` 解决：

```javascript
// Map 响应式实现骨架
const mutableCollectionHandlers = {
  get(target, key, receiver) {
    // 拦截 Map 的方法
    if (key === 'get') {
      return function(key) {
        track(target, 'get', key) // 依赖收集
        return target.get(key)
      }
    }
    if (key === 'set') {
      return function(key, value) {
        const result = target.set(key, value)
        trigger(target, 'set', key, value) // 触发更新
        return result
      }
    }
    if (key === 'delete') {
      return function(key) {
        const result = target.delete(key)
        trigger(target, 'delete', key) // 触发更新
        return result
      }
    }
    // ... 其他方法类似处理
    return Reflect.get(target, key, receiver)
  }
}
```

医疗场景实战：

```javascript
// 科室 → 医生列表的索引缓存(比数组 find 性能更优)
const departmentIndex = reactive(new Map([
  ['内科', ['张医生', '王医生', '李医生']],
  ['外科', ['赵医生', '钱医生']],
  ['儿科', ['刘医生']]
]))

effect(() => {
  console.log('内科医生列表：', departmentIndex.get('内科'))
})

// ✅ 响应式更新
departmentIndex.set('内科', [...departmentIndex.get('内科'), '周医生'])
```

### effectScope()：批量管理副作用（3.2+）⭐

**为什么需要 effectScope？**

在 Vue 2 和 Vue 3 早期版本中，如果要停止多个 effect/watch/computed，需要逐个调用它们的 unwatch 函数：

```typescript
// ❌ 繁琐的手动清理
const unwatch1 = watch(source1, callback1)
const unwatch2 = watch(source2, callback2)
const unwatch3 = watchEffect(() => { /* ... */ })
const stop4 = effect(() => { /* ... */ })

// 组件卸载时，需要逐个调用
onUnmounted(() => {
  unwatch1()
  unwatch2()
  unwatch3()
  stop4()
})
```

**effectScope 批量管理**：

```typescript
import { effectScope, watch, watchEffect, computed } from 'vue'

// ✅ effectScope：一次停止所有副作用
const scope = effectScope()

scope.run(() => {
  // 在 scope 中创建的所有副作用都会被收集
  watch(source1, callback1)
  watch(source2, callback2)
  watchEffect(() => { /* ... */ })
  const count = computed(() => state.value * 2)
})

// 一次性停止所有副作用
scope.stop()
```

医疗场景举例：

```typescript
// 患者监护系统：需要同时监听多个生命体征指标
import { effectScope, watch, reactive } from 'vue'

const patientMonitor = reactive({
  heartRate: 75,      // 心率
  bloodPressure: 120, // 血压
  temperature: 36.5,  // 体温
  oxygenLevel: 98     // 血氧
})

const scope = effectScope()

scope.run(() => {
  // 监听心率异常
  watch(() => patientMonitor.heartRate, (rate) => {
    if (rate > 100 || rate < 60) {
      console.log(`⚠️ 心率异常：${rate}`)
    }
  })

  // 监听血压异常
  watch(() => patientMonitor.bloodPressure, (bp) => {
    if (bp > 140 || bp < 90) {
      console.log(`⚠️ 血压异常：${bp}`)
    }
  })

  // 监听体温异常
  watch(() => patientMonitor.temperature, (temp) => {
    if (temp > 37.5 || temp < 36) {
      console.log(`⚠️ 体温异常：${temp}`)
    }
  })

  // 监听血氧异常
  watch(() => patientMonitor.oxygenLevel, (level) => {
    if (level < 95) {
      console.log(`⚠️ 血氧偏低：${level}%`)
    }
  })
})

// 患者出院或切换病人时，一次性停止所有监听
scope.stop()
```

**effectScope 的核心特性**：

1. **自动收集**：scope.run() 内创建的所有 effect/watch/computed 都会被自动收集
2. **批量停止**：scope.stop() 一次性停止所有副作用
3. **嵌套支持**：scope 可以嵌套，子 scope 停止不影响父 scope
4. **detached 模式**：创建独立的 scope，不受父 scope 影响

```typescript
// 嵌套 scope 示例
const parentScope = effectScope()

parentScope.run(() => {
  watch(source1, callback1) // 属于 parentScope

  const childScope = effectScope()
  childScope.run(() => {
    watch(source2, callback2) // 属于 childScope
  })

  childScope.stop() // 只停止 source2 的监听
})

parentScope.stop() // 停止 source1 的监听
```

**effectScope API 清单**：

| API | 说明 | 示例 |
|-----|------|------|
| `effectScope()` | 创建一个 effect scope | `const scope = effectScope()` |
| `scope.run(fn)` | 在 scope 中执行函数，收集副作用 | `scope.run(() => watch(...))` |
| `scope.stop()` | 停止 scope 中的所有副作用 | `scope.stop()` |
| `getCurrentScope()` | 获取当前活动的 scope | `const current = getCurrentScope()` |
| `onScopeDispose(fn)` | scope 销毁时的钩子函数 | `onScopeDispose(() => { /* 清理 */ })` |

**实际应用场景**：

1. **Pinia Store 实例**：每个 Store 实例内部就是一个 effectScope，销毁 Store 时自动清理所有副作用
2. **可复用的组合式函数**：在 composables 中批量管理 watch/computed
3. **插件系统**：插件卸载时批量清理所有副作用
4. **动态组件**：组件切换时清理上一个组件的所有副作用

```typescript
// Pinia Store 的 effectScope 应用（简化版）
function defineStore(id, setup) {
  return function useStore() {
    const scope = effectScope()
    const store = scope.run(() => setup()) // 在 scope 中执行 setup
    
    // 返回的 store 带有 $dispose 方法
    store.$dispose = () => scope.stop()
    return store
  }
}
```

---

### 💬 面试官视角

**Q1：Proxy 相比 Object.defineProperty 解决了哪些问题？**

✅ **标准答案**：
1. 新增/删除属性无需 `$set/$delete`
2. 数组下标赋值直接响应
3. 可以代理 13 种操作(get/set/deleteProperty/has/ownKeys 等)
4. 可以支持 Map/Set 等 Collection 类型

🎁 **加分点**：
- Object.defineProperty 只能劫持对象已有属性,Proxy 是对象级别的代理
- Proxy 的懒递归：嵌套对象只有在访问时才代理,性能更优
- Vue 3 放弃 IE11 的原因：Proxy 无法被 polyfill(因为是语言层面的新特性,不是 API)

**Q2：为什么 Proxy 必须配合 Reflect 使用？**

✅ **标准答案**：
Reflect.get 的第三个参数 `receiver` 会作为 getter 中的 `this`,保证访问计算属性时能触发依赖收集。

🎁 **加分点**：
举例说明「问题一」中 `target[key]` 导致 `this` 指向原始对象,`aliasName` 的 getter 中 `this.name` 不走代理,无法收集 `name` 的依赖。

**Q3：Vue 3 如何支持 Map/Set 的响应式？**

✅ **标准答案**：
无法用 `baseHandlers`(因为 Map/Set 的操作是方法调用,不是属性访问),需要单独的 `collectionHandlers` 拦截 `get/set/add/delete/forEach` 等方法,手动 track/trigger。

🎁 **加分点**：
Map 的 key 可以是任意类型(包括对象),比对象字面量的 key 只能是字符串/Symbol 更灵活,适合做索引缓存。

## 🔧 二、响应式系统核心原理：track/trigger/effect 全链路

### 3.1 Effect 分类与职责体系 ⭐

在深入 track/trigger 机制之前，先理解 Vue 3 响应式系统中的 **Effect 分类体系**。Vue 3 中的 `effect` 是响应式系统的核心，负责依赖收集和触发更新。根据用途和特性，Effect 分为四大类：

#### Effect 四大分类总览

| 类型 | 用途 | 创建方式 | 核心特点 | 应用场景 |
|------|------|----------|----------|----------|
| **Reactive Effect** | 响应式数据依赖追踪 | `effect()` | 自动触发，可手动停止 | 手动副作用管理 |
| **Computed Effect** | 派生计算属性 | `computed()` | 惰性求值，缓存结果，dirty 标记 | 派生状态计算 |
| **Watch Effect** | 监听数据变化 | `watch()`/`watchEffect()` | 细粒度控制（immediate、deep） | 数据变化回调 |
| **Render Effect** | 组件渲染 | 框架内部实现 | 开发者无需直接操作 | 组件响应式更新 |

---

#### 1️⃣ Reactive Effect：手动副作用管理

**作用**：用于响应式数据的依赖收集和触发更新。

**特点**：
- 当响应式数据变化时，自动重新执行
- 通过 `effect()` 函数创建
- 返回 runner 函数，可手动执行或停止

**示例**：

```typescript
import { effect, reactive } from 'vue'

const state = reactive({ count: 0 })

// 创建一个 effect
const stop = effect(() => {
  console.log(state.count) // 每次 state.count 变化时触发
})

state.count++ // 输出: 1

// 停止 effect
stop()
state.count++ // 不再触发 effect
```

**医疗场景示例**：

```typescript
import { effect, reactive } from 'vue'

// 患者生命体征监控
const patient = reactive({
  heartRate: 75,
  bloodPressure: 120
})

// effect 自动追踪依赖
const stop = effect(() => {
  console.log(`💓 心率: ${patient.heartRate} bpm`)
  console.log(`🩺 血压: ${patient.bloodPressure} mmHg`)
})

patient.heartRate = 110 // 自动触发 effect
// 输出:
// 💓 心率: 110 bpm
// 🩺 血压: 120 mmHg

stop() // 停止监控
```

---

#### 2️⃣ Computed Effect：惰性计算 + 缓存

**作用**：用于计算属性，基于其他响应式数据派生值。

**核心特点**：
- **惰性求值**：只有被访问时才计算
- **缓存结果**：避免重复计算，通过 `dirty` 标记控制
- 本身也是一个 effect，依赖变化时只标记 dirty，不立即计算
- 通过 `scheduler` 机制触发依赖的其他 effect

**工作原理**：

```typescript
class ComputedRefImpl {
  effect: ReactiveEffect
  _dirty = true // dirty 标记

  constructor(getter) {
    this.effect = new ReactiveEffect(
      getter,
      () => {
        // scheduler: 依赖变化时执行
        if (!this._dirty) {
          this._dirty = true // 标记为脏
          triggerRefValue(this) // 触发依赖此 computed 的 effect
        }
      }
    )
  }

  get value() {
    // 只有 dirty 为 true 时才重新计算
    if (this._dirty) {
      this._value = this.effect.run()
      this._dirty = false
    }
    trackRefValue(this) // 收集依赖
    return this._value
  }
}
```

**医疗场景示例**：

```typescript
import { computed, reactive, effect } from 'vue'

const patient = reactive({
  heartRate: 75,
  bloodPressure: 120,
  temperature: 36.5
})

// computed 本身是一个 effect
const healthIndex = computed(() => {
  console.log('🔄 重新计算健康指数...')
  const hrScore = patient.heartRate > 100 ? 0 : 1
  const bpScore = patient.bloodPressure > 140 ? 0 : 1
  const tempScore = patient.temperature > 37.5 ? 0 : 1
  return (hrScore + bpScore + tempScore) / 3
})

// 在 effect 中使用 computed
effect(() => {
  console.log('健康指数:', healthIndex.value) // 首次访问才计算
})
// 输出:
// 🔄 重新计算健康指数...
// 健康指数: 1

// 依赖变化，标记 dirty，但不立即计算
patient.heartRate = 110

// 下次访问时才重新计算
console.log(healthIndex.value)
// 输出:
// 🔄 重新计算健康指数...
// 0.6666666666666666
```

**关键点**：
- computed 依赖变化时，不会立即重新计算
- 只有当 computed 的 value 被访问时，才会检查 dirty 并重新计算
- 如果 computed 被其他 effect 依赖，依赖变化时会触发那个 effect 重新执行

---

#### 3️⃣ Watch Effect：数据监听 + 回调

**作用**：监听响应式数据的变化并执行回调。

**特点**：
- 类似于 `effect`，但提供更细粒度的控制
- 支持 `immediate`（立即执行）、`deep`（深度监听）等选项
- 通过 `watch()` 或 `watchEffect()` 创建
- 可获取新值和旧值

**示例**：

```typescript
import { watchEffect, watch, reactive } from 'vue'

const state = reactive({ count: 0 })

// watchEffect: 立即执行，并在依赖变化时重新执行
watchEffect(() => {
  console.log(state.count) // 立即输出: 0
})

// watch: 监听特定数据源
watch(
  () => state.count,
  (newVal, oldVal) => {
    console.log(`从 ${oldVal} 变为 ${newVal}`)
  },
  { immediate: true } // 立即执行一次
)

state.count++ // 触发两个 watch
```

**医疗场景示例**：

```typescript
import { watch, reactive } from 'vue'

const patient = reactive({
  heartRate: 75,
  bloodPressure: 120
})

// 监听心率异常
watch(
  () => patient.heartRate,
  (newRate, oldRate) => {
    if (newRate > 100 || newRate < 60) {
      console.log(`⚠️ 心率异常：${oldRate} → ${newRate}`)
      // 触发告警系统
    }
  }
)

patient.heartRate = 110 // 输出: ⚠️ 心率异常：75 → 110
```

---

#### 4️⃣ Render Effect：组件渲染（框架内部）

**作用**：用于组件的渲染逻辑，是 Vue 组件响应式更新的核心。

**特点**：
- Vue 组件内部通过 `renderEffect` 实现模板的响应式更新
- 开发者通常不直接接触，由框架内部管理
- 组件挂载时创建，卸载时销毁

**框架内部逻辑（简化版）**：

```typescript
// Vue 内部的组件更新函数
const componentUpdateFn = () => {
  const vnode = render() // 执行渲染函数，自动收集依赖
  patch(prevVnode, vnode) // 更新 DOM
}

// 创建 renderEffect
const effect = new ReactiveEffect(
  componentUpdateFn,
  () => queueJob(componentUpdateFn) // 调度器：异步更新队列
)

effect.run() // 首次渲染
```

**使用示例**：

```vue
<script setup>
import { reactive } from 'vue'

// 患者信息
const patient = reactive({
  name: '张三',
  age: 45
})

// 模板会自动创建 renderEffect
</script>

<template>
  <div>
    <!-- 访问 patient.name 和 patient.age 时，renderEffect 会收集依赖 -->
    <p>患者姓名: {{ patient.name }}</p>
    <p>患者年龄: {{ patient.age }}</p>
  </div>
</template>
```

---

#### Effect 职责对比总结

```typescript
import { reactive, effect, computed, watch } from 'vue'

const patient = reactive({
  heartRate: 75,
  bloodPressure: 120,
  temperature: 36.5
})

// 1️⃣ Reactive Effect：手动管理副作用
const stop = effect(() => {
  console.log('手动副作用:', patient.heartRate)
})

// 2️⃣ Computed Effect：惰性计算 + 缓存
const healthIndex = computed(() => {
  return (patient.heartRate + patient.bloodPressure) / 2
})

// 3️⃣ Watch Effect：数据监听 + 回调
watch(
  () => patient.heartRate,
  (newVal) => {
    console.log('监听到变化:', newVal)
  }
)

// 4️⃣ Render Effect：组件渲染（框架内部）
// Vue 内部自动创建，开发者无需关心
```

**核心区别**：

| 特性 | Reactive Effect | Computed Effect | Watch Effect | Render Effect |
|------|----------------|----------------|-------------|--------------|
| **执行时机** | 依赖变化立即执行 | 访问时才执行 | 依赖变化执行回调 | 异步批量更新 |
| **缓存** | ❌ 无缓存 | ✅ 有缓存（dirty） | ❌ 无缓存 | ✅ 组件级缓存 |
| **返回值** | runner 函数 | ref 对象 | unwatch 函数 | - |
| **调度器** | 可选 | 内置 scheduler | 可选 | 内置 queueJob |
| **使用场景** | 自定义副作用 | 派生计算 | 数据监听 | 组件渲染 |

---

### 3.2 reactive() 实现原理

> **对比 Vue2**：Vue2 的 `data` 选项在初始化阶段递归遍历所有属性,逐一调用 `Object.defineProperty` 完成一次性深度劫持。Vue3 的 `reactive()` 改用 Proxy 惰性递归代理,只有真正访问到嵌套对象时才会对其创建代理,避免了初始化阶段的一次性开销。

`reactive()` 通过 `Proxy` + `WeakMap` 缓存实现深层响应式对象。

**WeakMap 缓存机制**：

```typescript
// 缓存对象,避免重复创建代理对象
const reactiveMap = new WeakMap()

const createReactiveObject = (target: any) => {
  // 判断是否是一个对象,如果不是对象,直接返回
  if (!isObject(target)) {
    return target
  }
  
  // 创建代理对象
  const proxy = new Proxy(target, mutableHandlers)
  
  // 判断是否已经创建过代理对象
  if (target[ReactiveFlags.IS_REACTIVE]) {
    return target
  }
  
  // 获取缓存的代理对象
  const existProxy = reactiveMap.get(target)
  // 判断对象是否已经被代理过,如果被代理过,则直接返回缓存的代理对象
  if (existProxy) {
    return existProxy
  }
  
  // 缓存对象
  reactiveMap.set(target, proxy)
  return proxy
}

export const reactive = (target: any) => {
  return createReactiveObject(target)
}
```

**为什么用 WeakMap 而不是 Map？**

1. **防止内存泄漏**：WeakMap 的 key 是弱引用,当原始对象被垃圾回收时,WeakMap 中的记录会自动清除
2. **key 只能是对象**：WeakMap 的 key 必须是对象,正好符合 reactive 的使用场景

```typescript
// Map 的问题：会阻止 GC
const cache = new Map()
let obj = { name: 'test' }
cache.set(obj, proxy)
obj = null // ❌ 原始对象无法被 GC,因为 Map 持有强引用

// WeakMap 解决方案
const cache = new WeakMap()
let obj = { name: 'test' }
cache.set(obj, proxy)
obj = null // ✅ 原始对象可以被 GC
```

**惰性递归代理**：

嵌套对象只有在访问时才代理,性能更优。

```typescript
class BaseReactiveHandler implements ProxyHandler<any> {
  get(target, p, receiver) {
    if (p === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    
    // 收集依赖
    track(target, TrackOpTypes.GET, p)
    
    // 获取属性值
    const res = Reflect.get(target, p, receiver)
    
    // 📚 知识点：惰性递归代理
    // 只有在访问嵌套对象时才代理,而不是初始化时全部代理
    if (isObject(res)) {
      return reactive(res)
    }
    return res
  }
}
```

医疗场景：

```typescript
const hospital = reactive({
  name: '某某医院',
  departments: {
    internal: {
      doctors: [
        { name: '张医生', patients: [] }
      ]
    }
  }
})

// 只有在访问 departments 时,departments 才被代理
console.log(hospital.departments) // 此时 departments 被代理

// 只有在访问 internal 时,internal 才被代理
console.log(hospital.departments.internal) // 此时 internal 被代理
```

**toReactive() 辅助函数**：

```typescript
export const toReactive = <T extends unknown>(value: T): T => {
  return isObject(value) ? reactive(value) : value
}
```

用于 `ref()` 内部,对象类型转 `reactive`,基本类型保持不变。

### shallowReactive() 实现原理

> **对比 Vue2**：Vue2 没有对应 API,无法选择"只代理第一层"。Vue3 新增 `shallowReactive()` 用于大数据场景性能优化。

只代理第一层属性,不递归代理嵌套对象。

```typescript
class ShallowReactiveHandler extends BaseReactiveHandler {
  get(target, p, receiver) {
    if (p === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    
    track(target, TrackOpTypes.GET, p)
    
    const res = Reflect.get(target, p, receiver)
    
    // ❌ 不递归代理,直接返回原始值
    return res
  }
}

export const shallowReactive = (target: any) => {
  return new Proxy(target, shallowReactiveHandlers)
}
```

**应用场景**：大型只读数据,避免深层递归代理开销。

医疗场景：万条药品目录

```typescript
// 性能对比
const catalog1 = reactive({
  version: '2024-Q1',
  data: [ /* 10000+ 条药品数据,每条有多层嵌套 */ ]
})
// ❌ reactive 会递归代理所有嵌套对象,初始化慢

const catalog2 = shallowReactive({
  version: '2024-Q1',
  data: [ /* 10000+ 条药品数据,每条有多层嵌套 */ ]
})
// ✅ shallowReactive 只代理第一层,初始化快
```

### readonly() / shallowReadonly() 实现原理

> **对比 Vue2**：Vue2 通过 `Object.freeze()` 冻结对象,但无法递归深层对象,且冻结后无法拦截写操作给出警告。Vue3 的 `readonly()` 通过 Proxy 递归代理,set 拦截器中给出警告,开发体验更好。

创建只读代理,set 拦截器返回 false 或抛出警告。

```typescript
class ReadonlyReactiveHandler extends BaseReactiveHandler {
  set(target, p, value, receiver) {
    if (__DEV__) {
      console.warn(
        `Set operation on key "${String(p)}" failed: target is readonly.`,
        target
      )
    }
    return true // 返回 true 避免报错,但不执行赋值
  }
  
  deleteProperty(target, p) {
    if (__DEV__) {
      console.warn(
        `Delete operation on key "${String(p)}" failed: target is readonly.`,
        target
      )
    }
    return true
  }
}

export const readonly = (target: any) => {
  return new Proxy(target, readonlyHandlers)
}
```

**与 reactive 的区别**：

1. readonly 不需要 trigger(因为不可修改)
2. readonly 仍然会 track(因为可以作为计算属性的依赖)
3. readonly 对象修改原始对象会同步更新

```typescript
const original = reactive({ count: 0 })
const copy = readonly(original)

effect(() => {
  console.log(copy.count) // ✅ 依然收集依赖
})

original.count++ // ✅ copy.count 同步变化,触发 effect
copy.count++ // ❌ 警告,不执行
```

### 响应式系统三件套完整链路

Vue 3 响应式系统的核心是 `track` / `trigger` / `effect` 三件套。

**track：三层依赖存储结构**

![](https://cdn.nlark.com/yuque/0/2025/png/738210/1753756872576-6739188c-9ec6-436a-be3a-f6d1d3e63c7d.png)

```typescript
// 三层依赖存储结构
const targetMap = new WeakMap<any, Map<any, Dep>>()

// WeakMap<target, Map<key, Set<effect>>>
// targetMap → depsMap → dep

export const track = (target: object, type: TrackOpTypes, key: unknown) => {
  // 判断当前是否处于 effect 中
  if (activeEffect) {
    // 第一层：获取对象和属性的依赖关系
    let depsMap = targetMap.get(target)
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()))
    }
    
    // 第二层：获取属性的依赖关系
    let dep = depsMap.get(key)
    if (!dep) {
      depsMap.set(key, (dep = createDep(() => depsMap.delete(key), null, key)))
    }
    
    // 第三层：添加依赖关系
    trackEffect(activeEffect, dep)
  }
}
```

**三层结构解释**：

1. **targetMap**：WeakMap,key 是响应式对象,value 是 depsMap
2. **depsMap**：Map,key 是对象的属性名,value 是 dep
3. **dep**：Map,key 是 effect,value 是 trackId(用于分支切换 cleanup)

医疗场景举例：

```typescript
const patient = reactive({
  name: '张三',
  age: 45
})

effect(() => {
  console.log(patient.name, patient.age)
})

// 依赖关系存储：
// targetMap.get(patient) → depsMap
// depsMap.get('name') → dep (包含上面的 effect)
// depsMap.get('age') → dep (包含上面的 effect)
```

**trigger：派发更新**

```typescript
export const trigger = (
  target: object, 
  type: TriggerOpTypes, 
  key?: unknown, 
  value?: unknown, 
  oldValue?: unknown
) => {
  // 获取对象和属性的依赖关系
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  
  // 获取属性的依赖关系
  let dep = depsMap.get(key)
  if (dep) {
    // 触发更新
    triggerEffects(dep)
  }
}

export const triggerEffects = (dep: Dep) => {
  for (const effect of dep.keys()) {
    // 当前的值是不脏的,触发更新需将值变脏
    if (effect._dirtyLevel < DirtyLevels.Dirty) {
      effect._dirtyLevel = DirtyLevels.Dirty
    }
    if (!effect._running) {
      if (effect.scheduler) {
        // 执行调度器,等价于调用 effect.run()
        effect.scheduler()
      } else {
        // 否则执行 effect.run()
        effect.run()
      }
    }
  }
}
```

**effect：响应式副作用**

```typescript
export let activeEffect: any // 当前激活的 effect

export class ReactiveEffect<T = any> {
  public active = true // 是否激活
  deps: any[] = [] // 存储依赖关系
  _trackId = 0 // 用于记录 effect 执行的次数,防止重复收集依赖
  _depsLength = 0 // 用于记录 deps 的长度
  _running = 0 // 用于记录 effect 是否正在执行
  _dirtyLevel = DirtyLevels.Dirty // 脏值级别,用于标记需要重新计算的属性

  constructor(public fn: Function, public scheduler?: Function) {}
  
  public get dirty() {
    return this._dirtyLevel >= DirtyLevels.Dirty
  }
  public set dirty(v: boolean) {
    this._dirtyLevel = v ? DirtyLevels.Dirty : DirtyLevels.NotDirty
  }

  run() {
    // 每次执行后 effect 变为不脏
    this._dirtyLevel = DirtyLevels.NotDirty
    
    if (!this.active) {
      return this.fn()
    }
    
    let lastEffect = activeEffect // 保存当前激活的 effect
    try {
      activeEffect = this // 设置当前激活的 effect
      this._running++ // 标记为正在执行
      
      preCleanupEffect(this) // 执行前清理
      return this.fn() // 执行函数
    } finally {
      this._running-- // 标记为执行完毕
      postCleanupEffect(this) // 执行后清理
      activeEffect = lastEffect // 恢复上一次激活的 effect
    }
  }
}

export const effect = (fn: Function, options: Record<string, any> = {}) => {
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run()
  })
  
  if (options) {
    extend(_effect, options)
  }
  
  _effect.run() // 立即执行一次
  
  const runner = _effect.run.bind(_effect)
  runner.effect = _effect
  return runner
}
```

### Effect 执行机制深度解析

**1. 嵌套 effect 处理(effect 栈)**

```typescript
let activeEffect: ReactiveEffect | undefined

export class ReactiveEffect {
  run() {
    if (!this.active) {
      return this.fn()
    }
    
    let lastEffect = activeEffect // 📚 保存上一个 effect
    try {
      activeEffect = this // 设置当前 effect
      return this.fn()
    } finally {
      activeEffect = lastEffect // 📚 恢复上一个 effect
    }
  }
}
```

医疗场景：

```typescript
const patient = reactive({
  name: '张三',
  vitals: { heartRate: 75 }
})

effect(() => {
  console.log('外层 effect')
  console.log(patient.name) // 收集到外层 effect
  
  effect(() => {
    console.log('内层 effect')
    console.log(patient.vitals.heartRate) // 收集到内层 effect
  })
  
  console.log(patient.name) // 再次收集到外层 effect
})

patient.name = '李四' // 只触发外层 effect
patient.vitals.heartRate = 80 // 只触发内层 effect
```

**2. 分支切换与 cleanup**

```typescript
const state = reactive({
  flag: true,
  name: '张三',
  age: 30
})

effect(() => {
  console.log(state.flag ? state.name : state.age)
})

// 首次执行：依赖 { flag, name }
// state.flag = false 后：依赖应该变为 { flag, age }
// 必须清除 name 的依赖,否则 state.name 变化仍会触发 effect
```

**cleanup 实现**：

```typescript
// 执行 effect 之前的清理逻辑
const preCleanupEffect = (effect: ReactiveEffect) => {
  effect._trackId++ // trackId 递增,用于判断是否需要执行 cleanup
  effect._depsLength = 0 // 重置 deps 的长度
}

// 执行 effect 之后的清理逻辑
const postCleanupEffect = (effect: ReactiveEffect) => {
  // 首次：{ flag, name, age }
  // 更新：{ flag }
  // 此时需要删除多余的属性 name 和 age
  if (effect.deps.length > effect._depsLength) {
    for (let i = effect._depsLength; i < effect.deps.length; i++) {
      cleanupDepEffect(effect.deps[i], effect)
    }
    effect.deps.length = effect._depsLength
  }
}

function cleanupDepEffect(dep: Dep, effect: ReactiveEffect) {
  const trackId = dep.get(effect)
  if (trackId !== undefined && effect._trackId !== trackId) {
    dep.delete(effect) // 清理对象和属性的依赖关系
    if (dep.size === 0) {
      dep.cleanup() // 清理空的 dep
    }
  }
}
```

**3. 防止递归调用(`_running` 标记)**

```typescript
export const triggerEffects = (dep: Dep) => {
  for (const effect of dep.keys()) {
    if (!effect._running) { // 📚 防止递归调用
      if (effect.scheduler) {
        effect.scheduler()
      } else {
        effect.run()
      }
    }
  }
}
```

医疗场景：

```typescript
const patient = reactive({ age: 30 })

effect(() => {
  console.log('effect run')
  patient.age++ // ❌ 如果没有 _running 标记,会无限递归
})
```

**4. 调度执行(scheduler)**

```typescript
const patient = reactive({ name: '张三', age: 30 })

const runner = effect(() => {
  console.log('effect run')
  console.log(patient.name, patient.age)
}, {
  scheduler() {
    console.log('数据更新了,不重新渲染,走自己的逻辑')
    // 用户自己决定何时重新渲染
    setTimeout(() => {
      runner()
    }, 1000)
  }
})

patient.name = '李四' // 不立即执行 effect,而是走 scheduler
```

**应用场景**：
- Vue 组件的异步更新队列
- watch 的 flush: 'post' 选项

**5. Effect 分类总结**

| 类型 | 用途 | 创建方式 | 特点 |
|------|------|----------|------|
| Reactive Effect | 响应式数据依赖追踪 | `effect()` | 自动触发 |
| Computed Effect | 派生计算属性 | `computed()` | 惰性求值,缓存结果 |
| Watch Effect | 监听数据变化 | `watch()` / `watchEffect()` | 细粒度控制 |
| Render Effect | 组件渲染 | 框架内部实现 | 开发者无需直接操作 |

### ref() 实现原理

> **对比 Vue2**：Vue2 的 data 中基本类型也是响应式的,通过 defineProperty 劫持对象属性实现。Vue3 中基本类型无法被 Proxy 代理(Proxy 只能代理对象),因此 `ref()` 用闭包包装成对象,通过 `.value` 访问。

为什么基本类型需要包装成对象？因为 JavaScript 的基本类型是按值传递的,无法被 Proxy 代理。

**RefImpl 类实现**：

```typescript
class RefImpl<T> {
  private _value: T // 缓存值
  private _rawValue: T // 原始值
  public readonly __v_isRef = true // 标记是 ref 对象
  public dep?: Dep = undefined // 记录依赖项

  constructor(value: T, public readonly __v_isShallow: boolean) {
    this._value = __v_isShallow ? value : toReactive(value)
    this._rawValue = value
  }

  get value() {
    trackRefValue(this) // 依赖收集
    return this._value
  }

  set value(newValue) {
    if (hasChanged(newValue, this._rawValue)) {
      this._value = newValue
      this._rawValue = newValue
      triggerRefValue(this) // 触发更新
    }
  }
}

export const trackRefValue = (ref: any) => {
  if (activeEffect) {
    // 📚 知识点：ref.dep 优先使用已有的,防止直接创建丢失之前的依赖关系
    trackEffect(activeEffect, ref.dep ??= createDep(() => (ref.dep = undefined), undefined))
  }
}

export const triggerRefValue = (ref: any) => {
  const dep = ref.dep
  if (dep) {
    triggerEffects(dep)
  }
}
```

**对象类型的 ref 内部调用 reactive()**：

```typescript
export const toReactive = <T extends unknown>(value: T): T => {
  return isObject(value) ? reactive(value) : value
}

// 在 RefImpl 构造函数中
constructor(value: T, public readonly __v_isShallow: boolean) {
  this._value = __v_isShallow ? value : toReactive(value) // 对象类型转 reactive
  this._rawValue = value
}
```

医疗场景：

```typescript
const patientAge = ref(30) // 基本类型,包装成 RefImpl
const patientInfo = ref({ name: '张三', age: 30 }) // 对象类型,内部转 reactive

effect(() => {
  console.log(patientAge.value) // 基本类型的 ref
  console.log(patientInfo.value.name) // 对象类型的 ref,深层响应式
})

patientAge.value = 31 // 触发更新
patientInfo.value.name = '李四' // 触发更新(深层响应式)
```

### shallowRef() 实现原理

> **对比 Vue2**：Vue2 无对应 API。Vue3 新增 `shallowRef()` 用于"只响应 `.value` 赋值,不递归代理 value 内部属性"的场景。

只追踪 `.value` 的变化,不深度代理 `.value` 的内容。

```typescript
export const shallowRef = (value: unknown) => {
  return createRef(value, true) // 第二个参数为 true
}

// 在 RefImpl 构造函数中
constructor(value: T, public readonly __v_isShallow: boolean) {
  // shallowRef 不调用 toReactive,直接使用原始值
  this._value = __v_isShallow ? value : toReactive(value)
  this._rawValue = value
}
```

配合 `triggerRef()` 手动触发：

```typescript
export const triggerRef = (ref: Ref) => {
  triggerRefValue(ref)
}
```

### customRef() 实现原理

> **对比 Vue2**：Vue2 无法自定义 ref 行为。Vue3 的 `customRef()` 允许手动控制 track/trigger 时机,实现防抖、节流等高级场景。

完全控制依赖追踪和触发时机,手动调用 `track` 和 `trigger`。

```typescript
export function customRef<T>(factory: CustomRefFactory<T>): Ref<T> {
  return new CustomRefImpl(factory) as any
}

class CustomRefImpl<T> {
  public readonly __v_isRef = true
  private readonly _get: ReturnType<CustomRefFactory<T>>['get']
  private readonly _set: ReturnType<CustomRefFactory<T>>['set']

  constructor(factory: CustomRefFactory<T>) {
    const { get, set } = factory(
      () => trackRefValue(this), // track 函数
      () => triggerRefValue(this) // trigger 函数
    )
    this._get = get
    this._set = set
  }

  get value() {
    return this._get()
  }

  set value(newValue) {
    this._set(newValue)
  }
}
```

**防抖 ref 完整实现**：

```typescript
function useDebouncedRef(value, delay = 300) {
  let timeout
  return customRef((track, trigger) => {
    return {
      get() {
        track() // 手动收集依赖
        return value
      },
      set(newValue) {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          value = newValue
          trigger() // 手动触发更新
        }, delay)
      }
    }
  })

> **对比 Vue2**：Vue2 的 `computed` 也是基于 dirty 标记的惰性求值,但 Vue3 引入了 DirtyLevels 五级机制,支持嵌套 computed 的精细化更新,避免不必要的重算。
}
```

### computed() 实现原理

惰性求值 + `dirty` 脏标记 + 缓存结果。

**ComputedRefImpl 类实现**：

```typescript
class ComputedRefImpl<T> {
  public readonly effect: ReactiveEffect<T> // 记录响应式依赖关系
  public dep?: Dep = undefined // 记录依赖关系
  public __v_isRef = true // 标记这是一个 ref 对象
  private _value: T // 缓存值

  constructor(
    private getter: ComputedGetter<T>,
    private readonly _setter: ComputedSetter<T>
  ) {
    this.effect = new ReactiveEffect(
      () => getter(this._value), // 创建响应式依赖关系
      () => {
        // 📚 知识点：依赖变化时的 scheduler
        // 计算属性依赖的值变化后,触发渲染 effect
        // 还需要让计算属性的 effect 的 dirty 变脏
        triggerRefValue(this)
      }
    )
  }

  get value() {
    // 📚 知识点：只有当 effect.dirty=true 的时候才会触发重新计算
    if (this.effect.dirty) {
      this._value = this.effect.run()
      // 📚 知识点：让计算属性和其依赖收集的 effect 关联起来
      trackRefValue(this) // 收集依赖
    }
    return this._value
  }

  set value(newValue: T) {
    this._setter(newValue)
  }

  get _dirty() {
    return this.effect.dirty
  }

  set _dirty(v: boolean) {
    this.effect.dirty = v
  }
}
```

**dirty 标记机制**：

```typescript
export class ReactiveEffect<T = any> {
  _dirtyLevel = DirtyLevels.Dirty // 脏值级别

  public get dirty() {
    return this._dirtyLevel >= DirtyLevels.Dirty
  }

  public set dirty(v: boolean) {
    this._dirtyLevel = v ? DirtyLevels.Dirty : DirtyLevels.NotDirty
  }

  run() {
    // 每次执行后 effect 变为不脏
    this._dirtyLevel = DirtyLevels.NotDirty
    // ... 执行逻辑
  }
}

// 触发更新时将 effect 标记为脏
export const triggerEffects = (dep: Dep) => {
  for (const effect of dep.keys()) {
    // 当前的值是不脏的,触发更新需将值变脏
    if (effect._dirtyLevel < DirtyLevels.Dirty) {
      effect._dirtyLevel = DirtyLevels.Dirty
    }
    // ...
  }
}
```

医疗场景：

```typescript
const inventory = reactive({
  items: [
    { name: '阿莫西林', price: 25, stock: 500 },
    { name: '布洛芬', price: 18, stock: 300 }
  ]
})

const totalValue = computed(() => {
  console.log('computed 执行') // 观察执行次数
  return inventory.items.reduce((sum, item) => {
    return sum + item.price * item.stock
  }, 0)
})

console.log(totalValue.value) // 输出: computed 执行 (首次计算)
console.log(totalValue.value) // 直接返回缓存值,不重新计算
console.log(totalValue.value) // 直接返回缓存值

> **对比 Vue2**：Vue2 的 computed 只有简单的 dirty 标记(true/false)。Vue3 引入 DirtyLevels 五级机制(NotDirty/QueryingDirty/MaybeDirty_ComputedSideEffect/MaybeDirty/Dirty),精细化控制嵌套 computed 的更新传播,避免不必要的重算。

inventory.items[0].stock = 600 // 修改依赖,标记 dirty = true
console.log(totalValue.value) // 输出: computed 执行 (重新计算)
```

### DirtyLevels 五级脏标记机制深度解析 ⭐

前面看到的 `dirty` 其实是对 `_dirtyLevel` 的简化封装。Vue 3.4 源码中，脏值级别并不是简单的布尔值，而是一个**五级枚举**，这是为了精细化控制 computed 嵌套依赖时的重新计算时机，避免不必要的重复求值。

**完整的五级定义**：

```typescript
export enum DirtyLevels {
  NotDirty = 0,         // 不脏，用上一次返回的值
  QueryingDirty = 1,    // 脏，正在查询中
  MaybeDirty_ComputedSideEffect = 2, // 脏，但是可能在计算属性的副作用中
  MaybeDirty = 3,       // 脏，但是不在计算属性的副作用中
  Dirty = 4             // 脏，需要重新计算
}
```

**为什么需要 5 个级别而不是简单的 true/false？**

医疗场景举例，假设有这样的嵌套计算属性链：

```typescript
import { reactive, computed } from 'vue'

const inventory = reactive({
  items: [
    { name: '阿莫西林', price: 25, stock: 500 }
  ]
})

// computed A：依赖 inventory.items
const totalValue = computed(() => {
  return inventory.items.reduce((sum, item) => sum + item.price * item.stock, 0)
})

// computed B：依赖 computed A（嵌套 computed）
const formattedValue = computed(() => {
  return `¥${totalValue.value.toFixed(2)}`
})

// effect 依赖 computed B
effect(() => {
  console.log(formattedValue.value)
})
```

当 `inventory.items[0].stock` 变化时，会依次触发：
1. `totalValue` 的 scheduler 执行，标记 `MaybeDirty`（因为它的依赖变了，但自己的值还没重新算）
2. `formattedValue` 因为依赖了 `totalValue`（一个 computed），需要先检查 `totalValue` 是否真的变化了，此时标记为 `MaybeDirty_ComputedSideEffect`
3. 只有真正访问 `formattedValue.value` 时，才会逐层检查并计算

**级别之间的判定逻辑**（简化版逻辑）：

```typescript
export class ReactiveEffect<T = any> {
  _dirtyLevel = DirtyLevels.Dirty

  // dirty getter：只要 >= Dirty 就认为是脏的
  public get dirty() {
    // 📚 知识点：MaybeDirty 状态需要重新执行依赖链检查
    if (this._dirtyLevel === DirtyLevels.MaybeDirty ||
        this._dirtyLevel === DirtyLevels.MaybeDirty_ComputedSideEffect) {
      // 重新运行依赖的 computed，确认真实的脏值级别
      this._dirtyLevel = DirtyLevels.QueryingDirty
      triggerComputed(this.computed) // 触发依赖的 computed 重新求值
    }
    return this._dirtyLevel >= DirtyLevels.Dirty
  }

  public set dirty(v: boolean) {
    this._dirtyLevel = v ? DirtyLevels.Dirty : DirtyLevels.NotDirty
  }
}
```

**性能优化的核心价值**：

```typescript
// ❌ 如果没有 MaybeDirty 这一级，每次依赖变化都会导致整条链重新计算
// A 变化 → B（依赖A）标记 dirty → C（依赖B）也标记 dirty → 全部重新计算

// ✅ 有了 MaybeDirty 这一级，可以做到：
// A 变化 → B 标记 MaybeDirty（暂不确定是否真的需要重算）
// → 只有真正访问 C 时，才逐层验证 B 是否真的变了 → 决定 C 是否需要重算
```

医疗场景实战：多级计算属性的性能优化

```typescript
import { reactive, computed } from 'vue'

// 药品库存数据
const drugStock = reactive({
  items: [
    { name: '阿莫西林', price: 25, stock: 500, category: '抗生素' },
    { name: '布洛芬', price: 18, stock: 300, category: '解热镇痛' }
  ]
})

// 第一级 computed：按类别分组
const groupedByCategory = computed(() => {
  console.log('🔄 计算分组')
  const groups: Record<string, typeof drugStock.items> = {}
  drugStock.items.forEach(item => {
    if (!groups[item.category]) groups[item.category] = []
    groups[item.category].push(item)
  })
  return groups
})

// 第二级 computed：依赖第一级，计算每类的总价值
const categoryTotalValue = computed(() => {
  console.log('🔄 计算分类总价值')
  const result: Record<string, number> = {}
  for (const [category, items] of Object.entries(groupedByCategory.value)) {
    result[category] = items.reduce((sum, item) => sum + item.price * item.stock, 0)
  }
  return result
})

// 第三级 computed：依赖第二级，格式化输出
const formattedReport = computed(() => {
  console.log('🔄 生成报告')
  return Object.entries(categoryTotalValue.value)
    .map(([category, total]) => `${category}: ¥${total}`)
    .join(', ')
})

console.log(formattedReport.value)
// 输出:
// 🔄 计算分组
// 🔄 计算分类总价值
// 🔄 生成报告
// 抗生素: ¥12500, 解热镇痛: ¥5400

// 修改一个不影响分组结果的字段（比如 stock 数量变化但分组不变）
drugStock.items[0].stock = 600

console.log(formattedReport.value)
// DirtyLevels 机制确保：只有真正需要重算的 computed 才会重新执行
// 而不是因为依赖链上有一环变化就无脑重算整条链
```

**面试常见追问**：`MaybeDirty` 和 `Dirty` 的本质区别是什么？

- `Dirty`：明确知道需要重新计算（依赖的是**非 computed** 的响应式数据直接变化）
- `MaybeDirty` / `MaybeDirty_ComputedSideEffect`：依赖的是**另一个 computed**，而 computed 本身有缓存，所以不能直接认定"脏"，需要先检查这个上游 computed 重新求值后结果是否真的变化了

### watch vs watchEffect 原理对比

两者底层都是 `doWatch`,只是参数不同。

**watch 实现**：

```typescript
function doWatch(
  source: WatchSource | WatchSource[] | WatchEffect | object,
  cb: Function,
  { deep, immediate }: WatchOptions = {}
) {
  // 📚 知识点：根据 deep 选项决定遍历深度
  const reactiveGetter = (source: object) => {
    if (deep) return source
    if (deep === false || deep === 0) {
      return traverse(source, 1)
    }
    return traverse(source)
  }

  let getter = () => reactiveGetter(source)
  let oldValue

  const job = () => {
    const newValue = effect.run()
    cb(newValue, oldValue) // 回调中可以访问旧值
    oldValue = newValue
  }

  if (cb && deep) {
    const baseGetter = getter
    const depth = deep === true ? Infinity : deep
    getter = () => traverse(baseGetter(), depth)
  }

  const effect = new ReactiveEffect(getter, job)

  if (cb) {
    if (immediate) {
      job() // 立即执行一次
    } else {
      oldValue = effect.run() // 惰性执行,先收集依赖
    }
  }
}

export const watch = <T = any>(
  source: WatchSource<T> | T,
  cb: any,
  options?: WatchOptions
) => {
  return doWatch(source as any, cb, options)
}
```

**traverse 遍历函数**：

```typescript
export function traverse(value: unknown, depth: number = Infinity, seen?: Set<unknown>) {
  // 📚 知识点：递归遍历对象,触发所有属性的 get,收集依赖
  if (depth <= 0 || !isObject(value)) {
    return value
  }

  seen = seen || new Set()
  if (seen.has(value)) {
    return value // 防止循环引用
  }
  seen.add(value)
  depth--

  for (const key in value as any) {
    traverse(value[key], depth, seen)
  }
  return value
}
```

**watchEffect 实现**：

```typescript
export const watchEffect = (effect: WatchEffect, options?: WatchOptions) => {
  return doWatch(effect, null, options) // 📚 知识点：cb 为 null,自动收集依赖
}
```

**区别总结**：

1. **依赖收集时机**：
   - `watch`：显式声明依赖源,惰性执行(首次不执行,除非 `immediate: true`)
   - `watchEffect`：自动收集依赖,立即执行

2. **是否可以访问旧值**：
   - `watch`：可以访问 `oldValue`
   - `watchEffect`：不能访问旧值

3. **应用场景**：
   - `watch`：需要明确知道依赖源,需要旧值对比
   - `watchEffect`：依赖源不确定,只关心副作用

医疗场景：

```typescript
const patient = reactive({
  name: '张三',
  vitals: { heartRate: 75 }
})

// watch：显式声明依赖,可以访问旧值
watch(() => patient.vitals.heartRate, (newVal, oldVal) => {
  console.log(`心率变化：${oldVal} → ${newVal}`)
})

// watchEffect：自动收集依赖,立即执行
watchEffect(() => {
  console.log(`患者 ${patient.name} 的心率：${patient.vitals.heartRate}`)
})
```

### toRef / toRefs 实现原理

> **对比 Vue2**：Vue2 没有 `toRef`/`toRefs` API。解构 data 属性时会直接丢失响应性。Vue3 的 `toRef`/`toRefs` 保持与源对象的响应式连接,解决了 Composition API 中的解构响应性丢失问题。

从响应式对象中取出单个属性,保持与源对象的响应式连接。

#### toRef 的四种入参形式与类型判断流程 ⭐

`toRef()` 是一个多态函数,根据传入参数类型的不同,内部会走完全不同的实现路径。理解这套判断流程,是彻底吃透 `toRef` 的关键：

```
toRef(source, key?, defaultValue?)
        │
        ▼
  isRef(source)？
   ├─ 是 → 直接返回 source（已经是 ref，无需二次包装）
   │
   ▼ 否
  isFunction(source)？
   ├─ 是 → new GetterRefImpl(source)（3.3+ getter 函数形式，只读）
   │
   ▼ 否
  isObject(source)？
   ├─ 是 → propertyToRef(source, key, defaultValue)（对象属性形式，最常用）
   │        │
   │        ▼
   │      source[key] 本身是 ref？
   │        ├─ 是 → 直接返回该 ref（避免重复包装）
   │        └─ 否 → new ObjectRefImpl(source, key, defaultValue)
   │
   ▼ 否（基本类型值）
  ref(source)（3.4+ 兜底：普通值直接包装成 ref）
```

**四种调用形式对照表**：

| 调用形式 | 示例 | 内部实现 | 是否只读 |
|---------|------|---------|---------|
| 已是 ref | `toRef(existingRef)` | 原样返回 | 取决于原 ref |
| getter 函数(3.3+) | `toRef(() => state.count * 2)` | `GetterRefImpl` | ✅ 只读 |
| 响应式对象属性 | `toRef(state, 'count')` | `ObjectRefImpl` | ❌ 可写 |
| 普通值(3.4+) | `toRef(10)` | `ref(10)` | ❌ 可写 |

医疗场景对照示例：

```typescript
import { reactive, ref, toRef, isRef } from 'vue'

const patient = reactive({
  name: '张三',
  age: 45
})
const existingRef = ref(100)

// 形式 1：已经是 ref，原样返回
const r1 = toRef(existingRef)
console.log(r1 === existingRef) // true

// 形式 2：getter 函数（3.3+），只读，无法修改
const r2 = toRef(() => patient.name + '(只读视图)')
console.log(r2.value) // 张三(只读视图)
// r2.value = 'xxx' // ❌ 运行时会警告：不可修改

// 形式 3：响应式对象属性，双向绑定
const r3 = toRef(patient, 'age')
r3.value = 46 // ✅ 同步修改 patient.age

// 形式 4：普通值（3.4+），等价于 ref()
const r4 = toRef(10)
console.log(isRef(r4)) // true
```

**ObjectRefImpl 类**：

```typescript
class ObjectRefImpl<T extends object, K extends keyof T> {
  public readonly __v_isRef = true

  constructor(
    private readonly _object: T,
    private _key: K,
    private readonly _defaultValue?: T[K]
  ) {}

  get value() {
    const val = this._object[this._key]
    return val === undefined ? this._defaultValue : val
  }

  set value(newValue) {
    this._object[this._key] = newValue // 📚 知识点：通过代理转发,保持响应式连接
  }
}

function propertyToRef(source: Record<string, any>, key: string, defaultValue?: unknown): any {
  const val = source[key]
  return isRef(val) ? val : new ObjectRefImpl(source, key, defaultValue)
}
```

**GetterRefImpl 类**(函数形式的 toRef)：

```typescript
class GetterRefImpl<T> {
  public readonly __v_isRef = true
  public readonly __v_isReadonly = true

  constructor(private readonly _getter: () => T) {}

  get value() {
    return this._getter()
  }
}

export const toRef = (
  source: Record<string, any> | any,
  key?: string,
  defaultValue?: unknown
) => {
  if (isRef(source)) {
    return source
  } else if (isFunction(source)) {
    return new GetterRefImpl(source)
  } else if (isObject(source)) {
    return propertyToRef(source, key, defaultValue)
  } else {
    return ref(source)
  }
}
```

**toRefs 实现**：

```typescript
export const toRefs = (object: Record<string, any>) => {
  const ret: any = isArray(object) ? new Array(object.length) : {}
  for (const key in object) {
    ret[key] = propertyToRef(object, key)
  }
  return ret
}
```

**proxyRefs 实现**(自动解包)：

```typescript
export const proxyRefs = <T extends object>(objectWithRefs: T) => {
  return new Proxy(objectWithRefs, {
    get(target, key, receiver) {
      return unref(Reflect.get(target, key, receiver)) // 自动解包
    },
    set(target, key, value, receiver) {
      const oldValue = target[key]
      if (isRef(oldValue) && !isRef(value)) {
        oldValue.value = value // 自动添加 .value
        return true
      } else {
        return Reflect.set(target, key, value, receiver)
      }
    }
  })
}

export const unref = <T>(ref: MaybeRef<T>): T => isRef(ref) ? ref.value : ref
```

医疗场景：

```typescript
const patient = reactive({
  name: '张三',
  age: 30
})

// toRef：取出单个属性
const nameRef = toRef(patient, 'name')
nameRef.value = '李四' // ✅ 同步修改 patient.name

// toRefs：解构后保持响应性
const { name, age } = toRefs(patient)
name.value = '王五' // ✅ 同步修改 patient.name

// proxyRefs：自动解包(Vue 3 模板编译器内部使用)
const state = proxyRefs(toRefs(patient))
console.log(state.name) // ✅ 自动解包,不需要 .value
state.name = '赵六' // ✅ 自动添加 .value
```

### watchEffect 完整实现：unwatch 与副作用清理

**watchEffect 完整实现**：

```typescript
export const watchEffect = (
  effect: WatchEffect, 
  options?: WatchOptionsBase
): WatchStopHandle => {
  return doWatch(effect, null, options) // cb 为 null
}

// watch 和 watchEffect 底层都走 doWatch
function doWatch(
  source: WatchSource | WatchSource[] | WatchEffect | object,
  cb: WatchCallback | null,
  { deep, immediate }: WatchOptions = {}
): WatchStopHandle {
  // ...
  
  // cleanup 副作用清理机制
  let cleanup: (() => void) | undefined
  const onCleanup: OnCleanup = (fn: () => void) => {
    cleanup = () => {
      fn() // 执行用户传入的清理函数
      cleanup = undefined // 重置清除函数
    }
  }

  const job = () => {
    if (cb) {
      // watch(source, cb)
      const newValue = effect.run()
      // 📚 知识点：执行回调前，先调用上一次的清理操作
      if (cleanup) {
        cleanup()
      }
      cb(newValue, oldValue, onCleanup)
      oldValue = newValue
    } else {
      // watchEffect
      effect.run()
    }
  }

  const effect = new ReactiveEffect(getter, job)

  if (cb) {
    // watch
    if (immediate) {
      job()
    } else {
      oldValue = effect.run()
    }
  } else {
    // 📚 知识点：watchEffect 立即执行
    effect.run()
  }

  // 📚 知识点：返回 unwatch 停止函数
  const unwatch: WatchStopHandle = () => {
    effect.stop()
  }
  return unwatch
}
```

医疗场景示例：

```typescript
const patientId = ref('P001')

// unwatch 示例
const unwatch = watchEffect(() => {
  console.log('监控患者:', patientId.value)
})

setTimeout(() => {
  unwatch() // 停止监控
  patientId.value = 'P002' // 不再触发 watchEffect
}, 3000)
```

#### cleanup 副作用清理机制：解决异步请求竞态问题 ⭐

**为什么需要 cleanup？**

在异步场景中，特别是搜索联想、实时查询这类高频触发的场景，会出现**请求竞态**问题：第一次请求比第二次请求慢，导致第一次的结果覆盖了第二次的正确结果。

**经典竞态场景：药品搜索**

```typescript
import { ref, watch } from 'vue'

const searchKeyword = ref('')
const resultList = ref([])

// ❌ 问题场景：请求竞态
watch(searchKeyword, async (keyword) => {
  const result = await searchDrug(keyword)
  // 如果上一次请求比这一次慢,会覆盖这次的结果
  resultList.value = result.data
})

// 触发场景：
// 1. 用户输入 "阿莫" → 发起请求 A（耗时 2000ms）
// 2. 用户删除，输入 "布洛" → 发起请求 B（耗时 500ms）
// 3. 请求 B 先返回，resultList = 布洛芬相关数据 ✅
// 4. 请求 A 后返回，resultList = 阿莫西林相关数据 ❌（错误覆盖）
```

**✅ 解决方案 1：onCleanup 标记取消**

```typescript
import { ref, watch } from 'vue'

const searchKeyword = ref('')
const resultList = ref([])

watch(searchKeyword, async (keyword, oldValue, onCleanup) => {
  let cancelled = false
  
  // 📚 知识点：onCleanup 在下一次 watch 触发前执行
  onCleanup(() => {
    cancelled = true // 标记取消
  })
  
  const result = await searchDrug(keyword)
  
  // 📚 知识点：只有最新的请求才会更新 resultList
  if (!cancelled) {
    resultList.value = result.data
  }
})

// 执行流程：
// 1. 输入 "阿莫" → 请求 A 开始，cancelled_A = false
// 2. 输入 "布洛" → 触发 cleanup，cancelled_A = true，请求 B 开始，cancelled_B = false
// 3. 请求 B 返回 → cancelled_B 仍为 false，更新 resultList ✅
// 4. 请求 A 返回 → cancelled_A 已为 true，不更新 resultList ✅
```

**✅ 解决方案 2：AbortController 真实取消**

```typescript
import { ref, watch } from 'vue'

const searchKeyword = ref('')
const resultList = ref([])

watch(searchKeyword, async (keyword, oldValue, onCleanup) => {
  const controller = new AbortController()
  
  // 📚 知识点：onCleanup 中真正取消请求
  onCleanup(() => {
    controller.abort() // 中止上一次的请求
  })
  
  try {
    const result = await fetch(`/api/drugs?q=${keyword}`, {
      signal: controller.signal
    })
    const data = await result.json()
    resultList.value = data
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('请求已取消')
    }
  }
})
```

**完整的医疗场景实战：患者病历实时搜索**

```typescript
import { ref, watch } from 'vue'

const patientSearchKeyword = ref('')
const patientList = ref([])
const isSearching = ref(false)
const searchError = ref('')

// 模拟 API 调用
async function searchPatientRecords(keyword: string, signal: AbortSignal) {
  const response = await fetch(`/api/patients/search?q=${keyword}`, { signal })
  if (!response.ok) throw new Error('搜索失败')
  return response.json()
}

watch(
  patientSearchKeyword,
  async (keyword, oldKeyword, onCleanup) => {
    // 清空错误
    searchError.value = ''
    
    // 关键词为空，清空结果
    if (!keyword.trim()) {
      patientList.value = []
      return
    }
    
    // 设置加载状态
    isSearching.value = true
    
    // 创建 AbortController
    const controller = new AbortController()
    
    // 📚 知识点：cleanup 时取消上一次请求
    onCleanup(() => {
      controller.abort()
      isSearching.value = false
    })
    
    try {
      // 防抖：延迟 300ms 再发起请求
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // 检查是否已被取消
      if (controller.signal.aborted) return
      
      // 发起搜索请求
      const result = await searchPatientRecords(keyword, controller.signal)
      
      // 更新结果
      patientList.value = result.data
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('搜索被取消:', keyword)
      } else {
        searchError.value = error.message
      }
    } finally {
      isSearching.value = false
    }
  },
  { immediate: false }
)

// Vue 组件中使用
// <template>
//   <div>
//     <input v-model="patientSearchKeyword" placeholder="搜索患者姓名/病历号" />
//     <div v-if="isSearching">搜索中...</div>
//     <div v-if="searchError" class="error">{{ searchError }}</div>
//     <ul>
//       <li v-for="patient in patientList" :key="patient.id">
//         {{ patient.name }} - {{ patient.id }}
//       </li>
//     </ul>
//   </div>
// </template>
```

**Vue 2 中的竞态问题处理（对比）**：

Vue 2 没有内置的 onCleanup 机制，需要手动实现闭包标记：

```javascript
// Vue 2 中清理接口返回第一次比第二次慢的问题
let timer = 4000
const getData = async (params) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(params)
    }, timer -= 2000)
  })
}

const arr = []
const get = async (data) => {
  // 第二次的会将第一次的 flag 变为 false
  let flag = true

  // 📚 知识点：循环取出前面的 () => flag = false 执行
  while (arr.length) {
    const cb = arr.shift()
    cb()
  }
  // 📚 知识点：将修改 flag 的操作放入 arr 数组中,形成一个闭包,等待下一次执行
  arr.push(() => flag = false)

  // 获取接口返回的数据
  const res = await getData(data)
  console.log(data, flag)
  // 判断 flag 值,如果为 true 则展示数据
  if (flag) {
    console.log(res) // 模拟展示到页面
  }
}

get('1') // 请求耗时 4s
get('2') // 请求耗时 2s
// 输出：
// 2 true（get 2 先返回,flag 为 true,展示数据）
// 1 false（get 1 后返回,flag 已被标记为 false,不展示数据）
```

**核心对比**：

| 特性 | Vue 2 | Vue 3 |
|------|-------|-------|
| 清理机制 | 手动闭包 + 数组管理 | 内置 onCleanup |
| 请求取消 | 需手动封装 | 原生支持 AbortController |
| 代码复杂度 | 高（需理解闭包原理） | 低（框架提供 API） |
| 易错性 | 容易遗漏清理逻辑 | 框架强制引导正确使用 |

**cleanup 使用场景总结**：

1. **异步请求取消**：搜索联想、实时查询、分页加载
2. **定时器清理**：轮询、倒计时、动画帧
3. **事件监听解绑**：DOM 事件、WebSocket、EventSource
4. **第三方库实例销毁**：地图实例、图表实例、编辑器实例

```typescript
// 示例：监控患者生命体征，每 5 秒刷新一次
const patientId = ref('P001')

watchEffect((onCleanup) => {
  const timer = setInterval(() => {
    console.log('刷新患者', patientId.value, '的生命体征数据')

> **对比 Vue2**：Vue2 没有 `toRaw`/`markRaw` API。Vue3 新增这两个 API,`toRaw` 用于获取原始对象避免 Proxy 开销,`markRaw` 用于标记对象永不转为响应式(如第三方库实例)。
  }, 5000)
  
  // 📚 知识点：watchEffect 停止时或 patientId 变化时，清除定时器
  onCleanup(() => {
    clearInterval(timer)
  })
})
```

### toRaw() / markRaw() 实现原理

**toRaw()**：通过 WeakMap 反查获取原始对象。

```typescript
export const toRaw = <T>(observed: T): T => {
  const raw = observed && (observed as Target)[ReactiveFlags.RAW]
  // 📚 知识点：如果对象被代理了,通过 RAW 标记获取原始对象
  return raw ? toRaw(raw) : observed
}
```

**markRaw()**：添加 `__v_skip` 标记,跳过响应式转换。

```typescript
export const markRaw = <T extends object>(value: T): Raw<T> => {
  def(value, ReactiveFlags.SKIP, true) // 添加 __v_skip 标记
  return value
}

// 在 createReactiveObject 中检查
const createReactiveObject = (target: any) => {
  // 📚 知识点：标记了 SKIP 的对象,跳过响应式转换
  if (target[ReactiveFlags.SKIP]) {
    return target
  }
  // ... 正常代理流程
}
```

医疗场景：

```typescript
import { reactive, markRaw } from 'vue'

// 第三方库实例(医学影像渲染引擎)不需要响应式
const imageEngine = markRaw(new MedicalImageEngine())

// 静态配置(药品字典)不需要响应式
const drugDict = markRaw([
  { id: 1, name: '阿莫西林' },
  { id: 2, name: '布洛芬' }
])

const store = reactive({
  drugDict, // 不会被响应式代理
  imageEngine // 不会被响应式代理
})

// 使用场景：深拷贝、序列化
const raw = toRaw(store)
const copy = JSON.parse(JSON.stringify(raw))
```

### 工具函数实现原理

检查内部标记(`__v_isReactive` / `__v_isRef` / `__v_isReadonly`)。

```typescript
// isReactive
export const isReactive = (value: unknown): boolean => {
  return !!(value && value[ReactiveFlags.IS_REACTIVE])
}

// isReadonly
export const isReadonly = (value: unknown): boolean => {
  return !!(value && value[ReactiveFlags.IS_READONLY])
}

// isRef
export function isRef(r: any): r is Ref {
  return !!(r && r.__v_isRef === true)
}


> **对比 Vue2**：Vue2 只能代理普通对象和数组,无法代理 Map/Set/WeakMap/WeakSet。Vue3 通过 `collectionHandlers` 实现对 Collection 类型的完整支持,拦截 get/set/add/delete/forEach 等方法。
// isProxy
export const isProxy = (value: unknown): boolean => {
  return isReactive(value) || isReadonly(value)
}

// toValue(3.3+)
export function toValue<T>(source: any): T {
  return isFunction(source) ? source() : unref(source)
}
```

### Collection 类型响应式原理

Map/Set 无法用 `baseHandlers` 处理(方法调用而非属性访问),需要单独的 `collectionHandlers`。

**为什么需要单独处理？**

```typescript
const map = reactive(new Map([
  ['内科', ['张医生', '王医生']]
]))

// ❌ 错误：Map 的方法调用不走 get/set 拦截器
map.get('内科') // 这里走的是 map.get 方法的内部逻辑

// ✅ 正确：需要拦截 get 方法,在方法内部手动 track
```

**collectionHandlers 实现**：

```typescript
// 拦截 Map 的方法
const mutableCollectionHandlers = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    
    // 拦截 size 属性
    if (key === 'size') {
      track(target, TrackOpTypes.ITERATE, ITERATE_KEY)
      return Reflect.get(target, key, target)
    }
    
    // 📚 知识点：拦截 Map 的方法调用
    if (hasOwn(target, key)) {
      return function(...args) {
        const result = Reflect.get(target, key, target).apply(target, args)
        if (isObject(result)) {
          return reactive(result) // 返回响应式结果
        }
        return result
      }
    }
    
    return Reflect.get(target, key, receiver)
  }
}

// 重写 set 方法,手动 track/trigger
const set = function(target, key, value) {
  const hadKey = target.has(key)
  const oldValue = target.get(key)
  target.set(key, value)
  if (!hadKey) {
    trigger(target, TriggerOpTypes.ADD, key, value)
  } else if (hasChanged(value, oldValue)) {
    trigger(target, TriggerOpTypes.SET, key, value, oldValue)
  }
  return this
}

// 重写 delete 方法
const delete = function(target, key) {
  const hadKey = target.has(key)
  const result = target.delete(key)
  if (hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key)
  }
  return result
}
```

**Set 的 add 方法**：

```typescript
const add = function(target, value) {
  const hadKey = target.has(value)
  target.add(value)
  if (!hadKey) {
    trigger(target, TriggerOpTypes.ADD, value)
  }
  return this
}
```

医疗场景实战：科室 → 医生列表索引缓存

```typescript
// 比数组 find 性能更优：Map 查找是 O(1)
const departmentIndex = reactive(new Map([
  ['内科', { doctors: ['张医生', '王医生'], head: '张医生' }],
  ['外科', { doctors: ['赵医生', '钱医生'], head: '赵医生' }]
]))

effect(() => {
  console.log('科室数量：', departmentIndex.size) // ✅ 追踪 size
  console.log('内科医生：', departmentIndex.get('内科')?.doctors)
})

// ✅ 响应式更新
departmentIndex.set('儿科', { doctors: ['刘医生'], head: '刘医生' })
departmentIndex.delete('外科')
```

### collectionHandlers 完整源码解析 ⭐

上面只看到了 `get` / `set` / `delete` / `add` 的骨架实现，真实的 Vue 3.4 源码中，`collectionHandlers` 还需要处理 `forEach`、迭代器（`keys`/`values`/`entries`/`Symbol.iterator`）、`clear`、`has` 等一整套方法拦截。这一整套实现比 `baseHandlers` 复杂得多，因为 Map/Set 的所有操作都是**方法调用**而非属性访问。

**完整方法拦截清单**：

```typescript
// 📚 知识点：完整的 collectionHandlers 需要拦截的方法分类
// 1. 读取类：get / has / size
// 2. 写入类：set / add / delete / clear
// 3. 遍历类：forEach / keys / values / entries / Symbol.iterator
```

**1. has 方法拦截**：

```typescript
function has(this: MapTypes, key: unknown, isReadonly = false): boolean {
  const target = (this as any)[ReactiveFlags.RAW]
  const rawTarget = toRaw(target)
  const rawKey = toRaw(key)
  if (key !== rawKey) {
    !isReadonly && track(rawTarget, TrackOpTypes.HAS, key)
  }
  !isReadonly && track(rawTarget, TrackOpTypes.HAS, rawKey)
  return key === rawKey
    ? target.has(key)
    : target.has(key) || target.has(rawKey)
}
```

**2. size 属性拦截**（通过 getter 定义，需要拦截 ITERATE_KEY）：

```typescript
function size(target: IterableCollections, isReadonly = false) {
  target = (target as any)[ReactiveFlags.RAW]
  // 📚 知识点：size 依赖整个集合的结构变化(ADD/DELETE/CLEAR)，
  // 用 ITERATE_KEY 作为统一的追踪 key
  !isReadonly && track(toRaw(target), TrackOpTypes.ITERATE, ITERATE_KEY)
  return Reflect.get(target, 'size', target)
}
```

**3. clear 方法**：

```typescript
function clear(this: IterableCollections & ClearMethod) {
  const target = toRaw(this)
  const hadItems = target.size !== 0
  // 📚 知识点：clear 前先拍一张快照(oldTarget)，用于 devtools 展示变化前后的数据
  const oldTarget = __DEV__
    ? isMap(target) ? new Map(target) : new Set(target)
    : undefined
  const result = target.clear()
  if (hadItems) {
    // 📚 知识点：clear 触发的是 CLEAR 类型，会让所有依赖该集合的 effect 全部重新执行
    trigger(target, TriggerOpTypes.CLEAR, undefined, undefined, oldTarget)
  }
  return result
}
```

**4. forEach 方法**（核心难点：内部回调也要用响应式包装）：

```typescript
function createForEach(isReadonly: boolean, isShallow: boolean) {
  return function forEach(
    this: IterableCollections,
    callback: Function,
    thisArg?: unknown
  ) {
    const observed = this as any
    const target = observed[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
    // 📚 知识点：forEach 遍历整个集合，等价于访问了所有 key，用 ITERATE_KEY 统一追踪
    !isReadonly && track(rawTarget, TrackOpTypes.ITERATE, ITERATE_KEY)
    return target.forEach((value: unknown, key: unknown) => {
      // 📚 知识点：callback 内部拿到的 value/key 也必须是响应式包装后的
      return callback.call(thisArg, wrap(value), wrap(key), observed)
    })
  }
}
```

**5. 迭代器方法**（keys / values / entries / Symbol.iterator）：

```typescript
function createIterableMethod(
  method: string | symbol,
  isReadonly: boolean,
  isShallow: boolean
) {
  return function (
    this: IterableCollections,
    ...args: unknown[]
  ): Iterable & Iterator {
    const target = (this as any)[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const targetIsMap = isMap(rawTarget)
    const isPair =
      method === 'entries' || (method === Symbol.iterator && targetIsMap)
    const isKeyOnly = method === 'keys' && targetIsMap
    // 📚 知识点：原始迭代器
    const innerIterator = target[method](...args)
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
    !isReadonly &&
      track(
        rawTarget,
        TrackOpTypes.ITERATE,
        isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY
      )
    // 📚 知识点：返回一个新的迭代器，包装 done/value，确保 value 是响应式的
    return {
      next() {
        const { value, done } = innerIterator.next()
        return done
          ? { value, done }
          : {
              value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
              done
            }
      },
      [Symbol.iterator]() {
        return this
      }
    }
  }
}
```

**6. 完整的 mutableCollectionHandlers 组装**：

```typescript
function createInstrumentations() {
  const mutableInstrumentations: Record<string, Function | number> = {
    get(this: MapTypes, key: unknown) {
      return get(this, key)
    },
    get size() {
      return size(this as unknown as IterableCollections)
    },
    has,
    add,
    set,
    delete: deleteEntry,
    clear,
    forEach: createForEach(false, false)
  }

  // 📚 知识点：keys/values/entries/Symbol.iterator 统一走 createIterableMethod
  const iteratorMethods = [
    'keys',
    'values',
    'entries',
    Symbol.iterator
  ] as const
  iteratorMethods.forEach(method => {
    mutableInstrumentations[method as string] = createIterableMethod(
      method,
      false,
      false
    )
  })

  return mutableInstrumentations
}

const mutableInstrumentations = createInstrumentations()

export const mutableCollectionHandlers: ProxyHandler<CollectionTypes> = {
  get: createInstrumentationGetter(false, false)
}

function createInstrumentationGetter(isReadonly: boolean, shallow: boolean) {
  const instrumentations = mutableInstrumentations

  return (
    target: CollectionTypes,
    key: string | symbol,
    receiver: CollectionTypes
  ) => {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.RAW) {
      return target
    }

    // 📚 知识点：优先从 instrumentations 中找拦截后的方法，找不到再走原生方法
    return Reflect.get(
      hasOwn(instrumentations, key) && key in target
        ? instrumentations
        : target,
      key,
      receiver
    )
  }
}
```

**核心设计要点总结**：

| 方法类别 | 拦截方式 | 依赖追踪 key | 触发类型 |
|---------|---------|-------------|---------|
| `get(key)` | 手动 track | 具体的 key | - |
| `has(key)` | 手动 track | 具体的 key | - |
| `size` | getter 拦截 | `ITERATE_KEY` | - |
| `set(key, value)` | 方法重写 | - | `ADD` / `SET` |
| `add(value)` | 方法重写 | - | `ADD` |
| `delete(key)` | 方法重写 | - | `DELETE` |
| `clear()` | 方法重写 | - | `CLEAR`(触发所有 effect) |
| `forEach()` | 方法重写 + 内部 wrap | `ITERATE_KEY` | - |
| `keys()`(Map) | 迭代器包装 | `MAP_KEY_ITERATE_KEY` | - |
| `values()`/`entries()` | 迭代器包装 | `ITERATE_KEY` | - |

**为什么 `keys()` 要单独用 `MAP_KEY_ITERATE_KEY`？**

因为 Map 的 `keys()` 只关心 key 的增删，不关心 value 的变化：

```typescript
const map = reactive(new Map([['内科', '张医生']]))

effect(() => {
  // 这个 effect 只依赖 key 的变化，用 MAP_KEY_ITERATE_KEY 追踪
  console.log([...map.keys()])
})

map.set('内科', '王医生') // ❌ 不触发上面的 effect（key 没变，只是 value 变了）
map.set('外科', '赵医生') // ✅ 触发上面的 effect（新增了 key）
```

医疗场景实战：科室医生数量统计面板

```typescript
import { reactive, effect } from 'vue'

const departmentIndex = reactive(new Map([
  ['内科', ['张医生', '王医生']],
  ['外科', ['赵医生']]
]))

// forEach 遍历，统计每个科室的医生数量
effect(() => {
  console.log('=== 科室医生数量统计 ===')
  departmentIndex.forEach((doctors, department) => {
    console.log(`${department}：${doctors.length} 人`)
  })
})

// entries 遍历，用于生成报表
effect(() => {
  const report = [...departmentIndex.entries()]
    .map(([dept, doctors]) => `${dept}(${doctors.length})`)
    .join(', ')
  console.log('报表：', report)
})

// keys 遍历，只关心科室列表（不关心医生变化）
effect(() => {
  console.log('科室列表：', [...departmentIndex.keys()])
})

departmentIndex.get('内科').push('李医生') // 触发 forEach/entries 的 effect，不触发 keys 的 effect
departmentIndex.set('儿科', ['刘医生']) // 触发所有三个 effect（新增了 key）
```

### effectScope 原理(3.2+)

> **对比 Vue2**：Vue2 没有 `effectScope` API,需要手动逐个调用 unwatch 停止副作用。Vue3.2+ 新增 `effectScope`,通过 `scope.run()` 收集副作用,`scope.stop()` 一次性批量停止,Pinia Store 底层依赖此机制。

批量收集一组 effect,一次性停止。Pinia 的 Store 实例、组件卸载底层依赖。

**为什么需要 effectScope？**

```typescript
// ❌ 手动逐个清理
const unwatch1 = watchEffect(() => {})
const unwatch2 = watchEffect(() => {})
const unwatch3 = watchEffect(() => {})

// 组件卸载时需要手动调用三个 unwatch
unwatch1()
unwatch2()
unwatch3()

// ✅ effectScope：一次停止
const scope = effectScope()

scope.run(() => {
  watchEffect(() => {})
  watchEffect(() => {})
  watchEffect(() => {})
})

// 组件卸载时一次性停止
scope.stop()
```

**EffectScope 实现**：

```typescript
export class EffectScope {
  private _active = true
  private _effects: ReactiveEffect[] = []
  private _cleanups: (() => void)[] = []
  private _parent: EffectScope | null = null

  constructor(detached = false) {
    if (!detached && activeEffectScope) {
      this._parent = activeEffectScope
    }
  }

  run<T>(fn: () => T): T | undefined {
    if (this._active) {
      const currentScope = activeEffectScope
      try {
        activeEffectScope = this // 设置当前作用域
        return fn()
      } finally {
        activeEffectScope = currentScope
      }
    }
  }

  stop() {
    if (this._active) {
      // 停止所有收集的 effect
      for (let i = 0; i < this._effects.length; i++) {
        this._effects[i].stop()
      }
      // 执行所有清理函数
      for (let i = 0; i < this._cleanups.length; i++) {
        this._cleanups[i]()
      }
      this._active = false
    }
  }
}

// 在 ReactiveEffect 构造时,如果存在 activeEffectScope,自动收集
export class ReactiveEffect {
  constructor(fn: Function, scheduler?: Function) {
    if (activeEffectScope) {
      activeEffectScope._effects.push(this) // 📚 自动收集到当前作用域
    }
  }
}
```

**应用场景**：

```typescript
// 组件生命周期内的所有 watcher 自动收集
export default {
  setup() {
    const scope = effectScope()

    scope.run(() => {
      // 这些 watcher 都会被 scope 收集
      watchEffect(() => {})
      watch(() => state.count, () => {})
      computed(() => state.count * 2)
    })

    onUnmounted(() => {
      scope.stop() // 一次性清理所有
    })
  }
}
```

### Proxy 的局限性与特殊处理

**1. 无法代理 Date、RegExp、Promise 等内置对象**

```typescript
// ❌ 无法直接代理 Date
const date = reactive(new Date())
date.setFullYear(2020) // ❌ 不会触发响应式(方法调用绕过了代理)

// ✅ 正确做法：包装成 ref
const date = ref(new Date())
date.value.setFullYear(2020) // ✅ 整体替换时触发更新

// 或者使用 computed 派生新值
const dateString = computed(() => date.value.toLocaleDateString())
```

**2. 兼容性问题：IE11 无法 polyfill**

Proxy 是 ES6 语言层面的新特性,不是普通 API,无法通过 polyfill 实现。这就是 Vue 3 放弃 IE11 支持的底层原因。

**3. 函数类型支持**

```typescript
// ✅ 函数也可以被 reactive 代理
const fn = reactive(() => {
  console.log('函数')
})

// 但函数内部的 this 绑定有坑,建议用 ref
const fnRef = ref(() => {
  console.log('函数')
})
```

**4. 性能开销对比**

| 场景 | Object.defineProperty | Proxy |
|------|----------------------|-------|
| 初始化 | 递归遍历所有属性,一次性代理 | 惰性代理,访问时才代理 |
| 新增属性 | 不支持 | 原生支持 |
| 数组 | 重写 7 个方法 | 原生支持 |
| 嵌套对象 | 一次性全部代理 | 惰性递归 |

### 💬 面试官视角

**Q1：track / trigger 的三层依赖存储结构是什么样的？**

✅ **标准答案**：
`targetMap`(WeakMap)→ `depsMap`(Map)→ `dep`(Set/Map)。
- `targetMap`：key 是响应式对象,value 是 depsMap
- `depsMap`：key 是属性名,value 是 dep
- `dep`：包含所有依赖该属性的 effect

🎁 **加分点**：
- `targetMap` 用 WeakMap 是为了防止内存泄漏(原始对象被 GC 时自动清理)
- `dep` 用 Map 存储 `effect → trackId`,trackId 用于分支切换的 cleanup 判断
- `createDep` 中的 `cleanup` 回调用于清理空的 dep

**Q2：computed 的缓存是怎么实现的？dirty 标记的作用是什么？**

✅ **标准答案**：
`ComputedRefImpl` 内部维护 `dirty` 标记。依赖变化时只标记 `dirty = true`,真正访问 `value` 时才重新计算,多次访问直接返回缓存值。

🎁 **加分点**：
- `dirty` 是 `_dirtyLevel` 的简写,完整实现有 5 个级别(NotDirty → Dirty)
- 依赖变化触发的是 computed 的 scheduler,而不是直接执行
- computed 本身也是一个 effect,可以被其他 effect 依赖

**Q3：响应式系统是如何支持 Map/Set 的？和普通对象的代理方式有什么不同？**

✅ **标准答案**：
普通对象用 `baseHandlers`(拦截 get/set),Map/Set 用 `collectionHandlers`(拦截方法调用,手动 track/trigger)。

🎁 **加分点**：
- Map 的 `size` 属性需要特殊处理(拦截 `ITERATE` 操作)
- `map.get(key)` 返回的嵌套对象需要转成响应式
- `set` / `add` / `delete` 等方法都需要手动 trigger

**Q4：effectScope 解决了什么问题？和手动逐个清理 effect 相比有什么优势？**

✅ **标准答案**：
批量收集一组 effect,通过 `scope.stop()` 一次性停止。避免手动逐个调用 unwatch。

🎁 **加分点**：
- Pinia 的 Store 实例底层依赖 effectScope
- 组件卸载时的自动清理机制
- `scope.run()` 内创建的响应式副作用自动收集

## 📖 四、Vue 3.4 源码解析：从 GitHub 仓库看实际实现

> 本章基于 Vue 3.4 源码,仓库地址：`https://github.com/vuejs/core`。核心文件位于 `packages/reactivity/src/` 目录。

### reactive 源码

**文件路径**：`packages/reactivity/src/reactive.ts`

```typescript
// 缓存代理对象,避免重复创建
const reactiveMap = new WeakMap<Target, any>()
const shallowReactiveMap = new WeakMap<Target, any>()
const readonlyMap = new WeakMap<Target, any>()
const shallowReadonlyMap = new WeakMap<Target, any>()

// 统一入口
function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<Target, any>
) {
  if (!isObject(target)) {
    if (__DEV__) {
      console.warn(`value cannot be made reactive: ${String(target)}`)
    }
    return target
  }
  
  // 已经是代理对象,且只读状态一致时,直接返回
  if (
    target[ReactiveFlags.RAW] &&
    !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
  ) {
    return target
  }
  
  // 标记了 SKIP 的对象,跳过
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  
  // 📚 知识点：区分对象类型和 Collection 类型
  const targetType = getTargetType(target)
  if (targetType === TargetType.INVALID) {
    return target
  }
  
  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
  )
  proxyMap.set(target, proxy)
  return proxy
}

export function reactive<T extends object>(target: T): UnwrapNestedRefs<T> {
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap
  )
}
```

**核心要点**：
1. 四个 WeakMap 分别缓存四种代理类型(reactive / shallowReactive / readonly / shallowReadonly)
2. `ReactiveFlags.RAW` 判断是否已是代理
3. `getTargetType()` 区分普通对象和 Collection 类型
4. 惰性递归：嵌套对象在 get 时才代理

### baseHandlers 源码

**文件路径**：`packages/reactivity/src/baseHandlers.ts`

```typescript
class BaseReactiveHandler implements ProxyHandler<Target> {
  constructor(
    protected readonly _isReadonly = false,
    protected readonly _shallow = false
  ) {}

  get(target: Target, key: string | symbol, receiver: object) {
    const isReadonly = this._isReadonly
    const shallow = this._shallow
    
    // 📚 知识点：拦截响应式标记
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.RAW) {
      // 📚 知识点：toRaw 的实现基础
      return target
    }
    
    const targetIsArray = isArray(target)
    
    // 📚 知识点：拦截数组方法
    if (!isReadonly) {
      if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
        return Reflect.get(arrayInstrumentations, key, receiver)
      }
      if (key === 'hasOwnProperty') {
        return hasOwnProperty
      }
    }
    
    // 收集依赖
    const res = Reflect.get(target, key, receiver)
    
    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res
    }
    
    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key)
    }
    
    if (shallow) {
      return res
    }
    
    // 📚 知识点：惰性递归代理
    if (isRef(res)) {
      return targetIsArray && isIntegerKey(key) ? res : res.value
    }
    
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }
    
    return res
  }
}
```

**核心要点**：
1. `BaseReactiveHandler` 用 `_isReadonly` / `_shallow` 两个参数派生四种处理器
2. 数组方法需要 `arrayInstrumentations` 特殊处理
3. `Reflect.get` 的第三个参数 `receiver` 保证 `this` 正确

### ref 源码

**文件路径**：`packages/reactivity/src/ref.ts`

```typescript
export class RefImpl<T> {
  private _value: T
  private _rawValue: T

  public readonly __v_isRef = true
  public readonly __v_isShallow: boolean
  public dep?: Dep = undefined

  constructor(value: T, __v_isShallow: boolean) {
    this._rawValue = __v_isShallow ? value : toRaw(value)
    this._value = __v_isShallow ? value : toReactive(value)
    this.__v_isShallow = __v_isShallow
  }

  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newVal) {
    const useDirectValue =
      this.__v_isShallow || isShallow(newVal) || isReadonly(newVal)
    newVal = useDirectValue ? newVal : toRaw(newVal)
    
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal
      this._value = useDirectValue ? newVal : toReactive(newVal)
      triggerRefValue(this)
    }
  }
}

export function toReactive<T extends unknown>(value: T): T {
  return isObject(value) ? reactive(value) : value
}
```

**核心要点**：
1. `_rawValue` 存储原始值,`_value` 存储响应式值
2. `hasChanged` 用 `Object.is` 判断变化
3. 对象类型的 ref 内部调用 `reactive()`

### 依赖收集与派发源码

**文件路径**：`packages/reactivity/src/effect.ts`

```typescript
// 全局 targetMap：三层依赖存储
const targetMap = new WeakMap<any, DepsMap>()

export function track(target: object, type: TrackOpTypes, key: unknown) {
  if (shouldTrack && activeEffect) {
    let depsMap = targetMap.get(target)
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
      depsMap.set(key, (dep = createDep(() => depsMap!.delete(key!))))
    }
    trackEffect(activeEffect, dep, ...)
  }
}

export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
  oldTarget?: Map<unknown, unknown> | Set<unknown>
) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  
  let deps: (Dep | undefined)[] = []
  if (type === TriggerOpTypes.CLEAR) {
    // 收集所有依赖
    deps = [...depsMap.values()]
  } else if (key === 'length' && isArray(target)) {
    // 📚 知识点：数组 length 变化的特殊处理
    depsMap.forEach((dep, key) => {
      if (key === 'length' || key >= (newValue as number)) {
        deps.push(dep)
      }
    })
  } else {
    if (key !== void 0) {
      deps.push(depsMap.get(key))
    }
  }
  
  // 📚 知识点：遍历触发
  for (const dep of deps) {
    if (dep) {
      triggerEffects(dep, ...)
    }
  }
}
```

**核心要点**：
1. `track` 完整实现三层结构
2. `trigger` 支持 `CLEAR` / `length` 等特殊类型
3. 数组 `length` 变化会触发所有下标 >= 新长度的依赖

### computed 源码

**文件路径**：`packages/reactivity/src/computed.ts`

```typescript
export class ComputedRefImpl<T> {
  public dep?: Dep = undefined
  public readonly __v_isRef = true

  private _value!: T
  public readonly effect: ReactiveEffect<T>
  public readonly __v_isReadonly: boolean

  constructor(
    getter: ComputedGetter<T>,
    private readonly _setter: ComputedSetter<T>,
    isReadonly: boolean
  ) {
    this.effect = new ReactiveEffect(getter, () => {
      // 📚 知识点：依赖变化时只标记 dirty
      if (!this._dirty) {
        this._dirty = true
        triggerRefValue(this)
      }
    })
    this.effect.computed = this
    this.effect.active = false // computed 默认不立即执行
    this.__v_isReadonly = isReadonly
  }

  get value() {
    // 📚 知识点：脏标记,缓存的关键
    if (this._dirty) {
      this._value = this.effect.run()!
      this._dirty = false // 标记为不脏
    }
    trackRefValue(this)
    return this._value
  }

  set value(newValue: T) {
    this._setter(newValue)
  }
}
```

**核心要点**：
1. `_dirty` 标记控制是否重新计算
2. computed 的 effect 默认不激活(`active = false`),惰性执行
3. 依赖变化时只标记 dirty,不立即计算

### Collection 类型代理源码

**文件路径**：`packages/reactivity/src/collectionHandlers.ts`

```typescript
function get(target: MapTypes, key: unknown, isReadonly = false, isShallow = false) {
  // 📚 知识点：get 方法手动 track
  if (key === ReactiveFlags.IS_REACTIVE) {
    return !isReadonly
  }
  target = target as any
  const rawTarget = toRaw(target)
  const rawKey = toRaw(key)
  if (key !== rawKey) {
    !isReadonly && track(rawTarget, TrackOpTypes.GET, key)
  }
  !isReadonly && track(rawTarget, TrackOpTypes.GET, rawKey)
  
  const { has } = getProto(rawTarget)
  const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
  if (has.call(rawTarget, key)) {
    return wrap(target.get(key))
  } else if (has.call(rawTarget, rawKey)) {
    return wrap(target.get(rawKey))
  }
}

function set(this: MapTypes, key: unknown, value: unknown) {
  const value = toRaw(value)
  const target = toRaw(this)
  const { has, get } = getProto(target)
  
  let hadKey = has.call(target, key)
  if (!hadKey) {
    key = toRaw(key)
    hadKey = has.call(target, key)
  }
  
  const oldValue = get.call(target, key)
  target.set(key, value)
  
  // 📚 知识点：区分 ADD 和 SET,手动 trigger
  if (!hadKey) {
    trigger(target, TriggerOpTypes.ADD, key, value)
  } else if (hasChanged(value, oldValue)) {
    trigger(target, TriggerOpTypes.SET, key, value, oldValue)
  }
  return this
}

function deleteEntry(this: MapTypes, key: unknown) {
  const target = toRaw(this)
  const { has, get } = getProto(target)
  let hadKey = has.call(target, key)
  if (!hadKey) {
    key = toRaw(key)
    hadKey = has.call(target, key)
  }
  get ? get.call(target, key) : undefined
  const result = target.delete(key)
  if (hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key)
  }
  return result
}
```

**核心要点**：
1. `get` 方法内手动 `track`,支持对象 key
2. `set` 方法区分 `ADD` / `SET` 两种触发类型
3. 返回的嵌套对象通过 `wrap` 转成响应式

### effectScope 源码

**文件路径**：`packages/reactivity/src/effectScope.ts`

```typescript
let activeEffectScope: EffectScope | undefined

export class EffectScope {
  private _active = true
  private _effects: ReactiveEffect[] = []
  private _cleanups: (() => void)[] = []

  constructor(detached = false) {
    if (!detached && activeEffectScope) {
      this.parent = activeEffectScope
    }
    this.scopes = []
  }

  run<T>(fn: () => T): T | undefined {
    if (this._active) {
      const currentEffectScope = activeEffectScope
      try {
        activeEffectScope = this
        return fn()
      } finally {
        activeEffectScope = currentEffectScope
      }
    }
    return undefined
  }

  stop() {
    if (this._active) {
      // 📚 知识点：停止所有收集的 effect
      for (let i = 0; i < this._effects.length; i++) {
        this._effects[i].stop()
      }
      // 执行所有清理函数
      for (let i = 0; i < this._cleanups.length; i++) {
        this._cleanups[i]()
      }
      this._active = false
    }
  }
}

export function effectScope(detached?: boolean) {
  return new EffectScope(detached)
}

export function getCurrentScope() {
  return activeEffectScope
}

export function onScopeDispose(fn: () => void) {
  if (activeEffectScope) {
    activeEffectScope._cleanups.push(fn)
  }
}
```

**核心要点**：
1. `run()` 中设置 `activeEffectScope`,effect 自动收集
2. `stop()` 批量停止,替代手动逐个调用 unwatch
3. `onScopeDispose` 注册清理函数,组件卸载时执行

### 💬 面试官视角

**Q1：Vue 3.4 源码中,四种代理类型是如何统一管理的？**

✅ **标准答案**：
`createReactiveObject` 统一入口,通过参数组合：`isReadonly` + `baseHandlers/collectionHandlers` + `proxyMap`。

🎁 **加分点**：
- `BaseReactiveHandler` 的 `_isReadonly` / `_shallow` 两个参数派生四种处理器
- 四个 WeakMap 分别缓存四种类型
- `getTargetType()` 区分普通对象和 Collection 类型

**Q2：computed 源码中,dirty 标记和缓存是如何配合的？**

✅ **标准答案**：
`ComputedRefImpl` 的 `_dirty` 标记。getter 访问时检查 `_dirty`,为 true 则重新计算并置 false;依赖变化时 scheduler 将 `_dirty` 置 true。

🎁 **加分点**：
- computed 的 effect 默认 `active = false`,实现惰性求值
- scheduler 只标记 dirty,不立即计算
- `effect.computed = this` 让 effect 关联到 computed,实现 dep 链

**Q3：源码中的 arrayInstrumentations 是什么？**

✅ **标准答案**：
对数组方法(includes/indexOf/lastIndexOf 等)的拦截包装,因为数组方法内部通过索引访问元素,需要特殊处理。

🎁 **加分点**：
- `includes` 等方法的 `this` 指向代理,内部 `target[0]` 会走 get 拦截器
- 需要 `has` 和 `hasOwn` 配合判断元素是否存在
- `push/pop/shift/unshift/splice` 需要临时关闭依赖收集,防止死循环

## 🎯 五、生产级最佳实践：医疗场景实战

### 响应式丢失场景系统总结

**1. 解构 reactive 对象**

```typescript
// ❌ 错误：解构丢失响应性
const inventory = reactive({
  drugName: '阿莫西林',
  stock: 500
})

const { stock } = inventory
stock++ // ❌ 不会触发更新

// ✅ 正确：用 toRefs 解构
const { drugName, stock } = toRefs(inventory)
stock.value++ // ✅ 触发更新
```

**2. 展开运算符**

```typescript
// ❌ 错误：展开运算符复制的是值,不是引用
const form = reactive({
  name: '张三',
  age: 45
})

const copy = { ...form } // ❌ copy 是普通对象,无响应性
copy.age = 46 // ❌ 不会触发更新

// ✅ 正确：toRefs + 展开
const copy = { ...toRefs(form) }
copy.age.value = 46 // ✅ 触发更新
```

**3. 直接赋值覆盖**

```typescript
// ❌ 错误：直接赋值会丢失响应式
let state = reactive({ count: 0 })
state = { count: 1 } // ❌ 重新赋值,丢失响应式

// ✅ 正确：用 ref 包装
let state = ref({ count: 0 })
state.value = { count: 1 } // ✅ 触发更新
```

**4. 传递给普通函数参数**

```typescript
// ❌ 错误：传参后原始对象被修改,但响应式副本不会更新
function resetStock(stock) {
  stock = 0 // 只是修改了局部变量
}
resetStock(inventory.stock)

// ✅ 正确：传递响应式引用
function resetStock(stockRef) {
  stockRef.value = 0 // 修改 ref 的 value,触发更新
}
resetStock(toRef(inventory, 'stock'))
```

**5. 真实案例：药品库存管理**

```vue
<script setup>
import { reactive, toRefs, watch } from 'vue'

// ❌ 错误示范
const inventory = reactive({
  name: '阿莫西林',
  stock: 500
})

// 组件内使用到 toRefs 的正确写法
const { name, stock } = toRefs(inventory)

// 监听库存变化,低于阈值告警
watch(stock, (newStock) => {
  if (newStock < 100) {
    console.warn(`⚠️ ${name.value} 库存不足：${newStock}`)
  }
})
</script>

<template>
  <div>药品：{{ name }} 库存：{{ stock }}</div>
</template>
```

### shallowReactive / shallowRef 性能优化

**大型只读数据：药品目录、ICD 码表**

```typescript
import { shallowReactive, shallowRef, triggerRef } from 'vue'

// 万条药品目录(只读)
const drugCatalog = shallowReactive({
  version: '2024-Q1',
  total: 10234,
  items: [ /* 10000+ 条药品数据 */ ]
})

// ✅ 第一层响应式
drugCatalog.total = 10235 // 触发更新

// ❌ 深层不响应(性能优化)
drugCatalog.items[0].name = 'xxx' // 不会触发更新
```

**性能对比示例**：

```typescript
// ❌ reactive：初始化时递归代理所有嵌套对象
// 1 万条药品数据 × 每条约 10 个字段 = 10 万次 Proxy 创建
const catalog1 = reactive({
  items: drugData // 10000+ 条
})

// ✅ shallowReactive：只代理第一层
// 只创建 1 个 Proxy,性能提升显著
const catalog2 = shallowReactive({
  items: drugData
})
```

**shallowRef 配合 triggerRef**：

```typescript
// 大数据：患者心电波形数据(高频更新)
const ecgData = shallowRef([])

// 数据源更新(不经过响应式)
function appendWaveform(data) {
  ecgData.value = data // 整体替换才触发
}

// 需要手动触发时
function forceUpdate() {
  triggerRef(ecgData) // 强制触发更新
}
```

### readonly / shallowReadonly 实战场景

**1. props 传递：防止子组件修改父组件数据**

```vue
<!-- 父组件 -->
<script setup>
import { reactive, readonly } from 'vue'
import PatientProfile from './PatientProfile.vue'

const patient = reactive({
  name: '张三',
  diagnosis: '高血压'
})

// ✅ 传递只读副本,防止子组件修改
</script>

<template>
  <PatientProfile :patient="readonly(patient)" />
</template>
```

**2. 状态快照：历史记录、撤销重做**

```typescript
import { reactive, readonly } from 'vue'

// 患者档案修改历史
const history = ref([])

function saveSnapshot(record) {
  // 📚 知识点：存储只读快照,防止后续修改影响历史记录
  history.value.push(readonly({ ...toRaw(record), time: Date.now() }))
}
```

**3. 医疗场景：患者档案只读视图**

```typescript
const patientRecord = reactive({
  name: '张三',
  age: 45,
  vitals: {
    bloodPressure: '120/80',
    heartRate: 75
  }
})

// 展示组件只读访问
const readonlyRecord = readonly(patientRecord)
// 尝试修改会在 devtools 中警告,生产环境静默失败
```

### customRef 高级应用

**1. 防抖 ref：搜索框输入**

```typescript
import { customRef } from 'vue'

// 医疗场景：药品搜索防抖
function useDebouncedRef(value, delay = 300) {
  let timeout
  return customRef((track, trigger) => {
    return {
      get() {
        track()
        return value
      },
      set(newValue) {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          value = newValue
          trigger()
        }, delay)
      }
    }
  })
}

// 使用
const keyword = useDebouncedRef('')

watch(keyword, async (value) => {
  if (!value.trim()) return
  const results = await searchDrugs(value) // API 请求
  drugList.value = results
})
```

**2. 节流 ref：滚动加载**

```typescript
import { customRef } from 'vue'

function useThrottledRef(value, delay = 500) {
  let timeout
  let lastRun = 0
  return customRef((track, trigger) => {
    return {
      get() {
        track()
        return value
      },
      set(newValue) {
        const now = Date.now()
        if (now - lastRun >= delay) {
          value = newValue
          trigger()
          lastRun = now
        } else {
          clearTimeout(timeout)
          timeout = setTimeout(() => {
            value = newValue
            trigger()
            lastRun = Date.now()
          }, delay - (now - lastRun))
        }
      }
    }
  })
}

// 使用：滚动加载更多药品
const scrollPosition = useThrottledRef(0, 500)

onScroll(() => {
  scrollPosition.value = window.scrollY
  // 500ms 内最多触发一次加载
})
```

### computed 的 getter 必须无副作用

**❌ 错误示范**：

```typescript
const totalStock = computed(() => {
  // ❌ 副作用：修改了其他响应式数据
  logCounter.value++ // 不应该在 computed 中修改数据
  return inventory.items.reduce((sum, item) => sum + item.stock, 0)
})
```

**✅ 正确示范**：

```typescript
// ✅ 纯函数：只读取依赖,不修改任何数据
const totalStock = computed(() => {
  return inventory.items.reduce((sum, item) => sum + item.stock, 0)
})
```

**循环依赖问题排查**：

```typescript
// ❌ 循环依赖：computed 依赖自身
const a = computed(() => a.value + 1) // 死循环

// ✅ 正确：拆分依赖
const base = ref(1)
const a = computed(() => base.value + 1)
```

### watch 的 immediate + deep 性能代价

**deep watch 递归遍历整个对象,大对象慎用**：

```typescript
// ❌ 错误：deep watch 大对象,每次修改都深度遍历
const patient = reactive({
  name: '张三',
  medicalRecords: [ /* 大量病历数据 */ ]
})

watch(patient, () => {
  // 每次任何属性变化都会触发
}, { deep: true })
// 📚 知识点：deep watch 通过 traverse 递归遍历所有属性
// 大对象场景下,每次触发都会重新遍历,性能开销大
```

**✅ 正确：按需监听**

```typescript
// 只监听需要的字段
watch(() => patient.vitals.heartRate, (newVal) => {
  console.log(`心率变化：${newVal}`)
})
```

**性能对比**：

```typescript
// deep: true 与按需监听的性能对比
const bigObject = reactive({
  /* 10000 个字段 */
})

// ❌ deep: true：每次修改触发 10000 次遍历
watch(bigObject, () => {}, { deep: true })

// ✅ 按需监听：只遍历 1 个字段
watch(() => bigObject.targetField, () => {})
```

### toRaw / markRaw 实战场景

**1. toRaw 获取原始对象：深拷贝、序列化**

```typescript
import { reactive, toRaw } from 'vue'

const state = reactive({
  name: '张三',
  medicalRecords: [
    { date: '2024-01-01', diagnosis: '高血压' }
  ]
})

// ✅ 深拷贝响应式对象
// 直接 JSON.stringify(state) 会序列化 Proxy,性能差
const raw = toRaw(state)
const copy = JSON.parse(JSON.stringify(raw))
```

**2. markRaw 标记非响应式：第三方库实例**

```typescript
import { reactive, markRaw } from 'vue'

// 医学影像渲染引擎实例
const imageEngine = markRaw(new MedicalImageEngine())

// 地图实例
const map = markRaw(new AMap.Map('container'))

const appState = reactive({
  imageEngine, // ✅ 不代理,性能优化
  map, // ✅ 不代理
  patientInfo: { name: '张三' } // 正常响应式
})
```

**3. 大型静态配置：数据字典**

```typescript
// 药品分类字典(静态数据,无需响应式)
const drugTypeDict = markRaw({
  '01': '西药',
  '02': '中成药',
  '03': '生物制品',
  // ... 上千条
})

const store = reactive({
  drugTypeDict,
  currentType: '01'
})
```

### Collection 类型响应式实战场景

**医疗场景：`reactive(new Map())` 维护科室 → 医生列表索引缓存**

```typescript
import { reactive, computed, effect } from 'vue'

// 比数组 find 性能更优：Map 查找是 O(1),数组是 O(n)
const departmentIndex = reactive(new Map([
  ['内科', {
    head: '张医生',
    doctors: ['张医生', '王医生', '李医生'],
    beds: 50
  }],
  ['外科', {
    head: '赵医生',
    doctors: ['赵医生', '钱医生'],
    beds: 40
  }]
]))

// 读取科室信息
effect(() => {
  console.log('内科：', departmentIndex.get('内科'))
  console.log('科室数量：', departmentIndex.size)
})

// 更新科室信息
departmentIndex.get('内科').doctors.push('周医生') // ✅ 响应式(嵌套对象)

// 新增科室
departmentIndex.set('儿科', {
  head: '刘医生',
  doctors: ['刘医生'],
  beds: 20
}) // ✅ 响应式

// 删除科室
departmentIndex.delete('外科') // ✅ 响应式

// 按科室统计总床位数
const totalBeds = computed(() => {
  let total = 0
  departmentIndex.forEach((dept) => {
    total += dept.beds
  })
  return total
})
```

**性能对比：Map vs 数组 find**

```typescript
// ❌ 数组 find：O(n) 查找
const departments = reactive([
  { id: 1, name: '内科', head: '张医生' },
  { id: 2, name: '外科', head: '赵医生' }
])

function findDepartment(id) {
  return departments.find(d => d.id === id) // O(n)
}

// ✅ Map：O(1) 查找
const departmentMap = reactive(new Map([
  [1, { id: 1, name: '内科', head: '张医生' }],
  [2, { id: 2, name: '外科', head: '赵医生' }]
]))

function findDepartment(id) {
  return departmentMap.get(id) // O(1)
}
```

### effectScope 实战应用

**1. 组件卸载时批量清理 watcher**

```typescript
import { effectScope, watchEffect, onScopeDispose } from 'vue'

export function usePatientData(patientId) {
  const scope = effectScope()
  
  scope.run(() => {
    // 所有副作用自动收集到 scope
    const unwatch1 = watchEffect(() => {
      console.log('患者信息变化', patientId)
    })
    
    const unwatch2 = watchEffect(() => {
      console.log('病历记录变化')
    })
    
    // 📚 知识点：onScopeDispose 注册的清理函数在 scope.stop() 时执行
    onScopeDispose(() => {
      console.log('scope 被清理')
    })
  })
  
  // 返回停止函数
  return {
    stop: () => scope.stop()
  }
}

// 使用
const { stop } = usePatientData(1)
// 组件卸载时
onUnmounted(stop) // 一次性清理所有 watcher
```

**2. Pinia Store 实例管理**

```typescript
// 📚 知识点：Pinia 底层就是用 effectScope 管理 Store 的响应式副作用
// defineStore 内部实现骨架
function defineStore(storeName, setup) {
  const scope = effectScope()
  
  const store = scope.run(() => {
    // setup 中创建的 ref/computed/watchEffect 都被 scope 收集
    return setup()
  })
  
  return store
}
```

**3. 插件系统副作用管理**

```typescript
import { effectScope } from 'vue'

// 插件系统的副作用统一管理
export function createPluginSystem() {
  const scope = effectScope()
  
  function registerPlugin(fn) {
    scope.run(() => {
      fn() // 插件内部创建的副作用被 scope 收集
    })
  }
  
  function destroyAll() {
    scope.stop() // 卸载所有插件时一次性清理
  }
  
  return { registerPlugin, destroyAll }
}
```

### Proxy 局限性的实际处理

**1. Date、RegExp、Promise 等内置对象**

```typescript
// ❌ 无法直接代理 Date
const date = reactive(new Date())
date.setFullYear(2024) // ❌ 方法调用绕过了代理

// ✅ 正确：用 ref 包装
const date = ref(new Date())
date.value = new Date('2024-01-01') // ✅ 整体替换时触发更新

// ✅ 或者：computed 派生
const dateString = computed(() => date.value.toLocaleDateString('zh-CN'))
```

**2. 兼容性考虑：Vue 3 放弃 IE11 的原因**

```typescript
// Proxy 是语言层面的新特性,无法 polyfill
// Vue 2 兼容 IE11,因为 defineProperty 可以 polyfill
// Vue 3 放弃 IE11,因为 Proxy 无法用 ES5 语法模拟
```

**3. 函数类型的处理**

```typescript
// 函数可以被 reactive 代理,但不建议
const fn = reactive(() => {})
// 📚 知识点：函数内部的 this 绑定可能出问题

// ✅ 建议：用 ref
const fnRef = ref(() => {})
```

### 💬 面试官视角

**Q1：响应式丢失的场景有哪些？如何解决？**

✅ **标准答案**：
1. 解构 reactive 对象 → 用 `toRefs()` 解决
2. 展开运算符 → 用 `{ ...toRefs(state) }` 解决
3. 直接赋值覆盖 → 用 `ref()` 包装
4. 传参给普通函数 → 传递 ref 引用

🎁 **加分点**：
- 本质原因：reactive 返回的是 Proxy,解构/展开拿到的是值副本
- toRefs 返回的 ref 与源对象保持引用连接
- 组件 props 是 readonly 的,不能直接解构

**Q2：deep watch 的性能问题是什么？如何优化？**

✅ **标准答案**：
deep watch 通过 traverse 递归遍历所有属性,大对象场景下每次触发都重新遍历,性能开销大。

🎁 **加分点**：
- 用 getter 按需监听：`watch(() => obj.targetField, cb)`
- deep 选项支持数字：`deep: 2` 只遍历两层
- traverse 用 Set 记录已访问对象,防止循环引用

**Q3：什么场景应该用 effectScope？**

✅ **标准答案**：
需要批量创建并管理一组响应式副作用的场景,如组件卸载清理、Pinia Store 管理、插件系统。

🎁 **加分点**：
- `scope.run()` 内创建的 effect 自动收集
- `onScopeDispose` 注册清理函数
- `scope.stop()` 一次性停止所有副作用

## 🛠️ 六、手写极简响应式系统：患者信息表单实时校验

> 本章承接系列第 1 篇《Vue 3 设计思想与整体架构》已搭建好的 Monorepo 环境（pnpm workspace + TypeScript + esbuild），在 `packages/` 下新增 `reactivity`、`runtime-core` 两个包，手写极简响应式系统（Proxy + Reflect + track/trigger + effect + ref + computed + watch/watchEffect），最后实现一个医疗场景的患者信息表单实时响应式校验示例。完整源码：https://github.com/lotosv2010/g-vue-next

`packages/shared/src/index.ts` 在第 1 篇的基础上补充几个工具函数：

```typescript
// 判断是否发生改变
export const hasChanged = (value: any, oldValue: any): boolean => !Object.is(value, oldValue)

// 合并对象
export const extend = Object.assign

// 判断是否为数组
export const isArray = Array.isArray

// 创建一个空函数
export const NOOP = () => {}
```

### 手写 reactivity 响应式核心

```bash
cd packages
mkdir reactivity
cd reactivity
pnpm init
```

#### packages/reactivity/package.json

```json
{
  "name": "@g-vue-next/reactivity",
  "version": "3.4.0",
  "module": "dist/reactivity.esm.js",
  "buildOptions": {
    "name": "GVueNextReactivity",
    "formats": ["esm", "cjs"]
  },
  "dependencies": {
    "@g-vue-next/shared": "workspace:^"
  }
}
```

#### packages/reactivity/src/constants.ts

```typescript
// 响应式标识
export enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive'
}

// 操作类型
export enum TrackOpTypes {
  GET = 'get'
}

export enum TriggerOpTypes {
  SET = 'set'
}

// 脏值级别
export enum DirtyLevels {
  NotDirty = 0,         // 不脏，用上一次返回的值
  QueryingDirty = 1,    // 脏，正在查询中
  MaybeDirty_ComputedSideEffect = 2, // 脏，但是可能在计算属性的副作用中
  MaybeDirty = 3,       // 脏，但是不在计算属性的副作用中
  Dirty = 4             // 脏，需要重新计算
}
```

#### packages/reactivity/src/dep.ts

```typescript
import { ReactiveEffect } from './effect'

// 📚 知识点：Dep 是一个 Map，存储 effect → trackId 的映射
export type Dep = Map<ReactiveEffect, number> & {
  cleanup: () => void
  computed?: any
}

export const createDep = (cleanup: () => void, computed?: any): Dep => {
  const dep = new Map() as Dep
  dep.cleanup = cleanup
  dep.computed = computed
  return dep
}
```

#### packages/reactivity/src/effect.ts

```typescript
import { extend } from '@g-vue-next/shared'
import { Dep } from './dep'
import { DirtyLevels } from './constants'

// 执行 effect 之前的清理逻辑
const preCleanupEffect = (effect: ReactiveEffect) => {
  effect._trackId++ // trackId 递增，用于判断是否需要执行 cleanup
  effect._depsLength = 0 // 重置 deps 的长度
}

// 执行 effect 之后的清理逻辑
// 首次：{flag, name, age}
// 更新：{flag}
// 此时需要删除多余的属性 name 和 age
const postCleanupEffect = (effect: ReactiveEffect) => {
  // 如果 依赖项的 deps 的长度小于 trackId，则说明有属性被删除
  if (effect.deps.length > effect._depsLength) {
    //遍历删除的属性
    for (let i = effect._depsLength; i < effect.deps.length; i++) {
      cleanupDepEffect(effect.deps[i], effect)
    }
    // 重置 deps 的长度
    effect.deps.length = effect._depsLength
  }
}

export let activeEffect: ReactiveEffect | undefined // 当前激活的effect

// 📚 知识点：ReactiveEffect 是响应式副作用的核心类
export class ReactiveEffect<T = any> {
  public active = true // 是否激活
  deps: Dep[] = [] // 存储依赖关系
  _trackId = 0 // 用于记录 effect 执行的次数, 防止重复收集依赖
  _depsLength = 0 // 用于记录 deps 的长度
  _running = 0 // 用于记录 effect 是否正在执行
  _dirtyLevel = DirtyLevels.Dirty // 脏值级别, 用于标记需要重新计算的属性

  constructor(public fn: () => T, public scheduler?: () => void) {}

  public get dirty() {
    return this._dirtyLevel >= DirtyLevels.Dirty
  }
  
  public set dirty(v: boolean) {
    this._dirtyLevel = v ? DirtyLevels.Dirty : DirtyLevels.NotDirty
  }

  run() {
    // 每次执行后 effect 变为不脏
    this._dirtyLevel = DirtyLevels.NotDirty
    // 如果没有激活，则直接执行fn
    if (!this.active) {
      return this.fn()
    }
    let lastEffect = activeEffect // 保存当前激活的effect
    try {
      activeEffect = this // 设置当前激活的effect
      // 标记为正在执行
      this._running++
      // 执行之前需要清理旧的依赖关系
      preCleanupEffect(this)
      return this.fn() // 执行fn
    } finally {
      // 标记为执行完毕
      this._running--
      // 执行后需要清理旧的依赖关系
      postCleanupEffect(this)
      activeEffect = lastEffect // 恢复上一次激活的effect
    }
  }

  stop() {
    if (this.active) {
      this.active = false
    }
  }
}

// 创建effect
export const effect = <T = any>(fn: () => T, options?: { scheduler?: () => void }) => {
  const _effect = new ReactiveEffect(fn, options?.scheduler || (() => {
    _effect.run()
  }))

  // 判断是否有用户传递的配置
  if (options) {
    // 合并配置
    extend(_effect, options)
  }
  // 执行渲染
  _effect.run()

  // 定义 runner 方法，返回给用户，让用户决定何时执行 effect
  const runner = _effect.run.bind(_effect) as EffectRunner
  runner.effect = _effect
  return runner
}

export interface EffectRunner<T = any> {
  (): T
  effect: ReactiveEffect
}

// 清理旧的依赖关系
function cleanupDepEffect(dep: Dep, effect: ReactiveEffect) {
  // 获取对象和属性的依赖关系
  const trackId = dep.get(effect)
  // 如果对象和属性的依赖关系存在, 且对象和属性的依赖关系和当前effect的依赖关系不一致, 则清理
  if (trackId !== undefined && effect._trackId !== trackId) {
    // 清理对象和属性的依赖关系
    dep.delete(effect)
    // 如果对象和属性的依赖关系不存在, 则清理
    if (dep.size === 0) {
      // 清理对象和属性的依赖关系
      dep.cleanup()
    }
  }
}

// 📚 知识点：双向记录——将effect添加到dep中映射表中，后续可以根据值的变化触发此映射表中的 effect 
// 首次：{ flag, name }
// 更新：{ flag, age }, 此时需要将 旧的 { flag, name } 中的 name 删除
// 最终：将 age 添加到 { flag, age } 中
export const trackEffect = (effect: ReactiveEffect, dep: Dep) => {
  // 如果上一次依赖项的追踪ID与当前追踪ID不同，则添加依赖项
  if (dep.get(effect) !== effect._trackId) {
    // 添加依赖项 
    dep.set(effect, effect._trackId)
    // 获取上一次的依赖项
    const oldDep = effect.deps[effect._depsLength]
    // 如果上一次的依赖项不等于新的依赖项
    if (oldDep !== dep) {
      // 如果上一次的依赖项存在
      if (oldDep) {
        // 删除旧的依赖项
        cleanupDepEffect(oldDep, effect)
      }
      // 添加新的依赖项
      effect.deps[effect._depsLength++] = dep
    } else {
      effect._depsLength++ // 添加依赖项长度
    }
  }
}

// 📚 知识点：触发——将dep中的effect添加到effectScheduler中执行
export const triggerEffects = (dep: Dep) => {
  for (const effect of dep.keys()) {
    // 当前的值是不脏的，触发更新需将值变脏
    if (effect._dirtyLevel < DirtyLevels.Dirty) {
      effect._dirtyLevel = DirtyLevels.Dirty
    }
    if (!effect._running) {
      if (effect.scheduler) {
        // 执行调度器，等价于调用 effect.run()
        effect.scheduler()
      } else {
        // 否则执行 effect.run()
        effect.run()
      }
    }
  }
}
```

#### packages/reactivity/src/reactiveEffect.ts

```typescript
import { isObject } from '@g-vue-next/shared'
import { activeEffect, trackEffect, triggerEffects } from './effect'
import { createDep, Dep } from './dep'
import { TrackOpTypes, TriggerOpTypes } from './constants'

// 📚 知识点：三层依赖存储结构
// targetMap（WeakMap）→ depsMap（Map）→ dep（Map）
const targetMap = new WeakMap<any, Map<any, Dep>>()

// 📚 知识点：track 依赖收集——建立 target.key → effect 的映射关系
export const track = (target: object, type: TrackOpTypes, key: unknown) => {
  // 如果没有激活的 effect，不需要收集依赖
  if (!activeEffect) return

  // 获取对象的依赖映射表
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  // 获取属性的依赖集合
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = createDep(() => depsMap!.delete(key))))
  }

  // 将当前 effect 添加到依赖集合
  trackEffect(activeEffect, dep)
}

// 📚 知识点：trigger 派发更新——从 targetMap 找到对应 dep，遍历执行 effect
export const trigger = (
  target: object,
  type: TriggerOpTypes,
  key: unknown,
  newValue?: unknown,
  oldValue?: unknown
) => {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  // 获取属性的依赖集合
  let dep = depsMap.get(key)
  if (dep) {
    // 触发依赖
    triggerEffects(dep)
  }
}
```

#### packages/reactivity/src/baseHandler.ts

```typescript
import { hasChanged, isObject } from '@g-vue-next/shared'
import { ReactiveFlags, TrackOpTypes, TriggerOpTypes } from './constants'
import { reactive } from './reactive'
import { track, trigger } from './reactiveEffect'

class BaseReactiveHandler implements ProxyHandler<any> {
  get(target: object, key: string | symbol, receiver: object) {
    // 📚 知识点：receiver 表示代理对象本身
    // 判断是否是 IS_REACTIVE, 如果是表示是一个代理对象则返回 true
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    // 收集依赖
    track(target, TrackOpTypes.GET, key)
    // 获取属性值
    const res = Reflect.get(target, key, receiver)
    // 📚 知识点：深度代理——惰性递归，访问到嵌套对象时才代理
    if (isObject(res)) {
      return reactive(res)
    }
    return res
  }
}

class MutableReactiveHandler extends BaseReactiveHandler {
  set(target: object, key: string | symbol, value: unknown, receiver: object) {
    const oldValue = (target as any)[key] // 获取旧值
    const res = Reflect.set(target, key, value, receiver)
    if (hasChanged(value, oldValue)) {
      // 触发依赖
      trigger(target, TriggerOpTypes.SET, key, value, oldValue)
    }
    return res
  }
}

// 响应式对象的处理器
export const mutableHandlers: ProxyHandler<object> = new MutableReactiveHandler()
```

#### packages/reactivity/src/reactive.ts

```typescript
import { isObject } from '@g-vue-next/shared'
import { mutableHandlers } from './baseHandler'
import { ReactiveFlags } from './constants'

// 📚 知识点：WeakMap 缓存代理对象——避免重复代理 + 防止内存泄漏
const reactiveMap = new WeakMap<any, any>()

// 创建代理对象
const createReactiveObject = (target: any) => {
  // 判断是否是一个对象, 如果不是对象, 直接返回
  if (!isObject(target)) {
    return target
  }
  // 判断是否已经创建过代理对象
  if ((target as any)[ReactiveFlags.IS_REACTIVE]) {
    return target
  }
  // 获取缓存的代理对象
  const existProxy = reactiveMap.get(target)
  // 判断对象是否已经被代理过, 如果被代理过, 则直接返回缓存的代理对象
  if (existProxy) {
    return existProxy
  }
  // 创建代理对象
  const proxy = new Proxy(target, mutableHandlers)
  // 缓存对象
  reactiveMap.set(target, proxy)
  return proxy
}

/**
 * 创建响应式对象
 * @param target 目标对象
 * @returns 响应式对象
 */
export const reactive = <T extends object>(target: T): T => {
  return createReactiveObject(target)
}

// 📚 知识点：将值转为响应式——对象用 reactive，基本类型保持原样
export const toReactive = <T extends unknown>(value: T): T => {
  return isObject(value) ? reactive(value) : value
}

// 判断是否是响应式对象
export const isReactive = (value: unknown): boolean => {
  return !!(value && (value as any)[ReactiveFlags.IS_REACTIVE])
}
```

#### packages/reactivity/src/ref.ts

```typescript
import { hasChanged } from '@g-vue-next/shared'
import { activeEffect, trackEffect, triggerEffects } from './effect'
import { createDep, Dep } from './dep'
import { toReactive } from './reactive'

// 📚 知识点：trackRefValue——收集 ref 的依赖
export const trackRefValue = (ref: RefImpl) => {
  if (activeEffect) {
    trackEffect(activeEffect, ref.dep ||= createDep(() => ref.dep = undefined))
  }
}

// 📚 知识点：triggerRefValue——触发 ref 的依赖
export const triggerRefValue = (ref: RefImpl) => {
  if (ref.dep) {
    triggerEffects(ref.dep)
  }
}

// 📚 知识点：RefImpl——ref 的实现类，通过 get/set 拦截 .value 的访问
class RefImpl<T = any> {
  public _value: T // 缓存值
  public dep?: Dep = undefined // 依赖收集
  public __v_isRef = true // 标记这是一个 ref 对象

  constructor(public _rawValue: T) {
    // 📚 知识点：对象类型的 ref 内部调用 reactive()
    this._value = toReactive(_rawValue)
  }

  get value() {
    // 收集依赖
    trackRefValue(this)
    return this._value
  }

  set value(newValue: T) {
    if (hasChanged(newValue, this._rawValue)) {
      this._rawValue = newValue
      this._value = toReactive(newValue)
      // 触发依赖
      triggerRefValue(this)
    }
  }
}

/**
 * 创建 ref 对象
 * @param value 初始值
 * @returns ref 对象
 */
export const ref = <T>(value: T) => {
  return new RefImpl(value)
}

// 判断是否是 ref
export const isRef = (value: any): value is RefImpl => {
  return !!(value && value.__v_isRef)
}
```

#### packages/reactivity/src/computed.ts

```typescript
import { isFunction } from '@g-vue-next/shared'
import { ReactiveEffect } from './effect'
import { Dep } from './dep'
import { trackRefValue, triggerRefValue } from './ref'

export type ComputedGetter<T> = (oldValue?: T) => T
export type ComputedSetter<T> = (value: T) => void

export interface WritableComputedOptions<T> {
  get: ComputedGetter<T>
  set: ComputedSetter<T>
}

// 📚 知识点：ComputedRefImpl——computed 的实现类
class ComputedRefImpl<T> {
  public readonly effect: ReactiveEffect<T> // 记录响应式依赖关系
  public dep?: Dep = undefined // 记录依赖关系
  public __v_isRef = true // 标记这是一个 ref 对象
  private _value!: T // 缓存值

  constructor(
    private getter: ComputedGetter<T>,
    private readonly _setter: ComputedSetter<T>
  ) {
    // 📚 知识点：computed 本身是一个 effect，依赖变化时只标记 dirty
    this.effect = new ReactiveEffect(
      () => getter(this._value), // 创建响应式依赖关系
      () => {
        // 📚 知识点：scheduler——依赖变化触发，标记 dirty 并触发依赖的 effect
        triggerRefValue(this)
      }
    )
  }

  get value() {
    // 📚 知识点：惰性求值——只有当 effect.dirty=true 时才重新计算
    if (this.effect.dirty) {
      this._value = this.effect.run()!
      // 📚 知识点：收集依赖——让 computed 和依赖它的 effect 关联
      trackRefValue(this)
    }
    return this._value
  }

  set value(newValue: T) {
    this._setter(newValue)
  }
}

export function computed<T>(getter: ComputedGetter<T>): ComputedRefImpl<T>
export function computed<T>(options: WritableComputedOptions<T>): ComputedRefImpl<T>
export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>
): ComputedRefImpl<T> {
  let getter: ComputedGetter<T>
  let setter: ComputedSetter<T>

  const onlyGetter = isFunction(getterOrOptions)
  if (onlyGetter) {
    getter = getterOrOptions
    setter = () => {
      console.warn('Write operation failed: computed value is readonly')
    }
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }

  return new ComputedRefImpl(getter, setter)
}
```

#### packages/reactivity/src/index.ts

```typescript
export * from './reactive'
export * from './effect'
export * from './ref'
export * from './computed'
export * from './constants'
```

### 手写 runtime-core（watch/watchEffect）

```bash
cd packages
mkdir runtime-core
cd runtime-core
pnpm init
```

#### packages/runtime-core/package.json

```json
{
  "name": "@g-vue-next/runtime-core",
  "version": "3.4.0",
  "module": "dist/runtime-core.esm.js",
  "buildOptions": {
    "name": "GVueNextRuntimeCore",
    "formats": ["esm", "cjs"]
  },
  "dependencies": {
    "@g-vue-next/reactivity": "workspace:^",
    "@g-vue-next/shared": "workspace:^"
  }
}
```

#### packages/runtime-core/src/apiWatch.ts

```typescript
import { ComputedRefImpl, isReactive, isRef, ReactiveEffect, RefImpl } from '@g-vue-next/reactivity'
import { isFunction, isObject } from '@g-vue-next/shared'

export interface WatchOptions {
  deep?: boolean | number
  immediate?: boolean
}

export type OnCleanup = (cleanupFn: () => void) => void

export type WatchSource<T = any> = RefImpl<T> | ComputedRefImpl<T> | (() => T)

export type WatchEffect = (onCleanup: OnCleanup) => void

export type WatchCallback<V = any, OV = any> = (newValue: V, oldValue: OV, onCleanup: OnCleanup) => void

export type WatchStopHandle = () => void

// 📚 知识点：doWatch——watch 和 watchEffect 的统一实现
function doWatch(
  source: WatchSource | WatchSource[] | WatchEffect | object,
  cb: WatchCallback | null,
  { deep, immediate }: WatchOptions = {}
): WatchStopHandle {
  const reactiveGetter = (source: object) => {
    if (deep) return source
    if (deep === false || deep === 0) {
      return traverse(source, 1)
    }
    return traverse(source)
  }

  let getter: () => any
  let oldValue: any

  // 📚 知识点：根据 source 类型决定 getter
  if (isReactive(source)) {
    getter = () => reactiveGetter(source)
  } else if (isRef(source)) {
    getter = () => (source as RefImpl).value
  } else if (isFunction(source)) {
    if (cb) {
      // watch(fn, cb)
      getter = source as () => any
    } else {
      // watchEffect(fn)
      getter = () => {
        if (cleanup) cleanup()
        return (source as WatchEffect)(onCleanup)
      }
    }
  } else {
    getter = () => {}
  }

  // 📚 知识点：deep watch 通过 traverse 递归遍历
  if (cb && deep) {
    const baseGetter = getter
    const depth = deep === true ? Infinity : (deep as number)
    getter = () => traverse(baseGetter(), depth)
  }

  // 📚 知识点：cleanup 副作用清理机制
  let cleanup: (() => void) | undefined
  const onCleanup: OnCleanup = (fn: () => void) => {
    cleanup = () => {
      fn() // 执行用户传入的函数, 执行清除副作用的逻辑
      cleanup = undefined // 重置清除函数
    }
  }

  const job = () => {
    if (cb) {
      // watch(source, cb)
      const newValue = effect.run()
      // 执行回调前，先调用上一次的清理操作进行清理
      if (cleanup) {
        cleanup()
      }
      cb(newValue, oldValue, onCleanup)
      oldValue = newValue
    } else {
      // watchEffect
      effect.run()
    }
  }

  // 📚 知识点：创建 effect，scheduler 触发 job
  const effect = new ReactiveEffect(getter, job)

  if (cb) {
    // watch
    if (immediate) {
      // 立即执行一遍, 传递新值和老值
      job()
    } else {
      oldValue = effect.run()
    }
  } else {
    // 📚 知识点：watchEffect 立即执行
    effect.run()
  }

  // 📚 知识点：返回 unwatch 停止函数
  const unwatch: WatchStopHandle = () => {
    effect.stop()
  }
  return unwatch
}

// 📚 知识点：traverse——递归遍历对象，触发所有属性的 getter
export function traverse(value: unknown, depth: number = Infinity, seen?: Set<unknown>) {
  if (depth <= 0 || !isObject(value)) {
    return value
  }

  seen = seen || new Set()
  if (seen.has(value)) {
    return value
  }
  seen.add(value)
  depth--
  for (const key in value as any) {
    traverse((value as any)[key], depth, seen)
  }
  return value
}

export const watch = <T = any>(
  source: WatchSource<T> | T,
  cb: WatchCallback,
  options?: WatchOptions
): WatchStopHandle => {
  return doWatch(source as any, cb, options)
}

export const watchEffect = (effect: WatchEffect, options?: WatchOptions): WatchStopHandle => {
  return doWatch(effect, null, options)
}
```

#### packages/runtime-core/src/index.ts

```typescript
export * from './apiWatch'
```

### 统一导出包（vue）

```bash
cd packages
mkdir vue
cd vue
pnpm init
```

#### packages/vue/package.json

```json
{
  "name": "g-vue-next",
  "version": "3.4.0",
  "module": "dist/vue.esm.js",
  "buildOptions": {
    "name": "GVueNext",
    "formats": ["esm", "cjs", "esm-browser"]
  },
  "dependencies": {
    "@g-vue-next/reactivity": "workspace:^",
    "@g-vue-next/runtime-core": "workspace:^",
    "@g-vue-next/shared": "workspace:^"
  }
}
```

#### packages/vue/src/index.ts

```typescript
export * from '@g-vue-next/shared'
export * from '@g-vue-next/reactivity'
export * from '@g-vue-next/runtime-core'
```

### 完整示例：患者信息表单实时校验

创建 `examples/patient-form.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>患者信息表单实时校验 - Vue 3 响应式系统</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB',
        'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 100%;
      padding: 40px;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      color: #333;
      font-weight: 500;
    }
    input, select {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.3s;
    }
    input:focus, select:focus {
      outline: none;
      border-color: #667eea;
    }
    .error {
      color: #f56565;
      font-size: 12px;
      margin-top: 6px;
      display: flex;
      align-items: center;
    }
    .error::before {
      content: '⚠️';
      margin-right: 4px;
    }
    .success {
      color: #48bb78;
      font-size: 12px;
      margin-top: 6px;
      display: flex;
      align-items: center;
    }
    .success::before {
      content: '✅';
      margin-right: 4px;
    }
    .summary {
      background: #f7fafc;
      border-radius: 8px;
      padding: 20px;
      margin-top: 30px;
    }
    .summary h2 {
      font-size: 18px;
      color: #333;
      margin-bottom: 15px;
    }
    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .summary-item:last-child {
      border-bottom: none;
    }
    .summary-label {
      color: #666;
      font-weight: 500;
    }
    .summary-value {
      color: #333;
      font-weight: 600;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-valid {
      background: #c6f6d5;
      color: #22543d;
    }
    .badge-invalid {
      background: #fed7d7;
      color: #742a2a;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>患者信息登记</h1>
    <p class="subtitle">基于手写 Vue 3 响应式系统实现的实时表单校验</p>
    
    <form id="patientForm">
      <div class="form-group">
        <label for="name">姓名</label>
        <input type="text" id="name" placeholder="请输入患者姓名">
        <div id="nameError"></div>
      </div>

      <div class="form-group">
        <label for="idCard">身份证号</label>
        <input type="text" id="idCard" placeholder="请输入18位身份证号">
        <div id="idCardError"></div>
      </div>

      <div class="form-group">
        <label for="phone">手机号</label>
        <input type="text" id="phone" placeholder="请输入11位手机号">
        <div id="phoneError"></div>
      </div>

      <div class="form-group">
        <label for="age">年龄</label>
        <input type="number" id="age" placeholder="请输入年龄">
        <div id="ageError"></div>
      </div>

      <div class="form-group">
        <label for="bloodType">血型</label>
        <select id="bloodType">
          <option value="">请选择血型</option>
          <option value="A">A型</option>
          <option value="B">B型</option>
          <option value="AB">AB型</option>
          <option value="O">O型</option>
        </select>
        <div id="bloodTypeError"></div>
      </div>
    </form>

    <div class="summary">
      <h2>表单状态</h2>
      <div class="summary-item">
        <span class="summary-label">校验状态</span>
        <span id="formStatus"></span>
      </div>
      <div class="summary-item">
        <span class="summary-label">错误数量</span>
        <span class="summary-value" id="errorCount">0</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">已填字段</span>
        <span class="summary-value" id="filledCount">0 / 5</span>
      </div>
    </div>
  </div>

  <script type="module">
    // 导入手写的响应式系统
    import { reactive, computed, watch, effect } from '../packages/vue/dist/vue.esm.js'

    // 📚 知识点：reactive 创建响应式表单数据
    const form = reactive({
      name: '',
      idCard: '',
      phone: '',
      age: '',
      bloodType: ''
    })

    // 📚 知识点：reactive 创建响应式错误状态
    const errors = reactive({
      name: '',
      idCard: '',
      phone: '',
      age: '',
      bloodType: ''
    })

    // 校验规则
    const validators = {
      name: (value) => {
        if (!value) return '姓名不能为空'
        if (value.length < 2) return '姓名至少2个字符'
        if (!/^[一-龥a-zA-Z]+$/.test(value)) return '姓名只能包含中文或英文'
        return ''
      },
      idCard: (value) => {
        if (!value) return '身份证号不能为空'
        if (!/^\d{17}[\dXx]$/.test(value)) return '身份证号格式不正确'
        return ''
      },
      phone: (value) => {
        if (!value) return '手机号不能为空'
        if (!/^1[3-9]\d{9}$/.test(value)) return '手机号格式不正确'
        return ''
      },
      age: (value) => {
        if (!value) return '年龄不能为空'
        const num = Number(value)
        if (num < 0 || num > 150) return '年龄范围 0-150'
        return ''
      },
      bloodType: (value) => {
        if (!value) return '请选择血型'
        return ''
      }
    }

    // 📚 知识点：watch 监听表单字段变化，实时校验
    Object.keys(form).forEach(key => {
      watch(() => form[key], (newValue) => {
        errors[key] = validators[key](newValue)
      })
    })

    // 📚 知识点：computed 计算错误数量
    const errorCount = computed(() => {
      return Object.values(errors).filter(err => err !== '').length
    })

    // 📚 知识点：computed 计算已填字段数量
    const filledCount = computed(() => {
      return Object.values(form).filter(val => val !== '').length
    })

    // 📚 知识点：computed 计算表单是否全部有效
    const isFormValid = computed(() => {
      return errorCount.value === 0 && filledCount.value === 5
    })

    // 📚 知识点：effect 副作用——自动更新 DOM
    effect(() => {
      // 更新错误提示
      Object.keys(errors).forEach(key => {
        const errorEl = document.getElementById(`${key}Error`)
        if (errors[key]) {
          errorEl.innerHTML = `<div class="error">${errors[key]}</div>`
        } else if (form[key]) {
          errorEl.innerHTML = '<div class="success">格式正确</div>'
        } else {
          errorEl.innerHTML = ''
        }
      })

      // 更新表单状态
      const statusEl = document.getElementById('formStatus')
      if (isFormValid.value) {
        statusEl.innerHTML = '<span class="badge badge-valid">全部有效</span>'
      } else {
        statusEl.innerHTML = '<span class="badge badge-invalid">存在错误</span>'
      }

      // 更新错误数量
      document.getElementById('errorCount').textContent = errorCount.value

      // 更新已填字段数量
      document.getElementById('filledCount').textContent = `${filledCount.value} / 5`
    })

    // 绑定输入事件
    Object.keys(form).forEach(key => {
      const input = document.getElementById(key)
      input.addEventListener('input', (e) => {
        form[key] = e.target.value
      })
    })

    console.log('✅ 手写 Vue 3 响应式系统加载成功！')
    console.log('📚 本示例展示了以下 API：')
    console.log('   - reactive()：创建响应式对象')
    console.log('   - computed()：计算属性')
    console.log('   - watch()：侦听器')
    console.log('   - effect()：副作用函数')
  </script>
</body>
</html>
```

### 构建与运行

#### 根目录 package.json

```json
{
  "name": "g-vue-next-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build:shared": "node scripts/build.js shared",
    "build:reactivity": "node scripts/build.js reactivity",
    "build:runtime-core": "node scripts/build.js runtime-core",
    "build:vue": "node scripts/build.js vue",
    "build": "pnpm build:shared && pnpm build:reactivity && pnpm build:runtime-core && pnpm build:vue",
    "dev": "pnpm build && npx serve examples"
  }
}
```

#### 运行示例

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 启动开发服务器
pnpm dev

# 浏览器访问 http://localhost:3000/patient-form.html
```

### 💬 面试官视角

**Q1：手写响应式系统的核心难点是什么？**

✅ **标准答案**：
1. **三层依赖存储结构**：targetMap → depsMap → dep 的正确实现
2. **分支切换 cleanup**：trackId 机制避免旧依赖残留
3. **嵌套 effect 处理**：activeEffect 栈保证正确的依赖收集
4. **computed 惰性求值**：dirty 标记 + scheduler 机制

🎁 **加分点**：
- WeakMap 防止内存泄漏的原理（原始对象被 GC 时自动清理）
- Proxy + Reflect 的配合（保证 this 指向正确）
- 深度代理的惰性递归（按需代理，避免性能浪费）

**Q2：这个手写实现和 Vue 3 源码的主要区别是什么？**

✅ **标准答案**：
手写版是极简实现，省略了：
1. Collection 类型支持（Map/Set）
2. 数组特殊处理（length/索引）
3. effectScope 批量管理
4. 调度器队列（异步更新）
5. 开发模式警告

🎁 **加分点**：
- Vue 3 源码有完整的类型系统（泛型约束）
- 生产环境有性能优化（缓存、批处理）
- 支持服务端渲染（SSR）的特殊处理

## 💡 七、一张图总结（面试速记）

| 知识点 | 一句话核心 | 面试考察频率 |
|---|---|---|
| Proxy vs defineProperty | Proxy 天然拦截新增/删除属性、数组索引、Map/Set，惰性递归代理性能更优 | ⭐⭐⭐⭐⭐ |
| Proxy + Reflect 组合 | Reflect 确保 this 指向 Proxy 实例，拦截器内部操作规范化 | ⭐⭐⭐⭐ |
| WeakMap 三层依赖结构 | `WeakMap<target, Map<key, Dep>>` 防内存泄漏，key 被回收时自动清理 | ⭐⭐⭐⭐⭐ |
| Effect 四大分类 | Reactive(手动)、Computed(惰性缓存)、Watch(监听回调)、Render(组件渲染) | ⭐⭐⭐⭐⭐ |
| DirtyLevels 五级机制 | NotDirty/QueryingDirty/MaybeDirty_ComputedSideEffect/MaybeDirty/Dirty，嵌套 computed 精细控制 | ⭐⭐⭐⭐ |
| computed 惰性求值 + 缓存 | 依赖变化只标记 dirty，访问 value 时才重算，通过 scheduler 触发下游 effect | ⭐⭐⭐⭐⭐ |
| collectionHandlers 专项拦截 | Map/Set 操作是方法调用不走 baseHandlers，需拦截 get/set/forEach/迭代器 | ⭐⭐⭐⭐ |
| MAP_KEY_ITERATE_KEY | Map 的 keys() 只关心 key 增删，不关心 value 变化，单独追踪 key | ⭐⭐⭐ |
| toRef 四种入参形式 | 已是 ref(原样返回)、getter 函数(只读)、对象属性(双向绑定)、普通值(ref 包装) | ⭐⭐⭐⭐ |
| effectScope 批量管理 (3.2+) | scope.run() 收集副作用，scope.stop() 一次性停止，Pinia Store 底层依赖 | ⭐⭐⭐⭐ |
| watchEffect cleanup 竞态处理 | onCleanup 标记取消或 AbortController 真实取消，解决异步请求竞态 | ⭐⭐⭐⭐⭐ |
| reactive vs shallowReactive | reactive 递归代理所有层级，shallowReactive 只代理第一层，大数据性能优化 | ⭐⭐⭐⭐ |
| readonly / markRaw | readonly 防意外修改，markRaw 跳过响应式（第三方库实例、医学影像引擎） | ⭐⭐⭐ |
| effect 嵌套栈 | activeEffect 链式保存，finally 恢复上一个 effect，保证依赖收集正确性 | ⭐⭐⭐ |
| 分支切换 cleanup | trackId 递增标记，postCleanup 删除多余依赖，防止无效触发 | ⭐⭐⭐⭐ |
| _running 防递归 | triggerEffects 检查 _running 标记，避免 effect 内部修改自身依赖导致无限循环 | ⭐⭐⭐ |
| scheduler 调度器 | effect 可配置 scheduler，依赖变化时走自定义逻辑而非立即执行，Vue 组件异步更新队列底层 | ⭐⭐⭐⭐ |
| ObjectRefImpl vs GetterRefImpl | ObjectRefImpl 双向绑定对象属性，GetterRefImpl 只读 getter 函数(3.3+) | ⭐⭐⭐ |
| proxyRefs 自动解包 | Vue 3 模板编译器内部使用，访问 ref 自动 .value，赋值自动包装 | ⭐⭐⭐ |
| Collection 类型响应式 | forEach 内部回调响应式包装，迭代器返回新迭代器包装 value，ITERATE_KEY 统一追踪 | ⭐⭐⭐⭐ |

---

## 📌 八、手写源码仓库

完整的手写 Vue 3 响应式系统源码：https://github.com/lotosv2010/g-vue-next

---

## 📚 九、参考资料

- Vue 3 官方文档：https://cn.vuejs.org/guide/extras/reactivity-in-depth.html
- Vue 3 源码仓库（v3.4）：https://github.com/vuejs/core
- 手写 Vue 3 响应式系统：https://github.com/lotosv2010/g-vue-next
- Proxy 与 Reflect MDN：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy
- WeakMap 防止内存泄漏原理：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/WeakMap
- 响应式原理深度解析：https://jonny-wei.github.io/blog/vue/vue3/reactivity.html

---

## 📝 十、留个问题

**思考题**：假设你正在开发一个医疗影像查看器，每张影像的元数据（DICOM tags）有数百个字段，但 90% 的字段在渲染时不会被访问。这个场景应该用 `reactive()` 还是 `shallowReactive()`？为什么？如果用户突然展开「查看完整元数据」面板，怎么处理？

提示：
- 考虑初始化性能（递归代理的成本）
- 考虑运行时开销（深层监听的代价）
- 考虑用户体验（展开面板的响应速度）

欢迎在评论区分享你的思路，或者看看你的方案是否和 Vue DevTools 的实现一致 🤔

---

## 系列导航

> 🔖 这是「Vue 3 全家桶深度拆解系列」第 2 篇。
> 
> - 上一篇：《Vue 3 设计思想与整体架构：Monorepo + Tree-shaking + Composition API 三大革新》
> - 下一篇预告：《Vue 3 渲染原理与 Diff 算法：首次渲染/更新/卸载 + Block Tree + Patch Flags》

---

**关注公众号「Coding沉思录」，第一时间获取 Vue 3 全家桶系列更新！**


