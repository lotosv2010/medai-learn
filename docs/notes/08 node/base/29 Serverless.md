# <font style="color:rgb(51, 51, 51);">Serverless</font>
## <font style="color:rgb(51, 51, 51);">Serverless是什么？</font>
+ <font style="color:rgb(51, 51, 51);">无服务器架构几乎封装了所有底层资源管理和系统运维工作</font>
+ <font style="color:rgb(51, 51, 51);">服务器布署、扩缩容、运维、监控报警交由云服务器厂商来做</font>
+ <font style="color:rgb(51, 51, 51);">前端开发只关注业务，不需要关注服务器</font>

<!-- 这是一张图片，ocr 内容为：服务器 数据库 网页/APP 函数 函数 网页/APP BAAS (后端即服务:BACKEND AS A SERVICE) API网关 函数 函数 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1744710828732-7520d19f-0668-4cc7-a3d8-d35bc477e5d2.png)

## <font style="color:rgb(51, 51, 51);">云函数</font>
+ [腾讯云](https://console.cloud.tencent.com/scf/list?rid=1&ns=default)

# <font style="color:rgb(51, 51, 51);">serverless framework</font>
+ <font style="color:rgb(51, 51, 51);">Serverless Framework 是业界非常受欢迎的无服务器应用框架，开发者无需关心底层资源即可部署完整可用的 Serverless 应用架构</font>
+ <font style="color:rgb(51, 51, 51);">Serverless Framework 具有资源编排、自动伸缩、事件驱动等能力，覆盖编码、调试、测试、部署等全生命周期，帮助开发者通过联动云资源，迅速构建 Serverless 应用</font>
+ [<font style="color:rgb(51, 122, 183);">Serverless Framework</font>](https://cloud.tencent.com/product/sls)
+ [<font style="color:rgb(51, 122, 183);">Serverless Framework文档</font>](https://cloud.tencent.com/document/product/1154)
+ [<font style="color:rgb(51, 122, 183);">安装Serverless Framework</font>](https://cloud.tencent.com/document/product/1154/42990)

```plain
$ npm i -g serverless-cloud-framework
$ npm update -g serverless-cloud-framework
$ scf -v
```

# <font style="color:rgb(51, 51, 51);">Serverless Components</font>
+ [<font style="color:rgb(51, 122, 183);">Serverless Components</font>](https://cloud.tencent.com/document/product/1154/39271)<font style="color:rgb(51, 51, 51);">是支持多个云资源编排和组织的场景化解决方案，主要基于客户的具体场景，如 Express 框架支持、网站部署等</font>
+ <font style="color:rgb(51, 51, 51);">Serverless Components 可以有效简化云资源的配置和管理，将网关、COS 和 CAM 等产品联动起来，让客户更多关注场景和业务</font>
+ <font style="color:rgb(51, 51, 51);">Serverless Framework Components 最佳实践</font>
    - <font style="color:rgb(51, 51, 51);">腾讯云云函数组件</font>
    - <font style="color:rgb(51, 51, 51);">快速部署基于 Express.js 的后端服务到腾讯云函数的组件</font>
    - <font style="color:rgb(51, 51, 51);">快速部署静态网站到腾讯云的组件</font>

## <font style="color:rgb(51, 51, 51);">云函数 SCF 组件</font>
+ [<font style="color:rgb(51, 122, 183);">腾讯云 SCF 云函数组件</font>](https://cloud.tencent.com/document/product/1154/39271)<font style="color:rgb(51, 51, 51);">通过使用 Tencent Serverless Framework，基于云上 Serverless 服务（云函数及触发器等），实现</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">0</font>`<font style="color:rgb(51, 51, 51);">配置，便捷开发，极速部署您的第一个云函数</font>
+ [<font style="color:rgb(51, 122, 183);">查看scf</font>](https://console.cloud.tencent.com/scf/list)
+ [<font style="color:rgb(51, 122, 183);">全量配置</font>](https://github.com/serverless-components/tencent-scf/blob/v2/doc/serverless.yaml)

### <font style="color:rgb(51, 51, 51);">serverless.yaml</font>
+ [<font style="color:rgb(51, 122, 183);">js-yaml</font>](https://nodeca.github.io/js-yaml)

```yaml
# 组件信息
app: g
component: scf # (必填) 引用 component 的名称，当前用到的是 tencent-scf 组件
name: users # (必填) 该组件创建的实例名称
stage: dev # (可选) 用于区分环境信息，默认值是 dev

# 组件参数
inputs:
  name: ${name}-${stage}-${app} # 函数名称
  src: ./src # 代码路径
  runtime: Nodejs10.15 # 云函数的运行时环境。除 Nodejs10.15 外，可选值为：Python2.7、Python3.6、Nodejs6.10、Nodejs8.9、PHP5、PHP7、Golang1、Java8。
  region: ap-guangzhou # 云函数所在区域
  handler: index.main_handler #入口
  events:
    - http:
        parameters:
          netConfig:
            enableIntranet: true
            enableExtranet: true
          qualifier: $DEFAULT
          authType: NONE
```

### <font style="color:rgb(51, 51, 51);">src\index.js</font>
```javascript
'use strict';
exports.main_handler = async (event, context, callback) => {
  return {
    code: 200,
    message: 'success',
    data: {
      name: 'tencent-serverless'
    }
  }
};
```

### <font style="color:rgb(51, 51, 51);">.env</font>
<font style="color:rgb(51, 51, 51);">tencent-scf.env</font>

+ <font style="color:rgb(51, 51, 51);">当前默认支持 CLI 扫描二维码登录，如您希望配置持久的环境变量/密钥信息，也可以本地创建 .env 文件：</font>
+ [<font style="color:rgb(51, 122, 183);">API密钥管理</font>](https://console.cloud.tencent.com/cam/capi)

<!-- 这是一张图片，ocr 内容为：下午7:22 中国移动 腾讯云 授权 腾讯云 登录 云函数开发者工具 SERVERLESS CLOUD FUNCTION DEVTOOLS 云函数开发者工具将获取以下权限 获得您的账号ID COS所有操作 SCF(云函数)全读写权限 TAG(标签)全读写权限 CAM(访问管理)查看角色权限 VPC(私有网络)只读权限 MONITOR(云监控)只读权限 CAM(访问管理)创建角色权限 SLS全读写权限 授权 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1744710829617-d3e7a071-b125-44de-9bb2-9af3d31b1d0b.png)

```powershell
# TENCENT_APP_ID=
TENCENT_SECRET_ID = xxxx  // 使用自己的
TENCENT_SECRET_KEY = xxx  // 使用自己的
```

### <font style="color:rgb(51, 51, 51);">布署</font>
```plain
scf deploy
```

## <font style="color:rgb(51, 51, 51);">API 网关组件</font>
+ <font style="color:rgb(51, 51, 51);">API网关是将所有API的调用统一接入API网关层，由网关层负责接入和输出</font>
+ <font style="color:rgb(51, 51, 51);">API网关是用户与服务器的连接器，负责API接口的托管，实现安全防护和统一监控。</font>
+ <font style="color:rgb(51, 51, 51);">API网关组件是 serverless-tencent 组件库中的基础组件之一，您可以通过该组件快速且方便地创建、配置和管理腾讯云的 API 网关产品。</font>
+ <font style="color:rgb(51, 51, 51);">通过 API 网关组件，您可以对一个 API 服务/接口进行完整的创建、配置、部署和删除等操作</font>
+ [<font style="color:rgb(51, 122, 183);">全量配置</font>](https://github.com/serverless-components/tencent-apigateway/blob/master/docs/configure.md)
+ [Serverless 应用中心 API 网关组件（即将下线）](https://cloud.tencent.com/document/product/1154/39268)

### <font style="color:rgb(51, 51, 51);">serverless.yml</font>
```yaml
component: apigateway # (必填) 组件名称，此处为 apigateway
name: apigwDemo # (必填) 实例名称
app: appDemo # (可选) 该 next.js 应用名称
stage: dev # (可选) 用于区分环境信息，默认值是 dev

inputs:
  region: ap-guangzhou
  protocols:
    - http
    - https
  serviceName: serverless
  environment: release
  endpoints:
    - path: /
      protocol: HTTP
      method: GET
      apiName: index
      function:
        functionName: helloworld-1744768496
```

### .env
```powershell
# TENCENT_APP_ID=
TENCENT_SECRET_ID = xxxx  // 使用自己的
TENCENT_SECRET_KEY = xxx  // 使用自己的
```

### <font style="color:rgb(51, 51, 51);">布署</font>
```plain
scf deploy
```

## <font style="color:rgb(51, 51, 51);">布署静态网站</font>
+ [<font style="color:rgb(51, 122, 183);">完整配置</font>](#%20TENCENT_APP_ID=%20TENCENT_SECRET_ID%20=%20AKIDb2HJ8k9KI2Yrwra5Nl4B5njLmAWigQzR%20TENCENT_SECRET_KEY%20=%20KRM3YdcQ1OcdQzLTWLxMXWJtFNIyRghV)
+ [Serverless 应用中心 部署静态网站](https://cloud.tencent.com/document/product/1154/39276)

### <font style="color:rgb(51, 51, 51);">serverless.yml</font>
```yaml
app: websiteApp # (可选) 该 website 应用名称
stage: dev   # (可选) 用于区分环境信息，默认值是 dev

component: website # (必填) 引用 component 的名称，当前用到的是 tencent-website 组件
name: websiteDemo  # (必填) 该 website 组件创建的实例名称
# org: test # (可选) 用于记录组织信息，默认值为您的腾讯云账户 appid

inputs:
  src:
    src: ./src
    index: index.html
    error: index.html
  region: ap-guangzhou
  bucket: website-demo
  protocol: https
```

### <font style="color:rgb(51, 51, 51);">index.html</font>
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
  </head>
  <body>
    Serverless Website
  </body>
</html>
```

### .env
```powershell
# TENCENT_APP_ID=
TENCENT_SECRET_ID = xxxx  // 使用自己的
TENCENT_SECRET_KEY = xxx  // 使用自己的
```

### <font style="color:rgb(51, 51, 51);">布署</font>
```plain
scf deploy
```

## <font style="color:rgb(51, 51, 51);">布署express项目</font>
+ [<font style="color:rgb(51, 122, 183);">全量配置</font>](https://github.com/serverless-components/tencent-express/blob/master/docs/configure.md)
+ [Serverless 应用中心 快速部署 Express 框架](https://cloud.tencent.com/document/product/1154/43224#.E8.87.AA.E5.AE.9A.E4.B9.89.E9.83.A8.E7.BD.B2----.E5.BF.AB.E9.80.9F.E9.83.A8.E7.BD.B2-web-.E5.BA.94.E7.94.A8)

### <font style="color:rgb(51, 51, 51);">创建项目</font>
```shell
mkdir tencent-express
cd tencent-express
npm init -y
npm i express -S
```

### package.json
```json
{
  "name": "tencent-express",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "dev": "NODE_ENV=development node app.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.17.1"
  }
}

```

### <font style="color:rgb(51, 51, 51);">serverless.yml</font>
```yaml
component: http
name: express-web
inputs:
  src:
    src: ./
    exclude:
      - .env
  faas:
    runtime: Nodejs12.16
    framework: express
    name: ${name}
    events:
      - http:
          parameters:
            netConfig:
              enableIntranet: true
              enableExtranet: true
            qualifier: $DEFAULT
            authType: NONE
app: express-web

```

### <font style="color:rgb(51, 51, 51);">app.js</font>
```javascript
const express = require('express')
const path = require('path')
const app = express()

// Routes
app.get(`/`, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

app.get('/user', (req, res) => {
  res.send([
    {
      title: 'serverless framework',
      link: 'https://serverless.com'
    }
  ])
})

app.get('/user/:id', (req, res) => {
  const id = req.params.id
  res.send({
    id: id,
    title: 'serverless framework',
    link: 'https://serverless.com'
  })
})

app.get('/404', (req, res) => {
  res.status(404).send('Not found')
})

app.get('/500', (req, res) => {
  res.status(500).send('Server Error')
})

// Error handler
app.use(function(err, req, res, next) {
  console.error(err)
  res.status(500).send('Internal Serverless Error')
})

app.listen(9000, () => {
  console.log(`Server start on http://localhost:9000`);
})
```

### .env
```powershell
# TENCENT_APP_ID=
TENCENT_SECRET_ID = xxxx  // 使用自己的
TENCENT_SECRET_KEY = xxx  // 使用自己的
```

### <font style="color:rgb(51, 51, 51);">布署</font>
```plain
scf deploy
```

## <font style="color:rgb(51, 51, 51);">布署express+layer项目</font>
+ [<font style="color:rgb(51, 122, 183);">层管理</font>](https://cloud.tencent.com/document/product/583/40159)
+ [<font style="color:rgb(51, 122, 183);">打包压缩阶段</font>](https://github.com/serverless-components/tencent-egg/issues/5)

### layer
#### <font style="color:rgb(51, 51, 51);">serverless.yml</font>
```yaml
org: '1258122687'
app: express-web
stage: dev
component: layer
name: express-web-layer
inputs:
  name: express-web-layer
  region: ap-guangzhou
  src:
    src: ../node_modules
    targetDir: /node_modules
  runtimes:
    - Nodejs12.16
```

#### <font style="color:rgb(51, 51, 51);">布署</font>
```plain
scf deploy
```

### <font style="color:rgb(51, 51, 51);">serverless.yml</font>
```yaml
component: http
name: express-web
inputs:
  src:
    src: ./
    exclude:
      - .env
  faas:
    runtime: Nodejs12.16
    framework: express
    name: ${name}
    events:
      - http:
          parameters:
            netConfig:
              enableIntranet: true
              enableExtranet: true
            qualifier: $DEFAULT
            authType: NONE
  layers:
      - name: '${output:${stage}:${app}:express-web-layer.name}'
        version: '${output:${stage}:${app}:express-web-layer.version}'
app: express-web

```

### <font style="color:rgb(51, 51, 51);">3.4.3 app.js</font>
```javascript
const express = require('express')
const path = require('path')
const app = express()

// Routes
app.get(`/`, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

app.get('/user', (req, res) => {
  res.send([
    {
      title: 'serverless framework',
      link: 'https://serverless.com'
    }
  ])
})

app.get('/user/:id', (req, res) => {
  const id = req.params.id
  res.send({
    id: id,
    title: 'serverless framework',
    link: 'https://serverless.com'
  })
})

app.get('/404', (req, res) => {
  res.status(404).send('Not found')
})

app.get('/500', (req, res) => {
  res.status(500).send('Server Error')
})

// Error handler
app.use(function(err, req, res, next) {
  console.error(err)
  res.status(500).send('Internal Serverless Error')
})

app.listen(9000, () => {
  console.log(`Server start on http://localhost:9000`);
})
```

index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Serverless Express.js 应用"/>
    <meta name="keywords" content="express,express.js,serverless,无服务"/>
    <title>Serverless - Express.js</title>
    <style lang="css">
      h1 {
        text-align: center;
        width: 600px;
        margin: 300px auto;
      }
    </style>
  </head>
  <body>
    <h1>
      欢迎访问 Express.js 应用
      <br />
      <a href="https://cloud.tencent.com/product/sls" target="_blank" rel="noopener noreferrer">
        腾讯云 Serverless
      </a>
      为您提供服务
    </h1>
  </body>
</html>
```

### .env
```powershell
# TENCENT_APP_ID=
TENCENT_SECRET_ID = xxxx  // 使用自己的
TENCENT_SECRET_KEY = xxx  // 使用自己的
```

### <font style="color:rgb(51, 51, 51);">布署</font>
```plain
scf deploy
```

## <font style="color:rgb(51, 51, 51);">部署Vue+Express全栈应用</font>
+ <font style="color:rgb(51, 51, 51);">全栈组件（Vue.js+Express.js）用于通过多个 Serverless Components 部署 Serverless 全栈应用程序</font>
+ <font style="color:rgb(51, 51, 51);">可以帮助开发者更方便快捷的部署 Serverless 应用，例如利用后端 API 与前端 Vue.js 结合等场景</font>
+ <font style="color:rgb(51, 51, 51);">serverless Express.js 后端：由腾讯云 Serverless Cloud Function（云函数 SCF） 和腾讯云 API 网关提供相关能力，支持 express.js 框架，帮助开发者架构自己的项目和路由。</font>
+ <font style="color:rgb(51, 51, 51);">serverless Vue.js 前端：由腾讯云 Cloud Object Storage（对象存储 COS）提供相关存储能力，通过后端 API 传递到前端，并使用 Vue.js 做相关渲染</font>

<!-- 这是一张图片，ocr 内容为：EXPRESS.JS DYNAMIC CALLS SCF API GATEWAY WEB CLIENT 丽 STATIC CONTENT VUE.JS CLOUD OBJECT STORGE -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1744710828761-ea876803-4cfe-472f-abb4-299211f9e5a9.png)

+ [Serverless 应用中心 快速创建应用模板_腾讯云](https://cloud.tencent.com/document/product/1154/50933)

```shell
serverless-cloud-framework 

serverless-cloud-framework: 当前未检测到 Serverless 项目，是否希望新建一个项目？ Yes
serverless-cloud-framework: 请选择您希望创建的 Serverless 应用 express-starter
﻿
  eggjs-starter - Egg.js 项目模版 
  express-starter - Express.js 项目模版 
  flask-starter - Flask 项目模版 
❯ fullstack - 快速部署一个 Full Stack 应用, vuejs + express + postgres 
  koa-starter - Koa.js 项目模版
  laravel-starter - Laravel 项目模版 
  nextjs-starter -  nextjs 函数项目模版 
﻿
serverless-cloud-framework: 请输入项目名称 demo
serverless-cloud-framework: 正在安装 express-starter 应用...
﻿
﻿
express-starter › Created
﻿
﻿
demo 项目已成功创建！

Serverless: 是否希望立即将该项目部署到云端？ Yes
32s »expressDemo» 执行成功
```



