# Class 语法糖深度解析

> 记录时间：2026-05-28
> 关联模块：React 类组件 / packages/shared 中的 OOP 设计 / 任何需要继承的场景
> 重要程度：⭐⭐⭐
> 前置知识：[[prototype-chain]] [[inheritance-6-ways]] [[new-operator]] [[object-create]]

## 一句话总结（面试 30 秒版）

`class` 是 ES6 引入的**语法糖**，底层仍然是基于原型链的继承，只是把 `constructor`、原型方法、静态方法、`getter/setter` 的写法收敛到一个更清晰的语法结构里。它的核心价值是**让 JavaScript 的面向对象写法和其他语言对齐，降低心智负担**，但本质没有引入新的继承模型。

---

## 核心概念

### class 的本质：语法糖拆解

```js
// ES6 class
class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() {
    return `${this.name} speaks`;
  }
  static create(name) {
    return new Animal(name);
  }
}

// 等价的 ES5 构造函数
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function() {
  return `${this.name} speaks`;
};
Animal.create = function(name) {
  return new Animal(name);
};
```

**class 做了什么？**
1. `constructor` → 构造函数本体
2. 类方法 → 挂到 `prototype` 上
3. `static` 方法 → 挂到构造函数本身上
4. `class` 内部默认 `'use strict'`
5. **必须用 `new` 调用**，直接 `Animal()` 会报错（ES5 构造函数不强制）

### class 继承 vs 寄生组合式继承

```js
// ES6 写法
class Dog extends Animal {
  constructor(name, breed) {
    super(name);       // 调用父类构造函数
    this.breed = breed;
  }
  bark() {
    return 'Woof!';
  }
}

// Babel 编译后（简化）
function Dog(name, breed) {
  Animal.call(this, name);  // super(name) 的本质
  this.breed = breed;
}
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;
Object.setPrototypeOf(Dog, Animal); // 继承静态方法
```

**关键点：`extends` 做了三件事**
1. `Dog.prototype.__proto__ = Animal.prototype`（实例方法继承）
2. `Dog.__proto__ = Animal`（静态方法继承）
3. `super()` = `Animal.call(this)`（父类构造函数调用）

### super 的工作机制

| 位置 | 含义 | 等价于 |
|------|------|--------|
| `constructor` 中 `super()` | 调用父类构造函数 | `Parent.call(this, ...args)` |
| 方法中 `super.method()` | 调用父类原型方法 | `Parent.prototype.method.call(this)` |
| `super` 单独使用 | ❌ 语法错误 | — |

**⚠️ 关键陷阱**：在 `constructor` 中，必须先调用 `super()` 才能使用 `this`，因为 `super()` 才会创建 `this` 绑定。

```js
class Dog extends Animal {
  constructor(name, breed) {
    // this.breed = breed;  ❌ ReferenceError
    super(name);            // ✅ 先调 super
    this.breed = breed;     // ✅ 现在可以用 this 了
  }
}
```

### super 的词法绑定（⭐⭐⭐ 面试高频）

**核心规则：super 的指向在方法定义时就绑定了，是词法绑定（lexical binding），不是动态查找。**

类比：super 像是「籍贯」，出生时就定了，不管你搬到哪，籍贯不会变。this 像是「现住址」，谁调用就住谁那。

```js
class Animal {
  speak() { return 'animal speaks'; }
}

class Dog extends Animal {
  speak() {
    return super.speak() + ' and barks';
  }
}

const dog = new Dog();
const method = dog.speak;
method(); // 'animal speaks and barks' ✅ super 仍然指向 Animal.prototype

// 验证：把方法「偷走」给另一个对象
const cat = { speak() { return 'cat speaks'; } };
cat.speak = dog.speak;
cat.speak(); // 仍然返回 'animal speaks and barks'，不是 'cat speaks and barks'
```

**V8 内部实现（`[[HomeObject]]` 机制）**：

```js
// 当你写 class Child extends Parent { foo() { super.foo() } }
// V8 会为方法创建一个内部槽 [[HomeObject]]

Child.prototype.foo = {
  [[HomeObject]]: Child.prototype,  // 记录方法属于谁（定义时写死）
  [[Method]]: function() {
    // super.foo() 的查找路径：
    // 1. 找到 [[HomeObject]] = Child.prototype
    // 2. 取 Child.prototype.__proto__ = Parent.prototype
    // 3. 调用 Parent.prototype.foo
    return Parent.prototype.foo.call(this) + ' + child';
  }
};
```

**super vs this 绑定机制对比**：

| | `this` | `super` |
|---|---|---|
| 绑定时机 | 调用时（动态） | 定义时（词法） |
| 决定因素 | 谁调用的（call/apply/bind/new） | 方法定义在哪个对象上 |
| 可变性 | 可以被 `call/apply/bind` 改变 | **不可变** |

**super 的两层继承**：

```js
class Dog extends Animal {
  constructor(name, breed) {
    super(name);           // 第一层：调用父类构造函数，创建 this 绑定
    this.breed = breed;
  }
  speak() {
    return super.speak(); // 第二层：调用父类原型方法，this 指向当前实例
  }
}
```

- `super()` → 调用 `Animal.constructor`，`this` 绑定到当前实例（`new.target` 指向的类）
- `super.method()` → 调用 `Animal.prototype.method`，`this` 仍指向当前实例

**`new.target` 与 super 的配合**：

```js
class A {
  constructor() {
    console.log(new.target.name); // 指向实际 new 的那个类
  }
}
class B extends A {}
class C extends B {}

new B(); // 'B' — new.target 是 B
new C(); // 'C' — new.target 是 C
```

`super()` 调用父类构造函数时，`this` 绑定的是当前 `new.target` 指向的类的实例，所以 `instanceof` 才能正确工作。

**常见误区**：

```js
// ❌ 误区 1：箭头函数里的 super
class Child extends Parent {
  // 类字段箭头函数的 super 来自外层作用域
  foo = () => {
    super.foo(); // ⚠️ 如果在 constructor 中定义，super 可能未绑定
  }
}

// ❌ 误区 2：super() 之前使用 this
class Child extends Parent {
  constructor(name) {
    this.name = name; // ❌ ReferenceError — super() 还没调用
    super(name);
    this.name = name; // ✅
  }
}

// ❌ 误区 3：以为 super 会动态查找
const parent = { foo() { return 'parent'; } };
const child = { __proto__: parent, foo() { return super.foo(); } };
const other = { __proto__: { foo() { return 'other'; } } };
other.foo = child.foo;
other.foo(); // 'parent' — super 没有指向 other 的原型
```

---

## 面试回答框架

### 标准回答（2 分钟版）

> **class 是语法糖，但不是纯语法糖。**
>
> 说它是语法糖，因为底层仍然是原型链继承，`class` 方法挂在 `prototype` 上，`extends` 本质是 `Object.create` + `Object.setPrototypeOf`。
>
> 说它不是纯语法糖，因为 class 有几个 ES5 做不到的特性：
> 1. **必须 new 调用**，直接 `Class()` 报 TypeError
> 2. **内部默认严格模式**
> 3. **不存在变量提升**（虽然规范说有，但 TDZ 限制了使用）
> 4. **继承内置类型**（如 `class MyArray extends Array`），ES5 做不到
>
> 面试中如果问「class 和构造函数的区别」，核心答出：本质一样（原型链），但 class 提供了更严格的约束和更清晰的语法，特别是 `extends` + `super` 让继承写法标准化了。

### 常见追问链

1. **追问 1**：「class 的方法是不可枚举的，构造函数的呢？」
   - 回答要点：`class` 定义的方法 `enumerable: false`，`Object.keys` 拿不到；构造函数挂在 prototype 上的方法默认 `enumerable: true`。这是 class 更接近「面向对象语义」的一个细节。

2. **追问 2**：「class 有变量提升吗？」
   - 回答要点：class 声明有提升，但处于**暂时性死区（TDZ）**，声明前使用会报 `ReferenceError`。和 `let/const` 行为一致。这和 `function` 声明的完全提升不同。

3. **追问 3**：「为什么 class 不能继承内置类型（如 Array）是 ES5 的痛点？」
   - 回答要点：ES5 中 `MyArray.prototype = new Array()` 会把 Array 的内部槽（internal slots）搞乱，导致 `length` 等属性行为异常。`class extends Array` 通过 `new.target` 和内部 `[[Construct]]` 机制正确传递了内部槽。

4. **追问 4**：「`super` 的绑定是在哪里决定的？」
   - 回答要点：`super` 的指向取决于**方法定义时所在的对象**，而不是调用时的 `this`。这是词法绑定，和箭头函数类似。所以把方法赋值给另一个对象后，`super` 仍然指向原来的父类。

### 加分回答（让面试官眼前一亮）

**class 的 `extends` 在 V8 层面的实现**：

V8 对 `class extends` 有专门的优化路径。当你写 `class Dog extends Animal` 时，V8 会：
1. 创建一个 `Dog` 的 constructor function
2. 设置 `Dog.__proto__ = Animal`（静态继承）
3. 设置 `Dog.prototype.__proto__ = Animal.prototype`（实例继承）
4. 标记 `Dog` 为「派生类 constructor」，在 `new` 时会特殊处理 `super()` 调用

**class fields 的提案**（Stage 4，已进入规范）：

```js
class Dog extends Animal {
  breed = 'unknown';  // 实例属性，等价于 constructor 中的 this.breed = 'unknown'
  #secret = 'hidden'; // 私有属性，外部无法访问
}
```

私有字段 `#secret` 不是通过闭包或 `WeakMap` 实现的，而是 V8 引擎级别的**硬隔离**，`dog.#secret` 在外部访问直接语法错误。

---

## 代码演示

### class 基本结构（面试高频）

```js
class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  // 原型方法
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return this; // 链式调用
  }

  emit(event, ...args) {
    const callbacks = this.listeners[event] || [];
    callbacks.forEach(cb => cb(...args));
    return this;
  }

  // 静态方法
  static mixin(obj) {
    const emitter = new EventEmitter();
    Object.assign(obj, {
      on: emitter.on.bind(emitter),
      emit: emitter.emit.bind(emitter),
    });
    return obj;
  }
}
```

### extends + super 实战

```js
class ApiError extends Error {
  constructor(message, statusCode, response) {
    super(message);           // 调用 Error 构造函数
    this.name = 'ApiError';  // 修复 Error 的 name
    this.statusCode = statusCode;
    this.response = response;
  }

  // 自定义方法
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      stack: this.stack,
    };
  }

  // 静态工厂方法
  static fromResponse(response) {
    return new ApiError(
      response.statusText,
      response.status,
      response
    );
  }
}

// 使用
const err = new ApiError('Not Found', 404, response);
err instanceof Error;    // true ✅
err instanceof ApiError; // true ✅
err.toJSON();            // { name: 'ApiError', message: 'Not Found', ... }
```

### 验证 class 的本质是原型链

```js
class A {}
class B extends A {}

// 原型链验证
B.prototype.__proto__ === A.prototype;  // true（实例方法继承）
B.__proto__ === A;                       // true（静态方法继承）

const b = new B();
b.__proto__ === B.prototype;             // true
b.__proto__.__proto__ === A.prototype;   // true
b.__proto__.__proto__.__proto__ === Object.prototype; // true
```

---

## 在本项目中的应用

### 1. 自定义错误体系（apps/api）

```ts
// apps/api/src/errors.ts
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class ValidationError extends AppError {
  constructor(message: string, public fields: string[]) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} #${id} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}
```

### 2. AI 模型抽象层（packages/ai-sdk）

```ts
// packages/ai-sdk/src/base-model.ts
abstract class BaseModel {
  abstract generate(prompt: string): Promise<string>;

  // 模板方法模式
  async chat(messages: Message[]): Promise<string> {
    const prompt = this.buildPrompt(messages);
    return this.generate(prompt);
  }

  protected buildPrompt(messages: Message[]): string {
    return messages.map(m => `${m.role}: ${m.content}`).join('\n');
  }
}

class OpenAIModel extends BaseModel {
  async generate(prompt: string): Promise<string> {
    // 调用 OpenAI API
  }
}
```

### 3. React 类组件（如果项目历史代码中有）

```tsx
class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logErrorToService(error, info);
  }

  render() {
    if (this.state.hasError) {
      return <FallbackUI />;
    }
    return this.props.children;
  }
}
```

---

## 易混淆点

| 概念 A | 概念 B | 关键区别 |
|--------|--------|---------|
| `class` 声明 | `function` 构造函数 | class 必须 new 调用，默认严格模式，方法不可枚举 |
| `class` 声明 | `class` 表达式 | 声明有 TDZ，表达式可以匿名（`const A = class {}`） |
| `super()` | `super.method()` | 前者调父类构造函数（只能在 constructor 中），后者调父类方法 |
| 实例方法 | 静态方法 | 前者在 `prototype` 上（实例可调用），后者在类本身上（只能 `Class.method()`） |
| `class` 语法糖 | 纯语法糖 | class 有新增能力：强制 new、继承内置类型、TDZ、私有字段 |

---

## 扩展阅读

- [MDN — Classes](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Classes)
- [JavaScript 深入系列之继承](https://github.com/mqyqingfeng/Blog/issues/16) — 冴羽：逐行对比 class 和 ES5 编译结果
- [Class fields 提案](https://github.com/tc39/proposal-class-fields) — 了解私有字段的实现原理

---

## 自测

不看笔记，回答以下问题（5 分钟内完成算过关）：

1. **手写转换**：把下面的 class 转换为等价的 ES5 构造函数写法，要求行为完全一致：
   ```js
   class Shape {
     constructor(name) {
       this.name = name;
     }
     area() { return 0; }
     static create(name) { return new Shape(name); }
   }
   class Circle extends Shape {
     constructor(radius) {
       super('circle');
       this.radius = radius;
     }
     area() { return Math.PI * this.radius ** 2; }
   }
   ```

2. **追问回答**：如果面试官问「class 的方法为什么不可枚举？这对实际开发有什么影响？」你怎么答？

3. **super 绑定**：下面代码的输出是什么？为什么？
   ```js
   class Parent {
     greet() { return 'hello from parent'; }
   }
   class Child extends Parent {
     greet() { return super.greet() + ' + child'; }
   }
   const child = new Child();
   const obj = { greet: child.greet };
   console.log(obj.greet());
   ```

<details>
<summary>💡 点击查看参考答案</summary>

**第 1 题：class 转 ES5**

```js
function Shape(name) {
  this.name = name;
}
Shape.prototype.area = function() { return 0; };
Shape.create = function(name) { return new Shape(name); };

function Circle(radius) {
  Shape.call(this, 'circle');  // super('circle')
  this.radius = radius;
}
// 寄生组合式继承
Circle.prototype = Object.create(Shape.prototype);
Circle.prototype.constructor = Circle;
Object.setPrototypeOf(Circle, Shape); // 继承静态方法

Circle.prototype.area = function() {
  return Math.PI * this.radius ** 2;
};
```

**第 2 题：方法不可枚举的影响**

class 定义的方法 `enumerable: false`（通过 `Object.defineProperty` 设置），构造函数挂在 prototype 上的方法默认 `enumerable: true`。

实际影响：
- `Object.keys(instance)` / `for...in` 不会遍历到 class 方法
- `JSON.stringify(instance)` 不会序列化方法
- `Object.assign({}, instance)` 不会复制方法

这更符合面向对象语义——方法是「行为」不是「数据」，不应该被当作可枚举属性。

```js
class A { foo() {} }
const a = new A();
Object.keys(a);           // [] — 不包含 foo
Object.keys(A.prototype); // [] — 不包含 foo

function B() {}
B.prototype.foo = function() {};
Object.keys(B.prototype); // ['foo'] — 包含 foo
```

**第 3 题：super 绑定**

输出：`'hello from parent + child'`

原因：super 是**词法绑定**，在 `Child.greet()` 定义时就绑定了 `Parent.prototype`。即使把方法赋值给 `obj`，`super.greet()` 仍然调用的是 `Parent.prototype.greet()`，而不是 `obj` 的原型。这就是 `[[HomeObject]]` 机制——方法的「籍贯」在定义时就写死了。

</details>
