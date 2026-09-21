# Node.js 事件循环：浏览器与 Node 宏任务/微任务差异全解（面试收藏级）

> 面试官说「讲讲 Node.js 的事件循环」，多数人只会背「Node 用 libuv 处理异步」。能把 libuv 的六阶段、`process.nextTick` 和 Promise 微任务的优先级、`setImmediate` 和 `setTimeout(fn, 0)` 的先后顺序讲清楚，才说明你真的写过 Node 服务端，而不是只在浏览器里写过 JS。

---

## 🎯 这篇文章解决什么问题

前端转 Node.js，最容易踩的坑之一，就是**拿浏览器的事件循环心智去套 Node**。你在浏览器里背熟了「宏任务 → 微任务 → 渲染」，到了 Node 里却发现多了 `process.nextTick`、`setImmediate`，连 `setTimeout(fn, 0)` 的执行顺序都不确定了——这不是玄学，是因为 Node 的事件循环是**另一套设计**。

这篇文章是「Node.js 全栈深度拆解」系列的第 2 篇。它不讲 Generator/async-await 这些 JS 语法糖（那些在 JS 异步编程篇已经讲透，文末有搜索关键词索引），只讲四件 Node 事件循环的硬核增量：

- **libuv 六阶段模型**——Node 事件循环的完整骨架
- **`process.nextTick` 与 Promise 微任务的优先级**——最容易被问倒的细节
- **`setImmediate` vs `setTimeout(fn, 0)`**——顺序为什么「有时确定、有时不确定」
- **浏览器 vs Node 的本质差异**——前端转后端的认知分水岭

---

## ⚙️ 先分清两对概念：同步/异步 与 阻塞/非阻塞

讲事件循环之前，得先把这两对最容易被混用的概念掰开。它们分别回答不同的问题，混着说会把异步模型的本质讲糊。

**同步 / 异步：关注「消息通知机制」，主语是被调用方。**

- 同步：发出调用后，**没有得到结果之前这个调用不返回**，一旦返回就拿到结果。调用者主动等待。
- 异步：发出调用后**立即返回**，调用者不立刻拿到结果，之后由被调用方通过状态、通知或回调来告知结果。

**阻塞 / 非阻塞：关注「调用者等待时的状态」，主语是调用方。**

- 阻塞：调用结果返回之前，当前线程被挂起，直到拿到结果才返回。
- 非阻塞：不能立刻得到结果时，调用不会阻塞当前线程。

一句话记：**同步异步取决于被调用方（怎么通知你），阻塞非阻塞取决于调用方（你怎么等）**。四个组合——同步阻塞、异步阻塞、同步非阻塞、异步非阻塞——都客观存在，而 Node 的「事件驱动、非阻塞 I/O」追求的是**异步 + 非阻塞**：发出 I/O 调用立即返回（异步），当前线程不被挂起、可以继续处理别的请求（非阻塞）。

![同步异步与阻塞非阻塞：阻塞/非阻塞是调用方状态，同步/异步是被调用方状态，两对维度正交组合](https://cdn.nlark.com/yuque/0/2020/png/738210/1608040567772-0d617403-4cc8-462d-9205-7b191bc8ed84.png)

> 💬 **面试官**：「Node 是异步非阻塞的」这句话，异步和非阻塞分别指什么？
>
> ✅ 标准答案：异步指「消息通知机制」——调用发出后立即返回，结果由被调用方通过回调/事件通知；非阻塞指「调用者状态」——等待结果期间当前线程不被挂起，可以继续干别的。Node 的 I/O 模型是「异步 + 非阻塞」的组合。
>
> 🎁 加分答案：能点出「异步非阻塞」不等于「没有阻塞」——libuv 内部仍用线程池跑那些操作系统没提供异步接口的阻塞操作（如部分文件 I/O、DNS 查询），只是把阻塞挪出了 JS 主线程，主线程层面保持非阻塞。

---

## 🧠 前置基础：从浏览器到 Node，事件循环是怎么来的

讲 Node 的六阶段之前，得先回答一个更根本的问题：**为什么要有「事件循环」这东西？** 这要从 JS 的单线程设计说起。

### JS 为什么是单线程

JavaScript 从设计之初就是单线程的。根本原因在于它的用途——**操作 DOM**。设想一下，如果 JS 是多线程的，两个线程同时操作同一个 DOM 节点（一个要删掉它、一个要往里面加内容），浏览器该听谁的？为了避免这种混乱，JS 被设计成单线程。

单线程带来的三个好处：**省内存**（不需要为每个线程分配独立栈）、**不用切换执行上下文**（没有线程切换开销）、**不用管锁**（没有共享数据的并发竞争问题）。

> 这里要澄清一个常见误区：`Web Worker` 并没有改变 JavaScript 单线程的本质。Worker 是在**独立线程**里跑，但它和主线程**不共享 DOM、不共享作用域**，只能靠消息传递通信——相当于「另起了一个单线程」，而不是「把 JS 变成多线程」。

### 浏览器模型：不止一个线程

很多人以为浏览器里只有「一个 JS 线程」，其实浏览器是一个多线程/多组件的运行环境，JS 线程只是其中之一：

![浏览器模型：用户界面、浏览器引擎、渲染引擎、网络、JS 解释器、UI 后端、数据存储等多个组件协作](https://cdn.nlark.com/yuque/0/2025/png/738210/1741595623254-c0a8f98c-b6b9-4500-8c6f-5fe285b084e5.png)

- **用户界面**：地址栏、前进/后退按钮、书签菜单等
- **浏览器引擎**：在用户界面和渲染引擎之间传送指令
- **渲染引擎**：又称浏览器内核，在线程层面也叫 UI 线程
- **网络**：负责 HTTP 请求这类网络调用
- **用户界面后端**：绘制基本的窗口小部件，UI 线程和 JS 共用一条线程
- **JavaScript 解释器**：解析和执行 JS 代码
- **数据存储**：持久层，浏览器在硬盘上保存 Cookie 等数据

除 JS 线程和 UI 线程之外，还有几个关键线程在背后干活：

- **浏览器事件触发线程**：用户点击、滚动等事件，先到这里
- **定时触发器线程**：`setTimeout`/`setInterval` 的计时由它负责，到点了把回调塞进任务队列
- **异步 HTTP 请求线程**：`XMLHttpRequest`/`fetch` 发出后，网络请求在这个线程里跑

你发现没有——**JS 线程本身不负责计时、不负责发网络请求、不负责等事件**。这些「耗时的事」都交给别的线程去干，干完了把结果（回调）塞进一个队列，JS 线程只负责从这个队列里取任务执行。这就是「任务队列 + 事件循环」的雏形。

### 任务队列：同步栈 + 异步队列

完整的运转模型是这样：

- 所有**同步任务**都在主线程上执行，形成一个**执行栈**
- 主线程之外，还有一个**任务队列**。异步任务一有了运行结果，就往任务队列里放一个事件
- 一旦执行栈里的同步任务全部执行完，系统就读取任务队列，看里面有哪些事件，把对应的回调取出来、结束等待状态、进入执行栈执行
- 主线程不断重复上一步

「主线程从任务队列里读事件」这个过程是**循环不断**的，所以整个运行机制又叫做 **Event Loop（事件循环）**：

![浏览器事件循环：执行栈里的同步代码跑完后，事件循环把任务队列里的回调一个个取回执行栈](https://cdn.nlark.com/yuque/0/2025/png/738210/1741595782941-399e8140-5437-4300-891b-6e7ac60c35e8.png)

### Node 的事件循环：同一套思想，换一个宿主

把上面这套「主线程 + 任务队列 + 事件循环」的思想搬到服务端，就是 Node。差别只在于「耗时的事」由谁来干——浏览器里是那些辅助线程，Node 里是 **libuv**：

![Node 事件循环：JS 代码交给 V8 处理，Node API 交给 libuv 处理，结果通过事件队列回到应用](https://cdn.nlark.com/yuque/0/2020/png/738210/1608040567777-b72f7907-d4a5-4f65-89df-1eec6c5ecdb2.png)

四步走：

1. 我们写的 JS 代码交给 **V8 引擎**处理
2. 代码中调用的 Node API（如 `fs`、`net`），Node 交给 **libuv 库**处理
3. libuv 通过阻塞 I/O 和多线程实现**异步 I/O**
4. 通过**事件驱动**的方式，把结果放到事件队列中，最终交回给我们的应用

到这里你已经串起来了：**浏览器的事件循环是为了「让 JS 线程不阻塞 UI 渲染」，Node 的事件循环是为了「让 JS 主线程不阻塞 I/O 处理」——内核是同一套「同步栈 + 异步队列 + 循环取任务」的思想，只是宿主从浏览器换成了 libuv。**

> 💬 **面试官**：为什么 JavaScript 要设计成单线程？Web Worker 不是多线程吗？
>
> ✅ 标准答案：JS 设计成单线程是为了避免多个线程同时操作 DOM 导致冲突。单线程还省内存、免去上下文切换和锁的负担。Web Worker 是在独立线程里跑、但与主线程不共享 DOM/作用域，只靠消息通信，本质上没改变 JS 单线程模型。
>
> 🎁 加分答案：能说清「单线程 ≠ 只有一条线程」——浏览器和 Node 都是「JS 主线程单线程 + 后台多线程（定时/网络/文件 I/O）」，主线程只做「执行同步代码 + 从队列取回调」，真正耗时的活甩给后台线程，这正是「异步非阻塞」能成立的前提。

---

## 🔄 libuv 六阶段：Node 事件循环的骨架

浏览器的事件循环相对简单：一个宏任务执行完，清空微任务队列，渲染一次（如果需要），再取下一个宏任务。Node 的事件循环不是「宏任务/微任务」这种扁平结构，而是由 libuv 驱动的、**明确划分成六个阶段（phase）**的循环：

```
   ┌───────────────────────┐
┌─>│        timers         │  setTimeout / setInterval 到期回调
│  └──────────┬────────────┘
│  ┌──────────┴────────────┐
│  │   pending callbacks   │  上一轮遗留的 I/O 回调（如 TCP 错误）
│  └──────────┬────────────┘
│  ┌──────────┴────────────┐
│  │     idle / prepare    │  内部使用（几乎不用关心）
│  └──────────┬────────────┘
│  ┌──────────┴────────────┐
│  │         poll          │  处理 I/O 事件，最核心的阶段
│  └──────────┬────────────┘
│  ┌──────────┴────────────┐
│  │         check         │  setImmediate 回调
│  └──────────┬────────────┘
│  ┌──────────┴────────────┐
│  │    close callbacks    │  socket 关闭等回调
│  └──────────┴────────────┘
└───────────────────────────┘
```

理解这六阶段，记住三个关键点：

**① `poll` 是最核心的阶段**。它负责处理 I/O 事件（文件读写、网络请求的结果），绝大多数异步回调都在这里被触发。当 `poll` 阶段的队列为空时，事件循环会在这里「等一会儿」——检查 `timers` 阶段有没有到期的定时器，如果有就回到 `timers` 阶段，没有就继续等 I/O。

**② 每个阶段结束后，都会清空一次微任务队列**。这是 Node 和浏览器最大的差异之一——浏览器是「一个宏任务结束清一次微任务」，Node 是「**每个 phase 结束清一次微任务**」。这里的「微任务队列」其实是两个队列：`process.nextTick` 队列 + Promise 微任务队列。

**③ `check` 阶段专门跑 `setImmediate`**。`setImmediate` 的回调不在 `timers` 里，也不在 `poll` 里，而是在 `poll` 之后的 `check` 阶段执行。记住这个位置，是理解后面 `setImmediate` vs `setTimeout` 顺序问题的关键。

---

## ⏱️ process.nextTick 与 Promise 微任务：谁优先？

这是 Node 事件循环里**最高频的细节考点**。结论先记住：

> **`process.nextTick` 队列的优先级高于 Promise 微任务队列。**

每次要清空微任务时，Node 会**先把 `nextTick` 队列全部执行完**（包括执行过程中新加入的 `nextTick`），**再执行 Promise 微任务队列**。用一段代码验证：

```javascript
Promise.resolve().then(() => console.log('promise 1'))
process.nextTick(() => console.log('nextTick 1'))

// 输出顺序：
// nextTick 1
// promise 1
```

`process.nextTick` 先执行。再看一个更狠的例子，验证「执行 nextTick 过程中新增的 nextTick 也会被优先执行」：

```javascript
process.nextTick(() => {
  console.log('nextTick 1')
  process.nextTick(() => console.log('nextTick 2')) // 👈 执行中新增
})
Promise.resolve().then(() => console.log('promise 1'))

// 输出顺序：
// nextTick 1
// nextTick 2   ← 新增的 nextTick 仍然优先于 promise
// promise 1
```

为什么会这样？因为 `process.nextTick` 的设计初衷就是「**让某些操作在进入下一个 phase 之前立刻执行**」，它的优先级被刻意设计得比 Promise 更高。这也是为什么 Node 官方文档专门提醒：**递归调用 `process.nextTick` 可能饿死事件循环**——如果一直往 nextTick 队列里塞新的 nextTick，事件循环就永远停在「清空 nextTick 队列」这一步，进不了 `poll` 阶段，I/O 就永远得不到处理。

> 💬 **面试官**：`process.nextTick` 和 Promise 的微任务，谁的优先级更高？
>
> ✅ 标准答案：`process.nextTick` 更高。每次清空微任务时，Node 会先执行完整个 `nextTick` 队列（包括执行过程中新增的 nextTick），再执行 Promise 微任务队列。
>
> 🎁 加分答案：`nextTick` 优先级过高是有代价的——递归 `process.nextTick` 会饿死事件循环，让 I/O 回调永远得不到执行，所以生产代码里要避免在 nextTick 回调里无限追加 nextTick。

---

## 🕐 setImmediate vs setTimeout(fn, 0)：顺序为什么「看运气」

这是 Node 面试里另一个经典陷阱。两个都「想尽快执行」，但谁先谁后，**取决于代码在哪个位置执行**。

### 在 main 模块顶层：顺序不确定

```javascript
setTimeout(() => console.log('timeout'), 0)
setImmediate(() => console.log('immediate'))

// 输出顺序不确定，有时 timeout 先，有时 immediate 先
```

为什么？因为进程启动是有开销的。事件循环**第一次**进入 `timers` 阶段时，需要判断「定时器是否已到期」。如果进程启动慢，第一次检查 `timers` 时 `setTimeout(fn, 0)` 已经到期了，就先执行 timeout；如果启动快，还没到 0ms 到期时间，就跳过 `timers` 阶段往下走，先到 `check` 阶段执行 immediate。所以顶层代码里两者的顺序「看运气」。

### 在 I/O 回调里：setImmediate 一定先执行

```javascript
const fs = require('fs')

fs.readFile('somefile.txt', () => {
  setTimeout(() => console.log('timeout'), 0)
  setImmediate(() => console.log('immediate'))

  // 输出顺序固定：
  // immediate
  // timeout
})
```

这次顺序是**确定的**：`immediate` 一定先于 `timeout`。原理回到六阶段图：

- `fs.readFile` 的回调在 **`poll` 阶段**被执行
- `poll` 阶段结束后，事件循环**立即进入 `check` 阶段**——这正是 `setImmediate` 回调执行的地方
- 而 `setTimeout(fn, 0)` 要等**下一轮循环**回到 `timers` 阶段才会被检查执行

所以「I/O 回调里，`setImmediate` 先于 `setTimeout(fn, 0)`」是铁律，背后的原因是**阶段顺序**：`poll` 之后紧挨着 `check`，而 `timers` 是下一个循环的开头。

> 💬 **面试官**：在 `fs.readFile` 回调里同时写 `setTimeout(fn, 0)` 和 `setImmediate(fn)`，谁先执行？为什么？
>
> ✅ 标准答案：`setImmediate` 先执行。因为 `fs.readFile` 的回调发生在 `poll` 阶段，`poll` 结束后立即进入 `check` 阶段（`setImmediate` 所在阶段），而 `setTimeout` 要等到下一轮循环的 `timers` 阶段才被检查。
>
> 🎁 加分答案：顶层（main 模块）代码里两者顺序不确定，因为受进程启动开销影响，第一次进入 `timers` 阶段时定时器可能已到期、也可能没到期。能区分「I/O 回调内确定」和「顶层不确定」两种场景，说明你真的跑过代码验证。

---

## 🔬 源码解析：uv_run 的六阶段 + nextTick 队列的优先级

前面讲的是「结论」，这一节把结论对应到真实源码，让你面试时能「从源码层面」讲清为什么。libuv 的事件循环主体在 `src/unix/core.c` 的 `uv_run` 函数里，Node 的 nextTick 队列在 `lib/internal/process/task_queues.js` 里。

### uv_run：六阶段就是六个函数调用

libuv 的 `uv_run` 是一个 `while` 循环，每一轮依次调用几个阶段函数（源码有精简，但顺序和结构完全一致）：

```c
int uv_run(uv_loop_t* loop, uv_run_mode mode) {
  int timeout;
  int r;
  int ran_pending;

  r = uv__loop_alive(loop);
  if (!r)
    uv__update_time(loop);

  while (r != 0 && loop->stop_flag == 0) {
    uv__update_time(loop);              // 更新当前时间
    uv__run_timers(loop);               // timers：setTimeout/setInterval
    ran_pending = uv__run_pending(loop); // pending callbacks
    uv__run_idle(loop);                 // idle
    uv__run_prepare(loop);              // prepare
    timeout = 0;
    if ((mode == UV_RUN_ONCE && !ran_pending) || mode == UV_RUN_DEFAULT)
      timeout = uv_backend_timeout(loop); // 计算 poll 该阻塞多久
    uv__io_poll(loop, timeout);         // poll：处理 I/O，可能阻塞
    uv__run_check(loop);                // check：setImmediate
    uv__run_closing_handles(loop);      // close callbacks
    ...
    r = uv__loop_alive(loop);
  }
  return r;
}
```

对照前面那张六阶段图，你会发现 `uv_run` 里的函数调用顺序和阶段顺序**一一对应**：

- `uv__run_timers` → `timers` 阶段
- `uv__run_pending` → `pending callbacks` 阶段
- `uv__run_idle` / `uv__run_prepare` → `idle/prepare` 阶段
- `uv__io_poll` → `poll` 阶段（`timeout` 决定它阻塞多久）
- `uv__run_check` → `check` 阶段（`setImmediate` 在这里）
- `uv__run_closing_handles` → `close callbacks` 阶段

### 为什么 poll 阶段会「阻塞等待」

`uv__io_poll(loop, timeout)` 的 `timeout` 由 `uv_backend_timeout(loop)` 算出，它回答的问题是「poll 阶段该等多久」。计算逻辑（面试能提一句就加分）：

- 如果 `loop->stop_flag` 已设置，`timeout = 0`（不等待）
- 如果没有活跃的 handle / request，`timeout = 0`（循环该退出了）
- 如果有 `idle` 句柄待处理，`timeout = 0`
- 如果有 pending 的回调，`timeout = 0`
- 如果有到期的 timer，`timeout = 0`（赶紧回到 timers 阶段）
- **否则**，`timeout = 距离下一个 timer 到期的时间`——poll 会阻塞这段时间，等 I/O 事件，或等到期后返回 timers 阶段

这就是 poll 阶段「最核心」的原因：它既负责处理 I/O，又通过 `timeout` 机制避免「空转」——没有 I/O 事件时就在 `epoll` / `kqueue` 上休眠，直到有事件或定时器到期才醒来。这是 Node 能扛住高并发 I/O 的底层原因之一。

### nextTick 队列：Node 的「阶段间隙插队」

`process.nextTick` 的实现不在 libuv，而在 Node 自身的 `lib/internal/process/task_queues.js`。核心是一个 FIFO 队列：

```javascript
// lib/internal/process/task_queues.js（精简示意）
const nextTickQueue = new FixedQueue();  // 固定大小的环形队列

function processNextTick() {
  // 遍历并执行 nextTickQueue 里的所有回调
  while (nextTickQueue.length > 0) {
    const tickObject = nextTickQueue.shift();
    // ...执行回调
  }
}
```

关键在**它被调用的时机**。Node 在每个「C++ 层回到 JS 层」的边界（`InternalCallbackScope` 析构时），会先执行 `processNextTick()` 清空 nextTick 队列，**再**让 V8 执行 Promise 微任务队列。这正是「nextTick 优先于 Promise」的源码级原因：

> 每次要进入微任务检查点（microtask checkpoint）时，Node 先跑自己的 `nextTick` 队列，跑完才轮到 V8 的 Promise 微任务。

理解这一点，「nextTick 优先于 Promise」就不再是一句要背的结论，而是一条能从源码推导出来的必然结果。

> 💬 **面试官**：`process.nextTick` 为什么不直接实现成 Promise 微任务？
>
> ✅ 标准答案：`process.nextTick` 比 Promise 早诞生，是 Node 自己造的、独立于 V8 微任务的机制。它要解决的是「在进入下一个阶段之前，立刻、同步地处理某些回调」，比如在发出事件前先同步修改状态、在抛错前先清理资源。
>
> 🎁 加分答案：`nextTick` 比 Promise 微任务「插队更狠」——它不仅在宏任务间隙执行，还在**每个 phase 之间**执行。如果把它换成 Promise 微任务，就失去了「阶段间立即执行」这个能力，Node 内部大量「C++ 回 JS 边界」的清理逻辑就没法保证时机了。

🔧 **真实场景**：医疗场景里 `process.nextTick` 最常见的用法是「保证事件触发前状态已同步」。比如订单状态从「待支付」变「已支付」，你要先更新内存里的订单对象，再 `emit('orderPaid')` 通知下游。如果直接 `emit`，监听器可能读到还没更新完的状态；用 `nextTick` 包裹 `emit`，就能确保「本轮所有同步代码跑完后、进入下一阶段前」再触发事件，监听器读到的永远是最新状态。

---

## 🔀 浏览器 vs Node：本质差异在哪

理解了上面三节，就可以回答那个最本质的问题了：**为什么 Node 的事件循环和浏览器不一样？**

**浏览器**的事件循环是**规范驱动**的（WHATWG HTML 规范），设计目标是「渲染用户界面」。所以它的模型是：一个宏任务 → 清空微任务 → 渲染 → 下一个宏任务。它没有 `setImmediate`、没有独立的 `poll` 阶段、没有 `process.nextTick`。

它的完整运转过程，用一张图看得更清楚（`JS 引擎线程` 执行栈里的代码 → 异步事件触发后回调进宏任务队列 → 每次取一个宏任务执行 → 清空微任务队列 → GUI 渲染）：

![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607137707447-4fa29db8-e686-4eb4-a82a-cf2eb64150ac.png)

浏览器里「宏任务」和「微任务」有明确的来源划分：

- **宏任务**（宿主环境提供）：`script` 整体代码、`setTimeout` / `setInterval`、UI 事件（click / input）、`postMessage` / `MessageChannel`
- **微任务**（语言标准提供）：`Promise.then` / `catch` / `finally`、`MutationObserver`、`queueMicrotask`

记住这个划分的底层逻辑，判断一个 API 是宏任务还是微任务就不靠背：**看它是谁提供的——宿主环境（浏览器）提供的归宏任务，JS 语言标准（ECMAScript）提供的归微任务**。`setTimeout`、UI 事件是浏览器塞给你的异步能力，所以是宏任务；`Promise`、`MutationObserver` 是语言标准自己的异步能力，所以是微任务。这条判断准则，面试时比背清单更值钱。

**Node**的事件循环是 **libuv 驱动**的，设计目标是「处理大量 I/O」。所以它把循环拆成六个明确的阶段，专门用 `poll` 阶段来高效处理 I/O 事件，用 `check` 阶段跑 `setImmediate`，用 `process.nextTick` 提供「阶段之间立即执行」的插队能力。

一句话概括：**浏览器的事件循环为了「渲染」而设计，Node 的事件循环为了「I/O」而设计**。这就是为什么前端那套「宏任务/微任务」心智，搬到 Node 里会不完整——Node 多出来的 `setImmediate`、`nextTick`、六阶段，都是 libuv 为「高并发 I/O」量身定做的产物。

这也是「前端转 Node.js」最该重新建立的心智：**不要用浏览器的事件循环去硬套 Node**，而是从「libuv 为什么要这样分阶段」出发，理解每个阶段各自承担什么 I/O 职责。

---

## 🧪 动手验证：三个脚本亲手跑一遍

面试结论背得再熟，不如自己跑一遍记得牢。下面三个脚本覆盖了本文三个核心结论，用 `console.log` + 时间戳把执行顺序「钉死」成证据。

### 验证一：nextTick 优先于 Promise 微任务

```javascript
// 01-nexttick-vs-promise.js
Promise.resolve().then(() => console.log('1. promise 微任务'))
process.nextTick(() => console.log('2. nextTick'))
Promise.resolve().then(() => console.log('3. promise 微任务'))
process.nextTick(() => console.log('4. nextTick'))

// 预期输出：
// 2. nextTick
// 4. nextTick
// 1. promise 微任务
// 3. promise 微任务
```

不管怎么交替写，**所有 `nextTick` 一定先于所有 Promise 微任务执行**。这是「nextTick 队列整体优先于 Promise 队列」最直观的证据。

### 验证二：顶层 setTimeout vs setImmediate「看运气」

```javascript
// 02-top-level-order.js
const start = Date.now()
setTimeout(() => console.log(`setTimeout 先执行（+${Date.now() - start}ms）`), 0)
setImmediate(() => console.log(`setImmediate 先执行（+${Date.now() - start}ms）`))

// 多跑几次，两种结果都可能出现：
// 有时 setTimeout 先，有时 setImmediate 先
```

如果你在 `package.json` 里用 `node 02-top-level-order.js` 连续跑十次，大概率会看到两种结果交替出现——这就是「顶层顺序受进程启动开销影响」的活证据。

### 验证三：I/O 回调里 setImmediate 一定先执行

```javascript
// 03-io-callback-order.js
const fs = require('fs')

fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'))
  setImmediate(() => console.log('immediate'))
})

// 预期输出（每次都是这个顺序）：
// immediate
// timeout
```

这个脚本你跑一百遍，输出也不会变——因为 `fs.readFile` 回调落在 `poll` 阶段，`poll` 结束后紧跟着 `check`（`setImmediate`），而 `setTimeout` 要等下一轮的 `timers` 阶段。**确定性来自阶段顺序，不是玄学。**

---

## 💡 一张图总结（面试速记）

| 知识点 | 一句话内核 | 面试频率 |
|--------|-----------|---------|
| 同步/异步 vs 阻塞/非阻塞 | 异步看被调用方（怎么通知），阻塞看调用方（怎么等） | ⭐⭐⭐ 必考 |
| JS 单线程 | 为操作 DOM 设计，Worker 不改本质，靠后台多线程补 I/O | ⭐⭐⭐ 必考 |
| 事件循环起源 | 同步栈 + 异步队列 + 循环取任务，浏览器与 Node 同一套思想 | ⭐⭐ 高频 |
| libuv 六阶段 | timers → pending → idle → poll → check → close | ⭐⭐⭐ 必考 |
| 微任务时机 | 每个 phase 结束清一次（不是每个宏任务） | ⭐⭐⭐ 必考 |
| nextTick vs Promise | nextTick 优先，先清空 nextTick 再清 Promise | ⭐⭐⭐ 必考 |
| setImmediate 位置 | 在 `check` 阶段，紧跟在 `poll` 之后 | ⭐⭐⭐ 必考 |
| I/O 回调里的顺序 | setImmediate 先于 setTimeout(fn,0) | ⭐⭐⭐ 必考 |
| 顶层顺序 | 不确定，受进程启动开销影响 | ⭐⭐ 高频 |
| 本质差异 | 浏览器为渲染，Node 为 I/O（libuv） | ⭐⭐⭐ 必考 |

> 💡 记住这条主线：**同步/异步与阻塞/非阻塞分清楚 → JS 单线程 → 浏览器任务队列（为渲染）→ Node 六阶段（为 I/O）**。Node 事件循环的所有「反直觉」，本质都是 libuv 为高并发 I/O 做的刻意设计——`poll` 专注 I/O、`check` 跑 `setImmediate`、`nextTick` 提供阶段间插队。

---

## 📝 留个问题

前面说了 `process.nextTick` 优先于 Promise 微任务。但有一个更刁钻的追问：**如果把 `process.nextTick` 放进一个 `setImmediate` 回调里，它会在哪个时机执行？** 提示：想想 `setImmediate` 所在的 `check` 阶段结束后，微任务队列（含 nextTick）是在什么时候被清空的。

欢迎评论区写出你的分析 👇

---

> 🔖 这是「Node.js 全栈深度拆解」系列第 2 篇。上一篇：《Node.js 事件驱动内核：EventEmitter 源码 + Promise/A+ 手写 + 并发控制》；下一篇预告：《Node.js 运行时内核：V8+libuv 架构、CommonJS 加载机制与 ESM 深度拆解》。
>
> 前置基础扩展阅读：搜索关键词「JS 异步编程 Generator async/await co」「libuv 事件循环」「process.nextTick 官方文档」「Node.js event-loop-timers-and-nexttick」
