# HTTP 演进：HTTP/1.1 队头阻塞、HTTP/2 多路复用与 HTTP/3+QUIC 深度拆解（面试收藏级）

> **副标题**：从文本协议到二进制分帧、从队头阻塞到多路复用、从 TCP 到 QUIC 的传输层革命

> 面试官问「HTTP/2 为什么比 HTTP/1.1 快？」——大多数人张口就背「多路复用、二进制分帧、头部压缩」。但你继续追问：「HTTP/1.1 的队头阻塞到底**阻塞在哪一层**？HTTP/2 解决了它之后，为什么**还有一个队头阻塞**没解决？QUIC 凭什么把 TCP 换成 UDP，还能保证**可靠传输**？」——能一路答到「传输层」这一层的，我面过的候选人里不到一成。这篇文章，就带你把这套「协议演进」从头到尾、从现象到本质彻底讲透。

---

## 🎯 这篇文章解决什么问题

这是「网络原理深度拆解」系列的第 **04** 篇。前三篇你已经掌握了 **DNS 解析（01）→ TCP 传输层机制（02）→ HTTPS/TLS 安全传输（03）**，所以本篇不会再重复解释「TCP 三次握手」「TLS 握手」「持久连接建立在 TCP 之上」这些背景——它们都是你已经会的知识，直接拿来用。

在分层大地图里，本篇落在**应用层**，讲的是 HTTP 协议本身「怎么传输数据」这件事，从 HTTP/1.1 一路演进到 HTTP/3。全篇只围绕一条主线展开，这条主线也是所有相关面试题的总纲：

> **「队头阻塞」到底阻塞在哪一层 → 每一代协议怎么解决它 → 解决之后又遗留了什么新问题 → 下一代再接着解决。**

具体是三层递进：

- **HTTP/1.1**：应用层队头阻塞——一个 TCP 连接上响应必须按序返回，前一个慢，后面全排队
- **HTTP/2**：用二进制分帧 + 多路复用解决「应用层队头阻塞」，但**传输层（TCP）的队头阻塞还在**
- **HTTP/3**：干脆把 TCP 换成基于 UDP 的 QUIC，按 stream 独立管理，连传输层队头阻塞也一并解决

这篇文章做三件事：**讲透原理**（三代协议为什么这么设计、解决了什么、遗留了什么）、**讲清工具**（`curl`/DevTools/Wireshark/`nghttp` 怎么验证）、**讲会面试**（每个知识点讲完，立刻跟上「面试官会怎么考、标准答案是什么、怎么答加分」）。

全篇示例统一用医疗场景的域名 `drug.example.com`（药品商城），队头阻塞的案例用医院 HIS 系统的「患者信息 + 处方列表 + 检验报告」三个接口。**既讲原理，也讲面试怎么答**。

---

## 一、HTTP/1.1 的队头阻塞是怎么产生的

要理解队头阻塞，得先回到 HTTP/1.0 时代，看它为什么一步步演化出「长连接 → 管线化」这些机制，最后又卡在了队头阻塞上。

### 1. HTTP/1.0 的原始模型：一个资源 = 一个 TCP 连接

最早期的 HTTP/1.0 时代，一个资源 == 一个 TCP 连接 == 一个 HTTP 连接。每次 HTTP 请求结束后都会断开 TCP 连接，新的 HTTP 请求要另外新建一个 TCP 连接，而且只有当一个完整请求结束（TCP closed）才会开始下一个请求：

![HTTP/1.0 一个资源一个 TCP 连接的串行模型](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731205507-0b76a24b-cc2e-4fb2-b4a4-33d68fefa228.png)

这种用法最严重的问题是**阻塞**：一个页面要加载 HTML、多张图片、多个脚本，每个资源都要经历一次「建立 TCP 连接 → 请求 → 响应 → 断开」，连接建立的开销被重复浪费。为了解决阻塞，后来允许**并发**——同一个域名可以建立多个 TCP 连接：

![HTTP/1.0 通过并行连接解决部分阻塞](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731205551-b290fee5-6dc5-4bab-a8bb-7f4e9071daee.png)

但多开连接只是「部分解决」了阻塞，还有两个更底层的问题没解决：

- **多次建立 TCP 连接的延迟**（Handshaking）——每次新连接都要三次握手
- **TCP 慢启动**（Slow Start）——新连接初始传输速度很慢，要慢慢「爬坡」到正常速率

这里插一句 TCP 慢启动，它是理解「为什么反复建连接很亏」的关键：TCP 连接会随着时间自我调整，起初会限制连接的最大速度，如果数据传输成功，会随着时间推移提高传输速度。简单说，TCP 主要解决两个问题——**稳定传输**（ACK 确认机制）和**包乱序**（Sequence Number 序号），同时还有两套控制机制——**拥塞控制**（避免高速发送端瘫痪网络）和**流量控制**（避免高速发送端瘫痪低速接收端）。慢启动是拥塞控制的一个基本算法：先设置小一点的窗口、发少一点的数据，收到 ACK 后慢慢加大窗口，通过丢包率、RTT 等判断网络环境，最终设定一个合适的窗口大小。**也就是说，一条「成熟」的 TCP 连接比一条「刚建立」的连接快得多**，反复建连等于反复从慢启动的低速开始爬坡。

### 2. 长连接（keep-alive）：复用同一个 TCP 连接

为了解决「TCP 连接利用率低」的问题，HTTP 提出了长连接（HTTP/1.0 可开启，HTTP/1.1 默认开启）：一个请求完成后不立刻断开连接，而是在一定时间内保持，以便快速处理即将到来的 HTTP 请求，复用同一个 TCP 通道，直到客户端心跳检测失败或服务器连接超时。

HTTP 协议的初始版本里，每进行一次 HTTP 通信就要断开一次 TCP 连接；随着 HTTP 普及，文档里包含大量图片的情况多了起来——浏览一个包含多张图片的 HTML 页面，请求 HTML 的同时还要请求里面包含的其他资源（图片），每次请求都造成无谓的 TCP 连接建立和断开：

![每请求一个资源就建立一次 TCP 连接的通信开销](https://cdn.nlark.com/yuque/0/2021/png/738210/1637132287589-ac50fdfb-5d6a-4359-bb7a-50b58c4e2021.png)

持久连接（HTTP Persistent Connections，也叫 HTTP keep-alive 或 connection reuse）的特点是：只要任意一端没有明确提出断开，就保持 TCP 连接状态。它旨在建立 **1 次 TCP 连接后进行多次请求和响应的交互**，好处是减少了 TCP 连接重复建立/断开造成的额外开销、减轻服务器负载，并且让 HTTP 请求和响应能更早结束，Web 页面显示速度也随之提高：

![持久连接：一次 TCP 连接承载多次请求响应](https://cdn.nlark.com/yuque/0/2021/png/738210/1637119906706-7d80da02-a55f-4b28-8285-fbfc7b1c1656.png)

长连接用响应头控制：

- server 通过响应头 `Connection: keep-alive` 来建立长连接
- client 通过请求头 `Connection: close` 来关闭长连接

**在 HTTP/1.1 中，所有连接默认都是持久连接**，但 HTTP/1.0 内并未标准化。

### 3. 管线化（Pipelining）：不用等响应就能发下一个请求

长连接解决了「反复建连」的问题，但还有一个问题：长连接上，客户端必须**等收到响应后才能发下一个请求**。管线化技术出现后，不用等待响应即可直接发送下一个请求，做到同时并行发送多个请求：

![管线化：不用等待就能直接发送下一个请求](https://cdn.nlark.com/yuque/0/2021/png/738210/1637120632932-70e302f3-bfce-4a4e-a2de-744bc5589d78.png)

**但管线化并没有真正解决队头阻塞。** 因为虽然请求可以连续发出，**响应还是必须严格按照发送请求的顺序返回**——客户端还是要按照发送请求的顺序接收响应。这意味着：如果第一个请求很耗时（比如查一个大报表），即使第二个、第三个请求早就处理好了，它们的响应也必须排队等第一个响应发完才能发出去。这功能因为「响应按顺序接收还是会有阻塞」，被浏览器默认关闭（或者压根没有）。

### 4. 队头阻塞的本质与「为什么限制 6 连接」

**队头阻塞的本质，一句话说清**：即使开启了持久连接和管线化，同一个 TCP 连接上的请求必须**严格按顺序返回响应**——前一个请求没处理完，后续请求即使已经处理好也要排队。这就是 **Head of Line Blocking（队头阻塞，也叫线头阻塞）**，简称 HOL。

它阻塞的根源，是 HTTP/1.1 是**文本协议**、响应是「一整段连续的文本流」，没有「分块标识」能让接收端分辨「这一块属于哪个请求」。所以接收端只能顺序解析：读完请求 1 的响应，才知道下面这段文本属于请求 2。

**为什么浏览器要限制单域名并发连接数（通常 6 个）？** 这正是队头阻塞逼出来的「曲线救国」方案：既然一个连接上会被前面慢的请求堵住，那就**多开几个连接**，让不同的请求走不同的连接，彼此不阻塞。Chrome 对单个域名默认最多 6 个并发连接。但多开连接也有代价（建立连接延迟 + 慢启动 + 服务器连接数压力），于是又催生了「**域名分片（Domain Sharding）**」——把资源分散到多个子域名（`static1.drug.com`、`static2.drug.com`），每个子域名又能开 6 个连接，变相提升并发上限。

> 一句话收口这一节：HTTP/1.1 的队头阻塞，**根子是「文本协议 + 响应必须按序返回 + 单连接串行」**。浏览器限制单域名 6 连接、域名分片这些优化手段，**根本原因都指向队头阻塞**——它们都是在「多开连接」这个方向上绕开它，而不是从根上解决它。

> 💬 **面试官**：HTTP/1.1 的队头阻塞具体是怎么产生的？为什么浏览器要限制单域名并发连接数？
>
> ✅ 标准答案：HTTP/1.1 即使开启了持久连接（keep-alive）和管线化，同一个 TCP 连接上的请求仍然必须**严格按照发送顺序返回响应**——前一个请求没处理完，后续请求即使已经处理好也要排队等待，这就是队头阻塞。根本原因是 HTTP/1.1 是文本协议，响应是一整段连续文本流，接收端只能顺序解析、无法并行区分「这段属于哪个请求」。浏览器限制单域名 6 个并发连接、以及「域名分片」，都是为了绕开队头阻塞——多开几个连接让不同请求走不同连接，彼此不阻塞。
>
> 🎁 加分答案：能点出「管线化为什么没被浏览器采用」——管线化只是让请求可以连续发出，**响应还是必须按序返回**，所以队头阻塞依旧存在，浏览器干脆默认关闭了它。再加一句：多开连接的代价是「每次建连的握手延迟 + TCP 慢启动」，这解释了为什么连接复用（keep-alive）本身有价值、但「6 连接」这个上限是性能与资源之间的折中。

---

## 二、HTTP/2：二进制分帧 + 多路复用

HTTP/2 解决队头阻塞的思路，不是「多开连接」，而是**在单个连接内部，让多个请求真正并行**。它靠两个核心设计：**二进制分帧**（把数据拆成带标识的帧）和**多路复用**（帧在同一个连接上交错传输）。

### 1. 先建立一个抽象模型

**先建立一个抽象模型**（下面这段话很重要，是理解后续所有内容的地基）：

> 在客户端与服务器之间仅建立**一个** TCP 连接，而且该连接在交互持续期间一直处于打开状态。在此连接上，消息是通过逻辑**流**进行传递的。一条**消息**包含一个完整的**帧序列**。在经过整理后，这些帧表示一个响应或请求。

这里有几个核心概念，后续内容都围绕它们展开：

- **Connection（连接）**：仅与一个对等节点建立一个
- **Stream（流）**：逻辑意义上的流，物理实体为连接，**一个物理连接拥有多个逻辑流**
- **Message（消息，即请求/响应）**：是一组帧，通过逻辑流传输，重建这些帧会得到一个完整的请求或响应
- **Frame（帧）**：通信的基本单位

### 2. 帧的结构

HTTP/2 把每个请求/响应都拆成多个帧，每个帧的帧头固定 9 字节，携带了「这个帧属于哪个流」的标识：

![HTTP/2 帧结构](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731205273-9c5c2449-dad6-42f3-ae16-907ef04df512.png)

帧头各字段的作用：

- **LENGTH**：帧的大小，最多可为 2²⁴ bit（16MB）
- **TYPE**：标识帧的用途，常见类型有——`HEADERS`（只有 header 信息）、`DATA`（只有 message payload）、`PRIORITY`（流的优先级信息）、`RST_STREAM`（报错 / reject PUSH_PROMISE / 关闭连接）、`SETTINGS`（连接设置）、`PUSH_PROMISE`（通知客户端有服务器推送意图）、`PING`（心跳和 round-trip time）、`GOAWAY`（对当前连接停止提供流）、`WINDOW_UPDATE`（flow control of streams）、`CONTINUATION`（继续一系列的 HEADER fragment）
- **R**：reserved 保留位
- **FLAG**：Boolean 值（0/1），不同帧有不同的 flag——DATA 帧有两个（`END_STREAM`/`PADDED`），HEADERS 帧有四个（`END_STREAM`/`PADDED`/`END_HEADERS`/`PRIORITY`），PUSH_PROMISE 有两个（`END_HEADERS`/`PADDED`）
- **STREAM IDENTIFIER**：用于 track 帧所属的逻辑流，是**多路复用的关键**——接收端靠它把交错传输的帧重新组装回各自的流

其中 FLAG 各标志的含义：

- `END_STREAM`：数据流的结尾
- `PADDED`：存在填充数据
- `END_HEADERS`：header 的结尾
- `PRIORITY`：优先级被设定

### 3. 二进制分帧

**二进制分帧**：HTTP/2 保留了原始 HTTP 协议的**语义**（方法、状态码、header 这些概念都在），但改变了在系统之间**传输数据的方式**——把一个文本请求/响应，拆成一个或多个二进制帧。

先看一个文本请求怎么映射成帧：

![文本请求映射到帧](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731205175-5fd51054-1756-41af-8418-0da312e5b04e.png)

- `END_STREAM` 为 true（+），表示为请求的最后一帧（没有 DATA 帧）
- `END_HEADERS` 为 true，表示为流中最后一个包含 HEADER 信息的帧

再看一个文本响应怎么映射成帧：

![文本响应映射到帧](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731205649-d0165687-873d-4ede-a7e6-96c56be105c6.png)

- `END_STREAM` in HEADERS 为 false（-）表示不是流的最后一帧
- `END_HEADERS` in HEADERS 为 true（+）表示最后一个 HEADER 帧
- `END_STREAM` in DATA 为 true（+）表示当前流最后一帧

**为什么二进制协议比文本协议更快？** 差别主要在于**解析**：

- TCP 就是二进制协议，每一位表示什么都是固定的，解析起来只用判断 0/1 就好，效率更高
- HTTP/1.x 是文本协议，因为都是字符串，解析起来要么用正则、要么用状态机，效率更低

HTTP/2 允许保留原来的文本格式，但会经过一个「二进制分帧」的过程，将文本彻底转化为二进制传输：

![二进制协议分层](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731205992-7487c85f-a169-4bcc-97a8-ea75b662e72f.png)

### 4. 多路复用（Multiplexing）

**多路复用**：有了「帧」这个最小单位，就能让不同流的帧在**同一个 TCP 连接上交错传输**。旧的 HTTP 协议的队头阻塞，之前的解决方案是同时开多个 TCP 连接（Chrome 有 6 个），但多个 TCP 连接很耗费网络资源——实际上「单连接」就够了，方式就是把消息分成更小的单位（帧），实现请求和响应消息的复用。

比如下图有三个逻辑流：一个请求（深蓝）、两个响应（浅蓝、绿），每一块代表一个帧：

![三个逻辑流的帧交错传输](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731206115-6cff463d-b4a4-41ab-b1e5-b2a1d9435ca0.png)

把帧分解成 HEADER 和 DATA 帧后更清楚——同一个 CONNECTION 上，STREAM 1/2/3 的帧交错出现，接收端按 stream ID 重新组装：

![帧分解成 HEADER 和 DATA 帧后按 stream ID 交错](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731206863-ab7a45e3-984d-43d4-a262-99c808223263.png)

多路复用的优点：

- Request 和 Response 都在一个 socket 上
- 所有的响应和请求都无法相互阻塞
- 减少了建立连接带来的延迟
- 不再需要像 HTTP/1.1 那样把多个请求合成一个
- 每个服务器（域）只用一个连接，而不是每个文件一个连接

### 5. 头部压缩（HPACK）

**头部压缩（HPACK）**：多路复用解决了「传输并行」的问题，但还有一个开销问题——HTTP/1.1 每次请求都要重复发送大量相同的 header（`User-Agent`、`Cookie`、`Accept` 等），浪费带宽。HPACK 的原理是**缓存**——与其叫头部压缩，不如叫头部缓存：要求客户端和服务器各自维护一个 HEADER 字段的列表，多次发送时**只发送差异的部分，其余从缓存表里取**。

用 JavaScript 描述大概是这个意思：

```javascript
const cachedHeaders = {
  method: 'GET',
  host: 'example.com'
}
const newHeaders = {
  method: 'POST'
}
const receivedHeaders = {
  ...cachedHeaders,
  ...newHeaders
}
```

举个栗子，第一次请求后，第二次请求只发送与之前请求头不同的部分：

![HPACK 头部压缩：第二次请求只发差异部分](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731207282-58fd81e3-adaf-4f3b-9987-8cdf52d1a827.png)

### 6. 三个补充特性

**三个补充特性**（完整覆盖 HTTP/2，面试时能主动提出来是加分项）：

**① 服务器推送（Server Push）**：允许服务器预测客户端需要，在请求处理完成之前先发一个 `PUSH_PROMISE` 帧，然后推送资源。为防止发送不必要资源，服务器会给每个要推送的资源发一个 `PUSH_PROMISE` 帧，如果资源已有缓存，浏览器可以 respond 一个 `RST_STREAM` 帧拒绝推送：

![服务器推送](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731206554-ad83c6f3-a021-4c35-ab28-b245f0599f2f.png)

（服务器推送这个特性，理论上有用，但实际还需要 tune，且因为缓存判断难，Chrome 已经逐步移除对它的支持——面试时可以点一句「Server Push 已式微」。）

**② 流控制（Flow Control）**：防止 receiver 被 sender 淹没，允许 receiver 停止/减少发送的数据。比如视频流媒体服务，用户点击暂停，client 会通知 server 停止发送视频数据。连接一旦 open，server 和 client 便交换 `SETTINGS` 帧，构建 flow-control window 的大小（默认 65KB，可通过 `WINDOW_UPDATE` 帧改变）。

**③ 优先级（Priority）**：消息通过流传输，每个流都被指定一个优先级，优先级决定**处理的顺序**和**分配的资源**（0-256 的数字），可以组织成树形结构标记依赖关系：

![流的优先级树](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731206999-57172423-12b0-4af6-ae29-d22a413d3d5b.png)

上图：A 先发送，B/C 同时发送分别拿到 40%/60% 的资源，D/E 则拿到 C 的各一半资源。优先级仅仅是参考（only a suggestion），服务器应根据自己的能力决定如何处理。

### 7. 工具验证 + Node.js 对比

**用 curl / DevTools / nghttp 观察**。Chrome DevTools 的 Network 面板，默认是不显示「协议版本」这一列的。右键表头，勾选 **Protocol**，就能看到每个请求实际命中的协议：`h2` 跑 HTTP/2、`h3` 跑 HTTP/3、`http/1.1` 跑 HTTP/1.1。一个页面上不同资源，**协议版本可能不一样**——协议协商是逐连接、逐域名独立的。

`curl` 是验证协议差异最直接的工具，三个参数强制指定版本：

```bash
# 强制用 HTTP/1.1
curl --http1.1 -I https://www.example.com

# 强制用 HTTP/2
curl --http2 -I https://www.example.com

# 强制用 HTTP/3（需要 curl 编译时带 HTTP/3 支持，较新版本才支持）
curl --http3 -I https://www.example.com
```

`-I` 只取响应头，重点观察 `-v`（verbose）输出里的握手信息，能看到实际协商出了哪个版本。用 `nghttp` 观察 HPACK 头部压缩效果：

```bash
# nghttp 是 HTTP/2 的调试客户端，能显示每帧的详情
nghttp -nv https://www.example.com
```

重点看 HPACK 的效果：`nghttp` 会显示每个 `HEADERS` 帧压缩前后的大小。连续发多个请求，观察第二个请求的 header 帧明显比第一个小（因为大量 header 字段被索引、只发了差异）。

**Node.js 里 http 与 http2 模块的用法差异**：Node.js 里，HTTP/1.1 用 `http` 模块，HTTP/2 用 `http2` 模块——两者 API 几乎一一对应，但底层模型完全不同：

```javascript
// HTTP/1.1：一个请求对应一个 request/response 对象
const http = require('http');
const server = http.createServer((req, res) => {
  res.end('hello http/1.1');
});
server.listen(3000);

// HTTP/2：一个连接（Http2Session）上有多个流（Http2Stream）
const http2 = require('http2');
const server2 = http2.createServer();
server2.on('stream', (stream, headers) => {
  stream.respond({ ':status': 200 });
  stream.end('hello http/2');
});
server2.listen(3001);
```

注意差别：HTTP/1.1 的 `createServer` 回调参数是 `req`/`res`（一个请求一个响应），HTTP/2 的回调是 `stream`（一个逻辑流，同一个连接上可以同时有多个 stream）。这个「一个连接多个流」的模型，就是 HTTP/2 多路复用的核心——`Http2Session` 代表一条 TCP 连接，`Http2Stream` 代表这条连接上的一个逻辑流。

**Nginx 开启 HTTP/2、HTTP/3**：

```nginx
# 开启 HTTP/2（TLS 必须开启，因为 HTTP/2 在浏览器里只走 HTTPS）
listen 443 ssl http2;

# 开启 HTTP/3（需要 Nginx 1.25+ 且编译了 http_v3_module，走 UDP 443）
listen 443 quic reuseport;
listen 443 ssl;
```

注意：**浏览器里的 HTTP/2 只通过 HTTPS 协商**（通过 TLS 的 ALPN 扩展），所以 `listen 443 ssl http2;` 里 `ssl` 和 `http2` 必须同时出现。HTTP/3 则监听 UDP 443 端口（QUIC 跑在 UDP 上），这是它和 HTTP/1.1、HTTP/2（都跑在 TCP 443）最根本的差别。

> 💬 **面试官**：HTTP/2 是怎么用多路复用解决应用层队头阻塞的？
>
> ✅ 标准答案：HTTP/2 引入了**二进制分帧**——把每个请求/响应拆成多个带 stream ID 的帧，不同请求的帧可以在**同一个 TCP 连接上交错发送**，接收端根据帧头的 stream ID 重新组装。这样同一连接上的多个请求就能真正并行处理，不再像 HTTP/1.1 那样「前一个响应没发完，后一个就得排队」，从应用层彻底解决了队头阻塞。同时头部压缩（HPACK）用「只发差异」减少了重复头部字段占用的带宽。
>
> 🎁 加分答案：能说清四个概念的关系——Connection（一个物理连接）承载多个 Stream（逻辑流），每个 Stream 上传输一个 Message（由一组 Frame 构成），Frame 是通信基本单位，靠 stream ID 区分归属。再补充「二进制 vs 文本」的解析效率差异：二进制协议逐位判断 0/1，文本协议要正则/状态机解析，前者解析更快、更不易出错。如果能主动提一句「多路复用让 HTTP/1.1 时代的雪碧图、域名分片、文件合并这些优化手段失效甚至有害」，说明你理解了它的根本意义。

---

## 三、HTTP/2 依然存在的队头阻塞（传输层队头阻塞）

多路复用解决了**应用层**的队头阻塞，但 HTTP/2 还有一个**没解决**的队头阻塞——这次它藏在**传输层（TCP）**。

关键点：HTTP/2 仍然跑在**单个 TCP 连接**上。而 TCP 是一个**按字节序可靠传输**的协议，它要求数据**按序、无丢失**地交付给上层。这意味着：

> TCP 连接发生丢包时，TCP 的可靠传输机制要求**丢失的包重传后，后续所有数据才能被上层处理**——即使后面的数据已经完好到达了。

举一个直观的例子：HTTP/2 的同一个 TCP 连接上有 3 个 stream（stream 1/2/3）的帧交错传输，底层这些帧都被打包装进 TCP 报文的字节流里。如果**某一个 TCP 报文段丢了**（比如包含 stream 1 数据的那个段），TCP 会怎么做？

- TCP 必须先重传这个丢失的段，**并且按序交付**——丢失段之后的所有已到达数据（哪怕属于 stream 2、stream 3，且完好无损）都**不能往上交给应用层**，只能先缓存在内核缓冲区里等重传
- 结果就是：**一个 stream 的丢包，拖累了同一个 TCP 连接上所有 stream**

这就是「**传输层的队头阻塞**」——它不在 HTTP 应用层，而在 TCP 这一层。HTTP/2 的多路复用虽然让「请求/响应」在应用层并行，但**无法改变 TCP 按序交付的底层语义**，所以只要这条 TCP 连接上有一个包丢了，整条连接上所有 stream 都会被阻塞，直到重传完成。

**这解释了为什么 HTTP/2 在高丢包网络（弱网、移动网络）下，性能甚至不如 HTTP/1.1**：HTTP/1.1 有 6 个连接，一个连接丢包只影响这个连接上的请求；而 HTTP/2 只有一个连接，一个丢包影响全部。弱网丢包率高，HTTP/2 的单连接成了单点瓶颈。

用 Wireshark 抓 HTTP/2 连接，能直观看到多路复用（也顺带看到「所有帧共享一条 TCP 连接」这个传输层队头阻塞的根源）：

```bash
# 抓 HTTP/2 流量（前提：用浏览器访问一个 https 站点，TLS 解密较复杂，也可用 curl --http2 访问本地 h2 服务）
tcp.port == 443
```

重点观察：同一个 TCP 连接上，多个 `HEADERS`/`DATA` 帧按 stream ID 交错传输——帧头里的 stream ID 一会儿是 1、一会儿是 3、一会儿是 5，交错出现。对照 HTTP/1.1 的抓包，那是「一个请求一段响应」的串行结构。但注意：**所有这些帧都打包在同一条 TCP 字节流里**，这就是为什么一个 TCP 段丢包会阻塞所有 stream。

> 💬 **面试官**：HTTP/2 还存在队头阻塞吗？阻塞在哪一层？
>
> ✅ 标准答案：还存在，但阻塞的位置从「应用层」转移到了「传输层」。HTTP/2 的多路复用解决了应用层队头阻塞（请求/响应可以并行），但它仍然跑在**单个 TCP 连接**上。TCP 是**按序可靠交付**的协议，一旦发生丢包，TCP 要求丢失的包重传后后续所有数据才能交给上层处理——所以一个 stream 丢包会阻塞同一个 TCP 连接上的所有 stream，这是传输层队头阻塞，HTTP/2 无法解决。
>
> 🎁 加分答案：能点出「高丢包网络下 HTTP/2 反而不如 HTTP/1.1」这个反直觉现象及其原因——HTTP/1.1 有 6 个连接，丢包只影响单个连接；HTTP/2 单连接，一个丢包拖累全部。这恰恰是 HTTP/3 要换掉 TCP 的直接动机。如果能再补一句「传输层队头阻塞的根源是 TCP 的『字节流按序交付』语义与多路复用『希望各 stream 独立』之间的根本冲突」，说明你真正理解到了本质层。

---

## 四、HTTP/3 + QUIC：把 TCP 换成 UDP

HTTP/2 的传输层队头阻塞，根源在 TCP 的「按序可靠交付」与「多路复用希望各流独立」的根本冲突。既然问题在 TCP，最彻底的办法就是——**换掉 TCP**。

HTTP/3 把底层传输协议从 TCP 换成基于 UDP 的 **QUIC**。这里要澄清一个常见误解：**QUIC 不是「用 UDP 传数据、不保证可靠」**，而是**在 UDP 之上重新实现了可靠传输、拥塞控制、多路复用**——也就是说，TCP 曾经提供的那些能力（可靠、有序、拥塞控制），QUIC 在 UDP 之上重新实现了一遍，但**用更灵活的方式**。

### 1. 为什么是 UDP 而不是改 TCP

QUIC 为什么要选择 UDP 而不是直接改 TCP？关键在**部署现实**：TCP 协议栈深埋在操作系统内核里，改 TCP 意味着要升级所有终端和中间设备的操作系统内核，这几乎不可能快速落地；而 UDP 只是「尽力而为」的简单报文传输，在它**之上**实现 QUIC 完全在**用户态**完成，只要应用（浏览器/服务器）升级就能用，不用动内核和中间设备。**UDP 给了 QUIC 一个「快速迭代、按需自建传输能力」的地基**。

### 2. 关键：按 stream 独立管理

**QUIC 解决传输层队头阻塞的关键：按 stream 独立管理。**

这是 QUIC 和 HTTP/2（跑在 TCP 上）最本质的区别：

- **HTTP/2 + TCP**：所有 stream 的帧都被打包装进**同一个 TCP 字节流**里，TCP 按字节序交付，一个字节丢了，它后面所有字节（无论属于哪个 stream）都得等重传——stream 之间**互相牵连**
- **QUIC**：多路复用**按 stream 独立管理**，每个 stream 的数据在 QUIC 层是**独立编号、独立重传**的——**一个 stream 丢包只影响这一个 stream，不会阻塞其他 stream**

用一句话记住区别：HTTP/2 的「并行」是应用层的并行，底层还是被 TCP 的字节流「串」成了一条；QUIC 的「并行」是**传输层原生支持的多 stream 独立**，丢包的重传边界从「整个连接」细化到了「单个 stream」。

### 3. 内置 TLS 1.3

**QUIC 还内置了 TLS 1.3，握手和加密协商合并进行。**

HTTP/2 的握手要先 TCP 三次握手，再做 TLS 握手，多轮往返；QUIC 把 **TLS 1.3 内置进协议**，传输握手和加密协商**合并进行**，减少了额外的往返延迟——**0-RTT 重连时延迟更低**（之前连接过的主机再次连接，可以直接带数据，不用等握手完成）。

```
HTTP/2 握手（TCP + TLS 分离，多轮往返）：
  客户端 ──TCP SYN──▶ 服务器
         ◀──SYN+ACK──
         ────ACK────▶          ← TCP 三次握手完成
         ──TLS ClientHello──▶
         ◀──ServerHello/证书──
         ──密钥交换/Finished──▶  ← TLS 握手完成，才开始传数据

HTTP/3 握手（QUIC 合并传输 + 加密，更少往返）：
  客户端 ──QUIC Initial(含 TLS ClientHello)──▶ 服务器
         ◀──QUIC(含 TLS ServerHello/证书)─────
         ──QUIC(含 Finished + 应用数据)─────▶  ← 握手更早完成，可 0-RTT
```

> 💬 **面试官**：HTTP/3 为什么要换成基于 UDP 的 QUIC？QUIC 是怎么解决传输层队头阻塞的？
>
> ✅ 标准答案：HTTP/2 的传输层队头阻塞根源在 TCP 的「字节流按序交付」——一个丢包阻塞整条连接上的所有 stream。要彻底解决只能换掉 TCP，但 TCP 在内核里改不动，所以 QUIC 选择**在 UDP 之上用用户态重新实现可靠传输、拥塞控制、多路复用**。关键区别是 QUIC 的多路复用**按 stream 独立管理**，每个 stream 独立编号、独立重传，一个 stream 丢包只影响这一个 stream，不会阻塞其他 stream。
>
> 🎁 加分答案：能点出「为什么是 UDP 而不是改 TCP」的部署现实——TCP 栈在内核里，改它要升级所有终端和中间设备的内核，几乎不可行；UDP 只是简单报文传输，在其上实现 QUIC 完全在用户态，浏览器/服务器升级就能用。再补一条 QUIC 的额外优势——内置 TLS 1.3，握手和加密协商合并，减少往返延迟，0-RTT 重连时延迟更低。如果能说清「QUIC 的可靠性不是不要了，而是从 TCP 那里接管过来、按 stream 粒度重新实现」，就是满分答案。

---

## 五、连接迁移：QUIC 用连接 ID 标识连接

QUIC 还有一个移动端特别实用的能力——**连接迁移（Connection Migration）**。

TCP 连接由**四元组**（源 IP + 源端口 + 目的 IP + 目的端口）唯一标识。这意味着：一旦你的设备切换网络——比如从 WiFi 切到移动网络——**你的 IP 地址变了**，四元组变了，TCP 连接就**断了**，必须重新三次握手建立新连接。这对移动场景（坐地铁、进电梯、切换基站）是巨大的体验损耗。

QUIC 用**连接 ID（Connection ID）**而不是四元组来标识连接。切换网络时，虽然 IP/端口变了，但**连接 ID 不变**，QUIC 可以识别出「这是同一条连接」，从而**不中断地迁移**到新的网络路径上继续通信：

```
TCP 标识连接：四元组 (源IP, 源端口, 目的IP, 目的端口)
  WiFi:  (192.168.1.5, 54321)  →  切换到移动网络 (10.20.30.40, 54321)
  ✗ 四元组变了，连接中断，必须重新握手

QUIC 标识连接：连接 ID（与 IP/端口解耦）
  WiFi:  (ConnectionID = 0x1a2b3c)
  移动网络: (ConnectionID = 0x1a2b3c)  ← 连接 ID 不变
  ✓ 识别为同一条连接，无缝迁移，不需要重新握手
```

这是移动端场景下 HTTP/3 相比 HTTP/2 的**额外优势**：HTTP/2 跑在 TCP 上，天生受四元组约束，切网必断；HTTP/3 跑在 QUIC 上，切网不断连。对「边走边看视频、进电梯切网络」这类场景，体验差距非常明显。

> 💬 **面试官**：QUIC 的连接迁移能力解决了什么实际问题？
>
> ✅ 标准答案：TCP 用四元组（源 IP/端口 + 目的 IP/端口）标识连接，切换网络时 IP 变了、四元组变了，连接必须中断重连。QUIC 用**连接 ID** 而不是四元组标识连接，切换网络（如 WiFi → 移动网络）时连接 ID 不变，QUIC 能识别出是同一条连接并**无缝迁移**，不需要重新握手。这解决了移动端「切网必断、断后重连」的体验痛点。
>
> 🎁 加分答案：能落到具体场景——移动端坐地铁、进电梯、切换基站时网络频繁切换，TCP 每次切网都要重连（重新握手 + 慢启动爬坡），HTTP/3 的连接迁移让视频通话、实时通信这类长连接场景「切网不断流」。如果能再点一句「连接迁移依赖连接 ID 与 IP 解耦，这正是 QUIC 选 UDP、把连接标识从四元组里解放出来的设计红利」，说明你理解到了设计动机层。

---

## 扩展章节：手写还原 HTTP/1.1，看清「文本协议」的麻烦

讲完三代协议的演进，回到起点——**为什么 HTTP/1.1 的文本协议解析这么繁琐、繁琐到要手写一个逐字节状态机？** 这正是 HTTP/2 要「二进制化」的根本动机。这一节完整还原一个 HTTP/1.1 的 GET/POST/文件上传实现，让你亲眼看「文本协议」的解析到底麻烦在哪。

### 为什么手写一遍

三个目标：

- 学习如何获取**专业权威的一手知识**（读 RFC 标准文档）
- 学习如何阅读 RFC，以及用**扩展巴科斯范式（ABNF）**定义的通信协议语言
- 学习 HTTP 协议的**实现和解析细节**——文本协议到底怎么「拆」出一行行 header

先看 HTTP 在 TCP/IP 参考模型里的位置——HTTP 是**应用层**协议，跑在 TCP（传输层）之上：

![TCP/IP 参考模型](https://cdn.nlark.com/yuque/0/2025/png/738210/1764579468142-dfbed2e9-c428-4bec-9949-13314c7b3dc4.png)

一个 HTTP 请求消息的 ABNF 定义是这样的（`*()` 表示零个或多个）：

```plain
Request = Request-Line;
          *((general-header | request-header | entity-header) CRLF)
          CRLF
          [message-body]
```

翻译成人话：**请求行 → 一堆首部字段（每个以 CRLF 结尾）→ 一个空行（CRLF）→ 可选的请求体**。

### 手写 GET

先看一个真实的 GET 请求长什么样：

```http
GET /get HTTP/1.1
Host: 127.0.0.1:8080
Connection: keep-alive
name: zhufeng
age: 10
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36
Accept: */*
Accept-Encoding: gzip, deflate, br
Accept-Language: zh-CN,zh;q=0.9
```

用 Wireshark 抓下来是这样（注意最底下的 `HYPERTEXT TRANSFER PROTOCOL` 展开，能看到一行行明文 header）：

![Wireshark 抓到的 GET 请求](https://cdn.nlark.com/yuque/0/2025/png/738210/1764579468096-8b16523d-74b3-4cfd-a479-72e5ea3523fc.png)

响应长这样：

```http
HTTP/1.1 200 OK
Context-type: text-plain
Date: Fri, 14 Aug 2020 03:58:41 GMT
Connection: keep-alive
Transfer-Encoding: chunked

3
get
0
```

响应在 Wireshark 里抓下来，同样能看到一行行明文 header，以及 chunked 分块的十六进制数据（`GET` 三个字节 = `33 0D 0A` 那段）：

![Wireshark 抓到的 GET 响应](https://cdn.nlark.com/yuque/0/2025/png/738210/1764579468572-45a1dd1e-8769-4a07-ac2a-6bc7810b01fd.png)

注意最后那个 `Transfer-Encoding: chunked` 和 `3/get/0` 的分块结构——`3` 表示下一块 3 字节，`get` 是数据，`0` 表示结束。这是 HTTP 的分块传输编码（chunked），后面手写服务端时要手动拼。

先看标准库 `http` 模块怎么实现一个 GET 服务端：

```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');
const server = http.createServer(function(req,res){
  if(['/get.html'].includes(req.url)){
    res.writeHead(200,{'Context-type':"text-html"});
    res.end(fs.readFileSync(path.join(__dirname,'static',req.url.slice(1))));
  }else if(req.url === '/get'){
    res.writeHead(200,{'Context-type':"text-plain"});
    res.end('get');
  }
});
server.listen(8080);
```

浏览器端的 HTML（用 XHR 发 GET 请求）：

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>get</title>
  </head>
  <body>
    <script>
      let xhr = new XMLHttpRequest();
      xhr.onreadystatechange = ()=>{
        console.log('onreadystatechange',xhr.readyState);
      }
      xhr.open("GET", "http://127.0.0.1:8080/get");
      xhr.responseType="text";
      xhr.setRequestHeader('name', 'zhufeng');
      xhr.setRequestHeader('age', '10');
      xhr.onload = () => {
        console.log('readyState',xhr.readyState);
        console.log('status',xhr.status);
        console.log('statusText',xhr.statusText);
        console.log('getAllResponseHeaders',xhr.getAllResponseHeaders());
        console.log('response',xhr.response);
      };
      xhr.send();
    </script>
  </body>
</html>
```

现在**不用 `http` 模块，直接用 `net` 模块（TCP socket）手写一个客户端**，模拟 XMLHttpRequest 发 GET 请求——重点看「怎么把请求行和 header 拼成字符串写进 socket」：

```javascript
let net = require('net');
const ReadyState = {
  UNSENT:0,//（代理被创建，但尚未调用 open() 方法。
  OPENED:1,//open() 方法已经被调用
  HEADERS_RECEIVED:2,//send() 方法已经被调用，并且头部和状态已经可获得。
  LOADING:3,//（交互）正在解析响应内容
  DONE:4 //（完成）响应内容解析完成，可以在客户端调用了
}
class XMLHttpRequest {
  constructor(){
    this.readyState = ReadyState.UNSENT;
    this.headers = {};
  }
  open(method, url) {
    this.method = method||'GET';
    this.url = url;
    let {hostname,port,path} = require('url').parse(url);
    this.hostname = hostname;
    this.port = port;
    this.path = path;
    this.headers.Host=`${hostname}:${port}`;
    const socket = this.socket =  net.createConnection({port: this.port,hostname:this.hostname},()=>{
      socket.on('data', (data) => {
        data = data.toString();
        let [response,bodyRows] = data.split('\r\n\r\n');   // 👈 用 \r\n\r\n 分割响应头和响应体
        let [statusLine,...headerRows] = response.split('\r\n');
        let [,status,statusText] = statusLine.split(' ');
        this.status = status;
        this.statusText = statusText;
        this.responseHeaders = headerRows.reduce((memo,row)=>{
          let [key,value] = row.split(': ');                // 👈 用 : 分割 key/value
          memo[key]= value;
          return memo;
        },{});
        this.readyState = ReadyState.HEADERS_RECEIVED;
        xhr.onreadystatechange&&xhr.onreadystatechange();
        this.readyState = ReadyState.LOADING;
        xhr.onreadystatechange&&xhr.onreadystatechange();
        let [,body,] = bodyRows.split('\r\n');
        this.response = this.responseText = body;
        this.readyState = ReadyState.DONE;
        xhr.onreadystatechange&&xhr.onreadystatechange();
        this.onload&&this.onload();
      });
      socket.on('error', (err) => {
        this.onerror&&this.onerror(err);
      });
    });
    this.readyState = ReadyState.OPENED;
    xhr.onreadystatechange&&xhr.onreadystatechange();
  }
  getAllResponseHeaders(){
    let allResponseHeaders='';
    for(let key in this.responseHeaders){
      allResponseHeaders+=`${key}: ${this.responseHeaders[key]}\r\n`;
    }
    return allResponseHeaders;
  }
  setRequestHeader(header,value){
    this.headers[header]= value;
  }
  send() {
    let rows = [];
    rows.push(`${this.method} ${this.path} HTTP/1.1`);
    rows.push(...Object.keys(this.headers).map(key=>`${key}: ${this.headers[key]}`));
    this.socket.write(rows.join('\r\n')+'\r\n\r\n');   // 👈 手工拼接请求行+header，最后 \r\n\r\n 结尾
  }
}

let xhr = new XMLHttpRequest();
xhr.onreadystatechange = ()=>{
  console.log('onreadystatechange',xhr.readyState);
}
xhr.open("GET", "http://127.0.0.1:8080/get");
xhr.responseType="text";
xhr.setRequestHeader('name', 'zhufeng');
xhr.setRequestHeader('age', '10');
xhr.onload = () => {
  console.log('readyState',xhr.readyState);
    console.log('status',xhr.status);
    console.log('statusText',xhr.statusText);
    console.log('getAllResponseHeaders',xhr.getAllResponseHeaders());
    console.log('response',xhr.response);
};
xhr.send();
```

再看手写的 GET 服务端——用 `net.createServer` 直接监听 socket，**手工解析请求行和 header，再手工拼响应**（包括 chunked 分块的十六进制长度）：

```javascript
const net = require('net');
const server = net.createServer((socket) => {
  socket.on('data',(data)=>{
    let request = data.toString();
    let [requestLine,...headerRows] = request.split('\r\n');
    let [method,path] = requestLine.split(' ');
    let headers = headerRows.slice(0,-2).reduce((memo,row)=>{
      let [key,value] = row.split(': ');
      memo[key] = value;
      return memo;
    },{});
    console.log('method',method);
    console.log('path',path);
    console.log('headers',headers);

    let rows = [];
    rows.push(`HTTP/1.1 200 OK`);
    rows.push(`Context-type: text-plain`);
    rows.push(`Date: ${new Date().toGMTString()}`);
    rows.push(`Connection: keep-alive`);
    rows.push(`Transfer-Encoding: chunked`);
    let responseBody = 'get';
    rows.push(`\r\n${Buffer.byteLength(responseBody).toString(16)}\r\n${responseBody}\r\n0`);   // 👈 chunked：长度(16进制)+数据+0结束
    let response = rows.join('\r\n');
    socket.end(response);
  });
})
server.on('error', (err) => {
  console.error(err);
});

server.listen(8080,() => {
  console.log('服务器已经启动', server.address());
});
```

看到重点了吗？**手写文本协议，就是一堆 `split('\r\n')`、`split(': ')`、`join('\r\n')` 的字符串操作**。文本协议没有「字段边界」，全靠 `\r\n`（CRLF）这种字符来分隔，解析时只能自己切字符串。

### 手写 POST + 逐字节状态机 Parser

GET 的解析用 `split` 勉强能应付，但遇到 POST（有请求体、有 `Content-Length`）时，**字符串切割就很容易出错**了——因为你不知道请求体里会不会恰好出现 `\r\n`、header 是不是被分包到达（一次 `data` 事件可能只收到半个请求）。所以正规的解析器要用**逐字节状态机**。

先看 POST 的请求和响应（Wireshark 抓包）：

![Wireshark 抓到的 POST 请求](https://cdn.nlark.com/yuque/0/2025/png/738210/1764579468311-46960943-b229-4697-92d8-0e7a6ddb9648.png)

![Wireshark 抓到的 POST 响应](https://cdn.nlark.com/yuque/0/2025/png/738210/1764579468393-d00a0b7a-60a0-474b-8da8-a534f487858d.png)

POST 与 GET 的区别在于多了请求体：请求头里带 `Content-Type: application/json` 和 `Content-Length: 13`，请求体是 `{"name":"zf"}`。抓包里能清楚看到「头部区」和「body 区」被一个空行（CRLF）分隔。

先看标准库 `http` 模块的 POST 服务端（在 GET 基础上加 `/post` 路由，手动收流、拼 body）：

```diff
const http = require('http');
const fs = require('fs');
const path = require('path');
const server = http.createServer(function(req,res){
+  if(['/get.html','/post.html'].includes(req.url)){
    res.writeHead(200,{'Context-type':"text-html"});
    res.end(fs.readFileSync(path.join(__dirname,'static',req.url.slice(1))));
  }else if(req.url === '/get'){
    res.writeHead(200,{'Context-type':"text-plain"});
    res.end('get');
+  }else if(req.url === '/post'){
+    let buffers = [];
+    req.on('data',(data)=>{
+      buffers.push(data);
+    });
+    req.on('end',()=>{
+      console.log('method',req.method);
+      console.log('url',req.url);
+      console.log('headers',req.headers);
+      let body = Buffer.concat(buffers);
+      console.log('body',body.toString());
+      res.statusCode = 200;
+      res.setHeader('Context-type',"text-plain");
+      res.write(body);
+      res.end();
+    });
  }
});
server.listen(8080);
```

手写 POST 客户端（在 GET 客户端基础上加 `Content-Length` 和请求体拼接）：

```diff
let net = require('net');
const ReadyState = {
    UNSENT:0,//（代理被创建，但尚未调用 open() 方法。
    OPENED:1,//open() 方法已经被调用
    HEADERS_RECEIVED:2,//send() 方法已经被调用，并且头部和状态已经可获得。
    LOADING:3,//（交互）正在解析响应内容
    DONE:4 //（完成）响应内容解析完成，可以在客户端调用了
}
class XMLHttpRequest {
    constructor(){
        this.readyState = ReadyState.UNSENT;
        this.headers = {};
    }
    open(method, url) {
        this.method = method||'GET';
        this.url = url;
        let {hostname,port,path} = require('url').parse(url);
        this.hostname = hostname;
        this.port = port;
        this.path = path;
        this.headers.Host=`${hostname}:${port}`;
+       this.headers.Connection=`keep-alive`;
        const socket = this.socket =  net.createConnection({port: this.port,hostname:this.hostname},()=>{
            socket.on('data', (data) => {
                data = data.toString();
                console.log(data);
                let [response,bodyRows] = data.split('\r\n\r\n');
                let [statusLine,...headerRows] = response.split('\r\n');
                let [,status,statusText] = statusLine.split(' ');
                this.status = status;
                this.statusText = statusText;
                this.responseHeaders = headerRows.reduce((memo,row)=>{
                    let [key,value] = row.split(': ');
                    memo[key]= value;
                    return memo;
                },{});
                this.readyState = ReadyState.HEADERS_RECEIVED;
                xhr.onreadystatechange&&xhr.onreadystatechange();
                this.readyState = ReadyState.LOADING;
                xhr.onreadystatechange&&xhr.onreadystatechange();
                let [,body,] = bodyRows.split('\r\n');
                this.response = this.responseText = body;
                this.readyState = ReadyState.DONE;
                xhr.onreadystatechange&&xhr.onreadystatechange();
                this.onload&&this.onload();
            });
            socket.on('error', (err) => {
                this.onerror&&this.onerror(err);
            });
         });
         this.readyState = ReadyState.OPENED;
         xhr.onreadystatechange&&xhr.onreadystatechange();
    }
    getAllResponseHeaders(){
        let allResponseHeaders='';
        for(let key in this.responseHeaders){
            allResponseHeaders+=`${key}: ${this.responseHeaders[key]}\r\n`;
        }
        return allResponseHeaders;
    }
    setRequestHeader(header,value){
        this.headers[header]= value;
    }
    send(body) {
        let rows = [];
        rows.push(`${this.method} ${this.path} HTTP/1.1`);
+       this.headers["Content-Length"]=Buffer.byteLength(body);   // 👈 POST 必须带 Content-Length
        rows.push(...Object.keys(this.headers).map(key=>`${key}: ${this.headers[key]}`));
+       let request = rows.join('\r\n')+'\r\n\r\n'+body;          // 👈 header 和 body 之间空一行，再拼 body
        console.log(request);
        this.socket.write(request);
    }
}

let xhr = new XMLHttpRequest();
xhr.onreadystatechange = ()=>{
    console.log('onreadystatechange',xhr.readyState);
}
xhr.open("POST", "http://127.0.0.1:8080/post");
xhr.responseType="text";
xhr.setRequestHeader('Content-Type','application/json');
xhr.onload = () => {
    console.log('readyState',xhr.readyState);
    console.log('status',xhr.status);
    console.log('statusText',xhr.statusText);
    console.log('getAllResponseHeaders',xhr.getAllResponseHeaders());
    console.log('response',xhr.response);
};
xhr.send(`{"name":"zf"}`);
```

**核心来了——Parser.js：一个逐字节的状态机**。这就是「文本协议解析」的正规做法：不再靠 `split` 猜边界，而是**一个字节一个字节地读**，根据当前状态决定这个字节属于「请求行」还是「header 字段名」还是「header 值」还是「body」：

```javascript
let LF = 10,//换行  line feed
  CR = 13,//回车 carriage return
  SPACE = 32,//空格
  COLON = 58;//冒号
let PARSER_UNINITIALIZED=0,//未解析
  START=1,//开始解析
  REQUEST_LINE=2,
  HEADER_FIELD_START=3,
  HEADER_FIELD=4,
  HEADER_VALUE_START=5,
  HEADER_VALUE=6,
  READING_BODY=7;
class Parser {
  constructor(){
    this.state = PARSER_UNINITIALIZED;
  }
  parse(buffer) {
    let self =this,
      requestLine='',
      headers = {},
      body='',
      i=0,
      char,
      state = START,//开始解析
      headerField='',
      headerValue='';
    console.log(buffer.toString());
    for (i = 0; i < buffer.length; i++) {
      char = buffer[i];
      switch (state) {
        case START:
          state = REQUEST_LINE;
          self['requestLineMark']=i;
        case REQUEST_LINE:
          if (char == CR) {//换行
            requestLine=buffer.toString('utf8', self['requestLineMark'], i);
            break;
          }else if(char == LF){//回车
            state = HEADER_FIELD_START;
          }
          break;
        case HEADER_FIELD_START:
          if(char === CR){
            state = READING_BODY;
            self['bodyMark'] = i+2;
            break;
          }else{
            state = HEADER_FIELD;
            self['headerFieldMark'] = i;
          }
        case HEADER_FIELD:
          if (char == COLON) {
            headerField=buffer.toString('utf8', self['headerFieldMark'], i);
            state = HEADER_VALUE_START;
          }
          break;
        case HEADER_VALUE_START:
          if (char == SPACE) {
            break;
          }
          self['headerValueMark'] = i;
          state = HEADER_VALUE;
        case HEADER_VALUE:
          if (char === CR) {
            headerValue=buffer.toString('utf8', self['headerValueMark'], i);
            headers[headerField] = headerValue;
            headerField = '';
            headerValue = '';
          }else if(char === LF){
            state = HEADER_FIELD_START;
          }
          break;
        default:
          break;
      }
    }
    let [method,url] =requestLine.split(' ');
    body=buffer.toString('utf8', self['bodyMark'], i);
    return {method,url,headers,body};
  }
}
module.exports = Parser;
```

这段状态机是「文本协议解析到底有多麻烦」的活教材：HTTP 的每个字符（CR=13、LF=10、SPACE=32、COLON=58）都要按 ASCII 码值逐个判断，状态在 `REQUEST_LINE → HEADER_FIELD_START → HEADER_FIELD → HEADER_VALUE_START → HEADER_VALUE → READING_BODY` 之间跳转。**换行、冒号、空格这些「肉眼可见」的边界，机器眼里只是一堆字节，要自己写逻辑去识别。**

用 Parser 的手写 POST 服务端：

```diff
const net = require('net');
const Parer = require('./Parser');
const server = net.createServer((socket) => {
  socket.on('data',(data)=>{
+   let parser = new Parer();
+   let {method,url,headers,body} = parser.parse(data);
+   console.log('method',method);
+   console.log('url',url);
+   console.log('headers',headers);
+   console.log('body',body);
    let rows = [];
    rows.push(`HTTP/1.1 200 OK`);
    rows.push(`Context-type: text-plain`);
    rows.push(`Date: ${new Date().toGMTString()}`);
    rows.push(`Connection: keep-alive`);
    rows.push(`Transfer-Encoding: chunked`);
    rows.push(`\r\n${Buffer.byteLength(body).toString(16)}\r\n${body}\r\n0`);
    let response = rows.join('\r\n');
    socket.end(response);
  });
})
server.on('error', (err) => {
  console.error(err);
});

server.listen(8080,() => {
  console.log('服务器已经启动', server.address());
});
```

### 手写文件上传（multipart/form-data）

最后是文件上传，它用 `multipart/form-data`，比普通 POST 更复杂——请求体要用 **boundary 字符串**分隔多个「部分」（字段 + 文件），这是「文本协议里嵌套二进制数据」的典型场景。

先看真实的 multipart 请求（Wireshark 抓包，注意 `Content-Type: multipart/form-data; boundary=...` 和请求体里用 `--boundary` 分隔的各个部分）：

![Wireshark 抓到的文件上传请求](https://cdn.nlark.com/yuque/0/2025/png/738210/1764579469468-5e28e340-9b4e-426e-87d5-e3d69be3107d.png)

![Wireshark 抓到的文件上传响应](https://cdn.nlark.com/yuque/0/2025/png/738210/1764579469639-5d81cdc2-cf13-451a-b122-9e06884a662a.png)

标准库用 `formidable` 处理文件上传：

```diff
const http = require('http');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const url = require('url');
const server = http.createServer(function(req,res){
  const {pathname} = url.parse(req.url);
  if(['/get.html','/post.html','/upload.html'].includes(pathname)){
    res.writeHead(200,{'Context-type':"text-html"});
    res.end(fs.readFileSync(path.join(__dirname,'static',pathname.slice(1))));
  }else if(pathname === '/get'){
    res.writeHead(200,{'Context-type':"text-plain"});
    res.end('get');
  }else if(pathname === '/post'){
    let buffers = [];
    req.on('data',(data)=>{
      buffers.push(data);
    });
    req.on('end',()=>{
      console.log('method',req.method);
      console.log('url',req.url);
      console.log('headers',req.headers);
      let body = Buffer.concat(buffers);
      console.log('body',body.toString());
      res.statusCode = 200;
      res.setHeader('Context-type',"text-plain");
      res.write(body);
      res.end();
    });
  }else if(req.url === '/upload'){
+    const form = formidable();
+    form.parse(req, (err, fields, files) => {
+      console.log('fields',fields);
+      console.log('files',files);
+      let avatar = files.avatar;
+      let filePath = path.join(__dirname,'static',avatar.name);
+      fs.writeFileSync(filePath,fs.readFileSync(avatar.path));
+      res.statusCode = 200;
+      res.setHeader('Context-type',"text-plain");
+      res.write(JSON.stringify({...fields,avatar:filePath}));
+      res.end();
+    });
  }else{
    res.statusCode = 404;
    res.end();
  }
});
server.listen(8080);
```

浏览器端用 `FormData` 上传：

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>get</title>
</head>
<body>
    <form onsubmit="upload(event)">
        <input type="text" id="username"/>
        <input type="file" id="file"/>
        <input type="submit"/>
    </form>
    <script>
       function upload(event){
        event.preventDefault();
        let username= document.getElementById('username').value;
        let file= document.getElementById('file').files[0];
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "http://localhost:8080/upload");
        var formData=new FormData();
        formData.append("username",username);
        formData.append("file",file);
        xhr.responseType="text";
        xhr.onload = () => {
            console.log(xhr.response);
        };
        xhr.send(formData);
       }
     </script>
</body>
</html>
```

手写 multipart 上传客户端——**手动拼 boundary**，把每个字段/文件包装成一个「部分」：

```diff
let net = require('net');
let fs = require('fs');
let path = require('path');
const ReadyState = {
    UNSENT:0,//（代理被创建，但尚未调用 open() 方法。
    OPENED:1,//open() 方法已经被调用
    HEADERS_RECEIVED:2,//send() 方法已经被调用，并且头部和状态已经可获得。
    LOADING:3,//（交互）正在解析响应内容
    DONE:4 //（完成）响应内容解析完成，可以在客户端调用了
}
class XMLHttpRequest {
    constructor(){
        this.readyState = ReadyState.UNSENT;
        this.headers = {};
    }
    open(method, url) {
        this.method = method||'GET';
        this.url = url;
        let {hostname,port,path} = require('url').parse(url);
        this.hostname = hostname;
        this.port = port;
        this.path = path;
        this.headers.Host=`${hostname}:${port}`;
        this.headers.Connection=`keep-alive`;
        const socket = this.socket =  net.createConnection({port: this.port,hostname:this.hostname},()=>{
            socket.on('data', (data) => {
                data = data.toString();
                console.log(data);
                let [response,bodyRows] = data.split('\r\n\r\n');
                let [statusLine,...headerRows] = response.split('\r\n');
                let [,status,statusText] = statusLine.split(' ');
                this.status = status;
                this.statusText = statusText;
                this.responseHeaders = headerRows.reduce((memo,row)=>{
                    let [key,value] = row.split(': ');
                    memo[key]= value;
                    return memo;
                },{});
                this.readyState = ReadyState.HEADERS_RECEIVED;
                xhr.onreadystatechange&&xhr.onreadystatechange();
                this.readyState = ReadyState.LOADING;
                xhr.onreadystatechange&&xhr.onreadystatechange();
                let [,body,] = bodyRows.split('\r\n');
                this.response = this.responseText = body;
                this.readyState = ReadyState.DONE;
                xhr.onreadystatechange&&xhr.onreadystatechange();
                this.onload&&this.onload();
            });
            socket.on('error', (err) => {
                this.onerror&&this.onerror(err);
            });
         });
         this.readyState = ReadyState.OPENED;
         xhr.onreadystatechange&&xhr.onreadystatechange();
    }
    getAllResponseHeaders(){
        let allResponseHeaders='';
        for(let key in this.responseHeaders){
            allResponseHeaders+=`${key}: ${this.responseHeaders[key]}\r\n`;
        }
        return allResponseHeaders;
    }
    setRequestHeader(header,value){
        this.headers[header]= value;
    }
+    send(formData) {
+        let rows = [];
+        let boundary = '----WebKitFormBoundaryF5odcsAPqFAB2mkm';
+        this.headers['Content-Type']= `multipart/form-data; boundary=${boundary}`;
+        let parts = [];
+        for(let key in formData){
+            let value = formData[key];
+            if(typeof value === 'string'){
+                let rows = [];
+                rows.push(`Content-Disposition: form-data; name="${key}"\r\n`);
+                rows.push(value);
+                parts.push(rows.join('\r\n'));
+            }else{
+                let rows = [];
+                rows.push(`Content-Disposition: form-data; name="${value.name}"; filename="${value.filename}"`);
+                rows.push(`Content-Type: ${value.contentType}\r\n`);
+                rows.push(value.content);
+                parts.push(rows.join('\r\n'));
+            }
+        }
+        let body = parts.join('\r\n'+'--'+boundary+'\r\n');
+        body = '--'+boundary+'\r\n'+body+'\r\n--'+boundary+'--';
+        this.headers["Content-Length"]=Buffer.byteLength(body);
+        rows.push(`${this.method} ${this.path} HTTP/1.1`);
+        rows.push(...Object.keys(this.headers).map(key=>`${key}: ${this.headers[key]}`));
+        let request = rows.join('\r\n');
+        request += '\r\n\r\n';
+        let buffers = [Buffer.from(request)];
+        buffers.push(Buffer.from(body));
+        this.socket.write(Buffer.concat(buffers));
+    }
}
+class FormData{
+    append(key,value){
+        this[key]=value;
+    }
+}
let xhr = new XMLHttpRequest();
xhr.onreadystatechange = ()=>{
    console.log('onreadystatechange',xhr.readyState);
}
+xhr.open("POST", "http://127.0.0.1:8080/upload");
xhr.responseType="text";
+let formData=new FormData();
+formData.append("username",'zhufeng');
+let file = fs.readFileSync(path.join(__dirname,'file.txt'));
+formData.append("avatar",{name:'file',filename:'file.txt',contentType:'text/plain',content:file});
xhr.onload = () => {
    console.log('readyState',xhr.readyState);
    console.log('status',xhr.status);
    console.log('statusText',xhr.statusText);
    console.log('getAllResponseHeaders',xhr.getAllResponseHeaders());
    console.log('response',xhr.response);
};
+xhr.send(formData);
```

手写 multipart 解析服务端——**手动按 boundary 切分请求体**：

```diff
const net = require('net');
const path = require('path');
const fs = require('fs');
const Parer = require('./Parser');
const server = net.createServer((socket) => {
  socket.on('data',(data)=>{
    let parser = new Parer();
    let {method,url,headers,body} = parser.parse(data);
    console.log('method',method);
    console.log('url',url);
    console.log('headers',headers);
    console.log('body',body);
+    let [,boundary] = headers['Content-Type'].match(/boundary=([^;]+)/i);
+    let parts = body.split('--'+boundary).slice(1,-1);
+    parts= parts.map(item=>item.slice(2,-2));
+    let fields = {};
+    let files = {};
+    for(let i=0;i<parts.length;i++){
+      let part = parts[i];
+      let rows = part.split('\r\n');
+      if(rows.length==3){
+        let [key,,value] = rows;
+        let [,name] = key.toString().match(/name="([^"]+?)"/);
+        fields[name]= value.toString();
+      }else if(rows.length==4){
+        let [key,type,,value] = rows;
+        let [,name,filename] = key.toString().match(/name="([^"]+?)"; filename="([^"]+?)"/);
+        let filePath = path.join(__dirname,'static',filename);
+        fs.writeFileSync(filePath,value);
+        files[name]={name,filename,path:filePath};
+      }
+    }
+    console.log(fields);
+    console.log(files);
    let rows = [];
    rows.push(`HTTP/1.1 200 OK`);
    rows.push(`Context-type: text-plain`);
    rows.push(`Date: ${new Date().toGMTString()}`);
    rows.push(`Connection: keep-alive`);
    rows.push(`Transfer-Encoding: chunked`);
+    let responseBody = JSON.stringify({...fields,...files});
+    rows.push(`\r\n${Buffer.byteLength(responseBody).toString(16)}\r\n${responseBody}\r\n0`);
    let response = rows.join('\r\n');
    socket.end(response);
  });
})
server.on('error', (err) => {
  console.error(err);
});

server.listen(8080,() => {
  console.log('服务器已经启动', server.address());
});
```

**这一节的收口**：手写完 GET/POST/文件上传三套实现，你应该能深刻体会到——**HTTP/1.1 文本协议的「可读性好」是有代价的**：机器解析它要靠 `\r\n`、`:`、`--boundary` 这些字符边界 + 逐字节状态机，既慢又容易出错（分包、边界字符误判）。**这正是 HTTP/2 要「二进制分帧」的根本动机**：把「文本解析」换成「固定长度的二进制帧头 + 按位判断」，让机器解析又快又稳。理解了这一节，第二节讲的「二进制 vs 文本」就不是一句空话，而是你亲手验证过的结论。

---

## 参考资料

- https://www.rfc-editor.org/rfc/rfc9113 （HTTP/2 二进制分帧格式）
- https://www.rfc-editor.org/rfc/rfc9000 （QUIC 传输协议）
- https://developer.mozilla.org/zh-CN/docs/Web/HTTP （HTTP 协议权威二级来源）

> 权威来源索引：HTTP/2 的帧二进制格式在 **RFC 9113** 第 4-6 章——第 4 章帧头结构（9 字节固定头：LENGTH 24 位、TYPE 8 位、FLAGS 8 位、R 保留位、STREAM IDENTIFIER 31 位）、第 5 章各帧类型负载、第 6 章 stream 生命周期；QUIC 传输协议在 **RFC 9000**——连接建立（握手合并 TLS 1.3）、stream 多路复用（按 stream 独立管理/重传）、连接迁移（Connection ID 与四元组解耦）；Node.js `http2` 模块源码见 `lib/internal/http2/core.js`（`Http2Session` 维护 stream 表、每个 `Http2Stream` 有唯一 ID）。

> 推荐搜索关键词：「HTTP/1.1 队头阻塞 原理」「HTTP/2 二进制分帧 多路复用」「HTTP/2 传输层队头阻塞 TCP」「HTTP/3 QUIC 区别」「QUIC 连接迁移 Connection ID」「HPACK 头部压缩 原理」。

---

## 💡 一张图总结（面试速记表）

| 协议 | 传输层 | 队头阻塞位置 | 核心机制 | 考察频率 |
|------|--------|-------------|---------|---------|
| HTTP/1.1 | TCP | 应用层（响应按序返回） | 长连接 + 管线化 + 多连接/域名分片绕开 | ⭐⭐⭐ 必考 |
| HTTP/2 | TCP | 传输层（TCP 按序交付，丢包阻塞全连接） | 二进制分帧 + 多路复用 + HPACK | ⭐⭐⭐ 必考 |
| HTTP/3 | UDP + QUIC | 已解决（按 stream 独立重传） | QUIC 多路复用 + 内置 TLS 1.3 + 连接迁移 | ⭐⭐⭐ 必考 |

> 💡 记住这条主线：**HTTP/1.1 的队头阻塞是「应用层」的（响应必须按序返回），HTTP/2 用二进制分帧 + 多路复用解决了它，但因为还跑在 TCP 上，留下了「传输层」队头阻塞（TCP 按序交付、丢包阻塞全连接）；HTTP/3 干脆把 TCP 换成 UDP 之上的 QUIC，按 stream 独立管理重传，连传输层队头阻塞也解决了，还顺带用连接 ID 实现了切网不断连的连接迁移。**把这条「队头阻塞的三层递进」串起来，HTTP 演进的所有面试题都能从原理推到答案。

---

## 💡 面试核心问

- **HTTP/1.1 的队头阻塞具体是怎么产生的？为什么浏览器要限制单域名并发连接数？**（同一 TCP 连接上响应必须严格按序返回，前一个慢后面全排队；6 连接和域名分片都是为了绕开它）
- **HTTP/2 是怎么用多路复用解决应用层队头阻塞的？它还存在队头阻塞吗？**（二进制分帧 + 按 stream ID 交错 + 接收端重组；还存在——传输层 TCP 的队头阻塞）
- **HTTP/3 为什么要换成基于 UDP 的 QUIC？QUIC 是怎么解决传输层队头阻塞的？**（TCP 改不动，QUIC 用户态重实现；按 stream 独立编号/重传，一个丢包不阻塞其他）
- **QUIC 的连接迁移能力解决了什么实际问题？**（用连接 ID 替代四元组，切网不断连，移动端体验）

---

## 📝 留个问题

HTTP/3 把传输层从 TCP 换成了 UDP，而 UDP 本身是「不可靠」的。那么问题来了：**QUIC 换成 UDP 之后，丢包重传、有序交付这些「可靠性」到底由谁负责？QUIC 又是怎么做到「一个 stream 丢包不影响其他 stream」的？**

提示：想想 TCP 的可靠性是靠「字节流按序交付」这个全局语义保证的，而 QUIC 把「可靠性」的粒度从「整个连接」细化到了什么……

欢迎评论区写出你的答案 👇

---

> 🔖 这是「网络原理深度拆解」系列第 04 篇。上一篇：《HTTPS 与 TLS：握手过程/证书信任链/HSTS/Certificate Pinning 安全实践》；下一篇预告：《HTTP 语义基础：内容协商/状态码语义/请求方法安全性与幂等性》
