# instanceof 原理

> 记录时间：2026-05-28
> 关联模块：类型守卫 / 自定义错误体系 / React 类组件 type 检查
> 重要程度：⭐⭐
> 前置知识：[[prototype-chain]] [[inheritance-6-ways]] [[class-syntax]]

## 一句话总结（面试 30 秒版）

`instanceof` 的本质是**沿原型链向上查找**，判断构造函数的 `prototype` 是否出现在对象的原型链上。它不检查「谁创建了你」，而是检查「你能不能追溯到我」。

---

## 核心概念

### instanceof 做了什么

```js
obj instanceof Constructor
```

等价于：从 `obj.__proto__` 开始，沿着原型链一级一级往上找，看能不能找到 `Constructor.prototype`。找到返回 `true`，走到 `null` 还没找到返回 `false`。

```
obj.__proto__ === Constructor.prototype  ?  true
obj.__proto__.__proto__ === Constructor.prototype  ?  true
...
直到 null → false
```

### 关键区别：instanceof vs typeof

| | `instanceof` | `typeof` |
|---|---|---|
| 检查什么 | 原型链上是否有指定 prototype | 值的基本类型标签 |
| 适用场景 | 对象类型细分（Array/Error/自定义类） | 基本类型判断（string/number/boolean） |
| 跨 iframe | ❌ 失败（不同全局对象的 prototype 不同） | ✅ 正常工作 |
| 能判断 null | ❌ `null instanceof Object === false` | ✅ `typeof null === 'object'`（历史包袱） |

### instanceof 的局限性

```js
// 1. 基本类型不行
1 instanceof Number;        // false — 基本类型没有原型链
new Number(1) instanceof Number; // true — 包装对象才有

// 2. 跨 iframe 失败
const iframe = document.createElement('iframe');
document.body.appendChild(iframe);
const arr = new iframe.contentWindow.Array();
arr instanceof Array;  // false — 不同 realm 的 Array.prototype
Array.isArray(arr);    // true  — Array.isArray 不受此限制

// 3. 原型链可被篡改
const obj = {};
Object.setPrototypeOf(obj, Array.prototype);
obj instanceof Array;  // true — 但它不是真的数组
```

---

## 面试回答框架

### 标准回答（2 分钟版）

> `instanceof` 的底层逻辑是**遍历左侧对象的原型链**，逐级与右侧构造函数的 `prototype` 做严格相等比较。
>
> 具体来说，`a instanceof B` 执行的是：
> 1. 取 `a.__proto__`
> 2. 和 `B.prototype` 比较，相等则返回 `true`
> 3. 不相等则继续取 `a.__proto__.__proto__`，重复步骤 2
> 4. 如果走到 `null` 还没匹配，返回 `false`
>
> 这就是为什么 `instanceof` 能判断继承关系——子类实例的原型链上既有 `Child.prototype` 也有 `Parent.prototype`。
>
> 实际开发中有两个注意点：
> 1. **基本类型不行**，`1 instanceof Number` 是 `false`，因为基本类型没有原型链
> 2. **跨 iframe 不可靠**，不同全局对象的 `Array.prototype` 不是同一个引用，用 `Array.isArray` 更安全

### 常见追问链

1. **追问 1**：「手写一个 `myInstanceof`」
   - 回答要点：用 `while` 循环遍历 `left.__proto__`，和 `right.prototype` 做 `===` 比较，直到 `null`。见下方代码演示。

2. **追问 2**：「`instanceof` 能被劫持吗？」
   - 回答要点：可以，ES6 的 `Symbol.hasInstance` 让你自定义 `instanceof` 行为：
     ```js
     class MyArray {
       static [Symbol.hasInstance](instance) {
         return Array.isArray(instance);
       }
     }
     [] instanceof MyArray; // true
     ```

3. **追问 3**：「`instanceof` 和 `Object.prototype.isPrototypeOf` 有什么关系？」
   - 回答要点：`a instanceof B` 等价于 `B.prototype.isPrototypeOf(a)`，都是查原型链，只是语法方向相反。

### 加分回答（让面试官眼前一亮）

**ECMA 规范层面**：`instanceof` 的内部方法是 `OrdinaryHasInstance(O, C)`，核心逻辑如下（简化）：

```
1. 如果 C 不是函数，返回 false
2. 如果 C 有 [[BoundTargetFunction]]（bind 过的），用绑定的目标函数检查
3. 如果 O 不是对象，返回 false
4. 循环：P = C.prototype → O = O.[[GetPrototypeOf]]()
   直到 O === null（返回 false）或 O === P（返回 true）
```

**V8 优化**：V8 对 `instanceof` 有 Inline Cache（IC）优化——如果同一个位置反复检查 `x instanceof Foo`，V8 会缓存上次的原型链查找结果，命中时直接返回，不再遍历。

---

## 代码演示

### 手写 instanceof（面试高频）

```js
function myInstanceof(left, right) {
  // 基本类型直接返回 false
  if (typeof left !== 'object' || left === null) return false;

  // 获取右侧构造函数的 prototype
  let proto = Object.getPrototypeOf(left);
  const prototype = right.prototype;

  // 沿原型链向上查找
  while (proto !== null) {
    if (proto === prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }

  return false;
}
```

### Symbol.hasInstance 自定义行为

```js
class EvenNumber {
  static [Symbol.hasInstance](value) {
    return typeof value === 'number' && value % 2 === 0;
  }
}

4 instanceof EvenNumber;   // true
3 instanceof EvenNumber;   // false
```

### 验证原型链查找过程

```js
class A {}
class B extends A {}
class C extends B {}

const c = new C();

// instanceof 沿原型链向上查找
c instanceof C; // true  — c.__proto__ === C.prototype
c instanceof B; // true  — c.__proto__.__proto__ === B.prototype
c instanceof A; // true  — c.__proto__.__proto__.__proto__ === A.prototype
c instanceof Object; // true — 继续往上到 Object.prototype
```

---

## 在本项目中的应用

### 1. 自定义错误类型判断

```ts
// apps/api/src/errors.ts
class AppError extends Error {}
class ValidationError extends AppError {}

function handleError(err: Error) {
  if (err instanceof ValidationError) {
    return { status: 400, message: err.message, fields: err.fields };
  }
  if (err instanceof AppError) {
    return { status: err.statusCode, message: err.message };
  }
  return { status: 500, message: 'Internal Server Error' };
}
```

### 2. 类型守卫（TypeScript）

```ts
// instanceof 在 TS 中自动收窄类型
function processValue(value: string | Error) {
  if (value instanceof Error) {
    // TS 知道这里是 Error 类型
    console.log(value.message);
  } else {
    // TS 知道这里是 string 类型
    console.log(value.toUpperCase());
  }
}
```

### 3. React 类组件中的类型检查

```tsx
// 检查子组件是否是特定类型
React.Children.map(children, child => {
  if (React.isValidElement(child) && child.type === ErrorBoundary) {
    // 特殊处理
  }
});
```

---

## 易混淆点

| 概念 A | 概念 B | 关键区别 |
|--------|--------|---------|
| `instanceof` | `typeof` | 原型链查找 vs 基本类型标签 |
| `instanceof` | `Array.isArray` | 原型链查找（跨 iframe 失败） vs 内部槽检查（跨 iframe 安全） |
| `instanceof` | `isPrototypeOf` | 语法方向相反：`a instanceof B` ↔ `B.prototype.isPrototypeOf(a)` |
| `instanceof` | `constructor` 比较 | instanceof 查整条链（安全），constructor 只看一层（可被覆盖） |

---

## 扩展阅读

- [MDN — instanceof](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/instanceof)
- [ECMA-262 — OrdinaryHasInstance](https://tc39.es/ecma262/#sec-ordinaryhasinstance) — 规范层面的完整算法

---

## 自测

不看笔记，回答以下问题（5 分钟内完成算过关）：

1. **手写实现**：写出 `myInstanceof(left, right)` 函数，要求能正确处理基本类型和 null。

2. **原型链理解**：下面代码输出什么？为什么？
   ```js
   function Foo() {}
   const foo = new Foo();
   Foo.prototype = {};  // 重写 prototype
   console.log(foo instanceof Foo);
   ```

3. **追问回答**：如果面试官问「`instanceof` 跨 iframe 为什么会失败？怎么解决？」你怎么答？

<details>
<summary>💡 点击查看参考答案</summary>

**第 1 题：手写 instanceof**

```js
function myInstanceof(left, right) {
  if (typeof left !== 'object' || left === null) return false;
  let proto = Object.getPrototypeOf(left);
  while (proto !== null) {
    if (proto === right.prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}
```

**第 2 题：重写 prototype 后的 instanceof**

输出：`false`

原因：`foo.__proto__` 指向的是**创建时的** `Foo.prototype`（旧对象），而 `Foo.prototype = {}` 让 `Foo.prototype` 指向了一个新对象。`instanceof` 检查的是 `foo.__proto__ === Foo.prototype`（新对象），两者不是同一个引用，所以返回 `false`。

这揭示了一个关键点：`instanceof` 是基于**当前的** `Constructor.prototype` 做比较，而不是基于创建时的。如果 prototype 被替换，之前创建的实例就「断链」了。

**第 3 题：跨 iframe 失败及解决方案**

每个 iframe 有自己独立的全局执行环境（realm），各自的内置构造函数（Array、Object 等）是不同的引用。所以 `iframe.contentWindow.Array.prototype !== window.Array.prototype`，导致 `arr instanceof Array` 失败。

解决方案：
- 用 `Array.isArray(arr)` — 它检查的是内部槽 `[[Class]]`，不依赖原型链
- 用 `Object.prototype.toString.call(arr) === '[object Array]'` — 同理，检查内部标签
- 用 `Array.prototype.isPrototypeOf(arr)` — 但这和 `instanceof` 一样有跨 realm 问题

</details>
