# ADR-0001：Monorepo 架构选型

- **状态**：已接受
- **日期**：2026-05-26
- **决策者**：项目组

---

## 背景

MedAI Learn 项目包含多个子系统（前端、后端、AI 引擎、共享包），需要选择合适的代码组织方式。

## 决策

采用 **Turborepo + pnpm workspace** 的 Monorepo 方案。

## 备选方案

| 方案 | 优点 | 缺点 |
|------|------|------|
| **A. Turborepo + pnpm** | 增量构建、缓存、任务编排、社区活跃 | 学习曲线 |
| B. Nx | 功能更全、插件生态 | 更重、学习成本更高 |
| C. Lerna（经典） | 简单 | 维护减少、缓存能力弱 |
| D. 多仓库 | 独立部署、隔离清晰 | 代码共享困难、版本管理复杂 |

## 理由

1. **学习价值高**：Turborepo 是当前主流 Monorepo 方案，掌握它对职业发展有直接帮助
2. **轻量够用**：项目规模不需要 Nx 那样的重量级工具
3. **pnpm 原生支持**：workspace 协议 + 严格的依赖隔离
4. **构建缓存**：Turborepo 的本地/远程缓存是核心学习点
5. **任务编排**：`dependsOn` / `outputs` 机制清晰

## 影响

- 需要学习 pnpm workspace 配置
- 需要理解 Turborepo 的缓存和任务图
- 包之间的依赖关系需要严格管理（禁止循环依赖）
- CI/CD 需要配置远程缓存

## 后续行动

- [ ] 创建根 `package.json` + `pnpm-workspace.yaml`
- [ ] 配置 `turbo.json` 任务编排
- [ ] 设置每个子包的 `package.json` + `tsconfig.json`
