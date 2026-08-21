# Vue 3 渲染原理与 Diff 算法：从首次渲染到 Diff 优化的完整链路？（面试收藏级）

> 面试官微笑着问：「Vue 3 比 Vue 2 快在哪里？」你答：「用了 Proxy，响应式更快。」面试官摇摇头：「响应式只是收集依赖，真正决定更新性能的是渲染层。说说 Vue 3 的 Diff 算法。」你答：「双端比较。」面试官继续追问：「Vue 2 就是双端比较，Vue 3 改了什么？」再追：「Patch Flags 是什么？为什么要用位运算标记？Block Tree 又是怎么减少比较范围的？」一道看似「背过八股文」就能过的题，背后其实是首次渲染、节点更新、节点卸载、全量 Diff、最长递增子序列、编译时静态分析整整一条链路。这篇文章是「Vue3 全家桶深度拆解」系列第 3 篇，从 `h()` 手写渲染函数讲起，一路拆到 `patchKeyedChildren` 五步 Diff 算法、最长递增子序列的推导过程，再讲清楚 Patch Flags / Block Tree 这些编译时优化到底在运行时消费了什么，最后手写一套可独立运行的渲染器，用处方药品列表做「有无 Patch Flags」的性能对比演示。

---

## 🎯 这篇文章解决什么问题

如果你已经知道 Vue 3 用了「虚拟 DOM」「Diff 算法」，很容易停留在「听过这些名词」的表层认知。但面试官真正想考察的，是你有没有理解**渲染器每一步设计要解决的具体问题**——为什么首次渲染要走 `mountElement` 而不是直接操作 DOM、为什么 `patchChildren` 要把 9 种情况归纳成几类处理、为什么乱序 Diff 需要引入最长递增子序列、Patch Flags 和 Block Tree 又是怎么把"逐层比较"变成"按需比较"的。读完这篇文章，你会同时获得两种确定感：懂原理（知道渲染器为什么这样设计）和会讲（面试官怎么问都能拆解回答）。

---

## 🧩 一、基本使用

### h() 函数与 JSX：两种手写渲染函数的方式

> **对比 Vue 2**：Vue 2 的 `h()`（即 `createElement`）只能通过组件实例的 `this.$createElement` 或 `render(h)` 参数拿到，本质是和组件实例绑定的；Vue 3 的 `h()` 是从 `vue` 包直接导出的全局函数，不依赖组件实例，脱离组件也能独立调用（比如在 `setup()` 外部拼装 VNode），这是 Composition API 「函数优先于选项」设计思路的体现。

Vue 3 组件的渲染函数本质上都是返回 VNode（虚拟节点）的函数，无论用 `<template>` 编译还是手写，最终都会落到 `h()` 这个底层 API。

```typescript
import { h } from 'vue'

// h(type, props, children) 三种常见调用形式
h('div', { class: 'prescription' }, '处方单详情')
h('div', { class: 'prescription' }, [h('span', null, '药品：阿莫西林')])
h('div', null, [h('span', null, '库存：500')]) // 省略 props
```

`h()` 函数的参数是重载的，需要根据参数个数和类型判断当前调用的是哪种形式：

```typescript
export function h(type: any, propsOrChildren?: any, children?: any) {
  const l = arguments.length
  if (l === 2) {
    // 两个参数：h(type, props) 或 h(type, children)
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      // 第二个参数是 VNode，说明是单个子节点
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren])
      }
      // 是纯对象，说明是 props
      return createVNode(type, propsOrChildren)
    } else {
      // 数组或文本，说明是 children
      return createVNode(type, null, propsOrChildren)
    }
  } else {
    // 三个及以上参数，第二个固定是 props
    if (l > 3) {
      children = Array.prototype.slice.call(arguments, 2)
    } else if (l === 3 && isVNode(children)) {
      children = [children]
    }
    return createVNode(type, propsOrChildren, children)
  }
}
```

而 JSX 只是 `h()` 调用的语法糖，编译器把 JSX 语法转成对 `h()` 或 `createVNode()` 的调用：

```tsx
// JSX 写法
const vnode = <div class="prescription">
  <span>药品：阿莫西林</span>
</div>

// 编译产物等价于
const vnode = h('div', { class: 'prescription' }, [
  h('span', null, '药品：阿莫西林')
])
```

**h() vs JSX 怎么选**：`h()` 手写灵活但可读性差，适合动态性极强的场景（比如根据条件动态拼接一大段结构）；JSX 可读性接近模板，还能享受 TypeScript 的类型检查，适合逻辑复杂的函数式组件。`<template>` 模板则享受编译时优化（下文会讲的 Patch Flags / 静态提升），是 Vue 3 推荐的默认写法。

### Fragment：多根节点组件，不再强制单根

> **升级点**：Vue 2 中组件模板必须有且只有一个根节点，多根节点会直接报错。Vue 3 引入 `Fragment` 作为一种特殊的 VNode 类型，允许组件返回多个根节点。

```html
<!-- Vue 2：❌ 报错，多个根节点 -->
<template>
  <div>处方单头部</div>
  <div>处方单内容</div>
</template>

<!-- Vue 3：✅ 合法，编译为 Fragment -->
<template>
  <div>处方单头部</div>
  <div>处方单内容</div>
</template>
```

对应的手写等价写法：

```typescript
import { h, Fragment } from 'vue'

const vnode = h(Fragment, null, [
  h('div', null, '处方单头部'),
  h('div', null, '处方单内容')
])
```

Fragment 没有真实的容器包裹，渲染时直接把子节点挂载到父容器，不会多出一层 DOM 包裹元素——这对 CSS 布局（比如 flex/grid 场景不能多一层无用的 div）非常关键。

### key 在 v-for 中的正确用法

> **升级点**：`key` 的语法用法和 Vue 2 完全一致，但收益因为 Block Tree 的引入而更明显——下文的原理部分会展开讲。

```html
<template>
  <ul>
    <!-- ✅ 正确：用稳定唯一标识 -->
    <li v-for="drug in prescriptionList" :key="drug.id">
      {{ drug.name }}
    </li>

    <!-- ❌ 错误：用 index 做 key，插入/删除时会导致不必要的 DOM 复用错位 -->
    <li v-for="(drug, index) in prescriptionList" :key="index">
      {{ drug.name }}
    </li>
  </ul>
</template>
```

### 首次渲染 vs 更新渲染的直观表现

> **对比 Vue 2**：Vue 2 的 Devtools 也有「Highlight updates」功能，但由于没有编译时优化（Patch Flags / Block Tree），所有参与 Diff 的节点都会被高亮，看不出「哪些节点真正变了」；Vue 3 的 Devtools 只高亮「patchFlag > 0」或「dynamicChildren 非空」的节点，可以直观看到编译时标记的效果——大部分静态节点根本不会闪烁。

打开 Vue Devtools 的组件面板，勾选「Highlight updates when components render」，可以直观看到：首次渲染时整个组件树会被高亮一次；后续只要某个响应式数据变化，只有真正发生更新的组件会被绿色高亮闪烁一下——这背后就是本文要讲的 `patch` 流程：**Vue 3 不是重新渲染整棵树，而是精确定位到发生变化的节点**。

### 💬 面试官视角

**Q1：Fragment 解决了什么问题？和 Vue 2 的单根限制相比有什么好处？**

✅ **标准答案**：
Vue 2 模板必须单根节点，写多根节点会直接编译报错，很多场景不得不多包一层无意义的 `div`。Vue 3 引入 `Fragment` 类型的 VNode，允许多根节点，渲染时不产生额外的包裹 DOM。

🎁 **加分点**：
- Fragment 场景下 `$attrs` 不会自动透传到某一个根节点，需要开发者手动决定绑定到哪个节点
- Fragment 用 `anchor`（锚点）标记自己在父容器中的范围，而不是像元素节点一样有一个真实的 `el`

**Q2：`h()` 函数的参数重载是怎么判断的？**

✅ **标准答案**：
先判断参数个数：2 个参数时，看第二个参数是纯对象还是 VNode/数组/文本，来区分它是 `props` 还是 `children`；3 个及以上参数时，第二个参数固定当作 `props`，后面的参数收集成 `children` 数组。

🎁 **加分点**：
判断第二个参数是不是 `props` 的关键在于 `isVNode()` 检测——如果第二个参数本身就是一个 VNode 对象，说明用户省略了 `props` 直接传了子节点。

## 🚀 二、原理

### 2.1 首次渲染（mount）

> **对比 Vue 2**：Vue 2 的挂载流程是 `$mount()` → `mountComponent()` → 创建 `Watcher`，`Watcher` 内部调用 `vm._update(vm._render())`，`_render()` 生成 VNode，`_update()` 内部调用 `patch(null, vnode)` 完成首次挂载。Vue 3 把这套流程搬到了独立的 `runtime-core` 包里，通过 `createRenderer` 工厂函数把 DOM 操作完全抽象出去，思路一致，但实现上彻底解耦了「渲染逻辑」和「平台操作」。

首次渲染的核心链路是：

```
render(vnode, container)
  → patch(null, vnode, container)   // n1 为 null，说明是首次挂载
  → processElement(null, vnode, container)
  → mountElement(vnode, container)  // 递归创建真实 DOM
```

**mountElement 的挂载顺序**：创建元素 → 设置属性 → 递归挂载子节点 → 插入父容器。

```typescript
// 挂载元素节点
const mountElement = (
  vnode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: any | null,
  parentSuspense: any | null,
  namespace: ElementNamespace
) => {
  const { type, props, shapeFlag, children } = vnode
  // 创建元素节点
  // 第一次渲染的时候我们让虚拟节点和真实的 dom 创建关联 vnode.el = 真实 dom
  // 第二次渲染新的 vnode，可以和上一次的 vnode 做比对，之后更新对应的 el 元素，可以后续再复用这个 dom 元素
  const el: any = (vnode.el = hostCreateElement(type as string, namespace))
  // 设置属性
  if (props) {
    for (const key in props) {
      hostPatchProp(el, key, null, props[key])
    }
  }

  // 处理子节点
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) { // 文本节点
    hostSetElementText(el, children as string)
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 数组节点
    mountChildren((children) as VNodeArrayChildren, el, null, parentComponent, parentSuspense, namespace)
  }

  // 插入元素
  hostInsert(el, container as any, anchor as any)
}

// 挂载子节点
const mountChildren: MountChildrenFn = (
  children,
  container,
  anchor,
  parentComponent,
  parentSuspense,
  namespace
) => {
  for(let i = 0; i < children?.length; i++) {
    const child = normalizeVNode(children[i])
    patch(null, child, container, anchor, parentComponent, parentSuspense, namespace)
  }
}
```

这里有个关键设计：`vnode.el = el`，把真实 DOM 元素挂到 VNode 对象上。这一步是整个渲染器能做「更新」的基础——下一次更新时，新的 VNode 没有对应的真实 DOM，正是通过复用旧 VNode 的 `el`，才不需要每次都销毁重建。

`hostCreateElement` / `hostPatchProp` / `hostSetElementText` / `hostInsert` 这些带 `host` 前缀的函数，正是 `createRenderer(options)` 注入的平台操作（详见第 01 篇设计思想中的自定义渲染器设计）——这也是为什么渲染逻辑可以脱离浏览器 DOM，跑在 Canvas、小程序等自定义平台上。

### 2.2 节点更新（patch）

> **对比 Vue 2**：Vue 2 的更新流程是 `patchVnode(oldVnode, vnode)`，同样是先判断新旧节点是否为同类型（`sameVnode`），不同则销毁重建，相同则走 `patchVnode` 内部的属性比对 + `updateChildren`。Vue 3 的设计思路完全一致，区别主要在 `updateChildren`（Diff 算法）的实现细节，下文 2.4 节详细对比。

`patch(n1, n2)` 是整个渲染器的调度中枢，首先判断新旧 VNode 类型是否相同：

```typescript
const patch = (
  n1,
  n2,
  container,
  anchor = null,
  parentComponent = null,
  parentSuspense = null,
  namespace = undefined
) => {
  if (n1 === n2) {
    // 节点相同，则不需要更新
    return
  }

  // 如果老节点存在，并且新老节点不同，则直接移除老节点，再插入新的节点
  if (n1 && !isSameVNodeType(n1, n2)) {
    unmount(n1, parentComponent, parentSuspense, true)
    n1 = null // 将老节点置为空，后面会挂载新节点
  }

  const { type, shapeFlag} = n2
  //! ⚠️ 每增加一种类型都需要考虑首次渲染、更新、卸载 三种情况
  switch (type) {
    // 文本节点
    case Text:
      processText(n1, n2, container, anchor)
      break
    // 元素节点或组件
    default:
      if(shapeFlag & ShapeFlags.ELEMENT) { // 元素节点
        processElement(n1, n2, container, anchor, parentComponent, parentSuspense, namespace)
      }
      break
  }
}
```

`isSameVNodeType` 判断的核心是 `type` 和 `key` 都相同才算同一类型：

```typescript
export function isSameVNodeType(n1: VNode, n2: VNode): boolean {
  return n1.type === n2.type && n1.key === n2.key
}
```

**类型相同时走 `processElement`**：老节点不存在走挂载，存在则走 `patchElement`（对比 props + 对比 children）。

```typescript
// 处理元素节点
const processElement = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: any | null,
  parentSuspense: any | null,
  namespace: ElementNamespace
) => {
  // 老节点不存在，说明是初次渲染，则创建
  if (n1 === null) {
    mountElement(n2, container, anchor, parentComponent, parentSuspense, namespace)
  } else { // 否则是更新
    patchElement(n1, n2, parentComponent, parentSuspense, namespace)
  }
}
```

**patchElement 的两步走**：复用元素节点 → 比较属性差异 → 比较子节点差异。

```typescript
const patchElement = (
  n1: VNode,
  n2: VNode,
  parentComponent: any | null,
  parentSuspense: any | null,
  namespace: ElementNamespace
) => {
  // 1.比较元素的差异，需要复用元素节点
  // 2.比较元素的属性和子节点
  const el = (n2.el = n1.el) // 获取元素的真实 DOM，复用

  const oldProps = (n1.props || null) // 老属性
  const newProps = (n2.props || null) // 新属性

  // 比较属性是否变化了
  patchProps(el, oldProps, newProps, parentComponent, namespace)

  // 比较子节点差异
  patchChildren(n1, n2, el, null, parentComponent, parentSuspense, namespace)
}
```

**patchProps 全量属性比对**：遍历新 props 覆盖旧值，遍历旧 props 删除多余的，`value` 单独处理（因为表单元素的 `value` 属性有特殊的浏览器行为）。

```typescript
const patchProps = (
  el: RendererElement,
  oldProps: Data,
  newProps: Data,
  parentComponent: any,
  namespace: ElementNamespace
) => {
  // 新旧 props 不同，进行比对
  if (oldProps !== newProps) {
    // 新 prop 和 旧 prop 进行比对，如果不同，进行更新
    for (const key in newProps) {
      hostPatchProp(el as any, key, oldProps[key], newProps[key], namespace, parentComponent)
    }

    // 旧的 prop 有值,新的 prop 没有值，进行卸载
    for (const key in oldProps) {
      if (!(key in newProps)) {
        hostPatchProp(el as any, key, oldProps[key], null, namespace, parentComponent)
      }
    }
    // 值更新
    if ('value' in newProps) {
      hostPatchProp(el as any, 'value', oldProps.value, newProps.value, namespace)
    }
  }
}
```

**processText 处理文本节点**：老节点不存在则创建文本节点，存在且内容变化则直接更新文本。

```typescript
// 处理文本节点
const processText = (n1, n2, container, anchor) => {
  // 老节点不存在，说明是初次渲染，则创建
  if (n1 === null) {
    // 创建文本节点
    hostInsert(
      n2.el = hostCreateText(n2.children), // 创建文本节点, 并挂载到当前元素
      container, // 插入的父元素
      anchor // 锚点
    )
  } else {
    // 节点存在，则更新
    const el = n2.el = n1.el // 获取元素节点
    if(n2.children !== n1.children) {
      // 文本内容改变，更新内容
      hostSetText(el, n2.children)
    }
  }
}
```

### 2.3 节点卸载（unmount）

> **对比 Vue 2**：Vue 2 的卸载走 `$destroy()`，依次触发 `beforeDestroy → destroyed` 钩子，解绑事件、销毁子组件、移除 DOM。Vue 3 的 `unmount` 思路一致，把「递归卸载子树」和「移除自身 DOM」拆得更清晰。

卸载有两种触发场景：一是用户主动调用 `render(null, container)` 卸载整个应用；二是 `patch` 时新旧节点类型不同，需要先卸载旧节点再挂载新节点（见 2.2 节的 `patch` 函数）。

```typescript
// 卸载节点
const unmount: UnmountFn = (
  vnode,
  parentComponent,
  parentSuspense,
  doRemove = false,
  optimize = false
) => {
  hostRemove(vnode.el as any)
}

const unmountChildren: UnmountChildrenFn = (
  children,
  parentComponent,
  parentSuspense,
) => {
  for (let i = 0; i < children.length; i++) {
    unmount(children[i], parentComponent, parentSuspense)
  }
}
```

`render(null, container)` 主动卸载的入口逻辑：

```typescript
const render = (vnode, container) => {
  if (vnode == null) {
    // vnode 为 null，说明是卸载操作
    if (container._vnode) {
      unmount(container._vnode, null, null, true)
    }
  } else {
    patch(container._vnode || null, vnode, container)
  }
  // 记录当前挂载的 vnode，作为下一次 patch 的老节点
  container._vnode = vnode
}
```

这里 `container._vnode` 是关键：它把「上一次挂载的 VNode」缓存在真实 DOM 容器上，下一次 `render()` 调用时，就能拿它当作 `patch` 的老节点 `n1`。

卸载完整的组件时，除了移除 DOM，还要依次触发 `beforeUnmount → unmounted` 生命周期钩子，并且要停止该组件的 render effect（响应式系统的 `ReactiveEffect.stop()`）、清理 `provide/inject` 的引用——避免组件销毁后响应式数据变化仍触发已经不存在的组件重新渲染，这是内存泄漏的常见来源之一。这三篇笔记聚焦运行时手写的基础三部曲，组件级别的完整卸载流程会在第 04 篇「组件渲染原理」中展开。

### 2.4 Diff 算法核心

节点更新中最复杂的部分是子节点的比对。`patchChildren` 面对的子节点组合一共有 9 种情况：

| 新 children | 旧 children | 处理方式 |
|---|---|---|
| 文本 | 数组 | 删除旧的数组子节点，设置新文本 |
| 文本 | 文本 | 内容不同则更新文本 |
| 文本 | 空 | 设置新文本（等价于「文本 vs 文本」内容不同的情况） |
| 数组 | 数组 | **全量 Diff 算法**（本节核心） |
| 数组 | 文本 | 清空文本，挂载新的数组子节点 |
| 数组 | 空 | 挂载新的数组子节点（等价于「数组 vs 文本」） |
| 空 | 数组 | 删除旧的数组子节点 |
| 空 | 文本 | 删除旧的文本内容 |
| 空 | 空 | 什么都不做 |

这 9 种情况可以归纳成 6 类处理逻辑：

```typescript
const patchChildren: PatchChildrenFn = (
  n1,
  n2,
  container,
  anchor,
  parentComponent,
  parentSuspense,
  namespace
) => {
  // TODO 情况分析:
  // 1. 新的 children 是文本, 旧的 children 是数组 -> 删除旧的 children, 创建新的 children
  // 2. 新的 children 是文本, 旧的 children 是文本 -> 更新文本即可
  // 3. 新的 children 是文本, 旧的 children 是空 -> 更新文本即可(类似上述情况)
  // 4. 新的 children 是数组, 旧的 children 是数组 -> 比对数组(diff 算法)
  // 5. 新的 children 是数组, 旧的 children 是文本 -> 清空文本, 创建新的 children
  // 6. 新的 children 是数组, 旧的 children 是空 -> 创建新的 children(类似上述情况)
  // 7. 新的 children 是空, 旧的 children 是数组 -> 删除旧的 children
  // 8. 新的 children 是空, 旧的 children 是文本 -> 删除旧的 children
  // 9. 新的 children 是空, 旧的 children 是空 -> 什么都不做

  const c1 = n1?.children // 老的 children
  const c2 = n2?.children // 新的 children
  const prevShapeFlag = n1?.shapeFlag // 老节点的类型
  const shapeFlag = n2?.shapeFlag // 新节点的类型

  // TODO 上面九种情况可以分为一下几类处理:
  // 1.新的是文本, 老的是数组，移出老的
  // 2.新的是文本，老的是文本或空，内容不同，替换
  // 3.老的是数组，新的数组，全量 diff
  // 4.老的是数组，新的是空，移除
  // 5.老的是文本，新的是空，移除
  // 6.老的是文本，新的是数组，替换
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // 1
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(c1 as VNode[], parentComponent, parentSuspense)
    }
    // 2, 3
    if (c1 !== c2) {
      hostSetElementText(container as any, c2 as string)
    }
  } else {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 4
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // TODO diff 算法
        patchKeyedChildren(
          c1 as VNode[],
          c2 as VNodeArrayChildren,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          namespace
        )
      } else {
        // 7
        unmountChildren(c1 as VNode[], parentComponent, parentSuspense)
      }
    } else {
      // 5, 8
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(container as any, '')
      }
      // 6
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(
          c2 as VNodeArrayChildren,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          namespace
        )
      }
      // 9 无需处理
    }
  }
}
```

真正的重头戏在「数组 vs 数组」这一类，也就是 `patchKeyedChildren`——这才是我们平常说的「Diff 算法」。

### 与 Vue 2 双端 Diff 的设计对比

> **对比 Vue 2**：Vue 2 的 `updateChildren` 用**四个指针**（新头 newStartIdx、新尾 newEndIdx、旧头 oldStartIdx、旧尾 oldEndIdx）从两端向中间逼近比较，四种命中情况（头头/尾尾/头尾/尾头）之外命中不了才降级为按 key 在 `oldKeyToIdx` 表里查找，找不到就新建，遍历完成后一次性处理剩余的新增/删除。Vue 3 的 `patchKeyedChildren` 保留了「双端预处理」的思路（sync from start / sync from end），但把「乱序部分」的处理从「逐个比对 + 就地移动」升级为「构建 key 映射表 + 求最长递增子序列 + 只移动非递增部分」，这是两者最核心的差异。

先直观看下子节点会遇到的几种典型场景（图片来自原始笔记，示意的是双端预处理阶段能够快速命中的几种情况）：

![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607138380679-fb44ab80-fc85-4c44-960c-dd9086dea1ef.png)

![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607138407067-3d34924f-794c-4916-b276-1b5ccdb8b897.png)

Vue 3 的 `patchKeyedChildren` 分五步走：

**第一步：sync from start（从头部同步）**

```
(a b) c
(a b) d e
```

从头部开始比较，只要 `isSameVNodeType` 就一直往后递归 `patch`，遇到不同类型立即停止：

![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607138500677-fb8b7d34-6cf8-4dd9-a519-05a1f10165e4.png)

**第二步：sync from end（从尾部同步）**

```
  a (b c)
d e (b c)
```

从尾部开始比较，逻辑与第一步对称：

![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607138517163-e9e24f9a-a664-4875-8eef-aab37b844aab.png)

**第三步：common sequence + mount（同序列挂载）**

经过前两步之后，如果 `i > e1`（旧节点已经比对完，但新节点还有剩余），说明剩下的都是新增节点：

```
(a b)
(a b) c
// i = 2, e1 = 1, e2 = 2

  (a b)
c (a b)
// i = 0, e1 = -1, e2 = 0
```

![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607138532939-73d7dfea-88ec-46df-abe5-df0175bd32c6.png)

![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607138549467-a7d7c5a3-ea70-4c5f-8308-3cb718da9e70.png)

**第四步：common sequence + unmount（同序列卸载）**

反过来，如果 `i > e2`（新节点已经比对完，但旧节点还有剩余），说明剩下的旧节点都需要被删除：

```
(a b) c
(a b)
// i = 2, e1 = 2, e2 = 1

a (b c)
  (b c)
// i = 0, e1 = 0, e2 = -1
```

![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607138563565-ee977828-e97a-47f0-b813-bb0f9e90b6b2.png)

![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607138579997-2cef3c23-f493-4e36-84e4-4eef9f360a7c.png)

**第五步：unknown sequence（乱序比对）**——真正的核心，也是与 Vue 2 差异最大的部分：

```
[i....e1 + 1]: a b [c d e] f g
[i....e2 + 1]: a b [e d c h] f g
// i = 2, e1 = 4, e2 = 5
```

![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607138601504-41f50b6e-89c8-4e37-a83e-e4abfeadccd2.png)

![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607138677296-55e01858-fa11-4642-8e17-dc711433d4a3.png)

![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607138617852-2db7bd27-d657-46fb-b71c-87e53339bb17.png)

![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607138637572-93a92ef7-9c9e-48fa-abdb-24edcedb670d.png)

![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607138654918-f18a6de2-2785-486a-abd5-0db55ce26997.png)

![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607138698160-bb393e2a-3b75-41af-80e5-de41e56544de.png)

乱序部分的处理分三个子步骤：

1. **构建新子节点的 key 索引映射表**（`keyToNewIndexMap`），方便后续用旧节点的 key 快速定位它在新数组中的位置
2. **从左到右遍历旧子节点**，能在新子节点中找到就复用并递归 `patch`（同时记录到 `newIndexToOldIndexMap`），找不到就直接卸载
3. **求最长递增子序列**，只对「不在递增子序列里」的节点做移动操作——递增子序列本身天然保持相对顺序，不需要移动

```typescript
const patchKeyedChildren = (
  c1: VNode[],
  c2: VNodeArrayChildren,
  container: RendererElement,
  parentAnchor: RendererNode | null,
  parentComponent: any,
  parentSuspense: any,
  namespace: ElementNamespace
) => {
  // 全量的 diff 算法
  // 对比过程是采用深度遍历，先便利父级再遍历子级，并且是同级对比
  let i = 0 // 索引
  const l2 = c2.length // 新节点的个数
  let e1 = c1.length - 1 // 旧节点的终点索引
  let e2 = l2 - 1 // 新节点的终点索引

  // 1.sync from start ==> 左侧对比
  // (a b) c
  // (a b) d e
  while (i <= e1 && i<= e2) {
    const n1 = c1[i] // 旧子节点的第一个节点
    const n2 = normalizeVNode(c2[i]) // 新子节点的第一个节点
    // 如果新旧节点相同
    if (isSameVNodeType(n1, n2)) {
      // 递归对比
      patch(n1, n2, container, null, parentComponent, parentSuspense, namespace)
    } else {
      break
    }
    i++
  }

  // 2.sync from end   ==> 右侧对比
  //   a (b c)
  // d e (b c)
  while (i<=e1 && i <= e2) {
    const n1 = c1[e1] // 旧子节点的最后一个节点
    const n2 = normalizeVNode(c2[e2]) // 新子节点的最后一个节点
    if (isSameVNodeType(n1, n2)) {
      patch(n1, n2, container, null, parentComponent, parentSuspense, namespace)
    } else {
      break
    }
    e1--
    e2--
  }

  // 3.common sequence + mount  ==> 同序列挂载（新增）
  // (a b)
  // (a b) c
  //i = 2, e1 = 1, e2 = 2
  //   (a b)
  // c (a b)
  // i = 0, e1 = -1, e2 = 0
  if (i > e1) {
    if (i <= e2) {
      // 判断 e2 是否向前移动，如果向前移动，说明要向前插入，如果 e2 没有移动，说明要向后插入
      const nextPos = e2 + 1
      // vue 2 的实现是 判断 下一个元素存不存在
      // vue 3 的实现是 判断 下一个元素的长度是否越界
      const anchor = nextPos < l2 ? (c2?.[nextPos] as VNode)?.el : parentAnchor // 获取下一个元素的及锚点
      while (i <= e2) {
        patch(null, normalizeVNode(c2[i]), container, anchor, parentComponent, parentSuspense, namespace)
        i++
      }
    }
  }
  // 4.common sequence + unmount ==> 同序列卸载（删除）
  // (a b) c
  // (a b)
  // i = 2, e1 = 2, e2 = 1
  // a (b c)
  //   (b c)
  // i = 0, e1 = 0, e2 = -1
  else if (i > e2) {
    // 卸载 i 到 e1 的旧元素
    while (i <= e1) {
      unmount(c1[i], parentComponent, parentSuspense, true)
      i++
    }
  }
  //! 以上都是优化处理，是为了确认不变化的节点，并且对新增和移除做了处理，下面是核心处理
  // 5.unknown sequence ==> 乱序比对
  // [i....e1 + 1]: a b [c d e] f g
  // [i....e2 + 1]: a b [e d c h] f g
  // i = 2, e1 = 4, e2 = 5
  else {
    let s1 = i // 旧的 children 的开始索引
    let s2 = i // 新的 children 的开始索引

    // 5.1. build key: index map for children ==> 构建新子节点的键索引映射表
    const keyToNewIndexMap: Map<PropertyKey, number> = new Map() // 键索引映射表
    for (let i = s2; i <= e2; i++) {
      const nextChild = normalizeVNode(c2[i])
      if (!isNil(nextChild.key)) {
        keyToNewIndexMap.set(nextChild.key, i)
      }
    }

    // 5.2. loop through old children left to be patched and try to patch ==> 从左到右遍历旧子节点，如果旧子节点在新的子节点中存在，则复用，否则卸载
    let toBePatched = e2 - s2 + 1 // 需要倒序插入的节点个数
    const newIndexToOldIndexMap = new Array(toBePatched).fill(0) // 用来记录旧子节点在新子节点中的索引
    for (let i = s1; i <= e1; i++) {
      const prevChild = c1[i] // 获取旧子节点
      let nextIndex = keyToNewIndexMap.get(prevChild.key)

      // 旧子节点在新子节点中不存在，则卸载
      if (nextIndex === undefined) {
        unmount(prevChild, parentComponent, parentSuspense, true)
      } else { // 旧子节点在新子节点中存在，则复用
        // 获取新的子节点
        const nextChild = c2[nextIndex]
        // 记录旧子节点在新子节点中的索引
        newIndexToOldIndexMap[nextIndex - s2] = i + 1
        // 比较新老节点的差异，更新属性和子节点
        patch(
          prevChild,
          nextChild,
          container,
          null,
          parentComponent,
          parentSuspense,
          namespace
        )
      }
    }

    // 5.3. move and mount ==> 移动和挂载
    // 获取最长递增子序列
    const increasingNewIndexSequence = getSequence(newIndexToOldIndexMap)
    // 最长递增子序列的最后一个索引
    let j = increasingNewIndexSequence.length - 1
    // 循环从最长递增子序列的最后一个索引开始
    for (let i = toBePatched - 1; i >= 0; i--) {
      const nextIndex = i + s2 // 新节点的索引
      const nextChild = c2[nextIndex] as VNode // 新节点
      const anchor = nextIndex + 1 < l2 ? (c2[nextIndex + 1] as VNode).el : parentAnchor // 获取下一个节点及新节点的锚点
      // 如果新子节点的索引等于 0，说明新子节点在旧子节点中不存在
      if (newIndexToOldIndexMap[i] === 0) {
        // 插入新子节点
        patch(
          null,
          nextChild,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          namespace
        )
      } else { // 如果新子节点的索引大于 0，说明新子节点在旧子节点中存在
        // 倒序遍历，从后往前插入
        // 这里是暴力的插入，没有使用移动节点的方式，需要优化
        // hostInsert(nextChild.el, container, anchor)
        //! 优化：移动节点
        // 如果新子节点的索引小于 0 或者新子节点的索引与递增序列中的索引不相等
        if (j < 0 || i !== increasingNewIndexSequence[j]) {
          move(nextChild, container, anchor, MoveType.REORDER)
        } else {
          j--
        }
      }
    }
  }
}
```

`move` 函数本身很简单，就是一次 `hostInsert`：

```typescript
// 移动节点
const move: MoveFn = (
  vnode,
  container,
  anchor,
  moveType,
  parentSuspense = null
) => {
  const { el } = vnode
  hostInsert(el as any, container as any, anchor as any)
}
```

**为什么这个设计比 Vue 2 更快？** Vue 2 的双端 Diff 在遇到乱序场景时，退化成「遍历 + 逐个查找 + 逐个移动」，没有全局最优的移动路径概念——每个不在原位的节点都会触发一次 DOM 移动。Vue 3 通过最长递增子序列，找出了「保持相对顺序、不需要移动」的最大子集，只移动真正需要移动的节点，DOM 操作次数是全局最优的。

### 最长递增子序列：贪心 + 二分查找

要理解「最长递增子序列」为什么能减少 DOM 移动，先看一个例子。`newIndexToOldIndexMap` 记录的是「新数组每个位置的节点，对应旧数组里的索引」，如果这个数组本身有一段是递增的，说明这几个节点在旧数组里的相对顺序和新数组一致——不需要移动，只有不在这段递增序列里的节点才需要移动到正确位置。

元素遍历过程示意图：

![](https://cdn.nlark.com/yuque/0/2025/png/738210/1754125472991-82121e8d-c604-440a-bb5f-5c02a459f2c9.png)

回溯过程示意图：

![](https://cdn.nlark.com/yuque/0/2025/png/738210/1754130510791-59af7e5b-b3cd-48b4-ad12-65f09599d67e.png)

Vue 3 采用的是「贪心 + 二分查找」的 O(n log n) 解法（而不是朴素 O(n²) 的动态规划）：维护一个 `result` 数组存储「当前最长递增子序列」的下标，遍历原数组时，如果当前值比 `result` 最后一个值大就直接 push；否则用二分查找在 `result` 中找到第一个「大于等于当前值」的位置替换掉——这一步不会改变已经找到的最长长度，但会让后续能接上更小的值，从而有机会找到更长的序列。真正的序列内容依靠一个 `p` 数组记录「前驱索引」，最后通过回溯得到。

```javascript
// https://en.wikipedia.org/wiki/Longest_increasing_subsequence
// 核心：二分查找 + 贪心算法
// 获取最长递增子序列
const getSequence = (arr) => {
  let len = arr.length // 数组长度
  const result = [0] // 最长子序列的起始索引
  let resultLastIndex; // 最长子序列的结束索引

  let start; // 当前子序列的起始索引
  let end; // 当前子序列的结束索引
  let middle; // 当前子序列的中间索引

  let p = arr.slice(0) // 创建一个副本，用来标识索引，防止修改原数组
  // 循环数组
  for (let i = 0; i < len; i++) {
    const arrI = arr[i] // 当前元素
    if (arrI !== 0) { // 当前元素不为0
      resultLastIndex = result[result.length - 1] // 获取当前子序列的结束索引
      if (arr[resultLastIndex] < arrI) { // 当前元素大于当前子序列的结束元素
        result.push(i) // 添加当前索引到结果数组中
        p[i] = resultLastIndex // 记录当前元素的前一个元素索引
        continue
      }

      // 二分查找
      start = 0 // 当前子序列的起始索引
      end = result.length - 1 // 当前子序列的结束索引
      // 二分法查找当前元素在当前子序列中的位置
      while (start < end) {
        middle = (start + end) >> 1 // 计算中间索引
        if (arr[result[middle]] < arrI) { // 中间元素小于当前元素
          start = middle + 1 // 更新起始索引
        } else {
          end = middle // 否则更新结束索引
        }
      }

      // 找到插入位置
      if (arrI < arr[result[start]]) { //  当前元素小于中间元素
        // 如果 start 大于 0，则说明 start 不是数组的第一个元素，需要减 1
        // start 小于 0，则说明 start 是数组的第一个元素
        if (start > 0) {
          p[i] = result[start - 1] // 记录当前元素的前一个元素索引
        }
        result[start] = i // 更新结果数组中的索引
      }
    }
  }
  // 追溯结果数组，获取最长子序列的索引
  let i = result.length // 结果数组的长度
  let lastIndex = result[i - 1] // 最后一个索引
  while (i-- > 0) {
    result[i] = lastIndex // 将最后一个索引赋值给当前索引
    lastIndex = p[lastIndex] // 用p中的索引追溯
  }
  return result
}
```

`normalizeVNode` 负责把子节点归一化成合法的 VNode——`null`/`boolean` 归一化成 `Comment` 占位节点，数组归一化成 `Fragment`，字符串/数字归一化成 `Text`：

```typescript
export const Text = Symbol.for('v-text')
export const Comment = Symbol.for('v-cmt')
export const Fragment = Symbol.for('v-fgt')

export const normalizeVNode = (child: VNodeChild): VNode => {
  // child 是 false 或 null, 返回一个空节点
  if (child == null || typeof child === 'boolean') {
    return createVNode(Comment)
  } else if (isArray(child)) {
    return createVNode(
      Fragment as any,
      null,
      child.slice()
    )
  } else if (isObject(child)) {
    return child as VNode
  } else {
    return createVNode(Text, null, String(child))
  }
}
```

### 2.5 编译时优化：Patch Flags / Block Tree / 静态提升 / cacheHandlers

前面讲的 `patchChildren`/`patchKeyedChildren` 是「运行时」的全量 Diff——不管模板哪部分是动态的，比较范围默认覆盖全部子节点。而 Vue 3 真正甩开 Vue 2 一大截性能的地方，其实是**编译时**先做了一遍静态分析，把这些信息"喂"给运行时，让运行时不再需要盲目地全量比较。

> **对比 Vue 2**：Vue 2 的模板编译只做「AST → render 函数」的直译，没有额外的静态分析，所以运行时的 Diff 永远是同层全量比较——哪怕一个节点从头到尾都不会变，每次更新也要重新遍历比对它的 props 和 children。Vue 3 编译器在生成 render 函数的同时，顺带做了四件事：给每个动态节点打「变了什么」的标记（Patch Flags）、把纯静态节点提到 render 函数外只创建一次（静态提升）、把真正动态的节点收集到一个扁平数组里（Block Tree），以及缓存内联事件处理函数（cacheHandlers）。这四项优化本质上都是"把运行时该做的重复劳动挪到编译时一次性做完"。

**本节先把 Patch Flags / Block Tree / 静态提升 / cacheHandlers「是什么」讲透；这些标记本身在编译阶段是怎么生成的（`hoistStatic` 静态分析算法、Patch Flags 具体的位运算判定逻辑、Block 收集的 AST 遍历实现），属于「编译期怎么产出标记」，留到第 07 篇「编译优化与模板编译原理」详细展开。而「运行时怎么消费这些标记」——也就是 `patchBlockChildren` 怎么线性遍历 `dynamicChildren`、`openBlock`/`closeBlock` 怎么收集动态节点——不属于编译期范畴，会在本文「三、源码解析」3.2 节讲完整的 Vue 3.4 真实源码；笔记里的手写实现（「五、手写实现」）停留在全量 Diff 阶段，没有对应的 Patch Flags/Block Tree 代码，这一点会在 5.3 节末尾说明。**

**Patch Flags：用位运算标记节点的动态类型**

编译器分析模板时，如果发现一个节点的某个部分是动态绑定的（比如 `:class="xxx"`），就会在编译产物里给这个节点打上对应的标记位：

```typescript
// packages/shared/src/patchFlags.ts（简化）
export const enum PatchFlags {
  TEXT = 1,          // 动态文本内容
  CLASS = 1 << 1,    // 动态 class
  STYLE = 1 << 2,    // 动态 style
  PROPS = 1 << 3,    // 除 class/style 外的动态属性
  FULL_PROPS = 1 << 4, // 有动态 key 的属性，需要走全量 diff
  HOISTED = -1,      // 静态提升的节点，永远不需要 patch
  BAIL = -2          // diff 算法应该退出优化模式
}
```

编译后的 render 函数会把这个标记作为 `createVNode` 的第四个参数传入：

```typescript
// 模板：<div :class="active ? 'on' : 'off'">静态文本</div>
// 编译产物（简化）
createVNode('div', { class: cls }, '静态文本', PatchFlags.CLASS /* 2 */)
```

运行时的 `patchElement` 在拿到这个标记后，就不需要再用前面讲的 `patchProps` 全量遍历新旧 props 对象了，而是可以直接按位判断：「这个节点只有 class 会变，其他一律跳过」——把 O(属性个数) 的比较降到 O(1)。

**Block Tree：把动态子节点收集到一个扁平数组**

如果说 Patch Flags 解决的是「单个节点内部该比较哪些属性」，Block Tree 解决的就是「一大坨子节点里到底该递归比较哪几个」。编译器会把一个模板中所有的动态节点收集到 `dynamicChildren` 数组里，更新时不再需要像本文 2.4 节那样对全部子节点跑一遍 `patchKeyedChildren`，而是直接线性遍历这个扁平数组，跳过所有确定不会变的静态子树。

```typescript
// 概念示意：Block 收集到的动态子节点会被打平，不管嵌套多少层静态节点
const block = {
  type: 'div',
  dynamicChildren: [
    /* 只有这几个真正动态的节点，跳过中间所有静态包裹层 */
  ]
}
```

这也是为什么 `v-for`、组件这类会产生「结构不确定」的节点会被当作 Block 边界——因为它们的子节点数量本身可能变化，无法被扁平化收集，需要单独走一次完整的 `patchKeyedChildren`。

**静态提升（Static Hoisting）：纯静态节点只创建一次**

如果一个节点完全不依赖任何响应式数据，编译器会把它的 `createVNode` 调用提升到 render 函数外部，整个组件生命周期内只创建一次，不会因为组件重渲染而重复创建，也永远不会进入 Diff 比较（对应上面 `PatchFlags.HOISTED = -1`）。

```typescript
// 提升前：每次 render 都会重新创建这个 VNode
function render() {
  return createVNode('div', null, [
    createVNode('span', null, '静态文案'), // 每次都新建
    createVNode('span', null, count.value)
  ])
}

// 提升后：静态节点只创建一次，缓存复用
const hoisted = createVNode('span', null, '静态文案')
function render() {
  return createVNode('div', null, [
    hoisted, // 复用同一个 VNode 引用
    createVNode('span', null, count.value)
  ])
}
```

**事件侦听器缓存（cacheHandlers）**

内联事件处理函数（比如 `@click="count++"`）如果不做处理，每次父组件重渲染都会生成一个新的箭头函数，这个新函数作为 prop 传给子组件时，会被子组件的 `patchProps` 判定为「变化了」，即使实际逻辑完全一样，也会白白触发一次子组件更新。`cacheHandlers` 编译时把这类内联处理函数缓存起来，多次渲染复用同一个函数引用：

```typescript
// 编译产物（简化）：_cache 数组缓存事件处理函数
function render(_ctx, _cache) {
  return createVNode('button', {
    onClick: _cache[0] || (_cache[0] = ($event) => (_ctx.count++))
  })
}
```

### 💬 面试官视角

**Q1：Vue 3 的 Diff 算法和 Vue 2 相比核心区别是什么？**

✅ **标准答案**：
两者都保留了双端预处理（头头比、尾尾比）快速处理常见场景，区别在乱序部分：Vue 2 找不到就在 `oldKeyToIdx` 里查，逐个就地移动；Vue 3 构建 key 映射表后求最长递增子序列，只移动「不在递增子序列里」的节点，DOM 移动次数是全局最优的。

🎁 **加分点**：
Vue 3 用贪心 + 二分查找实现 O(n log n) 的最长递增子序列算法，而不是朴素 O(n²) 的动态规划；这一步只求出了「不需要移动的节点索引」，真正的插入/移动仍然是从后往前倒序处理，配合锚点 `anchor` 保证插入位置正确。

**Q2：Patch Flags 是什么？用位运算标记的原因是什么？**

✅ **标准答案**：
Patch Flags 是编译器在分析模板时给每个动态节点打的标记，记录这个节点「哪部分会变」（文本/class/style/普通属性等）。运行时更新时不再需要全量遍历比对所有属性，直接按位判断该比较哪部分，把比较复杂度从 O(属性个数) 降到 O(1)。

🎁 **加分点**：
用位运算（`1 << n`）而不是字符串数组，是因为一个节点可能同时有多种动态类型（既有动态 class 又有动态 text），位运算可以用一个整数同时存储多个标记位，判断时用按位与（`&`）即可，比数组 `includes` 判断快得多，也更省内存。

**Q3：Block Tree 如何减少 Diff 的比较范围？**

✅ **标准答案**：
Block Tree 把一个模板里真正动态的子节点收集到一个扁平数组 `dynamicChildren` 中，更新时只需要线性遍历这个数组，跳过所有确定不会变的静态子树，不再需要像 Vue 2 那样逐层递归比较整棵树。

🎁 **加分点**：
`v-for`、组件这类子节点数量本身可能变化的地方会被标记为新的 Block 边界（`openBlock`/`closeBlock`），因为这些位置无法被扁平收集进父级 Block，需要单独走一次完整 Diff。

**Q4：Fragment 多根节点为什么不再需要唯一根元素？**

✅ **标准答案**：
Vue 3 的虚拟 DOM 支持一种特殊类型 `Fragment`，渲染时不产生真实的包裹 DOM，而是用 `anchor` 锚点标记自己在父容器中管理的一段范围，因此组件可以返回多个平级的根节点。

🎁 **加分点**：
Fragment 场景下 `$attrs` 不会自动透传到某个具体根节点，需要开发者显式绑定到目标元素上；组件的 `key` 变化会强制销毁重建（走全新的挂载流程），这一点和普通元素节点的 `key` 处理方式不同。

## 📖 三、源码解析：Vue 3.4 `renderer.ts` / `vnode.ts` / `patchFlags.ts`

> 本章基于 Vue 3.4 源码，仓库地址：`https://github.com/vuejs/core`。渲染器核心文件位于 `packages/runtime-core/src/renderer.ts`，VNode 相关定义位于 `packages/runtime-core/src/vnode.ts`，Patch Flags 常量定义位于 `packages/shared/src/patchFlags.ts`。本章按照与「二、原理」一致的主线展开：首次渲染 → 节点更新（含 Block Tree 运行时消费）→ Diff 算法补充 → 节点卸载，其中 3.2 和 3.4 是本文笔记没有覆盖、但面试高频会追问的两块真实源码。

### 3.1 首次渲染源码：patch 主分发 + Fragment 挂载

> **对比 Vue 2**：Vue 2 的 `patch` 主分发（`patchVnode`/`createElm`）只需要区分「元素 / 组件 / 文本 / 注释」，没有 `Fragment` 概念（单根限制），也没有 `optimized`/`dynamicChildren` 这类编译时优化标记参数。Vue 3 的 `patch` 除了多分发一个 `Fragment` 类型，还多了 `optimized` 参数贯穿整条调用链——这个参数就是本节要讲清楚的「Block Tree 运行时怎么用」的入口开关。

Vue 3.4 源码中的 `patch` 除了本文手写实现覆盖的 `Text` 和元素类型，还额外分发了 `Comment`、`Fragment`、有状态组件、函数式组件等更多类型：

```typescript
// packages/runtime-core/src/renderer.ts（保留核心分支，省略 dev 专用代码）
const patch: PatchFn = (
  n1,
  n2,
  container,
  anchor = null,
  parentComponent = null,
  parentSuspense = null,
  namespace = undefined,
  slotScopeIds = null,
  optimized = !!n2.dynamicChildren
) => {
  if (n1 === n2) {
    return
  }

  // 新旧节点类型不同：先卸载旧节点，锚点取旧节点的下一个兄弟，保证新节点插入到正确位置
  if (n1 && !isSameVNodeType(n1, n2)) {
    anchor = getNextHostNode(n1)
    unmount(n1, parentComponent, parentSuspense, true)
    n1 = null
  }

  // 编译器标记为 BAIL：说明这个节点的子节点结构不稳定（比如 v-for 和普通节点混用），
  // 运行时主动放弃 Block Tree 优化，退回全量 Diff，避免用一套「假设结构稳定」的算法处理不稳定结构
  if (n2.patchFlag === PatchFlags.BAIL) {
    optimized = false
    n2.dynamicChildren = null
  }

  const { type, ref, shapeFlag } = n2
  switch (type) {
    case Text:
      processText(n1, n2, container, anchor)
      break
    case Comment:
      processCommentNode(n1, n2, container, anchor)
      break
    case Static:
      if (n1 == null) {
        mountStaticNode(n2, container, anchor, namespace)
      }
      break
    case Fragment:
      processFragment(
        n1, n2, container, anchor,
        parentComponent, parentSuspense, namespace, slotScopeIds, optimized
      )
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(
          n1, n2, container, anchor,
          parentComponent, parentSuspense, namespace, slotScopeIds, optimized
        )
      } else if (shapeFlag & ShapeFlags.COMPONENT) {
        processComponent(
          n1, n2, container, anchor,
          parentComponent, parentSuspense, namespace, slotScopeIds, optimized
        )
      } else if (shapeFlag & ShapeFlags.TELEPORT) {
        ;(type as typeof TeleportImpl).process(
          n1 as TeleportVNode, n2 as TeleportVNode, container, anchor,
          parentComponent, parentSuspense, namespace, slotScopeIds, optimized, internals
        )
      }
  }

  // 更新 ref：无论走哪个分支，最后都要把 ref 指向新的真实 DOM / 组件实例
  if (ref != null && parentComponent) {
    setRef(ref, n1 && n1.ref, parentSuspense, n2 || n1, !n2)
  }
}
```

真实源码比本文笔记多出的两处关键设计：一是 `optimized` 参数默认值 `!!n2.dynamicChildren`——只要新节点带着 `dynamicChildren`，就默认认为可以走 Block Tree 优化路径；二是 `Static`（编译期静态提升节点，对应 2.5 节讲的「静态提升」）作为独立分支，首次挂载后不再进入 `patch` 的其他分支，因为它压根不会再被 diff。

`Fragment` 分支走的 `processFragment`，挂载时用两个空文本节点当「书签」标记自己在父容器中管理的范围：

```typescript
// packages/runtime-core/src/renderer.ts（保留核心分支）
const processFragment = (
  n1, n2, container, anchor,
  parentComponent, parentSuspense, namespace, slotScopeIds, optimized
) => {
  // 起止锚点：Fragment 没有真实 el，靠这两个空文本节点标记自己管理的 DOM 范围
  const fragmentStartAnchor = (n2.el = n1 ? n1.el : hostCreateText(''))!
  const fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : hostCreateText(''))!

  let { patchFlag, dynamicChildren, slotScopeIds: fragmentSlotScopeIds } = n2

  if (fragmentSlotScopeIds) {
    slotScopeIds = slotScopeIds
      ? slotScopeIds.concat(fragmentSlotScopeIds)
      : fragmentSlotScopeIds
  }

  if (n1 == null) {
    // 首次挂载：先插入起止锚点，再把子节点挂载到两个锚点之间
    hostInsert(fragmentStartAnchor, container, anchor)
    hostInsert(fragmentEndAnchor, container, anchor)
    mountChildren(
      n2.children as VNodeArrayChildren, container, fragmentEndAnchor,
      parentComponent, parentSuspense, namespace, slotScopeIds, optimized
    )
  } else {
    if (
      patchFlag > 0 &&
      patchFlag & PatchFlags.STABLE_FRAGMENT &&
      dynamicChildren &&
      n1.dynamicChildren
    ) {
      // 稳定的 Fragment（比如编译期就能确定子节点数量和顺序）：走 Block Tree 优化路径
      patchBlockChildren(
        n1.dynamicChildren, dynamicChildren, container,
        parentComponent, parentSuspense, namespace, slotScopeIds
      )
    } else {
      // 不稳定的 Fragment（比如 v-for 生成的 Fragment）：退回本文 2.4 节讲的全量 patchChildren
      patchChildren(
        n1, n2, container, fragmentEndAnchor,
        parentComponent, parentSuspense, namespace, slotScopeIds, optimized
      )
    }
  }
}
```

医疗场景的直观理解：处方单页面用 Fragment 同时渲染「处方单头部」和「处方单列表」两个平级根节点，`fragmentStartAnchor`/`fragmentEndAnchor` 就像一对隐形的书签，标记这两块内容在 DOM 树中的边界，插入新的处方条目、删除旧的条目，都只在这对书签之间操作，不会影响 Fragment 外部的其他兄弟节点。

### 3.2 节点更新源码：patchElement + Block Tree 运行时消费

> **对比 Vue 2**：Vue 2 的 `patchVnode` 更新阶段只有一条路径——不管属性还是子节点，永远全量比较，没有「这个节点哪部分是动态的」这种先验信息。Vue 3 的 `patchElement` 在真实源码里会先看 `patchFlag`：如果编译器已经告诉它「只有 class 会变」，就只 patch class，其余属性遍历直接跳过；子节点层面同理，如果有 `dynamicChildren`，直接线性遍历这个扁平数组，不再递归走全量 `patchChildren`。这是本节要补全的、2.5 节留下的「运行时怎么用」的具体代码。

真实的 `patchElement` 比本文笔记 2.2 节讲的版本细得多，`patchFlag` 分支覆盖了 CLASS / STYLE / PROPS / FULL_PROPS / TEXT 五种独立判断：

```typescript
// packages/runtime-core/src/renderer.ts（保留核心分支，省略 SUSPENSE/Transition 钩子细节）
const patchElement = (
  n1,
  n2,
  parentComponent,
  parentSuspense,
  namespace,
  slotScopeIds,
  optimized
) => {
  const el = (n2.el = n1.el!)
  let { patchFlag, dynamicChildren, dirs } = n2
  // 旧节点如果被标记过 FULL_PROPS（比如上一轮命中过动态 key），这次也要强制走全量比对
  patchFlag |= n1.patchFlag & PatchFlags.FULL_PROPS
  const oldProps = n1.props || EMPTY_OBJ
  const newProps = n2.props || EMPTY_OBJ
  let vnodeHook: VNodeHook | undefined | null

  parentComponent && toggleRecurse(parentComponent, false)
  if ((vnodeHook = newProps.onVnodeBeforeUpdate)) {
    invokeVNodeHook(vnodeHook, parentComponent, n2, n1)
  }
  if (dirs) {
    invokeDirectiveHook(n2, n1, parentComponent, 'beforeUpdate')
  }
  parentComponent && toggleRecurse(parentComponent, true)

  if (patchFlag > 0) {
    // ✅ 有 Patch Flags：按位判断，只走命中的分支，不做全量属性遍历
    if (patchFlag & PatchFlags.FULL_PROPS) {
      // 有动态 key（比如 v-bind="obj"），编译期无法静态分析出具体是哪几个属性，只能退回全量比对
      patchProps(el, n2, oldProps, newProps, parentComponent, namespace)
    } else {
      if (patchFlag & PatchFlags.CLASS) {
        if (oldProps.class !== newProps.class) {
          hostPatchProp(el, 'class', null, newProps.class, namespace)
        }
      }
      if (patchFlag & PatchFlags.STYLE) {
        hostPatchProp(el, 'style', oldProps.style, newProps.style, namespace)
      }
      if (patchFlag & PatchFlags.PROPS) {
        // 动态属性名数组（dynamicProps），只遍历这几个 key，而不是遍历整个 newProps 对象
        const propsToUpdate = n2.dynamicProps!
        for (let i = 0; i < propsToUpdate.length; i++) {
          const key = propsToUpdate[i]
          const prev = oldProps[key]
          const next = newProps[key]
          if (next !== prev || key === 'value') {
            hostPatchProp(el, key, prev, next, namespace, parentComponent)
          }
        }
      }
    }
    if (patchFlag & PatchFlags.TEXT) {
      if (n1.children !== n2.children) {
        hostSetElementText(el, n2.children as string)
      }
    }
  } else if (!optimized && dynamicChildren == null) {
    // 既没有 Patch Flags 也没有 dynamicChildren（比如手写 render 函数场景）：退回全量 patchProps
    patchProps(el, n2, oldProps, newProps, parentComponent, namespace)
  }

  const areChildrenSVG = namespace === 'svg' && n2.type !== 'foreignObject'
  if (dynamicChildren) {
    // ✅ Block Tree 优化路径：只线性遍历收集到的动态子节点，跳过所有确定不变的静态子树
    patchBlockChildren(
      n1.dynamicChildren!,
      dynamicChildren,
      el,
      parentComponent,
      parentSuspense,
      areChildrenSVG ? 'svg' : namespace,
      slotScopeIds
    )
  } else if (!optimized) {
    // 没有编译时优化信息：退回本文 2.4 节讲的全量 patchChildren
    patchChildren(
      n1, n2, el, null,
      parentComponent, parentSuspense,
      areChildrenSVG ? 'svg' : namespace, slotScopeIds, false
    )
  }

  if ((vnodeHook = newProps.onVnodeUpdated) || dirs) {
    queuePostRenderEffect(() => {
      vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, n2, n1)
      dirs && invokeDirectiveHook(n2, n1, parentComponent, 'updated')
    }, parentSuspense)
  }
}
```

上面代码里走 `FULL_PROPS` 或没有任何 Patch Flags 时调用的 `patchProps`，本文手写版（2.2 节）已经覆盖了核心逻辑，Vue 3.4 源码额外多了 `forcePatchProp` 白名单机制，用来处理不能直接走通用属性设置逻辑的特殊 DOM 属性（比如 `<input>` 的 `value`、`<option>` 的 `selected`）：

```typescript
// packages/runtime-core/src/renderer.ts（保留核心分支）
const patchProps = (
  el: RendererElement,
  vnode: VNode,
  oldProps: Data,
  newProps: Data,
  parentComponent: ComponentInternalInstance | null,
  namespace: ElementNamespace
) => {
  if (oldProps !== newProps) {
    if (oldProps !== EMPTY_OBJ) {
      for (const key in oldProps) {
        if (!isReservedProp(key) && !(key in newProps)) {
          hostPatchProp(el, key, oldProps[key], null, namespace, parentComponent)
        }
      }
    }
    for (const key in newProps) {
      if (isReservedProp(key)) continue
      const next = newProps[key]
      const prev = oldProps[key]
      // value 特殊处理：即使值没变也要强制走 patchProp，因为表单元素的 value 有特殊的浏览器行为
      // （比如 input.value 被用户手动改过之后，重新赋相同的值也需要触发一次同步）
      if (next !== prev && key !== 'value') {
        hostPatchProp(el, key, prev, next, namespace, parentComponent)
      }
    }
    if ('value' in newProps) {
      hostPatchProp(el, 'value', oldProps.value, newProps.value, namespace)
    }
  }
}
```

```typescript
// packages/runtime-dom/src/patchProp.ts（简化）
const patchProp: DOMRendererOptions['patchProp'] = (el, key, prevValue, nextValue, namespace, parentComponent) => {
  if (key === 'class') {
    patchClass(el, nextValue, namespace)
  } else if (key === 'style') {
    patchStyle(el, prevValue, nextValue)
  } else if (isOn(key)) {
    // onXxx 事件监听器
    if (!isModelListener(key)) {
      patchEvent(el, key, prevValue, nextValue, parentComponent)
    }
  } else if (shouldSetAsProp(el, key, nextValue, namespace)) {
    patchDOMProp(el, key, nextValue)
  } else {
    // 兜底：走 setAttribute
    patchAttr(el, key, nextValue, namespace)
  }
}
```

`shouldSetAsProp` 判断的核心思路：优先用 DOM property 赋值（比如 `el.value = xxx`），因为比 `setAttribute` 更快，但 `<input type="checkbox">` 的 `indeterminate`、某些自定义元素的属性需要走白名单强制 `setAttribute`。

真正「消费」`dynamicChildren` 的地方是 `patchBlockChildren`——这是本文 2.5 节讲 Block Tree 概念时留下的空白，也是本文承诺讲透的「运行时怎么用编译期标记」的核心：

```typescript
// packages/runtime-core/src/renderer.ts
const patchBlockChildren: PatchBlockChildrenFn = (
  oldChildren,
  newChildren,
  fallbackContainer,
  parentComponent,
  parentSuspense,
  namespace,
  slotScopeIds
) => {
  for (let i = 0; i < newChildren.length; i++) {
    const oldVNode = oldChildren[i]
    const newVNode = newChildren[i]
    // 确定 patch 时用哪个真实 DOM 容器：
    // - 绝大多数情况下父容器不会变，可以直接复用旧节点 el 的 parentNode
    // - Fragment 没有真实 el、类型变了、或者是组件/Teleport，都无法直接取 parentNode，退回 fallbackContainer
    const container =
      oldVNode.el &&
      (oldVNode.type === Fragment ||
        !isSameVNodeType(oldVNode, newVNode) ||
        oldVNode.shapeFlag & (ShapeFlags.COMPONENT | ShapeFlags.TELEPORT))
        ? hostParentNode(oldVNode.el)!
        : fallbackContainer

    // 关键点：这里直接 patch，不再经过 patchChildren 的九种情况判断和 key 比对，
    // 因为 dynamicChildren 数组本身在编译期已经保证了顺序和数量稳定，不需要再走一遍 Diff 算法
    patch(
      oldVNode,
      newVNode,
      container,
      null,
      parentComponent,
      parentSuspense,
      namespace,
      slotScopeIds,
      true
    )
  }
}
```

`patchBlockChildren` 和本文 2.4 节的 `patchKeyedChildren` 是两条完全不同的更新路径：`patchKeyedChildren` 要处理「顺序可能变、数量可能变」的乱序场景，所以需要 key 映射表和最长递增子序列；`patchBlockChildren` 处理的是编译期已经确定「结构稳定、只是内容变了」的场景，所以可以直接按下标一一对应地 `patch`，连 key 比对都省了——这正是 Block Tree 比全量 Diff 快的根本原因：**它跳过的不是比较的复杂度，而是比较本身**。

`dynamicChildren` 是什么时候被收集进去的？答案在 `vnode.ts` 里的 `openBlock`/`closeBlock`/`setupBlock` 这一组函数：

```typescript
// packages/runtime-core/src/vnode.ts（保留核心分支）
export let isBlockTreeEnabled = 1
export let currentBlock: VNode[] | null = null
const blockStack: (VNode[] | null)[] = []

// 开启一个新的 Block：编译产物在生成一个「结构稳定」的节点（比如 v-if 分支、组件根节点）之前会先调用它
export function openBlock(disableTracking = false) {
  blockStack.push((currentBlock = disableTracking ? null : []))
}

export function closeBlock() {
  blockStack.pop()
  currentBlock = blockStack[blockStack.length - 1] || null
}

// 收尾：把当前 Block 收集到的动态子节点数组挂到 vnode.dynamicChildren 上，然后关闭这个 Block，
// 并把这个 Block 节点本身注册进上一层 Block（Block 之间可以嵌套）
export function setupBlock<T extends VNode>(vnode: T): T {
  vnode.dynamicChildren =
    isBlockTreeEnabled > 0 ? currentBlock || (EMPTY_ARR as any) : null
  closeBlock()
  if (isBlockTreeEnabled > 0 && currentBlock) {
    currentBlock.push(vnode)
  }
  return vnode
}

// 编译产物调用的入口：<div :class="cls">...</div> 编译后会变成 createElementBlock(...)
export function createElementBlock(
  type: string | typeof Fragment,
  props?: Record<string, any> | null,
  children?: any,
  patchFlag?: number,
  dynamicProps?: string[],
  shapeFlag?: number
) {
  return setupBlock(
    createBaseVNode(
      type, props, children, patchFlag, dynamicProps,
      shapeFlag, true /* isBlock */
    )
  )
}
```

`createBaseVNode` 内部还有一段容易被忽略但很关键的收集逻辑——**只要当前处于某个 Block 内部（`currentBlock` 不为空），任何一个 `patchFlag > 0` 的动态节点在创建时都会自动把自己 push 进 `currentBlock`**，不需要开发者手动操作：

```typescript
// packages/runtime-core/src/vnode.ts（节选自 createBaseVNode）
if (
  isBlockTreeEnabled > 0 &&
  !isBlockNode &&
  currentBlock &&
  (vnode.patchFlag > 0 || shapeFlag & ShapeFlags.COMPONENT) &&
  vnode.patchFlag !== PatchFlags.HYDRATE_EVENTS
) {
  // 静态提升的节点（patchFlag <= 0）不会被收集，这也是「静态提升」和「Block Tree」两个优化互相配合的地方：
  // 静态节点从一开始就不会进入 dynamicChildren，Block Tree 天然只包含真正动态的节点
  currentBlock.push(vnode)
}
```

本文笔记（2.2/2.4 节）还手写了 `processText` 和 `move` 两个函数，真实源码里它们的复杂度差异很悬殊，值得单独对比一下。

`processText` 是少数几个笔记版本和真实源码几乎完全一致的函数——文本节点本身没有 `props`、没有子节点，不需要走任何编译时优化路径：

```typescript
// packages/runtime-core/src/renderer.ts
const processText: ProcessTextOrCommentFn = (n1, n2, container, anchor) => {
  if (n1 == null) {
    hostInsert(
      (n2.el = hostCreateText(n2.children as string)),
      container,
      anchor
    )
  } else {
    const el = (n2.el = n1.el!)
    if (n2.children !== n1.children) {
      hostSetText(el, n2.children as string)
    }
  }
}
```

`move`（节点搬运）则相反：本文笔记的版本只有一行 `hostInsert`，只够处理单个元素节点的位置调整；真实源码要按 `shapeFlag` 分发处理组件、Suspense、Teleport、Fragment 四种特殊类型，还要判断是否需要配合 `Transition` 动画：

```typescript
// packages/runtime-core/src/renderer.ts（保留核心分支，省略 Suspense/Teleport 细节）
const move: MoveFn = (
  vnode,
  container,
  anchor,
  moveType,
  parentSuspense = null
) => {
  const { el, type, transition, children, shapeFlag } = vnode

  if (shapeFlag & ShapeFlags.COMPONENT) {
    // 组件：真正要移动的是组件渲染出的子树根节点，不是组件本身
    move(vnode.component!.subTree, container, anchor, moveType)
    return
  }

  if (type === Fragment) {
    // Fragment：先移动起始锚点，再逐个移动所有子节点，最后移动结束锚点
    hostInsert(el!, container, anchor)
    for (let i = 0; i < (children as VNode[]).length; i++) {
      move((children as VNode[])[i], container, anchor, moveType)
    }
    hostInsert(vnode.anchor!, container, anchor)
    return
  }

  // 单个元素节点的移动：MoveType.REORDER（Diff 阶段的重新排序）不触发过渡动画，
  // 只有 ENTER/LEAVE（v-if 切换、列表增删）才需要配合 Transition 播放动画
  const needTransition =
    moveType !== MoveType.REORDER &&
    shapeFlag & ShapeFlags.ELEMENT &&
    transition
  if (needTransition) {
    if (moveType === MoveType.ENTER) {
      transition!.beforeEnter(el!)
      hostInsert(el!, container, anchor)
      queuePostRenderEffect(() => transition!.enter(el!), parentSuspense)
    } else {
      const { leave, delayLeave, afterLeave } = transition!
      const remove = () => hostInsert(el!, container, anchor)
      const performLeave = () => {
        leave(el!, () => {
          remove()
          afterLeave && afterLeave()
        })
      }
      if (delayLeave) {
        delayLeave(el!, remove, performLeave)
      } else {
        performLeave()
      }
    }
  } else {
    hostInsert(el!, container, anchor)
  }
}
```

对比笔记版一行代码就能搞定的 `move`，真实源码复杂度全部来自「同一个搬运动作要兼容多少种节点类型和场景」：本文 2.4 节讲的 `patchKeyedChildren` 乱序比对阶段调用 `move` 时传的是 `MoveType.REORDER`，天然跳过 `needTransition` 分支，这也是为什么 Diff 算法重新排序节点时不会意外触发进入/离开动画。

### 3.3 Diff 算法源码补充：patchKeyedChildren 的调用参数

本文 2.4 节讲的 `patchKeyedChildren` 五步法和真实源码的核心算法完全一致，真实源码只是多传了 `namespace`/`slotScopeIds`/`optimized` 三个参数用于透传命名空间（SVG/MathML）、作用域插槽标识和 Block Tree 优化开关，不影响算法本身。真正值得补充的是 `getSequence`（最长递增子序列）在源码里的位置——它定义在 `renderer.ts` 文件的最末尾，作为一个独立的纯函数存在，不依赖闭包里的任何渲染器状态，这也是为什么本文手写版可以直接把它原样搬过去用：算法本身与「用哪个平台渲染」完全无关，是纯粹的数组处理逻辑。

`patchKeyedChildren` 内部反复调用的 `normalizeVNode`，真实源码里多了一步本文笔记版没有的 `cloneIfMounted`：

```typescript
// packages/runtime-core/src/vnode.ts（简化，保留核心分支）
export function normalizeVNode(child: VNodeChild): VNode {
  if (child == null || typeof child === 'boolean') {
    return createVNode(Comment)
  } else if (isArray(child)) {
    return createVNode(Fragment, null, child.slice())
  } else if (isVNode(child)) {
    // 关键差异：child 本身已经是一个 VNode（比如从 slots 里取出来的、上一次渲染缓存的节点），
    // 如果它已经挂载过（el 不为空），必须先克隆一份新的再用，否则同一个 vnode 对象被父子两处同时持有引用，
    // 一处更新会污染另一处——这是笔记版 `isObject(child) ? child : ...` 直接复用引用会埋的隐患
    return cloneIfMounted(child)
  } else {
    return createVNode(Text, null, String(child))
  }
}

export function cloneIfMounted(child: VNode): VNode {
  return (child.el === null && child.memo === undefined) || child.memo
    ? child
    : cloneVNode(child)
}
```

### 3.4 节点卸载源码：unmount 完整版

> **对比 Vue 2**：Vue 2 的卸载入口是 `$destroy()`：`teardown` 掉组件自己的 `_watcher` 和 `_watchers` 数组里的所有 watcher、递归调用子组件的 `$destroy()`（`invokeDestroyHook`）、解绑所有事件监听（`vm.$off()`）、最后调用 `vm.__patch__(vm._vnode, null)` 触发 DOM 移除。整个过程是「组件实例」维度的，因为 Vue 2 一切皆组件。Vue 3 的 `unmount` 是「VNode」维度的，同一个函数要同时处理元素、组件、Fragment、Teleport、Suspense 五种截然不同的类型，还要考虑 `KeepAlive`（不能真卸载，只能失活）和 `Transition`（要等动画播放完才能真正移除 DOM）——这是本文笔记完全没有覆盖、但面试高频会追问「Vue 3 卸载都做了什么」的部分。

笔记里的 `unmount` 只有一行 `hostRemove(vnode.el)`，Vue 3.4 真实源码要复杂得多：

```typescript
// packages/runtime-core/src/renderer.ts（保留核心分支，省略 dev 专用代码）
const unmount: UnmountFn = (
  vnode,
  parentComponent,
  parentSuspense,
  doRemove = false,
  optimized = false
) => {
  const {
    type,
    props,
    ref,
    children,
    dynamicChildren,
    shapeFlag,
    patchFlag,
    dirs,
    cacheIndex
  } = vnode

  // 静态提升节点专属的缓存清理：从渲染函数的 _cache 数组里摘掉引用，避免内存泄漏
  if (patchFlag === PatchFlags.BAIL) {
    optimized = false
  }

  // ref 卸载：把 ref 指向的值置空
  if (ref != null) {
    setRef(ref, null, parentSuspense, vnode, true)
  }

  if (cacheIndex != null) {
    parentComponent!.renderCache[cacheIndex] = undefined
  }

  if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
    // ⚠️ KeepAlive 缓存的组件：不走真正的卸载流程，只是「失活」，DOM 被移到离屏容器里保留
    ;(parentComponent!.ctx as KeepAliveContext).deactivate(vnode)
    return
  }

  const shouldInvokeDirs = shapeFlag & ShapeFlags.ELEMENT && dirs
  const shouldInvokeVnodeHook = !isAsyncWrapper(vnode)

  let vnodeHook: VNodeHook | undefined | null
  if (
    shouldInvokeVnodeHook &&
    (vnodeHook = props && props.onVnodeBeforeUnmount)
  ) {
    invokeVNodeHook(vnodeHook, parentComponent, vnode)
  }

  if (shapeFlag & ShapeFlags.COMPONENT) {
    // 组件：递归卸载组件实例——停止 render effect、卸载子树、清理 provide/inject、触发 unmounted 钩子
    unmountComponent(vnode.component!, parentSuspense, doRemove)
  } else {
    if (shapeFlag & ShapeFlags.SUSPENSE) {
      vnode.suspense!.unmount(parentSuspense, doRemove)
      return
    }

    if (shouldInvokeDirs) {
      // 自定义指令的 beforeUnmount 钩子（比如 v-model 的自定义指令实现）
      invokeDirectiveHook(vnode, null, parentComponent, 'beforeUnmount')
    }

    if (shapeFlag & ShapeFlags.TELEPORT) {
      ;(vnode.type as typeof TeleportImpl).remove(
        vnode, parentComponent, parentSuspense, optimized, internals, doRemove
      )
    } else if (
      dynamicChildren &&
      // 只有「结构稳定」的场景才能安全地只卸载 dynamicChildren（跳过静态子树）；
      // 否则（比如子节点数量可能变化）必须退回卸载完整的 children，避免漏卸载
      (type !== Fragment ||
        (patchFlag > 0 && patchFlag & PatchFlags.STABLE_FRAGMENT))
    ) {
      // ✅ Block Tree 优化在卸载阶段的对称体现：同样只需要遍历 dynamicChildren
      unmountChildren(dynamicChildren, parentComponent, parentSuspense, false, true)
    } else if (
      (type === Fragment &&
        patchFlag &
          (PatchFlags.KEYED_FRAGMENT | PatchFlags.UNKEYED_FRAGMENT)) ||
      (!optimized && shapeFlag & ShapeFlags.ARRAY_CHILDREN)
    ) {
      unmountChildren(children as VNode[], parentComponent, parentSuspense)
    }

    if (doRemove) {
      remove(vnode)
    }
  }

  if (
    (shouldInvokeVnodeHook && (vnodeHook = props && props.onVnodeUnmounted)) ||
    shouldInvokeDirs
  ) {
    // unmounted 钩子和指令的 unmounted 钩子要等 DOM 真正移除之后才触发，所以放进 post 队列
    queuePostRenderEffect(() => {
      vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode)
      shouldInvokeDirs &&
        invokeDirectiveHook(vnode, null, parentComponent, 'unmounted')
    }, parentSuspense)
  }
}
```

真正操作 DOM 的 `remove` 函数，把 Fragment 和 Transition 的特殊情况都单独处理了：

```typescript
// packages/runtime-core/src/renderer.ts
const remove: RemoveFn = vnode => {
  const { type, el, anchor, transition } = vnode

  if (type === Fragment) {
    // Fragment 卸载：删除起止锚点之间的所有节点，含首尾锚点本身
    removeFragment(el!, anchor!)
    return
  }

  if (type === Static) {
    removeStaticNode(vnode)
    return
  }

  const performRemove = () => {
    hostRemove(el!)
    if (transition && !transition.persisted && transition.afterLeave) {
      transition.afterLeave()
    }
  }

  if (
    vnode.shapeFlag & ShapeFlags.ELEMENT &&
    transition &&
    !transition.persisted
  ) {
    // ⚠️ 带 Transition 的节点：不能立刻移除 DOM，要先播放 leave 动画，动画结束的回调里才真正 hostRemove
    const { leave, delayLeave } = transition
    const performLeave = () => leave(el!, performRemove)
    if (delayLeave) {
      delayLeave(vnode.el!, performRemove, performLeave)
    } else {
      performLeave()
    }
  } else {
    performRemove()
  }
}

const removeFragment = (cur: RendererNode, end: RendererNode) => {
  // 从起始锚点一路删到结束锚点（含结束锚点本身），中间不管嵌套了多少层节点，统一按兄弟节点顺序删除
  let next
  while (cur !== end) {
    next = hostNextSibling(cur)!
    hostRemove(cur)
    cur = next
  }
  hostRemove(end)
}
```

对比笔记里那行 `hostRemove(vnode.el)`，真实源码的复杂度全部来自「一个 `unmount` 函数要兼容多少种场景」：组件要走生命周期、KeepAlive 要能"假卸载"、Fragment 要清理锚点范围、Transition 要等动画、Block Tree 优化要在卸载路径上也生效。这也是为什么本文 2.3 节把「递归卸载子树」和「移除自身 DOM」分开讲——真实源码里这两件事分别对应 `unmountChildren`/`unmountComponent` 和 `remove`，是两条独立的分支逻辑。

### 💬 面试官视角

**Q1：Vue 3 的卸载和 Vue 2 的 `$destroy` 相比复杂在哪？为什么要考虑 Transition/KeepAlive？**

✅ **标准答案**：
Vue 2 的 `$destroy` 是组件实例维度的，统一走「teardown watcher → 递归销毁子组件 → 解绑事件 → patch(vnode, null)」。Vue 3 的 `unmount` 是 VNode 维度的，同一个函数要分发处理元素、组件、Fragment、Teleport、Suspense 五种类型，还要在分发之前判断 `KeepAlive`（不能真卸载，只能失活挪到离屏容器）和 `Transition`（不能立刻移除 DOM，要等 leave 动画播放完才能真正 `hostRemove`）。

🎁 **加分点**：
Block Tree 优化在卸载路径上也有对称体现——如果一个 Fragment 是「结构稳定」的（`patchFlag & PatchFlags.STABLE_FRAGMENT`），卸载时可以只遍历 `dynamicChildren` 而不是完整的 `children`，跳过静态子树的卸载判断，这一点和更新阶段的 `patchBlockChildren` 是同一个设计思路的两个应用场景。

**Q2：`dynamicChildren` 是什么时候被收集的？`openBlock`/`closeBlock` 起什么作用？**

✅ **标准答案**：
`openBlock()` 会往一个全局的 `blockStack` 栈里 push 一个新的空数组，并把它设为 `currentBlock`；在这个 Block 内部创建的每一个 VNode，只要 `patchFlag > 0`（说明是动态节点）或者本身是组件，就会自动 push 进 `currentBlock`；`closeBlock()` 把栈顶弹出，恢复到上一层 Block（如果有嵌套）。最后 `setupBlock` 把收集到的数组赋值给这个 Block 节点自己的 `dynamicChildren`。

🎁 **加分点**：
静态提升的节点（`patchFlag <= 0`）不会被收集进 `currentBlock`，这正是「静态提升」和「Block Tree」两个优化互相配合的地方——静态节点从源头上就不会进入 `dynamicChildren`，Block Tree 天然只包含真正动态的节点，不需要额外过滤。

## 🎯 四、生产级最佳实践

### key 的正确使用：稳定唯一标识而非 index

> **升级点**：原理和 Vue 2 一致，但 Block Tree 让收益更明显——如果用 `index` 做 key，每次数组增删都会导致大量节点的 key 发生变化，Block Tree 收集到的 `dynamicChildren` 里的节点会被错误地判定为「内容变了」而不是「顺序变了」，白白触发大量属性 patch，而不是走高效的 `move`。

```html
<!-- ❌ 错误：用 index 做 key -->
<li v-for="(drug, index) in prescriptionList" :key="index">{{ drug.name }}</li>

<!-- ✅ 正确：用业务唯一标识 -->
<li v-for="drug in prescriptionList" :key="drug.id">{{ drug.name }}</li>
```

### v-once：纯静态内容永不更新

> **对比 Vue 2**：`v-once` 在 Vue 2 和 Vue 3 中的**用法完全一致**，但实现机制不同：Vue 2 是在首次渲染后把节点的 VNode 缓存到 `_vnode` 上，下次直接复用缓存；Vue 3 编译时给 `v-once` 节点打上 `PatchFlags.HOISTED` 标记（等价于静态提升），和纯静态节点走同一套「永不参与 Diff」的路径，代码更统一。

```html
<template>
  <div v-once>
    <p>{{ drugInstructions.disclaimer }}</p>
  </div>
</template>
```

运行时渲染一次之后就永远跳过 Diff，即使依赖的响应式数据变化也不会更新。适合「首次渲染后确定不会再变」的内容（比如药品说明书的固定条款文案）。

### v-memo：手动标记跳过更新的子树

> **对比 Vue 2**：Vue 2 没有 `v-memo` 指令，如果想跳过子树更新只能手动拆成子组件 + `shouldComponentUpdate`（Vue 2.x 没这个钩子）或用函数式组件（Functional Component）配合手动的 `props` 浅比较。Vue 3 的 `v-memo` 把这个能力直接暴露为指令，作用在模板节点级别，不需要拆组件，编译为依赖数组的 `Object.is` 比对，和 React 的 `React.memo` 思路类似。

```html
<template>
  <div
    v-for="drug in drugList"
    :key="drug.id"
    v-memo="[drug.id === selectedId, drug.stock]"
  >
    <span>{{ drug.name }}</span>
    <span>库存：{{ drug.stock }}</span>
  </div>
</template>
```

依赖数组每一项都和上一次渲染的值相等（`Object.is`），就直接跳过该节点及其子树的 Diff。大列表场景下，如果每一行内部结构复杂，`v-memo` 能显著减少不必要的属性比对和子节点递归。

### Fragment 场景下 $attrs 透传需手动绑定

> **对比 Vue 2**：Vue 2 强制单根节点，`$attrs` 会自动透传到那个唯一的根元素上（除非设置 `inheritAttrs: false`）。Vue 3 允许多根节点（Fragment），但无法自动判断把 `$attrs` 绑定到哪个根节点，所以开发者必须手动用 `v-bind="$attrs"` 显式绑定到需要的根节点上，否则这些未声明的 `props` 会被忽略。

```html
<template>
  <!-- 多根节点组件，$attrs 不会自动继承到某个根节点 -->
  <header>处方单头部</header>
  <main v-bind="$attrs">处方单内容</main>
</template>
```

### 医疗场景实战：处方药品列表增删改时的更新范围分析

处方药品列表这类「增删改查」高频的列表场景，是 Diff 算法收益最直观的地方：

- **末尾追加一条新药品**：走 2.4 节的「common sequence + mount」，直接在末尾插入，不触碰任何已有节点
- **删除中间一条药品**：走「乱序比对」，`keyToNewIndexMap` 里找不到被删除药品的 key，直接卸载，其余节点因为 key 不变，`patch` 时只做属性级别的更新，不发生 DOM 移动
- **调整两条药品的排序**（比如按价格重新排序）：走最长递增子序列判定，只有真正不在递增序列里的节点才会触发 `move`，其余节点即使位置在数组中变了，只要仍在递增子序列内，实际 DOM 顺序已经正确，不需要移动
- **修改某条药品的库存字段**：类型和 key 都不变，`isSameVNodeType` 命中，直接走 `patchElement` 里的 `patchProps`，如果配合 Patch Flags，甚至不需要遍历比较其他没变的属性

## 🛠️ 五、手写实现（可独立跑通）

延续第 01 篇搭建好的 pnpm workspace 环境，本节直接进入渲染器核心逻辑的手写代码，不再重复 Monorepo 骨架搭建过程。以下代码全部来自学习笔记《11 渲染原理-实现首次渲染》《12 渲染原理-实现节点卸载》《13 渲染原理-实现节点更新》的原始实现，按笔记的迭代顺序组织成三步：① 首次渲染（补全 `runtime-dom` 平台操作层，让 `mountElement` 真正能在浏览器里跑起来）；② 节点卸载（`unmount` 从空函数体填上第一行实现）；③ 节点更新与 Diff（`patchElement`/`patchChildren`/`patchKeyedChildren` 完整实现）。和「三、源码解析」对照读，能直观看到"教学版最小实现"和"生产级真实源码"之间的复杂度落差。

### 5.1 首次渲染手写代码（对应笔记 11）

笔记 11 首次给渲染器接上了真实 DOM——`runtime-core` 只负责平台无关的 diff 逻辑，具体怎么创建元素、怎么设置属性，要靠 `runtime-dom` 包把浏览器 DOM API 包装成 `RendererOptions` 约定的接口。

`runtime-dom` 的入口，合并节点操作和属性操作后传给 `createRenderer`：

```typescript
// packages/runtime-dom/src/index.ts
import { createRenderer, Renderer, RootRenderFunction } from '@g-vue-next/runtime-core'
import { nodeOps } from './nodeOps'
import { patchProp } from './patchProp'
import { extend } from '@g-vue-next/shared'

// 合并节点操作和属性操作
export const rendererOptions = extend(nodeOps, { patchProp }) // 合并nodeOps和patchProp
let renderer: Renderer<Element>

function ensureRenderer() {
  return renderer || createRenderer<Node, Element>(rendererOptions)
}

export const render = ((...args) => {
  return ensureRenderer().render(...args)
}) as RootRenderFunction<Element>

export * from '@g-vue-next/runtime-core'
```

DOM 节点操作实现，`nodeOps.ts`：

```typescript
// packages/runtime-dom/src/nodeOps.ts
import { RendererOptions } from "@g-vue-next/runtime-core"

const doc = (typeof document !== 'undefined' ? document : null) as Document

// 所有的DOM操作都放在这里面
export const nodeOps: Omit<RendererOptions<Node, Element>, 'patchProp'> = {
  insert(child, parent, anchor) {
    parent.insertBefore(child, anchor || null)
  },
  remove(child) {
    const parent = child.parentNode
    if (parent) {
      parent.removeChild(child)
    }
  },
  createElement(tagName) {
    return doc.createElement(tagName)
  },
  createText(text) {
    return doc.createTextNode(text)
  },
  createComment(text) {
    return doc.createComment(text)
  },
  setText(node, text) { // 设置文本节点的值
    node.nodeValue = text
  },
  setElementText(node, text) { // 设置元素节点的文本
    node.textContent = text
  },
  parentNode(node) {
    return node.parentNode as Element | null
  },
  nextSibling(node) {
    return  node.nextSibling
  },
  querySelector(selector) {
    return doc.querySelector(selector)
  },
  setScopeId(el, id) {
    el.setAttribute(id, '')
  },
  insertStaticContent(content, parent, anchor, namespace, start, end) {
    const before = anchor ? anchor.previousSibling : parent.lastChild
    return [
      // first
      before? before.nextSibling : parent.firstChild,
      // last
      anchor ? anchor.previousSibling : parent.lastChild
    ]
  }
}
```

属性/事件更新实现，`patchProp.ts` 按 `class`/`style`/事件/普通属性四类分发：

```typescript
// packages/runtime-dom/src/patchProp.ts
import { RendererOptions } from "@g-vue-next/runtime-core";
import { isOn } from "@g-vue-next/shared";
import { patchClass } from "./modules/class";
import { patchStyle } from "./modules/style";
import { patchEvent } from "./modules/events";
import { patchAttr } from "./modules/arrts";

type DOMRendererOptions = RendererOptions<Node, Element>

export const patchProp: DOMRendererOptions['patchProp'] = (
  el,
  key,
  prevValue,
  nextValue,
  namespace,
  parentComponent
) => {
  if (key === 'class') {
    patchClass(el, nextValue || '')
  } else if (key === 'style') {
    patchStyle(el, prevValue, nextValue)
  } else if (isOn(key)) {
    patchEvent(el, key, prevValue, nextValue, parentComponent)
  } else { // attr
    patchAttr(el, key, nextValue)
  }
}
```

四个具体模块，`class.ts`/`style.ts`/`attrs.ts`：

```typescript
// packages/runtime-dom/src/modules/class.ts
export function patchClass(el: Element, value: string | null) {
  if (!value) {
    el.removeAttribute('class')
  } else {
    el.setAttribute('class', value)
  }
}
```

```typescript
// packages/runtime-dom/src/modules/style.ts
type Style = Record<string, string> | null

export function patchStyle(el: Element, prev: Style, next: Style) {
  // 新的样式存在
  if (next) {
    // 获取样式对象
    const style = (el as HTMLElement).style
    // 遍历新的样式对象，将新的样式对象逐个进行添加
    for (const key in next) { 
      style.setProperty(key, next[key])
    }
    // 遍历老的样式对象，将老的样式对象逐个进行移除
    for (const key in prev) {
      if (!next[key]) {
        style.setProperty(key, '')
      }
    }
  } else { // 新的样式不存在
    el.removeAttribute('style')
  }
}
```

```typescript
// packages/runtime-dom/src/modules/attrs.ts
export function patchAttr(el: Element, key: string, value: any) {
  if (value == null) {
    el.removeAttribute(key)
  } else {
    el.setAttribute(key, value)
  }
}
```

`events.ts` 用一个缓存对象存事件处理函数，更新事件时只替换 `invoker.value`，不需要反复 `addEventListener`/`removeEventListener`：

```typescript
// packages/runtime-dom/src/modules/events.ts
import { isArray } from "@g-vue-next/shared"

interface Invoker extends EventListener {
  value: EventValue
  attached?: number
}

type EventValue =Function | Function[]

const veiKey = Symbol('_vei')

export function patchEvent(
  el: Element & {[veiKey]?: Record<string, any>},
  rawName: string,
  prevValue: EventValue,
  nextValue: EventValue,
  instance: any = null,
) { 
  // 用来缓存事件监听器
  const invokers = el[veiKey] || (el[veiKey] = {})
  // 获取事件名称，如：onClick => click
  const name = (rawName.slice(2) as string).toLocaleLowerCase()
  // 获取对应name的缓存事件
  const existingInvoker = invokers[name]

  // 如果新的事件存在并且缓存的事件也存在，则更新缓存的事件
  if(nextValue && existingInvoker) {
    //! 这里使用了一个技巧，将缓存的事件的value属性设置为新的事件，这样，当缓存的事件被触发时，就会执行新的事件
    existingInvoker.value = nextValue
  } else {
    // 有新事件，无旧事件：绑定事件，缓存事件
    if (nextValue) {
      const invoker = (invokers[name] = createInvoker(nextValue, instance))
      addEventListener(el, name, invoker)
      invoker.value = nextValue
    } else if (existingInvoker) {
      // 无新事件，有旧事件：删除旧事件，缓存事件不存在
      removeEventListener(el, name, existingInvoker)
      invokers[name] = null
    }
  }
}

function createInvoker(
  initialValue: EventValue,
  instance: any
) {
  const invoker: Invoker = (e: Event) => {
    if(isArray(invoker.value)) {
      invoker.value.forEach(fn => fn(e))
    } else {
      invoker.value(e)
    }
  }
  invoker.value = initialValue
  return invoker
}

export function addEventListener(el: Element, name: string, handler: EventListener, options?: EventListenerOptions) {
  el.addEventListener(name, handler, options)
}

export function removeEventListener(el: Element, name: string, handler: EventListener, options?: EventListenerOptions) {
  el.removeEventListener(name, handler, options)
}
```

再看 `runtime-core` 这一侧。`h.ts` 处理参数重载：

```typescript
// packages/runtime-core/src/h.ts
import { isArray, isObject } from '@g-vue-next/shared'
import { createVNode, isVNode, type VNode, type VNodeArrayChildren } from './vnode'

export type RawChildren =
  | string
  | number
  | boolean
  | VNode
  | VNodeArrayChildren
  | (() => any)

export function h(
  type: string | any, 
  propsOrChildren?: Record<string, unknown> | null, 
  children?: RawChildren
) {
  const l = arguments.length

  // 分析 l 的值的情况:
  // 1. 2个参数
  //   如: h('div', { id: 'foo' }), h('div', 'hello world'), h('div', [h('span', 'hello'), h('span', 'world')])
  // 2. 3个参数
  //   如: h('div', { id: 'foo' }, 'hello world'), h('div', { id: 'foo' }, [h('span', 'hello'), h('span', 'world')])
  // 3. 大于3个参数
  //   如: h('div', { id: 'foo' }, 1, '2', h('span', 'hello'), h('span', 'world'))

  if (l === 2) { 
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) { // propsOrChildren 是对象，且不是数组
      if (isVNode(propsOrChildren)) { // propsOrChildren 是虚拟节点, 如: h('div', h('span', 'hello'))
        return createVNode(type, null, [propsOrChildren])
      }
      // 对象, 如: h('div', { id: 'foo' })
      return createVNode(type, propsOrChildren)
    } else {
      // 数组或文本, 如: h('div', ['hello', h('span', 'world')]), h('div', 'hello world')
      return createVNode(type, null, propsOrChildren)
    }
  } else {
    if(l > 3) { // 如: h('div', { id: 'foo' }, 1, '2', h('span', 'hello'), h('span', 'world'))
      children = Array.from(arguments).slice(2)
    } else if(l === 3 && isVNode(children)) { // 如: h('div', { id: 'foo' }, h('span', 'hello'))
      children = [children]
    }
    return createVNode(type, propsOrChildren, children)
  }
}
```

`vnode.ts` 这一版还只有最基础的 `createBaseVNode`/`isSameVNodeType`/`isVNode`，`ShapeFlags` 也只用到 `ELEMENT`/`TEXT_CHILDREN`/`ARRAY_CHILDREN` 三种：

```typescript
// packages/runtime-core/src/vnode.ts
import { type Ref } from "@g-vue-next/reactivity";
import type { RendererElement, RendererNode } from "./renderer";
import { isArray, isString, ShapeFlags } from "@g-vue-next/shared";

export type VNodeRef = 
  | string
  | Ref
  | ((ref: Element | null, refs: Record<string, any>) =>void)

export type VNodeProps = { 
  key?: PropertyKey,
  ref?: VNodeRef
}

export type VNodeTypes = 
  | string
  | VNode
  | typeof Text
  | typeof Comment

export type VNodeChildAtom = 
  | VNode
  | string
  | number
  | boolean
  | null
  | undefined
  | void

export type VNodeArrayChildren = Array<VNodeArrayChildren | VNodeChildAtom>

export type VNodeChildren = VNodeChildAtom | VNodeArrayChildren

export type VNodeNormalizedChildren = 
  | string
  | VNodeArrayChildren
  | null

export interface VNode<
  HostNode = RendererNode,
  HostElement = RendererElement,
  ExtraProps = { [key: string]: any }
> {
  // core
  __v_isVNode: true;
  type: VNodeTypes;
  key: PropertyKey | null
  props: (VNodeProps & ExtraProps) | null

  children: VNodeNormalizedChildren
  // DOM
  el: HostNode | null
  
  // optimization
  shapeFlag: number
}

const normalizeKey = ({ key }: VNodeProps): VNodeProps['key'] => 
  key != null ? key : null

function createBaseVNode(
  type: VNodeTypes,
  props: (VNodeProps | Record<string, unknown>) | null = null,
  children: unknown = null
) {
  const shapeFlag = isString(type) ? ShapeFlags.ELEMENT : 0 // 是否是元素节点

  const vnode = {
    __v_isVNode: true,
    type, // 类型
    props, // 属性
    children, // 子节点
    shapeFlag, // 元素节点的标识
    el: null, // 虚拟节点对应的真实元素节点
    key: props && normalizeKey(props), // 虚拟节点的key
  } as VNode

  // 如果有子节点，则标记子节点的类型
  if(children) {
    // 获取子节点的类型
    let type = 0
    if (isArray(children)) {
      type = ShapeFlags.ARRAY_CHILDREN // 数组
    } else {
      type = ShapeFlags.TEXT_CHILDREN // 文本
    }
    // 按位或运算，将type的值添加到shapeFlag中
    vnode.shapeFlag |= type 
  }

  return vnode
}

function _createVNode(
  type: VNodeTypes,
  props: (VNodeProps | Record<string, unknown>) | null = null,
  children: unknown = null
): VNode {
  return createBaseVNode(type, props, children)
}

// 判断两个节点是否相同
export function isSameVNodeType(n1: VNode, n2: VNode): boolean {
  return n1.type === n2.type && n1.key === n2.key
}

export const isVNode = (value: any): value is VNode => {
  return value ? value.__v_isVNode === true : false
}

export const createVNode = _createVNode
```

`renderer.ts` 的 `patch`/`processElement`/`mountElement`/`mountChildren`/`render` 是这一版的核心——注意这里的 `unmount` 还只是一个**空函数体**，因为笔记 11 只讲首次渲染，还没轮到卸载：

```typescript
// packages/runtime-core/src/renderer.ts
import { NOOP, ShapeFlags } from "@g-vue-next/shared";
import { isSameVNodeType, type VNode, type VNodeArrayChildren } from "./vnode";

function baseCreateRenderer<
  HostNode = RendererNode,
  HostElement = RendererElement
>(options: RendererOptions<HostNode, HostElement>) {

  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    createComment: hostCreateComment,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    setScopeId: hostSetScopeId = NOOP,
    insertStaticContent: hostInsertStaticContent,
  } = options

  /*************** 处理节点 ***************/

  // patch 的主要作用：对比新前后的节点，并更新 DOM
  const patch = (
    n1,
    n2,
    container,
    anchor = null,
    parentComponent = null,
    parentSuspense = null,
    namespace = undefined
  ) => {
    if (n1 === n2) {
      // 节点相同，则不需要更新
      return
    }

    // 如果老节点存在，并且新老节点不同，则直接移除老节点，再插入新的节点
    if (n1 && !isSameVNodeType(n1, n2)) {
      unmount(n1, parentComponent, parentSuspense, true)
      n1 = null
    }

    const { type, shapeFlag} = n2
    //! ⚠️ 每增加一种类型都需要考虑首次渲染、更新、卸载 三种情况
    switch (type) {
      // 文本节点
      case Text:
        break
      // 元素节点或组件
      default:
        processElement(n1, n2, container, anchor, parentComponent, parentSuspense, namespace)
        break
    }
  }

  // 处理元素节点
  const processElement = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: any | null,
    parentSuspense: any | null,
    namespace: ElementNamespace
  ) => { 
    // 老节点不存在，说明是初次渲染，则创建
    if (n1 === null) {
      mountElement(n2, container, anchor, parentComponent, parentSuspense, namespace)
    }
  }

  /*************** 挂载 ***************/
  // 挂载元素节点
  const mountElement = (
    vnode: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: any | null,
    parentSuspense: any | null,
    namespace: ElementNamespace
  ) => {
    const { type, props, shapeFlag, children } = vnode
    // 创建元素节点
    const el: any = (vnode.el = hostCreateElement(type as string, namespace))
    // 设置属性
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }

    // 处理子节点
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) { // 文本节点
      hostSetElementText(el, children as string)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 数组节点
      mountChildren((children) as VNodeArrayChildren, el, null, parentComponent, parentSuspense, namespace)
    }
    
    // 插入元素
    hostInsert(el, container as any, anchor as any)
  }
  // 挂载子节点
  const mountChildren: MountChildrenFn = (
    children,
    container,
    anchor,
    parentComponent,
    parentSuspense,
    namespace
  ) => {
    for(let i = 0; i < children?.length; i++) {
      const child = children[i]
      patch(null, child, container, anchor, parentComponent, parentSuspense, namespace)
    }
  }
  /*************** 更新 ***************/
  /*************** 卸载 ***************/
  // 卸载节点：这里先占位，笔记 12 才会补上第一行实现
  const unmount: UnmountFn = (
    vnode,
    parentComponent,
    parentSuspense,
    doRemove = false,
    optimize = false
  ) => {

  }

  const render = (vnode, container, namespace) => {
    // 三种情况：
    // 1. 初始渲染
    // 2. 更新渲染
    // 3. 销毁渲染
    if (vnode == null) {
      // 销毁
    } else {
      // 初次挂载 或 更新挂载
      patch(
        container._vnode || null,
        vnode,
        container,
        null,
        null,
        null,
        namespace,
      )
    }
    // 保存当前的节点，方便再次渲染的时候，进行比对
    container._vnode = vnode
  }

  return {
    render
  }
}
```

医疗场景验证：`render(h("div", { id: 'main', style: { color: 'red' }, class: 'main div red', onClick: () => console.log('render') }, "hello world"), document.getElementById("app"))`——这一步就能在浏览器里看到一个红色文字的 `div`，点击会打印日志，`nodeOps`/`patchProp` 里手写的每一行都在这一次调用里被实际执行到。

### 5.2 节点卸载手写代码（对应笔记 12）

笔记 12 在 5.1 版本的基础上做了两处改动：一是 `patch` 里补上「新旧节点类型不同，先卸载旧节点再挂载新节点」的分支；二是把上一版空着的 `unmount` 填上第一行实现。

```typescript
// packages/runtime-core/src/renderer.ts（在 patch 函数内新增）
const patch = (
  n1,
  n2,
  container,
  anchor = null,
  parentComponent = null,
  parentSuspense = null,
  namespace = undefined
) => {
  if (n1 === n2) {
    // 节点相同，则不需要更新
    return
  }

  // 如果老节点存在，并且新老节点不同，则直接移除老节点，再插入新的节点
  if (n1 && !isSameVNodeType(n1, n2)) {
    unmount(n1, parentComponent, parentSuspense, true)
    n1 = null // 将老节点置为空，后面会挂载新节点
  }

  const { type, shapeFlag} = n2
  //! ⚠️ 每增加一种类型都需要考虑首次渲染、更新、卸载 三种情况
  switch (type) {
    // 文本节点
    case Text:
      break
    // 元素节点或组件
    default:
      processElement(n1, n2, container, anchor, parentComponent, parentSuspense, namespace)
      break
  }
}
```

`unmount` 补上的第一行实现，只有 `hostRemove(vnode.el)` 这一句：

```typescript
// packages/runtime-core/src/renderer.ts
// 卸载节点
const unmount: UnmountFn = (
  vnode,
  parentComponent,
  parentSuspense,
  doRemove = false,
  optimize = false
) => {
  hostRemove(vnode.el as any)
}
```

`render` 也补上了 `vnode == null` 时的卸载分支：

```typescript
// packages/runtime-core/src/renderer.ts
const render = (vnode, container, namespace) => {
  // 三种情况：
  // 1. 初始渲染
  // 2. 更新渲染
  // 3. 销毁渲染
  if (vnode == null) {
    // 销毁
    if (container._vnode) { // 如果当前 container 中已经有节点，则先卸载该节点
      unmount(container._vnode, null, null, true)
    }
  } else {
    // 初次挂载 或 更新挂载
    patch(
      container._vnode || null,
      vnode,
      container,
      null,
      null,
      null,
      namespace,
    )
  }
  // 保存当前的节点，方便再次渲染的时候，进行比对
  container._vnode = vnode
}
```

这一版的 `unmount` 只够卸载单个元素节点——因为这一步的目标场景就是笔记基本使用里演示的 `render(h("div", "hello world"), app)` 之后 `render(null, app)`，还没有 Fragment、没有需要递归的子树。真实 Vue 3.4 里 `unmount` 要同时兼容组件、Fragment、Teleport、KeepAlive、Transition 五花八门的场景，那套完整实现已经在「三、源码解析」3.4 节讲过，这里的一行代码只是"卸载"这件事最朴素的起点。

### 5.3 节点更新与 Diff 手写代码（对应笔记 13）

笔记 13 是三篇里改动量最大的一篇，`patch` 主分发新增了 `Text` 分支和 `shapeFlag & ShapeFlags.ELEMENT` 判断：

```typescript
// packages/runtime-core/src/renderer.ts（renderer.ts 的 patch 函数，本节最终版）
import { isNil, NOOP, ShapeFlags } from "@g-vue-next/shared";
import { isSameVNodeType, normalizeVNode, Text, type VNode, type VNodeArrayChildren } from "./vnode";

const patch = (
  n1,
  n2,
  container,
  anchor = null,
  parentComponent = null,
  parentSuspense = null,
  namespace = undefined
) => {
  if (n1 === n2) {
    // 节点相同，则不需要更新
    return
  }

  // 如果老节点存在，并且新老节点不同，则直接移除老节点，再插入新的节点
  if (n1 && !isSameVNodeType(n1, n2)) {
    unmount(n1, parentComponent, parentSuspense, true)
    n1 = null // 将老节点置为空，后面会挂载新节点
  }

  const { type, shapeFlag} = n2
  //! ⚠️ 每增加一种类型都需要考虑首次渲染、更新、卸载 三种情况
  switch (type) {
    // 文本节点
    case Text:
      processText(n1, n2, container, anchor)
      break
    // 元素节点或组件
    default:
      if(shapeFlag & ShapeFlags.ELEMENT) { // 元素节点
        processElement(n1, n2, container, anchor, parentComponent, parentSuspense, namespace)
      }
      break
  }
}
```

`processElement` 补上更新分支，走 `patchElement`；新增 `processText` 处理文本节点的创建和更新；新增 `move` 处理节点移动：

```typescript
// 处理元素节点
const processElement = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: any | null,
  parentSuspense: any | null,
  namespace: ElementNamespace
) => { 
  // 老节点不存在，说明是初次渲染，则创建
  if (n1 === null) {
    mountElement(n2, container, anchor, parentComponent, parentSuspense, namespace)
  } else { // 否则是更新
    patchElement(n1, n2, parentComponent, parentSuspense, namespace)
  }
}

// 处理文本节点
const processText = (n1, n2, container, anchor) => {
  // 老节点不存在，说明是初次渲染，则创建
  if (n1 === null) {
    // 创建文本节点
    hostInsert(
      n2.el = hostCreateText(n2.children), // 创建文本节点, 并挂载到当前元素
      container, // 插入的父元素
      anchor // 锚点
    )
  } else {
    // 节点存在，则更新
    const el = n2.el = n1.el // 获取元素节点
    if(n2.children !== n1.children) {
      // 文本内容改变，更新内容
      hostSetText(el, n2.children)
    }
  }
}

// 移动节点
const move: MoveFn = (
  vnode,
  container,
  anchor,
  moveType,
  parentSuspense = null
) => {
  const { el } = vnode
  hostInsert(el as any, container as any, anchor as any)
}
```

`mountChildren` 挂载子节点时改成先 `normalizeVNode` 归一化：

```typescript
// 挂载子节点
const mountChildren: MountChildrenFn = (
  children,
  container,
  anchor,
  parentComponent,
  parentSuspense,
  namespace
) => {
  for(let i = 0; i < children?.length; i++) {
    const child = normalizeVNode(children[i])
    patch(null, child, container, anchor, parentComponent, parentSuspense, namespace)
  }
}
```

`patchProps` 全量比对属性，`value` 单独处理：

```typescript
const patchProps = (
  el: RendererElement,
  oldProps: Data,
  newProps: Data,
  parentComponent: any,
  namespace: ElementNamespace
) => {
  // 新旧 props 不同，进行比对
  if (oldProps !== newProps) {
    // 新 prop 和 旧 prop 进行比对，如果不同，进行更新
    for (const key in newProps) {
      hostPatchProp(el as any, key, oldProps[key], newProps[key], namespace, parentComponent)
    }

    // 旧的 prop 有值,新的 prop 没有值，进行卸载
    for (const key in oldProps) {
      if (!(key in newProps)) {
        hostPatchProp(el as any, key, oldProps[key], null, namespace, parentComponent)
      }
    }
    // 值更新
    if ('value' in newProps) {
      hostPatchProp(el as any, 'value', oldProps.value, newProps.value, namespace)
    }
  }
}
```

`patchKeyedChildren` 是本节最核心的部分，五步 Diff 完整实现：

```typescript
const patchKeyedChildren = (
  c1: VNode[],
  c2: VNodeArrayChildren,
  container: RendererElement,
  parentAnchor: RendererNode | null,
  parentComponent: any,
  parentSuspense: any,
  namespace: ElementNamespace
) => {
  // 全量的 diff 算法
  // 对比过程是采用深度遍历，先便利父级再遍历子级，并且是同级对比
  let i = 0 // 索引
  const l2 = c2.length // 新节点的个数
  let e1 = c1.length - 1 // 旧节点的终点索引
  let e2 = l2 - 1 // 新节点的终点索引

  // 1.sync from start ==> 左侧对比
  // (a b) c
  // (a b) d e
  while (i <= e1 && i<= e2) {
    const n1 = c1[i] // 旧子节点的第一个节点
    const n2 = normalizeVNode(c2[i]) // 新子节点的第一个节点
    // 如果新旧节点相同
    if (isSameVNodeType(n1, n2)) {
      // 递归对比
      patch(n1, n2, container, null, parentComponent, parentSuspense, namespace)
    } else {
      break
    }
    i++
  }
  
  // 2.sync from end   ==> 右侧对比
  //   a (b c)
  // d e (b c)
  while (i<=e1 && i <= e2) {
    const n1 = c1[e1] // 旧子节点的最后一个节点
    const n2 = normalizeVNode(c2[e2]) // 新子节点的最后一个节点
    if (isSameVNodeType(n1, n2)) {
      patch(n1, n2, container, null, parentComponent, parentSuspense, namespace)
    } else {
      break
    }
    e1--
    e2--
  }
  
  // 3.common sequence + mount  ==> 同序列挂载（新增）
  // (a b)
  // (a b) c
  //i = 2, e1 = 1, e2 = 2
  //   (a b)
  // c (a b)
  // i = 0, e1 = -1, e2 = 0
  if (i > e1) {
    if (i <= e2) {
      // 判断 e2 是否向前移动，如果向前移动，说明要向前插入，如果 e2 没有移动，说明要向后插入
      const nextPos = e2 + 1
      // vue 2 的实现是 判断 下一个元素存不存在
      // vue 3 的实现是 判断 下一个元素的长度是否越界
      const anchor = nextPos < l2 ? (c2?.[nextPos] as VNode)?.el : parentAnchor // 获取下一个元素的及锚点
      while (i <= e2) {
        patch(null, normalizeVNode(c2[i]), container, anchor, parentComponent, parentSuspense, namespace)
        i++
      }
    }
  }
  // 4.common sequence + unmount ==> 同序列卸载（删除）
  // (a b) c
  // (a b)
  // i = 2, e1 = 2, e2 = 1
  // a (b c)
  //   (b c)
  // i = 0, e1 = 0, e2 = -1
  else if (i > e2) {
    // 卸载 i 到 e1 的旧元素
    while (i <= e1) {
      unmount(c1[i], parentComponent, parentSuspense, true)
      i++
    }
  }
  //! 以上都是优化处理，是为了确认不变化的节点，并且对新增和移除做了处理，下面是核心处理
  // 5.unknown sequence ==> 乱序比对
  // [i....e1 + 1]: a b [c d e] f g
  // [i....e2 + 1]: a b [e d c h] f g
  // i = 2, e1 = 4, e2 = 5
  else {
    let s1 = i // 旧的 children 的开始索引
    let s2 = i // 新的 children 的开始索引

    // 5.1. build key: index map for children ==> 构建新子节点的键索引映射表
    const keyToNewIndexMap: Map<PropertyKey, number> = new Map() // 键索引映射表
    for (let i = s2; i <= e2; i++) {
      const nextChild = normalizeVNode(c2[i])
      if (!isNil(nextChild.key)) {
        keyToNewIndexMap.set(nextChild.key, i)
      }
    }
    
    // 5.2. loop through old children left to be patched and try to patch ==> 从左到右遍历旧子节点，如果旧子节点在新的子节点中存在，则复用，否则卸载
    let toBePatched = e2 - s2 + 1 // 需要倒序插入的节点个数
    const newIndexToOldIndexMap = new Array(toBePatched).fill(0) // 用来记录旧子节点在新子节点中的索引
    for (let i = s1; i <= e1; i++) {
      const prevChild = c1[i] // 获取旧子节点
      let nextIndex = keyToNewIndexMap.get(prevChild.key)

      // 旧子节点在新子节点中不存在，则卸载
      if (nextIndex === undefined) {
        unmount(prevChild, parentComponent, parentSuspense, true)
      } else { // 旧子节点在新子节点中存在，则复用
        // 获取新的子节点
        const nextChild = c2[nextIndex]
        // 记录旧子节点在新子节点中的索引
        newIndexToOldIndexMap[nextIndex - s2] = i + 1
        // 比较新老节点的差异，更新属性和子节点
        patch(
          prevChild,
          nextChild,
          container,
          null,
          parentComponent,
          parentSuspense,
          namespace
        )
      }
    }

    // 5.3. move and mount ==> 移动和挂载
    // 获取最长递增子序列
    const increasingNewIndexSequence = getSequence(newIndexToOldIndexMap)
    // 最长递增子序列的最后一个索引
    let j = increasingNewIndexSequence.length - 1
    // 循环从最长递增子序列的最后一个索引开始
    for (let i = toBePatched - 1; i >= 0; i--) { 
      const nextIndex = i + s2 // 新节点的索引
      const nextChild = c2[nextIndex] as VNode // 新节点
      const anchor = nextIndex + 1 < l2 ? (c2[nextIndex + 1] as VNode).el : parentAnchor // 获取下一个节点及新节点的锚点
      // 如果新子节点的索引等于 0，说明新子节点在旧子节点中不存在
      if (newIndexToOldIndexMap[i] === 0) {
        // 插入新子节点
        patch(
          null,
          nextChild,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          namespace
        )
      } else { // 如果新子节点的索引大于 0，说明新子节点在旧子节点中存在
        // 倒序遍历，从后往前插入
        // 这里是暴力的插入，没有使用移动节点的方式，需要优化
        // hostInsert(nextChild.el, container, anchor)
        //! 优化：移动节点
        // 如果新子节点的索引小于 0 或者新子节点的索引与递增序列中的索引不相等
        if (j < 0 || i !== increasingNewIndexSequence[j]) {
          move(nextChild, container, anchor, MoveType.REORDER)
        } else {
          j--
        }
      }
    }
  }
}
```

最长递增子序列 `getSequence`，贪心 + 二分查找 O(n log n)：

```javascript
// https://en.wikipedia.org/wiki/Longest_increasing_subsequence
// 核心：二分查找 + 贪心算法
// 获取最长递增子序列
const getSequence = (arr) => { 
  let len = arr.length // 数组长度
  const result = [0] // 最长子序列的起始索引
  let resultLastIndex; // 最长子序列的结束索引

  let start; // 当前子序列的起始索引
  let end; // 当前子序列的结束索引
  let middle; // 当前子序列的中间索引

  let p = arr.slice(0) // 创建一个副本，用来标识索引，防止修改原数组
  // 循环数组
  for (let i = 0; i < len; i++) {
    const arrI = arr[i] // 当前元素
    if (arrI !== 0) { // 当前元素不为0
      resultLastIndex = result[result.length - 1] // 获取当前子序列的结束索引
      if (arr[resultLastIndex] < arrI) { // 当前元素大于当前子序列的结束元素
        result.push(i) // 添加当前索引到结果数组中
        p[i] = resultLastIndex // 记录当前元素的前一个元素索引
        continue
      }

      // 二分查找
      start = 0 // 当前子序列的起始索引
      end = result.length - 1 // 当前子序列的结束索引
      // 二分法查找当前元素在当前子序列中的位置
      while (start < end) {
        middle = (start + end) >> 1 // 计算中间索引
        if (arr[result[middle]] < arrI) { // 中间元素小于当前元素
          start = middle + 1 // 更新起始索引
        } else {
          end = middle // 否则更新结束索引
        }
      }

      // 找到插入位置
      if (arrI < arr[result[start]]) { //  当前元素小于中间元素
        // 如果 start 大于 0，则说明 start 不是数组的第一个元素，需要减 1
        // start 小于 0，则说明 start 是数组的第一个元素
        if (start > 0) {
          p[i] = result[start - 1] // 记录当前元素的前一个元素索引
        }
        result[start] = i // 更新结果数组中的索引
      }
    }
  }
  // 追溯结果数组，获取最长子序列的索引
  let i = result.length // 结果数组的长度
  let lastIndex = result[i - 1] // 最后一个索引
  while (i-- > 0) {
    result[i] = lastIndex // 将最后一个索引赋值给当前索引
    lastIndex = p[lastIndex] // 用p中的索引追溯
  }
  return result
}
```

`patchChildren` 归纳 9 种情况为 6 类处理逻辑：

```typescript
const patchChildren: PatchChildrenFn = (
  n1,
  n2,
  container,
  anchor,
  parentComponent,
  parentSuspense,
  namespace
) => {
  const c1 = n1?.children // 老的 children
  const c2 = n2?.children // 新的 children
  const prevShapeFlag = n1?.shapeFlag // 老节点的类型
  const shapeFlag = n2?.shapeFlag // 新节点的类型
  
  // TODO 上面九种情况可以分为一下几类处理:
  // 1.新的是文本, 老的是数组，移出老的
  // 2.新的是文本，老的是文本或空，内容不同，替换
  // 3.老的是数组，新的数组，全量 diff
  // 4.老的是数组，新的是空，移除
  // 5.老的是文本，新的是空，移除
  // 6.老的是文本，新的是数组，替换
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // 1
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(c1 as VNode[], parentComponent, parentSuspense)
    }
    // 2, 3
    if (c1 !== c2) {
      hostSetElementText(container as any, c2 as string)
    }
  } else {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 4
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // TODO diff 算法
        patchKeyedChildren(
          c1 as VNode[],
          c2 as VNodeArrayChildren,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          namespace
        )
      } else {
        // 7
        unmountChildren(c1 as VNode[], parentComponent, parentSuspense)
      }
    } else {
      // 5, 8
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(container as any, '')
      }
      // 6
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(
          c2 as VNodeArrayChildren,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          namespace
        )
      }
      // 9 无需处理
    }
  }
}
```

`patchElement` 复用 `el`，先 `patchProps` 再 `patchChildren`：

```typescript
const patchElement = (
  n1: VNode,
  n2: VNode,
  parentComponent: any | null,
  parentSuspense: any | null,
  namespace: ElementNamespace
) => {
  // 1.比较元素的差异，需要复用元素节点
  // 2.比较元素的属性和子节点
  const el = (n2.el = n1.el) // 获取元素的真实DOM，复用

  const oldProps = (n1.props || null) // 老属性
  const newProps = (n2.props || null) // 新属性

  // 比较属性是否变化了
  patchProps(el, oldProps, newProps, parentComponent, namespace)

  // 比较子节点差异
  patchChildren(n1, n2, el, null, parentComponent, parentSuspense, namespace)
}
```

`unmount` 这一版依然只有 `hostRemove(vnode.el)` 一行，新增的是遍历调用它的 `unmountChildren`：

```typescript
// 卸载节点
const unmount: UnmountFn = (
  vnode,
  parentComponent,
  parentSuspense,
  doRemove = false,
  optimize = false
) => {
  hostRemove(vnode.el as any)
}
const unmountChildren: UnmountChildrenFn = (
  children,
  parentComponent,
  parentSuspense,
) => {
  for (let i = 0; i < children.length; i++) {
    unmount(children[i], parentComponent, parentSuspense)
  }
}
```

`vnode.ts` 新增了 `Text`/`Comment`/`Fragment` 三个 Symbol 类型标识，以及把子节点统一归一化成合法 VNode 的 `normalizeVNode`：

```typescript
export const Text = Symbol.for('v-text')
export const Comment = Symbol.for('v-cmt')
export const Fragment = Symbol.for('v-fgt')

export const normalizeVNode = (child: VNodeChild): VNode => {
  // child 是 false 或 null, 返回一个空节点
  if (child == null || typeof child === 'boolean') { 
    return createVNode(Comment)
  } else if (isArray(child)) {
    return createVNode(
      Fragment as any,
      null,
      child.slice()
    )
  } else if (isObject(child)) {
    return child as VNode
  } else {
    return createVNode(Text, null, String(child))
  }
}
```

`shared` 包新增一个 `isNil` 工具函数，`patchKeyedChildren` 构建 key 映射表时要用它排除 `null`/`undefined` 的 key：

```typescript
// 判断是否为null或者undefined
export const isNil = (val: unknown): val is null | undefined => val == null
```

医疗场景验证：本文开头「基本使用」演示的处方药品列表乱序更新场景（`h('li', {key: 'a'}, 'a')` 这组数据），跑的正是这里的 `patchKeyedChildren` 完整实现——可以在浏览器 DevTools 里给 `patch` 函数打断点，观察 `newIndexToOldIndexMap` 和 `increasingNewIndexSequence` 的实际取值，和本文 2.4 节讲的推导过程逐步对照。

笔记这一版的手写实现到 `patchKeyedChildren`/`patchElement`/`unmountChildren` 为止，还没有 Patch Flags、也没有 Block Tree——这两项编译时优化配合运行时消费的完整实现（`patchBlockChildren`/`openBlock`/`closeBlock`），已经在「三、源码解析」3.2 节讲过真实源码版本，这里不重复贴代码，只强调一点结论：笔记手写版的 `patchChildren`/`patchKeyedChildren` 始终是「不知道哪里变了，只能全量比较」的运行时兜底路径，Patch Flags/Block Tree 的价值正是在这条路径之上叠加一层「编译期已经告诉你答案」的快速通道，两者不是替代关系，而是"能走快速通道就走，走不了就退回这里的全量实现"。


### 💬 面试官视角

**Q1：笔记 12 这一版 `unmount` 只有一行 `hostRemove(vnode.el)`，为什么在当时的场景下够用？什么情况下会暴露它的局限？**

✅ **标准答案**：
笔记 12 的测试场景是 `render(h("div", "hello world"), app)` 之后 `render(null, app)`——单个元素节点，没有子树、没有 Fragment，`hostRemove(vnode.el)` 直接删掉这一个真实 DOM 节点就完全够用。局限会在笔记 13 引入 `unmountChildren`（遍历子节点调用 `unmount`）之后才需要认真考虑：如果某个节点的子节点本身还持有事件监听、定时器等资源，只删父节点的 DOM 不会自动触发子节点资源的清理。

🎁 **加分点**：
Vue 3.4 真实源码的 `unmount` 已经把这个问题解决得很完整——按 `shapeFlag` 分发到组件（走 `unmountComponent` 递归停止 render effect）、Fragment（按 `dynamicChildren`/`children` 卸载）等分支，「三、源码解析」3.4 节有完整代码。笔记的教学节奏是先给出最小可用实现，再在后续章节逐步补全，这也是本文为什么要把「原理」「笔记手写」「真实源码」三个层次分开讲的原因。

**Q2：`patchKeyedChildren` 里为什么要先做 sync from start / sync from end 两轮预处理，而不是一开始就进入乱序比对？**

✅ **标准答案**：
sync from start/end 处理的是「首尾部分没有变化或只是追加/删除」这类最常见的场景，两轮下来能以 O(1) 的分支判断直接复用大部分节点、甚至提前把整个 Diff 过程结束掉（比如只是在末尾追加一条数据）。只有中间剩下「谁也确定不了顺序」的部分才需要进入 5.1/5.2/5.3 三个子步骤（构建 key 映射表、遍历патch、求最长递增子序列），这部分的开销远高于头尾预处理。

🎁 **加分点**：
这个「先处理简单情况、复杂算法留给真正复杂的场景」的设计思路，本质上是一种分层优化——最坏情况下（比如列表被整体倒序）预处理不起作用，退化成完整的乱序比对，但大多数真实业务场景（增删、末尾追加）都能在预处理阶段被高效处理掉，这也是本文 2.4 节和 3.3 节反复强调"和 Vue 2 相比整体设计思路一致，差异在乱序部分怎么求最优解"的原因。

## 💡 六、一张图总结（面试速记）

| 知识点 | 一句话核心 | 面试考察频率 |
|---|---|---|
| 首次渲染流程 | render → patch(null, vnode) → mountElement 递归创建真实 DOM，vnode.el 关联真实节点 | ⭐⭐⭐⭐⭐ |
| patch 类型判断 | isSameVNodeType 判断 type + key 是否都相同，不同则先卸载再挂载 | ⭐⭐⭐⭐⭐ |
| patchElement | 复用 el，先 patchProps 再 patchChildren，两步分离职责清晰 | ⭐⭐⭐⭐ |
| processText / move | 文本节点创建与更新逻辑简单；真实源码的 move 要按 shapeFlag 分发组件/Fragment，并判断是否需要配合 Transition | ⭐⭐⭐ |
| patchChildren 9 种情况 | 归纳为 6 类：文本互换、数组全量 diff、数组与空/文本互转 | ⭐⭐⭐⭐ |
| patchKeyedChildren 五步法 | sync from start/end 快速处理头尾、common sequence 处理增删、unknown sequence 处理乱序 | ⭐⭐⭐⭐⭐ |
| 与 Vue2 双端 Diff 对比 | Vue2 四指针就地查找移动；Vue3 用最长递增子序列求全局最优移动路径 | ⭐⭐⭐⭐⭐ |
| 最长递增子序列 | 贪心 + 二分查找 O(n log n)，只移动不在递增子序列中的节点 | ⭐⭐⭐⭐⭐ |
| Patch Flags | 编译时给动态节点打位标记，运行时按位判断跳过静态部分，O(1) 定位变化 | ⭐⭐⭐⭐⭐ |
| Block Tree | 收集动态子节点到扁平数组，跳过静态子树，只线性遍历 dynamicChildren | ⭐⭐⭐⭐ |
| openBlock / closeBlock（源码解析 3.2 节） | 用 blockStack 栈跟踪 currentBlock，动态节点创建时自动收集进当前 Block；笔记手写实现没有这部分 | ⭐⭐⭐⭐ |
| patchBlockChildren（源码解析 3.2 节） | Block Tree 的运行时消费入口，按下标一一 patch，不做 key 比对，比全量 Diff 更快；笔记手写实现没有这部分 | ⭐⭐⭐⭐ |
| 静态提升 | 纯静态节点提升到 render 函数外，只创建一次，标记 HOISTED 永不参与 diff | ⭐⭐⭐⭐ |
| cacheHandlers | 内联事件处理函数缓存到 _cache 数组，避免每次渲染生成新函数触发子组件更新 | ⭐⭐⭐ |
| Fragment | 无真实包裹 DOM，用起止锚点标记范围，支持组件多根节点 | ⭐⭐⭐⭐ |
| v-once / v-memo | v-once 永久跳过 diff；v-memo 依赖数组比对决定是否跳过子树 diff | ⭐⭐⭐⭐ |
| unmount 完整版 | 按 shapeFlag 分发组件/Fragment/Teleport，KeepAlive 走 deactivate 假卸载，Transition 等动画结束才真正移除 DOM | ⭐⭐⭐⭐ |
| 卸载顺序 | 先递归卸载子树再移除自身 DOM，保证子节点清理逻辑在 DOM 还存在时执行 | ⭐⭐⭐ |
| key 正确使用 | 稳定唯一标识而非 index，Block Tree 下收益更明显 | ⭐⭐⭐⭐ |

---

## 📌 七、手写源码仓库

- https://github.com/lotosv2010/g-vue-next

---

## 📚 八、参考资料

- https://cn.vuejs.org/guide/extras/rendering-mechanism.html
- https://github.com/vuejs/core
- https://jonny-wei.github.io/blog/vue/vue3/diff.html
- https://github.com/wbccb/

---

## 📝 九、留个问题

**思考题**：假设处方药品列表有 5000 条数据，用户在列表顶部新增了一条药品，同时把列表末尾的一条药品移动到了第二位。用本文讲的 `patchKeyedChildren` 五步法分析一下：这个操作会命中哪几步？最长递增子序列会怎么变化？哪些节点需要真正的 DOM 移动，哪些不需要？

提示：
- 先确定 sync from start / sync from end 各自能推进到哪一步
- 再分析乱序部分 `newIndexToOldIndexMap` 大致的形态
- 想清楚"顺序没变但位置变了"和"真正需要移动"之间的区别

欢迎在评论区分享你的推导过程 🤔

---

## 系列导航

> 🔖 这是「Vue 3 全家桶深度拆解系列」第 3 篇。上一篇：《Vue 3 响应式原理与手写实现：Proxy + track/trigger 全链路》。下一篇预告：《Vue 3 组件渲染原理：Text/Comment/Fragment + setup 执行链路全解析》

---

**关注公众号「Coding沉思录」，第一时间获取 Vue 3 全家桶系列更新！**
