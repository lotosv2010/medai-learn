# TypeScript 入门篇：打通类型系统，告别 any 地狱

> 面试被问到 `any` 和 `unknown` 的区别，你能回答出来吗？工作三年的 JS 老手，加了 TS 之后却满屏 `any`——这篇文章就是为你写的。

---

## 🎯 这篇文章解决什么问题

很多人学 TypeScript 的路径是：看文档 → 加类型标注 → 报错了就 `as any` → 觉得 TS 没用。这篇文章要帮你理解类型系统的底层逻辑，让你真正从"会用"跨越到"理解"。

本文是 **TypeScript 从入门到精通系列** 第一篇，共三篇：
- **第一篇（本篇）**：类型系统基础 — 基础类型、接口、泛型、类
- **第二篇**：类型进阶 — 兼容性、类型守卫、工具类型全解
- **第三篇**：类型高级 — 条件类型、infer、类型体操实战

---

## ⚡ 为什么 TypeScript，而不是继续用 JavaScript

### 强类型 vs 弱类型

类型安全的核心分界线是**能不能隐式转换**。

强类型语言（Java、Go）在语言层面限制函数实参类型必须与形参一致，不允许任意隐式类型转换。弱类型语言（JavaScript）几乎没有什么约束，类型异常只在运行时才会抛出。

JavaScript 的"任性"是双刃剑：灵活是代价，也是 bug 温床。

### 静态类型 vs 动态类型

这是另一个维度的分类：

- **静态类型**：变量声明时类型就确定了，声明后不允许修改。TypeScript 是静态类型。
- **动态类型**：运行阶段才能明确变量类型，变量的类型随时可以改变。注意——动态类型语言中变量本身没有类型，存放的值才有类型。

JavaScript 是弱类型 + 动态类型的双重组合，而且没有编译环节（类型检查就发生在编译阶段），所以类型错误只能在线上爆。

> 💬 **面试官**：TypeScript 是静态类型系统，但它用的是结构类型（Structural Typing），这和 Java 的标称类型（Nominal Typing）有什么区别？
>
> ✅ **标准答案**：Java 的标称类型要求两个类型必须显式声明继承或实现关系才能兼容。TypeScript 的结构类型只看"形状"——只要两个类型的属性结构相同，它们就是兼容的，不需要显式继承。
>
> 🎁 **加分答案**：这意味着 TS 中一个鸭子类型的场景下，只要对象拥有 `name: string` 和 `age: number`，不管它是哪个类的实例，都能赋值给 `{ name: string; age: number }` 类型的变量。这让 TS 在 JS 生态里更自然，也是它能渐进式接入老项目的根本原因。

### TypeScript 的三大核心价值

TypeScript 是 JavaScript 的超集，遵循最新的 ES5/ES6 规范，扩展了 JavaScript 语法：

1. **错误提前暴露**：编译阶段发现类型错误，而不是线上爆炸
2. **代码更智能**：IDE 能提供丰富的语法提示和自动补全
3. **重构更牢靠**：改一个接口字段，所有使用方立刻报错，安全网级别的保障

---

## 📦 基础类型全景：从原始类型到 never

### 原始类型、数组与元组

最基础的标注方式：冒号后面跟类型。

```typescript
let bool: boolean = true
let num: number = 10
let str: string = 'hello ts'

// 数组两种写法
let ary1: number[] = [1, 2, 3]
let ary2: Array<number | string> = ['1', 2, '3']

// 元组：限制长度 + 一一对应
let tuple: [string, number, boolean] = ['ts', 10, true]
tuple.push('hello') // 只能 push 元组中已有的类型
```

### 枚举类型与反举原理

枚举是 TypeScript 里少数会**侵入编译后代码**的特性：

```typescript
enum USER_ROLE {
  USER,   // 默认从 0 开始
  ADMIN,
  MANAGER
}
// 原理：{0: "USER", 1: "ADMIN", 2: "MANAGER", USER: 0, ADMIN: 1, MANAGER: 2}
```

编译后的 JS 是这样的：

```javascript
(function (USER_ROLE) {
    USER_ROLE[USER_ROLE["USER"] = 0] = "USER";  // 👈 双向映射
    USER_ROLE[USER_ROLE["ADMIN"] = 1] = "ADMIN";
    USER_ROLE[USER_ROLE["MANAGER"] = 2] = "MANAGER";
})(USER_ROLE || (USER_ROLE = {}));
```

正是这个双向赋值的 IIFE，让枚举既能**正举**（`USER_ROLE.ADMIN` → `1`）也能**反举**（`USER_ROLE[1]` → `"ADMIN"`）。

如果不需要反举，推荐用**常量枚举**，编译后直接内联数字，不产生额外代码：

```typescript
const enum USER_ROLE {
  USER,
  ADMIN,
  MANAGER
}
console.log(USER_ROLE.USER) // 编译后：console.log(0 /* USER */);
```

### any / unknown / never / void 四者辨析

这是面试必考题，先上代码再讲区别：

```typescript
// any：完全放弃类型检查
let arr: any = ['ts', true, { name: 'ts' }]

// void：只接受 null 和 undefined，一般用于函数返回值
let a: void
a = undefined

// never：代表不可能出现的值
function error(message: string): never {
  throw new Error('error')
}
function loop(): never {
  while(true) {}
}
```

`never` 最妙的用法是**穷尽性检查**。假设你有一个药品分类枚举，用 `never` 来保证所有分类都被处理：

```typescript
type DrugCategory = 'OTC' | 'PRESCRIPTION' | 'SUPPLEMENT'

function handleDrug(category: DrugCategory): string {
  switch(category) {
    case 'OTC': return '非处方药，可直接购买'
    case 'PRESCRIPTION': return '处方药，需医生开具'
    case 'SUPPLEMENT': return '保健品，建议咨询医师'
    default:
      const exhausted: never = category // 👈 如果新增分类忘记处理，这里会报错
      throw new Error(`未处理的分类: ${exhausted}`)
  }
}
```

类型层级的完整顺序：

```typescript
// never < 字面量 < 字面量联合类型 < 原始类型 < 包装类型 < object < any | unknown
type R1 = never extends '123' ? true : false;       // true
type R3 = '123' extends string ? true : false;      // true
type R4 = string extends String ? true : false;     // true
type R6 = Object extends any ? true : false;        // true
```

> 💬 **面试官**：`any`、`unknown`、`never` 三者有什么区别？分别在什么场景使用？
>
> ✅ **标准答案**：`any` 完全关闭类型检查，可以赋值给任何类型，也接受任何类型赋值；`unknown` 是"类型安全的 any"，接受任何类型赋值，但使用前必须做类型收窄；`never` 是最底层的类型，表示永远不会出现的值，任何类型的子类型，但不能把其他类型赋给它。
>
> 🎁 **加分答案**：`unknown` 用于不确定外部输入类型时（如 JSON 解析结果），比 `any` 更安全；`never` 用于穷尽性检查，确保 `switch-case` 覆盖了所有枚举值。永远不要因为"懒得写类型"而用 `any`，应该用 `unknown` + 类型守卫来替代。

---

## 🔮 类型推导、字面量类型与函数重载

### 类型推导与 as const

TypeScript 会自动推断类型，有两种基础情况：

```typescript
let name     // 没赋值 → 推断为 any
let age = 18 // 赋值了 → 推断为 number，之后不能赋 string
```

字面量类型让你能用"特定值"当类型使用：

```typescript
type Direction = 'Up' | 'Down' | 'Left' | 'Right'
let dir: Direction = 'Down'
// let d2: Direction = 'up' // 报错：'up' 不在 Direction 中
```

`as const` 会将对象/数组的所有属性收窄为字面量类型：

```typescript
const config = {
  endpoint: '/api/drug',
  timeout: 3000
} as const
// config.endpoint 的类型是 '/api/drug'，不是 string
```

### 类型断言：两种写法

```typescript
let a: string | number

// 写法一（推荐，React 项目中安全）
(a! as number).toFixed(2)

// 写法二（在 JSX 中会被当作泛型语法，避免）
(<number>a!).toFixed(2)
```

双重断言 `(x as any) as T` 能破坏原有类型关系，尽量避免——它的存在意味着你在绕开类型系统而不是修复它。

### 函数类型的两种声明方式

```typescript
// 方式一：function 关键字
function sum(a: string, b: string): string {
  return a + b
}

// 方式二：类型别名 + 箭头函数
type Add = (a: string, b: string) => string
let add: Add = (a, b) => a + b
```

可选参数、默认参数、剩余参数：

```typescript
// 可选参数必须放在最后
let minus = (a: number, b?: number): number => a - (b ?? 0)

// 默认参数
let getName = (first: string, last: string = 'li'): string => `${last} ${first}`

// 剩余参数
const max = (...args: number[]): number => Math.max(...args)
```

### 函数重载

根据传入不同类型的参数，返回不同类型的结果：

```typescript
// 先声明重载签名（只写类型，不写实现）
function toArray(value: number): number[]
function toArray(value: string): string[]
// 最后一个是实现签名（不对外暴露）
function toArray(value: number | string) {
  if(typeof value === 'string') {
    return value.split('')
  } else {
    return value.toString().split('').map(Number)
  }
}

const o1 = toArray(123)   // 推断为 number[]
const o2 = toArray('123') // 推断为 string[]
```

> 💬 **面试官**：TypeScript 函数重载的实现原理是什么？和 Java 的重载有什么区别？
>
> ✅ **标准答案**：TypeScript 的函数重载是**编译时多态**，运行时只有一个函数实体。重载签名只在类型层面存在，编译后全部消失，剩下的只是那个实现函数的 JS 代码。Java 的重载是运行时也存在多个方法，JVM 根据参数类型做分发。
>
> 🎁 **加分答案**：TS 的实现签名必须是所有重载签名的超集（参数类型用联合类型），且实现签名本身对外不可见。在实现内部要用 `typeof` 或 `instanceof` 做类型守卫来区分不同分支。如果逻辑不复杂，优先用联合类型参数 + 三元运算符，比重载更简洁。

---

## 🏗️ 类、接口与泛型：三件套打通面向对象

### 类的访问修饰符

TypeScript 给类加了四个修饰符，控制属性可见性：

```typescript
class Animal {
  public name: string    // 任何地方都能访问（默认）
  protected age: number  // 自己和子类可以访问
  private _id: string    // 只有自己可以访问
  readonly species: string // 仅读，只能在 constructor 中赋值

  constructor(name: string, age: number, id: string, species: string) {
    this.name = name
    this.age = age
    this._id = id
    this.species = species
  }
}
```

构造函数参数前加修饰符可以简化声明：

```typescript
class Animal {
  // 等价于先声明属性，再在 constructor 里赋值
  constructor(
    public name: string,
    protected age: number,
    private _id: string
  ) {}
}
```

`private` 还有一个经典用法——实现单例模式：

```typescript
class Single {
  private static instance: Single
  private constructor() {}  // 👈 禁止外部 new
  static getInstance() {
    if (!Single.instance) {
      Single.instance = new Single()
    }
    return Single.instance
  }
}
const s1 = Single.getInstance()
const s2 = Single.getInstance() // s1 === s2，永远是同一个实例
```

### 抽象类

抽象类的核心规则：**不能被实例化，只能被继承；抽象方法不在抽象类中实现，必须在子类中实现**。

```typescript
abstract class Animal {
  constructor() {
    console.log('Animal')
  }
  abstract eat(): void  // 子类必须实现
  run() {               // 抽象类中可以有具体实现
    console.log('run')
  }
}

class Dog extends Animal {
  eat() {
    console.log('dog eat') // 👈 必须实现 eat
  }
}

const dog = new Dog()
dog.eat()
dog.run() // 继承自抽象类的具体方法
// new Animal() // 报错：抽象类无法实例化
```

> 💬 **面试官**：抽象类和接口应该怎么选择？
>
> ✅ **标准答案**：抽象类是"基类"，可以包含具体实现，适合一组有共性实现逻辑的类；接口是"契约"，只描述形状，不提供实现，适合跨越不相关类之间的公共行为约定。一个类只能继承一个抽象类，但可以实现多个接口。
>
> 🎁 **加分答案**：医疗系统场景举例：`BaseRepository` 可以是抽象类，包含 `findById` 等公共数据库操作的具体实现；`IExportable`（可导出为 PDF/Excel）可以是接口，由药品、处方、报告等不相关类各自实现。接口更灵活，抽象类更适合"is-a"关系。

### 接口的全能力

接口是 TypeScript 里描述"形状"的核心工具：

```typescript
interface IVegetables {
  readonly color: string  // 只读，不能修改
  size: string
  age?: number            // ? 表示可选属性
  taste: 'sour' | 'sweet'
}

// 多个同名 interface 会自动合并（声明合并）
interface IVegetables {
  origin?: string
}

const tomato: IVegetables = {
  color: 'red',
  size: '10',
  taste: 'sour'
}
// tomato.color = 'green' // 报错：只读属性
```

以药品详情为例，设计一个真实接口：

```typescript
interface IDrugDetail {
  readonly drugId: string          // 药品 ID，只读
  name: string                     // 药品名称
  genericName: string              // 通用名
  manufacturer: string             // 生产厂商
  spec: string                     // 规格
  price: number                    // 售价
  prescription: boolean            // 是否处方药
  interactions?: string[]          // 可选：药物相互作用
  contraindications?: string       // 可选：禁忌症
}
```

**接口继承**让你组合已有接口：

```typescript
interface ISpeakable {
  speak(): void
}
interface ISpeakChinese extends ISpeakable {
  speakChinese(): void
}
class Speak implements ISpeakChinese {
  speakChinese(): void { console.log('你好') }
  speak(): void { console.log('hello') }
}
```

### type vs interface：5 个关键区别

这是面试高频考点，要说清楚：

**1. 描述联合类型，只能用 `type`**

```typescript
type ID = string | number  // interface 做不到
type Status = 'active' | 'inactive' | 'pending'
```

**2. 声明合并，只有 `interface` 支持**

```typescript
interface IConfig { host: string }
interface IConfig { port: number }
// 自动合并为 { host: string; port: number }

type TConfig = { host: string }
type TConfig = { port: number } // 报错：重复标识符
```

**3. `interface` 可以被 `extends` 和 `implements`**

```typescript
interface IAnimal { name: string }
interface IDog extends IAnimal { breed: string }

// type 不支持被 extends（但可以用交叉类型模拟）
type TAnimal = { name: string }
type TDog = TAnimal & { breed: string }
```

**4. `type` 支持条件类型和映射类型，`interface` 不行**

```typescript
type Nullable<T> = T | null            // 条件类型
type Readonly<T> = { readonly [K in keyof T]: T[K] }  // 映射类型
```

**5. 适用场景总结**

| 场景 | 选择 |
|------|------|
| 描述对象形状 | 优先 `interface` |
| 联合类型、元组类型 | 必须 `type` |
| 需要声明合并（如扩展第三方类型） | 必须 `interface` |
| 复杂的类型运算（条件/映射） | 必须 `type` |
| 函数类型 | 惯例用 `type` |

> 💬 **面试官**：`type` 和 `interface` 如何选择？能互换的时候用哪个？
>
> ✅ **标准答案**：描述对象/类接口时优先用 `interface`，因为它支持声明合并（对第三方库扩展很重要）且报错信息更友好；联合类型、元组、复杂类型计算必须用 `type`。能互换时，社区惯例是 `interface`。
>
> 🎁 **加分答案**：声明合并是 `interface` 的独特能力，用来扩展第三方库的类型时不可替代。比如给 `Express.Request` 加自定义属性、扩展 `Window` 对象，都要用 `interface` 的声明合并。用 `type` 就只能创建新类型，无法追加到已有类型上。

### 泛型：让类型成为参数

泛型是"延迟决定类型"的工具——定义时不指定，使用时才传入：

```typescript
// 单个泛型参数
const getArray = <T>(times: number, val: T): T[] => {
  let result: T[] = []
  for (let i = 0; i < times; i++) {
    result.push(val)
  }
  return result
}
getArray<number>(3, 3)    // [3, 3, 3]
getArray<string>(3, 'ts') // ['ts', 'ts', 'ts']

// 多个泛型参数
function swap<T, K>(tuple: [T, K]): [K, T] {
  return [tuple[1], tuple[0]]
}
```

封装通用 API 响应类型——这是医疗系统里最高频的泛型用法：

```typescript
interface IResponse<T> {
  code: number
  data: T
  message: string
}

interface IDrugDetail {
  drugId: string
  name: string
  price: number
}

// 获取药品详情：IResponse<IDrugDetail>
function getDrugDetail(): IResponse<IDrugDetail> {
  return {
    code: 200,
    data: { drugId: 'DR001', name: '阿莫西林', price: 12.5 },
    message: 'success'
  }
}

// 获取药品列表：IResponse<IDrugDetail[]>
function getDrugList(): IResponse<IDrugDetail[]> {
  return {
    code: 200,
    data: [
      { drugId: 'DR001', name: '阿莫西林', price: 12.5 },
      { drugId: 'DR002', name: '布洛芬', price: 8.0 }
    ],
    message: 'success'
  }
}
```

**泛型约束**用 `extends` 限制泛型的范围：

```typescript
interface IWithLength {
  length: number
}
// T 必须有 length 属性
function getLen<T extends IWithLength>(val: T): number {
  return val.length
}
getLen('hello') // 5
getLen([1, 2, 3]) // 3

// 取对象中指定 key 的值，K 必须是 T 的 key
const getVal = <T, K extends keyof T>(obj: T, key: K): T[K] => {
  return obj[key]
}
const drug = { name: '阿莫西林', price: 12.5 }
getVal(drug, 'name')  // string
// getVal(drug, 'xxx') // 报错
```

**默认泛型**在不传类型参数时使用默认值：

```typescript
interface T2<T = string> {
  name: T
}
type T22 = T2          // 等价于 T2<string>
let n: T22 = { name: 'ts' }
```

**泛型类**在创建实例时传入类型：

```typescript
class MyArray<T> {
  arr: T[] = []
  add(item: T) { this.arr.push(item) }
  getMax(): T {
    return this.arr.reduce((max, cur) => cur > max ? cur : max)
  }
}

let myArr = new MyArray<number>()
myArr.add(3)
myArr.add(1)
myArr.add(2)
console.log(myArr.getMax()) // 3
```

> 💬 **面试官**：泛型约束 `extends` 和类继承 `extends` 有什么区别？
>
> ✅ **标准答案**：类继承的 `extends` 是运行时的"is-a"关系，`Dog extends Animal` 建立了原型链，运行时真实存在。泛型约束的 `extends` 是编译时的类型范围限制，`<T extends IWithLength>` 只是说"T 的结构必须包含 `length: number`"，运行时完全消失，不存在任何继承关系。
>
> 🎁 **加分答案**：泛型 `extends` 还有条件类型的用法：`T extends string ? 'string' : 'other'`，在第三篇会深入讲。本质上，泛型约束的 `extends` 是"子集/结构兼容"语义，类继承的 `extends` 是"原型链/运行时关系"语义，两者恰好共用了同一个关键字。

---

## 💡 一张图总结（面试速记）

| 知识点 | 一句话解释 | 面试频率 |
|--------|-----------|---------|
| 强类型 vs 弱类型 | 是否允许隐式类型转换 | ⭐⭐ |
| 结构类型 vs 标称类型 | TS 看形状，Java 看名字 | ⭐⭐⭐ |
| `any` vs `unknown` | `unknown` 是类型安全的 `any`，用前须收窄 | ⭐⭐⭐⭐⭐ |
| `never` 穷尽性检查 | switch 覆盖所有 case，漏了就报错 | ⭐⭐⭐ |
| 枚举反举原理 | 双向赋值 IIFE，`enum[enum[X]=0]="X"` | ⭐⭐⭐ |
| 字面量类型 | 用具体值当类型，限定合法取值 | ⭐⭐⭐ |
| 函数重载 | 多个签名 + 一个实现，编译后只剩实现 | ⭐⭐⭐⭐ |
| `public/protected/private` | 公开/子类/自身 — 3 层访问控制 | ⭐⭐⭐ |
| 抽象类 vs 接口 | 有实现用抽象类，纯约定用接口 | ⭐⭐⭐⭐ |
| `type` vs `interface` | 声明合并用 `interface`，联合/计算用 `type` | ⭐⭐⭐⭐⭐ |
| 泛型约束 `extends` | 限制 T 的形状，编译时语义，非运行时继承 | ⭐⭐⭐⭐ |
| `IResponse<T>` 模式 | 通用 API 响应封装，高频实战场景 | ⭐⭐⭐⭐ |

---

## 📝 留个问题

下面这段代码，`type` 和 `interface` 各有一处用错了场景，你能找出来并说明原因吗？

```typescript
// 场景 1
type IUser = {
  name: string
  age: number
}
type IUser = {
  email: string
}

// 场景 2
interface UserId = string | number
```

欢迎在评论区写出你的答案和理由。

---

> 🔖 TypeScript 从入门到精通系列 · 第一篇 — 入门篇
> 下一篇：**TypeScript 进阶篇：类型兼容、守卫与工具类型全解**
