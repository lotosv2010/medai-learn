# 原型链机制（Prototype Chain）

> 记录时间：2026-05-27
> 关联模块：JavaScript 面向对象系列
> 重要程度：⭐⭐⭐（面试高频）
> 
> 📖 进阶阅读：[[继承的6种方式]] — 理解原型链后，下一步学习基于原型链的 6 种继承模式及其演进

---

## 核心概念

### 什么是原型？

JavaScript 中每个对象都有一个内部属性 `[[Prototype]]`（规范中用双括号表示内部属性），指向另一个对象。这个被指向的对象就是**原型对象**。

```text
对象 → [[Prototype]] → 原型对象 → [[Prototype]] → 原型的原型 → ... → null
```

原型对象本身也是对象，也有自己的原型，这样层层向上，直到 `null` 为止，形成一条链路，这就是**原型链（Prototype Chain）**。

### `__proto__` vs `prototype` vs `constructor`

这三个属性最容易混淆：

```javascript
function Person(name) {
  this.name = name;
}

Person.prototype.sayHi = function() {
  console.log(`Hi, I'm ${this.name}`);
};

const p = new Person('Robin');
```

**关系图：**

```text
Person（构造函数）
  ├── prototype ──→ Person.prototype（原型对象）
  │                   ├── constructor ──→ Person（指回构造函数）
  │                   └── sayHi: function
  │
  └── [[Prototype]] → Function.prototype

p（实例）
  ├── name: 'Robin'
  ├── [[Prototype]] ──→ Person.prototype（指向构造函数的 prototype）
  │                       ├── constructor ──→ Person
  │                       └── sayHi: function
  │
  └── 可以访问 p.sayHi()（通过原型链找到）
```

**三者区别：**

| 属性 | 归属 | 作用 |
| ---- | ---- | ---- |
| `__proto__` | 每个对象都有 | 指向构造函数的 `prototype`，是实例访问原型的桥梁 |
| `prototype` | 只有函数才有 | 构造函数的属性，`new` 时赋值给实例的 `__proto__` |
| `constructor` | 原型对象上 | 指回构造函数本身，用于确认"谁创建了我" |

```javascript
// 验证关系
p.__proto__ === Person.prototype;          // true
Person.prototype.constructor === Person;   // true
p.constructor === Person;                  // true（通过原型链找到）
```

### 属性查找机制

当访问对象的属性时，引擎按以下顺序查找：

```javascript
const p = new Person('Robin');
p.toString();  // 从哪里来的？
```

```text
查找 p.toString：

1. p 自身 → 没有 toString
2. p.__proto__（Person.prototype）→ 没有 toString
3. Person.prototype.__proto__（Object.prototype）→ 找到 toString！返回

如果 Object.prototype 也没有 → 继续找 Object.prototype.__proto__ → null → 返回 undefined
```

**关键规则：**

- 查找是**逐级向上**的，找到即停
- 只有**读取属性**时触发原型链查找，**写入属性**时直接在对象自身操作
- 这就是为什么修改原型上的属性会影响所有实例，但给实例赋值不会影响原型

```javascript
const p1 = new Person('Alice');
const p2 = new Person('Bob');

// 修改原型方法 → 影响所有实例
Person.prototype.sayHi = function() { console.log('new Hi'); };
p1.sayHi();  // 'new Hi'
p2.sayHi();  // 'new Hi'

// 给实例赋值 → 只影响自身（遮蔽原型属性）
p1.sayHi = function() { console.log('p1 Hi'); };
p1.sayHi();  // 'p1 Hi'（自身方法，遮蔽了原型方法）
p2.sayHi();  // 'new Hi'（仍然访问原型方法）
```

---

## 原型链的构建方式

### 1. 构造函数 + new

```javascript
function Animal(type) {
  this.type = type;
}

Animal.prototype.speak = function() {
  console.log(`${this.type} speaks`);
};

const dog = new Animal('Dog');
dog.speak();  // 'Dog speaks'
```

`new` 的执行过程：

```text
1. 创建空对象 {}
2. 将空对象的 __proto__ 指向构造函数的 prototype
3. 将构造函数的 this 绑定到这个空对象
4. 执行构造函数代码
5. 如果构造函数没有返回对象，则返回 this
```

### 2. Object.create()

```javascript
const animal = {
  speak() {
    console.log(`${this.type} speaks`);
  }
};

const dog = Object.create(animal);
dog.type = 'Dog';
dog.speak();  // 'Dog speaks'
```

`Object.create(proto)` 创建一个新对象，其 `__proto__` 直接指向 `proto`。

```text
dog.__proto__ === animal  // true
```

### 3. ES6 class

```javascript
class Animal {
  constructor(type) {
    this.type = type;
  }

  speak() {
    console.log(`${this.type} speaks`);
  }
}

class Dog extends Animal {
  constructor(name) {
    super('Dog');
    this.name = name;
  }
}

const d = new Dog('Buddy');
d.speak();  // 'Dog speaks'
```

class 本质上是语法糖，底层仍然是原型链：

```text
Dog.prototype.__proto__ === Animal.prototype  // true
d.__proto__ === Dog.prototype                 // true
```

---

## 继承的原型链结构

### ES5 组合继承

```javascript
function Parent(name) {
  this.name = name;
}

Parent.prototype.sayName = function() {
  console.log(this.name);
};

function Child(name, age) {
  Parent.call(this, name);  // 继承属性
  this.age = age;
}

Child.prototype = Object.create(Parent.prototype);  // 继承方法
Child.prototype.constructor = Child;                 // 修复 constructor
```

原型链结构：

```text
child（实例）
  ├── name, age
  └── __proto__ → Child.prototype
                    ├── constructor → Child
                    └── __proto__ → Parent.prototype
                                      ├── sayName: function
                                      └── __proto__ → Object.prototype
                                                        ├── toString: function
                                                        └── __proto__ → null
```

### ES6 class 继承

```javascript
class Parent {
  constructor(name) {
    this.name = name;
  }
  sayName() {
    console.log(this.name);
  }
}

class Child extends Parent {
  constructor(name, age) {
    super(name);
    this.age = age;
  }
}
```

原型链结构与 ES5 组合继承一致，class 只是语法糖。

---

## instanceof 原理

`instanceof` 沿着原型链查找：

```javascript
d instanceof Dog;     // true
d instanceof Animal;  // true
d instanceof Object;  // true
```

```javascript
// instanceof 的简化实现
function myInstanceof(obj, Constructor) {
  let proto = Object.getPrototypeOf(obj);
  while (proto !== null) {
    if (proto === Constructor.prototype) {
      return true;
    }
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}
```

---

## 在本项目中的应用

### 1. React 组件继承

```typescript
// apps/web 中的 ErrorBoundary
class ErrorBoundary extends React.Component<Props, State> {
  // React.Component 的原型链：
  // ErrorBoundary.prototype → React.Component.prototype → React.Component.prototype.__proto__ → Object.prototype

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

### 2. TypeScript 类与接口

```typescript
// packages/shared 中的类型设计
interface Searchable {
  search(query: string): Drug[];
}

interface Cacheable {
  getCache(key: string): Drug | undefined;
  setCache(key: string, value: Drug): void;
}

// 接口描述原型链上的方法，不是实例属性
class DrugService implements Searchable, Cacheable {
  search(query: string) { /* ... */ }
  getCache(key: string) { /* ... */ }
  setCache(key: string, value: Drug) { /* ... */ }
}
```

### 3. 工具函数的原型方法

```typescript
// packages/shared/utils/array.ts
// 扩展 Array.prototype（不推荐，但面试会问）
declare global {
  interface Array<T> {
    groupBy(fn: (item: T) => string): Record<string, T[]>;
  }
}

Array.prototype.groupBy = function(fn) {
  return this.reduce((acc, item) => {
    const key = fn(item);
    (acc[key] ??= []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
};
```

---

## 易混淆点

### 1. `__proto__` 不是标准属性

```javascript
// 标准方式
Object.getPrototypeOf(p);           // 获取原型
Object.setPrototypeOf(p, proto);    // 设置原型（不推荐，有性能问题）

// 非标准但广泛支持
p.__proto__;

// 推荐：使用 Object.create() 创建时就确定原型链
```

### 2. `prototype` 是函数的属性，不是原型的属性

```javascript
function Foo() {}

// Foo.prototype 是 Foo 这个函数对象的属性
// Foo.__proto__ 才是 Foo 的原型（指向 Function.prototype）
Foo.__proto__ === Function.prototype;  // true
Foo.prototype.__proto__ === Object.prototype;  // true
```

### 3. 原型链 vs 作用域链

| 维度 | 原型链 | 作用域链 |
| ---- | ------ | ------- |
| 连接方式 | `__proto__` | 外层词法环境 |
| 查找内容 | 对象属性 | 变量 |
| 查找方向 | 实例 → 构造函数原型 → ... → Object.prototype → null | 当前作用域 → 外层作用域 → ... → 全局作用域 |
| 用途 | 属性继承 | 变量访问 |

### 4. hasOwnProperty vs in

```javascript
const p = new Person('Robin');

p.hasOwnProperty('name');  // true（自身属性）
p.hasOwnProperty('sayHi'); // false（原型属性）

'name' in p;  // true
'sayHi' in p; // true（原型链上的也算）
```

### 5. for...in 会遍历原型链属性

```javascript
for (const key in p) {
  // 会遍历原型链上的可枚举属性
  if (p.hasOwnProperty(key)) {
    // 只处理自身属性
  }
}

// 推荐使用 Object.keys() 只获取自身可枚举属性
Object.keys(p);  // ['name']
```

---

## 面试角度

### 高频问题

1. **"什么是原型链？"**
   - 每个对象都有 `[[Prototype]]` 指向另一个对象，层层向上直到 `null`，形成链路
   - 属性查找沿链进行，找到即停

2. **"`__proto__`、`prototype`、`constructor` 的关系？"**
   - `__proto__`：实例指向原型的桥梁
   - `prototype`：函数才有，`new` 时赋给实例的 `__proto__`
   - `constructor`：原型对象上，指回构造函数

3. **"`new` 做了什么？"**
   - 创建空对象 → 链接原型 → 绑定 this → 执行构造函数 → 返回对象

4. **"如何实现继承？"**
   - ES5：构造函数 + `Object.create()` + 修复 constructor
   - ES6：class + extends + super
   - 本质都是原型链

5. **"`instanceof` 的原理？"**
   - 沿着实例的原型链查找，直到找到 `Constructor.prototype` 或 `null`

### 加分回答

- 提到 **原型链与作用域链的区别**：原型链查属性，作用域链查变量
- 提到 **Object.create(null)** 创建纯净对象，没有原型链，适合做字典
- 提到 **性能影响**：原型链过长会拖慢属性查找，V8 用 Inline Cache 优化
- 提到 **class 的 super** 本质是调用父构造函数并绑定 this

---

## 扩展阅读

1. **深入方向**：V8 的 Hidden Class 和 Inline Cache 如何优化原型链查找
2. **实践方向**：ESLint `no-prototype-builtins` 规则的原理，以及为什么推荐 `Object.hasOwn()` 替代 `hasOwnProperty`

---

## 自测问题

**Q：以下代码输出什么？为什么？**

```javascript
function Person(name) {
  this.name = name;
}

Person.prototype.sayHi = function() {
  console.log(`Hi, I'm ${this.name}`);
};

const p1 = new Person('Alice');
const p2 = new Person('Bob');

p1.sayHi();                    // ①
p2.sayHi();                    // ②

p1.sayHi = function() {
  console.log('p1 says hi');
};

p1.sayHi();                    // ③
p2.sayHi();                    // ④

Person.prototype.sayHi = function() {
  console.log('new sayHi');
};

p1.sayHi();                    // ⑤
p2.sayHi();                    // ⑥
```

<!-- markdownlint-disable MD033 MD040 MD031 MD032 -->

<details>
<summary>点击查看答案</summary>

输出：

```text
① Hi, I'm Alice
② Hi, I'm Bob
③ p1 says hi
④ Hi, I'm Bob
⑤ p1 says hi
⑥ new sayHi
```

**分析：**

1. **①②**：通过原型链找到 `Person.prototype.sayHi`，`this` 分别绑定 `p1` 和 `p2`

2. **③**：`p1.sayHi = function(){...}` 在 `p1` 自身创建了 `sayHi` 属性，**遮蔽**了原型方法。后续 `p1.sayHi()` 读取的是自身属性

3. **④**：`p2` 没有自身 `sayHi`，仍通过原型链找到 `Person.prototype.sayHi`

4. **⑤**：`p1` 仍有自身的 `sayHi`（上一步赋值的），所以输出 `p1 says hi`

5. **⑥**：`Person.prototype.sayHi` 被重新赋值，`p2` 通过原型链找到新的方法

**关键理解：**

- 写入属性直接操作对象自身（不触发原型链查找）
- 读取属性才沿原型链查找
- 自身属性会**遮蔽**原型链上的同名属性

</details>

<!-- markdownlint-restore -->
