# 技术规格文档（SPEC）

> 定义项目的技约束、质量标准与非功能性需求。

---

## 1. 运行环境

| 约束 | 值 |
|------|-----|
| Node.js | >= 20.x LTS |
| pnpm | >= 9.x |
| TypeScript | >= 5.5（strict 模式） |
| 操作系统 | macOS / Linux（开发），Linux（部署） |

---

## 2. 技术栈锁定

### 前端（apps/web）

| 依赖 | 版本 | 选型理由 |
|------|------|---------|
| Next.js | 15.x | App Router + RSC + Streaming SSR |
| React | 19.x | Server Components + use() Hook |
| Tailwind CSS | 4.x | 原子化 CSS + 设计系统 |
| Shadcn/ui | latest | 可访问组件 + 可定制 |
| Zustand | latest | 轻量状态管理（学习对比 Redux） |

### 后端（apps/api）

| 依赖 | 版本 | 选型理由 |
|------|------|---------|
| Hono | latest | 轻量 Web 框架 + Edge Runtime 支持 |
| tRPC | 11.x | 端到端类型安全 |
| Drizzle ORM | latest | 类型安全 SQL + 轻量 |
| PostgreSQL | 16.x | 主数据库 + pgvector 扩展 |
| Redis | 7.x | 缓存 + 会话存储 |

### AI 引擎（apps/ai-engine）

| 依赖 | 版本 | 选型理由 |
|------|------|---------|
| Vercel AI SDK | 4.x | 统一 AI 接口 + Streaming |
| LangChain | latest | RAG / Agent 编排 |
| OpenAI SDK | latest | GPT 系列接入 |
| Anthropic SDK | latest | Claude 系列接入 |

---

## 3. 代码质量标准

### TypeScript 约束

```json
// tsconfig.json 关键配置
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "exactOptionalPropertyTypes": true,
  "forceConsistentCasingInFileNames": true
}
```

- 禁止 `any`（必须用 `unknown` + 类型守卫）
- 禁止 `@ts-ignore`（必须用 `@ts-expect-error` + 注释原因）
- 所有函数必须显式声明返回类型

### 代码复杂度

| 指标 | 阈值 |
|------|------|
| 圈复杂度 | <= 10 |
| 函数行数 | <= 50 |
| 文件行数 | <= 300 |
| 嵌套深度 | <= 4 |
| 参数数量 | <= 5 |

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 变量/函数 | camelCase | `getUserById` |
| 组件 | PascalCase | `UserCard` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 类型/接口 | PascalCase + 前缀 I（可选） | `UserProfile` |
| 文件（组件） | kebab-case | `user-card.tsx` |
| 文件（工具） | kebab-case | `format-date.ts` |

---

## 4. 非功能性需求

### 性能

| 指标 | 目标 |
|------|------|
| LCP（Largest Contentful Paint） | < 2.5s |
| FID（First Input Delay） | < 100ms |
| CLS（Cumulative Layout Shift） | < 0.1 |
| TTFB（Time to First Byte） | < 800ms |
| Bundle Size（首屏） | < 200KB gzipped |

### 安全

- 所有 API 请求必须经过身份验证（除公开端点）
- 敏感数据（API Key、密码）禁止出现在客户端代码
- CSP（Content Security Policy）必须启用
- 输入验证：所有用户输入必须经过 Zod schema 验证

### 可访问性

- 所有交互元素必须支持键盘操作
- 图片必须有 alt 文本
- 颜色对比度 >= 4.5:1（WCAG AA）
- 表单必须有关联的 label

### 测试覆盖

| 类型 | 覆盖率目标 |
|------|-----------|
| 单元测试 | >= 80% |
| 集成测试 | 关键路径 100% |
| E2E 测试 | 核心用户流程 |

---

## 5. Git 规范

### 提交格式

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**type**：`feat` / `fix` / `docs` / `refactor` / `test` / `chore` / `perf` / `ci`

### 分支策略

| 分支 | 用途 |
|------|------|
| `main` | 稳定版本 |
| `develop` | 开发主线 |
| `feature/*` | 功能分支 |
| `fix/*` | 修复分支 |
| `release/*` | 发布准备 |

---

## 6. 环境变量

```bash
# AI 模型
OPENAI_API_KEY=              # OpenAI GPT 系列
ANTHROPIC_API_KEY=           # Claude 系列
DASHSCOPE_API_KEY=           # 通义千问

# 数据库
DATABASE_URL=postgresql://user:pass@host:5432/medai
REDIS_URL=redis://host:6379

# 认证
NEXTAUTH_SECRET=             # >= 32 字符随机字符串
NEXTAUTH_URL=http://localhost:3000

# 可选
SENTRY_DSN=                  # 错误监控
VERCEL_URL=                  # 部署 URL
```
