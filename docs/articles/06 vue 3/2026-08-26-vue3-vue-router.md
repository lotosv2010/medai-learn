# Vue Router 4 原理与实战：从 Options API 迁移到组合式路由，导航守卫链路怎么变了（面试收藏级）

> 面试官问：「`useRoute()` 拿到的对象是响应式的吗？」大多数人会答「是」——追一句「它是怎么做到响应式的，`inject` 拿到的东西凭什么会自动更新组件」，答案就开始卡壳了。「组合式 API 嘛，用 `ref` 包一下」这种回答是**猜**，不是**懂**。

> 真正的答案藏在一行不起眼的代码里：`createRouter` 内部维护了一个 `shallowRef` 的 `currentRoute`，每次导航确认后直接整体替换这个 `ref.value`——`useRoute()` 不是拿到一个"响应式对象"，而是拿到一个**通过 `Object.defineProperty` 转发到 `currentRoute.value` 的浅响应式代理**，路由变化时它自己就是"新的那个值"，依赖它的组件因此自动重渲染。这不是"用了组合式 API 所以响应式"，而是**响应式系统的读写转发链路设计出来的效果**。

> 这篇文章是「Vue 3 全家桶深度拆解」系列第 9 篇。前 8 篇拆过响应式、渲染、组件、Composition API、内置组件、编译优化、Pinia，这篇要讲清楚前端路由这层——**`useRoute()` 的响应式转发链路、`<RouterView>` 怎么"递归"渲染嵌套路由、导航守卫的完整执行顺序，以及 `addRoute` 之后页面为什么不会自动刷新**。

---

## 🎯 这篇文章解决什么问题

`useRouter()`/`useRoute()` 换掉 `this.$router`/`this.$route` 谁都会用，但面试官问"导航守卫完整顺序是什么""`<RouterView>` 怎么递归渲染嵌套路由""动态 `addRoute` 之后为什么当前页面纹丝不动"，很多人只能说个大概。

这篇文章打通的是 Vue Router 4 从"能用"到"能讲透"的这条链路：`useRoute()` 的响应式不是魔法，是 `shallowRef` + `Object.defineProperty` 转发；`<RouterView>` 不会真的写递归函数，是靠 `provide`/`inject` 的深度计数器让组件树自己形成递归链；导航守卫的 8 个阶段本质是一串用 `Array.reduce` 串起来的 Promise 队列；`addRoute` 只是往一个排序数组里插入一条新记录，不会自动触发任何视图更新——这几个点想透了，其余的 API 都是水到渠成的推论。读完你会同时拿到**懂原理**（Vue Router 4 每一处设计和 Vue 2 的差异都有明确取舍）和**会讲**（面试官从"响应式怎么实现"问到"矩阵匹配用的是 Trie 树吗"，你能用同一套"整体替换 + 订阅转发"的框架把追问串起来）。

---

## 🧩 一、基本使用

先过一遍怎么用，五个核心场景——原理留到下一节逐个拆开讲。

### 安装与配置：`createRouter({ history, routes })`

```typescript
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(), // 路由模式，决定 URL 长什么样、怎么监听变化
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/Home.vue') },
    {
      path: '/prescription/:id',
      name: 'prescription-detail',
      component: () => import('@/views/PrescriptionDetail.vue'),
      meta: { requiresAuth: true } // 元信息，配合导航守卫做权限校验
    }
  ]
})

app.use(router)
```

`createRouter` 只接收两个必填项：`history`（决定路由模式）和 `routes`（路由表）。装好之后 `app.use(router)` 会把路由实例和当前路由状态一起注入进整个组件树，「二、原理」第 2 小节会讲这一步具体做了什么。

### 组合式 API 路由钩子：`useRouter()` / `useRoute()` 替代 `this.$router / this.$route`

```vue
<script setup>
import { useRouter, useRoute } from 'vue-router'

const router = useRouter() // 等价于 Vue 2 里的 this.$router，用于编程式导航
const route = useRoute()   // 等价于 Vue 2 里的 this.$route，读取当前路由信息

function goToDetail(id: string) {
  router.push({ name: 'prescription-detail', params: { id } })
}
</script>

<template>
  <p>当前处方 ID：{{ route.params.id }}</p>
</template>
```

`<script setup>` 里没有 `this`，`useRouter()`/`useRoute()` 就是给组合式 API 补上这块能力——本质是两次 `inject()` 调用，「三、源码解析」第 1 小节直接看源码就知道有多简单。

### 路由模式：`createWebHistory` / `createWebHashHistory` / `createMemoryHistory`

| 模式 | URL 形态 | 依赖的浏览器 API | 适用场景 |
| --- | --- | --- | --- |
| `createWebHistory` | `/prescription/1`（干净无 `#`） | `pushState`/`replaceState` + `popstate` | 生产环境首选，SEO 友好，但需要服务端配置 fallback（如 Nginx `try_files`），否则刷新直接进入 `/prescription/1` 会 404 |
| `createWebHashHistory` | `/#/prescription/1`（带 `#`） | 同上（Vue Router 4 内部统一走 `popstate`，见下一节） | 不需要服务端配置，适合纯静态部署、`file://` 协议、旧浏览器兼容场景 |
| `createMemoryHistory` | 不反映到浏览器地址栏 | 内存里维护一个位置栈 | SSR 服务端渲染、单元测试环境（没有真实 `window.history`） |

### 导航守卫的组合式写法：`onBeforeRouteLeave` / `onBeforeRouteUpdate`

```vue
<script setup>
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { ref } from 'vue'

const isEditing = ref(true)

// 等价于 Options API 里组件内的 beforeRouteLeave，但可以在任意组合式函数里复用
onBeforeRouteLeave((to, from) => {
  if (isEditing.value) {
    const confirmed = window.confirm('处方单还未保存，确定离开吗？')
    if (!confirmed) return false // 返回 false 阻止导航
  }
})

// 等价于 beforeRouteUpdate，处理同一个组件被复用但路由参数变化的情况（如 /prescription/1 -> /prescription/2）
onBeforeRouteUpdate((to, from) => {
  console.log('处方 ID 变化：', from.params.id, '->', to.params.id)
})
</script>
```

这两个函数是 Options API 里 `beforeRouteLeave`/`beforeRouteUpdate` 组件内守卫的组合式版本——最大的差别是**可以被抽进任意 Composable 里复用**，不再局限于写在组件选项对象上，「二、原理」第 4 小节会讲清楚它们和全局守卫如何拼成完整的执行顺序。

### 动态路由：`addRoute` / `removeRoute` + 路由懒加载

```typescript
// 登录后根据角色动态注册路由（医疗场景：医生/护士/管理员权限不同）
router.addRoute({
  path: '/admin/audit-log',
  name: 'admin-audit-log',
  component: () => import('@/views/admin/AuditLog.vue') // 懒加载，Vite 自动拆分 chunk
})

router.removeRoute('admin-audit-log') // 按 name 移除
```

`component: () => import(...)` 这种写法就是路由懒加载——注意是**返回 Promise 的函数**，不是直接 `import(...)` 的结果，这个细节「二、原理」第 6 小节会解释为什么函数包一层是必须的。

---

## 🧩 二、原理

Vue Router 4 的所有设计都可以归结到一句话：**当前路由是一份被整体替换的响应式快照，`<RouterView>`/守卫/`addRoute` 全部是围绕"谁在什么时候读写这份快照"展开的机制**。这一节按"是什么 → 怎么实现 → 为什么这样设计"的顺序逐个拆开。

### 1. 前端路由的本质：History API + `popstate`，Hash 模式也不例外

前端路由要解决的问题从 Vue 2 到 Vue 3 没有变过：**监听 URL 变化，局部更新视图，不向服务端发起整页请求**。History 模式的实现路径很直观——`pushState`/`replaceState` 修改地址栏但不刷新页面，浏览器前进后退触发 `popstate` 事件，路由库监听这个事件重新匹配渲染。

容易讲错的是 Hash 模式：很多人的印象是"Hash 模式靠 `hashchange` 事件"，这在 Vue Router 3 是对的，但**Vue Router 4 的 Hash 模式内部统一走 `pushState`/`replaceState` + `popstate`**，源码里 `createWebHashHistory` 只是对 base 路径做了一层"补 `#`"的包装，实际的历史记录管理直接复用 `createWebHistory` 的实现：

```typescript
// packages/router/src/history/hash.ts（官方源码）
export function createWebHashHistory(base?: string): RouterHistory {
  base = location.host ? base || location.pathname + location.search : ''
  if (!base.includes('#')) base += '#' // 只是在 base 里补一个 #
  return createWebHistory(base) // 👈 复用 html5 history 的实现，不是另起一套监听逻辑
}
```

也就是说，Hash 模式下 `router.push('/prescription/1')` 内部依然调用的是 `history.pushState`（浏览器允许对包含 `#` 的 URL 调用 `pushState`），地址栏变成 `/#/prescription/1` 只是字符串拼接的结果，监听变化靠的还是 `popstate`。

> 💬 **面试官**：Hash 模式和 History 模式的路由变化监听机制有什么区别？
>
> ✅ 标准答案：History 模式基于 `pushState`/`replaceState` 修改地址 + `popstate` 事件监听前进后退；Hash 模式基于 `location.hash` 改变 URL 的 `#` 后半部分。
>
> 🎁 加分答案：能指出 Vue Router 4 的实现细节——Hash 模式不再单独监听 `hashchange`，而是把 `#` 之后的内容也纳入 `pushState` 管理，统一走 `popstate` 事件，这样两种模式共享同一套历史记录管理代码，减少了"两套事件、两套状态同步逻辑"的维护成本。

> **对比 Vue 2 / Vue Router 3**：Vue Router 3 的 Hash 模式独立监听 `window.addEventListener('hashchange', ...)`，和 History 模式是两条完全不同的代码路径。Vue Router 4 把两者统一到 `pushState`/`popstate` 这一套机制上，「为什么这样设计」：**统一事件源之后，导航守卫、滚动行为、历史记录管理这些上层逻辑可以对两种模式完全复用，不需要在每个功能点上都写一份 Hash 特判**。

### 2. `useRoute()` 响应式原理：`shallowRef` + `Object.defineProperty` 转发

`createRouter` 内部只有一个真正持有路由状态的变量：

```typescript
// packages/router/src/router.ts（官方源码，简化）
const currentRoute = shallowRef<RouteLocationNormalizedLoaded>(
  START_LOCATION_NORMALIZED
)
```

`shallowRef` 而不是 `ref`——这是关键的性能取舍。`currentRoute.value` 每次导航都是**整体替换**成一个全新对象（不是修改某个字段），所以不需要深层响应式追踪内部属性，`shallowRef` 只追踪 `.value` 这一层引用变化就足够，省掉了对 `matched`/`params`/`query` 这些嵌套字段做深度代理的开销。

真正让 `useRoute()` 用起来像"响应式对象"的，是 `install()` 里的这段转发代码：

```typescript
// packages/router/src/router.ts（官方源码，install 方法内）
const reactiveRoute = {} as RouteLocationNormalizedLoaded
for (const key in START_LOCATION_NORMALIZED) {
  Object.defineProperty(reactiveRoute, key, {
    get: () => currentRoute.value[key as keyof RouteLocationNormalized], // 👈 每次读取都转发到 currentRoute.value 的最新值
    enumerable: true,
  })
}
app.provide(routeLocationKey, shallowReactive(reactiveRoute))
```

`reactiveRoute` 上的每一个字段（`path`/`params`/`query`/`matched`……）都被定义成一个 getter，读取时**实时**转发到 `currentRoute.value` 当前指向的那个对象——外面再用 `shallowReactive` 包一层，让这些 getter 本身可以被模板/`computed`/`watch` 追踪到。`useRoute()` 拿到的就是 `inject(routeLocationKey)` 返回的这个 `reactiveRoute`。

```typescript
// packages/router/src/useApi.ts（官方源码，完整）
export function useRoute<Name extends keyof RouteMap = keyof RouteMap>(_name?: Name) {
  return inject(routeLocationKey) as RouteLocationNormalizedLoaded<...>
}
```

拼起来看整条链路：导航确认后 `currentRoute.value = toLocation` 整体替换 → `reactiveRoute.path` 这个 getter 被访问时读到的已经是新对象的 `path` → `shallowReactive` 触发依赖该 getter 的组件重渲染。**`useRoute()` 返回的不是"一份响应式的路由数据"，而是一层"永远转发到最新 `currentRoute.value` 的响应式读取代理"**——这也是为什么它能在任何深度的子组件里 `useRoute()` 都拿到同一份"活的"数据，不需要 props 逐层传递。

> 💬 **面试官**：`useRoute()` 返回的对象是响应式的吗？底层是怎么实现的？
>
> ✅ 标准答案：是响应式的。`createRouter` 内部用 `shallowRef` 维护一个 `currentRoute`，每次导航确认后整体替换它的值；`install()` 时用 `Object.defineProperty` 给 `path`/`params`/`matched` 等字段建了一层 getter，实时转发读取 `currentRoute.value` 的对应字段，再用 `shallowReactive` 包一层使其可被追踪，最后通过 `provide` 注入。`useRoute()` 本质是 `inject` 这个转发对象。
>
> 🎁 加分答案：能解释为什么用 `shallowRef` 不用 `ref`——因为路由状态是整体替换而非局部修改，不需要为内部嵌套字段做深度代理，`shallowRef` 只追踪引用层，性能更好。

### 3. `<RouterView>` 组件实现：不是递归函数，是 `provide`/`inject` 深度计数器形成的递归链

笔记里的直觉是"`<RouterView>` 内部递归遍历 `matched` 数组渲染组件"，但官方源码里**没有任何一处出现递归调用**——真正的机制是每个 `<RouterView>` 实例通过 `inject` 拿到父级传下来的"深度"，渲染完自己那一层再把"深度 + 1"`provide` 给子组件树，多层嵌套的 `<RouterView>` 组件树自己就形成了递归效果：

```typescript
// packages/router/src/RouterView.ts（官方源码，简化核心）
setup(props, { attrs, slots }) {
  const injectedRoute = inject(routerViewLocationKey)!
  const routeToDisplay = computed(() => props.route || injectedRoute.value)
  const injectedDepth = inject(viewDepthKey, 0) // 👈 从父级 RouterView 拿到的深度，顶层默认为 0

  // 跳过没有 components 的透传路由（比如只做路径拼接的父路由）
  const depth = computed<number>(() => {
    let initialDepth = unref(injectedDepth)
    const { matched } = routeToDisplay.value
    let matchedRoute
    while ((matchedRoute = matched[initialDepth]) && !matchedRoute.components) {
      initialDepth++
    }
    return initialDepth
  })

  const matchedRouteRef = computed(() => routeToDisplay.value.matched[depth.value])

  provide(viewDepthKey, computed(() => depth.value + 1)) // 👈 给子组件树里的下一层 RouterView 用
  provide(matchedRouteKey, matchedRouteRef)
  provide(routerViewLocationKey, routeToDisplay)

  return () => {
    const matchedRoute = matchedRouteRef.value
    const ViewComponent = matchedRoute && matchedRoute.components![props.name]
    if (!ViewComponent) return normalizeSlot(slots.default, { Component: ViewComponent, route: routeToDisplay.value })
    return h(ViewComponent, assign({}, /* props/attrs */ {}))
  }
}
```

拆开看整条链路：假设路由匹配出 `matched = [父路由记录, 子路由记录]`（嵌套路由）。最外层的 `<RouterView>` 没有从父级 `inject` 到深度，默认 `depth = 0`，于是渲染 `matched[0]`（父路由组件），同时 `provide` 出 `depth = 1` 给自己的子组件树；父路由组件模板里如果又写了一个 `<RouterView>`，这个内层 `<RouterView>` 通过 `inject` 拿到 `depth = 1`，渲染 `matched[1]`（子路由组件）。**「递归」不是某个函数自己调用自己，是组件树的嵌套结构 + `provide`/`inject` 的深度计数器共同实现的效果**——`<RouterView>` 出现几次，就消费 `matched` 数组的几层。

> 💬 **面试官**：`<RouterView>` 是如何递归渲染嵌套路由的？
>
> ✅ 标准答案：不是函数递归，是组件树递归。每个 `<RouterView>` 通过 `inject(viewDepthKey, 0)` 拿到当前应该渲染 `matched` 数组的哪一层，渲染完之后 `provide(viewDepthKey, depth + 1)` 给自己的子组件树。模板里嵌套写了几层 `<RouterView>`，就对应消费 `matched` 数组的几层。
>
> 🎁 加分答案：能提到 `depth` 计算时会跳过没有 `components` 的路由记录（`while` 循环那一段）——这是为了支持"只做路径拼接、不渲染任何组件"的透传路由（比如把多层路径统一收敛到一个不渲染内容的父路由下）。

> **对比 Vue 2 / Vue Router 3**：Vue 2 的 `<router-view>` 实现思路一致——都是靠 `$route.matched` 数组 + 组件树天然的嵌套结构，Options API 时代用的是 `inject`/`provide` 的选项式写法（`provide()` 方法）。Vue Router 4 把这套机制迁移成组合式 API 的 `provide`/`inject` 函数调用，「为什么这样设计」：**核心算法完全没变（这也是为什么这块知识点能直接沿用 Vue 2 的理解），改变的只是"用什么 API 声明依赖注入关系"，这是整个 Vue 3 生态"组合式重写、原理不变"的典型案例**。

### 4. 导航守卫完整执行顺序：`extractChangingRecords` 拆分三类记录 + `runGuardQueue` 串行执行

导航守卫是 Vue Router 面试的高频重灾区，完整顺序背下来容易，讲清楚"为什么是这个顺序"才是加分项。先看完整的 12 步：

1. 组件内 `beforeRouteLeave`（离开的组件）
2. 全局 `beforeEach`
3. 组件内 `beforeRouteUpdate`（复用的组件，参数变化但组件不变）
4. 路由独享 `beforeEnter`
5. 解析异步路由组件
6. 组件内 `beforeRouteEnter`（新进入的组件）
7. 全局 `beforeResolve`
8. 导航确认
9. 全局 `afterEach`
10. 触发 DOM 更新
11. `beforeRouteEnter` 里 `next(vm)` 回调执行

这个顺序不是随手排的，源码里 `navigate()` 函数先用 `extractChangingRecords` 把 `to`/`from` 的匹配记录分成三组，再依次跑对应的守卫队列：

```typescript
// packages/router/src/navigationGuards.ts（官方源码）
export function extractChangingRecords(to, from) {
  const leavingRecords = []   // 只在 from 里，不在 to 里 —— 要离开的
  const updatingRecords = []  // to 和 from 都有 —— 组件复用，只是参数变了
  const enteringRecords = []  // 只在 to 里，不在 from 里 —— 新进入的
  const len = Math.max(from.matched.length, to.matched.length)
  for (let i = 0; i < len; i++) {
    const recordFrom = from.matched[i]
    if (recordFrom) {
      if (to.matched.find(record => isSameRouteRecord(record, recordFrom)))
        updatingRecords.push(recordFrom)
      else leavingRecords.push(recordFrom)
    }
    const recordTo = to.matched[i]
    if (recordTo && !from.matched.find(record => isSameRouteRecord(record, recordTo))) {
      enteringRecords.push(recordTo)
    }
  }
  return [leavingRecords, updatingRecords, enteringRecords]
}
```

`/prescription/1` 跳到 `/prescription/2`（同一个组件，只是 `params.id` 变了）——这条路由记录在 `to`/`from` 里都存在，走 `updatingRecords`（触发 `beforeRouteUpdate`）；`/prescription/1` 跳到 `/settings`——原路由记录只在 `from` 里，走 `leavingRecords`（触发 `beforeRouteLeave`）。**先离开、再更新、再进入**这个大顺序的原因很直观：离开的组件要先有机会阻止导航（比如未保存提示），复用的组件次之，全新进入的组件最后处理，避免"半途中已经开始加载新组件却被离开守卫拦截"造成的资源浪费。

真正串行执行靠的是 `router.ts` 里这个朴素的 Promise reduce：

```typescript
// packages/router/src/router.ts（官方源码）
function runGuardQueue(guards: Lazy<any>[]): Promise<any> {
  return guards.reduce(
    (promise, guard) => promise.then(() => runWithContext(guard)),
    Promise.resolve()
  )
}
```

`navigate()` 函数把 12 步拆成 5 个阶段，每个阶段构建一个 `guards` 数组，调一次 `runGuardQueue`，`.then()` 链式进入下一阶段——任何一个守卫 `reject`（调 `next(false)` 或抛错），整条链就在这个阶段截断，后续阶段不会执行：

```typescript
// packages/router/src/router.ts（官方源码，navigate 函数骨架）
function navigate(to, from) {
  const [leavingRecords, updatingRecords, enteringRecords] = extractChangingRecords(to, from)
  let guards = extractComponentsGuards(leavingRecords.reverse(), 'beforeRouteLeave', to, from)
  // ...还要 push 组件内 onBeforeRouteLeave 注册的守卫
  return runGuardQueue(guards)
    .then(() => runGuardQueue(/* 全局 beforeEach */))
    .then(() => runGuardQueue(/* beforeRouteUpdate */))
    .then(() => runGuardQueue(/* 路由独享 beforeEnter */))
    .then(() => runGuardQueue(/* beforeRouteEnter，此处触发异步组件解析 */))
    .then(() => runGuardQueue(/* 全局 beforeResolve */))
}
```

第 5 个阶段（`beforeRouteEnter`）之前有一步「解析异步路由组件」，源码里藏在 `extractComponentsGuards` 内部——如果路由组件是懒加载的函数（`() => import(...)`），会先 `componentPromise.then(resolved => ...)` 把组件 resolve 出来，再从 resolve 后的组件选项上取 `beforeRouteEnter` 守卫，这就是为什么"解析异步组件"这一步排在 `beforeRouteEnter` 之前而不是更早——**只有确定这个组件真的要进入了才值得去加载它**。

`beforeRouteEnter` 支持传 `next(vm => { ... })` 这种回调形式，是因为组件内守卫触发时组件实例还没创建完，`guardToPromiseFn` 里把这个回调存进 `enterCallbackArray`，等到真正 mount 完成（`<RouterView>` 里 `watch` 监听到 `viewRef.value` 有值）才触发执行——对应完整顺序里最后一步「`next(vm)` 回调」。

> 💬 **面试官**：导航守卫的完整执行顺序是什么？和 Vue 2 相比有什么变化？
>
> ✅ 标准答案：组件内 `beforeRouteLeave` → 全局 `beforeEach` → 组件内 `beforeRouteUpdate` → 路由独享 `beforeEnter` → 解析异步组件 → 组件内 `beforeRouteEnter` → 全局 `beforeResolve` → 导航确认 → 全局 `afterEach` → DOM 更新 → `beforeRouteEnter` 的 `next(vm)` 回调。核心顺序和 Vue Router 3 一致；变化在于组合式 API 新增了 `onBeforeRouteLeave`/`onBeforeRouteUpdate` 两个可在任意 Composable 里调用的等价函数。
>
> 🎁 加分答案：能解释顺序背后的设计逻辑——`extractChangingRecords` 先把记录分成 leaving/updating/entering 三组，源码里用 `guards.reduce((p, guard) => p.then(...), Promise.resolve())` 把每个阶段串成 Promise 链，任何一环 `reject` 就整体截断，异步组件解析被安排在"确定要进入"之后才做，避免无意义的资源加载。

### 5. `addRoute` 动态添加路由原理：排序数组二分插入，不是 Trie 树

笔记里的原始描述是"向路由匹配表（基于路径 Trie / 数组匹配器）插入新记录"——**这里需要纠正**：Vue Router 4 的 matcher 用的是**一个按匹配优先级排好序的普通数组**，不是 Trie 树。`addRoute` 内部调用 `insertMatcher`，靠二分查找找到插入位置：

```typescript
// packages/router/src/matcher/index.ts（官方源码）
function insertMatcher(matcher: RouteRecordMatcher) {
  const index = findInsertionIndex(matcher, matchers) // 👈 二分查找插入位置
  matchers.splice(index, 0, matcher)
  if (matcher.record.name && !isAliasRecord(matcher))
    matcherMap.set(matcher.record.name, matcher) // 按 name 建一份 Map 索引，resolve({ name }) 时 O(1) 查找
}

function findInsertionIndex(matcher, matchers) {
  let lower = 0
  let upper = matchers.length
  while (lower !== upper) {
    const mid = (lower + upper) >> 1
    const sortOrder = comparePathParserScore(matcher, matchers[mid]) // 按路径的"具体程度"打分比较
    if (sortOrder < 0) upper = mid
    else lower = mid + 1
  }
  return lower
}
```

`comparePathParserScore` 给每条路由记录的路径打分——静态段（`/prescription/detail`）比带参数的段（`/prescription/:id`）分数更高，越具体的路径排在数组越前面，保证 `resolve()` 遍历匹配时"精确路径优先于模糊路径"。`addRoute`/`removeRoute` 本质就是往这个数组插入/删除一条记录，配合 `matcherMap`（按 `name` 索引）实现按名字精确查找。

真正值得深挖的是**为什么 `addRoute` 之后当前页面不会自动刷新**。`createRouter` 里维护了一个和路由表变化绑定的计数器：

```typescript
// packages/router/src/router.ts（官方源码）
const routesVersion = shallowRef(0)

function addRoute(parentOrRoute, route) {
  const removeRoute = matcher.addRoute(record, parent)
  routesVersion.value++ // 👈 路由表变化，递增版本号
  return () => { removeRoute(); routesVersion.value++ }
}

function resolve(rawLocation, currentLocation) {
  routesVersion.value // 👈 在 resolve 函数体内读取一次，让依赖 resolve() 的 computed 能追踪到路由表变化
  // ...实际的解析逻辑
}
```

`routesVersion` 只在 `resolve()` 内部被"读一下"（触发依赖收集），却从来没有被拿来做任何判断——它存在的唯一目的是让"依赖 `resolve()` 结果的 `computed`"在路由表变化时重新计算。但**`addRoute` 本身完全不会修改 `currentRoute.value`**——`currentRoute` 是导航确认那一刻的快照，`matcher` 里多了一条新记录，跟"当前已经渲染出来的这份快照"没有任何关系。这就是为什么登录后动态注册了新路由，当前页面的 `<RouterView>` 该渲染什么组件不会有任何变化——除非手动触发一次导航让 `currentRoute` 重新走一遍 `resolve()`：

```typescript
// 医疗场景：登录后按角色注册路由，必须手动 replace 才能让当前地址重新解析
async function setupRoleRoutes(role: 'doctor' | 'nurse' | 'admin') {
  const roleRoutes = await fetchRoutesByRole(role)
  roleRoutes.forEach(route => router.addRoute(route))
  // 👈 关键一步：用当前的 fullPath 重新触发一次导航，让 currentRoute 用新的路由表重新 resolve
  await router.replace(router.currentRoute.value.fullPath)
}
```

`router.replace(fullPath)` 会走完整的 `navigate()` 流程，用新增过路由的 `matcher` 重新 `resolve` 这个路径——如果新路由刚好匹配这个路径（比如刷新页面前是直接访问一个受权限保护的深层地址），这一次才会真正把 `currentRoute.value` 换成匹配到新路由的结果。

> 💬 **面试官**：`addRoute` 动态添加路由后，为什么当前页面不会自动更新？怎么解决？
>
> ✅ 标准答案：`addRoute` 只是把新记录插入 matcher 内部维护的排序数组，不会触碰 `currentRoute`（导航确认时刻的响应式快照）。要让当前地址重新匹配，需要手动调用 `router.replace(router.currentRoute.value.fullPath)`，让路由重新走一遍 `resolve` 流程。
>
> 🎁 加分答案：能提到 `routesVersion` 这个内部计数器——它的作用只是让依赖 `resolve()` 的 `computed` 能在路由表变化时重新求值，跟"当前渲染的页面会不会更新"是两件事，纠正"路由表变了页面就该自动变"这个常见误区。

> **对比 Vue 2 / Vue Router 3**：核心机制没有变化——Vue Router 3 的 `addRoutes`（复数）已经废弃，Vue Router 4 统一成单数的 `addRoute`，语义更清晰（一次只添加一条记录及其别名）；"添加后需要手动 `replace` 触发重新匹配"这个行为在两个版本里是一致的。「为什么这样设计」：**路由表和当前路由状态本来就是两个独立的东西——路由表回答"有哪些可能的路径"，`currentRoute` 回答"现在具体停在哪一条"，两者不自动联动是为了避免每次路由表变化都强制触发一次可能没有意义的重新渲染**。

### 6. 路由懒加载：为什么必须是函数返回 Promise，而不是直接 `import(...)`

「一、基本使用」里强调过 `component: () => import(...)` 必须包一层函数，源码里 `extractComponentsGuards` 对这个细节有专门的开发环境校验：

```typescript
// packages/router/src/navigationGuards.ts（官方源码）
} else if ('then' in rawComponent) {
  // 警告：用户直接写了 import('./component.vue') 而不是 () => import('./component.vue')
  diagnostics.VUE_ROUTER_R0028({ name, path: record.path })
  const promise = rawComponent
  rawComponent = () => promise
}
```

原因很直观：`import(...)` 语句一执行就会立刻发起网络请求，如果直接把 `import(...)` 的结果（一个 Promise）赋给 `component`，意味着**这个路由对应的 chunk 在路由表定义的那一刻就被加载了**，跟"懒加载"的初衷背道而驰。包一层函数 `() => import(...)`，只有在真正需要渲染这个组件时（`extractComponentsGuards` 遍历到这条记录）才会调用这个函数触发 `import`，chunk 加载被推迟到导航发生的那一刻。

Vite 处理动态 `import()` 是开箱即用的——只要写了 `() => import('./xxx.vue')`，Vite 的 Rollup 打包器会自动识别这是一个代码分割点，构建时把 `xxx.vue` 及其依赖单独打成一个 chunk，运行时按需通过 `<script type="module">` 的动态 import 语法加载。Vue 2 时代 Webpack 需要额外写魔法注释（如 `import(/* webpackChunkName: "xxx" */ './xxx.vue')`）才能控制 chunk 命名，Vite 默认按文件路径自动命名，需要自定义策略时才要手动干预（「四、生产级最佳实践」会讲具体配置）。

### 7. `scrollBehavior` 异步支持：返回 Promise 等待过渡动画结束再滚动

```typescript
// packages/router/src/router.ts（官方源码，handleScroll 内部）
return nextTick()
  .then(() => scrollBehavior(to, from, scrollPosition)) // 👈 scrollBehavior 的返回值可以是 Promise
  .then(position => to === currentRoute.value && position && scrollToPosition(position))
```

`scrollBehavior` 配置项的返回值被 `.then()` 直接消费——不管你写的是同步返回滚动位置对象，还是返回一个 `Promise<位置对象>`，处理逻辑完全一致。这个设计是为了配合 `<Transition>` 页面切换动画：如果新页面有一个 300ms 的进入动画，直接在导航确认瞬间就把 `scrollTop` 设置为 0，会让用户在动画播放过程中"看到"页面突然跳动；返回一个 `Promise`，在动画的 `onAfterEnter` 回调里再 `resolve`，就能让滚动发生在动画结束之后。

```typescript
// 医疗场景：药品详情页切换时，等待页面进入动画播完再滚动到顶部
const router = createRouter({
  // ...
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition // 浏览器前进后退，恢复原滚动位置
    return new Promise(resolve => {
      // transitionDuration 是页面级 <Transition> 动画时长的约定值
      setTimeout(() => resolve({ top: 0 }), 300)
    })
  }
})
```

---

## 🧩 三、源码解析（重点代码，来源 GitHub 仓库，对齐 Vue Router 4/5 官方源码）

上一节把原理拆开讲了，这一节逐个文件对照官方仓库（https://github.com/vuejs/router）走一遍，看每个知识点具体落在哪一行代码上。

### 1. `useRouter` / `useRoute`：`packages/router/src/useApi.ts`

这是整个 Vue Router 源码里最短的文件，25 行，两个函数都只做一次 `inject`：

```typescript
// packages/router/src/useApi.ts（官方源码，完整）
import { inject } from 'vue'
import { routerKey, routeLocationKey } from './injectionSymbols'

export function useRouter(): Router {
  return inject(routerKey)!
}

export function useRoute<Name extends keyof RouteMap = keyof RouteMap>(
  _name?: Name
) {
  return inject(routeLocationKey) as RouteLocationNormalizedLoaded<...>
}
```

`routerKey`/`routeLocationKey` 这两个注入键在 `router.ts` 的 `install()` 方法里被 `app.provide()`——`useRouter()` 拿到的是路由实例本身（一堆方法的集合：`push`/`replace`/`addRoute`……），`useRoute()` 拿到的是「二、原理」第 2 小节讲过的那个 `reactiveRoute` 转发对象。没有任何额外的包装逻辑，这也是为什么这两个函数可以在任意深度的子组件、任意 Composable 内部直接调用——`inject` 本身就是跨层级查找的。

### 2. `createRouter`：`packages/router/src/router.ts`

核心初始化只有三行，对应「基本使用」里 `createRouter({ history, routes })` 传入的两个参数：

```typescript
// packages/router/src/router.ts（官方源码）
export function createRouter(options: RouterOptions): Router {
  const matcher = createRouterMatcher(options.routes, options) // 路由表 -> 匹配器
  const routerHistory = options.history // history 模式实例
  if (__DEV__ && !routerHistory)
    throw new Error('Provide the "history" option when calling "createRouter()"')

  const currentRoute = shallowRef<RouteLocationNormalizedLoaded>(
    START_LOCATION_NORMALIZED // 初始值是一个占位的"起始位置"，还没发生过真实导航
  )
  const routesVersion = shallowRef(0) // 「二、原理」第 5 小节讲过的路由表版本号
  // ...
}
```

`install(app)` 方法是路由实例真正"接入"Vue 应用的地方，除了「二、原理」第 2 小节讲过的响应式转发，还负责首次导航和生命周期收尾：

```typescript
// packages/router/src/router.ts（官方源码，install 方法节选）
install(app: App) {
  app.component('RouterLink', RouterLink)
  app.component('RouterView', RouterView) // 全局注册这两个内置组件

  app.config.globalProperties.$router = router as Router
  Object.defineProperty(app.config.globalProperties, '$route', {
    get: () => unref(currentRoute), // Options API 里 this.$route 走的是这条路
  })

  // 首次挂载应用时，主动触发一次导航，让当前浏览器地址被解析成第一份 currentRoute
  if (isBrowser && !started && currentRoute.value === START_LOCATION_NORMALIZED) {
    started = true
    push(routerHistory.location).catch(err => { /* ... */ })
  }

  app.provide(routerKey, router as Router)
  app.provide(routeLocationKey, shallowReactive(reactiveRoute))
  app.provide(routerViewLocationKey, currentRoute) // 👈 RouterView 自己拿的是原始的 shallowRef，不是转发对象

  const unmountApp = app.unmount
  app.unmount = function () {
    // 卸载时重置 currentRoute、清理 history 监听，避免多实例场景下的状态残留
  }
}
```

`app.provide(routerViewLocationKey, currentRoute)` 这一行值得注意——`<RouterView>` 拿到的直接是原始 `shallowRef`（未经字段转发包装），因为 `<RouterView>` 内部需要访问 `matched` 数组本身而不是单个字段，用不到 `reactiveRoute` 那层针对"逐字段读取"优化的转发。这也解释了为什么应用没有走 `app.use(router)`（跳过 `install`）之前，`useRouter()`/`useRoute()`/`<RouterView>` 全都会报错或拿不到数据——它们依赖的三个注入键都是在这一步才被 `provide` 出来的。

### 3. `<RouterView>`：`packages/router/src/RouterView.ts`

「二、原理」第 3 小节已经拆过 `depth`/`provide`/`inject` 的核心逻辑，这里补一段官方源码里容易被忽略但很实用的细节——**组件实例复用时的守卫迁移**：

```typescript
// packages/router/src/RouterView.ts（官方源码，watch 回调节选）
watch(
  () => [viewRef.value, matchedRouteRef.value, props.name] as const,
  ([instance, to, name], [oldInstance, from]) => {
    if (to) {
      to.instances[name] = instance
      // 组件实例被复用（比如 /prescription/1 -> /prescription/2，同一个组件不同参数）
      // 需要把旧路由记录上挂的守卫"过户"给新路由记录，否则 onBeforeRouteLeave 注册的守卫会丢失
      if (from && from !== to && instance && instance === oldInstance) {
        if (!to.leaveGuards.size) to.leaveGuards = from.leaveGuards
        if (!to.updateGuards.size) to.updateGuards = from.updateGuards
      }
    }
    // 触发 beforeRouteEnter 里 next(vm) 注册的回调——此时组件实例才真正创建完成
    if (instance && to && (!from || !isSameRouteRecord(to, from) || !oldInstance)) {
      ;(to.enterCallbacks[name] || []).forEach(callback => callback(instance))
    }
  },
  { flush: 'post' } // 👈 DOM 更新之后才跑，对应导航守卫完整顺序的最后一步
)
```

`flush: 'post'` 是这段代码和「二、原理」第 4 小节导航守卫顺序对得上的关键——`beforeRouteEnter` 的 `next(vm)` 回调必须等组件真正挂载到 DOM 之后才能拿到组件实例，用 `post` 时机的 `watch` 恰好卡在"DOM 更新"这一步之后执行，完整对应 12 步顺序里的最后一步。

### 4. 导航守卫队列：`packages/router/src/navigationGuards.ts` + `router.ts` 的 `runGuardQueue`

「二、原理」第 4 小节讲过 `extractChangingRecords` 和 `runGuardQueue` 的骨架，这里补一段之前没展开的关键函数——`guardToPromiseFn`，它是每一个守卫最终被"转换成可执行 Promise"的地方：

```typescript
// packages/router/src/navigationGuards.ts（官方源码，简化）
export function guardToPromiseFn(guard, to, from, record?, name?, runWithContext = fn => fn()) {
  return () =>
    new Promise((resolve, reject) => {
      const next: NavigationGuardNext = (valid) => {
        if (valid === false) {
          reject(createRouterError(ErrorTypes.NAVIGATION_ABORTED, { from, to })) // next(false)
        } else if (valid instanceof Error) {
          reject(valid) // next(error)
        } else if (isRouteLocation(valid)) {
          reject(createRouterError(ErrorTypes.NAVIGATION_GUARD_REDIRECT, { from: to, to: valid })) // next('/other-path')
        } else {
          resolve() // next() 或 next(true) 或 next(vm => {...})
        }
      }
      const guardReturn = runWithContext(() => guard.call(record?.instances[name!], to, from, next))
      let guardCall = Promise.resolve(guardReturn)
      // 守卫函数参数少于 3 个（没写 next 形参），说明用的是 return false / return 路由对象 这种新写法，自动帮它调一次 next
      if (guard.length < 3) guardCall = guardCall.then(next)
      guardCall.catch(err => reject(err))
    })
}
```

这段代码解释了组合式导航守卫两种写法为什么都能用——`guard.length < 3` 是在检查这个守卫函数声明了几个形参，如果开发者写的是 `(to, from) => { return false }`（新式返回值写法，2 个参数），源码会在 Promise resolve 之后自动调一次 `next`；如果写的是 `(to, from, next) => { next(false) }`（老式回调写法，3 个参数），就完全依赖开发者自己调用 `next`。**`next(false)` 拒绝、`next(错误对象)` 拒绝、`next(路由地址)` 转成"重定向错误"再拒绝、其余情况 resolve**——这四种分支对应了导航守卫里 `next()` 所有合法用法。

`extractComponentsGuards` 是「二、原理」第 4 小节提到的"解析异步组件"逻辑的完整实现：

```typescript
// packages/router/src/navigationGuards.ts（官方源码，简化，异步组件分支）
if (isRouteComponent(rawComponent)) {
  // 同步组件：直接从 options 上取 beforeRouteEnter/beforeRouteUpdate/beforeRouteLeave
  const guard = (rawComponent.__vccOpts || rawComponent)[guardType]
  guard && guards.push(guardToPromiseFn(guard, to, from, record, name, runWithContext))
} else {
  // 异步组件：先发起 import()，resolve 之后再从解析出的组件选项上取守卫
  const componentPromise = rawComponent()
  guards.push(() =>
    componentPromise.then(resolved => {
      const resolvedComponent = isESModule(resolved) ? resolved.default : resolved
      record.components![name] = resolvedComponent // 👈 缓存到路由记录上，下次导航到这个组件不用重新 import
      const guard = (resolvedComponent.__vccOpts || resolvedComponent)[guardType]
      return guard && guardToPromiseFn(guard, to, from, record, name, runWithContext)()
    })
  )
}
```

`record.components![name] = resolvedComponent` 这一行是懒加载组件的"缓存"关键——第一次导航到这个路由时才触发 `import()`，resolve 出来的组件被写回路由记录本身，第二次导航到同一个路由直接走 `isRouteComponent` 的同步分支，不会重复发起网络请求。

### 5. matcher 路由匹配：`packages/router/src/matcher/index.ts`

「二、原理」第 5 小节已经纠正过"不是 Trie 树"这个点并给出了 `insertMatcher`/`findInsertionIndex` 的源码，这里补一段 `resolve()` 按路径字符串匹配的核心逻辑（区别于按 `name` 精确查 Map 的分支）：

```typescript
// packages/router/src/matcher/index.ts（官方源码，resolve 方法节选，按 path 匹配分支）
function resolve(location, currentLocation) {
  if ('path' in location) {
    // 按路径字符串遍历排好序的 matchers 数组，找第一个能匹配上的
    for (const matcher of matchers) {
      if (matcher.re.test(location.path)) { // 👈 每个 matcher 内部把 path 编译成了一个正则
        // 用正则捕获组解析出 params
        break
      }
    }
  }
  // ...按 name 查找的分支是 matcherMap.get(location.name)，O(1) 直接命中
}
```

`matcher.re` 是每条路由记录在 `createRouteRecordMatcher` 阶段就编译好的正则表达式（`/prescription/:id` 这种带参数的路径会被编译成类似 `/^\/prescription\/([^/]+)$/` 的正则），`resolve()` 按路径匹配时是**遍历这个排好序的数组，逐个用正则测试，第一个命中的即为匹配结果**——这也是为什么插入排序时要把"更具体的路径"排在前面：如果 `/prescription/:id` 排在了 `/prescription/detail` 前面，访问 `/prescription/detail` 会被 `:id` 参数路由抢先匹配，`detail` 被错误地当成了 `id` 参数值。

---

## 🧩 四、生产级最佳实践

### 动态路由参数变化组件不重渲染：`watch` 或 `onBeforeRouteUpdate`

「二、原理」第 4 小节讲过，`/prescription/1` 跳到 `/prescription/2` 走的是 `updatingRecords`——组件实例被复用，不会重新 `setup()`，所以 `route.params.id` 变化不会自动触发任何数据重新加载,必须显式监听：

```vue
<script setup>
import { useRoute, onBeforeRouteUpdate } from 'vue-router'
import { ref, watch } from 'vue'

const route = useRoute()
const prescription = ref(null)

async function loadPrescription(id: string) {
  prescription.value = await fetchPrescription(id)
}

// 方式一：watch route.params，适合逻辑简单、只关心某个字段变化
watch(() => route.params.id, (id) => loadPrescription(id as string), { immediate: true })

// 方式二：onBeforeRouteUpdate，适合需要在导航确认前介入（比如未保存提示、异步校验）
onBeforeRouteUpdate(async (to) => {
  await loadPrescription(to.params.id as string)
})
</script>
```

两种方式的选择标准很明确：只是"参数变了要重新拉数据"，用 `watch` 足够；需要在导航**确认前**做拦截或异步校验（比如"当前处方还有未保存的修改，确认要切换到别的处方吗"），必须用 `onBeforeRouteUpdate`，因为它是导航守卫链路的一环，可以 `return false` 阻止导航，`watch` 做不到这一点。

### 权限路由动态注册：登录后按角色 `addRoute` + 重新匹配当前地址

医疗场景下医生、护士、管理员能看到的路由完全不同，路由表不应该在应用启动时就写死全部路由再靠 `meta.roles` 做二次校验（那样未授权的路由也会被打进主 bundle），更干净的做法是登录后动态注册：

```typescript
// router/permission.ts
import { router } from './index'

const roleRouteMap = {
  doctor: () => import('./modules/doctor-routes'),
  nurse: () => import('./modules/nurse-routes'),
  admin: () => import('./modules/admin-routes'),
}

export async function setupPermissionRoutes(role: 'doctor' | 'nurse' | 'admin') {
  const { default: routes } = await roleRouteMap[role]()
  routes.forEach(route => router.addRoute(route))
  // 「二、原理」第 5 小节讲过：addRoute 不会自动刷新当前页面，必须手动重新匹配
  await router.replace(router.currentRoute.value.fullPath)
}
```

```typescript
// main.ts：登录成功后调用
await login(credentials)
await setupPermissionRoutes(currentUser.role)
```

配合全局前置守卫做兜底校验（防止用户直接改地址栏访问未授权路由）：

```typescript
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})
```

### 路由懒加载 + Vite 的 chunk 命名策略：按业务模块划分

「二、原理」第 6 小节讲过 Vite 默认按文件路径自动生成 chunk 名——业务量大了之后，默认命名容易出现几十个零散的小 chunk，按业务模块手动归并能显著减少 HTTP 请求数：

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/views/prescription/')) return 'prescription' // 处方模块归并成一个 chunk
          if (id.includes('/views/pharmacy/')) return 'pharmacy'         // 药房模块归并成一个 chunk
          if (id.includes('node_modules')) return 'vendor'
        }
      }
    }
  }
})
```

这样处方模块下即便拆了 10 个路由级懒加载组件，打包后依然是一个 `prescription-xxxx.js`，减少小文件请求带来的连接开销，同时保留"按需加载"的核心收益——用户没进过处方模块，这个 chunk 完全不会被请求。

### 路由元信息 `meta` 的 TypeScript 类型扩展

`meta` 默认类型是 `Record<string, unknown>`，直接用会丢失类型提示，需要通过模块增强扩展 `RouteMeta` 接口：

```typescript
// types/router.d.ts
import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    roles?: Array<'doctor' | 'nurse' | 'admin'>
    title?: string
  }
}
```

```typescript
// 之后写路由配置和读取 meta 都有完整类型提示，roles 拼错会直接报类型错误
{
  path: '/admin/audit-log',
  component: () => import('@/views/admin/AuditLog.vue'),
  meta: { requiresAuth: true, roles: ['admin'], title: '审计日志' }
}
```

### 路由过渡动画：`<Transition>` + `name` 动态绑定实现前进/后退方向动画

```vue
<script setup>
import { RouterView, useRouter } from 'vue-router'
import { ref } from 'vue'

const transitionName = ref('slide-forward')
const router = useRouter()

router.beforeEach((to, from) => {
  // depth 是自定义 meta 字段，按路由层级判断前进还是后退（也可以用浏览器前进后退事件的 delta 判断）
  transitionName.value = (to.meta.depth ?? 0) >= (from.meta.depth ?? 0)
    ? 'slide-forward'
    : 'slide-back'
})
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition :name="transitionName">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>
```

```css
.slide-forward-enter-active, .slide-forward-leave-active,
.slide-back-enter-active, .slide-back-leave-active {
  transition: transform 0.3s ease;
}
.slide-forward-enter-from { transform: translateX(100%); }
.slide-forward-leave-to { transform: translateX(-100%); }
.slide-back-enter-from { transform: translateX(-100%); }
.slide-back-leave-to { transform: translateX(100%); }
```

`<RouterView>` 的默认插槽把 `Component`（已经是 `h(ViewComponent, ...)` 生成的 vnode，对应「三、源码解析」第 3 小节看到的渲染函数）暴露出来，外面套一层 `<Transition>` 就能拿到组件切换的进入/离开时机，`beforeEach` 守卫里根据前后两个路由的层级关系动态切换 `transitionName`，实现"前进滑入、后退滑出"的方向感动画。

---

## 🧩 五、手写实现（可独立跑通）

笔记里这部分只搭了脚手架（`pnpm init`、Monorepo 配置、打包脚本），核心源码是 `index.ts` 里一行 `console.log('vue-router')` 的占位——没有实际实现。这一节从零手写一份可独立跑通的极简 Vue Router（`createRouter` + `matcher` + `history` + `RouterView` + `useRouter`/`useRoute` + 导航守卫队列，~200 行），医疗场景演示多角色权限路由 + 动态 `addRoute`。脚手架搭建步骤沿用笔记原有的 Monorepo 结构。

### 安装 pnpm 与项目初始化

```shell
npm install pnpm -g
mkdir g-vue-router && cd g-vue-router
pnpm init
```

```json
{
  "private": true,
  "type": "module",
  "version": "1.0.0",
  "description": "vue-router 源码手写实现",
  "scripts": {},
  "license": "ISC",
  "packageManager": "pnpm@10.13.1"
}
```

### TypeScript 配置

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
    "lib": ["ESNext", "DOM"],
    "baseUrl": ".",
    "paths": {
      "g-vue-router": ["packages/vue-router/src"]
    }
  }
}
```

### 搭建 Monorepo 环境

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'

linkWorkspacePackages: true
shamefullyHoist: false
```

```shell
mkdir -p packages/vue-router/src
```

`packages/vue-router/package.json`：

```json
{
  "name": "g-vue-router",
  "version": "1.0.0",
  "module": "dist/g-vue-router.esm.js",
  "unpkg": "dist/g-vue-router.global.js",
  "buildOptions": {
    "name": "GVueRouter",
    "formats": ["esm-bundler", "esm-browser", "esm", "global", "cjs"]
  },
  "scripts": {},
  "keywords": ["vue-next", "vue", "vue3", "vue-router"],
  "author": "Robin",
  "license": "ISC",
  "packageManager": "pnpm@10.13.1"
}
```

### 打包脚本

安装依赖：

```shell
pnpm add esbuild http-server minimist typescript -w -D
pnpm add vue -S
```

打包脚本 `scripts/dev.js` 与笔记原有实现一致（基于 esbuild 监听构建各子包），配置指令：

```json
{
  "scripts": {
    "dev": "node scripts/dev.js"
  }
}
```

### 目录结构

```shell
.
├── examples
│   └── index.html
├── packages
│   └── vue-router
│       ├── dist
│       ├── package.json
│       └── src
│           ├── history.ts          # history 模式实现（html5 / hash / memory）
│           ├── matcher.ts          # 路由匹配器：编译正则 + 排序插入 + resolve
│           ├── injectionSymbols.ts # provide/inject 用的 Symbol 常量
│           ├── useApi.ts           # useRouter / useRoute
│           ├── navigationGuards.ts # 导航守卫队列：runGuardQueue / guardToPromiseFn
│           ├── RouterView.ts       # RouterView 组件
│           ├── router.ts           # createRouter 主体
│           └── index.ts            # 统一导出
├── scripts
│   └── dev.js
├── pnpm-workspace.yaml
└── tsconfig.json
```

### `history.ts`：三种路由模式的最小实现

只保留驱动导航所必需的部分——监听 `popstate`、维护当前 location、提供 `push`/`replace`/`go`：

```typescript
// packages/vue-router/src/history.ts
export interface RouterHistory {
  readonly base: string
  location: string
  push(to: string): void
  replace(to: string): void
  go(delta: number): void
  listen(callback: (to: string, from: string) => void): () => void
}

// History 模式：基于 pushState/replaceState + popstate，需要服务端配合 fallback
export function createWebHistory(base = ''): RouterHistory {
  const listeners: Array<(to: string, from: string) => void> = []
  let currentLocation = getCurrentPath()

  function getCurrentPath() {
    return window.location.pathname + window.location.search
  }

  window.addEventListener('popstate', () => {
    const from = currentLocation
    currentLocation = getCurrentPath()
    listeners.forEach(listener => listener(currentLocation, from))
  })

  return {
    base,
    get location() {
      return currentLocation
    },
    push(to: string) {
      currentLocation = to
      window.history.pushState(null, '', base + to)
      // 👈 pushState 不会触发 popstate，手动广播一次，模拟"导航发生"
      listeners.forEach(listener => listener(to, currentLocation))
    },
    replace(to: string) {
      currentLocation = to
      window.history.replaceState(null, '', base + to)
      listeners.forEach(listener => listener(to, currentLocation))
    },
    go(delta: number) {
      window.history.go(delta) // 触发浏览器前进后退 -> popstate -> 上面的监听器
    },
    listen(callback) {
      listeners.push(callback)
      return () => {
        const i = listeners.indexOf(callback)
        if (i > -1) listeners.splice(i, 1)
      }
    }
  }
}

// Hash 模式：官方源码统一走 popstate（见「二、原理」第 1 小节），这里直接复用 History 模式
export function createWebHashHistory(base = ''): RouterHistory {
  if (!location.hash) location.hash = '#/'
  return createWebHistory(base + '#')
}

// Memory 模式：不接触真实 window.history，适合 SSR / 单测环境
export function createMemoryHistory(): RouterHistory {
  const listeners: Array<(to: string, from: string) => void> = []
  let currentLocation = '/'
  return {
    base: '',
    get location() {
      return currentLocation
    },
    push(to: string) {
      const from = currentLocation
      currentLocation = to
      listeners.forEach(listener => listener(to, from))
    },
    replace(to: string) {
      const from = currentLocation
      currentLocation = to
      listeners.forEach(listener => listener(to, from))
    },
    go() {
      /* 内存模式不维护真实历史栈，省略前进后退 */
    },
    listen(callback) {
      listeners.push(callback)
      return () => {
        const i = listeners.indexOf(callback)
        if (i > -1) listeners.splice(i, 1)
      }
    }
  }
}
```

### `matcher.ts`：路径编译成正则 + 排序插入 + resolve

对应「二、原理」第 5 小节和「三、源码解析」第 5 小节讲过的机制——路径编译正则、按"具体程度"排序插入、path 匹配走遍历正则，name 匹配走 Map 直查：

```typescript
// packages/vue-router/src/matcher.ts
export interface RouteRecordRaw {
  path: string
  name?: string
  component?: any
  meta?: Record<string, unknown>
  beforeEnter?: (to: any, from: any) => any
}

export interface RouteRecordMatcher {
  record: RouteRecordRaw
  re: RegExp        // 路径编译出的正则，用于 path 匹配
  keys: string[]     // 动态参数名，如 ['id']
  score: number      // 匹配优先级分数，越具体分数越高
}

// 把 /prescription/:id 编译成正则 + 提取参数名 + 打分（静态段越多分数越高，动态段拉低分数）
function compilePath(path: string): { re: RegExp; keys: string[]; score: number } {
  const keys: string[] = []
  let score = 0
  const pattern = path
    .split('/')
    .filter(Boolean)
    .map(segment => {
      if (segment.startsWith(':')) {
        keys.push(segment.slice(1))
        score += 1 // 动态段分数低
        return '([^/]+)'
      }
      score += 10 // 静态段分数高，保证 /prescription/detail 排在 /prescription/:id 前面
      return segment
    })
    .join('/')
  return { re: new RegExp(`^/${pattern}$`), keys, score }
}

export function createRouteRecordMatcher(record: RouteRecordRaw): RouteRecordMatcher {
  const { re, keys, score } = compilePath(record.path)
  return { record, re, keys, score }
}

export function createRouterMatcher(routes: RouteRecordRaw[]) {
  const matchers: RouteRecordMatcher[] = []
  const matcherMap = new Map<string, RouteRecordMatcher>()

  // 二分查找插入位置：score 高的（更具体的路径）排在数组前面
  function findInsertionIndex(matcher: RouteRecordMatcher) {
    let lower = 0
    let upper = matchers.length
    while (lower !== upper) {
      const mid = (lower + upper) >> 1
      if (matchers[mid].score < matcher.score) upper = mid
      else lower = mid + 1
    }
    return lower
  }

  function addRoute(record: RouteRecordRaw) {
    const matcher = createRouteRecordMatcher(record)
    const index = findInsertionIndex(matcher)
    matchers.splice(index, 0, matcher)
    if (record.name) matcherMap.set(record.name, matcher)
    // 返回移除函数，对应官方 addRoute 的用法
    return () => removeRoute(record.name)
  }

  function removeRoute(name?: string) {
    if (!name) return
    const matcher = matcherMap.get(name)
    if (!matcher) return
    const index = matchers.indexOf(matcher)
    if (index > -1) matchers.splice(index, 1)
    matcherMap.delete(name)
  }

  function resolve(location: { path?: string; name?: string; params?: Record<string, string> }) {
    if (location.name) {
      const matcher = matcherMap.get(location.name)
      if (!matcher) throw new Error(`No match for name "${location.name}"`)
      const path = buildPath(matcher, location.params || {})
      return { path, matched: matcher.record, params: location.params || {} }
    }
    // 按 path 遍历排好序的数组，第一个正则命中的即为匹配结果
    for (const matcher of matchers) {
      const match = matcher.re.exec(location.path!)
      if (match) {
        const params: Record<string, string> = {}
        matcher.keys.forEach((key, i) => (params[key] = match[i + 1]))
        return { path: location.path!, matched: matcher.record, params }
      }
    }
    return { path: location.path!, matched: null, params: {} }
  }

  function buildPath(matcher: RouteRecordMatcher, params: Record<string, string>) {
    return matcher.record.path.replace(/:([^/]+)/g, (_, key) => params[key] ?? '')
  }

  return { addRoute, removeRoute, resolve, getRoutes: () => matchers }
}
```

### `injectionSymbols.ts`：`provide`/`inject` 用的 Symbol 常量

```typescript
// packages/vue-router/src/injectionSymbols.ts
export const routerKey = Symbol('router')            // useRouter() 用
export const routeLocationKey = Symbol('route location') // useRoute() 用
export const routerViewLocationKey = Symbol('router view location') // RouterView 内部用，拿原始 currentRoute
```

### `router.ts`：`createRouter` 主体

对应「二、原理」第 2、4、5 小节和「三、源码解析」第 2 小节——`shallowRef currentRoute` + 导航守卫串行队列 + `addRoute` 不自动刷新：

```typescript
// packages/vue-router/src/router.ts
import { shallowRef, shallowReactive, App } from 'vue'
import { createRouterMatcher, RouteRecordRaw } from './matcher'
import { RouterHistory } from './history'
import { routerKey, routeLocationKey, routerViewLocationKey } from './injectionSymbols'
import { RouterView } from './RouterView'

export interface RouterOptions {
  history: RouterHistory
  routes: RouteRecordRaw[]
}

export type NavigationGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
) => boolean | void | RouteLocationNormalized | Promise<boolean | void | RouteLocationNormalized>

export interface RouteLocationNormalized {
  path: string
  name?: string
  params: Record<string, string>
  matched: RouteRecordRaw | null
}

const START_LOCATION: RouteLocationNormalized = { path: '/', params: {}, matched: null }

export function createRouter(options: RouterOptions) {
  const matcher = createRouterMatcher(options.routes)
  const routerHistory = options.history

  const currentRoute = shallowRef<RouteLocationNormalized>(START_LOCATION)
  const beforeGuards: NavigationGuard[] = []
  const afterGuards: Array<(to: RouteLocationNormalized, from: RouteLocationNormalized) => void> = []

  function addRoute(record: RouteRecordRaw) {
    return matcher.addRoute(record)
    // 👈 对应「二、原理」第 5 小节：只改 matcher 内部数组，不触碰 currentRoute，当前页面不会自动刷新
  }

  function removeRoute(name: string) {
    matcher.removeRoute(name)
  }

  function resolve(path: string): RouteLocationNormalized {
    const resolved = matcher.resolve({ path })
    return { path: resolved.path, params: resolved.params, matched: resolved.matched, name: resolved.matched?.name }
  }

  // 串行执行守卫队列，对应「三、源码解析」第 4 小节 runGuardQueue 的核心逻辑
  function runGuardQueue(guards: NavigationGuard[], to: RouteLocationNormalized, from: RouteLocationNormalized) {
    return guards.reduce<Promise<any>>(
      (promise, guard) => promise.then(result => {
        if (result === false || (result && typeof result === 'object')) return result // 上一个守卫已经拒绝/重定向，短路
        return guard(to, from)
      }),
      Promise.resolve()
    )
  }

  async function navigate(to: RouteLocationNormalized, from: RouteLocationNormalized) {
    // 路由独享守卫（对应完整顺序里的 beforeEnter），先于全局 beforeEach 之外单独跑一次会更贴近真实场景，这里简化成和 beforeEach 同一批跑
    const guards = [...beforeGuards]
    if (to.matched?.beforeEnter) guards.push(to.matched.beforeEnter)
    const result = await runGuardQueue(guards, to, from)

    if (result === false) return false // 导航被阻止
    if (result && typeof result === 'object') {
      // 守卫返回了一个新地址，重定向
      return push(result.path)
    }
    return true
  }

  async function push(path: string) {
    const from = currentRoute.value
    const to = resolve(path)
    const ok = await navigate(to, from)
    if (ok === false) return
    currentRoute.value = to
    routerHistory.push(path)
    afterGuards.forEach(guard => guard(to, from)) // 对应完整顺序里的全局 afterEach
  }

  async function replace(path: string) {
    const from = currentRoute.value
    const to = resolve(path)
    const ok = await navigate(to, from)
    if (ok === false) return
    currentRoute.value = to
    routerHistory.replace(path)
    afterGuards.forEach(guard => guard(to, from))
  }

  const router = {
    currentRoute,
    addRoute,
    removeRoute,
    push,
    replace,
    beforeEach: (guard: NavigationGuard) => beforeGuards.push(guard),
    afterEach: (guard: (to: RouteLocationNormalized, from: RouteLocationNormalized) => void) => afterGuards.push(guard),

    install(app: App) {
      app.component('RouterView', RouterView)

      // 对应「三、源码解析」第 2 小节：逐字段转发到 currentRoute.value，实现 useRoute() 的响应式
      const reactiveRoute = {} as RouteLocationNormalized
      for (const key of ['path', 'name', 'params', 'matched'] as const) {
        Object.defineProperty(reactiveRoute, key, {
          get: () => currentRoute.value[key],
          enumerable: true
        })
      }

      app.provide(routerKey, router)
      app.provide(routeLocationKey, shallowReactive(reactiveRoute))
      app.provide(routerViewLocationKey, currentRoute)

      // 监听浏览器前进后退（popstate），驱动一次导航
      routerHistory.listen((to) => {
        const from = currentRoute.value
        const toLocation = resolve(to)
        navigate(toLocation, from).then(ok => {
          if (ok !== false) currentRoute.value = toLocation
        })
      })

      // 首次挂载：解析当前地址栏，触发第一次导航
      push(routerHistory.location)
    }
  }

  return router
}
```

### `useApi.ts`：`useRouter` / `useRoute`

对应「三、源码解析」第 1 小节，纯 `inject`，没有任何额外包装：

```typescript
// packages/vue-router/src/useApi.ts
import { inject } from 'vue'
import { routerKey, routeLocationKey } from './injectionSymbols'

export function useRouter() {
  return inject(routerKey)!
}

export function useRoute() {
  return inject(routeLocationKey)!
}
```

### `RouterView.ts`：`inject`/`provide` 深度计数器实现递归

对应「二、原理」第 3 小节——这份简化实现只支持单层路由（不做嵌套路由的 `matched` 数组遍历），核心逻辑保留"通过注入的路由信息动态渲染组件"：

```typescript
// packages/vue-router/src/RouterView.ts
import { defineComponent, h, inject } from 'vue'
import { routerViewLocationKey } from './injectionSymbols'

export const RouterView = defineComponent({
  name: 'RouterView',
  setup() {
    const currentRoute = inject(routerViewLocationKey)! // 拿到原始 shallowRef，对应官方源码同名注入键
    return () => {
      const route = currentRoute.value
      const component = route.matched?.component
      return component ? h(component, { params: route.params }) : null
    }
  }
})
```

真实的官方实现要支持嵌套路由（`<RouterView>` 套 `<RouterView>`），靠的是「二、原理」第 3 小节讲过的 `viewDepthKey` 计数器——这里为了控制手写实现的体量只做了单层，嵌套版本的完整实现思路可以直接参照「三、源码解析」第 3 小节的官方源码片段自行扩展。

### `navigationGuards.ts`：守卫返回值语义

这份简化实现里 `beforeEach` 的守卫直接支持 `return false`（阻止）/ `return 路由对象`（重定向）/ `return undefined`（放行）三种返回值语义，已经内嵌在上面 `router.ts` 的 `navigate` 函数里，不单独拆文件——医疗场景的权限守卫示例在下一节直接使用这套语义。

### `index.ts`：统一导出

```typescript
// packages/vue-router/src/index.ts
export { createRouter } from './router'
export { createWebHistory, createWebHashHistory, createMemoryHistory } from './history'
export { useRouter, useRoute } from './useApi'
export { RouterView } from './RouterView'
```

### 医疗场景演示：多角色权限路由 + 动态 `addRoute`

`examples/main.ts`——挂载应用，演示三类角色路由差异：

```typescript
// examples/main.ts
import { createApp, h, ref } from 'vue'
import { createRouter, createWebHistory, useRouter, useRoute } from 'g-vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: { render: () => h('p', '欢迎使用医疗 AI 助手') } },
    { path: '/login', name: 'login', component: { render: () => h('p', '登录页') } }
  ]
})

// 医生/护士/管理员各自的专属路由，登录后按角色动态注册
const roleRoutes = {
  doctor: { path: '/doctor/prescription', name: 'doctor-prescription', component: { render: () => h('p', '医生：开处方') } },
  nurse: { path: '/nurse/dispense', name: 'nurse-dispense', component: { render: () => h('p', '护士：发药') } },
  admin: { path: '/admin/audit-log', name: 'admin-audit-log', component: { render: () => h('p', '管理员：审计日志') } }
}

// 全局前置守卫：未授权访问受保护路由直接拒绝重定向到登录页
router.beforeEach((to) => {
  const currentUserRole = localStorage.getItem('role')
  if (to.path.startsWith('/doctor') && currentUserRole !== 'doctor') {
    return { path: '/login', params: {}, matched: null }
  }
})

const App = {
  setup() {
    const route = useRoute()
    const r = useRouter()

    async function loginAs(role: 'doctor' | 'nurse' | 'admin') {
      localStorage.setItem('role', role)
      r.addRoute(roleRoutes[role]) // 👈 只是插入了 matcher，此刻当前页面不会有任何变化
      // 「二、原理」第 5 小节讲过的关键一步：手动重新匹配当前地址，触发一次真实导航
      await r.replace(roleRoutes[role].path)
    }

    return { route, loginAs }
  },
  render() {
    return h('div', [
      h('button', { onClick: () => this.loginAs('doctor') }, '以医生身份登录'),
      h('button', { onClick: () => this.loginAs('nurse') }, '以护士身份登录'),
      h('p', `当前路径：${this.route.path}`),
    ])
  }
}

const app = createApp(App)
app.use(router)
app.mount('#app')
```

点击"以医生身份登录"按钮后的完整链路：`localStorage` 写入角色 → `addRoute` 把 `/doctor/prescription` 插入 matcher（此刻页面路径显示不变，验证了「二、原理」第 5 小节的结论）→ `router.replace('/doctor/prescription')` 触发真实导航 → `navigate()` 跑一遍 `beforeGuards`（此时 `currentUserRole` 已经是 `'doctor'`，全局守卫放行）→ `currentRoute.value` 更新 → 页面路径文本刷新。如果跳过 `replace` 这一步直接期待页面自动更新，会验证到"确实什么都不会发生"。

### 查看结果

```shell
pnpm dev      # 打包所有子包
pnpm create vite examples --template vue-ts  # 起一个测试页面挂载上面的 main.ts
```

打开测试页面，点击角色登录按钮，观察路径文本变化和浏览器地址栏同步更新——验证 `history.push`/`popstate` 链路，以及"不 `replace` 就不刷新"这条最容易被面试问到的坑。

---

## 六、手写实现源码 GitHub 地址

https://github.com/lotosv2010/g-vue-router

## 七、参考

- https://router.vuejs.org/
- https://jonny-wei.github.io/blog/vue/vue3/vue-router4.html
- https://github.com/wbccb/

---

## 💡 一张图总结（面试速记）

| 知识点 | 一句话解释 | 面试价值 |
| --- | --- | --- |
| `useRoute()` 响应式原理 | `shallowRef` 整体替换 + `Object.defineProperty` 逐字段转发 + `shallowReactive` 包装 | 高频，是理解一切后续机制的根基 |
| Hash 模式内部机制 | Vue Router 4 统一走 `pushState`/`popstate`，不再单独监听 `hashchange` | 中频，容易被"和 Vue 2 有什么区别"问到 |
| `<RouterView>` 递归渲染 | 不是函数递归，是 `provide(depth+1)`/`inject(depth)` 配合组件树嵌套结构形成的递归链 | 高频，考查对组合式依赖注入的理解深度 |
| 导航守卫完整顺序 | `extractChangingRecords` 拆分 leaving/updating/entering 三组记录，`runGuardQueue` 用 Promise reduce 串行执行 | 高频，八股文重灾区，重点是讲清楚"为什么是这个顺序" |
| `addRoute` 不自动刷新 | 只改 matcher 内部排序数组，`currentRoute` 是导航时刻的快照，需要手动 `router.replace` 重新匹配 | 高频，"为什么不生效"类问题的标准考法 |
| matcher 路由匹配机制 | 排序数组 + 二分插入按"路径具体程度"打分，不是 Trie 树；path 匹配靠遍历正则，name 匹配靠 Map 直查 | 中频，容易被"用了什么数据结构"问到，也是本文纠正笔记误区的点 |
| 路由懒加载函数包装 | 必须是 `() => import(...)`，包一层函数才能推迟 chunk 加载到真正需要渲染的那一刻 | 中频，实操中常被写成直接 `import(...)` 导致失去懒加载效果 |

---

## 📝 留个问题

> 💬 **面试追问**：如果一个全局 `beforeEach` 守卫里 `return` 了一个新的路由地址（重定向），而这个新地址本身又会被同一个 `beforeEach` 守卫拦截并再次重定向到另一个地址，会发生什么？

提示：回到「三、源码解析」第 4 小节讲过的 `guardToPromiseFn`——`isRouteLocation(valid)` 判断为真时会 `reject` 一个 `NAVIGATION_GUARD_REDIRECT` 类型的错误，这个错误在 `router.ts` 的 `pushWithRedirect` 里被捕获后重新触发一次 `push`。想清楚"重定向本质是抛错后再发起一次全新导航"这一点，再想这个链路有没有内置的循环检测机制，还是完全依赖开发者自己避免写出会无限重定向的守卫。

---

> 🔖 这是「Vue 3 全家桶深度拆解系列」第 9 篇。上一篇：《Pinia 原理与手写实现：Vuex 为什么退场，Pinia 才是 Vue 3 的正确答案（面试收藏级）》；下一篇预告：《Vue 3 性能优化全攻略：编译时优化 + 运行时优化的最优组合（面试收藏级）》
