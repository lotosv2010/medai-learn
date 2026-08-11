# 网络资源加载优化：HTTP 缓存 + 图片懒加载 + 预测式导航（面试收藏级）

> 面试官说：「你们项目怎么做资源加载优化的？」——你能说清 HTTP 缓存三件套、图片懒加载两种方案、bfcache 的常见 blocker、Speculation Rules API 是什么吗？这篇按「资源加载生命周期」串成一条主线，每个知识点后附面试怎么答。

---

## 🎯 这篇文章解决什么问题

网络资源加载是前端性能优化里最「宽」的战场，知识点散落在不同层次。很多文章按「知识点分类」组织，读完容易忘，面试时难以系统表达。

这篇文章换一个视角——**按一次资源请求的完整生命周期组织**：

```text
诊断定位 → 连接建立 → 传输优化 → 缓存命中 → 解析渲染 → 资源优化 → 预测下一跳
```

每一章都是「让资源更快到达用户」链路上的一个环节，读完能系统回答「资源加载优化」类面试题，手写 IntersectionObserver 懒加载不卡壳，讲清 HTTP 缓存决策逻辑，知道 bfcache / Cache Partitioning / Speculation Rules 这类面试加分点。

---

## 🔍 加载性能的诊断起点

优化之前先诊断，否则是盲目优化。Chrome DevTools 的两个面板是最直接的起点。

### Network 面板 waterfall 图判读

打开 DevTools → Network，每条请求后面都有一段彩色时间轴，这就是 waterfall（瀑布图）。鼠标悬停可以看到各阶段耗时，从上到下依次是：

- **Queueing（排队）**：请求还没发出去。原因通常是同域名并发连接数已满（HTTP/1.1 最多 6 个）、或者有更高优先级的请求在前面、或者磁盘缓存写入占用
- **Stalled（停滞）**：请求被暂停，与排队类似，等待某个资源释放
- **DNS Lookup**：域名解析耗时，首次访问或缓存过期时出现
- **Initial connection / SSL**：TCP 握手 + TLS 握手，HTTPS 站点会多出 SSL 阶段
- **TTFB（Time To First Byte）**：从请求发出到收到第一个字节的时间，反映服务器处理速度和网络延迟，**是诊断后端慢还是网络慢的关键指标**
- **Content Download**：实际下载响应体的时间，与文件体积正相关

> 💬 **面试官**：waterfall 图里 TTFB 很长，你会怎么排查？
>
> ✅ 标准答案：TTFB 长说明「第一个字节」来得慢，要么是服务器处理慢（数据库查询、接口聚合），要么是物理网络延迟（服务器离用户太远）。先看同一页面其他请求的 TTFB——如果都长，问题在网络/CDN；如果只有某个接口长，问题在后端逻辑
> 🎁 加分答案：补充可以用 `Server-Timing` 响应头把后端各阶段耗时暴露给 DevTools，精确定位是数据库查询慢还是渲染慢

### Coverage 面板找阻塞渲染资源

DevTools → 右上角三点菜单 → More tools → Coverage。刷新页面后，Coverage 面板会列出每个 JS/CSS 文件的**未使用代码比例**，红色部分是加载了但首屏完全没用到的代码。

这是找「可以懒加载」或「可以删掉」的资源的最直接手段。

> 💬 **面试官**：如何定位首屏阻塞渲染的资源？
>
> ✅ 标准答案：Coverage 面板看未使用比例，Network 面板看 Render-Blocking 标记（瀑布图左侧有条红线，在红线前完成的请求就是阻塞渲染的）
> 🎁 加分答案：提到 Lighthouse 的 「Eliminate render-blocking resources」审计项会直接列出阻塞资源和节省时间估算

### Performance 面板与火焰图

Performance 面板是定位运行时性能问题的核心工具，可检测 FPS、CPU 占用、JS 执行耗时和网络请求时间。

使用建议：在浏览器**无痕模式**下打开 Performance 面板，排除插件干扰，环境更干净。

![Performance 面板：概览 / 线程 / 统计四大区域](https://cdn.nlark.com/yuque/0/2023/png/738210/1672732056155-2f29117d-c761-46a2-9235-183252277638.png)

面板信息分四个区域：
- **控制面板**：勾选 Screenshots 可截取每帧画面；开启 Web Vitals 可在时间轴上标注 FCP/LCP/CLS 节点
- **概览面板**：时间轴上观察 FPS 曲线（低于 60FPS 区域是卡顿点）、CPU 开销和网络请求分布
- **线程面板（主线程火焰图）**：每个色块代表一个任务，**长任务（> 50ms）** 是 TTI 劣化的根本原因；横轴是时间，纵轴是调用栈，向下表示被调用
- **统计面板**：Summary 环形图看各类任务占比；Bottom-Up 按耗时排序找最耗时的函数

常见性能指标的计算公式（通过 `window.performance` API 获取）：

```javascript
const t = performance.timing
// DNS 解析耗时
const dns = t.domainLookupEnd - t.domainLookupStart
// TCP 连接耗时
const tcp = t.connectEnd - t.connectStart
// TTFB（网络请求耗时）
const ttfb = t.responseStart - t.requestStart
// 首屏白屏时间
const fcp = t.responseEnd - t.fetchStart
// DOM Ready 时间
const domReady = t.domContentLoadedEventEnd - t.fetchStart
// 页面完全加载时间
const load = t.loadEventStart - t.fetchStart
```

> 💬 **面试官**：如何用 Performance API 计算 TTFB 和白屏时间？
>
> ✅ 标准答案：TTFB = `responseStart - requestStart`；白屏时间 = `responseEnd - fetchStart`，都可通过 `performance.timing` 对象读取
> 🎁 加分答案：`performance.timing` 是旧 API，现代推荐用 `PerformanceObserver` 监听 `navigation` 和 `paint` 类型的 entry，数据更精确且支持 SPA 场景

### Lighthouse 自动化检测

Lighthouse 是 Google 开源的自动化性能检测工具，内置在 Chrome DevTools 中，也可通过 CLI 运行。

它给出五个维度的评分：Performance / Accessibility / Best Practices / SEO / PWA，其中 Performance 分数由以下六个指标加权计算：

| 指标 | 权重 | 含义 |
|------|------|------|
| FCP（First Contentful Paint） | 15% | 首次内容绘制 |
| Speed Index | 15% | 页面视觉填充速度 |
| LCP（Largest Contentful Paint） | 25% | 最大内容绘制 |
| TTI（Time to Interactive） | 15% | 可交互时间 |
| TBT（Total Blocking Time） | 25% | 主线程总阻塞时间 |
| CLS（Cumulative Layout Shift） | 5% | 累计布局偏移 |

![Lighthouse 性能得分与各指标权重](https://cdn.nlark.com/yuque/0/2023/png/738210/1672728045398-862ebafc-da5e-41d3-b079-5bbb71431af7.png)

Lighthouse 的「Opportunities」区域会列出优化建议及预计节省时间，是制定优化优先级的最直接参考。

![Lighthouse 优化建议：移除未使用 JS、压缩资源等](https://cdn.nlark.com/yuque/0/2023/png/738210/1672729529144-5664f48f-fc0d-4954-88be-4ae102447e29.png)

> 💬 **面试官**：Lighthouse 的 TBT 指标是什么，如何优化？
>
> ✅ 标准答案：TBT 是主线程所有长任务（超过 50ms 的任务）超出部分的总和，反映页面响应用户输入的能力。优化方向：拆分长任务（用 `setTimeout` 分片）、减少第三方脚本、使用 Web Worker 转移计算
> 🎁 加分答案：TBT 权重 25%，是 Lighthouse Performance 分数里影响最大的指标之一；与 TTI 关联密切——TBT 低通常意味着 TTI 也更好

---


## 🌐 DNS 与连接优化

### dns-prefetch vs preconnect：何时用哪个

页面请求跨域资源时，浏览器要先做 DNS 解析，再建立 TCP 连接，HTTPS 还要 TLS 握手。这些步骤串行执行，每步都需要一个网络往返（RTT）。

Resource Hints 可以让这些步骤提前进行：

**`dns-prefetch`**：只提前做 DNS 解析（约 20-120ms），不建立连接。开销极低，可以多用。

```html
<!-- 提前解析第三方域名的 DNS -->
<link rel="dns-prefetch" href="//fonts.googleapis.com">
<link rel="dns-prefetch" href="//cdn.example.com">
```

**`preconnect`**：提前完成 DNS + TCP + TLS 全部握手。开销更高（占用连接资源），只对**确定会用到、且延迟敏感**的域使用。

```html
<!-- 关键字体服务，确定会用，提前完成握手 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

决策规则：**关键资源的来源域用 `preconnect`，其余跨域用 `dns-prefetch`**。`preconnect` 建议不超过 4-6 个，否则占用浏览器连接池资源反而拖慢其他请求。

### 域名数量 vs HTTP/2 多路复用的权衡

HTTP/1.1 时代，浏览器对同一域名最多 6 个并发连接，工程师用「域名分片」（把静态资源分散到多个子域）来绕过这个限制。

**HTTP/2 彻底改变了这个局面**：多路复用让一个连接可以并发传输多个请求，域名分片反而变成了负担——每个新域名都要额外的 DNS + TCP + TLS 开销。

| 协议 | 建议策略 |
|------|----------|
| HTTP/1.1 | 2-4 个域名分片，充分利用并发 |
| HTTP/2 | 合并到尽可能少的域名，减少连接建立开销 |

> 💬 **面试官**：HTTP/2 的多路复用解决了什么问题？
>
> ✅ 标准答案：解决了 HTTP/1.1 的队头阻塞——同一 TCP 连接里请求必须按顺序响应。HTTP/2 把传输单位从「报文」改为「帧」，多个请求的帧可以交错传输，一个连接并发处理所有请求
> 🎁 加分答案：HTTP/2 的多路复用是在 TCP 层解决了 HTTP 队头阻塞，但 TCP 本身还有队头阻塞（丢包时整个连接暂停）；HTTP/3 用 QUIC（基于 UDP）彻底解决了这个问题，每个流独立重传

---


## 📡 CDN 与传输优化

### CDN：首次请求的加速器

前面所有缓存手段都有一个前提：资源已经被请求过一次。**对于真正的首次请求**，让资源离用户更近才是根本手段——这就是 CDN（内容分发网络）的核心价值。

CDN 在全球各地部署边缘节点，静态资源就近返回，物理距离从千公里缩短到几十公里，RTT 从 100ms 降到 5ms。工作流程：

![CDN 工作流程：DNS 解析 → 负载均衡器分配边缘节点 → 就近返回资源](https://cdn.nlark.com/yuque/0/2023/png/738210/1672885671370-a2e66ce9-81d3-4424-ba67-9f24387d2afd.png)

**CDN 的两个核心操作**：
- **缓存**：把静态资源复制到边缘节点
- **回源**：边缘节点没有或缓存过期时，回到源站拉取

CDN 适合静态资源（JS/CSS/图片/字体），不适合需要服务端计算的动态页面。

### CDN 域名与主站域名分离

大型站点把 CDN 资源放在独立域名（如 `img.example.com`、`static.example.com`），而非主站域名，有两个原因：

**① 避免 Cookie 污染**：同域名的所有请求都会携带完整 Cookie。静态资源请求带 Cookie 是纯粹的带宽浪费——一张图片不需要登录态。独立域名天然隔离，Cookie 不会跟随。

**② 绕过并发限制**：HTTP/1.1 下浏览器对同域名最多 6 个并发连接。用多个子域名（`img1.example.com`、`img2.example.com`）可以提升并发数，但需注意缓存命中是按完整 URL 匹配的，相同资源用不同域名会导致缓存无法复用。

🔧 **真实场景**：药品详情页要同时加载主图、说明书 PDF 预览图、相似药品缩略图共 20 张。把图片域名从主站分离到独立 CDN 域名，既消除了 Cookie 开销，也避免了图片请求阻塞主站 API 的并发槽位。

### Gzip / Brotli：文本资源压缩传输

HTTP 在传输前对文本资源（HTML/CSS/JS）进行压缩，通过协议协商自动完成：

```http
# 浏览器声明支持的压缩算法
Accept-Encoding: br, gzip, deflate

# 服务器选择算法并告知
Content-Encoding: br
```

| 算法 | 压缩比 | 速度 | 适用场景 |
|------|--------|------|----------|
| Gzip | 通用 | 快 | 动态内容实时压缩 |
| Brotli | 比 Gzip 高 15-25% | 压缩慢、解压快 | 静态资源预压缩 |
| Zopfli | 比 Gzip 高 3-8% | 很慢 | 离线预压缩 |

Brotli 是现代浏览器首选（`br`）。静态资源在构建时预先生成 `.br` 文件，CDN 直接返回，不占服务器 CPU。

Node.js 服务端实现动态 Gzip 压缩（判断客户端支持的压缩算法，选择对应流）：

```javascript
const http = require('http')
const fs = require('fs')
const zlib = require('zlib')
const mime = require('mime')

http.createServer(async (req, res) => {
  const filePath = './public' + req.url
  const acceptEncoding = req.headers['accept-encoding'] || ''
  res.setHeader('Content-Type', mime.getType(req.url))
  if (acceptEncoding.match(/\bbr\b/)) {
    res.setHeader('Content-Encoding', 'br')
    fs.createReadStream(filePath).pipe(zlib.createBrotliCompress()).pipe(res)
  } else if (acceptEncoding.match(/\bgzip\b/)) {
    res.setHeader('Content-Encoding', 'gzip')
    fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(res)
  } else {
    fs.createReadStream(filePath).pipe(res)
  }
}).listen(8989)
```

> 💬 **面试官**：Gzip 和 Brotli 的区别是什么，生产环境怎么选？
>
> ✅ 标准答案：Brotli 压缩率比 Gzip 高 15-25%，但压缩速度慢；静态资源在构建时预先用 Brotli 压缩生成 `.br` 文件，CDN 直接返回，不占运行时 CPU；动态内容（SSR 响应）因为需要实时压缩，仍优先选速度更快的 Gzip
> 🎁 加分答案：服务端根据 `Accept-Encoding` 请求头选择算法，优先级 `br > gzip > deflate`；Nginx 的 `brotli_static on` 指令可以直接返回预压缩的 `.br` 文件，零运行时开销

### 减少重定向

每次 HTTP 重定向都要额外的 DNS 查询 + TCP 握手 + HTTP 往返，代价高昂。

```text
用户访问 http://example.com
→ 301 重定向到 https://example.com     （HTTP → HTTPS）
→ 302 重定向到 https://www.example.com （裸域 → www）
```

两次重定向增加了 2 个 RTT。**最佳重定向次数是 0**。

实践：确保落地页 URL 就是最终 URL；HSTS（HTTP Strict Transport Security）可以让浏览器在本地直接升级 HTTPS，省掉第一次重定向。

### 浏览器缓存优先级

多种缓存机制并存时，浏览器按以下优先级从高到低命中：

```text
内存缓存（Memory Cache）
   ↓ 未命中
Service Worker 缓存
   ↓ 未命中
HTTP 缓存（强缓存 / 协商缓存）
   ↓ 未命中
HTTP/2 Push 缓存
   ↓ 未命中
发起真实网络请求
```

![Service Worker 缓存层级：Memory Cache → SW Cache → HTTP Cache → Push Cache → 网络请求](https://cdn.nlark.com/yuque/0/2023/png/738210/1672886372031-7b9da1d0-eceb-4a67-af0c-c65829551533.png)

内存缓存（Memory Cache）驻留在渲染进程中，关闭 Tab 即清除，但命中速度最快（0ms）。体积小的 JS/CSS 有一定概率进入内存缓存，大图通常落在磁盘缓存。

> 💬 **面试官**：浏览器有哪几种缓存，优先级如何？
>
> ✅ 标准答案：从高到低是内存缓存、Service Worker 缓存、HTTP 缓存（强缓存/协商缓存）、HTTP/2 Push 缓存，前一级命中就不走后面
> 🎁 加分答案：内存缓存关 Tab 即失效；SW 缓存由开发者用 JS 管理，优先级高于 HTTP 缓存；Push 缓存依赖 HTTP/2 连接，连接断开即失效，且只能被同一连接的页面共享

### HTTP 缓存分区（Cache Partitioning）

这是一个「经典优化建议已经失效」的重要变化，很多文章还在传播过时的信息。

**Chrome 86+ 对 HTTP 缓存按双键分区**：缓存 key 从单纯的资源 URL，变为 `(顶层页面域名, frame 域名, 资源 URL)` 三元组。

实际影响：A 站加载过 `cdn.example.com/react.js`，用户访问 B 站时再请求同一个 URL——**不会命中 A 站的缓存，必须重新下载**。

```text
❌ 旧认知：把 React/jQuery 放公共 CDN，用户访问过其他网站就命中缓存，零下载
✅ 现实：Cache Partitioning 后，跨站缓存复用完全失效，公共 CDN 的「共享缓存」优势不再存在
```

这个变化的动机是**安全**：跨站缓存可被用于侧信道攻击（探测用户是否访问过某个网站）。Safari、Firefox 更早采用了类似隔离策略。

**对前端优化策略的影响**：
- 「用 jsDelivr/unpkg 等公共 CDN 利用浏览器缓存」的理由已站不住脚
- 自建 CDN 或把资源托管在自己域名下，缓存命中逻辑更可控
- Service Worker 缓存不受分区影响，离线优先策略的优势进一步凸显

> 💬 **面试官**：为什么现在不推荐把公共库放第三方公共 CDN？
>
> ✅ 标准答案：Chrome 86+ 引入 HTTP 缓存分区，跨站资源不再共享缓存，公共 CDN 的「共享缓存」优势消失；加上引入外部依赖的供应链安全风险，应优先使用自建 CDN
> 🎁 加分答案：缓存分区同时影响 `dns-prefetch` 缓存、字体缓存等，所有跨站复用缓存的假设在现代浏览器里都不再成立

---


## 🗄️ HTTP 缓存三件套

HTTP 缓存是加载优化里收益最高的手段——命中缓存意味着零网络请求。理解它需要搞清楚三个层次。

### 强缓存：Cache-Control max-age 与 immutable

浏览器请求资源时，**先查本地缓存**。如果缓存未过期，直接用，完全不发网络请求（状态码 200，来源显示 `from disk cache` 或 `from memory cache`）。

控制强缓存的核心响应头是 `Cache-Control`：

```http
# 缓存 1 年，适合带 hash 的静态资源
Cache-Control: max-age=31536000, immutable

# 不缓存，每次都要重新验证
Cache-Control: no-cache

# 完全禁止缓存
Cache-Control: no-store
```

`immutable` 是一个重要但容易被忽视的指令：告诉浏览器**即使用户手动刷新，也不要重新验证这个资源**。对于文件名带内容 hash（如 `app.a1b2c3.js`）的资源，内容永远不变，加 `immutable` 可以省掉刷新时的协商缓存请求。

`Cache-Control` 优先级高于老式的 `Expires` 头——两者同时存在时，`Cache-Control` 生效。

### 协商缓存：ETag vs Last-Modified 哪个更可靠

强缓存过期后，浏览器**带着验证信息**发请求，问服务器「我的缓存还有效吗？」。服务器检查后回 304（继续用缓存）或 200（给新内容）。

两种验证机制：

**`Last-Modified` / `If-Modified-Since`**：服务器返回文件最后修改时间，浏览器下次请求带上这个时间问「比这个时间新吗？」

```http
# 响应头
Last-Modified: Wed, 21 Oct 2025 07:28:00 GMT

# 下次请求头
If-Modified-Since: Wed, 21 Oct 2025 07:28:00 GMT
```

**`ETag` / `If-None-Match`**：服务器返回文件内容的指纹（hash），浏览器下次请求带上这个指纹问「内容变了吗？」

```http
# 响应头
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"

# 下次请求头
If-None-Match: "33a64df551425fcc55e4d42a148795d9f25f89d4"
```

**ETag 更可靠**，原因有三：精度到毫秒以下（Last-Modified 只到秒级，1 秒内多次修改无法感知）；文件内容没变但时间戳变了（如重新部署）不会导致无效的缓存失效；服务器可以自定义 ETag 算法应对特殊场景。

> 💬 **面试官**：ETag 和 Last-Modified 都能做协商缓存，为什么推荐 ETag？
>
> ✅ 标准答案：Last-Modified 精度只到秒，1 秒内多次修改无法区分；ETag 基于内容 hash，内容不变则 ETag 不变，不会产生错误的缓存失效
> 🎁 加分答案：两者同时存在时，ETag 优先级更高；ETag 还分强验证（`"abc"`）和弱验证（`W/"abc"`），弱验证允许语义等价的内容（如压缩格式不同）共用缓存

### stale-while-revalidate：后台刷新的用户无感升级

强缓存过期时，用户必须等服务器响应才能看到内容。`stale-while-revalidate` 解决了这个体验问题：

```http
Cache-Control: max-age=60, stale-while-revalidate=86400
```

含义：缓存 60 秒内直接用（强缓存）；60 秒到 86400 秒之间，**先返回旧缓存给用户（零延迟），同时后台发请求刷新缓存**；86400 秒后才真正需要等待。

用户感知是：每次都秒开，偶尔看到的是上一版本内容（通常可以接受）。这是 API 响应、新闻列表等「略微过时可以接受」场景的最优策略。

### 缓存策略决策矩阵

不同资源应该用不同缓存策略：

| 资源类型 | 推荐策略 | 原因 |
|----------|----------|------|
| HTML 页面 | `no-cache` | 每次都要协商，确保拿到最新入口 |
| 带 hash 的 JS/CSS | `max-age=31536000, immutable` | hash 变则 URL 变，永久缓存安全 |
| 图片/字体（有版本） | `max-age=31536000` | 静态资源长期不变 |
| API 响应 | `max-age=60, stale-while-revalidate=300` | 短期缓存 + 后台刷新 |
| 用户敏感数据 | `no-store` | 禁止任何缓存 |

> 💬 **面试官**：HTML 文件为什么要用 no-cache 而不是 no-store？
>
> ✅ 标准答案：`no-cache` 不是「不缓存」，是「每次都要协商验证」——如果内容没变，服务器返回 304，浏览器用本地缓存，节省下载开销。`no-store` 才是完全不缓存，每次都要完整下载
> 🎁 加分答案：HTML 是应用入口，用 `no-cache` 保证更新时用户能拿到最新入口文件，而 JS/CSS 因为有内容 hash 所以可以永久强缓存——这是「immutable deployment」模式的核心思路

### 缓存存储位置

浏览器缓存按存储位置分四级，按优先级从高到低命中：

![缓存位置分级：Service Worker → Memory Cache → Disk Cache → Push Cache](https://cdn.nlark.com/yuque/0/2021/png/738210/1637734895327-ca519826-c26a-45ac-9e71-d7d3ba4be005.png)

- **Service Worker**：运行在独立线程，可编程缓存，必须 HTTPS
- **Memory Cache（内存缓存）**：读取速度最快，关闭 Tab 即清除；体积较小的 JS/CSS 有机会进入内存缓存
- **Disk Cache（硬盘缓存）**：容量大、持久，绝大多数 HTTP 缓存落在这里
- **Push Cache**：HTTP/2 专属，会话级别，连接断开即失效

`preload` / `prefetch` 预加载的资源也存储在 HTTP Cache，如果资源可缓存就进 Disk Cache，不可缓存就暂存 Memory Cache。

![Memory Cache 与 Disk Cache 命中效果对比](https://cdn.nlark.com/yuque/0/2021/png/738210/1637742367409-a7ca55b9-d1a4-40dd-b6ea-8ecce9c35651.png)

### 用户操作对缓存的影响

不同的用户操作，会触发不同的缓存行为：

![用户行为对缓存的影响：地址栏回车/普通刷新/强制刷新三种场景](https://cdn.nlark.com/yuque/0/2021/png/738210/1637735122936-936ab77a-b349-474f-bb64-75a76d4c1005.png)

| 用户操作 | 强缓存（Cache-Control/Expires） | 协商缓存（ETag/Last-Modified） |
|----------|--------------------------------|-------------------------------|
| 地址栏回车 | 有效 | 有效 |
| 页面链接跳转 | 有效 | 有效 |
| 新开窗口 | 有效 | 有效 |
| 前进、后退 | 有效 | 有效 |
| F5 刷新 | **无效** | 有效 |
| Ctrl+F5 强制刷新 | **无效** | **无效** |

F5 刷新会跳过强缓存但仍走协商缓存，所以会发请求但可能返回 304；Ctrl+F5 完全绕过所有缓存，每次都重新下载。

### HTTP 缓存完整流程

从浏览器发起请求到拿到资源，完整的缓存决策链路如下：

![HTTP 缓存完整决策流程：强缓存 → 协商缓存 → 发起请求](https://cdn.nlark.com/yuque/0/2021/png/738210/1637745490701-c39c0941-1b60-4b5f-a7b3-922ea5c92c2a.png)

### 浏览器本地存储

HTTP 缓存之外，前端还有多种本地存储方案，各有适用场景：

| 方案 | 容量 | 生命周期 | 适用场景 |
|------|------|----------|----------|
| Cookie | 4KB | 可设过期时间 | 身份凭证，随请求自动携带 |
| localStorage | 5MB | 永久（手动清除） | 静态配置、用户偏好 |
| sessionStorage | 5MB | 会话级别（Tab 关闭清除） | 页面间临时传值 |
| IndexedDB | 无上限 | 永久 | 大量结构化数据、离线数据库 |

性能注意点：**静态资源域名与 Cookie 域名分离**，避免图片/JS 请求携带 Cookie 浪费带宽。`localStorage` 可用于缓存不常变更的 JS/CSS 文件（在运营商劫持场景下比 HTTP 缓存更可靠），但要注意版本控制。

### 定义最优缓存策略

制定缓存策略的核心原则：

- **使用一致的网址**：相同内容的不同 URL 会多次下载缓存，注意 URL 区分大小写
- **区分可共享与不可共享资源**：`public` 允许 CDN 缓存，`private` 仅浏览器缓存（用户敏感数据）
- **内容 hash + 长缓存**：文件名内嵌内容 hash（如 `app.a1b2c3.js`），配合 `max-age=31536000, immutable`，更新时 URL 变化自然绕过缓存
- **HTML 短缓存**：页面入口文件用 `no-cache`，确保用户能及时拿到新版 HTML（内含新的 hash 文件名）
- **ETag 对齐**：分布式部署时同一文件在不同服务器的 ETag 要保持一致，否则会产生不必要的 304 请求

---


## 🔧 Service Worker 离线缓存

HTTP 缓存由浏览器和服务器协商控制，而 Service Worker 让你用 JavaScript 完全接管缓存逻辑，实现离线可用、自定义缓存策略等能力。

### 生命周期：install / activate / fetch 三阶段

Service Worker 是一个运行在独立线程的脚本，无法访问 DOM，但可以拦截所有网络请求。

```javascript
// 注册（在主线程执行）
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}
```

注册后经历三个生命周期阶段：

**install（安装）**：SW 首次安装时触发，通常在这里预缓存关键资源：

```javascript
const CACHE_NAME = 'v1'
const PRECACHE_URLS = ['/index.html', '/app.css', '/app.js']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting() // 👈 跳过等待，立即激活
})
```

**activate（激活）**：新 SW 替换旧 SW 时触发，通常在这里清理旧缓存：

```javascript
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim() // 👈 立即接管所有页面
})
```

**fetch（请求拦截）**：页面发出任何网络请求都会经过这里，是实现缓存策略的核心：

```javascript
self.addEventListener('fetch', event => {
  event.respondWith(/* 缓存策略逻辑 */)
})
```

### 三种缓存策略代码实现

**Cache First（缓存优先）**：适合静态资源。先查缓存，命中直接返回；未命中才请求网络并写入缓存。

```javascript
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached // 👈 缓存命中，直接返回
      return fetch(event.request).then(response => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone))
        return response
      })
    })
  )
})
```

**Network First（网络优先）**：适合 API 数据。优先请求网络，失败时降级到缓存。

```javascript
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone))
        return response
      })
      .catch(() => caches.match(event.request)) // 👈 网络失败时用缓存兜底
  )
})
```

**Stale While Revalidate（先返回缓存，后台更新）**：适合频繁更新但短暂过时可接受的内容。

```javascript
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        const networkFetch = fetch(event.request).then(response => {
          cache.put(event.request, response.clone()) // 👈 后台更新缓存
          return response
        })
        return cached || networkFetch // 👈 有缓存就先返回，同时后台刷新
      })
    )
  )
})
```

### Workbox 快速接入 vs 手写的取舍

手写 Service Worker 逻辑繁琐且容易出 bug（缓存更新、版本管理、边界情况处理）。Google 的 Workbox 封装了上述策略：

```javascript
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'

// 静态资源用 Cache First
registerRoute(({ request }) => request.destination === 'image', new CacheFirst())

// API 用 Network First
registerRoute(({ url }) => url.pathname.startsWith('/api/'), new NetworkFirst())
```

**取舍原则**：生产项目用 Workbox（Vite/Next.js 均有插件），只有需要精细控制缓存逻辑时才手写。学习阶段手写一遍有助于理解底层机制。

> 💬 **面试官**：Service Worker 和 HTTP 缓存有什么区别？
>
> ✅ 标准答案：HTTP 缓存由浏览器和服务器的响应头协商控制，逻辑固定；Service Worker 是可编程的网络代理，可以用 JS 实现任意缓存策略、离线访问、后台同步等能力
> 🎁 加分答案：Service Worker 的缓存优先级高于 HTTP 缓存——请求先经过 SW 拦截，SW 返回缓存后就不再走 HTTP 缓存层；SW 在 HTTPS 或 localhost 下才能注册

---


## ⚡ Script 加载策略

Script 标签是最常见的渲染阻塞源。三个属性决定了脚本的加载和执行时机。

### defer vs async vs type="module" 执行时机

浏览器解析 HTML 时遇到普通 `<script>` 标签，会**立即停止 HTML 解析，下载并执行脚本，然后才继续解析**。这就是「渲染阻塞」的根源。

三种非阻塞方式的对比：

| 属性 | 下载时机 | 执行时机 | 执行顺序 | 适用场景 |
|------|----------|----------|----------|----------|
| 无（默认） | 阻塞解析时下载 | 立即执行 | 按顺序 | 尽量避免 |
| `async` | 并行下载 | 下载完立即执行 | **不保证顺序** | 独立脚本（统计、广告） |
| `defer` | 并行下载 | HTML 解析完后、DOMContentLoaded 前执行 | 按顺序 | 绝大多数业务脚本 |
| `type="module"` | 并行下载 | 同 defer | 按顺序 | ES Module 脚本 |

```html
<!-- 推荐：非关键脚本统一 defer -->
<script defer src="app.js"></script>
<script defer src="analytics.js"></script>

<!-- 独立无依赖的脚本可用 async -->
<script async src="third-party-widget.js"></script>
```

### 经典陷阱：async 脚本的执行顺序不可预期

`async` 脚本谁先下载完谁先执行。如果 `analytics.js` 依赖 `utils.js` 中的函数，用 `async` 就可能在 `utils.js` 还没执行时就跑 `analytics.js`，导致报错。

```html
<!-- ❌ 危险：谁先下完谁先跑，顺序不保证 -->
<script async src="utils.js"></script>
<script async src="analytics.js"></script>

<!-- ✅ 正确：defer 保证按顺序执行 -->
<script defer src="utils.js"></script>
<script defer src="analytics.js"></script>
```

> 💬 **面试官**：defer 和 async 的区别？
>
> ✅ 标准答案：两者都不阻塞 HTML 解析，并行下载。区别在执行时机：async 下载完立即执行，不保证顺序；defer 等 HTML 解析完再执行，保证顺序。多个有依赖关系的脚本必须用 defer
> 🎁 加分答案：`type="module"` 默认就是 defer 行为，且模块脚本只执行一次（即使多次引入）；内联 `<script type="module">` 也是 defer 执行

🔧 **真实场景**：在医疗平台的药品详情页，埋点统计脚本（`tracker.js`）和核心业务脚本（`detail.js`）同时存在。把 `tracker.js` 改为 `async`、`detail.js` 改为 `defer`，首屏 FCP 提升约 200ms——埋点脚本不再阻塞页面渲染。

### 浏览器预加载扫描器（Preload Scanner）

理解 defer/async 为什么放在 `<head>` 比放在 `</body>` 前更优，需要了解预加载扫描器的工作原理。

浏览器内部有**两个并行线程**：

- **主解析器**：逐行解析 HTML，构建 DOM。遇到普通 `<script>` 会暂停，等脚本下载并执行完才继续
- **预加载扫描器（Preload Scanner）**：在主解析器被阻塞时，独立扫描后续 HTML，**提前发现并发起**图片、脚本、样式等资源的下载请求

```html
<head>
  <!-- 主解析器遇到这个 script 被阻塞 -->
  <script src="blocking.js"></script>

  <!-- 预加载扫描器在主解析器被阻塞期间扫描到这些，提前开始下载 -->
  <link rel="stylesheet" href="main.css">
  <script defer src="app.js"></script>
  <img src="hero.jpg">
</head>
```

这就是为什么 `<link rel="preload">` 和 `defer` 脚本要放在 `<head>` 里——预加载扫描器越早发现它们，就能越早并行下载，不受主解析器阻塞的影响。

预加载扫描器**无法发现的资源**：CSS 背景图（`background-image`）、JS 动态插入的标签、`@import` 引入的子样式表——这些都需要等主线程执行到对应代码才能发起请求，是「隐藏的加载延迟」来源。

> 💬 **面试官**：为什么把 `<link rel="preload">` 放在 `<head>` 里效果更好？
>
> ✅ 标准答案：浏览器有预加载扫描器，在主解析器被阻塞时提前扫描 HTML 发现资源。放在 `<head>` 能让预加载扫描器尽早发现并并行下载，而不是等主解析器执行到该行才发请求
> 🎁 加分答案：CSS `background-image`、JS 动态插入的标签对预加载扫描器不可见，这类资源必须用 `<link rel="preload">` 显式声明才能提前加载

---


## 🎨 关键渲染路径（CRP）优化

### CSS 阻塞渲染的根本原因

浏览器在构建 Render Tree 之前必须同时拥有 DOM 和 CSSOM。CSS 文件还没加载完，CSSOM 就不完整，Render Tree 无法构建，页面不会渲染任何内容——这就是 CSS 阻塞渲染的根本原因。

注意：CSS 不阻塞 DOM 解析，但**阻塞渲染**。JavaScript 既阻塞 DOM 解析又阻塞渲染（因为 JS 可能修改样式）。

### Critical CSS 内联

「关键 CSS」是指渲染首屏内容所需的最小 CSS 集合。把它内联到 `<head>` 里，首屏渲染不需要等待外部 CSS 文件：

```html
<head>
  <!-- 关键 CSS 内联，首屏渲染不等外部文件 -->
  <style>
    body { margin: 0; font-family: sans-serif; }
    .header { height: 60px; background: #fff; }
    .hero { padding: 40px 20px; }
  </style>

  <!-- 非关键 CSS 异步加载 -->
  <link rel="preload" href="full.css" as="style" onload="this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="full.css"></noscript>
</head>
```

`rel="preload"` + `onload="this.rel='stylesheet'"` 是异步加载 CSS 的经典技巧：`preload` 以高优先级下载文件但不应用样式，`onload` 触发时改为 `stylesheet` 才真正应用。`<noscript>` 是禁用 JS 时的兜底。

工具推荐：`critical`（npm 包）可以自动提取首屏 Critical CSS。Next.js、Astro 等框架默认已内置类似优化。

### 异步 CSS 加载技巧

避免在 CSS 中使用 `@import`——它会把两个 CSS 资源变成串行下载：

```css
/* ❌ @import 导致串行下载：先下 main.css，再下 theme.css */
@import url('theme.css');

/* ✅ 用多个 <link> 标签并行下载 */
```

```html
<link rel="stylesheet" href="main.css">
<link rel="stylesheet" href="theme.css">
```

对于首屏不需要的 CSS（如弹窗、详情页样式），可以用 `media` 属性降低优先级：

```html
<!-- 打印样式，不阻塞渲染 -->
<link rel="stylesheet" href="print.css" media="print">

<!-- 宽屏样式，窄屏时不阻塞 -->
<link rel="stylesheet" href="wide.css" media="(min-width: 1024px)">
```

> 💬 **面试官**：为什么 CSS 要放在 `<head>` 而 JS 要放在 `</body>` 前？
>
> ✅ 标准答案：CSS 放 `<head>` 是因为浏览器需要尽早构建 CSSOM，避免 FOUC（无样式内容闪现）；JS 放 `</body>` 前是因为默认 script 会阻塞 HTML 解析，放最后可以让页面内容先渲染出来。现代推荐用 `defer` 替代「放 body 底部」，效果更好
> 🎁 加分答案：CSS 还会阻塞其后的 JS 执行——浏览器遇到 `<script>` 时如果 CSSOM 还没构建完，会先等 CSSOM 完成，因为 JS 可能查询样式。所以 JS 放在 CSS 前面反而更快（如果 JS 不依赖样式）

---


## 🖼️ 图片优化完整专题

图片通常占页面总体积的 50-70%，是加载优化收益最大的方向之一。

### 格式决策树

选择图片格式的核心依据是内容类型和透明度需求：

| 格式 | 适用场景 | 特点 |
|------|----------|------|
| JPEG | 照片、复杂色彩 | 有损压缩，不支持透明 |
| PNG | 需要透明通道的图标、截图 | 无损，体积大 |
| WebP | 替代 JPEG/PNG | 比 JPEG 小 25-34%，支持透明和动画 |
| AVIF | 高质量照片、大图 | 比 WebP 还小 20-50%，兼容性还在提升 |
| SVG | 图标、插图、可缩放图形 | 矢量，无损，可用 CSS 控制 |
| GIF | 简单动画 | 应优先用视频（MP4/WebM）替代 |

决策优先级：**能用 SVG 用 SVG → 能用 WebP/AVIF 用 WebP/AVIF → JPEG（照片）/ PNG（透明）兜底**。

### 响应式图片：srcset + sizes

同一张图片在手机屏幕上不需要加载桌面版的 2000px 大图。`srcset` 和 `sizes` 让浏览器根据设备自动选择合适尺寸：

```html
<img
  src="drug-detail-800.jpg"
  srcset="
    drug-detail-400.jpg  400w,
    drug-detail-800.jpg  800w,
    drug-detail-1600.jpg 1600w
  "
  sizes="
    (max-width: 600px) 100vw,
    (max-width: 1200px) 50vw,
    800px
  "
  alt="药品详情图"
/>
```

`srcset` 列出各尺寸图片及其宽度描述符（`w`），`sizes` 告诉浏览器图片在不同视口宽度下的显示尺寸，浏览器结合设备像素比（DPR）自动选最合适的那张。

### loading="lazy" vs IntersectionObserver 手写

**原生懒加载**（现代浏览器均支持）：

```html
<!-- 首屏图片不加 lazy，LCP 图片加 fetchpriority -->
<img src="hero.jpg" fetchpriority="high" alt="首屏主图" />

<!-- 非首屏图片加 lazy -->
<img src="drug-detail.jpg" loading="lazy" alt="药品详情" />
```

原生 `loading="lazy"` 由浏览器决定加载时机，通常在图片进入视口前约 1200px 时开始加载（具体阈值与网络速度有关）。

**IntersectionObserver 手写**（需要自定义触发距离或兼容旧浏览器时使用）：

```javascript
const lazyImages = document.querySelectorAll('img[data-src]')

const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return
      const img = entry.target
      img.src = img.dataset.src          // 👈 将 data-src 赋值给 src
      img.removeAttribute('data-src')
      observer.unobserve(img)            // 👈 加载后取消观察
    })
  },
  { rootMargin: '200px 0px' }           // 👈 提前 200px 开始加载
)

lazyImages.forEach(img => observer.observe(img))
```

`rootMargin: '200px 0px'` 让图片在进入视口前 200px 就开始加载，避免用户滚动时看到白框。HTML 侧对应写法：

```html
<img data-src="drug-list.jpg" src="placeholder.jpg" alt="药品列表图" />
```

### width / height 属性与 CLS

防止布局偏移（CLS）最简单的方法不是占位图，而是给 `<img>` 设置显式的 `width` 和 `height` 属性：

```html
<!-- ✅ 浏览器提前预留空间，图片加载前不会回流 -->
<img src="drug-detail.jpg" width="800" height="600" alt="药品详情" loading="lazy" />
```

浏览器拿到这两个属性后，即使图片还没下载，也能根据宽高比预留正确的空间，完全避免图片加载完成后的布局跳动。这是 Core Web Vitals CLS 优化里最低成本的手段，在 LQIP 方案之前应优先考虑。

CSS 中用 `aspect-ratio` 可以实现相同效果，适用于响应式布局下宽度不固定的图片：

```css
/* 16:9 比例的图片容器，宽度自适应 */
.drug-image {
  aspect-ratio: 4 / 3;
  width: 100%;
  object-fit: cover;
}
```

### decoding="async" 与 Image.decode()

大图赋值 `src` 后，浏览器在主线程解码时会短暂阻塞渲染。有两种方式让解码异步化：

**HTML 属性方式**（推荐，简单无侵入）：

```html
<img src="large-drug-photo.jpg" decoding="async" alt="药品高清图" />
```

`decoding="async"` 告诉浏览器可以在主线程空闲时解码，不阻塞其他渲染工作。适合所有非 LCP 的大图。

**JS 方式**（需要在图片插入 DOM 前解码完毕时使用）：

```javascript
const img = new Image()
img.src = 'large-drug-photo.jpg'
img.decode().then(() => {
  container.appendChild(img) // 👈 解码完再插入，避免主线程阻塞
})
```

两者区别：`decoding="async"` 不保证插入 DOM 时解码已完成，只是异步进行；`Image.decode()` 返回 Promise，可以精确控制「解码完成后再呈现」。LCP 图片不要用这两者——LCP 图片需要尽快解码并显示。

### fetchpriority="high" 给 LCP 图片提权

LCP（最大内容绘制）图片通常是首屏最大的元素。浏览器默认给图片分配 Low 或 High 优先级，但判断不一定准确。`fetchpriority="high"` 显式告诉浏览器「这张图很重要，优先下载」：

```html
<!-- LCP 图片：不懒加载 + 提高优先级 -->
<img
  src="hero-banner.jpg"
  fetchpriority="high"
  loading="eager"
  alt="首屏 Banner"
/>
```

反过来，首屏不可见的图片可以用 `fetchpriority="low"` 降低优先级，为关键资源让路。

### 懒加载注意事项：四个容易踩的坑

**① 资源占位符**：未加载的图片位置应使用相同尺寸的占位符（纯色块、Base64 模糊图、LQIP 低质量缩略图），否则图片加载后会触发回流，产生 CLS 布局偏移。

![原图 vs LQIP vs SQIP 占位效果对比](https://cdn.nlark.com/yuque/0/2023/png/738210/1673228872693-85c0d125-0f87-40fb-bc12-d3fa26939fb5.png)

LQIP（低质量图片占位）和 SQIP（基于 SVG 的 LQIP）都能以极小带宽告知用户此处有图，是 LCP 图片的常见优化搭档。

**② 加载失败兜底**：网络抖动或资源 URL 变更可能导致懒加载失败。在 `onerror` 里替换为占位图或显示重试按钮，比让用户对着空框发呆好得多。

```javascript
const img = new Image()
img.src = 'drug-photo.jpg'
img.onerror = () => {
  img.src = 'placeholder.jpg'   // 加载失败时回退到占位图
}
img.onload = () => {
  document.getElementById('container').appendChild(img)
}
```

**③ 图像解码延迟**：大图赋值 `src` 后浏览器在主线程解码会短暂卡顿。非 LCP 大图加 `decoding="async"` 属性，或用 `Image.decode()` 控制精确插入时机——详见上方「decoding="async" 与 Image.decode()」小节。

**④ JavaScript 不可用时的降级**：使用 `<noscript>` 在 JS 禁用时直接展示图片，同时对懒加载占位元素用 CSS 隐藏（`.no-js .lazy { display: none }`），避免用户只看到占位符：

```html
<!-- 懒加载占位写法 -->
<img class="lazy" src="placeholder.jpg" data-src="image-to-lazy-load.jpg" alt="药品图片" />

<!-- JS 不可用时直接展示原图 -->
<noscript>
  <img src="image-to-lazy-load.jpg" alt="药品图片" />
</noscript>
```

### 视频替代 GIF 动画

GIF 动画没有声音、最高支持 256 色、文件普遍偏大（一个 14MB 的 GIF 转为 MP4 后只有 867KB）。对于内容较长或帧数较多的动画，用 `<video>` 替代是标准做法：

```html
<!-- ❌ GIF：14MB，无法控制，解码耗 CPU -->
<img src="animation.gif" alt="药品服用动画" />

<!-- ✅ 视频替代：867KB，静音自动循环，体验一致 -->
<video autoplay muted loop playsinline>
  <source src="animation.webm" type="video/webm" />
  <source src="animation.mp4" type="video/mp4" />
</video>
```

`autoplay` + `muted` + `loop` + `playsinline` 是视频替代 GIF 的固定四件套：静音是 `autoplay` 生效的前提，`playsinline` 避免 iOS 全屏播放。WebM 体积比 MP4 更小，作为首选格式排在前面。

> 💬 **面试官**：为什么要用视频替代 GIF？
>
> ✅ 标准答案：GIF 最高 256 色、文件大、主线程解码耗时，视频格式（MP4/WebM）压缩率高 10-20 倍，且浏览器用独立解码器，不占用主线程
> 🎁 加分答案：GIF 解码 CPU 耗时约 2668ms，MP4 约 1995ms，WebM 约 2354ms，三者中 MP4 主线程压力最小

### `<picture>` 元素格式降级

`<picture>` 允许列出多个候选格式，浏览器选择第一个支持的格式：

```html
<picture>
  <source srcset="drug-banner.avif" type="image/avif" />
  <source srcset="drug-banner.webp" type="image/webp" />
  <img src="drug-banner.jpg" alt="药品 Banner" />
</picture>
```

浏览器从上到下尝试，支持 AVIF 就用 AVIF，不支持就降级到 WebP，最终兜底是 JPEG。`<img>` 的 `alt` 和默认 `src` 必须保留，用于不支持 `<picture>` 的极老浏览器。

> 💬 **面试官**：如何给不同浏览器提供不同格式的图片？
>
> ✅ 标准答案：用 `<picture>` 元素，`<source>` 按优先级列出格式，浏览器选第一个支持的；或者在服务端根据请求头 `Accept: image/avif,image/webp` 动态返回最优格式
> 🎁 加分答案：服务端方案（Accept 头判断）对 `<img>` 标签透明，不需要改 HTML，适合 CDN 层统一处理；`<picture>` 方案在纯前端可控，推荐在构建时自动生成多格式

---


## 🔤 字体优化

自定义字体是另一个常被忽视的性能黑洞——字体文件动辄几百 KB，且加载期间会出现文字闪烁。

### FOIT / FOUT / FOFT 三种闪烁原理

字体加载期间，浏览器对文字的处理方式分三种：

**FOIT（Flash of Invisible Text，不可见文字闪烁）**：字体未加载完成时，文字**隐藏不显示**，加载完才出现。用户盯着空白等字，体验差。

**FOUT（Flash of Unstyled Text，无样式文字闪烁）**：字体未加载时先用**系统回退字体**显示，加载完后切换为自定义字体，发生一次布局跳动。

**FOFT（Flash of Faux Text，伪字体闪烁）**：先加载字体的 Regular 字重，Bold/Italic 用浏览器模拟（加粗/倾斜），等对应字重文件加载完再切换。是三者中体验最好的渐进式方案。

### font-display 选哪个

`font-display` 属性控制字体加载期间的行为：

```css
@font-face {
  font-family: 'MyFont';
  src: url('myfont.woff2') format('woff2');
  font-display: swap; /* 👈 关键属性 */
}
```

| 值 | 行为 | 适用场景 |
|------|------|----------|
| `auto` | 浏览器默认（通常是 FOIT） | 不推荐 |
| `block` | 强制 FOIT，最多等 3 秒 | 图标字体（文字不可见比乱码好） |
| `swap` | 立即显示回退字体，字体加载完后切换（FOUT） | 正文、标题 |
| `fallback` | 极短 FOIT（100ms）后 FOUT，超时不再切换 | 正文（兼顾体验与稳定性） |
| `optional` | 极短等待，网络慢时直接用回退字体不再切换 | **零布局偏移的最优选**，适合非关键字体 |

**推荐选择**：正文字体用 `swap`（确保内容可读），非关键装饰字体用 `optional`（不产生 CLS 布局偏移）。

### preload 字体 + 字体子集化

**预加载关键字体**，让字体请求尽早发出，减少 FOUT 时长：

```html
<link
  rel="preload"
  href="/fonts/main.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

`crossorigin` 属性即使字体是同域也必须加——字体请求默认用匿名 CORS 模式，缺少这个属性会导致字体被下载两次。

**字体子集化**：中文字体动辄 5-10MB，但一个页面实际用到的汉字通常不超过几千个。用 `unicode-range` 按需加载：

```css
@font-face {
  font-family: 'SubsetFont';
  src: url('subset-basic.woff2') format('woff2');
  /* 只包含常用汉字范围 */
  unicode-range: U+4E00-U+9FFF, U+3400-U+4DBF;
}
```

构建工具层面，`fonttools`（Python）或 `glyphhanger` 可以根据页面实际用到的字符自动裁剪字体文件，体积能压缩到原来的 1/10。

> 💬 **面试官**：页面加载自定义字体时如何避免布局偏移（CLS）？
>
> ✅ 标准答案：用 `font-display: optional` 或 `fallback`——`optional` 在字体没有足够快加载时直接放弃切换，不产生二次布局；配合 `<link rel="preload">` 提前加载字体，尽量在首屏渲染前就准备好
> 🎁 加分答案：CSS `size-adjust`、`ascent-override`、`descent-override` 属性可以调整回退字体的度量，让回退字体和自定义字体尺寸尽量一致，进一步减少切换时的布局跳动

---


## 🚀 预测式加载（高阶）

### preload / prefetch / prerender 语义边界

三个 Resource Hint 经常被混淆，核心区别在于**加载时机和使用意图**：

| 指令 | 时机 | 意图 | 影响优先级 |
|------|------|------|-----------|
| `preload` | 当前页面会用到，尽早加载 | 当前导航必需 | 高，和页面资源竞争带宽 |
| `prefetch` | 下一页可能用到，空闲时加载 | 未来导航预备 | 最低，不影响当前页 |
| `prerender` | 完整预渲染整个下一页 | 极速导航 | 消耗内存和 CPU |

```html
<!-- 当前页面的关键字体，必须尽早加载 -->
<link rel="preload" href="font.woff2" as="font" crossorigin>

<!-- 下一页可能需要的脚本，空闲时偷偷下载 -->
<link rel="prefetch" href="/checkout/bundle.js">

<!-- 预渲染整个结果页（用户很可能点击搜索按钮） -->
<link rel="prerender" href="/search-results">
```

`preload` 必须带 `as` 属性指定资源类型，否则浏览器无法正确设置优先级和 CSP 策略。`prerender` 代价最高（完整执行 JS、加载所有资源），只对**高置信度的下一页**使用。

### modulepreload：ES 模块的专属预加载

普通 `<link rel="preload" as="script">` 只下载单个文件，不处理模块依赖。`modulepreload` 是 ES 模块的专属预加载方式，会同时下载、解析并编译模块及其**整个依赖图**：

```html
<!-- ❌ 只预加载 app.js，其依赖的 utils.js / router.js 仍要等解析后才发请求 -->
<link rel="preload" href="/app.js" as="script">

<!-- ✅ 预加载 app.js 及其所有静态 import 依赖，一次性全部加载 -->
<link rel="modulepreload" href="/app.js">
```

Vite 生产构建会自动在 HTML 中注入 `modulepreload` 标签，覆盖入口模块和关键 chunk 的依赖图。如果你在手动优化，对 ES 模块脚本应优先使用 `modulepreload` 而非 `preload`。

> 💬 **面试官**：`preload` 和 `modulepreload` 有什么区别？
>
> ✅ 标准答案：`preload` 只下载单个资源文件；`modulepreload` 专为 ES 模块设计，下载的同时完成解析和编译，且会递归处理静态 `import` 依赖，减少模块加载的瀑布请求
> 🎁 加分答案：Vite 在 `build` 时默认对入口 chunk 注入 `modulepreload`；`modulepreload` 预加载的模块会进入模块注册表，后续 `import()` 直接命中，不再发网络请求

### Speculation Rules API：声明式 prerender

传统 `<link rel="prerender">` 支持有限（Chrome 已部分废弃），Chrome 108+ 推出的 **Speculation Rules API** 是更强大的替代方案：

```html
<script type="speculationrules">
{
  "prerender": [
    {
      "where": { "href_matches": "/product/*" },
      "eagerness": "moderate"
    }
  ],
  "prefetch": [
    {
      "urls": ["/cart", "/checkout"],
      "eagerness": "eager"
    }
  ]
}
</script>
```

`eagerness` 控制触发时机：

- `immediate`：脚本解析后立即执行
- `eager`：尽快执行（接近 immediate）
- `moderate`：用户悬停链接 200ms 后触发
- `conservative`：用户点击时才触发（最保守，节省资源）

`moderate` 是最实用的值——用户悬停通常意味着即将点击，提前 prerender 能让导航接近瞬时，同时不会对所有链接都预渲染浪费资源。

🔧 **真实场景**：在药品列表页，用户悬停某个药品卡片时，Speculation Rules 触发预渲染该药品详情页。用户点击时详情页已经渲染完毕，导航耗时从平均 800ms 降到 50ms 以内，接近原生 App 体验。

> 💬 **面试官**：prefetch 和 prerender 的区别？
>
> ✅ 标准答案：prefetch 只下载资源文件缓存备用，不执行；prerender 完整预渲染整个页面（下载、解析、执行 JS、渲染），用户导航时直接呈现，体验最好但消耗资源最多
> 🎁 加分答案：Speculation Rules API 是 prerender 的现代替代，支持 URL 模式匹配和 eagerness 控制，比 `<link rel="prerender">` 更灵活且在 Chrome 中有完整实现；可通过 `document.addEventListener('prerenderingchange', ...)` 感知页面是否处于预渲染状态

### 103 Early Hints：让预加载提前一个 RTT

传统流程：浏览器发请求 → 服务器处理 → 返回 200 + HTML → 浏览器解析到 `<link rel="preload">` → 才开始加载关键资源。服务器处理期间（可能 100-500ms）浏览器什么都做不了。

**103 Early Hints** 让服务器在完整响应准备好之前，先发一个 103 状态码告诉浏览器「去提前加载这些资源」：

```http
HTTP/1.1 103 Early Hints
Link: </style.css>; rel=preload; as=style
Link: </font.woff2>; rel=preload; as=font; crossorigin

HTTP/1.1 200 OK
Content-Type: text/html
...（完整响应）
```

浏览器收到 103 后立即开始加载 `style.css` 和 `font.woff2`，等 200 响应到达时这些资源可能已经下载完毕，首屏渲染时间节省了整整一个服务器处理时间（RTT）。

Nginx 配置示例：

```nginx
location / {
  # 提前发送 Early Hints
  add_header Link "</style.css>; rel=preload; as=style";
  http2_push_preload on;

  proxy_pass http://backend;
}
```

> 💬 **面试官**：103 Early Hints 和 HTTP/2 Server Push 有什么区别？
>
> ✅ 标准答案：Server Push 由服务器主动推送资源内容，但容易推错（用户可能已有缓存）导致浪费带宽；103 Early Hints 只是发送「提示」，浏览器自己决定是否下载（会先查缓存），更智能也更安全
> 🎁 加分答案：Server Push 在 HTTP/2 中实现复杂、容易被滥用，Chrome 已于 2022 年移除对 HTTP/2 Server Push 的支持；103 Early Hints 是官方推荐的替代方案，Cloudflare、Fastly 等 CDN 均已支持

### HTTP/2 多路复用与 HTTP/3 QUIC

**HTTP/2** 的核心改进：

- **多路复用**：一个 TCP 连接并发传输多个请求，消除 HTTP/1.1 的队头阻塞
- **头部压缩（HPACK）**：压缩重复的请求头，减少冗余传输
- **二进制帧**：替代文本协议，解析更高效
- **服务器推送**（已基本废弃，见上）

**HTTP/2 的残留问题**：多路复用在应用层解决了 HTTP 队头阻塞，但底层 TCP 仍有队头阻塞——网络丢包时整个 TCP 连接暂停重传，所有并发流都受影响。

**HTTP/3** 用 **QUIC 协议**（基于 UDP）从根本上解决这个问题：

- 每个流独立传输，单个流丢包不影响其他流
- **0-RTT 握手**：已连接过的服务器，重连时不需要握手直接发数据（HTTP/2 需要 1-3 个 RTT）
- **连接迁移**：从 Wi-Fi 切换到 4G 时连接不中断（基于 Connection ID 而非 IP+端口）

```text
HTTP/1.1：每个请求一个连接，或 keep-alive 串行复用
HTTP/2：一个连接多路复用，TCP 层仍有队头阻塞
HTTP/3：QUIC 上多路复用，流级别独立，0-RTT，连接迁移
```

> 💬 **面试官**：HTTP/3 相比 HTTP/2 解决了什么问题？
>
> ✅ 标准答案：HTTP/2 基于 TCP，丢包时整个连接的所有流都要等待重传（TCP 层队头阻塞）。HTTP/3 基于 QUIC/UDP，每个流独立重传，单个流丢包不影响其他流；另外 QUIC 支持 0-RTT 握手和连接迁移
> 🎁 加分答案：QUIC 把原来 TCP 的可靠性机制在用户态重新实现，可以更快迭代而不受操作系统内核升级周期制约；目前主流 CDN（Cloudflare、Fastly）和大型网站均已支持 HTTP/3

### bfcache：最被忽视的免费性能提升

bfcache（Back/Forward Cache，往返缓存）是浏览器把**整个页面快照**冻结在内存里的机制。用户点击「后退/前进」时，页面从内存直接恢复，不发任何网络请求，恢复时间通常在 50ms 以内——比任何缓存策略都快。

Chrome、Firefox、Safari 均已支持 bfcache。根据 Chrome 团队数据，bfcache 命中率的提升对真实用户的加载体验改善幅度甚至超过大多数其他优化手段。

**常见 bfcache Blocker（会导致页面无法进入 bfcache）**：

| Blocker | 原因 | 修复方式 |
|---------|------|----------|
| `unload` 事件监听 | 最常见的 killer，浏览器无法安全冻结 | 改用 `pagehide` + `visibilitychange` |
| `Cache-Control: no-store` | 浏览器不缓存任何内容，包括 bfcache | HTML 页面改用 `no-cache` |
| `SharedArrayBuffer` 未释放 | 安全限制 | 导航前显式关闭 |
| 未关闭的 IndexedDB 连接 | 事务锁定 | 页面隐藏前关闭连接 |
| `window.opener` 引用 | 跨页面引用阻止冻结 | 避免不必要的 opener 引用 |

检测方式：DevTools → Application → Back/forward cache → 点击「Test back/forward cache」，会列出阻止 bfcache 的具体原因。

```javascript
// ❌ 会阻止 bfcache
window.addEventListener('unload', () => { /* 清理逻辑 */ })

// ✅ 用 pagehide 替代，不阻止 bfcache
window.addEventListener('pagehide', (event) => {
  if (!event.persisted) {
    // persisted=false 说明页面真正卸载，执行清理
  }
})
```

`event.persisted` 为 `true` 时表示页面进入 bfcache，为 `false` 时才是真正卸载。

> 💬 **面试官**：bfcache 是什么，哪些操作会阻止它？
>
> ✅ 标准答案：bfcache 是浏览器把整个页面冻结在内存中，后退/前进时直接恢复，速度极快。常见 blocker 是 `unload` 事件监听和 `Cache-Control: no-store`
> 🎁 加分答案：用 `pagehide` 替代 `unload`，通过 `event.persisted` 判断是真正卸载还是进入 bfcache；DevTools Application 面板可以直接检测并列出 blocker 原因

---


## 🧩 第三方脚本优化

第三方脚本（统计、客服、广告、热力图）是生产环境最常见的加载性能黑洞，但往往被忽视。一个 50KB 的统计脚本如果在主线程执行 300ms，会直接拖慢 TTI。

### 延迟加载非关键三方脚本

非关键脚本（统计、热力图、客服插件）应在页面交互后或空闲时加载，不占首屏加载资源：

```javascript
// 方案一：requestIdleCallback，浏览器空闲时加载
window.requestIdleCallback(() => {
  const script = document.createElement('script')
  script.src = 'https://analytics.example.com/tracker.js'
  document.head.appendChild(script)
})

// 方案二：用户首次交互后加载（点击/滚动/键盘）
const loadOnInteraction = () => {
  import('./analytics.js').then(m => m.init())
  ;['click', 'scroll', 'keydown'].forEach(e =>
    window.removeEventListener(e, loadOnInteraction)
  )
}
;['click', 'scroll', 'keydown'].forEach(e =>
  window.addEventListener(e, loadOnInteraction, { once: true })
)
```

### Facade 模式：点击时才加载重型组件

视频播放器、地图、客服聊天插件往往几百 KB 起步。Facade 模式用静态截图替代真实组件，只在用户点击时才加载：

```html
<!-- 视频 Facade：显示封面图 + 播放按钮，点击才加载真实播放器 -->
<div class="video-facade" onclick="loadRealPlayer(this)">
  <img src="video-thumbnail.jpg" alt="播放视频" />
  <button class="play-btn" aria-label="播放">▶</button>
</div>
```

```javascript
function loadRealPlayer(facade) {
  const iframe = document.createElement('iframe')
  iframe.src = 'https://player.example.com/embed/video-id?autoplay=1'
  iframe.allow = 'autoplay; fullscreen'
  facade.replaceWith(iframe)
}
```

🔧 **真实场景**：医疗咨询页嵌入在线客服插件，初始化脚本 180KB，主线程占用 400ms。改为用户点击「在线咨询」按钮时才动态加载，TTI 提升 380ms，首屏 LCP 提前 0.6 秒。

> 💬 **面试官**：如何处理页面中第三方脚本对性能的影响？
>
> ✅ 标准答案：非关键脚本（统计/客服）用 `requestIdleCallback` 或交互触发延迟加载；重型组件（播放器/地图）用 Facade 模式，点击时才真正加载
> 🎁 加分答案：可以用 Partytown 库把三方脚本迁移到 Web Worker 运行，完全不占主线程；三方脚本对应的域名提前加 `<link rel="preconnect">` 减少连接建立时间

---


## 💻 完整代码

### Next.js 缓存头配置（next.config.ts）

把本文的缓存策略决策矩阵落地为一份 Next.js 配置：

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // HTML 页面：每次协商验证
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache' },
        ],
      },
      {
        // 带 hash 的静态资源：永久强缓存
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}
```

继续追加图片和 API 的规则：

```typescript
      {
        // 公共图片资源：长期缓存
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        // API 路由：短期缓存 + 后台刷新
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, stale-while-revalidate=300',
          },
        ],
      },
```

### 图片懒加载组件（IntersectionObserver，约 40 行）

一个可复用的 React 懒加载组件，支持自定义占位图和提前加载距离：

```tsx
// components/LazyImage.tsx
import { useEffect, useRef, useState } from 'react'

interface LazyImageProps {
  src: string
  alt: string
  placeholder?: string
  rootMargin?: string
  className?: string
}

export function LazyImage({
  src,
  alt,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E',
  rootMargin = '200px 0px',
  className,
}: LazyImageProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)
```

组件主体逻辑继续：

```tsx
  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        img.src = src              // 👈 触发真实图片加载
        observer.unobserve(img)
      },
      { rootMargin }
    )

    observer.observe(img)
    return () => observer.disconnect()
  }, [src, rootMargin])

  return (
    <img
      ref={imgRef}
      src={placeholder}
      alt={alt}
      className={className}
      onLoad={() => setLoaded(true)}
      style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
    />
  )
}
```

使用方式：

```tsx
// 首屏 LCP 图片：不懒加载，提高优先级
<img src="/hero.jpg" fetchPriority="high" alt="首屏 Banner" />

// 非首屏图片：懒加载
<LazyImage src="/drug-detail.jpg" alt="药品详情" rootMargin="300px 0px" />
```

---


## 🔀 代理服务器

代理服务器是客户端和目标服务器之间的中介，分为正向代理和反向代理两种，方向相反、用途不同。

### 正向代理

正向代理位于**客户端侧**，代替客户端发起请求，服务端不知道真实客户端是谁。典型场景：通过代理访问被限制的外部资源。

![正向代理：客户端 → 代理服务器 → 互联网](https://cdn.nlark.com/yuque/0/2021/png/738210/1638173165267-a52cb650-9f37-4bde-ab45-42db5795f4e0.png)

正向代理的主要用途：
- 访问原来无法访问的资源
- **缓存加速**：代理缓存热门资源，减少对源站的请求
- 客户端访问控制与行为审计
- 对外隐藏客户端真实 IP

### 反向代理

反向代理位于**服务端侧**，接收来自外部的请求并转发给内部服务器，客户端不知道真实服务端是谁。

![反向代理：客户端 → 反向代理（公网 IP）→ 内网服务器集群](https://cdn.nlark.com/yuque/0/2021/png/738210/1638173290911-a6aac8d2-4b2d-4092-8e79-578aa889e246.png)

反向代理的主要作用：
- **负载均衡**：把请求分发到多台后端服务器，避免单点过载
- **安全隔离**：内网服务器不直接暴露在公网，反向代理作为唯一入口
- **SSL 卸载**：TLS 握手在代理层处理，后端用 HTTP 通信，降低后端负担
- **静态资源缓存**：反向代理缓存后端返回的静态内容，减少回源次数

![正向代理 vs 反向代理结构对比](https://cdn.nlark.com/yuque/0/2021/png/738210/1638173447000-1f10b66e-8b51-4733-9e2e-31105b10d21c.png)

一句话区分：**正向代理是买票的黄牛（代表客户），反向代理是租房的中介（代表房东/服务端）**。

CDN 本质上就是一种全球分布的反向代理网络——边缘节点缓存源站内容，用户请求命中边缘节点即返回，不回源。

Node.js 实现一个简单反向代理（`http-proxy`）：

```javascript
const http = require('http')
const httpProxy = require('http-proxy')
const proxy = httpProxy.createProxyServer()

http.createServer((req, res) => {
  proxy.web(req, res, { target: 'http://localhost:8089' })
  proxy.on('error', (err) => res.end('Proxy Error'))
}).listen(8088)
```

> 💬 **面试官**：正向代理和反向代理的区别？
>
> ✅ 标准答案：正向代理代理客户端，服务端不知道真实客户端（如翻墙代理）；反向代理代理服务端，客户端不知道真实服务器（如 Nginx 负载均衡）
> 🎁 加分答案：CDN 是反向代理的典型应用；正向代理在 LAN 内与客户端同侧，反向代理在 LAN 内与服务端同侧；两者都可以做缓存，但缓存的对象方向相反

---


## 💡 一张表总结（面试速记）

| 优化手段 | 核心原理 | 面试频率 |
|----------|----------|----------|
| `defer` / `async` | defer 保序、async 不保序，均不阻塞 HTML 解析 | ⭐⭐⭐⭐⭐ |
| HTTP 强缓存 | `Cache-Control: max-age` + `immutable`，零请求 | ⭐⭐⭐⭐⭐ |
| HTTP 协商缓存 | ETag 基于内容指纹，比 Last-Modified 更可靠 | ⭐⭐⭐⭐⭐ |
| 浏览器缓存优先级 | 内存 > SW > HTTP 缓存 > Push 缓存，逐级降级 | ⭐⭐⭐⭐⭐ |
| `stale-while-revalidate` | 先返回旧缓存，后台刷新，用户无感 | ⭐⭐⭐⭐ |
| Service Worker | 可编程网络代理，Cache-first/Network-first 等策略 | ⭐⭐⭐⭐ |
| CDN | 边缘节点就近返回，首次请求提速；独立域名避免 Cookie 污染 | ⭐⭐⭐⭐⭐ |
| Gzip / Brotli | 文本资源压缩传输，Brotli 比 Gzip 压缩率高 15-25% | ⭐⭐⭐⭐ |
| 减少重定向 | 每次重定向多一个 RTT，最佳次数为 0 | ⭐⭐⭐ |
| `loading="lazy"` | 原生懒加载，进入视口前约 1200px 触发 | ⭐⭐⭐⭐ |
| IntersectionObserver | 自定义触发距离，支持 `rootMargin` 提前加载 | ⭐⭐⭐⭐ |
| 懒加载占位符 / LQIP | 防止布局偏移（CLS），同尺寸占位图保持页面稳定 | ⭐⭐⭐ |
| 视频替代 GIF | MP4/WebM 体积小 10-20 倍，主线程压力更小 | ⭐⭐⭐ |
| `fetchpriority="high"` | 显式提升 LCP 图片优先级 | ⭐⭐⭐ |
| `font-display: swap` | 先用回退字体，加载完切换，避免 FOIT | ⭐⭐⭐⭐ |
| Critical CSS 内联 | 首屏 CSS 内联到 `<head>`，消除渲染阻塞 | ⭐⭐⭐⭐ |
| `preload` | 当前页关键资源提前下载，不阻塞解析 | ⭐⭐⭐⭐ |
| `prefetch` | 下一页资源空闲时下载，最低优先级 | ⭐⭐⭐ |
| Speculation Rules API | 声明式 prerender，eagerness 控制触发时机 | ⭐⭐⭐ |
| 103 Early Hints | 服务器提前发送预加载提示，节省一个 RTT | ⭐⭐ |
| HTTP/3 QUIC | 流级别独立重传 + 0-RTT 握手 + 连接迁移 | ⭐⭐⭐ |
| 预加载扫描器 | 主解析器阻塞时并行扫描 HTML 提前发起资源下载 | ⭐⭐⭐ |
| `modulepreload` | ES 模块专属预加载，覆盖整个依赖图，Vite 默认注入 | ⭐⭐⭐ |
| `width` / `height` + `aspect-ratio` | 预留图片空间，防止加载后回流产生 CLS | ⭐⭐⭐⭐ |
| `decoding="async"` | 非 LCP 大图异步解码，不阻塞主线程渲染 | ⭐⭐⭐ |
| HTTP 缓存分区 | Chrome 86+ 跨站缓存不再共享，公共 CDN 缓存复用失效 | ⭐⭐⭐ |
| bfcache | 后退/前进时整页内存恢复，`unload` / `no-store` 是常见 blocker | ⭐⭐⭐⭐ |
| 第三方脚本优化 | 延迟加载 + Facade 模式，避免三方脚本阻塞主线程 | ⭐⭐⭐⭐ |
| 正向代理 / 反向代理 | 正向代理代理客户端，反向代理代理服务端；CDN 本质是反向代理 | ⭐⭐⭐⭐ |
| Gzip / Brotli 服务端实现 | 根据 `Accept-Encoding` 选流，静态资源预压缩，动态内容实时压缩 | ⭐⭐⭐⭐ |
| Lighthouse TBT | 主线程长任务超出 50ms 部分的总和，权重 25%，影响可交互时间 | ⭐⭐⭐⭐ |
| Performance API | `responseStart - requestStart` = TTFB，`responseEnd - fetchStart` = 白屏时间 | ⭐⭐⭐⭐ |

---

## 📝 留个问题

你们项目的 HTTP 缓存策略是怎么设计的？有没有遇到过「发布新版本但用户还在用旧缓存」的问题，是怎么解决的？欢迎在评论区分享你的方案。

---

## 参考

- https://web.dev/articles/vitals?hl=zh-cn
- https://web.dev/articles/rail?hl=zh-cn
- https://web.dev/articles/rendering-performance?hl=zh-cn
- https://web.dev/learn/performance/welcome?hl=zh-cn
- https://developer.mozilla.org/zh-CN/docs/Web/Performance
- https://github.com/berwin/Blog/issues/23
- https://github.com/GoogleChromeLabs/quicklink

---

> 🔖 这是「前端性能与监控系列」第 11 篇。上一篇：《工程构建优化：Tree Shaking 失效原因与 Vite 产物瘦身实战（面试收藏级）》；下一篇预告：《运行时优化：手写防抖节流 + 重排重绘 + React 性能问题排查（面试收藏级）》
