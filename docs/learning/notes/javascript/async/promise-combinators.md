# Promise 组合子：all / race / allSettled / any

> 记录时间：2026-05-29
> 关联模块：apps/ai-engine（多模型并发调用）、apps/web（并行数据加载）、apps/api（超时控制）
> 重要程度：⭐⭐⭐（面试高频手写题，实际开发中并发控制的核心工具）
> 前置知识：[[promise-handwrite]]、[[event-loop]]、[[macrotask-microtask]]

---

## 一句话总结（面试 30 秒版）

Promise 组合子是**并发控制策略的抽象**：`all` 要么全赢要么全输，`race` 赢者通吃，`allSettled` 不抛弃不放弃，`any` 只要一个成功就行 —— 四种策略覆盖了 99% 的并发场景。

---

## 核心概念

### 四兄弟对比总览

```
Promise.all([p1, p2, p3])
  ├── 全部 fulfilled → 返回 [v1, v2, v3]（按顺序）
  └── 任一 rejected  → 立即 reject（其余结果被丢弃）

Promise.race([p1, p2, p3])
  ├── 最先 fulfilled → 返回 v1
  └── 最先 rejected  → 立即 reject

Promise.allSettled([p1, p2, p3])
  └── 全部 settled 后返回 [{status, value/reason}, ...]（永不 reject）

Promise.any([p1, p2, p3])
  ├── 最先 fulfilled → 返回 v1
  └── 全部 rejected  → AggregateError
```

| 方法 | 成功条件 | 失败条件 | 返回值 | 空数组行为 |
|------|---------|---------|--------|-----------|
| `all` | 全部 fulfilled | 任一 rejected | `values[]` | `resolve([])` |
| `race` | 最先 fulfilled | 最先 rejected | 单个 value | **永远 pending** |
| `allSettled` | 永远成功 | 永不 reject | `results[]` | `resolve([])` |
| `any` | 任一 fulfilled | 全部 rejected | 单个 value | `reject(AggregateError)` |

**面试记忆口诀**：
- `all` — 一票否决，全有或全无
- `race` — 赢者通吃，不管好坏
- `allSettled` — 不抛弃不放弃，全部结算
- `any` — 只要一个成功就行，全部失败才报错

---

### 1. Promise.all — 并发等待，一票否决

**核心语义**：所有 Promise 都 fulfilled 时，按传入顺序返回结果数组；任一 rejected，立即以该 reason reject。

```typescript
// 典型用法：并行加载多个资源
const [user, orders, recommendations] = await Promise.all([
  fetchUser(userId),
  fetchOrders(userId),
  fetchRecommendations(userId),
])
```

**关键行为细节**：

```typescript
// 1. 顺序保证：results[i] 对应 promises[i]，不是完成顺序
const p1 = new Promise(r => setTimeout(() => r('slow'), 100))
const p2 = new Promise(r => setTimeout(() => r('fast'), 10))
const results = await Promise.all([p1, p2])
// results = ['slow', 'fast']，不是 ['fast', 'slow']

// 2. 快速失败：第一个 reject 后，其余结果被丢弃（但 Promise 仍会执行）
const p3 = Promise.reject('fail')
const p4 = new Promise(r => setTimeout(() => r('ok'), 100))
try {
  await Promise.all([p3, p4])  // 立即 reject，不会等 p4
} catch (e) {
  console.log(e) // 'fail'
}
// 注意：p4 的 setTimeout 仍然会执行，只是结果没人接收了

// 3. 空数组：立即 resolve([])
const empty = await Promise.all([])
console.log(empty) // []
```

**短路（Short-circuit）行为**：
- 第一个 reject 发生后，`all` 立即 reject
- 但其余 Promise **不会被取消**，它们仍然会执行，只是结果被忽略
- 这是常见的内存泄漏来源（需要配合 AbortController 使用）

---

### 2. Promise.race — 赢者通吃

**核心语义**：取最先决议（settled）的结果，无论成功还是失败。

```typescript
// 典型用法：超时控制
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ])
}

// 使用
const data = await withTimeout(fetch('/api/slow'), 5000)
```

**关键行为细节**：

```typescript
// 1. "race" 是状态竞赛，不是值竞赛
const fast = new Promise(r => setTimeout(() => r('fast'), 10))
const slow = new Promise(r => setTimeout(() => r('slow'), 100))
const result = await Promise.race([slow, fast])
// result = 'fast'（谁先 settled 谁赢）

// 2. reject 也能赢
const willReject = Promise.reject('fail')
const willResolve = new Promise(r => setTimeout(() => r('ok'), 10))
try {
  await Promise.race([willReject, willResolve])
} catch (e) {
  console.log(e) // 'fail'（reject 比 resolve 快）
}

// 3. 空数组：永远 pending ⚠️
const forever = Promise.race([])
// forever 永远不会 settle，这是设计决策不是 bug
```

**⚠️ 空数组陷阱**：`Promise.race([])` 永远 pending，这是一个常见的坑。如果你的并发列表可能是空的，需要先做判断。

---

### 3. Promise.allSettled — 不抛弃不放弃

**核心语义**：等所有 Promise 都 settled（无论 fulfilled 还是 rejected），返回每个结果的状态描述对象数组。

```typescript
const results = await Promise.allSettled([
  Promise.resolve('ok'),
  Promise.reject('fail'),
  new Promise(r => setTimeout(() => r('delayed'), 100)),
])

// results = [
//   { status: 'fulfilled', value: 'ok' },
//   { status: 'rejected', reason: 'fail' },
//   { status: 'fulfilled', value: 'delayed' },
// ]
```

**返回值结构**：

```typescript
type SettledResult<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: any }
```

**典型用法**：需要知道每个任务的结果，不管成功还是失败。

```typescript
// 批量删除，记录哪些成功哪些失败
const results = await Promise.allSettled(
  ids.map(id => deleteItem(id))
)

const succeeded = results
  .filter((r): r is PromiseFulfilledResult<void> => r.status === 'fulfilled')
  .length

const failed = results
  .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
  .map(r => r.reason)

console.log(`成功 ${succeeded} 个，失败 ${failed.length} 个`)
```

**vs `Promise.all` 的选择**：
- `all`：需要所有结果才能继续（如并行加载页面数据）
- `allSettled`：需要知道每个任务的状态（如批量操作、容错处理）

---

### 4. Promise.any — 成功优先（ES2021）

**核心语义**：取第一个 fulfilled 的结果；全部 rejected 才 reject（AggregateError）。

```typescript
// 典型用法：多源冗余请求
const data = await Promise.any([
  fetch('https://cdn1.example.com/data.json').then(r => r.json()),
  fetch('https://cdn2.example.com/data.json').then(r => r.json()),
  fetch('https://cdn3.example.com/data.json').then(r => r.json()),
])
// 任一 CDN 成功就返回，全部挂了才报错
```

**vs `Promise.race` 的关键区别**：

```typescript
const p1 = Promise.reject('err1')
const p2 = new Promise(r => setTimeout(() => r('ok'), 10))

// race：reject 先到，直接 reject
try {
  await Promise.race([p1, p2])
} catch (e) {
  console.log(e) // 'err1'
}

// any：忽略 reject，等成功的
const result = await Promise.any([p1, p2])
console.log(result) // 'ok'

// any 全部失败时
try {
  await Promise.any([Promise.reject('a'), Promise.reject('b')])
} catch (e) {
  console.log(e instanceof AggregateError) // true
  console.log(e.errors) // ['a', 'b']
}
```

---

## 面试回答框架

### 标准回答（2 分钟版）

> Promise 的四个组合子方法代表了四种并发控制策略。
>
> `Promise.all` 是最常用的，它并行执行多个 Promise，等全部成功才 resolve，有一个失败就立即 reject。结果按传入顺序排列，不按完成顺序。典型场景是页面并行加载多个数据源。
>
> `Promise.race` 取最先 settled 的结果，不管成功还是失败。最常见的用途是超时控制 —— 把业务 Promise 和一个 setTimeout 包装的 reject Promise 放在一起 race。注意空数组会永远 pending。
>
> `Promise.allSettled` 是 ES2020 加入的，它等所有 Promise 都结束（不管成功失败），返回一个状态描述对象数组。适合批量操作需要知道每个结果的场景，比如批量删除要记录哪些成功哪些失败。
>
> `Promise.any` 是 ES2021 加入的，它取第一个成功的，全部失败才 reject。适合多源冗余请求，比如从多个 CDN 拉同一个资源。
>
> 手写的话，`all` 的核心是计数器 + 索引赋值保证顺序；`race` 最简单，直接 `then(resolve, reject)`；`allSettled` 用 `finally` 或 `then/catch` 把结果包装成状态对象；`any` 类似 all 但逻辑反转，用 `catch` 收集失败，用 `then` 取第一个成功。

### 常见追问链

1. **追问 1**：「`Promise.all` 有一个失败了，其余 Promise 会取消执行吗？」
   - 回答要点：**不会取消**。`all` 只是不再等待其余结果，但 Promise 本身仍然会执行完毕。如果需要取消，要配合 `AbortController`。这是常见的资源浪费场景。

2. **追问 2**：「手写 `Promise.all`，为什么用 `results[i] = val` 而不是 `results.push(val)`？」
   - 回答要点：因为 Promise 的完成顺序和传入顺序不同。用 `push` 会导致结果顺序错乱。用索引赋值 `results[i]` 能保证结果数组的顺序和输入一致。用 `count` 计数而不是 `results.length` 是因为稀疏数组的 `length` 会大于实际元素数。

3. **追问 3**：「`Promise.all` 和 `for...of` + `await` 的区别？什么时候用哪个？」
   - 回答要点：`Promise.all` 是**并行**执行，总耗时等于最慢的那个；`for...of` + `await` 是**串行**执行，总耗时是所有之和。需要并行且无依赖时用 `all`，需要按顺序执行且后一个依赖前一个结果时用 `for...of`。

4. **追问 4**：「`Promise.allSettled` 和 `try/catch` 包裹 `Promise.all` 有什么区别？」
   - 回答要点：`try/catch` + `all` 只能拿到第一个 reject 的 reason，其余结果丢失了。`allSettled` 能拿到**每一个** Promise 的结果和状态，信息更完整。批量操作场景下 `allSettled` 更实用。

5. **追问 5**：「实现一个 `promiseLimit(promises, limit)`，限制并发数？」
   - 回答要点：这是 `Promise.all` 的进阶版。核心思路是维护一个执行池，同时最多 `limit` 个 Promise 在执行，完成一个再补一个。可以用队列 + 递归实现，或者用 `Array.prototype.reduce` 链式调度。

### 加分回答

- **提到 TC39 提案历史**：`Promise.allSettled` 是 ES2020（ES11）引入的，`Promise.any` 是 ES2021（ES12）引入的，都经历了 Stage 4 提案流程
- **提到 AggregateError**：`Promise.any` 全部失败时抛出的不是普通 Error，而是 `AggregateError`，它是 `Error` 的子类，有一个 `errors` 数组属性
- **提到并发控制的实际工程问题**：生产环境中 `Promise.all` 对 100 个接口会同时发出 100 个请求，可能打爆连接池或触发限流，需要用 `p-limit` 或自己实现并发限制
- **提到 Promise 组合子的实现都基于同一个模式**：每个组合子本质上都是 `new Promise(executor)` + 在 executor 里遍历输入 Promise 并注册回调，区别只在于回调的聚合逻辑

---

## 代码演示

### 手写 Promise.all

```typescript
function promiseAll<T>(promises: Iterable<T | Promise<T>>): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const items = Array.from(promises)
    const len = items.length

    if (len === 0) return resolve([])

    const results: T[] = new Array(len)
    let count = 0

    items.forEach((item, i) => {
      Promise.resolve(item).then(
        val => {
          results[i] = val        // 索引赋值，保证顺序
          if (++count === len) resolve(results)
        },
        err => reject(err)        // 一票否决
      )
    })
  })
}
```

### 手写 Promise.race

```typescript
function promiseRace<T>(promises: Iterable<T | Promise<T>>): Promise<T> {
  return new Promise((resolve, reject) => {
    for (const item of promises) {
      Promise.resolve(item).then(resolve, reject)  // 谁先 settled 谁赢
    }
  })
}
```

### 手写 Promise.allSettled

```typescript
function promiseAllSettled<T>(
  promises: Iterable<T | Promise<T>>
): Promise<PromiseSettledResult<T>[]> {
  return new Promise((resolve) => {
    const items = Array.from(promises)
    const len = items.length

    if (len === 0) return resolve([])

    const results: PromiseSettledResult<T>[] = new Array(len)
    let count = 0

    items.forEach((item, i) => {
      Promise.resolve(item).then(
        value => {
          results[i] = { status: 'fulfilled', value }
          if (++count === len) resolve(results)
        },
        reason => {
          results[i] = { status: 'rejected', reason }
          if (++count === len) resolve(results)  // 注意：是 resolve 不是 reject
        }
      )
    })
  })
}
```

### 手写 Promise.any

```typescript
function promiseAny<T>(promises: Iterable<T | Promise<T>>): Promise<T> {
  return new Promise((resolve, reject) => {
    const items = Array.from(promises)
    const len = items.length

    if (len === 0) return reject(new AggregateError([], 'All promises were rejected'))

    const errors: any[] = new Array(len)
    let count = 0

    items.forEach((item, i) => {
      Promise.resolve(item).then(
        val => resolve(val),      // 第一个成功就 resolve
        err => {
          errors[i] = err
          if (++count === len) {
            reject(new AggregateError(errors, 'All promises were rejected'))
          }
        }
      )
    })
  })
}
```

### 并发限制器（进阶手写）

```typescript
function promiseLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = new Array(tasks.length)
    let index = 0
    let running = 0
    let completed = 0

    function runNext() {
      while (running < limit && index < tasks.length) {
        const i = index++
        running++
        tasks[i]().then(
          val => {
            results[i] = val
            running--
            completed++
            if (completed === tasks.length) resolve(results)
            else runNext()
          },
          err => reject(err)
        )
      }
    }

    runNext()
  })
}

// 使用：最多同时 3 个请求
const results = await promiseLimit(
  urls.map(url => () => fetch(url).then(r => r.json())),
  3
)
```

---

## 在本项目中的应用

### 1. AI 引擎多模型并发调用

```typescript
// apps/ai-engine — ensemble 模式：同时调 3 个模型，取最快的结果
const fastest = await Promise.any([
  callOpenAI(messages),
  callClaude(messages),
  callQwen(messages),
])

// 或者等待全部结果做加权平均
const [openai, claude, qwen] = await Promise.all([
  callOpenAI(messages),
  callClaude(messages),
  callQwen(messages),
])
```

### 2. 药品信息并行加载（带降级）

```typescript
// apps/web — 并行加载药品详情，用 allSettled 容错
const [detail, reviews, recommendations] = await Promise.allSettled([
  fetchDrugDetail(id),
  fetchDrugReviews(id),
  fetchRecommendations(id),
])

// 核心数据必须有，推荐数据可以没有
if (detail.status === 'rejected') throw detail.reason
return {
  drug: detail.value,
  reviews: reviews.status === 'fulfilled' ? reviews.value : [],
  recommendations: recommendations.status === 'fulfilled' ? recommendations.value : [],
}
```

### 3. 后端请求超时控制

```typescript
// apps/api — 用 race 实现超时
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${ms}ms`)), ms)
    ),
  ])
}

// 给数据库查询加超时
const user = await withTimeout(db.query.user.findFirst({ id }), 3000)
```

### 4. 批量操作收集结果

```typescript
// apps/api — 批量更新药品价格，记录成功失败
const results = await Promise.allSettled(
  updates.map(({ id, price }) =>
    db.update(drug).set({ price }).where(eq(drug.id, id))
  )
)

const failed = results
  .map((r, i) => ({ ...r, id: updates[i].id }))
  .filter(r => r.status === 'rejected')

if (failed.length > 0) {
  logger.warn(`${failed.length}/${updates.length} price updates failed`, { failed })
}
```

---

## 易混淆点

| 概念 A | 概念 B | 关键区别 |
|--------|--------|---------|
| `Promise.all` | `Promise.allSettled` | all 一票否决立即 reject；allSettled 等全部结束才返回，永不 reject |
| `Promise.race` | `Promise.any` | race 取最先 settled（成功或失败都算）；any 取最先成功的（忽略失败） |
| `Promise.all` | `for...of` + `await` | all 并行（总耗时 = max）；for...of 串行（总耗时 = sum） |
| `Promise.all([])` | `Promise.race([])` | all 立即 resolve `[]`；race **永远 pending** |
| `Promise.any` 全部失败 | `Promise.all` 一个失败 | any 抛 `AggregateError`（包含所有 error）；all 直接 reject 第一个 reason |
| `Promise.all` 快速失败 | 取消执行 | all 的快速失败只是不再等待，其余 Promise 仍在执行 |

---

## 扩展阅读

1. **MDN Promise 组合子文档**
   - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise#promise_concurrency
   - 官方文档，四个方法的完整 API 说明和示例

2. **p-limit（npm）**
   - https://github.com/sindresorhus/p-limit
   - 生产环境中最常用的并发限制库，25M+ 周下载量

---

## 自测

**Q1：以下代码输出什么？为什么？**

```typescript
const p1 = new Promise(r => setTimeout(() => r(1), 100))
const p2 = Promise.reject(2)
const p3 = new Promise(r => setTimeout(() => r(3), 200))

Promise.all([p1, p2, p3])
  .then(console.log)
  .catch(console.error)
```

<details>
<summary>点击查看答案</summary>

输出 `2`（立即输出，不等 100ms）。

`Promise.all` 的短路行为：`p2` 立即 reject，`all` 立即以 reason `2` 调用 reject，不再等待 `p1` 和 `p3`。`p1` 和 `p3` 的 setTimeout 仍会执行，但结果被丢弃。

</details>

**Q2：`Promise.race([])` 和 `Promise.all([])` 的行为分别是什么？为什么 `race([])` 要设计成永远 pending？**

<details>
<summary>点击查看答案</summary>

- `Promise.all([])` 立即 resolve `[]`（空集的 "全部成功" 是 vacuously true）
- `Promise.race([])` 永远 pending（没有任何参赛者，比赛无法结束）

设计原因：`race` 的语义是 "取最先 settled 的结果"，空数组意味着没有参赛者，没有结果可取。规范选择永远 pending 而不是 reject，因为 "没有参赛者" 不是一个错误状态。

实际开发中需要注意这个陷阱：如果并发列表可能是空的，要先判断。

</details>

**Q3：手写一个 `promiseRetry(fn, retries)` 函数，失败时自动重试，最多重试 `retries` 次。它和 `Promise.any` 有什么关系？**

<details>
<summary>点击查看答案</summary>

```typescript
async function promiseRetry<T>(
  fn: () => Promise<T>,
  retries: number
): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === retries) throw err
    }
  }
  throw new Error('unreachable')
}

// 或者用 Promise 思维写（不借助 async/await）
function promiseRetry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
  return fn().catch(err => {
    if (retries === 0) return Promise.reject(err)
    return promiseRetry(fn, retries - 1)
  })
}
```

和 `Promise.any` 的关系：如果把每次尝试都看作一个 Promise，`retry` 本质上是在**串行**地找第一个成功的，而 `Promise.any` 是**并行**地找第一个成功的。区别在于 retry 有明确的重试次数限制，且每次重试之间可以加延迟。

</details>

---

> 本文是「异步编程」系列的第 2 篇，关联笔记：
> - 上一篇：[[promise-handwrite]] — Promise 原理与手写实现
> - 已学习：[[async-await]] — async/await 底层原理（Generator + 自动执行器）
> - 待学习：Generator & Iterator 协议
