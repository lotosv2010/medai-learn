# MedAI Learn

> 以「医疗 AI 助手」为载体，系统性覆盖 AI 应用工程师所需的全栈知识体系。

## 项目定位

这是一个 **边做边学** 的全栈 AI 应用项目，专为有 10 年前端经验、目标转型 AI 应用工程师的开发者设计。每个技术决策背后都有对应的学习目标。

**业务载体**：医疗 AI 助手 — 药品查询、用药提醒、智能问诊、健康档案管理

---

## 快速开始

```bash
# 前置条件：Node.js >= 20，pnpm >= 9
corepack enable
pnpm install

# 启动全部服务
pnpm dev

# 单独启动
pnpm --filter web dev          # 前端 http://localhost:3000
pnpm --filter api dev          # 后端 http://localhost:3001
pnpm --filter ai-engine dev    # AI 服务 http://localhost:3002

# 类型检查 / 测试 / 构建
pnpm typecheck
pnpm test
pnpm build
```

---

## 项目结构

```
medai-learn/
├── apps/
│   ├── web/                    # Next.js 15 前端
│   ├── api/                    # Hono + tRPC 后端
│   └── ai-engine/             # AI 核心（LLM / RAG / Agent）
├── packages/
│   ├── ui/                     # 组件库（Shadcn + Tailwind）
│   ├── shared/                 # 共享类型与工具
│   └── ai-sdk/                 # AI SDK 抽象层
├── docs/
│   ├── PRD.md                  # 产品需求
│   ├── SPEC.md                 # 技术规格
│   ├── ARCHITECTURE.md         # 架构设计
│   ├── DESIGN.md               # 详细设计
│   ├── tasks/                  # 任务管理
│   ├── decisions/              # 架构决策记录（ADR）
│   └── learning/               # 学习进度与笔记
└── .claude/                    # Claude Code 配置
```

---

## 技术栈

| 层级 | 技术 | 学习目标 |
|------|------|---------|
| 前端 | Next.js 15 + React 19 | RSC / SSR / Hooks 原理 |
| 后端 | Hono + tRPC + Drizzle | 事件循环 / 类型安全 / ORM |
| AI | Vercel AI SDK + LangChain | RAG / Agent / Streaming |
| 数据 | PostgreSQL + pgvector + Redis | 向量检索 / 缓存 |
| 工程 | Turborepo + pnpm | Monorepo / 构建优化 |

---

## 学习路径

- **Phase 1**（第 1 月）：Monorepo 搭建 + TypeScript 类型系统 + 基础组件库 + 认证
- **Phase 2**（第 2-3 月）：LLM 接入 + RAG 系统 + AI 对话 + Agent
- **Phase 3**（第 4 月）：后端 API + 数据库优化 + 缓存 + 性能监控
- **Phase 4**（第 5 月）：CI/CD + 微前端 + 性能优化 + 部署

详见 [docs/learning/progress.json](docs/learning/progress.json)

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [PRD.md](docs/PRD.md) | 产品需求文档 — 用户故事与功能清单 |
| [SPEC.md](docs/SPEC.md) | 技术规格 — 技术栈约束与非功能性需求 |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 架构设计 — 系统分层与数据流 |
| [DESIGN.md](docs/DESIGN.md) | 详细设计 — 模块接口与数据库 Schema |
| [CURRENT.md](docs/tasks/CURRENT.md) | 当前任务看板 |
| [decisions/](docs/decisions/) | 架构决策记录（ADR） |

---

## License

MIT — 学习项目，自由使用。
