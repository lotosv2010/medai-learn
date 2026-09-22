# HTTP发展历程
+ 1990年 HTTP/0.9为了便于服务器和客户端处理，采用了"纯文本”格式，只运行使用GET请求。在响应请求之后会立即关闭连接。
+ 1996年 HTTP/1.0增强了 0.9版本，引入了 HTTP Header(头部)的概念，传输的数据不再仅限于文本，可以解析图片音乐等，增加了响应状态码和 POST，HEAD 等请求方法。(内容协商)
+ 1999年广泛使用 HTTP/1.1，正式标准，允许持久连接，允许响应数据分块，增加了缓存管理和控制，增加了 PUT、DELETE 等新的方法。(问题 多个请求并发 http 队头阻塞的问题)
+ 2015年HTTP/2，使用 HPACK 算法压缩头部，减少数据传输量。允许服务器生动向客户端推送数据，二进制协议可发起多个请求，使用时需要对请求加密通信。
+ 2018年 HTTP/3 基于UDP 的 QUIC 协议。

# HTTP/1.1
+ HTTP/1.1 是可靠传输协议，基于 TCP/IP 协议;
+ 采用应答模式，客户端主动发起请求，服务器被动回复请求;
+ HTTP是无状态的每个请求都是互相独立；
+ HTTP 协议的请求报文和响应报文的结构基本相同，由三部分组成。

<!-- 这是一张图片，ocr 内容为：协议版本 方法 请求首部字段 /FORM/ENTRY HTTP/1.1 POST HOST:HACKR.JP CONNECTION:KEEP-ALIVE CONTENT-TYPE:APPLICATION/X-WWW-FORM-URLENCODED CONTENT-LENGTH:16 NAMEUENO&AGE37 内容实体 状态码的原因短语 协议版本 状态码 响应首部字段 HTTP/1.1 200 OK 2012 06:50:15 GMT DATE:TUE,10 JU1 201 CONTENT-LENGTH:362 CONTENT-TYPE:TEXT/HTML <HTML> 主体 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1742114234948-462e396d-fa21-47ac-b333-025923b1c8d2.png)

## 服务端
```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World\n');
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});
```

## 客户端
```javascript
const net = require('net');
const client = net.createConnection({
  port: 3000
}, () => {
  client.write(`
GET / HTTP/1.1
name: gwb


`);
})

client.on('data', (data) => {
  console.log(data.toString());
  client.end();
})

client.on('end', () => {
  console.log('disconnected from server');
})

client.on('error', (err) => {
  console.log(err);
})

// node client.js

// HTTP/1.1 200 OK
// Content-Type: text/plain
// Date: Sun, 16 Mar 2025 09:28:10 GMT
// Connection: keep-alive
// Keep-Alive: timeout=5
// Transfer-Encoding: chunked

// c
// Hello World

// 0


// disconnected from server
```

## 原理
```javascript
const net = require('net');

const server = net.createServer((socket) => {
  socket.write(`
HTTP/1.1 200 OK
Content-Length: 13


Hello World!`);
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
```

# HTTP核心概念
## 什么是HTTP?应用层
+ 通常的网络是在 `TCP/IP` 协议族的基础上来运作的， `HTTP` 是一个子集。

## TCP/IP协议族 
+ 协议简单来说就是通信的规则，例如：通信时谁先发起请求，怎样结束，如何进行通信。把互联网相关的协议统称起来称为 `TCP/IP` 。
+ HTTP应用层协议在传输层的基础上增加了一些自己的内容

## 协议分层(OSI协议分层)
+ (物，数)，网，传，(会，表，应)
    - 应用层 `HTTP,FTP,DNS`  (与其他计算机进行通讯的一个应用服务，向用户提供应用服务时的通信活动)
    - 传输层 `TCP` （可靠） `UDP`  数据传输 ( `HTTP -> TCP DNS->UDP` )
    - 网络层 `IP`  选择传输路线 (通过 `ip` 地址和 `mac` 地址)(使用 `ARP` 协议凭借 `mac` 地址进行通信)
    - 链路层 网络连接的硬件部分

<!-- 这是一张图片，ocr 内容为：我想浏览 http://hackr.jp/xss/Web页面 告诉我hackr.jp的IP地址吧 88分3 hackr.jip对应的IP地址是 20X.189.105.112 DNS 客户端 HTTP协议的职责 生成针对目标Web服务器的HTTP请求报文 请给我http://hackr.jp/xss 页面的资源 TCP协议的职责 为了方便通信,将HTTP请求报文分割成报文段 nn 按序号分为多个 报文段 把每个报文段可以靠地传给对方 IP协议的职责 搜索对方的地址,一边中转一边传送 路由器 路由器 TCP协议的职责 从对方那里接收到的报文段 重组到达的报文段 按序号以原来的顺序 重组请求报文 HTTP协议的职责 对Web服务器请求的内容的处理 原来是想要这台计算机上的/xss/资源啊 IP地址 20X.189.105.112 请求的处理结果也同样利用TCP/IP hackr.jp 通信协议向用户进行回传 服务器 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1614219097508-44d4194f-4adf-4a6b-8603-efa421b97ec3.png)

## HTTP特点
+ `http` 是不保存状态的协议，使用 `cookie` 来管理状态 (登录先给你 `cookie`  我可以看一下你有没有 `cookie` )
+ 为了防止每次请求都会造成无谓的 `tcp` 链接建立和断开，所以采用保持链接的方式 `keep-alive` 
+ 以前发送请求后需要等待并收到响应，才能发下一个，现在都是 `管线化` 的方式 ( `js css`  可以并发请求 6 2) `cdn` 

## HTTP缺点
+ 通信采用明文
+ 不验证通信方的身份
+ 无法验证内容的完整性 (内容可能被篡改)

> 通过SSL（安全套阶层）建立安全通信线路 HTTPS (超文本传输安全协议)
>

## HTTP方法
+ `GET` :获取资源 `/user？` 
+ `POST` :传输实体主体,请求体中
+ `PUT` ：来传输文件
+ `HEAD` : 获取报文首
+ `DELETE` : 删除文件
+ `OPTIONS` :询问支持的方法 `跨域` 如果默认发送的是 `get/post`  不会发送 `options` 的 `复杂请求`   
`get /post`  `(a:1) headers:{a:1}`  `put / delete`  复杂的请求
+ **REST API** Resful风格 根据路径和不同的方法 就能确定对资源进行什么操作
+ 跨域是浏览器之前的，服务器之间没有跨域问题，解决方案有反向代理 、后端设置cors等。
+ `c.com-> d.com`  `OPTIONS` 非简单请求会发送 `options`  ( `options`  直接返回 `ok` 就可以了

## HTTP状态码
+ `curl` 命令行工具 或 `postman` 
+ `1xx`  信息性状态码 `websocket upgrade` 
+ `2xx`  成功状态码 `200`  `204` (没有响应体) `206` (范围请求 暂停继续下载) 获取网页的部分请求
+ `3xx`  重定向状态码 `301`  `302`  `303`  post -> get `304` (删除报文主体 在次发送请求) `307`  (不会从POST转为GET)
+ `4xx`  客户端错误状态码 `400`  `401`  `403`  `404`  `405`  方法不允许
+ `5xx`  服务端错误状态码 `500`  `503` 

### HTTP状态码分类
| 分类 | 类别 | 分类描述 |
| --- | --- | --- |
| 1** | Informational（信息性状态码 | 信息，服务器收到请求，需要请求者继续执行操作 |
| 2** | Success（成功状态码） | 成功，操作被成功接收并处理 |
| 3** | <font style="color:#262626;">Redirection（重定向）</font> | 重定向，需要进一步的操作以完成请求 |
| 4** | Client error（客户端错误） | 客户端错误，请求包含语法错误或无法完成请求 |
| 5** | Server Error（服务器错误） | 服务器错误，服务器在处理请求的过程中发生了错误 |




### HTTP状态码列表
| 状态码 | 状态码英文名称 | 中文描述 |
| --- | --- | --- |
| 100 | Continue | 继续。客户端应继续其请求 |
| 101 | Switching Protocols | 切换协议。服务器根据客户端的请求切换协议。只能切换到更高级的协议，例如，切换到HTTP的新版本协议 |
| | | |
| <font style="color:#F5222D;">200</font> | OK | 请求成功。一般用于GET与POST请求 |
| 201 | Created | 已创建。成功请求并创建了新的资源 |
| 202 | Accepted | 已接受。已经接受请求，但未处理完成 |
| 203 | Non-Authoritative Information | 非授权信息。请求成功。但返回的meta信息不在原始的服务器，而是一个副本 |
| 204 | No Content | 无内容。服务器成功处理，但未返回内容。在未更新网页的情况下，可确保浏览器继续显示当前文档 |
| 205 | Reset Content | 重置内容。服务器处理成功，用户终端（例如：浏览器）应重置文档视图。可通过此返回码清除浏览器的表单域 |
| 206 | Partial Content | 部分内容。服务器成功处理了部分GET请求 |
| | | |
| 300 | Multiple Choices | 多种选择。请求的资源可包括多个位置，相应可返回一个资源特征与地址的列表用于用户终端（例如：浏览器）选择 |
| <font style="color:#F5222D;">301</font> | Moved Permanently | 永久移动。请求的资源已被永久的移动到新URI，返回信息会包括新的URI，浏览器会自动定向到新URI。今后任何新的请求都应使用新的URI代替 |
| <font style="color:#F5222D;">302</font> | Found | 临时移动。与301类似。但资源只是临时被移动。客户端应继续使用原有URI |
| 303 | See Other | 查看其它地址。与301类似。使用GET和POST请求查看 |
| <font style="color:#F5222D;">304</font> | Not Modified | 未修改。所请求的资源未修改，服务器返回此状态码时，不会返回任何资源。客户端通常会缓存访问过的资源，通过提供一个头信息指出客户端希望只返回在指定日期之后修改的资源 |
| 305 | Use Proxy | 使用代理。所请求的资源必须通过代理访问 |
| 306 | Unused | 已经被废弃的HTTP状态码 |
| 307 | Temporary Redirect | 临时重定向。与302类似。使用GET请求重定向 |
| | | |
| <font style="color:#F5222D;">400</font> | Bad Request | 客户端请求的语法错误，服务器无法理解 |
| <font style="color:#F5222D;">401</font> | Unauthorized | 请求要求用户的身份认证 |
| 402 | Payment Required | 保留，将来使用 |
| 403 | Forbidden | 服务器理解请求客户端的请求，但是拒绝执行此请求 |
| <font style="color:#F5222D;">404</font> | Not Found | 服务器无法根据客户端的请求找到资源（网页）。通过此代码，网站设计人员可设置"您所请求的资源无法找到"的个性页面 |
| 405 | Method Not Allowed | 客户端请求中的方法被禁止 |
| 406 | Not Acceptable | 服务器无法根据客户端请求的内容特性完成请求 |
| 407 | Proxy Authentication Required | 请求要求代理的身份认证，与401类似，但请求者应当使用代理进行授权 |
| 408 | Request Time-out | 服务器等待客户端发送的请求时间过长，超时 |
| 409 | Conflict | 服务器完成客户端的 PUT 请求时可能返回此代码，服务器处理请求时发生了冲突 |
| 410 | Gone | 客户端请求的资源已经不存在。410不同于404，如果资源以前有现在被永久删除了可使用410代码，网站设计人员可通过301代码指定资源的新位置 |
| 411 | Length Required | 服务器无法处理客户端发送的不带Content-Length的请求信息 |
| 412 | Precondition Failed | 客户端请求信息的先决条件错误 |
| 413 | Request Entity Too Large | 由于请求的实体过大，服务器无法处理，因此拒绝请求。为防止客户端的连续请求，服务器可能会关闭连接。如果只是服务器暂时无法处理，则会包含一个Retry-After的响应信息 |
| 414 | Request-URI Too Large | 请求的URI过长（URI通常为网址），服务器无法处理 |
| 415 | Unsupported Media Type | 服务器无法处理请求附带的媒体格式 |
| 416 | Requested range not satisfiable | 客户端请求的范围无效 |
| 417 | Expectation Failed | 服务器无法满足Expect的请求头信息 |
| | | |
| <font style="color:#F5222D;">500</font> | Internal Server Error | 服务器内部错误，无法完成请求 |
| 501 | Not Implemented | 服务器不支持请求的功能，无法完成请求 |
| 502 | Bad Gateway | 作为网关或者代理工作的服务器尝试执行请求时，从远程服务器接收到了一个无效的响应 |
| <font style="color:#F5222D;">503</font> | Service Unavailable | 由于超载或系统维护，服务器暂时的无法处理客户端的请求。延时的长度可包含在服务器的Retry-After头信息中 |
| 504 | Gateway Time-out | 充当网关或代理的服务器，未及时从远端服务器获取请求 |
| 505 | HTTP Version not supported | 服务器不支持请求的HTTP协议的版本，无法完成处理 |




## http客户端和服务端通信
+ `Http` 报文， `http` 交互的信息称之为 `http` 报文

<!-- 这是一张图片，ocr 内容为：请求行 报文首部 请求首部字段 通用首部字段 空行(CR+LF) 实体首部字段 报文主体 其他 状态行 报文首部 响应首部字段 通用首部字段 空行(CR+LF) 实体首部字段 报文主体 其他 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1614219175036-5fd6788a-6bbc-4185-907d-5c20ed4918d6.png)



+ 通用首部字段：请求和响应报文都有的首部
+ 实体首部字段：描述实体部分的字段

<!-- 这是一张图片，ocr 内容为：协议版本 方法 请求首部字段 HTTP/1.1 form/entry POST Host:hackr.jp Connection:keep-alive Content-Type:appiication/x-www-ormurencoded Content-Length:16 name-uenokaqe-37 内容实体 状态码的原因短语 协议版本 状态码 响应首部字段 HTTP/1.1 OK 200 Jul201206:50:15GMT Date:rue10 Content-Length:362 Content-Type:text/html chtml: 主体 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1614219201951-29f83870-9208-49df-b31a-0e9bc5a1c9be.png)

## URI和URL
### URI
+ `URI` ( `Uniform Resource Identifier` )是统一资源标识符,在某个规则下能把这个资源独一无二标示出来，比如人的身份证号
    - `Uniform`  不用根据上下文来识别资源指定的访问方式
    - `Resource`  可以标识的任何东西
    - `Identifier`  表示可标识的对象

### URL
+ 统一资源定位符，表示资源的地点，URL时使用浏览器访问WEB页面时需要输入的网页地址
    - `Uniform`  不用根据上下文来识别资源指定的访问方式
    - `Resource`  可以标识的任何东西
    - `Location`  定位

<!-- 这是一张图片，ocr 内容为：http://user:passewww.example.jp:o/drdex.huid- 服务器地址 带层次的文件路径 登录信息 片段标识待 协议 方案名(认证) 查询字符串 服务器端口号 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1614219221155-67050364-32fa-4baa-8d72-736812366c5e.png)

## 报文应用
+ `Content-Encoding`  : `gzip` 压缩 
+ `form-data` : 多部分对象集合 上传文件
+ `range` : 范围请求 `206` 
+ `accept-language` ：内容协商 前端控制 后端控制
+ `host` ：单主机多域名 `304`  `http` 缓存
+ `referer` :访问来源 防盗链 
+ `proxy` :代理、网关和隧道
+ `user-agent` :用户内核 
+ 安全相关的头: `X-Frame-Options` 、 `X-XSS-Protection`  (安全 csrf xss https 加密)



# HTTP的应用
## 解析报文
```javascript
const http = require('http');
const urls = require('url');

const server = http.createServer((req, res) => {
  // 1.解析请求
  // 请求行
  const method = req.method;
  const url = req.url;
  const httpVersion = req.httpVersion;
  const { query } = urls.parse(url, true);

  console.log(`${method} ${url} HTTP/${httpVersion}
  `);
  // 请求头
  for (const [key, value] of Object.entries(req.headers)) {
    console.log(`${key}: ${value}`);
  }
  // 请求体
  const chunks = [];
  req.on('data', (chunk) => {
    chunks.push(chunk);
  });

  req.on('end', () => {
    console.log(`
${JSON.stringify(query)}`);
    console.log(`${Buffer.concat(chunks).toString()}`);
  });

  // 2.解析响应
  // 响应行
  // 响应头
  // 响应体
  // res.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8'});
  res.statusCode = 200;
  res.statusMessage = 'OK';
  res.setHeader('Content-Type', 'text/plain;charset=utf-8');
  res.write('你好');
  res.end('Hello World\n');
});

let port = 3000;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

server.on('error', (error) => {
  if(error.code === 'EADDRINUSE') {
    server.listen(++port)
  }
})

// 测试
// curl -X POST -d name=test\&\age=18 http://localhost:3000/a\?id\=\1
```

## 实现静态服务
+ mime模块处理请求文件类型

```shell
npm install mime 
```



```javascript
let http = require('http');
let fs = require('fs');
let url = require('url');
let path = require('path');
let mime = require('mime');
let server = http.createServer((req,res)=>{
  let {pathname} = url.parse(req.url);
  // 根据请求路径查找文件 
  let absFilePath = path.join(__dirname,pathname);
  fs.stat(absFilePath,(err,stat)=>{
    if(err){
      return res.end(`Not Found`);
    }
    if(stat.isDirectory()){ 
      // 尝试查找index.html
      absFilePath = path.join(absFilePath,'index.html');
      fs.access(absFilePath,(err=>{
        if(err){
          res.end(`Not Found`);
        }else{
          let type = mime.getType(absFilePath);   
          res.setHeader('Content-Type',type+';charset=utf-8');
          fs.createReadStream(absFilePath).pipe(res);
        }
      }));
    }else{  
      let type = mime.getType(absFilePath);   
      res.setHeader('Content-Type',type+';charset=utf-8');
      fs.createReadStream(absFilePath).pipe(res);
    }
  });
});
server.listen(3000);
```

[GitHub - lotosv2010/g-http-server: 仿 http-server](https://github.com/lotosv2010/g-http-server)

## 通过类改写静态服务
+ 通过async和await改写主体流程

```javascript
let http = require('http');
let fs = require('fs').promises;
let {createReadStream} = require('fs');
let url = require('url');
let path = require('path');
let mime = require('mime');
class Server{
    async handleServer(req,res){
        let {pathname} = url.parse(req.url);
        let absFilePath = path.join(__dirname,pathname);
        try{
            let statObj = await fs.stat(absFilePath);
            if(statObj.isDirectory()){
                absFilePath = path.join(absFilePath,'index.html');
            }
            this.sendFile(req,res,absFilePath,statObj);
        }catch(err){
            console.log(err);
            this.sendError(req,res);            
        }
    }
    sendFile(req,res,absFilePath,statObj){
        let type = mime.getType(absFilePath);   
        res.setHeader('Content-Type',type+';charset=utf-8');
        createReadStream(absFilePath).pipe(res);
    }
    sendError(req,res){
        res.statusCode = 404;
        res.end(`Not Found`);
    }
    start(){
        let server = http.createServer(this.handleServer.bind(this));
        server.listen(...arguments);
    }
}
let server = new Server();
server.start(3000);
```



## ajax跨域问题
+ cors解决跨域问题

```javascript
'Access-Control-Allow-Origin','http://localhost:5000' 			// 允许某个域访问
'Access-Control-Allow-Credentials','true'           				// 允许携带cookie
'Access-Control-Allow-Headers','Content-Type,Authorization' // 允许携带的header
'Access-Control-Max-Age','3600'                     				// 设置options的请求发送时长
```



```javascript
btn.addEventListener('click', () => {
  const xhr = new XMLHttpRequest()
  xhr.open('POST', 'http://localhost:3000/reg', true)
  xhr.setRequestHeader('Content-Type', 'application/json') // 设置请求头
  xhr.responseType = 'json'
  xhr.withCredentials = true; // 设置强制携带cookie
  xhr.send(JSON.stringify({ username: 'robin', password: '123456'}))
  xhr.onload = function() {
    console.log(typeof xhr.response)
  }
})
```



+ 跨域配置

```javascript
response.setHeader('Access-Control-Allow-Origin', request.headers.origin || '*')
response.setHeader('Access-Control-Allow-Credentials','true')
response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
response.setHeader('Content-Type', 'application/json;charset=utf-8;')
response.setHeader('Access-Control-Max-Age', '1800')
if(req.method === 'OPTIONS'){ // options请求直接结束即可
	return res.end()
}
```



## http缓存问题
+ 强制缓存 ( `Cache-Control`  && `Expires` ) `Cache-Control` :
    - `private`  客户端可以缓存
    - `public`  客户端和代理服务器都可以缓存
    - `max-age=60`  缓存内容将在60秒后失效
    - `no-cache`  需要使用对比缓存验证数据,强制向源服务器再次验证 (没有强制缓存)
    - `no-store`  所有内容都不会缓存，强制缓存和对比缓存都不会触发 (不缓存)

<!-- 这是一张图片，ocr 内容为：强制缓存规则下,缓存未命中 强制缓存规则下,缓存命中 缓存数据库 客户端 服务器 缓存数据库 客户端 请求数据 请求数据 缓存数据失效 有缓存数据,且未失效,返回数据 请求数据 客户端 缓存数据库 返回数据和缓存规则 将数据和缓存规则存入缓存系统 客户端 缓存数据库 服务器 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1614222763023-939f7fc6-07a4-4642-b830-53e9474daa68.png)

```javascript
const http = require('http')
const url = require('url')
const fs = require('fs')
const path = require('path')

http.createServer((req, res) => {
  const { pathname } = url.parse(req.url)
  console.log(pathname)
  const filePath = path.join(__dirname, pathname)
  // 1.强制缓存
  // 分类：
  //  expires 老版本浏览器支持，绝对时间
  //  cache-control 相对时间
  // 特点
  //  默认强制缓存不缓存首页(如果已经断网，那这个网页应该访问不到，所以首页不会被缓存)
  //  引用的资源可以被缓存下来，后续找缓存，不会像服务器请求200
  // 不足
  //    强制缓存不会向服务器发送请求，会导致页面修改后，视图依旧采用老的
  res.setHeader('Expires', new Date(Date.now() + 10 * 1000).toGMTString())
  res.setHeader('Cache-Control', 'max-age=30') // 缓存30秒
  // res.setHeader('Cache-Control', 'no-cache') // 错误理解：不缓存，正确理解：缓存但是每次都会发请求
  // res.setHeader('Cache-Control', 'no-store') // 不再浏览器中进行缓存，每次都请求服务器

  fs.stat(filePath, (error, statObj) => {
    if(error) return res.statusCode = 404, res.end('Not Found')
    if(statObj.isFile()) {
      fs.createReadStream(filePath).pipe(res)
    } else {
      return res.statusCode = 404, res.end('Not Found')
    }
  })
}).listen(3000)
```

+ 对比缓存
    - `Last-Modified`  & `If-Modified-Since` 
    - `ETag`  & `If-None-Match` 

<!-- 这是一张图片，ocr 内容为：对比规则下,缓存命中 对比缓存规则下,缓存未命中 客户端 缓存数据库 服务器 服务器 客户端 缓存数据库 获取缓存据的标识 获取缓存数据的标识 返回缓存效据的标识 返回缓存数据的标识 请求服务器验证缓存标识对应的数据是否失效, 请求服务器验证缓存标识对应的数据是否失效 通知客户端缓存未失效 返回最新据和缓存规则 获取缓存效据 将数据和缓存规则存入缓存系统 客户端 服务器 缓存数据库 服务器 缓存数据库 客户端 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1614222779763-deaec881-0e8d-45a2-af7d-380c46654264.png)

+ `Last-Modified  & If-Modified-Since` 

```javascript
const http = require('http')
const url = require('url')
const fs = require('fs')
const path = require('path')

http.createServer((req, res) => {
  const { pathname } = url.parse(req.url)
  console.log(pathname)
  const filePath = path.join(__dirname, pathname)
  // 1.协商缓存
  // 分类：
  //  Last-Modified  & If-Modified-Since 
  //  ETag  & If-None-Match 
  // Last-Modified特点
  //  对比最后修改时间返回内容
  // Last-Modified不足
  //   内容没有变化修改时间变化了，也会重新读取内容，时间不精确，精确到秒，如果一秒内改变多次也监控不到

  // 设置强制缓存策略
  res.setHeader('Cache-Control', 'no-cache')
  // 获取缓存时间
  const ifModifiedSince = req.headers['if-modified-since']

  fs.stat(filePath, (error, statObj) => {
    if(error) return res.statusCode = 404, res.end('Not Found')
    // 设置 Last-Modified  & If-Modified-Since 缓存
    const lastModified = statObj.ctime.toGMTString()
    if(ifModifiedSince === lastModified) {
      res.statusCode = 304
      return res.end()
    }
    res.setHeader('Last-Modified', lastModified)
    if(statObj.isFile()) {
      fs.createReadStream(filePath).pipe(res)
    } else {
      return res.statusCode = 404, res.end('Not Found')
    }
  })
}).listen(3000)
```

+ `ETag  & If-None-Match` 

```javascript
const http = require('http')
const url = require('url')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
// md5 摘要算法：不是加密算法(不可逆)
//  1.不可逆
//  2.不同内容转化的结果不相同
//  3.转化后的结果都是一样长的
//  4.同样的东西产生的结果肯定是相同的

http.createServer((req, res) => {
  const { pathname } = url.parse(req.url)
  console.log(pathname)
  const filePath = path.join(__dirname, pathname)
  // 1.协商缓存
  // 分类：
  //  Last-Modified  & If-Modified-Since 
  //  ETag  & If-None-Match 
  // ETag特点
  //  第一次请求，需要跟进内容产生一个唯一标识，对应当前的文件
  // ETag不足
  //   性能不高

  // 设置强制缓存策略
  res.setHeader('Cache-Control', 'no-cache')
  // 获取缓存时间
  const ifNodeMatch = req.headers['if-none-match']

  fs.stat(filePath, (error, statObj) => {
    if(error) return res.statusCode = 404, res.end('Not Found')
    // 设置 ETag  & If-None-Match 缓存
    const contentHash = crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('base64')
    if(contentHash === ifNodeMatch) {
      res.statusCode = 304
      return res.end()
    }
    res.setHeader('ETag', contentHash)
    if(statObj.isFile()) {
      fs.createReadStream(filePath).pipe(res)
    } else {
      return res.statusCode = 404, res.end('Not Found')
    }
  })
}).listen(3000)
```

## 压缩与解压缩处理(accept-encoding)
+ 使用 `GZIP / DEFLATE`  实现解压

```javascript
var zlib = require('zlib');
var fs = require('fs');
var http = require('http');
http.createServer(function (request, response) {
    var raw = fs.createReadStream('.' + request.url);
    var acceptEncoding = request.headers['accept-encoding'];
    if (!acceptEncoding) {
        acceptEncoding = '';
    }
    if (acceptEncoding.match(/\bdeflate\b/)) {
        response.setHeader('Content-Encoding','deflate');
        raw.pipe(zlib.createDeflate()).pipe(response);
    } else if (acceptEncoding.match(/\bgzip\b/)) {
        response.setHeader('Content-Encoding','gzip');
        raw.pipe(zlib.createGzip()).pipe(response);
    } else {
        raw.pipe(response);
    }
}).listen(9090)
```



## 图片防盗链(<font style="color:#00abc1;">referer</font>)
+ `index.html` 

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <!-- 如果网站没有referer会导致发送任何资源都不会带referer -->
  <!-- <meta name="referrer" content="never"> -->
</head>
<body>
  <!-- 如果图片直接打开不会增加referer的 -->
  <!-- 我们应该进行校验，如果引用我的人和我的域不是用一个，应该返回错误图片 -->
  <img src="http://b.gwb.com:3000/img/section3-main.png" alt="" srcset="">
  <img src="http://localhost:3000/img/section3-main.png" alt="" srcset="">
</body>
</html>
```

+ `server.js` 

```javascript
const path = require('path')
const fs = require('fs').promises
const mime = require('mime')
const url = require('url')
const Koa = require('koa')
const app = new Koa()

app.use(async (ctx, next) => {
  const absPath = path.join(__dirname, ctx.url)
  try {
    const statObj = await fs.stat(absPath)
    if(statObj.isFile()) {
      const mimeType = mime.getType(absPath)
      ctx.set('Content-Type', mimeType)
      if(/image/.test(mimeType)) {
        // 只对图片进行防盗链处理
        let referer = ctx.headers['referer']
        const host = ctx.headers['host']
        referer = url.parse(referer).host
        if(referer != host) {
          const imgPath = path.join(__dirname, 'img', 'section7-main.png')
          return ctx.body = await fs.readFile(imgPath)
        }
      }
      ctx.body = await fs.readFile(absPath)
    } else {
      ctx.body = 'Not Found！！'
    }
  } catch (error) {
    ctx.body = 'Not Found！'
  }
})

app.listen(3000, () => {
  console.log(`server start port 3000`)
})
```

## 多语言 (accept-language)
```javascript
const http = require('http')
let languages = {
  en: {
      title: 'hello'
  },
  zh: {
      title: '欢迎'
  }
}

const str2Array = (str) => {
  return str.split(',').map(item => {
    const lan = item.split(';')
    return {
      name: lan[0],
      id: lan[1] && +lan[1].split('=')[1] || 1
    }
  }).sort((a, b) =>b.id - a.id)
}

const server = http.createServer((req, res) => {
  const langs = req.headers['accept-language']
  // zh-CN,zh;q=0.9,en;q=0.8
  if(!langs) return res.end('Not Found')
  const lanArray = str2Array(langs)
  let r = null
  for (const lan of lanArray) {
    if(languages[lan.name]) {
      r = languages[lan.name]
      break
    }
  }
  if(!r) {
    r = languages['en']
  }
  res.setHeader('Content-Type', 'application/json;charset=utf-8')
  res.end(JSON.stringify(r))
})
server.listen(3000, () => {
  console.log(`server start port 3000`)
})
```

# server
+ `server.js` 

```javascript
const http = require('http')
const url = require('url')
const path = require('path')
const querystring = require('querystring')
const server = http.createServer((request, response) => {
  const { pathname } = url.parse(request.url)
  const { method } = request

  //! 1.配置跨域
  response.setHeader('Access-Control-Allow-Origin', request.headers.origin || '*')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  response.setHeader('Content-Type', 'application/json;charset=utf-8;')
  response.setHeader('Access-Control-Max-Age', '1800')
  if(method === 'OPTIONS') {
    response.statusCode = 200
    response.end()
  }

  //! 2.解析请求体
  const arr = []
  request.on('data', (chunk) => {
    arr.push(chunk)
  })

  request.on('end', () => {
    const res = Buffer.concat(arr).toString()
    let obj = null
    if(method === 'POST') {
      if(request.headers['content-type'] === 'application/x-www-form-urlencoded') {
        obj = querystring.parse(res)
      } else if(request.headers['content-type'] === 'application/json') {
        obj = JSON.parse(res)
      }
      //! 3.路由
      if(pathname === '/login') {
        response.end(JSON.stringify(obj))
      } else if(pathname === '/reg') {
        console.log(obj)
        response.end(JSON.stringify(obj))
      }
    }
  })
})
server.listen(3000, () => {
  console.log(`server start port 3000`)
})
```

+ `client.js` 

```javascript
const http = require('http')
const querystring = require('querystring')
const postData = querystring.stringify({
  'username' : 'Hello World!'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头: ${JSON.stringify(res.headers)}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`响应主体: ${chunk}`);
  });
  res.on('end', () => {
    console.log('响应中已无数据。');
  });
});

req.on('error', (e) => {
  console.error(`请求遇到问题: ${e.message}`);
});

// 写入数据到请求主体
req.write(postData);
req.end();
```

+ `index.html` 

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <script src="./index.js"></script>
  <link rel="stylesheet" href="./index.css">
</head>
<body>
  this is page!
  <form action="http://localhost:3000/login" method="post">
    <input type="text" name="username" id="username">
    <input type="password" name="password" id="password">
    <input type="submit" value="登录">
  </form>
  <div><button id="btn">注册</button></div>
  <script>
    btn.addEventListener('click', () => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', 'http://localhost:3000/reg', true)
      xhr.setRequestHeader('Content-Type', 'application/json')
      xhr.responseType = 'json'
      xhr.send(JSON.stringify({ username: 'robin', password: '123456'}))
      xhr.onload = function() {
        console.log(typeof xhr.response)
      }
    })
  </script>
</body>
</html>
```

+ `index.js` 

```javascript
console.log(111)
```

+ `index.css` 

```css
body {
  color: red;
}
```

# g-http-server
[GitHub - lotosv2010/g-http-server: 仿 http-server](https://github.com/lotosv2010/g-http-server)

[g-http-server](https://www.npmjs.com/package/g-http-server)

