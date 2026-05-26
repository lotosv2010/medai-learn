# apps/api — 后端服务（Hono + tRPC + Drizzle）

## 学习重点：Node.js 全栈 / API 设计 / 数据库

## 技术选型（面试要能解释为什么选这些）

- **Hono**：比 Express 轻量，原生支持 Edge Runtime，TypeScript 友好
- **tRPC**：端对端类型安全，前后端共享类型，告别 REST 文档维护  
- **Drizzle ORM**：类型安全的 SQL，SQL 思维，迁移可追踪

## 目录结构

```
apps/api/src/
├── router/               # tRPC Router（端到端类型推断）
│   ├── drug.ts           # 药品接口
│   ├── ai.ts             # AI 对话接口（代理 ai-engine）
│   └── index.ts
├── db/                   # 数据库层
│   ├── schema.ts         # Drizzle Schema（表结构即类型）
│   ├── migrations/       # 迁移文件
│   └── seed.ts           # 种子数据
├── middleware/            # 中间件
│   ├── auth.ts           # JWT 验证
│   ├── rate-limit.ts     # Redis 限流
│   └── logger.ts
└── index.ts
```
