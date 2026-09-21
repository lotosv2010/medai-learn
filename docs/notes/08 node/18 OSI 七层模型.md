+ OSI(open system Interconnection)是理想化的模型，将网络进行分层，其目的是将复杂的流程简单化，从而实现分而治之。(专人干专事)

# 网络分层的含义
> 下层是为了上层提供服务的。
>

+ 应用层：用户最终使用的接口
+ 表示层：数据的表示、安全、压缩
+ 会话层：建立和管理会话的
+ 传输层：(**主要提供安全及数据完整性保障**)网络层不可靠，保证可靠的传输。
+ 网络层：(**主要关心的是寻址**)，进行逻辑寻址，定位到对方，找到最短的路
+ 数据链路层：(**主要关心两个设备之间传递数据**)，建立逻辑链接，将数据组合成数据进行传递(差错校测，可靠传输)
+ 物理层：(**核心是传输数据比特流**)，不关心具体的传输媒体(双绞线、光纤、同轴电缆、无线)

> 举例：写给女朋友信的过程
>

+ 应用层：你心里有很多想对女朋友说的话。这个就是应用层中的数据
+ 表示层：将你想说的话进行整合，有调理的表示出来
+ 会话层：我希望我的信只能我的女朋看到别人不行(非女朋友偷看者死)
+ 以上这三个就是我们完整信的内容。
+ 传输层：我自己不好意思亲手交给她，找个快递来。告诉他我家504她家301，你发吧-
+ 网络层：快递说这不是开玩笑吗?你得给我个能找到他的地址xxx 省xxx市xxx街道xxx小区。还得添上你的地址， 原地址和目标地址。
+ 数据链路层：信件到了快递总部，会进行分类增加标识，快递需要中转，先找到第一个中转站发过去，之后根据目的地地址依次进行中转发送。
+ 物理层：通过飞机、卡车将信邮寄到过去。

> 信件邮寄到目的地后，邮局会分配到对应的小区，找到对应的门牌号，我的女朋友就会拿到对应的信件了。
>

<!-- 这是一张图片，ocr 内容为：应用层数据 报文 应用层 应用层 应用层数据 传输层 传输层头部 数据段:增加端口 传输层 网络层头部 网络层 应用层数据 数据包:增加IP 传输层头部 网络层 应用层数据 数据帧:增加MAC地址 帧头 数据链路层 网络层头部 帧尾 传输层头部 数据链路层 物理层 物理层 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742084558603-dca9864a-242f-4248-aa12-63c490a450a6.png)

# 地址
## IP地址
+ ipv4 192.168.1.1(255.255.255.255)不够用，子网的划分 
+ ipv6 由8个 16 个位组成的地址 ip(短) 
+ 所谓的寻址就是寻找地址mac

## MAC地址
+ 网卡和网卡的通信(mac 地址)一般情况下 mac 地址是唯一的 通过 mac 地址来交换数据 (长)

# 物理设备
## 物理层
+ 中继器：两口，(实现信号再生)通过中继器实现信号的放大，解决最大传输问题
+ 集线器：多口，可以实现多台设备交互 (广播的形式发发送数据，不会帮你过滤敏感信息)

## 数据链路层
+ 交换机：交换机可以识别已经连接设备的物理地址(MAC地址)。可以将据传递到相应的端口上

## 网络层
+ 路由器：检测数据的 IP 地址是否属于自己网络，如果不是会发送到另一个网络。没有wan口的路由器可以看成交换机。 路由器一般充当网关，路由器会将本地 IP 地址进行NAT

> 网关：两个子网之间不可以直接通信，需要通过网关进行转发
>

<!-- 这是一张图片，ocr 内容为：R1 LAN LAN 1111 WAN WAN IP2/MAC2 IP1/MAC1 IP1->IP2 网络层 IP1->IP2 IP1-IP2 R1MAC2 R1MAC1 MAC1 数据链路层 R2MAC2 R1MAC1 MACZ -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742087070754-2aa22178-4bcc-4e4f-a8d9-3942ac981bde.png)

# TCP/IP 参考模型
+ Transmission Control protocol/Internet protocol，传输控制协议/网际协议。TCP/IP 协议实际上是一系列网络通信协议的统称，最核心的两个协议是 TCP 和 IP

## 什么是协议
> 协议就是约定和规范。
>

+ 数据链路层、物理层：物理设备(在五层模型中能称之为协议的都在三层及以上)
    - 网络层：
        * IP 协议：寻址通过路由器查找，将消息发送给对方路由器，通过 ARP 协议发送自己的 MAC 地址
        * ARP协议：根据目的 IP 地址，解析目的mac 地址
    - 传输层：
        * TCP 协议：面向连接，安全可靠慢
        * UDP 协议：非连接 不安全不可靠 快
    - 应用层：
        * HTTP 协议：应用层协议
        * DNS 协议：将网址转换成 IP 地址
        * DHCP 协议：动态主机配置协议

## ARP 协议
> 根据目的 IP 地址，解析目的mac 地址
>

<!-- 这是一张图片，ocr 内容为：MAC地址:C IP地址:192.168.1.3 A要访问B 我的IP地址是:192.168.1.1 我的MAC地址是:A 广揭 我要访问的IP地址是192.168.1.2 广播 MAC地址:B IP地址:192.168.1.2 我是B MAC地址:A 我的IP是:192.168.1.2 IP地址:192.168.1.1 我的MAC地址是:B -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742086280994-34ec1902-bb39-470e-b07a-7fedbd68e289.png)

| ARP缓存表 | 交换机MAC地址表 | | |
| --- | --- | --- | --- |
| Internet 地址 | 物理地址 | 端口号 | 物理地址 |
| 192.168.1.2 | B | 1 | A |
|  |  | 2 | B |
|  |  | 3 | C |


> 有了源mac地址和目标mac地址，就可以传输数据包了
>

## DHCP 协议
+ 通过 DHCP 自动获取网络配置信息(动态主机配置协议 Dynamic Host Configuration Protocol)我们无需自己手动配置IP

## DNS 协议
+ DNS 是 Domain Name System 的缩写，DNS 服务器进行域名和与之对应的 IP 地址转换的服务器
    - 顶级域名 .com
    - 二级域名 .com.cn
    - 三级域名 www.zf.com.cn，有多少个点就是几级域名
+ 访问过程：我们访问 zf.com.cn
    - 操作系统里会对 DNS 解析结果做缓存，如果缓存中有直接返回 IP 地址
    - 查找c:\WINDOWS\stystem32\drivers\etc\hosts 如果有直接返回 IP 地址
    - 通过 DNS 服务器查找离自己最近的根服务器，通过根服务器找到 .cn 服务器，将 IP 返回给 DNS 服务器
    - DNS 服务器会继续向此 IP 发送请求，去查找对应 .cn 下 .com对应的 IP
    - 获取最终的 IP地址，缓存到 DNS 服务器上

<!-- 这是一张图片，ocr 内容为：腾讯咪室 1.DNS解析缓存 2.本地HOSTS文件 配置的DNS服务 路由内置DNS 顶级域名.CN 域名服务器 二级域名IP .COM.CN 返回顶级域名 IP .ZF.COM.CN 三级域名IP WWW 根DNS服务器 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742089279398-fe0793fb-a93d-4f73-b14f-96a7e629c06a.png)

+ 查找过程就是一个递归的过程

> DNS 服务器会对 IP 以及域名进行缓存，采用的是 UDP（无连接）
>

#  TCP 和 UDP
> 两个协议都是在传输层，我们经常说 TCP 是面向连接的，而 UDP 是面向无连接的
>

+ <font style="color:rgba(0, 0, 0, 0.75);">UDP 发出请求以后，不考虑对方是否能接收到、内容是否完整、顺序是否正确。收到数据也不会进行通知。</font>
+ <font style="color:rgba(0, 0, 0, 0.75);">首部结构简单，在数据传输时能实现最小的开始</font>

## TCP
+ <font style="color:rgb(77, 77, 77);">TCP 传输控制协议是可靠、面向连接的协议，传输效率低（在不可靠的 IP 层上建立可靠的传输层）。</font>
+ <font style="color:rgb(77, 77, 77);">TCP 提供全双工服务，即数据可在同一时间双向传播</font>

### <font style="color:rgb(79, 79, 79);">TCP 数据格式</font>
<!-- 这是一张图片，ocr 内容为：15 31 16 源端口号 目标端0号 发送TCP进程 32位序列号 目标端接收 对应的端口号 32位确认号 进程的端口号 共2个字节 SYN ACK FIN D RST URG 保留 4位 SH 16位窗0大小 首部 6位 长度 16位紧急指针 16位校验和 可选项 数据 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742089569838-77cbe785-52ff-495f-a673-5a2bd7583525.png)

+ 源端口号、目标端口号，指代的是发送方随机端口，目标端对应的端口
+ 序列号：32位序列号是用于对数据包进行标记，方便重组
+ 确认序列号：期望发送方下一个发送的数据的编号
+ 4位首部长度：单位是字节，4位最大能表示15，所以头部长度最大为60
+ URG：紧急信号、ACK：确认信号、PSH：应该从TCP缓冲区读走数据、RST：断开重新连接、SYN：建立连接、FIN：表示要断开
+ 窗口大小：当网络通畅时将这个窗口值变大加快传输速度，当网络不稳定时减少这个值。在TCP中起到流量控制作用。
+ 校验和：用来做差错控制，看传输的报文段是否损坏
+ 紧急指针：用来发送紧急数据使用

> TCP 对数据进行分段打包传输，对每个数据包编号控制顺序
>

### <font style="color:rgb(79, 79, 79);">TCP 三次握手</font>
+ <font style="color:rgba(0, 0, 0, 0.75);">客户端和服务端主动握手</font>
+ <font style="color:rgba(0, 0, 0, 0.75);">服务端应答后和客户端握手</font>
+ <font style="color:rgba(0, 0, 0, 0.75);">客户端应答</font>

<!-- 这是一张图片，ocr 内容为：LISTEN CLOSED CLIENT SERVER SYNC客户主动连接服务端 SYNC SENT SEQ-O SYNC RCVD 4115210620609823托车车 吸富直接 SYNC服务端链接客户端 ACK服务端应答 SEQ0ACK1 ESTABLISHED ACK客户端应答 ACK1 SEQ1 ESTABLISHED -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742089614420-fae5b7eb-c2f9-4e67-b479-5a080d80a372.png)

<!-- 这是一张图片，ocr 内容为：CLIENT SERVER PSH,ACK客户主动给服务端推送数据 基于链接给你发送 HELLO SEQ1ACK1LEN55 HELLO收到了 在传递数据要从第六 ACK服务端应答 个字节开始啊!! SEG1ACK6 基于链接给你发送HI PSH.ACK服务端给客户端推送数据 SEQ1ACK6LEN2 HI收到了 ACK服务端应答 知道再传从6开始 ACK3 SEQ6 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742089629621-3c7b3873-d981-422f-95fa-b8b1b02c7c95.png)

### TCP 四次挥手
<!-- 这是一张图片，ocr 内容为：第一次挥手,通知服务端要断开 第二次挥手,服务器应答 第三次挥手,服务端还有没有传输完的数据 服务端 客户端 第四次挥手,完成 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742089782987-54f17fb2-90b4-4087-8f3c-b94a46a1cf9c.png)

+ <font style="color:rgb(77, 77, 77);">原因是</font>**<font style="color:rgb(77, 77, 77);">确定双方通信正常</font>**<font style="color:rgb(77, 77, 77);">。</font>
+ <font style="color:rgb(77, 77, 77);">当 seq 和 ack 都是 1，表示握手完成。</font>`<font style="color:rgb(199, 37, 78);background-color:rgb(249, 242, 244);">ack = seq + len</font>`<font style="color:rgb(77, 77, 77);"> </font><font style="color:rgb(77, 77, 77);">。</font>
+ <font style="color:rgb(77, 77, 77);">那么为什么需要四次挥手，会比握手多一次呢？</font>

<!-- 这是一张图片，ocr 内容为：CLIENT SERVER FIN,ACK我要和你断开 FIN WAIT 1 SEQ6ACK3 CLOSE WAIT ACK收到断开消息 ACK7SEQ3 FIN WAIT_2 LAST ACK ACK-7SEQ3 FIN,ACK我要和你断开 ACK收到断开消息 TIME WAIT ACK4 SEQ7 CLOSED -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742089811276-e070ca91-adfc-4a68-b997-34dff802828d.png)

+ 如图可知，在客户端和服务端的连接需要断开的时候，需要一方发起断开的信号，然后双方开始进行应答交互，而因为服务端可能还有没有发送完的数据，所以会比握手多一次，最后完成断开。

> <font style="color:rgb(85, 86, 102);">握手和挥手时：ack = 对方的 seq + 1 个标致位</font>
>
> <font style="color:rgb(85, 86, 102);">发送数据时：ack = 对方的 seq + 对方的 len</font>
>

+ <font style="color:rgb(85, 86, 102);">假如出现了丢包的情况，会怎么办呢？</font>
    - <font style="color:rgb(85, 86, 102);">客户端和服务端说：我们分手吧（如果服务端假装没听到，就会一直发）</font>
    - <font style="color:rgb(85, 86, 102);">收到分手消息</font>
    - <font style="color:rgb(85, 86, 102);">服务端说：我们分手吧</font>
    - <font style="color:rgb(85, 86, 102);">客户端说收到了（假如丢包了，服务端看客户端没有反应，需要重新发送，服务端继续说我们分手吧）</font>
    - <font style="color:rgb(85, 86, 102);">客户端不能立即发送后就关闭，得等待。看着有没有服务端重新发送的包，如果没有就可以断开了</font>
    - <font style="color:rgb(85, 86, 102);">等着就会占用端口号</font>
    - <font style="color:rgb(85, 86, 102);">如果丢包了，但是客户端断开了，服务端就认为客户端挂掉了，出错了。客户端会发送一个 RST 包</font>

> <font style="color:rgb(85, 86, 102);">为了防止最终的 ACK 丢失，发送 ACK 后需要等待一段时间，因为如果丢包服务端需要重新发送 FIN 包，如果客户端已经 closed，那么服务端会将结果解析成错误。从而在高并发非长链接的场景下会有大量端口被占用。</font>
>

:::color1
三次握手的目的 就是建立双向的链接(实现了双方可以建立连接）

-1. 我可以和你发短信么

-2. 好的， 那我可以给你发消息么

-3. 可以呀

四次断开是如何来的?

-1. 我们分手吧!

-2. 我收到了，(女生不能立刻发起分手的动作) .......正在发送其他消息

-3. 我们分手吧

-4. 对方确认 分手吧~

:::

## TCP 抓包
```javascript
const net = require('net');
const socket = new net.Socket();

// 连接8080端口
socket.connect(8090, 'localhost');

// 监听socket的connect事件
socket.on('connect', () => {
  console.log('Connected to server');

  // 发送消息给服务器
  socket.write('Hello, server!');
  // 关闭socket
  socket.end();
})

// 监听服务器的响应
socket.on('data', (data) => {
  console.log(`Received from server: ${data}`);
});

// 监听socket的close事件
socket.on('close', () => {
  console.log('Disconnected from server');
})

// 监听socket的error事件
socket.on('error', (err) => {
  console.error(`Error: ${err.message}`);
});
```

```javascript
const net = require('net');

// 创建服务器
const server = net.createServer((socket) => {
  // 监听客户端的数据
  socket.on('data', (data) => {
    console.log(`Received data from client: ${data}`);
    socket.write('Hello from server!');
  });

  // 监听客户端的关闭
  socket.on('end', () => {
    console.log('Client disconnected');
  });
});

// 监听服务器的错误
server.on('error', (err) => {
  console.error(`Server error: ${err.message}`);
});

// 启动服务器
server.listen(8090, () => {
  console.log('Server listening on port 8090');
});
```

### 建立连接
<!-- 这是一张图片，ocr 内容为：LISTEN CLOSED CLICNT SERVER SYNC客户主动连接服务端 SYNC SENT SEA-0 SYNC RCVD ACK服务端应答 SYNC服务端链接客户端 SEQ 0 ACK1 ESTABLISHED ACK客户端应答 ACK1 SEGE1 ESTABLISHED -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742093033649-10b1dac5-56f6-4318-b899-0728d4f7676f.png)

> 三次握手：
>
> 1. 我能主动给你打电话吗?
> 2. 当然可以啊!那我也能给你打电话吗?
> 3. 可以的呢，建立连接成功!
>

+ 握手流程：
    - 客户端和服务端分别有一个序列号 seq = 0
    - 客户端我的序列号是 0 seq = 0, 服务端要表示我收到了这个数据做应答 ack = 客户端 seq + 1，并且告诉客户端服务端的 seq 是多少 seg =0
    - 客户端会收到 客户端的 ack = 服务端 seq +1, 服务端响应给客户端的ack 或作为客户端的seq
    - 握手后 ack =1 seq = 1(两个序号分别是客户端的序号和服务端序号的)

### 数据传输
+ 发送数据的流程
    - 客户端和服务端说 hello -> 服务端要立刻响应
    - 客户端的 seq = 1，ack 的值也是 1 长度为 5 个字节的大小的内容
    - 服务端响应 ack = 客户端的 seq + len，我的序号还是 seq = 1
    - 服务端和客户端说 hi-> 客户端要响应
    - 服务端的序列号是 seq=1，我的 ack= 6, len = 2 我要发送两个字节的消息
    - 客户端就收到消息要响应 ack = 服务端的 seq + 服务端的 len, 我的序号是是上次服务端 ack 的值 seq = 6
    - tcp如果发现对方没有响应，会认为数据丢失了 ，会重新发送

<!-- 这是一张图片，ocr 内容为：CLICNT SERVER PSH,ACK客户主动给服务媒推送数据 基子国接给你发送 HELLO SEQ1ACKS1LEN5 HELLO收到了 在传递数据要从第六 ACK服务端应答 个字节开始啊!! SEQS1ACK-6 鉴于链接给你发送HI PSH,ACK服务请给客户端推送数据 SEQU1ACK6 LEN-2 HI收到了 ACK聚劳物控管 ACK 3 SEG 6 CLIENT SERVER FIN.ACK我要和你医开 FINWAIT.1 SEQ6ACK3 CLOSE WAIT ACK收到新开青息 ACKA7 SEQ-3 FIN WAIT 2 ACK7SEG'3 LAST ACK FIN.ACK我要和你听开 TIMEWAIT ACK-4 SEGF7 CLOSED -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742093534942-90f4c036-06dc-4451-8864-f3443c61ab0b.png)

> 四次挥手
>
> 1. 我们分手吧 
> 2. 收到分手的信息
> 3. 好吧，分就分吧
> 4. 行，那就到这里了
>

## TCP 缺陷
+ 当断开的时候， 客户端最后发送的确认消息，服务端可能收不到 (服务端如果认为丢包了，会再次发送分手消息) 客户端不能再发送分手确认消息后立刻断开，如果断开会报异常(客户端发送确认消息后，需要等待一段时间)
+ 每次断开的时候都不能立即断开，导致端口无法释放，可能导致端口用尽(http基于tcp，http最早的时候短链接，用完tcp后就断开，http1.1 keep-alive 所谓的长连接，可以再1个tcp 通道中多次传输数据)

> 缺点：端口占用问题，慢启动问题(keep-alive)、 tcp队头阻塞问题(解决有序)
>
> 优点：有序、可靠、快重传、粘包
>

## UDP
+ UDP 用户数据报协议 user patagram protoco ，是一个无连接、不保证可靠性的传输层协议。你让我发什么就发什么!
    - 使用场景:DHCP 协议、DNS 协议、QUIC协议等(处理速度快，可以丢包的情况)

<!-- 这是一张图片，ocr 内容为：O ---15 16 16位目标端口号 16位源端口号 16位UDP校验和 16位UDP长度 数据 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742098892113-5fd04a45-a2fc-4b4a-9f3e-cc4b7ac451d1.png)

## UDP 抓包
```javascript
const dgram = require('dgram');

const socket = dgram.createSocket('udp4');

socket.on('message', (msg, rinfo) => {
  console.log(`Received message: ${msg} from ${rinfo.address}:${rinfo.port}`);

  socket.send(msg, 0, msg.length, rinfo.port, rinfo.address)
});

socket.bind(41234, 'localhost');
```

```javascript
const dgram = require('dgram');

const socket = dgram.createSocket('udp4');

socket.on('message', (msg, rinfo) => {
  console.log(`Received message from ${rinfo.address}:${rinfo.port}`);
  console.log(`Message: ${msg}`);
});

socket.send(Buffer.from('Hello, server!'), 0.5, 41234, 'localhost', (err, bytes)) => {
  if (err) {
    console.error(`Error sending message: ${err.message}`);
  } else {
    console.log(`Sent ${bytes} bytes to server`);
  }
});
socket.on('error', (err) => {
  console.error(`Error: ${err.message}`);
})
```

## 滑动窗口
> 发送连续的数据
>

+ 滑动窗口：TCP是全双工的，所以发送端有发送缓存区；接收端有接收缓存区，要发送的数据都放 到发送者的缓存区，发送窗口(要被发送的数据)就是要发送缓存中的哪一部分
+ 核心是流量控制：在建立连接时，接收端会告诉发送端自己的窗口大小(rwnd),每次接收端收到数据后都会再次确认(rwnd)大小，如果值为0，停止发送数据。(并发送窗口探测包，持续监测窗口大小)

## 粘包
+ Nag1e 算法的基本定义是任意时刻，最多只能有一个未被确认的小段(TCP内部控制)
+ cork算法 当达到mss (Maximum Segment size)值时统一进行发送(此值就是帧的大小*ip头*tcp头=1460个字节)理论值

## TCP拥塞处理
+ 队头阻塞、慢启动、短连接

> 举例:假设接收方窗口大小是无限的，接收到数据后就能发送 ACK 包，那么传输数据主要是依赖于网络带宽，带宽的大小是有限的。
>

+ TCP 维护一个拥塞窗口cwnd (congestion window)变量，在传输过程正没有拥塞就将此值增大。如果出现拥塞(超时重传RTO(Retransmission Timeout))就将窗口值减少。
+ cwnd < ssthresh 使用慢开始算法
+ cwnd > ssthresh 使用拥塞避免算法
+ ROT时更新 ssthresh 值为当前窗口的一半，更新cwnd =1

<!-- 这是一张图片，ocr 内容为：拥塞窗口 CWND 拥塞避免 网络拥塞 "加法增大" 24 拥塞避免 "加法增大" 20 "乘法减小" SSTHRESH的初始值16 值12 新的SSTHRESH 8 指数规律增长 4 慢开始 传输轮次 O 681012 2 14 16 18 20 22 慢开始 慢开始 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742105909890-f1a3b85e-2279-4432-8035-75bd424b233d.png)

+ 传输轮次: RTT(Round-trip time),从发送到确认信号的时间
+ cwnd 控制发送窗口的大小。

<!-- 这是一张图片，ocr 内容为：拥塞窗口 CWND 超时 24 20 拥塞避免 3-ACK SSTHRESH TCP RENO -16 拥塞避免? 的初始值 版本 12 拥塞避免 8 慢开始 慢开始 4 传输轮次 10 12 16 18 20 2 20  22  4  24 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742106328400-7080a5a8-5db5-456a-a8ef-4079bdff440a.png)

> 快重传，可能在发送的过程中出现丢包情况。此时不要立即回退到慢开始阶段，而是对已经收到的报文重复确认，如果确认次数达到3此，则立即进行重传 快恢复算法(减少超时重传机制的出现)，降低重置 ewnd的频率。
>

