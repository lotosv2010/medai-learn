# AbortController 与异步取消

> 记录时间：2026-06-01
> 关联模块：apps/web（搜索请求取消）、apps/api（超时控制）、apps/ai-engine（流式生成中断）
> 重要程度：⭐⭐⭐（面试高频，字节/阿里二面常考「如何取消一个正在进行的请求」+ 竞态条件处理）
> 前置知识：[[promise-handwrite]]、[[async-await]]、[[event-loop]]

---

## 一句话总结（面试 30 秒版）

AbortController 是浏览器提供的**异步操作取消机制**，通过 AbortSignal 信号对象实现发布-订阅模式，让 fetch、流式读取等异步操作能够被优雅地取消，是处理竞态条件和资源清理的标准方案。

---

## 核心概念

### 为什么需要 AbortController？

```
没有取消机制的世界：

用户输入 "a" → 发请求 A
用户输入 "ab" → 发请求 B
用户输入 "abc" → 发请求 C

请求 B 先返回 → 显示 "ab" 的结果
请求 A 后返回 → 覆盖显示 "a" 的结果（错误！）
请求 C 最后返回 → 显示 "abc" 的结果

问题：请求 A 是过期的，但我们无法取消它
```

**竞态条件（Race Condition）**：多个异步操作竞争同一个资源，最终结果取决于执行顺序，而不是代码逻辑。

### AbortController 三大核心组件

| 组件 | 角色 | 类比 |
|------|------|------|
| **AbortController** | 控制器（发送取消信号） | 遥控器 |
| **AbortSignal** | 信号对象（监听取消事件） | 电视机 |
| **abort()** | 触发取消的方法 | 按下遥控器按钮 |

### 工作原理

```
创建阶段：
AbortController 实例化
    ↓
controller.signal → AbortSignal 实例（1对1绑定）

使用阶段：
fetch(url, { signal: controller.signal })
    ↓
fetch 内部监听 signal 的 abort 事件

取消阶段：
controller.abort()
    ↓
signal.aborted = true
    ↓
触发 abort 事件
    ↓
fetch 抛出 AbortError，请求被浏览器取消
```

---

## 面试回答框架

### 标准回答（2 分钟版）

**第一层：是什么**

AbortController 是一个 DOM API，用于在需要时取消异步操作。它提供了一个 signal 属性（AbortSignal 对象），可以传递给 fetch 等支持取消的 API。

**第二层：怎么工作**

1. 创建 AbortController 实例
2. 将 controller.signal 传递给异步操作
3. 调用 controller.abort() 触发取消
4. 异步操作监听到 abort 事件后，抛出 AbortError

**第三层：为什么这样设计**

- **解耦**：取消逻辑和业务逻辑分离
- **统一**：一个 controller 可以同时取消多个请求
- **标准**：浏览器原生支持，无需第三方库

**第四层：实际影响**

- 解决竞态条件：搜索框输入时，取消旧请求
- 资源清理：页面跳转时，取消所有未完成的请求
- 超时控制：配合 setTimeout 实现请求超时

### 常见追问链

1. **追问 1**：「如何用 AbortController 实现请求超时？」
   - 回答要点：使用 Promise.race 竞争 fetch 和 setTimeout，超时时调用 abort()

2. **追问 2**：「一个 AbortController 可以取消多个请求吗？」
   - 回答要点：可以，同一个 signal 传递给多个 fetch 即可

3. **追问 3**：「AbortController 能取消 Promise 吗？」
   - 回答要点：不能直接取消 Promise，但可以通过 signal 在 reject 链路上中断

4. **追问 4**：「React 中如何处理组件卸载后的异步操作？」
   - 回答要点：useEffect 返回清理函数，调用 abort()

### 加分回答（如果你想让面试官眼前一亮）

**事件循环层面**：

abort() 调用后，abort 事件被放入微任务队列，fetch 内部的监听器在微任务阶段执行，从而取消正在进行的网络请求。

**浏览器实现层面**：

fetch 内部维护了一个 flag，当 signal.aborted 为 true 时，浏览器会中断底层的 HTTP 连接（如果是 streaming，会中断 ReadableStream）。

**与其他取消模式对比**：

| 模式 | 优点 | 缺点 |
|------|------|------|
| AbortController | 标准化、可组合 | 只能取消支持 signal 的 API |
| Promise.cancel (非标准) | 灵活 | 已被废弃 |
| 状态标志位 | 简单 | 无法真正取消网络请求 |
| Observable.unsubscribe | 功能强大 | 需要 RxJS 等库 |

---

## 代码演示

### 1. 基础用法：取消 fetch 请求

```ts
// 创建控制器
const controller = new AbortController()
const { signal } = controller

// 发起请求
fetch('https://api.example.com/data', { signal })
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(err => {
    if (err.name === 'AbortError') {
      console.log('请求被取消')
    } else {
      console.error('其他错误', err)
    }
  })

// 2 秒后取消
setTimeout(() => controller.abort(), 2000)
```

### 2. 请求超时控制

```ts
function fetchWithTimeout(url: string, timeout: number) {
  const controller = new AbortController()
  const { signal } = controller

  // 超时取消
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  return fetch(url, { signal })
    .then(response => {
      clearTimeout(timeoutId)  // 成功则清除定时器
      return response
    })
    .catch(err => {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        throw new Error(`请求超时：${timeout}ms`)
      }
      throw err
    })
}

// 使用
fetchWithTimeout('https://api.example.com/data', 5000)
  .then(res => res.json())
  .catch(err => console.error(err.message))
```

### 3. 搜索框防竞态（React 版）

```tsx
function SearchBox() {
  const [results, setResults] = useState([])
  const controllerRef = useRef<AbortController | null>(null)

  const handleSearch = async (query: string) => {
    // 取消上一次请求
    if (controllerRef.current) {
      controllerRef.current.abort()
    }

    // 创建新控制器
    const controller = new AbortController()
    controllerRef.current = controller

    try {
      const res = await fetch(`/api/search?q=${query}`, {
        signal: controller.signal
      })
      const data = await res.json()

      // 只有当前请求才更新结果
      if (!controller.signal.aborted) {
        setResults(data)
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err)
      }
    }
  }

  return <input onChange={e => handleSearch(e.target.value)} />
}
```

### 4. 同时取消多个请求

```ts
const controller = new AbortController()
const { signal } = controller

// 同时发起 3 个请求，共享同一个 signal
const requests = [
  fetch('/api/user', { signal }),
  fetch('/api/orders', { signal }),
  fetch('/api/recommendations', { signal })
]

// 一个 abort() 取消所有
Promise.all(requests)
  .then(responses => Promise.all(responses.map(r => r.json())))
  .then(([user, orders, recs]) => {
    console.log(user, orders, recs)
  })
  .catch(err => {
    if (err.name === 'AbortError') {
      console.log('所有请求已取消')
    }
  })

// 页面卸载时取消
window.addEventListener('beforeunload', () => controller.abort())
```

### 5. 手写支持取消的异步函数

```ts
function cancellableAsync<T>(
  fn: (signal: AbortSignal) => Promise<T>
): { promise: Promise<T>; cancel: () => void } {
  const controller = new AbortController()

  return {
    promise: fn(controller.signal),
    cancel: () => controller.abort()
  }
}

// 使用
const { promise, cancel } = cancellableAsync(async (signal) => {
  const res = await fetch('/api/data', { signal })
  return res.json()
})

promise.catch(err => {
  if (err.name === 'AbortError') {
    console.log('操作已取消')
  }
})

// 5 秒后取消
setTimeout(cancel, 5000)
```

---

## 在本项目中的应用

### 场景 1：AI 对话界面（apps/web）

```tsx
// apps/web/components/ChatBox.tsx
function ChatBox() {
  const controllerRef = useRef<AbortController | null>(null)

  const sendMessage = async (message: string) => {
    // 取消上一次未完成的生成
    if (controllerRef.current) {
      controllerRef.current.abort()
    }

    const controller = new AbortController()
    controllerRef.current = controller

    // 流式生成 AI 回复
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
      signal: controller.signal
    })

    // 处理流式响应...
  }

  // 组件卸载时取消
  useEffect(() => {
    return () => controllerRef.current?.abort()
  }, [])
}
```

### 场景 2：药品搜索（apps/web）

```tsx
// apps/web/components/MedicineSearch.tsx
// 用户输入时实时搜索，需要取消旧请求
const searchMedicine = debounce(async (query: string) => {
  controllerRef.current?.abort()
  const controller = new AbortController()
  controllerRef.current = controller

  const results = await fetch(`/api/medicines?q=${query}`, {
    signal: controller.signal
  })
  // ...
}, 300)
```

---

## 易混淆点

| 概念 A | 概念 B | 关键区别 |
|--------|--------|---------|
| AbortController.abort() | Promise.reject() | abort 会真正取消网络请求，reject 只是改变 Promise 状态 |
| AbortError | 其他 Error | AbortError 是用户主动取消，不是真正的错误 |
| signal.aborted | signal 事件 | aborted 是同步属性检查，事件是异步回调 |
| AbortController | 状态标志位 | Controller 能真正取消网络请求，标志位只能忽略结果 |

---

## 扩展阅读

- [MDN AbortController](https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController) — 官方文档
- [Jake Archibald: AbortController is your friend](https://jakearchibald.com/2017/aborting-fetches/) — 深入理解 fetch 取消机制

---

## 自测

**题目**：实现一个 `fetchWithRetry` 函数，支持：
1. 自动重试 N 次
2. 支持 AbortController 取消
3. 每次重试有指数退避延迟

```ts
// 你的实现
async function fetchWithRetry(
  url: string,
  options: RequestInit & { retries?: number; signal?: AbortSignal } = {}
): Promise<Response> {
  // TODO
}
```

**验证点**：
- 调用 abort() 后，正在进行的重试应该立即停止
- 重试延迟应该是指数增长（1s, 2s, 4s...）
- 最后一次重试失败后，抛出 AbortError 或原始错误

<details>
<summary>点击查看答案</summary>

```ts
async function fetchWithRetry(
  url: string,
  options: RequestInit & { retries?: number; signal?: AbortSignal } = {}
): Promise<Response> {
  const { retries = 3, signal, ...fetchOptions } = options

  for (let attempt = 0; attempt <= retries; attempt++) {
    // 检查是否已取消
    if (signal?.aborted) {
      throw new DOMException('The operation was aborted', 'AbortError')
    }

    try {
      const response = await fetch(url, { ...fetchOptions, signal })
      return response
    } catch (err) {
      // 如果是取消错误，直接抛出
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err
      }

      // 最后一次重试失败，抛出原始错误
      if (attempt === retries) {
        throw err
      }

      // 指数退避延迟：1s, 2s, 4s...
      const delay = Math.pow(2, attempt) * 1000

      // 延迟期间也要监听取消
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(resolve, delay)

        // 如果有 signal，监听取消事件
        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timeoutId)
            reject(new DOMException('The operation was aborted', 'AbortError'))
          }, { once: true })
        }
      })
    }
  }

  // TypeScript 类型保障（不会执行到这里）
  throw new Error('Unreachable')
}
```

关键点：
1. **双重取消检查**：循环开始时检查 `signal.aborted`，延迟期间监听 `abort` 事件
2. **指数退避**：`Math.pow(2, attempt) * 1000` 生成 1s, 2s, 4s 的延迟
3. **延迟期间可取消**：Promise 内部监听 `abort` 事件，一旦触发立即 reject
4. **{ once: true }**：防止事件监听器泄漏
5. **AbortError 优先**：取消错误直接抛出，不进入重试逻辑

</details>
