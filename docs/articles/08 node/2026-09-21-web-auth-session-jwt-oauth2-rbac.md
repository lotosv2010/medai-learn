# Web 认证与权限体系：Cookie/Session/JWT/OAuth2/RBAC 设计原理与安全实践（面试收藏级）

> **副标题**：登录方式全景到认证凭证载体、密码哈希与 Token 双令牌管理、Cookie 安全属性到 JWT 签名验证、OAuth2 四种授权模式到 RBAC/ABAC 权限模型

> 面试官问「HttpOnly 防什么？SameSite 三种取值区别？JWT 怎么主动失效？」——多数人只能背一半。能把「你是谁 → 怎么证明你是谁 → 怎么让别人替你办事 → 你能做什么」这条认证授权主线从头到尾串起来，才算真正理解了 Web 安全的内核。

---

## 🎯 这篇文章解决什么问题

「认证（Authentication）」和「授权（Authorization）」是后端面试绕不开的两块硬骨头，但绝大多数人的知识是碎片化的：会写 `jwt.sign()`，说不出 JWT 为什么不能放密码；会配 `SameSite`，讲不清它和 CSRF Token 是什么关系；会用 RBAC 三张表，没想过 ABAC 什么时候更合适。

这篇文章是「Node.js 全栈深度拆解」系列的第 6 篇。它不满足于把 Cookie/Session/JWT/OAuth2 各讲一遍，而是用一条主线把它们串成闭环：

- **你是谁** —— 登录方式全景（密码、验证码、扫码、SSO、API Key……到底有多少种入口）
- **怎么证明** —— 认证凭证三选一（Cookie 自动携带 / Session 有状态 / JWT 无状态）及其安全纵深（密码怎么存、token 怎么管）
- **怎么委托** —— OAuth2 让第三方应用「代表用户」办事，四种授权模式与 OIDC 的关系
- **能做什么** —— 权限模型（RBAC/ABAC/ACL/DAC/MAC）与前后端权限联动

读完这一篇，你会同时获得「我懂了」和「我会答了」两种确定感。

---

## 一、使用与实践

### 1. 登录方式全景地图：所有入口，最终都落到一种凭证上

很多人被问「常见的登录方式有哪些」时，只会答「密码登录、验证码登录」。实际上完整的登录方式是一张地图，而且它们有一个共同规律——**差异只在「怎么验证身份」，最终都要落到一种凭证承载方式上**：

| 登录方式 | 验证什么 | 典型承载方式 |
|---------|---------|-------------|
| 密码登录 | 用户知道什么（knowledge） | Cookie（Session）或 JWT |
| HTTP Basic Auth | 用户名密码，Base64 编码放 `Authorization` 头 | 每次请求手动携带 |
| API Key | 应用身份，一串密钥 | `Authorization` 头 / query 参数 |
| 短信/邮箱验证码 | 用户拥有什么（possession） | 验证通过后换 Cookie/JWT |
| 扫码登录 | 已登录设备授权 | 轮询状态 → 换 token |
| 生物识别 | 用户是什么（inherence） | 本地校验后换 token |
| 第三方社交登录 | 第三方平台身份（OAuth2） | 授权码换 token |
| SSO 单点登录 | 中心认证服务签发的票据 | 全局 Cookie 或 CAS/SAML |
| 免密登录（Magic Link） | 邮箱所有权 | 链接里带一次性 token |

看出规律了吗？无论「怎么验证」，验证成功后都要**落地成一种凭证**：要么是 Cookie（浏览器自动携带），要么是 token（前端手动塞进 `Authorization: Bearer`）。所以接下来讲的 Cookie/Session/JWT，才是所有登录方式共同的「终点」。

### 2. 密码的安全存储：先搞懂为什么不能存明文

登录方式里最基础的是密码登录，而密码登录的第一个安全问题是「密码存在哪、怎么存」。三种存储方式天差地别：

- **明文存储**：拖库即泄露，直接死刑，绝不可用
- **可逆加密**：有密钥就能解回来，密钥泄露等于明文泄露，同样不该用于密码
- **单向哈希**：只能算不能逆，登录时重新哈希比对，是唯一正确的做法

Node.js 里标准做法是用 `bcrypt`（或更强的 `argon2`）：

```javascript
const bcrypt = require('bcrypt')

// 注册时：哈希后存库（10 是 cost factor，越大越慢越安全）
const hash = await bcrypt.hash(doctorPassword, 10)
await db.save({ username: doctorId, passwordHash: hash })

// 登录时：重新哈希后比对
const ok = await bcrypt.compare(inputPassword, doctor.passwordHash)
```

`bcrypt` 的两个核心设计——**加盐（salt）**和**慢哈希（cost factor）**——会在「二、10」讲原理，这里先记住用法。

### 3. Cookie：Set-Cookie 与 document.cookie

Cookie 是 HTTP 无状态协议下「辨明用户身份、进行会话跟踪」的机制。因为 HTTP1.0 协议本身是无状态的，Web 应用又必须在多个请求间共享会话，于是出现了「存储在客户端」的 Cookie。

整个处理流程分三步：

**服务器发送 Cookie**：客户端第一次访问时，服务器通过 `Set-Cookie` 响应头向客户端下发 Cookie，属性之间用分号空格分隔：

```
Set-Cookie: doctorId=D10086; Path=/
```

**客户端接收保存**：客户端收到后保存在本地。

**客户端回传**：之后每次请求，浏览器都把这个 Cookie 通过请求头送回服务器：

```
Cookie: doctorId=D10086
```

Cookie 的重要属性如下：

| 属性 | 说明 |
|------|------|
| name=value | 键值对，要保存的 Key/Value |
| Domain | 域名，默认当前域名 |
| Path | Cookie 影响到的路径，如 `path=/`，路径不匹配则浏览器不发送 |
| Expires / maxAge | 过期时间，Expires 是某个时间点，maxAge 是相对毫秒数 |
| Secure | 为 true 时 Cookie 只在 HTTPS 中有效，HTTP 无效 |
| HttpOnly | 为 true 时 JS 脚本无法通过 `document.cookie` 读取，防 XSS |

在 Express 里设置/读取 Cookie：

```javascript
res.cookie(name, value, [, options])   // 设置
req.cookies                             // 读取（需 cookie-parser）
res.clearCookie('doctorId')             // 清除
```

完整示例（`cookie-parser` 中间件，含签名用法）：

```javascript
const express = require('express')
const cookieParser = require('cookie-parser')
const app = express()

// 若要加密，cookieParser 里指定密钥，且 res.cookie 的 signed 要为 true
app.use(cookieParser('medai-secret'))

app.get('/write', (req, res) => {
  // 1. 普通设置
  // res.cookie('name', 'value')

  // 2. 设置域名
  // res.cookie('doctorId', 'D10086', { domain: 'his.medai.cn' })

  // 3. 设置路径
  // res.cookie('doctorId', 'D10086', { path: '/visit' })

  // 4. 过期时间
  // res.cookie('doctorId', 'D10086', { expires: new Date(Date.now() + 20 * 1000) })
  // res.cookie('doctorId', 'D10086', { maxAge: 20 * 1000 })  // 毫秒

  // 5. httpOnly 为 true 时，document.cookie 读不到
  // res.cookie('doctorId', 'D10086', { httpOnly: true })

  // 6. 签名 Cookie
  res.cookie('role', 'doctor', { signed: true })
  res.end('ok')
})

app.get('/read', (req, res) => {
  console.log(req.signedCookies)   // 签名 Cookie 在这里
  res.send(req.cookies)
})

// 记录第几次访问
app.get('/visit', (req, res) => {
  const count = isNaN(req.cookies.count) ? 0 : parseInt(req.cookies.count) + 1
  res.cookie('count', count)
  res.send(req.cookies)
})

app.listen(9090)
```

Cookie 使用注意事项：

- 可能被客户端篡改，使用前要验证合法性（所以有了签名 Cookie）
- 不要存敏感数据，比如密码、账户余额
- 使用 `httpOnly` 保证安全
- 尽量减少 Cookie 体积
- 设置正确的 domain 和 path，减少不必要的数据传输

### 4. Session：express-session + Redis

Session 是另一种记录客户状态的机制——区别在于 **Cookie 存在客户端浏览器，Session 存在服务器**。客户端访问时，服务器把客户信息记录在服务端，客户端再次访问时，只需从 Session 里查找状态即可。

> 一句话：把登录信息等**重要信息**放 Session，其他需要保留但不敏感的可以放 Cookie。

Session 的实现五步（用「剪发店发卡」的类比最直观）：

1. 服务端生成全局唯一标识符 `session_id`（发一张卡）
2. 在服务端内存开辟这个 `session_id` 对应的存储空间（小本子记下余额）
3. 把 `session_id` 通过 Cookie 发给客户端（把卡给顾客带回家）
4. 客户端再次访问时，通过 Cookie 把 `session_id` 送回来
5. 服务端用 `session_id` 取出对应数据

一个用内存 Map 手写的极简 Session 演示（类比：卡号 → 余额）：

```javascript
const express = require('express')
const cookieParser = require('cookie-parser')
const app = express()
app.use(cookieParser())

// 存放会话数据：key 是卡号，value 是卡号对应的数据对象
const sessions = {}
// 与客户端约定的会话 ID
const SESSION_KEY = 'connect.sid'

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html;charset=utf-8')
  // 1. 先取出 cookie 中的 sessionId（卡号）
  const sessionId = req.cookies[SESSION_KEY]

  if (sessionId) {
    // 老顾客：取出卡号对应的余额
    const sessionObj = sessions[sessionId]
    if (sessionObj) {
      sessionObj.balance = sessionObj.balance - 10   // 扣 10 块
      res.send('欢迎你老顾客，你卡上还剩' + sessionObj.balance)
    } else {
      genId(res)
    }
  } else {
    genId(res)   // 新顾客
  }

  function genId(res) {
    // 生成唯一卡号
    const id = Date.now() + '' + Math.random()
    // 小本子记录余额
    sessions[id] = { balance: 100 }
    // 把卡发给顾客
    res.cookie(SESSION_KEY, id)
    res.send('欢迎你新顾客，送你一张价值 100 元的剪发卡')
  }
})

app.listen(9090)
```

生产环境不会自己手写，而是用 `express-session` 中间件：

```shell
$ npm install express-session
```

`express-session` 的关键参数：

| 参数 | 描述 |
|------|------|
| name | Cookie 中保存 session 的字段名，默认 `connect.sid` |
| store | session 存储方式，默认内存，可换 redis/mongodb |
| secret | 用于计算 hash 值并放进 Cookie，产生防篡改的 signedCookie |
| cookie | 存放 session id 的 Cookie 选项，默认 `{ path: '/', httpOnly: true, secure: false, maxAge: null }` |
| genid | 生成 session_id 的函数，默认用 `uid2` 这个 npm 包 |
| rolling | 每个请求都重新设置 Cookie，默认 false |
| saveUninitialized | 无论有没有 session，每次都设置一个 session Cookie |
| resave | 每次请求都重新设置 session Cookie（10 分钟过期的会话，每次请求再续 10 分钟） |

`express-session` 的存储结构示意图：

![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742641187014-45331998-991a-4fb8-af22-e5c37e357463.png)

实现一个「访问计数器」，并把 Session 存到文件：

```javascript
const express = require('express')
const session = require('express-session')
const path = require('path')
const FileStore = require('./filestore')(session)
const app = express()

app.use(session({
  secret: 'medai-secret',
  resave: true,
  saveUninitialized: true,
  store: new FileStore({
    root: path.join(__dirname, 'sessions'),
    maxAge: 1000,
    gc: 1
  })
}))

app.get('/visit', (req, res) => {
  let visit = req.session.visit
  visit = visit ? visit + 1 : 1
  req.session.visit = visit
  res.send(`欢迎你的第 ${visit} 次光临`)
})

app.listen(8080)
```

Session 实现权限（`checkUser` 中间件）：

```javascript
const express = require('express')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const app = express()

app.set('view engine', 'html')
app.engine('html', require('ejs').__express)
app.set('views', __dirname)
app.use(cookieParser())

app.use(session({ secret: 'medai-secret', resave: true, saveUninitialized: true }))

function checkUser(req, res, next) {
  if (req.session && req.session.username) next()
  else res.redirect('/')
}

app.get('/', (req, res) => res.render('index'))                     // 登录页

app.get('/login', (req, res) => {                                   // 登录
  req.session.username = req.query.username
  res.redirect('/user')
})

app.get('/user', (req, res) => {                                    // 用户页
  console.log(req.session)
  res.render('user', { username: req.session.username })
})

app.get('/logout', (req, res) => {                                  // 退出
  req.session.username = null
  res.redirect('/')
})

app.listen(8080)
```

### 5. JWT：三段式 + 医生登录签发带角色 token

JWT（JSON Web Token）是为了在网络应用环境间传递声明而执行的基于 JSON 的开放标准。由于数字签名的存在，这些信息是可信的——JWT 可以用 HMAC 算法或 RSA 公私钥对进行签名。

JWT 由 `.` 分隔的三段组成：

**Header（头部）**：声明 token 类型和加密算法：

```json
{ "alg": "HS256", "typ": "JWT" }
```

对这段做 Base64Url 编码，构成 JWT 的第一部分。

**Payload（负载）**：存放有效信息的地方，包含三类声明——标准中注册的声明（建议但不强制）、公共声明、私有声明。

标准声明（`iss` 签发者 / `sub` 面向的用户 / `aud` 接收方 / `exp` 过期时间 / `nbf` 生效时间 / `iat` 签发时间）：

```json
{ "sub": "1234567890", "name": "张医生", "role": "doctor" }
```

> 注意：公共声明和私有声明**不建议放敏感信息**，因为 base64 是对称可解的，这部分信息等同于明文。

**Signature（签名）**：用编码后的 header + payload + 一个密钥，按 header 指定的算法签名。HMAC SHA256 的签名方式：

```javascript
HMACSHA256( base64UrlEncode(header) + "." + base64UrlEncode(payload), secret )
```

签名用于验证「消息发送者」以及「消息没有被篡改」。密钥 secret 保存在服务端，签 token 和验 token 都靠它，所以必须保护好。

一个完整的 JWT 使用流程（登录签发 → 前端携带 → 中间件校验）：

```javascript
const express = require('express')
const { expressjwt } = require('express-jwt')
const jwt = require('jsonwebtoken')
const cors = require('cors')

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

const secretKey = 'medai-jwt-secret'   // 建议统一命名为 secretKey

// expressjwt 用来解析 token 的中间件，解析出的用户信息挂到 req.auth 上
// .unless({ path }) 指定哪些接口不需要权限
app.use(expressjwt({
  secret: secretKey,
  algorithms: ['HS256']
}).unless({ path: [/^\/api\//] }))

app.post('/api/login', (req, res) => {
  const userinfo = req.body

  if (userinfo.username !== 'admin' || userinfo.password !== 'admin') {
    return res.send({ status: 400, message: '登录失败' })
  }

  // 登录成功后生成 JWT：用户信息对象 + 密钥 + 配置对象
  // 注意：千万不要把密码写入 token
  const tokenStr = jwt.sign(
    { username: userinfo.username, role: 'doctor' },   // 医生登录带角色信息
    secretKey,
    { expiresIn: '120s' }
  )

  res.json({ status: 200, msg: '登录成功', token: tokenStr })
})

// 前端请求需在请求头带上 Authorization：Bearer <token>
app.get('/user', (req, res) => {
  res.send({ status: 200, data: req.auth })
})

// 全局错误处理：捕获 JWT 解析失败的错误
app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.send({ status: 401, message: '无效的 token' })
  }
  res.send({ status: 500, message: '未知的错误' })
})

app.listen(3300)
```

前端携带认证信息的两种主流方式，本质区别在「谁来做携带」：

| 方式 | 携带机制 | 典型场景 |
|------|---------|---------|
| Cookie 自动携带 | 浏览器每次请求自动带上 Cookie，无需前端干预 | 传统服务端渲染、同域 Session |
| `Authorization: Bearer <token>` 手动携带 | 前端在 axios 拦截器里手动塞请求头 | SPA + JWT、跨域 API |

axios 拦截器自动加 token 的典型写法：

```javascript
axios.interceptors.request.use(config => {
  if (localStorage.token) {
    config.headers.Authorization = 'Bearer ' + localStorage.token
  }
  return config
}, error => Promise.reject(error))

axios.interceptors.response.use(res => {
  if (res.data.code != 0) return Promise.reject(res)
  return res
}, error => {
  if (error.response.status == 401) history.push('/')   // 401 跳登录
  return Promise.reject(error.response.data)
})
```

JWT 的完整登录流程图：

![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742653161987-baddc734-0c3d-46e7-abb9-cd34aba16c52.png)

### 6. OAuth2：第三方登录接入流程

OAuth2 解决的经典问题是：「第三方应用如何安全可控地获取用户在某平台上的授权，而不拿到用户的密码」。比如一个应用想读取用户在 QQ 的相册，传统做法是用户把 QQ 密码交给应用——这有严重缺陷：应用会保存密码、能无限制访问所有资料、用户只能改密码才能收回授权。

OAuth 的核心是「授权层」：应用不能直接登录服务提供商，只能登录授权层，用**令牌**（token）代替密码，且令牌有权限范围和有效期。

名词先对号入座：

- **client**：第三方应用（上例里的「百度」）
- **Resource Owner**：资源所有者（「QQ 用户」）
- **User Agent**：用户代理，浏览器
- **Authorization server**：认证服务器
- **Resource server**：资源服务器（可与认证服务器同一台，也可不同）

OAuth2 的六步工作流程（A~F）：

![](https://cdn.nlark.com/yuque/0/2025/png/738210/1766393094887-ec41a802-d2c9-40f7-97d9-38c473de6a8b.png)

- （A）用户打开应用，应用要求用户给予授权
- （B）用户同意给予授权
- （C）应用拿着授权向认证服务器申请令牌
- （D）认证服务器认证后发放令牌
- （E）应用拿令牌向资源服务器申请资源
- （F）资源服务器确认令牌后开放资源

其中 **B 是关键**——用户怎么给应用授权。有了授权，应用才能换令牌、拿资源。以 QQ 登录的授权码模式为例，完整链路（授权 → 拿 code → 换 token → 拿 openid → 拿用户信息）：

![](https://cdn.nlark.com/yuque/0/2025/png/738210/1766392976424-bca58a2d-9954-45a2-990a-df90275c5bda.png)

### 7. RBAC：用户-角色-权限

RBAC（Role-Based Access Control，基于角色的访问控制）：用户通过**角色**与**权限**关联——一个用户拥有若干角色，每个角色拥有若干权限，构成「用户-角色-权限」的授权模型。用户与角色、角色与权限之间一般是**多对多**关系。

核心概念就三个：**用户（User）、角色（Role）、权限（Permission）**。

示意图：

![](https://cdn.nlark.com/yuque/0/2025/png/738210/1743672454601-4c337eb0-eba0-4968-a28a-23008d65a6a6.png)

表设计上需要五张表：`users`（用户）、`roles`（角色）、`permissions`（权限）、`user_roles`（用户-角色关联）、`role_permissions`（角色-权限关联）。核心权限表结构如下：

```sql
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,        -- 权限名（"查看用户列表"）
  `code` varchar(100) NOT NULL,       -- 权限编码（"user:list"）
  `description` varchar(200) DEFAULT NULL,
  `resourceType` varchar(255) DEFAULT NULL,  -- 资源类型（user/role/permission）
  `isActive` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY (`code`)
);
```

两张关联表（多对多）：

```sql
CREATE TABLE `user_roles` (
  `user_id` int NOT NULL,
  `role_id` int NOT NULL,
  PRIMARY KEY (`user_id`, `role_id`)
);

CREATE TABLE `role_permissions` (
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`)
);
```

权限校验的核心是中间件 `checkUser`（「一、4」已给出 Session 版，JWT 版同理），判断当前用户拥有的角色是否包含访问该接口所需的权限编码。

---

## 二、设计与原理

### 1. Cookie 三个安全属性分别防什么

这三个属性是面试必考，关键在于「每个属性对应一种具体攻击」：

- **`HttpOnly`** 防 **XSS**：设为 true 后，JS 脚本（哪怕被 XSS 注入）也无法通过 `document.cookie` 读取，窃取会话凭证的攻击就断了。注意它防的是「读」，不是「写」。
- **`Secure`** 防**中间人截获**：只在 HTTPS 下传输，避免 Cookie 在明文 HTTP 里被窃听。
- **`SameSite`** 防 **CSRF**：控制「跨站请求」时是否携带 Cookie。三档取值：

| 取值 | 跨站请求是否携带 | 说明 |
|------|----------------|------|
| Strict | 不携带 | 最严格，任何跨站都不带，但用户从站外链接点进来会「看起来没登录」 |
| Lax | 仅顶级导航（如点击链接）携带 | 现代浏览器默认值，平衡安全与体验 |
| None | 携带 | 必须配合 `Secure`，否则浏览器拒绝 |

> 💬 **面试官**：`HttpOnly`、`Secure`、`SameSite` 三个 Cookie 属性分别防范什么风险？
>
> ✅ 标准答案：`HttpOnly` 禁止 JS 通过 `document.cookie` 读取，防 XSS 窃取会话凭证；`Secure` 要求只在 HTTPS 下传输，防明文传输被中间人截获；`SameSite` 控制跨站请求是否携带 Cookie，是防 CSRF 的关键机制。
>
> 🎁 加分答案：能补充 `SameSite` 三档取值——`Strict` 最严但影响体验、`Lax` 是现代浏览器默认值（只允许顶级导航携带）、`None` 必须搭配 `Secure` 使用；并能点出 `HttpOnly` 防的是「读」而非「写」，以及 CSRF 的本质是「浏览器自动携带 Cookie」而非「拿到 Cookie」。

### 2. Session 的本质：有状态

Session 的核心是「服务端维护一张『会话 ID → 用户状态』的映射表，只把会话 ID 通过 Cookie 下发给客户端」。客户端每次请求带上会话 ID，服务端据此查表还原完整状态——这就是**有状态**认证方案。

它的关键约束在**扩缩容**：多实例部署时，进程内存里的 Session 是各实例独立的，同一用户两次请求可能被负载均衡分到不同实例，导致「登录态丢失」。所以多实例下**不能用进程内存存 Session，必须用 Redis 等外部共享存储**。

Cookie 与 Session 的区别，面试经典对比：

| 维度 | Cookie | Session |
|------|--------|---------|
| 存储位置 | 客户端浏览器 | 服务器 |
| 安全性 | 可被本地分析/伪造，不太安全 | 数据在服务端，更安全 |
| 性能 | 不占服务器资源 | 访问增多时占用服务器性能 |
| 容量 | 单个 ≤ 4K，站点最多约 20 个 | 无此限制 |

### 3. JWT 的本质：无状态

JWT 把「用户身份信息本身」编码进令牌：payload 部分是 base64url 编码的 JSON，**不是加密**，任何人都能解码看到内容；靠签名（HMAC 或 RSA/ECDSA）保证内容没被篡改——服务端验证时只需用密钥重算签名并比对，**不需要查询任何存储**。这是「无状态」认证的核心优势，适合分布式/微服务场景（任意节点都能独立验证）。

安全注意点，三条都要记住：

- **payload 不加密**：绝对不放密码等敏感信息
- **`exp` 必须设置**：否则令牌一旦泄露永久有效
- **难主动失效**：JWT 签发后不像 Session 能直接删存储记录，要失效得靠额外机制（见「二、4」）

### 4. Token 管理纵深：双令牌 / Opaque / 存储位置

这是 JWT 落地最容易被问深的地方，三层依次递进：

**① 双令牌（Access + Refresh）机制**：缓解「JWT 难主动失效」的核心手段。短时 access token（几分钟到几十分钟）用于日常请求，长时 refresh token（几天到几周）只用于换发新 access token。access 泄露影响窗口短，refresh 换发让「主动失效」有了抓手。

**② refresh token 轮换（rotation）+ 复用检测（reuse detection）**：每次用 refresh 换新 access 时，也换发一个**新的 refresh token**，旧的立即失效。更关键的是「复用检测」——如果服务端发现**同一个 refresh token 被用了两次**，就判定该 token 已泄露，撤销该用户的全部令牌。这是把「被动等过期」变成「主动抓泄露」的关键设计。

**③ Opaque token vs JWT**：这是「有状态 vs 无状态」在 token 形态上的翻版。JWT 是**自包含**令牌（信息在 token 里，验证不查存储）；Opaque token 是**随机字符串引用**令牌（信息在服务端存储，验证必须查存储）。理解了这个对应关系，选型逻辑就和 Session vs JWT 完全一致。

**④ 存储位置的前端权衡**：`localStorage` 易被 XSS 窃取、但无 CSRF 风险（JS 手动塞头，不靠浏览器自动携带）；`HttpOnly Cookie` 防 XSS、但需配合 CSRF 防护（浏览器自动携带）。这是「防 XSS 还是防 CSRF」的经典权衡，取决于应用攻击面——**没有银弹，只有适配**。

### 5. Session vs JWT 选型权衡

这是认证篇的「灵魂问题」，面试几乎必问：

| 维度 | Session | JWT |
|------|---------|-----|
| 状态 | 有状态（服务端存储） | 无状态（自包含） |
| 主动失效 | 天然支持（删存储即可） | 复杂（需双令牌/黑名单） |
| 水平扩展 | 需共享 Session 存储（Redis） | 天然支持（任意节点可验证） |
| 多端多域 | Cookie 受同域限制 | 任意域都可带 token |
| 典型场景 | 单体 + 需即时踢人下线 | 微服务 + 多端多域 |

> 💬 **面试官**：Session 和 JWT 的本质区别是什么？各自的优劣和适用场景？
>
> ✅ 标准答案：本质区别是「状态存在哪」——Session 把用户状态存在服务端（有状态），只下发一个会话 ID；JWT 把用户身份信息本身编码进令牌（无状态），靠签名防篡改。Session 天然支持服务端主动失效但水平扩展要共享存储；JWT 天然支持无状态水平扩展但撤销机制复杂。
>
> 🎁 加分答案：能给出选型结论——单体应用、需要即时踢人下线（如医生账号被封立即失效）选 Session；微服务、多端多域（Web/App/小程序共用一套鉴权）选 JWT。再补一句：JWT 的「无状态」在需要主动失效时要靠「短期 access + 长期 refresh」双令牌或黑名单来补，这是它相对 Session 的代价。

### 6. OAuth2 四种授权模式

四种模式解决「不同场景下如何获得授权」，一张表讲清：

| 模式 | 适用场景 | 特点 |
|------|---------|------|
| 授权码模式（Authorization Code） | 有后端的 Web 应用 | 最常见；一次性授权码换 token，token 不暴露在地址栏 |
| 隐式模式（Implicit） | 纯前端应用 | 直接从重定向 URL 拿 token，不够安全，逐渐弃用 |
| 密码模式（Password Credentials） | 高度信任场景 | 用户把账号密码直接交给第三方，几乎不再用 |
| 客户端模式（Client Credentials） | 机器间调用 | 无用户参与，应用自己代表自己 |

**最常见的误解必须纠正**：OAuth2 解决的是「第三方应用代表用户访问资源」的**授权**问题，而不是**身份认证**协议本身。**OpenID Connect（OIDC）** 才是建立在 OAuth2 之上的身份认证层（在 OAuth2 的 token 里额外加了 `id_token`，用于证明「你是谁」）。

> 💬 **面试官**：OAuth2 的授权码模式解决了什么问题？为什么比隐式模式更安全？
>
> ✅ 标准答案：授权码模式通过一个**一次性授权码**（code）换取 token——code 先发给有后端的应用，应用再用 code + client_secret 向认证服务器换 token，token 不经过浏览器地址栏。隐式模式是纯前端直接从重定向 URL 拿 token，token 暴露在地址栏和浏览器历史里，也容易被前端 XSS 窃取，所以更不安全。
>
> 🎁 加分答案：能点出「client_secret 只存在后端」是安全关键（前端拿不到密钥，光有 code 也换不到 token），以及现代最佳实践是授权码模式 + PKCE 增强（即使无后端也能安全）。

### 7. CSRF 防御全景：从历史手段到现代收敛

CSRF 的攻击本质是「浏览器自动携带 Cookie」——攻击者诱导用户访问恶意页面，页面发起的跨站请求会**自动带上目标站的 Cookie**，从而伪造用户操作（如转账、改密码）。

三种主流防御手段是递进的：

- **`SameSite` Cookie 属性**：现代默认方案，从浏览器层面直接掐断「跨站请求带 Cookie」。
- **CSRF Token（同步令牌）**：服务端签发一个随机 token，藏在表单或请求头里，提交时服务端比对。攻击者拿不到这个 token，伪造的请求自然失败。
- **双重 Cookie 验证 + 自定义请求头**：`SameSite` 普及之前的历史手段——要求请求带自定义头（如 `X-Requested-With`），跨站表单无法设置自定义头，从而被拦截。

理解这条演进线，就能理解为什么现代安全实践**逐渐收敛到 `SameSite` + `HttpOnly` 组合**——`SameSite` 防 CSRF，`HttpOnly` 防 XSS，两者正好互补。

### 8. 会话固定攻击（Session Fixation）

攻击原理分三步：

1. 攻击者先**获得一个合法 session id**（比如先访问目标站拿一个）
2. 诱导受害者**用这个 session id 登录**（比如发一个带 `?sid=xxx` 的链接）
3. 受害者登录成功后，session 绑定了受害者身份，攻击者拿着同一个 id 冒用

防御的核心是一句：**登录成功后重新生成 session id**。Express 里用 `req.session.regenerate()`，旧 id 立即作废，攻击者手里那个 id 就失效了。

### 9. 记住我机制（Remember Me）

「记住我」的设计是：登录时额外签发一个**长期有效、带签名/随机的 remember token**，存 Cookie，服务端存它的哈希。普通 session 过期后，用这个 token 自动续登。

三条安全要点：

- remember token 必须与 session id **分离**（不能复用）
- 必须**可撤销**（服务端存哈希，删掉即失效）
- **不携带用户身份明文**（存随机 token，服务端查表还原身份）

### 10. 密码哈希原理：为什么加盐、为什么慢

密码只存哈希，但哈希本身不够，要加两重保险：

- **为什么加盐（salt）**：防**彩虹表**——攻击者预计算常见密码的哈希做成查表，拖库后直接反查。盐是每个用户**随机且不同**的字符串，混进密码再哈希，彩虹表就失效了。
- **为什么慢哈希（bcrypt/argon2 而非 MD5/SHA）**：MD5/SHA 太快，暴力破解可以每秒算几十亿次。bcrypt/argon2 通过 `cost factor` **故意让计算变慢**（如 100ms 一次），暴力破解成本指数上升。bcrypt 内置盐 + 慢哈希，argon2 是当前推荐的最强选择。

### 11. 登录方式归类总结：验证方式 × 凭证载体

把「一、1」的全景地图收束回凭证载体，本质是两张正交的维度：

- **验证方式**（怎么证明「你是谁」）：知识（密码）、持有（验证码/设备）、固有（生物）、委托（OAuth2/SSO）
- **凭证载体**（怎么携带「已认证」）：Cookie 自动携带 / token 手动携带

密码登录、验证码登录、扫码登录最终可能落到 Session（Cookie），也可能落到 JWT（token）；API Key、第三方登录几乎必然落到 token。**登录方式决定「怎么验证」，凭证载体决定「怎么携带」**——搞懂这两个维度的正交，就不会把「登录方式」和「认证方案」混为一谈。

### 12. 授权模型横向对比：RBAC 与它的兄弟们

**RBAC 的四个演进层次**：

- **RBAC0**：基础模型，就是「用户-角色-权限」三层
- **RBAC1**：加了**角色继承**（高级角色自动拥有低级角色权限，如「科室主任」继承「医生」）
- **RBAC2**：加了**约束**（如「职责分离」——不能既当开药医生又当审核药师）
- **RBAC3**：RBAC1 + RBAC2 的统一模型

**RBAC 之外还有四种模型**，一张表横向对比：

| 模型 | 核心思想 | 粒度 | 典型场景 |
|------|---------|------|---------|
| RBAC | 用户通过角色关联权限 | 中（角色级） | 后台管理系统 |
| ABAC | 主体属性 + 资源属性 + 环境属性 + 策略动态判定 | 细（属性级） | 数据级权限、动态策略 |
| ACL | 每个资源维护「谁能访问」列表 | 细（资源级） | 文件系统 |
| DAC | 资源所有者自行决定谁能访问 | 资源所有者 | Linux 文件权限 |
| MAC | 系统强制按安全级别访问 | 系统强制 | 军事、涉密 |

**RBAC vs ABAC 的本质区别**：RBAC 是**静态角色**——「医生」这个角色预先绑定了能做什么；ABAC 是**动态属性**——用「主体属性（职称）+ 资源属性（科室）+ 环境属性（时间/地点）」实时计算是否放行。RBAC 简单好维护但表达不了「数据级权限」（同一角色不同人看到不同数据），ABAC 灵活但策略复杂、难调试。

落到医疗场景：

- **数据级权限**：医生只能看**自己接诊患者**的处方（同是「医生」角色，数据范围不同 → 需要属性判断）
- **操作级权限**：药剂师能**审核**处方但不能**开**处方（RBAC 的权限编码 `prescription:review` vs `prescription:create`）
- **角色 + 数据隔离**：管理员能管用户，但不能看患者隐私（角色边界 + 数据脱敏）

> 💬 **面试官**：RBAC 和 ABAC 的本质区别是什么？什么场景该选 ABAC？
>
> ✅ 标准答案：RBAC 是静态的角色授权，用户通过角色间接获得权限，简单好维护；ABAC 是动态的属性授权，用「主体属性 + 资源属性 + 环境属性 + 策略」实时计算，灵活但复杂。当出现「同一角色下不同人需要访问不同数据」的数据级权限需求时，RBAC 表达不了，就该上 ABAC（或 RBAC + 属性扩展的混合模型）。
>
> 🎁 加分答案：能说出 RBAC0/1/2/3 的演进（基础/角色继承/约束/统一），以及实际项目常用「RBAC 管操作级权限 + 属性过滤管数据级权限」的混合方案，而不是非此即彼。

### 13. 前后端权限联动

权限是「后端说了算，前端做体验」：

- **后端**：JWT 携带 `role` → 中间件校验权限编码 → 返回该角色能访问的数据
- **前端**：登录后拉取「菜单/按钮权限」→ 动态渲染路由 + 控制按钮显隐

> ⚠️ 铁律：前端控制按钮显隐只是为了体验，**真正的安全校验必须在后端做**。前端能隐藏按钮，但拦不住直接调接口的请求。

---

## 三、源码解析（重点代码）

### 1. cookie-parser 的 sign/unsign 签名机制

签名 Cookie 的本质是「给值附加一个 HMAC 摘要，防客户端篡改」。核心是 `sign` 和 `unsign`：

```javascript
const crypto = require('crypto')

exports.sign = function (val, secret) {
  return val + '.' + crypto
    .createHmac('sha256', secret)
    .update(val)
    .digest('base64')
    .replace(/\=+$/, '')
}

exports.unsign = function (val, secret) {
  const str = val.slice(0, val.lastIndexOf('.'))
  const mac = exports.sign(str, secret)
  return mac == val ? str : false
}
```

`sign` 的格式是 `原始值 + '.' + HMAC-SHA256(原始值, 密钥)`。`unsign` 把签名部分剥掉，用同一个密钥重新算一遍摘要，如果和客户端带过来的签名一致，说明值没被改过（因为攻击者没有密钥，算不出正确的签名）。这就是「签名防篡改」的最小实现，和第 6 篇 JWT 的签名原理**完全同源**。

### 2. bcrypt 的哈希与加盐机制

bcrypt 生成的哈希串本身是有结构的，例如：

```
$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
└┬┘ └┬┘ └───────────────┬───────────────┘ └──────────┬──────────┘
版本 成本   22 字节 salt               31 字节 hash
```

- `$2b$`：算法版本
- `10`：cost factor（2^10 = 1024 次迭代）
- 中间 22 字节：**盐（salt）**，每次哈希随机生成，直接嵌在结果里
- 最后 31 字节：**哈希值**

这就是「加盐」的落地——盐不是单独存一张表，而是**和哈希值长在一起**。验证时从哈希串里拆出盐，再用同样的盐重算比对。`cost factor` 则是「慢哈希」的落地——迭代次数指数级增长，故意拖慢每次计算。

### 3. express-session 的 Store 抽象接口

`express-session` 不关心 Session 存在哪，只依赖一个 `Store` 抽象接口，定义三个方法：

| 方法 | 含义 |
|------|------|
| get | 获取 session |
| set | 设置 session |
| destroy | 销毁 session |

这样内存、文件、Redis 三种实现可以无缝切换。文件存储实现：

```javascript
function createFileStore(session) {
  const Store = session.Store
  util.inherits(FileStore, Store)

  function FileStore(options) {
    let { dir = path.resolve(__dirname, 'sessions') } = options || {}
    this.dir = dir
    mkdirp(this.dir)
  }

  FileStore.prototype.resolve = function (sessionId) {
    return path.join(this.dir, `${sessionId}.json`)
  }

  FileStore.prototype.get = function (sessionId, callback) {
    fs.readFile(this.resolve(sessionId), 'utf8', (err, data) => {
      if (err) return callback(err)
      callback(err, JSON.parse(data))
    })
  }

  FileStore.prototype.set = function (sessionId, session, callback) {
    fs.writeFile(this.resolve(sessionId), JSON.stringify(session), callback)
  }

  FileStore.prototype.destroy = function (sessionId, callback) {
    fs.unlink(this.resolve(sessionId), callback)
  }

  return FileStore
}
```

Redis 存储实现（多实例共享的关键）：

```javascript
function createRedisStore(session) {
  const Store = session.Store
  util.inherits(RedisStore, Store)

  function RedisStore(options = {}) {
    this.client = redis.createClient(options.port || 6379, options.host || 'localhost')
  }

  RedisStore.prototype.get = function (sessionId, callback) {
    this.client.get(String(sessionId), (err, data) => {
      callback(err, JSON.parse(data))
    })
  }

  RedisStore.prototype.set = function (sessionId, session, callback) {
    this.client.set(sessionId, JSON.stringify(session), callback)
  }

  RedisStore.prototype.destroy = function (sessionId, callback) {
    this.client.del(sessionId, callback)
  }

  return RedisStore
}
```

两个实现**接口完全一样**，只是 `get/set/destroy` 的落点不同——这就是抽象接口的价值：业务代码不用改，换存储只是换一个 `store` 实例。

### 4. jsonwebtoken 的 sign/verify 核心

JWT 的签发与验证，不依赖第三方库也能手写（下面就是「原理实现」）：

```javascript
const crypto = require('crypto')

function encode(payload, key) {
  let header = { type: 'JWT', alg: 'sha256' }   // 声明类型和算法
  const segments = []
  segments.push(base64urlEncode(JSON.stringify(header)))   // header → base64
  segments.push(base64urlEncode(JSON.stringify(payload)))  // payload → base64
  segments.push(sign(segments.join('.'), key))             // 加入签名
  return segments.join('.')
}

function sign(input, key) {
  return crypto.createHmac('sha256', key).update(input).digest('base64')
}

function decode(token, key) {
  const segments = token.split('.')
  const headerSeg = segments[0]
  const payloadSeg = segments[1]
  const signatureSeg = segments[2]

  const payload = JSON.parse(base64urlDecode(payloadSeg))

  // 签名校验：重算一遍，不匹配就抛错（防篡改）
  if (signatureSeg != sign([headerSeg, payloadSeg].join('.'), key)) {
    throw new Error('verify failed')
  }

  // exp 过期校验
  if (payload.exp && Date.now() > payload.exp * 1000) {
    throw new Error('Token expired')
  }
  return payload
}

function base64urlEncode(str) {
  return new Buffer(str).toString('base64')
}

function base64urlDecode(str) {
  return new Buffer(str, 'base64').toString()
}

module.exports = { encode, decode }
```

这段代码把 JWT 的两个核心讲透了：**签名防篡改**（重算比对）和 **`exp` 过期校验**（时间戳比较）。注意 base64url 和普通 base64 的细节差异——JWT 标准里要把 `+`/`/` 换成 `-`/`_`，去掉结尾的 `=`，因为 URL 里这些字符有特殊含义（标准库 `jsonwebtoken` 会正确处理，手写时要注意）。

### 5. OAuth2 授权码流程：code 换 token 的完整链路

授权码模式的精髓在「多了一次 code 中转」，完整链路：

```
1. 应用引导用户跳转认证服务器：
   /authorize?response_type=code&client_id=xxx&redirect_uri=xxx

2. 用户授权后，认证服务器重定向回应用，URL 带 code：
   redirect_uri?code=AUTH_CODE

3. 应用后端用 code + client_secret 换 token（这一步在服务端，token 不经过浏览器）：
   POST /token  { code, client_id, client_secret, grant_type: 'authorization_code' }
   → { access_token, refresh_token, ... }

4. 应用拿 access_token 调资源服务器：
   /me?access_token=xxx → 用户信息
```

**为什么比隐式模式安全**：隐式模式第 2 步直接返回 token 给浏览器（token 暴露在地址栏）；授权码模式第 2 步返回的是**一次性 code**，第 3 步换 token 发生在**应用后端**，`client_secret` 也只在后端，token 全程不经过浏览器地址栏。

---

## 四、手写实现

### 1. packages/mini-session：手写 Session 中间件

先手写一个基于内存 Map 的 Session 中间件，再替换为 Redis 版本，对比多实例部署下的行为差异。

**内存版**（进程内 Map，单实例可用）：

```javascript
const crypto = require('crypto')

// 内存态会话存储：sessionId -> 状态对象
const sessions = new Map()
const SESSION_KEY = 'sid'

function sessionMiddleware(req, res, next) {
  // 生成安全随机会话 ID（比 Date.now()+Math.random 更不可预测）
  const generateId = () => crypto.randomBytes(16).toString('hex')

  // 从 Cookie 取会话 ID
  const cookieHeader = req.headers.cookie || ''
  const sid = parseCookie(cookieHeader)[SESSION_KEY]

  if (sid && sessions.has(sid)) {
    req.session = sessions.get(sid)          // 老会话，取出状态
  } else {
    const newId = generateId()
    req.session = {}                          // 新会话
    sessions.set(newId, req.session)
    res.setHeader('Set-Cookie', `${SESSION_KEY}=${newId}; HttpOnly; Path=/`)
    req.sessionId = newId
  }
  next()
}
```

**Redis 版**（共享存储，多实例可用）：

```javascript
const redis = require('redis')

function createSessionMiddleware(redisClient) {
  return async function sessionMiddleware(req, res, next) {
    const cookieHeader = req.headers.cookie || ''
    const sid = parseCookie(cookieHeader)['sid']

    if (sid) {
      const data = await redisClient.get(`session:${sid}`)
      if (data) {
        req.session = JSON.parse(data)
        req.sessionId = sid
        return next()
      }
    }
    // 新会话
    const newId = crypto.randomBytes(16).toString('hex')
    req.session = {}
    await redisClient.set(`session:${newId}`, JSON.stringify(req.session))
    res.setHeader('Set-Cookie', `sid=${newId}; HttpOnly; Path=/`)
    req.sessionId = newId
    next()
  }
}
```

**多实例行为差异验证**：内存版在「两个实例 + 负载均衡」下，用户在实例 A 登录，下一次请求被分到实例 B——实例 B 的 Map 里没有这个会话，用户被当成未登录。Redis 版两个实例读同一个 Redis，登录态自然共享。这就是「多实例不能用进程内存存 Session」的直接证据。

### 2. packages/mini-jwt：手写 JWT 签发与验证

HMAC-SHA256 签名 + base64url 编解码 + `exp` 校验，不依赖第三方库（核心代码见「三、4」）。补一个**正确的 base64url 实现**（标准库手写时最容易错的地方）：

```javascript
function base64urlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')   // base64url：+ → -
    .replace(/\//g, '_')   // base64url：/ → _
    .replace(/=+$/, '')    // base64url：去掉末尾 =
}

function base64urlDecode(input) {
  let str = input.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='   // 补回 padding
  return Buffer.from(str, 'base64').toString()
}
```

验证两个关键场景：

- **篡改 payload 后签名校验失败**：把 payload 段的 `role` 从 `doctor` 改成 `admin`，重新 base64url 编码后塞回去，`sign()` 重算的签名和篡改后的对不上，`decode` 抛 `verify failed`。
- **过期后校验失败**：把 `exp` 设成过去的时间，`decode` 抛 `Token expired`。

### 3. packages/mini-rbac：手写 RBAC 权限中间件

用三层 Map 结构表达「用户-角色-权限」，再挂到 Express 路由上：

```javascript
// 角色 -> 权限编码集合
const rolePermissions = new Map([
  ['doctor', new Set(['prescription:create', 'prescription:read'])],
  ['pharmacist', new Set(['prescription:review'])],
  ['admin', new Set(['prescription:create', 'prescription:review', 'user:manage'])]
])

// 用户 -> 角色集合
const userRoles = new Map([
  ['D10086', new Set(['doctor'])],
  ['P20001', new Set(['pharmacist'])],
  ['A90001', new Set(['admin'])]
])

// 判断用户是否拥有某权限编码
function hasPermission(username, permissionCode) {
  const roles = userRoles.get(username) || new Set()
  for (const role of roles) {
    const perms = rolePermissions.get(role) || new Set()
    if (perms.has(permissionCode)) return true
  }
  return false
}

// 权限校验中间件：有权限放行，无权限 403
function requirePermission(permissionCode) {
  return (req, res, next) => {
    const username = req.auth.username          // 从 JWT 解析出的用户名
    if (hasPermission(username, permissionCode)) return next()
    res.status(403).send({ status: 403, message: '无权限' })
  }
}

// 挂到路由上
app.post('/prescription', requirePermission('prescription:create'), (req, res) => {
  res.send('开处方成功')
})
```

这个最小实现把 RBAC 的核心讲透了：**用户 → 角色 → 权限的两跳查询**。真实项目把 Map 换成数据库三张表 + 关联表，逻辑一模一样，只是数据源从内存换成了数据库。

---

## 五、手写实现源码地址

- GitHub：https://github.com/...（`medai-node-source` 仓库，按 `packages/mini-session`、`packages/mini-jwt`、`packages/mini-rbac` 分模块搭建，地址待补充）

---

## 六、参考资料

- https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Cookies
- https://jwt.io/
- https://oauth.net/2/
- https://github.com/expressjs/session
- https://github.com/auth0/node-jsonwebtoken
- https://github.com/simov/grant
- https://www.passportjs.org/
- https://wiki.connect.qq.com/%E7%BD%91%E7%AB%99%E6%8E%A5%E5%85%A5%E6%B5%81%E7%A8%8B

---

## 💡 面试核心问

- **`HttpOnly`、`Secure`、`SameSite` 三个 Cookie 属性分别防范什么风险？**
- **Session 和 JWT 的本质区别是什么？各自的优劣和适用场景？**
- **JWT 的 payload 是加密的吗？可以放哪些信息，不能放哪些？**
- **JWT 令牌泄露后要怎么让它失效？为什么这比 Session 复杂？**（结合双令牌 + refresh 轮换复用检测）
- **token 应该存 `localStorage` 还是 `HttpOnly Cookie`？各自的 XSS/CSRF 风险怎么权衡？**
- **Opaque token 和 JWT 的区别是什么？本质对应了哪两种认证方案的翻版？**
- **密码为什么要加盐存储？为什么用 bcrypt/argon2 而不是 MD5？**
- **OAuth2 的授权码模式解决了什么问题？为什么比隐式模式更安全？**
- **OAuth2 和 OpenID Connect 的关系是什么？**
- **什么是会话固定攻击？怎么防御？**
- **RBAC 和 ABAC 的本质区别是什么？什么场景该选 ABAC？**
- **RBAC0/RBAC1/RBAC2/RBAC3 分别代表什么？**

---

## 💡 一张图总结（面试速记表）

| 环节 | 知识点 | 一句话内核 | 面试频率 |
|------|--------|-----------|---------|
| 你是谁 | 登录方式 | 差异只在「怎么验证」，最终落到 Cookie 或 token | ⭐⭐ 高频 |
| 密码存储 | bcrypt/argon2 | 哈希 + 加盐 + 慢哈希，防拖库/彩虹表/暴力破解 | ⭐⭐⭐ 必考 |
| 怎么证明 | Cookie 三属性 | HttpOnly 防 XSS、Secure 防截获、SameSite 防 CSRF | ⭐⭐⭐ 必考 |
| 怎么证明 | Session | 有状态，服务端存「会话 ID → 状态」，扩展要共享存储 | ⭐⭐⭐ 必考 |
| 怎么证明 | JWT | 无状态，自包含 + 签名，payload 不加密、exp 必设、难失效 | ⭐⭐⭐ 必考 |
| Token 管理 | 双令牌 | 短 access + 长 refresh + 轮换复用检测 | ⭐⭐⭐ 必考 |
| 怎么委托 | OAuth2 四模式 | 授权码（安全）/隐式（弃用）/密码/客户端凭证 | ⭐⭐⭐ 必考 |
| 怎么委托 | OAuth2 vs OIDC | OAuth2 是授权，OIDC 才是认证层 | ⭐⭐ 高频 |
| 能做什么 | RBAC vs ABAC | 静态角色 vs 动态属性，数据级权限选 ABAC | ⭐⭐⭐ 必考 |
| 能做什么 | 前后端联动 | 后端做安全校验，前端只做体验 | ⭐⭐ 高频 |

> 💡 记住这条主线：**「你是谁 → 怎么证明 → 怎么委托 → 能做什么」四环闭环，外加一条贯穿始终的安全纵深（密码怎么存、token 怎么管、会话怎么防攻击）**。认证授权的每一个环节，都在回答同一个问题——「如何让正确的人，在正确的范围里，做正确的事」。

---

## 📝 思考题

JWT 的 payload 里放了 `role: "doctor"` 字段，用户把自己的 token 解码后把 `role` 改成 `"admin"`，重新编码拼回 `header.payload.signature`，能不能越权？为什么？

提示：签名防篡改能拦住这种「改了 payload 不改签名」的攻击——但问题是，如果服务端只靠 payload 里的 `role` 做权限判断，而角色的**变更**（比如医生被降级）要等 token 过期才能生效，这又暴露了 JWT 的什么天然短板？想想「角色变更需重新签发 + 服务端校验」这条边界该怎么守。

欢迎评论区写出你的答案 👇

---

> 🔖 这是「Node.js 全栈深度拆解」系列第 6 篇。上一篇：《Node.js 核心 API 大全：process/crypto/net/os/worker_threads 深度拆解》；下一篇预告：《Express 深度：路由/中间件链/错误处理源码解析与手写核心》。
>
> 前置基础扩展阅读：搜索关键词「JS 异步编程 Promise 发布订阅」「HTTP Cookie MDN」「JWT jsonwebtoken」「OAuth2 授权码模式」「RBAC 权限模型」
