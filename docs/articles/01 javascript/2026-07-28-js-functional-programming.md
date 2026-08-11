# 函数式编程完全指南：从纯函数到函子，React/Vue3 背后的编程哲学

> 面试官问「说说函数式编程」，大多数人只会说「纯函数、不可变数据」。能把柯里化、函数组合、函子串成一套系统讲清楚的，才是真正理解了 FP 的本质。

---

## 🎯 这篇文章解决什么问题

React Hooks、Vue3 Composition API、Lodash/fp、RxJS——这些你每天用的工具背后都在践行函数式编程的思想。不理解 FP，你就只是在用 API；理解了 FP，你才能理解为什么这样设计。

这篇文章从「函数是一等公民」出发，讲透纯函数、柯里化、函数组合三大核心，再到函子如何优雅地管理副作用，**既讲清楚每个概念的原理和代码，也告诉你面试怎么答才能体现出系统性思维**。

---

## 🤔 为什么要学函数式编程

函数式编程（Functional Programming，FP）是编程范式之一，和面向对象编程（OOP）并列。核心思维方式：**把现实世界的事物和事物之间的联系抽象到程序世界，对运算过程进行抽象**。

用数学的角度理解：`y = f(x)`，x 到 y 的映射关系就是函数。函数式编程中的「函数」指的是数学中的函数（映射关系），而不是程序中的方法——**相同的输入始终得到相同的输出**。

```javascript
// 非函数式：依赖外部状态
const num1 = 2
const num2 = 3
const sum = num1 + num2

// 函数式：对运算过程进行抽象
function add(n1, n2) { return n1 + n2 }
const sum = add(2, 3)
```

为什么值得学？

- 函数式编程随着 **React 的流行**受到越来越多关注，**Vue3 也开始拥抱函数式编程**
- 可以抛弃 `this`，消除大量隐式依赖
- 打包时可以更好地利用 **tree shaking** 过滤无用代码
- 方便测试、方便并行处理
- 有 lodash、underscore、ramda 等成熟库支持

> 💬 **面试官**：函数式编程和面向对象编程的区别是什么？React Hooks 体现了哪些函数式编程思想？
>
> ✅ 标准答案：OOP 把数据和行为封装成对象，FP 把程序看作数据的变换管道——函数接收输入、产出输出，没有副作用。React Hooks 体现了：纯函数组件（相同 props → 相同 UI）、高阶函数（自定义 Hook 返回 Hook）、函数组合（多个 Hook 组合使用）。
>
> 🎁 加分答案：说出 Vue3 Composition API 的设计动机——Options API 按选项类型组织代码（data/methods/computed），FP 风格的 Composition API 按**逻辑关注点**组织，更容易提取复用逻辑，这正是函数式「对运算过程进行抽象」思想的体现。

---

## 🧩 函数：一等公民与高阶函数

### 函数是一等公民

在 JavaScript 中，函数是一个普通对象（可以通过 `new Function()` 创建）。可以把函数存储到变量或数组中，作为另一个函数的参数和返回值，甚至在运行时构造新函数：

```javascript
// 1. 函数赋值给变量
let add1 = add

// 2. 函数作为参数
function exec(fn, a, b) { fn(a, b) }

// 3. 函数作为返回值
function exec(fn) {
  return function(a, b) { return fn(a, b) }
}
```

函数是一等公民是学习高阶函数、柯里化等的基础。

### 高阶函数

高阶函数（Higher-order function）：**可以把函数作为参数传递给另一个函数**，或**可以把函数作为另一个函数的返回结果**。

**函数作为参数**——实现 forEach、filter 等通用操作：

```javascript
function forEach(array, fn) {
  for (let i = 0; i < array.length; i++) { fn(array[i], i) }
}

function filter(array, fn) {
  const result = []
  for (let i = 0; i < array.length; i++) {
    if (fn(array[i], i)) result.push(array[i])
  }
  return result
}

const arr = [1, 2, 4, 7, 8]
forEach(arr, (item, i) => console.log(item, i))
filter(arr, (item) => item > 2) // [4, 7, 8]
```

**函数作为返回值**——once 函数，只执行一次：

```javascript
function once(fn) {
  let done = false
  return function() {
    if (!done) { done = true; return fn.apply(this, arguments) }
  }
}

const pay = (money) => console.log(`pay ${money} RMB`)
const oncePay = once(pay)
oncePay(4) // pay 4 RMB
oncePay(5) // 无输出
oncePay(6) // 无输出
```

高阶函数的意义：**抽象可以帮我们屏蔽细节，只需要关注与目标相关的内容**。高阶函数用来抽象通用问题，让我们从过程式的 `for` 循环中解放出来。

常用的高阶函数：`forEach`、`filter`、`map`、`every`、`some`、`find/findIndex`、`reduce`、`sort`。

以下是 map、every、some、find、findIndex 的手写实现：

```javascript
function map(array, fn) {
  const result = []
  for (let i = 0; i < array.length; i++) result.push(fn(array[i], i))
  return result
}

function every(array, fn) {
  for (let i = 0; i < array.length; i++) {
    if (!fn(array[i], i)) return false
  }
  return true
}

function some(array, fn) {
  for (let i = 0; i < array.length; i++) {
    if (fn(array[i], i)) return true
  }
  return false
}
```

```javascript
function find(array, fn) {
  for (let i = 0; i < array.length; i++) {
    if (fn(array[i], i)) return array[i]
  }
  return undefined
}

function findIndex(array, fn) {
  for (let i = 0; i < array.length; i++) {
    if (fn(array[i], i)) return i
  }
  return -1
}
```

### 闭包

**闭包（Closure）**：函数和其周围的状态（词法环境）的引用捆绑在一起形成闭包，可以在另一个作用域中调用一个函数的内部函数，并访问到该函数作用域中的成员。

```javascript
// once 就是闭包的典型应用
function once(fn) {
  let done = false        // 👈 done 被内部函数「捕获」
  return function() {
    if (!done) { done = true; return fn.apply(this, arguments) }
  }
}
```

闭包的本质：函数执行完毕后会从执行栈上移除，**但堆上的作用域成员因为被外部引用不能释放**，因此内部函数依然可以访问外部函数的成员。

两个实用案例：

```javascript
// 案例一：生成幂运算函数
export function makePower(power) {
  return function(number) { return Math.pow(number, power) }
}

// 案例二：生成薪资计算函数
export function makeSalary(base) {
  return function(performance) { return base + performance }
}
```

```javascript
// 使用
const square = makePower(2)
const cube   = makePower(3)
console.log(square(2)) // 4
console.log(cube(2))   // 8

const level1 = makeSalary(10000)
const level2 = makeSalary(15000)
console.log(level1(1000)) // 11000
console.log(level2(3000)) // 18000
```

> 💬 **面试官**：闭包是什么？会造成内存泄漏吗？
>
> ✅ 标准答案：闭包是函数与其词法环境的引用组合，让内部函数能访问外部函数的变量。执行栈上的函数帧会被清除，但被内部函数引用的堆上作用域成员不会释放，这是闭包的核心机制。内存泄漏取决于使用方式——如果闭包生命周期过长且引用了大量数据，才会造成问题。
>
> 🎁 加分答案：once、memoize、防抖节流都是闭包的经典应用。React Hooks 的实现本质上也依赖闭包——useState 的 setter 通过闭包捕获了 fiber 节点的引用，所以才能在组件函数外部（事件回调中）更新状态。

---

## 🏗️ 三大核心：纯函数、柯里化、函数组合

### 纯函数

**纯函数（pure function）**：相同的输入永远会得到相同的输出，而且没有任何可观察的副作用。类似数学中的 `y = f(x)`。

![纯函数示意](https://cdn.nlark.com/yuque/0/2022/png/738210/1651803701146-cc817053-92eb-4e5b-98a0-c0198d29d5b8.png)

lodash 是一个纯函数的功能库，提供了对数组、数字、对象、字符串、函数等操作的一些方法。数组的 `slice` 和 `splice` 分别是纯函数和不纯的函数：
- `slice` 返回数组指定部分，**不改变原数组**（纯函数）
- `splice` 对数组操作后返回该数组，**会改变原数组**（不纯）

```javascript
const array = [1, 2, 3, 4, 5]

// 纯函数：每次结果相同，不改变原数组
console.log(array.slice(0, 3)) // [1, 2, 3]
console.log(array.slice(0, 3)) // [1, 2, 3]

// 不纯的函数：每次结果不同，改变了原数组
console.log(array.splice(0, 3)) // [1, 2, 3]
console.log(array.splice(0, 3)) // [4, 5]
console.log(array.splice(0, 3)) // []
```

**纯函数的三大好处**

**可缓存（memoize）**：因为纯函数对相同输入始终有相同结果，可以把结果缓存起来。

下面是 lodash 的 `_.memoize` 使用和手动实现：

```html
<script src="https://cdn.bootcss.com/lodash.js/4.17.21/lodash.js"></script>
<script>
  function getArea(r) {
    console.log(`r = ${r}`)    // 只在第一次调用时打印
    return Math.PI * r * r
  }
  const getAreaWithMemory = _.memoize(getArea)
  console.log(getAreaWithMemory(4)) // 计算
  console.log(getAreaWithMemory(4)) // 直接读缓存
</script>
```

手动实现 memoize：

```javascript
function memoize(fn) {
  const cache = {}
  return function() {
    const key = JSON.stringify(arguments)
    cache[key] = cache[key] ?? fn.apply(fn, arguments) // 👈 有缓存就直接用
    return cache[key]
  }
}
```

**可测试**：纯函数让单元测试更方便，不需要 mock 外部依赖。

**并行处理**：纯函数不需要访问共享内存数据，可以在多线程环境（Web Worker）下任意并行运行。

**副作用**

副作用让函数变得不纯——如果函数依赖于外部状态，就无法保证相同输入得到相同输出：

```javascript
// 不纯的：依赖外部变量 mini
const mini = 18
function checkAge(age) { return age >= mini }

// 纯的：内部维护自己的状态（有硬编码，后续用柯里化解决）
function checkAge(age) {
  const mini = 18
  return age >= mini
}
```

副作用来源：配置文件、数据库、用户输入……所有的外部交互都可能带来副作用。副作用不可能完全禁止，目标是**尽可能控制它们在可控范围内发生**。

> 💬 **面试官**：什么是纯函数？React 为什么要求组件是纯函数？
>
> ✅ 标准答案：纯函数是相同输入永远得到相同输出、没有可观察副作用的函数。React 要求组件纯函数，是因为它需要在 Concurrent Mode 下**暂停、恢复、重新执行**渲染函数——如果组件有副作用，重复执行会产生不一致的结果。
>
> 🎁 加分答案：这也是 React 18 的 `<StrictMode>` 在开发环境下**故意执行两次**组件函数的原因——帮你发现组件中不纯的代码。

### 柯里化（Currying）

用柯里化解决上面那个「硬编码 mini = 18」的问题：

```javascript
// 普通纯函数：每次都要传两个参数
function checkAge(min, age) { return age >= min }

// 柯里化：先固定 min，得到一个专用函数
function checkAge(min) {
  return function(age) { return age >= min }
}

// ES6 箭头函数写法
const checkAge = min => age => age >= min

const checkAge18 = checkAge(18)
const checkAge20 = checkAge(20)
console.log(checkAge18(24)) // true
console.log(checkAge20(24)) // true
```

**柯里化的概念**：当一个函数有多个参数时，先传递一部分参数调用它（这部分参数以后永远不变），然后返回一个新函数接受剩余参数，返回结果。

**Lodash 的 `_.curry`**：创建一个函数，接受一个或多个 func 的参数；如果所需参数都被提供则执行并返回结果，否则继续返回函数等待剩余参数：

```html
<script src="https://cdn.bootcss.com/lodash.js/4.17.21/lodash.js"></script>
<script>
  function getSum(a, b, c) { return a + b + c }
  const curried = _.curry(getSum)

  console.log(curried(1, 2, 3))  // 6
  console.log(curried(1, 2)(3))  // 6
  console.log(curried(1)(2)(3))  // 6
</script>
```

实际案例——用柯里化组合正则匹配和数组过滤：

```javascript
const match  = _.curry((reg, str) => str.match(reg))
const filter = _.curry((func, array) => array.filter(func))

const haveSpace  = match(/\s+/g)
const haveNumber = match(/\d+/g)
const findSpace  = filter(haveSpace)

console.log(haveSpace('hello world'))              // [' ']
console.log(haveNumber('abc'))                     // null
console.log(findSpace(['john conner', 'john_Donne'])) // ['john conner']
```

**柯里化原理实现**（递归方式）：

```javascript
function curry(func) {
  return function curriedFn(...args) {
    if (args.length >= func.length) return func(...args) // 👈 参数够了就执行
    return function() {
      return curriedFn(...args.concat(Array.from(arguments)))
    }
  }
}

const curried = curry((a, b, c) => a + b + c)
console.log(curried(1, 3, 2)) // 6
console.log(curried(1, 3)(2)) // 6
console.log(curried(1)(3)(2)) // 6
```

柯里化的价值总结：
- 给函数传递较少的参数，得到一个**已经记住了某些固定参数**的新函数
- 这是一种对函数参数的**缓存**
- 让函数变得更灵活，颗粒度更小
- 可以把多元函数转换成一元函数，方便函数组合

> 💬 **面试官**：柯里化是什么？和偏函数有什么区别？
>
> ✅ 标准答案：柯里化是把接受多个参数的函数转换成一系列接受单一参数的函数。偏函数是固定一个函数的一个或多个参数，返回一个接受剩余参数的函数。区别在于：柯里化每次只接受一个参数（严格意义上），偏函数可以一次固定多个参数。
>
> 🎁 加分答案：lodash 的 `_.curry` 是「自动柯里化」——它不强制每次只传一个参数，而是「参数够了就执行，不够就返回新函数」，这实际上是柯里化 + 偏函数的混合，更实用。

### 函数组合（Compose）

纯函数和柯里化很容易写出「洋葱代码」：`h(g(f(x)))`。

比如获取数组的最后一个元素再转换成大写：`_.toUpper(_.first(_.reverse(array)))`。

![洋葱代码示意](https://cdn.nlark.com/yuque/0/2022/png/738210/1651825818166-e4c9037a-7500-41c5-a499-618d241e21ef.png)

函数组合可以让我们把细粒度的函数重新组合成一个新函数，让数据流过多个管道：

![管道示意图（单个函数）](https://cdn.nlark.com/yuque/0/2022/png/738210/1651826008767-100f3945-dbb0-4a6b-979f-e77ce432c5cb.png)

当函数比较复杂时，把它拆分成多个小函数，数据依次流过每个管道：

![管道示意图（多个函数）](https://cdn.nlark.com/yuque/0/2022/png/738210/1651826308949-831c1470-be63-4dd5-9955-c5d7f5284571.png)

```javascript
fn = compose(f1, f2, f3)
b  = fn(a) // a 依次流过 f3 → f2 → f1
```

**函数组合默认从右到左执行**。

最简单的 compose 实现（两个函数）：

```javascript
export function compose(f, g) {
  return function(value) { return f(g(value)) }
}
```

实际使用：

```javascript
import { compose } from './index.js'

function reverse(array) { return array.reverse() }
function first(array)   { return array[0] }

const composed = compose(first, reverse)
console.log(composed([1, 2, 3, 4, 5])) // 5
```

**Lodash 的 `_.flowRight`**（多函数组合，从右到左）：

```javascript
const flowed = _.flowRight(first, reverse)
console.log(flowed([1, 2, 3, 4, 5])) // 5
```

**函数组合原理**（支持任意多个函数）：

```javascript
// 基本实现
function compose(...args) {
  return function(value) {
    return args.reverse().reduce((pre, fn) => fn(pre), value)
  }
}

// 箭头函数简化
const compose = (...args) => value => args.reverse().reduce((pre, fn) => fn(pre), value)
```

组合多个函数的例子：

```javascript
function reverse(array) { return array.reverse() }
function first(array)   { return array[0] }
function toUpper(str)   { return str.toLocaleUpperCase() }

const composed = compose(toUpper, first, reverse)
console.log(composed(['hello', 'world', 'welcome']))  // WELCOME
```

**结合律**：函数组合满足结合律，可以灵活地对函数进行分组：

```javascript
const fn = compose(f, g, h)
// 以下两种组合方式结果完全一致：
const associative = compose(compose(f, g), h) // == compose(f, compose(g, h))
```

**组合函数调试**：使用带 tag 的 trace 函数在管道中打印中间值：

```javascript
const curry = /* 柯里化实现 */
const compose = /* 组合实现 */

const trace = curry((tag, v) => { console.log(tag, v); return v })

const split = curry((sep, str) => str.split(sep))
const join  = curry((sep, array) => array.join(sep))
const map   = curry((fn, array) => array.map(fn))

const composed = compose(
  join('-'),
  trace('map 之后'),
  map(v => v.toUpperCase()),
  trace('split 之后'),
  split(' ')
)
console.log(composed('nerver say die'))
```

> 💬 **面试官**：函数组合和 Promise 链有什么关系？
>
> ✅ 标准答案：两者都是数据管道的思想——数据流过一系列变换，每一步的输出是下一步的输入。区别是：函数组合处理同步数据变换，Promise 链处理异步操作序列。RxJS 的 pipe 操作符则把两者统一了——用函数组合的方式处理异步数据流。
>
> 🎁 加分答案：React 的中间件（Redux middleware）就是函数组合的应用——`applyMiddleware(logger, thunk)` 返回的是多个 middleware 组合后的增强版 dispatch，这是「AOP + 函数组合」的经典案例。

---

## 🛠️ Lodash/fp 与 Pointfree 风格

### Lodash/fp 模块

lodash 的 fp 模块提供了对**函数式编程友好**的方法，特点是：auto-curried（已经柯里化）、iteratee-first（函数优先）、data-last（数据滞后）。

```javascript
const _  = require('lodash')
const fp = require('lodash/fp')

const array = ['a', 'b', 'c']
const str   = 'Hello world'

// lodash 普通版：数据在前，函数在后
console.log(_.map(array, _.toUpper))  // ['A', 'B', 'C']
console.log(_.split(str, ' '))        // ['Hello', 'world']

// lodash/fp 版：函数在前，数据在后（利于柯里化和组合）
console.log(fp.map(fp.toUpper)(array))    // ['A', 'B', 'C']
console.log(fp.split(' ')(str))           // ['Hello', 'world']
```

### Pointfree 编程风格

**PointFree**：把数据处理的过程定义成与数据无关的合成运算，不需要用到代表数据的那个参数，只把简单的运算步骤合成到一起。

- 不需要指明处理的数据
- **只需要合成运算过程**
- 需要定义一些辅助的基本运算函数

```javascript
// 非 Point Free 模式：函数里显式操作数据 word
function f1(word) {
  return word.toLowerCase().replace(/\s+/g, '_')
}

// Point Free 模式：函数定义中看不到数据
const fp = require('lodash/fp')
const f2 = fp.flowRight(fp.replace(/\s+/g, '_'), fp.toLower)

console.log(f1('Hello World')) // hello_world
console.log(f2('Hello World')) // hello_world
```

实战案例——提取字符串中每个单词的首字母并转大写，用 `.` 连接：

```javascript
// world wild web => W. W. W
const firstLetterToUpper = fp.flowRight(
  fp.join('. '),
  fp.map(v => fp.flowRight(fp.first, fp.upperFirst)(v)),
  fp.split(' ')
)
console.log(firstLetterToUpper('world wild web')) // W. W. W
```

---

## 🎁 进阶：函子（Functor）

到目前为止学了函数式编程的基础，但还没讲在函数式编程中**如何把副作用控制在可控范围内、如何处理异常、如何处理异步操作**——这正是函子要解决的问题。

**容器**：包含值和值的变形关系（变形关系就是函数）。

**函子**：是一个特殊的容器，通过一个普通对象来实现，该对象具有 `map` 方法，`map` 方法可以运行一个函数对值进行处理（变形关系）。

### Functor 基础

```javascript
class Container {
  static of(value) { return new Container(value) } // 👈 of 替代 new，避免 new 关键字
  constructor(value) { this._value = value }
  map(fn) { return Container.of(fn(this._value)) }
}

const r = Container.of(5)
  .map(x => x + 1)
  .map(x => x * x)
console.log(r) // Container { _value: 36 }
```

函子总结：
- 函数式编程的运算不直接操作值，而是**由函子完成**
- 函子就是一个实现了 `map` 契约的对象
- 可以把函子想象成一个**盒子**，盒子里封装了一个值
- 想处理盒子里的值，给盒子的 `map` 传递一个处理函数（纯函数）
- `map` 最终返回一个**包含新值的盒子**（新的函子）

### MayBe 函子

处理外部的**空值情况**（控制副作用在允许的范围内）：

```javascript
class MayBe {
  static of(value) { return new MayBe(value) }
  constructor(value) { this._value = value }
  map(fn) {
    return this.isNothing() ? MayBe.of(null) : MayBe.of(fn(this._value))
  }
  isNothing() { return this._value === null || this._value === undefined }
}

// 传入具体值
const m1 = MayBe.of('Hello World')
  .map(x => x.toUpperCase())
  .map(x => null)
  .map(x => x.split(x)) // 👈 不会报错，因为上一步返回了 MayBe(null)
console.log(m1) // MayBe { _value: null }

// 传入 null
const m2 = MayBe.of(null).map(x => x.toUpperCase())
console.log(m2) // MayBe { _value: null }，不会抛出异常
```

### Either 函子

类似 `if...else` 的处理，可以用来处理**异常**（异常会让函数变得不纯）：

```javascript
class Either {
  constructor(left, right) { this._left = left; this._right = right }
  static of(left, right)   { return new Either(left, right) }
  map(f) {
    return this._right === null
      ? Either.of(f(this._left), this._right)
      : Either.of(this._left,    f(this._right))
  }
  get value() {
    return this._right === null ? this._left : this._right
  }
}
```

Either 的典型用法——优雅处理 JSON.parse 异常：

```javascript
const parseJson = (str) => {
  try {
    return Either.of(null, JSON.parse(str))
  } catch (error) {
    return Either.of({ error: error.message }, null)
  }
}

const r3 = parseJson('{ "name": "test" }').map(x => x.name).value
console.log(r3) // 'test'

const r4 = parseJson('{ name: "test" }').map(x => x.error).value
console.log(r4) // 'Unexpected token n in JSON at position 2'
```

### IO 函子

**副作用**就是程序和外部世界的交互，比如读取文件或调用接口——由于外部世界不可控，包含副作用的逻辑往往难以预测。

IO 函子通过**推迟执行**的方式实现对副作用的管理和隔离：

```javascript
function compose(...fns) {
  return (value) => fns.reduceRight((acc, fn) => fn(acc), value)
}

class IO {
  constructor(value) { this._value = value }
  static of(value)   { return new IO(value) }
  map(fn)            { return IO.of(compose(fn, this._value)) }
  flatMap(fn)        { return IO.of(compose(x => x._value(), fn, this._value)) }
  start(cb)          { cb(this._value()) } // 延迟执行，start 之前都是在组合函数
}
```

IO 函子使用示例——读取 localStorage，解析 JSON，再读取用户数据：

```javascript
const readkey       = key => IO.of(() => localStorage.getItem(key))
const parse         = str => JSON.parse(str)
const writeToConsole = console.log

const r = readkey('data')
  .map(parse)
  .map(x => x.userId)
  .flatMap(readkey) // 👈 flatMap 解决嵌套函子问题
  .map(parse)
  .start(writeToConsole)
// start 之前都是在组合函数，没有执行，没有副作用
```

IO 函子要点：
- `_value` 是一个函数，把函数作为值来处理
- 把不纯的动作存储到 `_value` 中，**延迟执行**（惰性执行）
- 把不纯的操作**交给调用者**来处理

### Task 函子与 Folktale

Task 函子用于处理异步操作。自定义实现：

```javascript
function Task(execute) {
  return {
    execute,
    map: fn => Task(resolve => execute(data => resolve(fn(data)))),
    flatMap: fn => Task(resolve => execute(x => fn(x).execute(data => resolve(data))))
  }
}
```

实际项目中建议使用 Folktale 库——一个标准的函数式编程库，提供 compose、curry 以及 Task、Either、MayBe 等函子：

```javascript
const { compose, curry } = require('folktale/core/lambda')
const { toUpper, first } = require('lodash/fp')

// curry 第一个参数是传入函数的参数个数
const f = curry(2, (x, y) => x + y)
console.log(f(3, 4))  // 7
console.log(f(3)(4))  // 7

const c = compose(toUpper, first)
console.log(c(['one', 'two'])) // ONE
```

用 Folktale 的 Task 处理异步文件读取：

```javascript
const { task }           = require('folktale/concurrency/task')
const { split, filter }  = require('lodash/fp')

function readFile(filename) {
  return task(resolver => {
    fs.readFile(filename, 'utf-8', (err, data) => {
      if (err) resolver.reject(err)
      resolver.resolve(data)
    })
  })
}

readFile('index.js')
  .map(split('\n'))
  .map(filter(v => v.includes('TODO')))
  .run()
  .listen({
    onRejected(err)    { console.log(err) },
    onResolved(value)  { console.log(value) }
  })
```

### Pointed 函子

Pointed 函子是实现了 `of` 静态方法的函子。`of` 方法的深层含义：**把值放到上下文 Context 中**（把值放到容器中，使用 `map` 来处理）：

![Pointed 函子示意](https://cdn.nlark.com/yuque/0/2022/png/738210/1652001090238-3ca1cded-b75c-4538-ac8d-9997a6433459.png)

```javascript
class Container {
  static of(value)   { return new Container(value) }
  constructor(value) { this._value = value }
  map(fn)            { return Container.of(fn(this._value)) }
}
```

### Monad 函子

函子的值也可以是函子，这样会出现多层函子嵌套（如 `IO(IO(x))`）。Monad（单子）函子的作用是**总是返回一个单层的函子**，通过 `flatMap` 方法（与 `map` 相同，但如果生成了嵌套函子，会取出内部的值，保证返回单层容器）：

不处理嵌套时的问题：

```javascript
const r = Monad.of('aa')
  .map(x => Monad.of(x + 1))
  .map(x => Monad.of(x._value + 2))
  .map(x => Monad.of(x._value + 3))
console.log(r._value._value) // 需要手动取嵌套值
```

用 `flatMap` + `join` 解决嵌套：

```javascript
class Monad {
  constructor(value) { this._value = value }
  static of(value)   { return new Monad(value) }
  map(fn)            { return Monad.of(fn(this._value)) }
  join()             { return this._value }
  flatMap(fn)        { return this.map(fn).join() } // 👈 map 后立即 join 取出
}

const r = Monad.of('aa')
  .flatMap(x => Monad.of(x + 1))
  .flatMap(x => Monad.of(x + 2))
  .flatMap(x => Monad.of(x + 3))
console.log(r._value) // 'aa123'
```

Monad 函子的 IO 应用——解决 IO 嵌套问题：

```javascript
class IO {
  static of(value)   { return new IO(() => value) }
  constructor(fn)    { this._value = fn }
  map(fn)            { return new IO(fp.flowRight(fn, this._value)) }
  join()             { return this._value() }
  flatMap(fn)        { return this.map(fn).join() }
}

const readFile = (filename) => new IO(() => fs.readFileSync(filename, 'utf-8'))
const print    = (v) => new IO(() => { console.log('print', v); return v })

const r = readFile('index.js')
  .map(fp.toUpper)
  .flatMap(print) // 👈 flatMap 解决 IO(IO(x)) 嵌套
  .join()
console.log(r)
```

### Ap 函子

函子里包含的值完全可以是函数。当一个函子的值是数值、另一个函子的值是函数时，可以用 Ap 函子让函数函子对值函子进行运算：

```javascript
class Ap {
  static of(value)   { return new Ap(value) }
  constructor(fn)    { this._value = fn }
  map(F)             { return new Ap(this._value(F._value)) }
}

function add(x) { return function(y) { return x + y } }

// Ap.of(add(2)) 持有柯里化后的函数，MayBe.of(3) 持有数据
const r = Ap.of(add(2)).map(MayBe.of(3))
console.log(r) // Ap { _value: 5 }
```

Ap 函子的意义：对于多参数的函数，可以**从多个容器中取值**，实现函子的链式操作。

> 💬 **面试官**：函子是什么？Monad 解决了什么问题？
>
> ✅ 标准答案：函子是一个实现了 `map` 方法的容器对象，`map` 接收函数对容器内的值进行变换并返回新容器。Monad 是额外实现了 `flatMap`（或 `chain`）的函子，解决了嵌套函子（如 `IO(IO(x))`）难以使用的问题——`flatMap` 在 map 后自动"压平"一层嵌套。
>
> 🎁 加分答案：JavaScript 的 `Array.prototype.flatMap` 和 `Promise.then`（自动解包嵌套 Promise）都是 Monad 的体现。能举出这两个例子说明你理解的是抽象而不是具体实现。

---

## 💡 一张图总结（面试速记）

| 概念 | 一句话解释 | 面试频率 |
|------|-----------|---------|
| 纯函数 | 相同输入永远得到相同输出，无副作用 | ⭐⭐⭐ 必考 |
| 柯里化 | 多参数函数转为一系列单参数函数，缓存参数 | ⭐⭐⭐ 必考 |
| 函数组合 | 把多个函数合并成管道，数据从右到左流过 | ⭐⭐⭐ 必考 |
| 闭包 | 函数 + 词法环境，内部函数访问外部作用域 | ⭐⭐⭐ 必考 |
| Functor | 有 `map` 方法的容器，对内部值进行变换 | ⭐⭐ 了解 |
| MayBe | 空值保护，避免 null 导致的异常 | ⭐⭐ 了解 |
| IO 函子 | 把副作用延迟执行，隔离不纯的操作 | ⭐⭐ 了解 |
| Monad | 有 flatMap 的函子，解决容器嵌套问题 | ⭐⭐ 了解 |

> 💡 **记住这条主线**：纯函数（无副作用）→ 柯里化（参数缓存）→ 函数组合（管道串联）→ 函子（副作用管理）。函数式编程的每一步都在把复杂性控制在更小的范围内。

---

## 📝 留个问题

Lodash/fp 把函数参数顺序从「数据优先」改成了「函数优先、数据最后」：

```javascript
// lodash 普通版
_.map(array, fn)

// lodash/fp 版
fp.map(fn)(array)
```

这个设计改动看起来很小，为什么对函数组合来说是「必须的」？如果数据还是放在第一位，会导致什么问题？

欢迎评论区写出你的分析 👇

---

> 🔖 这是「JS 函数式编程」系列第 1 篇，覆盖了从高阶函数到函子的完整体系。下一篇会结合 React Hooks 源码，看看函数式编程思想在框架设计中是怎么落地的。关注不迷路。
>
> 扩展阅读：搜索关键词「Lodash 中文文档」「Folktale 官方文档」「函数式编程指北 gitbook」「函数式编程入门教程 阮一峰」
