# 继承的 6 种方式

> 记录时间：2026-05-27
> 关联模块：原型与面向对象 — 原型链机制的延伸，理解 ES6 class extends 的底层
> 重要程度：⭐⭐⭐（阿里 P7+ 面试必问，原型链 → 继承演进 → ES6 class 三连问）
> 前置知识：[[原型链机制]] — 必须理解 `__proto__` / `prototype` / `constructor` 三角关系后才能理解继承

## 一句话总结（面试 30 秒版）

JavaScript 有 6 种继承方式，核心演进路径是逐步解决「引用类型共享」和「向父类传参」两个问题。**寄生组合式继承**是最终最优方案——通过 `Parent.call(this)` 继承实例属性 + `Object.create(Parent.prototype)` 继承原型方法，只调用一次父类构造函数、原型上没有冗余属性。ES6 的 `class extends` 编译后就是寄生组合式。

## 核心概念

JavaScript 不是 Java 那种基于「类」的继承，而是基于**原型链的委托**——子类通过原型链向上查找父类的属性和方法。

6 种方式的演进，本质上是两条线的博弈：

- **属性继承**：想让每个实例有自己的属性副本（独立），但又想让方法共享（复用）
- **传参需求**：子类实例化时能不能给父类传参数

这就像盖房子：
- 原型链继承 = 大家共用一个地基（引用类型炸了）
- 构造函数继承 = 每人自己盖一栋（方法浪费内存）
- 组合继承 = 共用地基 + 自己盖楼（但地基浇了两次混凝土）
- 寄生组合式 = 共用设计图 + 自己盖楼（完美）

下面按演进顺序逐个分析。

### 1. 原型链继承 — 基础形态

```js
function Parent() {
  this.colors = ['red', 'blue'];
}
Parent.prototype.getColors = function () {
  return this.colors;
};

function Child() {}
Child.prototype = new Parent(); // 关键：子类原型指向父类实例
```

**问题**：所有子类实例**共享引用类型属性**。一个实例 push 了 colors，其他实例也会变。

### 2. 构造函数继承 — 解决引用共享

```js
function Child() {
  Parent.call(this); // 关键：在子类构造函数中调用父类构造函数
}
```

**问题**：方法都在构造函数里定义，**无法复用**。每个实例都有一份独立方法。

### 3. 组合继承 — 原型链 + 构造函数

```js
function Child() {
  Parent.call(this);          // 第二次调用 Parent：继承实例属性
}
Child.prototype = new Parent(); // 第一次调用 Parent：继承原型方法
Child.prototype.constructor = Child;
```

**问题**：**父类构造函数被调用了两次**，导致原型上多了一套冗余属性。

### 4. 原型式继承 — Object.create 的思想来源

```js
function createObject(o) {
  function F() {}
  F.prototype = o;
  return new F();
}
// 等价于 Object.create(o)
```

**问题**：和原型链继承一样，引用类型属性共享。

### 5. 寄生式继承 — 在原型式基础上增强对象

```js
function createAnother(o) {
  const clone = Object.create(o);
  clone.sayHi = function () { console.log('hi'); };
  return clone;
}
```

**问题**：方法无法复用，和构造函数继承一样。

### 6. 寄生组合式继承 — 最终形态（ES6 class 的编译目标）

```js
function Child() {
  Parent.call(this); // 只调用一次 Parent，继承实例属性
}

// 核心：只继承原型方法，不调用父类构造函数
Child.prototype = Object.create(Parent.prototype);
Child.prototype.constructor = Child;
```

**解决了组合继承的两大痛点**：
- 只调用一次 Parent 构造函数
- 原型上没有冗余属性

### 一图对比

| 方式 | 原型方法复用 | 实例属性独立 | 可向父类传参 | 父类调用次数 |
|------|:-----------:|:-----------:|:-----------:|:----------:|
| 原型链继承 | ✅ | ❌ | ❌ | 1 |
| 构造函数继承 | ❌ | ✅ | ✅ | 1 |
| 组合继承 | ✅ | ✅ | ✅ | 2 |
| 原型式继承 | ✅ | ❌ | ❌ | 1 |
| 寄生式继承 | ❌ | ❌ | ❌ | 1 |
| **寄生组合式** | **✅** | **✅** | **✅** | **1** |

## 面试回答框架

### 标准回答（2 分钟版）

面试官问「JS 继承有哪几种方式？各有什么优缺点？」

```
第一步：先立框架
"JS 继承本质上是利用原型链让子类访问父类的属性和方法。
6 种方式是逐步演进的，核心要解决两个问题——引用类型共享和传参。
我重点讲 4 种关键的。"

第二步：原型链继承（最基础）
"最简单的做法是 Child.prototype = new Parent()，
但致命问题是所有实例共享引用类型——改一个 colors 数组，全变了。"

第三步：构造函数继承（修补）
"在 Child 里 Parent.call(this) 解决了共享问题，
但方法没法复用——每个实例都有一份独立的方法拷贝。"

第四步：组合继承（两全，但浪费）
"把上面两种结合：Parent.call(this) 拿实例属性，
new Parent() 拿原型方法。但父类构造函数被调了两次，
原型上多了一套冗余属性。"

第五步：寄生组合式（终局方案）
"用 Object.create(Parent.prototype) 替代 new Parent() 来设原型——
只继承原型方法而不执行构造函数。这就是最终的寄生组合式，
也是 Babel 编译 class extends 的目标代码。"
```

### 常见追问链

1. **追问 1**：「为什么 `Child.prototype = new Parent()` 不好？」
   - 回答要点：new 会执行构造函数，导致 Parent 的实例属性被放到 Child.prototype 上，成了所有实例共享的冗余数据。用 `Object.create(Parent.prototype)` 只拿原型方法不执行构造。

2. **追问 2**：「手写一个寄生组合式继承的 `inherit` 函数」
   - 见下方「代码演示」→ 面试手写版

3. **追问 3**（三面深挖）：「ES6 class extends 编译后的 `__extends` 函数里做了什么？」
   - 回答要点：就是寄生组合式 + `Object.setPrototypeOf(Child, Parent)`（继承静态属性）。Babel 的 `__extends` 额外处理了 `this`——先让子类构造返回 `Parent.call(this, ...args) || this`。

### 加分回答（让面试官眼前一亮）

1. **静态属性继承**：寄生组合式只处理了原型方法（`Child.prototype`），没有处理静态属性。ES6 class 的 extends 多了一步 `Object.setPrototypeOf(Child, Parent)`，让子类也能访问父类的静态方法。完整继承应该这样写：
   ```js
   function inherit(Child, Parent) {
     Child.prototype = Object.create(Parent.prototype);
     Child.prototype.constructor = Child;
     Object.setPrototypeOf(Child, Parent); // 静态属性/方法继承
   }
   ```

2. **ES6 class 的 super 本质**：`super(args)` 编译后是 `Parent.call(this, args)` 或 `Parent.apply(this, arguments)`。但有个 subtle 的点——子类 constructor 里 `this` 在 `super()` 之前是不存在的，因为 ES6 class 的 `this` 由父类创建。

3. **V8 的原型链优化**：V8 对原型链查找有内联缓存（Inline Cache），原型链越长 IC 越容易失效。这也是为什么寄生组合式（原型链清晰、无冗余属性）比组合继承（原型上有无关属性）性能更好。

## 代码演示

```js
// 面试手写版 —— 寄生组合式 inherit 函数
function inherit(Child, Parent) {
  // 1. 只继承原型方法，不调构造函数
  Child.prototype = Object.create(Parent.prototype);
  // 2. 修复 constructor 指向
  Child.prototype.constructor = Child;
  // 3. 继承静态属性（加分项）
  Object.setPrototypeOf(Child, Parent);
}

// 使用
function Animal(name) {
  this.name = name;
}
Animal.prototype.sayName = function () {
  return this.name;
};

function Dog(name, breed) {
  Animal.call(this, name);  // 继承实例属性
  this.breed = breed;
}

inherit(Dog, Animal);

const d = new Dog('旺财', '金毛');
d.sayName(); // '旺财' —— 原型方法复用
```

## 在本项目中的应用

1. **React 类组件** — `class App extends React.Component` 就是寄生组合式在实战中最常见的应用
2. **自定义错误类型** — medai-learn 的错误处理体系需要扩展 Error：
   ```ts
   class AppError extends Error {
     constructor(message: string, public code: string) {
       super(message);  // = Error.call(this, message)
       this.name = 'AppError';
     }
   }
   ```
3. **Babel/TS 编译产物调试** — 理解 `__extends` 能帮你在线上 sourcemap 失效时直接看懂编译后的代码

## 易混淆点

| 概念 A | 概念 B | 关键区别 |
|--------|--------|---------|
| `new Parent()` 设原型 | `Object.create(Parent.prototype)` 设原型 | 前者调构造函数（原型上有实例属性冗余），后者只继承原型方法 |
| `Parent.call(this)` | `Child.prototype = new Parent()` | 前者在构造函数里调（实例属性独立），后者在原型链上（所有实例共享） |
| 组合继承 | 寄生组合式 | 组合式调了两次 Parent 构造函数，寄生组合式只调一次 |
| `Object.setPrototypeOf(Child, Parent)` | `Child.prototype = Object.create(Parent.prototype)` | 前者继承静态属性（类级别），后者继承实例方法（原型级别） |

## 扩展阅读

- [JavaScript 深入系列 — 继承](https://github.com/mqyqingfeng/Blog/issues/16) — 冴羽的经典，逐行拆解 `__extends` 编译结果
- MDN [Inheritance and the prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain)

## 自测

> 📚 **关联笔记**：ES6 `class` 语法糖的 `extends` 底层就是寄生组合式继承的标准化版本，详见 [[class-syntax]]

写出一个完整的 `inherit(Child, Parent)` 函数，要求：
1. 子类能继承父类的原型方法
2. 子类能继承父类的实例属性（通过构造函数传参）
3. 子类能继承父类的静态方法（加分项）
4. `instanceof` 检查正确

写完后用下面的测试用例验证：
```js
function A(name) { this.name = name; }
A.staticMethod = () => 'static';
A.prototype.getName = function() { return this.name; };

function B(name, age) { A.call(this, name); this.age = age; }
inherit(B, A);

const b = new B('test', 18);
console.log(b.getName());       // 'test'
console.log(b instanceof A);    // true
console.log(B.staticMethod());  // 'static'
```

<details>
<summary>💡 点击查看参考答案</summary>

```js
function inherit(Child, Parent) {
  // 继承原型方法
  Child.prototype = Object.create(Parent.prototype);
  // 修复 constructor 指向
  Child.prototype.constructor = Child;
  // 继承静态属性
  Object.setPrototypeOf(Child, Parent);
}
```

</details>