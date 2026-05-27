# 架构决策记录（Architecture Decision Records）

本目录记录项目中所有重大技术决策，格式遵循 [Lightweight ADR](https://github.com/joelparkerhenderson/architecture-decision-record)。

## 什么时候写 ADR？

当决策满足以下任一条件时，创建新的 ADR：

- 影响超过一个模块的技术选型
- 未来可能被质疑或需要回溯原因的设计
- 存在多个合理备选方案的取舍

## ADR 状态说明

| 状态 | 含义 |
|------|------|
| 草稿（Draft） | 尚在讨论，未最终确定 |
| 已采纳（Accepted） | 当前有效的决策 |
| 已废弃（Deprecated） | 曾经有效，已被新方案取代 |
| 已替代（Superseded by ADR-XXXX） | 被特定 ADR 替代 |

## 决策目录

| ADR | 标题 | 状态 | 日期 |
|-----|------|------|------|
| [0001](0001-monorepo-tooling.md) | Monorepo 工具链选型（pnpm + Turborepo） | 已采纳 | 2025-01-01 |
| [0002](0002-ai-model-strategy.md) | AI 模型选型与切换策略 | 已采纳 | 2025-01-01 |
| [0003](0003-database-choice.md) | 数据库选型（PostgreSQL + pgvector + Redis） | 已采纳 | 2025-01-01 |
| [0004](0004-nextjs-app-router.md) | Next.js App Router vs Pages Router | 已采纳 | 2025-01-01 |
| [0005](0005-state-management.md) | 前端状态管理选型（Zustand + React Query） | 已采纳 | 2025-01-01 |
| [0006](0006-trpc-vs-rest.md) | API 设计：tRPC vs REST vs GraphQL | 已采纳 | 2025-01-01 |
| [0007](0007-auth-strategy.md) | 认证方案：JWT + HttpOnly Cookie | 已采纳 | 2025-01-01 |

## 如何新增 ADR

1. 复制模板：`cp _template.md XXXX-decision-title.md`（序号递增）
2. 填写背景、候选方案、决策、影响
3. 在本 README 的目录表格中添加记录
4. 在 `docs/ARCHITECTURE.md` 的「架构演进记录」表格中引用

## 📚 学习价值

每个 ADR 都是一道「为什么」的答案。面试时能讲清楚技术选型背后的取舍，比背八股文更有说服力：

- ADR-0001 → 回答「你们为什么用 Monorepo？」
- ADR-0002 → 回答「为什么选 Claude 而不是 GPT？」
- ADR-0005 → 回答「为什么不用 Redux？」
- ADR-0007 → 回答「JWT 应该存哪里？」
