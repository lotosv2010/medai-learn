# 词法环境（Lexical Environment）

> 记录时间：2026-05-27
> 关联模块：apps/web（组件作用域）、apps/ai-engine（闭包工厂）、packages/shared（模块作用域）
> 重要程度：⭐⭐⭐（面试高频）

---

## 执行上下文的组成

每个执行上下文（Execution Context）由三部分构成：

```
┌──────────────────────────────────────────────────────────────────┐
│                      执行上下文（Execution Context）               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  变量环境（Variable Environment）                          │    │
│  │                                                         │    │
│  │  Environment Record（声明式）                             │    │
│  │    ├── var x → undefined（创建阶段初始化）                 │    │
│  │    └── function foo → Function（创建阶段完整提升）          │    │
│  │                                                         │    │
│  │  Outer Reference → 外层词法环境                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  词法环境（Lexical Environment）                           │    │
│  │                                                         │    │
│  │  Environment Record（声明式）                             │    │
│  │    ├── let y → uninitialized（TDZ，创建阶段不初始化）       │    │
│  │    └── const z → uninitialized（TDZ）                    │    │
│  │                                                         │    │
│  │  Outer Reference → 外层词法环境                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  This 绑定（ThisBinding）                                 │    │
│  │    全局 EC：window（浏览器）/ global（Node.js）             │    │
│  │    函数 EC：取决于调用方式                                  │    │
│  │    箭头函数：继承外层 this，无自己的 ThisBinding             │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### 三部分详解

#### 1. 变量环境（Variable Environment）

专门存储 `var` 声明和函数声明，是 ES5 遗留的机制。

```javascript
function example() {
  console.log(a)    // undefined（var 提升，创建阶段已初始化）
  console.log(foo)  // Function（函数声明完整提升）

  var a = 1
  function foo() {}
}
```

**创建阶段行为**：
```
变量环境 Environment Record：
  a   → undefined   ← var 声明，提升并初始化为 undefined
  foo → Function    ← 函数声明，提升并初始化为完整函数体
```

**执行阶段行为**：
```
执行 var a = 1 → a 从 undefined 更新为 1
```

#### 2. 词法环境（Lexical Environment）

存储 `let`/`const` 声明，支持块级作用域，是 ES6 引入的机制。

```javascript
function example() {
  console.log(b)  // ReferenceError（TDZ）
  console.log(c)  // ReferenceError（TDZ）

  let b = 2
  const c = 3
}
```

**创建阶段行为**：
```
词法环境 Environment Record：
  b → uninitialized  ← let，注册但不初始化（TDZ 开始）
  c → uninitialized  ← const，注册但不初始化（TDZ 开始）
```

**执行阶段行为**：
```
执行 let b = 2   → b 从 uninitialized 变为 2（TDZ 结束）
执行 const c = 3 → c 从 uninitialized 变为 3（TDZ 结束）
```

**变量环境 vs 词法环境对比**：

| 维度 | 变量环境 | 词法环境 |
|------|---------|---------|
| 存储内容 | `var`、函数声明 | `let`、`const`、块级作用域 |
| 创建阶段 | 初始化为 `undefined` / 函数体 | 注册为 `uninitialized` |
| 变量提升 | 有 | 无（有 TDZ） |
| 块级作用域 | 不支持 | 支持 |
| 历史 | ES5 | ES6 引入 |

#### 3. This 绑定（ThisBinding）

记录当前执行上下文的 `this` 值，由调用方式决定，不是定义时决定。

```javascript
const obj = {
  name: 'obj',

  // 普通函数：this 由调用方式决定
  regular() {
    console.log(this.name)  // 'obj'（方法调用）
  },

  // 箭头函数：无自己的 ThisBinding，继承外层
  arrow: () => {
    console.log(this)  // window（定义时外层是全局）
  },

  nested() {
    const inner = () => {
      console.log(this.name)  // 'obj'（继承 nested 的 this）
    }
    inner()
  }
}
```

**ThisBinding 的四种绑定规则**：

```
1. 默认绑定：foo()          → this = window（严格模式 undefined）
2. 隐式绑定：obj.foo()      → this = obj
3. 显式绑定：foo.call(ctx)  → this = ctx
4. new 绑定：new Foo()      → this = 新创建的对象
```

**优先级**：new > 显式 > 隐式 > 默认

### 执行上下文的生命周期

```
函数调用
  ↓
【创建阶段】
  ├── 创建变量环境：var/函数声明 → 提升初始化
  ├── 创建词法环境：let/const → uninitialized（TDZ）
  └── 确定 ThisBinding
  ↓
【执行阶段】
  ├── 逐行执行代码
  ├── 变量赋值（var 从 undefined 更新，let/const 从 uninitialized 初始化）
  └── 函数调用 → 创建新的执行上下文压栈
  ↓
【销毁阶段】
  ├── 函数执行完毕，执行上下文出栈
  └── 无闭包引用 → 词法环境被 GC 回收
```

### 完整示例：三部分协同工作

```javascript
var globalVar = 'global'
let globalLet = 'globalLet'

function foo(param) {
  var localVar = 'local'
  let localLet = 'localLet'

  console.log(this)      // ThisBinding
  console.log(param)     // 变量环境（参数）
  console.log(localVar)  // 变量环境
  console.log(localLet)  // 词法环境
}

foo.call({ name: 'ctx' }, 'arg')
```

**foo 执行上下文的内部状态**：
```
ThisBinding: { name: 'ctx' }

变量环境 EnvironmentRecord:
  param    → 'arg'    （参数，创建阶段初始化）
  localVar → undefined → 'local'

词法环境 EnvironmentRecord:
  localLet → uninitialized → 'localLet'

Outer Reference → 全局词法环境
```

---

## 核心概念

### 什么是词法环境？

词法环境是 ECMAScript 规范中的**内部机制**，用于管理变量的存储和查找。每个执行上下文都包含一个词法环境。

```
词法环境 = Environment Record + Outer Reference

Environment Record：存储当前作用域内的变量绑定
Outer Reference：指向外层词法环境（形成作用域链）
```

### 词法环境 vs 变量环境

执行上下文创建阶段会创建两个环境：

```
┌─────────────────────────────────────────────────────────────┐
│                     执行上下文（EC）                          │
├─────────────────────────────────────────────────────────────┤
│  变量环境（Variable Environment）                              │
│    └── var 声明的变量                                         │
│    └── 函数声明                                               │
│    └── 特点：有变量提升，初始值 undefined                       │
├─────────────────────────────────────────────────────────────┤
│  词法环境（Lexical Environment）                              │
│    └── let/const 声明的变量                                    │
│    └── 块级作用域                                             │
│    └── 特点：有暂时性死区（TDZ），未初始化前不可访问              │
└─────────────────────────────────────────────────────────────┘
```

**简化理解**：变量环境是词法环境的一种特殊情况。ES6+ 中，两者逐渐融合，但规范仍区分它们以兼容 `var` 的行为。

---

## 词法环境的类型

### 1. 声明式词法环境（Declarative Environment）

```javascript
function foo() {
  const x = 1
  let y = 2

  if (true) {
    let z = 3  // 新的声明式词法环境
    const w = 4
  }
}
```

用于：函数作用域、块级作用域、catch 子句

### 2. 对象式词法环境（Object Environment）

```javascript
// 全局作用域就是对象式词法环境
var global = 'global'
let block = 'block'

// 全局词法环境的 Environment Record 是一个对象
// 可以理解为：window/var → 对象属性，let/const → 普通绑定
```

用于：全局作用域（Environment Record 关联全局对象）

### 3. 模块词法环境（Module Environment）

```javascript
// module.js
export const name = 'module'
import { foo } from './other'

function bar() {
  // 模块词法环境，import 绑定是只读的
}
```

用于：ES Module 的顶层作用域

---

## 环境记录（Environment Record）

### 声明式环境记录

```javascript
{
  // [[EnvironmentRecord]] 内部结构
  bindings: {
    x: { value: 1, mutable: true, deletable: false },   // let
    y: { value: 2, mutable: false, deletable: false },   // const
    foo: { value: Function, mutable: false }              // 函数声明
  }
}
```

**绑定描述符**：
- `value`：当前值
- `mutable`：是否可变（`const` 为 false）
- `deletable`：是否可删除（`let/const` 为 false）

### 对象式环境记录

```javascript
// 全局环境记录
{
  [[ObjectRecord]]: window,  // 关联全局对象
  [[GlobalThisValue]]: window,
  [[DeclarativeRecord]]: { ... },  // let/const 在这里
  [[OuterEnv]]: null
}

// var 声明的变量在 [[ObjectRecord]] 上
// let/const 声明的变量在 [[DeclarativeRecord]] 上
```

---

## 词法环境的创建时机

### 1. 全局词法环境

```javascript
// 程序启动时创建
// Outer Reference: null
// Environment Record: Object Environment Record

console.log(x)  // undefined（var 提升）
console.log(y)  // ReferenceError（TDZ）

var x = 1
let y = 2
```

### 2. 函数词法环境

```javascript
function outer() {
  // outer 的词法环境
  // Outer Reference: 全局词法环境

  function inner() {
    // inner 的词法环境
    // Outer Reference: outer 的词法环境
  }
}
```

**调用时机**：函数被调用时创建，不是定义时。

### 3. 块级词法环境

```javascript
function foo() {
  let x = 1

  {
    // 新的块级词法环境
    // Outer Reference: foo 的词法环境
    let y = 2
    const z = 3
    var w = 4  // 穿透块级，存储在 foo 的变量环境中
  }

  console.log(x)  // 1
  console.log(y)  // ReferenceError
  console.log(w)  // 4
}
```

### 4. catch 子句词法环境

```javascript
try {
  throw new Error('error')
} catch (e) {
  // e 存储在 catch 的词法环境中
  console.log(e)  // Error: error
}
console.log(e)  // ReferenceError
```

---

## 暂时性死区（TDZ）详解

### TDZ 的本质

```javascript
{
  // 块级词法环境创建时，x 已经被注册到 Environment Record
  // 但状态是 "uninitialized"（未初始化）

  console.log(x)  // ReferenceError: Cannot access 'x' before initialization

  // 这一行之后，x 的状态变为 "initialized"
  let x = 1
}
```

**时间轴**：
```
进入块级作用域
  ↓
创建词法环境，x → uninitialized
  ↓
执行代码，遇到 console.log(x)
  ↓
检查 x 状态：uninitialized → 抛出 ReferenceError
  ↓
执行 let x = 1
  ↓
x 状态变为 initialized
```

### TDZ 检测

```javascript
let x = 'outer'

{
  // x 这里是块内的 let x，不是外层的
  console.log(x)  // ReferenceError（TDZ）

  let x = 'inner'
}
```

**关键**：TDZ 检查发生在**运行时**，不是编译时。JavaScript 是动态语言，TDZ 是规范定义的运行时行为。

---

## 词法环境与作用域链

### 作用域链的构建

```javascript
const a = 'global'

function outer() {
  const b = 'outer'

  function middle() {
    const c = 'middle'

    function inner() {
      const d = 'inner'
      console.log(a, b, c, d)
    }

    inner()
  }

  middle()
}
```

作用域链构建过程：

```
inner 创建时：
  inner.LE = {
    bindings: { d: 'inner' },
    outer: middle.LE
  }

middle.LE = {
  bindings: { c: 'middle' },
  outer: outer.LE
}

outer.LE = {
  bindings: { b: 'outer' },
  outer: global.LE
}

global.LE = {
  bindings: { a: 'global', outer: undefined },
  outer: null
}

inner 的作用域链：
  inner.LE → middle.LE → outer.LE → global.LE → null
```

### 查找过程

```javascript
function inner() {
  console.log(a)  // 查找过程：
  // 1. inner.LE → 没有 a
  // 2. middle.LE → 没有 a
  // 3. outer.LE → 没有 a
  // 4. global.LE → 找到 a = 'global' → 返回
}
```

---

## 词法环境与闭包

### 闭包的底层机制

```javascript
function createCounter() {
  let count = 0  // 存储在 createCounter 的词法环境中

  return function increment() {
    // increment 的 [[Environment]] 指向 createCounter 的词法环境
    count++
    return count
  }
}

const counter = createCounter()
counter()  // 1
counter()  // 2
```

**内存结构**：

```
createCounter 执行完毕后：

createCounter.LE = {
  bindings: { count: 0 },
  outer: global.LE
}
  ↑
  │ 被 increment 的 [[Environment]] 引用
  │
increment = {
  [[Environment]]: createCounter.LE
}

GC 检查：
  - createCounter.LE 被 increment 引用 → 不回收
  - count 变量继续存在
```

### 闭包共享词法环境

```javascript
function createCounters() {
  let shared = 0  // 共享变量

  return {
    increment: function() { shared++; return shared },
    decrement: function() { shared--; return shared },
    getValue: function() { return shared }
  }
}

const { increment, decrement, getValue } = createCounters()
increment()  // 1
increment()  // 2
decrement()  // 1
getValue()   // 1
// 三个函数共享同一个词法环境
```

---

## V8 引擎的优化

### 1. 词法环境裁剪（Lexical Environment Pruning）

```javascript
function setup() {
  const hugeData = new Array(1000000).fill('x')
  const smallValue = 42

  return function process() {
    // 只引用 smallValue，不引用 hugeData
    return smallValue * 2
  }
}

const process = setup()
// V8 优化：process 的词法环境只包含 smallValue
// hugeData 可能被裁剪掉，节省内存
```

**前提**：闭包函数没有引用的变量，V8 可能自动排除。

### 2. 栈上分配（Stack Allocation）

```javascript
function foo() {
  let x = 1
  let y = 2

  // 如果 x, y 不被闭包引用
  // V8 可能将它们分配在栈上，而不是堆上
  return x + y
}
```

### 3. 内联缓存（Inline Cache）

```javascript
function process(obj) {
  return obj.x + obj.y
}

// V8 会缓存 obj 的形状（Hidden Class）
// 下次调用时直接使用缓存的偏移量，避免查找
```

---

## 在本项目中的应用

### 1. React 组件的词法环境

```typescript
// apps/web/app/drugs/page.tsx
function DrugListPage() {
  // 组件函数调用时创建新的词法环境
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [search, setSearch] = useState('')

  // handleSearch 是闭包，引用了 search
  const handleSearch = useCallback(() => {
    fetchDrugs(search)  // search 来自词法环境
  }, [search])

  // handleClick 引用了 search（可能是旧值）
  const handleClick = () => {
    setTimeout(() => {
      console.log(search)  // 闭包引用的是词法环境中的 search
    }, 3000)
  }

  return <DrugList drugs={drugs} onSearch={handleSearch} />
}
```

**关键理解**：React 组件每次渲染都会创建新的词法环境，useCallback/useMemo 控制闭包引用哪个词法环境。

### 2. AI 流式处理器的词法环境

```typescript
// apps/ai-engine 中的流式处理
function createStreamProcessor() {
  // 词法环境 A
  const buffer: string[] = []
  let isProcessing = false

  return {
    // 方法 1：引用词法环境 A
    append(chunk: string) {
      buffer.push(chunk)
    },

    // 方法 2：引用词法环境 A
    process() {
      if (isProcessing) return
      isProcessing = true
      // ...
    },

    // 方法 3：引用词法环境 A
    getBuffer() {
      return [...buffer]  // 返回副本，防止外部修改
    }
  }
}
```

### 3. 模块作用域的词法环境

```typescript
// packages/shared/utils/validation.ts
// 模块词法环境

const VALIDATION_RULES = { ... }  // 模块级绑定

export function createValidator(rules: ValidationRule[]) {
  // createValidator 调用时创建新的词法环境
  // rules 通过闭包保留

  return function validate(data: Record<string, unknown>) {
    // validate 的词法环境 → createValidator 的词法环境 → 模块词法环境
    const errors: string[] = []

    for (const rule of rules) {
      if (!rule.check(data[rule.field])) {
        errors.push(rule.message)
      }
    }

    return errors
  }
}
```

---

## 易混淆点

### 1. 词法环境 ≠ 作用域

```
词法环境：规范内部机制，存储变量绑定
作用域：代码结构概念，变量的可访问范围

词法环境是作用域的底层实现
```

### 2. 词法环境创建 ≠ 函数定义

```javascript
function outer() {
  const x = 1

  function inner() {
    console.log(x)
  }

  return inner
}

// inner 定义时：inner.[[Environment]] = outer.LE
// outer 调用时：创建 outer.LE
// inner 调用时：创建 inner.LE，outer.LE 作为 outer 引用
```

**词法环境在函数调用时创建，不是定义时。**

### 3. 块级作用域是词法环境

```javascript
{
  // 这不是新的执行上下文
  // 而是新的词法环境
  let x = 1
}

// 块级词法环境是函数词法环境的子环境
```

### 4. var 不创建新的词法环境

```javascript
function foo() {
  var x = 1  // 存储在 foo 的变量环境中

  if (true) {
    var y = 2  // 仍然存储在 foo 的变量环境中
    let z = 3  // 存储在新的块级词法环境中
  }

  console.log(x, y)  // 1, 2
  console.log(z)      // ReferenceError
}
```

---

## 面试角度

### 高频问题

1. **"什么是词法环境？"**
   - ECMAScript 规范的内部机制
   - 由 Environment Record + Outer Reference 组成
   - 用于变量存储和作用域链构建

2. **"词法环境和变量环境有什么区别？"**
   - 变量环境：var 声明、函数声明
   - 词法环境：let/const、块级作用域
   - 两者都是执行上下文的一部分

3. **"暂时性死区是怎么实现的？"**
   - 词法环境创建时变量已注册但未初始化
   - 访问未初始化的变量抛出 ReferenceError
   - 是运行时行为，不是编译时

4. **"闭包的底层机制是什么？"**
   - 函数的 [[Environment]] 指向外层词法环境
   - 外层词法环境被引用，GC 不回收
   - 词法环境裁剪优化

5. **"词法环境什么时候创建？"**
   - 全局词法环境：程序启动时
   - 函数词法环境：函数调用时
   - 块级词法环境：进入块时

### 加分回答

- 提到 **Environment Record 的两种类型**：声明式和对象式
- 提到 **V8 的词法环境裁剪优化**：闭包不引用的变量可能被排除
- 提到 **模块词法环境** 的特殊性：import 绑定是只读的
- 提到 **尾调用优化** 复用词法环境的可能性

---

## 扩展阅读

1. **ECMAScript 规范中的词法环境定义**
   - https://tc39.es/ecma262/#sec-lexical-environments
   - 理解 Environment Record、GetIdentifierReference 等抽象操作

2. **V8 引擎的词法环境实现**
   - Context 和 Scope 对象
   - 词法环境裁剪（Lexical Environment Pruning）
   - 栈上分配 vs 堆上分配

---

## 自测问题

**Q：以下代码输出什么？为什么？**

```javascript
let x = 10

function outer() {
  let x = 20

  function inner() {
    console.log(x)  // ①

    let x = 30
    console.log(x)  // ②
  }

  inner()
}

outer()
console.log(x)  // ③

// 对比：
function createFunctions() {
  const fns = []

  for (var i = 0; i < 3; i++) {
    fns.push(function() {
      return i
    })
  }

  return fns
}

const [f1, f2, f3] = createFunctions()
console.log(f1())  // ④
console.log(f2())  // ⑤
console.log(f3())  // ⑥
```

<details>
<summary>点击查看答案</summary>

输出：
```
① ReferenceError（TDZ）
② 30
③ 10
④ 3
⑤ 3
⑥ 3
```

**分析**：

1. **① ReferenceError**：
   - inner 的词法环境创建时，`let x` 已注册但未初始化
   - console.log(x) 访问的是 inner.LE 中的 x（TDZ）
   - 不是 outer.LE 中的 x（作用域链查找在当前环境就停了）

2. **② 30**：
   - let x = 30 执行后，x 从 uninitialized 变为 initialized
   - console.log(x) 访问到 inner.LE 中的 x = 30

3. **③ 10**：
   - outer 的词法环境和 global 的词法环境是独立的
   - global.LE 中的 x = 10 不受 inner.LE 中的 x 影响

4. **④⑤⑥ 全部输出 3**：
   - `var i` 存储在 createFunctions 的变量环境中
   - 三个函数的 [[Environment]] 都指向同一个词法环境
   - 循环结束后 i = 3，三个函数引用同一个 i

**关键理解**：
- TDZ 检查发生在当前词法环境，不走作用域链
- var 的变量提升是存储在变量环境中，创建阶段就初始化为 undefined
- let/const 的 TDZ 是存储在词法环境中，创建阶段未初始化

</details>
