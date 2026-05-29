# Generator & Iterator 协议

> 记录时间：2026-05-29
> 关联模块：apps/ai-engine（流式数据处理）、apps/web（无限滚动分页）、packages/shared（惰性求值工具）
> 重要程度：⭐⭐（面试偶尔考，但理解它是理解 async/await、for...of、展开运算符的基础）
> 前置知识：[[async-await]]、[[event-loop]]、[[scope-chain-closures]]

---

## 一句话总结（面试 30 秒版）

Iterator 是 JS 中**统一的遍历协议**（任何对象只要实现 `next()` 方法就能被 `for...of` 遍历），Generator 是**创建迭代器的语法糖**（`function*` + `yield` 让你能用同步写法暂停和恢复函数执行）—— 它们是 `for...of`、展开运算符、解构赋值、async/await 的底层机制。

---

## 核心概念

### 1. Iterator 协议：统一遍历的接口规范

任何对象只要实现了 `next()` 方法，且 `next()` 返回 `{ value, done }`，就满足 Iterator 协议。

```javascript
// 手写一个迭代器
function createRangeIterator(start, end) {
  let current = start
  return {
    next() {
      if (current <= end) {
        return { value: current++, done: false }
      }
      return { value: undefined, done: true }
    }
  }
}

const it = createRangeIterator(1, 3)
console.log(it.next())  // { value: 1, done: false }
console.log(it.next())  // { value: 2, done: false }
console.log(it.next())  // { value: 3, done: false }
console.log(it.next())  // { value: undefined, done: true }
```

**类比**：Iterator 就像一个**游标**。每次调用 `next()`，游标往下走一格，返回当前元素。走到末尾时 `done: true`。

### 2. Iterable 协议：可被遍历的对象

一个对象实现了 `Symbol.iterator` 方法（返回一个 Iterator），就满足 Iterable 协议。`for...of` 只能遍历 Iterable。

```javascript
// 让自定义对象可被 for...of 遍历
const range = {
  start: 1,
  end: 5,
  [Symbol.iterator]() {
    let current = this.start
    const end = this.end
    return {
      next() {
        return current <= end
          ? { value: current++, done: false }
          : { value: undefined, done: true }
      }
    }
  }
}

for (const num of range) {
  console.log(num)  // 1, 2, 3, 4, 5
}

// 展开运算符也依赖 Iterable
console.log([...range])  // [1, 2, 3, 4, 5]

// 解构赋值也依赖 Iterable
const [a, b] = range   // a=1, b=2
```

**哪些内置类型是 Iterable？**

| 类型 | 是否 Iterable | 说明 |
|------|:---:|------|
| `Array` | ✅ | 遍历元素 |
| `String` | ✅ | 遍历字符（Unicode-aware） |
| `Map` | ✅ | 遍历 `[key, value]` |
| `Set` | ✅ | 遍历元素 |
| `TypedArray` | ✅ | 遍历元素 |
| `arguments` | ✅ | 遍历参数 |
| `NodeList` | ✅ | 遍历 DOM 节点 |
| `Object` | ❌ | 普通对象不可遍历 |

### 3. Generator：创建迭代器的语法糖

Generator 是一个特殊函数，用 `function*` 声明，调用后返回一个**同时满足 Iterator 和 Iterable 协议**的对象。

```javascript
function* rangeGen(start, end) {
  for (let i = start; i <= end; i++) {
    yield i
  }
}

const gen = rangeGen(1, 3)

// gen 是 Iterator（有 next 方法）
console.log(gen.next())  // { value: 1, done: false }

// gen 也是 Iterable（有 Symbol.iterator，返回自身）
console.log(gen[Symbol.iterator]() === gen)  // true

// 所以可以直接用 for...of
for (const num of rangeGen(1, 5)) {
  console.log(num)  // 1, 2, 3, 4, 5
}
```

### 4. yield 的双向传值（Generator 的灵魂）

`yield` 不仅能**吐出值**，还能通过 `next(value)` **接收值** —— 这是 Generator 最强大也最容易混淆的特性。

```javascript
function* conversation() {
  const name = yield '你叫什么名字？'   // 吐出问题，等待回答
  const age = yield `${name}，你多大了？` // 吐出问题，等待回答
  return `${name} 今年 ${age} 岁`
}

const gen = conversation()
console.log(gen.next())          // { value: '你叫什么名字？', done: false }
console.log(gen.next('小明'))    // { value: '小明，你多大了？', done: false }（'小明' 成了 name）
console.log(gen.next(25))        // { value: '小明 今年 25 岁', done: true }（25 成了 age）
```

**关键理解**：第一个 `gen.next()` 不传值（因为没有 `yield` 等待接收），从第二个 `next(value)` 开始，`value` 会成为上一个 `yield` 表达式的返回值。

### 5. yield* —— 委托给另一个迭代器

`yield*` 把迭代委托给另一个 Iterable，实现迭代器的**组合**。

```javascript
function* concat(iter1, iter2) {
  yield* iter1  // 委托 iter1
  yield* iter2  // 委托 iter2
}

// 等价于
function* concat(iter1, iter2) {
  for (const item of iter1) yield item
  for (const item of iter2) yield item
}

console.log([...concat([1, 2], [3, 4])])  // [1, 2, 3, 4]
```

**递归 Generator**（yield* 的杀手级用法）：

```javascript
// 递归展平嵌套数组
function* flatten(arr) {
  for (const item of arr) {
    if (Array.isArray(item)) {
      yield* flatten(item)  // 递归委托
    } else {
      yield item
    }
  }
}

console.log([...flatten([1, [2, [3, 4]], 5])])  // [1, 2, 3, 4, 5]
```

### 6. Generator 的 return() 和 throw()

Generator 对象除了 `next()`，还有 `return()` 和 `throw()` 两个方法。

```javascript
function* gen() {
  try {
    const a = yield 1
    console.log('a:', a)
    const b = yield 2
    console.log('b:', b)
    return 3
  } catch (e) {
    console.log('caught:', e.message)
    return -1
  }
}

const g = gen()
g.next()             // { value: 1, done: false }

// return() —— 提前终止 Generator
g.return(99)         // { value: 99, done: true }（try/finally 中的 finally 仍会执行）

// throw() —— 在暂停处抛出错误
const g2 = gen()
g2.next()            // { value: 1, done: false }
g2.throw(new Error('oops'))  // 'caught: oops' → { value: -1, done: true }
```

**throw() 的错误传播**：如果 Generator 内部没有 try/catch，错误会**冒泡到外部**：

```javascript
function* gen() {
  yield 1
  yield 2  // 错误会在这里抛出
}

const g = gen()
g.next()                    // { value: 1, done: false }
try {
  g.throw(new Error('err')) // 内部没有 catch，冒泡到外部
} catch (e) {
  console.log(e.message)    // 'err'
}
// 注意：此时 Generator 已终止，后续 next() 都返回 { value: undefined, done: true }
```

---

## 面试回答框架

### 标准回答（2 分钟版）

> Generator 和 Iterator 是 JS 中**统一遍历机制**的两个层次。
>
> Iterator 协议是最底层的 —— 任何对象只要实现 `next()` 方法，返回 `{ value, done }`，就是迭代器。Iterable 协议在此基础上要求对象有 `Symbol.iterator` 方法，返回一个迭代器。`for...of`、展开运算符、解构赋值都依赖这个协议，这就是为什么数组、字符串、Map、Set 能用 `for...of`，但普通对象不行。
>
> Generator 是创建迭代器的语法糖。`function*` 声明的函数调用后返回一个迭代器对象，通过 `yield` 暂停和 `next()` 恢复来控制执行流程。Generator 最强大的特性是 `yield` 的双向传值 —— `yield` 吐出值，`next(value)` 把值传回去。这就是 async/await 的基础：自动执行器用 `next(resolvedValue)` 把 Promise 决议值传回 Generator。
>
> `yield*` 是迭代器组合的关键，它把迭代委托给另一个 Iterable，可以实现递归展平。Generator 还有 `return()` 和 `throw()` 方法，可以提前终止或在暂停处注入错误 —— `throw()` 配合 try/catch 就是 async/await 错误处理的底层机制。

### 常见追问链

1. **追问 1**：「Iterator 和数组的 `forEach` 有什么区别？」
   - 回答要点：Iterator 是**惰性**的，每次 `next()` 才计算下一个值，不预分配内存；`forEach` 需要先把所有数据加载到数组里。Iterator 适合无限序列（如斐波那契数列）或大数据流（逐行读文件），数组适合需要随机访问的场景。

2. **追问 2**：「Generator 和普通函数的执行上下文有什么区别？」
   - 回答要点：普通函数执行时创建执行上下文，执行完毕后销毁。Generator 的执行上下文在 `yield` 时**暂停并保存**（包括局部变量、指令指针），`next()` 时**恢复**。这意味着 Generator 的执行上下文不会被垃圾回收，直到 Generator 执行完毕或被 GC。

3. **追问 3**：「`for...of` 和 `for...in` 的区别？」
   - 回答要点：`for...of` 遍历 **Iterable**（值），`for...in` 遍历对象的**可枚举属性**（键）。`for...in` 会遍历原型链上的属性，`for...of` 不会。数组用 `for...of` 拿到元素值，用 `for...in` 拿到索引（字符串类型）。

4. **追问 4**：「手写一个斐波那契数列的 Generator？」
   - 回答要点：
   ```javascript
   function* fibonacci() {
     let [a, b] = [0, 1]
     while (true) {
       yield a
       ;[a, b] = [b, a + b]
     }
   }
   // 取前 10 个
   const fib10 = [...take(fibonacci(), 10)]
   ```

5. **追问 5**：「Generator 的内存优势体现在哪？」
   - 回答要点：Generator 是惰性求值的。处理 100 万条数据时，`Array.map(filter(data))` 会在内存中创建中间数组；而 Generator 版本每次只处理一条，内存占用 O(1)。这就是为什么大数据处理库（如 RxJS、ixjs）大量使用 Generator 模式。

### 加分回答

- **提到协程（Coroutine）**：Generator 本质上是一种**无栈协程**（stackless coroutine）。它能在函数执行过程中暂停并把控制权交还给调用者，这和线程的抢占式调度不同。async/await 是协程的语法糖
- **提到 Symbol.iterator 的元编程**：你可以用 `Symbol.iterator` 让任何对象可遍历，这是 JS 元编程能力的体现。React 的 `React.Children` 内部就用了类似机制
- **提到 Generator 的取消能力**：Generator 可以通过 `return()` 提前终止，这比 Promise 的不可取消更灵活。Redux-Saga 就是利用 Generator 的这个特性实现了可取消的副作用管理

---

## 代码演示

### 手写 range 迭代器

```javascript
function createRange(start, end, step = 1) {
  return {
    [Symbol.iterator]() {
      let current = start
      return {
        next() {
          if (step > 0 ? current <= end : current >= end) {
            const value = current
            current += step
            return { value, done: false }
          }
          return { value: undefined, done: true }
        }
      }
    }
  }
}

for (const n of createRange(1, 10, 2)) {
  console.log(n)  // 1, 3, 5, 7, 9
}
```

### Generator 实现惰性 map/filter

```javascript
function* lazyMap(iterable, fn) {
  for (const item of iterable) {
    yield fn(item)
  }
}

function* lazyFilter(iterable, predicate) {
  for (const item of iterable) {
    if (predicate(item)) yield item
  }
}

// 链式惰性处理：不创建中间数组
const result = lazyFilter(
  lazyMap([1, 2, 3, 4, 5], x => x * 2),
  x => x > 4
)
console.log([...result])  // [6, 8, 10]
```

### Generator 实现异步流程控制（co 模式）

```javascript
function run(generatorFn) {
  const gen = generatorFn()

  return new Promise((resolve, reject) => {
    function step(key, arg) {
      let result
      try {
        result = gen[key](arg)
      } catch (e) {
        return reject(e)
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

// 使用
run(function* () {
  const user = yield fetch('/api/user/1').then(r => r.json())
  const orders = yield fetch(`/api/orders/${user.id}`).then(r => r.json())
  return { user, orders }
}).then(console.log)
```

### 无限序列 Generator

```javascript
function* fibonacci() {
  let [a, b] = [0, 1]
  while (true) {
    yield a
    ;[a, b] = [b, a + b]
  }
}

function* take(iterable, n) {
  let count = 0
  for (const item of iterable) {
    if (count++ >= n) return
    yield item
  }
}

// 取前 10 个斐波那契数
console.log([...take(fibonacci(), 10)])
// [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

---

## 在本项目中的应用

### 1. AI 引擎流式数据处理

```typescript
// apps/ai-engine — 用 Generator 处理 LLM 流式响应
async function* streamTokens(response: Response) {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    yield decoder.decode(value)
  }
}

// 惰性消费：逐 token 处理
for await (const chunk of streamTokens(response)) {
  process.stdout.write(chunk)
}
```

### 2. 无限滚动分页

```typescript
// apps/web — Generator 实现分页加载器
async function* paginatedFetch(url: string, pageSize: number) {
  let page = 1
  while (true) {
    const data = await fetch(`${url}?page=${page}&size=${pageSize}`)
    const items = await data.json()
    if (items.length === 0) return
    yield items
    page++
  }
}

// 使用：按需加载
const loader = paginatedFetch('/api/drugs', 20)
const firstPage = (await loader.next()).value   // 加载第一页
const secondPage = (await loader.next()).value  // 加载第二页
```

### 3. 状态机实现

```typescript
// packages/shared — 用 Generator 实现有限状态机
function* orderStateMachine() {
  const order = yield 'CREATED'    // 等待事件推进
  if (order.event === 'PAY') {
    const paid = yield 'PAID'
    if (paid.event === 'SHIP') {
      yield 'SHIPPED'
    }
  }
}
```

---

## 易混淆点

| 概念 A | 概念 B | 关键区别 |
|--------|--------|---------|
| `Iterator` | `Iterable` | Iterator 有 `next()`；Iterable 有 `Symbol.iterator` 返回 Iterator |
| `function*` | `function` | function* 返回 Generator 对象（Iterator + Iterable）；function 返回普通值 |
| `yield` | `return` | yield 暂停（可恢复）；return 终止（不可恢复） |
| `for...of` | `for...in` | of 遍历值（Iterable）；in 遍历键（可枚举属性，含原型链） |
| `yield` | `yield*` | yield 吐出单个值；yield* 委托整个 Iterable |
| Generator | Promise | Generator 是同步暂停/恢复；Promise 是异步值的容器。Generator 可被 return() 取消，Promise 不可取消 |
| `gen.next()` | `gen.next(value)` | 第一个 next() 不传值（没有 yield 等待）；后续 next(value) 的 value 成为上一个 yield 的返回值 |

---

## 扩展阅读

1. **MDN: Iteration protocols**
   - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
   - Iterator 和 Iterable 协议的权威定义

2. **MDN: Generator**
   - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator
   - Generator 对象的完整 API 和示例

---

## 自测

**Q1：以下代码输出什么？为什么？**

```javascript
function* gen() {
  const a = yield 1
  const b = yield a + 1
  const c = yield b + 1
  return a + b + c
}

const g = gen()
console.log(g.next())       // ?
console.log(g.next(10))     // ?
console.log(g.next(20))     // ?
console.log(g.next(30))     // ?
```

<details>
<summary>点击查看答案</summary>

```
{ value: 1, done: false }
{ value: 11, done: false }
{ value: 21, done: false }
{ value: 60, done: true }
```

逐步分析：
1. `g.next()` — 执行到 `yield 1`，吐出 1，暂停。此时 `a` 还没有值
2. `g.next(10)` — `10` 成为上一个 `yield 1` 的返回值，即 `a = 10`。执行到 `yield a + 1` = `yield 11`，吐出 11
3. `g.next(20)` — `20` 成为 `yield 11` 的返回值，即 `b = 20`。执行到 `yield b + 1` = `yield 21`，吐出 21
4. `g.next(30)` — `30` 成为 `yield 21` 的返回值，即 `c = 30`。执行 `return a + b + c` = `10 + 20 + 30` = 60

**关键**：`yield` 是一个表达式，它的值来自下一个 `next(value)` 的参数。第一个 `next()` 不传值是因为没有 yield 在等待。

</details>

**Q2：手写一个 `take(n)` Generator，能从任意 Iterable 中取前 n 个元素。**

<details>
<summary>点击查看答案</summary>

```javascript
function* take(iterable, n) {
  let count = 0
  for (const item of iterable) {
    if (count >= n) return
    yield item
    count++
  }
}

// 使用
console.log([...take([10, 20, 30, 40, 50], 3)])  // [10, 20, 30]
console.log([...take('hello', 2)])                // ['h', 'e']

// 配合无限序列
function* naturals() {
  let n = 1
  while (true) yield n++
}
console.log([...take(naturals(), 5)])  // [1, 2, 3, 4, 5]
```

核心要点：
1. `take` 本身也是 Generator（`function*`），返回 Iterable
2. 用 `for...of` 遍历输入（兼容任何 Iterable）
3. 用计数器控制取几个，到 n 个后 `return` 终止
4. 惰性求值：`naturals()` 是无限序列，但 `take` 只取前 5 个就停了

</details>

---

> 本文是「异步编程」系列的第 4 篇（完结），关联笔记：
> - 上一篇：[[async-await]] — async/await 底层原理
> - 前置：[[promise-handwrite]] — Promise 原理与手写实现
> - 前置：[[promise-combinators]] — Promise 组合子
>
> 异步编程系列已全部完成 ✅
