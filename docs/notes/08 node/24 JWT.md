# <font style="color:rgb(51, 51, 51);">JWT</font>
+ <font style="color:rgb(51, 51, 51);">JWT(json web token)是为了在网络应用环境间传递声明而执行的一种基于JSON的开放标准。</font>
+ <font style="color:rgb(51, 51, 51);">JWT的声明一般被用来在身份提供者和服务提供者间传递被认证的用户身份信息，以便于从资源服务器获取资源。比如用在用户登录上。</font>
+ <font style="color:rgb(51, 51, 51);">因为数字签名的存在，这些信息是可信的，JWT可以使用HMAC算法或者是RSA的公私秘钥对进行签名</font>

# <font style="color:rgb(51, 51, 51);">主要应用场景</font>
+ <font style="color:rgb(51, 51, 51);">身份认证在这种场景下，一旦用户完成了登陆，在接下来的每个请求中包含JWT，可以用来验证用户身份以及对路由，服务和资源的访问权限进行验证。</font>
+ <font style="color:rgb(51, 51, 51);">信息交换在通信的双方之间使用JWT对数据进行编码是一种非常安全的方式，由于它的信息是经过签名的，可以确保发送者发送的信息是没有经过伪造的</font>

# JWT的结构
+ <font style="color:rgb(51, 51, 51);">JWT包含了使用</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">.</font>`<font style="color:rgb(51, 51, 51);">分隔的三部分</font>
+ <font style="color:rgb(51, 51, 51);">Header 头部</font>
+ <font style="color:rgb(51, 51, 51);">Payload 负载</font>
+ <font style="color:rgb(51, 51, 51);">Signature 签名</font>

## <font style="color:rgb(51, 51, 51);">Header</font>
+ <font style="color:rgb(51, 51, 51);">在header中通常包含了两部分：token类型和采用的加密算法。</font>

```json
{ "alg": "HS256", "typ": "JWT"}
```

+ <font style="color:rgb(51, 51, 51);">接下来对这部分内容使用</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Base64Url</font>`<font style="color:rgb(51, 51, 51);">编码组成了</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">JWT</font>`<font style="color:rgb(51, 51, 51);">结构的第一部分。</font>

## <font style="color:rgb(51, 51, 51);">Payload</font>
+ <font style="color:rgb(51, 51, 51);">负载就是存放有效信息的地方。这个名字像是指货车上承载的货物，这些有效信息包含三个部分</font>
    - <font style="color:rgb(51, 51, 51);">标准中注册的声明</font>
    - <font style="color:rgb(51, 51, 51);">公共的声明</font>
    - <font style="color:rgb(51, 51, 51);">私有的声明</font>

### <font style="color:rgb(51, 51, 51);">标准中注册的声明 (建议但不强制使用)</font>
+ <font style="color:rgb(51, 51, 51);">iss: jwt签发者</font>
+ <font style="color:rgb(51, 51, 51);">sub: jwt所面向的用户</font>
+ <font style="color:rgb(51, 51, 51);">aud: 接收jwt的一方</font>
+ <font style="color:rgb(51, 51, 51);">exp: jwt的过期时间，这个过期时间必须要大于签发时间,这是一个秒数</font>
+ <font style="color:rgb(51, 51, 51);">nbf: 定义在什么时间之前，该jwt都是不可用的.</font>
+ <font style="color:rgb(51, 51, 51);">iat: jwt的签发时间</font>

### <font style="color:rgb(51, 51, 51);">公共的声明</font>
+ <font style="color:rgb(51, 51, 51);">公共的声明可以添加任何的信息，一般添加用户的相关信息或其他业务需要的必要信息.但不建议添加敏感信息，因为该部分在客户端可解密</font>

### <font style="color:rgb(51, 51, 51);">私有的声明</font>
+ <font style="color:rgb(51, 51, 51);">私有声明是提供者和消费者所共同定义的声明，一般不建议存放敏感信息，因为base64是对称解密的，意味着该部分信息可以归类为明文信息</font>

### <font style="color:rgb(51, 51, 51);">负载使用的例子</font>
```javascript
{ "sub": "1234567890", "name": "zfpx", "admin": true}
```

+ <font style="color:rgb(51, 51, 51);">上述的负载需要经过</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Base64Url</font>`<font style="color:rgb(51, 51, 51);">编码后作为JWT结构的第二部分</font>

## <font style="color:rgb(51, 51, 51);">Signature</font>
+ <font style="color:rgb(51, 51, 51);">创建签名需要使用编码后的header和payload以及一个秘钥</font>
+ <font style="color:rgb(51, 51, 51);">使用header中指定签名算法进行签名</font>
+ <font style="color:rgb(51, 51, 51);">例如如果希望使用HMAC SHA256算法，那么签名应该使用下列方式创建</font>

```javascript
HMACSHA256( base64UrlEncode(header) + "." + base64UrlEncode(payload), secret)
```

+ <font style="color:rgb(51, 51, 51);">签名用于验证消息的发送者以及消息是没有经过篡改的</font>
+ <font style="color:rgb(51, 51, 51);">完整的JWT 完整的JWT格式的输出是以. 分隔的三段Base64编码</font>
+ <font style="color:rgb(51, 51, 51);">密钥secret是保存在服务端的，服务端会根据这个密钥进行生成token和验证，所以需要保护好。</font>

# <font style="color:rgb(51, 51, 51);">如何使用JWT</font>
1. <font style="color:rgb(51, 51, 51);">当用户使用它的认证信息登陆系统之后，会返回给用户一个JWT</font>
2. <font style="color:rgb(51, 51, 51);">用户只需要本地保存该token（通常使用local storage，也可以使用cookie）即可</font>
3. <font style="color:rgb(51, 51, 51);">当用户希望访问一个受保护的路由或者资源的时候，通常应该在Authorization头部使用Bearer模式添加JWT，其内容看起来是下面这样</font>

```plain
Authorization: Bearer <token>
```

4. <font style="color:rgb(51, 51, 51);">因为用户的状态在服务端的内存中是不存储的，所以这是一种无状态的认证机制</font>
5. <font style="color:rgb(51, 51, 51);">服务端的保护路由将会检查请求头Authorization中的JWT信息，如果合法，则允许用户的行为。</font>
6. <font style="color:rgb(51, 51, 51);">由于JWT是自包含的，因此减少了需要查询数据库的需要</font>
7. <font style="color:rgb(51, 51, 51);">JWT的这些特性使得我们可以完全依赖其无状态的特性提供数据API服务，甚至是创建一个下载流服务。</font>
8. <font style="color:rgb(51, 51, 51);">因为JWT并不使用Cookie的，所以你可以使用任何域名提供你的API服务而不需要担心跨域资源共享问题（CORS）</font>

<!-- 这是一张图片，ocr 内容为：1.POST /USER/LOGIN 输入用户名密码进行登录 2.服务器端使用 密钥创建JWT 3.把JWT返回给浏览器 服务器 浏览器 4.在发给服务器的认识头中发送JWT 5.检查JWT的 签名,从JWT 获取用户信息 6.把响应发送给客户端 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742653161987-baddc734-0c3d-46e7-abb9-cd34aba16c52.png)

```javascript
const express = require('express');
const { expressjwt } = require('express-jwt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// 1.解析post表单数据的中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2.解决跨域问题
app.use(cors());

// 3.定义secret密钥，建议将密钥命名为secretKey
const secretKey = "jwt GWB"; // 自定义

// 4.将JWT字符串还原为json对象
//  expressjwt({ secret: secretKey, algorithms: ["HS256"] }) 用来解析token的中间件
// .unless({ path: [/^\/api\//] }) 用来指定哪些接口不需要访问权限
// 注意：只要配置成功了 express-jwt 这个中间件，就可以把解析出来的用户信息,挂在到req.auth上
app.use(expressjwt({
  secret: secretKey,
  algorithms: ["HS256"]
}).unless({ path: [/^\/api\//] }));

app.post("/api/login", (req, res) => {
  const userinfo = req.body;

  if (userinfo.username !== "admin" || userinfo.password != "admin") {
    return res.send({
      status: 400,
      message: "登录失败",
    });
  }
  // 用户登陆成功之后，生成JWT字符串，通过token属性响应给客户端
  // 调用jwt.sign() 生成jwt字符串，三个参数分别是:用户信息对象，加密密钥,配置对象
  // 注意：千万不要把密码写入token中
  const tokenStr = jwt.sign({ username: userinfo.username }, secretKey, {
    expiresIn: "120s",
  });

  res.json({
    status: 200,
    msg: "登录成功",
    token: tokenStr,
  });
});


// 前端请求需要在请求头带上Authorization：Bearer 获得的token
app.get("/user", (req, res) => {
  res.send({
    status: 200,
    data: req.auth,
  });
});

// 使用全局错误处理中间件，捕获解析JWT失败后产生的错误
app.use((err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    return res.send({
      status: 401,
      message: "无效的token",
    });
  }
  res.send({
    status: 500,
    message: "未知的错误",
  });
});

app.listen(3300, () => {
  console.log('Server listening on port 3000');
});
```

```http
@baseUrl = http://localhost:3300
@token = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzQyOTU4NDczLCJleHAiOjE3NDI5NTg1OTN9.kP4XpaqgVYHRVHvn8Lv-Ws9LjxdDVq4Kb4w35Pj02yA

POST {{baseUrl}}/api/login HTTP/1.1
Content-Type: application/json

{
  "username": "admin",
  "password": "admin"
}

###
GET {{baseUrl}}/user HTTP/1.1
Authorization: Bearer {{token}}
```

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  <script>
    fetch('http://localhost:3300/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin'
      })
    }).then(res => res.json()).then(res => {
      console.log(res);
    });
  </script>
</body>
</html>
```

[JSON Web Tokens - jwt.io](https://jwt.io/)

# <font style="color:rgb(51, 51, 51);">JWT实战</font>
## 后端
### <font style="color:rgb(51, 51, 51);">config.js</font>
```javascript
module.exports = {
	dbUrl: 'mongodb://127.0.0.1/jwt',
	secret: 'zfpx'
}
```

### <font style="color:rgb(51, 51, 51);">app.js</font>
+ [Moment.js 中文网](http://momentjs.cn/)

```javascript
const express = require('express');
const jwt = require('jwt-simple');
const bodyParser = require('body-parser');
const moment = require('moment');
const User = require('./model/user');
const jwtWare = require('./jwt');
const { secret } = require('./config');
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.post('/signup', async function (req, res) {
  let user = req.body;
  user = await User.create(user);
  if (user) {
    res.json({
      code: 0,
      data: {
        user
      }
    });
  } else {
    res.json({
      code: 1,
      data: '用户注册失败'
    });
  }
});
app.post('/login', async function (req, res) {
  let user = req.body;
  user = await User.findOne(user);
  if (user) {
    let expires = moment().add(7, 'days').valueOf();
    let userInfo = {
      id: user._id,
      username: user.username
    };
    let token = jwt.encode({
      user: userInfo,
      exp: expires
    }, secret);
    res.json({
      code: 0,
      data: {
        token,
        expires,
        user: userInfo
      }
    });
  } else {
    res.json({
      code: 1,
      data: '用户名或密码错误'
    });
  }
});
app.get('/user', jwtWare, function (req, res) {
  res.json({
    code: 0,
    data: {
      user: req.user
    }
  });
});
app.listen(8080);
```

### <font style="color:rgb(51, 51, 51);">jwt.js</font>
```javascript
const { secret } = require('./config');
const jwt = require('jwt-simple');
const User = require('./model/user');
module.exports = async function (req, res, next) {
  let authorization = req.headers['authorization'];
  if (authorization) {
    try {
      let decoded = jwt.decode(authorization.split(' ')[1], secret);
      req.user = decoded.user;
      next();
    } catch (err) {
      console.log(err);
      res.status(401).send('Not Allowed');
    }
  } else {
    res.status(401).send('Not Allowed');
  }
}
```

### <font style="color:rgb(51, 51, 51);">user.js</font>
```javascript
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let ObjectId = Schema.Types.ObjectId;
let { dbUrl } = require('../config');
let conn = mongoose.createConnection(dbUrl);
let UserSchema = new Schema({
  username: String,
  password: String
});
module.exports = conn.model("User", UserSchema);
```

## <font style="color:rgb(51, 51, 51);">前端</font>
```shell
create-react-app front
cd front
cnpm i react react-dom react-router-dom axios -S
```

### <font style="color:rgb(51, 51, 51);">index.js</font>
```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, Switch, Redirect } from 'react-router-dom';
import createHashHistory from 'history/createHashHistory';
import Login from './components/Login';
import User from './components/User';
const history = createHashHistory();
ReactDOM.render(
  <Router history={history}>
  <Switch>
  <Route exact path="/" component={Login} />
  <Route path="/user" component={User} />
  <Redirect to="/" />
  </Switch>
  </Router>, document.querySelector('#root')
);
```

### <font style="color:rgb(51, 51, 51);">api.js</font>
```javascript
import axios from 'axios';
import createHashHistory from 'history/createHashHistory';
const history = createHashHistory();
axios.interceptors.request.use(config => {
  if (localStorage.token) {
    config.headers.Authorization = 'Bearer ' + localStorage.token
  }
  return config
}, error => {
  return Promise.reject(error)
})

axios.interceptors.response.use(res => {
  if (res.data.code != 0) {
    return Promise.reject(res);
  }
  return res;
}, error => {
  if (error.response.status == 401) {
    history.push('/');
  }
  return Promise.reject(error.response.data);
});

export function login(data) {
  return axios({
    url: 'http://localhost:8080/login',
    method: 'post',
    data
  }).then(response => {
    let data = response.data;
    localStorage.setItem('token', data.data.token);
    return data;
  })
}
export function getUser(data) {
  return axios({
    url: 'http://localhost:8080/user',
    method: 'get'
  }).then(response => {
    return response.data;
  })
}
```

### <font style="color:rgb(51, 51, 51);">Login.js</font>
```javascript
import React, { Component } from 'react';
import { login } from '../api';
export default class Login extends Component {
  handleSubmit = (event) => {
    event.preventDefault();
    let username = this.username.value;
    let password = this.password.value;
    login({ username, password }).then(data => {
      if (data.code == 0) {
        this.props.history.push('/user');
      }
    });
  }
  render() {
    return (
      <form onSubmit={this.handleSubmit}>
      用户名<input required ref={ref => this.username = ref} />
    密码<input required ref={ref => this.password = ref} />
      <input type="submit" />
      </form>
    )
  }
}
```

### <font style="color:rgb(51, 51, 51);">User.js</font>
```javascript
import React, { Component } from 'react';
import { getUser } from '../api';
export default class User extends Component {
	state = {
		user: {}
	}
	componentDidMount() {
		getUser().then(res => {
			if (res && res.code == 0) {
				this.setState({ user: res.data.user });
			}
		});
	}
	render() {
		return (
			<div>
			欢迎 {this.state.user.username}
		</div>
		)
	}
}
```

# <font style="color:rgb(51, 51, 51);">原理实现</font>
+ <font style="color:rgb(51, 51, 51);">jwt.js</font>

```javascript
const crypto = require('crypto');
function encode(payload, key) {
  let header = { type: 'JWT', alg: 'sha256' };//声明类型和算法
  var segments = [];//声明一个数组
  segments.push(base64urlEncode(JSON.stringify(header)));//对header进行base64
  segments.push(base64urlEncode(JSON.stringify(payload)));//对负载进行base64
  segments.push(sign(segments.join('.'), key));//加入签名
  return segments.join('.');
}
function sign(input, key) {
  return crypto.createHmac('sha256', key).update(input).digest('base64');
}


function decode(token, key) {
  var segments = token.split('.');
  var headerSeg = segments[0];
  var payloadSeg = segments[1];
  var signatureSeg = segments[2];

  var header = JSON.parse(base64urlDecode(headerSeg));
  var payload = JSON.parse(base64urlDecode(payloadSeg));

  if (signatureSeg != sign([headerSeg, payloadSeg].join('.'), key)) {
    throw new Error('verify failed');
  }

  if (payload.exp && Date.now() > payload.exp * 1000) {
    throw new Error('Token expired');
  }
  return payload;
}

function base64urlEncode(str) {
  return new Buffer(str).toString('base64');
}

function base64urlDecode(str) {
  return new Buffer(str, 'base64').toString();
}

module.exports = {
  encode,
  decode
}
```

# 案例
```javascript
const express = require('express');
const chalk = require('chalk');
const morgan = require('morgan');
const { expressjwt } = require('express-jwt');
const jwt = require('jsonwebtoken');
// 数据库
const sequelize = require('./db');
const Teacher = require('./teacher');


const app = express();
const PORT = 3000;

const secretOrPrivateKey = 'secret12345'

app.use(morgan('dev'));

// TODO: 配置解析请求体数据 application/json
app.use(express.json());
// TODO: 配置解析请求体数据 application/x-www-form-urlencoded
app.use(express.urlencoded());

app.use(expressjwt({
  secret: secretOrPrivateKey,  // 签名的密钥 或 PublicKey
  algorithms: ['HS256'],
}).unless({
  path: ['/login', '/teacher'] // 指定路径不经过 Token 解析
}));

app.get('/', async (req, res, next) => {
  try {
    res.send(req.auth);
  } catch (error) {
    next(error);
  }
});

app.get('/teacher', async (req, res, next) => {
  try {
    const teachers = await Teacher.findAll();
    const json = JSON.stringify(teachers, null, 4)
    console.log(json)
    // res.send(json);
    res.json(teachers);
  } catch (error) {
    next(error);
  }
})

app.post('/login', (req, res, next) => {
  // 注意默认情况 Token 必须以 Bearer+空格 开头
  const user = req.body;
  const token = 'Bearer ' + jwt.sign({
    user: user.username,
    admin: user.role === 'admin'
  }, secretOrPrivateKey, {
    expiresIn: 30
  })
  res.json({
    status: 'ok',
    data: {
      token: token
    }
  })
})

// TODO: 404处理
app.use((req, res) => {
  res.status(404).send('404 NOT FOUND');
});

// TODO: 错误处理
app.use((error, req, res, next) => {
  if (error.name === 'UnauthorizedError') {  
    res.status(401).send('invalid token')
  } else {
    // console.error(error.stack);
    res.status(500).send(error.message);
  }
  
});

app.listen(PORT, () => {
  const yellowBright = chalk.yellowBright;
  const green = chalk.green;
  console.log(`
    ${yellowBright('Local Server running at:')}
    http://localhost:${green(PORT)}
    http://127.0.0.1:${green(PORT)}
    Hit CTRL-C to stop the server
  `);
});
```

```javascript
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('demo', 'root', 'root123456', {
  host: 'localhost', // 数据库的配置
  dialect: 'mysql',
  logging: console.log
});

module.exports = sequelize;
```

```javascript
const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('./db');

const Teacher = sequelize.define('teacher', {
  id: {
    type: DataTypes.NUMBER,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  createdAt: Sequelize.BIGINT,
  updatedAt: Sequelize.BIGINT,
}, {
  timestamps: false,
})

module.exports = Teacher;
```

```json
{
  "name": "express-jwt",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "chalk": "4",
    "express": "^4.18.2",
    "express-jwt": "^8.3.0",
    "jsonwebtoken": "^9.0.0",
    "morgan": "^1.10.0",
    "mysql2": "^3.0.1",
    "sequelize": "^6.28.0"
  }
}
```

# 参考
[Getting Started | Sequelize](https://sequelize.org/docs/v6/getting-started/)

[前端鉴权知识学习](https://zhuanlan.zhihu.com/p/127791614)

[web开发常见的鉴权方式 - 奋斗的大橙子 - 博客园](https://www.cnblogs.com/dcz2015/p/11725862.html)

