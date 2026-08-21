# Vue 3 内置组件全解析：Teleport 传送门、KeepAlive LRU 缓存、Suspense 异步编排，实现原理逐个拆解（面试收藏级）

> 面试官微笑着抛来一串连环题：「`<Teleport>` 把内容渲染到 `body` 去了，组件的 `provide`/`inject` 还能用吗？」你答：「能，Teleport 只是改了 DOM 挂载位置。」面试官追问：「为什么？逻辑树和 DOM 树不是同一棵吗？」接着又问：「KeepAlive 的 `max` 超了，被淘汰的那个组件走的是什么生命周期？」「Suspense 是怎么知道哪些后代组件在异步加载的？」「KeepAlive 命中缓存的时候，和正常挂载相比到底跳过了哪些流程？」

> 这五个问题看似分散，其实都指向同一件事：**Vue 3 里的「内置组件」不是什么黑魔法，它们只是渲染器里被特殊处理的几类 VNode**。这篇文章是「Vue 3 全家桶深度拆解」系列第 6 篇，接着第 5 篇讲完的组件渲染链路，把 Teleport、Transition、TransitionGroup、KeepAlive、异步组件、Suspense 六个内置能力逐个拆开，讲清楚它们各自在渲染器的哪个环节「截胡」、为什么要这样设计、以及面试官最想听到的答案。

---

## 🎯 这篇文章解决什么问题

第 5 篇把 `setup()` 内部的 `emit`/`slots`/生命周期/`provide`/`inject` 拆了个底朝天，但留下的问题也很明显——这些能力都发生在**普通组件**身上。真实项目里还有一大批「不太一样的组件」：要渲染到 `body` 里的弹窗、要缓存状态的标签页、要等异步数据才显示的页面。它们不是普通组件，是渲染器在主流程里埋了特殊分支的内置组件。这篇文章要补上的，正是渲染器如何处理这六类特殊 VNode：每个内置组件在 `patch` 的哪个分支被拦截、拦截之后做了什么、和普通组件相比跳过了哪些流程。读完你会同时拿到两样东西：**懂原理**（内置组件 = 渲染器特判分支，不是魔法）和**会讲**（面试官从 Teleport 问到 Suspense，你能用同一套「渲染器视角」串起来回答）。

---

## 🧩 一、基本使用

先看五个内置组件在模板里长什么样。这一节只讲用法和表象，所有「为什么」留到「二、原理」逐个拆。

### Teleport：把内容传送到指定 DOM 节点

`<Teleport>` 的核心作用是**把模板中的一部分内容渲染到 DOM 树的其他位置，但组件的逻辑层级保持不变**。最常见的场景是模态框——父组件如果设了 `overflow: hidden` 或 `z-index`，弹窗很容易被裁掉或盖住，把弹窗传送到 `body` 下渲染就能绕开这些限制：

```vue
<template>
  <!-- 将内容传送到 body 标签下渲染 -->
  <Teleport to="body">
    <div class="modal" v-if="showModal">
      这是一个模态框！
    </div>
  </Teleport>
</template>

<script setup>
  import { ref } from 'vue';

  const showModal = ref(false);
</script>
```

`to` 属性指定目标容器，可以是 `body` 或任意选择器；目标容器必须**在 Teleport 渲染前已经存在**（通常是静态的 DOM 节点）。多个 `<Teleport>` 可以共享同一个目标容器，内容按声明顺序追加：

```vue
<Teleport to="#modals">
  <div>A</div>
</Teleport>
<Teleport to="#modals">
  <div>B</div>
</Teleport>
<!-- 渲染结果：<div id="modals"><div>A</div><div>B</div></div> -->
```

**`disabled` 属性可以动态开关传送**——传 `true` 时内容保留在原位置渲染，适合「移动端不弹、桌面端弹」这种响应式场景：

```vue
<Teleport to="body" :disabled="isMobile">
  <!-- 移动端不启用 Teleport，tooltip 留在原位置 -->
  <div class="tooltip">提示</div>
</Teleport>
```

如果弹窗需要动画，把 `<Transition>` 包在 `<Teleport>` **外面**，过渡依然生效：

```vue
<Transition name="fade">
  <Teleport to="body">
    <div v-if="show">内容</div>
  </Teleport>
</Transition>
```

> **SSR 场景注意**：服务端渲染时 `to` 目标容器（如 `body`）在服务端不存在，渲染会跳过 Teleport 内容。解决方案有两种：一是服务端渲染时设 `disabled: true`，客户端激活后再切换；二是用 `onMounted` 钩子延迟渲染 Teleport 内容，确保只在客户端生效。

### Transition：声明式的进入/离开过渡

`<Transition>` 用于为元素的进入（enter）和离开（leave）添加动画，核心价值是**自动管理类名的添加与移除时机**——开发者只写 CSS，框架负责在正确的时机把类名挂上去、摘下来：

```vue
<template>
  <button @click="show = !show">切换</button>
  <Transition>
    <div v-if="show" class="box">内容</div>
  </Transition>
</template>

<script setup>
  import { ref } from 'vue';

  const show = ref(true);
</script>

<style>
  /* 定义进入和离开的动画 */
  .v-enter-active,
  .v-leave-active {
    transition: opacity 0.5s ease;
  }

  .v-enter-from,
  .v-leave-to {
    opacity: 0;
  }
</style>
```

Vue 3 的类名体系是六件套，按 `name` 属性（默认为 `v-`）生成：

| 阶段 | 进入类名 | 离开类名 | 作用 |
| --- | --- | --- | --- |
| 起始状态 | `v-enter-from` | `v-leave-from` | 动画开始时的初始样式 |
| 激活状态 | `v-enter-active` | `v-leave-active` | 整个过渡期间生效的过渡属性 |
| 结束状态 | `v-enter-to` | `v-leave-to` | 动画结束时的最终样式 |

> **对比 Vue 2**：Vue 2 只有 `v-enter` / `v-leave-to` 两对半的命名（`v-enter` 既当起始态又当激活态用），经常出现「动画开始瞬间没有过渡」的坑。Vue 3 把命名升级成 `enter-from / enter-active / enter-to` 三段式，每个状态都有独立的类名，语义更清晰，也更容易和 CSS 框架的现成动画类对齐。

> 这是这一篇里第一个「**为什么这样设计**」：三段式命名让「起始样式」和「过渡属性」彻底解耦，CSS 动画时 `enter-from` 只负责初始值、`enter-active` 只负责 duration/easing，互不干扰。

**`appear` 属性控制首次渲染动画**：默认 `false`，元素初始挂载时不播放进入动画；设为 `true` 后，页面加载时元素就会执行一次进入过渡，类名是 `v-appear-from` / `v-appear-active` / `v-appear-to`（与 `enter` 类名平行的一套）：

```vue
<Transition appear>
  <div>页面加载时就播放进入动画</div>
</Transition>
```

JavaScript 钩子可以在动画的关键节点介入（比如接 GSAP 这类库）：

```vue
<Transition
  @before-enter="onBeforeEnter"
  @enter="onEnter"
  @after-enter="onAfterEnter"
>
  <div v-if="show">内容</div>
</Transition>
```

**`css: false` 跳过 CSS 检测**：当完全用 GSAP 等库接管动画时，设置 `css: false` 可以让 Vue 不去监听 `transitionend`/`animationend`，也不会自动添加/移除过渡类名，动画的起止完全由 JS 钩子的回调函数（`done()`）控制，省掉不必要的 DOM 样式探测开销：

```vue
<Transition
  :css="false"
  @enter="(el, done) => gsapEnter(el, done)"
  @leave="(el, done) => gsapLeave(el, done)"
>
  <div v-if="show">纯 JS 动画，不依赖 CSS 类名</div>
</Transition>
```

`mode` 属性控制进入/离开的先后：`in-out`（新元素先进入，旧元素再离开）和 `out-in`（旧元素先离开，新元素再进入，页面切换最常用，避免两个页面同时渲染）。列表的增删动画则交给 `<TransitionGroup>`——它本身不渲染任何标签，而是通过 `tag` 属性指定渲染成的包裹元素：

```vue
<TransitionGroup name="list" tag="ul">
  <li v-for="item in items" :key="item.id">
    {{ item.text }}
  </li>
</TransitionGroup>
```

`TransitionGroup` 相比 `Transition` 多出一个 `move` 过渡——列表项因为其他项被增删而「被迫挪位」时触发的位移动画，这一篇「二、原理」会专门讲它的 FLIP 实现。

> **注意**：`<Transition>` 只能包裹**单个根元素**或组件，多个元素需要包一层容器或改用 `<TransitionGroup>`：

 ```vue
 <!-- ❌ 错误：两个根元素，动画失效 -->
 <Transition>
   <div v-if="show">A</div>
   <div v-if="show">B</div>
 </Transition>

 <!-- ✅ 正确：包一层容器 -->
 <Transition>
   <div v-if="show">
     <div>A</div>
     <div>B</div>
   </div>
 </Transition>
 ```

### KeepAlive：缓存组件状态，避免重复渲染

`<KeepAlive>` 用于**缓存动态组件的状态**：组件被切换走时不销毁，而是把 DOM 和实例状态缓存起来，切换回来时直接从缓存恢复，跳过 `created`/`mounted` 等初始化流程：

```vue
<template>
  <button @click="toggleComponent">切换组件</button>
  <KeepAlive>
    <component :is="currentComponent" />
  </KeepAlive>
</template>

<script setup>
  import { ref } from 'vue';
  import ComponentA from './ComponentA.vue';
  import ComponentB from './ComponentB.vue';

  const currentComponent = ref('ComponentA');

  function toggleComponent() {
    currentComponent.value = currentComponent.value === 'ComponentA' ? 'ComponentB' : 'ComponentA';
  }
</script>
```

配合路由使用时，经典的写法是结合 `<component :is>` 动态组件：

```vue
<router-view v-slot="{ Component }">
  <KeepAlive>
    <component :is="Component" />
  </KeepAlive>
</router-view>
```

缓存控制有三个属性：

- `include`：指定需要缓存的组件名（字符串用逗号分隔，或正则，或数组）
- `exclude`：指定不需要缓存的组件名
- `max`：限制最大缓存数量，超出时淘汰**最久未使用**的那个

```vue
<KeepAlive include="ComponentA,ComponentB" max="5">
  <component :is="currentComponent" />
</KeepAlive>
```

被缓存的组件不再重复触发 `mounted`/`unmounted`，取而代之的是两个专属钩子：**`activated`（从缓存恢复时触发）** 和 **`deactivated`（进入缓存时触发）**，组合式写法直接 `import`：

```vue
<script setup>
  import { onActivated, onDeactivated } from 'vue';

  onActivated(() => {
    console.log('组件被激活');
  });

  onDeactivated(() => {
    console.log('组件被停用');
  });
</script>
```

注意 `activated`/`deactivated` 是普通生命周期之外的一套独立钩子——「二、原理」会讲它们为什么不能直接用 `mounted`/`unmounted` 替代。

### 异步组件：`defineAsyncComponent` 延迟加载

异步组件把组件的加载逻辑延迟到实际需要时才执行，配合打包工具的代码分割（Vite 的 `import()` 天然分 chunk），能显著减小首屏包体积：

```javascript
import { defineAsyncComponent } from 'vue';

const AsyncComponent = defineAsyncComponent(() =>
  import('./components/MyComponent.vue')
);
```

高级配置可以指定加载中占位、失败兜底、延迟显示 loading 的时间（避免一闪而过的 loading 闪烁）和超时时间：

```javascript
const AsyncComponent = defineAsyncComponent({
  loader: () => import('./components/MyComponent.vue'),
  loadingComponent: LoadingSpinner, // 加载中的占位组件
  errorComponent: ErrorDisplay,     // 加载失败的兜底组件
  delay: 200,                       // 延迟显示加载状态（毫秒），快速加载完就不闪 loading
  timeout: 3000                     // 超时时间
});
```

路由懒加载是它最典型的生产场景——`component: () => import('./views/Profile.vue')` 本质上就是 `defineAsyncComponent` 的语法糖：

```javascript
const router = createRouter({
  routes: [
    {
      path: '/profile',
      component: () => import('./views/Profile.vue')
    }
  ]
});
```

### Suspense：统一编排多个异步依赖

> ⚠️ **实验性 API**：Suspense 在 Vue 3.x 仍是实验性功能，API 可能在未来版本变更。生产使用需评估稳定性，建议配合 `onErrorCaptured` 做好兜底。

`<Suspense>` 用于**统一处理子树中的所有异步依赖**：被它包裹的组件里，只要有任何后代组件在异步加载（异步组件的 `loader()`，或 `<script setup>` 里的顶层 `await`），`Suspense` 就会先渲染 `#fallback` 插槽；等所有异步依赖全部 resolve 后，一次性切换到 `#default` 插槽内容：

```vue
<script setup>
// 含顶层 await 的组件：setup 阶段就返回一个 Promise
const { data } = await fetchPatientDetail(patientId)
</script>

<template>
  <Suspense
    @pending="onPending"
    @resolve="onResolve"
    @fallback="onFallback"
  >
    <template #default>
      <PatientDetail />   <!-- 内部有顶层 await 或异步组件 -->
    </template>
    <template #fallback>
      <div>页面加载中...</div>
    </template>
  </Suspense>
</template>

<script setup>
// Suspense 的三个事件钩子可监听状态切换，用于埋点或全局 loading
const onPending = () => console.log('deps > 0，开始等待')
const onResolve = () => console.log('deps 归零，切换到 default')
const onFallback = () => console.log('显示 fallback')
</script>
```

它解决的核心痛点是：**多个异步组件各自写 loading，会逐个闪烁、布局抖动**。用 `Suspense` 包裹后，所有异步依赖共享同一个 loading 状态，全部就绪才一次性渲染——这就是「异步编排」。

---

## 🧩 二、原理

进入正题。第 4 篇讲过 `patch` 函数的主流程：根据 VNode 的 `type` 和 `shapeFlag` 分流到 `processText` / `processCommentNode` / `processFragment` / `processElement` / `processComponent`。**内置组件的秘密就在这个 switch 里**——Teleport 走的是 `shapeFlag & ShapeFlags.TELEPORT` 分支，直接调用 `type.process(...)`；KeepAlive 走的是 `processComponent` 分支，但挂了两个特殊 shapeFlag 标记；Suspense 也挂了专属 shapeFlag。也就是说，**内置组件不是「组件」，是渲染器里的特殊节点类型**，只是长得像组件。

> 💬 **面试官**：Vue 3 的内置组件和普通组件在渲染层面有什么区别？

> ✅ 标准答案：内置组件不是普通组件。普通组件走 `mountComponent` → 创建实例 → `setup` → `setupRenderEffect` 全流程；Teleport 在 `patch` 的 switch 里被 `ShapeFlags.TELEPORT` 拦截，直接调用 `Teleport.process()` 特判处理；KeepAlive 和 Suspense 有自己的 shapeFlag，渲染器在 `processComponent` 和 `unmount` 里为它们埋了特殊分支。

> 🎁 加分答案：这正是「渲染器可扩展」的体现——`patch` 的 switch 就是一张扩展点清单，第 5 篇的 Fragment 也是同一套机制。面试时能说出「Teleport 的 `process` 是挂在 VNode 的 `type` 上的」就说明真读过源码。

### 1. Teleport 原理：DOM 与逻辑树解耦

Teleport 最反直觉的一点是：**内容明明渲染到了 `body` 下，组件的 `provide`/`inject`、事件、状态却还和原来的父组件连着**。为什么？

因为 Vue 的组件树（逻辑树）和真实 DOM 树从来就不是一回事。**逻辑树由 VNode 的父子引用（`parent` 指针）决定，DOM 树由渲染器的 `insert` 操作决定**。Teleport 干的事情是：VNode 结构照旧挂在原父组件下（`parent` 关系、`provides` 原型链、`emit` 的 props 查找全部不变），但渲染器在真正 `insert` 的时候，把 `container` 换成了 `to` 指定的目标节点：

```typescript
// 核心：挂载时 container 不是原父级，而是 querySelector 出来的目标节点
const target = (n2.target = querySelector(n2.props.to as string))
if (target) {
  mountChildren(n2.children as any, target, null, parentComponent, parentSuspense, namespace)
}
```

这行代码是全部答案的浓缩：`mountChildren` 的第二个参数（container）从「Teleport 在组件树里的父容器」换成了目标节点，但第三个参数 `parentComponent` 依然是原来的父组件——**DOM 去了新家，组件实例的「户口」没动**。provide/inject 依赖的是实例链（第 5 篇讲过 `Object.create(parentProvides)` 原型链），`emit` 依赖的是 `instance.vnode.props`，这些都不经过 DOM，所以全部照常工作。

`disabled` 的实现同样简单——disabled 时 target 取原 container 即可。动态切换 `to` 时，Teleport 会把现有子节点 `move` 到新目标，**只移动 DOM，不重新创建组件实例**：

```typescript
if (n2.props.to !== n1.props.to) {
  const nextTarget: any = querySelector(n2.props.to as string)
  if (nextTarget) {
    n2.target = nextTarget;
    (n2.children as VNode[]).forEach(c => {
      move(c, nextTarget, anchor, MoveType.LEAVE)
    });
  }
}
```

> **对比 Vue 2**：Vue 2 没有内置 Teleport，类似能力要靠 `portal-vue` 这类第三方库，而库的实现绕不开「手动把子 VNode 的 `parent` 指针改掉」或「用 `$refs` + `appendChild` 搬运 DOM」，要么破坏逻辑树、要么性能和边界情况一堆。
>
> Vue 3 把它做成渲染器内置的节点类型，`process` 函数里挂载、更新、卸载三个时机都被特判覆盖，逻辑树完全不动——「为什么这样设计」的答案就是：**把 DOM 移动从业务层下沉到渲染层，逻辑树和 DOM 树的解耦才真正成立**。

> 💬 **面试官**：Teleport 渲染到 body 后，组件的 provide/inject 还能用吗？为什么？

> ✅ 标准答案：能。Teleport 只改变了子节点的 DOM 挂载位置，没有改变 VNode 在组件树中的位置——子组件实例的 `parent` 指针还是原来的父组件，`provides` 原型链、`emit` 的 props 查找全部走实例链，与 DOM 无关。渲染器的 `mountChildren(children, target, parentComponent, ...)` 同时传了「新容器」和「原父组件」，正是「DOM 搬走、逻辑留下」的实现证据。

> 🎁 加分答案：扩展到「逻辑树 vs DOM 树」的全局视角——Vue 里组件通信（props/emit/provide/inject/slot）全部建立在实例链上，DOM 只是渲染器的输出，所以任何「把 DOM 挪走」的能力（Teleport、KeepAlive 的缓存容器）都不会破坏通信。反过来也解释了为什么「父组件用 `@` 监听 Teleport 内子组件的事件」永远有效。

### 2. Transition 原理：钩子序列 + 双 rAF 判断动画结束

Transition 的本质是一个**状态机**：进入要走 `beforeEnter → enter → afterEnter` 三个钩子，离开要走 `beforeLeave → leave → afterLeave` 三个钩子。每个钩子内部做两件事——**挂类名 / 摘类名**，以及**判断动画什么时候结束**。

先看进入流程（`onEnter`）。它把类名操作拆成两段：先 `beforeEnter` 挂上 `enter-from` + `enter-active`（初始样式和过渡属性），然后等两帧（`nextFrame` 是双 `requestAnimationFrame`），再把 `enter-from` 摘掉、挂上 `enter-to`——这样浏览器才会从「初始值」过渡到「结束值」，否则两个类名在同一帧内挂上，样式直接落在终态，动画不会发生：

```typescript
onEnter(el, done) {
  const resolve = () => {
    removeTransitionClass(el, enterToClass)
    removeTransitionClass(el, enterActiveClass)
    done?.()
  }
  callHook(onEnter, [el, resolve])
  nextFrame(() => {
    removeTransitionClass(el, enterFromClass)
    addTransitionClass(el, enterToClass)

    if (!onEnter || onEnter.length <= 1) {
      el.addEventListener('transitionend', resolve)
    }
  })
}
```

**动画结束时机的判断**靠的是 `transitionend` 事件：没有用户自定义的 JS 钩子时，监听元素的 `transitionend`，事件触发说明 CSS 过渡跑完了，才调用 `resolve` 清掉激活类、继续 `afterEnter`。JS 钩子接管时（`onEnter.length > 1`，即声明了 `done` 参数），结束时机交给用户自己调 `done()`，正好对接 GSAP 这类库。

离开流程（`onLeave`）比进入多一步 **`forceReflow()` 强制重排**——先把元素留在 DOM 里挂上 `leave-from`，强制浏览器计算一次布局（读 `document.body.offsetHeight`），再挂 `leave-active`，这样才能保证「从当前样式」开始过渡而不是直接跳到终态：

```typescript
onLeave(el, done) {
  const resolve = () => {
    removeTransitionClass(el, leaveFromClass)
    removeTransitionClass(el, leaveToClass)
    removeTransitionClass(el, leaveActiveClass)
    done?.()
  }
  addTransitionClass(el, leaveFromClass)
  forceReflow() // 强制重排，确保动画开始
  addTransitionClass(el, leaveActiveClass)
  callHook(onLeave, [el, resolve])
  nextFrame(() => {
    removeTransitionClass(el, leaveFromClass)
    addTransitionClass(el, leaveToClass)
    if (!onLeave || onLeave.length <= 1) {
      el.addEventListener('transitionend', resolve)
    }
  })
}
```

类名操作挂在元素的 `classList` 上（`addTransitionClass` / `removeTransitionClass` 会按空格拆分支持多个类名），而「什么时候调这些函数」由 `BaseTransition` 组件决定——它是个**无渲染的状态组件**：`setup` 里拿到插槽里的子 VNode，把整套钩子挂到 `child.transition` 字段上，然后原样返回。渲染器在 `mountElement`（插入前后）和 `remove`（移除前）里看到 `vnode.transition` 就调用对应的 `beforeEnter/enter` 和 `leave`：

```typescript
// mountElement 里，插入前后各调一次
if (transition) {
  transition.beforeEnter(el)
}
hostInsert(el, container as any, anchor as any)
if (transition) {
  transition.enter(el)
}

// remove 里，先播离开动画，播完才真正移除 DOM
if (transition) {
  transition.leave(el, performRemove)
} else {
  performRemove()
}
```

这个「钩子挂在 VNode 上、由渲染器在关键节点调用」的机制，是 Transition 与渲染器解耦的关键——动画逻辑不侵入渲染器主流程，只是几个「如果 VNode 带了 transition 就多调一步」。

**`transitionend` 判断有个天然缺陷**：如果 CSS 里嵌套了多层过渡属性、或者用了 `transition-delay`，浏览器会为每个过渡属性触发一次 `transitionend`，Vue 只监听第一次可能提前判断「结束」，导致动画被截断。`duration` 属性（单位毫秒）能绕开这个问题——显式告诉 Vue 进入/离开各需要多久，内部改用 `setTimeout` 定时器替代事件监听：

```vue
<Transition :duration="{ enter: 500, leave: 800 }">
  <div v-if="show">内容</div>
</Transition>
<!-- 简写形式：进入和离开时长相同 -->
<Transition :duration="600">...</Transition>
```

> **对比 Vue 2**：Vue 2 的过渡类名是 `v-enter`/`v-leave-to` 两件套（`v-enter` 同时承担「初始值」和「过渡属性」），且没有独立的 `Transition` 组件，是元素自带的 `transition` 行为（通过 `v-if`/`v-show` 自动触发）。

> Vue 3 把过渡抽成独立的 `<Transition>` 组件 + 六类名体系 + 显式钩子序列，`v-enter` 拆成 `v-enter-from` 和 `v-enter-active`——「为什么这样设计」：Vue 2 的 `v-enter` 被过渡属性污染，想用 `enter-from` 做初始值必须靠 hack；三段式让「初始值 / 过渡属性 / 终值」各自独立，这也是 TransitionGroup 能复用同一套钩子做 FLIP 的前提。

> 💬 **面试官**：Transition 是怎么判断动画结束的？为什么需要两帧？

> ✅ 标准答案：CSS 过渡靠监听 `transitionend` 事件判断结束；JS 钩子接管时（钩子声明了 `done` 参数）由用户调 `done()` 通知。`nextFrame` 是双 `requestAnimationFrame`——第一帧让浏览器应用起始类，第二帧再切换到结束类，保证浏览器把「起始态 → 结束态」识别成一次过渡；离开动画还多一步 `forceReflow()` 强制重排，确保从当前真实布局开始过渡。

> 🎁 加分答案：能指出「类名切换分两段」的本质是浏览器渲染机制——同一帧内修改的样式会合并为一次布局，只有跨帧修改才能形成动画帧序列。面试时主动说「`transitionend` 只对 CSS 过渡有效，`animationend` 负责 CSS 动画，所以 `type="animation"` 属性是让 Vue 优先监听 animation 事件」就是加分点。

### 3. TransitionGroup 原理：FLIP 动画

`TransitionGroup` 在 `Transition` 的进入/离开之外多了一个能力：**列表项因为其他项增删而「被迫移动」时的位移过渡**。这个「移动过渡」就是著名的 FLIP 动画。

FLIP 是 First、Last、Invert、Play 四个步骤的缩写：

1. **First**：记录元素移动前的当前位置（`getBoundingClientRect`）。
2. **Last**：等 DOM 重新布局后，记录元素移动后的新位置。
3. **Invert**：计算两个位置的差值，用 `transform: translate(dx, dy)` 把元素**反向位移回旧位置**——此时元素在视觉上还停在原地，但 DOM 里它已经在新位置了。
4. **Play**：把 `transform` 过渡回 `translate(0, 0)`，元素就从旧位置平滑「飞」到新位置。

Vue 3 的实现是给每个列表项挂一个 `move` 过渡钩子，在 `transitionend` 时清理 transform（加 `v-move` 类名，配合 `will-change: transform` 提升性能）：

```typescript
// TransitionGroup.ts 核心：对每个 vnode 执行 move 过渡
// 1. First：记录旧位置（在 DOM 更新前，从 vnode.transition 里读上次的 rect）
// 2. 更新后 Last：拿到新 rect
// 3. Invert：计算 dx/dy，设置 transform 反向位移
// 4. Play：下一帧把 transform 清掉，触发 transition 归位
```

关键点是**只使用 `transform`，不碰 `top/left`**——`transform` 只触发合成层，不触发 layout 重排，所以 FLIP 动画能保持 60fps。

> **对比 Vue 2**：Vue 2 的列表过渡只有进入/离开，没有内置的「位移过渡」——列表项被增删挤动时会瞬间跳位，想要平滑效果只能引入 Velocity.js 这类库手写 FLIP。

> Vue 3 把 FLIP 内建进 `TransitionGroup`，`move` 类名（默认 `v-move`）就是给「被动移动」的项用的。「为什么这样设计」：进入/离开动画解决「项本身的出现与消失」，move 动画解决「其余项的被动位移」，两者缺一，列表动画都会在增删瞬间出现「跳变」。

> 💬 **面试官**：TransitionGroup 的 FLIP 动画原理是什么？

> ✅ 标准答案：First-Last-Invert-Play。First 记录移动前位置，Last 记录 DOM 更新后的新位置，Invert 用 transform 反向位移到旧位置（视觉不动），Play 下一帧清掉 transform 让元素平滑归位。全程只用 transform，不触发重排。

> 🎁 加分答案：补充「为什么反向位移就能形成动画」——因为浏览器把 transform 变化当成一次合成动画，只要 Invert 和 Play 跨帧，元素就会从旧位置过渡到新位置。再补一句「配合 `will-change: transform` 提前告知浏览器」更显功底。

### 4. KeepAlive 原理：cache + keys 的 LRU 缓存

KeepAlive 是这一篇的**核心考点**，面试命中率最高。它的实现是三件套：

- **`cache: Map`**：缓存 key → 缓存的 VNode
- **`keys: Set`**：维护缓存 key 的「新鲜度顺序」
- **两个特殊 shapeFlag**：`COMPONENT_SHOULD_KEEP_ALIVE`（标记「这个组件卸载时别真卸载」）和 `COMPONENT_KEPT_ALIVE`（标记「这个组件是从缓存里激活的」）

渲染函数每次执行，拿到插槽里的子 VNode 后做三件事：

**第一步：`include`/`exclude` 过滤**——不匹配就直接放行，走普通组件流程：

```typescript
if (
  (include && (!name || !matches(include, name))) ||
  (exclude && name && matches(exclude, name))
) {
  current = vnode
  return vnode  // 不缓存，直接走普通挂载
}
```

**第二步：命中缓存就直接复用实例**——从 `cache` 里取出缓存的 VNode，把它的 `el`（真实 DOM）和 `component`（组件实例）直接赋给新 VNode，再打上 `COMPONENT_KEPT_ALIVE` 标记。渲染器在 `processComponent` 里看到这个标记，**不创建新实例、不执行 setup、不走 mounted**，直接调 `activate` 把缓存的 DOM 搬回来：

```typescript
const cachedVNode = cache.get(key) as VNode
pendingCacheKey = key
if (cachedVNode) {
  // 复用缓存组件，直接设置组件的 el 和 component 属性
  vnode.el = cachedVNode.el
  vnode.component = cachedVNode.component
  // 标识组件已经被缓存过了
  vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
  // 将 set 中已有的 key 移动到末尾（LRU 核心）
  keys.delete(key)
  keys.add(key)
}
```

**第三步：没命中就登记 + LRU 淘汰**——新 key 加入 `keys`，如果超过 `max`，删除 `keys` 里**最旧（首位）**的 key，并把对应缓存卸载：

```typescript
keys.add(key)
if (max && keys.size > parseInt(max as any, 10)) {
  // lru: least recently used 最近最少使用算法
  // 缓存中有多个元素时，淘汰最近最不常使用的元素
  pruneCacheEntry(keys.values().next().value)
}
```

**LRU 的精髓就在 `keys` 这个 Set 的用法上**：每次命中，先把 key 从 Set 里删除再重新加入——Set 的插入顺序是「最新访问的在末尾」，所以**首位的永远是最久没被访问的**，淘汰时直接取 `keys.values().next().value` 就是最该淘汰的那个。被淘汰的组件调用 `unmount`（内部先 `resetShapeFlag` 把 `COMPONENT_SHOULD_KEEP_ALIVE` 抹掉，再走正常卸载），所以**它触发的是 `beforeUnmount`/`unmounted` 生命周期，不是 `deactivated`**——这是面试最常挖的细节之一。

**卸载时为什么不会真销毁**：普通组件卸载走 `unmount`，但 KeepAlive 的子树 VNode 都被打上了 `COMPONENT_SHOULD_KEEP_ALIVE` 标记，渲染器的 `unmount` 看到这个标记就**不执行卸载逻辑，而是调用 `deactivate`**——把 DOM 挪进一个隐藏的 `storageContainer`（`createElement('div')` 创建的游离容器），实例和 DOM 都保留：

```typescript
// renderer.ts 的 unmount：优先拦截 KeepAlive 标记
if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
  const { deactivate } = parentComponent.ctx as KeepAliveContext
  deactivate(vnode)
  return  // 不执行真正的卸载
}
```

`deactivate` 里做的两件事：把 DOM `move` 进缓存容器 + 触发 `deactivated` 钩子（`instance.da`）。反之 `activate` 把 DOM `move` 回真实容器 + 触发 `activated` 钩子（`instance.a`）。**这就是 `activated`/`deactivated` 替代 `mounted`/`unmounted` 的原因**——被缓存的组件根本没有经历挂载和卸载，只有「进缓存」和「出缓存」两个动作。

> **陷阱**：如果 `v-if` 直接加在 KeepAlive 的子组件上（而不是外层控制 KeepAlive 本身的显示），组件销毁时会触发 `beforeUnmount`/`unmounted`，不是 `deactivated`——因为 `v-if="false"` 让组件根本没进 KeepAlive 的渲染函数，KeepAlive 无法拦截：

 ```vue
 <!-- ❌ 错误：v-if 在子组件上，KeepAlive 失效 -->
 <KeepAlive>
   <ComponentA v-if="show" />
 </KeepAlive>

 <!-- ✅ 正确：v-if 控制整个 KeepAlive，或用 component :is -->
 <KeepAlive v-if="show">
   <ComponentA />
 </KeepAlive>
 ```

> **对比 Vue 2**：Vue 2 从 2.1 起有内置 `<keep-alive>`，核心机制和 Vue 3 类似（`cache` + `keys` 的 LRU），但实现细节藏在组件内部，配合动态组件 `component :is` 使用，且只有 `include`/`exclude`/`max` 三属性、钩子叫 `activated`/`deactivated`。

> Vue 3 的演进不是发明了 KeepAlive，而是**把它和渲染器的协作机制显式化**：`COMPONENT_SHOULD_KEEP_ALIVE`/`COMPONENT_KEPT_ALIVE` 两个 shapeFlag 让「缓存」这件事从组件内部逻辑变成了渲染器的通用能力——路由缓存（`<router-view>` 里包 KeepAlive）能无缝工作，正是因为渲染器认识这两个标记，而不需要路由库去 hack。「为什么这样设计」：**把「缓存」下沉到渲染器，任何基于组件的切换（路由、动态组件、v-if）都能免费获得缓存能力**。

> 💬 **面试官**：KeepAlive 的 LRU 缓存具体是怎么实现的？`max` 触发时调用哪个生命周期？

> ✅ 标准答案：内部维护 `cache`（Map，存缓存 VNode）和 `keys`（Set，存访问顺序）。命中缓存时把 key 从 Set 删除再重新加入（移到末尾），所以 Set 首位永远是最久未访问的；超过 `max` 时删除首位 key 对应的缓存并 `unmount` 它——被淘汰的组件走 `beforeUnmount`/`unmounted`，不是 `deactivated`。

> 🎁 加分答案：补全「命中缓存跳过了什么」——不创建新实例、不执行 setup、不走 `beforeMount`/`mounted`，而是直接复用 `cache` 里的 `vnode.component` 和 `vnode.el`，打上 `COMPONENT_KEPT_ALIVE` 标记，渲染器走 `activate`（move DOM 回来 + 触发 `activated`）；卸载时同理，`COMPONENT_SHOULD_KEEP_ALIVE` 让 `unmount` 改走 `deactivate`（DOM 进隐藏容器 + 触发 `deactivated`）。能说出这两个 shapeFlag 名字，面试官基本就确认你读过源码了。

### 5. 异步组件原理：Promise 状态驱动的三态渲染

`defineAsyncComponent` 返回一个包装组件，内部逻辑一句话：**用一个 Promise（`loader()` 的返回值）驱动三个状态——loading / error / 成功，渲染函数按状态返回不同的组件**：

```typescript
return () => {
  if (loaded.value && resolvedComp) {
    return createInnerComp(resolvedComp, instance)  // 成功：渲染真实组件
  } else if (error.value && errorComponent) {
    return createVNode(errorComponent, { error: error.value })  // 失败：渲染错误组件
  } else if (loadingComponent && !delayed.value) {
    return createVNode(loadingComponent)  // 加载中：渲染占位组件
  }
}
```

三个细节值得注意：

**`delay` 的实现**：`delayed` 是一个 ref，`setup` 时先置 `true`，`delay` 毫秒后置 `false`。所以「快速加载完」的场景下，loading 组件还没来得及显示，成功态就替换了它——**避免一闪而过的 loading 闪烁**：

```typescript
const delayed = ref(!!delay)
if (delay) {
  setTimeout(() => {
    delayed.value = false
  }, delay);
}
```

**`timeout` 的实现**：计时器到了且还没加载完成，就把 `error` 置成超时错误：

```typescript
if (!isNil(timeout)) {
  timer = setTimeout(() => {
    if (!loaded.value && !error.value) {
      const err = new Error(`Async component timed out after ${timeout}ms.`)
      error.value = err
    }
  }, timeout)
}
```

**已加载组件的缓存**：`resolvedComp` 存成功后直接复用，`__asyncLoader` 暴露给外部（Suspense 就是靠这个属性拿到加载 Promise 的）。`createInnerComp` 把父组件 VNode 的 `props`/`children`/`ref` 原样转交给真实组件，保证使用异步组件和普通组件在调用方的写法完全一致。

> **对比 Vue 2**：Vue 2 没有内置异步组件工厂函数，写法是 `Vue.component('async-example', () => import('./comp'))`——直接传一个返回 Promise 的工厂函数，框架内部只有极简的「resolve 后替换」逻辑，没有 loading/error/delay/timeout 任何状态管理，加载失败也没有兜底。

> Vue 3 的 `defineAsyncComponent` 把这些全部显式化：loading/error 占位、delay 防闪烁、timeout 超时、`onError` 重试，「为什么这样设计」——异步组件的状态机（loading/error/success）是每个大型应用都需要的通用能力，与其让每个项目各自实现，不如内建成一个配置化工厂。

> 💬 **面试官**：`defineAsyncComponent` 是怎么实现 loading/error/成功三态切换的？

> ✅ 标准答案：返回一个包装组件，setup 里调用 `loader()` 拿 Promise，用 `loaded`/`error` 两个 ref 记录状态；渲染函数按「loaded 且有组件 → 渲染真实组件；error 且有 errorComponent → 渲染错误组件；loadingComponent 且过了 delay → 渲染占位组件」依次判断。

> 🎁 加分答案：补 `delay` 防闪烁的原理（delayed ref 先 true 后 false）、`timeout` 的计时器实现、以及 `__asyncLoader` 是给 Suspense 预留的协作接口——异步组件能被 Suspense 调度，靠的就是这个暴露出来的 loader。

### 6. Suspense 原理：deps 计数器统一调度异步依赖

Suspense 是这一篇的压轴，也是面试官判断「你是背了八股还是真懂」的分水岭。它的核心问题：**Suspense 怎么知道哪些后代组件在异步加载？**

答案是一个**由内而外的信号传播机制**。Vue 3.4 的源码里，每个组件实例都带一个 `deps` 字段。当组件在异步等待时（异步组件的 `loader()` 还没 resolve，或 `<script setup>` 顶层 `await` 还没完成），这个组件会：

1. **把自己的 `deps` 加 1**，并通过实例链向上通知最近的 Suspense 组件；
2. Suspense 内部维护一个 **`deps` 计数器**，收到通知就加 1；
3. 该组件 resolve 后，`deps` 减 1；
4. Suspense 每次 `deps` 归零时，把所有异步依赖一次性「提交」——从 `#fallback` 切换到 `#default`。

也就是说，**Suspense 不是去「扫描」子树里有没有异步组件，而是异步组件主动「上报」自己的等待状态**。这个设计避免了在渲染时递归检查整棵子树的成本，也让「任意深度的后代」都能被捕获——只要它沿着实例链向上找到最近的 Suspense。

用简化代码示意这套计数逻辑（真实源码在 `Suspense.ts` 的 `setIsPending`/`deps` 处理里）：

```typescript
// 简化示意：异步组件如何把自己「挂」到 Suspense 上
function registerAsyncDependency(instance, suspense) {
  // 1. 通知 Suspense 增加一个待处理依赖
  suspense.deps++
  // 2. 这个组件的异步 Promise resolve 后，通知 Suspense 减一
  promise.then(() => {
    suspense.deps--
    if (suspense.deps === 0) {
      // 3. 全部依赖就绪，一次性切换
      suspense.resolve()
    }
  })
}
```

**为什么这比「每个组件各自写 loading」更好**：多个异步组件各自渲染 loading 占位时，页面会经历「loading → 内容 → loading → 内容」的多次跳动，布局反复抖动。Suspense 把所有异步依赖收集到一个计数器里，**全部 resolve 前只渲染一个 `#fallback`，全部 resolve 后一次性渲染整棵 `#default` 子树**——一次切换，没有中间态。

**嵌套 Suspense 的 `suspensible` 属性**：异步组件默认 `suspensible: true`，会沿着实例链向上找到**最近的** Suspense 并挂到它上面。如果这个最近的 Suspense 自己也是某个更大 Suspense 的依赖，它就能继续向上传播——形成「外层 Suspense 等内层 Suspense」的嵌套编排。把 `suspensible` 设为 `false`，这个异步组件就只对自己最近的那个 Suspense 负责，不再向上传递。

**异步依赖失败的兜底**：Suspense 切换后子组件再报错，靠第 5 篇讲过的 `onErrorCaptured` 捕获——`errorCaptured` 钩子能拦截子树抛出的错误，配合 Suspense 可以做到「异步加载失败显示全局错误页」。

> **对比 Vue 2**：Vue 2 完全没有 Suspense。异步组件的 loading 要自己包一层占位组件,多个异步组件页面要写多处 loading 逻辑，且没有「顶层 await」能力——Vue 2 的 `async created` 只能靠 `then` 回调，无法让渲染本身等待数据。

> 「为什么这样设计」：Vue 3 的异步组件和 `<script setup>` 顶层 `await` 让「组件的渲染结果依赖异步数据」成为一等公民，既然多个组件都可能异步，就需要一个「编排者」统一调度——Suspense 就是这个编排者，它把「异步」从每个组件的私有问题提升为子树级的公共问题。

> 💬 **面试官**：Suspense 是如何统一调度多个异步依赖的？`deps` 计数器的作用是什么？

> ✅ 标准答案：异步组件或含顶层 `await` 的组件在等待时，会沿实例链向最近的 Suspense 上报，Suspense 用 `deps` 计数器记录未完成的异步依赖数；`deps > 0` 时渲染 `#fallback`，每个依赖 resolve 后 `deps` 减一，归零时一次性渲染 `#default`。嵌套 Suspense 通过 `suspensible` 属性控制是否向上传播。

> 🎁 加分答案：点出「主动上报而非被动扫描」的设计动机——渲染期递归扫描整棵子树代价高且会漏掉动态挂载的后代；实例链上报 O(1) 就能挂到最近的 Suspense，还天然支持任意深度嵌套。再补一句「`#fallback` 和 `#default` 的一次性切换避免了多个异步组件各自 loading 导致的布局抖动」，面试官会觉得你有系统级理解。

---

## 🧩 三、源码解析（重点代码，来源 GitHub 仓库，对齐 Vue 3.4）

按笔记 25 → 26 → 27 → 28 的开发主线，从 `Teleport.ts` 到 `apiAsyncComponent.ts` 逐文件走一遍。Suspense 没有对应笔记，这一节用 Vue 3.4 真实源码的简化摘录讲清 `deps` 计数器的核心逻辑。

### Teleport.ts：process / remove 特殊处理

```typescript
import { ShapeFlags } from "@g-vue-next/shared"
import { type RendererNode, type RendererElement, type ElementNamespace, type RendererInternals, MoveType } from "../renderer"
import type { VNode, VNodeProps } from "../vnode"

export type TeleportVNode = VNode<RendererNode, RendererElement, TeleportProps>

export type TeleportProps = {
  to: string | RendererElement | null | undefined
  disabled?: boolean
}
export const TeleportEndKey = Symbol('_vte')

export const TeleportImpl = {
  name: 'Teleport',
  __isTeleport: true,
  process(
    n1: TeleportVNode | null,
    n2: TeleportVNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: any,
    parentSuspense: any,
    slotScopeIds: string[] | null,
    optimized: boolean,
    namespace: ElementNamespace,
    internals: RendererInternals
  ) {
    const {
      mc: mountChildren,
      pc: patchChildren,
      m: move,
      o: { insert, querySelector, createText, createComment }
    } = internals
    const { shapeFlag, children } = n2

    // 如果 n1 不存在，则说明是初次渲染
    if (!n1) {
      const target = (n2.target = querySelector(n2.props.to as string))
      if (target) {
        mountChildren(n2.children as any, target, null, parentComponent, parentSuspense, namespace)
      }
    } else {
      patchChildren(n1, n2, n1.target, anchor, parentComponent, parentSuspense, namespace)
      n2.target = n1.target

      if (n2.props.to !== n1.props.to) {
        const nextTarget: any = querySelector(n2.props.to as string)
        if (nextTarget) {
          n2.target = nextTarget;
          (n2.children as VNode[]).forEach(c => {
            move(c, nextTarget, anchor, MoveType.LEAVE)
          });
        }
      }
    }
  },
  remove(
    vnode: VNode,
    parentComponent: any,
    parentSuspense: any,
    internals: RendererInternals,
    doRemove?: boolean
  ) {
    const { um: unmount } = internals
    const { shapeFlag, children } = vnode
    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      ((children || []) as VNode[]).forEach(c => unmount(c, parentComponent, parentSuspense, true))
    }
  }
} as unknown as TeleportImplComp

export const Teleport: TeleportImplComp = TeleportImpl

export const isTeleport = (type: any): boolean => type.__isTeleport
```

Teleport 在渲染器里还有三处配合代码：`patch` 分支识别、`unmount` 分支识别、以及处理 Teleport 场景下的锚点查找：

```typescript
// patch 函数 switch 分支：TELEPORT 走特判
} else if (shapeFlag & ShapeFlags.TELEPORT) {
  ;(type as any).process(
    n1 as TeleportVNode,
    n2 as TeleportVNode,
    container,
    anchor,
    parentComponent,
    parentSuspense,
    null,
    true,
    namespace,
    internals
  )
}
```

```typescript
// unmount 函数：TELEPORT 走 type.remove，而不是普通 remove
} else if(shapeFlag & ShapeFlags.TELEPORT) {
  ;(vnode.type as any).remove(vnode, parentComponent, parentSuspense, internals, doRemove)
} else {
  remove(vnode)
}
```

```typescript
// getNextHostNode：处理 Teleport 场景下锚点查找
const getNextHostNode: NextFn = vnode => {
  if (vnode.shapeFlag & ShapeFlags.TELEPORT) {
    return getNextHostNode(vnode.component.subTree)
  }
  const el = hostNextSibling((vnode.anchor || vnode.el) as any)
  const teleportEnd = el && el[TeleportEndKey]
  return teleportEnd ? hostNextSibling(teleportEnd) : el
}
```

`vnode.ts` 里新增的 `isTeleport` 判定和 `target` 字段，是 Teleport 能被 `patch` 分流识别的前提：

```typescript
function _createVNode(
  type: VNodeTypes,
  props: (VNodeProps | Record<string, unknown>) | null = null,
  children: unknown = null
): VNode {
  const shapeFlag = isString(type) // 元素节点
    ? ShapeFlags.ELEMENT
    : isTeleport(type) // teleport
    ? ShapeFlags.TELEPORT
    : isObject(type) // 组件节点
    ? ShapeFlags.STATEFUL_COMPONENT
    : isFunction(type) // 函数式组件节点
    ? ShapeFlags.FUNCTIONAL_COMPONENT
    : 0
  return createBaseVNode(type, props, children, shapeFlag)
}
```

### Transition.ts / BaseTransition.ts：钩子序列的两层结构

`BaseTransition` 是无渲染的状态组件，负责把 `props` 上的钩子搬到 `child.transition` 字段：

```typescript
import { getCurrentInstance, SetupContext } from "../component"
import { type RendererElement } from "../renderer"
import { VNode } from "../vnode"

const BaseTransitionImpl: any = {
  name: 'BaseTransition',
  props: BaseTransitionPropsValidators,
  setup(props: BaseTransitionProps, { slots }: SetupContext) {
    const instance = getCurrentInstance()
    return () => {
      const child: VNode = (slots.default as any)?.()
      if (!child) {
        return
      }
      const {
        onBeforeEnter: beforeEnter,
        onEnter: enter,
        onAfterEnter: afterEnter,
        onEnterCancelled: enterCancelled,
        onBeforeLeave: beforeLeave,
        onLeave: leave,
        onAfterLeave: afterLeave,
        onLeaveCancelled: leaveCancelled,
        onBeforeAppear: beforeAppear,
        onAppear: appear,
        onAfterAppear: afterAppear,
        onAppearCancelled: appearCancelled,
      } = props
      child.transition = {
        beforeEnter,
        enter,
        afterEnter,
        enterCancelled,
        beforeLeave,
        leave,
        afterLeave,
        leaveCancelled,
        beforeAppear,
        appear,
        afterAppear,
        appearCancelled,
      }
      return child
    }
  }
}

export const BaseTransition = BaseTransitionImpl as unknown as {
  new (): {
    $props: BaseTransitionProps<any>
    $slots: {
      default: () => VNode[]
    }
  }
}
```

`Transition`（DOM 层）是个函数式组件，只做一件事：把 `name`/`css` 等 DOM 专属 props 转换成一整套「挂类名 + 判断结束」的具体钩子函数，再传给 `BaseTransition`：

```typescript
import { BaseTransitionProps, FunctionalComponent, h, BaseTransition } from "@g-vue-next/runtime-core";
import { extend } from "@g-vue-next/shared";

function nextFrame(cb: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(cb)
  })
}

export function addTransitionClass(el: Element, cls: string) {
  cls.split(/\s+/).forEach(c => c && el.classList.add(c));
}

export function removeTransitionClass(el: Element, cls: string) {
  cls.split(/\s+/).forEach(c => c && el.classList.remove(c));
}

export function forceReflow() {
  return document.body.offsetHeight
}

export function resolveTransitionProps(rawProps: TransitionProps) {
  const baseProps: BaseTransitionProps<Element> = {}

  for (const key in rawProps) {
    if (!(key in DOMTransitionPropsValidators)) {
      baseProps[key] = rawProps[key]
    }
  }

  if (rawProps.css === false) {
    return baseProps
  }

  const {
    name = 'v',
    type,
    duration,
    enterFromClass = `${name}-enter-from`,
    enterActiveClass = `${name}-enter-active`,
    enterToClass = `${name}-enter-to`,
    leaveFromClass = `${name}-leave-from`,
    leaveActiveClass = `${name}-leave-active`,
    leaveToClass = `${name}-leave-to`,
  } = rawProps

  const { onBeforeEnter, onEnter, onEnterCancelled, onBeforeLeave, onLeave, onLeaveCancelled } = baseProps

  const props = extend(baseProps, {
    onBeforeEnter(el) {
      callHook(onBeforeEnter, [el])
      addTransitionClass(el, enterFromClass)
      addTransitionClass(el, enterActiveClass)
    },
    onEnter(el, done) {
      const resolve = () => {
        removeTransitionClass(el, enterToClass)
        removeTransitionClass(el, enterActiveClass)
        done?.()
      }
      callHook(onEnter, [el, resolve])
      nextFrame(() => {
        removeTransitionClass(el, enterFromClass)
        addTransitionClass(el, enterToClass)
        if (!onEnter || onEnter.length <= 1) {
          el.addEventListener('transitionend', resolve)
        }
      })
    },
    onLeave(el, done) {
      const resolve = () => {
        removeTransitionClass(el, leaveFromClass)
        removeTransitionClass(el, leaveToClass)
        removeTransitionClass(el, leaveActiveClass)
        done?.()
      }
      addTransitionClass(el, leaveFromClass)
      forceReflow() // 强制重排，确保动画开始
      addTransitionClass(el, leaveActiveClass)
      callHook(onLeave, [el, resolve])
      nextFrame(() => {
        removeTransitionClass(el, leaveFromClass)
        addTransitionClass(el, leaveToClass)
        if (!onLeave || onLeave.length <= 1) {
          el.addEventListener('transitionend', resolve)
        }
      })
    },
  }) as any
  return props
}

// 函数式组件的功能比较少，为了方便函数式组件处理了属性
// 处理属性后传递给 状态组件 setup
export const Transition: FunctionalComponent<TransitionProps> = (
  props,
  { slots }
) => h(BaseTransition, resolveTransitionProps(props), slots as any)
```

`renderer.ts` 里 `mountElement`/`remove` 对 `transition` 字段的两处接入（挂载前后、移除前）：

```typescript
// mountElement：插入前后各调一次
if (transition) {
  transition.beforeEnter(el)
}
hostInsert(el, container as any, anchor as any)
if (transition) {
  transition.enter(el)
}
```

```typescript
// remove：先播离开动画，播完才真正移除 DOM
const remove: RemoveFn = (vnode) => {
  const { el, type, anchor, transition } = vnode
  if (type === Fragment) {
    removeFragment(el, anchor)
    return
  }
  const performRemove = () => {
    hostRemove(el as HostNode)
  }
  if (transition) {
    transition.leave(el, performRemove)
  } else {
    performRemove()
  }
}
```

有一处细节需要格外注意：`setupRenderEffect` 里合并 `attrs` 到子树 `props` 时，特意排除了 `BaseTransition`/`Transition` 这两个类型名——因为它们是「透传」组件，不应该把父级 `attrs` 拍到子节点上，否则会和内部生成的过渡类名冲突：

```typescript
// ? 这里源码中没有，为了简化逻辑，这里做了处理
if (!['BaseTransition', 'Transition'].includes(instance.type.name)) {
  subTree.props = mergeProps(instance.attrs, subTree.props)
}
```

### TransitionGroup.ts：FLIP 位移过渡（简版，笔记未覆盖）

笔记 26 只讲了 `TransitionGroup` 的用法，没有源码。这里给出简化版实现，讲清楚 FLIP 的核心步骤——记录旧位置、更新后记录新位置、反向位移、清空归位：

```typescript
// TransitionGroup.ts（简化版，核心是 move 类的过渡处理）
import { BaseTransitionProps, Fragment, h } from '@g-vue-next/runtime-core'
import { resolveTransitionProps, addTransitionClass, removeTransitionClass, forceReflow } from './Transition'

export interface TransitionGroupProps extends Omit<TransitionProps, 'mode'> {
  tag?: string
  moveClass?: string
}

const positionMap = new WeakMap<Element, DOMRect>()
const newPositionMap = new WeakMap<Element, DOMRect>()

export const TransitionGroup = {
  name: 'TransitionGroup',
  props: {
    tag: String,
    moveClass: String,
    // ...继承 Transition 的 props
  },
  setup(props: TransitionGroupProps, { slots }) {
    const instance = getCurrentInstance()
    let prevChildren: VNode[] = []

    onBeforeUpdate(() => {
      // First：记录本次更新前所有子节点的位置
      prevChildren.forEach(c => {
        if (c.el) positionMap.set(c.el, (c.el as Element).getBoundingClientRect())
      })
    })

    onUpdated(() => {
      const children = prevChildren
      // Last：记录更新后的新位置
      children.forEach(c => {
        if (!c.el) return
        const oldPos = positionMap.get(c.el)
        const newPos = (c.el as Element).getBoundingClientRect()
        const dx = oldPos ? oldPos.left - newPos.left : 0
        const dy = oldPos ? oldPos.top - newPos.top : 0
        if (dx || dy) {
          const style = (c.el as HTMLElement).style
          // Invert：反向位移，视觉上停留在旧位置
          style.transform = `translate(${dx}px, ${dy}px)`
          style.transitionDuration = '0s'
          forceReflow()
          // Play：下一帧清空 transform，触发过渡归位
          requestAnimationFrame(() => {
            style.transform = ''
            style.transitionDuration = ''
          })
        }
      })
    })

    return () => {
      const children = slots.default ? slots.default() : []
      prevChildren = children
      const tag = props.tag || Fragment
      return h(tag, null, children)
    }
  }
}
```

真实 Vue 3.4 源码里 FLIP 的位置记录挂在每个子节点的 `el._moveCb`/`el._enterCb` 上，并额外处理了「同时有进入/离开/移动」三种过渡交织的复杂时序，比这个简化版更严谨，但核心的 First-Last-Invert-Play 四步和上面完全一致。

### KeepAlive.ts：cache Map + keys Set + LRU 淘汰

```typescript
import { ElementNamespace, MoveType, RendererElement, RendererInternals, RendererNode } from "../renderer"
import { ComponentInternalInstance, currentInstance, getComponentName, getCurrentInstance, SetupContext } from "../component"
import { Comment, isSameVNodeType, isVNode, type VNode, type VNodeProps } from "../vnode"
import { invokeArrayFns, isArray, isNil, isRegExp, isString, ShapeFlags } from "@g-vue-next/shared"
import { onUpdated, onMounted, onBeforeUnmount, createHook, injectHooks } from "../apiLifecycle"
import { LifecycleHooks } from "../enums"

type MatchPattern = string | RegExp | (string | RegExp)[]
type CacheKey = PropertyKey | any
type Cache = Map<CacheKey, VNode>
type Keys = Set<CacheKey>

function resetShapeFlag(vnode: VNode) {
  // 重置 ShapeFlags.KeepAlive 位
  vnode.shapeFlag &= ~ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
  vnode.shapeFlag &= ~ShapeFlags.COMPONENT_KEPT_ALIVE
}

function matches(pattern: MatchPattern, name: string): boolean {
  if (isArray(pattern)) {
    return pattern.some((p) => matches(p, name))
  } else if (isString(pattern)) {
    return pattern.split(",").includes(name)
  } else if (isRegExp(pattern)) {
    return pattern.test(name)
  }
  return false
}

let current: VNode | null = null

const KeepAliveImpl = {
  name: 'KeepAlive',
  __isKeepAlive: true,
  props: {
    include: [String, RegExp, Array],
    exclude: [String, RegExp, Array],
    max: [String, Number]
  },
  setup(props: KeepAliveProps, { slots }: SetupContext) {
    const keys: Keys = new Set()
    let cache: Cache = new Map()
    const instance = getCurrentInstance()
    const sharedContext = instance.ctx as unknown as KeepAliveContext
    const parentSuspense = instance.suspense
    const {
      renderer: {
        p: patch,
        m: move,
        um:_unmount,
        o: { createElement }
      }
    } = sharedContext
    const storageContainer = createElement('div')

    sharedContext.activate = (vnode, container, anchor, namespace) => {
      const instance = vnode.component
      move(vnode, container, anchor, MoveType.ENTER)
      patch(instance.vnode, vnode, container, anchor, instance, parentSuspense, namespace)
      if (instance.a) {
        invokeArrayFns(instance.a)
      }
    }
    sharedContext.deactivate = (vnode) => {
      const instance = vnode.component
      move(vnode, storageContainer, null, MoveType.LEAVE)
      if (instance.da) {
        invokeArrayFns(instance.da)
      }
    }
    const unmount = (vnode: VNode) => {
      resetShapeFlag(vnode)
      _unmount(vnode, instance, parentSuspense, true)
    }

    const pruneCacheEntry = (key: CacheKey) => {
      const cached = cache.get(key) as VNode
      if (cached && (!current || isSameVNodeType(cached, current))) {
        unmount(cached)
      } else if (current) {
        resetShapeFlag(current)
      }
      cache.delete(key)
      keys.delete(key)
    }

    let pendingCacheKey: CacheKey | null = null
    const cacheSubtree = () => {
      if (!isNil(pendingCacheKey)) {
        cache.set(pendingCacheKey, instance.subTree)
      }
    }
    onMounted(cacheSubtree)
    onUpdated(cacheSubtree)

    onBeforeUnmount(() => {
      cache.forEach((cached) => {
        const { subTree } = instance
        if (cached.type === subTree.type && cached.key === subTree.key) {
          resetShapeFlag(subTree)
          const da: any = subTree.component?.da
          isArray(da) ? da.forEach((fn) => fn()) : da?.()
          return
        }
        unmount(cached)
      })
    })

    return () => {
      pendingCacheKey = null
      if (!slots.default) return null
      const vnode: VNode = (slots.default as Function)?.()
      const comp = vnode.type
      const name = getComponentName(comp)
      const { include, exclude, max } = props
      if (
        (include && (!name || !matches(include, name))) ||
        (exclude && name && matches(exclude, name))
      ) {
        current = vnode
        return vnode
      }

      const key = vnode.key == null ? comp : vnode.key
      const cachedVNode = cache.get(key) as VNode
      pendingCacheKey = key
      if (cachedVNode) {
        vnode.el = cachedVNode.el
        vnode.component = cachedVNode.component
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
        keys.delete(key)
        keys.add(key)
      } else {
        keys.add(key)
        if (max && keys.size > parseInt(max as any, 10)) {
          // lru: least recently used 最近最少使用算法，缓存中有多个元素时，淘汰最近最不常使用的元素
          pruneCacheEntry(keys.values().next().value)
        }
      }

      // 作用是稍后组件卸载的时候，不要卸载，意味着后续可以复用这个组件的 DOM 元素
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
      current = vnode
      return vnode
    }
  }
}

export const KeepAlive = KeepAliveImpl as unknown as {
  __isKeepAlive: true
  new () : {
    $props: VNodeProps & KeepAliveProps
    $slots: { default(): VNode[] }
  }
}

export const isKeepAlive = (vnode: VNode): boolean => (vnode.type as any).__isKeepAlive

function registerKeepAliveHook(hook, type: LifecycleHooks, target: ComponentInternalInstance | null = currentInstance) {
  const wrapperHook = () => hook()
  injectHooks(type, wrapperHook, target)
}

export function onActivated(hook, target?: ComponentInternalInstance | null) {
  registerKeepAliveHook(hook, LifecycleHooks.ACTIVATED, target)
}

export function onDeactivated(hook, target?: ComponentInternalInstance | null) {
  registerKeepAliveHook(hook, LifecycleHooks.DEACTIVATED, target)
}
```

`component.ts` 新增的 `getComponentName`，是 `include`/`exclude` 按组件名匹配的基础：

```typescript
export function getComponentName(
  Component: any,
  includeInherited: boolean = true
): string | false | undefined {
  return isFunction(Component)
  ? Component?.displayName || Component?.name
  : Component.name || (includeInherited && Component?.__name)
}
```

`renderer.ts` 里三处接入：`mountComponent` 阶段给 KeepAlive 组件的 `ctx` 挂上 `renderer`（渲染器内部方法集合，供 KeepAlive 的 `activate`/`deactivate` 调用）；`processComponent` 拦截 `COMPONENT_KEPT_ALIVE` 走激活；`unmount` 拦截 `COMPONENT_SHOULD_KEEP_ALIVE` 走停用：

```typescript
// mountComponent：把渲染器内部方法集合挂给 KeepAlive 用
if (isKeepAlive(initialVNode)) {
  instance.ctx.renderer = internals
}
```

```typescript
// processComponent：命中缓存标记，走 activate，不走 mountComponent
if (n1 === null) {
  if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
    const { activate } = parentComponent.ctx as KeepAliveContext
    activate?.(n2, container, anchor, namespace, true)
    return
  }
  mountComponent(n2, container, anchor, parentComponent, parentSuspense, namespace)
}
```

```typescript
// unmount：命中 SHOULD_KEEP_ALIVE 标记，走 deactivate，不走真正卸载
if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
  const { deactivate } = parentComponent.ctx as KeepAliveContext
  deactivate(vnode)
  return
}
```

### apiAsyncComponent.ts：defineAsyncComponent 全量

```typescript
import { isFunction, isNil } from "@g-vue-next/shared";
import { Component, ComponentInternalInstance, currentInstance } from "./component";
import { createVNode } from "./vnode";
import { ref } from "@g-vue-next/reactivity";

export function defineAsyncComponent<T extends Component > (
  source: AsyncComponentLoader<T> | AsyncComponentOptions<T>
): T {
  if (isFunction(source)) {
    source = { loader: source as any };
  }

  const {
    loader,
    loadingComponent,
    errorComponent,
    timeout,
    delay = 200,
    suspensible = true,
    onError: userOnError
  } = source as any

  let resolvedComp = null
  let pendingRequest = null
  let retries = 0
  let timer: any

  const retry = () => {
    retries++
    pendingRequest = null
    return load()
  }

  const load = (): Promise<any> => {
    let thisRequest
    return (pendingRequest || (thisRequest = pendingRequest =
      loader()
      .catch(err => {
        err = err instanceof Error ? err : new Error(String(err))
        if (userOnError) {
          return new Promise((resolve, reject) => {
            const userRetry = () => resolve(retry())
            const userFail = () => reject(err)
            userOnError(err, userRetry, userFail, retries + 1)
          })
        } else {
          throw err
        }
      })
      .then(comp => {
        // 如果当前的请求和 pendingRequest 不一样，则舍弃
        if (thisRequest !== pendingRequest && pendingRequest) {
          return pendingRequest
        }
        if (comp && (comp.__esModule || comp[Symbol.toStringTag] === 'Module')) {
          comp = comp.default
        }
        resolvedComp = comp
        return comp
      })
      .finally(() => {
        clearTimeout(timer)
        pendingRequest = null
      })
    ))
  }
  return {
    name: 'AsyncComponentWrapper',
    __asyncLoader: load,
    get __asyncResolved () {
      return resolvedComp
    },
    setup() {
      const instance = currentInstance
      if (resolvedComp) {
        return () => createInnerComp(resolvedComp, instance)
      }

      const loaded = ref(false)
      const error = ref(undefined)
      const delayed = ref(!!delay)

      if (delay) {
        setTimeout(() => {
          delayed.value = false
        }, delay);
      }

      if (!isNil(timeout)) {
        timer = setTimeout(() => {
          if (!loaded.value && !error.value) {
            const err = new Error(`Async component timed out after ${timeout}ms.`)
            error.value = err
          }
        }, timeout)
      }

      load()
        .then((comp) => {
          loaded.value = true
          resolvedComp = comp
        })
        .catch(err => {
          error.value = err
        })
      return () => {
        if (loaded.value && resolvedComp) {
          return createInnerComp(resolvedComp, instance)
        } else if (error.value && errorComponent) {
          return createVNode(errorComponent, {
            error: error.value
          })
        } else if (loadingComponent && !delayed.value) {
          return createVNode(loadingComponent)
        }
      }
    }
  } as any
}

function createInnerComp(comp: any, parent: ComponentInternalInstance) {
  const { ref, props, children } = parent.vnode
  const vnode = createVNode(comp, props, children)
  vnode.ref = ref
  return vnode
}
```

### Suspense.ts：deps 计数器（Vue 3.4 简化摘录，笔记未覆盖）

笔记里没有 Suspense 的手写实现，这里摘录 Vue 3.4 真实源码的核心结构（简化后帮助建立心智模型，省略了嵌套 Suspense、`suspensible` 传播、SSR 相关的完整分支）：

```typescript
// packages/runtime-core/src/components/Suspense.ts（简化摘录）
export interface SuspenseBoundary {
  deps: number                 // 未完成的异步依赖计数
  pendingBranch: VNode | null  // 待提交的 #default 子树
  isInFallback: boolean        // 是否正在展示 #fallback
  resolve(force?: boolean): void
  registerDep(instance: ComponentInternalInstance, setupRenderEffect: Function): void
}

function createSuspenseBoundary(vnode: VNode, parent: SuspenseBoundary | null): SuspenseBoundary {
  const suspense: SuspenseBoundary = {
    deps: 0,
    pendingBranch: null,
    isInFallback: true,
    // 异步组件 / 顶层 await 组件在 setup 阶段调用，把自己注册成一个依赖
    registerDep(instance, setupRenderEffect) {
      suspense.deps++
      const hydratedEl = instance.vnode.el
      instance
        .asyncDep!.catch(err => { /* onErrorCaptured 兜底 */ })
        .then(asyncSetupResult => {
          instance.asyncResolved = true
          // 依赖 resolve，计数减一
          suspense.deps--
          if (suspense.deps === 0) {
            suspense.resolve() // 全部依赖就绪，一次性提交 #default
          }
        })
    },
    resolve(force = false) {
      // 把 pendingBranch（#default 渲染结果）真正 patch 进 DOM，
      // 同时卸载 #fallback，isInFallback 置为 false
      suspense.isInFallback = false
    }
  }
  return suspense
}
```

真实源码里，异步组件的 `setup()` 如果返回一个 Promise（`<script setup>` 顶层 `await` 编译后就是这种形态），`setupStatefulComponent` 会把这个 Promise 存进 `instance.asyncDep`，并调用最近 Suspense 的 `registerDep`——这正是「二、原理」讲的「主动上报」在源码里的落点。`suspensible` 属性控制的是：`registerDep` 该挂给「最近的 Suspense」还是继续向上传播给「最近 Suspense 的父 Suspense」。

`renderer.ts` 里 Suspense 的接入点和 KeepAlive 类似，是在 `patch` 里识别 `ShapeFlags.SUSPENSE` 走单独的 `processSuspense`，本文不展开这部分渲染器改造代码，重点放在「面试会问的 deps 机制」上，避免脱离笔记主线堆砌篇幅。

---

## 🧩 四、生产级最佳实践

### Teleport + provide/inject：全屏弹窗访问全局上下文

医疗场景：药品详情全屏弹窗需要传送到 `body` 避开页面滚动容器的裁切，同时要读取祖先组件 `provide` 的患者上下文——「二、原理」讲过这俩互不影响，可以放心组合：

```vue
<!-- 祖先组件：问诊页面 -->
<script setup lang="ts">
import { provide, ref } from 'vue'

const currentPatient = ref({ id: 'p001', name: '张三' })
provide('patient', currentPatient)
</script>

<template>
  <DrugDetailModal v-if="showDrugModal" @close="showDrugModal = false" />
</template>
```

```vue
<!-- DrugDetailModal.vue：传送到 body，但依然能拿到患者上下文 -->
<script setup lang="ts">
import { inject } from 'vue'

const patient = inject('patient')
</script>

<template>
  <Teleport to="body">
    <div class="drug-modal">
      <p>当前患者：{{ patient?.name }}</p>
      <!-- 药品详情内容 -->
    </div>
  </Teleport>
</template>
```

### KeepAlive + 路由缓存：按需缓存问诊页面

`include` 支持动态计算，结合路由 `meta` 字段可以做到「只缓存标记了需要缓存的页面」，而不是把所有页面无差别塞进缓存：

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
// 路由 meta.keepAlive 为 true 的页面才加入白名单
const cachedViews = computed(() => ['ConsultationList', 'PatientProfile'])
</script>

<template>
  <router-view v-slot="{ Component, route }">
    <KeepAlive :include="cachedViews">
      <component :is="Component" :key="route.path" />
    </KeepAlive>
  </router-view>
</template>
```

### Transition 性能优化：只用 transform，避免重排

问诊列表的滑入滑出动画，用 `left`/`top` 会触发 layout，用 `transform` 只触发合成层，`will-change` 提前告知浏览器准备合成层：

```css
/* ❌ 触发重排：每一帧都要重新计算布局 */
.slide-enter-active, .slide-leave-active {
  transition: left 0.3s ease;
}
.slide-enter-from { left: -100%; }

/* ✅ 只触发合成，性能好一个量级 */
.slide-enter-active, .slide-leave-active {
  transition: transform 0.3s ease;
  will-change: transform;
}
.slide-enter-from { transform: translateX(-100%); }
```

### Suspense + 多异步组件协作：患者详情页统一 loading

医疗场景：患者详情页同时依赖「处方数据」和「检验报告」两个异步组件，用一个 Suspense 统一调度，避免两个组件各自 loading 造成的布局抖动；`onErrorCaptured` 兜底任意一个依赖加载失败：

```vue
<!-- PatientDetailPage.vue -->
<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'

const loadError = ref<Error | null>(null)
onErrorCaptured((err) => {
  loadError.value = err
  return false // 阻止错误继续向上传播
})
</script>

<template>
  <div v-if="loadError">加载患者详情失败：{{ loadError.message }}</div>
  <Suspense v-else>
    <template #default>
      <div class="patient-detail">
        <PrescriptionPanel :patient-id="patientId" />   <!-- 异步组件，内部 await 处方接口 -->
        <LabReportPanel :patient-id="patientId" />       <!-- 异步组件，内部 await 检验接口 -->
      </div>
    </template>
    <template #fallback>
      <div class="loading-skeleton">患者详情加载中...</div>
    </template>
  </Suspense>
</template>
```

```vue
<!-- PrescriptionPanel.vue：顶层 await，天然被最近的 Suspense 捕获 -->
<script setup lang="ts">
const props = defineProps<{ patientId: string }>()
const { data: prescriptions } = await fetchPrescriptions(props.patientId)
</script>

<template>
  <ul>
    <li v-for="p in prescriptions" :key="p.id">{{ p.drugName }}</li>
  </ul>
</template>
```

**嵌套 Suspense 场景**：外层 Suspense 等内层 Suspense + 其他异步组件全部就绪：

```vue
<!-- 外层：整个患者档案页 -->
<Suspense>
  <template #default>
    <div>
      <PatientBasicInfo />  <!-- 普通同步组件 -->
      <!-- 内层：处方模块有自己的 Suspense -->
      <Suspense suspensible>
        <template #default>
          <PrescriptionPanel :patient-id="patientId" />  <!-- 异步组件 -->
        </template>
        <template #fallback><div>处方加载中...</div></template>
      </Suspense>
      <LabReportPanel :patient-id="patientId" />  <!-- 另一个异步组件，挂到外层 Suspense -->
    </div>
  </template>
  <template #fallback><div>患者档案加载中...</div></template>
</Suspense>
```

内层 Suspense 的 `suspensible` 属性（默认 `true`）让它也成为外层的一个依赖——外层 `deps` 会等内层 resolve。设 `suspensible: false` 可让内层独立，不阻塞外层。

### 异步组件 + 路由懒加载：代码分割落地

结合 Vite 的动态 `import()`，路由级异步组件天然按页面分 chunk，首屏只加载当前路由需要的代码：

```typescript
// router/index.ts
const routes = [
  {
    path: '/prescription',
    component: () => import('../views/PrescriptionView.vue'), // 独立 chunk
  },
  {
    path: '/lab-report',
    component: defineAsyncComponent({
      loader: () => import('../views/LabReportView.vue'),
      loadingComponent: PageLoading,
      delay: 200,
      timeout: 10000,
    }),
  },
]
```

---

## 🧩 五、手写实现（可独立跑通）

环境沿用第 1 篇的 Vite + TypeScript 配置，Teleport/Transition/KeepAlive/异步组件的框架内部实现已经在笔记 25~28 逐步搭好，这里按文件列出与笔记原文逐字一致的完整代码，可以直接复制到对应文件里跑通；Suspense 笔记未覆盖，补一段简化版 `deps` 计数器的独立可跑代码，验证「二、原理」讲的调度逻辑。

### Teleport.ts（全量）

```typescript
import { ShapeFlags } from "@g-vue-next/shared"
import { type RendererNode, type RendererElement, type ElementNamespace, type RendererInternals, MoveType } from "../renderer"
import type { VNode, VNodeProps } from "../vnode"

export type TeleportVNode = VNode<RendererNode, RendererElement, TeleportProps>

export type TeleportProps = {
  to: string | RendererElement | null | undefined
  disabled?: boolean
}
export const TeleportEndKey = Symbol('_vte')

export type TeleportImplComp = {
  name: 'Teleport'
  __isTeleport: true
  process(
    n1: TeleportVNode | null,
    n2: TeleportVNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: any,
    parentSuspense: any,
    slotScopeIds: string[] | null,
    optimized: boolean,
    namespace: ElementNamespace,
    internals: RendererInternals
  ): void
  remove(
    vnode: VNode,
    parentComponent: any,
    parentSuspense: any,
    internals: RendererInternals,
    doRemove?: boolean
  ): void
  new (): {
    $props: VNodeProps & TeleportProps
    $slots: {
      default(): VNode[]
    }
  }
}
export const TeleportImpl = {
  name: 'Teleport',
  __isTeleport: true,
  process(
    n1: TeleportVNode | null,
    n2: TeleportVNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: any,
    parentSuspense: any,
    slotScopeIds: string[] | null,
    optimized: boolean,
    namespace: ElementNamespace,
    internals: RendererInternals
  ) {
    const {
      mc: mountChildren,
      pc: patchChildren,
      m: move,
      o: { insert, querySelector, createText, createComment }
    } = internals
    const { shapeFlag, children } = n2

    if (!n1) {
      const target = (n2.target = querySelector(n2.props.to as string))
      if (target) {
        mountChildren(n2.children as any, target, null, parentComponent, parentSuspense, namespace)
      }
    } else {
      patchChildren(n1, n2, n1.target, anchor, parentComponent, parentSuspense, namespace)
      n2.target = n1.target

      if (n2.props.to !== n1.props.to) {
        const nextTarget: any = querySelector(n2.props.to as string)
        if (nextTarget) {
          n2.target = nextTarget;
          (n2.children as VNode[]).forEach(c => {
            move(c, nextTarget, anchor, MoveType.LEAVE)
          });
        }
      }
    }
  },
  remove(
    vnode: VNode,
    parentComponent: any,
    parentSuspense: any,
    internals: RendererInternals,
    doRemove?: boolean
  ) {
    const { um: unmount } = internals
    const { shapeFlag, children } = vnode
    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      ((children || []) as VNode[]).forEach(c => unmount(c, parentComponent, parentSuspense, true))
    }
  }
} as unknown as TeleportImplComp

export const Teleport: TeleportImplComp = TeleportImpl

export const isTeleport = (type: any): boolean => type.__isTeleport
```

### BaseTransition.ts（全量）

```typescript
import { getCurrentInstance, SetupContext } from "../component"
import { type RendererElement } from "../renderer"
import { VNode } from "../vnode"

type Hooks<T = () => void> = T | T[]

export interface BaseTransitionProps<HostElement = RendererElement> {
  mode?: 'in-out' | 'out-in' | 'default' | undefined
  appear?: boolean
  persisted?: boolean
  // enter
  onBeforeEnter?: Hooks<(el: HostElement) => void>
  onEnter?: Hooks<(el: HostElement, done: () => void) => void>
  onAfterEnter?: Hooks<(el: HostElement) => void>
  onEnterCancelled?: Hooks<(el: HostElement) => void>
  // leave
  onBeforeLeave?: Hooks<(el: HostElement) => void>
  onLeave?: Hooks<(el: HostElement, done: () => void) => void>
  onAfterLeave?: Hooks<(el: HostElement) => void>
  onLeaveCancelled?: Hooks<(el: HostElement) => void>
  // appear
  onBeforeAppear?: Hooks<(el: HostElement) => void>
  onAppear?: Hooks<(el: HostElement, done: () => void) => void>
  onAfterAppear?: Hooks<(el: HostElement) => void>
  onAppearCancelled?: Hooks<(el: HostElement) => void>
}

export const BaseTransitionPropsValidators = {
  mode: String,
  appear: Boolean,
  persisted: Boolean,
  // enter
  onBeforeEnter: Function,
  onEnter: Function,
  onAfterEnter: Function,
  onEnterCancelled: Function,
  // leave
  onBeforeLeave: Function,
  onLeave: Function,
  onAfterLeave: Function,
  onLeaveCancelled: Function,
  // appear
  onBeforeAppear: Function,
  onAppear: Function,
  onAfterAppear: Function,
  onAppearCancelled: Function,
}

const BaseTransitionImpl: any = {
  name: 'BaseTransition',
  props: BaseTransitionPropsValidators,
  setup(props: BaseTransitionProps, { slots }: SetupContext) {
    const instance = getCurrentInstance()
    return () => {
      const child: VNode = (slots.default as any)?.()
      if (!child) {
        return
      }
      const {
        onBeforeEnter: beforeEnter,
        onEnter: enter,
        onAfterEnter: afterEnter,
        onEnterCancelled: enterCancelled,
        onBeforeLeave: beforeLeave,
        onLeave: leave,
        onAfterLeave: afterLeave,
        onLeaveCancelled: leaveCancelled,
        onBeforeAppear: beforeAppear,
        onAppear: appear,
        onAfterAppear: afterAppear,
        onAppearCancelled: appearCancelled,
      } = props
      child.transition = {
        beforeEnter,
        enter,
        afterEnter,
        enterCancelled,
        beforeLeave,
        leave,
        afterLeave,
        leaveCancelled,
        beforeAppear,
        appear,
        afterAppear,
        appearCancelled,
      }
      return child
    }
  }
}

export const BaseTransition = BaseTransitionImpl as unknown as {
  new (): {
    $props: BaseTransitionProps<any>
    $slots: {
      default: () => VNode[]
    }
  }
}
```

### Transition.ts（runtime-dom，全量）

```typescript
import { BaseTransitionProps, FunctionalComponent, h, BaseTransition } from "@g-vue-next/runtime-core";
import { extend } from "@g-vue-next/shared";

const TRANSITION = 'transition'
const ANIMATION = 'animation'

type AnimationType = typeof TRANSITION | typeof ANIMATION

export interface TransitionProps extends BaseTransitionProps<Element> {
  name?: string
  type?: AnimationType
  css?: boolean
  duration?: number | { enter: number, leave: number }
  // custom transition classes
  enterFromClass?: string
  enterActiveClass?: string
  enterToClass?: string
  appearFromClass?: string
  appearActiveClass?: string
  appearToClass?: string
  leaveFromClass?: string
  leaveActiveClass?: string
  leaveToClass?: string
}

const DOMTransitionPropsValidators = {
  name: String,
  type: String,
  css: {
    type: Boolean,
    default: true
  },
  duration: [String, Number, Object],
  enterFromClass: String,
  enterActiveClass: String,
  enterToClass: String,
  appearFromClass: String,
  appearActiveClass: String,
  appearToClass: String,
  leaveFromClass: String,
  leaveActiveClass: String,
  leaveToClass: String,
}

const callHook = (hook: any, args: any) => {
  if (hook) {
    if (Array.isArray(hook)) {
      hook.forEach((h) => h(...args))
    } else if (hook) {
      hook(...args)
    }
  }
}

function nextFrame(cb: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(cb)
  })
}

export function addTransitionClass(el: Element, cls: string) {
  cls.split(/\s+/).forEach(c => c && el.classList.add(c));
}

export function removeTransitionClass(el: Element, cls: string) {
  cls.split(/\s+/).forEach(c => c && el.classList.remove(c));
}

export function forceReflow() {
  return document.body.offsetHeight
}

export function resolveTransitionProps(rawProps: TransitionProps) {
  const baseProps: BaseTransitionProps<Element> = {}

  for (const key in rawProps) {
    if (!(key in DOMTransitionPropsValidators)) {
      baseProps[key] = rawProps[key]
    }
  }

  if (rawProps.css === false) {
    return baseProps
  }

  const {
    name = 'v',
    type,
    duration,
    enterFromClass = `${name}-enter-from`,
    enterActiveClass = `${name}-enter-active`,
    enterToClass = `${name}-enter-to`,
    appearFromClass = enterFromClass,
    appearActiveClass = enterActiveClass,
    appearToClass = enterToClass,
    leaveFromClass = `${name}-leave-from`,
    leaveActiveClass = `${name}-leave-active`,
    leaveToClass = `${name}-leave-to`,
  } = rawProps

  const {
    onBeforeEnter,
    onEnter,
    onEnterCancelled,
    onBeforeLeave,
    onLeave,
    onLeaveCancelled,
    onBeforeAppear = onBeforeEnter,
    onAppear = onEnter,
    onAppearCancelled = onEnterCancelled,
  } = baseProps

  const props = extend(baseProps, {
    onBeforeEnter(el) {
      callHook(onBeforeEnter, [el])
      addTransitionClass(el, enterFromClass)
      addTransitionClass(el, enterActiveClass)
    },
    onBeforeAppear(el) {
      callHook(onBeforeAppear, [el])
      addTransitionClass(el, appearFromClass)
      addTransitionClass(el, appearActiveClass)
    },
    onBeforeLeave(el) {
      callHook(onBeforeLeave, [el])
      addTransitionClass(el, leaveFromClass)
      addTransitionClass(el, leaveActiveClass)
    },
    onEnter(el, done) {
      const resolve = () => {
        removeTransitionClass(el, enterToClass)
        removeTransitionClass(el, enterActiveClass)
        done?.()
      }
      callHook(onEnter, [el, resolve])
      nextFrame(() => {
        removeTransitionClass(el, enterFromClass)
        addTransitionClass(el, enterToClass)

        if (!onEnter || onEnter.length <= 1) {
          el.addEventListener('transitionend', resolve)
        }
      })
    },
    onAppear(el, done) {
      const resolve = () => {
        removeTransitionClass(el, appearToClass)
        removeTransitionClass(el, appearActiveClass)
        done?.()
      }
      callHook(onAppear, [el, resolve])
      nextFrame(() => {
        removeTransitionClass(el, appearFromClass)
        addTransitionClass(el, appearToClass)
        if (!onAppear || onAppear.length <= 1) {
          el.addEventListener('transitionend', resolve)
        }
      })
    },
    onLeave(el, done) {
      const resolve = () => {
        removeTransitionClass(el, leaveFromClass)
        removeTransitionClass(el, leaveToClass)
        removeTransitionClass(el, leaveActiveClass)
        done?.()
      }
      addTransitionClass(el, leaveFromClass)
      forceReflow() // 强制重排，确保动画开始
      addTransitionClass(el, leaveActiveClass)
      callHook(onLeave, [el, resolve])
      nextFrame(() => {
        removeTransitionClass(el, leaveFromClass)
        addTransitionClass(el, leaveToClass)
        if (!onLeave || onLeave.length <= 1) {
          el.addEventListener('transitionend', resolve)
        }
      })

    },
    onEnterCancelled(el) {
      removeTransitionClass(el, enterToClass)
      removeTransitionClass(el, enterActiveClass)
      callHook(onEnterCancelled, [el])
    },
    onAppearCancelled(el) {
      removeTransitionClass(el, appearToClass)
      removeTransitionClass(el, appearActiveClass)
      callHook(onAppearCancelled, [el])
    },
    onLeaveCancelled(el) {
      removeTransitionClass(el, leaveFromClass)
      removeTransitionClass(el, leaveToClass)
      removeTransitionClass(el, leaveActiveClass)
      callHook(onLeaveCancelled, [el])
    }
  }) as any
  return props
}

// 函数式组件的功能比较少，为了方便函数式组件处理了属性
// 处理属性后传递给 状态组件 setup
export const Transition: FunctionalComponent<TransitionProps> = (
  props,
  { slots }
) => h(BaseTransition, resolveTransitionProps(props), slots as any)
```

配套的三处改动（与笔记 26 的 diff 逐字一致，已在「三、源码解析」完整给出，这里不重复粘贴）：`vnode.ts` 给 `VNode` 加 `transition: any | null` 字段并在 `createBaseVNode` 里初始化为 `null`；`renderer.ts` 的 `mountElement`/`remove` 在插入前后、移除前调用 `transition.beforeEnter/enter/leave`；`setupRenderEffect` 合并 `attrs` 时排除 `BaseTransition`/`Transition` 两个类型名，避免 `attrs` 覆盖掉过渡类名。

### KeepAlive.ts（全量）

```typescript
import { ElementNamespace, MoveType, RendererElement, RendererInternals, RendererNode } from "../renderer"
import { ComponentInternalInstance, currentInstance, getComponentName, getCurrentInstance, SetupContext } from "../component"
import { Comment, isSameVNodeType, isVNode, type VNode, type VNodeProps } from "../vnode"
import { invokeArrayFns, isArray, isNil, isRegExp, isString, ShapeFlags } from "@g-vue-next/shared"
import { onUpdated, onMounted, onBeforeUnmount, createHook, injectHooks } from "../apiLifecycle"
import { LifecycleHooks } from "../enums"

type MatchPattern = string | RegExp | (string | RegExp)[]
type CacheKey = PropertyKey | any
type Cache = Map<CacheKey, VNode>
type Keys = Set<CacheKey>

export interface KeepAliveProps {
  include?: MatchPattern
  exclude?: MatchPattern
  max?: number
}

export interface KeepAliveContext {
  renderer: RendererInternals
  activate: (
    vnode: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    namespace: ElementNamespace,
    optimized: boolean
  ) => void
  deactivate: (vnode: VNode) => void
}

function resetShapeFlag(vnode: VNode) {
  // 重置ShapeFlags.KeepAlive位
  vnode.shapeFlag &= ~ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE 
  vnode.shapeFlag &= ~ShapeFlags.COMPONENT_KEPT_ALIVE
}

function getInnerChild(vnode: VNode): VNode {
  return vnode.shapeFlag & ShapeFlags.SUSPENSE
    ? vnode.ssContent
    : vnode
}

function matches(pattern: MatchPattern, name: string): boolean {
  if (isArray(pattern)) {
    return pattern.some((p) => matches(p, name))
  } else if (isString(pattern)) {
    return pattern.split(",").includes(name)
  } else if (isRegExp(pattern)) {
    return pattern.test(name)
  }
  return false
}

let current: VNode | null = null

const KeepAliveImpl = {
  name: 'KeepAlive',
  __isKeepAlive: true,
  props: {
    include: [String, RegExp, Array],
    exclude: [String, RegExp, Array],
    max: [String, Number]
  },
  setup(props: KeepAliveProps, { slots }: SetupContext) {
    // 缓存的key
    const keys: Keys = new Set()
    // 缓存的组件
    let cache: Cache = new Map()
    // 获取组件实例
    const instance = getCurrentInstance()
    // 由于类型不兼容，先断言为 unknown 再断言为 KeepAliveContext
    const sharedContext = instance.ctx as unknown as KeepAliveContext
    // 获取组件的 Suspense 实例
    const parentSuspense = instance.suspense
    // 获取渲染器
    const {
      renderer: {
        p: patch,
        m: move,
        um:_unmount,
        o: {
          createElement
        }
      }
    } = sharedContext
    // 新建缓存容器
    const storageContainer = createElement('div')
    sharedContext.activate = (vnode, container, anchor, namespace) => { 
      const instance = vnode.component
      // 激活时直接挂载
      move(vnode, container, anchor, MoveType.ENTER)
      // 激活时更新
      patch(
        instance.vnode,
        vnode,
        container,
        anchor,
        instance,
        parentSuspense,
        namespace
      )

      // hooks
      if (instance.a) {
        invokeArrayFns(instance.a)
      }
    }
    sharedContext.deactivate = (vnode) => {
      const instance = vnode.component
      // 移动到缓存容器
      move(vnode, storageContainer, null, MoveType.LEAVE)

      // hooks
      if (instance.da) {
        invokeArrayFns(instance.da)
      }
    }
    const unmount = (vnode: VNode) => {
      resetShapeFlag(vnode)
      _unmount(vnode, instance, parentSuspense, true)
    }

    const pruneCache = (filter?: (name: string) => boolean) => {
      cache.forEach((vnode, key) => {
        const name = getComponentName(vnode.type)
        if (name && (!filter || !filter(name))) {
          pruneCacheEntry(key)
        }
      })
    }

    const pruneCacheEntry = (key: CacheKey) => { 
      const cached = cache.get(key) as VNode
      if (cached && (!current ||isSameVNodeType(cached, current))) {
        unmount(cached)
      } else if (current) {
        resetShapeFlag(current)
      }
      cache.delete(key)
      keys.delete(key)
    }

    // 缓存的键
    let pendingCacheKey: CacheKey | null = null
    const cacheSubtree = () => {
      if (!isNil(pendingCacheKey)) {
        cache.set(pendingCacheKey, getInnerChild(instance.subTree))
      }
    }

    onMounted(cacheSubtree)
    onUpdated(cacheSubtree)

    onBeforeUnmount(() => {
      cache.forEach((cached) => {
        const { subTree, suspense } = instance
        const vnode = getInnerChild(subTree)
        if (cached.type === vnode.type && cached.key === vnode.key) {
          resetShapeFlag(vnode)
          const da: any = vnode.component?.da
          if (isArray(da)) {
            da.forEach((fn) => fn())
          } else {
            da?.()
          }
          return
        }
        unmount(cached)
      })
    })

    return () => {
      pendingCacheKey = null
      if (!slots.default) {
        return null
      }
      const vnode: VNode = (slots.default as Function)?.()
      const comp = vnode.type
      const name = getComponentName(comp)
      const { include, exclude, max } = props
      if (
        (include && (!name || !matches(include, name))) ||
        (exclude && name && matches(exclude, name))
      ) {
        current = vnode
        return vnode
      }

      const key = vnode.key == null ? comp : vnode.key
      const cachedVNode = cache.get(key) as VNode
      pendingCacheKey = key
      if (cachedVNode) {
        // 复用缓存组件，直接设置组件的 el 属性
        vnode.el = cachedVNode.el
        // 设置组件的 component 属性
        vnode.component = cachedVNode.component
        // 标识组件已经被缓存过了
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
        // 将set中有的元素移动到末尾
        keys.delete(key)
        keys.add(key)
      } else {
        keys.add(key)
        if (max && keys.size > parseInt(max as any, 10)) {
          // lru: least recently used 最近最少使用算法，缓存中有多个元素时，淘汰最近最不常使用的元素。
          pruneCacheEntry(keys.values().next().value)
        }
      }

      // 作用是稍后组件卸载的时候，不要卸载，意味着后续可以复用这个组件的 DOM 元素
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE

      current = vnode

      return vnode
    }
  }
}

export const KeepAlive = KeepAliveImpl as unknown as { 
  __isKeepAlive: true 
  new () : {
    $props: VNodeProps & KeepAliveProps
    $slots: {
      default(): VNode[]
    }
  }
}

export const isKeepAlive = (vnode: VNode): boolean => (vnode.type as any).__isKeepAlive

function registerKeepAliveHook(hook, type: LifecycleHooks, target: ComponentInternalInstance | null = currentInstance) {
  const wrapperHook = () => {
    let current = target
    while (current) {
      current = current.parent
    }
    return hook()
  }
  injectHooks(type, wrapperHook, target)
}

export function onActivated(hook, target?: ComponentInternalInstance | null) {
  registerKeepAliveHook(hook, LifecycleHooks.ACTIVATED, target)
}

export function onDeactivated(hook, target?: ComponentInternalInstance | null) {
  registerKeepAliveHook(hook, LifecycleHooks.DEACTIVATED, target)
}
```

`component.ts` 新增的 `getComponentName`（`include`/`exclude` 按组件名匹配的基础）：

```typescript
export function getComponentName(
  Component: any,
  includeInherited: boolean = true
): string | false | undefined {
  return isFunction(Component) 
  ? Component?.displayName || Component?.name 
  : Component.name || (includeInherited && Component?.__name)
}
```

`renderer.ts` 三处接入（与笔记 27 的 diff 逐字一致）：

```typescript
// mountComponent：把渲染器内部方法集合挂给 KeepAlive 用
if (isKeepAlive(initialVNode)) {
  instance.ctx.renderer = internals
}
```

```typescript
// processComponent：命中缓存标记，走 activate，不走 mountComponent
if (n1 === null) {
  // 如果组件是被 KeepAlive 组件 缓存过的，则需要进行激活处理
  if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
    const { activate } = parentComponent.ctx as KeepAliveContext
    activate?.(n2, container, anchor, namespace, true)
    return
  }
  mountComponent(n2, container, anchor, parentComponent, parentSuspense, namespace)
}
```

```typescript
// unmount：命中 SHOULD_KEEP_ALIVE 标记，走 deactivate，不走真正卸载
const { shapeFlag } = vnode

// 判断是否是KeepAlive 组件
if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
  const { deactivate } = parentComponent.ctx as KeepAliveContext
  deactivate(vnode)
  return
}
```

### apiAsyncComponent.ts（全量）

```typescript
import { isFunction, isNil } from "@g-vue-next/shared";
import { Component, ComponentInternalInstance, currentInstance } from "./component";
import { createVNode } from "./vnode";
import { ref } from "@g-vue-next/reactivity";

export type AsyncComponentResolveResult<T = Component> = T | { default: T}

export type AsyncComponentLoader<T = any> = () => Promise<AsyncComponentResolveResult<T>>

export interface AsyncComponentOptions<T = any> {
  loader: AsyncComponentLoader<T>
  loadingComponent?: Component
  errorComponent?: Component
  delay?: number
  timeout?: number
  suspensible?: boolean
  onError?: (
    error: Error, 
    retry: () => void, 
    fail: () => void, 
    attempts: number
  ) => void
}

export function defineAsyncComponent<T extends Component > (
  source: AsyncComponentLoader<T> | AsyncComponentOptions<T>
): T {
  if (isFunction(source)) {
    source = { loader: source as any };
  }

  const {
    loader,
    loadingComponent,
    errorComponent,
    timeout,
    delay = 200,
    suspensible = true,
    onError: userOnError
  } = source as any

  let resolvedComp = null
  let pendingRequest = null
  let retries = 0
  let timer: any

  const retry = () => {
    retries++
    pendingRequest = null
    return load()
  }

  const load = (): Promise<any> => {
    let thisRequest
    return (pendingRequest || (thisRequest = pendingRequest = 
      loader()
      .catch(err => {
        err = err instanceof Error ? err : new Error(String(err))
        if (userOnError) {
          return new Promise((resolve, reject) => {
            const userRetry = () => resolve(retry())
            const userFail = () => reject(err)
            userOnError(err, userRetry, userFail, retries + 1)
          })
        } else {
          throw err
        }
      })
      .then(comp => {
        // 如果当前的请求和 pendingRequest不一样，则舍弃
        if (thisRequest !== pendingRequest && pendingRequest) {
          return pendingRequest
        }
        if (comp && (comp.__esModule || comp[Symbol.toStringTag] === 'Module')) {
          comp = comp.default
        }
        resolvedComp = comp
        return comp
      })
      .finally(() => {
        clearTimeout(timer)
        pendingRequest = null
      })
    ))
  }
  return {
    name: 'AsyncComponentWrapper',
    __asyncLoader: load,
    get __asyncResolved () {
      return resolvedComp
    },
    setup() {
      const instance = currentInstance
      if (resolvedComp) {
        return () => createInnerComp(resolvedComp, instance)
      }

      const loaded = ref(false)
      const error = ref(undefined)
      const delayed = ref(!!delay)

      if (delay) {
        setTimeout(() => {
          delayed.value = false
        }, delay);
      }

      if (!isNil(timeout)) {
        timer = setTimeout(() => {
          if (!loaded.value && !error.value) {
            const err = new Error(`Async component timed out after ${timeout}ms.`)
            error.value = err
          }
        }, timeout)
      }

      load()
        .then((comp) => {
          loaded.value = true
          resolvedComp = comp
        })
        .catch(err => {
          error.value = err
        })
      return () => {
        if (loaded.value && resolvedComp) {
          return createInnerComp(resolvedComp, instance)
        } else if (error.value && errorComponent) {
          return createVNode(errorComponent, {
            error: error.value
          })
        } else if (loadingComponent && !delayed.value) {
          return createVNode(loadingComponent)
        }
      }
    }
  } as any
}

function createInnerComp(comp: any, parent: ComponentInternalInstance) {
  const { ref, props, children } = parent.vnode
  const vnode = createVNode(comp, props, children)
  vnode.ref = ref
  return vnode
}
```

### Suspense 简化版(笔记未覆盖,补充可跑验证代码)

笔记没有 Suspense 手写实现,这里补一段独立可跑的简化版 `deps` 计数器验证代码,不侵入现有渲染器:

```typescript
// SimpleSuspense.ts（简化版，独立验证 deps 计数逻辑）
import { ref, h } from '@g-vue-next/runtime-core'

export function createSimpleSuspense() {
  const isInFallback = ref(true)
  let deps = 0
  const pendingPromises: Promise<any>[] = []

  const registerDep = (promise: Promise<any>) => {
    deps++
    pendingPromises.push(promise)
    promise
      .then(() => {
        deps--
        if (deps === 0) {
          resolve()
        }
      })
      .catch(err => {
        console.error('Suspense dependency failed:', err)
      })
  }

  const resolve = () => {
    isInFallback.value = false
  }

  return {
    isInFallback,
    registerDep,
    render: (defaultSlot: () => any, fallbackSlot: () => any) => {
      return isInFallback.value ? fallbackSlot() : defaultSlot()
    }
  }
}

// 使用示例
const suspense = createSimpleSuspense()

// 模拟两个异步依赖
const asyncComp1 = new Promise(resolve => setTimeout(() => resolve('Comp1 ready'), 1000))
const asyncComp2 = new Promise(resolve => setTimeout(() => resolve('Comp2 ready'), 2000))

suspense.registerDep(asyncComp1)
suspense.registerDep(asyncComp2)

// deps = 2 时渲染 fallback
console.log('Initial:', suspense.isInFallback.value) // true

// 2秒后 deps 归零，切换到 default
setTimeout(() => {
  console.log('After all deps resolved:', suspense.isInFallback.value) // false
}, 2500)
```

这段简化代码剥离了渲染器集成,只保留核心的"注册依赖 → 计数 → 归零切换"逻辑,可以独立在 Node 环境跑通验证「二、原理」讲的 deps 机制。

### 运行示例 HTML（笔记原文，逐字一致）

#### teleport.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>teleport</title>
  <style>
    body {
      margin: 0;
    }
    #app {
      background-color: rgb(227, 176, 176);
      width: 100vw;
      height: 100px;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <div id="home"></div>
  <div id="dashboard"></div>
  <div id="about"></div>
  <script type="module">
    import { ref, render, h, Text, Fragment, Teleport } from '../../packages/vue/dist/vue.esm.js'

    const App = {
      setup() {
        const visible = ref(true)
        const hide = ref(false)
        return () => h(Fragment, {}, [
          h('div', 'app'),
          h('button', {
            onClick: () => visible.value = !visible.value
          }, 'toggle'),
          h('button', {
            onClick: () => hide.value = !hide.value
          }, hide.value ? 'hide' : 'show'),
          visible.value ?
            h(Teleport, { to: '#home' }, h('div', {style: { background: 'lightgreen' }}, 'home'))
            : h(Teleport, { to: '#dashboard' }, h('p', {style: { background: 'orange' }}, 'dashboard')),
          !hide.value ?
            h(Teleport, { to: '#about' }, h('div', {style: { background: 'lightgreen' }}, 'about'))
            : null
        ])
      }
    }

    render(h(App, {}), document.querySelector('#app'))
  </script>
</body>
</html>
```

#### transition.html

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transition</title>
  <style>
    .v-enter-active,
    .v-leave-active {
      transition: opacity 2s ease;
    }

    .v-enter-from,
    .v-leave-to {
      opacity: 0;
    }
  </style>
</head>

<body>
  <div id="app"></div>
  <script type="module">
    import { ref, render, h, Fragment, Transition } from '../../packages/vue/dist/vue.esm.js'

    const transitionProps = {
      mode: 'out-in',
      onBeforeEnter(el) {
        console.log('onBeforeEnter', el)
      },
      onEnter(el) {
        console.log('onEnter', el)
      },
      onAfterEnter(el) {
        console.log('onAfterEnter', el)
      },
      onBeforeLeave(el) {
        console.log('onBeforeLeave', el)
      },
      onLeave(el) {
        console.log('onLeave', el)
      },
      onAfterLeave(el) {
        console.log('onAfterLeave', el)
      }
    }
    const style = {
      width: '100px',
      height: '100px',
      background: 'red',
      display: 'flex',
      'justify-content': 'center',
      'align-items': 'center',
      color: 'yellow'
    }
    const App = {
      setup() {
        const show = ref(true)
        return () => h(Fragment, [
          h('button', {
            onClick: () => {
              show.value = !show.value
            }
          }, 'toggle'),
          h(Transition, transitionProps, {
            default: () => show.value ? h('p', { style }, 'hello') : null
          })
        ])
      }
    }

    render(h(App), document.getElementById('app'))
  </script>
</body>

</html>
```

#### keepAlive.html

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KeepAlive</title>
</head>

<body>
  <div id="app"></div>
  <script type="module">
    import { ref, render, h, provide, inject, reactive, getCurrentInstance, KeepAlive, onMounted } from '../../packages/vue/dist/vue.esm.js'

    // 1.组件不会重新创建，而是缓存起来，下次渲染时直接从缓存中获取
    //  1.1缓存组件的策略：
    //    1.1.1 默认情况下，所有组件都会被缓存
    //    1.1.2 可以通过include和exclude属性来指定哪些组件需要被缓存，哪些不需要
    //    1.1.3 可以通过max属性来指定缓存组件的最大数量
    // 2.组件不会被卸载，而是直接将DOM移除掉
    // 3.内部需要缓存DOM

    const DefaultComponent = {
      name: 'DefaultComponent',
      setup() {
        onMounted(() => {
          console.log('default component mounted')
        })
        return () => h('div', {}, 'default component')
      }
    }

    const DefaultComponent2 = {
      name: 'DefaultComponent2',
      setup() {
        onMounted(() => {
          console.log('default component 2 mounted')
        })
        return () => h('div', {}, 'default component 2')
      }
    }

    const DefaultComponent3 = {
      name: 'DefaultComponent3',
      setup() {
        onMounted(() => {
          console.log('default component 3 mounted')
        })
        return () => h('div', {}, 'default component 3')
      }
    }

    const DefaultComponent4 = {
      name: 'DefaultComponent4',
      setup() {
        onMounted(() => {
          console.log('default component 4 mounted')
        })
        return () => h('div', {}, 'default component 4')
      }
    }

    render(h(KeepAlive, { exclude: 'DefaultComponent', include: 'DefaultComponent2, DefaultComponent3, DefaultComponent4', max: 2 }, {
      default: () => h(DefaultComponent)
    }), document.querySelector('#app'))

    setTimeout(() => {
      render(h(KeepAlive, { exclude: 'DefaultComponent', include: 'DefaultComponent2, DefaultComponent3, DefaultComponent4', max: 2 }, {
        default: () => h(DefaultComponent2)
      }), document.querySelector('#app'))
    }, 1000)

    setTimeout(() => {
      render(h(KeepAlive, { exclude: 'DefaultComponent', include: 'DefaultComponent2, DefaultComponent3, DefaultComponent4', max: 2 }, {
        default: () => h(DefaultComponent3)
      }), document.querySelector('#app'))
    }, 2000)

    setTimeout(() => {
      render(h(KeepAlive, { exclude: 'DefaultComponent', include: 'DefaultComponent2, DefaultComponent3, DefaultComponent4', max: 2 }, {
        default: () => h(DefaultComponent4)
      }), document.querySelector('#app'))
    }, 3000)

    setTimeout(() => {
      render(h(KeepAlive, { exclude: 'DefaultComponent', include: 'DefaultComponent2, DefaultComponent3, DefaultComponent4', max: 2 }, {
        default: () => h(DefaultComponent)
      }), document.querySelector('#app'))
    }, 4000)

    setTimeout(() => {
      render(h(KeepAlive, { exclude: 'DefaultComponent', include: 'DefaultComponent2, DefaultComponent3, DefaultComponent4', max: 2 }, {
        default: () => h(DefaultComponent3)
      }), document.querySelector('#app'))
    }, 5000)

    setTimeout(() => {
      render(h(KeepAlive, { exclude: 'DefaultComponent', include: 'DefaultComponent2, DefaultComponent3, DefaultComponent4', max: 2 }, {
        default: () => h(DefaultComponent4)
      }), document.querySelector('#app'))
    }, 6000)

    setTimeout(() => {
      render(h(KeepAlive, { exclude: 'DefaultComponent', include: 'DefaultComponent2, DefaultComponent3, DefaultComponent4', max: 2 }, {
        default: () => h(DefaultComponent2)
      }), document.querySelector('#app'))
    }, 7000)
  </script>
</body>

</html>
```

#### asyncComp.html + AsyncComp.js

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AsyncComp</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module">
      import { render, h, Text, Fragment, defineAsyncComponent } from "../../packages/runtime-dom/dist/runtime-dom.esm.js";

      // 异步组件的原理 类似图片懒加载
      // 基于状态来实现 loaded ? h(Component) : h(placeholder)
      const Comp = defineAsyncComponent({
        loader: () => new Promise((resolve) => setTimeout(() => resolve(import("./AsyncComp.js")), 2000)),
        loadingComponent() {
          return h("div", "loading...");
        },
        errorComponent:{
          props: {
            error: Object
          },
          render() {
            return h('div', this.$props?.error?.message || 'error')
          }
        },
        onError(error, retry, fail, retries) {
          console.log('onError', retries)
          if(retries < 3) {
            retry()
          } else {
            fail()
          }
        }
      });

      render(h(Comp), document.getElementById("app"))
    </script>
  </body>
</html>
```

```javascript
import { h, render } from '../../node_modules/vue/dist/vue.esm-browser.js'

export default {
  name: 'AsyncComp',
  setup() {
    return {
      msg: 'Async Component',
    }
  },
  render() {
    return h('div', this.msg)
  }
}
```

运行方式统一：项目根目录执行 `pnpm preview`(笔记通用测试命令),在浏览器里访问对应 HTML 路径验证各内置组件功能。

---

## 六、手写实现源码 GitHub 地址

- https://github.com/lotosv2010/g-vue-next

## 七、参考

- https://cn.vuejs.org/guide/built-ins/teleport.html
- https://cn.vuejs.org/guide/built-ins/transition.html
- https://cn.vuejs.org/guide/built-ins/keep-alive.html
- https://cn.vuejs.org/guide/components/async.html
- https://cn.vuejs.org/guide/built-ins/suspense.html
- https://jonny-wei.github.io/blog/vue/vue3/inner-components.html
- https://github.com/wbccb/

---

## 📝 留个问题

> 💬 **面试追问**：如果一个 KeepAlive 包裹的组件被 `exclude` 了,它被切走时会触发 `deactivated` 还是 `beforeUnmount`/`unmounted`?为什么?

---

> 🔖 这是「Vue 3 全家桶深度拆解系列」第 6 篇。上一篇：《Vue 3 Composition API 深度拆解：slots/emit/lifecycle/ref/provide-inject（面试收藏级）》；下一篇预告：《Vue 3 编译优化与模板编译原理：静态提升、PatchFlag、Block Tree、AST→render 函数全流程（面试收藏级）》

**关注公众号「Coding沉思录」,第一时间获取 Vue 3 全家桶系列更新!**
