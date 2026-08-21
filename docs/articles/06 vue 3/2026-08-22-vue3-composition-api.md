# Vue 3 Composition API 深度拆解：slots/emit/lifecycle/ref/provide-inject（面试收藏级）

> 面试官问：「`emit` 在 Composition API 里是怎么实现的？」你答：「`setup` 第二个参数里有个 `emit` 函数，调用它就能触发父组件监听的事件。」面试官追问：「那它内部是怎么找到父组件的处理函数的？和 Vue 2 的 `vm.$emit`、`vm._events` 有什么本质区别？」你顿了一下：「……好像不太一样。」

> 面试官继续：「`onMounted` 为什么必须写在 `setup` 里同步调用，放到 `setTimeout` 里就失效了？」再追一句：「`provide`/`inject` 底层是怎么保证子组件的 `provide` 不会污染兄弟组件的？」最后抛出一个新题：「Vue 3.4 的 `defineModel` 是怎么替代手写 `modelValue` + `emit('update:modelValue', ...)` 的？」

> ——这几个问题看似分散，其实都指向同一件事：Composition API 暴露给你的 `emit`、`slots`、生命周期钩子、模板 `ref`、`provide`/`inject`，底层都靠同一个隐藏的锚点串联起来，也就是第 4 篇讲过的 `currentInstance`。这篇文章是「Vue 3 全家桶深度拆解」系列第 5 篇，接着第 4 篇讲完的组件渲染链路，往下拆 `setup()` 执行期间到底发生了什么。

---

## 🎯 这篇文章解决什么问题

第 4 篇讲清楚了一个组件从 `setup()` 执行到生成真实 DOM 的完整链路，也顺带提到了 `instance.slots`、`instance.emit` 的最小实现，但故意留了一个坑没填——这些能力具体怎么做成 Composition API 里那些好用的函数（`emit`、`useSlots`、`onMounted`、模板 `ref`、`provide`/`inject`）？这篇文章要补上的，正是 `setup()` 内部这套函数为什么都能"感知"到当前组件实例、感知的机制是什么、以及 Vue 3.4 的 `defineModel` 这种编译宏是怎么进一步把样板代码消灭掉的。读完这篇文章，你会同时拿到两样东西：**懂原理**（Composition API 每一个函数底层依赖的同一个锚点机制）和**会讲**（面试官从 `emit` 问到 `provide`/`inject`，你都能用同一套逻辑串起来回答）。

---

## 🧩 一、基本使用

### `defineProps` / `defineEmits`：组件对外接口声明

`<script setup>` 里用编译宏声明组件对外的两个接口——能接收什么属性、能触发什么事件：

```vue
<script setup lang="ts">
interface Props {
  drugId: string
  quantity?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:quantity', value: number): void
  (e: 'remove', drugId: string): void
}>()

const increase = () => {
  emit('update:quantity', (props.quantity ?? 1) + 1)
}
</script>
```

`defineProps`/`defineEmits` 不需要 `import`，也不是真正的运行时函数——它们是编译器识别的宏，`<script setup>` 编译时会被整体替换成等价的选项式 `props`/`emits` 声明加上对 `setup(props, { emit })` 参数的引用（编译产物的具体样子留到第 07 篇《编译优化与模板编译原理》展开，这里只关心它和第 4 篇讲过的 Options 写法是同一件事的两种表达）：

```typescript
// 等价的 Options 写法（也是笔记 18/20 手写实现直接支持的形态）
const DrugSelector = {
  props: {
    drugId: { type: String, required: true },
    quantity: { type: Number, default: 1 }
  },
  emits: ['update:quantity', 'remove'],
  setup(props, { emit }) {
    const increase = () => {
      emit('update:quantity', props.quantity + 1)
    }
    return { increase }
  }
}
```

### `defineModel`（3.4+）：组件双向绑定的编译时宏

在 `defineProps` + `defineEmits('update:xxx', ...)` 这套组合拳之上，Vue 3.4 又加了一层语法糖——`defineModel`，把"声明一个 `modelValue` prop + 在值变化时 emit 一个 `update:modelValue` 事件"这套样板代码压缩成一行：

```vue
<!-- 药品数量选择器：QuantityStepper.vue -->
<script setup lang="ts">
const count = defineModel<number>({ default: 1 })

const increase = () => count.value++
const decrease = () => { if (count.value > 1) count.value-- }
</script>

<template>
  <button @click="decrease">-</button>
  <span>{{ count }}</span>
  <button @click="increase">+</button>
</template>
```

```vue
<!-- 父组件里像用本地状态一样使用 v-model -->
<QuantityStepper v-model="drugQuantity" />
```

`count` 是一个读写都合法的 `ref`——组件内部 `count.value++`，父组件绑定的 `drugQuantity` 就会同步更新，中间完全不需要手写 `props.modelValue` + `emit('update:modelValue', ...)`。对照没有 `defineModel` 之前的写法就能看出省了多少事：

```vue
<!-- Vue 3.4 之前：手写 modelValue + emit -->
<script setup lang="ts">
const props = defineProps<{ modelValue: number }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: number): void }>()

const increase = () => emit('update:modelValue', props.modelValue + 1)
const decrease = () => { if (props.modelValue > 1) emit('update:modelValue', props.modelValue - 1) }
</script>
```

`defineModel` 的编译原理放在「二、原理」小节展开，它本质就是上面这段手写样板代码的自动生成版本。

`defineModel` 还支持修饰符和自定义读写转换——父组件用 `v-model.trim="xxx"` 传修饰符时，组件内部可以通过解构第二个返回值拿到：

```vue
<script setup lang="ts">
// 第二个返回值是修饰符对象，{ trim: true } 表示父组件用了 v-model.trim
const [title, modifiers] = defineModel<string>({ default: '' })

if (modifiers.trim) {
  // 可以据此决定要不要在内部再做一次 trim
}
</script>
```

或者用 `get`/`set` 选项接管读写转换的时机，比 v-model 修饰符更灵活（比如把父组件传入的字符串数字统一转成 `number` 再用）：

```vue
<script setup lang="ts">
const count = defineModel<number>({
  set(value) {
    return Number(value) || 0 // 写入前统一转成数字
  }
})
</script>
```

### 插槽在 setup 中的访问：`context.slots` / `useSlots()`

`setup` 的第二个参数 `context` 里带着 `slots`，`<script setup>` 里没有这个参数，换成 `useSlots()` 组合式函数：

```typescript
// Options 风格 setup（第 4 篇、笔记 19 的写法）：通过 context.slots 访问
const DrugCard = {
  setup(props, { slots }) {
    return () => h('div', { class: 'drug-card' }, [
      slots.header ? slots.header({ title: '药品详情' }) : null,
      slots.default ? slots.default() : null,
    ])
  }
}
```

```vue
<!-- <script setup> 风格：useSlots() 组合式访问 -->
<script setup lang="ts">
import { useSlots } from 'vue'

const slots = useSlots()
const hasFooter = !!slots.footer
</script>

<template>
  <div class="drug-card">
    <slot name="header" :title="'药品详情'" />
    <slot />
    <slot v-if="hasFooter" name="footer" />
  </div>
</template>
```

父组件传插槽内容时，具名插槽用 `<template #插槽名>` 简写（`v-slot:header` 的缩写），作用域插槽通过 `="{ 解构参数 }"` 接收子组件传出的数据；不确定插槽名是动态的情况下还能写成 `#[dynamicSlotName]`：

```vue
<!-- 父组件：<template #name> 简写形式 -->
<DrugCard>
  <template #header="{ title }">
    <h3>{{ title }}</h3>
  </template>
  <template #default>
    <p>默认内容</p>
  </template>
  <template #[dynamicSlotName]>
    <p>动态插槽名，slotName 来自一个响应式变量</p>
  </template>
</DrugCard>
```

`useSlots()` 不是新造了一套插槽机制，只是把 `context.slots` 包了一层函数调用的壳子——因为 `<script setup>` 没有显式的 `context` 参数可以解构，需要一个从当前组件实例上取值的入口，这正是本文「二、原理」要讲的 Composable 机制的第一个例子。

### `useAttrs()`：非 props 属性的组合式访问

和 `useSlots()` 同一批 API，用来在 `<script setup>` 里访问没有被 `defineProps` 声明、因此透传下来的属性（class、style、原生事件、`data-*` 等）：

```vue
<script setup lang="ts">
import { useAttrs } from 'vue'

const attrs = useAttrs()
console.log(attrs.id, attrs.class) // 未在 defineProps 里声明的属性都在这里
</script>
```

### 生命周期钩子：与 Options API 的映射关系

Composition API 的生命周期钩子需要显式 `import`，和 Options API 的同名选项一一对应，但**创建阶段**被 `setup()` 本身取代，**卸载阶段**的命名也从 Vue 2 沿用下来的 `destroy` 改成了更直观的 `unmount`：

| Options API（`beforeCreate`/`created` 除外） | Composition API | 说明 |
| --- | --- | --- |
| `beforeCreate` / `created` | 直接写在 `setup()` 顶层 | `setup` 执行时机早于这两个钩子，代码直接写在这里即可，无需对应钩子 |
| `beforeMount` | `onBeforeMount` | 组件挂载到 DOM 之前 |
| `mounted` | `onMounted` | 组件挂载到 DOM 之后 |
| `beforeUpdate` | `onBeforeUpdate` | 响应式数据变化后、DOM 重新渲染之前 |
| `updated` | `onUpdated` | DOM 重新渲染完成之后 |
| `beforeDestroy` | `onBeforeUnmount` | 组件卸载之前（**Vue 3 改名**：destroy → unmount） |
| `destroyed` | `onUnmounted` | 组件卸载之后（**Vue 3 改名**：destroy → unmount） |
| `errorCaptured` | `onErrorCaptured` | 捕获子组件抛出的错误 |
| `activated` / `deactivated` | `onActivated` / `onDeactivated` | 配合 `<KeepAlive>` 使用 |

```typescript
import { ref, onMounted, onUnmounted } from 'vue'

export default {
  setup() {
    const count = ref(0)
    let timer: number

    onMounted(() => {
      timer = window.setInterval(() => count.value++, 1000)
    })
    onUnmounted(() => {
      clearInterval(timer)
    })

    return { count }
  }
}
```

`<script setup>` 中直接使用，无需 `return`：

```vue
<script setup>
import { onMounted } from 'vue'
onMounted(() => { console.log('挂载完成') })
</script>
```

### 模板引用：`const el = ref(null)` 绑定 DOM 元素或子组件实例

```typescript
import { ref, onMounted, getCurrentInstance, h } from 'vue'

const Modal = {
  props: { name: String },
  setup(props, ctx) {
    const age = ref(18)
    const add = () => { age.value++ }
    // 只暴露 age 和 add，父组件拿到的模板引用只能访问这两个成员
    ctx.expose({ age, add })
    return () => h('div', {}, `${props.name}, ${age.value}`)
  }
}

const App = {
  setup() {
    const comp = ref(null) // 变量名不强制要求和某个字符串一致，直接绑定 ref 对象即可
    onMounted(() => {
      console.log(comp.value) // { age, add }，而不是完整的组件实例
    })
    return () => h('div', {}, [
      h(Modal, { name: 'modal', ref: comp }),
      h('button', { onClick: () => comp.value.add() }, 'add child age')
    ])
  }
}
```

`<script setup>` 下更常见的写法是 `defineExpose`，作用与上面的 `ctx.expose` 完全一致，只是同样以编译宏的形式出现，不需要从 `context` 里解构：

```vue
<script setup lang="ts">
import { ref } from 'vue'
const age = ref(18)
const add = () => age.value++
defineExpose({ age, add })
</script>
```

### 函数式组件：没有实例的轻量组件形态

前面几个小节讲的所有能力（生命周期、模板引用、`provide`/`inject`）都建立在"组件有一个 `setup()` 执行期、有一个 `currentInstance`"这个前提上。函数式组件是个例外——它就是一个普通函数，接收 `props` 和 `context`，直接返回 VNode，没有 `data`、没有 `setup`、没有实例、没有 `this`：

```typescript
import { h } from 'vue'

// 函数式组件：药品分类标签，纯展示，无状态
const DrugTag = (props: { name: string; type: 'otc' | 'rx' }) => {
  return h('span', { class: `tag tag-${props.type}` }, props.name)
}

// 使用方式和普通组件完全一样
h(DrugTag, { name: '处方药', type: 'rx' })
```

`<script setup>` 场景下，只要一个组件的模板只依赖 `props` 渲染、没有任何响应式状态和生命周期需求，也可以用返回渲染函数的方式达到同样效果：

```typescript
// <script setup> 语境下等价的"事实上的函数式"写法
import { h } from 'vue'

export default function DrugTagFn(props: { name: string; type: 'otc' | 'rx' }) {
  return h('span', { class: `tag tag-${props.type}` }, props.name)
}
```

因为没有实例，函数式组件内部**不能**调用 `onMounted`/`provide`/`inject` 这类依赖 `currentInstance` 的 API——这也是判断"什么时候该用函数式组件"的边界：只在纯展示、只依赖 `props`、不需要响应式状态和生命周期的场景使用（比如列表里大量重复渲染的行组件），一旦需要状态或副作用管理，就应该换回普通的有状态组件。

### `provide` / `inject`：跨层级依赖注入的组合式写法

```vue
<!-- 祖先组件：提供患者上下文 -->
<script setup lang="ts">
import { provide, ref } from 'vue'

const currentPatient = ref({ id: 'p001', name: '张三' })
provide('patient', currentPatient)
</script>
```

```vue
<!-- 任意深度的子孙组件：注入患者上下文 -->
<script setup lang="ts">
import { inject } from 'vue'

const patient = inject('patient')
</script>

<template>
  <p>当前患者：{{ patient?.name }}</p>
</template>
```

字符串 key 在大型项目里容易和其他模块的 `provide` 撞名，官方推荐用 `Symbol` 作为 key，配合 `InjectionKey<T>` 泛型接口，`inject` 时能拿到精确的类型推断，不用手写类型标注：

```typescript
// keys.ts：集中管理注入 key，避免字符串硬编码冲突
import type { InjectionKey, Ref } from 'vue'

export const PatientKey: InjectionKey<Ref<{ id: string; name: string }>> = Symbol('patient')
```

```vue
<!-- 祖先组件 -->
<script setup lang="ts">
import { provide, ref } from 'vue'
import { PatientKey } from './keys'

provide(PatientKey, ref({ id: 'p001', name: '张三' })) // value 类型被 InjectionKey 约束
</script>
```

```vue
<!-- 子孙组件 -->
<script setup lang="ts">
import { inject } from 'vue'
import { PatientKey } from './keys'

const patient = inject(PatientKey) // 自动推断为 Ref<{ id, name }> | undefined，无需手写类型
</script>
```

组件树内的 `provide` 只对该组件及其子孙生效；如果要在**整个应用范围**（跨越多个根组件、或者在没有共同祖先组件的场景）提供依赖，用应用实例上的 `app.provide()`：

```typescript
// main.ts：应用级 provide，所有组件都能 inject 到，不需要在根组件里额外写一次 provide()
import { createApp } from 'vue'

const app = createApp(App)
app.provide('apiBaseURL', 'https://api.medai.example.com')
app.mount('#app')
```

### Composables 设计模式：`use` 前缀命名约定

把一段有状态的逻辑抽成一个独立函数，函数名以 `use` 开头，返回响应式状态和方法：

```typescript
import { ref, onUnmounted } from 'vue'

// use 前缀 + 返回响应式状态/方法，是 Composable 的命名与设计约定
function usePatientSearch() {
  const keyword = ref('')
  const results = ref<{ id: string; name: string }[]>([])

  const search = async () => {
    results.value = await fetchPatients(keyword.value)
  }

  return { keyword, results, search }
}
```

```vue
<script setup lang="ts">
const { keyword, results, search } = usePatientSearch()
</script>
```

一个 Composable 就是一个普通函数，之所以能在组件间复用而不互相污染状态，是因为每次调用都会创建一份全新的闭包变量（`keyword`、`results` 各自独立）——这也是「二、原理」要讲的核心内容。

---

## 🧩 二、原理

### 1. `emit` 实现：从 `onXxx` 查找到独立文件

第 4 篇给出的 `emit` 是内联在 `createSetupContext` 里的一个闭包函数，笔记 20 把它拆成了独立的 `componentEmits.ts`，并加上了卸载后的拦截：

```typescript
import { camelize, EMPTY_OBJ, toHandlerKey } from "@g-vue-next/shared";
import { ComponentInternalInstance } from "./component";

export function emit(
  instance: ComponentInternalInstance,
  event: string,
  ...rawArgs: any[]
) {
  if (instance.isUnmounted) return
  // 获取组件
  const props = instance.vnode.props || EMPTY_OBJ
  const args = rawArgs
  const handler = props[toHandlerKey(camelize(event))]
  handler && handler(...args)
}
```

`instance.emit = emit.bind(null, instance)` 在 `createComponentInstance` 阶段就完成绑定（而不是每次 `setup` 执行时现造一个闭包），`toHandlerKey(camelize(event))` 把事件名统一转成 `onXxx` 的形式（比如 `'age-change'` → `camelize` → `'ageChange'` → `toHandlerKey` → `'onAgeChange'`），去父组件传下来的 `vnode.props` 里找对应的处理函数并调用——`emit` 的本质就是"在 `props` 里找一个约定命名的函数并执行它"，没有真正的事件总线、没有订阅发布机制。

> **对比 Vue 2**：Vue 2 的 `vm.$emit` 依赖组件实例上的 `vm._events`——这是一个真正的事件订阅表，父组件用 `v-on`/`@` 监听子组件事件时，Vue 会在子组件初始化阶段（`initEvents`）把父组件传入的事件处理函数注册进 `vm._events[eventName]` 数组，`$emit` 触发时遍历这个数组逐个调用，属于经典的**发布订阅模式**，还支持 `$off` 精确解绑某个监听器。

> Vue 3 的 `emit` 完全抛弃了这套订阅表——父组件传下来的 `onXxx` 就是普通 `props` 的一部分（`vnode.props.onMyClick`），`emit` 只是去 `props` 里按约定命名找函数直接调用，没有独立的事件登记簿。这个改动的动机是 Composition API 下 `emits` 选项本身就承担了"事件声明"的角色，`v-on` 监听器和普通 `props` 在底层用同一套 `mergeProps`/透传机制处理（第 4 篇讲过 `attrs` 的透传逻辑），不需要再单独维护一份订阅表，模型更简单，也天然支持"事件其实就是一种特殊的 prop"这个 Vue 3 内部的统一视角。

### 2. `slots` 实现：插槽函数对象与统一的编译产物

父组件在调用子组件时，传入的第三个参数直接就是一个"插槽函数对象"，子组件通过 `instance.slots` 拿到这个对象、调用对应的函数生成 VNode：

```typescript
// 父组件调用方式（笔记 19）
render(h(App, { foo: 'foo' }, {
  default: () => h('div', 'default '),
  header: ({ title }) => h('div', 'hello ' + title), // 作用域插槽：接收子组件传出的数据
  footer: () => h('div', 'footer')
}), app)
```

```typescript
// 子组件内访问：this.$slots.header({title}) 是"调用插槽函数生成 VNode"
render() {
  return h('div', {}, [
    this.$slots.header({ title: 'vue3' }),
    this.$slots.default(),
    this.$slots.footer(),
  ])
}
```

关键点是：**普通插槽和作用域插槽在这套实现里没有语法差异**——都是"调用一个函数、可选传参、拿到返回的 VNode"，`header` 插槽多传了一个 `{title}` 参数就是作用域插槽，`default`/`footer` 不传参数调用就是普通插槽。`initSlots` 只是简单地把整个插槽对象挂到 `instance.slots` 上（判断依据是 `ShapeFlags.SLOTS_CHILDREN`，这个标记在 `vnode.ts` 的 `createBaseVNode` 里，子节点是对象类型时打上）：

```typescript
export const initSlots = (
  instance: ComponentInternalInstance,
  children: VNodeNormalizedChildren
) => {
  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    instance.slots = children as any
  }
}

export const updateSlots = (
  instance: ComponentInternalInstance,
  children: VNodeNormalizedChildren
) => {
  Object.assign(instance.slots, children)
}
```

`useSlots()` 组合式写法只是在这个基础上包了一层取值逻辑——从 `getCurrentInstance()` 拿到当前实例，返回 `instance.slots`：

```typescript
export function useSlots() {
  return getCurrentInstance()?.slots
}
```

> **对比 Vue 2**：Vue 2 的普通插槽和作用域插槽走的是两套不同的编译产物和访问方式——普通插槽内容在父组件编译阶段就生成好 VNode 数组，存进 `vnode.children`，子组件通过 `this.$slots.default` 直接拿到**已经渲染好的 VNode 数组**；作用域插槽则编译成一个函数，存进 `vnode.data.scopedSlots`，子组件要通过 `this.$scopedSlots.xxx(props)` **调用**才能拿到 VNode，因为作用域插槽需要子组件传参数进去，编译时不可能提前渲染好。这意味着 Vue 2 代码里经常要同时处理 `$slots` 和 `$scopedSlots` 两套 API，心智负担不小。

> Vue 3 把这两者统一成了同一种形态——**所有插槽都编译成函数**，`$slots.default()` 和作用域插槽的调用方式完全一致，只是普通插槽的函数不需要传参数。这个统一直接体现在上面的源码里：不管有没有作用域参数，`instance.slots` 里存的都是函数，访问方式没有任何分支判断。

### 3. `useAttrs` 实现：和 `useSlots` 同源的取值壳子

`useAttrs()` 和 `useSlots()` 是同一批组合式访问入口，笔记 18 手写 `setup` 时就已经在 `createSetupContext` 里把 `instance.attrs` 挂到了 `context.attrs` 上——`useAttrs()` 要做的事情，和 `useSlots()` 一模一样：从 `getCurrentInstance()` 拿到当前实例，取一个字段返回：

```typescript
export function useAttrs(): Record<string, unknown> {
  return getCurrentInstance()?.attrs ?? EMPTY_OBJ
}

export function useSlots() {
  return getCurrentInstance()?.slots
}
```

这里 `instance.attrs` 具体是什么——第 4 篇讲过，`initProps` 阶段没有落进 `props` 声明表的属性会被归进 `attrs`（比如父组件传了 `id`、`data-testid` 但子组件没有在 `defineProps` 里声明，这俩就会出现在 `attrs` 里，而不是 `props` 里）：

```vue
<!-- 子组件没有声明 id，父组件传的 id 会落进 attrs，透传到根元素 -->
<script setup lang="ts">
import { useAttrs } from 'vue'

const attrs = useAttrs()
console.log(attrs.id) // 'drug-card-01'
</script>
```

`useAttrs()`/`useSlots()` 存在的意义完全一样：`<script setup>` 没有显式的 `context` 参数可以解构 `attrs`/`slots`，需要一个从当前组件实例上取值的组合式入口。

> **对比 Vue 2**：Vue 2 用 `this.$attrs` 直接从组件实例上取值，不需要额外的函数调用；Vue 3 Composition API 因为没有 `this`，只能靠 `useAttrs()` 这类基于 `currentInstance` 的组合式函数达到同样的效果——这也是 Composition API 里一类典型的模式：Options API 时代挂在 `this` 上的能力，到了 Composition API 全部变成了"从 `getCurrentInstance()` 取值"的函数。

### 4. 生命周期钩子实现：依赖收集式的钩子注册

`onMounted` 等函数的实现思路是"把回调函数塞进当前组件实例的某个数组里，组件生命周期跑到对应阶段时依次调用这个数组"。第一步是给每个钩子分配一个数组的 key：

```typescript
export enum LifecycleHooks {
  BEFORE_CREATE = 'bc',
  CREATED = 'c',
  BEFORE_MOUNT = 'bm',
  MOUNTED = 'm',
  BEFORE_UPDATE = 'bu',
  UPDATED = 'u',
  BEFORE_UNMOUNT = 'bum',
  UNMOUNTED = 'um',
  DEACTIVATED = 'da',
  ACTIVATED = 'a',
  RENDER_TRIGGERED = 'rtg',
  RENDER_TRACKED = 'rtc',
  ERROR_CAPTURED = 'ec',
  SERVER_PREFETCH = 'sp'
}
```

`injectHooks`/`createHook` 是核心——`createHook` 用柯里化生成 `onMounted`/`onUpdated` 这些具体函数，`injectHooks` 负责真正把回调塞进 `target[type]` 数组，并且用一层 `wrapperHook` 包装原始回调，保证钩子执行时 `currentInstance` 被正确校正到"当时收集这个钩子的那个组件实例"：

```typescript
export const injectHooks = (
  type: LifecycleHooks,
  hook: Function,
  target: ComponentInternalInstance | null = currentInstance,
  prepend = false
) => { 
  if (target) {
    // 获取当前组件实例中的生命周期函数
    const hooks = target[type] || (target[type] = [])
    // 利用闭包，将hook函数进行包装，包装后的函数会打印出当前组件实例
    const wrapperHook: any = () => {
      // 钩子执行前，对实例进行校正处理
      const reset = setCurrentInstance(target)
      // 钩子执行
      hook.call(target)
      // 钩子执行后，恢复实例
      reset()
    }
    if(prepend) {
      hooks.unshift(wrapperHook)
    } else {
      hooks.push(wrapperHook)
    }
  }
}

export const createHook = <T extends Function = () => any>(lifecycle: LifecycleHooks) => {
  return (
    hook: T, 
    target: ComponentInternalInstance | null = currentInstance // 将当前实例关联到此钩子上
  ) => injectHooks(lifecycle, (...args: unknown[]) => hook(...args), target)
}

export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
export const onMounted = createHook(LifecycleHooks.MOUNTED)
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE)
export const onUpdated = createHook(LifecycleHooks.UPDATED)
export const onBeforeUnmount = createHook(LifecycleHooks.BEFORE_UNMOUNT)
export const onUnmounted = createHook(LifecycleHooks.UNMOUNTED)
```

渲染器在挂载/更新/卸载对应的时机，用 `invokeArrayFns` 依次执行这些数组（第 4 篇讲过的 `setupRenderEffect`，这里补上生命周期钩子调用的部分）：

```typescript
if (!instance.isMounted) {
  if (bm) invokeArrayFns(bm)          // beforeMount
  const subTree = (instance.subTree = render.call(instance.proxy, instance.proxy))
  patch(null, subTree, container, anchor, null, parentSuspense, namespace)
  instance.isMounted = true
  if (m) invokeArrayFns(m)            // mounted
} else {
  const { bu, u } = instance
  if (bu) invokeArrayFns(bu)          // beforeUpdate
  // ...重新渲染、patch...
  if (u) invokeArrayFns(u)            // updated
}
```

**为什么 `onMounted` 必须在 `setup` 同步执行期间调用**：`injectHooks` 里 `target` 参数默认值是 `currentInstance`——这是一个模块级的全局变量，只有在 `setupStatefulComponent` 执行 `setup(props, context)` 前后，才会被 `setCurrentInstance(instance)`/`unsetCurrentInstance()` 短暂设置成"当前正在初始化的这个组件实例"。如果 `onMounted` 被放进 `setTimeout` 或者 `await` 之后的异步代码里，等它真正执行的时候，`setup` 早就跑完了，`currentInstance` 早就被 `unsetCurrentInstance()` 清空成 `null`——`injectHooks` 里 `if (target)` 判断为假，回调直接被静默丢弃，钩子形同虚设。

> **对比 Vue 2**：Vue 2 的生命周期钩子是**选项**，不是函数调用——`created()`/`mounted()` 直接写在组件定义对象里，框架在 `_init` 阶段通过 `callHook(vm, 'created')` 按 `vm.$options.created` 直接找到并调用，压根不需要"收集"这一步，因为钩子从一开始就静态挂在组件选项对象上，和组件实例是一一对应的。

> Vue 3 的 Composition API 钩子是**函数调用**，同一个 `onMounted` 函数在不同组件的 `setup` 里被调用多次，怎么知道"这次调用是哪个组件在注册钩子"？答案就是上面这套基于 `currentInstance` 全局变量的**依赖收集机制**——框架在执行某个组件的 `setup` 前，先把这个组件实例"挂"到全局，`setup` 内部所有同步调用的 `onXxx` 函数才能顺着这个全局变量找到"我应该注册到哪个实例上"。这也是为什么 Composable 函数（下文会讲）可以在内部调用生命周期钩子而不需要显式传组件实例——闭包访问的是这个全局变量，而不是参数传递。

### 5. 组合式 `ref`：模板引用如何回填到 setup 变量

`patch` 函数在处理完节点（元素或组件）之后，会检查这个 VNode 是否声明了 `ref`，有的话调用 `setRef` 把真实 DOM 或组件公开实例写回 ref 对象的 `.value`：

```typescript
// patch 函数末尾（第 4 篇讲过 patch 主流程，这里补上 ref 处理）
if (!isNil(ref)) {
  setRef(ref, n1 && n1.ref, parentSuspense, n2 || n1, !n2)
}
```

```typescript
export function setRef(
  rawRef: VNodeNormalizedRef,
  oldRawRef: VNodeNormalizedRef | null,
  parentSuspense: any | null,
  vnode: VNode,
  isUnmount = false
) {
  const refValue = 
    vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
      ? getComponentPublicInstance(vnode.component!)  // 组件：拿公开实例（exposed 或 proxy）
      : vnode.el;                                      // 元素：拿真实 DOM
  const value = isUnmount ? null : refValue;
  const { i: owner, r: ref } = rawRef as VNodeNormalizedRefAtom;

  if (isRef(ref)) {
    ref.value = value;
  }
}
```

这里的关键在 `getComponentPublicInstance`——如果子组件调用过 `expose()`/`defineExpose()`，父组件拿到的模板引用就只是 `exposed` 对象（只有被显式暴露的成员能访问到）；如果子组件没有调用 `expose()`，退而求其次返回 `instance.proxy`（等价于能访问到组件内部几乎所有状态，和不做任何限制差不多）：

```typescript
export function getComponentPublicInstance(
  instance: ComponentInternalInstance
) {
  if (instance.exposed) {
    // 这里简化了源码
    return instance.exposed
  } else {
    return instance.proxy
  }
}
```

`ref` 属性本身在 VNode 创建阶段（`createBaseVNode`）就被 `normalizeRef` 处理成统一结构，绑定的是"当前正在执行 `setup` 的那个组件实例"（同样依赖 `currentInstance`）：

```typescript
const normalizeRef = ({
  ref,
  ref_key,
  ref_for,
}: VNodeProps): VNodeNormalizedRefAtom | null => {
  if (typeof ref === 'number') {
    ref = '' + ref
  }
  return (ref != null
    ? isString(ref) || isRef(ref) || isFunction(ref)
      ? { i: currentInstance, r: ref, k: ref_key, f: !!ref_for }
      : ref
    : null
  ) as any
}
```

> **对比 Vue 2**：Vue 2 的模板引用靠字符串 `ref="xxx"` + `this.$refs.xxx` 访问，`$refs` 是一个运行时按需收集的对象，不需要提前在组件里声明任何变量，取值时也没有类型提示（`$refs.xxx` 的类型是 `any`）。

> Vue 3 Composition API 要求先 `const el = ref(null)`，再把这个 `ref` 对象绑定到模板的 `ref` 属性上——多了一步显式声明，但换来的是完整的 TypeScript 类型推断（`el` 的类型可以精确到具体的 DOM 元素类型或组件实例类型），以及不再需要一个隐式的、挂在 `this` 上的 `$refs` 集合对象。这个变化和 `defineProps`/`setup(props, context)` 是同一种设计思路的延伸——把隐式的、运行时才确定的东西，换成显式的、可以静态分析的声明。

### 6. `provide`/`inject` 实现：原型链继承 provides

`provide` 往 `currentInstance.provides` 上挂键值对，`inject` 沿着父组件链一路往上找：

```typescript
export function provide<T, K = InjectionKey<T> | string | number>(
  key: K,
  value: K extends InjectionKey<infer V> ? V : T
) {
  if (!currentInstance) {
    console.warn(`provide() can only be used inside setup() .`)
  } else {
    // 获取当前组件实例的 provides
    let provides = currentInstance.provides
    // 获取父级组件实例的 provides
    const parentProvides = currentInstance?.parent?.provides
    // 如果当前组件实例的 provides 和 父级组件实例的 provides 相同，则创建一个新的 provides
    if (parentProvides === provides) {
      provides = currentInstance.provides = Object.create(parentProvides)
    }
    // 将 key 和 value 添加到 provides 中
    provides[key as string] = value
  }
}
```

```typescript
export function inject(
  key: InjectionKey<any> | string,
  defaultValue?: any,
  treatDefaultAsFactory = false
) {
  const instance = currentInstance
  if (instance) {
    const provides = instance
    ? instance.parent
      ? instance.parent.provides 
      : instance.provides 
    : null
    if (provides &&(key as string in provides)) {
      return provides[key as string]
    } else if (arguments.length > 1) {
      return treatDefaultAsFactory && isFunction(defaultValue)
        ? defaultValue.call(instance && instance.proxy)
        : defaultValue
    } else {
      console.warn(`injection "${String(key)}" not found.`)
    }
  } else {
    console.warn(`inject() can only be used inside setup() or functional components.`)
  }
}
```

关键设计在 `createComponentInstance` 里的这一行——组件实例创建时，`provides` 默认**直接复用父组件的 `provides` 引用**，而不是新建一个空对象：

```typescript
provides: parent ? parent.provides : Object.create(null),
```

只有当某个组件自己调用了 `provide()`，才会触发 `parentProvides === provides` 这个判断为真，用 `Object.create(parentProvides)` 创建一个**以父级 `provides` 为原型**的新对象，后续这个组件（以及它的子孙）的 `provide` 都写到这个新对象上，不会影响父级和兄弟组件。`inject` 查找时依赖的正是原型链的自动向上查找——`provides[key as string in provides]` 这个 `in` 判断，如果当前对象没有这个 key，JS 引擎会自动沿原型链往上找，直到找到或者到达 `Object.create(null)` 的顶层。

> **对比 Vue 2**：Vue 2 从 2.2 版本就已经有了 `provide`/`inject`（并不是 Vue 3 独占的新能力），但 Vue 2 里没有一套像 Vue 3 这样清晰的"原型链复用"实现文档化说明，更常见的实现方式是每个组件实例维护自己的 `_provided` 对象，`inject` 时通过 `while (source)` 循环手动遍历 `$parent` 链逐层查找。

> Vue 3 用原型链取代手动循环查找，带来两个好处：一是**性能**——`in` 操作符查找原型链是 JS 引擎原生支持的能力，比手写循环遍历组件树更快；二是**天然的覆盖语义**——子组件 `provide` 同名 key 时，`Object.create(parentProvides)` 生成的新对象在自己身上直接有这个属性，属性查找会优先命中"自己身上的"而不是原型链上的，不需要额外写覆盖逻辑，`provide('name', 'Robin')` 覆盖父级 `provide('name', 'Join')` 就是原型链属性遮蔽（shadowing）的原生行为。

### 7. 函数式组件为什么不能用 `currentInstance` 相关 API：一个边界案例

函数式组件是 Composition API 这套"靠 `currentInstance` 串联一切"机制的一个天然反例——它只是一个 `(props, context) => VNode` 的普通函数，没有 `setup()`、没有组件实例，自然也没有生命周期钩子和 `provide`/`inject`。它的完整实现（`isFunction(type)` 判定、`renderComponentRoot` 渲染分流、对比 Vue 2 `functional: true`）第 4 篇「二、原理」第 9 小节、「三、源码解析」`componentRenderUtils.ts` 已经讲透了，这里不重复贴代码，只补一句和本文主线相关的结论：`renderComponentRoot` 的函数式组件分支里，第一个参数直接传的是 `props`/`attrs`，`this` 全程是 `undefined`——这意味着渲染函数执行期间根本没有创建、也没有激活任何组件实例，`currentInstance` 始终是 `null`。对照上一小节"`onMounted` 必须在 `setup` 同步期间调用"的结论，函数式组件连 `setup` 这一步都跳过了，本文接下来要讲的 `provide`/`inject`、Composable，全都不能用在函数式组件里。

### 8. Composable 函数本质：闭包持有的普通函数

回到「一、基本使用」里的 `usePatientSearch`——它没有任何特殊语法，就是一个会被调用、返回一些响应式变量和方法的普通函数：

```typescript
function usePatientSearch() {
  const keyword = ref('')          // 每次调用 usePatientSearch()，这里都创建一个全新的 ref
  const results = ref([])
  const search = async () => { results.value = await fetchPatients(keyword.value) }
  return { keyword, results, search }
}
```

之所以能在 `usePatientSearch` 内部调用 `onMounted`/`onUnmounted` 这类生命周期 API，是因为 `usePatientSearch()` 这次调用，发生在**某个组件的 `setup()` 同步执行期间**——`currentInstance` 此时已经被设置成了那个组件的实例，`usePatientSearch` 内部调用 `onMounted` 时，`injectHooks` 默认参数 `target = currentInstance` 拿到的仍然是这同一个实例。Composable 函数并不"知道"自己被哪个组件调用，它只是恰好运行在正确的全局上下文里——这也解释了为什么 Composable **不能**在 `setTimeout`、`Promise.then` 之类异步回调里首次调用（此时 `setup` 早已同步执行完毕，`currentInstance` 已被清空）。

### 9. Composable 的两种状态模式：调用时创建 vs 模块作用域共享

前面所有例子里的 Composable，每次调用都会重新执行一遍函数体、创建一份全新的闭包状态——`usePatientSearch()` 在组件 A 和组件 B 里各调用一次，两边拿到的 `keyword`/`results` 是完全独立的两个 `ref`，互不干扰。但这只是 Composable 状态设计的一种模式，官方 Composables 指南里明确区分了两种截然不同的写法：

```typescript
// 模式一：每次调用创建新状态（本文前面用的都是这种）
// ref 声明在函数体内部，每次调用 useXxx() 都是一次全新的闭包
function usePatientSearch() {
  const keyword = ref('')       // 每次调用都是一个新的 ref
  const results = ref([])
  return { keyword, results, search }
}
```

```typescript
// 模式二：模块作用域共享状态（全局单例）
// ref 声明挪到函数外部，所有调用方共享同一个引用
const currentUser = ref<{ id: string; name: string } | null>(null)

function usePatientSession() {
  const login = (user: typeof currentUser.value) => { currentUser.value = user }
  const logout = () => { currentUser.value = null }
  // 注意：这里返回的是同一个 currentUser，不是每次调用都新建
  return { currentUser, login, logout }
}
```

两种模式的取舍很直接——**要不要跨组件共享同一份状态**：像患者搜索关键词、药品库存这类"每个使用它的组件应该各管各的"的状态，必须用模式一，否则 A 组件改了关键词，B 组件的搜索框也会跟着变；像当前登录用户、全局主题这类"整个应用应该只有一份"的状态，必须用模式二，把 `ref` 创建挪到 Composable 函数体外部（模块顶层），所有组件调用 `usePatientSession()` 拿到的都是同一个 `currentUser` 引用。这也是 Composable 和 Vuex/Pinia 之类状态管理库的边界——一个用模块作用域共享状态的 Composable，本质上已经是一个手写的极简全局 store，规模再大一些，就应该换成第 09 篇会讲到的 Pinia。

> **一个常见的坑：`reactive()` 对象作为 Composable 返回值，解构会丢失响应性**——`reactive()` 创建的是一个 Proxy 对象，响应性绑定在这个对象引用本身上，一旦解构出单个属性（`const { stock } = state`），拿到的就是一个脱离了 Proxy 拦截的普通值快照，之后 `state.stock` 变化，解构出来的 `stock` 变量不会跟着变。

> 这正是为什么本文所有 Composable 返回值全都用 `ref` 而不是 `reactive`——`toRefs()`（笔记 07 手写实现）就是为了解决这个问题存在的：把一个 `reactive` 对象的每个属性转换成独立的 `ref`，解构出来的每一个字段依然各自持有响应性：

```typescript
 // ❌ 错误：reactive 对象直接返回，解构后丢失响应性
 function useDrugInventoryBad() {
   const state = reactive({ stock: 0, loading: false })
   return state
 }
 const { stock } = useDrugInventoryBad() // stock 是快照值，不会再更新

 // ✅ 正确：toRefs() 转换后再返回，或者干脆分别用多个 ref
 function useDrugInventoryGood() {
   const state = reactive({ stock: 0, loading: false })
   return toRefs(state) // 解构出来的每个字段依然是响应式 ref
 }
 const { stock } = useDrugInventoryGood() // stock 是 ref，.value 会同步更新
```

### 10. Composable 参数响应式：`toValue()` 统一处理

Composable 的参数经常需要同时兼容"传一个普通值"和"传一个 `ref`"两种调用方式，Vue 3.3+ 提供 `toValue()` 统一取值：

```typescript
import { toValue, type MaybeRefOrGetter } from 'vue'

function useDrugInventory(drugId: MaybeRefOrGetter<string>) {
  const stock = ref(0)
  watchEffect(async () => {
    // toValue 会自动解包 ref、执行 getter 函数、或者原样返回普通值
    stock.value = await fetchStock(toValue(drugId))
  })
  return { stock }
}

// 三种调用方式都成立
useDrugInventory('drug-001')                 // 普通字符串
useDrugInventory(ref('drug-001'))            // ref
useDrugInventory(() => selectedDrugId.value) // getter 函数，可以随外部状态变化
```

`toValue` 的实现思路很直接——是函数就调用它拿返回值，是 `ref` 就取 `.value`，否则原样返回：

```typescript
export function toValue(source) {
  return isFunction(source) ? source() : unref(source)
}
```

在 `toValue` 出现之前，这类兼容逻辑需要每个 Composable 自己手写 `isRef(x) ? x.value : x` 的判断，`toValue` 把它统一成了一个内置工具函数。

### 11. 与 React Hooks 的本质区别：闭包引用 vs 调用顺序

Vue Composable 和 React 自定义 Hook 看起来都是"以 `use` 开头的函数、封装状态逻辑"，但底层状态关联方式完全不同：

```typescript
// Vue Composable：状态是闭包里的一个 ref 对象，多次渲染访问的是同一个引用
function useCounter() {
  const count = ref(0) // count 这个 ref 对象本身，从创建到销毁都是同一个引用
  const increment = () => count.value++
  return { count, increment }
}
```

```jsx
// React Hook：状态靠调用顺序在多次渲染之间"对应"起来
function useCounter() {
  const [count, setCount] = useState(0) // 每次组件重渲染，useCounter 都会重新执行一遍
  const increment = () => setCount(c => c + 1)
  return { count, increment }
}
```

React 组件每次重渲染，函数体（包括调用的每一个 Hook）都会**重新整体执行一遍**，`useState` 依靠"这是本次渲染里第几次调用 `useState`"这个调用顺序，去内部一个数组结构里找到上一次渲染遗留下来的状态值——这就是为什么 React Hooks 有那条著名的规则："不能在条件语句或循环里调用 Hook"，因为一旦某次渲染的调用顺序和上次不一致，状态和 Hook 调用就会错位对应。Vue 的响应式状态是一个**独立于渲染函数存在的对象**（`ref`/`reactive` 创建的代理对象），组件重渲染只是重新执行 `render`/模板编译产物这一段代码，`setup()` 本身**只在组件创建时执行一次**，`count` 这个 `ref` 对象在整个组件生命周期里只创建一次，之后所有的读写都是同一个引用上的操作，不存在"用调用顺序对应状态"这回事，自然也就没有"不能在 `if` 里用" 这条限制。

> **一句话总结这个区别**：React Hooks 靠**调用顺序**在多次函数执行之间重新找回状态；Vue Composable 靠**闭包**让状态从一开始就和某个响应式对象绑死，函数只执行一次，状态本身活在函数作用域之外（准确说是活在这个响应式对象里，`setup` 函数执行完之后，这个 `ref` 依然被返回值、依然被模板编译产物的渲染函数持续引用着）。

### 12. `defineModel` 编译原理：`defineProps` + `defineEmits` 的语法糖

`defineModel<number>({ default: 1 })` 在编译阶段会被展开成两部分：一个 `modelValue` prop 声明，加一个返回值是"读写都合法的 `ref`"的运行时辅助函数调用。等价的手写展开大致是这样（真实编译产物细节留给第 07 篇《编译优化与模板编译原理》，这里只讲清楚思路）：

```typescript
// defineModel<number>({ default: 1 }) 编译后大致等价于：
const props = defineProps({
  modelValue: { type: Number, default: 1 }
})
const emit = defineEmits(['update:modelValue'])

// customRef：get 时读 props.modelValue，set 时 emit 一个 update 事件
const count = customRef((track, trigger) => ({
  get() {
    track()
    return props.modelValue
  },
  set(value) {
    emit('update:modelValue', value)
    trigger()
  }
}))
```

这就是为什么组件内部 `count.value++` 能够"看起来"像修改本地状态一样，实际效果却是通知父组件更新——`count` 这个 `ref` 的 `get`/`set` 被自定义成了"读 `props`、写就 `emit`"，对使用者屏蔽了背后的 `props` + `emit` 两步操作。这和第 07 篇会讲的编译器宏擦除机制是同一件事——`defineModel`/`defineProps`/`defineEmits` 在最终生成的代码里都不存在，全部被替换成了对应的运行时选项和辅助函数调用。

> **对比 Vue 2**：Vue 2 的自定义组件 `v-model` 默认绑定 `value` prop + 监听 `input` 事件（`v-model="foo"` 等价于 `:value="foo" @input="foo = $event"`），要改绑定的 prop/事件名需要 `model: { prop: 'checked', event: 'change' }` 选项，一个组件同时只能有一个默认 `v-model`。

> Vue 3 把默认 prop 名换成了 `modelValue`、事件名换成 `update:modelValue`，并且**原生支持多个 `v-model`**——`v-model:visible` 对应 `visible` prop + `update:visible` 事件，`defineModel('visible', { default: false })` 这种带参数名的写法就是用来声明"第二个、第三个 `v-model`"的。`defineModel` 相当于把 Vue 3 已经支持的"多 `v-model`"能力，进一步从"手写 `props` + `emit` 两步"压缩成"声明一个双向绑定的 `ref`"一步，是纯粹的开发体验优化，不涉及底层双向绑定机制本身的变化。

---

## 🧩 三、源码解析（重点代码，来源 GitHub 仓库，对齐 Vue 3.4）

以下代码按笔记 18 → 19 → 20 → 21 → 22 → 24 的开发主线，从 `componentEmits.ts` 到 `apiInject.ts`，按文件逐一走一遍。所有函数依赖的 `currentInstance`/`setCurrentInstance` 已经在第 4 篇给出，这里只在涉及改动的地方复述。

### componentEmits.ts：emit 实现

```typescript
import { camelize, EMPTY_OBJ, toHandlerKey } from "@g-vue-next/shared";
import { ComponentInternalInstance } from "./component";

export function emit(
  instance: ComponentInternalInstance,
  event: string,
  ...rawArgs: any[]
) {
  if (instance.isUnmounted) return
  // 获取组件
  const props = instance.vnode.props || EMPTY_OBJ
  const args = rawArgs
  const handler = props[toHandlerKey(camelize(event))]
  handler && handler(...args)
}
```

配套的 `shared/general.ts` 新增了两个字符串处理工具，`toHandlerKey` 是事件名转 `onXxx` 的关键一步：

```typescript
// 首字母大写
export const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1)
// 获取事件名
export const toHandlerKey = (str: string) => {
  const s = str ? `on${capitalize(str)}` : ``
  return s
}
// 批量调用函数
export const invokeArrayFns = (fns, ...arg) => {
  for (let i = 0; i < fns.length; i++) {
    fns[i](...arg)
  }
}
```

`renderer.ts` 的 `unmount` 分支需要区分"卸载的是组件还是普通节点"——组件卸载要走生命周期钩子（`bum`/`um`）加上递归卸载子树，`unmountComponent` 就是这条路径的实现，同时也是 `instance.isUnmounted` 被间接保证生效的地方（`emit` 里判断这个字段，防止组件卸载后残留的事件监听继续触发已销毁组件的逻辑）：

```typescript
const unmount: UnmountFn = (vnode, parentComponent, parentSuspense, doRemove = false, optimize = false) => {
  const { shapeFlag } = vnode
  // 卸载组件
  if (shapeFlag & ShapeFlags.COMPONENT) {
    unmountComponent(vnode.component, parentSuspense, doRemove)
  } else {
    remove(vnode)
  }
}

const unmountComponent = (
  instance: ComponentInternalInstance,
  parentSuspense: any | null,
  doRemove?: boolean
) => {
  const { subTree, bum, um } = instance
  // TODO Lifecycle Hooks beforeUnmount
  if (bum) {
    invokeArrayFns(bum)
  }
  unmount(subTree, instance, parentSuspense, doRemove)
  // TODO Lifecycle Hooks unmounted
  if (um) {
    invokeArrayFns(um)
  }
};
```

### componentSlots.ts：`initSlots` / `updateSlots`

```typescript
import { ShapeFlags } from "@g-vue-next/shared";
import { ComponentInternalInstance } from "./component";
import { VNodeArrayChildren, VNodeNormalizedChildren } from "./vnode";

export type RawSlots = {
  [name: string]: unknown
  $stable?: boolean
  _ctx?: any | null
  _?: any
}
export const initSlots = (
  instance: ComponentInternalInstance,
  children: VNodeNormalizedChildren
) => {
  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    instance.slots = children as any
  }
}

export const updateSlots = (
  instance: ComponentInternalInstance,
  children: VNodeNormalizedChildren
) => {
  Object.assign(instance.slots, children)
}
```

插槽子节点的判定标记在 `vnode.ts` 的 `createBaseVNode` 里，和数组子节点、文本子节点是同一处按位或逻辑的补充分支：

```typescript
if (children) {
  let type = 0
  if (isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN // 数组
  } else if (isObject(children)) {
    type = ShapeFlags.SLOTS_CHILDREN; // 插槽
  } else {
    type = ShapeFlags.TEXT_CHILDREN // 文本
  }
  vnode.shapeFlag |= type
}
```

`updateComponentPreRender` 里，插槽更新紧跟在 props 更新之后（第 4 篇只提到了 `updateProps`，这里补上完整两步）：

```typescript
const updateComponentPreRender = (instance, nextVNode) => {
  nextVNode.component = instance
  const prevProps = instance.vnode.props
  instance.vnode = nextVNode
  instance.next = null
  // 1. 更新 props
  updateProps(instance, nextVNode.props, prevProps)
  // 2. 更新 slots
  updateSlots(instance, nextVNode.children)
}
```

### apiLifecycle.ts：`createHook` 工厂函数

```typescript
import { ComponentInternalInstance, currentInstance, setCurrentInstance } from "./component"
import { LifecycleHooks } from "./enums"

export const injectHooks = (
  type: LifecycleHooks,
  hook: Function,
  target: ComponentInternalInstance | null = currentInstance,
  prepend = false
) => { 
  if (target) {
    // 获取当前组件实例中的生命周期函数
    const hooks = target[type] || (target[type] = [])
    // 利用闭包，将hook函数进行包装，包装后的函数会打印出当前组件实例
    const wrapperHook: any = () => {
      // 钩子执行前，对实例进行校正处理
      const reset = setCurrentInstance(target)
      // 钩子执行
      hook.call(target)
      // 钩子执行后，恢复实例
      reset()
    }
    if(prepend) {
      hooks.unshift(wrapperHook)
    } else {
      hooks.push(wrapperHook)
    }
  }
}

export const createHook = <T extends Function = () => any>(lifecycle: LifecycleHooks) => {
  return (
    hook: T, 
    target: ComponentInternalInstance | null = currentInstance // 将当前实例关联到此钩子上
  ) => injectHooks(lifecycle, (...args: unknown[]) => hook(...args), target)
}

export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
export const onMounted = createHook(LifecycleHooks.MOUNTED)
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE)
export const onUpdated = createHook(LifecycleHooks.UPDATED)
export const onBeforeUnmount = createHook(LifecycleHooks.BEFORE_UNMOUNT)
export const onUnmounted = createHook(LifecycleHooks.UNMOUNTED)
export const onActivated = createHook(LifecycleHooks.ACTIVATED)
export const onDeactivated = createHook(LifecycleHooks.DEACTIVATED)
export const onRenderTracked = createHook(LifecycleHooks.RENDER_TRACKED)
export const onRenderTriggered = createHook(LifecycleHooks.RENDER_TRIGGERED)
export const onErrorCaptured = createHook(LifecycleHooks.ERROR_CAPTURED)
export const onServerPrefetch = createHook(LifecycleHooks.SERVER_PREFETCH)
```

`setCurrentInstance` 在这一篇改造成了"记住并恢复上一个实例"，而不是第 4 篇里简单粗暴地置空——这是为了支持钩子执行期间可能出现的嵌套场景（比如一个钩子内部又触发了另一个组件的渲染）：

```typescript
const internalSetCurrentInstance: (instance: ComponentInternalInstance | null) => void = (i) => {
  currentInstance = i
}
export function setCurrentInstance(instance: ComponentInternalInstance) {
  const prev = currentInstance
  internalSetCurrentInstance(instance)
  return (): void => {
    internalSetCurrentInstance(prev) // 恢复成调用前的那个实例，而不是无脑置空
  }
}
export const unsetCurrentInstance = () => {
  internalSetCurrentInstance(null)
}
```

### rendererTemplateRef.ts：模板引用设置

```typescript
import { ShapeFlags } from "@g-vue-next/shared";
import { VNode, VNodeNormalizedRef, VNodeNormalizedRefAtom } from "./vnode";
import { getComponentPublicInstance } from "./component";
import { isRef } from "@g-vue-next/reactivity";

export function setRef(
  rawRef: VNodeNormalizedRef,
  oldRawRef: VNodeNormalizedRef | null,
  parentSuspense: any | null,
  vnode: VNode,
  isUnmount = false
) {
  const refValue = 
    vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
      ? getComponentPublicInstance(vnode.component!)
      : vnode.el;
  const value = isUnmount ? null : refValue;
  const { i: owner, r: ref } = rawRef as VNodeNormalizedRefAtom;

  if (isRef(ref)) {
    ref.value = value;
  }
}
```

`vnode.ts` 里新增的 `ref` 归一化逻辑（`normalizeRef`），把模板/`h()` 调用时传入的 `ref` 属性统一包装成带 `i`（所属组件实例）、`r`（原始 ref）字段的结构：

```typescript
const normalizeRef = ({
  ref,
  ref_key,
  ref_for,
}: VNodeProps): VNodeNormalizedRefAtom | null => {
  if (typeof ref === 'number') {
    ref = '' + ref
  }
  return (ref != null
    ? isString(ref) || isRef(ref) || isFunction(ref)
      ? { i: currentInstance, r: ref, k: ref_key, f: !!ref_for }
      : ref
    : null
  ) as any
}
```

### apiInject.ts：原型链继承 provides

```typescript
import { isFunction } from "@g-vue-next/shared";
import { currentInstance } from "./component";

export interface InjectionKey<T> extends Symbol{}

export function provide<T, K = InjectionKey<T> | string | number>(
  key: K,
  value: K extends InjectionKey<infer V> ? V : T
) {
  if (!currentInstance) {
    console.warn(`provide() can only be used inside setup() .`)
  } else {
    let provides = currentInstance.provides
    const parentProvides = currentInstance?.parent?.provides
    if (parentProvides === provides) {
      provides = currentInstance.provides = Object.create(parentProvides)
    }
    provides[key as string] = value
  }
}

export function inject<T>(key: InjectionKey<T> | string): T | undefined
export function inject<T>(
  key: InjectionKey<T> | string,
  defaultValue: T | (() => T),
  treatDefaultAsFactory?: false
)
export function inject<T>(
  key: InjectionKey<T> | string,
  defaultValue: T | (() => T),
  treatDefaultAsFactory?: true
)
export function inject(
  key: InjectionKey<any> | string,
  defaultValue?: any,
  treatDefaultAsFactory = false
) {
  const instance = currentInstance
  if (instance) {
    const provides = instance
    ? instance.parent
      ? instance.parent.provides 
      : instance.provides 
    : null
    if (provides &&(key as string in provides)) {
      return provides[key as string]
    } else if (arguments.length > 1) {
      return treatDefaultAsFactory && isFunction(defaultValue)
        ? defaultValue.call(instance && instance.proxy)
        : defaultValue
    } else {
      console.warn(`injection "${String(key)}" not found.`)
    }
  } else {
    console.warn(`inject() can only be used inside setup() or functional components.`)
  }
}
```

`component.ts` 里 `provides` 字段的初始化——直接复用父级引用，只有调用 `provide()` 才会分叉出新对象，这是「二、原理」小节讲的原型链隔离机制的落地位置：

```typescript
export function createComponentInstance(vnode, parent, suspense): ComponentInternalInstance {
  const instance = {
    // ...其余字段同第 4 篇...
    provides: parent ? parent.provides : Object.create(null),
  }
  instance.ctx = { _: instance }
  instance.root = parent ? parent.root : instance
  instance.emit = emit.bind(null, instance)
  return instance
}
```

### apiSetupHelpers.ts：`useAttrs` / `useSlots`

真实 Vue 3.4 源码里，`useAttrs`/`useSlots` 是一对几乎一模一样的取值函数，都基于 `getCurrentInstance()` 从当前实例上取一个字段：

```typescript
export function useSlots(): SetupContext['slots'] {
  return getContext().slots
}

export function useAttrs(): SetupContext['attrs'] {
  return getContext().attrs
}

function getContext(): SetupContext {
  const i = getCurrentInstance()!
  return i.setupContext || (i.setupContext = createSetupContext(i))
}
```

本项目手写实现里没有单独的 `apiSetupHelpers.ts` 文件，`createSetupContext`（笔记 18）已经把 `attrs`/`slots` 挂到了 `setup(props, context)` 的第二个参数上，`useAttrs`/`useSlots` 只是在这基础上包一层 `getCurrentInstance()` 取值，逻辑和真实源码完全一致，见下方「手写实现」小节的落地代码。

### componentRenderUtils.ts：`renderComponentRoot` 与函数式组件判定（见第 4 篇）

「二、原理」第 7 小节提到的函数式组件渲染分支，完整的 `renderComponentRoot` 实现、`vnode.ts` 里 `isFunction(type)` 判定分支、`renderer.ts` 的改造点，第 4 篇「三、源码解析」`componentRenderUtils.ts` 小节已经逐行讲过，这里不再重复贴代码，直接复用即可。

### toRefs / toRef：解决 Composable 返回值解构丢失响应性

「二、原理」第 9 小节提到的 `toRefs()`，源码来自笔记 07（响应式原理系列），和本篇 Composable 设计直接相关的是 `toRefs`/`propertyToRef`：

```typescript
class ObjectRefImpl<T extends object, K extends keyof T> {
  public readonly __v_isRef = true
  constructor(private readonly _object: T, private _key: K, private readonly _defaultValue?: T[K]) {}
  get value() {
    const val = this._object[this._key]
    return val === undefined ? this._defaultValue : val
  }
  set value(newValue) {
    this._object[this._key] = newValue
  }
}

function propertyToRef(source: Record<string, any>, key: string, defaultValue?: unknown): any {
  const val = source[key]
  return isRef(val) ? val : new ObjectRefImpl(source, key, defaultValue)
}

export const toRefs = (object: Record<string, any>) => {
  const ret: any = isArray(object) ? new Array(object.length) : {}
  for (const key in object) {
    ret[key] = propertyToRef(object, key)
  }
  return ret
}
```

`toRefs` 给 `reactive` 对象的每个属性都包一层 `ObjectRefImpl`——这个 ref 的 `get`/`set` 直接读写源对象上的同一个属性（`this._object[this._key]`），而不是拷贝一份快照，所以解构出来的每个字段依然和源对象保持同步，这正是「二、原理」第 9 小节讲的"避免解构丢失响应性"这个坑的解法。

### defineModel 编译原理（摘要）

`defineModel` 属于编译期宏，真实实现在 `@vue/compiler-sfc` 的 `compileScript` 阶段，核心逻辑是**识别 `defineModel()` 调用表达式，展开成一个 prop 声明 + 一个 `customRef`**（用官方源码简化后的示意，帮助建立心智模型，不是逐行摘抄）：

```typescript
// compiler-sfc 大致处理思路（示意，非逐字源码）
function processDefineModel(modelName = 'modelValue', options = {}) {
  // 1. 追加一个 prop 声明
  propsDecls[modelName] = { type: options.type, default: options.default }
  // 2. 追加一个对应的 emit 声明
  emitsDecls.push(`update:${modelName}`)
  // 3. 生成一段 customRef 代码，替换掉源码里 defineModel() 调用的位置
  return `customRef((track, trigger) => ({
    get() { track(); return __props.${modelName} },
    set(v) { emit('update:${modelName}', v); trigger() }
  }))`
}
```

这段编译期改写解释了「二、原理」小节讲的"读 `props`、写就 `emit`"效果从何而来——`defineModel` 在源码里本身不存在任何运行时逻辑，它是一个纯粹的编译期标记，真正跑在浏览器里的代码是编译器展开后的 `defineProps` + `defineEmits` + `customRef`。完整的编译流程（`parse` → `transform` → `generate` 三阶段如何处理编译宏）留到第 07 篇详细展开。

---

## 🧩 四、生产级最佳实践

### Composable 命名约定与返回值设计

统一 `use` 前缀，返回值优先用对象而不是数组（除非像 `useState` 那样明确只有两个强关联的值），对象形式在解构时可以按需只取需要的字段，可读性更好：

```typescript
// 推荐：对象形式，按需解构
function useDrugInventory(drugId: Ref<string>) {
  const stock = ref(0)
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const refresh = async () => { /* ... */ }
  return { stock, loading, error, refresh }
}

const { stock, refresh } = useDrugInventory(drugId) // 只取需要的两个字段
```

### 有副作用的 Composable：内部自动注册清理

凡是 Composable 内部注册了定时器、事件监听、WebSocket 连接，都应该在同一个函数内部配套 `onUnmounted` 清理，而不是把清理职责甩给调用方：

```typescript
function useDrugStockPolling(drugId: Ref<string>, intervalMs = 5000) {
  const stock = ref(0)
  let timer: number

  const start = () => {
    timer = window.setInterval(async () => {
      stock.value = await fetchStock(drugId.value)
    }, intervalMs)
  }

  onMounted(start)
  onUnmounted(() => clearInterval(timer)) // 组件卸载自动清理，调用方不需要记得手动 stop

  return { stock }
}
```

### Composable 组合调用链

复杂业务场景下，一个"大" Composable 内部组合多个"小" Composable，是比在组件里堆砌逻辑更清晰的组织方式：

```typescript
// usePrescription 内部组合 usePatientSearch + useDrugInventory
function usePrescription() {
  const { keyword, results: patients, search: searchPatient } = usePatientSearch()
  const selectedDrugId = ref('')
  const { stock } = useDrugInventory(selectedDrugId)

  const canSubmit = computed(() => patients.value.length > 0 && stock.value > 0)

  const submit = () => { /* 提交处方逻辑 */ }

  return { keyword, patients, searchPatient, selectedDrugId, stock, canSubmit, submit }
}
```

### provide/inject 保持响应式

`provide` 的值如果是需要跨组件同步变化的状态，必须传 `ref`/`reactive`，不能传一次性拆包出来的普通值：

```typescript
// ❌ 错误：传的是某一时刻的快照值，之后 theme.value 变化子组件感知不到
provide('theme', theme.value)

// ✅ 正确：传 ref 本身，子组件拿到的是同一个响应式引用
provide('theme', theme)
```

### Composable 的测试策略

Composable 内部依赖 `getCurrentInstance()`/生命周期钩子，脱离组件上下文直接调用会警告甚至报错，测试时需要一个 `withSetup` 辅助函数模拟组件上下文：

```typescript
function withSetup<T>(composable: () => T): [T, ReturnType<typeof createApp>] {
  let result: T
  const app = createApp({
    setup() {
      result = composable()
      return () => {}
    }
  })
  app.mount(document.createElement('div'))
  return [result!, app]
}

// 测试用例
const [{ stock, refresh }] = withSetup(() => useDrugInventory(ref('drug-001')))
await refresh()
expect(stock.value).toBeGreaterThan(0)
```

### `defineModel` 实战：药品数量选择器 + 多个 v-model

```vue
<!-- PrescriptionDialog.vue：弹窗同时绑定两个 v-model -->
<script setup lang="ts">
const visible = defineModel<boolean>('visible', { default: false })
const selectedDrug = defineModel<string | null>('selectedDrug', { default: null })
</script>

<template>
  <div v-if="visible" class="dialog">
    <QuantityStepper v-model="quantity" />
    <button @click="visible = false">关闭</button>
  </div>
</template>
```

```vue
<!-- 父组件：v-model:visible 和 v-model:selectedDrug 各自独立同步 -->
<PrescriptionDialog v-model:visible="dialogVisible" v-model:selectedDrug="pickedDrugId" />
```

### Composable 的类型设计取舍

公共 Composable（跨模块复用、供团队内其他人调用）建议显式声明参数类型和返回类型接口，方便调用方在不跳进实现细节的情况下看懂用法：

```typescript
interface UseDrugInventoryReturn {
  stock: Ref<number>
  loading: Ref<boolean>
  refresh: () => Promise<void>
}

export function useDrugInventory(drugId: MaybeRefOrGetter<string>): UseDrugInventoryReturn {
  // ...
}
```

内部私有的、只在单个组件里使用的小 Composable，依赖 TypeScript 自动推断即可，没必要为每一个都手写接口，减少维护成本。返回联合类型的 `ref`（比如 `Ref<Drug | null>`）在使用处需要先做类型收窄才能安全访问属性：

```typescript
const { selectedDrug } = useDrugSelection() // selectedDrug: Ref<Drug | null>

if (selectedDrug.value) {
  console.log(selectedDrug.value.name) // 收窄后 TypeScript 才允许访问 .name
}
```

### 模块作用域共享状态：单例 Composable 的命名与边界

「二、原理」第 9 小节讲的"模块作用域共享状态"模式在业务代码里很常见（当前登录用户、全局主题、未读消息数），使用时要注意两点：一是命名上要能一眼看出"这是全局唯一的"，比如用 `useXxxStore`/`useXxxSession` 而不是普通的 `useXxx`，避免调用方误以为每次调用都是独立状态；二是模块顶层创建的 `ref` 在 SSR 场景下会导致状态在多个请求之间泄漏共享（不同用户的请求跑在同一个 Node.js 进程里，共用同一个模块级变量），纯客户端渲染的项目不受影响，但一旦涉及 SSR，全局单例状态就必须挪进请求级别的上下文里管理，不能简单地用模块作用域变量：

```typescript
// 命名体现"全局单例"语义，避免和"每次调用创建新状态"的 Composable 混淆
export function usePatientSessionStore() {
  return { currentUser, login, logout } // currentUser 是模块顶层创建的 ref
}
```

### `emits` 运行时校验：对象语法（可选扩展）

`defineEmits<{...}>()` 只在类型层面约束事件签名，编译到运行时之后不会对参数做任何校验。真实 Vue 3.4 支持 `emits` 选项写成对象语法，每个事件对应一个返回布尔值的校验函数，校验不通过时开发环境会打印警告——这在本项目笔记 20 的手写实现里没有覆盖（`emit()` 直接查 `props` 上的 `onXxx` 并调用，不读取 `emitsOptions` 做任何校验），生产项目里可以按需扩展：

```typescript
// 对象语法：给每个事件声明一个校验函数
export default {
  emits: {
    'update:quantity': (value: number) => value > 0 || '数量必须大于 0',
    'remove': null // null 表示不需要校验，仅用于声明事件存在
  },
  setup(props, { emit }) {
    // ...
  }
}
```

---

## 🧩 五、手写实现（可独立跑通）

环境沿用第 1 篇的 Vite + TypeScript 配置，`emit`/`slots`/生命周期钩子/模板 `ref`/`provide`&`inject`/`toRefs` 的框架内部实现已经在笔记 07、17~22、24 逐步搭好，这里按文件列出与笔记原文逐字一致的完整代码（`apiSetupHelpers.ts` 是在笔记既有实现基础上按真实 Vue 源码结构做的等价扩展，标注为"新增部分"；函数式组件相关的 `componentRenderUtils.ts` 全量代码见第 4 篇，这里不重复贴），可以直接复制到对应文件里跑通，之后在此基础上补一段业务层 Composable 组合调用的演示。

### componentEmits.ts（全量）

```typescript
import { camelize, EMPTY_OBJ, toHandlerKey } from "@g-vue-next/shared";
import { ComponentInternalInstance } from "./component";

export function emit(
  instance: ComponentInternalInstance,
  event: string,
  ...rawArgs: any[]
) {
  if (instance.isUnmounted) return
  const props = instance.vnode.props || EMPTY_OBJ
  const args = rawArgs
  const handler = props[toHandlerKey(camelize(event))]
  handler && handler(...args)
}
```

### componentSlots.ts（全量）

```typescript
import { ShapeFlags } from "@g-vue-next/shared";
import { ComponentInternalInstance } from "./component";
import { VNodeArrayChildren, VNodeNormalizedChildren } from "./vnode";

export type RawSlots = {
  [name: string]: unknown
  $stable?: boolean
  _ctx?: any | null
  _?: any
}
export const initSlots = (
  instance: ComponentInternalInstance,
  children: VNodeNormalizedChildren
) => {
  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    instance.slots = children as any
  }
}

export const updateSlots = (
  instance: ComponentInternalInstance,
  children: VNodeNormalizedChildren
) => {
  Object.assign(instance.slots, children)
}
```

### enums.ts（全量）

```typescript
export enum LifecycleHooks {
  BEFORE_CREATE = 'bc',
  CREATED = 'c',
  BEFORE_MOUNT = 'bm',
  MOUNTED = 'm',
  BEFORE_UPDATE = 'bu',
  UPDATED = 'u',
  BEFORE_UNMOUNT = 'bum',
  UNMOUNTED = 'um',
  DEACTIVATED = 'da',
  ACTIVATED = 'a',
  RENDER_TRIGGERED = 'rtg',
  RENDER_TRACKED = 'rtc',
  ERROR_CAPTURED = 'ec',
  SERVER_PREFETCH = 'sp'
}
```

### apiLifecycle.ts（全量）

```typescript
import { ComponentInternalInstance, currentInstance, setCurrentInstance } from "./component"
import { LifecycleHooks } from "./enums"

export const injectHooks = (
  type: LifecycleHooks,
  hook: Function,
  target: ComponentInternalInstance | null = currentInstance,
  prepend = false
) => { 
  if (target) {
    const hooks = target[type] || (target[type] = [])
    const wrapperHook: any = () => {
      const reset = setCurrentInstance(target)
      hook.call(target)
      reset()
    }
    if(prepend) {
      hooks.unshift(wrapperHook)
    } else {
      hooks.push(wrapperHook)
    }
  }
}

export const createHook = <T extends Function = () => any>(lifecycle: LifecycleHooks) => {
  return (
    hook: T, 
    target: ComponentInternalInstance | null = currentInstance
  ) => injectHooks(lifecycle, (...args: unknown[]) => hook(...args), target)
}

export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
export const onMounted = createHook(LifecycleHooks.MOUNTED)
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE)
export const onUpdated = createHook(LifecycleHooks.UPDATED)
export const onBeforeUnmount = createHook(LifecycleHooks.BEFORE_UNMOUNT)
export const onUnmounted = createHook(LifecycleHooks.UNMOUNTED)
export const onActivated = createHook(LifecycleHooks.ACTIVATED)
export const onDeactivated = createHook(LifecycleHooks.DEACTIVATED)
export const onRenderTracked = createHook(LifecycleHooks.RENDER_TRACKED)
export const onRenderTriggered = createHook(LifecycleHooks.RENDER_TRIGGERED)
export const onErrorCaptured = createHook(LifecycleHooks.ERROR_CAPTURED)
export const onServerPrefetch = createHook(LifecycleHooks.SERVER_PREFETCH)
```

### rendererTemplateRef.ts（全量）

```typescript
import { ShapeFlags } from "@g-vue-next/shared";
import { VNode, VNodeNormalizedRef, VNodeNormalizedRefAtom } from "./vnode";
import { getComponentPublicInstance } from "./component";
import { isRef } from "@g-vue-next/reactivity";

export function setRef(
  rawRef: VNodeNormalizedRef,
  oldRawRef: VNodeNormalizedRef | null,
  parentSuspense: any | null,
  vnode: VNode,
  isUnmount = false
) {
  const refValue = 
    vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
      ? getComponentPublicInstance(vnode.component!)
      : vnode.el;
  const value = isUnmount ? null : refValue;
  const { i: owner, r: ref } = rawRef as VNodeNormalizedRefAtom;

  if (isRef(ref)) {
    ref.value = value;
  }
}
```

### apiInject.ts（全量）

```typescript
import { isFunction } from "@g-vue-next/shared";
import { currentInstance } from "./component";

export interface InjectionKey<T> extends Symbol{}

export function provide<T, K = InjectionKey<T> | string | number>(
  key: K,
  value: K extends InjectionKey<infer V> ? V : T
) {
  if (!currentInstance) {
    console.warn(`provide() can only be used inside setup() .`)
  } else {
    let provides = currentInstance.provides
    const parentProvides = currentInstance?.parent?.provides
    if (parentProvides === provides) {
      provides = currentInstance.provides = Object.create(parentProvides)
    }
    provides[key as string] = value
  }
}
export function inject<T>(key: InjectionKey<T> | string): T | undefined
export function inject<T>(
  key: InjectionKey<T> | string,
  defaultValue: T | (() => T),
  treatDefaultAsFactory?: false
)
export function inject<T>(
  key: InjectionKey<T> | string,
  defaultValue: T | (() => T),
  treatDefaultAsFactory?: true
)
export function inject(
  key: InjectionKey<any> | string,
  defaultValue?: any,
  treatDefaultAsFactory = false
) {
  const instance = currentInstance
  if (instance) {
    const provides = instance
    ? instance.parent
      ? instance.parent.provides 
      : instance.provides 
    : null
    if (provides &&(key as string in provides)) {
      return provides[key as string]
    } else if (arguments.length > 1) {
      return treatDefaultAsFactory && isFunction(defaultValue)
        ? defaultValue.call(instance && instance.proxy)
        : defaultValue
    } else {
      console.warn(`injection "${String(key)}" not found.`)
    }
  } else {
    console.warn(`inject() can only be used inside setup() or functional components.`)
  }
}
```

### componentRenderUtils.ts / vnode.ts / renderer.ts（函数式组件支持，见第 4 篇全量代码）

函数式组件的完整落地代码——`renderComponentRoot`、`vnode.ts` 的 `isFunction(type)` 分支、`renderer.ts` 里 `setupRenderEffect` 换成 `renderComponentRoot(instance)` 的两处改动——第 4 篇「五、手写实现」`componentRenderUtils.ts（全量）`小节已经给过完整代码，直接复制那一份即可，这里不再重复贴一遍。

### apiSetupHelpers.ts（新增：useAttrs / useSlots）

基于 `component.ts` 已有的 `getCurrentInstance()`（笔记 18）扩展出来的两个组合式访问函数，和真实 Vue 源码结构一致：

```typescript
import { EMPTY_OBJ } from "@g-vue-next/shared"
import { getCurrentInstance } from "./component"

export function useAttrs(): Record<string, unknown> {
  return getCurrentInstance()?.attrs ?? EMPTY_OBJ
}

export function useSlots() {
  return getCurrentInstance()?.slots ?? EMPTY_OBJ
}
```

### ref.ts（新增部分：toRef / toRefs，全量摘自笔记 07）

```typescript
class ObjectRefImpl<T extends object, K extends keyof T> {
  public readonly __v_isRef = true
  constructor(private readonly _object: T, private _key: K, private readonly _defaultValue?: T[K]) {}
  get value() {
    const val = this._object[this._key]
    return val === undefined ? this._defaultValue : val
  }
  set value(newValue) {
    this._object[this._key] = newValue
  }
}

function propertyToRef(source: Record<string, any>, key: string, defaultValue?: unknown): any {
  const val = source[key]
  return isRef(val) ? val : new ObjectRefImpl(source, key, defaultValue)
}

class GetterRefImpl<T> {
  public readonly __v_isRef = true
  public readonly __v_isReadonly = true
  constructor(private readonly _getter: () => T) {}
  get value() {
    return this._getter()
  }
}

export const toRef = (source: Record<string, any> | any, key?: string, defaultValue?: unknown) => {
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

export const toRefs = (object: Record<string, any>) => {
  const ret: any = isArray(object) ? new Array(object.length) : {}
  for (const key in object) {
    ret[key] = propertyToRef(object, key)
  }
  return ret
}

export const unref = <T>(ref: MaybeRef<T>): T => isRef(ref) ? ref.value : ref

export const proxyRefs = <T extends object>(objectWithRefs: T) => {
  return new Proxy(objectWithRefs, {
    get(target, key, receiver) {
      return unref(Reflect.get(target, key, receiver))
    },
    set(target, key, value, receiver) {
      const oldValue = target[key]
      if (isRef(oldValue) && !isRef(value)) {
        oldValue.value = value
        return true
      } else {
        return Reflect.set(target, key, value, receiver)
      }
    }
  })
}

export function toValue<T>(source: any): T {
  return isFunction(source) ? source() : unref(source)
}
```

### 业务 Composable：usePatientSearch + useDrugInventory + usePrescription

在上面的框架能力之上，补一段贴近真实业务的 Composable 组合调用演示——这部分不改动框架源码，纯粹是使用者视角的代码：

```typescript
import { ref, computed, onUnmounted, type Ref } from 'vue'

// 模拟接口
const mockPatients = [{ id: 'p001', name: '张三' }, { id: 'p002', name: '李四' }]
const mockStock: Record<string, number> = { 'drug-001': 20, 'drug-002': 0 }
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 1. usePatientSearch：患者搜索
function usePatientSearch() {
  const keyword = ref('')
  const results = ref<typeof mockPatients>([])
  const loading = ref(false)

  const search = async () => {
    loading.value = true
    await delay(200)
    results.value = mockPatients.filter(p => p.name.includes(keyword.value))
    loading.value = false
  }

  return { keyword, results, loading, search }
}

// 2. useDrugInventory：药品库存查询，带轮询自动清理
function useDrugInventory(drugId: Ref<string>) {
  const stock = ref(0)
  const refresh = async () => {
    await delay(100)
    stock.value = mockStock[drugId.value] ?? 0
  }

  let timer: number
  timer = window.setInterval(refresh, 5000)
  onUnmounted(() => clearInterval(timer)) // 组件卸载自动停止轮询，无需调用方操心

  refresh()
  return { stock, refresh }
}

// 3. usePrescription：组合调用，聚合出开处方场景需要的全部状态
function usePrescription() {
  const { keyword, results: patients, search: searchPatient } = usePatientSearch()
  const selectedPatientId = ref('')
  const selectedDrugId = ref('drug-001')
  const { stock, refresh: refreshStock } = useDrugInventory(selectedDrugId)

  const canSubmit = computed(() =>
    !!selectedPatientId.value && stock.value > 0
  )

  const submit = () => {
    if (!canSubmit.value) return
    console.log(`为患者 ${selectedPatientId.value} 开具处方：${selectedDrugId.value}`)
  }

  return {
    keyword, patients, searchPatient,
    selectedPatientId, selectedDrugId, stock, refreshStock,
    canSubmit, submit,
  }
}

export { usePatientSearch, useDrugInventory, usePrescription }
```

### 运行示例：处方开具页面组合调用

```vue
<script setup lang="ts">
import { usePrescription } from './usePrescription'

const {
  keyword, patients, searchPatient,
  selectedPatientId, selectedDrugId, stock,
  canSubmit, submit,
} = usePrescription()
</script>

<template>
  <div class="prescription-page">
    <input v-model="keyword" placeholder="搜索患者姓名" @input="searchPatient" />
    <ul>
      <li
        v-for="p in patients"
        :key="p.id"
        :class="{ active: p.id === selectedPatientId }"
        @click="selectedPatientId = p.id"
      >
        {{ p.name }}
      </li>
    </ul>

    <select v-model="selectedDrugId">
      <option value="drug-001">阿莫西林（库存 {{ stock }}）</option>
      <option value="drug-002">布洛芬（库存 {{ stock }}）</option>
    </select>

    <button :disabled="!canSubmit" @click="submit">提交处方</button>
  </div>
</template>
```

这段代码把本文讲的三个 Composable 串成一条完整的业务链路：`usePatientSearch` 独立管理搜索关键词和结果列表，`useDrugInventory` 独立管理库存轮询并在 `onUnmounted` 里自动清理定时器，`usePrescription` 把两者组合起来、派生出 `canSubmit` 这个跨状态的计算属性——三个函数各自闭包持有自己的响应式状态，互不干扰，这正是「二、原理」小节讲的"Composable 靠闭包而非调用顺序关联状态"在真实业务代码里的样子。

### 运行示例：函数式组件 + useAttrs / useSlots

补一段验证「二、原理」第 3、7 小节的最小示例——`DrugTag` 是纯函数式组件，`DrugCard` 用 `useAttrs`/`useSlots` 在 `<script setup>` 下访问透传属性和插槽：

```typescript
import { h } from '@g-vue-next/runtime-core'

// 函数式组件：无状态、无实例，仅依赖 props 渲染
const DrugTag = (props: { name: string; type: 'otc' | 'rx' }) => {
  return h('span', { class: `tag tag-${props.type}` }, props.name)
}

render(
  h('div', {}, [
    h(DrugTag, { name: '处方药', type: 'rx' }),
    h(DrugTag, { name: '非处方药', type: 'otc' }),
  ]),
  document.getElementById('app')
)
```

```typescript
import { useAttrs, useSlots, getCurrentInstance, h } from '@g-vue-next/runtime-core'

const DrugCard = {
  setup() {
    return () => {
      const attrs = useAttrs() // 未在 props 里声明的属性（比如 data-testid）
      const slots = useSlots()
      return h('div', { class: 'drug-card', ...attrs }, [
        slots.header ? slots.header({ title: '药品详情' }) : null,
        slots.default ? slots.default() : null,
      ])
    }
  }
}
```

`DrugTag` 走的是 `renderComponentRoot` 里 `else` 分支（`render(hasProps ? props : attrs, null)`），不会创建任何 `ComponentInternalInstance`；`DrugCard` 里的 `useAttrs`/`useSlots` 则依赖 `setup()` 执行期间已经建立好的 `currentInstance`——两者对照着跑一遍，能直接验证「二、原理」第 7 小节讲的"函数式组件没有 `currentInstance`"这个边界结论。

---

## 六、手写实现源码 GitHub 地址

- https://github.com/lotosv2010/g-vue-next

## 七、参考

- https://cn.vuejs.org/guide/reusability/composables.html
- https://cn.vuejs.org/guide/extras/composition-api-faq.html
- https://cn.vuejs.org/guide/typescript/composition-api.html
- https://github.com/wbccb/

---

> 🔖 这是「Vue 3 全家桶深度拆解系列」第 5 篇。上一篇：《Vue 3 组件渲染原理：Text/Comment/Fragment 到组件实例的渲染链路（面试收藏级）》；下一篇预告：《Vue 3 内置组件全解析：Teleport/Transition/KeepAlive/Suspense 异步编排详解（面试收藏级）》

**关注公众号「Coding沉思录」，第一时间获取 Vue 3 全家桶系列更新！**
