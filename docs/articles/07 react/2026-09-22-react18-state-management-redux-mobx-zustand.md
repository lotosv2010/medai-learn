# React 状态管理：Redux Toolkit 源码解析与 MobX/Zustand 选型对比（面试收藏级）

> **副标题**：Redux 发布订阅与 Immer、RTK Query、Zustand 极简订阅、MobX 响应式、dva 历史方案

---

## 🎯 这篇文章解决什么问题

面试官问"说一下 Redux 的数据流"，大多数人能答出"发布订阅"四个字，但追问一句"`store.subscribe` 注册的监听器，是在 `dispatch` 的哪一步被执行的，执行顺序有没有保证"，很多人就开始含糊。再追问一句"`react-redux` 的 `useSelector` 凭什么能做到只有相关字段变化才重渲染，这和第 06 篇讲的并发渲染 tearing 问题有什么关系"，能完整答下来的人已经不多。追到第三层——"Redux Toolkit 的 `createSlice` 里明明写的是 `state.count++`，为什么这种"看似直接修改"的写法不会破坏 Redux 的不可变约定，Immer 到底做了什么"——这道题基本能筛掉大部分候选人。

这三层追问对应的正是状态管理这个话题里最容易"会用不会讲"的三个知识点：发布订阅的执行细节、精确订阅的实现原理、Immer 的 Proxy 记录机制。这一篇要讲透的，除了 Redux 本身，还有 MobX 的 Proxy 响应式、Zustand 的极简订阅、dva 的 Generator/Saga 方案——四条路线放在一起对比，才能看清"状态管理"这件事在不同设计取舍下长成了什么样子。

读完之后，你会同时获得两种确定感：**懂原理**（Redux/react-redux/MobX 的手写实现逐行讲透，Redux Toolkit 和 Zustand 的官方实现原理讲透）和**会讲**（面试官顺着发布订阅、tearing、Immer、选型任意一个环节追问都能拆解回答）。

---

## 一、Redux 核心：发布订阅模式与三个基础 API

### 1. 基本使用

Redux 的心智模型只有三个动作：拿状态、改状态、订阅变化。

```javascript
import { createStore } from 'redux'

function counterReducer(state = { count: 0 }, action) {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 }
    default:
      return state
  }
}

const store = createStore(counterReducer)

store.subscribe(() => {
  console.log('状态变化了：', store.getState())
})

store.dispatch({ type: 'increment' }) // 状态变化了： { count: 1 }
```

`reducer` 必须是纯函数：同样的 `(state, action)` 输入永远得到同样的输出，不允许在里面发请求、改全局变量、直接修改 `state` 引用。这条约定是整个 Redux 可预测性的地基——没有它，`store.subscribe` 拿到的"变化"就无法追溯来源。

> 💬 **面试官会问**：用一句话描述 Redux 的数据流转过程？
>
> ✅ **标准答案**：视图触发 `dispatch(action)` → `reducer(currentState, action)` 计算出新 state → `store` 内部替换 `currentState` 引用 → 遍历执行所有通过 `subscribe` 注册的监听器 → 监听器里去 `getState()` 读最新状态驱动视图更新。整个过程是单向的，状态永远从 `reducer` 的返回值流出，不存在"视图直接改状态"这条路径。

### 2. createStore：发布订阅模式的最小实现

下面这份代码来自本地手写仓库 `redux-source/src/lib/redux/createStore.js`，是理解 Redux 内部机制最直接的入口：

```javascript
import ActionTypes from './actionTypes';

export default function createStore(reduce, preloadedState) {
  const currentReduce = reduce; // 当前的 reducer
  let currentState = preloadedState; // 当前状态
  let currentListeners = []; // 订阅池

  // 派发动作，修改 state
  const dispatch = (action) => {
    currentState = currentReduce(currentState, action);
    currentListeners.forEach(listener => listener())
    return action
  }

  // 获取当前的 state
  const getState = () => {
    return currentState;
  }

  // 订阅
  const subscribe = (listener) => {
    currentListeners.push(listener)
    return function unsubscribe() {
      currentListeners = currentListeners.filter(l => l !== listener);
    }
  }
  dispatch({ type: ActionTypes.INIT })

  return {
    dispatch,
    getState,
    subscribe
  }
}
```

**关键点**

1. `currentState`/`currentListeners` 都是闭包变量，`store` 对外暴露的三个方法共享同一份闭包——这就是"整个应用只有一个 store"这条 Redux 铁律在代码层面的直接体现，没有任何机制阻止你创建第二个 `store`，但 `currentState` 和 `currentListeners` 之间不会共享
2. `dispatch` 的核心只有两行：先算新状态、再遍历执行监听器——这里没有对比新旧 state 是否相等，也没有对监听器做任何优先级或去重处理，是最朴素的发布订阅实现
3. `subscribe` 返回一个 `unsubscribe` 函数，用 `filter` 而不是 `splice` 移除监听器，避免了"在遍历 `currentListeners` 的过程中同时修改这个数组"可能引发的下标错位问题
4. `createStore` 内部主动 `dispatch` 一次 `{ type: ActionTypes.INIT }`，让 `reducer` 走一遍默认分支拿到初始状态——这也是为什么 `reducer` 一定要写 `state = initialState` 默认参数，否则第一次初始化时 `state` 会是 `undefined`

> 💬 **面试官会问**：`store.subscribe` 注册的多个监听器，执行顺序有保证吗？
>
> ✅ **标准答案**：有，就是注册顺序——`currentListeners` 是一个数组，`dispatch` 里用 `forEach` 按下标从前到后依次执行，先 `subscribe` 的先执行。
>
> 🎁 **加分答案**：如果在监听器执行过程中调用 `unsubscribe` 或者 `subscribe` 新增监听器，这份最小实现里 `currentListeners.forEach` 用的还是本轮 `dispatch` 开始时那份数组引用（`filter` 生成新数组，不会影响正在遍历的旧数组），所以本轮不会执行新增的监听器，也不会漏执行本轮已经开始遍历的旧监听器——这是"遍历时先拷贝一份快照"这类并发安全写法的雏形。

### 3. combineReducers：分治合并与引用比较优化

真实项目里状态往往按模块拆分成多棵子树，`combineReducers` 解决的是"多个独立的 reducer 怎么合并成一个"：

```javascript
function combineReducers(reducers) {
  const reducerKeys = Object.keys(reducers);
  const finalReducers = {};
  //  过滤不是函数的属性
  for (const key of reducerKeys) {
    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key];
    }
  }
  return (state = {}, action) => {
    // 此次派发动作是否引起了状态的更新
    let hasChanged = false;
    const nextState = {};
    for (const key in finalReducers) {
      // finalReducers[key] 处理函数
      // state[key] 老的状态
      nextState[key] = finalReducers[key](state[key], action); // 获取新的状态
      // 判断是否由分状态发生变化，为了性能优化
      // 如果状态没有变化就用老的状态，这样状态不变，可能不需要重新渲染
      hasChanged = hasChanged || nextState[key] !== state[key]
    }
    hasChanged = hasChanged || Object.keys(finalReducers).length !== Object.keys(state).length
    return hasChanged ? nextState : state
  }
}
export default combineReducers
```

**关键点**

1. 返回的是一个新的 reducer 函数——`combineReducers` 本身不存储任何状态，它只是把多个子 reducer"编排"成一个统一入口，真正的状态仍然全部由 `createStore` 里那一份 `currentState` 持有
2. 每次 `dispatch`，所有子 reducer 都会被无差别地调用一遍（即使这个 action 跟某个子 reducer 完全无关），这是 Redux "reducer 必须处理所有未知 action（默认返回原 state）"这条约定存在的原因——否则某个子 reducer 收到不认识的 action 就会返回 `undefined`
3. `hasChanged` 是这份代码里最值得注意的性能优化：只要所有子 reducer 返回的都是原来的引用（说明子 reducer 内部判断"这个 action 跟我无关"直接 `return state`），最终 `combineReducers` 也会返回原来的顶层 `state` 引用而不是新对象——这个"引用不变"的信号会一路传递到 `react-redux` 的 `useSelector`，是"没有变化就不重渲染"这条优化链路的第一环

### 4. applyMiddleware：洋葱模型的柯里化链条

中间件要解决的问题是"在 `dispatch` 真正执行之前或之后插入一段自定义逻辑"（打日志、处理异步 action、上报埋点），`applyMiddleware.js` 是这条链路的核心：

```javascript
import compose from './compose';

function applyMiddleware(...middlewares) {
  return function storeEnhancer(createStore) {
    return function storeEnhancerStoreCreator(reducer) {
      const store = createStore(reducer);
      const { getState, dispatch } = store;
      let newDispatch;
      const middlewareAPI = { getState, dispatch: action => newDispatch(action) }
      const chain = middlewares.map(middleware => middleware(middlewareAPI));
      // newDispatch = middleware(middlewareAPI)(dispatch)
      newDispatch = compose(...chain)(dispatch);
      return {
        ...store,
        dispatch: newDispatch
      }
    }
  }
}

export default applyMiddleware;
```

**关键点**

1. 每个中间件的标准形态是三层柯里化函数：`middleware = middlewareAPI => dispatch => action => {...}`——第一层拿到 `{ getState, dispatch }`，第二层拿到"链条中下一个环节的 `dispatch`"，第三层才是真正处理 `action` 的地方
2. `chain = middlewares.map(middleware => middleware(middlewareAPI))` 把每个中间件的第一层柯里化先执行掉，得到一组"只差一个 `dispatch` 参数"的函数；`compose(...chain)(dispatch)` 再把原始 `dispatch` 作为最内层参数喂进去，从右到左依次包裹，形成"洋葱模型"——`action` 从最外层中间件进入，一层一层往里传，到最内层的原始 `dispatch` 执行，再一层一层往外返回
3. `middlewareAPI.dispatch: action => newDispatch(action)` 这里故意不直接引用 `newDispatch`（此时它还没被赋值，是 `undefined`），而是包一层箭头函数延迟引用——这样中间件内部拿到的 `dispatch` 始终指向"链条包装完成后的最终版本"，中间件如果在自己的处理函数里再调用一次 `dispatch(action)`，会重新走一遍完整链条，而不是跳过其余中间件直接触达原始 `dispatch`

> 💬 **面试官会问**：`applyMiddleware` 的洋葱模型和 Koa 中间件的洋葱模型是同一个东西吗？
>
> ✅ **标准答案**：设计思想一致——都是通过函数嵌套包裹实现"请求（action）从外到内、响应从内到外"的处理链路，本质都是柯里化 + 组合函数（`compose`）。区别在于 Koa 中间件基于 `async/await` 显式 `await next()` 控制何时进入下一层，而 Redux 中间件是通过闭包捕获"下一层的 `dispatch`"函数引用，调用时机由中间件自己决定是否调用这个 `dispatch`。

---

## 二、react-redux 精确订阅：useSelector 与 tearing

### 1. 基本使用

`react-redux` 要解决的问题是"怎么把 Redux 的 `store` 接入 React 的渲染体系"——组件不应该关心 `store` 从哪来，也不应该在 `store` 变化时手动强制刷新。

```jsx
import { Provider } from 'react-redux'
import { useSelector, useDispatch } from 'react-redux'

function App() {
  return (
    <Provider store={store}>
      <PrescriptionList />
    </Provider>
  )
}

function PrescriptionList() {
  // 只订阅 prescriptions 这一部分状态，store 里其他字段变化不会触发这里重渲染
  const items = useSelector(state => state.prescriptions.items)
  const dispatch = useDispatch()

  return (
    <ul>
      {items.map(item => (
        <li key={item.id} onClick={() => dispatch({ type: 'prescription/markReviewed', payload: item.id })}>
          {item.drugName}
        </li>
      ))}
    </ul>
  )
}
```

`<Provider store={store}>` 把 `store` 挂到 Context 上，`useSelector` 内部读取这个 Context 拿到 `store`，`useDispatch` 同理返回 `store.dispatch`。表面上看这只是"用 Context 传递 store"，但 `useSelector` 真正的价值在于它没有直接返回整个 `state`，而是接收一个 `selector` 函数，只在 `selector` 计算结果真正变化时才触发组件重渲染。

> 💬 **面试官会问**：为什么不直接 `const state = useContext(StoreContext).getState()` 拿全部状态，而要单独设计一个 `useSelector`？
>
> ✅ **标准答案**：如果直接读取整个 `state` 并把它作为渲染依赖，任何一个字段变化都会导致所有读取过 `state` 的组件重渲染，等同于把 Context 的"广播式更新"问题原样搬进了状态管理层。`useSelector` 通过"传入 selector + 内部比较 selector 结果是否变化"，把订阅粒度从"整个 store"精确到"这个组件实际用到的那一小块字段"。

### 2. useSelector 源码：三个 ref 撑起的精确订阅

下面这份代码来自本地手写仓库 `redux-source/src/lib/react-redux/hooks/useSelector.js`：

```javascript
import { useReducer, useRef, useLayoutEffect } from 'react'
import useReduxContext from './useReduxContext'

// 默认是比较两个对象相等，是比较它们的引用地址
const equalityFn = (a, b) => a === b

const useSelectorWithStore = (selector, equalityFn, store, contextSub) => {
  const [, forceRender] = useReducer(s => s + 1, 0)
  const lastSelector = useRef() // 上一个选择器函数
  const lastStoreState = useRef() // 上一个仓库状态
  const lastSelectedState = useRef() // 上一个选中的状态

  const storeState = store.getState() // 获取仓库中的总状态 {counter1, counter2}
  let selectedState = selector(storeState) // 获取选中的状态

  // 如果选择器变了，或者仓库状态变化了
  if (selector !== lastSelector.current || storeState !== lastStoreState.current) {
    selectedState = selector(storeState) // 重新映射的
  } else { // 总状态没变，映射函数也没有变，直接用上一个映射出来的状态就可以
    selectedState = lastSelectedState.current
  }
  useLayoutEffect(() => {
    lastSelector.current = selector
    lastStoreState.current = storeState
    lastSelectedState.current = selectedState
  })

  useLayoutEffect(() => {
    function checkForUpdates() {
      const newSelectedState = lastSelector.current(store.getState())
      if (equalityFn(newSelectedState, lastSelectedState.current)) {
        return
      }
      lastSelectedState.current = newSelectedState
      forceRender()
    }
    checkForUpdates()
    contextSub.subscribe(checkForUpdates)
  }, [contextSub, equalityFn, selectedState, store])
  return selectedState
}

function useSelector(selector) {
  const { store, subscription: contextSub } = useReduxContext() // 获取仓库
  const selectedState = useSelectorWithStore(selector, equalityFn, store, contextSub)
  return selectedState
}
export default useSelector
```

**关键点**

1. `useReducer(s => s + 1, 0)` 是一个常见技巧："强制刷新"——`useSelector` 本身不直接持有 selector 计算结果作为 state，而是当 `checkForUpdates` 判断出结果真的变了，调用 `forceRender()` 触发一次重渲染，重渲染时函数体重新执行、重新计算 `selectedState` 并返回
2. `lastSelector`/`lastStoreState`/`lastSelectedState` 三个 `ref` 分别缓存"上一次的 selector 函数引用""上一次的整体 store 状态引用""上一次选出来的结果"——这三个缓存配合"总状态没变、映射函数也没变就直接用上一次结果"这条判断，避免了每次组件因为其他原因重渲染时都要重新跑一遍 `selector`
3. 两个 `useLayoutEffect` 分工不同：第一个只负责在每次渲染后把这一轮的 selector/storeState/selectedState 写回三个 ref，为下一次渲染做缓存；第二个才是真正的订阅逻辑——`checkForUpdates` 用 `lastSelector.current` 重新对最新的 `store.getState()` 跑一遍 selector，和缓存的 `lastSelectedState.current` 用 `equalityFn`（默认 `Object.is` 式的引用比较）比较，不相等才 `forceRender`
4. 用 `useLayoutEffect` 而不是 `useEffect` 订阅，是为了在浏览器绘制前完成订阅注册和状态同步，避免"组件已经挂载但还没订阅上，此时 store 恰好发生变化"的时间窗口里错过更新

> 💬 **面试官会问**：`useSelector` 是怎么做到"只有相关字段变化才重渲染"的？
>
> ✅ **标准答案**：它不直接把整个 `state` 作为依赖，而是在每次 `store` 变化时重新执行 `selector(store.getState())`，把新结果和上一次缓存的结果用 `equalityFn`（默认引用比较）比较——只有比较结果不相等才调用 `forceRender()` 触发重渲染。只要 `selector` 返回的是 `state` 里没有变化的那一部分（因为没变化，`combineReducers` 会保留原引用），比较结果就是相等，不会触发重渲染。
>
> 🎁 **加分答案**：这也是为什么写 `selector` 时不要在里面 `return { ...someObj }` 这种每次都生成新对象——即使数据没变，新对象的引用也和上一次不同，`equalityFn` 的默认引用比较会认为"变了"，导致组件不必要地重渲染，这时需要传入自定义的 `equalityFn`（比如 `shallowEqual`）或者用 `reselect` 做记忆化。

### 3. 和并发渲染 tearing 问题的关系

第 06 篇讲过，`useSyncExternalStore` 是 React 18 官方给出的"安全订阅外部数据源"标准方案，专门解决并发渲染下的 tearing 问题：一次渲染可能被打断、恢复后继续，如果中途外部 store 的值发生了变化，同一次渲染里不同组件读到的值可能前后不一致。

上面这份 `useSelector` 手写实现，用的是"`useLayoutEffect` 订阅 + `useReducer` 强制刷新"的写法——这是 React 18 之前、`useSyncExternalStore` 还不存在时代的标准应对方式，官方 `react-redux` v8 之后的真实实现已经切换成基于 `useSyncExternalStore` 改写。两种写法要解决的问题一样，但防护能力不同：

- `useLayoutEffect` 订阅方案：`checkForUpdates` 是在 commit 阶段之后才执行的副作用，如果渲染过程中途被高优先级更新打断，本次渲染用的 `storeState` 快照和恢复后继续渲染时的 `store` 真实状态可能已经不一致，理论上存在读到过期或撕裂数据的窗口
- `useSyncExternalStore(subscribe, getSnapshot)` 方案：React 内部会在渲染前后主动调用 `getSnapshot()` 比较结果是否变化，一旦发现渲染过程中数据已经变了，会强制走一次同步重渲染保证一致性——这层保证是渲染流程本身提供的，不依赖 effect 的执行时机

> 💬 **面试官会问**：`react-redux` 的 `useSelector` 和并发渲染的 tearing 问题有什么关系？
>
> ✅ **标准答案**：`useSelector` 要解决的核心问题（精确订阅外部 store 的一部分状态）和 `useSyncExternalStore` 是同一类问题。早期 `react-redux` 用 `useLayoutEffect` + 强制刷新实现，在并发模式下理论上存在 tearing 风险；v8 之后官方实现改为基于 `useSyncExternalStore`，把一致性保证下沉到 React 渲染流程本身，从"库自己想办法保证一致性"变成"依赖 React 官方提供的一致性保证"。
>
> 🎁 **加分答案**：这也是为什么第 06 篇说 `useSyncExternalStore` 是"Redux/Zustand 等外部状态库能在并发模式下安全工作的地基"——不是所有状态库都需要自己重新发明一套"防撕裂"机制，`useSyncExternalStore` 把这层能力标准化了。

---

## 三、Redux Toolkit：Immer 让"直接修改"变得安全

> 说明：本节讲解基于 Redux Toolkit 官方公开实现原理（`@reduxjs/toolkit`、`immer`），本地手写仓库没有对应代码，不贴造假源码。

### 1. 基本使用

原生 Redux 要求 reducer 手写不可变更新（`return { ...state, count: state.count + 1 }`），字段一多、嵌套一深，这种写法很容易写漏某一层的展开。Redux Toolkit 用 `createSlice` 把这个痛点包掉：

```javascript
import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit'

// 异步逻辑：自动生成 pending/fulfilled/rejected 三个 action
export const fetchPrescription = createAsyncThunk(
  'prescription/fetch',
  async (id) => {
    const res = await fetch(`/api/prescriptions/${id}`)
    return res.json()
  }
)

const prescriptionSlice = createSlice({
  name: 'prescription',
  initialState: { items: [], loading: false },
  reducers: {
    markReviewed(state, action) {
      // 看似直接修改，实际上是在操作 Immer 生成的 Proxy
      const item = state.items.find(i => i.id === action.payload)
      item.reviewed = true
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPrescription.pending, (state) => { state.loading = true })
      .addCase(fetchPrescription.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload
      })
  }
})

const store = configureStore({
  reducer: { prescription: prescriptionSlice.reducer }
})
```

`markReviewed` 里的 `item.reviewed = true` 如果发生在原生 Redux 的 reducer 里，是直接破坏不可变约定的严重 bug；在 `createSlice` 里却是官方推荐的标准写法——这背后就是 Immer 在起作用。

> 💬 **面试官会问**：`createSlice` 的 `reducers` 里为什么可以"直接修改" state？
>
> ✅ **标准答案**：`createSlice` 内部用 Immer 的 `produce` 包裹了每个 reducer 函数。调用 reducer 时传进去的 `state` 参数不是真实的 state 对象，而是 Immer 用 `Proxy` 包出来的一层代理；reducer 里对这个代理对象的每一次"看似直接修改"的操作，都会被 Immer 拦截记录下来，函数执行完毕后 Immer 根据记录的变更路径生成一份新的、结构共享的 state 对象返回——外部拿到的仍然是一个新的不可变对象，不可变约定并没有被破坏，只是把"手写展开运算符"这个体力活交给了 Immer。

### 2. Immer 的 Proxy 记录机制

Immer 的核心是"写时复制"（copy-on-write）加 Proxy 拦截：

1. `produce(baseState, recipe)` 调用时，先用 `Proxy` 把 `baseState` 包一层，`recipe`（也就是 reducer 函数体）拿到的是这个 Proxy
2. 每次读取代理对象的属性，Proxy 的 `get` 拦截器会检查这个值是不是对象/数组——如果是，会继续递归包一层新的 Proxy 再返回（这保证了嵌套对象内部的修改也能被追踪到）
3. 每次给代理对象的属性赋值，Proxy 的 `set` 拦截器不会真的去改 `baseState`，而是先"浅拷贝"当前这一层对象（如果还没拷贝过），把新值写到这份拷贝上，并沿着"从被修改的这一层到根节点"的路径逐层标记"这一层已经被修改，需要用拷贝版本替换"
4. `recipe` 执行完毕后，Immer 从根节点开始检查：没有被标记为"修改过"的分支，直接复用 `baseState` 上原来的对象引用；被标记为"修改过"的分支，返回那份浅拷贝——最终得到的新对象和旧对象之间是**结构共享**的：只有真正变化的路径上的对象是新的，其余分支的引用完全不变

**结构共享**正是 `combineReducers` 里 `hasChanged` 判断能生效的前提——如果 Immer 每次都整体深拷贝返回一个全新对象，那么 `nextState[key] !== state[key]` 永远为真，所有组件都会被判定为"变化了"，`useSelector` 的引用比较优化也就完全失效了。

> 💬 **面试官会问**：Immer 生成的新 state，和手写 `{ ...state, ... }` 展开运算符相比有什么本质区别？
>
> ✅ **标准答案**：效果上是一致的——都产生一个不可变的新对象，未变化的字段保持原引用。区别在于手写展开运算符需要开发者手动确保"每一层嵌套都正确展开"，写漏一层就会意外修改到原对象；Immer 用 Proxy 拦截自动追踪"到底修改了哪些路径"，只需要写"看似可变"的赋值语句，由 Immer 保证最终产出结构共享的不可变结果，开发者不需要再手动操心嵌套层级的展开是否完整。

### 3. RTK Query：声明式接口 + 自动缓存

RTK Query 解决的是另一个问题：数据请求本身的缓存、去重、失效管理。

```javascript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const prescriptionApi = createApi({
  reducerPath: 'prescriptionApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Prescription'],
  endpoints: (builder) => ({
    getPrescriptions: builder.query({
      query: (patientId) => `/patients/${patientId}/prescriptions`,
      providesTags: ['Prescription']
    }),
    markReviewed: builder.mutation({
      query: (id) => ({ url: `/prescriptions/${id}/review`, method: 'POST' }),
      invalidatesTags: ['Prescription'] // 标记为失效，触发相关查询重新请求
    })
  })
})

export const { useGetPrescriptionsQuery, useMarkReviewedMutation } = prescriptionApi
```

**关键点**

1. `createApi` 生成的每个 `endpoint` 都会自动生成一个带缓存能力的 hook（如 `useGetPrescriptionsQuery`）——同一个 `endpoint` 名称加上序列化后的参数作为缓存 key，多个组件同时用相同参数调用同一个 query，只会真正发出一次网络请求，其余组件复用缓存结果
2. `providesTags`/`invalidatesTags` 是一套标签失效机制：`getPrescriptions` 声明自己"提供" `Prescription` 标签，`markReviewed` 声明自己会让 `Prescription` 标签失效——一旦 `markReviewed` 执行成功，所有 `providesTags` 里带 `Prescription` 标签的缓存会被标记为过期，对应的 `useGetPrescriptionsQuery` 会自动重新请求，不需要手动调用 `refetch`
3. 这套机制本质上是把"数据获取后什么时候需要刷新"这件事从"开发者手动判断"变成"声明式打标签，框架自动追踪失效关系"——和第 10 篇讲的 Data Router `loader`/`revalidation` 是同一类设计哲学：把数据依赖关系显式声明出来，交给框架处理时序

> 💬 **面试官会问**：RTK Query 和手写 `useEffect` + `fetch` + 自己维护 loading/error state 相比，解决了什么额外问题？
>
> ✅ **标准答案**：手写方案里"多个组件请求同一份数据""数据变更后其他地方的缓存要不要刷新""同一个请求被多次触发要不要去重"这些问题都需要自己处理。RTK Query 把这些统一交给"缓存 key + 标签失效"机制处理：相同参数的请求自动去重和共享缓存，写操作后通过标签关系自动触发相关读操作重新请求，减少大量手写的 loading/error 状态管理代码。

---

## 四、Zustand：比 Redux 更薄的一层

> 说明：本节讲解基于 Zustand 官方公开源码结构（`zustand/src/vanilla.ts`、`zustand/src/react.ts`）的实现思路，本地无对应仓库可复制，手写实现见文末「手写实现」小节。

### 1. 基本使用

Zustand 最直观的特点是不需要 `<Provider>` 包裹：

```javascript
import { create } from 'zustand'

const usePrescriptionStore = create((set) => ({
  items: [],
  markReviewed: (id) => set((state) => ({
    items: state.items.map(item =>
      item.id === id ? { ...item, reviewed: true } : item
    )
  }))
}))

function PrescriptionList() {
  // 直接调用 hook，不需要外层包 Provider
  const items = usePrescriptionStore(state => state.items)
  const markReviewed = usePrescriptionStore(state => state.markReviewed)

  return (
    <ul>
      {items.map(item => (
        <li key={item.id} onClick={() => markReviewed(item.id)}>{item.drugName}</li>
      ))}
    </ul>
  )
}
```

`create` 返回的直接是一个可以在任意组件里调用的 hook——`usePrescriptionStore(selector)` 的用法和 `useSelector(selector)` 几乎一样，同样支持"只订阅需要的那一部分状态"。

> 💬 **面试官会问**：Zustand 为什么不需要 `Provider`？
>
> ✅ **标准答案**：Redux 需要 `Provider` 是因为 `store` 实例需要通过 React Context 传递给组件树里的 `useSelector`/`useDispatch`；Zustand 的 `create()` 在调用时就直接创建并返回了一个模块级的 store 实例（存在模块顶层的闭包变量里），配套生成的 hook 直接引用这个闭包里的 store，不需要经过 Context 传递，所以组件树里任何位置都能直接 `import` 这个 hook 使用，不需要外层包一层 `Provider`。

### 2. 实现原理：极简发布订阅 + useSyncExternalStore

Zustand 的核心比 Redux 更薄：

- `vanilla.ts` 里的 `createStore` 本质上和 `redux-source/src/lib/redux/createStore.js` 的 `currentState + currentListeners` 结构几乎一样——一个 `getState`、一个 `setState`、一个 `subscribe`，没有 `reducer`/`action` 这层强制约定
- `react.ts` 里配套的 `useStore` hook（React 18 之后的版本）直接基于 `useSyncExternalStore(store.subscribe, () => selector(store.getState()))` 实现，把"精确订阅 + 防 tearing"这两件事直接委托给 React 官方 API，不需要像上一节 `useSelector` 手写实现那样自己维护三个 `ref` 和两个 `useLayoutEffect`

这就是"极简"的真正含义：不是功能少，而是把 Redux 里"reducer 纯函数约定""action 描述符""中间件链条"这些结构性约束全部去掉，只留下"读取状态 + 订阅变化"两个能力，配合现成的 `useSyncExternalStore` 完成 React 绑定。

**和 Redux 的本质差异**：Zustand 的 `set` 依然是不可变式更新——`set((state) => ({ items: state.items.map(...) }))` 返回的是一个新对象，替换的是引用；它不像 MobX 那样用 Proxy 拦截"看起来可变"的写法。Zustand 允许在 `set` 里直接写更新逻辑（不需要先定义 action type 再写 reducer case），灵活度上更接近 MobX 的"随手改"体验，但底层的状态更新机制仍然是 Redux 那一套"整体替换引用"的不可变模型——这正是它和 MobX 的本质区别所在。

> 💬 **面试官会问**：Zustand 和 Redux 在状态更新方式上的本质区别是什么？
>
> ✅ **标准答案**：两者都是"不可变式更新"——`setState`/`dispatch` 之后拿到的都是一个新的状态引用，没有 Proxy 拦截可变写法这一层。区别在于 Redux 强制要求"action 描述变化意图 + reducer 纯函数计算新状态"这套结构化约定，Zustand 的 `set` 允许直接在组件调用处写更新逻辑，去掉了 action/reducer 的中间层，代价是缺少 Redux 那种"所有状态变化都能在 action 日志里追溯"的可审计性。
>
> 🎁 **加分答案**：Zustand 不强制要求配合 `combineReducers` 这样的分治合并，`create` 里的多个字段可以直接平铺在同一个对象里，也可以用"slice 模式"手动拆分多个 `create` 调用后合并——这种"约定更少、自由度更高"的设计貌似简单，但大团队协作时容易出现"状态更新逻辑散落在各个组件调用处"的问题，这是选型时需要权衡的地方（详见「七、选型决策矩阵」）。

---

## 五、MobX：Proxy 响应式

### 1. 基本使用

MobX 走的是完全不同的路线：不是"不可变式更新"，而是让状态本身"可观察"，修改看起来就是普通的赋值语句。

```javascript
import { observable, autorun, makeAutoObservable } from 'mobx'
import { observer } from 'mobx-react'

class PrescriptionStore {
  items = []
  constructor() {
    makeAutoObservable(this)
  }
  markReviewed(id) {
    const item = this.items.find(i => i.id === id)
    item.reviewed = true // 直接赋值，没有 action/reducer 这层概念
  }
}

const store = new PrescriptionStore()

const PrescriptionList = observer(({ store }) => (
  <ul>
    {store.items.map(item => (
      <li key={item.id} onClick={() => store.markReviewed(item.id)}>{item.drugName}</li>
    ))}
  </ul>
))
```

`observer` 包裹的组件会自动追踪"渲染过程中读取了哪些可观察字段"，只要这些字段被修改，组件就会自动重渲染——不需要手写 `useSelector`，也不需要关心"这个字段属于哪个 slice"。

### 2. observable.js：深度代理与依赖收集

下面这份代码来自本地手写仓库 `mobx-source/src/lib/mobx/observable.js`：

```javascript
import Reaction from './reaction';

function observable(target, key, descriptor) {
  if (typeof key === 'string') { // 通过装饰器实现的，先把装饰的对象进行深度代理
    let value = descriptor.initializer()
    value = createObservable(value);
    const reaction = new Reaction();
    return {
      enumerable: true,
      configurable: true,
      get() {
        reaction.collect();
        return value;
      },
      set(val) {
        value = val;
        reaction.run();
      }
    }
  }
  return createObservable(target);
}

// 创建代理
function createObservable(val) {
  const handler = () => {
    const reaction = new Reaction();
    return {
      get(target, key, receiver) {
        reaction.collect();
        return Reflect.get(target, key, receiver);
      },
      set(target, key, value, receiver) {
        if (Array.isArray(target) && key === 'length') return true; // 处理数组设置值时，触发两次的问题
        const res = Reflect.set(target, key, value, receiver);
        reaction.run();
        return res;
      }
    }
  }
  return deepProxy(val, handler);
}

// 深度代理
function deepProxy(val, handler) {
  if (typeof val !== 'object') {
    return val;
  }
  // 后序，从对象的最内层开始遍历
  for (const key in val) {
    val[key] = deepProxy(val[key], handler);
  }
  return new Proxy(val, handler());
}

export default observable;
```

**关键点**

1. `observable` 支持两种调用形态：装饰器形式（`key` 是字符串属性名，走 `getter`/`setter` 分支）和函数调用形式（直接传对象，走 `createObservable`）——本篇聚焦第二种更容易理解的形式
2. `deepProxy` 是后序遍历：先递归处理每个子属性（`val[key] = deepProxy(val[key], handler)`），再用 `Proxy` 包裹当前层——这保证了嵌套对象的每一层都被单独代理，不是只代理最外层
3. 每一层 `Proxy` 的 `handler` 都对应一个独立的 `Reaction` 实例——这意味着"依赖收集"的粒度是**按对象层级**的，不是全局共享一个 `Reaction`
4. `get` 拦截器调用 `reaction.collect()`：如果当前正处于某个 `autorun`/`render` 函数的执行期间，就把这个函数记录为"依赖这个属性的观察者"；`set` 拦截器调用 `reaction.run()`：把之前记录的所有观察者函数重新执行一遍——这是"读取时收集依赖，修改时触发通知"这套响应式核心机制的最小实现
5. 数组的 `length` 变化会被特殊处理：`Array.isArray(target) && key === 'length'` 时直接 `return true` 跳过触发——因为往数组 `push` 一个元素，会先触发"设置索引项"（比如 `arr[3] = x`），紧接着自动触发一次"设置 `length`"，如果不特殊处理，一次 `push` 会触发两次 `reaction.run()`

### 3. reaction.js：依赖收集与派发的核心

```javascript
let nowFn = null; // 当前的 autorun 方法
let counter = 0;

class Reaction {
  constructor() {
    this.id = ++counter;
    this.store = {} // 存储当前可观察对象对应的 nowFn => {id: [nowFn]}
  }
  static start(handler) {
    nowFn = handler;
  }
  static end() {
    nowFn = null;
  }
  collect() {
    if (nowFn) {
      this.store[this.id] = this.store[this.id] || []
      this.store[this.id].push(nowFn);
    }
  }
  run() {
    if (this.store[this.id]) {
      this.store[this.id].forEach(w => {
        w()
      });
    }
  }
}

export default Reaction;
```

**关键点**

1. `nowFn` 是一个模块级全局变量，代表"当前正在执行、需要收集依赖的那个函数"——`autorun(fn)` 内部会先调用 `Reaction.start(fn)` 把 `nowFn` 指向 `fn`，再执行 `fn()`，执行过程中任何被读取的可观察属性的 `get` 拦截器里调用的 `reaction.collect()` 都会把 `nowFn` 记录下来，执行完毕后调用 `Reaction.end()` 把 `nowFn` 重置为 `null`
2. 这个"用全局变量记录当前执行上下文"的手法，和 Vue 3 响应式系统里 `activeEffect` 的设计思路完全一致——依赖收集本质上都是"读取属性时，看一眼当前有没有正在收集依赖的函数，有就记下来"
3. `run()` 遍历执行的是**函数引用**本身，不是重新计算什么"新旧值对比"——只要属性被 `set`，不管新值和旧值是否相等，注册过的观察者都会被无条件重新执行一次；对比 `combineReducers` 里 `hasChanged` 的引用比较优化，MobX 这份最小实现没有做这层优化，属于可以在生产级实现里增强的点（正式版 MobX 内部有更复杂的调度和去重机制）

### 4. observer.js：把组件渲染函数包装成 Reaction

```javascript
import { autorun } from '../mobx';

export default function observer(target) {
  const cwm = target.prototype.componentWillMount;
  target.prototype.componentWillMount = function () {
    cwm && cwm.call(this);
    autorun(() => { // 只要依赖的数据更新了，就调用强制更新的操作
      this.render();
      this.forceUpdate();
    })
  }
}
```

**关键点**

1. `observer` 是一个类组件装饰器，通过重写 `componentWillMount` 生命周期方法，在组件即将挂载时用 `autorun` 包裹一个"执行 `render` + `forceUpdate`"的函数
2. `autorun` 内部会执行这个函数一次，执行 `this.render()` 的过程中，任何被读取的可观察属性都会把这整个函数记录为依赖——这就是"`observer` 包裹的组件会自动追踪渲染时读取过的字段"的真正实现原理：追踪的时机就是 `render()` 真正执行的那一刻
3. 之后任何被追踪到的可观察属性发生 `set`，`reaction.run()` 会重新执行这个函数，也就是重新 `render()` + `forceUpdate()`——`forceUpdate()` 是 React 类组件跳过 `shouldComponentUpdate` 强制重渲染的方法，MobX 用它绕开了 React 常规的 props/state 变化检测，直接由自己的响应式系统决定什么时候重渲染

### 5. 细粒度追踪与组件级渲染单元的错配

MobX 的依赖追踪精度可以细到"某个对象的某个字段"，但 React 的渲染单元是"整个组件函数/render 方法"——`observer` 包裹的组件只能整体重渲染，无法只更新 JSX 里引用了某个字段的那一小块 DOM。这意味着 MobX 的收益主要体现在"减少了多少次整组件重渲染"（比 Redux 的粗粒度订阅更精确），而不是"减少了多少次 DOM 更新"（这一层仍然要靠 React 自身的 Diff 算法）。

> 💬 **面试官会问**：MobX 的响应式原理和 Vue 3 有什么区别？
>
> ✅ **标准答案**：核心机制是同一类思路——都用 Proxy 拦截 `get`/`set`，读取时收集依赖、修改时派发通知。区别在于消费响应式数据的渲染层不同：Vue 3 的模板编译系统能把"响应式数据变化"精确映射到"某个具体 DOM 节点需要更新"（PatchFlag 静态标记），而 MobX 面对的是 React 的 JSX，组件是最小的渲染单元，`observer` 只能让整个组件重渲染，再交给 React 的 Diff 算法去决定具体哪些 DOM 需要变化——MobX 解决的是"要不要重渲染这个组件"，不是"要不要更新这个 DOM 节点"。

---

## 六、dva：历史方案回顾

### 1. 定位：Redux + Redux-Saga 的约定式封装

dva 本身不是一个全新的状态管理方案，而是在 Redux 的基础上，用 Generator 函数配合 Redux-Saga 的 `call`/`put`/`select`/`take` 等 effect 描述符，让异步流程"看起来像同步代码"。

### 2. getSaga.js：Generator 描述异步流程

下面这份代码来自本地手写仓库 `dva-source/src/lib/dva-core/getSaga.js`：

```javascript
import * as sagaEffects from 'redux-saga/effects';
import { prefixType } from './prefixType';

export function getSaga(effects, model, onEffect, onError) {
  return function* () {
    for (const key in effects) {
      const watcher = getWatcher(key, model.effects[key], model, onEffect, onError);
      // 为什么要调用 fork，因为 fork 可单独开一个进程执行，而不阻塞当前 saga 执行
      const task = yield sagaEffects.fork(watcher);
      yield sagaEffects.fork(function* () {
        yield sagaEffects.take(`${model.namespace}/@@CANCEL_EFFECTS`);
        yield sagaEffects.cancel(task);
      });
    }
  }
}

function getWatcher(key, effect, model, onEffect, onError) {
  function put(action) {
    const { type } = action;
    return sagaEffects.put({ ...action, type: prefixType(type, model) })
  }

  return function* () {
    if (onEffect) {
      for (const fn of onEffect) {
        effect = fn(effect, { ...sagaEffects, put }, model, key);
      }
    }
    yield sagaEffects.takeEvery(key, function* (...args) {
      try {
        yield effect(...args, { ...sagaEffects, put });
      } catch (e) {
        onError.forEach(fn => fn(e))
      }
    });
  }
}
```

**关键点**

1. `getSaga` 给 model 里定义的每一个 `effect` 都启动一个独立的 `watcher`，用 `sagaEffects.fork` 而不是直接 `yield watcher()`——`fork` 会开一个独立的"子任务"并立即返回，不会阻塞 `getSaga` 主流程继续给下一个 effect 启动 watcher，这保证了多个 effect 的监听是并行生效的
2. 每个 `watcher` 内部用 `takeEvery(key, ...)` 监听 `key`（action type），一旦有匹配的 action 被 dispatch，就执行对应的 effect 生成器函数——`takeEvery` 允许同一时间有多个并发执行的 effect 实例，如果要"新请求打断旧请求"则需要用 `takeLatest`
3. `onEffect` 是一个中间件式的钩子数组，每个 `fn` 会拿到原始 `effect` 函数、包一层返回新的 `effect`——`dva-loading` 插件正是靠这个钩子实现"自动包一层 loading 状态切换"的效果（见下）
4. `put` 函数内部用 `prefixType(type, model)` 给 action type 自动加上 `namespace` 前缀，这是 dva "约定式命名空间"设计的落地：开发者在 model 内部只需要写不带 namespace 的短 type 名，dva 自动处理前缀拼接

### 3. dva-loading：用 onEffect 钩子自动包 loading 状态

下面这份代码来自本地手写仓库 `dva-source/src/lib/dva-loading/index.js`（节选核心逻辑）：

```javascript
const SHOW = '@@DVA_LOADING/SHOW';
const HIDE = '@@DVA_LOADING/HIDE';

function onEffect(effect, { put }, model, actionType) {
  const { namespace } = model;
  return function* (...args) {
    try {
      yield put({ type: SHOW, payload: { namespace, actionType } });
      yield effect(...args);
    } finally {
      yield put({ type: HIDE, payload: { namespace, actionType } });
    }
  }
}
```

**关键点**

1. `onEffect` 包裹原始 `effect`，返回一个新的 Generator 函数——在真正执行业务 effect **之前** `put` 一个 `SHOW` action，业务 effect 执行完毕后（无论成功还是抛出异常，`finally` 保证一定执行）再 `put` 一个 `HIDE` action
2. 这两个 action 会被 `dva-loading` 自己的 `extraReducers` 处理，自动维护一份 `{ global, models, effects }` 的 loading 状态树——业务代码完全不需要手写 `loading = true`/`loading = false`，只需要 `connect` 这份自动生成的 loading state
3. 这正是"描述式副作用"的价值所在：业务 effect 本身只关心"怎么发请求、怎么处理结果"，"请求期间要不要显示 loading"这种横切关注点通过 `onEffect` 钩子在外部统一注入，不侵入业务代码

### 4. 为什么现在不推荐新项目选它

Generator 函数配合 `yield` 描述副作用，写法上和 `async/await` 长得像，但心智模型完全不同：`yield` 出去的是一个"effect 描述符"（比如 `{ type: 'CALL', fn, args }`），真正执行、捕获异常、处理结果的是 Saga 的中间件运行时,而不是 JS 引擎本身的 Promise 机制——这套额外的"描述符 + 运行时解释执行"模型带来了不小的学习成本：调试时的调用栈、TypeScript 类型推导都比原生 `async/await` 更绕。而 `dva-loading` 想解决的"自动 loading 状态"问题，现在用 `createAsyncThunk` 自动生成的 `pending`/`fulfilled`/`rejected` 三态，或者 Zustand 里手写一个 `loading` 字段就能覆盖，不再需要引入 Generator/Saga 这套额外的运行时。了解 dva 的设计思路（描述式副作用、可测试性——因为 effect 描述符本身是纯数据，测试时不需要真的发起网络请求）依然有价值，但不建议新项目采用。

> 💬 **面试官会问**：给一个多团队协作的中大型后台系统选型，dva 现在还值得选吗？
>
> ✅ **标准答案**：不建议。dva 的核心价值（约定式封装 + Saga 描述式副作用）在 Generator/Saga 心智负担较重、且社区已经转向 `async/await` 配合 `createAsyncThunk` 的今天，边际收益已经不高，同时 Generator 语法在新人接手成本、TypeScript 类型推导上都不如 `async/await` 直观。新项目更适合直接用 Redux Toolkit（`createAsyncThunk` 覆盖异步场景）或 Zustand（简单场景），了解 dva 的设计思路作为知识储备即可。

---

## 七、选型决策矩阵

四条路线放在一起横向对比：

| 维度 | Redux Toolkit | MobX | Zustand | dva |
|------|---------------|------|---------|-----|
| 心智模型 | 显式 action + 严格不可变 | 隐式响应式 + 面向对象 | 极简发布订阅，无强制约定 | Redux + Generator/Saga 描述式副作用 |
| 样板代码量 | 中（Immer 已大幅简化） | 少（直接赋值即可） | 最少（无 Provider/action/reducer） | 多（namespace + saga + effect 三层概念） |
| 可追溯性/可审计性 | 高（所有变化经过 action） | 低（直接赋值无痕迹） | 中（`set` 里可以写日志中间件） | 高（继承自 Redux） |
| 并发渲染防撕裂 | 有（`useSyncExternalStore`） | 依赖 `observer` 整组件重渲染 | 有（`useSyncExternalStore`） | 有（继承自 Redux） |
| 学习成本 | 中 | 中（需理解 Proxy 响应式） | 低 | 高（额外的 Generator/Saga 知识） |
| 适用团队规模 | 中大型、多团队协作 | 中小型、面向对象背景团队 | 中小型、库作者 | 存量项目维护，不建议新项目 |

🔧 **真实案例**：在一个多科室协作的医院管理系统里，处方审核、患者档案、排班这几个模块由不同小组并行开发，选 Redux Toolkit——所有状态变化都走 action，方便跨模块排查"是谁在什么时候改了这个字段"，`RTK Query` 的标签失效机制也能很好地处理"处方审核后患者详情页数据要不要自动刷新"这类跨模块联动。而像"药品搜索框的临时筛选条件""某个弹窗的展开/收起状态"这类局部、生命周期短的状态，用 Zustand 单独开一个轻量 store 更合适——不需要为了一个筛选条件走完整的 action/reducer 流程。

> 💬 **面试官会问**：给一个多团队协作的中大型后台系统选型，Redux Toolkit、MobX、Zustand 之间你会怎么权衡？
>
> ✅ **标准答案**：多团队协作最看重的是"状态变化可追溯、可审计"，Redux Toolkit 的显式 action 天然满足这一点，配合 Immer 之后样板代码也不算重，是中大型系统的稳妥选择。MobX 的隐式响应式在小团队里效率很高，但多人协作时"哪里改了这个字段"不像 action 日志那样一目了然，排查问题成本更高。Zustand 适合局部、轻量的状态或者独立的工具库场景，不太适合作为大型系统的全局状态方案，因为缺少强制约定，容易在多人协作下失控。

---

## 手写实现（可独立跑通）

本篇不延续前几篇 `lotosv2010/react-source` monorepo 的递增式实现——状态管理是独立于 React 渲染核心之外的一层，这里单独写一份可以直接跑起来的最小实现，用"处方单状态机"演示。

### mini-Redux：约 100 行

整合本地 `redux-source` 仓库里 `createStore`/`applyMiddleware`/`combineReducers` 三个文件的核心逻辑，改写成一份连贯的最小实现：

```typescript
type Action = { type: string; payload?: unknown }
type Reducer<S> = (state: S, action: Action) => S
type Listener = () => void
type Middleware = (api: { getState: () => unknown; dispatch: (a: Action) => Action }) =>
  (next: (a: Action) => Action) => (action: Action) => Action

// 1. createStore：发布订阅的最小实现
function createStore<S>(reducer: Reducer<S>, preloadedState?: S) {
  let currentState = preloadedState as S
  let currentListeners: Listener[] = []

  const getState = () => currentState

  const dispatch = (action: Action): Action => {
    currentState = reducer(currentState, action)
    currentListeners.forEach(listener => listener())
    return action
  }

  const subscribe = (listener: Listener) => {
    currentListeners.push(listener)
    return () => {
      currentListeners = currentListeners.filter(l => l !== listener)
    }
  }

  dispatch({ type: '@@INIT' }) // 触发一次初始化，拿到 reducer 的默认 state
  return { getState, dispatch, subscribe }
}

// 2. combineReducers：分治合并 + 引用比较优化
function combineReducers<S extends Record<string, unknown>>(
  reducers: { [K in keyof S]: Reducer<S[K]> }
): Reducer<S> {
  return (state = {} as S, action) => {
    let hasChanged = false
    const nextState = {} as S
    for (const key in reducers) {
      nextState[key] = reducers[key](state[key], action)
      hasChanged = hasChanged || nextState[key] !== state[key]
    }
    return hasChanged ? nextState : state
  }
}

// 3. applyMiddleware：洋葱模型
function compose(...fns: Function[]) {
  return fns.reduce((a, b) => (...args: unknown[]) => a(b(...args)))
}

function applyMiddleware(...middlewares: Middleware[]) {
  return (createStoreFn: typeof createStore) =>
    <S>(reducer: Reducer<S>, preloadedState?: S) => {
      const store = createStoreFn(reducer, preloadedState)
      let dispatch = store.dispatch
      const middlewareAPI = {
        getState: store.getState,
        dispatch: (action: Action) => dispatch(action)
      }
      const chain = middlewares.map(middleware => middleware(middlewareAPI))
      dispatch = compose(...chain)(store.dispatch)
      return { ...store, dispatch }
    }
}

// ---- 处方单状态机演示 ----
type Prescription = { id: number; drugName: string; reviewed: boolean }
type PrescriptionState = { items: Prescription[] }

function prescriptionReducer(
  state: PrescriptionState = { items: [] },
  action: Action
): PrescriptionState {
  switch (action.type) {
    case 'prescription/add':
      return { items: [...state.items, action.payload as Prescription] }
    case 'prescription/markReviewed':
      return {
        items: state.items.map(item =>
          item.id === action.payload ? { ...item, reviewed: true } : item
        )
      }
    default:
      return state
  }
}

const loggerMiddleware: Middleware = (api) => (next) => (action) => {
  console.log('dispatching', action, 'prevState', api.getState())
  return next(action)
}

const enhancedCreateStore = applyMiddleware(loggerMiddleware)(createStore)
const store = enhancedCreateStore(prescriptionReducer)

store.subscribe(() => console.log('state changed:', store.getState()))
store.dispatch({ type: 'prescription/add', payload: { id: 1, drugName: '阿莫西林', reviewed: false } })
store.dispatch({ type: 'prescription/markReviewed', payload: 1 })
```

跑一遍会依次打印 `dispatching` 日志（中间件生效）、两次 `state changed`（订阅生效）——三个核心文件（`createStore`/`combineReducers`/`applyMiddleware`）加起来不到 60 行，剩下的是演示用的 reducer 和中间件代码。

### mini-Zustand：约 30 行

参照 Zustand 官方 `vanilla.ts`/`react.ts` 的设计思路新写（本地无对应仓库），核心是一个订阅者集合 + `useSyncExternalStore` 绑定：

```typescript
import { useSyncExternalStore } from 'react'

function create<S>(initializer: (set: (partial: Partial<S>) => void, get: () => S) => S) {
  let state: S
  const listeners = new Set<() => void>()

  const setState = (partial: Partial<S>) => {
    state = { ...state, ...partial }
    listeners.forEach(listener => listener())
  }
  const getState = () => state
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  state = initializer(setState, getState)

  // 返回的 hook：selector 精确订阅 + useSyncExternalStore 防 tearing
  return function useStore<T>(selector: (s: S) => T = (s) => s as unknown as T): T {
    return useSyncExternalStore(subscribe, () => selector(getState()))
  }
}

// ---- 同一个"处方单状态机"场景 ----
type PrescriptionStore = {
  items: Prescription[]
  markReviewed: (id: number) => void
}

const usePrescriptionStore = create<PrescriptionStore>((set, get) => ({
  items: [],
  markReviewed: (id) => set({
    items: get().items.map(item => item.id === id ? { ...item, reviewed: true } : item)
  })
}))
```

**对比**：mini-Redux 需要 `createStore` + `combineReducers` + `applyMiddleware` 三个独立文件、reducer 单独定义、action type 字符串常量、`dispatch` 触发变化；mini-Zustand 只需要一个 `create` 调用，状态和更新逻辑写在同一个对象里，不需要 action 描述符，`useSyncExternalStore` 直接提供防 tearing 能力而不需要像 `useSelector` 那样手写三个 `ref` 缓存。同样是"处方单标记已审核"这个操作，Zustand 版本的调用方少写了一层 `dispatch({ type, payload })` 的包装，直接调用 `markReviewed(id)` 即可——这也是"极简"在使用体验上的具体体现。

---

## 手写实现源码地址

- https://github.com/lotosv2010/redux-source
- https://github.com/lotosv2010/dva-source

---

## 参考资料

- https://redux.js.org/
- https://react-redux.js.org/
- https://redux-toolkit.js.org/
- https://zustand-demo.pmnd.rs/
- https://mobx.js.org/
- https://github.com/dvajs/dva
- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com
- https://github.com/wbccb/Frontend-Articles

---

## 💡 面试核心问

- **Redux 的核心是什么？用一句话描述它的数据流转过程**
- **`react-redux` 的 `useSelector` 是怎么做到"只有相关字段变化才重渲染"的，和并发渲染的 tearing 问题有什么关系？**
- **RTK 的 `createSlice` 为什么可以"直接修改" state？背后的 Immer 是怎么工作的？**
- **Zustand 为什么不需要 `Provider`？它和 Redux 在状态更新方式上的本质区别是什么？**
- **给一个多团队协作的中大型后台系统选型，Redux Toolkit、MobX、Zustand 之间你会怎么权衡？dva 现在还值得选吗？**

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话核心 | 面试考察频率 |
|--------|-----------|-------------|
| Redux 发布订阅 | dispatch 算新状态并遍历执行订阅池里的监听器，状态从 reducer 返回值单向流出 | ⭐⭐⭐⭐⭐ |
| combineReducers | 分治合并子 reducer，未变化的分支保留原引用，是性能优化的第一环 | ⭐⭐⭐⭐ |
| applyMiddleware 洋葱模型 | 中间件三层柯里化串联，action 从外到内传入、从内到外返回 | ⭐⭐⭐⭐ |
| useSelector 精确订阅 | 缓存 selector 结果，equalityFn 比较不相等才 forceRender | ⭐⭐⭐⭐⭐ |
| tearing 与防护演进 | useLayoutEffect 订阅到 useSyncExternalStore，一致性保证从库下沉到 React 本身 | ⭐⭐⭐⭐ |
| Immer 结构共享 | Proxy 拦截记录变更路径，只有变化的分支是新对象，未变化分支引用不变 | ⭐⭐⭐⭐⭐ |
| RTK Query 缓存去重 | endpoint+参数序列化做缓存key，providesTags/invalidatesTags 自动失效 | ⭐⭐⭐⭐ |
| Zustand 极简订阅 | 无 Provider、无 action，set 替换引用，靠 useSyncExternalStore 绑定 React | ⭐⭐⭐⭐ |
| MobX Proxy 响应式 | 深度代理 get 收集依赖 set 派发通知，收益是减少整组件重渲染而非精确 DOM 更新 | ⭐⭐⭐⭐ |
| dva 历史方案 | Redux+Saga 约定式封装，Generator 心智负担重，新项目不建议选 | ⭐⭐⭐ |

---

## 📝 思考题

**留个问题**：本篇 mini-Zustand 的 `setState` 是 `state = { ...state, ...partial }`，每次调用都会整体浅合并生成一个新对象——如果 `PrescriptionStore` 未来新增一个体积很大、几乎不变的 `settings` 字段，`markReviewed` 每次只改 `items`，但 `{ ...state, ...partial }` 会不会导致 `settings` 也被重新赋值到新对象上？这算不算破坏了"结构共享"？想一想「三」节讲的 Immer 是靠什么机制做到"只有真正变化的路径才是新对象，其余分支引用不变"的，如果要给这份 mini-Zustand 补上同等级别的结构共享能力，应该在 `setState` 里做什么改造？

答案留在评论区，或者在后续 SSR/RSC 篇（第 12 篇）讲服务端数据流转时，会有类似"哪些状态需要在服务端和客户端之间高效同步"的对照案例。

---

> 🔖 这是「React 18 全家桶深度拆解系列」第 11 篇。上一篇：《React Router 6/7: Data Router 预取数据范式与权限路由实战（生产收藏级）》；下一篇预告：《React 18 服务端渲染: 流式 SSR 与 Server Components 原理实战（生产收藏级）》
