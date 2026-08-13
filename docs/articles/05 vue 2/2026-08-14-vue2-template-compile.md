# Vue 2 模板编译原理：parse → optimize → generate 三步拆解（面试收藏级）

> 面试官把屏幕推过来，指着一行代码问：「`<input v-model="drugName">` 编译之后是什么？组件上的 `v-model` 和原生标签有什么本质区别？」你知道 v-model 是语法糖，却说不清糖化成了什么……今天，把这道题从编译器源码层面彻底答完。

---

在看细节之前，先把整条主线摆出来。**全文章节顺序就是这条编译链路的展开**：

```text
【模板编译完整链路】

① 入口决策
   runtime+compiler：运行时 compileToFunctions（浏览器中编译）
   runtime-only + vue-loader：构建时编译（webpack/vite 打包阶段完成）
                                        ↓
② parse 阶段
   template 字符串
     → 正则逐字符扫描（startTagOpen / endTag / attribute / defaultTagRE）
     → stack 栈维护父子关系
     → 生成 AST 树（tag / type / children / attrs / parent）
                                        ↓
③ optimize 阶段
   遍历 AST，深度优先打 static / staticRoot 标记
   → 静态根节点在 patch 时跳过 Diff，直接复用
                                        ↓
④ generate 阶段
   AST → render 函数字符串（_c / _v / _s / _l 辅助函数）
     → new Function(`with(this){ return ${code} }`)
     → 真正可执行的 render 函数
                                        ↓
⑤ 运行时执行
   render.call(vm) → VNode 树 → patch → 真实 DOM
```

记住一句话：**模板编译的终点是 render 函数，运行时永远只认识 VNode，不认识 template**。

---

## 🎯 这篇文章解决什么问题

大多数 Vue 开发者能熟练写模板，却说不清三件事：`template` 是怎么变成 `render` 函数的、`v-model` 语法糖背后具体展开成什么代码、`v-for` 和 `v-if` 优先级问题为什么出在编译阶段。

这篇文章沿 parse → optimize → generate 这条编译链路，把 Vue 2 模板编译器从入口到产物逐环拆开：**懂原理，也懂怎么答面试**。读完你能在白板上画出完整编译流程，并答全五大核心追问。

---

## 🔤 一、三个编译入口：template 是怎么走到 render 的

> 链路位置：① 入口决策

### runtime+compiler vs runtime-only

Vue 2 有三个构建产物，编译器的有无决定了体积差异：

| 版本 | 是否包含编译器 | 体积（gzip 前） | 编译时机 |
|------|-------------|--------------|---------|
| `vue.js`（完整版） | ✅ 包含 | ~33KB | 运行时在浏览器中编译 |
| `vue.runtime.js` | ❌ 不含 | ~23KB | 构建时由 vue-loader 编译 |
| `vue.esm.js` | ✅ 包含 | ~33KB | 运行时编译（ES Module 格式） |

**差了约 10KB（gzip 后）**，在实际项目中，vue-cli 和 vite 默认都使用 `runtime-only` 版本，配合 vue-loader 在打包阶段就把 `.vue` 文件里的 `<template>` 编译成 `render` 函数，生产包里不携带编译器。

### $mount 中的 compileToFunctions 调用链

当使用完整版时，编译发生在 `$mount` 中。如果没有传入 `render` 函数，Vue 就会找 `template` 并在运行时编译：

```javascript
// src/init.js（手写实现版）
import { initState } from "./state"
import { compileToFunctions } from './compiler/index'

export function initMixin(Vue) {
  Vue.prototype._init = function(options) {
    const vm = this
    vm.$options = options
    initState(vm)

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }

  Vue.prototype.$mount = function(el) {
    const vm = this
    const options = vm.$options
    el = document.querySelector(el)
    vm.$el = el

    if (!options.render) {
      let template = options.template
      if (!template && el) {
        template = el.outerHTML
      }
      // 将模板编译成 render 函数
      const render = compileToFunctions(template)
      options.render = render
    }
  }
}
```

`compileToFunctions` 是编译的总入口，它串联了 parse → optimize → generate 三个阶段，最终返回一个可执行的 `render` 函数。

### vue-loader 把编译提前到构建阶段

`vue-loader` 在 webpack 处理 `.vue` 文件时，把 `<template>` 块提取出来，交给 `vue-template-compiler` 在 Node.js 中编译成 `render` 函数字符串，再注入到输出的 JS 模块里。用户浏览器拿到的是**已经编译好的 render 函数**，不需要在浏览器中再做编译。

> 💬 **面试官**：runtime-only 和 runtime+compiler 两个版本为什么体积差约 10KB？
>
> ✅ 标准答案：runtime+compiler 包含了模板编译器（约 10KB gzip 后），它在运行时把 template 字符串编译成 render 函数；runtime-only 不含编译器，模板编译由 vue-loader 在构建阶段完成，生产包体积更小。
> 🎁 加分答案：vue-loader 调用的是 vue-template-compiler（Node.js 环境），和完整版 Vue 内置的编译器是同一套代码，只是执行环境不同。构建时编译还能提前暴露模板语法错误，而运行时编译的错误只在浏览器中触发。

---

## 🌳 二、parse 阶段：正则扫描 HTML → AST 树

> 链路位置：② parse 阶段

### 为什么要先生成 AST

`template` 是一段 HTML 字符串，如果直接把它翻译成 render 函数字符串，每种指令（v-if、v-for、v-model……）都要单独写一套字符串替换逻辑，互相耦合、难以维护。引入 AST（抽象语法树）作为中间表示，可以把「解析」和「生成」彻底分离：parse 只管把 HTML 变成结构化的树，generate 只管把树翻译成代码字符串。

### 五个核心正则

parse 阶段的核心是一组正则表达式，它们负责识别 HTML 的不同部分：

```javascript
// src/compiler/parse.js
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
const startTagOpen = new RegExp(`^<${qnameCapture}`)   // 匹配开始标签名
const startTagClose = /^\s*(\/?)>/                      // 匹配开始标签的结尾 >
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`) // 匹配结束标签
const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g         // 匹配双花括号插值
```

### stack 栈建立父子关系

parse 用一个栈（`stack`）来维护当前解析位置的祖先链。遇到开始标签就入栈，遇到结束标签就出栈，出栈时把当前节点挂到栈顶节点（即父节点）的 `children` 下。

完整实现如下（来自笔记手写版）：

```javascript
// src/compiler/parse.js
export function parseHTML(html) {
  function createASTElement(tagName, attrs) {
    return {
      tag: tagName,  // 标签名
      type: 1,       // 元素类型
      children: [],  // 孩子列表
      attrs,         // 属性集合
      parent: null   // 父元素
    }
  }

  let root
  let currentParent
  let stack = [] // 用于校验标签的合法性

  function start(tagName, attrs) {
    let element = createASTElement(tagName, attrs)
    if (!root) {
      root = element
    }
    currentParent = element
    stack.push(element)
  }

  // 在结尾标签处，创建父子关系
  function end(tagName) {
    let element = stack.pop()
    currentParent = stack[stack.length - 1]
    if (currentParent) {
      element.parent = currentParent
      currentParent.children.push(element)
    }
  }

  function chars(text) {
    text = text.replace(/\s/g, '')
    if (text) {
      currentParent.children.push({
        type: 3,
        text
      })
    }
  }

  while (html) {
    let textEnd = html.indexOf('<')
    if (textEnd == 0) {
      // 处理开始标签
      const startTagMatch = parseStartTag()
      if (startTagMatch) {
        start(startTagMatch.tagName, startTagMatch.attrs)
        continue
      }
      // 处理结束标签
      const endTagMatch = html.match(endTag)
      if (endTagMatch) {
        advance(endTagMatch[0].length)
        end(endTagMatch[1])
        continue
      }
    }
    // 处理文本
    let text
    if (textEnd > 0) {
      text = html.substring(0, textEnd)
    }
    if (text) {
      advance(text.length)
      chars(text)
    }
  }

  function advance(n) {
    html = html.substring(n)
  }

  function parseStartTag() {
    const start = html.match(startTagOpen)
    if (start) {
      const match = {
        tagName: start[1],
        attrs: []
      }
      advance(start[0].length)
      let end
      let attr
      while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
        match.attrs.push({
          name: attr[1],
          value: attr[3] || attr[4] || attr[5]
        })
        advance(attr[0].length)
      }
      if (end) {
        advance(end[0].length)
        return match
      }
    }
  }

  return root
}
```

以 `<div id="app">{{ name }}</div>` 为例，parse 结束后得到的 AST：

```javascript
{
  tag: 'div',
  type: 1,
  attrs: [{ name: 'id', value: 'app' }],
  children: [{ type: 3, text: '{{name}}' }],
  parent: null
}
```

> 💬 **面试官**：parse 阶段用了什么数据结构维护父子关系？遇到不合法的嵌套（如 `<div><span></div></span>`）会怎么处理？
>
> ✅ 标准答案：parse 用一个「栈」维护当前解析路径上的祖先节点。遇到开始标签就把当前节点入栈，遇到结束标签就出栈并建立父子关系。栈顶始终是当前正在解析的节点的父节点。
> 🎁 加分答案：Vue 2 parse 阶段并不做严格的合法性校验，如果出现不合法嵌套，出栈时会尝试匹配最近的同名开始标签，剩余未匹配的标签会被当作文本节点处理。真实的模板错误警告主要由 vue-template-compiler 在构建阶段报出。

---

## ✂️ 三、optimize 阶段：标记静态节点，跳过 Diff

> 链路位置：③ optimize 阶段

### 什么是静态节点

静态节点是指**内容永远不会变的节点**——不依赖任何响应式数据、不含动态绑定、不含 `v-if/v-for`。比如：

```html
<div class="drug-header">
  <h2>药品说明书</h2>         <!-- 静态节点 -->
  <p>{{ drugName }}</p>       <!-- 动态节点 -->
</div>
```

`<h2>药品说明书</h2>` 是纯静态的，每次重渲染时它的 VNode 不会变化，没必要参与 Diff 算法。optimize 阶段就是把这类节点找出来并打标记，告诉运行时「这棵子树不用 Diff，直接复用」。

### isStatic 的判断条件

Vue 2 源码中，`isStatic(node)` 的判断逻辑如下（简化版）：

```javascript
// src/compiler/optimizer.js（源码简化）
function isStatic(node) {
  if (node.type === 2) return false  // 含插值表达式（{{ }}）的文本节点
  if (node.type === 3) return true   // 纯文本节点
  return !!(
    !node.dynamic &&          // 没有动态绑定（:attr / @event / v-xxx）
    !node.if &&               // 没有 v-if
    !node.for &&              // 没有 v-for
    !isBuiltInTag(node.tag) &&       // 不是内置组件（slot / component）
    !isDirectChildOfTemplateFor(node) // 不是 v-for 模板的直接子节点
  )
}
```

判断为静态节点后，还要进一步判断是否是**静态根节点**（staticRoot）：一个节点是静态根节点，当且仅当它自身是静态的，且它的子节点不全是纯文本（纯文本子节点单独优化收益太小，不值得提升）。

### 深度优先遍历打标记

optimize 阶段对整棵 AST 做深度优先遍历，从叶节点向上逐层判断，只要子节点中有一个动态节点，父节点就不能标记为静态：

```javascript
// src/compiler/optimizer.js（源码简化）
function markStatic(node) {
  node.static = isStatic(node)
  if (node.type === 1) {
    // 对每个子节点递归标记
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]
      markStatic(child)
      if (!child.static) {
        node.static = false  // 子节点动态，父节点也动态
      }
    }
  }
}

function markStaticRoots(node, isInFor) {
  if (node.type === 1) {
    if (node.static && node.children.length && !(
      node.children.length === 1 && node.children[0].type === 3
    )) {
      node.staticRoot = true
      return
    }
    // 对子节点继续递归
    for (let i = 0; i < node.children.length; i++) {
      markStaticRoots(node.children[i], isInFor || !!node.for)
    }
  }
}
```

### 静态节点在运行时如何跳过 Diff

打完标记之后，generate 阶段会把静态根节点的渲染函数提升为 `_m(index)` 调用（staticRenderFns 数组）。运行时在 `patchVnode` 中，遇到 `isStatic` 为 true 的 VNode 直接跳过子树 Diff，复用上一次的 DOM：

```javascript
// src/core/vdom/patch.js（源码简化）
function patchVnode(oldVnode, vnode) {
  if (vnode.isStatic && oldVnode.isStatic && vnode.key === oldVnode.key) {
    vnode.elm = oldVnode.elm  // 直接复用 DOM，跳过后续 Diff
    vnode.componentInstance = oldVnode.componentInstance
    return
  }
  // ... 正常 Diff 逻辑
}
```

> 💬 **面试官**：Vue 2 的静态节点优化是怎么实现的？optimize 阶段做了什么？
>
> ✅ 标准答案：optimize 阶段对 AST 做深度优先遍历，用 `isStatic` 函数判断每个节点是否是静态节点（不含动态绑定、v-if、v-for），再进一步找出静态根节点（staticRoot）。运行时 patch 时，遇到 isStatic 的 VNode 直接复用 DOM 和组件实例，跳过 Diff，减少不必要的比较开销。
> 🎁 加分答案：Vue 3 放弃了这套 optimize 阶段，改用编译时的「Block Tree」和「靶向更新」——编译器直接标记哪些节点可能变、哪些绝对不变，运行时只对动态节点做 Diff，粒度更细、性能更好，不需要全树遍历打标记。

---

## ⚙️ 四、generate 阶段：AST → render 函数字符串

> 链路位置：④ generate 阶段

### `_c / _v / _s / _l` 辅助函数含义

generate 阶段输出的不是真正的函数，而是一个**函数体字符串**，字符串里用到了一组短名辅助函数：

| 辅助函数 | 全称 | 作用 |
|---------|------|------|
| `_c` | createElement | 创建元素类型虚拟节点（VNode） |
| `_v` | createTextVnode | 创建文本类型虚拟节点 |
| `_s` | toString（stringify） | 把值转成字符串（对象转 JSON） |
| `_l` | renderList | 渲染列表（v-for） |
| `_m` | renderStatic | 渲染静态根节点（已提升） |
| `_e` | createEmptyVNode | 创建空节点（v-if 为 false 时） |

一个典型的 generate 输出：

```javascript
// template: <div id="app">{{ name }}</div>
// 生成的 render 字符串：
`_c('div', {id:"app"}, _v(_s(name)))`
```

### genProps / getChildren / gen 的递归生成

generate 阶段递归遍历 AST，核心是三个函数的相互调用：

```javascript
// src/compiler/generate.js（手写实现版）
function genProps(attrs) {
  let str = ''
  for (let i = 0; i < attrs.length; i++) {
    let attr = attrs[i]
    if (attr.name === 'style') {
      // style 属性需要转成对象格式
      let obj = {}
      attr.value.split(';').forEach(item => {
        let [key, value] = item.split(':')
        obj[key] = value
      })
      attr.value = obj
    }
    str += `${attr.name}:${JSON.stringify(attr.value)},`
  }
  return `{${str.slice(0, -1)}}`
}

const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g

function gen(node) {
  if (node.type === 1) {       // 元素节点，递归
    return generate(node)
  } else if (node.type === 3) { // 文本节点
    let text = node.text
    if (!defaultTagRE.test(text)) {
      return `_v(${JSON.stringify(text)})`  // 纯文本
    }
    // 处理含插值的文本，如 "你好 {{ name }}，欢迎"
    let tokens = []
    let lastIndex = defaultTagRE.lastIndex = 0
    let match
    let index
    while ((match = defaultTagRE.exec(text))) {
      index = match.index
      if (index > lastIndex) {
        tokens.push(JSON.stringify(text.slice(lastIndex, index)))
      }
      tokens.push(`_s(${match[1].trim()})`)
      lastIndex = index + match[0].length
    }
    if (lastIndex < text.length) {
      tokens.push(JSON.stringify(text.slice(lastIndex)))
    }
    return `_v(${tokens.join('+')})`
  }
}

function getChildren(el) {
  const children = el.children
  if (children) {
    return children.map(child => gen(child)).join(',')
  }
}

export function generate(el) {
  let children = getChildren(el)
  let code = `_c('${el.tag}', ${
    el.attrs.length ? `${genProps(el.attrs)}` : 'undefined'
  }${
    children ? `,${children}` : ''
  })`
  return code
}
```

### new Function + with(this)：字符串变函数

generate 输出的是字符串，真正的魔法在 `compileToFunctions` 的最后一步：

```javascript
// src/compiler/index.js
import { generate } from './generate'
import { parseHTML } from './parse'

export function compileToFunctions(template) {
  // 1. 解析 HTML → AST
  let ast = parseHTML(template)
  // 2. 优化静态节点
  // 3. AST → render 字符串
  let code = generate(ast)
  // 4. 字符串 → 真正的函数
  const render = new Function(`with(this) { return ${code}}`)
  return render
}
```

`with(this)` 的作用是**把当前 vm 实例设为作用域对象**，这样 render 函数内部的 `name`、`drugList` 等标识符，实际上都是在访问 `vm.name`、`vm.drugList`，触发响应式 getter，完成依赖收集。

🔧 **真实案例**：在药品说明书页面，模板里的 `{{ drug.name }}` 经过 parse → generate 变成 `_v(_s(drug.name))`，render 函数执行时通过 `with(this)` 访问到 `vm.drug.name`，触发响应式 getter，将当前渲染 Watcher 收集为依赖——这就是「数据变化，视图自动更新」的入口。

> 💬 **面试官**：Vue 2 是怎么把 template 字符串变成可执行的 render 函数的？`with(this)` 在这里有什么作用？
>
> ✅ 标准答案：generate 阶段把 AST 转成 render 函数体字符串（如 `_c('div', ..., _v(_s(name)))`），然后用 `new Function(...)` 把字符串实例化为函数。`with(this)` 把 vm 实例设为标识符查找的作用域，render 函数内部访问 `name` 实际上访问的是 `vm.name`，触发响应式 getter 完成依赖收集。
> 🎁 加分答案：`with` 语句是 ES5 时代的特性，在严格模式下不可用，也因为影响 JS 引擎的作用域分析而被认为是反模式。Vue 3 的编译产物改用了显式的 `_ctx.name` 访问方式，不再依赖 `with`，既支持严格模式，又对 TS 类型推断更友好。

---

## 🎛️ 五、v-model 的编译产物：语法糖的真面目

> 这是面试中最高频的模板编译题，也是最容易答错的一道。

### 原生元素上的 v-model

`<input v-model="drugName">` 编译后的 render 函数：

```javascript
_c('input', {
  domProps: { value: drugName },   // 绑定 value 属性
  on: {
    input: function($event) {       // 监听 input 事件
      drugName = $event.target.value
    }
  }
})
```

这就是 v-model 的本质：**value 属性绑定 + input 事件监听**的语法糖。

不同类型的表单元素，绑定的属性和事件不同：

| 元素类型 | 绑定属性 | 监听事件 |
|---------|---------|---------|
| `<input type="text">` | `value` | `input` |
| `<input type="checkbox">` | `checked` | `change` |
| `<input type="radio">` | `checked` | `change` |
| `<select>` | `value` | `change` |
| `<textarea>` | `value` | `input` |

### v-model 修饰符的编译实现

三个修饰符各自在编译阶段处理：

```javascript
// .lazy：把 input 事件改为 change 事件
<input v-model.lazy="drugName">
// 编译为：on: { change: fn }（而不是 input）

// .number：对输入值做 parseFloat 处理
<input v-model.number="age">
// 编译为：value = _n($event.target.value)（_n 即 parseFloat/parseInt）

// .trim：对输入值做 trim 处理
<input v-model.trim="query">
// 编译为：value = $event.target.value.trim()
```

### 组件上的 v-model

组件上的 v-model 和原生元素**有本质区别**。组件没有 DOM 属性，Vue 2 把它编译为 `model` 选项机制：

```javascript
// 父组件模板：<DrugSearch v-model="keyword">
// 编译为：
_c('DrugSearch', {
  model: {
    value: keyword,
    callback: function($$v) { keyword = $$v }
  }
})
```

子组件（DrugSearch）默认接收 `value` prop，触发 `input` 事件通知父组件更新。**可以通过 `model` 选项自定义 prop 名和事件名**：

```javascript
// DrugSearch 组件内部
export default {
  model: {
    prop: 'searchText',    // 把 value 改成 searchText
    event: 'search'        // 把 input 改成 search
  },
  props: ['searchText'],
  methods: {
    onInput(val) {
      this.$emit('search', val)
    }
  }
}
```

🔧 **真实案例**：在医疗系统的药品搜索组件中，用 `model: { prop: 'query', event: 'search' }` 替代默认的 `value/input`，让组件的 API 语义更清晰——`v-model="keyword"` 绑的是搜索词，`search` 事件触发时才真正发请求，而不是每次 input 都触发。

> 💬 **面试官**：v-model 的编译产物是什么？组件上的 v-model 和原生元素有何不同？
>
> ✅ 标准答案：原生元素的 v-model 编译为 domProps.value 绑定 + on.input 事件监听（checkbox/radio 是 checked + change）。组件上的 v-model 编译为 model 选项（含 value 和 callback），子组件默认接收 value prop、emit input 事件，但可以通过组件内的 model 选项自定义 prop 和事件名称。
> 🎁 加分答案：Vue 3 把这个能力标准化为 modelValue prop + update:modelValue 事件，并支持多个 v-model（v-model:title、v-model:content），不再需要单独的 model 选项。

---

## 🔃 六、v-for / v-if 的优先级与 AST 表现

### 优先级结论

**v-for 的优先级高于 v-if**。这不是运行时的行为，而是编译阶段就确定的。parse 阶段处理属性时，先处理 v-for，后处理 v-if，生成的 AST 中 v-for 包裹在外层：

```html
<!-- 反模式写法 -->
<li v-for="drug in drugList" v-if="drug.available">{{ drug.name }}</li>
```

编译后的 render 字符串（简化）：

```javascript
_l(drugList, function(drug) {
  return (drug.available) ? _c('li', [_v(_s(drug.name))]) : _e()
})
```

**先循环整个列表，再在每次循环内判断 v-if 条件**。如果 `drugList` 有 1000 条数据，每次渲染都会执行 1000 次 `drug.available` 判断，即使最终只渲染少数几条。

### AST 层面的表现

v-for 节点在 AST 中有 `for`、`alias`、`iterator1` 等属性，v-if 的条件会嵌套在 for 的迭代函数内部：

```javascript
// AST 中 v-for + v-if 同节点的结构
{
  tag: 'li',
  for: 'drugList',
  alias: 'drug',
  ifConditions: [
    { exp: 'drug.available', block: { /* li VNode */ } },
    { exp: undefined, block: { /* 空节点 */ } }
  ]
}
```

### 推荐解法

**方案一**：用 `<template v-if>` 把条件提升到 v-for 外层

```html
<!-- 如果整个列表都不显示，用 v-if 控制整个渲染 -->
<template v-if="showDrugList">
  <li v-for="drug in drugList" :key="drug.id">{{ drug.name }}</li>
</template>
```

**方案二**：用 computed 过滤数据源（最推荐）

```javascript
// 在 JS 层面过滤，模板只负责渲染
computed: {
  availableDrugs() {
    return this.drugList.filter(drug => drug.available)
  }
}
```

```html
<li v-for="drug in availableDrugs" :key="drug.id">{{ drug.name }}</li>
```

computed 有缓存，只有 `drugList` 变化时才重新计算，性能远优于在模板里每次都判断。

### JSX 中的等价写法

当使用手写 render 函数或 JSX 时，v-for 和 v-if 本质上就是 JS 语法，没有优先级问题：

```jsx
// JSX 写法（@vue/babel-plugin-transform-vue-jsx）
render(h) {
  return (
    <ul>
      {this.availableDrugs.map(drug => (
        <li key={drug.id}>{drug.name}</li>
      ))}
    </ul>
  )
}
```

> 💬 **面试官**：v-for 和 v-if 同时用在一个元素上，优先级是怎样的？为什么不推荐这样写？
>
> ✅ 标准答案：v-for 优先级高于 v-if，这由编译阶段决定——parse 先处理 v-for，generate 阶段生成的 render 函数中，v-if 判断在 _l 循环内部执行。结果是每次渲染都遍历整个列表，再逐条判断条件，性能差。推荐用 computed 过滤数据源，只渲染真正需要展示的数据。
> 🎁 加分答案：Vue 3 中 v-if 的优先级高于 v-for（官方调整），不过官方同样不推荐同节点使用，推荐用 computed 或 `<template>` 包裹来分离关注点。

---

## 🛠️ 七、生产级最佳实践

### 构建时编译：选 runtime-only，省 10KB

项目脚手架已默认配置好，核心原则是：**生产代码里永远不写需要运行时编译的 `template` 字符串**。

```javascript
// ❌ 这会触发运行时编译，需要完整版 Vue
new Vue({
  el: '#app',
  template: '<div>{{ msg }}</div>'
})

// ✅ 使用 .vue 文件 + vue-loader，构建时编译
import App from './App.vue'
new Vue({ render: h => h(App) }).$mount('#app')
```

### v-pre：跳过编译的快捷键

对于确定不需要动态渲染的内容（如静态文档、代码示例），用 `v-pre` 指令让编译器跳过该节点，节省编译时间：

```html
<div v-pre>
  <!-- 内部的 {{ }} 会被当作普通文本，不会解析为插值 -->
  <p>模板语法示例：{{ message }}</p>
</div>
```

### template vs render 的选型决策矩阵

| 场景 | 推荐方式 | 原因 |
|------|---------|------|
| 普通业务组件 | `template` | 可读性好，vue-loader 支持，IDE 有高亮 |
| 动态组件（根据参数渲染不同标签） | `render` | 三元嵌套多层时 template 可读性差 |
| 函数式组件 / 高阶组件 | `render` | 灵活控制 VNode 结构 |
| 组件库 / 底层工具组件 | `render` | 不依赖编译器，可发布到不同环境 |
| 需要访问编译产物 AST | 自定义编译器插件 | 如样式提取、国际化静态分析 |

### 自定义指令的五个钩子与编译产物

自定义指令在编译阶段生成**指令描述对象**，运行时按固定顺序调用钩子：

```javascript
// template: <input v-focus>
// generate 生成：
_c('input', {
  directives: [{
    name: "focus",
    rawName: "v-focus"
  }]
})
```

五个钩子的执行时机：

| 钩子 | 触发时机 |
|------|---------|
| `bind` | 指令第一次绑定到元素（只调用一次）；DOM 尚未插入文档 |
| `inserted` | 元素插入父节点之后（父节点存在，但不一定在文档中） |
| `update` | 所在组件的 VNode 更新时（可能在子组件更新之前） |
| `componentUpdated` | 所在组件及其子组件全部更新完成后 |
| `unbind` | 指令从元素解绑（只调用一次）；组件销毁时触发 |

医疗系统中常见的自定义指令场景：`v-auth`（按钮权限控制，bind 时检查权限，无权限则移除元素）、`v-debounce`（防抖输入，bind 时注册事件，unbind 时清理）。

### JSX 在 Vue 2 中的使用

安装 `@vue/babel-plugin-transform-vue-jsx` 后，可以在 Vue 2 中使用 JSX 语法：

```jsx
// babel.config.js 需要配置插件
export default {
  render(h) {
    // JSX 中 h 函数由 babel 自动注入（不需要手动传入）
    const { drugList, onSelect } = this
    return (
      <div class="drug-selector">
        {drugList.map(drug => (
          <div
            key={drug.id}
            class={{ 'drug-item': true, 'selected': drug.selected }}
            onClick={() => onSelect(drug)}
          >
            {drug.name}
          </div>
        ))}
      </div>
    )
  }
}
```

JSX 适合条件分支多、结构动态的组件；缺点是失去了 `<template>` 的静态节点优化（optimize 阶段只作用于编译器解析的 template，手写 render 不经过 optimize）。

---

## 💡 八、一张图总结（面试速记）

| 阶段 | 输入 | 输出 | 核心函数 | 面试价值 |
|------|------|------|---------|---------|
| **parse** | HTML 字符串 | AST 树 | `parseHTML` / `createASTElement` | ⭐⭐⭐ |
| **optimize** | AST 树 | 带 static/staticRoot 标记的 AST | `markStatic` / `markStaticRoots` | ⭐⭐ |
| **generate** | 带标记的 AST | render 函数体字符串 | `generate` / `genProps` / `gen` | ⭐⭐⭐ |
| **new Function** | render 字符串 | 可执行 render 函数 | `new Function + with(this)` | ⭐⭐⭐ |

**辅助函数速查**：

| 函数 | 作用 | 使用场景 |
|------|------|---------|
| `_c(tag, data, ...children)` | createElement | 所有元素节点 |
| `_v(text)` | createTextVnode | 文本节点 / 插值节点 |
| `_s(val)` | toString | `{{ val }}` 插值，把对象转 JSON |
| `_l(list, fn)` | renderList | v-for |
| `_m(index)` | renderStatic | 静态根节点（已提升） |
| `_e()` | createEmptyVNode | v-if 为 false 时的空节点 |

**v-model 两种场景对比**：

| 场景 | 编译产物 | 自定义 |
|------|---------|-------|
| 原生元素 | `domProps.value` + `on.input` | 不可自定义 |
| 组件 | `model.value` + `model.callback` | 可通过 `model` 选项自定义 prop/event |

---

## 📖 九、源码解析（重点代码，来源 GitHub 仓库）

### ① 编译入口：`src/compiler/index.js`

真实 Vue 2 源码中的 `compileToFunctions` 比手写版复杂，增加了**编译缓存**（相同 template 不重复编译）和**CSP 兼容检测**（严格内容安全策略下无法使用 `new Function`）：

```javascript
// src/compiler/to-function.js（源码简化）
const cache = Object.create(null)

export function createCompileToFunctionFn(compile) {
  return function compileToFunctions(template, options, vm) {
    // 缓存检查：相同 template 直接返回缓存结果
    const key = options.delimiters
      ? String(options.delimiters) + template
      : template
    if (cache[key]) return cache[key]

    // 编译
    const compiled = compile(template, options)

    // 把字符串变成函数
    const res = {}
    res.render = createFunction(compiled.render, fnGenErrors)
    res.staticRenderFns = compiled.staticRenderFns.map(
      code => createFunction(code, fnGenErrors)
    )

    return (cache[key] = res)
  }
}
```

### ② parse 阶段：`src/compiler/parser/index.js`

真实源码的 `parseHTML` 比手写版多处理了：

- **HTML 实体转义**（`&amp;` → `&`）
- **CDATA 节点**（SVG / MathML 场景）
- **注释节点**（`<!-- ... -->`，`comments` 选项控制是否保留）
- **pre 标签**（内部空白保留，不做 trim）
- **自闭合标签**（`<input />`、`<img />`）
- **v-for / v-if / v-once / v-slot 等指令的 AST 节点扩展**

### ③ optimize 阶段：`src/compiler/optimizer.js`

`isStatic` 的完整判断条件比手写版多了几项关键检查：

```javascript
// src/compiler/optimizer.js
function isStatic(node) {
  if (node.type === 2) return false // 含插值的文本
  if (node.type === 3) return true  // 纯文本
  return !!(
    !node.dynamic &&
    !node.if && !node.for &&
    !isBuiltInTag(node.tag) &&       // 非 slot/component
    !isPlatformReservedTag(node.tag) && // 非平台保留标签（如 web 端的 svg）
    !isDirectChildOfTemplateFor(node) &&
    Object.keys(node).every(isStaticKey)  // 所有属性键都是静态的
  )
}
```

### ④ generate 阶段：`src/compiler/codegen/index.js`

真实源码的 generate 处理了所有指令的代码生成：

```javascript
// src/compiler/codegen/index.js（源码简化）
export function genElement(el, state) {
  if (el.staticRoot && !el.staticProcessed) {
    return genStatic(el, state)    // 静态根节点 → _m(index)
  } else if (el.for && !el.forProcessed) {
    return genFor(el, state)       // v-for → _l(list, fn)
  } else if (el.if && !el.ifProcessed) {
    return genIf(el, state)        // v-if → 三元表达式
  } else if (el.tag === 'slot') {
    return genSlot(el, state)      // <slot> → _t(name, ...)
  } else {
    let code
    const data = el.plain ? undefined : genData(el, state)
    const children = genChildren(el, state)
    code = `_c('${el.tag}'${data ? `,${data}` : ''}${children ? `,${children}` : ''})`
    return code
  }
}
```

### ⑤ 辅助函数：`src/core/instance/render-helpers/index.js`

```javascript
// src/core/instance/render-helpers/index.js
export function installRenderHelpers(target) {
  target._o = markOnce         // v-once
  target._n = toNumber         // .number 修饰符
  target._s = toString         // 插值 {{ }}
  target._l = renderList       // v-for
  target._t = renderSlot       // <slot>
  target._q = looseEqual       // v-model 的值比较
  target._i = looseIndexOf     // v-model checkboxes
  target._m = renderStatic     // 静态节点（_m）
  target._f = resolveFilter    // {{ val | filter }}
  target._k = checkKeyCodes    // 按键修饰符
  target._b = bindObjectProps  // v-bind 动态属性
  target._v = createTextVNode  // 文本节点
  target._e = createEmptyVNode // 空节点（v-if false）
  target._u = resolveScopedSlots // 作用域插槽
  target._g = bindObjectListeners // v-on 对象语法
}
```

---

## ✍️ 十、手写实现：药品说明书动态模板编译

用约 170 行代码手写一个能跑通的 Vue 2 模板编译器，演示药品说明书页面动态模板的编译产物可视化。

### 环境搭建（Rollup + Babel）

```bash
mkdir vue2-compiler-demo && cd vue2-compiler-demo
npm init -y
npm install rollup @rollup/plugin-babel @babel/core @babel/preset-env rollup-plugin-serve -D
```

```javascript
// rollup.config.js
import babel from '@rollup/plugin-babel'
import serve from 'rollup-plugin-serve'

export default {
  input: 'src/index.js',
  output: { file: 'dist/vue.js', format: 'umd', name: 'Vue', sourcemap: true },
  plugins: [
    babel({ babelHelpers: 'bundled', presets: ['@babel/preset-env'] }),
    serve({ open: true, openPage: '/index.html', port: 3000 })
  ]
}
```

### 核心实现：compileToFunctions 完整串联

```javascript
// src/compiler/index.js
import { parseHTML } from './parse'
import { generate } from './generate'
import { markStatic } from './optimize'

export function compileToFunctions(template) {
  // 第一步：parse — HTML → AST
  const ast = parseHTML(template)

  // 第二步：optimize — 标记静态节点
  markStatic(ast)

  // 第三步：generate — AST → render 字符串
  const code = generate(ast)

  // 第四步：字符串 → 函数
  const render = new Function(`with(this) { return ${code} }`)
  return render
}
```

```javascript
// src/compiler/optimize.js（简化版）
function isStatic(node) {
  if (node.type === 3) return true   // 纯文本
  if (node.type === 2) return false  // 含插值
  return !node.dynamic && !node.if && !node.for
}

export function markStatic(node) {
  if (!node) return
  node.static = isStatic(node)
  if (node.type === 1) {
    for (let i = 0; i < (node.children || []).length; i++) {
      const child = node.children[i]
      markStatic(child)
      if (!child.static) node.static = false
    }
  }
}
```

### 药品说明书演示：编译产物可视化

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>药品说明书编译演示</title></head>
<body>
  <div id="app"></div>
  <script src="./dist/vue.js"></script>
  <script>
    const template = `
      <div class="drug-sheet">
        <h2>药品说明书（静态节点）</h2>
        <p>药品名称：{{ drug.name }}</p>
        <p>规格：{{ drug.spec }}</p>
        <p class="warning">请在医生指导下使用（静态节点）</p>
      </div>
    `

    // 编译
    const { ast, code, render } = Vue.compile(template)

    console.log('=== AST 树 ===')
    console.log(JSON.stringify(ast, null, 2))

    console.log('=== render 字符串 ===')
    console.log(code)
    // 输出类似：
    // _c('div',{class:"drug-sheet"},
    //   _c('h2',[_v("药品说明书（静态节点）")]),   ← static: true
    //   _c('p',[_v("药品名称："+_s(drug.name))]),
    //   _c('p',[_v("规格："+_s(drug.spec))]),
    //   _c('p',{class:"warning"},[_v("请在医生指导下使用（静态节点）")])  ← static: true
    // )

    // 挂载实例
    new Vue({
      el: '#app',
      data: {
        drug: { name: '布洛芬缓释胶囊', spec: '0.3g/粒' }
      },
      render
    })
  </script>
</body>
</html>
```

运行效果：可以在控制台看到哪些节点被标记为 `static: true`（`<h2>` 标题和底部警告语），哪些是动态节点（药品名称和规格的插值部分），直观理解 optimize 阶段的作用。

---

## 🖥️ 十一、手写实现源码 GitHub 地址

（链接占位，写作时填入）

---

## 🌍 十二、参考

- 搜索关键词：`Vue 2 compileToFunctions 源码解析`
- 搜索关键词：`Vue compiler optimizer isStatic`
- 搜索关键词：`vue-template-compiler parseHTML`
- v2.cn.vuejs.org — 渲染函数 & JSX
- github.com/vuejs/vue — `src/compiler/` 目录

---

## 📝 十三、留个问题

Vue 2 的 optimize 阶段依赖编译时的静态分析，有一个经典场景会「欺骗」它：

```html
<div>
  <span>{{ Math.random() }}</span>
</div>
```

这个 `<span>` 会被标记为静态节点吗？如果会，会产生什么 bug？如果不会，Vue 是怎么识别出来的？

欢迎在评论区写下你的分析，或者直接翻 `src/compiler/optimizer.js` 的 `isStatic` 函数找答案。

---

> 🔖 这是「Vue 2 全家桶深度拆解系列」第 5 篇。上一篇：《Vue 2 组件渲染原理：从注册到更新，组件的完整生命旅程（面试收藏级）》；下一篇预告：《Vue 2 插槽原理：普通 / 具名 / 作用域插槽编译产物全对比》
