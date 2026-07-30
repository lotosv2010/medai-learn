# TypeScript 高级篇：条件类型、infer 与类型体操实战

> 面过 500 名候选人，真正能把 `infer` 讲清楚的不超过 5%。大多数人停留在「会用工具类型」的层面，却说不清 `ReturnType<T>` 内部怎么推导、分发式条件类型为什么会「炸掉」你的判断逻辑、`UnionToIntersection` 利用了什么物理定律。本篇把这些「讲不清楚」变成「张口就来」。

---

## 🎯 这篇文章解决什么问题

类型系统从「能用」到「玩转」，差的不是熟练度，是对**条件类型分发机制**和 **infer 位置语义**的真正理解。读完本篇，你能手写出 TypeScript 标准库里一半的工具类型，在类型体操面试题前不再发抖。

本文是 **TypeScript 从入门到精通系列** 第三篇，共三篇：
- **第一篇**：类型系统基础 — 基础类型、接口、泛型、类
- **第二篇**：类型进阶 — 兼容性、类型守卫、工具类型全解
- **第三篇（本篇）**：类型高级 — 条件类型、infer、类型体操实战

---

## 🔬 infer 与条件类型深度解析

### infer 是什么

`infer` 出现在 `extends` 条件语句中，语义是：**「在这个位置，帮我推断出类型变量」**。理解它的关键在于——**推导是基于位置的**。你想获取什么位置的类型，就把 `infer R` 写在那个位置。

```typescript
// 最直观的理解：infer 在返回值位置
type ReturnType<T extends (...args: any[]) => any> =
  T extends (...args: any[]) => infer R ? R : never;
// 👈 R 推断自"返回值"位置，所以 R 就是返回值类型
```

**条件类型的基础语法**：`T extends U ? X : Y`，可以想象成三元运算符，若 T 能赋值给 U，取 X，否则取 Y。结合泛型，它就成了类型层的「函数」：

```typescript
// 根据响应码类型区分 message 类型
type ResStatusMessage<T extends number> =
  T extends 200 | 204 | 206 ? 'success' : 'error';
```

### ReturnType / Parameters / ConstructorParameters / InstanceType 手写

四个内置工具类型的实现，全靠 `infer` 的位置，记住口诀：**想要什么，就在哪里放 infer**。

```typescript
// 推断函数返回值类型
type ReturnType<T extends (...args: any[]) => any> =
  T extends (...args: any[]) => infer R ? R : never;

// 推断函数参数类型（结果是元组）
type Parameters<T extends (...args: any[]) => any> =
  T extends (...args: infer R) => any ? R : never;
```

```typescript
// 推断构造函数参数类型
type ConstructorParameters<T extends new (...args: any[]) => any> =
  T extends { new(...args: infer R): any } ? R : never;

// 推断构造函数实例类型（infer 在 new 签名返回值位置）
type InstanceType<T extends new (...args: any[]) => any> =
  T extends new (...args: any) => infer R ? R : any;
```

**医疗场景实战**：在 1 药网的药品查询服务里，用 `ReturnType` 自动提取接口响应类型，告别手写冗余接口：

```typescript
// 药品详情接口函数（只需定义一次）
function getDrugDetail(id: string) {
  return fetch(`/api/drug/${id}`).then(r => r.json()) as Promise<{
    id: string;
    name: string;
    dosage: string;
    contraindications: string[];
  }>;
}
```

```typescript
// 用 ReturnType + Awaited 自动提取异步返回类型，无需手写接口
type DrugDetail = Awaited<ReturnType<typeof getDrugDetail>>;
// 等效于 { id: string; name: string; dosage: string; contraindications: string[] }

// 之后所有使用药品详情的地方统一引用 DrugDetail，改接口只改一处
const displayDrug = (drug: DrugDetail) => { /* ... */ };
```

> 💬 **面试官**：`infer` 可以出现在哪些位置，举 3 个应用场景？
>
> ✅ **标准答案**：`infer` 只能出现在 `extends` 条件类型的**右侧**（被检测部分），位置即语义。三个典型场景：① 函数返回值位置（`ReturnType`）；② 函数参数位置（`Parameters`）；③ 模板字符串位置（`GetFirstName<T>`，提取字符串某一片段的类型）。
>
> 🎁 **加分答案**：还可以在构造函数签名（`ConstructorParameters`）、数组元素（`ElementOf<T>`）、递归深层 Promise（`PromiseReturnValue<T>`）等位置使用。本质都是「在特定位置放一个占位符，让 TS 自动推断填入」。

---

### infer 实践三连

**两数交换 Swap**：利用元组解构位置的 infer：

```typescript
type Swap<T> = T extends [infer A, infer B] ? [B, A] : never;
type R8 = Swap<[string, number]>; // [number, string]
```

**头尾交换 First**：利用剩余扩展操作符 `...infer M`：

```typescript
type First<T extends any[]> = T extends [infer F, ...infer M, infer L]
  ? [L, ...M, F]
  : never;
type R9 = First<[1, 2, 3, 4, 5]>; // [5, 2, 3, 4, 1]
```

**递归推导 PromiseReturnValue**：不管 Promise 嵌套几层，递归剥开：

```typescript
type PromiseReturnValue<T> =
  T extends Promise<infer P> ? PromiseReturnValue<P> : T;

// 三层 Promise 全被剥掉，直接得到 100
type R10 = PromiseReturnValue<Promise<Promise<Promise<100>>>>; // 100 👈 注意这里
```

还有一个将两个函数的参数转化为交叉类型的场景——这其实是 `UnionToIntersection` 的简化原型，后面类型体操部分会展开：

```typescript
type T1 = { name: string }
type T2 = { age: number }
type ToIntersection<T> = T extends [(x: infer U) => any, (x: infer U) => any]
  ? U
  : never;
type T3 = ToIntersection<[(x: T1) => any, (x: T2) => any]>; // T1 & T2
// 👈 参数位置逆变：要把 T1、T2 赋给 x，x 必须是 T1 & T2
```

> 💬 **面试官**：手写 `ReturnType<T>` 的实现？
>
> ✅ **标准答案**：`type ReturnType<T extends (...args: any[]) => any> = T extends (...args: any[]) => infer R ? R : never;`。先用泛型约束保证 T 是函数类型，再在返回值位置用 `infer R` 推断，条件成立时返回 `R`，否则 `never`。
>
> 🎁 **加分答案**：泛型约束（`T extends ...` 在尖括号里）是限制传入类型；条件判断（`T extends ...` 在类型体里）是逻辑分支——两处 `extends` 语义完全不同。前者是「类型门卫」，后者是「类型运算」，面试时能说清这点加分很多。

---

### 分发式条件类型：最容易踩坑的特性

**什么是 naked type（裸类型参数）**

当泛型参数 `T` 在条件类型中**完全裸露**（没有被 `[]`、`&` 等结构包裹），传入联合类型时会**自动分发**：

```typescript
// naked type：T 是完全裸露的
type Condition<T> = T extends Fish ? Water : Sky;

type R3 = Condition<Fish | Bird>;
// 等效于：(Fish extends Fish ? Water : Sky) | (Bird extends Fish ? Water : Sky)
// 结果：Water | Sky  👈 分别判断，再合并
```

**分发的 4 条规则**

1. 泛型参数 T 必须是完全裸露的（naked type parameter）
2. 联合类型中的每一项单独与条件比较
3. 判断结果再合并为联合类型
4. `never` 会被自动过滤（`X | never = X`）

**分发导致误判的典型场景**

```typescript
type Condition<T, U> = T extends U ? true : false;
type R2 = Condition<1 | 2, 1>;
// 分发后：(1 extends 1 ? true : false) | (2 extends 1 ? true : false)
// 结果：true | false = boolean  👈 不是期望的 false，结果不准确！
```

**如何关闭分发**：两种方案——用元组包裹，或用 `& {}` 干扰裸露性：

```typescript
// 方案一：元组包裹，最常用、最直观
type Condition4<T, U> = [T] extends [U] ? true : false;
type R6 = Condition4<1 | 2, 1>; // false  ✅ 正确

// 方案二：T & {} 破坏裸露性
type NoDistribute<T> = T & {};
type Condition3<T, U> = NoDistribute<T> extends U ? true : false;
type R5 = Condition3<1 | 2, 1>; // false  ✅ 正确
```

**特殊情况：never 的判断**

```typescript
type isNever<T> = T extends never ? true : false;
type R7 = isNever<never>; // never，而不是 true！
// 原因：never 是空联合类型，分发后无项可处理，直接返回 never
// 解决：type isNever<T> = [T] extends [never] ? true : false;
```

> 💬 **面试官**：分发式条件类型的触发条件是什么？如何关闭分发？
>
> ✅ **标准答案**：触发条件是泛型参数必须是 naked type（完全裸露），传入联合类型时自动触发，联合中每项单独判断后再合并。关闭方式：用 `[T] extends [U]` 把类型包进元组，或用 `T & {}` 破坏裸露性。
>
> 🎁 **加分答案**：`never` 是空联合类型，naked type 分发遇到 `never` 会直接返回 `never` 而非 `true/false`——这是另一个高频陷阱。`[T] extends [never]` 才能正确判断 never。

### Exclude / Extract 的实现原理

利用「never 被自动过滤」的分发特性，实现非常优雅：

```typescript
// 从 T 中排除可分配给 U 的类型（留下 T 里 U 没有的部分）
type Exclude<T, U> = T extends U ? never : T;
// Exclude<'a'|'b'|'c', 'a'|'c'> → 'b'

// 从 T 中提取可分配给 U 的类型（留下 T 里 U 也有的部分）
type Extract<T, U> = T extends U ? T : never;
// Extract<'1'|'2'|'3', '1'|'2'> → '1' | '2'
```

---

## ✏️ 模板字符串类型：类型层的字符串处理

TypeScript 4.1 引入模板字符串类型，让你能在**类型层**拼接、拆解字符串字面量。这是 CSS 属性批量生成、API 路径约束、事件名映射的利器。

### 基础：拼接与分发

```typescript
// 字符串字面量拼接
type Name = 'ts';
type Age = 18;
type Person = `${Name} is ${Age}`; // 'ts is 18'

// 配合联合类型自动分发，批量生成字面量
type Direction = 'top' | 'bottom' | 'left' | 'right';
type AllMargin  = `margin-${Direction}`;   // 4 个字面量联合
type AllPadding = `padding-${Direction}`;  // 4 个字面量联合
```

### 4 个内置字符串变形工具

| 工具类型 | 效果 | 示例 |
|---------|------|------|
| `Uppercase<S>` | 全大写 | `'hello'` → `'HELLO'` |
| `Lowercase<S>` | 全小写 | `'HELLO'` → `'hello'` |
| `Capitalize<S>` | 首字母大写 | `'hello'` → `'Hello'` |
| `Uncapitalize<S>` | 首字母小写 | `'Hello'` → `'hello'` |

实战：自动为对象属性生成 getter 方法名：

```typescript
type WithGetter<T> = {
  [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K]
}
// Circle.area → getArea，Circle.perimeter → getPerimeter
```

### 对象属性重命名

映射类型的 `as` 子句配合模板字符串，可以批量重命名属性：

```typescript
type Animal = { name: string; age: number; height: number; }
type Rename<T> = {
  [K in keyof T as `r_${K & string}`]: T[K]
}
type RenameAnimal = Rename<Animal>;
// { r_name: string; r_age: number; r_height: number }
```

### infer + 模板字符串：类型层的模式匹配

把 `infer` 嵌入模板字符串，就能在类型层做「正则匹配」：

```typescript
// 从 "zhang san" 提取姓氏
type GetFirstName<T> = T extends `${infer F} ${infer L}` ? F : never;
type FirstName = GetFirstName<'zhang san'>; // "zhang"
```

> 💬 **面试官**：模板字符串类型能做什么，举 2 个实际应用？
>
> ✅ **标准答案**：① 批量生成字面量联合类型（CSS 属性、事件名等），结合联合类型分发，一行代码生成多种方向/变体的类型组合；② 结合 `infer` 做字符串模式匹配，像正则一样提取字符串中某一段的类型，如 `GetFirstName<T>`。
>
> 🎁 **加分答案**：还可以配合映射类型中的 `as` 子句批量重命名属性（`as \`on${Capitalize<K>}\``），这正是 Vue 3 组件事件类型 `onXxx` 的实现原理。结合 `CamelToKebab` 递归类型，还能做任意字符串格式转换。

---

## ⚙️ 工程化：装饰器、类型声明与 tsconfig 精讲

### 装饰器执行顺序：高频面试考点

以下代码的输出顺序是面试必考：

```typescript
@Class1Decorator()
@Class2Decorator()
class Person {
  @PropertyDecorator('name') name: string = 'test';
  @PropertyDecorator('age')  age: number = 10;
  @MethodDecorator()
  greet(@Param1Decorator() p1: string, @Param2Decorator() p2: string) {}
}
```

输出：`name属性装饰器` → `age属性装饰器` → `参数2装饰器` → `参数1装饰器` → `方法装饰器` → `类2装饰器` → `类1装饰器`

**规律总结（记住这三条）**：
- 属性装饰器：从上到下执行
- 方法内：参数装饰器先（从右到左），再方法装饰器
- 类装饰器：最后执行，多个时从下到上（靠近类的先执行）

> 💬 **面试官**：装饰器的执行顺序规律是什么？
>
> ✅ **标准答案**：属性装饰器从上到下；方法内参数装饰器先（从右到左）再方法装饰器；类装饰器最后执行，多个类装饰器从下到上（内到外）。总结一句话：从内往外，先内后外。
>
> 🎁 **加分答案**：这个顺序的本质是 JavaScript 装饰器提案的求值规则——工厂函数从外到内求值，但装饰器函数本身从内到外调用，类似洋葱模型。NestJS 的守卫、拦截器、管道执行顺序也遵循同样的原则。

### reflect-metadata + IoC 容器 + 依赖注入（NestJS 基础）

**第一步：控制正转 → 控制反转（IoC）**

```typescript
// 控制正转：Computer 自己 new 依赖，耦合严重
class Computer {
  public monitor = new Monitor27inch(); // 👈 硬编码，想换就改代码
  public host   = new AppleHost();
}
```

控制反转后，依赖的创建交给容器：

```typescript
class Container {
  private _map = new Map<string, any>();
  public _properties = new Map<string, any>();

  bind<T>(key: string, creator: () => T) {
    if (!this._map.has(key)) this._map.set(key, creator());
  }
  resolve<T>(key: string): T {
    const instance = this._map.get(key);
    this._properties.forEach((value, propKey) => {
      const [className, propertyKey] = propKey.split('-');
      if (className === instance.constructor.name)
        instance[propertyKey] = this.resolve(value);
    });
    return instance;
  }
}
```

**第二步：用 `@Provide` / `@Inject` 装饰器自动注册和注入**

```typescript
const container = new Container();

function Provide(key: string) {
  return function(target: any) {
    container.bind(key, () => new target()); // 自动注册到容器
  };
}
function Inject(key: string) {
  return function(target: any, propertyKey: string) {
    // 记录"某类的某属性"应注入哪个 key
    container._properties.set(`${target.constructor.name}-${propertyKey}`, key);
  };
}
```

**第三步：医疗系统中的路由 Controller 装饰器（NestJS 风格）**

借助 `reflect-metadata`，把路由信息存储在函数的元数据中，再统一读取：

```typescript
import 'reflect-metadata';

function Controller(prefix: string = '') {
  return function(target: any) {
    Reflect.defineMetadata('prefix', `/${prefix}`, target);
  };
}
function Get(path: string) {
  return function(target: any, key: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata('method', 'get', descriptor.value);
    Reflect.defineMetadata('route', `/${path}`, descriptor.value);
  };
}
```

```typescript
// 药品查询控制器，路由信息通过装饰器自动收集
@Controller('drug')
class DrugController {
  @Get('list')      getDrugList()    { /* 获取药品列表 */ }
  @Get('detail')    getDrugDetail()  { /* 获取药品详情 */ }
  @Get('interact')  checkInteract()  { /* 药物相互作用检查 */ }
}
// createRoutes(new DrugController()) 可自动扫描并注册所有路由
// 这正是 NestJS 在医疗系统后端中的核心原理
```

### 类型声明文件 `.d.ts`：declare module 与 declare global

`declare` 关键字在编译时用于类型检查，编译结果中会被删除。常用场景：

```typescript
// 为无类型声明的 npm 包补充类型
declare module "mitt" {
  type EventType = string | symbol;
  type EventHandler = (payload?: any) => void;
  const on:  (type: EventType, handler: EventHandler) => void;
  const emit: (type: EventType, payload?: any) => void;
  const off:  (type: EventType, handler: EventHandler) => void;
}
```

```typescript
// 在模块文件中扩展全局类型，必须用 declare global
// types/global/index.d.ts
declare global {
  interface String { double(): string; }  // 扩展 String 原型
  interface Window { myname: string; }     // 扩展 window 对象
}
export {}; // 👈 有 export 才是模块，才需要 declare global
```

不加 `export {}` 的文件是全局脚本，可直接 `interface String { ... }` 扩展，无需 `declare global`。

> 💬 **面试官**：什么是 `declare global`，什么时候需要？
>
> ✅ **标准答案**：`declare global` 用于在**模块文件**（含有 import/export 的文件）中扩展全局类型。模块有自己的作用域，直接写 `interface Window` 不会影响全局，必须用 `declare global { }` 显式声明。
>
> 🎁 **加分答案**：纯脚本文件（无 import/export）天然处于全局作用域，可直接接口合并。实际项目中在 lib 或 utils 里扩展全局，加 `export {}` + `declare global` 是最安全的写法，能避免「该模块被当作脚本文件意外污染全局」的问题。

### tsconfig.json：strict 打开的 8 个子选项

`"strict": true` 等价于同时开启以下 8 项：

| 子选项 | 作用 |
|--------|------|
| `noImplicitAny` | 禁止隐式 any 类型 |
| `strictNullChecks` | null/undefined 不能赋给其他类型 |
| `strictFunctionTypes` | 严格函数参数逆变检查 |
| `strictBindCallApply` | bind/call/apply 参数类型检查 |
| `strictPropertyInitialization` | 类属性必须在构造函数中初始化 |
| `noImplicitThis` | this 不能隐式是 any |
| `useUnknownInCatchVariables` | catch 变量类型是 unknown 而非 any |
| `alwaysStrict` | 编译结果保持 `"use strict"` 严格模式 |

**moduleResolution 的选择**：现代项目有三种常用策略：

```json
// Node.js 项目（CommonJS / ESM）
{ "moduleResolution": "node10" }

// Vite / webpack 等打包工具项目（推荐）
{ "moduleResolution": "bundler" }

// 传统项目兼容性最好
{ "moduleResolution": "classic" }
```

> 💬 **面试官**：`strict: true` 打开了哪 8 个选项？
>
> ✅ **标准答案**：noImplicitAny、strictNullChecks、strictFunctionTypes、strictBindCallApply、strictPropertyInitialization、noImplicitThis、useUnknownInCatchVariables、alwaysStrict。日常编码中影响最大的是 `strictNullChecks` 和 `noImplicitAny`。
>
> 🎁 **加分答案**：`strict: true` 之外还有几个推荐额外开启的选项：`noUnusedLocals`（未使用变量报错）、`noUnusedParameters`（未使用参数报错）、`exactOptionalPropertyTypes`（可选属性不能显式赋 undefined）——这些 strict 不包含，但对代码质量同样重要。

---

## 🏆 类型体操实战精选

类型体操的核心武器就几件：**递归 + infer 模式匹配 + 分发 + 逆变**。下面 6 道题难度递进，覆盖所有高频手法。每道题都给出解题思路，而不只是代码。

### 1. UnionToIntersection：联合转交叉

这是最经典的**逆变应用**题，手写它意味着你真正理解了函数参数的逆变特性。

```typescript
type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never  // 👈 第一步：分发，把联合变成函数联合
) extends (k: infer I) => void             // 👈 第二步：infer 在参数位置（逆变）
  ? I
  : never;
```

**解题思路**：

- 第一步：利用分发，把 `{a:string} | {b:string}` 变成 `((k: {a:string}) => void) | ((k: {b:string}) => void)`
- 第二步：`infer I` 在函数参数位置——参数位置是**逆变**的，推断多个函数联合的公共参数类型，结果是**交叉类型**

```typescript
type R = UnionToIntersection<{a: string} | {b: string} | {c: string}>;
// 结果：{a: string} & {b: string} & {c: string}
```

> 💬 **面试官**：手写 `UnionToIntersection<T>`，它利用了什么原理？
>
> ✅ **标准答案**：利用两个原理：① 分发式条件类型把联合类型的每一项转成函数参数类型；② 函数参数位置的**逆变**特性，TypeScript 推断多个函数联合类型的参数时取交叉类型作为公共参数，`infer I` 在参数位置所以 I 是交叉类型。
>
> 🎁 **加分答案**：这是 TypeScript 类型系统级逆变的直接应用。协变（返回值位置）合并是联合，逆变（参数位置）合并是交叉——这是函数里氏替换原则在类型层的体现。

### 2. UnionToTuple：联合转元组

核心思路：先用逆变「提取」联合中的某一个元素，再递归构建元组。

`Transform<T>` 辅助类型的作用是提取联合类型中「最后」确定的那个类型成员：

```typescript
type Transform<T> = boolean extends T ? boolean : (
  T extends any ? (a: (P: T) => any) => any : never
) extends (a: infer P) => any
  ? P extends (a: infer R) => any ? R : never
  : never;
```

然后递归地「剥洋葱」：

```typescript
// 递归剥洋葱：每次用 Exclude 去掉已提取的，直到 T 是 never
type UnionToTuple<T, A = Transform<T>> = [T] extends [never]
  ? []
  : [...UnionToTuple<Exclude<T, A>>, A]; // 👈 注意这里：尾递归构建

type T1 = UnionToTuple<1 | 2 | 3>;         // [1, 2, 3]
type T2 = UnionToTuple<'a' | 'b' | 'c'>;   // ['a', 'b', 'c']
```

**解题思路**：`[T] extends [never]` 用元组包裹判断终止条件（关闭分发）；`Exclude<T, A>` 每次从联合中去掉一个已提取的类型，直到联合变空。

### 3. ObjectAccessPaths：对象属性路径类型

**医疗系统 i18n 场景**：用类型约束 i18n 路径，防止传入不存在的翻译 key：

```typescript
// 递归遍历对象，拼接属性路径
type ObjectAccessPaths<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? `${K}${T[K] extends object ? `.${ObjectAccessPaths<T[K]>}` : ""}`
        : never;
    }[keyof T]
  : never;
```

配合 `createI18n` 工厂函数：

```typescript
function createI18n<Schema>(schema: Schema) {
  return (path: ObjectAccessPaths<Schema>) => {};
}
```

在医疗多语言系统中的实际用法：

```typescript
const i18n = createI18n({
  drug: {
    detail: { name: '药品名称', dosage: '用量' },
    list:   { title: '药品列表', empty: '暂无数据' },
  },
  patient: { name: '患者姓名', age: '年龄' },
});

i18n("drug.detail.name");   // ✅ 合法
i18n("drug.list.title");    // ✅ 合法
// i18n("drug.xxx.name");   // ❌ 类型错误，路径不存在——编译期发现
```

**解题思路**：递归遍历对象，若当前值是 object，继续拼接 `.子路径`（内层递归），否则直接返回当前键。用 `[keyof T]` 把映射类型的值转成联合类型。

### 4. CamelToKebab：驼峰转横杠

模板字符串递归处理大写字母，**每次只拆一个字符**是核心手法：

```typescript
type CamelToKebab<T extends string> = T extends `${infer L}${infer R}`
  ? `${Lowercase<L>}${
      R extends Uncapitalize<R>
        ? ''          // 下一个字母是小写，不加横杠
        : '-'         // 下一个字母是大写，加横杠
    }${CamelToKebab<Uncapitalize<R>>}`
  : T;

type K1 = CamelToKebab<'HelloWorld'>;       // "hello-world"
type K2 = CamelToKebab<'backgroundColor'>; // "background-color"
```

**解题思路**：`R extends Uncapitalize<R>` 判断剩余字符串的首字母是否是小写（如果相等说明首字母已是小写，不需要加 `-`）；`Uncapitalize<R>` 处理后再递归，避免 `R` 的大写首字母被重复处理。

### 5. StringLength：递归计算字符串长度

类型层没有直接「数数」的操作，但可以用**元组的 length 属性**间接计数——这是 TS 类型体操中通用的计数模式：

```typescript
// 每匹配一个字符，往辅助元组里塞一个元素；匹配完后读 length
type StringLength<
  T extends string,
  A extends any[] = []  // 👈 计数器：用元组长度来表示数字
> = T extends `${infer L}${infer R}`
  ? StringLength<R, [L, ...A]>  // 拆掉首字符，元组加一项
  : A["length"];                // 所有字符处理完，元组长度就是字符串长度

type L1 = StringLength<"hello">;    // 5
type L2 = StringLength<"abc123">;   // 6
type L3 = StringLength<"">;         // 0
```

**通用技巧**：凡是类型层需要「计数」的地方，都用 `F extends any[] = []` + `F["length"]` 的辅助元组模式，包括 `Repeat<T, N>`、`Slice<T, S, E>` 等。

### 6. Flat：数组拍平类型

递归展开嵌套数组，判断当前元素是否还是数组：

```typescript
type Flat<T extends any[]> = T extends [infer L, ...infer R]
  ? L extends any[]
    ? [...Flat<L>, ...Flat<R>]  // L 是数组，先拍平 L，再拍平 R
    : [L, ...Flat<R>]           // L 是普通值，保留，继续处理 R
  : [];

type F1 = Flat<[1, [2, 3, 4]]>;              // [1, 2, 3, 4]
type F2 = Flat<[1, [2, [3, [4, [5]]]]]>;     // [1, 2, 3, 4, 5]
```

**解题思路**：对 T 解构为 `[infer L, ...infer R]`，L 是头，R 是尾。再对 L 做条件判断，是数组就递归展开，不是就直接保留。最终递归到空数组时返回 `[]`。

---

## 💡 一张图总结（面试速记）

| 知识点 | 一句话解释 | 面试频率 |
|--------|-----------|---------|
| `infer` | 在 extends 条件右侧「占位推断」 | ⭐⭐⭐⭐⭐ |
| 分发式条件类型 | naked type + 联合类型 = 自动分发 | ⭐⭐⭐⭐⭐ |
| 关闭分发 | `[T] extends [U]` 或 `T & {}` | ⭐⭐⭐⭐ |
| 模板字符串类型 | 类型层做字符串拼接 + infer 模式匹配 | ⭐⭐⭐⭐ |
| 装饰器顺序 | 属性→参数→方法→类，类从下到上 | ⭐⭐⭐ |
| `declare global` | 模块文件中扩展全局类型的唯一方式 | ⭐⭐⭐ |
| `strict` 8 子选项 | 背下来，每个说一句就够 | ⭐⭐⭐⭐ |
| `UnionToIntersection` | 逆变：参数位置的 infer = 联合→交叉 | ⭐⭐⭐⭐⭐ |
| `ObjectAccessPaths` | 递归对象 + 模板字符串拼路径 | ⭐⭐⭐ |
| 元组计数器模式 | `A extends any[] = []` + `A["length"]` | ⭐⭐⭐⭐ |

---

## 📝 留个问题

用今天学的递归 + infer 思路，试着实现这个类型：

```typescript
// 把对象的所有属性变成深度只读且可选
type DeepReadonlyPartial<T> = // 你来填
```

进阶版：要求递归处理嵌套对象，数组内的对象也要处理。写出来发评论区，我来逐一 review。

---

> 🔖 TypeScript 从入门到精通系列 · 第三篇 — 高级篇
> 上一篇：**TypeScript 进阶篇** | 回顾系列：**TypeScript 入门篇**
