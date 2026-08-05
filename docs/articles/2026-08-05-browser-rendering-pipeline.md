# 从 URL 到像素：浏览器底层原理与渲染全流程（面试收藏级）

> 面试官微笑着问：「浏览器输入 URL 到页面显示，发生了什么？」
> 大多数人能答到 DNS + TCP，真正能讲到合成线程和 GPU 光栅化的，面过 500 人里不超过 10 个。
> 今天这篇，带你从进程架构讲到像素合成，把这道经典题的满分答案彻底吃透。

---

## 🎯 这篇文章解决什么问题

浏览器是前端工程师每天打交道的「黑盒」。你知道怎么用 Chrome DevTools，但不一定知道 DevTools 背后发生了什么。

这篇文章覆盖：
- 浏览器 4 大进程的分工与通信，单进程 vs 多进程架构演变
- URL 到首字节：DNS 解析、TCP 三次握手、HTTP 发展历程、浏览器缓存策略
- V8 如何把 JavaScript 跑起来（Parse → Bytecode → JIT）
- 事件循环、宏任务、微任务和渲染帧的真实关系
- 渲染流水线 13 步，从 HTML 字节流到屏幕上的像素
- Reflow / Repaint / Composite 的代价对比，以及 `transform` 为何不触发重排

读完之后，你既懂原理，也知道面试怎么答。

---

## 🏗️ 第一章：浏览器进程架构——为什么 Tab 崩了不影响别人

### 从单进程到多进程的演变

2008 年之前，浏览器几乎都是单进程架构——所有功能模块（页面渲染、JS 引擎、插件、网络）跑在同一个进程里：

![单进程浏览器架构：多线程进程中包含页面线程、网络线程、JS引擎等](https://cdn.nlark.com/yuque/0/2023/png/738210/1672736559552-b0b0f0c0-78a6-4a23-8170-faf1b61ef9fd.png)

单进程的三大硬伤：
- **稳定性**：JS 引擎崩一下，整个浏览器白屏
- **安全性**：插件可以访问系统资源，恶意脚本没有沙箱限制
- **流畅性**：复杂 JS 阻塞页面渲染线程，卡顿无法避免

Chrome 推出多进程架构后，把独立模块抽成独立进程：

![多进程浏览器架构：浏览器主进程、渲染进程、GPU进程、网络进程通过IPC通信](https://cdn.nlark.com/yuque/0/2023/png/738210/1672736680553-bdc3bde5-a523-4b12-b0b4-6b283c39a725.png)

### 四大进程分工

打开 Chrome 的任务管理器（Shift+Esc），你会看到多个进程在跑。现代浏览器采用多进程架构，核心有 4 个：

| 进程 | 职责 |
|------|------|
| **Browser 进程**（主进程） | 界面显示、用户交互、子进程管理、存储 |
| **Renderer 进程**（渲染进程） | 每个 Tab 独立一个，运行 V8 + 排版引擎，把 HTML/CSS/JS 变成页面 |
| **Network 进程** | 处理所有网络请求，加载 HTML、CSS、JS、图片等资源 |
| **GPU 进程** | 实现 CSS3 动画、3D 变换，把绘制指令转成位图 |

进程之间通过 IPC（进程间通信）传递消息，不共享内存。这是整个架构最关键的设计决策。

进程协作流程如下：

```
1. Browser 进程接收 URL → 转发给 Network 进程
2. Network 进程发起请求 → 响应头返回后通知 Browser 进程
3. Browser 进程准备 Renderer 进程 → 发送「提交导航」消息
4. Renderer 进程从 Network 进程接收 HTML 数据，开始解析
5. 解析完成 → 通知 Browser 进程「导航确认」
6. 渲染完成 → GPU 进程合成位图 → Browser 进程显示到屏幕
```

### 站点隔离（Site Isolation）与进程沙箱

**为什么一个 Tab 崩了，其他 Tab 安然无恙？**

答案是「站点隔离（Site Isolation）」。Chrome 为每个不同站点的页面分配独立的 Renderer 进程。一个 Renderer 进程崩溃，只影响这个 Tab，其他进程继续运行。

更深一层：Renderer 进程运行在沙箱（Sandbox）里。沙箱通过操作系统的权限机制，限制 Renderer 进程对磁盘、网络、系统 API 的直接访问。即使渲染进程被恶意代码攻破，它也无法直接读写文件系统或发起任意网络请求——必须通过 Browser 进程这个「守门人」代理。

这也是为什么 Chrome 内存占用高——进程隔离是以内存换安全和稳定性。

> 💬 **面试官**：浏览器为什么要用多进程架构？和多线程相比有什么优势？
>
> ✅ **标准答案**：多进程架构实现了进程级隔离。一个 Tab（Renderer 进程）崩溃不会拖垮整个浏览器。线程共享内存，任意线程崩溃会导致整个进程崩溃。
>
> 🎁 **加分答案**：站点隔离（Site Isolation）让不同源的页面在不同进程中运行，防止跨站信息泄漏（Spectre/Meltdown 类攻击）。同时 Renderer 进程运行在沙箱中，即使被攻破也无法直接访问系统资源，必须通过 Browser 进程代理。代价是更高的内存占用。

---

## 🌐 第二章：网络请求全流程——从 URL 到首字节

### URL 解析与进程协作

浏览器拿到 URL 后，首先拆解各字段：

| 字段 | 含义 | 示例 |
|------|------|------|
| Protocol | 协议 | `https` |
| Host | 主机域名 / IP | `example.com` |
| Port | 端口号 | `443` |
| Path | 目录路径 | `/users/1` |
| Query | 查询参数 | `?foo=bar` |
| Fragment | 锚点/前端路由 | `#abc` |

解析完成后，浏览器主进程开启网络请求线程，经由网络进程完成后续资源加载。

### DNS 解析

域名只是方便记忆的别名，真正建立连接需要 IP 地址。DNS 解析按以下顺序逐级查找，找到即停：

![DNS解析流程：浏览器缓存 → 系统缓存 → hosts文件 → 本地域名服务器 → 根域名服务器 → 顶级域名服务器 → 权限域名服务器](https://cdn.nlark.com/yuque/0/2023/png/738210/1672736937936-33850fea-05aa-46d3-b632-eea80ecd667f.png)

DNS 解析耗时不可忽视。优化手段：`<link rel="dns-prefetch" href="//cdn.example.com">` 提前解析常用域名。

### TCP 三次握手

获得 IP 后，传输层用 TCP 建立可靠连接，必须经历三次握手：

![TCP三次握手：客户端发SYN → 服务器回SYN+ACK → 客户端回ACK，双方ESTABLISHED](https://cdn.nlark.com/yuque/0/2023/png/738210/1672737397540-9b110398-e2de-48bb-9ba1-83a0112fb127.png)

三次握手的本质：**双方都能确认自己和对方的收发能力正常**。两次握手不够——无法让客户端确认服务器的接收能力；四次握手多余——第二次可以把 SYN+ACK 合并发送。

当连接用完，TCP 四次挥手断开：

![TCP四次挥手：客户端FIN → 服务器ACK → 服务器FIN → 客户端ACK TIME_WAIT](https://cdn.nlark.com/yuque/0/2023/png/738210/1672737762882-0dae753e-a3ba-43b2-b6e2-e097f16eb151.png)

挥手比握手多一次，因为服务器收到 FIN 后可能还有数据没传完，需要先 ACK 确认，等数据传完再发自己的 FIN。

> 💬 **面试官**：为什么 TCP 建立连接是三次握手，断开是四次挥手？
>
> ✅ **标准答案**：握手时服务器可以把 SYN 和 ACK 合并为一个包，所以三次够了。挥手时服务器的 ACK 和 FIN 必须分开——收到客户端 FIN 后先 ACK，但此时服务器可能还有未传完的数据，等传完才发 FIN，所以多了一次。
>
> 🎁 **加分答案**：TIME_WAIT 状态让客户端等待 2MSL（最长报文段寿命），防止最后一个 ACK 丢失导致服务器重发 FIN 时客户端已关闭。这是四次挥手里最容易被忽视的细节。

### HTTP 发展历程

每一代 HTTP 都是对上一代性能瓶颈的直接回应：

| 版本 | 核心改进 | 遗留问题 |
|------|---------|---------|
| HTTP/0.9 | 仅 GET，无请求头，ASCII 传输 | 功能极简 |
| HTTP/1.0 | 增加请求/响应头，多类型数据 | 每次请求新建 TCP |
| HTTP/1.1 | 默认长连接（keep-alive），管线化，chunk 传输 | 队头阻塞，每域名 6 个并发 |
| HTTP/2.0 | 多路复用（一个 TCP 多请求），二进制分帧，头部压缩，服务端推送 | TCP 层队头阻塞 |
| HTTP/3.0 | 基于 UDP 的 QUIC 协议，彻底解决队头阻塞 | 部署和支持有限 |

🔧 **真实场景**：HTTP/1.1 每个域名最多 6 个并发 TCP，早期的性能优化方案（雪碧图、域名分片）都是为了绕开这个限制。升级到 HTTP/2 后，这些 hack 不仅没用，反而可能因为分散连接降低多路复用效率。

### 浏览器缓存策略

HTTP 缓存是请求层最直接的性能优化，分两种：强缓存和协商缓存。

![浏览器缓存决策流程：强缓存未过期直接读取 → 协商缓存向服务器验证 → 重新请求](https://cdn.nlark.com/yuque/0/2023/png/738210/1672738628159-b0fa9883-f301-4512-8f52-9178cc9b9952.png)

**强缓存：不发请求，直接读本地**

浏览器命中强缓存时，状态码显示 `200 (from disk cache)` 或 `200 (from memory cache)`，完全不走网络。

控制强缓存的响应头有三个，优先级从高到低：

| 响应头 | 示例 | 说明 |
|--------|------|------|
| `Cache-Control` | `max-age=86400` | HTTP/1.1，相对时间（秒），**优先级最高** |
| `Expires` | `Thu, 01 Jan 2026 00:00:00 GMT` | HTTP/1.0，绝对过期时间，受客户端时钟影响，已被 `Cache-Control` 取代 |
| `Pragma` | `no-cache` | HTTP/1.0 遗留，等效于 `Cache-Control: no-cache`，仅用于兼容极老的代理服务器 |

`Cache-Control` 常用指令：

| 指令 | 含义 |
|------|------|
| `max-age=N` | 缓存 N 秒，相对于请求时间 |
| `no-cache` | **不是不缓存**，而是每次必须去服务器验证（走协商缓存） |
| `no-store` | 完全不缓存，每次都重新下载 |
| `public` | 可被 CDN、代理等中间节点缓存 |
| `private` | 只能被浏览器本地缓存，不允许中间节点缓存（用于用户个人数据） |
| `immutable` | 文件内容不会变，强缓存期间即使用户强制刷新也不验证 |
| `s-maxage=N` | 针对 CDN/代理的缓存时间，覆盖 `max-age` |

```http
# 静态资源（文件名含 hash）：长期缓存 + immutable
Cache-Control: max-age=31536000, immutable

# HTML 入口文件：不缓存或每次验证
Cache-Control: no-cache

# 用户隐私数据接口
Cache-Control: private, no-store
```

**协商缓存：发请求，让服务器判断**

强缓存过期后，浏览器带着「验证令牌」向服务器确认文件是否变更。服务器未变更返回 `304 Not Modified`（响应体为空，只有头），浏览器继续用本地缓存；已变更返回 `200` + 新内容。

有两组验证头，各自独立工作：

| 类型 | 响应头（服务器发出） | 请求头（浏览器带上） | 说明 |
|------|-------------------|-------------------|------|
| **ETag / If-None-Match** | `ETag: "abc123"` | `If-None-Match: "abc123"` | 基于文件内容的 hash，**精确** |
| **Last-Modified / If-Modified-Since** | `Last-Modified: Wed, 01 Jan 2025 00:00:00 GMT` | `If-Modified-Since: Wed, 01 Jan 2025 00:00:00 GMT` | 基于文件修改时间，**粒度 1 秒** |

两组同时存在时，服务器优先用 `ETag` 判断。

**ETag 为什么比 Last-Modified 更准确**：

- 文件内容不变，但 `touch` 命令更新了修改时间 → `Last-Modified` 误判「已修改」，重新下载；`ETag` 正确返回 304
- 集群部署时各台服务器时钟略有差异 → `Last-Modified` 可能在不同节点返回不同值；`ETag` 基于内容，任何节点结果一致
- 文件在 1 秒内反复修改 → `Last-Modified` 精度不足无法感知；`ETag` 内容变化即变更

代价：`ETag` 需要服务器计算文件 hash，大文件或高频请求场景有一定 CPU 开销。实践上：**静态资源 CDN 同时开两者，ETag 优先；纯动态接口可只用 `Cache-Control: no-store`**。

```
请求 → 有缓存？→ 强缓存未过期？→ 直接用（200 from cache）
              ↓ 过期
         协商缓存 → 带 If-None-Match / If-Modified-Since 发请求
                  → 未修改？→ 304 读本地缓存
                  ↓ 已修改
              200 + 新资源，更新本地缓存
```

🔧 **真实场景**：电商详情页的 JS/CSS 文件名带 contenthash（如 `main.a3f2b1.js`），设置 `Cache-Control: max-age=31536000, immutable`，永不过期。HTML 入口不加 hash，设置 `Cache-Control: no-cache`，每次验证。这样既保证静态资源最大缓存收益，又保证发版后用户立即拿到新 HTML 引用的新 hash 文件。

> 💬 **面试官**：强缓存和协商缓存的区别？`Cache-Control: no-cache` 和 `no-store` 有什么不同？
>
> ✅ **标准答案**：强缓存不发请求，直接读本地（200 from cache）；协商缓存要发请求让服务器判断，未变更返回 304。`no-cache` 是「每次必须验证」，本地可以存缓存但不能直接用；`no-store` 是「完全不存缓存」，每次都重新下载。
>
> 🎁 **加分答案**：ETag 比 Last-Modified 更准确，因为后者精度只有 1 秒，且受服务器时钟和 touch 操作影响。两者同时存在时 ETag 优先。实践中静态资源用 `contenthash` 文件名 + `immutable` 永久缓存，HTML 入口用 `no-cache` 每次验证，是业界标准方案。

---

## ⚡ 第三章：V8 与 JavaScript 执行原理——从源码到机器码

![V8执行流程：JS源代码 → 解析器生成AST → Ignition解释器执行字节码 → 发现热点代码 → TurboFan编译器生成机器码](https://cdn.nlark.com/yuque/0/2025/png/738210/1745389386033-fe001007-4f85-4510-a13c-967d49f0eb74.png)

### Parse → Bytecode → JIT（TurboFan）流水线

V8 执行 JavaScript 的过程，是「解释 + 编译」混合的 JIT 技术：

**第一步：解析（Parse）**

V8 把 JS 源码解析成 AST（抽象语法树）和作用域信息。

```javascript
var a = 1;
var b = 2;
var c = a + b;
// 解析后生成 AST 树，节点包含：
// INIT(a, 1) → INIT(b, 2) → INIT(c, ADD(a, b))
```

**第二步：生成字节码（Bytecode）**

Ignition 解释器把 AST 编译成字节码，字节码是介于源码和机器码之间的中间表示，体积小、编译快：

```
LdaSmi [10]      // 加载 10 到累加寄存器
StaGlobal [1]    // 保存到全局常量池索引 1（变量 a）
LdaSmi [20]      // 加载 20
StaGlobal [2]    // 保存（变量 b）
LdaGlobal [1]    // 从常量池加载 a
Star r1          // 保存到寄存器 r1
LdaGlobal [2]    // 加载 b
Add r1           // r1 + 累加寄存器，结果 30
StaGlobal [3]    // 保存（变量 c）
```

**第三步：JIT 编译（TurboFan）**

Ignition 在执行字节码的同时，收集类型反馈（FeedBack Vector）。当某个函数被高频调用（热点代码），TurboFan 编译器把它直接编译成机器码执行，速度大幅提升。

```javascript
function sum() {
  let a = 1;
  let b = 2;
  return a + b;
}
// 循环调用 10000 次后，V8 将 sum 标记为热点函数
// TurboFan 介入，编译成优化的机器码
for (let i = 0; i < 10000; i++) { sum(); }
```

如果后续调用时参数类型发生变化（比如传了字符串），V8 会「去优化（Deoptimization）」，退回字节码重新收集类型信息。

> 💬 **面试官**：V8 执行 JavaScript 的流程是什么？为什么 V8 比早期引擎快这么多？
>
> ✅ **标准答案**：V8 采用 JIT 混合策略——先由 Ignition 解释器执行字节码，对热点代码由 TurboFan 编译器生成优化的机器码。早期引擎直接解释执行，每次都要重新解析；V8 字节码可复用，机器码执行最快。
>
> 🎁 **加分答案**：TurboFan 基于类型反馈（FeedBack Vector）做激进优化，前提是参数类型稳定。一旦类型变化触发 Deoptimization，性能会骤降。这是为什么要「保持函数参数结构稳定」的底层原因。

---

### 隐藏类（Hidden Class）与内联缓存（IC）

V8 为每个对象维护一个「隐藏类（Hidden Class）」，记录对象的属性布局和每个属性的内存偏移量。这让属性访问从「哈希表查找」变成「直接内存偏移」，速度提升数倍。

**关键规则：相同结构的对象共享同一隐藏类。**

```javascript
// ✅ 推荐：属性顺序一致，共享隐藏类
const p1 = { name: 'alice', age: 20 };
const p2 = { name: 'bob',   age: 25 };
// p1 和 p2 共享同一个 Hidden Class
```

```javascript
// ❌ 避免：动态添加属性，每次都创建新隐藏类
const p = {};
p.name = 'alice'; // 创建 Hidden Class C1
p.age  = 20;      // 创建 Hidden Class C2（C1 的扩展）
```

**内联缓存（Inline Cache，IC）** 是配合隐藏类的优化手段。V8 在第一次执行属性访问时，记录「这个对象的隐藏类 + 属性偏移」。下次执行同一行代码时，直接用缓存的偏移量，无需再查找。

一旦同一处代码遇到不同隐藏类的对象（多态），IC 会降级为「多态 IC」甚至「超多态 IC」，性能下降明显。

```javascript
function getAge(obj) { return obj.age; }

// 每次传相同结构的对象 → 单态 IC，最快
getAge({ name: 'a', age: 20 });
getAge({ name: 'b', age: 25 });

// 传不同结构 → 多态 IC，变慢
getAge({ name: 'a', age: 20 });
getAge({ age: 20, name: 'a' }); // 顺序不同 = 不同隐藏类！
```

🔧 **真实场景**：药品详情页渲染列表时，如果每条药品数据的字段顺序不一致（从不同接口拼接），V8 会为每个对象生成不同隐藏类，属性访问无法命中 IC，渲染 1000 条数据的耗时可能是正常情况的 3-5 倍。统一对象结构是低成本的性能优化手段。

> 💬 **面试官**：什么是 V8 的隐藏类？为什么要避免动态添加属性？
>
> ✅ **标准答案**：隐藏类描述对象属性的布局，结构相同的对象共享同一隐藏类，属性访问变成固定偏移量查找。动态添加属性会改变对象结构，触发隐藏类重建，同时让内联缓存失效。
>
> 🎁 **加分答案**：不仅是动态添加，属性声明顺序不同也会导致不同隐藏类。`{ name, age }` 和 `{ age, name }` 在 V8 眼中是两种完全不同的对象结构，会让同一处代码的 IC 从单态降级为多态。

---

### 内存区域：堆 / 栈 / 调用栈

V8 的内存分为两大块：

**栈（Stack）**：存放基本类型值（number、boolean 等）和引用类型的指针。空间连续，增删只需移动指针，速度极快。每次函数调用都会在栈上创建一个执行上下文帧，函数返回后自动销毁。

```javascript
function one() {
  const a = new Person('a'); // 指针在栈，对象在堆
  function two() {
    const b = new Person('b');
  }
  two(); // two 的栈帧压栈
}        // two 返回 → 栈帧弹出，b 的堆对象可被 GC 回收
one();
```

![调用栈示意：three/two/one/全局执行上下文依次压栈，堆中存放Person对象](https://cdn.nlark.com/yuque/0/2025/png/738210/1745390686588-ce58020e-33e4-4c1c-8fc6-df0ea7db7218.png)

**堆（Heap）**：存放引用类型（对象、数组、函数）。空间不连续，允许动态分配，由 GC 管理。

V8 堆内部又细分为多个空间：

![V8堆内存空间分类：新生代(New Space)含From/To区，老生代(Old Space)，代码空间(Code Space)，Map空间，大对象空间(Large Object Space)](https://cdn.nlark.com/yuque/0/2025/png/738210/1745392255985-9e25dccb-fe58-4a1d-92f1-f6aa7bf84889.png)

| 空间 | 用途 |
|------|------|
| New Space（新生代） | 生命周期短的对象，64 位系统共 32MB |
| Old Space（老生代） | 经过 GC 仍存活的对象，默认 1.4GB |
| Code Space | JIT 编译后的机器码，唯一可执行内存 |
| Map Space | 存放隐藏类（Hidden Class）信息 |
| Large Object Space | 大对象，GC 不移动这里的对象 |

---

### GC 分代回收机制

V8 的 GC 策略基于一个核心假设：**大多数对象生命周期很短，少数对象会长期存活**。据此分为新生代和老生代，用不同算法分别处理。

**新生代：Scavenge 算法**

新生代空间一分为二（From 区 + To 区，各 16MB）。GC 时广度优先遍历 From 区，把存活对象复制到 To 区（内存连续，无碎片），然后清空 From 区，两区角色互换。

![新生代Scavenge GC流程：From区广度优先遍历存活对象复制到To区，From区清空，两区互换](https://cdn.nlark.com/yuque/0/2025/png/738210/1745465912913-8c69d8b9-406b-499c-bb16-ff30365d09a3.png)

```
From 区（使用中）        To 区（空闲）
[A][B][C][dead][D]  →  复制存活对象 →  [A][B][C][D]
```

对象在两次 GC 后仍存活，或 To 区使用超过 25%，会「晋升（Promote）」到老生代。

**老生代：Mark-Sweep + Mark-Compact**

老生代对象多、存活率高，Scavenge 的「复制」代价太大。V8 用两种算法结合：

![老生代标记清除：从GC Root深度优先遍历，黑色可达对象保留，白色不可达对象清除](https://cdn.nlark.com/yuque/0/2025/png/738210/1745473768598-1eef027e-aad9-4d03-a4cb-5af549d25672.png)

- **Mark-Sweep（标记清除）**：从 GC Root 深度优先遍历，标记所有可达对象（黑色），清除未标记对象（白色）。速度快，但会产生内存碎片。
- **Mark-Compact（标记整理）**：在标记清除基础上，把存活对象向一端移动，消除碎片。每 10 次 Mark-Sweep 穿插一次 Mark-Compact。

**增量标记（Incremental Marking）**

老生代 GC 耗时长，全程 Stop-The-World 会造成明显卡顿。增量标记把标记工作拆成多个小步骤，与 JS 执行交替进行，把单次停顿从数百毫秒压缩到 1/6。

配套的「三色标记法」（白/灰/黑）让 GC 可以暂停和恢复：

![三色标记法：白色=未发现，灰色=发现但子节点未处理，黑色=自己和子节点都处理完](https://cdn.nlark.com/yuque/0/2025/png/738210/1745475243812-fa58cab6-dd0a-4123-a562-7f768dd171cb.png)

- 白色：未被 GC 发现，本轮结束仍是白色则回收
- 灰色：已发现，子节点还在处理中（标记可以在此暂停恢复）
- 黑色：自身和所有子节点都已处理完毕

**Write Barrier（写屏障）**：增量标记期间，若黑色节点新增了指向白色节点的引用，写屏障会把白色节点升为灰色，防止被误删。

![Write Barrier示意：黑色节点a.b由b1改为b2时，写屏障将新的b2从白色升为灰色](https://cdn.nlark.com/yuque/0/2025/png/738210/1745475371945-30fb942a-d4e5-47be-aa13-938a0740f3ca.png)

**并发回收（Concurrent GC）**

更进一步，老生代的标记工作由辅助线程在后台并发完成，主线程几乎不停顿。这是 Chrome 流畅运行的关键优化之一。

![并发GC：辅助线程在后台执行标记，主线程继续执行JS，最后配合完成清理整理](https://cdn.nlark.com/yuque/0/2025/png/738210/1745396750731-cef5734a-9e54-4c92-a6f8-ddb41b0ac2da.png)

> 💬 **面试官**：V8 的新生代和老生代 GC 有什么区别？为什么要分代？
>
> ✅ **标准答案**：分代基于「大多数对象生命周期短」的假设。新生代用 Scavenge（复制算法），速度快但需要双倍空间；老生代用 Mark-Sweep + Mark-Compact，空间利用率高。两者用不同频率和策略处理不同特征的对象。
>
> 🎁 **加分答案**：老生代 GC 用增量标记把停顿打散，现代 V8 还实现了并发标记（辅助线程在后台标记，主线程继续执行 JS），进一步消除停顿。「Write Barrier（写屏障）」解决了增量标记期间对象引用变化的问题——黑色节点指向新白色节点时，写屏障把白色节点升灰，防止被误删。

---

## 🔄 第四章：事件循环——渲染帧的秘密

JavaScript 是单线程的，但浏览器里同时发生着网络请求、定时器、用户交互、页面渲染……它们是怎么有序运转的？答案是**事件循环（Event Loop）**。

### 宏任务 / 微任务 / 渲染帧

事件循环的每一轮（一个 Tick）按固定顺序执行：

```
1. 取出一个宏任务（Macro Task）执行
2. 执行完后，清空所有微任务（Micro Task）队列
3. 如果需要渲染（距上次渲染超过 16.6ms），执行渲染流水线
4. 执行 requestIdleCallback（若有空闲时间）
5. 回到第 1 步，取下一个宏任务
```

**宏任务**：`setTimeout`、`setInterval`、`MessageChannel`、I/O 回调、用户事件（click/keydown）

**微任务**：`Promise.then`、`MutationObserver`、`queueMicrotask`

微任务的优先级高于下一个宏任务，也高于渲染。微任务队列不清空，渲染就不会发生。

```javascript
console.log('start');
setTimeout(() => console.log('macro'), 0);
Promise.resolve()
  .then(() => console.log('micro 1'))
  .then(() => console.log('micro 2'));
console.log('end');
// 输出：start → end → micro 1 → micro 2 → macro
// 渲染发生在 micro 2 之后、macro 之前（如果需要渲染）
```

### 一帧的生命周期

浏览器以 60fps 刷新时，每帧约 16.6ms。一帧内主线程要完成：

```
输入事件 → JS 执行 → requestAnimationFrame
→ 样式计算 → 布局 → 绘制 → 合成
→ 剩余时间：requestIdleCallback
```

`requestAnimationFrame` 在每帧渲染前执行，是做动画的正确时机。用 `setTimeout(fn, 16)` 有误差，且无法与渲染帧对齐。

`requestIdleCallback` 在帧末空闲时执行，适合低优先级任务（埋点上报、预加载），但不保证每帧都有空闲。

🔧 **真实场景**：药品搜索页用 `MutationObserver` 监听 DOM 变化做关键词高亮。MutationObserver 是微任务，如果回调里又修改 DOM 触发新回调，可能形成微任务死循环，彻底阻塞渲染。解决方案：回调里先 `disconnect()`，处理完再重新 `observe()`。

> 💬 **面试官**：Promise.then 和 setTimeout 谁先执行？为什么？
>
> ✅ **标准答案**：Promise.then 先执行。微任务在当前宏任务结束后、下一个宏任务前立即清空；setTimeout 回调是下一个宏任务。
>
> 🎁 **加分答案**：渲染也在微任务之后。微任务队列里有大量工作时，渲染会被一直推迟，页面看起来卡死。耗时操作应用 `requestAnimationFrame` 或 `setTimeout` 分帧执行，而不是塞进 Promise 链。

---

## 🎨 第五章：渲染流水线——从 HTML 到像素的 13 步

### Navigation Timing 全流程时序

从浏览器发出请求到页面完全显示：

```
DNS 解析 → TCP 握手 → TLS 协商 → HTTP 请求 → TTFB
→ HTML 下载 → DOM 解析 → CSSOM 构建 → JS 执行
→ Render Tree → Layout → Paint → Composite → 显示
```

用 Performance API 采集各阶段耗时：

```javascript
const { fetchStart, requestStart, responseStart,
        domInteractive, domContentLoadedEventEnd,
        loadEventStart } = performance.timing;

const TTFB = responseStart - requestStart;
const TTI  = domInteractive - fetchStart;
const DCL  = domContentLoadedEventEnd - fetchStart;
const L    = loadEventStart - fetchStart;
```

各阶段耗时对应的性能瓶颈位置，详见第七章的指标映射表。

---

### HTML 流式解析与 DOM 构建

浏览器**边下载边解析** HTML，不等完整响应。解析流程：

```
字节流 → 字符流 → Tokens（词法分析）→ 节点 → DOM 树
```

核心数据结构是 **Token 栈**：遇到开始标签压栈，遇到结束标签出栈，文本节点挂到栈顶的 children。

```javascript
// 模拟 Token 栈逻辑
const stack = [{ type: 'document', children: [] }];
parser.onopentag = (name, attrs) => {
  const el = { tagName: name, children: [], parent: stack.at(-1) };
  stack.at(-1).children.push(el);
  stack.push(el);
};
parser.onclosetag = () => stack.pop();
```

预解析优化：主解析器遇到 `<script>` 暂停时，**预解析线程**扫描后续 HTML，提前并行下载 CSS/JS 资源。

---

### CSS 阻塞渲染 / JS 阻塞解析的根本原因

**CSS 阻塞渲染，不阻塞 DOM 解析**

构建 Render Tree 需要 DOM + CSSOM，CSSOM 未完成渲染无法开始。所以 CSS 加载阻塞的是**渲染**，DOM 解析照常进行。结论：CSS 放 `<head>`，尽早开始下载。

**JS 阻塞 DOM 解析**

JS 可以操作 DOM 和读取 CSSOM（`getComputedStyle`），解析器遇到 `<script>` 必须停下来等 JS 执行完。JS 执行前还要等 CSS 加载完：

```
CSS 加载完 → CSSOM 构建 → JS 执行 → DOM 继续解析
```

三种脚本加载方式对比：

```
普通 script:  解析████[停止]→ JS下载+执行 → 解析████
async:        解析████████████（JS 并行下载，下完就执行）
defer:        解析████████████ → DOM完成后按序执行JS
```

结论：普通 `<script>` 放 `</body>` 前；有依赖关系的脚本用 `defer`；无依赖的独立脚本用 `async`。

---

### GPU 图层与合成线程 vs 主线程

这是「为什么 `transform` 不触发重排」的根本原因。

渲染流水线分两个阶段：

**主线程阶段**：DOM/CSSOM → 样式计算 → 布局树 → 分层树 → 绘制指令列表

**合成线程阶段**：接收绘制指令 → 图块划分（256×256 tile）→ 栅格化线程 + GPU 进程生成位图 → Draw Quad → 显示

**关键：合成线程完全独立于主线程，即使主线程被 JS 阻塞，合成线程仍正常运行。**

`transform` 和 `opacity` 的动画只在合成阶段发生，不需要主线程重新 Layout 或 Paint。而 `width`、`left` 等属性变化触发完整流水线（Layout → Paint → Composite）。

触发独立合成层的条件：`will-change: transform`、`transform: translateZ(0)`、`opacity` 动画、`position: fixed`、`filter`、`clip-path`。

> 💬 **面试官**：为什么 `transform` 做动画比修改 `left` 性能好？
>
> ✅ **标准答案**：`transform` 动画由合成线程处理，不触发主线程的 Layout 和 Paint。`left` 改变触发 Reflow，需要重新计算布局，代价高得多。
>
> 🎁 **加分答案**：合成线程独立运行，主线程被 JS 阻塞时 `transform` 动画仍流畅。`will-change: transform` 提前提升图层，避免动画开始时的开销。但图层过多会增加 GPU 内存压力，不能滥用。

🔧 **真实场景**：药品详情页「加入购物车」浮动按钮用 `position: fixed`，每次滚动触发重绘。改用 `transform: translate3d(0,0,0)` + `will-change: transform` 提升为合成层，滚动由合成线程处理，帧率从 30fps 提升到 60fps。

---

## 📊 第六章：Reflow / Repaint / Composite 代价对比

### 三者触发条件与代价

| 类型 | 触发条件 | 代价 | 典型属性 |
|------|---------|------|---------|
| **Reflow（重排）** | 影响布局的变化 | 最高：Layout + Paint + Composite | `width`、`height`、`margin`、`top`、`left`、`font-size` |
| **Repaint（重绘）** | 外观变化不影响布局 | 中：Paint + Composite | `color`、`background`、`border-color`、`visibility` |
| **Composite（合成）** | 仅合成层属性变化 | 最低：仅 Composite | `transform`、`opacity` |

**读取以下属性会强制触发同步 Reflow**（浏览器必须立即完成布局计算）：

```javascript
// 读取这些属性会强制同步重排
el.offsetWidth / offsetHeight / offsetTop / offsetLeft
el.scrollTop / scrollLeft / scrollWidth / scrollHeight
el.clientTop / clientLeft / clientWidth / clientHeight
window.getComputedStyle(el)
el.getBoundingClientRect()
```

### 强制同步布局（Layout Thrashing）

在 JS 里交替读写布局属性，浏览器被迫反复重排：

```javascript
// ❌ 布局抖动：每次读 offsetHeight 都强制同步重排
function reflow() {
  const el = document.getElementById('app');
  const node = document.createElement('h1');
  node.innerHTML = 'hello';
  el.appendChild(node);
  console.log(el.offsetHeight); // 强制同步布局
}
for (let i = 0; i < 100; i++) { reflow(); }
```

```javascript
// ✅ 批量读，批量写，避免交替操作
const heights = elements.map(el => el.offsetHeight); // 先全读
elements.forEach((el, i) => {
  el.style.height = heights[i] * 2 + 'px';           // 再全写
});
```

### 减少重排的实践清单

- 用 `transform` 替代 `top/left` 做位移动画
- 批量修改样式用 `className` 切换，而非逐条 `style.xxx = ...`
- 脱离文档流（`position: absolute`）后再做大量修改
- 用 `requestAnimationFrame` 把 DOM 操作合并到每帧一次
- 用 `will-change` 提升频繁动画的元素到合成层

---

## 🔗 第七章：承上启下——浏览器行为 → 性能指标映射

把整个流水线的每个行为和 Core Web Vitals 指标对应起来，为第 2 篇做铺垫。

| 浏览器行为 | 影响的性能指标 | 优化切入点 |
|-----------|--------------|----------|
| DNS/TCP/TLS 耗时长 | TTFB 升高 | `dns-prefetch`、HTTP/2、CDN |
| HTML 下载慢 | FCP/LCP 延迟 | gzip/br 压缩、减小 HTML 体积 |
| CSS 阻塞渲染 | FP/FCP 延迟 | 内联关键 CSS、`media` 属性按需加载 |
| JS 阻塞解析 | TTI/FID 恶化 | `defer`/`async`、代码分割、懒加载 |
| 长任务（>50ms）占主线程 | INP 升高 | 任务拆分、Web Worker |
| 频繁 Reflow | CLS 上升、卡顿 | 预留尺寸、避免动态插入影响布局的元素 |
| 大量合成层 | 内存占用高 | 合理使用 `will-change`，用完释放 |
| GC 停顿 | 页面卡顿、INP 上升 | 减少内存泄漏，避免频繁创建大对象 |

**一句话串联**：TTFB 决定数据到达速度，渲染阻塞决定首屏时机，主线程长任务决定交互响应，合成层策略决定动画流畅度——这 4 条主线贯穿第 2 篇所有优化方案。

---

## 🗺️ 第八章：前端页面完整生命周期——把前七章串成一条线

学了七章原理，但面试官真正想考的是：**你能不能把这些碎片装进一个完整的框架里，遇到性能问题时知道该往哪里看**。这一章就做这件事。

### 全局时序：从敲回车到页面可交互

把前七章的内容摊开，整条时间线如下：

```
用户输入 URL
    ↓
① 浏览器主进程：URL 解析 → 检查本地缓存 → 通知网络进程
    ↓
② 网络进程：DNS 解析 → TCP 三次握手 → TLS 协商（HTTPS）→ 发 HTTP 请求
    ↓
③ 服务器：反向代理 → 业务逻辑 → 返回 HTTP 响应
    ↓ 响应头到达
④ 网络进程通知浏览器主进程 → 准备 Renderer 进程 → 提交导航
    ↓
⑤ Renderer 进程：接收 HTML 字节流，开始关键渲染路径（CRP）
    │
    ├─ HTML 解析 → DOM 树（边下载边解析，遇 script 暂停）
    ├─ CSS 下载 + 解析 → CSSOM 树（阻塞渲染，不阻塞 DOM 解析）
    ├─ DOM + CSSOM → Render Tree → Layout → Paint → Composite
    │
    ↓ 首帧像素上屏 → FCP
⑥ V8 执行 JS → 事件循环启动 → 页面可交互 → TTI
    ↓
⑦ 用户交互 → 触发事件 → 可能引发 Reflow / Repaint / Composite
    ↓
⑧ GC 定期回收堆内存 → 可能触发短暂停顿（INP 上升）
```

每一个箭头都是一个可能的性能瓶颈，也是一个可以优化的切入点。

### 阶段拆解：每段能做什么

**阶段 ①②：网络建连前**

这段时间里用户看到的是空白，但浏览器其实可以提前干活：

```html
<!-- 提前解析 DNS -->
<link rel="dns-prefetch" href="//cdn.example.com">
<!-- 提前建立 TCP + TLS 连接 -->
<link rel="preconnect" href="https://api.example.com">
<!-- 提前下载关键资源 -->
<link rel="preload" as="font" href="/fonts/inter.woff2" crossorigin>
```

这三个 `<link>` 是「让浏览器在空闲时提前做准备」，不阻塞主流程，是零成本的网络优化。

**阶段 ③：服务器响应**

TTFB（Time to First Byte）是服务器处理耗时的直接体现。TTFB 高说明后端慢或网络远，前端能做的主要是 CDN 分发和边缘计算（把静态资源、甚至部分 SSR 推到离用户近的节点）。

**阶段 ④：提交导航**

这一步经常被忽视。浏览器主进程收到响应头后，要先决定用哪个 Renderer 进程，再发「提交导航」消息，Renderer 进程才开始接收 HTML。

如果响应头里有重定向（301/302），整个流程从头来过——每次重定向都是一次额外的 DNS + TCP + HTTP 往返。**消除不必要的重定向**是 TTFB 优化里性价比最高的手段之一。

**阶段 ⑤：关键渲染路径（CRP）**

这是「首屏白屏时间」最直接的决定因素。理解 CRP 需要搞清楚三个阻塞关系：

```
HTML 解析 ──遇到 <link rel="stylesheet">──→ CSS 下载中...
                                              CSS 下载完 → CSSOM 构建 → 渲染继续
HTML 解析 ──遇到 <script>──────────────────→ 等待 CSS（如果有）→ JS 执行 → HTML 继续解析
```

一个完整的 CRP 优化清单：

| 优化点 | 手段 | 原理 |
|--------|------|------|
| 减少阻塞 CSS | 拆分 CSS，`media` 属性按需加载 | 非匹配媒体的 CSS 不阻塞渲染 |
| 内联关键 CSS | 首屏样式直接写进 `<style>` | 消除首屏 CSS 的网络往返 |
| 消除阻塞 JS | `defer`（有依赖序）/ `async`（无依赖） | JS 不阻塞 HTML 解析 |
| 减少关键资源体积 | gzip/br 压缩，Tree Shaking，代码分割 | 更快下载完成 |
| 预加载关键资源 | `<link rel="preload">` | 让浏览器提早发现并优先下载 |

**阶段 ⑥：JS 执行与 TTI**

FCP（首次内容绘制）之后，页面虽然有内容，但主线程可能还在执行大量 JS（框架初始化、数据请求、事件绑定），导致用户点击没响应。这段时间叫「不可交互窗口」，TTI 标记它结束的时机。

长任务（超过 50ms 的主线程任务）是 TTI 延迟的主因：

```javascript
// ❌ 一次性初始化 1000 个组件，主线程阻塞 200ms+
initAllComponents(data); // 长任务

// ✅ 分帧执行，每帧只处理一批
function initInChunks(data, index = 0) {
  const chunk = data.slice(index, index + 50);
  chunk.forEach(item => initComponent(item));
  if (index + 50 < data.length) {
    requestIdleCallback(() => initInChunks(data, index + 50));
  }
}
```

**阶段 ⑦：交互响应（INP）**

页面可交互后，用户每次点击/输入/滚动都会触发事件回调。如果回调里有重计算或 DOM 操作，主线程被占用，下一帧渲染被推迟，用户感受到延迟。

INP（Interaction to Next Paint）衡量的就是这段延迟。优化方向：

```javascript
// ❌ 点击回调里同步做大量计算
button.addEventListener('click', () => {
  const result = heavyCalculation(bigData); // 阻塞主线程 100ms
  render(result);
});

// ✅ 把重计算移到 Web Worker，主线程只负责渲染
const worker = new Worker('calc.js');
button.addEventListener('click', () => {
  worker.postMessage(bigData);
});
worker.onmessage = ({ data }) => render(data);
```

**阶段 ⑧：GC 与内存健康**

GC 停顿会在任意时刻打断主线程，造成 INP 升高或动画掉帧。GC 频率取决于对象创建速度——频繁创建短命对象会让新生代 Scavenge 不断触发。

```javascript
// ❌ 每帧都创建新对象，GC 压力大
function animate() {
  const vec = { x: 0, y: 0, z: 0 }; // 每帧 new 一个
  update(vec);
  requestAnimationFrame(animate);
}

// ✅ 对象池复用，减少 GC 压力
const vecPool = { x: 0, y: 0, z: 0 };
function animate() {
  vecPool.x = 0; vecPool.y = 0; vecPool.z = 0;
  update(vecPool);
  requestAnimationFrame(animate);
}
```

### 性能指标与生命周期阶段对应

把 Core Web Vitals 和 Navigation Timing 指标映射到生命周期：

| 指标 | 含义 | 对应阶段 | 典型阈值 |
|------|------|---------|---------|
| TTFB | 首字节时间 | 阶段 ②③ | < 800ms |
| FCP | 首次内容绘制 | 阶段 ⑤ | < 1.8s |
| LCP | 最大内容绘制 | 阶段 ⑤⑥ | < 2.5s |
| TTI | 可交互时间 | 阶段 ⑥ | < 3.8s |
| INP | 交互到下一帧 | 阶段 ⑦⑧ | < 200ms |
| CLS | 累计布局偏移 | 阶段 ⑤⑦ | < 0.1 |

用 Performance API 采集这些指标：

```javascript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'largest-contentful-paint') {
      console.log('LCP:', entry.startTime);
    }
    if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
      console.log('CLS shift:', entry.value);
    }
  }
});
observer.observe({ type: 'largest-contentful-paint', buffered: true });
observer.observe({ type: 'layout-shift', buffered: true });
```

### 内存泄漏：生命周期的暗面

页面生命周期不只是「加载到可用」，还包括长时间运行后的内存健康。内存泄漏不会让页面崩溃，但会让它越跑越慢。

常见泄漏模式与对应的 V8 视角：

| 模式 | GC 为何无法回收 | 修复方式 |
|------|--------------|---------|
| 不合理的闭包 | 闭包持有外层大对象，GC Root 可达 | 用完将引用置 `null` |
| 隐式全局变量 | 挂到 `window`，GC Root 永远可达 | `'use strict'` 严格模式 |
| 分离的 DOM | JS 变量持有已从 DOM 移除的节点引用 | 移除节点同时清空引用 |
| 未清理定时器 | `setInterval` 回调持有闭包，定时器 ID 存活 | 组件卸载时 `clearInterval` |
| 未移除事件监听 | 监听函数引用持有数据，节点虽移除监听仍活 | 组件卸载时 `removeEventListener` |
| Map / Set 强引用 | Map key 是对象引用，GC 无法回收 | 改用 `WeakMap` / `WeakSet` |

**排查流程**：

```
1. Chrome DevTools → Memory → 勾选「堆快照」
2. 执行可疑操作（路由跳转/打开弹窗/关闭弹窗）
3. 手动触发 GC（点击 ⊘ 图标）
4. 再拍一张快照
5. 对比模式：选「Comparison」，查看 #New 列
6. 找到构造函数名称 → 展开 Retainers → 找持有引用的链路
```

🔧 **真实场景**：药品详情页有一个「最近浏览」组件，用 `Map` 缓存药品卡片的 DOM 引用。路由离开后组件卸载，但 `Map` 仍持有 DOM 节点的 JS 引用，节点无法被 GC 回收。将 `Map` 换成 `WeakMap` 后，`key`（DOM 节点）被 GC 回收时 `WeakMap` 对应条目自动清除，内存占用从持续增长变为稳定。

> 💬 **面试官**：如果页面运行一段时间后越来越卡，你会怎么排查？
>
> ✅ **标准答案**：先用 Chrome Performance 面板录制一段操作，查看 JS Heap 是否持续上涨。如果上涨，用 Memory 面板对比操作前后的堆快照，找到 #New 列里异常增长的构造函数，顺着 Retainers 链找到持有引用的根源。
>
> 🎁 **加分答案**：内存问题分两类——泄漏（对象永远不被回收，堆持续增长）和 GC 压力（频繁创建短命对象，新生代 Scavenge 频繁触发，导致间歇性卡顿但堆总量稳定）。两者症状相似但排查方向不同：前者用快照对比，后者用 Allocation Timeline 看对象分配速率。

---

## 💡 一张图总结（面试速记）

| 知识点 | 一句话核心 | 面试频率 |
|-------|-----------|---------|
| 浏览器多进程 | 进程隔离 = 稳定 + 安全，Tab 崩溃不影响其他 | ⭐⭐⭐⭐⭐ |
| 站点隔离 | 不同源不同进程，沙箱防止系统级访问 | ⭐⭐⭐ |
| TCP 三次握手 | 双方确认收发能力正常，两次不够四次多余 | ⭐⭐⭐⭐⭐ |
| HTTP 发展 | 1.1 长连接 → 2.0 多路复用 → 3.0 QUIC/UDP | ⭐⭐⭐⭐ |
| 浏览器缓存 | 强缓存（Cache-Control）优先，协商缓存（ETag）兜底 | ⭐⭐⭐⭐⭐ |
| V8 JIT | Parse → Bytecode → 热点代码 → 机器码（TurboFan） | ⭐⭐⭐⭐⭐ |
| 隐藏类 / IC | 结构稳定 = 共享隐藏类 = IC 命中 = 快 | ⭐⭐⭐⭐ |
| GC 分代 | 新生代 Scavenge / 老生代 Mark-Sweep + 增量标记 | ⭐⭐⭐⭐⭐ |
| Write Barrier | 黑色指向新白色时升灰，防增量标记误删存活对象 | ⭐⭐⭐ |
| 事件循环 | 宏任务 → 清空微任务 → 渲染 → 下一个宏任务 | ⭐⭐⭐⭐⭐ |
| CSS 阻塞 | 阻塞渲染，不阻塞 DOM 解析 | ⭐⭐⭐⭐⭐ |
| JS 阻塞 | 阻塞 DOM 解析，需等 CSS 加载完 | ⭐⭐⭐⭐⭐ |
| CRP 优化 | 减少关键资源数 + 字节数 + 路径深度 | ⭐⭐⭐⭐ |
| 合成线程 | 独立于主线程，transform/opacity 不经过 Layout/Paint | ⭐⭐⭐⭐⭐ |
| Reflow 代价 | 最高：Layout + Paint + Composite，读布局属性也会触发 | ⭐⭐⭐⭐⭐ |
| Layout Thrashing | 交替读写布局属性反复重排，批量操作可避免 | ⭐⭐⭐⭐ |
| 内存泄漏 | 闭包/定时器/事件监听/分离 DOM 是四大高发场景 | ⭐⭐⭐⭐⭐ |

---

## 📝 留个问题

下面这段代码，在 Chrome 里执行会发生几次重排？为什么？

```javascript
const box = document.getElementById('box');
box.style.width = '200px';
const h = box.offsetHeight;   // 👈 这一行
box.style.height = h + 'px';
box.style.background = 'red';
```

答案下期揭晓——你也可以用 Chrome Performance 面板录制一下，亲眼看看 Layout 触发时机。

---

> 🔖 这是「前端性能与监控系列」第 1 篇。上一篇：《前端性能与监控系列——开篇导读》；下一篇预告：《Core Web Vitals 2026 全景——从指标到优化到归因》

