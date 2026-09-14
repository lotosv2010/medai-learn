# React 18 commit 阶段: 三个子阶段与 effect 执行顺序原理（面试收藏级）

> **副标题**：before mutation/mutation/layout 三阶段、effect 链表收集、useLayoutEffect/useEffect 执行时机与异步调度

---

## 🎯 这篇文章解决什么问题

上一篇结尾留了个思考题：`useFiber` 和 `cloneChildFibers` 调用 `createWorkInProgress` 时传入的第二个参数不一样，一个是新 props，一个是子节点自己的 pendingProps。这个悬念本篇不会直接展开（留给 Hooks 篇），但会先问一个更贴近日常调试的问题：**父子组件都写了 `useEffect`，谁先执行？**

大多数人凭直觉会答"父组件先渲染，所以父组件的 effect 先执行"——这个直觉是错的，真实顺序恰恰相反：子组件先执行。更进一步，如果面试官追问"那 `useLayoutEffect` 和 `useEffect` 混在一起，完整的执行顺序是什么样的"，很多人只能说出"一个同步一个异步"，说不清楚这个顺序具体是在 commit 阶段的哪一步被决定的。

这一篇要讲透的，是 commit 阶段的完整子阶段划分：为什么 commit 必须同步不可中断，DOM 变更前后各自能做什么，`useLayoutEffect`/`useEffect` 的挂载和销毁分别挂在哪个子阶段，以及"子组件先于父组件"这条规律的根源到底在哪一步代码里。读完之后，你会同时获得两种确定感：**懂原理**（三个子阶段各自的职责边界）和**会讲**（面试官顺着任意一个环节追问都能拆解回答）。

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

**需要说明的是**：这是官方 React 的行为讲解。`D:\github\react-source` 本地仓库目前还没有实现 `ClassComponent`（`ReactWorkTags.ts` 定义了 `ClassComponent = 1` 这个 tag 数值，但 `beginWork`/`completeWork`/`commitWork` 都没有对它的分发处理），对应 `docs/roadmap.md` Phase 8（待实现）。也就是说 `getSnapshotBeforeUpdate` 这个生命周期本篇只能讲官方设计，本地仓库暂时无法运行验证。

### 3. 实测：父子组件 useEffect 的执行顺序

用仓库现有的 `fixtures/hooks/index.tsx` 里已经搭好的验证场景：组件内部维护一个模块级的 `effectOrder` 数组，`useLayoutEffect`/`useEffect` 回调里各自 push 一条记录：

```typescript
useLayoutEffect(() => {
  effectOrder.push(`layout(count=${count})`);
  console.log("useLayoutEffect 执行，count=", count, "顺序：", effectOrder);
  return () => {
    console.log("useLayoutEffect 清理，count=", count);
  };
}, [count]);

useEffect(() => {
  effectOrder.push(`passive(count=${count})`);
  console.log("useEffect 执行，count=", count, "顺序：", effectOrder);
  return () => {
    console.log("useEffect 清理，count=", count);
  };
}, [count]);
```

在这个基础上手动嵌套一层父子组件，各自打印同样的日志，实际跑一遍会看到：子组件的 `layout` 记录先出现，接着子组件的 `passive` 记录出现在父组件的 `layout` 记录**之前**——不是简单的"父先子后"或"子先父后"，而是"所有 layout 都同步跑完之后，所有 passive 才异步开始"，且这两组内部都是子先父后。本篇「四、手写实现」会逐行对照代码解释这个现象。

### 4. useRef 跨渲染保持引用

```typescript
const renderCount = useRef(0);
renderCount.current += 1;
```

`useRef` 返回的 `{ current: ... }` 对象在多次渲染之间保持同一个引用，`renderCount.current` 的累加不会因为组件重渲染而丢失，也不会像 `useState` 一样触发重渲染。

**需要说明的是**：这里用的是"手动创建、跨渲染保持引用"的裸 ref 用法。官方 React 还支持 `<div ref={domRef}>` 这种把 ref 自动挂载到真实 DOM 节点上的用法，挂载动作发生在 commit 的 mutation 阶段之后。本地仓库的 `commitMutationEffectsOnFiber`（`ReactFiberCommitWork.ts`）目前没有任何 `markRef`/`commitAttachRef`/`Ref` flag 的提交处理逻辑，对应 `docs/roadmap.md` Phase 9.2（待实现），所以 `ref={domRef}` 自动挂载 DOM 节点这个用法本地暂不支持，只能用 `renderCount` 这种手动 ref 模式验证"跨渲染保持引用"这一个特性。

---

## 二、设计与原理

### 1. commit 阶段为什么必须同步不可中断

render 阶段（`beginWork`/`completeWork`）只在内存里操作 Fiber 对象，构建的是还没有生效的 workInProgress 树，可以被 `shouldYield` 打断、丢弃重来，用户看不到任何中间态。commit 阶段则是真正把变更应用到真实 DOM 的阶段——一旦开始插入、更新、删除节点，如果中途被打断，用户会看到一个"一部分 DOM 已经变了、另一部分还没变"的不一致界面。这是 commit 阶段必须同步跑完的根本原因：DOM 操作没有"暂停再继续"的中间态可言。

### 2. before mutation 阶段：DOM 变更前读取快照

这个阶段发生在任何 DOM 操作之前，`getSnapshotBeforeUpdate` 在这里被调用——必须在 DOM 变更前读取，因为它要拿到"变更前"的状态（比如变更前的滚动高度），如果放到 mutation 或 layout 阶段，DOM 已经变了，读到的就是"变更后"的错误值。

### 3. mutation 阶段：真正执行 DOM 增删改

`commitPlacement`/`commitDeletion`/`commitUpdate` 在这个阶段真正操作真实 DOM。同时，`useLayoutEffect` 的销毁函数（上一次渲染留下的 cleanup）也在这个阶段被调用——先清理旧的，再挂载新的，这是所有"挂载/销毁"成对出现的副作用系统的通用顺序。

### 4. layout 阶段：DOM 已变更、浏览器未绘制

DOM 结构此时已经是最新的，但浏览器还没有把这次变更绘制到屏幕上。这个阶段同步执行 `useLayoutEffect` 的挂载回调、更新 ref 的指向——因为可以同步读取到最新的布局信息（比如 `getBoundingClientRect`），且在这里做的任何修改都会在同一次绘制里生效，不会产生可感知的"跳动"。如果换成绘制后才修改布局，用户会看到一次明显的跳动，这正是「一、1」处方单弹窗场景的原理。

📍**配图点**：commit 三阶段时间线图——用一条横向时间轴依次标出 before mutation → mutation（DOM 变更）→ layout（绘制前同步）→ 浏览器绘制 → passive（绘制后异步）五个时间点，每个时间点标注"DOM 处于什么状态"和"这个阶段能做什么"。

### 5. effect 链表的收集时机

`completeWork` 阶段自底向上遍历 Fiber 树时，每个函数组件在渲染过程中调用的 `useEffect`/`useLayoutEffect` 都会通过 `pushEffect` 生成一个 `Effect` 节点，串成一条挂在 `fiber.updateQueue.lastEffect` 上的环形链表。这个收集动作本身是随着 `beginWork`/渲染函数执行顺序发生的（子组件先渲染完，子组件的 effect 先被 push），这也是为什么后续执行阶段天然呈现"子组件先于父组件"的顺序——顺序不是执行阶段专门判断出来的，而是收集阶段就已经决定了。

### 6. effect 执行顺序原则：子组件先于父组件

`useLayoutEffect`（`HookLayout`）在 layout 阶段同步执行，`useEffect`（`HookPassive`）在 commit 全部完成后通过 Scheduler 以正常优先级异步调度执行。无论哪一种，执行顺序都遵循"子组件先于父组件"：这是因为收集阶段（渲染函数执行）本身自底向上，子组件更早完成渲染、更早把自己的 effect 加入链表；执行阶段的遍历顺序又是"先递归子树，再处理自身"，两层自底向上叠加，最终表现为子组件的 effect 无论是 layout 还是 passive，都先于父组件执行。

这条规律解释了很多实际问题，比如父组件的 `useEffect` 里访问子组件通过 ref 暴露的方法一定是安全的——子组件的挂载 effect 已经跑完。

📍**配图点**：一棵三层组件树（父→中→子）的 effect 执行顺序图，用两组箭头分别标出"layout 同步块"（子→中→父，绘制前完成）和"passive 异步块"（子→中→父，绘制后完成），直观展示两组内部都是自底向上、两组之间 layout 全部先于 passive。

### 7. useInsertionEffect 的定位

React 18 补齐的第三种 effect，执行时机比 `useLayoutEffect` 更早——在 DOM 变更（mutation）之前执行，专门为 CSS-in-JS 库设计，用于在 DOM 变更前动态插入 `<style>` 标签，避免 `useLayoutEffect` 阶段读取布局信息时样式还没生效导致的测量错误。

**需要说明的是**：这是官方 React 的设计讲解。本地仓库的 `ReactHookEffectTags.ts` 里定义了 `Insertion = 0b0010` 这个数值，但注释明确写着"本项目暂不实现，留空位仅为了与官方数值对齐，方便对照"，`ReactFiberHooks.ts` 的 `HooksDispatcherOnMount`/`HooksDispatcherOnUpdate` 里都没有 `useInsertionEffect` 字段。这是当前本地仓库的已知简化边界。

三种 effect 的执行时机总结：`useInsertionEffect`（mutation 之前）→ DOM 变更（mutation）→ `useLayoutEffect`（layout，绘制前同步）→ 浏览器绘制 → `useEffect`（绘制后异步）。

### 8. 对比 Vue 3

Vue 3 的 `onMounted`/`onUpdated` 对应 React 的 `useLayoutEffect` 时机（同步，DOM 更新后立即执行），Vue 3 没有内置一个默认异步调度的等价物（需要手动 `nextTick` 或用 `Promise.resolve().then`）。这是因为 Vue 3 的更新本身走微任务队列，"绘制后再执行"这件事需要开发者自己额外处理，而 React 默认的 `useEffect` 就是"绘制后执行"，这个默认值的选择本身也体现了两个框架对"副作用默认应该多早/多晚执行"的不同判断。

---

## 三、源码解析（重点代码，来源 GitHub 仓库）

> 每个小节先给官方源码定位（`facebook/react`，本地路径 `D:\github\react`），再对照本地手写仓库 `D:\github\react-source` 已经跑通的真实实现，并明确标注本地尚未实现的边界。

### 1. commit 总调度

官方位置：`packages/react-reconciler/src/ReactFiberWorkLoop.js`（`flushPassiveEffects` 第 4691 行起）。

本地实现（`ReactFiberWorkLoop.ts` 的 `commitRootImpl`）依次调用 `commitMutationEffects` → 双缓存树切换 → `commitLayoutEffects`，代码注释明确写着"before-mutation 子阶段留到后续，本项目暂无 `getSnapshotBeforeUpdate`/`Snapshot` flag 场景"。**本地仓库当前只有 mutation + layout 两个同步子阶段，没有 before-mutation 子阶段**，这是与官方三阶段划分的一个已知落差。

### 2. mutation 阶段

官方位置：`packages/react-reconciler/src/ReactFiberCommitWork.js`（`commitMutationEffects` 第 2027 行起，`HookInsertion` 相关调用在 2115/2120 行）。

本地对应 `commitMutationEffectsOnFiber`，详见「四、手写实现」的完整代码解读。

### 3. layout 阶段

官方位置：同文件（`commitLayoutEffects` 第 3063 行起）。

本地对应 `commitLayoutEffectsOnFiber`，详见「四」。

### 4. passive 异步调度

官方位置：同文件（`commitPassiveMountEffects` 第 3764 行起、`commitPassiveUnmountEffects` 第 4853 行起）。

本地对应同名导出函数 + `flushPassiveEffects`，详见「四」。

### 5. useInsertionEffect

官方位置：`packages/react-reconciler/src/ReactFiberHooks.js` 的 `mountInsertionEffect`/`updateInsertionEffect`。**本地仓库未实现**这两个函数，`HooksDispatcherOnMount`/`OnUpdate` 里也没有对应字段，讲解只能对照官方版本，属于当前的已知简化边界。

---

## 四、手写实现（解读已完成代码）

先说清楚一件事：本节要讲的 `commitRootImpl`/`commitMutationEffectsOnFiber`/`commitLayoutEffectsOnFiber`/`flushPassiveEffects`/`pushEffect`，**都不是本篇新写的代码**。它们是 `D:\github\react-source` 仓库按自己的 `docs/roadmap.md` 节奏，在 Phase 5（Hooks，已完成）落地 `useEffect`/`useLayoutEffect` 时一并实现的真实代码。本篇的任务是把这些已经跑通的代码逐行讲透。

### 1. commitRootImpl 总控流程

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

  const remainingLanes = mergeLanes(
    finishedWork.lanes,
    finishedWork.childLanes,
  );
  markRootFinished(root, remainingLanes);

  const prevExecutionContext = executionContext;
  executionContext |= CommitContext;

  // mutation 子阶段：插入/更新/删除 DOM（before-mutation 子阶段留到后续，本项目暂无
  // getSnapshotBeforeUpdate/Snapshot flag 场景）
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

这段代码把「二、2~4」讲的阶段划分直接对应到了执行顺序上：先 `commitMutationEffects`（mutation，含 layout effect 销毁），再切换 `root.current`（双缓存生效），再 `commitLayoutEffects`（layout，挂载 useLayoutEffect），最后按 `Passive` flag 判断是否需要异步调度 passive effect。`root.current` 的切换特意放在 mutation 之后、layout 之前——因为 `useLayoutEffect` 里读 `ref.current` 或做 DOM 测量时，`fiber.stateNode` 必须已经是最新提交的状态。

### 2. mutation 阶段：子树优先，销毁排在最后

```typescript
function commitMutationEffectsOnFiber(
  finishedWork: FiberNode,
  root: FiberRootNode,
  lanes: Lanes,
): void {
  const current = finishedWork.alternate;
  const flags = finishedWork.flags;

  switch (finishedWork.tag) {
    // ...HostComponent/HostText/HostRoot 分支省略，见上一篇 Diff 算法的删除逻辑
    case FunctionComponent: {
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);

      // 对照官方：layout effect 的销毁提前到 mutation 阶段（销毁旧值），挂载则统一放到
      // commit 完全结束、root.current 已切换之后的 commitLayoutEffects——这样能保证一棵树里
      // 所有兄弟组件的销毁都先跑完，才轮到任何一个组件挂载新的 layout effect，不会互相干扰。
      if (flags & Update) {
        commitHookEffectListUnmount(HookLayout | HookHasEffect, finishedWork);
      }
      return;
    }
    default: {
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      return;
    }
  }
}
```

关键在调用顺序：`recursivelyTraverseMutationEffects`（递归子树）永远排在最前面，自身的 `commitHookEffectListUnmount` 排在最后——这意味着一个节点的 `useLayoutEffect` 销毁函数，一定是在它所有子节点的销毁函数都跑完之后才被调用。这正是「二、6」讲的"自底向上"在代码层面的体现：不是有一个专门的排序步骤，而是递归调用本身天然形成了这个顺序。

销毁动作被安排在 mutation 阶段而不是 layout 阶段，是为了保证"一棵树里所有节点的旧 layout effect 都先销毁完，才轮到任何节点挂载新的"——如果销毁和挂载交替进行，可能出现"A 组件挂载了新 effect，但 B 组件还没销毁旧 effect"的中间态，两者如果有资源竞争（比如都操作同一个 DOM 属性）就会互相干扰。

### 3. layout 阶段：位掩码匹配一份链表服务 mount 和 update

```typescript
function commitLayoutEffectsOnFiber(
  root: FiberRootNode,
  finishedWork: FiberNode,
): void {
  const flags = finishedWork.flags;

  switch (finishedWork.tag) {
    case FunctionComponent: {
      recursivelyTraverseLayoutEffects(root, finishedWork);
      if (flags & Update) {
        commitHookEffectListMount(HookLayout | HookHasEffect, finishedWork);
      }
      return;
    }
    default: {
      recursivelyTraverseLayoutEffects(root, finishedWork);
      return;
    }
  }
}

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

`commitLayoutEffectsOnFiber` 同样是"递归子树在前，自身处理在后"，子组件的 `useLayoutEffect` 挂载回调先于父组件执行。

`commitHookEffectListMount` 遍历的是 `fiber.updateQueue.lastEffect` 这条循环链表——一个函数组件里 `useLayoutEffect` 和 `useEffect` 的 `Effect` 节点混在同一条链表上，靠 `effect.tag & flags === flags` 的位运算筛选出真正要执行的那些：调用时传入 `HookLayout | HookHasEffect`，只有 `tag` 里同时带着 `Layout` 位和 `HasEffect` 位的节点才会被执行。`HasEffect` 位由 deps 是否变化决定（mount 阶段恒打，update 阶段 deps 不变则不打），这就是为什么 deps 不变时 effect 不会重新执行——不是判断出"不需要执行"就跳过遍历，而是遍历到了但位匹配不上，`create()` 根本没被调用。

### 4. passive 阶段：先卸载再挂载

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

"先卸载再挂载"分两步整体跑完，而不是"卸载一个组件就立刻挂载它"，是为了保证同一批 commit 里"旧的先全部清理完，新的再全部挂载"——这个顺序保证与「2. mutation 阶段」里 layout effect 销毁提前到 mutation 阶段是同一个设计意图，只是 passive effect 的销毁和挂载都延后到了异步阶段，因为 `useEffect` 本身就不要求同步。

### 5. pushEffect：环形链表怎么维护

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

`lastEffect.next` 始终指向链表头部，新节点插入到 `lastEffect` 和头部之间、再把 `lastEffect` 更新为新节点——这样不管链表里有多少个 effect，永远可以通过 `lastEffect.next` 一步拿到第一个节点，`commitHookEffectListMount`/`Unmount` 遍历时用 `do...while (effect !== firstEffect)` 正好能转完一圈回到起点，不需要额外记录链表长度。

`mountEffectImpl`（mount 时调用）恒打 `HookHasEffect`，因为首次渲染必须执行一次 create；`updateEffectImpl`（update 时调用）先比较 deps，deps 不变就不打 `HookHasEffect`（但仍然复用上一次的 `destroy`，让下次真正需要卸载时能拿到正确的清理函数），deps 变化才重新打标记。这两个函数分别对应 `useEffect`/`useLayoutEffect` 的 mount/update 版本，只是传入的 `hookFlags` 不同（`HookPassive` 还是 `HookLayout`）。

**验证方式**：不新建 demo，直接用仓库现有的 `fixtures/hooks/index.tsx`，`pnpm dev` 起 vite 调试环境。观察控制台 `effectOrder` 数组的打印顺序，应该能看到同一次渲染里 `layout(count=X)` 先于 `passive(count=X)`；在 `commitMutationEffectsOnFiber`/`commitLayoutEffectsOnFiber`/`flushPassiveEffects` 打断点，可以实测到子组件的 effect 调用（无论 layout 还是 passive）总是先于父组件，且 `useEffect` 确实是在整个同步 commit 流程（mutation + 双缓存切换 + layout）全部走完之后，才通过 `scheduleCallback` 异步执行的。

---

## 五、手写实现源码地址

- GitHub：https://github.com/lotosv2010/react-source
- 本地路径：`D:\github\react-source`（详细目录结构与开发约定见仓库 `README.md`/`CLAUDE.md`/`docs/roadmap.md`）

---

## 六、参考资料

- https://react.iamkasong.com
- https://jonny-wei.github.io/blog/react/
- https://zh-hans.react.dev/

---

## 💡 面试核心问

- **commit 阶段为什么必须同步不可中断，render 阶段为什么可以？**
- **`useLayoutEffect` 和 `useEffect` 的执行时机差异具体是什么，分别对应 commit 的哪个子阶段？**
- **父子组件的 `useEffect` 谁先执行？为什么？这个顺序和收集阶段的遍历顺序是什么关系？**
- **`useInsertionEffect` 解决了什么问题？为什么它必须比 `useLayoutEffect` 更早执行？**（本地仓库未实现该 Hook，这一问只能按官方设计回答）
- **`getSnapshotBeforeUpdate` 为什么必须在 DOM 变更前（before mutation 阶段）调用，放到 mutation 之后会有什么问题？**

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话核心 | 面试考察频率 |
|--------|-----------|-------------|
| commit 同步不可中断 | render 操作内存 Fiber 可中断，commit 操作真实 DOM 必须一次跑完 | ⭐⭐⭐⭐ |
| before mutation | DOM 变更前读快照，`getSnapshotBeforeUpdate` 调用点（本地未实现） | ⭐⭐⭐ |
| mutation 阶段 | 真正增删改 DOM，`useLayoutEffect` 销毁函数也在这里跑 | ⭐⭐⭐⭐⭐ |
| layout 阶段 | DOM 已变更、未绘制，同步挂载 `useLayoutEffect`、更新 ref | ⭐⭐⭐⭐⭐ |
| effect 收集自底向上 | 渲染函数执行顺序决定收集顺序，子组件先被 push 进链表 | ⭐⭐⭐⭐ |
| 子先父后执行顺序 | 收集自底向上 + 遍历"子树优先自身最后"，两层叠加 | ⭐⭐⭐⭐⭐ |
| useInsertionEffect | mutation 之前执行，服务 CSS-in-JS（本地未实现） | ⭐⭐⭐ |
| passive 异步调度 | commit 全部结束后 `scheduleCallback`，先卸载再挂载 | ⭐⭐⭐⭐ |

---

## 📝 思考题

**留个问题**：`commitHookEffectListMount`/`commitHookEffectListUnmount` 都用 `(effect.tag & flags) === flags` 这个位运算来判断"这个 effect 是否要执行"，而不是简单地遍历链表执行每一个节点。如果去掉这个位判断，直接对链表里的每个 effect 都调用 `create()`，会导致什么问题？提示：想一想 deps 不变时的 `useEffect`/`useLayoutEffect`，以及同一个函数组件里 `useLayoutEffect` 和 `useEffect` 的 `Effect` 节点其实挂在同一条链表上这个事实。

答案留在评论区，或者在后续 Hooks 深度篇（第 06 篇）讲 Dispatcher 切换与 Hook 链表时会再次提到相关细节。

---

> 🔖 这是「React 18 全家桶深度拆解系列」第 5 篇。上一篇：《React 18 Diff 算法: 单节点与多节点 Diff 源码精读（面试收藏级）》；下一篇预告：《React 18 Hooks 深度: 设计哲学、dispatcher 切换与 Hook 链表源码（面试收藏级）》
