# React 18 Context: 依赖传播机制与手写实现（面试收藏级）

> **副标题**：Context 值挂在 Fiber 节点上，Provider 变化时如何精确标记需要更新的子树

---

## 🎯 这篇文章解决什么问题

上一篇讲完事件系统之后，面试官很可能会转向另一个几乎每个 React 项目都在用、但大多数人只知其一不知其二的 API：**Context**。

大多数人对 Context 的认知停留在"跨层级传值，不用一层一层传 props"。但面试官追问一句"Provider 的 value 变化后，React 是怎么知道该更新哪些组件的"，很多人只能含糊地说"重新渲染呗"——说不清楚这个"重新渲染"发生在哪一步、波及范围有多大。再追问一句"我用 `memo` 包住了消费 Context 的组件，为什么它还是重渲染了"，基本就卡住了。这背后是一个常年被误传的说法："`memo` 能防止任何重渲染"——不对，Context 的传播机制恰恰是 `memo` 挡不住的一个典型场景，本篇会讲清楚这是为什么。

这一篇要讲透的，是 Context 值到底存在哪、`Provider` 变化时 React 如何精确标记出需要更新的子树（而不是把整棵树全部重新渲染一遍）、这套"广播式"传播机制的性能代价在哪，以及业界怎么用 selector 模式绕开这个代价。

读完之后，你会同时获得两种确定感：**懂原理**（`propagateContextChange` 到底做了什么）和**会讲**（面试官顺着任意一个环节追问都能拆解回答）。

---

## 一、使用与实践

### 1. createContext 与 Provider/Consumer 基本用法

用医生工作站的场景建立最基本的心智模型：全局需要知道"当前登录医生"信息的组件很多（顶部导航栏显示姓名、处方单需要自动填入开方医生、操作日志需要记录操作人），一层一层往下传 props 会让中间每一层都被迫接收和转发一个自己不关心的 prop。

```jsx
const CurrentDoctorContext = createContext(null)

function App() {
  const [doctor, setDoctor] = useState({ id: 1, name: '张医生' })

  return (
    <CurrentDoctorContext.Provider value={doctor}>
      <Workspace />
    </CurrentDoctorContext.Provider>
  )
}

function PrescriptionForm() {
  const doctor = useContext(CurrentDoctorContext)
  return <input readOnly value={doctor?.name ?? ''} placeholder="开方医生" />
}
```

`Workspace` 和它的所有后代都不需要显式接收 `doctor` 这个 prop，只有真正需要读取的 `PrescriptionForm` 调用 `useContext(CurrentDoctorContext)` 才会拿到值。`value` 变化时（`setDoctor` 触发新的渲染），React 用 `Object.is` 比较新旧 `value`——只要引用不同就认为"变了"，即便内容相同（比如传入一个每次渲染都新建的对象字面量）也会被判定为变化，这是后面「二、4」要讲的性能陷阱的源头。

> 💬 **面试官会问**：Context 的值变化会导致所有消费组件重渲染吗？
>
> ✅ **标准答案**：不是"所有组件"，而是"所有**真正消费**了这个 Context 的组件"——没有调用 `useContext(XxxContext)` 或没有用 `<XxxContext.Consumer>` 的组件不受影响。但这个"消费"的判断粒度是组件级的：只要一个组件调用了 `useContext`，Provider value 一变它就会被标记更新，不管它实际用到的是 value 里的哪个字段。
>
> 🎁 **加分答案**：这正是"广播式"通知和 Vue 3 依赖追踪的本质区别——React 不知道你在组件里具体读了 value 的哪个字段，只知道"这个 Fiber 读过这个 Context"，所以只能整组件级地标记更新，没法做到字段级精确追踪。

### 2. useContext 的就近匹配规则

多层嵌套的同类型 Provider，`useContext` 只会匹配组件树上"最近"的那一层。

```jsx
<CurrentDoctorContext.Provider value={{ name: '张医生', role: 'attending' }}>
  <div>
    <CurrentDoctorContext.Provider value={{ name: '李医生', role: 'resident' }}>
      <PrescriptionForm /> {/* 读到的是"李医生"，不是"张医生" */}
    </CurrentDoctorContext.Provider>
  </div>
</CurrentDoctorContext.Provider>
```

`PrescriptionForm` 读到的永远是**组件树路径上离它最近的那个 Provider** 提供的值，外层的 Provider 对它完全不可见。这个"就近匹配"不是靠遍历组件树查找实现的，而是靠一个更巧妙的机制——`context._currentValue` 这个字段本身就是"当前生效值"，Provider 渲染子树前把它压栈改写成自己的 `value`，子树渲染完毕后再弹栈恢复成外层的值，读取端永远只需要读这一个字段，不需要关心自己在哪一层。这个压栈/弹栈的具体实现留给「二、1」展开。

### 3. 类组件读取方式：contextType 与 Consumer

```jsx
class LegacyPrescriptionPanel extends React.Component {
  static contextType = CurrentDoctorContext

  render() {
    const doctor = this.context // static contextType 声明后，this.context 直接可用
    return <div>开方医生：{doctor?.name}</div>
  }
}

function ConsumerStylePanel() {
  return (
    <CurrentDoctorContext.Consumer>
      {(doctor) => <div>开方医生：{doctor?.name}</div>}
    </CurrentDoctorContext.Consumer>
  )
}
```

类组件没有 Hooks，只能靠 `static contextType` 让 `this.context` 直接可用（只能订阅一个 Context），或者用 `<Context.Consumer>` 的 render props 写法（可以嵌套多个 Consumer 订阅多个 Context，但会让 JSX 出现明显的"嵌套金字塔"）。函数组件用 `useContext` 可以在一个组件里自由订阅任意多个 Context，不受这个限制，这也是 Hooks 相比类组件生命周期方法在 Context 使用体验上的一个直接改善。

> 💬 **面试官会问**：`static contextType` 和 `<Context.Consumer>` 有什么本质区别？
>
> ✅ **标准答案**：`static contextType` 只能订阅一个 Context，通过 `this.context` 直接读取，代码更简洁；`<Context.Consumer>` 可以在同一个组件里嵌套多个订阅多个 Context，但写法更繁琐（render props 嵌套）。两者最终读的都是同一套底层机制——`context._currentValue`，只是接入方式不同。

🔧 **真实案例**：处方审核这类历史遗留的类组件模块，迁移成本高，直接用 `static contextType` 接入"当前登录医生"这个全局 Context，不需要整体重写成函数组件，是渐进式改造里最常见的落地方式。

---

## 二、设计与原理

### 1. Context 值存储在哪：_currentValue 与栈式压入弹出

Context 对象本身维护一个 `_currentValue` 字段——**这就是当前生效的值**，`useContext`/`readContext` 读的就是这一个字段，没有更复杂的查找逻辑。

Provider 对应的 Fiber 在 `beginWork` 阶段处理时，会把 `context._currentValue` 改写成自己的 `value`（同时把旧值压入一个栈里保存），子树渲染期间读到的都是这个新值；等这个 Provider 的 `completeWork` 阶段执行完（子树已经渲染完毕，即将返回给父级），再把栈顶的旧值弹出来恢复给 `context._currentValue`。

这个"渲染前压栈改写、渲染后弹栈恢复"的动作，正是「一、2」讲的"就近匹配"背后真正发生的事——多层嵌套的 Provider 渲染顺序天然是外层先进、内层后进、内层先出、外层后出（一个标准的栈结构），所以任意时刻 `context._currentValue` 永远等于"当前正在渲染的这条路径上，最近生效的那个 Provider 的 value"，读取端完全不需要关心自己在哪一层、上面套了几层 Provider。

> 💬 **面试官会问**：`useContext` 是怎么"知道"该读哪一层 Provider 的值的？
>
> ✅ **标准答案**：不是靠运行时查找组件树，而是靠 `context._currentValue` 这一个共享字段。Provider 渲染子树前把这个字段改写成自己的 `value`（同时把旧值压栈保存），子树渲染完再弹栈恢复——这样任意时刻这个字段里存的都正好是"当前渲染路径上最近的 Provider 的值"，`useContext` 只需要直接读这一个字段。
>
> 🎁 **加分答案**：这也解释了为什么 Context 的值只在"渲染期间"是稳定可读的——如果在渲染之外（比如某个异步回调里）尝试读 Context，此时压栈弹栈的过程早就结束了，`_currentValue` 可能已经被恢复或改写成别的值，读到的结果是不可预期的，这正是官方文档强调"只能在渲染期间读取 Context"的底层原因。

### 2. 依赖收集：谁读过这个 Context，记在哪

Provider 只负责压栈改写 `_currentValue`，它自己并不知道子树里"谁读了这个值"。真正的记录动作发生在消费端：每次 `useContext(context)` 被调用时，除了返回 `context._currentValue`，还会把这次读取记录追加到**当前渲染中的 Fiber** 的 `dependencies` 链表上——这条链表就是"这个 Fiber 在这次渲染里读过哪些 Context"的完整清单。

这个设计把"谁依赖了谁"这件事从 Provider 一方的职责，转移成了消费端"顺手记一笔"——Provider 不需要遍历子树主动去发现消费者，消费者在读取的那一刻自己把依赖关系记录在自己身上。这条 `dependencies` 链表正是下一节"精确传播"依赖的数据结构基础。

### 3. Provider 变化如何精确标记子树：propagateContextChange

这是本篇的核心机制。Provider 重新渲染时，`updateContextProvider` 用 `Object.is` 比较新旧 `value`：

- **value 没变**（且 `children` 引用也没变）：直接走 bailout，跳过这个 Provider 及其子树的渲染
- **value 变了**：调用 `propagateContextChange`，从这个 Provider 节点开始，**主动向下遍历整棵子树**——检查每一个 Fiber 的 `dependencies` 链表，如果发现其中有一项的 `context` 恰好是当前这个 Context，就给这个 Fiber 打上 `renderLanes` 标记（表示"你需要在本次渲染里更新"），并把这条 lane 沿着 `return` 指针一路冒泡到所有祖先节点的 `childLanes` 上

这个"冒泡到 `childLanes`"的动作很关键：`bailoutOnAlreadyFinishedWork`（React 判断是否可以跳过一个节点的渲染）检查的正是 `childLanes` 是否包含本次 `renderLanes`——如果某个中间节点自身没有更新、但它的 `childLanes` 显示"子树深处有个节点需要更新"，React 依然会"路过"这个中间节点继续往下找，直到真正命中的那个消费者节点。

**这就是"精确标记"的含义**：不是"Provider 变了就把整棵子树都无差别地重渲染一遍"，而是只有 `dependencies` 链表里真正记录了"读过这个 Context"的那些 Fiber 才会被标记更新，其余节点（哪怕在这棵子树里）完全不受影响。

> 💬 **面试官会问**：Context 的值变化会导致所有消费组件重渲染吗？具体的传播机制是怎样的？
>
> ✅ **标准答案**：Provider 的 value 变化后（`Object.is` 比较不相等），React 会从这个 Provider 节点开始主动向下遍历子树，检查每个 Fiber 的 `dependencies` 链表——只有链表里记录了"读过这个 Context"的 Fiber 才会被标记需要更新，这条标记还会沿着祖先路径冒泡到 `childLanes`，保证中间节点即使自己 bailout 也不会挡住这次更新继续往下传递。不消费这个 Context 的兄弟节点完全不受影响。
>
> 🎁 **加分答案**：这个过程叫"eager 传播"（`propagateContextChange_eager`）——之所以强调 eager（即时），是因为它发生在 Provider 的 `beginWork` 阶段，主动一次性扫完整棵子树打好标记，不是等到子树各自渲染时才临时判断。这意味着传播的时间成本和子树规模成正比，子树越大、层级越深，这次扫描的开销越大——这也是「二、4」多层 Context 性能陷阱的另一个成本来源，不只是"重渲染次数多"，扫描本身也有代价。

### 4. 为什么被 memo 包裹也无法完全规避重渲染

这是一个经常被问、也经常被答错的问题。先把 `memo` 的 bailout 判断机制拆开看：`updateMemoComponent` 在 update 阶段，如果这个 Fiber **自身**没有排队的更新（`checkScheduledUpdateOrContext` 检查的是 `current.lanes`），就用浅比较判断新旧 props 是否相等，相等则 `bailoutOnAlreadyFinishedWork` 跳过渲染。

问题就出在这里——`propagateContextChange` 标记更新时，操作的对象是"真正消费了 Context 的那个 Fiber"，而不是包裹它的 `memo` 组件。举个具体例子：

```jsx
const ThemedButton = memo(function ThemedButton() {
  const theme = useContext(ThemeContext)
  return <button>{theme}</button>
})
```

`ThemeContext.Provider` 的 value 变化后，`propagateContextChange` 扫描子树时找到的是 `ThemedButton` 这个 Fiber 本身的 `dependencies`（因为 `useContext` 是在它的函数体里被调用的），直接给它打上更新标记——这个标记不经过、也不会被"`memo` 的浅比较 props"这道检查拦截，因为 `memo` 的 bailout 判断的是"props 有没有变"，而这次更新的触发源根本不是 props，是 Context 的传播机制直接命中了这个 Fiber 自身。**`memo` 能拦住的是"父组件重渲染、但传给我的 props 没变"这种场景，拦不住"我自己订阅的 Context 变了"这种场景**——因为后者根本不走 props 比较这条路径。

> 💬 **面试官会问**：为什么被 `memo` 包裹的组件，在祖先 Context 变化时依旧会重渲染？
>
> ✅ **标准答案**：`memo` 的 bailout 逻辑比较的是"新旧 props 是否相等"，但 Context 变化触发的更新根本不经过 props 这条路径——`propagateContextChange` 直接在这个 Fiber 自身打上更新标记，`memo` 的浅比较判断完全没有介入的机会。换句话说，`memo` 挡的是"父组件重渲染但我的 props 没变"，挡不住"我自己消费的 Context 变了"。
>
> 🎁 **加分答案**：如果想让 `memo` 组件也不受 Context 变化影响，唯一的办法是让它本身不直接 `useContext`——把 Context 读取放到父组件里，读出来的值作为 props 传给 `memo` 子组件，这样子组件重新回到"只比较 props"的判断路径上。但这也意味着父组件本身要重渲染（因为父组件才是真正订阅 Context 的那个），只是避免了子组件跟着重渲染。

### 5. 多层 Context 的性能陷阱与拆分策略

把多个互不相关的状态塞进同一个 Context 的 `value` 是最常见的踩坑写法：

```jsx
// ❌ 反面案例：把"当前医生"和"UI 主题"这两个变化频率完全不同的状态塞进一个 Context
const AppContext = createContext(null)

function App() {
  const [doctor, setDoctor] = useState({ name: '张医生' })
  const [theme, setTheme] = useState('light')

  // 每次渲染都是一个新对象，即便 doctor/theme 都没变，引用也不同
  return (
    <AppContext.Provider value={{ doctor, theme, setDoctor, setTheme }}>
      <Workspace />
    </AppContext.Provider>
  )
}
```

这里有两层问题叠加：一是 `value` 对象本身每次渲染都重新创建，`Object.is` 比较永远是"不相等"，任何一次父组件重渲染（哪怕跟 `doctor`/`theme` 都无关）都会触发一次完整的 `propagateContextChange` 扫描；二是即便解决了引用稳定问题（比如用 `useMemo` 包一层），只要 `theme` 变了，所有只关心 `doctor` 的消费组件依然会被无差别标记更新——因为 Context 的依赖粒度是"整个 value"，不是"value 里的某个字段"。

拆分策略是按"变化频率和粒度"拆成独立的 Context：

```jsx
// ✅ 拆分成两个独立 Context，各自变化互不影响对方的消费者
const DoctorContext = createContext(null)
const ThemeContext = createContext('light')

function App() {
  const [doctor, setDoctor] = useState({ name: '张医生' })
  const [theme, setTheme] = useState('light')

  return (
    <DoctorContext.Provider value={doctor}>
      <ThemeContext.Provider value={theme}>
        <Workspace />
      </ThemeContext.Provider>
    </DoctorContext.Provider>
  )
}
```

现在 `theme` 变化只会触发 `ThemeContext` 的传播扫描，只有真正 `useContext(ThemeContext)` 的组件会被标记更新，跟 `doctor` 相关的消费者完全不受影响。

> 💬 **面试官会问**：如何优化多层 Context 导致的性能问题？
>
> ✅ **标准答案**：两个方向——一是保证 `Provider` 的 `value` 引用稳定（用 `useMemo` 包裹，避免每次渲染都创建新对象，减少不必要的传播扫描）；二是按"变化频率"拆分 Context，把互不相关的状态放进独立的 Context，让一个状态的变化只影响真正关心它的那批消费者，不波及无关的消费者。
>
> 🎁 **加分答案**：拆分 Context 解决的是"粒度"问题，但即便拆到最细，只要一个 Context 的消费者数量足够多、变化频率足够高（比如一个实时更新的患者生命体征数值），广播式重渲染的开销依然存在——这时候需要的是「二、6」讲的 selector 模式，把"值变化"和"要不要重渲染"这两件事解耦。

### 6. use-context-selector 类库的实现思路

社区库（如 `use-context-selector`）解决的正是"Context 粒度太粗"这个问题，核心思路是**绕开原生 Context 的广播机制，自建一套发布订阅系统**：

- 不再用 `React.createContext`，而是自己维护一个"可订阅的 store"（本质是一个值 + 一组监听函数）
- Provider 的 value 变化时，不依赖 `propagateContextChange`，而是主动通知所有注册的监听函数
- 每个消费组件通过 `useContextSelector(context, selector)` 传入一个选择器函数，只有 `selector(newValue)` 相对 `selector(oldValue)` 真正发生变化时，才强制触发这个组件的重渲染（通常配合 `useReducer` 的 dispatch 或 `useState` 的 setter 强制刷新，绕开 React 本身对这个组件的 bailout 判断）

这个模式把"Context 值整体变化"和"某个消费组件是否需要重渲染"两件事彻底解耦——原生 Context 做不到这一点，因为它的依赖记录粒度天生就是"整个 value"，没有"只订阅其中某个字段"的概念。「四」节会手写一个简化版验证这个思路。

> 💬 **面试官会问**：`use-context-selector` 之类的库是怎么绕开原生 Context 的"广播式"更新的？
>
> ✅ **标准答案**：它们不使用原生 `createContext`/`useContext` 的传播机制，而是自己实现一套发布订阅 store——Provider 变化时主动通知所有订阅者，每个订阅者带着一个 `selector` 函数，只有 selector 计算结果真正变化时才强制重渲染。这样"值变了"和"这个组件要不要更新"就不再是原生 Context 那种"读过就必然被标记"的粗粒度绑定，而是精确到 selector 结果这一层。

### 7. 对比 Vue 3 的 provide/inject

Vue 3 的 `provide`/`inject` 基于组件实例的**原型链查找**——`inject` 沿着父组件实例链一层层往上找最近的 `provide`，这一步和 React Context 的"就近匹配"在效果上是相似的。真正的本质区别在于**变化后如何通知消费者**：Vue 3 的响应式系统对 `provide` 的值本身做了细粒度依赖追踪——如果 `provide` 的是一个 `ref`/`reactive` 对象，`inject` 端的组件只有在渲染时**实际读取**了这个响应式对象的哪个具体字段，才会被记录为该字段的依赖；字段变化时只精确通知读过这个字段的组件。

对比来看：React Context 记录的依赖粒度是"这个 Fiber 读过这个 Context 对象"（整体），Vue 3 记录的依赖粒度是"这个组件读过这个响应式对象的哪个字段"（字段级）——这也是为什么 React 天生更容易踩到「二、5」的多层 Context 陷阱，而 Vue 3 的 `provide/inject` 即便把多个状态塞进同一个 `reactive` 对象传下去，只要消费端只读取了其中一个字段，其他字段变化也不会触发它重渲染。这个差异根源上和第 02 篇讲过的两个框架整体设计取舍一致：React 靠运行时启发式判断（bailout 检查 props/lanes），Vue 3 靠编译期+运行时结合的精确依赖收集。

> 💬 **面试官会问**：React 的 Context 机制和 Vue 3 的 `provide/inject` 在实现原理上有什么本质区别？
>
> ✅ **标准答案**：匹配"读哪一层"的规则类似（都是就近查找），但通知粒度完全不同——React Context 的依赖记录是组件级的（"这个组件读过这个 Context"，不管读了 value 的哪个字段），value 变化就整组件标记更新；Vue 3 的响应式系统能追踪到具体字段级别，只有真正读取了变化字段的组件才会被通知。这是 React "广播式"和 Vue 3 "精确依赖追踪"两种设计的核心差异。

---

## 三、源码解析（重点代码，来源 GitHub 仓库）

> React 18 源码地址：https://github.com/facebook/react（本篇断点调试环境已锁定 `v18.3.1`，与前几篇一致）

### 1. createContext：packages/react/src/ReactContext.js

```javascript
// createContext（节选，去掉 DEV 校验分支，保留主链路）
export function createContext(defaultValue) {
  const context = {
    $$typeof: REACT_CONTEXT_TYPE,
    _currentValue: defaultValue,
    _currentValue2: defaultValue, // 兼容双渲染器场景（如 RN 的主/Fabric 渲染器）
    _threadCount: 0,
    Provider: null,
    Consumer: null,
  };

  context.Provider = {
    $$typeof: REACT_PROVIDER_TYPE,
    _context: context,
  };

  context.Consumer = context; // Consumer 直接复用 context 本身（PROD 行为）

  return context;
}
```

**关键点**

1. `_currentValue`/`_currentValue2` 是官方为兼容"同一个应用同时挂两个渲染器"（比如 React Native 同时有主渲染器和 Fabric 渲染器）准备的双份存储，绝大多数只用 `react-dom` 的项目永远只会用到 `_currentValue` 这一份
2. `context.Provider._context` 反向指回 `context` 本身——`beginWork` 处理 `<Context.Provider>` 元素时，靠这根指针从 Provider Fiber 的 `type` 找到对应的 Context 对象
3. `Consumer` 直接等于 `context`，`<Context.Consumer>` 的元素 `type` 因此就是 `context` 对象自身，`$$typeof` 是 `REACT_CONTEXT_TYPE`，这也是 `createFiberFromElement` 能区分 Provider 和 Consumer 元素的依据

### 2. Provider 渲染处理：packages/react-reconciler/src/ReactFiberBeginWork.js

```javascript
// updateContextProvider（节选，保留主链路）
function updateContextProvider(current, workInProgress, renderLanes) {
  const providerType = workInProgress.type;
  const context = providerType._context;

  const newProps = workInProgress.pendingProps;
  const oldProps = workInProgress.memoizedProps;
  const newValue = newProps.value;

  pushProvider(workInProgress, context, newValue);

  if (oldProps !== null) {
    const oldValue = oldProps.value;
    if (is(oldValue, newValue)) {
      if (oldProps.children === newProps.children) {
        return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
      }
    } else {
      propagateContextChange(workInProgress, context, renderLanes);
    }
  }

  const newChildren = newProps.children;
  reconcileChildren(current, workInProgress, newChildren, renderLanes);
  return workInProgress.child;
}
```

**关键点**

1. `pushProvider` 永远在最前面无条件执行——即使后面判断出可以 bailout，`context._currentValue` 也必须先改写成新值，因为子树读取（包括被跳过渲染但仍需读取当前值的场景）依赖的就是这个字段
2. `is(oldValue, newValue)` 用的是 `Object.is`（比 `===` 多处理了 `NaN`/`+0`/`-0` 这几个边界情况），这是"value 变化"判断的唯一依据
3. `oldProps === null` 对应 mount 阶段（没有 `current` 树可比较），直接跳过判断走到 `reconcileChildren`

### 3. 变化传播算法：packages/react-reconciler/src/ReactFiberNewContext.js

```javascript
// propagateContextChange_eager（节选，保留主链路遍历逻辑）
function propagateContextChange_eager(workInProgress, context, renderLanes) {
  let fiber = workInProgress.child;
  if (fiber !== null) {
    fiber.return = workInProgress;
  }
  while (fiber !== null) {
    let nextFiber;

    const list = fiber.dependencies;
    if (list !== null) {
      nextFiber = fiber.child;

      let dependency = list.firstContext;
      while (dependency !== null) {
        if (dependency.context === context) {
          if (fiber.tag === ClassComponent) {
            const update = createUpdate(NoTimestamp, pickArbitraryLane(renderLanes));
            update.tag = ForceUpdate;
            enqueueUpdate(fiber, update, renderLanes);
          }
          fiber.lanes = mergeLanes(fiber.lanes, renderLanes);
          const alternate = fiber.alternate;
          if (alternate !== null) {
            alternate.lanes = mergeLanes(alternate.lanes, renderLanes);
          }
          scheduleContextWorkOnParentPath(fiber.return, renderLanes, workInProgress);
          list.lanes = mergeLanes(list.lanes, renderLanes);
          break;
        }
        dependency = dependency.next;
      }
    } else if (fiber.tag === ContextProvider) {
      nextFiber = fiber.type === workInProgress.type ? null : fiber.child;
    } else {
      nextFiber = fiber.child;
    }

    if (nextFiber !== null) {
      nextFiber.return = fiber;
    } else {
      nextFiber = fiber;
      while (nextFiber !== null) {
        if (nextFiber === workInProgress) {
          nextFiber = null;
          break;
        }
        const sibling = nextFiber.sibling;
        if (sibling !== null) {
          sibling.return = nextFiber.return;
          nextFiber = sibling;
          break;
        }
        nextFiber = nextFiber.return;
      }
    }
    fiber = nextFiber;
  }
}
```

**关键点**

1. 这是一个手写的树遍历循环（不是递归），用 `nextFiber` 决定"往下走（子节点）还是往旁走（兄弟节点）还是往上回溯（沿 `return` 链）"，效果等价于深度优先遍历整棵子树，但不占用额外的调用栈——这和 `workLoop` 用循环替代递归遍历 Fiber 树是同一种工程考量
2. 命中依赖的 Fiber 如果是 `ClassComponent`，还会额外创建一个 `ForceUpdate` 类型的 Update 塞进它的更新队列——这是因为类组件即便 props/state 都没变，也需要一个"强制更新"信号才会重新渲染，函数组件没有这个额外步骤（函数组件本身只要 `lanes` 命中就会重新执行）
3. 遇到嵌套的同类型 Provider（`fiber.type === workInProgress.type`）会直接跳过它的子树不再继续扫描——因为这层内部的 value 已经被内层 Provider 覆盖了，内层 Provider 自己重新渲染时会负责处理它自己的子树传播，不需要外层重复扫描

### 4. Context 读取：packages/react-reconciler/src/ReactFiberNewContext.js

```javascript
// readContext（节选）
function readContext(context) {
  const value = context._currentValue;

  if (lastFullyObservedContext === context) {
    // noop
  } else {
    const contextItem = {
      context,
      memoizedValue: value,
      next: null,
    };

    if (lastContextDependency === null) {
      lastContextDependency = contextItem;
      currentlyRenderingFiber.dependencies = {
        lanes: NoLanes,
        firstContext: contextItem,
      };
    } else {
      lastContextDependency = lastContextDependency.next = contextItem;
    }
  }
  return value;
}
```

**关键点**

1. 读取值本身只是一句 `context._currentValue`，真正的重点是紧跟着的依赖记录逻辑——把这次读取包装成一个 `contextItem` 节点，追加到 `currentlyRenderingFiber.dependencies` 链表上
2. `currentlyRenderingFiber` 是渲染当前函数组件时全局记录的"正在渲染的 Fiber"，`readContext` 靠这个变量知道该把依赖记在哪个 Fiber 身上——这也是为什么 Context 只能在渲染期间读取：渲染之外这个变量是 `null`
3. `dependencies.lanes` 字段用于「二、3」讲的场景之外的另一种情况——如果这个 Fiber 因为其它原因触发了 bailout 检查，`lanes` 记录着"这条依赖链表最后一次被标记更新是哪个 lane"，配合 `isSubsetOfLanes` 判断当前这次渲染是不是因为 Context 更新触发的

### 5. useContext Hook 入口：packages/react-reconciler/src/ReactFiberHooks.js

```javascript
// HooksDispatcherOnMount / HooksDispatcherOnUpdate（节选，只保留 useContext 相关）
const HooksDispatcherOnMount = {
  useContext: readContext,
  // ...其余 Hook
};

const HooksDispatcherOnUpdate = {
  useContext: readContext,
  // ...其余 Hook
};
```

**关键点**：`useContext` 是全部 Hook 里少数**不区分 mount/update 两套实现**的一个——两个 dispatcher 表里挂的都是同一个 `readContext` 函数。这是因为 `useContext` 的语义是"读取当前值"，不依赖"上一次渲染的 Hook 状态"（没有类似 `useState` 的"上次的 state 是什么"这种需要维护的内部状态），mount 和 update 阶段要做的事完全一样，不需要像其它 Hook 那样为 mount 阶段单独准备一套初始化逻辑。

---

## 四、手写实现（解读已完成代码 + 新增 createContextSelector）

本节基于本地真实项目 `D:\github\react-source`（GitHub：https://github.com/lotosv2010/react-source）编写。先说明一件事：`createContext`、`pushProvider`/`popProvider`、`readContext`、`propagateContextChange`、`updateContextProvider`、`useContext` 接入 dispatcher——**这些都不是本篇新写的代码**，它们是这个项目在实现 Context API 时（对应仓库 commit 历史里的 `8811561 feat(react): 实现context`、`1eb52a8 feat(usecontext): 实现useContext`、`0cefd44 feat(reconciler): 实现 Context API`）就已经落地并跑通的真实代码。本篇的任务是把这些已经跑通的代码逐段讲透，并在此基础上新增此前一直缺失的对比方案：**`createContextSelector`**。

### 1. createContext：packages/react/src/ReactContext.ts（已有代码）

```typescript
/**
 * createContext() - 创建一个 Context 对象
 * @param defaultValue - 没有匹配到 Provider 时，消费端读到的默认值
 */
export function createContext<T>(defaultValue: T): ReactContext<T> {
  const context = {
    $$typeof: REACT_CONTEXT_TYPE,
    _currentValue: defaultValue,
    Provider: null as any,
    Consumer: null as any,
  } as ReactContext<T>;

  context.Provider = {
    $$typeof: REACT_PROVIDER_TYPE,
    _context: context,
  } as ReactProviderType<T>;

  context.Consumer = context;

  return context;
}
```

这份实现对照官方做了一处刻意的简化：只支持单一渲染器（`react-dom`），省去了官方为兼容双渲染器准备的 `_currentValue2`/`_currentRenderer2` 字段；`Consumer` 也不做 DEV 模式下的警告代理对象，直接复用 `context` 本身——这对应「三、1」官方源码关键点里提到的 PROD 行为，简化版直接对齐生产环境的行为路径，省掉开发环境专属的警告分支。

### 2. Context 读写与传播：packages/react-reconciler/src/ReactFiberNewContext.ts（已有代码）

`pushProvider`/`popProvider` 是「二、1」讲的栈式压入弹出在代码层面的直接体现：

```typescript
export function pushProvider<T>(
  providerFiber: FiberNode,
  context: ReactContext<T>,
  nextValue: T,
): void {
  push(valueCursor, context._currentValue, providerFiber);
  context._currentValue = nextValue;
}

export function popProvider(
  context: ReactContext<any>,
  providerFiber: FiberNode,
): void {
  const currentValue = valueCursor.current;
  pop(valueCursor, providerFiber);
  context._currentValue = currentValue;
}
```

`valueCursor` 是一个基于 `ReactFiberStack.ts` 实现的通用栈结构——`push` 把旧值存进栈里，`context._currentValue` 立刻更新为新值；`pop` 把栈顶的旧值取出来，重新赋回 `context._currentValue`。这两个函数分别在 `beginWork`（`updateContextProvider` 里）和 `completeWork`（`ContextProvider` 分支里）被调用，一进一出正好对应"渲染前改写、渲染后恢复"，与官方设计完全一致。

`readContext` 的依赖收集逻辑对应「三、4」讲的官方实现：

```typescript
export function readContext<T>(context: ReactContext<T>): T {
  const value = context._currentValue;

  const contextItem = {
    context: context as ReactContext<any>,
    memoizedValue: value,
    next: null,
  };

  if (lastContextDependency === null) {
    if (currentlyRenderingFiber === null) {
      throw new Error(
        "Context can only be read while React is rendering. " +
          "In classes, you can read it in the render method or getDerivedStateFromProps. " +
          "In function components, you can read it directly in the function body, but not " +
          "inside Hooks like useReducer() or useMemo().",
      );
    }
    lastContextDependency = contextItem;
    currentlyRenderingFiber.dependencies = {
      lanes: NoLanes,
      firstContext: contextItem,
    };
  } else {
    lastContextDependency = lastContextDependency.next = contextItem;
  }

  return value;
}
```

`currentlyRenderingFiber === null` 时直接抛错，错误信息原样保留了官方的提示文案——这正是「一、1」结尾提到的"只能在渲染期间读取 Context"这条规则的强制校验点，在渲染阶段之外（比如事件回调里）调用 `useContext` 会立刻在这里报错，而不是静默返回一个错误的值。

`propagateContextChange` 的整体遍历结构与「三、3」的官方实现逐行对应，这份实现省去了 `ClassComponent` 的 `ForceUpdate` 分支（项目当前的 Class 组件更新链路走的是自己的 `UpdateQueue`，Context 传播只需要标记 `lanes` 即可触发它重新渲染），保留了完整的树遍历循环、`scheduleContextWorkOnParentPath` 冒泡 `childLanes` 的逻辑，以及"遇到嵌套同类型 Provider 直接跳过其子树"的优化分支。

### 3. Provider 渲染处理：packages/react-reconciler/src/ReactFiberBeginWork.ts（已有代码）

```typescript
function updateContextProvider(
  current: FiberNode | null,
  workInProgress: FiberNode,
  renderLanes: Lanes,
): FiberNode | null {
  const providerType: ReactProviderType<any> = workInProgress.type;
  const context: ReactContext<any> = providerType._context;

  const newProps = workInProgress.pendingProps;
  const oldProps = workInProgress.memoizedProps;
  const newValue = newProps.value;

  pushProvider(workInProgress, context, newValue);

  if (current !== null && oldProps !== null) {
    const oldValue = oldProps.value;
    if (is(oldValue, newValue)) {
      if (oldProps.children === newProps.children) {
        return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
      }
    } else {
      propagateContextChange(workInProgress, context, renderLanes);
    }
  }

  const newChildren = newProps.children;
  reconcileChildren(current, workInProgress, newChildren, renderLanes);
  return workInProgress.child;
}
```

这段代码与「三、2」的官方实现几乎逐行一致，唯一的差异是判断条件多了一层 `current !== null`（等价于官方 `oldProps !== null` 隐含的"存在上一次渲染"这个前提，写法更显式）。`beginWork` 里另一处对应的分支——`attemptEarlyBailoutIfNoScheduledUpdate` 中专门为 `ContextProvider` 补了一段特殊处理：

```typescript
function attemptEarlyBailoutIfNoScheduledUpdate(
  current: FiberNode,
  workInProgress: FiberNode,
  renderLanes: Lanes,
): FiberNode | null {
  // ContextProvider 的栈必须压——即使这个 fiber 本身 bailout，
  // 子树读到的 context._currentValue 也得是新值
  if (workInProgress.tag === ContextProvider) {
    const newValue = workInProgress.memoizedProps.value;
    const context: ReactContext<any> = workInProgress.type._context;
    pushProvider(workInProgress, context, newValue);
  }
  return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
}
```

这是一处很容易被忽略、但对正确性至关重要的细节：即便这个 Provider 因为"父级更早触发的更早 bailout 判断"被提前跳过（走的是另一条更早的 bailout 路径，不是 `updateContextProvider` 内部的判断），`context._currentValue` **依然必须被压栈改写成这个 Provider 的值**——否则子树里那些真正读取这个 Context 的消费者会读到错误的（外层的）值。这行代码直接对应「二、1」强调的"压栈动作必须无条件先执行"这条设计原则。

### 4. useContext 接入 dispatcher：packages/react-reconciler/src/ReactFiberHooks.ts（已有代码）

```typescript
const HooksDispatcherOnMount = {
  // ...
  // useContext 不区分 mount/update：读取的是当前 context 值，不依赖上次渲染的 hook 状态
  // （官方两个 dispatcher 里都是同一个 readContext），不需要额外的 mountContext 包装
  useContext: readContext,
  // ...
};

const HooksDispatcherOnUpdate = {
  // ...
  useContext: readContext,
  // ...
};
```

与「三、5」讲的官方设计完全一致——`useContext` 是这份手写实现里唯一一个 mount/update 两张 dispatcher 表指向同一个函数的 Hook，直接复用第 06 篇搭好的 dispatcher 切换机制（`renderWithHooks` 渲染前根据 mount/update 阶段切到对应的表），不需要为 Context 单独写切换逻辑。

### 5. 验证广播式重渲染：复用 fixtures/context 现有 demo

仓库里已有的 `fixtures/context/index.tsx` 正好覆盖了本篇要验证的三个现象，直接复用运行：

```typescript
const ThemeContext = createContext<string>("light");
let consumerRenderCount = 0;
let siblingRenderCount = 0;

function ThemedButton(): any {
  const theme = useContext(ThemeContext);
  consumerRenderCount += 1;
  console.log(`ThemedButton 渲染第 ${consumerRenderCount} 次，theme=${theme}`);
  return <button>当前主题：{theme}</button>;
}

// 不消费 context 的兄弟组件：Provider value 变化时，它不应该跟着重渲染
function UnrelatedSibling(): any {
  siblingRenderCount += 1;
  console.log(`UnrelatedSibling 渲染第 ${siblingRenderCount} 次（不应随 theme 变化）`);
  return <p>我不关心 theme</p>;
}
```

点击"切换主题"按钮触发 `setTheme` 后，控制台日志能直接验证：
- `ThemedButton`（真正 `useContext` 的消费者）每次都重渲染，`consumerRenderCount` 递增
- `UnrelatedSibling`（不消费 Context 的兄弟节点）渲染次数保持不变——`propagateContextChange` 扫描到它时，`dependencies` 是 `null`，不会被标记
- `<ThemeContext.Consumer>` 的 render props 写法同样能读到最新值
- 没有被 `Provider` 包裹的 `ThemedButton` 分支始终读到 `createContext` 的默认值 `"light"`

这组现象直接对应「二、3」讲的"精确标记"——不是整棵子树无差别重渲染，而是只有真正 `dependencies` 命中的 Fiber 才会更新。

### 6. 本篇新增：createContextSelector

这是本篇真正新写的代码，用于对比「二、6」讲的 selector 模式和原生 Context 广播机制在"多消费者+高频变化"场景下的重渲染次数差异。核心思路是绕开 `createContext`/`useContext`，自建一个基于 `useState` 强制刷新的订阅 store：

```typescript
// fixtures/context-selector/createContextSelector.ts
// 📚 知识点：不使用 React 原生 Context 的传播机制，自己维护一个"可订阅的值容器"——
// Provider 变化时主动通知所有订阅者，每个订阅者带一个 selector，只有 selector 计算结果
// 真正变化（Object.is 比较）时才用 useState 的 setter 强制这个组件重渲染。
// 这样"值变化"和"组件是否需要更新"就从原生 Context 的"整体绑定"解耦成了"按 selector 结果绑定"。
import { createContext, useContext, useEffect, useRef, useState } from "react";

interface Store<T> {
  getState: () => T;
  setState: (next: T) => void;
  subscribe: (listener: () => void) => () => void;
}

function createStore<T>(initialValue: T): Store<T> {
  let state = initialValue;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState: (next) => {
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function createContextSelector<T>(initialValue: T) {
  const StoreContext = createContext<Store<T> | null>(null);

  function Provider({
    value,
    children,
  }: {
    value: T;
    children: React.ReactNode;
  }): any {
    // 用 ref 保存 store 实例，Provider 每次渲染只同步最新 value 进 store，不重新创建 store
    const storeRef = useRef<Store<T>>();
    if (!storeRef.current) {
      storeRef.current = createStore(value);
    } else {
      storeRef.current.setState(value);
    }
    return (
      <StoreContext.Provider value={storeRef.current}>
        {children}
      </StoreContext.Provider>
    );
  }

  function useSelector<S>(selector: (state: T) => S): S {
    const store = useContext(StoreContext);
    if (store === null) {
      throw new Error("useSelector 必须在对应的 Provider 内部使用");
    }
    // 用 useState 的 setter 强制刷新——不依赖原生 Context 的传播机制
    const [selectedValue, setSelectedValue] = useState(() =>
      selector(store.getState()),
    );
    const selectorRef = useRef(selector);
    selectorRef.current = selector;

    useEffect(() => {
      // 每次 store 变化都重新计算 selector，只有结果真正变化才 setState 触发重渲染
      const checkForUpdates = () => {
        const newSelectedValue = selectorRef.current(store.getState());
        setSelectedValue((prev) =>
          Object.is(prev, newSelectedValue) ? prev : newSelectedValue,
        );
      };
      return store.subscribe(checkForUpdates);
    }, [store]);

    return selectedValue;
  }

  return { Provider, useSelector };
}
```

**关键点**

1. 这里没有用 React 的 `propagateContextChange` 传播链路——`Provider` 的 `value` 变化时，走的是 `storeRef.current.setState(value)`，直接调用所有 `listeners`，与 React 的 Fiber 树遍历完全无关
2. `useSelector` 内部的 `setSelectedValue` 才是真正触发这个组件重渲染的机制——`Object.is` 比较新旧 `selector` 结果，只有真正不同才调用 `setState`，否则 `checkForUpdates` 跑了一遍但组件毫无反应
3. 这个实现思路和第 06 篇讲的 `useSyncExternalStore` 高度相似（`subscribe` + `getSnapshot` 模式），社区库 `use-context-selector` 的新版本实际上就是直接基于 `useSyncExternalStore` 实现的——这里为了讲清楚"最原始的思路"，故意用更基础的 `useState`+`useEffect` 手写，不直接调用 `useSyncExternalStore`

### 7. 重渲染次数对比 demo

用同一个"医生工作站患者队列广播"场景，分别接入原生 Context 和 `createContextSelector`，验证重渲染次数差异：

```typescript
// fixtures/context-selector/index.tsx
import { createContextSelector } from "./createContextSelector";

interface QueueState {
  waitingCount: number;
  currentPatientName: string;
}

const { Provider: QueueProvider, useSelector: useQueueSelector } =
  createContextSelector<QueueState>({ waitingCount: 0, currentPatientName: "" });

let waitingCountRenderTimes = 0;
let currentPatientRenderTimes = 0;

// 只关心排队人数的面板：currentPatientName 变化时不应该重渲染
function WaitingCountPanel(): any {
  const waitingCount = useQueueSelector((s) => s.waitingCount);
  waitingCountRenderTimes += 1;
  console.log(`WaitingCountPanel 渲染第 ${waitingCountRenderTimes} 次`);
  return <p>排队人数：{waitingCount}</p>;
}

// 只关心当前患者的面板：waitingCount 变化时不应该重渲染
function CurrentPatientPanel(): any {
  const currentPatientName = useQueueSelector((s) => s.currentPatientName);
  currentPatientRenderTimes += 1;
  console.log(`CurrentPatientPanel 渲染第 ${currentPatientRenderTimes} 次`);
  return <p>当前接诊：{currentPatientName}</p>;
}
```

跑法：`pnpm dev` 起本地 Vite 环境，连续多次只更新 `waitingCount`（比如模拟排队人数递增，`currentPatientName` 保持不变）。用原生 Context 版本（`ThemeContext` 那套广播机制）实现同样的两个面板，会看到 `CurrentPatientPanel` 跟着 `WaitingCountPanel` 一起重渲染——因为两者读的是同一个 Context 的 `value`，`Object.is` 比较的是整个 `value` 对象，只要其中任何字段变了就判定为"变了"；换成 `createContextSelector` 版本，`CurrentPatientPanel` 的渲染次数计数器保持不变，只有 `WaitingCountPanel` 递增——因为 `useSelector` 里的 `Object.is` 比较的是 selector 算出来的具体字段值，`currentPatientName` 字段本身没变，`selector` 结果自然也没变，不会触发 `setState`。

这组对比直接把「二、5」讲的多层 Context 陷阱和「二、6」讲的 selector 思路从"理论上应该这样"变成了肉眼可见的重渲染计数器差异。`pnpm build` 与 `tsc --noEmit` 均已验证通过，新增的 `createContextSelector` 及其 demo 没有引入类型错误。

至此，第 01 篇搭建的 monorepo 骨架里，`beginWork`/`completeWork`/`commitRoot`/Diff 算法/Hooks/调度器/事件系统/Context 全部从最初的简化占位替换成了真实实现，形成一份可完整跑通、覆盖 React 18 核心链路的手写版本。

---

## 五、手写实现源码地址

- GitHub：https://github.com/lotosv2010/react-source

---

## 六、参考资料

- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com
- https://github.com/wbccb/Frontend-Articles

---

## 💡 面试核心问

- **Context 的值变化会导致所有消费组件重渲染吗？具体的传播机制是怎样的？**
- **为什么被 `memo` 包裹的组件，在祖先 Context 变化时依旧会重渲染？**
- **如何优化多层 Context 导致的性能问题？**
- **React 的 Context 机制和 Vue 3 的 `provide/inject` 在实现原理上有什么本质区别？**
- **`use-context-selector` 之类的库是怎么绕开原生 Context 的"广播式"更新的？**

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话核心 | 面试考察频率 |
|--------|-----------|-------------|
| 值存储位置 | `context._currentValue`，Provider 渲染前压栈改写、渲染后弹栈恢复 | ⭐⭐⭐⭐ |
| 就近匹配原理 | 靠栈式压入弹出天然实现，不是运行时遍历组件树查找 | ⭐⭐⭐ |
| 依赖收集 | 消费端 `readContext` 把读取记录追加到自身 `dependencies` 链表 | ⭐⭐⭐⭐ |
| propagateContextChange | 从 Provider 向下扫子树，命中 `dependencies` 就打标记并冒泡 `childLanes` | ⭐⭐⭐⭐⭐ |
| memo 挡不住 Context | Context 更新走 Fiber 自身标记，不经过 props 比较这条路径 | ⭐⭐⭐⭐⭐ |
| 多层 Context 陷阱 | 依赖粒度是整个 value，任意字段变化都会波及全部消费者 | ⭐⭐⭐⭐ |
| selector 模式 | 自建订阅 store，绕开广播机制，按字段级比较决定是否强制重渲染 | ⭐⭐⭐⭐ |
| 对比 Vue 3 | React 组件级广播 vs Vue 3 响应式系统的字段级精确追踪 | ⭐⭐⭐ |

---

## 📝 思考题

**留个问题**：`propagateContextChange` 扫描到"嵌套的同类型 Provider"时会直接跳过它的整棵子树，不再继续往下扫描。如果去掉这个优化分支（改成无论如何都继续往下扫描内层 Provider 的子树），程序的最终结果会不会出错？会带来什么样的额外开销？提示：想一想内层 Provider 自己重新渲染时会做什么，以及"同一棵子树被扫描两次"具体浪费在哪一步。

答案留在评论区，或者在后续 React Router 篇（第 10 篇）涉及 Context 在路由方案里的实际应用时会再次提到相关细节。

---

> 🔖 这是「React 18 全家桶深度拆解系列」第 9 篇。上一篇：《React 18 事件系统: 合成事件与自动批处理原理（面试收藏级）》；下一篇预告：《React Router 6/7: Data Router 预取数据范式与权限路由实战（生产收藏级）》
