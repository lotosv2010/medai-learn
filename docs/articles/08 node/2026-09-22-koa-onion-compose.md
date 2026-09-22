# Koa 深度：洋葱模型 + koa-compose 源码 + 对比 Express + 手写实现（面试收藏级）

> **副标题**：洋葱模型的双向穿透、`koa-compose` 的递归实现、`ctx` 上下文对象设计、async/await 原生适配

> 面试官说「说说 Koa 的洋葱模型」，多数人只会画个同心圆背一句「先进后出」。能把 `koa-compose` 那十几行递归讲明白、能说清 `ctx` 和 `req`/`res` 的设计取舍、能讲透为什么 Koa 能在最外层一个 `try/catch` 统一兜底错误——才是真正理解了 Koa 这套模型。

---

## 🎯 这篇文章解决什么问题

从 Express 转到 Koa，最大的认知门槛不是语法——`app.use(async (ctx, next) => {...})` 谁都会写——而是「洋葱模型」这四个字背后的执行机制。为什么 Koa 的中间件能「环绕」？为什么错误能在最外层一个 `try/catch` 里统一接住？为什么 `ctx.body = xxx` 背后还藏着一套属性代理？

这篇文章是「Node.js 全栈深度拆解」系列的第 8 篇，紧接第 7 篇 Express。它不重复讲 HTTP 基础，只沿着一条主线往下钻：

**洋葱模型（现象）→ `koa-compose`（实现）→ async/await（为什么能这么写）→ `ctx` 设计（取舍）→ 对比 Express → 手写 `mini-koa`（验证）**

读完你能做到两件事：一是面试时把「洋葱模型」从背概念讲到源码级；二是真正搞懂 Koa 和 Express 在**中间件模型**上的本质分野——这不是「谁更好」的站队，而是「什么场景该选谁」的判断力。

> 说明：cookie/session 在系列第 6 篇《Web 认证体系》已讲透，跨域归《网络原理》系列，本篇不重复。

---

## 一、使用与实践

### 1. 最简 Koa 应用

`new Koa()` 拿到应用实例，`app.use()` 注册中间件，中间件签名是 `async (ctx, next) => {...}`——注意它只有两个参数，比 Express 的 `(req, res, next)` 少了一个：

```javascript
const Koa = require('koa')
const app = new Koa()

app.use(async ctx => {
  ctx.body = 'Hello Koa'   // ctx.body 即服务端响应的数据
})

app.listen(3000, () => {
  console.log('running...')
})
```

一个值得记住的细节：**即便不给 `ctx.body` 赋值，或访问了不存在的路由，页面也会返回 `Not Found`，而不是一直挂起**。这是 Koa 底层做的兜底——它默认给响应状态码设为 `404`，中间件跑完后根据 `ctx.body` 是否为 null 决定返回 `Not Found` 还是真实响应体。原生 Node 或 Express 里，忘了 `res.end()` 请求会一直悬着。

### 2. ctx 统一上下文对象

Koa 把 Node 原生的 `request`/`response` 都封装进了 `ctx`，每次请求创建一个全新的 `ctx`，在中间件里作为「接收器」使用。`ctx.request`/`ctx.response`/`ctx.body`/`ctx.status` 是最常用的几个。

这里有个**极易混淆、面试爱追问**的点：分清 `request`、`response`、`req`、`res` 四个对象：

| 对象 | 含义 |
|------|------|
| `ctx.request` | Koa 封装的**请求对象** |
| `ctx.response` | Koa 封装的**响应对象** |
| `ctx.req` | Node.js **原生**请求对象（`http.IncomingMessage`） |
| `ctx.res` | Node.js **原生**响应对象（`http.ServerResponse`） |

> ⚠️ **绕过 Koa 的 `response` 直接操作原生 `res`，是不会被 Koa 处理的。** 避免直接使用下面这些原生方法：

```javascript
res.statusCode
res.writeHead()
res.write()
res.end()
```

甚至用 `ctx.res.write('hello')` 也拿不到预期结果——它会在 Koa 后续 `res.end(body)` 时把内容拼接上，得到 `hellook` 这种怪结果（`hello` + Koa 兜底的 `ok`）。记住一句话：**在 Koa 里，读写请求响应的入口只有一个——`ctx`**。

> 💬 **面试官**：`ctx.request`、`ctx.response`、`ctx.req`、`ctx.res` 分别是什么？为什么不能直接操作 `ctx.res`？
>
> ✅ 标准答案：`ctx.request`/`ctx.response` 是 Koa 封装的对象，`ctx.req`/`ctx.res` 是 Node 原生的 `IncomingMessage`/`ServerResponse`。Koa 的响应处理逻辑（状态码兜底、`body` 序列化、`Content-Type` 设置）都走 `ctx.response`，绕过它直接操作 `ctx.res` 会被 Koa 的后续逻辑覆盖或拼接，拿不到预期结果。

### 3. 洋葱模型的执行顺序

多个中间件会形成「堆栈结构」，按**先进后出**的顺序执行。看这段带编号的日志，一眼就能看懂：

```javascript
app.use(async (ctx, next) => {
  console.log('1中间件第1次执行')
  await next()
  console.log('7中间件第7次执行')
})
app.use(async (ctx, next) => {
  console.log('2中间件第2次执行')
  await next()
  console.log('6中间件第6次执行')
})
router.get('/user', async (ctx, next) => {
  console.log('3中间件第3次执行')
  await next()
  console.log('5中间件第5次执行')
})
router.get('/user', (ctx, next) => {
  console.log('4中间件第4次执行')
  ctx.body = 'Hello Koa'
})
// 1中间件第1次执行
// 2中间件第2次执行
// 3中间件第3次执行
// 4中间件第4次执行
// 5中间件第5次执行
// 6中间件第6次执行
// 7中间件第7次执行
```

执行顺序是 `1→2→3→4→5→6→7`：先一路「钻进去」，钻到最内层（没有 `next` 的那个中间件）再一路「返回来」。这就是所谓的「洋葱图」：

![KOA 中间件洋葱模型：请求先依次进入各中间件 NEXT 前的代码，到达最内层后响应再按相反顺序依次返回执行 NEXT 后的代码](https://cdn.nlark.com/yuque/0/2025/png/738210/1742348777090-4642e879-318b-4555-925c-94a29fae519a.png)

### 4. await next() 前后写环绕逻辑

洋葱模型最实用的价值：**「进入时逻辑」写在 `await next()` 前面，「离开时逻辑」写在后面**，两者属于同一个中间件函数体。最典型的例子是记录请求耗时：

```javascript
app.use(async (ctx, next) => {
  const start = Date.now()          // 进入时：记录开始时间
  await next()                       // 等后续所有中间件 + 路由处理完
  const cost = Date.now() - start    // 离开时：计算耗时
  console.log(`${ctx.method} ${ctx.url} - ${cost}ms`)
})
```

这段代码里，`start` 和 `cost` 之间隔着一整个「后续中间件链」。如果是 Express 的线性模型，「记录开始时间」和「计算耗时」必须拆成**两个独立注册的中间件**——先注册一个记开始时间的，再注册一个算耗时的，而且后者要能拿到前者存的值，得靠往 `req` 上挂属性或闭包外部变量来传递。Koa 把它们天然地收进了同一个函数体。

### 5. koa-router 拆分路由

Koa 核心**不内置路由**，需要 `koa-router` 模块——这是和 Express 最显著的一个差异（Express 的路由是内置的）：

```bash
npm i koa-router
```

```javascript
const Koa = require('koa')
const Router = require('koa-router')
const app = new Koa()
const router = new Router()

router.get('/', async ctx => {
  ctx.body = 'Hello Router'
})

// 官方推荐：routes() 注册路由，allowedMethods() 紧跟其后按 ctx.status 设置响应头
app.use(router.routes()).use(router.allowedMethods())

app.listen(3000)
```

路由匹配过程中，**同一个路径会从上往下依次执行多个中间件**，直到最后一个没有 `next` 参数的中间件为止：

```javascript
router.get('/user', async (ctx, next) => {
  console.log(111)
  await next()
})
router.get('/user', async (ctx, next) => {
  console.log(222)
  await next()
})
router.get('/user', async ctx => {
  console.log(333)
  ctx.body = 'Hello'
})
// 依次打印 111 222 333
```

### 6. 按需插件的两个例证

Koa 不内置请求体解析和静态资源，这两样在 Express 里是「近乎标配」（`express.json()`、`express.static()`），在 Koa 里都要自己装。这正是「核心极简 + 按需插件」哲学的体现，也是理解「为什么 Koa 本体那么小」的切入口。

**请求体解析 —— koa-bodyparser**：

```javascript
const bodyParser = require('koa-bodyparser')
app.use(bodyParser())
// 之后在路由里用 ctx.request.body 取 POST 数据
```

**静态资源 —— koa-static**：

```javascript
const path = require('path')
app.use(require('koa-static')(path.join(__dirname, 'static')))
// 模板里即可直接 <img src="/image/account.png"/>
```

### 7. 错误处理的两种方式

**方式一：`try/catch` 包裹 `await next()`**——这是 Koa 最优雅的能力，最外层一个 `try/catch` 就能兜住整条中间件链的同步/异步错误：

```javascript
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    ctx.status = err.status || 500
    ctx.body = err.message
    console.error('捕获到错误：', err)
  }
})
```

**方式二：监听 `app.on('error', ...)`**——Koa 应用本身继承自 `EventEmitter`，中间件里没被捕获的错误最终会触发 `error` 事件：

```javascript
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
})
```

两者的分工：`try/catch` 是**主动的、有位置的**错误处理（想在哪个中间件兜住就在哪写）；`app.on('error')` 是**兜底式的事件监听**（捕获那些漏网的错误，记录日志）。生产环境通常两者配合——最外层 `try/catch` 统一格式化错误响应，`app.on('error')` 负责把没接住的错误记进日志系统。

> 💬 **面试官**：Koa 里怎么处理错误？`try/catch` 和 `app.on('error')` 有什么区别？
>
> ✅ 标准答案：两种方式。一是在最外层中间件用 `try/catch` 包裹 `await next()`，整条链的异常都会以 Promise reject 形式传回来被这里接住；二是监听 `app.on('error')` 事件，Koa 继承自 `EventEmitter`，未捕获错误会触发这个事件。前者是主动的、位置明确的处理（决定返回什么错误响应），后者是兜底式日志记录。
>
> 🎁 加分答案：能说清为什么最外层一个 `try/catch` 就能兜住全部——因为 `next()` 返回的是 Promise，后续中间件抛错会沿着 Promise 链一路 reject 回来，这是 Koa 基于 async/await 重新设计中间件模型带来的天然能力（Express 做不到这一点）。

---

## 二、设计与原理

### 1. 洋葱模型：层层深入，层层返回

洋葱模型是 Koa 中间件的执行形态，一句话概括：**中间件按注册顺序「层层深入再层层返回」**。

- 第一个中间件 `next()` **之前**的代码最先执行；
- `await next()` 会一直深入调用后续所有中间件，直到最内层（没有 `next` 的那个）；
- 然后按**相反顺序**依次「返回」，执行每个中间件 `next()` **之后**的代码。

这个形态的直接收益，是「环绕型逻辑」（日志计时、异常捕获、权限校验）可以写在**同一个函数体内的前后两部分**——进入时做一件事，离开时做另一件事。不需要像 Express 那样把前置逻辑和后置逻辑拆成两个独立注册的中间件，还得靠外部变量或往 `req` 上挂属性来传递中间状态。

### 2. koa-compose 的递归组合原理

这是理解 Koa 整个执行模型的钥匙。`koa-compose` 做了一件事：**把中间件数组 `[fn1, fn2, fn3]` 通过递归，组合成一个统一的 `dispatch` 函数**。

它的核心逻辑可以展开成下面这个等价形式：

```javascript
// dispatch(0) 调用 fn1，fn1 的 next 就是「dispatch(1)」
// fn1 内部 await next() 实质上就是 await dispatch(1)
fn1(ctx, () => dispatch(1))
  → fn1 执行到 await next()，等于 await dispatch(1)
    → fn2(ctx, () => dispatch(2))
      → fn2 执行到 await next()，等于 await dispatch(2))
        → fn3(ctx, () => dispatch(3))
          → fn3 没有调用 next()，直接 return，Promise resolve
        → fn2 的 next() 落定，继续执行 fn2 的「离开」代码
    → fn1 的 next() 落定，继续执行 fn1 的「离开」代码
```

用一句话记住：**`dispatch(0)` 调用 `fn1(ctx, () => dispatch(1))`，`fn1` 里的 `await next()` 实质上就是 `await dispatch(1)`**。递归在这里产生了「层层嵌套的 Promise 链」——每个中间件都在「等」它后面的那个中间件返回，于是天然形成了洋葱的进出结构。

### 3. 为什么洋葱模型天然适配 async/await

关键点在于：**`next()` 返回一个 Promise，这个 Promise 代表「后续所有中间件执行完毕」**。

- 每个中间件都是 `async` 函数；
- `await next()` 会**等待**这个 Promise 落定（即后续所有中间件都跑完）；
- 如果后续中间件抛出异常，它会以 **Promise reject** 的形式一路传播回来；
- 于是被最外层中间件的 `try/catch` 捕获。

这就是「错误处理可以统一在最外层一个 `try/catch` 里完成」的原理——不是 Koa 做了什么魔法，而是**异常沿着 Promise 链自动往回冒**。Express 是回调风格的线性遍历，`throw` 出来的异常不会自动被某个中间件接住（同步异常要 `try/catch` 包，异步异常必须显式 `next(err)` 传递），这也是为什么 Express 需要「四参数错误处理中间件」这个特殊约定。

### 4. ctx 上下文对象设计

Koa 把 `request`/`response` 封装进统一的 `ctx`，再用 `delegates` 库把常用属性代理到 `ctx` 顶层。比如你写 `ctx.body`，实际是代理到 `ctx.response.body`；写 `ctx.status`，实际是 `ctx.response.status`。代理减少了书写层级——不用每次 `ctx.response.body`，直接 `ctx.body`。

这是相比 Express 的一种设计取舍：

| 维度 | Express | Koa |
|------|---------|-----|
| 上下文 | 直接扩展原生 `req`/`res` | 新建 `ctx`，再封装一层 `request`/`response` |
| API 风格 | `req.query`、`res.status(...).send(...)` | `ctx.query`、`ctx.body = ...` |
| 抽象层 | 薄（贴近 Node 原生） | 厚（多一层代理） |
| 收益 | 可直接复用原生 HTTP 中间件生态 | API 更统一、书写更简洁 |
| 代价 | `req`/`res` 相互独立，没有统一入口 | 不能直接把 Node 原生中间件套用到 Koa |

**多一层抽象带来了更统一的 API，但也意味着不能直接把 Node.js 原生 HTTP 中间件生态直接套用到 Koa**——这是理解「为什么有的中间件只有 Express 版、没有 Koa 版」的根因。Koa 中间件拿不到 `res` 直接操作，一切都得通过 `ctx`。

### 5. 核心极简哲学

Koa 不内置路由、请求体解析、静态资源（这些在 Express 里是内置或近乎标配的），倾向于「核心极简 + 按需插件」的设计哲学——**更小的核心，更多的自由**。Express 是「大而全，开箱即用」，Koa 是「给你一个极简内核，剩下全靠中间件拼」。

这种哲学的代价是「零配置起步要装一堆插件」，收益是「核心足够小、足够稳定，不会被不需要的功能绑架」。理解这个定位差异，是回答「Koa 和 Express 到底怎么选」的底层依据。

### 6. 对比 Express：线性遍历 vs 递归调用链

同样是「中间件模式」，两者内核完全不同：

- **Express** 是「线性数组遍历」——中间件按注册顺序排队，`next()` 把控制权交给下一个，单向前进，不回头；
- **Koa** 是「递归函数组合形成的调用链」——`dispatch` 递归产生 Promise 链，`await next()` 之后还能「回来」，双向穿透。

前者更接近传统 Node.js 回调风格（`(req, res, next)` 三个参数、显式 `next(err)` 传错），后者是为 async/await 时代重新设计的模型（两个参数、`throw` 就能被接住）。

一张表总结两者的本质差异：

| 维度 | Express | Koa |
|------|---------|-----|
| 中间件签名 | `(req, res, next)` | `(ctx, next)` |
| 执行模型 | 线性数组遍历（单向） | 递归调用链（双向洋葱） |
| 环绕逻辑 | 要拆成两个中间件 | 同一函数体 `await next()` 前后 |
| 错误处理 | 四参数错误中间件 + `next(err)` | 最外层 `try/catch` 统一兜底 |
| 上下文 | 扩展原生 `req`/`res` | 封装统一 `ctx` |
| 路由/解析 | 内置或近乎标配 | 核心不含，靠插件 |

> 💬 **面试官**：Koa 的洋葱模型和 Express 的中间件模型，本质区别是什么？
>
> ✅ 标准答案：Express 是「线性数组遍历」，中间件按注册顺序单向执行，`next()` 只是把控制权交给下一个，不会回来，所以「环绕逻辑」要拆成两个中间件；Koa 是「递归函数组合形成的调用链」，`next()` 返回 Promise、`await next()` 之后还能回来，所以前置和后置逻辑可以写在同一函数体里。本质是「回调风格的线性模型」和「async/await 时代的递归组合模型」的差异。
>
> 🎁 加分答案：能落到 `koa-compose` 的递归实现——`dispatch(0)` 调 `fn1(ctx, () => dispatch(1))`，`await next()` 实质是 `await dispatch(1)`，递归形成嵌套 Promise 链；并指出这带来的连带收益：异常能沿 Promise 链自动回传，所以 Koa 能在最外层一个 `try/catch` 统一兜错，而 Express 需要显式 `next(err)`。

---

## 三、源码解析（重点代码，来源 koajs 仓库）

> 这一节贴真实源码，验证「二」里的每一条结论。**精读重点是 `koa-compose`——它只有十几行，却是理解整个 Koa 的钥匙。**

### 1. koa-compose：完整源码逐行精读

这是 `koajs/compose` 仓库 `index.js` 的完整实现（去掉了注释，逻辑与主分支一致）：

```javascript
function compose (middleware) {
  // ① 入参校验：必须是数组，且每个元素都是函数
  if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
  for (const fn of middleware) {
    if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
  }

  // ② 返回一个标准中间件函数 (context, next)
  return function (context, next) {
    let index = -1                    // 👈 闭包变量：记录「当前执行到第几个中间件」
    return dispatch(0)                // 👈 从第 0 个开始执行

    function dispatch (i) {
      // ③ 防重入：如果这次要执行的 i 已经「落后于」记录的 index，说明同一个 next 被 await 了多次
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i                       // 更新当前进度

      let fn = middleware[i]
      if (i === middleware.length) fn = next   // ④ 中间件跑完了，fallback 到外部传入的 next
      if (!fn) return Promise.resolve()        // ⑤ 没有下一个中间件了，直接 resolve

      try {
        // ⑥ 核心：执行中间件，把「下一个中间件的 dispatch」作为 next 传进去
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)))
      } catch (err) {
        return Promise.reject(err)             // ⑦ 同步异常转成 Promise reject
      }
    }
  }
}
```

逐行拆解这十几行的每一处设计：

**① 入参校验**：`middleware` 必须是数组、元素必须是函数，否则直接 `throw TypeError`。这是框架入口的防御性检查，尽早暴露配置错误。

**② `index = -1` 闭包变量**：这是整个防重入机制的基石。注意它声明在 `return function` 内部、`dispatch` 外部，所以**整个请求的中间件链共享同一个 `index`**，而每个请求进来都会重新 `compose` 一次、重新声明 `index = -1`，天然做到「请求级隔离」。

**③ `i <= index` 防重入**：这是最容易被问、也最体现功力的判断。`index` 记录的是「已经走到哪了」，`i` 是「这次要走到哪」。正常情况下 `dispatch` 只会被递增调用（`dispatch(0)` → `dispatch(1)` → ...），`i` 永远比 `index` 大 1。**一旦出现 `i <= index`，说明有人把同一个 `next` 调用（await）了两次**——比如：

```javascript
app.use(async (ctx, next) => {
  await next()   // 第一次，正常
  await next()   // 第二次，i 还是那个 i，但 index 已经前进了 → 触发 reject
})
```

同一个 `next` 代表的是「执行第 i+1 个及之后的所有中间件」，它是一次性的。第二次 `await` 同一个 `next`，要么是逻辑错误，要么会导致中间件被重复执行，直接 reject 最安全。

**④ ⑤ 边界处理**：`i === middleware.length` 时，把 `fn` 换成外部传入的 `next`（Koa 里通常是 `undefined`，因为应用级的链没有「更外层」了），于是 `!fn` 走 `Promise.resolve()` 正常收尾。这里的 `next` 参数是给「被嵌套的中间件链」留的钩子——比如 `koa-router` 把匹配到的路由中间件 `compose` 成一条子链，再作为整体挂进应用的链里，子链的「末尾 next」就是回到应用链继续往下。

**⑥ 递归核心**：`fn(context, dispatch.bind(null, i + 1))` 是关键一行。它执行当前中间件，并把「`dispatch(i+1)`」作为 `next` 参数传进去。于是中间件里的 `next` 就是「执行下一个中间件」——而 `await next()` 就是「等下一个中间件（以及它后面的所有中间件）全部跑完」。`Promise.resolve(...)` 把中间件的返回值（无论是不是 Promise）统一包成 Promise，这是链能 `await` 下去的基础。

**⑦ 同步异常转 reject**：中间件如果同步 `throw`（而不是返回 reject 的 Promise），`try/catch` 把它转成 `Promise.reject`，保证错误走的是 Promise 通道，能被上游 `await next()` 的 `try/catch` 接住。

> 💬 **面试官**：`koa-compose` 里 `if (i <= index) return Promise.reject(...)` 这行是干什么的？去掉会怎样？
>
> ✅ 标准答案：这是防重入。`index` 闭包变量记录「当前已执行到第几个中间件」，`i` 是「这次要执行第几个」。正常调用 `i` 始终比 `index` 大 1；一旦出现 `i <= index`，说明同一个 `next` 被 `await` 了多次，直接 reject 一个 `next() called multiple times` 错误。去掉它，同一个中间件会被重复执行，产生不可预期的副作用。
>
> 🎁 加分答案：能点出 `index` 声明在 `return function` 内、`dispatch` 外的位置含义——整个请求链共享同一个 `index`，而每次请求重新 `compose` 时重新声明，天然实现「请求级隔离」，不会跨请求串号。

### 2. application.js：Application 类核心

Koa 的核心应用类在 `koajs/koa` 的 `lib/application.js`。关键点看 `use`、`createContext`、`callback`、`handleRequest` 几处（精简版，保留核心逻辑）：

```javascript
const http = require('http')
const compose = require('koa-compose')

class Application extends EventEmitter {
  constructor() {
    super()
    // 应用级隔离：用 Object.create 创建「原型对象」，实例共享一份模板
    this.context = Object.create(context)
    this.request = Object.create(request)
    this.response = Object.create(response)
    this.middleware = []
  }

  use(fn) {
    if (typeof fn !== 'function') throw new TypeError('middleware must be a function!')
    this.middleware.push(fn)   // 就一行：往数组里塞
    return this
  }

  listen(...args) {
    const server = http.createServer(this.callback())
    return server.listen(...args)
  }

  callback() {
    const fn = compose(this.middleware)   // 把中间件数组组合成一条链
    const handleRequest = (req, res) => {
      const ctx = this.createContext(req, res)
      return this.handleRequest(ctx, fn)
    }
    return handleRequest
  }

  createContext(req, res) {
    // 请求级隔离：每次请求都基于原型对象「创建全新的」实例
    const context = Object.create(this.context)
    const request = context.request = Object.create(this.request)
    const response = context.response = Object.create(this.response)

    context.app = request.app = response.app = this
    context.req = request.req = response.req = req   // 原生 req
    context.res = request.res = response.res = res   // 原生 res
    request.ctx = response.ctx = context
    request.response = response
    response.request = request
    context.originalUrl = request.originalUrl = req.url
    context.state = {}
    return context
  }

  handleRequest(ctx, fnMiddleware) {
    const res = ctx.res
    res.statusCode = 404                        // 👈 默认 404 兜底的来源
    const onerror = err => ctx.onerror(err)
    const handleResponse = () => respond(ctx)   // 按 body 类型 res.end
    return fnMiddleware(ctx).then(handleResponse).catch(onerror)
  }
}
```

几个值得记住的设计细节：

- **`Object.create` 的双层隔离**：`constructor` 里用 `Object.create` 创建「应用级原型对象」，`createContext` 里再 `Object.create` 一次创建「请求级实例」。这样每类对象都是「实例 → 应用原型 → 定义原型」的链，请求之间互不污染，而应用只需维护一份共享模板。这是「原型继承」在框架里做状态隔离的经典手法。
- **`use` 简单到只有一行 `push`**：Koa 的 `use` 不做任何路径匹配、不区分「路由中间件/错误中间件」，就是往数组里追加。真正的工作都在 `compose` 里。这也是它比 Express「极简」的直观体现——Express 的 `use`/`get` 背后是一整套路由分层逻辑。
- **`res.statusCode = 404`**：这就是「一、1」里「没设 body 也返回 Not Found」的来源。中间件链跑完后 `respond(ctx)` 检查 `ctx.body`，为 null 就返回 404。
- **`.then(handleResponse).catch(onerror)`**：中间件链整体是一个 Promise，正常完成走 `respond` 序列化响应，出错走 `ctx.onerror`（触发 `app.on('error')` 事件并返回 500）。

### 3. context.js + delegates：属性代理机制

`ctx.body` 为什么能代理到 `ctx.response.body`？答案在 `lib/context.js` 里，它用 `delegates` 库把 `request`/`response` 的属性和方法「搬」到 `ctx` 顶层：

```javascript
const delegate = require('delegates')

const proto = module.exports = {}

// 把 request 上的属性/方法代理到 ctx 顶层
delegate(proto, 'request')
  .method('acceptsLanguages')
  .method('accepts')
  .method('get')
  .method('is')
  .access('method')      // getter + setter
  .access('url')
  .access('path')
  .access('query')
  .getter('headers')

// 把 response 上的属性/方法代理到 ctx 顶层
delegate(proto, 'response')
  .method('attachment')
  .method('redirect')
  .method('set')
  .access('status')      // getter + setter
  .access('body')        // 👈 ctx.body 实际读写 ctx.response.body
  .access('length')
  .access('type')
```

`delegates` 的四种代理方式，语义清晰：

- `.method(name)`：代理一个**方法**——`ctx.set(...)` 实际调用 `ctx.response.set(...)`；
- `.access(name)`：同时代理 **getter 和 setter**——`ctx.body` 的读和写都落到 `ctx.response.body`；
- `.getter(name)`：只代理 **getter**——`ctx.headers` 只读，实际读 `ctx.request.headers`；
- `.setter(name)`：只代理 **setter**。

它的实现本质就是 `__defineGetter__`/`__defineSetter__`（现代写法用 `Object.defineProperty`）——在 `proto` 上定义一个同名属性，getter 返回 `this[target][name]`，setter 赋给 `this[target][name]`。所以 `ctx.body = 'Hello'` 走的是 `ctx.response.body` 的 setter，而 `ctx.response.body` 的 setter 内部又会处理状态码和 Content-Type。

### 4. response.js 简化版：`ctx.body = xxx` 背后发生了什么

`ctx.body = 'Hello'` 这行赋值，背后是一套状态码和 Content-Type 的自动处理。下面是精简版 `response` 对象（真实源码更完整，这里保留核心语义）：

```javascript
const response = {
  _body: null,
  set body(value) {
    this.res.statusCode = 200       // ① 有 body，状态码默认 200
    if (value === null) {
      this.res.statusCode = 204     // ② body 显式为 null → 204 No Content
    }
    this._body = value
  },
  get body() {
    return this._body
  }
}
```

真实源码里的 `body` setter 还会按值的类型做更多事——字符串设置 `Content-Type: text/plain`（含 `<` 开头则 `text/html`）、Buffer 设 `application/octet-stream`、Stream 则挂到流上、对象自动序列化成 JSON——但核心思想一致：**把「响应体赋值」这个动作，扩展成「状态码 + 响应头 + 响应体」的一次性处理**。这就是为什么 Koa 里设置响应这么简洁。

> 💬 **面试官**：`ctx.body = 'Hello'` 这行代码，背后发生了什么？
>
> ✅ 标准答案：`ctx.body` 是 `delegates` 用 `.access('body')` 从 `ctx.response` 代理到 `ctx` 顶层的属性，赋值实际落到 `ctx.response.body` 的 setter。这个 setter 会把状态码设为 200（显式 null 则设 204），并记录 `_body`，之后 `respond` 阶段根据 `_body` 的类型设置 Content-Type 并 `res.end`。
>
> 🎁 加分答案：能讲清 `delegates` 的 `.access`/`.method`/`.getter`/`.setter` 四种代理的区别，并点出代理的本质是 `Object.defineProperty` 在 `proto` 上定义同名属性、内部转发到 `this[target][name]`。

---

## 四、手写实现（packages/mini-koa）

理解了原理和源码，这一节用 Node 原生 `http` 模块，把 Koa 的核心机制完整手写一遍——`compose`、极简 `ctx`、`Application` 类。**核心代码尽量与源码一致**。

### 1. 手写 compose（严格对齐 koa-compose）

```javascript
function compose (middleware) {
  if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
  for (const fn of middleware) {
    if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
  }

  return function (context, next) {
    let index = -1
    return dispatch(0)
    function dispatch (i) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middleware[i]
      if (i === middleware.length) fn = next
      if (!fn) return Promise.resolve()
      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)))
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}
```

这一段和「三、1」的真实源码**逐行一致**——`index` 闭包、`i <= index` 防重入、`dispatch.bind(null, i + 1)` 递归传 next，一个不少。手写它的目的，就是亲手把「洋葱模型」的递归实现刻进脑子。

### 2. 手写极简 ctx：封装 req/res + 属性代理

真实 Koa 用 `delegates` 库做代理，这里为了零依赖，用 `Object.defineProperty` 手动代理几个常用属性：

```javascript
const context = {}

// 用 defineProperty 在 ctx 上代理到 ctx.request / ctx.response
function delegate(proto, target, name) {
  Object.defineProperty(proto, name, {
    get() { return this[target][name] },
    set(val) { this[target][name] = val }
  })
}

delegate(context, 'response', 'body')
delegate(context, 'response', 'status')
delegate(context, 'request', 'path')
delegate(context, 'request', 'query')
delegate(context, 'request', 'method')

module.exports = context
```

配套的极简 `request` / `response` 对象（对齐「三、4」的思路）：

```javascript
// request.js
const request = {
  get path() { return this.url.pathname },
  get query() {
    const q = {}
    for (const [k, v] of this.url.searchParams) q[k] = v
    return q
  },
  get method() { return this.req.method }
}
module.exports = request

// response.js
const response = {
  _body: null,
  set body(value) {
    this.res.statusCode = 200
    if (value === null) this.res.statusCode = 204
    this._body = value
  },
  get body() { return this._body },
  get status() { return this.res.statusCode },
  set status(code) { this.res.statusCode = code }
}
module.exports = response
```

### 3. 手写 Application 类：基于 Node 原生 http

```javascript
const http = require('http')
const EventEmitter = require('events')
const compose = require('./compose')
const context = require('./context')
const request = require('./request')
const response = require('./response')

class Application extends EventEmitter {
  constructor() {
    super()
    // 应用级隔离：Object.create 共享模板
    this.context = Object.create(context)
    this.request = Object.create(request)
    this.response = Object.create(response)
    this.middlewares = []
  }

  use(fn) {
    this.middlewares.push(fn)
    return this
  }

  createContext(req, res) {
    // 请求级隔离：每次请求创建全新实例
    const ctx = Object.create(this.context)
    const request = Object.create(this.request)
    const response = Object.create(this.response)

    ctx.request = request
    ctx.response = response
    // 让 request/response 能反向访问到 req/res
    request.req = response.req = req
    request.res = response.res = res
    request.url = new URL(req.url, 'http://localhost')
    response.res = res
    ctx.req = req
    ctx.res = res
    ctx.app = this
    return ctx
  }

  handleRequest = async (req, res) => {
    const ctx = this.createContext(req, res)
    res.statusCode = 404                      // 默认 404 兜底
    try {
      await compose(this.middlewares)(ctx)    // 跑完整条洋葱链
      const body = ctx.body
      if (body == null) {
        res.end('Not Found')                  // 没设 body → Not Found
      } else {
        res.end(body)                         // 有 body → 原样返回
      }
    } catch (err) {
      this.emit('error', err, ctx)            // 未捕获错误 → 触发 error 事件
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  }

  listen(...args) {
    const server = http.createServer(this.handleRequest)
    server.listen(...args)
  }
}

module.exports = Application
```

### 4. 验证洋葱模型的双向穿透

用「记录请求耗时的日志中间件 + 全局错误捕获中间件」验证洋葱模型。在控制台打印中间件「进入」和「离开」的顺序日志：

```javascript
const Koa = require('./application')
const app = new Koa()

// 中间件 1：全局错误捕获 + 计时
app.use(async (ctx, next) => {
  console.log('① 日志中间件：进入')
  const start = Date.now()
  try {
    await next()
  } catch (err) {
    console.log('① 日志中间件：捕获到错误 ->', err.message)
    ctx.status = 500
    ctx.body = 'Internal Error'
    return
  }
  console.log(`① 日志中间件：离开，耗时 ${Date.now() - start}ms`)
})

// 中间件 2：模拟业务（这里演示正常路径）
app.use(async (ctx, next) => {
  console.log('② 业务中间件：进入')
  await next()
  console.log('② 业务中间件：离开')
})

// 中间件 3：最内层，真正返回响应
app.use(async ctx => {
  console.log('③ 最内层：设置响应')
  ctx.body = 'Hello mini-koa'
})

app.listen(3000, () => console.log('mini-koa running at :3000'))
```

访问 `http://localhost:3000`，控制台打印的顺序应该是：

```text
① 日志中间件：进入
② 业务中间件：进入
③ 最内层：设置响应
② 业务中间件：离开
① 日志中间件：离开，耗时 0ms
```

「进入」顺序 `①→②→③`，「离开」顺序 `③→②→①`——双向穿透的洋葱结构，一目了然。如果把中间件 3 改成 `throw new Error('boom')`，你会看到错误被最外层 `①` 的 `try/catch` 接住，打印「捕获到错误 -> boom」，而不是让进程崩掉。

---

## 五、手写实现源码地址

- GitHub：`medai-node-source` 仓库（按 `packages/mini-koa` 分模块搭建，含 `compose.js`/`context.js`/`request.js`/`response.js`/`application.js`，地址待补充，与系列其他篇统一）

---

## 六、参考资料

- https://koajs.com/
- https://github.com/koajs/koa
- https://github.com/koajs/compose
- https://github.com/tj/node-delegates

---

## 💡 面试核心问

- **什么是洋葱模型？它和 Express 的线性中间件模型本质区别是什么？**
- **`koa-compose` 是怎么用递归把中间件数组组合成一条调用链的？**
- **为什么洋葱模型天然适合用 `try/catch` 在最外层统一处理错误？**
- **Koa 的 `ctx` 对象和 Express 的 `req`/`res` 在设计上有什么不同？**
- **在 Koa 中间件里做「记录请求耗时」，应该怎么写？为什么 Express 里不能直接照搬？**
- **`koa-compose` 里 `next()` 被多次调用会怎样？`index` 闭包变量和 `i <= index` 是怎么防重入的？**
- **`delegates` 的 `access`/`method`/`getter`/`setter` 分别代理什么？`ctx.body = 'Hello'` 背后发生了什么？**

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 面试频率 |
|--------|-----------|---------|
| 洋葱模型 | 中间件「层层深入再层层返回」，环绕逻辑写在同一函数体 | ⭐⭐⭐ 必考 |
| koa-compose 递归 | `dispatch(0)` 调 `fn1(ctx, () => dispatch(1))`，`await next()` = `await dispatch(1)` | ⭐⭐⭐ 必考 |
| async 错误传播 | `next()` 返回 Promise，异常沿 Promise 链回传，最外层 `try/catch` 兜底 | ⭐⭐⭐ 必考 |
| ctx 设计 | `request`/`response` 封装进 `ctx`，`delegates` 代理属性到顶层 | ⭐⭐⭐ 必考 |
| 防重入 | `index` 闭包 + `i <= index` 判断，`next()` 多次调用直接 reject | ⭐⭐ 高频 |
| Koa vs Express | 递归调用链 vs 线性数组遍历，async 时代 vs 回调风格 | ⭐⭐⭐ 必考 |
| 核心极简 | 不内置路由/解析，按需插件，更小核心更多自由 | ⭐⭐ 高频 |

> 💡 记住这条主线：**洋葱模型（现象）→ koa-compose（实现）→ async/await（为什么能这么写）→ ctx（设计取舍）→ 对比 Express → 手写 mini-koa（验证）**。Koa 的全部精髓，都浓缩在 `koa-compose` 那十几行递归里。

---

## 📝 思考题

Koa 里「记录请求耗时」的写法是 `await next()` 前后各记一次时间。那 Express 里要做同样的事，为什么不能照搬？提示：Express 的 `next()` 不返回 Promise，`await next()` 拿到的是 `undefined`，`next()` 之后的代码**不会等**后续中间件执行完就立即执行了——所以 Express 里要拆成「先注册记开始时间的中间件」+「后注册算耗时的中间件」，还得靠 `res.locals` 或闭包变量传递 `start`。

再想深一层：如果 Koa 的 `compose` 去掉 `i <= index` 这行防护，下面这段代码会怎样？

```javascript
app.use(async (ctx, next) => {
  await next()
  await next()   // 同一个 next 被 await 两次
})
```

欢迎评论区写出你的答案 👇

---

> 🔖 这是「Node.js 全栈深度拆解」系列第 8 篇。上一篇：《Express 深度：路由/中间件链/错误处理源码解析与手写核心》；下一篇预告：《NestJS+TypeScript：IoC/DI/装饰器元编程/模块化企业级架构》。
>
> 前置扩展阅读：搜索关键词「Node.js 事件循环 宏任务 微任务」「JS 异步编程 Promise async/await」「Express 中间件 next 错误处理」
