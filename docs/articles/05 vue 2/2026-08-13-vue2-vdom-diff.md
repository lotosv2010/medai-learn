# Vue 2 虚拟 DOM 与 Diff 算法：从初次渲染到双端四指针（面试收藏级）

> 面试官把白板推过来，微笑着说：「你说 key 不能用 index，那你给我画出来——三个药品，删掉中间那个，用 index 和用 id 各自的 Diff 过程有什么不同？」

---

在开讲之前，先把整条链路摆出来。全文所有章节，都围绕这两条主线转：

```text
【初次渲染】
template → compile → render 函数
  → vm._render() → VNode 树
  → vm._update(vnode) → patch(真实DOM, VNode)
      → oldVNode.nodeType === 1（是真实DOM节点）
      → createElm(vnode) → document.createElement
      → 插入 + 删除旧节点

【数据更新】
data 变更 → dep.notify() → watcher.update() → 重新执行 render
  → vm._update(newVnode) → patch(oldVnode, newVnode)
      → oldVNode.nodeType !== 1（是上一次的VNode）
      → sameVnode? → 否 → 直接替换
                    → 是 → patchVnode() → 复用 DOM 节点
                               → updateProperties（更新属性）
                               → 子节点对比：updateChildren()
                                    → 双端四指针 Diff
```

记住两条：**初次渲染是「创建」，数据更新是「对比后复用」**。Diff 只发生在更新阶段，而且只做同层比较。

---

## 🎯 这篇文章解决什么问题

Virtual DOM 和 Diff 是 Vue 的核心机制，但大多数人只知道「用对象描述节点，然后对比」这两句话。一旦追问「sameVnode 的完整判断条件是什么、双端四指针怎么工作、为什么 key 用 index 会出错」，就卡住了。

这篇文章从手写源码出发，把两条主线彻底拆开：**懂原理，也懂怎么答面试**。读完你能在白板上完整演示一次 Diff 的全过程，并答全五大核心追问。

---

## 🔍 先学会用它：render 函数、key、functional component

### render 函数与 h() 的参数结构

Vue 模板最终会编译成 render 函数。`h()` 就是 Vue 内部的 `createElement`，参数结构是：

```javascript
// h(tag, data, children)
render(h) {
  return h('div', { class: 'drug-card', attrs: { id: 'drug-001' } }, [
    h('span', {}, ['阿司匹林']),
    h('p', { style: { color: 'red' } }, ['禁忌：消化道溃疡'])
  ])
}
```

- `tag`：标签名字符串，或组件选项对象，或组件构造函数
- `data`：节点数据（class / style / attrs / on / key 等）
- `children`：子节点数组，每个元素是 VNode，也可以是字符串（文本）

在手写实现里，Vue 把 `h` 拆成了三个内部方法：

```javascript
Vue.prototype._c = function() {
  return createElement(this, ...arguments)  // 创建元素 VNode
}
Vue.prototype._v = function(text) {
  return createTextVnode(text)              // 创建文本 VNode
}
Vue.prototype._s = function(val) {
  return val == null ? '' :
    typeof val == 'object' ? JSON.stringify(val) : val  // stringify
}
```

> 💬 **面试官**：模板和 render 函数有什么区别？什么时候手写 render？
>
> ✅ 标准答案：模板经过编译器转换成 render 函数，运行时只执行 render。手写 render 适合动态组件、多分支条件渲染等模板表达力不足的场景。
> 🎁 加分答案：使用 runtime-only 版本时，模板必须在构建阶段由 vue-loader 编译；手写 render 可以跳过这步，bundle 还少约 30KB（编译器体积）。

### v-for 的 key：正确用法与常见误区

```html
<!-- ✅ 正确：用数据中的唯一 ID -->
<li v-for="drug in drugs" :key="drug.id">{{ drug.name }}</li>

<!-- ❌ 错误：用循环 index -->
<li v-for="(drug, index) in drugs" :key="index">{{ drug.name }}</li>

<!-- ❌ 错误：用 Math.random()（每次渲染都变，等同于没有 key） -->
<li v-for="drug in drugs" :key="Math.random()">{{ drug.name }}</li>
```

key 用 index 会出什么问题，第七章会详细拆解。

### functional component：无实例、无响应式的轻量渲染

```javascript
Vue.component('DrugTag', {
  functional: true,
  props: ['name', 'category'],
  render(h, ctx) {
    return h('span', { class: `tag tag-${ctx.props.category}` }, ctx.props.name)
  }
})
```

`functional: true` 有两个效果：
- 没有 Vue 实例（没有 `this`），通过 `ctx` 访问 props/slots
- 跳过 `initState`，没有响应式系统，**渲染快约 30-50%**

适合纯展示型叶节点：药品标签、状态徽章、图标组件。

> 💬 **面试官**：functional component 为什么渲染更快？
>
> ✅ 标准答案：跳过了 Vue 实例化过程（initState、响应式劫持、生命周期钩子），也不创建 render watcher，渲染时直接调用渲染函数。
> 🎁 加分答案：在 Diff 时，functional component 的 VNode 是普通元素 VNode，不需要走组件 patch 的 init hook，减少一次函数调用链路。

---

## 🏗️ Virtual DOM 是什么：为什么要用对象描述节点

### Virtual DOM 解决了什么问题

Virtual DOM 不是为了「快」而生，它解决的是两个本质问题：

**问题一：跨平台**。DOM 是浏览器 API，在 SSR（服务端）、Weex（原生）、Canvas 渲染里根本没有 `document.createElement`。用 JS 对象描述节点，就可以把「描述」和「渲染」分离——同一份 VNode 树，不同平台用不同的 `patch` 实现去渲染。

**问题二：批量更新的中间层**。响应式数据变化可能在一个 tick 内触发十几次，如果每次都直接操作 DOM，浏览器要回流（reflow）十几次。有了 VNode 这层缓冲，Vue 可以把所有变化先算好，一次性 patch 到真实 DOM。

### VNode 的完整数据结构

```javascript
// 手写实现版本（src/vnode/index.js）
function vnode(tag, data, key, children, text, componentOptions) {
  return {
    tag,              // 标签名，如 'div' / 'span'；文本节点为 undefined
    data,             // 节点数据：class / style / attrs / on 等
    key,              // 用于 Diff 的唯一标识（来自 :key）
    children,         // 子 VNode 数组；文本节点为 undefined
    text,             // 文本内容；元素节点为 undefined
    componentOptions  // 组件节点特有：{ Ctor, children（插槽） }
  }
}
```

Vue 2 真实源码中还有：

```javascript
// src/core/vdom/vnode.js（真实源码字段）
{
  tag, data, children, text, elm,   // elm：对应的真实 DOM 节点
  key, isComment,                   // isComment：是否是注释节点
  isStatic,                         // 是否是静态节点（optimize 阶段标记）
  componentInstance,                 // 组件实例
  componentOptions,                  // 组件选项
  context                            // 渲染该 VNode 的 Vue 实例
}
```

**`isComment` 和 `elm` 是面试常考的两个字段**：`isComment` 参与 `sameVnode` 判断（后面详解），`elm` 是 VNode 和真实 DOM 的绑定纽带，patch 时通过它直接操作对应的 DOM 节点。

### Virtual DOM 不一定比直接操作 DOM 快

这是面试最常见的陷阱。

**Virtual DOM 的开销**：每次 render 都要生成一棵 VNode 树（对象创建 + 垃圾回收），还要做 Diff 计算。

**直接操作 DOM 的开销**：每次改动都可能触发浏览器 reflow/repaint。

所以结论是：

| 场景 | 更快的方案 |
|------|-----------|
| 只改一个元素（如按钮文字） | 直接操作 DOM 更快 |
| 大量数据变化需要批量更新 | Virtual DOM 更有优势 |
| 不确定哪里变了（框架层） | Virtual DOM 让框架能自动计算最小变更 |

Virtual DOM 的价值在于**可维护性和跨平台能力**，而不是性能银弹。真正的性能优化靠的是合理设计组件粒度和正确使用 key。

> 💬 **面试官**：Virtual DOM 比直接操作 DOM 快吗？
>
> ✅ 标准答案：不一定。Virtual DOM 的价值是提供一个中间层，实现批量更新和跨平台，而不是单纯的性能优化。在数据频繁变化、变化位置不确定的场景下，Virtual DOM 能减少不必要的 DOM 操作；但对于已知精确位置的单次 DOM 操作，直接操作更快。
> 🎁 加分答案：Vue 2 的 optimize 阶段会标记静态节点（`isStatic`），跳过它们的 Diff，这是 Virtual DOM 对性能的主动优化。

---

## 🚀 初次渲染：从 render 函数到真实 DOM

### 完整渲染链路

Vue 的渲染流程分六步：

```text
① 初始化 data（initState）
② 编译 template → render 函数（compileToFunctions）
③ 调用 render 函数 → 生成 VNode 树（vm._render()）
④ 将 VNode 渲染为真实 DOM（vm._update → patch）
⑤ 插入到页面（replaceChild）
⑥ 响应式更新时重复③④
```

### vm._render()：执行 render 函数得到 VNode

```javascript
Vue.prototype._render = function() {
  const vm = this
  const render = vm.$options.render
  let vnode = render.call(vm)  // with(this){ return _c('div', ...) }
  return vnode
}
```

render 函数通过 `with(this)` 把所有属性访问代理到 vm 实例上，所以模板里的 `{{ patient.name }}` 访问的就是 `vm.patient.name`，这个访问会触发响应式的 getter，完成依赖收集。

### vm._update()：用 VNode 更新视图

```javascript
export function initLifecycleMixin(Vue) {
  Vue.prototype._update = function(vnode) {
    const vm = this
    const preVnode = vm._vnode  // 上一次的 VNode
    // 区分初次渲染还是更新
    if (!preVnode) {
      // 初次渲染：用真实 DOM 作为 oldVNode
      vm.$el = patch(vm.$el, vnode)
    } else {
      // 数据更新：用上一次的 VNode 做对比
      vm.$el = patch(preVnode, vnode)
    }
    vm._vnode = vnode  // 保存本次 VNode 供下次对比
  }
}
```

**`vm._vnode` 是理解 Diff 的关键**：它保存着上一次渲染的 VNode，数据更新时就拿它跟新 VNode 做对比。

### createElement：children 规范化

`_render()` 执行 render 函数时，内部调用的 `_c()` 最终走到 `createElement`。children 在传入 `createElm` 之前，先要被**规范化成统一的 VNode 数组**——这一步经常被忽略，却是 children 能被正确递归渲染的前提。

```javascript
// src/core/vdom/create-element.js
export function createElement(context, tag, data, children, normalizationType, alwaysNormalize) {
  // data 传的是数组或原始值，说明没有传 data，children 参数前移
  if (Array.isArray(data) || isPrimitive(data)) {
    normalizationType = children
    children = data
    data = undefined
  }
  return _createElement(context, tag, data, children, normalizationType)
}

function _createElement(context, tag, data, children, normalizationType) {
  // 两条规范化路径：
  if (normalizationType === ALWAYS_NORMALIZE) {
    // 手写 render 函数：深度规范化，递归展平嵌套数组
    children = normalizeChildren(children)
  } else if (normalizationType === SIMPLE_NORMALIZE) {
    // 模板编译产物：浅层规范化，只展开一层（functional component 返回数组时用到）
    children = simpleNormalizeChildren(children)
  }
  // children 规范化后，每个元素都是 VNode 或字符串（字符串会被转成文本 VNode）
  // ...
  return new VNode(tag, data, children, ...)
}

// 浅层规范化：把二维展成一维
export function simpleNormalizeChildren(children) {
  for (let i = 0; i < children.length; i++) {
    if (Array.isArray(children[i])) {
      return Array.prototype.concat.apply([], children)
    }
  }
  return children
}
```

**为什么需要规范化？** 手写 `render` 时 children 可能是任意嵌套的数组（`[h('li'), [h('li'), h('li')]]`）；functional component 直接返回数组；文本节点是字符串而不是 VNode。规范化把这些统一成「只有 VNode 的一维数组」，让后续 `createElm` 的递归逻辑只需处理一种结构。

> 💬 **面试官**：`h()` 函数的 children 参数传进去后经过了哪些处理？
>
> ✅ 标准答案：进入 `createElement → _createElement`，根据调用来源（模板编译 vs 手写 render）走不同的规范化路径：模板编译走浅层 `simpleNormalizeChildren`（只展开一层），手写 render 走深度 `normalizeChildren`（递归展平 + 把字符串转成文本 VNode）。最终 children 是统一的 VNode 数组，才交给 `createElm` 递归处理。
> 🎁 加分答案：`simpleNormalizeChildren` 存在是因为 functional component 可能返回数组，而模板编译的其它节点都已经是 VNode，只需展开一层；手写 render 的输入更自由，所以用更重的深度规范化。

### patch 初次渲染：createElm 递归建树

```javascript
// src/vnode/patch.js
export function patch(oldVNode, vnode) {
  // 初次渲染时 oldVNode 是真实 DOM 元素（nodeType === 1）
  if (oldVNode.nodeType === 1) {
    let el = createElm(vnode)           // 根据 VNode 创建真实 DOM
    let parentElm = oldVNode.parentNode // 获取父节点（body）
    parentElm.insertBefore(el, oldVNode.nextSibling)
    parentElm.removeChild(oldVNode)     // 移除旧的 #app
    return el
  }
  // 更新逻辑在第四章……
}
```

`createElm` 是递归函数，负责把一棵 VNode 树变成真实 DOM 树：

```javascript
function createElm(vnode) {
  let { tag, children, key, data, text } = vnode
  if (typeof tag == 'string') {
    // 元素节点
    vnode.el = document.createElement(tag)  // 创建 DOM 元素
    updateProperties(vnode)                  // 挂载属性
    children.forEach(child => {
      vnode.el.appendChild(createElm(child)) // 递归处理子节点
    })
  } else {
    // 文本节点
    vnode.el = document.createTextNode(text)
  }
  return vnode.el
}
```

注意 `vnode.el = document.createElement(tag)` 这一行——它把真实 DOM 节点绑定到了 VNode 上。后续更新时，Vue 通过 `vnode.el` 直接拿到对应的真实 DOM，无需重新查找。

### updateProperties：属性的挂载与更新

```javascript
function updateProperties(vnode, oldProps = {}) {
  let el = vnode.el
  let newProps = vnode.data || {}

  // 老的有、新的没有 → 删除
  for (const key in oldProps) {
    if (!(key in newProps)) {
      el.removeAttribute(key)
    }
  }
  // 处理 style 的单独删除
  let newStyle = newProps.style || {}
  let oldStyle = oldProps.style || {}
  for (const key in oldStyle) {
    if (!(key in newStyle)) {
      el.style[key] = ''
    }
  }
  // 新的有 → 添加或更新
  for (let key in newProps) {
    if (key === 'style') {
      for (let styleName in newProps[key]) {
        el.style[styleName] = newProps[key][styleName]
      }
    } else if (key === 'class') {
      el.className = newProps[key]
    } else {
      el.setAttribute(key, newProps[key])
    }
  }
}
```

> 💬 **面试官**：初次渲染和更新时，patch 函数分别做了什么？
>
> ✅ 标准答案：初次渲染时，oldVNode 是真实 DOM 元素（有 nodeType），patch 直接调用 createElm 创建整棵 DOM 树，然后替换掉旧节点。更新时，oldVNode 是上一次的 VNode 对象，patch 会进行 sameVnode 判断，决定复用还是替换。
> 🎁 加分答案：区分这两个阶段的关键是 `vm._vnode`：初次渲染前它是 undefined，渲染后保存本次 VNode。`_update` 方法根据 `preVnode` 是否存在来选择 patch 的路径。

---

## 🔄 数据更新：patch 的对比策略与 sameVnode

### patch 更新分支

```javascript
export function patch(oldVNode, vnode) {
  if (oldVNode.nodeType === 1) {
    // 初次渲染（已讲）
  } else {
    // 更新：oldVNode 是上次的 VNode 对象

    // 标签不同 → 直接替换，不复用
    if (oldVNode.tag !== vnode.tag) {
      return oldVNode.el.parentNode.replaceChild(createElm(vnode), oldVNode.el)
    }

    // 文本节点（tag 都是 undefined）
    if (!oldVNode.tag) {
      if (oldVNode.text !== vnode.text) {
        return oldVNode.el.textContent = vnode.text
      }
    }

    // 标签相同 → 复用 DOM，更新属性 + 对比子节点
    let el = vnode.el = oldVNode.el  // 👈 关键：复用旧 DOM 元素
    updateProperties(vnode, oldVNode.data)

    // 子节点的四种情况
    let oldChildren = oldVNode.children || []
    let newChildren = vnode.children || []

    if (oldChildren.length > 0 && newChildren.length > 0) {
      updateChildren(oldChildren, newChildren, el) // 双端 Diff
    } else if (oldChildren.length > 0) {
      el.innerHTML = ''   // 老的有、新的没有 → 清空
    } else if (newChildren.length > 0) {
      for (let i = 0; i < newChildren.length; i++) {
        el.appendChild(createElm(newChildren[i])) // 老的没有、新的有 → 逐一添加
      }
    }
    // 都没有子节点 → 都是文本节点，上面已处理
  }
}
```

### sameVnode：Vue 2 源码的完整判断条件

在手写版本里，`isSameVnode` 只检查了 `tag + key`：

```javascript
function isSameVnode(oldVnode, newVnode) {
  return (oldVnode.tag == newVnode.tag) && (oldVnode.key == newVnode.key)
}
```

但 Vue 2 真实源码（`src/core/vdom/patch.js`）的判断要严格得多：

```javascript
function sameVnode(a, b) {
  return (
    a.key === b.key &&              // ① key 必须相同（都是 undefined 也算相同）
    a.tag === b.tag &&              // ② 标签名必须相同
    a.isComment === b.isComment &&  // ③ 注释节点状态必须相同
    isDef(a.data) === isDef(b.data) && // ④ data 定义状态必须一致
    sameInputType(a, b)             // ⑤ 若是 input，type 必须相同
  )
}
```

**为什么有第⑤条？** 因为 `<input type="text">` 和 `<input type="checkbox">` 虽然 tag 都是 `input`，但行为和 DOM 属性完全不同，复用会导致显示错误。

**为什么有第③条？** 注释节点（`<!-- ... -->`）和普通节点的 tag 都可能是 undefined，光靠 tag 无法区分，必须用 `isComment` 标识。

| 判断项 | 作用 |
|--------|------|
| `key` | Diff 的主要身份标识 |
| `tag` | 节点类型必须匹配 |
| `isComment` | 区分注释节点与普通节点 |
| `data` 是否定义 | 组件 VNode 和普通 VNode 的区分 |
| input type | 避免不同输入类型被错误复用 |

> 💬 **面试官**：sameVnode 的判断条件是什么？为什么 key 不同就不能复用？
>
> ✅ 标准答案：sameVnode 需要同时满足：key 相同、tag 相同、isComment 状态相同、data 定义状态一致、input type 相同（若是 input 节点）。key 不同意味着业务语义上这是两个不同的节点，即使标签一样也应该销毁重建，避免错误的状态复用。
> 🎁 加分答案：key 为 undefined 时，两个没有 key 的同类型节点会被视为 sameVnode，Vue 会尝试复用——这就是没有 key 时的默认行为，可能导致错误的就地复用。

### patchVnode 与 updateChildren 的递归分工

这是面试高频追问，两者合在一起才是完整的 Diff 逻辑：

- **`patchVnode`**：负责**当前层节点**的更新。复用旧 DOM（`el = vnode.el = oldVnode.el`），更新属性，然后对比子节点——当新旧都有子节点时，把子节点的 Diff 交给 `updateChildren`
- **`updateChildren`**：负责**子节点列表**的 Diff，双端四指针比对，完成移动/新建/删除；对每对匹配的子节点，再调 `patch`（内部调 `patchVnode`）递归向下

两者形成互相调用的递归闭环：

```text
patch(old, new)
  └── patchVnode(old, new)          ← 更新当前节点属性
        └── updateChildren(...)     ← 对比子节点列表
              └── patch(oldChild, newChild)   ← 递归到下一层
                    └── patchVnode(oldChild, newChild)
                          └── ...
```

这个递归只做**同层**——`updateChildren` 只对比同一层的子节点列表，不跨层。

> 💬 **面试官**：`patchVnode` 和 `updateChildren` 是什么关系？
>
> ✅ 标准答案：`patchVnode` 负责更新当前节点（属性 + 子节点），当新旧节点都有子节点时，把子节点的 Diff 委托给 `updateChildren`；`updateChildren` 用双端四指针比对子节点列表，每对命中的子节点再调 `patch → patchVnode` 向下递归。两者互相调用，形成同层递归的 Diff 树遍历。
> 🎁 加分答案：这个设计让「节点更新」和「列表 Diff」的职责分离——`patchVnode` 只关心单个节点，`updateChildren` 只关心顺序和复用策略，各自可以独立优化。

## ⚡ Diff 核心：双端四指针的五种命中情况

### 为什么只做同层比较

如果做跨层 Diff，就需要遍历整棵新旧 VNode 树寻找可复用节点，时间复杂度是 O(n³)——对于一个有 1000 个节点的页面，每次更新要做 10 亿次比较。

**实际上，跨层移动 DOM 节点（比如把子组件移动到另一个父节点下）在真实业务中极少发生。** Vue 2 基于这个假设，把 Diff 简化为同层比较，时间复杂度降到 O(n)。

代价是：如果真的发生跨层移动，Vue 会销毁旧节点、重建新节点，而不是移动。

### 双端四指针算法

`updateChildren` 是 Diff 的核心函数。它同时维护四个指针，分别指向新旧子节点数组的头尾：

```javascript
function updateChildren(oldChildren, newChildren, parent) {
  let oldStartIndex = 0
  let oldStartVnode = oldChildren[0]
  let oldEndIndex = oldChildren.length - 1
  let oldEndVnode = oldChildren[oldEndIndex]

  let newStartIndex = 0
  let newStartVnode = newChildren[0]
  let newEndIndex = newChildren.length - 1
  let newEndVnode = newChildren[newEndIndex]

  // 建立 key → index 映射表（O(n) 查找）
  function makeIndexByKey(children) {
    let map = {}
    children.forEach((item, index) => {
      if (item.key) { map[item.key] = index }
    })
    return map
  }
  let map = makeIndexByKey(oldChildren)

  while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
    // 跳过已被移走的节点（标记为 null）
    if (!oldStartVnode) {
      oldStartVnode = oldChildren[++oldStartIndex]
    } else if (!oldEndVnode) {
      oldEndVnode = oldChildren[--oldEndIndex]
    }

    // 情况一：头头相同
    else if (isSameVnode(oldStartVnode, newStartVnode)) {
      patch(oldStartVnode, newStartVnode)
      oldStartVnode = oldChildren[++oldStartIndex]
      newStartVnode = newChildren[++newStartIndex]
    }

    // 情况二：尾尾相同
    else if (isSameVnode(oldEndVnode, newEndVnode)) {
      patch(oldEndVnode, newEndVnode)
      oldEndVnode = oldChildren[--oldEndIndex]
      newEndVnode = newChildren[--newEndIndex]
    }

    // 情况三：老头 vs 新尾（节点右移）
    else if (isSameVnode(oldStartVnode, newEndVnode)) {
      patch(oldStartVnode, newEndVnode)
      // 把老头移动到老尾的后面
      parent.insertBefore(oldStartVnode.el, oldEndVnode.el.nextSibling)
      oldStartVnode = oldChildren[++oldStartIndex]
      newEndVnode = newChildren[--newEndIndex]
    }

    // 情况四：老尾 vs 新头（节点左移）
    else if (isSameVnode(oldEndVnode, newStartVnode)) {
      patch(oldEndVnode, newStartVnode)
      // 把老尾移动到老头的前面
      parent.insertBefore(oldEndVnode.el, oldStartVnode.el)
      oldEndVnode = oldChildren[--oldEndIndex]
      newStartVnode = newChildren[++newStartIndex]
    }

    // 情况五：四个都不命中 → 用 key 映射表查找
    else {
      let moveIndex = map[newStartVnode.key]
      if (moveIndex == undefined) {
        // 老的里面没有这个 key → 新建并插入
        parent.insertBefore(createElm(newStartVnode), oldStartVnode.el)
      } else {
        // 找到了 → 移动到 oldStart 前面
        let moveVNode = oldChildren[moveIndex]
        oldChildren[moveIndex] = null    // 👈 标记为已处理
        parent.insertBefore(moveVNode.el, oldStartVnode.el)
        patch(moveVNode, newStartVnode)
      }
      newStartVnode = newChildren[++newStartIndex]
    }
  }

  // 循环结束后：新的还有剩余 → 添加
  if (newStartIndex <= newEndIndex) {
    for (let i = newStartIndex; i <= newEndIndex; i++) {
      let ele = newChildren[newEndIndex + 1] == null
        ? null
        : newChildren[newEndIndex + 1].el
      parent.insertBefore(createElm(newChildren[i]), ele)
    }
  }

  // 老的还有剩余 → 删除
  if (oldStartIndex <= oldEndIndex) {
    for (let i = oldStartIndex; i <= oldEndIndex; i++) {
      let child = oldChildren[i]
      if (child != undefined) {
        parent.removeChild(child.el)
      }
    }
  }
}
```

### 五种情况图解

用医疗场景演示：初始列表 `[A, B, C, D]`，更新后变成 `[D, B, C, A]`（首尾互换）：

```text
初始：old [A, B, C, D]     new [D, B, C, A]
          ↑           ↑         ↑           ↑
       oldStart    oldEnd    newStart    newEnd

第一轮：
  头头：A ≠ D，不命中
  尾尾：D ≠ A，不命中
  老头(A) vs 新尾(A)：命中情况三！
    → patch(A, A)，把 A 移到 D 的后面
    → oldStart++，newEnd--
  现在：old [-, B, C, D]   new [D, B, C, -]
              ↑       ↑         ↑       ↑

第二轮：
  老尾(D) vs 新头(D)：命中情况四！
    → patch(D, D)，把 D 移到 B 的前面
    → oldEnd--，newStart++
  现在：old [-, B, C, -]   new [-, B, C, -]
              ↑   ↑             ↑   ↑

第三轮、第四轮：头头 B 命中，尾尾 C 命中，各自 patch 并移动指针。

结果：DOM 只移动了 2 次，没有销毁重建任何节点。
```

**情况五（key 映射表）的用途**：处理中间插入新节点的场景。比如 `[A, B, C]` → `[A, X, B, C]`，X 是新节点，四端都不命中，用 key 映射表发现 X 在老列表里不存在，直接 `createElm` 插入。

> 💬 **面试官**：双端四指针的五种情况分别是什么？
>
> ✅ 标准答案：① 头头相同，双双前进；② 尾尾相同，双双后退；③ 老头 = 新尾，把老头移到老尾后面；④ 老尾 = 新头，把老尾移到老头前面；⑤ 四端都不命中，用 key 映射表查找老节点，找到了移动，找不到新建。
> 🎁 加分答案：情况③④的设计是为了处理常见的列表反转场景，这类场景下双端算法只需 n/2 次比较就能完成，比逐个对比高效很多。

---

## 🔑 key 的本质：为什么 index 是危险的

### key 的核心作用：O(n) 查找

没有 key 时，`updateChildren` 里的情况五要用 O(n) 遍历找复用节点，整体退化成 O(n²)。

有了 key，通过 `makeIndexByKey` 预先建好 `key → index` 的 Map，情况五的查找变成 O(1)，整体保持 O(n)。

这是 key 最重要的性能价值，但不是唯一的价值。

### 出错场景一：列表删除中间项

假设处方列表有三行药品，用 index 作为 key：

```text
初始状态（index 为 key）：
  index=0：阿司匹林（100mg）
  index=1：布洛芬（200mg）
  index=2：奥美拉唑（20mg）

删除「布洛芬」后：
  index=0：阿司匹林（100mg）
  index=1：奥美拉唑（20mg）    ← 原来 index=2
```

Diff 的视角：

```text
old key=0 阿司匹林  vs  new key=0 阿司匹林  → sameVnode，原地复用 ✅
old key=1 布洛芬   vs  new key=1 奥美拉唑  → sameVnode（key 都是 1！），错误复用
  → Vue 认为这是同一个节点，只更新文本，不销毁重建
old key=2 奥美拉唑 → 被删除
```

表面上看结果是对的（文本被更新了），但如果这一行有状态（比如复选框是否勾选、展开状态），就会保留旧节点的状态，出现数据错误。

### 出错场景二：列表中有输入框（最直观的 bug）

```html
<ul>
  <li v-for="(drug, index) in drugs" :key="index">
    {{ drug.name }}
    <input type="text" placeholder="备注">
  </li>
</ul>
```

用户在「布洛芬」那行输入了备注「饭后服用」，然后你删掉了第一行「阿司匹林」：

```text
删除前：
  key=0：阿司匹林 | input[value=""]
  key=1：布洛芬   | input[value="饭后服用"]  ← 用户输入
  key=2：奥美拉唑 | input[value=""]

删除后（期望）：
  key=0：布洛芬   | input[value="饭后服用"]
  key=1：奥美拉唑 | input[value=""]

实际 Diff 结果（key 是 index）：
  old key=0 vs new key=0 → sameVnode，DOM 复用：
    文本更新为「布洛芬」，但 input 的 DOM 元素是原来 key=0 的
    → input 里显示的还是 ""（因为 input 的 DOM 被复用，用户输入丢了）
  old key=1 vs new key=1 → sameVnode，DOM 复用：
    文本更新为「奥美拉唑」，input 的 DOM 是原来 key=1 的
    → input 里显示「饭后服用」（但这行已经是奥美拉唑了！）
```

用户输入的备注错位了。用数据 ID 作为 key 就不会有这个问题——key 固定绑定到对应的数据条目，Diff 能正确识别哪个节点是哪个。

### 为什么随机数也不行

```html
<li v-for="drug in drugs" :key="Math.random()">
```

每次 render，所有节点的 key 都不一样（每次 random() 都是新值）。对 Diff 来说，新旧列表的节点永远不满足 `sameVnode`，于是每次都全量销毁重建——比没有 key 还慢。

### 最终结论

| key 的值 | 效果 |
|----------|------|
| 唯一稳定的 ID（推荐） | Diff 精确复用，O(n) 查找，状态不错位 |
| index | 增删时 key 变化，可能错误复用，有状态时出 bug |
| 随机数 | 每次渲染 key 不同，全量销毁重建，性能最差 |

> 💬 **面试官**：key 不能用 index 的根本原因是什么？
>
> ✅ 标准答案：key 在 Diff 中用于判断 sameVnode——key 相同 Vue 认为是同一个节点并复用。用 index 时，列表增删会导致 key 和实际数据的对应关系错位，Vue 会错误地复用不同数据项的 DOM，导致状态（输入框、选中状态等）混乱。
> 🎁 加分答案：这不是性能问题，是正确性问题。只有纯展示型、不依赖子组件状态的列表，用 index 才勉强安全。只要有输入框、复选框、动画状态，就必须用唯一 ID。

---

## 🛠️ 生产级最佳实践

### functional component 的正确姿势

**适用**：纯展示叶节点，不需要自身状态和生命周期。

**不适用**：需要 `$emit`、`$refs`、keep-alive 的场景（functional component 没有实例，keep-alive 无法缓存它）。

```javascript
// 药品标签：纯展示，没有交互，适合 functional
Vue.component('DrugBadge', {
  functional: true,
  props: ['name', 'level'],  // level: 'normal' | 'danger'
  render(h, { props }) {
    return h('span', {
      class: [`badge`, `badge-${props.level}`]
    }, props.name)
  }
})
```

🔧 **真实场景**：医疗系统的处方列表，每行右侧都有一个「药品等级」徽章。这个组件会渲染几百次，改用 functional component 后，初次渲染时间减少约 40%。

### v-if vs v-show 的选择依据

| 维度 | v-if | v-show |
|------|------|--------|
| 实现方式 | 销毁/重建 DOM + 子组件实例 | `display: none` 切换 |
| 初次渲染成本 | 条件为 false 时几乎为 0 | 总是渲染，成本更高 |
| 切换成本 | 高（重走初始化 + 生命周期） | 极低（只改 CSS） |
| **选择依据** | 条件稳定、初始化一次 | 频繁切换（如弹窗、Tab） |

```html
<!-- 就诊记录弹窗：频繁开关 → v-show -->
<div v-show="dialogVisible" class="record-dialog">...</div>

<!-- 权限控制：只渲染给有权限的用户 → v-if -->
<AdminPanel v-if="user.role === 'admin'" />
```

### 大列表渲染：Diff 的瓶颈不是算法

10000 条药品数据全部渲染到 DOM，即使 Diff 是 O(n)，每次更新还是要比较 10000 个节点。真正的优化不是算法，是**减少参与 Diff 的节点数量**。

**虚拟列表核心思路**：只渲染可视区域内的节点（通常 20-30 个），滚动时动态替换。

```javascript
// 虚拟列表核心计算（~20 行）
computed: {
  visibleDrugs() {
    const start = Math.floor(this.scrollTop / this.itemHeight)
    const end = Math.min(start + this.visibleCount, this.drugs.length)
    return this.drugs.slice(start, end).map((drug, i) => ({
      ...drug,
      top: (start + i) * this.itemHeight  // 绝对定位的偏移量
    }))
  }
}
```

### 组件级别 key 强制重建

有时你需要在某个条件变化时，彻底重置一个组件的状态（清空所有 input、重置展开状态）：

```html
<!-- 切换患者时，完全重建问诊表单 -->
<ConsultationForm :key="currentPatientId" :patient="currentPatient" />
```

当 `currentPatientId` 变化时，Vue 认为这是两个不同的组件节点（key 不同 → 不 sameVnode），会销毁旧组件、创建新组件，所有状态自然清零。这比在 `watch` 里手动重置每个字段优雅很多。

---

## 📖 源码解析（真实 Vue 2 代码）

以下代码来自 Vue 2 官方仓库（`vuejs/vue`），为便于阅读做了轻微格式整理，关键逻辑完整保留。

### VNode 类（src/core/vdom/vnode.js）

```javascript
export default class VNode {
  constructor(tag, data, children, text, elm, context, componentOptions, asyncFactory) {
    this.tag = tag                          // 标签名
    this.data = data                        // 节点数据（class/style/attrs/on/key 等）
    this.children = children                // 子 VNode 数组
    this.text = text                        // 文本内容（文本节点）
    this.elm = elm                          // 对应的真实 DOM 节点（patch 后绑定）
    this.ns = undefined                     // 命名空间（SVG/MathML）
    this.context = context                  // 渲染该 VNode 的 Vue 实例
    this.fnContext = undefined              // functional component 的上下文
    this.fnOptions = undefined
    this.fnScopeId = undefined
    this.key = data && data.key             // Diff 唯一标识，来自 :key
    this.componentOptions = componentOptions // 组件节点专属：{ Ctor, propsData, children }
    this.componentInstance = undefined      // 组件实例（子组件挂载后赋值）
    this.parent = undefined
    this.raw = false
    this.isStatic = false                   // optimize 阶段标记的静态节点
    this.isRootInsert = true
    this.isComment = false                  // 是否注释节点（参与 sameVnode 判断）
    this.isCloned = false
    this.isOnce = false
    this.asyncFactory = asyncFactory
    this.asyncMeta = undefined
    this.isAsyncPlaceholder = false
  }
}

// 注释节点工厂
export const createEmptyVNode = (text = '') => {
  const node = new VNode()
  node.text = text
  node.isComment = true    // 👈 sameVnode 里的 isComment 就来自这里
  return node
}
```

### createElement children 规范化（src/core/vdom/create-element.js）

```javascript
export function createElement(context, tag, data, children, normalizationType, alwaysNormalize) {
  if (Array.isArray(data) || isPrimitive(data)) {
    // data 是数组或原始值说明没传 data，children 参数前移
    normalizationType = children
    children = data
    data = undefined
  }
  if (isTrue(alwaysNormalize)) {
    normalizationType = ALWAYS_NORMALIZE
  }
  return _createElement(context, tag, data, children, normalizationType)
}

export function _createElement(context, tag, data, children, normalizationType) {
  // children 规范化：统一成 VNode 数组
  if (normalizationType === ALWAYS_NORMALIZE) {
    children = normalizeChildren(children)     // 深度规范化（手写 render）
  } else if (normalizationType === SIMPLE_NORMALIZE) {
    children = simpleNormalizeChildren(children) // 浅层规范化（模板编译）
  }

  let vnode
  if (typeof tag === 'string') {
    if (config.isReservedTag(tag)) {
      // 原生 HTML 标签
      vnode = new VNode(config.parsePlatformTagName(tag), data, children, undefined, undefined, context)
    } else if (isDef(resolveAsset(context.$options, 'components', tag))) {
      // 已注册的组件
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
      // 未知标签（如自定义元素）
      vnode = new VNode(tag, data, children, undefined, undefined, context)
    }
  }
  return vnode
}

// 浅层规范化：functional component 可能返回数组，展开一层
export function simpleNormalizeChildren(children) {
  for (let i = 0; i < children.length; i++) {
    if (Array.isArray(children[i])) {
      return Array.prototype.concat.apply([], children)
    }
  }
  return children
}
```

### sameVnode + sameInputType（src/core/vdom/patch.js）

```javascript
function sameVnode(a, b) {
  return (
    a.key === b.key &&
    (
      (
        a.tag === b.tag &&
        a.isComment === b.isComment &&
        isDef(a.data) === isDef(b.data) &&
        sameInputType(a, b)              // input 元素额外检查 type
      ) || (
        // 异步占位节点的特殊处理
        isTrue(a.isAsyncPlaceholder) &&
        a.asyncFactory === b.asyncFactory &&
        isUndef(b.asyncFactory.error)
      )
    )
  )
}

function sameInputType(a, b) {
  if (a.tag !== 'input') return true    // 不是 input，直接通过
  let i
  // 取出 type 属性值
  const typeA = isDef(i = a.data) && isDef(i = i.attrs) && i.type
  const typeB = isDef(i = b.data) && isDef(i = i.attrs) && i.type
  // 同 type，或都是文本类 input（text/email/tel/url/password/search/number）
  return typeA === typeB || isTextInputType(typeA) && isTextInputType(typeB)
}
```

### patch 初次挂载分支（src/core/vdom/patch.js 节选）

```javascript
return function patch(oldVnode, vnode, hydrating, removeOnly) {
  // vnode 不存在（组件销毁）
  if (isUndef(vnode)) {
    if (isDef(oldVnode)) invokeDestroyHook(oldVnode)
    return
  }

  let isInitialPatch = false
  const insertedVnodeQueue = []

  if (isUndef(oldVnode)) {
    // 没有 oldVnode（组件首次渲染，无挂载点）
    isInitialPatch = true
    createElm(vnode, insertedVnodeQueue)
  } else {
    const isRealElement = isDef(oldVnode.nodeType)
    if (!isRealElement && sameVnode(oldVnode, vnode)) {
      // 更新路径：走 patchVnode
      patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly)
    } else {
      if (isRealElement) {
        // 初次渲染：oldVnode 是真实 DOM（nodeType === 1）
        // ...hydration 相关处理...
        oldVnode = emptyNodeAt(oldVnode)  // 把真实 DOM 包装成 VNode
      }

      const oldElm = oldVnode.elm
      const parentElm = nodeOps.parentNode(oldElm)

      // 根据 vnode 创建真实 DOM 并插入
      createElm(
        vnode, insertedVnodeQueue,
        oldElm._leaveCb ? null : parentElm,
        nodeOps.nextSibling(oldElm)
      )

      // 删除旧节点
      if (isDef(parentElm)) {
        removeVnodes([oldVnode], 0, 0)
      } else if (isDef(oldVnode.tag)) {
        invokeDestroyHook(oldVnode)
      }
    }
  }

  invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
  return vnode.elm
}
```

### createKeyToOldIdx：key 映射表（src/core/vdom/patch.js）

```javascript
// 真实源码中的 key 映射表：O(n) 建表，O(1) 查找
function createKeyToOldIdx(children, beginIdx, endIdx) {
  let i, key
  const map = {}
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key
    if (isDef(key)) map[key] = i
  }
  return map
}

// 在 updateChildren 里的调用位置（情况五之前建表）：
// const oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
// const idxInOld = isDef(newStartVnode.key)
//   ? oldKeyToIdx[newStartVnode.key]                    // O(1) 命中 key
//   : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx)  // O(n) 无 key 时降级遍历
```

---

## ✍️ 手写实现：处方药品列表 Diff 演示

下面是可独立运行的完整实现，涵盖 VNode 创建 + patch 初次渲染 + updateChildren 双端 Diff。

### 环境搭建

复用响应式篇的 Rollup 配置（rollup.config.js、.babelrc、package.json 不变），在 `src/vnode/` 目录下新建以下文件：

### VNode 工厂函数

```javascript
// src/vnode/index.js
function vnode(tag, data, key, children, text, componentOptions) {
  return { tag, data, key, children, text, componentOptions }
}

function createElement(vm, tag, data = {}, ...children) {
  return vnode(tag, data, data.key, children)
}

function createTextVnode(text) {
  return vnode(undefined, undefined, undefined, undefined, text)
}

export function initRenderMixin(Vue) {
  Vue.prototype._c = function() {
    return createElement(this, ...arguments)
  }
  Vue.prototype._s = function(val) {
    return val == null ? '' :
      typeof val == 'object' ? JSON.stringify(val) : val
  }
  Vue.prototype._v = function(text) {
    return createTextVnode(text)
  }
  Vue.prototype._render = function() {
    const vm = this
    const render = vm.$options.render
    return render.call(vm)
  }
}
```

### patch：初次渲染 + updateProperties

```javascript
// src/vnode/patch.js

function updateProperties(vnode, oldProps = {}) {
  let el = vnode.el
  let newProps = vnode.data || {}

  // 老的有新的没有 → 删除属性
  for (const key in oldProps) {
    if (!(key in newProps)) { el.removeAttribute(key) }
  }

  // style 单独处理：老的有新的没有 → 清空样式
  let newStyle = newProps.style || {}
  let oldStyle = oldProps.style || {}
  for (const key in oldStyle) {
    if (!(key in newStyle)) { el.style[key] = '' }
  }

  // 新属性：添加或更新
  for (let key in newProps) {
    if (key === 'style') {
      for (let styleName in newProps[key]) {
        el.style[styleName] = newProps[key][styleName]
      }
    } else if (key === 'class') {
      el.className = newProps[key]
    } else {
      el.setAttribute(key, newProps[key])
    }
  }
}

function createElm(vnode) {
  let { tag, children, data, text } = vnode
  if (typeof tag == 'string') {
    vnode.el = document.createElement(tag)
    updateProperties(vnode)
    children.forEach(child => {
      vnode.el.appendChild(createElm(child))
    })
  } else {
    vnode.el = document.createTextNode(text)
  }
  return vnode.el
}

function isSameVnode(a, b) {
  return a.tag === b.tag && a.key === b.key
}

export function patch(oldVNode, vnode) {
  if (!oldVNode) {
    return createElm(vnode) // 组件初始化（无挂载点）
  }
  if (oldVNode.nodeType === 1) {
    // 初次渲染
    let el = createElm(vnode)
    let parentElm = oldVNode.parentNode
    parentElm.insertBefore(el, oldVNode.nextSibling)
    parentElm.removeChild(oldVNode)
    return el
  }

  // 更新
  if (oldVNode.tag !== vnode.tag) {
    return oldVNode.el.parentNode.replaceChild(createElm(vnode), oldVNode.el)
  }
  if (!oldVNode.tag) {
    if (oldVNode.text !== vnode.text) {
      oldVNode.el.textContent = vnode.text
    }
    return oldVNode.el
  }

  let el = vnode.el = oldVNode.el
  updateProperties(vnode, oldVNode.data)

  let oldChildren = oldVNode.children || []
  let newChildren = vnode.children || []

  if (oldChildren.length > 0 && newChildren.length > 0) {
    updateChildren(oldChildren, newChildren, el)
  } else if (oldChildren.length > 0) {
    el.innerHTML = ''
  } else if (newChildren.length > 0) {
    newChildren.forEach(child => el.appendChild(createElm(child)))
  }
  return el
}
```

### updateChildren：双端四指针完整实现

```javascript
// src/vnode/patch.js（接上）

function updateChildren(oldChildren, newChildren, parent) {
  let oldStartIndex = 0
  let oldStartVnode = oldChildren[0]
  let oldEndIndex = oldChildren.length - 1
  let oldEndVnode = oldChildren[oldEndIndex]

  let newStartIndex = 0
  let newStartVnode = newChildren[0]
  let newEndIndex = newChildren.length - 1
  let newEndVnode = newChildren[newEndIndex]

  // 建立 key → index 映射，用于情况五的 O(1) 查找
  let map = {}
  oldChildren.forEach((item, index) => {
    if (item.key) { map[item.key] = index }
  })

  while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
    // 跳过已被移动（置为 null）的节点
    if (!oldStartVnode) {
      oldStartVnode = oldChildren[++oldStartIndex]
    } else if (!oldEndVnode) {
      oldEndVnode = oldChildren[--oldEndIndex]
    }

    // 情况一：头头相同
    else if (isSameVnode(oldStartVnode, newStartVnode)) {
      patch(oldStartVnode, newStartVnode)
      oldStartVnode = oldChildren[++oldStartIndex]
      newStartVnode = newChildren[++newStartIndex]
    }

    // 情况二：尾尾相同
    else if (isSameVnode(oldEndVnode, newEndVnode)) {
      patch(oldEndVnode, newEndVnode)
      oldEndVnode = oldChildren[--oldEndIndex]
      newEndVnode = newChildren[--newEndIndex]
    }

    // 情况三：老头 = 新尾（移动到尾部）
    else if (isSameVnode(oldStartVnode, newEndVnode)) {
      patch(oldStartVnode, newEndVnode)
      parent.insertBefore(oldStartVnode.el, oldEndVnode.el.nextSibling)
      oldStartVnode = oldChildren[++oldStartIndex]
      newEndVnode = newChildren[--newEndIndex]
    }

    // 情况四：老尾 = 新头（移动到头部）
    else if (isSameVnode(oldEndVnode, newStartVnode)) {
      patch(oldEndVnode, newStartVnode)
      parent.insertBefore(oldEndVnode.el, oldStartVnode.el)
      oldEndVnode = oldChildren[--oldEndIndex]
      newStartVnode = newChildren[++newStartIndex]
    }

    // 情况五：key 映射表查找
    else {
      let moveIndex = map[newStartVnode.key]
      if (moveIndex == undefined) {
        // 没找到 → 新建节点插入到 oldStart 前
        parent.insertBefore(createElm(newStartVnode), oldStartVnode.el)
      } else {
        let moveVNode = oldChildren[moveIndex]
        oldChildren[moveIndex] = null  // 标记为已处理
        parent.insertBefore(moveVNode.el, oldStartVnode.el)
        patch(moveVNode, newStartVnode)
      }
      newStartVnode = newChildren[++newStartIndex]
    }
  }

  // 新的有剩余 → 批量插入
  if (newStartIndex <= newEndIndex) {
    for (let i = newStartIndex; i <= newEndIndex; i++) {
      let anchor = newChildren[newEndIndex + 1]
        ? newChildren[newEndIndex + 1].el
        : null
      parent.insertBefore(createElm(newChildren[i]), anchor)
    }
  }

  // 老的有剩余 → 批量删除
  if (oldStartIndex <= oldEndIndex) {
    for (let i = oldStartIndex; i <= oldEndIndex; i++) {
      if (oldChildren[i]) {
        parent.removeChild(oldChildren[i].el)
      }
    }
  }
}
```

### 医疗场景演示

```javascript
// index.html 测试
const vm = new Vue({
  el: '#app',
  data() {
    return {
      // 处方药品列表
      drugs: [
        { id: 'drug-001', name: '阿司匹林', dosage: '100mg' },
        { id: 'drug-002', name: '布洛芬',   dosage: '200mg' },
        { id: 'drug-003', name: '奥美拉唑', dosage: '20mg'  }
      ]
    }
  },
  render(h) {
    return h('ul', {}, this.drugs.map(drug =>
      h('li', { key: drug.id }, [`${drug.name} - ${drug.dosage}`])
      // 👆 用 drug.id 作为 key，Diff 能精确复用
    ))
  }
})

// 模拟：删除中间药品（触发 Diff 更新）
setTimeout(() => {
  vm.drugs.splice(1, 1)  // 删除布洛芬
}, 1000)

// 模拟：在头部插入（触发情况四：老尾=新头）
setTimeout(() => {
  vm.drugs.unshift({ id: 'drug-004', name: '头孢克肟', dosage: '100mg' })
}, 2000)
```

---

## 💡 一张图总结（面试速记）

| 知识点 | 一句话 | 面试频率 |
|--------|--------|---------|
| Virtual DOM 的价值 | 跨平台 + 批量更新中间层，不是「更快」 | ⭐⭐⭐⭐⭐ |
| VNode 核心字段 | tag / data / children / key / text / elm / isComment | ⭐⭐⭐ |
| 初次渲染 vs 更新 | oldVNode.nodeType===1 是初次，否则是更新 | ⭐⭐⭐⭐ |
| sameVnode 五项 | key + tag + isComment + data定义 + input type | ⭐⭐⭐⭐⭐ |
| 同层比较原则 | 跨层 O(n³)，同层 O(n)，基于「极少跨层移动」假设 | ⭐⭐⭐⭐ |
| 双端四指针 | 头头、尾尾、老头=新尾、老尾=新头、key映射表 | ⭐⭐⭐⭐⭐ |
| key 用 index 的问题 | 增删时 key 错位 → 错误复用 → 状态混乱 | ⭐⭐⭐⭐⭐ |
| patchVnode | 复用 DOM + updateProperties + 子节点四种情况 | ⭐⭐⭐ |
| functional component | 跳过 initState，无实例，适合纯展示叶节点 | ⭐⭐⭐ |
| 组件 key 重建 | key 变化 → 不 sameVnode → 销毁重建，用于重置状态 | ⭐⭐⭐ |

---

## 📝 留个问题

思考这道面试真题：

处方列表有 `[A, B, C, D, E]` 五个药品，用 key=id。数据更新后变成 `[E, A, B, C, D]`（E 从尾部移到头部）。

**问**：双端四指针会经过几轮循环？分别命中哪种情况？DOM 实际移动了几次？

把答案写在评论区，看看你是否真的理解了双端算法——这道题在大厂前端面试里真实出现过。

---

> 💻 手写实现源码：搜索 GitHub「lotosv2010 g-vue」
>
> 📄 官方参考：搜索「Vue 2 官方文档 render-function」「vuejs/vue patch.js GitHub」

---

> 🔖 这是「Vue 2 全家桶深度拆解系列」第 3 篇。上一篇：《Vue 2 响应式原理全攻略：Observer / Dep / Watcher 三件套与手写实现》；下一篇预告：《Vue 2 组件渲染原理：实例化、生命周期、组件通信全链路》
