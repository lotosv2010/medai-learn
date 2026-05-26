# 详细设计文档（DESIGN）

> 定义模块接口、数据库 Schema、API 契约与关键算法。

---

## 1. 数据库 Schema

### users 表

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(100) NOT NULL,
  avatar_url    TEXT,
  password_hash VARCHAR(255),           -- OAuth 用户可为 NULL
  provider      VARCHAR(50) DEFAULT 'email',  -- email | google | wechat
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

### health_profiles 表

```sql
CREATE TABLE health_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  allergies           JSONB DEFAULT '[]',      -- ["青霉素", "磺胺类"]
  conditions          JSONB DEFAULT '[]',      -- ["高血压", "糖尿病"]
  current_medications JSONB DEFAULT '[]',      -- ["阿莫西林 0.5g tid"]
  blood_type          VARCHAR(10),             -- A | B | AB | O
  birth_date          DATE,
  gender              VARCHAR(10),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### drugs 表

```sql
CREATE TABLE drugs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200) NOT NULL,       -- 商品名
  generic_name    VARCHAR(200) NOT NULL,       -- 通用名
  category        VARCHAR(100),                -- 分类
  description     TEXT,                        -- 简介
  usage           TEXT,                        -- 用法用量
  dosage          TEXT,                        -- 剂型规格
  side_effects    TEXT,                        -- 不良反应
  contraindications TEXT,                      -- 禁忌
  precautions     TEXT,                        -- 注意事项
  storage         TEXT,                        -- 储存条件
  manufacturer    VARCHAR(200),                -- 生产厂家
  approval_number VARCHAR(100),                -- 批准文号
  embedding       VECTOR(1536),                -- pgvector 向量
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_drugs_name ON drugs USING gin(to_tsvector('chinese', name || ' ' || generic_name));
CREATE INDEX idx_drugs_embedding ON drugs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### drug_interactions 表

```sql
CREATE TABLE drug_interactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_a_id     UUID NOT NULL REFERENCES drugs(id),
  drug_b_id     UUID NOT NULL REFERENCES drugs(id),
  severity      VARCHAR(20) NOT NULL,         -- contraindicated | major | moderate | minor
  description   TEXT NOT NULL,                -- 相互作用说明
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(drug_a_id, drug_b_id)
);
```

### conversations 表

```sql
CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200),
  model       VARCHAR(50) DEFAULT 'gpt-4o',  -- 使用的模型
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at DESC);
```

### messages 表

```sql
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            VARCHAR(20) NOT NULL,       -- user | assistant | system
  content         TEXT NOT NULL,
  citations       JSONB DEFAULT '[]',         -- [{drugId, drugName, relevance}]
  token_count     INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
```

### reminders 表

```sql
CREATE TABLE reminders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drug_id     UUID NOT NULL REFERENCES drugs(id),
  drug_name   VARCHAR(200) NOT NULL,         -- 冗余，避免 JOIN
  dosage      VARCHAR(100),                  -- "1片"
  schedule    VARCHAR(100) NOT NULL,         -- cron 表达式
  start_date  DATE NOT NULL,
  end_date    DATE,
  status      VARCHAR(20) DEFAULT 'active',  -- active | paused | completed
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 2. API 设计（tRPC Router）

### drugRouter

```typescript
interface DrugRouter {
  // 搜索药品
  search: Procedure<{ keyword: string; page?: number; pageSize?: number }, PaginatedResult<Drug>>

  // 获取详情
  getById: Procedure<{ id: string }, Drug>

  // 查询相互作用
  checkInteraction: Procedure<{ drugIds: string[] }, Interaction[]>

  // 获取热门药品
  getPopular: Procedure<{ limit?: number }, Drug[]>
}
```

### chatRouter

```typescript
interface ChatRouter {
  // 创建会话
  create: Procedure<{ title?: string }, Conversation>

  // 发送消息（Streaming）
  sendMessage: Procedure<{ conversationId: string; content: string }, StreamingResponse>

  // 获取历史
  getHistory: Procedure<{ conversationId: string; limit?: number }, Message[]>

  // 获取会话列表
  list: Procedure<{ page?: number }, PaginatedResult<Conversation>>

  // 删除会话
  delete: Procedure<{ id: string }, void>
}
```

### userRouter

```typescript
interface UserRouter {
  // 获取当前用户
  me: Procedure<void, User>

  // 更新档案
  updateProfile: Procedure<Partial<HealthProfile>, HealthProfile>

  // 获取健康档案
  getHealthProfile: Procedure<void, HealthProfile>
}
```

### reminderRouter

```typescript
interface ReminderRouter {
  // 创建提醒
  create: Procedure<CreateReminderInput, Reminder>

  // 获取提醒列表
  list: Procedure<{ status?: string }, Reminder[]>

  // 更新提醒
  update: Procedure<{ id: string; data: Partial<Reminder> }, Reminder>

  // 记录服药
  logIntake: Procedure<{ reminderId: string; status: 'taken' | 'skipped' | 'delayed' }, void>

  // 删除提醒
  delete: Procedure<{ id: string }, void>
}
```

---

## 3. AI 模块设计

### RAG Pipeline

```typescript
interface RAGConfig {
  // Embedding 配置
  embedding: {
    model: 'text-embedding-3-small' | 'text-embedding-3-large'
    dimensions: number
    chunkSize: number        // 文档分块大小
    chunkOverlap: number     // 分块重叠
  }

  // 检索配置
  retrieval: {
    topK: number             // 返回最相关的 K 个片段
    scoreThreshold: number   // 最低相似度阈值
    rerank: boolean          // 是否重排序
  }

  // 生成配置
  generation: {
    model: string
    temperature: number
    maxTokens: number
    systemPrompt: string
  }
}
```

### Prompt 模板

```
你是一个专业的医疗 AI 助手。请基于以下参考资料回答用户的问题。

【重要规则】
1. 仅基于提供的参考资料回答，不要编造信息
2. 如果参考资料不足以回答，请明确告知
3. 必须标注信息来源（药品名称）
4. 回答末尾添加免责声明

【参考资料】
{context}

【用户健康档案】
{healthProfile}

【用户问题】
{question}
```

### 多模型路由策略

```typescript
interface ModelRouter {
  // 根据问题类型选择模型
  selectModel(query: Query): ModelConfig

  // 规则：
  // - 简单药品查询 → 通义千问（成本低）
  // - 复杂用药分析 → GPT-4o（能力强）
  // - 敏感医疗问题 → Claude（安全性高）
}
```

---

## 4. 组件库设计（packages/ui）

### 原子组件

```
packages/ui/src/
├── components/
│   ├── button.tsx          # Button（variants: primary/secondary/ghost）
│   ├── input.tsx           # Input（支持 icon、clearable）
│   ├── card.tsx            # Card（header/body/footer slots）
│   ├── dialog.tsx          # Dialog（基于 Radix）
│   ├── select.tsx          # Select（搜索 + 多选）
│   ├── badge.tsx           # Badge（severity 等级）
│   ├── skeleton.tsx        # Skeleton（加载态）
│   └── toast.tsx           # Toast（通知）
├── layouts/
│   ├── sidebar.tsx         # 侧边栏布局
│   └── header.tsx          # 顶部导航
└── patterns/
    ├── search-bar.tsx      # 搜索栏（联想 + 历史）
    ├── message-bubble.tsx  # 聊天气泡（支持 Markdown）
    └── drug-card.tsx       # 药品卡片
```

---

## 5. 状态管理

### 客户端状态（Zustand）

```typescript
// stores/auth-store.ts
interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  login: (credentials: LoginInput) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
}

// stores/chat-store.ts
interface ChatStore {
  conversations: Conversation[]
  activeConversation: string | null
  isStreaming: boolean
  sendMessage: (content: string) => Promise<void>
  abortStream: () => void
}
```

### 服务端状态（tRPC + React Query）

- 自动缓存 + 失效策略
- Optimistic Updates（乐观更新）
- 后台重新验证（stale-while-revalidate）

---

## 6. 错误处理

### 错误分类

| 类型 | HTTP 状态码 | 处理方式 |
|------|-----------|---------|
| 验证错误 | 400 | 返回字段级错误信息 |
| 认证错误 | 401 | 跳转登录页 |
| 授权错误 | 403 | 显示权限不足提示 |
| 资源不存在 | 404 | 显示 404 页面 |
| AI 服务错误 | 502 | 重试 + 降级策略 |
| 服务器错误 | 500 | 上报 Sentry + 用户友好提示 |

### AI 降级策略

```
主模型调用失败
    │
    ├── 重试（最多 2 次，指数退避）
    │
    ├── 切换备用模型（如 GPT-4o → Claude）
    │
    └── 返回预设回答 + 提示稍后重试
```
