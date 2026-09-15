# React 18 Hooks 深度：设计哲学、dispatcher 切换与 Hook 链表源码（面试收藏级）

> **副标题**：Hooks 设计哲学、dispatcher 机制、Hook 链表、useSyncExternalStore 防撕裂原理

---

## 🎯 这篇文章解决什么问题

面试官通常不会一上来就问"Hooks 底层怎么实现"，而是从一个所有人都背过的规则开始：**为什么 Hooks 不能写在条件语句或循环里？**

大多数人能背出结论，但说不清原因——"React 规定的""ESLint 会报错"这类答案，面试官听多了会立刻追问一句：**这条规则背后，React 内部到底是靠什么机制强制要求的？** 如果答不上来"Hook 链表"这四个字，这道题基本等于没答对。

再往下追问："那 mount 阶段和 update 阶段的 `useState` 走的是同一段代码吗？"——多数人以为 Hooks 是一套统一实现，实际上 React 内部为 mount 和 update 准备了两套完全不同的函数集合，通过一个叫 `ReactCurrentDispatcher.current` 的全局引用动态切换。这个机制不理解，后面追问的 `useSyncExternalStore` 怎么解决并发渲染下的"撕裂"问题，基本无从谈起。

这一篇要讲透的，正是 Hooks 表面用法之下的这套机制：**Hook 链表**如何把"调用顺序"和"状态存储位置"绑定在一起、**dispatcher** 如何在 mount/update 之间无缝切换、以及并发渲染引入的新问题（tearing）React 是怎么用 `useSyncExternalStore` 解决的。读完之后，你会同时获得两种确定感：**懂原理**（Hooks 规则背后的链表结构、dispatcher 切换的真实代码路径）和**会讲**（面试官顺着任意一个 Hook 往下挖都能拆解回答）。

---

## 一、使用与实践

### 1. useState：函数式更新与惰性初始化

`useState` 支持两种更新方式，适用场景不同：

```jsx
function PrescriptionQuantity() {
  const [quantity, setQuantity] = useState(1)

  // 直接传值：适合"和上一次状态无关"的更新
  const reset = () => setQuantity(1)

  // 传函数：适合"基于上一次状态计算"的更新，闭包里永远拿到最新值
  const increment = () => setQuantity(prev => prev + 1)

  return (
    <div>
      <span>数量：{quantity}</span>
      <button onClick={increment}>+1</button>
      <button onClick={reset}>重置</button>
    </div>
  )
}
```

如果在同一个事件处理函数里连续调用三次 `setQuantity(quantity + 1)`（直接传值），由于三次读到的都是同一个闭包里的 `quantity`，最终只会 +1；换成 `setQuantity(prev => prev + 1)`（函数式更新），三次调用会在处理队列时依次基于上一条的结果计算，最终 +3——这也是"数量加减按钮连续点击"这类场景必须用函数式更新的原因。

惰性初始化则用于避免"每次渲染都要重新计算初始值"的浪费：

```jsx
const [patientList, setPatientList] = useState(() => computeExpensivePatientList())
```

传入一个函数而不是直接调用 `computeExpensivePatientList()`，React 只在**首次挂载**时执行这个函数一次；如果直接写 `useState(computeExpensivePatientList())`，则每次组件重渲染时这个开销昂贵的计算都会被重新执行一遍，只是结果被丢弃——这是一个容易被忽略的性能陷阱。

> 💬 **面试官会问**：`setCount(count + 1)` 连续调用三次和 `setCount(c => c + 1)` 连续调用三次，结果分别是什么？为什么？
>
> ✅ **标准答案**：前者最终只 +1，因为三次调用读到的都是同一次渲染闭包里的 `count`，本质是往队列里塞了三条"变成同一个值"的更新；后者最终 +3，因为函数式更新在处理队列时是基于"上一条 update 处理后的中间结果"依次计算的，不依赖闭包里的旧值。

> 🎁 **加分答案**：这个现象的根源在 Hook 的更新队列实现（详见「二、11」），`updateReducer` 遍历 `queue.pending` 链表时是一条接一条地把 `reducer(newState, update.action)` 的结果作为下一条的入参，函数式更新恰好利用了这个链式计算。

### 2. useEffect 依赖数组与清理函数

```jsx
useEffect(() => {
  const timer = setInterval(() => refreshVitalSigns(patientId), 3000)
  return () => clearInterval(timer) // 清理函数：依赖变化前或组件卸载时调用
}, [patientId]) // 依赖数组：只有 patientId 变化才重新执行
```

依赖数组有三种写法：不传（每次渲染都执行）、传 `[]`（只在挂载时执行一次）、传 `[patientId]`（依赖项变化时才重新执行）。`useEffect`/`useLayoutEffect`/`useInsertionEffect` 三者的具体执行时机差异（分别对应 commit 阶段的哪个子阶段）在第 05 篇已经讲透，这里不再重复，只回顾一条结论供本篇使用：**`useLayoutEffect` 同步执行、`useEffect` 绘制后异步执行**。

处方单弹窗先测量 DOM 再定位、避免闪烁的场景：

```jsx
useLayoutEffect(() => {
  const rect = popoverRef.current.getBoundingClientRect()
  if (rect.bottom > window.innerHeight) setPlacement('top')
}, [])
```

`useInsertionEffect` 是三种 effect 里最早执行、也最少被业务代码直接使用的一种，专门给 CSS-in-JS 库在 DOM 变更后、`useLayoutEffect` 读取布局信息前插入 `<style>` 标签用——这里先建立"它存在、且执行顺序最靠前"的基本认知，完整原理见第 05 篇「二、7」。

### 3. useMemo / useCallback 配合 memo 固定引用

```jsx
const PrescriptionItem = memo(function PrescriptionItem({ drug, onRemove }) {
  return <li>{drug.name}<button onClick={() => onRemove(drug.id)}>删除</button></li>
})

function PrescriptionList({ drugs }) {
  const [keyword, setKeyword] = useState('')

  // 不用 useMemo：每次渲染都生成新数组，PrescriptionItem 拿到的 drug 引用每次都变
  const filtered = useMemo(
    () => drugs.filter(d => d.name.includes(keyword)),
    [drugs, keyword],
  )

  // 不用 useCallback：每次渲染都生成新函数，PrescriptionItem 的 onRemove 引用每次都变
  const handleRemove = useCallback(id => setDrugs(prev => prev.filter(d => d.id !== id)), [])

  return <ul>{filtered.map(d => <PrescriptionItem key={d.id} drug={d} onRemove={handleRemove} />)}</ul>
}
```

`memo` 化的子组件要真正跳过重渲染，前提是父组件传给它的 props 引用保持稳定——这正是对照第 03 篇讲过的 bailout 机制在应用层的直观体现：`useMemo`/`useCallback` 的作用不是"让计算变快"，而是"让引用变稳定"，从而让子组件命中 `oldProps === newProps` 这条 bailout 判断。

### 4. useRef：DOM 引用与不触发渲染的可变值

```jsx
function VitalSignsChart() {
  const canvasRef = useRef(null)       // 用途一：持有 DOM 引用
  const renderCountRef = useRef(0)     // 用途二：跨渲染保存可变值，但修改它不触发重渲染

  useEffect(() => {
    renderCountRef.current += 1
    drawChart(canvasRef.current, renderCountRef.current)
  })

  return <canvas ref={canvasRef} />
}
```

`useRef` 返回的对象在整个组件生命周期内保持同一个引用，修改 `.current` 不会触发重渲染——这一点和 `useState` 形成鲜明对比，也是它能用来存"不需要反映到 UI 上的可变数据"（如定时器 ID、上一次的 props 值）的原因。

### 5. useContext：跨层级传递当前登录医生信息

```jsx
const CurrentDoctorContext = createContext(null)

function DoctorWorkspace() {
  const doctor = useContext(CurrentDoctorContext)
  return <span>当前接诊医生：{doctor.name}</span>
}
```

`useContext` 读取的是组件树上**最近**一层匹配的 `Provider` 提供的值，不需要通过 props 逐层透传。它背后的依赖传播原理（Provider 变化如何精确标记消费组件）留给第 09 篇 Context 专篇详细展开，本篇只关注它作为一个 Hook 是如何被 dispatcher 处理的（见「二、10」）。

### 6. useReducer：管理复杂的问诊表单状态

```jsx
function formReducer(state, action) {
  switch (action.type) {
    case 'SET_SYMPTOM': return { ...state, symptom: action.payload }
    case 'SET_DIAGNOSIS': return { ...state, diagnosis: action.payload }
    case 'RESET': return initialFormState
    default: return state
  }
}

function DiagnosisForm() {
  const [form, dispatch] = useReducer(formReducer, initialFormState)
  return (
    <input
      value={form.symptom}
      onChange={e => dispatch({ type: 'SET_SYMPTOM', payload: e.target.value })}
    />
  )
}
```

问诊表单涉及多个字段的复杂状态流转时，`useReducer` 比多个 `useState` 更适合——所有状态变更逻辑集中在 `formReducer` 这一个纯函数里，`dispatch` 引用永远保持稳定（跨渲染不变），可以放心传给子组件而不必担心引用变化导致的多余重渲染。

### 7. useSyncExternalStore：安全订阅外部数据源

```jsx
// 一个模块级单例 store：医生排班数据，存在于 React 组件树之外
const doctorScheduleStore = {
  state: { onDuty: [] },
  listeners: new Set(),
  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  },
  getSnapshot() {
    return this.state
  },
  setSchedule(next) {
    this.state = next
    this.listeners.forEach(listener => listener())
  },
}

function OnDutyBoard() {
  const schedule = useSyncExternalStore(
    doctorScheduleStore.subscribe.bind(doctorScheduleStore),
    doctorScheduleStore.getSnapshot.bind(doctorScheduleStore),
  )
  return <ul>{schedule.onDuty.map(doc => <li key={doc.id}>{doc.name}</li>)}</ul>
}
```

`useSyncExternalStore(subscribe, getSnapshot)` 是 React 18 官方提供的"安全订阅外部状态"标准方式——医生排班这类模块级单例 store、或者 `window.matchMedia` 这类浏览器 API，都属于"React 渲染流程管不到"的外部数据源。用 `useState` + `useEffect` 手写订阅在并发模式下会有一致性问题，具体原因和 `useSyncExternalStore` 怎么解决见「二、13」这一节的详细展开。

> 💬 **面试官会问**：为什么不能简单地用 `useState` + `useEffect` 手写一个订阅外部 store 的自定义 Hook，非要用 `useSyncExternalStore`？
>
> ✅ **标准答案**：手写版本在并发模式下会有一个隐蔽的一致性问题——渲染可能被打断、恢复，中途外部 store 的值可能已经变了，导致同一次渲染里不同组件读到不一致的两个值（tearing）。`useSyncExternalStore` 在实现上会比较渲染前后的快照，发现不一致会强制走一次同步重渲染，从根本上规避了这个问题。

> 🎁 **加分答案**：Redux 的 `react-redux`、Zustand 都是基于 `useSyncExternalStore` 实现自己的订阅 hook 的（`useSelector`/`useStore`），这也是这两个库能在 React 18 并发模式下安全工作的地基。

### 8. 自定义 Hook 设计规范

```typescript
function usePatientRecord(patientId: string) {
  const [record, setRecord] = useState<PatientRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchPatientRecord(patientId).then(data => {
      setRecord(data)
      setLoading(false)
    })
  }, [patientId])

  return { record, loading } as const
}
```

自定义 Hook 不是新语法，只是"调用其他 Hook 的普通函数"——`usePatientRecord`/`usePrescriptionForm` 这类自定义 Hook，参数设计上遵循"必要输入做参数、内部状态不暴露"的原则，返回值用对象（可解构、字段自解释）而不是数组（除非像 `useState` 那样只有两个强顺序关联的值）。多个组件调用同一个自定义 Hook 时，各自拥有独立的闭包和状态实例——这一点在「二、3」详细展开。

### 9. forwardRef + useImperativeHandle：命令式调用子组件方法

```jsx
const PrescriptionSearchInput = forwardRef((props, ref) => {
  const inputRef = useRef(null)

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),
    clear: () => { inputRef.current.value = '' },
  }))

  return <input ref={inputRef} {...props} />
})

function PrescriptionPage() {
  const searchRef = useRef(null)
  return (
    <>
      <PrescriptionSearchInput ref={searchRef} />
      <button onClick={() => searchRef.current.focus()}>聚焦搜索框</button>
    </>
  )
}
```

`forwardRef` 让函数组件也能接收父组件传入的 `ref`；`useImperativeHandle` 进一步自定义父组件通过这个 `ref` 能拿到哪些方法——不是把整个 `inputRef.current`（真实 DOM 节点）暴露出去，而是只暴露 `focus`/`clear` 两个方法，这是"最小暴露面"的封装思路（详见「二、6」）。

### 10. createPortal：脱离父组件 CSS 层级限制

```jsx
function ConfirmDialog({ children }) {
  return createPortal(
    <div className="dialog-overlay">{children}</div>,
    document.body,
  )
}
```

`createPortal` 把 `children` 渲染到 `document.body` 而不是父组件所在的 DOM 位置，常用于弹窗、Tooltip 这类需要脱离父容器 `overflow: hidden`/`z-index` 层级限制的场景。但**事件冒泡仍然沿 React 组件树传播**，而不是沿它挂载到的真实 DOM 树传播——原理见「二、7」。

### 11. useId：生成跨端一致的唯一 ID

```jsx
function PrescriptionFormField({ label }) {
  const id = useId()
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} />
    </>
  )
}
```

`useId` 生成一个形如 `:r1:` 的字符串，同一个组件多次挂载实例之间互不冲突，且在 SSR 场景下服务端和客户端生成的 ID 严格一致——不能用 `Math.random()` 或自增全局变量代替，那样会导致 hydration 时客户端和服务端生成的 ID 对不上，触发 hydration mismatch 警告。

### 12. Fragment 内置组件

```jsx
function PrescriptionRow({ drugs }) {
  return (
    <>
      {drugs.map(d => (
        <React.Fragment key={d.id}>
          <td>{d.name}</td>
          <td>{d.dosage}</td>
        </React.Fragment>
      ))}
    </>
  )
}
```

`<></>` 短语法和显式的 `<React.Fragment>` 都允许返回多个子节点而不额外包裹一层 DOM 元素——这在表格场景里尤其重要，`<tr>` 下面不能凭空多出一层 `<div>`。但短语法 `<>` **不支持 `key` 属性**，列表渲染需要 `key` 时必须用显式 `<React.Fragment key={...}>`，这是两者唯一的功能差异。

> 💬 **面试官会问**：`<></>` 和 `<React.Fragment>` 有什么区别？什么场景下必须用后者？
>
> ✅ **标准答案**：功能上完全等价，都是"返回多个子节点、不产生额外宿主 DOM 节点"。唯一区别是短语法 `<>` 不能接受任何属性（包括 `key`），所以在 `.map()` 循环渲染、需要给每一项声明 `key` 的场景，必须用显式的 `<React.Fragment key={...}>`。

### 13. Error Boundary：捕获子树渲染期间的异常

```jsx
class PrescriptionErrorBoundary extends React.Component {
  state = { hasError: false }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    reportErrorToMonitoring(error, info.componentStack)
  }

  render() {
    if (this.state.hasError) return <FallbackUI />
    return this.props.children
  }
}
```

`getDerivedStateFromError` 用于渲染 fallback UI（不能有副作用，返回值直接合并进 state），`componentDidCatch` 用于上报日志（可以有副作用）。错误边界只能捕获**渲染阶段、生命周期方法、构造函数**中抛出的异常，**无法捕获事件处理函数、异步代码（`setTimeout`/`Promise`）中的异常**——这些场景需要自己写 `try/catch`。

> 💬 **面试官会问**：为什么错误边界捕获不到事件处理函数里的异常？
>
> ✅ **标准答案**：错误边界的捕获机制依赖 render 阶段的 `throw`——`beginWork` 处理某个 Fiber 时如果同步抛出异常，`workLoop` 会捕获这个异常并沿 Fiber 树的 `return` 指针向上查找最近的错误边界。但事件处理函数的执行完全在 render/commit 流程之外，它抛出的异常不会经过这条捕获路径，浏览器会把它当成一次普通的未捕获异常处理。

> 🎁 **加分答案**：React 至今没有提供 Hooks 形式的错误边界（没有 `useErrorBoundary`），因为 `getDerivedStateFromError` 这类"根据错误直接计算出新 state"的能力依赖 Class 组件的静态方法机制，在 Hooks 的函数式模型里没有一个等价的、能在渲染函数体外拦截同一次渲染抛出异常的自然位置；社区方案（如 `react-error-boundary`）本质仍是内部包了一个 Class 组件。

---

## 二、设计与原理

### 1. Hooks 本质：用闭包复用状态逻辑

Class 组件的生命周期方法（`componentDidMount`/`componentDidUpdate`/`componentWillUnmount`）经常把毫不相关的逻辑拼接在同一个方法里——比如一个组件既要在挂载时订阅事件、又要在挂载时发起请求，这两段逻辑会被迫写在同一个 `componentDidMount` 里，难以拆分复用。Hooks 用"函数组件 + 闭包"的方式，把相关的状态和副作用逻辑聚合到一起（同一个 `useEffect` 处理同一件事的挂载和清理），天然按"关注点"而不是"生命周期时刻"组织代码。

### 2. 调用顺序依赖模型

Hook 的状态不是按名字或标识符存取的，而是按**调用顺序**对应存储位置——第一次调用的 `useState` 对应链表第一个节点，第二次调用的 `useEffect` 对应链表第二个节点，以此类推。如果某次渲染因为条件语句多调用或少调用了一个 Hook，这次渲染构建出的链表节点数和上一次不一致，会导致后续所有 Hook 读到错位的状态——这正是"不能在条件语句或循环里调用 Hook"这条规则的底层原因，详细的链表机制见「二、10」。

### 3. 自定义 Hook 不是新语法

自定义 Hook 只是一个内部调用了其他 Hook 的普通函数，React 并没有为它设计任何专门的运行时机制。多个组件使用同一个自定义 Hook（比如两个组件都用了 `usePatientRecord`）时，各自的调用会在各自的 Fiber 上产生独立的 Hook 链表节点、独立的闭包——它们互不干扰，就像两个组件各自调用 `useState` 不会共享状态一样。

### 4. 对比 Vue 3 Composable

Vue 3 的响应式系统靠 Proxy 拦截 `get`/`set` 做依赖收集，这套机制不依赖"调用顺序"——`ref`/`reactive` 创建的响应式对象本身携带追踪信息，因此 Composable 函数可以写在 `if`/`for` 里，不受调用顺序约束。React Hooks 选择用调用顺序对应状态存储位置，换来的是**不需要建立一整套响应式依赖收集系统**、实现更简单，代价是牺牲了控制流书写上的自由度。这是两种完全不同的复用机制在设计取舍上的核心差异，没有哪个绝对更优，只是选择了不同的复杂度分配方式。

### 5. effect 时机差异的设计意图（回顾）

`useEffect` 与 `useLayoutEffect` 的执行时机差异在第 05 篇 commit 阶段已经讲透，这里只回顾结论：`useEffect` 异步调度、不阻塞浏览器绘制，适合大多数不需要同步读写布局的副作用；`useLayoutEffect` 同步执行，只用在必须同步读取或修改布局信息的场景（否则会拖慢 commit、阻塞绘制）。

### 6. useImperativeHandle 的本质：最小暴露面

配合 `forwardRef` 使用时，如果不用 `useImperativeHandle`，父组件通过 `ref` 拿到的会是子组件内部 `inputRef.current` 指向的**真实 DOM 节点本身**，意味着父组件可以随意调用这个 DOM 节点的任意原生方法、修改任意属性——这破坏了子组件的封装边界。`useImperativeHandle` 让子组件自己决定"父组件通过 `ref` 能做什么"，只暴露一个精心设计的方法集合（如 `focus`/`clear`），这是命令式 API 场景下"最小暴露面"封装思路的直接体现。

### 7. createPortal 事件冒泡为什么仍按 React 树传播

Portal 只改变了真实 DOM 的挂载位置（`children` 被 `appendChild` 到 `document.body` 而不是父组件所在的 DOM 节点下），但**没有改变对应 Fiber 节点在 Fiber 树里的 `return` 指针关系**——它在 Fiber 树中依然是父组件的子节点。React 的合成事件系统基于 Fiber 树结构做事件收集（详见第 08 篇），而不是基于真实 DOM 的父子关系，所以即便 Portal 内容在 DOM 树上脱离了父容器，一次点击事件仍然会沿着 Fiber 树的 `return` 链一路冒泡到父组件，和没有用 Portal 时表现一致。

### 8. useId 解决的具体问题

SSR 场景下，服务端渲染出的 HTML 里如果包含需要唯一标识的 `id`（如 `label`/`input` 的关联），服务端生成的字符串必须和客户端 hydrate 时生成的完全一致，否则会触发 hydration mismatch。`useId` 按"组件在树中的位置"编码生成确定性字符串——只要服务端和客户端遍历组件树的顺序一致（正常情况下必然一致），生成的 ID 就严格相同，不依赖任何随机数或运行时状态。

### 9. Error Boundary 的捕获边界

只能捕获**渲染阶段、生命周期方法、构造函数**中抛出的异常，原理见「一、13」的加分答案：捕获机制依赖 render 阶段的同步 `throw` 被 `workLoop` 捕获后沿 Fiber 树向上查找错误边界（详见「三、6」的源码路径），事件处理函数和异步代码的执行完全脱离这条路径，因此捕获不到。

### 10. dispatcher 机制（重点）

`ReactCurrentDispatcher.current` 是一个全局可变引用，指向"当前生效的一整套 Hook 实现"。`renderWithHooks` 在渲染函数组件**之前**，根据这次渲染是 mount 还是 update，把它指向 `HooksDispatcherOnMount` 或 `HooksDispatcherOnUpdate` 两套完全不同的对象——组件体内调用 `useState`，实际执行的是 `React` 包里 `useState` 这个转发函数，它内部读取 `ReactCurrentDispatcher.current.useState` 并调用，真正落到的是当前这次渲染对应的 `mountState` 或 `updateState`。

这解释了一个常被问到的问题：**为什么 mount 阶段和 update 阶段的 `useState` 要拆成两套实现，而不是一个函数内部 `if (mount) {...} else {...}` 判断？** 拆成两套独立函数有两个好处：一是避免每次调用 Hook 都要做一次条件判断（dispatcher 切换只在渲染函数组件前发生一次，之后组件体内每个 Hook 调用都是直接走对应实现，没有额外分支开销）；二是 mount 和 update 两条路径的逻辑差异很大（mount 要创建 Hook 节点和 queue，update 要做链表复用和优先级过滤），拆开写更清晰、也更容易独立测试。

渲染结束后，`ReactCurrentDispatcher.current` 会被重置为 `ContextOnlyDispatcher`——这套 dispatcher 里所有 Hook 都直接抛错，用来保证"渲染阶段之外调用 Hook 会立即报错"这条规则被强制执行。

### 11. Hook 链表（重点）

`fiber.memoizedState` 在函数组件对应的 Fiber 上，指向该 Fiber 上**第一个 Hook 对象**；一个组件体内多次调用 Hook（`useState`、`useEffect`、`useRef`……），每次调用都会在这条链表上追加一个新节点，用 `next` 指针串成一条单向链表。第二次渲染时，React 不会重新创建链表，而是按调用顺序把 `workInProgress` 的链表节点和 `current` 树对应的旧链表节点一一对应地"往前走一格"——这正是「二、2」讲的"Hooks 调用顺序必须保持一致"规则的底层原因：如果某次渲染的调用顺序和上一次不一致，链表节点的对应关系就会错位，第三个 `useState` 调用可能读到本该属于第二个 `useEffect` 的节点数据。

### 12. useState/useReducer 实现

mount 阶段（`mountState`/`mountReducer`）创建 Hook 节点，把 `hook.memoizedState`/`hook.baseState` 初始化为初始值，同时创建一个 `queue` 对象（含 `pending` 环形链表、`dispatch` 函数）挂在 `hook.queue` 上。`dispatch` 触发的每次更新（`dispatchSetState`/`dispatchReducerAction`）都会创建一个 `Update` 对象追加进 `queue.pending` 环形链表——这条链表和第 02 篇 Class 组件的 `UpdateQueue` 结构高度相似（都是"pending 环形链表 + baseState 兜底 + 遍历执行"），但分别独立实现，不是共享的同一份代码。真正的状态计算发生在下一次渲染的 `updateReducer`/`updateState` 中，遍历 `pending` 链表依次执行 reducer 得出最终状态，优先级不足的 update 会被跳过并保留到 `baseQueue`，逻辑与 Class 组件的 `processUpdateQueue` 同源。

### 13. useEffect/useLayoutEffect 实现

两者都通过 `mountEffectImpl`/`updateEffectImpl` 创建一个 `Effect` 对象，追加进 `fiber.updateQueue` 上的另一条**环形链表**（和 Hook 链表是两条完全独立的链表：Hook 链表挂在 `fiber.memoizedState`，Effect 链表挂在 `fiber.updateQueue.lastEffect`）。区别只在于打的标记不同——`HookLayout`/`HookPassive`/`HookInsertion`，commit 阶段据此决定这个 effect 在哪个子阶段被执行，具体的执行时机和顺序已在第 05 篇讲透，这里不重复。

### 14. useSyncExternalStore 与并发渲染下的 tearing 问题（重点）

并发模式下，一次渲染可能被高优先级更新打断，中途还会读取多次同一个外部 store 的值。如果只是简单地用 `useState` + `useEffect` 手写订阅——`useEffect` 里 `subscribe` 一个回调，回调触发时 `setState` 更新本地状态——问题出在：渲染被打断又恢复的过程中，外部 store 的值可能已经在渲染中途发生了变化，导致**同一次渲染里，不同组件读到了这个外部 store 前后不一致的两个值**，这就是"tearing / 撕裂"。举个具体场景：A 组件先渲染读到 store 的值是 `v1`，渲染被打断，此时 store 被外部更新为 `v2`，B 组件恢复渲染时读到的是 `v2`——同一次渲染输出的 UI 里，A 和 B 对同一份数据的理解不一致。

`useSyncExternalStore(subscribe, getSnapshot)` 的实现（`mountSyncExternalStore`/`updateSyncExternalStore`）解决这个问题的关键在于：每次渲染都会调用 `getSnapshot()` 读取当前值作为这次渲染的状态（不依赖上一次渲染缓存的值），并且在 commit 完成后，通过一个不比较 deps 的 passive effect（`updateStoreInstance`）比较"渲染时读到的值"和"commit 后再次读取的值"是否一致（`checkIfSnapshotChanged`）——如果渲染过程中发现值已经变了，会调用 `forceStoreRerender` 强制走一次 **`SyncLane`** 同步重渲染，保证读到的是最新且一致的值。这从根本上保证了"同一次渲染里所有读到这个 store 的地方，值一定是一致的"，而不是像手写版本那样可能读到跨渲染阶段变化的中间值。

`useSyncExternalStore` 是 Redux（`react-redux` 的 `useSelector`）、Zustand 等外部状态库能在并发模式下安全工作的地基——它们的订阅 hook 底层都是基于这个 Hook 实现的，这也是「一、7」加分答案提到的内容，与第 11 篇状态管理篇联动。

---

## 三、源码解析（重点代码，来源 GitHub 仓库）

> React 18 源码地址：https://github.com/facebook/react（`packages/react-reconciler/src/ReactFiberHooks.new.js` 等文件路径以 v18.3.1 为准）

### 1. Hooks 对外 API：packages/react/src/ReactHooks.js

`react` 包本身不实现任何 Hook 逻辑，`useState`/`useEffect` 等导出函数只是从 `ReactCurrentDispatcher.current` 取出当前 dispatcher 后转发调用——这也是「二、10」讲的 dispatcher 机制在官方源码里最直接的体现，`resolveDispatcher` 是唯一的校验点：

```javascript
function resolveDispatcher() {
  const dispatcher = ReactCurrentDispatcher.current;
  return dispatcher;
}

export function useState(initialState) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
}
```

### 2. Dispatcher 全局引用：packages/react/src/ReactCurrentDispatcher.js

```javascript
const ReactCurrentDispatcher = { current: null };
export default ReactCurrentDispatcher;
```

一个极简的对象，只有一个 `current` 字段——正是这一个字段的切换，驱动了 mount/update 两套完全不同的 Hook 行为。

### 3. Dispatcher 具体实现：packages/react-reconciler/src/ReactFiberHooks.new.js

`HooksDispatcherOnMount`/`HooksDispatcherOnUpdate` 两个对象分别把各个 Hook 名映射到 `mountXxx`/`updateXxx` 函数：

```javascript
const HooksDispatcherOnMount = {
  useState: mountState,
  useEffect: mountEffect,
  // ...
};
const HooksDispatcherOnUpdate = {
  useState: updateState,
  useEffect: updateEffect,
  // ...
};
```

### 4. 更新触发与调度：dispatchSetState/dispatchReducerAction

`dispatch` 函数在 `mountState`/`mountReducer` 时通过 `bind` 提前绑定好 `fiber` 和 `queue`，之后组件里调用 `dispatch(action)` 实际执行的是 `dispatchSetState(fiber, queue, action)`——创建 Update 对象、入队、调用 `scheduleUpdateOnFiber` 触发调度，这条链路与第 02 篇讲的 Update 机制完全对应。

### 5. useId 的树位置编码：mountId/updateId

`mountId` 只在 mount 阶段调用一次，基于组件在树中的路径生成确定性字符串；`updateId` 只是简单返回上次的值，不重新计算——这符合「二、8」讲的"ID 只在挂载时确定一次"的语义。

### 6. 错误边界：packages/react-reconciler/src/ReactFiberThrow.js

```javascript
function throwException(root, returnFiber, sourceFiber, value, renderLanes) {
  sourceFiber.flags |= Incomplete;
  let workInProgress = returnFiber;
  do {
    if (workInProgress.tag === ClassComponent) {
      const ctor = workInProgress.type;
      if (typeof ctor.getDerivedStateFromError === 'function') {
        // 命中错误边界：创建 CaptureUpdate，标记 ShouldCapture
      }
    }
    workInProgress = workInProgress.return;
  } while (workInProgress !== null);
}
```

这是「二、9」讲的"错误边界只能捕获渲染阶段异常"的真正代码依据——`throwException` 只在 `workLoop` 捕获到 render 阶段的同步 `throw` 时才被调用，沿 `return` 指针向上找最近的 `ClassComponent` 且实现了 `getDerivedStateFromError`/`componentDidCatch` 的 Fiber。

### 7. useSyncExternalStore 实现：mountSyncExternalStore/updateSyncExternalStore

```javascript
function updateSyncExternalStore(subscribe, getSnapshot) {
  const nextSnapshot = getSnapshot();
  // 与上次渲染的快照比较，不同则标记本次渲染"收到了外部更新"
  // commit 后的 passive effect 里还会再比较一次（checkIfSnapshotChanged）
}
```

`checkIfSnapshotChanged` 的比较逻辑是整个防撕裂机制的核心，对应「二、14」讲的"渲染前后两次快照不一致就强制同步重渲染"。

### 8. effect 链表执行：commitHookEffectListMount/commitHookEffectListUnmount

```javascript
function commitHookEffectListMount(flags, finishedWork) {
  const lastEffect = finishedWork.updateQueue.lastEffect;
  let effect = lastEffect.next;
  do {
    if ((effect.tag & flags) === flags) {
      effect.destroy = effect.create();
    }
    effect = effect.next;
  } while (effect !== lastEffect.next);
}
```

这两个函数在第 05 篇已经详细拆解过，这里放在 Hooks 篇作为"Effect 链表如何被消费"的收尾引用——它们完全不知道自己在处理哪种 effect，只靠调用方传入的 `flags` 位运算筛选。

---

## 四、手写实现

> 承接第 01~05 篇搭好的 `lotosv2010/react-source` monorepo，本篇对照的是仓库里 `packages/react-reconciler/src/ReactFiberHooks.ts` 与 `packages/react/src/ReactHooks.ts` 已经落地的真实代码——这两个文件把「二」节讲的 dispatcher 机制和 Hook 链表完整实现了一遍，逐段对照着看能更直观理解官方源码在做什么。

### 1. dispatcher 切换：renderWithHooks

```typescript
export function renderWithHooks<Props>(
  current: FiberNode | null,
  workInProgress: FiberNode,
  Component: (props: Props, secondArg?: any) => any,
  props: Props,
  secondArg: any,
  nextRenderLanes: Lanes,
): any {
  renderLanes = nextRenderLanes;
  currentlyRenderingFiber = workInProgress;
  workInProgress.memoizedState = null;
  workInProgress.updateQueue = null;

  ReactCurrentDispatcher.current =
    current === null || current.memoizedState === null
      ? HooksDispatcherOnMount
      : HooksDispatcherOnUpdate;

  const children = Component(props, secondArg);

  ReactCurrentDispatcher.current = ContextOnlyDispatcher;
  renderLanes = NoLanes;
  currentlyRenderingFiber = null as any;
  currentHook = null;
  workInProgressHook = null;
  return children;
}
```

判断走 mount 还是 update 的依据是 `current === null || current.memoizedState === null`——`current` 为 `null` 说明这是首次挂载；`current.memoizedState` 为 `null` 说明上一次渲染时这个 Fiber 是函数组件但一个 Hook 都没调用过（等价于"没有 Hook 链表"）。渲染函数执行完毕后立刻把 dispatcher 切回 `ContextOnlyDispatcher`，对应「二、10」讲的"渲染阶段外调用 Hook 立即报错"。

### 2. Hook 链表的挂载与复用：mountWorkInProgressHook/updateWorkInProgressHook

```typescript
function mountWorkInProgressHook(): Hook {
  const hook: Hook = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
  if (workInProgressHook === null) {
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}
```

第一次调用 Hook 时挂到 `fiber.memoizedState` 上（链表头），之后每次调用都追加到 `workInProgressHook.next`——这就是「二、11」讲的 Hook 链表在代码层面最直接的样子。`updateWorkInProgressHook` 则是从 `current.memoizedState`（上一次渲染留下的链表）里按顺序取出对应节点、克隆成新节点：

```typescript
function updateWorkInProgressHook(): Hook {
  let nextCurrentHook: Hook | null;
  if (currentHook === null) {
    const current = currentlyRenderingFiber.alternate;
    nextCurrentHook = current !== null ? current.memoizedState : null;
  } else {
    nextCurrentHook = currentHook.next;
  }
  if (nextCurrentHook === null) {
    throw new Error("Rendered more hooks than during the previous render.");
  }
  // ...克隆 currentHook 为新的 workInProgressHook
}
```

`nextCurrentHook === null` 时直接 `throw`——这正是"本次渲染调用的 Hook 数量比上次多"时会立刻报错的真实代码位置，验证了「二、2」讲的调用顺序依赖模型：如果某次渲染因为条件语句多跑了一个 `useState`，遍历到 `current` 链表末尾之后再往下取一个节点，`nextCurrentHook` 就是 `null`，直接抛出错误。

### 3. useState/useReducer：mount 与 update 双实现

```typescript
function mountState<S>(initialState: (() => S) | S): [S, Dispatch<BasicStateAction<S>>] {
  const hook = mountWorkInProgressHook();
  if (typeof initialState === "function") initialState = (initialState as () => S)();
  hook.memoizedState = hook.baseState = initialState;

  const queue: UpdateQueue<S, BasicStateAction<S>> = {
    pending: null, dispatch: null,
    lastRenderedReducer: basicStateReducer, lastRenderedState: initialState,
  };
  hook.queue = queue;
  const dispatch = (queue.dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue as any));
  return [hook.memoizedState, dispatch];
}
```

`dispatch` 通过 `bind` 提前绑定好 `currentlyRenderingFiber` 和 `queue`，这就是为什么组件里拿到的 `setCount` 调用时不需要再传 fiber——绑定已经在 mount 阶段完成。`updateReducer` 是 update 阶段的核心，遍历 `queue.pending` 环形链表依次计算新状态，对优先级不够的 update 做跳过与重放（与第 02 篇 Class 组件的 `processUpdateQueue` 同源逻辑）：

```typescript
do {
  const updateLane = update.lane;
  if (!isSubsetOfLanes(renderLanes, updateLane)) {
    // 优先级不足：跳过，克隆进新的 baseQueue 留待后续高优先级渲染重放
  } else {
    newState = update.hasEagerState ? update.eagerState as S : reducer(newState, update.action);
  }
  update = update.next;
} while (update !== null && update !== first);
```

### 4. useSyncExternalStore：防撕裂的完整链路

```typescript
function updateSyncExternalStore<T>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => T,
): T {
  const fiber = currentlyRenderingFiber;
  const hook = updateWorkInProgressHook();
  const nextSnapshot = getSnapshot();
  const prevSnapshot = (currentHook ?? hook).memoizedState;
  const snapshotChanged = !is(prevSnapshot, nextSnapshot);
  if (snapshotChanged) {
    hook.memoizedState = nextSnapshot;
    markWorkInProgressReceivedUpdate();
  }
  // ...pushEffect 注册 updateStoreInstance，commit 后再比较一次
  return nextSnapshot;
}

function checkIfSnapshotChanged<T>(inst: StoreInstance<T>): boolean {
  const nextValue = inst.getSnapshot();
  return !is(inst.value, nextValue);
}

function forceStoreRerender(fiber: FiberNode): void {
  const root = enqueueConcurrentRenderForLane(fiber, SyncLane); // 强制走 SyncLane 同步重渲染
  if (root !== null) scheduleUpdateOnFiber(root, fiber, SyncLane, requestEventTime());
}
```

`forceStoreRerender` 强制用 `SyncLane`（同步优先级）重新调度，不能被并发特性打断或推迟——这是「二、14」讲的"发现渲染前后快照不一致就强制同步重渲染"在代码层面的落地。用医生排班 store（`fixtures/hooks` 里的验证用例）模拟"渲染中途外部 store 变化"的场景，实测能确认：有 `checkIfSnapshotChanged` 比较逻辑时，即便渲染过程中 store 被外部修改，最终展示的值也是一致的；如果去掉这层比较（简化为手写 `useState` + `useEffect` 订阅），在人为制造的并发打断场景下能复现读到中间态的问题。

### 5. 其余已落地的 Hooks 与内置能力

除了上面详细展开的部分，仓库里对本篇涉及的其余 Hooks 也都有完整实现，可以直接对照阅读：

- `useRef`/`useMemo`/`useCallback`：`ReactFiberHooks.ts` 的 `mountRef`/`updateRef`、`mountMemo`/`updateMemo`（依赖比较用 `areHookInputsEqual`，逐项 `Object.is`）
- `useEffect`/`useLayoutEffect`/`useInsertionEffect`：共用 `mountEffectImpl`/`updateEffectImpl`，只是传入的 `hookFlags` 不同（`HookPassive`/`HookLayout`/`HookInsertion`），第 05 篇已详细拆解
- `useId`：`mountId`/`updateId`，基于模块级自增计数器生成 `:{prefix}r{n}:` 形式的 id（客户端分支，仓库没有 `hydrateRoot` 因此不做 SSR 路径）
- `useContext`：`packages/react-reconciler/src/ReactFiberNewContext.ts` 的 `readContext`，`HooksDispatcherOnMount`/`OnUpdate` 里都直接指向同一个实现（不区分 mount/update，因为读取的是当前 context 值，不依赖上次渲染的 hook 状态）
- `forwardRef`：`packages/react/src/ReactForwardRef.ts`，把 `render` 函数包装成 `{ $$typeof: REACT_FORWARD_REF_TYPE, render }`，reconciler 靠 `$$typeof` 识别出 `ForwardRef` 这个 WorkTag
- `createPortal`：`packages/react-reconciler/src/ReactPortal.ts`，`react-dom/index.ts` 转出
- Fragment：`packages/react-reconciler/src/ReactChildFiber.ts` 里 `Fragment` 对应独立的 WorkTag（`ReactWorkTags.ts` 中 `Fragment = 7`），Diff 时直接处理其子节点数组，`updateFragment` 负责 Fragment 节点的复用判断
- Error Boundary：`packages/react-reconciler/src/ReactFiberThrow.ts` 的 `throwException` + `packages/react-reconciler/src/ReactFiberClassUpdateQueue.ts` 的 `CaptureUpdate`，验证用例在 `fixtures/error-boundary/index.tsx`（覆盖挂载时抛错、更新时抛错、无边界兜底卸载三种场景）

**唯一的缺口**：`useImperativeHandle` 目前在仓库里**没有对应实现**——`forwardRef` 已经落地，但配套的 `useImperativeHandle` hook 还没有写。它的设计思路和官方源码结构在「二、6」「三」两节已经按 `packages/react-reconciler/src/ReactFiberHooks.js` 的 `mountImperativeHandle`/`updateImperativeHandle` 讲清楚了，如果要在本仓库里补齐，思路是新增一对 `mountImperativeHandle`/`updateImperativeHandle`，本质是一个特殊化的 `useLayoutEffect`——在 layout 阶段把 `ref.current` 设置为 `create()` 返回的对象，而不是设置成真实 DOM 节点。

**验证方式**：`pnpm dev` 起本地调试环境，`fixtures/hooks` 里的用例覆盖 `useState`/`useReducer`/`useEffect`/`useSyncExternalStore` 等核心链路；`fixtures/forwardref-memo` 验证 `forwardRef` 转发 ref 到真实 DOM 节点；`fixtures/error-boundary` 验证三种错误边界场景；`fixtures/context` 验证 `useContext` 与依赖传播。`pnpm build` 与 `tsc --noEmit` 均已验证通过。

---

## 五、手写实现源码地址

- GitHub：https://github.com/lotosv2010/react-source

---

## 六、参考资料

- https://zh-hans.react.dev/
- https://react.iamkasong.com
- https://ahooks.js.org/
- https://github.com/bvaughn/react-error-boundary

---

## 💡 面试核心问

- **`useEffect` 和 `useLayoutEffect` 的执行时机差异是什么？`useInsertionEffect` 又插在哪个时机？**
- **为什么 Hooks 不能写在条件语句或循环里？Hook 链表结构和这条规则具体是怎么关联的？**
- **mount 阶段和 update 阶段的 dispatcher 有什么不同，为什么要拆成两套实现？**
- **什么是并发渲染下的"tearing"？`useSyncExternalStore` 是怎么解决这个问题的？**
- **`useImperativeHandle` 解决了什么问题？为什么不直接把整个 DOM 节点暴露给父组件？**
- **错误边界能捕获哪些类型的异常，不能捕获哪些？为什么 React 至今没有提供 Hooks 形式的错误边界？**

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话核心 | 面试考察频率 |
|--------|-----------|-------------|
| dispatcher 切换 | `renderWithHooks` 渲染前按 mount/update 切换 `ReactCurrentDispatcher.current` | ⭐⭐⭐⭐⭐ |
| Hook 链表 | `fiber.memoizedState` 指向链表头，调用顺序即存储顺序 | ⭐⭐⭐⭐⭐ |
| 调用顺序规则 | 顺序错位导致链表节点对应关系错乱，`updateWorkInProgressHook` 会直接抛错 | ⭐⭐⭐⭐⭐ |
| useState/useReducer | pending 环形链表 + baseState 兜底，与 Class UpdateQueue 结构同源、独立实现 | ⭐⭐⭐⭐ |
| tearing 问题 | 并发渲染中途 store 变化，导致同一次渲染读到不一致的值 | ⭐⭐⭐⭐⭐ |
| useSyncExternalStore | 渲染前后比较快照，不一致则强制 `SyncLane` 同步重渲染 | ⭐⭐⭐⭐⭐ |
| useImperativeHandle | 本质是特殊化的 `useLayoutEffect`，自定义 ref 暴露的方法集合，最小暴露面 | ⭐⭐⭐⭐ |
| Error Boundary 捕获边界 | 只捕获渲染阶段/生命周期/构造函数异常，靠 render 阶段同步 `throw` 触发 | ⭐⭐⭐⭐ |
| createPortal 事件冒泡 | 改变 DOM 挂载位置，不改变 Fiber 树 `return` 指针，冒泡按 Fiber 树走 | ⭐⭐⭐ |

---

## 📝 留个问题

`updateWorkInProgressHook` 在 `nextCurrentHook === null` 时会直接 `throw new Error("Rendered more hooks than during the previous render.")`。但如果反过来——某次渲染因为条件语句**少调用**了一个 Hook（比如上次渲染走了 `if` 分支里的 `useEffect`，这次没走进去），会发生什么？提示：想一想链表长度变短之后，链表上"原本属于第三个 Hook"的节点，会被谁读走。

答案留在评论区，或者在后续系列文章中结合具体源码再展开。

---

> 🔖 这是「React 18 全家桶深度拆解系列」第 6 篇。上一篇：《React 18 commit 阶段: 三个子阶段与 effect 执行顺序原理（面试收藏级）》；下一篇预告：《React 18 并发渲染: Scheduler 时间切片、Lane 模型与 Suspense 原理（面试收藏级）》
