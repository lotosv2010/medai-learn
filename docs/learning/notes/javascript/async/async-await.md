# async/await 底层原理

> 记录时间：2026-05-29
> 关联模块：apps/ai-engine（LLM 流式调用）、apps/api（数据库事务）、apps/web（数据加载）
> 重要程度：⭐⭐⭐（面试必考，异步编程的终极形态，二面三面深挖点）
> 前置知识：[[promise-handwrite]]、[[promise-combinators]]、[[event-loop]]、[[macrotask-microtask]]

---

## 一句话总结（面试 30 秒版）

async/await 是 **Generator + 自动执行器** 的语法糖，本质是用同步的写法表达异步的流程控制 —— 编译器帮你写了那个不断调用 `generator.next()` 的 while 循环，让每个 `yield` 后面的 Promise 决议后自动推进到下一步。

---

## 核心概念

### 1. async/await 的本质：Generator + co

把 async/await 翻译成 Generator，一切就清楚了：

```javascript
// 你写的 async/await
async function fetchUser(id) {
  const user = await fetch(`/api/user/${id}`)
  const orders = await fetch(`/api/user/${id}/orders`)
  return { user, orders }
}

// 编译器实际生成的（简化版）
function fetchUser(id) {
  return co(function* () {
    const user = yield fetch(`/api/user/${id}`)
    const orders = yield fetch(`/api/user/${id}/orders`)
    return { user, orders }
  })
}
```

**类比**：async 函数就像一条流水线。`await` 是流水线上的暂停点，每到一个暂停点，工人（自动执行器）就去取材料（等 Promise 决议），取回来后继续下一道工序。Generator 的 `yield` 就是暂停按钮，`generator.next(value)` 就是恢复按钮。

### 2. Generator 基础（async/await 的地基）

Generator 是一个可以**暂停和恢复**的函数，用 `function*` 声明，用 `yield` 暂停。

```javascript
function* gen() {
  console.log('第一步')
  yield 1
  console.log('第二步')
  yield 2
  console.log('第三步')
  return 3
}

const g = gen()
console.log(g.next())  // '第一步' → { value: 1, done: false }
console.log(g.next())  // '第二步' → { value: 2, done: false }
console.log(g.next())  // '第三步' → { value: 3, done: true }
```

**关键特性**：
- `function*` 返回一个迭代器对象（有 `next`、`return`、`throw` 方法）
- `yield` 暂停执行，把值**吐出来**给调用者
- `next(value)` 恢复执行，`value` 会作为上一个 `yield` 表达式的**返回值**
- `throw(error)` 在暂停处抛出错误，可被 `try/catch` 捕获

**`yield` 的双向传值**（这是理解 async/await 的关键）：

```javascript
function* gen() {
  const a = yield 'hello'     // yield 吐出 'hello'，等待 next 传入值
  console.log(a)               // 'world' — 来自 g.next('world')
  const b = yield '!'
  console.log(b)               // 42
}

const g = gen()
g.next()          // { value: 'hello', done: false }
g.next('world')   // 'world' → { value: '!', done: false }
g.next(42)        // 42 → { value: undefined, done: true }
```

### 3. 自动执行器（co 模式）—— async/await 的核心

理解了 Generator 的 `yield` 双向传值，就能理解自动执行器的工作原理：

```javascript
// 手写自动执行器（co 的核心逻辑）
function asyncToGenerator(generatorFn) {
  return function (...args) {
    const gen = generatorFn.apply(this, args)

    return new Promise((resolve, reject) => {
      function step(key, arg) {
        let result
        try {
          result = gen[key](arg)  // gen.next(arg) 或 gen.throw(arg)
        } catch (error) {
          return reject(error)
        }

        const { value, done } = result

        if (done) {
          return resolve(value)  // Generator 执行完毕
        }

        // 核心：把 yield 出来的值包装成 Promise，决议后继续推进
        Promise.resolve(value).then(
          val => step('next', val),    // 成功：把决议值传回 Generator
          err => step('throw', err)    // 失败：在 Generator 内部抛出
        )
      }

      step('next')  // 启动 Generator
    })
  }
}

// 使用：把 Generator 包装成 async 函数
const fetchUser = asyncToGenerator(function* (id) {
  const user = yield fetch(`/api/user/${id}`).then(r => r.json())
  const orders = yield fetch(`/api/user/${id}/orders`).then(r => r.json())
  return { user, orders }
})
```

**执行流程图**：

```
asyncToGenerator 启动
    │
    ▼
gen.next() ──→ yield fetch(...) ──→ 暂停
    │
    ▼
Promise.resolve(fetch(...)).then(
    │
    ▼
  fetch 决议 → gen.next(data) ──→ yield fetch(...) ──→ 暂停
    │
    ▼
  fetch 决议 → gen.next(data) ──→ return { user, orders }
    │
    ▼
  resolve(value) → 最终 Promise fulfilled
)
```

### 4. Babel 编译产物（真实世界的实现）

Babel 把 async/await 编译后的代码，和上面的手写版本几乎一模一样：

```javascript
// 源代码
async function example() {
  const a = await Promise.resolve(1)
  const b = await Promise.resolve(a + 1)
  return b
}

// Babel 编译产物（简化）
function example() {
  return _asyncToGenerator(function* () {
    const a = yield Promise.resolve(1)
    const b = yield Promise.resolve(a + 1)
    return b
  })()
}

function _asyncToGenerator(fn) {
  return function () {
    const self = this, args = arguments
    return new Promise(function (resolve, reject) {
      const gen = fn.apply(self, args)
      function step(key, arg) {
        try {
          const info = gen[key](arg)
          const value = info.value
          if (info.done) { resolve(value) }
          else { Promise.resolve(value).then(step.bind(null, 'next'), step.bind(null, 'throw')) }
        } catch (e) { reject(e) }
      }
      step('next')
    })
  }
}
```

### 5. async 函数的返回值规则

**铁律**：async 函数**永远返回一个 Promise**。

```javascript
// 情况 1：返回普通值 → 包装成 fulfilled Promise
async function f1() { return 42 }
f1()  // Promise {<fulfilled>: 42}

// 情况 2：返回 Promise → 直接返回该 Promise（不包装）
async function f2() { return Promise.resolve(42) }
f2()  // Promise {<fulfilled>: 42}（同一个 Promise）

// 情况 3：抛出异常 → 返回 rejected Promise
async function f3() { throw new Error('oops') }
f3()  // Promise {<rejected>: Error: oops}

// 情况 4：返回 thenable → 会等待 thenable 决议
async function f4() {
  return { then: (resolve) => resolve(42) }
}
f4()  // Promise {<fulfilled>: 42}
```

### 6. await 的行为规则

`await` 后面的值会被 `Promise.resolve()` 包装（如果不是 Promise 的话）：

```javascript
await 42                    // 等价于 await Promise.resolve(42) → 42
await 'hello'               // → 'hello'
await Promise.resolve(42)   // → 42
await Promise.reject('err') // 抛出 'err'
await { then: cb => cb(1) } // → 1（thenable 也会被解析）
```

**await 暂停的是 async 函数的执行，不是阻塞主线程**：

```javascript
async function demo() {
  console.log('A')
  await Promise.resolve()
  console.log('B')  // 微任务
  await Promise.resolve()
  console.log('C')  // 微任务的微任务
}
demo()
console.log('D')

// 输出：A → D → B → C
// A 和 D 是同步的，B 和 C 是微任务
```

---

## 面试回答框架

### 标准回答（2 分钟版）

> async/await 的本质是 **Generator + 自动执行器** 的语法糖。
>
> Generator 是 ES6 引入的协程机制，用 `function*` 声明，通过 `yield` 暂停和 `next()` 恢复来控制执行流程。`yield` 有一个关键特性：它不仅能向外吐值，还能通过 `next(value)` 向内传值 —— 这就是双向通信的基础。
>
> async/await 编译器做的事情就是：把 async 函数转换成 Generator，然后用一个自动执行器（本质上是一个递归的 Promise 链）来驱动它。每次遇到 `yield`（即 `await`），执行器就把 yield 出来的值用 `Promise.resolve()` 包装，等它决议后，把结果通过 `next(value)` 传回 Generator，然后继续下一步。
>
> 所以 async/await 的错误处理本质上就是 try/catch —— 因为 Generator 的 `throw()` 方法会在暂停处抛出错误，可以被内部的 try/catch 捕获。这就是为什么 `await` 后面的 Promise reject 时，可以用 try/catch 捕获。
>
> 在实际项目中，async/await 最大的价值是**扁平化异步流程**，让错误处理和同步代码一样直观，特别是在多步异步操作（比如先查询数据库、再调 AI 接口、再写缓存）的场景下，比 Promise 链可读性好很多。

### 常见追问链

1. **追问 1**：「async/await 和 Promise 的关系是什么？是替代还是封装？」
   - 回答要点：async/await 是 Promise 的**上层封装**，不是替代。每个 `await` 背后都是一个 Promise，async 函数返回的也是 Promise。你可以随时在 async 函数里用 `Promise.all`、`Promise.race` 等。async/await 解决的是**流程控制**的可读性问题，不是 Promise 本身的问题。

2. **追问 2**：「`await` 会阻塞线程吗？和 `sleep` 有什么区别？」
   - 回答要点：`await` **不阻塞**主线程。它只是暂停了 async 函数的执行，把控制权交还给事件循环。主线程继续处理其他任务（宏任务、微任务等），等 Promise 决议后，async 函数才在微任务中恢复执行。真正的阻塞是 `Atomics.wait` 或 Web Worker 中的 `sleep`，它们会停止线程。

3. **追问 3**：「多个 await 是串行的，怎么改成并行？」
   - 回答要点：
   ```javascript
   // 串行（总耗时 = sum）
   const a = await fetchA()
   const b = await fetchB()

   // 并行（总耗时 = max）
   const [a, b] = await Promise.all([fetchA(), fetchB()])

   // 或者先启动再等待
   const pA = fetchA()
   const pB = fetchB()
   const a = await pA
   const b = await pB
   ```

4. **追问 4**：「`for` 循环里用 `await`，每次迭代都会等吗？和 `forEach` 有什么区别？」
   - 回答要点：
   ```javascript
   // ✅ 正确：for...of 会串行等待
   for (const url of urls) {
     await fetch(url)  // 一个完成才开始下一个
   }

   // ❌ 错误：forEach 不会等待 async 回调
   urls.forEach(async (url) => {
     await fetch(url)  // 所有请求几乎同时发出，不会串行
   })
   // forEach 返回 void，不是 Promise

   // ✅ 并行：用 Promise.all + map
   await Promise.all(urls.map(url => fetch(url)))
   ```

5. **追问 5**：「手写一个 `asyncToGenerator` 函数？」
   - 回答要点：核心就是上面的自动执行器实现，要点是：(1) 用 `new Promise` 包装返回值；(2) 递归调用 `gen.next()`/`gen.throw()`；(3) 用 `Promise.resolve()` 包装 yield 的值确保兼容性。

### 加分回答

- **提到 Babel/TypeScript 编译**：async/await 在 Babel 中被编译成 `_asyncToGenerator`（基于 regenerator 运行时），在 TypeScript 中被编译成 `__awaiter`。两者的实现思路相同，但细节略有差异
- **提到 V8 引擎的原生支持**：从 Node.js 7.6+（V8 5.5+）开始，async/await 是原生支持的，不需要编译。V8 内部直接把 async 函数编译成基于 Promise 的状态机，比 Babel 的 Generator 方案更高效
- **提到顶层 await（Top-level await）**：ES2022 支持在模块顶层使用 `await`，但它会阻塞**整个模块**的加载，所有依赖它的模块都会等它完成。这是有意为之的设计，用于模块初始化
- **提到错误处理的最佳实践**：`try/catch` 包裹多个 await 时，catch 会捕获第一个 reject。如果需要分别处理每个 await 的错误，要么每个 await 单独 try/catch，要么用 `Promise.allSettled`

---

## 代码演示

### async/await → Generator 编译对等

```javascript
// async/await 版本
async function loadData(userId) {
  try {
    const user = await fetchUser(userId)
    const orders = await fetchOrders(user.id)
    const enriched = await enrichOrders(orders)
    return { user, orders: enriched }
  } catch (err) {
    console.error('Load failed:', err)
    return null
  }
}

// 等价的 Generator 版本
function loadData(userId) {
  return asyncToGenerator(function* () {
    try {
      const user = yield fetchUser(userId)
      const orders = yield fetchOrders(user.id)
      const enriched = yield enrichOrders(orders)
      return { user, orders: enriched }
    } catch (err) {
      console.error('Load failed:', err)
      return null
    }
  })()
}
```

### 手写 asyncToGenerator（面试手写版）

```typescript
function asyncToGenerator<T>(
  generatorFn: (...args: any[]) => Generator<any, T, any>
) {
  return function (this: any, ...args: any[]): Promise<T> {
    const gen = generatorFn.apply(this, args)

    return new Promise<T>((resolve, reject) => {
      function step(key: 'next' | 'throw', arg?: any) {
        let result: IteratorResult<any, T>
        try {
          result = gen[key](arg as any)
        } catch (error) {
          return reject(error)
        }

        const { value, done } = result

        if (done) {
          return resolve(value)
        }

        // 把 yield 出来的值包装成 Promise，决议后继续推进
        Promise.resolve(value).then(
          val => step('next', val),
          err => step('throw', err)
        )
      }

      step('next')
    })
  }
}
```

### await 错误处理模式

```javascript
// 模式 1：try/catch（最常用）
async function fetchWithCatch() {
  try {
    const data = await fetchData()
    return data
  } catch (err) {
    return fallbackData  // 捕获 fetchData 的 reject
  }
}

// 模式 2：.catch() 转换为值（函数式风格）
async function fetchWithCatchValue() {
  const [err, data] = await fetchData()
    .then(d => [null, d])
    .catch(e => [e, null])

  if (err) return fallbackData
  return data
}

// 模式 3：分别处理每个 await 的错误
async function fetchMultiple() {
  const userResult = await fetchUser().catch(e => ({ error: e }))
  const orderResult = await fetchOrders().catch(e => ({ error: e }))

  return {
    user: userResult.error ? null : userResult,
    orders: orderResult.error ? [] : orderResult,
  }
}
```

### 并行 vs 串行

```javascript
// 串行：总耗时 = t1 + t2 + t3
async function serial() {
  const a = await fetchA()  // t1
  const b = await fetchB()  // t2
  const c = await fetchC()  // t3
  return [a, b, c]
}

// 并行：总耗时 = max(t1, t2, t3)
async function parallel() {
  const [a, b, c] = await Promise.all([
    fetchA(),
    fetchB(),
    fetchC(),
  ])
  return [a, b, c]
}

// 半并行：启动时并行，取值时串行（效果同 parallel）
async function halfParallel() {
  const pA = fetchA()  // 立即启动
  const pB = fetchB()  // 立即启动
  const pC = fetchC()  // 立即启动

  const a = await pA   // 等待（但 pB, pC 已在执行）
  const b = await pB   // 大概率已完成
  const c = await pC   // 大概率已完成
  return [a, b, c]
}
```

---

## 在本项目中的应用

### 1. AI 引擎流式调用

```typescript
// apps/ai-engine — async/await 驱动流式响应
async function streamChat(messages: Message[]) {
  const stream = await openai.chat.completions.create({
    messages,
    stream: true,
  })

  for await (const chunk of stream) {
    // for await...of 自动处理异步迭代器
    yield chunk.choices[0]?.delta?.content ?? ''
  }
}
```

### 2. 后端数据库事务

```typescript
// apps/api — async/await 管理事务生命周期
async function createOrderWithItems(order: Order, items: Item[]) {
  return await db.transaction(async (tx) => {
    const created = await tx.insert(order).values(order).returning()
    await tx.insert(orderItem).values(
      items.map(item => ({ ...item, orderId: created.id }))
    )
    return created
  })
  // 如果中间任何一步失败，事务自动回滚
}
```

### 3. 前端数据加载（Next.js Server Component）

```typescript
// apps/web — RSC 中直接 await
async function DrugDetailPage({ params }: { params: { id: string } }) {
  const drug = await fetchDrug(params.id)        // 服务端 await
  const reviews = await fetchReviews(params.id)  // 服务端 await

  return <DrugDetail drug={drug} reviews={reviews} />
}
```

---

## 易混淆点

| 概念 A | 概念 B | 关键区别 |
|--------|--------|---------|
| `async/await` | `Promise.then()` | async/await 是语法糖，底层仍是 Promise；链式 then 可读性差但更灵活 |
| `await` 暂停 | 线程阻塞 | await 暂停 async 函数，不阻塞主线程；线程阻塞会冻结整个 JS 执行 |
| `for...of` + `await` | `forEach` + `async` | for...of 会串行等待；forEach 不会等待 async 回调（返回 void） |
| `async` 函数返回值 | `await` 的值 | async 函数总是返回 Promise；await 的值是 Promise 决议后的值（unwrapped） |
| `await Promise.reject()` | `throw` | 都会导致 async 函数返回 rejected Promise，但 await reject 可被 try/catch 捕获 |
| `async function` | `function*` | async 是 Generator 的语法糖，自动执行；Generator 需要手动或用 co 驱动 |
| 顶层 `await` | 函数内 `await` | 顶层 await 会阻塞整个模块加载；函数内 await 只暂停该函数 |

---

## 扩展阅读

1. **ECMA-262 规范：Async Function**
   - https://tc39.es/ecma262/#sec-async-function-definitions
   - 规范定义了 async 函数的语义，本质是返回 Promise 的 Generator

2. **Babel 编译器源码：asyncToGenerator**
   - https://github.com/nicolo-ribaudo/tc39-proposal-await-dictionary
   - 理解编译器如何把 async/await 转换成 ES5 兼容代码

---

## 自测

**Q1：以下代码输出什么顺序？为什么？**

```javascript
async function async1() {
  console.log('async1 start')
  await async2()
  console.log('async1 end')
}

async function async2() {
  console.log('async2')
}

console.log('script start')
async1()
new Promise(resolve => {
  console.log('promise1')
  resolve()
}).then(() => {
  console.log('promise2')
})
console.log('script end')
```

<details>
<summary>点击查看答案</summary>

```
script start
async1 start
async2
promise1
script end
async1 end
promise2
```

逐步分析：
1. `console.log('script start')` — 同步
2. `async1()` — 进入 async1
3. `console.log('async1 start')` — 同步
4. `await async2()` — 调用 async2，`console.log('async2')` 同步执行
5. `await` 后面的代码（`async1 end`）被放入微任务队列
6. 回到 `new Promise`，`console.log('promise1')` 同步执行
7. `resolve()` 后 `.then` 回调放入微任务队列
8. `console.log('script end')` — 同步
9. 同步代码执行完毕，开始清微任务队列
10. 第一个微任务：`console.log('async1 end')`（await 后续）
11. 第二个微任务：`console.log('promise2')`（.then 回调）

关键：`await async2()` 等价于 `await Promise.resolve(async2())`。`async2()` 同步执行完毕返回 fulfilled Promise，但 `await` 后续代码仍被放入微任务队列（即使 Promise 已经 fulfilled）。

</details>

**Q2：手写一个 `asyncToGenerator` 函数，能正确处理以下情况？**

```javascript
const fn = asyncToGenerator(function* () {
  const a = yield Promise.resolve(1)
  const b = yield Promise.resolve(a + 1)
  return b
})

fn().then(console.log)  // 应输出 2
```

<details>
<summary>点击查看答案</summary>

```typescript
function asyncToGenerator<T>(
  generatorFn: (...args: any[]) => Generator<any, T, any>
) {
  return function (this: any, ...args: any[]): Promise<T> {
    const gen = generatorFn.apply(this, args)

    return new Promise<T>((resolve, reject) => {
      function step(key: 'next' | 'throw', arg?: any) {
        let result: IteratorResult<any, T>
        try {
          result = gen[key](arg as any)
        } catch (error) {
          return reject(error)
        }

        const { value, done } = result
        if (done) return resolve(value)

        Promise.resolve(value).then(
          val => step('next', val),
          err => step('throw', err)
        )
      }

      step('next')
    })
  }
}
```

核心要点：
1. `gen[key](arg)` — key 是 `'next'` 或 `'throw'`，arg 是上一步 Promise 的决议值
2. `Promise.resolve(value).then(...)` — 无论 yield 出来的是不是 Promise，都包装成 Promise 等待
3. `step('throw', err)` — 如果 Promise reject，在 Generator 内部抛出，让 try/catch 捕获

</details>

---

> 本文是「异步编程」系列的第 3 篇，关联笔记：
> - 上一篇：[[promise-combinators]] — Promise 组合子：all / race / allSettled / any
> - 前置：[[promise-handwrite]] — Promise 原理与手写实现
> - 待学习：Generator & Iterator 协议（Generator 的完整特性：yield*、return、throw、Symbol.iterator）
