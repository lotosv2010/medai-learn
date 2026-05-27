# ADR-0005 · 前端状态管理选型

**状态**：已采纳（Accepted）  
**日期**：2025-01-01  
**决策人**：你自己  
**相关 ADR**：[ADR-0004](0004-nextjs-app-router.md)

---

## 背景与问题

前端状态管理是 React 面试的核心考点，也是项目架构的关键决策。需要在以下维度做选型：

1. **服务端状态**（Server State）：对话列表、消息记录、用户信息——来自服务器、需要缓存的数据
2. **客户端状态**（Client State）：UI 开关、当前对话 ID、流式缓冲区——纯本地状态
3. **表单状态**（Form State）：登录、注册、设置表单

候选方案：Redux Toolkit、Zustand、Jotai、React Query/SWR、Context API

---

## 决策

```
Server State  →  React Query（通过 tRPC 集成）
Client State  →  Zustand
Form State    →  React Hook Form + Zod
```

不使用 Redux。

---

## 考量因素

### 为什么不用 Redux（Toolkit）

Redux 曾经是 React 状态管理的事实标准，但在 2024-2025 年的技术栈下：

```
Redux 的问题：
  1. 把 Server State 和 Client State 混在一起管理（本质错误）
  2. 大量 boilerplate：action / reducer / selector / thunk
  3. React Query 出现后，Redux 处理 API 数据的价值大幅降低
  4. 学 Redux 在现代项目中 ROI 低（面试仍考，但实际使用少）
```

**面试补充**：仍需理解 Redux 原理（action → reducer → store → view），因为面试会考。但项目中不使用，通过 `/quiz redux` 单独学理论。

### Server State：为什么选 React Query（via tRPC）

```typescript
// 不用 React Query 的写法（手动管理）：
const [data, setData] = useState(null)
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)
useEffect(() => {
  setLoading(true)
  fetchConversations()
    .then(setData)
    .catch(setError)
    .finally(() => setLoading(false))
}, [userId])

// 用 React Query（via tRPC）的写法：
const { data, isLoading, error } = api.conversation.list.useQuery()
```

React Query 额外提供：
- **自动缓存**：同一数据不重复请求
- **后台刷新**：切回标签页自动更新
- **乐观更新**：发消息立刻显示，失败时回滚
- **无效化**：发完消息后自动刷新列表
- **Loading / Error 状态**：统一处理，不用每次手写

### Client State：为什么选 Zustand 而非 Context

```typescript
// Context 的问题：每次 value 变化，所有消费者重渲染
const AppContext = createContext({ sidebarOpen: false, currentChatId: '' })

// Zustand：精确订阅，只重渲染需要该数据的组件
const useStore = create((set) => ({
  sidebarOpen: false,
  currentChatId: null,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setCurrentChat: (id) => set({ currentChatId: id }),
}))

// 组件中：只订阅 sidebarOpen，currentChatId 变化时不重渲染
const sidebarOpen = useStore(s => s.sidebarOpen)
```

**Zustand vs Jotai**：两者都优秀。选 Zustand 原因：Store 概念更直觉（适合从 Redux 过渡），面试提及率更高，Bundle Size 相近（< 3KB）。

### 状态分类边界（重要）

```
判断规则：
  这个数据来自服务器吗？
    是 → Server State → React Query
    否 → Client State → Zustand（复杂） 或 useState（简单）

  数据在组件卸载后需要保留吗？
    是（全局）→ Zustand
    否（局部）→ useState / useReducer

  这是一个表单字段吗？
    是 → React Hook Form
    否 → 以上规则
```

### 具体状态分配

```typescript
// Server State（React Query via tRPC）
api.conversation.list.useQuery()       // 对话列表
api.message.list.useQuery({ chatId }) // 消息记录
api.user.me.useQuery()               // 当前用户信息
api.drug.search.useQuery({ q })      // 药品搜索结果

// Client State（Zustand）
{
  currentChatId: string | null,        // 当前对话
  sidebarOpen: boolean,                // 侧边栏状态
  streamingBuffer: string,             // 流式输出缓冲区
  accessToken: string | null,          // JWT（内存，不存 localStorage）
  theme: 'light' | 'dark',
}

// Form State（React Hook Form）
LoginFormValues, RegisterFormValues, SettingsFormValues

// Local State（useState / useReducer）
ChatInput 的输入内容、Modal 开关、Tooltip 显示状态
```

---

## 影响

### 正面
- 职责清晰：Server State 与 Client State 不混淆
- 缓存策略统一：React Query 的 staleTime / gcTime 统一配置
- 面试覆盖广：能讲清楚「为什么不用 Redux」比「会用 Redux」更有价值

### 负面与缓解
- **多套状态工具学习成本**：React Query + Zustand + RHF 三套。缓解：各自只管自己的领域，职责不重叠，实际上降低了整体复杂度
- **Zustand vs React Query 边界模糊（初期）**：用判断规则（上方 flowchart）消除歧义

---

## 📚 对应学习内容

- **React Query 核心原理**：`staleTime` / `gcTime` / `invalidateQueries` / 乐观更新 —— 面试常考
- **Zustand 实现原理**：Zustand 用 `useSyncExternalStore`（React 18 内置）实现精确订阅——理解这个，你就理解了 React 状态订阅的底层机制
- **React Hook Form 原理**：非受控组件 + `ref` 收集值，为什么比受控组件（`onChange` + `setState`）性能好？
- **状态管理选型论述**：「在一个中大型 React 应用中，你会如何设计状态管理架构？」——这是架构师级别面试题，有了这个 ADR 你可以讲出有深度的答案

---

## 未来可能的修订

- 如果 Zustand store 超过 10 个 slice → 考虑拆分为多个独立 store 或迁移 Jotai 原子化
- 如果 React Query 被 Remix / TanStack Router 的数据加载机制替代 → 顺势迁移
