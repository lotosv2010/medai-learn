# 事件循环（Event Loop）

> 记录时间：2026-05-26
> 关联模块：apps/web（SSR Streaming）、apps/ai-engine（AI 流式输出）、Node.js 后端
> 重要程度：⭐⭐⭐（面试高频）

---

## 核心概念

### 为什么需要事件循环？

JavaScript 是**单线程**语言，但浏览器/Node.js 需要同时处理：
- 用户交互（点击、输入）
- 网络请求（fetch、WebSocket）
- 定时器（setTimeout、setInterval）
- DOM 渲染

单线程 + 阻塞 I/O = 灾难。事件循环的解决方案：**异步回调 + 事件队列**。

### 事件循环的本质

一个无限循环，每一轮（tick）做三件事：

```
┌───────────────────────────┐
│         一轮 tick          │
│                           │
│  1. 执行调用栈中的同步代码  │
│           ↓               │
│  2. 清空微任务队列         │  ← 所有微任务，一个不留
│           ↓               │
│  3. 取一个宏任务执行        │  ← 只取一个
│           ↓               │
│  4.（浏览器）渲染 DOM       │
│           ↓               │
│  回到第 1 步               │
└───────────────────────────┘
```

---

## 三大核心组件

### 1. 调用栈（Call Stack）

同步代码的执行场所，后进先出（LIFO）。

```javascript
function foo() {
  console.log('foo')    // ③ 执行，弹出
  bar()
}
function bar() {
  console.log('bar')    // ② 执行，弹出
}
foo()                    // ① 压入
// 调用栈变化：[foo] → [foo, bar] → [foo] → []
```

### 2. 宏任务队列（Macrotask Queue / Task Queue）

每次事件循环 tick 只取**一个**宏任务执行。

常见宏任务来源：
| 来源 | 示例 |
|------|------|
| 用户交互 | click、input、scroll |
| 网络 | fetch 回调、XMLHttpRequest |
| 定时器 | setTimeout、setInterval |
| I/O | Node.js 文件读写回调 |
| MessageChannel | port.onmessage |
| requestAnimationFrame | 浏览器渲染前回调（有争议） |

### 3. 微任务队列（Microtask Queue）

每轮 tick 结束前，**清空所有**微任务后才进入下一轮。

常见微任务来源：
| 来源 | 示例 |
|------|------|
| Promise | .then()、.catch()、.finally() |
| MutationObserver | DOM 变化监听 |
| queueMicrotask() | 显式微任务 |
| process.nextTick | Node.js（优先级最高） |
| await 后续代码 | 本质是 Promise.then |

---

## 经典执行顺序分析

### 示例 1：基础

```javascript
console.log('1')                    // 同步

setTimeout(() => {
  console.log('2')                  // 宏任务
}, 0)

Promise.resolve().then(() => {
  console.log('3')                  // 微任务
})

console.log('4')                    // 同步

// 输出：1 → 4 → 3 → 2
```

**分析**：
1. 同步代码：打印 `1`、`4`
2. 微任务：打印 `3`
3. 宏任务：打印 `2`

### 示例 2：嵌套微任务

```javascript
Promise.resolve().then(() => {
  console.log('micro-1')
  Promise.resolve().then(() => {
    console.log('micro-2')          // 嵌套微任务，本轮清空
  })
}).then(() => {
  console.log('micro-3')            // micro-2 执行完才轮到这
})

// 输出：micro-1 → micro-2 → micro-3
```

**关键**：微任务队列清空时，新产生的微任务**也在本轮执行**，不会留到下一轮。

### 示例 3：await 的本质

```javascript
async function foo() {
  console.log('foo-start')
  await bar()
  console.log('foo-end')            // 等价于 bar().then(() => console.log('foo-end'))
}
function bar() {
  console.log('bar')
  return Promise.resolve()
}

foo()
console.log('global-end')

// 输出：foo-start → bar → global-end → foo-end
```

**await 后面的代码变成微任务**。`foo-end` 在 `global-end` 之后执行。

---

## 浏览器 vs Node.js 的差异

### 浏览器

```
一轮 tick：
  1. 执行一个宏任务
  2. 清空微任务队列
  3. requestAnimationFrame 回调
  4. 渲染（Layout → Paint）
  5. 回到 1
```

### Node.js

```
一轮 tick（timers 阶段开始）：
  timers          → setTimeout / setInterval 回调
  pending callbacks → 系统级回调
  idle, prepare    → 内部使用
  poll             → I/O 回调（文件、网络）
  check            → setImmediate 回调
  close callbacks  → socket.on('close')

每个阶段之间：清空微任务队列
```

**关键差异**：

| 特性 | 浏览器 | Node.js |
|------|--------|---------|
| 微任务执行时机 | 每个宏任务后 | 每个阶段之间 + 每个宏任务后 |
| `process.nextTick` | 不存在 | 优先级高于 Promise |
| `setImmediate` | 不存在 | check 阶段执行 |
| `setTimeout(fn, 0)` | 最小 4ms | 约 1ms |

### Node.js 特有：nextTick vs Promise

```javascript
Promise.resolve().then(() => console.log('promise'))
process.nextTick(() => console.log('nextTick'))

// Node.js 输出：nextTick → promise
// 浏览器输出：promise（没有 nextTick）
```

`process.nextTick` 在当前操作结束后、事件循环继续前执行，优先级最高。

---

## 在本项目中的应用

### 1. Next.js SSR Streaming

```typescript
// apps/web/app/drugs/[id]/page.tsx
// RSC 渲染过程涉及事件循环：
// 1. 服务端同步执行组件函数（调用栈）
// 2. await fetch() 让出线程（微任务/宏任务切换）
// 3. 数据返回后继续渲染（新一轮 tick）
// 4. Stream 写入响应（Node.js Writable Stream）
```

理解事件循环才能理解 **为什么 RSC 能边取数据边渲染**。

### 2. AI 流式输出

```typescript
// apps/ai-engine 中的 Streaming
const stream = await openai.chat.completions.create({
  messages,
  stream: true,  // 流式返回
})

for await (const chunk of stream) {
  // 每个 chunk 到达触发一次 microtask
  // 前端通过 SSE 逐字渲染
}
```

`for await...of` 本质是异步迭代器，每次迭代都是一个微任务。

### 3. 后端并发处理

```typescript
// apps/api 中 Hono 处理并发请求
// Node.js 单线程 + 事件循环 = 高并发 I/O
// 一个请求的数据库查询（I/O）不会阻塞其他请求
// 因为 I/O 回调在 poll 阶段异步执行
```

---

## 易混淆点

### 1. setTimeout(fn, 0) ≠ 立即执行

```javascript
setTimeout(fn, 0)
// 实际延迟：浏览器 ≥4ms，Node.js ≥1ms
// 原因：浏览器有 4ms 最小延迟限制（嵌套层级 > 5 时）
```

### 2. 微任务优先于宏任务，但不是"更快"

```javascript
// 微任务不会跳过同步代码
Promise.resolve().then(() => console.log('micro'))
console.log('sync')
// 输出：sync → micro
```

### 3. requestAnimationFrame 不是宏任务也不是微任务

```javascript
// rAF 在渲染前执行，时机特殊
// 某些实现中它在微任务之后、渲染之前
// 不要依赖它的精确时机
```

### 4. async/await 不是"真正的同步"

```javascript
async function foo() {
  return 1
}
// foo() 返回 Promise，不是 1
// 等价于：function foo() { return Promise.resolve(1) }
```

---

## 面试角度

### 高频问题

1. **"说说事件循环的执行机制"**
   - 从调用栈 + 宏任务 + 微任务三件套说起
   - 画图说明一轮 tick 的流程
   - 对比浏览器和 Node.js 差异

2. **"以下代码输出什么？"**（必考）
   - 给出混合同步、Promise、setTimeout 的代码
   - 关键：先同步 → 再微任务 → 最后宏任务

3. **"async/await 的原理是什么？"**
   - Generator + 自动执行器的语法糖
   - await 后面的代码变成微任务（Promise.then）

4. **"Node.js 的事件循环和浏览器有什么区别？"**
   - 6 个阶段 + 每个阶段之间清空微任务
   - process.nextTick 优先级最高

5. **"为什么 Vue 的 nextTick 用微任务？"**
   - 微任务在当前宏任务结束后立即执行
   - 能在 DOM 更新后、渲染前拿到最新 DOM

### 加分回答

- 提到 **W3C 规范** 和 **Node.js libuv 文档** 是权威来源
- 提到 **宏任务优先级**：用户交互 > 网络 > 定时器
- 提到 **微任务队列过深** 会导致渲染卡顿（递归微任务）

---

## 扩展阅读

1. **Node.js libuv 事件循环文档**
   - https://libuv.org/ — 理解 6 个阶段的完整流程
   - 面试中能画出 Node.js 事件循环图是加分项

2. **HTML 规范中的事件循环定义**
   - https://html.spec.whatwg.org/multipage/webappapis.html#event-loop
   - W3C 规范是最权威的来源，理解 spec 用语对阅读源码有帮助

3. **深入：Generator → async/await 的演进**
   - 从 callback → Promise → Generator → async/await
   - 理解每一步解决了什么问题，面试能讲故事

---

## 自测问题

**Q：以下代码在浏览器中的输出顺序是什么？为什么？**

```javascript
console.log('start')

setTimeout(() => {
  console.log('timeout-1')
  Promise.resolve().then(() => console.log('promise-in-timeout'))
}, 0)

setTimeout(() => {
  console.log('timeout-2')
}, 0)

Promise.resolve().then(() => {
  console.log('promise-1')
}).then(() => {
  console.log('promise-2')
})

console.log('end')
```

<details>
<summary>点击查看答案</summary>

输出顺序：
```
start → end → promise-1 → promise-2 → timeout-1 → promise-in-timeout → timeout-2
```

分析：
1. 同步：`start`、`end`
2. 微任务：`promise-1` → `promise-2`（链式 .then，第二个等第一个执行完才入队）
3. 宏任务 1：`timeout-1` → 立即清空微任务 `promise-in-timeout`
4. 宏任务 2：`timeout-2`

关键：**微任务在每个宏任务后清空**，所以 `promise-in-timeout` 在 `timeout-2` 之前。
</details>
