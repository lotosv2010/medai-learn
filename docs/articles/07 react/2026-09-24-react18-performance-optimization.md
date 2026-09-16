# React 18 性能优化: memo/useMemo/虚拟列表与 React Compiler（生产收藏级）

> **副标题**：bailout 机制应用、虚拟列表原理、系统化排查方法论、React Compiler 未来方向

---

## 🎯 这篇文章解决什么问题

上一篇讲完流式 SSR 和 RSC，面试官往往会把话题收回到最贴近日常开发的场景：**你在项目里具体是怎么做性能优化的，能不能讲一个真实案例？**

这个问题最容易翻车的地方，不是"不知道有哪些 API"——`memo`、`useMemo`、`useCallback`、虚拟列表这些名词大多数人都能说出来，翻车的是"讲不出配合关系"：`useCallback` 包裹的函数如果没有配合 `memo`，包了也没用；虚拟列表如果不理解"只渲染可视区域"这个核心，遇到不定高度列表就写不出来；`useDeferredValue` 和 `debounce` 到底是不是一回事，很多人其实没有想清楚。更进一步，面试官追问"你怎么系统性地排查一个 React 性能问题"，大部分人给出的是"用 memo 包一下""看看有没有不必要的重渲染"这类零散经验，说不出一套可复用的方法论。

这一篇要讲透的，是这几个优化手段各自解决的具体问题、它们在源码层面的判断逻辑，以及一套"先定位、再决定用哪种手段"的系统化排查流程。读完之后，你会同时获得两种确定感：**懂原理**（`memo` 的 bailout 判断、虚拟列表的可视区域计算、`lazy` 的挂起机制分别是怎么工作的）和**会讲**（面试官任何一个角度追问，都能拆解回答，还能讲出"当时怎么用 Profiler 一步步定位到问题"的真实案例）。

---

## 一、使用与实践

### 1. React.memo/useMemo/useCallback：三件套怎么配合

先复现一个最常见的"优化了但没生效"的场景：处方单列表页里，父组件维护搜索关键字状态，子组件 `DrugRow` 渲染每一条药品。

```jsx
function PrescriptionList({ drugs }) {
  const [keyword, setKeyword] = useState('')

  // 👈 每次 PrescriptionList 渲染，这是一个新函数引用
  const handleSelect = (id) => {
    console.log('选中药品', id)
  }

  return (
    <div>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      {drugs.map((drug) => (
        <DrugRow key={drug.id} drug={drug} onSelect={handleSelect} />
      ))}
    </div>
  )
}

const DrugRow = React.memo(function DrugRow({ drug, onSelect }) {
  console.log('DrugRow render', drug.id)
  return <div onClick={() => onSelect(drug.id)}>{drug.name}</div>
})
```

即使给 `DrugRow` 包了 `React.memo`，输入框每次按键，所有 `DrugRow` 依然会重新渲染。原因很直接：`handleSelect` 是在 `PrescriptionList` 函数体内定义的，每次渲染都会创建一个新的函数引用，`memo` 做的浅比较发现 `onSelect` 变了，判定 props 不相等，直接放弃了 bailout。

修复方式是用 `useCallback` 固定 `handleSelect` 的引用：

```jsx
function PrescriptionList({ drugs }) {
  const [keyword, setKeyword] = useState('')

  // 👈 只要依赖数组为空，引用在组件生命周期内保持稳定
  const handleSelect = useCallback((id) => {
    console.log('选中药品', id)
  }, [])

  return (
    <div>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      {drugs.map((drug) => (
        <DrugRow key={drug.id} drug={drug} onSelect={handleSelect} />
      ))}
    </div>
  )
}
```

这就是三件套的配合关系：`memo` 负责"props 没变就跳过渲染"，`useCallback`/`useMemo` 负责"确保传下去的函数/对象引用真的没变"——单独用其中一个，效果通常都会打折扣。`useMemo` 的场景类似，只是保护的是计算结果而不是函数引用：

```jsx
function PrescriptionSummary({ drugs }) {
  // 👈 drugs 不变时，不用每次渲染都重新算一遍统计
  const totalPrice = useMemo(() => {
    console.log('重新计算总价')
    return drugs.reduce((sum, d) => sum + d.price * d.count, 0)
  }, [drugs])

  return <div>合计：¥{totalPrice}</div>
}
```

> 💬 **面试官会问**：`memo`、`useMemo`、`useCallback` 三者各自解决什么问题？滥用会有什么代价？
>
> ✅ **标准答案**：`memo` 解决"父组件重渲染时子组件是否需要跟着重渲染"的问题，依据是对新旧 props 做浅比较；`useCallback` 解决"函数类型的 prop 每次渲染都是新引用，导致 `memo` 判断失效"的问题；`useMemo` 解决"某个计算量较大的值不希望每次渲染都重新计算"的问题。三者的滥用代价是一致的：浅比较、依赖数组比较本身也有开销，如果被优化的组件本来就渲染很轻，包一层 `memo`/`useMemo` 反而增加了额外的比较成本和心智负担，收益为负。
>
> 🎁 **加分答案**：`useCallback(fn, deps)` 本质上是 `useMemo(() => fn, deps)` 的语法糖，两者共用同一套依赖比较逻辑（`areHookInputsEqual`，源码见「三、源码解析」），区别只是返回值是函数本身还是函数的执行结果。

🔧 **真实案例**：处方单页面把"数量加减按钮"的 `onClick` 回调没有用 `useCallback` 包裹，导致每次输入搜索关键字，即使列表没有任何变化，几十个 `DrugRow` 全部重新渲染，Profiler 里能看到这些无意义的渲染耗时累积到几十毫秒。补上 `useCallback` 后，输入过程中 `DrugRow` 的渲染次数从"每次按键触发全部重渲染"降到"只有真正变化的行才重渲染"。

### 2. Immutable.js：曾经的浅比较辅助方案

`memo`/`PureComponent` 的浅比较有一个前提：状态更新时必须用"新对象替换旧对象"的不可变写法，而不是直接修改原对象的字段。在 Immer 还没有普及、手写不可变更新容易出错的年代，`immutable.js` 是一种常见的解决方案——它提供了 `Map`/`List` 等持久化数据结构，`set` 操作会返回一个新的容器实例，但内部通过结构共享避免了整体深拷贝的开销。

`src/components/Immutable/index.tsx`

```jsx
import React, {useState, useRef} from 'react';
import {Map, is} from 'immutable';


// 浅比较
const shallowEqual = (o1: any, o2: any) => {
  if(o1 === o2) return true;
  if(typeof o1 !== 'object' || o1 === null || typeof o2 !== 'object' || o2 === null) return false;
  const k1:Array<string> = Object.keys(o1);
  const k2:Array<string> = Object.keys(o2);
  if(k1.length !== k2.length) return false;
  for (const key of k1) {
    if(!o2.hasOwnProperty(key) || !is(o1[key], o2[key])) return false;
  }
  return true;
}

class PureComponent<T> extends React.Component<T> {
  shouldComponentUpdate(newProps: any) {
    return !shallowEqual(this.props, newProps);
  }
}


class Counter extends PureComponent<any>{
  render() {
    const {counter} = this.props;
    console.log(`%cCounter render`, 'color: yellow');
    return (
      <div>
        {counter.get('number')}
      </div>
    )
  }
}

function Pure() {
  const [sum, setSum] = useState({counter: Map({number: 0})});
  const ref: any= useRef(null);
  console.log(`%cPure render`, 'color: red');

  const add = () => {
    const number = +ref?.current?.value;
    const oldNum = sum.counter.get('number') as number;
    setSum({counter: sum.counter.set('number', oldNum + number)});
  }
  return (
    <div>
      <Counter counter={sum.counter} />
      <input ref={ref} />
      <button onClick={add}>+</button>
    </div>
  );
}

export default Pure;
```

这段代码里的 `shallowEqual` 用 `immutable` 提供的 `is` 函数替代了普通的 `!==` 比较，因为 `immutable.js` 的容器对象即使内容相同，也可能不是同一个引用，`is` 内部会先判断引用相等，再判断是否是同一种持久化数据结构且内容相等。

**这套方案现在已经很少在新项目里看到**，原因是它引入了一整套独立的数据结构 API（`.get()`/`.set()`/`.toJS()`），团队里每个人都要额外学习这套 API 才能正确使用，和普通 JS 对象/数组的读写方式不统一，心智负担明显；而 Immer 允许"看似直接修改"的写法（内部用 Proxy 记录变更路径，最终生成结构共享的新对象，细节见第 11 篇状态管理篇），学习成本更低，React 生态里 Redux Toolkit 默认集成的也是 Immer 而不是 Immutable.js。了解 Immutable.js 的设计思路（持久化数据结构、结构共享）依然有价值，但新项目已经不建议选择它，直接用 Immer 或者手写浅层不可变更新即可。

### 3. 虚拟列表：react-window 与 @tanstack/react-virtual

处方单场景里，药品目录动辄上万条，如果直接把所有条目渲染成 DOM 节点，即使配合 `memo` 也无法避免"首次渲染就要创建上万个 DOM 节点"的开销。虚拟列表的做法是只渲染当前可视区域内的条目，用两个占位元素模拟"滚动条上方还有多少内容""滚动条下方还有多少内容"。

`react-window` 是目前最常用的固定/可变尺寸虚拟列表库，`FixedSizeList` 用于每一项高度相同的场景：

```jsx
import { FixedSizeList } from 'react-window'

function DrugCatalog({ drugs }) {
  return (
    <FixedSizeList
      height={600}
      width="100%"
      itemCount={drugs.length}
      itemSize={48} // 👈 每一项固定高度 48px
    >
      {({ index, style }) => (
        <div style={style}>{drugs[index].name}</div>
      )}
    </FixedSizeList>
  )
}
```

`@tanstack/react-virtual` 是更底层的 headless 方案，不提供现成的 DOM 结构，只提供计算好的虚拟条目信息，样式完全自己控制，更适合和现有的表格/列表组件结合：

```jsx
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

function DrugCatalog({ drugs }) {
  const parentRef = useRef(null)
  const virtualizer = useVirtualizer({
    count: drugs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
  })

  return (
    <div ref={parentRef} style={{ height: 600, overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            style={{
              position: 'absolute',
              top: item.start,
              height: item.size,
              width: '100%',
            }}
          >
            {drugs[item.index].name}
          </div>
        ))}
      </div>
    </div>
  )
}
```

两者的选型取舍：`react-window` 上手更快、内置了常见布局（列表/网格），适合标准场景快速接入；`@tanstack/react-virtual` 更灵活，因为不预设 DOM 结构，适合需要自定义复杂布局（比如带分组头、不定高度混排）的场景，但需要自己写更多样式代码。

### 4. React.lazy + Suspense + Error Boundary

按模块拆分代码是减少首屏包体积最直接的手段。"处方审核""检验报告""医嘱录入"这几个模块如果都在首屏一次性加载，会显著拖慢首屏渲染：

```jsx
import { lazy, Suspense } from 'react'

const PrescriptionReview = lazy(() => import('./PrescriptionReview'))

function App() {
  return (
    <Suspense fallback={<div>加载处方审核模块...</div>}>
      <PrescriptionReview />
    </Suspense>
  )
}
```

`lazy` 只处理"加载中"的状态，加载失败（比如网络问题导致 chunk 请求失败）需要配合 Error Boundary 兜底，否则会导致整个应用崩溃到白屏：

```jsx
class ModuleErrorBoundary extends React.Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <div>模块加载失败，请刷新页面重试</div>
    }
    return this.props.children
  }
}

function App() {
  return (
    <ModuleErrorBoundary>
      <Suspense fallback={<div>加载处方审核模块...</div>}>
        <PrescriptionReview />
      </Suspense>
    </ModuleErrorBoundary>
  )
}
```

> 💬 **面试官会问**：`React.lazy` 是怎么和 `Suspense` 配合实现代码分割的？
>
> ✅ **标准答案**：`lazy(() => import('./XXX'))` 返回一个特殊的组件类型，渲染它时如果对应的动态 `import()` 还没有 resolve，会同步 `throw` 一个 Promise；`Suspense` 边界会捕获这个 Promise，先展示 `fallback`，等 Promise resolve 后重新渲染，此时 `lazy` 组件内部已经拿到了真正的模块，正常渲染。
>
> 🎁 **加分答案**：`lazy` 本身只负责"包装异步加载 + 抛出 Promise"，不处理加载失败的情况——如果动态 `import()` 的 Promise reject（网络问题、chunk 404），这个错误会被向上抛给最近的 Error Boundary 而不是 `Suspense`，所以生产环境的代码分割一定要同时准备 `Suspense`（处理加载中）和 Error Boundary（处理加载失败）两道防线，只写 `Suspense` 是不完整的。

🔧 **真实案例**：把处方审核、检验报告、医嘱录入三个模块从主 bundle 拆出来，首屏 JS 体积从 1.2MB 降到 380KB，首屏可交互时间明显缩短；同时给每个 `Suspense` 边界配了独立的 Error Boundary，某次 CDN 抖动导致检验报告模块 chunk 加载失败时，只有那一个模块显示"加载失败请重试"，其余模块不受影响。

### 5. useTransition/useDeferredValue 的应用场景

这两个 Hook 的调度原理已经在第 07 篇并发渲染篇讲透，这里只回顾"什么场景用哪个"的决策依据。

`useTransition` 适合"我知道接下来要触发一次可能比较慢的更新，希望这次更新可以被打断，并且我想展示一个 pending 状态"：

```jsx
function DrugFilter({ allDrugs }) {
  const [keyword, setKeyword] = useState('')
  const [filtered, setFiltered] = useState(allDrugs)
  const [isPending, startTransition] = useTransition()

  const handleChange = (e) => {
    const value = e.target.value
    setKeyword(value) // 👈 紧急更新：输入框内容必须立刻响应
    startTransition(() => {
      setFiltered(allDrugs.filter((d) => d.name.includes(value))) // 👈 可以被打断的低优先级更新
    })
  }

  return (
    <div>
      <input value={keyword} onChange={handleChange} />
      {isPending && <span>筛选中...</span>}
      <DrugCatalog drugs={filtered} />
    </div>
  )
}
```

`useDeferredValue` 适合"我拿到的是外部传入的一个值（不是自己触发的更新），希望这个值的展示可以'滞后'于最新值"，不需要自己维护额外的 state：

```jsx
function DrugFilter({ keyword, allDrugs }) {
  const deferredKeyword = useDeferredValue(keyword) // 👈 展示滞后于最新的 keyword
  const filtered = useMemo(
    () => allDrugs.filter((d) => d.name.includes(deferredKeyword)),
    [allDrugs, deferredKeyword],
  )

  return <DrugCatalog drugs={filtered} />
}
```

两者的选型依据：能拿到"触发更新"的那个函数调用点，就用 `useTransition`（因为它能提供 `isPending` 状态）；只能拿到一个外部传入的值、无法控制它的更新时机，就用 `useDeferredValue`。

### 6. React DevTools Profiler 实操

Profiler 面板是排查性能问题的第一入口，不是靠"肉眼看代码猜哪里慢"。打开 React DevTools 的 Profiler 标签，点击录制按钮，操作一次触发问题的交互（比如输入搜索关键字），停止录制后能看到：

- **火焰图（Flamegraph）**：每一行代表一次渲染，宽度代表耗时，颜色越黄代表相对耗时越长；点击某个组件可以看到这次渲染的 `props`/`state` 差异
- **排名图（Ranked）**：按耗时从高到低排列所有渲染过的组件，快速定位"这次交互里最耗时的是哪个组件"
- **每次提交的原因（Why did this render）**：勾选设置里的"Record why each component rendered"，可以直接看到"因为 props 变化"还是"因为 hook 变化"

排查流程：先录制，再看火焰图里哪个组件耗时最长（或者哪些组件渲染次数明显偏多），点进去看 "why did this render" 给出的原因，再决定是用 `memo` 挡掉不必要的渲染，还是这个组件本身单次渲染就很慢需要拆分/虚拟化。

### 7. 生产级补充：预渲染与图片懒加载

预渲染（Prerendering）是在构建阶段把静态页面（比如药品说明书详情页这种内容变化不频繁的页面）提前渲染成 HTML，用户请求时直接返回静态文件，不需要每次都走服务端渲染或客户端渲染的完整流程。这和第 12 篇讲的流式 SSR 是互补关系：预渲染适合"内容不依赖用户身份、变化频率低"的页面，流式 SSR 适合"每个用户看到的内容不同、必须实时渲染"的页面，两者可以在同一个应用里按页面类型分别选择。

图片懒加载则是把"是否加载图片"这个决策推迟到"图片即将进入可视区域"的时刻，常见做法是用 `IntersectionObserver` 监听图片容器是否进入视口：

```jsx
function LazyImage({ src, alt }) {
  const imgRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true)
        observer.disconnect() // 👈 加载一次后不再需要继续观察
      }
    })
    observer.observe(imgRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={imgRef}>
      {isVisible ? <img src={src} alt={alt} /> : <div className="img-placeholder" />}
    </div>
  )
}
```

药品目录列表里每一项都带缩略图，如果不做懒加载，一次性发出上千张图片请求会挤占网络带宽、拖慢真正在可视区域内的内容加载；配合懒加载后，只有滚动到的图片才会真正发起请求。

---

## 二、设计与原理

### 1. memo 的浅比较机制与 bailout 的关系

第 03 篇讲过 `beginWork` 开头的 bailout 判断：`oldProps === newProps && !hasContextChanged && !includesSomeLane(fiber.lanes, renderLanes)` 同时成立时，直接复用旧的 Fiber 子树，跳过这次渲染函数的执行。`memo` 要利用上这条路径，关键在于"让新旧 props 在语义上相等时，也能让 React 认为可以跳过"——但 `oldProps === newProps` 是引用比较，父组件每次渲染都会创建新的 props 对象，引用天然不同，`memo` 因此需要一层额外的比较逻辑：不是等待 `beginWork` 里的引用比较命中，而是 `memo` 类型的 Fiber 在渲染前主动用 `shallowEqual` 对比新旧 props，如果结果相等，就直接把这次渲染标记为"和上次相同"，效果等价于命中了 bailout。

这也是为什么 `memo` 传入的自定义 `compare` 函数返回 `true` 就代表"两次 props 相同、不需要重渲染"——语义和 `shouldComponentUpdate` 返回 `false` 是一致的，只是布尔值的意义刚好相反（`shouldComponentUpdate` 返回值代表"要不要更新"，`compare` 返回值代表"是否相等"）。

> 💬 **面试官会问**：`React.memo` 为什么能减少重渲染？如果父组件重渲染但子组件 props 没变，具体是怎么跳过的？
>
> ✅ **标准答案**：`memo` 包裹的组件在渲染前，会对新旧 props 做一次浅比较（默认用 `shallowEqual`，逐个 key 用 `Object.is` 比较），如果结果相等就跳过这次渲染函数的执行，直接复用上一次的渲染结果——效果和第 03 篇讲的 `beginWork` bailout 判断一致，只是判断的时机和依据不同：bailout 判断的是 props 引用是否相等，`memo` 是主动做了一次浅比较来"弥补"引用天然不同这个问题。
>
> 🎁 **加分答案**：`memo` 的浅比较只有一层，如果 props 里包含对象/数组/函数，即使内容不变，只要每次渲染创建的是新引用，浅比较依然会判定"不相等"——这正是「一、1」处方单例子里 `onSelect` 不用 `useCallback` 包裹就会导致 `memo` 失效的根本原因。

### 2. useMemo/useCallback 的依赖比较：Object.is 逐项比较

`useMemo`/`useCallback` 的实现在 `packages/react-reconciler/src/ReactFiberHooks.js` 里，mount 阶段和 update 阶段分别对应 `mountMemo`/`updateMemo`（`useCallback` 底层复用同一套逻辑，只是缓存的值是函数本身而不是函数的执行结果）。核心判断逻辑是 `areHookInputsEqual`：把新旧依赖数组逐项用 `Object.is` 比较，只要有一项不相等，就认为依赖变化了，重新执行 `nextCreate()` 计算新值；如果全部相等，直接返回上一次缓存的结果，不重新计算。

这解释了一个常被忽略的细节：依赖数组比较的是**数组里每一项**，不是整个数组的引用——即使每次渲染都创建了新的依赖数组字面量 `[a, b]`，只要 `a` 和 `b` 本身没变，`areHookInputsEqual` 依然会判定"相等"。真正会导致比较失效的，是依赖数组里某一项本身是一个每次渲染都重新创建的对象/数组/函数。

> 💬 **面试官会问**：`useMemo`/`useCallback` 的依赖比较具体比较的是什么？和 `memo` 的浅比较是同一套逻辑吗？
>
> ✅ **标准答案**：不是同一套逻辑，但设计思路类似。`memo` 比较的是整个 `props` 对象的每个 key（`shallowEqual`），`useMemo`/`useCallback` 比较的是传入的依赖数组里逐项的值（`areHookInputsEqual`），两者都是用 `Object.is` 做单层比较，区别只是比较的目标结构不同（对象的 key vs 数组的项）。
>
> 🎁 **加分答案**：`useCallback(fn, deps)` 等价于 `useMemo(() => fn, deps)`——`mountCallback`/`updateCallback` 内部直接复用 `mountMemo`/`updateMemo` 的存储结构，只是不会真的执行一次 `nextCreate()` 拿计算结果，而是直接把 `fn` 本身存起来，这也是为什么两者共用同一份依赖比较实现。

### 3. 虚拟列表的核心原理：只渲染可视区域

虚拟列表要解决的本质问题是"DOM 节点数量和用户能看到的内容数量脱钩"——用户在 600px 高的容器里一次只能看到十几条数据，却要为上万条数据全部创建 DOM 节点，这是纯粹的浪费。核心原理拆成三步：

1. **计算总高度**：如果每一项高度固定为 `itemSize`，总高度就是 `itemCount * itemSize`；如果是不定高度，需要先估算或者实测每一项的高度，累加得到总高度
2. **计算可视区域对应的索引范围**：根据当前滚动位置 `scrollTop` 和容器高度 `height`，算出"当前应该渲染第几项到第几项"（`startIndex = Math.floor(scrollTop / itemSize)`，`endIndex = Math.ceil((scrollTop + height) / itemSize)`）
3. **用占位元素模拟滚动条**：真正渲染的只有 `[startIndex, endIndex]` 范围内的条目，但外层容器的高度要设置成"总高度"，这样浏览器原生的滚动条行为和滚动位置计算才是正确的；每个真正渲染的条目再用 `position: absolute` + `top` 定位到它在整个列表里"应该在的位置"

固定高度的场景计算简单，直接用索引乘以固定高度即可定位；不定高度场景（比如聊天记录、图文混排）需要维护一份"每一项高度"的缓存，滚动时增量更新，`@tanstack/react-virtual` 的 `estimateSize` 就是用于提供一个初始估算值，实际渲染后再用真实高度校正。

> 💬 **面试官会问**：虚拟列表的核心原理是什么？
>
> ✅ **标准答案**：只创建当前可视区域内需要显示的那部分 DOM 节点，而不是为全部数据创建节点；用一个撑起总高度的容器元素让浏览器原生滚动条行为正常，真正渲染的条目用绝对定位放置到它在整个列表里对应的位置，滚动时动态计算新的可视区间、替换渲染的条目。
>
> 🎁 **加分答案**：固定高度和不定高度是两种不同复杂度的实现——固定高度可以用简单的除法/乘法直接算出索引范围和定位坐标，不定高度需要维护一份"每项实际高度"的缓存并做增量更新，这也是为什么 `react-window` 要分别提供 `FixedSizeList` 和 `VariableSizeList` 两个组件，而不是用一套实现覆盖所有场景。

### 4. React.lazy 的实现：惰性 thenable + Suspense 挂起机制

`lazy(ctor)` 内部维护一个"惰性初始化器"（`lazyInitializer`），状态机有四种取值：`Uninitialized`（还没开始加载）、`Pending`（正在加载，即 `import()` 返回的 Promise 还没 resolve）、`Resolved`（加载成功，缓存了模块对象）、`Rejected`（加载失败，缓存了错误对象）。

第一次渲染这个 `lazy` 组件时，状态是 `Uninitialized`，`lazyInitializer` 调用 `ctor()` 拿到 `import()` 返回的 Promise，把状态切换为 `Pending`，然后**同步 `throw` 这个 Promise**——这不是异常处理意义上的抛错，而是 React 渲染机制里"挂起"的实现方式：`Suspense` 边界的 `beginWork` 逻辑里专门捕获这种被 `throw` 出来的 thenable，先渲染 `fallback`，同时给这个 Promise 注册一个 `then` 回调；等 Promise resolve，状态切换为 `Resolved`，回调触发重新调度渲染，这一次 `lazyInitializer` 发现状态已经是 `Resolved`，直接返回缓存的模块对象，真正渲染目标组件。

> 💬 **面试官会问**：`React.lazy` 是怎么"告诉" React 组件还没加载好的？
>
> ✅ **标准答案**：`lazy` 组件第一次渲染时，会同步抛出（`throw`）动态 `import()` 返回的 Promise，而不是抛出一个普通错误。这个 Promise 会被最近的 `Suspense` 边界捕获，`Suspense` 先渲染 `fallback`，并给这个 Promise 挂一个 `then` 回调；Promise resolve 后触发重新渲染，这次能拿到已经加载好的模块，正常渲染目标组件。
>
> 🎁 **加分答案**：正因为走的是"抛出 thenable"这条路径，`lazy` 天然要求外层必须有 `Suspense` 包裹，否则这个 Promise 会一路向上抛，最终变成一个未处理的异常；而如果 Promise reject（加载失败），这个错误对象会被 `Suspense` 转手交给上层最近的 Error Boundary 处理，不是 `Suspense` 自己处理失败态。

### 5. useTransition/useDeferredValue 的调优原理回顾

两者的调度细节已在第 07 篇讲透，这里回顾结论：`startTransition` 内部把包裹的更新强制标记为 `TransitionLane`，这类 Lane 的优先级远低于 `SyncLane`/`InputContinuousLane`，可以被后续到来的高优先级更新打断、重新排队；`useDeferredValue` 的实现思路类似，第一次渲染直接返回当前值，之后每次外部值变化时，内部先返回上一次的旧值（保证这一帧不被阻塞），再用一个低优先级更新去追赶最新值。这也是为什么 `useDeferredValue` 常被拿来和 `debounce`/`throttle` 类比，但本质不同：`debounce`/`throttle` 是"延迟触发"，跳过中间的调用，只在时间窗口结束后执行一次；`useDeferredValue` 是"值本身没有延迟产生"（外部值已经是最新的），而是"用低优先级去渲染这个已经拿到的值"，如果主线程有空档，滞后的渲染反而可能很快追上，不需要固定等待一个时间窗口。

> 💬 **面试官会问**：`useDeferredValue` 具体是怎么实现"输入流畅、结果滞后"效果的？和 debounce/throttle 有什么本质区别？
>
> ✅ **标准答案**：`useDeferredValue` 不是通过"延迟接收值"实现的，接收到的值一直是最新的；它是把"用这个新值重新渲染"这个动作标记成低优先级更新，如果这时候主线程正忙着处理更紧急的更新（比如输入框的按键响应），这次重渲染会被推迟甚至被打断重新调度，表现出来就是"结果的展示滞后于输入"。`debounce`/`throttle` 则是在时间维度上跳过/延迟触发回调本身，和 React 的渲染调度机制没有关系，纯粹是"减少调用次数"。
>
> 🎁 **加分答案**：`useDeferredValue` 的滞后时间没有一个固定值，取决于主线程当前的繁忙程度——如果主线程很快就空闲下来，滞后的渲染几乎立刻追上；`debounce` 的等待时间是开发者写死的固定值，不管主线程是否空闲都要等够这个时间。这也是为什么很多"防抖搜索"的场景，把 `debounce` 换成 `useTransition`/`useDeferredValue` 后，输入流畅度和结果反馈速度都能同时优化，因为它是自适应的，不是固定延迟的。

### 6. key 的优化与 Diff 策略回顾

很多资料里会把 React 的 Diff 算法归纳成"tree diff / 组件 diff / element diff"三个层次，这是 React 16 及更早版本流传下来的一种经典分类方式：tree diff 指"只对同层级节点比较，不跨层级搬移"；组件 diff 指"同类型组件复用实例、不同类型直接销毁重建"；element diff 指"同层级多个子节点的比较，靠 key 判断是否可以复用"。

这套分类在概念上依然成立，但 React 18 的具体实现已经在第 04 篇用"单节点 Diff（`reconcileSingleElement`）+ 多节点 Diff 的两轮遍历（`reconcileChildrenArray`）+ `lastPlacedIndex` 判断移动"讲得很透彻——"tree diff"对应的就是 Diff 算法"只比较同一层级"这个前提假设，"组件 diff"对应的就是单节点 Diff 里"key 相同但 type 不同则整体标记删除重建"的判断，"element diff"对应的就是多节点 Diff 的两轮遍历本身。这里不重复贴源码，如果这几个名词对应的具体源码判断逻辑还不熟悉，建议直接回顾第 04 篇。

> 💬 **面试官会问**：说一下 React 的 diff 策略，tree diff、组件 diff、element diff 分别是什么？
>
> ✅ **标准答案**：这是一种经典的三层归纳法——tree diff 指只对同层级节点做比较，不做跨层级的节点搬移；组件 diff 指同类型的组件会尝试复用已有实例，不同类型直接销毁重建；element diff 指同层级多个子节点之间靠 key 判断能否复用、以及是否需要移动位置。这三层描述的都是设计原则，React 18 源码层面的具体实现是单节点 Diff（`reconcileSingleElement`）和多节点 Diff 的两轮遍历（`reconcileChildrenArray` + `lastPlacedIndex`）。
>
> 🎁 **加分答案**：如果面试官继续追问两轮遍历和 `lastPlacedIndex` 的具体判断逻辑，可以直接展开讲第 04 篇的内容——这说明你不仅知道这套经典分类，还知道它在当前版本源码里对应的真实实现，这是"讲清楚而不是背概念"的加分点。

### 7. 性能优化的系统化排查方法论

零散的"试着加个 memo""试着用虚拟列表"这类经验式排查效率很低，也容易在面试里被追问出漏洞。一套更系统的流程是：

**第一步，用 Profiler 录制，定位"谁在重渲染、耗时多少"。** 不要凭感觉猜测哪个组件慢，先录制一次真实的问题交互，看火焰图和排名图，明确到底是"某个组件渲染次数异常多"，还是"某个组件单次渲染耗时异常长"。

**第二步，区分两类问题，用不同手段解决。** "渲染次数过多"（父组件更新导致大量子组件被动跟着重渲染）对应的手段是 `memo`/`useMemo`/`useCallback`，目标是让更多组件命中 bailout；"单次渲染耗时过长"（比如一次渲染要处理几千个 DOM 节点，或者渲染函数内部有昂贵的同步计算）对应的手段是虚拟列表（减少 DOM 节点数量）、`useMemo`（缓存昂贵计算）、`useTransition`/`useDeferredValue`（把这次渲染标记为可中断，不阻塞更紧急的交互）。这两类问题的解法几乎不重叠——如果一个组件本身渲染就很慢，包再多层 `memo` 也没用，因为 `memo` 解决的是"要不要渲染"，不是"渲染快不快"。

**第三步，优化后再次录制对比，用数据验证效果**，而不是主观感觉"好像快了一点"。

> 💬 **面试官会问**：系统化排查 React 性能问题的思路是什么？
>
> ✅ **标准答案**：先用 Profiler 录制真实的问题交互，从火焰图/排名图里定位具体是哪个组件出了问题；再区分是"渲染次数过多"还是"单次渲染耗时过长"两类不同性质的问题——前者用 `memo`/`useMemo`/`useCallback` 减少不必要的重渲染，后者用虚拟列表/`useMemo`/并发特性降低单次渲染的开销；最后再次录制对比数据，确认优化真的生效。
>
> 🎁 **加分答案**：这两类问题经常同时存在，但解决顺序有讲究——通常先处理"渲染次数过多"，因为减少了不必要的重渲染之后，"单次渲染耗时过长"这个问题涉及的组件范围往往会自然缩小，能更精确地定位到真正需要虚拟化或者拆分的那个组件，避免一开始就在错误的范围里做优化。

### 8. React Compiler 的未来方向

React Compiler（前身叫 React Forget）要解决的历史包袱正是本篇「一、1」和「二、1」讲的问题：`memo`/`useMemo`/`useCallback` 的效果依赖开发者主动配合保持引用稳定，一旦某个地方忘了包 `useCallback`，整条优化链路就失效，而且这种失效很难在代码审查阶段被发现，只有跑起来看 Profiler 才能暴露。

React Compiler 的思路是在编译期自动分析组件函数体内"哪些变量最终影响了 JSX 输出"，在必要的位置自动插入等价于 `memo`/`useMemo`/`useCallback` 的缓存逻辑，把"这里要不要手动加 `useCallback`"这个决策从开发者手里转移到编译器。

对比 Vue 3 的编译优化路线会更容易理解这个方向的意义：Vue 3 的模板编译会生成 PatchFlag 静态标记、做静态提升、构建 Block Tree，运行时只需要 diff 被标记为"动态"的节点，这一切建立在"模板是相对静态的、编译期就能分析出哪些节点会变化"这个前提上；React 的 JSX 本质是普通函数调用，完全动态，无法在编译期做类似的静态节点分析，只能选择另一个方向——分析"数据依赖关系"，在编译期自动插入缓存指令。两者都是"用编译期信息换运行时性能"，只是分析的对象不同：Vue 3 分析的是"模板里哪些节点是静态的"，React Compiler 分析的是"函数体里哪些变量的引用需要保持稳定"。

截至目前（2026 年），React Compiler 仍是实验性特性，Meta 内部已经在部分产品线落地验证，社区可以通过 `babel-plugin-react-compiler` 试用，正式 GA 大概会随 React 19+ 逐步成熟。短期内理解本篇讲的 `memo`/`useMemo`/`useCallback` 手动优化原理依然是必要的，长期来看，这部分优化工作大概率会逐渐下沉到编译器，开发者需要关心的会更多是"数据结构设计得是否清晰"而不是"这里要不要手动加缓存"。

> 💬 **面试官会问**：了解 React Compiler 吗？它想解决什么问题？
>
> ✅ **标准答案**：React Compiler 想解决的是"手动优化依赖开发者主动配合、容易遗漏"的问题——它在编译期自动分析组件函数体内哪些变量影响了渲染输出，自动插入相当于 `memo`/`useMemo`/`useCallback` 的缓存逻辑，不再需要开发者手动判断"这里要不要包一层"。
>
> 🎁 **加分答案**：可以对比 Vue 3 的编译优化路线来体现理解深度——Vue 3 靠模板的相对静态性做 PatchFlag/静态提升，React 的 JSX 完全动态无法做同样的分析，只能走"分析数据依赖关系、自动插入缓存"这条路，是两种不同的技术路线在各自约束条件下的合理选择，不是谁比谁更先进。

---

## 三、源码解析（重点代码，来源 GitHub 仓库）

> React 18 源码地址：https://github.com/facebook/react（本篇断点调试环境已锁定 `v18.3.1`）

### 1. memo 的比较逻辑：packages/react/src/ReactMemo.js

```javascript
// memo（节选，$$typeof 标记 + compare 挂载）
export function memo<Props>(
  type: React$ElementType,
  compare?: (oldProps: Props, newProps: Props) => boolean,
) {
  const elementType = {
    $$typeof: REACT_MEMO_TYPE,
    type,
    compare: compare === undefined ? null : compare,
  };
  return elementType;
}
```

**关键点**

1. `memo()` 本身不做任何比较逻辑，只是把原始组件 `type` 和用户传入的 `compare` 函数打包成一个带 `$$typeof: REACT_MEMO_TYPE` 标记的普通对象——真正的比较逻辑发生在 `beginWork` 处理 `MemoComponent` 类型的 Fiber 时
2. `compare` 默认为 `null`，此时 `beginWork` 会退回使用 `packages/shared/shallowEqual.js` 的默认浅比较逻辑；用户传入自定义 `compare` 时，React 直接调用这个函数替代默认浅比较

### 2. 默认浅比较：packages/shared/shallowEqual.js

```javascript
// shallowEqual（完整实现）
function shallowEqual(objA: mixed, objB: mixed): boolean {
  if (is(objA, objB)) {
    return true;
  }

  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (let i = 0; i < keysA.length; i++) {
    const currentKey = keysA[i];
    if (
      !hasOwnProperty.call(objB, currentKey) ||
      !is(objA[currentKey], objB[currentKey])
    ) {
      return false;
    }
  }

  return true;
}
```

**关键点**

1. 第一步 `is(objA, objB)` 先判断整体引用是否相等（`Object.is` 语义，能正确处理 `NaN` 和 `+0`/`-0` 这两个 `===` 会误判的边界情况），命中就直接返回 `true`，不需要继续逐 key 比较
2. `keysA.length !== keysB.length` 这行提前拦截了"新 props 比旧 props 多/少了字段"的情况——如果不做这个检查，只逐个比较 `keysA` 里的字段，会漏掉"`objB` 比 `objA` 多出的字段"这种变化
3. 逐个 key 比较时用的也是 `is()` 而不是 `===`，和第一层的整体比较用的是同一个相等性语义，这保证了"整体相等"和"逐字段比较后判定相等"在语义上是一致的

### 3. useMemo/useCallback 依赖比较：packages/react-reconciler/src/ReactFiberHooks.js

```javascript
// updateMemo（节选，areHookInputsEqual 的调用点）
function updateMemo<T>(
  nextCreate: () => T,
  deps: Array<mixed> | void | null,
): T {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;
  // Assume these are defined. If they're not, areHookInputsEqual will warn.
  if (nextDeps !== null) {
    const prevDeps: Array<mixed> | null = prevState[1];
    if (areHookInputsEqual(nextDeps, prevDeps)) {
      return prevState[0]; // 👈 依赖没变，直接返回上一次缓存的结果，不重新计算
    }
  }
  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}
```

**关键点**

1. `hook.memoizedState` 存的是一个 `[value, deps]` 二元数组——第一项是上一次的计算结果，第二项是上一次的依赖数组，这是 `useMemo` 缓存结构的完整存储形态
2. `areHookInputsEqual(nextDeps, prevDeps)` 比较通过就直接 `return prevState[0]`，`nextCreate()` 这个真正的计算函数根本没有被调用——这是"跳过重新计算"在源码层面的直接体现，不是"计算了但结果一样"，而是"压根没算"
3. `useCallback` 复用的是同一个 `updateMemo`（`mountCallback`/`updateCallback` 内部直接调用 `mountMemo`/`updateMemo`，只是把 `nextCreate` 替换成 `() => fn`），这也验证了「二、2」讲的"两者共用一套依赖比较实现"

### 4. React.lazy 挂起机制：packages/react/src/ReactLazy.js

```javascript
// lazyInitializer（节选，状态机四态转换）
const Uninitialized = -1;
const Pending = 0;
const Resolved = 1;
const Rejected = 2;

function lazyInitializer<T>(payload: Payload<T>): T {
  if (payload._status === Uninitialized) {
    const ctor = payload._result;
    const thenable = ctor(); // 👈 调用 import()，拿到 Promise
    thenable.then(
      (moduleObject) => {
        if (payload._status === Pending || payload._status === Uninitialized) {
          const resolved: ResolvedPayload<T> = (payload: any);
          resolved._status = Resolved;
          resolved._result = moduleObject;
        }
      },
      (error) => {
        if (payload._status === Pending || payload._status === Uninitialized) {
          const rejected: RejectedPayload = (payload: any);
          rejected._status = Rejected;
          rejected._result = error;
        }
      },
    );
    if (payload._status === Uninitialized) {
      const pending: PendingPayload = (payload: any);
      pending._status = Pending;
      pending._result = thenable;
    }
  }
  if (payload._status === Resolved) {
    const moduleObject = payload._result;
    return moduleObject.default; // 👈 已经 resolve，直接返回缓存的模块
  } else {
    throw payload._result; // 👈 Pending 或 Rejected 状态，同步 throw
  }
}
```

**关键点**

1. `Uninitialized` 分支只在第一次渲染这个 `lazy` 组件时执行一次——调用 `ctor()` 触发真正的动态 `import()`，随后立即把状态切换到 `Pending`，这个切换发生在给 Promise 注册 `then` 回调**之后**，保证回调触发时状态一定不是 `Uninitialized`
2. 函数末尾的 `if/else` 是整个挂起机制的核心：只有 `Resolved` 状态才正常返回模块，其余所有状态（`Pending` 也好、`Rejected` 也好）统一走 `throw payload._result`——`Pending` 时 `_result` 是那个还没 resolve 的 Promise（`Suspense` 捕获它挂起渲染），`Rejected` 时 `_result` 是错误对象（会被 Error Boundary 捕获，不是 `Suspense`）
3. `then` 回调里的判断条件是 `payload._status === Pending || payload._status === Uninitialized`——这是防御性的状态检查，确保回调不会在已经被其他路径改成 `Resolved`/`Rejected` 之后再次错误地覆盖状态

---

## 四、手写实现（可独立跑通）

本篇的手写实现是一个独立的 Vite + TypeScript + React 18 demo，不接入前几篇统一使用的 `lotosv2010/react-source` monorepo——原因是虚拟列表属于应用层组件，不是 React 引擎内核的一部分，不需要依赖那套仿官方目录结构的手写实现。

### 1. 固定高度虚拟列表组件

核心是维护 `scrollTop` 状态，根据它和容器高度实时计算出应该渲染的索引范围：

```tsx
import { useState, useMemo, useRef, CSSProperties } from 'react'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number // 👈 上下额外多渲染几项，减少快速滚动时的白屏闪烁
}

function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const totalHeight = items.length * itemHeight

  const { startIndex, endIndex } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const end = Math.min(items.length - 1, start + visibleCount + overscan * 2)
    return { startIndex: start, endIndex: end }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])

  const visibleItems = items.slice(startIndex, endIndex + 1)

  return (
    <div
      ref={containerRef}
      style={{ height: containerHeight, overflow: 'auto', position: 'relative' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const index = startIndex + i
          const style: CSSProperties = {
            position: 'absolute',
            top: index * itemHeight, // 👈 定位到这一项在完整列表里应该在的位置
            height: itemHeight,
            width: '100%',
          }
          return (
            <div key={index} style={style}>
              {renderItem(item, index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default VirtualList
```

### 2. 万级药品目录 demo

```tsx
import VirtualList from './VirtualList'

interface Drug {
  id: number
  name: string
  price: number
}

const drugs: Drug[] = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  name: `药品-${i}`,
  price: Math.floor(Math.random() * 100) + 1,
}))

function DrugCatalogDemo() {
  return (
    <VirtualList
      items={drugs}
      itemHeight={48}
      containerHeight={600}
      renderItem={(drug) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px' }}>
          <span>{drug.name}</span>
          <span>¥{drug.price}</span>
        </div>
      )}
    />
  )
}

export default DrugCatalogDemo
```

### 3. 对比版本：不做虚拟化直接渲染全部节点

```tsx
function DrugCatalogNaive() {
  return (
    <div style={{ height: 600, overflow: 'auto' }}>
      {drugs.map((drug) => (
        <div key={drug.id} style={{ height: 48, display: 'flex', justifyContent: 'space-between', padding: '0 16px' }}>
          <span>{drug.name}</span>
          <span>¥{drug.price}</span>
        </div>
      ))}
    </div>
  )
}
```

**验证方式**：`pnpm dev` 起本地 Vite 环境，分别挂载 `DrugCatalogDemo`（虚拟列表版）和 `DrugCatalogNaive`（全量渲染版），用 React DevTools Profiler 各录制一次"从顶部滚动到底部"的完整交互。全量渲染版首次挂载就要创建 10000 个 DOM 节点，Elements 面板能直接看到节点数量，滚动过程中即使 DOM 结构没有变化，浏览器的布局/绘制成本依然明显更高；虚拟列表版任意时刻真实存在的 DOM 节点只有 `visibleCount + overscan * 2` 个（约 20 个左右），Profiler 火焰图里滚动触发的重渲染耗时会显著低于全量渲染版本，且耗时不随 `items.length` 增长——这正是「二、3」讲的"DOM 节点数量和用户能看到的内容数量脱钩"在实测数据上的直接体现。

---

## 五、手写实现源码地址

- GitHub：https://github.com/lotosv2010/react-source

---

## 六、参考资料

- https://zh-hans.react.dev/
- https://github.com/bvaughn/react-window
- https://tanstack.com/virtual
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com
- https://github.com/wbccb/Frontend-Articles

---

## 💡 面试核心问

- **`memo`、`useMemo`、`useCallback` 三者各自解决什么问题？滥用会有什么代价？**
- **虚拟列表的核心原理是什么？**
- **`React.lazy` 是怎么和 `Suspense` 配合实现代码分割的？**
- **`useDeferredValue` 具体是怎么实现"输入流畅、结果滞后"效果的？和 debounce/throttle 有什么本质区别？**
- **系统化排查 React 性能问题的思路是什么？**

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话核心 | 面试考察频率 |
|--------|-----------|-------------|
| memo 浅比较 | 对新旧 props 逐 key 用 `Object.is` 比较，相等则跳过渲染 | ⭐⭐⭐⭐⭐ |
| useMemo/useCallback | 依赖数组逐项比较，相等则跳过重新计算/返回旧函数引用 | ⭐⭐⭐⭐⭐ |
| 三件套配合关系 | memo 挡渲染，useCallback/useMemo 保证引用稳定，两者缺一不可 | ⭐⭐⭐⭐⭐ |
| 虚拟列表 | 只渲染可视区域，用占位容器撑起总高度模拟原生滚动 | ⭐⭐⭐⭐ |
| React.lazy | 首次渲染同步 throw 一个 Promise，Suspense 捕获后挂起渲染 | ⭐⭐⭐⭐ |
| useDeferredValue vs debounce | 前者是低优先级调度、自适应延迟；后者是固定时间窗口跳过调用 | ⭐⭐⭐⭐ |
| 系统化排查方法论 | Profiler 定位 → 区分渲染次数过多/单次耗时过长 → 对应手段 → 验证 | ⭐⭐⭐⭐⭐ |
| React Compiler | 编译期自动分析依赖关系，自动插入缓存，解放手动优化负担 | ⭐⭐⭐ |

---

## 📝 思考题

**留个问题**：`useMemo` 的依赖比较（`areHookInputsEqual`）只对依赖数组做**单层**的逐项 `Object.is` 比较，不会深度比较数组项内部的嵌套结构。如果依赖数组里的某一项是一个对象（比如 `useMemo(() => compute(filter), [filter])`，`filter` 是 `{ keyword, category }` 这样的对象），且这个对象每次渲染都被重新创建（即使字段值完全一样），会出现什么问题？结合本篇「二、2」和「一、1」的内容想一想：这个问题和 `memo` 的浅比较失效是不是同一类问题，解决思路是否也一致？

答案留在评论区，或者结合第 03 篇讲的 bailout 机制、第 06 篇 Hooks 深度篇一起复习会有更完整的理解。

---

> 🔖 这是「React 18 全家桶深度拆解系列」第 13 篇。上一篇：《React 18 服务端渲染: 流式 SSR 与 Server Components 原理实战（生产收藏级）》；下一篇预告：《React 18 工程化实战: Turborepo + Monorepo 后台管理系统从零搭建（生产收藏级）》
