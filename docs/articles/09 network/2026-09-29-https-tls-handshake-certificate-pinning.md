# HTTPS 与 TLS 深度拆解：握手过程、证书信任链与 HSTS/Certificate Pinning 安全实践（面试收藏级）

> **副标题**：非对称加密协商密钥、对称加密传输数据、证书信任链验证、常见 HTTPS 安全加固手段

> 面试官问「HTTPS 为什么要用混合加密？」——十个人有八个能背出「非对称加密协商密钥、对称加密传输数据」这句标准答案。但继续追问「前向保密到底怎么做到」「自签名证书为什么浏览器要警告」「TLS 1.3 为什么敢把 RSA 密钥交换整个废弃掉」，能讲清底层逻辑的不到一成。

> 这篇文章不只要让你「会背 HTTPS 的结论」，更要让你**看懂一次 TLS 握手从第一个字节到加密通信的完整过程**——非对称加密怎么把对称密钥安全地「运」过去、证书信任链凭什么能证明「对面确实是那台服务器」、前向保密这个特性是怎么被 ECDHE 一步步设计出来的。理解了这条链路，HTTPS 的所有面试题都能从原理推到答案。

---

## 🎯 这篇文章解决什么问题

这是「网络原理深度拆解」系列的第 03 篇，落在**会话/表示层**（严格说，TLS 位于应用层与传输层之间）。前面两篇已经埋好了两条线：第 01 篇讲 DNS 时说过「DNS 明文 UDP 可被窃听篡改，所以有了 DoH/DoT 加密」；第 02 篇讲 TCP 时说过「TCP 只负责可靠传输、不负责加密，内容在中间人眼里是明文的」——这一篇就来补上「传输层之上、应用层之下的那层加密」。

在分层大地图里，本篇的位置是这样：

```
┌─────────────────────────────────────────────────────────────┐
│ 应用层   01 DNS │ 04 HTTP演进 │ 05 HTTP语义 │ 06 WebSocket   │
├─────────────────────────────────────────────────────────────┤
│ 会话/表示层  03 TLS/HTTPS   ← 本篇在这里                     │
├─────────────────────────────────────────────────────────────┤
│ 传输层   02 TCP / UDP                                       │
└─────────────────────────────────────────────────────────────┘
```

本篇也是后面 HTTP 演进（04）、跨域安全（07）篇的**信任地基**——HTTP/2 的 TLS 握手、HSTS/CSP 等安全响应头，都以本篇讲的证书链 + 握手 + 密钥协商为前提。

这篇文章只做三件事，按一条主线推进：**动机 → 信任 → 协商 → 改进 → 加固**：

- **讲透动机**：为什么 HTTPS 要「混合加密」而不是一条路走到黑
- **讲透信任**：证书信任链怎么证明「对面确实是那台服务器」，这是握手的前提
- **讲透协商与加固**：TLS 1.2/1.3 握手全过程、前向保密、HSTS、Certificate Pinning

全篇示例统一用医疗场景：域名延续 `drug.example.com`（药品商城），证书加固的场景落到**医院 HIS 系统对接第三方检验设备**。**既讲原理，也讲面试怎么答**——读完这篇，HTTPS 这一栏从「会背结论」到「能讲清为什么」，面试官的眼睛会不一样。

---

## 一、使用与实践

### 1. HTTP 的三大风险，HTTPS 的一一对策

先回到问题的起点：为什么要 HTTPS？因为裸的 HTTP 在传输层有**三个致命风险**。

![HTTP 明文传输的三大风险](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814833584-74f1259c-6dbd-45d8-bb16-7f1e48cea35f.png)

**① 窃听风险**：黑客可以获知通信内容。药品商城里患者提交的处方、检验报告，在 HTTP 明文下，中间任何一个网络节点都能看到原文。

**② 篡改风险**：黑客可以修改通信内容。明文报文里的字段（比如「药价 100 元」）可以被中间人改掉，而你收到的就是被改过的。

**③ 冒充风险**：黑客可以冒充他人身份参与通信。你以为在跟 `drug.example.com` 通信，其实对端是钓鱼服务器。

HTTPS 的本质是 **HTTP + TLS/SSL**：把 HTTP 报文装进 TLS 加密通道里传输。针对上面三个风险，TLS 分别给出对策：

| 风险 | 对策 | 方法 |
| :--- | :--- | :--- |
| 信息窃听 | 信息加密 | 对称加密 AES |
| 密钥传递 | 密钥协商 | 非对称加密（RSA 和 ECC） |
| 信息篡改 | 完整性校验 | 散列算法（MD5 和 SHA） |
| 身份冒充 | CA 权威机构 | 散列算法（MD5 和 SHA）+ RSA 签名 |

这张表是整个 HTTPS 的地图：**对称加密负责「加密数据」、非对称加密负责「协商密钥」、散列算法负责「防篡改」、CA 签名负责「防冒充」**。后面第二节会把这四个零件一个个拆开，看它们怎么拼成一台完整的机器。

### 2. 用 `openssl s_client` 手动看一次 TLS 握手

理解 TLS 最好的方式，是亲手「看」一次握手。`openssl s_client` 是最方便的工具——它扮演一个 TLS 客户端，连接目标服务器，把整个握手过程和最终选定的加密套件打印出来：

```shell
# 连接 example.com 的 443 端口，查看完整握手过程
openssl s_client -connect example.com:443
```

输出里最值得看的三行：

```text
Protocol  : TLSv1.3
Cipher    : TLS_AES_256_GCM_SHA384
Certificate chain
 0 s:CN = example.com
```

- **Protocol**：协商出来的 TLS 版本（现在主流站点基本都是 `TLSv1.3`）
- **Cipher**：选定的加密套件。`TLS_AES_256_GCM_SHA384` 这个名字信息量很大，后面会拆开讲——`AES_256_GCM` 是「用 AES-256 对称加密 + GCM 模式」，`SHA384` 是「用 SHA-384 做完整性校验」
- **Certificate chain**：服务端发来的证书链，`0 s:CN = example.com` 是叶证书的 Subject

> 想更直观地看到「握手消息一条条发生了什么」，用 `-msg` 参数：
>
> ```shell
> openssl s_client -msg -connect example.com:443
> ```
>
> 会逐条打印 ClientHello → ServerHello → Certificate → … → Finished 的完整序列，这是第四部分「实践演示」要重点展开的实验。

### 3. 浏览器地址栏查看证书详情

日常排查「这个站的证书是不是有问题」，不用命令行，浏览器地址栏就能看：

- 点击地址栏左侧的**锁形图标**（或「不安全」提示）→ 点「连接是安全的 / 证书有效」→ 点「证书」
- 弹出的证书详情里重点看三处：**颁发者**（Issuer，谁签发的这个证书）、**有效期**（Valid from / Valid to，过期就失效）、**加密算法**（公钥算法和签名算法，如 RSA 2048 / SHA-256）

这几项就是后面「证书信任链」章节要逐字段拆解的 X.509 字段。现在先在浏览器里有个直观印象：**一张证书本质上就是「一段被 CA 签名过的、关于『谁拥有哪个公钥』的声明」**。

### 4. Node.js `https` 模块：加载自签名证书

开发环境下，我们常常要给自己签发一张证书。用 Node.js 的 `https` 模块加载一张自签名证书，就能在本地起一个 HTTPS 服务：

```javascript
const https = require('https');
const fs = require('fs');
const path = require('path');

const options = {
  key: fs.readFileSync(path.resolve(__dirname, 'ssl/server.private.pem')), // 服务端私钥
  cert: fs.readFileSync(path.resolve(__dirname, 'ssl/server.crt'))          // 服务端证书
};

https.createServer(options, (req, res) => {
  res.end('hello world\n');
}).listen(9000);

console.log("server https is running 9000");
```

对应的客户端（注意 `rejectUnauthorized: false` 这个参数）：

```javascript
const https = require('https');
const options = {
  hostname: '127.0.0.1',
  port: 9000,
  path: '/',
  method: 'GET',
  requestCert: true,        // 请求客户端证书
  rejectUnauthorized: false // 不拒绝不受信任的证书
};

const req = https.request(options, (res) => {
  let buffers = [];
  res.on('data', (chunk) => {
    buffers.push(chunk);
  });
  res.on('end', () => {
    console.log(buffers.toString());
  });
});
req.end();
```

**为什么浏览器访问这个自签名服务会弹警告？** 关键就在 `rejectUnauthorized` 这个参数——客户端（浏览器）默认是 `rejectUnauthorized: true` 的，即「证书不在我信任的清单里，就拒绝」。自签名证书没有经过任何内置受信任的 CA 签发，浏览器验证证书链时找不到那个「可信的根」，于是弹出「连接不安全」的警告。代码里把它设成 `false`，等于手动关掉了这个校验——**开发环境可以这么干，生产环境绝不能**。这正是后面「证书信任链」要讲透的东西。

### 5. Charles 抓包：中间人是怎么「看到」HTTPS 明文的

日常调试 HTTPS 接口，几乎每个前端/后端都用过 Charles（或 Fiddler）。但你有没有想过：**HTTPS 不是加密的吗，Charles 凭什么能抓到明文？**

答案：Charles 不是「破解」了加密，而是**让自己变成受信任的中间人**。它的原理是：

1. 把 Charles 自己的**根证书**安装到系统的信任列表里——这样你的客户端（浏览器/App）就「信任」了 Charles
2. 客户端发起请求时，其实是在和 Charles 建立 TLS 连接（**第一段**），用的是 Charles 签发的证书，客户端因为信任了 Charles 的根证书所以不报警
3. Charles 解密这第一段的数据，再以「客户端」的身份去和真实服务器建立**第二段** TLS 连接
4. 数据在客户端和真实服务器之间，被拆成了「客户端 ↔ Charles」和「Charles ↔ 真实服务器」两段独立加密，Charles 在中间拿到了明文

```
客户端 ──(TLS 连接①，Charles 签的证书)──▶ Charles ──(TLS 连接②，真实证书)──▶ 真实服务器
               明文在 Charles 手里可读
```

这就是**中间人攻击（MITM）的标准姿势**——它之所以能成功，是因为「信任被转移了」：本来你信任的是真实服务器，现在你误信了 Charles。理解这个机制，是理解后面 **Certificate Pinning**（证书锁定）为什么能反制它的关键——Pinning 会在客户端预置「真实服务器的证书指纹」，即便 Charles 用自己（受系统信任的）证书冒充，指纹对不上，连接照样被拒绝。

### 6. HSTS 响应头：强制浏览器永远走 HTTPS

HTTPS 最大的一个历史遗留问题是「降级攻击」：用户输入 `http://drug.example.com`（或点了一个 `http://` 链接），浏览器先发了一个明文的 HTTP 请求，中间人就可以在这「第一次明文跳转」的窗口期做手脚。

HSTS（HTTP Strict Transport Security）就是服务端告诉浏览器「以后访问我，一律用 HTTPS」的指令。配置方法很简单，服务端返回一个响应头：

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

- `max-age=31536000`：浏览器缓存这条指令 **365 天**（31536000 秒），这段时间内访问这个域名，一律在浏览器内部直接升级成 HTTPS，**根本不发出那个明文 HTTP 请求**
- `includeSubDomains`：连子域名（`static.drug.example.com`）也一起强制 HTTPS

后面「设计与原理」会展开 HSTS 的局限（首次访问窗口期）和 HSTS Preload List 的解法。

### 7. Certificate Pinning：医院 HIS 对接检验设备的防伪造

最后一个实践场景，落在医疗业务里最典型的落地：**医院 HIS 系统对接第三方检验设备接口**。

检验设备（血常规仪、生化仪）通过接口把检验结果回传给 HIS。这条链路如果被中间人伪造证书劫持，伪造的检验数据进入病历，后果是医疗级别的严重。而这类设备往往运行在企业内网，是最容易被「装了抓包工具、替换了受信任根证书」的中间人攻击的场景。

Certificate Pinning（证书锁定）的思路是：**客户端（HIS 端）在代码里预置目标检验设备服务器证书的指纹（哈希），TLS 握手时拿到服务端实际证书，计算它的指纹和预置值比对，不一致就拒绝连接**。这样即使攻击者让客户端信任了一个伪造的中间人证书，指纹对不上，连接依然建立不起来。

> 这里先记住 Pinning 的「防御对象」和「实现要点」，具体原理和公钥锁定（Public Key Pinning）的细节放在第二节第 8 小节讲透。

---

## 二、设计与原理

这是本篇的核心。下面九个小节按「动机 → 信任 → 协商 → 改进 → 加固」的主线，由浅入深把 HTTPS 的每一块拼图讲透。

### 1. 为什么用混合加密模式（动机）

HTTPS 最核心的设计决策，就藏在这句话里：**非对称加密协商密钥，对称加密传输数据**。为什么不能只用一种？先分别看清两种加密的「性格」。

**对称加密**：加密和解密用**同一个密钥**，速度快、计算量小，适合加密大量数据。但有个致命问题——**这个密钥怎么安全地交给对方？** 互联网上没有一条「安全通道」能让你把密钥悄悄递给对方而不被中间人看到。

最简单、最古老的对称加密是凯撒密码——把每个字符按密钥偏移固定位数：

![凯撒密码：密钥 3，明文 abc 变密文 def](https://cdn.nlark.com/yuque/0/2021/png/738210/1638198234954-9d79ced0-cfe5-4e52-b75f-0d839a36d783.png)

```javascript
const secretKey = 3;
const encrypt = (str) => {
  const buffer = Buffer.from(str);
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = buffer[i] + secretKey;
  }
  return buffer.toString();
}

const decrypt = (str) => {
  const buffer = Buffer.from(str);
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = buffer[i] - secretKey;
  }
  return buffer.toString();
}

const message = 'abc';
const secret = encrypt(message);
console.log(secret); // def
const value = decrypt(secret);
console.log(value); // abc
```

真实的对称加密用 AES，核心 API 是 `crypto.createCipheriv(algorithm, key, iv)`：

![对称加密：双方用同一个密钥](https://cdn.nlark.com/yuque/0/2021/png/738210/1638198675504-f4ace31b-4e55-4b2c-9134-e2a69c8a350c.png)

```javascript
const crypto = require('crypto');

const algorithm = 'aes-128-cbc';
const encrypt = (data, key, iv) => {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  cipher.update(data); // hex,16进制的意思，把结果输出成16进制字符串
  return cipher.final('hex');
}

const decrypt = (data, key, iv) => {
  const cipher = crypto.createDecipheriv(algorithm, key, iv);
  cipher.update(data, 'hex'); // hex,16进制的意思，把结果输出成16进制字符串
  return cipher.final('utf8'); // 输出成utf-8字符串
}

const key = '1234567890123456'; // aes-128 需要 16 字节密钥
const iv = '1234567890123456';
const data = 'welcome 世界';
const encryptedData = encrypt(data, key, iv);
console.log(encryptedData); // 86d6a28536e829442eccbc0f791a892f
const decryptedData = decrypt(encryptedData, key, iv);
console.log(decryptedData);// welcome 世界
```

> 注意算法名里的数字：`aes-128` 对应 16 位（字节）密钥，`aes-256` 对应 32 位密钥。密钥越长越安全，但计算也略慢。

**非对称加密**：公钥加密、私钥解密。它的妙处在于——**公钥可以公开，谁都能拿到，但只有持有私钥的人能解密**。这样就不需要「悄悄传递密钥」了：服务端把公钥公开，客户端用公钥加密数据发过去，只有服务端用私钥能解开。

但它也有短板：**计算开销大、速度慢**，不适合加密大量数据。所以它只用来干一件事——**把对称密钥安全地「运」过去**。

非对称加密的安全性，建立在「单向函数」上：正向计算容易，逆向极其困难。RSA 的基础是**整数分解**——两个大质数相乘很容易，但给你乘积，想反推出是哪两个质数相乘（尤其 1024 位二进制数），数学上无解。

用一个极小的例子看懂 RSA 的完整流程：

![RSA 加密算法原理](https://cdn.nlark.com/yuque/0/2025/png/738210/1752305899785-177b24e1-184f-491b-9e90-5adf858449af.png)

```javascript
/**
 * 现在实现一个RSA非对称加密算法
 * 加密用的密钥和解密用的密钥不一样
 * 但是它们有关系，你不能通过公钥算出密钥
 * 两个质数相乘得到一个结果，正向乘很容易，但是给你一个乘积，你不知道它们是由哪个数乘出来的
 * p*q=k
 */
const p = 3;
const q = 11;
const N = p * q; // 33
const fN = (p - 1) * (q - 1); // 欧拉函数
const e = 7; // 随意挑选一个指数e
// {e，N} {7, 33}就成为我们的公钥，公钥可以发给任何人，是公开的
// 公钥和密钥，是一对，公钥加密数据要用密钥解密，密钥加密数据要用公钥解密
// 我们可以从公钥去推算私钥，但是前提是你知道fN
for (var d  = 1; e * d % fN !== 1; d ++) {
  // console.log(d);
  // d++;
}
console.log(d); // 3

const publicKey = {e, N}
const privateKey = {d, N}

const encrypt = (data) => {
  return Math.pow(data, publicKey.e) % publicKey.N;
}

const decrypt = (data) => {
  return Math.pow(data, privateKey.d) % privateKey.N;
}

const data = 5;
const secret = encrypt(data);
console.log(secret); // 14
const original = decrypt(secret);
console.log(original); // 5

// 1024 位二进制数分解
/**
 * 公开 N e
 * 私密 d
 * e * d % fN == 1
 * (p - 1) * (q - 1)
 * N = p * q
 */
```

真实工程里用 Node.js 的 `crypto` 生成 RSA 密钥对并加解密：

```javascript
const { generateKeyPairSync, privateEncrypt, publicDecrypt } = require('crypto');

const passphrase = 'server_passphrase';
const rsa = generateKeyPairSync('rsa', {
  modulusLength: 1024,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',
    passphrase
  }
});

const message = 'welcome 世界';
const enc_by_prv = privateEncrypt({
  key: rsa.privateKey, passphrase
}, Buffer.from(message, 'utf8'));
console.log(enc_by_prv.toString('hex'), enc_by_prv.toString('hex').length);
// 1077bb8bda3e1152f563a6d478d737421d4b7b72997b9a45df618bc39f005105...
// 256

const dec_by_pub = publicDecrypt(rsa.publicKey, enc_by_prv);
console.log(dec_by_pub.toString('utf8')); // welcome 世界
```

> 注意这段是「私钥加密、公钥解密」，和「公钥加密、私钥解密」是**相反的两个用途**：公钥加密私钥解密用来**加密数据**，私钥加密公钥解密用来**数字签名**。后面讲签名时会用到这个「反过来」的用法。

**哈希（散列）函数**是第三个零件——它给任意长度的数据生成一个**固定长度**的「指纹」，用来做完整性校验（防篡改）。三个特性：**单向**（能算哈希值、不能反推原文）、**独一无二**（不同数据几乎不可能产生相同哈希）、**长度固定**。

```javascript
const crypto = require('crypto');

const content = 'welcome 世界';
const md5Hash = crypto.createHash('md5').update(content).update(content).digest('hex');
console.log(md5Hash, md5Hash.length);
// 965c28eb2f7f22374221488e772efb51 32
```

```javascript
const crypto = require('crypto');

const content = 'welcome 世界';
const salt = '123456abcdef';
const shaHash1 = crypto.createHmac('sha256', salt).update(content).update(content).digest('hex');
const shaHash2 = crypto.createHmac('sha256', salt).update(content + content).digest('hex');
const shaHash3 = crypto.createHmac('sha256', salt).update(content).digest('hex');
console.log(shaHash1, shaHash1.length);
console.log(shaHash2, shaHash2.length);
console.log(shaHash3, shaHash3.length);
// d3d6ffe01375bf5c972a3e559662182af4769c7ed895ecd858ac67463f790554 64
// d3d6ffe01375bf5c972a3e559662182af4769c7ed895ecd858ac67463f790554 64
// 69b33f11ff01a347060773a94ea2ee40bba01532581ac25ce2bccb82c4089d64 64
```

> 注意 MD5 输出 32 位（128 bit）、SHA256 输出 64 位（256 bit）。哈希长度越长，碰撞概率越低——这是「为什么密码摘要现在都用 SHA256 而不用 MD5」的根本原因（MD5 已被证明可以构造碰撞）。

把三个零件拼起来，就是 HTTPS 的混合加密策略：**用非对称加密安全地把「一个临时的对称密钥」协商出来，之后所有数据都用这个对称密钥加密传输**。既解决了对称加密「密钥难分发」的问题，又解决了非对称加密「速度慢」的问题——两个短板互相补齐。

> 💬 **面试官**：HTTPS 为什么要用「混合加密」，而不直接用非对称加密传数据？
>
> ✅ 标准答案：非对称加密（RSA/ECDHE）安全性高但**计算开销大、速度慢**，不适合直接加密大量传输数据；对称加密（AES）速度快但需要双方**提前共享同一个密钥**，而密钥怎么安全分发本身就是难题。HTTPS 的做法是**先用非对称加密安全地协商出一个对称密钥，后续所有数据传输都用这个对称密钥**——兼顾了「密钥分发的安全」和「数据传输的效率」。
>
> 🎁 加分答案：能点出「非对称加密只用来做两件『小』事」——① 协商对称密钥（密钥交换），② 签名验签（身份认证），而「加密大块数据」这件『大』事始终交给对称加密。再加一句：这也是为什么 TLS 1.3 把密钥交换算法（ECDHE）和签名算法（RSA/ECDSA）拆成了两个独立的概念——前者负责「协商出共享密钥」，后者负责「证明你是谁」。

### 2. 数字签名与数字证书（信任的基石）

对称加密 + 非对称加密解决了「防窃听」和「密钥分发」，但还有一个更隐蔽的问题没解决：**客户端怎么知道拿到的公钥，真的属于它要访问的那台服务器？** 如果中间人在密钥交换时把自己伪造的公钥发给客户端，客户端就会把数据加密给中间人——这就是「冒充」风险。

数字签名是解决「身份」的第一步。它的原理是**用私钥签名、用公钥验签**：

![数字签名：私钥加密（签名）、公钥解密（验签）](https://cdn.nlark.com/yuque/0/2025/png/738210/1752305950224-5624afd0-a2e5-45c6-9457-579456eb1936.png)

![签名与验签流程](https://cdn.nlark.com/yuque/0/2025/png/738210/1752305965097-e9b79498-9981-4c97-bd22-261946759922.png)

为什么「私钥签名」能证明身份？因为**私钥只有持有者自己知道**。签名者用私钥对数据签名，任何人拿他的公钥都能验证「这个签名确实是那个私钥的主人签的」——签名的存在，就证明了「这份数据确实来自私钥持有者」。

```javascript
const { generateKeyPairSync, createSign, createVerify } = require('crypto');

/**
 * 数字签名和数字证书实现过程
 * 内部是这样实现的，如何知道签名是否正确？
 * 验证方先拿到文件file，然后用publicKey计算签名sign，如果跟对方的sign匹配，则验证通过
 */

// 生成一对密钥，一个是公钥，一个是私钥
const rsa = generateKeyPairSync('rsa', {
  modulusLength: 1024,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem' // base64格式的公钥
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',
    passphrase: 'passphrase' // 私钥的秘密
  }
});

const file = 'welcome 世界';

// 先创建签名对象
const signObj = createSign('RSA-SHA256');
// 放入文件内容
signObj.update(file);
// 用rsa私钥签名，输出一个16进制的字符串
const sign = signObj.sign({
  key: rsa.privateKey,
  format: 'pem',
  passphrase: 'passphrase'
}, 'hex');
console.log(sign, sign.length);
// 208ae06bbfd447a0829341cd71aaa089be9b5ce27c4a1d82a00ea5fe9f658323... 256

// 创建验证签名对象
const verifyObj = createVerify('RSA-SHA256');
// 放入文件内容
verifyObj.update(file);
//验证签名是否合法
const isValid = verifyObj.verify(rsa.publicKey, sign, 'hex');
console.log(isValid);
// true
```

但签名只解决了「这份数据来自私钥持有者」，没解决「这个私钥持有者，是不是我要找的那个 `drug.example.com`」——因为客户端手里拿到的「公钥」本身可能是伪造的。**数字证书**就是为了解决这个问题：引入一个**可信的第三方（CA，Certificate Authority）**，由它来证明「这个公钥属于谁」。

数字证书的本质是：**一份被 CA 用自己的私钥签名过的、关于「谁（域名/机构）拥有哪个公钥」的电子文件**。

![数字证书的签发与验证过程](https://cdn.nlark.com/yuque/0/2025/png/738210/1752305989657-e238e4b1-14a4-42ad-bf65-dcf20e4418e2.png)

这个过程用代码模拟一遍，就能彻底理解证书的「签发」和「验证」：

```javascript
const { generateKeyPairSync, createSign, createVerify, createHash } = require('crypto');

const passphrase = 'passphrase';
const serverRsa = generateKeyPairSync('rsa', {
  modulusLength: 1024,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem', cipher: 'aes-256-cbc', passphrase }
});

const caRsa = generateKeyPairSync('rsa', {
  modulusLength: 1024,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem', cipher: 'aes-256-cbc', passphrase }
});

const info = {
  domain: 'http://127.0.0.1:8080',
  publicKey: serverRsa.publicKey
}

// 把这个申请信息发给CA机构请求颁发证书
// 实现的时候签名的并不是info，而是它的hash，性能很差，一般不能计算大量数据
const hash = createHash('sha256').update(JSON.stringify(info)).digest('hex');

const sign = getSign(hash, caRsa.privateKey, passphrase);

// 这就是证书，客户端会先验证证书，用CA的公钥验证证书的合法性，然后取出服务器的公钥
const cert = {
  info,
  sign
}
const valid = verifySign(hash, cert.sign, caRsa.publicKey);
console.log('浏览器验证CA的签名:', valid);
// 拿到了serverPublicKey之后，如果想向服务器发送数据，就用这个key加密
console.log('cert:', cert.info.publicKey);

function getSign(content, privateKey, passphrase) {
  const signObj = createSign('RSA-SHA256');
  signObj.update(content);
  return signObj.sign({ key: privateKey, format: 'pem', passphrase }, 'hex')
}

function verifySign(content, sign, publicKey) {
  const verifyObj = createVerify('RSA-SHA256');
  verifyObj.update(content);
  return verifyObj.verify(publicKey, sign, 'hex');
}
```

这段代码揭示了证书的两个关键点：**① 证书里装的是「服务器公钥 + 域名信息」；② 证书的合法性靠「用 CA 公钥验证 CA 的签名」来确认**。客户端拿到证书后，用内置的 CA 公钥验证签名，验证通过就取出证书里的服务器公钥——这个公钥才是可信的。

### 3. 证书信任链（握手前的信任前提）

上面讲的是「单个 CA 直接签服务器证书」。但现实里 CA 有严格的层级，证书是一级一级签出来的——这就是**证书信任链**，也是理解「自签名证书为什么浏览器会警告」的关键。

一张数字证书里，有几个和信任链直接相关的字段：

| 字段 | 含义 |
|------|------|
| **Issuer** | 证书的发布机构（哪个权威第三方签发的这个证书） |
| **Subject** | 证书所有者（公司名、机构名、网站域名等） |
| **Valid from / Valid to** | 证书有效期，过了有效期证书作废 |
| **Public key** | 权威第三方给申请者配发的公钥 |
| **Signature algorithm** | 用什么算法对指纹加密（指纹的加密结果就是数字签名） |
| **Thumbprint** | 指纹（哈希结果），用来确保证书内容不被篡改 |

**信任链是这样构成的**：浏览器/操作系统里**内置了一批受信任的根 CA 证书**（这是信任的「锚点」）。网站的叶证书通常由**中间 CA** 签发，中间 CA 又由**根 CA** 签发，形成一条「叶 → 中间 → 根」的链：

```
根 CA（内置在浏览器/OS 里，绝对信任）
   │  用自己的私钥签名
   ▼
中间 CA（受根 CA 信任）
   │  用自己的私钥签名
   ▼
叶证书（网站 drug.example.com 的证书）
```

浏览器验证时，从叶证书开始**逐级向上验证签名**：用中间 CA 的公钥验证叶证书的签名 → 用根 CA 的公钥验证中间 CA 的签名 → 直到找到一个内置信任的根 CA，整条链验证通过，才认为这个证书合法。

**为什么用信任链、而不是让根 CA 直接签所有证书？** 四个原因：

- **保证根证书安全**：根证书私钥如果直接签海量证书，泄漏风险极高。把它「藏」起来、只用来签少数几个中间 CA，中间 CA 去签具体证书，根私钥就安全得多
- **交叉证书**：用已有的根证书签署新的根证书，实现证书体系的平滑迁移
- **划分二级 CA**：不同业务线/地域用不同的中间 CA，便于隔离和吊销
- **委派**：给某个组织/公司签一个二级 CA，但限制它只能签自己拥有的域名

**自签名证书为什么浏览器会警告？** 因为它**绕过了这条信任链**——自签名证书的 Issuer 就是它自己（自己给自己签名），浏览器沿着「叶 → 中间 → 根」往上找，找不到任何一个内置信任的根 CA 认它，于是判定「不受信任」，弹出警告。你第 4 小节里 `rejectUnauthorized: false` 关掉的，就是这个「向上找根」的校验。

> 💬 **面试官**：证书信任链是怎么工作的？自签名证书为什么浏览器会警告？
>
> ✅ 标准答案：浏览器/操作系统内置了一批受信任的**根 CA 证书**作为信任锚点。网站叶证书通常由中间 CA 签发，中间 CA 由根 CA 签发，形成「叶 → 中间 → 根」的信任链。浏览器验证时**从叶证书开始逐级向上验证签名**，直到找到一个内置信任的根 CA 即认为合法。自签名证书的 Issuer 是它自己、绕过了这条链，浏览器找不到信任的根，所以弹警告。
>
> 🎁 加分答案：能补充两点——① **为什么要分链**：把根私钥「藏」起来只签中间 CA，防止根私钥因频繁签名而泄漏，也便于中间 CA 的吊销和委派；② 验证链的实际动作是「逐级验签 + 检查有效期 + 检查域名匹配（Subject Alternative Name）+ 检查吊销状态（CRL/OCSP）」，不是只看「有没有签名」这一个维度。再点一句：Charles 抓包的本质，就是往这条链里「插入」一个你自己信任的中间 CA——所以理解了信任链，就理解了中间人攻击。

### 4. TLS 1.2 四次握手全过程（协商 · 重点）

信任讲完了，现在进入 HTTPS 最核心、也最常被考的部分：**TLS 握手**——两端怎么在「不安全」的网络里，安全地协商出「安全」的会话密钥。

TLS 1.2 的握手，可以归纳为**四次往返（四段）**，但里面包含十几条具体消息。先用一张图看全貌：

![TLS 握手 10 条消息的完整流程](https://cdn.nlark.com/yuque/0/2025/png/738210/1752305768845-0bdfed67-e18e-46b8-8fcd-3108a350792e.png)

Wireshark 抓一次真实 TLS 连接，能看到这些消息按顺序发出：

![Wireshark 抓到的 TLS 握手消息序列](https://cdn.nlark.com/yuque/0/2025/png/738210/1752305761344-ff0cd07e-b508-44bd-bcb7-982abe171367.png)

我们把这个过程拆成 10 条消息（对应后面 UDP 模拟代码里的 10 个 case）：

**第①段：ClientHello**（客户端 → 服务端）
客户端发起握手，发出第一条消息，内容包含：
- **Version**：客户端支持的最高 TLS 协议版本
- **Random**：32 字节随机数（28 随机字节 + 4 字节时间戳），保证每次连接唯一
- **Cipher Suites**：客户端支持的所有密码套件列表
- **Extensions**：扩展的额外数据

![ClientHello 抓包](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814836511-cd43251b-650c-4f2a-80fa-81ba846e0d8a.png)

**第②段：ServerHello + Certificate + ServerKeyExchange + ServerHelloDone**（服务端 → 客户端）

- **ServerHello**：服务端从客户端提议的套件里**选定一个**，返回选定的套件、自己的随机数。结构和 ClientHello 类似，但每个字段只有一个选项。

![ServerHello 抓包](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814837482-19aad16f-069a-43e2-ab7d-f501e8910da9.png)

![ServerHello 选定的密码套件](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814837810-477267c3-51f9-443a-92de-dac0a3bcdecd.png)

- **Certificate**：服务端发送自己的 X.509 证书链，客户端用来验证身份并取出服务器公钥。

![Certificate 抓包](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814837690-9e68af3a-0b2a-4491-8ba1-6773d8317453.png)

- **ServerKeyExchange**：如果是 ECDHE 密钥交换，服务端在这里发送自己的**临时 DH 公钥参数**，并用服务器私钥对这些参数**签名**（防止被中间人篡改）。

![ServerKeyExchange 抓包](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814838915-ccc0380d-7d80-4d91-8f6c-bcf08ab3130b.png)

- **ServerHelloDone**：服务端表示「我这边的握手消息发完了」。

![ServerHelloDone 抓包](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814838888-6c508175-0794-4687-8b4e-1ea1a07609c6.png)

**第③段：ClientKeyExchange + ChangeCipherSpec + EncryptedHandshakeMessage**（客户端 → 服务端）

- **ClientKeyExchange**：客户端发送自己的 DH 公钥参数。**双方各自用自己的私钥 + 对方的公钥，算出同一个 pre-master secret**（这是 DH 的神奇之处，下一小节展开），再由 pre-master secret + 两个随机数派生出最终的会话密钥。

![ClientKeyExchange 抓包](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814838897-0ccc22af-2503-4d24-8672-e81eca954494.png)

- **ChangeCipherSpec**：客户端通知服务端「我已经生成密钥，接下来切换成加密模式」。

![ChangeCipherSpec 抓包](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814839056-635a8a81-5f67-4762-acce-18ffc0fdef18.png)

- **EncryptedHandshakeMessage**：客户端用协商好的对称密钥，把自己整个握手过程中「收到和发出的所有数据」算哈希后加密，发给服务端。这个报文有两个目的：**① 校验密钥正确性**（这是用对称密钥加密的第一个报文，加解密成功说明密钥对了）；**② 防篡改**（把整个握手过程哈希一遍，保证中间没人改过报文）。

![EncryptedHandshakeMessage 抓包](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814840240-d706da91-ff0b-4c9c-938c-4da576d328f1.png)

**第④段：ChangeCipherSpec + EncryptedHandshakeMessage**（服务端 → 客户端）
服务端也切换加密模式，回复自己的加密握手消息。**双方 Finished 消息验证通过，握手完成**，之后进入用会话密钥对称加密的正常数据传输。

> 关于会话密钥的派生，一句话串起来：`master secret = f(pre-master secret + client_random + server_random)`，`session key = f(master secret + client_random + server_random)`。两个随机数的作用，是保证**即使 pre-master secret 相同，每次连接的会话密钥也不同**。下面的密钥派生图直观展示了这个过程：

![会话密钥派生过程](https://cdn.nlark.com/yuque/0/2025/png/738210/1752306044573-b394ec90-03e2-4ce5-823b-9efacc0fc549.png)

**为了彻底搞懂握手，最好的方式是手写还原一次。** 下面是笔记里用 Node.js `dgram`（UDP）模块完整模拟 TLS 握手的 5 个文件——它把上面 10 条消息抽象成 10 个 `type`，真实地跑了一遍「证书验证 → DH 密钥交换 → 会话密钥派生 → 加密通信」的完整流程。

首先是 CA 的密钥生成 `createCA.js`：

```javascript
const ca_passphrase = 'ca';
let CA = generateKeyPairSync('rsa', {
  modulusLength: 1024,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',
    passphrase: ca_passphrase
  }
});
let fs = require('fs');
let path = require('path');
fs.writeFileSync(path.resolve(__dirname, 'CA.publicKey'), CA.publicKey);
fs.writeFileSync(path.resolve(__dirname, 'CA.privateKey'), CA.privateKey);
```

CA 签发证书 `ca.js`：

```javascript
const { createHash } = require('crypto');
const { getSign } = require('./utils');
const ca_passphrase = 'ca';
const fs = require('fs');
const path = require('path');
let cAPrivateKey = fs.readFileSync(path.resolve(__dirname, 'CA.privateKey'), 'utf8');
function requestCert(info) {
  const infoHash = createHash('sha256').update(JSON.stringify(info)).digest('hex');
  const sign = getSign(infoHash, cAPrivateKey, ca_passphrase);
  return { info, sign };
}
exports.requestCert = requestCert;
```

工具函数 `utils.js`：

```javascript
const { createCipheriv, createDecipheriv, createSign, createVerify } = require('crypto');
function encrypt(data, key) {
  let decipher = createCipheriv('aes-256-cbc', key, '1234567890123456');
  decipher.update(data);
  return decipher.final('hex');
}

function decrypt(data, key) {
  let decipher = createDecipheriv('aes-256-cbc', key, '1234567890123456');
  decipher.update(data, 'hex');
  return decipher.final('utf8');
}
function getSign(content, privateKey, passphrase) {
  var sign = createSign('RSA-SHA256');
  sign.update(content);
  return sign.sign({ key: privateKey, format: 'pem', passphrase }, 'hex');
}
function verifySign(content, sign, publicKey) {
  var verify = createVerify('RSA-SHA256');
  verify.update(content);
  return verify.verify(publicKey, sign, 'hex');
}
module.exports = {
  encrypt, decrypt, getSign, verifySign
}
```

服务端 `udp_server.js`（这是握手的核心，注释里的序号对应上面 10 条消息）：

```javascript
const dgram = require('dgram')
const udp_server = dgram.createSocket('udp4')
const protocol = require('./protocol');
const { generateKeyPairSync, randomBytes, createHash, createECDH } = require('crypto');
const server_passphrase = 'server';
const { getSign, decrypt, encrypt } = require('./utils');
const { requestCert } = require('./ca');

let serverRSA = generateKeyPairSync('rsa', {
  modulusLength: 1024,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',
    passphrase: server_passphrase
  }
});
let serverRandom = randomBytes(8).toString('hex');
const serverInfo = {
  domain: "http://127.0.0.1:20000",
  publicKey: serverRSA.publicKey
};
let serverCert = requestCert(serverInfo);
let clientRandom;
const serverDH = createECDH('secp521r1');
const ecDHServerParams = serverDH.generateKeys().toString('hex');
const ecDHServerParamsSign = getSign(ecDHServerParams, serverRSA.privateKey, server_passphrase);
let masterKey;
let sessionKey;
udp_server.on('listening', () => {
  const address = udp_server.address();
  console.log(`client running ${address.address}: ${address.port}`)
})
udp_server.on('message', (data, remote) => {
  let message = JSON.parse(data);
  switch (message.type) {
    case protocol.ClientHello:
      //2.在服务器生成随机数，通过ServerHello发送给客户端
      clientRandom = message.clientRandom;
      udp_server.send(JSON.stringify({
        type: protocol.ServerHello,
        serverRandom,//服务器端随机数
        cipherSuite: 'TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA'//约定的加密套件
      }), remote.port, remote.address);
      //3.Certificate 服务器把包含自己公钥的证书发送给客户端进行验证
      udp_server.send(JSON.stringify({
        type: protocol.Certificate,
        serverCert,//服务器公钥证书
      }), remote.port, remote.address);
      //4.ServerKeyExchange 服务器端生成DH参数，并用服务器私钥进行签名发给客户端
      udp_server.send(JSON.stringify({
        type: protocol.ServerKeyExchange,
        ecDHServerParams,
        ecDHServerParamsSign
      }), remote.port, remote.address);
      //5.Server Hello Done 服务器发送完成
      udp_server.send(JSON.stringify({
        type: protocol.ServerHelloDone
      }), remote.port, remote.address);
      break;
    case protocol.ClientKeyExchange:
      //6.ClientKeyExchange 服务器收到客户端DH参数后加上服务器DH参数生成pre-master-key
      //再由pre-master-key生成masterKey和sessionKey
      let { ecDHClientParams } = message;
      preMasterKey = serverDH.computeSecret(Buffer.from(ecDHClientParams, 'hex')).toString('hex');
      masterKey = createHash('md5').update(preMasterKey + clientRandom + serverRandom).digest('hex');
      sessionKey = createHash('md5').update(masterKey + clientRandom + serverRandom).digest('hex');
      break;
    case protocol.ChangeCipherSpec:
      //9.服务器通知客户端服务器也已经准备好切换加密套件了
      udp_server.send(JSON.stringify({
        type: protocol.ChangeCipherSpec
      }), remote.port, remote.address);
      break;
    case protocol.EncryptedHandshakeMessage:
      console.log("服务器收到解密后的数据:", decrypt(message.data, sessionKey));
      //10.服务器收到客户端的加密数据后向客户端回复加密数据
      udp_server.send(JSON.stringify({
        type: protocol.EncryptedHandshakeMessage,
        data: encrypt("i am server", sessionKey)
      }), remote.port, remote.address);
      break;
    default:
      break;
  }

})
udp_server.on('error', (error) => {
  console.log(error);
});
udp_server.bind(20000, '127.0.0.1');
```

客户端 `udp_client.js`：

```javascript
const dgram = require('dgram')
const udp_client = dgram.createSocket('udp4')
const { randomBytes, createHash, createECDH } = require('crypto');
const { verifySign, encrypt, decrypt } = require('./utils');
const url = require('url');
const protocol = require('./protocol');
const fs = require('fs');
const path = require('path');
const cAPublicKey = fs.readFileSync(path.resolve(__dirname, 'CA.publicKey'), 'utf8');
const clientRandom = randomBytes(8).toString('hex');
let serverRandom;
let serverPublicKey;
let ecDHServerParams;
let clientDH = createECDH('secp521r1');
let ecDHClientParams = clientDH.generateKeys();
let masterKey;
let sessionKey;
udp_client.on('listening', () => {
  const address = udp_client.address();
  console.log(`client running ${address.address}: ${address.port}`)
})
udp_client.on('message', (data, remote) => {
  let message = JSON.parse(data.toString('utf8'));
  switch (message.type) {
    case protocol.ServerHello:
      serverRandom = message.serverRandom;
      break;
    case protocol.Certificate:
      //3.Certificate 客户收到服务器证书后会用CA的公钥进行验证证书是否合法
      let { serverCert } = message;
      let { info, sign } = serverCert;
      serverPublicKey = info.publicKey;
      const serverInfoHash = createHash('sha256').update(JSON.stringify(info)).digest('hex');
      let serverCertIsValid = verifySign(serverInfoHash, sign, cAPublicKey);
      console.log('验证服务器端证书是否正确?', serverCertIsValid);
      let urlObj = url.parse(info.domain);
      let serverDomainIsValid = urlObj.hostname === remote.address && urlObj.port == remote.port;
      console.log('验证服务器端域名正确?', serverDomainIsValid);
      break;
    case protocol.ServerKeyExchange:
      //4.ServerKeyExchange 客户端收到服务器的DH参数和参数签名后会用服务器的公钥进行签名，验证服务器拥有私钥
      ecDHServerParams = message.ecDHServerParams;
      ecDHServerParamsSign = message.ecDHServerParamsSign;
      let serverDHParamIsValid = verifySign(ecDHServerParams, ecDHServerParamsSign, serverPublicKey);
      console.log('验证服务器端证书DH参数是否正确?', serverDHParamIsValid);
      break;
    case protocol.ServerHelloDone:
      //6.ClientKeyExchange 客户端生成DH参数并且发给服务器
      udp_client.send(JSON.stringify({
        type: protocol.ClientKeyExchange,
        ecDHClientParams
      }), remote.port, remote.address);
      //6.ClientKeyExchange 服务器收到客户端DH参数后加上服务器DH参数生成pre-master-key
      //再由pre-master-key生成masterKey和sessionKey
      preMasterKey = clientDH.computeSecret(Buffer.from(ecDHServerParams, 'hex')).toString('hex');
      masterKey = createHash('md5').update(preMasterKey + clientRandom + serverRandom).digest('hex');
      sessionKey = createHash('md5').update(masterKey + clientRandom + serverRandom).digest('hex');
      //7.Change Cipher Spec 通知服务器客户端已经准备好切换成加密通信了
      udp_client.send(JSON.stringify({
        type: protocol.ChangeCipherSpec
      }), remote.port, remote.address);
      //8.加密握手信息并传送给服务器端
      udp_client.send(JSON.stringify({
        type: protocol.EncryptedHandshakeMessage,
        data: encrypt("i am client", sessionKey)
      }), remote.port, remote.address);
      break;
    case protocol.EncryptedHandshakeMessage:
      //10.客户端你好到服务器的加密握手数据
      //这个报文的目的就是告诉对端自己在整个握手过程中收到了什么数据，发送了什么数据。来保证中间没人篡改报文
      console.log("客户端收到解密后的数据:", decrypt(message.data, sessionKey));
      break;
    default:
      break;
  }
})
udp_client.on('error', (error) => {
  console.log(error);
});
//1.ClientHello 客户端向服务器发送客户端随机数，服务器需要保存在服务器端
udp_client.send(JSON.stringify({
  type: protocol.ClientHello,
  clientRandom
}), 20000, '127.0.0.1');
```

这段代码值得你对着上面 10 条消息一行行读一遍——**它把「证书验证」「DH 密钥交换」「会话密钥派生」「加密握手校验」这四件 TLS 握手最核心的事，全部还原成了可运行、可打印的代码**。读完它，「握手到底发生了什么」就从抽象概念变成了具体的 `computeSecret` / `verifySign` / `createHash` 调用。

> 💬 **面试官**：讲一下 TLS 1.2 的握手过程，每一步在做什么？
>
> ✅ 标准答案：① ClientHello：客户端发协议版本、随机数、支持的密码套件列表；② ServerHello + Certificate + ServerKeyExchange：服务端选定套件、发随机数，发自己的证书（客户端验签取公钥），发 DH 临时公钥参数（用私钥签名）；③ ClientKeyExchange + ChangeCipherSpec + Finished：客户端发自己的 DH 参数，两端各自算出相同的 pre-master secret，再结合两个随机数派生会话密钥，随后切换加密、发加密的 Finished 校验；④ 服务端也切换加密、回 Finished，握手完成，后续对称加密通信。
>
> 🎁 加分答案：能点出几个容易被追问的细节——① **两个随机数的作用**是保证「即使 pre-master secret 相同，每次会话密钥也不同」，防重放；② **ServerKeyExchange 为什么要签名**：ECDHE 是「临时」密钥，没有证书背书，必须用服务器的长期私钥签个名，防止中间人替换临时公钥；③ **EncryptedHandshakeMessage（Finished）的双重作用**：既是「用对称密钥加密的第一个报文」验证密钥正确性，又是「整个握手过程哈希」防篡改。再加一句：RSA 密钥交换模式没有 ServerKeyExchange，因为它是用「证书里的公钥直接加密 pre-master secret」，这个差异正是下一小节前向保密的关键。

### 5. ECDHE 与前向保密（改进 · 重点）

上一小节埋了一个关键区别：密钥交换有两种算法——**RSA 密钥交换**和 **ECDHE 密钥交换**。理解它们的差异，是理解「前向保密」和「为什么 TLS 1.3 废弃 RSA」的钥匙。

先理解 ECDHE 的数学基础——**Diffie-Hellman（DH）密钥交换**。它的神奇之处在于：**双方在不传输密钥本身的情况下，各自算出同一个共享密钥**。用一个「调色」的经典类比：

![DH 密钥交换：颜料类比](https://cdn.nlark.com/yuque/0/2025/png/738210/1752306012547-5361db15-382b-43f1-8176-42dd7bde1329.png)

用代码看它的原理，就一目了然了：

```javascript
const N = 23;       // 公开的模数
const p = 5;        // 公开的底数
const secret1 = 6;  // 这是密钥（客户端私有）
const A = Math.pow(p, secret1) % N; // 8，客户端公钥
console.log(`p=${p}, N=${N}, A=${A}`);

const secret2 = 15; // 这是密钥（服务端私有）
const B = Math.pow(p, secret2) % N; // 19，服务端公钥
console.log(`p=${p}, N=${N}, B=${B}`);

console.log(Math.pow(A, secret2) % N); // 2，服务端用自己的私钥 + 客户端公钥算出的共享密钥
console.log(Math.pow(B, secret1) % N); // 2，客户端用自己的私钥 + 服务端公钥算出的共享密钥
// 两个结果都是 2 —— 双方算出了同一个密钥，但这个密钥从没在网络上传输过
```

关键点：**私钥（secret1、secret2）从不离开各自的手，公钥（A、B）在网络上公开传输，但双方最终算出同一个共享密钥**。中间人只能看到 `p=5, N=23, A=8, B=19`，却无法从这些公开值反推出 `secret1` 或 `secret2`（这依赖「离散对数」的困难性，和 RSA 的「整数分解」一样是单向函数）。

Node.js 里用 `createDiffieHellman` 实际跑一遍：

```javascript
const {createDiffieHellman} = require('crypto');

// 客户端
const client = createDiffieHellman(512);
const clientKey = client.generateKeys(); // A

const prime = client.getPrime(); // p
const generator = client.getGenerator(); // N

// 服务端
const server = createDiffieHellman(prime, generator);
const serverKey = server.generateKeys(); // B

const clientSecret = client.computeSecret(serverKey);
const serverSecret = server.computeSecret(clientKey);

console.log('clientSecret', clientSecret.toString('hex'));
console.log('serverSecret', serverSecret.toString('hex'));
// clientSecret 和 serverSecret 完全一样
```

而 ECDHE 是 DH 的「椭圆曲线」升级版——**E**（Ephemeral，临时）+ **ECDH**（椭圆曲线 DH）。椭圆曲线加密（ECC）是基于椭圆曲线数学的公钥加密算法，同样的密钥长度下比 RSA 安全性更高、计算更快：

![椭圆曲线](https://cdn.nlark.com/yuque/0/2025/png/738210/1752305718214-1a7259fb-9ff3-4900-add6-67814dab5e92.png)

```javascript
let G = 3;    // 公开的基点
let a = 5;    // 客户端私钥
let A = G * a; // 客户端公钥
let b = 7;    // 服务端私钥
let B = G * b; // 服务端公钥
console.log(a * B); // 客户端算出的共享密钥
console.log(b * A); // 服务端算出的共享密钥
// 两者相等，和 DH 一样的神奇性质
```

```javascript
let { createECDH } = require('crypto');
const clientDH = createECDH('secp521r1');
const clientDHParams = clientDH.generateKeys();

const serverDH = createECDH('secp521r1');
const serverDHParams = serverDH.generateKeys();

const clientKey = clientDH.computeSecret(serverDHParams);
const serverKey = serverDH.computeSecret(clientDHParams);
console.log('clientKey', clientKey.toString('hex'));
console.log('serverKey', serverKey.toString('hex'));
// clientKey 和 serverKey 完全一样
```

现在回到**前向保密（Forward Secrecy）**，这是理解 ECDHE 价值的核心：

- **ECDHE 的「E」代表 Ephemeral（临时的）**：每次握手，双方都**生成一次性的临时密钥对**，用完即销毁。即使服务器长期私钥未来被泄漏，攻击者也无法用它解密**过去记录下来的加密流量**——因为过去每次握手的临时密钥早已销毁，长期私钥从没参与过「加密数据」这件事，它只负责「给临时公钥签名」。
- **RSA 密钥交换恰恰相反**：它用服务端的**长期私钥**直接加密 pre-master secret，一旦长期私钥泄漏，攻击者就能解密过去所有用这个私钥加密的会话——**不具备前向保密**。

一句话记住这个差异：**ECDHE 的临时密钥对「用完就扔」，RSA 的长期私钥「一用到底」**。理解了它，就理解了「为什么 TLS 1.3 要废弃 RSA 密钥交换」——因为它天生没有前向保密，而前向保密在现代安全标准里已经从「加分项」变成了「基本要求」。

> 💬 **面试官**：什么是前向保密？ECDHE 怎么做到前向保密，而 RSA 密钥交换做不到？
>
> ✅ 标准答案：前向保密指「即使服务器长期私钥未来被泄漏，攻击者也无法解密过去记录下来的加密流量」。ECDHE 是临时密钥交换算法，每次握手生成一次性的临时密钥对、用完销毁，长期私钥只负责给临时公钥签名、从不参与加密数据，所以私钥泄漏不影响历史流量。RSA 密钥交换用服务器长期私钥直接加密 pre-master secret，私钥一泄漏，过去所有会话都能被解密，不具备前向保密。
>
> 🎁 加分答案：能点出更深的一层——① **RSA 密钥交换模式下，pre-master secret 由客户端生成并用服务器公钥加密发送**，服务器私钥是「解密历史会话的唯一钥匙」；② ECDHE 里服务器私钥的职责被「降级」为「只签名不加密」，所以它的泄漏只影响「未来被冒充」，不影响「过去被解密」；③ 这正是 TLS 1.3 废弃 RSA 密钥交换的根本原因。再加一句：这也能解释为什么企业内网抓包（Charles）用「静态私钥」解不开 ECDHE 的历史流量——它必须在握手时实时参与（做中间人），而不能事后离线解密。

### 6. TLS 1.3 的改进（改进）

理解了前向保密，TLS 1.3 的改进就顺理成章了。它是 TLS 的一次「精简 + 加固」，三个核心变化：

**① 握手从 4 次往返压成 2 次**。TLS 1.2 要 4 段往返（2-RTT），TLS 1.3 把 ClientHello 和 ServerHello 之后的部分合并——客户端在 ClientHello 里就带上自己的 DH 参数，服务端在 ServerHello 里直接返回选定套件 + 自己的 DH 参数 + 证书，客户端收到后立刻就能算出共享密钥、发出加密数据。整体**减少 1 个 RTT**，这对移动端弱网场景是实打实的延迟优化。

**② 废弃 RSA 密钥交换**。前面讲过，RSA 密钥交换不具备前向保密，TLS 1.3 直接把它从规范里删掉，**只保留前向保密的 ECDHE**（以及后续加入的 DH 家族）。

**③ 支持 0-RTT 重连**。会话恢复时，客户端可以在首次请求就附带加密数据（把「重连」的握手也省掉了）。但要**特别警惕 0-RTT 的重放攻击风险**：0-RTT 数据没有经过「握手完成」的确认，攻击者可以录制并重放这段数据。所以 0-RTT **只适合幂等请求**（重复执行结果一样的请求，如纯读的 GET），绝不能用在「下单、扣款」这类有副作用的操作上——否则重放一次就多扣一次钱。

> 💬 **面试官**：TLS 1.2 和 TLS 1.3 握手的主要区别是什么？TLS 1.3 为什么废弃 RSA 密钥交换？
>
> ✅ 标准答案：① TLS 1.3 握手从 2-RTT 压到 1-RTT（往返更少、延迟更低）；② 废弃了 RSA 密钥交换，只保留前向保密的 ECDHE；③ 支持 0-RTT 重连。废弃 RSA 的根本原因是它不具备前向保密——长期私钥一泄漏历史流量全暴露，而 ECDHE 的临时密钥对每次握手用完即毁，天然前向保密。
>
> 🎁 加分答案：能补两个细节——① TLS 1.3 把「密钥交换」和「签名」彻底解耦：ECDHE 负责协商密钥，RSA/ECDSA 只负责给握手消息签名（身份认证），所以「废弃 RSA 密钥交换」不等于「废弃 RSA」，RSA 作为签名算法仍然在用；② 0-RTT 的重放攻击风险：0-RTT 数据没经过 Finished 确认，可被录制重放，只适合幂等请求，服务端通常用「单次票据」或「记录客户端时间」等手段缓解。

### 7. HSTS 的工作原理（加固）

讲完握手和加密，进入 HTTPS 的「加固」环节——解决那些「握手本身加密了、但流程上仍有漏洞」的问题。

HSTS 解决的是**降级攻击**。回顾第一节第 6 小节：用户第一次输入 `http://drug.example.com` 时，浏览器会先发一个**明文的 HTTP 请求**，服务端再重定向到 HTTPS。这个「首次明文跳转」的窗口期，就是中间人降级攻击的机会——中间人可以在 HTTP 阶段拦截、篡改，甚至阻止跳转，让用户一直停留在明文 HTTP 上。

HSTS 的工作机制：

1. 服务端在 HTTPS 响应里返回 `Strict-Transport-Security: max-age=31536000; includeSubDomains`
2. 浏览器**缓存这条指令**：接下来 365 天内，对这个域名的所有请求**必须在浏览器内部直接升级成 HTTPS**，即使用户输入 `http://`，也**根本不发出那个明文 HTTP 请求**，而是直接在浏览器层改成 `https://` 再发
3. 这就把「降级攻击的窗口期」从「每次访问」压缩到了「只有第一次访问」——因为第一次访问之前，浏览器还没收到过 HSTS 指令

**HSTS 的局限：首次访问仍然脆弱**。第一次访问某域名时，浏览器还不知道这个域名启用了 HSTS，所以那一次的明文请求仍然可能被降级攻击。解决这个「首访问题」的是 **HSTS Preload List**——一个被主流浏览器（Chrome/Firefox/Safari）**预置在代码里的域名列表**，这些域名从一开始就被强制走 HTTPS，连「第一次访问」也不会有明文窗口期。网站运营者可以主动申请把自己域名加入这个列表。

> 💬 **面试官**：HSTS 解决了什么问题？它有什么局限性？
>
> ✅ 标准答案：HSTS 解决「降级攻击」——服务端通过 `Strict-Transport-Security` 响应头告诉浏览器「接下来一段时间内对这个域名一律走 HTTPS」，浏览器缓存后，即使输入 `http://` 也在浏览器内部直接升级，不发出明文 HTTP 请求。局限是「首次访问」——第一次访问前浏览器还没收到 HSTS 指令，那一次的明文请求仍可能被降级攻击。
>
> 🎁 加分答案：能补上 **HSTS Preload List**（浏览器预置的强制 HTTPS 域名列表，解决首访问题）和几个参数细节——`max-age` 是缓存时长、`includeSubDomains` 是连子域名一起强制、`preload` 是申请加入预加载列表。再加一个容易忽略的点：**HSTS 只在 HTTPS 响应里生效**，如果服务端在 HTTP 响应里发 HSTS，浏览器会忽略它（这也是为什么首访之前它无能为力）。

### 8. Certificate Pinning 的工作原理（加固）

最后一个加固手段，回到第一节第 7 小节的医疗场景：医院 HIS 对接第三方检验设备。

回顾 Charles 抓包的原理：它能成功，是因为**用户把 Charles 的根证书装进了系统信任列表**，于是「信任」从真实服务器转移到了 Charles 身上。Certificate Pinning 的设计目标，就是**切断这种「信任转移」**。

**Certificate Pinning（证书锁定）** 的做法：客户端（移动端 App 或内部服务）在代码里**预置目标服务器证书的哈希（或公钥哈希）**，TLS 握手时，把服务端实际发来的证书（或证书里的公钥）计算哈希，和预置值比对——**不一致就拒绝连接**。

它为什么能对抗 Charles？因为：

- Charles 即使用自己的（受系统信任的）根证书签了一张假证书冒充服务器，这张假证书的**指纹**和客户端预置的**真实服务器证书指纹**对不上
- 客户端发现指纹不匹配，直接断开，Charles 的中间人攻击就失效了

**两种 Pinning 的粒度**：

- **证书锁定（Certificate Pinning）**：锁定整张证书的哈希。缺点：证书到期更新后，客户端预置的哈希也得跟着更新，否则老版本 App 全连不上
- **公钥锁定（Public Key Pinning）**：锁定证书里**公钥**的哈希。优点：证书续期时，只要还是用**同一个公钥**（或同一把私钥），公钥哈希就不变，客户端不用更新

**局限也要清楚**：Pinning 是「强信任」手段，但一旦预置的哈希管理不善（比如服务器更换证书而客户端没同步更新），会导致「合法请求被误拒绝」甚至大面积不可用。所以它适合**「通信双方是固定一对、长期稳定的内部/设备对接」**场景（如 HIS ↔ 检验设备），不适合「面向任意客户端」的公开网站——后者更适合依赖标准的 CA 信任链。

> 💬 **面试官**：Certificate Pinning 在什么场景下使用？它能防御哪类攻击？
>
> ✅ 标准答案：客户端（移动 App / 内部服务）预置目标服务器证书（或公钥）的哈希，TLS 握手时比对实际证书指纹，不一致就拒绝连接。它防御的是「中间人伪造证书攻击」——比如企业内网装了 Charles 这类抓包工具、把自己的根证书塞进信任列表，冒充服务器。因为伪造证书的指纹和预置值对不上，连接被拒。
>
> 🎁 加分答案：能补充两点——① **公钥锁定 vs 证书锁定**的取舍：锁定公钥哈希在证书续期时不用更新客户端（只要公钥不变），比锁定整张证书更易维护；② Pinning 的**代价**：证书更换时若客户端没同步，会导致合法请求被误拒，所以只适合「固定一对、长期稳定」的内部/设备对接场景，不适合公开网站（后者靠标准 CA 信任链 + Certificate Transparency 更合适）。

### 9. 对比 Node.js `tls` 模块（落地）

原理讲透了，最后落到 Node.js 怎么把这些能力封装起来——这也是 Node.js 系列「核心 API 大全」篇 `net`/`tls` 小节的直接前置。

Node.js 的 `tls` 模块是 HTTPS 的底层：`https` 模块本质是在 TCP 连接上「套」了一层 TLS。几个核心 API：

- **`tls.createServer(options, callback)`**：创建 TLS 服务端，`options` 里传 `key`/`cert`（就是第 4 小节那两个文件）
- **`tls.createSecureContext(options)`**：创建一个「安全上下文」，把证书、私钥、信任的 CA 列表等打包成一个可复用的配置对象
- **`TLSSocket`**：TLS 连接上的 socket，它在 `net.Socket` 之上叠加了 TLS 状态机（握手、加密、解密）

关系可以这样理解：**`net.Socket` 负责「可靠传输字节流」，`TLSSocket` 负责「在这个字节流之上做握手、加密、解密」**——所以 HTTPS 的数据，是先经过 TLS 加密，再交给 TCP 传输。这也呼应了本篇开头的分层定位：TLS 严格位于应用层和传输层之间。

工程上，生产环境证书一般部署在 Nginx 层，Node.js 应用只负责跑 HTTP：

```diff
server {
    listen       443 ssl;
    server_name  localhost;

+   ssl_certificate      /root/server.crt;
+   ssl_certificate_key  /root/server.private.key;

    ssl_session_cache    shared:SSL:1m;
    ssl_session_timeout  5m;

    ssl_ciphers  HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers  on;

    location / {
        root   html;
        index  index.html index.htm;
    }
}
```

证书的获取，免费方案用 Let's Encrypt：

```shell
git clone https://github.com/letsencrypt/letsencrypt
cd letsencrypt
chmod 777 ./letsencrypt-auto
./letsencrypt-auto certonly --standalone --email zhang_renyang@126.com -d itnewhand.com

/etc/letsencrypt/live/itnewhand.com/fullchain.pem
/etc/letsencrypt/live/itnewhand.com/privkey.pem
```

> 生成证书时要先停掉 nginx。

最后，TLS 安全的几个加固要点（对应笔记里的「tls 安全」）：**证书吊销**（CRL 定期发布吊销列表 / OCSP 实时查询证书状态）、**多域名与泛域名证书**（建议每个域名单独一张证书）、**使用服务器优先的更安全的密码套件**、**保护私钥并定期更换**、**选择可靠的 CA**、**保证前向保密**。

---

## 三、工程落地参考

原理讲完，落到「工程落地」时看哪些权威资料。本节列出三个核心参考，指明「去哪看、看什么」：

### 1. TLS 1.3 握手流程（RFC 8446）

RFC 8446 是 TLS 1.3 的现行规范，定义了 TLS 1.3 的握手消息序列、密钥派生函数 HKDF、以及 0-RTT 重连的安全注意事项。对比 TLS 1.2（RFC 5246），重点看三处变化：握手往返次数压缩、RSA 密钥交换的移除、以及「密钥交换」与「签名」两个概念的彻底分离。0-RTT 的重放攻击防护是阅读时的重点，规范里对「哪些数据允许 0-RTT、如何防重放」有专门章节。

### 2. X.509 证书格式与信任链（RFC 5280）

RFC 5280 定义了 X.509 证书的结构，以及浏览器做证书路径验证（信任链验证）的算法。证书里的 `SubjectPublicKeyInfo`（公钥信息）、`Issuer`（签发者）、`Validity`（有效期）这几个字段的结构，以及浏览器如何从叶证书逐级向上构建并验证证书路径，都在这个规范里。理解它是理解「自签名证书为什么被拒」的底层依据。

### 3. Node.js `tls` 模块（`lib/tls.js`）

Node.js 源码里 `lib/tls.js` 能概览级看到 `TLSSocket` 如何在 `net.Socket` 之上叠加 TLS 状态机——TLS 握手的各条消息、加密解密的 Record 层处理，都封装在 `TLSSocket` 这个抽象里。`tls.createServer` / `tls.createSecureContext` 的底层实现，是理解「HTTPS 如何在 TCP 上封装 TLS」的直接入口。具体源码级机制留给 Node.js 系列「核心 API 大全」篇展开，本篇只做概览定位。

> 引用规范：正文不出现具体人名/账号名，权威来源见文末参考资料。对应本节的三个规范——TLS 1.3 握手（RFC 8446）、X.509 证书与信任链（RFC 5280）、Node.js `tls` 模块，搜索关键词见文末。

---

## 四、实践演示与验证

原理讲透了，最后动手「把证书链和握手看进眼里」。用四个实验把前面每个抽象概念落到可观测的现象上。

### 1. openssl 三级证书链：根 CA → 中间 CA → 叶证书

亲手生成一条真实的证书链，直观感受「逐级签发」：

```shell
# 1. 生成根 CA 私钥 + 自签名根证书
openssl genrsa -out root-ca.key 2048
openssl req -x509 -new -key root-ca.key -days 3650 -subj "/CN=Root CA" -out root-ca.crt

# 2. 生成中间 CA 私钥 + 证书请求，用根 CA 签发中间 CA
openssl genrsa -out intermediate-ca.key 2048
openssl req -new -key intermediate-ca.key -subj "/CN=Intermediate CA" -out intermediate-ca.csr
openssl x509 -req -in intermediate-ca.csr -CA root-ca.crt -CAkey root-ca.key -CAcreateserial -days 1825 -out intermediate-ca.crt

# 3. 生成服务器私钥 + 证书请求，用中间 CA 签发叶证书
openssl genrsa -out server.key 2048
openssl req -new -key server.key -subj "/CN=drug.example.com" -out server.csr
openssl x509 -req -in server.csr -CA intermediate-ca.crt -CAkey intermediate-ca.key -CAcreateserial -days 365 -out server.crt
```

现在你手上有一条三级链：`server.crt`（叶）→ `intermediate-ca.crt`（中间）→ `root-ca.crt`（根）。把叶证书和中间证书拼成一个链文件（`cat server.crt intermediate-ca.crt > chain.crt`），就是部署到 Nginx 时 `ssl_certificate` 指向的东西。

### 2. `openssl x509 -text` 逐字段解析，看「逐级签发」关系

用 `-text` 把每张证书的字段解析出来，重点看 `Issuer` 和 `Subject` 怎么「首尾相接」：

```shell
openssl x509 -in server.crt -text -noout         # 叶证书：Subject=CN=drug.example.com, Issuer=CN=Intermediate CA
openssl x509 -in intermediate-ca.crt -text -noout # 中间 CA：Subject=CN=Intermediate CA, Issuer=CN=Root CA
openssl x509 -in root-ca.crt -text -noout        # 根 CA：Subject=CN=Root CA, Issuer=CN=Root CA（自签名）
```

关键观察：**叶证书的 `Issuer` = 中间 CA 的 `Subject`，中间 CA 的 `Issuer` = 根 CA 的 `Subject`，根 CA 的 `Issuer` = 自己的 `Subject`（自签名）**——这就是信任链「逐级签发」的直观证据，也是第二节第 3 小节讲的那条「叶 → 中间 → 根」链的字段级呈现。

### 3. `openssl s_client -msg` 逐条观察握手消息序列

```shell
openssl s_client -msg -connect example.com:443
```

`-msg` 会把每一条握手消息都打印出来，对照第二节第 4 小节的 10 条消息，一条条看：ClientHello → ServerHello → Certificate → ServerKeyExchange → ServerHelloDone → ClientKeyExchange → ChangeCipherSpec → Finished。你会看到：证书验证、DH 密钥交换、会话密钥派生这些「抽象过程」，都对应着一条条具体的、有长度和类型字段的二进制消息。

### 4. `-tls1_2` vs `-tls1_3` 对比握手往返次数

```shell
# 强制 TLS 1.2 连接，观察握手消息数量
openssl s_client -tls1_2 -msg -connect example.com:443

# 强制 TLS 1.3 连接，观察握手消息数量
openssl s_client -tls1_3 -msg -connect example.com:443
```

对比两次输出：TLS 1.2 有 ServerKeyExchange、ServerHelloDone、ChangeCipherSpec 这些消息，TLS 1.3 则直接是 ClientHello → ServerHello（含证书和密钥参数）→ 客户端加密 Finished，消息更少、往返更少——**这就是第二节第 6 小节「TLS 1.3 减少 1 个 RTT」最直观的验证**。

---

## 五、参考资料

- https://www.rfc-editor.org/rfc/rfc8446 （TLS 1.3 握手流程）
- https://www.rfc-editor.org/rfc/rfc5280 （X.509 证书格式与信任链）
- https://nodejs.org/api/tls.html （Node.js tls 模块）

> 推荐搜索关键词：「TLS 1.2 握手过程详解」「前向保密 Forward Secrecy ECDHE」「证书信任链 中间人攻击」「HSTS Preload List」「Certificate Pinning 公钥锁定」「TLS 1.3 与 1.2 区别」。

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 考察频率 |
|--------|-----------|---------|
| 混合加密 | 非对称（RSA/ECDHE）协商密钥 + 对称（AES）传输数据，补齐彼此短板 | ⭐⭐⭐ 必考 |
| 数字签名与证书 | 私钥签名/公钥验签；证书 = CA 签名的「公钥归属声明」 | ⭐⭐⭐ 必考 |
| 证书信任链 | 根 CA（内置信任）→ 中间 CA → 叶证书逐级验签；自签名绕链故警告 | ⭐⭐⭐ 必考 |
| TLS 1.2 握手 | ClientHello → ServerHello+证书+密钥 → 客户端密钥+Finished → 服务端 Finished | ⭐⭐⭐ 必考 |
| 前向保密 | ECDHE 临时密钥对用完即毁（有 FS）；RSA 长期私钥一用到底（无 FS） | ⭐⭐⭐ 必考 |
| TLS 1.3 | 2-RTT→1-RTT、废弃 RSA 密钥交换、0-RTT（有重放风险） | ⭐⭐⭐ 必考 |
| HSTS | 响应头缓存「强制 HTTPS」指令防降级；首访靠 Preload List 兜底 | ⭐⭐ 高频 |
| Certificate Pinning | 预置证书/公钥哈希，握手比对，防 Charles 类中间人伪造 | ⭐⭐ 高频 |

> 💡 记住这条主线：**HTTPS 用「混合加密」解决效率与分发的矛盾——对称加密快但密钥难传，非对称加密安全但慢，于是用非对称把对称密钥协商出来；而「对方是不是真的那台服务器」靠证书信任链证明，自签名绕过了链所以被警告；TLS 1.2 四次握手完成证书验证 + 密钥协商，ECDHE 的临时密钥对带来了前向保密，这正是 TLS 1.3 废弃 RSA 密钥交换的原因；最后 HSTS 和 Certificate Pinning 补上了「流程降级」和「中间人伪造」两个加固缺口**。把这条线串起来，HTTPS 的所有面试题都能从原理推到答案。

---

## 💡 面试核心问

- **HTTPS 为什么要用「混合加密」而不直接用非对称加密传数据？**（非对称慢、对称密钥难分发；用非对称协商出对称密钥，后续对称加密传输，取长补短）
- **TLS 1.2 和 TLS 1.3 握手的主要区别是什么？TLS 1.3 为什么废弃 RSA 密钥交换？**（1.3 压缩到 1-RTT、废弃 RSA 密钥交换、支持 0-RTT；RSA 无前向保密、ECDHE 临时密钥对天生前向保密）
- **什么是前向保密？ECDHE 怎么做到前向保密而 RSA 密钥交换做不到？**（长期私钥泄漏不危及历史流量；ECDHE 临时密钥对用完即毁、私钥只签名不加密；RSA 用长期私钥加密 pre-master secret，一泄漏历史全解密）
- **证书信任链是怎么工作的？自签名证书为什么浏览器会警告？**（根 CA 内置信任，叶→中间→根逐级验签；自签名绕链、找不到信任的根，故警告）
- **HSTS 解决了什么问题？它有什么局限性（首次访问时有什么风险）？**（解决降级攻击、缓存强制 HTTPS 指令；首访前未收到指令仍可能被降级，靠 HSTS Preload List 兜底）
- **Certificate Pinning 在什么场景下使用？它能防御哪类攻击？**（移动 App/内部服务预置证书或公钥哈希；防御中间人伪造证书，如 Charles 类抓包工具冒充服务器）

---

## 📝 留个问题

TLS 1.3 的 0-RTT 重连为什么会有「重放攻击」风险？为什么说它「只适合幂等请求」？结合一个医疗场景想一想：如果医院 HIS 的某个接口用了 0-RTT，哪一类接口是安全的、哪一类是危险的？

提示：想想 0-RTT 的数据有没有经过「握手完成」的确认，攻击者能不能把它录下来原样再发一次，以及「再发一次」对「查询类」和「提交类」操作分别意味着什么。

欢迎评论区写出你的答案 👇

---

> 🔖 这是「网络原理深度拆解」系列第 03 篇。上一篇：《TCP 深度：三次握手四次挥手/拥塞控制四阶段/滑动窗口流量控制》；下一篇预告：《HTTP 演进：HTTP/1.1 队头阻塞/HTTP/2 多路复用/HTTP/3+QUIC 深度拆解》
>
> 前置基础扩展阅读：搜索关键词「TCP 可靠传输 序列号 确认应答」「TLS 与 SSL 区别」「AES 对称加密 分组模式」
