# new 操作符原理

> 记录时间：2026-05-27
> 关联模块：原型与面向对象系列 — 原型链机制的「启动器」，继承方式的核心工具
> 重要程度：⭐⭐⭐（面试高频，一面手写题 TOP5，必须能 30 秒写出且讲清每步）
> 前置知识：[[prototype-chain]] — 必须理解 `__proto__` / `prototype` 关系，否则 new 的第 2 步无法理解

## 一句话总结（面试 30 秒版）

`new` 做了四件事：创建空对象 → 链接原型 → 绑定 this 执行构造函数 → 根据返回值决定最终对象。**核心价值是把构造函数和原型链串联起来**——没有 new，构造函数就是普通函数，prototype 就是死属性。

## 核心概念

### new 的完整执行流程

```text
const p = new Person('Robin')

引擎内部做了什么：

Step 1: 创建一个全新的空对象 {}
        const obj = {}

Step 2: 将空对象的 [[Prototype]] 指向构造函数的 prototype
        Object.setPrototypeOf(obj, Person.prototype)
        // 等价于 obj.__proto__ = Person.prototype

Step 3: 将构造函数的 this 绑定到这个新对象，并执行构造函数
        const result = Person.call(obj, 'Robin')

Step 4: 判断返回值
        - 如果构造函数返回的是【对象】→ 使用该返回值（丢弃 obj）
        - 如果构造函数返回的是【基本类型或无 return】→ 使用 obj
        return typeof result === 'object' && result !== null ? result : obj
```

类比理解：new 就像「开一家加盟店」——
1. 总部给你一张空白营业执照（空对象）
2. 把品牌授权挂上去（链接原型）
3. 总部派人来装修（执行构造函数，this 指向你的店）
4. 如果总部说「这家店我收回自己管」（返回对象），你就没了；否则这家店是你的

### 为什么需要 new？

```javascript
// 没有 new，构造函数就是普通函数
function Person(name) {
  this.name = name;
}

// 不用 new → this 指向全局对象（严格模式下报错）
const p1 = Person('Robin');
console.log(p1);          // undefined（没有 return）
console.log(window.name); // 'Robin'（污染全局！）

// 用 new → this 指向新创建的对象
const p2 = new Person('Robin');
console.log(p2.name);     // 'Robin'（正确）
console.log(p2.__proto__ === Person.prototype); // true（原型链建立）
```

**new 解决了两个核心问题：**
1. **this 绑定**：让构造函数里的 this 指向新对象，而不是全局
2. **原型链接**：让实例能通过原型链访问构造函数 prototype 上的方法

### 返回值的两种特殊情况

```javascript
// 情况 1：构造函数返回对象 → new 出来的是返回值，不是 obj
function Weird() {
  this.a = 1;
  return { b: 2 };  // 返回一个对象
}
const w = new Weird();
console.log(w);     // { b: 2 }（不是 { a: 1 }！）
console.log(w.a);   // undefined

// 情况 2：构造函数返回基本类型 → 被忽略，仍然返回 obj
function Normal() {
  this.a = 1;
  return 42;  // 返回基本类型
}
const n = new Normal();
console.log(n);     // { a: 1 }（42 被忽略）
console.log(n.a);   // 1
```

**面试追问预判**：为什么返回对象会被采纳，返回基本类型被忽略？

> 因为 ECMA 规范（`[[Construct]]` 内部方法）规定：如果 `[[Construct]]` 的 result 是 Object，使用 result；否则使用新创建的 obj。基本类型不是对象，所以被丢弃。这是语言设计的约定，目的是允许构造函数「控制」创建出来的对象形态。

## 面试回答框架

### 标准回答（2 分钟版）

面试官问「说一下 new 操作符的原理」：

```
第一步：总述（10 秒）
"new 做了四件事：创建空对象、链接原型、执行构造函数绑定 this、
根据返回值决定最终对象。"

第二步：逐步展开（1 分钟）
"具体来说——
1. 创建一个空对象，let obj = {}
2. 把 obj.__proto__ 指向构造函数的 prototype，建立原型链
3. 用 call/apply 把构造函数的 this 绑定到 obj 并执行
4. 如果构造函数返回了对象就用返回值，否则用 obj"

第三步：价值说明（30 秒）
"new 的核心价值是把构造函数和原型链串联起来。
没有 new，构造函数就是普通函数，this 指向全局会污染；
没有原型链接，实例就无法复用 prototype 上的方法。"

第四步：手写代码（20 秒）
"如果要手写实现，就是用 Object.create 链接原型，
然后用 call 绑定 this，最后判断返回值类型。"
```

### 常见追问链

1. **追问 1**：「手写一个 myNew 函数」
   - 回答要点：见下方代码演示，核心是 4 步。注意用 `Object.create` 而不是直接 `__proto__` 赋值。

2. **追问 2**：「如果构造函数 return 了一个函数，new 会怎样？」
   - 回答要点：函数也是对象（`typeof function === 'object'` 为 false，但 `instanceof Object` 为 true）。ECMA 规范只检查 result 是否为 Object 类型，函数满足这个条件，所以会被采纳。
   ```javascript
   function Foo() {
     this.a = 1;
     return function() {};  // 返回函数
   }
   const f = new Foo();
   console.log(f);        // function(){}（不是 {a:1}）
   console.log(f.a);      // undefined
   ```

3. **追问 3**：「ES6 class 能不能不用 new 调用？」
   - 回答要点：不能。ES6 class 内部有 `[[IsClassConstructor]]` 标记，不用 new 调用会直接抛 TypeError。这是 ES6 的设计决策——强制 new 语义，避免忘记 new 导致的全局污染 bug。

4. **追问 4**：「new.target 是什么？」
   - 回答要点：`new.target` 指向被 new 调用的构造函数。普通函数调用时 `new.target` 为 undefined。可以用来实现「必须用 new 调用」的检查：
   ```javascript
   function Person(name) {
     if (!new.target) {
       return new Person(name);  // 自动修正
     }
     this.name = name;
   }
   ```

### 加分回答（让面试官眼前一亮）

1. **ECMA 规范层面**：`new` 触发的是 `[[Construct]]` 内部方法，它和 `[[Call]]`（普通函数调用）是两个不同的内部方法。箭头函数没有 `[[Construct]]`，所以不能被 new。这就是 `() => {}` 报错 `is not a constructor` 的根本原因。

2. **V8 实现层面**：V8 在执行 `new` 时会进入 `Builtins::kJSConstructStub`，内部通过 `Runtime::kNewObject` 分配内存，然后通过 `Runtime::kInitializeObject` 设置原型。V8 会根据构造函数的「反馈向量」（Feedback Vector）优化内联缓存（IC），同一个构造函数多次 new 时会复用同一个 Hidden Class，极大提升性能。

3. **性能考量**：频繁 new 小对象会造成 GC 压力。V8 的 Orinoco GC 对新生代对象使用 Scavenger 算法（Cheney's algorithm），短命对象会被快速回收。但在高频场景（如游戏循环）中，对象池（Object Pool）模式比频繁 new 更高效。

4. **Object.create(null) 的妙用**：如果你想创建一个「纯净」的对象做字典，可以用 `Object.create(null)` 替代 `{}`。这样创建的对象没有原型链，不会有 `toString`、`hasOwnProperty` 等继承方法，避免原型链污染攻击。

## 代码演示

### 手写 new（面试手写版）

```javascript
/**
 * 模拟 new 操作符
 * @param {Function} Constructor - 构造函数
 * @param {...any} args - 传给构造函数的参数
 * @returns {Object} - 新创建的实例
 */
function myNew(Constructor, ...args) {
  // 1. 创建空对象，链接原型
  const obj = Object.create(Constructor.prototype);

  // 2. 执行构造函数，绑定 this
  const result = Constructor.apply(obj, args);

  // 3. 判断返回值
  return result !== null && (typeof result === 'object' || typeof result === 'function')
    ? result
    : obj;
}
```

### 验证手写 new

```javascript
function Person(name, age) {
  this.name = name;
  this.age = age;
}

Person.prototype.sayHi = function () {
  return `Hi, I'm ${this.name}`;
};

// 使用手写 new
const p = myNew(Person, 'Robin', 28);

console.log(p.name);                              // 'Robin'
console.log(p.age);                               // 28
console.log(p.sayHi());                           // "Hi, I'm Robin"
console.log(p.__proto__ === Person.prototype);    // true
console.log(p instanceof Person);                 // true
console.log(p.constructor === Person);            // true
```

### 返回值特殊行为验证

```javascript
// 返回对象 → 被采纳
function A() {
  this.x = 1;
  return { y: 2 };
}
console.log(new A());  // { y: 2 }（x 丢失）

// 返回 null → 被忽略（null 是 object 但规范特殊处理）
function B() {
  this.x = 1;
  return null;
}
console.log(new B());  // { x: 1 }

// 返回 undefined → 被忽略（无 return 默认 undefined）
function C() {
  this.x = 1;
}
console.log(new C());  // { x: 1 }

// 返回函数 → 被采纳（函数是对象）
function D() {
  this.x = 1;
  return function nope() {};
}
console.log(new D());  // [Function: nope]
```

## 在本项目中的应用

### 1. React 类组件实例化

```typescript
// React 内部用 new 创建类组件实例
// 源码：packages/react/src/ReactBaseClasses.js
function constructClassComponent(workInProgress, ctor, props) {
  const instance = new ctor(props);  // ← new 在这里
  // ...
}
```

这就是为什么 ES6 class 组件必须有 constructor 且必须调用 super()——new 触发 `[[Construct]]`，super 负责创建 this。

### 2. 自定义错误类型

```typescript
// packages/shared/errors/AppError.ts
class AppError extends Error {
  constructor(message: string, public code: string) {
    super(message);  // ← new AppError() 时，super 建立了原型链
    this.name = 'AppError';
  }
}

// 使用时
throw new AppError('药品未找到', 'DRUG_NOT_FOUND');
```

### 3. 工厂模式替代 new

```typescript
// 当不想暴露 new 时，用工厂函数
function createDrugService(config: Config): DrugService {
  // 内部可能用 new，但调用方不需要知道
  return new DrugServiceImpl(config);
}
// 好处：可以缓存实例、做依赖注入、隐藏实现细节
```

## 易混淆点

| 概念 A | 概念 B | 关键区别 |
|--------|--------|---------|
| `new Foo()` | `Foo()` | 前者创建新对象并链接原型，后者 this 指向全局（严格模式报错） |
| `new` 返回 obj | `new` 返回构造函数的 return 值 | 只有 return 的是对象时才采纳返回值，基本类型被忽略 |
| 箭头函数不能 new | 普通函数可以 new | 箭头函数没有 `[[Construct]]` 内部方法，也没有自己的 this |
| `Object.create(proto)` | `new Constructor()` | 前者只链接原型不执行构造函数，后者两者都做 |
| `new.target` | `this.constructor` | 前者是 `new` 调用时的构造函数引用，后者是实例的 constructor 属性（可被篡改） |

## 扩展阅读

- [ECMA-262 — [[Construct]]](https://tc39.es/ecma262/#sec-ecmascript-function-objects-construct-argumentslist-newtarget) — 规范原文，2 分钟能读完核心逻辑
- [冴羽 — JavaScript 深入之 new 的模拟实现](https://github.com/mqyqingfeng/Blog/issues/13) — 逐行拆解，面试手写必读

## 自测

**Q：以下代码输出什么？为什么？**

```javascript
function Foo() {
  Foo.a = function() { console.log(1); };
  this.a = function() { console.log(2); };
}

Foo.prototype.a = function() { console.log(3); };

Foo.a = function() { console.log(4); };

const f1 = new Foo();
f1.a();       // ①
Foo.a();      // ②

const f2 = new Foo();
f2.a();       // ③
Foo.a();      // ④
```

<!-- markdownlint-disable MD033 MD040 MD031 MD032 -->

<details>
<summary>点击查看答案</summary>

```text
① 2
② 1
③ 2
④ 1
```

**分析：**

1. `Foo.a = function() { console.log(4); }` — 先给 Foo 加了静态方法 a

2. `new Foo()` 执行构造函数内部：
   - `Foo.a = function() { console.log(1); }` — **覆盖了 Foo 的静态方法 a**（从 4 变成 1）
   - `this.a = function() { console.log(2); }` — 给实例 f1 加了自身属性 a

3. `f1.a()` — 实例自身有 a，输出 2（遮蔽了原型上的 a）

4. `Foo.a()` — 静态方法已被覆盖为输出 1

5. `new Foo()` 第二次执行构造函数：
   - `Foo.a = function() { console.log(1); }` — 覆盖的是同一个函数（没变）
   - `this.a = function() { console.log(2); }` — 给实例 f2 加了自身属性 a

6. `f2.a()` — 实例自身有 a，输出 2

7. `Foo.a()` — 仍然是输出 1

**关键理解：**
- 构造函数体内的代码**每次 new 都会执行**
- `Foo.a` 是给构造函数本身加属性（静态），修改会影响后续所有访问
- `this.a` 是给当前实例加属性，不影响其他实例
- 原型上的 `Foo.prototype.a` 被实例的 `this.a` 完全遮蔽了

</details>

<!-- markdownlint-restore -->
