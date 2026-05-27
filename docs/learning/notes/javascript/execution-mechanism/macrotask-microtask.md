# 宏任务与微任务（Macrotask & Microtask）

> 记录时间：2026-05-26
> 关联模块：apps/web（AI 流式渲染）、Promise/Await 全局使用
> 重要程度：⭐⭐⭐（面试高频）

---

## 核心概念

### 本质区别

事件循环每一轮 tick 中，宏任务和微任务的执行时机不同：

```
一轮 tick：
  1. 执行一个宏任务（从宏任务队列取一个）
  2. 清空所有微任务（微任务队列排空，包括执行中新增的）
  3. 渲染（浏览器环境）
  4. 回到 1
```

**一句话**：宏任务一轮一个，微任务一轮清空。

### 为什么分两种队列？

**设计目的不同**：

| 维度 | 宏任务 | 微任务 |
|------|--------|--------|
| 设计意图 | I/O、用户交互等异步事件 | 当前任务的"后续操作" |
| 执行粒度 | 粗粒度（一次一个） | 细粒度（一次全部） |
| 优先级 | 低 | 高 |
| 典型延迟 | 较长（ms 级） | 极短（当前 tick 内） |

微任务的设计初衷：让 Promise 的 `.then()` 能在当前宏任务结束后**立即执行**，而不需要等到下一个宏任务。这保证了 Promise 链的连续性。

---

## 宏任务（Macrotask）详解

### 来源分类

```javascript
// 1. 定时器 —— 最常见的宏任务
setTimeout(callback, delay)       // 定时回调
setInterval(callback, delay)      // 间隔回调（不推荐）

// 2. 用户交互
element.addEventListener('click', callback)   // 事件回调
element.addEventListener('input', callback)

// 3. 网络
fetch(url).then(callback)         // fetch 回调（注意：.then 本身是微任务）
const xhr = new XMLHttpRequest()
xhr.onload = callback             // XHR 回调

// 4. I/O（Node.js）
fs.readFile(path, callback)       // 文件读取
http.createServer(callback)       // HTTP 请求

// 5. MessageChannel
const channel = new MessageChannel()
channel.port1.onmessage = callback

// 6. requestAnimationFrame（有争议，见后文）
requestAnimationFrame(callback)
```

### setTimeout 的"坑"

```javascript
// 坑 1：最小延迟
setTimeout(fn, 0)
// 实际不是 0ms，浏览器 ≥4ms（嵌套 >5 层），Node.js ≥1ms

// 坑 2：this 丢失
const obj = {
  name: 'test',
  greet() {
    setTimeout(function() {
      console.log(this.name)  // undefined！this 指向 window
    }, 100)
  }
}

// 解决：箭头函数
setTimeout(() => {
  console.log(this.name)  // 'test'
}, 100)

// 坑 3：嵌套层级影响最小延迟
setTimeout(() => {
  setTimeout(() => {
    setTimeout(() => {
      // 嵌套 5 层后，最小延迟变成 4ms
    }, 0)
  }, 0)
}, 0)
```

---

## 微任务（Microtask）详解

### 来源分类

```javascript
// 1. Promise —— 最常见的微任务
Promise.resolve().then(callback)
new Promise((resolve) => resolve()).then(callback)
promise.catch(callback)
promise.finally(callback)

// 2. MutationObserver —— DOM 变化监听
const observer = new MutationObserver(callback)
observer.observe(element, { childList: true })

// 3. queueMicrotask —— 显式创建微任务
queueMicrotask(() => {
  console.log('microtask')
})

// 4. process.nextTick —— Node.js 专属，优先级最高
process.nextTick(() => {
  console.log('nextTick')
})

// 5. await 后续代码 —— 本质是 Promise.then
async function foo() {
  await bar()
  console.log('after await')  // 这行是微任务
}
```

### 微任务的递归陷阱

```javascript
// 危险！递归微任务会阻塞渲染
function recursiveMicrotask() {
  Promise.resolve().then(() => {
    recursiveMicrotask()  // 无限递归
  })
}

// 微任务队列永远不会清空 → 渲染永远不会执行 → 页面卡死
// 对比：递归 setTimeout 不会阻塞渲染（每轮只取一个）
```

### 微任务执行顺序

```javascript
// 规则：按入队顺序执行，先入先出（FIFO）
Promise.resolve().then(() => console.log(1))
Promise.resolve().then(() => console.log(2))
Promise.resolve().then(() => console.log(3))
// 输出：1 → 2 → 3

// 特殊：process.nextTick 优先级高于 Promise（Node.js）
Promise.resolve().then(() => console.log('promise'))
process.nextTick(() => console.log('nextTick'))
// Node.js 输出：nextTick → promise
```

---

## 执行顺序精讲

### 示例 1：宏任务 + 微任务基础

```javascript
console.log('script start')

setTimeout(() => {
  console.log('setTimeout')
}, 0)

Promise.resolve().then(() => {
  console.log('promise-1')
}).then(() => {
  console.log('promise-2')
})

console.log('script end')
```

执行分析：

```
调用栈：[script]           → 打印 script start
         ↓
         [setTimeout]      → 注册宏任务（回调入宏任务队列）
         ↓
         [Promise.resolve] → .then 回调入微任务队列
         ↓
         [console.log]     → 打印 script end
         ↓
调用栈：空

清空微任务：
  → 打印 promise-1
  → .then 回调入微任务队列
  → 打印 promise-2

执行宏任务：
  → 打印 setTimeout
```

**输出**：`script start → script end → promise-1 → promise-2 → setTimeout`

### 示例 2：微任务中的微任务

```javascript
Promise.resolve().then(() => {
  console.log('micro-1')
  // 在微任务执行中，新增一个微任务
  Promise.resolve().then(() => {
    console.log('micro-2')
  })
}).then(() => {
  console.log('micro-3')
})
```

执行分析：

```
第一轮微任务清空：
  1. 打印 micro-1
  2. Promise.resolve().then 入队（micro-2 的回调）
  3. 第一个 .then 返回，第二个 .then 的回调入队（micro-3）

注意：micro-2 先于 micro-3 入队！

继续清空：
  4. 打印 micro-2（先入队）
  5. 打印 micro-3（后入队）
```

**输出**：`micro-1 → micro-2 → micro-3`

### 示例 3：宏任务中嵌套微任务

```javascript
setTimeout(() => {
  console.log('timeout-1')
  Promise.resolve().then(() => {
    console.log('promise-in-timeout')
  })
}, 0)

setTimeout(() => {
  console.log('timeout-2')
}, 0)
```

执行分析：

```
宏任务 1：
  → 打印 timeout-1
  → .then 回调入微任务队列

清空微任务：
  → 打印 promise-in-timeout

宏任务 2：
  → 打印 timeout-2
```

**输出**：`timeout-1 → promise-in-timeout → timeout-2`

**关键**：每个宏任务执行完后都会清空微任务队列，包括宏任务回调中新增的微任务。

### 示例 4：async/await 展开

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
console.log('script end')
```

执行分析：

```
await async2() 等价于：
  async2()  → 同步执行，打印 'async2'
  返回 Promise.resolve()
  .then(() => console.log('async1 end'))  → 入微任务队列

同步代码：
  → 打印 script start
  → 打印 async1 start
  → 打印 async2
  → 打印 script end

清空微任务：
  → 打印 async1 end
```

**输出**：`script start → async1 start → async2 → script end → async1 end`

---

## 浏览器 vs Node.js 差异

### Node.js 的任务队列优先级

```
process.nextTick > Promise > setTimeout > setImmediate
```

```javascript
// Node.js 中的执行顺序
setImmediate(() => console.log('immediate'))
setTimeout(() => console.log('timeout'), 0)
Promise.resolve().then(() => console.log('promise'))
process.nextTick(() => console.log('nextTick'))

// 输出：nextTick → promise → timeout/immediate（后两者顺序不确定）
```

### 浏览器中的 rAF

```javascript
// requestAnimationFrame 的位置有争议
// 它不是标准宏任务，也不是微任务
// 执行时机：渲染前，微任务之后

requestAnimationFrame(() => {
  console.log('rAF')  // 在微任务之后、渲染之前
})

Promise.resolve().then(() => {
  console.log('micro')  // 先于 rAF
})

// 浏览器输出：micro → rAF
```

---

## 在本项目中的应用

### 1. AI 对话流式渲染

```typescript
// apps/web 中 AI 回复逐字显示
const stream = await fetch('/api/chat', { method: 'POST', body })
const reader = stream.body.getReader()

while (true) {
  const { done, value } = await reader.read()  // 每次 read 是微任务
  if (done) break

  // 更新 UI —— 需要理解微任务才能预测渲染时机
  setMessages(prev => [...prev, decodeChunk(value)])
}
```

每次 `await reader.read()` 后续代码是微任务，多个 chunk 可能在同一轮 tick 中处理完，导致 UI 批量更新而非逐字更新。解决方案：用 `requestAnimationFrame` 控制渲染节奏。

### 2. 状态更新批处理

```typescript
// React 18+ 自动批处理（Automatic Batching）
function handleClick() {
  setCount(c => c + 1)   // 不会立即重渲染
  setName('test')         // 不会立即重渲染
  // 两个更新在同一微任务中批处理，只触发一次渲染
}
```

理解微任务才能理解 React 的批处理策略。

### 3. 避免阻塞渲染

```typescript
// 错误：大量同步计算阻塞主线程
function processLargeData(data) {
  for (const item of data) {
    heavyComputation(item)  // 阻塞！
  }
}

// 正确：用 setTimeout 分片（宏任务，每轮允许渲染）
function processLargeData(data, chunkSize = 100) {
  let index = 0
  function processChunk() {
    const end = Math.min(index + chunkSize, data.length)
    for (; index < end; index++) {
      heavyComputation(data[index])
    }
    if (index < data.length) {
      setTimeout(processChunk, 0)  // 让出主线程
    }
  }
  processChunk()
}
```

---

## 易混淆点

### 1. fetch().then —— 哪个是宏任务，哪个是微任务？

```javascript
fetch(url).then(response => response.json())
// fetch 本身：发起网络请求（同步）
// .then 回调：微任务（Promise）
// 但 fetch 完成的时机由浏览器网络模块决定（宏任务级别事件）
```

### 2. async/await 不是宏任务

```javascript
async function foo() {
  await bar()    // bar() 同步执行
  baz()          // 这行是微任务，不是宏任务
}
```

### 3. 微任务队列清空 ≠ 微任务执行完

```javascript
// "清空"是指执行到队列为空
// 但执行过程中可能新增微任务
Promise.resolve().then(() => {
  Promise.resolve().then(() => {
    // 这个新微任务也会在本轮执行
  })
})
```

### 4. setTimeout vs setImmediate（Node.js）

```javascript
// 在 I/O 回调中，setImmediate 总是先执行
const fs = require('fs')
fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0)
  setImmediate(() => console.log('immediate'))
})
// 输出：immediate → timeout（总是这个顺序）
// 原因：I/O 回调在 poll 阶段，下一个阶段是 check（setImmediate）
```

---

## 面试角度

### 高频问题

1. **"宏任务和微任务有什么区别？"**
   - 执行时机：宏任务一轮一个，微任务一轮清空
   - 设计意图：宏任务处理异步事件，微任务处理 Promise 链

2. **"以下代码输出什么？"**（必考）
   - 关键：先同步 → 再微任务 → 最后宏任务
   - 注意微任务中新增的微任务也在本轮执行

3. **"为什么 Promise 用微任务而不是宏任务？"**
   - 保证 Promise 链的连续性
   - 如果用宏任务，`.then()` 链会被其他宏任务插入

4. **"Node.js 中 process.nextTick 和 Promise 的区别？"**
   - nextTick 优先级更高，在当前操作结束后立即执行
   - Promise 在微任务队列中，nextTick 在 nextTick 队列中

### 加分回答

- 提到 **W3C HTML 规范** 中对事件循环的精确定义
- 提到 **递归微任务阻塞渲染** 的风险
- 提到 **React 18 Automatic Batching** 利用微任务实现
- 提到 **queueMicrotask** 是显式创建微任务的标准 API

---

## 扩展阅读

1. **HTML 规范：Event Loop**
   - https://html.spec.whatwg.org/multipage/webappapis.html#event-loop
   - 理解规范用语，对阅读框架源码有帮助

2. **Node.js 事件循环六个阶段**
   - timers → pending callbacks → idle/prepare → poll → check → close callbacks
   - 每个阶段有专属队列，阶段之间清空微任务

---

## 自测问题

**Q：以下代码在浏览器中的输出顺序是什么？**

```javascript
console.log('1')

setTimeout(() => {
  console.log('2')
  Promise.resolve().then(() => console.log('3'))
}, 0)

Promise.resolve().then(() => {
  console.log('4')
  setTimeout(() => console.log('5'), 0)
})

Promise.resolve().then(() => console.log('6'))

setTimeout(() => console.log('7'), 0)

console.log('8')
```

<details>
<summary>点击查看答案</summary>

**输出**：`1 → 8 → 4 → 6 → 2 → 3 → 7 → 5`

分析：
1. 同步：`1`、`8`
2. 微任务（第一轮清空）：`4`（此时新增宏任务 `5`）→ `6`
3. 宏任务 1：`2` → 立即清空微任务 `3`
4. 宏任务 2：`7`
5. 宏任务 3：`5`（在微任务 `4` 中注册的）

关键：
- 微任务 `4` 中注册的 `setTimeout` 是宏任务，排在 `2`、`7` 之后
- 微任务 `3` 在宏任务 `2` 执行完后立即清空
</details>
