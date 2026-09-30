# 跨域与安全：CORS 机制/CSRF/XSS/CSP/安全响应头全解（面试收藏级）

> **副标题**：同源策略与跨域限制、CORS 简单请求与预检请求、CSRF 与 XSS 攻防、CSP 内容安全策略

> 面试官问「同源策略到底限制的是什么？」「CSRF 和 XSS 有什么区别？」「CORS 放行跨域，会不会又把 CSRF 的洞打开？」——大多数人能背出「协议 + 域名 + 端口三者一致才算同源」，但继续追问「同源策略为什么不拦 `<script>` 标签的跨域加载」「`Access-Control-Allow-Credentials` 为什么不能配 `*`」「`HttpOnly` 防的到底是 XSS 还是 CSRF」「点击劫持为什么不靠脚本注入就能得手」，能一路答到「安全边界与攻防动机」这一层的，我面过的候选人里不到一成。这篇文章，就把浏览器安全这块最难啃的骨头，从头到脚彻底讲透。

---

## 🎯 这篇文章解决什么问题

这是「网络原理深度拆解」系列的第 **07** 篇。前六篇你已经打通了 DNS（01）、TCP（02）、HTTPS/TLS（03）、HTTP 演进（04）、HTTP 语义（05）、WebSocket（06）。但到这里有个一直悬而未决、却贯穿前面所有篇章的问题：**浏览器凭什么阻止不同源的页面互相读数据，又凭什么允许 CORS 合法跨域？**——前五篇讲「协议怎么传数据」，这一篇讲「浏览器在什么边界上允许传、什么边界上必须拦」。

在分层大地图里，本篇落在**应用层**，是缓存体系（08）、API 设计（09）、反向代理（10）的同层邻居。但它和前面所有篇的关系最特殊：**安全不是某一个协议，而是横跨所有协议的「边界」**——DNS 有劫持（01 篇）、TCP 有 SYN 洪水（02 篇）、TLS 有中间人（03 篇），而本篇讲的是「浏览器自己立起来的、最基础的那道墙」：同源策略。

这篇文章只做三件事：

- **讲透原理**：同源策略到底是什么、CORS 为什么有「简单请求/预检请求/凭证请求」这么多限制、CSRF/XSS/点击劫持分别是「借用凭证」「注入脚本」「伪造点击」三条完全不同的攻击路径、CSP 怎么在「已经中招」的情况下兜底
- **讲清工具**：DevTools Network 面板看 `OPTIONS` 预检、`curl` 手动模拟预检请求、浏览器控制台看同源报错原文
- **讲会面试**：每个知识点讲完，立刻跟上「面试官会怎么考、标准答案是什么、怎么答加分」

全篇示例统一用医疗场景——医院 HIS 系统里「处方提交接口」的 CSRF 防护，以及「检验报告详情页」的 XSS 与 CSP。**既讲原理，也讲面试怎么答**——读完这篇，你不再是把 CORS/CSRF/XSS 当三个孤立八股文背，而是能把它们串成一条「同源策略 → 合法跨域通道 → 三条攻击路径 → 纵深防御」的主线，面试官的眼睛会不一样。

---

## 一、同源策略：浏览器最基础的安全边界

同源策略（Same-Origin Policy）是浏览器安全模型的**基石**，后面 CORS、CSRF、XSS 全都建立在对它的理解之上。先看它到底是什么。

### 1. 什么是「源」

**「源（Origin）」由三部分组成：协议 + 域名 + 端口**。三者完全一致，才算「同源」；任何一个不同，就是「跨源（跨域）」。

拿 `http://drug.example.com:3000` 举例，看几个对照：

| 对比 URL | 是否同源 | 原因 |
|---------|---------|------|
| `http://drug.example.com:3000` | ✅ 同源 | 完全一致 |
| `http://drug.example.com:3001` | ❌ 跨域 | 端口不同 |
| `https://drug.example.com:3000` | ❌ 跨域 | 协议不同 |
| `http://api.example.com:3000` | ❌ 跨域 | 域名不同（子域也不同源） |

注意一个容易踩的坑：**域名是「完全一致」才算同源**，`drug.example.com` 和 `api.example.com` 是不同源；`example.com` 和 `www.example.com` 也不同源。这个「精确匹配」是理解「为什么前端 www 域名调用 api 域名要配 CORS」的前提。

### 2. 它拦的是「读」，不是「写」和「加载」

**同源策略具体限制的是什么行为？** 这是面试最高频的追问，要答准。同源策略限制的是**「不同源的脚本读取彼此的敏感数据」**，具体三类：

- **Cookie / LocalStorage / IndexedDB**：不同源的脚本读不到彼此的存储（`document.cookie` 只能读到自己源的）
- **DOM**：不同源的脚本读不到彼此的页面结构（`iframe` 里嵌一个跨源页面，外层拿不到它的 `document`）
- **AJAX 响应内容**：不同源的脚本发出去的请求，**响应内容读不到**（这正是开头那个报错的来源）

但这里有个**极其重要、几乎必被追问**的反直觉点：**同源策略拦的是「读」，不是「写」和「加载」**。

- **「加载」不拦**：`<script>`、`<img>`、`<link>`、`<iframe>` 这些标签，**天然可以跨源加载资源**——网页里嵌一张别的域名的图片、引一个别的域名的脚本，完全合法。为什么？因为如果连这个都拦，就没法用 CDN、没法引第三方库了
- **「写」（发请求）也不拦**：跨域请求**能发出去**，只是响应内容读不到

**这个「拦读不拦加载」的差异，是理解后面两大块的关键**：它解释了为什么 `<script>` 标签能跨源加载（这也是早年 JSONP 的跨域原理）、为什么 CSRF 能靠 `<img>`/`<form>` 标签得手（发请求这个「写」动作根本没被拦）。

### 3. 同源策略触发跨域报错的典型场景

先说清楚一个最容易被误解的点：**跨域请求不是「发不出去」，而是「发出去后浏览器不让你读响应」**。

当你在 `http://localhost:3000` 的页面里，用 `fetch` 请求 `http://localhost:3001` 的接口时，请求其实已经打到服务端了、服务端也正常返回了，但浏览器在把响应交给你的 JS 之前，检查了响应头里有没有 `Access-Control-Allow-Origin`，发现没有，于是**把响应拦下来，同时在控制台报错**。控制台里那句经典报错长这样：

```text
Access to fetch at 'http://localhost:3001/api' from origin 'http://localhost:3000'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
on the requested resource. If an opaque response serves your needs, set the request's
mode to 'no-cors' to fetch the resource with CORS disabled.
```

这句话信息量很大，要会拆：

- **`blocked by CORS policy`**：拦下响应的是浏览器，不是服务端——服务端根本没拒绝，是浏览器替它拒绝的
- **`No 'Access-Control-Allow-Origin' header`**：报错直接告诉你缺哪个头、怎么修
- **`from origin 'http://localhost:3000'`**：浏览器把「发起请求的源」和「目标源」都标出来了，方便你定位

同时，如果你用 Network 面板去看这次请求，会发现一个很反常的现象：**明明是 `fetch` 发的一次 `POST`，Network 里却先多出来一个 `OPTIONS` 方法的请求**。这个 `OPTIONS` 就是「预检请求」，是下一节的核心——先记住这个现象。

> ✍️ 这里插一句：**为什么同样一个请求，`curl` 能通、浏览器就报错**？因为 `curl` 不是浏览器，它没有同源策略、也不看 `Access-Control-Allow-Origin` 头——它拿到响应就直接打印给你。同源策略是**浏览器**的安全机制，不是 HTTP 协议本身的规则。这个「浏览器拦、非浏览器不拦」的差异，是理解后面 CSRF 为什么「CORS 防不住」的关键伏笔。

> 💬 **面试官**：什么是同源策略？它限制的具体是什么行为？
>
> ✅ 标准答案：同源策略要求「协议 + 域名 + 端口」三者完全一致才算同源，是浏览器最基本的安全边界。它限制的是**不同源的脚本读取彼此的敏感数据**——Cookie/本地存储、DOM、AJAX 响应内容这三类「读」操作；它**不拦**「加载」（`<script>`/`<img>` 等标签可以跨源加载）和「发请求」（跨域请求能发出去，只是响应读不到）。
>
> 🎁 加分答案：能点出「拦读不拦加载/不拦写」这个非对称性，并且用这个非对称性解释两个具体现象——① 它解释了为什么早年有 JSONP（利用 `<script>` 标签能跨源加载的特性绕开同源限制）；② 它解释了为什么 CSRF 能发生（`<form>`/`<img>` 能跨源「发」请求，同源策略根本不管「发」这个动作，管的是「读」响应）。能把同源策略和这两个攻击/方案串起来，说明你不是在背概念。

---

## 二、CORS：同源策略开的「白名单后门」

既然同源策略默认禁止跨源「读」，那合法的跨域需求（前后端分离、微服务）怎么办？答案就是 **CORS（Cross-Origin Resource Sharing，跨域资源共享）**——它是同源策略开的一个**「白名单后门」**：服务端通过响应头明确声明「我允许哪些源读我的响应」，浏览器据此放行。

### 1. 服务端要回哪些头：原生 Node.js 手写 CORS

看明白了现象，先手写一个 CORS 服务端，理解「服务端到底要回哪些头」。下面这段是完整可运行的原生 `http` 模块实现（保留笔记原文，逐段加了注释）：

```javascript
const http = require("http");
const url = require("url");
const path = require("path");
const querystring = require("querystring");
const server = http.createServer((request, response) => {
  const { pathname } = url.parse(request.url);
  const { method } = request;

  //! 1.配置跨域
  response.setHeader("Access-Control-Allow-Origin", request.headers.origin || "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  response.setHeader("Content-Type", "application/json;charset=utf-8;");
  response.setHeader("Access-Control-Max-Age", "1800");
  if (method === "OPTIONS") {
    response.statusCode = 200;
    response.end();
  }

  //! 2.解析请求体
  const arr = [];
  request.on("data", (chunk) => {
    arr.push(chunk);
  });

  request.on("end", () => {
    const res = Buffer.concat(arr).toString();
    let obj = null;
    if (method === "POST") {
      if (
        request.headers["content-type"] === "application/x-www-form-urlencoded"
      ) {
        obj = querystring.parse(res);
      } else if (request.headers["content-type"] === "application/json") {
        obj = JSON.parse(res);
      }
      //! 3.路由
      if (pathname === "/login") {
        response.end(JSON.stringify(obj));
      } else if (pathname === "/reg") {
        console.log(obj);
        response.end(JSON.stringify(obj));
      }
    }
  });
});
server.listen(3000, () => {
  console.log(`server start port 3000`);
});
```

这段代码要重点看第 1 块「配置跨域」里的三件事，它们就是 CORS 服务端要做的最小工作：

- **`Access-Control-Allow-Origin`**：告诉浏览器「这个源可以读我的响应」。这里写的是 `request.headers.origin || "*"`——**直接回显请求里带的 `Origin` 头**，意思是「谁请求我就允许谁」。这是演示写法，生产环境绝对不能这么写（后面第 3 小节讲为什么）
- **`Access-Control-Allow-Headers`**：允许浏览器在真实请求里携带的自定义请求头列表。这里放行了 `Content-Type,Authorization`——因为预检请求会问「我能不能带这些头」，服务端必须在这里明确回答
- **`Access-Control-Max-Age`**：预检结果的缓存时间（秒）。`1800` 秒内，同样的预检请求不用再发一次，浏览器直接用缓存的结果

**最关键的一行是 `if (method === "OPTIONS")` 这个短路**：浏览器发出的预检请求用的是 `OPTIONS` 方法，服务端收到后**不需要处理任何业务逻辑，直接返回 200 并结束**——预检的本质就是「浏览器来问一下规矩，服务端回个头就行」，所以服务端看到 `OPTIONS` 直接 `response.end()` 短路，这才是正确姿势。

### 2. 简单请求 vs 预检请求（重点 · 面试必考）

CORS 把跨域请求分成了两类，处理方式完全不同，这是本篇第二个核心。

**① 简单请求（Simple Request）**：满足以下**全部**条件，浏览器直接发请求、收到响应后检查头：

- 方法只能是 `GET` / `POST` / `HEAD` 三种之一
- 只能携带「CORS 安全」的请求头，常见的就是 `Content-Type` 且其值只能是三种之一：`text/plain`、`multipart/form-data`、`application/x-www-form-urlencoded`
- 不能有额外的自定义头

简单请求的流程只有一步：**直接发 → 服务端回 `Access-Control-Allow-Origin` → 浏览器检查通过才把响应交给 JS**。表单提交（`application/x-www-form-urlencoded`）就是典型的简单请求。

**② 预检请求（Preflight Request）**：只要**不满足上面任何一条**，浏览器就会先发一个 `OPTIONS` 方法的「预检请求」，问服务端「我接下来要用 `PUT` 方法、要带 `Content-Type: application/json`、要带自定义头 `Authorization`，你允不允许？」服务端回一堆 `Allow-*` 头明确允许后，浏览器才发出真实的请求。

触发预检的典型情况，就是 XHR 里那个 `Content-Type: application/json`：

```
客户端（浏览器）                          服务端
      │                                     │
      │ ──① OPTIONS /api（预检请求）──▶       │
      │   Origin: http://localhost:3000      │
      │   Access-Control-Request-Method: POST│
      │   Access-Control-Request-Headers: content-type │
      │ ◀──② 200（预检响应）──────             │
      │   Access-Control-Allow-Origin: http://localhost:3000 │
      │   Access-Control-Allow-Methods: POST  │
      │   Access-Control-Allow-Headers: content-type │
      │                                     │
      │ ──③ POST /api（真实请求）──▶         │
      │   Content-Type: application/json     │
      │ ◀──④ 200 + Access-Control-Allow-Origin │
```

浏览器端发起跨域请求的页面里，藏着理解「简单 vs 预检」的关键对比，务必看仔细：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CORS</title>
</head>
<body>
  <form action="http://localhost:3000/login" method="post">
    <input type="text" name="username" id="username">
    <input type="password" name="password" id="password">
    <input type="submit" value="登录">
  </form>
  <div><button id="btn">注册</button></div>
  <script>
    btn.addEventListener('click', () => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', 'http://localhost:3000/reg', true)
      xhr.setRequestHeader('Content-Type', 'application/json')
      xhr.responseType = 'json'
      xhr.send(JSON.stringify({ username: 'robin', password: '123456'}))
      xhr.onload = function() {
        console.log(typeof xhr.response)
      }
    })
  </script>
</body>
</html>
```

- **表单 `<form>` 提交**：默认是 `Content-Type: application/x-www-form-urlencoded`，属于**简单请求**，浏览器不会发 `OPTIONS` 预检，直接发 `POST`
- **XHR 里手动 `setRequestHeader('Content-Type', 'application/json')`**：`application/json` 不在简单请求的允许范围内，所以浏览器会**先发一个 `OPTIONS` 预检**，通过后才发真实的 `POST`

**同一个页面、两种跨域方式，一个触发预检、一个不触发**——这个差异，就是「简单请求 vs 预检请求」的核心。

**为什么要有预检这一步？** 这是理解 CORS 设计动机的关键，也是最容易被问倒的地方。原因一句话：**「简单请求」的语义，等价于「传统 `<form>` 表单本来就能跨源发的那些请求」**——在 CORS 出现之前，`<form>` 已经能跨源提交 `GET`/`POST`、`application/x-www-form-urlencoded` 这类请求了。所以对这些「本来就能发」的请求，CORS 只需在响应里加个头、让浏览器「允许读」即可，没必要多一步。

但 `PUT`、`DELETE`、`application/json`、自定义头这些，是 `<form>` 表单**发不出来的**——它们属于「CORS 新引入的、更强的跨域能力」。浏览器为了**保护那些「只处理表单、不知道还有 CORS 这回事」的老服务端**，在发出这些「更强」的请求前，必须先 `OPTIONS` 问一句「你准备好了吗」。如果老服务端根本不认识 `OPTIONS`、没回正确的头，浏览器就**不发真实请求**，从而保护老服务端不被一个它「没预期到」的跨域写请求打中。

一句话收口：**预检请求是浏览器在「放行更强的跨域能力」之前，先替服务端做的一次「能力确认」**。

用 `curl` 绕过浏览器，手动扮演「发起预检的客户端」，直观看服务端回的 CORS 响应头：

```bash
curl -i -X OPTIONS \
  -H "Origin: http://a.com" \
  -H "Access-Control-Request-Method: PUT" \
  http://b.com/api
```

服务端会回类似这样的响应：

```text
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://a.com
Access-Control-Allow-Methods: PUT
Access-Control-Allow-Headers: content-type
Access-Control-Max-Age: 1800
```

这个实验的价值在于：**它把「浏览器内部自动完成的预检」拆出来给你看**——浏览器其实就是替你发了这么一条 `OPTIONS`，然后根据返回的 `Allow-*` 头决定「要不要发真实请求」。手动跑一遍，预检的机制就再也不是「浏览器黑盒」了。

> 💬 **面试官**：CORS 的简单请求和预检请求有什么区别？什么条件会触发预检？
>
> ✅ 标准答案：简单请求满足三个条件——方法为 `GET`/`POST`/`HEAD`、`Content-Type` 是 `text/plain`/`multipart/form-data`/`application/x-www-form-urlencoded` 之一、无自定义头，浏览器直接发请求、收到响应后检查 `Access-Control-Allow-Origin`。不满足任何一条（如 `PUT` 方法、`Content-Type: application/json`、带自定义头），浏览器就会先发一个 `OPTIONS` 预检请求，服务端回 `Access-Control-Allow-Methods`/`Allow-Headers` 明确允许后，才发出真实请求。
>
> 🎁 加分答案：能讲出「为什么要有预检」的设计动机——简单请求的语义等价于「传统 `<form>` 表单本来就能跨源发的请求」，所以只需响应头放行即可；而 `PUT`/`application/json`/自定义头是表单发不出来的「更强能力」，浏览器为了**保护那些只处理表单、不知道 CORS 的老服务端**，必须先 `OPTIONS` 确认对方「准备好了」，避免一个它没预期的跨域写请求打中它。能讲到这一层，说明你理解的不只是「预检是什么」，而是「预检为什么存在」。

### 3. `Access-Control-Allow-Credentials` 与凭证请求

第三个核心，是 CORS 里最容易写错、也最常被追问「为什么」的规则：**凭证（Cookie）请求**。

先记住一个默认行为：**跨域请求默认不携带 Cookie**。无论是 XHR 还是 fetch，跨域发请求时，浏览器不会自动带上目标域的 Cookie，除非你显式声明要带。fetch 里的开关是 `credentials`：

```javascript
// 默认：跨域请求不带 Cookie
fetch('http://api.example.com/api/data');

// 显式声明携带 Cookie（需要服务端配合）
fetch('http://api.example.com/api/data', {
  credentials: 'include'  // 👈 关键：带上 Cookie
});
```

一旦你声明了 `credentials: 'include'`，服务端就必须满足**两个强制条件**，否则浏览器依然拒绝：

- **必须回 `Access-Control-Allow-Credentials: true`**：告诉浏览器「我允许带凭证的跨域请求」
- **此时 `Access-Control-Allow-Origin` 不能是 `*`，必须回显具体的请求源**（比如 `http://localhost:3000`）

这个「**不能配 `*`**」的限制，是浏览器**刻意设计**的。为什么？想想如果允许 `Access-Control-Allow-Origin: *` + `Allow-Credentials: true` 同时存在，会有什么后果：

> 任何网站（无论多恶意）只要诱导用户访问，浏览器就会「自动带上目标网站的 Cookie」去请求目标网站，并且因为 `*` 允许任何源读响应，攻击者的恶意网站还能**读到这个带 Cookie 的响应内容**——这等于把「CSRF 的自动带 Cookie」和「CORS 的能读响应」合体，升级成了「能读到你登录态数据的任意跨域窃取」。

所以浏览器的规则是：**想用 `*` 图省事，就不能带凭证；想带凭证，就必须老老实实回显具体源**。这个「鱼与熊掌不可兼得」的约束，是 CORS 设计里防「凭证被大范围窃取」的核心安全机制。

> 💬 **面试官**：`Access-Control-Allow-Credentials` 有什么用？为什么配了它 `Access-Control-Allow-Origin` 就不能是 `*`？
>
> ✅ 标准答案：跨域请求默认不携带 Cookie，`fetch` 里设 `credentials: 'include'` 才会带；带了凭证，服务端就必须回 `Access-Control-Allow-Credentials: true`，且 `Allow-Origin` 不能是通配符 `*`，必须回显具体源。这是浏览器刻意设计的限制——防止「允许带凭证 + 允许任意源」的组合被滥用于大范围的凭证窃取。
>
> 🎁 加分答案：能说清「如果允许 `*` + 凭证会发生什么」——恶意网站诱导用户访问后，浏览器自动带 Cookie 请求目标站，而 `*` 又允许恶意网站读响应，等于把「CSRF 的自动带 Cookie」和「CORS 的能读响应」合体成「能读你登录态数据的跨域窃取」。还能补充：所以生产上做「带 Cookie 的跨域」（比如前后端分离 + Cookie 会话），`origin` 必须配白名单回显，不能图省事写 `*`。

### 4. Express/Koa 的 `cors` 包

手写版看懂了，再认识生产上真正在用的 `cors` 中间件。它做的事和上面手写的完全一样，只是把「根据配置动态计算响应头」封装成了配置项：

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

// 最简用法：允许所有源跨域
app.use(cors());

// 生产推荐：白名单 + 携带凭证
const whitelist = ['http://localhost:3000', 'https://his.example.com'];
app.use(cors({
  origin: function (origin, callback) {
    // 同源请求（没有 Origin 头）或白名单内的源 → 放行
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,        // 允许携带 Cookie（对应 Allow-Credentials）
  methods: ['GET', 'POST', 'PUT', 'DELETE'],  // 允许的方法
  allowedHeaders: ['Content-Type', 'Authorization'], // 允许的自定义头
  maxAge: 1800,             // 预检结果缓存 1800 秒
}));
```

对照手写版，每个配置项背后的含义一目了然：

- **`origin`**：决定 `Access-Control-Allow-Origin` 回什么。可以是布尔值（`true` 回显请求源）、数组（白名单）、函数（自定义逻辑）。**这是最容易写错的地方**——写 `*` 虽然省事，但一配合 `credentials` 就废了
- **`credentials`**：是否设置 `Access-Control-Allow-Credentials: true`，允许携带 Cookie
- **`methods` / `allowedHeaders`**：分别对应 `Access-Control-Allow-Methods` / `Access-Control-Allow-Headers`，**只在预检请求的响应里出现**
- **`maxAge`**：预检结果的缓存秒数，减少重复预检

> ✍️ Koa 的 `@koa/cors` 配置项几乎一模一样（`origin`/`credentials`/`allowMethods`/`allowHeaders`），核心逻辑也来自同一个思路——所以只要吃透了手写版那三个响应头，任何框架的 CORS 中间件都是「换个壳」。

---

## 三、CSRF：借用 Cookie 伪造请求

讲完「合法跨域通道」，开始讲「绕过边界的攻击」。第一个是 **CSRF（Cross-Site Request Forgery，跨站请求伪造）**——它的狡猾之处在于：**它不偷你的数据，而是「借用你的身份」替你发起请求**。

### 1. 攻击链路

1. 你已经在某个网站（比如医院 HIS 系统）登录了，浏览器里存着它的会话 Cookie
2. 攻击者诱导你访问一个**恶意页面**（钓鱼链接、广告、被黑的论坛帖子……）
3. 恶意页面里藏着一句会自动执行的代码，比如一个自动提交的 `<form>` 或一张 `<img>` 标签，指向 HIS 系统的「修改密码」「提交处方」这类接口
4. 浏览器发起这个请求时，**自动带上了 HIS 系统的 Cookie**（因为请求是发给 HIS 系统的，浏览器按规则带上它的 Cookie）
5. HIS 系统收到请求，一看带了有效的会话 Cookie，就认为「是用户本人操作的」，照常执行

**核心一句话：攻击者利用「浏览器会自动带目标站 Cookie」这个机制，让你在不知情的情况下，用自己的登录态去执行了一次你不想要的操作。**

它和同源策略的关系很微妙——还记得第 1 节的结论吗？**同源策略拦「读」不拦「写」**。CSRF 全程只需要「发请求」这个「写」动作，根本不需要读响应，所以**同源策略对 CSRF 完全无能为力**。这也是为什么前面说「CORS 防不住 CSRF」——CORS 管的是「跨域能不能读响应」，CSRF 压根不在乎能不能读，它只要请求能发出去、服务端肯执行就行。

### 2. 医院 HIS「处方提交接口」的防护实践

生产上最常见的组合拳是 **`SameSite=Strict` Cookie + 自定义请求头双重校验**：

```javascript
const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
app.use(cookieParser());

// 处方提交接口：双重校验防 CSRF
app.post('/api/prescriptions', (req, res) => {
  // 第一道：自定义请求头校验
  // 攻击者用 <form> 发起的跨站请求，无法携带自定义头 X-Requested-With
  if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
    return res.status(403).json({ error: '非法请求来源' });
  }
  // 第二道：SameSite Cookie 由 Set-Cookie 下发时声明（见下）
  // 业务逻辑：创建处方……
  res.json({ ok: true });
});

// 登录时下发 SameSite=Strict 的会话 Cookie
app.post('/api/login', (req, res) => {
  res.setHeader('Set-Cookie',
    'session=abc123; HttpOnly; SameSite=Strict; Secure');
  res.json({ ok: true });
});
```

这两个防御各自的「门槛」是：

- **`SameSite=Strict`**：浏览器看到这个 Cookie 属性后，**任何跨站请求都不会带上它**——攻击者从恶意站点发的请求，压根没有你的会话 Cookie，服务端自然不认
- **自定义请求头校验（`X-Requested-With`）**：攻击者只能用 `<form>` 或 `<img>` 这类标签发起跨站请求，而这些**原生标签发不出自定义头**；只有你自己的 JS（用 XHR/fetch）才能加自定义头。所以「带了自定义头」这个信号，基本等价于「这个请求来自我们自己的前端代码」

> ✍️ 为什么强调「双重校验」而不是单靠一个？因为 `SameSite` 需要浏览器支持（老浏览器不认），自定义头校验需要前端配合（所有写操作都要走 XHR/fetch 且带上头）。两个都是「提高攻击门槛」的手段，合在一起才能覆盖更多场景。这个「不把鸡蛋放一个篮子」的思路，贯穿本篇所有防御手段。

### 3. 防御手段的三条路线

防御手段有三条，各自的原理和局限都要记清：

- **`SameSite` Cookie 属性**：设置 `SameSite=Strict` 后，浏览器**跨站请求一律不带这个 Cookie**——恶意页面的请求没有你的会话，服务端自然不认。`Lax` 是折中：顶级导航（用户点链接）会带，`<img>`/`<form>` 这类跨站子请求不带。这是**最省事、效果最好**的现代方案
- **CSRF Token**：服务端生成一个一次性随机 token，嵌入表单或放进响应头；提交时前端回传，服务端校验。攻击者拿不到这个 token（同源策略让他读不到），所以伪造不了
- **校验 `Referer` / `Origin` 请求头**：真实请求来自本站，`Referer`/`Origin` 会是本站域名；恶意站发来的请求，`Origin` 会是攻击者的域名。但这两个头**可以被伪造或缺失**（有些环境不发送），所以只能作辅助，不能作唯一防线

> 💬 **面试官**：CSRF 攻击的原理是什么？`SameSite` Cookie 是怎么防御的？
>
> ✅ 标准答案：CSRF 是利用「浏览器会自动带目标站 Cookie」的机制——攻击者诱导已登录用户访问恶意页面，页面自动向目标站发请求，浏览器自动带上目标站 Cookie，服务端误以为是用户本人操作。`SameSite` 属性的防御原理是：设置 `SameSite=Strict` 后，浏览器**跨站请求一律不携带**这个 Cookie，恶意站点的请求没有会话凭证，服务端自然不认，从根上断掉攻击的前提。
>
> 🎁 加分答案：能说清三条防御的取舍——① `SameSite` 最省事但要浏览器支持、且 `Lax` 和 `Strict` 的边界要分清（顶级导航 vs 子请求）；② CSRF Token 最稳但要服务端存状态、前端配合回传，且 token 本身依赖「同源策略让攻击者读不到」；③ 校验 `Referer`/`Origin` 最简单但可被伪造/缺失、只能作辅助。还能点出 CSRF 和 CORS 的关系——CSRF 只需要「发请求」（写），不需要「读响应」，所以 CORS 管不着它，这是「CORS 防不住 CSRF」的根本原因。

---

## 四、XSS：注入脚本，三类攻击路径

第二个攻击是 **XSS（Cross-Site Scripting，跨站脚本攻击）**。和 CSRF「借用 Cookie」不同，XSS 是**「把你的恶意脚本注入到目标页面里执行」**——一旦脚本在你页面的上下文里跑起来，它就能做任何你页面 JS 能做的事：读 `document.cookie`、改 DOM、发请求、偷数据。

### 1. 三类攻击路径

XSS 按注入路径分三类，这是面试必背、也是要会「举例」的点：

- **存储型（Stored XSS）**：恶意脚本被**存进数据库**（比如用户提交的评论、昵称里藏了 `<script>`），之后每个加载这条数据的用户，页面都会执行这个脚本。危害最大——一次注入、持续攻击所有访问者。典型场景：论坛帖子、药品评论区的富文本
- **反射型（Reflected XSS）**：恶意脚本**包含在 URL 参数里**，服务端拿到参数后**未经转义直接输出到页面**，脚本在响应里原样返回并执行。需要诱导用户点击带毒的链接。典型场景：搜索框把用户输入原样回显（`/?q=<script>...`）
- **DOM 型（DOM-based XSS）**：**纯前端**问题，不经过服务端——前端 JS 处理不可信数据（如 `location.hash`、`location.search`）时，直接 `innerHTML` 塞进 DOM 导致脚本执行。服务端日志里完全看不到，因为请求根本没带上恶意脚本

三类里，存储型和反射型的问题在**服务端**（输出没转义），DOM 型的问题在**前端**（危险地操作 DOM）。但它们共享同一个核心防御：

**核心防御是「输出编码 + 输入校验」**——在任何「把不可信数据写进页面/HTML 上下文」的地方，先做转义（`<` → `&lt;`、`>` → `&gt;`、`"` → `&quot;`），让浏览器把数据当「文本」而不是「代码」渲染。输入校验是辅助（白名单、长度限制），**输出编码才是关键**——因为 XSS 的本质是「数据被当成了代码执行」，而输出编码就是「强制把代码降级回数据」。

### 2. `HttpOnly`：防的是「偷会话」，不是「防 XSS」

还有一道**「最后防线」**，这里要特别讲清它防的是什么：**`HttpOnly` Cookie 属性**。

`HttpOnly` 的作用是：**设置了这个属性的 Cookie，`document.cookie` 读不到它**。它防的是「XSS 已经发生后，脚本通过 `document.cookie` 窃取会话凭证」这条后续攻击链——换句话说，`HttpOnly` **不能阻止 XSS 发生**，它阻止的是「XSS 的后果之一（偷会话 Cookie）」。

> 打个比方：XSS 是「坏人进了你家」，`HttpOnly` 是「把保险箱焊死了」。它没阻止坏人进门，但让坏人进门前最想偷的东西（会话凭证）偷不走。这道防线呼应了 Node.js 系列第 06 篇认证体系里「会话凭证怎么存」的内容。

> 💬 **面试官**：XSS 分哪几类？`HttpOnly` 在防御链条里起什么作用？
>
> ✅ 标准答案：分三类——存储型（脚本存进数据库，所有访问者执行）、反射型（脚本在 URL 参数里，服务端未转义直接回显）、DOM 型（前端处理不可信数据直接操作 DOM，不经过服务端）。核心防御是「输出编码 + 输入校验」，其中输出编码是关键。`HttpOnly` 是「最后防线」——它不阻止 XSS 发生，而是让设置了它的 Cookie 无法被 `document.cookie` 读到，从而即使 XSS 成功，也偷不走会话凭证。
>
> 🎁 加分答案：能精确点出三类 XSS 的问题所在层——存储型/反射型在服务端（输出没转义），DOM 型在前端（危险操作 DOM）。还能强调「`HttpOnly` 防的是 XSS 的『后果』，不是 XSS 本身」，以及「为什么输出编码比输入校验更根本」——因为 XSS 的本质是「数据被当成代码执行」，输出编码是「把代码强制降级回数据」，输入校验只是减面。能把「输出编码 > 输入校验」和「HttpOnly 兜底」串成一条完整防御链，是加分项。

---

## 五、CSP：已经中招之后的纵深防御

XSS 的防御（输出编码）是「从源头堵住注入」，但现实里总会有漏网之鱼——某个角落的富文本没转义、某个第三方库有洞、某个老代码用了 `innerHTML`。这时候就需要**假设 XSS 已经发生，还能不能拦住脚本执行？** 答案就是 **CSP（Content Security Policy，内容安全策略）**。

### 1. 原理：资源白名单

CSP 的思路很直接：**服务端用 `Content-Security-Policy` 响应头，显式声明「这个页面允许从哪些来源加载脚本/样式/图片」**。浏览器拿到后，凡是来源不在白名单里的资源，一律拒绝加载。

**它和输出编码的防御层次完全不同**：输出编码是「预防」（让脚本进不来），CSP 是「兜底」（脚本进来了也执行不了）。这就是「纵深防御（Defense in Depth）」的典型体现——不指望任何单层防御是完美的，而是层层设防，攻击者要击穿所有层才能得手。

用一个具体的 XSS + CSP 场景把这条兜底逻辑说透：

```text
# 假设一个页面存在存储型 XSS，攻击者往评论里塞了：
#   <script src="https://evil.com/steal.js"></script>
# 服务端返回页面时，带了这条 CSP 响应头：
Content-Security-Policy: default-src 'self'; script-src 'self'
```

攻击者注入的 `<script>` 标签虽然成功进了页面，但浏览器一看 `script-src 'self'`——**这个脚本的来源是 `https://evil.com`，不在 `'self'`（同源）白名单里，直接拒绝执行**。脚本注入成功了，但执行不了，攻击落空。

### 2. CSP 指令族

先看一段最常见的 CSP 配置，理解每个指令在声明什么：

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:
```

逐个指令拆：

- **`default-src 'self'`**：兜底策略——没被单独指定的资源类型，默认只允许加载「同源」的资源
- **`script-src 'self'`**：脚本只允许来自同源。**这是 CSP 防 XSS 的核心**——内联脚本（`<script>alert(1)</script>` 这种）和外部恶意域名脚本，都会被拒
- **`style-src 'self' 'unsafe-inline'`**：样式允许同源 + 内联样式（`'unsafe-inline'` 是放行内联的开关，能用 hash/nonce 替代就尽量别开）
- **`img-src 'self' data:`**：图片允许同源 + `data:` 协议的 base64 图片

当浏览器拦截了一个违反 CSP 的资源时，控制台会报出这样的错：

```text
Refused to load the script 'https://evil.com/steal.js' because it violates
the following Content Security Policy directive: "script-src 'self'".
```

这句话直接告诉你：**哪个脚本被拦、违反了哪条指令、为什么拦**。CSP 的完整指令族（每个 `-src` 管一类资源）：

| 指令 | 管什么 | 示例 |
|------|--------|------|
| `default-src` | 兜底：没单独指定的资源类型 | `default-src 'self'` |
| `script-src` | 脚本（防 XSS 的核心） | `script-src 'self'` |
| `style-src` | 样式 | `style-src 'self' 'unsafe-inline'` |
| `img-src` | 图片 | `img-src 'self' data:` |
| `connect-src` | `fetch`/XHR/WebSocket 等连接 | `connect-src 'self' https://api.example.com` |
| `frame-ancestors` | 谁能把本页嵌进 `iframe`（防点击劫持） | `frame-ancestors 'self'` |

### 3. `'unsafe-inline'` 与 nonce/hash 的权衡

关于 CSP 还有一个进阶点，面试常用来区分「懂不懂 CSP 落地」：**`'unsafe-inline'` 和 `nonce`/`hash` 的权衡**。

- `script-src 'self' 'unsafe-inline'`：放行内联脚本。**省事但等于把 CSP 防 XSS 的能力废了一大半**——因为大多数 XSS 注入的就是内联脚本，你放行内联，等于告诉浏览器「注入的内联脚本也放行」
- 更好的做法：用 **`nonce`（一次性随机数）或 `hash`（脚本内容哈希）** 做白名单——只放行「带了这个随机 nonce」或「内容哈希匹配」的内联脚本，正常页面自己的内联脚本能过，攻击者注入的（没 nonce、哈希不匹配）一律拦

所以一句话：**CSP 要真正防住 XSS，`script-src` 就不能图省事开 `'unsafe-inline'`**，要用 nonce/hash 精确放行。这也是「为什么很多人配了 CSP 却还是被 XSS」的常见原因。

> 💬 **面试官**：CSP 是怎么在「已经发生 XSS」的情况下依然能拦截恶意脚本的？
>
> ✅ 标准答案：CSP 通过 `Content-Security-Policy` 响应头声明「允许从哪些来源加载资源」的白名单。即使页面存在 XSS 漏洞、恶意 `<script>` 被注入成功，只要脚本的来源（外部域名）或内联脚本（没 nonce/hash）不在白名单内，浏览器就会拒绝执行。它是「纵深防御」——不指望预防层（输出编码）完美，而是在注入已经发生时兜底拦截。
>
> 🎁 加分答案：能点出「`'unsafe-inline'` 会废掉 CSP 的 XSS 防护」这个关键坑——大多数 XSS 注入的是内联脚本，放行内联等于放行攻击，所以 `script-src` 要用 `nonce`（一次性随机数）或 `hash`（内容哈希）做精确白名单，而不是图省事开 `'unsafe-inline'`。还能举 CSP 的其它价值：`upgrade-insecure-requests` 强制升级 HTTPS、`frame-ancestors` 防点击劫持、`connect-src` 限制数据外发（防 XSS 偷数据后外传）。

---

## 六、点击劫持与 `helmet` 收口

### 1. 点击劫持（Clickjacking）

第三个攻击是 **点击劫持（Clickjacking）**，它和前两个攻击的思路完全不同——**它既不借用 Cookie（CSRF），也不注入脚本（XSS），而是「伪造点击」**。

攻击手法是这样的：攻击者把受害目标网站（比如医院 HIS 系统的「确认转院」按钮页）嵌进一个**透明的 `<iframe>`**，把这个透明 iframe 覆盖在一个「诱导用户点击」的按钮（比如「领取体检报告」「抽奖」）之上。用户看到的、想点的是「领取体检报告」，但鼠标实际落下的，是透明 iframe 里 HIS 系统的「确认转院」按钮。

**关键点：整个过程中没有任何脚本注入，用户的会话 Cookie 也是合法的**——所以 CSRF 的 `SameSite`、XSS 的输出编码，对它**统统无效**。它利用的是「用户自己在点击」这个行为，攻击者只是「把真实的按钮藏在了假的按钮下面」。

防御靠两个响应头（都是 `helmet` 一键设置的成员，见下一小节）：

- **`X-Frame-Options`（旧方案）**：控制「本页能不能被 `<iframe>` 嵌入」。`DENY`（任何网站都不能嵌入）、`SAMEORIGIN`（只有同源能嵌入）。缺点是只能二选一、表达不了「允许某几个特定来源」
- **CSP 的 `frame-ancestors`（新方案）**：功能更强，能**精确指定「允许哪些来源把本页嵌进 iframe」**，比如 `frame-ancestors 'self' https://trusted.example.com`。它其实也是 CSP 指令族的一员（见上一节的表）

浏览器对两者的兼容性：现代浏览器两者都支持，`frame-ancestors` 更灵活、是推荐的新方案；`X-Frame-Options` 作为老浏览器兜底保留。**两个都配上，是最稳的姿势**——老的浏览器认 `X-Frame-Options`，新的认 `frame-ancestors`，全覆盖。

> 💬 **面试官**：点击劫持的原理是什么？`X-Frame-Options` 和 CSP 的 `frame-ancestors` 怎么防御？
>
> ✅ 标准答案：点击劫持是攻击者把受害网站嵌进透明 `<iframe>`，覆盖在诱导按钮之上，用户以为点的是「领奖」，实际点到了透明 iframe 里的「确认转账」等敏感按钮。它不依赖脚本注入，所以 XSS 的防御对它无效。防御靠两个响应头：`X-Frame-Options: DENY/SAMEORIGIN`（旧，控制能否被嵌入）和 CSP 的 `frame-ancestors`（新，能精确指定允许哪些来源嵌入本页）。
>
> 🎁 加分答案：能点出点击劫持和 CSRF/XSS 的本质区别——它不借用 Cookie、不注入脚本，利用的是「用户自己在点击」，所以 `SameSite`/输出编码都拦不住它。还能补充 `X-Frame-Options` 和 `frame-ancestors` 的取舍——`X-Frame-Options` 只能 DENY/SAMEORIGIN 二选一、表达不了「允许特定来源」；`frame-ancestors` 能列具体来源白名单，是推荐的新方案，两者都配实现新老浏览器全覆盖。

### 2. 对比 Node.js：`helmet` 中间件

最后落地到 Node.js，把前面分散的「安全响应头」收口成一个工程实践。

前面几节你认识了：防点击劫持的 `X-Frame-Options`、防 XSS 兜底的 CSP、以及 TLS 篇（03）讲过的 HSTS。这些「安全响应头」在 Express/Koa 生态里，有一个**一键全开的中间件叫 `helmet`**——它本质上就是「一次设置好一整套安全响应头」的合集：

```javascript
const express = require('express');
const helmet = require('helmet');
const app = express();

// 默认开一整组安全头
app.use(helmet());
```

`helmet` 默认帮你设上的那一整套头，每一个背后对应一种攻击，正好把本篇讲的「纵深防御」串起来：

| 响应头 | 防御的攻击 |
|--------|-----------|
| `Content-Security-Policy` | XSS 兜底拦截 |
| `Strict-Transport-Security`（HSTS） | 降级攻击（强制 HTTPS） |
| `X-Frame-Options` | 点击劫持 |
| `X-Content-Type-Options: nosniff` | MIME 嗅探导致的脚本执行 |
| `Referrer-Policy` | 泄露来源信息 |

**为什么理解每个头背后的攻击才能正确配置？** 这是用 `helmet` 的核心心法：`helmet` 只是「帮你把响应头都设上」，但**每个头「该设成什么值」取决于你的业务**——比如 `helmet` 默认的 CSP 可能和你的 CDN、内联脚本冲突，你不理解 `script-src` 的含义，就没法调出「既不误伤自己、又能拦攻击」的配置。

这一块的「怎么用 `helmet` 精细配置每个头、CSP 的 nonce 怎么落地」属于 Node.js 工程化的实战内容，具体展开留给 Node.js 系列「工程化」篇的安全实践小节——本篇只讲清「这些头分别防什么、为什么理解攻击才能配对」这个原理层的问题。

> 💬 **面试官**：`helmet` 中间件做了什么？为什么说「理解每个响应头背后的攻击才能正确配置」？
>
> ✅ 标准答案：`helmet` 是 Express/Koa 生态的中间件，本质是「一次设置好一整套安全响应头」的合集——CSP、HSTS、`X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy` 等，每个头对应一种攻击（XSS、降级、点击劫持、MIME 嗅探、来源泄露）。
>
> 🎁 加分答案：能强调「`helmet` 只是设上头，值要按业务调」——它默认的 CSP 可能和你的 CDN、内联脚本冲突，不理解 `script-src`/`frame-ancestors` 这些指令的含义，就调不出「既不误伤自己又能拦攻击」的配置。还能把本篇的「纵深防御」收口：这组安全头不是零散的，而是一个「预防（编码）+ 兜底（CSP）+ 边界（frame/HSTS）」的防御矩阵。

---

## 参考资料

- https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS （CORS 机制权威二级来源）
- https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CSP （CSP 指令与用法）
- https://owasp.org/www-community/attacks/csrf （CSRF 攻击与防御）

> 权威来源索引：CORS 的正式定义在 **Fetch 标准（WHATWG）的 CORS 协议章节**（简单请求判定条件、预检流程），不在某个 RFC 里；CSP 的规范是 **W3C Content Security Policy Level 3**（各 `-src` 指令白名单匹配规则）；`cors` 中间件的核心逻辑见 `expressjs/cors` 仓库 `lib/index.js`（`configureOrigin` 与 `isOriginAllowed` 两个函数）。

> 推荐搜索关键词：「同源策略 三要素」「CORS 简单请求 预检请求 区别」「Access-Control-Allow-Credentials 不能配 *」「CSRF SameSite 防御」「XSS 存储型 反射型 DOM型」「HttpOnly 防什么」「CSP script-src nonce」「点击劫持 X-Frame-Options frame-ancestors」。

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 考察频率 |
|--------|-----------|---------|
| 同源策略 | 协议+域名+端口一致才同源；拦「读」不拦「加载/写」 | ⭐⭐⭐ 必考 |
| 简单请求 vs 预检 | 简单=GET/POST/HEAD+三种 Content-Type+无自定义头；否则先 `OPTIONS` 预检 | ⭐⭐⭐ 必考 |
| 凭证请求 | 默认跨域不带 Cookie；带凭证则 `Allow-Origin` 不能是 `*`、必须回显具体源 | ⭐⭐⭐ 必考 |
| CSRF | 借「浏览器自动带 Cookie」伪造请求；`SameSite` 让跨站请求不带 Cookie | ⭐⭐⭐ 必考 |
| XSS | 注入脚本三类（存储/反射/DOM）；输出编码预防，`HttpOnly` 兜底防偷会话 | ⭐⭐⭐ 必考 |
| CSP | 资源白名单，注入成功也拒绝执行；别开 `'unsafe-inline'`，用 nonce/hash | ⭐⭐⭐ 必考 |
| 点击劫持 | 透明 iframe 伪造点击；`X-Frame-Options`/`frame-ancestors` 防嵌入 | ⭐⭐⭐ 必考 |
| helmet | 一键设整套安全响应头；值要按业务调，理解每个头的攻击才能配对 | ⭐⭐ 高频 |

> 💡 记住这条主线：**同源策略是浏览器「默认拒绝」的安全边界，拦的是跨源「读」；CORS 是它开的「白名单后门」，用「简单请求/预检请求/凭证请求」三种机制在「放行跨域」和「防滥用」之间走钢丝；而 CSRF（借 Cookie）、XSS（注入脚本）、点击劫持（伪造点击）是三条绕过边界的攻击路径，同源策略拦不住 CSRF（它只发不读）、CORS 也防不住 CSRF；于是有了纵深防御——输出编码预防 XSS、CSP 兜底拦截、`SameSite`/`HttpOnly` 锁住 Cookie、`frame-ancestors` 锁住 iframe，最终被 `helmet` 一键收口成安全响应头矩阵**。把这条线串起来，跨域与安全的所有面试题都能从原理推到答案。

---

## 💡 面试核心问

- **什么是同源策略？它限制的具体是什么行为？**（协议+域名+端口一致才同源；拦跨源「读」Cookie/DOM/响应，不拦「加载」`<script>`/`<img>` 和「发请求」）
- **CORS 的简单请求和预检请求的区别是什么？什么条件会触发预检？**（简单=GET/POST/HEAD+三种 Content-Type+无自定义头、直接发；否则先 `OPTIONS` 预检、服务端回 `Allow-*` 后才发真实请求）
- **CSRF 攻击的原理是什么？`SameSite` 是怎么防御的？**（借「浏览器自动带 Cookie」伪造请求；`SameSite=Strict` 让跨站请求不带 Cookie，断掉攻击前提）
- **XSS 分哪几类？`HttpOnly` 在防御链条里起什么作用？**（存储型/反射型/DOM 型；`HttpOnly` 不防 XSS 本身，而是让 Cookie 无法被 `document.cookie` 读到，防「偷会话」这个后果）
- **CSP 是怎么在「已经发生 XSS」的情况下依然能拦截恶意脚本的？**（资源白名单：来源不在 `script-src` 白名单、内联没 nonce/hash，就拒绝执行——纵深防御的兜底层）
- **点击劫持的原理是什么？`X-Frame-Options` 和 `frame-ancestors` 怎么防御？**（透明 iframe 覆盖诱导点击，不靠脚本注入；两响应头控制「谁能把本页嵌进 iframe」）

---

## 📝 留个问题

前面反复强调「CORS 防不住 CSRF」，那问题来了：**既然 CSRF 只需要「发请求」、不需要「读响应」，而 CORS 管的恰好是「能不能读响应」——那是不是意味着，一个只配了 CORS 的站点，在 CSRF 面前和不配 CORS 时一样脆弱？如果是，那 CORS 到底「保护」的是什么、「不保护」的又是什么？**

提示：想想「同源策略拦读不拦写」这条底线，再想想 CSRF 和「跨域读数据」这两件事，分别落在同源策略的「读」还是「写」上。

欢迎评论区写出你的答案 👇

---

> 🔖 这是「网络原理深度拆解」系列第 07 篇。上一篇：《WebSocket 深度拆解：握手协议、帧格式、心跳保活与 SSE 选型对比》；下一篇预告：《HTTP 缓存体系：强缓存/协商缓存/Service Worker 缓存策略实战》
>
> 前置基础扩展阅读：搜索关键词「HTTP 请求头 Origin Referer」「Cookie 属性 SameSite HttpOnly Secure」「TLS HSTS 降级攻击」
