# 执行上下文与调用栈（Execution Context & Call Stack）

> 记录时间：2026-05-27
> 关联模块：apps/web（组件渲染栈）、apps/ai-engine（递归调用追踪）、Node.js 后端（错误堆栈分析）
> 重要程度：⭐⭐⭐（面试高频）

---

## 核心概念

### 什么是执行上下文？

执行上下文（Execution Context）是 JavaScript 代码被**解析和执行**时所在环境的抽象概念。可以理解为：每一段代码执行时，JS 引擎为其准备好的"工作台"。

三种类型：

| 类型 | 触发条件 | 数量 |
|------|---------|------|
| 全局执行上下文（GEC） | 代码首次加载 | 唯一一个 |
| 函数执行上下文（FEC） | 函数被调用 | 每次调用创建一个新的 |
| Eval 执行上下文 | eval() 执行 | 严格模式下禁止，几乎不使用 |

### 执行上下文的生命周期

每个执行上下文分两个阶段创建：

```
创建阶段（Creation Phase）
  ├── 确定 this 绑定
  ├── 创建变量环境（Variable Environment）：var 声明 + 函数声明
  └── 创建词法环境（Lexical Environment）：let/const 声明 + 块级作用域

执行阶段（Execution Phase）
  ├── 逐行执行代码
  └── 变量赋值、函数调用
```

### 变量环境 vs 词法环境

```javascript
// 变量环境（Variable Environment）
var a = 1          // 存在变量环境，有变量提升，初始值 undefined
function foo() {}  // 存在变量环境，有函数提升，初始值为函数引用

// 词法环境（Lexical Environment）
let b = 2          // 存在词法环境，有暂时性死区（TDZ）
const c = 3        // 存在词法环境，有暂时性死区（TDZ）
```

**核心区别**：`var` 声明的变量在创建阶段就初始化为 `undefined`（所以可以访问），`let/const` 声明的变量在创建阶段存在但**未初始化**（访问会报 ReferenceError）。

---

## 调用栈（Call Stack）

### 本质

调用栈是 JS 引擎管理执行上下文的**栈结构**（LIFO），用来追踪函数调用链。

```
执行顺序：
  1. 遇到函数调用 → 创建新的 FEC → 压入栈顶
  2. 函数执行完毕 → 弹出栈顶 → 控制权回到调用者
  3. 栈为空 → 全局代码执行完毕
```

### 经典示例

```javascript
function first() {
  console.log('first start')
  second()
  console.log('first end')
}

function second() {
  console.log('second')
}

console.log('global start')
first()
console.log('global end')
```

调用栈变化：

```
① [GEC]                          → 打印 global start
② [GEC, first-EC]                → 打印 first start
③ [GEC, first-EC, second-EC]     → 打印 second
④ [GEC, first-EC]                → second 弹出，打印 first end
⑤ [GEC]                          → first 弹出，打印 global end
⑥ []                             → GEC 弹出，程序结束
```

输出：`global start → first start → second → first end → global end`

### 栈溢出（Stack Overflow）

```javascript
// 递归没有终止条件 → 调用栈无限增长
function infinite() {
  infinite()
}
infinite()
// RangeError: Maximum call stack size exceeded
```

V8 引擎的调用栈大小限制：
- 桌面端：约 10,000 - 25,000 层
- Node.js：约 10,000 层（可通过 `--stack-size` 调整）
- 移动端：更小，约 5,000 - 10,000 层

---

## 执行上下文的创建细节

### 1. 全局执行上下文（GEC）

```javascript
// 创建阶段
// this → 全局对象（浏览器: window, Node.js: globalThis）
// 变量环境：声明提升（var + function）
// 词法环境：let/const 绑定但未初始化

console.log(a)  // undefined（变量提升）
console.log(b)  // ReferenceError（暂时性死区）
var a = 1
let b = 2
```

### 2. 函数执行上下文（FEC）

```javascript
function greet(name) {
  // 创建阶段：
  //   this → 取决于调用方式（见下文）
  //   arguments → { 0: 'Alice', length: 1 }
  //   name → 'Alice'（参数绑定）
  //   var result → undefined
  //   function inner → 函数引用
  
  var result = `Hello, ${name}`
  inner()
  
  function inner() {
    console.log(result)  // 闭包：inner 的作用域链包含 greet 的变量
  }
}
greet('Alice')
```

### 3. 块级作用域

```javascript
{
  // 这不是新的执行上下文，而是词法环境的一个新块
  let x = 1    // 存在块级词法环境
  const y = 2  // 存在块级词法环境
  var z = 3    // 穿透块级，存在于外层函数/GEC 的变量环境
}
console.log(z)  // 3（var 不受块级限制）
console.log(x)  // ReferenceError
```

---

## this 绑定规则

`this` 在执行上下文的**创建阶段**确定，遵循四条规则：

```javascript
// 1. 默认绑定 — 独立调用
function standalone() {
  console.log(this)  // 严格模式: undefined, 非严格: window
}

// 2. 隐式绑定 — 作为对象方法调用
const obj = {
  name: 'test',
  greet() {
    console.log(this.name)  // 'test'（this = obj）
  }
}

// 3. 显式绑定 — call/apply/bind
greet.call(obj)       // this = obj
greet.apply(obj)      // this = obj
const bound = greet.bind(obj)
bound()               // this = obj

// 4. new 绑定 — 构造函数
function Person(name) {
  this.name = name     // this = 新创建的对象
}
const p = new Person('Alice')
```

### 箭头函数的 this

```javascript
// 箭头函数没有自己的 this，继承外层词法作用域的 this
const obj = {
  name: 'test',
  greet() {
    setTimeout(() => {
      console.log(this.name)  // 'test'（继承 greet 的 this）
    }, 100)
  }
}

// 对比普通函数
const obj2 = {
  name: 'test',
  greet() {
    setTimeout(function() {
      console.log(this.name)  // undefined（this = window）
    }, 100)
  }
}
```

**箭头函数的 this 在定义时确定**（词法绑定），普通函数的 this 在调用时确定。

---

## 作用域链（Scope Chain）

每个执行上下文都关联一个作用域链，用于变量查找：

```javascript
const global = 'global'

function outer() {
  const outerVar = 'outer'
  
  function inner() {
    const innerVar = 'inner'
    console.log(global)   // 沿作用域链找到 GEC
    console.log(outerVar) // 沿作用域链找到 outer-EC
    console.log(innerVar) // 当前 EC 直接找到
  }
  
  inner()
}
outer()
```

作用域链 = 当前 EC 的词法环境 + 所有外层 EC 的词法环境（**静态决定，基于代码书写位置**）。

```
inner 的作用域链：
  inner-LE → outer-LE → G-LE
  
查找顺序：inner → outer → global → ReferenceError
```

### 作用域链 vs 调用栈

```javascript
// 作用域链由代码书写位置决定（静态/词法作用域）
// 调用栈由函数调用顺序决定（动态）

function foo() {
  bar()
}

function bar() {
  // 作用域链：bar-LE → G-LE
  // 调用栈：[GEC, foo-EC, bar-EC]
  // 注意：bar 的作用域链不包含 foo，即使 foo 调用了 bar
}
```

---

## 在本项目中的应用

### 1. React 组件渲染栈

```typescript
// apps/web/app/drugs/[id]/page.tsx
// RSC 组件函数执行时，会创建新的执行上下文
// 理解调用栈才能理解组件树的渲染顺序

async function DrugPage({ params }: { params: { id: string } }) {
  // 创建 FEC：this = undefined（模块模式）
  // params 绑定到参数
  const drug = await getDrug(params.id)  // await 暂停，让出调用栈
  return <DrugDetail drug={drug} />       // 继续渲染子组件
}
```

### 2. 错误堆栈分析

```typescript
// apps/api 中的错误处理
try {
  await drugService.query(name)
} catch (error) {
  // error.stack 包含完整的调用栈信息
  // 理解调用栈才能快速定位错误源头
  logger.error(error.stack)
}
```

### 3. 闭包与内存管理

```typescript
// apps/ai-engine 中的流式处理
function createStreamProcessor() {
  const buffer: string[] = []  // 存在于 createStreamProcessor 的变量环境
  
  return function process(chunk: string) {
    buffer.push(chunk)  // 内层函数引用外层变量 → 闭包
    // 即使 createStreamProcessor 执行完毕
    // buffer 仍然被 process 引用，不会被 GC
  }
}
```

---

## 易混淆点

### 1. 执行上下文 ≠ 作用域

```
执行上下文：运行时概念，每次函数调用都创建新的
作用域：代码结构概念，由代码书写位置决定（词法作用域）
```

### 2. 变量提升的本质

```javascript
// 变量提升不是代码"移动"
// 而是执行上下文创建阶段就处理了声明

// 等价理解：
console.log(x)  // undefined
var x = 1

// JS 引擎视角：
// 创建阶段：x → undefined（在变量环境中已注册）
// 执行阶段：console.log(x) → undefined
// 执行阶段：x = 1 → 赋值
```

### 3. 函数提升优先于变量提升

```javascript
console.log(foo)  // ƒ foo() {}（函数声明优先）
var foo = 1
function foo() {}
console.log(foo)  // 1（赋值后覆盖）
```

### 4. 暂时性死区不是"没有提升"

```javascript
{
  // let x 在这个块级词法环境中已注册，但未初始化
  console.log(x)  // ReferenceError（TDZ）
  let x = 1
}
// let/const 有提升，但提升后处于"未初始化"状态
```

---

## 面试角度

### 高频问题

1. **"说说 JavaScript 的执行上下文"**
   - 三种类型（全局、函数、eval）
   - 两个阶段（创建、执行）
   - 变量环境 vs 词法环境
   - this 绑定在创建阶段确定

2. **"什么是调用栈？"**
   - LIFO 结构，管理执行上下文
   - 函数调用入栈，执行完出栈
   - 栈溢出（递归无终止条件）

3. **"var/let/const 的变量提升有什么区别？"**
   - var：提升 + 初始化为 undefined
   - let/const：提升 + 未初始化（TDZ）
   - 函数声明：提升 + 初始化为函数引用

4. **"this 是怎么确定的？"**
   - 四条绑定规则：默认、隐式、显式、new
   - 箭头函数没有自己的 this，继承外层

5. **"作用域链和调用栈有什么区别？"**
   - 作用域链：静态，由代码书写位置决定
   - 调用栈：动态，由函数调用顺序决定

### 加分回答

- 提到 **V8 的隐藏类（Hidden Class）** 和内联缓存对执行上下文的优化
- 提到 **尾调用优化（TCO）** 可以复用执行上下文，避免栈溢出
- 提到 **闭包** 本质是内层函数引用外层执行上下文的变量环境

---

## 扩展阅读

1. **ECMAScript 规范中的执行上下文定义**
   - https://tc39.es/ecma262/#sec-execution-contexts
   - 理解规范中的 LexicalEnvironment、VariableEnvironment、ThisBinding

2. **V8 引擎的调用栈实现**
   - 理解栈帧（Stack Frame）结构
   - 尾调用优化（Tail Call Optimization）的实现条件

---

## 自测问题

**Q：以下代码输出什么？为什么？**

```javascript
var scope = 'global'

function createCounter() {
  var count = 0
  return {
    increment: function() {
      count++
      console.log(this, count)
    },
    decrement: function() {
      count--
      console.log(this, count)
    }
  }
}

const counter = createCounter()
const { increment } = counter

counter.increment()   // ①
counter.increment()   // ②
increment()           // ③
counter.decrement()   // ④
```

<details>
<summary>点击查看答案</summary>

输出：
```
① {increment: ƒ, decrement: ƒ} 1
② {increment: ƒ, decrement: ƒ} 2
③ undefined 3（严格模式）或 Window 3（非严格模式）
④ {increment: ƒ, decrement: ƒ} 2
```

分析：
1. `counter.increment()` — 隐式绑定，this = counter，count 变为 1
2. `counter.increment()` — 隐式绑定，this = counter，count 变为 2
3. `increment()` — **默认绑定**！解构后独立调用，this 不再是 counter。count 变为 3
4. `counter.decrement()` — 隐式绑定，this = counter，count 变为 2

关键：
- 解构 `const { increment } = counter` 不会绑定 this
- 调用方式决定 this，不是函数定义位置
- count 是闭包变量，所有方法共享同一个 count
</details>
