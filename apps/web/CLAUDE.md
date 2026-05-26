# apps/web — 前端应用（Next.js 15 + React 19）

## 模块定位

这是 medai-learn 的前端核心，承载所有用户交互界面。
**学习重点：React 深度原理 + Next.js 全栈能力 + 性能优化**

## 技术栈

- **框架**：Next.js 15（App Router）
- **UI 库**：Shadcn UI + Tailwind CSS v4
- **状态管理**：Zustand（全局）+ React Query（服务端数据）
- **AI 交互**：Vercel AI SDK（流式对话组件）
- **测试**：Vitest + Testing Library + Playwright（E2E）

## 目录结构

```
apps/web/
├── app/                        # App Router 路由（学：文件系统路由、Layout、Loading）
│   ├── (auth)/                 # Route Group（不影响 URL）
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── chat/               # 📚 学：SSE / 流式渲染 / useOptimistic
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── drugs/              # 📚 学：RSC / Server Actions / 数据获取
│   │   └── layout.tsx
│   ├── api/                    # API Routes（BFF 层）
│   │   └── ai/
│   │       └── chat/route.ts   # 📚 学：Edge Runtime / ReadableStream
│   └── layout.tsx
├── components/
│   ├── ui/                     # 来自 packages/ui 的基础组件
│   ├── chat/                   # AI 对话组件（核心学习区域）
│   │   ├── ChatContainer.tsx   # 📚 学：useReducer 复杂状态管理
│   │   ├── MessageList.tsx     # 📚 学：虚拟列表 / memo 优化
│   │   ├── StreamingMessage.tsx # 📚 学：SSE 流式渲染、useEffect 清理
│   │   └── ChatInput.tsx
│   └── drugs/
│       └── DrugSearch.tsx      # 📚 学：useTransition / useDeferredValue
├── hooks/                      # 自定义 Hooks（重点学习区域）
│   ├── useChat.ts             # 📚 学：useReducer + useRef + useEffect 组合
│   ├── useStreamingText.ts    # 📚 学：ReadableStream + useState
│   ├── useDebounce.ts         # 📚 学：闭包 + setTimeout 清理
│   └── useVirtualList.ts      # 📚 学：性能优化 IntersectionObserver
├── lib/
│   ├── api-client.ts          # 📚 学：tRPC Client 配置
│   └── query-client.ts        # 📚 学：React Query 全局配置
└── public/
```

## 开发命令

```bash
pnpm dev          # 启动开发服务器（http://localhost:3000）
pnpm build        # 生产构建（注意 RSC bundle 分析）
pnpm typecheck    # TS 类型检查
pnpm test         # Vitest 单元测试
pnpm e2e          # Playwright E2E 测试
```

## 学习约定

### 在这个模块你会学到：

1. **React Fiber & Concurrent Mode**
   - 遇到性能问题时，先用 React DevTools Profiler 分析
   - 使用 `useTransition` 标记非紧急更新（DrugSearch 有示例）

2. **Next.js App Router 核心**
   - 每个 `page.tsx` 默认是 Server Component，能异步直接 fetch
   - `"use client"` 是退出 RSC 的边界，尽量推迟到叶节点使用

3. **流式 AI 渲染**
   - `api/ai/chat/route.ts` 是学习 Web Streams API 的最佳入口
   - `StreamingMessage.tsx` 展示了如何实时渲染 LLM 输出

### 关键文件阅读顺序（初次上手）
1. `app/layout.tsx` → 了解全局布局结构
2. `app/api/ai/chat/route.ts` → 理解 AI 流式输出
3. `components/chat/ChatContainer.tsx` → 理解状态管理
4. `hooks/useChat.ts` → 理解自定义 Hook 设计

## 性能基线目标

| 指标 | 目标值 |
|------|-------|
| LCP | < 2.5s |
| CLS | < 0.1 |
| INP | < 200ms |
| Bundle Size (首屏 JS) | < 150KB gzip |
