# ADR-0001 · Monorepo 工具链选型

**状态**：已采纳（Accepted）
**日期**：2025-01-01
**决策人**：你自己

---

## 背景与问题

项目包含三个服务（web / api / ai-engine）和多个共享包（shared / ui / ai-sdk），需要选择代码组织方式。选项：
1. 多 Repo（每个服务独立仓库）
2. Monorepo（所有代码在一个仓库，多种工具可选）

---

## 决策

**采用 Monorepo，工具链选择 pnpm workspace + Turborepo。**

---

## 考量因素

### 为什么选 Monorepo 而不是多 Repo？

| 维度 | Monorepo | 多 Repo |
|------|---------|---------|
| 类型共享 | 直接引用，即时同步 | 发包后引用，有版本滞后 |
| 重构成本 | 一次改动跨包可见 | 需要多个 PR 联动 |
| 本地开发 | 一个 `pnpm dev` 启动全部 | 多个仓库分别启动 |
| 学习价值 | ✅ 覆盖工程化核心知识点 | —— |
| 复杂度 | 配置稍复杂（值得） | 初期简单，后期维护成本高 |

**结论**：Monorepo 对于强类型共享、全栈协作场景收益明显，且覆盖了工程化学习目标。

### 为什么选 pnpm 而不是 npm/yarn？

- **幽灵依赖防护**：pnpm 严格的 node_modules 结构，避免未声明的依赖被意外使用
- **磁盘效率**：硬链接复用相同版本包，三个 app 不重复下载 React
- **workspace 协议**：`workspace:*` 本地包引用比 `file:../` 更稳定
- **面试价值**：pnpm 现已是主流，能解释 幽灵依赖 和 hoist 机制是加分项

### 为什么选 Turborepo 而不是 Nx / Lerna？

| 工具 | 优势 | 劣势 | 选择原因 |
|------|------|------|---------|
| Turborepo | 配置简单、Vercel 亲和 | 功能相对少 | ✅ 学习成本低，快速上手 |
| Nx | 功能强大、插件生态 | 配置复杂，学习曲线陡 | 团队规模不匹配 |
| Lerna | 老牌方案 | 基本停止主动维护 | 不选 |

---

## 影响

### 正面
- 一个仓库管理所有代码，CI/CD 配置统一
- `packages/shared` 的类型改动立即在 web/api 中可见（无需发包）
- Turborepo 缓存构建产物，重复构建极快

### 负面与缓解
- **CI 时间**：Monorepo 在 CI 中需要构建所有包，比单包慢。缓解：Turborepo 远程缓存（Phase 4 接入）
- **配置复杂**：初次配置需要理解 workspace/task pipeline。缓解：本文档已记录配置思路

---

## 📚 对应学习内容

通过实践这个决策，你将深度理解：

- **pnpm workspace**：`workspace:*` 协议、hoist 机制、幽灵依赖是什么
- **Turborepo 任务管道**：`dependsOn: ["^build"]` 为什么 web 的 build 必须等 shared 的 build 先完成
- **TypeScript Project References**：为什么 apps/web 的 tsconfig 需要 `references` 到 packages/shared

**面试角度**：能清晰解释"为什么用 Monorepo"和"pnpm 和 npm 在 workspace 上的区别"，这是架构师面试的高频题。

---

## 相关资源

- [pnpm workspace 文档](https://pnpm.io/workspaces)
- [Turborepo 任务管道设计](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Monorepo vs Polyrepo：系统分析](https://monorepo.tools/)
