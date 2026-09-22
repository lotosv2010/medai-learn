# package
```json
{
  "name": "g-express",
  "version": "2.0.0",
  "description": "g-express",
  "main": "index.js",
  "scripts": {
    "test": "nodemon examples/index.js"
  },
  "keywords": [
    "express"
  ],
  "author": "robin",
  "license": "ISC",
  "dependencies": {
    "methods": "^1.1.2",
    "path-to-regexp": "0.1.7"
  }
}
```

# express
```javascript
const App = require('./application');

// 创建应用
function createApplication() {
  const app = new App();
  return app;
}

createApplication.Router = require('./router');

module.exports = createApplication
```

# application
```javascript
const http = require('http');
const methods = require('methods');
const Router = require('./router');
const initMiddleware = require('./middleware/init');

function App () {
  // this._router = new Router();
}

/**
 * 收集路由
 */
methods.forEach(method => {
  // 这里对应路由中的 get post put delete 等方法
  App.prototype[method] = function(path, ...handlers) {
    this.lazy_route();
    this._router[method](path, handlers);
  };
});

App.prototype.lazy_route = function() {
  // 懒加载路由
  if(!this._router) {
    this._router = new Router();
    this.use(initMiddleware()); // 内置中间件
  }
}

// 中间件交给路由处理
App.prototype.use = function(path, ...handlers) {
  this.lazy_route();
  this._router.use(path, handlers);
}

/**
 * 监听
 * @param  {...any} args 
 */
App.prototype.listen = function(...args) {
  this.lazy_route();
  const server = http.createServer((req, res) => {
    this._router.handler(req, res, (error) => {
      if(error) {
        console.error(error);
        return res.end(error.message);
      }
      return res.end(`Can not ${req.method} ${req.path}`);
    });
  });
  server.listen(...args);
  return server;
};

App.prototype.param = function(key, cb) {
  this.lazy_route();
  this._router.param(key, cb);
};

module.exports = App;
```

# router
## index
```javascript
const url = require('url');
const methods = require('methods');
const Layer = require("./layer");
const Route = require('./route');

const proto = {}

// 如果一个类返回一个对象，那么会用这个对象作为实例
function Router() {
  const router = (req, res, next) => {
    router.handler(req, res, next);
  };
  router.stack = [];
  router.paramsCallbacks = {};
  Object.setPrototypeOf(router, proto);
  return router;
}

methods.forEach(method => {
  proto[method] = function (path, handlers) {
    if(!Array.isArray(handlers)) {
      handlers = [handlers];
    }
    // 1.给每个路由增加route属性
    const route = new Route(); // 这里route中要存储用户的真实回调
    // 每次掉用路由的时候会产生一层
    const layer = new Layer(path, route.dispatch.bind(route));
    layer.route = route; // 路由中每层都有一个route属性
    // 3.最终将这一层放到路由系统中
    this.stack.push(layer);
    route[method](path, handlers);
    // console.log(layer, layer.route.stack); // 这里是路由系统中的每一层
  };
});

proto.handle_params = function (req, res, layer,done) {
  const paramsCallbacks = this.paramsCallbacks;
  const keys = layer.keys.map(i => i.name);
  if(!keys.length) return done();

  let idx = 0;
  let key;
  let fns;

  let i = 0;
  const processCallback = () => {
    const fn = fns[i++];
    if(typeof fn === 'function') {
      fn(req, res, processCallback, layer.params[key], key);
    } else {
      i = 0;
      next(); // 参数1处理完再处理参数2，以此类推....
    }
  };
  const next = () => {
    if(idx >= keys.length) return done();
    key = keys[idx++];
    fns = paramsCallbacks[key];
    if(fns && fns.length) {
      processCallback();
    } else {
      next();
    }
  }
  next()
}

proto.handler = function (req, res, out) {
  const { pathname } = url.parse(req.url);
  const method = req.method?.toLowerCase();

  let index = 0;
  let removed = '';
  const next = (error) => {
    if (index >= this.stack.length) {
      // return res.end(`Can not get ${pathname}`);
      return out(error);
    }
    const layer = this.stack[index++];

    //! 从上一个next到下一个next 就表示出来了，需要加上中间件路径
    if(removed.length > 0) {
      req.url = removed + req.url;
      removed = '';
    }
    if (error) { // 错误情况处理
      if(!layer.route) { // 如果没有route，那么就是中间件
        if(layer.handler.length === 4) { // 4个参数是错误中间件
          layer.handle_error(error, req, res, next);
        } else { // 是普通中间件
          next(error)
        }
      } else { // 路由
        next(error)
      }
    } else { // 正常情况处理
      const match = layer?.match(pathname);
      //! 顶层只判断请求路径，内层判断请求方法
      if (match) {
        // 匹配路由和中间件
        // 无论是中间件还是路由要求路径都要匹配，路由需要配方法
        if (!layer.route && layer.isUseMiddleware) {
          if (layer.handler.length === 4) { // 4个参数是错误中间件
            next(); // 正常情况下不处理错误中间件
          } else { // 是普通中间件
            //! 进入中间件的时候，需要删除中间件的路径
            removed = layer.path === '/' ? '' : layer.path;
            req.url = req.url.slice(removed.length) || '/';
            layer.handle_request(req, res, next);
          }
        } else {
          if (layer.route?.methods?.[method]) {
            // 将匹配到的路由参数挂载到req上
            req.params = req.params || {};
            Object.assign(req.params, layer.params);

            // 处理query参数
            req.query = req.query || {};
            const searchParams = new URL(req.url, 'http://localhost').searchParams;
            for (const [key, value] of searchParams.entries()) {
              req.query[key] = value;
            }
            // 处理param完毕后，在处理真正的响应
            this.handle_params(req, res, layer, () => {
              //! 顶层这里调用的 handler 其实就是 dispatch 函数
              layer.handle_request(req, res, next);
            });
          } else {
            next();
          }
        }
      } else {
        next();
      }
    }
  }
  next();
  // res.statusCode = 404;
  // res.end('404 Not Found');
}

proto.use = function (path, handlers) {
  if (typeof path === 'function') { // 如果是函数，那么就是中间件
    handlers.unshift(path); // 将函数放到数组的第一个
    path = '/';
  }
  handlers.forEach(handler => { // 遍历用户传入的中间件
    const layer = new Layer(path, handler); // 创建一个layer
    layer.isUseMiddleware = true; // 标识这个layer是一个中间件
    this.stack.push(layer); // 将layer放到路由系统中
  });
}

proto.param = function(key, cb) {
  if (typeof cb !== 'function') {
    throw new TypeError('param() requires a callback function');
  }
  if(this.paramsCallbacks[key]) {
    this.paramsCallbacks[key].push(cb);
  } else {
    this.paramsCallbacks[key] = [cb];
  }
}

module.exports = Router;
```

## route
```javascript
const methods = require('methods');
const Layer = require('./layer');

function Route () {
  this.stack = [];
  this.methods = {}; // 存储当前路由支持的方法
}

/**
 * 遍历执行当前路由对象中的所有处理函数
 */
Route.prototype.dispatch = function(req, res, out) {
  //! 遍历内层的 stack
  let index = 0;
  const method = req.method.toLowerCase();
  const next = (error) => {
    if(error) return out(error);
    if(index >= this.stack.length) return out();
    const layer = this.stack[index++];
    // console.log('layer.method', layer.method, method, req.url);
    if(layer.method === method) {
      layer.handler(req, res, next);
    } else {
      next();
    }
  }
  next();
}

methods.forEach(method => {
  Route.prototype[method] = function (path, handlers) {
    handlers.forEach(handler => {
      const layer = new Layer(path, handler); // 这里的layer 中不需要路径 path
      layer.method = method;
      this.methods[method] = true; // 标记当前路由支持的方法
      this.stack.push(layer);
    });
  }
});

module.exports = Route;
```

## layer
```javascript
const pathToRegexp = require("path-to-regexp");

// express 模型里面有两个地方使用这个layer
// Router.stack =[] path用户写的路径 route.dispatch
// Route.stack=[] 路径没有意义 用户写的真实回调，里层的layer还需要写方法

function Layer(path, handler) {
  this.path = path;
  this.handler = handler;
  this.keys = [];
  this.regexp = pathToRegexp(path, this.keys, {
    strict: true
  });
  this.params = {};
  this.query = {};
}

Layer.prototype.match = function (pathname) {
  const match = this.regexp.exec(pathname);
  if(match) {
    this.keys.forEach((key, index) => {
      this.params[key.name] = match[index + 1];
    });
    return true;
  }

  //! 匹配use中间件的路径处理
  if(this.isUseMiddleware) {
    if(this.path === '/') {
      return true;
    }
    if(pathname.startsWith(`${this.path}/`)) {
      return true;
    }
  }
  return false;
}

Layer.prototype.handle_request = function (req, res, next) {
  try {
    this.handler(req, res, next);
  } catch (error) {
    next(error);
  }
}

Layer.prototype.handle_error = function (err, req, res, next) {
  this.handler(err, req, res, next);
}

module.exports = Layer;
```

# middleware
## init
```javascript
const fs = require('fs');

function init() {
  return (req, res, next) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    req.path = pathname;

    res.send = function(msg){
      let type = typeof msg;
      if(type == 'object'){
        res.setHeader('Content-Type','application/json');
        msg = JSON.stringify(msg);
        res.end(msg);
      }else if(type == 'number'){
        res.setHeader('Content-Type','application/plain');
        res.status(msg);
        res.end(http.STATUS_CODES[msg]);
      }else{
        res.setHeader('Content-Type','application/html');
        res.end(msg);
      }
    }

    res.sendFile = function(path){
      fs.createReadStream(url).pipe(res);
    }

    next();
  }
}

module.exports = init;
```

# 测试
## index
```javascript
const express = require('../lib/express');

const app = express();
const port = 5500;

// 1.路径位 / 表示任何路径都能匹配到
// 2.如果以这个路径(匹配开头一段路径)也可以匹配到
// 3.和路由的路径完全一样，也可以匹配到

// 中间件不具备方法(针对路径拦截)，也不具备传递多个参数push({ path, method: 'get', handler });
// 中间件肯定的基于路径来做(扩展性，扩展方法)
app.use((req, res, next) => {
  console.log('use');
  next();
});

app.get('/', (req, res, next) => {
  console.log(1);
  next();
}, (req, res, next) => {
  console.log(2);
  next();
}, (req, res, next) => {
  console.log(3);
  res.end('this is page!!');
});

app.get('/home', (req, res, next) => {
  console.log(1);
  next();
});

app.get('/home', (req, res, next) => {
  console.log(2);
  next();
});

app.get('/home', (req, res, next) => {
  console.log(3);
  res.end('this is home!!');;
});

app.get('/ab?cd', (req, res) => {
  res.end('get /ab?cd');
});

app.post('/ab*cd', (req, res) => {
  res.end('post /ab*cd');
});

app.get('/users/:userId/books/:bookId', (req, res) => {
  console.log(req.params)
  res.end('get /users/:userId/books/:bookId');
});

app.get('/list', (req, res) => {
  res.end('get /list');
});

app.post('/list', (req, res) => {
  res.end('post /list');
});

app.put('/list', (req, res) => {
  res.end('put /list');
});

app.patch('/list', (req, res) => {
  res.end('patch /list');
});

app.delete('/list', (req, res) => {
  res.end('delete /list');
});

// console.log(app._router);

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
```

## Api.http
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

# 源码
[GitHub - lotosv2010/g-express: g-express](https://github.com/lotosv2010/g-express)

