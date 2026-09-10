# Node.js 全栈系列公众号文章大纲

> 所属系列：Node.js 全栈深度拆解
> 写作原则：使用与实践 → 设计与原理 → 源码解析（重点代码，来源 GitHub 仓库）→ 手写实现 → GitHub → 参考
> 目标读者：5-10 年前端或全栈经验，正在系统补齐 Node.js 后端与工程化能力，备战高级/专家岗面试或转型 AI 应用工程师的开发者
> 与 React 18 / Vue 3 系列关系：结构对称（六段式），可对照的知识点（如事件循环、发布订阅、Diff 与响应式）显式标注「对比前端」

---

## 大纲修订说明（对照原始笔记目录）

原始笔记目录共 22+ 个章节（01 高阶函数 ~ 22 Redis，另加 MySQL/Mongodb/GraphQL/PostgreSQL/Apollo），存在以下问题，本次重构已修正：

### 1. 不属于 Node.js Roadmap 的章节（建议移出本系列）

- **16 链表(LinkedList)**、**17 树(Tree)**：纯数据结构与算法内容，与 Node.js 知识体系无直接关联，且与后续 `16 Nest+TS`、`17 MySQL` 编号冲突。建议移至独立的「数据结构与算法」系列，不纳入 Node.js 系列。

### 2. 编号冲突修正

- 原目录 `16` 号同时被"链表"和"Nest+TS"占用，`17` 号同时被"树"和"MySQL"占用——已将链表/树移出后消除冲突。
- 仓库内 `docs/articles/` 下 Node 文章目录原为 `00 node/`，与 `07 react/` 编号体系不连续，已重命名为 `09 node/`（衔接在 `08 network/` 网络原理系列之后，详见下方第 6 点顺序调整说明）。

### 3. JS 基础章节合并

- 原目录 01~06 号（高阶函数/柯里化/发布订阅/Promise/Generator/async-await）共 6 章，均属于 JS 语言基础而非 Node.js 专项知识，本质是 Node.js 的前置能力。拆成 6 篇文章会稀释"Node.js 系列"的定位，因此合并为 **2 篇**：第 01 篇（高阶函数/发布订阅/Promise/柯里化）、第 02 篇（Generator/async-await/EventLoop）。

### 4. Roadmap 缺口补充

对照 roadmap.sh/nodejs 与业界通用后端知识体系，原目录缺少以下高频考点，本次已补齐：

- **WebSocket / 实时通信** —— 协议原理归入《网络原理》系列第 05 篇，本系列第 05 篇「Node.js 核心 API 大全」负责手写实现
- **测试体系**（Jest/Vitest/Supertest）—— 独立在第 15 篇工程化篇
- **进程管理与部署**（PM2/Cluster/worker_threads/Docker）—— 并入第 15 篇
- **消息队列基础**（RabbitMQ/Kafka 概念 + Node 消费者写法）—— 并入第 15 篇
- **接口限流**（令牌桶/漏桶 + Redis 实现）—— 并入第 12 篇 Redis
- **Node 安全实践**（SQL 注入防范/Helmet/依赖安全扫描）—— 并入第 15 篇
- **性能优化与 profiling**（内存泄漏排查/CPU Profile）—— 并入第 15 篇
- **OAuth2 授权体系** —— 并入第 06 篇认证篇，与 Cookie/Session/JWT 形成完整认证知识链

### 5. 数据库板块结构调整

原目录数据库板块（MySQL/Mongodb/GraphQL/PostgreSQL/Apollo/Redis）各拆 2-5 个子章节（如 MySQL 基础/高级/设计），信息密度不足以支撑独立成篇。已合并为"每个数据库一篇、覆盖基础到原理到实战"的结构：MySQL、MongoDB、Redis 各一篇，PostgreSQL 因与 pgvector 向量检索关联（对齐本项目 AI 工程栈）单独一篇，GraphQL+Apollo 合并一篇。

### 6. 二次修订：查重已发布文章后的调整（本次修订）

对照 `docs/articles/03 module/` 已发布的两篇文章，发现与本大纲部分选题重叠，同时读者反馈"网络协议"篇定位模糊，本次调整：

- **删除原「05 NPM 生态」篇**：`2026-08-02-npm-yarn-pnpm-deep-dive.md` 已完整覆盖 semver/幽灵依赖/pnpm 存储机制/workspace/lock 文件，本篇无增量内容，直接删除，全系列篇数由 16 篇降为 15 篇
- **精简第 03 篇重叠内容**：`2026-08-01-js-module-systems.md` 已讲透 IIFE/AMD/CMD/UMD/ESM 的规范演进与 Tree Shaking 原理，第 03 篇改为聚焦 Node.js **运行时**如何加载/解析/缓存模块（V8+libuv 架构、CommonJS 模块包装函数、循环依赖、ESM 三阶段加载、幽灵依赖的模块解析算法成因），不重复规范对比部分，标题相应调整
- **原「06 网络协议深度」拆分迁出**：OSI/TCP-IP/HTTP 演进/TLS 握手等协议原理与具体运行时无关，属于更基础的地基知识，已整体迁移并扩展为独立的《网络原理》系列（详见 `docs/plans/network-principles-series-outline.md`，共 8 篇），不再占用 Node.js 系列篇幅
- **新增「05 Node.js 核心 API 大全」篇**：填补原 06 篇腾出的位置，聚焦 Node.js 专属的核心模块（`process`/`crypto`/`net`/`os`/`url`/`child_process`/`worker_threads`），并在手写实现中落地 WebSocket 服务端（协议原理见《网络原理》系列第 05 篇，此处只管"怎么用 Node.js 实现"）

### 7. 三次修订：系列顺序调整（本次修订）

《网络原理》系列是本系列多处引用的前置地基知识（HTTP 演进/TLS/WebSocket 帧格式/RESTful-GraphQL 设计对比），因此在总大纲 `docs/plans/frontend-engineering-outline.md` 中把两个系列的编号顺序互换：**网络原理系列改为 08，Node.js 全栈系列改为 09**（小程序系列相应顺移为 10），先写地基知识再写运行时实现，读者阅读顺序更符合"协议原理 → 具体实现"的知识依赖关系。仓库内文章目录 `docs/articles/08 node/`（此前为空目录）已同步重命名为 `docs/articles/09 node/`，为网络原理系列预留 `08 network/` 目录位。

---

## 系列定位

**「Node.js 全栈深度拆解」系列**

- 篇数：15 篇（JS 异步基础 2 篇 + Node.js 核心 3 篇 + 网络与认证 1 篇 + Web 框架 3 篇 + 数据库 4 篇 + GraphQL 1 篇 + 工程化 1 篇）
- 核心主线：JS 异步体系（发布订阅/Promise/EventLoop）→ Node.js 运行时（模块系统/I-O/核心 API）→ 认证体系 → Web 框架三选一深度拆解（Express/Koa/NestJS）→ 数据库全家桶（MySQL/MongoDB/Redis/PostgreSQL）→ API 设计范式（GraphQL）→ 工程化落地（测试/部署/性能）
- 主线节奏对齐 React 18 / Vue 3 系列："是什么 → 怎么运作 → 怎么用 → 怎么用得高级"，不做知识点平铺罗列
- 内容结构：六段式（使用与实践 → 设计与原理 → 源码解析 → 手写实现 → GitHub → 参考）
- 特色：每篇 3-5 个「面试官会问」；示例统一沿用医疗场景命名（药品/处方/患者/医院管理系统 HIS）；涉及可与前端对照的知识点显式标注「对比前端」
- 手写实现仓库：统一使用一个新建仓库（建议命名 `medai-node-source`），按篇章逐步搭建各模块的简化实现，风格对齐 React 18 系列 `lotosv2010/react-source` 的"增量式 monorepo"手法——不同的是 Node.js 系列每篇模块相对独立（EventEmitter/Promise/Express/Redis 客户端等互不依赖），因此采用 `packages/<模块名>` 的 monorepo 结构，各篇往对应 package 里增量填入实现，而不强求单一主链路贯穿全篇
- 与《网络原理》系列的分工：本系列不重复讲协议原理（HTTP 演进/TLS 握手/WebSocket 帧格式等见 `docs/plans/network-principles-series-outline.md`），只讲"Node.js 怎么基于这些协议实现具体能力"

---

## 文章规划总览

| 编号 | 标题 | 核心主题 | 状态 |
|------|------|----------|------|
| 01 | JS 异步基石: 高阶函数/发布订阅/Promise/函数柯里化深度拆解（面试收藏级） | JS异步基础 | ⬜ 待写 |
| 02 | JS 调度引擎: Generator/async-await 与 EventLoop 浏览器/Node 差异全解（面试收藏级） | 事件循环 | ⬜ 待写 |
| 03 | Node.js 运行时内核: V8+libuv 架构/CommonJS 加载机制/ESM 深度拆解（面试收藏级） | Node架构 | ⬜ 待写 |
| 04 | Node.js I/O 体系: Buffer/Stream/path/fs 全解析与背压机制（面试收藏级） | I/O能力 | ⬜ 待写 |
| 05 | Node.js 核心 API 大全: process/crypto/net/os/worker_threads 深度拆解（面试收藏级） | 核心 API | ⬜ 待写 |
| 06 | Web 认证体系: Cookie/Session/JWT/OAuth2 设计原理与安全实践（面试收藏级） | 认证鉴权 | ⬜ 待写 |
| 07 | Express 深度: 路由/中间件链/错误处理源码解析与手写核心（面试收藏级） | Express | ⬜ 待写 |
| 08 | Koa 深度: 洋葱模型/compose 原理/对比 Express/手写实现（面试收藏级） | Koa | ⬜ 待写 |
| 09 | NestJS+TypeScript: IoC/DI/装饰器元编程/模块化企业级架构（生产收藏级） | NestJS | ⬜ 待写 |
| 10 | MySQL 全栈: 事务/索引原理/慢查询优化/数据库设计范式（面试收藏级） | MySQL | ⬜ 待写 |
| 11 | MongoDB 深度: 文档模型/聚合管道/索引策略/Mongoose ODM 原理（面试收藏级） | MongoDB | ⬜ 待写 |
| 12 | Redis 深度: 五大数据结构/持久化/缓存策略/分布式锁/接口限流（面试收藏级） | Redis | ⬜ 待写 |
| 13 | PostgreSQL 进阶: 关系型精要/窗口函数/高级索引/pgvector 向量扩展（生产收藏级） | PostgreSQL | ⬜ 待写 |
| 14 | GraphQL+Apollo: Schema 设计/Resolver/DataLoader N+1/Server 实战（生产收藏级） | GraphQL | ⬜ 待写 |
| 15 | Node.js 工程化: 测试/Docker/PM2/Cluster/worker_threads/消息队列/安全（生产收藏级） | 工程化 | ⬜ 待写 |

---

## 各篇详细大纲

### 第 01 篇：JS 异步基石: 高阶函数/发布订阅/Promise/函数柯里化深度拆解（面试收藏级）

**副标题**：函数是一等公民的设计哲学、EventEmitter 发布订阅内核、Promise/A+ 规范与链式调用原理、柯里化与函数组合

#### 一、使用与实践

**高阶函数**：
- `Array.prototype.map/filter/reduce` 作为高阶函数的典型：`patients.filter(p => p.age > 60).map(p => p.name)` 筛选老年患者姓名
- 函数作为参数（回调）与函数作为返回值（装饰/柯里化）两种模式
- `once`/`memoize`/`throttle`/`debounce` 工具函数实战：医嘱提交按钮防重复点击、患者搜索框防抖

**发布订阅**：
- Node.js 内置 `EventEmitter`：`emitter.on`/`emit`/`off`/`once` 基本用法
- 自定义事件总线：医院系统"检验报告完成"事件驱动多个订阅方（HIS 系统、短信通知服务、统计报表）解耦
- 发布订阅 vs 观察者模式：核心区别在于是否存在"事件中心"这一层解耦——观察者模式是目标对象直接维护观察者列表并主动通知，发布订阅通过独立的事件中心转发，发布者和订阅者互不知道对方存在

**Promise**：
- `new Promise((resolve, reject) => {...})` 包装处方审核这类异步结果
- `.then(onFulfilled, onRejected)`/`.catch()`/`.finally()` 链式调用与错误穿透规则
- `Promise.all`/`Promise.race`/`Promise.allSettled`/`Promise.any` 四种聚合模式的适用场景对比
- 并发控制：批量拉取药品说明书详情时用简单的"分批 + Promise.all"或计数器限制最大并发数

**函数柯里化**：
- `curry(fn)` 典型场景：参数复用与延迟执行，如 `const checkAdult = curry(validateAge)(18)`
- `compose`/`pipe` 函数组合：把"校验 → 格式化 → 落库"多个单一职责函数串成处理管道

#### 二、设计与原理

- 高阶函数的本质：JS 中函数是一等公民（first-class citizen），可以像值一样被传递、赋值、作为返回值，这是函数式编程范式在 JS 里落地的基础
- 发布订阅的内核实现思路：用 `Map<eventName, Set<listener>>`（或对象+数组）维护"事件名 → 监听器集合"的映射；`emit` 遍历对应事件名下的监听器集合依次同步调用；`once` 的实现技巧是包一层"调用后立刻从集合中移除自身"的包装函数，而不是在 `emit` 内部特殊判断
- Promise/A+ 规范的三条核心约束：① 状态机只有 pending/fulfilled/rejected 三态，且落定后不可逆转（这保证了"结果一旦确定就不会被后续代码意外改变"）；② 每次 `.then` 调用都返回一个**新的** Promise 对象（这是链式调用能够进行下去的关键，不是原 Promise 被复用）；③ `onFulfilled`/`onRejected` 必须以微任务方式异步执行，即使 Promise 已经落定，也不能同步调用回调（避免"有时同步有时异步"的不确定行为）
- Promise 链式调用的值传递机制：每个 `.then` 内部创建的新 Promise，会根据 `onFulfilled` 的返回值来决定自己的状态——如果返回普通值，新 Promise 直接以该值 `resolve`；如果返回的是另一个 Promise（或 thenable），则需要等待这个返回的 Promise 落定后再把结果透传下去，这也是"Promise 可以扁平化嵌套异步"的原理
- 柯里化原理：本质是用闭包保存"已经收集到的参数"，每次调用返回一个新函数继续收集参数，直到收集到的参数数量达到原函数的形参个数（`fn.length`）才真正执行原函数
- 对比前端框架：Vue 的响应式系统底层也用了发布订阅思想（`dep.notify()` 遍历 `subs` 通知订阅者），和 `EventEmitter` 的设计内核是同一套模式，只是 Vue 把"订阅"这个动作做成了自动依赖收集，而 `EventEmitter` 需要手动 `on`

#### 三、源码解析（重点代码，来源 GitHub 仓库）

1. Node.js `EventEmitter` 实现：`lib/events.js`（nodejs/node 仓库）— `_events` 内部存储结构，`emit` 对监听器数组的遍历调用，`on`/`once` 的包装逻辑
2. V8 的 Promise 微任务调度：`PromiseReactionJob` 进入 `MicrotaskQueue`，理解"当前同步代码跑完 → 清空微任务队列 → 才进入下一个宏任务"这个时序
3. `Promise.all` 参考实现思路：用一个计数器统计已完成的 Promise 数量，用结果数组的下标写入（而非 push）来保证结果顺序与传入顺序一致，不受实际完成顺序影响

#### 四、手写实现（新建仓库起点，medai-node-source monorepo）

1. 搭建 `packages/event-emitter`：手写 `EventEmitter` 完整实现（`on`/`off`/`emit`/`once`），验证同一事件多个监听器都能被触发、`once` 触发后自动解绑
2. 搭建 `packages/promise-polyfill`：手写符合 Promise/A+ 规范的 Promise（三态状态机、微任务调度用 `queueMicrotask`、链式 `.then` 返回新 Promise、`Promise.all`/`race`/`allSettled` 静态方法），用官方 [Promise/A+ 测试套件](https://github.com/promises-aplus/promises-tests) 跑通验证
3. 搭建 `packages/fp-utils`：手写 `curry`、`compose`/`pipe`，用"处方单校验管道"场景演示

#### 五、手写实现源码 GitHub 地址
（新建仓库，待补充地址）

#### 六、参考
- https://nodejs.org/api/events.html
- https://promisesaplus.com/
- https://github.com/promises-aplus/promises-tests

**面试核心问**：
- 高阶函数和普通函数的本质区别是什么？JS 里"函数是一等公民"具体指什么？
- 发布订阅模式和观察者模式的区别是什么？
- Promise 的状态机为什么设计成不可逆？如果状态可以来回变化会有什么问题？
- `.then` 每次调用都返回新 Promise 意味着什么？如果返回的是同一个 Promise 会怎样？
- `Promise.all` 中只要有一个 reject 整体会怎样？`allSettled` 和 `all` 分别适用什么场景？
- 手写 `curry(fn)`，解释它是怎么利用闭包收集参数、怎么判断参数收集完毕的？

---

### 第 02 篇：JS 调度引擎: Generator/async-await 与 EventLoop 浏览器/Node 差异全解（面试收藏级）

**副标题**：Generator 惰性求值与协程雏形、async/await 是 Generator+Promise 的语法糖、浏览器与 Node.js 事件循环阶段差异

#### 一、使用与实践

- `function* gen() { yield ...; }`：Generator 函数的基本语法，`gen().next()` 手动驱动执行、双向通信（`next(value)` 向生成器内部传值）
- Generator 实现简易迭代器：遍历处方单里的药品列表
- `async function` / `await`：把异步流程写成"看起来同步"的代码，请求患者信息 → 请求处方记录 → 请求检验报告的串行链路
- `for await...of` 遍历异步迭代器
- Node.js 中常见的宏任务/微任务实战：`setImmediate` vs `setTimeout(fn, 0)` 的执行顺序差异；`process.nextTick` 的插队特性

#### 二、设计与原理

- Generator 的本质：函数执行权可以被"挂起并归还调用者"，再由调用者决定何时"归还执行权继续执行"——这是 JS 里最接近协程（coroutine）概念的语言特性，`yield` 挂起、`next()` 恢复
- `async/await` 是 Generator + Promise 自动执行器的语法糖：`async function` 可以等价理解为一个自动依次调用 `next()`、并在每次 `yield` 一个 Promise 时等待其落定后再继续驱动的封装（历史上 co 库、koa 早期版本就是用这种"Generator 自动执行器"手动实现的，`async/await` 是这一模式被语言原生化）
- **浏览器事件循环**：一个宏任务执行完毕后清空当前微任务队列，再进行一次渲染（如果需要），然后取下一个宏任务；常见宏任务来源：`setTimeout`、UI 事件、`postMessage`
- **Node.js 事件循环（libuv）**：由多个明确划分的阶段（phase）构成一个循环——`timers`（`setTimeout`/`setInterval` 到期回调）→ `pending callbacks` → `idle/prepare` → `poll`（处理 I/O 事件，最核心的阶段）→ `check`（`setImmediate` 回调）→ `close callbacks`；每个阶段执行完毕后，都会清空一次微任务队列（`process.nextTick` 队列 + Promise 微任务队列），而不是像浏览器一样只在一个宏任务结束后清空一次
- **`process.nextTick` 与 Promise 微任务的优先级差异**（重点，常考细节）：`process.nextTick` 的回调队列优先级高于 Promise 微任务队列——每次清空微任务时，会先把 `nextTick` 队列全部执行完（包括执行过程中新增的 `nextTick`），再执行 Promise 微任务队列
- **`setTimeout(fn, 0)` 与 `setImmediate` 的执行顺序**：在 `main` 模块顶层（不在任何 I/O 回调内）执行时，两者顺序不确定（受进程启动开销影响）；但如果放在一个 I/O 回调（如 `fs.readFile` 的回调）内部，`setImmediate` 一定先于 `setTimeout(fn, 0)` 执行，因为 I/O 回调发生在 `poll` 阶段，`poll` 阶段结束后立即进入 `check` 阶段（`setImmediate` 所在阶段），而 `timers` 阶段要等到下一轮循环才会被检查
- 对比前端（浏览器）：同样一段"事件循环阶段划分"的知识点，浏览器规范里没有 `setImmediate`、没有独立的 `poll` 阶段概念，这是 Node.js 基于 libuv 实现、专门为处理大量 I/O 设计的产物；理解这个差异是"前端转 Node.js"最容易踩坑的点之一

#### 三、源码解析（重点代码，来源 GitHub 仓库）

1. libuv 事件循环主体：`libuv` 仓库 `src/unix/core.c` — `uv_run` 函数中各阶段（timers/pending/idle/poll/check/close）的调用顺序
2. Node.js `process.nextTick` 队列实现：`lib/internal/process/task_queues.js`（nodejs/node 仓库）— `nextTick` 队列与微任务队列的执行时机划分
3. V8 Generator 底层：Generator 函数被编译为一个可以在多个"入口点"之间保存/恢复执行上下文的状态机（概念级介绍，不深入 V8 字节码）

#### 四、手写实现（延续 `medai-node-source` monorepo）

1. 搭建 `packages/async-utils`：手写一个"Generator 自动执行器"（`function co(genFn) {...}`），自动驱动 `next()`，遇到 Promise 就等待其落定后继续——用这个自制的 `co` 函数跑通一段异步流程，直观感受 `async/await` 语法糖背后到底做了什么
2. 用 `packages/event-loop-lab` 写几个实验脚本：验证 `process.nextTick` 优先于 Promise 微任务；验证 I/O 回调内 `setImmediate` 先于 `setTimeout(fn,0)`；用 `console.log` + 时间戳输出实际执行顺序作为证据

#### 五、手写实现源码 GitHub 地址
（新建仓库，待补充地址）

#### 六、参考
- https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/
- https://github.com/libuv/libuv
- https://github.com/tj/co

**面试核心问**：
- Generator 和普通函数的本质区别是什么？`yield` 具体做了什么？
- `async/await` 底层可以理解成什么？为什么说它是 Generator + Promise 的语法糖？
- Node.js 事件循环分几个阶段？每个阶段大致处理什么？
- `process.nextTick` 和 Promise 微任务谁的优先级更高？
- 在 `fs.readFile` 回调里同时写 `setTimeout(fn,0)` 和 `setImmediate(fn)`，谁先执行，为什么？
- 浏览器事件循环和 Node.js 事件循环最本质的差异是什么？

---

### 第 03 篇：Node.js 运行时内核: V8+libuv 架构/CommonJS 加载机制/ESM 深度拆解（面试收藏级）

**副标题**：V8+libuv 双引擎架构、CommonJS 模块加载机制、ESM 三阶段加载与 CJS 互操作、模块解析算法与幽灵依赖成因

> 与已发布《JS 有几种模块化规范》（`docs/articles/03 module/2026-08-01-js-module-systems.md`）的分工：那篇讲的是 IIFE/AMD/CMD/UMD/ESM 等**语言规范层面**的演进对比与 Tree Shaking 原理，本篇不再重复这部分内容，只讲 Node.js **运行时**具体怎么加载、解析、缓存模块——即"规范之上，Node.js 是怎么实现的"

#### 一、使用与实践

- `package.json` 里 `"type": "module"` 对模块解析规则的影响，`.mjs`/`.cjs` 双扩展名并存策略
- Node.js 全局对象：`process`、`__dirname`/`__filename`（CJS 独有）、`global`、`Buffer`
- 在 ESM 模块中获取等价的 `__dirname`：`import.meta.url` + `fileURLToPath`
- `require.cache` 查看已加载模块缓存，手动清除缓存实现"热重载"的原理性演示
- 动态 `import()` 在 CJS 文件中按需加载 ESM 模块的实际写法

#### 二、设计与原理

- Node.js 的双引擎架构：V8 负责执行 JS 代码本身（解析、编译、GC），libuv 负责跨平台的异步 I/O、事件循环、线程池——Node.js 是"V8 + libuv + 一层 C++ 绑定"组成的运行时，JS 代码本身不具备任何 I/O 能力，全部依赖 libuv 提供的异步接口
- **CommonJS 模块加载机制**：`require` 是同步的——Node.js 在遇到 `require` 时会立即读取目标文件内容、编译执行，并缓存到 `require.cache`（以绝对路径为 key），后续对同一模块的 `require` 直接返回缓存的 `module.exports`，不会重新执行；模块包装：Node.js 会把每个 CJS 文件包装成一个函数 `function(exports, require, module, __filename, __dirname) { ...文件内容... }` 再执行，这解释了为什么 CJS 文件里能直接用这几个"看起来像全局变量"的标识符
- **循环依赖问题**：CJS 遇到循环 `require` 时，后加载的模块拿到的是"当前已执行部分"的 `exports`（可能是不完整的），这是"运行时求值 + 提前缓存占位"机制的直接后果
- **ESM 模块机制**：`import`/`export` 是静态的、编译期可分析的（这也是"tree-shaking"能够实现的基础），Node.js 对 ESM 的加载分为"解析（parse）→ 实例化（instantiate，建立模块间的绑定关系）→ 求值（evaluate）"三个阶段，和 CJS "读取即执行"的同步模型完全不同
- **ESM 与 CJS 互操作规则**：ESM 可以 `import` CJS 模块（CJS 的 `module.exports` 会被当作默认导出）；但 CJS 不能直接 `require` 一个 ESM 模块（同步的 `require` 无法等待 ESM 异步的实例化过程），只能用动态 `import()`（返回 Promise）
- 模块解析算法：Node.js 按"核心模块 → 相对/绝对路径 → `node_modules` 逐级向上查找"的顺序解析裸模块名（bare specifier），这是"幽灵依赖"问题的成因——`node_modules` 逐级查找机制让一个包可能访问到并非自己直接声明依赖的其他包
- 对比前端打包工具：Webpack/Vite 在打包阶段模拟了一套自己的模块解析和加载逻辑（不直接依赖 Node.js 运行时的 `require` 实现），但解析算法的思路（裸模块名 → `node_modules` 查找）与 Node.js 保持了兼容，这是前端生态"约定俗成"的一部分

#### 三、源码解析（重点代码，来源 GitHub 仓库）

1. CJS 模块包装与加载：`lib/internal/modules/cjs/loader.js`（nodejs/node 仓库）— `Module.prototype._compile`、`Module._cache`、`Module._resolveFilename` 路径解析算法
2. ESM 加载器：`lib/internal/modules/esm/loader.js` — 解析/实例化/求值三阶段的实现入口
3. libuv 线程池与异步 I/O 的 C++ 绑定：概览级介绍 `deps/uv` 目录结构和 `lib/internal/bootstrap` 中 JS 层如何调用底层绑定

#### 四、手写实现（延续 `medai-node-source` monorepo）

1. 搭建 `packages/mini-require`：手写一个简化版 `require` 实现——读取文件、用 `vm` 模块或 `new Function` 包装执行、维护自己的模块缓存 Map，验证"同一模块二次 require 不会重新执行"与"循环依赖时后加载方拿到不完整 exports"两个现象
2. 写一组对照 demo：同一份逻辑分别用 CJS 和 ESM 实现一次循环依赖场景，观察两者行为差异

#### 五、手写实现源码 GitHub 地址
（新建仓库，待补充地址）

#### 六、参考
- https://nodejs.org/api/modules.html
- https://nodejs.org/api/esm.html
- https://github.com/nodejs/node

**面试核心问**：
- Node.js 的运行时架构是怎样的？V8 和 libuv 分别负责什么？
- `require` 的模块缓存机制是怎样的？为什么二次 `require` 同一个模块不会重新执行代码？
- CJS 遇到循环依赖会发生什么？和 ESM 处理循环依赖的方式有什么不同？
- ESM 为什么不能被 CJS 用 `require` 直接引入，只能用动态 `import()`？
- 什么是"幽灵依赖"？它是怎么由 Node.js 的模块解析算法导致的？

---

### 第 04 篇：Node.js I/O 体系: Buffer/Stream/path/fs 全解析与背压机制（面试收藏级）

**副标题**：Buffer 二进制数据处理、Stream 四种类型与管道、fs 同步异步 API、背压（backpressure）机制原理

#### 一、使用与实践

- `Buffer.from()`/`Buffer.alloc()`：处理二进制数据（如医学影像文件的字节流）
- `fs.readFile`/`fs.writeFile`（异步回调/Promise 版本 `fs.promises`）与 `fs.readFileSync`/`fs.writeFileSync`（同步阻塞）的选择场景
- `fs.createReadStream`/`fs.createWriteStream`：大文件（如患者体检报告 PDF）读写不占用大量内存
- `stream.pipe()`：把读取流、转换流（如 gzip 压缩）、写入流串联起来
- `path.join`/`path.resolve`/`path.extname` 等跨平台路径处理
- **静态资源服务器最小实现**（前置知识，落地本篇 fs/stream/path 三者的综合练习）：按请求路径读取对应文件、根据扩展名映射 `Content-Type`、用 `fs.createReadStream` + `pipe` 返回文件内容而不是一次性 `readFile` 进内存——用医院 HIS 系统"药品说明书 PDF/图片"静态资源场景演示

#### 二、设计与原理

- Buffer 的本质：Node.js 里表示固定长度二进制数据的类型，底层基于 V8 的 `ArrayBuffer` 分配在堆外内存（不占用 V8 堆内存限制），这是 Node.js 处理大量二进制数据（网络包、文件）时性能和内存表现更好的原因
- **Stream 四种基本类型**：Readable（可读，如 `fs.createReadStream`）、Writable（可写，如 `fs.createWriteStream`）、Duplex（可读可写，如 TCP socket）、Transform（可读可写且对数据做转换，如 `zlib.createGzip()`）
- **`pipe` 的本质**：把一个 Readable 的 `data` 事件与目标 Writable 的 `write` 方法连接起来，自动处理"读多写少"时的流量控制，避免内存爆炸——这引出下面的背压机制
- **背压（backpressure）机制**（重点）：当 Writable 端的写入速度跟不上 Readable 端的读取/产出速度时，如果不加控制，未写完的数据会不断在内存里堆积（比如从磁盘读一个大文件、通过慢速网络写出去）；Node.js 的解决方式是 `writable.write()` 返回布尔值——如果内部缓冲区超过 `highWaterMark` 阈值会返回 `false`，`pipe()` 内部监听到这个信号后会调用 `readable.pause()` 暂停读取，等 Writable 触发 `drain` 事件（表示缓冲区已经消化到可以继续写入）后再 `resume()` 恢复读取——这是一套完全自动化的"流量控制"，手写 `pipe` 时必须正确实现这套暂停/恢复逻辑才能称得上正确
- **`highWaterMark`**：控制内部缓冲区的"高水位线"，是背压机制触发的阈值参数，而不是流的最大容量硬限制
- fs 同步 API 阻塞事件循环的代价：`fs.readFileSync` 会阻塞整个 Node.js 主线程直到读取完成，这期间无法处理任何其他请求——生产环境的 HTTP 服务器代码中几乎不应该出现同步 fs 调用（除了启动阶段读取配置文件等一次性场景）
- 对比前端：浏览器的 `ReadableStream`/`WritableStream`（Web Streams API）在设计理念上与 Node.js Stream 高度相似（都要解决"大数据分块处理+流量控制"问题），Node.js 18+ 也在逐步兼容 Web Streams API，两套体系正在收敛

#### 三、源码解析（重点代码，来源 GitHub 仓库）

1. Buffer 与堆外内存分配：`lib/buffer.js`（nodejs/node 仓库）概览级介绍 `Buffer.allocUnsafe` 与 `Buffer.alloc` 的差异（是否清零初始化）
2. Readable Stream 内部缓冲与状态机：`lib/internal/streams/readable.js` — `_readableState` 中 `highWaterMark`、`buffer` 的维护
3. `pipe` 实现核心：`lib/internal/streams/readable.js` — `Readable.prototype.pipe` 中对 `write` 返回值的判断、`pause`/`resume`/`drain` 事件的绑定逻辑

#### 四、手写实现（延续 `medai-node-source` monorepo）

1. 搭建 `packages/mini-stream`：手写一个简化版 Readable + Writable + 手写 `pipe` 函数，正确实现背压（监听 `write` 返回值、`drain` 事件驱动暂停/恢复），用"生成 10 万行模拟患者数据 → 写入慢速目标（如加了 `setTimeout` 模拟延迟的 Writable）"验证内存占用不会无限增长
2. 用 `packages/mini-stream` 额外实现一个 Transform 流（如"逐行转大写"）串进管道验证三段式管道正常工作
3. 搭建 `packages/mini-static-server`：手写一个基于原生 `http`/`fs`/`path` 的静态资源服务器——① 路径安全校验（对请求路径做 `path.normalize` 后校验是否逃出根目录，防止 `../` 目录穿越）；② 按扩展名映射 `Content-Type`（`.pdf`/`.png`/`.js`/`.css` 等常见类型的映射表）；③ 用 `fs.createReadStream` + `pipe` 返回文件内容，避免大文件一次性读入内存；④ 可选支持 `Range` 请求头做断点续传（解析 `bytes=start-end`，返回 `206 Partial Content` 与 `Content-Range` 响应头，配合 `fs.createReadStream(path, { start, end })` 只读取指定字节区间）；⑤ 正确设置 `ETag`/`Cache-Control` 响应头（协议原理见《网络原理》系列第 07 篇，本篇只讲怎么在 Node.js 里落地）。用"药品说明书 PDF/图片"静态资源场景验证

#### 五、手写实现源码 GitHub 地址
（新建仓库，待补充地址）

#### 六、参考
- https://nodejs.org/api/stream.html
- https://nodejs.org/api/buffer.html
- https://nodejs.org/api/fs.html

**面试核心问**：
- Buffer 和普通数组有什么区别？为什么 Node.js 处理二进制数据要用 Buffer 而不是普通数组？
- Stream 有哪几种类型？分别对应什么场景？
- 什么是背压？如果没有背压控制会出现什么问题？
- `pipe()` 内部是怎么实现背压的？`highWaterMark` 具体控制什么？
- 什么场景下应该用同步 fs API，什么场景绝对不能用？
- 手写一个静态资源服务器，怎么防止目录穿越攻击（请求 `../../etc/passwd` 这类路径）？
- `Range` 请求断点续传涉及哪些请求头/响应头？服务端该怎么处理？

---

### 第 05 篇：Node.js 核心 API 大全: process/crypto/net/os/worker_threads 深度拆解（面试收藏级）

**副标题**：进程信息与信号处理、加密哈希与签名、TCP/UDP 原生编程、多线程 worker_threads 与 cluster 多进程对比

> 与《网络原理》系列的分工：本篇不讲协议原理（HTTP/TLS/WebSocket 帧格式等见 `docs/plans/network-principles-series-outline.md`），只讲"怎么用 Node.js 的核心模块实现具体能力"

#### 一、使用与实践

- `process.argv`/`process.env`/`process.exit()`/`process.on('SIGTERM', ...)` 优雅退出信号处理
- `crypto.createHash('sha256')` 生成患者数据哈希、`crypto.randomBytes()` 生成安全随机数（如会话 ID）
- `net.createServer()`/`net.connect()`：TCP 层原生编程，衔接《网络原理》系列 TCP 篇的协议知识
- `os.cpus()`/`os.totalmem()`：获取运行环境信息，作为 `cluster`/`worker_threads` 按核数扩展的依据
- `url.parse()`/`new URL()`、`querystring` 处理请求参数
- `child_process.spawn()`/`exec()`：调用外部命令（如医学影像格式转换工具）
- `worker_threads` 基本用法：`new Worker(filename)`，`parentPort.postMessage()` 主线程与工作线程通信

#### 二、设计与原理

- **`crypto` 模块的哈希与签名**：`createHash` 用于生成不可逆的摘要（如数据完整性校验），`createHmac` 在哈希基础上加入密钥防止篡改（呼应第 06 篇 JWT 签名的底层实现），`randomBytes` 基于操作系统提供的密码学安全随机数源（而不是 `Math.random()`，后者不适合任何安全相关场景）
- **`net` 模块与协议分层的关系**：`net.Socket` 是 Node.js 对 TCP 连接的直接封装，`http`/`https`/`ws` 等更高层模块都构建在 `net`（或 `tls`）之上——理解这一层是理解"Node.js 怎么把 TCP 字节流一步步包装成 HTTP 语义"的关键入口
- **`worker_threads` 与 `cluster` 的本质区别**（重点）：`cluster` 是多进程模型，每个子进程有独立的内存空间和事件循环，适合"多个独立处理 HTTP 请求的副本"这种场景，进程间通信开销大（需要序列化）；`worker_threads` 是同一进程内的多线程，线程间可以通过 `SharedArrayBuffer` 共享内存（不需要序列化拷贝），适合"一次性 CPU 密集计算"场景（如医学影像的像素级处理、大批量数据的哈希计算）——两者不是竞争关系，`cluster` 解决"扩展请求处理吞吐量"，`worker_threads` 解决"不阻塞事件循环的重计算"
- **为什么 CPU 密集任务必须用 `worker_threads` 而不是直接算**：Node.js 主线程的事件循环是单线程的，任何同步的重计算（如未优化的大数据排序、复杂加密运算）都会阻塞事件循环，导致所有其他请求在计算完成前无法被处理——`worker_threads` 把这类计算移到独立线程执行，主线程事件循环不受影响，计算结果通过消息传递机制返回
- **`child_process` 与 `worker_threads` 的选择**：`child_process` 启动的是完全独立的操作系统进程（可以是非 Node.js 程序，如调用 `ffmpeg`），隔离性最强但开销最大；`worker_threads` 是进程内的线程，仅限执行 JS/Node.js 代码，开销远小于 `child_process`——需要调用外部程序用 `child_process`，需要并行计算 JS 逻辑用 `worker_threads`
- **`url`/`querystring` 的历史演进**：早期 `url.parse()` 返回的对象结构和现代 WHATWG 标准的 `URL` 类不完全一致（`URL` 类是浏览器标准 API 在 Node.js 里的实现，行为跨环境一致），新代码应优先使用 `new URL()` 而不是遗留的 `url.parse()`
- 对比前端：`URL` 类在浏览器和 Node.js 中是同一套 WHATWG 标准实现，这是少数"前端 API 可以直接搬进 Node.js 代码"的例子；`worker_threads` 的 `SharedArrayBuffer` 共享内存模型与浏览器 Web Worker 的设计思路同源，都是"避免消息传递序列化开销"的解决方案

#### 三、源码解析（重点代码，来源 GitHub 仓库）

1. `crypto` 模块对 OpenSSL 的绑定：`lib/crypto.js`（nodejs/node 仓库）概览级介绍 `Hash`/`Hmac` 类如何调用底层 OpenSSL 绑定
2. `worker_threads` 实现：`lib/internal/worker.js` — `Worker` 类的消息通道（`MessagePort`）与线程生命周期管理
3. `cluster` 模块连接分发：`lib/internal/cluster/primary.js` — 主进程 `fork` 工作进程与 round-robin 分发策略

#### 四、手写实现（延续 `medai-node-source` monorepo）

1. 搭建 `packages/mini-ws`：不依赖 `ws` 库，用 Node.js 原生 `http` + `crypto` 模块手写一个最简 WebSocket 服务端（`Sec-WebSocket-Accept` 计算、帧编解码），协议细节参照《网络原理》系列第 05 篇，本篇只关注"怎么用 Node.js API 实现"
2. 用 `worker_threads` 实现一个 CPU 密集任务示例（如计算一批模拟药品数据的哈希摘要），对比"主线程同步计算导致事件循环阻塞"和"丢给 worker_threads 计算"两种方式下，主线程能否继续响应其他请求

#### 五、手写实现源码 GitHub 地址
（新建仓库，待补充地址）

#### 六、参考
- https://nodejs.org/api/process.html
- https://nodejs.org/api/crypto.html
- https://nodejs.org/api/worker_threads.html
- https://nodejs.org/api/net.html

**面试核心问**：
- `worker_threads` 和 `cluster` 的本质区别是什么？分别解决什么问题？
- 为什么 CPU 密集型计算不能直接在主线程做，必须用 `worker_threads`？
- `child_process` 和 `worker_threads` 应该怎么选？
- `crypto.randomBytes()` 和 `Math.random()` 有什么区别？为什么安全场景不能用后者？
- `net` 模块和 `http` 模块是什么关系？

---

### 第 06 篇：Web 认证体系: Cookie/Session/JWT/OAuth2 设计原理与安全实践（面试收藏级）

**副标题**：Cookie 属性与安全标记、Session 服务端状态存储、JWT 无状态令牌与签名验证、OAuth2 四种授权模式

#### 一、使用与实践

- `Set-Cookie` 响应头与 `document.cookie`：`HttpOnly`/`Secure`/`SameSite` 三个安全相关属性的实际效果
- Express/Koa 中间件设置 Session：`express-session` + Redis 存储会话数据
- JWT 结构：`header.payload.signature` 三段式，`jwt.sign()`/`jwt.verify()` 基本用法，医生登录后签发带角色信息的 token
- 前端请求携带认证信息的两种主流方式：Cookie 自动携带 vs `Authorization: Bearer <token>` 手动携带
- OAuth2 第三方登录接入的基本流程（如微信/GitHub 登录）

#### 二、设计与原理

- **Cookie 的安全属性**：`HttpOnly` 禁止 JS 通过 `document.cookie` 读取，防范 XSS 窃取会话凭证；`Secure` 要求只能通过 HTTPS 传输；`SameSite=Strict/Lax/None` 控制跨站请求时是否携带 Cookie，是防范 CSRF 的关键机制之一（`Lax` 是现代浏览器默认值）
- **Session 的本质**：服务端维护一个"会话 ID → 用户状态"的存储（内存/Redis/数据库），只把这个会话 ID 通过 Cookie 下发给客户端，客户端每次请求带上会话 ID，服务端据此查找完整状态——这是"有状态"认证方案，扩缩容时需要考虑会话存储的共享（多实例部署时不能用进程内存存储 Session，必须用 Redis 等外部存储）
- **JWT 的本质**：把用户身份信息本身编码进令牌（payload 部分是 base64url 编码的 JSON，不是加密，任何人都能解码看到内容），用签名（HMAC 或 RSA/ECDSA）保证内容没有被篡改——服务端验证时只需要用密钥重新计算签名并比对，不需要查询任何存储，这是"无状态"认证方案的核心优势（适合分布式/微服务场景，任意节点都能独立验证）
- **JWT 的安全注意点**：payload 不加密，绝对不能放密码等敏感信息；`exp` 过期时间字段必须设置，否则令牌一旦泄露永久有效；JWT 一旦签发很难主动失效（不像 Session 可以直接从存储里删除），常见解决方案是配合一个短期 access token + 长期 refresh token 的双令牌机制，或维护一个"黑名单"存储已注销的 token
- **Session vs JWT 的选型权衡**：Session 天然支持"服务端主动使某个会话失效"（删存储记录即可），JWT 天然支持无状态水平扩展但撤销机制复杂；单体应用/需要即时踢人下线的场景更适合 Session，微服务/多端多域场景更适合 JWT
- **OAuth2 四种授权模式**：授权码模式（Authorization Code，最常见，用于有后端的 Web 应用，通过一次性授权码换取 token，token 不经过浏览器地址栏暴露）、隐式模式（Implicit，纯前端应用直接从重定向 URL 拿 token，已被认为不够安全逐渐弃用）、密码模式（Resource Owner Password Credentials，用户把账号密码直接交给第三方应用，只在高度信任场景使用）、客户端模式（Client Credentials，机器间调用，无用户参与）——理解"OAuth2 解决的是‘第三方应用代表用户访问资源’的授权问题，而不是身份认证协议本身"这个常见误解（OpenID Connect 才是建立在 OAuth2 之上的身份认证层）
- 对比前端：CSRF 防御在前端视角常见的还有"双重 Cookie 验证"和自定义请求头方案，这些都是在 `SameSite` 属性普及之前的历史防御手段，理解其演进有助于理解现代安全实践为什么逐渐收敛到 `SameSite` + `HttpOnly` 组合

#### 三、源码解析（重点代码，来源 GitHub 仓库）

1. `express-session` 中间件实现：`expressjs/session` 仓库 — Session 的创建、Cookie 签发、`store.get`/`store.set` 存储接口抽象
2. JWT 签名与验证：`auth0/node-jsonwebtoken` 仓库 — `sign`/`verify` 中 HMAC/RSA 签名算法的调用与 `exp` 过期校验逻辑
3. OAuth2 授权码流程参考实现：`simov/grant` 或 Passport.js 的 `passport-oauth2` 策略 — 授权码换取 access token 的完整请求链路

#### 四、手写实现（延续 `medai-node-source` monorepo）

1. 搭建 `packages/mini-session`：手写一个基于内存 Map 的 Session 中间件（生成会话 ID、设置 Cookie、请求时查找会话状态），再替换为 Redis 存储版本对比两者在多实例部署下的行为差异
2. 搭建 `packages/mini-jwt`：手写 JWT 的签发与验证（HMAC-SHA256 签名，base64url 编解码，`exp` 校验），不依赖第三方库，验证篡改 payload 后签名校验会失败

#### 五、手写实现源码 GitHub 地址
（新建仓库，待补充地址）

#### 六、参考
- https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Cookies
- https://jwt.io/
- https://oauth.net/2/

**面试核心问**：
- `HttpOnly`、`Secure`、`SameSite` 三个 Cookie 属性分别防范什么风险？
- Session 和 JWT 的本质区别是什么？各自的优劣和适用场景？
- JWT 的 payload 是加密的吗？可以放哪些信息，不能放哪些？
- JWT 令牌泄露后要怎么让它失效？为什么这比 Session 复杂？
- OAuth2 的授权码模式解决了什么问题？为什么比隐式模式更安全？
- OAuth2 和 OpenID Connect 的关系是什么？

---

### 第 07 篇：Express 深度: 路由/中间件链/错误处理源码解析与手写核心（面试收藏级）

**副标题**：中间件洋葱模型雏形、路由匹配算法、错误处理中间件的四参数约定、Express 与 Connect 的历史关系

#### 一、使用与实践

- `app.use(middleware)`/`app.get/post/put/delete(path, handler)` 基本用法
- 中间件的 `(req, res, next)` 签名与 `next()` 的调用时机
- 路由参数 `req.params`、查询字符串 `req.query`、请求体 `req.body`（需配合 `express.json()` 中间件解析）
- 错误处理中间件：四参数签名 `(err, req, res, next)`，必须放在所有路由之后注册
- `express.Router()` 拆分子路由模块，医院系统按"患者模块/处方模块/检验模块"拆分路由文件

#### 二、设计与原理

- **中间件链的本质**：Express 内部维护一个中间件数组，每个请求进来时按注册顺序依次调用，`next()` 是"归还控制权、继续调用数组中下一个中间件"的信号——不调用 `next()` 请求就会挂起（除非中间件自己调用了 `res.end()` 结束响应）
- 中间件执行顺序是**单向线性**的（不同于 Koa 的洋葱模型双向穿透，见第 09 篇对比）：Express 中间件"先做的事情"和"后做的事情"通常需要拆成两个独立注册的中间件，而不能像 Koa 那样在一个中间件函数里用 `await next()` 前后包裹逻辑
- **路由匹配算法**：Express 底层依赖 `path-to-regexp` 库把路由字符串（如 `/patients/:id`）编译成正则表达式，请求到来时按注册顺序逐个尝试匹配，第一个匹配成功的路由处理函数生效（如果调用了 `next()` 则继续向后匹配，这是实现"多个处理函数共享同一路径"的机制）
- **错误处理的特殊约定**：Express 通过判断中间件函数的参数个数是否为 4 来识别"错误处理中间件"（`err, req, res, next`），在普通中间件里调用 `next(err)`（传入一个参数）会跳过所有普通中间件，直接跳转到最近的错误处理中间件——这是一个基于函数签名反射的隐式约定，不是显式的 API 声明
- Express 与 Connect 的历史关系：Express 早期版本直接构建在 Connect 中间件框架之上，现代 Express（4.x+）已经不再直接依赖 Connect，但中间件的设计理念（`(req,res,next)` 签名）是从 Connect 继承下来的
- 对比 Koa（承接第 09 篇）：Express 的 `req`/`res` 是对 Node.js 原生 `http.IncomingMessage`/`http.ServerResponse` 的直接扩展（挂载了额外方法和属性），Koa 则用 `ctx.request`/`ctx.response` 包了一层新的抽象对象——这个设计差异直接影响了两者中间件的编写风格

#### 三、源码解析（重点代码，来源 GitHub 仓库）

1. 中间件注册与执行：`expressjs/express` 仓库 `lib/router/index.js` — `Router.prototype.use`、`Router.prototype.handle` 中间件数组的遍历调用（`layer.handle_request`）
2. 路由匹配：`lib/router/layer.js` — 结合 `path-to-regexp` 把路径字符串编译为正则并匹配
3. 错误处理中间件识别：`lib/router/route.js` — 通过 `fn.length === 4` 判断是否为错误处理中间件

#### 四、手写实现（延续 `medai-node-source` monorepo）

搭建 `packages/mini-express`：基于 Node.js 原生 `http` 模块，手写一个精简版 Express——实现 `use`/`get`/`post` 等方法注册中间件与路由、手写线性中间件执行器（维护索引 + `next` 函数递归调用下一个）、实现基于 `fn.length === 4` 识别错误处理中间件的机制、实现简化版路径匹配（支持 `:id` 动态参数）。用"患者列表增删查"路由验证整条链路。

#### 五、手写实现源码 GitHub 地址
（新建仓库，待补充地址）

#### 六、参考
- https://expressjs.com/
- https://github.com/expressjs/express
- https://github.com/pillarjs/path-to-regexp

**面试核心问**：
- Express 中间件的执行模型是怎样的？`next()` 具体做了什么？
- 为什么 Express 里"前置逻辑"和"后置逻辑"不能像 Koa 一样写在同一个中间件函数里？
- Express 是怎么识别一个中间件是"错误处理中间件"的？
- 在普通中间件里调用 `next(err)` 会发生什么？
- Express 的路由匹配是怎么工作的？如果多个路由匹配同一个路径会怎样？

---

### 第 08 篇：Koa 深度: 洋葱模型/compose 原理/对比 Express/手写实现（面试收藏级）

**副标题**：洋葱模型的双向穿透、`koa-compose` 的递归实现、`ctx` 上下文对象设计、async/await 原生适配

#### 一、使用与实践

- `const app = new Koa()`，`app.use(async (ctx, next) => {...})` 中间件签名
- `ctx.request`/`ctx.response`/`ctx.body`/`ctx.status` 统一上下文对象
- `await next()` 前后分别编写"进入时逻辑"和"离开时逻辑"（如记录请求耗时：`next()` 前记录开始时间，`next()` 后计算耗时）
- `koa-router` 拆分路由（Koa 核心本身不内置路由功能，这是与 Express 的一个显著差异）
- 错误处理：`try/catch` 包裹 `await next()`，或监听 `app.on('error', ...)`

#### 二、设计与原理

- **洋葱模型**（重点）：Koa 中间件按注册顺序"层层深入再层层返回"——第一个中间件的 `next()` 之前的代码最先执行，`await next()` 会一直深入调用后续所有中间件直到最内层，然后按相反顺序依次"返回"执行每个中间件 `next()` 之后的代码；这让"环绕型逻辑"（如日志计时、异常捕获）可以写在同一个函数体内的前后两部分，不需要像 Express 那样拆成独立的两个中间件
- **`koa-compose` 的实现原理**：把中间件数组 `[fn1, fn2, fn3]` 通过递归组合成一个统一的 `dispatch` 函数——`dispatch(0)` 调用 `fn1(ctx, () => dispatch(1))`，`fn1` 内部 `await next()` 实质上就是 `await dispatch(1)`，从而形成层层嵌套的 Promise 链；这个递归组合函数本身很短（十几行代码），但是理解 Koa 整个执行模型的钥匙
- **为什么洋葱模型天然适配 `async/await`**：每个中间件都是 `async` 函数，`next()` 返回一个 Promise（代表"后续所有中间件执行完毕"），`await next()` 会等待这个 Promise 落定——这意味着如果后续中间件抛出异常，会以 Promise reject 的形式一路传播回来，被最外层中间件的 `try/catch` 捕获，这是 Koa "错误处理可以统一在最外层一个 `try/catch` 里完成"的原理
- **`ctx` 上下文对象设计**：Koa 把 `request`/`response` 封装进统一的 `ctx`，并用 `delegates` 库把常用属性（如 `ctx.body` 实际代理到 `ctx.response.body`）代理到 `ctx` 顶层，减少书写层级；这是相比 Express 直接扩展原生 `req`/`res` 的另一种设计取舍——多一层抽象带来了更统一的 API，但也意味着不能直接把 Node.js 原生 HTTP 中间件生态直接套用到 Koa
- Koa 不内置路由和请求体解析等功能（这些在 Express 里是内置或近乎标配的），倾向于"核心极简 + 按需插件"的设计哲学，这是 Koa 相比 Express "更小的核心，更多的自由"的定位差异
- 对比 Express（承接第 08 篇）：同样是中间件模式，Express 是"线性数组遍历"，Koa 是"递归函数组合形成的调用链"，前者更接近传统 Node.js 回调风格，后者是为 `async/await` 时代重新设计的模型

#### 三、源码解析（重点代码，来源 GitHub 仓库）

1. `koa-compose` 完整实现：`koajs/compose` 仓库 `index.js` — 递归 `dispatch` 函数（源码本身很短，是精读重点）
2. Koa 核心应用类：`koajs/koa` 仓库 `lib/application.js` — `Application.prototype.use`/`callback`/`handleRequest`
3. `ctx` 上下文对象与属性代理：`koajs/koa` 仓库 `lib/context.js` — `delegate(proto, 'response').method('...')` 代理机制

#### 四、手写实现（延续 `medai-node-source` monorepo）

搭建 `packages/mini-koa`：手写 `compose` 函数（递归组合中间件数组为一条调用链），手写极简 `ctx` 对象（封装 `req`/`res` 并代理常用属性），基于 Node.js 原生 `http` 模块搭建应用类。用"记录请求耗时的日志中间件 + 全局错误捕获中间件"验证洋葱模型的双向穿透效果（在控制台打印中间件"进入"和"离开"的顺序日志，直观验证执行顺序）。

#### 五、手写实现源码 GitHub 地址
（新建仓库，待补充地址）

#### 六、参考
- https://koajs.com/
- https://github.com/koajs/koa
- https://github.com/koajs/compose

**面试核心问**：
- 什么是洋葱模型？它和 Express 的线性中间件模型本质区别是什么？
- `koa-compose` 是怎么用递归把中间件数组组合成一条调用链的？
- 为什么洋葱模型天然适合用 `try/catch` 在最外层统一处理错误？
- Koa 的 `ctx` 对象和 Express 的 `req`/`res` 在设计上有什么不同？
- 如果要在 Koa 中间件里做"记录请求耗时"，应该怎么写？为什么这样写在 Express 里不能直接照搬？

---

### 第 09 篇：NestJS+TypeScript: IoC/DI/装饰器元编程/模块化企业级架构（生产收藏级）

**副标题**：控制反转与依赖注入容器、装饰器元数据反射、Module/Controller/Provider 三层架构、与 Express/Koa 底层适配层关系

#### 一、使用与实践

- `nest new` 生成项目骨架，`@Module()`/`@Controller()`/`@Injectable()` 三个核心装饰器
- 依赖注入基本用法：`constructor(private readonly patientService: PatientService)` 自动注入服务实例
- `@Get()`/`@Post()`/`@Param()`/`@Body()` 路由与参数装饰器
- 管道（Pipe）做参数校验：配合 `class-validator` 对请求体做 DTO 校验
- 拦截器（Interceptor）、守卫（Guard）、异常过滤器（Exception Filter）四类"横切关注点"扩展点
- NestJS 底层可切换 Express 或 Fastify 作为 HTTP 适配层

#### 二、设计与原理

- **控制反转（IoC）与依赖注入（DI）**：传统写法里一个类要用到另一个类的实例，需要自己 `new` 出来（控制权在自己手里）；IoC 把"创建依赖实例"的控制权交给一个外部容器，类只需要声明"我需要什么"（通过构造函数参数类型），容器负责在运行时把对应实例"注入"进来——这降低了类之间的耦合度，也让单元测试时替换 mock 依赖变得容易（不需要改动被测试类的代码）
- **NestJS 的 DI 容器实现依赖 TypeScript 的装饰器元数据反射**：`@Injectable()` 装饰器配合 `reflect-metadata` 库，在类定义时把构造函数参数的类型信息记录到元数据里（`emitDecoratorMetadata` 编译选项开启后，TypeScript 编译器会自动生成这些类型元数据）；NestJS 启动时扫描所有 `@Module` 声明的 `providers`，构建一张"类 → 实例"的映射表（IoC 容器），实例化某个类时读取其构造函数参数的元数据，递归解析并注入对应依赖的实例
- **单例作用域（默认）**：NestJS 默认每个 Provider 在整个应用中只实例化一次（单例），除非显式声明为 `REQUEST` 作用域（每次请求创建新实例）——理解默认作用域对于"服务里能不能存实例级可变状态"这个问题至关重要（默认单例意味着不能把请求相关的可变状态存在服务实例的字段上）
- **模块化架构**：`Module` 是组织代码的基本单元，声明该模块包含哪些 `Controller`（处理请求）、`Provider`（业务逻辑与可注入服务）、`imports`（依赖其他模块导出的 Provider）、`exports`（暴露给其他模块使用的 Provider）——这套显式声明的边界，相比 Express/Koa"自由组织文件"的方式，更适合大型团队协作的企业级项目
- **横切关注点的四个扩展点及执行顺序**：Guard（路由处理前，决定是否有权限继续）→ Interceptor 的前置逻辑 → Pipe（参数转换与校验）→ 路由处理函数本身 → Interceptor 的后置逻辑（可以修改返回值）→ Exception Filter（只在抛出异常时介入，捕获并格式化错误响应）
- **与 Express/Koa 的关系**：NestJS 本身不是一个从零实现的 HTTP 框架，而是在 Express（默认）或 Fastify 之上构建的一层架构框架——`@nestjs/platform-express` 适配层负责把 NestJS 的路由/中间件概念转换成对应底层框架的实际调用，这也是为什么 NestJS 里仍然能使用原生 Express 中间件
- 对比前端框架的依赖注入：Angular 的 DI 系统和 NestJS 高度同源（NestJS 的架构设计明确借鉴了 Angular），两者都用装饰器 + 元数据反射实现依赖注入，这是"NestJS 对前端 Angular 背景开发者更友好"的原因

#### 三、源码解析（重点代码，来源 GitHub 仓库）

1. IoC 容器与依赖解析：`nestjs/nest` 仓库 `packages/core/injector/injector.ts` — `Injector.resolveComponentInstance` 递归解析构造函数依赖
2. 装饰器元数据定义：`packages/common/decorators/core/injectable.decorator.ts`、`packages/common/decorators/core/component.decorator.ts` — `Reflect.defineMetadata` 的调用
3. Express 适配层：`packages/platform-express/adapters/express-adapter.ts` — NestJS 路由注册如何转换为 `app.get/post` 调用
4. 拦截器与异常过滤器执行链：`packages/core/interceptors/interceptors-consumer.ts`、`packages/core/exceptions/exceptions-handler.ts`

#### 四、手写实现（延续 `medai-node-source` monorepo）

搭建 `packages/mini-nest`：用 TypeScript + `reflect-metadata` 手写一个简化版 IoC 容器——实现 `@Injectable()`/`@Controller()` 装饰器（记录元数据），实现一个 `Container` 类扫描并递归实例化所有 Provider（解析构造函数参数类型完成自动注入），实现一个极简的路由装饰器（`@Get(path)`）配合 Node.js 原生 `http` 模块把请求分发到对应控制器方法。用"患者模块（PatientController 注入 PatientService）"验证依赖自动注入链路正确工作。

#### 五、手写实现源码 GitHub 地址
（新建仓库，待补充地址）

#### 六、参考
- https://docs.nestjs.com/
- https://github.com/nestjs/nest
- https://www.typescriptlang.org/docs/handbook/decorators.html

**面试核心问**：
- 什么是控制反转和依赖注入？它们解决了什么问题？
- NestJS 的依赖注入是怎么依赖 TypeScript 装饰器和元数据反射实现的？
- NestJS 里 Provider 的默认作用域是什么？这对"能不能在服务里存状态"有什么影响？
- Guard、Interceptor、Pipe、Exception Filter 各自的职责和执行顺序是什么？
- NestJS 和 Express 是什么关系？NestJS 是重新造了一个 HTTP 框架吗？

---

### 第 10 篇：MySQL 全栈: 事务/索引原理/慢查询优化/数据库设计范式（面试收藏级）

**副标题**：InnoDB 存储引擎、事务四大特性与隔离级别、B+ 树索引原理、执行计划与慢查询优化、三大范式与反范式设计

#### 一、使用与实践

- 基本 CRUD：`SELECT`/`INSERT`/`UPDATE`/`DELETE`，`JOIN` 多表查询（患者表 + 处方表关联查询）
- 事务基本用法：`BEGIN`/`COMMIT`/`ROLLBACK`，Node.js 中用 `mysql2` 或 ORM（如 Drizzle/Prisma）执行事务
- 索引基本操作：`CREATE INDEX`，`EXPLAIN` 查看查询是否走索引
- 常见约束：主键、唯一索引、外键（及生产环境中"是否该用外键"的实践争议）
- 分页查询的常见写法与深分页性能问题（`LIMIT 100000, 20` 效率低下的现象）

#### 二、设计与原理

- **事务四大特性（ACID）**：原子性（Atomicity，事务内操作全部成功或全部回滚）、一致性（Consistency，事务前后数据满足业务约束）、隔离性（Isolation，并发事务互不干扰，程度可配置）、持久性（Durability，提交后数据永久保存，即使宕机也不丢失，依赖 WAL 日志机制）
- **四种隔离级别与并发问题**：读未提交（Read Uncommitted，会脏读）、读已提交（Read Committed，避免脏读但会不可重复读）、可重复读（Repeatable Read，MySQL InnoDB 默认级别，避免不可重复读，通过 MVCC 实现，但理论上仍可能幻读，InnoDB 用间隙锁/Next-Key Lock 进一步避免了大部分幻读场景）、串行化（Serializable，完全串行执行，性能最差）
- **MVCC（多版本并发控制）**：InnoDB 通过给每行数据维护隐藏的版本号和回滚指针，让不同事务在同一时刻能看到"属于自己事务版本"的数据快照，从而实现"读不阻塞写、写不阻塞读"，这是可重复读隔离级别在不牺牲太多并发性能的前提下避免脏读/不可重复读的关键机制
- **B+ 树索引原理**（重点）：InnoDB 用 B+ 树组织索引数据——非叶子节点只存储键值和指向下层节点的指针（不存整行数据），叶子节点才存储完整数据（聚簇索引）或主键值（二级索引），这种结构让索引树的高度即使在数据量很大时也能保持很低（通常 3-4 层），一次查询的磁盘 I/O 次数被限制在树的高度以内；B+ 树相比 B 树的优势是叶子节点之间用链表相连，对范围查询（`BETWEEN`/`ORDER BY`）更友好
- **聚簇索引与二级索引**：InnoDB 的主键索引是聚簇索引（数据行本身就按主键顺序物理存储在叶子节点里），非主键索引（二级索引）的叶子节点存储的是主键值，查到后需要"回表"再查一次聚簇索引才能拿到完整行数据——这解释了"覆盖索引"（查询字段刚好都在二级索引里，不需要回表）为什么能显著提升查询性能
- **最左前缀原则**：联合索引 `(a, b, c)` 只有查询条件从最左列 `a` 开始连续匹配才能用上索引（如 `WHERE a=1 AND b=2` 能用上，`WHERE b=2` 单独查不能用上这个联合索引），这是 B+ 树按"先比较 a，再比较 b，再比较 c"的顺序组织数据的直接结果
- **执行计划与慢查询优化方法论**：用 `EXPLAIN` 观察 `type`（访问类型，`const`>`ref`>`range`>`index`>`ALL`，`ALL` 意味着全表扫描）、`key`（实际使用的索引）、`rows`（预估扫描行数）；慢查询优化的一般思路是先用慢查询日志定位问题 SQL，再用 `EXPLAIN` 分析是否缺少索引/索引未生效（常见未生效场景：索引列上使用函数、隐式类型转换、`LIKE '%xxx'` 前缀模糊匹配）
- **三大范式与反范式设计权衡**：第一范式（字段原子性）、第二范式（消除部分依赖）、第三范式（消除传递依赖）是"减少数据冗余、保证更新一致性"的设计目标；但严格范式化会导致查询时需要更多 `JOIN`，高并发读场景下常常故意反范式化（如在订单表里冗余存储商品名称快照），用"空间换时间、一致性维护成本换查询性能"
- 对比前端认知：索引的作用类似前端"给数组建立一个哈希表/Map 加速查找"的直觉，但 B+ 树索引额外解决了"范围查询"和"排序"的效率问题，这是纯哈希结构做不到的，这个对比有助于理解为什么数据库不是简单用哈希表做索引

#### 三、源码解析（重点代码，来源 GitHub 仓库）

1. InnoDB B+ 树索引结构：`mysql/mysql-server` 仓库 `storage/innobase/btr/`（概览级介绍页结构与树的分裂合并逻辑，不深入 C++ 实现细节）
2. MVCC 版本链实现：`storage/innobase/trx/trx0trx.cc`、`row/row0vers.cc`（概览级介绍隐藏字段 `DB_TRX_ID`/`DB_ROLL_PTR` 与回滚段）
3. 查询优化器与执行计划生成：`sql/opt_range.cc`（概览级介绍 `EXPLAIN` 输出背后的成本估算逻辑）

#### 四、手写实现（延续 `medai-node-source` monorepo）

搭建 `packages/mini-bplustree`：用 TypeScript 手写一个简化版内存 B+ 树（支持插入、按键查找、范围查询），用"10 万条模拟处方记录按处方 ID 查找"对比"线性数组查找"和"B+ 树查找"的性能差异（用 `console.time` 简单测量），直观感受索引带来的复杂度优化（从 O(n) 到 O(log n)）。

#### 五、手写实现源码 GitHub 地址
（新建仓库，待补充地址）

#### 六、参考
- https://dev.mysql.com/doc/refman/8.0/en/
- https://github.com/mysql/mysql-server
- https://use-the-index-luke.com/

**面试核心问**：
- MySQL 的四种事务隔离级别分别解决什么并发问题？InnoDB 默认是哪个级别？
- MVCC 是怎么实现"读不阻塞写"的？
- 为什么 B+ 树比 B 树更适合做数据库索引？
- 什么是聚簇索引和二级索引？为什么二级索引查询有时需要"回表"？
- 什么是最左前缀原则？联合索引 `(a,b,c)` 在哪些查询条件下能生效，哪些不能？
- 拿到一条慢查询，你的排查思路是什么？

---

### 第 11 篇：MongoDB 深度: 文档模型/聚合管道/索引策略/Mongoose ODM 原理（面试收藏级）

**副标题**：文档模型与 Schema-less 设计、聚合管道多阶段处理、复合索引与覆盖查询、Mongoose 中间件与虚拟字段

#### 一、使用与实践

- 基本 CRUD：`insertOne`/`find`/`updateOne`/`deleteOne`，查询操作符 `$gt`/`$in`/`$regex`
- 聚合管道基本用法：`$match`/`$group`/`$sort`/`$project` 组合统计"各科室处方数量"
- 索引创建：`createIndex({ field: 1 })`，复合索引与排序方向
- Mongoose 基本用法：`Schema` 定义、`Model` 创建、`populate()` 关联查询（模拟关系型 JOIN 效果）
- 事务支持：MongoDB 4.0+ 多文档事务的使用场景（跨集合更新患者与处方状态时保证一致性）

#### 二、设计与原理

- **文档模型与 Schema-less 的设计取舍**：MongoDB 以 BSON 文档（类似 JSON）为存储单位，同一集合内的文档结构可以不同——这带来了"字段灵活演进不需要停机迁移"的优势（比如给部分患者记录新增字段不需要改动全表结构），代价是缺少数据库层面的结构约束，数据一致性的责任转移到应用层（或用 Mongoose Schema 在应用层做校验）
- **何时选择文档模型而非关系型**：数据本身具有明显的"层级嵌套"结构且经常整体读取（如一份完整病历包含多次就诊记录、每次就诊包含多项检验结果，用嵌套文档一次查询就能拿到完整数据，避免关系型下的多表 JOIN）；反之如果数据需要频繁做跨实体的复杂关联查询和强一致性事务，关系型数据库仍然更合适
- **聚合管道（Aggregation Pipeline）的设计思想**：把复杂的数据处理拆解成多个顺序执行的"阶段"（stage），每个阶段接收上一阶段的输出作为输入（类似函数式编程里的管道/pipe 思想）——`$match` 过滤 → `$group` 分组统计 → `$sort` 排序 → `$project` 投影裁剪字段，这种设计让复杂统计查询可以像搭积木一样组合，且 MongoDB 查询优化器可以对某些阶段（如尽早执行的 `$match`）做下推优化
- **索引原理**：MongoDB 默认索引结构同样是 B 树（不是 B+树，但设计目标类似），复合索引同样遵循类似"最左前缀"的规则；`explain()` 可以查看查询是否命中索引（`IXSCAN` vs 全表扫描 `COLLSCAN`）
- **覆盖查询（Covered Query）**：如果查询涉及的字段和返回的字段都恰好被索引覆盖，MongoDB 不需要读取实际文档就能返回结果，性能显著优于常规索引查询——这个概念和 MySQL 的覆盖索引本质相同
- **Mongoose 的中间件（钩子）机制**：`pre`/`post` 钩子可以在 `save`/`remove`/`find` 等操作前后插入自定义逻辑（如保存前自动计算某个衍生字段），本质上是给 Mongoose 内部的操作生命周期提供了"发布订阅"式的扩展点（与第 01 篇发布订阅原理呼应）
- **虚拟字段（virtual）**：不持久化存储、只在读取时通过 getter 动态计算的字段（如根据出生日期字段动态计算患者年龄），避免了"冗余存储衍生数据导致的更新一致性问题"
- 对比 MySQL（承接第 11 篇）：MongoDB 的聚合管道和 SQL 的 `GROUP BY`/子查询在能力上有大量重叠，但表达方式从"声明式的一整条 SQL"变成"显式的多阶段管道"，这种差异本质上是"关系代数思维"和"数据流管道思维"两种查询范式的差异

#### 三、源码解析（重点代码，来源 GitHub 仓库）

1. 聚合管道执行引擎：`mongodb/mongo` 仓库 `src/mongo/db/pipeline/`（概览级介绍各 `DocumentSource` 阶段如何串联执行）
2. 索引 B 树实现：`src/mongo/db/storage/wiredtiger/`（概览级介绍 WiredTiger 存储引擎的索引组织方式）
3. Mongoose 中间件钩子实现：`Automattic/mongoose` 仓库 `lib/helpers/query/applyQueryMiddleware.js`、`lib/document.js` 中 `pre`/`post` 钩子的注册与触发逻辑

#### 四、手写实现（延续 `medai-node-source` monorepo）

搭建 `packages/mini-aggregation`：用 TypeScript 对一个内存 JSON 数组（模拟处方记录集合）手写实现简化版聚合管道——`match`/`group`/`sort`/`project` 四个阶段函数，支持用数组方式串联多个阶段（`pipeline([match(...), group(...), sort(...)])`），验证管道式处理和一次性写复杂逻辑相比的可读性/可组合性差异。

#### 五、手写实现源码 GitHub 地址
（新建仓库，待补充地址）

#### 六、参考
- https://www.mongodb.com/docs/manual/
- https://mongoosejs.com/
- https://github.com/Automattic/mongoose

**面试核心问**：
- 什么场景适合用 MongoDB 的文档模型，什么场景更适合关系型数据库？
- 聚合管道的设计思想是什么？和 SQL 的 `GROUP BY` 相比表达方式有什么不同？
- 什么是覆盖查询？它是怎么提升查询性能的？
- Mongoose 的 `pre`/`post` 钩子是怎么实现的？和发布订阅模式有什么共通之处？
- MongoDB 4.0+ 支持多文档事务后，是不是就可以完全替代关系型数据库了？为什么？

---

### 第 12 篇：Redis 深度: 五大数据结构/持久化/缓存策略/分布式锁/接口限流/淘汰策略（面试收藏级）

**副标题**：五大数据结构底层编码、RDB/AOF 持久化机制、缓存穿透击穿雪崩、SETNX 分布式锁、LRU/LFU 淘汰算法

#### 一、使用与实践

- 五大基础数据结构：String（`SET`/`GET`）、Hash（`HSET`/`HGETALL`，存储患者档案的多个字段）、List（`LPUSH`/`RPOP`，实现简单消息队列）、Set（`SADD`/`SINTER`，标签系统）、Sorted Set（`ZADD`/`ZRANGE`，医生接诊排队优先级）
- 过期时间：`EXPIRE`/`TTL`，缓存患者基本信息设置合理 TTL
- Node.js 中用 `ioredis`/`node-redis` 客户端操作 Redis
- `MULTI`/`EXEC` 事务命令，`WATCH` 实现乐观锁
- Pub/Sub 基本用法：Redis 内置的发布订阅命令（对比第 01 篇 EventEmitter 的进程内发布订阅，Redis Pub/Sub 是跨进程/跨服务的）
- 接口限流基本用法：用 `INCR` + `EXPIRE` 实现最简单的固定窗口计数限流，保护医院 HIS 系统"处方提交"接口不被恶意刷单

#### 二、设计与原理

- **五大数据结构的底层编码**：Redis 对外暴露的是"逻辑数据结构"，底层根据数据量大小/元素类型动态选择更省内存的编码实现——如 Hash 在字段数量少且值都较短时用 `listpack`（早期版本叫 `ziplist`，紧凑的线性内存布局），字段增多后转换为哈希表；List 同样在小规模时用 `listpack`，大规模时转换为 `quicklist`（双向链表，每个节点是一个小的 `listpack`）；这种"小规模用紧凑编码省内存，大规模切换为标准结构保证操作效率"的动态编码策略贯穿多个数据类型
- **RDB 与 AOF 持久化机制对比**：RDB 是某一时刻内存数据的完整快照（`bgsave` 用 `fork` 子进程 + 写时复制避免阻塞主进程），恢复速度快但两次快照之间的数据变更会丢失；AOF 是持续追加写命令日志（可配置 `always`/`everysec`/`no` 三种刷盘策略权衡持久性和性能），数据丢失窗口更小但文件体积增长快、恢复速度较慢（需要重放全部命令，通过 AOF 重写压缩冗余命令缓解）；生产环境常见"RDB + AOF 混合持久化"策略兼顾恢复速度和数据安全性
- **缓存穿透/击穿/雪崩三种典型问题及应对**：穿透（查询一个数据库里也不存在的 key，缓存永远不会命中，每次都打到数据库，常见对策是缓存空值或用布隆过滤器提前拦截）；击穿（某个热点 key 恰好过期的瞬间，大量并发请求同时穿透到数据库，常见对策是用互斥锁只让一个请求去重建缓存，或热点数据设置永不过期由后台异步更新）；雪崩（大量 key 在同一时刻集中过期，或 Redis 实例本身宕机，导致请求大规模打到数据库，常见对策是给过期时间加随机抖动、构建 Redis 高可用集群）
- **分布式锁的实现与陷阱**：最基本方式 `SET key value NX EX seconds` 保证"设置成功即获得锁"且带自动过期防止死锁；进阶问题——① 锁被别的客户端误删（需要在 value 里存入唯一标识，释放锁时先校验标识再删除，用 Lua 脚本保证"校验+删除"的原子性）；② 业务执行时间超过锁的过期时间导致锁提前释放（可用 Redisson 等客户端库的"看门狗"机制自动续期）；③ 单实例 Redis 宕机导致锁失效（Redlock 算法尝试在多个独立 Redis 实例上加锁，多数成功才算加锁成功，但该算法本身在学术界有争议，工程上需要权衡引入的复杂度）
- **淘汰策略**：当内存达到 `maxmemory` 限制时，Redis 按配置的淘汰策略清理数据——LRU（最近最少使用，近似算法，Redis 用随机采样一批 key 比较访问时间戳而非维护全局精确链表以节省内存开销）、LFU（最不经常使用，基于访问频率的对数计数器实现，更适合"历史上访问很多但最近没访问"和"刚访问一次"两种 key 的合理区分）、`noeviction`（默认策略，内存满后拒绝写入）——理解"近似 LRU"和教科书里链表实现的精确 LRU 的差异是一个常见的源码级考点
- **接口限流算法**（重点，补充章节）：固定窗口计数（`INCR`+`EXPIRE`）实现简单但存在"窗口边界突刺"问题（两个相邻窗口交界处瞬间流量可能达到限制的两倍）；滑动窗口（用 Sorted Set 以时间戳为 score 记录每次请求，每次请求先移除窗口外的旧记录再统计窗口内数量）能更平滑地限制速率但内存开销更大；**令牌桶算法**（以固定速率往桶里放令牌，桶满则丢弃多余令牌，请求需要拿到令牌才能通过，天然支持"允许短时突发流量"）与**漏桶算法**（请求先进队列，以固定速率处理，队列满则拒绝，输出速率恒定不允许突发）——令牌桶允许突发、漏桶强制平滑，这是两者选型的核心差异；生产环境常用 Lua 脚本把"读取令牌数量→计算是否放行→更新令牌数量"这一整套逻辑封装成原子操作，避免并发场景下的竞态条件
- 对比前端：浏览器缓存（HTTP 缓存/localStorage）解决的是"减少重复网络请求"，Redis 解决的是"减少重复数据库查询压力"，两者思路相似（用更快的存储层挡在慢速层前面），但 Redis 在分布式场景下承担的一致性、并发控制职责远比浏览器缓存复杂

#### 三、源码解析（重点代码，来源 GitHub 仓库）

1. Hash 编码转换逻辑：`redis/redis` 仓库 `src/t_hash.c` — `listpack` 与哈希表之间的转换阈值判断（`hash-max-listpack-entries` 配置项）
2. RDB 快照与写时复制：`src/rdb.c` — `rdbSaveBackground` 中 `fork` 子进程完成快照的流程
3. AOF 持久化与重写：`src/aof.c` — 命令追加写入与 `bgrewriteaof` 重写压缩逻辑
4. 近似 LRU 实现：`src/evict.c` — `performEvictions` 中随机采样比较 `lru` 字段的淘汰逻辑
5. 令牌桶限流参考实现：`redis/redis-py`（或 `rwz/redis-gcra`）仓库中基于 Lua 脚本的 GCRA（通用信元速率算法）限流实现，理解如何用一段 Lua 脚本原子化完成令牌桶的读取与更新

#### 四、手写实现（延续 `medai-node-source` monorepo）

1. 搭建 `packages/mini-lru`：手写一个近似 O(1) 的精确 LRU 缓存（`Map` 保持插入顺序 + 命中时删除重新插入到末尾模拟"最近使用"），对比"教科书精确 LRU"和 Redis"近似 LRU"在实现复杂度上的差异
2. 搭建 `packages/mini-distlock`：基于 `ioredis` 手写一个分布式锁工具函数——`SET NX EX` 加锁、Lua 脚本保证"校验唯一标识后删除"的原子释放，用两个并发的模拟请求验证互斥效果
3. 搭建 `packages/mini-ratelimit`：基于 `ioredis` 手写令牌桶限流器（Lua 脚本原子化更新令牌数量与时间戳），用连续发起的模拟请求验证"允许短时突发、超出速率后被拒绝"的效果，并对比固定窗口计数在窗口边界处的突刺问题

#### 五、手写实现源码 GitHub 地址
（新建仓库，待补充地址）

#### 六、参考
- https://redis.io/docs/latest/
- https://github.com/redis/redis
- https://redis.io/docs/latest/develop/use/patterns/distributed-locks/

**面试核心问**：
- Redis 的 Hash/List 等结构在数据量小和大时分别用什么底层编码？为什么要这样设计？
- RDB 和 AOF 各自的优缺点是什么？生产环境一般怎么组合使用？
- 缓存穿透、击穿、雪崩三者的区别是什么？分别怎么应对？
- 用 `SET key value NX EX` 实现分布式锁，有哪些坑？怎么解决锁被误删的问题？
- Redis 的 LRU 淘汰策略是精确实现的吗？为什么这样设计？
- 令牌桶和漏桶算法的核心区别是什么？为什么令牌桶允许突发流量？
- 用 Redis 实现限流为什么要用 Lua 脚本而不是"读取-判断-写入"三步分开执行？

---

### 第 13 篇：PostgreSQL 进阶: 关系型精要/窗口函数/高级索引/pgvector 向量扩展（生产收藏级）

**副标题**：MVCC 实现差异对比 MySQL、窗口函数分析查询、GIN/GiST 索引、pgvector 向量检索与 AI 应用结合

#### 一、使用与实践

- 基础 CRUD 与 MySQL 高度相似的部分不重复展开，聚焦 PostgreSQL 特色能力
- 窗口函数：`ROW_NUMBER()`/`RANK()`/`LAG()`/`LEAD() OVER (PARTITION BY ... ORDER BY ...)`，统计每位医生"按接诊时间排序的接诊序号"
- JSONB 类型：存储非结构化的患者问诊表单数据，`->`/`->>`/`@>` 操作符查询
- 数组类型与 `ANY`/`ALL` 操作符
- `pgvector` 扩展基本用法：`CREATE EXTENSION vector`，`vector` 列类型存储 embedding，`<->`（欧氏距离）/`<#>`（负内积）/`<=>`（余弦距离）相似度查询算子

#### 二、设计与原理

- **PostgreSQL 与 MySQL 的 MVCC 实现差异**：PostgreSQL 采用"元组多版本直接存储在表里"的方式（每次 UPDATE 实际是插入一个新版本元组、旧版本标记失效，依赖 `VACUUM` 进程回收空间），而不是像 InnoDB 那样用单独的回滚段维护历史版本——这个差异导致 PostgreSQL 频繁更新的表如果不及时 `VACUUM` 会产生大量膨胀（表体积远超实际数据量），这是 PostgreSQL 运维中一个 MySQL 背景开发者容易忽视的特有问题
- **窗口函数的设计思想**：与 `GROUP BY`（分组后每组只返回一行聚合结果）不同，窗口函数"保留原始每一行"的同时，针对每一行计算一个基于其所在"窗口"（`PARTITION BY` 定义的分组 + `ORDER BY` 定义的排序）的聚合/排名结果——这是"既要明细又要聚合上下文"这类分析型查询（如"每位患者本次检验值相比上一次的变化"用 `LAG()`）无法用普通 `GROUP BY` 表达、必须用窗口函数解决的场景
- **GIN/GiST 索引**：B 树索引适合"等值/范围查询"，但不适合"某个字段包含某个元素"这类查询（如 JSONB 字段判断是否包含某个 key，或数组字段判断是否包含某个值）；GIN（Generalized Inverted Index，通用倒排索引）为这类"一对多"包含关系建立倒排索引，是 JSONB/数组/全文搜索场景的标准索引选择；GiST（Generalized Search Tree）更适合几何数据、范围类型等需要"最近邻/重叠判断"的场景
- **JSONB 与 JSON 类型的区别**：JSONB 以二进制格式存储（存储时解析、去除多余空格、键顺序可能重排），支持 GIN 索引加速查询；JSON 类型以原始文本存储（保留原始格式，但查询时需要重新解析，且不支持索引加速）——生产环境几乎总是优先选择 JSONB
- **pgvector 与向量检索原理**（重点，对齐本项目 AI 工程栈）：`pgvector` 让 PostgreSQL 具备存储高维向量（embedding）和做近似最近邻检索的能力——`<->`（L2 欧氏距离）、`<#>`（负内积，用于最大化内积检索场景）、`<=>`（余弦距离，衡量向量方向相似度，最常用于文本语义检索）三种距离算子对应不同的相似度度量方式；小数据量可以用精确的顺序扫描计算距离，数据量增大后需要建立近似索引（HNSW 或 IVFFlat）用"牺牲一定精度换取检索速度"的方式支撑大规模向量检索——这是 RAG（检索增强生成）系统里"药品说明书向量库"这类场景的数据库层实现基础
- 对比 MySQL（承接第 11 篇）：PostgreSQL 在扩展性（自定义类型、`pgvector` 这类扩展插件生态）和分析型查询能力（窗口函数、CTE 递归查询）上通常被认为比 MySQL 更强，MySQL 在简单读写为主的 Web 应用场景下运维成熟度和生态工具链更普及——这是实际选型时的核心权衡维度

#### 三、源码解析（重点代码，来源 GitHub 仓库）

1. MVCC 元组版本存储：`postgres/postgres` 仓库 `src/backend/access/heap/heapam.c`（概览级介绍 `HeapTupleHeaderData` 中 `xmin`/`xmax` 事务号字段如何标记版本可见性）
2. `VACUUM` 实现：`src/backend/commands/vacuum.c`（概览级介绍死元组回收流程）
3. `pgvector` 距离算子与索引：`pgvector/pgvector` 仓库 `src/vector.c`（距离计算函数）、`src/hnsw.c`（HNSW 近似索引构建逻辑，概览级介绍）

#### 四、手写实现（延续 `medai-node-source` monorepo）

搭建 `packages/mini-vector-search`：用 TypeScript 手写一个内存版向量检索小工具——实现余弦相似度计算函数，对一批模拟的药品说明书 embedding（可用随机向量或真实调用一次 embedding API 生成少量样本）做暴力线性扫描找最近邻，再实现一个简化版近似检索（如先用随机投影分桶再局部比较），对比两种方式在检索耗时和召回准确率上的权衡，直观理解 `pgvector` 里"精确检索 vs 近似索引"选择背后的工程考量。

#### 五、手写实现源码 GitHub 地址
（新建仓库，待补充地址）

#### 六、参考
- https://www.postgresql.org/docs/current/
- https://github.com/pgvector/pgvector
- https://github.com/postgres/postgres

**面试核心问**：
- PostgreSQL 和 MySQL 的 MVCC 实现方式有什么本质区别？为什么 PostgreSQL 需要 `VACUUM`？
- 窗口函数和 `GROUP BY` 的本质区别是什么？什么场景必须用窗口函数？
- GIN 索引适合什么场景？为什么 B 树索引不适合给 JSONB 字段的包含查询加速？
- `pgvector` 的三种距离算子分别对应什么相似度度量？RAG 系统里通常用哪种？
- 向量数据量大了之后为什么需要近似索引（HNSW/IVFFlat）而不是精确检索？代价是什么？

---

### 第 14 篇：GraphQL+Apollo: Schema 设计/Resolver/DataLoader N+1/Server 实战（生产收藏级）

**副标题**：类型系统与 Schema First 设计、Resolver 执行机制、N+1 查询问题与 DataLoader 批处理去重、对比 RESTful

#### 一、使用与实践

- Schema 定义：`type Patient { id: ID! name: String! prescriptions: [Prescription!]! }`，标量类型/对象类型/枚举/接口
- Query/Mutation/Subscription 三种操作类型：查询患者信息、新建处方（Mutation）、订阅检验报告实时更新（Subscription）
- Apollo Server 基本搭建：`ApolloServer({ typeDefs, resolvers })`
- 客户端查询实践：一次请求同时获取患者基本信息+最近三次处方（体现"按需查询，避免 RESTful 的过度获取/获取不足"）
- Apollo Client（前端）的缓存与 `useQuery`/`useMutation` hooks 基本用法

#### 二、设计与原理

- **GraphQL 与 RESTful 的本质区别**：RESTful 以"资源 URL"为组织单位，客户端拿到的字段由服务端预先决定（容易出现"过度获取"多余字段或"获取不足"需要多次请求拼数据）；GraphQL 用一个统一的 endpoint + 客户端自定义查询结构，按需精确获取字段，把"要不要多返回字段""要不要额外请求"的决定权交给客户端——这是"服务端定义能力边界（Schema），客户端决定具体取什么"的设计范式转变
- **Resolver 执行机制**：GraphQL 查询会被解析成一棵字段树，每个字段对应一个 Resolver 函数，执行时按字段树逐层调用对应 Resolver（父字段的 Resolver 返回值会作为参数传给子字段的 Resolver）——理解"一次查询会触发多少次 Resolver 调用"是排查性能问题的基础
- **N+1 查询问题**（重点）：查询"10 位患者及各自的处方列表"时，如果 `patients` 的 Resolver 查一次数据库拿到 10 位患者，每个患者的 `prescriptions` 字段 Resolver 又各自单独查一次数据库，就产生了 1 次 + 10 次共 11 次数据库查询——这是 GraphQL 灵活的字段级 Resolver 设计带来的典型副作用，字段查询越嵌套问题越严重
- **DataLoader 的批处理与去重原理**：DataLoader 把同一个事件循环 tick 内触发的多次"按 ID 查询"请求收集起来，通过 `process.nextTick`/微任务延迟到当前同步代码执行完毕后，合并成一次"批量按 ID 查询"（`WHERE id IN (...)`），同时对相同 ID 的重复请求做去重合并、并缓存本次请求周期内已经查询过的结果——这套机制巧妙利用了 Node.js 事件循环的微任务时机（与第 02 篇事件循环知识点直接呼应），把"看似分散的多次查询"收拢成一次批量查询，从根本上解决 N+1 问题
- **Schema First 设计原则**：先设计好 Schema（类型系统契约），前后端可以基于这个契约并行开发（前端用 mock resolver 或 mock server，后端逐步实现真实 Resolver），这是 GraphQL 生态里"契约先行"协作模式的基础，也是本项目 CLAUDE.md 里"集成任何后端接口前先确认接口结构"这条工程规范在 GraphQL 场景下的具体体现
- **过度获取与订阅（Subscription）的取舍**：Subscription 基于 WebSocket 实现服务端主动推送，适合"检验报告实时更新"这类需要低延迟通知的场景，但引入了额外的连接管理复杂度，不是所有实时场景都值得上 Subscription（轮询 + 短 TTL 缓存有时是更简单的替代方案）
- 对比前端数据获取范式：GraphQL 的"客户端按需声明数据形状"和 React Server Components 的"服务端组件决定数据边界"是两种不同方向的尝试解决同一个"如何精确获取渐进式所需数据"问题，值得在读完 React 18 系列第 12 篇 SSR/RSC 后做交叉对比

#### 三、源码解析（重点代码，来源 GitHub 仓库）

1. GraphQL 查询执行引擎：`graphql/graphql-js` 仓库 `src/execution/execute.ts` — `executeFields` 按字段树递归调用 Resolver 的核心逻辑
2. DataLoader 批处理实现：`graphql/dataloader` 仓库 `src/index.js` — `load` 方法如何用 `Promise` + 微任务延迟收集请求，`dispatchQueue` 合并批处理调用
3. Apollo Server 请求处理管道：`apollographql/apollo-server` 仓库概览级介绍插件化的请求生命周期钩子

#### 四、手写实现（延续 `medai-node-source` monorepo）

1. 搭建 `packages/mini-graphql-server`：用 Node.js 原生 `http` 手写一个极简 GraphQL 执行器——解析一个简化的查询语法（不用完整 GraphQL 语法解析器，用简化的 JSON 结构模拟字段树），按字段树递归调用注册的 Resolver 函数
2. 搭建 `packages/mini-dataloader`：手写一个简化版 DataLoader——`load(id)` 收集请求到队列，用 `process.nextTick` 延迟到当前 tick 结束后合并成一次 `batchLoadFn` 调用，并对相同 ID 去重。用"查询 10 位患者的处方列表"场景对比"每次单独查询"和"接入 mini-dataloader 后批量查询"的实际数据库调用次数

#### 五、手写实现源码 GitHub 地址
（新建仓库，待补充地址）

#### 六、参考
- https://graphql.org/
- https://www.apollographql.com/docs/
- https://github.com/graphql/dataloader

**面试核心问**：
- GraphQL 相比 RESTful 解决了什么核心问题？分别对应"过度获取"和"获取不足"的哪种场景？
- 什么是 N+1 查询问题？它是怎么在 GraphQL 的 Resolver 模型下产生的？
- DataLoader 是怎么利用 Node.js 事件循环的微任务机制实现批处理的？
- Schema First 的协作模式相比传统前后端接口对接方式有什么优势？
- GraphQL Subscription 是怎么实现服务端推送的？什么场景不值得引入 Subscription？

---

### 第 15 篇：Node.js 工程化: 测试/Docker/PM2/Cluster/worker_threads/消息队列/安全实践（生产收藏级）

**副标题**：单元测试与集成测试分层、多阶段构建镜像、cluster 多进程与 worker_threads 分工、消息队列任务解耦、安全实践与内存泄漏排查方法论

#### 一、使用与实践

- 测试体系：Jest/Vitest 单元测试基本写法，`supertest` 对 Express/Koa 应用做 HTTP 层集成测试（不需要真实启动监听端口）
- Mock 数据库依赖：单元测试中用内存实现或 mock 库替换真实数据库连接
- Dockerfile 基本结构：`FROM node:20-alpine`，多阶段构建（builder 阶段装依赖编译，production 阶段只拷贝构建产物，减小镜像体积）
- PM2 基本用法：`pm2 start app.js -i max`（按 CPU 核数启动多个实例），`pm2 logs`/`pm2 monit`
- Node.js 内置 `cluster` 模块手动启动多进程
- `node --inspect` 配合 Chrome DevTools 做 CPU Profile 和堆内存快照分析
- 消息队列基础：用 `amqplib` 连接 RabbitMQ 发布/消费一条"AI 推理任务"消息，理解队列如何解耦"提交任务"和"处理任务"两个环节
- Node 安全实践：`helmet` 中间件一键设置安全响应头，`npm audit`/`pnpm audit` 扫描依赖漏洞

#### 二、设计与原理

- **测试分层策略**：单元测试聚焦单一函数/模块的逻辑正确性（速度快、不依赖外部资源，大量覆盖边界条件）；集成测试验证多个模块协作（如一次完整的 HTTP 请求经过路由/中间件/服务层/mock 数据库）；端到端测试验证真实环境下的完整用户路径（数量最少，运行最慢，成本最高）——"测试金字塔"的比例分配（大量单元测试、少量集成测试、极少端到端测试）是保证测试体系性价比的关键
- **`supertest` 的设计思路**：不需要真正监听一个网络端口，直接把 Express/Koa 的 `app` 实例传给 `supertest`，内部对请求做进程内的模拟调用（底层仍然复用 Node.js `http` 模块的请求/响应对象，但绕开了真实的 TCP 网络层），这让集成测试可以跑得更快、不受端口占用等环境问题影响
- **Docker 多阶段构建的原理**：`builder` 阶段安装全部依赖（包括 `devDependencies`）并执行 TypeScript 编译等构建步骤，最终 `production` 阶段用一个全新的、更小的基础镜像，只 `COPY --from=builder` 编译产物和 `node_modules`（通常配合 `npm ci --omit=dev` 只装生产依赖）——这个模式把"构建时需要的重量级工具链"和"运行时实际需要的最小依赖"彻底隔离，显著减小最终镜像体积、缩小攻击面
- **单进程瓶颈与多进程扩展**：Node.js 的 JS 执行本身是单线程的，一个进程只能利用一个 CPU 核心处理 JS 计算——`cluster` 模块通过 `fork` 多个工作进程共享同一个监听端口（主进程负责接受连接后轮询分发给各工作进程，或由操作系统内核做负载均衡），让 CPU 密集型请求的处理能力随核数扩展；PM2 的 `-i max` 本质上是对 `cluster` 模块的封装 + 进程守护（自动重启崩溃的进程）+ 日志管理
- **`cluster` 与 `worker_threads` 在工程化场景下的分工**（呼应第 05 篇）：生产部署的水平扩展用 `cluster`（多进程隔离故障、独立利用多核处理并发请求）；单次请求内部如果夹带 CPU 密集计算（如批量生成报表、图像处理），应该用 `worker_threads` 把这部分计算挪出主线程，而不是指望 `cluster` 解决——`cluster` 解决"扩展吞吐量"，`worker_threads` 解决"不阻塞单个请求所在的事件循环"，两者在生产架构里通常同时存在、各管一层
- **`cluster` 模式下的状态共享问题**：多进程模式下，进程内存（如内存态的 Session 存储、内存缓存）是各进程独立的，不能假设"这次请求和上次请求会被同一个进程处理"，必须把需要跨请求共享的状态放到 Redis 等外部存储——这是从单进程开发心智切换到多进程生产部署时最容易踩的坑
- **消息队列解耦的设计思想**：把"任务提交"和"任务处理"通过一个中间队列彻底解耦——生产者只管把任务消息丢进队列就立即返回，不需要等待处理完成；消费者按自己的处理能力从队列里取任务，两者的吞吐速率不再互相绑定；这对"AI 推理"这类耗时不确定、需要排队限流的场景（如医疗 AI 问诊助手的模型推理任务）尤其重要——避免让 HTTP 请求同步等待一个可能耗时数秒的推理过程，而是先返回任务 ID，客户端轮询或通过 WebSocket 接收完成通知；消息确认机制（ACK）保证消费者处理失败时消息不会丢失，可以重新入队或进入死信队列
- **Node 安全实践的常见风险面**：SQL 注入（永远使用参数化查询/ORM 的绑定参数，不手动拼接 SQL 字符串）、依赖供应链风险（`npm audit`/`pnpm audit` 定期扫描已知漏洞的依赖版本，CI 流程中设为门禁）、缺失安全响应头（`helmet` 中间件一次性补齐 `X-Content-Type-Options`/`X-Frame-Options`/CSP 等，具体每个响应头防御的攻击类型见《网络原理》系列第 06 篇跨域与安全）——工程化视角的安全实践重点是"把这些检查自动化嵌入 CI 流程”，而不是依赖人工记忆
- **内存泄漏排查方法论**：Node.js 内存泄漏常见于全局缓存无限增长、事件监听器未正确移除（`EventEmitter` 反复 `on` 却不 `off`）、闭包意外持有大对象引用；排查思路是用 `--inspect` 配合 Chrome DevTools 的 Memory 面板做多次堆快照（heap snapshot）对比，找出"两次快照之间持续增长、且不应该增长"的对象类型，再通过 Retainer 视图追踪这些对象被谁持有导致无法被 GC 回收
- 对比前端性能排查：浏览器端排查内存泄漏（如未清理的定时器、未解绑的事件监听）和 Node.js 端排查内存泄漏在方法论上高度一致（都是"多次快照对比 + Retainer 链路追踪"），这是前端性能优化经验可以直接迁移到 Node.js 后端排障的一个典型例子

#### 三、源码解析（重点代码，来源 GitHub 仓库）

1. Node.js `cluster` 模块的进程间连接分发：`lib/internal/cluster/primary.js`（nodejs/node 仓库）— 主进程 `fork` 工作进程与 round-robin 分发策略（`SCHED_RR`）的实现
2. `supertest` 的进程内请求模拟：`ladjs/supertest` 仓库 `lib/test.js` — 如何包装 `superagent` 直接对传入的 `app` 发起进程内请求而非真实网络请求
3. `amqplib` 的消息确认机制：`amqp-node/amqplib` 仓库 — `channel.ack`/`channel.nack` 与消费者预取（prefetch）的实现
4. V8 堆快照与 Inspector 协议：概览级介绍 `node --inspect` 背后的 Chrome DevTools Protocol（CDP）通信机制，不深入 V8 内部实现

#### 四、手写实现（延续 `medai-node-source` monorepo，作为系列收尾）

1. 用 Docker 给 `medai-node-source` 系列积累的手写模块之一（如第 07 篇的 `mini-express`）搭建一个多阶段构建的 Dockerfile，对比单阶段构建和多阶段构建的最终镜像体积差异
2. 用 Node.js 原生 `cluster` 模块手写一个最小化的多进程 HTTP 服务示例，验证请求被分发到不同的工作进程（每个响应体里带上 `process.pid`，观察多次请求命中不同进程 ID）
3. 搭建 `packages/mini-task-queue`：用 RabbitMQ（或用 Redis List 简化模拟）实现一个最小化任务队列——生产者提交"模拟 AI 推理任务"立即返回任务 ID，消费者从队列取任务处理并更新任务状态，验证提交与处理解耦、消费者处理速度不影响生产者响应速度
4. 手写一个故意包含内存泄漏的示例脚本（如反复 `on` 却不 `off` 的 `EventEmitter`），用 `node --inspect` + Chrome DevTools 完整走一遍"两次堆快照对比定位泄漏对象"的排查流程，作为方法论的实操演示

#### 五、手写实现源码 GitHub 地址
（新建仓库，待补充地址）

#### 六、参考
- https://jestjs.io/
- https://docs.docker.com/build/building/multi-stage/
- https://nodejs.org/api/cluster.html
- https://pm2.keymetrics.io/
- https://www.rabbitmq.com/tutorials
- https://helmetjs.github.io/

**面试核心问**：
- 测试金字塔的分层策略是什么？为什么端到端测试的数量应该最少？
- Docker 多阶段构建解决了什么问题？为什么能显著减小最终镜像体积？
- Node.js 是单线程的，`cluster` 模块是怎么利用多核 CPU 的？
- `cluster` 和 `worker_threads` 在生产架构里分别解决什么问题？能不能互相替代？
- 多进程部署下，为什么不能用进程内存存储 Session？
- 消息队列解耦"生产任务"和"消费任务"具体解决了什么问题？消息确认机制的作用是什么？
- 排查一次 Node.js 内存泄漏，你的思路是什么？会用到哪些工具？

---

## 参考链接（每篇末尾统一引用池）

```
https://nodejs.org/
https://developer.mozilla.org/zh-CN/docs/Web/JavaScript
https://promisesaplus.com/
https://libuv.org/
https://expressjs.com/
https://koajs.com/
https://docs.nestjs.com/
https://dev.mysql.com/doc/
https://www.mongodb.com/docs/manual/
https://redis.io/docs/latest/
https://www.postgresql.org/docs/current/
https://github.com/pgvector/pgvector
https://graphql.org/
https://www.apollographql.com/docs/
https://github.com/graphql/dataloader
https://jestjs.io/
https://docs.docker.com/
https://pm2.keymetrics.io/
https://www.rabbitmq.com/tutorials
https://helmetjs.github.io/
```

- `nodejs.org`：Node.js 官方文档，覆盖第 03/04/05 篇核心模块与 API 权威参照
- `libuv.org`：事件循环底层实现参照，覆盖第 02 篇
- `expressjs.com`/`koajs.com`/`docs.nestjs.com`：三大框架官方文档，覆盖第 07/08/09 篇
- `dev.mysql.com`/`mongodb.com`/`redis.io`/`postgresql.org`：四大数据库官方文档，覆盖第 10/11/12/13 篇
- `pgvector`：向量检索扩展文档，覆盖第 13 篇 AI 关联小节
- `graphql.org`/`apollographql.com`/`graphql/dataloader`：覆盖第 14 篇
- `jestjs.io`/`docs.docker.com`/`pm2.keymetrics.io`/`rabbitmq.com`/`helmetjs.github.io`：覆盖第 15 篇工程化实践

> 网络协议原理（HTTP 演进/HTTPS/TLS/DNS/TCP/WebSocket/跨域安全/HTTP 缓存/RESTful-GraphQL 设计对比）已独立为《网络原理》系列，见 `docs/plans/network-principles-series-outline.md`，本系列不再重复列出对应 RFC/MDN 参考链接。

> 引用规范延续 React 18 / Vue 3 系列：正文中不出现具体博主名/账号名/人名，仅在文末参考池中列官方文档或权威开源仓库 URL；源码解析章节标注的路径以对应开源仓库当前主分支目录结构为准，写作时需核对当前版本号是否与文中描述一致。

---

*规划时间：2026-09-10 | 参考：Node.js 官方文档 / 各框架与数据库官方文档 / roadmap.sh Node.js 路线图理念 / React 18 系列大纲格式规范*

