# Vue 3 性能优化全攻略：编译时优化 + 运行时优化的最优组合（面试收藏级）

> 面试官问：「`v-memo` 是干什么的？」大多数人会答「跳过不必要的更新，做性能优化的」——追一句「它跳过的是谁的更新？和 `v-once`、和 React 的 `memo` 分别是什么关系」，答案就开始语焉不详了。「加个指令能优化性能」这种回答是**记结论**，不是**懂原理**。

> 性能优化这件事，从来不是一张「优化技巧清单」，而是一条**「看到卡顿现象 → 定位到具体是哪种开销 → 选对工具关掉这个开销 → 讲清楚为什么选它、Vue 2 时代怎么应对同一个问题」**的完整链路。同一个「列表渲染卡顿」的现象，可能是 Diff 比较范围太大（`v-memo`/`v-once` 管的事），可能是响应式代理开销太大（`shallowRef`/`markRaw` 管的事），也可能是真实 DOM 节点数量太多（虚拟列表管的事）——分不清这三者，优化就会用错工具。

> 这篇文章是「Vue 3 全家桶深度拆解」系列第 10 篇。前 9 篇分别拆过响应式、渲染、组件、Composition API、内置组件、编译优化、Pinia、Vue Router，编译时该做的静态提升、Patch Flags、Block Tree、事件缓存这些优化在第 03/07 篇已经讲透——这一篇聚焦的是**编译时优化覆盖不到、需要开发者主动决策的运行时优化**，逐个知识点按「现象 → 方案 → 对比 → 原理」的顺序讲透，每个知识点都会讲清楚 Vue 2 时代怎么解决同一个问题，为什么 Vue 3 换了新设计。

---

## 🎯 这篇文章解决什么问题

「性能优化」是面试里最容易被问「泛」也最容易答「虚」的话题——面试官问「Vue 3 项目怎么做性能优化」，很多人会背一串关键词（`v-memo`、懒加载、虚拟列表、Tree Shaking），但追一句「这几个东西分别解决的是什么问题，能不能互相替代」，就开始语焉不详。

这篇文章要打通的是：`v-memo`/`v-once` 解决的是「Diff 比较范围过大」，`shallowRef`/`shallowReactive`/`markRaw` 解决的是「响应式代理本身的开销」，异步组件解决的是「首屏加载体积」，虚拟列表解决的是「真实 DOM 节点数量」，`onTrack`/`onTrigger` 解决的是「响应式行为的可观测性」，构建分包解决的是「资源加载的网络效率」——**这六类问题彼此独立、互不替代**，想清楚这一点，面试官不管从哪个角度问，你都能先定位问题类别，再给出对应方案，而不是背题式地罗列 API。

---

## 🧩 一、大列表局部更新为什么整个列表都被重新比较：v-memo

### 现象：处方列表一行数据变了，为什么整个列表都被比对了一遍

医疗场景：处方单页面渲染 500 条药品明细，每条明细是一个 `<PrescriptionRow>` 子组件，父组件维护一个 `prescriptions` 数组。当用户修改其中第 300 条的用药频次时，理论上只需要更新这一行，但实际观测（Vue Devtools 的组件高亮）会发现：**父组件的 render 函数重新执行，500 个 `<PrescriptionRow>` 对应的 VNode 全部参与了一次新旧对比**，即便 Block Tree（第 03 篇讲过）已经把动态节点收集到了 `dynamicChildren`，`v-for` 生成的这 500 个节点本身就是"动态的"，Diff 算法依然要逐个跑 `patchElement` 判断 props/children 有没有变化——只是省掉了"深入静态子树"的开销，省不掉"逐个对比这 500 个动态节点本身"的开销。

```vue
<template>
  <PrescriptionRow
    v-for="item in prescriptions"
    :key="item.id"
    :item="item"
  />
</template>
```

500 条数据，499 条没变、1 条变了，Diff 算法依然要对 500 个 `PrescriptionRow` 的 VNode 逐个跑 `isSameVNodeType` + `patchElement`——这就是"现象"背后的具体开销：**比较的次数和列表长度成正比，而不是和"真正变化的条目数"成正比**。

### 方案：v-memo 手动声明依赖数组，跳过未命中节点的整个子树 Diff

```vue
<template>
  <PrescriptionRow
    v-for="item in prescriptions"
    :key="item.id"
    :item="item"
    v-memo="[item.id, item.frequency, item.dosage]"
  />
</template>
```

`v-memo` 接收一个依赖数组，只有数组中的值发生变化时，这个节点及其子树才会重新走 Diff；数组不变，直接跳过整个 `patchElement` 调用，连 props 对比都不做。

### 对比：500 条数据改 1 条，Diff 节点数从 500 降到 1

| 场景 | 无 `v-memo` | 有 `v-memo` |
| --- | --- | --- |
| 参与 Diff 比较的 `PrescriptionRow` 节点数 | 500（全部） | 1（只有依赖数组变化的那一条） |
| 每条节点的比较开销 | `isSameVNodeType` + `patchProps` + `patchChildren` 全套跑一遍 | 命中缓存直接跳过，499 条节省这套开销 |
| 医疗场景实测收益 | 500 条处方明细，单次修改触发的 Diff 耗时随列表长度线性增长 | 单次修改的 Diff 耗时和列表长度基本无关，只取决于"变了几条" |

### 原理：编译产物是一次依赖数组比对，而非"神奇的跳过"

`v-memo` 编译后本质是在渲染函数里插入一段条件判断——依赖数组和上一次缓存的值逐项比对（`Object.is`/浅比较），全部相等就直接复用上一次的 VNode（连子树都不重新生成），否则正常走一遍完整渲染：

```javascript
// 示意：v-memo="[item.id, item.frequency, item.dosage]" 编译后的核心逻辑
const memo = [item.id, item.frequency, item.dosage]
if (isMemoSame(cached.memo, memo)) {
  // 依赖数组全部相等，直接复用缓存的 VNode，跳过本次渲染和后续 Diff
  return cached
}
// 否则正常渲染，并把新的 memo 数组缓存起来供下一次比较
```

**和 React.memo 的类比与差异**：`React.memo` 包裹的是整个组件，靠浅比较 `props` 决定是否重新渲染这个组件（阻止的是"重新渲染"本身）；`v-memo` 作用在模板节点级别，即便依赖没变，组件的 `setup`/响应式逃不掉正常执行，`v-memo` 只是让**这个节点及其子树跳过 Diff 比较和 VNode 重新创建**，两者拦截的位置不同——`React.memo` 拦截在"渲染函数要不要重新跑"，`v-memo` 拦截在"渲染完之后要不要参与比较"。

**对比 Vue 2**：Vue 2 没有 `v-memo`，遇到这类大列表局部更新问题，只能靠拆分成独立组件 + `computed`间接实现——把每一行拆成子组件，配合 `Object.freeze` 冻结不需要响应式的数据，或者手动维护 `shouldComponentUpdate` 类的判断逻辑（Vue 2 没有直接的 API，通常靠 `v-if` 配合额外的状态位模拟）。**为什么 Vue 3 要新增这个指令**：Vue 3 的 Block Tree + Patch Flags 已经解决了"跳过静态子树"的问题，但动态列表节点本身的比较开销是编译期无法预判的（只有运行时才知道哪一条数据真的变了），所以需要一个运行时可配置的"手动优化阀门"，`v-memo` 填的正是这个编译时优化覆盖不到的空白。

> 💬 **面试官**：`v-memo` 的使用场景和实现原理？和 React.memo 有什么类比关系？
>
> ✅ 标准答案：用于大列表中依赖稳定的行组件，编译为依赖数组比对，命中则跳过该节点及子树的 Diff。类比 React.memo 的地方是"依赖不变就跳过更新"这个思路，区别在于 React.memo 拦截组件重新渲染本身，`v-memo` 拦截的是渲染完之后的 Diff 比较。
>
> 🎁 加分答案：能提到 `v-memo` 是运行时手动优化，弥补的是编译时静态分析无法预判"运行时哪条数据真的变了"这个信息差；空数组 `v-memo="[]"` 等价于 `v-once`（永远不重新渲染）。

---

## 🧩 二、纯静态内容为什么还要陪跑 Diff：v-once

### 现象：药品说明书的固定条款，每次页面更新都被重新比较一遍

药品详情页有一段"用药说明书"，内容来自后端接口但渲染后**永远不会再变**（不像处方数据会被用户编辑），偏偏页面上有个实时刷新的库存数量在旁边。库存数字每次 `setInterval` 刷新，都会触发父组件重新渲染，说明书这段内容尽管值没变，依然要走一遍 `patchElement` 的 props/children 对比：

```vue
<template>
  <div>
    <p>库存：{{ stock }}</p> <!-- 每秒刷新 -->
    <div class="drug-instruction">{{ instructionText }}</div> <!-- 永远不变，但陪跑 Diff -->
  </div>
</template>
```

### 方案：v-once 标记只渲染一次，之后彻底退出 Diff 流程

```vue
<template>
  <div>
    <p>库存：{{ stock }}</p>
    <div class="drug-instruction" v-once>{{ instructionText }}</div>
  </div>
</template>
```

### 对比：库存刷新 100 次，说明书节点参与 Diff 的次数从 100 降到 0

| 场景 | 无 `v-once` | 有 `v-once` |
| --- | --- | --- |
| 库存刷新 100 次，说明书节点参与 Diff 的次数 | 100 次（每次父组件更新都陪跑） | 1 次（首次渲染后即永久移出 Diff 范围） |
| 说明书节点是否会被收集进 `dynamicChildren` | 会（作为普通动态子节点） | 不会（打上一次性标记后从 Block 收集范围中排除） |

### 原理：和静态提升的边界区别——编译期能确定的用静态提升，运行期才能确定的用 v-once

第 07 篇讲过静态提升（`hoistStatic`）：编译器在**编译阶段**就能判断出一个节点纯静态（没有任何绑定），直接提升到 render 函数外，只创建一次。但 `instructionText` 是一个响应式插值，编译器无法在编译阶段判断它"以后还会不会变"——**这是一个运行时才能确定的事实（开发者知道它不会变，但编译器不知道）**，所以需要 `v-once` 这种显式声明，告诉运行时"这个节点渲染完就可以永久跳过，不用等它下次被访问再判断"。

`v-once` 编译产生的效果，是让这个节点在首次渲染后不再被收集进父 Block 的 `dynamicChildren` 数组，后续父组件重新渲染时，Diff 遍历 `dynamicChildren` 根本不会碰到这个节点——不是"比较后发现没变"，是"压根不参与比较"。

**对比 Vue 2**：Vue 2 没有 `v-once`，遇到"渲染一次后不再变化"的内容，只能靠拆分独立组件配合 `Object.freeze`，或者手动用 `v-if` 配合一次性挂载的技巧模拟；且 Vue 2 的同层全量 Diff 意味着即便拆了组件，父组件重新渲染时子组件的 VNode 创建和 props 对比依然会发生，只是子组件内部不会重新渲染——优化力度远不如 Vue 3 直接把节点排除出 Diff 收集范围。

> 💬 **面试官**：`v-once` 的实现原理和使用场景？和静态提升是一回事吗？
>
> ✅ 标准答案：`v-once` 让节点首次渲染后不再进入 Diff 范围，用于运行时才能确定"内容不会再变"的场景（如接口返回后就固定的说明文案）。
>
> 🎁 加分答案：能区分和静态提升的边界——静态提升是编译期就能判断没有任何动态绑定的节点，`v-once` 是节点本身有响应式绑定，但开发者主动声明"以后也不用再比较了"，两者面对的是不同阶段的"确定性"。

---

## 🧩 三、大型只读数据的代理开销去哪儿了：shallowRef / shallowReactive / markRaw

### 现象：10000 条药品目录用 reactive 包一层，页面卡在初始化这一步

药品目录页面一次性拉回 10000 条药品数据用于本地搜索过滤，直觉写法是整体包一层 `reactive`：

```typescript
import { reactive } from 'vue'

const drugCatalog = reactive(rawDrugList) // rawDrugList 是 10000 条药品对象组成的数组
```

Vue Devtools 性能面板会看到这一行代码本身耗时明显——`reactive()` 虽然是"访问到嵌套对象时才递归代理"的惰性策略（第 02 篇讲过），但**只要后续代码遍历过这 10000 条数据的任意字段**（比如渲染列表时读取 `drug.name`），就会触发对每一条药品对象的 Proxy 包装，10000 次 `new Proxy(...)` 的创建开销叠加起来非常可观，而这些数据本质上是"只读展示，用户不会修改"，根本不需要对每一层做响应式追踪。

### 方案：按"要不要响应式"分层选择 shallowReactive / shallowRef / markRaw

**方案一：`shallowReactive`——只有第一层是响应式，不递归代理内部对象**

```typescript
import { shallowReactive } from 'vue'

// 只代理 drugCatalog 这个数组本身（push/splice 等操作响应式），
// 数组内部每一条药品对象不被递归代理
const drugCatalog = shallowReactive(rawDrugList)
```

**方案二：`shallowRef`——只追踪 `.value` 的整体替换，不管内部字段**

```typescript
import { shallowRef } from 'vue'

// 只有整体替换 drugCatalog.value = newList 才会触发更新
// 内部某条药品对象的字段变化不会被追踪，也不会触发重渲染
const drugCatalog = shallowRef(rawDrugList)
```

**方案三：`markRaw`——彻底标记为非响应式，连第一层都不代理**

```typescript
import { markRaw, reactive } from 'vue'

// 医疗场景：图表实例、地图组件实例这类第三方对象，压根不需要任何响应式追踪
const chartInstance = markRaw(echarts.init(chartDom))
const state = reactive({
  chart: chartInstance // 即便外层是 reactive，chart 字段本身也不会被代理
})
```

### 对比：三种方案代理范围不同，选错了要么白费性能要么丢响应式

| 方案 | 第一层是否响应式 | 嵌套对象是否响应式 | 适用场景 | 10000 条数据初始化耗时（相对 `reactive`） |
| --- | --- | --- | --- | --- |
| `reactive` | 是 | 是（惰性递归） | 需要深层修改并触发更新（如处方表单） | 基准 100% |
| `shallowReactive` | 是 | 否 | 数组整体增删响应式，条目内容只读展示 | 明显降低（省掉逐条代理） |
| `shallowRef` | 仅 `.value` 整体替换响应式 | 否 | 接口整体刷新替换的大型数据集（药品目录搜索结果） | 最低（只包一层 Ref） |
| `markRaw` | 否 | 否 | 完全不需要响应式的第三方实例/纯配置 | 几乎为 0（不创建任何 Proxy） |

### 原理：Proxy 默认深层代理是"反转"，Vue 2 的递归发生在访问时机不同

这里有一个容易被忽略但面试官很爱追问的点——**为什么 Vue 2 不需要"shallow"版本，Vue 3 反而需要专门造出这几个 API**：Vue 2 用 `Object.defineProperty` 实现响应式，`observe()` 函数在初始化阶段会**递归遍历**整个对象把每一层都变成响应式（深度是内建在初始化流程里的，天然就是"深"），如果要"浅"，Vue 2 反而没有对应 API，只能手动 `Object.freeze` 阻止递归。

Vue 3 的 Proxy 实现是"惰性递归"（第 02 篇讲过）——`get` 拦截器里判断到访问的属性是对象类型，才对这个属性**临时**调用 `reactive()` 包一层。这个设计本身已经比 Vue 2 的"初始化时一次性递归到底"更省性能，但只要访问链路足够深、条目数量足够大，"临时包一层"的总次数依然会累积成明显开销——**这是响应式实现方式从"初始化时递归"变成"访问时递归"之后，产生的一个新的性能特征**，因此需要专门的 `shallowXxx` API 让开发者显式声明"到这一层就停"。

`markRaw` 更进一步——它不是"浅代理"，是往目标对象上打一个 `__v_skip` 标记，`reactive()` 内部检测到这个标记直接返回原对象，连 Proxy 都不创建：

```typescript
// 示意：markRaw 的核心逻辑
function markRaw(value) {
  Object.defineProperty(value, '__v_skip', { value: true })
  return value
}

// reactive() 内部会检查这个标记
function createReactiveObject(target) {
  if (target.__v_skip) {
    return target // 直接返回原对象，不创建 Proxy
  }
  // ...正常创建代理
}
```

一个容易被面试问到的相关知识点：`Object.freeze` 冻结的对象，Vue 3 的 `reactive()` 内部检测到 `Object.isFrozen(target)` 为真时，也会走"不建立响应式关联"的分支（因为冻结对象本身不可修改，代理了也没有意义）——效果上和 `markRaw` 类似，但语义不同：`Object.freeze` 是"这个对象本身不可变"，`markRaw` 是"这个对象可变，但我不需要 Vue 追踪它的变化"。

**选型边界一句话总结**：要不要"第一层响应"是 `shallowXxx` 和 `markRaw` 的分界线——数组本身的增删需要触发更新，选 `shallowReactive`；整体替换才需要触发更新，选 `shallowRef`；完全不需要 Vue 感知这个数据的变化，选 `markRaw`。

> 💬 **面试官**：`shallowRef`/`shallowReactive`/`markRaw` 分别用在什么场景？和 `ref`/`reactive` 的区别是什么？
>
> ✅ 标准答案：`shallowReactive` 只代理第一层属性，不递归代理嵌套对象；`shallowRef` 只追踪 `.value` 的整体替换；`markRaw` 彻底不建立响应式代理。三者都是为了避免不必要的 Proxy 创建开销，适用于大型只读数据、第三方库实例等不需要深层响应式追踪的场景。
>
> 🎁 加分答案：能解释为什么 Vue 2 没有对应的 shallow API——Vue 2 的 `Object.defineProperty` 递归发生在初始化的 `observe` 阶段，是一次性的；Vue 3 的 Proxy 是访问时才递归代理，这种"惰性递归"策略本身更省性能，但也带来了"要不要继续递归下去"这个新的可配置维度，因此需要专门的 API 显式声明边界。

---

## 🧩 四、首屏为什么这么慢：异步组件与代码分割

### 现象：处方录入这个大表单组件，把首屏 bundle 拖慢了

处方录入表单包含大量字段校验逻辑、药品选择器、剂量计算器，体积不小，但只有医生点击"新建处方"按钮才会用到。如果按普通方式 `import PrescriptionForm from './PrescriptionForm.vue'` 直接引入，这部分代码会被打进主 bundle，用户打开首页只是浏览药品列表，却要为一个可能永远不会点击的表单组件付出加载时间。

### 方案：defineAsyncComponent 按需加载 + Suspense 统一调度加载态

```vue
<script setup>
import { defineAsyncComponent } from 'vue'

// 只有真正渲染这个组件时才会触发 import()，chunk 单独打包
const PrescriptionForm = defineAsyncComponent({
  loader: () => import('./PrescriptionForm.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorFallback,
  delay: 200,
  timeout: 5000
})

const showForm = ref(false)
</script>

<template>
  <button @click="showForm = true">新建处方</button>
  <PrescriptionForm v-if="showForm" />
</template>
```

多个异步依赖协作时（比如患者详情页同时依赖处方数据组件和检验报告组件两个异步组件），用一个 `<Suspense>` 统一调度，避免各自 loading 导致的布局抖动：

```vue
<template>
  <Suspense>
    <template #default>
      <PrescriptionPanel />
      <LabReportPanel />
    </template>
    <template #fallback>
      <LoadingSkeleton />
    </template>
  </Suspense>
</template>
```

### 对比：懒加载后主 bundle 体积下降，首屏时间同步下降

| 场景 | 直接 `import` | `defineAsyncComponent` 懒加载 |
| --- | --- | --- |
| 处方表单代码是否打进主 bundle | 是 | 否，独立 chunk |
| 首页打开时是否加载处方表单代码 | 加载（即便用户不点"新建处方"） | 不加载，点击时才发起请求 |
| 多个异步组件是否各自独立 loading | 是，容易出现多处 loading 闪烁 | 用 `Suspense` 统一一次 loading，全部 resolve 后一起显示 |

### 原理：内部状态机驱动渲染，包一层函数是为了推迟 import 的执行时机

`defineAsyncComponent` 返回的是一个包装组件，内部维护 `loaded`/`error`/`delayed` 几个响应式状态位，`setup()` 里根据这几个状态位的值渲染不同内容（loading / error / resolved 组件），这是一个典型的"用状态驱动渲染"而非"手写命令式加载逻辑"的实现方式：

```typescript
// 示意：defineAsyncComponent 内部状态驱动渲染的核心结构
setup() {
  const loaded = ref(false)
  const error = ref(undefined)

  loader().then(comp => {
    resolvedComp = comp
    loaded.value = true
  }).catch(err => {
    error.value = err
  })

  return () => {
    if (loaded.value) return h(resolvedComp)
    if (error.value && errorComponent) return h(errorComponent, { error: error.value })
    if (loadingComponent) return h(loadingComponent)
  }
}
```

**为什么 `loader` 必须是一个返回 Promise 的函数，而不是直接传 `import(...)` 的结果**：`import(...)` 语句一执行就会立刻发起网络请求，如果直接把 `import(...)` 的结果（已经是一个 Promise）传给配置项，意味着这个 chunk 在组件定义的那一刻就已经开始加载了——跟"懒加载"的初衷背道而驰。包一层函数 `() => import(...)`，只有在 `setup()` 内部真正调用 `loader()` 时才会触发 `import`，也就是这个异步组件真正被渲染的那一刻。

**对比 Vue 2**：Vue 2 的异步组件用 `Vue.component('async-comp', () => import('./AsyncComp.vue'))` 这种工厂函数写法，思路和 Vue 3 一致（都是靠 Webpack/Vite 的动态 `import()` 做代码分割），但 Vue 2 没有 `<Suspense>`，多个异步组件协作时只能各自维护 loading 状态，或者用第三方库（如 `vue-async-computed`）间接实现统一调度；Vue 3 内置的 `<Suspense>` 把"多个异步依赖统一等待"这件事变成了框架能力，不需要开发者手写协调逻辑。

> 💬 **面试官**：`defineAsyncComponent` 内部是怎么实现的？为什么 loader 要写成函数？
>
> ✅ 标准答案：内部是一个包装组件，用 `loaded`/`error`/`delayed` 几个响应式状态驱动渲染 loading/error/resolved 三种结果。loader 写成函数是为了推迟 `import()` 的实际发起时机到组件真正渲染的那一刻，直接传 Promise 会导致 chunk 提前加载，失去懒加载的意义。
>
> 🎁 加分答案：能提到 `<Suspense>` 统一调度多个异步依赖，用 `deps` 计数器等待全部 resolve 再一次性切换渲染内容，避免逐个组件各自 loading 造成的布局抖动（详见第 06 篇内置组件）。

---

## 🧩 五、Diff 算法已经优化了，为什么长列表还卡：虚拟列表

### 现象：`v-memo` 用上了，10000 条药品目录滚动依然掉帧

前面几节的优化手段解决的都是"Diff 比较范围"或"响应式代理开销"，但药品目录页面即便把每一行都套上了 `v-memo`，一次性把 10000 条数据全部渲染成真实 DOM 节点，滚动这个列表依然会掉帧——**因为这时候的瓶颈已经不是 Diff 算法本身，是浏览器要同时维护 10000 个真实 DOM 节点带来的布局计算、内存占用、滚动时的重绘开销**。

### 方案：虚拟列表只渲染可视区域内的节点

```vue
<script setup>
import { useVirtualList } from '@tanstack/vue-virtual'

const drugCatalog = shallowRef(rawDrugList) // 10000 条药品数据，配合第三节的 shallowRef

const parentRef = ref(null)
const { getVirtualItems, getTotalSize } = useVirtualList(
  computed(() => drugCatalog.value.length),
  {
    getScrollElement: () => parentRef.value,
    estimateSize: () => 56 // 每行预估高度
  }
)
</script>

<template>
  <div ref="parentRef" style="height: 600px; overflow: auto;">
    <div :style="{ height: getTotalSize() + 'px', position: 'relative' }">
      <div
        v-for="row in getVirtualItems()"
        :key="row.index"
        :style="{
          position: 'absolute',
          top: row.start + 'px',
          height: row.size + 'px',
          width: '100%'
        }"
      >
        {{ drugCatalog[row.index].name }}
      </div>
    </div>
  </div>
</template>
```

### 对比：真实 DOM 节点数量从 10000 降到"可视区域能容纳的行数"

| 场景 | 普通 `v-for` 渲染 | 虚拟列表 |
| --- | --- | --- |
| 真实 DOM 节点数 | 10000（全部一次性创建） | 约 15-20（只渲染可视区域 + 少量缓冲行） |
| 滚动时的重绘/重排范围 | 大（浏览器要处理所有节点的布局） | 小（只处理可视区域内的少量节点） |
| 初始渲染耗时 | 随数据量线性增长，10000 条明显卡顿 | 基本恒定，和数据总量无关 |

### 原理：这是完全不同维度的瓶颈——互补关系，不是替代关系

虚拟列表的核心思路很直接：监听容器的 `scrollTop`，根据当前滚动位置计算出"可视区域对应的数据索引范围"，只把这个范围内的数据渲染成真实节点，用一个撑满总高度的占位容器（`getTotalSize()`）模拟"看起来有 10000 条数据"的滚动条效果，配合 `position: absolute` + `top` 精确定位每一行该出现的位置。

**必须讲清楚的一点**：虚拟列表和 `v-memo`/Diff 优化解决的是完全不同的问题，**两者是互补关系**——`v-memo` 减少的是"数据变化时要比较多少个 VNode"，虚拟列表减少的是"任何时候浏览器要维护多少个真实 DOM 节点"。即便用了虚拟列表把可见节点降到 20 个，这 20 个节点内部数据变化时依然可以叠加 `v-memo` 进一步减少不必要的 Diff；反过来，`v-memo` 用得再好，只要真实 DOM 节点数量本身就是 10000 个，滚动这个操作系统级的开销也无法被 `v-memo` 消解。

**对比 Vue 2**：虚拟列表这个方案本身和 Vue 版本无关，是纯运行时的 DOM 数量优化思路，Vue 2 时代同样需要虚拟列表（`vue-virtual-scroller` 等库）。Vue 3 生态里选择 `@tanstack/vue-virtual` 而非 Vue 2 时代常用的库，是因为它基于 Composition API 设计、和 Vue 3 的响应式系统集成更自然，但底层"只渲染可视区域"的算法思路两代 Vue 完全一致——这是一个**框架无关**的性能问题，值得在面试里明确指出这一点，避免被面试官"虚拟列表是 Vue 3 的新特性吗"这类问题带偏。

> 💬 **面试官**：虚拟列表的核心原理是什么？和 Vue 3 的 Diff 优化是互补关系还是替代关系？
>
> ✅ 标准答案：虚拟列表根据容器滚动位置动态计算可视区域对应的数据索引，只渲染这个范围内的真实 DOM 节点，用占位容器模拟整体滚动高度。它和 Diff 优化是互补关系——Diff 优化减少"比较 VNode 的开销"，虚拟列表减少"维护真实 DOM 节点的开销"，两者面对的是不同层级的性能瓶颈。
>
> 🎁 加分答案：能指出虚拟列表是框架无关的通用方案，Vue 2/Vue 3 都需要，不是 Vue 3 的专属新特性；结合 `v-memo` + 虚拟列表可以同时降低 Diff 范围和 DOM 节点数量，两个优化手段可以叠加使用。

---

## 🧩 六、响应式意外触发怎么排查：onTrack / onTrigger

### 现象：computed 明明只依赖了一个字段，却在无关数据变化时重新计算

医疗场景：一个 `computed` 用来计算"处方总金额"，理论上只应该依赖 `prescription.items` 这个数组，但实际调试发现，修改患者的联系电话（`patient.phone`）居然也会触发这个 `computed` 重新求值。肉眼审查代码逻辑一时半会看不出问题——这类"响应式依赖收集范围超出预期"的问题，靠读代码排查效率很低。

### 方案：onTrack / onTrigger 调试钩子定位依赖来源

```typescript
import { computed } from 'vue'

const totalAmount = computed(() => {
  return prescription.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}, {
  onTrack(event) {
    // 每次这个 computed 依赖收集时触发，打印出到底收集了哪些依赖
    console.log('依赖收集：', event.target, event.key)
  },
  onTrigger(event) {
    // 每次触发这个 computed 重新计算时触发，打印出是谁触发的
    console.log('触发重新计算：', event.target, event.key, event.type)
  }
})
```

运行后观察 `onTrack` 打印的日志，如果发现除了 `items` 之外还收集到了 `patient` 对象的依赖，通常问题出在 `reduce` 回调之外的地方"顺手"访问了不该访问的响应式数据（比如某个共享的工具函数内部读取了整个 `patient` 对象用于日志打印，触发了不必要的依赖收集）。

### 对比：有无调试钩子，排查路径的效率差异

| 场景 | 没有 `onTrack`/`onTrigger` | 有 `onTrack`/`onTrigger` |
| --- | --- | --- |
| 排查方式 | 逐行审查 `computed`/`watch` 的回调代码，靠经验猜测 | 直接打印依赖收集和触发事件，精确定位到哪个 target/key |
| 定位"意外依赖"的效率 | 低，容易漏看间接调用链里的响应式访问 | 高，日志直接暴露实际收集到的依赖 |
| 适用阶段 | - | 仅开发环境调试用，生产环境不需要挂载 |

### 原理：挂载在 ReactiveEffect 上，对应 track/trigger 内部的两个可选回调时机

`onTrack`/`onTrigger` 本质是 `computed`/`watchEffect` 底层创建的 `ReactiveEffect` 实例上的两个可选回调函数，`track()` 函数在把当前 effect 添加进依赖的 `dep` 集合时，如果这个 effect 挂了 `onTrack`，就会调用一次；`trigger()` 函数在遍历 `dep` 执行 effect 之前，如果挂了 `onTrigger`，也会调用一次：

```typescript
// 示意：track/trigger 内部对 onTrack/onTrigger 的调用时机
export function track(target, type, key) {
  if (activeEffect) {
    // ...建立依赖关系的逻辑
    if (activeEffect.onTrack) {
      activeEffect.onTrack({ effect: activeEffect, target, type, key })
    }
  }
}

export function triggerEffects(dep) {
  for (const effect of dep.keys()) {
    if (effect.onTrigger) {
      effect.onTrigger({ effect, target, type, key })
    }
    // ...正常执行 effect
  }
}
```

**对比 Vue 2**：Vue 2 没有统一的 `effect` 抽象——响应式的依赖收集分散在 `Dep`/`Watcher` 两个类之间，`Watcher` 没有暴露 `onTrack`/`onTrigger` 这样的公开调试接口，排查"意外依赖"通常只能靠 `Vue.config.debug` 之类的开发者工具或者手动在 `getter`/`setter` 里打断点。Vue 3 把响应式的核心执行单元统一抽象成 `ReactiveEffect`（`ref`/`computed`/`watch`/组件渲染全部基于它），这个统一抽象天然带来了"在同一个位置挂调试钩子就能覆盖所有响应式场景"的好处——**这是响应式系统架构统一之后的直接收益，不是单独补的一个调试功能**。

> 💬 **面试官**：`onTrack`/`onTrigger` 能帮助排查什么问题？底层是怎么触发的？
>
> ✅ 标准答案：帮助排查 `computed`/`watch` 依赖收集范围超出预期、或者被意外触发重新计算的问题。底层挂载在 `ReactiveEffect` 实例上，`track()` 建立依赖关系时触发 `onTrack`，`trigger()` 执行 effect 前触发 `onTrigger`，回调里能拿到具体的 target/key/type 信息定位依赖来源。
>
> 🎁 加分答案：能提到这是 Vue 3 统一 `ReactiveEffect` 抽象之后才能实现的调试能力，Vue 2 的 `Watcher`/`Dep` 分离设计没有对应的公开调试钩子。

---

## 🧩 七、构建产物怎么瘦身：路由懒加载 + manualChunks + Tree Shaking

### 现象：vendor chunk 几 MB，或者拆出来的小 chunk 太多导致请求数暴涨

医院管理系统按路由做了懒加载，医生站/护士站/管理后台各自的模块都用 `() => import(...)` 拆开了，构建产物却出现两种极端问题：一是所有第三方依赖被自动打进一个几 MB 的 `vendor.js`，首页加载这一个大文件就要等很久；二是矫枉过正手动拆了几十个细粒度小 chunk，页面加载时并发发起几十个 HTTP 请求，连接开销反而抵消了懒加载的收益。

### 方案：按业务模块手动配置 manualChunks，粗细粒度取一个平衡点

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 按业务模块归并，而不是按文件粒度或者全部丢进一个 vendor
          if (id.includes('/views/doctor/')) return 'doctor'
          if (id.includes('/views/nurse/')) return 'nurse'
          if (id.includes('/views/admin/')) return 'admin'
          // 第三方依赖按体积拆分，而不是全部塞进一个 vendor
          if (id.includes('node_modules/echarts')) return 'echarts'
          if (id.includes('node_modules')) return 'vendor'
        }
      }
    }
  }
})
```

### 对比：分包前后请求数与首屏体积的变化

| 场景 | 默认打包（无 manualChunks） | 过度拆分（按文件级拆） | 按业务模块归并 |
| --- | --- | --- | --- |
| 首页需要加载的 chunk 数量 | 1 个巨大 bundle | 几十个零散小文件 | 3-5 个业务相关 chunk |
| 首页首屏体积 | 包含所有角色的代码 | 体积分散但连接数暴涨 | 只加载当前角色相关模块 |
| 网络请求开销 | 单个大文件传输慢 | 多个小文件的连接建立开销叠加 | 请求数量适中，体积也可控 |

### 原理：Tree Shaking 生效的前提是 ESM + 无副作用标记，manualChunks 是在打包图上手动划线

**Tree Shaking 为什么在 Vue 3 完全生效，前提条件是什么**：Tree Shaking 依赖打包工具能静态分析出"哪些导出的代码没有被引用"，这要求两个前提——一是模块必须是 ESM（`import`/`export` 静态可分析，不像 CommonJS 的 `require` 是运行时才能确定），二是模块声明为无副作用（`package.json` 的 `sideEffects: false`，告诉打包工具"删掉没用到的导出是安全的，不会有隐藏的副作用依赖它被执行"）。Vue 3 的所有包都是纯 ESM + 命名导出（不像 Vue 2 挂在 `Vue` 这个默认导出对象上），这是第 01 篇讲过的"为什么 Vue 3 天生支持 Tree Shaking"的架构原因——**这一节要强调的是这个前提条件同样约束你自己项目的代码**：如果业务代码里某个工具函数模块有副作用（比如模块顶层执行了 `console.log` 或修改了全局状态），即便没有任何地方引用它的导出，打包工具也不敢删掉它，Tree Shaking 就失效了。

`manualChunks` 则是在 Rollup 构建出的模块依赖图上，手动指定"这些模块应该被打进同一个物理文件"——它不影响 Tree Shaking（该删的代码依然会被删），只影响"剩下的代码怎么分组打包"，本质是在"一个大文件"和"过度拆分成很多小文件"之间找一个适合当前项目路由结构的平衡点。

**对比 Vue 2**：Vue 2 时代如果用 Webpack，需要手写 `optimization.splitChunks` 配置，语法更繁琐；如果用 Vue 2 的完整版而非按需引入版本，`Vue` 这个默认导出对象本身就阻碍了 Tree Shaking（因为整个对象被引用，打包工具无法判断哪些方法真的没被用到）。Vue 3 的架构设计（命名导出 + ESM）让 Tree Shaking 这件事从"需要额外配置才能生效"变成了"默认生效，只要不破坏前提条件"。

> 💬 **面试官**：Vue 3 的 Tree Shaking 为什么比 Vue 2 好？前提条件是什么？
>
> ✅ 标准答案：Vue 3 全部采用 ESM + 命名导出，未使用的 API 在构建时能被静态分析并摇掉；Vue 2 挂载在 `Vue` 默认导出对象上，整体被引用导致难以摇掉未用到的部分。前提条件是模块必须是 ESM 格式，且声明 `sideEffects: false` 告知打包工具删除未引用代码是安全的。
>
> 🎁 加分答案：能指出 Tree Shaking 和 `manualChunks` 是两件独立的事——前者决定"删掉哪些没用到的代码"，后者决定"剩下的代码怎么分组打包"，业务代码如果有意外的模块副作用，同样会导致 Tree Shaking 失效，这个前提条件不仅约束框架本身也约束业务代码。

---

## 💡 一张图总结（面试速记）

| 知识点 | 解决的现象 | 核心方案 | 一句话原理 |
| --- | --- | --- | --- |
| `v-memo` | 大列表局部更新触发全量 Diff | 依赖数组比对，命中跳过节点及子树 Diff | 编译为条件判断，拦截"渲染完之后要不要参与比较" |
| `v-once` | 静态内容陪跑 Diff | 首次渲染后移出 `dynamicChildren` 收集范围 | 运行时才能确定的"不会再变"，编译期无法预判 |
| `shallowRef`/`shallowReactive` | 大型数据深层代理开销大 | 只代理第一层或只追踪整体替换 | Proxy 惰性递归策略带来的新可配置维度 |
| `markRaw` | 完全不需要响应式追踪的数据被代理 | 打标记让 `reactive()` 直接跳过 | 连第一层 Proxy 都不创建 |
| `defineAsyncComponent` | 首屏 bundle 体积过大 | 状态机驱动渲染 + 函数包一层推迟 `import` | 只有真正渲染时才发起网络请求 |
| 虚拟列表 | 真实 DOM 节点数量过多导致滚动卡顿 | 只渲染可视区域节点 | 和 Diff 优化互补而非替代的不同维度瓶颈 |
| `onTrack`/`onTrigger` | 响应式意外触发难排查 | 挂载在 `ReactiveEffect` 的调试回调 | 统一 effect 抽象带来的可观测性收益 |
| `manualChunks` + Tree Shaking | 构建产物加载效率低 | 按业务模块归并 + ESM 静态分析摇树 | 分包解决"怎么组织"，摇树解决"删掉什么" |

---

## 📝 留个问题

> 💬 **面试追问**：如果一个 `v-for` 列表的行组件同时用了 `v-memo` 和虚拟列表，某一行数据变化但这一行当前没有出现在可视区域内（被虚拟列表卷出去了，没有对应的真实 DOM 节点），这次数据变化还会触发 Diff 吗？

提示：回到第五节的原理——虚拟列表只为可视区域内的数据创建真实 VNode 和 DOM 节点，不在可视区域内的数据根本没有对应的组件实例存在。想清楚"没有被渲染出来的数据变化，Diff 从何谈起"这一点，再想一下：如果这一行数据后续因为滚动重新进入可视区域，虚拟列表是重新创建一个全新的组件实例，还是复用之前的实例——这背后关联的是虚拟列表库自身的节点回收策略，而不是 Vue 的 Diff 算法本身。

---

> 🔖 这是「Vue 3 全家桶深度拆解系列」第 10 篇。上一篇：《Vue Router 4 原理与实战：从 Options API 迁移到组合式路由，导航守卫链路怎么变了（面试收藏级）》；下一篇预告：《Turborepo + pnpm workspace：Vue 3 前端 AI 组件库从零搭建（面试收藏级）》
