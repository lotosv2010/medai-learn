# Node.js 事件循环：浏览器与 Node 宏任务/微任务差异全解（面试收藏级）

> 面试官说「讲讲 Node.js 的事件循环」，多数人只会背「Node 用 libuv 处理异步」。能把 libuv 的六阶段、`process.nextTick` 和 Promise 微任务的优先级、`setImmediate` 和 `setTimeout(fn, 0)` 的先后顺序讲清楚，才说明你真的写过 Node 服务端，而不是只在浏览器里写过 JS。

---

## 🎯 这篇文章解决什么问题

前端转 Node.js，最容易踩的坑之一，就是**拿浏览器的事件循环心智去套 Node**。你在浏览器里背熟了「宏任务 → 微任务 → 渲染」，到了 Node 里却发现多了 `process.nextTick`、`setImmediate`，连 `setTimeout(fn, 0)` 的执行顺序都不确定了——这不是玄学，是因为 Node 的事件循环是**另一套设计**。

这篇文章是「Node.js 全栈深度拆解」系列的第 2 篇。它不讲 Generator/async-await 这些 JS 语法糖（那些在 JS 异步编程篇已经讲透，文末有搜索关键词索引），只讲四件 Node 事件循环的硬核增量：

1. **libuv 六阶段模型**——Node 事件循环的完整骨架
2. **`process.nextTick` 与 Promise 微任务的优先级**——最容易被问倒的细节
3. **`setImmediate` vs `setTimeout(fn, 0)`**——顺序为什么「有时确定、有时不确定」
4. **浏览器 vs Node 的本质差异**——前端转后端的认知分水岭

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

## 🔀 浏览器 vs Node：本质差异在哪

理解了上面三节，就可以回答那个最本质的问题了：**为什么 Node 的事件循环和浏览器不一样？**

**浏览器**的事件循环是**规范驱动**的（WHATWG HTML 规范），设计目标是「渲染用户界面」。所以它的模型是：一个宏任务 → 清空微任务 → 渲染 → 下一个宏任务。它没有 `setImmediate`、没有独立的 `poll` 阶段、没有 `process.nextTick`。

**Node**的事件循环是 **libuv 驱动**的，设计目标是「处理大量 I/O」。所以它把循环拆成六个明确的阶段，专门用 `poll` 阶段来高效处理 I/O 事件，用 `check` 阶段跑 `setImmediate`，用 `process.nextTick` 提供「阶段之间立即执行」的插队能力。

一句话概括：**浏览器的事件循环为了「渲染」而设计，Node 的事件循环为了「I/O」而设计**。这就是为什么前端那套「宏任务/微任务」心智，搬到 Node 里会不完整——Node 多出来的 `setImmediate`、`nextTick`、六阶段，都是 libuv 为「高并发 I/O」量身定做的产物。

这也是「前端转 Node.js」最该重新建立的心智：**不要用浏览器的事件循环去硬套 Node**，而是从「libuv 为什么要这样分阶段」出发，理解每个阶段各自承担什么 I/O 职责。

---

## 💡 一张图总结（面试速记）

| 知识点 | 一句话内核 | 面试频率 |
|--------|-----------|---------|
| libuv 六阶段 | timers → pending → idle → poll → check → close | ⭐⭐⭐ 必考 |
| 微任务时机 | 每个 phase 结束清一次（不是每个宏任务） | ⭐⭐⭐ 必考 |
| nextTick vs Promise | nextTick 优先，先清空 nextTick 再清 Promise | ⭐⭐⭐ 必考 |
| setImmediate 位置 | 在 `check` 阶段，紧跟在 `poll` 之后 | ⭐⭐⭐ 必考 |
| I/O 回调里的顺序 | setImmediate 先于 setTimeout(fn,0) | ⭐⭐⭐ 必考 |
| 顶层顺序 | 不确定，受进程启动开销影响 | ⭐⭐ 高频 |
| 本质差异 | 浏览器为渲染，Node 为 I/O（libuv） | ⭐⭐⭐ 必考 |

> 💡 记住这条主线：**浏览器（宏任务/微任务，为渲染）→ Node（六阶段，为 I/O）**。Node 事件循环的所有「反直觉」，本质都是 libuv 为高并发 I/O 做的刻意设计——`poll` 专注 I/O、`check` 跑 `setImmediate`、`nextTick` 提供阶段间插队。

---

## 📝 留个问题

前面说了 `process.nextTick` 优先于 Promise 微任务。但有一个更刁钻的追问：**如果把 `process.nextTick` 放进一个 `setImmediate` 回调里，它会在哪个时机执行？** 提示：想想 `setImmediate` 所在的 `check` 阶段结束后，微任务队列（含 nextTick）是在什么时候被清空的。

欢迎评论区写出你的分析 👇

---

> 🔖 这是「Node.js 全栈深度拆解」系列第 2 篇。上一篇：《Node.js 事件驱动内核：EventEmitter 源码 + Promise/A+ 手写 + 并发控制》；下一篇预告：《Node.js 运行时内核：V8+libuv 架构、CommonJS 加载机制与 ESM 深度拆解》。
>
> 前置基础扩展阅读：搜索关键词「JS 异步编程 Generator async/await co」「libuv 事件循环」「process.nextTick 官方文档」「Node.js event-loop-timers-and-nexttick」
