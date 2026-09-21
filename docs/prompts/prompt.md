# prompt

```text
/publish 下面我们规划nodejs系列的第2篇文章，具体如下：
{{
## 知识点范围

###第 02 篇：Node.js 事件循环: 浏览器与 Node 宏任务/微任务差异全解（面试收藏级）

**副标题**：libuv 六阶段模型、`process.nextTick` 与 Promise 优先级、`setImmediate` vs `setTimeout`、浏览器 vs Node 的本质差异

> 与已发布《JS 异步编程完全指南》（`docs/articles/01 javascript/2026-07-27-js-async-evolution.md`）的查重分工：那篇已完整覆盖 Generator 语法/`yield`/`next()` 双向通信、`async/await` 是 Generator+Promise 语法糖、co 库实现（约 20 行）。本篇**不复述这些 JS 语法糖**，正文涉及处用「搜索关键词」索引到 JS 异步篇，只展开以下 Node 视角增量——libuv 六阶段模型、`process.nextTick` 优先级、`setImmediate` vs `setTimeout`、浏览器 vs Node 事件循环的本质差异。

#### 一、使用与实践

- Node.js 中常见的宏任务/微任务实战：`setImmediate` vs `setTimeout(fn, 0)` 的执行顺序差异；`process.nextTick` 的插队特性
- 用实验脚本打印实际执行顺序（`console.log` + 时间戳）作为证据

> 前置基础（已发布）：搜索关键词「JS 异步编程 Generator async/await co」——Generator/async/await 语法糖与 co 自动执行器实现见 JS 异步篇，本篇只讲 Node 事件循环的增量。

#### 二、设计与原理

- **浏览器事件循环**：一个宏任务执行完毕后清空当前微任务队列，再进行一次渲染（如果需要），然后取下一个宏任务；常见宏任务来源：`setTimeout`、UI 事件、`postMessage`
- **Node.js 事件循环（libuv）**：由多个明确划分的阶段（phase）构成一个循环——`timers`（`setTimeout`/`setInterval` 到期回调）→ `pending callbacks` → `idle/prepare` → `poll`（处理 I/O 事件，最核心的阶段）→ `check`（`setImmediate` 回调）→ `close callbacks`；每个阶段执行完毕后，都会清空一次微任务队列（`process.nextTick` 队列 + Promise 微任务队列），而不是像浏览器一样只在一个宏任务结束后清空一次
- **`process.nextTick` 与 Promise 微任务的优先级差异**（重点，常考细节）：`process.nextTick` 的回调队列优先级高于 Promise 微任务队列——每次清空微任务时，会先把 `nextTick` 队列全部执行完（包括执行过程中新增的 `nextTick`），再执行 Promise 微任务队列
- **`setTimeout(fn, 0)` 与 `setImmediate` 的执行顺序**：在 `main` 模块顶层（不在任何 I/O 回调内）执行时，两者顺序不确定（受进程启动开销影响）；但如果放在一个 I/O 回调（如 `fs.readFile` 的回调）内部，`setImmediate` 一定先于 `setTimeout(fn, 0)` 执行，因为 I/O 回调发生在 `poll` 阶段，`poll` 阶段结束后立即进入 `check` 阶段（`setImmediate` 所在阶段），而 `timers` 阶段要等到下一轮循环才会被检查
- 对比前端（浏览器）：同样一段"事件循环阶段划分"的知识点，浏览器规范里没有 `setImmediate`、没有独立的 `poll` 阶段概念，这是 Node.js 基于 libuv 实现、专门为处理大量 I/O 设计的产物；理解这个差异是"前端转 Node.js"最容易踩坑的点之一

#### 三、工程落地参考

1. libuv 事件循环主体：`libuv` 仓库 `src/unix/core.c` — `uv_run` 函数中各阶段（timers/pending/idle/poll/check/close）的调用顺序
2. Node.js `process.nextTick` 队列实现：`lib/internal/process/task_queues.js`（nodejs/node 仓库）— `nextTick` 队列与微任务队列的执行时机划分

#### 四、实践演示与验证

搭建 `packages/event-loop-lab`：写几个实验脚本——验证 `process.nextTick` 优先于 Promise 微任务；验证 I/O 回调内 `setImmediate` 先于 `setTimeout(fn,0)`；用 `console.log` + 时间戳输出实际执行顺序作为证据。（Generator 自动执行器 `co` 的手写实现索引到 JS 异步篇，本篇不再重复，聚焦事件循环实验。）

（新建仓库，待补充地址）

#### 五、参考
- https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/
- https://github.com/libuv/libuv

**面试核心问**：
- Node.js 事件循环分几个阶段？每个阶段大致处理什么？
- `process.nextTick` 和 Promise 微任务谁的优先级更高？
- 在 `fs.readFile` 回调里同时写 `setTimeout(fn,0)` 和 `setImmediate(fn)`，谁先执行，为什么？
- 浏览器事件循环和 Node.js 事件循环最本质的差异是什么？



## 已有笔记

- @docs\notes\08 node\05 generator.md
- @docs\notes\08 node\06 async...await.md
- @docs\notes\08 node\07 eventloop.md

## plans 地址

- @docs\plans\05 node-fullstack-series-outline.md

## 规则

- 笔记只关注 @docs/notes/08 node 目录下的，其他目录禁止自行读取
- 补全内容（保留原有内容，只增不删），保留图片，一些知识点的说明图片可以从网络上获取，尽量使用图片加以说明，这样跟容易学习和理解
- 将整理后的内容生成公众号文章，输出到 @docs/articles/08 node
- 文章结构：先出大纲等我确认，再逐节写作
}}
，注意⚠️：
- 本系列 适用于 5-10年的nodejs 开发者，想要系统性的学习，并且想要完全掌握 nodejs 的开发者。
- 保留笔记完整代码和图片，样式格式保持一致和这篇@docs\articles\08 node\2026-09-18-node-eventemitter-promise-concurrency.md，不读我没要求到的文件；
- 可以根据你的经验和最佳实践查漏补缺；主线要明确清晰，不要遗漏源码解析章节；每个知识点都要由浅入深的彻底讲透，讲明白。
```
