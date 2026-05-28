# Object.create 深度解析

> 记录时间：2026-05-28
> 关联模块：packages/shared 类型工具 / 任何需要精确控制原型链的场景
> 重要程度：⭐⭐⭐
> 前置知识：[[prototype-chain]] [[inheritance-6-ways]] [[new-operator]]

## 一句话总结（面试 30 秒版）

`Object.create(proto)` 创建一个新对象，并将其 `[[Prototype]]` 直接设置为指定的 `proto`，是**显式控制原型链**的最底层 API，也是寄生组合式继承的核心工具。

---

## 核心概念

### 它做了什么

```
Object.create(proto, propertiesObject?)
```

- 创建一个全新的空对象
- 将该对象的 `[[Prototype]]`（即 `__proto__`）设置为 `proto`
- 可选的第二个参数是属性描述符对象（同 `Object.defineProperties`）

### 与 `new` 的本质区别

| | `new Fn()` | `Object.create(proto)` |
|---|---|---|
| 执行构造函数 | ✅ 会执行 | ❌ 不执行 |
| 原型设置 | `Fn.prototype` | 你传入的任意对象 |
| 属性初始化 | 构造函数内完成 | 需要手动添加 |
| 创建空对象 | `Object.create(null)` 不行 | ✅ 可以 |

### `Object.create(null)` 的特殊用途

创建一个**没有任何原型**的纯净对象，常用于：
- 实现 Map/字典（避免 `hasOwnProperty` 等原型方法污染）
- 防止原型污染攻击

```js
const dict = Object.create(null);
dict.toString; // undefined — 没有继承任何东西
```

---

## 面试回答框架

### 标准回答（2 分钟版）

> `Object.create` 是 ES5 引入的方法，核心作用是**以指定对象为原型创建新对象**，不执行任何构造函数。
>
> 它的价值在于三点：
> 1. **精确控制原型链**：可以把任意对象设为原型，而不依赖构造函数
> 2. **寄生组合式继承的基石**：`Child.prototype = Object.create(Parent.prototype)` 这一行是继承模式演进的终点
> 3. **创建无原型对象**：`Object.create(null)` 创建纯净字典，避免原型污染
>
> 底层等价于：创建空对象 → 设置 `[[Prototype]]` → 返回对象，不涉及任何函数调用。

### 常见追问链

1. **追问 1**：「`Object.create(null)` 和 `{}` 有什么区别？」
   - 回答要点：`{}` 的原型是 `Object.prototype`，有 `toString/hasOwnProperty` 等方法；`Object.create(null)` 原型为 `null`，是真正的空对象，适合做字典/Map，不会被原型链上的属性干扰

2. **追问 2**：「为什么寄生组合式继承要用 `Object.create` 而不是 `new Parent()`？」
   - 回答要点：`new Parent()` 会执行父类构造函数，导致父类属性被初始化两次（一次在设置原型时，一次在子类构造函数调用 `Parent.call(this)` 时）；`Object.create(Parent.prototype)` 只继承原型，不执行构造函数，避免了重复初始化

3. **追问 3**：「`Object.create` 的第二个参数怎么用？」
   - 回答要点：接受属性描述符对象，格式同 `Object.defineProperties`，可以精确控制 `enumerable/writable/configurable`，但实际开发中很少用，了解即可

### 加分回答（让面试官眼前一亮）

`Object.create` 是 Douglas Crockford 在 ES5 之前就提出的 `beget` 函数的标准化版本。它揭示了 JS 继承的本质：**JS 的继承是对象到对象的委托，而不是类到类的复制**。

`class extends` 在底层也是通过 `Object.create` 实现的：
```js
// Babel 编译 class B extends A 时，会生成类似：
B.prototype = Object.create(A.prototype, {
  constructor: { value: B, writable: true, configurable: true }
});
```

---

## 代码演示

### 手写 Object.create（面试必备）

```js
function myCreate(proto, propertiesObject) {
  if (typeof proto !== 'object' && typeof proto !== 'function') {
    throw new TypeError('Object prototype may only be an Object or null');
  }
  function F() {}
  F.prototype = proto;
  const obj = new F();
  if (propertiesObject !== undefined) {
    Object.defineProperties(obj, propertiesObject);
  }
  return obj;
}
```

### 寄生组合式继承（核心应用）

```js
function inherit(Child, Parent) {
  Child.prototype = Object.create(Parent.prototype);
  Child.prototype.constructor = Child;
}

function Animal(name) { this.name = name; }
Animal.prototype.speak = function() { return `${this.name} speaks`; };

function Dog(name, breed) {
  Animal.call(this, name); // 只调用一次构造函数
  this.breed = breed;
}

inherit(Dog, Animal);

const d = new Dog('Rex', 'Husky');
d.speak(); // 'Rex speaks'
d instanceof Dog;   // true
d instanceof Animal; // true
```

### Object.create(null) 作为安全字典

```js
const cache = Object.create(null);
cache['constructor'] = 'safe'; // 不会污染原型
'toString' in cache; // false — 真正干净
```

---

## 在本项目中的应用

- `packages/shared` 中如果实现工具类（如 EventEmitter、LRU Cache），可以用 `Object.create(null)` 作为内部存储，避免 key 冲突
- `apps/ai-engine` 中实现 Agent 工具注册表时，`Object.create(null)` 是比 `Map` 更轻量的选择（纯 JSON 序列化友好）
- 理解 `Object.create` 是读懂任何 Babel 编译输出、polyfill 代码的基础

---

## 易混淆点

| 概念 A | 概念 B | 关键区别 |
|--------|--------|---------|
| `Object.create(proto)` | `new Fn()` | create 不执行构造函数，new 会执行 |
| `Object.create(null)` | `{}` | null 原型无任何继承属性，`{}` 继承 Object.prototype |
| `Object.create(obj)` | `Object.assign({}, obj)` | create 建立原型链委托，assign 是浅拷贝属性 |
| `Object.create` | `Object.setPrototypeOf` | create 在创建时设置，setPrototypeOf 在已有对象上修改（有性能代价） |

---

## 扩展阅读

- [MDN — Object.create()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/create)
- 《JavaScript 高级程序设计》第 4 版 第 8 章「对象、类与面向对象编程」

---

## 自测

不看笔记，手写一个 `myCreate(proto)` 函数，然后用它实现 `Dog extends Animal` 的寄生组合式继承，要求：
1. `new Dog()` 不触发两次 `Animal` 构造函数
2. `dog instanceof Animal === true`
3. `dog.constructor === Dog`

能在 5 分钟内写出来，算掌握。
