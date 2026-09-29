# <font style="color:rgb(51, 51, 51);">目标</font>
+ <font style="color:rgb(51, 51, 51);">学习如何获取专业权威的一手知识</font>
+ <font style="color:rgb(51, 51, 51);">学习如何阅读 </font>`<font style="color:rgb(51, 51, 51);">RFC</font>`<font style="color:rgb(51, 51, 51);"> 标准文档</font>
+ <font style="color:rgb(51, 51, 51);">学习扩展的巴科斯范式(ABNF)定义的通信协议语言</font>
+ <font style="color:rgb(51, 51, 51);">学习HTTP协议的实现和解析细节</font>

## <font style="color:rgb(51, 51, 51);">TCP/IP参考模型</font>
+ <font style="color:rgb(51, 51, 51);">TCP/IP协议被称为传输控制协议/互联网协议，又称网络通讯协议</font>

<!-- 这是一张图片，ocr 内容为：HTTPFTPTFTP 应用层 DNS SNMP SMTP UDP TCP 传输层 ICMPIGMP 网络层 ARP RARP 数据链路层 由底层网络定义的协议 物理层 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764579468142-dfbed2e9-c428-4bec-9949-13314c7b3dc4.png)

# <font style="color:rgb(51, 51, 51);">GET</font>
## 实战
### <font style="color:rgb(51, 51, 51);">请求响应格式</font>
+ <font style="color:rgb(51, 51, 51);">一个请求消息是从客户端到服务器端的,在消息首行里包含方法,资源指标符,协议版本</font>

```plain
Request=Request-Line;
*((general-header|request-header|entity-header)CRLF)
CRLF
[message-body]
```

#### <font style="color:rgb(51, 51, 51);">请求</font>
```http
GET /get HTTP/1.1
Host: 127.0.0.1:8080
Connection: keep-alive
name: zhufeng
age: 10
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36
Accept: */*
Accept-Encoding: gzip, deflate, br
Accept-Language: zh-CN,zh;q=0.9
```

<!-- 这是一张图片，ocr 内容为：IP.SRC : 127.0.0.1 AND IP.DST -- 127.0.0.1 AND HTTP TINE LENGTH INFO PROTOCOL NO. DESTINATION SOURCE 597 GET /GET.HTML HTTP/1.1 HTTP 101.364860 127.0.0.1 127.0.0.1 HTTP 750 HTTP/1.1 200 OK 121.365619 127.0.0.1 127.0.0.1 460 GET /GET HTTP/1.1 127.0.0.1 HTTP 18 1.381296 127.0.0.1 127.0.0.1 191 HTTP/1.1 200 OK HTTP 127.0.0.1 20 1.381647 526 GET /FAVICON.ICO HTTP/1.1 127.0.0.1 HTTP 221.388948 127.0.0.1 P 18: 458 BYTES ON WIRE (3680 BITS), 480 BYTES CAPTURED (3680 BITS) ON INTERFACE IPEVICE LOOBB 10 AD FRAME NULL/LOOPBACK INTERNET PROTOCOL VERSION 4, SRC: 127.0.0.1, DST: 127.0.0.1 TRANSMISSION CONTROL PROTOCOL, SRC PORT: 50726, DST PORT: 8080, SEQ:  S54, ACK: 707, LEN: 410 HYPERTEXT TRANSFER PROTOCOL GET /GET HTTP/1.1\R\N HOST:127.0.0.1:8080\R\N CONNECTION:KEEP-ALIVE\R\N NAME:ZHUFENG\R\N AGE:10\R|N 2 APPLEWEBKIT/537.36 (KHTML, LIKE GECKO) CHROME/84.0.4147.89 SAFARI/537.36\R\N USER-AGENT: MOZILLA/5.0 (WINDOWS NT 10.0; WIN64; X64) ACCEPT:*/*\R\N SEC-FETCH-SITE: SAME-ORIGIN\R\N SEC-FETCH-MODE:CORS\R\N SEC-FETCH-DEST:EMPTY\R\N REFERER:HTTP://127.0.0.1:8080/GET.HTML\R\N ACCEPT-ENCODING: GZIP, DEFLATE, BR\N ACCEPT-LANGUAGE:ZH-CN,ZH;Q-0.9\R\N IRIN -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764579468096-8b16523d-74b3-4cfd-a479-72e5ea3523fc.png)

#### <font style="color:rgb(51, 51, 51);">响应</font>
```plain
Response=Status-Line;
*((general-header|response-header|entity-header)CRLF)
CRLF
[message-body]
```

```http
HTTP/1.1 200 OK
Context-type: text-plain
Date: Fri, 14 Aug 2020 03:58:41 GMT
Connection: keep-alive
Transfer-Encoding: chunked

3
get
0
```

<!-- 这是一张图片，ocr 内容为：127.0.0.1 AND HTTP IP.SRC - 127.0.0.1 AND IP.DST 三三 INFO DESTINATION TIME NO. LENGTH PROTOCOL SOURCE 460 GET /GET HTTP/1.1 127.0.0.1 127.0.0.1 HTTP 18 1.381296  191 HTTP/1.1 200 OK HTTP 201.381647 127.0.0.1 127.0.0.1 127.0.0.1 127.0.0.1 221.388948 526 GET /FAVICON.ICO HTTP/1.1 HTTP 575 121.390154 526 GET /FAVICON.ICO HTTP/1.1 HTTP 127.0.0.1 127.0.0.1 147 TRANSMISSION CONTROL PROTOCOL, SRC PORT; 8030, DST PORT: 50726, SEQ: 707. ACK: 970: LEN: HYPERTEXT TRANSFER PROTOCOL HTTP/1.1 200 OK\R\N CONTEXT-TYPE: TEXT-PLAIN\R\N DATE: FRI, 14 AUG 2020 03:58:41 GMT\R TARIN CONNECTION: KEEP-ALIVE\R\N TRANSFER-ENCODING: CHUNKED\R\N IRLN [HTTP RESPONSE 2/3] [TIME SINCE REQUEST: 0.000351000 SECONDS] PREV REQUEST IN FRAME: 10] PREV RESPONSE IN FRAME: 121 [REQUEST IN FRAME:18 [NEXT REQUEST IN FRAME : 22] [REQUEST URI:HTTP://127.0.0.1:8080/GET] HTTP CHUNKED RESPONSE DATA CHUNK (3 OCTETS) CHUNK SIZE: 3 OCTETS DATA (3 BYTES) CHUNK BOUNDARY:ODOA END OF CHUNKED ENCODING .V.P. 18 27 F7 48 00 54 54 50 06 56 EA 50 HTTP 00 0020 AD AA /1.1 200 4B PO 32 OK?CON OA 0030 4F 30 6E 2F 31 2E 31 20 20 61 B0 43 74 0040 74 2D 746578742D 78 TEXT-TYP E:TEXT- 79元 65 74 55 20 BA 74 20 65 PO 706C61696E PLAINDATE:FRI 0050 467269 3A OA 61 1/ 32 30 32 30 20 30 33 , 14 AUG 20 03 2C 20 31 34 0060 20 41 79 20 :58:41 G MT CONN 540D OA 3A3538 0070 31 34 3A PT 6T 6E 6E 47 55702D616669 656374696F6E ECTION:KEEP-ALI 6B 65 0080 20 6E 3A 76650D 0A 72 73 VE TRAN SFER-ENC 54 665722D456E63 0090 61 6E 6F 64 69 6E ODING: C HUNKED. 37566B65640D0A 68 BA 67 20 00AO 63 OD 0A 33 0D OD OA 30 0A  OD OA 67 OA 6574 00BO 3 GET O -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764579468572-45a1dd1e-8769-4a07-ac2a-6bc7810b01fd.png)

## <font style="color:rgb(51, 51, 51);">使用</font>
### <font style="color:rgb(51, 51, 51);">http-server</font>
```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');
const server = http.createServer(function(req,res){
  if(['/get.html'].includes(req.url)){
    res.writeHead(200,{'Context-type':"text-html"});
    res.end(fs.readFileSync(path.join(__dirname,'static',req.url.slice(1))));
  }else if(req.url === '/get'){
    res.writeHead(200,{'Context-type':"text-plain"});
    res.end('get');
  }
});
server.listen(8080);
```

### <font style="color:rgb(51, 51, 51);">html</font>
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>get</title>
  </head>
  <body>
    <script>
      let xhr = new XMLHttpRequest();
      xhr.onreadystatechange = ()=>{
        console.log('onreadystatechange',xhr.readyState);
      }
      xhr.open("GET", "http://127.0.0.1:8080/get");
      xhr.responseType="text";
      xhr.setRequestHeader('name', 'zhufeng');
      xhr.setRequestHeader('age', '10');
      xhr.onload = () => {
        console.log('readyState',xhr.readyState);
        console.log('status',xhr.status);
        console.log('statusText',xhr.statusText);
        console.log('getAllResponseHeaders',xhr.getAllResponseHeaders());
        console.log('response',xhr.response);
      };
      xhr.send();
    </script>
  </body>
</html>
```

## <font style="color:rgb(51, 51, 51);">实现</font>
### <font style="color:rgb(51, 51, 51);">tcp-get-client</font>
+ [XMLHttpRequest.readyState - Web API | MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/readyState)
+ <font style="color:rgb(51, 51, 51);">tcp-get-client.js</font>

```javascript
let net = require('net');
const ReadyState = {
  UNSENT:0,//（代理被创建，但尚未调用 open() 方法。
  OPENED:1,//open() 方法已经被调用
  HEADERS_RECEIVED:2,//send() 方法已经被调用，并且头部和状态已经可获得。
  LOADING:3,//（交互）正在解析响应内容
  DONE:4 //（完成）响应内容解析完成，可以在客户端调用了
}
class XMLHttpRequest {
  constructor(){
    this.readyState = ReadyState.UNSENT;
    this.headers = {};
  }
  open(method, url) {
    this.method = method||'GET';
    this.url = url;
    let {hostname,port,path} = require('url').parse(url);
    this.hostname = hostname;
    this.port = port;
    this.path = path;
    this.headers.Host=`${hostname}:${port}`;
    const socket = this.socket =  net.createConnection({port: this.port,hostname:this.hostname},()=>{
      socket.on('data', (data) => {
        data = data.toString();
        let [response,bodyRows] = data.split('\r\n\r\n');
        let [statusLine,...headerRows] = response.split('\r\n');
        let [,status,statusText] = statusLine.split(' ');
        this.status = status;
        this.statusText = statusText;
        this.responseHeaders = headerRows.reduce((memo,row)=>{
          let [key,value] = row.split(': ');
          memo[key]= value;
          return memo;
        },{});
        this.readyState = ReadyState.HEADERS_RECEIVED;
        xhr.onreadystatechange&&xhr.onreadystatechange();
        this.readyState = ReadyState.LOADING;
        xhr.onreadystatechange&&xhr.onreadystatechange();
        let [,body,] = bodyRows.split('\r\n');
        this.response = this.responseText = body;
        this.readyState = ReadyState.DONE;
        xhr.onreadystatechange&&xhr.onreadystatechange();
        this.onload&&this.onload();
      });
      socket.on('error', (err) => {
        this.onerror&&this.onerror(err);
      });
    });
    this.readyState = ReadyState.OPENED;
    xhr.onreadystatechange&&xhr.onreadystatechange();
  }
  getAllResponseHeaders(){
    let allResponseHeaders='';
    for(let key in this.responseHeaders){
      allResponseHeaders+=`${key}: ${this.responseHeaders[key]}\r\n`;
    }
    return allResponseHeaders;
  }
  setRequestHeader(header,value){
    this.headers[header]= value;
  }
  send() {
    let rows = [];
    rows.push(`${this.method} ${this.path} HTTP/1.1`);
    rows.push(...Object.keys(this.headers).map(key=>`${key}: ${this.headers[key]}`));
    this.socket.write(rows.join('\r\n')+'\r\n\r\n');
  }
}

let xhr = new XMLHttpRequest();
xhr.onreadystatechange = ()=>{
  console.log('onreadystatechange',xhr.readyState);
}
xhr.open("GET", "http://127.0.0.1:8080/get");
xhr.responseType="text";
xhr.setRequestHeader('name', 'zhufeng');
xhr.setRequestHeader('age', '10');
xhr.onload = () => {
  console.log('readyState',xhr.readyState);
    console.log('status',xhr.status);
    console.log('statusText',xhr.statusText);
    console.log('getAllResponseHeaders',xhr.getAllResponseHeaders());
    console.log('response',xhr.response);
};
xhr.send();
```

### <font style="color:rgb(51, 51, 51);">tcp-get-sever</font>
```javascript
const net = require('net');
const server = net.createServer((socket) => {
  socket.on('data',(data)=>{
    let request = data.toString();
    let [requestLine,...headerRows] = request.split('\r\n');
    let [method,path] = requestLine.split(' ');
    let headers = headerRows.slice(0,-2).reduce((memo,row)=>{
      let [key,value] = row.split(': ');
      memo[key] = value;
      return memo;
    },{});
    console.log('method',method);
    console.log('path',path);
    console.log('headers',headers);

    let rows = [];
    rows.push(`HTTP/1.1 200 OK`);
    rows.push(`Context-type: text-plain`);
    rows.push(`Date: ${new Date().toGMTString()}`);
    rows.push(`Connection: keep-alive`);
    rows.push(`Transfer-Encoding: chunked`);
    let responseBody = 'get';
    rows.push(`\r\n${Buffer.byteLength(responseBody).toString(16)}\r\n${responseBody}\r\n0`);
    let response = rows.join('\r\n');
    socket.end(response);
  });
})
server.on('error', (err) => {
  console.error(err);
});

server.listen(8080,() => {
  console.log('服务器已经启动', server.address());
});
```

# <font style="color:rgb(51, 51, 51);">POST方法</font>
## <font style="color:rgb(51, 51, 51);">实战</font>
### <font style="color:rgb(51, 51, 51);">请求和响应</font>
#### <font style="color:rgb(51, 51, 51);">请求</font>
<!-- 这是一张图片，ocr 内容为：LIP.SRC 127.0.0.1 AND IP.DST : 127.0.0.0.1 AND HTTP LENGTH INFO PROTOCOL NO. DESTINATION TINE 638 123.702946 127.0.0.1 127.0.0.1 158 POST /POST HTTP/1.1 HTTP 44 HTTP/1.1 400 BAD REQUEST 642 123.703325 127.0.0.1 HTTP 127.0.0.1 178 POST /POST HTTP/1.1 (APPLICATION/JSON) 127.0.0.1 713 137.447737 HTTP 127.0.0.1 ' FRANE 259; 535 BVTES ON MIRE (A380 SITS), 535 BYTES CAPTURED (4380 BITS) ON INTERFARFARE LOORBACK,  NULL/LOOPBACK INTERNET PROTOCOL VERSION 4, SRC: 127.0.0.1, DST: 127.0.0.0.1 TRANSMISSION CONTROL PROTOCOL, SRC PORT; 56051, DST PORT; 8089, SEQ: 555, 555, 1057, LEN; LEN; 4931 HYPERTEXT TRANSFER PROTOCOL POST /POST HTTP/1.1\R\N HOST:127.0.0.1:8080\R\N CONNECTION:KEEP-ALIVE/R/N CONTENT-LENGTH:13\R\N CONTENT-TYPE:APPLICATION/JSON/R\N ACCEPT:*/*\R\N ORIGIN:HTTP://127.0.0.1:8080/R\N SEC-FETCH-SITE: SAME-ORIGIN\R\N SEC-FETCH-MODE: CORS\R\N SEC-FETCH-DEST:EMPTY\R\N REFERER:HTTP://127.0.0.1:8080/POST.HTML\R\N ACCEPT-ENCODING: GZIP, DEFLATE, BR\R\N ACCEPT-LANGUAGE: ZH-CN,ZH;Q-0.9\R\N IRIN [FULL REQUEST URI:HTTP://127.0.0.1:8080/POSTL [HTTP REQUEST 2/3] PREV REQUEST IN FRAME: 251L RESPONSE IN FRAME: 2611 [NEXT REQUEST IN FRAME: 263L FILE DATA: 13 BYTES JAVASCRIPT OBJECT NOTATION:APPLICATION/JSON 2F 2A 0D OA 6E 0D 0A 41 63 65 70 74 3A 20 2A 2A 28 28 N.ACCEP T:*/*. 0120 2F 2F HTTP://1 4F 72 69 69 6E 3A 20 ORIGIN: 0130 3A 68747470 OP 30 32 37 2E 30 2E 30 2E 31 0A 38 3A3830 :8080 27.0.0.1 0140 20 -SITE: 65632D4665746368 74 2D  5369 0150 EC-FETCH 58 69 61 6D 65 2D 69 67 INSEC 2D 6EOD 0160 AME-OR1G 73 65 3A 46657463668 2D 4D 6F 20 64 DE:CORS 0170 FETCH-MO D 73 2D 44 74 OD 0A 53 63 2D 46 65 SEC-FE TCH-DEST 68 0180 7463 65 72 3A20656D7074790D 0190 0A 52 65 EMPTY REFERER HTTP://127.0.0 2F 31 32 37 2E 30 2E 30 3A 20 68 74 74 70 3A 2F 01A0 1:8080/ POST.HTM 70 6F 73 74 6D 74 2E 68 2E 31 3A 38 30 38 30 2F 01B0 74 2D 45 1 ACCEP T-ENCODI 6E636F6469 6C0D0A163636570 01C0 66 65 6C 61 74 2C 20 64 6E673A20677A6970 01D0 NG: GZIP , DEFLAT 70 74 2D 4C 61 636365 65 2C 20 62 0A 41 01E0 E, BR A CCEPT-LA D 43 4E 2C 7A 68 01F0 6E67756167653A20 7A682D4 NGUAGE:ZH-CN,ZH 3B 71 3D 30 2E 39 0D 0A OD 0A 7B 22 0200 26E616D 65 JQ-0.9--1"NAME 22 3A 22 7A 66 22 7D ":"ZF"} 0210 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764579468311-46960943-b229-4697-92d8-0e7a6ddb9648.png)

#### <font style="color:rgb(51, 51, 51);">响应</font>
<!-- 这是一张图片，ocr 内容为：127.0.0.1 715 137,452195 200   K 127.0.0.1 201 HTTP/1.1 HTTP IN WIRE (1608 BITS), 281 BYTES CAPTURED (1608 BITS) ON INTERFACE (PEVICEWPF LOOPBACK, ID O FRAME 715: 201 BYTES ON W NULL/LOOPBACK INTERNET PROTOCOL VERSION 4, SRC: 127.0.0.1, DST: 127.0.0.0.1 TRANSMISSION CONTROL PROTOCOL, SRC PORT; 8080, DST PORT: S610Z, SEQ: 1, ACK: 135, LEN: LEN: 157 HYPERTEXT TRANSFER PROTOCOL HTTP/1.1 200 OK\R\N CONTEXT-TYPE:TEXT-PLAIN\R\N DATE:FRI, 14 AUG 2020 07:36:45 GMT\R\N CONNECTION:KEEP-ALIVE\R\N TRANSFER-ENCODING: CHUNKED\R\N IR IN P RESPONSE 1/1] THTTP I [TIME SINCE REQUEST: 0.004458000 SECONDS] REQUEST IN FRAME:713] [REQUEST URI:HTTP://127.0.0.1:8080/POST] HTTP CHUNKED ED RESPONSE FILE DATA: 13 BYTES DATA (13 BYTES) DATA: 7B226E616D65223A227A66227D [LENGTH: 13] 0200000450000C5 @.@ 0000 004006000 40 E 5A E9 1F 90 DB 26 8 B7 B1 79 FC 7F000017F000001 0010 9E 12 41 2A 50 18 27 F9 P\?HTTP 705C000048545450 ?A*P 0020 2F 31 2E 31 20 30 30 204F 4B 0A 43 6F 6E OK?CON /1.1 200 0030 653A20746578742D 746578742D74747970 E: TEXT- 0040 TEXT-TYP 706C61696EOD0A44 6174653A20467269 PLAIND 0050 ATE: FRI 2C 20 31 34 20 41 75 67 20 32 30 30 20 30 37 14 AUG 202007 0060 3A 33 36 3A 34 35 20 47 :36:45 G 4D 54 OD 0A 43 6E 6E MT?CONN 0070 656374696F KEEP-ALI 6B6565702D616C69 ECTION: 3A 20 0080 6E 72 616E 736665722D456E63 76650D0A 54 0090 VE TRAN SFER-ENC 68756E6B65640D0A HUNKED? 3A 20 63 6F6469 ODING: 67 00A0 96E 61 6D 65 22 3A 22 7A 66 OD 0A 64 0A 7B 22  6  D'{"N AME":"ZF 00BO I.. 227DODOA30300DOAOD OA OOCO -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764579468393-d00a0b7a-60a0-474b-8da8-a534f487858d.png)

## 使用
### <font style="color:rgb(51, 51, 51);">http-server</font>
```diff
const http = require('http');
const fs = require('fs');
const path = require('path');
const server = http.createServer(function(req,res){
+  if(['/get.html','/post.html'].includes(req.url)){
    res.writeHead(200,{'Context-type':"text-html"});
    res.end(fs.readFileSync(path.join(__dirname,'static',req.url.slice(1))));
  }else if(req.url === '/get'){
    res.writeHead(200,{'Context-type':"text-plain"});
    res.end('get');
+  }else if(req.url === '/post'){
+    let buffers = [];
+    req.on('data',(data)=>{
+      buffers.push(data);
+    });
+    req.on('end',()=>{
+      console.log('method',req.method);
+      console.log('url',req.url);
+      console.log('headers',req.headers);
+      let body = Buffer.concat(buffers);
+      console.log('body',body.toString());
+      res.statusCode = 200;
+      res.setHeader('Context-type',"text-plain");
+      res.write(body);
+      res.end();
+    });
  }
});
server.listen(8080);
```

### <font style="color:rgb(51, 51, 51);">html</font>
```diff
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>get</title>
</head>
<body>
    <script>
        let xhr = new XMLHttpRequest();
        xhr.onreadystatechange = ()=>{
            console.log('onreadystatechange',xhr.readyState);
        }
+        xhr.open("POST", "http://127.0.0.1:8080/post");
        xhr.responseType="text";
+        xhr.setRequestHeader('Content-Type','application/json');
        xhr.onload = () => {
            console.log('readyState',xhr.readyState);
            console.log('status',xhr.status);
            console.log('statusText',xhr.statusText);
            console.log('getAllResponseHeaders',xhr.getAllResponseHeaders());
            console.log('response',xhr.response);
        };
+        xhr.send(JSON.stringify({name:'zhufeng',age:10}));
     </script>
</body>
</html>
```

## <font style="color:rgb(51, 51, 51);">实现</font>
### <font style="color:rgb(51, 51, 51);">tcp-post-client</font>
```diff
let net = require('net');
const ReadyState = {
    UNSENT:0,//（代理被创建，但尚未调用 open() 方法。
    OPENED:1,//open() 方法已经被调用
    HEADERS_RECEIVED:2,//send() 方法已经被调用，并且头部和状态已经可获得。
    LOADING:3,//（交互）正在解析响应内容
    DONE:4 //（完成）响应内容解析完成，可以在客户端调用了
}
class XMLHttpRequest {
    constructor(){
        this.readyState = ReadyState.UNSENT;
        this.headers = {};
    }
    open(method, url) {
        this.method = method||'GET';
        this.url = url;
        let {hostname,port,path} = require('url').parse(url);
        this.hostname = hostname;
        this.port = port;
        this.path = path;
        this.headers.Host=`${hostname}:${port}`;
+       this.headers.Connection=`keep-alive`;
        const socket = this.socket =  net.createConnection({port: this.port,hostname:this.hostname},()=>{
            socket.on('data', (data) => {
                data = data.toString();
                console.log(data);
                let [response,bodyRows] = data.split('\r\n\r\n');
                let [statusLine,...headerRows] = response.split('\r\n');
                let [,status,statusText] = statusLine.split(' ');
                this.status = status;
                this.statusText = statusText;
                this.responseHeaders = headerRows.reduce((memo,row)=>{
                    let [key,value] = row.split(': ');
                    memo[key]= value;
                    return memo;
                },{});
                this.readyState = ReadyState.HEADERS_RECEIVED;
                xhr.onreadystatechange&&xhr.onreadystatechange();
                this.readyState = ReadyState.LOADING;
                xhr.onreadystatechange&&xhr.onreadystatechange();
                let [,body,] = bodyRows.split('\r\n');
                this.response = this.responseText = body;
                this.readyState = ReadyState.DONE;
                xhr.onreadystatechange&&xhr.onreadystatechange();
                this.onload&&this.onload();
            });
            socket.on('error', (err) => {
                this.onerror&&this.onerror(err);
            });
         });
         this.readyState = ReadyState.OPENED;
         xhr.onreadystatechange&&xhr.onreadystatechange();
    }
    getAllResponseHeaders(){
        let allResponseHeaders='';
        for(let key in this.responseHeaders){
            allResponseHeaders+=`${key}: ${this.responseHeaders[key]}\r\n`;
        }
        return allResponseHeaders;
    }
    setRequestHeader(header,value){
        this.headers[header]= value;
    }
    send(body) {
        let rows = [];
        rows.push(`${this.method} ${this.path} HTTP/1.1`);
+       this.headers["Content-Length"]=Buffer.byteLength(body);
        rows.push(...Object.keys(this.headers).map(key=>`${key}: ${this.headers[key]}`));
+       let request = rows.join('\r\n')+'\r\n\r\n'+body;
        console.log(request);
        this.socket.write(request);
    }
}

let xhr = new XMLHttpRequest();
xhr.onreadystatechange = ()=>{
    console.log('onreadystatechange',xhr.readyState);
}
xhr.open("POST", "http://127.0.0.1:8080/post");
xhr.responseType="text";
xhr.setRequestHeader('Content-Type','application/json');
xhr.onload = () => {
    console.log('readyState',xhr.readyState);
    console.log('status',xhr.status);
    console.log('statusText',xhr.statusText);
    console.log('getAllResponseHeaders',xhr.getAllResponseHeaders());
    console.log('response',xhr.response);
};
xhr.send(`{"name":"zf"}`);
```

### <font style="color:rgb(51, 51, 51);">tcp-post-server</font>
```diff
const net = require('net');
const Parer = require('./Parser');
const server = net.createServer((socket) => {
  socket.on('data',(data)=>{
+   let parser = new Parer();
+   let {method,url,headers,body} = parser.parse(data);
+   console.log('method',method);
+   console.log('url',url);
+   console.log('headers',headers);
+   console.log('body',body);
    let rows = [];
    rows.push(`HTTP/1.1 200 OK`);
    rows.push(`Context-type: text-plain`);
    rows.push(`Date: ${new Date().toGMTString()}`);
    rows.push(`Connection: keep-alive`);
    rows.push(`Transfer-Encoding: chunked`);
    rows.push(`\r\n${Buffer.byteLength(body).toString(16)}\r\n${body}\r\n0`);
    let response = rows.join('\r\n');
    socket.end(response);
  });
})
server.on('error', (err) => {
  console.error(err);
});

server.listen(8080,() => {
  console.log('服务器已经启动', server.address());
});
```

### <font style="color:rgb(51, 51, 51);">Parser.js</font>
```javascript
let LF = 10,//换行  line feed
  CR = 13,//回车 carriage return
  SPACE = 32,//空格
  COLON = 58;//冒号
let PARSER_UNINITIALIZED=0,//未解析
  START=1,//开始解析
  REQUEST_LINE=2,
  HEADER_FIELD_START=3,
  HEADER_FIELD=4,
  HEADER_VALUE_START=5,
  HEADER_VALUE=6,
  READING_BODY=7;
class Parser {
  constructor(){
    this.state = PARSER_UNINITIALIZED;
  }
  parse(buffer) {
    let self =this,
      requestLine='',
      headers = {},
      body='',
      i=0,
      char,
      state = START,//开始解析
      headerField='',
      headerValue='';
    console.log(buffer.toString());
    for (i = 0; i < buffer.length; i++) {
      char = buffer[i];
      switch (state) {
        case START:
          state = REQUEST_LINE;
          self['requestLineMark']=i;
        case REQUEST_LINE:
          if (char == CR) {//换行
            requestLine=buffer.toString('utf8', self['requestLineMark'], i);
            break;
          }else if(char == LF){//回车
            state = HEADER_FIELD_START;
          }
          break;
        case HEADER_FIELD_START:
          if(char === CR){
            state = READING_BODY;
            self['bodyMark'] = i+2;
            break;
          }else{
            state = HEADER_FIELD;
            self['headerFieldMark'] = i;
          }
        case HEADER_FIELD:   
          if (char == COLON) {
            headerField=buffer.toString('utf8', self['headerFieldMark'], i);
            state = HEADER_VALUE_START;
          }
          break;
        case HEADER_VALUE_START:
          if (char == SPACE) {
            break;
          }
          self['headerValueMark'] = i;
          state = HEADER_VALUE;
        case HEADER_VALUE:
          if (char === CR) {
            headerValue=buffer.toString('utf8', self['headerValueMark'], i);
            headers[headerField] = headerValue;
            headerField = '';
            headerValue = '';
          }else if(char === LF){
            state = HEADER_FIELD_START;
          }
          break;
        default:
          break;    
      }
    }
    let [method,url] =requestLine.split(' ');
    body=buffer.toString('utf8', self['bodyMark'], i);
    return {method,url,headers,body};
  }
}
module.exports = Parser;
```

# <font style="color:rgb(51, 51, 51);">文件上传</font>
## <font style="color:rgb(51, 51, 51);">实战</font>
### <font style="color:rgb(51, 51, 51);">请求和响应</font>
#### <font style="color:rgb(51, 51, 51);">请求</font>
<!-- 这是一张图片，ocr 内容为：HTTP TIME LENGTH INFO DESTINATION PROTOCOL SOURCE NO. 354 POST /UPLOAD HTTP/1.1 (TEXT/PLAIN) 5615 1232.823955 HTTP ::1 :1 POST /UPLOAD HTTP/1.1\R\N HOST:LOCALHOST:8080/R\N CONNECTION:KEEP-ALIVE\R\N CONTENT-LENGTH:290\R\N CONTENT-TYPE; MULTIPART/FORM-DATA; BOUNDARY------MEBKITFORMBOUNDARYNAADRBGIVIJDPWSIR\N ACCEPT:*/*/R\N ORIGIN:HTTP://LOCALHOST:8080\R\N SEC-FETCH-SITE:SAME-ORIGIN\R\N SEC-FETCH-MODE:CORS\R\N SEC-FETCH-DEST:EMPTY\R\N REFERER: HTTP://LOCALHOST:8080/UPLOAD.HTML?\R\N ACCEPT-ENCODING: GZIP, DEFLATE, BR\N ACCEPT-LANGUAGE:ZH-CN,ZH;Q-0.9\R\N IRIN [FULL REQUEST URI: HTTP://LOCALHOST:8080/UPLOAD] [HTTP REQUEST 1/1] [RESPONSE IN FRAME:5783] FILE DATA: 290 BYTES [MINE MULTEPART NEDIN ENCAPSULATION, TYPE; MULTIPART/FORM-DATA, BOUNDARY: "----- THEBKITHARBARBARBAS" [TYPE:MULTIPART/FORM-DATA] -WEBKITFORMBOUNDARYMA4DRBGIVIJDDPWS\R\N FIRST BOUNDARY: ENCAPSULATED MULTIPART ART PART: CONTENT-DISPOSITION: FORM-DATA; NAME-"USERNAME"\R\N\R\N DATA (7 BYTES) --WEBKITFORMBOUNDARYMA4DRBGIVIJDDPWS\R\N BOUNDARY: \R\N------W ENCAPSULATED MULTIPART PART:(TEXT/PLAIN) CONTENT-DISPOSITION: FORM-DATA; NAME-"AVATAR"; FILENAME:"FILE.TXT"\R\N CONTENT-TYPE:TEXT/PLAIN\R\N\R\N > LINE-BASED TEXT DATA: TEXT/PLAIN (1 LINES) LAST BOUNDARY:\R\N------WEBKITFORMBOUNDARYMA4DRBGIVIJDDPWS--IR\N OD OA 2D 2D ZHU FENG 220D0AOD0A7A68756666 0270 56E67 0280 4B974466F726D426F 2D 2D 2D 5765624B WEBK ITFORMBO -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764579469468-5e28e340-9b4e-426e-87d5-e3d69be3107d.png)

#### <font style="color:rgb(51, 51, 51);">响应</font>
<!-- 这是一张图片，ocr 内容为： 181 11.315331 210 HTTP/1.1 200 OK ::1 HTTP :1 30 BITS) ON INTERFACE \DEVICE\NPF LOOPBACK, ID O FRAME 181: 210 BYTES ON WIRE (1680 BITS), 210 BYTES CAPTURED (1680 BITE NULL/LOOPBACK INTERNET PROTOCOL VERSION 6, SRC:::1, DST::::1 TRANSMISSION CONTROL PROTOCOL, SRC PORT: 8080, DST PORT: S1990, SEQ: I.  ACK: 821, LEN; 1469 Y HYPERTEXT TRANSFER PROTOCOL HTTP/1.1 200 OK\R\N CONTEXT-TYPE:TEXT-PLAIN\R\N DATE: SAT, 15 AUG 2020 01:28:44 GMT\R\N CONNECTION:KEEP-ALIVE\R\N TRANSFER-ENCODING:CHUNKED\R\N IRIN [HTTP RESPONSE 1/1] [TIME SINCE REQUEST: 8.242493000 SECONDS] [REQUEST IN FRAME: 21] [REQUEST URI:HTTP://LOCALHOST:8080/UPLOAD] HTTP CHUNKED RESPONSE DATA CHUNK (2 OCTETS) CHUNK SIZE: 2 OCTETS DATA (2 BYTES) CHUNK BOUNDARY:ODOA ENCODING CHUNKED END OF CHUNK SIZE: O OCTETS IRIN FILE DATA: 2 BYTES DATA(2 BYTES) DATA:6F6B [LENGTH: 2] 6F 6B 0000 OK -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764579469639-5d81cdc2-cf13-451a-b122-9e06884a662a.png)

## 使用
### <font style="color:rgb(51, 51, 51);">http-server</font>
```diff
const http = require('http');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const url = require('url');
const server = http.createServer(function(req,res){
  const {pathname} = url.parse(req.url);
  if(['/get.html','/post.html','/upload.html'].includes(pathname)){
    res.writeHead(200,{'Context-type':"text-html"});
    res.end(fs.readFileSync(path.join(__dirname,'static',pathname.slice(1))));
  }else if(pathname === '/get'){
    res.writeHead(200,{'Context-type':"text-plain"});
    res.end('get');
  }else if(pathname === '/post'){
    let buffers = [];
    req.on('data',(data)=>{
      buffers.push(data);
    });
    req.on('end',()=>{
      console.log('method',req.method);
      console.log('url',req.url);
      console.log('headers',req.headers);
      let body = Buffer.concat(buffers);
      console.log('body',body.toString());
      res.statusCode = 200;
      res.setHeader('Context-type',"text-plain");
      res.write(body);
      res.end();
    });
  }else if(req.url === '/upload'){
+    const form = formidable();
+    form.parse(req, (err, fields, files) => {
+      console.log('fields',fields);
+      console.log('files',files);
+      let avatar = files.avatar;
+      let filePath = path.join(__dirname,'static',avatar.name);
+      fs.writeFileSync(filePath,fs.readFileSync(avatar.path));
+      res.statusCode = 200;
+      res.setHeader('Context-type',"text-plain");
+      res.write(JSON.stringify({...fields,avatar:filePath}));
+      res.end();
+    });
  }else{
    res.statusCode = 404;
    res.end();
  }
});
server.listen(8080);
```

### <font style="color:rgb(51, 51, 51);">html</font>
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>get</title>
</head>
<body>
    <form onsubmit="upload(event)">
        <input type="text" id="username"/>
        <input type="file" id="file"/>
        <input type="submit"/>
    </form>
    <script>
       function upload(event){
        event.preventDefault();
        let username= document.getElementById('username').value;
        let file= document.getElementById('file').files[0];
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "http://localhost:8080/upload");
        var formData=new FormData();
        formData.append("username",username);
        formData.append("file",file);
        xhr.responseType="text";
        xhr.onload = () => {
            console.log(xhr.response);
        };
        xhr.send(formData);
       }
     </script>
</body>
</html>
```

## 实现
### <font style="color:rgb(51, 51, 51);">tcp-upload-client</font>
```diff
let net = require('net');
let fs = require('fs');
let path = require('path');
const ReadyState = {
    UNSENT:0,//（代理被创建，但尚未调用 open() 方法。
    OPENED:1,//open() 方法已经被调用
    HEADERS_RECEIVED:2,//send() 方法已经被调用，并且头部和状态已经可获得。
    LOADING:3,//（交互）正在解析响应内容
    DONE:4 //（完成）响应内容解析完成，可以在客户端调用了
}
class XMLHttpRequest {
    constructor(){
        this.readyState = ReadyState.UNSENT;
        this.headers = {};
    }
    open(method, url) {
        this.method = method||'GET';
        this.url = url;
        let {hostname,port,path} = require('url').parse(url);
        this.hostname = hostname;
        this.port = port;
        this.path = path;
        this.headers.Host=`${hostname}:${port}`;
        this.headers.Connection=`keep-alive`;
        const socket = this.socket =  net.createConnection({port: this.port,hostname:this.hostname},()=>{
            socket.on('data', (data) => {
                data = data.toString();
                console.log(data);
                let [response,bodyRows] = data.split('\r\n\r\n');
                let [statusLine,...headerRows] = response.split('\r\n');
                let [,status,statusText] = statusLine.split(' ');
                this.status = status;
                this.statusText = statusText;
                this.responseHeaders = headerRows.reduce((memo,row)=>{
                    let [key,value] = row.split(': ');
                    memo[key]= value;
                    return memo;
                },{});
                this.readyState = ReadyState.HEADERS_RECEIVED;
                xhr.onreadystatechange&&xhr.onreadystatechange();
                this.readyState = ReadyState.LOADING;
                xhr.onreadystatechange&&xhr.onreadystatechange();
                let [,body,] = bodyRows.split('\r\n');
                this.response = this.responseText = body;
                this.readyState = ReadyState.DONE;
                xhr.onreadystatechange&&xhr.onreadystatechange();
                this.onload&&this.onload();
            });
            socket.on('error', (err) => {
                this.onerror&&this.onerror(err);
            });
         });
         this.readyState = ReadyState.OPENED;
         xhr.onreadystatechange&&xhr.onreadystatechange();
    }
    getAllResponseHeaders(){
        let allResponseHeaders='';
        for(let key in this.responseHeaders){
            allResponseHeaders+=`${key}: ${this.responseHeaders[key]}\r\n`;
        }
        return allResponseHeaders;
    }
    setRequestHeader(header,value){
        this.headers[header]= value;
    }
+    send(formData) {
+        let rows = [];
+        let boundary = '----WebKitFormBoundaryF5odcsAPqFAB2mkm';
+        this.headers['Content-Type']= `multipart/form-data; boundary=${boundary}`;
+        let parts = [];
+        for(let key in formData){
+            let value = formData[key];
+            if(typeof value === 'string'){
+                let rows = [];
+                rows.push(`Content-Disposition: form-data; name="${key}"\r\n`);
+                rows.push(value);
+                parts.push(rows.join('\r\n'));
+            }else{
+                let rows = [];
+                rows.push(`Content-Disposition: form-data; name="${value.name}"; filename="${value.filename}"`);
+                rows.push(`Content-Type: ${value.contentType}\r\n`);
+                rows.push(value.content);
+                parts.push(rows.join('\r\n'));
+            }
+        }
+        let body = parts.join('\r\n'+'--'+boundary+'\r\n');
+        body = '--'+boundary+'\r\n'+body+'\r\n--'+boundary+'--';
+        this.headers["Content-Length"]=Buffer.byteLength(body);
+        rows.push(`${this.method} ${this.path} HTTP/1.1`);
+        rows.push(...Object.keys(this.headers).map(key=>`${key}: ${this.headers[key]}`));
+        let request = rows.join('\r\n');
+        request += '\r\n\r\n';
+        let buffers = [Buffer.from(request)];
+        buffers.push(Buffer.from(body));
+        this.socket.write(Buffer.concat(buffers));
    }
}
+class FormData{
+    append(key,value){
+        this[key]=value;
+    }
+}
let xhr = new XMLHttpRequest();
xhr.onreadystatechange = ()=>{
    console.log('onreadystatechange',xhr.readyState);
}
+xhr.open("POST", "http://127.0.0.1:8080/upload");
xhr.responseType="text";
+let formData=new FormData();
+formData.append("username",'zhufeng');
+let file = fs.readFileSync(path.join(__dirname,'file.txt'));
+formData.append("avatar",{name:'file',filename:'file.txt',contentType:'text/plain',content:file});
xhr.onload = () => {
    console.log('readyState',xhr.readyState);
    console.log('status',xhr.status);
    console.log('statusText',xhr.statusText);
    console.log('getAllResponseHeaders',xhr.getAllResponseHeaders());
    console.log('response',xhr.response);
};
+xhr.send(formData);
```

### <font style="color:rgb(51, 51, 51);">tcp-upload-server</font>
```diff
const net = require('net');
const path = require('path');
const fs = require('fs');
const Parer = require('./Parser');
const server = net.createServer((socket) => {
  socket.on('data',(data)=>{
    let parser = new Parer();
    let {method,url,headers,body} = parser.parse(data);
    console.log('method',method);
    console.log('url',url);
    console.log('headers',headers);
    console.log('body',body);
+    let [,boundary] = headers['Content-Type'].match(/boundary=([^;]+)/i);
+    let parts = body.split('--'+boundary).slice(1,-1);
+    parts= parts.map(item=>item.slice(2,-2));
+    let fields = {};
+    let files = {};
+    for(let i=0;i<parts.length;i++){
+      let part = parts[i];
+      let rows = part.split('\r\n');
+      if(rows.length==3){
+        let [key,,value] = rows;
+        let [,name] = key.toString().match(/name="([^"]+?)"/);
+        fields[name]= value.toString();
+      }else if(rows.length==4){
+        let [key,type,,value] = rows;
+        let [,name,filename] = key.toString().match(/name="([^"]+?)"; filename="([^"]+?)"/);
+        let filePath = path.join(__dirname,'static',filename);
+        fs.writeFileSync(filePath,value);
+        files[name]={name,filename,path:filePath};
+      }
+    }
+    console.log(fields);
+    console.log(files);
    let rows = [];
    rows.push(`HTTP/1.1 200 OK`);
    rows.push(`Context-type: text-plain`);
    rows.push(`Date: ${new Date().toGMTString()}`);
    rows.push(`Connection: keep-alive`);
    rows.push(`Transfer-Encoding: chunked`);
+    let responseBody = JSON.stringify({...fields,...files});
+    rows.push(`\r\n${Buffer.byteLength(responseBody).toString(16)}\r\n${responseBody}\r\n0`);
    let response = rows.join('\r\n');
    socket.end(response);
  });
})
server.on('error', (err) => {
  console.error(err);
});

server.listen(8080,() => {
  console.log('服务器已经启动', server.address());
});
```



