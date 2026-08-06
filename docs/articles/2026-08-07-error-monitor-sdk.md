# 手写错误监控 SDK：从捕获到还原的全链路（面试收藏级）

> 告警响了。你打开线上控制台，看到的是这样一行堆栈：
>
> `t.a is not a function at bundle.min.js:1:89234`
>
> 什么信息都没有。你不知道是哪个文件、哪一行、用户当时在做什么。这就是只装了 `window.onerror` 却没有完整错误监控的后果。这篇文章，从零搭起一个真正能帮你排查问题的错误监控 SDK。

---

## 🎯 这篇文章解决什么问题

很多人以为「错误监控 = 加一行 `window.onerror`」，但生产环境有三个盲区会让这套方案形同虚设：

**第一个盲区**：资源加载失败（`<script>` 404、图片挂了）`onerror` 完全捕获不到，因为资源错误不会冒泡。

**第二个盲区**：跨域加载的第三方脚本报错，`onerror` 收到的是 `"Script error."`，行号列号全是 0，毫无信息。

**第三个盲区**：生产代码经过压缩混淆，堆栈里全是 `bundle.min.js:1:XXXX`，没有 Source Map 还原你根本看不懂。

这篇文章基于一个真实落地的前端可观测平台来讲，覆盖三大捕获入口、WeakSet 去重、跨域修复、框架错误边界、白屏检测、服务端 Source Map 还原、异常指纹聚合，以及 rrweb 录屏的技术原理与生产取舍。读完既懂原理，也能在面试里把这块讲得滴水不漏。

---

## 🔍 是什么：错误监控的四道防线

一个完整的错误监控 SDK，需要四道防线覆盖所有错误来源。缺任何一道，都会有盲区。

| 防线 | 监听方式 | 覆盖场景 |
|---|---|---|
| `addEventListener('error', h, false)` | 冒泡阶段，可多个监听器共存不互覆盖 | JS 运行时错误（TypeError / ReferenceError 等） |
| `unhandledrejection` 事件 | 独立全局事件 | Promise 未处理拒绝 |
| 捕获阶段 `addEventListener('error', h, true)` | 事件捕获阶段 | 资源加载失败（script / img / link / audio / video） |
| `requestIdleCallback` + DOM 采样 | 空闲帧内检测，独立插件主动上报 | SPA 渲染失败白屏兜底 |

> 💬 **面试官**：JS 运行时错误和资源加载错误，都用 `window.onerror` 能捕获吗？
>
> ✅ 标准答案：不能。`window.onerror` 可以捕获 JS 运行时错误，但资源加载错误（script/img/link）不冒泡，必须在捕获阶段监听 `addEventListener('error', handler, true)`。
> 🎁 加分答案：生产 SDK 通常用 `addEventListener('error', h, false)` 替代 `window.onerror` 赋值，原因是后者会覆盖页面已有的处理器，前者允许多个监听器共存。`unhandledrejection` 也要单独处理，Promise 拒绝不会触发 `onerror`。再加上白屏检测做兜底，四类防线缺一不可。

---

## 🧠 核心原理：六个难点逐一拆解

### `addEventListener` vs `window.onerror`

直接赋值 `window.onerror` 会覆盖页面已有的处理器，破坏其他监控逻辑（如 Sentry 和自定义告警共存的场景）。生产 SDK 的正确做法是用 `addEventListener`，它允许多个监听器共存、互不干扰：

```javascript
// 冒泡阶段：捕获 JS 运行时错误
window.addEventListener('error', (event) => {
  if (event.error) {   // ErrorEvent，有 error 对象
    hub.report({ type: 'error', subType: 'js',
      message: event.message, stack: event.error?.stack,
      source: event.filename, lineno: event.lineno, colno: event.colno,
      breadcrumbs: hub.getBreadcrumbs() })
  }
}, false)  // false = 冒泡阶段

// 捕获阶段：捕获资源加载失败
window.addEventListener('error', (event) => {
  const target = event.target
  if (target instanceof HTMLElement) {
    hub.report({ type: 'error', subType: 'resource', ... })
  }
}, true)   // true = 捕获阶段
```

两次注册的是**同一个事件名**，但阶段不同，互不干扰，也不影响页面原有的任何处理器。

### 资源错误为什么不冒泡

DOM 事件有捕获和冒泡两个阶段。JS 运行时错误会通过冒泡阶段到达 `window`，而资源加载错误（`<script>` `<img>` `<link>` 等）只在捕获阶段触发，不会冒泡到 `window`。

```text
window（捕获 ← 这里能捕获资源错误）
  └─ document
       └─ body
            └─ <script src="..."> ← 资源加载失败触发，不向上冒泡
```

所以捕获资源错误必须在捕获阶段注册，第三个参数传 `true`：

```javascript
window.addEventListener('error', (event) => {
  // event.target 是触发错误的 DOM 元素
  const target = event.target
  if (target instanceof HTMLElement) {
    // 资源加载错误，不是 JS 运行时错误
    hub.report({
      type: 'error',
      subType: getResourceSubType(target), // script/img/css/media
      url: target.src || target.href,
    })
  }
}, true) // 必须是 true（捕获阶段）
```

### `unhandledrejection` 的 reason 兼容

`unhandledrejection` 的 `event.reason` 有两种形态——可能是 `Error` 对象（有 stack），也可能是普通字符串（`Promise.reject('something went wrong')`）。需要兼容两种情况：

```javascript
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  hub.report({
    type: 'error',
    subType: 'promise',
    message: reason instanceof Error ? reason.message : String(reason),
    stack:   reason instanceof Error ? reason.stack  : undefined,
  })
})
```

### WeakSet 去重：同一事件不重复上报

同一个 JS error 事件对象，在 `window` 上同时注册了捕获阶段和冒泡阶段的监听器后，会**触发两次**。如果不去重，同一个 JS 运行时错误就会上报两次。

用 `WeakSet` 记录已处理的事件，既能去重，又不会阻止事件对象被垃圾回收（这是用 `WeakSet` 而不是 `Set` 的原因）：

```javascript
const seen = new WeakSet()

window.addEventListener('error', (event) => {
  if (seen.has(event)) return  // 已处理过，跳过
  seen.add(event)

  const target = event.target
  if (target instanceof HTMLElement) {
    // 资源加载错误
    handleResourceError(target)
  }
  // JS 运行时错误由冒泡阶段的 error listener 处理，这里不重复处理
}, true)
```

> 💬 **面试官**：为什么用 WeakSet 而不是 Set？
>
> ✅ 标准答案：WeakSet 持有弱引用，不会阻止事件对象被 GC 回收；Set 持有强引用，如果不主动 `delete`，事件对象会一直在内存里，长时间运行会造成内存泄漏。
> 🎁 加分答案：WeakSet 不可遍历，不支持 `size` 属性，专门用于「判断某对象是否已处理过」这类场景，比 Set 更语义化。

### 跨域 Script Error：根因与修复

当你的 JS 文件从 CDN 加载（域名与页面不同），浏览器出于安全考虑（CORS 隔离），会把跨域脚本的错误信息屏蔽掉，`addEventListener('error')` 收到的只有：

```text
message: "Script error."
source: ""
lineno: 0
colno: 0
error: null
```

修复需要两端配合：

**前端**：给 `<script>` 标签加 `crossorigin="anonymous"`，告诉浏览器这个资源允许跨域访问：

```html
<script src="https://cdn.example.com/app.js" crossorigin="anonymous"></script>
```

**CDN / 服务端**：在响应头里加 `Access-Control-Allow-Origin`，允许当前页面的域名访问：

```http
Access-Control-Allow-Origin: *
// 或精确指定来源
Access-Control-Allow-Origin: https://www.your-domain.com
```

两端都配置之后，跨域脚本的错误信息才会完整传递给 `onerror`。

> 💬 **面试官**：为什么从 CDN 加载的脚本报错只显示 "Script error."？
>
> ✅ 标准答案：浏览器的 CORS 隔离机制：跨域脚本的详细错误信息被屏蔽，防止敏感信息泄漏。需要在 `<script>` 加 `crossorigin="anonymous"` 并让 CDN 返回 `Access-Control-Allow-Origin` 响应头，才能还原完整错误信息。
> 🎁 加分答案：`crossorigin="anonymous"` 会让浏览器发送不带 Cookie 的跨域请求。如果 CDN 资源需要鉴权，要用 `crossorigin="use-credentials"` 并把 `Access-Control-Allow-Origin` 设为精确域名（不能用 `*`）。

### 框架错误边界：接入 errorPlugin

原生捕获入口捕获不到框架内部的渲染错误。以 React 为例，组件抛出的错误会被 React 自己的错误边界系统捕获，不会冒泡到全局 `error` 事件。

**React ErrorBoundary**：

```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    hub.report({
      type: 'error',
      subType: 'framework',
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    })
  }
  render() {
    return this.props.children
  }
}
```

**Vue 3**：

```javascript
app.config.errorHandler = (err, instance, info) => {
  hub.report({
    type: 'error', subType: 'framework',
    message: err.message, stack: err.stack,
    componentInfo: info,
  })
}
```

**Next.js App Router**：在 `app/error.tsx` 中调用：

```typescript
'use client'
export default function Error({ error }: { error: Error }) {
  useEffect(() => {
    hub.report({ type: 'error', subType: 'framework',
      message: error.message, stack: error.stack })
  }, [error])
  return <div>出错了，请刷新重试</div>
}
```

---

## ✍️ 手写实现：errorPlugin 骨架

理解了六个原理，手写就是把它们串起来，再加上白屏检测和面包屑打包上报。

### 三大入口注册

```javascript
const ErrorPlugin = {
  name: 'error',
  setup(hub) {
    const seen = new WeakSet()

    // 入口一：JS 运行时错误（冒泡阶段，不覆盖 window.onerror）
    const onBubble = (event) => {
      if (seen.has(event)) return
      seen.add(event)
      if (!event.error) return  // 非 ErrorEvent，跳过
      hub.report({ type: 'error', subType: 'js',
        message: event.message, stack: event.error?.stack,
        source: event.filename, lineno: event.lineno, colno: event.colno,
        breadcrumbs: hub.getBreadcrumbs() })
    }
    window.addEventListener('error', onBubble, false)

    // 入口二：Promise 未处理拒绝
    const onUnhandled = (e) => {
      hub.report({ type: 'error', subType: 'promise',
        message: e.reason instanceof Error ? e.reason.message : String(e.reason),
        stack: e.reason instanceof Error ? e.reason.stack : undefined,
        breadcrumbs: hub.getBreadcrumbs() })
    }
    window.addEventListener('unhandledrejection', onUnhandled)

    // 入口三：资源加载失败（捕获阶段）
    const onCapture = (e) => {
      if (seen.has(e)) return
      seen.add(e)
      const t = e.target
      if (!(t instanceof HTMLElement)) return
      const tag = t.tagName.toLowerCase()
      const url = (t as any).src || (t as any).href || ''
      hub.report({ type: 'error', subType: 'resource',
        url, outerHTML: t.outerHTML.slice(0, 512) })
    }
    window.addEventListener('error', onCapture, true)

    // 清理函数（SPA 卸载时调用）
    this._cleanup = () => {
      window.removeEventListener('unhandledrejection', onUnhandled)
      window.removeEventListener('error', onCapture, true)
      window.removeEventListener('error', onBubble, false)
    }
  },
  teardown() { this._cleanup?.() },
}
```

### 白屏检测：第四道防线

白屏检测与 errorPlugin 是两个独立插件：前者负责"发现白屏"，后者负责"捕获抛出的错误"。两者解耦后可以独立升级，也可以在不需要白屏监控的场景下单独关掉。

```javascript
const WhiteScreenPlugin = {
  name: 'white_screen',
  setup(hub) {
    const handle = requestIdleCallback(() => {
      const root = document.querySelector('#app,#root,main') ?? document.body
      const isEmpty = root.clientHeight === 0 || root.children.length === 0
      if (isEmpty) {
        hub.captureException(
          new Error('白屏探针：根节点超时未渲染'),
          { subType: 'white_screen', url: location.href }
        )
      }
    }, { timeout: 3000 }) // 3s 后强制执行

    this._cleanup = () => cancelIdleCallback(handle)
  },
  teardown() { this._cleanup?.() },
}
```

### 面包屑打包上报

面包屑是 FIFO 队列，最多 100 条，每当 error 事件上报时一并打包发送，还原「用户当时在做什么」：

```javascript
class BreadcrumbQueue {
  private queue: Breadcrumb[] = []
  private readonly MAX = 100

  add(crumb: Breadcrumb) {
    this.queue.push(crumb)
    // 超出 100 条，淘汰最旧的
    if (this.queue.length > this.MAX) this.queue.shift()
  }

  getAll() {
    return [...this.queue]  // 返回副本，不暴露内部引用
  }
}
```

SDK 自动采集 5 类面包屑（navigation / click / console / fetch / xhr），每次 error 上报时快照最新的 **50 条**打包进 `breadcrumbs` 字段发送给服务端（队列本身保留 100 条，上报时取 `slice(-50)`）。

> 💬 **面试官**：监控到一个 JS 报错，但复现不了，怎么排查？
>
> ✅ 标准答案：两步走。第一步用 Source Map 还原堆栈，定位到源码的具体行列号；第二步看面包屑，还原出错前用户的操作路径——点了哪个按钮、发了哪些请求、控制台有没有 warning，通常能还原出复现步骤。
> 🎁 加分答案：面包屑是 FIFO 队列，100 条上限，出错前如果有大量 API 请求，可能把早期的用户操作面包屑挤掉。核心业务操作（如「点击支付」「提交表单」）应该用 `addBreadcrumb()` 手动追加并标为高优先级，确保不被淘汰。

---

## 🏭 生产边界：三件 SDK 做不到的事

### 服务端 Source Map 还原

SDK 采集到的堆栈是混淆压缩后的，形如 `bundle.min.js:1:89234`，必须在服务端还原。

**为什么在服务端而不是客户端还原（ADR-0005）？**

- 客户端还原需要下载 `.map` 文件，每个 `.map` 文件动辄 10MB，严重影响 SDK 体积和首屏性能
- `.map` 文件包含完整源码，暴露在公网是安全风险
- 服务端集中处理，LRU 缓存热门 release，效率更高

**完整还原链路**：

```text
构建产物输出
  ↓
CI 自动上传（POST /sourcemap/v1/releases/:version/artifacts，multipart）
  ↓
服务端存储到 MinIO / S3
  ↓
错误事件入队（BullMQ events-error，concurrency=4）
  ↓
ErrorProcessor 异步消费
  → SourcemapService.resolveFrames(event)
      · 先查 LRU 缓存（100 条，TTL 1h）
      · 未命中则从 MinIO 拉取 .map 文件
      · source-map v0.7 WASM 解码（比纯 JS 快 3-5 倍）
  → 还原后写入 frames[] 字段存库
```

**服务端还原核心代码**（`source-map` 库）：

```javascript
import { SourceMapConsumer } from 'source-map'

async function resolveFrame(frame, mapContent) {
  return SourceMapConsumer.with(mapContent, null, (consumer) => {
    const pos = consumer.originalPositionFor({
      line: frame.lineno, column: frame.colno,
    })
    return {
      ...frame,
      file:     pos.source   ?? frame.file,
      lineno:   pos.line     ?? frame.lineno,
      colno:    pos.column   ?? frame.colno,
      function: pos.name     ?? frame.function,
    }
  })
}
```

🔧 **真实场景**：某次上线后告警触发，堆栈显示 `t.a is not a function at bundle.min.js:1:89234`。没有 Source Map 时束手无策；接入服务端还原后，立刻定位到 `src/components/DrugCard/index.tsx:156`——某个条件渲染在数据为 `null` 时缺少防守，一行修复解决。

> 💬 **面试官**：Source Map 为什么放服务端还原，不直接在客户端做？
>
> ✅ 标准答案：客户端还原需要加载 `.map` 文件，单个文件 10MB 起，严重拖慢页面；`.map` 文件含完整源码，放公网是安全风险。服务端还原配合 LRU 缓存，性能更好，安全更可控。
> 🎁 加分答案：WASM 版的 `source-map v0.7` 比纯 JS 实现快 3-5 倍，高并发错误处理时差距很明显。另外 `.map` 文件的上传应该在 CI 流水线里自动化，不能依赖开发者手动上传，否则版本对不上。

### 异常指纹与 Issue 聚合

原始错误事件数量庞大，同一个 bug 可能产生数千条事件，必须按「指纹」聚合成 Issue 才有意义。

指纹计算公式：

```text
fingerprint = sha1(
  subType | normalize(message) | topFrame.file | topFrame.function
)
```

`normalize` 做什么：把动态部分清洗掉，让同一 bug 不同触发路径产生相同指纹：

```javascript
function normalize(msg) {
  return msg
    .replace(/\d+/g, 'N')           // 数字 → N（如行号、ID）
    .replace(/[0-9a-f]{8,}/gi, 'H') // UUID / hash → H
    .replace(/https?:\/\/[^\s]+/g, 'URL') // URL → URL
    .trim()
    .slice(0, 256)
}
```

**为什么不用整个 stack 入指纹**：同一个 bug 可能从不同调用链触发（用户点击 A 按钮 vs B 按钮都调了同一个出 bug 的函数），整个 stack 不同，指纹就爆炸，本该聚合成 1 个 Issue 变成 N 个，监控噪音极大。只用 `topFrame`（最顶层栈帧）足以区分绝大多数不同的 bug。

> 💬 **面试官**：为什么需要指纹，直接看所有 error 事件不行吗？
>
> ✅ 标准答案：同一个 bug 可能触发数千条事件，直接看原始事件完全无法操作。指纹把同根因的事件聚合成一个 Issue，展示「出现次数 + 影响用户数 + 首次 / 末次时间」，让你知道哪个 bug 最严重、影响面最大。
> 🎁 加分答案：normalize 去动态部分是指纹质量的关键。不去掉，含数字的错误消息（如 `Cannot read property 'name' of undefined at line 156`）指纹全不一样；去掉后，同一行的 bug 无论触发多少次都聚合到同一个 Issue。

### rrweb 录屏回放：技术原理与生产取舍

**技术原理**（了解概念，面试时能讲）：

rrweb 是目前最主流的浏览器录屏方案，核心思路是三步：

```text
① 初始化：序列化整个 DOM 为 JSON 快照（含样式、布局）
② 录制：MutationObserver 监听后续所有 DOM 变化，记录增量 patch
③ 回放：按时间戳重放 JSON 快照 + 增量 patch，在沙箱 iframe 里还原用户操作
```

接入最佳实践：**不要全程录制**，只在错误触发后 N 秒内（如前 30s）上报录制片段，控制单次上报体积。

**生产决策——为什么 MVP 不引入**：

一个以隐私合规为重的项目，在设计阶段明确放弃了 Session Replay，原因三点：

| 约束 | 说明 |
|---|---|
| 隐私 / 法律风险 | GDPR、国内《个人信息保护法》对录屏数据有严格要求，尤其医疗场景涉及敏感信息 |
| SDK 体积约束 | 目标 gzip 后 < 30KB，rrweb 本身压缩后约 60KB，超出硬约束 |
| 存储成本 | 每条 Session Replay 数百 KB 到数 MB，大流量场景存储成本难以承受 |

**替代方案**：用面包屑（100 条 FIFO 队列）代替录屏，在上报体积极小的情况下还原「用户当时在做什么」，覆盖 80% 的排查场景。

> 💬 **面试官**：为什么不做 Session Replay？面包屑怎么替代它？
>
> ✅ 标准答案：Session Replay 面临三个约束：隐私合规风险（尤其医疗等敏感场景）、SDK 体积（rrweb 约 60KB gzip，超出监控 SDK 体积预算）、存储成本。面包屑以极低成本（100 条 JSON 记录）还原操作路径，覆盖 80% 的排查场景，是更实用的替代方案。
> 🎁 加分答案：如果业务确实需要录屏，最佳实践是「错误触发后才回溯录制」——只上传出错前 30s 的片段，而不是全程录制，把存储量和法律风险降到最小。

---

## 🔬 对齐源码：手写版还差什么

手写版能跑，但和真实 SDK 比还差几个关键细节。

### `classifyResource` 与 `resource.kind` 字段

手写版把资源错误的子分类直接写进 `subType`（如 `js_load` / `image_load`），真实 SDK 不是这样。

errorPlugin 上报时 `subType` 固定为 `"resource"`，资源细分存入独立的 `resource.kind` 字段，由内部 `classifyResource()` 计算：

```javascript
// g-heal-claw errorPlugin 内部
function classifyResource(tag) {
  if (tag === 'script') return 'js_load'
  if (tag === 'link')   return 'css_load'
  if (tag === 'img')    return 'image_load'
  if (tag === 'audio' || tag === 'video' || tag === 'source') return 'media'
  return 'other'
}

hub.report({
  type: 'error',
  subType: 'resource',       // ← 永远是 "resource"
  resource: {
    kind: classifyResource(tag), // ← 细分在这里
    url: t.src || t.href || '',
    outerHTML: t.outerHTML.slice(0, 512),
  }
})
```

服务端依据 `(sub_type, resource_kind)` 拆出 9 分类中的 `js_load / css_load / image_load / media`。前端控制台的 9 张分类卡片是后端处理后的视图，不是 SDK 直接上报的结构。

### `ignoreUrls` 匹配的是页面 URL，不是脚本 URL

直觉上以为 `ignoreUrls` 过滤的是出错脚本的地址，但真实实现匹配的是 **当前页面 URL**（`location.href`）：

```javascript
// ignoreUrls 逐条 test location.href（not event.filename）
if (opts.ignoreUrls?.some(p =>
  typeof p === 'string' ? location.href.includes(p) : p.test(location.href)
)) return
```

实际用途：在某些特定页面（如内嵌调试工具页、A/B 测试页）全量屏蔽错误上报，而不是过滤某一个脚本文件的错误。

### `beforeSend` 是最后一道过滤关

SDK 在把事件送出去之前，会调用用户注册的 `beforeSend` 钩子。返回 `null` 则整条事件被丢弃：

```javascript
errorPlugin({
  beforeSend(event) {
    // 支付接口报错含敏感信息，不上报
    if (event.url?.includes('/api/pay')) return null
    // 脱敏：把 message 里的手机号替换掉
    event.message = event.message.replace(/1[3-9]\d{9}/g, '***')
    return event
  }
})
```

手写版通常直接 `hub.report()`，没有这一层拦截。生产 SDK 把过滤权交给业务方，是为了让 SDK 本身保持无感知——它不知道什么是"敏感信息"，业务方才知道。

### 手写版 vs 真实 SDK 差异总结

| 能力 | 手写版 | g-heal-claw SDK |
|---|---|---|
| 三大入口捕获 | ✅ | ✅ |
| WeakSet 去重 | ✅ | ✅ |
| 资源细分字段 | `subType` 直接写 `js_load` | `subType: "resource"` + `resource.kind` 分离 |
| `ignoreUrls` 语义 | 通常匹配脚本 URL | 匹配页面 URL（location.href） |
| `beforeSend` 钩子 | ❌ | ✅ 最后一道过滤 |
| 白屏检测 | 手动添加独立插件 | 内置 `whiteScreenPlugin`，独立注册 |
| 面包屑快照 | 全量 | `slice(-50)`，只取最近 50 条 |
| TypeScript 类型 | ❌ | ✅ 完整类型定义 |

结论：理解原理后生产环境直接用 SDK，`beforeSend` 和 `resource.kind` 的细节在面试中能体现对"真实落地"的理解深度。

---

## 🔌 SDK 接入指南

### 最小可用配置

三步接入，只开错误监控：

```bash
pnpm add @g-heal-claw/sdk
```

```typescript
// src/monitor.ts
import { init, errorPlugin, breadcrumbPlugin } from '@g-heal-claw/sdk'

init(
  {
    dsn: import.meta.env.VITE_GHC_DSN,
    environment: import.meta.env.VITE_GHC_ENV ?? 'development',
    release: import.meta.env.VITE_GHC_RELEASE, // 用于匹配 Source Map
  },
  { plugins: [breadcrumbPlugin(), errorPlugin()] }
)
```

在 `main.ts` 第一行调用（早于框架初始化，避免错过早期错误）：

```typescript
// main.ts
import './monitor'  // 必须在第一行
import { createApp } from 'vue'
import App from './App.vue'
```

`release` 字段是 Source Map 还原的关键——服务端根据 `release` 找到对应版本的 `.map` 文件。推荐用 `git commit hash` 作为 release 值，与 CI 上传的版本号对齐。

### errorPlugin 配置项

```typescript
errorPlugin({
  // 忽略特定错误（正则或字符串）
  ignoreErrors: ['ResizeObserver loop', /^Script error/],
  // 错误采样率（0~1），默认 1.0 全量
  errorSampleRate: 1.0,
  // 发送前钩子：过滤敏感信息，返回 null 则丢弃该事件
  beforeSend(event) {
    if (event.url?.includes('/api/pay')) return null // 支付接口不上报
    return event
  },
})
```

### 与框架错误边界联动

```typescript
// React：包裹根组件
import { createGhcErrorBoundary } from '@g-heal-claw/sdk/react'

const GhcErrorBoundary = createGhcErrorBoundary(hub)

root.render(
  <GhcErrorBoundary fallback={<ErrorPage />}>
    <App />
  </GhcErrorBoundary>
)
```

> 💬 **面试官**：控制台怎么判断错误监控 SDK 有没有正常工作？
>
> ✅ 标准答案：看异常大盘的 source badge——后端检查 `error_events_raw` 表中近 1 小时是否有该项目的事件，有则显示 `live`，否则 `empty`。同时可以主动触发一个测试错误（`monitor.captureError(new Error('test'))`）确认上报链路。
> 🎁 加分答案：还要检查 Source Map 是否上传成功——看 Issue 详情里的堆栈帧是否已还原为源码路径。如果还是 `bundle.min.js:1:XXXX`，说明 release 对不上或 CI 上传步骤没有执行。

---

## 📊 看懂控制台数据

接入 SDK 后，打开错误分析页，从哪来、代表什么——逐一拆解。

### source badge：数据三态

页面右上角 badge 反映当前数据状态，判定逻辑在 `apps/web/app/(console)/monitor/errors/page.tsx`：

```typescript
function SourceBadge({ source }: { source: Source }) {
  if (source === "live")
    return <Badge variant="good">数据来自 error_events_raw</Badge>
  if (source === "empty")
    return <Badge variant="warn">暂无异常 · 请确保 SDK 已接入并触发 demo 路由</Badge>
  return <Badge variant="destructive">大盘 API 不可用 · 检查 apps/server</Badge>
}
```

`source` 由 `getErrorOverview` 判断 `categories` 数组中是否有 `count > 0` 的分类决定。SDK 上报正确后 badge 从 `empty` 变 `live`，是最快速的接入验证手段。

### 9 分类卡片

`CategoryCards` 按固定顺序展示 9 张卡片，顺序定义在 `CATEGORY_ORDER`：

```typescript
// apps/web/lib/api/errors.ts
export const CATEGORY_ORDER = [
  "js",           // 未捕获的 JS 运行时异常
  "promise",      // 未处理的 Promise 拒绝
  "white_screen", // 页面长时间无首屏
  "ajax",         // fetch / XHR 请求失败
  "js_load",      // 脚本资源加载失败
  "image_load",   // 图片资源加载失败
  "css_load",     // 样式表加载失败
  "media",        // 音视频资源加载失败
  "api_code",     // 接口业务状态码异常
]
```

卡片有两种状态：已采集（显示真实计数）和待采集（数值强制为 0，右下角显示"待采集"Badge）。`resource` 类型的事件在服务端拆分为 `js_load / image_load / css_load / media` 四类，所以前端卡片看到的是 9 分类而不是 SDK 的 7 种 subType。

### 错误排行表（Issue 聚合视图）

排行表展示按指纹聚合后的 Top Group，每行包含：

| 列 | 字段 | 说明 |
|---|---|---|
| 类型 | `category` | 9 分类之一 |
| 错误内容 | `messageHead` | message 前 128 字符 |
| 次数（占比） | `count / countRatio` | 占当前窗口总量的比例 |
| 复现率 | `reproRate` | `count / impactedSessions`，越高越好复现 |
| 影响用户 | `impactedSessions` | 累积下界（批次 Set 去重） |
| 操作 | — | AI 诊断 / 自愈 / 查看详情 |

每行右侧有三个操作按钮：`AiDiagnoseTrigger`（把 issue 信息发给 AI 分析）、`HealTriggerButton`（发往 ai-heal-fix BullMQ 队列自动修复）、详情链接。

> 💬 **面试官**：`impactedSessions` 为什么叫"累积下界"而不是精确值？
>
> ✅ 标准答案：每个 errorPlugin 上报的事件带 `sessionId`，服务端在批次窗口内用 `SET` 去重计数。不同批次间没有跨批 HyperLogLog 合并，所以同一用户在两个批次各触发一次错误会被记两次。下界在于：它只少不多，实际影响用户数 ≥ 这个值。
> 🎁 加分答案：精确的 UV 去重需要 HyperLogLog 或全量 Bitmap，成本高且对排查优先级意义不大——知道"这个错误影响了至少 200 个会话"足够判断严重程度了。

### 堆叠图趋势

堆叠图（`StackChart`）展示 9 类错误按小时桶的趋势，数据来自 `categoryTrend`：

```typescript
export interface ErrorCategoryTrendBucket {
  readonly hour: string    // UTC 小时桶
  readonly total: number
  readonly js: number;        readonly promise: number
  readonly whiteScreen: number; readonly ajax: number
  readonly jsLoad: number;    readonly imageLoad: number
  readonly cssLoad: number;   readonly media: number
  readonly apiCode: number
}
```

共 10 条图例（9 类 + total），默认展示 total 折线 + 各类堆叠面积。图例可点击切换显隐，排查特定时段的异常高峰时，关掉 total 看各分类的比例变化更直观。

### 维度分析

错误大盘支持 8 个维度下钻，定义与性能大盘对齐：`device / browser / os / version / region / language / network / timezone`。

每个 Tab 内展示该维度下各取值的错误次数（`count`）、占比（`sharePercent`）和影响会话数（`impactedSessions`）。

🔧 **典型排查场景**：某次发布后白屏告警量暴增，按 browser 维度下钻发现只有 Safari 出现 `white_screen`，其他浏览器正常。结合 Source Map 还原的堆栈定位到 Safari 不支持某个 CSS 属性导致根节点高度为 0，触发了白屏探针。

### 后端 16 路并发聚合

一次 `getOverview` 请求内部 `Promise.all` 并发 16 路查询，并发写法与性能大盘同构：

```typescript
// apps/server/src/dashboard/monitor/errors.service.ts
const [
  summaryCurrent,   summaryPrevious,     // 摘要（当前 + 前一周期，用于环比）
  bySubTypeRows,    trendRows,            // v1 兼容：5 子类 + 每小时趋势
  categoryRows,     categoryTrendRows,    // v2：9 分类卡片 + 9 分类堆叠图
  topRows,                               // Top Group（默认 10 条）
  browserRows,      browserVersionRows,   // 维度：浏览器 + 浏览器版本
  osRows,           osVersionRows,        // 维度：操作系统 + 版本
  deviceRows,       networkRows,          // 维度：机型 + 网络
  countryRows,      languageRows,         // 维度：地域 + 语言
  timezoneRows,                          // 维度：时区
] = await Promise.all([ /* 16 路并发 */ ])
```

> 💬 **面试官**：错误大盘接口一次查多少路数据？
>
> ✅ 标准答案：16 路 `Promise.all` 并发，总耗时等于最慢的一路。两个时间窗（当前 + 前一周期）分别聚合用于计算环比 delta；v1 和 v2 两套数据结构同时返回，支持前端灰度切换视图。
> 🎁 加分答案：分维度查询而不是一条 `GROUP BY ROLLUP` SQL，是因为不同维度字段的数据密度差异大（timezone 只有几十种，browser_version 可能几百种），分开查更容易针对各维度单独加索引和 LIMIT。

---

## 🚀 完整最佳实践代码

### errorPlugin 完整实现

```javascript
const ErrorPlugin = {
  name: 'error',
  _cleanup: null,

  setup(hub) {
    const seen = new WeakSet()

    // ── 入口一：JS 运行时错误（addEventListener，不覆盖 window.onerror）──
    const onBubble = (e) => {
      if (seen.has(e)) return
      seen.add(e)
      if (!e.error) return
      hub.report({
        type: 'error', subType: 'js',
        message: e.message, stack: e.error?.stack ?? '',
        source: e.filename, lineno: e.lineno, colno: e.colno,
        breadcrumbs: hub.getBreadcrumbs(),
      })
    }
    window.addEventListener('error', onBubble, false)
```

```javascript
    // ── 入口二：Promise 未处理拒绝 ──
    const onUnhandled = (e) => {
      const r = e.reason
      hub.report({
        type: 'error', subType: 'promise',
        message: r instanceof Error ? r.message : String(r),
        stack:   r instanceof Error ? r.stack   : undefined,
        breadcrumbs: hub.getBreadcrumbs(),
      })
    }
    window.addEventListener('unhandledrejection', onUnhandled)
```

```javascript
    // ── 入口三：资源加载失败（捕获阶段 + WeakSet 去重）──
    const RESOURCE_TAGS = new Set(['script','link','img','audio','video','source','iframe'])
    const onCapture = (e) => {
      if (seen.has(e)) return
      seen.add(e)
      const t = e.target
      if (!(t instanceof HTMLElement)) return
      const tag = t.tagName.toLowerCase()
      if (!RESOURCE_TAGS.has(tag)) return
      hub.report({
        type: 'error', subType: 'resource',
        url: t.src || t.href || '',
        outerHTML: t.outerHTML.slice(0, 512),
      })
    }
    window.addEventListener('error', onCapture, true)
```

```javascript
    // ── 清理：SPA 路由切换 / 微前端子应用卸载时调用 ──
    this._cleanup = () => {
      window.removeEventListener('error', onBubble, false)
      window.removeEventListener('unhandledrejection', onUnhandled)
      window.removeEventListener('error', onCapture, true)
    }
  },

  teardown() { this._cleanup?.() },
}
```

### whiteScreenPlugin 独立实现

白屏检测和错误捕获是两套独立机制，SDK 将其拆成单独插件。检测到白屏后调用 `captureException` 手动上报一条 `subType: "white_screen"` 的事件，错误大盘的 9 分类卡片中会单独计入。

```javascript
const WhiteScreenPlugin = {
  name: 'white_screen',
  setup(hub) {
    // 在空闲帧内检测，不占用主线程
    const handle = requestIdleCallback(() => {
      const root = document.querySelector('#app,#root,main') ?? document.body
      const isEmpty = root.clientHeight === 0 || root.children.length === 0
      if (isEmpty) {
        hub.captureException(
          new Error('白屏探针：根节点超时未渲染'),
          { subType: 'white_screen', url: location.href }
        )
      }
    }, { timeout: 3000 }) // 3s 后强制执行

    this._cleanup = () => cancelIdleCallback(handle)
  },
  teardown() { this._cleanup?.() },
}
```

### 完整 SDK 初始化（生产级）

```typescript
import {
  init, contextPlugin, breadcrumbPlugin,
  errorPlugin, whiteScreenPlugin, httpPlugin, apiPlugin,
  performancePlugin, pageViewPlugin,
  resourcePlugin, customPlugin,
} from '@g-heal-claw/sdk'

export function initMonitor(): void {
  init(
    {
      dsn: import.meta.env.VITE_GHC_DSN,
      environment: import.meta.env.VITE_GHC_ENV ?? 'development',
      release: import.meta.env.VITE_GHC_RELEASE,
    },
    {
      plugins: [
        contextPlugin(),      // UA / 设备 / UTM 上下文
        breadcrumbPlugin(),   // 用户操作轨迹（FIFO 100 条）
        errorPlugin({         // JS 错误 + Promise 拒绝 + 资源加载失败
          ignoreErrors: ['ResizeObserver loop'],
        }),
        whiteScreenPlugin(),  // 白屏探针（独立插件，requestIdleCallback 检测）
        httpPlugin({ codeFilter: (c) => c >= 400 }),
        apiPlugin({ slowThreshold: 2000 }),
        performancePlugin(),
        pageViewPlugin(),
        resourcePlugin(),
        customPlugin(),
      ],
    },
  )
}
```

---

## 💡 一张图总结（面试速记）

| 知识点 | 核心实现 | 关键 API | 面试频率 |
|---|---|---|---|
| JS 运行时错误 | `addEventListener('error', h, false)`，不覆盖 `window.onerror` | `addEventListener` | ⭐⭐⭐⭐⭐ |
| Promise 拒绝 | `unhandledrejection`，兼容 Error/字符串 | `unhandledrejection` | ⭐⭐⭐⭐⭐ |
| 资源加载失败 | 捕获阶段监听，判断 `target instanceof HTMLElement` | `addEventListener(true)` | ⭐⭐⭐⭐⭐ |
| 跨域 Script Error | `crossorigin="anonymous"` + CDN 响应头 | CORS | ⭐⭐⭐⭐ |
| WeakSet 去重 | 捕获/冒泡同一事件不重报，弱引用防内存泄漏 | `WeakSet` | ⭐⭐⭐ |
| 白屏检测 | 独立 `WhiteScreenPlugin`，`requestIdleCallback` 采样 + `captureException` 上报 | `requestIdleCallback` | ⭐⭐⭐⭐ |
| 框架错误边界 | React ErrorBoundary / Vue errorHandler / Next.js error.tsx | 各框架 API | ⭐⭐⭐⭐ |
| 面包屑 | FIFO 100 条，随 error 打包发送 | `addBreadcrumb` | ⭐⭐⭐⭐ |
| Source Map 还原 | 服务端还原，LRU 缓存 + WASM 解码 | `source-map v0.7` | ⭐⭐⭐⭐⭐ |
| 指纹聚合 | `sha1(subType\|normalize(msg)\|topFrame)` | sha1 | ⭐⭐⭐⭐ |
| rrweb 录屏 | DOM 快照 + MutationObserver 增量 + 时间轴回放 | `MutationObserver` | ⭐⭐ |

---

## 🏗️ 项目实战

理论讲透了，来看一个完整的"从告警到修复"闭环。

### 场景：跨域脚本报错从 "Script error." 到还原完整堆栈

**背景**：某医疗电商前端把静态资源部署在 CDN（与主站不同域），上线后错误大盘收到大量 `message: "Script error."` 的 JS 错误，`source / lineno / colno` 全是空，Source Map 还原无从下手。

**第一步：看 9 分类卡片确认范围**

打开错误分析页，source badge 显示 `live`，`js` 卡片计数 1,240，其他分类正常。点进排行表，Top 1 的 `messageHead` 是 `Script error.`，影响会话 680，复现率 1.8——高频但难复现，典型跨域错误特征。

**第二步：看堆叠图确认时间节点**

堆叠图显示 `js` 类错误从昨天 14:00 骤增，与上次发布时间吻合。其他分类无异常，说明不是基础设施问题，就是这次发布引入的。

**第三步：Source Map 还原失败，定位根因**

在 Issue 详情页看堆栈帧，全部显示 `bundle.min.js:1:XXXX`，未还原。两种可能：① release 对不上，② 跨域导致 `error` 为 `null` 根本没采到有用信息。

检查事件原始字段：`error: null`，`filename: ""`——确认是跨域屏蔽，SDK 根本没拿到 Error 对象，Source Map 还原无从下手。

**第四步：两端修复**

```html
<!-- 修复前：无 crossorigin，浏览器屏蔽跨域错误详情 -->
<script src="https://cdn.example.com/app.js"></script>

<!-- 修复后：声明匿名跨域，允许错误信息透传 -->
<script src="https://cdn.example.com/app.js" crossorigin="anonymous"></script>
```

```http
# CDN 响应头（Nginx / CDN 控制台配置）
Access-Control-Allow-Origin: https://www.your-domain.com
```

**第五步：验证修复效果**

重新发布后，错误大盘 `js` 卡片计数从 1,240 降到 47（残留的是真实 JS bug，不是跨域噪音）。Issue 详情的堆栈帧成功还原：

```
bundle.min.js:1:89234
  → src/components/DrugDetail/index.tsx:203
      at handleAddToCart (DrugDetail/index.tsx:203:12)
```

定位到药品详情页加入购物车时，某字段为 `null` 时缺少防守，一行修复上线。

| 阶段 | 数据 |
|---|---|
| 修复前 `js` 卡片 | 1,240 次 / 影响 680 个会话 |
| 修复后 `js` 卡片 | 47 次（真实 bug） |
| 堆栈还原 | `bundle.min.js:1:89234` → `DrugDetail/index.tsx:203` |
| 修复耗时 | 从告警到定位 12 分钟，修复 1 行代码 |

> 💬 **面试官**：遇到大量 "Script error." 怎么排查？
>
> ✅ 标准答案：三步走。① 确认是跨域问题：检查事件原始字段 `error === null && filename === ""`；② 两端修复：`<script>` 加 `crossorigin="anonymous"`，CDN 加 `Access-Control-Allow-Origin`；③ 验证：重新部署后看错误大盘 `js` 卡片计数是否恢复正常，Issue 详情堆栈帧是否成功还原。
> 🎁 加分答案：修复后如果 Source Map 还原仍失败（堆栈还是 `bundle.min.js:1:XXXX`），检查第二个问题：CI 上传 Source Map 时的 `release` 值是否和 SDK 初始化时的 `release` 字段对齐。两者不一致，服务端找不到对应的 `.map` 文件，还原依然失败。

---

## 📝 留个问题

你们项目里 Source Map 是怎么上传的？是 CI 自动化，还是需要开发者手动上传？手动上传最容易出的问题是版本对不上——release 字段和实际上传的 `.map` 文件版本不一致，导致堆栈还原全部失败。欢迎评论区聊聊你踩过的坑。

---

> 🔖 这是「前端性能与监控系列」第 5 篇。上一篇：《手写性能监控 SDK：从 PerformanceObserver 到生产可用的采集库（面试收藏级）》；下一篇预告：《手写行为监控（API + 资源 + 埋点 + 访问分析）SDK》
