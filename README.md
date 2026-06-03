# MedAI Learn

> 一个「边做边学」的全栈 AI 应用项目——以医疗 AI 助手为载体，系统覆盖前端工程师晋升 AI 应用工程师的完整知识体系。

## 为什么是这个项目

- **有业务背景**：医疗电商 10 年经验 → 直接复用到医疗 AI 场景，不是从零开始
- **技术选型前沿**：Next.js 15 + React 19 + Hono + LangChain + pgvector，2025 年主流 AI 应用栈
- **有 Claude Code 助手**：完整的 Harness 架构，让 AI 辅助你学习而非替你完成

---

## 快速开始

```bash
# 1. 克隆项目
git clone <repo-url> medai-learn && cd medai-learn

# 2. 初始化环境（安装依赖、创建 .env.local、启动数据库配置）
bash scripts/setup.sh

# 3. 配置 API Keys（至少配一个 AI 模型）
vi .env.local

# 4. 启动数据库
docker-compose up -d

# 5. 启动开发服务
pnpm dev

# 6. 启动 Claude Code（学习伴侣）
claude
```

服务地址：前端 http://localhost:3000 · API http://localhost:3001 · AI 引擎 http://localhost:3002

---

## 项目结构

```
medai-learn/
├── .claude/                    # Claude Code Harness
│   ├── settings.json           # Hooks 生命周期配置
│   ├── hooks/                  # 自动化脚本（质检 / 日志 / 进度）
│   └── skills/                 # 学习命令（/learn /quiz /explain 等）
├── apps/
│   ├── web/                    # Next.js 15（React 深度 + 性能优化）
│   ├── api/                    # Hono + tRPC（Node.js 全栈）
│   ├── ai-engine/             # AI 核心（RAG / Agent / Streaming）
│   └── career-roadmap/        # 职业成长演示页（Vibing Code 分享）
├── packages/
│   ├── ui/                     # 基础组件库
│   ├── shared/                 # 共享类型（TypeScript 深度）
│   └── ai-sdk/                 # 多模型抽象层
├── docs/
│   ├── PRD.md                  # 产品需求文档
│   ├── SPEC.md                 # 技术规格说明
│   ├── ARCHITECTURE.md         # 架构设计文档
│   ├── DESIGN.md               # UI/UX 设计规范
│   ├── tasks/CURRENT.md        # 当前迭代任务
│   ├── decisions/              # 架构决策记录（ADR）
│   └── learning/               # 学习进度与笔记（自动维护）
├── CLAUDE.md                   # Claude Code 主上下文
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Claude Code 学习命令

| 命令 | 用途 | 示例 |
|------|------|------|
| `/learn [主题]` | 记录知识点到笔记 | `/learn React Fiber 双缓冲机制` |
| `/quiz [模块]` | 生成面试题自测 | `/quiz react` |
| `/explain [概念]` | 深挖原理 WHAT-WHY-HOW | `/explain Promise 微任务队列` |
| `/review [文件]` | 代码审查 + 学习标注 | `/review apps/web/hooks/useChat.ts` |
| `/refactor` | 重构并讲解设计原则 | `/refactor` |
| `/checklist [模块]` | 知识点掌握程度清单 | `/checklist typescript` |

---

## 学习路线（6 个月）

| 阶段 | 时间 | 重点 | 里程碑 |
|------|------|------|--------|
| Phase 1 | 第 1 月 | 工程化 + TS 类型系统 | Monorepo 运行 + 认证系统 |
| Phase 2 | 第 2-3 月 | React 深度 + AI 核心 | RAG 药品搜索 + 对话界面 |
| Phase 3 | 第 4 月 | Node.js 全栈 + 数据库 | 完整后端 + 性能优化 |
| Phase 4 | 第 5-6 月 | 项目打磨 + 面试冲刺 | 项目上线 + Offer |

详细任务 → [`docs/tasks/CURRENT.md`](docs/tasks/CURRENT.md)  
学习进度 → [`docs/learning/progress.json`](docs/learning/progress.json)

---

## 开发规范

- **分支命名**：`feature/phase1-auth-system`，`fix/rag-chunk-strategy`
- **Commit 格式**：`feat: 实现药品 RAG 检索`，`docs: 更新 ARCHITECTURE.md`
- **PR 要求**：TS 类型检查通过 + ESLint 无报错 + 相关测试通过
- **代码注释**：关键逻辑加 `// 📚 知识点：` 标记，方便后续复习

*架构决策 → [`docs/decisions/`](docs/decisions/) · 产品需求 → [`docs/PRD.md`](docs/PRD.md) · 技术规格 → [`docs/SPEC.md`](docs/SPEC.md)*
