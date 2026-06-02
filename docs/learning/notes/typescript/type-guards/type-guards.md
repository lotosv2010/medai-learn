# 类型守卫（Type Guards / Type Narrowing）

> 记录时间：2026-06-02
> 关联模块：API 响应处理、组件 props 校验、表单验证
> 重要程度：⭐⭐
> 前置知识：[[conditional-mapped-types]]（条件类型）、[[constraints]]（泛型约束）

## 一句话总结（面试 30 秒版）

类型守卫是 TypeScript 在**运行时**通过特定语法模式收窄**编译时**类型的机制——本质是「让编译器跟着你的 if/else 走，自动推断出更精确的类型」。

## 核心概念

TypeScript 的类型系统默认是**静态宽泛**的：一个变量声明为 `string | number` 后，你在整个函数体内都只能用它做 `string | number` 共有的操作。但现实代码中，你经常需要「先判断类型，再做特化处理」。

类型守卫就是让 TypeScript **理解你的判断逻辑**，自动在对应的代码分支里收窄类型。

### 8 种收窄方式

| 方式 | 语法 | 适用场景 | 面试频率 |
|------|------|---------|---------|
| **typeof** | `typeof x === 'string'` | 原始类型（string/number/boolean/symbol/bigint/undefined/function） | ⭐⭐⭐ |
| **instanceof** | `x instanceof Date` | class 实例 | ⭐⭐⭐ |
| **in** | `'name' in obj` | 对象属性存在性 | ⭐⭐ |
| **相等性** | `x === 'foo'` | 字面量类型收窄 | ⭐⭐ |
| **真值检查** | `if (x)` | 排除 null/undefined/0/''/NaN | ⭐⭐ |
| **赋值收窄** | `x = 'hello'` | 赋值后自动收窄 | ⭐ |
| **自定义类型守卫** | `fn(x) is Type` | 复杂判断逻辑封装 | ⭐⭐⭐ |
| **断言函数** | `asserts x is Type` | 抛错式校验 | ⭐⭐ |

### 控制流分析（Control Flow Analysis）

TypeScript 编译器会**跟踪每个变量在每个代码路径上的类型变化**。这是所有收窄的底层机制：

```ts
function example(x: string | number) {
  // x: string | number

  if (typeof x === 'string') {
    // x: string  ← 编译器在这里收窄了
    console.log(x.toUpperCase())
  } else {
    // x: number  ← else 分支自动排除了 string
    console.log(x.toFixed(2))
  }
  // x: string | number  ← 出了 if/else，恢复联合类型
}
```

**关键理解**：这不是运行时魔法，是**编译器的静态分析**。运行时的 typeof 检查照常执行，但编译器在编译阶段就帮你推断好了分支内的类型。

## 面试回答框架

### 标准回答（2 分钟版）

> TypeScript 的类型守卫是**在运行时判断类型后，让编译器自动收窄编译时类型**的机制。
>
> 常见的有 5 种内置守卫：`typeof` 用于原始类型判断、`instanceof` 用于类实例、`in` 检查属性存在、相等性判断可以收窄字面量类型、真值检查排除 falsy 值。
>
> 内置守卫解决不了的场景，可以用**自定义类型守卫**——写一个返回 `value is Type` 的函数，把复杂的校验逻辑封装起来。这在处理 API 响应、表单验证等场景非常实用。
>
> 底层机制是**控制流分析**：编译器会跟踪每个变量在每个代码路径上的类型变化，在 if/else、switch、early return 等分支处自动推断出更精确的类型。

### 常见追问链

1. **追问 1**：「`typeof` 能判断哪些类型？有什么限制？」
   - 回答要点：只能判断 `"string" | "number" | "boolean" | "symbol" | "bigint" | "undefined" | "object" | "function"` 这 8 种。`typeof null === 'object'` 是 JS 历史包袱。**无法区分数组、Date、RegExp 等 object 类型**，需要用 instanceof 或自定义守卫。

2. **追问 2**：「自定义类型守卫 `is` 和断言函数 `asserts` 有什么区别？」
   - 回答要点：`is` 返回 boolean，调用后在 if 分支内收窄；`asserts` 不返回值，如果条件不满足直接 throw，用于「不满足就崩」的场景。`is` 更通用，`asserts` 更适合防御性编程。

3. **追问 3**：「discriminated union（可辨识联合）和类型守卫的关系？」
   - 回答要点：可辨识联合是**最佳实践**——给联合类型的每个成员加一个共同的字面量属性（如 `kind: 'circle' | 'square'`），配合 switch 收窄，比 typeof/instanceof 更优雅、更安全。是 TS 面试的高频考点。

### 加分回答（如果你想让面试官眼前一亮）

> TypeScript 4.4 之后，控制流分析不仅能追踪 if/else，还能追踪**赋值**、**真值检查**、`in` 操作符，甚至能追踪**闭包中的类型守卫失效问题**——如果一个类型守卫的结果被闭包捕获，编译器会回退到原始类型，因为闭包执行时守卫可能已经失效了：
>
> ```ts
> function foo(x: string | number) {
>   if (typeof x === 'string') {
>     const fn = () => x.toUpperCase() // ✅ OK，同步闭包，守卫还有效
>     setTimeout(() => {
>       x.toUpperCase() // ❌ Error！异步回调执行时，x 可能已被重新赋值
>     }, 100)
>   }
> }
> ```
>
> 这就是为什么在回调中经常需要 `const narrowed = x as string` 或重新检查类型。

## 代码演示

### 1. typeof — 原始类型守卫

```ts
function format(value: string | number): string {
  if (typeof value === 'string') {
    return value.trim()
  }
  return value.toFixed(2)
}
```

### 2. instanceof — 类实例守卫

```ts
function logDate(value: Date | string): void {
  if (value instanceof Date) {
    console.log(value.getFullYear())
  } else {
    console.log(value)
  }
}
```

### 3. in — 属性存在性守卫

```ts
interface Circle { radius: number; kind: 'circle' }
interface Square { side: number; kind: 'square' }

function area(shape: Circle | Square): number {
  if ('radius' in shape) {
    return Math.PI * shape.radius ** 2
  }
  return shape.side ** 2
}
```

### 4. 自定义类型守卫（⭐⭐⭐ 最常考）

```ts
interface ApiResponse {
  data: unknown
  status: number
}

interface User {
  id: number
  name: string
  email: string
}

// 自定义类型守卫：返回值是类型谓词
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    'email' in data &&
    typeof (data as User).id === 'number' &&
    typeof (data as User).name === 'string' &&
    typeof (data as User).email === 'string'
  )
}

// 使用
function handleResponse(res: ApiResponse) {
  if (isUser(res.data)) {
    // res.data 被收窄为 User 类型
    console.log(res.data.name)
  }
}
```

### 5. 断言函数（Assertion Functions）

```ts
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`Expected string, got ${typeof value}`)
  }
}

function process(input: string | number) {
  assertIsString(input)
  // input: string — 断言成功后自动收窄
  console.log(input.toUpperCase())
}
```

### 6. 可辨识联合（Discriminated Unions）— 最佳实践

```ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number }

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2
    case 'rectangle':
      return shape.width * shape.height
    case 'triangle':
      return 0.5 * shape.base * shape.height
  }
}

// exhaustiveness check — 确保处理了所有分支
function assertNever(x: never): never {
  throw new Error(`Unexpected: ${x}`)
}

function areaExhaustive(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2
    case 'rectangle':
      return shape.width * shape.height
    case 'triangle':
      return 0.5 * shape.base * shape.height
    default:
      return assertNever(shape) // 新增类型时这里会报错
  }
}
```

## 在本项目中的应用

- **API 响应处理**：`apps/api` 返回的 tRPC 响应中，error 和 success 的类型守卫处理
- **组件 props 校验**：`packages/ui` 组件库中，对联合类型 props 的收窄处理
- **表单验证**：医疗表单中对不同类型输入（文本/数字/日期）的类型安全处理
- **AI 响应解析**：`packages/ai-sdk` 解析 LLM 返回的 JSON 时，用自定义类型守卫验证结构

## 易混淆点

| 概念 A | 概念 B | 关键区别 |
|--------|--------|---------|
| `typeof` 守卫 | `typeof` 类型查询 | 前者是运行时判断 + 编译时收窄（`if (typeof x === 'string')`），后者是编译时类型运算（`type T = typeof obj`） |
| `is` 类型守卫 | `as` 类型断言 | `is` 有运行时检查逻辑，安全；`as` 只是告诉编译器「相信我」，可能不安全 |
| `asserts x is T` | `x is T` | `is` 返回 boolean，调用方自己决定分支；`asserts` 不返回，直接抛错 |
| 控制流收窄 | 类型守卫 | 类型守卫是**触发收窄的手段**，控制流分析是**编译器实现收窄的机制** |
| 可辨识联合 | typeof/instanceof | 可辨识联合基于**数据自身的字面量属性**，不依赖 JS 运行时类型检查，更类型安全 |

## 扩展阅读

- [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) — 官方文档，覆盖所有收窄方式
- [TypeScript Deep Dive: Type Guards](https://basarat.gitbook.io/typescript/type-system/typeguard) — 社区经典

## 自测

<details>
<summary>题目：实现一个通用的 `isType<T>` 函数，接收 `schema` 描述对象结构，返回类型守卫函数。</summary>

**要求**：写一个 `createValidator<T>` 工厂函数，接收一个描述对象（key → 类型检查函数），返回一个 `(value: unknown) => value is T` 类型守卫。

```ts
// 实现
function createValidator<T extends Record<string, unknown>>(
  schema: { [K in keyof T]: (value: unknown) => value is T[K] }
): (value: unknown) => value is T {
  return (value: unknown): value is T => {
    if (typeof value !== 'object' || value === null) return false
    const obj = value as Record<string, unknown>
    for (const key of Object.keys(schema)) {
      if (!(key in obj) || !schema[key as keyof T](obj[key])) {
        return false
      }
    }
    return true
  }
}

// 使用
const isUser = createValidator<{ id: number; name: string }>({
  id: (v): v is number => typeof v === 'number',
  name: (v): v is string => typeof v === 'string',
})

const data: unknown = JSON.parse('{"id": 1, "name": "Alice"}')
if (isUser(data)) {
  console.log(data.name) // ✅ string
}
```

**关键点**：
1. `schema` 的每个 value 本身就是一个类型守卫函数 `(v) => v is T[K]`
2. 返回的闭包遍历 schema，逐个验证
3. 这就是 **zod** 等验证库的核心原理——用声明式 schema 生成类型守卫
</details>
