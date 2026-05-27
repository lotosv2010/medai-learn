# ADR-0004 · Next.js App Router vs Pages Router

**状态**：已采纳（Accepted）  
**日期**：2025-01-01  
**决策人**：你自己  
**相关 ADR**：[ADR-0001](0001-monorepo-tooling.md)

---

## 背景与问题

Next.js 13+ 引入了 App Router，与原有的 Pages Router 并存。本项目需要选择路由模式：

- **选项 A**：Pages Router（`pages/` 目录，传统模式）
- **选项 B**：App Router（`app/` 目录，React Server Components 架构）

---

## 决策

**采用 App Router（选项 B）**，不使用 Pages Router。

---

## 考量因素

### 核心差异对比

| 维度 | Pages Router | App Router |
|------|-------------|------------|
| 渲染单元 | 页面级（整页 CSR/SSR） | 组件级（RSC + Client 混合） |
| 数据获取 | `getServerSideProps` / `getStaticProps` | 直接 `async` 组件 + `fetch` |
| 布局嵌套 | `_app.tsx` 统一包裹 | `layout.tsx` 层级嵌套 |
| 流式渲染 | 不支持 | 原生支持（`<Suspense>`） |
| Server Actions | 不支持 | 支持（可替代 API 路由） |
| 学习曲线 | 平缓，文档成熟 | 陡，需理解 RSC 心智模型 |
| 生态成熟度 | 成熟，第三方库全兼容 | 部分库尚未适配 RSC |

### 选择 App Router 的核心理由

**1. 与本项目学习目标强绑定**

App Router 的核心是 React Server Components，而 RSC 是 React 19 最重要的范式转变。理解 RSC 对于：
- 掌握现代 React 心智模型不可或缺
- 面试中区分自己和「只会 hooks」的候选人
- 理解 Streaming SSR 的实现原理（AI 对话场景的关键）

**2. AI 对话场景天然需要 Streaming**

```
用户发送消息
  → Server 开始调用 Claude API（流式）
  → 边生成边把 token 推给浏览器
  → <Suspense> + ReadableStream 天然支持这种模式
```

Pages Router 需要额外的 workaround，App Router 开箱即用。

**3. 未来趋势**

Vercel 的投入和 Next.js 路线图明确 App Router 是未来。学习 Pages Router 是在学遗产技术。

### App Router 的已知挑战与缓解

| 挑战 | 缓解措施 |
|------|---------|
| RSC 学习曲线（分不清 Server/Client 边界） | 项目约定：优先 Server，需要交互时加 `"use client"`，CLAUDE.md 中明确规则 |
| 部分第三方库不支持 RSC（如某些动画库） | 在 Client Component 中使用，不强求 |
| 调试相对困难 | 使用 React DevTools + Next.js DevIndicator |
| `use server` / `use client` 心智模型负担 | 把它看作「进程边界」而非「技术细节」，用文件夹命名辅助区分 |

### 目录约定（基于 App Router）

```
app/
├── (auth)/               # Route Group，不影响 URL，共享 Auth 布局
│   ├── login/
│   └── register/
├── (dashboard)/          # 已登录区域，共享 Dashboard 布局
│   ├── chat/
│   │   └── [id]/         # 动态路由：单个对话
│   └── drugs/
├── api/                  # API Routes（Edge Runtime 友好）
│   └── ai/
│       └── chat/         # SSE 流式接口
│           └── route.ts
└── layout.tsx            # Root Layout（全局 Provider）
```

---

## 影响

### 正面
- 流式 AI 渲染实现更简洁（`ReadableStream` + `Suspense`）
- 数据获取代码大幅简化（async Server Component 直接 await）
- 为简历加分：「熟悉 Next.js 15 App Router + RSC」是当前高频招聘要求

### 负面与缓解
- **认知负担高**：需要时刻清楚组件是 Server 还是 Client。缓解：CLAUDE.md 中写明判断规则
- **生态兼容性**：某些库（如 Framer Motion v10 以下）不支持 RSC。缓解：使用 Client Component 包裹

---

## 📚 对应学习内容

实现 App Router 时你将深度理解：

- **React Server Components 原理**：为什么 RSC 不能有 state、不能用 hooks？（答：RSC 运行在 Node.js 进程，没有浏览器 runtime）
- **Streaming SSR**：`ReadableStream` + `TransformStream` 如何把 AI token 实时推给浏览器
- **React Suspense 工作原理**：`<Suspense fallback>` 背后的 Promise 抛出机制
- **数据获取范式变化**：从 `getServerSideProps` 到 async Server Component，本质是什么没变？（答：都是在服务端执行，但 RSC 粒度更细）

**面试角度**：「Next.js App Router 和 Pages Router 的本质区别是什么？」——这是 Next.js 岗位必考题，能讲清楚 RSC 概念的候选人是少数。

---

## 未来可能的修订

- 如果某个核心依赖长期不支持 RSC，且影响主要功能 → 考虑局部回退到 Client 组件模式（不影响整体 App Router 选型）
- 如果项目演化为需要 React Native 共享代码 → 重新评估 Expo Router
