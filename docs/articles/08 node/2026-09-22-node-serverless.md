# Serverless 架构：云函数/API 网关/部署形态演进（生产收藏级）

> **副标题**：FaaS/BaaS 概念、Serverless Framework 部署云函数/API 网关/静态网站/Express、layer 依赖层、冷启动与成本治理

> 面试官问「你们 BFF 层怎么部署、怎么扩缩容？」，如果你只会答 Docker + K8s，那 Serverless 这一课还没补上。「无服务器」这个词很唬人——它不是说没有服务器，而是把服务器这摊事整个藏了起来。

---

## 🎯 这篇文章解决什么问题

上一篇文章我们聊了 BFF，它解决了「多端数据聚合裁剪」的**逻辑**问题——把面向不同端的接口聚合放到一个中间层。但 BFF 说到底是几个 Node 服务，它自己还要部署、扩缩容、监控、报警，这一摊运维的坑一个都不少。

Serverless 解决的，就是这层「运维代价」：把 BFF 部署到云函数，从「写代码」到「跑起来」之间的服务器、扩缩容、运维、监控全部交给云厂商。

这篇文章把三件事讲透：

- Serverless 到底是什么（FaaS/BaaS 两个概念，以及「部署形态」是怎么一步步演进到这里的）
- 怎么用 Serverless Framework 把云函数、API 网关、静态网站、Express 应用部署上云
- 生产上真正要命的几个坑——无状态设计、冷启动、数据库连接复用——以及成本怎么算

**既讲部署实操，也讲面试怎么答。** 5-10 年 Node 开发者的简历上，部署形态这一栏，从「只会 Docker」到「能讲清 Serverless 的场景边界和冷启动治理」，面试官的眼睛会不一样。

---

## 一、基本使用

### 1. Serverless 不是「没有服务器」

先破一个最常见的误解：**Serverless 不是「没有服务器」，而是「你感知不到服务器」**。

服务器当然还在——你的函数跑在云厂商的物理机/虚拟机上。只是服务器的部署、扩缩容、运维、监控报警这些活，全部由云厂商代劳，你只关心业务逻辑。这就是「无服务器」三个字的真实含义：**对开发者而言无服务器，对云厂商而言全是服务器**。

理解了这一点，再看它的两个核心能力——FaaS 和 BaaS，就清楚了：

**FaaS（Function as a Service，函数即服务）**：承载后端逻辑的载体。你把一个个函数（如腾讯云 SCF、AWS Lambda、阿里云 FC）写出来部署上去，云厂商负责拉起运行环境、按请求量自动伸缩。函数是「活的」，被调用时启动、空闲时回收。

**BaaS（Backend as a Service，后端即服务）**：把 API 网关、对象存储（COS/S3/OSS）、数据库、消息队列这些「现成服务」直接拿来调用，你不需要自己部署一个网关或数据库，调 API 就行。

一句话概括分工：**FaaS 跑你的代码，BaaS 提供你的依赖设施**。你写的逻辑交给 FaaS，逻辑需要用到的东西（网关、存储、数据库）交给 BaaS。

配一张架构图，直观看 FaaS/BaaS 怎么分工：

![Serverless 架构图：BaaS（后端即服务）提供 API 网关/数据库等现成服务，FaaS 承载函数逻辑，网页/APP 通过网关调用函数](https://cdn.nlark.com/yuque/0/2025/png/738210/1744710828732-7520d19f-0668-4cc7-a3d8-d35bc477e5d2.png)

> 💬 **面试官**：FaaS 和 BaaS 分别指什么？各承担什么职责？
>
> ✅ 标准答案：FaaS（函数即服务）承载后端逻辑，开发者只写函数，云厂商负责运行环境、自动伸缩；BaaS（后端即服务）把 API 网关、对象存储、数据库等做成现成服务，开发者直接调用不用自己部署。一句话：FaaS 跑代码，BaaS 提供依赖设施。
>
> 🎁 加分答案：能点出「Serverless 不是没有服务器，而是对开发者隐藏服务器」这层本质，并举例——云函数是 FaaS，API 网关/对象存储 COS 是 BaaS，两者组合才构成完整的 Serverless 应用。

### 2. 部署形态是怎么一步步演进到 Serverless 的

副标题里的「部署形态演进」，值得先铺一张全景图。从自己扛服务器到无服务器，开发者要管的事越来越少：

| 形态 | 你负责什么 | 云厂商负责什么 | 典型代表 |
|------|-----------|---------------|---------|
| 自建机房 | 服务器、网络、机房、操作系统、运行时、应用、运维 | 无 | 传统 IDC |
| IaaS | 操作系统、运行时、应用、运维 | 服务器、网络、存储 | 云主机 CVM/EC2 |
| PaaS | 应用、部分运维 | 操作系统、运行时、平台 | 应用引擎 |
| CaaS（容器） | 应用、容器编排、扩缩容策略 | 基础设施、容器运行时 | Docker + K8s |
| FaaS（Serverless） | 只写函数逻辑 | 几乎一切 | 云函数 SCF/Lambda |

看清楚这条主线：**从下往上，你从「什么都管」退化到「只写业务」**。FaaS 是这条演进链的终点——连「服务常驻、按需扩缩容」这种 PaaS/CaaS 阶段还要操心的事，都一并交给云厂商了。

这一步的价值有多大？BFF 层如果有 10 个聚合接口、流量平时很小但大促突发，传统做法你得常驻几台服务器（平时浪费、大促不够），Serverless 则是「来多少请求扩多少实例，没请求就不花钱」。这个「按量付费 + 自动伸缩」的组合，才是 Serverless 真正的杀手锏。

### 3. Serverless Framework：资源编排 + 全生命周期

Serverless Framework 是业界主流的无服务器应用框架，把「编码、调试、测试、部署」全生命周期串起来，通过编排云资源（云函数、API 网关、COS 等）迅速构建 Serverless 应用。

安装很简单，注意腾讯云的命令是 `serverless-cloud-framework`，装完用 `scf` 命令：

```plain
$ npm i -g serverless-cloud-framework
$ npm update -g serverless-cloud-framework
$ scf -v
```

它最核心的能力是「资源编排」——你用一份 `serverless.yaml` 声明要哪些资源（函数、网关、存储），它帮你把这些资源创建、配置、串联起来。下面几个实操，都是围绕这份配置文件展开的。

### 4. 云函数 SCF 组件：从零部署第一个函数

先部署最纯粹的云函数。一份 `serverless.yaml` 声明函数的运行时、入口、触发方式：

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

几个关键字段先记住：

- `component: scf`——声明用「云函数」组件
- `runtime: Nodejs10.15`——函数的运行时环境（Node 版本由你声明，不同厂商/版本可选范围不同）
- `handler: index.main_handler`——入口，指向 `src/index.js` 里导出的 `main_handler` 函数
- `events`——触发器，这里配了一个 HTTP 触发器，让函数能被 HTTP 请求调用

入口文件 `src/index.js` 长这样，注意导出的是 `main_handler(event, context)`：

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

`event` 是本次触发的入参（HTTP 触发时是请求信息），`context` 是运行时上下文（函数名、requestId 等），返回值就是函数的响应。密钥配置在 `.env`（默认支持 CLI 扫码登录，也可手动创建 `.env` 持久化）：

```powershell
# TENCENT_APP_ID=
TENCENT_SECRET_ID = xxxx  // 使用自己的
TENCENT_SECRET_KEY = xxx  // 使用自己的
```

配好密钥后，一行命令部署：

```plain
scf deploy
```

部署过程会弹授权，让 Serverless 工具获取创建云资源所需的权限（云函数、COS、API 网关等）：

![腾讯云 Serverless 授权界面：工具获取 COS/SCF/CAM/VPC 等资源的读写权限](https://cdn.nlark.com/yuque/0/2025/png/738210/1744710829617-d3e7a071-b125-44de-9bb2-9af3d31b1d0b.png)

部署完成，你的第一个云函数就上线了，一个 URL 就能访问到。**这就是 Serverless 的核心体验：写一个函数 → 声明一份配置 → 一键部署**，服务器、扩缩容、监控全都不管。

### 5. API 网关组件：把 HTTP 路径绑到函数上

云函数本身是个「函数」，要对外提供 HTTP API，得靠 API 网关把它包成标准接口。API 网关是所有 API 调用的统一入口，负责接入、输出、鉴权、限流、监控。

用 `component: apigateway` 声明，通过 `endpoints` 把 HTTP 路径/方法绑定到指定云函数：

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

`endpoints` 就是「路径 + 方法 → 函数」的映射表：上面的配置把 `GET /` 路由到名为 `helloworld-1744768496` 的云函数。配好 `.env` 后同样 `scf deploy` 一键部署。

这里有一个关键设计，先埋个伏笔（后面「企业最佳实践」会展开）：**网关管横切关注点（鉴权、限流、协议），函数只做业务**——这正是第 10 篇 BFF vs API Gateway 的边界，Serverless 把「网关」做成了云上现成的托管服务。

### 6. 部署静态网站：一键上传到 COS

纯前端项目没有后端逻辑，直接上对象存储 COS + CDN 就是最佳形态。`component: website` 把 `src` 目录上传到 COS，绑自定义域名 + HTTPS：

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

`index` 是站点首页，`error` 是 404/错误页（这里都指向 index.html，SPA 应用的常见做法）。待上传的 `index.html`：

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

配好 `.env` 后 `scf deploy`，静态网站就部署完成了。前端静态资源走 COS，这是后面「Vue + Express 全栈」的前半部分。

### 7. 部署 Express 项目：几乎不改代码上云

前面是「为 Serverless 写函数」，但现实里你已经有一个现成的 Express 应用了，怎么办？`component: http` + `faas.framework: express`，几乎不改代码就能把 Express 应用部署到云函数。

先建一个普通 Express 项目：

```shell
mkdir tencent-express
cd tencent-express
npm init -y
npm i express -S
```

`package.json`：

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

`serverless.yml` 用 `component: http` + `faas.framework: express`：

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

注意 `exclude: - .env`——把密钥文件排除出部署包，避免泄露。这是「密钥隔离」的最基础动作。

`app.js` 就是一个普通 Express 应用，没有任何 Serverless 专属代码：

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

`scf deploy` 后，这个 Express 应用就跑在云函数上了。**从「自建 Node 服务」到「云上托管」，你只多写了一份 `serverless.yml`**——这就是 Serverless Framework 对存量应用的最大价值。

### 8. layer 依赖层：把 node_modules 抽出来复用

Express 应用通常依赖一坨 `node_modules`，直接把整个项目打成部署包，体积大、冷启动慢。`component: layer` 把 `node_modules` 抽成「依赖层」，函数代码只留业务逻辑，函数引用这个层即可。

先部署 layer：

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

`src` 指向 `node_modules` 目录，`targetDir: /node_modules` 说明这些文件会被放到运行时环境的 `/node_modules` 下。部署完成后，在函数配置里引用这个 layer：

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

`layers` 字段引用了上一步部署出来的 layer 的名称和版本（`${output:...}` 是跨组件引用语法）。这样函数包里就不含 `node_modules` 了，函数代码和依赖彻底分离。

layer 的价值，后面「企业最佳实践」第 2 节会展开讲——减包体积、加速冷启动、多函数共享、统一升级，是 Serverless 工程化里最常用的一招。

### 9. Vue + Express 全栈：前端 COS + 后端云函数

把前面的静态网站 + Express 后端组合起来，就是一个完整的 Serverless 全栈应用：

- **前端**：Vue.js 静态资源走对象存储 COS
- **后端**：Express.js 走云函数 SCF + API 网关

分工一句话：**前端静态内容由 COS 存储，后端 API 由云函数承载，两者通过 API 网关串联**。

![Vue + Express 全栈架构：Web Client 访问 COS 上的静态内容，同时通过 API 网关调用 SCF 云函数上的 Express 后端](https://cdn.nlark.com/yuque/0/2025/png/738210/1744710828761-ea876803-4cfe-472f-abb4-299211f9e5a9.png)

官方提供了 `fullstack` 模板，一行命令交互式创建：

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

32 秒，一个 Vue + Express + PostgreSQL 的全栈应用就部署完成。到这里，「基本使用」的六个部署形态（云函数、API 网关、静态网站、Express、layer、全栈）就都跑通了。

> 🔧 **真实场景**：上一篇文章里那个医院 HIS 系统的 BFF 层，如果把它迁移到 Serverless，前端小程序静态资源走 COS，BFF 的聚合接口用 `component: http` + Express 部署到云函数，API 网关统一做鉴权限流。大促期间突发流量，云函数自动扩缩容，平时没流量就不花常驻服务器的钱。

---

## 二、企业最佳实践

### 1. 无状态设计（核心中的核心）

把 Serverless 用错，代价最大的一条，就是「把函数实例当成了常驻进程」。先记住一个事实：**函数实例会被随时冷启动、销毁、横向扩容**。你没法预测下一次请求会落在哪个实例上，甚至没法保证这次请求和上次请求是同一个实例处理的。

这带来一个硬约束：**任何进程内状态都不保证下次请求还在**。内存缓存、全局变量、本地文件，统统不靠谱——这个实例处理完请求可能就被回收了，你写在内存里的东西跟着一起没了。

所以 Serverless 的第一原则就是**无状态设计**：需要持久化的状态，一律外置到数据库 / Redis / 对象存储。进程内可以有的，只剩「从外部拿进来、用完即弃」的临时变量。

```javascript
// ❌ 错误：把会话/缓存存在全局变量里，实例一销毁就没了
let sessionCache = {} // 下一个请求可能落在全新实例上，这个 cache 是空的

// ✅ 正确：状态外置到 Redis，每次请求从 Redis 读
const redis = createRedisClient()
exports.main_handler = async (event) => {
  const session = await redis.get(event.sessionId) // 状态在外部，实例怎么变都不怕
  // ... 处理业务
  await redis.set(event.sessionId, updatedSession)
}
```

这条原则和之前讲过的「多进程部署不能用进程内存存 Session」是**同一件事的加强版**。多进程部署下，进程内存是各进程独立的，不能假设下次请求还是同一个进程处理；Serverless 把这个「不保证」推到了极致——实例的生命周期你完全不可控，连「进程」这个概念都被抽象掉了。

> 💬 **面试官**：Serverless 为什么必须无状态设计？
>
> ✅ 标准答案：因为函数实例会被随时冷启动、销毁和横向扩容，进程内的任何状态（内存缓存、全局变量、本地文件）都不保证下次请求还在。需要持久化的状态必须外置到数据库、Redis、对象存储等外部服务。
>
> 🎁 加分答案：能说出这和多进程部署「不能用进程内存存 Session」是同一原则，只是 Serverless 让实例生命周期完全不可控、把约束推到了极致。再补一句：全局变量并非完全不能用，但只能用来存「跨请求可安全复用的只读资源」，比如下面要讲的数据库连接池。

### 2. layer 分层复用：把依赖从代码里拆出来

第一章已经演示了 layer 的用法，这里讲透它的价值。layer 要解决的是一个很实际的矛盾：**函数依赖的 `node_modules` 往往比业务代码大几个数量级**，但每次部署、每次冷启动，都得背着这坨依赖。

把 `node_modules`、公共工具函数、大体积依赖抽成 layer，函数代码只留业务逻辑，带来三个收益：

- **减小函数包体积**：包小了，上传快、加载快，直接加速冷启动
- **多函数共享一份依赖**：十几个函数都用同一个 layer，不用各自打包一份
- **统一升级**：依赖版本只改 layer 一处，所有引用它的函数同时生效

一句话：**layer 把「依赖」从「代码」里拆出来，让依赖能被复用、被统一管理**。这是 Serverless 工程化里最常用的一招，也是「加速冷启动」最直接的杠杆——包体积越小，冷启动时解压、加载代码的时间越短。

### 3. 冷启动优化：Serverless 延迟的头号来源

这是整篇文章面试问得最多、也最值得讲透的一节。先搞清楚「冷启动」到底是什么。

**冷启动**：函数首次被调用、或长期空闲后被调用时，运行环境已经没了，云厂商需要重新拉起一个实例——分配容器、加载运行时、加载你的代码、执行初始化逻辑。这个过程是秒级的（Node 快一些，但也明显可感知）。

对比之下，**热启动**：实例还活着，请求直接落到已有实例上执行 handler，几乎没有额外开销。

函数实例的完整生命周期是这样的：

```text
冷启动（拉起环境，秒级）
   │
   ├─ 分配容器/沙箱
   ├─ 加载运行时（Node.js 进程启动）
   ├─ 加载代码包（解压、require 依赖）
   └─ 执行 handler 之外的初始化代码（如连数据库）
   │
   ▼
热启动（实例存活期，毫秒级）
   │  每个请求直接进 handler，复用已加载的代码和连接
   │
   ▼
空闲回收（一段时间没请求，实例被冻结/销毁）
   │
   └─（下一次请求又回到冷启动，循环）
```

冷启动延迟主要来自这几个环节的叠加：容器分配、运行时加载、代码解压、依赖加载、初始化逻辑。**优化冷启动，就是逐项压缩这些环节的开销**：

- **减小代码包体积**：去掉无用依赖、用 layer 抽走 `node_modules`，包小了加载就快
- **选择更轻的运行时**：Node/Python 比 Java 冷启动快，函数场景优先轻量运行时
- **把初始化开销移出 handler 之外**：连数据库、加载配置这类「一次性的活」放在 handler 外的全局作用域，利用实例复用来摊薄（但要配合下面第 6 节「连接复用」）
- **预留并发（常驻实例）**：花钱让一部分实例常驻，请求来了直接热启动命中
- **定时预热**：用定时任务周期性地「打」一下函数，让它保持热状态

配一张冷启动 vs 热启动的时序对比，直观感受两者差距：

```text
冷启动请求：   [容器分配 2s][运行时加载 0.5s][代码加载 0.3s][handler 执行 0.05s]  → 响应 ~3s
热启动请求：   [handler 执行 0.05s]                                            → 响应 ~0.05s
```

冷启动的代价一目了然：**函数逻辑本身可能只要 50ms，冷启动却要额外等 3 秒**。对延迟敏感的服务，这就是致命的。

> 💬 **面试官**：冷启动是什么？为什么会发生？有哪些缓解手段？
>
> ✅ 标准答案：冷启动是函数首次或长期空闲后被调用时，运行环境需要重新拉起（分配容器、加载运行时和代码、执行初始化）带来的秒级延迟。原因在于 Serverless 会在空闲时回收实例以节省资源，下次调用只能重新拉起。缓解手段：减小代码包体积、用 layer 抽离依赖、选择轻量运行时、预留并发或定时预热、把初始化开销移出 handler。
>
> 🎁 加分答案：能区分「冷启动（拉环境）」和「热启动（复用实例）」两个概念，并指出冷启动的延迟大头在「容器分配 + 运行时加载 + 代码加载」而非业务逻辑本身。再补一句：预留并发本质是「用钱换延迟」，定时预热本质是「用请求换延迟」，两者都要和成本权衡。

### 4. 函数与 API 网关的分工：横切关注点交给网关

第一章埋的伏笔，这里回收。Serverless 应用里，云函数和 API 网关是天然搭档，分工非常清晰：

- **API 网关**：负责鉴权、限流、协议转换、监控这些「与业务无关」的横切关注点
- **云函数**：只做业务逻辑

这和第 10 篇「BFF vs API Gateway」的边界判断完全一致——网关是基础设施层，函数是业务层。Serverless 的特别之处在于：**把「网关」从「你自己部署维护的东西」变成了「云上现成的托管服务」**，你配一份 `endpoints` 就拥有了鉴权限流能力，不用自己写网关代码。

这个分工带来的好处：业务逻辑保持纯粹、可独立部署，横切关注点集中在网关统一治理。改鉴权规则、调限流阈值，都不用动函数代码。

### 5. 密钥与环境隔离

Serverless 应用里密钥管理尤其要小心，因为部署包可能被复制、日志可能被采集，泄露面比传统应用更广。两条铁律：

- **密钥绝不硬编码进代码，绝不提交到仓库**：走 `.env` 或云厂商的密钥管理（KMS/参数存储）
- **用 `stage`（dev/prod）区分环境**：不同环境用不同的密钥和配置

回看第一章的配置，`stage: dev` 用来区分环境，`src.exclude: - .env` 把密钥文件排除出部署包——这两处就是「密钥隔离」的落地。生产环境的密钥不要和开发环境混用，也不要出现在任何会被打进的包里。

### 6. 数据库连接复用：全局作用域，不是 handler 内

这一条是冷启动问题的连锁反应，也是生产上最容易踩的坑。

如果你在 handler 内每次新建数据库连接，会怎样？冷启动 + 高并发时，每个请求都在 handler 里建一次连接，连接数会被瞬间打满——数据库的连接数是有上限的，打满之后所有请求都连不上。

正确做法是**把数据库连接放在 handler 外的全局作用域**，利用函数实例复用来减少建连开销：

```javascript
// ❌ 错误：每次请求都建一次连接，冷启动 + 高并发会把连接数打满
exports.main_handler = async (event) => {
  const client = await createDbClient() // 每个请求都建连，连接数爆炸
  const result = await client.query('...')
  await client.end()
  return result
}

// ✅ 正确：连接放在全局作用域，实例存活期间复用同一连接
const client = createDbClient() // handler 之外，只建一次，实例复用

exports.main_handler = async (event) => {
  const result = await client.query('...') // 复用已有连接
  return result
}
```

为什么全局作用域能复用？回到第 3 节的实例生命周期：冷启动时，全局作用域的代码执行一次（建连接），之后这个实例存活期间，所有请求都复用这个连接。只有当实例被回收、下次冷启动时，才会重新建连。

这里有个微妙的点要讲清楚：**这个「复用」只在单个实例内成立**。实例扩容到 10 个，就有 10 个连接。所以全局连接本身只是「摊薄了冷启动的建连次数」，还需要配合**合理的连接池上限**，避免实例数量 × 连接数超过数据库能承受的上限。

> 💬 **面试官**：Serverless 里数据库连接应该怎么管理？
>
> ✅ 标准答案：把数据库连接放在 handler 外的全局作用域，利用函数实例复用减少冷启动时的建连开销；同时配置合理的连接池上限，避免实例扩容后连接数超过数据库承受能力。
>
> 🎁 加分答案：能说出「为什么不能在 handler 内建连」——每个请求都建一次连接，冷启动 + 高并发会把连接数瞬间打满；并能区分「全局连接是单实例内复用」和「实例扩容后连接数 = 实例数 × 每实例连接数」这层关系，所以连接池上限必须配。

### 7. 成本模型与治理：Serverless 的钱怎么算

副标题里的「成本治理」，是很多人上 Serverless 之后才意识到的大问题。先把计费模型讲清楚：

- **按调用次数计费**：请求来一次，算一次钱
- **按资源量计费**：`内存 × 执行时长`，常用「GB·s」（内存 GB 数 × 秒数）作为计量单位
- **空闲不计费**：没有请求时，不花常驻服务器的钱

这正是 Serverless 吸引人的地方——**按量付费，闲时不花钱**。但这里面藏了几个成本陷阱，一不留神反而更贵：

- **预留并发常驻反而贵**：预留并发就是「花钱让实例常驻」，如果预留的数量超出实际需求，等于又回到了「常驻服务器」的付费模式，白花了 Serverless 省下的钱
- **无效预热浪费**：定时预热要精确对准「真实流量高峰前」，预热太频繁或太早都是白花钱
- **内存配大浪费**：计费是「内存 × 时长」，内存从 128MB 配到 1GB，同样时长的请求成本翻 8 倍——内存配够用就好，别图省事直接拉满

治理的核心思路就一句：**在「冷启动延迟」和「成本」之间找平衡**。

| 优化手段 | 降延迟还是降成本 | 代价 |
|---------|----------------|------|
| 减小包体积 / layer 抽依赖 | 两者都降 | 几乎无 |
| 合理配置内存 | 降成本（有时也降延迟） | 需要压测调优 |
| 预留并发 | 降延迟 | 增成本（常驻付费） |
| 定时预热 | 降延迟 | 增成本（无效预热浪费） |

看清这个表就明白了：**减包、配内存是「白赚」的，预留并发、预热是「花钱买延迟」**。治理成本时，先把前两类做扎实，再按真实流量的波峰波谷决定后面两类要不要上、上多少。

---

## 三、注意事项

### 1. 执行时间与内存上限：长任务别硬塞进函数

云函数都有最大执行时长和内存限制，这是 Serverless 的硬边界。视频转码、大批量导出、复杂模型推理这类长时任务，一旦超过执行时长上限就会被强制中断，直接放函数里必挂。

正确做法是**转交消息队列异步处理**：函数接收请求后快速返回「任务已受理」，把耗时任务丢给消息队列，由独立的工作者异步处理。这也是「执行时间上限」逼出来的一条架构原则——**函数适合「短平快」的请求，不适合「长耗时」的计算**。

### 2. 冷启动延迟：敏感服务的大敌，长连接也不支持

冷启动的延迟，对延迟敏感的服务是致命的——一次请求额外等上秒级，用户直接流失。缓解手段第二章第 3 节已经讲全（预留并发、预热、减包等）。

这里补一个容易忽略的点：**WebSocket 这类长连接，Serverless 默认不支持**。因为函数是「请求进来才启动、处理完就回收」的无状态短生命周期模型，天然和「维持一条长时间连接」的长连接场景冲突。要做长连接，得用网关的长连接能力，或者干脆换回常驻的部署形态。

### 3. 数据库连接数耗尽：连接必须移到全局

这一条第二章第 6 节讲过原理，这里再强调一次它的「事故形态」：如果 handler 内每次新建连接，冷启动 + 高并发会把数据库连接数瞬间打满，表现为「突然所有请求都连不上数据库」。

记住两个动作：**连接移到全局作用域复用 + 配置合理的连接池上限**。前者摊薄建连次数，后者防止实例扩容后连接数失控。

### 4. 适用场景边界：不是所有应用都适合上 Serverless

Serverless 不是银弹，它有明确的「甜区」和「禁区」：

| 适合上 Serverless | 不适合上 Serverless |
|------------------|-------------------|
| 事件驱动的任务（图片处理、日志处理） | 强状态应用（内存会话、本地缓存依赖） |
| 突发流量的场景（大促、秒杀） | 长连接（WebSocket、游戏、实时通信） |
| 轻量接口（BFF 聚合、Webhook） | 长时计算（视频转码、复杂模型推理） |
| 定时任务（定时备份、定时报表） | 需要精细控制底层网络/内核的场景 |
| 静态站点（纯前端 + COS） | 对冷启动延迟极度敏感的核心链路 |

判据一句话：**「请求量波动大、逻辑简单、无状态」的场景收益最大；「强状态、长连接、长时计算、精细底层控制」的场景则不合适**。选型时拿这个表对一遍，比拍脑袋可靠得多。

> 💬 **面试官**：什么场景适合上 Serverless，什么场景不适合？
>
> ✅ 标准答案：适合事件驱动、突发流量、轻量接口、定时任务、静态站点这类「请求量波动大、逻辑简单、无状态」的场景；不适合强状态、长连接、长时计算、需要精细控制底层网络/内核的场景。
>
> 🎁 加分答案：能给出具体的边界判据——无状态 + 短生命周期 + 突发流量是 Serverless 的甜区；长连接（WebSocket）、长时计算（转码/推理）、强状态（内存 Session）会撞上冷启动、执行时长上限、无状态约束三道墙。再补一句：BFF 聚合层是 Serverless 的典型甜区，因为它是无状态、轻量、流量波动的。

### 5. 供应商锁定：迁移成本要算进选型

不同云厂商的 Serverless 能力——触发事件、运行时、网关配置——并不通用。你用腾讯云 SCF 写的 `serverless.yaml`、配的触发器和网关，迁移到 AWS Lambda 或阿里云 FC 基本要重写。

这是选型时必须算进去的成本：**Serverless Framework 抽象了一层，但厂商之间的差异（事件源、运行时、配置项）仍然存在，锁定风险高**。如果业务有「多云/随时可迁」的诉求，要么接受锁定、要么在代码层做一层抽象（但抽象本身也有成本），要么谨慎评估是否真的要上某个厂商独有的能力。

---

## 参考资料

- https://cloud.tencent.com/document/product/1154 （Serverless Framework 官方文档）
- https://cloud.tencent.com/document/product/1154/42990 （安装 Serverless Framework）
- https://cloud.tencent.com/document/product/1154/39271 （Serverless Components 与云函数 SCF 组件）
- https://cloud.tencent.com/document/product/1154/39268 （API 网关组件）
- https://cloud.tencent.com/document/product/1154/39276 （部署静态网站）
- https://cloud.tencent.com/document/product/1154/43224 （快速部署 Express 应用）
- https://cloud.tencent.com/document/product/583/40159 （云函数层管理 layer）
- https://cloud.tencent.com/document/product/1154/50933 （快速创建全栈应用模板）

> 概念层对照：AWS Lambda 与阿里云函数计算 FC 的「冷启动 / 无状态 / 按量计费」模型与腾讯云 SCF 通用，读者可按自己所在云平台查阅对应官方文档。

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 考察频率 |
|--------|-----------|---------|
| FaaS / BaaS | FaaS 跑代码（云函数），BaaS 提供依赖设施（网关/COS/数据库） | ⭐⭐⭐ 必考 |
| 无状态设计 | 实例随时销毁，状态一律外置 DB/Redis/COS | ⭐⭐⭐ 必考 |
| 冷启动 | 空闲后重新拉环境带来的秒级延迟，优化靠减包/layer/预留并发/预热 | ⭐⭐⭐ 必考 |
| 连接复用 | 连接放 handler 外全局作用域 + 配连接池上限 | ⭐⭐ 高频 |
| 场景边界 | 无状态 + 短生命周期 + 突发流量是甜区 | ⭐⭐ 高频 |
| 成本模型 | 按调用次数 + 内存×时长计费，空闲不花钱，预留/预热要权衡 | ⭐ 加分项 |

> 💡 记住这条主线：**Serverless = FaaS（跑代码）+ BaaS（现成设施），代价是「无状态 + 冷启动 + 执行时长上限」三道约束，价值是「按量付费 + 自动伸缩」两个红利**。选型就是在约束和红利之间算账。

---

## 💡 面试核心问

- **Serverless 和 BFF 是什么关系？它解决了 BFF 的哪些运维代价？**（BFF 解决聚合逻辑，Serverless 解决 BFF 的部署扩缩容运维，把 BFF 部署到云函数）
- **FaaS 和 BaaS 分别指什么？各承担什么职责？**（FaaS 跑代码，BaaS 提供依赖设施）
- **冷启动是什么？为什么会发生？有哪些缓解手段？**（空闲回收 + 重新拉环境，减包/layer/预留并发/预热）
- **Serverless 为什么必须无状态设计？数据库连接应该怎么管理？**（实例随时销毁，状态外置；连接放全局 + 连接池上限）
- **什么场景适合上 Serverless，什么场景不适合？**（无状态/短生命周期/突发流量 vs 强状态/长连接/长时计算）

---

## 📝 思考题

Serverless 的「预留并发」本质上是用钱买冷启动延迟的下降。假设你的 BFF 聚合接口平时 QPS 不到 10，但每天有一个 1 小时的流量高峰冲到 1000 QPS——你会怎么配置预留并发？是「始终预留 100 个实例」还是「高峰前定时扩容、高峰后缩回」？提示：想想「常驻付费」和「无效预热」两个成本陷阱，以及冷启动对高峰前几分钟那一波请求的冲击。

欢迎评论区写出你的答案 👇

---

> 🔖 这是「Node.js 全栈深度拆解」系列第 11 篇。上一篇：《BFF 架构模式: API Gateway vs BFF/多端数据聚合与裁剪/Node.js 中间层实战》；下一篇预告：《MySQL 全栈: 基本使用/索引与事务最佳实践/慢查询与设计范式》
>
> 前置基础扩展阅读：搜索关键词「BFF 架构模式 API Gateway」「多进程部署 Session 共享」「Redis 连接池」
