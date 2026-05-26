# packages/shared — 共享类型与工具函数

## 学习重点：TypeScript 高级类型系统

这是整个项目 TypeScript 学习的核心区域，所有类型定义都在这里。

## 核心类型设计

```typescript
// Result 类型 - 函数式错误处理
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }

// 条件类型 + infer
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T

// 可辨别联合类型（AI 对话消息）
type Message = 
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; model: string }
  | { role: 'system'; content: string }
```

## 文件约定
- types/ → 业务类型定义
- utils/ → 纯函数工具（100% 测试覆盖）
- constants/ → 全局常量
