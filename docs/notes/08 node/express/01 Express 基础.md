# <font style="color:rgb(51, 51, 51);">Express 介绍</font>
+ <font style="color:rgb(51, 51, 51);">Express 是一个小巧且灵活的 Node.js Web应用框架，它有一套健壮的特性，可用于开发单页、多页和混合Web应用。</font>
+ [Express - 基于 Node.js 平台的 web 应用开发框架](http://www.expressjs.com.cn/)

# Express&Koa
+ express 采用的是 es3,4 来编写的，koa采用的是es6
+ koa中的中间件内部采用了promise链来实现的， express 采用的是回掉函数来进行编写的
+ koa的特点比较小巧(createcontext,compose)
+ express默认设计的就是更方便(内部就内置了大量的中间件，express内置了路由系统、模板引擎、静态服务。。。)，Express 源码复杂一些
+ express 也可以编写我们所谓的中间件(也有很多第三方的中间件)
+ koa (内部对req 和 res进行了封装 ctx.body，ctx.path) 
+ express 没有扩展一个上下文对象(直接在req和res上进行了扩展)
+ express 也是一个洋葱模型

# <font style="color:rgb(51, 51, 51);">Express 的应用</font>
## <font style="color:rgb(51, 51, 51);">安装express</font>
+ <font style="color:rgb(51, 51, 51);">npm安装</font>

```shell
$ npm install express
```

## <font style="color:rgb(51, 51, 51);">使用express</font>
+ <font style="color:rgb(51, 51, 51);">创建http服务</font>

```javascript
//引入express
var express = require('express');
//执行express**函数
var app = express();
//监听端口
app.listen(3000);
```

## <font style="color:rgb(51, 51, 51);">express的get方法</font>
+ <font style="color:rgb(51, 51, 51);">根据请求路径来处理客户端发出的GET请求</font>
    - <font style="color:rgb(51, 51, 51);">第一个参数path为请求的路径</font>
    - <font style="color:rgb(51, 51, 51);">第二个参数为处理请求的回调函数</font>

```javascript
app.get(path,function(req, res));
```

+ <font style="color:rgb(51, 51, 51);">get方法使用：</font>

```javascript
const express = require('express');
const app = express();
app.get('/hello',function(req,res){
  res.end('hello');
});
app.get('/world',function(req,res){
  res.end('world');
});
app.get('*',function(req,res){
  res.setHeader('Content-Type','text/plain;charset=utf8');
  res.end('Not Found');
});
app.listen(3000);
```

+ <font style="color:rgb(51, 51, 51);">get方法实现：</font>

```javascript
let url = require('url');
let express = function () {
  let app = function (req, res) {
    let {pathname} = url.parse(req.url, true);
    let method = req.method.toLowerCase();
    for (let i = 0; i < app.routes.length; i++) {
      let {path, method, handler} = app.routes[i];
      if ((path == pathname || path == "*") && method == req.method.toLowerCase()) {
        return handler(req, res);
      }
    }
    res.end(`CANNOT ${req.method} ${req.url}`);
  }
  app.routes = [];
  app.listen = function (port) {
    require('http').createServer(app).listen(port);
  }
  app.get = function (path, handler) {
    app.routes.push({
      path, handler, method: 'get'
    });
  }
  return app;
}

module.exports = express;
```

## <font style="color:rgb(51, 51, 51);">express的post方法</font>
+ <font style="color:rgb(51, 51, 51);">根据请求路径来处理客户端发出的POST请求</font>
    - <font style="color:rgb(51, 51, 51);">第一个参数path为请求的路径</font>
    - <font style="color:rgb(51, 51, 51);">第二个参数为处理请求的回调函数</font>

```javascript
app.post(path,function(req,res));
```

+ <font style="color:rgb(51, 51, 51);">post方法的使用：</font>

```javascript
//引入express
var express = require('./express');
//执行express函数
var app = express();
//监听端口
app.post('/hello', function (req,res) {
  res.end('hello');
});
app.post('*', function (req,res) {
  res.end('post没找到');
});
app.listen(3000);
```

+ <font style="color:rgb(51, 51, 51);">通过linux命令发送post请求</font>

```shell
$ curl -X POST http://localhost:3000/hello
```

+ <font style="color:rgb(51, 51, 51);">post的实现：</font>
    - <font style="color:rgb(51, 51, 51);">增加所有请求的方法</font>

```javascript
http.METHODS.forEach(function(method){
  app[method] = function (path, handler) {
    app.routes.push({
      path, handler, method
    });
  }
});
```

## <font style="color:rgb(51, 51, 51);">express的all方法</font>
+ <font style="color:rgb(51, 51, 51);">监听所有的请求方法，可以匹配所有的HTTP动词。根据请求路径来处理客户端发出的所有请求</font>
    - <font style="color:rgb(51, 51, 51);">第一个参数path为请求的路径</font>
    - <font style="color:rgb(51, 51, 51);">第二个参数为处理请求的回调函数</font>

```javascript
app.all(path,function(req, res));
```

+ <font style="color:rgb(51, 51, 51);">all的方法使用：</font>

```javascript
const express = require('express');
const app = express();
app.all('/world',function(req,res){
  res.end('all world');
});
app.listen(3000);
```

+ 实现

```javascript
app.all = function (path, handler) {
  app.routes.push({
    path, handler, method: 'all'
  });
}
```

## <font style="color:rgb(51, 51, 51);">中间件</font>
+ <font style="color:rgb(51, 51, 51);">中间件就是处理HTTP请求的函数，用来完成各种特定的任务，比如检查用户是否登录、检测用户是否有权限访问等，它的特点是：</font>
    - <font style="color:rgb(51, 51, 51);">一个中间件处理完请求和响应可以把相应数据再传递给下一个中间件</font>
    - <font style="color:rgb(51, 51, 51);">回调函数的next参数,表示接受其他中间件的调用，函数体中的next(),表示将请求数据继续传递</font>
    - <font style="color:rgb(51, 51, 51);">可以根据路径来区分返回执行不同的中间件</font>
+ <font style="color:rgb(51, 51, 51);">中间件的使用方法：</font>
    - <font style="color:rgb(51, 51, 51);">增加中间件</font>

```javascript
var express = require('express');
var app = express();
app.use(function (req,res,next) {
  console.log('全部匹配');
  next();
});
app.use('/water', function (req,res,next) {
  console.log('只匹配/water');
  next();
});
app.get('/water', function (req,res) {
  res.end('water');
});
app.listen(3000);
```

+ <font style="color:rgb(51, 51, 51);">use方法的实现：在路由数组中增加中间件</font>

```javascript
app.use = function (path,fn) {
  if(typeof fn !='function'){
    fn = path;
    path = '/';
  }
  app.routes.push({method:'middle',path:path,fn:fn});
}
```

```javascript
let url = require('url');
let http = require('http');
let express = function () {
  let app = function (req, res) {
    let {pathname} = url.parse(req.url, true);
    let method = req.method.toLowerCase();
    let index = 0;

    function next(err) {
      if (index >= app.routes.length) {
        return res.end(`CANNOT ${method} ${pathname}`);
      }
      let route = app.routes[index++];
      if (route.method == 'middle') {
        if (route.path == '/' || pathname.startsWith(route.path + '/') || route.path == pathname) {
          route.handler(req, res, next);
        } else {
          next();
        }
      } else {
        if ((route.path == pathname || route.path == "*") && (route.method == req.method.toLowerCase()) || method == 'all') {
          return route.handler(req, res);
        } else {
          next();
        }
      }
    }

    next();
  }
  app.routes = [];
  app.listen = function (port) {
    http.createServer(app).listen(port);
  }
  http.METHODS.forEach(function (method) {
    method = method.toLowerCase();
    app[method] = function (path, handler) {
      app.routes.push({
        path, handler, method
      });
    }
  });
  app.all = function (path, handler) {
    app.routes.push({
      path, handler, method: 'all'
    });
  }
  app.use = function (path, handler) {
    if (typeof handler != 'function') {
      handler = path;
      path = "/";
    }
    app.routes.push({
      method: 'middle',
      path,
      handler
    });
  }

  return app;
}

module.exports = express;
```

+ <font style="color:rgb(51, 51, 51);">错误中间件：next中可以传递错误，默认执行错误中间件</font>

```javascript
var express = require('express');
var app = express();
app.use(function (req,res,next) {
  console.log('过滤石头');
  next('stone is too big');
});
app.use('/water', function (req,res,next) {
  console.log('过滤沙子');
  next();
});
app.get('/water', function (req,res) {
  res.end('water');
});
app.use(function (err,req,res,next) {
  console.log(err);
  res.end(err);
});
app.listen(3000);
```

+ <font style="color:rgb(51, 51, 51);">错误中间件的实现：对错误中间件进行处理</font>

```javascript
let url = require('url');
let http = require('http');
let express = function () {
  let app = function (req, res) {
    let {pathname} = url.parse(req.url, true);
    let method = req.method.toLowerCase();
    let index = 0;

    function next(err) {
      if (index >= app.routes.length) {
        return res.end(`CANNOT ${method} ${pathname}`);
      }
      let route = app.routes[index++];
      if (err) {
        if (route.method == 'middle' && route.handler.length == 4) {
          route.handler(req, res, next)
        }
      }
      if (route.method == 'middle') {
        if (route.path == '/' || pathname.startsWith(route.path + '/') || route.path == pathname) {
          route.handler(req, res, next);
        } else {
          next();
        }
      } else {
        if ((route.path == pathname || route.path == "*") && (route.method == req.method.toLowerCase()) || method == 'all') {
          return route.handler(req, res);
        } else {
          next();
        }
      }
    }

    next();
  }
  app.routes = [];
  app.listen = function (port) {
    http.createServer(app).listen(port);
  }
  http.METHODS.forEach(function (method) {
    method = method.toLowerCase();
    app[method] = function (path, handler) {
      app.routes.push({
        path, handler, method
      });
    }
  });
  app.all = function (path, handler) {
    app.routes.push({
      path, handler, method: 'all'
    });
  }
  app.use = function (path, handler) {
    if (typeof handler != 'function') {
      handler = path;
      path = "/";
    }
    app.routes.push({
      method: 'middle',
      path,
      handler
    });
  }

  return app;
}

module.exports = express;
```

## <font style="color:rgb(51, 51, 51);">获取参数和查询字符串</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">req.hostname</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">返回请求头里取的主机名</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">req.path</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">返回请求的URL的路径名</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">req.query</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">查询字符串</font>

```javascript
//http://localhost:3000/?name=zfpx&age=8
app.get('/',function(req,res){
  res.write(JSON.stringify(req.query))
  res.end(req.path+" "+req.path);
});
```

+ <font style="color:rgb(51, 51, 51);">具体实现：对请求增加方法</font>

```javascript
req.path = pathname;
req.query = query;
```

## <font style="color:rgb(51, 51, 51);">获取params参数</font>
+ <font style="color:rgb(51, 51, 51);">req.params 匹配到的所有路径参数组成的对象</font>

```javascript
app.get('/school/:name/:age', function (req,res) {
  console.log(req.params);
  res.end('water');
});
```

+ <font style="color:rgb(51, 51, 51);">params实现：增加params属性</font>

```javascript
let url = require('url');
let http = require('http');
let express = function () {
  let app = function (req, res) {
    let {pathname, query} = url.parse(req.url, true);
    let method = req.method.toLowerCase();
    let index = 0;
    req.path = pathname;
    req.query = query;

    function next(err) {
      if (index >= app.routes.length) {
        return res.end(`CANNOT ${method} ${pathname}`);
      }
      let route = app.routes[index++];

      if (err) {
        if (route.method == 'middle' && route.handler.length == 4) {
          route.handler(req, res, next)
        } else {
          next();
        }
      } else {

        if (route.method == 'middle') {
          if (route.path == '/' || pathname.startsWith(route.path + '/') || route.path == pathname) {
            route.handler(req, res, next);
          } else {
            next();
          }
        } else {
          if (route.paramNames) {
            let matchers = pathname.match(new RegExp(route.path));
            if (matchers) {
              let params = {};
              for(let i=0;i<route.paramNames.length;i++){
                params[route.paramNames[i]] = matchers[i+1];
              }
              req.params = params;
              route.handler(req,res);
            }else{
              next();
            }
          } else {
            if ((route.path == pathname || route.path == "*") && (route.method == req.method.toLowerCase()) || method == 'all') {
              return route.handler(req, res);
            } else {
              next();
            }
          }
        }
      }
    }

    next();
  }
  app.routes = [];
  app.listen = function (port) {
    http.createServer(app).listen(port);
  }
  http.METHODS.forEach(function (method) {
    method = method.toLowerCase();
    app[method] = function (path, handler) {
      const layer = {path, handler, method};
      if (path.includes(':')) {
        let paramNames = [];
        layer.path = path.replace(/:([^\/]+)/g, function () {
          paramNames.push(arguments[1]);
          return '([^\/]+)';
        });
        layer.paramNames = paramNames;
      }
      app.routes.push(layer);
    }
  });
  app.all = function (path, handler) {
    app.routes.push({
      path, handler, method: 'all'
    });
  }
  app.use = function (path, handler) {
    if (typeof handler != 'function') {
      handler = path;
      path = "/";
    }
      app.routes.push({
            method: 'middle',
            path,
            handler
        });
    }
    return app;
}

module.exports = express;
```

## <font style="color:rgb(51, 51, 51);">express中的send方法</font>
+ <font style="color:rgb(51, 51, 51);">参数为要响应的内容,可以智能处理不同类型的数据,在输出响应时会自动进行一些设置，比如HEAD信息、HTTP缓存支持等等</font>

```javascript
res.send([body]);
```

+ <font style="color:rgb(51, 51, 51);">当参数是一个字符串时，这个方法会设置Content-type为text/html</font>

```javascript
app.get('/', function (req,res) {
  res.send('<p>hello world</p>');
});
```

+ <font style="color:rgb(51, 51, 51);">当参数是一个Array或者Object，这个方法返回json格式</font>

```javascript
 app.get('/json', function (req,res) {
  res.send({obj:1});
});
app.get('/arr', function (req,res) {
  res.send([1,2,3]);
});
```

+ <font style="color:rgb(51, 51, 51);">当参数是一个number类型，这个方法返回对应的状态码短语</font>

```javascript
app.get('/status', function (req,res) {
  res.send(404); //not found
  //res.status(404).send('没有找到');设置短语
});
```

+ <font style="color:rgb(51, 51, 51);">send方法的实现：自定义send方法</font>

```javascript
res.send = function(msg){
  let type = typeof msg;
  if(type == 'object'){
    res.setHeader('Content-Type','application/json');
    msg = JSON.stringify(msg);
  }else if(type == 'number'){
    res.setHeader('Content-Type','application/plain');
    res.status(msg);
    res.end(http.STATUS_CODES[msg]);
  }else{
    res.setHeader('Content-Type','application/html');
    res.end(msg);
  }
}
```

# <font style="color:rgb(51, 51, 51);">模板的应用</font>
## <font style="color:rgb(51, 51, 51);">安装ejs</font>
+ <font style="color:rgb(51, 51, 51);">npm安装ejs</font>

```bash
$ npm install ejs
```

## <font style="color:rgb(51, 51, 51);">设置模板</font>
+ <font style="color:rgb(51, 51, 51);">使用ejs模版</font>

```javascript
var express = require('express');
var path = require('path');
var app = express();
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));
app.listen(3000);
```

## <font style="color:rgb(51, 51, 51);">渲染html</font>
+ <font style="color:rgb(51, 51, 51);">配置成html格式</font>

```javascript
app.set('view engine','html')
app.set('views',path.join(__dirname,'views'));
app.engine('html',require('ejs').__express);
```

## <font style="color:rgb(51, 51, 51);">渲染视图</font>
+ <font style="color:rgb(51, 51, 51);">第一个参数 要渲染的模板</font>
+ <font style="color:rgb(51, 51, 51);">第二个参数 渲染所需要的数据</font>

```javascript
app.get('/', function (req,res) {
  res.render('hello',{title:'hello'},function(err,data){});
});
```

## <font style="color:rgb(51, 51, 51);">模板的实现</font>
+ <font style="color:rgb(51, 51, 51);">读取模版渲染</font>

```javascript
res.render = function (name, data) {
  var viewEngine = engine.viewEngineList[engine.viewType];
  if (viewEngine) {
    viewEngine(path.join(engine.viewsPath, name + '.' + engine.viewType), data, function (err, data) {
      if (err) {
        res.status(500).sendHeader().send('view engine failure' + err);
      } else {
        res.status(200).contentType('text/html').sendHeader().send(data);
      }
    });
  } else {
    res.status(500).sendHeader().send('view engine failure');
  }
}
```

# <font style="color:rgb(51, 51, 51);">静态文件服务器</font>
+ <font style="color:rgb(51, 51, 51);">如果要在网页中加载静态文件（css、js、img），就需要另外指定一个存放静态文件的目录，当浏览器发出非HTML文件请求时，服务器端就会到这个目录下去寻找相关文件</font>

```javascript
var express = require('express');
var app = express();
var path = require('path');
app.use(express.static(path.join(__dirname,'public')));
app.listen(3000);
```

## <font style="color:rgb(51, 51, 51);">静态文件服务器实现</font>
+ <font style="color:rgb(51, 51, 51);">配置静态服务器</font>

```javascript
express.static = function (p) {
  return function (req, res, next) {
    var staticPath = path.join(p, req.path);
    var exists = fs.existsSync(staticPath);
    if (exists) {
      res.sendFile(staticPath);
    } else {
      next();
    }
  }
};
```

# <font style="color:rgb(51, 51, 51);">重定向</font>
+ <font style="color:rgb(51, 51, 51);">redirect方法允许网址的重定向，跳转到指定的url并且可以指定status，默认为302方式。</font>
    - <font style="color:rgb(51, 51, 51);">参数1 状态码(可选)</font>
    - <font style="color:rgb(51, 51, 51);">参数2 跳转的路径</font>

```javascript
res.redirect([status], url);
```

## <font style="color:rgb(51, 51, 51);">redirect使用</font>
+ <font style="color:rgb(51, 51, 51);">使用重定向</font>

```javascript
app.get('/', function (req,res) {
  res.redirect('http://www.baidu.com')
});
```

## <font style="color:rgb(51, 51, 51);">redirect的实现</font>
+ <font style="color:rgb(51, 51, 51);">302重定向</font>

```javascript
res.redirect = function (url) {
  res.status(302);
  res.headers('Location', url || '/');
  res.sendHeader();
  res.end();
};
```

# <font style="color:rgb(51, 51, 51);">接收 post 响应体</font>
+ <font style="color:rgb(51, 51, 51);">安装body-parser</font>

```shell
$ npm install body-parser
```

## <font style="color:rgb(51, 51, 51);">使用body-parser</font>
+ <font style="color:rgb(51, 51, 51);">接收请求体中的数据</font>

```javascript
app.get('/login', function (req,res) {
  res.sendFile('./login.html',{root:__dirname})
});
app.post('/user', function (req,res) {
  console.log(req.body);
  res.send(req.body);
});
app.listen(3000);
```

## <font style="color:rgb(51, 51, 51);">req.body的实现</font>
+ <font style="color:rgb(51, 51, 51);">实现bodyParser</font>

```javascript
function bodyParser () {
  return function (req,res,next) {
    var result = '';
    req.on('data', function (data) {
      result+=data;
    });
    req.on('end', function () {
      try{
        req.body = JSON.parse(result);
      }catch(e){
        req.body = require('querystring').parse(result);
      }
      next();
    })
  }
};
```

# 架构图
<!-- 这是一张图片，ocr 内容为：APLLICATION 请求到来 0-0-0 CONST ROUTE NEW ROUTE ROUTER.STACK ROUTE.STACK ROUTE.METHOD-{GET:TRUE,DELETE:TRUE] LAYER ROUTE.DISPATCH /USER LAYER.FN LAYER.FN LAYER.FN GET GET LAYE LAYER.FN /USER ROUTE.DISPATCH GET -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742451824621-ce10c67a-7a32-4eeb-88c0-987fe7f1eeef.png)

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742460689973-43992c9b-bb51-4d69-aa5d-c1ff4fc85b93.png)

+ 多级路由

<!-- 这是一张图片，ocr 内容为：/ADD /SECOND ROUTER.MIDDLE FREMOVE /REMOVE /USER ROUTER.MIDDLE /XXX ROUTER.MIDDLE /USER ARTICLE /ADD /ARTICLE ROUTER.MIDDLE /REMOVE -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742541064618-683825ac-8098-4bd7-9e7a-2dc9c18058ed.png)

+ [三步法解析Express源码表示一个Express应用，通过express()即可进行创建。 一个Layer中会有多个处 - 掘金](https://juejin.cn/post/6884575671721394189)

# <font style="color:rgb(51, 51, 51);">源代码地址</font>
+ [GitHub - YataoZhang/mockxpress: 自己实现的Express框架](https://github.com/YataoZhang/mockxpress)

# 参考
[从express源码中探析其路由机制 - CNode技术社区](https://cnodejs.org/topic/545720506537f4d52c414d87)

[Express,Sequelize和MySQL的Node.js Rest API示例 - 腾讯云开发者社区-腾讯云](https://cloud.tencent.com/developer/article/1745399)

