# 并发控制（Concurrency Control）

> 记录时间：2026-05-29
> 关联模块：apps/ai-engine（LLM API 限流）、apps/api（数据库连接池）、apps/web（批量请求）
> 重要程度：⭐⭐⭐（面试高频系统设计题，字节/阿里二面常考「如何限制并发数」的完整方案）
> 前置知识：[[promise-handwrite]]、[[promise-combinators]]、[[event-loop]]、[[async-await]]

---

## 一句话总结（面试 30 秒版）

并发控制的本质是**在有限资源下调度异步任务的执行节奏** —— 信号量控制同时执行的数量，令牌桶控制单位时间内的请求频率，断路器在下游故障时快速失败，三者组合构成了生产级并发控制的完整方案。

---

## 核心概念

### 为什么需要并发控制？

```
没有并发控制的世界：

100 个请求同时发出
  ↓
  ├── 连接池耗尽（数据库最多 20 连接）
  ├── API 限流 429（第三方 API 每秒最多 10 次）
  ├── 内存暴涨（100 个响应同时在内存中）
  └── 下游服务雪崩（一个慢请求拖垮整个系统）

有并发控制的世界：

100 个任务排队 → 最多 5 个同时执行 → 完成一个补一个
  ↓
  ├── 连接池永远不会耗尽
  ├── 请求速率恒定在限制范围内
  ├── 内存占用可控
  └── 下游服务不会被打垮
```

### 并发控制的三大维度

| 维度 | 问题 | 解决方案 | 典型实现 |
|------|------|---------|---------|
| **数量控制** | 同时执行几个？ | 信号量（Semaphore） | p-limit、并发队列 |
| **速率控制** | 单位时间执行几个？ | 令牌桶 / 滑动窗口 | Bottleneck、rate-limiter |
| **容错控制** | 下游挂了怎么办？ | 断路器（Circuit Breaker） | Cockatiel、opossum |

---

### 1. 信号量（Semaphore）— 控制并发数量

信号量是最基础的并发原语，核心思想：**维护一个计数器，acquire 时减 1（为 0 则等待），release 时加 1（唤醒等待者）**。

```
信号量（limit = 3）的工作过程：

时间线：────────────────────────────────────────→

任务队列：[T1, T2, T3, T4, T5, T6, T7, T8]

执行池：
  T1 ████████░░░░░░░░  (完成，release)
  T2 ░░████████████░░  (完成，release)
  T3 ░░░░██████░░░░░░  (完成，release)
  T4 ░░░░░░░░██████░░  (等 T1 完成后 acquire)
  T5 ░░░░░░░░░░░░████  (等 T2 完成后 acquire)

并发数： 3  3  3  2  3  3  2  1  0
         ↑           ↑
       满载        T1 完成，T4 补位
```

**手写 Semaphore**：

```typescript
class Semaphore {
  private queue: Array<() => void> = []
  private running = 0

  constructor(private limit: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.limit) {
      this.running++
      return
    }
    // 等待 release
    return new Promise<void>(resolve => {
      this.queue.push(resolve)
    })
  }

  release(): void {
    if (this.queue.length > 0) {
      // 唤醒队列中的下一个
      const next = this.queue.shift()!
      next() // resolve 等待者的 acquire()
    } else {
      this.running--
    }
  }
}
```

**基于 Semaphore 的并发限制器**：

```typescript
async function parallelLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const semaphore = new Semaphore(limit)
  const results: T[] = new Array(tasks.length)

  await Promise.all(
    tasks.map(async (task, i) => {
      await semaphore.acquire()
      try {
        results[i] = await task()
      } finally {
        semaphore.release()
      }
    })
  )

  return results
}
```

---

### 2. p-limit 源码解析 — 生产级并发限制

`p-limit` 是 npm 上最流行的并发限制库（25M+ 周下载量），源码只有 40 行，但设计精巧。

**核心设计**：不用 `Semaphore` 类，而是用一个 `active` 计数器 + `queue` 微任务队列，通过 `Promise` 的 then 链实现自动调度。

```typescript
// p-limit 核心逻辑（简化版）
function pLimit(concurrency: number) {
  const queue: Array<() => void> = []
  let active = 0

  const next = () => {
    active--
    if (queue.length > 0) {
      queue.shift()!()  // 启动下一个任务
    }
  }

  const run = async <T>(fn: () => Promise<T>): Promise<T> => {
    // 如果达到并发上限，返回一个 Promise 等待唤醒
    if (active >= concurrency) {
      await new Promise<void>(resolve => queue.push(resolve))
    }
    active++
    try {
      return await fn()
    } finally {
      next()  // 无论成功失败，都释放一个槽位
    }
  }

  return run
}

// 使用
const limit = pLimit(5)

const results = await Promise.all(
  urls.map(url => limit(() => fetch(url).then(r => r.json())))
)
```

**为什么 p-limit 不用 `Semaphore` 类？**

| 设计选择 | p-limit | Semaphore 类 |
|---------|---------|-------------|
| 封装方式 | 闭包 + 工厂函数 | 类 + 实例方法 |
| 等待机制 | `await new Promise(resolve => queue.push(resolve))` | 同上（本质一样） |
| 任务调度 | `finally` 中自动调用 `next()` | 需要手动 `release()` |
| 内存 | 更轻量 | 多一层类开销 |

**关键洞察**：p-limit 的 `finally` 保证了即使任务抛异常，槽位也会被释放 —— 这是比手动 `acquire/release` 更安全的设计。

---

### 3. 令牌桶（Token Bucket）— 控制请求速率

信号量控制的是「同时在飞的请求数」，令牌桶控制的是「单位时间内的请求数」。两者解决不同的问题：

```
信号量：「我最多同时处理 5 个请求」
令牌桶：「我每秒最多发 10 个请求」

区别场景：
- 数据库连接池 → 信号量（同时最多 20 个连接）
- 第三方 API 限流 → 令牌桶（每秒最多 10 次调用）
```

**令牌桶原理**：

```
                 ┌─────────┐
  令牌以固定速率 → │  令牌桶  │ → 请求拿令牌 → 有令牌就执行
  (r 个/秒)      │ (容量 b) │              → 没令牌就等待
                 └─────────┘

桶容量 b = 允许的突发流量
填充速率 r = 持续允许的请求速率

例：b=10, r=5/秒
- 突发：可以瞬间发出 10 个请求（桶里存了 10 个令牌）
- 持续：之后每秒最多 5 个请求（每秒填充 5 个令牌）
```

**手写令牌桶**：

```typescript
class TokenBucket {
  private tokens: number
  private lastRefill: number
  private queue: Array<() => void> = []

  constructor(
    private capacity: number,     // 桶容量
    private refillRate: number    // 每秒填充令牌数
  ) {
    this.tokens = capacity
    this.lastRefill = Date.now()
  }

  private refill(): void {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsed * this.refillRate
    )
    this.lastRefill = now
  }

  async acquire(): Promise<void> {
    this.refill()

    if (this.tokens >= 1) {
      this.tokens--
      return
    }

    // 计算需要等待多久才能拿到一个令牌
    const waitTime = ((1 - this.tokens) / this.refillRate) * 1000

    return new Promise<void>(resolve => {
      setTimeout(() => {
        this.tokens = 0 // 消耗刚填充的令牌
        resolve()
      }, waitTime)
    })
  }
}

// 使用：每秒最多 10 个请求，桶容量 20
const bucket = new TokenBucket(20, 10)

async function rateLimitedFetch(url: string) {
  await bucket.acquire()
  return fetch(url)
}
```

---

### 4. 指数退避重试（Retry with Exponential Backoff）

并发控制不仅要限制数量和速率，还要处理失败。指数退避是重试策略的标准做法：

```
第 1 次重试：等 100ms
第 2 次重试：等 200ms
第 3 次重试：等 400ms
第 4 次重试：等 800ms
第 5 次重试：等 1600ms

指数退避 + 随机抖动（Jitter）防止惊群效应：
实际等待 = base * 2^attempt + random(0, jitter)
```

**为什么需要抖动？**

```
没有抖动：100 个客户端同时失败
  → 全部等 100ms
  → 100ms 后同时重试
  → 再次全部失败（雷群效应 / Thundering Herd）

有抖动：100 个客户端同时失败
  → 分别等 73ms, 142ms, 89ms, 201ms, ...
  → 请求分散在时间窗口内
  → 服务端压力均匀
```

**手写指数退避重试**：

```typescript
interface RetryOptions {
  maxRetries?: number       // 最大重试次数（默认 3）
  baseDelay?: number        // 基础延迟 ms（默认 1000）
  maxDelay?: number         // 最大延迟 ms（默认 30000）
  jitter?: boolean          // 是否加随机抖动（默认 true）
  retryIf?: (error: any) => boolean  // 是否值得重试
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    jitter = true,
    retryIf = () => true,
  } = options

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries || !retryIf(error)) {
        throw error
      }

      // 指数退避
      let delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)

      // 加随机抖动（防止惊群）
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5)
      }

      await new Promise(r => setTimeout(r, delay))
    }
  }

  throw new Error('unreachable')
}

// 使用：调用 LLM API，429 时自动重试
const response = await retryWithBackoff(
  () => callLLMAPI(messages),
  {
    maxRetries: 5,
    baseDelay: 1000,
    retryIf: (err) => err.status === 429 || err.status === 503,
  }
)
```

---

### 5. 断路器（Circuit Breaker）— 下游故障时快速失败

当下游服务持续故障时，不断重试只会加重负担。断路器模式：**连续失败 N 次后，直接"断开"，后续请求快速失败，过一段时间后半开尝试恢复**。

```
断路器状态机：

  ┌──────────┐  失败次数达到阈值  ┌──────────┐
  │  CLOSED  │ ──────────────→ │   OPEN   │
  │（正常通行）│                  │（快速失败）│
  └──────────┘                  └──────────┘
       ↑                            │
       │                    超时后尝试恢复
       │                            ↓
       │  恢复成功           ┌───────────┐
       └─────────────────── │ HALF-OPEN │
                            │（放一个请求试试）│
                            └───────────┘
                                  │
                          恢复失败 → 回到 OPEN
```

**手写断路器**：

```typescript
enum CircuitState {
  CLOSED = 'CLOSED',       // 正常通行
  OPEN = 'OPEN',           // 快速失败
  HALF_OPEN = 'HALF_OPEN', // 试探恢复
}

class CircuitBreaker {
  private state = CircuitState.CLOSED
  private failureCount = 0
  private lastFailureTime = 0
  private nextAttempt = 0

  constructor(
    private threshold: number = 5,      // 失败阈值
    private cooldown: number = 30000,    // 冷却时间 ms
    private halfOpenMax: number = 1      // 半开状态允许的试探次数
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() > this.nextAttempt) {
        this.state = CircuitState.HALF_OPEN
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failureCount = 0
    this.state = CircuitState.CLOSED
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.threshold) {
      this.state = CircuitState.OPEN
      this.nextAttempt = Date.now() + this.cooldown
    }
  }

  getState(): CircuitState {
    return this.state
  }
}

// 使用
const breaker = new CircuitBreaker(5, 30000)

async function callWithBreaker<T>(fn: () => Promise<T>): Promise<T> {
  return breaker.execute(fn)
}

// 调用 LLM API
try {
  const result = await callWithBreaker(() => callLLMAPI(messages))
} catch (err) {
  if (err.message === 'Circuit breaker is OPEN') {
    // 服务降级：使用缓存结果或提示用户稍后重试
  }
}
```

---

### 6. 组合实战：生产级并发控制方案

实际项目中，这几种模式通常组合使用：

```typescript
// 生产级请求调度器：令牌桶 + 指数退避重试 + 断路器
class RequestScheduler {
  private bucket: TokenBucket
  private breaker: CircuitBreaker

  constructor(config: {
    ratePerSecond: number
    burstCapacity: number
    failureThreshold: number
    cooldownMs: number
  }) {
    this.bucket = new TokenBucket(config.burstCapacity, config.ratePerSecond)
    this.breaker = new CircuitBreaker(config.failureThreshold, config.cooldownMs)
  }

  async schedule<T>(
    fn: () => Promise<T>,
    options?: { maxRetries?: number }
  ): Promise<T> {
    // 1. 速率控制
    await this.bucket.acquire()

    // 2. 断路器 + 指数退避重试
    return retryWithBackoff(
      () => this.breaker.execute(fn),
      {
        maxRetries: options?.maxRetries ?? 3,
        retryIf: (err) =>
          err.message !== 'Circuit breaker is OPEN' && // 断路器打开时不重试
          (err.status === 429 || err.status === 503 || err.code === 'ECONNRESET'),
      }
    )
  }
}

// 使用：调用多个 LLM API
const scheduler = new RequestScheduler({
  ratePerSecond: 10,       // 每秒 10 个请求
  burstCapacity: 20,       // 突发最多 20 个
  failureThreshold: 5,     // 连续 5 次失败断路
  cooldownMs: 30000,       // 断路后 30 秒尝试恢复
})

const results = await Promise.all(
  prompts.map(prompt =>
    scheduler.schedule(() => callLLMAPI(prompt))
  )
)
```

---

## 面试回答框架

### 标准回答（2 分钟版）

> 并发控制在 JavaScript 中主要解决三个问题：数量控制、速率控制、容错控制。
>
> 数量控制用信号量，核心是维护一个计数器，超过上限的任务排队等待。生产中常用 `p-limit` 库，它用闭包 + `Promise` 的 `then` 链实现，`finally` 保证槽位释放，比手写 Semaphore 类更安全。
>
> 速率控制用令牌桶，它允许突发流量但限制持续速率。和信号量的区别是：信号量控制「同时在飞的请求数」，令牌桶控制「单位时间内的请求数」。数据库连接池用信号量，第三方 API 限流用令牌桶。
>
> 容错控制用断路器，当下游服务连续失败超过阈值，断路器打开，后续请求快速失败而不是继续加重下游负担。过一段时间半开尝试恢复。配合指数退避重试 + 随机抖动防止惊群效应。
>
> 实际项目中三者组合使用：令牌桶控制速率 → 断路器保护下游 → 指数退避处理瞬时故障。

### 常见追问链

1. **追问 1**：「p-limit 和你手写的 Semaphore 有什么区别？为什么 p-limit 不用类？」
   - 回答要点：本质都是计数器 + 队列。p-limit 用闭包工厂函数更轻量，关键区别是 `finally` 自动释放槽位，不需要手动 `release()`，避免了忘记释放导致的死锁。不用类是因为这个场景不需要继承和多态，工厂函数更简洁（KISS 原则）。

2. **追问 2**：「令牌桶和漏桶（Leaky Bucket）的区别？」
   - 回答要点：漏桶以固定速率流出请求，完全平滑流量但不允许突发；令牌桶以固定速率填充令牌，允许桶内积累，可以处理突发流量。实际场景中令牌桶更常用，因为大多数业务需要容忍短时突发。

3. **追问 3**：「指数退避的 base 为什么选 1000ms？jitter 怎么算？」
   - 回答要点：base 取决于服务端的恢复时间。API 限流通常 1s 内恢复，选 1000ms 合理；数据库故障可能需要更长。jitter 通常用 `delay * (0.5 + Math.random() * 0.5)` 实现 50%-100% 的随机范围，AWS 推荐这种「Full Jitter」策略。

4. **追问 4**：「断路器的半开状态放几个请求过去？为什么？」
   - 回答要点：通常放 1 个（或少量）。如果这个请求成功，说明服务恢复了，关闭断路器；如果失败，说明还没恢复，继续保持打开。放太多可能在服务还没完全恢复时打垮它。

5. **追问 5**：「`Promise.all` + `p-limit` 和 `for...of` + `await` 有什么区别？」
   - 回答要点：`Promise.all` + `p-limit` 是控制并发数的并行执行，总耗时约等于 `任务数 / 并发数 * 单任务耗时`；`for...of` + `await` 是纯串行，总耗时 = `任务数 * 单任务耗时`。当并发数设为 1 时两者等价，但 `p-limit` 可以灵活调整并发数。

### 加分回答

- **提到 Web Worker 的消息队列**：浏览器端的并发控制不仅要考虑 Promise，还要考虑 Web Worker 的消息队列。`postMessage` 的消息是异步处理的，大量 `postMessage` 也会造成队列积压
- **提到 HTTP/2 的多路复用**：HTTP/2 在一个 TCP 连接上多路复用多个请求，减少了浏览器的 6 连接限制，但服务端仍然需要并发控制
- **提到 React 的 Concurrent Mode**：React 18 的并发渲染本质上也是一种并发控制 —— 用 `Scheduler` 控制任务优先级，高优先级任务（用户输入）可以中断低优先级任务（渲染更新）
- **提到 Node.js 的 cluster 模式**：Node.js 单线程模型下，并发控制在进程内用 Promise；多进程下还需要进程间的任务分发

---

## 代码演示

### 完整的并发任务队列（带进度回调）

```typescript
interface TaskQueueOptions {
  concurrency: number
  onProgress?: (completed: number, total: number) => void
}

async function taskQueue<T>(
  tasks: (() => Promise<T>)[],
  options: TaskQueueOptions
): Promise<T[]> {
  const { concurrency, onProgress } = options
  const results: T[] = new Array(tasks.length)
  let index = 0
  let completed = 0

  // 创建 concurrency 个 worker
  const workers = Array.from({ length: concurrency }, async () => {
    while (index < tasks.length) {
      const i = index++
      results[i] = await tasks[i]()
      completed++
      onProgress?.(completed, tasks.length)
    }
  })

  await Promise.all(workers)
  return results
}

// 使用：批量处理 100 个任务，最多 5 并发
const results = await taskQueue(
  items.map(item => () => processItem(item)),
  {
    concurrency: 5,
    onProgress: (done, total) => {
      console.log(`进度：${done}/${total} (${((done / total) * 100).toFixed(1)}%)`)
    },
  }
)
```

---

## 在本项目中的应用

### 1. AI 引擎 — LLM API 并发调用限流

```typescript
// apps/ai-engine — 调用多个 LLM 时需要限流
// 问题：OpenAI 限制每分钟 60 次，Claude 限制每分钟 50 次
const limit = pLimit(5) // 最多 5 个并发

const results = await Promise.all(
  drugDescriptions.map(desc =>
    limit(() => analyzeWithLLM(desc))
  )
)
```

### 2. 后端 — 数据库连接池控制

```typescript
// apps/api — PostgreSQL 连接池最多 20 个连接
// Drizzle ORM 的 connection pool 本质就是信号量
const db = drizzle(pool) // pool 内部维护连接数限制
```

### 3. 前端 — 批量图片上传

```typescript
// apps/web — 上传 50 张药品图片，限制并发为 3
const limit = pLimit(3)

const uploadResults = await Promise.all(
  files.map(file =>
    limit(() => uploadImage(file))
  )
)
```

---

## 易混淆点

| 概念 A | 概念 B | 关键区别 |
|--------|--------|---------|
| 信号量（Semaphore） | 令牌桶（Token Bucket） | 信号量控制「同时在飞数」；令牌桶控制「单位时间速率」 |
| 令牌桶 | 漏桶（Leaky Bucket） | 令牌桶允许突发；漏桶完全平滑 |
| 断路器 | 重试 | 重试是「再试一次」；断路器是「别试了，直接失败」 |
| `p-limit` | `for...of` + `await` | p-limit 并行（可控并发数）；for...of 纯串行 |
| 指数退避 | 固定延迟 | 指数退避逐次翻倍（100→200→400）；固定延迟每次都等一样长 |
| `Promise.all` + p-limit | `Promise.allSettled` + p-limit | all 快速失败；allSettled 收集所有结果 |

---

## 扩展阅读

1. **p-limit 源码** — https://github.com/sindresorhus/p-limit
   - 40 行代码，理解闭包 + Promise 调度的最佳范例

2. **Exponential Backoff And Jitter（AWS Architecture Blog）**
   - https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
   - 6 种退避策略的对比实验，结论是 Full Jitter 最优

---

## 自测

**Q1：手写一个 `pLimit(concurrency)` 函数，要求：**
- **最多 `concurrency` 个任务同时执行**
- **返回一个 `limit` 函数，调用 `limit(fn)` 提交任务**
- **任务完成后自动调度队列中的下一个**
- **用 `finally` 保证异常时也能释放槽位**

<details>
<summary>点击查看答案</summary>

```typescript
function pLimit(concurrency: number) {
  const queue: Array<() => void> = []
  let active = 0

  const next = () => {
    active--
    if (queue.length > 0) {
      queue.shift()!()
    }
  }

  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= concurrency) {
      await new Promise<void>(resolve => queue.push(resolve))
    }
    active++
    try {
      return await fn()
    } finally {
      next()
    }
  }
}
```

关键点：
1. `if (active >= concurrency)` 时，创建一个 Promise 把 `resolve` 存入队列
2. `active++` 在 await 之后，确保等待结束后才真正占位
3. `finally` 中调用 `next()`，`next()` 会 `active--` 并唤醒队列中的下一个
4. 不需要 Semaphore 类，闭包更简洁

</details>

**Q2：为什么指数退避需要加随机抖动（Jitter）？如果 100 个客户端同时失败且都不加抖动，会发生什么？**

<details>
<summary>点击查看答案</summary>

不加抖动时，100 个客户端都按相同的退避策略等待（100ms, 200ms, 400ms...），这意味着它们会在完全相同的时刻同时重试，形成「惊群效应」（Thundering Herd）。

后果：
1. 服务端在每个退避窗口的边界瞬间收到 100 个请求
2. 服务端再次过载，再次全部失败
3. 100 个客户端再次同步退避，再次同时重试
4. 形成周期性的流量尖峰，服务永远无法恢复

加抖动后，每个客户端的等待时间在 `[delay * 0.5, delay]` 之间随机分布，请求被均匀分散在时间窗口内，服务端压力平滑，更容易恢复。

</details>

**Q3：断路器的三个状态分别在什么场景下转换？如果把断路器的 `cooldown` 设成 0 会怎样？**

<details>
<summary>点击查看答案</summary>

状态转换：
- **CLOSED → OPEN**：连续失败次数达到 `threshold`，说明下游可能故障
- **OPEN → HALF_OPEN**：经过 `cooldown` 时间后，尝试放一个请求试探
- **HALF_OPEN → CLOSED**：试探请求成功，说明服务恢复
- **HALF_OPEN → OPEN**：试探请求失败，说明还没恢复，继续断路

如果 `cooldown = 0`：
- 断路器打开后立即进入半开状态
- 下一个请求来了就直接试探
- 如果服务还没恢复，又失败了，又打开
- 变成了「每个请求都尝试一下」，失去了断路器的保护意义
- 本质上退化成了「带状态的重试」，无法给下游喘息时间

</details>

---

> 本文是「异步编程」系列的第 5 篇，关联笔记：
> - 前置：[[promise-handwrite]] — Promise 原理与手写实现
> - 前置：[[promise-combinators]] — Promise 组合子（all/race/allSettled/any）
> - 前置：[[async-await]] — async/await 底层原理
> - 前置：[[generator-iterator]] — Generator & Iterator 协议
> - 相关：[[event-loop]] — 事件循环（理解微任务调度）
