# prompt

```text
/publish 下面我们规划网络系列的第8篇文章，具体如下：
{{
## 知识点范围

### 第 08 篇：HTTP 缓存体系：强缓存/协商缓存/Service Worker 缓存策略实战

**副标题**：强缓存的到期时间控制、协商缓存的内容校验机制、Service Worker 作为可编程缓存层

#### 一、使用与实践

- Chrome DevTools Network 面板观察请求的 `from disk cache`/`from memory cache`/`304 Not Modified` 状态
- 服务端设置 `Cache-Control: max-age=3600`、`ETag`、`Last-Modified` 响应头
- Service Worker 注册基本流程：`navigator.serviceWorker.register()`，`fetch` 事件拦截网络请求
- 医院 HIS 系统里"药品说明书 PDF 静态资源"用强缓存 + 文件名哈希（content hash）实现"内容变更即 URL 变更"的缓存更新策略
- 浏览器强制刷新（`Ctrl+Shift+R`）与普通刷新在缓存命中行为上的差异

#### 二、设计与原理

- **强缓存**：`Cache-Control: max-age=N`（或历史遗留的 `Expires` 绝对时间）告诉浏览器"这份资源在 N 秒内直接使用本地缓存，完全不发请求到服务端确认"——这是性能最好的缓存策略，但代价是"如果资源内容变了，浏览器在 max-age 到期前完全不知道"，因此生产环境通常给资源文件名加上内容哈希（如 `app.a1b2c3.js`），内容变化即 URL 变化，配合超长 `max-age` 既能长期强缓存又能保证内容更新立即生效
- **协商缓存**：当强缓存过期或设置为 `Cache-Control: no-cache`（注意 `no-cache` 不是"不缓存"，而是"每次都要向服务端验证"）时，浏览器会发请求带上 `If-None-Match`（对应上次响应的 `ETag`）或 `If-Modified-Since`（对应上次的 `Last-Modified`），服务端比对后如果内容没变，返回 `304 Not Modified`（不返回响应体，节省带宽，详见 05 篇 304 状态码语义），浏览器继续使用本地缓存；如果变了则返回 `200` 和新内容
- **`ETag` 与 `Last-Modified` 的优先级与差异**：`Last-Modified` 精度只到秒级，且只能反映"文件修改时间"，如果文件内容没变但被重新保存会误判为需要更新；`ETag` 是内容的哈希指纹（或版本标识），能精确反映"内容是否真的变化"，两者都存在时浏览器优先使用 `ETag` 校验
- **`Cache-Control` 的常见指令组合**：`no-store`（完全不缓存）、`no-cache`（缓存但每次都要协商验证）、`private`/`public`（是否允许中间代理/CDN 缓存）、`immutable`（明确告诉浏览器这个资源永远不会变，配合强缓存彻底跳过协商，常用于带内容哈希的静态资源）
- **Service Worker 作为可编程缓存层**（重点）：Service Worker 运行在独立于页面主线程的 Worker 线程，能拦截页面发出的所有 `fetch` 请求，完全由开发者用 JS 代码决定缓存策略——这把浏览器内置的、规则相对固定的 HTTP 缓存策略，升级为完全可编程的缓存逻辑，是 PWA 离线能力的核心基础设施；常见策略模式包括 Cache First（缓存优先，适合静态资源）、Network First（网络优先，缓存兜底）、Stale-While-Revalidate（先返回缓存，同时后台请求新数据更新缓存，下次生效）
- 对比 Node.js 实现：Node.js 后端在响应静态资源时（如 `express.static`）需要正确设置 `ETag`/`Cache-Control`，理解背后原理才能在"资源更新了但用户看到的还是旧版本"这类问题排查时，快速判断是强缓存过期时间设置不合理，还是 CDN 层缓存未及时刷新（呼应 Node.js 系列 04 篇静态资源服务器实现）

#### 三、工程落地参考

1. HTTP 缓存规范：RFC 9111（HTTP Caching）— `Cache-Control` 各指令的定义与优先级
2. 条件请求规范：RFC 9110 第 13 章 — `If-None-Match`/`If-Modified-Since` 的服务端处理逻辑
3. Service Worker 规范：W3C Service Workers 标准 — `fetch` 事件拦截与 `Cache` API 的基本模型

#### 四、实践演示与验证

用 Chrome DevTools Network 面板观察一次真实请求的缓存状态：对比普通刷新、强制刷新（`Ctrl+Shift+R`）、`from disk cache`、`from memory cache`、`304 Not Modified` 几种情况在响应头和耗时上的差异；用 `curl -I` 查看一个静态资源响应里的 `Cache-Control`/`ETag`/`Last-Modified` 头，再用 `curl -H "If-None-Match: <上次的 ETag>"` 手动发起一次协商缓存请求，验证服务端返回 `304 Not Modified` 且不返回响应体；最后在 Chrome DevTools Application 面板里观察一个 PWA 站点 Service Worker 的注册、`fetch` 事件拦截与 `Cache Storage` 里的缓存条目，直观理解"可编程缓存层"相比浏览器内置 HTTP 缓存的本质区别。

#### 五、参考
- https://www.rfc-editor.org/rfc/rfc9111
- https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API
- https://web.dev/articles/service-worker-caching-and-http-caching

**面试核心问**：
- 强缓存和协商缓存的本质区别是什么？`no-cache` 是不缓存的意思吗？
- `ETag` 和 `Last-Modified` 分别有什么局限？为什么 `ETag` 优先级更高？
- 静态资源文件名加内容哈希这种做法解决了什么问题？
- Service Worker 相比浏览器内置 HTTP 缓存机制的本质区别是什么？
- Cache First、Network First、Stale-While-Revalidate 三种缓存策略分别适合什么场景？



## 已有笔记

- @docs\notes\09 network\10 application\01 压缩和解压缩.md
- @docs\notes\09 network\10 application\02 加密和解密 .md
- @docs\notes\09 network\10 application\03 多语言切换.md
- @docs\notes\09 network\10 application\04 图片防盗链.md
- @docs\notes\09 network\10 application\05 跨域.md
- @docs\notes\09 network\10 application\06 代理服务器.md
- @docs\notes\09 network\10 application\07 虚拟主机.md
- @docs\notes\09 network\10 application\08 user-agent.md
- @docs\notes\09 network\10 application\09 Web缓存.md

## plans 地址

- @docs\plans\06 network-principles-series-outline.md

## 规则

- 笔记只关注 @docs/notes/08 node 目录下的，其他目录禁止自行读取
- 补全内容（保留原有内容，只增不删），保留图片，一些知识点的说明图片可以从网络上获取，尽量使用图片加以说明，这样跟容易学习和理解
- 将整理后的内容生成公众号文章，输出到 @docs\articles\09 network
- 文章结构：先出大纲等我确认，再逐节写作
}}
，注意⚠️：
- 本系列 适用于 5-10年的开发者，想要系统性的学习，并且想要完全掌握 网络相关 的开发者。
- 保留笔记完整代码和图片，样式格式保持一致和这篇@docs\articles\09 network\2026-09-28-dns-resolution-recursive-cdn-doh.md，不读我没要求到的文件；
- 可以根据你的经验和最佳实践查漏补缺；主线要明确清晰；每个知识点都要由浅入深的彻底讲透，讲明白。
```

