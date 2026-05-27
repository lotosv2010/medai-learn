# SPEC · 技术规格说明

**版本**：v0.1.0 · **状态**：草稿 · **更新**：2025-01-01

> 本文档描述系统的技术规格、接口约定、数据模型和非功能约束。
> PRD 定义「做什么」，SPEC 定义「怎么做」。

---

## 1. 接口规范

### 1.1 基础约定

所有 API 遵循以下约定：

```
Base URL:    http://localhost:3001/api  (开发)
             https://api.medai.app/api   (生产，占位)
协议:        HTTPS（生产）/ HTTP（开发）
格式:        JSON（Content-Type: application/json）
编码:        UTF-8
时间格式:    ISO 8601（2025-01-01T12:00:00Z）
分页方式:    游标分页（cursor-based，不用 offset）
```

### 1.2 认证方式

```
认证头:  Authorization: Bearer <jwt_token>
Token 有效期:  访问令牌 1h，刷新令牌 7d
刷新端点:  POST /api/auth/refresh
```

### 1.3 统一响应格式

```typescript
// 成功响应
type SuccessResponse<T> = {
  success: true
  data: T
  meta?: {
    cursor?: string      // 游标分页
    hasMore?: boolean
    total?: number
  }
}

// 错误响应
type ErrorResponse = {
  success: false
  error: {
    code: string         // 机器可读错误码，如 "DRUG_NOT_FOUND"
    message: string      // 人类可读描述
    details?: unknown    // 验证错误详情等
  }
}
```

### 1.4 错误码规范

| 错误码 | HTTP 状态 | 含义 |
|--------|-----------|------|
| `UNAUTHORIZED` | 401 | 未登录或 Token 失效 |
| `FORBIDDEN` | 403 | 无权访问该资源 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 422 | 请求参数校验失败 |
| `RATE_LIMITED` | 429 | 请求频率超限 |
| `AI_UNAVAILABLE` | 503 | AI 服务暂时不可用 |
| `INTERNAL_ERROR` | 500 | 服务内部错误 |

### 1.5 限流规则

| 接口类型 | 限制 | 窗口 |
|---------|------|------|
| AI 对话接口 | 20 次/用户 | 每分钟 |
| 文件上传 | 5 次/用户 | 每分钟 |
| 普通 API | 200 次/用户 | 每分钟 |
| 未认证请求 | 30 次/IP | 每分钟 |

---

## 2. 核心数据模型

### 2.1 用户（User）

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL UNIQUE,
  name        VARCHAR(100),
  avatar_url  TEXT,
  password_hash VARCHAR(255),          -- null 表示 OAuth 用户
  email_verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

TypeScript 类型（packages/shared/types/user.ts）：

```typescript
export type User = {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  emailVerifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// 对外暴露（脱敏）
export type PublicUser = Omit<User, 'createdAt' | 'updatedAt'>
```

### 2.2 对话会话（Conversation）

```sql
CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200),                   -- 首轮消息自动生成
  model       VARCHAR(50) NOT NULL,           -- 使用的 AI 模型
  message_count INTEGER NOT NULL DEFAULT 0,
  deleted_at  TIMESTAMPTZ,                    -- 软删除
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id)
  WHERE deleted_at IS NULL;                   -- 过滤已删除
```

### 2.3 消息（Message）

```typescript
// packages/shared/types/message.ts
export type MessageRole = 'user' | 'assistant' | 'system'

export type Message = {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  // AI 消息的附加信息
  model?: string
  promptTokens?: number
  completionTokens?: number
  // RAG 引用来源
  sources?: RAGSource[]
  createdAt: Date
}

export type RAGSource = {
  drugName: string
  section: string         // 如"不良反应"、"注意事项"
  excerpt: string         // 相关段落摘要（50 字以内）
  similarity: number      // 余弦相似度 0-1
}
```

### 2.4 药品文档（DrugDocument）

```sql
CREATE TABLE drug_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_name   VARCHAR(200) NOT NULL,
  generic_name VARCHAR(200),                  -- 通用名
  manufacturer VARCHAR(200),
  approval_number VARCHAR(50),                -- 批准文号
  content     TEXT NOT NULL,                  -- 原始说明书文本
  version     VARCHAR(20),                    -- 说明书版本
  source_url  TEXT,
  indexed_at  TIMESTAMPTZ,                    -- 完成向量化的时间
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 向量化分块表
CREATE TABLE drug_chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES drug_documents(id) ON DELETE CASCADE,
  section     VARCHAR(100) NOT NULL,          -- 章节名
  content     TEXT NOT NULL,                  -- 分块文本
  chunk_index INTEGER NOT NULL,               -- 在文档中的顺序
  embedding   vector(1536),                   -- OpenAI text-embedding-3-small
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_drug_chunks_embedding
  ON drug_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

## 3. tRPC 路由规格

### 3.1 路由结构

```typescript
// 路由树（apps/api/src/router/index.ts）
appRouter = {
  auth: {
    register:  mutation  // 用户注册
    login:     mutation  // 邮箱密码登录
    logout:    mutation  // 登出
    refresh:   mutation  // 刷新 Token
    me:        query     // 获取当前用户信息
  },
  conversation: {
    list:      query     // 获取对话列表（游标分页）
    get:       query     // 获取单条对话（含消息）
    create:    mutation  // 创建新对话
    delete:    mutation  // 删除对话（软删除）
    export:    query     // 导出对话（返回 Markdown）
  },
  message: {
    send:      mutation  // 发送消息（触发 AI 流式响应）
    list:      query     // 获取消息列表
  },
  drug: {
    search:    query     // 药品全文搜索
    get:       query     // 获取药品详情
  },
  ai: {
    // 注意：流式 AI 不走 tRPC，走独立 SSE 端点
    // POST /api/ai/chat → SSE 流
    chatStream: 'standalone SSE endpoint'
  }
}
```

### 3.2 关键接口详细规格

#### `conversation.list`

```typescript
// 输入
type ConversationListInput = {
  cursor?: string      // 游标，首次请求不传
  limit?: number       // 默认 20，最大 50
}

// 输出
type ConversationListOutput = {
  conversations: Array<{
    id: string
    title: string | null
    messageCount: number
    model: string
    updatedAt: Date
  }>
  nextCursor: string | null
  hasMore: boolean
}
```

#### `ai/chat SSE 端点`

```
POST /api/ai/chat
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "conversationId": "uuid",      // 已有对话 ID，或 null 创建新对话
  "message": "布洛芬能和什么一起吃",
  "imageBase64": null            // 处方图片（可选）
}

Response: text/event-stream
event: delta
data: {"content": "布洛芬", "conversationId": "uuid"}

event: delta
data: {"content": "是一种非甾体..."}

event: sources
data: {"sources": [{"drugName": "布洛芬片说明书", "section": "药物相互作用", ...}]}

event: done
data: {"messageId": "uuid", "totalTokens": 856}

event: error
data: {"code": "AI_UNAVAILABLE", "message": "AI 服务暂时不可用"}
```

---

## 4. RAG 流程规格

```
输入问题
  │
  ├─ 1. 问题向量化（text-embedding-3-small，维度 1536）
  │
  ├─ 2. 向量检索（pgvector cosine，Top-K=10）
  │
  ├─ 3. 关键词检索（PostgreSQL 全文搜索，Top-K=10）
  │
  ├─ 4. RRF 融合排序（Reciprocal Rank Fusion）
  │
  ├─ 5. 重排序（取 Top-5 作为上下文）
  │
  ├─ 6. Prompt 构建
  │      system: 角色设定 + 安全约束
  │      context: RAG 检索结果（附来源标注）
  │      history: 最近 10 轮对话（token 限制内）
  │      user: 当前问题
  │
  └─ 7. LLM 生成（Claude 3.5 Sonnet，流式输出）
```

**分块策略**（药品说明书专用）：

```
按章节分块（优先）：
  识别标准章节标题：适应症 / 用法用量 / 不良反应 / 
  禁忌 / 注意事项 / 药物相互作用 / 规格 / 储藏

每块大小：
  目标：500 token
  最小：100 token（避免语义丢失）
  最大：800 token（超出则按句子拆分）

重叠：50 token 重叠（保留跨块语义）
```

---

## 5. 环境变量规格

```bash
# ===== 必填（服务启动依赖）=====
DATABASE_URL=postgresql://user:pass@host:5432/dbname
NEXTAUTH_SECRET=<32字节随机字符串>
NEXTAUTH_URL=http://localhost:3000

# ===== AI 模型（至少配置一个）=====
ANTHROPIC_API_KEY=sk-ant-...        # Claude（推荐）
OPENAI_API_KEY=sk-...               # OpenAI（备用）
DASHSCOPE_API_KEY=sk-...            # 通义千问（国内备用）

# ===== 可选 =====
REDIS_URL=redis://localhost:6379    # 缓存 + 限流（不配则降级）
SMTP_HOST=                          # 邮件发送（注册验证用）
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# ===== 运行时配置 =====
DEFAULT_AI_MODEL=claude-3-5-sonnet-20241022
MAX_CONTEXT_TURNS=10                # 对话上下文保留轮数
RAG_TOP_K=5                         # 最终使用的检索块数量
RATE_LIMIT_AI=20                    # AI 接口每分钟限制
```

---

## 6. 非功能规格

### 6.1 可观测性

```
日志：
  格式：JSON 结构化日志（生产）/ 彩色终端（开发）
  级别：error / warn / info / debug
  必须包含：requestId / userId / duration / method

指标（未来接入）：
  - AI 调用次数 & 延迟（按模型）
  - RAG 召回率（抽样评估）
  - API 错误率（按接口）
```

### 6.2 错误处理策略

```
AI 服务降级策略（按优先级尝试）：
  1. Claude 3.5 Sonnet（主）
  2. GPT-4o-mini（备）
  3. 通义千问 Plus（国内备）
  4. 返回降级提示（"AI 服务繁忙，请稍后重试"）

重试策略：
  - 网络超时：重试 2 次，间隔 1s / 2s
  - 限流错误：不重试，直接返回 429
  - 服务器 5xx：重试 1 次，切换备用模型
```

### 6.3 数据安全

```
敏感字段加密：
  - 用户密码：bcrypt，rounds=12
  - API Key：不存数据库，只读环境变量

数据隔离：
  - 所有数据查询必须带 user_id 条件（行级权限）
  - API 层通过 tRPC middleware 注入 userId，杜绝遗漏

CORS 配置：
  允许域名：localhost:3000（开发）/ 生产域名（上线后配置）
  允许方法：GET / POST / DELETE
  不允许：* 通配符（生产禁止）
```

---

*SPEC 优先于代码注释——代码可能过时，SPEC 是最终裁定。发现代码与 SPEC 不一致时，以 SPEC 为准修改代码，并在 PR 说明中注明。*
