# <font style="color:rgb(51, 51, 51);">HTTP的架构模式</font>
+ <font style="color:rgb(51, 51, 51);">Http是客户端/服务器模式中请求-响应所用的协议，在这种模式中，客户端(一般是web浏览器)向服务器提交HTTP请求，服务器响应请求的资源</font>

## <font style="color:rgb(51, 51, 51);">HTTP的特点</font>
+ <font style="color:rgb(51, 51, 51);">HTTP是半双工协议，也就是说，在同一时刻数据只能单向流动，客户端向服务器发送请求(单向的)，然后服务器响应请求(单向的)。</font>
+ <font style="color:rgb(51, 51, 51);">服务器不能主动推送数据给浏览器。</font>

## <font style="color:rgb(51, 51, 51);">双向通信</font>
+ <font style="color:rgb(51, 51, 51);">Comet是一种用于web的推送技术，能使服务器能实时地将更新的信息传送到客户端，而无须客户端发出请求，目前有三种实现方式:轮询（polling） 长轮询（long-polling）和iframe流（streaming）。</font>

### <font style="color:rgb(51, 51, 51);">轮询</font>
+ <font style="color:rgb(51, 51, 51);">轮询是客户端和服务器之间会一直进行连接，每隔一段时间就询问一次</font>
+ <font style="color:rgb(51, 51, 51);">这种方式连接数会很多，一个接受，一个发送。而且每次发送请求都会有Http的Header，会很耗流量，也会消耗CPU的利用率</font>

<!-- 这是一张图片，ocr 内容为：POLLING CLIENT SERVER SEND REQUEST DATA CONNECTION CLOSE SEND REQUEST SEND REQUEST DATA PERIODICALLY SEND REGUEST -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742868658285-0d8cba29-b6e9-4497-b0b6-6c58db2cf4b8.png)

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

### <font style="color:rgb(51, 51, 51);">长轮询</font>
+ <font style="color:rgb(51, 51, 51);">长轮询是对轮询的改进版，客户端发送HTTP给服务器之后，看有没有新消息，如果没有新消息，就一直等待</font>
+ <font style="color:rgb(51, 51, 51);">当有新消息的时候，才会返回给客户端。在某种程度上减小了网络带宽和CPU利用率等问题。</font>
+ <font style="color:rgb(51, 51, 51);">由于http数据包的头部数据量往往很大（通常有400多个字节），但是真正被服务器需要的数据却很少（有时只有10个字节左右），这样的数据包在网络上周期性的传输，难免对网络带宽是一种浪费</font>

<!-- 这是一张图片，ocr 内容为：LONG POLLING CLIENT SERVER SEND REQUEST HOLD CONNECTION TILL 1.THE DATA IS READY DATA 2. NETWORK TIMEOUT CONNECTION CLOSE SEND REQUEST DATA SERVER CAN'T SEND CONNECTION CLOSE DATA OPEN CONNECTION -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742868658787-c05971dc-41c5-46a8-837f-7e7cf17f9f5c.png)

```html
<div id="clock"></div>
<script>
  (function poll() {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', 'http://localhost:8080', true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4 && xhr.status == 200) {
        document.querySelector('#clock').innerHTML = xhr.responseText;
        poll();
      }
    }
    xhr.send();
  })();
</script>
```

> <font style="color:rgb(119, 119, 119);">long poll 需要有很高的并发能力</font>
>

## <font style="color:rgb(51, 51, 51);">iframe流</font>
+ <font style="color:rgb(51, 51, 51);">通过在HTML页面里嵌入一个隐藏的iframe,然后将这个iframe的src属性设为对一个长连接的请求,服务器端就能源源不断地往客户推送数据。</font>

<!-- 这是一张图片，ocr 内容为：REQUST RESPONSE.FLUSH DATA RESPONSE.FLUSH DATA SERVER CLIENT RESPONSE.FLUSH DATA CLOSE -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742868657493-e57818e0-4413-4abc-9edc-f8cbcd3ec56f.png)

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

## <font style="color:rgb(51, 51, 51);">EventSource流</font>
+ <font style="color:rgb(51, 51, 51);">HTML5规范中提供了服务端事件EventSource，浏览器在实现了该规范的前提下创建一个EventSource连接后，便可收到服务端的发送的消息，这些消息需要遵循一定的格式，对于前端开发人员而言，只需在浏览器中侦听对应的事件皆可</font>
+ <font style="color:rgb(51, 51, 51);">SSE的简单模型是：一个客户端去从服务器端订阅一条</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">流</font>`<font style="color:rgb(51, 51, 51);">，之后服务端可以发送消息给客户端直到服务端或者客户端关闭该“流”，所以eventsource也叫作</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">"</font>`<font style="color:rgb(51, 51, 51);">server-sent-event`</font>
+ <font style="color:rgb(51, 51, 51);">EventSource流的实现方式对客户端开发人员而言非常简单，兼容性良好</font>
+ <font style="color:rgb(51, 51, 51);">对于服务端，它可以兼容老的浏览器，无需upgrade为其他协议，在简单的服务端推送的场景下可以满足需求</font>

### <font style="color:rgb(51, 51, 51);">浏览器端</font>
+ <font style="color:rgb(51, 51, 51);">浏览器端，需要创建一个</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">EventSource</font>`<font style="color:rgb(51, 51, 51);">对象，并且传入一个服务端的接口URI作为参</font>
+ <font style="color:rgb(51, 51, 51);">默认EventSource对象通过侦听</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">message</font>`<font style="color:rgb(51, 51, 51);">事件获取服务端传来的消息</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">open</font>`<font style="color:rgb(51, 51, 51);">事件则在http连接建立后触发</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">error</font>`<font style="color:rgb(51, 51, 51);">事件会在通信错误（连接中断、服务端返回数据失败）的情况下触发</font>
+ <font style="color:rgb(51, 51, 51);">同时</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">EventSource</font>`<font style="color:rgb(51, 51, 51);">规范允许服务端指定自定义事件，客户端侦听该事件即可</font>

```html
<script>
  var eventSource = new EventSource('/eventSource');
  eventSource.onmessage  = function(e){
    console.log(e.data);
  }
  eventSource.onerror  = function(err){
    console.log(err);
  }
</script>
```

### <font style="color:rgb(51, 51, 51);">服务端</font>
+ <font style="color:rgb(51, 51, 51);">事件流的对应MIME格式为</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">text/event-stream</font>`<font style="color:rgb(51, 51, 51);">，而且其基于HTTP长连接。针对HTTP1.1规范默认采用长连接，针对HTTP1.0的服务器需要特殊设置。</font>
+ <font style="color:rgb(51, 51, 51);">event-source必须编码成</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">utf-8</font>`<font style="color:rgb(51, 51, 51);">的格式，消息的每个字段使用"\n"来做分割，并且需要下面4个规范定义好的字段：</font>
    - <font style="color:rgb(51, 51, 51);">Event: 事件类型</font>
    - <font style="color:rgb(51, 51, 51);">Data: 发送的数据</font>
    - <font style="color:rgb(51, 51, 51);">ID: 每一条事件流的ID</font>
    - <font style="color:rgb(51, 51, 51);">Retry： 告知浏览器在所有的连接丢失之后重新开启新的连接等待的时间，在自动重新连接的过程中，之前收到的最后一个事件流ID会被发送到服务端</font>

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
      retry: 20000, // 告诉客户端,如果断开连接后,20秒后再重试连接
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

# <font style="color:rgb(51, 51, 51);">websocket</font>
+ [<font style="color:rgb(51, 122, 183);">WebSockets_API</font>](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">规范定义了一个 API 用以在网页浏览器和服务器建立一个 socket 连接。通俗地讲：在客户端和服务器保有一个持久的连接，两边可以在任意时间开始发送数据。</font>
+ <font style="color:rgb(51, 51, 51);">HTML5开始提供的一种浏览器与服务器进行全双工通讯的网络技术</font>
+ <font style="color:rgb(51, 51, 51);">属于应用层协议，它基于TCP传输协议，并复用HTTP的握手通道。</font>

## <font style="color:rgb(51, 51, 51);">websocket 优势</font>
+ <font style="color:rgb(51, 51, 51);">支持双向通信，实时性更强。</font>
+ <font style="color:rgb(51, 51, 51);">更好的二进制支持。</font>
+ <font style="color:rgb(51, 51, 51);">较少的控制开销。连接创建后，ws客户端、服务端进行数据交换时，协议控制的数据包头部较小。</font>

## <font style="color:rgb(51, 51, 51);">websocket实战</font>
### <font style="color:rgb(51, 51, 51);">服务端</font>
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
    socket.send('服务器回应:' + message);
  });
});
```

### <font style="color:rgb(51, 51, 51);">客户端</font>
```html
<script>
  let ws = new WebSocket('ws://localhost:8888');
  ws.onopen = function () {
    console.log('客户端连接成功');
    ws.send('hello');
  }
  ws.onmessage = function (event) {
    console.log('收到服务器的响应 ' + event.data);
  }
</script>
```

## <font style="color:rgb(51, 51, 51);">如何建立连接</font>
+ <font style="color:rgb(51, 51, 51);">WebSocket复用了HTTP的握手通道。具体指的是，客户端通过HTTP请求与WebSocket服务端协商升级协议。协议升级完成后，后续的数据交换则遵照WebSocket的协议。</font>

### <font style="color:rgb(51, 51, 51);">客户端：申请协议升级</font>
+ <font style="color:rgb(51, 51, 51);">首先，客户端发起协议升级请求。可以看到，采用的是标准的HTTP报文格式，且只支持GET方法。</font>

```basic
GET ws://localhost:8888/ HTTP/1.1
Host: localhost:8888
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Version: 13
Sec-WebSocket-Key: IHfMdf8a0aQXbwQO1pkGdA==
```

+ <font style="color:rgb(51, 51, 51);">Connection: Upgrade：表示要升级协议</font>
+ <font style="color:rgb(51, 51, 51);">Upgrade: websocket：表示要升级到websocket协议</font>
+ <font style="color:rgb(51, 51, 51);">Sec-WebSocket-Version: 13：表示websocket的版本</font>
+ <font style="color:rgb(51, 51, 51);">Sec-WebSocket-Key：与后面服务端响应首部的Sec-WebSocket-Accept是配套的，提供基本的防护，比如恶意的连接，或者无意的连接。</font>

### <font style="color:rgb(51, 51, 51);">服务端：响应协议升级</font>
+ <font style="color:rgb(51, 51, 51);">服务端返回内容如下，状态代码101表示协议切换。到此完成协议升级，后续的数据交互都按照新的协议来。</font>

```basic
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: aWAY+V/uyz5ILZEoWuWdxjnlb7E=
```

### <font style="color:rgb(51, 51, 51);">Sec-WebSocket-Accept的计算</font>
+ <font style="color:rgb(51, 51, 51);">Sec-WebSocket-Accept根据客户端请求首部的Sec-WebSocket-Key计算出来。 计算公式为：</font>
    - <font style="color:rgb(51, 51, 51);">将Sec-WebSocket-Key跟258EAFA5-E914-47DA-95CA-C5AB0DC85B11拼接。</font>
    - <font style="color:rgb(51, 51, 51);">通过SHA1计算出摘要，并转成base64字符串</font>

```javascript
const crypto = require('crypto');
const number = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const webSocketKey = 'IHfMdf8a0aQXbwQO1pkGdA==';
let websocketAccept = require('crypto').createHash('sha1').update(webSocketKey + number).digest('base64');
console.log(websocketAccept);//aWAY+V/uyz5ILZEoWuWdxjnlb7E=
```

### <font style="color:rgb(51, 51, 51);">Sec-WebSocket-Key/Accept的作用</font>
+ <font style="color:rgb(51, 51, 51);">避免服务端收到非法的websocket连接</font>
+ <font style="color:rgb(51, 51, 51);">确保服务端理解websocket连接</font>
+ <font style="color:rgb(51, 51, 51);">用浏览器里发起ajax请求，设置header时，Sec-WebSocket-Key以及其他相关的header是被禁止的</font>
+ <font style="color:rgb(51, 51, 51);">Sec-WebSocket-Key主要目的并不是确保数据的安全性，因为Sec-WebSocket-Key、Sec-WebSocket-Accept的转换计算公式是公开的，而且非常简单，最主要的作用是预防一些常见的意外情况（非故意的）</font>

## <font style="color:rgb(51, 51, 51);">数据帧格式</font>
+ <font style="color:rgb(51, 51, 51);">WebSocket客户端、服务端通信的最小单位是</font>[<font style="color:rgb(51, 122, 183);">帧</font>](https://tools.ietf.org/html/rfc6455#section-5.2)<font style="color:rgb(51, 51, 51);">，由1个或多个帧组成一条完整的消息（message）。</font>
    - <font style="color:rgb(51, 51, 51);">发送端：将消息切割成多个帧，并发送给服务端</font>
    - <font style="color:rgb(51, 51, 51);">接收端：接收消息帧，并将关联的帧重新组装成完整的消息</font>

### <font style="color:rgb(51, 51, 51);">数据帧格式</font>
+ <font style="color:rgb(51, 51, 51);">单位是比特。比如FIN、RSV1各占据1比特，opcode占据4比特</font>

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

+ <font style="color:rgb(51, 51, 51);">FIN：1个比特 如果是1，表示这是消息（message）的最后一个分片（fragment），如果是0，表示不是是消息（message）的最后一个分片（fragment）</font>
+ <font style="color:rgb(51, 51, 51);">RSV1, RSV2, RSV3：各占1个比特。一般情况下全为0。当客户端、服务端协商采用WebSocket扩展时，这三个标志位可以非0，且值的含义由扩展进行定义。如果出现非零的值，且并没有采用WebSocket扩展，连接出错。</font>
+ <font style="color:rgb(51, 51, 51);">Opcode: 4个比特。操作代码，Opcode的值决定了应该如何解析后续的数据载荷（data payload）。如果操作代码是不认识的，那么接收端应该断开连接（fail the connection）</font>
    - <font style="color:rgb(51, 51, 51);">%x0：表示一个延续帧。当Opcode为0时，表示本次数据传输采用了数据分片，当前收到的数据帧为其中一个数据分片。</font>
    - <font style="color:rgb(51, 51, 51);">%x1：表示这是一个文本帧（frame）</font>
    - <font style="color:rgb(51, 51, 51);">%x2：表示这是一个二进制帧（frame）</font>
    - <font style="color:rgb(51, 51, 51);">%x3-7：保留的操作代码，用于后续定义的非控制帧。</font>
    - <font style="color:rgb(51, 51, 51);">%x8：表示连接断开。</font>
    - <font style="color:rgb(51, 51, 51);">%x9：表示这是一个ping操作。</font>
    - <font style="color:rgb(51, 51, 51);">%xA：表示这是一个pong操作。</font>
    - <font style="color:rgb(51, 51, 51);">%xB-F：保留的操作代码，用于后续定义的控制帧。</font>
+ <font style="color:rgb(51, 51, 51);">Mask: 1个比特。表示是否要对数据载荷进行掩码操作</font>
    - <font style="color:rgb(51, 51, 51);">从客户端向服务端发送数据时，需要对数据进行掩码操作；从服务端向客户端发送数据时，不需要对数据进行掩码操作,如果服务端接收到的数据没有进行过掩码操作，服务端需要断开连接。</font>
    - <font style="color:rgb(51, 51, 51);">如果Mask是1，那么在Masking-key中会定义一个掩码键（masking key），并用这个掩码键来对数据载荷进行反掩码。所有客户端发送到服务端的数据帧，Mask都是1。</font>
+ <font style="color:rgb(51, 51, 51);">Payload length：数据载荷的长度，单位是字节。为7位，或7+16位，或7+64位。</font>
    - <font style="color:rgb(51, 51, 51);">Payload length=x为0~125：数据的长度为x字节。</font>
    - <font style="color:rgb(51, 51, 51);">Payload length=x为126：后续2个字节代表一个16位的无符号整数，该无符号整数的值为数据的长度。</font>
    - <font style="color:rgb(51, 51, 51);">Payload length=x为127：后续8个字节代表一个64位的无符号整数（最高位为0），该无符号整数的值为数据的长度。</font>
    - <font style="color:rgb(51, 51, 51);">如果payload length占用了多个字节的话，payload length的二进制表达采用网络序（big endian，重要的位在前)</font>
+ <font style="color:rgb(51, 51, 51);">Masking-key：0或4字节(32位) 所有从客户端传送到服务端的数据帧，数据载荷都进行了掩码操作，Mask为1，且携带了4字节的Masking-key。如果Mask为0，则没有Masking-key。载荷数据的长度，不包括mask key的长度</font>
+ <font style="color:rgb(51, 51, 51);">Payload data：(x+y) 字节</font>
    - <font style="color:rgb(51, 51, 51);">载荷数据：包括了扩展数据、应用数据。其中，扩展数据x字节，应用数据y字节。</font>
    - <font style="color:rgb(51, 51, 51);">扩展数据：如果没有协商使用扩展的话，扩展数据数据为0字节。所有的扩展都必须声明扩展数据的长度，或者可以如何计算出扩展数据的长度。此外，扩展如何使用必须在握手阶段就协商好。如果扩展数据存在，那么载荷数据长度必须将扩展数据的长度包含在内。</font>
    - <font style="color:rgb(51, 51, 51);">应用数据：任意的应用数据，在扩展数据之后（如果存在扩展数据），占据了数据帧剩余的位置。载荷数据长度 减去 扩展数据长度，就得到应用数据的长度。</font>

### <font style="color:rgb(51, 51, 51);">Payload length</font>
+ <font style="color:rgb(51, 51, 51);">Payload length：数据载荷的长度，单位是字节。为7位，或7+16位，或7+64位</font>
    - <font style="color:rgb(51, 51, 51);">Payload length=x为0~125：数据的长度为x字节。</font>
    - <font style="color:rgb(51, 51, 51);">Payload length=x为126：后续2个字节代表一个16位的无符号整数，该无符号整数的值为数据的长度</font>
    - <font style="color:rgb(51, 51, 51);">Payload length=x为127：后续8个字节代表一个64位的无符号整数（最高位为0），该无符号整数的值为数据的长度。</font>
    - <font style="color:rgb(51, 51, 51);">如果payload length占用了多个字节的话，payload length的二进制表达采用网络序（big endian，重要的位在前)</font>
+ <font style="color:rgb(51, 51, 51);">readBigUInt64BE 用指定的字节序[readBigInt64BE() 读取为大端序,readBigInt64LE() 读取为小端序]从 buf 中指定的 offset 读取一个有符号的 64 位整数值</font>
+ <font style="color:rgb(51, 51, 51);">Big-endian(大端序) 高位字节在前</font>
+ <font style="color:rgb(51, 51, 51);">Little-endian(小端序) 低位字节在前</font>

```javascript
let buffer = Buffer.from([0b00000001, 0b00000000]);
console.log(Math.pow(2, 8));
console.log(buffer.readUInt16BE(0));// 00000001 00000000
console.log(buffer.readUInt16LE(0));// 00000000 00000001
```

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

### <font style="color:rgb(51, 51, 51);">掩码算法</font>
+ <font style="color:rgb(51, 51, 51);">掩码键（Masking-key）是由客户端挑选出来的32位的随机数。掩码操作不会影响数据载荷的长度。掩码、反掩码操作都采用如下算法：</font>
    - <font style="color:rgb(51, 51, 51);">对索引i模以4得到j,因为掩码一共就是四个字节</font>
    - <font style="color:rgb(51, 51, 51);">对原来的索引进行异或对应的掩码字节</font>
    - <font style="color:rgb(51, 51, 51);">异或就是两个数的二进制形式，按位对比，相同取0，不同取1</font>

<!-- 这是一张图片，ocr 内容为：101 原值 异或 1010 MASKING-KEY 等于 1111 结果 异或 MASKING-KEY 1010 等于 101 原值 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1749439000314-745275c7-f111-4e13-8004-abf1d35ed1e7.png)

<!-- 这是一张图片，ocr 内容为：01010101 数据 MASKING-KEY 11111111 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1749439010365-4d8df710-fd7d-4a5c-9306-30e93c789444.png)

```javascript
function unmask(buffer, mask) {
  const length = buffer.length;
  for (let i = 0; i < length; i++) {
    buffer[i] ^= mask[i & 3];
  }
}

let mask = Buffer.from([1, 0, 1, 0]);
let buffer = Buffer.from([0, 1, 0, 1, 0, 1, 0, 1]);
unmask(buffer, mask);
console.log(buffer);
```

### <font style="color:rgb(51, 51, 51);">实现websocket服务器</font>
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
      buffer[0] = 0b10000000 | _opcode;
      buffer[1] = length;
      payload.copy(buffer, 2);
      socket.write(buffer);
    }
    socket.on('data', (chunk) => {
      if (chunk.toString().match(/Upgrade: websocket/)) {
        this.upgrade(socket, chunk.toString());
      } else {
        this.onmessage(socket, chunk);
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

# <font style="color:rgb(51, 51, 51);">socket.io</font>
+ <font style="color:rgb(51, 51, 51);">Socket.IO是一个WebSocket库，包括了客户端的js和服务器端的nodejs，它的目标是构建可以在不同浏览器和移动设备上使用的实时应用。</font>

## <font style="color:rgb(51, 51, 51);">socket.io的特点</font>
+ <font style="color:rgb(51, 51, 51);">易用性：socket.io封装了服务端和客户端，使用起来非常简单方便。</font>
+ <font style="color:rgb(51, 51, 51);">跨平台：socket.io支持跨平台，这就意味着你有了更多的选择，可以在自己喜欢的平台下开发实时应用。</font>
+ <font style="color:rgb(51, 51, 51);">自适应：它会自动根据浏览器从WebSocket、AJAX长轮询、Iframe流等等各种方式中选择最佳的方式来实现网络实时应用，非常方便和人性化，而且支持的浏览器最低达IE5.5。</font>

## <font style="color:rgb(51, 51, 51);">初步使用</font>
### <font style="color:rgb(51, 51, 51);">安装部署</font>
+ <font style="color:rgb(51, 51, 51);">使用npm安装socket.io</font>

```shell
$ npm install socket.io
```

### <font style="color:rgb(51, 51, 51);">启动服务</font>
+ <font style="color:rgb(51, 51, 51);">创建 </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">app.js</font>`<font style="color:rgb(51, 51, 51);"> 文件</font>

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

### <font style="color:rgb(51, 51, 51);">客户端引用</font>
+ <font style="color:rgb(51, 51, 51);">服务端运行后会在根目录动态生成socket.io的客户端js文件 客户端可以通过固定路径</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">/socket.io/socket.io.js</font>`<font style="color:rgb(51, 51, 51);">添加引用</font>
+ <font style="color:rgb(51, 51, 51);">客户端加载socket.io文件后会得到一个全局的对象io</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">connect</font>`<font style="color:rgb(51, 51, 51);">函数可以接受一个</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">url</font>`<font style="color:rgb(51, 51, 51);">参数，url可以socket服务的http完整地址，也可以是相对路径，如果省略则表示默认连接当前路径</font>
+ <font style="color:rgb(51, 51, 51);">创建index.html文件</font>

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

### <font style="color:rgb(51, 51, 51);">发送消息</font>
+ <font style="color:rgb(51, 51, 51);">成功建立连接后，我们可以通过</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">socket</font>`<font style="color:rgb(51, 51, 51);">对象的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">send</font>`<font style="color:rgb(51, 51, 51);">函数来互相发送消息 修改index.html</font>

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

+ <font style="color:rgb(51, 51, 51);">修改app.js</font>

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

## <font style="color:rgb(51, 51, 51);">深入分析</font>
### <font style="color:rgb(51, 51, 51);">send方法</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">send</font>`<font style="color:rgb(51, 51, 51);">函数只是</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">emit</font>`<font style="color:rgb(51, 51, 51);">的封装</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">node_modules\socket.io\lib\socket.js</font>`<font style="color:rgb(51, 51, 51);">源码</font>

```javascript
function send(){
	var args = toArray(arguments);
	args.unshift('message');
	this.emit.apply(this, args);
	return this;
}
```

+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">emit</font>`<font style="color:rgb(51, 51, 51);">函数有两个参数</font>
    - <font style="color:rgb(51, 51, 51);">第一个参数是自定义的事件名称,发送方发送什么类型的事件名称,接收方就可以通过对应的事件名称来监听接收</font>
    - <font style="color:rgb(51, 51, 51);">第二个参数是要发送的数据</font>

### <font style="color:rgb(51, 51, 51);">服务端事件</font>
| **<font style="color:rgb(51, 51, 51);">事件名称</font>** | **<font style="color:rgb(51, 51, 51);">含义</font>** |
| :--- | :--- |
| <font style="color:rgb(51, 51, 51);">connection</font> | <font style="color:rgb(51, 51, 51);">客户端成功连接到服务器</font> |
| <font style="color:rgb(51, 51, 51);">message</font> | <font style="color:rgb(51, 51, 51);">接收到客户端发送的消息</font> |
| <font style="color:rgb(51, 51, 51);">disconnect</font> | <font style="color:rgb(51, 51, 51);">客户端断开连接</font> |
| <font style="color:rgb(51, 51, 51);">error</font> | <font style="color:rgb(51, 51, 51);">监听错误</font> |


### <font style="color:rgb(51, 51, 51);">客户端事件</font>
| **<font style="color:rgb(51, 51, 51);">事件名称</font>** | **<font style="color:rgb(51, 51, 51);">含义</font>** |
| :--- | :--- |
| <font style="color:rgb(51, 51, 51);">connect</font> | <font style="color:rgb(51, 51, 51);">成功连接到服务器</font> |
| <font style="color:rgb(51, 51, 51);">message</font> | <font style="color:rgb(51, 51, 51);">接收到服务器发送的消息</font> |
| <font style="color:rgb(51, 51, 51);">disconnect</font> | <font style="color:rgb(51, 51, 51);">客户端断开连接</font> |
| <font style="color:rgb(51, 51, 51);">error</font> | <font style="color:rgb(51, 51, 51);">监听错误</font> |


## <font style="color:rgb(51, 51, 51);">划分命名空间</font>
### <font style="color:rgb(51, 51, 51);">服务器端划分命名空间</font>
+ <font style="color:rgb(51, 51, 51);">可以把服务分成多个命名空间，默认/,不同空间内不能通信</font>

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

### <font style="color:rgb(51, 51, 51);">客户端连接命名空间</font>
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

## <font style="color:rgb(51, 51, 51);">房间</font>
+ <font style="color:rgb(51, 51, 51);">可以把一个命名空间分成多个房间，一个客户端可以同时进入多个房间。</font>
+ <font style="color:rgb(51, 51, 51);">如果在大厅里广播 ，那么所有在大厅里的客户端和任何房间内的客户端都能收到消息。</font>
+ <font style="color:rgb(51, 51, 51);">所有在房间里的广播和通信都不会影响到房间以外的客户端</font>

### <font style="color:rgb(51, 51, 51);">进入房间</font>
```javascript
socket.join('chat');//进入chat房间
```

### <font style="color:rgb(51, 51, 51);">离开房间</font>
```javascript
socket.leave('chat');//离开chat房间
```

## <font style="color:rgb(51, 51, 51);">全局广播</font>
+ <font style="color:rgb(51, 51, 51);">广播就是向多个客户端都发送消息</font>

### <font style="color:rgb(51, 51, 51);">向大厅和所有人房间内的人广播</font>
```javascript
io.emit('message','全局广播');
```

### <font style="color:rgb(51, 51, 51);">向除了自己外的所有人广播</font>
```javascript
socket.broadcast.emit('message', msg);
socket.broadcast.emit('message', msg);
```

## <font style="color:rgb(51, 51, 51);">房间内广播</font>
### <font style="color:rgb(51, 51, 51);">向房间内广播</font>
+ <font style="color:rgb(51, 51, 51);">从服务器的角度来提交事件,提交者会包含在内</font>

```javascript
//2. 向myroom广播一个事件，在此房间内包括自己在内的所有客户端都会收到消息
io.in('myroom').emit('message', msg);
io.of('/news').in('myRoom').emit('message',msg);
```

### <font style="color:rgb(51, 51, 51);">向房间内广播</font>
+ <font style="color:rgb(51, 51, 51);">从客户端的角度来提交事件,提交者会排除在外</font>

```javascript
//2. 向myroom广播一个事件，在此房间内除了自己外的所有客户端都会收到消息
socket.broadcast.to('myroom').emit('message', msg);
socket.broadcast.to('myroom').emit('message', msg);
```

### <font style="color:rgb(51, 51, 51);">获取房间列表</font>
```javascript
io.sockets.adapter.rooms
```

### <font style="color:rgb(51, 51, 51);">获取房间内的客户id值</font>
+ <font style="color:rgb(51, 51, 51);">取得进入房间内所对应的所有sockets的hash值，它便是拿到的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">socket.id</font>`

```javascript
let roomSockets = io.sockets.adapter.rooms[room].sockets;
```

## <font style="color:rgb(51, 51, 51);">聊天室</font>
+ <font style="color:rgb(51, 51, 51);">创建客户端与服务端的websocket通信连接</font>
+ <font style="color:rgb(51, 51, 51);">客户端与服务端相互发送消息</font>
+ <font style="color:rgb(51, 51, 51);">添加用户名</font>
+ <font style="color:rgb(51, 51, 51);">添加私聊</font>
+ <font style="color:rgb(51, 51, 51);">进入/离开房间聊天</font>
+ <font style="color:rgb(51, 51, 51);">历史消息</font>

### <font style="color:rgb(51, 51, 51);">app.js</font>
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

### <font style="color:rgb(51, 51, 51);">index.html</font>
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

# <font style="color:rgb(51, 51, 51);">参考</font>
[豆米的博客](https://blog.5udou.cn/blog/JSShi-Shi-Tong-Xin-San-Ba-Fu-Xi-Lie-Zhi-San-eventsource55)

[服务端事件EventSource揭秘 - royalrover - 博客园](https://www.cnblogs.com/accordion/p/7764460.html)

[Socket.IO](http://socket.io/)

