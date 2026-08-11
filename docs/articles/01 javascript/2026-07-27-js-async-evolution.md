# JS 异步编程完全指南：从回调地狱到 async/await（面试收藏级）

> 面试官说「聊聊 JS 异步」，大多数人只会背 Promise 三个状态。能把整段进化史讲清楚——每一代方案为什么出现、解决了什么、又留下了什么新问题——这才叫真正理解异步编程。

---

## 🎯 这篇文章解决什么问题

JS 是单线程的，但我们每天都在写异步代码。从最早的回调函数，到发布订阅、Promise、Generator，再到 async/await，这不是技术堆砌，**每一次演进都在解决上一个方案的真实痛点**。

这篇文章完整还原这段进化史，既讲清楚每种方案的原理和代码实现，也告诉你面试遇到相关问题时怎么答、能答到哪层才算加分。

---

## 🔍 异步是什么

所谓"异步"，就是一个任务分成两段执行：先执行第一段，转而执行其他任务，等准备好了再回来执行第二段。比如读取文件并处理，异步的执行过程是这样的：

![异步任务流程](https://cdn.nlark.com/yuque/0/2025/png/738210/1740462510791-fd00af85-293e-47c2-828f-d9678526a66a.png)

这种不连续的执行叫做异步。相应地，连续的执行叫做同步：

![同步任务流程](https://cdn.nlark.com/yuque/0/2025/png/738210/1740462510981-3cdb788d-2c9e-4a67-a43e-7d7e2a86ac44.png)

**异步编程的语法目标，就是让异步写起来更像同步**。按演进顺序，解决方案有：回调函数 → 事件监听 → 发布订阅 → Promise/A+ → Generator → async/await。

---

## 🧩 前置基础：高阶函数

理解所有异步方案之前，先把高阶函数讲清楚——函数在 JS 中是一等公民，可以作为参数和返回值，这是后续所有方案的底层机制。

### 批量生成函数

函数返回函数，用来制造同类工具函数：

```javascript
// 不用高阶函数：每种类型都要写一遍
// let isString = obj => toString.call(obj) == '[object String]'
// let isFunction = obj => toString.call(obj) == '[object Function]'

// 用高阶函数：一个工厂搞定所有
let isType = function(type) {
  return function(obj) {
    return toString.call(obj) == `[object ${type}]`
  }
}

const utils = {}
const create = (types) => {
  for (const type of types) {
    utils[`is${type}`] = isType(type)
  }
}

const types = ['String', 'Number', 'Boolean', 'Symbol',
  'Null', 'Undefined', 'Array', 'Object', 'Function', 'Date', 'RegExp']
create(types)

console.log(utils.isString('123'))    // true
console.log(utils.isNumber(123))      // true
console.log(utils.isArray([]))        // true
console.log(utils.isDate(new Date())) // true
```

### 调用多次才执行的函数

函数作为参数传递，即 callback 模式——也是后面「等 N 个异步完成再执行」的基础：

```javascript
let after = function(times, task) {
  return function() {
    if (times-- == 1) {
      return task.apply(this, arguments)
    }
  }
}

let fn = after(3, function() {
  console.log('三次之后才执行')
})
fn() // 无输出
fn() // 无输出
fn() // 打印「三次之后才执行」
```

> 💬 **面试官**：什么是高阶函数？举个实际用途。
>
> ✅ 标准答案：接收函数作为参数、或返回函数的函数叫高阶函数。实际用途：柯里化、函数组合、防抖节流、AOP 切面编程等。
>
> 🎁 加分答案：`after(n, fn)` 这个模式其实是 `Promise.all` 语义的手动实现——在 Promise 出现之前被广泛用来协调多个异步任务的完成。能说出这个联系，说明你理解的是本质而不是语法。

---

## 📞 第一代：回调函数

把任务的第二段写成一个函数，等异步操作完成后调用它——这就是回调函数。

```javascript
fs.readFile('某个文件', function(err, data) {
  if (err) throw err
  console.log(data)
})
```

这是**错误优先的回调（error-first callback）**——第一个参数永远是 `err`，没有错误就是 `null`。这是 Node.js 的核心约定之一。

### try/catch 为什么失效

```javascript
let async = function(callback) {
  try {
    setTimeout(function() {
      callback() // 👈 这里的异常，try/catch 捕获不到
    }, 1000)
  } catch(e) {
    console.log('捕获错误', e) // 永远不执行
  }
}

async(function() {
  console.log(t) // t 未定义，报错——但 catch 感知不到
})
```

原因：`try/catch` 只能捕获**当前调用栈**的异常。回调被存起来，在下一个事件循环才执行，那时 try 块早就结束了。

Node.js 的约定是把异常作为回调的第一个参数传回，正确写法：

```javascript
let async = function(callback) {
  try {
    setTimeout(function() {
      if (success) callback(null)       // 成功：err 为 null
      else         callback('错误信息') // 失败：err 有值
    }, 1000)
  } catch(e) {
    console.log('捕获错误', e)
  }
}

async(function(err) {
  if (err) { console.log(err) }
})
```

异步方法两个原则：必须在异步操作之后调用回调；出错时要向回调传入异常。

### 回调地狱

多级异步依赖时，代码向右无限嵌套：

```javascript
let fs = require('fs')
fs.readFile('template.txt', 'utf8', function(err, template) {
  fs.readFile('data.txt', 'utf8', function(err, data) {
    console.log(template + ' ' + data)
    // 继续嵌套……
  })
})
```

可读性、可维护性、错误处理——全部崩塌。

> 💬 **面试官**：回调函数有什么问题？为什么需要 Promise？
>
> ✅ 标准答案：两个核心问题——`try/catch` 无法捕获异步回调中的异常（脱离了原调用栈）；多级依赖形成回调地狱，可读性和错误处理能力大幅下降。Promise 用链式调用解决嵌套，用 `.catch()` 统一处理异常。
>
> 🎁 加分答案：error-first callback 约定是对异常捕获问题的语言层 workaround——它不是真正解决，而是把异常的传递方式标准化了，让调用方自己判断。

---

## 📡 过渡期：发布订阅与哨兵变量

在 Promise 出现之前，社区用两种模式来协调多个并发异步操作。

### 发布订阅模式

订阅事件实现一个事件与多个回调的关联：

```javascript
let fs = require('fs')
let EventEmitter = require('events')
let eve = new EventEmitter()
let html = {}

eve.on('ready', function(key, value) {
  html[key] = value
  if (Object.keys(html).length == 2) {
    console.log(html) // 两个文件都读完了再处理
  }
})

function render() {
  fs.readFile('template.txt', 'utf8', function(err, template) {
    eve.emit('ready', 'template', template)
  })
  fs.readFile('data.txt', 'utf8', function(err, data) {
    eve.emit('ready', 'data', data)
  })
}
render()
```

### 哨兵变量

用 `after(n, callback)` 等 n 个异步任务全部完成再执行——这是 `Promise.all` 语义的手动实现：

```javascript
let after = function(times, callback) {
  let result = {}
  return function(key, value) {
    result[key] = value
    if (Object.keys(result).length == times) {
      callback(result)
    }
  }
}

let done = after(2, function(result) {
  console.log(result)
})

function render() {
  fs.readFile('template.txt', 'utf8', function(err, template) {
    done('template', template)
  })
  fs.readFile('data.txt', 'utf8', function(err, data) {
    done('data', data)
  })
}
render()
```

这两种方案都能用，但每次都要手写计数逻辑，样板代码多。**Promise 的出现，是把这套样板标准化了。**

---

## ⚡ 第二代：Promise

Promise 的本意是"承诺"——承诺过一段时间后给你一个结果，用来处理网络请求、读取文件等需要等待的操作。

### 三种状态

**Pending**：Promise 对象创建时的初始状态，可转变为 Fulfilled 或 Rejected。
**Fulfilled**：成功状态，必须有一个不可变的 value。
**Rejected**：失败状态，必须有一个不可变的 reason。

`then` 方法用来指定状态改变时的操作：resolve 时执行 onFulfilled，reject 时执行 onRejected。

### 构造一个 Promise

```javascript
let promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    if (Math.random() > 0.5) resolve('This is resolve!')
    else                     reject('This is reject!')
  }, 1000)
})
promise.then(onFulfilled, onRejected)
```

构造 Promise 需要传入一个 executor 函数，接收两个参数：`resolve`（调用后进入 fulfilled 状态，传递成功值）和 `reject`（调用后进入 rejected 状态，传递错误信息）。

**ES5 模拟 Promise 核心机制：**

```javascript
function Promise(fn) {
  fn((data) => { this.success(data) },
     (error) => { this.error()      })
}
Promise.prototype.resolve = function(data)          { this.success(data) }
Promise.prototype.reject  = function(error)         { this.error(error)  }
Promise.prototype.then    = function(success, error) {
  this.success = success
  this.error   = error
}
```

**ES6 Class 写法：**

```javascript
class Promise {
  constructor(fn) {
    fn((data)  => { this.success(data) },
       (error) => { this.error()       })
  }
  resolve(data)          { this.success(data)              }
  reject(error)          { this.error(error)               }
  then(success, error)   { this.success = success; this.error = error }
}
```

### Promise 作为函数返回值

封装异步操作的标准姿势：

```javascript
function ajaxPromise(queryUrl) {
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest()
    xhr.open('GET', queryUrl, true)
    xhr.send(null)
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) resolve(xhr.responseText)
        else                    reject(xhr.responseText)
      }
    }
  })
}

ajaxPromise('http://api.example.com/drugs')
  .then(value => console.log(value))
  .catch(err  => console.error(err))
```

### 链式调用原理

每次调用 `then` 返回的都是**新的 Promise 实例**（不是 this），链式调用的参数通过返回值传递：

```javascript
readFile('1.txt')
  .then(function(data) {
    console.log(data)
    return data           // 普通值，直接传递
  })
  .then(function(data) {
    return readFile(data) // 返回新 Promise，自动展开
  })
  .then(function(data) {
    console.log(data)
  })
  .catch(function(err) {
    console.log(err)      // 统一兜底，捕获整条链上的异常
  })
```

### 核心 API

**Promise.all**：全部 resolve 才 resolve，任意一个 reject 立即 reject。不管谁先完成，结果**按传入顺序返回**。

```javascript
Promise.all([p1, p2]).then(function(result) {
  console.log(result) // ['2.txt', '2']
})
```

**Promise.race**：取最先决议的结果，无论成功还是失败。

```javascript
Promise.race([p1, p2]).then(function(result) {
  console.log(result)
})
```

**Promise.resolve**：返回 fulfilled 状态的 Promise。传入普通值则作为 value；传入 Promise 实例则原封不动返回。

**Promise.reject**：返回 rejected 状态的 Promise，参数作为 reason 传出。

> 💬 **面试官**：Promise.all / race / allSettled / any 有什么区别？
>
> ✅ 标准答案：`all` 全部成功才 resolve，一个失败立即 reject；`race` 取最先决议的（无论成败）；`allSettled` 等全部结束，返回每个结果的状态和值；`any` 取最先成功的，全败才 reject（ES2021）。
>
> 🎁 加分答案：`any` 全部失败时返回 `AggregateError`，包含所有 reject 的原因数组。能说出这个说明你真的用过，不是背的。

🔧 **真实场景**：药品详情页需要同时加载基本信息、说明书、相似推荐 3 个接口。用 `Promise.all` 把串行改并行，首屏从 1.8s 降到 0.6s。面试时能讲出「并发优化 + 量化指标」，比背 API 定义有力得多。

---

## 📦 Promise 生态：Q 与 Bluebird

### Q 库

Q 是 Node.js 中基于 Deferred 模式的经典 Promise 实现：

```javascript
var Q  = require('q')
var fs = require('fs')

function read(filename) {
  var deferred = Q.defer()
  fs.readFile(filename, 'utf8', function(err, data) {
    if (err) deferred.reject(err)
    else     deferred.resolve(data)
  })
  return deferred.promise
}

read('1.txt').then(
  data  => console.log(data),
  error => console.error(error)
)
```

**Q 的简单实现**——理解 Deferred 模式核心：

```javascript
module.exports = {
  defer() {
    var _success, _error
    return {
      resolve(data) { _success(data) },
      reject(err)   { _error(err)   },
      promise: {
        then(success, error) { _success = success; _error = error }
      }
    }
  }
}
```

**Q 的完整实现**——支持 resolve 先于 then 调用的异步时序：

```javascript
var defer = function() {
  var pending = [], value
  return {
    resolve: function(_value) {
      if (pending) {
        value = _value
        for (var i = 0, ii = pending.length; i < ii; i++) {
          pending[i](value)
        }
        pending = undefined // 👈 标记已决议，后续 then 直接调用
      }
    },
    promise: {
      then: function(callback) {
        if (pending) pending.push(callback) // 未决议：存队列
        else         callback(value)        // 已决议：直接调用
      }
    }
  }
}
```

### Bluebird

Bluebird 是功能最全、速度最快的 Promise 实现库，核心价值在于 `promisify`——把 Node.js 的 callback 风格 API 批量转成 Promise：

```javascript
var Promise = require('bluebird')

// 单个函数 Promise 化
var readFile = Promise.promisify(require('fs').readFile)
readFile('1.txt', 'utf8').then(contents => console.log(contents))

// 整个模块批量 Promise 化
var fs = Promise.promisifyAll(require('fs'))
fs.readFileAsync('1.txt', 'utf8').then(contents => console.log(contents))
```

**Bluebird 简单实现**——理解 promisify 原理：

```javascript
module.exports = {
  promisify(fn) {
    return function() {
      var args = Array.from(arguments)
      return new Promise(function(resolve, reject) {
        fn.apply(null, args.concat(function(err) {
          if (err) reject(err)
          else     resolve(arguments[1])
        }))
      })
    }
  },
  promisifyAll(obj) {
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr) && typeof obj[attr] == 'function') {
        obj[attr + 'Async'] = this.promisify(obj[attr])
      }
    }
    return obj
  }
}
```

> 💬 **面试官**：怎么把 callback 风格的函数转成 Promise？
>
> ✅ 标准答案：包一层 `new Promise`，在 callback 里根据 err 参数决定 resolve 还是 reject。Node.js 内置的 `util.promisify` 原理相同。
>
> 🎁 加分答案：提到 Bluebird 的 `promisifyAll`——遍历对象所有方法，批量生成带 `Async` 后缀的 Promise 版本。async/await 普及前，这是迁移老 Node.js 项目的标准手段。

### 实战：Promise 动画队列

Promise 链式调用的经典场景——让三个方块按顺序依次运动：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><title>move</title>
  <style>
    .square { width: 40px; height: 40px; border-radius: 50%; }
    .square1 { background-color: red; }
    .square2 { background-color: yellow; }
    .square3 { background-color: blue; }
  </style>
</head>
<body>
  <div class="square square1" style="margin-left: 0"></div>
  <div class="square square2" style="margin-left: 0"></div>
  <div class="square square3" style="margin-left: 0"></div>
  <script>
    var square1 = document.querySelector('.square1')
    var square2 = document.querySelector('.square2')
    var square3 = document.querySelector('.square3')

    function move(element, target, resolve) {
      let current = 0
      let timer = setInterval(function() {
        element.style.transform = `translateX(${++current}px)`
        if (current > target) { clearInterval(timer); resolve() }
      }, 13)
    }

    function animate(element, target) {
      return new Promise(function(resolve, reject) {
        move(element, target, resolve)
      })
    }

    animate(square1, 100)
      .then(function() { return animate(square2, 100) })
      .then(function() { return animate(square3, 100) })
  </script>
</body>
</html>
```

这个例子展示了 Promise 链的核心价值：**用线性代码表达有顺序依赖的异步操作**，不再嵌套。

---

## 🔄 第三代：Generator + Co

当你执行一个函数时，可以在某个点暂停，做些其他工作，然后带着新值回来继续——这就是 Generator 解决的问题。

调用 Generator 函数不会立即执行，而是返回一个迭代器，每次调用 `next()` 才执行到下一个 `yield` 暂停点：

```javascript
function* foo() {
  var index = 0
  while (index < 2) {
    yield index++ // 暂停，向外输出当前 index
  }
}

var bar = foo()              // 返回迭代器，函数还没执行
console.log(bar.next()) // { value: 0, done: false }
console.log(bar.next()) // { value: 1, done: false }
console.log(bar.next()) // { value: undefined, done: true }
```

`next()` 返回值的 `value` 是 Generator 向外输出的数据；`next()` 也可以接受参数，这是向 Generator 函数体内**输入**数据的方式。

### Co 自动执行器

`co` 是基于 Generator 的流程控制工具，借助 Promise 让你用同步写法写异步代码：

```javascript
function getNumber() {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      let number = Math.random()
      if (number > .5) resolve(number)
      else             reject('数字太小')
    }, 1000)
  })
}

function* read() {
  let a = yield getNumber() // 暂停，等 Promise 决议
  console.log(a)
  let b = yield 'b'
  console.log(b)
  let c = yield getNumber()
  console.log(c)
}
```

**Co 的实现原理**（核心约 20 行）：

```javascript
function co(gen) {
  return new Promise(function(resolve, reject) {
    let g = gen()
    function next(lastValue) {
      let { done, value } = g.next(lastValue) // 把上次结果注入
      if (done) {
        resolve(lastValue)
      } else {
        if (value instanceof Promise) {
          value.then(next, val => reject(val))
        } else {
          next(value) // 普通值直接传入下一次 next
        }
      }
    }
    next()
  })
}

co(read).then(
  data   => console.log(data),
  reason => console.log(reason)
)
```

**Co 连续读文件的简化版：**

```javascript
function* read() {
  let a = yield readFile('./1.txt')
  console.log(a)
  let b = yield readFile('./2.txt')
  console.log(b)
}

function co(gen) {
  let g = gen()
  function next(val) {
    let { done, value } = g.next(val)
    if (!done) value.then(next)
  }
  next()
}
```

> 💬 **面试官**：Generator 和 async/await 有什么关系？
>
> ✅ 标准答案：`async/await` 就是 Generator + 自动执行器（co）的语法糖。`async` 等价于用 co 包裹的 Generator 函数，`await` 等价于 `yield`。语言层面内置了执行器，不再需要手动引入 co。
>
> 🎁 加分答案：早期 Babel 把 async/await 编译成 regenerator（Generator 的 polyfill）；现代 Babel 也可以直接编译成 Promise 链。能说出「两种编译策略」说明你理解的是本质而不是语法。

---

## 🚀 第四代：async/await

使用 `async` 关键字，可以轻松达到 Generator + co 的效果，三个核心优势：

**内置执行器**：不需要 co，语言直接支持。
**更好的语义**：`async/await` 比 `*/yield` 语义更清晰。
**更广的适用性**：`await` 后面可以跟任何值，不仅限于 Promise。

```javascript
async function read() {
  let template = await readFile('./template.txt')
  let data     = await readFile('./data.txt')
  return template + '+' + data
}

let result = read()
result.then(data => console.log(data))
```

### async 函数的本质

async 函数就是将 Generator 函数和自动执行器包装在一起：

```javascript
// async 写法
async function read() {
  let template = await readFile('./template.txt')
  let data     = await readFile('./data.txt')
  return template + '+' + data
}

// 完全等价于：
function read() {
  return co(function*() {
    let template = yield readFile('./template.txt')
    let data     = yield readFile('./data.txt')
    return template + '+' + data
  })
}
```

扩展阅读：搜索关键词「async_function MDN」、「Generator 函数的含义与用法 阮一峰」

> 💬 **面试官**：async/await 和 Promise 链在错误处理上有什么不同？
>
> ✅ 标准答案：`async/await` 可以用 `try/catch` 捕获异步异常。`await` 的 Promise reject 时，相当于在 `yield` 处抛出异常，`try/catch` 因此得以工作。Promise 链只能在 `.catch()` 里处理。
>
> 🎁 加分答案：常见陷阱——`await` 不能直接放在 `forEach` 回调里，因为 forEach 的回调不是 `async` 的，里面的 await 会被忽略。正确做法是用 `for...of` 串行，或 `Promise.all + map` 并行。这种实战细节面试加分明显。

---

## 💡 一张图总结（面试速记）

| 方案 | 解决的问题 | 核心局限 | 面试频率 |
|------|-----------|---------|---------|
| 回调函数 | 实现异步 | 地狱嵌套、异常难捕获 | ⭐⭐ 了解 |
| 发布订阅 | 多任务协调、解耦 | 样板代码多 | ⭐ 了解 |
| 哨兵变量 | 等 N 个异步完成 | 手动维护计数 | ⭐ 了解 |
| Promise | 链式调用、统一异常 | 写法仍函数式 | ⭐⭐⭐ 必考 |
| Q / Bluebird | Promise 生态工具库 | 现已被内置替代 | ⭐ 了解 |
| Generator + co | 同步写法 | 需手动引入执行器 | ⭐⭐ 理解原理 |
| async/await | 语法最优、try/catch 可用 | — | ⭐⭐⭐ 必考 |

> 💡 记住这条演进主线：**回调（能用但丑）→ Promise（状态机化）→ Generator（可暂停）→ async/await（内置执行器）**。每一步都在解决上一步的痛点，这才是面试官想听的「系统性理解」。

---

## 📝 留个问题

`async/await` 和 Generator + co 在功能上等价，但 async/await 成了语言标准，co 被逐渐淘汰。

如果让你用 Generator 手写一个 `async/await` 的降级实现（就像 Babel 编译做的那件事），你会怎么处理 `await` 后面跟的是**普通值**（不是 Promise）的情况？

欢迎评论区写出你的思路 👇

---

> 🔖 这是「JS 异步编程」系列第 1 篇，覆盖从回调到 async/await 的完整进化史。下一篇深入 Promise/A+ 规范手写实现——Resolution Procedure 才是面试真正的分水岭。关注不迷路。
