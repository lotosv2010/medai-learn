# React 18 Diff 算法: 单节点与多节点 Diff 源码精读（面试收藏级）

> **副标题**：单节点 Diff、多节点两轮遍历、lastPlacedIndex 移动判断、key 的真正作用

---

## 🎯 这篇文章解决什么问题

上一篇结尾留了个思考题：bailout 命中时 `cloneChildFibers` 只克隆结构不重新渲染，那些中间节点的 `memoizedProps` 到底会不会被更新。这个悬念先按下不表，本篇会在最后给出解答线索——但更值得先解决的，是上一篇「一、1」就出现过的那个现场事故：患者列表用数组 index 作 key，插入一条新记录后，之前展开的详情面板和输入框内容全部错位到了别的患者身上。

大多数人对这个 bug 的理解停留在「index 作 key 不好，换成业务 id 就行」，但面试官追问一句「具体是哪一步判断出了问题」，往往答不上来——这背后是 `beginWork` 里 `reconcileChildren` 调用的**子节点 Diff 算法**：React 怎么决定"这个位置的旧节点还能不能接着用"，`key` 在这个决策里到底扮演什么角色，`lastPlacedIndex` 又是怎么算出"这个节点需要移动"的。

这一篇要讲透的，是 Diff 算法的完整判断链路：单节点场景怎么找可复用的旧 Fiber，多节点场景的三阶段遍历分别在解决什么问题，以及"index 作 key"错位事故在算法层面到底是怎么发生的。读完之后，你会同时获得两种确定感：**懂原理**（`reconcileChildrenArray` 三个阶段各自的判断依据）和**会讲**（面试官顺着任意一个分支追问都能拆解回答）。

---

## 一、使用与实践

### 1. 复盘：患者列表用 index 作 key 的错位事故

承接上一篇的复现代码：

```jsx
function PatientList({ patients }) {
  return (
    <ul>
      {patients.map((p, index) => (
        <PatientRow key={index} patient={p} />
      ))}
    </ul>
  )
}
```

原始列表 `[张三, 李四, 王五]`，用户点开"张三"（index=0）的详情面板并在输入框里填了几个字。随后一条新记录插入到最前面，变成 `[新患者, 张三, 李四, 王五]`。

刷新后，"展开的详情面板"和"填好的输入框内容"出现在了新患者行上，张三行反而是收起状态——数据没错，UI 状态全错位了。本篇后半段会用 Diff 算法逐步推演这个错位具体发生在哪一步判断。

### 2. 正确写法：稳定的业务 key

```jsx
{patients.map((p) => (
  <PatientRow key={p.patientId} patient={p} />
))}
```

`key` 用患者的唯一业务 ID，插入新记录后，React 能通过 `key` 精确匹配到"张三还是张三这一行"，不会被数组下标的变化误导。

### 3. 不写 key 时的默认行为

如果数组渲染时完全不写 `key`：

```jsx
{patients.map((p) => <PatientRow patient={p} />)}
```

React 仍然会渲染，只是在 `mapRemainingChildren`（多节点 Diff 第三阶段建 Map 时）会用 `existingChild.index` 兜底当作 key——效果等价于隐式的"index 作 key"，同样存在错位风险。官方版本在这种情况下会打印 DEV 警告（`Warning: Each child in a list should have a unique "key" prop`），提醒开发者显式声明。

### 4. DevTools Profiler 观察一次重排

在 React DevTools 的 Profiler 面板录制一次列表重排操作（比如把第 3 项拖到第 1 位），可以看到：真正需要移动的 DOM 节点会显示为一次 "Reordered"，而 key 匹配失败被判定为"新建"的节点会显示完整的挂载耗时（远高于纯移动）。这个直观差异，就是本篇要讲的 `placeChild` 判断在渲染性能上的体现。

---

## 二、设计与原理

### 1. Diff 算法的两个简化假设

要把两棵树的完全比较问题（理论复杂度 O(n³)）降到 React 实际用的 O(n)，Diff 算法做了两个关键让步：

- **只比较同一层级**：不会把一个节点从父层级搬到子层级去复用，跨层级的搬移一律走"删除旧的 + 新建的"
- **只在新旧 `type` 相同时才可能复用**：`type` 不同直接判定为不同种类的节点，不会尝试"部分复用"

这两个假设覆盖了绝大多数真实场景的开发习惯（很少有人把 `<div>` 手动改成 `<span>` 还期望内部状态被保留），用"可能错判一些边缘情况"换来了线性时间复杂度，是一个典型的工程取舍。

### 2. 单节点 Diff：`reconcileSingleElement`

当新的 children 是单个 React Element 时，走单节点 Diff：遍历旧 Fiber 链表（注意，旧节点可能不止一个，比如上一次渲染的是多节点数组，这一次变成单节点），按 `key` 查找：

- **`key` 相同、`type` 也相同**：复用这个 Fiber，同时把它后面所有的旧兄弟节点标记删除（因为新 children 只有一个，其余的都是多余的）
- **`key` 相同、`type` 不同**：判定为"这个位置的内容整个换了"，当前节点及其后面的兄弟全部标记删除，重新创建
- **遍历到底都没有 `key` 匹配的**：新建一个 Fiber

这里有个容易被忽略的细节：只要遍历过程中 `key` 不匹配，遍历到的旧节点也会被逐个标记删除（不是等到最后才批量清理），因为"这次没匹配上，以后也不会用得上"。

### 3. 多节点 Diff：`reconcileChildrenArray` 的三阶段

多节点场景（新 children 是数组）是 Diff 算法的核心，分三个阶段：

**第一阶段：头部逐位匹配（`updateSlot`）**

新旧数组按位置一一对应地比较，只要当前位置的 `key` 相同就继续（`type` 不同则标记这个位置的旧节点需要删除、生成新节点占位），一旦遇到 `key` 不匹配，立刻跳出这一轮遍历——不会继续往后比较。这是因为数组一旦出现"顺序被打乱"的迹象，逐位比较的意义就不大了，不如提前转向后面更高效的 Map 查找阶段。

**第二阶段：两条快路径**

跳出第一轮后，根据谁先耗尽分两种情况处理：

- **新 children 已经遍历完**：说明新数组比旧数组短，直接把剩下的旧节点全部标记删除，结束
- **旧 Fiber 链表已经用完**：说明新数组比旧数组更长，剩下的新节点全部是新建，直接建完，结束

这两条路径都不需要 Map，是纯线性操作。

**第三阶段：Map 查找兜底**

如果两边都还有剩余（说明中间发生了增删或者顺序打乱，情况复杂），才动用 `mapRemainingChildren` 把剩余的旧 Fiber 按 `key`（没有 `key` 就按 `index`）建成一个 Map，遍历剩余的新元素逐个去 Map 里查找匹配。查到就复用并从 Map 里删除（避免最后被误判为"没用到的旧节点"），查不到就新建。遍历结束后，Map 里还剩下的旧节点，就是这次真正被删除的节点。

📍**配图点**：多节点 diff 三阶段流程图——用一张图并排展示"头部逐位匹配 → 两条快路径分支 → Map 查找兜底"三个阶段，箭头标出数据从"新旧两个数组"流向"最终的 Fiber 链表"的路径，尤其标出第一阶段跳出的临界点。

### 4. `lastPlacedIndex`：判断一个节点是否需要移动

无论走哪个阶段，复用到的节点最终都要经过 `placeChild` 判断是否要打 `Placement` 标记（真正在 DOM 上移动）：

- 维护一个 `lastPlacedIndex`，初始为 0，表示"目前处理到的、不需要移动的节点里最大的旧 index"
- 每个被复用的节点，取它在旧数组里的 `oldIndex`：
  - 如果 `oldIndex < lastPlacedIndex`，说明这个节点在旧数组里排在"已确定不动的节点"前面，但在新数组里却排在后面——相对顺序被打乱了，需要移动，标记 `Placement`，`lastPlacedIndex` 保持不变
  - 否则说明这个节点相对顺序没有被打乱，不需要移动，把 `lastPlacedIndex` 更新为这个 `oldIndex`

**这个算法只关心"相对顺序有没有被打乱"，不是计算最小编辑距离**。这意味着某些复杂重排场景下，React 可能比理论最优解多移动几个节点——但换来的是线性时间的判断成本，这也是为什么说 React 的 Diff 是一种启发式算法。

📍**配图点**：`placeChild` 决策示意图——列一组新旧 index 对照表（比如新顺序 `[C, A, B]` 对应旧 index `[2, 0, 1]`），标出 `lastPlacedIndex` 在遍历过程中的变化轨迹，以及哪些节点被判定为"需要移动"。

### 5. index 作 key 为什么会错位：逐步推演

用最开始的 bug 场景推一遍算法：旧数组 `[张三(key=0), 李四(key=1), 王五(key=2)]`，插入新患者到最前面后变成 `[新患者, 张三, 李四, 王五]`。

如果用 index 作 key，新数组拿到的 key 序列是 `[0, 1, 2, 3]`。第一阶段头部逐位匹配：

- 位置 0：新元素 key=0，旧链表第一个也是 key=0（张三）——**key 匹配！** React 认为"这个位置的内容变了"，直接复用张三的 Fiber，只是把 props 换成新患者的数据
- 位置 1：新元素 key=1，旧链表第二个 key=1（李四）——同样匹配，复用李四的 Fiber，props 换成张三的数据
- 以此类推，每个位置都能匹配上，Diff 认为"没有任何节点被删除或新增，只是每个位置的 props 变了"

问题就出在这里：React 复用的是**Fiber 对象本身**（连同它内部 `memoizedState` 挂着的 Hook 链表、本地 `useState` 状态），只是把 `props` 换成了新的患者数据。原本挂在"位置 0 这个 Fiber"上的"展开状态 `expanded=true`"和"输入框内容"完全没有跟着张三的数据一起走，而是原地不动地套用到了新患者身上——这就是"状态错位跟着位置走，而不是跟着数据走"的根源。

如果用稳定的业务 `key`（`p.patientId`），新数组的 key 序列变成 `[新患者的id, 张三的id, 李四的id, 王五的id]`。第一阶段第一个位置就发现 `key` 不匹配（旧链表第一个是张三的 id，新数组第一个是新患者的 id），立刻跳出第一轮，进入 Map 查找阶段：张三/李四/王五的 Fiber 都能在 Map 里按各自的 `key` 精确找到并复用，新患者因为找不到匹配而新建。张三的 Fiber（连同它的 `expanded` 状态）被正确地复用到了张三的新位置上，而不是留在原来的位置 0。

### 6. 对比 Vue 3：patchKeyedChildren 的双端比较 + 最长递增子序列

Vue 3 的多节点 Diff（`patchKeyedChildren`）思路上也是"先头部/尾部逐位比较，再处理中间剩余部分"，但中间部分的处理用了**最长递增子序列**算法，能找出"真正不需要移动的最大子集"，在处理整体倒序这类场景时移动次数明显更少（React 遇到整体倒序，几乎每个节点的 `oldIndex` 都小于当时的 `lastPlacedIndex`，会判定几乎全部节点需要移动）。

这个差异背后是两者的设计目标不同：Vue 3 的模板在编译期就能确定大致结构，运行时有余力做更精细的算法；React 的 JSX 完全动态，Diff 算法要覆盖任意结构，选择了实现更简单、常数时间开销更小的方案。没有绝对的"更好"，只是针对各自的运行时约束做出的不同取舍。

---

## 三、源码解析（重点代码，来源 GitHub 仓库）

> 每个小节先给官方源码定位（`facebook/react`，本地路径 `D:\github\react`，v18.2.0），再对照本地手写仓库 `D:\github\react-source` 已经跑通的真实实现。

### 1. 单节点 Diff：`reconcileSingleElement`

官方位置：`packages/react-reconciler/src/ReactChildFiber.js`（第 1703 行起）。

本地实现（`packages/react-reconciler/src/ReactChildFiber.ts`）：

```typescript
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
      const elementType = element.type;
      if (elementType === REACT_FRAGMENT_TYPE) {
        if (child.tag === Fragment) {
          deleteRemainingChildren(returnFiber, child.sibling);
          const existing = useFiber(child, element.props.children);
          existing.return = returnFiber;
          return existing;
        }
      } else {
        if (child.elementType === elementType) {
          deleteRemainingChildren(returnFiber, child.sibling);
          const existing = useFiber(child, element.props);
          existing.ref = element.ref;
          existing.return = returnFiber;
          return existing;
        }
      }
      // key 相同但 type 不同，删掉它及其后面的兄弟
      deleteRemainingChildren(returnFiber, child);
      break;
    } else {
      deleteChild(returnFiber, child);
    }
    child = child.sibling;
  }
  // 没找到可复用的，新建
  // ...（新建逻辑，见下方"四、手写实现"完整代码）
}
```

逐个遍历旧兄弟链表，`key` 命中就检查 `type`，`type` 也对得上才真正复用；命中但 `type` 不对，或者压根没命中，最终都会走到新建分支。

### 2. 多节点 Diff 核心：`reconcileChildrenArray`

官方位置：同文件第 1177 行起。这是整个 Diff 算法里最复杂的一个函数，三阶段的分支判断详见「四、手写实现」的完整代码解读。

### 3. Diff 入口分发：`reconcileChildFibers`

官方位置：同文件第 2034 行起，按 `newChild` 的类型（单个 React Element / 数组 / 文本 / null）分发到不同的处理函数。本地实现在 `ChildReconciler` 工厂返回的 `reconcileChildFibers` 里做了同样的分发（详见「四」）。

### 4. `key` 的默认行为：官方 `warnOnInvalidKey`

官方在处理数组子节点时会对每个缺失显式 `key` 的元素调用 `warnOnInvalidKey`，在 DEV 模式打印警告提醒开发者补充稳定 `key`。**本地手写仓库当前尚未实现这个 DEV 警告**（`docs/roadmap.md` 里 Diff 算法这块列出的完成项只到"三阶段算法本身"，警告提示属于开发体验层面的补充，不影响主链路正确性），这是当前的一个已知简化边界，不是遗漏的核心逻辑。

---

## 四、手写实现（解读已完成代码）

先说清楚一件事：本节要讲的 `reconcileSingleElement`/`reconcileChildrenArray`/`placeChild`/`cloneChildFibers`，**都不是本篇新写的代码**。它们是 `D:\github\react-source` 仓库按自己的 `docs/roadmap.md` 节奏，在 Phase 3（更新与 Diff 算法，已完成）里早就落地的真实实现，`beginWork` 的 `reconcileChildren` 也已经在正式调用它们分发子节点——本篇的任务是把这些已经跑通的代码逐行讲透。

### 1. `ChildReconciler` 工厂：一套算法，两种模式

`ReactChildFiber.ts` 用一个工厂函数生成两个协调器：

```typescript
function ChildReconciler(shouldTrackSideEffects: boolean) {
  // ...reconcileSingleElement / reconcileChildrenArray 等一整套逻辑
  return reconcileChildFibers;
}

// 更新场景的 child 协调器（标记 Placement/ChildDeletion 副作用）
export const reconcileChildFibers = ChildReconciler(true);

// 挂载场景的 child 协调器（不标记副作用，父 fiber 自身已带 Placement）
export const mountChildFibers = ChildReconciler(false);
```

为什么 mount 和 update 要共用同一套 Diff 算法，只用一个布尔开关区分？因为两者要解决的"匹配"逻辑完全一样（`key` 怎么找、`type` 怎么比），唯一的区别是：**mount 阶段整棵子树都是新建的，父 Fiber 自身已经打了 `Placement` 标记，commit 阶段递归挂载父节点时子节点会一起挂上去，不需要给每个子节点重复打标记**；而 update 阶段每个节点都可能独立需要移动/删除，必须精确标记。用同一套逻辑、一个开关控制"要不要标记副作用"，比维护两套几乎相同的代码更省心，也不容易出现两套逻辑判断不一致的 bug。

`beginWork` 里的调用点（`ReactFiberBeginWork.ts` 的 `reconcileChildren`）印证了这个设计：

```typescript
export function reconcileChildren(
  current: FiberNode | null,
  workInProgress: FiberNode,
  nextChildren: any,
  renderLanes: Lanes,
): void {
  if (current === null) {
    // 全新的组件，子 fiber 全部新建；用 mountChildFibers（不标记副作用），
    // 父 fiber 自身已是 Placement，commit 阶段只挂顶层节点即可
    workInProgress.child = mountChildFibers(
      workInProgress,
      null,
      nextChildren,
      renderLanes,
    );
  } else {
    // 复用/更新：标记 Placement/ChildDeletion
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren,
      renderLanes,
    );
  }
}
```

`current === null` 就是"这个 Fiber 本身是第一次渲染"的判断依据（承接上一篇 mount/update 的判断标准），走 `mountChildFibers`；否则走 `reconcileChildFibers`。

### 2. `reconcileSingleElement` 的删除逻辑

`deleteChild`/`deleteRemainingChildren` 负责把不再需要的旧 Fiber 标记删除：

```typescript
function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode): void {
  if (!shouldTrackSideEffects) {
    return;
  }
  const deletions = returnFiber.deletions;
  if (deletions === null) {
    returnFiber.deletions = [childToDelete];
    returnFiber.flags |= ChildDeletion;
  } else {
    deletions.push(childToDelete);
  }
}

function deleteRemainingChildren(
  returnFiber: FiberNode,
  currentFirstChild: FiberNode | null,
): null {
  if (!shouldTrackSideEffects) {
    return null;
  }
  let childToDelete = currentFirstChild;
  while (childToDelete !== null) {
    deleteChild(returnFiber, childToDelete);
    childToDelete = childToDelete.sibling;
  }
  return null;
}
```

删除的节点不会立刻从内存里消失，而是收集到父 Fiber 的 `deletions` 数组里，并给父 Fiber 打上 `ChildDeletion` 标记——这正是承接上一篇「unmount 流程」讲过的：commit 阶段的 mutation 子阶段看到 `ChildDeletion` 标记后，会遍历这个数组，对每个待删除的 Fiber 执行自底向上的清理和真实 DOM 移除。Diff 阶段只负责"判断谁要删"，真正的清理动作留给 commit 阶段。

### 3. `reconcileChildrenArray` 三阶段的完整代码

这是本篇的核心。完整实现：

```typescript
function reconcileChildrenArray(
  returnFiber: FiberNode,
  currentFirstChild: FiberNode | null,
  newChildren: any[],
  lanes: Lanes,
): FiberNode | null {
  let resultingFirstChild: FiberNode | null = null;
  let previousNewFiber: FiberNode | null = null;

  let oldFiber = currentFirstChild;
  let lastPlacedIndex = 0;
  let newIdx = 0;
  let nextOldFiber = null;

  // 第一轮：新旧数组头部逐位对比，key 相同则复用，不同则中断
  for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
    if (oldFiber.index > newIdx) {
      nextOldFiber = oldFiber;
      oldFiber = null;
    } else {
      nextOldFiber = oldFiber.sibling;
    }
    const newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx], lanes);
    if (newFiber === null) {
      if (oldFiber === null) {
        oldFiber = nextOldFiber;
      }
      break;
    }
    if (shouldTrackSideEffects) {
      if (oldFiber && newFiber.alternate === null) {
        // 匹配到了 slot 但没复用旧 fiber（比如 type 变了），删除旧节点
        deleteChild(returnFiber, oldFiber);
      }
    }
    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
    if (previousNewFiber === null) {
      resultingFirstChild = newFiber;
    } else {
      previousNewFiber.sibling = newFiber;
    }
    previousNewFiber = newFiber;
    oldFiber = nextOldFiber;
  }

  if (newIdx === newChildren.length) {
    // 新 children 到头了，删除多余的旧节点
    deleteRemainingChildren(returnFiber, oldFiber);
    return resultingFirstChild;
  }

  if (oldFiber === null) {
    // 旧节点用完，剩余全部新建
    for (; newIdx < newChildren.length; newIdx++) {
      const newFiber = createChild(returnFiber, newChildren[newIdx], lanes);
      if (newFiber === null) continue;
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
      if (previousNewFiber === null) {
        resultingFirstChild = newFiber;
      } else {
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
    }
    return resultingFirstChild;
  }

  // 新旧都有剩余：旧节点建 Map，遍历新节点查 Map 决定复用/新建
  const existingChildren = mapRemainingChildren(oldFiber);

  for (; newIdx < newChildren.length; newIdx++) {
    const newFiber = updateFromMap(existingChildren, returnFiber, newIdx, newChildren[newIdx], lanes);
    if (newFiber !== null) {
      if (shouldTrackSideEffects) {
        if (newFiber.alternate !== null) {
          // 复用了旧 fiber，从 Map 移除，避免后面被当成删除
          existingChildren.delete(newFiber.key === null ? newIdx : newFiber.key);
        }
      }
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
      if (previousNewFiber === null) {
        resultingFirstChild = newFiber;
      } else {
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
    }
  }

  if (shouldTrackSideEffects) {
    // Map 里剩下的都是没被消费的旧节点，全部删除
    existingChildren.forEach((child) => deleteChild(returnFiber, child));
  }

  return resultingFirstChild;
}
```

对照仓库现有的 `fixtures/reconciler/index.ts` 调试场景走一遍：stage 1 是 `[li(key=a), li(key=b), li(key=c)]`，stage 2 变成 `[li(key=c), li(key=a)]`（b 被删除，a 移动到 c 后面）。

- 第一轮：`newIdx=0`，新数组第一个是 `key=c`，旧链表第一个是 `key=a`——`updateSlot` 发现 `key` 不匹配，返回 `null`，立刻跳出第一轮循环
- 此时 `oldFiber` 不是 `null`（还剩 a/b/c 三个），`newIdx`（0）也没到新数组长度（2），进入第三阶段
- `mapRemainingChildren` 把剩余旧节点 a/b/c 建成 Map：`{a: fiberA, b: fiberB, c: fiberC}`
- 遍历新数组：`newIdx=0` 对应 `key=c`，Map 查到 `fiberC`，复用，`placeChild` 判断：`fiberC` 的 `oldIndex` 是 2，此时 `lastPlacedIndex` 是 0，`2 >= 0`，不需要移动，`lastPlacedIndex` 更新为 2；`newIdx=1` 对应 `key=a`，Map 查到 `fiberA`，复用，`oldIndex` 是 0，此时 `lastPlacedIndex` 是 2，`0 < 2`，**需要移动**，标记 `Placement`
- 遍历结束，Map 里还剩下 `fiberB` 没被消费，标记删除

这正好对应 `fixtures/reconciler/index.ts` 里注释写的"b 被删除、a 移动到 c 后面"——用真实代码跑一遍断点，能清楚看到 `lastPlacedIndex` 从 0 变成 2 的那一刻,就是"c 不用动、a 需要动"这个结论的由来。

### 4. `mapRemainingChildren`/`updateFromMap`：Map 查找兜底

```typescript
function mapRemainingChildren(
  currentFirstChild: FiberNode | null,
): Map<string | number, FiberNode> {
  const existingChildren: Map<string | number, FiberNode> = new Map();
  let existingChild = currentFirstChild;
  while (existingChild !== null) {
    if (existingChild.key !== null) {
      existingChildren.set(existingChild.key, existingChild);
    } else {
      existingChildren.set(existingChild.index, existingChild);
    }
    existingChild = existingChild.sibling;
  }
  return existingChildren;
}
```

这里就是"不写 `key` 时用 `index` 兜底"的具体代码位置——`existingChild.key !== null` 判断决定走哪条分支。这也印证了「一、3」讲的默认行为：不显式声明 `key` 并不会报错或崩溃，只是把匹配依据换成了脆弱的 `index`。

### 5. `cloneChildFibers`：衔接上一篇的思考题

上一篇结尾的思考题问：bailout 命中时 `cloneChildFibers` 克隆出来的中间节点，`memoizedProps` 会不会被更新。看它的完整实现：

```typescript
export function cloneChildFibers(
  current: FiberNode | null,
  workInProgress: FiberNode,
): void {
  if (current !== null && workInProgress.child !== current.child) {
    throw new Error("Resuming work not yet implemented.");
  }
  if (workInProgress.child === null) {
    return;
  }
  let currentChild = workInProgress.child;
  let newChild = createWorkInProgress(currentChild, currentChild.pendingProps);
  workInProgress.child = newChild;
  newChild.return = workInProgress;
  while (currentChild.sibling !== null) {
    currentChild = currentChild.sibling;
    newChild = newChild.sibling = createWorkInProgress(currentChild, currentChild.pendingProps);
    newChild.return = workInProgress;
  }
  newChild.sibling = null;
}
```

关键在 `createWorkInProgress(currentChild, currentChild.pendingProps)`——传入的是子节点自己的 `pendingProps`（子节点上一次挂起的、还未提交的 props），不是父节点的新 props。也就是说，**这些被克隆的中间节点根本没有被赋予"新的 props"，它们的 `pendingProps` 还是自己原来的值**，只是被重新包了一层 `workInProgress` 对象用来维持树结构的完整性。等它们各自的 `completeWork` 执行完，`memoizedProps` 会被设置为这次的 `pendingProps`——而这个 `pendingProps` 本来就没变过，所以 `memoizedProps` 在下一次渲染时依然是"正确"的，并不会因为父节点跳过渲染而过期。这也解释了为什么 bailout 是安全的：跳过的只是"重新执行渲染函数"这一步，Fiber 树结构本身的正确性始终被 `cloneChildFibers` 保持着。

**验证方式**：不新建 demo，直接用仓库现有的 `fixtures/reconciler/index.ts`，`pnpm dev` 起 vite 调试环境，在 `reconcileChildrenArray`/`placeChild` 打断点，观察 stage 1 → stage 2 时上面推演的 `lastPlacedIndex` 变化过程；额外可以手动改一份把 `key="a"/"b"/"c"` 换成数组下标的对照版本，观察本篇「二、5」推演的错误复用行为在真实 DOM 操作日志里的体现。

---

## 五、手写实现源码地址

- GitHub：https://github.com/lotosv2010/react-source
- 本地路径：`D:\github\react-source`（详细目录结构与开发约定见仓库 `README.md`/`CLAUDE.md`/`docs/roadmap.md`）

---

## 六、参考资料

- https://react.iamkasong.com
- https://jonny-wei.github.io/blog/react/

---

## 💡 面试核心问

- **多节点 Diff 算法为什么要分三阶段遍历，一轮为什么不够？**
- **`key` 在 Diff 算法中到底起什么作用？用 `index` 作 `key` 在什么场景下会出问题，具体是怎么出问题的？**
- **`lastPlacedIndex` 是怎么判断一个节点"是否需要移动"的？**
- **React 的 Diff 算法复杂度是多少？它做了哪些简化假设才达到这个复杂度？**
- **Vue 3 的 Diff 算法和 React 相比有什么不同？各自的设计取舍是什么？**

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话核心 | 面试考察频率 |
|--------|-----------|-------------|
| 两个简化假设 | 只比同层级 + 只在 type 相同时复用，把 O(n³) 降到 O(n) | ⭐⭐⭐⭐⭐ |
| 单节点 Diff | 遍历旧链表按 key 找，key 同再看 type，都同才复用 | ⭐⭐⭐⭐ |
| 多节点 Diff 三阶段 | 头部逐位匹配 → 两条快路径 → Map 查找兜底 | ⭐⭐⭐⭐⭐ |
| lastPlacedIndex | oldIndex < lastPlacedIndex 才判定移动，只看相对顺序 | ⭐⭐⭐⭐⭐ |
| index 作 key 错位 | Fiber（含内部状态）按位置复用，状态跟着位置走而非数据 | ⭐⭐⭐⭐⭐ |
| Diff 是启发式算法 | 不是最小编辑距离，换来的是线性时间复杂度 | ⭐⭐⭐ |
| Vue3 对比 | 最长递增子序列在倒序场景移动次数更少，代价是编译期信息依赖 | ⭐⭐⭐ |

---

## 📝 思考题

**留个问题**：本篇「四、5」解答了上一篇的思考题——`cloneChildFibers` 克隆节点时传入的是子节点自己的 `pendingProps`，不是父节点的新 props，所以 `memoizedProps` 始终正确。那么反过来想：如果某次更新里，父节点没有命中 bailout（正常走 `reconcileChildrenArray`），但某个子节点因为 `key` 匹配、`type` 也匹配而被 `useFiber` 复用——这次复用传入的 `pendingProps` 是"新的 props"还是"旧的 props"？对比 `useFiber` 和 `cloneChildFibers` 两处 `createWorkInProgress` 调用时传入的第二个参数有什么不同，想一想这个差异对下一次渲染的正确性分别意味着什么。

答案留在评论区，或者在后续 commit 阶段篇（第 05 篇）讲 `completeWork`/`bubbleProperties` 时会再次提到相关细节。

---

> 🔖 这是「React 18 全家桶深度拆解系列」第 4 篇。上一篇：《React 18 渲染原理: mount/update/unmount 全流程与 bailout 复用机制（面试收藏级）》；下一篇预告：《React 18 commit 阶段: 三个子阶段与 effect 执行顺序原理（面试收藏级）》
