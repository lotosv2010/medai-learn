# MedAI Learn — Claude Code 学习项目

## 项目定位

这是一个 **边做边学** 的全栈 AI 应用项目，以「医疗 AI 助手」为载体，系统性地覆盖前端 10 年经验晋升 AI 应用工程师所需的全部知识体系。每个技术决策背后都有对应的学习目标。

> 业务背景：你有 1 药网 10 年医疗电商前端经验，本项目刻意设计医疗场景，让业务理解成为技术学习的杠杆。

---

## 项目架构概览

```
medai-learn/                    ← Monorepo 根（Turborepo + pnpm）
├── apps/
│   ├── web/                    ← Next.js 15 前端（React 深度 + 性能优化）
│   ├── api/                    ← Hono + Node.js 后端（全栈能力）
│   ├── ai-engine/             ← AI 核心模块（LLM / RAG / Agent）
│   └── career-roadmap/        ← 职业成长演示页（Vibing Code 分享 / Next.js 15）
├── packages/
│   ├── ui/                     ← 组件库（架构能力 + 工程化）
│   ├── shared/                 ← 共享类型 / 工具（TypeScript 深度）
│   └── ai-sdk/                 ← AI SDK 封装层（可替换模型）
├── docs/learning/              ← 学习进度 & 笔记（自动维护）
└── .claude/                    ← Claude Code Harness 配置层
```

---

## 核心命令（每次开发前确认可用）

```bash
# 安装依赖
pnpm install

# 启动全部服务（并行）
pnpm dev

# 单独启动
pnpm --filter web dev          # 前端 http://localhost:3000
pnpm --filter api dev          # 后端 http://localhost:3001
pnpm --filter ai-engine dev    # AI 服务 http://localhost:3002

# 类型检查（必须全通过）
pnpm typecheck

# 测试
pnpm test

# 构建
pnpm build
```

---

## 文档体系索引

> 开始一个新功能前，按需查阅对应文档。

| 文档 | 用途 | 何时查阅 |
|------|------|---------|
| [`docs/PRD.md`](docs/PRD.md) | 产品需求、用户故事、验收标准 | 实现新功能前确认 AC |
| [`docs/SPEC.md`](docs/SPEC.md) | 接口规范、数据模型、非功能约束 | 设计接口或数据结构时 |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | 系统架构、数据流、模块职责 | 理解模块关系、设计新模块时 |
| [`docs/DESIGN.md`](docs/DESIGN.md) | UI 设计规范、组件规范、色彩系统 | 开发 UI 组件时 |
| [`docs/tasks/CURRENT.md`](docs/tasks/CURRENT.md) | 当前迭代任务、AC、学习进度 | **每天开发前必看** |
| [`docs/decisions/`](docs/decisions/README.md) | 架构决策记录（ADR） | 遇到「为什么这样设计」的疑问时 |
| [`docs/learning/progress.json`](docs/learning/progress.json) | 知识点掌握进度 | `/checklist` 命令自动读取 |

**文档优先级**：当文档之间有冲突时，以 `SPEC.md > PRD.md > ARCHITECTURE.md` 为准，并在 `decisions/` 中记录变更原因。

---

## 技术栈 & 学习目标对照

| 模块 | 技术选型 | 核心学习目标 |
|------|---------|-------------|
| `apps/web` | Next.js 15 App Router + React 19 | Fiber 架构 / RSC / SSR / Hooks 原理 |
| `apps/api` | Hono + tRPC + Drizzle | Node.js 事件循环 / 数据库事务 |
| `apps/ai-engine` | Vercel AI SDK + LangChain | RAG / Agent / Streaming / Prompt |
| `apps/career-roadmap` | Next.js 15 App Router + CSS Variables | 演示页架构 / 组件拆分 / 响应式设计 |
| `packages/ui` | Shadcn + Tailwind + Radix | 组件库架构 / Design System |
| `packages/shared` | TypeScript 5.x | 类型体操 / 泛型约束 / 工具类型 |
| `packages/ai-sdk` | OpenAI / Claude / 通义 | 多模型抽象 / 接口设计 |
| 工程化 | Turborepo + pnpm workspace | Monorepo / 构建优化 / CI/CD |
| 数据层 | PostgreSQL + pgvector + Redis | 向量检索 / 缓存策略 |

---

## 学习约定（Claude Code 请遵守）

### 1. 写代码时同步记录学习笔记
- 每次实现新特性前，先在 `docs/learning/notes/` 创建或更新对应笔记
- 笔记格式：`{模块}-{知识点}.md`，例如 `react-fiber-reconciler.md`

### 2. 遇到新概念主动解释
- 当你（Claude）使用某个技术模式时，请在代码注释中注明 **为什么这样设计**
- 对于关键算法或设计模式，添加 `// 📚 知识点：...` 标记

### 3. 保持类型安全
- 所有代码必须通过 TypeScript 严格模式
- 禁止使用 `any`，必须明确类型
- API 层使用 tRPC 实现端到端类型安全

### 4. 代码复杂度控制
- 单个函数不超过 50 行
- 每个文件职责单一
- 复杂逻辑必须有注释

### 5. 学习进度追踪
- 完成一个功能模块后，更新 `docs/learning/progress.json`
- 标记已掌握的知识点

---

## 项目功能模块（学习路径）

### Phase 1：基础搭建（第 1 月）
- [ ] Monorepo 初始化（学：工程化）
- [ ] TypeScript 类型系统设计（学：TS 深度）
- [ ] 基础 UI 组件库（学：React 组件架构）
- [ ] 认证系统（学：OAuth / JWT / 安全）

### Phase 2：AI 核心（第 2-3 月）
- [ ] LLM API 接入层（学：AI SDK / Streaming）
- [ ] 药品说明书 RAG 系统（学：向量数据库 / Embedding）
- [ ] AI 对话界面（学：SSE / 流式渲染）
- [ ] 医疗 AI Agent（学：LangChain / Tool Use）

### Phase 3：全栈完善（第 4 月）
- [ ] 后端 API 设计（学：RESTful / tRPC）
- [ ] 数据库设计与优化（学：PostgreSQL / 索引）
- [ ] 缓存策略（学：Redis / 语义缓存）
- [ ] 性能监控（学：Core Web Vitals）

### Phase 4：工程化提升（第 5 月）
- [ ] CI/CD 流水线（学：GitHub Actions）
- [ ] 微前端拆分实验（学：Module Federation）
- [ ] 性能优化专项（学：Lighthouse / Bundle 分析）
- [ ] 部署上线（学：Vercel / Docker）

---

## 环境变量（.env.local）

```bash
# AI 模型
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DASHSCOPE_API_KEY=           # 通义千问

# 数据库
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# 认证
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

---

## 代码规范

- **命名**：变量 camelCase，组件 PascalCase，常量 UPPER_SNAKE_CASE
- **导入顺序**：外部库 → 内部包 → 相对路径
- **Git 提交**：`feat/fix/docs/refactor/test/chore: <描述>`
- **分支命名**：`feature/phase1-monorepo-setup`

---

## 当前学习重点

> 这里由 session-start hook 动态写入，反映最新学习状态

<!-- LEARNING_FOCUS_START -->
当前阶段：Phase 1 - 基础搭建
重点知识：Monorepo + pnpm workspace + TypeScript 严格模式配置
已完成：8 个知识点
本周目标：完成 packages/shared 的类型定义层 + 认证系统
上次学习：2026-06-04T07:04:13.632Z
<!-- LEARNING_FOCUS_END -->
