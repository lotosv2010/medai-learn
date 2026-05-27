# ADR-0006 · API 设计方案：tRPC vs REST vs GraphQL

**状态**：已采纳（Accepted）  
**日期**：2025-01-01  
**决策人**：你自己  
**相关 ADR**：[ADR-0001](0001-monorepo-tooling.md)

---

## 背景与问题

`apps/web`（前端）需要与 `apps/api`（后端）通信。需要决定接口层设计：

- **选项 A**：RESTful API（JSON + OpenAPI 文档）
- **选项 B**：tRPC（TypeScript-first RPC，端对端类型安全）
- **选项 C**：GraphQL（Apollo / Pothos）

---

## 决策

**前端 ↔ BFF 层（web ↔ api）：tRPC**  
**BFF ↔ AI Engine（api ↔ ai-engine）：内部 HTTP + 标准 JSON**  
**公开对外接口（如未来有 Open API）：REST**

---

## 考量因素

### 三方案对比

| 维度 | REST | tRPC | GraphQL |
|------|------|------|---------|
| 类型安全 | 手动维护类型（易漂移） | 编译期端对端保障 | 需要 codegen |
| 接口文档 | OpenAPI（需维护） | 类型即文档 | Schema 即文档 |
| 学习成本 | 低（行业通用） | 中（TypeScript 友好） | 高（QL 语言 + 生态） |
| 灵活性 | 高 | 中（Monorepo 内最优） | 高 |
| 调试工具 | curl / Postman | tRPC DevTools / Postman + shim | GraphiQL |
| 跨语言客户端 | ✅ 任意语言 | ❌ 仅 TypeScript | ✅ 多语言 |
| 适合场景 | 公开 API、微服务 | 全栈 TS Monorepo | 数据图复杂的产品 |

### 为什么选 tRPC（web ↔ api 层）

**核心价值**：在 TypeScript Monorepo 中，tRPC 把「类型安全」从编译时延伸到运行时，后端类型变更前端立刻报错。

```typescript
// apps/api 定义 router
const conversationRouter = router({
  list: protectedProcedure
    .input(z.object({ cursor: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      // 返回类型自动推断
      return db.query.conversations.findMany({ ... })
    }),
  create: protectedProcedure
    .input(z.object({ title: z.string().min(1).max(100) }))
    .mutation(async ({ input, ctx }) => { ... }),
})

// apps/web 使用（TypeScript 自动补全，无需手写类型）
const { data } = api.conversation.list.useQuery({ cursor: undefined })
//    ^─ 类型完全推断自 api，backend 改了 schema 这里编译报错
```

**对比 REST 的痛点（本项目中）**：
1. 后端改了 `Conversation` 类型（加了 `archived` 字段），前端不知道，运行时才报错
2. 每次新 API 都要手写 fetch 函数 + 类型定义，高度重复
3. OpenAPI codegen 虽然解决了这个问题，但引入了额外构建步骤

**为什么 BFF ↔ AI Engine 用普通 HTTP 而不用 tRPC？**

```
ai-engine 未来可能：
  1. 用 Python 重写（LangChain Python 生态更强）
  2. 独立部署，暴露为微服务
  3. 被第三方 AI 服务替换

用普通 HTTP + JSON 保持语言无关性，不锁定 TypeScript。
tRPC 的价值在 Monorepo 内的全栈 TS 链路，跨服务不适用。
```

### tRPC 的实际使用模式（本项目）

```typescript
// packages/shared/src/types/api.ts
// 共享输入输出类型（ai-engine 接口用 REST，类型在这里定义）
export type ChatRequest = {
  messages: Message[]
  conversationId: string
  userId: string
}
export type ChatStreamEvent =
  | { type: 'delta'; content: string }
  | { type: 'done'; usage: TokenUsage }
  | { type: 'error'; message: string }

// apps/api/src/router/index.ts
export const appRouter = router({
  auth:         authRouter,         // 注册 / 登录 / 刷新
  conversation: conversationRouter, // 对话 CRUD
  message:      messageRouter,      // 消息查询
  drug:         drugRouter,         // 药品搜索
  ai:           aiRouter,           // AI 接口（代理 ai-engine 的 SSE）
})

export type AppRouter = typeof appRouter   // 导出给前端使用

// apps/web/src/lib/api-client.ts
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@medai/api'  // 只导入类型！零运行时依赖

export const api = createTRPCReact<AppRouter>()
```

---

## 影响

### 正面
- 类型安全：后端改接口，前端编译报错，不会运行时炸
- DX 极佳：`api.` 之后 IDE 自动补全所有 procedure
- Zod 验证：输入自动校验，无需手写 validate 逻辑
- 面试亮点：「你们用什么保证前后端接口类型一致？」

### 负面与缓解
- **tRPC 不适合公开 API**：如果未来有第三方集成，需要额外暴露 REST 端点。缓解：tRPC 支持在 Hono 中同时暴露 REST，互不干扰
- **调试工具习惯**：curl 无法直接调 tRPC。缓解：使用 tRPC Panel（可视化调试工具）+ 统一错误格式

---

## 📚 对应学习内容

- **RPC vs REST 本质区别**：REST 是资源导向（名词），RPC 是操作导向（动词）——面试常混淆
- **Zod 运行时验证**：为什么 TypeScript 类型在运行时消失了？Zod 解决了什么问题？
- **TypeScript 类型推断深度**：tRPC 用 `ReturnType<>` + 泛型传递让类型「流动」全栈——这是高级 TS 的典型应用
- **HTTP vs RPC 协议**：tRPC 底层仍是 HTTP（GET 查询，POST 变更），理解这一点让你不神秘化 tRPC

**面试角度**：「如何在全栈项目中保证前后端接口类型一致？」——REST + codegen / tRPC / GraphQL + codegen 三种方案各有取舍，能对比讲清楚是高级工程师的标志。

---

## 未来可能的修订

- 需要对外提供 OpenAPI 文档 → 增加 `trpc-openapi` 插件，零修改即可暴露 REST 端点
- ai-engine 迁移 Python → api 与 ai-engine 的通信保持普通 HTTP，无需修改 tRPC 层
- 项目规模扩大，BFF 拆分为多个微服务 → tRPC 继续用于 web ↔ gateway，gateway 内部用 gRPC 或 REST
