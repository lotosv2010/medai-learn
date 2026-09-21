# Node.js 核心 API 大全：process/crypto/net/os/worker_threads 深度拆解（面试收藏级）

> **副标题**：进程信息与信号处理、加密哈希与签名、TCP/UDP 原生编程、多线程 worker_threads 与 cluster 多进程对比、手写 WebSocket 服务端与静态资源服务器

> 面试官说「聊下 `worker_threads` 和 `cluster` 的区别」，多数人只能憋出一句「一个是线程一个是进程」。能把这八个核心模块串成四条能力线——进程怎么优雅退出、数据怎么安全加密、网络怎么从 TCP 一步步包成 HTTP、CPU 密集怎么不阻塞事件循环——再顺手手写一个 WebSocket 服务端和静态资源服务器的人，才真正摸到了 Node.js 作为后端运行时的底。

---

## 🎯 这篇文章解决什么问题

前面几篇讲了事件驱动、事件循环、运行时内核、I/O 体系，但 `process`/`crypto`/`net`/`os`/`url`/`child_process`/`worker_threads`/`cluster` 这八个核心模块一直散落着没串起来。它们是 Node 后端能力里最「实战」的一层——进程管理、加密安全、原生网络、多核并行，几乎每个线上系统的关键路径都踩在这上面。

这篇文章是「Node.js 全栈深度拆解」系列的第 5 篇。它不讲协议原理（HTTP/TLS/WebSocket 帧格式见《网络原理》系列），只回答一个问题——**这些核心模块分别解决什么能力，怎么用对、怎么答对**。

八个模块，归并成四条能力线，最后落到两个综合实战：

- **进程与信号**——`process` 优雅退出
- **加密与安全**——`crypto` 哈希/签名/安全随机数
- **网络编程**——`net` 原生 TCP + `url`/`querystring`
- **多核并行**——`os` + `worker_threads` + `cluster` + `child_process`

---

## 一、使用与实践

先用起来，再钻原理。这一章把八个模块的 API 用法过一遍，都用医疗场景命名落地。

### 进程与信号：process 的日常用法

`process` 是 Node 的全局对象，不需要 `require`。最常用的四个，几乎每个启动脚本都会碰：

```javascript
// 1. 命令行参数：node app.js --port=8080
//    argv[0]=node 路径, argv[1]=脚本路径, argv[2] 起才是业务参数
console.log(process.argv)       // ['/usr/bin/node', '/app/app.js', '--port=8080']

// 2. 环境变量：数据库地址、密钥等不该写死在代码里的东西
const dbUrl = process.env.DATABASE_URL

// 3. 当前工作目录：相对路径的锚点
console.log(process.cwd())      // /app

// 4. 主动退出进程：0 表示正常退出，非 0 表示异常退出
process.exit(0)
```

`process.exit()` 是「硬退出」，会立即终止进程，不会等待未完成的异步 I/O 写完。生产里它只能出现在「收尾完成之后」，绝不能当「关服务器」的方式——这个后面「设计与原理」会展开。

### 优雅退出：监听信号，从容收尾

真正的生产进程，退出不是「咔嚓一下」，而是「接到信号 → 停止接收新请求 → 排空已有请求 → 保存状态 → 再退出」。用 `process.on` 监听系统信号实现：

```javascript
const http = require('http')
const server = http.createServer((req, res) => res.end('ok'))

// 监听 SIGTERM（kill 默认信号）/ SIGINT（Ctrl+C）
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

function gracefulShutdown(signal) {
  console.log(`收到 ${signal}，开始优雅退出`)

  // 1. 先停止接收新连接，但已建立的连接继续处理
  server.close(() => {
    console.log('所有连接已排空')
    // 2. 保存状态、关闭数据库连接、清理定时器……
    // 3. 最后才真正退出
    process.exit(0)
  })

  // 兜底：超过 10 秒还没排空，强制退出，避免进程永远挂起
  setTimeout(() => {
    console.error('优雅退出超时，强制退出')
    process.exit(1)
  }, 10 * 1000)
}

server.listen(3000)
```

这套「`server.close()` 排空 + 超时兜底 + 最后 `exit`」是优雅退出的标准骨架，K8s 滚动更新、PM2 重启时都会先发 `SIGTERM` 触发它。

### 加密与安全：crypto 的三个高频用法

`crypto` 是 Node 里对接 OpenSSL 的模块，三个方法覆盖了后端 90% 的安全需求。

**① 哈希摘要**：`createHash` 生成不可逆的固定长度摘要，用于数据完整性校验。比如给患者处方数据算一个 `sha256` 指纹，任何一位改动都会让摘要完全变化：

```javascript
const crypto = require('crypto')

// 对患者处方数据做完整性校验：生成 256 位摘要
const rx = JSON.stringify({ patientId: 'P10086', drugs: ['阿司匹林', '二甲双胍'] })
const digest = crypto.createHash('sha256').update(rx).digest('hex')
console.log(digest) // 64 个十六进制字符，任何输入变化都会产生完全不同的结果
```

**② 密钥签名**：`createHmac` 在哈希基础上加一个密钥，用来防「篡改 + 冒充」。对方必须持有同一个密钥才能算出相同签名：

```javascript
const SECRET = process.env.SIGN_SECRET

// 用 HMAC-SHA256 给处方单加签名，防止中途被篡改
const hmac = crypto.createHmac('sha256', SECRET).update(rx).digest('hex')
// 下游拿同一密钥重新算一遍，对不上就说明内容被动过
```

**③ 安全随机数**：`randomBytes` 生成密码学安全的随机数，用于会话 ID、验证码、盐值。它和 `Math.random()` 有本质区别（后面会讲）：

```javascript
// 生成 32 字节的安全随机数，转成 hex 作为会话 ID
const sessionId = crypto.randomBytes(32).toString('hex')
console.log(sessionId) // 64 位的十六进制随机串，无法被预测
```

### 网络编程：net 原生 TCP

`net` 是 Node 对 TCP 连接的直接封装。`http`/`https`/`ws` 全部构建在它（或 `tls`）之上。下面这段「TCP 抓包」是最原始的网络编程——直接收发字节，不解析任何 HTTP 语义：

```javascript
const net = require('net')
const socket = new net.Socket()

// 连接 8090 端口
socket.connect(8090, 'localhost')

socket.on('connect', () => {
  console.log('Connected to server')
  socket.write('Hello, server!')   // 发一段原始字节
  socket.end()
})

socket.on('data', (data) => {
  console.log(`Received from server: ${data}`)
})

socket.on('close', () => console.log('Disconnected from server'))
socket.on('error', (err) => console.error(`Error: ${err.message}`))
```

服务端对应 `net.createServer`，回调里拿到的是 `socket`（一个 `Duplex` 流，可读可写）：

```javascript
const net = require('net')

const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    console.log(`Received data from client: ${data}`)
    socket.write('Hello from server!')
  })
  socket.on('end', () => console.log('Client disconnected'))
})

server.on('error', (err) => console.error(`Server error: ${err.message}`))
server.listen(8090, () => console.log('Server listening on port 8090'))
```

`net` 之上还有 `dgram`（UDP），无连接、不保证可靠，但快——DNS、DHCP、QUIC 都跑在 UDP 上：

```javascript
const dgram = require('dgram')
const socket = dgram.createSocket('udp4')

socket.on('message', (msg, rinfo) => {
  console.log(`Received message: ${msg} from ${rinfo.address}:${rinfo.port}`)
  socket.send(msg, 0, msg.length, rinfo.port, rinfo.address)
})

socket.bind(41234, 'localhost')
```

### 处理 URL 与请求参数：url 和 querystring

早期 Node 用 `url.parse()` 解析 URL，返回一个老式的对象结构；现代推荐用 WHATWG 标准的 `new URL()`（和浏览器同一套 API）。`querystring` 负责处理 `key=value` 格式的查询串：

```javascript
const { URL } = require('url')
const querystring = require('querystring')

// 现代写法：new URL() 是浏览器同款 WHATWG 标准实现
const u = new URL('https://his.example.com/patients?name=zhang&age=30#top')
console.log(u.searchParams.get('name'))  // 'zhang'
console.log(u.hostname)                  // 'his.example.com'

// 遗留写法：url.parse() 返回老式对象，新代码应避免
// const { query } = require('url').parse(url, true)

// querystring 处理 x-www-form-urlencoded 请求体
const body = 'username=robin&password=123456'
const parsed = querystring.parse(body)
console.log(parsed)  // { username: 'robin', password: '123456' }
```

### 多核并行：os + worker_threads + child_process

`os` 提供运行环境信息，是「按核数扩展」的依据：

```javascript
const os = require('os')

console.log(os.cpus().length)     // CPU 核数，cluster 的 -i max 就基于它
console.log(os.totalmem())        // 总内存（字节）
console.log(os.freemem())         // 空闲内存
console.log(os.hostname())        // 主机名
```

`worker_threads` 在同一进程内开多线程，用 `parentPort.postMessage()` 和主线程通信：

```javascript
// main.js —— 主线程
const { Worker } = require('worker_threads')

// 把 CPU 密集计算丢给独立线程，主线程事件循环不被阻塞
const worker = new Worker('./hash-worker.js', { workerData: { count: 100000 } })

worker.on('message', (result) => {
  console.log('计算完成，摘要：', result)
})
worker.on('error', (err) => console.error(err))
```

```javascript
// hash-worker.js —— 工作线程
const { parentPort, workerData } = require('worker_threads')
const crypto = require('crypto')

// 模拟一批药品数据的哈希计算（CPU 密集）
let result = ''
for (let i = 0; i < workerData.count; i++) {
  result = crypto.createHash('sha256').update(`drug-${i}`).digest('hex')
}
parentPort.postMessage(result)   // 算完把结果送回主线程
```

`child_process` 启动完全独立的操作系统进程，适合调用外部程序（如医学影像格式转换工具）：

```javascript
const { spawn, exec } = require('child_process')

// exec：适合短命令 + 一次性拿完整输出（有 200KB 的 stdout 缓冲上限）
exec('ls -l', (err, stdout, stderr) => {
  if (err) return console.error(err)
  console.log(stdout)
})

// spawn：适合长进程、大输出、需要流式读写
// 比如调用医学影像格式转换工具 dcm2jpg
const proc = spawn('dcm2jpg', ['-i', 'patient.dcm', '-o', 'patient.jpg'])
proc.stdout.on('data', (data) => console.log(data.toString()))
proc.on('close', (code) => console.log(`转换进程退出，code=${code}`))
```

到这里，八个模块的用法都过了一遍。下一章钻进原理，看它们各自为什么这么设计、面试会怎么考。

---

## 二、设计与原理

API 会调只是第一步，这一章把四条能力线的「为什么」讲透，每条线都配上面试官会问的点。

### 1. 优雅退出：为什么不能直接 process.exit()

很多人以为「关服务器」就是 `process.exit()`，这恰恰是生产事故的源头。

`process.exit()` 是**硬退出**：它立即终止进程，正在进行的异步 I/O（写日志、写数据库、响应用户请求）会被当场丢弃。如果用户正在下载一个 200MB 的药品说明书 PDF，服务端刚读到一半就被 `exit` 掐断，用户收到的是一个损坏的半截文件。

优雅退出的核心思想是**先停止接新，再排空旧的**：

1. `server.close()` 停止监听端口，但**已建立的连接继续处理**
2. 等所有连接处理完，`close` 回调触发
3. 此时再保存状态、关闭数据库连接
4. 最后才 `process.exit(0)`

再加一个**超时兜底**（前面代码里的 10 秒）：万一有连接卡死不释放，不能让进程永远挂着。这套骨架是 K8s 滚动更新、PM2 reload、systemd 管理下 Node 服务的标准退出姿势。

> 💬 **面试官**：为什么不能在生产里直接 `process.exit()` 关服务器？优雅退出怎么做？
>
> ✅ 标准答案：`process.exit()` 是硬退出，会立即丢弃未完成的异步 I/O（正在写的响应、日志、数据库操作），导致数据损坏或用户请求中断。优雅退出是「监听 SIGTERM/SIGINT → `server.close()` 停止接新连接但排空已有连接 → 保存状态、关资源 → 最后 `exit(0)`」，再加超时兜底防止进程挂死。
>
> 🎁 加分答案：能说出这套流程和 K8s/PM2 的配合——K8s 滚动更新会先发 SIGTERM、给 `terminationGracePeriodSeconds` 宽限期，应用要在这段时间内完成优雅退出，否则被强杀。`SIGKILL`（`kill -9`）无法被捕获，所以优雅退出只能靠 SIGTERM/SIGINT。

### 2. crypto 哈希与签名：哈希 ≠ 加密

这是面试里最容易混淆的点：**哈希是单向的，加密是双向的**。

- **哈希（`createHash`）**：输入任意长度，输出固定长度摘要，**不可逆**。同样的输入永远得到同样的摘要，但无法从摘要反推出原文。用途是「校验完整性」——数据有没有被动过。
- **加密（`createCipher`/`createDecipher`）**：有加密就有解密，密钥能还原原文。用途是「保密内容」。

`createHmac` 是第三样东西：**带密钥的哈希**。它在哈希基础上混入一个只有双方知道的密钥，产生的是「消息认证码」。攻击者能改内容，但没有密钥就算不出正确的 HMAC，所以「篡改」会被识破——这正是第 06 篇 JWT 签名的底层机制。

![对称加密：同一把密钥既能加密也能解密，是「双向」的，和单向的哈希本质不同](https://developer.mozilla.org/en-US/docs/Glossary/Encryption/encryption.png)

再看几个具体结论：

- `md5` 已被攻破（能构造碰撞），**不能用于密码存储和签名**，但用于「文件指纹/ETag」这类纯完整性场景仍然可用（因为攻击者没有动机去构造碰撞）。
- `randomBytes` 基于操作系统的密码学安全随机数源（Linux 的 `/dev/urandom`），不可预测；`Math.random()` 是伪随机，算法可被逆向、种子可被推测。

> 💬 **面试官**：`crypto.randomBytes()` 和 `Math.random()` 有什么区别？为什么安全场景不能用后者？
>
> ✅ 标准答案：`randomBytes` 从操作系统的密码学安全随机源（如 `/dev/urandom`）取熵，输出不可预测，适合生成会话 ID、验证码、盐值；`Math.random()` 是伪随机数发生器，算法固定、可被逆向推导，只要观测到足够的输出就能预测后续值，一旦用于会话 ID 就等于把「猜中别人会话」的入口交了出去。
>
> 🎁 加分答案：能补充「会话固定攻击」场景——如果会话 ID 用 `Math.random()` 生成，攻击者可以先给自己注册一个账号、拿到自己的 sessionId，逆向出随机种子，就能预测其他用户的 sessionId，实现账号劫持。哈希和加密的区别（单向 vs 双向）也是常被追问的相邻点。

### 3. net 与协议分层：从 TCP 字节流到 HTTP 语义

`net.Socket` 是 Node 对 TCP 连接的直接封装，它给上层的只有一个「字节流」——能写字节、能读字节，仅此而已。

`http`/`https`/`ws` 都在 `net`（或 `tls`）之上构建，做的其实都是同一件事：**给这条字节流定义「怎么分割、怎么解释」的规则**。

![HTTP 分层：应用层 HTTP 在传输层 TCP 之上，net.Socket 封装的是最下面的传输层](https://mdn.github.io/shared-assets/images/diagrams/http/overview/http-layers.svg)

回看《网络原理》系列的 TCP 篇，HTTP 请求本质就是一段文本：`GET /patients HTTP/1.1\r\nHost: ...\r\n\r\n`。`http` 模块的工作，就是当你在 `net.Socket` 上 `write` 出这段字节时，帮你把「请求行 + 请求头 + 空行 + 请求体」拆解成 `req.method`/`req.url`/`req.headers` 这样的结构化对象——这就是「把 TCP 字节流包装成 HTTP 语义」的全过程。

理解了这层，你就知道为什么「手写 HTTP 服务器」其实不难：底层不过是在 `net.createServer` 的 `socket.on('data')` 里按 `\r\n` 分割字符串。理解这一层，也是理解「Node 怎么一步步把字节变成业务」的关键入口。

> 💬 **面试官**：`net` 模块和 `http` 模块是什么关系？
>
> ✅ 标准答案：`net` 是 Node 对 TCP 连接的直接封装，`net.Socket` 提供的是原始字节流。`http` 构建在 `net` 之上，把这条字节流按 HTTP 报文格式（请求行/请求头/空行/请求体）解析成结构化的 `req`/`res` 对象，并负责反向把结构化响应序列化回字节流。`https` 是在 `tls` 之上、`ws` 是在 `http` 升级之上再叠加各自的协议语义。
>
> 🎁 加分答案：能现场描述「在 `net.createServer` 里手写一个最小 HTTP 服务器」的思路——`socket.on('data')` 拿到原始报文，按 `\r\n\r\n` 分割头和体，`write` 回 `HTTP/1.1 200 OK\r\n...`。能把这套讲出来，说明真的理解了分层。

### 4. worker_threads vs cluster：两者不是竞争关系

这是本篇最核心的一个辨析。先记住一句话：**`cluster` 解决「扩展请求处理吞吐量」，`worker_threads` 解决「不阻塞事件循环的重计算」**。

| 维度 | cluster | worker_threads |
|------|---------|----------------|
| 模型 | 多**进程**，每个子进程独立内存 + 独立事件循环 | 同一进程内的多**线程** |
| 内存 | 进程间隔离，互不共享 | 可通过 `SharedArrayBuffer` 共享内存 |
| 通信 | 进程间通信（IPC），需要序列化 | 消息传递或共享内存，线程内开销小 |
| 适合场景 | 多个独立处理 HTTP 请求的副本（水平扩展） | 一次性 CPU 密集计算（影像像素处理、批量哈希） |
| 隔离性 | 强（一个进程崩了不影响其他） | 弱（共享进程，一个线程崩溃可能拖垮进程） |

为什么 CPU 密集任务**必须**丢给 `worker_threads` 而不是主线程直接算？因为 **Node 主线程的事件循环是单线程的**。任何同步的重计算（未优化的大数据排序、复杂加密运算）都会**阻塞事件循环**——在计算完成前，这个进程处理不了任何其他请求。

`worker_threads` 把这类计算移到独立线程，主线程事件循环继续转，算完通过 `postMessage` 把结果送回。注意它和 `cluster` 不是二选一：生产架构里通常**两者同时存在**——`cluster` 在多核上开多个进程扛并发，每个进程内部再遇到 CPU 密集任务时用 `worker_threads` 挪出主线程。

### 5. child_process vs worker_threads：怎么选

这俩的边界很清晰，就一句话：**需要调用外部程序用 `child_process`，需要并行计算 JS 逻辑用 `worker_threads`**。

| 维度 | child_process | worker_threads |
|------|--------------|----------------|
| 本质 | 独立**操作系统进程**，可以是非 Node 程序 | 进程内**线程**，只能跑 JS/Node 代码 |
| 开销 | 大（要 fork 一个完整进程） | 小（同一进程内开线程） |
| 隔离性 | 最强（崩溃不影响主进程） | 弱 |
| 典型用途 | 调 `ffmpeg` 转码、`dcm2jpg` 影像格式转换 | 大批量哈希、像素级图像处理 |

`child_process.spawn` 还提供 `exec` 没有的流式读写能力，适合长进程和大输出；`exec` 会一次性缓冲 stdout（默认上限 200KB），只适合短命令。

### 6. url 的历史演进：为什么弃用 url.parse()

早期 Node 的 `url.parse()` 返回一个老式对象，字段命名和现代标准不一致。后来 Node 实现了 WHATWG 的 `URL` 类——这是**浏览器同款的标准 API**，行为跨环境一致。

新代码应优先用 `new URL()`。它带来的直接好处是「前端 API 可以直接搬进 Node」——`URLSearchParams` 在浏览器和 Node 里是同一个实现。`worker_threads` 的 `SharedArrayBuffer` 也是同理，和浏览器 Web Worker 的共享内存模型同源，都是「避免消息传递序列化开销」的解法。这是少数几个「前端经验能无缝迁移到后端」的知识点。

---

## 三、源码解析（重点代码，来源 nodejs/node 仓库）

> Node.js 源码地址：https://github.com/nodejs/node（本篇基于当前主分支 `lib/crypto.js`、`lib/internal/worker.js`、`lib/internal/cluster/primary.js`）

上一章讲的是「设计思路」，这一节贴出 Node 真实源码，验证前面每一处结论在代码里到底长什么样。

### 1. lib/crypto.js：Hash/Hmac 如何绑定 OpenSSL

`crypto` 模块本质是 OpenSSL 的 JS 绑定层。`createHash`/`createHmac` 最终都落到 `internal/crypto/hash` 里的 `Hash`/`Hmac` 类，再由 C++ 层调用 OpenSSL 的 `EVP_Digest*` 接口。JS 侧的关键是 `createHash` 工厂函数：

```javascript
function createHash(algorithm, options) {
  // 校验 algorithm 是否合法，并规范化（如 'SHA256' -> 'sha256'）
  algorithm = normalizeHashName(algorithm);
  validateString(algorithm, 'algorithm');

  // Hash 类内部持有 EVP_MD_CTX 上下文，通过 _binding 调 OpenSSL
  return new Hash(algorithm, options);
}
```

`Hash` 类继承自 `LazyTransform`（一个延迟初始化的 Transform 流），`update` 往内部缓冲喂数据，`digest` 一次性算出摘要并输出——所以 `createHash('sha256').update(data).digest('hex')` 里的 `update` 是可链式的、`digest` 是终结式的（调一次后 Hash 对象就「用完」了，不能重复 `digest`）。

### 2. lib/internal/worker.js：Worker 的消息通道与生命周期

`worker_threads` 的 `Worker` 类，核心是管理「主线程 ↔ 工作线程」之间的 `MessagePort` 消息通道，以及线程的生命周期：

```javascript
// Worker 构造的核心逻辑（简化）
class Worker extends EventEmitter {
  constructor(filename, options = {}) {
    super();
    // 创建双向 MessagePort 通道：主线程端 + 工作线程端
    const { port1, port2 } = new MessageChannel();

    // 主线程端 port1 用于收发消息
    this[kPort] = port1;
    this[kPort].on('message', (data) => {
      // 收到工作线程发来的消息，触发 'message' 事件
      this.emit('message', data);
    });

    // 把工作线程端 port2、workerData、启动脚本传给 C++ 层去创建线程
    this[kHandle] = new WorkerImpl(url, options, port2);
    // ...
  }

  postMessage(...args) {
    this[kPort].postMessage(...args);   // 本质是往 port1 发消息
  }
}
```

关键点：`Worker` 内部用 `MessageChannel`（一对 `MessagePort`）搭起消息通道——主线程拿 `port1`、工作线程拿 `port2`，两边 `postMessage` 就走这条通道。消息传递默认是「结构化克隆」拷贝，只有传 `SharedArrayBuffer` 或 `transfer` 时才走共享/零拷贝路径。

### 3. lib/internal/cluster/primary.js：fork 与 round-robin 分发

`cluster` 的主进程（primary）负责 `fork` 工作进程，并把连进来的 socket 按 round-robin 分发给各 worker：

```javascript
// 主进程接受连接后，用轮询索引把 socket 分发给对应 worker（简化）
function roundRobinHandle(key, address, port, addressType, backlog, fd) {
  // 建立句柄，监听连接
  // ...
  const handle = new SharedHandle(key, address, port, addressType, fd);
  this.handles.set(key, handle);

  const self = this;
  const distribute = (err, handle) => {
    // 每个 handle 维护一个 round-robin 计数器
    this.handles.get(key).add(handle, (err, handle) => {
      const worker = self.free[rr] ? self.free[rr] : null;
      // rr 是轮询索引，循环分配给空闲 worker
      if (worker) {
        rr = (rr + 1) % self.workers.length;
        // 把 socket 句柄发送给选中的 worker
        this.handles.get(key).distribute(worker, handle);
      }
    });
  };
}
```

`rr = (rr + 1) % workers.length` 就是 round-robin 的轮询逻辑——每个新连接依次交给下一个 worker，保证各 worker 负载大致均衡。这是 `cluster` 默认的 `SCHED_RR` 调度策略；旧版 `SCHED_NONE` 则交给操作系统内核在 `listen` 层面做负载均衡。

---

## 四、实践演示与验证

理解了原理与源码，这一节把两个综合实战完整写出来，外加一个 worker_threads 的阻塞对比实验。

### 1. 手写 WebSocket 服务端（packages/mini-ws）

不依赖 `ws` 库，用原生 `http` + `crypto` 手写一个最简 WebSocket 服务端。协议帧格式细节见《网络原理》系列第 06 篇，这里只关注「怎么用 Node API 实现」。

**第一块：握手升级**。客户端发来 `Upgrade: websocket` 请求，服务端算出 `Sec-WebSocket-Accept` 并返回 101 状态码完成握手：

```javascript
const http = require('http')
const crypto = require('crypto')

// WebSocket 协议约定的 magic GUID，握手时拼在 Sec-WebSocket-Key 后面
const MAGIC_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('这是一台 WebSocket 服务器\n')
})

// 监听 upgrade 事件：客户端要升级到 WebSocket 协议
server.on('upgrade', (req, socket) => {
  // 1. 客户端发来的 Sec-WebSocket-Key
  const key = req.headers['sec-websocket-key']

  // 2. 计算 Sec-WebSocket-Accept = base64( sha1(key + MAGIC_GUID) )
  const accept = crypto.createHash('sha1')
    .update(key + MAGIC_GUID)
    .digest('base64')

  // 3. 回 101 Switching Protocols 响应，完成握手
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n` +
    '\r\n'
  )
})
```

这个 `sha1(key + MAGIC_GUID)` 再 base64 的公式，就是 WebSocket 握手的核心——它让服务端证明「我读懂了你的升级请求」，同时防止被 HTTP 缓存误路由。

**第二块：帧解码**。握手后，客户端数据以「帧」为单位传输。一个服务端要能解析客户端发来的帧（FIN/opcode/mask/payload length/payload）：

```javascript
// 解析一个 WebSocket 帧（这里只处理客户端 -> 服务端、带 mask 的文本帧）
function decodeFrame(buffer) {
  const firstByte = buffer[0]
  const fin = (firstByte >> 7) & 1          // FIN 位
  const opcode = firstByte & 0x0f           // 操作码：1=文本 8=关闭 9=ping

  const secondByte = buffer[1]
  const masked = (secondByte >> 7) & 1      // 客户端帧必须带 mask

  let offset = 2
  let payloadLength = secondByte & 0x7f
  if (payloadLength === 126) {              // 扩展长度 2 字节
    payloadLength = buffer.readUInt16BE(offset)
    offset += 2
  } else if (payloadLength === 127) {       // 扩展长度 8 字节
    payloadLength = Number(buffer.readBigUInt64BE(offset))
    offset += 8
  }

  // 提取 mask key（4 字节），对 payload 做异或解码
  const maskKey = buffer.slice(offset, offset + 4)
  offset += 4

  const payload = buffer.slice(offset, offset + payloadLength)
  const decoded = Buffer.from(payload).map((byte, i) => byte ^ maskKey[i % 4])

  return { fin, opcode, payload: decoded }
}
```

客户端发来的每个帧都用 4 字节 `maskKey` 对 payload 做异或，这是 WebSocket 协议为了「防止代理缓存投毒」设计的。服务端 `data` 事件里拿到 Buffer 调 `decodeFrame` 就能得到明文。

**第三块：帧编码**。服务端回给客户端时**不需要 mask**（只有客户端→服务端才 mask），编码更简单：

```javascript
// 编码一个服务端 -> 客户端的文本帧（不带 mask）
function encodeFrame(payload) {
  const payloadBuf = Buffer.from(payload)
  let header

  if (payloadBuf.length < 126) {
    header = Buffer.from([0x81, payloadBuf.length])   // FIN + 文本帧 opcode=1
  } else if (payloadBuf.length < 65536) {
    header = Buffer.alloc(4)
    header[0] = 0x81
    header[1] = 126
    header.writeUInt16BE(payloadBuf.length, 2)
  } else {
    header = Buffer.alloc(10)
    header[0] = 0x81
    header[1] = 127
    header.writeBigUInt64BE(BigInt(payloadBuf.length), 2)
  }

  return Buffer.concat([header, payloadBuf])
}
```

`0x81` 是「FIN=1 + opcode=1（文本帧）」的合写。把 `encodeFrame` 的结果 `socket.write` 出去，客户端就能收到一条 WebSocket 消息。

### 2. worker_threads 阻塞对比实验

同一个 CPU 密集任务，对比「主线程同步算」和「丢给 worker_threads」两种方式下，主线程能否继续响应其他请求。

**主线程同步算（会阻塞）**：在请求处理函数里直接做重计算，事件循环被卡死，其他请求全部排队：

```javascript
const http = require('http')
const crypto = require('crypto')

// 模拟 CPU 密集：连续算 20 万次 sha256
function heavyCompute() {
  let hash = ''
  for (let i = 0; i < 200000; i++) {
    hash = crypto.createHash('sha256').update(`drug-${i}`).digest('hex')
  }
  return hash
}

http.createServer((req, res) => {
  if (req.url === '/heavy') {
    const result = heavyCompute()   // 同步重计算，阻塞事件循环
    res.end(result)
  } else {
    res.end('ok')
  }
}).listen(3000)

// 现象：请求 /heavy 期间，再请求 / 会卡住，直到 heavy 算完才有响应
```

**丢给 worker_threads（不阻塞）**：主线程把任务转发给工作线程，立即返回，事件循环继续转：

```javascript
const http = require('http')
const { Worker } = require('worker_threads')

http.createServer((req, res) => {
  if (req.url === '/heavy') {
    const worker = new Worker('./hash-worker.js', { workerData: { count: 200000 } })
    worker.on('message', (result) => res.end(result))   // 算完再响应
    worker.on('error', () => res.end('计算失败'))
    // 主线程没有阻塞，这里可以立即处理其他请求
  } else {
    res.end('ok')
  }
}).listen(3000)

// 现象：请求 /heavy 期间，再请求 / 会立刻得到 'ok'，互不影响
```

这个对比实验是「为什么 CPU 密集必须 worker_threads」最直观的证据——两种写法的差异，就藏在「主线程的事件循环有没有被同步计算占住」里。

### 3. 静态资源服务器（apps/his-api）

综合 `http`/`fs`/`path`/`crypto`，延续第 04 篇 I/O 知识，搭一个生产级的静态资源服务器，用「药品说明书 PDF/图片」场景验证。五个能力点逐一落地：

**① 目录穿越防护**：`path.normalize` 后校验是否逃出根目录，挡住 `../../etc/passwd` 这类攻击：

```javascript
const path = require('path')
const ROOT = path.resolve(__dirname, 'public')

function safeResolve(urlPath) {
  // 去掉查询串，只取路径部分
  const pathname = decodeURIComponent(urlPath.split('?')[0])
  // normalize 把 ../ 折叠成规范路径，再拼到根目录
  const fullPath = path.normalize(path.join(ROOT, pathname))
  // 关键校验：规范化后必须还在 ROOT 之内，否则拒绝
  if (!fullPath.startsWith(ROOT)) {
    throw new Error('目录穿越攻击被拦截')
  }
  return fullPath
}
```

为什么 `path.join(ROOT, '../../etc/passwd')` 能拿到根目录之外？因为 `join` 忠实保留了 `..` 的语义。所以必须 `normalize` 之后再校验 `startsWith(ROOT)`——这是防目录穿越的标准姿势。

**② Content-Type 映射**：按扩展名返回正确类型（不复用第三方 `mime` 库，内置一份精简映射）：

```javascript
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
}

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
}
```

**③ 流式返回 + ④ Range 断点续传**：用 `createReadStream` 支持 `bytes=start-end`，返回 `206 Partial Content`：

```javascript
const fs = require('fs')

function handleRange(req, res, filePath, stat) {
  const range = req.headers.range
  const total = stat.size

  // 没有 Range 头：整文件返回 200
  if (!range) {
    res.writeHead(200, {
      'Content-Type': getContentType(filePath),
      'Content-Length': total,
    })
    return fs.createReadStream(filePath).pipe(res)
  }

  // 解析 bytes=start-end
  const m = /bytes=(\d*)-(\d*)/.exec(range)
  const start = m[1] ? parseInt(m[1], 10) : 0
  const end = m[2] ? parseInt(m[2], 10) : total - 1

  // 范围非法，返回 416
  if (start >= total || end < start) {
    res.writeHead(416, { 'Content-Range': `bytes */${total}` })
    return res.end()
  }

  res.writeHead(206, {
    'Content-Type': getContentType(filePath),
    'Content-Range': `bytes ${start}-${end}/${total}`,
    'Content-Length': end - start + 1,
    'Accept-Ranges': 'bytes',
  })
  // createReadStream 的 start/end 正是「断点续传」的关键参数
  fs.createReadStream(filePath, { start, end }).pipe(res)
}
```

`fs.createReadStream(path, { start, end })` 直接定位到指定字节区间，这是第 04 篇讲的「可读流从指定位置读」在断点续传里的落地。浏览器下载 PDF 暂停后继续，发的就是带 `Range` 的请求。

**⑤ ETag / Cache-Control 缓存**：用 `crypto.createHash('md5')` 生成 ETag，配合 `If-None-Match` 做协商缓存：

```javascript
const crypto = require('crypto')

async function handle(req, res, filePath, stat) {
  // 强缓存：给药品说明书这类变化不频繁的资源设置短 TTL
  res.setHeader('Cache-Control', 'public, max-age=60')

  // 计算 ETag：文件内容摘要（这里简化用 size+mtime，生产可换 md5）
  const etag = `"${stat.size}-${stat.mtimeMs}"`
  res.setHeader('ETag', etag)

  // 协商缓存：命中则返回 304，不重复传体
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304)
    return res.end()
  }

  handleRange(req, res, filePath, stat)
}
```

`ETag` 是「文件内容的指纹」，客户端下次带 `If-None-Match` 来问「内容变了没」，没变就回 `304 Not Modified` 省掉传输——这正是第 04 篇 I/O 知识到「HTTP 缓存语义」的完整闭环。

---

## 五、参考资料

- https://nodejs.org/api/process.html
- https://nodejs.org/api/crypto.html
- https://nodejs.org/api/worker_threads.html
- https://nodejs.org/api/net.html
- https://nodejs.org/api/url.html
- https://nodejs.org/api/child_process.html
- https://nodejs.org/api/os.html
- https://nodejs.org/api/cluster.html
- https://github.com/nodejs/node（`lib/crypto.js`、`lib/internal/worker.js`、`lib/internal/cluster/primary.js`）

---

## 💡 面试核心问

- **`worker_threads` 和 `cluster` 的本质区别是什么？分别解决什么问题？**（进程 vs 线程；扩吞吐 vs 不阻塞重计算）
- **为什么 CPU 密集型计算不能直接在主线程做，必须用 `worker_threads`？**（事件循环单线程，同步重计算阻塞所有请求）
- **`child_process` 和 `worker_threads` 应该怎么选？**（外部程序 vs JS 并行计算）
- **`crypto.randomBytes()` 和 `Math.random()` 有什么区别？为什么安全场景不能用后者？**（密码学安全源 vs 伪随机）
- **`net` 模块和 `http` 模块是什么关系？**（net 是 TCP 字节流，http 在其上解析 HTTP 语义）
- **手写静态资源服务器，怎么防止目录穿越攻击？**（`path.normalize` + 校验 `startsWith(ROOT)`）
- **`Range` 请求断点续传涉及哪些请求头/响应头？服务端该怎么处理？**（`Range`/`Content-Range`/`Accept-Ranges` + `206` + `createReadStream({start,end})`）

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 面试频率 |
|--------|-----------|---------|
| 优雅退出 | `server.close()` 排空 + 超时兜底 + 最后 `exit`，不能硬杀 | ⭐⭐ 高频 |
| crypto 哈希 vs 加密 | 哈希单向（完整性）、加密双向（保密）、HMAC 带密钥（防篡改） | ⭐⭐⭐ 必考 |
| randomBytes vs Math.random | 密码学安全源 vs 伪随机（可预测，禁用） | ⭐⭐⭐ 必考 |
| net vs http | net 是 TCP 字节流，http 在其上解析 HTTP 语义 | ⭐⭐ 高频 |
| worker_threads vs cluster | 进程扩吞吐 / 线程不阻塞重计算，两者不竞争 | ⭐⭐⭐ 必考 |
| child_process vs worker_threads | 外部程序 vs JS 并行计算 | ⭐⭐ 高频 |
| 目录穿越防护 | `path.normalize` 后校验 `startsWith(ROOT)` | ⭐⭐⭐ 必考 |
| Range 断点续传 | `206` + `Content-Range` + `createReadStream({start,end})` | ⭐⭐ 高频 |

> 💡 记住这条主线：**进程怎么优雅退出（process）→ 数据怎么安全（crypto）→ 网络怎么分层（net/http）→ 多核怎么并行（os/worker_threads/cluster/child_process）**。核心 API 的每一步，都在把「操作系统和网络的能力」装进「Node 的运行时抽象」里。

---

## 📝 思考题

手写 WebSocket 服务端时，`encodeFrame` 里服务端回给客户端的帧**不带 mask**，而 `decodeFrame` 里客户端发来的帧**必须带 mask**。为什么协议要这样设计——只有客户端 mask、服务端不 mask？

提示：回想一下 WebSocket 握手为什么要算 `Sec-WebSocket-Accept`、要防止什么攻击。mask 的动机和「代理缓存投毒」有关：如果攻击者能控制一个伪造的 WebSocket 客户端发来的明文帧，让它恰好和某个 HTTP 请求的字节重叠，中间的代理就可能把它当成 HTTP 缓存内容。想想为什么「客户端 mask」能阻断这种攻击，而「服务端也 mask」却是多余的？

欢迎评论区写出你的答案 👇

---

> 🔖 这是「Node.js 全栈深度拆解」系列第 5 篇。上一篇：《Node.js I/O 体系：Buffer/Stream/path/fs 全解析与背压机制》；下一篇预告：《Web 认证体系：Cookie/Session/JWT/OAuth2 设计原理与安全实践》
>
> 前置基础扩展阅读：搜索关键词「Node.js 事件循环 宏任务 微任务」「Node.js 运行时 V8 libuv 架构」「Node.js I/O Buffer Stream 背压」「WebSocket 帧格式 握手」「HTTP Range 断点续传」

