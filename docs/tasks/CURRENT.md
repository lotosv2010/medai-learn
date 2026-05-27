# CURRENT · 当前迭代任务

**迭代**：Phase 1 / Sprint 1 · **周期**：2025-01-01 ～ 2025-01-14（2 周）
**目标**：搭建可运行的 Monorepo 骨架 + 认证系统，验证技术栈选型可行

> 每日更新此文件，用 Claude Code 辅助开发时保持同步。
> 完成一个任务后运行 `/learn` 记录知识点，运行 `/quiz` 验证掌握情况。

---

## 迭代目标（Sprint Goal）

**业务价值**：用户可以注册、登录，并看到空白的对话界面（功能骨架）。

**学习价值**：
- 亲手配置 pnpm workspace + Turborepo，理解 Monorepo 的实际收益
- 实现 JWT 认证流程，掌握 Token 生命周期管理
- 建立 TypeScript 严格模式习惯，设计第一批核心类型

---

## 任务看板

### ✅ 已完成 Done

_（迭代开始时为空，随进度更新）_

---

### 🚧 进行中 In Progress

#### S-001：Monorepo 基础搭建
**估时**：2 天 · **负责**：你

**AC（验收标准）**：
- Given 任意 app，When 运行 `pnpm dev`，Then 三个服务同时启动，无报错
- Given 修改 `packages/shared` 的代码，When 保存，Then `apps/web` 和 `apps/api` 热更新生效
- Given 运行 `pnpm typecheck`，Then 全部通过，无 any 警告

**Tasks**：
- [x] T-001：初始化 pnpm-workspace.yaml + 根 package.json | 2h | 工程化
- [x] T-002：配置 turbo.json（dev/build/typecheck 任务管道）| 1h | 工程化
- [ ] T-003：初始化 packages/shared（Result 类型 + 基础工具函数）| 3h | TypeScript
- [ ] T-004：初始化 apps/web（Next.js 15 App Router）| 2h | React/Next.js
- [ ] T-005：初始化 apps/api（Hono + tRPC 基础路由）| 2h | Node.js
- [ ] T-006：初始化 apps/ai-engine（最小 HTTP 服务占位）| 1h | Node.js
- [ ] T-007：验证跨包类型引用（shared → web/api 无报错）| 1h | TypeScript

📚 **对应知识点**：pnpm workspace · Turborepo 任务管道 · TypeScript 项目引用（Project References）

---

#### S-002：数据库初始化
**估时**：1 天 · **负责**：你

**AC（验收标准）**：
- Given 运行 `docker-compose up -d`，Then PostgreSQL 和 Redis 正常启动
- Given 运行迁移命令，Then `users`、`conversations`、`messages` 表创建成功
- Given 运行 `pnpm db:seed`，Then 写入测试用户数据，可查询验证

**Tasks**：
- [ ] T-008：Docker Compose 配置（postgres + pgvector + redis）| 1h | DevOps
- [ ] T-009：Drizzle Schema 定义（users / conversations / messages）| 2h | TypeScript + SQL
- [ ] T-010：数据库迁移脚本（drizzle-kit generate + migrate）| 1h | Node.js
- [ ] T-011：种子数据脚本（测试用户 + 示例对话）| 1h | Node.js

📚 **对应知识点**：Drizzle ORM 类型推断 · PostgreSQL 数据类型 · 数据库迁移策略

---

### 📋 待开始 Todo

#### S-003：认证系统实现
**估时**：2 天 · depends_on：S-001、S-002

**AC（验收标准）**：
- Given 未注册用户，When 填写邮箱密码注册，Then 账号创建，自动登录
- Given 已登录用户，When 关闭页面重新打开，Then 7 天内无需重新登录
- Given 登录成功，When 访问 `/api/me`，Then 返回当前用户信息
- Given 错误密码，When 连续错误 5 次，Then 锁定提示

**Tasks**：
- [ ] T-012：auth.register tRPC mutation（注册逻辑 + bcrypt）| 3h | Node.js + 安全
- [ ] T-013：auth.login tRPC mutation（JWT 签发 + Redis 存 refresh）| 3h | Node.js
- [ ] T-014：JWT 验证中间件（api 层统一认证）| 2h | Node.js
- [ ] T-015：auth.refresh mutation（无感刷新 token）| 2h | Node.js
- [ ] T-016：NextAuth 配置（apps/web，对接 api JWT）| 2h | Next.js
- [ ] T-017：登录/注册页面 UI（apps/web）| 3h | React + TypeScript

📚 **对应知识点**：JWT 原理与安全 · bcrypt 工作因子 · HttpOnly Cookie · CSRF 防护

---

#### S-004：基础对话界面（空壳）
**估时**：1 天 · depends_on：S-001、S-003

**AC（验收标准）**：
- Given 已登录，When 访问 `/chat`，Then 显示空的对话界面，无报错
- Given 在输入框输入内容，When 按 Enter，Then 消息显示在界面上（无 AI 响应，仅 UI 演示）

**Tasks**：
- [ ] T-018：ChatLayout 组件（侧边栏 + 消息区 + 输入区布局）| 3h | React
- [ ] T-019：ChatInput 组件（自适应高度 textarea）| 2h | React + CSS
- [ ] T-020：MessageList 组件（消息渲染 + 用户/AI 区分）| 2h | React
- [ ] T-021：useChat hook（对话状态管理 useReducer）| 3h | React Hooks 深度

📚 **对应知识点**：useReducer vs useState 选型 · 受控组件 · CSS Grid 布局

---

### 🔮 下一迭代 Next Sprint（Phase 1 Sprint 2）

> Phase 1 完成后，进入 Phase 2 AI 核心开发

- S-005：第一个 AI 接口打通（硬编码 Prompt，无 RAG）
- S-006：SSE 流式输出实现（前端实时渲染）
- S-007：packages/ai-sdk 抽象层设计

---

## 学习进度追踪（本迭代）

| 知识点 | 关联 Task | 掌握状态 | 笔记 |
|--------|---------|---------|------|
| pnpm workspace | T-001 | 🟨 了解 | — |
| Turborepo 任务管道 | T-002 | ⬜ 未学 | — |
| TypeScript Project References | T-007 | ⬜ 未学 | — |
| Drizzle ORM | T-009 | ⬜ 未学 | — |
| JWT 完整流程 | T-013 | 🟨 了解 | — |
| useReducer 深度 | T-021 | 🟨 了解 | — |

> 完成任务后用 `/learn <知识点>` 更新状态，用 `/quiz ts` 自测。

---

## 本迭代风险

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|---------|
| Turborepo 配置复杂，耗时超估 | 中 | 低 | 跳过高级配置，先用最简配置跑通 |
| pgvector 本地安装问题 | 低 | 高 | 使用 Docker 镜像（已内置 pgvector） |
| NextAuth + 自定义 JWT 集成复杂 | 高 | 中 | 备选：Phase 1 先用简单 Cookie Session，Phase 2 升级 JWT |

---

## 今日焦点（Daily Focus）

> 每天早上更新这一行

**2025-01-01**：完成 T-001 ~ T-002，验证 Turborepo `pnpm dev` 可以并行启动三个服务。
