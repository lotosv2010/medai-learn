# Node.js 全栈系列公众号文章大纲

> 所属系列：Node.js 全栈深度拆解
> 写作原则：第 01~10 篇统一五段式结构——使用与实践 → 设计与原理 → 工程落地参考 → 实践演示与验证 → 参考；源码/RFC 引用降级为「工程落地参考」里的轻量印证，不设独立「源码解析」段。第 11 篇（Serverless）起统一三段式结构——基本使用 → 企业最佳实践 → 注意事项，不做源码级分析与手写实现
> 目标读者：5-10 年前端或全栈经验，正在系统补齐 Node.js 后端与工程化能力，备战高级/专家岗面试或转型 AI 应用工程师的开发者

---

## 大纲修订说明（对照原始笔记目录）

原始笔记目录共 22+ 个章节（01 高阶函数 ~ 22 Redis，另加 MySQL/Mongodb/GraphQL/PostgreSQL/Apollo），存在以下问题，本次重构已修正：

### 1. 不属于 Node.js Roadmap 的章节（建议移出本系列）

- **16 链表(LinkedList)**、**17 树(Tree)**：纯数据结构与算法内容，与 Node.js 知识体系无直接关联，且与后续 `16 Nest+TS`、`17 MySQL` 编号冲突。建议移至独立的「数据结构与算法」系列，不纳入 Node.js 系列。

### 2. 编号冲突修正

- 原目录 `16` 号同时被"链表"和"Nest+TS"占用，`17` 号同时被"树"和"MySQL"占用——已将链表/树移出后消除冲突。
- 仓库内 `docs/articles/` 下 Node 文章目录原为 `00 node/`，与 `07 react/` 编号体系不连续，已重命名为 `08 node/`（衔接在 `07 react/` 之后，本系列编号为 08，详见下方第 7 点顺序调整说明）。

### 3. JS 基础章节合并

- 原目录 01~06 号（高阶函数/柯里化/发布订阅/Promise/Generator/async-await）共 6 章，均属于 JS 语言基础而非 Node.js 专项知识，本质是 Node.js 的前置能力。拆成 6 篇文章会稀释"Node.js 系列"的定位，因此合并为 **2 篇**：第 01 篇（高阶函数/发布订阅/Promise/柯里化）、第 02 篇（Generator/async-await/EventLoop）。

### 4. Roadmap 缺口补充

对照 roadmap.sh/nodejs 与业界通用后端知识体系，原目录缺少以下高频考点，本次已补齐：

- **WebSocket / 实时通信** —— 协议原理归入《网络原理》系列第 06 篇，本系列第 05 篇「Node.js 核心 API 大全」负责手写实现
- **测试体系**（Jest/Vitest/Supertest）—— 独立在第 17 篇工程化篇
- **进程管理与部署**（PM2/Cluster/worker_threads/Docker）—— 并入第 17 篇
- **消息队列基础**（RabbitMQ/Kafka 概念 + Node 消费者写法）—— 并入第 18 篇
- **接口限流**（令牌桶/漏桶 + Redis 实现）—— 并入第 14 篇 Redis
- **Node 安全实践**（SQL 注入防范/Helmet/依赖安全扫描）—— 并入第 18 篇
- **性能优化与 profiling**（内存泄漏排查/CPU Profile）—— 并入第 18 篇
- **OAuth2 授权体系** —— 并入第 06 篇认证篇，与 Cookie/Session/JWT 形成完整认证知识链

### 5. 数据库板块结构调整

原目录数据库板块（MySQL/Mongodb/GraphQL/PostgreSQL/Apollo/Redis）各拆 2-5 个子章节（如 MySQL 基础/高级/设计），信息密度不足以支撑独立成篇。已合并为"每个数据库一篇、以基本使用 + 企业最佳实践 + 注意事项三段式覆盖"的结构：MySQL、MongoDB、Redis 各一篇，PostgreSQL 因与 pgvector 向量检索关联（对齐本项目 AI 工程栈）单独一篇，GraphQL+Apollo 合并一篇。

### 6. 二次修订：查重已发布文章后的调整（本次修订）

对照 `docs/articles/03 module/` 已发布的两篇文章，发现与本大纲部分选题重叠，同时读者反馈"网络协议"篇定位模糊，本次调整：

- **删除原「05 NPM 生态」篇**：`2026-08-02-npm-yarn-pnpm-deep-dive.md` 已完整覆盖 semver/幽灵依赖/pnpm 存储机制/workspace/lock 文件，本篇无增量内容，直接删除，全系列篇数由 16 篇降为 15 篇
- **精简第 03 篇重叠内容**：`2026-08-01-js-module-systems.md` 已讲透 IIFE/AMD/CMD/UMD/ESM 的规范演进与 Tree Shaking 原理，第 03 篇改为聚焦 Node.js **运行时**如何加载/解析/缓存模块（V8+libuv 架构、CommonJS 模块包装函数、循环依赖、ESM 三阶段加载、幽灵依赖的模块解析算法成因），不重复规范对比部分，标题相应调整
- **原「06 网络协议深度」拆分迁出**：OSI/TCP-IP/HTTP 演进/TLS 握手等协议原理与具体运行时无关，属于更基础的地基知识，已整体迁移并扩展为独立的《网络原理》系列（详见 `docs/plans/network-principles-series-outline.md`，共 10 篇），不再占用 Node.js 系列篇幅
- **新增「05 Node.js 核心 API 大全」篇**：填补原 06 篇腾出的位置，聚焦 Node.js 专属的核心模块（`process`/`crypto`/`net`/`os`/`url`/`child_process`/`worker_threads`），并在手写实现中落地 WebSocket 服务端（协议原理见《网络原理》系列第 06 篇，此处只管"怎么用 Node.js 实现"）

### 7. 三次修订：系列顺序调整（本次修订）

《网络原理》系列是本系列多处引用的前置地基知识（HTTP 演进/TLS/WebSocket 帧格式/RESTful-GraphQL 设计对比）。系列编号与目录对应关系最终确认为：**Node.js 全栈系列为 08，网络原理系列为 09**，仓库内文章目录分别对应 `docs/articles/08 node/` 与 `docs/articles/09 network/`。Node.js 系列先写（第一优先），网络原理系列承接其后（第二优先）。

---

## 系列定位

**「Node.js 全栈深度拆解」系列**

- 篇数：18 篇（JS 异步基础 2 篇 + Node.js 核心 3 篇 + 网络与认证 1 篇 + Web 框架 3 篇 + BFF 聚合层 1 篇 + Serverless 1 篇 + 数据库 4 篇 + GraphQL 1 篇 + 工程化 2 篇）
- 核心主线：JS 异步体系（发布订阅/Promise/EventLoop）→ Node.js 运行时（模块系统/I/O/核心 API）→ 认证体系 → Web 框架三选一深度拆解（Express/Koa/NestJS）→ 多端 BFF 聚合层 → Serverless 部署形态 → 数据库全家桶（MySQL/MongoDB/Redis/PostgreSQL）→ API 设计范式（GraphQL）→ 工程化落地（测试/部署/性能/可观测性）
- 叙事节奏："是什么 → 怎么运作 → 怎么用 → 怎么用得高级"，不做知识点平铺罗列
- 内容结构：**第 01~10 篇统一五段式**（使用与实践 → 设计与原理 → 工程落地参考 → 实践演示与验证 → 参考），01/02/07/08 等篇在 `medai-node-source` 仓库手写核心机制；**第 11 篇（Serverless）起统一三段式**（基本使用 → 企业最佳实践 → 注意事项），不再做源码解析与手写实现，实践落地收敛到 `apps/his-api` 项目主线
- 特色：每篇 3-5 个「面试官会问」；示例统一沿用医疗场景命名（药品/处方/患者/医院管理系统 HIS）；涉及可与前端对照的知识点显式标注「对比前端」
- **项目主线**：从第 07 篇（Express 框架）起，各篇同时在 `apps/his-api` 这个持续演进的医院 HIS API 项目上叠加能力——07 篇搭 Express 骨架，08 篇迁移到 Koa 对比选型，09 篇升级到 NestJS，10 篇搭建 BFF 聚合层验证多端裁剪，11 篇用 Serverless 把 BFF 部署到云函数，12~15 篇接入 MySQL/MongoDB/Redis/PostgreSQL，16 篇叠加 GraphQL，17 篇补测试和 Docker 部署，18 篇接入消息队列和 APM。这让读者在每篇手写实现仓库 `packages/<模块>` 之外，还能看到一个真实项目从零到生产的完整演进过程，避免"各篇互相孤立"的割裂感
- 手写实现仓库：统一使用一个新建仓库（建议命名 `medai-node-source`），按篇章逐步搭建各模块的简化实现，采用 `packages/<模块名>` 的 monorepo 结构，01~10 篇各往对应 package 里增量填入实现；另设 `apps/his-api` 作为贯穿 07~18 篇的项目主线载体
- 与《网络原理》系列的分工：本系列不重复讲协议原理（HTTP 演进/TLS 握手/WebSocket 帧格式等见 `docs/plans/network-principles-series-outline.md`），只讲"Node.js 怎么基于这些协议实现具体能力"

---

## 文章规划总览

| 编号 | 标题 | 核心主题 | 状态 |
|------|------|----------|------|
| 01 | Node.js 事件驱动内核: EventEmitter 源码/Promise A+ 规范与手写/并发控制（面试收藏级） | 事件驱动 | ⬜ 待写 |
| 02 | Node.js 事件循环: 浏览器与 Node 宏任务/微任务差异全解（面试收藏级） | 事件循环 | ⬜ 待写 |
| 03 | Node.js 运行时内核: V8+libuv 架构/CommonJS 加载机制/ESM 深度拆解（面试收藏级） | Node架构 | ⬜ 待写 |
| 04 | Node.js I/O 体系: Buffer/Stream/path/fs 全解析与背压机制（面试收藏级） | I/O能力 | ⬜ 待写 |
| 05 | Node.js 核心 API 大全: process/crypto/net/os/worker_threads 深度拆解（面试收藏级） | 核心 API | ⬜ 待写 |
| 06 | Web 认证体系: Cookie/Session/JWT/OAuth2 设计原理与安全实践（面试收藏级） | 认证鉴权 | ⬜ 待写 |
| 07 | Express 深度: 路由/中间件链/错误处理源码解析与手写核心（面试收藏级） | Express | ⬜ 待写 |
| 08 | Koa 深度: 洋葱模型/compose 原理/对比 Express/手写实现（面试收藏级） | Koa | ⬜ 待写 |
| 09 | NestJS+TypeScript: IoC/DI/装饰器元编程/模块化企业级架构（生产收藏级） | NestJS | ⬜ 待写 |
| 10 | BFF 架构模式: API Gateway vs BFF/多端数据聚合与裁剪/Node.js 中间层实战（面试收藏级） | BFF | ⬜ 待写 |
| 11 | Serverless 架构: 云函数/API 网关/部署形态演进（生产收藏级） | Serverless | ⬜ 待写 |
| 12 | MySQL 全栈: 基本使用/索引与事务最佳实践/慢查询与设计范式（生产收藏级） | MySQL | ⬜ 待写 |
| 13 | MongoDB 深度: 文档模型/聚合管道/索引策略/Mongoose 最佳实践（生产收藏级） | MongoDB | ⬜ 待写 |
| 14 | Redis 深度: 五大数据结构/持久化/缓存与分布式锁最佳实践/接口限流（生产收藏级） | Redis | ⬜ 待写 |
| 15 | PostgreSQL 进阶: 窗口函数/JSONB/高级索引/pgvector 向量扩展（生产收藏级） | PostgreSQL | ⬜ 待写 |
| 16 | GraphQL+Apollo: Schema 设计/Resolver/DataLoader N+1/Server 实战（生产收藏级） | GraphQL | ⬜ 待写 |
| 17 | Node.js 测试与部署: 测试分层/supertest/Docker多阶段构建/PM2与Cluster多进程（生产收藏级） | 测试与部署 | ⬜ 待写 |
| 18 | Node.js 可观测性与安全: 消息队列解耦/安全实践/内存泄漏排查/APM 链路追踪（生产收藏级） | 可观测性/安全 | ⬜ 待写 |

---

## 各篇详细大纲

### 第 01 篇：Node.js 事件驱动内核: EventEmitter 源码/Promise A+ 规范与手写/并发控制（面试收藏级）

**副标题**：Node 视角的高阶函数/发布订阅/Promise 落地，聚焦 EventEmitter 源码、Promise/A+ 规范与手写、医疗场景并发控制

> 与已发布《JS 函数式编程完全指南》（`docs/articles/01 javascript/2026-07-28-js-functional-programming.md`）、《JS 异步编程完全指南》（`docs/articles/01 javascript/2026-07-27-js-async-evolution.md`）的查重分工：那两篇已完整覆盖高阶函数/一等公民、`once`/`memoize`/`throttle`/`debounce`、`curry`/`compose`/`pipe` 手写、纯函数/副作用、Promise 三态与演进史、发布订阅/哨兵变量。本篇**不复述这些 JS 基础概念**，正文中涉及处一律用「搜索关键词」索引到 JS 系列，只展开以下 Node 视角增量——EventEmitter 源码解析、Promise/A+ 三条规范约束与手写（过官方测试套件）、医疗场景并发控制、手写实现仓库。

#### 一、使用与实践

**发布订阅 → Node 内置 EventEmitter**：
- `emitter.on`/`emit`/`off`/`once` 基本用法
- 自定义事件总线：医院系统"检验报告完成"事件驱动多个订阅方（HIS 系统、短信通知服务、统计报表）解耦
- 发布订阅 vs 观察者模式：核心区别在于是否存在"事件中心"这一层解耦——观察者模式是目标对象直接维护观察者列表并主动通知，发布订阅通过独立的事件中心转发，发布者和订阅者互不知道对方存在

**Promise → Promise/A+ 规范与手写**：
- `new Promise((resolve, reject) => {...})` 包装处方审核这类异步结果
- `.then(onFulfilled, onRejected)`/`.catch()`/`.finally()` 链式调用与错误穿透规则
- `Promise.all`/`Promise.race`/`Promise.allSettled`/`Promise.any` 四种聚合模式的适用场景决策表

**并发控制（本篇实用增量）**：
- 批量拉取药品说明书详情时用"分批 + Promise.all"或计数器限制最大并发数
- 医嘱提交按钮防重复点击（`once` 思想）、患者搜索框防抖（`debounce`）——仅场景落地，实现索引到 JS 函数式篇

> 前置基础（已发布）：搜索关键词「JS 函数式编程 高阶函数 柯里化 函数组合」「JS 异步编程 Promise 发布订阅」——本篇只讲 Node 视角的增量落地，不重复概念讲解。

#### 二、设计与原理

- 发布订阅的内核实现思路：用 `Map<eventName, Set<listener>>`（或对象+数组）维护"事件名 → 监听器集合"的映射；`emit` 遍历对应事件名下的监听器集合依次同步调用；`once` 的实现技巧是包一层"调用后立刻从集合中移除自身"的包装函数，而不是在 `emit` 内部特殊判断
- Promise/A+ 规范的三条核心约束：① 状态机只有 pending/fulfilled/rejected 三态，且落定后不可逆转（这保证了"结果一旦确定就不会被后续代码意外改变"）；② 每次 `.then` 调用都返回一个**新的** Promise 对象（这是链式调用能够进行下去的关键，不是原 Promise 被复用）；③ `onFulfilled`/`onRejected` 必须以微任务方式异步执行，即使 Promise 已经落定，也不能同步调用回调（避免"有时同步有时异步"的不确定行为）
- Promise 链式调用的值传递机制：每个 `.then` 内部创建的新 Promise，会根据 `onFulfilled` 的返回值来决定自己的状态——如果返回普通值，新 Promise 直接以该值 `resolve`；如果返回的是另一个 Promise（或 thenable），则需要等待这个返回的 Promise 落定后再把结果透传下去，这也是"Promise 可以扁平化嵌套异步"的原理
- 并发控制原理：当"要并发执行的任务数"远大于"下游服务/数据库能承受的并发数"时，一次性 `Promise.all` 全部任务会瞬间打满下游连接池；分批或计数器限流把同时 in-flight 的请求数控制在阈值内，超出部分排队等待——这是"背压"思想在应用层 Promise 聚合上的体现
- 对比前端框架：Vue 的响应式系统底层也用了发布订阅思想（`dep.notify()` 遍历 `subs` 通知订阅者），和 `EventEmitter` 的设计内核是同一套模式，只是 Vue 把"订阅"这个动作做成了自动依赖收集，而 `EventEmitter` 需要手动 `on`

#### 三、工程落地参考

1. Node.js `EventEmitter` 实现：`lib/events.js`（nodejs/node 仓库）— `_events` 内部存储结构，`emit` 对监听器数组的遍历调用，`on`/`once` 的包装逻辑
2. V8 的 Promise 微任务调度：`PromiseReactionJob` 进入 `MicrotaskQueue`，理解"当前同步代码跑完 → 清空微任务队列 → 才进入下一个宏任务"这个时序
3. `Promise.all` 参考实现思路：用一个计数器统计已完成的 Promise 数量，用结果数组的下标写入（而非 push）来保证结果顺序与传入顺序一致，不受实际完成顺序影响

#### 四、实践演示与验证

1. 搭建 `packages/event-emitter`：手写 `EventEmitter` 完整实现（`on`/`off`/`emit`/`once`），验证同一事件多个监听器都能被触发、`once` 触发后自动解绑
2. 搭建 `packages/promise-polyfill`：手写符合 Promise/A+ 规范的 Promise（三态状态机、微任务调度用 `queueMicrotask`、链式 `.then` 返回新 Promise、`Promise.all`/`race`/`allSettled` 静态方法），用官方 [Promise/A+ 测试套件](https://github.com/promises-aplus/promises-tests) 跑通验证
3. 搭建 `packages/fp-utils`：`curry`/`compose`/`pipe` 的医疗场景落地（"处方单校验管道"），实现原理索引到 JS 函数式篇，此处只演示 Node 后端校验链的组合方式

（新建仓库，待补充地址）

#### 五、参考
- https://nodejs.org/api/events.html
- https://promisesaplus.com/
- https://github.com/promises-aplus/promises-tests

**面试核心问**：
- 发布订阅模式和观察者模式的区别是什么？（事件中心这一层解耦）
- Node 的 EventEmitter 内部用什么结构维护监听器？`once` 是怎么实现的？
- Promise 的状态机为什么设计成不可逆？如果状态可以来回变化会有什么问题？
- `.then` 每次调用都返回新 Promise 意味着什么？如果返回的是同一个 Promise 会怎样？
- `Promise.all` 怎么保证结果顺序与传入顺序一致？`allSettled` 和 `all` 分别适用什么场景？
- 手写一个"限制最大并发数"的批量请求工具，关键点是什么？

---

### 第 02 篇：Node.js 事件循环: 浏览器与 Node 宏任务/微任务差异全解（面试收藏级）

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

#### 三、工程落地参考

1. CJS 模块包装与加载：`lib/internal/modules/cjs/loader.js`（nodejs/node 仓库）— `Module.prototype._compile`、`Module._cache`、`Module._resolveFilename` 路径解析算法
2. ESM 加载器：`lib/internal/modules/esm/loader.js` — 解析/实例化/求值三阶段的实现入口
3. libuv 线程池与异步 I/O 的 C++ 绑定：概览级介绍 `deps/uv` 目录结构和 `lib/internal/bootstrap` 中 JS 层如何调用底层绑定

#### 四、实践演示与验证

1. 搭建 `packages/mini-require`：手写一个简化版 `require` 实现——读取文件、用 `vm` 模块或 `new Function` 包装执行、维护自己的模块缓存 Map，验证"同一模块二次 require 不会重新执行"与"循环依赖时后加载方拿到不完整 exports"两个现象
2. 写一组对照 demo：同一份逻辑分别用 CJS 和 ESM 实现一次循环依赖场景，观察两者行为差异

#### 五、参考
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

> 本篇聚焦纯 I/O 机制（Buffer/Stream/背压）。静态资源服务器这类涉及 HTTP 语义（`Content-Type`/`Range`/`ETag`）的综合实战，挪到第 05 篇末尾与 `apps/his-api` 项目一起落地，避免在"I/O 体系"标题下讲偏题的 HTTP 内容。

#### 二、设计与原理

- Buffer 的本质：Node.js 里表示固定长度二进制数据的类型，底层基于 V8 的 `ArrayBuffer` 分配在堆外内存（不占用 V8 堆内存限制），这是 Node.js 处理大量二进制数据（网络包、文件）时性能和内存表现更好的原因
- **Stream 四种基本类型**：Readable（可读，如 `fs.createReadStream`）、Writable（可写，如 `fs.createWriteStream`）、Duplex（可读可写，如 TCP socket）、Transform（可读可写且对数据做转换，如 `zlib.createGzip()`）
- **`pipe` 的本质**：把一个 Readable 的 `data` 事件与目标 Writable 的 `write` 方法连接起来，自动处理"读多写少"时的流量控制，避免内存爆炸——这引出下面的背压机制
- **背压（backpressure）机制**（重点）：当 Writable 端的写入速度跟不上 Readable 端的读取/产出速度时，如果不加控制，未写完的数据会不断在内存里堆积（比如从磁盘读一个大文件、通过慢速网络写出去）；Node.js 的解决方式是 `writable.write()` 返回布尔值——如果内部缓冲区超过 `highWaterMark` 阈值会返回 `false`，`pipe()` 内部监听到这个信号后会调用 `readable.pause()` 暂停读取，等 Writable 触发 `drain` 事件（表示缓冲区已经消化到可以继续写入）后再 `resume()` 恢复读取——这是一套完全自动化的"流量控制"，手写 `pipe` 时必须正确实现这套暂停/恢复逻辑才能称得上正确
- **`highWaterMark`**：控制内部缓冲区的"高水位线"，是背压机制触发的阈值参数，而不是流的最大容量硬限制
- fs 同步 API 阻塞事件循环的代价：`fs.readFileSync` 会阻塞整个 Node.js 主线程直到读取完成，这期间无法处理任何其他请求——生产环境的 HTTP 服务器代码中几乎不应该出现同步 fs 调用（除了启动阶段读取配置文件等一次性场景）
- 对比前端：浏览器的 `ReadableStream`/`WritableStream`（Web Streams API）在设计理念上与 Node.js Stream 高度相似（都要解决"大数据分块处理+流量控制"问题），Node.js 18+ 也在逐步兼容 Web Streams API，两套体系正在收敛

#### 三、工程落地参考

1. Buffer 与堆外内存分配：`lib/buffer.js`（nodejs/node 仓库）概览级介绍 `Buffer.allocUnsafe` 与 `Buffer.alloc` 的差异（是否清零初始化）
2. Readable Stream 内部缓冲与状态机：`lib/internal/streams/readable.js` — `_readableState` 中 `highWaterMark`、`buffer` 的维护
3. `pipe` 实现核心：`lib/internal/streams/readable.js` — `Readable.prototype.pipe` 中对 `write` 返回值的判断、`pause`/`resume`/`drain` 事件的绑定逻辑

#### 四、实践演示与验证

1. 搭建 `packages/mini-stream`：手写一个简化版 Readable + Writable + 手写 `pipe` 函数，正确实现背压（监听 `write` 返回值、`drain` 事件驱动暂停/恢复），用"生成 10 万行模拟患者数据 → 写入慢速目标（如加了 `setTimeout` 模拟延迟的 Writable）"验证内存占用不会无限增长
2. 用 `packages/mini-stream` 额外实现一个 Transform 流（如"逐行转大写"）串进管道验证三段式管道正常工作

#### 五、参考
- https://nodejs.org/api/stream.html
- https://nodejs.org/api/buffer.html
- https://nodejs.org/api/fs.html

**面试核心问**：
- Buffer 和普通数组有什么区别？为什么 Node.js 处理二进制数据要用 Buffer 而不是普通数组？
- Stream 有哪几种类型？分别对应什么场景？
- 什么是背压？如果没有背压控制会出现什么问题？
- `pipe()` 内部是怎么实现背压的？`highWaterMark` 具体控制什么？
- 什么场景下应该用同步 fs API，什么场景绝对不能用？

---

### 第 05 篇：Node.js 核心 API 大全: process/crypto/net/os/worker_threads 深度拆解（含 WebSocket 服务端与静态资源服务器实现）（面试收藏级）

**副标题**：进程信息与信号处理、加密哈希与签名、TCP/UDP 原生编程、多线程 worker_threads 与 cluster 多进程对比、手写 WebSocket 服务端与静态资源服务器

> 与《网络原理》系列的分工：本篇不讲协议原理（HTTP/TLS/WebSocket 帧格式等见 `docs/plans/network-principles-series-outline.md`），只讲"怎么用 Node.js 的核心模块实现具体能力"。手写实现部分落地两个综合场景（WebSocket 服务端、静态资源服务器），这也是本篇标题特别标注这两项的原因——避免读者按"process/crypto/net/os/worker_threads"这几个模块名字面意思查找时找不到这部分内容。

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

#### 三、工程落地参考

1. `crypto` 模块对 OpenSSL 的绑定：`lib/crypto.js`（nodejs/node 仓库）概览级介绍 `Hash`/`Hmac` 类如何调用底层 OpenSSL 绑定
2. `worker_threads` 实现：`lib/internal/worker.js` — `Worker` 类的消息通道（`MessagePort`）与线程生命周期管理
3. `cluster` 模块连接分发：`lib/internal/cluster/primary.js` — 主进程 `fork` 工作进程与 round-robin 分发策略

#### 四、实践演示与验证

1. 搭建 `packages/mini-ws`：不依赖 `ws` 库，用 Node.js 原生 `http` + `crypto` 模块手写一个最简 WebSocket 服务端（`Sec-WebSocket-Accept` 计算、帧编解码），协议细节参照《网络原理》系列第 06 篇，本篇只关注"怎么用 Node.js API 实现"
2. 用 `worker_threads` 实现一个 CPU 密集任务示例（如计算一批模拟药品数据的哈希摘要），对比"主线程同步计算导致事件循环阻塞"和"丢给 worker_threads 计算"两种方式下，主线程能否继续响应其他请求
3. 在 `apps/his-api` 里搭建静态资源服务端（综合 `http`/`fs`/`path` 模块，延续第 04 篇 I/O 知识的落地）：① 路径安全校验（`path.normalize` 后校验是否逃出根目录，防止 `../` 目录穿越）；② 按扩展名映射 `Content-Type`；③ 用 `fs.createReadStream` + `pipe` 返回文件内容；④ 支持 `Range` 请求头断点续传（`bytes=start-end`，返回 `206 Partial Content`，配合 `fs.createReadStream(path, { start, end })`）；⑤ 设置 `ETag`/`Cache-Control` 响应头（协议原理见《网络原理》系列第 08 篇缓存体系）——用"药品说明书 PDF/图片"场景验证

#### 五、参考
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
- 手写一个静态资源服务器，怎么防止目录穿越攻击（请求 `../../etc/passwd` 这类路径）？
- `Range` 请求断点续传涉及哪些请求头/响应头？服务端该怎么处理？

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

#### 三、工程落地参考

1. `express-session` 中间件实现：`expressjs/session` 仓库 — Session 的创建、Cookie 签发、`store.get`/`store.set` 存储接口抽象
2. JWT 签名与验证：`auth0/node-jsonwebtoken` 仓库 — `sign`/`verify` 中 HMAC/RSA 签名算法的调用与 `exp` 过期校验逻辑
3. OAuth2 授权码流程参考实现：`simov/grant` 或 Passport.js 的 `passport-oauth2` 策略 — 授权码换取 access token 的完整请求链路

#### 四、实践演示与验证

1. 搭建 `packages/mini-session`：手写一个基于内存 Map 的 Session 中间件（生成会话 ID、设置 Cookie、请求时查找会话状态），再替换为 Redis 存储版本对比两者在多实例部署下的行为差异
2. 搭建 `packages/mini-jwt`：手写 JWT 的签发与验证（HMAC-SHA256 签名，base64url 编解码，`exp` 校验），不依赖第三方库，验证篡改 payload 后签名校验会失败

#### 五、参考
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

#### 三、工程落地参考

1. 中间件注册与执行：`expressjs/express` 仓库 `lib/router/index.js` — `Router.prototype.use`、`Router.prototype.handle` 中间件数组的遍历调用（`layer.handle_request`）
2. 路由匹配：`lib/router/layer.js` — 结合 `path-to-regexp` 把路径字符串编译为正则并匹配
3. 错误处理中间件识别：`lib/router/route.js` — 通过 `fn.length === 4` 判断是否为错误处理中间件

#### 四、实践演示与验证

搭建 `packages/mini-express`：基于 Node.js 原生 `http` 模块，手写一个精简版 Express——实现 `use`/`get`/`post` 等方法注册中间件与路由、手写线性中间件执行器（维护索引 + `next` 函数递归调用下一个）、实现基于 `fn.length === 4` 识别错误处理中间件的机制、实现简化版路径匹配（支持 `:id` 动态参数）。用"患者列表增删查"路由验证整条链路。

（新建仓库，待补充地址）

#### 五、参考
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

#### 三、工程落地参考

1. `koa-compose` 完整实现：`koajs/compose` 仓库 `index.js` — 递归 `dispatch` 函数（源码本身很短，是精读重点）
2. Koa 核心应用类：`koajs/koa` 仓库 `lib/application.js` — `Application.prototype.use`/`callback`/`handleRequest`
3. `ctx` 上下文对象与属性代理：`koajs/koa` 仓库 `lib/context.js` — `delegate(proto, 'response').method('...')` 代理机制

#### 四、实践演示与验证

搭建 `packages/mini-koa`：手写 `compose` 函数（递归组合中间件数组为一条调用链），手写极简 `ctx` 对象（封装 `req`/`res` 并代理常用属性），基于 Node.js 原生 `http` 模块搭建应用类。用"记录请求耗时的日志中间件 + 全局错误捕获中间件"验证洋葱模型的双向穿透效果（在控制台打印中间件"进入"和"离开"的顺序日志，直观验证执行顺序）。

（新建仓库，待补充地址）

#### 五、参考
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

#### 三、工程落地参考

1. IoC 容器与依赖解析：`nestjs/nest` 仓库 `packages/core/injector/injector.ts` — `Injector.resolveComponentInstance` 递归解析构造函数依赖
2. 装饰器元数据定义：`packages/common/decorators/core/injectable.decorator.ts`、`packages/common/decorators/core/component.decorator.ts` — `Reflect.defineMetadata` 的调用
3. Express 适配层：`packages/platform-express/adapters/express-adapter.ts` — NestJS 路由注册如何转换为 `app.get/post` 调用
4. 拦截器与异常过滤器执行链：`packages/core/interceptors/interceptors-consumer.ts`、`packages/core/exceptions/exceptions-handler.ts`

#### 四、实践演示与验证

搭建 `packages/mini-nest`：用 TypeScript + `reflect-metadata` 手写一个简化版 IoC 容器——实现 `@Injectable()`/`@Controller()` 装饰器（记录元数据），实现一个 `Container` 类扫描并递归实例化所有 Provider（解析构造函数参数类型完成自动注入），实现一个极简的路由装饰器（`@Get(path)`）配合 Node.js 原生 `http` 模块把请求分发到对应控制器方法。用"患者模块（PatientController 注入 PatientService）"验证依赖自动注入链路正确工作。

#### 五、参考
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

### 第 10 篇：BFF 架构模式: API Gateway vs BFF/多端数据聚合与裁剪/Node.js 中间层实战（面试收藏级）

**副标题**：为什么多端需要独立聚合层、BFF 与 API Gateway 的边界、聚合裁剪的具体实现手法、与 GraphQL 的分工

> 与第 16 篇 GraphQL 的分工：本篇讲"BFF 作为一种架构模式本身"——为什么要在客户端和后端服务之间插入一层、这层该放哪些逻辑、不该放哪些逻辑；GraphQL 是实现 BFF 聚合能力的其中一种技术方案（用统一 Schema 替代手写聚合接口），具体的 Resolver/DataLoader 实现细节见第 16 篇，本篇不重复讲。

#### 一、使用与实践

- 场景引入：医院 HIS 系统有 Web 管理后台、医生端 App、患者端小程序三个客户端，同一个"患者详情"需求，Web 端要完整病历+检验报告+账单，小程序端只要姓名/年龄/当前处方三个字段——直接裸调后端微服务会让每个客户端都写一遍聚合逻辑，或者后端为每个端各开一套接口
- 用 Express/NestJS 搭建一个最小 BFF 层：BFF 层接收小程序端的 `GET /bff/mp/patient/:id`，内部并行调用患者服务、处方服务两个下游接口，聚合裁剪后只返回小程序需要的字段
- 用 `Promise.all` 并行发起多个下游调用（呼应第 01 篇 Promise 并发聚合），而不是串行等待拖慢响应时间
- BFF 层做的"脏活"：字段名转换（下游返回 `patient_name`，前端要 `patientName`）、多接口结果合并成一个响应体、按端裁剪敏感字段（医生端能看诊断意见，患者端不能看医生私人备注）
- Nginx/API Gateway 层的路由转发配置示例：如何把 `/bff/mp/*` 路由到小程序专属 BFF 服务、`/bff/web/*` 路由到 Web 端 BFF 服务

#### 二、设计与原理

- **BFF 模式的核心动机**：不同客户端（Web/App/小程序）对同一份后端能力的数据形状、粒度、聚合方式需求天差地别——如果让所有客户端直接对接后端微服务，either 后端要为每个端定制一批接口（服务端代码膨胀、职责混乱），either 客户端自己承担聚合逻辑（每个端重复写一遍，且客户端网络环境通常比服务端内网环境更差，多次下游调用的往返延迟会被放大）；BFF 把"面向特定端的聚合裁剪逻辑"收拢到一个专属中间层，各自独立部署、独立演进，不与核心后端服务耦合
- **BFF vs API Gateway 的边界**（重点，面试高频辨析）：两者常被混淆，但职责层次不同——API Gateway 是**基础设施层**的能力，处理路由转发、鉴权、限流、日志、协议转换等"与业务无关的横切关注点"，通常是网关产品（Kong/Nginx+Lua/云厂商网关）或轻量 Node.js 网关，不了解具体业务字段；BFF 是**业务聚合层**，知道"小程序端的患者详情要哪几个字段、要从哪几个下游服务拿数据、怎么裁剪合并"，是与业务紧密绑定的应用代码；实际架构里两者经常同时存在且分层——请求先经过 API Gateway 做鉴权限流，再路由到对应端的 BFF 服务做业务聚合，BFF 再调用后端微服务
- **"每个客户端一个 BFF"还是"一个 BFF 服务多端复用"**：Sam Newman 提出 BFF 概念时的原始主张是"一个客户端团队维护一个专属 BFF"（如小程序团队自己维护小程序 BFF），团队边界与代码边界对齐，避免"一个共享 BFF 变成新的单体瓶颈"；工程实践中如果多个端的数据需求高度相似，也可以先用一个 BFF 服务按路由前缀（`/bff/web`、`/bff/mp`）区分不同端的聚合逻辑，等复杂度上升后再拆分——这是"避免过度设计"和"避免单体化"之间的权衡，团队规模小时没必要一上来就拆多个服务
- **聚合裁剪的常见实现手法**：并行调用下游（`Promise.all`，避免串行往返延迟叠加）、超时与降级（某个下游服务慢或挂了，用 `Promise.allSettled` 或超时 race，让 BFF 返回"部分数据+错误标记"而不是整体挂掉）、响应缓存（对变化不频繁的聚合结果做短 TTL 缓存，减少下游压力）、字段级裁剪（按客户端类型/用户角色动态决定返回哪些字段，而不是让下游服务承担这个逻辑）
- **BFF 不该做什么**：核心业务逻辑（如处方审核规则、库存扣减）不应该下沉到 BFF 层，BFF 只做数据形状适配和轻量聚合，否则业务逻辑会散落在多个 BFF 服务里造成维护梦魇——这是"聚合裁剪"和"业务逻辑"的边界判断，也是 BFF 模式在生产实践中最容易踩偏的地方
- **与 GraphQL 的关系**：GraphQL 可以看作"用统一 Schema + 客户端自定义查询"取代"为每个端手写一套 REST 聚合接口"——本质上是同一个问题（多端按需获取聚合数据）的两种解法：手写 BFF REST 接口的裁剪逻辑是显式、命令式的（每个端一个或几个专属 endpoint）；GraphQL 是声明式的（一个 Schema，客户端自己声明要什么字段），把"裁剪"这件事的控制权交给了客户端而不是后端预先写死——中小型项目/端的数量少且需求差异不大时，手写 BFF 更简单直接；端的数量多、字段需求碎片化严重时，GraphQL 的按需查询能力优势更明显
- 对比前端：前端团队对 BFF 概念天然敏感，因为 BFF 通常就是前端/全栈团队自己维护的一层（不像核心后端服务归后端团队），这也是"前端转全栈"最常见的第一个后端项目类型——理解 BFF 的边界有助于理解"全栈"具体全在哪个栈的哪一层

#### 三、工程落地参考

1. Sam Newman 提出 BFF 模式的原始文章与 SoundCloud/SamNewman 团队的实践案例（概念溯源，非代码仓库）
2. 参考 Netflix/Spotify 等公司公开分享的"每端一个 BFF"架构演进案例，理解团队规模与 BFF 拆分粒度的关系
3. 对比阅读 `apollographql` 官方博客中"BFF vs GraphQL Gateway"的选型讨论，理解两种技术方案的定位差异

#### 四、实践演示与验证

在 `apps/his-api` 项目上新增一个 `apps/his-bff-mp`（小程序 BFF 服务）：① 用 NestJS 搭建 BFF 骨架，复用第 09 篇的模块化结构；② 实现 `GET /bff/mp/patient/:id`，内部用 `Promise.all` 并行调用患者服务、处方服务两个下游接口（可先 mock 下游为本地简单 Express 服务）；③ 实现字段裁剪逻辑，按小程序端需求只拼装姓名/年龄/当前处方三个字段返回；④ 故意让其中一个下游延迟或报错，实现超时降级（用 `Promise.allSettled` 让 BFF 在下游部分失败时仍能返回可用数据+错误标记），验证降级效果。

#### 五、参考
- https://samnewman.io/patterns/architectural/bff/
- https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends
- https://www.apollographql.com/blog/backend-for-frontend-pattern-with-graphql-federation

**面试核心问**：
- 为什么需要 BFF 层？直接让客户端调用后端微服务会有什么问题？
- BFF 和 API Gateway 的职责边界在哪里？两者能不能合并成一层？
- "一个客户端一个 BFF"和"一个 BFF 多端复用"分别适合什么规模的团队？
- BFF 层聚合下游接口时，怎么处理某个下游服务超时或报错的情况？
- BFF 和 GraphQL 解决的是不是同一个问题？什么场景下手写 BFF 比上 GraphQL 更合适？

---

### 第 11 篇：Serverless 架构: 云函数/API 网关/部署形态演进（生产收藏级）

**副标题**：FaaS/BaaS 概念、Serverless Framework 部署云函数/API 网关/静态网站/Express、layer 依赖层、冷启动与成本治理

#### 一、基本使用

- **Serverless 是什么**：无服务器架构几乎封装了所有底层资源管理和系统运维工作——服务器部署、扩缩容、运维、监控报警都交给云厂商，开发者只关注业务。核心是两类能力：**FaaS**（Function as a Service，云函数，如腾讯云 SCF）承载后端逻辑，**BaaS**（Backend as a Service，后端即服务）把 API 网关、对象存储 COS、数据库等作为现成服务直接调用
- **Serverless Framework**：业界主流的无服务器应用框架，具备资源编排、自动伸缩、事件驱动能力，覆盖编码/调试/测试/部署全生命周期。安装：`npm i -g serverless-cloud-framework`，查看版本 `scf -v`
- **云函数 SCF 组件**：用 `serverless.yaml` 声明函数（`app`/`component: scf`/`name`/`stage` + `inputs` 里的 `src`/`runtime`/`region`/`handler`/`events`），入口文件导出 `main_handler(event, context)`，`.env` 配密钥，`scf deploy` 一键部署
- **API 网关组件**：`component: apigateway`，通过 `endpoints` 把 HTTP 路径/方法绑定到指定云函数，统一接入鉴权、限流、监控
- **部署静态网站**：`component: website` 把 `src` 目录上传到对象存储 COS，绑定自定义域名与 HTTPS
- **部署 Express 项目**：`component: http` + `faas.framework: express`，把现成的 Express 应用几乎不改代码部署到云函数；`component: layer` 把 `node_modules` 抽成依赖层供函数复用
- **Vue + Express 全栈**：前端静态资源走 COS，后端 API 走云函数 + API 网关，`fullstack` 模板一键创建

#### 二、企业最佳实践

- **无状态设计**（核心）：函数实例会被随时冷启动、销毁和横向扩容，任何进程内状态（内存缓存、全局变量、本地文件）都不保证下次请求还在——需要持久化的状态一律外置到数据库 / Redis / 对象存储，这和第 17 篇「多进程部署不能用进程内存存 Session」是同一原则在 Serverless 下的加强版
- **layer 分层复用**：把 `node_modules`、公共工具函数、大体积依赖抽成 layer，函数代码只保留业务逻辑——既减小函数包体积（加速冷启动），又让多个函数共享同一份依赖、统一升级
- **冷启动优化**：冷启动（函数首次或长期空闲后被调用时，需要重新拉起运行环境）是 Serverless 延迟的主要来源，优化手段包括——减小代码包体积、选择更轻的运行时、使用预留并发（常驻实例）或定时预热、把初始化开销（连数据库等）移出 handler 之外
- **函数与 API 网关的分工**：网关负责鉴权、限流、协议转换等横切关注点，函数只做业务——这与第 10 篇 BFF vs API Gateway 的边界判断完全一致，Serverless 把「网关」做成了云上现成的托管服务
- **密钥与环境隔离**：密钥走 `.env` 或云厂商的密钥管理，绝不硬编码进代码或提交到仓库；用 `stage`（dev/prod）区分环境，`.env` 通过 `exclude` 排除出部署包避免泄露
- **数据库连接复用**：把数据库连接放在 handler 外的全局作用域，利用函数实例复用减少每次冷启动的建连开销；否则冷启动频繁会打满数据库连接数

#### 三、注意事项

- **执行时间与内存上限**：云函数有最大执行时长和内存限制，长时任务（视频转码、大批量导出、复杂模型推理）不适合直接放函数里，应转交消息队列异步处理
- **冷启动延迟**：对延迟敏感的服务，冷启动（首次/空闲后触发）会带来秒级甚至更久延迟，需要预留并发或预热；WebSocket 这类长连接默认不支持（需用网关的长连接能力或换部署形态）
- **数据库连接数耗尽**：若在 handler 内每次新建连接，冷启动 + 高并发会导致数据库连接数被瞬间打满——连接必须移到全局作用域复用，并配置合理的连接池上限
- **适用场景边界**：事件驱动、突发流量、轻量接口、定时任务、静态站点这类「请求量波动大、逻辑简单」的场景收益最大；强状态、长连接、长时计算、需要精细控制底层网络/内核的场景则不合适
- **供应商锁定**：不同云厂商的 Serverless 能力（触发事件、运行时、网关配置）不通用，迁移成本高，选型时要考虑锁定风险

**面试核心问**：
- Serverless 和 BFF 是什么关系？它解决了第 10 篇 BFF 的哪些运维代价？
- FaaS 和 BaaS 分别指什么？各承担什么职责？
- 冷启动是什么？为什么会发生？有哪些缓解手段？
- Serverless 为什么必须无状态设计？数据库连接应该怎么管理？
- 什么场景适合上 Serverless，什么场景不适合？

---

### 第 12 篇：MySQL 全栈: 基本使用/索引与事务最佳实践/慢查询与设计范式（生产收藏级）

**副标题**：InnoDB 事务与隔离级别选型、B+ 树索引与最左前缀、执行计划与慢查询优化、三大范式与反范式设计

#### 一、基本使用

- 基本 CRUD：`SELECT`/`INSERT`/`UPDATE`/`DELETE`，`JOIN` 多表查询（患者表 + 处方表关联查询）
- 事务基本用法：`BEGIN`/`COMMIT`/`ROLLBACK`，Node.js 中用 `mysql2` 或 ORM（如 Drizzle/Prisma）执行事务
- 索引基本操作：`CREATE INDEX`，`EXPLAIN` 查看查询是否走索引
- 常见约束：主键、唯一索引、外键（及生产环境中"是否该用外键"的实践争议）
- 分页查询的常见写法与深分页性能问题（`LIMIT 100000, 20` 效率低下的现象）

#### 二、企业最佳实践

- **事务四大特性（ACID）**：原子性（Atomicity，全部成功或全部回滚）、一致性（Consistency，事务前后数据满足业务约束）、隔离性（Isolation，并发事务互不干扰）、持久性（Durability，提交后数据永久保存）——这是理解下面隔离级别和锁选型的坐标系
- **四种隔离级别与选型**：读未提交（脏读，几乎不用）、读已提交（避免脏读，会有不可重复读）、可重复读（InnoDB 默认，避免不可重复读，多数业务场景够用）、串行化（完全串行，性能最差）。选型原则：**默认用 InnoDB 的可重复读即可，只有对并发读写一致性要求极高、且能接受性能代价时才考虑串行化；读已提交常用于需要「每次读都看到最新已提交数据」的场景**（如实时对账）
- **索引的设计原则**（一句话结论，不含内部结构）：InnoDB 用 B+ 树组织索引，树高通常 3-4 层，所以一次查询的磁盘 I/O 次数被限制在树高以内——这是「大数据量下索引查询依然快」的根本原因；B+ 树叶子节点间相连，对 `BETWEEN`/`ORDER BY` 这类范围查询天然友好
- **聚簇索引 / 二级索引 / 回表 / 覆盖索引**：主键索引是聚簇索引（数据行按主键物理存储），非主键索引（二级索引）的叶子节点只存主键值，查到后要「回表」再查一次聚簇索引才能拿全行数据——所以查询字段尽量让二级索引「覆盖」（字段都在索引里，无需回表）能显著提速
- **最左前缀原则**：联合索引 `(a, b, c)` 只有从最左列 `a` 开始连续匹配才生效（`WHERE a=1 AND b=2` 能用，`WHERE b=2` 单独用不上）——设计联合索引时，把最常作为等值/范围查询的列放最左边
- **慢查询排查方法论**：先用慢查询日志定位问题 SQL，再用 `EXPLAIN` 看 `type`（`const`>`ref`>`range`>`index`>`ALL`，`ALL` 全表扫描）、`key`（实际用的索引）、`rows`（预估扫描行数）——`type` 出现 `ALL` 或 `key` 为 NULL，基本就是索引缺失或失效
- **三大范式与反范式权衡**：三大范式（原子性 / 消除部分依赖 / 消除传递依赖）减少冗余、保证更新一致性；但严格范式化会带来更多 `JOIN`，高并发读场景常故意反范式化（订单表冗余商品名快照），用空间换查询性能——**设计时以「读多写少走反范式、读少写多走范式」为原则权衡**

#### 三、注意事项

- **深分页性能陷阱**：`LIMIT 100000, 20` 会扫描并丢弃前 10 万行，偏移量越大越慢——改用「游标分页」（记录上一页最后一条的主键，`WHERE id > lastId LIMIT 20`）或延迟关联
- **索引失效的常见场景**：索引列上使用函数（`WHERE YEAR(create_time) = 2026`）、隐式类型转换（字符串列用数字比较）、`LIKE '%xxx'` 前缀模糊匹配——都会导致索引无法使用，落到全表扫描
- **`UPDATE`/`DELETE` 忘带 `WHERE`**：会全表更新/删除，生产事故高发——养成「先写 WHERE 再写 SET」、上线前在事务里回滚验证、用 SQL 审核工具兜底的习惯
- **生产环境是否用外键的争议**：外键保证引用完整性，但会带来锁竞争和级联删除风险，高并发场景常选择「不用外键、在应用层保证一致性」——没有绝对答案，取决于团队对一致性 vs 性能的取舍
- **`TRUNCATE` 不可恢复**：清空表数据但不写日志，无法回滚，且不能用于有外键引用的表——能删数据但几乎不可逆，生产慎用
- **隐式锁与死锁**：InnoDB 行锁在并发事务下可能死锁，应用层要对「死锁异常」做重试，而不是当作 bug 崩溃处理

**面试核心问**：
- MySQL 的四种事务隔离级别分别解决什么并发问题？InnoDB 默认是哪个级别？怎么选？
- 为什么 B+ 树适合做数据库索引？树高 3-4 层意味着什么？
- 什么是聚簇索引和二级索引？为什么二级索引查询有时需要"回表"？覆盖索引为什么快？
- 什么是最左前缀原则？联合索引 `(a,b,c)` 在哪些查询条件下能生效，哪些不能？
- 拿到一条慢查询，你的排查思路是什么？
- 什么场景该用范式，什么场景该反范式化？

---

### 第 13 篇：MongoDB 深度: 文档模型/聚合管道/索引策略/Mongoose 最佳实践（生产收藏级）

**副标题**：文档模型与 Schema-less 设计取舍、聚合管道多阶段处理、复合索引与覆盖查询、Mongoose 中间件与虚拟字段

#### 一、基本使用

- 基本 CRUD：`insertOne`/`find`/`updateOne`/`deleteOne`，查询操作符 `$gt`/`$in`/`$regex`
- 聚合管道基本用法：`$match`/`$group`/`$sort`/`$project` 组合统计"各科室处方数量"
- 索引创建：`createIndex({ field: 1 })`，复合索引与排序方向
- Mongoose 基本用法：`Schema` 定义、`Model` 创建、`populate()` 关联查询（模拟关系型 JOIN 效果）
- 事务支持：MongoDB 4.0+ 多文档事务的使用场景（跨集合更新患者与处方状态时保证一致性）

#### 二、企业最佳实践

- **文档模型 vs 关系型的选型判断**：数据有明显「层级嵌套」结构且经常整体读取时（一份病历含多次就诊、每次就诊含多项检验结果），用嵌套文档一次查询拿全，避免关系型的多表 JOIN；反之数据需要频繁跨实体复杂关联查询和强一致性事务时，关系型更合适——**核心判据是「读模型」：经常整体读、少跨实体关联 → 文档模型；经常跨实体聚合、强一致 → 关系型**
- **聚合管道的分阶段思想**：把复杂统计拆成多个顺序执行的阶段（`$match` 过滤 → `$group` 分组 → `$sort` 排序 → `$project` 投影），每个阶段吃上一个阶段的输出——复杂查询像搭积木一样组合，比一条巨型 SQL 更好维护
- **索引策略**：MongoDB 索引同样基于 B 树，复合索引遵循类似「最左前缀」的规则；`explain()` 看 `IXSCAN`（命中索引）vs `COLLSCAN`（全表扫描）判断是否走索引
- **覆盖查询（Covered Query）**：查询涉及的字段和返回字段都恰好被索引覆盖时，MongoDB 直接读索引返回，不读实际文档——性能显著优于常规索引查询，与 MySQL 覆盖索引同理
- **Mongoose 中间件与虚拟字段**：`pre`/`post` 钩子在 `save`/`remove`/`find` 前后插入逻辑（保存前自动算衍生字段）；`virtual` 虚拟字段不持久化、读取时动态计算（按出生日期算患者年龄），避免冗余存储带来的更新一致性问题
- **Schema-less 的一致性兜底**：文档结构灵活演进（加字段不用停机迁移）是优势，但代价是失去数据库层结构约束，一致性的责任转移到应用层——**实践上用 Mongoose Schema 在应用层做校验兜底**，既保留灵活性又有约束

#### 三、注意事项

- **Schema-less 的代价**：数据库不约束结构，脏数据容易混入——必须靠应用层 Schema 校验，否则同一集合字段五花八门，查询和迁移都会崩
- **`$match` 要尽早放**：聚合管道的 `$match` 越靠前，后续阶段处理的文档越少；把过滤条件写到最后面会导致全量文档跑完整个管道，性能天差地别
- **大文档读写**：单个文档过大（如把大量检验结果塞进一个文档）会导致读写放大、内存压力大，超过 16MB 上限直接报错——合理拆分子集合或引用
- **连接池与事务**：MongoDB 4.0+ 多文档事务只在副本集/分片集群可用，单机版不支持；且事务有性能开销，不要因为有事务就把它当关系型用
- **Mongoose `populate` 的 N+1**：`populate()` 模拟 JOIN 但底层是多条查询，深关联或列表场景会放大成 N+1，注意批处理或改用聚合管道

**面试核心问**：
- 什么场景适合用 MongoDB 的文档模型，什么场景更适合关系型数据库？
- 聚合管道的设计思想是什么？和 SQL 的 `GROUP BY` 相比表达方式有什么不同？
- 什么是覆盖查询？它是怎么提升查询性能的？
- Mongoose 的 `pre`/`post` 钩子和虚拟字段分别解决什么问题？
- MongoDB 4.0+ 支持多文档事务后，是不是就可以完全替代关系型数据库了？为什么？

---

### 第 14 篇：Redis 深度: 五大数据结构/持久化/缓存与分布式锁最佳实践/接口限流（生产收藏级）

**副标题**：五大数据结构适用场景、RDB/AOF 持久化、缓存穿透击穿雪崩、SETNX 分布式锁、令牌桶漏桶限流

#### 一、基本使用

- 五大基础数据结构：String（`SET`/`GET`）、Hash（`HSET`/`HGETALL`，存储患者档案的多个字段）、List（`LPUSH`/`RPOP`，实现简单消息队列）、Set（`SADD`/`SINTER`，标签系统）、Sorted Set（`ZADD`/`ZRANGE`，医生接诊排队优先级）
- 过期时间：`EXPIRE`/`TTL`，缓存患者基本信息设置合理 TTL
- Node.js 中用 `ioredis`/`node-redis` 客户端操作 Redis
- `MULTI`/`EXEC` 事务命令，`WATCH` 实现乐观锁
- Pub/Sub 基本用法：Redis 内置的发布订阅命令（对比第 01 篇 EventEmitter 的进程内发布订阅，Redis Pub/Sub 是跨进程/跨服务的）
- 接口限流基本用法：用 `INCR` + `EXPIRE` 实现最简单的固定窗口计数限流，保护医院 HIS 系统"处方提交"接口不被恶意刷单

#### 二、企业最佳实践

- **五大数据结构选型**：String 存单个值，Hash 存对象多字段，List 做简单队列，Set 做去重/交集，Sorted Set 做带权重的排序（优先级队列/排行榜）——**选型时先想「要什么操作」：需要排序用 ZSet，需要去重用 Set，需要队列用 List**
- **RDB 与 AOF 持久化组合**：RDB 是内存快照，恢复快但两次快照间的变更会丢；AOF 是追加写命令日志，丢数据窗口小但文件大、恢复慢。生产通用做法是**「RDB + AOF 混合持久化」**——用 AOF 保证数据安全，用 RDB 加快重启恢复
- **缓存穿透 / 击穿 / 雪崩三件套**（重点）：穿透（查一个数据库也没有的 key，每次都打到 DB → 缓存空值或布隆过滤器）；击穿（热点 key 过期的瞬间大量并发打到 DB → 互斥锁只让一个请求重建缓存，或热点数据永不过期后台异步更新）；雪崩（大量 key 同时过期或 Redis 宕机 → 过期时间加随机抖动 + Redis 高可用集群）
- **分布式锁的正确姿势**：`SET key value NX EX seconds` 保证「设置成功即获锁」+ 自动过期防死锁；三个进阶坑——① 锁被误删（value 存唯一标识，释放时先校验再删，用 Lua 保证原子）；② 业务超时锁提前释放（用看门狗自动续期）；③ 单实例宕机锁失效（Redlock 多实例，但该算法有争议，需权衡复杂度）
- **淘汰策略选型**：内存到 `maxmemory` 时按策略淘汰——LRU（最近最少使用）、LFU（最不经常使用，更适合区分「历史高频」和「刚访问一次」）、`noeviction`（默认，内存满拒绝写入）。**缓存场景通常显式配 allkeys-lru 或 allkeys-lfu，不要用默认的 noeviction 导致写失败**
- **接口限流算法选型**：固定窗口（`INCR`+`EXPIRE`）简单但有窗口边界突刺；滑动窗口更平滑但内存开销大；**令牌桶允许突发、漏桶强制平滑**——这是两者核心差异，按「是否允许短时突发」选型；生产用 Lua 脚本把「读取-判断-更新」封装成原子操作避免并发竞态

#### 三、注意事项

- **锁误删是最常见事故**：释放锁时若直接 `DEL`，会把别人的锁删掉——必须「校验 value 唯一标识 + 删除」原子完成
- **大 key 与 `KEYS`**：大 key（超大 List/Hash）会导致阻塞，`KEYS *` 在生产是禁忌（全库扫描阻塞单线程）——用 `SCAN` 游标替代，大 key 拆分成小 key
- **`noeviction` 的坑**：Redis 默认淘汰策略是 `noeviction`，内存满了会拒绝写入——生产缓存忘了配策略，会表现为「突然写不进去」的诡异故障
- **「Redis 单线程」的误读**：Redis 命令执行是单线程（所以单条命令很快、但 `KEYS`/大 key 会阻塞所有请求），但 6.0+ 网络 I/O 已多线程化——别把「单线程」当成「所有操作都慢」或「可以随便来」的理由
- **持久化与性能的权衡**：`always` 刷盘最安全但最慢，`everysec` 折中，`no` 最快但可能丢数据——按业务对丢数据的容忍度配，不要盲目求安全或求快

**面试核心问**：
- Redis 的 Hash/List 等结构各适合什么场景？选型时先想什么？
- RDB 和 AOF 各自的优缺点是什么？生产环境一般怎么组合使用？
- 缓存穿透、击穿、雪崩三者的区别是什么？分别怎么应对？
- 用 `SET key value NX EX` 实现分布式锁，有哪些坑？怎么解决锁被误删的问题？
- 令牌桶和漏桶算法的核心区别是什么？为什么令牌桶允许突发流量？
- 为什么生产环境禁用 `KEYS *`？`noeviction` 默认策略会带来什么坑？

---

### 第 15 篇：PostgreSQL 进阶: 窗口函数/JSONB/高级索引/pgvector 向量扩展（生产收藏级）

**副标题**：窗口函数分析查询、GIN/GiST 索引、JSONB 类型、pgvector 向量检索与 AI 应用结合

#### 一、基本使用

- 基础 CRUD 与 MySQL 高度相似的部分不重复展开，聚焦 PostgreSQL 特色能力
- 窗口函数：`ROW_NUMBER()`/`RANK()`/`LAG()`/`LEAD() OVER (PARTITION BY ... ORDER BY ...)`，统计每位医生"按接诊时间排序的接诊序号"
- JSONB 类型：存储非结构化的患者问诊表单数据，`->`/`->>`/`@>` 操作符查询
- 数组类型与 `ANY`/`ALL` 操作符
- `pgvector` 扩展基本用法：`CREATE EXTENSION vector`，`vector` 列类型存储 embedding，`<->`（欧氏距离）/`<#>`（负内积）/`<=>`（余弦距离）相似度查询算子

#### 二、企业最佳实践

- **窗口函数 vs `GROUP BY`**：`GROUP BY` 分组后每组只返回一行聚合结果；窗口函数「保留原始每一行」的同时，针对每一行算一个基于其窗口（`PARTITION BY` 分组 + `ORDER BY` 排序）的聚合/排名结果——**需要「明细 + 聚合上下文」的分析型查询（如用 `LAG()` 算每位患者本次检验值相比上次的变化）必须用窗口函数**
- **JSONB 优先**：JSONB 二进制存储、支持 GIN 索引加速；JSON 类型原样文本存储、查询要重新解析且无索引——生产几乎总是用 JSONB
- **GIN/GiST 索引选型**：B 树适合等值/范围，但不适合「字段包含某元素」（JSONB 判断包含某 key、数组包含某值）；GIN（倒排索引）是 JSONB/数组/全文搜索的标准选择；GiST 适合几何数据、范围类型的「最近邻/重叠判断」——**按「是否包含关系查询」选 GIN，按「空间/范围近邻」选 GiST**
- **pgvector 三种距离算子**（对齐本项目 AI 工程栈）：`<->` L2 欧氏距离、`<#>` 负内积（最大化内积检索）、`<=>` 余弦距离（衡量方向相似度，最常用于文本语义检索）——RAG 系统「药品说明书向量库」通常用余弦距离
- **精确检索 vs 近似索引的权衡**：小数据量用精确顺序扫描算距离即可；数据量增大后用近似索引（HNSW / IVFFlat）以「牺牲一点精度换检索速度」——**RAG 场景先上 HNSW 近似索引，规模小或要求 100% 召回时退回精确扫描**

#### 三、注意事项

- **与 MySQL 的 MVCC 实现差异 → 运维坑**：PostgreSQL 的旧版本直接存在表里、靠 `VACUUM` 回收（不像 InnoDB 用独立回滚段）——频繁更新的表若不及时 `VACUUM` 会严重膨胀（表体积远超实际数据量）、拖慢顺序扫描；`autovacuum` 虽内置，频繁大量更新场景要手动调优触发阈值
- **JSONB 的键重排**：JSONB 存储时会重排键顺序、去重空格，别拿它当「保留原始格式」的文档存储——需要保留原始文本用 JSON 类型
- **向量维度过高或数据量过大**：高维向量近似索引召回率会下降，`ef_search` 等参数需要在「召回率 vs 速度」间调优，不是建了索引就一劳永逸

**面试核心问**：
- 窗口函数和 `GROUP BY` 的本质区别是什么？什么场景必须用窗口函数？
- JSONB 和 JSON 有什么区别？为什么生产优先选 JSONB？
- GIN 索引适合什么场景？为什么 B 树索引不适合给 JSONB 字段的包含查询加速？
- `pgvector` 的三种距离算子分别对应什么相似度度量？RAG 系统里通常用哪种？
- 向量数据量大了之后为什么需要近似索引（HNSW/IVFFlat）而不是精确检索？代价是什么？

---

### 第 16 篇：GraphQL+Apollo: Schema 设计/Resolver/DataLoader N+1/Server 实战（生产收藏级）

**副标题**：类型系统与 Schema First 设计、Resolver 执行机制、N+1 查询问题与 DataLoader 批处理、对比 RESTful

#### 一、基本使用

- Schema 定义：`type Patient { id: ID! name: String! prescriptions: [Prescription!]! }`，标量类型/对象类型/枚举/接口
- Query/Mutation/Subscription 三种操作类型：查询患者信息、新建处方（Mutation）、订阅检验报告实时更新（Subscription）
- Apollo Server 基本搭建：`ApolloServer({ typeDefs, resolvers })`
- 客户端查询实践：一次请求同时获取患者基本信息+最近三次处方（体现"按需查询，避免 RESTful 的过度获取/获取不足"）
- Apollo Client（前端）的缓存与 `useQuery`/`useMutation` hooks 基本用法

#### 二、企业最佳实践

- **GraphQL vs RESTful 的选型**：RESTful 以资源 URL 组织，字段由服务端预先决定（易「过度获取」或「获取不足」）；GraphQL 一个 endpoint + 客户端自定义查询，把「取什么字段」的决定权交给客户端。**服务端能力边界由 Schema 定义，客户端决定具体取什么**——端多、字段碎片化严重时 GraphQL 优势明显，端少需求简单时手写 BFF REST 更直接（呼应第 10 篇）
- **Schema First 契约先行**：先设计 Schema 作为前后端契约，前端用 mock 并行开发、后端逐步实现真实 Resolver——这是「集成任何后端接口前先确认接口结构」这条工程规范在 GraphQL 场景的落地
- **N+1 问题与 DataLoader 的解决结论**（重点）：查询「10 位患者及各自处方」时，若 patients Resolver 查一次、每个患者 prescriptions 再各查一次，就是 1+10 次查询——这是字段级 Resolver 设计的典型副作用，嵌套越深越严重。**解法是 DataLoader：把同一请求内触发的多次「按 ID 查询」合并成一次 `WHERE id IN (...)` 批量查询，并对重复 ID 去重**，从根本消除 N+1
- **Subscription 的取舍**：Subscription 基于 WebSocket 做服务端推送，适合「检验报告实时更新」这类低延迟通知；但引入连接管理复杂度——**不是所有实时场景都值得上，轮询 + 短 TTL 缓存有时更简单**

#### 三、注意事项

- **Resolver 深层嵌套放大 N+1**：越深的关联字段越容易产生 N+1，接入 DataLoader 前先评估真实查询次数，别只盯着表层字段
- **Schema 权限控制**：GraphQL 把「取什么」交给客户端，也放大了越权风险——敏感字段（如医生私人备注、患者隐私）必须在 Resolver 层做角色校验，不能只靠「客户端不请求这个字段」来保护
- **缓存失效复杂化**：GraphQL 单 endpoint + 任意查询形状，传统基于 URL 的 HTTP 缓存策略失效，需要更细粒度的字段级缓存或规范化缓存（如 Apollo Client 的实体缓存），这比 REST 缓存复杂得多
- **Schema 演进与破坏性变更**：客户端依赖具体字段，删字段/改类型会破坏客户端——需要字段废弃（`@deprecated`）、版本化或渐进演进策略

**面试核心问**：
- GraphQL 相比 RESTful 解决了什么核心问题？分别对应"过度获取"和"获取不足"的哪种场景？
- 什么是 N+1 查询问题？它是怎么在 GraphQL 的 Resolver 模型下产生的？DataLoader 怎么解决？
- Schema First 的协作模式相比传统前后端接口对接方式有什么优势？
- GraphQL 的安全风险和缓存策略相比 REST 有什么不同？
- GraphQL Subscription 是怎么实现服务端推送的？什么场景不值得引入 Subscription？

---

### 第 17 篇：Node.js 测试与部署: 测试分层/supertest/Docker多阶段构建/PM2与Cluster多进程（生产收藏级）

**副标题**：单元测试与集成测试分层、supertest 进程内请求模拟、多阶段构建镜像、cluster 多进程与 PM2 进程守护

> 原大纲把测试/部署/消息队列/安全/内存泄漏排查 7 个话题塞进一篇，密度过高必然被压扁成浅层罗列。已拆分为两篇：本篇聚焦"怎么测试、怎么打包部署、怎么利用多核"；下一篇聚焦"任务解耦、安全、可观测性"。

#### 一、基本使用

- 测试体系：Jest/Vitest 单元测试基本写法，`supertest` 对 Express/Koa 应用做 HTTP 层集成测试（不需要真实启动监听端口）
- Mock 数据库依赖：单元测试中用内存实现或 mock 库替换真实数据库连接
- Dockerfile 基本结构：`FROM node:20-alpine`，多阶段构建（builder 阶段装依赖编译，production 阶段只拷贝构建产物，减小镜像体积）
- PM2 基本用法：`pm2 start app.js -i max`（按 CPU 核数启动多个实例），`pm2 logs`/`pm2 monit`
- Node.js 内置 `cluster` 模块手动启动多进程

#### 二、企业最佳实践

- **测试金字塔分层**：单元测试聚焦单一函数/模块（快、不依赖外部、大量覆盖边界）；集成测试验证多模块协作（一次完整 HTTP 请求）；端到端测试验证真实用户路径（最少、最慢、最贵）——**比例分配「大量单元、少量集成、极少端到端」是测试体系性价比的关键**
- **`supertest` 进程内模拟**：不监听真实端口，直接把 app 实例传给 `supertest` 做进程内请求（复用 Node `http` 模块但绕开 TCP 网络层）——集成测试更快、不受端口占用影响
- **Docker 多阶段构建**：builder 阶段装全依赖 + 编译，production 阶段用更小基础镜像只 `COPY` 构建产物和 `npm ci --omit=dev` 的生产依赖——把「构建工具链」和「运行时最小依赖」隔离，显著减小镜像、缩小攻击面
- **单进程瓶颈与多进程扩展**：Node 单线程单核，`cluster` 通过 `fork` 多个工作进程共享端口（主进程轮询分发或内核负载均衡），让吞吐随核数扩展；PM2 的 `-i max` 本质是 `cluster` 封装 + 进程守护 + 日志管理
- **`cluster` vs `worker_threads` 分工**（呼应第 05 篇）：水平扩展用 `cluster`（多进程隔离、多核并发）；单请求内夹带的 CPU 密集计算用 `worker_threads`（不阻塞事件循环）——**`cluster` 扩展吞吐，`worker_threads` 保单个请求不卡，生产两者各管一层**
- **工程落地（`apps/his-api`）**：给 `apps/his-api` 搭多阶段构建 Dockerfile（对比单/多阶段镜像体积）、用 `cluster` 改造成多进程（响应体带 `process.pid` 验证分发）、给核心路由补 `supertest` 集成测试

#### 三、注意事项

- **多进程下的状态共享坑**：进程内存（内存态 Session、内存缓存）各进程独立，不能假设「这次和上次请求同进程」——跨请求共享状态必须放 Redis 等外部存储（这是从单进程到多进程部署最容易踩的坑，也是第 11 篇 Serverless 无状态原则的姊妹题）
- **测试环境的端口/外部依赖**：集成测试若真实监听端口会互相冲突、受环境变量影响，务必用 `supertest` 进程内模拟 + mock 外部依赖，保证测试可重复
- **镜像体积治理**：把所有依赖打进镜像会导致体积膨胀、拉取慢、攻击面大——用多阶段构建 + 只装生产依赖 + 排除 `devDependencies`
- **PM2/集群下的日志与崩溃**：多实例日志需要聚合，崩溃自动重启只是兜底，不能掩盖根因——配合健康检查与日志收集，避免「崩了就重启、重启了还崩」的死循环

**面试核心问**：
- 测试金字塔的分层策略是什么？为什么端到端测试的数量应该最少？
- Docker 多阶段构建解决了什么问题？为什么能显著减小最终镜像体积？
- Node.js 是单线程的，`cluster` 模块是怎么利用多核 CPU 的？
- `cluster` 和 `worker_threads` 在生产架构里分别解决什么问题？能不能互相替代？
- 多进程部署下，为什么不能用进程内存存储 Session？

---

### 第 18 篇：Node.js 可观测性与安全: 消息队列解耦/安全实践/内存泄漏排查/APM 链路追踪（生产收藏级）

**副标题**：消息队列任务解耦与 ACK 机制、常见安全风险面与自动化防护、内存泄漏排查方法论、分布式追踪与 APM 基础

> 从测试与部署篇拆出的第二篇，聚焦生产运行时的"看得见、防得住"——可观测性和安全不是测试通过就能保证的，需要独立的方法论。

#### 一、基本使用

- `node --inspect` 配合 Chrome DevTools 做 CPU Profile 和堆内存快照分析
- 消息队列基础：用 `amqplib` 连接 RabbitMQ 发布/消费一条"AI 推理任务"消息，理解队列如何解耦"提交任务"和"处理任务"两个环节
- Node 安全实践：`helmet` 中间件一键设置安全响应头，`npm audit`/`pnpm audit` 扫描依赖漏洞
- OpenTelemetry Node.js SDK 基本接入：自动埋点 HTTP/数据库调用，导出到本地 Jaeger/Zipkin 查看一次请求的完整调用链

#### 二、企业最佳实践

- **消息队列解耦的设计思想**：把「任务提交」和「任务处理」通过队列解耦——生产者丢消息立即返回，消费者按能力取任务，吞吐不互相绑定；对「AI 推理」这类耗时不确定的任务尤其重要（先返任务 ID，客户端轮询/WebSocket 收完成通知）；**ACK 机制保证消费者失败时消息不丢，可重入队或进死信队列**
- **Node 安全风险面与自动化**：SQL 注入（永远参数化查询/ORM 绑定参数，不拼 SQL 字符串）、依赖供应链（`npm audit`/`pnpm audit` 定期扫描 + CI 门禁）、缺失安全响应头（`helmet` 一次补齐 `X-Content-Type-Options`/`X-Frame-Options`/CSP，具体各头防御的攻击见《网络原理》第 07 篇）——**重点是「把检查自动化嵌入 CI」，而不是靠人工记忆**
- **内存泄漏排查方法论**：泄漏常见于全局缓存无限增长、`EventEmitter` 反复 `on` 不 `off`、闭包持有大对象；排查用 `--inspect` + Chrome DevTools 多次堆快照对比，找「两次快照间持续增长且不该增长」的对象类型，再用 Retainer 视图追「被谁持有」
- **分布式追踪与 APM**：单机排障靠日志，分布式系统一次请求跨网关/微服务/DB/MQ，需要 Trace（完整调用链）/Span（链上操作单元）/Context Propagation（跨服务传 trace id，HTTP 头 `traceparent`）三概念；APM（Jaeger/Zipkin/Datadog）聚合 Span 成火焰图定位「慢在哪」
- **工程落地（`apps/his-api`）**：接入真实 RabbitMQ 做「AI 问诊任务」异步通道（生产者立即返回任务 ID）；`node --inspect` 走一遍两次堆快照对比定位泄漏；接 OpenTelemetry 自动埋点 + 本地 Jaeger 看「查询患者信息（触发 DB + Redis）」的完整火焰图

#### 三、注意事项

- **消费者失败重入与死信**：消费者处理失败若不正确 ACK/NACK，会死循环重试或静默丢消息——要设计好重试上限和死信队列，避免「坏消息卡死队列」
- **监控告警与日志留存**：可观测性不是「接上 APM 就完事」，要配阈值告警、日志分级与留存策略，否则故障发生时既没告警也没历史日志可查
- **内存泄漏的隐蔽性**：泄漏通常缓慢累积、线上才暴露——要在压测阶段就做堆快照基线对比，而不是等 OOM 告警再排查
- **安全是持续过程**：一次审计通过不代表一直安全，依赖漏洞会新出现、配置会漂移——把审计和门禁放进每次 CI，而非一次性排查

**面试核心问**：
- 消息队列解耦"生产任务"和"消费任务"具体解决了什么问题？消息确认机制（ACK）的作用是什么？
- 排查一次 Node.js 内存泄漏，你的思路是什么？会用到哪些工具？
- Node.js 常见的安全风险有哪些？怎么把安全检查自动化嵌入 CI？
- 分布式追踪解决了什么问题？Trace/Span/Context Propagation 分别是什么？

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
https://opentelemetry.io/docs/languages/js/
```

- `nodejs.org`：Node.js 官方文档，覆盖第 03/04/05 篇核心模块与 API 权威参照
- `libuv.org`：事件循环底层实现参照，覆盖第 02 篇
- `expressjs.com`/`koajs.com`/`docs.nestjs.com`：三大框架官方文档，覆盖第 07/08/09 篇
- `dev.mysql.com`/`mongodb.com`/`redis.io`/`postgresql.org`：四大数据库官方文档，覆盖第 12/13/14/15 篇
- `pgvector`：向量检索扩展文档，覆盖第 15 篇 AI 关联小节
- `graphql.org`/`apollographql.com`/`graphql/dataloader`：覆盖第 16 篇
- `jestjs.io`/`docs.docker.com`/`pm2.keymetrics.io`：覆盖第 17 篇测试与部署
- `rabbitmq.com`/`helmetjs.github.io`/`opentelemetry.io`：覆盖第 18 篇可观测性与安全

> 网络协议原理（HTTP 演进/HTTPS/TLS/DNS/TCP/WebSocket/跨域安全/HTTP 缓存/RESTful-GraphQL 设计对比）已独立为《网络原理》系列，见 `docs/plans/network-principles-series-outline.md`，本系列不再重复列出对应 RFC/MDN 参考链接。

> 引用规范：正文中不出现具体博主名/账号名/人名，仅在文末参考池中列官方文档或权威开源仓库 URL；「工程落地参考」章节标注的路径以对应开源仓库当前主分支目录结构为准，写作时需核对当前版本号是否与文中描述一致。

---

*规划时间：2026-09-10 | 修订记录：① 拆分工程化篇为「测试与部署」「可观测性与安全」两篇；② 04/05 篇内容归属调整（静态资源服务器/WebSocket 实现移入 05 篇）；③ 引入 `apps/his-api` 项目主线贯穿 07~18 篇；④ 同步网络原理系列篇号引用；⑤（2026-09-11）新增第 10 篇「BFF 架构模式」，原 10~16 篇顺移为 11~17 篇，全系列由 16 篇增至 17 篇；⑥（2026-09-21）篇章结构统一为《数据结构与算法》系列的五段式（使用与实践 → 设计与原理 → 工程落地参考 → 实践演示与验证 → 参考），原「源码解析」段降级为「工程落地参考」、原「手写实现/最佳实践」段统一为「实践演示与验证」，保留 `medai-node-source` 手写仓库与 `apps/his-api` 项目主线；⑦（2026-09-22）新增第 11 篇「Serverless 架构」，原 11~17 篇顺移为 12~18 篇，全系列由 17 篇增至 18 篇；第 11 篇起统一「基本使用 / 企业最佳实践 / 注意事项」三段式，删除源码级剖析与 `packages/mini-*` 手写实现，实践落地收敛到 `apps/his-api` 项目主线 | 参考：Node.js 官方文档 / 各框架与数据库官方文档 / roadmap.sh Node.js 路线图理念*

