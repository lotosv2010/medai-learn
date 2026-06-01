# 类型体操：条件类型 & 映射类型

> 记录时间：2026-06-01
> 关联模块：packages/shared（工具类型设计）、packages/ai-sdk（泛型约束）、全项目类型定义
> 重要程度：⭐⭐⭐（字节/阿里二面三面高频考点，TypeScript 类型系统的核心能力，几乎每个 TS 相关追问都会涉及）
> 前置知识：[[generics-constraints]]、[[utility-types]]

---

## 一句话总结（面试 30 秒版）

条件类型是 TypeScript 类型系统的 **if-else**，让类型可以根据输入动态选择分支（`T extends U ? X : Y`）；映射类型是类型系统的 **for 循环**，遍历已有类型的键生成新类型（`{ [K in keyof T]: ... }`）；两者组合加上 `infer`，就构成了 TypeScript 类型体操的完整图灵完备能力。

---

## 核心概念

### 1. 条件类型（Conditional Types）

条件类型的语法：`T extends U ? X : Y`

- **本质**：类型层面的三元表达式
- **关键**：`extends` 在这里不是「继承」，而是「是否可以赋值给」（assignability check）
- **核心用途**：根据输入类型动态推导输出类型

```ts
// 最简条件类型
type IsString<T> = T extends string ? 'yes' : 'no';

type A = IsString<string>;  // 'yes'
type B = IsString<number>;  // 'no'
```

**分布式条件类型（Distributive Conditional Types）**

当 `T` 是裸类型参数（naked type parameter）且是联合类型时，条件类型会**自动分发**到每个成员：

```ts
type ToArray<T> = T extends any ? T[] : never;

// 分布式：联合类型的每个成员分别应用条件类型
type Result = ToArray<string | number>;
// = ToArray<string> | ToArray<number>
// = string[] | number[]
// 而不是 (string | number)[]

// 如果想禁止分发，用 [] 包裹裸类型参数
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type Result2 = ToArrayNonDist<string | number>;
// = (string | number)[]
```

**面试必问：为什么分布式条件类型是这个行为？**

因为联合类型在 TypeScript 中是「或」关系，分发到每个成员再联合，逻辑上等价于对每个成员单独判断再合并。这和集合论中的分配律一致：`f(A | B) = f(A) | f(B)`。

---

### 2. 映射类型（Mapped Types）

映射类型的语法：`{ [K in Keys]: ValueType }`

- **本质**：遍历一个键的联合类型，为每个键生成属性
- **核心能力**：基于已有类型创建新类型，可以修改修饰符（readonly、?）

```ts
// 最简映射类型：把所有属性变成可选
type MyPartial<T> = {
  [K in keyof T]?: T[K];
};

// 把所有属性变成只读
type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};

interface User {
  name: string;
  age: number;
}

type ReadonlyUser = MyReadonly<User>;
// { readonly name: string; readonly age: number; }
```

**键重映射（Key Remapping）— `as` 子句**

TypeScript 4.1+ 支持在映射类型中用 `as` 重新映射键名：

```ts
// 把所有键名加上前缀
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<User>;
// { getName: () => string; getAge: () => number; }

// 过滤键：返回 never 即排除
type RemoveAge<T> = {
  [K in keyof T as K extends 'age' ? never : K]: T[K];
};

type UserWithoutAge = RemoveAge<User>;
// { name: string; }
```

---

### 3. 条件类型 + 映射类型的组合

这是类型体操的核心模式：**用条件类型决定每个属性的类型，用映射类型遍历所有属性**。

```ts
// 深度 Readonly
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? T[K] extends Function
      ? T[K]
      : DeepReadonly<T[K]>
    : T[K];
};

// 深度 Partial
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? T[K] extends Function
      ? T[K]
      : DeepPartial<T[K]>
    : T[K];
};
```

---

### 4. infer 关键字 — 条件类型中的类型提取

`infer` 允许在条件类型的 `extends` 子句中**声明待推断的类型变量**：

```ts
// 提取函数返回值类型
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type R1 = ReturnType<() => string>;        // string
type R2 = ReturnType<(x: number) => void>; // void

// 提取函数参数类型
type Parameters<T> = T extends (...args: infer P) => any ? P : never;

type P1 = Parameters<(a: string, b: number) => void>; // [a: string, b: number]

// 提取 Promise 内部类型
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

type A1 = Awaited<Promise<string>>;                    // string
type A2 = Awaited<Promise<Promise<number>>>;           // number（递归解包）
```

**infer 的协变与逆变**

当同一个位置有多个 `infer` 时，推断结果取决于该位置是协变还是逆变：

```ts
// 协变位置（如返回值）→ 推断为联合类型
type CoVar<T> = T extends { a: infer U; b: infer U } ? U : never;
type CV = CoVar<{ a: string; b: number }>; // string | number

// 逆变位置（如参数）→ 推断为交叉类型
type ContraVar<T> = T extends {
  a: (x: infer U) => void;
  b: (x: infer U) => void;
} ? U : never;
type CC = ContraVar<{
  a: (x: string) => void;
  b: (x: number) => void;
}>; // string & number
```

---

## 面试回答框架

### 标准回答（2 分钟版）

> 面试官：「说说 TypeScript 的条件类型和映射类型？」

TypeScript 的类型系统是图灵完备的，条件类型和映射类型是其中两个核心能力。

**条件类型**是类型层面的 if-else，语法是 `T extends U ? X : Y`，核心价值是让类型可以根据输入动态推导输出。它还有一个重要特性叫「分布式条件类型」——当 T 是裸类型参数且是联合类型时，会自动分发到每个成员分别计算再联合。这在实现 `Exclude`、`Extract` 这些工具类型时非常关键。

**映射类型**是类型层面的 for 循环，遍历一个类型的键生成新类型。语法是 `{ [K in keyof T]: ... }`，可以配合 `+`/`-` 修饰符添加或移除 `readonly` 和 `?`。TypeScript 4.1 还引入了 `as` 子句支持键重映射，可以实现键名变换和键过滤。

两者组合使用时威力最大：用映射类型遍历所有属性，用条件类型决定每个属性的类型。再加上 `infer` 关键字可以在条件类型中提取待推断的类型，这就构成了类型体操的完整工具集。像 `Partial`、`Required`、`Pick`、`Omit`、`ReturnType` 这些内置工具类型都是基于这三个能力实现的。

### 常见追问链

1. **追问 1**：「分布式条件类型什么情况下会触发？怎么禁止？」
   - 回答要点：裸类型参数 + 联合类型才会分发；用 `[T] extends [U]` 包裹即可禁止。分布式行为的本质是集合论的分配律。

2. **追问 2**：「`infer` 是怎么工作的？和泛型约束有什么区别？」
   - 回答要点：`infer` 是在条件类型中声明一个「待推断」的类型变量，TypeScript 会从实际类型中推断出它的值；泛型约束是提前声明「T 必须满足 U」，侧重于约束而非推断。

3. **追问 3**：「手写一个 `DeepPartial`？」
   - 回答要点：映射类型遍历 + 条件类型判断是否是对象 + 递归处理嵌套对象 + 排除 Function 类型。见上方代码。

4. **追问 4**：「条件类型中的协变逆变是什么意思？」
   - 回答要点：同一个 infer 变量出现在多个位置时，协变位置（如返回值）推断为联合类型，逆变位置（如参数）推断为交叉类型。这和函数类型的兼容性规则一致。

### 加分回答（让面试官眼前一亮）

> TypeScript 的类型系统本质上是一个模式匹配引擎。条件类型是在类型结构上做模式匹配（`extends` 是结构性子类型检查），`infer` 是模式匹配中的变量绑定，映射类型是遍历器。三者组合就是类型层面的函数式编程——条件类型是分支，映射类型是 map，`infer` 是解构。

如果面试官追问到更深处，可以提到：TypeScript 的条件类型在处理联合类型时的分布式行为，本质上是条件类型对联合类型的「分配律」——`T extends U ? X : Y` 当 T 是 `A | B` 时，等价于 `(A extends U ? X : Y) | (B extends U ? X : Y)`。这和数学中的 `f(A ∪ B) = f(A) ∪ f(B)` 是同构的。

---

## 代码演示

### 手写内置工具类型

```ts
// 手写 Pick — 映射类型 + 键过滤
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// 手写 Omit — 映射类型 + 键重映射排除
type MyOmit<T, K extends keyof T> = {
  [P in keyof T as P extends K ? never : P]: T[P];
};

// 手写 Exclude — 分布式条件类型
type MyExclude<T, U> = T extends U ? never : T;

// 手写 Extract — 分布式条件类型
type MyExtract<T, U> = T extends U ? T : never;

// 手写 NonNullable — 分布式条件类型
type MyNonNullable<T> = T extends null | undefined ? never : T;

// 手写 ReturnType — 条件类型 + infer
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// 手写 Parameters — 条件类型 + infer
type MyParameters<T> = T extends (...args: infer P) => any ? P : never;
```

### 实用高级类型

```ts
// Promise 递归解包（Awaited）
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

// 获取对象中值为某种类型的所有键
type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

interface Config {
  host: string;
  port: number;
  debug: boolean;
  name: string;
}

type StringKeys = KeysOfType<Config, string>; // 'host' | 'name'

// 深度 Required（递归移除所有 ?）
type DeepRequired<T> = {
  [K in keyof T]-?: T[K] extends object
    ? T[K] extends Function
      ? T[K]
      : DeepRequired<T[K]>
    : T[K];
};
```

---

## 在本项目中的应用

### packages/shared 中的工具类型设计

```ts
// 假设 packages/shared/types/medical.ts 中定义药品数据结构
interface DrugInfo {
  id: string;
  name: string;
  description?: string;
  dosage?: string;
  warnings: string[];
  metadata?: {
    manufacturer?: string;
    expiryDate?: string;
  };
}

// 用映射类型创建 API 响应版本（只读 + 深度只读）
type DrugInfoResponse = DeepReadonly<DrugInfo>;

// 用映射类型创建表单编辑版本（全部可选）
type DrugInfoForm = DeepPartial<DrugInfo>;

// 用条件类型提取特定字段
type DrugStringFields = KeysOfType<DrugInfo, string>; // 'id' | 'name'
```

### packages/ai-sdk 中的泛型约束

```ts
// 根据模型名称推断返回类型
type ModelResponse<T extends string> =
  T extends 'gpt-4' ? GPT4Response :
  T extends 'claude' ? ClaudeResponse :
  T extends 'qwen' ? QwenResponse :
  never;
```

---

## 易混淆点

| 概念 A | 概念 B | 关键区别 |
|--------|--------|---------|
| `extends` 在泛型约束中 | `extends` 在条件类型中 | 前者是「约束 T 必须满足 U」，后者是「判断 T 是否可赋值给 U」并选择分支 |
| `keyof T` | `[K in keyof T]` | 前者得到键的联合类型，后者是遍历这些键生成新类型 |
| 映射类型 `{ [K in keyof T]: ... }` | 索引签名 `{ [key: string]: ... }` | 前者遍历已知键，后者描述任意字符串键；映射类型保留原始修饰符 |
| `T extends U ? X : Y`（裸类型参数） | `[T] extends [U] ? X : Y`（包裹后） | 前者是分布式条件类型，联合类型会分发；后者是非分布式，联合类型整体判断 |
| `infer R` 在协变位置 | `infer R` 在逆变位置 | 协变推断联合类型，逆变推断交叉类型 |

---

## 扩展阅读

- [TypeScript 官方文档 — Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [TypeScript 官方文档 — Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
- [type-challenges](https://github.com/type-challenges/type-challenges) — GitHub 上的类型体操练习题库，从 Easy 到 Extreme 共 100+ 题
- [TypeScript 类型体操通关秘籍](https://juejin.cn/column/7092480673843920900) — 掘金小册，系统性讲解类型体操

---

## 自测

**题目**：实现一个类型 `DeepPick<T, Paths>`，支持从嵌套对象中按路径选取属性：

```ts
interface Nested {
  a: {
    b: {
      c: string;
      d: number;
    };
    e: boolean;
  };
  f: string;
}

type Result = DeepPick<Nested, 'a.b.c' | 'f'>;
// 期望结果：{ a: { b: { c: string } }; f: string; }
```

提示：需要用到递归条件类型 + 映射类型 + 字符串模板字面量类型。

<details>
<summary><strong>参考答案（点击展开）</strong></summary>

```ts
// 核心思路：
// 1. 把路径 'a.b.c' 拆成首段 'a' 和剩余 'b.c'
// 2. 如果有剩余路径，递归处理子对象
// 3. 如果没有剩余路径，直接取值类型

// 辅助类型：拆分路径为首段 + 剩余
type SplitPath<S extends string> =
  S extends `${infer First}.${infer Rest}`
    ? [First, Rest]
    : [S, never];

// 主类型
type DeepPick<T, Paths extends string> =
  // 联合类型自动分发（分布式条件类型）
  Paths extends `${infer Key}.${infer Rest}`
    ? Key extends keyof T
      ? { [K in Key]: DeepPick<T[K], Rest> }  // 递归处理嵌套路径
      : never
    : Paths extends keyof T
      ? { [K in Paths]: T[K] }                // 叶子节点，直接取值
      : never;

// 但上面的结果是联合类型（{a:...} | {f:...}），需要合并为交叉类型
type UnionToIntersection<U> =
  (U extends any ? (x: U) => void : never) extends (x: infer I) => void
    ? I
    : never;

// 最终版本
type DeepPick<T, Paths extends string> = UnionToIntersection<
  Paths extends `${infer Key}.${infer Rest}`
    ? Key extends keyof T
      ? { [K in Key]: DeepPick<T[K], Rest> }
      : never
    : Paths extends keyof T
      ? { [K in Paths]: T[K] }
      : never
>;

// 测试
type Result = DeepPick<Nested, 'a.b.c' | 'f'>;
// { a: { b: { c: string } }; f: string; } ✅
```

**关键思路**：
1. **分布式条件类型**：`Paths extends ...` 当 Paths 是联合类型 `'a.b.c' | 'f'` 时，自动分发到每个成员分别处理
2. **模板字面量推断**：`` `${infer Key}.${infer Rest}` `` 用 `infer` 从字符串中提取首段和剩余路径
3. **递归**：有剩余路径时递归处理 `T[Key]`
4. **UnionToIntersection**：分布式条件类型产出联合类型，需要用 `UnionToIntersection` 辅助类型转为交叉类型，才能合并为一个完整对象

> 面试中写出前 3 步已经很好，第 4 步的 `UnionToIntersection` 是加分项，解释清楚「联合 → 交叉」的技巧即可。

</details>

---

> ⚠️ 本文是「类型体操」系列的第 1 篇，还有以下内容待学习：
> - [ ] infer 高级用法（元组操作、字符串解析）
> - [ ] 模板字面量类型（Template Literal Types）
> - [ ] 递归类型与类型计算
> - [ ] 类型体操实战：type-challenges 精选
