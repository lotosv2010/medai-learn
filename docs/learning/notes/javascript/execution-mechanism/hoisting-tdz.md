# 变量提升（Hoisting）& 暂时性死区（TDZ）

> 记录时间：2026-05-27
> 关联模块：JavaScript 执行机制系列（接续词法环境笔记）
> 重要程度：⭐⭐⭐（面试高频）

## 核心概念

### 变量提升（Hoisting）

JS 引擎在执行代码前，会先进行**编译阶段**（创建执行上下文）。这个阶段会扫描当前作用域内所有的变量声明和函数声明，并提前在内存中分配空间。

**`var` 的提升行为：**
- 声明被提升到函数/全局作用域顶部
- 初始化为 `undefined`（不是值，是占位符）

```javascript
console.log(x); // undefined（不报错）
var x = 10;
console.log(x); // 10

// 引擎实际执行顺序等价于：
var x;           // 提升：声明 + 初始化为 undefined
console.log(x);  // undefined
x = 10;          // 赋值留在原地
console.log(x);  // 10
```

**函数声明的提升行为：**
- 整个函数体都被提升（声明 + 定义一起）
- 优先级高于 `var`

```javascript
greet(); // "Hello" — 可以在声明前调用

function greet() {
  console.log("Hello");
}

// 函数表达式不同：
sayHi(); // TypeError: sayHi is not a function
var sayHi = function() { console.log("Hi"); };
// sayHi 被提升为 undefined，调用 undefined() 报错
```

---

### 暂时性死区（Temporal Dead Zone，TDZ）

`let` 和 `const` 同样会被提升（引擎知道它们存在），但**不会初始化**。从块作用域开始到声明语句之间的区域，就是 TDZ。在 TDZ 内访问变量会抛出 `ReferenceError`。

```javascript
{
  // TDZ 开始 ↓
  console.log(y); // ReferenceError: Cannot access 'y' before initialization
  let y = 20;     // TDZ 结束 ↑，y 被初始化
  console.log(y); // 20
}
```

**TDZ 的本质**：变量已在词法环境中登记（binding 存在），但处于"未初始化"状态，引擎拒绝读写。

```javascript
// 更隐蔽的 TDZ 场景
let x = "outer";

function foo() {
  console.log(x); // ReferenceError！不是 "outer"
  let x = "inner"; // 这个 let 让整个函数块内 x 进入 TDZ
}
foo();
```

---

### `var` vs `let/const` 提升对比

| 特性 | `var` | `let` / `const` |
|------|-------|-----------------|
| 提升 | ✅ 声明 + 初始化为 `undefined` | ✅ 声明（但不初始化） |
| TDZ | ❌ 无 | ✅ 有 |
| 作用域 | 函数作用域 | 块作用域 |
| 重复声明 | ✅ 允许 | ❌ 报错 |
| 全局属性 | 挂到 `window` | 不挂 |

---

### `const` 的特殊性

`const` 必须在声明时初始化，且不能重新赋值（但对象/数组的内部属性可以修改）。

```javascript
const obj = { name: "Robin" };
obj.name = "Alice"; // ✅ 合法，修改的是属性，不是绑定
obj = {};           // ❌ TypeError，不能重新绑定
```

---

## 在本项目中的应用

在 `packages/shared` 的类型工具和 `apps/api` 的路由模块中，统一使用 `const` 和 `let`，避免 `var` 带来的提升陷阱：

```typescript
// packages/shared/src/types/medical.ts
const MAX_DRUG_NAME_LENGTH = 100; // const：不可变配置

// apps/api/src/routes/drug.ts
export const drugRouter = new Hono();

drugRouter.get("/search", async (c) => {
  const query = c.req.query("q"); // const：单次赋值
  let results = [];               // let：后续可能重新赋值
  // ...
});
```

---

## 易混淆点

**1. "提升"不是物理移动代码**
引擎不会真的把代码挪到顶部，而是在编译阶段提前处理声明。理解为"两阶段执行"更准确。

**2. `let/const` 也提升，只是有 TDZ**
很多人以为 `let/const` 不提升，这是错的。它们被提升了，只是没有初始化。可以用这个验证：
```javascript
let x = 1;
{ console.log(x); } // 1 — 如果 let 不提升，这里应该访问外层 x
{ let x = 2; console.log(x); } // 2 — 块内 let 覆盖外层
```

**3. 函数声明 vs 函数表达式**
只有函数声明（`function foo() {}`）整体提升；函数表达式（`const foo = function() {}`）只提升变量名，值是 `undefined`。

**4. class 也有 TDZ**
```javascript
const p = new Person(); // ReferenceError
class Person {}
```

---

## 面试角度

**标准回答框架：**

1. **什么是提升**：JS 编译阶段会扫描作用域内的声明，`var` 声明被提升并初始化为 `undefined`，函数声明整体提升。

2. **TDZ 是什么**：`let/const` 声明也被提升，但不初始化，从块作用域开始到声明语句之间是 TDZ，访问会抛 `ReferenceError`。

3. **为什么设计 TDZ**：防止在变量初始化前使用，避免 `var` 那种"声明前访问得到 `undefined`"的隐蔽 bug，让代码更可预测。

4. **优先级问题**：同名的函数声明和 `var` 声明，函数声明优先级更高。

**加分点**：结合执行上下文的创建阶段（Creation Phase）来解释，说明 VariableEnvironment 和 LexicalEnvironment 的区别。

---

## 扩展阅读

1. **深入方向**：结合 V8 引擎的 Ignition 解释器，理解变量绑定（binding）的底层实现
2. **实践方向**：ESLint 的 `no-use-before-define` 规则背后的原理，以及 `vars-on-top` 规则为何存在
