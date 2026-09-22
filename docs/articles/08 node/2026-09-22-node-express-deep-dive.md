# Express 深度：路由/中间件链/错误处理源码解析与手写核心（面试收藏级）

> **副标题**：中间件洋葱模型雏形、路由匹配算法、错误处理中间件的四参数约定、Express 与 Connect 的历史关系

> 面试官问「Express 的中间件执行模型是什么，`next()` 到底做了什么」，多数人张嘴就是「洋葱模型」。但真相是——Express 根本**不是**洋葱模型，它是**单向线性**的。真正把「洋葱」做到极致的是 Koa。如果你把这两者混为一谈，说明你对 Express 中间件链的理解还停在「会写」而不是「懂原理」。

---

## 🎯 这篇文章解决什么问题

Express 是 Node.js 生态里最普及的 Web 框架，也是 5-10 年 Node 开发者简历上绕不开的一行。但「会用」和「讲得清」之间隔着一层源码的距离：

- 中间件数组在内存里到底长什么样？`next()` 按下之后发生了什么？
- 为什么 Express 的「前置逻辑」和「后置逻辑」没法像 Koa 一样写在同一个函数里？
- 路由是怎么匹配的？`/patients/:id` 这个冒号到底是谁在解析？
- 为什么错误处理中间件要写四个参数？少一个会怎样？

这篇文章是「Node.js 全栈深度拆解」系列的第 7 篇，只讲三件硬核增量：

- **中间件链的本质**：数组 + 索引 + `next` 递归，为什么会「挂起」
- **路由匹配算法**：`path-to-regexp` 把路径编译成正则，顺序匹配
- **错误处理的四参数约定**：`fn.length === 4` 这个函数签名反射的隐式约定

读完你会明白，Express 的每个设计取舍背后都有历史原因和工程权衡——这些正是面试官想听的。

---

## 一、使用与实践

### 快速上手：从 5 行代码开始

安装、创建应用、监听端口，三步走：

```shell
$ npm install express
```

```javascript
// 引入 express
var express = require('express')
// 执行 express 函数，得到 app
var app = express()
// 监听端口
app.listen(3000)
```

`express()` 不是 `new` 出来的，而是直接调用一个函数返回 `app` 对象——这个「工厂函数」形态是 Express 从最早的版本就定下来的，后面源码解析会看到它其实是 `createApplication`。

### 中间件与 next：控制权的归还

中间件是 Express 的核心概念。一个中间件处理完请求后，靠 `next()` 把控制权交给下一个：

```javascript
var express = require('express')
var app = express()

// 不写路径的 use，匹配所有请求
app.use(function (req, res, next) {
  console.log('全部匹配')
  next() // 👈 不调 next，请求就会卡在这里，永远不返回
})

// 写了路径的 use，只匹配以 /water 开头的请求
app.use('/water', function (req, res, next) {
  console.log('只匹配/water')
  next()
})

app.get('/water', function (req, res) {
  res.end('water')
})

app.listen(3000)
```

上面这个例子的关键点：**中间件的 `(req, res, next)` 签名**，以及 `next()` 的调用时机——`next()` 是「归还控制权、继续调用数组中下一个中间件」的信号。不调用 `next()`，除非中间件自己调用了 `res.end()` 结束响应，否则请求就永久挂起。

### 路由方法：get/post/put/delete/all

`get` 处理 GET 请求，`post` 处理 POST 请求，`all` 匹配所有 HTTP 动词。第一个参数是路径，第二个是处理函数：

```javascript
const express = require('express')
const app = express()

app.get('/hello', function (req, res) {
  res.end('hello')
})
app.get('/world', function (req, res) {
  res.end('world')
})
// 通配符兜底：没匹配到的路径都进这里
app.get('*', function (req, res) {
  res.setHeader('Content-Type', 'text/plain;charset=utf8')
  res.end('Not Found')
})
app.listen(3000)
```

```javascript
// post 方法：处理 POST 请求
var app = express()
app.post('/hello', function (req, res) {
  res.end('hello')
})
app.post('*', function (req, res) {
  res.end('post没找到')
})
app.listen(3000)
```

```shell
# 用 curl 发一个 POST 请求验证
$ curl -X POST http://localhost:3000/hello
```

`all` 方法监听所有 HTTP 动词：

```javascript
const express = require('express')
const app = express()
app.all('/world', function (req, res) {
  res.end('all world')
})
app.listen(3000)
```

### 获取参数：query、params、body

**查询字符串 `req.query`**：`?name=zfpx&age=8` 这类问号后面的参数，被解析成一个对象：

```javascript
// http://localhost:3000/?name=zfpx&age=8
app.get('/', function (req, res) {
  res.write(JSON.stringify(req.query))
  res.end(req.path + ' ' + req.path)
})
```

**路径参数 `req.params`**：`/school/:name/:age` 里的冒号参数，匹配到的值组成一个对象：

```javascript
app.get('/school/:name/:age', function (req, res) {
  console.log(req.params) // { name: 'xxx', age: 'xxx' }
  res.end('water')
})
```

**请求体 `req.body`**：POST 请求体里的数据，需要配合 `express.json()`（或 `body-parser`）中间件解析后才能拿到——因为请求体是以字节流形式到达的，必须手动监听 `data`/`end` 事件拼装。后面「body-parser」小节会展开它的实现。

### 错误处理中间件：四个参数，必须放最后

错误处理中间件和普通中间件的区别只有一个——**函数签名是四个参数** `(err, req, res, next)`。它必须注册在所有路由之后：

```javascript
var express = require('express')
var app = express()

app.use(function (req, res, next) {
  console.log('过滤石头')
  next('stone is too big') // 👈 传入一个参数，就是抛错误
})

app.use('/water', function (req, res, next) {
  console.log('过滤沙子')
  next()
})

app.get('/water', function (req, res) {
  res.end('water')
})

// 错误处理中间件：四个参数，放在最后
app.use(function (err, req, res, next) {
  console.log(err)
  res.end(err)
})

app.listen(3000)
```

这里 `next('stone is too big')` 传入了一个字符串参数，Express 就认为这是一个错误，会跳过后面所有的普通中间件和路由，直接跳转到最近的错误处理中间件。这个「四参数」约定是整个错误处理机制的钥匙。

### express.Router：按模块拆分子路由

医院系统按「患者模块 / 处方模块 / 检验模块」拆分路由文件，就是 `express.Router()` 的典型用法。它让你能把一组路由挂到一个子路径下，再在主应用里挂载——这是笔记架构图里「多级路由」那张图要表达的层级结构（详见「源码解析」章）。

### res.send：智能响应

`res.send([body])` 是 Express 里最常用的响应方法，它「智能」处理不同类型的数据——根据传入参数的类型，自动设置正确的 `Content-Type`：

当参数是**字符串**，设置 `Content-Type` 为 `text/html`：

```javascript
app.get('/', function (req, res) {
  res.send('<p>hello world</p>')
})
```

当参数是**数组或对象**，返回 JSON 格式：

```javascript
app.get('/json', function (req, res) {
  res.send({ obj: 1 })
})
app.get('/arr', function (req, res) {
  res.send([1, 2, 3])
})
```

当参数是 **number**，返回对应的状态码短语：

```javascript
app.get('/status', function (req, res) {
  res.send(404) // not found
  // res.status(404).send('没有找到') 设置短语
})
```

### 模板引擎：ejs

Express 内置了模板引擎的接入能力，配 ejs 最常见：

```bash
$ npm install ejs
```

```javascript
var express = require('express')
var path = require('path')
var app = express()
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.listen(3000)
```

配置成 html 格式（用 ejs 引擎渲染 .html 文件）：

```javascript
app.set('view engine', 'html')
app.set('views', path.join(__dirname, 'views'))
app.engine('html', require('ejs').__express)
```

渲染视图，第一个参数是模板名，第二个是数据：

```javascript
app.get('/', function (req, res) {
  res.render('hello', { title: 'hello' }, function (err, data) {})
})
```

### 静态文件服务器：express.static

网页要加载 css/js/img 这类静态文件，需要指定一个存放目录。浏览器发来非 HTML 文件请求时，服务端到这个目录下找文件：

```javascript
var express = require('express')
var app = express()
var path = require('path')
app.use(express.static(path.join(__dirname, 'public')))
app.listen(3000)
```

### 重定向：res.redirect

`res.redirect([status], url)` 允许网址跳转，默认 302：

```javascript
app.get('/', function (req, res) {
  res.redirect('http://www.baidu.com')
})
```

### body-parser：接收 POST 请求体

`req.body` 不是 Express 天生就有的，需要 `body-parser` 中间件解析：

```shell
$ npm install body-parser
```

```javascript
app.get('/login', function (req, res) {
  res.sendFile('./login.html', { root: __dirname })
})
app.post('/user', function (req, res) {
  console.log(req.body)
  res.send(req.body)
})
app.listen(3000)
```

到这里，「使用与实践」的全貌已经铺开。你会发现这些 API 背后其实都指向同一个核心问题——**一个请求进来，Express 是怎么把它依次交给这些注册进去的函数处理的**。下面进入「设计与原理」，把这条主线彻底讲透。

---

## 二、设计与原理

### 中间件链的本质：一个数组，一个索引，一个 next

Express 的中间件链，剥到最里层，就是三样东西：

- **一个数组**（`router.stack`），按注册顺序存放所有中间件和路由
- **一个索引**（`index`），记录「当前处理到第几个」
- **一个 `next` 函数**，每次调用就把索引 +1，取下一个继续

每个请求进来，从索引 0 开始，依次尝试匹配。`next()` 的真实含义是：**「我处理完了，控制权归还，你继续去取数组里的下一个」**。所以「不调用 `next()` 请求就挂起」——因为索引停住了，数组后面的元素永远不会被遍历到，响应也不会被写回。

这个「数组 + 索引 + 递归 next」的结构，是理解 Express 一切行为的底层模型。

### 单向线性 vs Koa 洋葱模型：Express 为什么不是洋葱

这是本篇最想纠正的一个高频误解。

Express 中间件的执行是**单向线性**的：中间件 A 调用 `next()` 后，控制权交给 B，B 再交给 C……一路向前，**不会再回到 A**。A 在 `next()` 之后写的代码，执行时机是「A 里 `next()` 这一句之后立刻执行」，而不是「等 B、C 都跑完了再回到 A 执行」。

所以 Express 里想做「环绕型」逻辑（比如「记录请求耗时」这种要先记开始时间、再记结束时间），**必须拆成两个独立注册的中间件**——前一个在 `next()` 前记开始时间，后一个在最后记结束时间：

```javascript
// Express 里做「计时」，得拆成两个中间件
app.use(function (req, res, next) {
  req.startTime = Date.now() // 进入时记开始时间
  next()
})

// ... 中间的业务路由 ...

app.use(function (req, res, next) {
  console.log('耗时', Date.now() - req.startTime) // 最后记结束时间
  next()
})
```

而 Koa 是真正的**洋葱模型**（双向穿透）：中间件函数里 `await next()` 之前的代码「进入时」执行，`await next()` 之后的代码「离开时」执行，前后两部分天然地包裹住内层所有中间件。同样是计时，Koa 一个函数就能搞定：

```javascript
// Koa 里做「计时」，一个函数就够了（这是第 8 篇的主题，这里只做对比）
app.use(async (ctx, next) => {
  const start = Date.now()
  await next()                 // 👈 内层全部跑完后，控制权回到这里
  console.log('耗时', Date.now() - start)
})
```

两者的本质差异，一句话概括：

- **Express**：`next()` 是「归还控制权」，同步调用下一个，回不来
- **Koa**：`await next()` 是「深入内层」，返回一个 Promise，内层跑完会回来

> 💬 **面试官**：为什么 Express 里「前置逻辑」和「后置逻辑」不能像 Koa 一样写在同一个中间件函数里？
>
> ✅ 标准答案：因为 Express 中间件的执行是**单向线性**的，`next()` 只是同步地取数组里的下一个中间件去执行，控制权交给下游后不会再回到当前函数，所以「进入时逻辑」和「离开时逻辑」必须拆成两个独立注册的中间件。而 Koa 的 `await next()` 返回一个 Promise，内层跑完后控制权会回到 `await` 处继续执行，所以能在一个函数里用 `await next()` 前后包裹逻辑。
>
> 🎁 加分答案：能点出这个差异的**根本原因**——Express 的中间件是同步回调风格（`(req, res, next)` 三个参数、手动调 `next`），`next()` 只是「调用下一个函数」，函数栈一层层往下，不会回溯；Koa 是 `async/await` 时代的设计，`next()` 返回 Promise，`await` 天然保留了「往下深入再回溯回来」的双向语义。

### 路由匹配算法：path-to-regexp 把路径编译成正则

Express 底层不自己解析路径参数，而是依赖 `path-to-regexp` 这个库，把路由字符串编译成正则表达式。

`/patients/:id` 这个字符串，会被 `path-to-regexp` 转换成类似 `^\/patients\/([^\/]+)$` 的正则，同时把 `:id` 这个参数名记录到一个 `keys` 数组里。请求到来时，用这个正则去 `exec` 实际的 `pathname`：

- **匹配成功** → 用 `keys` 数组里的参数名和正则捕获组一一对应，组装出 `req.params`
- **匹配失败** → 尝试下一个路由

而「顺序匹配」是这里的关键约束：Express 按注册顺序**逐个尝试**，**第一个匹配成功**的路由处理函数生效。如果这个处理函数内部又调用了 `next()`，Express 就**继续向后匹配**，去找下一个也匹配的路径——这正是「多个处理函数共享同一路径」的实现机制（后面的测试代码里，`/home` 挂了三个 `get`，就是靠这个机制依次触发）。

这里要特别强调一个细节：**路由路径的匹配，比中间件路径的匹配更严格**。中间件 `app.use('/water', ...)` 是「前缀匹配」（`/water`、`/water/xxx` 都命中），而路由 `app.get('/water', ...)` 默认是「精确匹配」——这就是为什么同一个 `/water`，`use` 能拦住 `/water/xxx`，`get` 只能命中 `/water` 本身。

### 错误处理的特殊约定：fn.length === 4 的函数签名反射

这是 Express 里最「隐式」、也最常被考的一个设计。

Express 识别「这是不是一个错误处理中间件」，**不是看有没有显式声明，而是看函数参数个数是不是 4**：

```javascript
if (layer.handler.length === 4) {
  // 四个参数 (err, req, res, next) → 这是错误处理中间件
  layer.handle_error(error, req, res, next)
} else {
  // 不是四个参数 → 普通中间件，跳过
  next(error)
}
```

`Function.prototype.length` 返回的是函数定义时**声明的形参个数**（不含默认值和 rest 参数）。所以：

- `(err, req, res, next) => {}` 的 `length` 是 4 → 错误处理中间件
- `(req, res, next) => {}` 的 `length` 是 3 → 普通中间件

当某个普通中间件调用了 `next(err)`（传入了参数），Express 进入「错误状态」：**跳过沿途所有普通中间件和路由**，一路向前，直到遇到第一个 `length === 4` 的错误处理中间件，把错误交给它。

> 💬 **面试官**：Express 是怎么识别一个中间件是「错误处理中间件」的？
>
> ✅ 标准答案：通过**函数签名反射**——判断函数的 `fn.length` 是否等于 4。因为 `Function.prototype.length` 返回函数声明的形参个数，错误处理中间件的签名是 `(err, req, res, next)` 四个参数，所以 `length === 4`。这是一个基于函数签名的隐式约定，不是显式的 API 声明。
>
> 🎁 加分答案：能说出这个约定的**代价**——它依赖 `length` 这个特性，所以错误处理中间件**不能省略前面任何一个参数**（比如 `(err, res)` 这种写法 `length` 是 2，会被当成普通中间件），也不能用 rest 参数或带默认值的写法（这些都会改变 `length`）。这是 Express 为了「API 简洁」付出的「隐式约定」代价。

### Express 与 Connect 的历史关系

Express 早期版本（2.x、3.x）直接构建在 Connect 中间件框架之上。Connect 是一个极简的中间件层，只做一件事：把中间件函数按顺序串起来执行，`(req, res, next)` 这个签名就是 Connect 定下来的。

现代 Express（4.x+）已经不再直接依赖 Connect，把中间件引擎自己实现了（就是我们后面要拆解的 `router`），但中间件的设计理念——`(req, res, next)` 签名、`use` 注册、`next` 递归调用——**都是从 Connect 继承下来的**。理解这层历史，才能明白为什么 Express 的中间件是「回调风格」而不是 Koa 的「async 风格」：它的基因来自 2010 年前后的 Connect，那时候 `async/await` 还没进 JS。

### req/res 直接扩展 vs Koa 的 ctx 抽象

Express 和 Koa 在「请求/响应对象」上的设计分野，是理解两者中间件风格差异的另一个钥匙：

- **Express**：`req`/`res` 就是对 Node.js 原生 `http.IncomingMessage`/`http.ServerResponse` 的**直接扩展**，在上面挂载额外的属性和方法（`req.params`、`req.query`、`res.send` 等），没有新造一层抽象。
- **Koa**：用 `ctx.request`/`ctx.response` 包了一层**新的抽象对象**，再通过属性代理（`ctx.body` 实际代理到 `ctx.response.body`）暴露给开发者。

这个差异直接影响中间件写法：Express 里你操作的是「增强版的原生对象」，可以直接用 `res.setHeader` 这类原生方法；Koa 里你操作的是全新的 `ctx`，更统一但离原生更远。

---

## 三、源码解析（对齐 g-express 四层结构）

> 参考实现：笔记基于 g-express 这个精简版 Express（四层结构：application → router → layer → route），代码结构和真实 Express 源码一一对应。真实 Express 仓库地址：https://github.com/expressjs/express（本篇对齐 `lib/application.js`、`lib/router/index.js`、`lib/router/layer.js`、`lib/router/route.js` 的职责划分）

这一章把 g-express 的完整源码拆开逐层讲。先看整体架构，再一层层深入。

### 整体架构：四层分工

先看这张架构图——一个 Express 应用在内存里的结构，是理解一切的起点：

![Express 架构图：APPLICATION 请求到来，router.stack 里每个 Layer 对应一个路由或中间件，Route 里又嵌套 Layer](https://cdn.nlark.com/yuque/0/2025/png/738210/1742451824621-ce10c67a-7a32-4eeb-88c0-987fe7f1eeef.png)

![Express 架构图：Layer 与 Route 的关系](https://cdn.nlark.com/yuque/0/2025/png/738210/1742460689973-43992c9b-bb51-4d69-aa5d-c1ff4fc85b93.png)

![Express 多级路由：/user 挂载子 Router，子 Router 里再挂 /add /remove 等路由](https://cdn.nlark.com/yuque/0/2025/png/738210/1742541064618-683825ac-8098-4bd7-9e7a-2dc9c18058ed.png)

四层结构，每层职责单一：

- **application**：应用层，对外暴露 `get/post/use/listen`，内部懒加载一个 `router`
- **router**：路由系统，维护 `stack` 数组（存 Layer），负责 `handler` 遍历分发
- **layer**：一层，封装「路径 + 处理函数」，负责 `match` 匹配和 `handle_request` 调用
- **route**：路由对象，一个 Layer 对应一个 Route，Route 内部再嵌套存「该路径下不同方法的处理函数」

注意一个关键结构：**`router.stack` 里的 Layer 和 `route.stack` 里的 Layer 是两种不同用途的 Layer**。外层的 Layer 存「路径 + route.dispatch」，内层的 Layer 存「方法 + 真实处理函数」——两层 `stack` 嵌套，这就是「一个路径支持多个方法」「一个路径挂多个处理函数」的结构基础。

### 入口：createApplication

`package.json` 声明了依赖 `methods` 和 `path-to-regexp`：

```json
{
  "name": "g-express",
  "version": "2.0.0",
  "description": "g-express",
  "main": "index.js",
  "scripts": {
    "test": "nodemon examples/index.js"
  },
  "keywords": ["express"],
  "author": "robin",
  "license": "ISC",
  "dependencies": {
    "methods": "^1.1.2",
    "path-to-regexp": "0.1.7"
  }
}
```

入口 `express.js` 是工厂函数：

```javascript
const App = require('./application')

// 创建应用
function createApplication() {
  const app = new App()
  return app
}

createApplication.Router = require('./router')

module.exports = createApplication
```

`createApplication.Router` 这个挂载，对应 `express.Router()` 这个 API——`Router` 构造函数被挂到 `express` 函数上作为属性，所以能用 `express.Router()` 创建子路由。

### application.js：懒加载 + 方法循环

```javascript
const http = require('http')
const methods = require('methods')
const Router = require('./router')
const initMiddleware = require('./middleware/init')

function App () {
  // this._router = new Router()
}

/**
 * 收集路由
 */
methods.forEach(method => {
  // 这里对应路由中的 get post put delete 等方法
  App.prototype[method] = function(path, ...handlers) {
    this.lazy_route()
    this._router[method](path, handlers)
  }
})

App.prototype.lazy_route = function() {
  // 懒加载路由
  if(!this._router) {
    this._router = new Router()
    this.use(initMiddleware()) // 内置中间件
  }
}

// 中间件交给路由处理
App.prototype.use = function(path, ...handlers) {
  this.lazy_route()
  this._router.use(path, handlers)
}

/**
 * 监听
 * @param  {...any} args
 */
App.prototype.listen = function(...args) {
  this.lazy_route()
  const server = http.createServer((req, res) => {
    this._router.handler(req, res, (error) => {
      if(error) {
        console.error(error)
        return res.end(error.message)
      }
      return res.end(`Can not ${req.method} ${req.path}`)
    })
  })
  server.listen(...args)
  return server
}

App.prototype.param = function(key, cb) {
  this.lazy_route()
  this._router.param(key, cb)
}

module.exports = App
```

三个关键设计：

1. **懒加载 `lazy_route`**：`_router` 不在构造函数里创建，而是第一次调用 `get/post/use/listen` 时才创建。好处是「不调用路由方法就不会创建路由系统」，并且创建时顺手挂上 `initMiddleware()` 这个内置中间件（初始化 `req.path`、`res.send` 等）。
2. **`methods` 循环**：`methods` 库导出了所有 HTTP 方法名（get/post/put/delete/patch...），`forEach` 一次性给 `App.prototype` 挂上对应方法，每个方法内部都是「懒加载 + 委托给 router 的同名方法」。
3. **`listen` 是最终入口**：`http.createServer((req, res) => this._router.handler(...))`——每个请求都交给 `router.handler` 处理，处理完（或出错）走回调。**「router.handler 就是整个请求的调度中心」**，这是理解下一层的线索。

### router/index.js：中间件链的调度核心（重点）

这是全篇最核心的一段源码。`handler` 方法就是「中间件链」的真实实现——`next` 函数内部维护 `index`，逐个取出 `stack` 里的 Layer 做匹配和分发：

```javascript
const url = require('url')
const methods = require('methods')
const Layer = require('./layer')
const Route = require('./route')

const proto = {}

// 如果一个类返回一个对象，那么会用这个对象作为实例
function Router() {
  const router = (req, res, next) => {
    router.handler(req, res, next)
  }
  router.stack = []
  router.paramsCallbacks = {}
  Object.setPrototypeOf(router, proto)
  return router
}

methods.forEach(method => {
  proto[method] = function (path, handlers) {
    if(!Array.isArray(handlers)) {
      handlers = [handlers]
    }
    // 1.给每个路由增加route属性
    const route = new Route() // 这里route中要存储用户的真实回调
    // 每次调用路由的时候会产生一层
    const layer = new Layer(path, route.dispatch.bind(route))
    layer.route = route // 路由中每层都有一个route属性
    // 3.最终将这一层放到路由系统中
    this.stack.push(layer)
    route[method](path, handlers)
    // console.log(layer, layer.route.stack) // 这里是路由系统中的每一层
  }
})
```

先看 `Router` 构造函数的一个巧妙设计：它**返回一个函数** `router`，而不是一个普通对象。这个 `router` 函数自身调用 `router.handler`，同时通过 `Object.setPrototypeOf(router, proto)` 把方法挂到原型链上——这样 `router` 既能当「函数」被 `http.createServer` 或父 Router 调用，又能当「对象」用 `router.get/use/handler` 等方法。这是「函数 + 原型」混用的经典技巧。

`methods.forEach` 给每个 HTTP 方法定义注册逻辑：注册一个路由 = 新建一个 `Route` 对象 + 新建一个外层 `Layer`（存 `route.dispatch`）+ 把 Layer 塞进 `router.stack`。注意 `layer.route = route` 这步——**外层 Layer 通过 `route` 属性关联到内层 Route**，这是后面 `handler` 里「匹配到路径后还要判断方法」的结构依据。

接下来是 `handle_params`（处理路由参数中间件）和核心的 `handler`：

```javascript
proto.handle_params = function (req, res, layer, done) {
  const paramsCallbacks = this.paramsCallbacks
  const keys = layer.keys.map(i => i.name)
  if(!keys.length) return done()

  let idx = 0
  let key
  let fns

  let i = 0
  const processCallback = () => {
    const fn = fns[i++]
    if(typeof fn === 'function') {
      fn(req, res, processCallback, layer.params[key], key)
    } else {
      i = 0
      next() // 参数1处理完再处理参数2，以此类推....
    }
  }
  const next = () => {
    if(idx >= keys.length) return done()
    key = keys[idx++]
    fns = paramsCallbacks[key]
    if(fns && fns.length) {
      processCallback()
    } else {
      next()
    }
  }
  next()
}

proto.handler = function (req, res, out) {
  const { pathname } = url.parse(req.url)
  const method = req.method?.toLowerCase()

  let index = 0
  let removed = ''
  const next = (error) => {
    if (index >= this.stack.length) {
      // return res.end(`Can not get ${pathname}`)
      return out(error)
    }
    const layer = this.stack[index++]

    //! 从上一个next到下一个next 就表示出来了，需要加上中间件路径
    if(removed.length > 0) {
      req.url = removed + req.url
      removed = ''
    }
    if (error) { // 错误情况处理
      if(!layer.route) { // 如果没有route，那么就是中间件
        if(layer.handler.length === 4) { // 4个参数是错误中间件
          layer.handle_error(error, req, res, next)
        } else { // 是普通中间件
          next(error)
        }
      } else { // 路由
        next(error)
      }
    } else { // 正常情况处理
      const match = layer?.match(pathname)
      //! 顶层只判断请求路径，内层判断请求方法
      if (match) {
        // 匹配路由和中间件
        // 无论是中间件还是路由要求路径都要匹配，路由需要配方法
        if (!layer.route && layer.isUseMiddleware) {
          if (layer.handler.length === 4) { // 4个参数是错误中间件
            next() // 正常情况下不处理错误中间件
          } else { // 是普通中间件
            //! 进入中间件的时候，需要删除中间件的路径
            removed = layer.path === '/' ? '' : layer.path
            req.url = req.url.slice(removed.length) || '/'
            layer.handle_request(req, res, next)
          }
        } else {
          if (layer.route?.methods?.[method]) {
            // 将匹配到的路由参数挂载到req上
            req.params = req.params || {}
            Object.assign(req.params, layer.params)

            // 处理query参数
            req.query = req.query || {}
            const searchParams = new URL(req.url, 'http://localhost').searchParams
            for (const [key, value] of searchParams.entries()) {
              req.query[key] = value
            }
            // 处理param完毕后，在处理真正的响应
            this.handle_params(req, res, layer, () => {
              //! 顶层这里调用的 handler 其实就是 dispatch 函数
              layer.handle_request(req, res, next)
            })
          } else {
            next()
          }
        }
      } else {
        next()
      }
    }
  }
  next()
  // res.statusCode = 404
  // res.end('404 Not Found')
}
```

这段 `handler` 是「中间件链」的完整答案。逐行看 `next` 函数在做什么：

- **`index >= this.stack.length`** → 数组遍历完了，调用 `out(error)` 兜底（`out` 是 `application.js` 里 `listen` 传来的回调，最终返回「Can not get xxx」或错误信息）
- **`const layer = this.stack[index++]`** → 取出当前 Layer，索引 +1（**这就是「next 推进」的本质：一句话完成**）
- **`removed` 机制** → 处理「带路径的中间件」：进入中间件时把中间件路径从 `req.url` 里剥掉（这样子路由里看到的路径是相对的），下一个 `next` 再把剥掉的部分加回来
- **错误分支（`error` 有值）** → 只有 `layer.handler.length === 4` 的中间件才处理错误，其它（普通中间件和路由）一律 `next(error)` 跳过
- **正常分支** → 先 `layer.match(pathname)` 判断路径是否匹配；匹配后再区分「中间件」和「路由」；路由还要再判断 `layer.route.methods[method]` 方法是否命中

这里藏着「错误处理四参数约定」和「路由匹配」的全部证据：`layer.handler.length === 4` 就是识别错误中间件的那一行；`layer.match(pathname)` 就是路径匹配入口；`layer.route?.methods?.[method]` 就是「外层匹配路径、内层匹配方法」的两级判断。

再看 `use` 和 `param`：

```javascript
proto.use = function (path, handlers) {
  if (typeof path === 'function') { // 如果是函数，那么就是中间件
    handlers.unshift(path) // 将函数放到数组的第一个
    path = '/'
  }
  handlers.forEach(handler => { // 遍历用户传入的中间件
    const layer = new Layer(path, handler) // 创建一个layer
    layer.isUseMiddleware = true // 标识这个layer是一个中间件
    this.stack.push(layer) // 将layer放到路由系统中
  })
}

proto.param = function(key, cb) {
  if (typeof cb !== 'function') {
    throw new TypeError('param() requires a callback function')
  }
  if(this.paramsCallbacks[key]) {
    this.paramsCallbacks[key].push(cb)
  } else {
    this.paramsCallbacks[key] = [cb]
  }
}

module.exports = Router
```

`use` 和 `method` 的关键区别：

- `method`（如 `get`）注册的 Layer **有 `route` 属性**（关联内层 Route）
- `use` 注册的 Layer **没有 `route`，但多一个 `isUseMiddleware = true` 标记**

`handler` 里正是靠 `!layer.route && layer.isUseMiddleware` 来区分「中间件」和「路由」两条处理路径的。

### route.js：内层方法分发

```javascript
const methods = require('methods')
const Layer = require('./layer')

function Route () {
  this.stack = []
  this.methods = {} // 存储当前路由支持的方法
}

/**
 * 遍历执行当前路由对象中的所有处理函数
 */
Route.prototype.dispatch = function(req, res, out) {
  //! 遍历内层的 stack
  let index = 0
  const method = req.method.toLowerCase()
  const next = (error) => {
    if(error) return out(error)
    if(index >= this.stack.length) return out()
    const layer = this.stack[index++]
    // console.log('layer.method', layer.method, method, req.url)
    if(layer.method === method) {
      layer.handler(req, res, next)
    } else {
      next()
    }
  }
  next()
}

methods.forEach(method => {
  Route.prototype[method] = function (path, handlers) {
    handlers.forEach(handler => {
      const layer = new Layer(path, handler) // 这里的layer 中不需要路径 path
      layer.method = method
      this.methods[method] = true // 标记当前路由支持的方法
      this.stack.push(layer)
    })
  }
})

module.exports = Route
```

`Route` 内部又是一套「stack + next」——但它分发的是**方法**，不是路径。`dispatch` 遍历内层 Layer，`layer.method === method` 才调用真正的处理函数。这就是「一个路径 `/list` 可以同时注册 get/post/put/delete，请求来了按方法分发」的实现。

注意 `Route` 的内层 `next` 语义和 `router.handler` 的 `next` 不同：内层 `next` 是「在同一条路径的处理函数之间推进」（比如 `/home` 挂了三个 `get` 处理函数，靠它依次触发），外层 `next` 是「在不同路径/中间件之间推进」。两层 `next` 嵌套，构成了完整的调度体系。

### layer.js：路径匹配 + 错误处理

```javascript
const pathToRegexp = require('path-to-regexp')

// express 模型里面有两个地方使用这个layer
// Router.stack =[] path用户写的路径 route.dispatch
// Route.stack=[] 路径没有意义 用户写的真实回调，里层的layer还需要写方法

function Layer(path, handler) {
  this.path = path
  this.handler = handler
  this.keys = []
  this.regexp = pathToRegexp(path, this.keys, {
    strict: true
  })
  this.params = {}
  this.query = {}
}

Layer.prototype.match = function (pathname) {
  const match = this.regexp.exec(pathname)
  if(match) {
    this.keys.forEach((key, index) => {
      this.params[key.name] = match[index + 1]
    })
    return true
  }

  //! 匹配use中间件的路径处理
  if(this.isUseMiddleware) {
    if(this.path === '/') {
      return true
    }
    if(pathname.startsWith(`${this.path}/`)) {
      return true
    }
  }
  return false
}

Layer.prototype.handle_request = function (req, res, next) {
  try {
    this.handler(req, res, next)
  } catch (error) {
    next(error)
  }
}

Layer.prototype.handle_error = function (err, req, res, next) {
  this.handler(err, req, res, next)
}

module.exports = Layer
```

`Layer` 是「路径匹配」的实现载体，三个要点：

1. **构造函数里 `pathToRegexp(path, this.keys, { strict: true })`** → 把路径字符串编译成正则，参数名存进 `keys`。这就是「路由匹配算法」的落地——`/users/:userId/books/:bookId` 编译后，`keys` 里是 `['userId', 'bookId']`，`match` 时用正则捕获组和 `keys` 一一对应组装 `params`。
2. **`match` 方法** → 先 `regexp.exec(pathname)` 精确匹配路由；如果是中间件（`isUseMiddleware`），再走「前缀匹配」逻辑（`/` 全匹配、`startsWith(path + '/')` 前缀匹配）。
3. **`handle_request` 的 `try/catch`** → 捕获处理函数里**同步抛出的错误**，转成 `next(error)` 进入错误处理流程。这是「同步错误如何进入错误中间件」的关键——它把「抛异常」统一转换成「next(err)」这条通道。

`handle_error` 则是对应错误分支：调用 `this.handler(err, req, res, next)`，把错误作为第一个参数传进去。

### middleware/init.js：内置中间件

```javascript
const fs = require('fs')

function init() {
  return (req, res, next) => {
    const { pathname } = new URL(req.url, 'http://localhost')
    req.path = pathname

    res.send = function(msg){
      let type = typeof msg
      if(type == 'object'){
        res.setHeader('Content-Type','application/json')
        msg = JSON.stringify(msg)
        res.end(msg)
      }else if(type == 'number'){
        res.setHeader('Content-Type','application/plain')
        res.status(msg)
        res.end(http.STATUS_CODES[msg])
      }else{
        res.setHeader('Content-Type','application/html')
        res.end(msg)
      }
    }

    res.sendFile = function(path){
      fs.createReadStream(url).pipe(res)
    }

    next()
  }
}

module.exports = init
```

这是 `lazy_route` 时挂载的第一个内置中间件，负责初始化 `req.path`、`res.send`、`res.sendFile`。`res.send` 的「智能响应」逻辑一目了然：`object` 转 JSON、`number` 转状态码短语、其它按字符串处理。

> ⚠️ 说明：这段 `init.js` 是笔记里的**示意实现**，有两处为了聚焦「中间件机制」而做的简化（真实 Express 里这些能力在 `lib/response.js` 里，要健壮得多）：`send` 里的 `http.STATUS_CODES` 需要 `require('http')` 才能用；`sendFile` 里的 `url` 应该是参数 `path`（把文件路径传给 `fs.createReadStream`）。读的时候抓「中间件如何挂载能力」这个重点即可，不必纠结这两处笔误。

---

## 四、手写实现（mini-express：渐进式 + 四层对齐）

理解了原理和四层源码，这一节从零手写。分两个阶段：**先渐进式**（用最少的代码把「线性中间件执行器」的内核跑通），**再四层对齐**（把结构升级成 application/router/layer/route，与真实 Express 对齐）。手写代码尽量和源码一致。

### 阶段一：渐进式演进

**第一步：最简线性路由**

先只支持 `get`，用 `app.routes` 数组存「路径 + 方法 + 处理函数」，请求来了线性遍历匹配：

```javascript
let url = require('url')
let express = function () {
  let app = function (req, res) {
    let { pathname } = url.parse(req.url, true)
    let method = req.method.toLowerCase()
    for (let i = 0; i < app.routes.length; i++) {
      let { path, method, handler } = app.routes[i]
      if ((path == pathname || path == '*') && method == req.method.toLowerCase()) {
        return handler(req, res)
      }
    }
    res.end(`CANNOT ${req.method} ${req.url}`)
  }
  app.routes = []
  app.listen = function (port) {
    require('http').createServer(app).listen(port)
  }
  app.get = function (path, handler) {
    app.routes.push({
      path, handler, method: 'get'
    })
  }
  return app
}

module.exports = express
```

这就是最朴素的「路由匹配」：遍历数组，路径和方法都对上就调处理函数。`app` 是一个函数（`http.createServer` 需要函数），同时挂载 `routes`/`listen`/`get` 属性——「函数 + 属性」这个形态，后面四层架构里会演变成 `Router` 的「函数 + 原型」。

**第二步：加上 use 中间件和 next 递归**

`use` 注册中间件（`method: 'middle'`），`next` 函数维护 `index` 递归调用：

```javascript
app.use = function (path, fn) {
  if (typeof fn != 'function') {
    fn = path
    path = '/'
  }
  app.routes.push({ method: 'middle', path: path, fn: fn })
}
```

```javascript
let url = require('url')
let http = require('http')
let express = function () {
  let app = function (req, res) {
    let { pathname } = url.parse(req.url, true)
    let method = req.method.toLowerCase()
    let index = 0

    function next(err) {
      if (index >= app.routes.length) {
        return res.end(`CANNOT ${method} ${pathname}`)
      }
      let route = app.routes[index++]
      if (route.method == 'middle') {
        if (route.path == '/' || pathname.startsWith(route.path + '/') || route.path == pathname) {
          route.handler(req, res, next)
        } else {
          next()
        }
      } else {
        if ((route.path == pathname || route.path == '*') && (route.method == req.method.toLowerCase()) || method == 'all') {
          return route.handler(req, res)
        } else {
          next()
        }
      }
    }

    next()
  }
  app.routes = []
  app.listen = function (port) {
    http.createServer(app).listen(port)
  }
  http.METHODS.forEach(function (method) {
    method = method.toLowerCase()
    app[method] = function (path, handler) {
      app.routes.push({
        path, handler, method
      })
    }
  })
  app.all = function (path, handler) {
    app.routes.push({
      path, handler, method: 'all'
    })
  }
  app.use = function (path, handler) {
    if (typeof handler != 'function') {
      handler = path
      path = '/'
    }
    app.routes.push({
      method: 'middle',
      path,
      handler
    })
  }

  return app
}

module.exports = express
```

这里 `next` 函数已经是「中间件链」的雏形：`index` 维护当前处理到第几个，`next()` 把 `index` 推进后继续匹配。中间件走「前缀匹配」，路由走「精确匹配」。`http.METHODS.forEach` 一次性挂上所有方法，和四层源码里的 `methods.forEach` 是同一套思路。

**第三步：错误中间件（fn.length === 4）**

在 `next` 里加错误分支：`err` 有值时，只有 `handler.length === 4` 的中间件才处理：

```javascript
let url = require('url')
let http = require('http')
let express = function () {
  let app = function (req, res) {
    let { pathname } = url.parse(req.url, true)
    let method = req.method.toLowerCase()
    let index = 0

    function next(err) {
      if (index >= app.routes.length) {
        return res.end(`CANNOT ${method} ${pathname}`)
      }
      let route = app.routes[index++]
      if (err) {
        if (route.method == 'middle' && route.handler.length == 4) {
          route.handler(req, res, next)
        }
      }
      if (route.method == 'middle') {
        if (route.path == '/' || pathname.startsWith(route.path + '/') || route.path == pathname) {
          route.handler(req, res, next)
        } else {
          next()
        }
      } else {
        if ((route.path == pathname || route.path == '*') && (route.method == req.method.toLowerCase()) || method == 'all') {
          return route.handler(req, res)
        } else {
          next()
        }
      }
    }

    next()
  }
  // ... 其余同第二步
  return app
}

module.exports = express
```

`route.handler.length == 4` 就是「函数签名反射」的最简落地——四参数判定错误中间件。

**第四步：params（:id 动态参数）**

给路由支持 `:id` 参数，注册时把 `:name` 替换成正则捕获组，匹配时组装 `req.params`：

```javascript
let url = require('url')
let http = require('http')
let express = function () {
  let app = function (req, res) {
    let { pathname, query } = url.parse(req.url, true)
    let method = req.method.toLowerCase()
    let index = 0
    req.path = pathname
    req.query = query

    function next(err) {
      if (index >= app.routes.length) {
        return res.end(`CANNOT ${method} ${pathname}`)
      }
      let route = app.routes[index++]

      if (err) {
        if (route.method == 'middle' && route.handler.length == 4) {
          route.handler(req, res, next)
        } else {
          next()
        }
      } else {
        if (route.method == 'middle') {
          if (route.path == '/' || pathname.startsWith(route.path + '/') || route.path == pathname) {
            route.handler(req, res, next)
          } else {
            next()
          }
        } else {
          if (route.paramNames) {
            let matchers = pathname.match(new RegExp(route.path))
            if (matchers) {
              let params = {}
              for (let i = 0; i < route.paramNames.length; i++) {
                params[route.paramNames[i]] = matchers[i + 1]
              }
              req.params = params
              route.handler(req, res)
            } else {
              next()
            }
          } else {
            if ((route.path == pathname || route.path == '*') && (route.method == req.method.toLowerCase()) || method == 'all') {
              return route.handler(req, res)
            } else {
              next()
            }
          }
        }
      }
    }

    next()
  }
  app.routes = []
  app.listen = function (port) {
    http.createServer(app).listen(port)
  }
  http.METHODS.forEach(function (method) {
    method = method.toLowerCase()
    app[method] = function (path, handler) {
      const layer = { path, handler, method }
      if (path.includes(':')) {
        let paramNames = []
        layer.path = path.replace(/:([^\/]+)/g, function () {
          paramNames.push(arguments[1])
          return '([^\/]+)'
        })
        layer.paramNames = paramNames
      }
      app.routes.push(layer)
    }
  })
  app.all = function (path, handler) {
    app.routes.push({
      path, handler, method: 'all'
    })
  }
  app.use = function (path, handler) {
    if (typeof handler != 'function') {
      handler = path
      path = '/'
    }
    app.routes.push({
      method: 'middle',
      path,
      handler
    })
  }
  return app
}

module.exports = express
```

这里 `:name` 被替换成正则 `([^\/]+)`（非斜杠字符组），同时 `paramNames` 记录参数名，匹配后用捕获组组装 `req.params`——这就是 `path-to-regexp` 做的那件事的**手写简化版**。

**第五步：res.send / redirect / static / bodyParser / render**

补充响应方法和常用中间件的手写：

`res.send` 智能响应：

```javascript
res.send = function (msg) {
  let type = typeof msg
  if (type == 'object') {
    res.setHeader('Content-Type', 'application/json')
    msg = JSON.stringify(msg)
  } else if (type == 'number') {
    res.setHeader('Content-Type', 'application/plain')
    res.status(msg)
    res.end(http.STATUS_CODES[msg])
  } else {
    res.setHeader('Content-Type', 'application/html')
    res.end(msg)
  }
}
```

`res.redirect` 302 重定向：

```javascript
res.redirect = function (url) {
  res.status(302)
  res.headers('Location', url || '/')
  res.sendHeader()
  res.end()
}
```

`express.static` 静态文件服务器：

```javascript
express.static = function (p) {
  return function (req, res, next) {
    var staticPath = path.join(p, req.path)
    var exists = fs.existsSync(staticPath)
    if (exists) {
      res.sendFile(staticPath)
    } else {
      next()
    }
  }
}
```

`bodyParser` 接收 POST 请求体：

```javascript
function bodyParser () {
  return function (req, res, next) {
    var result = ''
    req.on('data', function (data) {
      result += data
    })
    req.on('end', function () {
      try {
        req.body = JSON.parse(result)
      } catch (e) {
        req.body = require('querystring').parse(result)
      }
      next()
    })
  }
}
```

`res.render` 模板渲染：

```javascript
res.render = function (name, data) {
  var viewEngine = engine.viewEngineList[engine.viewType]
  if (viewEngine) {
    viewEngine(path.join(engine.viewsPath, name + '.' + engine.viewType), data, function (err, data) {
      if (err) {
        res.status(500).sendHeader().send('view engine failure' + err)
      } else {
        res.status(200).contentType('text/html').sendHeader().send(data)
      }
    })
  } else {
    res.status(500).sendHeader().send('view engine failure')
  }
}
```

到这里，`mini-express` 的单文件版已经覆盖了「路由、中间件、错误处理、params、send、redirect、static、bodyParser、render」全部核心能力。但它还停留在「一个数组打天下」的扁平结构——当路由多起来，这个数组会越来越难维护。这就是第二阶段「四层对齐」要解决的问题。

### 阶段二：四层对齐（application / router / layer / route）

第二阶段把结构升级成四层，代码和「三、源码解析」里的 g-express 完全一致（这里不再重复贴全部代码，重点看「从扁平数组到四层」这一步的设计转变）：

- **application**：`App` 类，`methods.forEach` 挂方法，`lazy_route` 懒加载，`listen` 委托 `router.handler`
- **router**：`stack` 数组存外层 Layer，`handler` 用 `index + next` 遍历分发
- **layer**：`pathToRegexp` 编译正则，`match` 匹配，`handle_request`/`handle_error` 调用
- **route**：`stack` 数组存内层 Layer，`dispatch` 按方法分发

完整代码见「三、源码解析」章（g-express 四层），这里给出验证用的测试代码：

```javascript
const express = require('../lib/express')

const app = express()
const port = 5500

// 1.路径位 / 表示任何路径都能匹配到
// 2.如果以这个路径(匹配开头一段路径)也可以匹配到
// 3.和路由的路径完全一样，也可以匹配到

// 中间件不具备方法(针对路径拦截)，也不具备传递多个参数push({ path, method: 'get', handler })
// 中间件肯定的基于路径来做(扩展性，扩展方法)
app.use((req, res, next) => {
  console.log('use')
  next()
})

app.get('/', (req, res, next) => {
  console.log(1)
  next()
}, (req, res, next) => {
  console.log(2)
  next()
}, (req, res, next) => {
  console.log(3)
  res.end('this is page!!')
})

app.get('/home', (req, res, next) => {
  console.log(1)
  next()
})

app.get('/home', (req, res, next) => {
  console.log(2)
  next()
})

app.get('/home', (req, res, next) => {
  console.log(3)
  res.end('this is home!!')
})

app.get('/ab?cd', (req, res) => {
  res.end('get /ab?cd')
})

app.post('/ab*cd', (req, res) => {
  res.end('post /ab*cd')
})

app.get('/users/:userId/books/:bookId', (req, res) => {
  console.log(req.params)
  res.end('get /users/:userId/books/:bookId')
})

app.get('/list', (req, res) => {
  res.end('get /list')
})

app.post('/list', (req, res) => {
  res.end('post /list')
})

app.put('/list', (req, res) => {
  res.end('put /list')
})

app.patch('/list', (req, res) => {
  res.end('patch /list')
})

app.delete('/list', (req, res) => {
  res.end('delete /list')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
```

这段测试代码验证了几个关键行为：

- `/` 挂了三个处理函数，靠 `route.dispatch` 内层 `next` 依次触发，打印 `1 2 3`
- `/home` 挂了三个 `get`，靠「调 `next` 继续向后匹配」机制依次触发
- `/users/:userId/books/:bookId` 验证 `path-to-regexp` 的动态参数，`req.params` 打印 `{ userId: '1', bookId: '2' }`
- `/list` 同路径注册五种方法，验证「外层匹配路径、内层匹配方法」的两级分发

配套的 HTTP 请求测试文件（`Api.http`，用 REST Client 插件可以直接点发送）：

```http
@baseUrl = http://localhost:5500

GET {{baseUrl}}/user HTTP/1.1

###

GET {{baseUrl}}/user?userId=1&bookId=2 HTTP/1.1

###

GET {{baseUrl}}/user/1/book/2 HTTP/1.1

###

POST {{baseUrl}}/user HTTP/1.1
Content-Type: application/json

{
  "name": "John Doe",
  "age": 30
}

###

PUT {{baseUrl}}/user HTTP/1.1
Content-Type: application/json

{
  "name": "John Doe",
  "age": 30
}

###

PATCH {{baseUrl}}/user HTTP/1.1
Content-Type: application/json

{
  "name": "John Doe",
  "age": 30
}

###

DELETE {{baseUrl}}/user HTTP/1.1
Content-Type: application/json

{
  "name": "John Doe",
  "age": 30
}

###

POST {{baseUrl}}/user/add HTTP/1.1
Content-Type: application/json

{
  "name": "John Doe",
  "age": 30
}

###

POST {{baseUrl}}/user/remove HTTP/1.1
Content-Type: application/json

{
  "name": "John Doe",
  "age": 30
}

###

POST {{baseUrl}}/home HTTP/1.1
Content-Type: application/json

{
  "name": "John Doe",
  "age": 30
}

###

POST {{baseUrl}}/article/add HTTP/1.1
Content-Type: application/json

{
  "name": "article1",
  "age": 10
}

###

POST {{baseUrl}}/article/remove HTTP/1.1
Content-Type: application/json

{
  "name": "article2",
  "age": 20
}
```

> 用「患者列表增删查」验证整条链路：`GET /patients` 查列表、`POST /patients` 新增、`GET /patients/:id` 查单个（走 `:id` 动态参数）、`PUT /patients/:id` 改、`DELETE /patients/:id` 删——覆盖「路由匹配 + 动态参数 + 方法分发 + 中间件链」四件事在一条真实业务链路上的协同。

---

## 五、手写实现源码地址

- 手写仓库：`medai-node-source`（`packages/mini-express`，渐进式单文件版 + 四层对齐版，地址待补充）
- 参考实现：https://github.com/lotosv2010/g-express

---

## 六、参考资料

- https://expressjs.com/
- https://github.com/expressjs/express
- https://github.com/pillarjs/path-to-regexp
- 源码解析辅助：搜索关键词「三步法解析 Express 源码」「从 express 源码中探析其路由机制」

---

## 💡 面试核心问

- **Express 中间件的执行模型是怎样的？`next()` 具体做了什么？**（内部维护一个中间件数组 + 索引，`next()` 把索引 +1 取下一个匹配的中间件继续调用；不调 `next` 又不 `res.end` 请求就挂起）
- **为什么 Express 里「前置逻辑」和「后置逻辑」不能像 Koa 一样写在同一个中间件函数里？**（Express 是单向线性，`next()` 同步调用下游、不会回溯；Koa 的 `await next()` 返回 Promise，内层跑完会回来）
- **Express 是怎么识别一个中间件是「错误处理中间件」的？**（`fn.length === 4` 函数签名反射，四参数 `(err, req, res, next)`）
- **在普通中间件里调用 `next(err)` 会发生什么？**（进入错误分支，跳过沿途所有普通中间件和路由，直达最近的错误处理中间件）
- **Express 的路由匹配是怎么工作的？如果多个路由匹配同一个路径会怎样？**（`path-to-regexp` 编译成正则，按注册顺序逐个匹配；第一个命中生效，若它调了 `next` 则继续向后匹配下一个）

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 面试频率 |
|--------|-----------|---------|
| 中间件链本质 | 数组 + 索引 + `next` 递归，`next` 归还控制权 | ⭐⭐⭐ 必考 |
| 单向线性 vs 洋葱 | Express 线性不回溯；Koa `await next` 双向穿透 | ⭐⭐⭐ 必考 |
| 路由匹配 | `path-to-regexp` 编译正则，顺序匹配，首个命中 | ⭐⭐⭐ 必考 |
| 错误中间件识别 | `fn.length === 4` 函数签名反射 | ⭐⭐⭐ 必考 |
| `next(err)` 行为 | 跳过普通中间件，直达最近错误中间件 | ⭐⭐ 高频 |
| req/res vs ctx | Express 直接扩展原生对象；Koa 新抽象 `ctx` | ⭐⭐ 高频 |
| Connect 历史 | `(req,res,next)` 签名继承自 Connect | ⭐ 了解 |

> 💡 记住这条主线：**一个请求进来 → 按数组顺序匹配（`path-to-regexp` 正则）→ 匹配到就调 `next` 交给下一个 → 出错走 `length===4` 的错误中间件**。Express 的一切行为，都是这个「数组 + 索引 + next」模型在起作用。

---

## 📝 思考题

Express 靠 `fn.length === 4` 识别错误处理中间件。那问题来了：如果我不小心把错误处理中间件写成了 `(err, req, res) => {}`（**漏掉最后一个 `next` 参数**，`length` 变成 3），会发生什么？它会被当成普通中间件，错误到达这里时会被**跳过**——那这个错误最终会去哪？提示：跟着 `handler` 里的错误分支一路 `next(error)` 走到 `out(error)` 看看。欢迎评论区写出你的答案 👇

---

> 🔖 这是「Node.js 全栈深度拆解」系列第 7 篇。上一篇：《Web 认证体系：Cookie/Session/JWT/OAuth2 设计原理与安全实践》；下一篇预告：《Koa 深度：洋葱模型/compose 原理/对比 Express/手写实现》——同样是中间件，Koa 怎么用 `await next()` 把「双向穿透」做到极致。
>
> 前置基础扩展阅读：搜索关键词「JS 异步编程 Promise async/await」「Node.js 事件循环」「path-to-regexp 路由匹配」
