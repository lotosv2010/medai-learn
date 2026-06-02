# 协变与逆变（Covariance & Contravariance）

> 记录时间：2026-06-02
> 关联模块：函数类型设计、组件 props 类型、回调函数类型
> 重要程度：⭐⭐
> 前置知识：[[constraints]]（泛型约束）、[[type-guards]]（类型守卫）

## 一句话总结（面试 30 秒版）

协变与逆变描述的是**泛型类型之间的子类型关系如何随类型参数变化**——函数的返回类型是协变的（子类型关系同向），参数类型是逆变的（子类型关系反向），这是 TypeScript `strictFunctionTypes` 的理论基础。

## 核心概念

### 先建立直觉

假设 `Dog extends Animal`，那么：

- `Dog` 是 `Animal` 的**子类型**（subtype）
- 能用 `Dog` 的地方，一定能用 `Animal` 吗？**不一定**
- 能用 `Animal` 的地方，一定能用 `Dog` 吗？**不一定**

**协变**（Covariant）：子类型关系**同向传递**。`Dog ⊂ Animal` → `F<Dog> ⊂ F<Animal>`。

**逆变**（Contravariant）：子类型关系**反向传递**。`Dog ⊂ Animal` → `F<Animal> ⊂ F<Dog>`。

### 用「容器」类比理解

| 类型构造器 | 变体方向 | 直觉 |
|-----------|---------|------|
| `Array<T>` | 协变（只读时） | 只**读出** T 的容器，Dog 的桶能当 Animal 的桶用 |
| `(x: T) => void` | 逆变 | 只**写入** T 的容器，能处理 Animal 的函数一定能处理 Dog |
| `(x: T) => T` | 参数逆变 + 返回协变 | 读写都有，两个方向分别看 |
| `Set<T>` | 不变 | 既读又写的容器，Dog 的桶不能当 Animal 的桶 |

### 四种变体总结

| 变体 | 含义 | TypeScript 表现 |
|------|------|----------------|
| **协变（Covariant）** | `A ⊂ B` → `F<A> ⊂ F<B>` | 函数返回类型、`readonly` 数组、Promise |
| **逆变（Contravariant）** | `A ⊂ B` → `F<B> ⊂ F<A>` | 函数参数类型（strictFunctionTypes 开启时） |
| **双变（Bivariant）** | 两个方向都行 | 函数参数类型（strictFunctionTypes 关闭时，TS 默认行为） |
| **不变（Invariance）** | 没有子类型关系 | 可变数组 `T[]`、Map/Set |

## 面试回答框架

### 标准回答（2 分钟版）

> 协变与逆变是描述**泛型类型之间子类型关系如何传递**的概念。
>
> **协变**是同向传递——如果 Dog 是 Animal 的子类型，那么 `() => Dog` 是 `() => Animal` 的子类型。这很直观：需要返回 Animal 的地方，返回 Dog 完全没问题。
>
> **逆变**是反向传递——`(x: Animal) => void` 是 `(x: Dog) => void` 的子类型。这看起来反直觉，但想想：一个能处理所有 Animal 的函数，当然也能处理 Dog。
>
> TypeScript 在 `strictFunctionTypes: true` 时强制函数参数逆变。关闭时是双变的（bivariant），为了兼容 `Array<T>` 等已有类型。
>
> 实际影响：当你写回调函数类型、设计组件 props、或者做函数类型兼容性检查时，理解协变逆变能帮你理解为什么有些类型赋值会报错。

### 常见追问链

1. **追问 1**：「为什么函数参数是逆变而不是协变？」
   - 回答要点：用经典的「猫和动物」例子——假设你有一个 `feed(cat: Cat)` 函数，你把它当成 `feed(animal: Animal)` 用了，调用方可能传入一个 Dog，你的函数只处理 Cat，就出错了。所以参数必须逆变：能处理 Animal 的函数才能安全地当 Cat 的函数用。

2. **追问 2**：「`strictFunctionTypes` 是什么？为什么要这个 flag？」
   - 回答要点：TS 2.6 引入。开启后函数参数严格逆变；关闭时是双变的，为了向后兼容——`Array<T>` 的方法（如 `push(item: T)`）在参数上需要双变才能工作。推荐新项目开启。

3. **追问 3**：「readonly 数组和可变数组在变体上有什么区别？」
   - 回答要点：`readonly Animal[]` 是协变的，因为只能读出，Dog 的数组可以当 Animal 的数组用。`Animal[]` 是不变的，因为既能读又能写——你可能往 Dog 的数组里 push 一个 Cat。

### 加分回答（如果你想让面试官眼前一亮）

> TypeScript 的类型系统基于结构化类型（structural typing），协变逆变的判断在**编译时通过类型关系推导**。编译器内部对每个类型构造器定义了变体方向：
>
> - **函数类型**：参数位置是逆变（contravariant in parameter position），返回位置是协变（covariant in return position）
> - **泛型类/接口**：默认是双变的，除非用 `out` / `in` 关键字显式声明（TS 4.7+）
> - **条件类型**：在 `extends` 子句的位置是逆变的
>
> 这和 Java/C# 的泛型声明式变体（`? extends T` / `? super T`）不同，TS 是隐式推导的。

## 代码演示

### 1. 函数返回类型 — 协变

```ts
class Animal { name = 'animal' }
class Dog extends Animal { bark() {} }

// 返回类型协变：Dog ⊂ Animal → (() => Dog) ⊂ (() => Animal)
const getDog: () => Dog = () => new Dog()
const getAnimal: () => Animal = getDog // ✅ 协变，OK
```

### 2. 函数参数类型 — 逆变

```ts
// 参数逆变：Dog ⊂ Animal → ((x: Animal) => void) ⊂ ((x: Dog) => void)
const feedAnimal: (x: Animal) => void = (x) => console.log(x.name)
const feedDog: (x: Dog) => void = feedAnimal // ✅ 逆变，OK

// 反过来不行
const feedDog2: (x: Dog) => void = (x) => x.bark()
const feedAnimal2: (x: Animal) => void = feedDog2 // ❌ 编译错误（strictFunctionTypes）
```

### 3. readonly 数组 — 协变 vs 可变数组 — 不变

```ts
const dogs: Dog[] = [new Dog()]
const animals: Animal[] = dogs // ✅ TS 允许（历史兼容，实际是不安全的）

// 但 readonly 是真正协变且安全的
const dogsReadonly: readonly Dog[] = [new Dog()]
const animalsReadonly: readonly Animal[] = dogsReadonly // ✅ 安全

// 如果 TS 严格检查可变数组：
animals.push(new Animal()) // 往 dogs 里 push 了一个 Animal，不安全！
```

### 4. 实际场景：回调函数设计

```ts
// ❌ 错误设计：回调参数用具体类型
type OnSelect = (item: Dog) => void

// ✅ 正确设计：理解逆变后，回调参数应足够宽泛
type OnSelect = (item: Animal) => void

// 使用场景
function renderList(items: Dog[], onSelect: OnSelect) {
  items.forEach(item => onSelect(item)) // ✅ Dog 可以传给 Animal 参数
}
```

### 5. 条件类型中的逆变位置

```ts
// 条件类型的 extends 子句是逆变位置
type IsSubtype<T, U> = T extends U ? true : false

type A = IsSubtype<Dog, Animal>   // true
type B = IsSubtype<Animal, Dog>   // false

// 实际应用：类型约束检查
type EnsureArray<T> = T extends any[] ? T : never
```

## 在本项目中的应用

- **组件 props 类型设计**：`packages/ui` 中回调 props（如 `onChange: (value: string) => void`）需要理解参数逆变
- **tRPC 路由类型**：`apps/api` 中 handler 的输入输出类型兼容性依赖协变逆变
- **AI SDK 回调**：`packages/ai-sdk` 中 `onChunk`、`onComplete` 等回调的参数类型设计
- **泛型工具类型**：`packages/shared` 中工具类型的变体行为影响类型兼容性

## 易混淆点

| 概念 A | 概念 B | 关键区别 |
|--------|--------|---------|
| 协变（Covariant） | 逆变（Contravariant） | 协变 = 子类型关系同向；逆变 = 子类型关系反向 |
| `strictFunctionTypes: true` | `strictFunctionTypes: false` | true = 参数严格逆变；false = 参数双变（兼容旧代码） |
| `readonly T[]` | `T[]` | readonly 协变（安全）；可变不变（或双变，不安全） |
| 参数位置逆变 | 返回位置协变 | 参数「吃进去」所以逆变；返回「吐出来」所以协变 |
| 结构化变体 | 声明式变体 | TS 隐式推导；Java/C# 用 `extends/super` 显式声明 |

## 扩展阅读

- [TypeScript Handbook: Variance Annotations](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#variance-annotations) — TS 4.7 `in`/`out` 关键字
- [协变、逆变与 TypeScript](https://jkchao.github.io/typescript-book-chinese/tips/covarianceAndContravariance.html) — 中文深度解析

## 自测

<details>
<summary>题目：解释为什么 `Array<Dog>` 不能安全地赋值给 `Array<Animal>`，但 `readonly Dog[]` 可以赋值给 `readonly Animal[]`。如果要设计一个既可读又可写的集合类型，应该怎么处理变体？</summary>

**答案**：

1. **可变数组不安全**：`Array<Dog>` 赋值给 `Array<Animal>` 后，你可以调用 `animals.push(new Cat())`，往一个实际是 Dog 数组里放入了 Cat，违反了类型安全。

2. **readonly 数组安全**：`readonly Dog[]` 只暴露读操作，你无法往里 push。读出的元素类型是 Dog，而 Dog 是 Animal 的子类型，所以可以安全当作 `readonly Animal[]` 使用。这是**协变**。

3. **既可读又可写的集合**：必须是**不变**（invariant）的。实现方式：
   ```ts
   // 方案 1：分离读写接口
   interface Readable<out T> { get(): T }           // 协变
   interface Writable<in T> { set(value: T): void }  // 逆变
   interface ReadWrite<T> extends Readable<T>, Writable<T> {} // 不变

   // 方案 2：用 in/out 声明（TS 4.7+）
   interface Consumer<in T> { consume(value: T): void }
   interface Producer<out T> { produce(): T }
   ```
</details>
