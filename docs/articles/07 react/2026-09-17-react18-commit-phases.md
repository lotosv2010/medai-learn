# React 18 commit 阶段: 三个子阶段与 effect 执行顺序原理（面试收藏级）

> **副标题**：before mutation/mutation/layout 三阶段、effect 链表收集、useInsertionEffect/useLayoutEffect/useEffect 执行时机

---

## 🎯 这篇文章解决什么问题

上一篇讲完 Diff 算法之后，面试官很可能会接着往下问一个更贴近日常调试的问题：**父子组件都写了 `useEffect`，谁先执行？**

大多数人凭直觉会答"父组件先渲染，所以父组件的 effect 先执行"——这个直觉是错的，真实顺序恰恰相反：子组件先执行。更进一步，如果面试官追问"那 `useLayoutEffect` 和 `useEffect` 混在一起，完整的执行顺序是什么样的"，很多人只能说出"一个同步一个异步"，说不清楚这个顺序具体是在 commit 阶段的哪一步被决定的；再追问一句"`useInsertionEffect` 又是什么，它和前两者的关系是什么"，基本就问不下去了。

这一篇要讲透的，是 commit 阶段的完整子阶段划分：为什么 commit 必须同步不可中断，DOM 变更前后各自能做什么，`useInsertionEffect`/`useLayoutEffect`/`useEffect` 的挂载和销毁分别挂在哪个子阶段，以及"子组件先于父组件"这条规律的根源到底在哪一步代码里。

读完之后，你会同时获得两种确定感：**懂原理**（三个子阶段各自的职责边界，三种 effect 在时间线上的准确位置）和**会讲**（面试官顺着任意一个环节追问都能拆解回答）。

---

## 一、使用与实践

### 1. useLayoutEffect 与 useEffect 的时机差异

用一个处方单弹窗的场景直观感受两者差异：弹窗打开时需要先测量自身尺寸，再根据可用空间决定往上弹还是往下弹。

```jsx
function PrescriptionPopover({ anchorRef }) {
  const popoverRef = useRef(null)
  const [placement, setPlacement] = useState('bottom')

  useLayoutEffect(() => {
    const rect = popoverRef.current.getBoundingClientRect()
    const anchorRect = anchorRef.current.getBoundingClientRect()
    if (anchorRect.bottom + rect.height > window.innerHeight) {
      setPlacement('top')
    }
  }, [])

  useEffect(() => {
    console.log('弹窗已绘制完成，当前位置：', placement)
  }, [placement])

  return <div ref={popoverRef} className={`popover popover--${placement}`}>...</div>
}
```

如果把定位逻辑写进 `useEffect`，用户会先看到弹窗在错误位置闪一下，再跳到正确位置——因为 `useEffect` 在浏览器绘制之后才执行，这次"跳动"是可感知的。换成 `useLayoutEffect`，测量和调整都在绘制前完成，用户看到的是已经定位好的弹窗，没有闪烁。这正是本篇要讲透的 commit 阶段子阶段划分在应用层的直观体现。

> 💬 **面试官会问**：什么场景下必须用 `useLayoutEffect` 而不能用 `useEffect`？
>
> ✅ **标准答案**：任何"读取/修改 DOM 布局信息，且修改结果需要在本次绘制前生效"的场景——比如根据元素实际尺寸决定弹窗方向、根据滚动容器尺寸做虚拟列表定位。用 `useEffect` 会导致用户先看到一次错误状态、再看到一次修正后的状态，中间产生可感知的闪烁或跳动。
>
> 🎁 **加分答案**：`useLayoutEffect` 是同步执行的，如果在里面做了昂贵的计算或者触发了连续多次的 state 更新，会直接拖慢 commit 阶段、阻塞浏览器绘制——这是它"抢在绘制前跑完"这个优势的代价，滥用会造成明显的卡顿，只应该用在真正需要读写布局信息的场景。

### 2. getSnapshotBeforeUpdate：DOM 变更前的快照

Class 组件的 `getSnapshotBeforeUpdate` 用于在 DOM 变更前读取快照，典型场景是聊天记录列表：新消息插入前记录当前滚动位置，插入后在 `componentDidUpdate` 里用这个快照决定是否需要保持滚动位置不变。

```jsx
class ChatList extends React.Component {
  listRef = React.createRef()

  getSnapshotBeforeUpdate(prevProps) {
    if (prevProps.messages.length < this.props.messages.length) {
      const list = this.listRef.current
      return list.scrollHeight - list.scrollTop
    }
    return null
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (snapshot !== null) {
      const list = this.listRef.current
      list.scrollTop = list.scrollHeight - snapshot
    }
  }

  render() {
    return <div ref={this.listRef}>{/* 消息列表 */}</div>
  }
}
```

如果把这段读取逻辑挪到 `componentDidUpdate` 里，此时 DOM 已经变更完毕，`scrollHeight` 已经是插入新消息之后的新值，`scrollTop - scrollHeight` 算出来的就是错误的偏移量——这也是「二」节要讲的"before mutation 阶段为什么必须存在"的直接证据。

### 3. 实测：父子组件 useEffect 的执行顺序

用一个父子组件嵌套的例子，两层都写 `useLayoutEffect` 和 `useEffect`，打印执行顺序：

```jsx
function Parent({ count }) {
  useLayoutEffect(() => {
    console.log('layout(parent)')
  }, [count])
  useEffect(() => {
    console.log('passive(parent)')
  }, [count])
  return <Child count={count} />
}

function Child({ count }) {
  useLayoutEffect(() => {
    console.log('layout(child)')
  }, [count])
  useEffect(() => {
    console.log('passive(child)')
  }, [count])
  return null
}
```

实际跑一遍会看到打印顺序是：

```
layout(child)
layout(parent)
passive(child)
passive(parent)
```

不是简单的"父先子后"或"子先父后"，而是"所有 layout 都同步跑完之后，所有 passive 才异步开始"，且这两组内部都是子先父后。本篇「四、手写实现」会逐行对照代码解释这个现象的根源。

> 💬 **面试官会问**：父子组件的 `useEffect` 谁先执行？为什么？
>
> ✅ **标准答案**：子组件先执行。原因分两层：一是收集阶段（渲染函数执行、`completeWork` 自底向上）本身就是子组件先完成，effect 更早被 push 进链表；二是执行阶段的遍历（`commitLayoutEffects`/`commitPassiveMountEffects`）都是"先递归子树，再处理自身"，两层自底向上叠加，最终表现为子组件的 effect 无论是 layout 还是 passive，都先于父组件执行。
>
> 🎁 **加分答案**：这条规律解释了一个常见疑问——为什么父组件的 `useEffect` 里访问子组件通过 `ref` 暴露的方法总是安全的？因为子组件的挂载 effect 已经跑完，暴露的方法已经可用。

### 4. useRef 关联 DOM ref 在 mutation 阶段后赋值

```jsx
function MeasureBox() {
  const boxRef = useRef(null)

  useLayoutEffect(() => {
    // 这里读到的 boxRef.current 已经是真实 DOM 节点，且尺寸是最新的
    console.log(boxRef.current.getBoundingClientRect())
  })

  return <div ref={boxRef}>...</div>
}
```

`ref` 对真实 DOM 节点的赋值发生在 mutation 阶段之后（layout 阶段的 `commitAttachRef`），所以 `useLayoutEffect` 里能稳定读到已经赋值好的 `ref.current`；如果在 render 阶段或 before mutation 阶段读 `ref.current`，大概率还是上一次渲染的旧值或 `null`。

---

## 二、设计与原理

### 1. commit 阶段为什么必须同步不可中断

render 阶段（`beginWork`/`completeWork`）只在内存里操作 Fiber 对象，构建的是还没有生效的 workInProgress 树，可以被 `shouldYield` 打断、丢弃重来，用户看不到任何中间态。commit 阶段则是真正把变更应用到真实 DOM 的阶段——一旦开始插入、更新、删除节点，如果中途被打断，用户会看到一个"一部分 DOM 已经变了、另一部分还没变"的不一致界面。这是 commit 阶段必须同步跑完的根本原因：DOM 操作没有"暂停再继续"的中间态可言。

> 💬 **面试官会问**：commit 阶段为什么必须同步不可中断，render 阶段为什么可以？
>
> ✅ **标准答案**：render 阶段只在内存中构建还没生效的 workInProgress 树，中断、丢弃、重新渲染都不会被用户看到；commit 阶段是真正操作真实 DOM 的阶段，DOM 树只有"变更前"和"变更后"两个合法状态，没有中间态可言——一旦开始变更就必须同步跑完，否则用户会看到不完整、不一致的界面。

### 2. before mutation 阶段：DOM 变更前读取快照

这个阶段发生在任何 DOM 操作之前，`getSnapshotBeforeUpdate` 在这里被调用——必须在 DOM 变更前读取，因为它要拿到"变更前"的状态（比如变更前的滚动高度），如果放到 mutation 或 layout 阶段，DOM 已经变了，读到的就是"变更后"的错误值。

React 18 的 `commitRootImpl` 依次调用三个子阶段，`commitBeforeMutationEffects` 排在最前面：

```
commitBeforeMutationEffects（DOM 还没变）
  → commitMutationEffects（DOM 正在变）
    → root.current = finishedWork（双缓存切换）
      → commitLayoutEffects（DOM 已经变完，还没绘制）
```

before mutation 阶段只做一件事：遍历树，找到带 `Snapshot` 标记的 `ClassComponent`，调用它的 `getSnapshotBeforeUpdate`，把返回值挂到 `instance.__reactInternalSnapshotBeforeUpdate` 上，供 layout 阶段的 `componentDidUpdate` 第三个参数取用。

> 💬 **面试官会问**：`getSnapshotBeforeUpdate` 为什么必须在 DOM 变更前调用，放到 mutation 之后会有什么问题？
>
> ✅ **标准答案**：它的语义就是"读取变更前的状态"（比如变更前的滚动高度），如果放到 mutation 阶段之后，DOM 已经完成了插入/删除/更新，读到的 `scrollHeight`、`offsetTop` 等值已经是变更后的新值，用它计算出的偏移量、快照数据都是错的——比如聊天列表场景，算出来的滚动补偿量会完全对不上。

### 3. mutation 阶段：真正执行 DOM 增删改

`commitPlacement`/`commitDeletion`/`commitUpdate` 在这个阶段真正操作真实 DOM。同时，三种 effect 里有两种的部分动作也发生在这里：

- `useInsertionEffect` 的**销毁和挂载**都在这里完成（先销毁旧的，再挂载新的）
- `useLayoutEffect` 的**销毁**（上一次渲染留下的 cleanup）也在这里完成，但挂载要推迟到 layout 阶段

先清理旧的，再挂载新的，这是所有"挂载/销毁"成对出现的副作用系统的通用顺序。而 `useLayoutEffect` 的挂载被特意推迟到 layout 阶段（而不是像 `useInsertionEffect` 一样在 mutation 阶段就地挂载），是为了保证"整棵树里所有兄弟组件的 `useLayoutEffect` 销毁都先跑完，才轮到任何一个组件挂载新的 `useLayoutEffect`"——如果销毁和挂载交替进行，A 组件可能挂载了新 effect 抢先设置了某个 DOM 属性，而 B 组件还没来得及销毁旧 effect 清理同一个属性，两者存在资源竞争时就会互相干扰。

> 💬 **面试官会问**：`useLayoutEffect` 的销毁函数在哪个阶段执行，挂载函数又在哪个阶段？为什么要分开？
>
> ✅ **标准答案**：销毁函数在 mutation 阶段执行（紧跟在 DOM 变更、`useInsertionEffect` 处理之后），挂载函数推迟到 layout 阶段。这样分开是为了保证一棵树里所有节点的旧 `useLayoutEffect` 都先销毁完，才轮到任何节点挂载新的——避免销毁和挂载交替执行时，不同组件之间因为操作同一份 DOM/资源产生互相覆盖的竞态问题。

### 4. layout 阶段：DOM 已变更、浏览器未绘制

DOM 结构此时已经是最新的，但浏览器还没有把这次变更绘制到屏幕上。这个阶段同步执行 `useLayoutEffect` 的挂载回调、`componentDidMount`/`componentDidUpdate`、更新 ref 的指向——因为可以同步读取到最新的布局信息（比如 `getBoundingClientRect`），且在这里做的任何修改都会在同一次绘制里生效，不会产生可感知的"跳动"。如果换成绘制后才修改布局，用户会看到一次明显的跳动，这正是「一、1」处方单弹窗场景的原理。

`root.current = finishedWork` 这次双缓存切换刻意安排在 mutation 之后、layout 之前——`useLayoutEffect` 里如果读 `ref.current` 或做 DOM 测量，`fiber.stateNode` 必须已经是最新提交的状态，切换晚了会读到旧值，切换早了会导致 `componentWillUnmount` 阶段还没结束时 current 树就已经指向了新树，产生逻辑错乱。

📍**配图点**：commit 三阶段时间线图——用一条横向时间轴依次标出 before mutation → mutation（DOM 变更 + insertion effect）→ 双缓存切换 → layout（绘制前同步，layout effect 挂载）→ 浏览器绘制 → passive（绘制后异步）六个时间点，每个时间点标注"DOM 处于什么状态"和"这个阶段能做什么"。

### 5. effect 链表的收集时机

`completeWork` 阶段自底向上遍历 Fiber 树时，每个函数组件在渲染过程中调用的 `useInsertionEffect`/`useLayoutEffect`/`useEffect` 都会通过 `pushEffect` 生成一个 `Effect` 节点，串成一条挂在 `fiber.updateQueue.lastEffect` 上的**环形链表**。三种 effect 共用这一条链表，不是各自维护一条——区分它们靠的是 `effect.tag` 上打的 `HookInsertion`/`HookLayout`/`HookPassive` 标记位。

这个收集动作本身是随着渲染函数执行顺序发生的（子组件先渲染完，子组件的 effect 先被 push），这也是为什么后续执行阶段天然呈现"子组件先于父组件"的顺序——顺序不是执行阶段专门判断出来的，而是收集阶段就已经决定了。

链表用环形结构（而不是普通单链表）的好处是：`lastEffect` 永远指向"最后插入的节点"，`lastEffect.next` 永远指向"第一个插入的节点"，插入新节点只需要 `lastEffect.next = effect; effect.next = firstEffect; lastEffect = effect` 三步就能 O(1) 完成，不需要额外维护链表长度或遍历到尾部。

除了 effect 链表，React 17 起还引入了另一套独立的机制——`completeWork` 把每个 Fiber 自身的 `flags` 和子节点的 `subtreeFlags` 通过位或运算冒泡合并到父节点的 `subtreeFlags` 字段上（`bubbleProperties`），取代了 React 16 用一条独立 `effectList` 链表收集"有副作用的 Fiber"的做法。这两套机制解决的是不同的问题：`subtreeFlags` 冒泡用于 commit 遍历时的**剪枝**（一个节点的 `subtreeFlags` 是 `NoFlags` 就能跳过整棵子树，不用往下遍历），`Effect` 环形链表用于**收集具体要执行哪些 effect 回调**——两者配合，commit 阶段才能既快速定位"哪些子树需要处理"，又能精确执行"每个函数组件里具体挂了哪些 effect"。

### 6. effect 执行顺序原则：子组件先于父组件

`useLayoutEffect`（`HookLayout`）在 layout 阶段同步执行，`useEffect`（`HookPassive`）在 commit 全部完成后通过 Scheduler 以正常优先级异步调度执行。无论哪一种，执行顺序都遵循"子组件先于父组件"：这是因为收集阶段（渲染函数执行）本身自底向上，子组件更早完成渲染、更早把自己的 effect 加入链表；执行阶段的遍历顺序又是"先递归子树，再处理自身"，两层自底向上叠加，最终表现为子组件的 effect 无论是 layout 还是 passive，都先于父组件执行。

这条规律解释了很多实际问题，比如父组件的 `useEffect` 里访问子组件通过 ref 暴露的方法一定是安全的——子组件的挂载 effect 已经跑完。

📍**配图点**：一棵三层组件树（父→中→子）的 effect 执行顺序图，用两组箭头分别标出"layout 同步块"（子→中→父，绘制前完成）和"passive 异步块"（子→中→父，绘制后完成），直观展示两组内部都是自底向上、两组之间 layout 全部先于 passive。

### 7. useInsertionEffect 的定位

React 18 补齐的第三种 effect，执行时机比 `useLayoutEffect` 更早——在 DOM 变更（mutation）阶段、DOM 结构变更完成之后立即同步执行，专门为 CSS-in-JS 库设计，用于在 DOM 变更后、`useLayoutEffect` 读取布局信息之前动态插入 `<style>` 标签，避免 `useLayoutEffect` 阶段测量布局时样式还没生效导致的测量错误。

这是三种 effect 里最少被业务代码直接使用、但理解"三种 effect 分别对应 commit 的哪个阶段"能帮助理清整个 commit 副作用系统的全貌：

三种 effect 的执行时机总结：`useInsertionEffect`（mutation 阶段、DOM 变更之后）→ `useLayoutEffect` 销毁（同样在 mutation 阶段）→ 双缓存切换 → `useLayoutEffect` 挂载（layout 阶段，绘制前同步）→ 浏览器绘制 → `useEffect`（绘制后异步）。

> 💬 **面试官会问**：`useInsertionEffect` 解决了什么问题？为什么它必须比 `useLayoutEffect` 更早执行？
>
> ✅ **标准答案**：它是专门为 CSS-in-JS 库设计的——这类库需要在运行时动态生成并插入 `<style>` 规则。如果这个插入动作发生在 `useLayoutEffect` 之后或之中，`useLayoutEffect` 里读取的 `getBoundingClientRect` 等布局信息可能还没应用上新样式，测量结果就是错的。`useInsertionEffect` 被安排在 mutation 阶段、比 `useLayoutEffect` 更早执行，保证任何组件的 `useLayoutEffect` 在读布局信息时，本次渲染涉及的样式规则已经全部插入完毕。
>
> 🎁 **加分答案**：`useInsertionEffect` 里不能读取 `ref`——因为它执行在 mutation 阶段，`useLayoutEffect` 才会把 ref 赋值好（layout 阶段），此时 ref 可能还没指向最新的 DOM 节点，这也是官方文档明确警告的使用限制。

### 8. 对比 Vue 3

Vue 3 的 `onMounted`/`onUpdated` 对应 React 的 `useLayoutEffect` 时机（同步，DOM 更新后立即执行），Vue 3 没有内置一个默认异步调度的等价物（需要手动 `nextTick` 或用 `Promise.resolve().then`）。这是因为 Vue 3 的更新本身走微任务队列，"绘制后再执行"这件事需要开发者自己额外处理，而 React 默认的 `useEffect` 就是"绘制后执行"，这个默认值的选择本身也体现了两个框架对"副作用默认应该多早/多晚执行"的不同判断。

> 💬 **面试官会问**：Vue 3 有没有类似 `useInsertionEffect` 的机制？
>
> ✅ **标准答案**：Vue 3 生态里的 CSS-in-JS 方案（如 `vue-styled-components`）大多依赖 SFC 编译期的 `<style>` 块处理，或者利用 Vue 的响应式系统在组件 `setup` 阶段就完成样式计算，不像 React 需要一个专门的运行时 Hook 来解决"动态插入样式与布局测量的时序竞争"问题——这也和「一」节讲过的两个框架"编译时优化 vs 运行时调度"的路线差异一脉相承。

---

## 三、源码解析（重点代码，来源 GitHub 仓库）

> React 18 源码地址：https://github.com/facebook/react（本篇断点调试环境已锁定 `v18.3.1`）

### 1. commit 总调度：packages/react-reconciler/src/ReactFiberWorkLoop.new.js

```javascript
// commitRootImpl（节选，保留主链路，完整版含 profiler/DEV 分支约 360 行）
function commitRootImpl(root, recoverableErrors, transitions, renderPriorityLevel) {
  do {
    flushPassiveEffects(); // 先把上一轮遗留的 passive effect 冲刷干净
  } while (rootWithPendingPassiveEffects !== null);

  const finishedWork = root.finishedWork;
  const lanes = root.finishedLanes;
  root.finishedWork = null;
  root.finishedLanes = NoLanes;
  root.callbackNode = null;
  root.callbackPriority = NoLane;

  // 尽早调度 passive effect 的异步回调（在其余 commit 逻辑之前排入 Scheduler 队列）
  if (
    (finishedWork.subtreeFlags & PassiveMask) !== NoFlags ||
    (finishedWork.flags & PassiveMask) !== NoFlags
  ) {
    if (!rootDoesHavePassiveEffects) {
      rootDoesHavePassiveEffects = true;
      scheduleCallback(NormalSchedulerPriority, () => {
        flushPassiveEffects();
        return null;
      });
    }
  }

  const subtreeHasEffects = (finishedWork.subtreeFlags & (BeforeMutationMask | MutationMask | LayoutMask | PassiveMask)) !== NoFlags;
  const rootHasEffect = (finishedWork.flags & (BeforeMutationMask | MutationMask | LayoutMask | PassiveMask)) !== NoFlags;

  if (subtreeHasEffects || rootHasEffect) {
    const prevExecutionContext = executionContext;
    executionContext |= CommitContext;

    // 第一个子阶段：before mutation，读取变更前状态（getSnapshotBeforeUpdate）
    const shouldFireAfterActiveInstanceBlur = commitBeforeMutationEffects(root, finishedWork);

    // 第二个子阶段：mutation，真正变更真实 DOM
    commitMutationEffects(root, finishedWork, lanes);

    // 双缓存树交换：必须在 mutation 之后、layout 之前
    root.current = finishedWork;

    // 第三个子阶段：layout，DOM 已变更、浏览器未绘制
    commitLayoutEffects(finishedWork, root, lanes);

    requestPaint(); // 告诉 Scheduler 在帧尾让浏览器有机会绘制
    executionContext = prevExecutionContext;
  } else {
    root.current = finishedWork;
  }

  if (rootDoesHavePassiveEffects) {
    rootDoesHavePassiveEffects = false;
    rootWithPendingPassiveEffects = root;
  }

  ensureRootIsScheduled(root, now());
  flushSyncCallbacks();
  return null;
}
```

**关键点**

1. 三个子阶段（before mutation / mutation / layout）在同一个函数里依次、同步调用，中间没有任何可以让出主线程的检查点——这正是「二、1」讲的"commit 必须同步跑完"在代码层面的直接证据
2. passive effect 的调度回调（`scheduleCallback(NormalSchedulerPriority, ...)`）被安排在函数最开始的位置，早于三个子阶段的执行，官方注释解释这是为了保证它比 commit 阶段内部可能触发的其它调度更早排队（issue #16714）
3. `root.current = finishedWork` 精确卡在 `commitMutationEffects` 和 `commitLayoutEffects` 之间，对应「二、4」讲的双缓存切换时机

### 2. before mutation：packages/react-reconciler/src/ReactFiberCommitWork.new.js

```javascript
// commitBeforeMutationEffectsOnFiber（节选，getSnapshotBeforeUpdate 调用点）
function commitBeforeMutationEffectsOnFiber(finishedWork) {
  const current = finishedWork.alternate;
  const flags = finishedWork.flags;

  if ((flags & Snapshot) !== NoFlags) {
    switch (finishedWork.tag) {
      case ClassComponent: {
        if (current !== null) {
          const prevProps = current.memoizedProps;
          const prevState = current.memoizedState;
          const instance = finishedWork.stateNode;
          const snapshot = instance.getSnapshotBeforeUpdate(
            finishedWork.elementType === finishedWork.type
              ? prevProps
              : resolveDefaultProps(finishedWork.type, prevProps),
            prevState,
          );
          instance.__reactInternalSnapshotBeforeUpdate = snapshot;
        }
        break;
      }
      case HostRoot: {
        if (supportsMutation) {
          const root = finishedWork.stateNode;
          clearContainer(root.containerInfo);
        }
        break;
      }
    }
  }
}
```

**关键点**

1. `getSnapshotBeforeUpdate` 只对带 `Snapshot` 标记的 `ClassComponent` 调用，且要求 `current !== null`（首次挂载不触发，因为没有"变更前"可言）
2. 返回值挂到 `instance.__reactInternalSnapshotBeforeUpdate` 上，供 layout 阶段的 `componentDidUpdate` 第三个参数取用——这是 before mutation 和 layout 两个子阶段之间唯一的数据传递通道
3. `HostRoot` 分支的 `clearContainer` 是 `hydrate` 场景下清空容器的逻辑，与 `getSnapshotBeforeUpdate` 主线关系不大

### 3. mutation：packages/react-reconciler/src/ReactFiberCommitWork.new.js

```javascript
// commitMutationEffectsOnFiber 的 FunctionComponent 分支（节选，HookInsertion 与 HookLayout destroy 的调用顺序）
case FunctionComponent:
case ForwardRef:
case MemoComponent:
case SimpleMemoComponent: {
  recursivelyTraverseMutationEffects(root, finishedWork, lanes);
  commitReconciliationEffects(finishedWork); // 处理 Placement（DOM 插入）

  if (flags & Update) {
    // useInsertionEffect：销毁旧的，紧接着挂载新的——都在这里完成
    commitHookEffectListUnmount(HookInsertion | HookHasEffect, finishedWork, finishedWork.return);
    commitHookEffectListMount(HookInsertion | HookHasEffect, finishedWork);

    // useLayoutEffect：只销毁旧的，挂载推迟到 commitLayoutEffects
    // 官方注释：Layout effects are destroyed during the mutation phase so that all
    // destroy functions for all fibers are called before any create functions.
    commitHookEffectListUnmount(HookLayout | HookHasEffect, finishedWork, finishedWork.return);
  }
  return;
}
```

**关键点**

1. 单个 fiber 内部的执行顺序是：子树 mutation → 本 fiber 的 DOM 插入（`Placement`）→ 本 fiber 的 `useInsertionEffect` 销毁+挂载 → 本 fiber 的 `useLayoutEffect` 销毁（不含挂载）
2. `useInsertionEffect` 与 `useLayoutEffect` 用的是同一个 `commitHookEffectListUnmount`/`commitHookEffectListMount` 函数，只是传入的 `flags` 参数不同（`HookInsertion` vs `HookLayout`），这两个函数本身不区分 effect 类型，靠位运算 `(effect.tag & flags) === flags` 筛选
3. 官方注释明确解释了"为什么 layout effect 的销毁要提前到 mutation 阶段"——保证整棵树所有节点的销毁都先跑完，才轮到任何节点挂载新的，避免兄弟组件互相干扰

### 4. layout：packages/react-reconciler/src/ReactFiberCommitWork.new.js

```javascript
// commitLayoutEffectOnFiber（节选，HookLayout mount、componentDidUpdate、ref 赋值）
function commitLayoutEffectOnFiber(finishedRoot, current, finishedWork, committedLanes) {
  if ((finishedWork.flags & LayoutMask) !== NoFlags) {
    switch (finishedWork.tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent: {
        commitHookEffectListMount(HookLayout | HookHasEffect, finishedWork);
        break;
      }
      case ClassComponent: {
        const instance = finishedWork.stateNode;
        if (finishedWork.flags & Update) {
          if (current === null) {
            instance.componentDidMount();
          } else {
            const prevProps = ...;
            const prevState = current.memoizedState;
            instance.componentDidUpdate(
              prevProps,
              prevState,
              instance.__reactInternalSnapshotBeforeUpdate, // 取用 before mutation 阶段存下的快照
            );
          }
        }
        break;
      }
    }
  }

  if (finishedWork.flags & Ref) {
    commitAttachRef(finishedWork); // ref 赋值排在函数体最后，晚于本 fiber 的所有生命周期/effect
  }
}
```

**关键点**

1. `useLayoutEffect` 的挂载（`commitHookEffectListMount(HookLayout | HookHasEffect, ...)`）在这里才真正调用，与「三、3」mutation 阶段的销毁遥相呼应，两次调用中间隔着"整棵树所有节点都销毁完毕 + 双缓存切换"这段间隙
2. `componentDidUpdate` 的第三个参数直接读取 `instance.__reactInternalSnapshotBeforeUpdate`，验证了 before mutation → layout 两阶段之间的数据传递闭环
3. `Ref` 的赋值（`commitAttachRef`）是这个函数体最后执行的动作，在该 fiber 自身的 `useLayoutEffect`/生命周期方法都跑完之后才赋值——而 `Ref` 的解绑发生在 mutation 阶段（`commitMutationEffectsOnFiber` 里）

### 5. effect 链表收集：completeWork 的 bubbleProperties + pushEffect

`packages/react-reconciler/src/ReactFiberCompleteWork.new.js`：

```javascript
// bubbleProperties（节选，subtreeFlags 冒泡）
function bubbleProperties(completedWork) {
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
```

`packages/react-reconciler/src/ReactFiberHooks.new.js`：

```javascript
// pushEffect（节选，环形链表插入）
function pushEffect(tag, create, destroy, deps) {
  const effect = { tag, create, destroy, deps, next: null };
  let componentUpdateQueue = currentlyRenderingFiber.updateQueue;
  if (componentUpdateQueue === null) {
    componentUpdateQueue = createFunctionComponentUpdateQueue();
    currentlyRenderingFiber.updateQueue = componentUpdateQueue;
    componentUpdateQueue.lastEffect = effect.next = effect;
  } else {
    const lastEffect = componentUpdateQueue.lastEffect;
    if (lastEffect === null) {
      componentUpdateQueue.lastEffect = effect.next = effect;
    } else {
      const firstEffect = lastEffect.next;
      lastEffect.next = effect;
      effect.next = firstEffect;
      componentUpdateQueue.lastEffect = effect;
    }
  }
  return effect;
}
```

**关键点**

1. `bubbleProperties` 每处理一个 fiber，就把它所有直接子节点的 `subtreeFlags | flags` 按位或累加进自己的 `subtreeFlags`——不需要额外维护一条链表就能让父节点"侦测"到整棵子树任意深度的副作用标记，这是 commit 遍历能"选择性深度优先"跳过无副作用子树的依据
2. `pushEffect` 里 `lastEffect.next` 永远指向头节点、`lastEffect` 永远指向尾节点，插入新节点只需三步指针操作，O(1) 完成，不需要遍历
3. 一个函数组件里调用的 `useInsertionEffect`/`useLayoutEffect`/`useEffect` 全部共用同一条 `fiber.updateQueue.lastEffect` 环形链表，区分靠 `effect.tag` 上的 `HookInsertion`/`HookLayout`/`HookPassive` 标记位

### 6. passive effect 异步调度：packages/react-reconciler/src/ReactFiberWorkLoop.new.js

```javascript
// flushPassiveEffectsImpl（节选，先卸载再挂载）
function flushPassiveEffectsImpl() {
  const root = rootWithPendingPassiveEffects;
  const lanes = pendingPassiveEffectsLanes;
  rootWithPendingPassiveEffects = null;
  pendingPassiveEffectsLanes = NoLanes;

  const prevExecutionContext = executionContext;
  executionContext |= CommitContext;

  commitPassiveUnmountEffects(root.current);
  commitPassiveMountEffects(root, root.current, lanes, transitions);

  executionContext = prevExecutionContext;
  flushSyncCallbacks();
}
```

**关键点**

1. `flushPassiveEffectsImpl` 是被 `commitRootImpl` 里 `scheduleCallback(NormalSchedulerPriority, ...)` 异步调度执行的函数，不是同步调用
2. 内部先整体跑一遍 `commitPassiveUnmountEffects`（卸载所有需要清理的旧 `useEffect`），再整体跑一遍 `commitPassiveMountEffects`（挂载所有新的）——"先卸载再挂载"分两步整体跑完，与「二、3」讲的 layout effect 销毁提前到 mutation 阶段是同一个设计意图
3. 如果本次更新的 lane 包含 `SyncLane`（比如离散事件触发），`commitRootImpl` 末尾会同步立即调用 `flushPassiveEffects()`，保证结果对外部系统立刻可观察，而不是一定要等到浏览器绘制之后

---

## 四、手写实现（解读已完成代码 + 新增 useInsertionEffect）

本节基于本地真实项目 `D:\github\react-source`（GitHub：https://github.com/lotosv2010/react-source）编写。需要先说明一件事：`commitRootImpl`/三阶段划分/effect 环形链表/`useLayoutEffect` 同步执行/`useEffect` 经 Scheduler 异步调度，**这些都不是本篇新写的代码**，它们是这个项目在实现 Hooks 主链路时（对应仓库 commit 历史里的 `feat(reconciler): 实现 useEffect/useLayoutEffect`）就已经落地的真实代码——本篇的任务是把这些已经跑通的代码逐行讲透。真正在本篇新增的，是此前一直缺失的第三种 effect：**`useInsertionEffect`**。

### 1. commitRootImpl 总控流程（已有代码，逐行解读）

```typescript
function commitRootImpl(root: FiberRootNode): void {
  const finishedWork = root.finishedWork;
  if (finishedWork === null) {
    return;
  }

  const lanes = root.finishedLanes;
  root.finishedWork = null;
  root.finishedLanes = NoLanes;
  root.callbackNode = null;
  root.callbackPriority = NoLane;

  const remainingLanes = mergeLanes(finishedWork.lanes, finishedWork.childLanes);
  markRootFinished(root, remainingLanes);

  const prevExecutionContext = executionContext;
  executionContext |= CommitContext;

  // before-mutation 子阶段：只处理 getSnapshotBeforeUpdate（必须在 DOM 变更前读）
  commitBeforeMutationEffects(root, finishedWork);

  // mutation 子阶段：插入/更新/删除 DOM
  commitMutationEffects(root, finishedWork, lanes);

  // 双缓存树交换：workInProgress 树提交后成为新的 current 树。layout effect 必须在这之后
  // 挂载——useLayoutEffect 里读 DOM/ref 时，fiber.stateNode 应该已经是最新的
  root.current = finishedWork;

  // layout 子阶段：同步挂载 useLayoutEffect（销毁已经在 commitMutationEffects 里做过了）
  commitLayoutEffects(finishedWork, root);

  executionContext = prevExecutionContext;

  // 有 useEffect 待执行，记住 root 并交给 Scheduler 异步 flush，不阻塞本次 commit 后的绘制
  if (
    (finishedWork.flags & Passive) !== NoFlags ||
    (finishedWork.subtreeFlags & Passive) !== NoFlags
  ) {
    if (rootWithPendingPassiveEffects !== root) {
      rootWithPendingPassiveEffects = root;
      scheduleCallback(NormalPriority, flushPassiveEffects);
    }
  }

  ensureRootIsScheduled(root, now());
}
```

这段代码把「二、2~4」讲的阶段划分直接对应到了执行顺序上：先 `commitBeforeMutationEffects`（before mutation），再 `commitMutationEffects`（mutation，含 insertion effect 与 layout effect 销毁），再切换 `root.current`（双缓存生效），再 `commitLayoutEffects`（layout，挂载 useLayoutEffect），最后按 `Passive` flag 判断是否需要异步调度 passive effect。与官方源码相比，这份实现省去了官方那些 DEV 校验、profiler 埋点、`recoverableErrors` 处理等分支，只保留了三阶段调度的主链路，逐行对照下来结构完全一致。

### 2. mutation 阶段：新增 useInsertionEffect 的调用顺序

这是本篇真正新写的代码。在 `commitMutationEffectsOnFiber` 的 `FunctionComponent` 分支里，参照官方顺序补上了 `HookInsertion` 的销毁+挂载，紧跟在 `HookLayout` 销毁之前：

```typescript
case FunctionComponent:
case ForwardRef:
case MemoComponent: {
  recursivelyTraverseMutationEffects(root, finishedWork, lanes);
  commitReconciliationEffects(finishedWork);

  if (flags & Update) {
    // 对照官方：useInsertionEffect 的销毁+挂载都在这里、DOM 变更之后立刻完成——它不像
    // useLayoutEffect 那样把挂载推迟到 commitLayoutEffects，因为它的定位就是"比
    // useLayoutEffect 更早"，必须在浏览器/其他组件读取布局信息之前就把 <style> 插进去。
    commitHookEffectListUnmount(HookInsertion | HookHasEffect, finishedWork);
    commitHookEffectListMount(HookInsertion | HookHasEffect, finishedWork);

    // layout effect 的销毁提前到 mutation 阶段（销毁旧值），挂载则统一放到
    // commit 完全结束、root.current 已切换之后的 commitLayoutEffects——这样能保证一棵树里
    // 所有兄弟组件的销毁都先跑完，才轮到任何一个组件挂载新的 layout effect，不会互相干扰。
    commitHookEffectListUnmount(HookLayout | HookHasEffect, finishedWork);
  }
  return;
}
```

关键在调用顺序：`recursivelyTraverseMutationEffects`（递归子树）永远排在最前面，`useInsertionEffect` 的销毁+挂载紧跟着 DOM 插入（`commitReconciliationEffects`）之后立刻完成，`useLayoutEffect` 的销毁排在最后——这个顺序与「三、3」贴的官方源码逐行一致：单个 fiber 内部是"子树 mutation → 本 fiber DOM 插入 → 本 fiber insertion effect 销毁+挂载 → 本 fiber layout effect 销毁"。

`useInsertionEffect` 不像 `useLayoutEffect` 那样把挂载推迟到 layout 阶段，而是销毁+挂载都在 mutation 阶段就地完成——因为它的定位就是"必须比 layout 更早"，只有这样才能保证任何组件的 `useLayoutEffect` 读取布局信息时，本次渲染涉及的样式改动已经全部生效。

### 3. Hook 侧实现：mountInsertionEffect/updateInsertionEffect

`ReactFiberHooks.ts` 里新增的两个函数，完全复用已有的 `mountEffectImpl`/`updateEffectImpl`，只是传入的 `hookFlags` 换成了 `HookInsertion`：

```typescript
// 对照官方 mountInsertionEffect/updateInsertionEffect：与 useLayoutEffect 共用
// mountEffectImpl/updateEffectImpl，只是 hookFlags 换成 HookInsertion——commit 阶段靠这个
// tag 把它筛到 mutation 子阶段（DOM 变更前）执行，而不是 layout 子阶段。
function mountInsertionEffect(
  create: () => (() => void) | void,
  deps: unknown[] | void | null,
): void {
  mountEffectImpl(UpdateEffect, HookInsertion, create, deps);
}

function updateInsertionEffect(
  create: () => (() => void) | void,
  deps: unknown[] | void | null,
): void {
  updateEffectImpl(UpdateEffect, HookInsertion, create, deps);
}
```

这两个函数被接入 `HooksDispatcherOnMount`/`HooksDispatcherOnUpdate`/`ContextOnlyDispatcher` 三张 dispatcher 表，与 `useLayoutEffect` 并列。之所以能这么简单地复用 `mountEffectImpl`/`updateEffectImpl`，是因为三种 effect 在"生成 Effect 节点、打标记、deps 比较"这些逻辑上完全一样，唯一的区别就是 `commit` 阶段读取 `effect.tag` 时用哪个位掩码去筛选、以及筛选出来之后放在哪个子阶段执行——这正是「二、5」讲的"三种 effect 共用同一条环形链表，靠标记位区分"在代码层面的直接体现。

### 4. 导出链路：react 包新增 useInsertionEffect

`packages/react/src/ReactHooks.ts` 新增对外 API，模式与 `useLayoutEffect` 完全一致（只做参数转发，真正实现在 dispatcher 上）：

```typescript
/**
 * useInsertionEffect() - 在 DOM 变更之前同步执行副作用，专为 CSS-in-JS 库插入 <style> 设计
 */
export function useInsertionEffect(
  create: () => (() => void) | void,
  deps: unknown[] | void | null,
): void {
  const dispatcher = resolveDispatcher();
  return dispatcher.useInsertionEffect(create, deps);
}
```

`packages/react/src/index.ts` 补充导出，`fixtures/hooks/index.tsx` 补了一个验证用例：复用已有的 `effectOrder` 数组，在 `useLayoutEffect` 之前多打一条 `insertion(count=X)` 记录。

```typescript
// useInsertionEffect 应该比 useLayoutEffect 更早——它在 mutation 阶段、DOM 变更之后
// 立刻同步执行，而 useLayoutEffect 要等到 commitLayoutEffects（root.current 切换之后）
// 才挂载。三者叠加验证完整顺序：insertion → layout → （绘制）→ passive
useInsertionEffect(() => {
  effectOrder.push(`insertion(count=${count})`);
  console.log("useInsertionEffect 执行，count=", count, "顺序：", effectOrder);
  return () => {
    console.log("useInsertionEffect 清理，count=", count);
  };
}, [count]);
```

### 5. layout 阶段：位掩码匹配一份链表服务多种 effect（已有代码）

```typescript
function commitHookEffectListMount(
  flags: HookFlags,
  finishedWork: FiberNode,
): void {
  const updateQueue = finishedWork.updateQueue;
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      if ((effect.tag & flags) === flags) {
        const create = effect.create;
        effect.destroy = create();
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}
```

`commitHookEffectListMount`/`commitHookEffectListUnmount` 这两个函数完全不知道自己在处理哪种 effect——它们只是无差别地遍历 `fiber.updateQueue.lastEffect` 这条循环链表，靠调用方传入的 `flags` 参数（`HookInsertion | HookHasEffect`、`HookLayout | HookHasEffect`、`HookPassive | HookHasEffect`）和 `effect.tag & flags === flags` 这个位运算，筛出真正要执行的那些节点。`HasEffect` 位由 deps 是否变化决定——mount 阶段恒打，update 阶段 deps 不变则不打，这就是为什么 deps 不变时 effect 不会重新执行：不是遍历时判断出"不需要执行"就跳过，而是遍历到了但位匹配不上，`create()` 根本没被调用。

### 6. passive 阶段：先卸载再挂载（已有代码）

```typescript
function flushPassiveEffects(): void {
  const root = rootWithPendingPassiveEffects;
  if (root === null) {
    return;
  }
  rootWithPendingPassiveEffects = null;

  const prevExecutionContext = executionContext;
  executionContext |= CommitContext;

  commitPassiveUnmountEffects(root.current);
  commitPassiveMountEffects(root, root.current);

  executionContext = prevExecutionContext;
}
```

`flushPassiveEffects` 是 `scheduleCallback(NormalPriority, ...)` 异步调度执行的函数，先整体跑一遍 `commitPassiveUnmountEffects`（卸载所有需要清理的旧 passive effect），再整体跑一遍 `commitPassiveMountEffects`（挂载所有新的）。这两个函数内部的递归结构和 `commitLayoutEffectsOnFiber` 完全一致——子树优先、自身最后，同样呈现"子组件先于父组件"的顺序。

### 7. pushEffect：环形链表怎么维护（已有代码）

```typescript
function pushEffect(
  tag: HookFlags,
  create: () => (() => void) | void,
  destroy: (() => void) | void,
  deps: unknown[] | null,
): Effect {
  const effect: Effect = { tag, create, destroy, deps, next: null as any };
  let componentUpdateQueue = currentlyRenderingFiber.updateQueue;
  if (componentUpdateQueue === null) {
    componentUpdateQueue = { lastEffect: null };
    currentlyRenderingFiber.updateQueue = componentUpdateQueue;
    componentUpdateQueue.lastEffect = effect.next = effect;
  } else {
    const lastEffect = componentUpdateQueue.lastEffect;
    if (lastEffect === null) {
      componentUpdateQueue.lastEffect = effect.next = effect;
    } else {
      const firstEffect = lastEffect.next;
      lastEffect.next = effect;
      effect.next = firstEffect;
      componentUpdateQueue.lastEffect = effect;
    }
  }
  return effect;
}
```

`lastEffect.next` 始终指向链表头部，新节点插入到 `lastEffect` 和头部之间、再把 `lastEffect` 更新为新节点——这样不管链表里有多少个 effect（`useInsertionEffect`/`useLayoutEffect`/`useEffect` 混在一起也一样），永远可以通过 `lastEffect.next` 一步拿到第一个节点，`commitHookEffectListMount`/`Unmount` 遍历时用 `do...while (effect !== firstEffect)` 正好能转完一圈回到起点，不需要额外记录链表长度。

**验证方式**：`pnpm dev` 起本地 Vite 调试环境，触发一次 `fixtures/hooks` 里的 `setState`，观察控制台 `effectOrder` 数组的打印顺序，应该能看到同一次渲染里 `insertion(count=X)` 先于 `layout(count=X)`，`layout(count=X)` 又先于 `passive(count=X)`；在 `commitMutationEffectsOnFiber`/`commitLayoutEffectsOnFiber`/`flushPassiveEffects` 打断点，可以实测到子组件的 effect 调用（不管是哪一种）总是先于父组件，且 `useEffect` 确实是在整个同步 commit 流程（before mutation + mutation + 双缓存切换 + layout）全部走完之后，才通过 `scheduleCallback` 异步执行的。`pnpm build` 与 `tsc --noEmit` 均已验证通过，新增代码没有引入类型错误。

---

## 五、手写实现源码地址

- GitHub：https://github.com/lotosv2010/react-source
- 本地路径：`D:\github\react-source`

---

## 六、参考资料

- https://zh-hans.react.dev/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com
- https://github.com/wbccb/Frontend-Articles

---

## 💡 面试核心问

- **commit 阶段为什么必须同步不可中断，render 阶段为什么可以？**
- **`useLayoutEffect` 和 `useEffect` 的执行时机差异具体是什么，分别对应 commit 的哪个子阶段？**
- **父子组件的 `useEffect` 谁先执行？为什么？这个顺序和收集阶段的遍历顺序是什么关系？**
- **`useInsertionEffect` 解决了什么问题？为什么它必须比 `useLayoutEffect` 更早执行？**
- **`getSnapshotBeforeUpdate` 为什么必须在 DOM 变更前（before mutation 阶段）调用，放到 mutation 之后会有什么问题？**

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话核心 | 面试考察频率 |
|--------|-----------|-------------|
| commit 同步不可中断 | render 操作内存 Fiber 可中断，commit 操作真实 DOM 必须一次跑完 | ⭐⭐⭐⭐ |
| before mutation | DOM 变更前读快照，`getSnapshotBeforeUpdate` 唯一调用点 | ⭐⭐⭐ |
| mutation 阶段 | 真正增删改 DOM，`useInsertionEffect` 全量执行 + `useLayoutEffect` 销毁都在这里 | ⭐⭐⭐⭐⭐ |
| layout 阶段 | DOM 已变更、未绘制，同步挂载 `useLayoutEffect`、更新 ref | ⭐⭐⭐⭐⭐ |
| effect 收集自底向上 | 渲染函数执行顺序决定收集顺序，子组件先被 push 进链表 | ⭐⭐⭐⭐ |
| 子先父后执行顺序 | 收集自底向上 + 遍历"子树优先自身最后"，两层叠加 | ⭐⭐⭐⭐⭐ |
| useInsertionEffect | mutation 阶段就地销毁+挂载，比 layout 更早，服务 CSS-in-JS | ⭐⭐⭐⭐ |
| passive 异步调度 | commit 全部结束后 `scheduleCallback`，先卸载再挂载 | ⭐⭐⭐⭐ |

---

## 📝 思考题

**留个问题**：`commitHookEffectListMount`/`commitHookEffectListUnmount` 都用 `(effect.tag & flags) === flags` 这个位运算来判断"这个 effect 是否要执行"，而不是简单地遍历链表执行每一个节点。如果去掉这个位判断，直接对链表里的每个 effect 都调用 `create()`，会导致什么问题？提示：想一想同一个函数组件里 `useInsertionEffect`/`useLayoutEffect`/`useEffect` 的 `Effect` 节点其实挂在同一条链表上这个事实，以及 deps 不变时的 effect 应不应该重新执行。

答案留在评论区，或者在后续 Hooks 深度篇（第 06 篇）讲 Dispatcher 切换与 Hook 链表时会再次提到相关细节。

---

> 🔖 这是「React 18 全家桶深度拆解系列」第 5 篇。上一篇：《React 18 Diff 算法: 单节点与多节点 Diff 源码精读（面试收藏级）》；下一篇预告：《React 18 Hooks 深度: 设计哲学、dispatcher 切换与 Hook 链表源码（面试收藏级）》
