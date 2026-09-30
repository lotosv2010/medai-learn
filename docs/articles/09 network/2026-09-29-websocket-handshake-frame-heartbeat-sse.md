# WebSocket 深度拆解：握手协议、帧格式、心跳保活与 SSE 选型对比（面试收藏级）

> **副标题**：从一次 HTTP 请求升级为持久连接、二进制帧格式设计、心跳保活与断线重连、与 SSE 的选型对比

> 面试官问「WebSocket 握手里 `Sec-WebSocket-Accept` 是怎么算出来的？为什么只有客户端发往服务端的帧要掩码？「僵尸连接」是怎么产生的？」——大多数人能背出「先升级协议、再收发帧」，但继续追问「这个固定 GUID 拼在 Key 后面的作用是什么」「掩码到底防的是谁」「TCP keepalive 和 HTTP keep-alive 跟 WebSocket 心跳是不是一回事」，能一路答到「协议设计动机」这一层的，我面过的候选人里不到一成。这篇文章，就把 WebSocket 从头到脚彻底讲透。

---

## 🎯 这篇文章解决什么问题

这是「网络原理深度拆解」系列的第 **06** 篇。前五篇你已经打通了 DNS（01）、TCP（02）、HTTPS/TLS（03）、HTTP 演进（04）、HTTP 语义（05）。但到这里有个悬而未决的问题，正好是这篇要回答的：**HTTP 是半双工的，客户端不请求、服务端就不能主动推数据**——那「检验报告一出来就实时推给医生工作台」「AI 对话一个字一个字往外蹦」这种场景，靠什么实现？

答案有两条路：一条是「在 HTTP 上打补丁」——短轮询、长轮询、iframe 流、SSE（Server-Sent Events）；另一条是「另起炉灶升级协议」——WebSocket。这两条路的演进和取舍，就是本篇的主线。

在分层大地图里，本篇落在**应用层**，是后面跨域安全（07）、缓存体系（08）、API 设计（09）、反向代理（10）的同层邻居。它和 05 篇《HTTP 语义》的关系最紧密——因为 WebSocket 的握手，本质上就是一次「语义特殊」的 HTTP 请求，只是这次请求把连接「拐」进了另一个协议。

这篇文章做三件事：

- **讲透原理**：从「轮询 → 长轮询 → SSE → WebSocket」的演进主线，到握手算法、二进制帧格式、掩码、心跳保活、三种 keepalive 辨析，再到 SSE 选型对比
- **讲清工具**：Chrome DevTools 的 Frames 面板、`wscat` 命令行、浏览器控制台怎么逐帧「看」真实通信
- **讲会面试**：每个知识点讲完，立刻跟上「面试官会怎么考、标准答案是什么、怎么答加分」

全篇示例统一用医疗场景——医院 HIS 系统里「检验报告完成实时推送给医生工作台」这个真实需求，贯穿短轮询到 WebSocket 的每一阶段。**既讲原理，也讲面试怎么答**——读完这篇，WebSocket 这一栏从「会背概念」到「能讲清为什么」，面试官的眼睛会不一样。

---

## 一、使用与实践

先动手，把 WebSocket 这件事变成能看见的东西。这一节用浏览器原生 `WebSocket` API 和 DevTools，把「建立连接、收发消息、观察帧」逐个「看进眼里」。

### 1. 浏览器 WebSocket 对象的基本用法

WebSocket 是 HTML5 开始提供的一种浏览器与服务器进行全双工通讯的网络技术。它属于**应用层协议**，基于 TCP 传输协议，并**复用 HTTP 的握手通道**——通俗讲，就是在客户端和服务器之间保有一个持久的连接，两边可以在任意时间开始发送数据。

在浏览器里，创建一个 WebSocket 连接只需要一行，然后通过四个事件回调处理连接生命周期：

```html
<script>
  let ws = new WebSocket('ws://localhost:8888');
  ws.onopen = function () {
    console.log('客户端连接成功');
    ws.send('hello');           // 👈 连接建立后，随时可以主动发消息
  }
  ws.onmessage = function (event) {
    console.log('收到服务器的响应 ' + event.data);  // 👈 event.data 是服务端推来的数据
  }
</script>
```

四个核心事件，就是 WebSocket 客户端编程的全部骨架：

- `onopen`：连接建立（握手成功）后触发，之后才能 `send`
- `onmessage`：收到服务端消息触发，数据在 `event.data` 里
- `onclose`：连接关闭触发（主动关闭或异常断开）
- `onerror`：发生错误触发（网络错误、握手失败等）

服务端用 Node.js 生态最常用的 `ws` 库，几行就能搭起来：

```javascript
let express = require('express');
const path = require('path');
let app = express();
let server = require('http').createServer(app);
app.get('/', function (req, res) {
  res.sendFile(path.resolve(__dirname, 'index.html'));
});
app.listen(3000);

//-----------------------------------------------
let WebSocketServer = require('ws').Server;
let wsServer = new WebSocketServer({ port: 8888 });
wsServer.on('connection', function (socket) {
  console.log('连接成功');
  socket.on('message', function (message) {
    console.log('接收到客户端消息:' + message);
    socket.send('服务器回应:' + message);   // 👈 服务端也能随时主动发消息
  });
});
```

注意这里的**对称性**：客户端和服务端都持有 `send`（发）和 `onmessage`（收），任何一方都能主动发——这正是 WebSocket 和 SSE 最本质的区别（后面选型对比会重点讲）。

### 2. 用 Chrome DevTools 观察 101 与帧内容

DevTools 的 Network 面板是理解 WebSocket 的第一现场。打开一个使用了 WebSocket 的页面，在 Network 面板里找到那条 `ws://` 请求：

- **Headers 面板**：能看到握手时的那次「HTTP 请求」和「`101 Switching Protocols`」响应，以及 `Upgrade`/`Sec-WebSocket-Key`/`Sec-WebSocket-Accept` 这些关键头
- **Frames 面板**：握手之后，所有收发消息都以「帧」的形式列出——每一行是方向（绿箭头=发、红箭头=收）、数据长度、内容，还能展开看单帧的 FIN/opcode/MASK 标志

这里先记住一个现象：**握手是 HTTP，握手之后是帧**。你在 Headers 面板看到的是 HTTP 报文，在 Frames 面板看到的已经完全是另一种东西了——这个「切换」，就是本篇第二部分要讲透的核心。

### 3. 医院 HIS 的实时推送场景

在医疗场景里，有一个再典型不过的实时通信需求：**检验科把检验报告做完，系统要立刻推送给开单医生的电脑工作台**，而不是让医生手动刷新页面去查。

这个需求有几个特点，恰好就是 WebSocket 的用武之地：

- **实时性**：报告一出来医生就要看到，不能等医生刷新
- **长连接**：医生工作台开机登录后，会保持在线好几个小时，需要一条持久连接
- **服务端主动**：触发点是「检验科完成报告」这个服务端事件，不是客户端发起的请求

如果用最原始的「短轮询」——医生工作台每隔 1 秒 `setInterval` 发一次请求问「有没有我的新报告」——既浪费连接、又有最多 1 秒的延迟，检验科完成报告的那个瞬间医生看不到。WebSocket 在这里的价值，就是把这「最多 1 秒的延迟」变成「几乎瞬时」。这个对比，第二部分会展开成一条完整的演进线。

### 4. EventSource（SSE）的基本用法对比

如果场景退一步——**只需要服务端单向推给客户端，客户端不需要主动发**——那还有一条更简单的路：SSE（Server-Sent Events），浏览器端用 `EventSource` 对象实现。

浏览器端，创建一个 `EventSource` 对象，传入服务端接口 URI，然后侦听事件：

```html
<script>
  var eventSource = new EventSource('/eventSource');
  eventSource.onmessage  = function(e){
    console.log(e.data);      // 👈 默认 message 事件，接收服务端推来的数据
  }
  eventSource.onerror  = function(err){
    console.log(err);
  }
</script>
```

服务端对应的 MIME 格式是 `text/event-stream`，消息的每个字段用 `\n` 分割，需要四个规范定义好的字段：

- `Event`：事件类型
- `Data`：发送的数据
- `ID`：每一条事件流的 ID
- `Retry`：告知浏览器连接丢失后重新连接前的等待时间

```javascript
let  express = require('express');
let app = express();
app.use(express.static(__dirname));
let sendCount = 1;
app.get('/eventSource',function(req,res){
  res.header('Content-Type','text/event-stream',);
  setInterval(() => {
    res.write(`event:message\nid:${sendCount++}\ndata:${Date.now()}\n\n`);
  }, 1000)
});
app.listen(8888);
```

也可以借助 `ssestream` 这类库封装，把 `retry`（断线重连间隔）也显式写出来：

```javascript
let  express = require('express');
let app = express();
app.use(express.static(__dirname));
const SseStream = require('ssestream');
let sendCount = 1;
app.get('/eventSource',function(req,res){
  const sseStream = new SseStream(req);
  sseStream.pipe(res);
  const pusher = setInterval(() => {
    sseStream.write({
      id: sendCount++,
      event: 'message',
      retry: 20000, // 告诉客户端，断开连接后 20 秒后再重试连接
      data: {ts: new Date().toTimeString()}
    })
  }, 1000)

  res.on('close', () => {
    clearInterval(pusher);
    sseStream.unpipe(res);
  })
});
app.listen(8888);
```

这里先有一个直观对比记住：**`EventSource` 只能收、不能发**——它没有 `send` 方法。浏览器原生支持「连接断开后自动重连」（靠 `retry` 字段），这是 SSE 相对 WebSocket 的一个省心之处。什么场景选哪个，第二部分有完整的决策逻辑。

### 5. 心跳保活的前端实现

WebSocket 建立后有个隐患：**TCP 连接长时间没数据传输，中间的 NAT 设备或负载均衡器可能因为空闲超时，静默地把这条连接丢弃掉**——而客户端和服务端都还「以为」连接是好的，这时的连接叫「僵尸连接」。第二部分会讲透它的原理，这里先看前端怎么用「心跳」来发现并应对它。

最直接的做法是：客户端定时发一个 `ping`，服务端收到后回一个 `pong`，如果超过阈值没收到 `pong`，就判定连接已断开、触发重连：

```javascript
let ws = new WebSocket('ws://localhost:8888');
let heartBeatTimer = null;
let serverTimeoutTimer = null;

function startHeartBeat() {
  heartBeatTimer = setInterval(() => {
    ws.send('ping');                      // 👈 定时发心跳
    serverTimeoutTimer = setTimeout(() => {
      ws.close();                         // 👈 超时未收到 pong，判定断开
    }, 5000);
  }, 30000);
}

ws.onopen = function () {
  startHeartBeat();
};

ws.onmessage = function (event) {
  if (event.data === 'pong') {
    clearTimeout(serverTimeoutTimer);     // 👈 收到 pong，说明还活着
  }
};

ws.onclose = function () {
  clearInterval(heartBeatTimer);
  // 👈 这里触发重连逻辑，如指数退避后重新 new WebSocket()
};
```

注意：这里前端发的 `ping`/`pong` 是**业务层自定义的消息**（字符串），和 WebSocket 协议内置的 `ping`/`pong` **控制帧**不是一回事。浏览器原生 API 会自动处理协议层的 ping/pong 控制帧，开发者无感知；业务层的心跳是另一层保险，两者叠加才完整。这个区别，正是「三种 keepalive」辨析里的关键一环。

> 💬 **面试官**：WebSocket 客户端编程的核心 API 是什么？四个事件分别在什么时候触发？
>
> ✅ 标准答案：核心是 `new WebSocket(url)` 建立连接，四个事件回调——`onopen`（握手成功、可开始收发）、`onmessage`（收到服务端消息，数据在 `event.data`）、`onclose`（连接关闭）、`onerror`（发生错误）。建立后客户端和服务端都能通过 `send` 主动发消息。
>
> 🎁 加分答案：能补充「对称性」这个本质——`send`/`onmessage` 在客户端和服务端都存在，任何一方都能主动发，这是 WebSocket 全双工、区别于 `EventSource`（只能收不能发）的关键；再加一句「心跳保活」——浏览器原生 WebSocket API 会自动处理协议层 ping/pong 控制帧，但业务层通常还要自己再发一层心跳来应对 NAT 空闲超时导致的「僵尸连接」。

---

---

## 二、设计与原理

这是本篇的核心。下面按「先讲演进主线 → 再拆握手 → 帧格式 → 掩码 → 手写实现 → 心跳 → 三种 keepalive → SSE 选型 → 负载均衡」的顺序，由浅入深讲透。

### 1. 从轮询到 WebSocket：实时通信的演进主线

要真正理解 WebSocket 为什么长这样，得先回答一个问题：**HTTP 本来就是「服务器不能主动推数据」的，那实时通信的需求是怎么一路挣扎过来的？**

笔记里点出了 HTTP 的一个根本特性：**HTTP 是半双工协议**——同一时刻数据只能单向流动，客户端向服务器发送请求（单向），然后服务器响应请求（单向）。**服务器不能主动推送数据给浏览器**。这是一个结构性约束，不是配置问题。

为了绕开这个约束，历史上出现过一条清晰的演进线。这条线是理解「SSE 和 WebSocket 各自解决了什么」的地基——**每看一个阶段，都要问一句：它比上一个阶段解决了什么？又留下了什么新问题？**

**第一阶段：短轮询（Polling）**

最原始的做法：客户端每隔一段时间就发一次 HTTP 请求，问「有没有新数据」。

```javascript
let express = require('express');
let app = express();
app.use(express.static(__dirname));
app.use(function(req,res,next){
  res.header('Access-Control-Allow-Origin', 'http://localhost:8000');
  res.end(new Date().toLocaleTimeString());
});
app.listen(8080);
```

```html
<body>
  <div id="clock"></div>
  <script>
    setInterval(function () {
      let xhr = new XMLHttpRequest();
      xhr.open('GET', 'http://localhost:8080', true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
          document.querySelector('#clock').innerHTML = xhr.responseText;
        }
      }
      xhr.send();
    }, 1000);
  </script>
</body>
```

短轮询的本质是「定时问、问完就断」。它的缺点很直观：

- **连接数多**：每次请求都要经历「建立连接 → 发请求 → 收响应 → 断开连接」，一个接收一个发送
- **流量浪费**：每次发送请求都会带完整的 HTTP Header，而这些 Header 大部分是重复的，真正需要的数据却很少，很耗流量
- **CPU 浪费**：大量空查询，服务器空转

![轮询：客户端周期性地发请求询问](https://cdn.nlark.com/yuque/0/2025/png/738210/1742868658285-0d8cba29-b6e9-4497-b0b6-6c58db2cf4b8.png)

**第二阶段：长轮询（Long Polling）**

短轮询的问题在于「问得太勤、又太机械」。长轮询改进了这一点：客户端发一个请求后，服务端**不立即返回**，而是「挂起」这个请求，直到有新数据才响应；客户端收到响应后，立刻再发下一个请求，继续挂起等待。

```html
<div id="clock"></div>
<script>
  (function poll() {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', 'http://localhost:8080', true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4 && xhr.status == 200) {
        document.querySelector('#clock').innerHTML = xhr.responseText;
        poll();   // 👈 收到响应后，立刻发下一个请求继续挂起
      }
    }
    xhr.send();
  })();
</script>
```

![长轮询：服务端挂起请求，直到有新数据才响应](https://cdn.nlark.com/yuque/0/2025/png/738210/1742868658787-c05971dc-41c5-46a8-837f-7e7cf17f9f5c.png)

长轮询的改进是「实时性更好、空查询更少」——从「客户端定时盲目地问」变成「服务端有数据才答」。但它没有根治问题：

- 每个请求**仍然要占一个连接**，服务端要同时挂起大量连接
- 仍然有**往返开销**，每次响应结束连接就断了，下一条消息还得重新建立
- HTTP 数据包头部通常有 400 多字节，真正需要的数据往往只有十几个字节，周期性传输这些大头，对带宽仍是浪费

> 长轮询需要有很高的并发能力——因为服务端要同时「挂住」大量客户端的请求等待数据。

**第三阶段：iframe 流（Streaming）**

另一个早期技巧：在页面里嵌入一个**隐藏的 iframe**，把它的 `src` 指向一个长连接请求，服务端就能源源不断地往客户端推数据。

```javascript
const express = require('express');
const app = express();
app.use(express.static(__dirname));
app.get('/clock', function (req, res) {
  setInterval(function () {
    res.write(`
            <script type="text/javascript">
                parent.document.getElementById('clock').innerHTML = "${new Date().toLocaleTimeString()}";
            </script>
        `);
  }, 1000);
});
app.listen(8080);
```

```html
<div id="clock"></div>
<iframe src="/clock" style=" display:none" />
```

![iframe 流：服务端通过一个长连接不断 flush 数据](https://cdn.nlark.com/yuque/0/2025/png/738210/1742868657493-e57818e0-4413-4abc-9edc-f8cbcd3ec56f.png)

iframe 流的思路是「维持一条长连接持续写数据」，但它本质上还是 HTTP 的「半双工 + 文本」，客户端依然没法反向发消息，而且实现依赖 iframe 这个别扭的载体，早已不是主流。

**第四阶段：SSE 与 WebSocket**

到这里，两个「正规军」登场了。SSE 我们第一部分已经用过——它基于普通 HTTP 长连接 + `text/event-stream`，让服务端能在**一个连接上持续单向推送**，浏览器原生支持自动重连。WebSocket 则干脆**升级协议**，变成全双工持久连接。

把四个阶段串成一条主线，就是这张表：

| 方案 | 实时性 | 连接占用 | 能否客户端主动发 | 本质 |
|------|--------|---------|----------------|------|
| 短轮询 | 差（定时盲问） | 频繁建连断开 | 能（但每次都是新请求） | 定时问 + 立刻断 |
| 长轮询 | 较好（有数据才答） | 常驻挂起 | 能（响应后重发） | 挂起等数据 |
| SSE | 好 | 一条长连接 | **不能**（单向） | HTTP 长连接单向推 |
| WebSocket | 最好 | 一条持久连接 | **能**（全双工） | 升级协议双向通 |

> 💬 **面试官**：短轮询、长轮询、SSE、WebSocket 分别解决了什么问题？演进的主线是什么？
>
> ✅ 标准答案：主线是「**在服务器不能主动推数据的 HTTP 约束下，逐步逼近实时 + 双向**」。短轮询解决「有了实时通信」这个从无到有，但实时性差、浪费连接；长轮询把「客户端盲问」改成「服务端有数据才答」，实时性变好，但仍占连接、有往返开销；SSE 用一条 HTTP 长连接做单向持续推送，省了反复建连，但客户端不能主动发；WebSocket 升级协议成全双工持久连接，客户端也能随时发消息。
>
> 🎁 加分答案：能点出「每个方案相比上一个**解决的是什么、留下的是什么**」，而不是孤立背特点——短轮询的痛点是「空查询和重复建连」，长轮询解决了空查询但没解决占连接；SSE 解决了占连接（一条长连接）但牺牲了双向；WebSocket 把双向也拿回来，代价是「不再是普通 HTTP，要处理握手/掩码/心跳这套协议复杂度」。这条「渐进补足」的演进逻辑，比背四个名词值钱得多。

### 2. WebSocket 的优势

在讲协议细节之前，先明确 WebSocket 到底「赢」在哪，这样后面每个设计点都能对号入座：

- **支持双向通信，实时性更强**：这是最核心的——客户端能主动发，服务端也能主动推
- **更好的二进制支持**：帧可以直接携带二进制数据，不像文本协议要编码
- **较少的控制开销**：连接建立后，数据交换时的协议控制数据包头部很小（这就是「帧格式」设计的功劳，下一节展开）

### 3. WebSocket 握手过程（重点）

WebSocket 复用了 HTTP 的握手通道——具体说，客户端先通过一个 **HTTP 请求**与 WebSocket 服务端**协商升级协议**，协议升级完成后，后续数据交换才遵照 WebSocket 的协议。所以理解握手的关键就一句话：**握手是 HTTP，握手之后是帧**。

**客户端：申请协议升级**

客户端先发起协议升级请求。它采用**标准的 HTTP 报文格式，且只支持 GET 方法**：

```basic
GET ws://localhost:8888/ HTTP/1.1
Host: localhost:8888
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Version: 13
Sec-WebSocket-Key: IHfMdf8a0aQXbwQO1pkGdA==
```

三个关键头，各自的作用：

- `Connection: Upgrade`：表示「要升级协议」
- `Upgrade: websocket`：表示「要升级到 websocket 协议」
- `Sec-WebSocket-Version: 13`：表示 websocket 的版本号
- `Sec-WebSocket-Key`：客户端随机生成的 base64 字符串，和服务端响应头里的 `Sec-WebSocket-Accept` 配套，提供基本防护（防恶意连接、防无意连接）

**服务端：响应协议升级**

服务端返回状态码 **101 Switching Protocols**，表示「协议切换」：

```basic
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: aWAY+V/uyz5ILZEoWuWdxjnlb7E=
```

到这一步，协议升级完成，后续的数据交互都按照 WebSocket 的新协议来。**这个 TCP 连接，就从「HTTP 的一问一答」切换成了「WebSocket 的帧语义」**。

**Sec-WebSocket-Accept 的计算**

`Sec-WebSocket-Accept` 是根据客户端请求头里的 `Sec-WebSocket-Key` 计算出来的。计算公式为：

- 将 `Sec-WebSocket-Key` 跟固定 GUID `258EAFA5-E914-47DA-95CA-C5AB0DC85B11` 拼接
- 通过 SHA1 计算出摘要，再转成 base64 字符串

用 Node.js 一行就能验证：

```javascript
const crypto = require('crypto');
const number = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const webSocketKey = 'IHfMdf8a0aQXbwQO1pkGdA==';
let websocketAccept = require('crypto').createHash('sha1').update(webSocketKey + number).digest('base64');
console.log(websocketAccept);//aWAY+V/uyz5ILZEoWuWdxjnlb7E=
```

算出来的 `aWAY+V/uyz5ILZEoWuWdxjnlb7E=`，正是上面响应头里的值。

**Sec-WebSocket-Key / Accept 的作用**

这个「Key 拼接固定 GUID 再取 SHA-1 再 base64」的固定算法，作用有两条：

- **避免服务端收到非法的 websocket 连接**
- **确保服务端理解 websocket 连接**——因为算法是固定的，只有「真的实现了 WebSocket 协议」的服务端才能正确算出 `Accept` 值；一个普通的 HTTP 服务器看到 `Upgrade: websocket` 会一脸懵，自然回不出正确的 `Accept`，连接就建立不起来

这里有一个**极其重要、面试常考的澄清**：`Sec-WebSocket-Key` 的主要目的**并不是保证数据安全**。因为这个转换公式是公开的、而且非常简单，任何中间人都能算。它最主要的作用是**预防一些常见的意外情况（非故意的）**——比如浏览器里发起 ajax 请求、试图设置 `Sec-WebSocket-Key` 及其他相关 header 时，这些 header 是**被浏览器禁止**的。也就是说，这套「Key/Accept 一问一答」是在**证明「这是一次双方都自愿参与的、真实的 WebSocket 握手」**，而不是某个普通 HTTP 请求误打误撞撞进来的。

> 💬 **面试官**：WebSocket 握手过程中 `Sec-WebSocket-Accept` 是怎么计算出来的？这个设计的目的是什么？
>
> ✅ 标准答案：把客户端请求头的 `Sec-WebSocket-Key` 和一个固定 GUID `258EAFA5-E914-47DA-95CA-C5AB0DC85B11` 拼接，取 SHA-1 哈希，再 base64 编码，得到 `Sec-WebSocket-Accept`。客户端用同样的算法校验服务端返回的值，一致才认为握手成功。
>
> 🎁 加分答案：能点出这个设计的**真实目的不是安全、而是「证明服务端真的理解 WebSocket 协议」**——算法是公开的，任何人都能算，所以它防不了中间人；它防的是「普通 HTTP 服务器误响应 `Upgrade` 请求」这类意外情况。再加一句：`Sec-WebSocket-Key` 是客户端随机生成的 base64 字符串，浏览器禁止 JS 通过 ajax 伪造这个头，所以「能正确算出 Accept 回过来」本身就证明了对方是一个真正的 WebSocket 服务端、且主动参与了这次握手。

### 4. WebSocket 帧格式（重点）

握手之后，客户端和服务端通信的**最小单位是「帧」**，由 1 个或多个帧组成一条完整的消息：

- 发送端：将消息切割成多个帧，发送给服务端
- 接收端：接收消息帧，并将关联的帧重新组装成完整的消息

这就是为什么说「WebSocket 相比 HTTP 轮询几乎没有额外协议开销」——HTTP 每发一次都要带几百字节的重复头部，而 WebSocket 每个帧的头只有**几个字节**，纯二进制、按位定义。理解这个二进制格式，是理解 WebSocket 性能优势的钥匙。

**帧的完整结构**

下图是 RFC 6455 定义的帧格式，单位是**比特**（比如 FIN、RSV1 各占 1 比特，opcode 占 4 比特）：

```plain
0                   1                   2                   3
0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
|N|V|V|V|       |S|             |   (if payload len==126/127)   |
| |1|2|3|       |K|             |                               |
+-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
|     Extended payload length continued, if payload len == 127  |
+ - - - - - - - - - - - - - - - +-------------------------------+
|                               |Masking-key, if MASK set to 1  |
+-------------------------------+-------------------------------+
| Masking-key (continued)       |          Payload Data         |
+-------------------------------- - - - - - - - - - - - - - - - +
:                     Payload Data continued ...                :
+ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
|                     Payload Data continued ...                |
+---------------------------------------------------------------+
```

**逐字段拆解**

**FIN**（1 比特）：如果是 1，表示这是消息的最后一个分片；如果是 0，表示这不是最后一个分片（后面还有延续帧）。配合 opcode 的「延续帧」，实现大消息的分片传输。

**RSV1 / RSV2 / RSV3**（各 1 比特）：一般情况全为 0。当客户端、服务端协商采用 WebSocket 扩展时，这三个标志位可以非 0，含义由扩展定义。如果出现非零值、但并没有采用扩展，连接出错。

**Opcode**（4 比特）：操作代码，决定如何解析后续的数据载荷。如果 opcode 是不认识的，接收端应该断开连接。取值如下：

| opcode | 含义 |
|--------|------|
| `0x0` | 延续帧（数据分片时，当前帧是其中一个分片） |
| `0x1` | 文本帧 |
| `0x2` | 二进制帧 |
| `0x3-7` | 保留，用于后续定义的非控制帧 |
| `0x8` | 连接断开（Close） |
| `0x9` | ping 操作 |
| `0xA` | pong 操作 |
| `0xB-F` | 保留，用于后续定义的控制帧 |

**Mask**（1 比特）：表示是否对数据载荷进行掩码操作。这是重点，下一节单独展开——**从客户端发往服务端的帧必须掩码，从服务端发往客户端的帧不掩码**；如果服务端收到的帧没有掩码，服务端需要断开连接。

**Payload length**（7 位 / 7+16 位 / 7+64 位）：数据载荷的长度（单位字节），支持三种长度编码：

- 值为 `0~125`：数据长度就是这个值本身（x 字节）
- 值为 `126`：后续 2 字节是一个 16 位无符号整数，值为数据长度
- 值为 `127`：后续 8 字节是一个 64 位无符号整数（最高位为 0），值为数据长度
- 占多字节时，采用**网络序**（big endian，高位在前）

**Masking-key**（0 或 4 字节）：客户端发往服务端的帧都掩码，Mask 为 1，携带 4 字节掩码键；Mask 为 0 则没有。注意：**载荷数据长度不包括 mask key 的长度**。

**Payload data**（x+y 字节）：扩展数据（x 字节）+ 应用数据（y 字节）。没协商扩展时扩展数据为 0 字节。

**Payload length 的三种长度编码 + 大小端序**

三种长度编码是为了「用最小的头开销装下不同大小的消息」——小消息（≤125 字节）只用 7 位就够，中大消息才额外占用 2 字节或 8 字节。多字节时按**网络序（大端序）**存储，即高位字节在前。

先理解大端序和小端序的区别：

```javascript
let buffer = Buffer.from([0b00000001, 0b00000000]);
console.log(Math.pow(2, 8));
console.log(buffer.readUInt16BE(0));// 00000001 00000000  → 256
console.log(buffer.readUInt16LE(0));// 00000000 00000001  → 1
```

- **Big-endian（大端序）**：高位字节在前，`00000001 00000000` 读作 256
- **Little-endian（小端序）**：低位字节在前，`00000000 00000001` 读作 1

下面这段代码，就是「从帧的第二个字节读出 payload length」的完整逻辑——先取后 7 位，再根据是否 126/127 决定要不要继续读扩展长度：

```javascript
function getLength(buffer) {
  const byte = buffer.readUInt8(1);
  let length = parseInt(byte.toString(2).substring(1), 2);
  if (length === 126) {
    length = buffer.readUInt16BE(2);
  } else if (length === 127) {
    length = buffer.readBigUInt64BE(2);
  }
  return length;
}
console.log(126..toString(2));
console.log(127..toString(2));
console.log(getLength(Buffer.from([0b10000001, 0b10000001])));
console.log(getLength(Buffer.from([0b10000001, 0b11111110, 0b00000000, 0b00000001])));
console.log(getLength(Buffer.from([0b10000001, 0b11111111, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000001])));
```

> 💬 **面试官**：WebSocket 帧格式里都有哪些字段？payload length 为什么要设计成三种长度编码？
>
> ✅ 标准答案：一个帧包含 FIN（是否最后分片）、RSV1-3（扩展位）、opcode（帧类型：文本/二进制/关闭/ping/pong）、MASK（是否掩码）、payload length（载荷长度）、masking-key（掩码键）和 payload data。payload length 用 7 位 / 7+16 位 / 7+64 位三种编码，是为了「用小消息用最少的头开销」——≤125 字节只占 7 位，126 用 2 字节扩展，127 用 8 字节扩展。
>
> 🎁 加分答案：能补充「帧是二进制、按位定义」这个本质——正因为头部只有几个字节（而不是 HTTP 那几百字节的文本头），WebSocket 才做到了「连接建立后几乎零协议开销」；再加一句大小端序——扩展长度按网络序（大端序，高位在前）存储，Node.js 里对应 `readUInt16BE` / `readBigUInt64BE`。

### 5. 掩码算法（重点）

掩码（MASK）是帧格式里最值得深挖的一个字段，因为它背后是一个**安全设计**，而且面试官最爱追着问「为什么只有客户端要掩码」。

先看算法本身。掩码键是客户端挑选的 32 位随机数，掩码、反掩码都采用同一个 XOR 算法：

- 对索引 i 模 4 得到 j（因为掩码一共四个字节）
- 对原来的字节和对应的掩码字节做**异或**（XOR）
- 异或：两个数的二进制按位对比，相同取 0，不同取 1

![掩码：原值与 masking-key 做 XOR](https://cdn.nlark.com/yuque/0/2025/png/738210/1749439000314-745275c7-f111-4e13-8004-abf1d35ed1e7.png)

![数据与 masking-key 逐字节 XOR](https://cdn.nlark.com/yuque/0/2025/png/738210/1749439010365-4d8df710-fd7d-4a5c-9306-30e93c789444.png)

因为 XOR 是可逆的（`A ^ B ^ B = A`），所以客户端用掩码键把数据「打乱」，服务端用同一个掩码键再 XOR 一次就能还原。代码只有一行循环：

```javascript
function unmask(buffer, mask) {
  const length = buffer.length;
  for (let i = 0; i < length; i++) {
    buffer[i] ^= mask[i & 3];   // 👈 i & 3 等价于 i % 4
  }
}

let mask = Buffer.from([1, 0, 1, 0]);
let buffer = Buffer.from([0, 1, 0, 1, 0, 1, 0, 1]);
unmask(buffer, mask);
console.log(buffer);
```

**那么问题来了：为什么要掩码？为什么只有客户端发往服务端的帧要掩码？**

这是本篇最值得记住的一个「为什么」。规范的原文动机是「防止中间代理误判」——展开讲，是防一种叫**缓存投毒（cache poisoning）**的攻击：

设想一个场景：某个中间设备（如老旧的透明代理、或配置不当的缓存）会缓存「它认为是 HTTP 响应」的数据。攻击者利用这一点，构造一个请求，让「客户端发往服务端的 WebSocket 帧」被这个中间设备**误当成「对某个 URL 的 HTTP 响应」缓存下来**，于是攻击者就能向其他用户「投毒」——让他们读到被污染的响应。

掩码怎么防？关键在于：**客户端每个帧都用一个随机的 4 字节掩码键对载荷做 XOR，导致客户端发出的字节流是「不可预测」的**。攻击者无法提前知道客户端会发什么字节，也就无法精确构造出「能被中间设备当成合法 HTTP 响应」的载荷，缓存投毒就无从下手。

那为什么**服务端发往客户端的帧不用掩码**？因为：

- 服务端发送的方向，不是「中间缓存会去缓存」的方向（缓存关心的是「响应」，而服务端→客户端对中间设备来说本就处在「响应」的语义位置）
- 掩码主要防的是「客户端帧被中间代理误判」，服务端帧没有这条被误判的攻击路径
- 掩码是有成本的（每帧 4 字节掩码键 + XOR 计算），能省就省

所以规范强制：**客户端必须掩码，服务端收到的帧若没掩码就断开连接**——这个「单向强制」恰恰印证了它防的是「客户端→服务端这个方向」的缓存投毒。

> 💬 **面试官**：WebSocket 帧格式里 MASK 位的作用是什么？为什么只有客户端发往服务端的帧需要掩码？
>
> ✅ 标准答案：MASK 表示是否对载荷做掩码。掩码是防**缓存投毒**——如果客户端帧不掩码，攻击者可以构造「客户端发往服务端的帧」让中间缓存误当成 HTTP 响应缓存下来，污染其他用户。客户端每个帧用随机 4 字节掩码键做 XOR，让客户端字节流不可预测，从而无法被精确构造。服务端→客户端不掩码，是因为这个方向不在中间缓存的缓存路径上、没有这条攻击路径，且省成本。
>
> 🎁 加分答案：能补充三点细节——① 掩码算法是 XOR，可逆（`A^B^B=A`），客户端「掩码」、服务端「反掩码」是同一个操作；② 规范是**强制**的，服务端收到未掩码的帧要直接断开连接；③ 再深入一层：掩码解决的是「中间代理误判」这个**网络中间件问题**，不是「数据保密」——它防不了窃听（掩码键是明文随帧传输的），真正保密要 wss（TLS 加密）。

### 6. 手写 WebSocket 服务器

把上面的握手 + 帧格式 + 掩码串起来，就能用 Node.js 的 `net` 模块手写一个最简 WebSocket 服务器。这段代码完整展示了「用 `http` 监听 upgrade → 手动完成 `Sec-WebSocket-Accept` 计算 → 手动做帧的编解码」的全过程：

```javascript
const net = require('net');
const { EventEmitter } = require('events');
const crypto = require('crypto');
const CODE = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const OP_CODES = {
  TEXT: 1,
  BINARY: 2
};
class Server extends EventEmitter {
  constructor(options) {
    super(options);
    this.options = options;
    this.server = net.createServer(this.listener);
    this.server.listen(options.port);
  }
  listener = (socket) => {
    socket.setKeepAlive(true);
    socket.send = function (payload) {
      let _opcode;
      if (Buffer.isBuffer(payload)) {
        _opcode = OP_CODES.BINARY;
      } else {
        _opcode = OP_CODES.TEXT;
        payload = Buffer.from(payload);
      }
      let length = payload.length;
      let buffer = Buffer.alloc(2 + length);
      buffer[0] = 0b10000000 | _opcode;   // 👈 FIN=1 + opcode
      buffer[1] = length;                  // 👈 未掩码 + payload length
      payload.copy(buffer, 2);
      socket.write(buffer);
    }
    socket.on('data', (chunk) => {
      if (chunk.toString().match(/Upgrade: websocket/)) {
        this.upgrade(socket, chunk.toString());   // 👈 握手阶段
      } else {
        this.onmessage(socket, chunk);            // 👈 帧阶段
      }
    });
    this.emit('connection', socket);
  }
  onmessage = (socket, chunk) => {
    let FIN = (chunk[0] & 0b10000000) === 0b10000000;//判断是否是结束位,第一个bit是不是1
    let opcode = chunk[0] & 0b00001111;//取一个字节的后四位,得到的一个是十进制数
    let masked = (chunk[1] & 0b10000000) === 0b10000000;//第一位是否是1
    let payloadLength = chunk[1] & 0b01111111;//取得负载数据的长度
    let payload;
    if (masked) {
      let masteringKey = chunk.slice(2, 6);//掩码
      payload = chunk.slice(6);//负载数据
      unmask(payload, masteringKey);//对数据进行解码处理
    }
    if (FIN) {
      switch (opcode) {
        case OP_CODES.TEXT:
          socket.emit('message', payload.toString());
          break;
        case OP_CODES.BINARY:
          socket.emit('message', payload);
          break;
        default:
          break;
      }
    }
  }
  upgrade = (socket, chunk) => {
    let rows = chunk.split('\r\n');//按分割符分开
    let headers = toHeaders(rows.slice(1, -2));//去掉请求行和尾部的二个分隔符
    let wsKey = headers['Sec-WebSocket-Key'];
    let acceptKey = toAcceptKey(wsKey);
    let response = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      'Connection: Upgrade',
      '\r\n'
    ].join('\r\n');
    socket.write(response);
  }
}
function toAcceptKey(wsKey) {
  return crypto.createHash('sha1').update(wsKey + CODE).digest('base64');;
}
function toHeaders(rows) {
  const headers = {};
  rows.forEach(row => {
    let [key, value] = row.split(': ');
    headers[key] = value;
  });
  return headers;
}
function unmask(buffer, mask) {
  const length = buffer.length;
  for (let i = 0; i < length; i++) {
    buffer[i] ^= mask[i & 3];
  }
}

exports.Server = Server;
```

对照前面几节，你能看到每一行代码都对应一个协议概念：`upgrade` 方法对应「握手」，`onmessage` 里的位运算对应「帧格式拆解」，`unmask` 对应「掩码算法」，`toAcceptKey` 对应「`Sec-WebSocket-Accept` 计算」。

> 📌 这段代码是「最简实现」，只处理了「单帧、短消息、未分片」的情况，生产环境的分片、大消息、ping/pong、关闭帧等完整处理，留给 Node.js 系列「核心 API 大全」篇的手写实现小节展开。**本篇聚焦协议原理本身**，让你看到「协议规定的东西，是如何一行行落到代码里的」。

### 7. 心跳保活机制

WebSocket 建立的是**长连接**，而长连接有一个 TCP 层面的隐患——**「僵尸连接」**。

它是这么产生的：TCP 连接长时间没有数据传输时，中间的 **NAT 设备**或**负载均衡器**，可能会因为「这条连接空闲太久了」而在自己的映射表里**静默地把它丢弃**。关键在「静默」——这个丢弃动作，连接的**两端都毫不知情**：客户端和服务端都还「以为」连接是通的，实际链路已经被掐断了。于是就有了「僵尸连接」：看起来活着，其实已经死了，消息发出去石沉大海。

怎么发现并处理它？WebSocket 协议内置了 **ping / pong 控制帧**（就是前面帧格式表里的 opcode `0x9` 和 `0xA`）：

- 服务端定时发送 `ping` 帧
- 客户端收到后，自动回复 `pong` 帧
- 服务端超过若干个心跳周期没收到 `pong`，就判定连接已死，主动断开、触发重连

这里有一个**重要的实现差异**要记住：**浏览器原生的 WebSocket API 会自动处理协议层的 ping/pong 控制帧**（浏览器替你回了 `pong`，你无感知）；但 **Node.js 后端之间的 WebSocket 通信（如用 `ws` 库），需要显式处理 ping/pong**——因为 `ws` 把协议层的 `ping`/`pong` 事件暴露给了开发者。

前面第一部分第 5 小节展示的「业务层心跳」，是**又一层**保险：协议层的 ping/pong 只探测「TCP 链路还通不通」，业务层的心跳（自己发 `ping` 字符串、等 `pong`）则能进一步探测「对方应用还活着吗」。两层叠加，才能完整应对「僵尸连接」。

> 💬 **面试官**：为什么需要心跳保活机制？「僵尸连接」是怎么产生的？
>
> ✅ 标准答案：TCP 连接长时间无数据传输时，中间的 NAT 设备/负载均衡器会因空闲超时**静默丢弃连接映射**，而两端毫无察觉，形成「僵尸连接」——看起来活着、实际已断。WebSocket 协议内置 ping/pong 控制帧做心跳：服务端定时发 ping，客户端回 pong，超时未回则判定断开、主动重连。
>
> 🎁 加分答案：能补充「浏览器原生 API 自动回 pong、Node.js 后端需显式处理」这个差异，以及「协议层 ping/pong 和业务层心跳是两层保险」——前者探「TCP 链路通不通」，后者探「应用还活着吗」，生产上通常两层都做。再加一句：这就是应用层要自己做心跳的根本原因——TCP 层自己的 keepalive 太慢（默认几小时一次），HTTP keep-alive 又根本不探活，两者都救不了 NAT 静默丢弃。

### 8. 三种「keepalive」辨析（重点）

这是本篇**最易混淆、面试陷阱题最密集**的一个点。`keepalive`、`keep-alive`、`心跳`，三个词长得像，但层次、目的、触发条件**完全不同**。面试官会故意问「TCP keepalive 和 HTTP keep-alive 是不是一回事？」——答错了，前面的知识都会打折扣。

| 名称 | 层次 | 目的 | 触发/频率 | 解决的问题 |
|------|------|------|-----------|-----------|
| **TCP keepalive** | 传输层 | **探活**（探测对端是否还活着） | 内核自动，默认几小时一次 | 防「半开连接」（对端崩溃但没发 FIN） |
| **HTTP keep-alive** | 应用层 | **连接复用**（一个连接跑多个请求） | HTTP/1.1 默认开启 | 省「反复握手建连」的开销 |
| **WebSocket 心跳** | 业务层 | **保活探测**（防 NAT 静默丢弃） | 应用自己定时发 ping/pong | 防「僵尸连接」 |

三个逐一拆开：

**① TCP keepalive**：传输层的探活机制。TCP 连接长时间空闲时，内核会定期发送一个空的探测包（probe），确认对端是否还活着。它防的是「**半开连接**」——比如对端进程崩溃了、机器断电了，但没来得及发 FIN，这边一直不知道。它的触发是**内核自动**的，而且**默认几小时才发一次**（太慢），与应用层无关。

**② HTTP keep-alive**：应用层的连接复用机制。让同一个 TCP 连接承载多个请求/响应（对应 HTTP/1.1 默认的 `Connection: keep-alive`），省的是「反复握手建连」的开销。**它和「探活」没有半毛钱关系**——它只是说「这个连接别急着关，我还要用」，不负责检测连接死没死。

**③ 应用层心跳（WebSocket 的 ping/pong）**：业务自己实现的保活探测。为什么要自己做？因为前两者**一个太慢、一个不探活**：

- TCP keepalive 默认几小时才发一次，等它发现「连接被 NAT 丢了」，业务早就挂了几十分钟了
- HTTP keep-alive 根本不探活，只是复用连接

两者都解决不了「**NAT 设备把空闲长连接悄悄丢弃**」这个问题。所以 WebSocket 必须自己在应用层发心跳（ping/pong 控制帧），用「几秒到几十秒」的频率去主动探测，才能真正发现并应对僵尸连接。

> 💬 **面试官**：TCP keepalive、HTTP keep-alive、WebSocket 心跳三者分别是什么？有什么本质区别？
>
> ✅ 标准答案：三者层次、目的完全不同——**TCP keepalive** 是传输层探活，内核定期发探测包防「半开连接」，默认几小时一次；**HTTP keep-alive** 是应用层连接复用，让一个 TCP 连接跑多个请求，省建连开销，**与探活无关**；**WebSocket 心跳**是业务层保活探测，定时发 ping/pong 防「NAT 静默丢弃导致的僵尸连接」。
>
> 🎁 加分答案：能点出「为什么要业务自己做心跳」这个因果——TCP keepalive 太慢（默认几小时）、HTTP keep-alive 不探活，两者都救不了「NAT 设备空闲超时静默丢连接」，所以 WebSocket 只能在应用层用高频 ping/pong 自己探活。再加一句：这道题本质考的是「分层」——传输层、应用层、业务层各管各的事，命名相似（keepalive vs keep-alive）恰恰是陷阱所在。

### 9. WebSocket vs SSE 选型对比

把前面的内容收口到「怎么选」。SSE 和 WebSocket 是两条都能做「服务端推数据」的路，选型的关键是一个问题：**客户端需不需要频繁主动发消息？**

先看两者的本质差异：

| 维度 | SSE（EventSource） | WebSocket |
|------|-------------------|-----------|
| 通信方向 | 单向（服务端→客户端） | 全双工（双向） |
| 底层协议 | 普通 HTTP 长连接 | HTTP 升级后的独立协议 |
| MIME / 帧 | `text/event-stream` 文本 | 二进制帧 |
| 客户端主动发 | **不能**（没有 `send`） | 能 |
| 自动重连 | 浏览器原生支持（`retry` 字段） | 需自己实现 |
| 二进制支持 | 弱（文本为主） | 强 |
| 基础设施 | 直接复用 HTTP（代理/CDN/负载均衡） | 需额外处理（长连接粘性、升级头） |

由此得到一个清晰的决策逻辑：

- 如果场景**只是「服务端单向推送通知 / 进度更新」**——比如 AI 对话的流式输出、检验报告完成通知、行情推送——**SSE 通常是更简单的选择**。因为它基于标准 HTTP，能直接享受现有 HTTP 基础设施（代理、CDN、负载均衡、鉴权都不用改），浏览器还原生支持自动重连
- 只有**需要客户端频繁主动发消息**的场景——比如聊天室、在线协作、多人在线游戏、需要客户端实时上报操作——才值得引入 WebSocket 的额外复杂度

一句话：**「服务端单向推」优先想 SSE，「双向实时」才上 WebSocket**。很多团队一上来就上 WebSocket，其实场景只需要单向推送，属于「杀鸡用牛刀」。

> 💬 **面试官**：WebSocket 和 SSE 分别适合什么场景？如何选型？
>
> ✅ 标准答案：SSE 基于普通 HTTP 长连接 + `text/event-stream`，天生只支持服务端→客户端单向推送，浏览器原生支持自动重连；WebSocket 是全双工的，客户端也能随时主动发。选型看「客户端要不要频繁主动发」——只要服务端单向推（AI 流式输出、报告通知、进度更新），SSE 更简单、能复用 HTTP 基础设施；需要客户端频繁主动发（聊天、协作、游戏），才用 WebSocket。
>
> 🎁 加分答案：能补充几个 WebSocket 独有的考量——① 二进制传输（SSE 文本为主，WebSocket 原生二进制）；② SSE 走 HTTP 能天然复用鉴权 Cookie / 代理 / CDN，WebSocket 的 `Upgrade` 头在部分老旧代理/CDN 上需要特殊配置；③ SSE 有浏览器自动重连，WebSocket 要自己写重连 + 心跳。这些「工程成本」才是选型时真正要权衡的，而不是「哪个更先进」。

### 10. WebSocket 的负载均衡挑战

最后落到部署。WebSocket 是**长连接**，这给负载均衡带来了一个传统 HTTP 场景没有的难题：

传统基于请求的负载均衡（每次请求随机/轮询分配）对「无状态短请求」很好用，但 WebSocket 一旦连接建立，**后续所有帧都必须路由到同一个后端实例**——因为连接状态（就是那条 TCP 连接）存在那台机器上。如果第二次帧被均衡器随机分到了另一台后端，那台机器根本没有这个连接，帧就丢了。

这就要求负载均衡器支持「**连接保持**」——比如 **sticky session**（粘性会话，把同一连接的所有帧固定路由到建立连接时选中的那台后端），或者用 **一致性哈希**（后端节点和连接 key 都映射到环形哈希空间，后端扩缩容时只影响环上相邻的一小部分连接）。

这也解释了为什么 SSE 在部署上比 WebSocket 更省心——SSE 本质还是 HTTP 请求，可以继续用现成的 HTTP 负载均衡策略（虽然长连接也有类似问题，但通常比 WebSocket 的「升级 + 帧」更容易被代理理解）。

> 📌 负载均衡的几种算法（轮询、加权轮询、IP 哈希、一致性哈希、最少连接数）会在第 10 篇《反向代理与负载均衡》里详细展开，这里只点出「长连接场景的特殊性」——WebSocket 必须保证「一个连接始终路由到同一个后端」。

> 💬 **面试官**：多实例部署的 WebSocket 服务在负载均衡上有什么特殊要求？
>
> ✅ 标准答案：WebSocket 是长连接，一旦建立、后续所有帧都必须路由到同一个后端实例，传统「每次请求随机分配」的策略不适用。需要负载均衡器支持「连接保持」——sticky session（粘性会话）或一致性哈希，保证同一连接的所有帧都打到建立连接时选中的那台后端。
>
> 🎁 加分答案：能点出「为什么帧必须同后端」——连接状态（TCP 连接本身）在建立时那台机器上，换机器帧就丢；再加一句「扩缩容」的影响——一致性哈希相比 sticky session 的额外优势是「后端扩缩容时只影响环上相邻一小部分连接」，减少大规模断线；而 SSE 因为还是 HTTP，能继续用现成 HTTP 负载均衡策略，部署更省心。

### 11. 对比 ws 库

最后一节做「原理」和「工程」的桥接。Node.js 生态最常用的 WebSocket 实现是 **`ws` 库**，它的核心逻辑，正是我们前面手写实现的那套东西的「生产级版本」：

- 用 `http` 模块监听 `upgrade` 事件，拿到底层 TCP socket
- 手动完成 `Sec-WebSocket-Accept` 计算（就是 `sha1(key + GUID)`）
- 手动做帧的编解码（FIN/opcode/MASK/payload length 的处理 + 掩码）

所以「手写实现」不是炫技，而是**让你看到 `ws` 库内部到底在做什么**——它没有魔法，就是把 RFC 6455 的规定一行行实现了出来。理解了本篇的协议原理，再去看 `ws` 的源码，就不再是「天书」，而是「老朋友」。

> 📌 具体的「生产级完整手写实现」（分片、大消息、ping/pong 心跳、关闭帧、背压）留给 Node.js 系列「核心 API 大全」篇展开，本篇聚焦协议原理本身。

---

---

## 三、socket.io：WebSocket 之上的高层封装

前面两章讲的是「WebSocket 协议本身」。但在真实业务里，很多人用的是 **socket.io**——它是 WebSocket 的一个高层封装库，包括客户端的 JS 和服务端的 Node.js。理解它和「裸 WebSocket」的区别，是「从会写 demo 到能做真实业务」的关键一步。

### 1. socket.io 是什么、为什么需要它

socket.io 的目标是「构建可以在不同浏览器和移动设备上使用的实时应用」。它相对裸 WebSocket，有三个特点：

- **易用性**：封装了服务端和客户端，使用起来非常简单
- **跨平台**：支持跨平台，可以在不同平台开发实时应用
- **自适应**：它会自动根据浏览器，从 WebSocket、AJAX 长轮询、iframe 流等各种方式中**选择最佳的方式**实现实时通信——而且支持的浏览器最低达 IE5.5

这第三个「自适应」是 socket.io 的核心价值：**裸 WebSocket 需要浏览器支持，而 socket.io 能在老浏览器上自动降级到长轮询**，让开发者不用操心兼容性。

### 2. 初步使用

**安装部署**

```shell
$ npm install socket.io
```

**启动服务**

创建 `app.js` 文件：

```javascript
var express = require('express');
var path = require('path');
var app = express();

app.get('/', function (req, res) {
	res.sendFile(path.resolve('index.html'));
});

var server = require('http').createServer(app);
var io = require('socket.io')(server);

io.on('connection', function (socket) {
	console.log('客户端已经连接');
	socket.on('message', function (msg) {
		console.log(msg);
		socket.send('sever:' + msg);
	});
});
server.listen(80);
```

**客户端引用**

服务端运行后，会在根目录**动态生成 socket.io 的客户端 JS 文件**，客户端通过固定路径 `/socket.io/socket.io.js` 添加引用。加载后得到一个全局对象 `io`。`connect` 函数接受一个 `url` 参数（可以是 socket 服务的 http 完整地址，也可以是相对路径，省略则默认连接当前路径）。

创建 `index.html`：

```html
<script src="/socket.io/socket.io.js"></script>
<script>
 window.onload = function(){
    const socket = io.connect('/');
    //监听与服务器端的连接成功事件
    socket.on('connect',function(){
        console.log('连接成功');
    });
    //监听与服务器端断开连接事件
    socket.on('disconnect',function(){
       console.log('断开连接');
    });
 };
</script>
```

**发送消息**

成功建立连接后，通过 `socket` 对象的 `send` 函数互相发送消息：

```javascript
var socket = io.connect('/');
socket.on('connect',function(){
	//客户端连接成功后发送消息'welcome'
	socket.send('welcome');
});
//客户端收到服务器发过来的消息后触发
socket.on('message',function(message){
	console.log(message);
});
```

```javascript
var io = require('scoket.io')(server);
io.on('connection',function(socket){
  //向客户端发送消息
  socket.send('欢迎光临');
  //接收到客户端发过来的消息时触发
  socket.on('message',function(data){
      console.log(data);
  });
});
```

### 3. 深入分析：send 本质是 emit 的封装

socket.io 的 `send` 函数，本质只是 `emit` 的封装——看 `node_modules\socket.io\lib\socket.js` 源码：

```javascript
function send(){
	var args = toArray(arguments);
	args.unshift('message');
	this.emit.apply(this, args);
	return this;
}
```

`emit` 函数有两个参数：

- 第一个参数是**自定义的事件名称**——发送方发什么类型的事件名，接收方就用对应的事件名监听
- 第二个参数是**要发送的数据**

这揭示了 socket.io 和裸 WebSocket 的一个根本区别：**WebSocket 只有「一条消息流」（`message`），socket.io 在它之上抽象出了「事件」**——你可以自定义无数个事件名（如 `join`、`leave`、`getAllMessages`），每个事件走独立的监听回调，代码组织清晰得多。

服务端事件：

| 事件名称 | 含义 |
| :--- | :--- |
| connection | 客户端成功连接到服务器 |
| message | 接收到客户端发送的消息 |
| disconnect | 客户端断开连接 |
| error | 监听错误 |

客户端事件：

| 事件名称 | 含义 |
| :--- | :--- |
| connect | 成功连接到服务器 |
| message | 接收到服务器发送的消息 |
| disconnect | 客户端断开连接 |
| error | 监听错误 |

### 4. 划分命名空间

socket.io 可以把服务分成多个**命名空间**，默认是 `/`，不同命名空间内不能通信。这适合「同一个服务里隔离不同业务」——比如医疗系统里，把「医生工作台」和「患者端」分成两个命名空间，互不干扰。

服务端划分：

```javascript
io.on('connection', function (socket) { 
	//向客户端发送消息 
	socket.send('/ 欢迎光临'); 
	//接收到客户端发过来的消息时触发 
	socket.on('message',function(data){ 
		console.log('/'+data); 
	}); 
}); 
io.of('/news').on('connection', function (socket) { 
	//向客户端发送消息 
	socket.send('/news 欢迎光临'); 
	//接收到客户端发过来的消息时触发 
	socket.on('message',function(data){ 
		console.log('/news '+data); 
	}); 
});
```

客户端连接不同命名空间：

```javascript
window.onload = function(){
  var socket = io.connect('/');
  //监听与服务器端的连接成功事件
  socket.on('connect',function(){
    console.log('连接成功');
    socket.send('welcome');
  });
  socket.on('message',function(message){
    console.log(message);
  });
  //监听与服务器端断开连接事件
  socket.on('disconnect',function(){
    console.log('断开连接');
  });

  var news_socket = io.connect('/news');
  //监听与服务器端的连接成功事件
  news_socket.on('connect',function(){
    console.log('连接成功');
    socket.send('welcome');
  });
  news_socket.on('message',function(message){
    console.log(message);
  });
  //监听与服务器端断开连接事件
  news_socket.on('disconnect',function(){
    console.log('断开连接');
  });
};
```

### 5. 房间与广播

房间是命名空间内的进一步划分：一个命名空间可以分成多个房间，一个客户端可以同时进入多个房间。规则是——**房间内的广播不影响到房间外的客户端**；如果在大厅广播，则大厅里和所有房间内的客户端都能收到。

**进入 / 离开房间**

```javascript
socket.join('chat');//进入chat房间
socket.leave('chat');//离开chat房间
```

**全局广播**

```javascript
//向大厅和所有人房间内的人广播
io.emit('message','全局广播');

//向除了自己外的所有人广播
socket.broadcast.emit('message', msg);
```

**房间内广播**

从服务器的角度提交事件（提交者包含在内）：

```javascript
//向myroom广播一个事件，在此房间内包括自己在内的所有客户端都会收到
io.in('myroom').emit('message', msg);
io.of('/news').in('myRoom').emit('message',msg);
```

从客户端的角度提交事件（提交者排除在外）：

```javascript
//向myroom广播，此房间内除了自己外的所有客户端都会收到
socket.broadcast.to('myroom').emit('message', msg);
```

**获取房间信息**

```javascript
io.sockets.adapter.rooms  // 获取房间列表

// 取得进入房间内所对应的所有 sockets 的 hash 值，即 socket.id
let roomSockets = io.sockets.adapter.rooms[room].sockets;
```

> 💬 **面试官**：socket.io 和裸 WebSocket 有什么区别？什么时候该用 socket.io？
>
> ✅ 标准答案：socket.io 是 WebSocket 之上的高层封装，核心增值有三点——① 在「一条消息流」上抽象出「事件」机制（`emit`/`on` 自定义事件名，比裸 WebSocket 只有 `message` 一个事件更清晰）；② 自适应降级，老浏览器上自动从 WebSocket 降到长轮询/iframe；③ 内置命名空间、房间、广播等常见实时应用能力。
>
> 🎁 加分答案：能点出 trade-off——socket.io 的易用性代价是「协议不再纯粹」：它有自己的握手和报文格式，客户端必须用 socket.io 的客户端库，不能和裸 WebSocket 客户端互通；而且 socket.io 默认会先走长轮询再尝试升级到 WebSocket（老版本行为），对「纯现代浏览器、追求极致性能」的场景，直接上裸 WebSocket（或 `ws` 库）更轻。选型上「团队要快速做实时业务、要兼容老浏览器」用 socket.io，「协议要标准、客户端多样」用裸 WebSocket。

### 6. 聊天室实战

用一个完整的聊天室例子收口 socket.io。它串起了本章所有概念：命名空间（默认 `/`）、房间、广播、私聊、历史消息。功能点包括：

- 创建客户端与服务端的 websocket 通信连接
- 客户端与服务端相互发送消息
- 添加用户名
- 添加私聊（`@用户名 内容` 语法）
- 进入 / 离开房间聊天
- 历史消息（MySQL 持久化）

**服务端 app.js**

```javascript
let express = require('express');
let http = require('http');
let path = require('path')
let app = express();
let mysql = require('mysql');
var connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'root',
	database: 'chat'
});
connection.connect();
app.use(express.static(__dirname));
app.get('/', function (req, res) {
	res.header('Content-Type', "text/html;charset=utf8");
	res.sendFile(path.resolve('index.html'));
});

let server = http.createServer(app);
//因为websocket协议是要依赖http协议实现握手的，所以需要把httpserver的实例的传给socket.io
let io = require('socket.io')(server);
const SYSTEM = '系统';
//保存着所有的用户名和它的socket对象的对应关系
let sockets = {};
let mysockets = {};
let messages = [];//从旧往新旧的  slice
//在服务器监听客户端的连接
io.on('connection', function (socket) {
	console.log('socket', socket.id)
	mysockets[socket.id] = socket;
	//用户名，默认为undefined
	let username;
	//放置着此客户端所在的房间
	let rooms = [];
	// 私聊的语法 @用户名 内容
	socket.on('message', function (message) {
		if (username) {
			//首先要判断是私聊还是公聊
			let result = message.match(/@([^ ]+) (.+)/);
			if (result) {//有值表示匹配上了
				let toUser = result[1];//toUser是一个用户名 socket
				let content = result[2];
				let toSocket = sockets[toUser];
				if (toSocket) {
					toSocket.send({
						user: username,
						content,
						createAt: new Date()
					});
				} else {
					socket.send({
						user: SYSTEM,
						content: `你私聊的用户不在线`,
						createAt: new Date()
					});
				}
			} else {//无值表示未匹配上
				//对于客户端的发言，如果客户端不在任何一个房间内则认为是公共广播，大厅和所有的房间内的人都听的到。
				//如果在某个房间内，则认为是向房间内广播 ，则只有它所在的房间的人才能看到，包括自己
				let messageObj = {
					user: username,
					content: message,
					createAt: new Date()
				};
				//相当于持久化消息对象
				//messages.push(messageObj);
				connection.query(`INSERT INTO message(user,content,createAt) VALUES(?,?,?)`, [messageObj.user, messageObj.content, messageObj.createAt], function (err, results) {
					console.log(results);
				});
				if (rooms.length > 0) {
					/**
                    socket.emit('message', {
                        user: username,
                        content: message,
                        createAt: new Date()
                    });

                    rooms.forEach(room => {
                        //向房间内的所有的人广播 ，包括自己
                           io.in(room).emit('message', {
                              user: username,
                              content: message,
                              createAt: new Date()
                          });
                        //如何向房间内除了自己之外的其它人广播
                        socket.broadcast.to(room).emit('message', {
                            user: username,
                            content: message,
                            createAt: new Date()
                        });
                    });
                    */
					let targetSockets = {};
					rooms.forEach(room => {
						let roomSockets = io.sockets.adapter.rooms[room].sockets;
						console.log('roomSockets', roomSockets);//{id1:true,id2:true}
						Object.keys(roomSockets).forEach(socketId => {
							if (!targetSockets[socketId]) {
								targetSockets[socketId] = true;
							}
						});
					});
					Object.keys(targetSockets).forEach(socketId => {
						mysockets[socketId].emit('message', messageObj);
					});
				} else {
					io.emit('message', messageObj);
				}
			}
		} else {
			//把此用户的第一次发言当成用户名
			username = message;
			//当得到用户名之后,把socket赋给sockets[username]
			sockets[username] = socket;
			//socket.broadcast表示向除自己以外的所有的人广播
			socket.broadcast.emit('message', { user: SYSTEM, content: `${username}加入了聊天室`, createAt: new Date() });
		}
	});
	socket.on('join', function (roomName) {
		if (rooms.indexOf(roomName) == -1) {
			//socket.join表示进入某个房间
			socket.join(roomName);
			rooms.push(roomName);
			socket.send({
				user: SYSTEM,
				content: `你成功进入了${roomName}房间!`,
				createAt: new Date()
			});
			//告诉客户端你已经成功进入了某个房间
			socket.emit('joined', roomName);
		} else {
			socket.send({
				user: SYSTEM,
				content: `你已经在${roomName}房间了!请不要重复进入!`,
				createAt: new Date()
			});
		}
	});
	socket.on('leave', function (roomName) {
		let index = rooms.indexOf(roomName);
		if (index == -1) {
			socket.send({
				user: SYSTEM,
				content: `你并不在${roomName}房间，离开个毛!`,
				createAt: new Date()
			});
		} else {
			socket.leave(roomName);
			rooms.splice(index, 1);
			socket.send({
				user: SYSTEM,
				content: `你已经离开了${roomName}房间!`,
				createAt: new Date()
			});
			socket.emit('leaved', roomName);
		}
	});
	socket.on('getAllMessages', function () {
		//let latestMessages = messages.slice(messages.length - 20);
		connection.query(`SELECT * FROM message ORDER BY id DESC limit 20`, function (err, results) {
			// 21 20 ........2 
			socket.emit('allMessages', results.reverse());// 2 .... 21
		});

	});
});
server.listen(8080);

/**
 * socket.send 向某个人说话
 * io.emit('message'); 向所有的客户端说话
 * 
 */
```

**客户端 index.html**

```html
<!DOCTYPE html>
<html lang="en">

  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@3.3.7/dist/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u"
      crossorigin="anonymous">
    <style>
      .user {
        color: red;
        cursor: pointer;
      }
    </style>
    <title>socket.io</title>
  </head>

  <body>
    <div class="container" style="margin-top:30px;">
      <div class="row">
        <div class="col-xs-12">
          <div class="panel panel-default">
            <div class="panel-heading">
              <h4 class="text-center">欢迎来到聊天室</h4>
              <div class="row">
                <div class="col-xs-6 text-center">
                  <button id="join-red" onclick="join('red')" class="btn btn-danger">进入红房间</button>
                  <button id="leave-red" style="display: none" onclick="leave('red')" class="btn btn-danger">离开红房间</button>
                </div>
                <div class="col-xs-6 text-center">
                  <button id="join-green" onclick="join('green')" class="btn btn-success">进入绿房间</button>
                  <button id="leave-green" style="display: none" onclick="leave('green')" class="btn btn-success">离开绿房间</button>
                </div>
              </div>

            </div>
            <div class="panel-body">
              <ul id="messages" class="list-group" onclick="talkTo(event)" style="height:500px;overflow-y:scroll">

              </ul>
            </div>
            <div class="panel-footer">
              <div class="row">
                <div class="col-xs-11">
                  <input onkeyup="onKey(event)" type="text" class="form-control" id="content">
                </div>
                <div class="col-xs-1">
                  <button class="btn btn-primary" onclick="send(event)">发言</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@3.3.7/dist/js/bootstrap.min.js" integrity="sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa"
      crossorigin="anonymous"></script>
    <script>

      let contentInput = document.getElementById('content');//输入框
      let messagesUl = document.getElementById('messages');//列表
      let socket = io('/');//io new Websocket();
      socket.on('connect', function () {
        console.log('客户端连接成功');
        //告诉服务器，我是一个新的客户，请给我最近的20条消息
            socket.emit('getAllMessages');
        });
        socket.on('allMessages', function (messages) {
            let html = messages.map(messageObj => `
                <li class="list-group-item"><span class="user">${messageObj.user}</span>:${messageObj.content} <span class="pull-right">${new Date(messageObj.createAt).toLocaleString()}</span></li>
            `).join('');
            messagesUl.innerHTML = html;
            messagesUl.scrollTop = messagesUl.scrollHeight;
        });
        socket.on('message', function (messageObj) {
            let li = document.createElement('li');
            li.className = "list-group-item";
            li.innerHTML = `<span class="user">${messageObj.user}</span>:${messageObj.content} <span class="pull-right">${new Date(messageObj.createAt).toLocaleString()}</span>`;
            messagesUl.appendChild(li);
            messagesUl.scrollTop = messagesUl.scrollHeight;
        });

        // click delegate
        function talkTo(event) {
            if (event.target.className == 'user') {
                let username = event.target.innerText;
                contentInput.value = `@${username} `;
            }
        }
        //进入某个房间
        function join(roomName) {
            //告诉服务器，我这个客户端将要在服务器进入某个房间
            socket.emit('join', roomName);
        }
        socket.on('joined', function (roomName) {
            document.querySelector(`#leave-${roomName}`).style.display = 'inline-block';
            document.querySelector(`#join-${roomName}`).style.display = 'none';
        });
        socket.on('leaved', function (roomName) {
            document.querySelector(`#join-${roomName}`).style.display = 'inline-block';
            document.querySelector(`#leave-${roomName}`).style.display = 'none';
        });
        //离开某个房间
        function leave(roomName) {
            socket.emit('leave', roomName);
        }
        function send() {
            let content = contentInput.value;
            if (content) {
                socket.send(content);
                contentInput.value = '';
            } else {
                alert('聊天信息不能为空!');
            }
        }
        function onKey(event) {
            let code = event.keyCode;
            if (code == 13) {
                send();
            }
        }
    </script>
</body>

</html>
```

这段代码里，最能体现 socket.io 价值的是**自定义事件**的运用：`join` / `leave` / `getAllMessages` / `allMessages` / `joined` / `leaved` 都是业务自定义的事件名，每个都走独立的监听回调。如果换成裸 WebSocket，这些全部要挤进一个 `message` 事件里，靠「消息类型字段」去 `switch` 分发——这就是 socket.io 的「事件抽象」带来的工程价值。

---

---

## 四、工程落地参考

原理讲完，落到「工程落地」时看哪些权威资料。本节列出三个核心参考，指明「去哪看、看什么」：

### 1. WebSocket 协议规范（RFC 6455）

RFC 6455 是 WebSocket 协议的奠基规范，本篇的「握手」「帧格式」「掩码」都源自它，重点看三处：

- **握手过程**：第 4 章——`Upgrade`/`Sec-WebSocket-Key`/`Sec-WebSocket-Accept` 的完整握手流程
- **帧格式定义**：第 5 章——FIN/RSV/opcode/MASK/payload length 逐字段的二进制定义
- **`Sec-WebSocket-Accept` 计算算法**：第 1.3 节——`base64(SHA1(key + GUID))` 的精确定义

### 2. SSE 规范（WHATWG HTML 标准）

SSE 的权威来源是 WHATWG HTML 标准里的 Server-Sent Events 章节，重点看：

- **`text/event-stream` 格式**：`event:`/`data:`/`id:`/`retry:` 字段的精确语法（对应笔记里服务端 `res.write` 的那段格式）
- **浏览器自动重连行为**：连接断开后浏览器如何按 `retry` 字段自动重连、以及 `id` 字段如何用于断点续传

### 3. Chromium WebSocket 实现概览

Chromium 源码里的 `net/websockets/` 目录，是浏览器侧 WebSocket 的权威实现。概览级了解即可（不深入 C++ 细节）：

- 浏览器侧如何校验握手（`Sec-WebSocket-Accept` 的客户端校验逻辑）
- 帧的编解码、掩码的生成与反掩码
- 协议层 ping/pong 控制帧的自动处理

> 引用规范：正文不出现具体人名/账号名，权威来源见文末参考资料。对应本节的三个规范——WebSocket 协议（RFC 6455）、SSE（WHATWG HTML 标准）、Chromium 实现（`net/websockets/` 目录），搜索关键词见文末。

---

## 五、实践演示与验证

原理讲透了，最后动手「把 WebSocket 看进眼里」。用三个实验，把前面每个抽象概念落到可观测的现象上。

### 1. Chrome DevTools Frames 面板逐帧观察

打开任意使用 WebSocket 的页面，在 Network 面板里选中那条 `ws://` 连接：

- **Headers 面板**：核对握手请求的 `Upgrade: websocket`、`Sec-WebSocket-Key` 头，以及 `101 Switching Protocols` 响应里的 `Sec-WebSocket-Accept`
- **Frames 面板**：观察后续每个帧的方向、长度、内容，展开看单帧的 **FIN / opcode / MASK** 标志

这一看，第二部分的「握手是 HTTP、握手之后是帧」就不再是背的，而是亲眼看到的。

### 2. wscat 连接公开 WebSocket 服务

`wscat` 是 WebSocket 的命令行客户端（`npm install -g wscat`），用 `-c` 连一个公开服务，能清晰看到握手过程：

```bash
# 连接一个公开的 WebSocket echo 服务
wscat -c wss://echo.websocket.org
```

连接时会看到 `101 Switching Protocols` 的握手确认，之后逐帧观察收发消息——你发的每条消息，服务端都会原样 echo 回来。

### 3. 浏览器控制台验证握手算法

这个实验最直接地「验证」了第二部分讲的握手算法。在浏览器控制台执行：

```javascript
let ws = new WebSocket('wss://echo.websocket.org');
```

然后在 Network 面板里找到这条连接的请求头，记下 `Sec-WebSocket-Key` 的值，再核对响应里的 `Sec-WebSocket-Accept`。你可以自己验证：**`Sec-WebSocket-Accept` 是否等于「`Sec-WebSocket-Key` 拼接固定 GUID 后取 SHA-1 再 base64」的计算结果**——在控制台里用 `crypto.subtle` 跑一遍：

```javascript
// 用浏览器原生 crypto 验证 Sec-WebSocket-Accept 的计算
const key = '你从请求头里抄来的 Sec-WebSocket-Key';
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const buf = new TextEncoder().encode(key + GUID);
crypto.subtle.digest('SHA-1', buf).then(hash => {
  const bytes = new Uint8Array(hash);
  const accept = btoa(String.fromCharCode(...bytes));  // base64
  console.log('计算结果:', accept);
  console.log('应该等于响应头里的 Sec-WebSocket-Accept');
});
```

这个实验做一遍，「`Sec-WebSocket-Accept` 是怎么算出来的」就再也不会忘了。

---

## 六、参考资料

- https://www.rfc-editor.org/rfc/rfc6455 （WebSocket 协议规范）
- https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket （MDN WebSocket API）
- https://developer.mozilla.org/zh-CN/docs/Web/API/Server-sent_events （MDN Server-Sent Events）

> 推荐搜索关键词：「WebSocket 握手 Sec-WebSocket-Accept 计算」「WebSocket 帧格式 MASK 掩码」「WebSocket 心跳保活 僵尸连接」「TCP keepalive HTTP keep-alive 区别」「SSE WebSocket 选型」「socket.io 命名空间 房间 广播」。

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 考察频率 |
|--------|-----------|---------|
| 演进主线 | 短轮询→长轮询→SSE→WebSocket，逐步逼近「实时 + 双向」 | ⭐⭐⭐ 必考 |
| 握手过程 | 一次 HTTP 请求带 `Upgrade` 升级，`101` 切换协议；`Accept = base64(SHA1(Key+GUID))` | ⭐⭐⭐ 必考 |
| Accept 的作用 | 证明服务端理解协议、主动参与握手，**不是加密安全** | ⭐⭐⭐ 必考 |
| 帧格式 | FIN/opcode/MASK/payload length 二进制定义，是「零协议开销」的来源 | ⭐⭐⭐ 必考 |
| 掩码 | 客户端→服务端必掩码，防中间缓存投毒；XOR 可逆 | ⭐⭐⭐ 必考 |
| 心跳保活 | 协议层 ping/pong 防「僵尸连接」（NAT 静默丢弃） | ⭐⭐⭐ 必考 |
| 三种 keepalive | TCP keepalive=探活、HTTP keep-alive=复用、WS 心跳=保活，层次目的全不同 | ⭐⭐⭐ 必考 |
| SSE 选型 | 单向推用 SSE（复用 HTTP），双向实时才上 WebSocket | ⭐⭐⭐ 必考 |
| 负载均衡 | 长连接需 sticky session / 一致性哈希保证帧路由到同后端 | ⭐⭐ 高频 |
| socket.io | WebSocket 高层封装：事件抽象 + 自适应降级 + 房间广播 | ⭐⭐ 高频 |

> 💡 记住这条主线：**HTTP 半双工、服务器不能主动推，于是有了「短轮询 → 长轮询 → SSE → WebSocket」的演进；WebSocket 用一次 HTTP 请求升级协议，握手靠 `Sec-WebSocket-Accept` 证明服务端理解协议，握手之后进入「FIN/opcode/MASK/payload length」的二进制帧世界，客户端帧必须掩码防缓存投毒；长连接要靠应用层心跳对抗 NAT 静默丢弃的「僵尸连接」，而 TCP keepalive、HTTP keep-alive、WebSocket 心跳这三者层次目的完全不同；选型上单向推用 SSE、双向实时才用 WebSocket，多实例部署还得解决长连接的路由粘性**。把这条线串起来，WebSocket 的所有面试题都能从原理推到答案。

---

## 💡 面试核心问

- **WebSocket 握手过程中 `Sec-WebSocket-Accept` 是怎么算出来的？这个设计的目的是什么？**（`base64(SHA1(Key + GUID))`；目的不是加密，而是证明服务端理解协议、主动参与握手，防「普通 HTTP 服务器误响应升级请求」）
- **WebSocket 帧格式里 MASK 位的作用是什么？为什么只有客户端发往服务端的帧需要掩码？**（掩码防中间缓存投毒；客户端帧会被中间设备误判为 HTTP 响应而缓存，掩码让字节流不可预测；服务端方向无此攻击路径故不掩码）
- **为什么需要心跳保活机制？「僵尸连接」是怎么产生的？**（NAT/负载均衡空闲超时静默丢弃连接映射，两端无感知成「僵尸连接」；协议层 ping/pong + 业务层心跳两层探测，超时断开重连）
- **短轮询、长轮询、SSE、WebSocket 分别解决了什么问题？演进的主线是什么？**（主线是「在 HTTP 半双工约束下逐步逼近实时+双向」；每个方案解决上一阶段的痛点、留下新问题）
- **WebSocket 和 SSE 分别适合什么场景？如何选型？**（单向推用 SSE、复用 HTTP 基础设施 + 自动重连；双向实时才上 WebSocket；看「客户端要不要频繁主动发」）
- **TCP keepalive、HTTP keep-alive、WebSocket 心跳三者分别是什么？有什么本质区别？**（传输层探活 / 应用层连接复用 / 业务层保活探测，层次目的触发条件全不同）
- **多实例部署的 WebSocket 服务在负载均衡上有什么特殊要求？**（长连接需连接保持：sticky session 或一致性哈希，保证同一连接的所有帧路由到同一个后端）

---

## 📝 留个问题

WebSocket 掩码防的是「中间缓存投毒」，那问题来了：**掩码键本身是明文随帧传输的，既然任何人都能读到掩码键、也能算出反掩码，为什么它还能防住缓存投毒？它到底「防」的是什么、「不防」的是什么？**

提示：想想「掩码防的是『中间设备误判』还是『中间人窃听』」——这两个「防」的对象完全不同。要真正做到「保密」，WebSocket 需要什么？（想想 `ws://` 和 `wss://` 的区别）

欢迎评论区写出你的答案 👇

---

> 🔖 这是「网络原理深度拆解」系列第 06 篇。上一篇：《HTTP 语义基础：内容协商、状态码语义与请求方法的安全性与幂等性》；下一篇预告：《跨域与安全：CORS 机制/CSRF/XSS/CSP/安全响应头全解》
>
> 前置基础扩展阅读：搜索关键词「HTTP 半双工 全双工」「TCP 三次握手」「TLS 加密」



