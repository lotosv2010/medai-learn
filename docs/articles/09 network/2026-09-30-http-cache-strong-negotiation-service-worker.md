# HTTP 缓存体系：强缓存、协商缓存与 Service Worker 可编程缓存（面试收藏级）

> **副标题**：强缓存的到期时间控制、协商缓存的内容校验机制、Service Worker 作为可编程缓存层

> 面试官问「强缓存和协商缓存的本质区别是什么？`no-cache` 是不缓存的意思吗？」——大多数人能答「一个不发请求、一个发请求」，但继续追问「`ETag` 和 `Last-Modified` 谁优先？为什么？`immutable` 是干嘛的？」，能答完整的不到一成。这篇文章，就带你把这套缓存体系彻底讲透。

---

## 🎯 这篇文章解决什么问题

这是「网络原理深度拆解」系列的第 08 篇，落在**应用层**。它承接两处前文：第 05 篇讲过的 `304 Not Modified` 状态码语义，以及第 01 篇讲过的 CDN 调度与缓存系统——本篇聚焦「缓存机制本身」，把强缓存、协商缓存、Service Worker 三条线彻底讲透。

缓存是性能优化的第一优先级，也是「资源更新了但用户看到的还是旧版本」这类线上事故的头号排查对象。这篇文章只做三件事：

- **讲透强缓存**：`Cache-Control`/`Expires`/`Pragma` 的语义与优先级、内容哈希的更新策略
- **讲透协商缓存**：`ETag`/`Last-Modified` 的校验机制、差异与优先级、`304` 的本质
- **讲透 Service Worker**：从「浏览器内置的固定规则缓存」到「完全可编程的缓存层」的跃迁

全篇示例统一用医疗场景（药品说明书 PDF、HIS 系统），让你在熟悉的业务语境里理解协议。**既讲原理，也讲面试怎么答**——主线三块每块都配「面试官视角 + 标准答案 + 加分答案」，文末再补两个扩展章节（浏览器本地存储、CDN 缓存），把 Web 缓存的全景补完整。

---

## 一、使用与实践

### 1. 缓存全景：Web 缓存到底有哪些

Web 缓存，指的是一个 Web 资源（HTML 页面、图片、JS、数据等）存在于 **Web 服务器和客户端（浏览器）之间**的副本。缓存会根据进来的请求保存输出内容的副本；当下一个请求到来、URL 相同时，缓存机制会决定是**直接使用副本响应**，还是**再次向源服务器发起请求**。

Web 缓存大致可以分为三大类：**数据库缓存**、**服务器端缓存**（代理服务器缓存、CDN 缓存）、**浏览器缓存**。其中浏览器缓存又包括**HTTP 缓存**和**浏览器本地存储**——本地存储最常用的是 `cookie`、`localStorage`、`sessionStorage`、`indexDB`。

这里先划一条边界，为全文定调：

- **HTTP 缓存**（本篇主线）：由 `Cache-Control`/`ETag` 等 HTTP 响应头控制的、对「请求-响应」的复用机制，是协议层的能力
- **浏览器本地存储**（文末扩展）：`localStorage`/`indexDB` 等由 JS 主动读写的数据存储，是「存储」而非「请求复用」
- **CDN 缓存**（文末扩展）：介于浏览器和源站之间的代理缓存，第 01 篇讲过它的「调度」，本篇补它的「缓存回源」

一句话：**Web 缓存的价值在于减少网络延迟、加快页面打开速度、减少带宽消耗、降低服务器压力**。

### 2. DevTools 里三种缓存状态怎么看

浏览器可以在内存、硬盘中开辟空间保存请求资源的副本。我们在 DevTools Network 里经常看到 `Memory Cache`（内存缓存）和 `Disk Cache`（硬盘缓存），指的就是缓存所在的位置。请求一个资源时，会按优先级依次查找缓存：

**Service Worker → Memory Cache → Disk Cache → Push Cache**

四种缓存从上往下依次检查，命中就使用，都不命中才发起真实请求：

![缓存位置：Service Worker → Memory Cache → Disk Cache → Push Cache](https://cdn.nlark.com/yuque/0/2021/png/738210/1637734895327-ca519826-c26a-45ac-9e71-d7d3ba4be005.png)

- **Service Worker**：运行在浏览器背后的独立线程，一般用来实现缓存功能。使用 Service Worker 的话，传输协议必须为 **HTTPS**
- **Memory Cache**：内存中的缓存，主要包含当前页面已经抓取到的资源（已下载的样式、脚本、图片等）。读取内存比磁盘快，但**持续性很短**，会随进程释放而释放，一旦关闭 Tab 页，内存缓存也就被释放了。内存缓存中有一块重要资源是 preloader 相关指令（如 `<link rel="prefetch">`）下载的资源
- **Disk Cache**：硬盘中的缓存，读取速度慢一点，但胜在**容量和存储时效性**。绝大部分缓存都来自 Disk Cache，在 HTTP 协议头中设置
- **Push Cache**：推送缓存，是 HTTP/2 中的内容，仅当前三种缓存都没命中时才使用。它只在会话（Session）中存在，会话结束即释放，缓存时间也很短暂（Chrome 中约 5 分钟），且并非严格执行 HTTP 头中的缓存指令

`memory cache` 表示不访问服务器、直接从内存读取缓存，速度快但关进程就销毁，一般用于存储**较小文件**；`disk cache` 表示不访问服务器、直接从硬盘读取缓存，速度慢但关闭进程后仍然存在，一般用于存储**大文件**。下面这张图能清晰看出两者的差别（同一批图片里，小图命中 memory cache、大图命中 disk cache）：

![memory cache 与 disk cache 的差别](https://cdn.nlark.com/yuque/0/2021/png/738210/1637742367409-a7ca55b9-d1a4-40dd-b6ea-8ecce9c35651.png)

在 preload 或 prefetch 加载资源时，两者也都存储在 HTTP cache 里：资源加载完成后，如果能被缓存就存进 HTTP cache 等待后续使用；如果不可被缓存，则在被使用前存储在 memory cache：

![prefetch cache](https://cdn.nlark.com/yuque/0/2021/png/738210/1637742367543-62bc010f-f0f3-4ae7-8e26-02994b5a8a9e.png)

而 Network 面板里的 `304 Not Modified` 则完全不同——它说明**浏览器发了请求到服务端，服务端判断内容没变，返回 304 让浏览器继续用本地缓存**（详见下文协商缓存）。

### 3. 服务端设置缓存响应头：Node.js 最小示例

缓存的行为，最终由服务端在响应头里「说了算」。下面是一段 Node.js 原生 `http` 模块设置强缓存的最小示例，用来演示 `Cache-Control: max-age` 的效果（完整代码，注释里已经把强缓存的要点写清楚了）：

```javascript
const http = require('http')
const url = require('url')
const fs = require('fs')
const path = require('path')

http.createServer((req, res) => {
  const { pathname } = url.parse(req.url)
  console.log(pathname)
  const filePath = path.join(__dirname, 'public', pathname)
  // 1.强制缓存
  // 分类：
  //  expires 老版本浏览器支持，绝对时间
  //  cache-control 相对时间
  // 特点
  //  默认强制缓存不缓存首页(如果已经断网，那这个网页应该访问不到，所以首页不会被缓存)
  //  引用的资源可以被缓存下来，后续找缓存，不会像服务器请求200
  // 不足
  //    强制缓存不会向服务器发送请求，会导致页面修改后，视图依旧采用老的
  res.setHeader('Cache-Control', 'max-age=10') // 缓存10秒
  // res.setHeader('Cache-Control', 'no-cache') // 错误理解：不缓存，正确理解：缓存但是每次都会发请求
  // res.setHeader('Cache-Control', 'no-store') // 不再浏览器中进行缓存，每次都请求服务器

  fs.stat(filePath, (error, statObj) => {
    if(error) return res.statusCode = 404, res.end('Not Found')
    if(statObj.isFile()) {
      fs.createReadStream(filePath).pipe(res)
    } else {
      return res.statusCode = 404, res.end('Not Found')
    }
  })
}).listen(3000)
```

### 4. Service Worker 注册流程

Service Worker（SW）是缓存体系的「进阶形态」。它注册的基本流程是：用 `navigator.serviceWorker.register()` 注册一个脚本，然后在这个脚本里监听 `fetch` 事件、拦截页面发出的网络请求，配合 `Cache` API 决定缓存策略。一个最小可运行示例：

```javascript
// 页面主线程里注册 Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('SW 注册成功', reg.scope))
    .catch(err => console.log('SW 注册失败', err))
}
```

```javascript
// sw.js —— Service Worker 脚本
const CACHE_NAME = 'his-cache-v1';

// install 阶段预缓存关键资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['/', '/styles/main.css', '/scripts/app.js'])
    )
  );
});

// fetch 阶段拦截请求，决定缓存策略
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;      // 命中缓存直接返回
      return fetch(event.request);     // 未命中走网络
    })
  );
});
```

这里先记住三个关键点：**SW 跑在独立于页面主线程的 Worker 线程**、**能拦截页面所有 `fetch` 请求**、**缓存策略完全由 JS 代码决定**。第二部分的「Service Worker 作为可编程缓存层」会把这三点讲透。

### 5. 医院 HIS 药品说明书 PDF 的缓存更新策略

一个真实的落地场景：医院 HIS 系统里的「药品说明书 PDF」这类**静态资源**，内容更新不频繁但一旦更新必须让医生立刻看到新版本。

如果简单粗暴地给 PDF 设一个很长的 `max-age`（比如一年），性能是好了，但问题来了——**内容更新后，医生在 `max-age` 到期前完全拿不到新说明书**。如果设短了，又频繁回源、性能差。

生产上的标准解法是**强缓存 + 文件名哈希（content hash）**：文件名里带上内容的哈希值（如 `drug-manual.a1b2c3d4.pdf`），**内容一变，哈希就变，URL 就变**。旧 URL 继续走缓存，新 URL 因为「对浏览器来说是全新的资源」而必然重新请求。这样就能配合超长 `max-age`（甚至 `immutable`）做到「既能长期强缓存、又能保证更新立即生效」。这个做法第二部分会展开。

### 6. 普通刷新 vs 强制刷新

这是日常排查「改完代码刷新没生效」时第一个要想到的差异。浏览器对缓存的处理，会因「用户怎么发起的请求」而不同：

![用户操作对缓存的影响](https://cdn.nlark.com/yuque/0/2021/png/738210/1637735122936-936ab77a-b349-474f-bb64-75a76d4c1005.png)

| 用户操作 | Expires/Cache-Control（强缓存） | Last-Modified/Etag（协商缓存） |
| --- | --- | --- |
| 地址栏回车 | 有效 | 有效 |
| 页面链接跳转 | 有效 | 有效 |
| 新开窗口 | 有效 | 有效 |
| 前进、后退 | 有效 | 有效 |
| **F5 刷新** | **无效** | 有效 |
| **Ctrl+F5 强制刷新** | **无效** | **无效** |

关键结论：**普通刷新（F5）会让强缓存失效、但协商缓存仍然有效**（所以你会看到 304）；**强制刷新（Ctrl+Shift+R）会让强缓存和协商缓存都失效**，浏览器重新请求所有资源（所以看到的是全 200）。这解释了为什么「改完静态资源、普通刷新有时还是旧的，非要 Ctrl+F5 才出来」——因为强缓存被 F5 绕过了，但你可能还卡在别的缓存层。

---

## 二、设计与原理

这是本篇的核心。下面七个小节按「先讲强缓存 → 再讲协商缓存 → 差异与优先级 → 指令组合 → 内容哈希 → Service Worker → Node.js 对比」的顺序，由浅入深讲透。

### 1. 强缓存：不发请求，直接用本地副本

强缓存（也叫本地缓存、强制缓存）的核心是一句话：**命中强缓存时，浏览器完全不发请求到服务端，直接从本地缓存读取资源**。在 Chrome 的 Network 面板里，强缓存命中的请求显示的是 HTTP 状态码 **200**（但 Size 列会标注 `from disk cache` / `from memory cache`，而不是真实的字节数）。

是否命中强缓存，由三个 Header 属性共同控制：`Expires`、`Cache-Control`、`Pragma`。

![强制缓存规则：命中 / 未命中](https://cdn.nlark.com/yuque/0/2021/png/738210/1637735822280-1ec2ab3f-045b-41a4-b464-f3f4bfc1d8b4.png)

**`Expires`（HTTP/1.0）**：值是一个 HTTP 日期（GMT 格式），浏览器根据**系统时间**和 `Expires` 值比较，系统时间超过它就缓存失效。它的致命问题是**依赖系统时间一致性**——当客户端系统时间和服务器时间不一致时，缓存有效期就会不准。`Expires` 在三个 Header 里的优先级**最低**。

```javascript
// 用 Expires 设置强缓存（绝对时间，缓存 10 秒）
res.setHeader('Expires', new Date(Date.now() + 10 * 1000).toGMTString())
```

**`Cache-Control`（HTTP/1.1）**：在请求头和响应头里都能用，是现在最主流的缓存控制方式。核心是 `max-age`：

- `max-age`：单位秒，从「发起请求的时间」开始算，超过这个秒数缓存失效（相对时间，不依赖系统时间一致性）

```javascript
// 用 Cache-Control 设置强缓存（相对时间，缓存 10 秒）
res.setHeader('Cache-Control', 'max-age=10')
```

**`Pragma`（HTTP/1.0 遗留）**：只有一个值 `no-cache`，效果和 `Cache-Control: no-cache` 一致——不使用强缓存、每次都要向服务器验证。它是为了兼容 HTTP/1.0 客户端而存在的，在 HTTP/1.1 中已被废弃。

```javascript
// Pragma 与 Cache-Control 同时存在时，Pragma 优先级更高
res.setHeader('Cache-Control', 'max-age=10')
res.setHeader('Pragma', 'no-cache')
```

三者同时出现时的**优先级**：`Pragma > Cache-Control > Expires`。

用一个 Node.js 示例把 `Expires` 讲清楚（这是笔记里的完整代码，演示绝对时间缓存 10 秒）：

```javascript
const http = require('http')
const url = require('url')
const fs = require('fs')
const path = require('path')

http.createServer((req, res) => {
  const { pathname } = url.parse(req.url)
  console.log(pathname)
  const filePath = path.join(__dirname, pathname)
  // 1.强制缓存
  res.setHeader('Expires', new Date(Date.now() + 10 * 1000).toGMTString()) // 缓存10秒

  fs.stat(filePath, (error, statObj) => {
    if(error) return res.statusCode = 404, res.end('Not Found')
    if(statObj.isFile()) {
      fs.createReadStream(filePath).pipe(res)
    } else {
      return res.statusCode = 404, res.end('Not Found')
    }
  })
}).listen(3000)
```

第一次加载，页面向服务器请求数据，响应头里带上了 `Expires`（10 秒后过期）：

![第一次加载，响应头带 Expires](https://cdn.nlark.com/yuque/0/2021/png/738210/1637740839677-e1487e5d-95d5-4b50-b6fb-851849e66ac6.png)

![第一次加载的响应头详情](https://cdn.nlark.com/yuque/0/2021/png/738210/1637740863694-7d727b9f-539d-4d91-9048-8b089d5012f8.png)

第二次加载（10 秒内），`Date` 头属性没有更新，可以看到浏览器直接用了强缓存，**实际没有发送请求**：

![第二次加载，直接命中强缓存](https://cdn.nlark.com/yuque/0/2021/png/738210/1637740898125-c6c7e5e4-2aa6-4e9e-85ee-aea97ff2c3bc.png)

![命中强缓存的响应头，状态码 200 from memory cache](https://cdn.nlark.com/yuque/0/2021/png/738210/1637740926964-946073a7-aa54-46c6-82a9-1f5e5b98f147.png)

过了 10 秒超时后再请求，缓存失效，重新走网络：

![10 秒后缓存失效，重新请求](https://cdn.nlark.com/yuque/0/2021/png/738210/1637741109958-49abd5cb-e6a2-4946-871b-1aac605d5c58.png)

![过期后的响应头，Expires 已更新](https://cdn.nlark.com/yuque/0/2021/png/738210/1637741133237-e970a04e-356d-446f-b606-b6a2e395c527.png)

**强缓存的代价**：它是性能最好的缓存策略，但「性能最好」的代价是——**如果资源内容变了，浏览器在 `max-age` 到期前完全不知道**。所以生产环境通常给资源文件名加上内容哈希（如 `app.a1b2c3.js`），内容变化即 URL 变化，配合超长 `max-age` 既能长期强缓存、又能保证内容更新立即生效（第 5 小节展开）。

> 💬 **面试官**：强缓存命中时，HTTP 状态码是 200 还是 304？
>
> ✅ 标准答案：强缓存命中时浏览器**根本不发请求**，Network 面板里显示的是 200，但 Size 列标注 `from memory cache` 或 `from disk cache`，这个 200 是浏览器「自产自销」的状态，不是服务器真实返回的 200；而 304 是协商缓存命中时、浏览器确实发了请求、服务端真实返回的状态码。
>
> 🎁 加分答案：能落到「怎么判断一个 200 是强缓存命中还是真实响应」——看 Network 面板的 Size 列：真实响应会显示具体字节数（如 293KB），强缓存命中显示的是 `(memory cache)` / `(disk cache)`；再看 Timing，强缓存命中的请求耗时通常接近 0ms，因为它根本没出网。

### 2. 协商缓存：发请求，但让服务端「只验不传」

当强缓存**失效**（`max-age` 到期）、或者设置了 `Cache-Control: no-cache` 时，就进入协商缓存流程。协商缓存的核心是：**浏览器会发请求到服务端，但请求里带上「我上一次拿到的这个资源的标识」，服务端比对后如果内容没变，就只返回 `304 Not Modified`（不带响应体），浏览器继续用本地缓存**。

![协商缓存规则：命中 / 未命中](https://cdn.nlark.com/yuque/0/2021/png/738210/1637743723530-d6e09c94-2192-4bfc-9ef4-c211bfb99c7f.png)

浏览器带上的「标识」有两对，对应服务端响应的两个头：

- 请求头 `If-None-Match` ← 对应上次响应的 `ETag`（内容哈希指纹）
- 请求头 `If-Modified-Since` ← 对应上次响应的 `Last-Modified`（最后修改时间）

服务端比对后：**内容没变 → 返回 304（不返回响应体，节省带宽，详见 05 篇 304 状态码语义）；内容变了 → 返回 200 和新内容**。

这里必须纠正一个高频误解：**`Cache-Control: no-cache` 不是「不缓存」，而是「缓存但每次都要向服务端验证」**。「完全不缓存」是 `no-store`（第 4 小节展开）。`no-cache` 意味着资源会被缓存下来，但每次使用前都要发一次协商请求确认它还是新的。

> 💬 **面试官**：强缓存和协商缓存的本质区别是什么？`no-cache` 是不缓存的意思吗？
>
> ✅ 标准答案：本质区别是**要不要发请求**。强缓存命中时浏览器完全不发请求、直接读本地缓存，状态码 200（from cache）；协商缓存命中时浏览器会发请求，服务端比对后返回 304 让浏览器继续用本地缓存。`no-cache` **不是**不缓存——它是「缓存，但每次使用前都要向服务端协商验证」，真正「完全不缓存」的是 `no-store`。
>
> 🎁 加分答案：能补充「判断依据」——强缓存由 `Cache-Control: max-age`/`Expires` 决定是否命中，不看内容；协商缓存由 `ETag`/`Last-Modified` 决定内容是否变化。还能点出两者在带宽上的差异：强缓存 0 请求 0 带宽，协商缓存虽然省了响应体（304 不带 body），但仍要付出一次请求往返 + 请求头的开销，所以性能上「尽量多命中强缓存、减少 304」。

### 3. ETag vs Last-Modified：差异与优先级

协商缓存的两对标识，为什么 `ETag` 优先级更高？先看 `Last-Modified` 的局限：

`Last-Modified` / `If-Modified-Since` 的值是**文件的最后修改时间**。第一次请求服务端把资源的最后修改时间放进 `Last-Modified` 响应头；第二次请求时，请求头带上这个时间作为 `If-Modified-Since`；服务端拿「文件当前修改时间」和 `If-Modified-Since` 比较，相等就返回 304。

```javascript
const http = require('http')
const url = require('url')
const fs = require('fs')
const path = require('path')

http.createServer((req, res) => {
  const { pathname } = url.parse(req.url)
  console.log(pathname)
  const filePath = path.join(__dirname, pathname)
  // 1.协商缓存
  // 分类：
  //  Last-Modified  & If-Modified-Since
  //  ETag  & If-None-Match
  // Last-Modified特点
  //  对比最后修改时间返回内容
  // Last-Modified不足
  //   内容没有变化修改时间变化了，也会重新读取内容，时间不精确，精确到秒，如果一秒内改变多次也监控不到

  res.setHeader('Cache-Control', 'no-cache')
  const ifModifiedSince = req.headers['if-modified-since']

  fs.stat(filePath, (error, statObj) => {
    if(error) return res.statusCode = 404, res.end('Not Found')
    const lastModified = statObj.ctime.toGMTString()
    if(ifModifiedSince === lastModified) {
      res.statusCode = 304
      return res.end()
    }
    res.setHeader('Last-Modified', lastModified)
    if(statObj.isFile()) {
      fs.createReadStream(filePath).pipe(res)
    } else {
      return res.statusCode = 404, res.end('Not Found')
    }
  })
}).listen(3000)
```

第一次请求，响应头带 `Last-Modified`：

![Last-Modified 第一次请求](https://cdn.nlark.com/yuque/0/2021/png/738210/1637744878039-25c333b7-7c68-44c9-bd44-7c344d68a5d7.png)

第二次请求，请求头带 `If-Modified-Since`，服务端返回 304：

![Last-Modified 第二次请求返回 304](https://cdn.nlark.com/yuque/0/2021/png/738210/1637744938279-062f091d-b942-4221-a44b-9880c8d46f98.png)

**`Last-Modified` 的三个局限**：

- **秒级精度**：只能精确到秒，如果文件在 1 秒内被修改多次，它无法准确标注
- **内容没变但时间变了**：文件被定期生成时，内容毫无变化、`Last-Modified` 却变了，导致缓存失效
- **时间来源不可靠**：可能存在服务器无法准确获取文件修改时间、或与代理服务器时间不一致的情形

**`ETag` 正是为解决这些问题而生**。`ETag` / `If-None-Match` 的值是一串 **hash 码**，代表资源的唯一标识符——服务端文件变化时，它的 hash 会随之改变。请求时拿请求头里的 `If-None-Match` 和当前文件的 hash 比较，相等就命中协商缓存。

```javascript
const http = require('http')
const url = require('url')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
// md5 摘要算法：不是加密算法(不可逆)
//  1.不可逆
//  2.不同内容转化的结果不相同
//  3.转化后的结果都是一样长的
//  4.同样的东西产生的结果肯定是相同的

http.createServer((req, res) => {
  const { pathname } = url.parse(req.url)
  console.log(pathname)
  const filePath = path.join(__dirname, 'public', pathname)
  // 1.协商缓存
  // 分类：
  //  Last-Modified  & If-Modified-Since
  //  ETag  & If-None-Match
  // ETag特点
  //  第一次请求，需要跟进内容产生一个唯一标识，对应当前的文件
  // ETag不足
  //   性能不高

  res.setHeader('Cache-Control', 'no-cache')
  const ifNodeMatch = req.headers['if-none-match']

  fs.stat(filePath, (error, statObj) => {
    if(error) return res.statusCode = 404, res.end('Not Found')
    const contentHash = crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('base64')
    if(contentHash === ifNodeMatch) {
      res.statusCode = 304
      return res.end()
    }
    res.setHeader('ETag', contentHash)
    if(statObj.isFile()) {
      fs.createReadStream(filePath).pipe(res)
    } else {
      return res.statusCode = 404, res.end('Not Found')
    }
  })
}).listen(3000)
```

第一次请求，响应头带 `ETag`：

![ETag 第一次请求](https://cdn.nlark.com/yuque/0/2021/png/738210/1637743922595-00c1a7a9-1c24-42d4-b28f-83b50f6e69b1.png)

![ETag 第一次请求响应头详情](https://cdn.nlark.com/yuque/0/2021/png/738210/1637744617412-9d3efc71-ec91-49a9-826d-0b09f303c812.png)

第二次请求，请求头带 `If-None-Match`，服务端返回 304：

![ETag 第二次请求返回 304](https://cdn.nlark.com/yuque/0/2021/png/738210/1637744491142-5f5057bb-ec8f-4d1f-af0d-b725be7768b4.png)

![ETag 第二次请求请求头详情](https://cdn.nlark.com/yuque/0/2021/png/738210/1637744671087-64f9f0c0-651c-443d-a87a-e8df1400d447.png)

**`ETag` 的强弱校验**：如果 hash 码以 `W/` 开头（如 `W/"50b11d4f"`），说明是**弱校验**——只要文件内容没有「达到触发 hash 后缀变化」的差异，就仍返回 304；不带 `W/` 前缀则是**强校验**，要求内容完全一致。

**优先级结论**：`Last-Modified` 与 `ETag` 可以一起使用，**服务端会优先验证 `ETag`**，一致的情况下才继续比对 `Last-Modified`，最后决定是否返回 304。

> 💬 **面试官**：`ETag` 和 `Last-Modified` 分别有什么局限？为什么 `ETag` 优先级更高？
>
> ✅ 标准答案：`Last-Modified` 秒级精度（1 秒内多次修改检测不到）、只能反映「修改时间」而非「内容变化」（内容没变但重存会误判）、时间来源可能不可靠。`ETag` 是内容的哈希指纹，能精确反映「内容是否真的变化」。两者并存时浏览器优先用 `ETag`，因为它更精确、更可靠。
>
> 🎁 加分答案：能补充 `ETag` 自己的代价——计算 hash 有性能开销（每次请求都要算，或缓存计算结果），且分布式环境下不同服务器生成的 `ETag` 可能不一致（除非用内容 hash 而非「inode + mtime」这类服务器相关字段，这也是为什么生产上要「确保服务器配置或移除 ETag」）。还能点出强弱校验（`W/` 前缀）的语义差异。

### 4. Cache-Control 指令组合详解

`Cache-Control` 是缓存控制的「总开关」，指令可以组合使用。逐一拆解：

- **`max-age=N`**：缓存有效时长（秒），从请求时间起算。强缓存的核心指令
- **`no-store`**：**完全不缓存**（连协商缓存都禁止），每次都向服务器请求最新资源
- **`no-cache`**：**缓存，但每次使用前都要向服务端协商验证**（不是「不缓存」）
- **`private`**：专用于个人缓存，**中间代理、CDN 不能缓存**此响应（默认为 private）
- **`public`**：响应可以被中间代理、CDN 等共享缓存
- **`must-revalidate`**：缓存过期前可以直接用，**过期后必须向服务器重新验证**
- **`immutable`**：明确告诉浏览器这个资源**永远不会变**，配合强缓存彻底跳过协商，常用于带内容哈希的静态资源

两个高频误解要反复强调：**`no-cache` 不是「不缓存」**（是「缓存但每次协商」），**`no-store` 才是「完全不缓存」**。另外 `no-cache` 和 `must-revalidate` 也容易被混淆——`no-cache` 是「每次都用前都验」，`must-revalidate` 是「过期后才必须验」，两者语义不同。

> 💬 **面试官**：`no-store`、`no-cache`、`max-age` 三者的语义差异是什么？
>
> ✅ 标准答案：`max-age=N` 是强缓存有效期，N 秒内不发请求直接读缓存；`no-cache` 是「缓存但每次都要协商验证」，绕过强缓存、走协商缓存；`no-store` 是「完全不缓存」，既不存本地也不做协商，每次都请求最新资源。
>
> 🎁 加分答案：能落到场景选择——敏感数据（如处方、个人隐私）用 `no-store`；需要实时性又想要缓存收益的动态内容用 `no-cache`（每次 304 省带宽）；纯静态、可长期不变的内容用 `max-age` + 内容哈希（甚至 `immutable`）。还能补充 `private`/`public` 的边界：决定这个响应能不能被 CDN/代理缓存，涉及多用户数据时务必 `private`。

### 5. 静态资源内容哈希：解决「强缓存的更新悖论」

强缓存有个「更新悖论」：`max-age` 设短了，频繁回源性能差；设长了，内容更新后用户迟迟拿不到新版本。**内容哈希（content hash）就是用来破解这个悖论的**。

核心思想是「**内容变更即 URL 变更**」：

- 打包工具（Webpack/Vite 等）根据文件内容生成哈希，把哈希放进文件名（如 `app.a1b2c3.js`）
- 内容不变 → 哈希不变 → URL 不变 → 一直命中强缓存
- 内容变了 → 哈希变了 → URL 变了 → 对浏览器来说是全新资源，必然重新请求

于是就可以放心地把静态资源设成**超长 `max-age`（甚至一年）+ `immutable`**，既享受强缓存的性能，又保证更新立即生效。

对比一下老做法——「加随机数 query 参数」：`http://www.kimshare.club/kim/common.css?v=22324432`。它也能让 URL 变化，但有两个局限：一是 `?v=xxx` 属于查询参数，某些 CDN/代理默认不缓存带 query 的资源（或缓存策略不同）；二是它依赖「手动改版本号」，容易漏改，不像内容哈希是「自动跟随内容变化」。所以**现代最佳实践是内容哈希进文件名，而不是 query 参数**。

> 💬 **面试官**：静态资源文件名加内容哈希这种做法解决了什么问题？
>
> ✅ 标准答案：解决「强缓存的更新悖论」——用内容哈希让「内容变则 URL 变」，配合超长 `max-age`（甚至 `immutable`），既实现长期强缓存（性能好），又保证内容更新后立即生效（新 URL 必然重新请求），两全其美。
>
> 🎁 加分答案：能对比旧做法——query 参数（`?v=1.0`）也能变 URL，但依赖手动维护、且部分 CDN 不缓存带 query 的资源，内容哈希是「自动跟随内容、构建产物可稳定长缓存」。还能补充一个边界：**HTML 入口文件不能用超长强缓存**，因为它是「资源的索引」，必须能及时拿到最新资源的 URL，通常对 HTML 用 `no-cache`（短缓存 + 协商），对带哈希的静态资源用 `max-age` 长缓存——这就是「HTML 短缓存 + 资源长缓存」的分层缓存策略。

### 6. Service Worker：可编程缓存层（重点）

这是全篇的「进阶」部分，也是把「背概念」和「真理解」区分开的地方。

**Service Worker 的本质**：它运行在**独立于页面主线程的 Worker 线程**，能拦截页面发出的所有 `fetch` 请求，**完全由开发者用 JS 代码决定缓存策略**。

这一步的质变在于：浏览器内置的 HTTP 缓存（强缓存/协商缓存），规则是**相对固定**的——你能控制的只有几个响应头的取值；而 Service Worker 把这些规则**升级为完全可编程的缓存逻辑**——「什么请求缓存、缓存多久、命中时怎么处理、要不要后台更新」，全是你写代码说了算。这正是 PWA 离线能力的核心基础设施。

Service Worker 的缓存基于 **`Cache` API**（`Cache Storage`），它和 HTTP 缓存是两个并行的体系，但 SW 的拦截发生在请求发出去之前，所以**优先级高于 HTTP 缓存**（回到第一部分的查找顺序：Service Worker → Memory → Disk → Push）。

常见有三种策略模式：

**Cache First（缓存优先）**：先查缓存，命中直接返回，未命中才走网络。适合**静态资源**（一旦发布就不变的壳资源），离线也能访问，但内容可能不是最新。

```javascript
// Cache First：缓存优先，适合静态资源
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
```

**Network First（网络优先）**：先走网络，失败（断网/超时）才回退缓存。适合**需要实时性、但离线时希望有兜底**的内容，比如接口数据。

```javascript
// Network First：网络优先，缓存兜底
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
```

**Stale-While-Revalidate（先缓存后更新）**：先立即返回缓存（体验好），同时后台发请求拿新数据更新缓存（下次生效）。适合**实时性要求不苛刻、但希望「秒开 + 内容逐渐更新」**的场景，比如药品目录、头像、列表数据。

```javascript
// Stale-While-Revalidate：先返回缓存，后台更新缓存
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open('his-cache-v1').then(cache =>
      cache.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          cache.put(event.request, response.clone()); // 后台更新缓存
          return response;
        });
        return cached || fetchPromise; // 有缓存先返回缓存
      })
    )
  );
});
```

> 💬 **面试官**：Service Worker 相比浏览器内置 HTTP 缓存机制的本质区别是什么？
>
> ✅ 标准答案：HTTP 缓存由固定的协议规则（`Cache-Control`/`ETag` 等响应头）决定，开发者只能配置有限的参数；Service Worker 运行在独立 Worker 线程、能拦截所有 `fetch`，缓存策略完全由 JS 代码决定，是「可编程缓存层」。它还是 PWA 离线能力的核心，能实现 HTTP 缓存做不到的「完全离线访问」。
>
> 🎁 加分答案：能补充两者的协作与边界——SW 拦截发生在请求发出前，优先级高于 HTTP 缓存；SW 用 `Cache Storage`（JS 可读写的对象缓存），HTTP 缓存是浏览器内部管理的；但 SW 也有代价：需要 HTTPS、有生命周期和版本更新复杂度、首次加载无缓存。一句话：**HTTP 缓存是「规则缓存」，SW 是「代码缓存」**，SW 让你能实现任意策略（离线、后台更新、预缓存）。

> 💬 **面试官**：Cache First、Network First、Stale-While-Revalidate 分别适合什么场景？
>
> ✅ 标准答案：Cache First 适合静态资源（发布后不变的壳资源）；Network First 适合实时性要求高、断网时要兜底的数据；Stale-While-Revalidate 适合「秒开 + 内容逐渐更新」的场景（先给缓存、后台更新）。选型核心是「这个资源对**实时性**和**离线可用性**的权衡」。
>
> 🎁 加分答案：能落到医疗场景举例——药品说明书 PDF 这类静态资源用 Cache First；检验报告这类强实时数据用 Network First；药品目录列表用 Stale-While-Revalidate（打开快、后台静默更新）。还能补充一个坑：Network First 要设超时，否则弱网下会一直挂着等网络，反而比直接读缓存更慢。

### 7. 对比 Node.js 实现：`express.static` 的缓存头

原理讲完，落到 Node.js。后端在响应静态资源时（如 `express.static`）需要**正确设置 `ETag` / `Cache-Control`**。`express.static` 默认就会为静态文件生成 `ETag` 和 `Last-Modified`（基于文件的 mtime + size 计算），并支持配置 `maxAge`、`immutable` 等选项。

理解背后原理的价值在于排障：当线上出现「资源更新了但用户看到的还是旧版本」时，能快速判断——

- 是**强缓存过期时间设置不合理**（`max-age` 太长，浏览器一直没回来要新版本）？
- 还是 **CDN 层缓存未及时刷新**（浏览器过期了，但 CDN 边缘节点还持着旧副本没回源，呼应 01 篇的 CDN 缓存系统）？

这两个问题都指向「缓存」这个主题，但排查路径完全不同：前者调 `max-age`/强制刷新验证，后者要 CDN 控制台刷新缓存或观察回源率。这就是「懂原理才能快速定位」的典型场景。

---

## 三、工程落地参考

原理讲完，落到「工程落地」时看哪些权威资料：

### 1. HTTP 缓存规范（RFC 9111）

RFC 9111 是 HTTP Caching 的现行规范，定义了 `Cache-Control` 各指令的含义与优先级、缓存新鲜度计算、`private`/`public` 的共享缓存边界。写作和排障时以它为准。

### 2. 条件请求规范（RFC 9110 第 13 章）

`If-None-Match` / `If-Modified-Since` 的服务端处理逻辑由 RFC 9110 第 13 章定义——什么时候返回 304、什么时候返回 200，`ETag` 与 `Last-Modified` 的优先级规则都在这里。

### 3. Service Worker 规范（W3C Service Workers）

`fetch` 事件拦截的触发时机、`Cache` API 的基本模型（`caches.open` / `cache.match` / `cache.put`）、SW 的生命周期（install → activate → fetch），以 W3C Service Workers 标准为准。

> 引用规范：正文不出现具体人名/账号名，权威来源见文末参考资料。对应本节的三个规范——HTTP 缓存（RFC 9111）、条件请求（RFC 9110）、Service Worker（W3C），搜索关键词见文末。

---

## 四、实践演示与验证

原理讲透了，最后动手「把缓存看进眼里」。

### 1. DevTools 对比普通刷新 / 强制刷新 / 三种缓存状态

打开一个页面，观察同一批资源在四种操作下的表现：

- **普通刷新（F5）**：强缓存失效、协商缓存有效 → 很多请求显示 304
- **强制刷新（Ctrl+Shift+R）**：强缓存和协商缓存都失效 → 全部请求重新拉取，显示真实 200 和字节数
- **`from disk cache`**：强缓存命中、资源在硬盘（大文件），耗时接近 0
- **`from memory cache`**：强缓存命中、资源在内存（小文件或当前页已用资源），耗时更接近 0
- **`304 Not Modified`**：协商缓存命中，看 Size 列——响应体为空，只有几百字节的响应头

重点看 Size 列和 Time 列，三种状态的差异一眼就能分清「没发请求（强缓存）/发了请求但没传 body（协商缓存）/真实传输」。

### 2. `curl` 手动发起协商缓存请求

用 `curl -I` 查看一个静态资源的缓存响应头：

```bash
curl -I https://example.com/style.css
# 观察响应头里的 Cache-Control、ETag、Last-Modified
```

拿到上次的 `ETag` 后，手动带上 `If-None-Match` 再请求一次，验证协商缓存：

```bash
curl -I -H "If-None-Match: \"<上次的 ETag>\"" https://example.com/style.css
# 服务端返回 HTTP/1.1 304 Not Modified，且没有响应体
```

这一来一回，「协商缓存 = 发请求 + 304 + 无 body」就不再是背的，而是亲眼看到的。

### 3. Application 面板观察 Service Worker 与 Cache Storage

打开一个 PWA 站点，进入 Chrome DevTools 的 **Application** 面板：

- **Service Workers** 子面板：看 SW 的注册状态、作用域、`fetch` 事件的拦截情况
- **Cache Storage** 子面板：看 `caches.open()` 打开的那些缓存命名空间里的条目

对比一下：HTTP 缓存你看不到、也改不了（浏览器黑盒），而 Cache Storage 里的缓存条目是**可读、可删、可用 JS 精确控制的**——这就是「可编程缓存层」相比浏览器内置 HTTP 缓存的本质区别，落在面板上能直观看到。

---

## 五、参考资料

- https://www.rfc-editor.org/rfc/rfc9111 （HTTP Caching 规范）
- https://www.rfc-editor.org/rfc/rfc9110 （条件请求 / 304 语义，第 13 章）
- https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API （Service Worker API）
- https://web.dev/articles/service-worker-caching-and-http-caching （Service Worker 缓存与 HTTP 缓存）

> 推荐搜索关键词：「强缓存 协商缓存 区别」「ETag Last-Modified 优先级」「Cache-Control 指令 详解」「Service Worker 缓存策略」「Stale-While-Revalidate」「内容哈希 缓存 更新」。

---

## 六、扩展章节：浏览器本地存储

主线三块讲完，补一块容易和 HTTP 缓存混在一起的「浏览器本地存储」。它和 HTTP 缓存的本质区别是：**HTTP 缓存是浏览器替你管理的「请求复用」，本地存储是你主动读写数据的「存储」**。

**`cookie`**：过期时间内一直有效，存储大小约 4KB，且限制字段个数，不适合大量数据存储；每次请求都会携带，主要用作身份检查。三个实践要点：

- 设置 cookie 有效期
- 按不同子域划分 cookie，减少传输
- 静态资源域名和 cookie 域名采用不同域名，避免静态资源访问时携带 cookie

**`localStorage`**：Chrome 下最大约 5MB，除非手动清除否则一直存在。可以用它缓存静态资源（笔记里的完整示例）：

```javascript
function cacheFile(url) {
    let fileContent = localStorage.getItem(url);
    if (fileContent) {
        eval(fileContent)
    } else {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onload = function () {
            let reponseText = xhr.responseText
            eval(reponseText);
            localStorage.setItem(url, reponseText)
        }
        xhr.send()
    }
}
cacheFile('/index.js');
```

**`sessionStorage`**：会话级存储，可用于页面间传值，关会话即失效。

**`indexDB`**：浏览器的本地数据库，基本无上限（笔记里的完整示例）：

```javascript
let request = window.indexedDB.open('myDatabase');
request.onsuccess = function(event){
    let db = event.target.result;
    let ts = db.transaction(['student'],'readwrite')
    ts.objectStore('student').add({name:'zf'})
    let r = ts.objectStore('student').get(5);
    r.onsuccess = function(e){
        console.log(e.target.result)
    }
}
request.onupgradeneeded  = function (event) {
    let db = event.target.result;
    if (!db.objectStoreNames.contains('student')) {
        let store = db.createObjectStore('student', { autoIncrement: true });
    }
}
```

一句话收口：**本地存储是「数据存储」，HTTP 缓存是「请求复用」，两者解决的是不同的问题**——一个用来存数据、一个用来避免重复下载资源。

---

## 七、扩展章节：CDN 缓存

CDN（Content Delivery Network，内容分发网络）的「调度」在第 01 篇讲过（DNS 就近调度），这里补它的「缓存」这一半。

**CDN 缓存过程**：没有 CDN 时，资源缓存只有「浏览器缓存」一级；用了 CDN 后，变成「浏览器缓存 + CDN 缓存」两级。用户第一次访问后，静态资源被下载到本地；第二次访问时浏览器先从本地缓存加载；本地缓存过期后，浏览器**不是直接回源站**，而是向 CDN 边缘节点请求；CDN 边缘节点也有缓存，若 CDN 缓存也过期，才由边缘节点向源站发起**回源请求**拉取最新资源。

**CDN 节点缓存机制**：不同服务商的实现不同，但一般都遵循 HTTP 协议，通过响应头 `Cache-Control: max-age` 设置 CDN 节点缓存时间。客户端向 CDN 请求时，CDN 判断缓存是否过期：没过期直接返回，过期则回源拉最新、更新本地缓存再返回。CDN 服务商通常支持按**文件后缀、目录**等维度精细化设置缓存时间。

CDN 缓存时间直接影响**回源率**：缓存时间短 → 数据频繁失效 → 频繁回源 → 源站负载高、访问延迟大；缓存时间长 → 数据更新慢。所以需要针对不同业务选不同的缓存时长。判断是否命中 CDN 缓存，可以看响应头（以腾讯 CDN 为例）：`X-Cache-Lookup: Hit From MemCache` 表示命中 CDN 节点内存、`Hit From Disktank` 表示命中 CDN 节点磁盘、`Hit From Upstream` 表示未命中 CDN：

![CDN 缓存的 X-Cache-Lookup 响应头](https://cdn.nlark.com/yuque/0/2021/png/738210/1637742497263-93506700-c93c-4e73-a5ae-ca4679a6a370.png)

与第 01 篇的分工：**第 01 篇讲 CDN 的「调度」（DNS 就近调度怎么把用户送到最近节点），本篇讲 CDN 的「缓存」（边缘节点怎么命中缓存、何时回源）**——两者合起来才是完整的 CDN。

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 考察频率 |
|--------|-----------|---------|
| 强缓存 | `Cache-Control: max-age`/`Expires` 控制，命中不发请求、状态码 200（from cache） | ⭐⭐⭐ 必考 |
| 协商缓存 | 发请求带 `If-None-Match`/`If-Modified-Since`，命中返回 304（无 body） | ⭐⭐⭐ 必考 |
| `no-cache` vs `no-store` | `no-cache`=缓存但每次协商；`no-store`=完全不缓存 | ⭐⭐⭐ 必考 |
| ETag vs Last-Modified | `ETag` 内容哈希精确、优先；`Last-Modified` 秒级、只反映修改时间 | ⭐⭐⭐ 必考 |
| 内容哈希 | 「内容变则 URL 变」，破解强缓存更新悖论，配合长 `max-age` | ⭐⭐⭐ 必考 |
| Service Worker | 独立线程拦截 `fetch`，缓存策略由 JS 代码决定，是「可编程缓存层」 | ⭐⭐⭐ 必考 |
| 三种 SW 策略 | Cache First 静态 / Network First 实时 / Stale-While-Revalidate 秒开+后台更新 | ⭐⭐ 高频 |

> 💡 记住这条主线：**缓存分「强缓存」和「协商缓存」两段——强缓存用 `max-age`/`Expires` 控制「要不要发请求」，协商缓存用 `ETag`/`Last-Modified` 控制「发了请求传不传 body」；`no-cache` 是「缓存但每次协商」而非「不缓存」；静态资源用内容哈希 + 长 `max-age` 破解更新悖论；而 Service Worker 把这一切从「固定规则」升级成「可编程逻辑」，是 PWA 离线的核心**。把这条线串起来，缓存的所有面试题都能从原理推到答案。

---

## 💡 面试核心问

- **强缓存和协商缓存的本质区别是什么？`no-cache` 是不缓存的意思吗？**（强缓存命中不发请求、状态码 200 from cache；协商缓存命中发请求、返回 304；`no-cache` 是「缓存但每次协商」，不是不缓存，`no-store` 才是不缓存）
- **`ETag` 和 `Last-Modified` 分别有什么局限？为什么 `ETag` 优先级更高？**（`Last-Modified` 秒级精度、只反映修改时间、时间来源不可靠；`ETag` 内容哈希精确；并存时优先验证 `ETag`）
- **静态资源文件名加内容哈希这种做法解决了什么问题？**（破解强缓存更新悖论，内容变则 URL 变，配合长 `max-age` 长期强缓存 + 更新立即生效）
- **Service Worker 相比浏览器内置 HTTP 缓存机制的本质区别是什么？**（HTTP 缓存是固定规则、SW 是可编程缓存层，独立线程拦截 `fetch`，缓存策略由 JS 决定，PWA 离线核心）
- **Cache First、Network First、Stale-While-Revalidate 三种缓存策略分别适合什么场景？**（静态资源 / 实时数据离线兜底 / 秒开 + 后台更新）

---

## 📝 留个问题

`from disk cache`、`from memory cache`、`304 Not Modified` 三种状态，分别对应了「没发请求 / 发了请求但没传 body / 真实传输」里的哪一种？更具体的——为什么同一批图片里，有的命中 memory cache、有的命中 disk cache？

提示：想想 memory cache 和 disk cache 各自的容量、存储时效性，以及资源大小、是否当前页已抓取过这些因素。

欢迎评论区写出你的答案 👇

---

> 🔖 这是「网络原理深度拆解」系列第 08 篇。上一篇：《跨域与安全：CORS 机制/CSRF/XSS/CSP/安全响应头全解（面试收藏级）》；下一篇预告：《RESTful 与 GraphQL：设计原则对比/N+1 问题溯源/DataLoader 思路（面试收藏级）》
