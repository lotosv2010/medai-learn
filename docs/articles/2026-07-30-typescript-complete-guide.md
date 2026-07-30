# TypeScript 完整体系：从概述到类型体操（面试必备）

> 面试官微笑着问：「TypeScript 的类型系统和 Java 有什么本质区别？」  
> 沉默三秒后，你说出「**结构类型系统**」—— 他放下了笔。

---

## 🎯 这篇文章解决什么问题

TypeScript 知识点零散、层次深，很多人学了半年还停留在「给变量加个类型」的阶段，一遇到泛型约束、条件类型就懵。

这篇文章按**由浅入深**的顺序，把 23 个核心模块串成一张完整知识地图：基础类型 → 面向对象 → 高级类型 → 类型体操 → 工程化。每个模块既讲透原理，也直接告诉你**面试怎么答**。

---

## ⚡ 01 概述：TypeScript 是什么，凭什么用它

TypeScript 是 JavaScript 的**超集**，最终编译成 JS 运行。它的核心价值不是「更严格」，而是**在编译期发现运行时才会报的错**。

TypeScript 使用**结构类型系统（Structural Typing）**：只要两个类型的结构兼容，就可以互相赋值，而不是看「名字」。

```typescript
type Point2D = { x: number; y: number }
type Point3D = { x: number; y: number; z: number }

const p3: Point3D = { x: 1, y: 2, z: 3 }
const p2: Point2D = p3  // ✅ 结构兼容，Point3D 多出的字段不影响
```

> 💬 **面试官**：TypeScript 和 Java 的类型系统有什么区别？
>
> ✅ 标准答案：Java 是标称类型系统（Nominal Typing），类型必须显式声明继承关系；TypeScript 是结构类型系统，只要形状兼容就能赋值。
> 🎁 加分答案：结构类型系统更契合 JavaScript 的「鸭子类型」生态——JS 里大量的第三方库、回调函数，从来不要求名义上的「是什么类型」，只要结构符合就能用。

---

## 📦 02 基础类型：类型系统的地基

TypeScript 原始类型：`string`、`number`、`boolean`、`null`、`undefined`、`symbol`、`bigint`，以及容器类型 `Array`、`Tuple`、`Object`。

重点记住两个特殊类型：

**`any`**：关闭类型检查的万能通行证，也是 TypeScript 最大的「毒药」。滥用 `any` 等于放弃了所有编译保护。

**`never`**：不可能存在的类型，是所有类型的子类型。常见于：函数永远不返回（抛出异常）、穷尽联合类型的 `default` 分支。

```typescript
// never 实战：穷尽性检查，未来新增类型时编译立刻报错
type Shape = 'circle' | 'square' | 'triangle'

function area(shape: Shape): number {
  switch (shape) {
    case 'circle':   return Math.PI
    case 'square':   return 1
    case 'triangle': return 0.5
    default:
      const exhausted: never = shape  // 👈 若漏处理，这里报错
      return exhausted
  }
}
```

> 💬 **面试官**：`any`、`unknown`、`never` 的区别？
>
> ✅ 标准答案：`any` 逃脱所有检查；`unknown` 需要先做类型缩窄才能使用，是「安全版 any」；`never` 表示不可能的类型，是底部类型，常用于穷尽检查和类型过滤。

---

## 🔍 03 类型推导：少写注解，多靠推断

TypeScript 能自动推导大多数类型，不需要到处手写注解：

```typescript
const name = 'Robin'        // 推导为 "Robin"（字面量类型）
let age = 30                // 推导为 number
const arr = [1, 'a', true]  // 推导为 (number | string | boolean)[]
```

**`const` vs `let` 的推导差异**是高频考点：

```typescript
const x = 'hello'  // 类型："hello"（字面量类型，const 不可变）
let y = 'hello'    // 类型：string（拓宽推导，let 可能被重新赋值）
```

用 `as const` 可以锁定对象/数组的字面量类型：

```typescript
const config = { env: 'prod', port: 3000 } as const
// config.env 类型：'prod'（而不是 string）
// config.port 类型：3000（而不是 number）
```

> 💬 **面试官**：什么是类型拓宽（Type Widening）？如何阻止它？
>
> ✅ 标准答案：`let` 声明时，TypeScript 把字面量类型拓宽为基础类型（`"prod"` → `string`），因为 `let` 可以重新赋值。用 `as const` 或显式类型注解可以阻止拓宽。
> 🎁 加分答案：`as const` 不只锁定顶层，而是**递归深度锁定**整个对象树，所有属性都变 `readonly` 且推导为字面量类型。这是代替枚举的现代做法。

---

## 🔧 04 函数类型：参数、重载、this

函数类型描述参数和返回值。TypeScript 能推导返回类型，但**公共 API 建议显式标注**：

```typescript
// 函数类型别名
type Formatter = (value: string, maxLen?: number) => string

// 函数重载：多个签名 + 一个实现
function format(x: number): string
function format(x: string): number
function format(x: number | string): string | number {
  return typeof x === 'number' ? x.toString() : x.length  // 👈 实现覆盖所有签名
}
```

> 💬 **面试官**：TypeScript 函数重载和 Java 的重载本质区别？
>
> ✅ 标准答案：Java 重载在运行时真正分派不同实现；TypeScript 重载只存在于**类型层面**，编译后只剩一个实现函数，靠运行时 `typeof` 等判断区分逻辑。

---

## 🏗️ 05 类：访问控制 + 抽象

TypeScript 在 ES6 类的基础上增加了访问修饰符：

```typescript
class Patient {
  readonly id: string           // 只读
  private _name: string         // 类内部私有
  protected age: number         // 子类可访问

  constructor(id: string, name: string, age: number) {
    this.id = id
    this._name = name
    this.age = age
  }

  get name(): string { return this._name }
}
```

**抽象类**定义必须被子类实现的方法，自身不能实例化：

```typescript
abstract class AIModel {
  abstract generate(prompt: string): Promise<string>  // 子类必须实现

  async chat(messages: string[]): Promise<string> {   // 公共逻辑复用
    return this.generate(messages.join('\n'))
  }
}
```

> 💬 **面试官**：抽象类和接口什么时候选哪个？
>
> ✅ 标准答案：接口只描述结构（无实现），类可以实现多个；抽象类可以有默认实现，但只能单继承。接口用于定义契约，抽象类用于复用公共逻辑 + 强制子类实现特定方法。

---

## 📐 06 接口：对象形状的契约

接口描述对象的「形状」，支持可选、只读、索引签名：

```typescript
interface Drug {
  id: string
  name: string
  dosage?: number           // 可选
  readonly sku: string      // 只读
  [key: string]: unknown    // 索引签名：允许任意额外属性
}

interface PrescriptionDrug extends Drug {  // 接口继承
  doctorApproved: boolean
}
```

**接口 vs 类型别名（type）** 必考对比：

| 特性 | interface | type |
|------|-----------|------|
| 声明合并 | ✅ 支持 | ❌ 不支持 |
| 扩展语法 | `extends` | `&` 交叉类型 |
| 联合类型 | ❌ | ✅ `type A = B \| C` |
| 原始类型别名 | ❌ | ✅ `type ID = string` |
| 元组类型 | ❌ | ✅ |

> 💬 **面试官**：项目中用 `interface` 还是 `type`？
>
> ✅ 标准答案：描述对象形状优先 `interface`（可扩展、可合并）；联合类型、原始类型别名、元组用 `type`；两者都能做的情况保持团队一致更重要。
> 🎁 加分答案：扩展第三方库类型时必须用 `interface` 的声明合并（Declaration Merging），这是 `type` 做不到的。

---

## 🔮 07 泛型：类型的参数化

泛型让你写出「形状相同、类型不同」的复用代码：

```typescript
function first<T>(arr: T[]): T | undefined {
  return arr[0]
}

const n = first([1, 2, 3])    // 自动推导 number | undefined
const s = first(['a', 'b'])   // 自动推导 string | undefined
```

**泛型约束**用 `extends` 限制范围：

```typescript
// 只接受有 .length 属性的类型
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b
}

longest('abc', 'de')   // ✅ string 有 length
longest([1, 2], [3])   // ✅ array 有 length
longest(10, 20)        // ❌ number 没有 length
```

> 💬 **面试官**：泛型约束 `T extends U` 和类继承 `extends` 有什么区别？
>
> ✅ 标准答案：类继承是运行时的原型链关系，泛型约束只在**类型层面**起作用（编译后消失），表示「T 必须具备 U 的结构」，与运行时无关。

---

## 🔄 08 兼容性：结构类型的赋值规则

TypeScript 兼容性的两个核心场景：

**对象类型**：目标类型的属性必须都能在源类型中找到，源类型可以有额外属性（鸭子类型）。

**函数类型**：参数是**逆变**的（目标参数类型 ≥ 源参数的宽泛程度），返回值是**协变**的：

```typescript
type SpecificFn = (e: MouseEvent) => void
type GeneralFn  = (e: Event) => void

let specific: SpecificFn = (e) => console.log(e.clientX)
let general: GeneralFn   = specific  // ❌ 逆变不允许：具体 → 宽泛
let another: SpecificFn  = general   // ✅ 宽泛 → 具体是安全的
```

> 💬 **面试官**：什么是协变和逆变？
>
> ✅ 标准答案：协变保持继承方向（子类可赋值给父类位置）；逆变反转方向（函数参数位置，接受父类参数的函数可赋值给接受子类参数的变量）。`strictFunctionTypes` 开启后 TypeScript 严格执行函数参数逆变。

---

## 🛡️ 09 类型保护：缩窄类型的武器库

类型保护让 TypeScript 在分支内**自动缩窄**联合类型：

```typescript
// 内置：typeof / instanceof / in
function process(val: string | number) {
  if (typeof val === 'string') return val.toUpperCase()  // val: string
  return val.toFixed(2)                                  // val: number
}
```

自定义**类型守卫**（`is` 关键字）：

```typescript
interface Drug   { type: 'drug';   name: string }
interface Device { type: 'device'; model: string }

function isDrug(item: Drug | Device): item is Drug {
  return item.type === 'drug'  // 返回 true 时，TypeScript 确认是 Drug
}

function handle(item: Drug | Device) {
  if (isDrug(item)) console.log(item.name)   // item: Drug
  else              console.log(item.model)  // item: Device
}
```

> 💬 **面试官**：类型保护有哪几种方式？
>
> ✅ 标准答案：`typeof`（原始类型）、`instanceof`（类实例）、`in`（属性存在性）、字面量判断（`===`）、自定义 `is` 守卫（最灵活）。

---

## 🔬 10 类型推断：infer 捕获类型

`infer` 是条件类型中的**类型变量捕获**关键字，运行时不存在，只活在类型推导过程中：

```typescript
// 提取函数返回值类型（ReturnType 的实现原理）
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never

type R1 = MyReturnType<() => string>          // string
type R2 = MyReturnType<(x: number) => boolean> // boolean
```

```typescript
// 递归解包 Promise 嵌套
type Unwrap<T> = T extends Promise<infer U> ? Unwrap<U> : T

type R3 = Unwrap<Promise<Promise<number>>>  // number
```

> 💬 **面试官**：infer 能在哪里出现？
>
> ✅ 标准答案：`infer` 只能出现在条件类型的 `extends` 子句的「待检测类型」部分。它相当于一个临时变量，只在条件类型推导时存在，在 `:` 后的「真分支」中可以使用捕获到的类型。

---

## 🔀 11 类型变换：映射类型

映射类型可以批量**转换**一个类型的所有属性：

```typescript
// 将所有属性变为可选（Partial 的实现原理）
type MyPartial<T> = { [K in keyof T]?: T[K] }

// 将所有属性变为只读
type MyReadonly<T> = { readonly [K in keyof T]: T[K] }

// -? 移除可选修饰符（Required 的原理）
type MyRequired<T> = { [K in keyof T]-?: T[K] }
```

**`as` 重映射**（TypeScript 4.1+）可以在映射时重命名键：

```typescript
// 为每个属性生成对应的 getter 名称
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
}
type PatientGetters = Getters<{ name: string; age: number }>
// { getName: () => string; getAge: () => number }
```

> 💬 **面试官**：`keyof` 是什么，和 `in` 怎么配合？
>
> ✅ 标准答案：`keyof T` 获取类型 T 所有属性名的联合类型；`[K in keyof T]` 是映射类型语法，遍历每个属性名并变换，相当于类型层面的 `for...in`。

---

## ➕ 12 交叉类型：合并多个类型

`&` 把多个类型合并为**同时满足所有约束**的类型：

```typescript
type WithId        = { id: string }
type WithTimestamp = { createdAt: Date; updatedAt: Date }

type Entity = WithId & WithTimestamp  // 同时具有三个属性
```

🔧 **实战场景**：Mixin 模式和 HOC 增强类型：

```typescript
type WithLoading<T> = T & { loading: boolean; error?: string }
type PatientCardProps = WithLoading<{ patient: Patient; onSave: () => void }>
```

注意：相同属性类型不兼容时，交叉结果为 `never`：

```typescript
type Conflict = { x: string } & { x: number }
// Conflict.x 类型是 string & number = never  ⚠️
```

---

## 🌿 13 条件类型：类型的 if-else

条件类型让类型具备**分支判断**能力：

```typescript
type IsString<T> = T extends string ? 'yes' : 'no'
type R1 = IsString<'hello'>  // 'yes'
type R2 = IsString<number>   // 'no'
```

**分布式条件类型**：T 是裸类型参数且传入联合类型时，条件类型对每个成员**分别计算**：

```typescript
type ToArray<T> = T extends any ? T[] : never
type R3 = ToArray<string | number>  // string[] | number[]（不是 (string|number)[]）
```

用 `[]` 包裹可关闭分布式行为：

```typescript
type ToArrayFixed<T> = [T] extends [any] ? T[] : never
type R4 = ToArrayFixed<string | number>  // (string | number)[]
```

> 💬 **面试官**：`Exclude<T, U>` 是怎么实现的？
>
> ✅ 标准答案：`type Exclude<T, U> = T extends U ? never : T`。利用分布式条件类型，对 T 中每个成员检查是否 `extends U`，是则返回 `never`（被过滤掉），否则保留。
> 🎁 加分答案：`Extract<T, U>` 反过来：`T extends U ? T : never`。这两个内置工具类型是分布式条件类型最经典的应用。

---

## 🛠️ 14 内置类型工具：面试必背

TypeScript 内置工具类型及其实现原理：

| 工具类型 | 作用 | 实现关键点 |
|---------|------|-----------|
| `Partial<T>` | 所有属性变可选 | 映射 + `?` |
| `Required<T>` | 所有属性变必填 | 映射 + `-?` |
| `Readonly<T>` | 所有属性只读 | 映射 + `readonly` |
| `Pick<T, K>` | 挑选属性子集 | 映射 + `K extends keyof T` |
| `Omit<T, K>` | 排除属性 | `Pick<T, Exclude<keyof T, K>>` |
| `Record<K, V>` | 构造字典类型 | `{ [P in K]: V }` |
| `Exclude<T, U>` | 从 T 排除 U | 分布式条件类型 |
| `Extract<T, U>` | 从 T 提取 U | 分布式条件类型 |
| `NonNullable<T>` | 排除 null/undefined | `Exclude<T, null \| undefined>` |
| `ReturnType<T>` | 函数返回值类型 | `infer R` |
| `Parameters<T>` | 函数参数类型元组 | `infer P` |

---

## 🎨 15 自定义工具类型：组合出更强的武器

在内置工具基础上，可以组合出项目专用的工具类型：

```typescript
// 深度只读（递归）
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K]
}
```

```typescript
// 按值类型筛选属性（as 重映射 + 条件类型）
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K]
}

type StringOnlyFields = PickByValue<Drug, string>  // 只含字符串字段
```

> 💬 **面试官**：手写 `DeepPartial<T>`（递归可选）？
>
> ✅ 标准答案：
> ```typescript
> type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }
> ```
> 🎁 加分答案：需要处理数组、`Map`、`Date` 等特殊对象，否则它们内部也会被递归处理出错。

---

## ❓ 16 unknown：安全版 any

`unknown` 是「**类型安全的 any**」，接收任何值，但使用前必须先做类型缩窄：

```typescript
let val: unknown = fetchExternalData()

// ❌ 直接访问属性 —— 编译报错
console.log(val.name)

// ✅ 先缩窄，再使用
if (typeof val === 'object' && val !== null && 'name' in val) {
  console.log((val as { name: string }).name)
}
```

🔧 **在医疗项目中的应用**：后端返回的动态数据、`try/catch` 捕获的 `error`（TypeScript 4.0+ 默认 `unknown`），都应用 `unknown` 而非 `any`，强制调用方做类型校验，避免运行时崩溃。

---

## ✏️ 17 模板字符串类型：类型层面的字符串操作

TypeScript 4.1 引入，在类型层面做字符串拼接和变换：

```typescript
type EventName = 'click' | 'focus' | 'blur'

// 批量生成事件处理器名称
type HandlerName = `on${Capitalize<EventName>}`
// 'onClick' | 'onFocus' | 'onBlur'
```

内置字符串工具类型：

```typescript
type T1 = Uppercase<'hello'>    // 'HELLO'
type T2 = Lowercase<'WORLD'>    // 'world'
type T3 = Capitalize<'foo'>     // 'Foo'
type T4 = Uncapitalize<'Bar'>   // 'bar'
```

🔧 **实战用法**：描述 CSS 属性名、API 路径参数、事件名约定，都可以用模板字符串类型做**编译期枚举生成**，避免手动维护大量字符串字面量联合类型。

---

## 📦 18 装包与拆包：容器类型的进出

**装包（Wrapping）**：给类型套上容器（`Promise<T>`、`Array<T>`）：

```typescript
// 把所有方法的返回值异步化
type Promisify<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : T[K]
}
```

**拆包（Unwrapping）**：用 `infer` 把容器里的类型取出来：

```typescript
// 递归解包嵌套 Promise
type Unwrap<T> = T extends Promise<infer U> ? Unwrap<U> : T

type Result = Unwrap<Promise<Promise<string>>>  // string
```

> 💬 **面试官**：内置的 `Awaited<T>` 是怎么实现的？
>
> ✅ 标准答案：本质就是递归拆包，`T extends PromiseLike<infer U> ? Awaited<U> : T`，用 `PromiseLike` 而非 `Promise` 是为了兼容 thenable 对象。

---

## 📁 19 模块与命名空间：代码组织

现代项目用 **ES Module**（`import/export`）；`namespace` 主要用于描述全局变量类型或为 UMD 库提供类型：

```typescript
// 命名空间（适合全局脚本或 UMD 库类型描述）
namespace MedAI {
  export interface Config { apiKey: string; model: string }
  export function init(config: Config): void { /* ... */ }
}

// ES Module 路径别名（配合 tsconfig paths）
import { Patient } from '@/types/patient'  // 👈 @ 映射到 src/
```

---

## 📄 20 类型声明：.d.ts 文件

`.d.ts` 文件只含**类型信息**，不含实现，为 JavaScript 库提供类型描述：

```typescript
// src/types/global.d.ts

// 声明非 JS 模块（让 TypeScript 知道这些 import 的类型）
declare module '*.svg' {
  const content: string
  export default content
}

// 声明全局函数
declare function trackEvent(name: string, data?: Record<string, unknown>): void
```

`DefinitelyTyped`（`@types/*`）是社区维护的第三方库类型定义仓库，90% 的常用库都有对应的 `@types/xxx` 包。

---

## 🌐 21 扩展全局变量类型：声明合并的实战

通过声明合并为已有类型添加属性：

```typescript
// 扩展 Window 对象（常用于挂载全局配置）
declare global {
  interface Window {
    analytics: Analytics
    __APP_CONFIG__: { apiBase: string; env: string }
  }
}
```

```typescript
// 扩展第三方库的类型（以 Express 为例）
declare module 'express-serve-static-core' {
  interface Request {
    user?: User
    requestId: string
  }
}
```

> 💬 **面试官**：为什么扩展全局类型要用 `interface` 而不是 `type`？
>
> ✅ 标准答案：只有 `interface` 支持声明合并（Declaration Merging）。`type` 一旦定义就不能被同名定义扩展，而 `interface` 的多个同名声明会自动合并为一个类型。

---

## ⚙️ 22 tsconfig.json 详解：配置项精讲

核心配置项及其含义：

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

`strict: true` 实际上打开了 8 个子选项：

```json
{
  "strictNullChecks": true,        // null/undefined 不能赋值给其他类型
  "strictFunctionTypes": true,     // 函数参数严格逆变
  "strictBindCallApply": true,     // bind/call/apply 类型检查
  "strictPropertyInitialization": true, // 类属性必须在构造函数初始化
  "noImplicitAny": true,           // 禁止隐式 any
  "noImplicitThis": true,          // 禁止 this 的隐式 any
  "alwaysStrict": true,            // 生成严格模式 JS
  "useUnknownInCatchVariables": true // catch 的 error 默认 unknown
}
```

> 💬 **面试官**：`strictNullChecks` 关掉有什么影响？
>
> ✅ 标准答案：关掉后 `null`/`undefined` 可以赋值给任何类型，运行时 NPE（空指针异常）风险大增。这是 TypeScript 最关键的保护开关，生产项目必须开启。
> 🎁 加分答案：新项目直接开 `strict: true`；老项目迁移时可以开 `"strictNullChecks": true` 单独项，逐步修复，比全开 strict 更可控。

---

## 🏆 23 综合实例：类型安全的 API 客户端

把前面所有知识点串联成一个实战场景 —— **类型安全的接口调用层**：

```typescript
// 定义所有 API 端点及其响应类型
type ApiEndpoints = {
  '/drugs':              Drug[]
  '/patients':           Patient[]
  '/prescriptions/:id':  Prescription
}

type ApiResponse<T> = { data: T; status: number; message: string }
```

用条件类型 + `infer` 提取路径参数：

```typescript
// 从路径字符串中提取 :param 参数名
type ExtractParams<P extends string> =
  P extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<Rest>
    : P extends `${string}:${infer Param}`
    ? Param
    : never
```

泛型 + 条件类型实现**参数自动要求**：

```typescript
async function request<P extends keyof ApiEndpoints>(
  path: P,
  ...args: ExtractParams<P> extends never
    ? []
    : [params: Record<ExtractParams<P>, string>]
): Promise<ApiResponse<ApiEndpoints[P]>> {
  return fetch(path).then(r => r.json())
}

request('/drugs')                              // ✅ 无参数
request('/prescriptions/:id', { id: '123' })  // ✅ 有参数
request('/prescriptions/:id')                 // ❌ 编译报错：缺少参数
```

🔧 **在药品电商项目中的价值**：接口路径、请求参数、响应数据全部类型安全。后端改了某个接口的响应结构，前端编译立刻报错 —— 这就是面试时能说出「TypeScript 带来的实际收益」的案例。

---

## 💡 一张图总结：面试速记

| 模块 | 核心考点 | 面试频率 |
|------|---------|---------|
| 基础类型 | `any / unknown / never` 三角辨析 | ⭐⭐⭐⭐⭐ |
| 类型推导 | 字面量类型 / `as const` / 拓宽规则 | ⭐⭐⭐⭐ |
| 函数类型 | 重载机制 / 参数逆变 / 返回值协变 | ⭐⭐⭐⭐ |
| 接口 vs type | 声明合并 / 联合类型 / 使用场景 | ⭐⭐⭐⭐⭐ |
| 泛型 | 约束 `extends` / `infer` 捕获 | ⭐⭐⭐⭐⭐ |
| 条件类型 | 分布式行为 / `infer` / 关闭分布式 | ⭐⭐⭐⭐⭐ |
| 映射类型 | `keyof` / `in` / `as` 重映射 | ⭐⭐⭐⭐ |
| 内置工具 | Partial/Omit/ReturnType 原理手写 | ⭐⭐⭐⭐⭐ |
| unknown | 与 any 的区别 / 缩窄后使用 | ⭐⭐⭐⭐ |
| 声明合并 | 扩展 Window / 第三方库类型 | ⭐⭐⭐ |
| tsconfig | strict 子选项 / paths / target | ⭐⭐⭐⭐ |

---

## 📝 留个问题

现在问你：**手写一个 `DeepPartial<T>`**——递归将所有属性变为可选，要求：
1. 能处理普通对象的嵌套
2. `Array<T>` 保持数组类型不被当成对象递归
3. `Date`、`RegExp` 等特殊对象不被拆开

能写出第 2、3 点的，是面试加分的答案。欢迎评论区贴出你的实现，我看到必回复 👇

---

> 🔖 TypeScript 系列 · 完整地图篇。下一篇深入「类型体操专项」—— 手写 10 个经典工具类型，每一道都是真实面试题。
