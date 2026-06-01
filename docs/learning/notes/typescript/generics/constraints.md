# 泛型约束（Generic Constraints）

> 记录时间：2026-06-01
> 关联模块：packages/shared（类型定义层）、packages/ai-sdk（API 泛型设计）、全项目工具类型
> 重要程度：⭐⭐⭐（阿里/字节二面高频，泛型是 TypeScript 类型系统的骨架，约束是泛型的灵魂）
> 前置知识：[[conditional-mapped-types]]（条件类型 + 映射类型）

---

## 一句话总结（面试 30 秒版）

泛型约束是用 `extends` 关键字给泛型参数划定**最小类型边界**，让泛型从「任意类型」收窄为「满足特定结构的类型」——它是泛型从「能用」到「好用」的关键一步，也是 TypeScript 类型安全的核心保障机制。

---

## 核心概念

### 1. 为什么需要泛型约束？

没有约束的泛型是「全黑」的——编译器对 `T` 一无所知，什么都不能做：

```ts
function getLength<T>(value: T): number {
  return value.length; // ❌ Error: 类型"T"上不存在属性"length"
}
```

泛型约束的本质：**用 `extends` 告诉编译器「T 至少长什么样」**。

```ts
interface HasLength {
  length: number;
}

function getLength<T extends HasLength>(value: T): number {
  return value.length; // ✅ 编译器知道 T 一定有 length
}

getLength('hello');      // ✅ string 有 length
getLength([1, 2, 3]);    // ✅ array 有 length
getLength({ length: 5 }); // ✅ 符合 HasLength 结构
getLength(123);           // ❌ number 没有 length
```

**类比**：泛型是「招聘 JD」，约束是「任职要求」。没有约束 = 招任何人；有约束 = 至少满足这些条件的人。

### 2. 约束的三种形态

#### 2.1 接口约束（最常用）

```ts
// 约束 T 必须包含 id 属性
function findById<T extends { id: string }>(list: T[], id: string): T | undefined {
  return list.find(item => item.id === id);
}

// 使用
const users = [{ id: '1', name: 'Alice', age: 30 }];
const user = findById(users, '1'); // 推导为 { id: string; name: string; age: number }
```

#### 2.2 keyof 约束（属性访问安全）

```ts
// 约束 K 必须是 T 的键之一
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const person = { name: 'Alice', age: 30 };
getProperty(person, 'name'); // ✅ 返回 string
getProperty(person, 'age');  // ✅ 返回 number
getProperty(person, 'email'); // ❌ Error: "email"不能赋值给"name" | "age"
```

这是 TypeScript **类型安全属性访问**的基石，也是映射类型能正确工作的前提。

#### 2.3 条件类型约束（高阶用法）

```ts
// 约束 + 条件推导组合
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

// 实际应用：提取函数返回类型（手写 ReturnType）
type MyReturnType<T extends (...args: any[]) => any> =
  T extends (...args: any[]) => infer R ? R : never;
```

### 3. 约束的本质：assignability check

`extends` 在泛型约束中的含义不是「继承」，而是 **「是否可以赋值给」**：

```ts
// A extends B ⟺ A 可以赋值给 B ⟺ A 是 B 的子类型
type Test1 = string extends { length: number } ? true : false;  // true
type Test2 = number extends { length: number } ? true : false;  // false
type Test3 = string[] extends { length: number } ? true : false; // true
```

这和 `instanceof` 不同——`extends` 是**结构化类型**检查（鸭子类型），不是名义类型检查。

### 4. 多重约束（交叉类型）

一个泛型参数可以同时满足多个约束，用交叉类型 `&` 组合：

```ts
function merge<T extends object, U extends object>(a: T, b: U): T & U {
  return { ...a, ...b };
}

// 更实用的例子：同时约束 key 和 value
function setNested<
  T extends Record<string, any>,
  K extends keyof T,
  V extends T[K]
>(obj: T, key: K, value: V): void {
  obj[key] = value;
}
```

### 5. 约束与默认值配合

泛型可以同时有约束和默认值，约束在前，默认值在后：

```ts
// T 必须满足 HasLength，默认值为 string
function process<T extends HasLength = string>(value: T): number {
  return value.length;
}

process('hello');  // T = string（使用默认值）
process([1, 2]);   // T = number[]（自动推导）
```

### 6. 递归约束（高阶模式）

泛型约束可以引用自身，实现递归类型检查：

```ts
// 深度只读（手写 DeepReadful 的前置）
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

// 递归约束：确保 JSON 可序列化类型
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

function toJSON<T extends JSONValue>(value: T): string {
  return JSON.stringify(value);
}
```

---

## 面试回答框架

### 标准回答（2 分钟版）

> **第一层：是什么**
> 泛型约束用 `extends` 关键字给泛型参数设置最小类型边界，让编译器知道「T 至少长什么样」，从而在泛型函数内部安全地访问属性和方法。

> **第二层：怎么工作**
> `T extends U` 的本质是 assignability check——检查 T 是否可以赋值给 U。这是结构化类型检查，不是名义继承。最典型的用法是 `K extends keyof T`，保证属性访问的类型安全。

> **第三层：为什么这样设计**
> 没有约束的泛型是完全不透明的，编译器无法做任何类型推导。约束让泛型从「黑盒」变成「有边界的白盒」，既保留了通用性，又获得了类型安全。这是 TypeScript 在灵活性和安全性之间的平衡点。

> **第四层：实际影响**
> 在实际项目中，泛型约束是设计高质量 API 的核心——比如 React 的 `useRef<T>`、tRPC 的路由类型推导、Zod 的 schema 类型推断，底层都大量依赖泛型约束。

### 常见追问链

1. **追问 1**：`T extends string` 和 `T extends string | number` 有什么区别？
   - 回答要点：`extends` 后面的类型是**约束上界**，T 可以是该类型的子类型。`T extends string` 只能传 string；`T extends string | number` 可以传 string 或 number。注意分布式条件类型的陷阱：联合类型会分发。

2. **追问 2**：泛型约束和类型守卫（Type Guard）有什么关系？
   - 回答要点：泛型约束是**编译时**的静态保证——约束满足了，编译器就信任你；类型守卫是**运行时**的动态检查——用 `is` 关键字在运行时缩小类型范围。两者互补：约束用于函数签名，守卫用于函数实现。

3. **追问 3**：为什么 `keyof T extends string` 不总是成立？
   - 回答要点：`keyof T` 的结果可能是 `string | number | symbol`。在 TypeScript 中，对象的键可以是这三种类型。`keyof T extends string` 只在 T 的所有键都是字符串时成立。如果你想约束「只处理字符串键的映射类型」，需要写 `K extends string & keyof T`。

### 加分回答（让面试官眼前一亮）

> TypeScript 的泛型约束系统本质上是一个**子类型推导引擎**。当你写 `T extends U ? X : Y` 时，编译器在做的是 structural subtyping check——它递归地比较 T 和 U 的结构，判断 T 是否是 U 的子类型。
>
> 这个机制和 Java 的泛型有本质区别：Java 用的是 type erasure（类型擦除），运行时不知道泛型信息；TypeScript 用的是 structural typing（结构化类型），编译时完全展开，运行时零开销。
>
> 另一个冷知识：`extends` 在条件类型中有一个特殊行为——当 T 是联合类型且是裸类型参数时，会触发**分布式条件类型**，联合类型的每个成员分别应用条件类型。这是设计有意为之，让 `Exclude<T, U>` 这样的工具类型能正确工作。

---

## 代码演示

### 核心：手写 Pick / Omit 依赖泛型约束

```ts
// Pick：从 T 中选取指定的键
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Omit：从 T 中排除指定的键（用 Pick + Exclude 组合）
type MyOmit<T, K extends keyof any> = MyPick<T, Exclude<keyof T, K>>;

// 使用
interface User {
  id: string;
  name: string;
  email: string;
  age: number;
}

type UserBasic = MyPick<User, 'id' | 'name'>;
// { id: string; name: string }

type UserWithoutAge = MyOmit<User, 'age'>;
// { id: string; name: string; email: string }
```

### 实际场景：类型安全的 API 请求函数

```ts
// 约束请求参数必须包含 method 和 url
interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
}

// 约束 T 至少满足 RequestConfig，且返回值类型由 T 动态决定
async function request<T extends RequestConfig>(
  config: T
): Promise<T extends { responseType: 'json' } ? unknown : string> {
  const response = await fetch(config.url, {
    method: config.method,
    headers: config.headers,
  });

  return (config as any).responseType === 'json'
    ? response.json()
    : response.text();
}
```

---

## 在本项目中的应用

| 文件/模块 | 用途 |
|-----------|------|
| `packages/shared/types/` | 工具类型定义依赖 `K extends keyof T` 约束 |
| `packages/ai-sdk/` | AI SDK 的泛型返回类型推导 |
| `apps/web/` | React 组件 Props 类型约束 |
| `apps/api/` | tRPC 路由输入/输出类型约束 |

---

## 易混淆点

| 概念 A | 概念 B | 关键区别 |
|--------|--------|---------|
| `T extends U`（约束） | `T extends U ? X : Y`（条件类型） | 约束 = 限制泛型参数范围；条件类型 = 根据类型关系选择结果 |
| `extends`（约束中） | `implements`（类中） | `extends` 是结构化类型检查（鸭子类型）；`implements` 是名义类型检查 |
| `keyof T` | `string` | `keyof T` 可能是 `string \| number \| symbol`，不只是 string |
| 泛型约束 | 类型守卫 | 约束 = 编译时静态保证；守卫 = 运行时动态缩小 |
| `T extends keyofof U` | `K in keyof T` | `extends keyof` = 约束 K 必须是 T 的键子集；`in keyof` = 遍历 T 的所有键 |

---

## 扩展阅读

- [TypeScript 官方文档 — Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) — 官方权威，必读
- [TypeScript 深入 — 泛型约束与条件类型](https://ts.chibicode.com/generics) — 交互式学习，适合动手练习

---

## 自测

**题目**：实现一个类型安全的 `groupBy` 函数，要求：

1. 第一个参数是数组 `T[]`
2. 第二个参数是 T 的某个属性名 `K extends keyof T`
3. 返回值类型是 `Record<T[K], T[]>`（按属性值分组）

写出函数签名和实现，并解释为什么需要泛型约束。

```ts
// 你的答案：
function groupBy<T, K extends keyof T>(list: T[], key: K): Record<T[K] & string, T[]> {
  return list.reduce((acc, item) => {
    const groupKey = String(item[key]);
    (acc[groupKey] ??= []).push(item);
    return acc;
  }, {} as Record<string, T[]>) as any;
}

// 为什么需要约束？
// K extends keyof T 保证了 key 一定是 T 的属性，
// 这样 item[key] 才能正确推导类型，而不是 any。
// 没有约束的话，K 可以是任意 string，item[key] 就是类型不安全的。
```

> ⚠️ 本文是「TypeScript 泛型体系」系列的第 1 篇，还有以下内容待学习：
> - [ ] 泛型推导与 infer
> - [ ] 条件类型中的分布式行为
> - [ ] 高阶泛型模式（Currying、Composition）
