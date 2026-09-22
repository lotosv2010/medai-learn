# 前言
+ Koa是基于Node.js的下一代web框架，由Express团队打造，特点：优雅、简洁、灵活、体积小。几乎所有功能都需要通过中间件实现。

# 准备
1. 检查Node版本，至少在7.6.0以上，因为Koa采用很多Es7的语法，比如async/await，
2. 创建项目、安装依赖

```bash
mkdir study_koa
cd study_koa
npm init -y
npm install koa
```

# 基本用法
1. 创建一个应用程序 新建app.js

```javascript
const Koa = require('koa');
const app = new Koa();
app.use(async ctx => {
	// ctx.body 即服务端响应的数据
	ctx.body = 'Hello Koa';
})
// 监听端口、启动程序
app.listen(3000, err => {
	if (err) throw err;
	console.log('runing...');
})
```

2. 启动

```bash
node app.js
```

3. 访问 127.0.0.1:3000 会看到页面显示Hello Koa。
+ 即便没有给ctx.body 设置响应数据，或访问不存在的路由，页面也会显示Not Found，这是koa底层做了处理，不像原生Node或Express一样页面会一直处于响应状态。

# Context
+ Koa将Node的request 和 response对象都封装到了context中，每次请求都会创建一个ctx，并且在中间件中作为接收器使用。
+ 以下是刚才访问时的ctx对象

```javascript
let ctx = {
	// 请求
	request: {
		method: 'GET',
		url: '/',
		// request header
		header: {
			host: '127.0.0.1:3030',
			connection: 'keep-alive',
			'cache-control': 'max-age=0',
			'upgrade-insecure-requests': '1',
			'user-agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.67 Safari/537.36',
			accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
			'accept-encoding': 'gzip, deflate, br',
			'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
			cookie: 'connect.sid=s%3AnQtQApNcQ55RmpjnkmQvWNTrdjYhZnlh.1FQUbVqpwpdRj8N6wjv8nOarf8hyzIpcxXN2LPYXGy0'
		}
	},
	// 响应
	response: {
		status: 200, 
		message: 'ok', 
		header: { 
			'content-type': 'text/plain; charset=utf-8',
			'content-length': '9'
		}
	},
	app: { 
		subdomainOffset: 2, 
		proxy: false, 
		env: 'development' 
	},
	originalUrl: '/',
	// 原生Node的request对象
	req: '<original node req>',
	// 原生Node的reponse对象
	res: '<original node res>',
	socket: '<original node socket>'
}
```

## 剖析ctx
1. 区分request、response、req、res
+ requset   　　　ctx的请求对象
+ response  　　 ctx的响应对象
+ req       　　　　　Node的请求对象
+ res       　　　　　Node的响应对象

**<font style="color:#DF2A3F;">注意：绕过Koa的response是不被处理的，避免使用Node的属性和方法，比如</font>**：

```javascript
res.statusCode
res.writeHead()
res.write()
res.end()
```

+ 即便使用ctx.res.write()也不会得到预期结果，比如：ctx.res.write('hello')，结果是hellook，会把message的值拼接上。
2. ctx.state  
推荐的命名空间，用于通过中间件传递信息到你的前端视图。比如每个页面都要用到用户信息，那就可以挂载在ctx.state。类似于添加全局属性。

```plain
ctx.state.userInfo = {
    name: 'Jack',
    age: 18
}
```

3. ctx.app  
应用程序实例引用

有关cookie和session单独介绍用法。

# 中间件
+ Koa最大的特色和最优的设计就是中间件，就是在匹配路由之前和匹配路由之后执行函数。
+ 使用app.use()加载中间件。每个中间件接收两个参数，ctx对象和next函数，通过调用next将执行权交给下一个中间件。
+ 中间件分为：
    - 应用级中间件
    - 路由级中间件
    - 错误处理中间件
    - 第三方中间件

## 应用级中间件
```javascript
const Koa = require('koa');
const Router = require('koa-router');
const app = new Koa();
const router = new Router();
// 应用级中间件
app.use(async (ctx, next) => {
	await next();
})
router.get('/', async ctx => {
	ctx.body = 'hello koa';
})
// 启动路由
app.use(router.routes()).use(router.allowedMethods());
app.listen(3000, err => {
	if (err) throw err;
	console.log('runing...')
})
```

> 任何路由都会先经过应用级中间件，当执行完成next后再去匹配相应的路由。
>

## 路由中间件
```javascript
router.get('/user', async (ctx, next) => {
	console.log(111)
	await next();
})
router.get('/user', async (ctx, next) => {
	console.log(222)
	await next();
})
router.get('/user', async ctx => {
	console.log(333)
	ctx.body = 'Hello'
})  
// 依次打印
111
222
333
```

> 路由匹配过程中，对于相同路由会从上往下依次执行中间件，直到最后一个没有next参数的中间件为止。
>

## 错误处理中间件
```javascript
app.use(async (ctx, next)=> {
	await next();
	if(ctx.status === 404){
		ctx.body="404页面"
	}
});
```

> 路由在匹配成功并执行完相应的操作后还会再次进入应用级中间件执行 next 之后的逻辑。所以对于404、500等错误可以在最外层的（第一个）应用级中间件的next之后做相应的处理。
>
> 如果只有一个应用级中间件的话，顺序就无所谓所有路由中间件之前和之后了。
>

## 第三方中间件
+ 类似于koa-router、koa-bodyparser等就是第三方中间件。

## 中间件的合成
+ `koa-compose` 模块可以将多个中间件合成为一个。

```javascript
const compose = require('koa-compose')
const first = asycn (ctx, next) => {
	await next();
}
const second = async ctx => {
	ctx.body = 'Hello';
}
const middle = compose([first, second]);
app.use(middle);
```

## 中间件的执行顺序
+ 多个中间件会形成堆栈结构，按先进后出顺序执行

```javascript
app.use(async (ctx, next) => {
	console.log('1中间件第1次执行')
	await next();
	console.log('7中间件第7次执行')
})
app.use(async (ctx, next) => {
	console.log('2中间件第2次执行');
	await next();
	console.log('6中间件第6次执行')
})
router.get('/user', async (ctx, next) => {
	console.log('3中间件第3次执行')
	await next()
	console.log('5中间件第5次执行')
})
router.get('/user', (ctx, next) => {
	console.log('4中间件第4次执行')
	ctx.body = 'Hello Koa';
})
// 1中间件第1次执行
// 2中间件第2次执行
// 3中间件第3次执行
// 4中间件第4次执行
// 5中间件第5次执行
// 6中间件第6次执行
// 7中间件第7次执行
```

> 由此可以看出中间件的执行顺序是先进后出的方式。类似于洋葱图。
>

<!-- 这是一张图片，ocr 内容为：KOA 中间件#2 中间件 中间件#1 请求 NEXT 前代码 NEXT 前代码 没有NEXT的 YIELD NEXT YIELD NEXT 代码 响应 NEXT 后代码 NEXT后代码 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742348777090-4642e879-318b-4555-925c-94a29fae519a.png)

# 路由
## 基本使用
+ Koa中的路由和Express不同，Express是把路由集成在Express中，Koa则需要通过kao-router模块使用。
1. 安装：

```plain
npm i koa-router
```

2. 使用

```javascript
const Koa = require('koa');
// 直接调用的方式
const router = require('koa-router')();
// 或 单独创建router的实例
const Router = require('koa-router');
const router = new Router();
router.get('/', async ctx => {
	ctx.body = 'Hello Router';
})
// 启动路由
app.use(router.routes()).use(router.allowedMethods())
// 以上为官方推荐方式，allowedMethods用在routes之后，作用是根据ctx.status设置response header.
app.listen(3000, err => {
	if (err) throw err;
	console.log('runing...');
});
```

## 实现
```javascript
class Router {
  constructor() {
    this.stack = [];
  }
  compose(layers, ctx, next) {
    const dispatch = index => {
      if(index >= layers.length) return Promise.resolve();
      const layer = layers[index];
      return Promise.resolve(layer.handler(ctx, () => dispatch(index + 1)));
    }
    return dispatch(0);
  }
  routes() {
    return async (ctx, next) => {
      const { path, method } = ctx;
      const stack = this.stack.filter(layer => {
        return layer.method === method.toLocaleLowerCase() && layer.path === path;
      });
      this.compose(stack, ctx, next);
    }
  }
}

class Layer {
  constructor(path, method, handler) {
    this.path = path;
    this.method = method;
    this.handler = handler;
  }
}

['get', 'post', 'put', 'delate'].forEach(method => {
  Router.prototype[method] = function (path, handler) {
    this.stack.push(new Layer(path, method, handler));
  }
})

module.exports = Router;
```

# 获取请求数据
## 基本使用
1. GET 传值
+ Koa 中 GET传值通过request接收，有两种方式： query 和 querystring  
query：返回的是参数对象。 {name: 'jack', age: 12}  
querystring：返回的是请求字符串。 name=jack&age=12
+ query和querystring可以从request中获取，也可以直接从ctx中获取。

```javascript
let request = ctx.request;
let query = request.query;
let querystring = request.querystring;
// 直接ctx获取
ctx.query
ctx.querystring
```

2. POST 传值  
通过post传递的值我们可以通过原生Node封装，也可以通过第三方模块接收。

## 实现
+ 自定义封装

```javascript
const path = require('path');
const uuid = require('uuid');
const fs = require('fs');

Buffer.prototype.split = function(boundary) {
  const arr = [];

  let offset = 0;
  let currentBoundaryPosition = 0;
  
  while(-1 !== (currentBoundaryPosition = this.indexOf(boundary, offset))) {
    arr.push(this.slice(offset, currentBoundaryPosition));
    offset = currentBoundaryPosition + boundary.length;
  }
  arr.push(this.slice(offset));
  
  return arr;
}

function bodyParser({ uploadDir }) {
  return async (ctx, next) => {
    function parserBody(body, resolve) {
      const contentType = ctx.get('Content-Type');
      if (contentType.includes('application/json')) {
        resolve(JSON.parse(body));
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const obj = {}
        new URLSearchParams(body || '{}').forEach((value, key) => {
          obj[key] = value;
        });
        resolve(obj);
      } else if(contentType.includes('multipart/form-data')) {
        const boundary =  '--' + contentType.split('=')[1];
        const lines = body.split(boundary).slice(1, -1);

        const result = {};
        lines.forEach(async line => {
          let [header, body] = line.split('\r\n\r\n');
          const key = header.toString().match(/name="(.+?)"/)[1];
          if(header.includes('filename')) {
            const filename = uuid.v4();
            const content = line.slice(header.length + 4, -2);
            const filePathName = path.join(uploadDir, filename);
            fs.writeFileSync(filePathName, content);
            result[key] = {
              filename: filePathName,
              originalFilename: header.toString().match(/filename="(.+?)"/)[1],
              size: content.length
            }
          } else {
            result[key] = body.toString().slice(0, -2);
          }
        });
        resolve(result);
      } else {
        resolve(body);
      }
    }

    if (ctx.method === 'POST') {
      const body = await new Promise((resolve, reject) => {
        let chunks = [];
        ctx.req.on('data', (chunk) => {
          chunks.push(chunk);
        });
        ctx.req.on('end', () => {
          const bodyStr = Buffer.concat(chunks).toString();
          parserBody(bodyStr, resolve)
        });
      });
      ctx.request.body = body;
    }
    await next(); // 用await也可以
  }
}

module.exports = bodyParser;
```

+ 使用koa-bodyparser模块

```javascript
const bodyParser = require('body-parser');
app.use(bodyParser());
// 获取
ctx.request.body
```

+ 上传文件使用 @koa/multer
+ [@koa/multer](https://www.npmjs.com/package/@koa/multer)

# 处理静态资源
## 基本使用
+ 对于诸如js、css、img等静态资源采用koa-static中间件处理。



```bash
npm i koa-static
```

+ 配置:
    - 比如静态目录为static：

```javascript
// 静态资源配置
// app.use(require('koa-static')('static'))
// or
// app.use(require('koa-static')('./static'))
// or
// app.use(require('koa-static')(__dirname + '/static'))
// or 使用path.join() 的时候，static前面的/可加可不加，该方法会内部会做处理
app.use(require('koa-static')(path.join(__dirname, 'static')));
```

+ 在模板中即可访问：

```javascript
<link rel="stylesheet" href="/css/header.css">
<img src="/image/account.eb695dc.png"/>
```

## 实现
```javascript
const fs = require('fs').promises;
const { createReadStream } = require('fs');
const path = require('path');
const mime = require('mime')

function server(_dirname) {
  return async (ctx, next) => {
    try {
      const filepath = path.join(_dirname, ctx.path);
      const stat = await fs.stat(filepath);
      if(stat.isFile()) {
        const type = `${mime.getType(filepath) || 'text/plain'};charset=utf-8`;
        // ctx.type = type;
        ctx.set('Content-Type', type);
        ctx.body = createReadStream(filepath);
      } else {
        return next();
      }
    } catch (error) {
      return next();
    }
  }
}

module.exports = server;
```

# 模板引擎
+ koa生态的模板引擎挺多的，比如ejs、art-template等。

> **<font style="color:#DF2A3F;">模板引擎的原理：new Function(templateStr) + with + 字符串拼接</font>**
>

## koa-ejs
```shell
npm i koa-ejs
```

```javascript
const render = require('koa-ejs');
```

+ 配置

```javascript
render(app, {
	// views 视图根目录
	root: path.join(__dirname, 'views'),
	layout: 'template',     // 公用文件 若要禁用，设置为false即可
	viewExt: 'html',        // 扩展名
	cache: false,           // 缓存 default true
	debug: false            // 如果开启debug模式，则会在终端实时打印信息 default false
});
```

+ 使用

```javascript
/**
 * 参数1： 模板名
 * 参数2： 数据（可选）
 */
await ctx.render(templateName, data);
```

## art-template
```shell
npm install --save art-template
npm install --save koa-art-template
```

+ 配置

```javascript
const render = require('koa-art-template');
// 配置模板引擎
render(app, {
    root: path.join(__dirname, 'views'), // 视图目录
    extname: '.html',
    debug: process.env.NODE_ENV !== 'production'
});
```

+ 使用方式和ejs一样。
+ **<font style="color:#DF2A3F;">性能上相比，art-template比ejs快很多，开发中用的最多的还是art-template</font>**。

# cookie 和 session
+ http是无状态、无连接的。不会对之前发生过的请求和相应状态进行管理。也就是说，无法根据之前的状态进行本次的请求处理。
+ 比如访问淘宝首页并登录账号后，当再打开淘宝其他页面时，因为每一次的访问都是独立的，服务器并不知道你已经登录，所以还是不能下单或者加购物车之类的操作。

## cookie
+ cookie简单介绍
    - cookie是客户端第一次访问服务器的时候，服务器在下行HTTP报文时通过响应头的`set-cookie`字段给浏览器分配的一个具有特殊标识的文本信息，此后当客户端再次访问同一域名时，便会将该字段通过请求头携带到服务器。注意： 第一次访问服务器是不可能携带cookie的。
    - 缺陷：
        * 1、cookie的数据存放在客户端，不安全，容易被（CSRF）跨站请求伪造。攻击者可以借助受害者的 Cookie 骗取服务器的信任，可以在受害者毫不知情的情况下以受害者名义伪造请求发送给受攻击服务器，从而在并未授权的情况下执行在权限保护之下的操作。
        * 2、单个cookie保存的数据不能超过4K，很多浏览器都限制一个站点最多保存20个cookie。
+ Koa中使用cookie
    - 获取cookie

```javascript
ctx.cookies.get(name, [options])
```

        * 通过 options 获取 cookie name:
            + signed 所请求的cookie应该被签名
    - 设置cookie

```javascript
ctx.cookies.set(name, value, [options])
```

        * 通过 options 设置 cookie name 的 value:
            + maxAge：   有效期（一个数字表示从 Date.now() 得到的毫秒数）
            + signed：      cookie 签名值
            + expires：     cookie 过期的 Date
            + path：        cookie作用域（指定了主机下的哪些路径可以接受Cookie）, 默认是 `/`
            + domain：      cookie作用域 （指定了哪些主机可以接受Cookie。如果不指定，默认为当前文档的主机<不包含子域名>;如果指定了`Domain`，则一般包含子域名。  
）
            + secure：      安全 cookie。即标记为 Secure 的Cookie只可以通过被HTTPS协议加密过的请求发送给服务端。
            + httpOnly：    只可让服务器通过http请求访问cookie,不可通过js的`document.cookie`API访问，可以避免XSS攻击。 默认是 true。
            + SameSite： 允许服务器要求某个cookie在跨站请求时不会被发送，从而可以阻止跨站请求伪造攻击（CSRF）。可选值：
                1. None：浏览器会在同站请求、跨站请求下继续发送cookies，不区分大小写。
                2. Strict： 浏览器将只在访问相同站点时发送cookie。
                3. Lax： 在新版本浏览器中，为默认选项。大多数情况不发送第三方 Cookie，只有当用户从外部站点导航到URL时才会发送，包括链接（a标签）、预加载（link）、get表单。
            + overwrite：   一个布尔值，表示是否覆盖以前设置的同名的 cookie (默认是 false). 如果是 true, 在同一个请求中设置相同名称的所有 Cookie（不管路径或域）是否在设置此Cookie 时从 Set-Cookie 标头中过滤掉。
+ 设置中文cookie
    - 通过buffer转成base64存进去，取出来是再转回中文。

```javascript
// 转base64
Buffer.from('张三').toString('base64');
// 转回中文
Buffer.from(buf, 'base64').toString();
```

## session
+ seeion简单介绍
    - session是另一种记录客户状态的机制，不同的是cookie保存在客户端浏览器中，而session保存在服务器上。
    - 前面说过，cookie 是存放在客户端，不是很安全，用户可以自己手动把cookie种在客户端以欺骗服务器。而session是存储在服务端的，所以对于较重要的数据存储在session。
    - 缺点： session会在一定时间内保存在服务器上。当访问增多，会比较占用你服务器的性能。
+ session 的工作机制
    - 当浏览器第一次请求服务器时，服务器端会创建一个session对象，生成一个类似于key-value的键值对， 然后将key(cookie)下发到客户端，当客户端再访问时，携带key(cookie)，找到对应的session(value)。 生产中用户的信息都保存在session中。
+ koa-session 的使用

```shell
npm install koa-session
```

```javascript
const Koa = require('koa');
const session = require('koa-session');
const app = new Koa();
app.keys = ['some secret hurr'];

const CONFIG = {
	key: 'koa:sess',      // 返给浏览器 cookie 的key 默认是 'kao:sess'
	maxAge: 86400000,     // cookie的过期时间 maxAge in ms (default is 1 days)
	autoCommit: true,     // (boolean) 自动给客户端下发cookie 并设置session
	overwrite: true,      // 是否可以覆盖之前同名的cookie    (默认default true)
	httpOnly: true,       // cookie是否只有服务器端可以访问 httpOnly or not (default true)
	signed: true,         // 签名默认true
	rolling: false,       // 在每次响应时强制设置session标识符cookie，到期时被重置设置过期倒计时。（默认为false）
	renew: false,         // 当session快过期时更新session，这样就可以始终保持用户登录 默认是false
};

app.use(session(CONFIG, app));

app.use(async (ctx) => {
	let visit = ctx.session.visit;
	if (visit) {
		visit = visit + 1;
	} else {
		visit = 1;
	}
	ctx.session.visit = visit;
	ctx.body = `这是你的第${visit}次访问`;
});
app.listen(3000);
```

    - 以上配置选项常用的就是key、maxAge、httpOver。
    - renew应用：比如我们登录账号写一篇博客，写了一半cookie过期了，当我们提交的时候就会退出登录，体验很不好，而且写好的博客丢失。

# 重定向
+ 301和302重定向状态码区别。302为临时重定向，301永久重定向。Koa中默认为302。详细信息查看这篇博客 [301和302重定向介绍](https://links.jianshu.com/go?to=https%3A%2F%2Fblog.csdn.net%2FSongruibb%2Farticle%2Fdetails%2F80451032)
+ 字符串 “back” 是特别提供Referrer支持的，当Referrer不存在时，使用 alt 或“/”。

```javascript
ctx.redirect('back');
ctx.redirect('back', '/login');
ctx.redirect('/login');
```

+ 要更改 “302” 的默认状态，只需在该调用之前或之后分配状态。要变更主体请在此调用之后:

```javascript
ctx.status = 301;
ctx.redirect('/cart');
ctx.body = 'Redirecting to shopping cart';
```

# 跨域请求
+ 解决跨域的方式有很多种，个人认为最好的方案是在服务器端设置支持跨域。

## 原生设置方式
+ 下面详细说明在koa2中设置具体的请求头信息：

```javascript
app.use(async (ctx, next) => {
	// 允许所有域名请求
	ctx.set("Access-Control-Allow-Origin", "*")
	//  只允许 http://localhost:8080 域名的请求
	// ctx.set("Access-Control-Allow-Origin", "http://localhost:8080");
	// 设置允许的跨域请求方式
	ctx.set("Access-Control-Allow-Methods", "OPTIONS, GET, PUT, POST, DELETE")
	// 字段是必需的。值一个逗号分隔的字符串，表示服务器所支持的所有头信息字段.
	ctx.set("Access-Control-Allow-Headers", "x-requested-with, accept, origin, content-type")
	// 服务器收到请求以后，检查了Origin、Access-Control-Request-Method和Access-Control-Request-Headers字段以后，确认允许跨源请求，即可做出响应。
	// Content-Type表示具体请求中的媒体类型信息
	ctx.set("Content-Type", "application/json;charset=utf-8")
	// 该字段可选。它的值是一个布尔值，表示是否允许发送Cookie。默认情况下，Cookie不包括在CORS请求之中。 当设置成允许请求携带凭证cookie时，需要保证"Access-Control-Allow-Origin"是服务器有的域名，而不能是"*";
	ctx.set("Access-Control-Allow-Credentials", true);
	// 该字段可选，用来指定本次预检请求的有效期，单位为秒。
	// 当请求方法是PUT或DELETE等特殊方法或者Content-Type字段的类型是application/json时，服务器会提前发送一次请求进行验证
	// 下面的的设置只本次验证的有效时间，即在该时间段内服务端可以不用进行验证
	ctx.set("Access-Control-Max-Age", 300);
	/*
    CORS请求时，XMLHttpRequest对象的getResponseHeader()方法只能拿到6个基本字段：
        Cache-Control、
        Content-Language、
        Content-Type、
        Expires、
        Last-Modified、
        Pragma。
    */
	// 需要获取其他字段时，使用Access-Control-Expose-Headers，
	// getResponseHeader('myData')可以返回我们所需的值
	ctx.set("Access-Control-Expose-Headers", "myData")
	await next()
})
```

## 使用中间件方式
+ 在koa2中，解决跨域请求还可使用中间件`koa2-cors`
1. 安装：

```shell
npm i koa2-cors -S
```

2. 注册中间件

```javascript
const cors = require('koa2-cors')
app.use(cors())
```

# node发送邮件
+ node 发送邮件可以使用`nodemailer`三方模块。
+ 安装：

```shell
npm i nodemailer
```

```javascript
const nodemailer = require("nodemailer")
async function main() {
	let transporter = nodemailer.createTransport({
		host: "smtp.qq.com",
		port: 465,
		secure: true, // true for 465, false for other ports
		auth: {
			user: 'test@qq.com', 
			pass: 'akphfubplzqdbdfh'
		}
	})
	let info = await transporter.sendMail({
		from: 'test@qq.com', // sender address
		to: "bar@qq.com", // 接收地址 多个邮箱使用 ','分割
		subject: "Hello 老胖", // 邮件主题
		text: "胖子蹲啊胖子蹲胖子蹲完瘦子蹲", // plain text body
		// html: "<b>嗯好</b>" // html body
	})
	console.log("Message sent: %s", info.messageId)
	console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info))
}
main().catch(console.error)
```

+ 使用说明：
    - 创建transporter配置信息  
在`node_modules>nodemailer>lib>well_known>services.json`中查看对应的配置信息。配置发件邮箱相应的host、port及secure。
    - 获取发件箱密码（类似于授权，获取key），以qq邮箱为例  
qq邮箱>设置>账户>POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务，点击开启获取pass
    - 配置user和pass
        * user即发件地址
        * pass就是刚才授权获取的密码
    - sendMail配置信息
        * from 发件地址
        * to 收件地址 如果多个收件地址，用 `,`分割即可
        * subject 邮件主题
        * text 文件内容
        * html html内容
    - **注意**：text和html只能配置一个
+ 更多详细配置信息及功能参照[官网](https://links.jianshu.com/go?to=%255B%25E9%2593%25BE%25E6%258E%25A5%25E5%259C%25B0%25E5%259D%2580%255D%28https%3A%2F%2Fnodemailer.com%2Fabout%2F%29)

# <font style="color:rgb(51, 51, 51);">generator</font>
+ [GitHub - i5ting/koa-generator: Koa’ application generator for 1.x and 2.x（ Express-style and support all middlewares include async/await ）](https://github.com/17koa/koa-generator)

```shell
$ npm install -g koa-generator
```

```shell
$ koa koa-project && cd koa-projec
$ npm install
$ npm start
```

# 参考
[koa2 进阶学习笔记 · GitBook](https://chenshenhai.github.io/koa2-note/)

