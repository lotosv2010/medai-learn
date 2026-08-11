# TypeScript 进阶篇：类型兼容、守卫与工具类型全解

> 你写了一个药品列表接口，返回 `DrugItem[]`，传给某个通用组件时 TypeScript 报错——明明字段都有，为什么不行？  
> 你定义了 `handleResponse(res: ApiSuccess | ApiError)`，却不知道怎么在函数体里安全地访问 `.data`……  
> 这两个问题，就是本篇要解决的核心：**类型兼容**和**类型守卫**。

---

## 🎯 这篇文章解决什么问题

TypeScript 基础语法不难，真正让人头疼的是：为什么这里可以赋值、那里不行？如何让 TS 在 `if` 块里自动收窄类型？内置工具类型底层到底是怎么实现的？

读完这篇文章，你将理解类型系统的「安全性哲学」，掌握五种类型守卫，以及能手写 Partial、DeepPartial、Diff 等常见工具类型。

本文是 **TypeScript 从入门到精通系列** 第二篇，共三篇：
- **第一篇**：类型系统基础 — 基础类型、接口、泛型、类
- **第二篇（本篇）**：类型进阶 — 兼容性、类型守卫、工具类型全解
- **第三篇**：类型高级 — 条件类型、infer、类型体操实战

---

## 🔄 类型兼容：结构决定一切

### 基本兼容原则

TypeScript 的兼容性判断只看**结构**，不看名字。核心原则是：**你要的我有，就能赋值**。

```typescript
interface IAnimal {
  name: string
  age: number
}
interface IPerson {
  name: string
  age: number
  address: string  // 👈 比 IAnimal 多一个字段
}

let animal: IAnimal
let person: IPerson = { name: 'Robin', age: 18, address: 'Shanghai' }

animal = person  // ✅ Person 的属性完全覆盖了 Animal 所需的字段
```

这在医疗业务里很常见：后端返回的 `DrugDetail`（字段更多）可以安全赋值给组件接受的 `DrugBase`（字段更少），不需要做任何转换。

### 函数兼容：参数「少」可赋给参数「多」

函数赋值时，**赋值函数的参数数量要 ≤ 被赋值函数**，这和对象规则正好相反。

```typescript
let sum1 = (a: string, b: string) => a + b
let sum2 = (a: string) => a

sum1 = sum2  // ✅ sum2 参数更少，可以赋给 sum1
```

这就是为什么 `forEach` 的回调可以只写 `item => {}` 而不必写 `(item, index) => {}`——少的可以赋给多的，多的参数被忽略，是安全的。

### 逆变与协变：函数参数为什么「反着来」

这是 TypeScript 类型系统中最精妙、也最高频的面试考点。

先定义三个层级的类：

```typescript
class Parent {
  address: string = 'Shanghai'
}
class Child extends Parent {
  money: number = 100
}
class Grandson extends Child {
  name: string = 'Jim'
}
```

**协变（Covariance）**：子类型关系方向不变。返回值类型是协变的——返回子类的函数，可以赋给要求返回父类的变量：

```typescript
type AnimalFactory = () => Animal
type DogFactory = () => Dog

// ✅ 返回 Dog 的函数，能当作返回 Animal 的函数用
// 因为 Dog 是 Animal，调用者拿到的一定是合法的 Animal
let animalFactory: AnimalFactory = (() => new Dog()) as DogFactory
```

**逆变（Contravariance）**：子类型关系方向翻转。参数类型是逆变的——接受父类参数的函数，可以赋给要求接受子类参数的变量：

```typescript
type Callback = (person: Child) => Child  // 要求参数是 Child
function execCallback(cb: Callback) {}

let fn = (person: Parent) => new Grandson  // 👈 参数是 Parent（父类），返回是 Grandson（子类）
execCallback(fn)  // ✅ 合法
```

**为什么参数是逆变的？** 从安全性角度想：`execCallback` 调用 `cb` 时，会传入一个 `Child` 对象。如果 `fn` 接受的是 `Parent`，那它能处理任何 `Parent`，自然能处理 `Child`（`Child` 是 `Parent` 的子集）。反过来，如果 `fn` 只接受 `Grandson`，那传入普通 `Child` 就会出问题。

一句话总结：**函数参数逆变、返回值协变**。

> 💬 **面试官**：协变和逆变是什么？为什么函数参数是逆变的？
>
> ✅ 标准答案：协变指子类型关系保持方向不变（如返回值：返回 Dog 的函数可当返回 Animal 的函数用）；逆变指方向翻转（如参数：接受 Animal 的函数可赋给接受 Dog 的位置）。参数逆变是因为调用者会传入具体子类型，函数必须能处理它，接受范围更宽（父类）反而更安全。
> 🎁 加分答案：开启 `strictFunctionTypes` 后，TS 对函数参数强制逆变检查。关闭后退化为双向协变，可能产生类型漏洞：把只能处理 `Dog` 的函数当成处理 `Animal` 的函数来调用，传入 `Cat` 就崩了。

> 💬 **面试官**：`strictFunctionTypes` 关掉后有什么危险？
>
> ✅ 标准答案：关掉后函数参数变为双向协变，可以把接受子类型的函数赋给接受父类型的变量。运行时若传入其他子类型（如 Cat），函数内部访问 Dog 特有属性会直接报错，而编译阶段完全无提示。
> 🎁 加分答案：这相当于在类型层面打了一个"洞"——所有依赖参数类型安全的回调函数都可能悄悄出错，尤其是事件处理、高阶函数场景。

---

## 🛡️ 类型守卫：让 TS 自动收窄类型

类型守卫（Type Guard）是在特定代码块中告诉 TypeScript「这里的类型就是 X」，让编译器自动收窄联合类型。一共有五种方式。

### typeof 守卫

最简单，适合基础类型区分：

```typescript
function double(val: number | string) {
  if (typeof val === 'number') {
    return val * 2        // 👈 这里 val 被收窄为 number
  } else {
    return parseFloat(val) * 2  // 👈 这里 val 被收窄为 string
  }
}
```

### instanceof 守卫

适合区分类的实例：

```typescript
class Cat {}
class Dog {}

const getInstance = (clazz: { new(): Cat | Dog }) => new clazz()
let r = getInstance(Cat)

if (r instanceof Cat) {
  console.log('is Cat', r)  // 👈 r 被收窄为 Cat
}
```

### in 守卫

通过判断属性是否存在来区分接口：

```typescript
interface Fish { swimming: string }
interface Bird { fly: string; leg: number }

function getType(animal: Fish | Bird) {
  if ('swimming' in animal) {
    console.log('fish', animal)  // 👈 animal 被收窄为 Fish
  } else {
    console.log('bird', animal)  // 👈 animal 被收窄为 Bird
  }
}
```

### 可辨识联合类型

给每个接口加一个**字面量类型**的 `kind` 字段，通过它做区分，是实战中最常见的模式：

```typescript
interface WarningButton { type: 'warning' }
interface DangerButton  { type: 'danger'  }

function createButton(button: WarningButton | DangerButton) {
  if (button.type === 'warning') {
    console.log('warning')  // 👈 收窄为 WarningButton
  } else {
    console.log('danger')   // 👈 收窄为 DangerButton
  }
}
```

在药品电商场景中，API 响应结构经常用这个模式：

```typescript
interface ApiSuccess { status: 'success'; data: DrugItem[] }
interface ApiError   { status: 'error';   message: string  }
type ApiResponse = ApiSuccess | ApiError

function handleDrugResponse(res: ApiResponse) {
  if (res.status === 'success') {
    renderDrugList(res.data)   // ✅ res 被收窄为 ApiSuccess
  } else {
    showError(res.message)     // ✅ res 被收窄为 ApiError
  }
}
```

### 自定义类型守卫（`is` 谓词）

当判断逻辑比较复杂，需要封装成函数时，用返回类型 `animal is Bird` 来告诉 TS 这是一个守卫函数：

```typescript
function isBird(animal: Fish | Bird): animal is Bird {
  return 'fly' in animal  // 👈 返回 true 时，TS 相信 animal 是 Bird
}

function getAnimal(animal: Fish | Bird) {
  if (isBird(animal)) {
    console.log(animal.fly)  // ✅ 安全访问
  }
}
```

### never 穷尽性检查

这是类型守卫最高级的用法，配合 `switch` 确保不会漏处理新增的联合成员：

```typescript
type Area = ICircle | IRant | ISquare

const isAssertion = (obj: never) => {}  // 👈 接受 never 的哨兵函数

const getArea = (obj: Area) => {
  switch (obj.kind) {
    case 'circle': return 3.14 * obj.r ** 2
    case 'rant':   return obj.width * obj.height
    case 'square': return obj.width * obj.width
    default:
      return isAssertion(obj)  // 👈 若新增 ITriangle 但没加 case，这里编译报错
  }
}
```

> 💬 **面试官**：五种类型守卫方式各是什么，哪种最灵活？
>
> ✅ 标准答案：`typeof`（基础类型）、`instanceof`（类实例）、`in`（属性存在判断）、可辨识联合（字面量 kind 字段）、自定义 `is` 谓词函数。自定义守卫最灵活，可以封装任意复杂逻辑，但需要手动保证实现的正确性。
> 🎁 加分答案：配合 `never` 做穷尽性检查，是防止「新增联合类型成员但忘记处理」这类 bug 的最佳实践，在大型项目里能提前捕获维护性错误。

---

## 🛠️ 类型变换与工具类型

### keyof 与映射类型

`keyof T` 取出类型 `T` 的所有键，结果是一个字符串字面量联合类型：

```typescript
interface Person {
  name: string
  age: number
  gender: 'male' | 'female'
}

type PersonKey = keyof Person  // 'name' | 'age' | 'gender'

function getValueByKey(p: Person, key: PersonKey) {
  return p[key]  // ✅ 类型安全的属性访问
}
```

**映射类型**用 `in keyof T` 遍历所有键，批量生成新类型：

```typescript
type Part<T> = {
  [key in keyof T]?: T[key]  // 👈 每个属性变可选
}
```

这本质上就是 `Partial<T>` 的实现。

**索引访问操作符** `T['key']` 可以取出嵌套类型：

```typescript
interface Person {
  name: string
  interests: { name: string; level: number }[]
}

type InterestLevel = Person['interests'][0]['level']  // number
```

> 💬 **面试官**：`keyof T` 和 `in keyof T` 各是什么，映射类型怎么用？
>
> ✅ 标准答案：`keyof T` 是类型查询操作符，返回 T 所有键的联合类型；`in keyof T` 用在映射类型的方括号里，遍历这些键来批量定义属性。两者配合可以实现 Partial、Readonly 等工具类型。
> 🎁 加分答案：TS 4.1 引入了 `as` 重映射，可以在映射时修改键名，例如 `as \`get${Capitalize<K & string>}\`` 可以把所有属性变成 getter 方法名，实现更灵活的类型变换。

### 交叉类型：合并还是收窄？

`A & B` 表示同时满足 A 和 B 的类型，通常用于合并两个接口：

```typescript
function mixin<T, K>(a: T, b: K): T & K {
  return { ...a, ...b }
}
const x = mixin({ name: 'Robin' }, { age: 18 })  // { name: string; age: number }
```

**特别注意**：当两个接口的同名属性类型不同时，交叉结果是 `never`：

```typescript
interface IPerson1 { name: string; age: number }
interface IPerson2 { name: number; age: number }  // 👈 name 类型不同

type Person = IPerson1 & IPerson2
// Person.name 的类型是 string & number = never
// 因为不存在一个值既是 string 又是 number

let name!: never
let person: Person = { name, age: 11 }  // 只能传 never
```

> 💬 **面试官**：交叉类型 `A & B` 中同名属性类型不同会怎样？
>
> ✅ 标准答案：两个不兼容类型的交叉结果是 `never`，因为不存在满足两种类型约束的值。整个对象类型依然存在，只是那个同名属性的类型变成了 `never`，意味着这个属性无法被赋予任何值。
> 🎁 加分答案：可以利用这个特性实现「标称类型」（Nominal Type）：`type BTC = number & { __tag: 'BTC' }`，让 BTC 和 USD 在结构上不兼容，防止金额混用，是金融/电商场景的常见安全技巧。

### 条件类型：类型层面的三元运算

`T extends U ? X : Y` 是条件类型的基础形式：

```typescript
type Condition<T> = T extends Fish ? Water : Sky

// 处理 HTTP 状态码
type ResMessage<T extends number> = T extends 200 | 204 | 206 ? 'success' : 'error'
```

三个最常用的内置条件类型，面试必问：

**Exclude**：从 T 中排除能赋值给 U 的类型

```typescript
type MyExclude = Exclude<'1' | '2' | '3', '1' | '2'>  // '3'

// 实现原理：利用分发式条件类型
type Exclude<T, U> = T extends U ? never : T
// T 是联合类型时会逐一分发：
// '1' extends '1'|'2' ? never : '1'  => never
// '2' extends '1'|'2' ? never : '2'  => never
// '3' extends '1'|'2' ? never : '3'  => '3'
// never 在联合类型中被自动过滤，最终得到 '3'
```

**Extract**：从 T 中提取能赋值给 U 的类型

```typescript
type MyExtract = Extract<'1' | '2' | '3', '1' | '2'>  // '1' | '2'

// 实现原理：和 Exclude 相反
type Extract<T, U> = T extends U ? T : never
```

**NonNullable**：去掉 null 和 undefined

```typescript
type MyNone = NonNullable<'a' | null | undefined>  // 'a'

// 新版实现（更简洁）
type NonNullable<T> = T & {}
```

> 💬 **面试官**：`Exclude<T,U>` 和 `Extract<T,U>` 的实现原理是什么？
>
> ✅ 标准答案：两者都基于分发式条件类型。当 T 是联合类型时，TS 会把联合类型的每个成员单独传入条件类型计算，再把结果合并。Exclude 用 `T extends U ? never : T`，命中的用 never 替换（never 在联合中自动消失）；Extract 用 `T extends U ? T : never`，不命中的用 never 替换。
> 🎁 加分答案：分发式条件类型要求泛型参数必须是「裸类型」（naked type）。用 `[T] extends [U]` 包一层括号可以禁用分发，这在需要把联合类型整体比较（而不是逐一比较）时很重要。

---

## 💎 内置工具类型与手写实现

这是面试最爱考的部分——会用还不够，要能手写。

### Partial / Required / Readonly

三者的实现都基于映射类型，关键在修饰符的增减：

```typescript
// Partial：所有属性变可选（加 ?）
type Partial<T> = {
  [K in keyof T]?: T[K]
}

// Required：所有属性变必填（去掉 ?，用 -? 表示移除）
type Required<T> = {
  [K in keyof T]-?: T[K]  // 👈 -? 移除可选修饰符
}

// Readonly：所有属性变只读
type Readonly<T> = {
  readonly [K in keyof T]: T[K]
}

// 反向：Mutable 移除 readonly
type Mutable<T> = {
  -readonly [K in keyof T]: T[K]  // 👈 -readonly 移除只读修饰符
}
```

在药品编辑表单场景中，`Partial` 非常实用：后端的 `DrugItem` 所有字段必填，但编辑表单里用户可能只改部分字段：

```typescript
interface DrugItem {
  id: number
  name: string
  price: number
  category: string
}

// 编辑表单：所有字段可选，只传修改的字段
type DrugEditForm = Partial<DrugItem>

function updateDrug(id: number, patch: DrugEditForm) {
  // patch.name 和 patch.price 都是 string | undefined
}
```

> 💬 **面试官**：手写 `Partial<T>`、`Readonly<T>`、`Required<T>`
>
> ✅ 标准答案：三者均基于映射类型 `[K in keyof T]`。Partial 加 `?`，Required 加 `-?`，Readonly 加 `readonly`。`-?` 和 `-readonly` 是 TS 的修饰符移除语法，分别移除可选和只读。
> 🎁 加分答案：这三个类型都是「浅层」变换，不递归处理嵌套对象。需要深度处理时要手写 DeepPartial，用条件类型判断值是否为 object，是则递归。

### Pick / Omit / Record

```typescript
// Pick：挑选指定属性
type Pick<T, U extends keyof T> = {
  [P in U]: T[P]
}

// Omit：忽略指定属性（= Pick 剩余的键）
type Omit<T, K> = Pick<T, Exclude<keyof T, K>>

// Record：键值映射
type Record<K extends keyof any, T> = {
  [P in K]: T
}
```

`Omit` 的实现是 `Pick + Exclude` 的组合拳，先用 `Exclude` 把不要的键从 `keyof T` 里去掉，再用 `Pick` 提取剩余的键。

---

## 🔧 自定义工具类型

### DeepPartial：深度可选

内置 `Partial` 只处理第一层，深度嵌套的对象需要递归：

```typescript
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
  //                   👆 值是对象类型时，递归处理
}
```

使用效果：

```typescript
interface Company { num: number }
interface Person  { name: string; age: number; company: Company }

type DeepPartialPerson = DeepPartial<Person>

let dp: DeepPartialPerson = {
  name: 'Robin',
  company: {}  // ✅ company 内部的 num 也变成可选了
}
```

> 💬 **面试官**：手写 `DeepPartial<T>`，如何处理数组？
>
> ✅ 标准答案：基础版用 `T[K] extends object ? DeepPartial<T[K]> : T[K]` 递归。但 `object` 包含数组，直接递归会让 `T[]` 变成有 `length`、`push` 等可选属性的奇怪类型。
> 🎁 加分答案：需要加一个数组判断分支：`T[K] extends Array<infer Item> ? Array<DeepPartial<Item>> : T[K] extends object ? DeepPartial<T[K]> : T[K]`。先判断数组，递归数组元素类型，再判断普通对象，最后返回原始类型。

### Diff 与 Merge

**Diff**：求两个对象类型的差集（T 有但 K 没有的属性）

```typescript
type Diff<T extends object, K extends object> = Omit<T, keyof K>

let person1 = { name: 'Robin', age: 18, address: 'sh' }
let person2 = { address: 'bj' }

type DiffPerson = Diff<typeof person1, typeof person2>
// 结果：{ name: string; age: number }  👈 address 被去掉了
```

**Merge**：合并两个对象，后者属性覆盖前者同名属性

```typescript
type Compute<A> = { [K in keyof A]: A[K] }  // 展开类型，让 IDE 显示具体结构
type Merge<T, K> = Compute<Omit<T, keyof K> & K>

type OldProps = { name: string; age: number; visible: boolean }
type NewProps = { age: string; other: string }  // age 类型从 number 变 string

type MergeObj = Merge<OldProps, NewProps>
// 结果：{ name: string; age: string; visible: boolean; other: string }
// 👆 age 被 NewProps 的 string 类型覆盖
```

---

## 🔒 unknown：安全版的 any

`unknown` 是 TypeScript 3.0 引入的，定位是「类型安全的 any 替代品」。

**相同点**：任何类型的值都可以赋给 `unknown`。

**关键区别**：`unknown` 类型的值在使用前**必须做类型缩窄**，否则什么操作都不允许：

```typescript
let value: unknown

value = true            // ✅ 可以赋值
value = 'Hello World'   // ✅ 可以赋值

// 不缩窄直接使用，全部报错：
value.foo.bar   // ❌
value.trim()    // ❌
value()         // ❌
new value()     // ❌
```

**缩窄后才能使用**，方式和类型守卫一致：

```typescript
const handleUnknown = (val: unknown) => {
  if (typeof val === 'string') {
    console.log(val.toUpperCase())  // ✅ 缩窄为 string 后可操作
  }
  if (val instanceof Error) {
    console.log(val.message)  // ✅ 缩窄为 Error 后可操作
  }
}
```

**在联合类型和交叉类型中的特殊行为**：

```typescript
// 联合类型：unknown 吸收一切
type U1 = unknown | string   // unknown
type U2 = unknown | null     // unknown

// 交叉类型：任何类型吸收 unknown
type I1 = unknown & string   // string
type I2 = unknown & null     // null
```

实际项目中，当你有一个来源不确定的数据（比如 `JSON.parse` 的结果、用户输入、第三方 SDK 返回值），**用 `unknown` 而不是 `any`**，强制自己先做类型判断，而不是假设它一定是某个类型。

---

## 💡 一张图总结（面试速记）

| 知识点 | 一句话解释 | 面试频率 |
|--------|-----------|---------|
| 结构兼容 | 你要的我有就行，不看名字 | ⭐⭐⭐ |
| 协变 | 子类可替换父类（返回值、数组） | ⭐⭐⭐⭐⭐ |
| 逆变 | 父类可赋给子类位置（函数参数） | ⭐⭐⭐⭐⭐ |
| typeof 守卫 | 基础类型区分 | ⭐⭐⭐ |
| in 守卫 | 属性存在判断 | ⭐⭐⭐ |
| 自定义 is 守卫 | 封装复杂判断逻辑 | ⭐⭐⭐⭐ |
| never 穷尽检查 | 防止漏处理联合成员 | ⭐⭐⭐⭐ |
| keyof + 映射类型 | 批量生成属性类型 | ⭐⭐⭐⭐⭐ |
| Exclude / Extract | 条件类型过滤，利用分发 | ⭐⭐⭐⭐⭐ |
| Partial / Required | 映射类型 + 修饰符增减 | ⭐⭐⭐⭐⭐ |
| Omit | Pick + Exclude 组合 | ⭐⭐⭐⭐ |
| DeepPartial | 递归映射类型 | ⭐⭐⭐⭐ |
| unknown vs any | unknown 使用前必须缩窄 | ⭐⭐⭐⭐ |

---

## 📝 留个问题

有一个药品列表页，后端返回 `DrugItem[]`，组件接受 `BaseItem[]`（BaseItem 是 DrugItem 的子集）。请问：

1. 直接把 `DrugItem[]` 赋给 `BaseItem[]` 变量，会报错吗？为什么？
2. 如果要写一个 `transform<T, K extends Partial<T>>(list: T[]): K[]` 的泛型函数，有什么问题？

欢迎在评论区写出你的分析。

---

> 🔖 TypeScript 从入门到精通系列 · 第二篇 — 进阶篇  
> 上一篇：**TypeScript 入门篇** | 下一篇：**TypeScript 高级篇：条件类型、infer 与类型体操实战**
