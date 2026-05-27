# ARCHITECTURE · 系统架构文档

**版本**：v0.1.0 · **状态**：草稿 · **更新**：2025-01-01

> 本文档描述 MedAI Learn 的整体架构设计、模块关系和关键数据流。
> 架构是活的——每次重大决策记录在 `docs/decisions/` 中。

---

## 1. 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│              Browser（Next.js 15 / React 19）               │
│   页面渲染 · 对话 UI · 流式显示 · 状态管理 · 路由           │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP / SSE / tRPC
┌────────────────────────▼────────────────────────────────────┐
│                       API Layer (BFF)                        │
│                    apps/api (Hono + tRPC)                    │
│  认证中间件 · 限流 · 路由聚合 · 格式转换 · 错误处理          │
└──────────────┬──────────────────────┬───────────────────────┘
               │ 内部 HTTP            │ Drizzle ORM
┌──────────────▼──────────┐  ┌────────▼──────────────────────┐
│     AI Engine Layer     │  │       Data Layer              │
│  apps/ai-engine         │  │  PostgreSQL 16 + pgvector     │
│  LLM 路由 · RAG 流水线  │  │  Redis（缓存 + 限流 + Session）│
│  Agent 推理 · Prompt    │  │                               │
└──────────────┬──────────┘  └───────────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────────────────────────┐
│                    External AI Services                      │
│   Anthropic Claude   ·   OpenAI   ·   Alibaba DashScope     │
└─────────────────────────────────────────────────────────────┘
```

### 设计原则

- **单向数据流**：Client → API → AI Engine → External，避免横向耦合
- **AI 能力隔离**：ai-engine 独立部署，可单独扩缩，api 通过 HTTP 调用
- **类型安全贯穿**：从数据库 schema（Drizzle）到前端页面（tRPC），无 any
- **渐进式复杂度**：先走通最简路径，再逐步引入 Redis / pgvector 等

---

## 2. Monorepo 模块职责

### 2.1 应用层（apps/）

| 模块 | 端口 | 职责 | 边界 |
|------|------|------|------|
| `apps/web` | 3000 | 用户界面，SSR + 流式渲染 | 不直接访问数据库；通过 tRPC 与 api 通信 |
| `apps/api` | 3001 | BFF 网关，认证，业务逻辑 | 不做 AI 推理；调用 ai-engine |
| `apps/ai-engine` | 3002 | AI 能力封装，RAG，Agent | 不做认证；信任来自 api 的请求 |

**为什么拆成三个服务而不是一个 Next.js 全栈？**
→ 见 [ADR-0001](decisions/0001-monorepo-tooling.md)

### 2.2 共享包层（packages/）

| 包 | 职责 | 被哪些模块使用 |
|----|------|--------------|
| `packages/shared` | TypeScript 类型定义、工具函数、常量 | 全部 apps 和 packages |
| `packages/ui` | 基础 UI 组件库（无业务逻辑） | apps/web |
| `packages/ai-sdk` | AI 模型统一接口（隐藏多模型细节） | apps/ai-engine |

---

## 3. 关键数据流

### 3.1 AI 对话流（核心流程）

```
用户输入消息
  │
  ▼
[apps/web] ChatInput 组件
  │  fetch POST /api/ai/chat （带 Authorization Header）
  ▼
[apps/api] /api/ai/chat 路由
  ├─ 1. JWT 验证（从 Header 提取 userId）
  ├─ 2. 限流检查（Redis：20次/min/user）
  ├─ 3. 存储用户消息到 DB（messages 表）
  │
  │  fetch POST http://ai-engine:3002/chat （内网，无需认证）
  ▼
[apps/ai-engine] /chat 路由
  ├─ 1. 问题向量化（text-embedding-3-small）
  ├─ 2. pgvector 向量检索（Top-K=10）
  ├─ 3. 全文检索（PostgreSQL FTS，Top-K=10）
  ├─ 4. RRF 融合 + 重排序（Top-5）
  ├─ 5. 构建 Prompt（System + Context + History + User）
  │
  │  SSE stream from Anthropic Claude API
  ▼
[Claude API] 流式 token 输出
  │
  ▼
[apps/ai-engine] 透传 SSE 流给 api
  ▼
[apps/api] 透传 SSE 流给前端 + 异步存储 AI 消息到 DB
  ▼
[apps/web] StreamingMessage 组件
  └─ useStreamingText hook 实时追加 token 到 DOM
```

### 3.2 用户认证流

```
[web] LoginForm 提交
  │  tRPC mutation: auth.login
  ▼
[api] auth.login handler
  ├─ 1. 查询用户（email）
  ├─ 2. bcrypt 校验密码
  ├─ 3. 生成 JWT access_token（1h）+ refresh_token（7d）
  ├─ 4. refresh_token 存 Redis（key: refresh:{userId}:{tokenId}）
  └─ 5. 返回 access_token，refresh_token 通过 HttpOnly Cookie 设置
  ▼
[web] 存储 access_token 到内存（不存 localStorage！）
     通过 React Context 传递给需要认证的组件
```

### 3.3 RAG 知识库建立（离线流程）

```
[脚本] scripts/ingest-drugs.ts
  │
  ├─ 1. 读取 /data/drug-docs/ 目录的 PDF/TXT 文件
  ├─ 2. 解析文本（pdf-parse）
  ├─ 3. 按章节分块（drugs-specific chunking 策略）
  ├─ 4. 批量向量化（text-embedding-3-small，50 chunks/batch）
  ├─ 5. 批量写入 drug_chunks 表（含 vector 列）
  └─ 6. 更新 drug_documents.indexed_at
```

---

## 4. 状态管理架构

```
Server State（服务端数据）:   React Query / tRPC
  ├─ 对话列表、消息记录、用户信息
  └─ 自动缓存、后台刷新、乐观更新

Client State（UI 交互状态）:  Zustand
  ├─ 当前对话 ID
  ├─ 流式输出缓冲区
  ├─ UI 开关（侧边栏展开、主题）
  └─ 认证状态（access_token 内存存储）

Form State（表单）:           React Hook Form
  └─ 登录/注册/设置表单
```

---

## 5. 部署架构（目标）

```
开发环境:
  localhost:3000  → Next.js dev server
  localhost:3001  → api（ts-node --watch）
  localhost:3002  → ai-engine（ts-node --watch）
  localhost:5432  → PostgreSQL（Docker）
  localhost:6379  → Redis（Docker）

生产环境（Phase 4 目标）:
  Vercel         → apps/web（Edge + SSR）
  Railway/Render → apps/api（Node.js）
  Railway/Render → apps/ai-engine（Node.js，GPU 暂不需要）
  Supabase       → PostgreSQL + pgvector
  Upstash        → Redis
```

---

## 6. 扩展点设计

以下位置预留了扩展接口，随学习深入逐步实现：

| 扩展点 | 当前实现 | 未来扩展 |
|--------|---------|---------|
| AI 模型 | Claude（硬编码） | packages/ai-sdk 策略模式，运行时切换 |
| 向量数据库 | pgvector | 接口抽象，可替换 Pinecone/Chroma |
| 分块策略 | 固定规则 | 可插拔策略，A/B 测试不同策略效果 |
| 认证方式 | 邮箱密码 | NextAuth adapter，加 OAuth 提供商 |
| 缓存层 | 无缓存 | Redis 语义缓存（相似问题缓存答案） |

---

## 7. 架构演进记录

| 时间 | 变更 | 原因 | ADR |
|------|------|------|-----|
| 2025-01 | 初始架构设计 | 项目启动 | — |

*每次重大架构变更，在 docs/decisions/ 新增 ADR，并在此表格中引用。*
