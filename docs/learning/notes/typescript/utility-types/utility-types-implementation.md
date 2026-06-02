# 工具类型实现原理（Utility Types）

> 记录时间：2026-06-01
> 关联模块：`packages/shared/src/types/`
> 重要程度：⭐⭐⭐
> 前置知识：[[conditional-mapped-types]] | [[constraints]]

## 一句话总结（面试 30 秒版）

TypeScript 内置工具类型（Partial/Required/Pick/Omit/Record 等）本质上是**条件类型 + 映射类型 + infer 的组合应用**，理解它们的实现原理，就是理解 TypeScript 类型系统的核心机制。

## 核心概念

工具类型分三类，底层机制各不同：

| 分类 | 代表工具类型 | 底层机制 |
|------|------------|---------|
| 属性修饰变换 | `Partial` `Required` `Readonly` | 映射类型 + `?` / `-?` / `readonly` 修饰符 |
| 属性筛选 | `Pick` `Omit` `Record` | 映射类型 + `keyof` + `extends` 约束 |
| 类型提取 | `ReturnType` `Parameters` `InstanceType` | 条件类型 + `infer` |

**关键修饰符语法**（面试必考）：
- `?` — 添加可选
- `-?` — 移除可选（Required 的核心）
- `readonly` — 添加只读
- `-readonly` — 移除只读

## 面试回答框架

### 标准回答（2 分钟版）

**第一层（是什么）**：工具类型是 TypeScript 标准库预定义的泛型类型，用于对已有类型做变换，避免重复定义。

**第二层（怎么工作）**：以 `Partial<T>` 为例，它用映射类型遍历 T 的所有键，给每个属性加上 `?` 修饰符。`Required<T>` 则用 `-?` 移除可选标记，这个减号语法是映射类型独有的修饰符操作。

**第三层（为什么这样设计）**：TypeScript 把这些高频操作内置化，背后是「类型即值」的设计哲学——类型可以像函数一样接受参数、做变换、返回新类型。

**第四层（实际影响）**：在 medai-learn 的 `packages/shared` 中，API 响应类型可以用 `Partial` 处理可选字段，用 `Pick` 提取子集，避免大量重复类型定义。

### 常见追问链

1. **追问 1**：「`Omit<T, K>` 和 `Pick<T, K>` 的区别，能手写吗？」
   - 回答要点：Pick 是白名单（保留指定键），Omit 是黑名单（排除指定键）。Omit 内部用 `Exclude<keyof T, K>` 先算出剩余键，再传给 Pick。

2. **追问 2**：「`ReturnType` 是怎么实现的？」
   - 回答要点：用条件类型匹配函数签名，配合 `infer R` 捕获返回值类型：`T extends (...args: any[]) => infer R ? R : never`

3. **追问 3**：「`Required` 里的 `-?` 是什么语法？」
   - 回答要点：映射类型的修饰符操作，`-?` 移除可选，`-readonly` 移除只读，是 TypeScript 2.8 引入的特性。

4. **追问 4**：「`Exclude` 和 `Omit` 的区别？」
   - 回答要点：`Exclude` 操作的是**联合类型**（从联合中排除成员），`Omit` 操作的是**对象类型**（从对象中排除键）。

### 加分回答（让面试官眼前一亮）

`Omit` 的官方实现有一个微妙的类型安全问题：

```ts
// 官方实现
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>
// K 约束是 keyof any（string | number | symbol），不是 keyof T
// 这意味着 Omit<User, 'nonExistentKey'> 不会报错
```

更严格的实现应该是 `K extends keyof T`，但官方为了灵活性选择了宽松约束。这个设计取舍在 TypeScript issue #30825 中有讨论。

## 代码演示

```ts
// 手写核心工具类型（面试必备）

type MyPartial<T> = { [K in keyof T]?: T[K] }

type MyRequired<T> = { [K in keyof T]-?: T[K] }

type MyReadonly<T> = { readonly [K in keyof T]: T[K] }

type MyPick<T, K extends keyof T> = { [P in K]: T[P] }

type MyRecord<K extends keyof any, V> = { [P in K]: V }

type MyExclude<T, U> = T extends U ? never : T

type MyOmit<T, K extends keyof any> = MyPick<T, MyExclude<keyof T, K>>

type MyReturnType<T extends (...args: any[]) => any> =
  T extends (...args: any[]) => infer R ? R : never

type MyParameters<T extends (...args: any[]) => any> =
  T extends (...args: infer P) => any ? P : never
```

## 在本项目中的应用

`packages/shared/src/types/` 中的 API 类型定义场景：

```ts
// 药品信息完整类型
interface Medicine {
  id: string
  name: string
  dosage: string
  contraindications: string
}

// 创建时不需要 id（后端生成）
type CreateMedicineDTO = Omit<Medicine, 'id'>

// 更新时所有字段可选
type UpdateMedicineDTO = Partial<Omit<Medicine, 'id'>>

// 列表展示只需要部分字段
type MedicineListItem = Pick<Medicine, 'id' | 'name'>
```

## 易混淆点

| 概念 A | 概念 B | 关键区别 |
|--------|--------|---------|
| `Exclude<T, U>` | `Omit<T, K>` | Exclude 操作联合类型成员，Omit 操作对象类型的键 |
| `Partial<T>` | `DeepPartial<T>` | Partial 只处理第一层，DeepPartial 需要递归（非内置） |
| `Pick<T, K>` | `Extract<T, U>` | Pick 从对象提取键，Extract 从联合类型提取成员 |
| `ReturnType<T>` | `InstanceType<T>` | ReturnType 提取函数返回值，InstanceType 提取构造函数实例类型 |

## 扩展阅读

- [TypeScript 官方 Utility Types 文档](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [type-challenges](https://github.com/type-challenges/type-challenges) — 手写工具类型的最佳练习题库

## 自测

**题目 1**：手写 `DeepPartial<T>`，要求递归处理嵌套对象（非对象类型保持原样）。

<details>
<summary><strong>参考答案（点击展开）</strong></summary>

```ts
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T
```

**关键思路**：先用条件类型判断 T 是否为对象，是对象才递归映射，否则直接返回 T。`T extends object` 会排除 string/number/boolean 等原始类型。

</details>

---

**题目 2**：手写 `NonNullable<T>`，从类型中排除 `null` 和 `undefined`。

<details>
<summary><strong>参考答案（点击展开）</strong></summary>

```ts
type MyNonNullable<T> = T extends null | undefined ? never : T
```

**关键思路**：利用分布式条件类型，当 T 是联合类型时会逐个成员判断，命中 null/undefined 返回 never（never 在联合中自动消失）。

</details>

---

**题目 3**：手写 `Awaited<T>`，提取 Promise 的解包类型，支持嵌套 Promise（`Promise<Promise<string>>` → `string`）。

<details>
<summary><strong>参考答案（点击展开）</strong></summary>

```ts
type MyAwaited<T> = T extends Promise<infer R>
  ? MyAwaited<R>
  : T
```

**关键思路**：用 `infer R` 捕获 Promise 的泛型参数，然后递归调用自身处理嵌套情况，直到 T 不再是 Promise 为止。

</details>
