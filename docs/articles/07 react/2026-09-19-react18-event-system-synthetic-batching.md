# React 18 事件系统: 合成事件、事件委托与自动批处理原理（面试收藏级）

> **副标题**：合成事件设计、事件委托从 document 到 root、Automatic Batching 演进

---

## 🎯 这篇文章解决什么问题

面试官问完 commit 阶段和 Hooks 之后，经常会绕到一个看起来很基础、实际上很少有人能讲透的话题：**`onClick={handleClick}` 里的 `handleClick` 收到的那个参数，到底是不是浏览器原生的 `Event`？**

大多数人会说"差不多吧，就是包了一层"。追问一句"包了一层是为了干什么"，答案往往含糊；再追问"React 17 为什么要把事件绑定的位置从 `document` 改到应用根节点，这个改动解决了什么具体问题"，基本就答不上来了；最后一个杀手锏问题——"React 18 里，不管是在 `onClick` 里连续 `setState` 两次，还是在 `setTimeout`、`Promise.then` 里连续 `setState` 两次，为什么现在都只触发一次渲染？这和 React 17 有什么本质区别？"——这是本篇真正的重点，也是"自动批处理"这个词条背后最容易被问倒的地方。

这一篇要讲透的，正是合成事件系统的完整链路：为什么 React 要自己实现一套事件对象，事件委托具体委托在哪里、怎么委托，`stopPropagation` 在合成事件里的真实行为边界在哪，以及 Automatic Batching 从"依赖事件上下文判断"到"调度层统一批处理"这次架构级变化的源码依据。读完之后，你会同时获得两种确定感：**懂原理**（合成事件和事件委托的设计动机、批处理机制的两个版本分别是怎么实现的）和**会讲**（面试官顺着任意一个环节往下挖都能拆解回答）。

---

## 一、使用与实践

### 1. 合成事件绑定：onClick 收到的不是原生 Event

用一个处方单列表的删除按钮直观感受一下：

```jsx
function PrescriptionItem({ item, onRemove }) {
  const handleClick = (event) => {
    console.log(event.constructor.name); // SyntheticBaseEvent，不是 PointerEvent/MouseEvent
    console.log(event instanceof MouseEvent); // false
    onRemove(item.id);
  };

  return (
    <div className="prescription-item">
      <span>{item.drugName}</span>
      <button onClick={handleClick}>删除</button>
    </div>
  );
}
```

`onClick` 传进来的 `event` 是 React 自己构造的 `SyntheticEvent`（准确说是按事件类型分化出的 `SyntheticMouseEvent`/`SyntheticKeyboardEvent` 等子类型），不是浏览器派发的原生 `Event` 对象——它是一个"看起来和原生事件 API 几乎一样"的包装对象，`target`/`currentTarget`/`preventDefault`/`stopPropagation` 这些属性和方法都重新实现了一遍。

> 💬 **面试官会问**：`onClick` 拿到的这个 `event` 对象和原生事件对象是同一个吗？
>
> ✅ **标准答案**：不是，它是 React 自己构造的合成事件对象（`SyntheticEvent`），按事件类型（鼠标/键盘/焦点等）有不同的子类型，属性集合模拟了原生事件的常用字段，但对象本身是 React 运行时新建的，`instanceof MouseEvent` 会返回 `false`。
>
> 🎁 **加分答案**：合成事件对象上有一个 `nativeEvent` 字段，指向真正的浏览器原生事件对象——需要用到合成事件没有覆盖的原生 API 时（比如某些浏览器特有属性），可以通过 `event.nativeEvent` 拿到。

### 2. e.nativeEvent 访问原始浏览器事件对象

```jsx
function DrugSearchInput() {
  const handleKeyDown = (event) => {
    // event 是合成事件，event.nativeEvent 是浏览器真正派发的 KeyboardEvent
    console.log("合成事件 key:", event.key);
    console.log("原生事件 isComposing:", event.nativeEvent.isComposing);
  };

  return <input onKeyDown={handleKeyDown} placeholder="搜索药品" />;
}
```

典型场景是处理中文输入法的组合输入状态（`isComposing`）——这类信息合成事件没有做归一化封装，需要下钻到 `nativeEvent` 上读取。

### 3. e.stopPropagation() 在合成事件里的真实行为

先看一个容易讲错的细节。很多资料会说"`e.stopPropagation()` 只阻止合成事件在 React 事件系统内的传播，不会阻止原生事件冒泡"——这句话不完全准确。看处方单卡片的例子：

```jsx
function PrescriptionCard({ children }) {
  const handleCardClick = () => {
    console.log("卡片整体点击：跳转到详情页");
  };

  return (
    <div className="card" onClick={handleCardClick}>
      {children}
      <button
        onClick={(event) => {
          event.stopPropagation(); // 阻止事件继续向 card 传播
          console.log("仅删除这一项，不跳转详情页");
        }}
      >
        删除
      </button>
    </div>
  );
}
```

点击"删除"按钮，`handleCardClick` 不会被触发——这一点符合直觉。但底层发生的事情和"只在 React 内部拦截"这个说法有出入：合成事件的 `stopPropagation()` 实现里，**确实调用了 `nativeEvent.stopPropagation()`**，同时把合成事件对象自己的 `isPropagationStopped` 标记为 `true`。后者用于告诉 React 自己的分发循环"这一批监听器不用继续往上遍历了"；前者则是真的调用了浏览器原生方法。

之所以外部很多资料会得出"只阻止合成事件传播"的结论，是因为在**事件委托模型下，所有同类型事件的监听器都只注册在 root 容器这一个地方**，原生事件本身的冒泡路径其实早就到达了 `document`（因为委托监听器本来就是在事件真正冒泡经过 root 容器时才触发的），`nativeEvent.stopPropagation()` 能拦住的是"这次原生事件冒泡到 root 容器之后是否还会继续往上冒泡到 `document`/`window`"——而不是"拦住 React 内部对这次事件的处理"。React 内部对"卡片要不要执行 `handleCardClick`"的判断，靠的始终是合成事件对象自己的 `isPropagationStopped` 标记，在 `processDispatchQueueItemsInOrder` 遍历监听器数组时检查这个标记来决定是否提前退出循环。

> 💬 **面试官会问**：`e.stopPropagation()` 在合成事件里和原生事件里的行为有什么不同？
>
> ✅ **标准答案**：合成事件的 `stopPropagation()` 做了两件事——调用 `nativeEvent.stopPropagation()`（真的阻止原生事件继续向外冒泡）+ 把合成事件对象的内部标记 `isPropagationStopped` 置为 `true`。React 分发监听器数组时是靠后者判断"是否提前终止遍历"的，不依赖原生冒泡是否真的被拦下——因为同类型事件的监听器本来就只注册在 root 容器一处，原生冒泡有没有被拦，不影响 React 内部已经收集好的这一份监听器列表的遍历结果。
>
> 🎁 **加分答案**：这也解释了一个常见踩坑——如果页面里同时存在 React 管理的事件监听和手写的 `addEventListener('click', fn)`（挂在 React 根节点和 `document` 之间的某个原生节点上），`event.stopPropagation()` 是能真正阻止这个手写监听器被触发的，因为它确实调用了原生 API；但如果这个手写监听器挂在 React 根节点内部的某个子节点上，情况会更复杂，需要结合捕获/冒泡阶段具体分析。

### 4. 连续多次 setState 自动合并为一次渲染

```jsx
function DosageCounter() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    console.log("触发前 count:", count);
  };

  useEffect(() => {
    console.log("渲染发生了，count =", count);
  }, [count]);

  const handleTimeoutClick = () => {
    setTimeout(() => {
      setCount((c) => c + 1);
      setCount((c) => c + 1);
    }, 0);
  };

  return (
    <div>
      <p>count: {count}</p>
      <button onClick={handleClick}>原生事件回调里 +2</button>
      <button onClick={handleTimeoutClick}>setTimeout 里 +2</button>
    </div>
  );
}
```

在 React 18 里，不管点哪个按钮，`useEffect` 打印的"渲染发生了"这行日志都只出现一次——`count` 从 0 直接跳到 2，中间不会经过 1 这个中间态被渲染出来。这是本篇「二、5」要讲透的 Automatic Batching：React 17 只有第一个按钮（事件处理函数内）会合并，第二个按钮（`setTimeout` 回调）在 React 17 里会触发两次独立渲染。

### 5. flushSync 强制同步更新

```jsx
import { flushSync } from "react-dom";

function PrescriptionForm() {
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);

  const handleSubmit = () => {
    flushSync(() => {
      setSubmitting(true);
    });
    // flushSync 返回时，setSubmitting(true) 已经同步渲染并反映到真实 DOM
    // 这里可以立刻安全地读取 formRef.current 的最新布局信息
    formRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <form ref={formRef}>
      <button onClick={handleSubmit} disabled={submitting}>
        {submitting ? "提交中..." : "提交处方单"}
      </button>
    </form>
  );
}
```

`flushSync` 强制把回调里产生的更新标记为同步优先级，跳出正常的批处理调度，立即走一次同步渲染并提交到真实 DOM——这样回调返回之后就能安全地读取到最新的 DOM 状态，不用等下一个事件循环。

> 💬 **面试官会问**：什么场景下需要用 `flushSync`？滥用会有什么代价？
>
> ✅ **标准答案**：需要在某次 state 更新提交到真实 DOM 之后、立即同步读取最新 DOM 信息的场景（比如更新后立刻测量元素尺寸并滚动定位），因为正常的批处理更新是异步的，代码里紧跟着 `setState` 后面读 DOM 大概率读到的还是旧值。
>
> 🎁 **加分答案**：`flushSync` 的代价是放弃了这次更新的批处理和并发调度能力——它会同步跑完一次完整的 render + commit，如果在一个循环里对多个不同 state 分别调用 `flushSync`，会导致多次独立的同步渲染，比正常批处理慢得多，也可能因为频繁同步渲染阻塞主线程造成卡顿。只应该用在"必须立刻拿到最新 DOM"的少数场景，不能当作常规更新方式使用。

### 6. 事件委托自动生效，不需要手动配置

```jsx
const root = createRoot(document.getElementById("app"));
root.render(<App />);
```

只要用了 `createRoot`，事件委托就自动生效——React 内部会在调用 `createRoot(container)` 时，对 `container` 这个根容器统一注册好所有支持的原生事件类型的监听器。业务代码里写的每一个 `onClick`/`onChange` 都不会真的在对应 DOM 节点上挂一个原生监听器，而是被记录在这个节点对应的 Fiber 的 `props` 上，等事件真正发生、冒泡到 root 容器时，由 React 自己的分发逻辑去查这些 `props` 决定要执行哪些回调。

---

## 二、设计与原理

### 1. 合成事件为什么要自己实现一套

两个核心动机：

**第一，抹平浏览器差异**。React 诞生的年代（2013 年前后）浏览器之间的事件模型差异远比今天大——事件名大小写不统一、`event.target` 在旧版 IE 里要用 `event.srcElement`、`preventDefault`/`stopPropagation` 在旧版 IE 里要用 `returnValue`/`cancelBubble`。合成事件把这些差异全部封装掉，业务代码只需要面对一套统一的 API。虽然今天主流浏览器的差异已经很小了，但这套抽象保留了下来，因为第二个动机更重要。

**第二，接入 React 自己的优先级和批处理机制**。这是更本质的原因——如果直接用原生事件监听器，`setState` 触发的更新就完全脱离了 React 的调度体系，无法根据"这是一次用户点击（应该同步响应）还是一次滚动（可以降级处理）"来分配不同优先级（与第 07 篇讲的事件优先级映射到 Lane 联动）。合成事件系统在委托监听器内部就能拿到"这是什么类型的原生事件"这个信息，从而在事件分发前就把当前的更新优先级设置好（见下方 `createEventListenerWrapperWithPriority`），这是脱离 React 自己的事件系统、直接绑定原生监听器做不到的。

### 2. 事件委托机制：root 容器上每种事件只挂一个原生监听器

不是每个 `<button onClick={...}>` 都会对应一个真实的原生 `addEventListener('click', ...)` 调用。React 的做法是：`createRoot(container)` 时，对 `container` 遍历一份精简过的"支持的事件类型表"，每种事件类型只在 `container` 上注册一次原生监听器（捕获阶段和冒泡阶段各一次）。具体某个 DOM 节点是否"挂了" `onClick`，只是记录在这个节点对应的 Fiber 的 `props` 对象里，事件真正发生时才会被读取。

事件触发后的分发逻辑是：拿到原生事件的 `event.target`，反查出这个 DOM 节点对应的 Fiber，再沿着 Fiber 树的 `return` 指针一路向上遍历，每经过一个 `HostComponent` 类型的节点就检查它的 `props` 上有没有挂对应的事件处理函数（比如 `onClick`），有就收集进一个监听器数组，直到遍历到 Fiber 树根。这个收集顺序是"从触发事件的目标节点到根节点"，天然对应事件冒泡的顺序。

> 💬 **面试官会问**：事件委托机制下，`onClick` 是怎么找到应该执行哪些函数的？
>
> ✅ **标准答案**：不依赖每个节点单独的原生监听器，而是靠 `event.target` 反查对应 Fiber，再沿着 Fiber 树的 `return` 指针向上遍历，逐层检查每个宿主节点的 `props` 上是否挂了匹配的事件处理函数（如 `onClick`），收集成一个有序的监听器数组后再依次执行——顺序天然对应"从触发节点到根节点"的冒泡路径。

### 3. React 17 前后事件绑定位置：从 document 到 root 容器

React 16 及之前，所有委托监听器统一挂在 `document` 上；React 17 起改为挂在应用的 root 容器（`createRoot` 传入的那个 DOM 元素）上。这个改动解决的是一个具体的多实例共存问题：如果一个页面里同时存在两个不同版本的 React（比如渐进式迁移旧系统、微前端场景下多个子应用各自用不同 React 版本），当事件监听器都挂在 `document` 上时，其中一个 React 版本的事件系统处理完一次事件后，如果调用了 `stopPropagation`，会连带影响到挂在同一个 `document` 上的另一个 React 版本的委托监听器——两套独立的事件系统因为共享了同一个委托挂载点而产生了耦合。

改到 root 容器之后，每个 React 应用实例的事件委托范围被天然限制在自己的挂载子树内，多个 React 实例可以在同一个页面里干净地共存，互不干扰。

> 💬 **面试官会问**：React 17 把事件绑定从 `document` 改到 root 容器，解决了什么问题？
>
> ✅ **标准答案**：解决多个 React 版本/实例在同一页面共存时的事件系统互相干扰问题。挂在 `document` 上时，所有 React 实例的委托监听器共享同一个挂载点，一个实例内部的 `stopPropagation` 可能意外影响到另一个独立的 React 实例；挂到各自的 root 容器后，每个实例的事件处理范围被限制在自己的组件树内，天然隔离。
>
> 🎁 **加分答案**：这个改动是 React 17 主推的"渐进式升级"能力的一部分——官方文档把 React 17 定位为一个几乎没有新特性、专门为"允许应用里同时运行多个 React 版本、逐步迁移"扫清障碍的版本，事件系统改造是这个定位下最核心的一项底层调整。

### 4. 合成事件的两阶段模拟：capture 和 bubble 是两个独立的原生监听器

这里有一个容易被讲错的细节：很多人以为"捕获阶段和冒泡阶段"是 React 收集到监听器数组之后，在一次原生事件回调里分别正向、反向遍历一次模拟出来的。实际上不是——**捕获和冒泡对应的是两个完全独立的原生 `addEventListener` 调用**，一个传 `capture: true`，一个传 `capture: false`（默认冒泡阶段），这两个监听器各自独立触发，各自完整走一遍"反查 Fiber → 沿 `return` 收集监听器 → 分发执行"的流程，只是收集时看的 `props` 字段名不同：捕获阶段找 `onClickCapture`，冒泡阶段找 `onClick`。

也就是说，同一次用户点击，如果目标节点及其祖先节点上同时挂了 `onClick` 和 `onClickCapture`，浏览器实际上会触发**两次**委托监听器的原生回调（一次捕获、一次冒泡），而不是一次回调内部模拟两个阶段。两次回调里，`processDispatchQueueItemsInOrder` 根据 `inCapturePhase` 标记决定遍历方向：捕获阶段是从数组末尾往前遍历（根 → 目标方向，因为收集时是按"目标到根"push 进数组的，取反遍历正好还原成"根到目标"），冒泡阶段是从数组开头往后遍历（目标 → 根方向，与收集顺序一致）。

> 💬 **面试官会问**：合成事件的捕获阶段和冒泡阶段，是在同一次原生事件回调里模拟出来的吗？
>
> ✅ **标准答案**：不是。root 容器上对每种事件类型注册了两个独立的原生监听器（一个 `capture: true`，一个 `capture: false`），分别对应捕获和冒泡两个阶段，浏览器原生事件流触发这两个监听器各自独立执行一遍完整的"收集监听器数组 + 分发"逻辑，只是收集时匹配的 prop 名不同（`onXxxCapture` vs `onXxx`），遍历方向也相反。

### 5. Automatic Batching 的本质变化：从"事件上下文判断"到"调度层统一批处理"

React 17 及之前，批处理的判断依据是"当前是否处于 React 自己的事件处理函数执行上下文里"——`unstable_batchedUpdates` 会在执行合成事件的分发回调前设置一个内部标记（`isBatchingUpdates`），标记打开期间产生的 `setState` 都先收集起来，不立即触发渲染，等这次事件分发回调执行完毕、标记关闭时，再统一走一次渲染。这也是为什么 React 17 里 `onClick` 里连续 `setState` 会合并，而 `setTimeout`、原生 `addEventListener` 回调、`Promise.then` 里的 `setState` 不会合并——这些代码执行时根本不在"React 事件分发回调"这个上下文里，标记没有被打开。

React 18 把这个判断逻辑彻底移出了"是否处于事件上下文"这个维度，改为在**调度层**统一处理：任何一次 `setState` 触发的 `scheduleUpdateOnFiber`，最终都会走到 `ensureRootIsScheduled` 决定"这次更新应该同步 flush 还是交给 Scheduler 异步调度"——如果落在 `SyncLane`（比如离散事件触发的更新），走的是"先塞进一个 `syncQueue` 队列，再通过 `scheduleMicrotask` 注册一个微任务，由这个微任务统一遍历执行 `syncQueue` 里所有排队的同步任务」的路径，而不是"每次 `setState` 立刻同步渲染一次"。同一个事件循环内连续多次 `setState`，不管调用方是原生事件回调、`setTimeout` 还是 `Promise.then`，都只是在往 `syncQueue` 里追加任务、复用同一个已经排队的微任务，最终这批任务在这一轮微任务里被统一 flush 一次——渲染只发生一次。这才是"React 18 不再依赖事件来源"这句话背后的真实机制：批处理不再靠"进没进事件处理函数"这个开关判断，而是靠"任务本来就是异步排队执行的"这个调度模型的自然结果。

> 💬 **面试官会问**：React 18 的自动批处理和 React 17 相比区别在哪？
>
> ✅ **标准答案**：React 17 靠"是否处于 React 事件处理函数执行上下文"这个开关判断要不要批处理——只有合成事件的分发回调内部会打开这个开关，`setTimeout`/`Promise.then`/原生事件监听器里的 `setState` 不会被批处理。React 18 把批处理逻辑下沉到调度层，`setState` 触发的更新统一走 `scheduleUpdateOnFiber → ensureRootIsScheduled`，同步优先级的更新先进一个内部队列，由一个微任务统一 flush，不管调用方来自哪里，只要是同一个事件循环内产生的多次更新，天然只会触发一次渲染。
>
> 🎁 **加分答案**：这也是为什么 React 18 提供了 `flushSync` 作为"退出批处理"的显式 API——既然批处理不再依赖"是否在事件里"这个隐式判断，也就不存在"跳出事件处理函数就能避开批处理"这条路了，必须显式调用 `flushSync` 才能让某次更新绕开正常的调度队列、立即同步执行。

### 6. flushSync 的实现：切到同步优先级 + 跳出批处理上下文立即 flush

`flushSync` 做了三件事：把当前的执行上下文标记打上 `BatchedContext`；把当前的更新优先级临时切换成 `DiscreteEventPriority`（对应 `SyncLane`，确保回调内产生的 `setState` 都会被分配到同步优先级）；执行完回调后，在 `finally` 块里检查是否还有排队的同步任务（`syncQueue` 非空），有就立即调用 `flushSyncCallbacks()` 同步跑完这批任务，而不是像正常路径那样等微任务。这三步叠加的效果就是：`flushSync(fn)` 返回时，`fn` 内部产生的更新已经完整走完一次同步的 render + commit，DOM 已经是最新的。

📍**配图点**：批处理调度路径对比图——左侧画 React 17 的"事件上下文开关"模型（`isBatchingUpdates` 打开/关闭包裹事件分发回调），右侧画 React 18 的"调度层统一批处理"模型（`scheduleUpdateOnFiber → syncQueue → 微任务统一 flush`），中间用一条"`flushSync` 强制插队同步执行"的分支箭头连接两侧，直观展示两个版本批处理判断依据的本质差异。

### 7. 对比 Vue 3

Vue 3 的更新调度走的是微任务队列去重合并（`nextTick`）——`trigger` 触发的副作用统一 push 进一个 `queue` 数组，用 `Set` 或者标记位去重，再通过 `Promise.resolve().then()` 注册一个微任务统一 flush。这个模型天然不区分"是不是在事件处理函数里"，`setTimeout`、`Promise.then`、原生事件回调里的响应式数据修改，效果都是一样的——本来就没有"事件上下文判断"这一层历史包袱，因为 Vue 3 的响应式系统从一开始设计的就是"任何时候触发副作用都走同一条微任务合并路径"。这一点和 React 18 调整后的调度层批处理模型在效果上已经很接近了，区别在于 React 还叠加了一层优先级（Lane）区分不同紧急程度的更新，Vue 3 的微任务合并没有优先级层级的概念。

---

## 三、源码解析（重点代码，来源 GitHub 仓库）

> React 源码地址：https://github.com/facebook/react（本篇断点调试环境已锁定 `v18.3.1`）

### 1. 事件插件注册：packages/react-dom/src/events/DOMPluginEventSystem.js

```javascript
// listenToAllSupportedEvents（节选）：createRoot 时对根容器统一注册委托监听器
export function listenToAllSupportedEvents(rootContainerElement) {
  if (!rootContainerElement[listeningMarker]) {
    rootContainerElement[listeningMarker] = true;
    allNativeEvents.forEach(domEventName => {
      // selectionchange 不冒泡，需要单独挂在 document 上，不走委托路径
      if (domEventName !== 'selectionchange') {
        if (!nonDelegatedEvents.has(domEventName)) {
          listenToNativeEvent(domEventName, false, rootContainerElement); // 冒泡阶段
        }
        listenToNativeEvent(domEventName, true, rootContainerElement); // 捕获阶段
      }
    });
    // ...
  }
}
```

**关键点**

1. `listeningMarker` 是挂在容器对象上的一个标记属性，保证同一个容器不会被重复注册监听器
2. `allNativeEvents` 遍历里对每个事件类型调用了两次 `listenToNativeEvent`（`false`/`true` 分别对应冒泡和捕获），验证了「二、4」讲的"捕获和冒泡是两个独立的原生监听器"
3. `selectionchange` 是个例外——它不冒泡，只能挂在 `document` 上，这是委托模型里少数不走 root 容器路径的特殊事件

### 2. 事件分发入口：packages/react-dom/src/events/DOMPluginEventSystem.js

```javascript
// dispatchEventForPluginEventSystem（节选，Portal 祖先重映射逻辑省略）
export function dispatchEventForPluginEventSystem(
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInst,
  targetContainer,
) {
  let ancestorInst = targetInst;
  // ...在多 Root/Portal 场景下会重新计算 ancestorInst，确保只在当前 root 的子树范围内分发
  batchedUpdates(() =>
    dispatchEventsForPlugins(
      domEventName,
      eventSystemFlags,
      nativeEvent,
      ancestorInst,
      targetContainer,
    ),
  );
}
```

**关键点**

1. 这是原生监听器（`addTrappedEventListener` 挂上去的那个函数）真正触发时进入的入口，`targetInst` 是原生事件的 `target` 反查出来的 Fiber
2. 真实分发逻辑（收集监听器 + 执行）被包在 `batchedUpdates` 里——这是 React 17 时代遗留下来的批处理开关调用（详见「二、5」），React 18 里这一层调用虽然保留，但批处理的实际生效机制已经下沉到调度层，`batchedUpdates` 更多是历史兼容而非决定性因素
3. Portal 场景下的祖先重映射逻辑（把 `targetInst` 修正为"当前 rootContainer 对应的那棵子树"）本篇不展开，与合成事件主链路关系不大

### 3. 监听器收集：packages/react-dom/src/events/DOMPluginEventSystem.js

```javascript
// accumulateSinglePhaseListeners（节选）：沿 target -> root 路径收集匹配的监听器
export function accumulateSinglePhaseListeners(
  targetFiber,
  reactName,
  nativeEventType,
  inCapturePhase,
  accumulateTargetOnly,
  nativeEvent,
) {
  const captureName = reactName !== null ? reactName + 'Capture' : null;
  const reactEventName = inCapturePhase ? captureName : reactName;
  const listeners = [];

  let instance = targetFiber;
  let lastHostComponent = null;

  while (instance !== null) {
    const { stateNode, tag } = instance;
    if (tag === HostComponent && stateNode !== null) {
      lastHostComponent = stateNode;
      if (reactEventName !== null) {
        const listener = getListener(instance, reactEventName);
        if (listener != null) {
          listeners.push(
            createDispatchListener(instance, listener, lastHostComponent),
          );
        }
      }
    }
    // ...ScopeComponent 分支省略（createEventHandle 实验特性，与主链路无关）
    instance = instance.return;
  }
  return listeners;
}
```

**关键点**

1. `reactEventName` 的计算是「二、4」讲的核心：捕获阶段找 `onClickCapture`，冒泡阶段找 `onClick`，同一次收集只会取其中一种
2. `instance = instance.return` 是遍历的驱动，沿 Fiber 树的父指针一路向上，直到 `instance === null`（到达根），收集顺序天然是"目标节点 → 根节点"
3. `getListener` 从 Fiber 对应 DOM 节点关联的 `props` 对象里按 `reactEventName` 取监听函数——事件监听器从来没有真正挂在这个 DOM 节点上，只是存在 `props` 里等被动读取

### 4. 批处理调度路径：packages/react-reconciler/src/ReactFiberWorkLoop.js

```javascript
// scheduleUpdateOnFiber（节选）：所有 setState 最终都会走到这里
export function scheduleUpdateOnFiber(root, fiber, lane, eventTime) {
  // ...
  markRootUpdated(root, lane, eventTime);
  // ...
  ensureRootIsScheduled(root, eventTime);
}
```

```javascript
// ensureRootIsScheduled（节选）：SyncLane 走内部同步队列，其余交给 Scheduler
function ensureRootIsScheduled(root, currentTime) {
  const nextLanes = getNextLanes(root, /* ... */);
  if (nextLanes === NoLanes) return;

  const newCallbackPriority = getHighestPriorityLane(nextLanes);
  // ...复用已有调度任务的判断省略

  let newCallbackNode;
  if (newCallbackPriority === SyncLane) {
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
    scheduleMicrotask(flushSyncCallbacks);
    newCallbackNode = null;
  } else {
    // 非同步优先级交给 Scheduler 按对应优先级异步调度
    newCallbackNode = scheduleCallback(schedulerPriorityLevel, performConcurrentWorkOnRoot.bind(null, root));
  }
  root.callbackPriority = newCallbackPriority;
  root.callbackNode = newCallbackNode;
}
```

**关键点**

1. `scheduleUpdateOnFiber` 是所有 `setState`（不管是 Class 组件的 `this.setState` 还是 Hook 的 `dispatch`）最终共同走到的一个入口，与调用方是不是"事件处理函数"完全无关
2. `SyncLane` 优先级的更新不是立即同步执行，而是先 `scheduleSyncCallback` 塞进一个内部队列，再 `scheduleMicrotask(flushSyncCallbacks)` 注册一个微任务——同一个事件循环内多次调用只会命中同一个已经注册好的微任务，`flushSyncCallbacks` 只会真正执行一次，这正是「二、5」讲的批处理本质机制
3. 非同步优先级的更新交给 `scheduler` 包按对应优先级异步调度，与并发渲染的时间切片机制衔接（详见第 07 篇）

### 5. flushSync 实现：packages/react-reconciler/src/ReactFiberWorkLoop.js

```javascript
// flushSync（节选）：临时切到同步优先级，执行完立即 flush 排队中的同步任务
export function flushSync(fn) {
  const prevExecutionContext = executionContext;
  executionContext |= BatchedContext;

  const prevTransition = ReactCurrentBatchConfig.transition;
  const previousPriority = getCurrentUpdatePriority();

  try {
    ReactCurrentBatchConfig.transition = null;
    setCurrentUpdatePriority(DiscreteEventPriority);
    if (fn) {
      return fn();
    }
  } finally {
    setCurrentUpdatePriority(previousPriority);
    ReactCurrentBatchConfig.transition = prevTransition;
    executionContext = prevExecutionContext;
    // 执行完 fn 后，如果产生了排队中的同步任务，立即同步 flush 掉，不等微任务
    if ((executionContext & (RenderContext | CommitContext)) === NoContext) {
      flushSyncCallbacks();
    }
  }
}
```

**关键点**

1. `setCurrentUpdatePriority(DiscreteEventPriority)` 确保 `fn` 内部触发的 `setState` 都会被 `requestUpdateLane` 分配到 `SyncLane`
2. `finally` 块里的 `flushSyncCallbacks()` 是脱离正常调度节奏、立即同步执行排队任务的关键一步——正常路径下这一步是交给微任务异步做的，`flushSync` 在这里主动提前触发
3. `executionContext & (RenderContext | CommitContext)) === NoContext` 这个判断是防止在渲染或提交阶段内部调用 `flushSync` 导致重入——如果当前已经处于渲染/提交上下文，就不会在这里立即 flush，避免破坏正在进行的渲染流程

---

## 四、手写实现（解读已完成代码，本篇不新增仓库改动）

本节基于本地真实项目 `D:\github\react-source`（GitHub：https://github.com/lotosv2010/react-source）编写。需要先说明一件事：本篇要讲的合成事件系统、事件委托、事件优先级映射、批处理调度链路、`flushSync`，**全部不是本篇新写的代码**，它们是这个项目在更早的一次提交（`60034c2 feat(react-dom-bindings): 实现 Phase 6 合成事件系统`）里就已经完整落地的真实代码——本篇的任务是把这些已经跑通的代码逐段讲透，不对仓库做任何新的改动。

### 1. 事件注册表：EventRegistry.ts（已有代码）

```typescript
export const allNativeEvents: Set<DOMEventName> = new Set();

export function registerTwoPhaseEvent(
  registrationName: string,
  dependencies: DOMEventName[],
): void {
  registerDirectEvent(registrationName, dependencies);
  registerDirectEvent(registrationName + "Capture", dependencies);
}

export function registerDirectEvent(
  _registrationName: string,
  dependencies: DOMEventName[],
): void {
  for (let i = 0; i < dependencies.length; i++) {
    allNativeEvents.add(dependencies[i]);
  }
}
```

`registerTwoPhaseEvent` 每注册一个事件（如 `onClick`），会同时把冒泡版和捕获版（`onClick`/`onClickCapture`）对应的原生事件名都塞进 `allNativeEvents` 这个全局集合——这个集合就是后续 `listenToAllSupportedEvents` 遍历时用来决定"root 容器上要挂哪些原生事件监听器"的依据。

### 2. 原生事件名到 React 注册名的映射：DOMEventProperties.ts（已有代码）

```typescript
export const topLevelEventsToReactNames: Map<DOMEventName, string> = new Map();

const simpleEventPluginEvents: string[] = [
  "click", "contextMenu", "dblClick", "input", "keyDown", "keyPress",
  "keyUp", "mouseDown", "mouseMove", "mouseOut", "mouseOver", "mouseUp", "submit",
];

function registerSimpleEvent(domEventName: DOMEventName, reactName: string): void {
  topLevelEventsToReactNames.set(domEventName, reactName);
  registerTwoPhaseEvent(reactName, [domEventName]);
}

export function registerSimpleEvents(): void {
  for (let i = 0; i < simpleEventPluginEvents.length; i++) {
    const eventName = simpleEventPluginEvents[i];
    const domEventName = eventName.toLowerCase() as DOMEventName;
    const capitalizedEvent = eventName[0].toUpperCase() + eventName.slice(1);
    registerSimpleEvent(domEventName, "on" + capitalizedEvent);
  }
  registerSimpleEvent("dblclick", "onDoubleClick");
  registerSimpleEvent("change", "onChange");
  registerSimpleEvent("focusin", "onFocus");
  registerSimpleEvent("focusout", "onBlur");
}
```

这份表建立了"原生事件名"（`click`）到"React prop 名"（`onClick`）的双向对应关系，是官方 `SimpleEventPlugin` 的精简版——官方按事件特性拆成多个插件（`SimpleEventPlugin`/`EnterLeaveEventPlugin`/`ChangeEventPlugin` 等），这个项目里只落地了 `SimpleEventPlugin` 覆盖的主链路事件类型，`change` 事件简化为直接映射 `onChange`（官方的 `ChangeEventPlugin` 对受控 `input` 有更复杂的归一化处理，这里做了简化）。

### 3. 事件委托监听器注册：DOMPluginEventSystem.ts（已有代码）

```typescript
export function listenToAllSupportedEvents(
  rootContainerElement: EventTarget,
): void {
  const marked = rootContainerElement as unknown as Record<string, boolean>;
  if (marked[listeningMarker]) {
    return;
  }
  marked[listeningMarker] = true;

  allNativeEvents.forEach((domEventName) => {
    addTrappedEventListener(rootContainerElement, domEventName, false); // 冒泡
    addTrappedEventListener(rootContainerElement, domEventName, true); // 捕获
  });
}
```

和官方实现的关键结构完全对照：遍历 `allNativeEvents`，每种事件类型注册两个独立的原生监听器（冒泡 + 捕获）。这份实现省去了官方的 `selectionchange` 特殊处理分支和 `legacyFBSupport`/`non-delegated events` 兼容分支，只保留委托监听器注册的主链路。

### 4. 监听器收集与分发：DOMPluginEventSystem.ts（已有代码）

```typescript
function accumulateSinglePhaseListeners(
  targetFiber: FiberNode | null,
  reactName: string,
  inCapturePhase: boolean,
): DispatchListener[] {
  const registrationName = inCapturePhase ? reactName + "Capture" : reactName;
  const listeners: DispatchListener[] = [];

  let instance: FiberNode | null = targetFiber;
  while (instance !== null) {
    const { stateNode, tag } = instance;
    if (tag === HostComponent && stateNode !== null) {
      const currentTarget = stateNode as EventTarget;
      const listener = getListener(instance, registrationName);
      if (listener != null) {
        listeners.push(createDispatchListener(instance, listener, currentTarget));
      }
    }
    instance = instance.return;
  }
  return listeners;
}

function processDispatchQueueItemsInOrder(
  event: BaseSyntheticEvent,
  dispatchListeners: DispatchListener[],
  inCapturePhase: boolean,
): void {
  if (inCapturePhase) {
    for (let i = dispatchListeners.length - 1; i >= 0; i--) {
      if (event.isPropagationStopped()) return;
      const { listener, currentTarget } = dispatchListeners[i];
      executeDispatch(event, listener, currentTarget);
    }
  } else {
    for (let i = 0; i < dispatchListeners.length; i++) {
      if (event.isPropagationStopped()) return;
      const { listener, currentTarget } = dispatchListeners[i];
      executeDispatch(event, listener, currentTarget);
    }
  }
}
```

`accumulateSinglePhaseListeners` 和官方结构逐行对应；`processDispatchQueueItemsInOrder` 是「二、4」讲的执行顺序在代码层面的直接证据——捕获阶段从数组末尾往前遍历（还原成根到目标的方向），冒泡阶段从数组开头往后遍历（目标到根），每一步都检查 `event.isPropagationStopped()`，这正是 `stopPropagation()` 内部标记生效的地方。

### 5. 合成事件对象：SyntheticEvent.ts（已有代码）

```typescript
Object.assign(SyntheticBaseEvent.prototype, {
  stopPropagation(this: BaseSyntheticEvent): void {
    const event = this.nativeEvent;
    if (event && event.stopPropagation) {
      event.stopPropagation();
    }
    this.isPropagationStopped = functionThatReturnsTrue;
  },
});
```

这段代码是「一、3」结论的直接依据：`stopPropagation()` 既调用了 `nativeEvent.stopPropagation()`（真的阻止原生事件继续冒泡），也把 `isPropagationStopped` 换成了恒返回 `true` 的函数——`processDispatchQueueItemsInOrder` 的遍历循环靠调用 `event.isPropagationStopped()` 检查这个标记。

### 6. 事件优先级映射：ReactDOMEventListener.ts（已有代码）

```typescript
export function getEventPriority(domEventName: DOMEventName): EventPriority {
  switch (domEventName) {
    case "click": case "dblclick": case "keydown": case "keyup":
    case "input": case "change": case "submit":
      return DiscreteEventPriority;
    case "mousemove": case "mouseover": case "mouseout":
      return ContinuousEventPriority;
    default:
      return DefaultEventPriority;
  }
}

export function createEventListenerWrapperWithPriority(
  targetContainer: EventTarget,
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
): (nativeEvent: Event) => void {
  const eventPriority = getEventPriority(domEventName);
  let listenerWrapper;
  switch (eventPriority) {
    case DiscreteEventPriority: listenerWrapper = dispatchDiscreteEvent; break;
    case ContinuousEventPriority: listenerWrapper = dispatchContinuousEvent; break;
    default: listenerWrapper = dispatchEvent; break;
  }
  return listenerWrapper.bind(null, domEventName, eventSystemFlags, targetContainer);
}
```

这是「二、1」讲的"合成事件接入 React 优先级机制"在代码层面的落点：`createEventListenerWrapperWithPriority` 在注册委托监听器时，就已经根据事件类型选好了对应的分发函数——`dispatchDiscreteEvent`/`dispatchContinuousEvent` 内部会在真正分发前把 `currentUpdatePriority` 设置成对应档位，事件处理函数里产生的 `setState` 通过 `requestUpdateLane` 读到这个优先级、转换成对应 Lane，与第 07 篇讲的"事件类型到 Lane 的绑定关系"完整衔接。

### 7. DOM 节点到 Fiber 的反查：ReactDOMComponentTree.ts（已有代码）

```typescript
const instanceMap = new WeakMap<Node, FiberNode>();
const propsMap = new WeakMap<Node, Record<string, any>>();

export function getClosestInstanceFromNode(targetNode: Node): FiberNode | null {
  let node: Node | null = targetNode;
  while (node !== null) {
    const targetInst = instanceMap.get(node);
    if (targetInst !== undefined) {
      return targetInst;
    }
    node = node.parentNode;
  }
  return null;
}
```

事件委托模型依赖这套"DOM 节点 ↔ Fiber/props 双向映射"才能工作：原生事件的 `event.target` 拿到的是 DOM 节点，`getClosestInstanceFromNode` 沿着 `parentNode` 向上找到最近的、被记录过的 Fiber（应对文本节点或没有直接挂载 Fiber 的中间节点），这是「二、2」讲的"反查 Fiber"这一步在代码层面的实现，也是 `getListener` 能从 `props` 里取到监听函数的前提。

### 8. 批处理与 flushSync：ReactFiberWorkLoop.ts（已有代码）

```typescript
export function scheduleUpdateOnFiber(
  root: FiberRootNode, _fiber: FiberNode, lane: Lane, eventTime: number,
): void {
  markRootUpdated(root, lane, eventTime);
  ensureRootIsScheduled(root, eventTime);
}

export function scheduleSyncCallback(callback: () => any): void {
  if (syncQueue === null) {
    syncQueue = [callback];
  } else {
    syncQueue.push(callback);
  }
}

export function flushSync<A, R>(fn: (a: A) => R): R {
  const prevExecutionContext = executionContext;
  executionContext |= BatchedContext;
  const previousPriority = getCurrentUpdatePriority();
  try {
    setCurrentUpdatePriority(DiscreteEventPriority);
    if (fn) return fn(null as unknown as A);
    return undefined as unknown as R;
  } finally {
    setCurrentUpdatePriority(previousPriority);
    executionContext = prevExecutionContext;
    if (syncQueue !== null) {
      flushSyncCallbacks();
    }
  }
}
```

与官方源码结构完全对照：`scheduleUpdateOnFiber` 是唯一的调度入口，`SyncLane` 的任务先进 `syncQueue`，`flushSync` 通过临时切换 `currentUpdatePriority` 为 `DiscreteEventPriority` 确保回调内的更新走同步优先级，`finally` 里主动检查 `syncQueue` 非空就立即 `flushSyncCallbacks()`，不等正常路径的微任务调度。

**验证方式**：`pnpm dev` 起本地 Vite 调试环境，打开 `fixtures/events` 这个已存在的验证页面——按钮 `onClick` 里连续两次 `setCount` 只会看到一次渲染日志（`renderCount` 只 +1）；外层 `div` 挂 `onClick`、内层按钮挂 `onClickCapture` + `onClick`，点击内层按钮能在控制台看到"捕获先于冒泡"的日志顺序；输入框填入特定文本后再点击内层按钮，能验证 `stopPropagation()` 调用后外层 `onClick` 确实不再触发。在 `accumulateSinglePhaseListeners`/`processDispatchQueueItemsInOrder`/`flushSync` 打断点，可以实测到监听器收集顺序、捕获冒泡的遍历方向、以及批处理确实是通过 `syncQueue` + 微任务合并多次更新，而不是"简单地不重复渲染"。

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

- **React 18 的自动批处理和 React 17 相比区别在哪？**
- **合成事件为什么要自己实现一套，而不是直接用原生事件？**
- **React 17 把事件绑定从 `document` 改到 root 容器，解决了什么问题？**
- **`e.stopPropagation()` 在合成事件里和原生事件里的行为有什么不同？**
- **什么场景下需要用 `flushSync`？滥用会有什么代价？**

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话核心 | 面试考察频率 |
|--------|-----------|-------------|
| 合成事件本质 | React 自建的事件对象，跨浏览器差异归一化 + 接入优先级调度 | ⭐⭐⭐⭐ |
| 事件委托 | root 容器上每种事件只挂一个原生监听器，靠反查 Fiber + 向上遍历分发 | ⭐⭐⭐⭐⭐ |
| document → root | React 17 改造，解决多 React 实例共存的事件系统互相干扰 | ⭐⭐⭐⭐ |
| 捕获/冒泡两阶段 | 两个独立的原生监听器，不是一次回调模拟两个方向 | ⭐⭐⭐ |
| stopPropagation | 既调用原生 API，也置内部标记，双重生效 | ⭐⭐⭐⭐ |
| Automatic Batching | React 17 靠事件上下文开关，React 18 靠调度层统一队列 | ⭐⭐⭐⭐⭐ |
| flushSync | 临时切同步优先级 + 跳出正常调度立即 flush，慎用 | ⭐⭐⭐⭐ |

---

## 📝 思考题

**留个问题**：合成事件的捕获阶段和冒泡阶段的监听器都已经注册在 root 容器上了，为什么不干脆在事件触发时一次性收集出"捕获方向"和"冒泡方向"两组监听器，在一次原生回调里依次执行完，而要注册两个独立的原生监听器、触发两次独立的分发流程？提示：想一想浏览器原生的事件捕获和冒泡本身是分两个阶段真实发生的（先从 `window` 往下捕获到 `target`，再从 `target` 往上冒泡），如果 React 只监听一次冒泡阶段就在内部"模拟"出捕获阶段的执行时机，捕获阶段的监听器还能真实地先于目标节点上的原生事件处理逻辑执行吗？

答案留在评论区，或者在后续 Hooks/事件相关篇章里遇到需要用到"两阶段真实性"这个细节时会再次提到。

---

> 🔖 这是「React 18 全家桶深度拆解系列」第 8 篇。上一篇：《React 18 并发渲染: Scheduler 时间切片、Lane 模型与 Suspense 原理（面试收藏级）》；下一篇预告：《React 18 Context: 依赖传播机制与手写实现（面试收藏级）》
