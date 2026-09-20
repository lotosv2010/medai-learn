# Node.js 事件驱动内核：EventEmitter 源码 + Promise/A+ 手写 + 并发控制（面试收藏级）

> 面试官说「聊聊 Node.js 的事件驱动」，多数人只会背一句「Node 用事件循环处理异步」。能把 EventEmitter 的内核实现、Promise/A+ 规范的三条硬约束、以及医疗场景下的并发控制讲清楚，才是真正理解了这个运行时的心脏。

---

## 🎯 这篇文章解决什么问题

前端转 Node.js 的第一个认知门槛，往往不是语法，而是「事件驱动」这四个字背后的运行时机制。你可能写过无数个 `EventEmitter`、用过无数个 `Promise.all`，但被问到底层——`EventEmitter` 用什么结构存监听器？`once` 是怎么实现的？`Promise.all` 为什么能保序？并发数怎么限制？——很多人就卡住了。

这篇文章是「Node.js 全栈深度拆解」系列的第 1 篇。它不讲 JS 基础概念（高阶函数、柯里化、函数组合这些已经在 JS 函数式编程篇讲透了），只讲三件 Node 视角的硬核增量：

1. **发布订阅在 Node 里的落地——EventEmitter 的源码级实现**
2. **Promise 的规范层——Promise/A+ 三条约束与手写**
3. **Promise 聚合的工程层——医疗场景下的并发控制**

---

## 📡 发布订阅：从社区模式到 Node 内置 EventEmitter

发布订阅模式本身不是 Node 独有，前端也天天用（Vue 的响应式、各种 EventBus）。但 Node 把它做成了**运行时内置能力**——`EventEmitter`。这一节我们不讲「什么是发布订阅」（这是 JS 基础），只讲它在 Node 里怎么实现、怎么被源码落地。

### 基本用法

```javascript
const { EventEmitter } = require('events')
const emitter = new EventEmitter()

emitter.on('report-done', (patientId) => {
  console.log(`HIS 系统已归档患者 ${patientId} 的检验报告`)
})

emitter.emit('report-done', 'P10086')
```

`on` 注册监听器，`emit` 触发事件，`off` 解绑，`once` 只触发一次。这是每个 Node 开发者都写过的东西。但下面这个用法，才是事件驱动真正发力的场景——**一个事件，多个订阅方解耦**。

### 医院场景：一个「检验报告完成」事件，三个订阅方

```javascript
const reportEvents = new EventEmitter()

// 订阅方 1：HIS 系统归档
reportEvents.on('report-done', (report) => {
  archiveToHIS(report)
})

// 订阅方 2：短信通知服务
reportEvents.on('report-done', (report) => {
  sendSMS(report.patientPhone, '您的检验报告已出')
})

// 订阅方 3：统计报表
reportEvents.on('report-done', (report) => {
  incrementDailyReportCount(report.deptId)
})

// 检验完成后，只 emit 一次，三个订阅方各自处理
reportEvents.emit('report-done', report)
```

关键点在于**解耦**：发布检验结果的一方（检验科系统）完全不知道有谁在订阅，订阅的三方也互相不知道对方存在。后面要加「邮件通知」、要加「AI 异常预警」，只需要再 `on` 一个，不用改任何现有代码。

### 内核：一个 Map 维护「事件名 → 监听器集合」

EventEmitter 的存储结构，本质就是「事件名 → 监听器集合」的映射。精简成一句话：`Map<eventName, listener | listener[]>`——单个监听器直接存函数，出现第二个才升级为数组。

`emit(event)` 做的事，就是**遍历这个事件名下的所有监听器，依次同步调用**：

```javascript
class MiniEventEmitter {
  constructor() {
    this._events = new Map() // 事件名 -> 监听器函数 或 监听器数组
  }

  on(event, listener) {
    const existing = this._events.get(event)
    if (existing === undefined) {
      this._events.set(event, listener)                  // 单个监听器直接存函数
    } else if (Array.isArray(existing)) {
      existing.push(listener)                            // 已有多个，追加到数组
    } else {
      this._events.set(event, [existing, listener])      // 第二个监听器来了，升级成数组
    }
    return this // 支持链式 on(...).on(...)
  }

  off(event, listener) {
    const existing = this._events.get(event)
    if (existing === undefined) return this
    if (existing === listener) {
      this._events.delete(event)                         // 只剩这一个，直接删掉
    } else if (Array.isArray(existing)) {
      const idx = existing.indexOf(listener)
      if (idx !== -1) existing.splice(idx, 1)
    }
    return this
  }

  emit(event, ...args) {
    const listeners = this._events.get(event)
    if (listeners === undefined) {
      // Node 约定：'error' 事件若没有任何监听器，直接抛出，避免错误被静默吞掉
      if (event === 'error') throw args[0]
      return
    }
    // 用数组兜底统一遍历，同步依次调用
    for (const listener of Array.isArray(listeners) ? listeners : [listeners]) {
      listener(...args)
    }
  }
}
```

上面用 `Map` 是为了直观，真实源码用的是普通对象 `this._events` 做存储，但「单个监听器存函数、多个才升级为数组」这个省内存的小优化是一样的（多数事件只有一个监听器，就不必为它分配数组）。

注意「升级成数组」这一步**不能用 `Set`**——`Set` 会去重，而 EventEmitter 允许同一个函数重复 `on`，重复注册就要触发多次。这是它和「去重集合」语义的关键差异，也是面试里容易被追问的点。

还有两个值得记住的细节：一是 Node 约定 `'error'` 事件若没有监听器，`emit('error')` 会直接把错误抛出去（否则错误被静默吞掉，排查无从下手），所以用 EventEmitter 做错误通道时务必先 `on('error')`；二是默认同一个事件最多注册 10 个监听器，超过会打一条 `MaxListenersExceededWarning` 警告——这是帮你发现「监听器泄漏」（反复 `on` 却忘了 `off`），可以用 `setMaxListeners(0)` 关闭，但更该做的是排查为什么会累积到 10 个。

### once 的实现技巧：包装一层「调用后自我移除」

`once` 是面试里最爱问的细节。它的实现不是「在 emit 内部特殊判断这个监听器是不是 once 类型」，而是**包一层包装函数**——这个包装函数在第一次被调用后，先把自己从监听器集合里移除，再调用真正的监听器：

```javascript
once(event, listener) {
  const wrapper = (...args) => {
    this.off(event, wrapper) // 先自我移除
    listener(...args)        // 再执行真正的监听器
  }
  this.on(event, wrapper)
}
```

这个设计很聪明：`emit` 完全不用知道「这个监听器是不是一次性」的，它只负责遍历调用。一次性语义被**封装在监听器自身**里，职责清晰，这也是源码里 `_onceWrap` 做法的简化版。

### 对比前端：Vue 响应式和 EventEmitter 是同一套内核

Vue 的响应式系统，`dep.notify()` 遍历 `subs` 数组通知订阅者；EventEmitter 的 `emit()` 遍历监听器集合通知订阅者。**内核是同一套发布订阅模式**。

唯一的区别在于「订阅」这个动作由谁来做：

- EventEmitter 需要你**手动** `on` 注册
- Vue 在 `effect` 执行时**自动**做依赖收集（读到哪个响应式数据，就自动订阅哪个 dep）

理解了这一点，再看 Vue 的响应式，就不会觉得是玄学了——它只是把一个「手动模式」做成了「自动模式」。

### 观察者 vs 发布订阅：一个是「退化形态」，一个加了「事件中心」

聊到发布订阅，几乎一定会被追问「它和观察者模式有什么区别」。要讲清区别，先得看观察者长什么样——它**没有事件中心**，目标对象直接维护观察者列表：

```javascript
class Subject {
  constructor() {
    this.observers = [] // Subject 直接持有 Observer，没有中间层
  }
  addObserver(observer) {
    this.observers.push(observer)
  }
  notify(report) {
    // 状态变化时，主动逐个通知观察者
    for (const observer of this.observers) {
      observer.update(report)
    }
  }
}

// 检验科是 Subject，三个科室是 Observer
const labSubject = new Subject()
labSubject.addObserver({ update: (r) => archiveToHIS(r) })
labSubject.addObserver({ update: (r) => sendSMS(r.patientPhone) })
labSubject.addObserver({ update: (r) => incrementDailyReportCount(r.deptId) })

labSubject.notify(report) // Subject 亲自通知每一个观察者
```

对比一下两种模式，核心就一条——**有没有「事件中心」这层解耦**：

| 维度 | 观察者模式 | 发布订阅模式 |
|------|-----------|-------------|
| 耦合关系 | Subject **直接持有** Observer 列表，彼此知道对方 | 发布者、订阅者**互不知道**，都只认识事件中心 |
| 通知方式 | Subject 状态一变，**主动逐个**调用 Observer | 发布者发事件给中心，中心**转发**给订阅者 |
| 代码形态 | `Subject.addObserver()` + `Subject.notify()` | `EventBus.on()` / `EventBus.emit()` |
| 典型用例 | 单个对象的状态变更，通知少量固定依赖方 | 跨模块、跨服务的解耦广播，订阅方可动态增减 |

**它们的关系不是「两种并列的模式」，而是同源**：观察者是发布订阅的**退化形态**——把发布订阅里的「事件中心」拿掉，让 Subject 自己维护订阅者列表、自己发通知，就退回成了观察者；反过来，给观察者加上一个独立的「事件中心」把双方解耦，就升级成了发布订阅。

用一句话记：**发布订阅 = 观察者 + 独立事件中心**。观察者里 Subject 和 Observer 是紧耦合的（`Subject` 类里写了 `this.observers`，就知道有谁在订阅）；发布订阅里双方彻底解耦（前面的 `reportEvents` 例子，检验科系统发完事件根本不知道有谁在听）。

还有一个高频误区要纠正：**DOM 的 `addEventListener` 常被说成观察者，其实它是发布订阅**——`button.addEventListener('click', fn)` 里，触发方（用户点击）和监听方（你的 `fn`）互不知道对方存在，中间是**浏览器事件系统**充当事件中心来派发。所以它更接近发布订阅，而不是 `Subject` 直接持有 `Observer` 的观察者。

> 💬 **面试官**：发布订阅模式和观察者模式有什么区别？
>
> ✅ 标准答案：核心区别在于是否存在「事件中心」这一层解耦。观察者模式是目标对象（Subject）直接维护观察者列表，状态变化时主动逐个通知；发布订阅模式多了一个独立的事件中心，发布者和订阅者互不知道对方存在，都只和事件中心交互。
>
> 🎁 加分答案：能说出两者**同源**——观察者是发布订阅的「退化形态」，把事件中心拿掉、让 Subject 自己维护订阅者列表就退回观察者；换句话说「发布订阅 = 观察者 + 独立事件中心」。再补一句：DOM 的 `addEventListener` 常被误当作观察者，实际是发布订阅（浏览器是事件中心）。EventEmitter 的 `once` 用「包装函数自我移除」实现一次性语义，则是对源码级实现细节的加分。

---

## ⚡ Promise：从「用法」到「规范 + 手写」

Promise 的用法、演进史（回调 → Promise → Generator → async/await）在 JS 异步编程篇已经讲透，这里不重复。这一节只聚焦一个增量：**Promise/A+ 规范的三条硬约束**，以及它们怎么决定你手写 Promise 的正确性。

### Promise/A+ 三条核心约束

规范文字很多，但真正决定实现正确性的，就这三条：

**① 状态机只有三态，且落定后不可逆**

`pending` → `fulfilled`（带 value），或 `pending` → `rejected`（带 reason）。一旦落定，就永远停在这个状态。这条约束保证了「结果一旦确定，就不会被后续代码意外改变」——如果状态能来回变，一个 Promise 的 `.then` 回调可能被触发多次，整个链式调用就崩溃了。

**② 每次 `.then` 都返回一个新的 Promise**

这是链式调用能进行下去的关键。注意，返回的是**新 Promise**，不是 `this`（原 Promise 被复用）。如果返回的是 `this`，那同一个 Promise 上多次 `.then` 就会互相覆盖状态，链就断了。

**③ 回调必须异步执行（原生 Promise 用微任务）**

即使 Promise 已经落定，`.then` 传入的 `onFulfilled` 也不能同步调用，必须异步执行。注意一个容易混淆的点：**Promise/A+ 规范只要求「异步」，并没有强制「微任务」**——用 `setTimeout`（宏任务）实现也能通过官方测试套件；「用微任务」是**原生 Promise** 的选择，因为它比宏任务执行更早、性能更好。手写时用 `queueMicrotask` 最贴近原生 Promise 的行为。这条约束的意义在于避免「有时同步、有时异步」的不确定行为——`Promise` 的执行时机必须是稳定的。

### 链式调用的值传递机制

每个 `.then` 内部创建的新 Promise，会根据 `onFulfilled` 的**返回值**决定自己的状态：

- 返回**普通值** → 新 Promise 直接以该值 resolve
- 返回**另一个 Promise（或 thenable）** → 等待这个返回的 Promise 落定，再把结果透传下去

这就是「Promise 能扁平化嵌套异步」的原理。你 `return` 一个 Promise，链会等你；你 `return` 一个值，链直接透传。

### 手写完整实现（TypeScript）

理解了三条约束，手写 Promise 的骨架就出来了。下面给出一个**运行时语义对齐 Promise/A+、API 对齐官方 Promise** 的 TS 版完整实现，分四块讲——状态机、`then` + `resolvePromise`、`catch`/`finally`、六个静态方法。类型上做了合理简化（`all` 用数组签名而非官方元组重载、`resolvePromise` 的 `x` 用 `unknown` 中转避免递归泛型爆炸），但运行行为是完整的。

**第一块：类型 + 三态状态机 + resolve/reject**

```typescript
type State = 'pending' | 'fulfilled' | 'rejected'

// 任何「带 then 方法的对象」都算 thenable（不一定是本类实例，可能是别的 Promise 库）
interface Thenable<T = unknown> {
  then: (onFulfilled: (value: T) => unknown, onRejected: (reason: unknown) => unknown) => unknown
}

function isThenable<T = unknown>(value: unknown): value is Thenable<T> {
  return (
    (typeof value === 'object' && value !== null) ||
    typeof value === 'function'
  ) && typeof (value as Thenable<T>).then === 'function'
}

class MyPromise<T = unknown> {
  private _state: State = 'pending'
  private _value!: T
  private _reason!: unknown
  private _onFulfilled: Array<() => void> = []
  private _onRejected: Array<() => void> = []

  constructor(executor: (resolve: (value: T | Thenable<T>) => void, reject: (reason: unknown) => void) => void) {
    try {
      // try/catch 只能捕获同步异常，异步异常要靠 reject
      executor(this._resolve, this._reject)
    } catch (e) {
      this._reject(e)
    }
  }

  private _resolve = (value: T | Thenable<T>): void => {
    // ① 状态不可逆
    if (this._state !== 'pending') return
    // 若 resolve 了一个 thenable，则「等它落定」再透传（这正是嵌套 Promise 被扁平化的根本）
    if (isThenable(value)) {
      value.then(this._resolve, this._reject)
      return
    }
    this._state = 'fulfilled'
    this._value = value
    this._onFulfilled.forEach((fn) => fn()) // 发布
  }

  private _reject = (reason: unknown): void => {
    if (this._state !== 'pending') return
    this._state = 'rejected'
    this._reason = reason
    this._onRejected.forEach((fn) => fn())
  }
}
```

**第二块：`then` + `resolvePromise`（thenable 递归解析）**

```typescript
  then<TResult = T>(
    onFulfilled?: (value: T) => TResult | Thenable<TResult>,
    onRejected?: (reason: unknown) => TResult | Thenable<TResult>
  ): MyPromise<TResult> {
    // 可选参数透传：没传成功回调就原样透传值，没传失败回调就继续把错误抛给下一个 then
    const onF = typeof onFulfilled === 'function' ? onFulfilled : (v: T) => v as unknown as TResult
    const onR = typeof onRejected === 'function'
      ? onRejected
      : (e: unknown) => { throw e }

    // ② 返回一个新 Promise，而不是 this
    const promise2 = new MyPromise<TResult>((resolve, reject) => {
      const handleFulfilled = () => {
        // ③ 用微任务异步执行
        queueMicrotask(() => {
          try {
            const x = onF(this._value)
            resolvePromise(promise2, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
      }
      const handleRejected = () => {
        queueMicrotask(() => {
          try {
            const x = onR(this._reason)
            resolvePromise(promise2, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
      }

      if (this._state === 'fulfilled') handleFulfilled()
      else if (this._state === 'rejected') handleRejected()
      else {
        // pending：先订阅，等落定后再发布
        this._onFulfilled.push(handleFulfilled)
        this._onRejected.push(handleRejected)
      }
    })
    return promise2
  }
```

`resolvePromise` 是 Promise/A+ 的核心难点，处理「返回值 x 到底是什么」：x 是普通值就 resolve；x 是 thenable 就调用它的 `then` 递归解析；还要防「x 就是 promise2 自己」的死循环、防「then 被多次调用」：

```typescript
function resolvePromise<T>(
  promise2: MyPromise<T>,
  x: unknown,
  resolve: (value: T) => void,
  reject: (reason: unknown) => void
): void {
  // 1. x 就是 promise2 自己 → 永远无法落定，直接抛循环引用错误
  if (promise2 === x) {
    return reject(new TypeError('Chaining cycle detected for promise'))
  }

  // 2. x 是对象/函数（可能是 thenable）
  if ((typeof x === 'object' && x !== null) || typeof x === 'function') {
    let called = false // 防 then 被多次调用（只认第一次）
    try {
      const then = (x as Thenable).then // 只取一次，避免 getter 反复触发
      if (typeof then === 'function') {
        then.call(
          x,
          (y: unknown) => {
            if (called) return
            called = true
            resolvePromise(promise2, y, resolve, reject) // y 可能还是 thenable，递归解析
          },
          (r: unknown) => {
            if (called) return
            called = true
            reject(r)
          }
        )
      } else {
        resolve(x as T) // { then: 123 } 这种对象不是 thenable，直接当普通值
      }
    } catch (e) {
      if (called) return
      called = true
      reject(e)
    }
  } else {
    // 3. x 是普通值，直接 resolve
    resolve(x as T)
  }
}
```

**第三块：`catch` + `finally`**

```typescript
  catch<TResult = never>(
    onRejected?: (reason: unknown) => TResult | Thenable<TResult>
  ): MyPromise<T | TResult> {
    return this.then(undefined, onRejected)
  }

  finally(onFinally?: () => void): MyPromise<T> {
    return this.then(
      (value) => MyPromise.resolve(onFinally?.()).then(() => value),
      (reason) => MyPromise.resolve(onFinally?.()).then(() => { throw reason })
    )
  }
```

**第四块：静态方法 `resolve` / `reject` / `all` / `race` / `allSettled` / `any`**

```typescript
  static resolve<T>(value: T | Thenable<T>): MyPromise<T> {
    if (value instanceof MyPromise) return value // 已是 MyPromise 直接复用
    return new MyPromise<T>((resolve) => resolve(value)) // _resolve 会处理 thenable
  }

  static reject<T = never>(reason: unknown): MyPromise<T> {
    return new MyPromise<T>((_, reject) => reject(reason)) // reject 不解析 thenable
  }

  static all<T>(promises: Array<T | Thenable<T>>): MyPromise<T[]> {
    return new MyPromise<T[]>((resolve, reject) => {
      const results = new Array<T>(promises.length)
      let count = 0
      if (promises.length === 0) return resolve(results) // 空数组立即 resolve []
      promises.forEach((p, index) => {
        MyPromise.resolve(p).then(
          (value) => {
            results[index] = value // 👈 下标写入保序，不是 push
            count++
            if (count === promises.length) resolve(results)
          },
          reject // 任意一个 reject，整体立即 reject
        )
      })
    })
  }

  static race<T>(promises: Array<T | Thenable<T>>): MyPromise<T> {
    return new MyPromise<T>((resolve, reject) => {
      for (const p of promises) {
        MyPromise.resolve(p).then(resolve, reject) // 谁先决议用谁，后到的被状态不可逆挡掉
      }
    })
  }

  static allSettled<T>(promises: Array<T | Thenable<T>>): MyPromise<Array<SettledResult<T>>> {
    return new MyPromise((resolve) => {
      const results = new Array<SettledResult<T>>(promises.length)
      let count = 0
      if (promises.length === 0) return resolve(results)
      promises.forEach((p, index) => {
        MyPromise.resolve(p).then(
          (value) => { results[index] = { status: 'fulfilled', value }; done() },
          (reason) => { results[index] = { status: 'rejected', reason }; done() }
        )
        function done() {
          count++
          if (count === promises.length) resolve(results)
        }
      })
    })
  }

  static any<T>(promises: Array<T | Thenable<T>>): MyPromise<T> {
    return new MyPromise<T>((resolve, reject) => {
      const errors = new Array<unknown>(promises.length)
      let count = 0
      if (promises.length === 0) return reject(new AggregateError([], 'All promises were rejected'))
      promises.forEach((p, index) => {
        MyPromise.resolve(p).then(
          resolve, // 第一个成功就直接 resolve
          (reason) => {
            errors[index] = reason
            count++
            if (count === promises.length) {
              reject(new AggregateError(errors, 'All promises were rejected'))
            }
          }
        )
      })
    })
  }
}

type SettledResult<T> = { status: 'fulfilled'; value: T } | { status: 'rejected'; reason: unknown }
```

这份实现对齐了官方 Promise 的**完整 API 面**：实例方法 `then`/`catch`/`finally`，静态方法 `resolve`/`reject`/`all`/`race`/`allSettled`/`any` 一个不少；运行时的关键语义——三态不可逆、`then` 返回新 Promise、微任务异步、thenable 递归解析、循环引用抛错、可选参数透传——也都按 Promise/A+ 规范落实了。用 promises-aplus-tests 官方测试套件跑通 872 个用例（当时的用例数，会随版本微调），才算对规范细节（比如 `x.then` 只取一次、`called` 防多次调用）真正吃透。

### Promise.all 的保序实现：下标写入而非 push

`Promise.all` 最容易被忽视的细节：**结果顺序必须和传入顺序一致**，而不是按完成顺序。上面第四块的 `all` 用的就是「计数器 + 下标写入」：

```typescript
static all<T>(promises: Array<T | Thenable<T>>): MyPromise<T[]> {
  return new MyPromise<T[]>((resolve, reject) => {
    const results = new Array<T>(promises.length)
    let count = 0
    if (promises.length === 0) return resolve(results)
    promises.forEach((p, index) => {
      MyPromise.resolve(p).then(
        (value) => {
          results[index] = value // 👈 按下标写入，不是 push
          count++
          if (count === promises.length) resolve(results)
        },
        reject
      )
    })
  })
}
```

为什么不能 `results.push(value)`？因为如果第 3 个 Promise 先完成，`push` 会把它放到下标 0，结果顺序就乱了。用**下标写入 + 计数器**，无论哪个先完成，最终数组的顺序都和传入顺序严格一致。

---

## 🔧 并发控制：Promise 聚合的工程落地

这一节是两篇 JS 系列文章都没展开的**实用增量**。面试里「Promise.all / race / allSettled / any 的区别」是基础题，但「怎么限制并发数」是能拉开差距的实战题。

### 四种聚合模式的适用场景

| 方法 | 决议条件 | 失败处理 | 适用场景 |
|------|---------|---------|---------|
| `Promise.all` | 全部成功才 resolve | 一个 reject 立即整体 reject | 多个**缺一不可**的接口（患者详情 = 基本信息 + 病历 + 检验报告） |
| `Promise.race` | 最先决议的（无论成败） | 最快那个决定结果 | 超时控制、竞速（`Promise.race([请求, 超时])`） |
| `Promise.allSettled` | 全部结束 | 永不 reject，每个结果带状态 | 批量处理**允许部分失败**（批量导入药品，失败的记录错误日志） |
| `Promise.any` | 最先成功的 | 全败才 reject（AggregateError） | 多数据源兜底（主库 + 备库，哪个快用哪个） |

### 场景：批量拉取药品说明书详情

医院 HIS 系统要一次性拉取 1000 种药品的说明书详情。如果用 `Promise.all` 一次性发 1000 个请求，会瞬间打满下游接口的连接池，轻则限流、重则雪崩。

正确做法是**限制最大并发数**——同时 in-flight 的请求不超过 N 个（比如 5 个），超出部分排队等待。这是「背压」思想在 Promise 聚合层的体现：

```javascript
function limitConcurrency(tasks, limit) {
  const results = new Array(tasks.length)
  let running = 0
  let next = 0

  return new Promise((resolve) => {
    function run() {
      while (running < limit && next < tasks.length) {
        const index = next++          // 取当前要执行的任务下标
        running++
        tasks[index]()
          .then((value) => { results[index] = value })
          .catch((err) => { results[index] = { error: err.message } })
          .finally(() => {
            running--
            if (next === tasks.length && running === 0) {
              resolve(results)        // 全部跑完才结束
            } else {
              run()                    // 空出一个名额，继续喂
            }
          })
      }
    }
    run()
  })
}
```

这个实现有三个关键点：

1. **`running < limit` 是并发窗口**——同时跑的任务数被限制在 `limit` 内
2. **下标写入**——`results[index]` 而不是 push，保证结果顺序和任务顺序一致
3. **`finally` 里递归 `run()`**——每完成一个任务，空出一个名额，立刻补上下一个，直到全部完成

> 💬 **面试官**：怎么限制 Promise 的并发数？说说你的思路。
>
> ✅ 标准答案：维护一个「运行中任务数」的计数器，用一个循环在计数器小于上限时不断取新任务执行；每个任务完成后计数器减一，并递归地继续取下一个任务，直到所有任务完成。结果用下标写入保证顺序。
>
> 🎁 加分答案：能说出这是「背压」思想在应用层的体现——一次性 `Promise.all` 会把下游打满，限流是「生产者速度」和「消费者能力」的匹配。再补一句：这个模式封装成 `pLimit` 那样的工具库，就是很多 Node 项目里的标准做法。

---

## 💡 一张图总结（面试速记）

| 知识点 | 一句话内核 | 面试频率 |
|--------|-----------|---------|
| EventEmitter 存储 | `事件名 → 监听器函数/数组`（单函数省内存，多个升级为数组） | ⭐⭐⭐ 必考 |
| once 实现 | 包装函数「调用后自我移除」 | ⭐⭐⭐ 必考 |
| 发布订阅 vs 观察者 | 有没有「事件中心」这一层解耦（发布订阅 = 观察者 + 事件中心） | ⭐⭐⭐ 必考 |
| Promise/A+ 三约束 | 三态不可逆 / then 返回新 Promise / 异步（原生用微任务） | ⭐⭐⭐ 必考 |
| Promise.all 保序 | 计数器 + 下标写入，不是 push | ⭐⭐ 高频 |
| 并发控制 | 限制 in-flight 任务数，递归补位 | ⭐⭐ 高频 |

> 💡 记住这条主线：**发布订阅（解耦）→ EventEmitter（Node 内置实现）→ Promise/A+（规范约束）→ 并发控制（工程落地）**。事件驱动的每一步，都在把「异步的复杂性」装进「可控的抽象」里。

---

## 📝 留个问题

`Promise.all` 用「计数器 + 下标写入」保序，那 `Promise.race` 呢？它不需要保序，只需要「谁先决议就用谁」——它的实现其实比 `all` 更简单，但有一个容易被忽略的边界：**传入空数组时，`Promise.race([])` 会永远 pending 吗？** 提示：对比 `Promise.all([])` 会立即 resolve 一个空数组 `[]`，`race` 在没有任何参赛者时会发生什么？想想规范的约定。

欢迎评论区写出你的答案 👇

---

> 🔖 这是「Node.js 全栈深度拆解」系列第 1 篇。下一篇预告：《Node.js 事件循环：浏览器与 Node 宏任务/微任务差异全解》——libuv 六阶段、`process.nextTick` 与 Promise 的优先级之争。
>
> 前置基础扩展阅读：搜索关键词「JS 函数式编程 高阶函数 柯里化 函数组合」「JS 异步编程 Promise 发布订阅」「Promise/A+ 规范」「promises-aplus-tests」
