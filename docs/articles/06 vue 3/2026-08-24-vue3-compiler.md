# Vue 3 编译优化与模板编译原理：parse → transform → generate，模板到 render 函数的三步拆解（面试收藏级）

> 面试官问：「Vue 3 比 Vue 2 快，很大一部分归功于编译优化，说说看静态提升是怎么做的？」大多数人会答：「运行时对比新旧 VNode，跳过静态节点的 diff。」——这个答案只对了一半，而且是**结果**，不是**原理**。面试官追问一句：「静态提升本身是在哪个阶段完成的？编译时，还是运行时？」这时候一半人会卡住。

> 答案是：**静态提升在编译阶段就把纯静态的 VNode 创建语句挪到了 render 函数外面**，运行时根本不会重新创建它们，更谈不上"对比"。Patch Flags 同理——不是运行时去猜哪个节点是动态的，而是编译时**已经分析好**了每个节点的动态绑定类型，把结果编码成一个数字打在 VNode 上，运行时只是"读"这个数字，做定向更新。

> 这篇文章是「Vue 3 全家桶深度拆解」系列第 7 篇。第 3 篇讲过运行时怎么"消费"Patch Flags 和 Block 做定向 Diff，这篇要补上另一半——**这些优化标记编译时是怎么"生成"出来的**，从 `<template>` 字符串到最终 render 函数字符串，parse → transform → generate 三步拆解到底。

---

## 🎯 这篇文章解决什么问题

第 3 篇「渲染原理与 Diff 算法」拆过 `patchElement` 怎么根据 `patchFlag` 走 CLASS/STYLE/TEXT 的定向更新分支，怎么用 `dynamicChildren` 做 Block 的线性比对——但那一篇里的 `patchFlag`、`dynamicChildren` 都是"已经算好的既定事实"，源码摆在那，没解释它们从哪来。

这篇文章要打通的正是这条链路的"上游"：模板字符串怎么变成 AST（parse），AST 上的每个节点怎么被分析、打标记、转换成 VNode 调用描述（transform），这份描述又怎么拼接成一份可执行的 render 函数代码字符串（generate）。读完你会同时拿到两样东西：**懂原理**（编译优化不是运行时的锦上添花，是编译时就定好的最终形态）和**会讲**（面试官从"静态提升是运行时还是编译时"问到"v-if 和 v-for 到底编译成什么样"，你能用同一套"三阶段"框架把所有追问串起来）。

---

## 🧩 一、基本使用

先看编译产物长什么样，为什么要关心它，以及怎么亲手看到它。原理留到下一节。

### `<template>` vs 手写 `render`：`h()` 与 JSX 的选择

Vue 3 组件最终跑起来靠的都是 `render` 函数——`<template>` 只是一种更友好的书写方式，编译阶段会被转换成等价的 `render` 函数。手写 `render` 函数则要么用 `h()` 辅助函数，要么用 JSX：

```javascript
// 用 h() 手写，本质就是 createVNode 的简写
import { h } from 'vue'

export default {
  render() {
    return h('div', { class: 'drug-card' }, [
      h('h3', null, this.drugName),
      h('p', null, this.description)
    ])
  }
}
```

```jsx
// 用 JSX，需要 @vue/babel-plugin-jsx 编译
export default {
  render() {
    return (
      <div class="drug-card">
        <h3>{this.drugName}</h3>
        <p>{this.description}</p>
      </div>
    )
  }
}
```

`<template>` 写法能享受这篇文章要讲的全部编译时优化（静态提升、Patch Flags、Block Tree），因为编译器能提前分析出"哪里是动态的、哪里是静态的"；手写 `h()` 或 JSX 时这些信息不透明，编译器插件能做的优化有限（`@vue/babel-plugin-jsx` 也有一部分静态分析能力，但不如模板编译器做得彻底）。这也是为什么官方文档建议：**没有特殊理由，优先用 `<template>`**。

### v-if / v-for 在 render 函数中的等价写法

写惯 `<template>` 的人很少会去想 `v-if`/`v-for` 到底"变成"了什么，但这恰好是编译器 transform 阶段处理的核心对象之一（下一节会展开每个指令具体编译成什么样）。先看等价写法：

```vue
<template>
  <p v-if="loading">加载中...</p>
  <ul v-else>
    <li v-for="item in list" :key="item.id">{{ item.name }}</li>
  </ul>
</template>
```

等价的手写 `render`：

```javascript
render() {
  return this.loading
    ? h('p', null, '加载中...')
    : h('ul', null, this.list.map(item =>
        h('li', { key: item.id }, item.name)
      ))
}
```

`v-if` 对应三元表达式的两个分支，`v-for` 对应数组的 `map`（编译器生成的是 `renderList` 辅助函数，效果等价）。这组对照是理解"模板到底编译成了什么"的最小心智模型。

### 编译时宏：`<script setup>` 中 `defineProps`/`defineEmits` 为什么不需要 import

写 `<script setup>` 时有个容易让新手迷惑的现象：`defineProps`、`defineEmits`、`defineExpose` 直接就能用，不需要任何 `import` 语句：

```vue
<script setup>
// 不需要 import { defineProps } from 'vue'，直接用
const props = defineProps({
  drugName: String
})
const emit = defineEmits(['confirm'])
</script>
```

原因是它们不是真正的运行时函数，是**编译时宏**——编译器在处理 `<script setup>` 时会识别这几个特殊的函数调用，把调用语句连同参数一起解析出来，编译成等价的运行时代码，**原来的宏调用语句本身会被从最终代码里擦除**。这一点这篇文章的"二、原理"会用具体的编译产物展开讲清楚。

### Vue 3 单文件组件编译产物的直观查看方式

不用猜编译器做了什么，直接看就行。最快的方式是打开 Vue SFC Playground（搜索关键词：Vue SFC Playground），左边写模板，右边实时看编译出来的 `render` 函数代码；只关心模板编译（不含 `<script setup>`）可以用 Vue Template Explorer（搜索关键词：Vue Template Explorer），能直接看到 Patch Flags 的注释（比如 `1 /* TEXT */`），这是验证"二、原理"里每个知识点最方便的手段——建议边看这篇文章边打开它。

---

## 🧩 二、原理

模板编译的全流程只有一句话：**`compile()` 把模板字符串依次交给 parse、transform、generate 三个函数处理，最后吐出一份 render 函数的代码字符串**。这一节按这三步的顺序展开，中间穿插面试官最爱挖的几个"编译时 vs 运行时"细节。

> 💬 **面试官**：模板编译的三个阶段分别做了什么？

> ✅ 标准答案：parse 阶段把模板字符串解析成 AST（抽象语法树）；transform 阶段遍历 AST，对每个节点做转换（生成 VNode 调用描述、标记 Patch Flags、收集 Block 动态子节点）；generate 阶段把转换后的 AST 拼接成一份 render 函数的 JavaScript 代码字符串。

> 🎁 加分答案：三个阶段是纯函数式的流水线——parse 只关心"字符串→树"，transform 只关心"树→带优化标记的树"，generate 只关心"树→字符串"，互不越界。这种分层让 `compiler-core`（平台无关）可以复用给 `compiler-dom`（浏览器）、`compiler-ssr`（服务端渲染）等不同平台的编译器，只需替换其中的 DOM 特定 transform 插件。

### 1. 编译入口：`compile()` 整合三阶段

`baseCompile` 是整条流水线的调度者，`compiler-dom` 包又在外面包了一层，注入浏览器特有的解析配置（`parserOptions`）：

```typescript
// compiler-core/src/compile.ts
export function baseCompile(
  source: string | any,
  options: CompilerOptions = {},
) {
  const resolvedOptions = extend({}, options, {
    prefixIdentifiers: true
  })
  const [nodeTransforms, directiveTransforms] = getBaseTransformPreset()
  const ast = baseParse(source)

  transform(ast, extend({}, resolvedOptions, {
    nodeTransforms: [
      ...nodeTransforms,
      ...(options.nodeTransforms || [])
    ],
    directiveTransforms: extend({}, directiveTransforms, options.directiveTransforms || {})
  }))

  return generate(ast, resolvedOptions)
}
```

`getBaseTransformPreset()` 返回一份默认的 transform 插件清单（`transformElement`/`transformText`/`transformExpression`），三行代码看下来，`baseCompile` 干的事情就是：解析出 AST → 用一堆 transform 插件遍历并改造这棵树 → 把改造后的树生成代码。`compiler-dom` 只是往这个流程里多塞了一层 DOM 专属配置：

```typescript
// compiler-dom/src/index.ts
export function compile(
  src: string,
  options: CompilerOptions = {}
): CodegenResult {
  return baseCompile(src, extend({}, parserOptions, options)) as any
}
```

> **对比 Vue 2**：Vue 2 的编译流程同样是 parse → optimize → generate 三段（`optimize` 对应 Vue 3 的 transform 里"标记静态节点"的部分），思路上是一脉相承的。核心区别在于 Vue 2 的 `optimize` 只做一件事——标记 `static`/`staticRoot`，供运行时 diff 时跳过；Vue 3 的 transform 阶段做得更彻底：**不仅标记静态，还要分析每个动态节点的绑定类型（生成 Patch Flags）、收集动态子节点（Block）**，这些信息在 Vue 2 里是不存在的，因为 Vue 2 的 diff 是全量的、不区分"哪个属性可能变"。

> 「为什么这样设计」：Vue 2 的 `optimize` 只能做"static 还是不 static"的二元判断，命中率有限（一个元素只要有一个动态属性就整体判定为非 static）；Vue 3 把颗粒度细化到"这个元素的哪些属性可能变"，即使元素整体是动态的，依然能针对性地跳过不会变的属性对比——这是 Patch Flags 存在的根本原因，第二节后面会具体展开。

### 2. parse：有限状态机扫描模板字符串 → 构建 AST

parse 阶段要把类似 `<div id="app">{{ name }}</div>` 这样的字符串，转换成一棵有类型、有层级的树。核心函数 `parseChildren` 是个**有限状态机**——每次只看"当前剩余字符串的开头是什么"，据此决定分发给哪个子解析函数：

```typescript
// compiler-core/src/parser.ts
function parseChildren(context: ParserContext) {
  const nodes = []
  while(!isEnd(context)) {
    let node
    const { source: c } = context
    // 状态机(有限状态机)
    if (c.startsWith('{{')) { // 表达式，{{ name }}
      node = parseInterpolation(context)
    } else if (c.startsWith('<')) { // 元素，<div></div>
      node = parseElement(context)
    } else { // 文本，text
      node = parseText(context)
    }
    nodes.push(node)
  }

  const isWhitespace = (source: string) => {
    return !/[^\t\r\n\f ]/.test(source.trim())
  }

  // 移除空节点等
  const result = nodes.filter((node: any) => {
    if (node.type === NodeTypes.TEXT) {
      return !isWhitespace(node.content.trim())
    }
    return true
  })
  return result
}
```

三个分支对应三种节点类型：遇到 `{{` 就解析插值表达式，遇到 `<` 就递归解析元素（元素内部又会递归调用 `parseChildren` 处理子节点），剩下的都当文本处理。`parseElement` 内部先用 `parseTag` 抠出标签名和属性，再递归 `parseChildren` 拿到子节点，最后跳过闭合标签：

```typescript
function parseElement(context: ParserContext) {
  const ele: any = parseTag(context)

  // 递归解析子节点, 如果是 闭合 标签，需要跳过
  const children = parseChildren(context)

  // 移除标签的 闭合 部分
  if (context.source.startsWith('</')) {
    parseTag(context)
  }

  ele.children = children
  ele.loc = getSelection(context, ele.loc.start)

  return ele
}
```


`parseInterpolation` 处理 `{{ }}` 之间的表达式，拆出内容并用 `SIMPLE_EXPRESSION` 节点包裹（这个内层节点会在 transform 阶段被处理成 `_ctx.xxx` 的形式，下一节讲）：

```typescript
function parseInterpolation(context: ParserContext) {
  const start = getCursor(context)
  const endIndex = context.source.indexOf('}}')
  advanceBy(context, 2)
  const innerStart = getCursor(context)
  const innerEnd = getCursor(context)

  const contentIndex = endIndex - 2
  let rawContent = parseTextData(context, contentIndex)
  const content = rawContent.trim()
  // ...省略位置计算细节，完整版见「五、手写实现」
  advanceBy(context, 2)

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
      loc: getSelection(context, innerStart, innerEnd)
    },
    loc: getSelection(context, start)
  }
}
```

整个 parse 过程不断调用 `advanceBy` 消费字符串（`context.source` 会越来越短），配合 `advancePositionWithMutation` 精确追踪当前的行号、列号、偏移量（`loc` 字段），这套位置信息是 source map 和错误定位的基础。

> **对比 Vue 2**：Vue 2 的模板解析用的是一连串**正则表达式**匹配（`htmlParser.js` 里对标签、属性、文本分别写正则去 `match` 剩余字符串的开头），本质上也是"边扫描边消费字符串"，但正则的问题是**边界情况的组合会爆炸**——属性值里有 `>` 怎么办，文本里有类似标签的字符串怎么办，各种转义要单独开正则分支处理，可维护性和可读性都比较差。

> Vue 3 换成手写的有限状态机（本质是"当前字符串开头是什么→ 决定进入哪个处理函数"的判断链），每种情况对应明确的状态转移，逻辑更线性、更容易扩展新的语法（比如后续加的 `v-memo`、动态插槽名等）。「为什么这样设计」：状态机把"识别当前是什么"和"消费多少字符"两个关注点拆开，正则匹配把这两件事耦合在一次 `match` 调用里，状态机的可读性和可测试性都更好。

> 💬 **面试官**：Vue 3 的模板解析和 Vue 2 相比核心区别是什么？

> ✅ 标准答案：Vue 2 用正则表达式匹配模板字符串的各个片段；Vue 3 换成手写的有限状态机，根据当前字符串的开头字符（`{{`、`<`、其他）分发到对应的解析函数，递归处理子节点。

> 🎁 加分答案：状态机方式更容易维护和扩展语法边界情况，而且解析过程中同时维护了精确的行列位置信息（`loc`），这是后续 source map 和编译错误提示（比如"模板第 3 行属性缺少值"）的基础设施；正则方案要做到同等精度的位置追踪会更繁琐。


### 3. transform：AST 遍历转换，生成优化标记

parse 拿到的 AST 只是"结构"，transform 阶段要往上面"喂"信息：怎么创建这个节点对应的 VNode（`codegenNode`）、这个节点有没有动态绑定（Patch Flags）、动态子节点要不要收集进 Block。

**深度优先遍历 + 插件式转换**是 transform 的骨架。`traverseNode` 对每个节点先跑一遍所有 `nodeTransforms` 插件（每个插件可以返回一个"退出时执行"的函数），再递归处理子节点，最后**倒序执行**刚才收集的退出函数——这个"先进后出"的顺序很关键，保证父节点的转换发生在所有子节点都处理完之后：

```typescript
// compiler-core/src/transform.ts
export function traverseNode(
  node: RootNode | TemplateChildNode,
  context: TransformContext
) {
  context.currentNode = node
  const { nodeTransforms } = context
  const exitFns = []

  for(let i = 0; i < nodeTransforms.length; i++) {
    const onExit = nodeTransforms[i](node, context)
    if (onExit) {
      if (isArray(onExit)) {
        exitFns.push(...onExit)
      } else {
        exitFns.push(onExit)
      }
    }
    if (!context.currentNode) {
      // node was removed
      return
    } else {
      // node may have been replaced
      node = context.currentNode
    }
  }

  switch (node.type) {
    case NodeTypes.COMMENT:
      context.helper(CREATE_COMMENT)
      break
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING)
      break
    case NodeTypes.IF:
      for(let i = 0; i < node?.branches?.length;i++) {
        traverseNode(node.branches[i], context)
      }
      break
    case NodeTypes.IF_BRANCH:
    case NodeTypes.FOR:
    case NodeTypes.ELEMENT:
    case NodeTypes.ROOT:
      traverseChildren(node, context)
      break
  }

  // 还原上一次的currentNode，因为执行 traverseNode 时，会改变 currentNode 为子节点
  context.currentNode = node

  // 倒序执行
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}
```

`transformElement` 就是这种"先占位、退出时才真正处理"插件的典型代表——它的主体是空的，真正的转换逻辑写在返回的 `postTransformElement` 里，这样保证子节点先转换完，父节点拿到的 `children` 已经是处理过的结果：

```typescript
// compiler-core/src/transforms/transformElement.ts
export const transformElement: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.ELEMENT) {

  }
  return function postTransformElement() {
    node = context.currentNode
    if (!(node.type === NodeTypes.ELEMENT)) {
      return
    }
    const { tag, props, children } = node
    let vnodeTag = `"${tag}"`
    let vnodeProps: any
    let vnodeChildren: any
    let patchFlag: any | 0 = 0

    // props
    if (props?.length > 0) {
      vnodeProps = []
      for(let i = 0; i < props.length; i++) {
        const { name, value } = props[i]
        vnodeProps.push(createObjectProperty(name, value))
      }
      const propsBuildResult = vnodeProps.length > 0 ? createObjectExpression(vnodeProps) : null
      vnodeProps = propsBuildResult
    }
    // children
    if (node.children.length > 0) {
      if (children.length === 1) {
        const child = children[0]
        const type = child.type
        if (type === NodeTypes.TEXT) {
          vnodeChildren = child
        } else {
          vnodeChildren = children
        }
      } else if (children.length > 1) {
        vnodeChildren = children
      }
    }

    node.codegenNode = createVNodeCall(
      context,
      vnodeTag,
      vnodeProps,
      vnodeChildren,
      patchFlag === 0 ? undefined : patchFlag,
      undefined,
      undefined,
      false,
      false,
      false,
      node.loc
    )
  }
}
```

**Patch Flags 标记生成**：这里的手写实现把 `patchFlag` 简化成了固定 `0`（没有真正分析动态绑定类型），但真实 Vue 3.4 源码里 `transformElement` 会遍历 `props`，判断每个 prop 的绑定是不是动态表达式（`class`/`style` 各占一个 bit，其余动态 prop 归到 `PROPS`），把结果通过按位或运算合并成一个数字，直接写进 `createVNodeCall` 的 `patchFlag` 参数——这正是第 3 篇里 `patchElement` 读到的那个数字的**生成源头**：

```typescript
// Vue 3.4 真实源码简化摘录（笔记未展开这部分，用于补全"标记怎么生成"）
if (hasDynamicTextChild) {
  patchFlag |= PatchFlags.TEXT
}
if (dynamicPropNames.includes('class')) {
  patchFlag |= PatchFlags.CLASS
}
if (dynamicPropNames.includes('style')) {
  patchFlag |= PatchFlags.STYLE
}
// 生成后挂到 VNodeCall 上，codegen 阶段直接原样输出这个数字
```

**Block 收集**同样是"编译时约定、运行时兑现"的设计——`transform` 阶段并不直接操作 `dynamicChildren`，而是通过 `createVNodeCall` 时判断 `isBlock`（配合 `openBlock`/`closeBlock`），让**运行时**的 `createElementBlock` 在执行的那一刻，把 `currentBlock` 数组里收集到的动态子节点挂到 `dynamicChildren` 上：

```typescript
// runtime-core/src/vnode.ts（笔记 29）
export const blockStack: VNode['dynamicChildren'][] = []
export let currentBlock: VNode['dynamicChildren'] = null

export function openBlock(disableTracking = false) {
  blockStack.push((currentBlock = disableTracking ? null : []))
}
export function closeBlock() {
  blockStack.pop()
  currentBlock = blockStack[blockStack.length - 1] || null
}

function createBaseVNode(/* ... */) {
  // ...
  if (currentBlock && patchFlag > 0) {
    currentBlock.push(vnode) // 只要 patchFlag > 0（有动态绑定），就登记进当前 Block
  }
  // ...
}
```

**⚠️ 这里要划清一条边界**——`openBlock`/`currentBlock.push` 发生在**运行时执行 render 函数的那一刻**，不是编译时。编译时 transform 阶段做的事情，是决定"这个节点要不要被包成一个 Block"（也就是 `createVNodeCall` 的 `isBlock` 参数要不要传 `true`），以及给节点算好 `patchFlag`；至于 Block 内部具体收集了哪些动态子节点，是运行时 `createElementVNode`/`createElementBlock` 执行时动态发生的。**本文（第 7 篇）只讲"编译时怎么决定要不要开 Block、怎么标记 patchFlag"；Block 收集完之后运行时怎么拿 `dynamicChildren` 做线性 Diff，是第 3 篇讲过的内容**，这里不重复。

> ⚠️ **笔记未落地，补充讲解**：以上 Patch Flags 分析和 Block 判定逻辑，在这份 g-vue-next 手写实现里被简化掉了（`transformElement` 直接把 `patchFlag` 写死成 `0`，也没有真正调用 `openBlock`/`convertToBlock` 的分析逻辑）。这是手写教学项目常见的取舍——保留框架骨架、突出核心机制（AST→VNodeCall→代码字符串），把最繁琐的"具体怎么分析每个 prop 是不是动态"的细节留白。上面这段"真实源码简化摘录"是本文基于 Vue 3.4 源码补充的，帮你理解**编译时具体怎么把标记算出来**，与笔记原文的空白处形成互补。

**静态提升（`hoistStatic`）** 和 **缓存事件处理函数（`cacheHandlers`）** 是 transform 阶段另外两个重量级优化，但这份手写实现里的 `TransformContext.hoist()`/`cache()` 方法都是空壳：

```typescript
// compiler-core/src/transform.ts（笔记 32 原文，注意这两个方法什么都没做）
hoist(exp, code) {
  return NOOP
},
cache(exp, isVNode) {
  return exp
}
```

> ⚠️ **笔记未落地，补充讲解**：这两个方法在笔记里只是占位，没有真正的静态提升/缓存逻辑。真实机制是这样的——

**静态提升**：transform 遍历到一个元素节点时，会先判断它和它的全部子树是不是"纯静态"（没有任何插值、没有任何指令绑定，`ConstantTypes` 标记为 `CAN_STRINGIFY` 或 `CAN_HOIST`）。如果是，就不再把这个节点的创建语句留在 `render` 函数体内，而是**提升到 render 函数外面**，变成一个模块级常量，`render` 函数每次执行时只是**引用**这个常量，不会重新创建：

```javascript
// 静态提升前：每次 render 都重新创建这个 VNode
function render(_ctx, _cache) {
  return createElementVNode('div', null, [
    createElementVNode('span', null, '固定文案') // 每次都新建
  ])
}

// 静态提升后：'固定文案' 这个 span 提到外面，只创建一次
const _hoisted_1 = /*#__PURE__*/ createElementVNode('span', null, '固定文案')
function render(_ctx, _cache) {
  return createElementVNode('div', null, [_hoisted_1]) // 直接引用
}
```

**缓存事件处理函数**：内联的事件处理器（`@click="count++"` 这种直接写表达式，不是 `@click="handleClick"` 引用已有函数）如果不做处理，每次父组件重新渲染，`render` 函数都会创建一个**新的箭头函数**传给子组件的 `onClick` prop——即使逻辑完全没变，新函数引用也会导致子组件认为 prop "变了"，触发不必要的更新。`cacheHandlers` 的做法是把这个函数包一层缓存，第一次创建后存进 `_cache` 数组，后续渲染直接复用同一个引用：

```javascript
// 未缓存：每次渲染都是新函数引用
function render(_ctx, _cache) {
  return createElementVNode('button', {
    onClick: () => _ctx.count++
  })
}

// cacheHandlers 开启后：函数引用被缓存，跨渲染复用同一个
function render(_ctx, _cache) {
  return createElementVNode('button', {
    onClick: _cache[0] || (_cache[0] = () => _ctx.count++)
  })
}
```

`_cache` 数组挂在组件实例上，跟随组件生命周期存在，`_cache[0]` 一旦被赋值，后续每次 render 都会命中缓存，不再新建函数。

> **对比 Vue 2**：Vue 2 完全没有静态提升和事件缓存的概念——每次组件重新渲染，`render` 函数都会重新执行一遍完整的创建链路，静态内容和动态内容一视同仁地被重新创建，唯一的优化手段是靠 diff 本身跳过没有变化的 DOM 操作，但 VNode 对象本身的创建开销是省不掉的。

> Vue 3 把这两类"创建开销"从运行时挪到编译时决策——静态内容只创建一次、内联函数只创建一次，「为什么这样设计」：既然编译器在静态分析阶段就能确定"这块内容永远不会变"或者"这个函数的行为永远一样"，运行时就没必要一遍遍重复做本可以确定的事，这是编译时优化相比运行时优化最大的优势——**信息在编译时是完整的，运行时反而要多花力气去猜或去比对**。

> 💬 **面试官**：静态提升是在编译的哪个阶段完成的？如何影响运行时性能？

> ✅ 标准答案：静态提升发生在 transform 阶段——编译器分析 AST 时判断纯静态的节点（没有任何动态绑定），把它们的创建语句从 render 函数体内提升到函数外部，变成模块级常量。运行时的 render 函数不会重新创建这些 VNode，只是引用已经存在的常量，省掉了重复创建对象和子树的开销。

> 🎁 加分答案：能强调这是"编译时一次性分析，运行时零开销复用"——和 Patch Flags/Block 一样，都是把本可以提前确定的信息在编译阶段算好，运行时只管"读"不用"算"。补一句 `cacheHandlers` 是同一设计哲学下的另一个优化点，能体现系统性理解而不是记孤立知识点。

### 4. 组件 vs 原生元素的编译产物区别

`<div>` 和 `<MyComponent>` 长得都像标签，但编译产物完全是两条路——这是笔记这份手写实现里刻意简化掉、但面试高频会问的一块。

判断依据是 `ElementTypes`：parse 阶段给每个元素节点打一个 `tagType`，`ELEMENT` 表示原生 DOM 标签（`div`/`span`/`ul`……），`COMPONENT` 表示注册过的组件。这份手写实现里 `transformElement` 判断组件类型的那一行代码被**注释掉**了，意味着它把所有标签都当 `ELEMENT` 处理：

```typescript
// compiler-core/src/transforms/transformElement.ts（笔记 32 原文）
if (
  !(
    node.type === NodeTypes.ELEMENT
    // && (node.tagType === ElementTypes.ELEMENT || node.tagType === ElementTypes.COMPONENT)
  )
) {
  return
}
```

> ⚠️ **笔记未启用，本节补充讲解 + 补全实现**：真实 Vue 3.4 源码里，`tagType === ElementTypes.COMPONENT` 会走一条完全不同的分支——组件标签编译出来的 `tag` 不是字符串字面量，而是一个 `resolveComponent()` 调用表达式，运行时靠这个调用去全局/局部组件注册表里查找对应的组件对象。

原生元素和组件标签的编译产物对比：

| 维度 | 原生元素 `<div>` | 组件 `<MyComponent>` |
| --- | --- | --- |
| VNodeCall 的 tag | 字符串字面量 `"div"` | `_resolveComponent("MyComponent")` 调用结果，赋给一个局部变量 `_component_MyComponent` |
| shapeFlag | `ShapeFlags.ELEMENT` | `ShapeFlags.STATEFUL_COMPONENT`（或 `FUNCTIONAL_COMPONENT`） |
| 是否需要注册查找 | 不需要，浏览器原生支持 | 需要——本地 `components` 选项或全局 `app.component()` 注册 |
| props 传递方式一致性 | 属性名原样传给 DOM（`class`/`id`……） | props 会经过组件的 `props` 声明做过滤和类型转换 |

补全后的简化 `resolveComponent` 编译产物示意（基于 Vue 3.4 真实机制）：

```javascript
// 模板：<MyComponent :name="drugName" />
// 编译产物大致形态：
const _component_MyComponent = _resolveComponent("MyComponent")

function render(_ctx, _cache) {
  return (_openBlock(), _createBlock(_component_MyComponent, {
    name: _ctx.drugName
  }))
}
```

`_resolveComponent` 这个 helper 函数在 transform 阶段被登记进 `context.helper(RESOLVE_COMPONENT)`，generate 阶段就会在函数前言里从 Vue 全局对象上解构出这个函数：

```typescript
// 简化版 transformElement 里判断组件类型、生成 resolveComponent 调用的核心逻辑
function resolveComponentType(node, context) {
  const { tag } = node
  if (node.tagType === ElementTypes.COMPONENT) {
    context.helper(RESOLVE_COMPONENT)
    context.components.add(tag) // 登记这个组件名，供 codegen 生成 resolveComponent 调用
    return `_component_${tag}` // 返回一个变量名引用，而不是字符串字面量
  }
  return `"${tag}"` // 原生标签直接是字符串字面量
}
```

而原生标签 `isNativeTag` 的判断（`compiler-dom` 的 `parserOptions.ts` 里已经配置好）是这套机制的另一半基础——`isHTMLTag`/`isSVGTag`/`isMathMLTag` 任一命中，就认定这是浏览器原生标签，走 `ElementTypes.ELEMENT` 分支，否则默认当组件处理：

```typescript
// compiler-dom/src/parserOptions.ts（笔记 30 原文，已存在）
export const parserOptions: ParseOptions = {
  parseMode: 'html',
  isVoidTag,
  isNativeTag: tag => isHTMLTag(tag) || isSVGTag(tag) || isMathMLTag(tag),
  isPreTag: tag => tag === 'pre',
  isBuiltInComponentTag: tag => tag === 'Transition' || tag === 'TransitionGroup',
}
```

> **对比 Vue 2**：Vue 2 的组件解析同样要区分原生标签和组件，但组件查找主要靠 `resolveAsset` 在运行时的 `options.components` 上按名字查找（`_c('my-component', ...)` 里 `_c` 内部做了判断），编译产物层面组件和元素的**调用形式区别没有 Vue 3 这么显式**。Vue 3 把 `resolveComponent` 做成一个独立的、编译期生成调用、代码里能明确看到的 helper 函数，「为什么这样设计」：显式的 `resolveComponent` 调用让 tree-shaking 更友好（没用到的组件不会被打包进 `components` helper 引用），也让编译产物本身自解释——看 render 函数代码就能知道这个标签是不是组件，不需要跑到运行时才知道。

> 💬 **面试官**：组件标签和原生元素标签的编译产物有什么区别？Vue 是怎么知道一个标签是组件还是原生元素的？

> ✅ 标准答案：parse 阶段通过 `isNativeTag`（判断是否命中 HTML/SVG/MathML 标签清单）给元素节点打 `ElementTypes.ELEMENT` 或 `ElementTypes.COMPONENT` 标记。原生元素的 VNodeCall 里 `tag` 是字符串字面量（如 `"div"`）；组件标签会生成一个 `resolveComponent("MyComponent")` 调用，把结果赋给局部变量后再作为 `tag` 传给 `createVNode`。

> 🎁 加分答案：能提到 `resolveComponent` 是编译期生成、运行时执行的查找调用，查找依据是组件的本地 `components` 选项或全局注册表；还能补一句"这也是为什么组件名要么用 PascalCase 要么显式注册，标签名拼写错误在 Vue 3 下会在运行时报'组件未找到'的警告而不是静默当成自定义元素"。

### 5. v-if / v-for / v-on / v-model 编译产物逐个看

「一、基本使用」里已经给过 `v-if`/`v-for` 的等价手写 `render` 写法，这里把四个最常用指令的**真实编译产物**逐个摊开——这是面试"模板编译成什么样"追问链里出现频率最高的具体问题，比抽象地说"transform 插件处理指令"更有说服力。

**v-if 编译为三元表达式**，每个分支各自 `openBlock`/`createElementBlock`，并且 Vue 会给每个分支分配一个 `key`（保证分支切换时 diff 能正确识别是不同的节点，不复用 DOM）：

```vue
<p v-if="loading">加载中...</p>
<p v-else>已完成</p>
```

```javascript
// 编译产物：条件表达式的两个分支各自是一个 Block
function render(_ctx, _cache) {
  return _ctx.loading
    ? (_openBlock(), _createElementBlock('p', { key: 0 }, '加载中...'))
    : (_openBlock(), _createElementBlock('p', { key: 1 }, '已完成'))
}
```

**v-for 编译为 `_renderList` 调用**，这是数组到 VNode 数组的映射函数，效果等价于第一节里手写的 `.map()`，区别是 `_renderList` 内部对 key 生成和特殊值（Map/Set/数字范围）做了统一处理：

```vue
<li v-for="item in list" :key="item.id">{{ item.name }}</li>
```

```javascript
// 编译产物：_renderList 遍历 + 每项生成一个带 key 的 Block
function render(_ctx, _cache) {
  return (_openBlock(true), _createElementBlock(_Fragment, null,
    _renderList(_ctx.list, (item) => {
      return (_openBlock(), _createElementBlock('li', { key: item.id }, _toDisplayString(item.name), 1 /* TEXT */))
    }), 128 /* KEYED_FRAGMENT */
  ))
}
```

注意最外层包了一个 `Fragment`，patchFlag 是 `128`（`KEYED_FRAGMENT`）——这正是第 3 篇讲的"带 key 的列表走 `patchKeyedChildren` 全量 diff"在编译阶段的对应标记。

**v-on 的编译产物区分"内联语句"和"方法引用"两种情况**：直接写方法名会原样引用，写表达式语句会包一层箭头函数，且方法引用的函数会额外经过 `cacheHandlers`（上一节讲过）包一层缓存：

```vue
<button @click="handleClick">方法引用</button>
<button @click="count++">内联语句</button>
```

```javascript
// 方法引用：直接把函数引用传给 onClick，还会被 cacheHandlers 缓存
createElementVNode('button', { onClick: _ctx.handleClick }, '方法引用')

// 内联语句：包一层箭头函数，$event 是隐式注入的事件对象
createElementVNode('button', {
  onClick: _cache[0] || (_cache[0] = ($event) => (_ctx.count++))
}, '内联语句')
```

**v-model 的编译产物是"值绑定 + 事件监听"的组合**，本质是 `:value`/`:modelValue` 加 `@input`/`@update:modelValue` 的语法糖，原生表单元素和组件上的 `v-model` 编译产物不同：

```vue
<input v-model="username" />
```

```javascript
// 原生 input 元素：value 绑定 + input 事件反向赋值，patchFlag 是 PROPS（8）
createElementVNode('input', {
  'onUpdate:modelValue': ($event) => (_ctx.username = $event),
  modelValue: _ctx.username
}, null, 8 /* PROPS */, ['modelValue'])
```

组件上的 `v-model` 编译成 `modelValue` prop + `onUpdate:modelValue` 事件监听器，这也是第 4 篇讲过的 `defineModel` 展开成"一个 prop 声明 + 一个读写 ref"在编译产物层面的来源。

> **对比 Vue 2**：Vue 2 里 `v-model` 在原生表单元素上编译成 `value` + `input` 事件（`type="checkbox"`/`radio` 各自有特殊分支），组件上的 `v-model` 默认只能对应一个 `value` prop + `input` 事件，一个组件只能有一个 `v-model`。Vue 3 把 `modelValue` 作为默认 prop 名、`update:modelValue` 作为默认事件名，同时支持 `v-model:foo` 语法绑定多个不同名的双向绑定——「为什么这样设计」：Vue 2 的单一 `value`/`input` 命名把"双向绑定"和"表单值"这两个概念耦合死了，Vue 3 用 `update:xxx` 的事件命名约定把"双向绑定"抽象成一种通用机制，不再局限于表单场景，一个组件可以同时有多个独立的双向绑定。

> 💬 **面试官**：v-for 编译出来的代码里为什么会带一个 Fragment？KEYED_FRAGMENT 和普通元素的 patchFlag 有什么区别？

> ✅ 标准答案：v-for 渲染的是一组同级节点，没有天然的单一根节点，所以编译器用一个 `Fragment` 包一层，作为这组节点的容器 VNode。`KEYED_FRAGMENT`（128）标记这个 Fragment 的子节点都带 key，运行时据此走 `patchKeyedChildren` 做带 key 的全量 diff 定位移动/新增/删除，而不是走 Block 的线性对比。

> 🎁 加分答案：能对比出"Block 的 `dynamicChildren` 线性比对"和"`KEYED_FRAGMENT` 走 `patchKeyedChildren`"是两种不同的优化路径——前者针对"结构不变、内容变"的场景，后者针对"结构本身可能增删移动"的场景，v-for 属于后一种，所以不能简单套用 Block 的线性对比。

### 6. v-slot 插槽编译：`renderSlot` 与动态插槽

第 5 篇「Composition API 深度拆解」讲过运行时怎么消费 `slots`，这里补上插槽在**编译阶段**是怎么变出来的——这块笔记完全没覆盖，单独讲透。

父组件里给子组件传插槽内容，编译产物是把插槽内容包成一个**函数**（延迟执行，只在子组件真正渲染这个插槽的位置才调用），而不是提前算好的 VNode：

```vue
<!-- 父组件 -->
<MyList>
  <template #item="{ row }">
    <span>{{ row.name }}</span>
  </template>
</MyList>
```

```javascript
// 编译产物：具名插槽变成对象的一个 key，值是一个函数
createVNode(_component_MyList, null, {
  item: _withCtx(({ row }) => [
    createElementVNode('span', null, toDisplayString(row.name), 1 /* TEXT */)
  ])
}, 8 /* PROPS */, ['item']) // 组件的 slots 也可能被标记 patchFlag
```

子组件内部通过 `renderSlot` 调用这个插槽函数，传入需要暴露的作用域数据：

```javascript
// 子组件 render 里：renderSlot(slots, name, props, fallback)
renderSlot(_ctx.$slots, 'item', { row: currentRow })
```

`_withCtx` 是个关键细节——它把插槽函数包一层，确保插槽函数执行时，内部访问的 `_ctx` 依然指向**父组件的上下文**（插槽内容写在父组件模板里，逻辑上应该用父组件的作用域），而不是被子组件的渲染过程意外污染：

```javascript
// _withCtx 简化实现：捕获调用时的组件实例，执行时临时切换回去
function withCtx(fn, ctx = currentInstance) {
  return (...args) => {
    const prevInstance = setCurrentInstance(ctx)
    const res = fn(...args)
    setCurrentInstance(prevInstance)
    return res
  }
}
```

**动态插槽名**（`v-slot:[name]` 或者插槽名依赖某个响应式变量）编译产物有区别——静态插槽名直接是对象的字面量 key，动态插槽名会被编译成一个数组项（`{ name, fn }` 的形式），并且整个组件的 `patchFlag` 会带上 `DYNAMIC_SLOTS`（1024），强制这个组件每次都重新渲染，不走优化跳过：

```javascript
// 动态插槽名：slots 变成数组结构，且组件强制 DYNAMIC_SLOTS
createVNode(_component_MyList, null, {
  [_ctx.dynamicSlotName]: _withCtx(() => [...]),
  _: 2 /* DYNAMIC */
}, 1024 /* DYNAMIC_SLOTS */)
```

> **对比 Vue 2**：Vue 2 的插槽分"普通插槽"（`slot="xxx"`，在**父组件**渲染阶段就编译好 VNode，作为 `$options._renderChildren` 传给子组件）和"作用域插槽"（`slot-scope`，编译成函数，在**子组件**渲染时才执行）两套机制，两者的编译产物和运行时消费方式完全不同，还经历过 `v-slot` 统一语法的过渡期。Vue 3 把所有插槽统一编译成函数（`withCtx` 包裹），不再区分"普通"和"作用域"——「为什么这样设计」：**统一成函数** 意味着所有插槽都天然支持作用域传参，且执行时机延迟到子组件渲染，子组件的响应式依赖能正确追踪到插槽函数内部用到的数据，这是 Vue 2 两套机制不一致导致的很多"作用域插槽响应性丢失"类 bug 的根源修复。

> 💬 **面试官**：插槽内容是在父组件编译好还是子组件渲染时才生成？为什么这样设计？

> ✅ 标准答案：插槽内容在父组件模板里编译成一个函数（不是提前生成好的 VNode），子组件内部通过 `renderSlot` 在需要展示插槽的位置调用这个函数才真正生成 VNode。`withCtx` 确保这个函数执行时用的是父组件的上下文。

> 🎁 加分答案：能提到"延迟执行"带来的响应式追踪好处——插槽函数里访问的响应式数据，依赖收集发生在函数**真正被调用**的那一刻（子组件渲染时），而不是父组件渲染时，这样数据变化时子组件能正确重新渲染受影响的插槽内容，而不需要父组件整体重渲染。

### 7. v-once / v-pre 编译时跳过机制

`v-once` 和 `v-pre` 都是"告诉编译器不用管这块内容"的指令，但作用的阶段完全不同——一个是编译时优化运行时行为，一个是编译时直接不解析。

**`v-once`**：标记一段内容"只渲染一次，以后组件重新渲染时永远跳过它"。编译产物是把这段内容的创建语句包进 `_cache` 缓存判断（复用上一节讲过的 `cacheHandlers` 同一套 `_cache` 机制，只是这次缓存的是整个 VNode 而不是事件函数），首次渲染后 `_cache` 里就有值了，后续渲染直接命中缓存分支，`ConstantTypes` 会标记为可跳过 diff：

```vue
<span v-once>{{ expensiveComputedValue }}</span>
```

```javascript
// 编译产物：第一次渲染后结果存进 _cache，后续直接复用，不重新执行 toDisplayString
function render(_ctx, _cache) {
  return _cache[1] || (
    _cache[1] = createElementVNode('span', null, toDisplayString(_ctx.expensiveComputedValue), 1 /* TEXT */)
  )
}
```

`v-once` 和普通的 `cacheHandlers` 缓存的本质区别是——普通缓存复用的是"函数引用"，`v-once` 缓存的是"整个 VNode 及其子树"，意味着即使内部依赖的响应式数据变了，这个 VNode 也不会重新生成，界面永远停留在第一次渲染的结果。

**`v-pre`**：跳过这个元素及其所有子元素的编译，原样输出，不做插值、不解析任何指令。编译阶段一旦解析到 `v-pre`，`parseElement` 会切换到一种"不处理"模式，把 `{{ }}` 当成纯文本、把 `v-xxx` 属性当成普通 HTML 属性：

```vue
<span v-pre>{{ 这不会被解析成插值 }}</span>
```

```javascript
// 编译产物：原样当作静态文本节点，甚至会被静态提升
const _hoisted_1 = /*#__PURE__*/ createElementVNode('span', null, '{{ 这不会被解析成插值 }}')
```

`v-pre` 常见的应用场景是展示 Vue 模板语法本身的文档示例（避免 `{{ }}` 被真的当成插值解析），或者性能极度敏感、确定不含任何动态内容的大段静态 HTML（跳过解析阶段本身的开销，虽然这个开销通常很小）。

> **对比 Vue 2**：`v-once` 和 `v-pre` 在 Vue 2 里语义一致（都是编译时优化指令），但 Vue 2 没有 Patch Flags 体系，`v-once` 缓存的粒度和"跳过 diff"的实现方式更粗放（标记 `isStatic`/`isOnce` 让 patch 阶段整体跳过）。Vue 3 把 `v-once` 纳入统一的 `ConstantTypes`/`_cache` 体系，和静态提升、事件缓存共享同一套底层机制——「为什么这样设计」：**用一套统一的缓存基础设施（`_cache` 数组）同时服务"静态提升""事件缓存""v-once"三种场景**，减少运行时需要维护的概念数量，编译器和运行时的接口更简单。

> 💬 **面试官**：v-once 和普通的静态提升有什么区别？
>
> ✅ 标准答案：静态提升作用于**完全没有任何动态绑定**的节点，编译时就能确定内容永远不变；`v-once` 作用于**本身包含动态绑定**（比如插值、响应式数据）的节点，但开发者主动声明"只渲染一次就够了，之后不需要跟着数据变化更新"。两者都用 `_cache`/常量提升的机制避免重复创建，区别在于判断"要不要跳过"的依据——静态提升是编译器自动分析出来的，v-once 是开发者手动声明的。

> 🎁 加分答案：能举出 v-once 的实际应用场景——首屏展示的初始配置信息、只需要渲染一次的横幅广告位、根据首次进入页面时间戳生成且不会变的内容，这些场景里数据"技术上是动态的"但"业务上不需要响应更新"，v-once 就是给这类场景的性能优化开关。

### 8. generate：AST → render 函数代码字符串

前两步产出的是一棵挂满 `codegenNode` 的 AST，generate 阶段要把这棵树"拍平"成一份可执行的 JavaScript 代码字符串。

核心是 `genNode` 这个大 switch，按节点类型分发给对应的生成函数，`context.push` 负责往最终代码字符串里追加片段：

```typescript
// compiler-core/src/codegen.ts
function genNode(node: CodegenNode | symbol | string, context: CodegenContext) {
  if (isString(node)) {
    context.push(node, NewLineType.Unknown)
    return
  }
  if (isSymbol(node)) {
    context.push(context.helper(node))
    return
  }
  switch(node.type) {
    case NodeTypes.ELEMENT:
    case NodeTypes.IF:
    case NodeTypes.FOR:
      genNode(node.codegenNode, context)
      break
    case NodeTypes.TEXT:
      genText(node, context)
      break
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context)
      break
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context)
      break
    case NodeTypes.VNODE_CALL:
      genVNodeCall(node, context)
      break
    case NodeTypes.JS_CALL_EXPRESSION:
      genCallExpression(node, context)
      break
    case NodeTypes.JS_OBJECT_EXPRESSION:
      genObjectExpression(node, context)
      break
    default:
      console.log(node?.type, node?.codegenNode)
      break
  }
}
```

`genVNodeCall` 是最核心的生成函数，负责把 `VNodeCall` 节点还原成 `_createElementVNode(...)` 这样的函数调用字符串，`isBlock` 为真时还要在外面包一层 `openBlock()`：

```typescript
function genVNodeCall(node: VNodeCall, context: CodegenContext) {
  const { push, helper} = context
  const { tag, props, children, patchFlag, isBlock, isComponent, dynamicProps} = node
  let patchFlagString
  if (patchFlag) {
    patchFlagString = String(patchFlag)
  }

  if (isBlock) {
    push(`(${helper(OPEN_BLOCK)}(${``}), `)
  }

  const callHelper = isBlock
    ? getVNodeBlockHelper(context.inSSR, isComponent)
    : getVNodeHelper(context.inSSR, isComponent)

  push(helper(callHelper) + `(`, NewLineType.None, node)

  genNodeList(
    genNullableArgs([tag, props, children, patchFlagString, dynamicProps]),
    context
  )
  push(`)`)
  if (isBlock) {
    push(`)`)
  }
}
```

`genNullableArgs` 处理参数列表末尾的 `null` 省略——如果 `dynamicProps` 是 `undefined` 但 `patchFlag` 有值，中间的空位要填 `null` 占位，末尾连续的 `undefined` 直接砍掉，这就是为什么真实编译产物里 `createElementVNode('div', null, ...)` 有时候第二个参数是 `null` 而不是干脆省略——参数位置是固定的，省略不了中间的坑：

```typescript
function genNullableArgs(args: any[]) {
  let i = args.length
  while(i--) {
    if (!isNil(args[i])) break
  }
  return args.slice(0, i + 1).map(arg => arg || `null`)
}
```

最外层的 `generate` 函数拼出完整的函数声明——先生成"函数前言"（从 Vue 全局对象解构出用到的 helper），再拼函数体：

```typescript
export function generate(ast: RootNode, options: any = {}): any {
  const context = createCodegenContext(ast, options)
  const { push, indent, deindent } = context

  genFunctionPreamble(ast, context)

  const functionName = 'render'
  const args = ['_ctx', '_cache']
  push(`function ${functionName}(${args.join(', ')}) {`)
  indent()
  push(`return `)

  if (ast.codegenNode) {
    genNode(ast.codegenNode, context)
  } else {
    push(`null`)
  }

  deindent()
  push(`}`)

  return {
    ast,
    code: context.code,
    preamble: ``,
    map: undefined,
  }
}
```

`genFunctionPreamble` 生成的那一行 `const { createElementVNode: _createElementVNode, ... } = Vue`，就是编译产物开头总能看到的解构语句——`helperNameMap` 负责把内部用的 Symbol（比如 `CREATE_ELEMENT_VNODE`）映射成运行时真实导出的函数名：

```typescript
function genFunctionPreamble(ast: RootNode, context: CodegenContext) {
  const { push, newline, runtimeGlobalName, helper } = context
  const helpers = Array.from(ast.helpers)

  if (helpers.length > 0) {
    push(`const { ${helpers.map(s => `${helperNameMap[s]}: ${helper(s)}`).join(', ')} } = ${runtimeGlobalName}\n`)
  }

  newline()
  push(`return `)
}
```

跑一次真实编译看整体效果——`compile('<div id="app" class="main">123</div><div id="app2" class="main2">{{abc}}</div>')` 的输出：

```javascript
const { createElementVNode: _createElementVNode, Fragment: _Fragment, openBlock: _openBlock, createElementBlock: _createElementBlock, toDisplayString: _toDisplayString } = Vue

return function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock(_Fragment, null, [
    _createElementVNode("div", { id: "app", class: "main" }, "123"),
    _createElementVNode("div", { id: "app2", class: "main2" }, _toDisplayString(_ctx.abc))
  ], 64 /* STABLE_FRAGMENT */))
}
```

多个根节点时外层自动包一层 `Fragment`，`patchFlag` 是 `64`（`STABLE_FRAGMENT`）——因为这些根节点在编译时就能确定顺序不会变（不是 `v-for` 生成的），所以运行时只需要按位置逐个 diff，不需要走带 key 的乱序比对逻辑，这正好和上一节 `v-for` 的 `KEYED_FRAGMENT`（128）形成对照：**同样是 Fragment，`patchFlag` 不同，运行时走的 diff 策略完全不同**。

> **对比 Vue 2**：Vue 2 的代码生成（`codegen/index.js`）本质上也是"AST → 字符串"的拼接，但由于 AST 上没有 Patch Flags 之类的优化信息，生成的 `render` 函数字符串更"直白"——每个元素对应一个 `_c(tag, data, children)` 调用，没有 `openBlock`/`patchFlag`/`dynamicProps` 这些参数位。Vue 3 的 `genVNodeCall` 要额外处理 `isBlock` 包裹、`patchFlag` 数字、`dynamicProps` 数组，生成的代码看起来更"啰嗦"，但这些"啰嗦"的部分正是运行时能做定向更新的信息来源——「为什么这样设计」：**生成阶段把优化信息编码进函数调用的参数位，是整条编译优化链路能落地到运行时的最后一环**，前面 transform 阶段分析出来的一切（Patch Flags、Block、静态提升）都要靠 generate 阶段真正"写"进最终代码，否则只是停留在 AST 上的元数据，不会影响实际执行。

> 💬 **面试官**：`_createElementVNode('div', null, ...)` 里第二个参数为什么有时候是 `null` 而不是直接省略？
>
> ✅ 标准答案：`createElementVNode` 的参数是位置参数（tag, props, children, patchFlag, dynamicProps），如果后面的参数有值但中间某个参数没有值，就必须用 `null` 占位，不能跳过——JavaScript 函数调用不支持"跳过某个位置参数"的语法。

> 🎁 加分答案：能提到这是 `genNullableArgs` 在 codegen 阶段做的处理——从参数列表末尾开始找第一个非空值，只保留到这个位置，中间的空位统一填 `null`，末尾连续的 `undefined` 直接省略不生成。这是个纯粹的字符串拼接层面的小优化，减少生成代码的字节数。

### 9. 编译器插件架构：compiler-core 与 compiler-dom 的分层

前面八个小节讲的 parse/transform/generate，其实都是 `compiler-core` 包里的**平台无关**逻辑——它不知道自己最终会跑在浏览器里，也不知道 `<div>` 是不是一个合法标签。这份"不知道"是故意设计的。

`compiler-dom` 在 `compiler-core` 之上叠加了两类 DOM 特定的东西：**解析配置**（`parserOptions`，告诉 parse 阶段哪些是原生标签、哪些标签内容不需要转义）和**额外的 transform 插件**（比如 `v-html`、`v-model` 在原生表单元素上的特殊处理逻辑，需要知道"这是浏览器环境"才能生成正确的代码）：

```typescript
// compiler-dom/src/index.ts（笔记 30）
export function compile(
  src: string,
  options: CompilerOptions = {}
): CodegenResult {
  return baseCompile(src, extend({}, parserOptions, options)) as any
}

export function parse(template: string, options: ParseOptions = {}) {
  return baseParse(template, extend({}, parserOptions, options))
}
```

这样分层带来的直接好处是**平台可插拔**——同一份 `compiler-core` 逻辑，Vue 生态里还能派生出 `@vue/compiler-ssr`（服务端渲染，生成的代码调用的是字符串拼接 helper 而不是 `createElementVNode`）和社区的小程序/Native 渲染方案编译器，只需要各自实现一套 `parserOptions` + 平台专属 `nodeTransforms`，`parse`/`transform`/`generate` 的主干流程完全复用。

> **对比 Vue 2**：Vue 2 的编译器代码里平台相关和平台无关的逻辑耦合得更紧密，`web/compiler` 内部虽然也有类似的 `baseOptions` 分层思路，但整体上不像 Vue 3 这样把"核心编译流程"拆成一个完全独立的、可以单独发布到 npm 的包（`@vue/compiler-core`）。「为什么这样设计」：Vue 3 一开始就是按 monorepo + 独立包的架构设计的，编译器作为核心能力之一，拆分成独立包既方便按需引入（比如只需要类型定义可以只装 `@vue/compiler-core`），也让 SSR、小程序等生态扩展不需要 fork 整个编译器重新改。

### 10. `<script setup>` 编译产物：宏擦除与顶层变量暴露

回到「一、基本使用」留的钩子——`defineProps`/`defineEmits` 为什么不需要 `import`。答案是**它们是编译时宏，最终会被编译器整个替换掉，运行时压根不存在这两个函数调用**。

> ⚠️ **笔记未覆盖，本节基于官方文档 + 通用编译原理补充讲解**：g-vue-next 手写实现聚焦在 compiler-core/compiler-dom 的核心三阶段，没有涉及 `<script setup>` 的编译（对应真实 Vue 3.4 源码里的 `@vue/compiler-sfc` 包，是独立于 compiler-core 的另一层编译处理）。

`<script setup>` 的编译分两步：先用 `compileScript` 处理 `<script>` 块本身（识别宏调用、分析顶层变量），再把编译好的 `setup()` 函数体和 `<template>` 编译出的 `render` 函数拼接进同一个组件对象。核心的宏擦除逻辑大致是这样：

```vue
<script setup>
import { ref } from 'vue'
const props = defineProps({ drugName: String })
const emit = defineEmits(['confirm'])
const count = ref(0)
</script>
```

编译产物（简化示意，真实产物还会处理 `__expose`、类型声明等更多细节）：

```javascript
export default {
  props: { drugName: String },   // defineProps 的参数被搬到组件选项的 props 字段
  emits: ['confirm'],             // defineEmits 的参数搬到 emits 字段
  setup(__props, { emit: __emit }) {
    const count = ref(0)
    // defineProps()/defineEmits() 调用语句本身被整个删除
    // 顶层声明的 count 直接在 return 里暴露给模板
    return { count }
  }
}
```

**顶层变量自动暴露给模板作用域**是这段编译产物里最关键的一步——`<script setup>` 顶层声明的每个变量（`const`/`let`/`import` 进来的组件、函数）都会被编译器自动收集，塞进 `setup()` 函数的 `return` 语句里，模板才能直接用 `count`、`ref` 等而不需要手写 `return { count }`。这一步是纯编译时的静态分析，编译器会遍历 `<script setup>` 顶层的所有声明语句，逐个记录下变量名。

> 💬 **面试官**：`<script setup>` 的编译产物是什么样的？宏为什么不需要 import？
>
> ✅ 标准答案：`<script setup>` 编译时会把顶层内容包进组件的 `setup()` 函数，`defineProps`/`defineEmits` 是编译时宏——编译器识别到这两个函数调用后，把参数搬到组件选项的 `props`/`emits` 字段，调用语句本身被删除，不会出现在最终代码里，所以运行时压根不存在这两个函数，不需要 import。

> 🎁 加分答案：能补充"顶层变量自动暴露"是另一个编译时静态分析的产物——编译器收集 `<script setup>` 顶层所有声明，自动生成 `return { ... }`，这也是为什么 `<script setup>` 比 Options API 或普通 `setup()` 写法更简洁，本质是编译器替你做了"收集要暴露的东西"这一步体力活。

### 11. `bindingMetadata` 绑定类型分析：script setup 为什么更快

`<script setup>` 除了少写样板代码，还有一个容易被忽略的性能收益——模板里引用变量时**可能不需要经过 `_ctx.` 这一层间接访问**，这就是 `bindingMetadata` 在起作用。

> ⚠️ **笔记未覆盖，本节基于官方文档 + 通用编译原理补充讲解**。

普通 Options API 或者手写 `setup()` 返回的对象，模板编译时不知道这些变量具体是什么类型的绑定，统一生成 `_ctx.xxx` 的访问方式——每次读取都要走一次 `_ctx` 这个 proxy 对象的属性访问（第 4 篇讲过的 `with` 作用域 + Proxy 代理机制）。而 `<script setup>` 编译时，`compileScript` 阶段就已经知道每个顶层变量具体是**哪种绑定**——是 `ref`（`setup-ref`）、是普通常量（`setup-const`）、还是从 `defineProps` 拿到的 props（`props`），这份分析结果就是 `bindingMetadata`：

```typescript
// bindingMetadata 结构示意
{
  drugName: 'props',        // 来自 defineProps
  count: 'setup-ref',        // ref() 声明的变量
  MAX_COUNT: 'setup-const',  // 普通 const 声明，编译器确定它不会变
  handleClick: 'setup-const' // 函数声明同样是 setup-const
}
```

`<template>` 编译阶段拿到这份 `bindingMetadata`，就能针对不同绑定类型生成不同的访问代码：

```javascript
// 不知道绑定类型：统一走 _ctx 代理访问
function render(_ctx) {
  return toDisplayString(_ctx.count)
}

// 有 bindingMetadata：setup-const 直接引用局部变量，setup-ref 自动加 .value
function render(_ctx, _cache, $props, $setup) {
  return toDisplayString($setup.count.value) // 或编译器分析出的更直接的访问路径
}
```

**`setup-const` 类型的变量甚至能被编译器认定为"编译时常量"**，参与本文第二节讲的静态提升判断——一个只依赖 `setup-const` 变量的节点，可能被判定为可以整体提升的静态内容，因为编译器确定这个值运行期间不会变。这是 `bindingMetadata` 在"更快"这件事上的具体落点：**不仅减少了一层 Proxy 访问的运行时开销，还扩大了静态提升能覆盖的节点范围**。

> 💬 **面试官**：为什么说 `<script setup>` 性能比 Options API 更好？
>
> ✅ 标准答案：`<script setup>` 编译时会生成 `bindingMetadata`，记录每个顶层变量的具体绑定类型（props/setup-ref/setup-const 等），模板编译阶段据此生成更精确的访问代码——普通常量可以直接引用局部变量，不需要每次都走 `_ctx` 代理对象的属性访问，减少了一层间接开销。

> 🎁 加分答案：能提到 `setup-const` 类型的变量还会被静态提升判断纳入考虑范围——如果一个节点只依赖确定不变的常量，编译器可以更激进地把它判定为静态内容整体提升，这是 `bindingMetadata` 和第二节静态提升机制的联动，体现"编译时信息越精确，能做的优化就越多"这条贯穿全文的主线。

### 12. `defineProps` 类型编译原理：类型声明合一运行时校验

`<script setup lang="ts">` 里可以只写类型、不传运行时选项对象：

```typescript
const props = defineProps<{
  drugName: string
  dosage?: number
}>()
```

> ⚠️ **笔记未覆盖，本节基于官方文档 + 通用编译原理补充讲解**。

这种纯类型写法能成立，靠的是 `compileScript` 阶段对 TypeScript 类型字面量的**静态分析**——编译器解析 `defineProps<{...}>()` 泛型参数里的接口/type 声明，把每个字段的类型标注（`string`/`number`/`boolean`/`?` 可选标记）翻译成等价的运行时 `props` 选项对象：

```javascript
// defineProps<{ drugName: string; dosage?: number }>() 编译产物
props: {
  drugName: { type: String, required: true },
  dosage: { type: Number, required: false }
}
```

这份"类型翻译"发生在编译期，意味着**类型标注本身直接产出了运行时校验规则**——开发者不需要在类型声明和运行时 `props` 选项里各写一份，两者合二为一。局限也很明显：编译器只能做静态可分析的类型翻译，太复杂的类型运算（条件类型、映射类型的深层嵌套）编译器分析不出对应的运行时校验，只能退化成不做运行时类型检查（`type: null`）。

> 💬 **面试官**：`defineProps<Props>()` 的纯类型写法是怎么在运行时生效的？
>
> ✅ 标准答案：`compileScript` 阶段静态分析泛型参数里的接口/type 字面量，把每个字段的 TypeScript 类型翻译成等价的运行时 `props` 选项对象（`{ type, required }`），编译后和写运行时选项对象的效果一致。这一步是纯编译时的类型→选项对象转换，不依赖 TypeScript 的类型系统在运行时存在（类型本身在运行时会被完全抹除）。

> 🎁 加分答案：能指出这个机制的边界——只能处理编译器能静态分析的类型结构（接口、type 别名、基础类型），复杂的条件类型/映射类型编译器分析不出对应的运行时约束，这也是为什么官方文档建议 `defineProps` 的类型参数尽量保持简单直观。

### 13. 泛型组件编译原理：Vue 3.3+ 的 `resolveType`

`<script setup lang="ts" generic="T">` 让单文件组件本身带类型参数，这在写通用列表组件、表单组件时很常见：

```vue
<script setup lang="ts" generic="T extends { id: string | number }">
defineProps<{
  items: T[]
  activeId: T['id']
}>()
</script>
```

> ⚠️ **笔记未覆盖，本节基于官方文档 + 通用编译原理补充讲解**。

编译器处理这种带泛型的组件时，会把 `generic` 属性声明的类型参数保留在编译产物的类型层面——组件本身被编译成一个"带类型参数的函数组件"形态，`resolveType` 阶段负责解析 `defineProps<T[]>()` 这类依赖泛型参数的类型声明，并把解析结果保留到编译器生成的 `.d.ts` 类型声明文件里。使用方在 TSX 里调用这个组件，或者给它做类型标注时，可以传入具体的类型实参，让 `T` 在使用处被具体化，编辑器能拿到正确的类型推导和自动补全。

这个机制本质上是**把 TypeScript 的泛型能力桥接进 Vue 组件系统**——运行时层面泛型组件和普通组件没有任何区别（类型信息运行时不存在），泛型带来的价值完全体现在开发时的类型检查和 IDE 智能提示上。

> 💬 **面试官**：Vue 3 的泛型组件是怎么实现的？运行时和普通组件有区别吗？
>
> ✅ 标准答案：`<script setup lang="ts" generic="T">` 声明的类型参数在编译阶段被 `resolveType` 解析，保留到生成的类型声明文件里，供使用处通过类型标注传入具体类型。运行时层面泛型组件和普通组件完全一样——泛型是纯编译时/类型层面的概念，不会生成任何额外的运行时代码。

> 🎁 加分答案：能强调这是"类型系统和编译器协作、运行时零成本"的典型例子——和 TypeScript 本身"类型在编译后被完全抹除"的设计理念一致，Vue 的泛型组件把这套理念延伸到了组件层面。

### 14. v-if 与 v-for 同节点优先级反转

同一个元素上同时写 `v-if` 和 `v-for` 是社区公认的反模式，但 Vue 2 和 Vue 3 对这种写法的**处理顺序完全相反**——这是老项目从 Vue 2 迁移到 Vue 3 时最容易踩的坑之一。

```vue
<li v-for="item in list" v-if="item.visible" :key="item.id">{{ item.name }}</li>
```

Vue 3 里 `v-if` 的优先级更高——transform 阶段处理这个节点时，`v-if` 会先被处理，编译产物大致是"先判断条件，条件成立再执行 `v-for` 循环"，这意味着 `v-if` 表达式里访问的 `item` 变量在 Vue 3 里**其实是不存在的**（`v-for` 的作用域还没建立），会直接报错或访问到外层作用域的同名变量：

```javascript
// Vue 3 编译产物示意：v-if 在外层，此时 v-for 的 item 作用域还没建立
_ctx.someUnrelatedCondition
  ? (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.list, (item) => {
      return _createElementVNode('li', { key: item.id }, item.name)
    }), 128 /* KEYED_FRAGMENT */))
  : _createCommentVNode('v-if', true)
```

而 Vue 2 里 `v-for` 的优先级更高——先建立循环作用域，`v-if` 在循环内部逐项判断，所以 `item.visible` 这种写法在 Vue 2 是完全合法的，只是每一项都要重新计算一次 `v-if` 判断（性能上不如提前用 `computed` 过滤好列表）。

> **对比 Vue 2**：Vue 2 官方文档明确写过"当 `v-if` 和 `v-for` 一起用时，`v-for` 具有更高的优先级"；Vue 3 官方文档翻转了这条规则，明确写"`v-if` 拥有比 `v-for` 更高的优先级"。「为什么这样设计」：Vue 3 团队认为**同节点上混用两个指令本身就是容易读错的写法**，与其继续保留 Vue 2 那种"整个列表算完再逐项过滤"的隐性行为，不如提高 `v-if` 优先级，让"想根据外部条件整体控制这块内容是否渲染"和"想遍历列表"的语义边界更清晰——如果确实想要"遍历后按项过滤"，官方建议改用 `computed` 提前算好过滤后的列表，或者把 `v-if` 挪到 `<template>` 包裹层，避免在同一个标签上暧昧地混用。

> 💬 **面试官**：Vue 3 中 v-if 和 v-for 同节点的优先级和 Vue 2 有什么不同？迁移旧项目时要注意什么？
>
> ✅ 标准答案：Vue 2 里 `v-for` 优先级更高，`v-if` 在循环内部逐项判断，可以访问循环变量；Vue 3 反过来，`v-if` 优先级更高，会在 `v-for` 建立循环作前就被处理，此时访问循环变量会报错或指向外层作用域。

> 🎁 加分答案：能指出这是迁移 Vue 2 项目到 Vue 3 时必须重点排查的一类隐患——`v-for` 和 `v-if` 同节点的写法在 Vue 2 能跑通，迁移到 Vue 3 后编译不报错但运行时行为完全变了（模板里引用的循环变量变成 `undefined` 或报错），建议排查代码时统一把这类写法改成先用 `computed` 过滤列表，再单独写 `v-for`，从源头消除歧义。

---

## 🧩 三、源码解析（重点代码，来源 GitHub 仓库，对齐 Vue 3.4）

按笔记 30 → 31 → 32 → 33 的开发主线，从子包初始化到代码生成逐文件走一遍。以下代码与笔记原文逐字一致，`resolveComponent` 一节是补全笔记里被注释掉的部分。

### compile.ts：编译入口 + transform 插件预设

```typescript
// compiler-core/src/compile.ts
import { extend, NOOP } from "@g-vue-next/shared";
import { CompilerOptions, NodeTransform } from "./options";
import { baseParse } from "./parser";
import { transform } from "./transform";
import { transformElement } from "./transforms/transformElement";
import { transformText } from "./transforms/transformText";
import { transformExpression } from "./transforms/transformExpression";
import { generate } from "./codegen";

export type TransformPreset = [
  NodeTransform[],
  Record<string, any>
]

export function getBaseTransformPreset(
  prefixIdentifiers?: boolean
): TransformPreset {
  return [
    [
      transformElement,
      transformText,
      transformExpression
    ],
    {
      on: NOOP,
      bind: NOOP,
      modal: NOOP
    }
  ]
}

export function baseCompile(
  source: string | any,
  options: CompilerOptions = {},
) {
  const resolvedOptions = extend({}, options, {
    prefixIdentifiers: true
  })
  const [nodeTransforms, directiveTransforms] = getBaseTransformPreset()
  const ast = baseParse(source)

  transform(ast, extend({}, resolvedOptions, {
    nodeTransforms: [
      ...nodeTransforms,
      ...(options.nodeTransforms || [])
    ],
    directiveTransforms: extend({}, directiveTransforms, options.directiveTransforms || {})
  }))

  return generate(ast, resolvedOptions)
}
```

```typescript
// compiler-dom/src/index.ts
import { baseCompile, baseParse, transform,generate, ParseOptions, CompilerOptions } from '@g-vue-next/compiler-core'
import { extend } from '@g-vue-next/shared'
import { parserOptions } from './parserOptions'
import { CodegenResult } from 'packages/compiler-core/src/codegen'

// TODO 编译三部曲
// 1.解析模板，生成ast
// 2.转换ast节点，主要针对指令进行处理
// 3.生成代码（ast 转换成 js）

export function compile(
  src: string,
  options: CompilerOptions = {}
): CodegenResult {
  return baseCompile(src, extend({}, parserOptions, options)) as any
}

export function parse(template: string, options: ParseOptions = {}) {
  return baseParse(template, extend({}, parserOptions, options))
}

export * from '@g-vue-next/compiler-core'
```

```typescript
// compiler-dom/src/parserOptions.ts
import { ParseOptions } from "@g-vue-next/compiler-core";
import { isHTMLTag, isMathMLTag, isSVGTag, isVoidTag } from "@g-vue-next/shared";

export const parserOptions: ParseOptions = {
  parseMode: 'html',
  isVoidTag,
  isNativeTag: tag => isHTMLTag(tag) || isSVGTag(tag) || isMathMLTag(tag),
  isPreTag: tag => tag === 'pre',
  isBuiltInComponentTag: tag => tag === 'Transition' || tag === 'TransitionGroup',
}
```

### parser.ts：状态机核心函数

```typescript
// compiler-core/src/parser.ts
import { createRoot, NodeTypes } from "./ast"

export interface ParserContext {
  originalSource: string
  source: string
  line: number
  column: number
  offset: number
}

function createParserContext(content: string): ParserContext {
  return {
    originalSource: content,
    source: content,
    line: 1,
    column: 1,
    offset: 0,
  }
}

function isEnd(context: ParserContext) {
  const c = context.source
  // 如果源字符串中包含有 </ 字符串，则为 停止
  if (c.startsWith('</')) {
    return true
  }
  return !c
}

function advanceBy(context: ParserContext, length: number) {
  const str = context.source
  context.source = context.source.slice(length)
  advancePositionWithMutation(context, str, length)
}

function advanceSpaces(context: ParserContext) {
  const match = /^[ \t\r\n]+/.exec(context.source)
  if (match) {
    advanceBy(context, match[0].length)
  }
}

function advancePositionWithMutation(context: ParserContext, str: string, endIndex: number) {
  let linesCount = 0
  let returnLine = -1
  for (let i = 0; i < endIndex; i++) {
    // 如果是换行，需要换行处理
    if (str.charCodeAt(i) === 10) {
      linesCount++
      returnLine = i // 记录回车换行的索引
    }
  }
  context.line += linesCount // 计算行号
  context.offset += endIndex // 计算偏移量
  // 计算列数
  context.column = returnLine === -1 ? context.column + endIndex : endIndex - returnLine
}

function parseTextData(context: ParserContext, length: number): string {

  const rawText = context.source.slice(0, length)
  advanceBy(context, length)
  return rawText.replace(/[\n\t\r\f ]+/g, ' ').trim()
}

function parseText(context: ParserContext): any {
  const tokes = ['<', '{{'] // 找当前离得最近的开始token
  let endIndex = context.source.length // 假设结束索引值为源代码的长度

  for(let i =0; i < tokes.length; i++) {
    const index = context.source.indexOf(tokes[i], 1)
    if (index > -1 && endIndex > index) {
      endIndex = index
    }
  }
  const start = getCursor(context)
  const content = parseTextData(context, endIndex)

  return {
    type: NodeTypes.TEXT,
    content,
    loc: getSelection(context, start),
  }
}

function getCursor(context: ParserContext): any {
  const { offset, column, line } = context
  return { offset, line, column }
}

function getSelection(context: ParserContext, start: any, end?: any) {
  if (!end) {
    end = getCursor(context)
  }
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset),
  }
}

function isQuote(text: string) {
  return text === '"' || text === "'" || text === '`'
}

function parseAttributeValue(context: ParserContext): any {
  let content
  const quote = context.source[0]

  if (isQuote(quote)) {
    advanceBy(context, 1)
    const endIndex = context.source.indexOf(quote)
    content = parseTextData(context, endIndex)
    advanceBy(context, 1)
  } else {
    advanceSpaces(context)
    content = context.source.match(/([^ \t\r\n/>])+/)[1]
    advanceBy(context, content.length)
    advanceSpaces(context)
  }
  return content
}

function parseAttribute(context: ParserContext) {
  const start = getCursor(context)
  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)
  const name = match[0]
  advanceBy(context, name.length)
  if (/^[\t\r\n\f ]*=/.test(context.source)) {
    advanceSpaces(context)
    advanceBy(context, 1) // 删除=
  }

  const content = parseAttributeValue(context)
  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: {
      type: NodeTypes.TEXT,
      content,
      loc: getSelection(context, start)
    },
    loc: getSelection(context, start)
  }
}

function parseAttributes(context: ParserContext) {
  const attributes = []

  while(context.source.length > 0 && !context.source.startsWith('>')) {
    const attr = parseAttribute(context)
    attributes.push(attr)
    advanceSpaces(context)
  }

  return attributes
}

function parseTag(context: ParserContext) {
  const start = getCursor(context)
  const match = /^<\/?([a-z][^ \t\r\n/>]*)/.exec(context.source)
  if (match) {
    const tag = match[1]
    advanceBy(context, match[0].length)

    // 移除空格
    advanceSpaces(context)

    //  解析标签的属性
    const props = parseAttributes(context)

    let isSelfClosing = context.source.startsWith('/>')
    advanceBy(context, isSelfClosing ? 2 : 1)
    return {
      type: NodeTypes.ELEMENT,
      tag,
      isSelfClosing,
      loc: getSelection(context, start),
      props
    }
  }
}

function parseElement(context: ParserContext) {
  const ele: any = parseTag(context)

  // 递归解析子节点, 如果是 闭合 标签，需要跳过
  const children = parseChildren(context)

  // 移除标签的 闭合 部分
  if (context.source.startsWith('</')) {
    parseTag(context)
  }

  ele.children = children
  ele.loc = getSelection(context, ele.loc.start)

  return ele
}

function parseInterpolation(context: ParserContext) {
  const start = getCursor(context)
  const endIndex = context.source.indexOf('}}')

  advanceBy(context, 2)

  const innerStart = getCursor(context)
  const innerEnd = getCursor(context)

  const contentIndex = endIndex - 2
  let rawContent = parseTextData(context, contentIndex)
  const content = rawContent.trim()

  const startOffset = rawContent.indexOf(content)

  if (startOffset > 0) {
    //  更新开始位置
    advancePositionWithMutation(innerStart, rawContent, startOffset)
  }

  const endOffset = content.length + startOffset
  // 更新结束位置
  advancePositionWithMutation(innerEnd, rawContent, endOffset)

  advanceBy(context, 2)

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
      loc: getSelection(context, innerStart, innerEnd)
    },
    loc: getSelection(context, start)
  }
}

function parseChildren(context: ParserContext) {
  const nodes = []
  while(!isEnd(context)) {
    let node
    const { source: c } = context
    // 状态机(有限状态机)
    if (c.startsWith('{{')) { // 表达式，{{ name }}
      node = parseInterpolation(context)
    } else if (c.startsWith('<')) { // 元素，<div></div>
      node = parseElement(context)
    } else { // 文本，text
      node = parseText(context)
    }
    nodes.push(node)
  }

  const isWhitespace = (source: string) => {
    return !/[^\t\r\n\f ]/.test(source.trim())
  }

  // 移除空节点等
  const result = nodes.filter((node: any) => {
    if (node.type === NodeTypes.TEXT) {
      return !isWhitespace(node.content.trim())
    }
    return true
  })
  return result
}

export function baseParse(input: string, options?: any) {
  const context = createParserContext(input)
  const children = parseChildren(context)
  const root = createRoot(children)
  return  root
}
```

### transform.ts：TransformContext + traverseNode + createRootCodegen

```typescript
// compiler-core/src/transform.ts
import { EMPTY_OBJ, isArray, isString, NOOP, PatchFlagNames, PatchFlags } from "@g-vue-next/shared"
import { convertToBlock, createVNodeCall, NodeTypes, ParentNode, RootNode, TemplateChildNode } from "./ast"
import { ErrorHandler, CompilerOptions, TransformOptions } from "./options"
import { CREATE_COMMENT, FRAGMENT, TO_DISPLAY_STRING } from "./runtimeHelpers"

export interface TransformContext extends ErrorHandler, CompilerOptions {
  selfName: string | null
  root: RootNode
  helpers: Map<symbol, number>
  components: Set<string>
  directives: Set<string>
  hoists: (any[] | null)[]
  imports: any[]
  temps: number
  cached: number
  identifiers: { [name: string]: number | undefined }
  scopes: {
    vFor: number
    vSlot: number
    vPre: number
    vOnce: number
  }
  parent: ParentNode | null
  grandparent: ParentNode | null
  childIndex: number
  inVOnce: boolean
  helper<T extends symbol>(name: T): T
  removeHelper<T extends symbol>(name: T): void
  helperString(name: symbol): string
  replaceNode(node: TemplateChildNode): void
  removeNode(node?: TemplateChildNode): void
  onNodeRemoved(): void
  addIdentifiers(exp: any): void
  removeIdentifiers(exp: any): void
  hoist(exp: any, code: any): any
  cache(exp: any, isVNode: boolean): any
  constantCache: WeakMap<any, any>
}

export function createTransformContext(root: any, options: TransformOptions): TransformContext {
  const nameMatch = options.filename?.replace(/\?.*$/, '')?.match(/([^/\\]+)\.\w+$/)
  const context: TransformContext = {
    // options
    filename: options.filename ?? '',
    selfName: nameMatch,
    prefixIdentifiers: options.prefixIdentifiers ?? false,
    hoistStatic: options.hoistStatic ?? false,
    hmr: options.hmr ?? false,
    cacheHandlers: options.cacheHandlers ?? false,
    nodeTransforms: options.nodeTransforms ?? [],
    directiveTransforms: options.directiveTransforms ?? {},
    transformHoist: options.transformHoist ?? null,
    isBuiltInComponent: options.isBuiltInComponent ?? NOOP,
    isCustomElement: options.isCustomElement ?? NOOP,
    expressionPlugins: options.expressionPlugins ?? [],
    scopeId: options.scopeId ?? null,
    slotted: options.slotted ?? true,
    ssr: options.ssr ?? false,
    inSSR: options.ssr ?? false,
    ssrCssVars: options.ssrCssVars ?? '',
    bindingMetadata: options.bindingMetadata ?? EMPTY_OBJ,
    inline: options.inline ?? false,
    isTS: options.isTS ?? false,
    onError: options.onError ?? NOOP,
    onWarn: options.onWarn ?? NOOP,
    compatConfig: options.compatConfig,
    // state
    root,
    helpers: new Map(),
    components: new Set(),
    directives: new Set(),
    hoists: [],
    imports: [],
    constantCache: new WeakMap(),
    temps: 0,
    cached: 0,
    identifiers: Object.create(null),
    scopes: {
      vFor: 0,
      vSlot: 0,
      vPre: 0,
      vOnce: 0
    },
    parent: null,
    grandparent: null,
    currentNode: root,
    childIndex: 0,
    inVOnce: false,
    // methods
    helper(name) {
      const count = context.helpers.get(name) || 0
      context.helpers.set(name, count + 1)
      return name
    },
    removeHelper(name) {
      const count = context.helpers.get(name)
      if (count) {
        const currentCount = count - 1
        if (!currentCount) {
          context.helpers.delete(name)
        } else {
          context.helpers.set(name, currentCount)
        }
      }
    },
    helperString(name) {
      return `${name as any}`
    },
    replaceNode(node) {},
    removeNode(node) {},
    onNodeRemoved: NOOP,
    addIdentifiers(exp) {},
    removeIdentifiers(exp) {},
    hoist(exp, code) {
      return NOOP
    },
    cache(exp, isVNode) {
      return exp
    }
  }
  return context
}

export function transform(root: any, options: any) {
  // 创建上下文
  const context = createTransformContext(root, options)
  // 深度优先遍历树形结构
  traverseNode(root, context)

  // 对根节点的处理
  createRootCodegen(root, context)
  root.helpers = new Set([...context.helpers.keys()])
  root.transformed = true
}

function getSingleElementRoot(
  root: RootNode
) {
  const children = root.children.filter(x => x.type !== NodeTypes.COMMENT)
  return children.length === 1 && children[0].type === NodeTypes.ELEMENT ? children[0] : null
}

function createRootCodegen(root: RootNode, context: any) {
  const { helper } = context
  const { children } = root
  if (children.length === 1) {
    const singleElementRootChild = getSingleElementRoot(root)
    if (singleElementRootChild && singleElementRootChild.codegenNode) { // 元素节点
      const codegenNode = singleElementRootChild.codegenNode
      if (codegenNode.type === NodeTypes.VNODE_CALL) {
        convertToBlock(codegenNode, context)
      }
      root.codegenNode = codegenNode
    } else { // 文本节点
      root.codegenNode = children[0]
    }
  } else if (children.length > 1) {
    let patchFlag = PatchFlags.STABLE_FRAGMENT
    let patchFlagText = PatchFlagNames[PatchFlags.STABLE_FRAGMENT]
    root.codegenNode = createVNodeCall(
      context,
      helper(FRAGMENT),
      undefined,
      root.children,
      patchFlag,
      undefined,
      undefined,
      true,
      undefined,
      false
    )
  } else {
    // no children = noop.codegen will return null
  }
}

export function traverseChildren(
  parent: ParentNode,
  context: TransformContext
) {
  let i = 0;
  const nodeRemoved = () => {
    i--
  }
  for(; i < parent.children.length; i++) {
    const child = parent.children[i]
    if (isString(child)) continue
    context.grandparent = context.parent
    context.parent = parent
    context.childIndex = i
    context.onNodeRemoved = nodeRemoved
    traverseNode(child, context)
  }
}

export function traverseNode(
  node: RootNode | TemplateChildNode,
  context: TransformContext
) {
  context.currentNode = node
  const { nodeTransforms } = context
  const exitFns = []

  for(let i = 0; i < nodeTransforms.length; i++) {
    const onExit = nodeTransforms[i](node, context)
    if (onExit) {
      if (isArray(onExit)) {
        exitFns.push(...onExit)
      } else {
        exitFns.push(onExit)
      }
    }
    if (!context.currentNode) {
      // node was removed
      return
    } else {
      // node may have been replaced
      node = context.currentNode
    }
  }

  switch (node.type) {
    case NodeTypes.COMMENT:
      context.helper(CREATE_COMMENT)
      break
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING)
      break
    case NodeTypes.IF:
      for(let i = 0; i < node?.branches?.length;i++) {
        traverseNode(node.branches[i], context)
      }
      break
    case NodeTypes.IF_BRANCH:
    case NodeTypes.FOR:
    case NodeTypes.ELEMENT:
    case NodeTypes.ROOT:
      traverseChildren(node, context)
      break
  }

  // 还原上一次的currentNode，因为执行 traverseNode 时，会改变 currentNode 为子节点
  context.currentNode = node

  // 倒序执行
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}
```

### ast.ts：VNodeCall / createVNodeCall / convertToBlock

```typescript
// compiler-core/src/ast.ts
import { isString } from "@g-vue-next/shared"
import { TransformContext } from "./transform"
import { CREATE_VNODE, CREATE_ELEMENT_VNODE, OPEN_BLOCK, CREATE_BLOCK, CREATE_ELEMENT_BLOCK, WITH_DIRECTIVES } from "./runtimeHelpers"

export type Namespace = number

export enum Namespaces {
  HTML,
  SVG,
  MATH_ML,
}

export enum NodeTypes {
  ROOT,
  ELEMENT,
  TEXT,
  COMMENT,
  SIMPLE_EXPRESSION,
  INTERPOLATION,
  ATTRIBUTE,
  DIRECTIVE,
  // containers
  COMPOUND_EXPRESSION,
  IF,
  IF_BRANCH,
  FOR,
  TEXT_CALL,
  // codegen
  VNODE_CALL,
  JS_CALL_EXPRESSION,
  JS_OBJECT_EXPRESSION,
  JS_PROPERTY,
  JS_ARRAY_EXPRESSION,
  JS_FUNCTION_EXPRESSION,
  JS_CONDITIONAL_EXPRESSION,
  JS_CACHE_EXPRESSION,

  // ssr codegen
  JS_BLOCK_STATEMENT,
  JS_TEMPLATE_LITERAL,
  JS_IF_STATEMENT,
  JS_ASSIGNMENT_EXPRESSION,
  JS_SEQUENCE_EXPRESSION,
  JS_RETURN_STATEMENT,
}

export enum ElementTypes {
  ELEMENT,
  COMPONENT,
  SLOT,
  TEMPLATE,
}

export enum ConstantTypes {
  NOT_CONSTANT = 0,
  CAN_SKIP_PATCH,
  CAN_HOIST,
  CAN_STRINGIFY,
}

export interface Node {
  type: NodeTypes
  loc: SourceLocation
}

// The node's range. The `start` is inclusive and `end` is exclusive.
// [start, end)
export interface SourceLocation {
  start: Position
  end: Position
  source: string
}

export interface Position {
  offset: number // from start of file
  line: number
  column: number
}

export type TemplateChildNode = any

export interface RootNode extends Node {
  type: NodeTypes.ROOT
  source: string
  children: TemplateChildNode[]
  helpers: Set<symbol>
  components: string[]
  directives: string[]
  hoists: any[]
  imports: any[]
  cached: number
  temps: number
  codegenNode?: any
  transformed?: boolean
}

export type ParentNode = RootNode

export interface VNodeCall extends Node {
  type: NodeTypes.VNODE_CALL
  tag: string
  props: any
  children: any
  patchFlag: string
  dynamicProps: string
  directives: any
  isBlock: boolean
  disableTracking: boolean
  isComponent: boolean

}

export const locStub = {
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 1, offset: 0 },
  source: ''
}
export function createRoot(children: TemplateChildNode[], source = ''): RootNode {
  return {
    type: NodeTypes.ROOT,
    source,
    children,
    helpers: new Set(),
    components: [],
    directives: [],
    hoists: [],
    imports: [],
    cached: 0,
    temps: 0,
    codegenNode: null,
    loc: locStub
  }
}

export function createCompoundExpression(
  children: TemplateChildNode[],
  loc: SourceLocation
) {
  return {
    type: NodeTypes.COMPOUND_EXPRESSION,
    children,
    loc
  }
}

export function createCallExpression(
  callee,
  args,
  loc = locStub
) {
  return {
    type: NodeTypes.JS_CALL_EXPRESSION,
    callee,
    arguments: args,
    loc
  }
}

export function getVNodeHelper(
  ssr: boolean,
  isComponent: boolean,
): typeof CREATE_VNODE | typeof CREATE_ELEMENT_VNODE {
  return ssr || isComponent ? CREATE_VNODE : CREATE_ELEMENT_VNODE
}

export function getVNodeBlockHelper(
  ssr: boolean,
  isComponent: boolean,
): typeof CREATE_BLOCK | typeof CREATE_ELEMENT_BLOCK {
  return ssr || isComponent ? CREATE_BLOCK : CREATE_ELEMENT_BLOCK
}

export function createVNodeCall(
  context: TransformContext | null,
  tag: string,
  props?: any,
  children?: any,
  patchFlag?: any,
  dynamicProps?: any,
  directives?: any,
  isBlock = false,
  disableTracking = false,
  isComponent = false,
  loc = locStub
) {
  if (context) {
    if (isBlock) {
      context.helper(OPEN_BLOCK)
      context.helper(getVNodeBlockHelper(context.inSSR, isComponent))
    } else {
      context.helper(getVNodeHelper(context.inSSR, isComponent))
    }
    if (directives) {
      context.helper(WITH_DIRECTIVES)
    }
  }
  return {
    type: NodeTypes.VNODE_CALL,
    tag,
    props,
    children,
    patchFlag,
    dynamicProps,
    directives,
    isBlock,
    disableTracking,
    isComponent,
    loc
  }
}

export function createObjectExpression(
  properties,
  loc = locStub
) {
  return {
    type: NodeTypes.JS_OBJECT_EXPRESSION,
    properties,
    loc
  }
}

export function createObjectProperty(
  key,
  value
) {
  return {
    type: NodeTypes.JS_PROPERTY,
    key: isString(key) ? createSimpleExpression(key, true) : key,
    value,
    loc: locStub
  }
}

export function createSimpleExpression(
  content,
  isStatic = false,
  loc = locStub,
  constType = ConstantTypes.NOT_CONSTANT
) {
  return {
    type: NodeTypes.SIMPLE_EXPRESSION,
    isStatic,
    loc,
    content,
    constType: isStatic ? ConstantTypes.CAN_STRINGIFY : constType,
  }
}

export function convertToBlock(
  node: VNodeCall,
  { helper, removeHelper, inSSR }: TransformContext
) {
  if (!node.isBlock) {
    node.isBlock = true
    removeHelper(getVNodeHelper(inSSR, node.isComponent))
    helper(OPEN_BLOCK)
    helper(getVNodeBlockHelper(inSSR, node.isComponent))
  }
}
```

### codegen.ts：CodegenContext + genNode 全家族

```typescript
// compiler-core/src/codegen.ts
import { isArray, isNil, isString, isSymbol } from "@g-vue-next/shared"
import { getVNodeBlockHelper, getVNodeHelper, NodeTypes, RootNode, TemplateChildNode, VNodeCall } from "./ast"
import { CodegenOptions } from "./options"
import { helperNameMap, OPEN_BLOCK, TO_DISPLAY_STRING } from "./runtimeHelpers"
import { isText } from "./utils"

export interface CodegenResult {
  code: string
  ast: any
  preamble: string
  map?: any
}

export type CodegenNode = TemplateChildNode | any

export interface CodegenContext extends Omit<Required<CodegenOptions>, 'bindingMetadata' | 'inline'> {
  source: string
  code: string
  line: number
  column: number
  offset: number
  indentLevel: number
  pure: boolean
  map?: any
  helper(key: symbol): string
  push(code: string, newLineIndex?: number, node?: CodegenNode): void
  indent(): void
  deindent(withoutNewLine?: boolean): void
  newline(): void
}

enum NewLineType {
  Start = 0,
  End = -1,
  None = -2,
  Unknown = -3
}

function createCodegenContext(
  ast: RootNode,
  {
    mode = 'function',
    prefixIdentifiers = mode === 'module',
    sourceMap = false,
    filename = 'template.vue.html',
    scopeId = null,
    optimizeImports = false,
    runtimeGlobalName = 'Vue',
    runtimeModuleName = `vue`,
    ssrRuntimeModuleName = `vue/server-renderer`,
    ssr = false,
    isTS = false,
    inSSR = false
  }: CodegenOptions
): CodegenContext {
  const context: CodegenContext = {
    mode,
    prefixIdentifiers,
    sourceMap,
    filename,
    scopeId,
    optimizeImports,
    runtimeGlobalName,
    runtimeModuleName,
    ssrRuntimeModuleName,
    ssr,
    isTS,
    inSSR,
    source: ast.source,
    code: ``,
    column: 1,
    line: 1,
    offset: 0,
    indentLevel: 0,
    pure: false,
    map: undefined,
    helper(key) {
      return `_${helperNameMap[key]}`
    },
    push(code, newLineIndex = NewLineType.None, node) {
      context.code += code
    },
    indent() {
      newline(++context.indentLevel)
    },
    deindent(withoutNewLine = false) {
      if (withoutNewLine) {
        --context.indentLevel
      } else {
        newline(--context.indentLevel)
      }
    },
    newline() {
      newline(context.indentLevel)
    }
  }

  function newline(n: number) {
    context.push('\n' + `  `.repeat(n), NewLineType.Start)
  }

  return context
}

function genFunctionPreamble(ast: RootNode, context: CodegenContext) {
  const { push, newline, deindent, indent, runtimeGlobalName, helper } = context
  const VueBinding = runtimeGlobalName
  const helpers = Array.from(ast.helpers)

  if (helpers.length > 0) {
    push(`const { ${helpers.map(s => `${helperNameMap[s]}: ${helper(s)}`).join(', ')} } = ${VueBinding}\n`)
  }

  newline()
  push(`return `)
}

function genNullableArgs(
  args: any[]
) {
  let i = args.length
  while(i--) {
    if (!isNil(args[i])) break
  }
  return args.slice(0, i + 1).map(arg => arg || `null`)
}

function genNodeListAsArray(
  nodes: (string | CodegenNode | TemplateChildNode)[],
  context: CodegenContext
) {
  const multilines = nodes.length > 3 || nodes.some(n => isArray(n) || !isText(n))
  context.push(`[`)
  multilines && context.indent()
  genNodeList(nodes, context, multilines)
  multilines && context.deindent()
  context.push(']')
}

function genNodeList(
  nodes: (string | symbol | CodegenNode | TemplateChildNode)[],
  context: CodegenContext,
  multilines: boolean = false,
  comma: boolean = true
) {
  const { push, newline } = context

  for(let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (isString(node)) {
      push(node, NewLineType.Unknown)
    } else if (isArray(node)) {
      genNodeListAsArray(node, context)
    } else {
      genNode(node, context)
    }
    if (i < nodes.length - 1) {
      if (multilines) {
        comma && push(',')
        newline()
      } else {
        comma && push(', ')
      }
    }
  }
}

function genVNodeCall(node: VNodeCall, context: CodegenContext) {
  const { push, helper} = context
  const { tag, props, children, patchFlag, isBlock, isComponent, dynamicProps} = node
  let patchFlagString
  if (patchFlag) {
    patchFlagString = String(patchFlag)
  }

  if (isBlock) {
    push(`(${helper(OPEN_BLOCK)}(${``}), `)
  }

  const callHelper = isBlock
    ? getVNodeBlockHelper(context.inSSR, isComponent)
    : getVNodeHelper(context.inSSR, isComponent)

  push(helper(callHelper) + `(`, NewLineType.None, node)

  genNodeList(
    genNullableArgs([tag, props, children, patchFlagString, dynamicProps]),
    context
  )
  push(`)`)
  if (isBlock) {
    push(`)`)
  }
}

function genText(
  node,
  context: CodegenContext
) {
  context.push(JSON.stringify(node.content), NewLineType.Unknown, node)
}

function genCallExpression(
  node: RootNode | any,
  context: CodegenContext
) {
  const { push, helper } = context
  const callee = isString(node.callee) ? node.callee : helper(node.callee)
  push(callee + `(`, NewLineType.None, node)
  genNodeList(node.arguments, context)
  push(')')
}

function genObjectExpression(
  node: RootNode | any,
  context: CodegenContext
) {
  const { push, indent, deindent, newline } = context
  const { properties } = node
  if (!properties.length) {
    push(`{}`, NewLineType.None, node)
    return
  }
  const multilines = properties.length > 1
  push(multilines ? `{` : `{ `)
  multilines && indent()
  for (let i = 0; i < properties.length; i++) {
    const {key, value} = properties[i]
    genExpressionAsPropertyKey(key, context)
    push(`: `)
    genNode(value, context)
    if (i < properties.length - 1) {
      push(',')
      newline()
    }
  }
  multilines && deindent()
  push(multilines ? `}` : ` }`)
}

function genExpressionAsPropertyKey(
  node: RootNode | any,
  context: CodegenContext
) {
  const { push } = context
  if (node.type === NodeTypes.COMPOUND_EXPRESSION) {
    push('[')
    genCompoundExpression(node, context)
    push(']')
  } else if (node.isStatic) {
    const text = JSON.stringify(node.content)
    push(text, NewLineType.None, node)
  } else {
    push(`${node.content || node}`, NewLineType.Unknown, node)
  }
}

function genCompoundExpression(
  node: RootNode | any,
  context: CodegenContext
) {
  for (let i = 0; i < node.children?.length; i++) {
    const child = node.children[i]
    if (isString(child)) {
      context.push(child, NewLineType.Unknown)
    } else {
      genNode(child, context)
    }
  }
}

function genInterpolation(
  node: RootNode | any,
  context: CodegenContext
) {
  const { push, helper } = context
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, context)
  push(`)`)
}

function genExpression(
  node: RootNode,
  context: CodegenContext
) {
  const { content, isStatic } = node as any
  context.push(
    isStatic ? JSON.stringify(content) : content,
    NewLineType.Unknown,
    node
  )
}

function genNode(node: CodegenNode | symbol | string, context: CodegenContext) {
  if (isString(node)) {
    context.push(node, NewLineType.Unknown)
    return
  }
  if (isSymbol(node)) {
    context.push(context.helper(node))
    return
  }
  switch(node.type) {
    case NodeTypes.ELEMENT:
    case NodeTypes.IF:
    case NodeTypes.FOR:
      genNode(node.codegenNode, context)
      break
    case NodeTypes.TEXT:
      genText(node, context)
      break
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context)
      break
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context)
      break
    case NodeTypes.VNODE_CALL:
      genVNodeCall(node, context)
      break
    case NodeTypes.JS_CALL_EXPRESSION:
      genCallExpression(node, context)
      break
    case NodeTypes.JS_OBJECT_EXPRESSION:
      genObjectExpression(node, context)
      break
    default:
      console.log(node?.type, node?.codegenNode)
      break
  }
}

export function generate(
  ast: RootNode,
  options: any = {},
): any {
  const context = createCodegenContext(ast, options)
  const { ssr, push, indent, deindent } = context

  const isSetupInlined = !!options.inline
  const preambleContext = isSetupInlined ? createCodegenContext(ast, options) : context
  // 生成函数前言
  genFunctionPreamble(ast, context)

  const functionName = ssr ? 'ssrRender' : 'render'
  const args = ssr ? ['_ctx', '_push', '_parent', '_attrs'] : ['_ctx', '_cache']
  const signature = args.join(', ')
  push(`function ${functionName}(${signature}) {`)
  indent()

  if (!ssr) {
    push(`return `)
  }

  if (ast.codegenNode) {
    genNode(ast.codegenNode, context)
  } else {
    push(`null`)
  }

  deindent()
  push(`}`)

  return {
    ast,
    code: context.code,
    preamble: isSetupInlined? preambleContext.code : ``,
    map: context.map ? context.map.toJSON() : undefined,
  }
}
```

### vnode.ts：PatchFlags / openBlock / createElementBlock（笔记 29）

Patch Flags 的完整枚举定义，是本篇第二节第 3 小节讲的"标记生成"最终会落地成的具体数值：

```typescript
// shared/src/patchFlags.ts
export enum PatchFlags {
  TEXT = 1,
  CLASS = 1 << 1,
  STYLE = 1 << 2,
  PROPS = 1 << 3,
  FULL_PROPS = 1 << 4,
  NEED_HYDRATION = 1 << 5,
  STABLE_FRAGMENT = 1 << 6,
  KEYED_FRAGMENT = 1 << 7,
  UNKEYED_FRAGMENT = 1 << 8,
  NEED_PATCH = 1 << 9,
  DYNAMIC_SLOTS = 1 << 10,
  DEV_ROOT_FRAGMENT = 1 << 11,
  HOISTED = -1,
  BAIL = -2,
}

export const PatchFlagNames: Record<PatchFlags, string> = {
  [PatchFlags.TEXT]: `TEXT`,
  [PatchFlags.CLASS]: `CLASS`,
  [PatchFlags.STYLE]: `STYLE`,
  [PatchFlags.PROPS]: `PROPS`,
  [PatchFlags.FULL_PROPS]: `FULL_PROPS`,
  [PatchFlags.NEED_HYDRATION]: `NEED_HYDRATION`,
  [PatchFlags.STABLE_FRAGMENT]: `STABLE_FRAGMENT`,
  [PatchFlags.KEYED_FRAGMENT]: `KEYED_FRAGMENT`,
  [PatchFlags.UNKEYED_FRAGMENT]: `UNKEYED_FRAGMENT`,
  [PatchFlags.NEED_PATCH]: `NEED_PATCH`,
  [PatchFlags.DYNAMIC_SLOTS]: `DYNAMIC_SLOTS`,
  [PatchFlags.DEV_ROOT_FRAGMENT]: `DEV_ROOT_FRAGMENT`,
  [PatchFlags.HOISTED]: `HOISTED`,
  [PatchFlags.BAIL]: `BAIL`,
}
```

`openBlock`/`closeBlock`/`createElementBlock` 是 Block 收集机制的运行时落点，编译产物里的 `(_openBlock(), _createElementBlock(...))` 就是调用这几个函数：

```typescript
// runtime-core/src/vnode.ts
export const blockStack: VNode['dynamicChildren'][] = []
export let currentBlock: VNode['dynamicChildren'] = null

export function openBlock(disableTracking = false) {
  blockStack.push((currentBlock = disableTracking ? null : []))
}
export function closeBlock() {
  blockStack.pop()
  currentBlock = blockStack[blockStack.length - 1] || null
}
export function createElementBlock(
  type: string | typeof Fragment,
  props?: Record<string, any> | null,
  children?: any,
  patchFlag?: number,
  dynamicProps?: string[],
  shapeFlag?: number,
) {
  return setupBlock(
    createBaseVNode(
      type,
      props,
      children,
      patchFlag,
      dynamicProps,
      shapeFlag,
      true /* isBlock */
    )
  )
}

export function createBlock(
  type: VNodeTypes,
  props?: Record<string, any> | null,
  children?: any,
  patchFlag?: number,
  dynamicProps?: string[]
) {
  return setupBlock(
    createVNode(
      type,
      props,
      children,
      patchFlag,
      dynamicProps,
      true /* isBlock: prevent a block from tracking itself */,
    )
  )
}

export function setupBlock(vnode: VNode) {
  vnode.dynamicChildren = currentBlock || null
  closeBlock()
  return vnode
}
```

### transforms/：transformElement.ts、transformText.ts、transformExpression.ts

```typescript
// compiler-core/src/transforms/transformElement.ts
import { createObjectExpression, createObjectProperty, createVNodeCall, ElementTypes, NodeTypes } from "../ast";
import { NodeTransform } from "../options";

export const transformElement: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.ELEMENT) {

  }
  return function postTransformElement() {
    node = context.currentNode
    if (
      !(
        node.type === NodeTypes.ELEMENT
        // && (node.tagType === ElementTypes.ELEMENT || node.tagType === ElementTypes.COMPONENT)
      )
    ) {
      return
    }
    const { tag, props, children } = node
    let vnodeTag = `"${tag}"`
    let vnodeProps: any
    let vnodeChildren: any
    let patchFlag: any | 0 = 0

    // props
    if (props?.length > 0) {
      vnodeProps = []
      for(let i = 0; i < props.length; i++) {
        const { name, value } = props[i]
        vnodeProps.push(createObjectProperty(name, value))
      }
      const propsBuildResult = vnodeProps.length > 0 ? createObjectExpression(vnodeProps) : null
      vnodeProps = propsBuildResult
    }
    // children
    if (node.children.length > 0) {
      if (children.length === 1) {
        const child = children[0]
        const type = child.type
        if (type === NodeTypes.TEXT) {
          vnodeChildren = child
        } else {
          vnodeChildren = children
        }

      } else if (children.length > 1) {
        vnodeChildren = children
      }
    }

    node.codegenNode = createVNodeCall(
      context,
      vnodeTag,
      vnodeProps,
      vnodeChildren,
      patchFlag === 0 ? undefined : patchFlag,
      undefined,
      undefined,
      false,
      false,
      false,
      node.loc
    )
  }
}
```

```typescript
// compiler-core/src/transforms/transformText.ts
import { PatchFlags } from "@g-vue-next/shared";
import { createCallExpression, createCompoundExpression, NodeTypes } from "../ast";
import { NodeTransform } from "../options";
import { isText } from "../utils";
import { CREATE_TEXT } from "../runtimeHelpers";

export const transformText: NodeTransform = (node, context) => {
  if (
    node.type === NodeTypes.ROOT ||
    node.type === NodeTypes.ELEMENT ||
    node.type === NodeTypes.FOR ||
    node.type === NodeTypes.IF_BRANCH

  ) {
    // ⚠️：注意处理顺序，这里要等待子节点处理完毕，再赋值给父节点
    return () => {
      const children = node.children
      let currentContainer: any = undefined
      let hasText = false

      for(let i = 0; i < children.length; i++) {
        const child = children[i]
        if (isText(child)) {
          hasText = true
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j];
            if (isText(next)) {
              if (!currentContainer) {
                currentContainer = children[i] = createCompoundExpression([child], child.loc)
              }
              currentContainer.children.push(' + ', next) // 添加
              children.splice(j, 1) // 删除
              j--
            } else {
              currentContainer = undefined
              break
            }
          }
        }
      }

      // 判断有没有剩余的文本, 没有就不需要 createTextVNode
      if (!hasText || children.length === 1) {
        return
      }

      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (isText(child) || child.type === NodeTypes.COMPOUND_EXPRESSION) {
          const callArgs = []
          if (child.type !== NodeTypes.TEXT || child.content !== ' ') {
            callArgs.push([child, PatchFlags.TEXT])
          }
          children[i] = {
            type: NodeTypes.TEXT_CALL,
            content: child,
            loc: child.loc,
            codegenNode: createCallExpression(
              context.helper(CREATE_TEXT),
              callArgs
            )
          }
        }
      }
    }
  }
}
```

```typescript
// compiler-core/src/transforms/transformExpression.ts
import { NodeTypes, RootNode, TemplateChildNode } from "../ast";
import { NodeTransform } from "../options";
import { TransformContext } from "../transform";

export const transformExpression: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.INTERPOLATION) { // 插值
    node.content = processExpression(node.content, context);
  } else if (node.type === NodeTypes.ELEMENT) { // 元素
    // console.log('元素', node)
  }
}

function processExpression(node: RootNode | TemplateChildNode, context: TransformContext) {
  node.content = `_ctx.${node.content}`
  return node
}
```

### resolveComponent 补全实现（笔记该处代码被注释掉，本节基于 Vue 3.4 真实源码简化摘录补充）

笔记 32 的 `transformElement.ts` 里，判断 `tagType` 的那一行被注释掉了（前面已经展示过），意味着组件识别分支在这份手写实现里从未真正生效。下面是**补全后**的简化版本，让 `transformElement` 能区分组件和原生元素，并生成对应的 `resolveComponent` 调用：

```typescript
// 补全实现：resolveComponent 相关逻辑（Vue 3.4 简化摘录，笔记原文该处是注释）
import { RESOLVE_COMPONENT } from "../runtimeHelpers"

function resolveComponentType(node: any, context: TransformContext): string {
  const { tag, tagType } = node

  // 原生标签直接返回字符串字面量
  if (tagType !== ElementTypes.COMPONENT) {
    return `"${tag}"`
  }

  // 组件标签：登记组件名，生成 resolveComponent 调用，helper 计数 +1
  context.helper(RESOLVE_COMPONENT)
  context.components.add(tag)
  return toValidAssetId(tag, 'component') // 形如 _component_MyComponent
}

function toValidAssetId(name: string, type: 'component' | 'directive'): string {
  return `_${type}_${name.replace(/[^\w]/g, '_')}`
}
```

`context.components` 收集到的组件名，在 generate 阶段的函数前言里会被展开成一串 `resolveComponent` 调用语句（和 `genFunctionPreamble` 展开 `helpers` 的逻辑是同一套机制，只是这里额外多了一步"先声明变量，再在 render 函数体里引用"）：

```javascript
// generate 阶段针对 components 生成的前言代码示意
const _component_MyComponent = _resolveComponent("MyComponent")

return function render(_ctx, _cache) {
  return (_openBlock(), _createBlock(_component_MyComponent, null))
}
```

---

## 🧩 四、生产级最佳实践

### 构建时编译 vs 运行时编译：生产环境只用 runtime 版本

Vue 3 的 npm 包实际上分了好几种构建产物——带编译器的完整版（`vue.esm-bundler.js`，能在浏览器里直接编译 `template` 字符串）和只有运行时的精简版（`vue.runtime.esm-bundler.js`，不含 parse/transform/generate 这套编译器代码，体积小很多）。用 `vue-loader`/`@vitejs/plugin-vue` 处理 `.vue` 单文件组件时，模板已经在**构建阶段**被编译成了 render 函数，生产环境完全不需要运行时编译器：

```javascript
// vite.config.js / vue.config.js 里 alias 配置，确保引入的是 runtime-only 版本
export default {
  resolve: {
    alias: {
      vue: 'vue/dist/vue.runtime.esm-bundler.js'
    }
  }
}
```

主流构建工具（Vite/Webpack + 对应插件）默认就是这么配置的，这一条更适合排查"为什么我的 Vue 包体积比预期大"——如果发现引入了带编译器的完整版，通常是某个第三方库或者手动配置的 CDN 引入方式带来的。

### template vs render 的选择

`<template>` 能享受本文讲的全部编译时优化，绝大多数业务代码应该优先选它；`render` 函数（或 JSX）在下面这些场景更合适：

- **需要动态组件类型的复杂分支逻辑**：比如根据一个配置数组批量渲染不同类型的表单控件，用 `render` 写循环生成逻辑比 `<template>` 里堆一串 `v-if`/`v-else-if` 更清晰
- **需要极致灵活的条件渲染**（超过 3 个分支的 `v-if` 链）：`render` 函数里可以用 `switch`、查表等更灵活的控制流表达
- **封装底层工具组件**（比如给组件库写的高阶包装组件）：直接操作 VNode 更贴近底层，不需要经过模板解析

```javascript
// 医疗场景：根据字段类型动态渲染不同表单控件，render 比一长串 v-if 更清晰
const fieldTypeMap = {
  text: (field) => h(ElInput, { modelValue: field.value }),
  select: (field) => h(ElSelect, { modelValue: field.value, options: field.options }),
  date: (field) => h(ElDatePicker, { modelValue: field.value })
}

export default {
  props: ['fields'],
  render() {
    return h('div', this.fields.map(field =>
      fieldTypeMap[field.type]?.(field) ?? null
    ))
  }
}
```

### 善用 `<script setup>` 减少样板代码，同时理解编译产物避坑

第二节讲过 `<script setup>` 的编译产物本质是"顶层变量自动暴露"，这条机制带来一个容易踩的坑——**含顶层 `await` 的组件会自动变成异步组件**：

```vue
<script setup>
// 顶层 await：这个组件的 setup() 编译后返回一个 Promise
const { data } = await fetchDrugDetail(drugId)
</script>
```

这个组件必须被 `<Suspense>` 包裹才能正常渲染（第 6 篇讲过），如果忘记包裹，页面会直接报错。排查这类问题时，先检查 `<script setup>` 里是否有裸露的顶层 `await`。

### 自定义指令的编译与运行时实现

> ⚠️ **笔记未覆盖，本节基于官方文档补充讲解**：自定义指令的五个钩子在 Vue 3.2 之后是 `created`/`beforeMount`/`mounted`/`beforeUpdate`/`updated`/`beforeUnmount`/`unmounted`（对齐组件生命周期命名，比 Vue 2 的 `bind`/`inserted`/`update`/`componentUpdated`/`unbind` 更好记）：

```javascript
const vFocus = {
  mounted: (el) => el.focus(),
  updated: (el, binding) => {
    if (binding.value) el.focus()
  }
}
```

编译阶段，模板里的 `v-focus` 会被转换成 `withDirectives` 调用——把指令对象和绑定的 VNode 打包在一起，运行时在挂载/更新/卸载的对应时机遍历指令数组，依次调用钩子函数：

```javascript
// v-focus 编译产物：withDirectives 把 [指令对象, 值, 参数, 修饰符] 数组附加到 VNode 上
const _directive_focus = _resolveDirective("focus")

return _withDirectives((_openBlock(), _createElementBlock('input', null, null, 512 /* NEED_PATCH */)), [
  [_directive_focus]
])
```

`NEED_PATCH`（512）这个 Patch Flag 专门用来标记"这个节点挂了自定义指令或者 `onVnodeXXX` 钩子"，第 3 篇讲过的 `patchElement` 会因为这个标记走一条额外的处理分支，即使没有其他动态绑定，也要保证指令的 `updated` 钩子每次更新都会被调用。

### v-for + v-if 同节点反模式：处方药品列表场景

呼应本文第二节第 14 小节讲的优先级反转问题，实际业务代码里常见的反模式和推荐写法对比：

```vue
<!-- ❌ 反模式：v-if 依赖 v-for 的循环变量，Vue 3 下会报错或访问不到 item -->
<li v-for="drug in prescriptionList" v-if="drug.inStock" :key="drug.id">
  {{ drug.name }}
</li>
```

```vue
<!-- ✅ 推荐：用 computed 提前过滤好列表，v-for 单独使用 -->
<script setup>
import { computed } from 'vue'

const props = defineProps<{ prescriptionList: Drug[] }>()
const availableDrugs = computed(() =>
  props.prescriptionList.filter(drug => drug.inStock)
)
</script>

<template>
  <li v-for="drug in availableDrugs" :key="drug.id">
    {{ drug.name }}
  </li>
</template>
```

`computed` 方案除了避开优先级反转的坑，还有性能收益——`v-for` 内联 `v-if` 的写法每次渲染都要对**完整列表**逐项判断，`computed` 过滤只在依赖的 `prescriptionList` 真正变化时重新计算一次，配合缓存特性避免了不必要的重复过滤。

---

## 🧩 五、手写实现（可独立跑通）

环境沿用第 1 篇的 Vite + TypeScript 配置，`compiler-core`/`compiler-dom`/`shared` 三个子包按笔记 30~33 的顺序逐步搭建，与笔记原文逐字一致，可以直接复制到对应文件里跑通。

### 子包初始化：compiler-core / compiler-dom

```shell
cd g-vue-next
mkdir compiler-core compiler-dom
```

```json
{
  "name": "@g-vue-next/compiler-core",
  "version": "3.4.0",
  "description": "",
  "module": "dist/compiler-core.esm.js",
  "buildOptions": {
    "name": "GVueNextCompilerCore",
    "formats": ["esm-bundler", "esm", "cjs"]
  },
  "dependencies": {
    "@g-vue-next/shared": "workspace:^"
  }
}
```

```json
{
  "name": "@g-vue-next/compiler-dom",
  "version": "3.4.0",
  "description": "",
  "module": "dist/compiler-dom.esm.js",
  "buildOptions": {
    "name": "GVueNextCompilerDom",
    "formats": ["esm-bundler", "esm", "cjs"]
  },
  "dependencies": {
    "@g-vue-next/compiler-core": "workspace:^",
    "@g-vue-next/shared": "workspace:^"
  }
}
```

主包 `vue` 也要接入新的两个编译子包，`index.ts` 统一 re-export：

```typescript
// packages/vue/src/index.ts
export * from '@g-vue-next/shared'
export * from '@g-vue-next/reactivity'
export * from '@g-vue-next/runtime-core'
export * from '@g-vue-next/runtime-dom'
export * from '@g-vue-next/compiler-core'
export * from '@g-vue-next/compiler-dom'
```

以下是笔记 30~33 里逐步搭建起来的 compiler-core / compiler-dom 完整实现，与三、源码解析里讲解用的代码片段同源，这里按文件全量摘录，方便直接复制到本地工程跑通。

### compiler-core/src/ast.ts（全量）

```typescript
import { isString } from "@g-vue-next/shared"
import { TransformContext } from "./transform"
import { CREATE_VNODE, CREATE_ELEMENT_VNODE, OPEN_BLOCK, CREATE_BLOCK, CREATE_ELEMENT_BLOCK, WITH_DIRECTIVES } from "./runtimeHelpers"

export type Namespace = number

export enum Namespaces {
  HTML,
  SVG,
  MATH_ML,
}

export enum NodeTypes {
  ROOT,
  ELEMENT,
  TEXT,
  COMMENT,
  SIMPLE_EXPRESSION,
  INTERPOLATION,
  ATTRIBUTE,
  DIRECTIVE,
  // containers
  COMPOUND_EXPRESSION,
  IF,
  IF_BRANCH,
  FOR,
  TEXT_CALL,
  // codegen
  VNODE_CALL,
  JS_CALL_EXPRESSION,
  JS_OBJECT_EXPRESSION,
  JS_PROPERTY,
  JS_ARRAY_EXPRESSION,
  JS_FUNCTION_EXPRESSION,
  JS_CONDITIONAL_EXPRESSION,
  JS_CACHE_EXPRESSION,

  // ssr codegen
  JS_BLOCK_STATEMENT,
  JS_TEMPLATE_LITERAL,
  JS_IF_STATEMENT,
  JS_ASSIGNMENT_EXPRESSION,
  JS_SEQUENCE_EXPRESSION,
  JS_RETURN_STATEMENT,
}

export enum ElementTypes {
  ELEMENT,
  COMPONENT,
  SLOT,
  TEMPLATE,
}

export enum ConstantTypes {
  NOT_CONSTANT = 0,
  CAN_SKIP_PATCH,
  CAN_HOIST,
  CAN_STRINGIFY,
}

export interface Node {
  type: NodeTypes
  loc: SourceLocation
}

// The node's range. The `start` is inclusive and `end` is exclusive.
// [start, end)
export interface SourceLocation {
  start: Position
  end: Position
  source: string
}

export interface Position {
  offset: number // from start of file
  line: number
  column: number
}

export type TemplateChildNode = any

export interface RootNode extends Node {
  type: NodeTypes.ROOT
  source: string
  children: TemplateChildNode[]
  helpers: Set<symbol>
  components: string[]
  directives: string[]
  hoists: any[]
  imports: any[]
  cached: number
  temps: number
  codegenNode?: any
  transformed?: boolean
}

export type ParentNode = RootNode

export interface VNodeCall extends Node {
  type: NodeTypes.VNODE_CALL
  tag: string
  props: any
  children: any
  patchFlag: string
  dynamicProps: string
  directives: any
  isBlock: boolean
  disableTracking: boolean
  isComponent: boolean

}

export const locStub = {
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 1, offset: 0 },
  source: ''
}
export function createRoot(children: TemplateChildNode[], source = ''): RootNode {
  return {
    type: NodeTypes.ROOT,
    source,
    children,
    helpers: new Set(),
    components: [],
    directives: [],
    hoists: [],
    imports: [],
    cached: 0,
    temps: 0,
    codegenNode: null,
    loc: locStub
  }
}

export function createCompoundExpression(
  children: TemplateChildNode[],
  loc: SourceLocation
) {
  return {
    type: NodeTypes.COMPOUND_EXPRESSION,
    children,
    loc
  }
}

export function createCallExpression(
  callee,
  args,
  loc = locStub
) {
  return {
    type: NodeTypes.JS_CALL_EXPRESSION,
    callee,
    arguments: args,
    loc
  }
}

export function getVNodeHelper(
  ssr: boolean,
  isComponent: boolean,
): typeof CREATE_VNODE | typeof CREATE_ELEMENT_VNODE {
  return ssr || isComponent ? CREATE_VNODE : CREATE_ELEMENT_VNODE
}

export function getVNodeBlockHelper(
  ssr: boolean,
  isComponent: boolean,
): typeof CREATE_BLOCK | typeof CREATE_ELEMENT_BLOCK {
  return ssr || isComponent ? CREATE_BLOCK : CREATE_ELEMENT_BLOCK
}

export function createVNodeCall(
  context: TransformContext | null,
  tag: string,
  props?: any,
  children?: any,
  patchFlag?: any,
  dynamicProps?: any,
  directives?: any,
  isBlock = false,
  disableTracking = false,
  isComponent = false,
  loc = locStub
) {
  if (context) {
    if (isBlock) {
      context.helper(OPEN_BLOCK)
      context.helper(getVNodeBlockHelper(context.inSSR, isComponent))
    } else {
      context.helper(getVNodeHelper(context.inSSR, isComponent))
    }
    if (directives) {
      context.helper(WITH_DIRECTIVES)
    }
  }
  return {
    type: NodeTypes.VNODE_CALL,
    tag,
    props,
    children,
    patchFlag,
    dynamicProps,
    directives,
    isBlock,
    disableTracking,
    isComponent,
    loc
  }
}

export function createObjectExpression(
  properties,
  loc = locStub
) {
  return {
    type: NodeTypes.JS_OBJECT_EXPRESSION,
    properties,
    loc
  }
}

export function createObjectProperty(
  key,
  value
) {
  return {
    type: NodeTypes.JS_PROPERTY,
    key: isString(key) ? createSimpleExpression(key, true) : key,
    value,
    loc: locStub
  }
}

export function createSimpleExpression(
  content,
  isStatic = false,
  loc = locStub,
  constType = ConstantTypes.NOT_CONSTANT
) {
  return {
    type: NodeTypes.SIMPLE_EXPRESSION,
    isStatic,
    loc,
    content,
    constType: isStatic ? ConstantTypes.CAN_STRINGIFY : constType,
  }
}

export function convertToBlock(
  node: VNodeCall,
  { helper, removeHelper, inSSR }: TransformContext
) {
  if (!node.isBlock) {
    node.isBlock = true
    removeHelper(getVNodeHelper(inSSR, node.isComponent))
    helper(OPEN_BLOCK)
    helper(getVNodeBlockHelper(inSSR, node.isComponent))
  }
}
```

### compiler-core/src/parser.ts（全量）

```typescript
import { createRoot, NodeTypes } from "./ast"

export interface ParserContext {
  originalSource: string
  source: string
  line: number
  column: number
  offset: number
}

function createParserContext(content: string): ParserContext {
  return {
    originalSource: content,
    source: content,
    line: 1,
    column: 1,
    offset: 0,
  }
}

function isEnd(context: ParserContext) {
  const c = context.source
  // 如果源字符串中包含有 </ 字符串，则为 停止
  if (c.startsWith('</')) {
    return true
  }
  return !c
}

function advanceBy(context: ParserContext, length: number) {
  const str = context.source
  context.source = context.source.slice(length)
  advancePositionWithMutation(context, str, length)
}

function advanceSpaces(context: ParserContext) {
  const match = /^[ \t\r\n]+/.exec(context.source)
  if (match) {
    advanceBy(context, match[0].length)
  }
}

function advancePositionWithMutation(context: ParserContext, str: string, endIndex: number) {
  let linesCount = 0
  let returnLine = -1
  for (let i = 0; i < endIndex; i++) {
    // 如果是换行，需要换行处理
    if (str.charCodeAt(i) === 10) {
      linesCount++
      returnLine = i // 记录回车换行的索引
    }
  }
  context.line += linesCount // 计算行号
  context.offset += endIndex // 计算偏移量
  // 计算列数
  context.column = returnLine === -1 ? context.column + endIndex : endIndex - returnLine
}

function parseTextData(context: ParserContext, length: number): string {

  const rawText = context.source.slice(0, length)
  advanceBy(context, length)
  return rawText.replace(/[\n\t\r\f ]+/g, ' ').trim()
}

function parseText(context: ParserContext): any {
  const tokes = ['<', '{{'] // 找当前离得最近的开始token
  let endIndex = context.source.length // 假设结束索引值为源代码的长度

  for(let i =0; i < tokes.length; i++) {
    const index = context.source.indexOf(tokes[i], 1)
    if (index > -1 && endIndex > index) {
      endIndex = index
    }
  }
  const start = getCursor(context)
  const content = parseTextData(context, endIndex)

  return {
    type: NodeTypes.TEXT,
    content,
    loc: getSelection(context, start),
  }
}

function getCursor(context: ParserContext): any {
  const { offset, column, line } = context
  return { offset, line, column }
}

function getSelection(context: ParserContext, start: any, end?: any) {
  if (!end) {
    end = getCursor(context)
  }
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset),
  }
}

function isQuote(text: string) {
  return text === '"' || text === "'" || text === '`'
}

function parseAttributeValue(context: ParserContext): any {
  let content
  const quote = context.source[0]

  if (isQuote(quote)) {
    advanceBy(context, 1)
    const endIndex = context.source.indexOf(quote)
    content = parseTextData(context, endIndex)
    advanceBy(context, 1)
  } else {
    advanceSpaces(context)
    content = context.source.match(/([^ \t\r\n/>])+/)[1]
    advanceBy(context, content.length)
    advanceSpaces(context)
  }
  return content
}

function parseAttribute(context: ParserContext) {
  const start = getCursor(context)
  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)
  const name = match[0]
  advanceBy(context, name.length)
  if (/^[\t\r\n\f ]*=/.test(context.source)) {
    advanceSpaces(context)
    advanceBy(context, 1) // 删除=
  }

  const content = parseAttributeValue(context)
  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: {
      type: NodeTypes.TEXT,
      content,
      loc: getSelection(context, start)
    },
    loc: getSelection(context, start)
  }
}

function parseAttributes(context: ParserContext) {
  const attributes = []

  while(context.source.length > 0 && !context.source.startsWith('>')) {
    const attr = parseAttribute(context)
    attributes.push(attr)
    advanceSpaces(context)
  }

  return attributes
}

function parseTag(context: ParserContext) {
  const start = getCursor(context)
  const match = /^<\/?([a-z][^ \t\r\n/>]*)/.exec(context.source)
  if (match) {
    const tag = match[1]
    advanceBy(context, match[0].length)

    // 移除空格
    advanceSpaces(context)

    //  解析标签的属性
    const props = parseAttributes(context)

    let isSelfClosing = context.source.startsWith('/>')
    advanceBy(context, isSelfClosing ? 2 : 1)
    return {
      type: NodeTypes.ELEMENT,
      tag,
      isSelfClosing,
      loc: getSelection(context, start),
      props
    }
  }
}

function parseElement(context: ParserContext) {
  const ele: any = parseTag(context)

  // 递归解析子节点, 如果是 闭合 标签，需要跳过
  const children = parseChildren(context)

  // 移除标签的 闭合 部分
  if (context.source.startsWith('</')) {
    parseTag(context)
  }

  ele.children = children
  ele.loc = getSelection(context, ele.loc.start)

  return ele
}

function parseInterpolation(context: ParserContext) {
  const start = getCursor(context)
  const endIndex = context.source.indexOf('}}')

  advanceBy(context, 2)

  const innerStart = getCursor(context)
  const innerEnd = getCursor(context)

  const contentIndex = endIndex - 2
  let rawContent = parseTextData(context, contentIndex)
  const content = rawContent.trim()

  const startOffset = rawContent.indexOf(content)

  if (startOffset > 0) {
    //  更新开始位置
    advancePositionWithMutation(innerStart, rawContent, startOffset)
  }

  const endOffset = content.length + startOffset
  // 更新结束位置
  advancePositionWithMutation(innerEnd, rawContent, endOffset)

  advanceBy(context, 2)

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
      loc: getSelection(context, innerStart, innerEnd)
    },
    loc: getSelection(context, start)
  }
}

function parseChildren(context: ParserContext) {
  const nodes = []
  while(!isEnd(context)) {
    let node
    const { source: c } = context
    // 状态机(有限状态机)
    if (c.startsWith('{{')) { // 表达式，{{ name }}
      node = parseInterpolation(context)
    } else if (c.startsWith('<')) { // 元素，<div></div>
      node = parseElement(context)
    } else { // 文本，text
      node = parseText(context)
    }
    nodes.push(node)
  }

  const isWhitespace = (source: string) => {
    return !/[^\t\r\n\f ]/.test(source.trim())
  }

  // 移除空节点等
  const result = nodes.filter((node: any) => {
    if (node.type === NodeTypes.TEXT) {
      return !isWhitespace(node.content.trim())
    }
    return true
  })
  return result
}

export function baseParse(input: string, options?: any) {
  const context = createParserContext(input)
  const children = parseChildren(context)
  const root = createRoot(children)
  return  root
}
```

### compiler-core/src/transform.ts（全量）

```typescript
import { EMPTY_OBJ, isArray, isString, NOOP, PatchFlagNames, PatchFlags } from "@g-vue-next/shared"
import { convertToBlock, createVNodeCall, NodeTypes, ParentNode, RootNode, TemplateChildNode } from "./ast"
import { ErrorHandler, CompilerOptions, TransformOptions } from "./options"
import { CREATE_COMMENT, FRAGMENT, TO_DISPLAY_STRING } from "./runtimeHelpers"

export interface TransformContext extends ErrorHandler, CompilerOptions {
  selfName: string | null
  root: RootNode
  helpers: Map<symbol, number>
  components: Set<string>
  directives: Set<string>
  hoists: (any[] | null)[]
  imports: any[]
  temps: number
  cached: number
  identifiers: { [name: string]: number | undefined }
  scopes: {
    vFor: number
    vSlot: number
    vPre: number
    vOnce: number
  }
  parent: ParentNode | null
  grandparent: ParentNode | null
  childIndex: number
  inVOnce: boolean
  helper<T extends symbol>(name: T): T
  removeHelper<T extends symbol>(name: T): void
  helperString(name: symbol): string
  replaceNode(node: TemplateChildNode): void
  removeNode(node?: TemplateChildNode): void
  onNodeRemoved(): void
  addIdentifiers(exp: any): void
  removeIdentifiers(exp: any): void
  hoist(exp: any, code: any): any
  cache(exp: any, isVNode: boolean): any
  constantCache: WeakMap<any, any>
}

export function createTransformContext(root: any, options: TransformOptions): TransformContext {
  const nameMatch = options.filename?.replace(/\?.*$/, '')?.match(/([^/\\]+)\.\w+$/)
  const context: TransformContext = {
    // options
    filename: options.filename ?? '',
    selfName: nameMatch,
    prefixIdentifiers: options.prefixIdentifiers ?? false,
    hoistStatic: options.hoistStatic ?? false,
    hmr: options.hmr ?? false,
    cacheHandlers: options.cacheHandlers ?? false,
    nodeTransforms: options.nodeTransforms ?? [],
    directiveTransforms: options.directiveTransforms ?? {},
    transformHoist: options.transformHoist ?? null,
    isBuiltInComponent: options.isBuiltInComponent ?? NOOP,
    isCustomElement: options.isCustomElement ?? NOOP,
    expressionPlugins: options.expressionPlugins ?? [],
    scopeId: options.scopeId ?? null,
    slotted: options.slotted ?? true,
    ssr: options.ssr ?? false,
    inSSR: options.ssr ?? false,
    ssrCssVars: options.ssrCssVars ?? '',
    bindingMetadata: options.bindingMetadata ?? EMPTY_OBJ,
    inline: options.inline ?? false,
    isTS: options.isTS ?? false,
    onError: options.onError ?? NOOP,
    onWarn: options.onWarn ?? NOOP,
    compatConfig: options.compatConfig,
    // state
    root,
    helpers: new Map(),
    components: new Set(),
    directives: new Set(),
    hoists: [],
    imports: [],
    constantCache: new WeakMap(),
    temps: 0,
    cached: 0,
    identifiers: Object.create(null),
    scopes: {
      vFor: 0,
      vSlot: 0,
      vPre: 0,
      vOnce: 0
    },
    parent: null,
    grandparent: null,
    currentNode: root,
    childIndex: 0,
    inVOnce: false,
    // methods
    helper(name) {
      const count = context.helpers.get(name) || 0
      context.helpers.set(name, count + 1)
      return name
    },
    removeHelper(name) {
      const count = context.helpers.get(name)
      if (count) {
        const currentCount = count - 1
        if (!currentCount) {
          context.helpers.delete(name)
        } else {
          context.helpers.set(name, currentCount)
        }
      }
    },
    helperString(name) {
      return `${name as any}`
    },
    replaceNode(node) {},
    removeNode(node) {},
    onNodeRemoved: NOOP,
    addIdentifiers(exp) {},
    removeIdentifiers(exp) {},
    hoist(exp, code) {
      return NOOP
    },
    cache(exp, isVNode) {
      return exp
    }
  }
  return context
}

export function transform(root: any, options: any) {
  // 创建上下文
  const context = createTransformContext(root, options)
  // 深度优先遍历树形结构
  traverseNode(root, context)

  // 对根节点的处理
  createRootCodegen(root, context)
  root.helpers = new Set([...context.helpers.keys()])
  root.transformed = true
}

function getSingleElementRoot(
  root: RootNode
) {
  const children = root.children.filter(x => x.type !== NodeTypes.COMMENT)
  return children.length === 1 && children[0].type === NodeTypes.ELEMENT ? children[0] : null
}

function createRootCodegen(root: RootNode, context: any) {
  const { helper } = context
  const { children } = root
  if (children.length === 1) {
    const singleElementRootChild = getSingleElementRoot(root)
    if (singleElementRootChild && singleElementRootChild.codegenNode) { // 元素节点
      const codegenNode = singleElementRootChild.codegenNode
      if (codegenNode.type === NodeTypes.VNODE_CALL) {
        convertToBlock(codegenNode, context)
      }
      root.codegenNode = codegenNode
    } else { // 文本节点
      root.codegenNode = children[0]
    }
  } else if (children.length > 1) {
    let patchFlag = PatchFlags.STABLE_FRAGMENT
    let patchFlagText = PatchFlagNames[PatchFlags.STABLE_FRAGMENT]
    root.codegenNode = createVNodeCall(
      context,
      helper(FRAGMENT),
      undefined,
      root.children,
      patchFlag,
      undefined,
      undefined,
      true,
      undefined,
      false
    )
  } else {
    // no children = noop.codegen will return null
  }
}

export function traverseChildren(
  parent: ParentNode,
  context: TransformContext
) {
  let i = 0;
  const nodeRemoved = () => {
    i--
  }
  for(; i < parent.children.length; i++) {
    const child = parent.children[i]
    if (isString(child)) continue
    context.grandparent = context.parent
    context.parent = parent
    context.childIndex = i
    context.onNodeRemoved = nodeRemoved
    traverseNode(child, context)
  }
}

export function traverseNode(
  node: RootNode | TemplateChildNode,
  context: TransformContext
) {
  context.currentNode = node
  const { nodeTransforms } = context
  const exitFns = []

  for(let i = 0; i < nodeTransforms.length; i++) {
    const onExit = nodeTransforms[i](node, context)
    if (onExit) {
      if (isArray(onExit)) {
        exitFns.push(...onExit)
      } else {
        exitFns.push(onExit)
      }
    }
    if (!context.currentNode) {
      // node was removed
      return
    } else {
      // node may have been replaced
      node = context.currentNode
    }
  }

  switch (node.type) {
    case NodeTypes.COMMENT:
      context.helper(CREATE_COMMENT)
      break
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING)
      break
    case NodeTypes.IF:
      for(let i = 0; i < node?.branches?.length;i++) {
        traverseNode(node.branches[i], context)
      }
      break
    case NodeTypes.IF_BRANCH:
    case NodeTypes.FOR:
    case NodeTypes.ELEMENT:
    case NodeTypes.ROOT:
      traverseChildren(node, context)
      break
  }

  // 还原上一次的currentNode，因为执行 traverseNode 时，会改变 currentNode 为子节点
  context.currentNode = node

  // 倒序执行
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}
```

### compiler-core/src/transforms/transformElement.ts、transformText.ts、transformExpression.ts（全量）

```typescript
// transforms/transformElement.ts
import { createObjectExpression, createObjectProperty, createVNodeCall, ElementTypes, NodeTypes } from "../ast";
import { NodeTransform } from "../options";

export const transformElement: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.ELEMENT) {

  }
  return function postTransformElement() {
    node = context.currentNode
    if (
      !(
        node.type === NodeTypes.ELEMENT
        // && (node.tagType === ElementTypes.ELEMENT || node.tagType === ElementTypes.COMPONENT)
      )
    ) {
      return
    }
    const { tag, props, children } = node
    let vnodeTag = `"${tag}"`
    let vnodeProps: any
    let vnodeChildren: any
    let patchFlag: any | 0 = 0

    // props
    if (props?.length > 0) {
      vnodeProps = []
      for(let i = 0; i < props.length; i++) {
        const { name, value } = props[i]
        vnodeProps.push(createObjectProperty(name, value))
      }
      const propsBuildResult = vnodeProps.length > 0 ? createObjectExpression(vnodeProps) : null
      vnodeProps = propsBuildResult
    }
    // children
    if (node.children.length > 0) {
      if (children.length === 1) {
        const child = children[0]
        const type = child.type
        if (type === NodeTypes.TEXT) {
          vnodeChildren = child
        } else {
          vnodeChildren = children
        }

      } else if (children.length > 1) {
        vnodeChildren = children
      }
    }

    node.codegenNode = createVNodeCall(
      context,
      vnodeTag,
      vnodeProps,
      vnodeChildren,
      patchFlag === 0 ? undefined : patchFlag,
      undefined,
      undefined,
      false,
      false,
      false,
      node.loc
    )
  }
}
```

```typescript
// transforms/transformText.ts
import { PatchFlags } from "@g-vue-next/shared";
import { createCallExpression, createCompoundExpression, NodeTypes } from "../ast";
import { NodeTransform } from "../options";
import { isText } from "../utils";
import { CREATE_TEXT } from "../runtimeHelpers";

export const transformText: NodeTransform = (node, context) => {
  if (
    node.type === NodeTypes.ROOT ||
    node.type === NodeTypes.ELEMENT ||
    node.type === NodeTypes.FOR ||
    node.type === NodeTypes.IF_BRANCH

  ) {
    // ⚠️：注意处理顺序，这里要等待子节点处理完毕，再赋值给父节点
    return () => {
      const children = node.children
      let currentContainer: any = undefined
      let hasText = false

      for(let i = 0; i < children.length; i++) {
        const child = children[i]
        if (isText(child)) {
          hasText = true
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j];
            if (isText(next)) {
              if (!currentContainer) {
                currentContainer = children[i] = createCompoundExpression([child], child.loc)
              }
              currentContainer.children.push(' + ', next) // 添加
              children.splice(j, 1) // 删除
              j--
            } else {
              currentContainer = undefined
              break
            }
          }
        }
      }

      // 判断有没有剩余的文本, 没有就不需要 createTextVNode
      if (!hasText || children.length === 1) {
        return
      }

      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (isText(child) || child.type === NodeTypes.COMPOUND_EXPRESSION) {
          const callArgs = []
          if (child.type !== NodeTypes.TEXT || child.content !== ' ') {
            callArgs.push([child, PatchFlags.TEXT])
          }
          children[i] = {
            type: NodeTypes.TEXT_CALL,
            content: child,
            loc: child.loc,
            codegenNode: createCallExpression(
              context.helper(CREATE_TEXT),
              callArgs
            )
          }
        }
      }
    }
  }
}
```

```typescript
// transforms/transformExpression.ts
import { NodeTypes, RootNode, TemplateChildNode } from "../ast";
import { NodeTransform } from "../options";
import { TransformContext } from "../transform";

export const transformExpression: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.INTERPOLATION) { // 插值
    node.content = processExpression(node.content, context);
  } else if (node.type === NodeTypes.ELEMENT) { // 元素
    // console.log('元素', node)
  }
}

function processExpression(node: RootNode | TemplateChildNode, context: TransformContext) {
  node.content = `_ctx.${node.content}`
  return node
}
```

### compiler-core/src/codegen.ts（全量）

```typescript
import { isArray, isNil, isString, isSymbol } from "@g-vue-next/shared"
import { getVNodeBlockHelper, getVNodeHelper, NodeTypes, RootNode, TemplateChildNode, VNodeCall } from "./ast"
import { CodegenOptions } from "./options"
import { helperNameMap, OPEN_BLOCK, TO_DISPLAY_STRING } from "./runtimeHelpers"
import { isText } from "./utils"

export interface CodegenResult {
  code: string
  ast: any
  preamble: string
  map?: any
}

export type CodegenNode = TemplateChildNode | any

export interface CodegenContext extends Omit<Required<CodegenOptions>, 'bindingMetadata' | 'inline'> {
  source: string
  code: string
  line: number
  column: number
  offset: number
  indentLevel: number
  pure: boolean
  map?: any
  helper(key: symbol): string
  push(code: string, newLineIndex?: number, node?: CodegenNode): void
  indent(): void
  deindent(withoutNewLine?: boolean): void
  newline(): void
}

enum NewLineType {
  Start = 0,
  End = -1,
  None = -2,
  Unknown = -3
}

function createCodegenContext(
  ast: RootNode,
  {
    mode = 'function',
    prefixIdentifiers = mode === 'module',
    sourceMap = false,
    filename = 'template.vue.html',
    scopeId = null,
    optimizeImports = false,
    runtimeGlobalName = 'Vue',
    runtimeModuleName = `vue`,
    ssrRuntimeModuleName = `vue/server-renderer`,
    ssr = false,
    isTS = false,
    inSSR = false
  }: CodegenOptions
): CodegenContext {
  const context: CodegenContext = {
    mode,
    prefixIdentifiers,
    sourceMap,
    filename,
    scopeId,
    optimizeImports,
    runtimeGlobalName,
    runtimeModuleName,
    ssrRuntimeModuleName,
    ssr,
    isTS,
    inSSR,
    source: ast.source,
    code: ``,
    column: 1,
    line: 1,
    offset: 0,
    indentLevel: 0,
    pure: false,
    map: undefined,
    helper(key) {
      return `_${helperNameMap[key]}`
    },
    push(code, newLineIndex = NewLineType.None, node) {
      context.code += code
    },
    indent() {
      newline(++context.indentLevel)
    },
    deindent(withoutNewLine = false) {
      if (withoutNewLine) {
        --context.indentLevel
      } else {
        newline(--context.indentLevel)
      }
    },
    newline() {
      newline(context.indentLevel)
    }
  }

  function newline(n: number) {
    context.push('\n' + `  `.repeat(n), NewLineType.Start)
  }

  return context
}

function genFunctionPreamble(ast: RootNode, context: CodegenContext) {
  const { push, newline, deindent, indent, runtimeGlobalName, helper } = context
  const VueBinding = runtimeGlobalName
  const helpers = Array.from(ast.helpers)

  if (helpers.length > 0) {
    push(`const { ${helpers.map(s => `${helperNameMap[s]}: ${helper(s)}`).join(', ')} } = ${VueBinding}\n`)
  }

  newline()
  push(`return `)
}

function genNullableArgs(
  args: any[]
) {
  let i = args.length
  while(i--) {
    if (!isNil(args[i])) break
  }
  return args.slice(0, i + 1).map(arg => arg || `null`)
}

function genNodeListAsArray(
  nodes: (string | CodegenNode | TemplateChildNode)[],
  context: CodegenContext
) {
  const multilines = nodes.length > 3 || nodes.some(n => isArray(n) || !isText(n))
  context.push(`[`)
  multilines && context.indent()
  genNodeList(nodes, context, multilines)
  multilines && context.deindent()
  context.push(']')
}

function genNodeList(
  nodes: (string | symbol | CodegenNode | TemplateChildNode)[],
  context: CodegenContext,
  multilines: boolean = false,
  comma: boolean = true
) {
  const { push, newline } = context

  for(let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (isString(node)) {
      push(node, NewLineType.Unknown)
    } else if (isArray(node)) {
      genNodeListAsArray(node, context)
    } else {
      genNode(node, context)
    }
    if (i < nodes.length - 1) {
      if (multilines) {
        comma && push(',')
        newline()
      } else {
        comma && push(', ')
      }
    }
  }
}

function genVNodeCall(node: VNodeCall, context: CodegenContext) {
  const { push, helper} = context
  const { tag, props, children, patchFlag, isBlock, isComponent, dynamicProps} = node
  let patchFlagString
  if (patchFlag) {
    patchFlagString = String(patchFlag)
  }

  if (isBlock) {
    push(`(${helper(OPEN_BLOCK)}(${``}), `)
  }

  const callHelper = isBlock
    ? getVNodeBlockHelper(context.inSSR, isComponent)
    : getVNodeHelper(context.inSSR, isComponent)

  push(helper(callHelper) + `(`, NewLineType.None, node)

  genNodeList(
    genNullableArgs([tag, props, children, patchFlagString, dynamicProps]),
    context
  )
  push(`)`)
  if (isBlock) {
    push(`)`)
  }
}

function genText(
  node,
  context: CodegenContext
) {
  context.push(JSON.stringify(node.content), NewLineType.Unknown, node)
}

function genCallExpression(
  node: RootNode | any,
  context: CodegenContext
) {
  const { push, helper } = context
  const callee = isString(node.callee) ? node.callee : helper(node.callee)
  push(callee + `(`, NewLineType.None, node)
  genNodeList(node.arguments, context)
  push(')')
}

function genObjectExpression(
  node: RootNode | any,
  context: CodegenContext
) {
  const { push, indent, deindent, newline } = context
  const { properties } = node
  if (!properties.length) {
    push(`{}`, NewLineType.None, node)
    return
  }
  const multilines = properties.length > 1
  push(multilines ? `{` : `{ `)
  multilines && indent()
  for (let i = 0; i < properties.length; i++) {
    const {key, value} = properties[i]
    genExpressionAsPropertyKey(key, context)
    push(`: `)
    genNode(value, context)
    if (i < properties.length - 1) {
      push(',')
      newline()
    }
  }
  multilines && deindent()
  push(multilines ? `}` : ` }`)
}

function genExpressionAsPropertyKey(
  node: RootNode | any,
  context: CodegenContext
) {
  const { push } = context
  if (node.type === NodeTypes.COMPOUND_EXPRESSION) {
    push('[')
    genCompoundExpression(node, context)
    push(']')
  } else if (node.isStatic) {
    const text = JSON.stringify(node.content)
    push(text, NewLineType.None, node)
  } else {
    push(`${node.content || node}`, NewLineType.Unknown, node)
  }
}

function genCompoundExpression(
  node: RootNode | any,
  context: CodegenContext
) {
  for (let i = 0; i < node.children?.length; i++) {
    const child = node.children[i]
    if (isString(child)) {
      context.push(child, NewLineType.Unknown)
    } else {
      genNode(child, context)
    }
  }
}

function genInterpolation(
  node: RootNode | any,
  context: CodegenContext
) {
  const { push, helper } = context
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, context)
  push(`)`)
}

function genExpression(
  node: RootNode,
  context: CodegenContext
) {
  const { content, isStatic } = node as any
  context.push(
    isStatic ? JSON.stringify(content) : content,
    NewLineType.Unknown,
    node
  )
}

function genNode(node: CodegenNode | symbol | string, context: CodegenContext) {
  if (isString(node)) {
    context.push(node, NewLineType.Unknown)
    return
  }
  if (isSymbol(node)) {
    context.push(context.helper(node))
    return
  }
  switch(node.type) {
    case NodeTypes.ELEMENT:
    case NodeTypes.IF:
    case NodeTypes.FOR:
      genNode(node.codegenNode, context)
      break
    case NodeTypes.TEXT:
      genText(node, context)
      break
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context)
      break
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context)
      break
    case NodeTypes.VNODE_CALL:
      genVNodeCall(node, context)
      break
    case NodeTypes.JS_CALL_EXPRESSION:
      genCallExpression(node, context)
      break
    case NodeTypes.JS_OBJECT_EXPRESSION:
      genObjectExpression(node, context)
      break
    default:
      console.log(node?.type, node?.codegenNode)
      break
  }
}

export function generate(
  ast: RootNode,
  options: any = {},
): any {
  const context = createCodegenContext(ast, options)
  const { ssr, push, indent, deindent } = context

  const isSetupInlined = !!options.inline
  const preambleContext = isSetupInlined ? createCodegenContext(ast, options) : context
  // 生成函数前言
  genFunctionPreamble(ast, context)

  const functionName = ssr ? 'ssrRender' : 'render'
  const args = ssr ? ['_ctx', '_push', '_parent', '_attrs'] : ['_ctx', '_cache']
  const signature = args.join(', ')
  push(`function ${functionName}(${signature}) {`)
  indent()

  if (!ssr) {
    push(`return `)
  }

  if (ast.codegenNode) {
    genNode(ast.codegenNode, context)
  } else {
    push(`null`)
  }

  deindent()
  push(`}`)

  return {
    ast,
    code: context.code,
    preamble: isSetupInlined? preambleContext.code : ``,
    map: context.map ? context.map.toJSON() : undefined,
  }
}
```

### compiler-core/src/compile.ts、options.ts、runtimeHelpers.ts、utils.ts（全量）

```typescript
// compile.ts
import { extend, NOOP } from "@g-vue-next/shared";
import { CompilerOptions, NodeTransform } from "./options";
import { baseParse } from "./parser";
import { transform } from "./transform";
import { transformElement } from "./transforms/transformElement";
import { transformText } from "./transforms/transformText";
import { transformExpression } from "./transforms/transformExpression";
import { generate } from "./codegen";

export type TransformPreset = [
  NodeTransform[],
  Record<string, any>
]

export function getBaseTransformPreset(
  prefixIdentifiers?: boolean
): TransformPreset {
  return [
    [
      transformElement,
      transformText,
      transformExpression
    ],
    {
      on: NOOP,
      bind: NOOP,
      modal: NOOP
    }
  ]
}

export function baseCompile(
  source: string | any,
  options: CompilerOptions = {},
) {
  const resolvedOptions = extend({}, options, {
    prefixIdentifiers: true
  })
  const [nodeTransforms, directiveTransforms] = getBaseTransformPreset()
  const ast = baseParse(source)

  transform(ast, extend({}, resolvedOptions, {
    nodeTransforms: [
      ...nodeTransforms,
      ...(options.nodeTransforms || [])
    ],
    directiveTransforms: extend({}, directiveTransforms, options.directiveTransforms || {})
  }))

  return generate(ast, resolvedOptions)
}
```

```typescript
// options.ts
import { ParentNode, RootNode, TemplateChildNode } from "./ast"
import { TransformContext } from "./transform"

export interface ErrorHandler {
  onWarn?: (warning: any) => void
  onError?: (err: any) => void
}

export type CompilerOptions = any

export interface ParseOptions extends ErrorHandler {
  parseMode?: 'base' | 'html' | 'sfc'
  ns?: any
  isNativeTag?: (tag: string) => boolean
  isVoidTag?: (tag: string) => boolean
  isPreTag?: (tag: string) => boolean
  isCustomElement?: (tag: string) => boolean
  isBuiltInComponentTag?: (tag: string) => boolean
  getNamespace?: (
    tag: string,
    parent: Element | undefined,
    rootNamespace: any
  ) => any
  delimiters?: [string, string]
  whitespace?: 'preserve' | 'condense'
  comments?: boolean
}

export type NodeTransform = (
  node: RootNode | TemplateChildNode,
  context: TransformContext
) => void | (() => void) | (() => void)[]

export interface TransformOptions extends ErrorHandler, CompilerOptions {
  nodeTransforms?: (NodeTransform | NodeTransform[])[]
  directiveTransforms?: Record<string, any>
  transformHoist?: NodeTransform | NodeTransform[]
  isBuiltInComponent?: (tag: string) => symbol | void
  isCustomElement?: (tag: string) => boolean | void
  prefixIdentifiers?: boolean
  hoistStatic?: boolean
  cacheHandlers?: boolean
  expressionPlugins?: any[]
  scopeId?: string | null
  slotted?: boolean
  ssrCssVars?: string
  hrm?: boolean
}

interface SharedTransformCodegenOptions {
  prefixIdentifiers?: boolean
  ssr?: boolean
  inSSR?: boolean
  bindingMetadata?: any
  inline?: boolean
  isTS?: boolean
  filename?: string
}

export interface CodegenOptions extends SharedTransformCodegenOptions {
  mode?: 'module' | 'function'
  sourceMap?: boolean
  scopeId?: string | null
  optimizeImports?: boolean
  runtimeModuleName?: string
  ssrRuntimeModuleName?: string
  runtimeGlobalName?: string
}
```

```typescript
// runtimeHelpers.ts
// 注释节点
export const CREATE_COMMENT = Symbol('createCommentVNode')
// 转换文本节点
export const TO_DISPLAY_STRING = Symbol('toDisplayString')
// 创建文本节点
export const CREATE_TEXT = Symbol('createTextVNode')
export const CREATE_ELEMENT_VNODE = Symbol('createElementVNode')
export const CREATE_VNODE = Symbol('createVNode')
export const RESOLVE_COMPONENT = Symbol('resolveComponent')
export const OPEN_BLOCK = Symbol('openBlock')
export const CREATE_BLOCK = Symbol('createBlock')
export const CREATE_ELEMENT_BLOCK = Symbol('createElementBlock')
export const WITH_DIRECTIVES = Symbol('withDirectives')
export const FRAGMENT = Symbol('Fragment')

export const helperNameMap = {
  [TO_DISPLAY_STRING]: 'toDisplayString',
  [CREATE_COMMENT]: 'createCommentVNode',
  [CREATE_TEXT]: 'createTextVNode',
  [CREATE_ELEMENT_VNODE]: 'createElementVNode',
  [CREATE_VNODE]: 'createVNode',
  [RESOLVE_COMPONENT]: 'resolveComponent',
  [OPEN_BLOCK]: 'openBlock',
  [CREATE_BLOCK]: 'createBlock',
  [CREATE_ELEMENT_BLOCK]: 'createElementBlock',
  [WITH_DIRECTIVES]: 'withDirectives',
  [FRAGMENT]: 'Fragment',
}
```

```typescript
// utils.ts
import { NodeTypes, TemplateChildNode } from "./ast";

export function isText(node: TemplateChildNode): boolean {
  return node.type === NodeTypes.INTERPOLATION || node.type === NodeTypes.TEXT
}
```

### compiler-core/src/index.ts、compiler-dom/src/index.ts、compiler-dom/src/parserOptions.ts（全量）

```typescript
// compiler-core/src/index.ts
export { baseParse } from './parser'
export { transform } from './transform'
export { generate } from './codegen'
export { baseCompile } from './compile'
export * from './options'
```

```typescript
// compiler-dom/src/index.ts
import { baseCompile, baseParse, transform,generate, ParseOptions, CompilerOptions } from '@g-vue-next/compiler-core'
import { extend } from '@g-vue-next/shared'
import { parserOptions } from './parserOptions'
import { CodegenResult } from 'packages/compiler-core/src/codegen'

// TODO 编译三部曲
// 1.解析模板，生成ast
// 2.转换ast节点，主要针对指令进行处理
// 3.生成代码（ast 转换成 js）

export function compile(
  src: string,
  options: CompilerOptions = {}
): CodegenResult {
  return baseCompile(src, extend({}, parserOptions, options)) as any
}

export function parse(template: string, options: ParseOptions = {}) {
  return baseParse(template, extend({}, parserOptions, options))
}

export * from '@g-vue-next/compiler-core'
```

```typescript
// compiler-dom/src/parserOptions.ts
import { ParseOptions } from "@g-vue-next/compiler-core";
import { isHTMLTag, isMathMLTag, isSVGTag, isVoidTag } from "@g-vue-next/shared";

export const parserOptions: ParseOptions = {
  parseMode: 'html',
  isVoidTag,
  isNativeTag: tag => isHTMLTag(tag) || isSVGTag(tag) || isMathMLTag(tag),
  isPreTag: tag => tag === 'pre',
  isBuiltInComponentTag: tag => tag === 'Transition' || tag === 'TransitionGroup',
}
```

### shared/src/makeMap.ts、domTagConfig.ts（全量，parser 阶段依赖的标签判断工具）

```typescript
// shared/src/makeMap.ts
export function makeMap(
  str: string,
  expectsLowerCase?: boolean
): (key: string) => boolean {
  const set = new Set(str.split(','))
  return expectsLowerCase
    ? val => set.has(val.toLowerCase())
    : val => set.has(val)
}
```

```typescript
// shared/src/domTagConfig.ts
import { makeMap } from './makeMap'

const HTML_TAGS =
  'html,body,base,head,link,meta,style,title,address,article,aside,footer,' +
  'header,hgroup,h1,h2,h3,h4,h5,h6,nav,section,div,dd,dl,dt,figcaption,' +
  'figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,' +
  'data,dfn,em,i,kbd,mark,q,rp,rt,ruby,s,samp,small,span,strong,sub,sup,' +
  'time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,' +
  'canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,' +
  'th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,' +
  'option,output,progress,select,textarea,details,dialog,menu,' +
  'summary,template,blockquote,iframe,tfoot'

const SVG_TAGS =
  'svg,animate,animateMotion,animateTransform,circle,clipPath,color-profile,' +
  'defs,desc,discard,ellipse,feBlend,feColorMatrix,feComponentTransfer,' +
  'feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,' +
  'feDistantLight,feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,' +
  'feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,' +
  'fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter,' +
  'foreignObject,g,hatch,hatchpath,image,line,linearGradient,marker,mask,' +
  'mesh,meshgradient,meshpatch,meshrow,metadata,mpath,path,pattern,' +
  'polygon,polyline,radialGradient,rect,set,solidcolor,stop,switch,symbol,' +
  'text,textPath,title,tspan,unknown,use,view'

const MATH_TAGS =
  'annotation,annotation-xml,maction,maligngroup,malignmark,math,menclose,' +
  'merror,mfenced,mfrac,mfraction,mglyph,mi,mlabeledtr,mlongdiv,' +
  'mmultiscripts,mn,mo,mover,mpadded,mphantom,mprescripts,mroot,mrow,ms,' +
  'mscarries,mscarry,msgroup,msline,mspace,msqrt,msrow,mstack,mstyle,msub,' +
  'msubsup,msup,mtable,mtd,mtext,mtr,munder,munderover,none,semantics'

const VOID_TAGS =
  'area,base,br,col,embed,hr,img,input,link,meta,param,source,track,wbr'

export const isHTMLTag = /*#__PURE__*/ makeMap(HTML_TAGS)
export const isSVGTag = /*#__PURE__*/ makeMap(SVG_TAGS)
export const isMathMLTag = /*#__PURE__*/ makeMap(MATH_TAGS)
export const isVoidTag = /*#__PURE__*/ makeMap(VOID_TAGS)
```

### 药品说明书模板编译产物可视化对比（有/无优化标记）

医疗场景示例：一段带插值和静态内容混排的药品说明书模板，对比手写编译器输出的编译产物：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>药品说明书编译产物对比</title>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { compile } from '../../packages/vue/dist/vue.esm.js'

    // 药品说明书模板：混合静态文案和动态插值
    const template = `
      <div class="drug-info">
        <h2>药品说明书</h2>
        <p>药品名称：{{ drugName }}</p>
        <p>规格：500mg/片</p>
        <p>用法用量：{{ dosage }}</p>
      </div>
    `

    const { code } = compile(template)
    console.log(code)
    // 对照观察：静态的"药品说明书"标题和"规格：500mg/片"这两处
    // 在真实 Vue 3.4 编译器里会被静态提升成模块级常量（_hoisted_1/_hoisted_2）
    // 只有 drugName/dosage 两处插值会生成动态的 toDisplayString 调用
    // 这份手写编译器没有实现静态提升，两处静态内容依然会在 render 函数体内重复创建
  </script>
</body>
</html>
```

配合笔记原文的三个示例文件，分别验证 parse、transform、generate 三个独立阶段：

```html
<!-- parse.html：只验证 AST 解析结果 -->
<script type="module">
  import { parse } from '../../packages/vue/dist/vue.esm.js'
  console.log(parse('<div a="1" b="true" id="app" c=" 11 " d = 3 ></div>'))
</script>
```

```html
<!-- transform.html：验证 transform 阶段生成的 VNodeCall / helpers -->
<script type="module">
  import { compile, parse, transform} from '../../node_modules/.pnpm/@vue+compiler-dom@3.5.18/node_modules/@vue/compiler-dom/dist/compiler-dom.esm-browser.js'
  console.log(compile('<div id="app" class="main"><p>123</p></div>'))
  console.log(compile('<div id="app" class="main">123</div><div id="app2" class="main2">abc</div>'))
</script>
```

```html
<!-- compile.html：验证完整编译产物字符串 -->
<script type="module">
  import { compile } from '../../packages/vue/dist/vue.esm.js'
  console.log(compile('<div id="app" class="main">123</div><div id="app2" class="main2">{{abc}}</div>'))
</script>
<!--
预期输出（笔记原文标注的对照结果）：
const { createElementVNode: _createElementVNode, Fragment: _Fragment, openBlock: _openBlock, createElementBlock: _createElementBlock } = Vue

return function render(_ctx, _cache) {

  return (_openBlock(), _createElementBlock(_Fragment, null, [
    _createElementVNode("div", {
      id: "app",
      class: "main"
    }, "123"),
    _createElementVNode("div", {
      id: "app2",
      class: "main2"
    }, "abc")
  ], 64 /* STABLE_FRAGMENT */))
}
-->
```

运行方式统一：项目根目录执行 `pnpm preview`（笔记通用测试命令），在浏览器里访问对应 HTML 路径验证 parse/transform/generate 各阶段的输出。

---

## 六、手写实现源码 GitHub 地址

https://github.com/lotosv2010/g-vue-next

## 七、参考

- https://cn.vuejs.org/guide/extras/rendering-mechanism.html
- https://cn.vuejs.org/api/sfc-script-setup.html
- https://cn.vuejs.org/guide/typescript/overview.html
- https://jonny-wei.github.io/blog/vue/vue3/compiler.html
- https://github.com/wbccb/

---


## 📝 留个问题

> 💬 **面试追问**：如果一个纯静态的节点，恰好被包在一个 `v-for` 循环体内部，它还会被静态提升吗？

提示：回到「二、原理」第 3 小节，静态提升判断的对象是"这个节点是否依赖任何动态数据"，再结合第 3 篇讲过的 Block 收集机制——`v-for` 循环体本身就是一个 Block 边界，想清楚"提升到哪里"和"提升了还有没有意义"这两个问题分别对应什么。

---

> 🔖 这是「Vue 3 全家桶深度拆解系列」第 7 篇。上一篇：《Vue 3 内置组件全解析：Teleport 传送门、KeepAlive LRU 缓存、Suspense 异步编排，实现原理逐个拆解（面试收藏级）》；下一篇预告：《Pinia 原理与手写实现：为什么 Vuex 退场，Pinia 才是 Vue 3 的正确答案（面试收藏级）》

**关注公众号「Coding沉思录」，第一时间获取 Vue 3 全家桶系列更新！**
