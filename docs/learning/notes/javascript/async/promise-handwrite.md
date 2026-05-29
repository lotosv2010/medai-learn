# Promise 原理与手写实现

> 记录时间：2026-05-28
> 关联模块：apps/ai-engine（LLM 流式调用）、apps/api（并发请求处理）、apps/web（异步数据加载）
> 重要程度：⭐⭐⭐（面试必考，手写 Promise 是二面三面标配）
> 前置知识：[[event-loop]]、[[macrotask-microtask]]、[[scope-chain-closures]]

---

## 一句话总结（面试 30 秒版）

Promise 是一个**状态机**（pending → fulfilled/rejected），通过**微任务调度**回调，用**链式调用**解决回调地狱，其核心是 Promise/A+ 规范中的 **Resolution Procedure**（解析流程）。

---

## 核心概念

### 1. Promise 的本质：状态机

```
           resolve(value)
  pending ─────────────────→ fulfilled
    │                          (终态，不可变)
    │
    │ reject(reason)
    ▼
  rejected
    (终态，不可变)
```

注意：`then` / `catch` **不是状态转换操作**，它们是注册回调的方法。状态变更只有两条路径：`pending → fulfilled` 和 `pending → rejected`，且都是**单向、不可逆**的。

`then` / `catch` 返回的是一个**全新的 Promise**，走自己的状态机：
```javascript
const p1 = new Promise((resolve, reject) => reject('err'))
const p2 = p1.catch(() => 'recovered')  // p1 仍是 rejected，p2 是 fulfilled
```

**三个状态**：
| 状态 | 含义 | 是否可变 |
|------|------|---------|
| `pending` | 初始态，可转变为 fulfilled 或 rejected | 是 |
| `fulfilled` | 成功态，必须有一个 value，且不可变 | 否 |
| `rejected` | 失败态，必须有一个 reason，且不可变 | 否 |

**两条铁律**（Promise/A+ 规范）：
1. 状态一旦变更就**不可逆**（fulfilled 不能再变 rejected，反之亦然）
2. `then` 可以被调用多次，每个回调按注册顺序执行

### 2. then 的链式调用原理

```javascript
promise.then(fn1).then(fn2).then(fn3)
```

**关键**：`then()` 每次调用都返回一个**新的 Promise**，不是返回 this。

这就是链式调用的秘密 —— 每个 `.then()` 创造一个新的 Promise，上一个 then 的返回值成为下一个 then 的输入。

```javascript
// 伪代码说明
const p1 = new Promise(resolve => resolve(1))
const p2 = p1.then(x => x + 1)    // p2 是新 Promise，value = 2
const p3 = p2.then(x => x + 1)    // p3 是新 Promise，value = 3
// p1 !== p2 !== p3
```

### 3. Resolution Procedure（解析流程）—— 最核心的机制

当 `then` 的回调返回一个值时，这个值如何传递给下一个 Promise？

```javascript
promise.then(value => {
  return ???  // ??? 的类型决定了下一个 Promise 的行为
})
```

| 返回值类型 | 行为 |
|-----------|------|
| 普通值（非 Promise） | 下一个 Promise 直接 resolve 该值 |
| 另一个 Promise | 等该 Promise 决议后，用它的结果 resolve |
| thenable 对象（有 .then 方法） | 递归调用其 .then 方法 |

```javascript
// 普通值
Promise.resolve(1).then(x => x + 1)           // → 2

// 返回 Promise
Promise.resolve(1).then(x => Promise.resolve(x + 1))  // → 2（等待内部 Promise）

// 返回 thenable
Promise.resolve(1).then(x => ({ then: cb => cb(x + 1) }))  // → 2（递归解析）
```

**面试追问**：为什么需要处理 thenable？因为要兼容不同 Promise 库（jQuery Deferred、Bluebird 等）。

### 4. 微任务调度

Promise 的 `.then` 回调不是同步执行的，而是放入**微任务队列**。

```javascript
const p = new Promise(resolve => {
  console.log('1')          // 同步
  resolve('2')
})
p.then(val => console.log(val))  // 微任务
console.log('3')

// 输出：1 → 3 → 2
```

**为什么用微任务不用宏任务？**
- 微任务在当前宏任务结束后立即执行
- 能保证 Promise 回调尽快执行，不被渲染或其他宏任务延迟
- Vue 的 nextTick 也是基于同样原理选择微任务

---

## 面试回答框架

### 标准回答（2 分钟版）

> Promise 的核心是三个东西：**状态机、微任务调度、Resolution Procedure**。
>
> 首先，Promise 是一个有限状态机，只有 pending、fulfilled、rejected 三个状态，且状态变更不可逆。这是 Promise 可靠性的基础。
>
> 其次，Promise 用微任务来调度回调。当 resolve 被调用时，所有通过 then 注册的 onFulfilled 回调会被推入微任务队列，而不是同步执行。这保证了回调的异步性和执行时机的一致性。
>
> 最后，也是最容易被忽略的，是 Resolution Procedure。当 then 的回调返回一个值时，Promise 内部有一个递归解析机制：如果是普通值就直接 resolve；如果是另一个 Promise 或 thenable 对象就递归解析，直到拿到最终值。这就是链式调用能传递 Promise 的根本原因。
>
> 手写 Promise 的核心难点就在第三步 —— 正确实现 Resolution Procedure，特别是处理循环引用的情况（A+ 规范 2.3.1：如果 then 返回的就是自己，必须 reject with TypeError）。

### 常见追问链

1. **追问 1**：「Promise 的 then 是微任务，那它是怎么实现微任务调度的？」
   - 回答要点：V8 引擎中，Promise 内部使用 `microtask queue`。`resolve` 被调用时，并不直接执行 then 回调，而是通过 `EnqueueJob`（ECMA-262 规范）将回调推入微任务队列。浏览器中可以用 `MutationObserver`、`queueMicrotask` 或 `Promise.resolve().then()` 本身来模拟。Node.js 中用 `process.nextTick` 或 `queueMicrotask`。

2. **追问 2**：「Promise.all 和 Promise.race 的区别？手写一个？」
   - 回答要点：`all` 等所有 Promise 全部 fulfilled 才 resolve（有一个 reject 就立即 reject）；`race` 取最先决议的结果（无论成功或失败）。`allSettled` 等所有都结束（不管成功失败），返回每个的结果数组。

3. **追问 3**：「如果 Promise 的回调里又返回了自己，会发生什么？」
   - 回答要点：按照 A+ 规范 2.3.1，如果 `onFulfilled` 或 `onRejected` 返回的值和当前 Promise 是同一个引用，必须 reject with TypeError（防止无限递归）。手写时需要加一个 `===` 判断。

4. **追问 4**：「为什么 Promise 有 then、catch、finally 三个方法？finally 有什么特殊的？」
   - 回答要点：`catch` 是 `.then(null, onRejected)` 的语法糖。`finally` 不接收参数，且返回的 Promise 会**透传**上一个 Promise 的值（无论成功还是失败），只在 finally 回调本身报错时才改变值。

### 加分回答

- **提到 ECMA-262 规范**：Promise 的行为在 ECMA-262 第 26 章有完整定义，`PromiseResolveThenableJob` 和 `PromiseReactionJob` 是两个关键的抽象操作
- **提到 microtask queue 的优先级**：在 Node.js 中，`process.nextTick` 的优先级高于 Promise（nextTick queue 在每个阶段之前清空，microtask queue 在每个阶段之后）
- **提到 Promise 的内存泄漏**：未处理的 reject 会保留引用，现代引擎通过 `unhandledrejection` 事件（浏览器）和 `process.unhandledRejection`（Node.js）来检测

---

## 代码演示

### 面试手写版（Promise/A+ 核心）

```typescript
const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

class MyPromise {
  private state = PENDING
  private value: any = undefined
  private reason: any = undefined
  private onFulfilledCallbacks: Function[] = []
  private onRejectedCallbacks: Function[] = []

  constructor(executor: (resolve: Function, reject: Function) => void) {
    const resolve = (value: any) => {
      if (this.state !== PENDING) return
      this.state = FULFILLED
      this.value = value
      this.onFulfilledCallbacks.forEach(fn => fn())
    }

    const reject = (reason: any) => {
      if (this.state !== PENDING) return
      this.state = REJECTED
      this.reason = reason
      this.onRejectedCallbacks.forEach(fn => fn())
    }

    try {
      executor(resolve, reject)
    } catch (e) {
      reject(e)
    }
  }

  then(onFulfilled?: Function, onRejected?: Function) {
    // 透传：如果没传回调，直接把值往后传
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : (v: any) => v
    onRejected = typeof onRejected === 'function' ? onRejected : (r: any) => { throw r }

    const promise2 = new MyPromise((resolve, reject) => {
      const handle = (fn: Function, value: any) => {
        // 用微任务模拟异步调度
        queueMicrotask(() => {
          try {
            const x = fn(value)
            resolvePromise(promise2, x, resolve, reject)  // Resolution Procedure
          } catch (e) {
            reject(e)
          }
        })
      }

      if (this.state === FULFILLED) {
        handle(onFulfilled, this.value)
      } else if (this.state === REJECTED) {
        handle(onRejected, this.reason)
      } else {
        // pending 状态：注册回调，等 resolve/reject 调用
        this.onFulfilledCallbacks.push(() => handle(onFulfilled, this.value))
        this.onRejectedCallbacks.push(() => handle(onRejected, this.reason))
      }
    })

    return promise2
  }

  catch(onRejected: Function) {
    return this.then(undefined, onRejected)
  }

  finally(callback: Function) {
    return this.then(
      (value: any) => MyPromise.resolve(callback()).then(() => value),
      (reason: any) => MyPromise.resolve(callback()).then(() => { throw reason })
    )
  }

  // 静态方法
  static resolve(value: any) {
    if (value instanceof MyPromise) return value
    return new MyPromise((resolve: Function) => resolve(value))
  }

  static reject(reason: any) {
    return new MyPromise((_: Function, reject: Function) => reject(reason))
  }
}

// Resolution Procedure（A+ 规范 2.3）
function resolvePromise(promise2: MyPromise, x: any, resolve: Function, reject: Function) {
  // 2.3.1: 循环引用检测
  if (x === promise2) {
    return reject(new TypeError('Chaining cycle detected'))
  }

  // 2.3.2: 如果 x 是 Promise，沿用其状态
  if (x instanceof MyPromise) {
    x.then(resolve, reject)
    return
  }

  // 2.3.3: 如果 x 是 thenable 对象
  if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    let called = false  // 防止多次调用
    try {
      const then = x.then
      if (typeof then === 'function') {
        then.call(
          x,
          (y: any) => { if (called) return; called = true; resolvePromise(promise2, y, resolve, reject) },
          (r: any) => { if (called) return; called = true; reject(r) }
        )
      } else {
        resolve(x)  // 有 then 属性但不是函数，当普通值处理
      }
    } catch (e) {
      if (called) return
      reject(e)
    }
  } else {
    // 2.3.4: 普通值，直接 resolve
    resolve(x)
  }
}
```

### Promise.all 手写

```typescript
function promiseAll<T>(promises: (T | Promise<T>)[]): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = []
    let count = 0
    const len = promises.length

    if (len === 0) return resolve([])

    promises.forEach((p, i) => {
      // 用 Promise.resolve 包装，兼容非 Promise 值
      Promise.resolve(p).then(
        val => {
          results[i] = val       // 用索引保证顺序
          if (++count === len) resolve(results)
        },
        err => reject(err)       // 有一个失败就立即 reject
      )
    })
  })
}
```

### Promise.race 手写

```typescript
function promiseRace<T>(promises: (T | Promise<T>)[]): Promise<T> {
  return new Promise((resolve, reject) => {
    promises.forEach(p => {
      Promise.resolve(p).then(resolve, reject)  // 谁先决议就用谁的结果
    })
  })
}
```

---

## 在本项目中的应用

### 1. AI 引擎并发请求

```typescript
// apps/ai-engine 中同时调用多个 LLM 做 ensemble
const results = await Promise.all([
  openai.chat.completions.create({ messages }),
  anthropic.messages.create({ messages }),
  qwen.chat({ messages }),
])
// Promise.all 并发 vs 串行 await：并发节省 2/3 时间
```

### 2. 药品信息并行加载

```typescript
// apps/web 中并行加载药品详情和相关推荐
const [drug, recommendations] = await Promise.all([
  fetchDrug(id),
  fetchRecommendations(id),
])
```

### 3. 后端超时控制

```typescript
// apps/api 中给数据库查询加超时
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    ),
  ])
}
```

---

## 易混淆点

| 概念 A | 概念 B | 关键区别 |
|--------|--------|---------|
| `Promise.all` | `Promise.allSettled` | all 有一个 reject 就立即 reject；allSettled 等所有都结束才返回 |
| `Promise.all` | `Promise.race` | all 等全部完成；race 取最先完成的（无论成功或失败） |
| `Promise.race` | `Promise.any` | race 取最先决议的（成功或失败）；any 取最先成功的（全部失败才 reject） |
| `then` 的第二个参数 | `catch` | 二者都能捕获 reject，但 catch 还能捕获 onFulfilled 中的异常 |
| 微任务调度 | 同步执行 | Promise executor 是同步的，then 回调是微任务 |
| `new Promise(resolve => resolve(p))` | `Promise.resolve(p)` | 后者会检测 p 是否是 Promise 并直接返回，前者会多包一层 |

---

## 扩展阅读

1. **Promise/A+ 规范**（必读）
   - https://promisesaplus.com/
   - 4000 字的英文规范，手写 Promise 的唯一权威参考
   - 面试时能说出「A+ 规范 2.3 Resolution Procedure」是加分项

2. **ECMA-262 规范第 26 章**
   - https://tc39.es/ecma262/#sec-promise-objects
   - 理解 `PromiseResolveThenableJob` 和 `PromiseReactionJob` 的调度机制

---

## 自测

**Q：手写 `Promise.all`，要求：支持并发、保持结果顺序、有一个 reject 就立即 reject。如果传入空数组，应该 resolve 什么？**

<details>
<summary>点击查看答案</summary>

```typescript
function promiseAll<T>(promises: (T | Promise<T>)[]): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = []
    let count = 0
    const len = promises.length

    if (len === 0) return resolve([])  // 空数组 resolve 空数组

    promises.forEach((p, i) => {
      Promise.resolve(p).then(
        val => {
          results[i] = val
          if (++count === len) resolve(results)
        },
        err => reject(err)
      )
    })
  })
}
```

关键点：
1. 用 `Promise.resolve(p)` 包装，兼容非 Promise 值
2. 用 `results[i]` 而不是 `push`，保证顺序
3. 用 `count` 计数而非 `results.length`（稀疏数组问题）
4. 空数组立即 resolve `[]`（这是规范要求）
</details>

---

> ⚠️ 本文是「异步编程」系列的第 1 篇，还有以下内容待学习：
> - [x] async/await 底层原理（Generator + 自动执行器） → [[async-await]]
> - [ ] Generator & Iterator 协议
> - [x] 手写 Promise.allSettled / Promise.any → [[promise-combinators]]
