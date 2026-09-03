# React 18 架构全景：从 Stack 到 Fiber 的演进与源码调试环境搭建（面试收藏级）

> **副标题**：Stack Reconciler 的局限、Fiber 链表如何实现可中断渲染、并发模式设计思想

---

## 🎯 这篇文章解决什么问题

面试官抛出一个看似随口的问题：「你们项目升级到 React 18 了吗？升级图什么？」你答：「并发特性，性能更好。」面试官追问：「并发具体指什么？React 15 为什么没有并发？Fiber 到底改了什么？链表结构和"可中断"之间是什么关系？`react-reconciler` 为什么要单独拆出一个包？」

一道「升级图什么」的开场题，背后是 React 从 Stack Reconciler 到 Fiber 的整体架构重写逻辑。

如果你已经在用 React 18，很容易停留在「会用 `createRoot`、会用 `startTransition`」的表层认知。但面试官真正想考察的，是你有没有理解**每一个 API 变化背后，React 内部到底重构了什么**——为什么 `ReactDOM.render` 要换成 `createRoot`、Fiber 具体解决了递归遍历的什么问题、`react-reconciler` 为什么能被 `react-dom`/`react-native` 共用。

读完这篇文章，你会同时获得两种确定感：**懂原理**（知道 React 18 架构为什么这样设计）和**会讲**（面试官怎么问都能拆解回答），并且手上有一套能真正跑起来的 React 源码调试环境，供后续 13 篇持续使用。

---

## 一、使用与实践

### 1. JSX 编译与 React Element 结构（前置知识）

在深入 Fiber 架构之前，先理解 JSX 和 React Element 的本质——这是理解后续所有渲染机制的基础。

**JSX 只是语法糖**

我们写的 JSX 代码：

```jsx
<div className="prescription-form">
  <input value={drugName} />
  <button onClick={handleSubmit}>提交</button>
</div>
```

经过 Babel 编译后，实际上被转换成普通的函数调用：

```javascript
React.createElement(
  'div',
  { className: 'prescription-form' },
  React.createElement('input', { value: drugName }),
  React.createElement('button', { onClick: handleSubmit }, '提交')
)
```

`React.createElement` 做的事情非常简单——返回一个**普通的 JavaScript 对象**：

```javascript
{
  type: 'div',                    // 组件类型：标签名、函数组件、类组件
  props: {                        // 属性和子节点
    className: 'prescription-form',
    children: [/* ... */]
  },
  key: null,                      // diff 算法用到的唯一标识
  ref: null                       // 访问真实 DOM 或组件实例的引用
}
```

这个对象就是 **React Element**，它只是对"UI 应该长什么样"的**描述**，不是真正的 DOM 节点，也不是组件实例——只是一份数据。

**React Element vs Fiber 节点**

这个区别很关键，面试常考：

- **React Element**：`createElement` 返回的普通 JS 对象，轻量级，只描述结构
- **Fiber 节点**：渲染过程中创建的运行时实例，包含大量调度、副作用、状态管理的字段，是实际的"工作单元"

React Element 像是"设计图纸"，Fiber 节点像是"施工现场的工人"——前者只描述要干什么，后者负责真正干活。

> 💬 **面试官会问**：JSX 和 React Element 是什么关系？
>
> ✅ **标准答案**：JSX 是语法糖，经 Babel 编译后变成 `React.createElement(type, props, ...children)` 函数调用，这个函数返回一个普通 JS 对象，就是 React Element。React Element 只是对"UI 应该长什么样"的描述，不是真实 DOM 也不是 Fiber 节点——Fiber 节点是 React 在渲染过程中基于 React Element 创建的运行时实例，包含调度、副作用、状态管理等大量字段。

> 🎁 **加分答案**：React Element 是不可变的（immutable），每次调用 `createElement` 都返回一个新对象；Fiber 节点是可变的（mutable），React 通过复用 Fiber 节点对象、只更新必要的字段来减少内存分配和 GC 压力。这也是为什么 Fiber 架构引入了 `alternate` 双缓存机制——复用对象比每次都创建新对象高效得多。

**对比 Vue 3：模板编译的静态分析优势**

Vue 3 的模板：

```vue
<template>
  <div class="prescription-form">
    <input :value="drugName" />
    <button @click="handleSubmit">提交</button>
  </div>
</template>
```

经过编译器分析后，生成带有 **PatchFlag** 的渲染函数：

```javascript
createVNode('div', { class: 'prescription-form' }, [
  createVNode('input', { value: drugName }, null, 8 /* PROPS */),  // 👈 PatchFlag 标记"只有 props 会变"
  createVNode('button', { onClick: handleSubmit }, '提交')
])
```

编译器在构建阶段就能分析出"哪些节点是动态的、哪些属性会变化"，运行时只需要对比标记过的动态节点。这是 Vue 3 "编译时优化"路线的核心优势。

React 的 JSX 是**完全动态**的函数调用，编译器（Babel）只做语法转换，无法做任何静态分析——因为 JSX 里可以用任意 JavaScript 表达式、条件、循环构造 UI，编译期根本无法确定"哪些节点会变化"。React 只能把所有优化压力转移到运行时的 Fiber 调度算法上。

这不是"谁更先进"的问题，而是两种设计取舍：Vue 用"模板语法受限"换来"编译期静态分析"，React 用"JSX 完全自由"换来"运行时调度复杂度"。

---

### 2. 基本使用

#### ReactDOM.render → createRoot 入口切换

**React 17 及之前的写法**

```javascript
// Legacy 模式：同步、不可中断
import ReactDOM from 'react-dom'
import App from './App'

ReactDOM.render(<App />, document.getElementById('root'))
```

**React 18 的新写法**

```javascript
// Concurrent 模式：可中断、支持优先级调度
import { createRoot } from 'react-dom/client'
import App from './App'

const root = createRoot(document.getElementById('root'))
root.render(<App />)
```

表面上只是多了一步"创建 root"，背后是**渲染模式的整体切换**：

| 维度 | Legacy 模式 | Concurrent 模式 |
|------|------------|----------------|
| 入口 API | `ReactDOM.render` | `createRoot(...).render` |
| 更新优先级 | 固定 `SyncLane`，全部同步 | 根据触发场景分配不同 Lane |
| 渲染路径 | `performSyncWorkOnRoot`，不可中断 | `performConcurrentWorkOnRoot`，可中断 |
| 时间切片 | 无 | 默认 5ms 一帧，`shouldYieldToHost()` 检查 |
| 高优先级插队 | 不支持 | 支持打断低优先级渲染 |

**为什么 React 18 不直接废弃 Legacy 模式？**

即使你升级到 React 18 版本，如果还在用 `ReactDOM.render`，内部照样按 Legacy 模式跑，不会自动获得并发特性——这是一个**渐进式迁移**策略，让老项目可以先升级版本、逐步替换 API，而不是一刀切强制所有代码同时改。

> 💬 **面试官会问**：`createRoot` 和 `ReactDOM.render` 有什么本质区别？
>
> ✅ **标准答案**：`ReactDOM.render` 走 Legacy 模式，内部更新固定是同步、不可中断的（`SyncLane` + `performSyncWorkOnRoot`）；`createRoot` 开启 Concurrent 模式，允许 React 在渲染过程中做时间切片、优先级调度，高优先级更新（比如用户输入）可以打断正在进行的低优先级渲染。这不是简单的 API 改名，而是渲染引擎工作方式的切换。

> 🎁 **加分答案**：React 18 里两种模式是**共存**的——同一个版本，如果你还在用 `ReactDOM.render`，内部照样按 Legacy 模式跑，不会自动获得并发特性；只有显式换成 `createRoot` 才能享受并发能力。这也是为什么 React 18 的升级指南把"换成 `createRoot`"作为第一步——不换，升级了版本号也等于没升级。

#### 自动批处理（automatic batching）

**React 17 的批处理局限**

React 17 的批处理（batching）只在 React 自己的事件处理函数里生效：

```javascript
// React 17：事件处理函数内，批处理生效
function handleClick() {
  setCount(c => c + 1)  // 不会立即重渲染
  setFlag(f => !f)      // 不会立即重渲染
  // 两次更新合并成一次渲染
}

// React 17：setTimeout/Promise/原生事件监听器里，批处理失效
function handleClickWithTimeout() {
  setTimeout(() => {
    setCount(c => c + 1)  // ❌ 立即触发一次渲染
    setFlag(f => !f)      // ❌ 又立即触发一次渲染
    // 总共触发了两次渲染
  }, 1000)
}
```

**React 18 的自动批处理**

`createRoot` 把批处理范围扩大到**所有场景**：

```javascript
// React 18：createRoot 模式下，无论在哪里调用，都只触发一次渲染
function handleClickWithTimeout() {
  setTimeout(() => {
    setCount(c => c + 1)  // 不会立即重渲染
    setFlag(f => !f)      // 不会立即重渲染
    // 直到这里，两次更新合并成一次渲染
  }, 1000)
}

// Promise、fetch 回调、原生事件监听器里也一样
fetch('/api/drugs').then(data => {
  setDrugList(data.list)      // 不会立即重渲染
  setLoading(false)           // 不会立即重渲染
  // 合并成一次渲染
})
```

**医疗场景示例**

处方单页面里，点击「保存」按钮后异步请求成功回调里同时更新"保存状态"和"药品列表"：

```javascript
function PrescriptionForm() {
  const [saveStatus, setSaveStatus] = useState('idle')
  const [drugList, setDrugList] = useState([])

  const handleSave = async () => {
    setSaveStatus('saving')
    
    const response = await fetch('/api/prescription', {
      method: 'POST',
      body: JSON.stringify(/* ... */)
    })
    
    const data = await response.json()
    
    // React 17 下这是 Promise 回调场景，会触发两次渲染
    // React 18 下自动合并成一次
    setSaveStatus('saved')        // 更新保存状态
    setDrugList(data.updatedList) // 更新药品列表
  }

  return (/* ... */)
}
```

React 17 下，页面会闪烁两次（先显示"已保存"、列表还是旧的，然后列表更新）；React 18 下，两次状态更新被合并，页面只闪烁一次。

**`flushSync`：强制跳出批处理**

如果确实需要立即拿到渲染后的最新 DOM（比如渲染后马上要读取某个元素的尺寸），可以用 `flushSync` 强制这次更新同步渲染：

```javascript
import { flushSync } from 'react-dom'

function handleClick() {
  flushSync(() => {
    setState(newValue)  // 这次更新会立即同步渲染，不参与批处理
  })
  
  // 这里能拿到渲染后的最新 DOM
  const height = ref.current.offsetHeight
}
```

> 💬 **面试官会问**：React 18 的自动批处理和 React 17 有什么区别？
>
> ✅ **标准答案**：React 17 的批处理只在 React 事件处理函数内生效，`setTimeout`/`Promise`/原生事件监听器里的多次 `setState` 会各自触发一次渲染；React 18 的自动批处理（automatic batching）把合并范围扩展到所有场景，只要是同一个"任务"内的多次更新，都会被合并成一次渲染。

> 🎁 **加分答案**：如果确实需要跳出批处理立即拿到渲染后的最新 DOM（比如渲染后马上要读取某个元素的尺寸），可以用 `flushSync(() => setState(...))` 强制这次更新同步渲染，不参与批处理。这个 API 留到第 02 篇状态更新篇会结合 Update 队列源码展开讲。

#### `<StrictMode>` 故意执行两次的原因

React 18 的 `<StrictMode>` 在开发环境下会故意把函数组件、`useState`/`useReducer` 的 initializer、部分生命周期方法**执行两次**：

```jsx
function PrescriptionForm() {
  // 开发环境下 StrictMode 会让这个函数体执行两次
  console.log('render')

  const [items, setItems] = useState(() => {
    // initializer 也会执行两次
    console.log('initializer')
    return loadDraftFromLocalStorage()
  })

  return <form>{/* ... */}</form>
}

// 根组件包一层 StrictMode
<StrictMode>
  <PrescriptionForm />
</StrictMode>
```

打开控制台会看到：

```
render
initializer
render
initializer
```

**为什么要故意执行两次？**

如果 `loadDraftFromLocalStorage()` 里有副作用（比如每次调用都往草稿列表 `push` 一条记录），两次执行会让 bug 现形——这正是 `<StrictMode>` 的目的：**渲染函数必须是纯函数**，给定同样的 props/state，执行几次都不应该产生外部可观察的副作用差异。

**和并发模式的关系**

这是为 Concurrent 模式做准备：并发渲染中，React 可能会开始渲染一个组件、中途放弃、之后重新渲染（比如被更高优先级的更新打断）。如果渲染函数不纯，这种"重来一次"的行为就会导致数据错乱。`<StrictMode>` 提前帮你把这类隐患挖出来。

> 💬 **面试官会问**：`<StrictMode>` 为什么要故意执行两次？和并发模式有什么关系？
>
> ✅ **标准答案**：`<StrictMode>` 通过在开发环境下故意重复执行渲染相关的函数，提前暴露"渲染不纯"的问题（比如在渲染阶段做了 DOM 操作、修改了外部变量）。这和并发模式直接相关——Concurrent 模式下 React 可能会中途暂停、抛弃、重新开始一次渲染，如果渲染函数不是纯函数，重新渲染就可能产生和上一次不一致的副作用，`<StrictMode>` 提前帮你把这类隐患挖出来。

> 🎁 **加分答案**：`<StrictMode>` 只在开发环境生效，生产构建下不会有这个"执行两次"的行为，所以线上性能不受影响；它只是一个开发期的检测工具，不改变生产环境的实际渲染次数。

#### startTransition 标记低优先级更新

```jsx
import { startTransition } from 'react'

function DrugSearchPage() {
  const [keyword, setKeyword] = useState('')
  const [filteredList, setFilteredList] = useState(fullDrugList)

  function handleInputChange(e) {
    setKeyword(e.target.value) // 紧急更新：输入框必须立即响应
    
    startTransition(() => {
      // 非紧急更新：筛选列表允许被打断、延后完成
      setFilteredList(
        fullDrugList.filter(drug => 
          drug.name.includes(e.target.value)
        )
      )
    })
  }

  return (
    <>
      <input value={keyword} onChange={handleInputChange} />
      <DrugList drugs={filteredList} />
    </>
  )
}
```

**医疗场景：药品全局检索**

HIS 系统的药品库可能有上万条数据。用户在检索框里连续输入时，如果每次输入都同步触发"过滤上万条数据 + 重新渲染长列表"，输入框会卡顿。`startTransition` 把筛选列表这部分渲染标记为低优先级（`TransitionLane`），即使过滤计算量很大，输入框也不会卡顿——因为过滤这部分渲染可以被随时打断，等主线程有空再继续。

**和 `setTimeout` 的本质区别**

```javascript
// ❌ 用 setTimeout 只是"延迟执行"，一旦开始执行仍然不可中断
setTimeout(() => {
  setFilteredList(computeExpensiveFilter())  // 这个计算开始后会一直占用主线程直到完成
}, 100)

// ✅ startTransition 标记为低优先级，渲染过程本身可被打断
startTransition(() => {
  setFilteredList(computeExpensiveFilter())  // 渲染过程中可以被高优先级更新打断、暂停、稍后继续
})
```

`setTimeout` 只是把代码推到宏任务队列稍后执行，一旦开始执行仍然是不可中断的；`startTransition` 包裹的渲染即使已经开始，也能在渲染过程中被打断。

> 💬 **面试官会问**：`startTransition` 解决了什么问题？和 `setTimeout` 延迟执行有什么本质区别？
>
> ✅ **标准答案**：`startTransition` 把包裹的更新标记为低优先级（`TransitionLane`），这个更新对应的渲染过程可以被更高优先级的更新（比如用户输入）打断、暂停、稍后继续，而不是简单的"延迟执行"。`setTimeout` 只是把代码推到宏任务队列稍后执行，一旦开始执行仍然是不可中断的；`startTransition` 包裹的渲染即使已经开始，也能在渲染过程中被打断。

> 🎁 **加分答案**：`startTransition` 包裹的更新期间，可以配合 `useTransition` 返回的 `isPending` 展示"计算中"的过渡态 UI，这是 `setTimeout` 做不到的——`setTimeout` 无法感知任务是否还在排队中，`useTransition` 是 React 内部调度状态的直接暴露。

#### React.lazy + Suspense 代码分割

```jsx
import { lazy, Suspense } from 'react'

const PrescriptionForm = lazy(() => import('./PrescriptionForm'))
const LabReportModule = lazy(() => import('./LabReportModule'))

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/prescription" element={<PrescriptionForm />} />
        <Route path="/lab-report" element={<LabReportModule />} />
      </Routes>
    </Suspense>
  )
}
```

**`React.lazy` 的加载机制**

`React.lazy` 返回一个特殊的组件，首次渲染时触发动态 `import()`：

```javascript
// React.lazy 简化实现
function lazy(loader) {
  return {
    $$typeof: Symbol.for('react.lazy'),
    _payload: { loader },
    _init: (payload) => {
      if (!payload._result) {
        const promise = payload.loader()  // 触发 import()
        payload._result = promise
        throw promise  // 👈 关键：throw 一个 Promise
      }
      return payload._result
    }
  }
}
```

**`Suspense` 是怎么知道子组件"还没准备好"的？**

React 渲染时，如果遇到一个 `lazy` 组件且模块还没加载完，会调用它的 `_init` 方法，这个方法会 `throw` 一个 Promise（而不是 `throw` 一个 Error）。React 的渲染调度器捕获到这个"特殊的 throw"后，知道这不是渲染出错，而是"数据/资源还没准备好"，于是：

1. 暂停渲染这棵子树
2. 向上查找最近的 `<Suspense>` 边界
3. 转而渲染 `<Suspense>` 的 `fallback` 内容
4. 在 Promise resolve 后重新尝试渲染

**医疗场景：HIS 系统模块级代码分割**

```jsx
const ConsultationModule = lazy(() => import('./modules/Consultation'))
const PrescriptionModule = lazy(() => import('./modules/Prescription'))
const LabReportModule = lazy(() => import('./modules/LabReport'))

function HISSystem() {
  return (
    <Suspense fallback={<ModuleLoadingSpinner />}>
      <Routes>
        <Route path="/consultation" element={<ConsultationModule />} />
        <Route path="/prescription" element={<PrescriptionModule />} />
        <Route path="/lab-report" element={<LabReportModule />} />
      </Routes>
    </Suspense>
  )
}
```

问诊/处方/检验报告三大模块各自独立打包，首屏只加载当前路由对应的模块代码，能把 HIS 系统的首屏包体积从可能的 2MB+ 降到 500KB 以内。

> 💬 **面试官会问**：`Suspense` 是怎么知道子组件"还没准备好"的？
>
> ✅ **标准答案**：`React.lazy` 包装的组件在模块还没加载完成时，渲染过程中会 `throw` 一个 Promise（而不是 `throw` 一个 Error），React 的渲染调度器捕获到这个"特殊的 throw"后，知道这不是渲染出错，而是"数据/资源还没准备好"，于是暂停渲染这棵子树，转而渲染最近的 `<Suspense>` 的 `fallback`，并在 Promise resolve 后重新尝试渲染。

> 🎁 **加分答案**：这个"throw Promise"的机制不是 `React.lazy` 专属，任何组件都可以在渲染阶段 `throw` 一个 pending 的 Promise 来触发 `Suspense`，这也是 React 18 及未来 RSC（React Server Components）数据获取模式的基础机制——第 12 篇讲 SSR/RSC 时会展开这部分。

---

### 3. 本地调试 React 源码环境搭建

后续 13 篇都要读 React 18 源码，与其每次对着 GitHub 网页看静态代码，不如花一次时间搭一套能打断点、能单步调试的本地环境——这一节搭好之后，直接复用到系列结束。

#### 第一步：clone 源码并锁定版本

```bash
git clone https://github.com/facebook/react.git
cd react
git checkout v18.2.0   # 锁定到 React 18 稳定版，避免主干代码和本系列讲解的行号/实现细节不一致
pnpm install
```

**为什么要锁定 `v18.2.0`？**

React 主干分支（`main`）的实现细节会随时间推移持续演进，如果调试环境跟着主干走，代码行号和具体实现可能和本系列文章里贴的源码 snippet 出现偏差，反而增加学习时的困惑。锁定一个稳定版本，保证"你看到的源码"和"文章里讲的源码"是同一份。

#### 第二步：打出本地开发版包

React 源码仓库自带构建脚本，可以只构建本篇需要用到的几个包，并且打出带完整变量名、未压缩的 `NODE_DEV` 版本（方便断点调试时看清楚变量）：

```bash
yarn build react,react-dom,scheduler,react-reconciler --type=NODE_DEV
```

构建产物会输出到 `build/node_modules/` 目录下，每个包都是一份可以直接被业务项目引用的 npm 包结构。

**`--type=NODE_DEV` 参数的作用**

React 源码构建支持多种目标类型：

- `NODE_DEV`：Node.js 环境的开发版，保留完整变量名和注释，适合断点调试
- `NODE_PROD`：Node.js 环境的生产版，压缩混淆，体积小
- `UMD_DEV` / `UMD_PROD`：浏览器直接引入的 UMD 版本

我们调试源码选 `NODE_DEV`，变量名清晰，断点时能看到真实的函数名和变量值。

#### 第三步：把业务项目的 React 指向本地构建产物

有两种常见方式，任选一种：

**方式一：`pnpm link`（适合命令行操作）**

```bash
# 在 react 源码仓库的构建产物目录下
cd build/node_modules/react && pnpm link --global
cd ../react-dom && pnpm link --global

# 在你的业务项目目录下
pnpm link --global react react-dom
```

**方式二：Vite `resolve.alias`（适合项目里长期保留，随时切换）**

```typescript
// vite.config.ts
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      react: path.resolve(__dirname, '../react/build/node_modules/react'),
      'react-dom': path.resolve(__dirname, '../react/build/node_modules/react-dom'),
    },
  },
})
```

**两种方式的区别**

- `pnpm link` 是全局软链接，换了业务项目也生效，但容易忘记链接到了哪个版本
- `resolve.alias` 写死在项目配置里，团队协作时更明确，但只对当前项目生效

日常调试推荐用 `resolve.alias`，这样 `git diff` 能清楚看到"这个项目临时接了本地源码"，不会不小心提交到远程分支上忘记还原。

#### 第四步：打断点观察真实调用栈

在 VSCode 里对 `packages/react-reconciler/src/ReactFiberBeginWork.js` 里的 `beginWork` 函数，以及 `packages/react-reconciler/src/ReactFiberHooks.js` 里的 `dispatchSetState` 打上断点。

业务项目里随便触发一次 `setState`：

```jsx
function TestComponent() {
  const [count, setCount] = useState(0)
  
  return (
    <button onClick={() => setCount(c => c + 1)}>
      点击触发 setState
    </button>
  )
}
```

点击按钮后，观察调用栈：

```
dispatchSetState                        // 👈 Hook 的更新入口
  → dispatchSetStateInternal
    → scheduleUpdateOnFiber             // 👈 调度更新到 Fiber
      → ensureRootIsScheduled
        → performConcurrentWorkOnRoot    // 👈 并发模式渲染路径（或 performSyncWorkOnRoot）
          → renderRootConcurrent
            → workLoopConcurrent         // 👈 work loop 循环
              → performUnitOfWork
                → beginWork              // 👈 处理单个 Fiber 节点
```

这条调用栈本身就是本篇后续「二、三、四」节要讲的核心内容的"实物证据"——不是背下来的文字描述，而是断点单步走一遍亲眼看到的真实执行路径。

**调试技巧**

1. **条件断点**：在 `beginWork` 上右键 → "添加条件断点"，输入 `fiber.type === 'button'`，只在处理 `<button>` 节点时暂停
2. **监视变量**：在"监视"面板添加 `fiber.memoizedProps`、`fiber.memoizedState`，实时观察状态变化
3. **调用栈跳转**：点击调用栈里的任意一帧，跳转到对应的源码位置和局部变量

后续每一篇讲到具体函数，都可以照着这个方法在对应函数上打断点验证。

> 💬 **面试官会问**：本地怎么调试 React 源码？为什么直接改 `node_modules` 里的源码不是个好方式？
>
> ✅ **标准答案**：clone 官方仓库，用 `yarn build <包名> --type=NODE_DEV` 打出本地开发版构建产物，再通过 `resolve.alias` 把业务项目的 `react`/`react-dom` 指向这份本地构建产物，就能在 VSCode 里对源码打断点调试。直接改 `node_modules` 风险很大——重新 `install` 会被覆盖清空，改动无法被 git 追踪，团队其他人也拉不到你的调试改动。

> 🎁 **加分答案**：`node_modules` 里的包通常是构建产物（可能被压缩过一部分），不一定包含清晰的调试信息，这也是不推荐直接改的原因之一。此外锁定 `git checkout v18.2.0` 这一步不能省略——React 主干分支（`main`）的实现细节会随时间推移持续演进，如果调试环境跟着主干走，代码行号和具体实现可能和本系列文章里贴的源码 snippet 出现偏差，反而增加学习时的困惑。

---

### 4. 场景实战

#### HIS 系统首页并发特性优化

```javascript
// main.tsx
import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import App from './App'

const container = document.getElementById('root')
const root = createRoot(container)

root.render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

大量指标卡片 + 患者列表存在时，并发模式让全局检索输入这类高优先级交互不会被大范围重渲染阻塞。

#### startTransition 处方列表筛选

```jsx
import { useState, startTransition } from 'react'

function PrescriptionListPage() {
  const [keyword, setKeyword] = useState('')
  const [sortedList, setSortedList] = useState(fullPrescriptionList)

  function handleFilterChange(value) {
    setKeyword(value) // 👈 输入框立即响应（高优先级）
    
    startTransition(() => {
      // 👈 允许被打断，延后完成（低优先级）
      const filtered = fullPrescriptionList.filter(p => 
        p.drugName.includes(value) || p.patientName.includes(value)
      )
      const sorted = sortBy(filtered, 'createTime')
      setSortedList(sorted)
    })
  }

  return (
    <>
      <SearchInput value={keyword} onChange={handleFilterChange} />
      <PrescriptionTable data={sortedList} />
    </>
  )
}
```

#### 路由级代码分割

```jsx
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

const ConsultationModule = lazy(() => import('./modules/Consultation'))
const PrescriptionModule = lazy(() => import('./modules/Prescription'))
const LabReportModule = lazy(() => import('./modules/LabReport'))

function HISSystem() {
  return (
    <BrowserRouter>
      <Suspense fallback={<ModuleLoadingSpinner />}>
        <Routes>
          <Route path="/consultation/*" element={<ConsultationModule />} />
          <Route path="/prescription/*" element={<PrescriptionModule />} />
          <Route path="/lab-report/*" element={<LabReportModule />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
```

问诊/处方/检验报告三大模块各自独立打包，减小 HIS 系统首屏加载体积，只有用户真正进入某个模块时才加载对应代码。

#### StrictMode 暴露副作用问题

```jsx
function OrderEntryForm() {
  const [orders, setOrders] = useState(() => {
    // ❌ 错误写法：每次调用都往全局数组 push，不纯
    globalDraftOrders.push({ id: Date.now(), items: [] })
    return globalDraftOrders[globalDraftOrders.length - 1]
  })
  
  // ✅ 正确写法：返回一个新对象，不修改外部状态
  const [orders, setOrders] = useState(() => ({
    id: Date.now(),
    items: []
  }))
  
  return (/* ... */)
}
```

`<StrictMode>` 会让前者的 bug 立刻显形（全局数组里多出了两份草稿），提前修正，避免这类问题在并发渲染的不确定性中被放大。

#### useSyncExternalStore 订阅外部数据源

```jsx
import { useSyncExternalStore } from 'react'
import doctorScheduleStore from './doctorScheduleStore'

function DoctorScheduleWidget() {
  const schedule = useSyncExternalStore(
    doctorScheduleStore.subscribe,    // 订阅函数
    doctorScheduleStore.getSnapshot,  // 获取当前快照
    doctorScheduleStore.getServerSnapshot  // SSR 场景的服务端快照
  )

  return <ScheduleCalendar data={schedule} />
}
```

相比手写 `useEffect + useState` 组合去订阅外部 store，`useSyncExternalStore` 是 React 18 专门为解决并发渲染下的"tearing"（撕裂，指同一次渲染中不同组件读到了外部数据源不一致的快照）问题设计的 API。原理和源码细节留给第 06 篇 Hooks 篇展开，这里先记住"外部数据源订阅优先选它，而不是自己拼 `useEffect`"这个结论。

---

## 二、设计与原理

### 1. FiberNode 数据结构速览

一个 Fiber 节点除了 `child/sibling/return` 这三个链表指针，还承载了大量渲染需要用到的信息。理解这些字段是读懂后续每一篇源码的基础：

| 字段 | 作用 | 后续详细展开的篇章 |
|------|------|------------------|
| `tag` | 节点类型标识（函数组件/类组件/宿主节点/Fragment 等） | 第 03 篇渲染原理 |
| `type` | 组件类型（函数/类）或宿主标签字符串（`'div'` 等） | 第 03 篇渲染原理 |
| `key` | diff 算法用来判断"是不是同一个节点"的标识 | 第 04 篇 Diff 算法 |
| `stateNode` | 指向这个 Fiber 对应的真实实例（宿主节点对应真实 DOM 元素，类组件对应组件实例） | 第 03 篇渲染原理 |
| `pendingProps` | 本次渲染即将生效的 props | 第 03 篇渲染原理 |
| `memoizedProps` | 上一次渲染已生效的 props | 第 03 篇渲染原理 |
| `memoizedState` | 上一次渲染完成后的 state（函数组件里对应 Hook 链表的头节点） | 第 06 篇 Hooks |
| `updateQueue` | 待处理的更新队列 | 第 02 篇状态更新 |
| `flags` | 标记这个节点本次渲染需要执行的副作用类型（新增/更新/删除/DOM 操作等） | 第 05 篇 commit 阶段 |
| `subtreeFlags` | 子树副作用标记的冒泡汇总（React 18 新增，替代 effectList） | 第 05 篇 commit 阶段 |
| `lanes` | 这个 Fiber 上待处理更新的优先级 | 第 02 篇状态更新 |
| `childLanes` | 子树上待处理更新的优先级汇总 | 第 02 篇状态更新 |
| `alternate` | 指向"另一棵树"里对应的同一个组件的 Fiber 节点（双缓存机制的核心） | 下一小节详细展开 |

可以看到，Fiber 节点不只是一个"树的节点"，更像是一份**组件的完整渲染档案**——props、state、更新队列、副作用标记全部挂在这一个对象上，渲染过程本质就是遍历这些 Fiber 节点、读写这些字段的过程。

> 💬 **面试官会问**：Fiber 节点和 React Element 有什么区别？
>
> ✅ **标准答案**：React Element 是 `createElement` 返回的普通 JS 对象，轻量级，只描述 UI 结构（type、props、children）；Fiber 节点是渲染过程中创建的运行时实例，包含大量调度、副作用、状态管理的字段（flags、lanes、updateQueue、memoizedState 等），是实际的"工作单元"。React Element 像是"设计图纸"，Fiber 节点像是"施工现场的工人"——前者只描述要干什么，后者负责真正干活。

---

### 2. Stack Reconciler 的死结

React 15 及之前，组件树的遍历用的是**递归**——渲染一个组件树，本质是一层套一层的函数调用：

```javascript
// 简化示意：Stack Reconciler 的递归遍历
function reconcileChildren(node) {
  // 处理当前节点
  updateNode(node)

  // 递归处理所有子节点
  for (const child of node.children) {
    reconcileChildren(child) // 👈 递归调用，JS 调用栈层层加深
  }
}
```

**这种写法的问题在于**：JS 是单线程的，一旦一次函数调用链开始执行，浏览器主线程就被这条调用链完全占用，直到递归全部返回才能把控制权交还给浏览器。

如果组件树很深、很大（医疗场景里"患者列表 + 全局检索"这种成百上千个节点的树），一次渲染可能占用主线程几十甚至上百毫秒，期间用户的点击、输入、动画全部被阻塞——这就是所谓的"掉帧"和"卡顿"。

**为什么递归无法"暂停"？**

递归调用栈没有"暂停点"这个概念：函数调用一旦入栈，必须等它和它调用的所有子函数都执行完、出栈，才能轮到别的任务执行。这是 JS 引擎调用栈本身的机制决定的，不是 React 代码写得不好能优化掉的——只要遍历逻辑是递归，这个死结就永远存在。

```
调用栈示意（一旦开始就必须跑完）：
reconcileChildren(根节点)
  → reconcileChildren(患者列表)
    → reconcileChildren(患者项 1)
      → reconcileChildren(患者详情)
        → ... （层层深入，无法在中途跳出）
```

**医疗场景：患者列表 + 全局检索的卡顿**

HIS 系统首页通常有：

- 20+ 个指标卡片（门诊量、住院率、药品库存等）
- 100+ 条患者列表（姓名、病历号、就诊时间、状态）
- 全局检索输入框

用户在检索框输入时，如果触发整个页面重新渲染（比如根据关键词高亮匹配项），React 15 的递归遍历会让输入框明显卡顿——你敲了好几个字，界面还在处理上一次的渲染，输入和显示严重脱节。

> 💬 **面试官会问**：为什么 React 15 要重构成 Fiber？Stack Reconciler 的死结是什么？
>
> ✅ **标准答案**：React 15 的 Stack Reconciler 用递归遍历组件树，JS 调用栈一旦开始执行就无法中途让出主线程，大组件树的一次渲染可能长时间阻塞浏览器响应用户输入、动画等高优先级任务。递归调用栈没有"暂停点"这个概念，函数调用一旦入栈必须等它和它调用的所有子函数都执行完才能出栈，这是 JS 引擎调用栈本身的机制决定的，不是代码优化能解决的——只要遍历逻辑是递归，这个死结就永远存在。

> 🎁 **加分答案**：这个问题在大型应用里尤其明显——医疗 HIS 系统首页通常有上百个节点（指标卡片 + 患者列表 + 全局检索），用户在检索框输入时如果触发整个页面重新渲染，React 15 的递归遍历会让输入框明显卡顿——你敲了好几个字，界面还在处理上一次的渲染，输入和显示严重脱节。

---

### 3. Fiber 链表化改造

React 16 引入 Fiber 架构，核心思路是把"函数递归调用栈"改造成"数据结构里的链表"，遍历方式从"递归"变成"循环"：

```javascript
// 简化示意：Fiber 架构下的循环遍历（work loop）
function workLoop(fiber) {
  let nextFiber = fiber
  while (nextFiber !== null) {
    nextFiber = performUnitOfWork(nextFiber) // 处理一个节点，返回下一个要处理的节点
    
    if (shouldYield()) {
      break // 👈 关键：循环随时可以在这里跳出，把主线程还给浏览器
    }
  }
  // 如果还有没处理完的节点（nextFiber !== null），下次有空闲时间再从这里继续
}
```

**Fiber 链表结构：三个指针连接组件树**

每个组件对应一个 Fiber 节点，节点之间通过三个指针连接成一棵"链表化"的树：

- `child`：指向第一个子节点
- `sibling`：指向下一个兄弟节点
- `return`：指向父节点（处理完子树后要"返回"的节点）

```
        <App> (return: null)
         ↓ child
      <Header> (return: App, sibling: Main)
         ↓ child                ↓ sibling
      <Logo>               <Main> (return: App, sibling: null)
                              ↓ child
                          <PatientList> (return: Main)
                              ↓ child
                          <Patient id=1> (sibling: Patient id=2)
```

遍历这棵树不再需要函数调用栈层层深入，而是靠这三个指针在一个 `while` 循环里"手动"走位：

1. 有 `child` 就往下走（深度优先）
2. 没有 `child` 就走 `sibling`（处理兄弟节点）
3. 都没有就顺着 `return` 往上"回溯"（返回父节点，继续找父节点的 sibling）

```javascript
// 简化示意：Fiber 链表的遍历逻辑
function performUnitOfWork(fiber) {
  // 处理当前 Fiber 节点
  console.log(`处理节点: ${fiber.type}`)

  // 1. 有子节点，返回子节点（深度优先）
  if (fiber.child) {
    return fiber.child
  }

  // 2. 没有子节点，找兄弟节点或回溯
  let node = fiber
  while (node) {
    if (node.sibling) {
      return node.sibling  // 返回兄弟节点
    }
    node = node.return     // 回溯到父节点，继续找父节点的兄弟
  }

  return null  // 整棵树遍历完成
}
```

这个过程本质上是用数据结构模拟了递归调用栈原本要做的事，但因为是在一个循环里手动控制，**循环体每处理完一个 Fiber 节点，都可以检查一次 `shouldYield()`，决定要不要在这里暂停、把主线程让给浏览器**——这正是递归调用栈做不到的事情。

> 💬 **面试官会问**：Fiber 链表结构和可中断渲染之间是什么关系？
>
> ✅ **标准答案**：Fiber 把组件树改造成通过 `child/sibling/return` 指针连接的链表结构，遍历逻辑从递归变成循环（work loop），循环体每处理完一个节点就能检查 `shouldYield()` 是否需要暂停，把控制权交还浏览器，之后再从暂停的地方恢复——这就是"可中断渲染"的由来。递归调用栈一旦开始就必须跑完，循环可以在任意迭代处跳出并保存进度（当前处理到哪个 Fiber 节点），这是两种遍历方式在"可控制性"上的本质区别。

> 🎁 **加分答案**：Fiber 这个词本身也是"纤程"的意思，类比操作系统里"协程"的概念——一个任务可以主动让出执行权、之后再被恢复，而不是像传统函数调用一样"一去不回头"。这不是 React 独创的思路，而是把编程语言/操作系统里早已成熟的"协作式调度"思想应用到了 UI 渲染引擎上。

---

### 4. 双缓存技术

React 在任意时刻实际上维护着**两棵 Fiber 树**：

- **current 树**：当前已经渲染到屏幕上、和真实 DOM 保持一致的那棵树
- **workInProgress 树**：正在构建中的、代表"下一次要渲染成什么样"的树

每个 Fiber 节点上的 `alternate` 字段，指向的正是"另一棵树里对应同一个组件的 Fiber"——`current` 树上某个节点的 `alternate` 指向 `workInProgress` 树上对应的节点，反之亦然：

```
current 树（屏幕上显示的）        workInProgress 树（正在构建的）
      <App> ←——— alternate ———→        <App>
       ↓                                 ↓
    <Header> ←— alternate —→        <Header>
       ↓                                 ↓
    <PatientList> ← alternate → <PatientList>
```

**渲染流程中的双缓存切换**

1. **渲染开始**：React 基于 `current` 树上每个节点的信息，复用或创建出对应的 `workInProgress` 节点（优先复用 `alternate` 指向的旧对象，只更新必要的字段，减少内存分配）
2. **渲染进行中**：在 `workInProgress` 树上执行 diff、计算副作用、标记 flags
3. **commit 阶段**：把 `workInProgress` 树计算出的变化应用到真实 DOM
4. **切换指针**：`FiberRootNode.current` 指针直接切换到 `workInProgress` 树——原来的 `workInProgress` 树"变成"新的 `current` 树，原来的 `current` 树则退居为下一次渲染时可以复用的 `alternate`

```javascript
// 简化示意：commit 完成后的指针切换
function commitRoot(root) {
  // ... 执行所有 DOM 操作

  // 👈 关键：整体切换指针
  root.current = root.current.alternate

  // 现在新树变成了 current，旧树成了 alternate，等待下次渲染复用
}
```

**为什么要维护两棵树，而不是直接在一棵树上改？**

如果只有一棵树，渲染过程中（尤其是 Concurrent 模式下，渲染可能被中断、甚至被放弃重来）直接修改这棵树，会导致屏幕上显示的内容和正在构建、尚未完成的中间状态混在一起——用户可能看到一个"半新半旧"的、不完整的 UI。

双缓存保证了：**只要 `workInProgress` 树没有完整构建完成并 commit，屏幕上显示的永远是完整的、一致的 `current` 树**，不会出现渲染中间状态泄漏到屏幕上的问题。

这个思路和图形渲染里的"双缓冲"（先在后台缓冲区画完整幅画面，再一次性交换到屏幕）是同一个原理。

**性能上的收益**

双缓存还带来了性能上的收益——构建 `workInProgress` 节点时，如果对应的 `current` 节点存在且 props/state 没有变化（满足 bailout 条件，第 03 篇会展开），可以直接复用这个节点对象而不用重新创建，减少了大量本可以避免的对象分配和 GC 压力。

> 💬 **面试官会问**：说说 React 的双缓存技术，为什么需要它？
>
> ✅ **标准答案**：React 同时维护 `current` 树（当前显示在屏幕上的）和 `workInProgress` 树（正在构建的下一次渲染结果），两棵树上对应同一个组件的 Fiber 节点通过 `alternate` 字段互相指向。渲染完成后，`FiberRootNode.current` 指针直接切换到构建完的新树，实现新旧 UI 的整体替换。这样设计是为了避免渲染过程中的中间状态（尤其是可能被打断的并发渲染）被用户看到——屏幕上任何时候展示的都是一棵完整的树，不会出现"半棵树"的情况。

> 🎁 **加分答案**：双缓存还带来了性能上的收益——构建 `workInProgress` 节点时，如果对应的 `current` 节点存在且 props/state 没有变化（满足 bailout 条件，第 03 篇会展开），可以直接复用这个节点对象而不用重新创建，减少了大量本可以避免的对象分配和 GC 压力。

---

### 5. Lane 模型初探

链表化改造解决了"能不能中断"的问题，但紧接着有一个新问题：**中断之后，该先恢复哪个任务？**

医疗场景里，用户在检索框里连续输入的同时，后台可能还有一个"药品列表根据筛选条件重新渲染"的任务在跑——用户输入必须被立刻响应，筛选列表重新渲染可以稍微延后。React 需要一种方式，能表达"这个更新比那个更新更紧急"，这就是 Lane（车道）模型要解决的问题。

**从 `expirationTime` 到 Lane 模型的演进**

React 16 到 17 用的是 `expirationTime`——一个数值，数值越小代表越紧急，类似"过期时间"的排序。这个模型有个问题：**多个不同优先级的更新无法方便地"合并"表达**。

React 18 换成了 Lane 模型：用一个 **31 位的二进制数**，每一位（或一组位）代表一种优先级"车道"：

```javascript
// 简化示意：Lane 模型的常量定义（来自 ReactFiberLane.js）
const SyncLane = 0b0000000000000000000000000000001  // 同步，最高优先级
const InputContinuousLane = 0b0000000000000000000000000000100  // 连续输入
const DefaultLane = 0b0000000000000000000000000010000  // 默认优先级
const TransitionLane1 = 0b0000000000000000000000001000000  // 过渡（startTransition 用的）
const IdleLane = 0b0100000000000000000000000000000  // 空闲
```

**位运算的核心优势**

用位运算代替数值比较，带来的核心好处是：**多个优先级可以通过位或（`|`）运算合并表达成一个数**，判断"这批更新里有没有某个优先级"用位与（`&`）运算即可：

```javascript
// 合并多个优先级
let lanes = SyncLane | DefaultLane  // 0b00...010001，表示"既有同步更新，也有默认优先级更新"

// 判断是否包含某个优先级
if (lanes & SyncLane) {
  // 包含同步更新，必须立即处理
}

// 提取最高优先级
function getHighestPriorityLane(lanes) {
  return lanes & -lanes  // 👈 位运算技巧：提取最右边的 1
}
```

一次运算就能同时处理多个优先级的组合逻辑，而单纯的数值大小比较做不到这种"组合"的表达能力。

**常见的 Lane 优先级分类**

| Lane 类型 | 触发场景 | 能否被打断 | 典型用途 |
|-----------|---------|-----------|---------|
| `SyncLane` | Legacy 模式、`flushSync`、某些用户交互 | ❌ 不可中断 | 关键的同步更新 |
| `InputContinuousLane` | 连续输入、拖拽、滚动等 | ✅ 可中断 | 连续交互 |
| `DefaultLane` | 默认场景（事件回调、useEffect 等） | ✅ 可中断 | 常规更新 |
| `TransitionLane` | `startTransition` 包裹的更新 | ✅ 可中断，优先级最低 | 非紧急 UI 更新 |
| `IdleLane` | `requestIdleCallback` | ✅ 可中断，空闲时才处理 | 后台任务 |

这里先建立"为什么需要它"的直觉，具体的位运算规则、`mergeLanes`/`getNextLanes`/`markStarvedLanesAsExpired` 等源码细节，留给第 02 篇状态更新篇结合 Update 队列一起展开。

> 💬 **面试官会问**：Lane 模型相比 `expirationTime` 数值模型有什么优势？
>
> ✅ **标准答案**：`expirationTime` 用一个数值表示优先级，数值越小越紧急，但多个不同优先级的更新无法方便地"合并"表达。Lane 模型用 31 位二进制的每一位代表一种优先级"车道"，通过位运算可以轻松做"多个优先级合并"（位或 `|`）、"判断是否包含某个优先级"（位与 `&`）、"提取最高优先级"（`lanes & -lanes`）等操作，一次运算就能同时处理多个优先级的组合逻辑，精度和灵活性都更高。

> 🎁 **加分答案**：Lane 模型还为"优先级饿死"问题提供了更好的解决方案——每个 Lane 在被创建时会计算一个"过期时间"（`expirationTime`，是的，这个字段还在，只是不再是优先级本身），如果一个 lane 排队超过这个时间还没被处理，会被强制标记为"过期"（`markStarvedLanesAsExpired`），下一次 `getNextLanes` 会优先处理过期的 lane 甚至提升为同步优先级，保证"低优先级更新最终一定会被执行"，不会无限延后。这部分细节会在第 02 篇展开。

---

### 6. 并发渲染与时间切片

`createRoot` 开启并发模式后，渲染任务不是一次性跑完，而是交给独立的 `scheduler` 包做**时间切片**——默认以约 5ms 为一帧，`workLoop` 每处理若干个 Fiber 节点，就调用一次 `shouldYieldToHost()` 检查这一帧的时间是否已经用完：

```javascript
// 简化示意：scheduler 包的时间切片判断
const frameInterval = 5  // 默认 5ms 一帧

function shouldYieldToHost() {
  const timeElapsed = getCurrentTime() - frameStartTime
  return timeElapsed >= frameInterval  // 👈 这一帧的时间片用完了，该让出主线程了
}
```

**work loop 中的让出逻辑**

```javascript
// 简化示意：并发模式的 work loop（来自 ReactFiberWorkLoop.js）
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress)  // 处理一个 Fiber 节点
  }
  // 如果 shouldYield() 返回 true，循环跳出，把主线程还给浏览器
}
```

如果时间片用完，`workLoop` 主动跳出循环，把主线程还给浏览器，让浏览器有机会处理绘制、响应用户输入等更高优先级的工作；等浏览器空闲下来，再通过调度机制把剩下的渲染工作接着做完。

**高优先级更新打断低优先级渲染**

假设低优先级的"药品列表筛选"正在渲染中（已经处理了 50 个 Fiber 节点，还有 100 个没处理），用户突然在输入框里输入了一个字符（高优先级更新）：

1. 调度器检测到新的高优先级更新
2. 当前的 work loop 检查 `shouldYield()`，发现"有更高优先级的任务"，返回 `true`
3. work loop 跳出，保存当前进度（`workInProgress` 指向还没处理的节点）
4. 开始处理高优先级的"输入框更新"，立即渲染
5. 高优先级渲染完成后，重新调度低优先级任务，从之前中断的地方继续

这正是本篇「一、3」节里断点调试时看到的调用栈中 `performConcurrentWorkOnRoot` 这条路径实际在做的事情。

> 💬 **面试官会问**：concurrent 渲染和 legacy 渲染在调用方式和调度行为上分别有什么核心区别？
>
> ✅ **标准答案**：调用方式上，legacy 模式用 `ReactDOM.render`，concurrent 模式用 `createRoot(...).render`。调度行为上，legacy 模式的更新固定走 `SyncLane`，一旦开始渲染就同步跑完、不可中断；concurrent 模式会根据触发场景给更新分配不同的 Lane，渲染过程通过 `scheduler` 包做时间切片，每处理若干 Fiber 节点就检查是否要暂停并让出主线程，高优先级更新可以打断正在进行的低优先级渲染。

> 🎁 **加分答案**：即使是 concurrent 模式，`SyncLane` 优先级的更新依然会走同步、不可中断的渲染路径（`performSyncWorkOnRoot`）——并发模式不是"所有渲染都变成可中断的"，而是"多了一条可中断的渲染路径，配合 Lane 优先级决定走哪条路径"，两条路径共存于同一个 React 18 版本里。

---

### 7. 包职责划分

Fiber 架构落地后，React 源码被拆成了职责分明的几个包，自底向上互相依赖：

| 包名 | 职责 | 包含的核心内容 | 依赖关系 |
|------|------|---------------|---------|
| `react` | 只定义 `Component`/Hooks 等公共 API 和 JSX 运行时，不涉及任何具体的渲染逻辑 | `createElement`、`useState`、`useEffect` 等 Hook 的 API 声明 | 无依赖（最底层） |
| `scheduler` | 独立的任务调度器，只关心"优先级"和"时间切片"这两件事，完全不知道 Fiber、组件是什么 | `shouldYieldToHost`、任务队列、优先级排序 | 无依赖（可单独使用） |
| `react-reconciler` | 平台无关的协调算法核心（Fiber 树构建、diff、调度对接），被 `react-dom`、`react-native`、`react-test-renderer` 共同依赖 | `beginWork`、`completeWork`、`commitRoot`、work loop | 依赖 `react` 和 `scheduler` |
| `react-dom` | 浏览器宿主环境的渲染器，提供 `react-reconciler` 需要的 Host Config 实现（怎么创建/更新/删除真实 DOM 节点） | `createRoot`、`hydrateRoot`、Host Config（`createInstance`、`appendChild` 等） | 依赖 `react-reconciler` |

**这个划分的核心设计动机**

**协调算法本身（怎么 diff、怎么调度）和"最终把结果画在哪个平台上"是两件完全不同的事情**，拆成独立的包，才能让 `react-reconciler` 这一份代码同时服务浏览器 DOM、React Native、测试环境等多个渲染目标。

`scheduler` 更进一步——它甚至不知道 Fiber、组件这些概念，只单纯地管理"任务"和"优先级"，这个包完全可以脱离 React 被其他项目复用。

**Host Config 约定与自定义渲染器**

`react-reconciler` 包对外暴露的正是"传入一份 `HostConfig`，返回一个绑定了这份配置的协调算法实例"这样一个工厂函数：

```javascript
// react-reconciler 包对外暴露的入口（简化示意）
import ReactReconciler from 'react-reconciler'

const HostConfig = {
  // 节点创建与操作
  createInstance(type, props) { /* 创建一个宿主环境的节点实例 */ },
  createTextInstance(text) { /* 创建文本节点 */ },
  appendChild(parent, child) { /* 把子节点挂到父节点下 */ },
  removeChild(parent, child) { /* 从父节点上移除子节点 */ },
  insertBefore(parent, child, beforeChild) { /* 插入到指定位置 */ },
  
  // 属性更新
  commitUpdate(instance, updatePayload, type, oldProps, newProps) { /* 把属性变化应用到节点实例上 */ },
  commitTextUpdate(textInstance, oldText, newText) { /* 更新文本内容 */ },
  
  // 其他必需方法
  prepareUpdate(instance, type, oldProps, newProps) { /* 计算需要更新的属性，返回 updatePayload */ },
  shouldSetTextContent(type, props) { /* 判断是否应该把子节点当作纯文本处理 */ },
  getRootHostContext(rootContainer) { /* 获取根容器的上下文信息 */ },
  getChildHostContext(parentContext, type) { /* 获取子节点的上下文 */ },
  // ... 完整约定大约 7-10 个方法，视版本而定
}

const reconcilerInstance = ReactReconciler(HostConfig)
```

这和 Vue 3 的 `createRenderer(options)` 渲染器工厂设计思路是同构的，只要实现约定好的这组方法，就能接入完整的 Fiber 协调算法，不需要了解 Fiber 树构建、diff、调度这些内部实现细节。

> 💬 **面试官会问**：`react-reconciler` 为什么要独立成一个不依赖具体渲染平台的包？如果让你给 React 写一个 Canvas 渲染器，大致需要实现哪些接口？
>
> ✅ **标准答案**：`react-reconciler` 只负责"计算出哪些地方需要变化"（Fiber 树构建、diff 算法、优先级调度），完全不关心"变化具体怎么落地到某个平台"。这样设计让同一套协调算法可以服务 DOM、React Native、测试渲染器等不同平台，新增一个平台不需要重写协调逻辑，只需要实现平台特定的 Host Config 接口（创建节点、插入/删除节点、更新属性等，大约 7-10 个方法）。

> 🎁 **加分答案**：要写一个 Canvas 渲染器，需要实现这组接口，把"创建 DOM 元素"换成"在内部维护的场景树中创建一个绘制节点"，把"插入/更新/删除 DOM"换成对应的 Canvas 绘制指令，协调算法本身（何时调用这些接口）完全不用改——这也是本篇「四」节的手写实现可以直接使用 `react-reconciler` 包做出自定义渲染器的原因。

---

### 8. 副作用收集：从 effectList 到 subtreeFlags 冒泡

这是一个容易被面试官追问、但很多资料没讲清楚的细节。

**React 17 及之前：独立的 `effectList` 链表**

React 17 的渲染过程中，会维护一条独立的 `effectList` 链表，专门收集"有副作用需要处理的 Fiber 节点"（比如需要插入 DOM、需要更新属性的节点）。commit 阶段直接遍历这条链表执行副作用，不需要再遍历一遍完整的 Fiber 树。

**React 18：`subtreeFlags` 冒泡取代 `effectList`**

React 18 把这条独立链表去掉了，改成在 `completeWork`（自底向上"完成"每个 Fiber 节点时）阶段，把当前节点自身的 `flags` 通过位或运算"冒泡"合并到父节点的 `subtreeFlags` 字段上。

commit 阶段遍历树时，只要一个节点的 `subtreeFlags` 是 `NoFlags`（说明它的整棵子树都没有副作用需要处理），就可以直接跳过整棵子树，不需要再往下遍历。

**为什么要这样改？**

两种方式都是为了避免"遍历完整棵树才能找出哪些节点需要处理"：

- `effectList` 方式：维护一条独立链表，commit 阶段直接遍历链表，不用再遍历树
- `subtreeFlags` 方式：省去了额外维护一条链表的开销，用位运算做"有没有副作用"的剪枝判断

React 18 的方式省去了额外维护一条链表的内存开销，并且这个变化和 React 18 支持的一些新特性（比如 Suspense 场景下渲染树的部分子树可能被暂时"卸下"又重新挂载）有关——独立的 `effectList` 链表在这类更复杂的树结构变化场景下维护成本变高，而"冒泡到 `subtreeFlags`"这种方式天然贴合树结构本身，不需要额外维护一份和树结构平行的链表数据。

> 💬 **面试官会问**：React 18 和 React 17 在 commit 阶段的实现上有什么不同？
>
> ✅ **标准答案**：React 17 用一条独立的 `effectList` 链表收集所有有副作用的 Fiber 节点，commit 阶段直接遍历这条链表；React 18 去掉了这条链表，改为在 `completeWork` 阶段把子节点的 `flags` 通过位运算冒泡合并到父节点的 `subtreeFlags` 上，commit 阶段遍历 Fiber 树时，凡是 `subtreeFlags` 为空的子树直接跳过不再深入。

> 🎁 **加分答案**：两种方式都是为了避免"遍历完整棵树才能找出哪些节点需要处理"，React 18 的方式省去了额外维护一条链表的开销，并且和 Suspense 场景下渲染树的部分子树可能被暂时"卸下"又重新挂载这类新特性有关——独立的 `effectList` 链表在这类场景下维护成本变高，而"冒泡到 `subtreeFlags`"天然贴合树结构本身。这部分细节会在第 05 篇 commit 阶段篇详细展开。

---

### 9. 对比 Vue 3

同样是要解决"如何高效更新视图"这个问题，React 18 和 Vue 3 走的是两条完全不同的路线。

**Vue 3 的路线：编译时优化 + 运行时最小化 diff**

Vue 3 的 `createApp` 背后是**编译时优化 + 运行时最小化 diff**的路线——模板在构建阶段就能被编译器分析，通过 PatchFlag 标记出哪些节点是"动态的"（绑定了响应式数据、可能会变化），运行时的 Block Tree 只需要对比这些被标记过的动态节点，跳过所有确定不会变化的静态节点。

**React 18 的路线：运行时通用调度**

React 18 的 `createRoot` 背后是**运行时通用调度**的路线——JSX 本质是普通的函数调用（`React.createElement(...)`），编译阶段（Babel 转译）只是把 JSX 语法转成函数调用，并不知道"这个节点的这个属性会不会变化"这类运行时才能确定的信息。

JSX 完全动态，编译期无法预知哪些节点会变化——因为 JSX 里可以用任意 JavaScript 表达式、条件、循环构造 UI，编译期根本无法确定"哪些节点会变化"。React 无法像 Vue 3 那样在编译期锁定哪些节点是动态的，只能在运行时通过 Fiber 链表结构 + Lane 优先级，做一种"不知道具体哪里会变，但可以随时暂停、按优先级调度"的启发式方案。

**两种路线的对比**

| 维度 | Vue 3 | React 18 |
|------|-------|----------|
| **优化发生的阶段** | 编译时（模板 → 带 PatchFlag 的渲染函数） | 运行时（Fiber 链表 + Lane 调度） |
| **diff 范围** | 只对比编译期标记的动态节点 | 遍历完整的 Fiber 树（可被优先级和 bailout 剪枝） |
| **前提条件** | 模板是静态字符串，编译期可分析 | JSX 完全动态，无法在编译期确定变化范围 |
| **换来的收益** | 运行时性能（diff 范围更小） | JSX 的完全动态自由度（可以任意用 JS 表达式构造 UI） |
| **中断能力** | 无需中断（diff 范围本身已经很小） | Fiber 链表结构支持任意节点暂停/恢复 |
| **开发体验** | 模板语法受限（固定的指令、语法规则） | JSX 就是纯 JavaScript，完全自由 |

**这不是"谁更先进"的问题，而是两种不同的设计取舍**：

- Vue 3 的模板语法本身是受限的（有固定的指令、语法规则），这种"受限"恰恰是编译器能做静态分析的前提
- React 的 JSX 就是纯 JavaScript，可以用任意的条件、循环、函数式写法构造 UI，这种"完全自由"的代价就是编译器没法提前知道任何运行时才能确定的信息，只能把优化压力全部转移到运行时的调度算法上

用一个比喻：Vue 3 像是"提前标注好施工图纸，工人只需要按标注的地方施工"；React 18 像是"工人边施工边判断哪里需要改，随时可以暂停去处理更紧急的工单"。

> 💬 **面试官会问**：React 和 Vue 3 在渲染优化的思路上有什么本质区别？
>
> ✅ **标准答案**：Vue 3 用编译期信息换运行时性能——模板经过编译器分析，提前标记出动态节点（PatchFlag），运行时 diff 只需要对比这些节点。React 18 因为 JSX 是完全动态的函数调用，编译期无法确定哪些节点会变化，只能靠运行时的 Fiber 链表结构和 Lane 优先级模型做启发式的可中断调度，用运行时的调度能力去弥补"编译期信息缺失"这个先天限制。

> 🎁 **加分答案**：这不是"谁更先进"的问题，而是两种不同的设计取舍（tradeoff）——Vue 3 的模板语法本身是受限的（有固定的指令、语法规则），这种"受限"恰恰是编译器能做静态分析的前提；React 的 JSX 就是纯 JavaScript，可以用任意的条件、循环、函数式写法构造 UI，这种"完全自由"的代价就是编译器没法提前知道任何运行时才能确定的信息，只能把优化压力全部转移到运行时的调度算法上。

---

## 三、源码解析（重点代码，来源 GitHub 仓库）

> React 18 源码地址：https://github.com/facebook/react（本篇断点调试环境已锁定 `v18.2.0`）

### 1. createRoot 入口：packages/react-dom/src/client/ReactDOMRoot.js

```javascript
// packages/react-dom/src/client/ReactDOMRoot.js（简化示意，保留核心结构）
export function createRoot(container, options) {
  // 创建 FiberRootNode（整个应用的根，挂载调度所需的全局状态）
  // 和 HostRootFiber（对应根节点的 Fiber，是整棵 Fiber 树的起点）
  const root = createContainer(
    container,
    ConcurrentRoot, // 👈 标记这是并发模式的 root，Legacy 模式传的是 LegacyRoot
    null,
    options?.onRecoverableError,
    options?.identifierPrefix,
    options?.onUncaughtError,
    options?.onCaughtError,
    options?.transitionCallbacks,
  )

  markContainerAsRoot(root.current, container)

  const rootContainerElement = container.nodeType === COMMENT_NODE
    ? container.parentNode
    : container

  listenToAllSupportedEvents(rootContainerElement)

  return new ReactDOMRoot(root) // 👈 返回带 render/unmount 方法的 root 对象
}

function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot
}

ReactDOMRoot.prototype.render = function (children) {
  const root = this._internalRoot
  updateContainer(children, root, null, null) // 👈 触发一次渲染调度
}

ReactDOMRoot.prototype.unmount = function () {
  const root = this._internalRoot
  updateContainer(null, root, null, null) // 👈 传 null 触发卸载
}
```

**关键点**

1. `createRoot` 内部创建的 `ConcurrentRoot` 标记，正是「一」节里"Legacy 模式与 Concurrent 模式入口切换"在源码层面的真正落点——同样是 `createContainer`，传的 tag 不同，后续渲染路径就会分叉走向不同的调度方式
2. `listenToAllSupportedEvents` 在容器上注册事件委托，这是 React 合成事件系统的入口（第 08 篇会展开）
3. `ReactDOMRoot` 只是一个简单的类，`_internalRoot` 指向真正的 `FiberRootNode`，`render` 方法调用 `updateContainer` 触发调度

### 2. Root 节点结构：packages/react-reconciler/src/ReactFiberRoot.js

```javascript
// packages/react-reconciler/src/ReactFiberRoot.js（简化示意，保留核心结构）
function FiberRootNode(
  containerInfo,
  tag,
  hydrate,
  identifierPrefix,
  onRecoverableError,
) {
  this.tag = tag                    // 👈 ConcurrentRoot 或 LegacyRoot
  this.containerInfo = containerInfo
  this.pendingChildren = null
  this.current = null               // 👈 指向当前 current 树的 HostRootFiber（对应「二」节的双缓存）
  this.pingCache = null
  this.finishedWork = null
  this.timeoutHandle = noTimeout
  this.context = null
  this.pendingContext = null
  
  this.callbackNode = null          // 👈 调度器返回的任务句柄，用于取消/复用调度
  this.callbackPriority = NoLane
  this.eventTimes = createLaneMap(NoLanes)
  this.expirationTimes = createLaneMap(NoTimestamp)

  this.pendingLanes = NoLanes       // 👈 这个 root 上所有待处理更新的 lane 集合
  this.suspendedLanes = NoLanes
  this.pingedLanes = NoLanes
  this.expiredLanes = NoLanes
  this.mutableReadLanes = NoLanes
  this.finishedLanes = NoLanes
  this.errorRecoveryDisabledLanes = NoLanes

  // ... 其他字段
}
```

**关键字段**

- `tag`：`ConcurrentRoot` 或 `LegacyRoot`，决定渲染走哪条路径
- `current`：指向 current 树的根 Fiber
- `pendingLanes`：「二」节 Lane 模型落地到数据结构上的字段——每次有新的更新进来，对应的 lane 会通过位或运算合并进这个字段，调度时读取这个字段决定"接下来该处理哪个优先级的更新"
- `callbackNode`：调度器返回的任务句柄，如果这次调度还没完成又来了新的更新，会先取消旧任务再调度新任务

### 3. 时间切片调度循环：packages/scheduler/src/forks/Scheduler.js

```javascript
// packages/scheduler/src/forks/Scheduler.js（简化示意，保留核心结构）
let frameInterval = 5  // 默认 5ms 一帧

function shouldYieldToHost() {
  const timeElapsed = getCurrentTime() - startTime
  if (timeElapsed < frameInterval) {
    return false // 👈 这一帧的时间片还没用完，不需要让出
  }
  
  // 👈 时间片用完了，该让出主线程
  if (needsPaint || scheduling.isInputPending()) {
    // 浏览器需要绘制或有待处理的用户输入，必须让出
    return true
  }
  
  return true
}

function workLoop(hasTimeRemaining, initialTime) {
  let currentTime = initialTime
  currentTask = peek(taskQueue) // 从任务队列取出最高优先级任务
  
  while (currentTask !== null) {
    if (
      currentTask.expirationTime > currentTime &&
      (!hasTimeRemaining || shouldYieldToHost())
    ) {
      // 👈 当前任务还没过期，但时间片用完了，跳出循环让出主线程
      break
    }
    
    const callback = currentTask.callback
    if (typeof callback === 'function') {
      currentTask.callback = null
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime
      const continuationCallback = callback(didUserCallbackTimeout) // 👈 执行任务
      
      if (typeof continuationCallback === 'function') {
        // 👈 任务返回了一个函数，说明还没完成，把这个函数作为新的 callback 继续调度
        currentTask.callback = continuationCallback
      } else {
        // 👈 任务完成，从队列移除
        if (currentTask === peek(taskQueue)) {
          pop(taskQueue)
        }
      }
    } else {
      pop(taskQueue)
    }
    
    currentTask = peek(taskQueue)
  }
  
  // 如果队列还有任务，返回 true 表示需要继续调度
  if (currentTask !== null) {
    return true
  }
  return false
}
```

**关键点**

1. 这个函数就是「二」节时间切片一节讲的 `shouldYieldToHost()` 的真实实现
2. `scheduler` 包完全独立，内部不引用任何 Fiber 相关的类型或变量——印证了「二」节"scheduler 完全不知道 Fiber 是什么"这个包职责划分的结论
3. `workLoop` 执行任务时，如果任务返回一个函数（`continuationCallback`），说明任务还没完成，scheduler 会把这个函数作为新的 callback 重新入队——这就是并发渲染"暂停-恢复"的调度层实现

### 4. 渲染入口分发：packages/react-reconciler/src/ReactFiberWorkLoop.js

```javascript
// packages/react-reconciler/src/ReactFiberWorkLoop.js（简化示意，保留核心结构）

// 👇 同步、不可中断：一次性把整棵树渲染完
function performSyncWorkOnRoot(root) {
  const lanes = getNextLanes(root, NoLanes)
  
  let exitStatus = renderRootSync(root, lanes) // 👈 同步渲染，work loop 不检查 shouldYield
  
  const finishedWork = root.current.alternate
  root.finishedWork = finishedWork
  root.finishedLanes = lanes
  
  commitRoot(root, workInProgressRootRecoverableErrors, workInProgressTransitions) // 👈 commit 阶段
  
  return null
}

// 👇 并发、可中断：renderRootConcurrent 内部的 workLoopConcurrent 会随时检查 shouldYield
function performConcurrentWorkOnRoot(root, didTimeout) {
  const originalCallbackNode = root.callbackNode
  
  const lanes = getNextLanes(
    root,
    root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes,
  )
  
  if (lanes === NoLanes) {
    return null
  }
  
  const shouldTimeSlice = !includesBlockingLane(root, lanes) && !didTimeout
  
  let exitStatus = shouldTimeSlice
    ? renderRootConcurrent(root, lanes) // 👈 可中断的并发渲染
    : renderRootSync(root, lanes)       // 👈 包含阻塞性 lane，降级为同步渲染
  
  if (exitStatus !== RootInProgress) {
    // 渲染完成，进入 commit
    const finishedWork = root.current.alternate
    root.finishedWork = finishedWork
    root.finishedLanes = lanes
    finishConcurrentRender(root, exitStatus, lanes)
  }
  
  // 👇 关键：如果 root 上还有待处理的更新，返回一个函数让 scheduler 继续调度
  if (root.callbackNode === originalCallbackNode) {
    return performConcurrentWorkOnRoot.bind(null, root) // 👈 返回自己的引用
  }
  
  return null
}
```

**关键点**

1. 这两个函数正是「一、3」节断点调试时调用栈里出现的那两条分叉路径
2. `performSyncWorkOnRoot` 对应 Legacy 模式和高优先级（`SyncLane`）更新，一旦开始就同步跑完
3. `performConcurrentWorkOnRoot` 对应 Concurrent 模式下可被打断的渲染，它的返回值是"自己的引用"这个细节很关键：意味着如果这次没跑完，调度器会把"继续跑同一个任务"重新排入队列，而不是从头开始
4. `includesBlockingLane` 判断当前 lanes 是否包含阻塞性更新（如 `SyncLane`），如果包含，即使在并发模式下也会降级为同步渲染

### 5. 自定义渲染器 Host Config 约定：packages/react-reconciler/src/forks/ReactFiberReconciler.js

```javascript
// react-reconciler 包对外暴露的入口（简化示意）
import ReactFiberReconciler from 'react-reconciler'

// 浏览器 DOM 环境的 Host Config 实现在 react-dom 包里
const HostConfig = {
  createInstance(type, props, rootContainer, hostContext, internalHandle) {
    const domElement = document.createElement(type)
    // 设置初始属性...
    return domElement
  },
  
  createTextInstance(text, rootContainer, hostContext, internalHandle) {
    return document.createTextNode(text)
  },
  
  appendChild(parent, child) {
    parent.appendChild(child)
  },
  
  appendChildToContainer(container, child) {
    container.appendChild(child)
  },
  
  removeChild(parent, child) {
    parent.removeChild(child)
  },
  
  removeChildFromContainer(container, child) {
    container.removeChild(child)
  },
  
  insertBefore(parent, child, beforeChild) {
    parent.insertBefore(child, beforeChild)
  },
  
  commitUpdate(instance, updatePayload, type, oldProps, newProps, internalHandle) {
    // 把属性变化应用到 DOM 节点上
    updateFiberProps(instance, newProps)
    updateProperties(instance, updatePayload, type, oldProps, newProps)
  },
  
  commitTextUpdate(textInstance, oldText, newText) {
    textInstance.nodeValue = newText
  },
  
  prepareUpdate(instance, type, oldProps, newProps, rootContainer, hostContext) {
    // 计算需要更新的属性，返回 updatePayload
    return diffProperties(instance, type, oldProps, newProps)
  },
  
  shouldSetTextContent(type, props) {
    return (
      type === 'textarea' ||
      type === 'noscript' ||
      typeof props.children === 'string' ||
      typeof props.children === 'number'
    )
  },
  
  getRootHostContext(rootContainer) {
    return getChildNamespace(null, null)
  },
  
  getChildHostContext(parentContext, type) {
    return getChildNamespace(type, parentContext)
  },
  
  getPublicInstance(instance) {
    return instance
  },
  
  prepareForCommit(containerInfo) {
    return null
  },
  
  resetAfterCommit(containerInfo) {
    // commit 完成后的回调，可以在这里触发自定义的副作用
  },
  
  clearContainer(container) {
    // 清空容器内容
  },
  
  // ... 其他必需方法
}

const ReactReconciler = ReactFiberReconciler(HostConfig)

export { ReactReconciler }
```

**关键点**

1. `react-reconciler` 包对外暴露的正是"传入一份 `HostConfig`，返回一个绑定了这份配置的协调算法实例"这样一个工厂函数
2. 这和 Vue 3 的 `createRenderer(options)` 渲染器工厂设计思路是同构的
3. 只要实现约定好的这组方法，就能接入完整的 Fiber 协调算法，不需要了解 Fiber 树构建、diff、调度这些内部实现细节
4. 这一节的约定，正是本篇「四」手写实现要用到的接口

---

## 四、手写实现（可独立跑通）

本节基于本地真实项目 `D:\github\react-source`（GitHub：https://github.com/lotosv2010/react-source）编写，**不是简化版教学玩具，而是照着官方 React 18 源码 1:1 还原主链路的 TypeScript + pnpm monorepo 实现**。下面贴的每一段代码都是这个项目里真实存在的文件，不是为了讲解重新简化写的示意代码。

本篇的主线很明确：**JSX → 渲染**，也就是：

```
createElement/jsx（react 包）产出 ReactElement
  → createRoot(container).render(element) 触发 updateContainer
    → scheduleUpdateOnFiber 把更新交给调度
      → workLoop 里 beginWork（递：按 tag 分发、reconcile 出子 Fiber）
        → completeWork（归：创建真实 DOM 实例、副作用冒泡）
          → commitRoot（把 Fiber 树上的变更真正应用到页面 DOM）
```

Diff 算法的具体比对逻辑（`ReactChildFiber.ts` 单/多节点场景）留给第 04 篇，Update 队列的 Lane 优先级跳过语义留给第 02 篇——这两处出现在主线调用链上，但不是本篇重点，只贴关键入口 + 给参考文件路径，不整段展开。

### 1. 项目结构（对照官方 packages/ 划分）

```
react-source/
├── packages/
│   ├── shared/                # 跨包共享的工具函数、常量、类型
│   ├── react/                 # createElement / jsx 运行时
│   ├── react-reconciler/      # Fiber 树构建 + diff + commit（协调器核心）
│   ├── react-dom/             # DOM 渲染器（HostConfig 具体实现）
│   └── scheduler/             # 时间切片调度器
├── fixtures/                  # Vite 源码调试 demo（pnpm dev 入口）
├── scripts/
│   ├── rollup/                # 生产构建（build.js / bundles.js）
│   └── vite/                  # 源码调试构建（alias 到 packages 源码）
├── tsconfig.json / turbo.json / pnpm-workspace.yaml
```

> 目录、命名尽量贴近官方仓库 [facebook/react](https://github.com/facebook/react)，方便随时对照源码检索。

**根目录 package.json（节选，完整脚本见仓库）**

```json
{
  "name": "react-source",
  "version": "1.0.0",
  "private": true,
  "packageManager": "pnpm@11.24.0",
  "scripts": {
    "dev": "vite --config scripts/vite/vite.config.mts",
    "build": "node scripts/rollup/build.js",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "@rollup/plugin-commonjs": "^29.0.3",
    "@rollup/plugin-node-resolve": "^16.0.3",
    "@rollup/plugin-replace": "^6.0.3",
    "@rollup/plugin-terser": "^1.0.0",
    "@rollup/plugin-typescript": "^12.3.0",
    "rollup": "^4.63.1",
    "turbo": "^2.10.12",
    "typescript": "^6.0.3",
    "@vitejs/plugin-react": "^6.1.0",
    "vite": "^8.2.2"
  }
}
```

**pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
```

**tsconfig.json 的 paths（源码调试时 TS 按裸导入解析到各包源码，与下文 vite alias 一一对应）**

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "paths": {
      "shared/*": ["./packages/shared/*"],
      "react": ["./packages/react/src/index.ts"],
      "react/jsx-runtime": ["./packages/react/src/jsx-runtime.ts"],
      "react/jsx-dev-runtime": ["./packages/react/src/jsx-dev-runtime.ts"],
      "react-dom": ["./packages/react-dom/index.ts"],
      "react-dom/client": ["./packages/react-dom/client.ts"],
      "react-reconciler": ["./packages/react-reconciler/index.ts"],
      "react-reconciler/src/*": ["./packages/react-reconciler/src/*"],
      "scheduler": ["./packages/scheduler/index.ts"]
    }
  }
}
```

turbo.json 只是把 `build`/`lint`/`test` 串成 `dependsOn: ["^build"]` 的标准 pipeline，与本篇主线关系不大，参考仓库根目录 `turbo.json` 即可，这里不贴。

---

### 2. packages/shared —— 跨包共享的 Symbol 与类型

**packages/shared/ReactSymbols.ts**（用 `Symbol.for` 而非普通 `Symbol`，保证多份 React 实例互认；下面只列主链路用到的两个，完整表见仓库文件）

```typescript
/** ReactElement 的类型标识符，isValidElement 靠它判断 */
export const REACT_ELEMENT_TYPE = Symbol.for("react.element");

/** Fragment 的类型标识符，用于识别 <React.Fragment> 或 <> 语法 */
export const REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
```

**packages/shared/ReactTypes.ts**

```typescript
export type Key = string | null;

export type Ref =
  string | { current: unknown } | ((instance: unknown) => void) | null;

export type Props = Record<string, any>;

export type ElementType = any;
```

---

### 3. packages/react —— createElement 与 JSX 运行时

`react` 包的 `package.json` 导出三个入口，分别对应 JSX 编译到 classic runtime（`createElement`）和 automatic runtime（`jsx`/`jsxDEV`）两种模式：

```json
{
  "name": "react",
  "main": "npm/index.js",
  "exports": {
    ".": "./npm/index.js",
    "./jsx-runtime": "./npm/jsx-runtime.js",
    "./jsx-dev-runtime": "./npm/jsx-dev-runtime.js"
  },
  "dependencies": {
    "shared": "workspace:*"
  }
}
```

**packages/react/src/ReactCurrentOwner.ts**（记录"当前正在构建的组件"，即哪个 Fiber 在调用 `createElement`；reconciler 渲染函数组件时会写入这个全局单例，供 DEV 警告使用）

```typescript
const ReactCurrentOwner: { current: any | null } = {
  current: null,
};

export default ReactCurrentOwner;
```

**packages/react/src/ReactElement.ts**（经典运行时入口的核心实现，去掉了官方保留的 DEV 校验分支只留主链路，完整版含 key/ref 警告 getter 见仓库文件）

```typescript
import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import type { ElementType, Key, Props, Ref } from "shared/ReactTypes";
import ReactCurrentOwner from "./ReactCurrentOwner";

// key/ref/__self/__source 是保留名，不能作为普通 prop 传给组件
const RESERVED_PROPS = { key: true, ref: true, __self: true, __source: true };

export interface ReactElementType {
  $$typeof: symbol;
  type: ElementType;
  key: Key;
  ref: Ref;
  props: Props;
  _owner: any;
}

// ReactElement 不是 class，不能用 new 调用；判断"是不是 React 元素"看 $$typeof 而非 instanceof
const ReactElement = function (
  type: ElementType,
  key: Key,
  ref: Ref,
  self: any,
  source: any,
  owner: any,
  props: Props,
): ReactElementType {
  return { $$typeof: REACT_ELEMENT_TYPE, type, key, ref, props, _owner: owner };
};

// createElement()：经典运行时入口，children 通过第三个及之后的参数传入，
// 单个 child 直接赋值，多个 child 收集成数组，都挂到 props.children 上
export function createElement(
  type: ElementType,
  config: any,
  ...children: any[]
): ReactElementType {
  let propName: string;
  const props: Props = {};
  let key: Key = null;
  let ref: Ref = null;

  if (config != null) {
    if (config.ref !== undefined) ref = config.ref;
    if (config.key !== undefined) key = "" + config.key;

    for (propName in config) {
      if (
        Object.prototype.hasOwnProperty.call(config, propName) &&
        !RESERVED_PROPS.hasOwnProperty(propName)
      ) {
        props[propName] = config[propName];
      }
    }
  }

  const childrenLength = children.length;
  if (childrenLength === 1) {
    props.children = children[0];
  } else if (childrenLength > 1) {
    props.children = children;
  }

  return ReactElement(type, key, ref, null, null, ReactCurrentOwner.current, props);
}

// isValidElement()：只看 $$typeof，不用 instanceof
export function isValidElement(object: any): boolean {
  return (
    typeof object === "object" &&
    object !== null &&
    object.$$typeof === REACT_ELEMENT_TYPE
  );
}
```

**packages/react/src/jsx/ReactJSXElement.ts**（babel automatic runtime 实际用到的 `jsx()`/`jsxDEV()`，是官方源码里对 `ReactElement.ts` 的历史遗留拷贝——两份实现几乎相同，唯一区别是这里通过 `ReactSharedInternals.ReactCurrentOwner` 取 owner，为跨包共享单例；节选主链路）

```typescript
import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import type { ElementType, Key, Props, Ref } from "shared/ReactTypes";
import ReactSharedInternals from "../ReactSharedInternals";

const ReactCurrentOwner = ReactSharedInternals.ReactCurrentOwner;
const RESERVED_PROPS = { key: true, ref: true, __self: true, __source: true };

// jsx() - automatic runtime 生产环境入口
export function jsx(type: ElementType, config: any, maybeKey?: Key) {
  let propName: string;
  const props: Props = {};
  let key: Key = null;
  let ref: Ref = null;

  if (maybeKey !== undefined) key = "" + maybeKey;
  if (config.key !== undefined) key = "" + config.key;
  if (config.ref !== undefined) ref = config.ref;

  for (propName in config) {
    if (
      Object.prototype.hasOwnProperty.call(config, propName) &&
      !RESERVED_PROPS.hasOwnProperty(propName)
    ) {
      props[propName] = config[propName];
    }
  }

  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
    _owner: ReactCurrentOwner.current,
  };
}
```

**packages/react/src/jsx/ReactJSX.ts**（统一分发 `jsx`/`jsxs`/`jsxDEV`，供两个独立入口引用）

```typescript
import { REACT_FRAGMENT_TYPE } from "shared/ReactSymbols";
import { jsx as jsxProd, jsxDEV as jsxDEVImpl } from "./ReactJSXElement";

const jsx = jsxProd;
const jsxs = jsxProd; // jsxs 理论上可对静态 children 做特殊优化，目前产出与 jsx 完全相同
const jsxDEV = __DEV__ ? jsxDEVImpl : undefined;

export { REACT_FRAGMENT_TYPE as Fragment, jsx, jsxs, jsxDEV };
```

**packages/react/src/jsx-runtime.ts / jsx-dev-runtime.ts**（对应 Babel `automatic` 转换模式生成的两个独立导入路径）

```typescript
// jsx-runtime.ts（生产）
export { Fragment, jsx, jsxs } from "./jsx/ReactJSX";

// jsx-dev-runtime.ts（开发）
export { Fragment, jsxDEV } from "./jsx/ReactJSX";
```

`react/src/index.ts` 只导出经典入口 `createElement`/`isValidElement`——`jsx`/`jsxDEV` 已经拆到上面两个独立子路径入口，不再从主入口导出。

---

### 4. packages/react-reconciler —— Fiber 数据结构与 WorkTag

这是主线里最核心的一块：把 ReactElement 转换成 Fiber 节点，构建出可中断遍历的链表树。

**packages/react-reconciler/src/ReactWorkTags.ts**（用数字常量标识 Fiber 对应的组件类型，beginWork/completeWork 按 tag 分发）

```typescript
export type WorkTag = number;

export const FunctionComponent = 0;
export const ClassComponent = 1;
export const IndeterminateComponent = 2; // 还不确定是函数组件还是 class 组件（挂载时用）
export const HostRoot = 3;
export const HostPortal = 4;
export const HostComponent = 5;
export const HostText = 6;
export const Fragment = 7;
export const Mode = 8;
```

**packages/react-reconciler/src/ReactFiberFlags.ts**（副作用标记位掩码，主链路用到的子集）

```typescript
export type Flags = number;

export const NoFlags = /*         */ 0b00000000000000000000000000;
export const PerformedWork = /*   */ 0b00000000000000000000000001;
export const Placement = /*       */ 0b00000000000000000000000010;
export const Update = /*          */ 0b00000000000000000000000100;
export const ChildDeletion = /*   */ 0b00000000000000000000010000;

// commit 各阶段用来跳过不含对应 effect 子树的掩码
export const MutationMask = Placement | Update | ChildDeletion;
```

**packages/react-reconciler/src/ReactFiber.ts**（FiberNode 数据结构 + 双缓存核心 `createWorkInProgress`，对照「二、1」「二、4」节讲的字段与双缓存机制）

```typescript
import { NoFlags, StaticMask, type Flags } from "./ReactFiberFlags";
import { NoLanes, type Lanes } from "./ReactFiberLane";
import { NoMode, type TypeOfMode } from "./ReactTypeOfMode";
import { type WorkTag } from "./ReactWorkTags";

export class FiberNode {
  tag: WorkTag;
  key: any;
  elementType: any; // 未解析前的元素类型（可能被 lazy 等包装）
  type: any;        // 解析后的类型
  stateNode: any;    // 宿主节点对应真实 DOM 元素，类组件对应组件实例

  return: FiberNode | null;
  child: FiberNode | null;
  sibling: FiberNode | null;
  index: number;

  ref: any;

  pendingProps: any;
  memoizedProps: any;
  updateQueue: any;
  memoizedState: any;

  mode: TypeOfMode;

  flags: Flags;
  subtreeFlags: Flags; // 子树中所有 flags 的汇总（bubbleProperties 阶段收集）
  deletions: FiberNode[] | null;

  lanes: Lanes;
  childLanes: Lanes;

  alternate: FiberNode | null; // current 树和 workInProgress 树互相指向

  constructor(tag: WorkTag, pendingProps: any, key: any, mode: TypeOfMode) {
    this.tag = tag;
    this.key = key;
    this.elementType = null;
    this.type = null;
    this.stateNode = null;

    this.return = null;
    this.child = null;
    this.sibling = null;
    this.index = 0;

    this.ref = null;

    this.pendingProps = pendingProps;
    this.memoizedProps = null;
    this.updateQueue = null;
    this.memoizedState = null;

    this.mode = mode;

    this.flags = NoFlags;
    this.subtreeFlags = NoFlags;
    this.deletions = null;

    this.lanes = NoLanes;
    this.childLanes = NoLanes;

    this.alternate = null;
  }
}

export function createFiber(
  tag: WorkTag,
  pendingProps: any,
  key: any,
  mode: TypeOfMode = NoMode,
): FiberNode {
  return new FiberNode(tag, pendingProps, key, mode);
}

// 双缓存（double buffering）核心：一棵树最多只有两个版本，current 和 workInProgress
// 互为 alternate。首次更新时惰性新建 alternate，之后复用同一个 alternate 对象并重置其
// 字段，避免为从不更新的节点反复分配对象。
export function createWorkInProgress(current: FiberNode, pendingProps: any): FiberNode {
  let workInProgress = current.alternate;
  if (workInProgress === null) {
    // 惰性创建：只在第一次更新时分配 alternate
    workInProgress = createFiber(current.tag, pendingProps, current.key, current.mode);
    workInProgress.elementType = current.elementType;
    workInProgress.type = current.type;
    workInProgress.stateNode = current.stateNode;

    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    workInProgress.pendingProps = pendingProps;
    workInProgress.type = current.type;
    workInProgress.flags = NoFlags;
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.deletions = null;
  }

  // 重置除静态标记外的所有 effect
  workInProgress.flags = current.flags & StaticMask;
  workInProgress.childLanes = current.childLanes;
  workInProgress.lanes = current.lanes;

  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;

  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  workInProgress.ref = current.ref;

  return workInProgress;
}
```

根据 `ReactElement` 创建对应 Fiber 的 `createFiberFromElement`/`createFiberFromTypeAndProps`、Fragment/文本节点的构造函数等辅助函数，逐行对照见仓库 `packages/react-reconciler/src/ReactFiber.ts` 全文（294 行）。

---

### 5. beginWork —— "递"阶段：按 tag 分发 + reconcile 出子 Fiber

`beginWork` 是主线的第一站：拿到当前 Fiber，判断要不要 bailout（跳过不必要的重渲染），再按 `tag` 分发到不同的 `update*` 函数，最终产出子 Fiber 交给 workLoop 继续往下走。

**packages/react-reconciler/src/ReactFiberBeginWork.ts**（贴出分发主入口 + 函数组件/HostComponent 两个最常用分支，完整文件含 HostRoot/Fragment/Mode/bailout 逻辑，326 行）

```typescript
import { cloneChildFibers, mountChildFibers, reconcileChildFibers } from "./ReactChildFiber";
import type { FiberNode } from "./ReactFiber";
import { DidCapture, NoFlags, PerformedWork } from "./ReactFiberFlags";
import { NoLanes, includesSomeLane, type Lanes } from "./ReactFiberLane";
import {
  Fragment, FunctionComponent, HostComponent, HostRoot, HostText,
  IndeterminateComponent, Mode,
} from "./ReactWorkTags";

// 本次 beginWork 是否接收到了新的 props/state/context，决定函数组件是 bailout 还是继续 reconcile
let didReceiveUpdate = false;

export function reconcileChildren(
  current: FiberNode | null,
  workInProgress: FiberNode,
  nextChildren: any,
  renderLanes: Lanes,
): void {
  if (current === null) {
    // 全新组件：mountChildFibers 不标记副作用（父 fiber 自身已是 Placement，
    // commit 阶段只挂顶层节点即可）
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren, renderLanes);
  } else {
    // 复用/更新：标记 Placement/ChildDeletion
    workInProgress.child = reconcileChildFibers(workInProgress, current.child, nextChildren, renderLanes);
  }
}

// renderWithHooks 简化实现：直接调用函数组件拿 children（Phase 5 接入 hooks 时会替换为
// 真正实现：切换 Dispatcher、建立 Hook 链表）
function renderWithHooks(_current: FiberNode | null, _wip: FiberNode, Component: any, props: any): any {
  return Component(props);
}

function updateFunctionComponent(
  current: FiberNode | null,
  workInProgress: FiberNode,
  Component: any,
  nextProps: any,
  renderLanes: Lanes,
): FiberNode | null {
  const nextChildren = renderWithHooks(current, workInProgress, Component, nextProps);

  if (current !== null && !didReceiveUpdate) {
    // 没有新的 props/state，children 不变，bailout
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  }

  workInProgress.flags |= PerformedWork;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function updateHostComponent(
  current: FiberNode | null,
  workInProgress: FiberNode,
  renderLanes: Lanes,
): FiberNode | null {
  const nextProps = workInProgress.pendingProps;
  const nextChildren = nextProps.children;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function beginWork(
  current: FiberNode | null,
  workInProgress: FiberNode,
  renderLanes: Lanes,
): FiberNode | null {
  if (current !== null) {
    const oldProps = current.memoizedProps;
    const newProps = workInProgress.pendingProps;
    if (oldProps !== newProps) {
      didReceiveUpdate = true;
    } else {
      // props 没变，检查是否有待处理的更新（childLanes 里有没有本次 renderLanes）
      const hasScheduledUpdateOrContext = includesSomeLane(current.lanes, renderLanes);
      if (!hasScheduledUpdateOrContext && (workInProgress.flags & DidCapture) === NoFlags) {
        didReceiveUpdate = false;
        // early bailout：克隆子 fiber 继续向下，不重新执行组件函数
        return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
      }
      didReceiveUpdate = false;
    }
  } else {
    didReceiveUpdate = false;
  }

  workInProgress.lanes = NoLanes; // 进入 begin 阶段前清空待处理优先级

  switch (workInProgress.tag) {
    case FunctionComponent: {
      const Component = workInProgress.type;
      return updateFunctionComponent(current, workInProgress, Component, workInProgress.pendingProps, renderLanes);
    }
    case HostRoot:
      return updateHostRoot(current, workInProgress, renderLanes);
    case HostComponent:
      return updateHostComponent(current, workInProgress, renderLanes);
    case HostText:
      return null; // 文本节点是终态，没有 children
    case Fragment:
    case Mode: {
      const nextChildren = workInProgress.pendingProps.children ?? workInProgress.pendingProps;
      reconcileChildren(current, workInProgress, nextChildren, renderLanes);
      return workInProgress.child;
    }
  }

  throw new Error(`Unknown unit of work tag (${workInProgress.tag}).`);
}
```

`bailoutOnAlreadyFinishedWork` 是 bailout 优化的核心：如果子树也没有待处理的工作（`!includesSomeLane(renderLanes, workInProgress.childLanes)`），整棵子树直接跳过，不再往下遍历——这正是「二、1」节双缓存收益一节提到的"props/state 没变可以直接复用节点"在源码层面的体现。`updateHostRoot` 负责从 `HostRoot` fiber 的 `updateQueue` 里取出本次要渲染的顶层元素（`processUpdateQueue` 计算出的 `memoizedState.element`），这一步是 `createRoot(container).render(<App/>)` 调用链路上，ReactElement 第一次真正进入 Fiber 树构建的入口。完整实现见仓库文件。

---

### 6. ReactChildFiber —— 单节点/文本节点场景的子 Fiber 构建

`reconcileChildren` 内部真正做"用新 children 生成子 Fiber"的是 `ChildReconciler` 工厂产出的 `reconcileChildFibers`（更新场景，标记副作用）与 `mountChildFibers`（挂载场景，不标记副作用）。完整的多节点数组 diff 算法（三阶段：头部 slot 匹配 → 快路径 → Map 查找）属于第 04 篇 Diff 算法的范畴，这里只贴与本篇主线相关的单元素/文本节点路径和总入口：

```typescript
// packages/react-reconciler/src/ReactChildFiber.ts（节选）
function ChildReconciler(shouldTrackSideEffects: boolean) {
  // 复用旧 fiber 作为 workInProgress：clone 出 alternate，并把 sibling/index 归零
  function useFiber(fiber: FiberNode, pendingProps: any): FiberNode {
    const clone = createWorkInProgress(fiber, pendingProps);
    clone.index = 0;
    clone.sibling = null;
    return clone;
  }

  function placeSingleChild(newFiber: FiberNode): FiberNode {
    // 单节点场景只需给新建节点打 Placement（挂载场景整棵子树跟着父节点一起插入，不用逐个标）
    if (shouldTrackSideEffects && newFiber.alternate === null) {
      newFiber.flags |= Placement;
    }
    return newFiber;
  }

  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    element: any,
    lanes: Lanes,
  ): FiberNode {
    const key = element.key;
    let child = currentFirstChild;
    while (child !== null) {
      if (child.key === key) {
        if (child.elementType === element.type) {
          // key 与 type 都相同：复用旧 fiber，删除多余的兄弟节点
          deleteRemainingChildren(returnFiber, child.sibling);
          const existing = useFiber(child, element.props);
          existing.ref = element.ref;
          existing.return = returnFiber;
          return existing;
        }
        // key 相同但 type 不同，删掉它及后面的兄弟
        deleteRemainingChildren(returnFiber, child);
        break;
      } else {
        deleteChild(returnFiber, child);
      }
      child = child.sibling;
    }
    // 没找到可复用的，新建
    const created = createFiberFromElement(element, returnFiber.mode, lanes);
    created.ref = element.ref;
    created.return = returnFiber;
    return created;
  }

  // 入口：根据 newChild 的形态分发到单元素/单文本/数组三种协调器
  function reconcileChildFibers(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    newChild: any,
    lanes: Lanes,
  ): FiberNode | null {
    if (isReactElement(newChild)) {
      return placeSingleChild(reconcileSingleElement(returnFiber, currentFirstChild, newChild, lanes));
    }
    if (Array.isArray(newChild)) {
      return reconcileChildrenArray(returnFiber, currentFirstChild, newChild, lanes); // 见第 04 篇
    }
    if (typeof newChild === "string" || typeof newChild === "number") {
      return placeSingleChild(reconcileSingleTextNode(returnFiber, currentFirstChild, "" + newChild, lanes));
    }
    return deleteRemainingChildren(returnFiber, currentFirstChild);
  }

  return reconcileChildFibers;
}

export const reconcileChildFibers = ChildReconciler(true);
export const mountChildFibers = ChildReconciler(false);
```

---

### 7. completeWork —— "归"阶段：创建真实 DOM 实例 + 副作用冒泡

`beginWork` 往下走到叶子节点后，`completeWork` 开始自底向上"归"，做两件事：给 `HostComponent`/`HostText` 创建真实的 DOM 实例（挂到 `fiber.stateNode`），以及把子树的 `flags` 冒泡汇总到父节点的 `subtreeFlags`（对照「二、8」节讲的 `effectList` → `subtreeFlags` 演进）。

```typescript
// packages/react-reconciler/src/ReactFiberCompleteWork.ts（节选主链路）
import {
  appendInitialChild, createInstance, createTextInstance,
  getHostContext, getRootHostContainer, prepareUpdate,
} from "./ReactFiberHostConfig";

function markUpdate(workInProgress: FiberNode): void {
  workInProgress.flags |= Update; // 打 Update 标记：让 Placement 变成 PlacementAndUpdate
}

// 深度优先把子树里所有 HostComponent/HostText 的 stateNode append 到父节点，
// 完成真实 DOM 树的组装（子节点的真实 DOM 已经在各自的 completeWork 里创建好）
function appendAllChildren(parent: any, workInProgress: FiberNode): void {
  let node = workInProgress.child;
  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node.stateNode);
    } else if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }
    if (node === workInProgress) return;
    while (node.sibling === null) {
      if (node.return === null || node.return === workInProgress) return;
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
}

// 把子树的 flags/lanes 汇总到父节点，同时把子树里最早的优先级冒泡到 childLanes
function bubbleProperties(completedWork: FiberNode): void {
  let subtreeFlags = NoFlags;
  let child = completedWork.child;
  while (child !== null) {
    subtreeFlags |= child.subtreeFlags;
    subtreeFlags |= child.flags;
    child.return = completedWork;
    child = child.sibling;
  }
  completedWork.subtreeFlags |= subtreeFlags;
}

function completeWork(
  current: FiberNode | null,
  workInProgress: FiberNode,
  _renderLanes: Lanes,
): FiberNode | null {
  const newProps = workInProgress.pendingProps;

  switch (workInProgress.tag) {
    case FunctionComponent:
    case Fragment:
    case HostRoot:
      bubbleProperties(workInProgress);
      return null;

    case HostComponent: {
      const type = workInProgress.type;
      if (current !== null && workInProgress.stateNode != null) {
        // 更新：对比新旧 props，产出 updatePayload
        const updatePayload = prepareUpdate(
          workInProgress.stateNode, type, current.memoizedProps, newProps,
          getRootHostContainer(), getHostContext(),
        );
        workInProgress.updateQueue = updatePayload;
        if (updatePayload) markUpdate(workInProgress);
      } else {
        // 挂载：创建真实 DOM 元素，把已完成的子节点 DOM 挂上去
        const instance = createInstance(type, newProps, getRootHostContainer(), getHostContext(), workInProgress);
        appendAllChildren(instance, workInProgress);
        workInProgress.stateNode = instance;
      }
      bubbleProperties(workInProgress);
      return null;
    }

    case HostText: {
      const newText = newProps;
      if (current !== null && workInProgress.stateNode != null) {
        if (current.memoizedProps !== newText) markUpdate(workInProgress);
      } else {
        workInProgress.stateNode = createTextInstance(newText, getRootHostContainer(), getHostContext(), workInProgress);
      }
      bubbleProperties(workInProgress);
      return null;
    }
  }

  throw new Error(`Unknown unit of work tag (${workInProgress.tag}).`);
}
```

`createInstance`/`createTextInstance`/`appendInitialChild`/`prepareUpdate` 是 reconciler 通过 `ReactFiberHostConfig` 这层接口调用的——真正的实现在 `react-dom` 包里（见第 9 节），reconciler 本身对这些接口一无所知，这正是「二、7」节讲的 Host Config 解耦设计在主链路上的落地。

---

### 8. ReactFiberReconciler —— createContainer/updateContainer（渲染器调用 reconciler 的入口）

`react-dom` 的 `createRoot` 不直接操作 Fiber，而是调用 reconciler 对外暴露的 `createContainer`/`updateContainer`，这是渲染器与协调算法之间唯一的调用边界（对照「二、7」节包职责划分）：

```typescript
// packages/react-reconciler/src/ReactFiberReconciler.ts（节选）
export function createContainer(containerInfo: any, tag: RootTag): FiberRootNode {
  return createFiberRoot(containerInfo, tag, null);
}

export function updateContainer(
  element: any,
  container: FiberRootNode,
  callback?: (() => void) | null,
): Lane {
  const current: FiberNode = container.current;
  const eventTime = requestEventTime();
  const lane = requestUpdateLane(current);

  const update = createUpdate(eventTime, lane);
  // DevTools 依赖这个字段名叫 "element"
  update.payload = { element };

  const root = enqueueUpdate(current, update, lane);
  if (root !== null) {
    scheduleUpdateOnFiber(root, current, lane, eventTime);
  }

  return lane;
}
```

`updateContainer` 把新的 ReactElement 包成一个 `Update` 对象塞进 `HostRoot` fiber 的更新队列（`enqueueUpdate`，Lane 优先级细节见第 02 篇），然后调用 `scheduleUpdateOnFiber` 触发调度——这一步之后就进入本篇「三、4」节贴过的 `ReactFiberWorkLoop.ts` 主链路。

**packages/react-dom/src/client/ReactDOMClient.ts**（createRoot 的真实实现，只有 12 行）

```typescript
import { createContainer } from "react-reconciler/src/ReactFiberReconciler";
import { ConcurrentRoot } from "react-reconciler/src/ReactRootTags";
import { setRootHostContainer } from "./ReactDOMHostConfig";
import { ReactDOMRoot } from "./ReactDOMRoot";

export function createRoot(container: Element, _options?: unknown): ReactDOMRoot {
  setRootHostContainer(container); // 记下根容器，getRootHostContainer() 会返回它
  const root = createContainer(container, ConcurrentRoot);
  return new ReactDOMRoot(root);
}
```

**packages/react-dom/src/client/ReactDOMRoot.ts**（`render` 只是薄薄一层，转发给 `updateContainer`）

```typescript
import { updateContainer } from "react-reconciler/src/ReactFiberReconciler";
import type { FiberRootNode } from "react-reconciler/src/ReactFiberRoot";

export class ReactDOMRoot {
  _internalRoot: FiberRootNode;

  constructor(root: FiberRootNode) {
    this._internalRoot = root;
  }

  render(children: any): void {
    updateContainer(children, this._internalRoot);
  }
}
```

---

### 9. ReactDOMHostConfig —— react-dom 对 Host Config 接口的真实实现

第三节「三、5」讲的 Host Config 约定，在这个项目里由 `react-dom` 实现，构建时通过 fork（rollup 插件 / vite `resolveId`）把这份实现替换进 reconciler 里只会 `throw` 的占位模块 `ReactFiberHostConfig.ts`。下面贴主链路用到的几个方法（属性处理只做 `className`/`style`/普通字符串属性的简版，事件系统留给第 08 篇）：

```typescript
// packages/react-dom/src/client/ReactDOMHostConfig.ts（节选）
function setProp(domElement: Element, propKey: string, value: any): void {
  if (typeof value === "function") return; // 事件处理器：事件系统尚未实现，先忽略
  if (propKey === "style" && typeof value === "object" && value !== null) {
    const style = (domElement as HTMLElement).style;
    for (const styleName in value) style.setProperty(styleName, value[styleName]);
    return;
  }
  if (propKey === "className") {
    domElement.className = value == null ? "" : String(value);
    return;
  }
  domElement.setAttribute(propKey, String(value));
}

let rootContainer: Element = document.documentElement;
export function setRootHostContainer(container: Element): void {
  rootContainer = container;
}
export function getRootHostContainer(): Element {
  return rootContainer;
}

export function createInstance(type: string, props: Record<string, any>): Element {
  const domElement = document.createElement(type);
  for (const propKey in props) {
    if (propKey !== "children") setProp(domElement, propKey, props[propKey]);
  }
  return domElement;
}

export function createTextInstance(text: string): Text {
  return document.createTextNode(text);
}

export function appendInitialChild(parentInstance: Element, child: Element | Text): void {
  parentInstance.appendChild(child);
}

export function appendChildToContainer(container: Element, child: Element | Text): void {
  container.appendChild(child);
}

export function commitUpdate(instance: Element, updatePayload: any[]): void {
  // updatePayload 是 [key1, value1, key2, value2, ...] 的扁平数组
  for (let i = 0; i < updatePayload.length; i += 2) {
    setProp(instance, updatePayload[i], updatePayload[i + 1]);
  }
}

export function commitTextUpdate(textInstance: Text, _oldText: string, newText: string): void {
  textInstance.nodeValue = newText;
}
```

commit 阶段真正调用这些方法的是 `commitMutationEffects`（`packages/react-reconciler/src/ReactFiberCommitWork.ts`），按 Fiber 的 `flags` 分发到 `commitPlacement`（插入/移动）、`commitUpdate`（更新属性）、`commitDeletionEffects`（删除）三类操作，遍历时用 `subtreeFlags & MutationMask` 剪枝跳过没有副作用的子树——这正是「二、8」节讲的 `subtreeFlags` 冒泡在 commit 遍历时发挥作用的地方。完整实现（395 行，含 `getHostSibling` 找插入锚点、递归收集删除子树等）见仓库 `ReactFiberCommitWork.ts`。

---

### 10. fixtures —— 用真实 Vite 环境跑通 JSX → 渲染全链路

这个项目不用 npm 包发布再安装的方式验证，而是用 `fixtures/` 目录 + Vite `resolve.alias`/`resolveId` 直接把裸导入（`react`、`react-dom/client`、`react-reconciler` 等）指向 `packages/*/src` 下的 TypeScript 源码，改代码保存即可热更新，不需要每次 `pnpm build`：

```typescript
// scripts/vite/vite.config.mts（节选，完整版含 HostConfig fork 插件见仓库文件）
export default defineConfig({
  root: path.resolve(rootDir, "fixtures"),
  plugins: [react()],
  define: { __DEV__: JSON.stringify(true) },
  resolve: {
    alias: [
      { find: /^react$/, replacement: path.resolve(rootDir, "packages/react/src/index.ts") },
      { find: "react-dom/client", replacement: path.resolve(rootDir, "packages/react-dom/client.ts") },
      { find: /^react-reconciler$/, replacement: path.resolve(rootDir, "packages/react-reconciler/index.ts") },
      { find: /^scheduler$/, replacement: path.resolve(rootDir, "packages/scheduler/index.ts") },
      // ...jsx-runtime / shared / 各子路径映射，见仓库文件
    ],
  },
});
```

真正跑通 JSX → 渲染主链路的 demo 是 `fixtures/main.tsx`：

```tsx
// fixtures/main.tsx
import { createRoot } from "react-dom/client";
import App from "./jsx/index";
import DomComp from "./dom/index";

const root = createRoot(document.getElementById("root")!);
root.render(
  <>
    <App />
    <DomComp stage={10} />
  </>,
);
```

`App`/`DomComp` 就是普通的函数组件，写在 `fixtures/jsx/index.tsx`：

```tsx
function App() {
  return <div class="jsx">JSX Demo</div>;
}
export default App;
```

`fixtures/dom/index.tsx` 验证了 props 透传和多层嵌套：

```tsx
const DomComp = (props: any) => {
  return (
    <div className="demo">
      <h1>Reconciler Demo</h1>
      <p>stage {props.stage}</p>
    </div>
  );
};
export default DomComp;
```

**运行方式**（真实存在的命令，取自根目录 `package.json`）

```bash
pnpm install
pnpm dev   # vite --config scripts/vite/vite.config.mts，浏览器访问 http://localhost:5173
```

浏览器打开后能看到页面渲染出 `App`（`<div class="jsx">JSX Demo</div>`）和 `DomComp`（`<div className="demo"><h1>Reconciler Demo</h1><p>stage 10</p></div>`）两块内容，这背后完整走过了本篇的主线：

```
<App /> / <DomComp stage={10} />（JSX）
  → jsx()（packages/react/src/jsx/ReactJSXElement.ts）产出 ReactElement
    → root.render(...) → updateContainer → enqueueUpdate → scheduleUpdateOnFiber
      → ensureRootIsScheduled → performConcurrentWorkOnRoot（走 scheduler 的时间切片）
        → workLoopConcurrent → beginWork（按 tag 分发，reconcile 出子 Fiber）
          → completeWork（createInstance 建真实 DOM，bubbleProperties 冒泡 flags）
            → commitRoot → commitMutationEffects（真正把 DOM 插入到 #root 容器）
```

在 Chrome DevTools 的 Elements 面板能直接看到 `#root` 下真实生成的 `<div class="jsx">`/`<div class="demo">` 结构，在 Sources 面板可以对 `beginWork`/`completeWork`/`commitMutationEffectsOnFiber` 打断点，单步走一遍验证上面这条链路——这正是「一、3」节讲的源码调试方法在这个手写实现上的应用（区别是调试对象从官方 `react-reconciler` 换成了这份 1:1 还原的本地实现）。

---

### 11. 构建配置：rollup + 多 bundle 类型

生产构建（`pnpm build`）用 Rollup，`scripts/rollup/bundles.js` 里为每个可独立发布的包登记一条描述，`build.js` 据此批量打包成 `NODE_DEV`/`NODE_PROD`（cjs）或 `UMD_DEV`/`UMD_PROD`（iife）产物：

```javascript
// scripts/rollup/bundles.js（节选）
const bundles = [
  {
    packageName: "react",
    entry: "packages/react/src/index.ts",
    global: "React", // UMD 挂载到 window.React 时用的名字
    bundleTypes: [bundleTypes.NODE_DEV, bundleTypes.NODE_PROD, bundleTypes.UMD_DEV, bundleTypes.UMD_PROD],
  },
  {
    packageName: "react-reconciler",
    entry: "packages/react-reconciler/index.ts",
    externals: ["react", "scheduler"], // reconciler 不把 react/scheduler 打进自己的产物
    bundleTypes: [bundleTypes.NODE_DEV, bundleTypes.NODE_PROD],
  },
  {
    packageName: "react-dom",
    entry: "packages/react-dom/index.ts",
    // react-dom 只把 react/scheduler 作为 external，reconciler/shared 都 inline 进产物
    externals: ["react", "scheduler"],
    bundleTypes: [bundleTypes.NODE_DEV, bundleTypes.NODE_PROD],
  },
];
```

每个包的 `package.json` 通过 `exports` 字段把子路径入口指向构建产物，比如 `react` 包：

```json
{
  "name": "react",
  "main": "npm/index.js",
  "exports": {
    ".": "./npm/index.js",
    "./jsx-runtime": "./npm/jsx-runtime.js",
    "./jsx-dev-runtime": "./npm/jsx-dev-runtime.js"
  }
}
```

这套 `exports` 结构和「一、3」节讲的官方 `react`/`react-dom` 包的子路径入口设计完全一致——`jsx-runtime`/`jsx-dev-runtime`/`client` 各自独立导出，不是全部塞进主入口。

---

> 💬 **面试官**：这份手写实现和真实 React 18 源码的主要区别在哪？
>
> ✅ **标准答案**：主链路（Fiber 结构、双缓存、Lane 模型、beginWork/completeWork/commit 三阶段、Host Config 解耦）逐文件对齐官方 React 18 源码，包结构、数据结构、函数签名、关键算法都是 1:1 还原，能直接在 Vite fixtures 里断点调试验证。当前边界是：单/多节点 diff 已实现但 Suspense/错误边界未接入，Hooks 只完成 `renderWithHooks` 骨架（尚未接入真正的 Hook 链表），Class 组件、事件系统、`hydrateRoot`、DevTools 协议等尚未搭建。
>
> 🎁 **加分答案**：官方源码里有大量"向后兼容旧版特性"的分支判断（Legacy Context、字符串 ref 自动转换等），这份实现按渲染链路的自然顺序（`createElement → Fiber 树构建 → 调度 → commit → hooks`）渐进搭建、不提前铺抽象，CLAUDE.md 里明确写了"不做官方没有的抽象"的开发约定，这也是为什么读这份代码比读官方仓库更容易抓住"React 18 主线到底长什么样"。

---

## 五、手写实现源码地址

- GitHub：https://github.com/lotosv2010/react-source
- 本地路径：`D:\github\react-source`（详细目录结构与开发约定见仓库 `README.md`/`CLAUDE.md`）

---

## 六、参考资料

- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com
- https://github.com/wbccb/mini-react

---

## 💡 面试核心问

- **为什么 React 15 要重构成 Fiber？Fiber 具体解决了什么问题？**
- **Fiber 链表结构和可中断渲染之间是什么关系？**
- **concurrent 渲染和 legacy 渲染在调用方式和调度行为上分别有什么核心区别？**
- **react-reconciler 为什么要独立成一个不依赖具体渲染平台的包？如果让你给 React 写一个 Canvas 渲染器，大致需要实现哪些接口？**
- **本地怎么调试 React 源码？为什么业务项目里直接改 node_modules 里的 React 源码不是一个好的调试方式？**

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话核心 | 面试考察频率 |
|--------|-----------|-------------|
| `createRoot` vs `ReactDOM.render` | Concurrent 模式 vs Legacy 模式，渲染引擎工作方式的切换，非简单改名 | ⭐⭐⭐⭐⭐ |
| 自动批处理 | React 18 把批处理范围从"仅 React 事件内"扩展到所有场景 | ⭐⭐⭐⭐ |
| `<StrictMode>` 执行两次 | 开发环境暴露渲染不纯问题，为并发模式的"中途重来"做铺垫 | ⭐⭐⭐ |
| `startTransition` | 标记低优先级更新，渲染过程可被打断，区别于 `setTimeout` 的延迟执行 | ⭐⭐⭐⭐⭐ |
| `Suspense` 挂起机制 | 组件 `throw` Promise，React 捕获后渲染 `fallback`，resolve 后重新渲染 | ⭐⭐⭐⭐ |
| Stack Reconciler 死结 | 递归调用栈一旦开始无法让出主线程，大树渲染会阻塞高优先级任务 | ⭐⭐⭐⭐⭐ |
| Fiber 链表化 | `child/sibling/return` 指针 + 循环遍历，替代递归，随时可暂停恢复 | ⭐⭐⭐⭐⭐ |
| Fiber 节点数据结构 | 不只是链表指针，还承载 props/state/updateQueue/flags/lanes 等渲染信息 | ⭐⭐⭐⭐ |
| 双缓存技术 | current 树与 workInProgress 树通过 `alternate` 互联，渲染完成后整体切换指针 | ⭐⭐⭐⭐⭐ |
| Lane 模型 | 31 位二进制表达优先级，位运算支持多优先级合并处理 | ⭐⭐⭐⭐ |
| 时间切片 | `scheduler` 包的 `shouldYieldToHost()` 判断是否让出主线程 | ⭐⭐⭐⭐ |
| 包职责划分 | react/scheduler/react-reconciler/react-dom 各管一层，自底向上无循环依赖 | ⭐⭐⭐⭐⭐ |
| effectList → subtreeFlags | React 18 用位运算冒泡代替独立链表收集副作用节点 | ⭐⭐⭐ |
| Vue 3 vs React 优化路线 | 编译时标记动态节点 vs 运行时 Fiber+Lane 启发式调度，两种取舍 | ⭐⭐⭐⭐ |
| `react-reconciler` 解耦 | 协调算法与渲染平台分离，实现 Host Config 即可接入任意平台 | ⭐⭐⭐⭐⭐ |

---

## 📝 思考题

**留个问题**：本篇「二」节讲到，渲染时会优先复用 `current` 树上 Fiber 节点的 `alternate` 指向的对象，而不是每次都创建新的 Fiber 节点。如果某个组件在本次渲染中被判定需要"bailout"（props/state 都没变化，可以完全跳过更新），它对应的 Fiber 节点在 `workInProgress` 树上会是一个新对象，还是直接复用 `current` 树上的旧对象？结合双缓存的 `alternate` 机制说说你的分析过程。

答案留在评论区，或者在第 03 篇渲染原理篇会详细展开。

---

> 🔖 这是「React 18 全家桶深度拆解系列」第 1 篇。下一篇预告：《React 18 状态更新: Update 双轨链表与 Lane 优先级模型深度拆解（面试收藏级）》

