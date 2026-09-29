+ <font style="color:rgb(25, 27, 31);">HTTP/2.0 协议基本上已经开始大规模使用，本文主要介绍 HTTP/2.0 协议的一些特性，以及前端应该对应做哪些优化的调整。</font>

# <font style="color:rgb(25, 27, 31);">HTTP/2.0 之前</font>
+ <font style="color:rgb(25, 27, 31);">最早期的 HTTP/1.0 时代，一个资源 == 一个 TCP 链接 == 一个 HTTP 链接，每个 HTTP 请求结束都会断开 TCP 连接，新的 HTTP 请求会另外新建一个 TCP 连接，并且只有当一个完整的请求结束（TCP closed）才会开始下一个请求（阻塞）。</font>

<!-- 这是一张图片，ocr 内容为：TRANSACTION 3 TRANSACTION 1 TRANSACTION 4 TRANSACTION 2 RESPONSE- SERVER CONNECT-4 CONNECT-1 CONNECT-3 CONNECT-2 知乎 CLIENT -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731205507-0b76a24b-cc2e-4fb2-b4a4-33d68fefa228.png)<font style="color:rgb(25, 27, 31);"></font>

+ <font style="color:rgb(25, 27, 31);">这种使用 TCP 的方式最严重的问题是阻塞。后来为了解决阻塞问题，请求允许并发，即同一个域名允许建立多个 TCP 链接，这样算是解决了部分阻塞问题，但是还是有多次建立 TCP 连接的延迟（Hand shaking）以及 TCP 特有的慢启动（Slow start）问题。</font>

<!-- 这是一张图片，ocr 内容为：TRANSACTION 2,3,4 TRANSACTION 1 (PARALLEL CONNECTIONS) REQUEST-2 REQUEST-3 RESPONSE- RESPONSE-1 REQUEST- SERVER CONNECT-1 CONNECT-2 TIME CONNECT-3 CLIENT CONNECT-4 (USUALLY A SMALL SOFTWARE DELAY 知乎@乃乎 BETWEEN EACH CONNECTION) -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731205551-b290fee5-6dc5-4bab-a8bb-7f4e9071daee.png)

## <font style="color:rgb(25, 27, 31);">补充：TCP 慢启动（Slow start）</font>
+ <font style="color:rgb(83, 88, 97);">TCP 连接会随着时间自我调整，起初会限制连接的最大速度，如果数据传输成功，会随着时间的推移提高传输速度</font>
+ <font style="color:rgb(25, 27, 31);">TCP 协议本身太复杂了，细节以后再看吧。简单来说，TCP 协议主要解决的是两个问题</font>
    - <font style="color:rgb(25, 27, 31);">稳定传输：ACK 确认机制</font>
    - <font style="color:rgb(25, 27, 31);">包乱序：Sequence Number</font>
+ <font style="color:rgb(25, 27, 31);">同时，TCP 还有两套控制机制</font>
    - <font style="color:rgb(25, 27, 31);">Congestion Control （堵塞控制）：避免高速发送端瘫痪网络</font>
    - <font style="color:rgb(25, 27, 31);">Flow Control（流量控制）：避免高速发送端瘫痪低速接收端</font>
+ <font style="color:rgb(25, 27, 31);">这些机制使得 TCP 协议不仅仅知道自己信道的情况，还能知道整个网络的情况</font>
+ <font style="color:rgb(25, 27, 31);">慢启动是堵塞控制的一个基本算法，简单说就是，先设置小一点的窗口，发送少一点的数据，然后接受 ACK，然后慢慢增加窗口大小，通过丢包率，Round Trip Time 等等来判断网络环境，设定一个合适的窗口大小。</font>

## <font style="color:rgb(25, 27, 31);">长链接</font>
+ <font style="color:rgb(25, 27, 31);">为了解决 TCP 连接利用率低的问题，所以又提出了长链接（1.0 开启，1.1 默认开启）。即一个请求完成后，不会立刻断开连接，而是在一定的时间内保持连接，以便快速处理即将到来的 HTTP 请求，复用同一个 TCP 通道，直到客户端心跳检测失败或服务器连接超时。</font>
    - <font style="color:rgb(25, 27, 31);">server 通过 set HTTP Header</font><font style="color:rgb(25, 27, 31);"> </font>`<font style="color:rgb(25, 27, 31);background-color:rgb(248, 248, 250);">Connection: keep-alive</font>`<font style="color:rgb(25, 27, 31);"> </font><font style="color:rgb(25, 27, 31);">来建立</font>
    - <font style="color:rgb(25, 27, 31);">client 通过 set HTTP Header</font><font style="color:rgb(25, 27, 31);"> </font>`<font style="color:rgb(25, 27, 31);background-color:rgb(248, 248, 250);">Connection: close</font>`<font style="color:rgb(25, 27, 31);"> </font><font style="color:rgb(25, 27, 31);">来关闭</font>
+ <font style="color:rgb(25, 27, 31);">长链接解决了多次创建 TCP 连接的延迟，但是还是有</font>**<font style="color:rgb(25, 27, 31);">线头阻塞（Head of line blocking）</font>**<font style="color:rgb(25, 27, 31);">的问题，即一个 TCP 连接一次只能发出一个请求，所以客户端必须等待收到响应后才能发出另外一个请求，这样耗时的请求如果在前面会 block 后面耗时的请求。</font>

## <font style="color:rgb(25, 27, 31);">小插曲：管道 Pipelining</font>
+ <font style="color:rgb(25, 27, 31);">HTTP 管道曾被提出来用以解决线头阻塞问题，即把多个 HTTP 请求通过一个 TCP 连接传送，在发送过程中不需要等待服务器对前一个请求的响应，但是客户端还是要按照发送请求的顺序接收响应。这种方式并没有根本解决线头阻塞问题，因为响应按顺序接收还是会有阻塞，所以这个功能都被浏览器默认关闭（或者压根没有）</font>
+ <font style="color:rgb(25, 27, 31);">HTTP/2.0 通过分帧将数据通过帧的方式传送，彻底解决了这个问题，并且做了一些别的优化</font>

# <font style="color:rgb(25, 27, 31);">HTTP/2.0</font>
+ <font style="color:rgb(25, 27, 31);">协议抽象描述（下面这段话很牛逼，需要仔细研读）</font>
+ <font style="color:rgb(83, 88, 97);">在客户端与服务器之间仅建立</font>**<font style="color:rgb(83, 88, 97);">一个</font>**<font style="color:rgb(83, 88, 97);"> TCP 连接，而且该连接在交互持续期间一直处于打开状态。在此连接上，消息是通过逻辑</font>**<font style="color:rgb(83, 88, 97);">流</font>**<font style="color:rgb(83, 88, 97);">进行传递的。一条</font>**<font style="color:rgb(83, 88, 97);">消息</font>**<font style="color:rgb(83, 88, 97);">包含一个完整的</font>**<font style="color:rgb(83, 88, 97);">帧序列</font>**<font style="color:rgb(83, 88, 97);">。在经过整理后，这些帧表示一个响应或请求。</font>
+ <font style="color:rgb(25, 27, 31);">这里有一些概念很重要，下面的内容都围绕这些概念展开</font>
    - <font style="color:rgb(25, 27, 31);">Connection （连接）：仅与一个对等节点建立一个</font>
    - <font style="color:rgb(25, 27, 31);">Stream（流）：逻辑意义上的流，物理实体为连接，一个物理连接拥有多个逻辑流</font>
    - <font style="color:rgb(25, 27, 31);">消息 Message（请求/响应）：是一组帧，通过逻辑流传输，重建这些帧会得到一个完整的请求或者响应</font>
    - <font style="color:rgb(25, 27, 31);">帧（Frame）：通信的基本单位</font>

## <font style="color:rgb(25, 27, 31);">帧的结构</font>
<!-- 这是一张图片，ocr 内容为：TYPE(8) LENGTH(24) FLAGS(8) STREAMIDENTIFIER(31) R FRAME PAYLOADS(0...N) -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731205273-9c5c2449-dad6-42f3-ae16-907ef04df512.png)<font style="color:rgb(25, 27, 31);"></font>

+ **<font style="color:rgb(25, 27, 31);">LENGTH</font>****<font style="color:rgb(25, 27, 31);"> </font>**<font style="color:rgb(25, 27, 31);">：帧的大小，最多可为 2 24 bit （16MB）</font>
+ **<font style="color:rgb(25, 27, 31);">TYPE</font>**<font style="color:rgb(25, 27, 31);"> </font><font style="color:rgb(25, 27, 31);">：标识帧的用途</font>
+ **<font style="color:rgb(25, 27, 31);">HEADERS</font>**<font style="color:rgb(25, 27, 31);">：只有 header 信息</font>
+ **<font style="color:rgb(25, 27, 31);">DATA</font>**<font style="color:rgb(25, 27, 31);">：只有 message's payload</font>
+ **<font style="color:rgb(25, 27, 31);">PRIORITY</font>**<font style="color:rgb(25, 27, 31);">：流的优先级信息</font>
+ **<font style="color:rgb(25, 27, 31);">RST_STREAM</font>**<font style="color:rgb(25, 27, 31);">：报错，reject PUSH_PROMISE，关闭连接</font>
+ **<font style="color:rgb(25, 27, 31);">SETTINGS</font>**<font style="color:rgb(25, 27, 31);">：连接设置</font>
+ **<font style="color:rgb(25, 27, 31);">PUSH_PROMISE</font>**<font style="color:rgb(25, 27, 31);">: 通知客户端有服务器推送的意图（intent）</font>
+ **<font style="color:rgb(25, 27, 31);">PING</font>**<font style="color:rgb(25, 27, 31);">：心跳和 round-trip time</font>
+ **<font style="color:rgb(25, 27, 31);">GOAWAY</font>**<font style="color:rgb(25, 27, 31);">：对当前连接停止提供流</font>
+ **<font style="color:rgb(25, 27, 31);">WINDOW_UPDATE</font>**<font style="color:rgb(25, 27, 31);">：flow control of streams</font>
+ **<font style="color:rgb(25, 27, 31);">CONTINUATION</font>**<font style="color:rgb(25, 27, 31);">：继续一系列的 HEADER fragment</font>
+ **<font style="color:rgb(25, 27, 31);">R</font>**<font style="color:rgb(25, 27, 31);">：reserved 保留位</font>
+ **<font style="color:rgb(25, 27, 31);">FLAG</font>**<font style="color:rgb(25, 27, 31);">：Boolean 值（ 0/1）</font>
+ <font style="color:rgb(25, 27, 31);">DATA frame 有两个 flag：END_STREAM / PADDED</font>
+ <font style="color:rgb(25, 27, 31);">HEADER frame 有四个 flag：END_STREAM / PADDED / END_HEADERS / PRIORITY</font>
+ <font style="color:rgb(25, 27, 31);">PUSH_PROMISE 有两个 flag：END_HEADERS / PADDED</font>
+ **<font style="color:rgb(25, 27, 31);">STREAM IDENTIFIER</font>**<font style="color:rgb(25, 27, 31);">：用于 track the frame membership of a logical stream</font>

<font style="color:rgb(25, 27, 31);">其中 FLAG ：</font>

+ **<font style="color:rgb(25, 27, 31);">END_STREAM</font>**<font style="color:rgb(25, 27, 31);">：end of the data stream</font>
+ **<font style="color:rgb(25, 27, 31);">PADDED</font>**<font style="color:rgb(25, 27, 31);">：存在填充数据</font>
+ **<font style="color:rgb(25, 27, 31);">END_HEADERS</font>**<font style="color:rgb(25, 27, 31);">：end of the headers</font>
+ **<font style="color:rgb(25, 27, 31);">PRIORITY</font>**<font style="color:rgb(25, 27, 31);">：优先级被设定</font>

## <font style="color:rgb(25, 27, 31);">二进制分帧（Binary framing）</font>
+ <font style="color:rgb(25, 27, 31);">分帧层处理的栗子</font>

### <font style="color:rgb(25, 27, 31);">文本请求映射到帧</font>
<!-- 这是一张图片，ocr 内容为：HTTP REQUEST FRAME GET /INDEX.HTML HTTP/1.1 HEADERS END STREAM HOST:EXAMPLE.COM END HEADERS ACCEPT:TEXT/HTML METHOD:GET SCHEME:HTTP PATH://INDEX.HTML AUTHORITY:EXAMPLE.COM ACCEPT:TEXT/HTML别乎@乃乎 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731205175-5fd51054-1756-41af-8418-0da312e5b04e.png)

+ <font style="color:rgb(25, 27, 31);">END_STREAM 为 true (+)，表示为请求的最后一帧（没有 DATA 帧）</font>
+ <font style="color:rgb(25, 27, 31);">END_HEADERS 为 true，表示为流中最后一个包含 HEADER 信息的帧</font>

### <font style="color:rgb(25, 27, 31);">文本响应映射到帧</font>
<!-- 这是一张图片，ocr 内容为：HTTP RESPONSE FRAMES HEADERS HTTP/1.1200 OK CONTENT-LENGTH:11 END STREAM END HEADERS CONTENT-TYPE:TEXT/H MAY THE FORCE BE WITH YOU :STATUS:200 CONTENT-LENGTH:11 CONTENT-TYPE:T TEXT/HTML DATA + END_STREAM MAY THE FORCE BE WITH YOU -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731205649-d0165687-873d-4ede-a7e6-96c56be105c6.png)

+ <font style="color:rgb(25, 27, 31);">END_STREAM in HEADERS 为 false (-) 表示不是流的最后一帧</font>
+ <font style="color:rgb(25, 27, 31);">END_HEADER in HEADERS 为 true (+) 表示最后一个 HEADER 帧</font>
+ <font style="color:rgb(25, 27, 31);">END_STREAM in DATA 为 true (+) 表示当前流最后一帧</font>

# <font style="color:rgb(25, 27, 31);">二进制协议（Binary Protocol）</font>
+ <font style="color:rgb(83, 88, 97);">HTTP/2 保留了原始 HTTP 协议的语义，但更改了在系统之间传输数据的方式</font>
+ <font style="color:rgb(25, 27, 31);">HTTP/2.0 文本格式跟二进制格式的主要差别在于解析</font>
    - <font style="color:rgb(25, 27, 31);">比如 TCP 就是二进制协议，每一位表示什么都是固定的，解析起来只用判断 0/1 就好，效率更高</font>
    - <font style="color:rgb(25, 27, 31);">HTTP/1.0 就是文本协议，因为都是字符串，解析起来要么是正则，要么是状态机，效率更低</font>

<!-- 这是一张图片，ocr 内容为：APPLICATION (HTTP 2.0) HTTP 1.1 POST/UPLOAD HTTP/1.1 BINARY FRAMING HOST:WWW.EXAMPLE.ORG CONTENT-TYPE:APPLICATION/JSON SESSION(TLS)(OPTIONAL) CONTENT-LENGTH:15 {'MSG":'HELLO TRANSPORT (TCP) HTTP  2.0 HEADERS FRAME NETWORK (IP) DATA FRAME -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731205992-7487c85f-a169-4bcc-97a8-ea75b662e72f.png)

+ <font style="color:rgb(25, 27, 31);">HTTP/2.0 允许保留原来的文本格式，但会经过一个"二进制分帧"的过程，将文本彻底转化为二进制传输。</font>

# <font style="color:rgb(25, 27, 31);">多路复用（Multplexing）</font>
+ <font style="color:rgb(25, 27, 31);">旧的 HTTP 协议有个问题叫</font>**<font style="color:rgb(25, 27, 31);">线头阻塞（Head of line blocking）</font>**<font style="color:rgb(25, 27, 31);">，之前的解决方案是同时开启多个 TCP 链接（Chrome 有6个），但是这样多个 TCP 连接就很耗费网络资源了。实际上"单线程"就够了，方式就是将消息分成更小的单位（帧），这样就实现了完全双向?的请求和响应消息复用。</font>
+ <font style="color:rgb(25, 27, 31);">比如下图有三个逻辑流，一个请求（深蓝），两个响应（浅蓝，绿），每一块代表一个帧</font>

<!-- 这是一张图片，ocr 内容为：蜘手@乃乎 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731206115-6cff463d-b4a4-41ab-b1e5-b2a1d9435ca0.png)<font style="color:rgb(25, 27, 31);"></font>

+ <font style="color:rgb(25, 27, 31);">将帧分解成 HEADER 和 DATA 帧</font>

<!-- 这是一张图片，ocr 内容为：CONNECTION STREAM 2 STREAM 2 STREAM 1 STREAM 1 SERVER DATA HEADERS DATA HEADERS BROWSER STREAM 3 STREAM 3 HEADERS DATA 知乎@刀乎 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731206863-ab7a45e3-984d-43d4-a262-99c808223263.png)

+ <font style="color:rgb(25, 27, 31);">优点：</font>
    - <font style="color:rgb(25, 27, 31);">Request 和 Response 都在一个 socket</font>
    - <font style="color:rgb(25, 27, 31);">所有的响应和请求都无法相互阻塞</font>
    - <font style="color:rgb(25, 27, 31);">减少了建立连接带来的延迟</font>
    - <font style="color:rgb(25, 27, 31);">不再需要像 HTTP/1.1 那样将多个请求合成一个</font>
+ <font style="color:rgb(25, 27, 31);">每个服务器（域）只是用一个链接，而不是每个文件一个链接</font>

# <font style="color:rgb(25, 27, 31);">服务器推送（Server push）</font>
+ <font style="color:rgb(25, 27, 31);">允许服务器预测客户端的需要，在请求处理完成之前就可以先发一个 PUSH_PROMISE frame，然后在 push 资源。为防止发送不必要的资源，服务器会给每一个要推送的资源发送一个 PUSH_PROMISE frame，如果资源已经有缓存，浏览器可以 respond 一个 RST_STREAM frame，来拒绝 PUSH</font>

<!-- 这是一张图片，ocr 内容为：HTTP 2.0 CONNECTION STREAM 1 STREAM 2 STREAM4 STREAM 4 PUSH PROMISE HEADERS PUSH PROMISE DATA STREAM DATA STREAM 1 HEADERS (CLIENT REQUEST) STREAM 1:/PAGE.HTML STREAM 2://SCRIPT.JS (PUSH PROMISE) STREAM 4:/STYLE.CSS (P (PUSH PROMISE) -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731206554-ad83c6f3-a021-4c35-ab28-b245f0599f2f.png)

+ <font style="color:rgb(25, 27, 31);">（服务器推送这个选项怎么说呢，理论上有用，但是实际上还需要 tune，有待观察吧）</font>

# <font style="color:rgb(25, 27, 31);">流控制（Flow control）</font>
+ <font style="color:rgb(25, 27, 31);">防止 receiver overwhelmed by the sender，允许 receiver 停止/减少发送的数据。</font>
+ <font style="color:rgb(25, 27, 31);">比如视屏流媒体服务，用户点击暂停，client will informs the server to stop sending video data。</font>
+ <font style="color:rgb(25, 27, 31);">连接一旦 open，server 和 client 便会交换 SETTINGS frame，从而构建 flow-control window 的大小。默认为 65KB，但是可以通过 WINDOW_UPDATE frame 来改变。</font>

# <font style="color:rgb(25, 27, 31);">头部压缩（Header compression）</font>
+ <font style="color:rgb(25, 27, 31);">头部压缩的原理是 --- 缓存，与其叫头部压缩还不如叫头部缓存。使用 HPACK 协议，要求客户端和服务器各自维护一个 HEADER 字段的列表，在多次发送的时候，只发送差异的部分，其余的从缓存表里面取。</font>

```plain
// 用 JavaScript 描述的话大概是下面的意思
const cachedHeaders = {
  method: 'GET',
  host: 'example.com'
}
const newHeaders = {
  method: 'POST'
}
const receivedHeaders = {
  ...cachedHeaders
  ...newHeaders
}
```

+ <font style="color:rgb(25, 27, 31);">举个栗子，第一次请求后，第二次请求只发送与之前请求头不同的部分</font>

<!-- 这是一张图片，ocr 内容为：HTTP REQUEST1 HTTP REQUEST 2 GET METHOD GET :METHOD HTTPS HTTPS :SCHEME :SCHEME EXAMPLE.COM EXAMPLE.COM :HOST :HOST /INFO.HTML /INDEX.HTML PATH PATH AUTHORITY EXAMPLE.ORG EXAMPLE.ORG AUTHORITY TEXT/HTML ACCEPT TEXT/HTML .ACCEPT MOZILLA/5.0 MOZILLA/5.0 USER-AGENT USER-AGENT HEADERS FRAME (STREAM HEADERS FRAME (STREAM 1) GET /INFO.HTML :METHOD PATH HTTPS :SCHEME EXAMPLE.COM :HOST /INDEX.HTML PATH AUTHORITY EXAMPLE.ORG TEXT/HTML ACCEPT 知乎@乃乎 MOZILLA/5.0 USER-AGENT -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731207282-58fd81e3-adaf-4f3b-9987-8cdf52d1a827.png)

# <font style="color:rgb(25, 27, 31);">优先级（Priority）</font>
+ <font style="color:rgb(25, 27, 31);">Messgae 通过流传输，每个流都会被指定一个优先级，优先级决定</font>**<font style="color:rgb(25, 27, 31);">处理的顺序</font>**<font style="color:rgb(25, 27, 31);">和</font>**<font style="color:rgb(25, 27, 31);">分配的资源</font>**<font style="color:rgb(25, 27, 31);">，优先级的大小会在 HEADER frame 或者是 PRIORITY frame，为 0 - 256 的数字。</font>
+ <font style="color:rgb(25, 27, 31);">优先级还可以为树形结构，来标记依赖关系</font>

<!-- 这是一张图片，ocr 内容为：A C B 6 E D 双乃平 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742731206999-57172423-12b0-4af6-ae29-d22a413d3d5b.png)

+ <font style="color:rgb(25, 27, 31);">A 先发送，B / C 同时发送，分别拿到 40% / 60% 的资源，D / E 则拿到 C 的各一半的资源。</font>
+ <font style="color:rgb(25, 27, 31);">优先级仅仅是一个参考（only a suggestion），让客户端告诉服务如何处理请求是不对的，服务器应该根据自己的能力（capabilities）来决定如何处理。</font>

# <font style="color:rgb(25, 27, 31);">使用 HTTP/2.0 时的优化</font>
+ <font style="color:rgb(25, 27, 31);">减少分片（Sharding）的使用</font>
    - <font style="color:rgb(25, 27, 31);">sharding 指的是将服务分散到多个主机上，因为 2.0 以前是通过多个 TCP 连接来达到并发的目的，而浏览器对每个域名可以建立的 TCP 连接是有限制的，所以以前的优化手段是将多个资源分散到多个服务器。</font>
    - <font style="color:rgb(25, 27, 31);">但是 2.0 协议使用多个 TCP 连接反而会造成性能的下降，因为建立连接很耗费网络资源。同理原来的一些优化方式也都没什么用了比如</font>
    - <font style="color:rgb(25, 27, 31);">Spiriting（雪碧图）一种将多个图合成一个图从而减少请求的方式</font>
    - <font style="color:rgb(25, 27, 31);">Inline（内联）将图片用 data url 代替，从而减少请求</font>
    - <font style="color:rgb(25, 27, 31);">Concatenation（拼接）将多个 JS 文件打包成一个</font>
+ <font style="color:rgb(25, 27, 31);">这些原来的优化方式反而会损害性能，因为各种合成和拼接都会导致缓存没那么容易。</font>



