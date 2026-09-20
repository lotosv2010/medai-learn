# 网络原理系列公众号文章大纲（系列 09）

> 所属系列：网络原理（对齐 `docs/plans/frontend-engineering-outline.md` 系列 09，承接 Node.js 全栈系列之后写）
> 写作原则：使用与实践 → 设计与原理 → 源码/规范解析 → 实践演示与验证 → 参考
> 目标读者：5-10 年前端或全栈经验，正在系统补齐网络协议底层原理，备战高级/专家岗面试
> 与其他系列的分工：本系列讲的是协议本身的原理（不绑定具体语言/运行时），是 Node.js 系列的前置地基。凡是"协议是什么、为什么这样设计"的内容都在本系列讲透；Node.js 系列不再重复协议理论，只讲"Node.js 怎么基于这些协议实现具体能力"——例如 WebSocket 的握手/帧格式/心跳原理在本系列第 06 篇讲，Node.js 系列「Node 核心 API 大全」篇只讲怎么用 `crypto`/`net`/`http` 模块实现一个 WebSocket 服务端；RESTful/GraphQL 的设计原则对比在本系列第 09 篇讲，Node.js 系列「GraphQL+Apollo」篇负责 Resolver 源码级机制和手写实现。

---

## 大纲修订说明（本次修订：结构重排，2026-09-11）

对本大纲进行结构性复审后，发现以下问题并已修正：

1. **篇章顺序违反知识依赖关系**：原顺序 HTTP(01)→TLS(02)→DNS(03)→TCP(04) 导致 01 篇讲 HTTP/2、HTTP/3 时大量前向引用尚未讲解的 TCP 握手、TLS 握手等概念。已调整为按协议栈自底向上排列：**DNS → TCP → TLS → HTTP**，读者读到 HTTP 篇时，DNS 解析、TCP 三次握手、TLS 握手都已经是学过的知识，篇内不再需要"详见后面篇章"这种前向引用。
2. **HTTP 篇信息过载、内容与标题不完全贴合**：原 01 篇把"HTTP 版本演进"（队头阻塞/多路复用/QUIC）和"HTTP 语义基础"（内容协商/状态码/方法安全性与幂等性）两个不同主题硬拼在一起，后者篇幅上几乎是独立一篇的量，与"HTTP 演进"这个标题所暗示的"版本迭代史"关联不大。已拆分为独立的第 05 篇《HTTP 语义基础》。
3. **错字修正**：原 WebSocket 篇"每个 WebS010cket 帧包含"笔误，已修正为"WebSocket"。
4. 全系列篇数由 9 篇调整为 **10 篇**，已同步更新总大纲 `docs/plans/frontend-engineering-outline.md`。
5. 顺带修正一处过时的跨系列引用：原跨域与安全篇提到"呼应 Node.js 系列 07 篇认证体系"，Node.js 大纲修订后认证体系已是第 06 篇，已同步改正。

---

## 系列定位

**「网络原理深度拆解」系列**

- 篇数：10 篇
- 核心主线：DNS 域名解析 → TCP 传输层机制 → HTTPS/TLS 安全传输 → HTTP 协议演进 → HTTP 语义基础（内容协商/状态码/方法语义）→ WebSocket 实时通信 → 跨域与浏览器安全 → HTTP 缓存体系 → API 设计范式（RESTful vs GraphQL）→ 反向代理与负载均衡——按"协议栈自底向上"排列，每篇涉及的底层机制都已在前面篇章讲过，不再需要前向引用
- 内容结构：五段式（使用与实践 → 设计与原理 → 源码/规范解析 → 实践演示与验证 → 参考）——协议类文章的"源码/规范解析"部分以 RFC 规范原文 + 权威开源实现（如 Chromium/Node.js 网络栈）为主，"实践演示与验证"部分侧重用 Node.js 原生 `net`/`tls`/`dgram` 模块还原协议关键步骤，重在理解而非产出独立工程
- 特色：每篇 3-5 个「面试官会问」；示例统一沿用医疗场景命名（药品/处方/患者/医院管理系统 HIS）；涉及可与后续 Node.js 系列对照的知识点显式标注「对比 Node.js 实现」

---

## 文章规划总览

| 编号 | 标题 | 核心主题 | 状态 |
|------|------|----------|------|
| 01 | DNS 解析：递归查询全流程/CDN 调度原理/DNS-over-HTTPS 隐私保护（面试收藏级） | DNS | ⬜ 待写 |
| 02 | TCP 深度：三次握手四次挥手/拥塞控制四阶段/滑动窗口流量控制（面试收藏级） | TCP | ⬜ 待写 |
| 03 | HTTPS 与 TLS：握手过程/证书信任链/HSTS/Certificate Pinning 安全实践（面试收藏级） | HTTPS/TLS | ⬜ 待写 |
| 04 | HTTP 演进：HTTP/1.1 队头阻塞/HTTP/2 多路复用/HTTP/3+QUIC 深度拆解（面试收藏级） | HTTP 演进 | ⬜ 待写 |
| 05 | HTTP 语义基础：内容协商/状态码语义/请求方法安全性与幂等性（面试收藏级） | HTTP 语义 | ⬜ 待写 |
| 06 | WebSocket 深度：握手协议/帧格式/心跳保活机制/对比 SSE（面试收藏级） | WebSocket | ⬜ 待写 |
| 07 | 跨域与安全：CORS 机制/CSRF/XSS/CSP/安全响应头全解（面试收藏级） | 跨域安全 | ⬜ 待写 |
| 08 | HTTP 缓存体系：强缓存/协商缓存/Service Worker 缓存策略实战（面试收藏级） | 缓存体系 | ⬜ 待写 |
| 09 | RESTful 与 GraphQL：设计原则对比/N+1 问题溯源/DataLoader 思路（面试收藏级） | API 设计 | ⬜ 待写 |
| 10 | 反向代理与负载均衡：正向/反向代理原理/虚拟主机 Host 路由/负载均衡算法/防盗链实战（面试收藏级） | 反向代理/负载均衡 | ⬜ 待写 |

---

## 各篇详细大纲

### 第 01 篇：DNS 解析：递归查询全流程/CDN 调度原理/DNS-over-HTTPS 隐私保护

**副标题**：从浏览器输入域名到拿到 IP 的完整路径、DNS 如何为 CDN 做就近调度、明文查询的隐私问题与加密方案

#### 一、使用与实践

- `nslookup`/`dig example.com` 命令查看域名解析结果与耗时
- `dig +trace example.com` 观察从根域名服务器开始的完整递归查询链路
- 浏览器 DNS 缓存、操作系统 DNS 缓存、`ipconfig /flushdns`（Windows）清理本地缓存
- 用 `dig` 对比同一个 CDN 域名在不同地理位置解析出的 IP 是否不同，直观感受"就近调度"
- 在 Chrome/Firefox 设置里开启 DNS-over-HTTPS（DoH），观察网络请求变化

#### 二、设计与原理

- **DNS 解析的完整链路**：浏览器缓存 → 操作系统缓存 → 本地 DNS 服务器（通常是 ISP 提供或用户手动配置如 8.8.8.8）→ 如果本地 DNS 服务器没有缓存命中，向根域名服务器查询顶级域（`.com`）服务器地址 → 向顶级域服务器查询权威域名服务器地址 → 向权威域名服务器查询最终 IP——这个过程叫"递归查询”（客户端只发一次请求，本地 DNS 服务器代替客户端完成后续所有查询）
- **递归查询与迭代查询的区别**：客户端对本地 DNS 服务器发起的是"递归查询”（一次请求，等待最终结果）；本地 DNS 服务器对上层服务器（根/顶级域/权威）发起的是"迭代查询”（每次只拿到下一级服务器地址，自己逐级向下问）——理解这个分工是回答"DNS 查询在哪里发生了递归"这类问题的关键
- **TTL 与缓存层级**：DNS 记录带有 TTL（Time To Live），各级缓存（浏览器/OS/本地 DNS 服务器）根据 TTL 决定缓存多久后失效重新查询——这是"修改了域名解析记录，为什么全网生效需要一段时间"的直接原因
- **CDN 如何利用 DNS 做就近调度**：CDN 服务商的权威 DNS 服务器会根据发起查询的本地 DNS 服务器的地理位置/网络线路，动态返回离用户最近的边缘节点 IP——这也是不同地区 `dig` 同一个 CDN 域名会得到不同 IP 的原因；这种基于 DNS 的调度是"GSLB（全局负载均衡）”最常见的实现方式之一
- **DNS 的隐私与安全问题**：传统 DNS 查询是明文 UDP 传输，运营商或中间网络设备可以看到用户访问了哪些域名（甚至篡改返回错误的 IP，即 DNS 污染/劫持）；**DNS-over-HTTPS（DoH）**和 **DNS-over-TLS（DoT）**把 DNS 查询封装进加密的 HTTPS/TLS 连接，防止查询内容被窃听或篡改，代价是引入了额外的连接建立开销，且集中把 DNS 查询交给少数几个大型 DoH 服务商（如 Cloudflare/Google），存在"隐私集中化"的新争议
- 对比 Node.js 实现：Node.js `dns` 模块的 `dns.lookup()`（走操作系统的解析器，会用到本地 hosts 文件和系统缓存）与 `dns.resolve()`（直接发起网络查询，不查 hosts 文件）是两条不同的代码路径，这是"同一个域名在 Node.js 里用不同 API 解析结果不一致"这类问题的根源，也是 Node.js 系列「核心 API 大全」篇里 `dns` 小节要重点区分的地方

#### 三、源码解析（重点参考 RFC 规范）

1. DNS 报文格式与递归查询流程：RFC 1035 — 报文结构、查询类型（A/AAAA/CNAME/NS）
2. DNS-over-HTTPS 规范：RFC 8484 — DoH 请求如何把 DNS 查询封装进 HTTP GET/POST
3. Node.js `dns` 模块：`lib/dns.js`（nodejs/node 仓库）— `lookup`（走 libuv 的 `getaddrinfo`，使用系统解析器）与 `resolve`（走 `c-ares` 库直接发起网络查询）的实现路径差异

#### 四、实践演示与验证

用 Node.js `dgram`（UDP）模块手写一个极简的 DNS 查询客户端：手动构造符合 RFC 1035 格式的查询报文（不依赖 `dns` 模块），发送到 `8.8.8.8:53`，解析返回的二进制响应报文里的 IP 地址字段，直观理解"DNS 本质是跑在 UDP 之上的一个简单二进制协议"。

#### 五、参考
- https://www.rfc-editor.org/rfc/rfc1035
- https://www.rfc-editor.org/rfc/rfc8484
- https://nodejs.org/api/dns.html

**面试核心问**：
- DNS 递归查询的完整链路是怎样的？递归查询和迭代查询的区别是什么？
- 修改了 DNS 记录，为什么生效有延迟？和什么参数有关？
- CDN 是怎么利用 DNS 实现"就近调度"的？
- DNS 明文查询有什么安全隐患？DoH/DoT 是怎么解决的？
- Node.js 的 `dns.lookup` 和 `dns.resolve` 有什么区别？

---

### 第 02 篇：TCP 深度：三次握手四次挥手/拥塞控制四阶段/滑动窗口流量控制

**副标题**：连接建立与断开的状态机、拥塞控制如何应对网络拥塞、滑动窗口如何做流量控制

#### 一、使用与实践

- 用 Wireshark 抓包观察一次真实 TCP 连接的三次握手、数据传输、四次挥手完整过程
- `netstat -an` 查看当前连接的 TCP 状态（`ESTABLISHED`/`TIME_WAIT`/`CLOSE_WAIT`）
- Node.js `net` 模块创建 TCP 服务端/客户端的基本用法，观察 `socket.on('connect')`/`socket.on('close')` 事件
- 服务器出现大量 `TIME_WAIT` 或 `CLOSE_WAIT` 连接堆积的常见排查思路
- 大文件传输场景下观察 TCP 传输速率随时间的变化曲线，理解拥塞控制的实际效果

#### 二、设计与原理

- **三次握手**：客户端 SYN（携带初始序列号 seq=x）→ 服务端 SYN+ACK（确认收到，携带自己的初始序列号 seq=y，ack=x+1）→ 客户端 ACK（ack=y+1）——目的是双方同时确认"我能发、我能收”，并同步各自的初始序列号（后续所有数据包的序号都以此为基准，用于保证数据按序到达和丢包重传）
- **为什么两次握手不够**：如果只有两次握手，服务端发出 SYN+ACK 后就认为连接建立，但服务端无法确认自己发出的 ACK 客户端是否真的收到——如果这个包在网络中丢失或延迟，客户端可能认为连接还没建立，而服务端已经开始等待数据，会造成资源浪费甚至历史遗留的重复请求包被误认为新连接（"SYN 洪水”攻击也利用了这个不对称性）
- **四次挥手为什么比握手多一次**：TCP 是全双工的，两个方向的数据流独立关闭。主动关闭方发 FIN 表示"我这边没有数据要发了”，但被动方可能还有数据没发完，所以先回一个 ACK 确认收到 FIN，等自己的数据也发完后再单独发一个 FIN——这就是四次挥手，而不能像建立连接时那样把中间两步合并
- **`TIME_WAIT` 状态存在的意义**：主动关闭方在发出最后一个 ACK 后不会立刻释放连接，而是进入 `TIME_WAIT` 状态等待 2 个 MSL（Maximum Segment Lifetime）——这是为了确保这个最后的 ACK 如果丢失，被动方重发的 FIN 还能被正确处理（重新回复 ACK），避免连接异常；生产环境如果 `TIME_WAIT` 连接堆积过多，通常是短连接频繁创建销毁导致，可以通过连接复用（keep-alive）缓解
- **拥塞控制四个阶段**（重点）：慢启动（Slow Start，拥塞窗口从很小的初始值指数级增长，直到达到阈值）→ 拥塞避免（Congestion Avoidance，超过阈值后改为线性增长，更谨慎地探测网络容量）→ 快速重传（Fast Retransmit，收到 3 个重复 ACK 立即重传丢失的包，不等超时）→ 快速恢复（Fast Recovery，快速重传后不直接回到慢启动，而是把拥塞窗口减半后继续线性增长，避免吞吐量骤降）——这套机制让 TCP 能够在不知道全局网络状况的情况下，通过"发送方视角能观察到的丢包/延迟信号"自适应地逼近网络实际承载能力
- **滑动窗口与流量控制**：滑动窗口本质是接收方通过 TCP 头部的 `Window Size` 字段告诉发送方"我还能接收多少数据”，发送方据此控制未确认数据的发送量，防止发送速度超过接收方处理能力——这是"流量控制”（保护接收方），和拥塞控制（保护网络整体）是两个不同维度的问题，容易被混淆
- 对比 Node.js 实现：Node.js `net.Socket` 对象在遇到接收方处理不过来时同样会体现"背压”（写入缓冲区堆积、`write()` 返回 `false`），这和 TCP 层的滑动窗口流量控制是两个不同抽象层级但目标一致的机制——理解 TCP 层的流量控制有助于理解 Node.js Stream 背压设计为什么要采用类似的"暂停/恢复”思路（呼应 Node.js 系列 04 篇 I/O 体系）

#### 三、源码解析（重点参考 RFC 规范）

1. TCP 状态机与连接管理：RFC 9293（TCP 现行规范，取代 RFC 793）— 连接建立/关闭状态转换图
2. 拥塞控制算法：RFC 5681（TCP Congestion Control）— 慢启动/拥塞避免/快速重传/快速恢复的具体算法定义
3. Node.js `net` 模块 TCP Socket 封装：`lib/net.js`（nodejs/node 仓库）概览级介绍 `Socket` 类对底层 libuv TCP handle 的封装

#### 四、实践演示与验证

用 Node.js `net` 模块手写一个 TCP 客户端/服务端，服务端故意延迟处理并读取 socket 的 `writableLength`，观察当客户端发送速度远超服务端处理速度时，Node.js 层面表现出的"背压”现象；配合 Wireshark 同步抓包，对照观察系统层面 TCP 窗口大小的变化，把"应用层背压"和"传输层滑动窗口"两个层级的现象关联起来看。

#### 五、参考
- https://www.rfc-editor.org/rfc/rfc9293
- https://www.rfc-editor.org/rfc/rfc5681
- https://nodejs.org/api/net.html

**面试核心问**：
- 为什么建立连接需要三次握手，两次不够吗？
- 为什么断开连接需要四次挥手，而不是像建立连接一样三次？
- `TIME_WAIT` 状态存在的意义是什么？生产环境大量 `TIME_WAIT` 堆积说明什么问题？
- 拥塞控制分哪几个阶段？慢启动和拥塞避免的区别是什么？
- 滑动窗口的流量控制和拥塞控制是同一个机制吗？分别保护的是谁？

---

### 第 03 篇：HTTPS 与 TLS：握手过程/证书信任链/HSTS/Certificate Pinning 安全实践

**副标题**：非对称加密协商密钥、对称加密传输数据、证书信任链验证、常见 HTTPS 安全加固手段

#### 一、使用与实践

- 用 `openssl s_client -connect example.com:443` 手动查看一次 TLS 握手的完整过程和使用的加密套件
- 浏览器地址栏证书图标查看证书详情：颁发者、有效期、加密算法
- Node.js `https` 模块创建 HTTPS 服务端，加载自签名证书用于本地开发（并解释为什么浏览器会警告）
- 用 Charles 抓包调试 HTTPS 流量：安装 Charles 根证书到系统信任列表，让 Charles 扮演受信任的中间人，客户端与 Charles 之间、Charles 与真实服务端之间分别建立两段独立的 TLS 连接，从而在中间实现明文可读
- `Strict-Transport-Security` 响应头（HSTS）的配置与效果：强制浏览器后续都用 HTTPS 访问
- 医院 HIS 系统对接第三方检验设备接口时，如何用 `Certificate Pinning` 防止中间人伪造证书攻击

#### 二、设计与原理

- **为什么用混合加密模式**：非对称加密（RSA/ECDHE）计算开销大，不适合直接加密大量传输数据；对称加密（AES）速度快但双方需要提前共享同一个密钥——HTTPS 的做法是先用非对称加密安全地协商出一个对称密钥，后续所有数据传输都用这个对称密钥
- **TLS 1.2 四次握手概述**：① 客户端 Hello（提议加密套件列表、随机数 client_random）→ ② 服务端 Hello（选定加密套件、随机数 server_random）+ 发送证书 + 如果是 ECDHE 还会发送临时公钥 → ③ 客户端验证证书，用服务端公钥加密预主密钥（pre-master secret）发给服务端（RSA 密钥交换），或直接用 ECDHE 协议在双方各生成临时密钥对后推算出共享密钥——两端分别用 client_random + server_random + 预主密钥推算出相同的会话密钥 → ④ 双方发送 Finished 消息确认握手完成，后续用会话密钥对称加密通信
- **TLS 1.3 的改进**：握手从 4 步压缩为 2 步，废弃了 RSA 密钥交换（不再支持非前向保密的密钥协商），强制使用前向保密的 ECDHE，握手延迟减少 1 个 RTT；支持 0-RTT 重连（会话恢复时首次请求可以附带加密数据），但要理解 0-RTT 有重放攻击风险，只适合幂等请求
- **证书信任链**：浏览器/操作系统内置一批受信任的根 CA 证书；网站的叶证书通常由中间 CA 签发，中间 CA 由根 CA 签发，形成信任链——浏览器验证时从叶证书开始逐级验证签名，直到找到一个内置信任的根 CA 即为合法；自签名证书绕过了这条链，所以浏览器会弹警告
- **前向保密（Forward Secrecy）**：使用 ECDHE 等"每次握手都生成临时密钥"的算法，即使服务端私钥未来被泄漏，攻击者也无法解密过去记录下的加密流量（因为临时密钥已销毁）；而 RSA 密钥交换不具备这个属性，是 TLS 1.3 废弃它的核心原因
- **HSTS 的工作原理**：服务端响应头 `Strict-Transport-Security: max-age=31536000; includeSubDomains` 告知浏览器"接下来 365 天内，对这个域名的所有请求都必须走 HTTPS"，浏览器会缓存这个指令，即使用户输入 `http://` 也会在浏览器层面直接升级，不发出实际的 HTTP 请求——这防止了第一次访问时可能被中间人降级攻击的窗口期（但只有第一次访问过之后 HSTS 才生效，HSTS Preload List 是一个被主流浏览器预置的域名列表，解决"首次访问"问题）
- **Certificate Pinning**：客户端（通常是移动端 App 或内部服务）预置了目标服务器证书的哈希（或公钥哈希），在 TLS 握手时比对服务端实际证书是否与预置的哈希一致，不一致则拒绝连接——可有效对抗企业内网抓包工具（如 Charles）伪装成受信任中间人
- 对比 Node.js 实现：Node.js `tls` 模块的 `tls.createServer()`、`tls.createSecureContext()`，以及 `https` 模块如何在 TCP 连接上封装 TLS 握手——这些是 Node.js 系列「核心 API 大全」篇 `net`/`tls` 小节的直接前置知识

#### 三、源码解析

1. TLS 1.3 握手流程：RFC 8446 — 握手消息序列、密钥派生函数（HKDF）、0-RTT 重连的安全注意事项
2. X.509 证书格式与信任链：RFC 5280 — SubjectPublicKeyInfo/Issuer/Validity 字段结构，浏览器路径验证算法
3. Node.js `tls` 模块：`lib/tls.js`（nodejs/node 仓库）概览级介绍 `TLSSocket` 如何在 `net.Socket` 上叠加 TLS 状态机

#### 四、实践演示与验证

用 `openssl` 命令行工具完整走一遍：生成根 CA、用根 CA 签发中间 CA、用中间 CA 签发服务端叶证书；启动 Node.js `https` 服务端加载该三级证书链；用 Node.js `https` 客户端指定 `ca` 选项信任根 CA，成功建立 TLS 连接，验证"证书信任链验证"的完整路径；再修改服务端证书的某个字段使其签名失效，观察客户端抛出的具体 TLS 错误类型，理解"哪一步验证失败会产生哪种错误"。

#### 五、参考
- https://www.rfc-editor.org/rfc/rfc8446
- https://www.rfc-editor.org/rfc/rfc5280
- https://nodejs.org/api/tls.html

**面试核心问**：
- HTTPS 为什么要用"混合加密"而不直接用非对称加密传数据？
- TLS 1.2 和 TLS 1.3 握手的主要区别是什么？TLS 1.3 为什么废弃了 RSA 密钥交换？
- 什么是前向保密？ECDHE 怎么做到前向保密而 RSA 密钥交换做不到？
- 证书信任链是怎么工作的？自签名证书为什么浏览器会警告？
- HSTS 解决了什么问题？它有什么局限性（首次访问时有什么风险）？
- Certificate Pinning 在什么场景下使用？它能防御哪类攻击？

---

### 第 04 篇：HTTP 演进：HTTP/1.1 队头阻塞/HTTP/2 多路复用/HTTP/3+QUIC 深度拆解

**副标题**：从文本协议到二进制分帧、从队头阻塞到多路复用、从 TCP 到 QUIC 的传输层革命

> 本篇是基于 01~03 篇（DNS→TCP→TLS）讲完之后才写的。HTTP/2 里 TLS 握手、HTTP/3 里 QUIC 与 TCP 的对比、以及 HTTP/1.1 的持久连接建立在 TCP 之上——这些背景知识读者在此处均已掌握，不再需要前向引用。

#### 一、使用与实践

- 用 Chrome DevTools Network 面板的 Protocol 列观察一次请求实际使用的协议版本（`http/1.1`/`h2`/`h3`）
- `curl --http1.1`/`curl --http2`/`curl --http3` 强制指定协议版本发起请求对比响应头差异
- Node.js `http`/`http2` 模块分别创建服务端的基本用法差异
- Nginx/CDN 开启 HTTP/2、HTTP/3 的常见配置项（`listen 443 ssl http2;`）
- 观察医院 HIS 系统里"一次页面加载同时请求患者信息、处方列表、检验报告"三个接口，在 HTTP/1.1 与 HTTP/2 下网络面板瀑布图的差异

#### 二、设计与原理

- **HTTP/1.1 的队头阻塞**：即使开启了持久连接（`Connection: keep-alive`）和管道化，同一个 TCP 连接上的请求必须严格按顺序返回响应——前一个请求没处理完，后续请求即使已经处理好也要排队。浏览器为单个域名限制并发连接数（通常 6 个）以及"域名分片"这类优化手段，根本原因就在于此
- **HTTP/2 的核心改进——二进制分帧与多路复用**：HTTP/2 把每个请求/响应拆分成多个"帧"（frame），不同请求的帧可以在同一个 TCP 连接上交错发送，接收端根据帧头的 stream ID 重新组装——这让同一连接上的多个请求真正并行处理，从应用层彻底解决了 HTTP/1.1 的队头阻塞；同时头部压缩（HPACK）减少了重复头部字段占用的带宽
- **HTTP/2 依然存在的队头阻塞**：多路复用解决了应用层的队头阻塞，但 HTTP/2 仍然跑在单个 TCP 连接上——TCP 连接发生丢包时，TCP 的可靠传输机制要求丢失的包重传后后续所有数据才能被上层处理，这是"传输层的队头阻塞"，HTTP/2 无法解决
- **HTTP/3 与 QUIC**：HTTP/3 把底层传输协议从 TCP 换成基于 UDP 的 QUIC。QUIC 在 UDP 之上重新实现了可靠传输、拥塞控制、多路复用——关键区别是 QUIC 的多路复用按 stream 独立管理，一个 stream 丢包只影响这一个 stream，不会阻塞其他 stream；QUIC 还内置了 TLS 1.3，握手和加密协商合并进行，减少了额外的往返延迟（0-RTT 重连时延迟更低）
- **连接迁移**：QUIC 用连接 ID 而不是 TCP 的四元组（源 IP/端口 + 目的 IP/端口）标识连接，切换网络（如从 WiFi 切到移动网络）时连接可以不中断地迁移，这是移动端场景 HTTP/3 相比 HTTP/2 的额外优势
- 对比 Node.js 实现：Node.js `http2` 核心模块提供了 `Http2Session`/`Http2Stream` 抽象，对应"一个连接多个流"的模型；HTTP/3/QUIC 在 Node.js 中支持情况随版本更新，实际写作时需按当时最新版核实

#### 三、源码解析

1. HTTP/2 二进制分帧格式：RFC 9113 第 4-6 章 — 帧头结构（长度/类型/标志/流标识符）、`HEADERS`/`DATA`/`SETTINGS` 帧的作用
2. QUIC 传输协议：RFC 9000 — 连接建立、stream 多路复用、连接迁移的规范定义
3. Node.js `http2` 模块：`lib/internal/http2/core.js`（nodejs/node 仓库）— `Http2Session` 如何管理多个 `Http2Stream`

#### 四、实践演示与验证

用 Node.js 原生 `net` 模块（TCP 层）手写一个能演示"队头阻塞"的极简 HTTP/1.1 服务器：故意让第一个请求的处理延迟 3 秒，观察同一连接上排在后面、本可以立即返回的第二个请求也被迫等待；再用 Node.js `http2` 模块实现同样的场景，验证多路复用下第二个请求不受影响提前返回。

#### 五、参考
- https://www.rfc-editor.org/rfc/rfc9113
- https://www.rfc-editor.org/rfc/rfc9000
- https://developer.mozilla.org/zh-CN/docs/Web/HTTP

**面试核心问**：
- HTTP/1.1 的队头阻塞具体是怎么产生的？为什么浏览器要限制单域名并发连接数？
- HTTP/2 是怎么用多路复用解决应用层队头阻塞的？它还存在队头阻塞吗？
- HTTP/3 为什么要换成基于 UDP 的 QUIC？QUIC 是怎么解决传输层队头阻塞的？
- QUIC 的连接迁移能力解决了什么实际问题？

---

### 第 05 篇：HTTP 语义基础：内容协商/状态码语义/请求方法安全性与幂等性

**副标题**：压缩算法与语言协商如何工作、重定向与认证状态码的精确语义、安全方法与幂等方法的设计契约

> 从原「HTTP 演进」篇拆分而来：版本演进（队头阻塞/多路复用/QUIC）讲的是"HTTP 怎么传输"，本篇讲的是"HTTP 报文本身的语义约定"，是两个独立的知识维度，合在一篇会互相冲淡，拆开后各自更聚焦。

#### 一、使用与实践

- `curl --compressed example.com` 观察请求头自动带上 `Accept-Encoding: gzip, deflate, br`，对比响应头 `Content-Encoding` 实际选中的算法
- `curl -H "Accept-Language: zh-CN,en;q=0.9" example.com` 观察服务端按语言偏好返回内容
- 用浏览器 DevTools 观察一次登录失效请求返回 401、一次越权访问请求返回 403 的实际响应头差异
- 用 Postman 分别发起 301/302/307/308 重定向请求，观察浏览器/客户端对请求方法和请求体的处理差异
- 医院 HIS 系统"处方提交"接口设计评审：确认 `POST`（非幂等）与 `PUT /prescriptions/:id`（幂等更新）的语义边界

#### 二、设计与原理

- **内容协商三兄弟**：HTTP 允许客户端在请求头里声明自己的偏好，服务端从多个可用表示里选出最匹配的一种返回，这套机制统称"内容协商"——`Accept-Encoding: gzip, br` 声明客户端能解压的压缩格式；`Accept-Language: zh-CN,en;q=0.9` 声明语言偏好及优先级权重；`User-Agent` 声明客户端类型。三者的设计动机相同，但各自的权衡与局限差异很大
- **压缩算法选型：gzip vs Brotli（br）**（重点）：gzip 基于 DEFLATE 算法（LZ77 字典压缩 + 哈夫曼编码），压缩率适中、压缩/解压速度快、CPU 开销低、几乎所有客户端都兼容；Brotli（br）使用更大的静态字典（内置了大量 Web 常见文本模式）加上更优的熵编码，对文本类资源压缩率通常比 gzip 高 15%-25%，但压缩耗时明显更长——**能提前离线压缩好、一次压缩多次复用的静态资源**（如打包后的 JS/CSS 产物）优先用 br 的最高压缩级别；**每次请求都需要实时生成的动态响应**（如接口返回的 JSON）更倾向 gzip 或 br 的低压缩级别，避免实时压缩的 CPU 开销抵消传输时间节省；CDN/Nginx 层通常两者都配置，按客户端 `Accept-Encoding` 声明自动选择
- **User-Agent 嗅探的局限与 Client Hints 的设计动机**：`User-Agent` 字符串历史上用于识别客户端类型，但存在两个根本问题：① UA 字符串可以被客户端随意伪造；② UA 字符串格式历史遗留问题严重，服务端嗅探解析逻辑复杂且容易随浏览器版本更新失效——**User-Agent Client Hints** 提案反转了这个模式：客户端按服务端请求（`Accept-CH` 响应头声明需要哪些信息）主动上报结构化的能力信息（如 `Sec-CH-UA`），且默认只上报低熵信息，高熵信息需要显式申请，这也缓解了"UA 字符串是一种设备指纹追踪手段"的隐私争议
- **重定向状态码语义**：301（Moved Permanently，永久重定向）与 302（Found，临时重定向）是最基础的一对；307（Temporary Redirect）和 308（Permanent Redirect）是它们的严格版本——301/302 在规范上允许浏览器在重定向时把 POST 改成 GET（历史遗留的不严谨行为），307/308 则明确要求**必须保持原始请求方法和请求体不变**，这是"提交表单时的重定向该用 307 还是 302"这类问题的关键区分点
- **304 与协商缓存的关系**：304 Not Modified 不是一个独立的缓存机制，而是协商缓存校验后的结果状态码——服务端比对请求头里的 `If-None-Match`/`If-Modified-Since` 后发现内容未变，返回 304 且不带响应体（详见 08 篇缓存体系）
- **401 vs 403**：401 Unauthorized 语义是"未认证"（没有提供有效的身份凭证，或凭证已过期/无效，通常应配合 `WWW-Authenticate` 响应头）；403 Forbidden 语义是"已认证但无权限"——这一区分是设计需要登录+权限分级的系统（如医院 HIS 不同科室医生的数据访问权限）时的接口设计规范基本要求
- **请求方法的安全性（Safe）与幂等性（Idempotent）**：安全方法指该方法不会对服务端资源产生副作用（只读），幂等方法指多次重复执行和执行一次的效果相同——GET/HEAD/OPTIONS 既安全又幂等；PUT/DELETE 幂等但不安全（会修改资源，但重复执行结果一致）；POST 既不安全也不幂等（每次提交都可能创建新资源，重复提交会产生副作用，如重复提交处方可能导致重复开单）——这组概念是 09 篇 RESTful 设计"用 HTTP 方法表达操作语义"的理论基础，也是"为什么幂等的接口更适合安全重试"这类高可用设计题的答案来源

#### 三、源码解析（重点参考 RFC 规范）

1. 内容协商机制：RFC 9110 第 12 章 — `Accept`/`Accept-Encoding`/`Accept-Language` 的权重（`q` 参数）匹配算法
2. 状态码语义：RFC 9110 第 15 章 — 3xx/4xx 各状态码的规范定义
3. 方法安全性与幂等性：RFC 9110 第 9 章 — 各方法的 Safe/Idempotent 属性表

#### 四、实践演示与验证

用 Node.js `zlib` 模块（`zlib.createGzip()`/`zlib.createBrotliCompress()`）包一个响应处理逻辑：读取请求头 `Accept-Encoding`，按"客户端支持 br 则优先用 br，否则降级到 gzip，都不支持则不压缩"的逻辑选择对应的 Transform 流，把响应体数据 `pipe` 经过压缩流后再写入 `res`，并正确设置 `Content-Encoding` 响应头；用 `curl --compressed` 和浏览器分别验证能正确解压拿到原始内容。压缩流本身是 Stream/Transform 的一个具体应用（Stream API 原理见 Node.js 系列 04 篇），本篇聚焦"为什么选这个算法、协议层怎么协商"。

#### 五、参考
- https://www.rfc-editor.org/rfc/rfc9110
- https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Content_negotiation

**面试核心问**：
- gzip 和 br 该怎么选？内容协商具体协商的是什么？
- UA 嗅探有什么局限？User-Agent Client Hints 是怎么设计来解决这些局限的？
- 304 状态码和强缓存是什么关系？
- 307 和 302 的本质区别是什么？为什么表单重定向要考虑这个区别？
- 401 和 403 分别表示什么语义？
- 什么是请求方法的安全性和幂等性？POST/GET/PUT/DELETE 分别属于哪一类？

---

### 第 06 篇：WebSocket 深度：握手协议/帧格式/心跳保活机制/对比 SSE

**副标题**：从一次 HTTP 请求升级为持久连接、二进制帧格式设计、心跳保活与断线重连、与 SSE 的选型对比

#### 一、使用与实践

- 浏览器 `WebSocket` 对象基本用法：`new WebSocket(url)`，`onopen`/`onmessage`/`onclose`/`onerror` 事件
- Chrome DevTools Network 面板查看 WebSocket 连接的 `101 Switching Protocols` 响应与后续帧内容（Frames 面板）
- 医院 HIS 系统里"检验报告完成实时推送给医生工作台"的 WebSocket 应用场景
- `EventSource`（SSE）基本用法对比：单向服务端推送场景下的另一种选择
- 心跳保活的前端实现：定时发送 `ping` 消息，服务端未响应超过阈值判定连接已断开并触发重连

#### 二、设计与原理

- **WebSocket 握手过程**（重点）：WebSocket 连接以一次普通的 HTTP 请求开始，客户端在请求头里携带 `Upgrade: websocket`、`Connection: Upgrade`、`Sec-WebSocket-Key`（客户端随机生成的 base64 字符串）；服务端返回 `101 Switching Protocols`，并在 `Sec-WebSocket-Accept` 字段返回"客户端 Key 拼接一个固定 GUID（`258EAFA5-E914-47DA-95CA-C5AB0DC85B11`）后取 SHA-1 哈希再 base64 编码"的计算结果——这个固定算法的作用是证明服务端确实理解 WebSocket 协议并主动参与了握手；握手成功后，这个 TCP 连接就从 HTTP 语义切换为 WebSocket 帧语义，不再是一问一答的请求响应模型
- **WebSocket 帧格式**：每个 WebSocket 帧包含 FIN 位（是否是消息的最后一个分片）、opcode（帧类型：文本/二进制/关闭/ping/pong）、MASK 位（客户端发往服务端的帧必须掩码处理，防止被中间代理误判为其他协议的数据）、payload length（支持 7 位/16 位/64 位三种长度编码应对不同大小的消息）——理解这个二进制格式是"WebSocket 相比 HTTP 轮询几乎没有额外协议开销"这一优势的具体来源
- **心跳保活机制**：TCP 连接在长时间无数据传输时，中间的 NAT 设备/负载均衡器可能会因为空闲超时静默丢弃连接映射，应用层却毫无察觉（"僵尸连接"）；WebSocket 协议内置了 `ping`/`pong` 控制帧用于心跳检测——服务端定时发送 `ping`，客户端自动响应 `pong`（浏览器原生 WebSocket API 会自动处理协议层 ping/pong，但 Node.js 后端之间的 WebSocket 通信需要显式处理），超过若干个心跳周期未收到响应则主动断开重连
- **WebSocket 与 SSE（Server-Sent Events）的选型对比**：SSE 基于普通 HTTP 长连接 + `text/event-stream` MIME 类型实现，天生只支持服务端到客户端单向推送，浏览器原生支持自动重连；WebSocket 是全双工的，客户端也能随时主动发消息——如果场景只是"服务端单向推送通知/进度更新"（如 AI 对话的流式输出、检验报告完成通知），SSE 因为基于标准 HTTP、能直接享受现有 HTTP 基础设施而通常是更简单的选择，只有需要客户端频繁主动发消息的场景才值得引入 WebSocket 的额外复杂度
- **WebSocket 的负载均衡挑战**：WebSocket 是长连接，传统基于请求的负载均衡策略（每次请求随机分配）不再适用——一旦连接建立，后续所有帧都必须路由到同一个后端实例，这要求负载均衡器支持"连接保持"（sticky session）或采用一致性哈希（详见 10 篇负载均衡算法）
- 对比 Node.js 实现：`ws` 库是 Node.js 生态最常用的 WebSocket 实现，其核心正是用 `http` 模块监听 `upgrade` 事件拿到底层 TCP socket，然后手动完成 `Sec-WebSocket-Accept` 计算和帧的编解码——具体实现留给 Node.js 系列「核心 API 大全」篇的手写实现小节展开，本篇聚焦协议原理本身

#### 三、源码解析

1. WebSocket 协议规范：RFC 6455 — 握手过程（第 4 章）、帧格式定义（第 5 章）、`Sec-WebSocket-Accept` 计算算法（第 1.3 节）
2. SSE 规范：WHATWG HTML 标准 Server-Sent Events 章节 — `text/event-stream` 格式与浏览器自动重连行为
3. Chromium WebSocket 实现概览：`net/websockets/` 目录（概览级介绍浏览器侧握手校验逻辑，不深入 C++ 细节）

#### 四、实践演示与验证

不依赖 `ws` 库，用 Node.js 原生 `http` + `crypto` 模块手写一个最简 WebSocket 服务端：监听 `upgrade` 事件、手动计算 `Sec-WebSocket-Accept`、手动解析客户端发来的帧（处理掩码与 payload length 的多种编码情况）、手动构造帧发送消息给客户端。用"服务端每秒推送一次模拟检验报告进度"验证服务端主动推送能力；额外实现心跳检测逻辑，模拟客户端长时间无响应后服务端主动断开连接。

#### 五、参考
- https://www.rfc-editor.org/rfc/rfc6455
- https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket
- https://developer.mozilla.org/zh-CN/docs/Web/API/Server-sent_events

**面试核心问**：
- WebSocket 握手过程中 `Sec-WebSocket-Accept` 是怎么计算出来的？这个设计的目的是什么？
- WebSocket 帧格式里 MASK 位的作用是什么？为什么只有客户端发往服务端的帧需要掩码？
- 为什么需要心跳保活机制？"僵尸连接"是怎么产生的？
- WebSocket 和 SSE 分别适合什么场景？如何选型？
- 多实例部署的 WebSocket 服务在负载均衡上有什么特殊要求？

---

### 第 07 篇：跨域与安全：CORS 机制/CSRF/XSS/CSP/安全响应头全解

**副标题**：同源策略与跨域限制、CORS 简单请求与预检请求、CSRF 与 XSS 攻防、CSP 内容安全策略

#### 一、使用与实践

- 浏览器同源策略触发跨域报错的典型场景与 Network 面板里 `OPTIONS` 预检请求
- 服务端设置 `Access-Control-Allow-Origin`/`Access-Control-Allow-Credentials`/`Access-Control-Allow-Methods` 等响应头
- Node.js Express/Koa 中间件（`cors` 包）的常见配置项
- `Content-Security-Policy` 响应头的常见指令：`script-src 'self'`、`default-src`
- 医院 HIS 系统里"处方提交接口"的 CSRF 防护实践：`SameSite=Strict` Cookie + 自定义请求头双重校验

#### 二、设计与原理

- **同源策略（Same-Origin Policy）**：协议、域名、端口三者完全一致才算同源，这是浏览器最基本的安全边界——限制不同源的脚本读取彼此的 Cookie、DOM、响应内容，防止恶意网站窃取用户在其他网站的登录状态或数据
- **CORS 简单请求与预检请求**：满足特定条件（GET/POST/HEAD 方法、特定几种 `Content-Type`、无自定义头）的跨域请求被视为"简单请求"，浏览器直接发送并在响应中检查 `Access-Control-Allow-Origin`；不满足条件的请求（如带自定义头、`PUT` 方法、`Content-Type: application/json`）会先自动发出一个 `OPTIONS` 方法的"预检请求"，服务端需要显式允许该方法/头部后，浏览器才会真正发出原始请求
- **`Access-Control-Allow-Credentials` 与凭证请求**：默认跨域请求不会携带 Cookie，如果需要携带（`fetch` 设置 `credentials: 'include'`），服务端必须明确设置 `Access-Control-Allow-Credentials: true`，且此时 `Access-Control-Allow-Origin` 不能设为通配符 `*`，必须回显具体的请求源——这是浏览器刻意设计的限制，防止"允许携带凭证的跨域请求"被滥用于大范围的凭证窃取
- **CSRF（跨站请求伪造）原理**：攻击者诱导用户在已登录状态下访问一个恶意页面，该页面自动向目标网站发起请求，由于浏览器会自动携带目标网站的 Cookie，请求在服务端看来"像是用户本人发起的合法请求"——防御手段包括 `SameSite=Strict/Lax` Cookie 属性、CSRF Token（服务端生成一次性 token 嵌入表单）、校验 `Referer`/`Origin` 请求头
- **XSS（跨站脚本攻击）原理与分类**：存储型（恶意脚本被存进数据库，其他用户加载页面时执行）、反射型（恶意脚本包含在 URL 参数中，服务端未经转义直接输出到页面）、DOM 型（纯前端 JS 处理不可信数据时直接操作 DOM 导致脚本执行，不经过服务端）——核心防御是"输出编码"和"输入校验"，`HttpOnly` Cookie 属性则是"即使发生了 XSS，也不能通过 `document.cookie` 窃取会话凭证"这道最后防线（呼应 Node.js 系列 06 篇认证体系）
- **CSP（内容安全策略）**：通过 `Content-Security-Policy` 响应头显式声明页面允许加载脚本/样式/图片等资源的来源白名单，即使页面存在 XSS 漏洞被注入了恶意脚本标签，只要该脚本的来源不在白名单内，浏览器也会拒绝执行——这是"纵深防御"思路的典型体现
- 对比 Node.js 实现：Express/Koa 生态的 `helmet` 中间件本质是一次性设置好一整套安全响应头（CSP/HSTS/X-Content-Type-Options 等）的合集，理解每个响应头背后防御的具体攻击类型才能正确配置——这部分留给 Node.js 系列「工程化」篇的安全实践小节具体展开

#### 三、源码解析

1. CORS 规范：Fetch 标准（WHATWG）CORS 协议章节 — 简单请求判定条件、预检请求流程
2. CSP 规范：W3C Content Security Policy Level 3 — 各 `-src` 指令的白名单匹配规则
3. `cors`（npm 包）实现：`expressjs/cors` 仓库 `lib/index.js` — 根据配置动态计算响应头的核心逻辑

#### 四、实践演示与验证

搭建两个不同端口的极简 Node.js 服务模拟跨域场景：一个作为"前端页面"，一个作为"API 服务"，手写一个不使用 `cors` 库的中间件，根据请求的 `Origin` 头动态设置 `Access-Control-Allow-Origin` 等响应头，并正确处理 `OPTIONS` 预检请求；额外写一个演示 CSRF 攻击的最小示例页面（自动提交表单到目标接口），对比开启 `SameSite=Strict` 前后攻击是否生效。

#### 五、参考
- https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS
- https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CSP
- https://owasp.org/www-community/attacks/csrf

**面试核心问**：
- 什么是同源策略？它限制的具体是什么行为？
- CORS 的简单请求和预检请求的区别是什么？什么条件会触发预检？
- CSRF 攻击的原理是什么？`SameSite` Cookie 属性是怎么防御的？
- XSS 分为哪几类？`HttpOnly` 在 XSS 防御链条里起到什么作用？
- CSP 是怎么在"已经发生 XSS"的情况下依然能拦截恶意脚本执行的？

---

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

#### 三、源码解析

1. HTTP 缓存规范：RFC 9111（HTTP Caching）— `Cache-Control` 各指令的定义与优先级
2. 条件请求规范：RFC 9110 第 13 章 — `If-None-Match`/`If-Modified-Since` 的服务端处理逻辑
3. Service Worker 规范：W3C Service Workers 标准 — `fetch` 事件拦截与 `Cache` API 的基本模型

#### 四、实践演示与验证

用 Node.js 原生 `http` 模块手写一个支持 `ETag` 协商缓存的静态文件服务器：读取文件内容计算哈希作为 `ETag`，正确处理请求头里的 `If-None-Match` 并返回 `304`；再手写一个最简 Service Worker，实现 Cache First 策略缓存药品说明书 PDF 资源，断网情况下依然能正常展示已缓存过的内容。

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

---

### 第 09 篇：RESTful 与 GraphQL：设计原则对比/N+1 问题溯源/DataLoader 思路

**副标题**：资源导向设计 vs 图查询设计、过度获取与获取不足、N+1 问题的产生根源与批处理思路

#### 一、使用与实践

- RESTful API 设计基本原则：用 URL 表示资源（`/patients/:id/prescriptions`），用 HTTP 方法表示操作语义（`GET`/`POST`/`PUT`/`DELETE`，呼应 05 篇方法安全性与幂等性）
- GraphQL 基本语法：`type`/`Query`/`Mutation` 定义，一次查询同时获取患者信息与关联的处方列表
- 用 Postman/curl 分别调用同一个"获取患者详情+处方列表"需求的 RESTful 多次请求方案与 GraphQL 单次请求方案，对比请求次数和响应体大小
- 观察一个典型 RESTful 接口的"过度获取"（返回了前端用不到的字段）与"获取不足"（需要二次请求关联数据）现象

#### 二、设计与原理

- **RESTful 的设计哲学**：以"资源"为核心概念，每个 URL 代表一个资源或资源集合，用统一的 HTTP 方法语义操作资源，天然贴合 HTTP 协议本身的设计意图，因此可以直接复用 HTTP 层的缓存（详见 08 篇）、状态码语义（详见 05 篇）等基础设施
- **RESTful 的"过度获取"与"获取不足"问题**：由于响应字段由服务端预先固定，同一个接口要满足"列表页只需要姓名"和"详情页需要全部字段"两种场景往往很难兼顾——要么返回冗余字段（过度获取），要么某个场景字段不够需要再发一次请求补充关联数据（获取不足）
- **GraphQL 的设计哲学**：把"服务端能提供什么数据"（Schema，类型系统契约）和"客户端具体要什么数据"（Query，运行时决定）彻底解耦——客户端在一次请求里精确声明需要的字段结构，服务端按这个结构精确返回，从设计上同时解决了过度获取和获取不足
- **N+1 查询问题的产生根源**（重点）：GraphQL 的灵活性代价是"字段级别的独立解析"——查询"10 位患者及各自的处方列表"时，如果处理"患者列表"和处理"每位患者的处方"是两个独立的、互不知道对方存在的解析函数，会自然产生 1 次 + N 次共 N+1 次数据请求——这个问题不是 GraphQL 独有的，传统 RESTful 后端如果用 ORM 的懒加载关联查询也会出现，本质是同一类"批量场景下逐条查询"的性能陷阱
- **批处理思路的通用解法**：与其在每次需要关联数据时立即发起单条查询，更好的思路是"收集当前批次需要查询的所有 ID，统一发起一次 `WHERE id IN (...)` 的批量查询，再把结果按 ID 分发回各自的调用方"——`DataLoader` 这类工具正是把这套逻辑封装成了通用的库，实现细节（如何利用事件循环时机收集同一批请求）留给 Node.js 系列「GraphQL+Apollo」篇的源码解析与手写实现具体展开
- **RESTful 与 GraphQL 的选型权衡**：不是"GraphQL 更先进所以永远优先"——GraphQL 引入了额外的复杂度（Schema 设计、Resolver 性能陷阱、客户端缓存不能直接复用 HTTP 缓存机制），对于字段结构相对固定、以资源为中心、需要利用 HTTP 缓存基础设施的场景，RESTful 依然是更简单直接的选择；GraphQL 更适合客户端需求多变、数据关联层级深的场景
- 对比前端消费方式：Apollo Client/React Query 这类客户端库为了弥补"GraphQL 不能直接用 HTTP 缓存"的短板，各自实现了一套应用层的规范化缓存（Normalized Cache），本质上是在应用层重新发明了一部分 HTTP 缓存体系试图解决的问题

#### 三、源码解析

1. RESTful 设计约束：Roy Fielding 论文 *Architectural Styles and the Design of Network-based Software Architectures* 第 5 章（REST 六大约束的原始出处）
2. GraphQL 执行模型：GraphQL 官方规范（spec.graphql.org）"Execution"章节 — 字段树递归解析的规范定义
3. N+1 问题与批处理思路的通用参考：`graphql/dataloader` 仓库 README — 批处理与缓存的设计动机说明（不深入实现，留给 Node.js 系列展开）

#### 四、实践演示与验证

用同一个"患者+处方"数据集分别实现两种接口：一个纯 RESTful 版本（`/patients` 返回列表，`/patients/:id/prescriptions` 单独查询处方，观察前端拼数据需要几次请求）；一个极简 GraphQL 版本（不引入完整 GraphQL 引擎，用手写的字段树递归 Resolver 模拟），故意不做批处理让 N+1 问题真实发生，直观对比两种范式在这个场景下的请求次数差异。

#### 五、参考
- https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm
- https://spec.graphql.org/
- https://github.com/graphql/dataloader

**面试核心问**：
- RESTful 的"过度获取"和"获取不足"分别是什么意思？各举一个例子
- GraphQL 是怎么从设计上同时解决过度获取和获取不足的？
- N+1 查询问题的本质是什么？它只存在于 GraphQL 里吗？
- 解决 N+1 问题的通用思路是什么？和具体用什么框架/工具有关系吗？
- 什么场景下 RESTful 依然比 GraphQL 更合适？

---

### 第 10 篇：反向代理与负载均衡：正向/反向代理原理/虚拟主机 Host 路由/负载均衡算法/防盗链实战

**副标题**：谁在代理谁、一个 IP 如何服务多个域名、常见负载均衡算法的适用场景、Referer 防盗链的原理与局限

#### 一、使用与实践

- Nginx `proxy_pass` 配置一个最简反向代理：客户端请求 Nginx，Nginx 转发到真实的后端服务并把响应原样返回给客户端
- Nginx `server_name` 配置虚拟主机：同一台服务器根据请求的域名分别路由到医院 HIS 系统的"处方管理"和"患者管理"两个不同的后端服务
- Nginx `valid_referers` 指令配置图片防盗链：只允许来自本站域名的请求访问药品图片资源，非法来源返回 403 或重定向到占位图
- Nginx `upstream` 块配置负载均衡：`weight` 参数实现加权轮询，`ip_hash` 指令实现基于客户端 IP 的会话保持

#### 二、设计与原理

- **正向代理 vs 反向代理**：两者在网络位置和数据流向上完全相同，区别在于**代理的是谁、对谁透明**——正向代理站在客户端一侧，服务端不知道真实客户端是谁；反向代理站在服务端一侧，对外表现为"唯一的服务入口"，客户端不知道请求最终被转发到了集群里的哪一台真实服务器
- **虚拟主机原理**：HTTP/1.1 起 `Host` 请求头成为强制字段，服务端（或反向代理）拿到请求后先读取 `Host` 头判断客户端想访问哪个域名，再路由到对应的站点配置——这让一台物理服务器/一个 IP 可以同时承载多个完全独立的域名
- **负载均衡算法对比**（面试高频）：轮询（Round Robin）；加权轮询（按配置权重分配请求比例）；IP 哈希（同一客户端的请求总落在同一台机器上，天然实现会话保持，代价是某个后端下线会导致该 IP 段用户全部切换到新后端）；一致性哈希（后端节点和请求 key 都映射到一个环形哈希空间上，后端扩缩容时只影响环上相邻的一小部分请求，最大程度减少缓存失效范围）；最少连接数（实时统计每个后端当前处理中的连接数，优先分发给最空闲的一台）——06 篇 WebSocket 提到"长连接场景负载均衡需要 sticky session"，这里的 IP 哈希/一致性哈希正是具体解法
- **图片防盗链原理与局限**：服务端检查请求头里的 `Referer`，判断请求是否从本站页面发出，非本站则拒绝——但 `Referer` 完全可以被客户端伪造或清空（如 `Referrer-Policy` 主动不发送），因此防盗链本质上是一道"提高盗链成本"的墙，而不是可靠的安全边界，这与 07 篇 CSRF 防御里"校验 Referer/Origin 只能作为辅助手段"的结论是同一个局限性的两种应用场景
- 对比 Node.js 实现：`http-proxy`（或更底层直接用 `http` 模块转发请求流）是 Node.js 生态实现反向代理的常见方式，理解 Nginx 层的虚拟主机路由和负载均衡算法原理，是判断"什么场景该用 Nginx 做网关、什么场景可以直接在 Node.js 应用层做请求转发"的前提

#### 三、源码解析

1. `Host` 请求头规范：RFC 9110 第 7.2 节 — `Host` 头的语义与服务端处理要求
2. Nginx 负载均衡模块：`ngx_http_upstream_module` 官方文档 — 轮询/加权轮询/`ip_hash` 的配置语义与选择逻辑
3. 一致性哈希算法：*Consistent Hashing and Random Trees*（原始论文，概览级介绍环形哈希空间的设计动机，不深入数学证明）

#### 四、实践演示与验证

用 Node.js 原生 `http` 模块手写一个最简反向代理：读取请求的 `Host` 头，路由到医院 HIS 系统"处方服务"或"患者服务"两个不同的模拟后端端口（复现虚拟主机效果）；再实现一个 `upstream` 数组，分别用轮询和加权轮询两种策略把请求分发到多个模拟后端实例，打印每次分发命中的实例编号验证分配比例；额外写一个基于 `Referer` 头的中间件，拦截并拒绝非法来源的药品图片请求。

#### 五、参考
- https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- https://www.rfc-editor.org/rfc/rfc9110
- https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Referrer-Policy

**面试核心问**：
- 正向代理和反向代理的本质区别是什么？分别站在谁的角度、对谁透明？
- 虚拟主机是怎么基于一个 IP 服务多个域名的？和 `Host` 请求头有什么关系？
- 常见的负载均衡算法有哪些？分别适用什么场景？
- 为什么长连接场景的负载均衡更适合用一致性哈希或 IP 哈希而不是普通轮询？
- 图片防盗链的原理是什么？它的安全性局限在哪里？

---

## 参考链接（每篇末尾统一引用池）

```
https://developer.mozilla.org/zh-CN/docs/Web/HTTP
https://www.rfc-editor.org/rfc/rfc1035
https://www.rfc-editor.org/rfc/rfc8484
https://www.rfc-editor.org/rfc/rfc9293
https://www.rfc-editor.org/rfc/rfc5681
https://www.rfc-editor.org/rfc/rfc8446
https://www.rfc-editor.org/rfc/rfc5280
https://www.rfc-editor.org/rfc/rfc9113
https://www.rfc-editor.org/rfc/rfc9000
https://www.rfc-editor.org/rfc/rfc9110
https://www.rfc-editor.org/rfc/rfc6455
https://owasp.org/
https://www.rfc-editor.org/rfc/rfc9111
https://spec.graphql.org/
https://github.com/graphql/dataloader
https://nginx.org/en/docs/http/ngx_http_upstream_module.html
https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Content_negotiation
https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Referrer-Policy
https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API
```

- RFC 系列：每篇协议原理的第一权威来源，写作时以规范原文为准，避免以讹传讹
- MDN：面向前端读者的协议知识权威二级来源，术语翻译与浏览器行为说明对齐 MDN
- OWASP：跨域与安全篇（第 07 篇）的攻防知识权威来源
- GraphQL 官方规范/DataLoader 仓库：第 09 篇涉及 GraphQL 部分的权威来源，深度实现细节交由 Node.js 系列「GraphQL+Apollo」篇展开
- Nginx 官方文档：第 10 篇反向代理/负载均衡配置层知识的权威来源

> 引用规范：正文中不出现具体博主名/账号名/人名，仅在文末参考池中列官方规范或权威来源 URL。

---

## 与 Node.js 系列的分工备忘

- 本系列第 06 篇（WebSocket）只讲协议原理；Node.js 系列「Node 核心 API 大全」篇负责用 `crypto`/`http`/`net` 手写实现 WebSocket 服务端
- 本系列第 09 篇（RESTful 与 GraphQL）只讲设计范式对比与 N+1 问题的通用原理；Node.js 系列「GraphQL+Apollo」篇负责 Resolver 执行机制源码级解析、DataLoader 具体实现原理、Apollo Server 生产实战
- 本系列第 04/03/02 篇（HTTP 演进/TLS/TCP）是 Node.js 系列原「网络协议深度」篇的内容迁移与拆分展开，Node.js 系列该篇位置已改为「Node.js 核心 API 大全」，不再重复协议理论
- 本系列第 10 篇（反向代理与负载均衡）只讲代理/虚拟主机/负载均衡算法的原理本身，不绑定具体网关产品或语言实现；Node.js 系列涉及 `http-proxy`/网关中间件的具体工程实践留给对应篇目展开

---

*规划时间：2026-09-11（本次修订：篇章顺序重排为协议栈依赖序 DNS→TCP→TLS→HTTP→语义→WS→安全→缓存→API→代理，HTTP演进篇拆分内容协商/状态码为独立第05篇，全系列由9篇扩展为10篇）| 参考：RFC 系列规范 / MDN Web 文档 / OWASP / GraphQL 官方规范*

