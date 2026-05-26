# 架构设计文档（ARCHITECTURE）

> 定义系统整体架构、数据流、部署方案与技术决策。

---

## 1. 架构总览

```
┌─────────────────────────────────────────────────────────┐
│                      Client Layer                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Next.js 15 (App Router)                │   │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────────┐  │   │
│  │  │ RSC Page│ │Client Comp│ │  Streaming SSR   │  │   │
│  │  └────┬────┘ └─────┬────┘ └────────┬─────────┘  │   │
│  └───────┼────────────┼───────────────┼─────────────┘   │
└──────────┼────────────┼───────────────┼─────────────────┘
           │            │               │
           ▼            ▼               ▼
┌─────────────────────────────────────────────────────────┐
│                      API Layer                          │
│  ┌──────────────────┐  ┌────────────────────────────┐   │
│  │    tRPC Router    │  │     Hono HTTP Server       │   │
│  │  (type-safe RPC)  │  │  (REST + Webhook + Auth)   │   │
│  └────────┬─────────┘  └─────────────┬──────────────┘   │
└───────────┼──────────────────────────┼──────────────────┘
            │                          │
            ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Service Layer                        │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │  Drug Service │ │  AI Service  │ │ User Service   │  │
│  │  (CRUD+Search)│ │  (RAG+Chat)  │ │ (Auth+Profile) │  │
│  └──────┬───────┘ └──────┬───────┘ └───────┬────────┘  │
└─────────┼────────────────┼─────────────────┼────────────┘
          │                │                 │
          ▼                ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                           │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │  PostgreSQL   │ │    Redis     │ │  pgvector      │  │
│  │  (主数据存储)  │ │  (缓存+会话) │ │ (向量检索)     │  │
│  └──────────────┘ └──────────────┘ └────────────────┘  │
└─────────────────────────────────────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────────────────────────────────────────────┐
│                  External Services                      │
│  ┌──────────┐ ┌───────────┐ ┌──────────────────────┐   │
│  │  OpenAI  │ │  Anthropic │ │  通义千问 (DashScope) │   │
│  └──────────┘ └───────────┘ └──────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 分层职责

### Client Layer（apps/web）

| 层级 | 职责 | 技术 |
|------|------|------|
| RSC Page | 数据获取 + SEO + 初始渲染 | React Server Components |
| Client Component | 交互 + 状态 + 实时更新 | React 19 + Hooks |
| Streaming SSR | AI 对话流式渲染 | ReadableStream + Suspense |

### API Layer（apps/api）

| 组件 | 职责 | 路由前缀 |
|------|------|---------|
| tRPC Router | 类型安全 RPC 调用 | `/trpc/*` |
| Hono Server | REST API + Webhook + Auth | `/api/*` |

### Service Layer

| 服务 | 职责 | 依赖 |
|------|------|------|
| DrugService | 药品 CRUD + 搜索 + 相互作用 | PostgreSQL + pgvector |
| AIService | RAG 检索 + LLM 调用 + Streaming | ai-sdk + Redis |
| UserService | 认证 + 授权 + 档案管理 | PostgreSQL + Redis |

### Data Layer

| 存储 | 用途 | 数据类型 |
|------|------|---------|
| PostgreSQL | 主数据存储 | 用户、药品、提醒、对话 |
| pgvector | 向量检索 | 药品说明书 Embedding |
| Redis | 缓存 + 会话 + 队列 | Session、热点数据、任务队列 |

---

## 3. 核心数据流

### 3.1 AI 对话流程（RAG）

```
用户输入问题
    │
    ▼
┌─────────────┐
│ Query 预处理 │ ← 意图识别 + 关键词提取
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ 向量检索 pgvector │ ← Embedding 搜索相关药品文档
└──────┬──────────┘
       │ Top-K 文档片段
       ▼
┌─────────────────┐
│  Context 组装    │ ← 拼接系统 Prompt + 检索结果 + 用户档案
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  LLM Streaming  │ ← 调用 AI 模型，流式返回
└──────┬──────────┘
       │ SSE / ReadableStream
       ▼
┌─────────────────┐
│  前端流式渲染    │ ← 逐字显示 + 引用标注
└─────────────────┘
```

### 3.2 认证流程

```
用户登录请求
    │
    ▼
┌──────────────┐
│  验证凭据     │ ← 邮箱/密码 或 OAuth Token
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  签发 JWT     │ ← Access Token (15min) + Refresh Token (7d)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  存储 Session │ ← Redis 存储 Refresh Token
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  返回客户端   │ ← HttpOnly Cookie + CSRF Token
└──────────────┘
```

---

## 4. Monorepo 依赖关系

```
apps/web ──────┬──→ packages/ui
               ├──→ packages/shared
               └──→ packages/ai-sdk

apps/api ──────┬──→ packages/shared
               └──→ packages/ai-sdk

apps/ai-engine ┬──→ packages/shared
               └──→ packages/ai-sdk
```

**规则**：
- `apps/*` 可以依赖 `packages/*`
- `packages/*` 之间禁止循环依赖
- `packages/shared` 是最底层，不依赖其他包

---

## 5. 部署架构

### 开发环境

```
Local Machine
├── Next.js Dev Server (port 3000)
├── Hono Dev Server (port 3001)
├── AI Engine Dev Server (port 3002)
├── PostgreSQL (Docker, port 5432)
└── Redis (Docker, port 6379)
```

### 生产环境（Vercel + 外部服务）

```
Vercel
├── apps/web → Vercel Edge Network (CDN + SSR)
├── apps/api → Vercel Serverless Functions
└── apps/ai-engine → Vercel Serverless Functions

External
├── Neon / Supabase → PostgreSQL + pgvector
├── Upstash → Redis (Serverless)
└── OpenAI / Anthropic → LLM API
```

---

## 6. 安全架构

| 层级 | 措施 |
|------|------|
| 传输层 | HTTPS 强制 + HSTS |
| 认证层 | JWT + Refresh Token + CSRF |
| 授权层 | RBAC（基于角色的访问控制） |
| 数据层 | 输入验证（Zod） + SQL 参数化 |
| API 层 | Rate Limiting + API Key 轮转 |
| 客户端 | CSP + XSS 防护 + HttpOnly Cookie |

---

## 7. 监控与可观测性

| 维度 | 工具 | 指标 |
|------|------|------|
| 错误追踪 | Sentry | 异常堆栈 + 用户反馈 |
| 性能监控 | Vercel Analytics | Core Web Vitals |
| 日志 | 结构化日志（JSON） | 请求链路 + 错误详情 |
| AI 指标 | 自建 Dashboard | Token 用量 + 延迟 + 成本 |
