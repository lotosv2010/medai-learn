# 当前任务看板

> 最后更新：2026-05-26

---

## 进行中（In Progress）

### Phase 1：基础搭建

| ID | 任务 | 学习目标 | 状态 |
|----|------|---------|------|
| T-001 | Monorepo 初始化（根 package.json + tsconfig） | pnpm workspace + Turborepo | 进行中 |
| T-002 | TypeScript 严格模式配置 | tsconfig strict 选项 | 进行中 |
| T-003 | Turborepo 构建缓存原理 | 缓存策略 + 远程缓存 | 进行中 |

---

## 待开始（Backlog）

### Phase 1：基础搭建

| ID | 任务 | 学习目标 | 优先级 |
|----|------|---------|--------|
| T-004 | ESLint + Prettier 配置 | 代码规范自动化 | P0 |
| T-005 | Git 初始化 + hooks（husky + lint-staged） | Git 工作流 | P0 |
| T-006 | packages/shared 类型定义层 | TypeScript 泛型 + 工具类型 | P0 |
| T-007 | packages/ui 基础组件（Button/Input/Card） | React 组件设计 | P1 |
| T-008 | apps/web Next.js 15 脚手架 | App Router + RSC | P1 |
| T-009 | 认证系统（NextAuth.js） | OAuth + JWT + Session | P1 |

### Phase 2：AI 核心

| ID | 任务 | 学习目标 | 优先级 |
|----|------|---------|--------|
| T-010 | LLM API 接入层（Vercel AI SDK） | AI SDK + Streaming | P0 |
| T-011 | 药品数据爬取 + 清洗 | 数据处理流程 | P0 |
| T-012 | pgvector 向量检索 | Embedding + 向量搜索 | P0 |
| T-013 | RAG Pipeline | 文档分块 + 检索 + 生成 | P0 |
| T-014 | AI 对话界面（Streaming） | SSE + 流式渲染 | P0 |
| T-015 | 医疗 AI Agent（LangChain） | Tool Use + Agent 设计 | P1 |

### Phase 3：全栈完善

| ID | 任务 | 学习目标 | 优先级 |
|----|------|---------|--------|
| T-016 | 后端 API 完善（tRPC） | 端到端类型安全 | P1 |
| T-017 | 数据库优化 + 索引 | PostgreSQL 性能调优 | P1 |
| T-018 | Redis 缓存策略 | 缓存失效 + 语义缓存 | P1 |
| T-019 | 用药提醒系统 | 定时任务 + 通知 | P1 |
| T-020 | 健康档案管理 | 数据建模 + 隐私 | P1 |

### Phase 4：工程化提升

| ID | 任务 | 学习目标 | 优先级 |
|----|------|---------|--------|
| T-021 | CI/CD（GitHub Actions） | 自动化流水线 | P1 |
| T-022 | 性能优化（Lighthouse） | Core Web Vitals | P1 |
| T-023 | Docker 容器化 | 容器编排 | P2 |
| T-024 | 部署（Vercel + Neon） | Serverless 部署 | P2 |

---

## 已完成（Done）

| ID | 任务 | 完成日期 | 笔记 |
|----|------|---------|------|
| T-000 | 项目文档体系搭建 | 2026-05-26 | README + PRD + SPEC + ARCHITECTURE + DESIGN + ADR |

---

## 任务说明

- **ID 格式**：T-XXX（三位数递增）
- **优先级**：P0（必须）> P1（重要）> P2（可选）
- **学习目标**：每个任务对应一个或多个知识点
- **完成标准**：代码通过 typecheck + test + 实际运行 + 能讲清楚原理
