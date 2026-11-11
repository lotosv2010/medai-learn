# 并发、超时与 SDK 收口：从脚本到可切换的包（面试收藏级）

> 面试官把一道题摆你面前：同时问 3 个模型做对比，`await Promise.all([a, b, c])`，其中一个网络抖动超时——另外两个即使成功了，结果你也拿不到。更尴尬的是，翻开前六篇的实验代码，`runner.ts`、`retry.ts`、三个脚本里一共 5 处硬编码了 provider 名字。这两个现象，就是本篇要解决的全部问题。

---

## 🎯 这篇文章解决什么问题

阶段二「应用底座」前面六篇，按「一次调用从发出到被消费」的链路铺完了六块地基：请求发得出去（01）、响应流得回来（02/03）、输出变成可靠数据（04）、模型能提动作（05）、机器能比相似（06）。

但这六块地基还缺一条横切它们的能力——**异步与并发**：当你要一次调 20 个模型、要扛住超时、要在一个 provider 连续故障时先别打它，怎么办？

以及一个更本质的收口：前面六篇的代码都是**脚本**，散在 `labs/` 里、provider 名写死。怎么把它们收成一个**能切换的包**——换模型只改一行，且这一行有测试兜底？

本篇就讲这两件事：

- 并发控制的五个面：事件循环、`Promise.all`/`allSettled`/信号量、超时与重试、熔断器、背压
- SDK 收口的两刀：接口怎么拆、契约测试守什么

读完你能拿到：一个三态熔断器的最短实现、一个带 jitter 的退避函数、一份「换模型只改一行」的接口设计，以及四组跑出真实数字的实验。照旧，每段配「面试官会怎么问」。

---

## 🔍 概念：并发是「收得回来」，收口是「把换一家变成一次配置」

先看两个现象，它们背后是两种「不对等」。

**现象一**：`Promise.all` 是**全有或全无**。上面那道题就是——一个超时，整批结果全丢，你连另外两个已经算好的答案都拿不到。

**现象二**：01~06 的代码跑得好好的，现在要把主力从 DeepSeek 换成通义，你会发现 provider 名散落在五个文件里。抽个函数只能解决「调用写法」，解决不了更深的两件事：

- **能力不对等**：DeepSeek 没有 embedding 接口（06 篇已经验证）。如果 `AIProvider` 接口同时要求 `chat` 和 `embed`，你就逼着 DeepSeek 实现一个它做不到的假 `embed`。
- **格式不对等**：三家的流式增量、错误体、usage 字段各不相同（01 篇的四类差异）。

> 💬 **面试官**：`Promise.all` 和 `Promise.allSettled` 有什么区别？AI 批量调用你选哪个？
>
> ✅ **标准答案**：`Promise.all` 全有或全无，一个 reject 整批 reject，适合「缺一个结果就没意义」的场景；`Promise.allSettled` 等所有 promise 落定，返回每个的 `fulfilled` 或 `rejected`，适合「有几个用几个」。AI 批量调用（比如同时问 3 个模型对比输出）默认用 `allSettled`——因为一个模型超时不代表另外两个的答案作废。
>
> 🎁 **加分答案**：补一句「真正生产批量调用的形态既不是 `all` 也不是裸 `allSettled`，而是**信号量限流 + `allSettled` 归集**」。因为 `all`/`allSettled` 都管不住「同时打出去多少个」——20 个请求无脑并发，会把对方 QPS 打穿。一句话：**`all` 管成败，`allSettled` 管归集，信号量管节奏**。

---

## ⚙️ 深入：五个面，一个执行器；三个接口，一次收口

### 面一：事件循环与 LLM 调用

LLM API 是典型的 I/O 密集型：等网络返回的时间远大于 CPU 计算时间。所以「并发」在 Node 里几乎不消耗 CPU——`Promise.all` 起 20 个请求，主线程只是发了 20 个 `fetch` 然后干等。

这意味着真正的约束**不在本机线程数**，在对方。所以要管的是「一次打出去多少个」（信号量），而不是「本机能开多少线程」。

### 面二：`Promise.all` / `allSettled` / 信号量

三者的分工一句话说清，实验 A 会用真实数字验证：

- `Promise.all` —— 管**成败**，全有或全无
- `Promise.allSettled` —— 管**归集**，拿到所有结果与错误
- 信号量 —— 管**节奏**，把并发数压在 N 以内

信号量的最短实现，就是下面这十几行——一个计数器加一个等待队列：

```typescript
export class Semaphore {
  private waiters: Array<() => void> = []
  private slots: number
  constructor(slots: number) { this.slots = slots }

  private acquire(): Promise<void> {
    if (this.slots > 0) { this.slots--; return Promise.resolve() }
    return new Promise<void>((resolve) => this.waiters.push(resolve))
  }
  private release(): void {
    const next = this.waiters.shift()
    if (next) next(); else this.slots++
  }
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire()
    try { return await fn() } finally { this.release() }
  }
}
```

### 面三：超时与重试，退避必须加 jitter

超时用 Node 18+ 内置的 `AbortSignal.timeout(ms)`，不需要手写 `setTimeout + reject`。重试用指数退避 `base * 2^n`——但**必须加 jitter**：

```typescript
export function backoffMs(attempt: number, baseMs: number, jitter = true): number {
  const exp = baseMs * 2 ** attempt
  return jitter ? exp * (0.5 + Math.random()) : exp  // 👈 不加 jitter，重试全撞同一秒
}
```

为什么必须加 jitter？不加的时候，同一秒失败的一批请求，退避间隔完全相同，会在**同一个毫秒**再次撞向对方，把限流从「一次」打成「雪崩」。加了随机抖动，重试各自错开。实验 B 会把这件事量化给你看。

还有一条边界容易漏：**「超时」不等于「失败」**。超时应归 `retryable`（01 篇的分类表），但超时的请求**可能已经在服务端计费了**——重试前要清楚自己可能为同一个任务付了两次钱。所以重试要有上限，且「重试哪些错误」要用 01 篇的判据，写成一个函数：

```typescript
export function isRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  if (/401|402|400|422/.test(msg)) return false
  return /429|500|503|timeout|aborted|fetch failed/i.test(msg)
}
```

### 面四：熔断器三态

熔断器是 01 篇「连续失败 N 次踢出链」的正式实现。三个状态：`closed`（正常放行）→ 连续失败 N 次 → `open`（直接拒绝，先别打它）→ 冷却结束 → `half-open`（放一个探针试探，成功回 `closed`、失败回 `open`）：

```typescript
export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private failures = 0
  private openedAt = 0
  constructor(private threshold = 3, private cooldownMs = 2000) {}

  canCall(): boolean {
    if (this.state === 'open' && Date.now() - this.openedAt >= this.cooldownMs) this.state = 'half-open'
    return this.state !== 'open'
  }
  recordSuccess(): void { this.state = 'closed'; this.failures = 0 }
  recordFailure(): void {
    this.failures++
    if (this.state === 'half-open' || this.failures >= this.threshold) {
      this.state = 'open'; this.openedAt = Date.now()
    }
  }
}
```

![Martin Fowler 文章里的熔断器三态图：正常时处于 closed 状态放行所有调用，连续失败达到阈值就跳到 open 直接拒绝，冷却一段时间后进入 half-open 放一个试探请求，成功回到 closed、失败重新 open](https://martinfowler.com/bliki/images/circuitBreaker/state.png)

这张图是熔断器最经典的三态状态机。要看见的核心不是「它挡了多少请求」，而是**熔断和重试的区别**：重试是「更努力地打」，熔断是「故障期先别打它」——保护自己也保护对方。

### 面五：背压与死信（一段带过）

背压：上游产出快于下游消费（流式场景常见），要么暂停读、要么丢弃中间帧。死信队列：重试耗尽后不丢弃，落盘等人工补偿。这两个本篇不展开代码，知道它们和熔断同属「失败不扩散」这个家族即可。

### 收口：接口拆两刀，契约测试守边界

前面五个面凑成一个「执行器」；但执行器要服务的，是那个「能切模型」的接口。接口拆分的依据，就是 01 篇那张能力矩阵：

```typescript
export interface ChatProvider {
  readonly modelId: string
  chat(messages: ChatMessage[], signal?: AbortSignal): Promise<ChatResult>
  streamChat(messages: ChatMessage[], signal?: AbortSignal): AsyncIterable<Delta>
}

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>
}
```

**为什么 `chat` 和 `embed` 必须拆成两个接口？** 因为不是所有 chat provider 都能 embed——DeepSeek 就只有 chat 没有 embedding。塞进一个接口，就是**接口隔离原则（ISP）违例**：逼着实现类提供它做不到的能力。

拆开之后，「换模型只改一行」就有了类型学基础：`DeepSeekAdapter implements ChatProvider`（没有 embed），`QwenAdapter implements ChatProvider, EmbeddingProvider`（两个都有）。编译期就能拦住「把 DeepSeek 当 EmbeddingProvider 用」这类误用。

而「这一行有测试兜底」靠的是**契约测试**——它不是「某个实现逻辑正确」的单元测试，而是「所有实现行为一致」：任何新 Adapter 只要通过这套用例，就能保证正常、流式、429 降级、401 抛出、超时、abort、空 content、长回答，行为与既有实现对齐。它是一份**可执行的接口文档**。

> 💬 **面试官**：为什么 `chat` 和 `embed` 要拆成两个接口？不拆会怎样？「换模型只改一行」，这一行该在什么位置？
>
> ✅ **标准答案**：因为能力不对等——不是所有能聊天的模型都能算向量，DeepSeek 就没有 embedding 接口。不拆的话，`AIProvider` 同时要求 `chat` 和 `embed`，DeepSeek 被迫实现一个假 `embed`，这是接口隔离原则违例。拆开后「换模型只改一行」的那一行在**工厂函数**里——`createProvider(config)` 启动时注入，业务层只依赖接口，别处根本没有模型名。
>
> 🎁 **加分答案**：能点出「为什么要有这条包边界」——SDK 一旦开始懂业务，就会开始为业务写特例，最后变成第二个 Controller 层。所以 `packages/ai-sdk` 只拥有接口定义、Adapter、错误分类、路由、执行器；不拥有业务 Prompt、Schema（业务方定义）、缓存策略（阶段三）、检索（阶段四）。

🔧 **真实场景**：一个用药咨询网关，凌晨两点 DeepSeek 开始持续 503。熔断器第 4 次失败后自动把 DeepSeek 标为 open，后续请求直接走备用通义——用户无感，账单没白烧。这就是「重试 3 次 + 熔断 + 降级」组合拳的意义：不是把同一个故障重试 9 遍，而是快速失败、换一条路。

---

## 🧪 动手实验：四组实验，全 mock、零成本

> **说明**：实验代码 `labs/phase2-api/07-concurrency-sdk/`。错误场景全部走 `_sdk/mock-provider.ts` 注入（假模型），零 API 成本。跑法：`pnpm --filter @medai/labs p2-sdk` 跑实验 A/B/C，`pnpm --filter @medai/labs p2-sdk-test` 跑实验 D 的契约测试。

### 实验 A：三种策略的墙钟时间与成功率

20 个任务，其中 4 个慢响应（20%）、2 个 500（10%）、14 个正常，分别用三种策略跑（2026-11-11 实测）：

| 策略 | 墙钟时间 | 成功 | 失败 | 总请求 |
|---|---|---|---|---|
| `Promise.all` | 1ms（首个失败即停） | 0（整批丢） | — | 20 |
| `Promise.allSettled` | 2014ms（等最慢者） | 14 | 6 | 20 |
| 信号量 + 退避 jitter | 5502ms | 20 | 0 | 26 |

三个数字往这一摆，结论就出来了：

- **`Promise.all` 失败得最快**——1ms 就撞上第一个 500，整批 20 个结果全丢，包括那 14 个已经算好的
- **`allSettled` 保留了部分结果**——14 个成功的都归集回来了，但 6 个失败的（4 慢超时 + 2 五百）也都在
- **信号量 + 退避最慢但全成功**——慢任务超时后被退避重试捞了回来，500 也被重试恢复，成功率 100%，代价是总请求数从 20 涨到 26

注意第三行：**信号量策略的墙钟时间（5.5s）反而比 `allSettled`（2s）长**。这不是失败，而是**拿时间换成功率**——限流把并发压到 3，慢任务又各退避重试了一次，所以慢，但一个都不丢。这正是本篇的核心结论：**并发控制的目标不是「更快」，是「失败不扩散、成本可控、系统能恢复」**。

### 实验 B：jitter 把重试打散

模拟 8 个请求在同一时刻失败，看它们退避后各自被排到哪些时刻（2026-11-11 实测）：

```text
无 jitter：8 个请求的重试总等待全是 3500ms → 去重后只有 1 个时刻
有 jitter：2816 / 3229 / 3469 / 3212 / 3286 / 4961 / 4208 / 4212 → 去重后有 8 个时刻
```

无 jitter 时，8 个请求的重试**精确落在同一毫秒**——等于把 8 个请求捏成一个更大的「请求波」，对方限流计数瞬间被戳穿。加了 jitter，8 个请求各自错开到不同时刻，限流压力被摊平。

![AWS 架构博客里「无退避时完成时间随竞争度暴涨」的实测曲线：横轴是同时竞争的客户端数，纵轴是完成时间，竞争越激烈完成时间越是指数级恶化——这就是没有 jitter 时「重试风暴」的代价](https://d2908q01vomqb2.cloudfront.net/fc074d501302eb2b93e2554793fcaf50b3bf7291/2017/10/03/exponential-backoff-and-jitter-blog-figure-1.png)

这张图来自 AWS 架构博客那篇经典的《Exponential Backoff and Jitter》，它量化了「为什么必须 jitter」：没有抖动时，客户端越多、完成时间越是指数恶化，因为你制造了一场重试风暴。

### 实验 C：熔断器何时 open

让一个 provider 连续返回 500，观察它的状态（2026-11-11 实测）：

```text
第 1 次：500 失败，连续失败计数 +1
第 2 次：500 失败，连续失败计数 +1
第 3 次：500 失败，连续失败计数 +1
第 4 次：熔断器 open，直接拒绝（不打它）
...（第 5~10 次全部直接拒绝）
```

前 3 次还真的去打（真实请求 3 次），达到阈值后第 4 次起全部被熔断拒绝，请求数骤降为 0。**这就是「先别打它」**——不是「重试更努力」，是「故障期保护自己与对方」。

### 实验 D：接口拆分 + 契约测试

`_sdk/types.ts` 里 `ChatProvider` 和 `EmbeddingProvider` 拆成两个接口；`adapters.ts` 里 `DeepSeekAdapter` 只实现 `ChatProvider`、`QwenAdapter` 两个都实现。契约测试用假模型跑 10 条用例，其中第 ⑩ 条专门验证接口边界：

```typescript
test('⑩ 接口契约：ChatProvider 不要求 embed（ISP）', async () => {
  const fake: ChatProvider = new MockChatProvider('mock')
  assert.equal(typeof fake.chat, 'function')
  assert.equal(typeof fake.streamChat, 'function')
  // @ts-expect-error —— embed 不属于 ChatProvider，访问应报类型错
  assert.equal(fake.embed, undefined)
})
```

这条用例用 `@ts-expect-error` 把「`ChatProvider` 不含 `embed`」这条**类型契约**变成了可执行断言：如果你哪天把 `embed` 加回了 `ChatProvider`，这行 `@ts-expect-error` 会立刻报「这里不该有类型错」，测试失败——契约测试就是靠这种「反向断言」守住边界的。

跑 `pnpm --filter @medai/labs p2-sdk-test`，10 条全绿。第 ④ 条「401 不重试」最值钱：它验证了 `isRetryable` 判据——401 只调 1 次就直接抛，而不是白烧 3 次。

---

## 🚧 总结与边界

本篇压成一句话：

> **`Promise.all` 只适合「全成功才有意义」；生产批量调用的默认形态是「限流 + 超时 + 退避带 jitter + 熔断」。**

四条推论：

- **`all` 管成败、`allSettled` 管归集、信号量管节奏**——三者分工，批量调用默认「信号量限流 + `allSettled` 归集」
- **退避必须加 jitter**——否则同一批失败在同一毫秒重试，把限流打成雪崩
- **熔断 ≠ 重试**——重试是更努力地打，熔断是故障期先别打它
- **`chat` 和 `embed` 拆两个接口是 ISP**——不是所有 chat provider 都能 embed，DeepSeek 就是反例

现在回指 01 篇立下的五条验收清单，逐条打勾：

1. ✅ 能切 3 家模型，业务代码不改——`createProvider('dashscope')` 改一行
2. ✅ SSE 首字节 < 1s——02 篇的 `curl -N -w` 已测
3. ✅ 结构化输出解析非法率 0——04 篇的 `json_schema` + Zod 已挡
4. ✅ 并发 3 时部分失败不拖垮整批——本实验策略 3，成功率 100%
5. ✅ 换模型只改一行，且这一行有测试兜底——契约测试 10 条全绿

**阶段二到这里收官**，路线图的三条里程碑都能答上了：多模型可切换 + SSE 流式 + 结构化输出的最小 Node 服务；前端打字机不卡顿；并发调用多模型、控制并发数、处理超时降级。

一个有意识的落点说明：本篇的 SDK 骨架与契约测试在 `labs/phase2-api/07-concurrency-sdk/_sdk/` 落地成可运行演示。正式搬进 `packages/ai-sdk` 并接入 `pnpm typecheck` 属于工程化动作，留到阶段六上框架时一并完成——那时用 Vercel AI SDK 重写，你会有更强的「框架替我省了哪 200 行」的体感。

有意识地留到后面：

- **上下文组装、历史压缩、长期记忆、Prompt 缓存** → 阶段三
- **把这个网关接上说明书检索** → 阶段四
- **用 Vercel AI SDK 重写并对比代码量** → 阶段六
- **评估、监控、安全、成本** → 阶段九

---

## 🎤 面试追问链

**追问一：`Promise.all` 和 `Promise.allSettled` 的区别？AI 批量调用你选哪个？**

见「概念」章。加分点：生产批量调用的默认形态是「信号量限流 + `allSettled` 归集」，`all` 管成败、`allSettled` 管归集、信号量管节奏。

**追问二：指数退避为什么必须加 jitter？**

不加 jitter 时，同一秒失败的 N 个请求退避间隔完全相同，会在同一个毫秒同时重试，把「一次限流」放大成「重试风暴」。加 jitter 把重试打散到不同时刻，摊平限流压力。实验 B 的量化结果：无 jitter 时 8 个请求重试去重后只有 1 个时刻，有 jitter 后有 8 个时刻。

**追问三：熔断器的三个状态是什么？它和重试的区别在哪？**

`closed`（放行）→ 连续失败 N 次 → `open`（直接拒绝）→ 冷却结束 → `half-open`（放一个探针）。和重试的区别：重试是「更努力地打」，熔断是「故障期先别打它」，保护自己也保护对方。

**追问四：为什么 `chat` 和 `embed` 要拆成两个接口？不拆会怎样？换模型只改一行，这一行该在什么位置？**

见「收口」章。因为能力不对等（DeepSeek 无 embedding），不拆就是 ISP 违例。换模型那一行在工厂函数 `createProvider(config)`，业务层只依赖接口。

**追问五：契约测试和单元测试有什么区别？**

单元测试守「某个实现逻辑正确」，契约测试守「所有实现行为一致」。契约测试是可执行的接口文档：任何新 Adapter 通过这套用例，就保证行为与既有实现对齐。它靠「反向断言」（如 `@ts-expect-error`）守住类型契约。

---

## 📝 留个问题

给你一个生产事故现场：

你的网关链是 DeepSeek → 通义 → 某开源自部署。凌晨两点流量高峰，你写的是 `Promise.all` 并发 20 个请求。DeepSeek 突然返回 429，通义返回 429，自部署返回 500。用户端开始成片报错。

- 先用一句话诊断：这个事故里，`Promise.all` 的哪个特性放大了故障？
- 如果你只能改一处，你会把 `Promise.all` 换成什么？为什么它能把「成片报错」变成「部分可用」？
- 当三个 provider 同时被打穿时，熔断器还能救吗？这说明了什么——是模型侧的问题，还是别的什么？

提示：不是「哪家还能用」的问题，是「当一个错误同时打穿了三家，它可能根本不是模型侧的问题」。

---

## 📚 参考来源

**① 本篇配图**

- 熔断器三态图：Martin Fowler《Circuit Breaker》文章配图。搜索关键词「Martin Fowler CircuitBreaker」
- 无退避时完成时间随竞争度暴涨曲线：AWS Architecture Blog《Exponential Backoff and Jitter》。搜索关键词「aws exponential backoff jitter」

**② 官方文档与规范（2026-11-11 实验核实）**

- Node.js — `AbortSignal.timeout`：搜索关键词「Node.js AbortSignal timeout」
- Martin Fowler — Circuit Breaker（熔断器三态）：搜索关键词「martinfowler circuit breaker」
- AWS — Timeouts, retries, and backoff with jitter：搜索关键词「aws retries backoff jitter」

**③ 本项目实验代码**

- 实验目录：`labs/phase2-api/07-concurrency-sdk/`（`index.ts` 实验 A/B/C、`contract.test.ts` 实验 D 契约测试、`_sdk/` 最小 SDK 骨架）
- `_sdk/` 组成：`types.ts`（ChatProvider / EmbeddingProvider 接口）、`retry.ts`（退避 + jitter + `isRetryable`）、`semaphore.ts`（信号量）、`circuit-breaker.ts`（三态熔断）、`mock-provider.ts`（假模型注入错误）、`adapters.ts`（DeepSeek / 通义 Adapter）
- 共用工具：`labs/shared/env.ts` 的 `printTable`
- 阶段二大纲：`docs/roadmap/ai-phase-02-api-foundation-outline.md`

---

> 🔖 这是「AI 工程」系列 · 阶段二「应用底座」第 7 篇。上一篇：《Embedding：把「意思相近」变成一道可以算的减法》；下一篇预告：阶段三 · 上下文工程（篇名待大纲定稿）
