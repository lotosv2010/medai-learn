# prompt

```text
/publish 下面我们规划nodejs系列的第6篇文章，具体如下：
{{
## 知识点范围

### ### 第 06 篇：Web 认证体系: Cookie/Session/JWT/OAuth2 设计原理与安全实践（面试收藏级）

**副标题**：Cookie 属性与安全标记、Session 服务端状态存储、JWT 无状态令牌与签名验证、OAuth2 四种授权模式

#### 一、使用与实践

- `Set-Cookie` 响应头与 `document.cookie`：`HttpOnly`/`Secure`/`SameSite` 三个安全相关属性的实际效果
- Express/Koa 中间件设置 Session：`express-session` + Redis 存储会话数据
- JWT 结构：`header.payload.signature` 三段式，`jwt.sign()`/`jwt.verify()` 基本用法，医生登录后签发带角色信息的 token
- 前端请求携带认证信息的两种主流方式：Cookie 自动携带 vs `Authorization: Bearer <token>` 手动携带
- OAuth2 第三方登录接入的基本流程（如微信/GitHub 登录）

#### 二、设计与原理

- **Cookie 的安全属性**：`HttpOnly` 禁止 JS 通过 `document.cookie` 读取，防范 XSS 窃取会话凭证；`Secure` 要求只能通过 HTTPS 传输；`SameSite=Strict/Lax/None` 控制跨站请求时是否携带 Cookie，是防范 CSRF 的关键机制之一（`Lax` 是现代浏览器默认值）
- **Session 的本质**：服务端维护一个"会话 ID → 用户状态"的存储（内存/Redis/数据库），只把这个会话 ID 通过 Cookie 下发给客户端，客户端每次请求带上会话 ID，服务端据此查找完整状态——这是"有状态"认证方案，扩缩容时需要考虑会话存储的共享（多实例部署时不能用进程内存存储 Session，必须用 Redis 等外部存储）
- **JWT 的本质**：把用户身份信息本身编码进令牌（payload 部分是 base64url 编码的 JSON，不是加密，任何人都能解码看到内容），用签名（HMAC 或 RSA/ECDSA）保证内容没有被篡改——服务端验证时只需要用密钥重新计算签名并比对，不需要查询任何存储，这是"无状态"认证方案的核心优势（适合分布式/微服务场景，任意节点都能独立验证）
- **JWT 的安全注意点**：payload 不加密，绝对不能放密码等敏感信息；`exp` 过期时间字段必须设置，否则令牌一旦泄露永久有效；JWT 一旦签发很难主动失效（不像 Session 可以直接从存储里删除），常见解决方案是配合一个短期 access token + 长期 refresh token 的双令牌机制，或维护一个"黑名单"存储已注销的 token
- **Session vs JWT 的选型权衡**：Session 天然支持"服务端主动使某个会话失效"（删存储记录即可），JWT 天然支持无状态水平扩展但撤销机制复杂；单体应用/需要即时踢人下线的场景更适合 Session，微服务/多端多域场景更适合 JWT
- **OAuth2 四种授权模式**：授权码模式（Authorization Code，最常见，用于有后端的 Web 应用，通过一次性授权码换取 token，token 不经过浏览器地址栏暴露）、隐式模式（Implicit，纯前端应用直接从重定向 URL 拿 token，已被认为不够安全逐渐弃用）、密码模式（Resource Owner Password Credentials，用户把账号密码直接交给第三方应用，只在高度信任场景使用）、客户端模式（Client Credentials，机器间调用，无用户参与）——理解"OAuth2 解决的是‘第三方应用代表用户访问资源’的授权问题，而不是身份认证协议本身"这个常见误解（OpenID Connect 才是建立在 OAuth2 之上的身份认证层）
- 对比前端：CSRF 防御在前端视角常见的还有"双重 Cookie 验证"和自定义请求头方案，这些都是在 `SameSite` 属性普及之前的历史防御手段，理解其演进有助于理解现代安全实践为什么逐渐收敛到 `SameSite` + `HttpOnly` 组合

#### 三、工程落地参考

1. `express-session` 中间件实现：`expressjs/session` 仓库 — Session 的创建、Cookie 签发、`store.get`/`store.set` 存储接口抽象
2. JWT 签名与验证：`auth0/node-jsonwebtoken` 仓库 — `sign`/`verify` 中 HMAC/RSA 签名算法的调用与 `exp` 过期校验逻辑
3. OAuth2 授权码流程参考实现：`simov/grant` 或 Passport.js 的 `passport-oauth2` 策略 — 授权码换取 access token 的完整请求链路

#### 四、实践演示与验证

1. 搭建 `packages/mini-session`：手写一个基于内存 Map 的 Session 中间件（生成会话 ID、设置 Cookie、请求时查找会话状态），再替换为 Redis 存储版本对比两者在多实例部署下的行为差异
2. 搭建 `packages/mini-jwt`：手写 JWT 的签发与验证（HMAC-SHA256 签名，base64url 编解码，`exp` 校验），不依赖第三方库，验证篡改 payload 后签名校验会失败

#### 五、参考
- https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Cookies
- https://jwt.io/
- https://oauth.net/2/
- https://mp.weixin.qq.com/s/Trq9-FN6wuxvonmpCd269A
- https://juejin.cn/post/6933115003327217671
- https://zhuanlan.zhihu.com/p/591434948
- https://zhuanlan.zhihu.com/p/34608415
- https://www.jianshu.com/p/be7d264fe1b3

**面试核心问**：
- `HttpOnly`、`Secure`、`SameSite` 三个 Cookie 属性分别防范什么风险？
- Session 和 JWT 的本质区别是什么？各自的优劣和适用场景？
- JWT 的 payload 是加密的吗？可以放哪些信息，不能放哪些？
- JWT 令牌泄露后要怎么让它失效？为什么这比 Session 复杂？
- OAuth2 的授权码模式解决了什么问题？为什么比隐式模式更安全？
- OAuth2 和 OpenID Connect 的关系是什么？



## 已有笔记

- @docs\notes\08 node\22 COOKIE.md
- @docs\notes\08 node\23 SESSION.md
- @docs\notes\08 node\24 JWT.md
- @docs\notes\08 node\25 OAuth.md
- @docs\notes\08 node\26 RBAC.md

## plans 地址

- @docs\plans\05 node-fullstack-series-outline.md

## 规则

- 笔记只关注 @docs/notes/08 node 目录下的，其他目录禁止自行读取
- 补全内容（保留原有内容，只增不删），保留图片，一些知识点的说明图片可以从网络上获取，尽量使用图片加以说明，这样跟容易学习和理解
- 将整理后的内容生成公众号文章，输出到 @docs/articles/08 node
- 文章结构：先出大纲等我确认，再逐节写作
}}
，注意⚠️：
- 本系列 适用于 5-10年的nodejs 开发者，想要系统性的学习，并且想要完全掌握 nodejs 的开发者。
- 保留笔记完整代码和图片，样式格式保持一致和这篇@docs\articles\08 node\2026-09-18-node-eventemitter-promise-concurrency.md，不读我没要求到的文件；
- 可以根据你的经验和最佳实践查漏补缺；主线要明确清晰，不要遗漏源码解析章节；每个知识点都要由浅入深的彻底讲透，讲明白。
```
