# BFF 架构模式：API Gateway vs BFF、多端数据聚合与裁剪、Node.js 中间层实战（面试收藏级）

> **副标题**：为什么多端需要独立聚合层、BFF 与 API Gateway 的边界、聚合裁剪的具体实现手法、与 GraphQL 的分工

> 面试官说「聊聊 BFF」，多数人会脱口而出「BFF 就是给前端的后端」。但被追问一句「那它和 API Gateway 有什么区别？什么逻辑该放这层、什么不该放？」——很多人就卡住了。BFF 的难点从来不在「是什么」，而在「边界划在哪」。

---

## 🎯 这篇文章解决什么问题

你大概率已经听过 BFF（Backend for Frontend）这个词，甚至写过一些「前端和后端之间加一层」的代码。但下面几个问题，能立刻分辨出你是「用过」还是「懂了」：

- BFF 和 API Gateway 到底差在哪？能不能合并成一层？
- BFF 里到底该放什么逻辑？为什么「聚合裁剪」可以放、「处方审核规则」不该放？
- 下游某个服务超时了，BFF 怎么做到「返回部分数据」而不是整体挂掉？
- BFF 和 GraphQL 是不是在解决同一个问题？

这篇文章是「Node.js 全栈深度拆解」系列的第 10 篇。它不满足于「介绍一个概念」，而是把 BFF 当作一种**架构模式**彻底拆开：为什么需要它、边界怎么划、怎么用 Node.js 落地（两条实战主线），以及和 GraphQL 的分工。

读完你能带走三样东西：**看懂架构演进的内在逻辑、能对答 BFF 的核心面试题、能上手写一个带聚合裁剪 + 降级的 BFF 服务**。

---

## 一、使用与实践：从单体到 BFF，为什么多端需要一个聚合层

理解 BFF，最快的路径是顺着「架构演进」这条线走一遍——每一步都不是凭空出现的，都是被上一个阶段的痛点逼出来的。

### 1. 单体服务：简单，但会长成怪兽

单体服务是指一个独立的应用程序，包含所有功能和业务逻辑。这种架构在小型应用里很常见：

- 随着功能越来越多，代码库越来越大，维护越来越困难
- 整体复杂度增加，导致开发周期变长、质量下降、扩展性受限

![单体架构：浏览器直接连接 WEB 服务器，WEB 服务器直连 MySQL](https://cdn.nlark.com/yuque/0/2025/png/738210/1744943926642-6034bf14-bbe0-4a6b-a8dc-a238e3cacd4f.png)

### 2. 微服务：拆开了，但暴露了新问题

为了应对单体的问题，很多公司开始用微服务架构——把一个大应用拆成若干小服务，每个服务负责特定任务。这让开发和部署更快，可扩展性和可维护性也更好。

但拆开之后，新的问题跟着来了：

- **域名开销增加**：客户端要对接一堆服务，每个都要记住地址
- **内部服务器暴露在公网**，有安全隐患
- **各个端有大量的个性化需求**——这是 BFF 诞生的真正导火索：
  - **数据聚合**：某些功能要调用多个微服务组合
  - **数据裁剪**：后端返回的数据要过滤掉敏感字段
  - **数据适配**：后端返回 `XML`，前端要 `JSON`
  - **数据鉴权**：不同客户端有不同权限要求

![微服务架构：用户/PC 端/移动端分别直连多个微服务](https://cdn.nlark.com/yuque/0/2025/png/738210/1744943941086-08789969-647b-47e9-aa35-5932bdd5e21f.png)

注意这四件事——**聚合、裁剪、适配、鉴权**——它们就是 BFF 要干的「脏活」。先记住这四个词，后面整篇文章都在围绕它们展开。

### 3. BFF：给每个前端一个专属后端

BFF 是 `Backend for Frontend` 的缩写，专门为前端应用设计的后端服务：

- 为各个端提供**代理数据聚合、裁剪、适配和鉴权**服务，方便各端接入后端
- 把前端和微服务**解耦**，各自独立演进

![BFF 架构：PC 端和移动端各自拥有专属的 BFF 层，再访问微服务](https://cdn.nlark.com/yuque/0/2025/png/738210/1744943952092-d1776d7f-6e91-4253-ad4d-20a93955a14d.png)

### 4. 网关：横切关注点的基础设施层

API 网关是一种在应用和 API 之间提供安全访问的中间层：

- 监控 API 调用、路由请求
- 在请求和响应之间添加附加功能（身份验证、缓存、数据转换、压缩、流量控制、限流熔断、防爬虫等）
- **网关和 BFF 可能合二为一**——这句话先记住，它正是「边界」这个面试题的伏笔

![网关架构：每个端前面多了自己的网关层](https://cdn.nlark.com/yuque/0/2025/png/738210/1744943959746-9df330f3-f9fe-4527-9d68-4b906ab3e3eb.png)

### 5. 集群化：单点扛不住就横向扩展

单点服务器有几个问题：

- **单点故障**：只有一台，坏了整个系统停摆
- **计算能力有限**：无法应对大规模计算需求
- **可扩展性差**：想提升算力只能改造或替换服务器

这些问题通过**服务器集群**解决——BFF 集群 + 网关集群，横向扩展。

![集群化架构：BFF 和网关都变成集群，横向扩展](https://cdn.nlark.com/yuque/0/2025/png/738210/1744943981803-0cb927bc-9977-49ee-ba96-fc1cdf178c08.png)

### 6. 医院 HIS 三端场景：同一份数据，三种形状

架构演进讲完了，落到具体业务上看一眼 BFF 到底解决了什么。医院 HIS 系统有三个客户端，对同一个「患者详情」需求各不相同：

- **Web 管理后台**：要完整病历 + 检验报告 + 账单
- **医生端 App**：要诊断意见、检查结果等医生视角数据
- **患者端小程序**：只要姓名 / 年龄 / 当前处方三个字段

如果让三个客户端直接裸调后端微服务，会有两种糟糕解法：

- **客户端各写一遍聚合逻辑**：每个端重复造轮子，且客户端网络环境比服务端内网差，多次下游调用的往返延迟被放大
- **后端为每个端各开一套接口**：服务端代码膨胀、职责混乱

BFF 把「面向特定端的聚合裁剪逻辑」收拢到一个专属中间层，各自独立部署、独立演进。

### 7. 最小 BFF 层：Express 版聚合裁剪

先写一个最简 BFF，建立「BFF 到底在干什么」的直觉。BFF 层接收小程序端的 `GET /bff/mp/patient/:id`，内部并行调患者服务、处方服务两个下游，聚合裁剪后只返回小程序需要的字段：

```javascript
const express = require('express')
const app = express()

app.get('/bff/mp/patient/:id', async (req, res) => {
  const { id } = req.params

  // 并行调用两个下游接口，而不是串行等待拖慢响应时间
  const [patient, prescriptions] = await Promise.all([
    fetchPatientService(id),   // 患者服务
    fetchPrescriptionService(id) // 处方服务
  ])

  // BFF 的「脏活」：字段名转换 + 按端裁剪 + 只拼装小程序要的字段
  res.json({
    patientName: patient.patient_name,      // 👈 字段名转换 patient_name → patientName
    age: patient.age,
    currentPrescriptions: prescriptions.slice(0, 3) // 👈 只留当前处方，裁剪多余数据
  })
})

app.listen(3300, () => console.log('BFF listening on 3300'))
```

这个最简版只演示了「并行聚合 + 字段裁剪」两件事。等「四、实践演示与验证」里，你会看到两个完整版本：RPC 高性能版（笔记原始路线）和 NestJS 版（现代主流 + 超时降级）。

### 8. API Gateway 层的路由转发

实际架构里，请求先过 API Gateway，再按端路由到对应的 BFF。Nginx 作为网关的一层，把不同前缀的请求转发到不同的 BFF 服务：

```nginx
# 小程序端的请求 → 小程序专属 BFF
location /bff/mp/ {
    proxy_pass http://127.0.0.1:3300;
}

# Web 管理后台的请求 → Web 端 BFF
location /bff/web/ {
    proxy_pass http://127.0.0.1:3301;
}
```

看到了吗——`/bff/mp/*` 和 `/bff/web/*` 走的是**两个不同的 BFF 服务**。这正好引出一个贯穿全文的问题：为什么不是一个大 BFF 服务吞下所有端？这就是下一节「边界」要回答的。

---

## 二、设计与原理

这一节是全文面试价值最高的部分。BFF 的技术实现不难，难的是**判断「什么该放、什么不该放、边界在哪」**——这正是面试官区分「会写代码」和「有架构意识」的地方。

### 1. BFF 的核心动机：同一份能力，三种需求

不同客户端（Web / App / 小程序）对同一份后端能力的数据形状、粒度、聚合方式需求**天差地别**。如果让所有客户端直接对接后端微服务，你会陷入两难：

- **要么后端为每个端定制一批接口**——服务端代码膨胀、职责混乱
- **要么客户端自己承担聚合逻辑**——每个端重复写一遍，且客户端网络环境通常比服务端内网差，多次下游调用的往返延迟被放大

BFF 的价值，就是把「面向特定端的聚合裁剪逻辑」收拢到一个专属中间层，不与核心后端服务耦合，各自独立演进。

### 2. BFF vs API Gateway 的边界（全文核心，面试必考）

这是最容易混淆、也最常被追问的一对概念。它们的**职责层次不同**：

| 维度 | API Gateway | BFF |
|------|-------------|-----|
| 层级 | 基础设施层 | 业务聚合层 |
| 关注点 | 路由转发、鉴权、限流、日志、协议转换（**横切关注点**） | 某端要哪几个字段、从哪几个下游拿、怎么裁剪合并 |
| 懂业务吗 | 不懂具体业务字段 | 懂，与业务紧密绑定 |
| 典型形态 | Kong / Nginx+Lua / 云厂商网关 / 轻量 Node 网关 | 应用代码（Express / NestJS） |
| 谁维护 | 基础架构/平台团队 | 前端/全栈团队 |

一句话记：**API Gateway 是「管流量的」，BFF 是「管数据形状的」**。

实际架构里两者经常同时存在且分层——请求先经过 API Gateway 做鉴权限流，再路由到对应端的 BFF 做业务聚合，BFF 再调用后端微服务：

```
客户端 → API Gateway（鉴权/限流/日志）→ BFF（业务聚合/裁剪）→ 微服务
```

> 💬 **面试官**：BFF 和 API Gateway 的职责边界在哪里？两者能不能合并成一层？
>
> ✅ 标准答案：API Gateway 是基础设施层，处理鉴权、限流、路由、协议转换等**与业务无关的横切关注点**，不了解具体业务字段；BFF 是业务聚合层，知道「小程序端的患者详情要哪几个字段、从哪几个下游拿、怎么裁剪」。生产环境通常分层存在：请求先过 Gateway 做鉴权限流，再进 BFF 做业务聚合。
>
> 🎁 加分答案：能说出「可以合并，但要警惕」。早期团队规模小、端少时，把网关能力和 BFF 逻辑合在一个 Node 服务里很常见（笔记里就有一句「网关和 BFF 可能合二为一」）；但一旦多端、多团队，合并会让「横切关注点」和「业务逻辑」混在一起，网关团队和前端团队互相踩脚，最终还是要拆。判断标准是：**看维护者是不是同一拨人**——如果网关由平台团队维护、BFF 由前端团队维护，合并就是给自己埋雷。

### 3. 每端一个 BFF，还是一个 BFF 多端复用

Sam Newman 提出 BFF 概念时的原始主张是「**一个客户端团队维护一个专属 BFF**」——小程序团队维护小程序 BFF，团队边界与代码边界对齐，避免「一个共享 BFF 变成新的单体瓶颈」。

但工程实践要讲分寸。如果多个端的数据需求高度相似，也可以先用**一个 BFF 服务按路由前缀**（`/bff/web`、`/bff/mp`）区分不同端的聚合逻辑，等复杂度上升后再拆。

这是「避免过度设计」和「避免单体化」之间的权衡——团队规模小的时候，没必要一上来就拆多个服务。

> 💬 **面试官**：「一个客户端一个 BFF」和「一个 BFF 多端复用」分别适合什么规模的团队？
>
> ✅ 标准答案：Sam Newman 的原始主张是每端一个专属 BFF，让团队边界对齐代码边界；工程上小团队、端少且需求相似时，先用一个 BFF 按路由前缀区分，复杂度上升后再拆。
>
> 🎁 加分答案：能点出这个决策的**本质是「团队边界 vs 服务边界」的对齐成本**——每端一个 BFF 的代价是服务数量翻倍、部署运维成本上升；一个 BFF 多端复用的代价是「共享单体」的隐患。判断信号是：**当两个端的聚合逻辑开始互相迁就（改这个端要顾虑那个端），就该拆了**。

### 4. 聚合裁剪的四种实现手法

BFF 的核心工作就是「聚合 + 裁剪」，工程上有四种标准手法：

- **并行调用下游**：用 `Promise.all` 避免串行往返延迟叠加（呼应第 01 篇 Promise 并发聚合）
- **超时与降级**：某个下游慢或挂了，用 `Promise.allSettled` 或超时 race，返回「部分数据 + 错误标记」而不是整体挂掉
- **响应缓存**：对变化不频繁的聚合结果做短 TTL 缓存，减少下游压力
- **字段级裁剪**：按客户端类型 / 用户角色动态决定返回哪些字段，而不是让下游服务承担这个逻辑

这四种手法里，**超时降级**是面试最爱挖的，因为它是「BFF 在分布式环境下怎么保持可用性」的关键，第四部分会用 NestJS 完整实现一遍。

### 5. BFF 不该做什么（最容易踩偏的边界）

BFF 只做**数据形状适配和轻量聚合**。核心业务逻辑（如处方审核规则、库存扣减）**不应该下沉到 BFF 层**——否则业务逻辑会散落在多个 BFF 服务里，造成维护梦魇。

这是「聚合裁剪」和「业务逻辑」的边界判断，也是 BFF 模式在生产实践中**最容易踩偏**的地方。判断标准很简单：**问自己「这段逻辑如果被两个端同时需要，它应该在哪？」，答案如果是「后端核心服务」，就别放进 BFF**。

> 💬 **面试官**：BFF 层能放业务逻辑吗？
>
> ✅ 标准答案：能放「面向端的数据形状适配和轻量聚合」，不能放「核心业务规则」。字段转换、多接口合并、按角色裁剪敏感字段这些可以；处方审核规则、库存扣减这类核心业务必须留在后端服务，否则多个 BFF 各自复制一份业务逻辑，改一处漏一处。
>
> 🎁 加分答案：能给出一个具体判断标准——**「这段逻辑如果换一个端还要不要用」**。处方审核规则无论 Web 还是小程序都要用，属于核心业务，放 BFF 就错了；而「小程序端患者详情只展示三个字段」这种形状适配，只有小程序端要，放 BFF 才合适。

### 6. 与 GraphQL 的关系：同一问题的两种解法

GraphQL 可以看作「用统一 Schema + 客户端自定义查询」取代「为每个端手写一套 REST 聚合接口」。本质上是同一个问题（多端按需获取聚合数据）的两种解法：

- **手写 BFF REST 接口**：显式、命令式的——每个端一个或几个专属 endpoint，裁剪逻辑写死在代码里
- **GraphQL**：声明式的——一个 Schema，客户端自己声明要什么字段，把「裁剪」的控制权交给客户端而不是后端预先写死

选型的分界也很清晰：

- **中小型项目 / 端少、需求差异不大** → 手写 BFF 更简单直接
- **端多、字段需求碎片化严重** → GraphQL 的按需查询能力优势更明显

> 本篇讲「BFF 作为一种架构模式本身」——为什么插这一层、该放什么、不该放什么。GraphQL 是实现 BFF 聚合能力的其中一种技术方案（用统一 Schema 替代手写聚合接口），具体的 Resolver / DataLoader 实现细节见第 15 篇，本篇不重复讲。

> 💬 **面试官**：BFF 和 GraphQL 解决的是不是同一个问题？什么场景下手写 BFF 比上 GraphQL 更合适？
>
> ✅ 标准答案：是同一问题的两种解法——都是「多端按需获取聚合数据」。手写 BFF 是命令式的，GraphQL 是声明式的。端少、需求差异不大、团队对 GraphQL 不熟时，手写 BFF 更简单；端多、字段碎片化严重时 GraphQL 优势更明显。
>
> 🎁 加分答案：能点出两者不是非此即彼——**GraphQL 本身往往就充当了 BFF 那一层**（GraphQL Gateway）。真正的权衡是「裁剪控制权放在后端（手写）还是客户端（GraphQL）」：手写 BFF 的控制权在服务端、演进要改代码；GraphQL 把「要什么字段」的控制权交给客户端，但代价是引入 Schema 管理、Resolver、N+1 等新复杂度。

### 7. 对比前端：BFF 是「前端转全栈」的第一站

前端团队对 BFF 概念天然敏感，因为 BFF 通常就是前端/全栈团队自己维护的一层（不像核心后端服务归后端团队）。这也是「前端转全栈」最常见的第一个后端项目类型——理解 BFF 的边界，有助于理解「全栈」具体全在哪个栈的哪一层：**前端团队的全栈，往往先「全」在 BFF 这一层**。

### 8. BFF 的运维代价：引出下一站

BFF 解决了多端聚合，但也带来了新成本：复杂度增加、性能风险、安全风险、维护成本、测试复杂度，以及**运维要求**——需要强大的日志、服务器监控、性能监控、负载均衡、备份冗灾、监控报警和弹性伸缩扩容。

这套运维成本，正是 **Serverless**（FaaS + BaaS）要解决的问题——把部署、扩缩容、运维、监控报警交给云厂商。这是第 11 篇的主题，本篇点到为止。

---

## 三、工程落地参考

BFF 模式的概念溯源，理解它为什么长成今天这样：

- Sam Newman 提出 BFF 模式的原始文章与 SoundCloud 团队的实践案例（概念溯源，非代码仓库）
- Netflix / Spotify 等公司公开分享的「每端一个 BFF」架构演进案例，理解团队规模与 BFF 拆分粒度的关系
- apollographql 官方博客中「BFF vs GraphQL Gateway」的选型讨论，理解两种技术方案的定位差异

搜索关键词：Sam Newman BFF 原文、Azure Backends for Frontends 模式、Apollo GraphQL Federation。

---

## 四、实践演示与验证（双主线）

这一节是全文的落地部分，两条主线：

- **主线一**：RPC 高性能 BFF（sofa-rpc-node + Zookeeper），企业级 Java 生态那套在 Node 里的落地，笔记原始内容完整保留
- **主线二**：NestJS BFF 聚合 + 超时降级，现代 Node 全栈主流写法，也是大纲要求的实战重点

---

### 主线一：RPC 高性能 BFF 实战（sofa-rpc-node + Zookeeper）

#### 前置概念

先补齐几个概念，后面的代码才有上下文：

- **微服务**：架构模式，把单个应用划分为小服务，每个服务独立运行、可用不同语言开发；服务间需要通信协议
- **RPC（Remote Procedure Call）**：远程过程调用，允许程序在不同机器上调用远程过程，像调用本地过程一样。**RPC 比 HTTP 延迟更低、性能更高**，所以微服务内部通信多用 RPC
- **sofa-rpc-node**：基于 Node.js 的 RPC 框架，支持多种协议
- **Protocol Buffers（protobuf）**：Google 开发的序列化格式，把结构化数据序列化成二进制，跨语言使用
- **Zookeeper**：分布式协调服务，提供配置维护、名字服务、组服务等；在 RPC 体系里扮演**注册中心**，维护服务注册信息，帮助服务节点和客户端找到对方

#### Zookeeper 安装与启动

- 下载安装包、解压、配置环境变量
- 修改配置文件 `conf/zoo.cfg`

```diff
+dataDir=./data
```

- 启动服务

```shell
./zookeeper/bin/zkServer.sh start
```

#### 创建用户微服务

安装依赖：

```shell
pnpm init
pnpm add mysql2 sofa-rpc-node
```

配置脚本：

```json
{
  "name": "user",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "start": "nodemon src/index.js",
    "test": "node src/client.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.5.2",
  "dependencies": {
    "mysql2": "^3.14.0",
    "sofa-rpc-node": "^2.10.0"
  }
}
```

服务端 `server`：

```javascript
const { server: { RpcServer }, registry: { ZookeeperRegistry } }  = require('sofa-rpc-node');
const mysql = require('mysql2/promise')

// 设置日志记录器
const logger = console;
let connection = null;

// 创建 Zookeeper 注册中心实例
const registry = new ZookeeperRegistry({
  logger,
  address: '127.0.0.1:2181',
  timeout: 1000 * 60 * 60 * 24,
});

// 创建 RPC 服务端实例
const server = new RpcServer({
  logger,
  registry,
  port: 12200,
});

// 添加服务接口
server.addService({
  interfaceName: 'com.g.bff.user',
}, 
{
  async getUserInfo(userId) {
    const [rows] = await connection.execute(`SELECT id,username,avatar,password,phone FROM user WHERE id=${userId} limit 1`);
    return rows[0];
  }
});

// 启动 RPC 服务端，并发布服务
async function start() {
  connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'root123456',
    database: 'bff',
  });
  await server.start();
  await server.publish();
  console.log('用户微服务发布成功');
}

start();
```

客户端 `client`：

```javascript
const { client: { RpcClient }, registry: { ZookeeperRegistry } } = require('sofa-rpc-node');

// 设置日志记录器
const logger = console;

// 创建 Zookeeper 注册中心
const registry = new ZookeeperRegistry({
  logger,
  address: '127.0.0.1:2181',
});

async function invoke() {
  // 创建 RPC 客户端
  const client = new RpcClient({ logger, registry });
  // 创建 RPC 服务消费者
  const consumer = client.createConsumer({
    // 指定服务接口名称
    interfaceName: 'com.g.bff.user',
  });
  // 等待服务就绪
  await consumer.ready();
  // 调用服务方法
  const result = await consumer.invoke('getUserInfo', [1], { responseTimeout: 3000 });
  // 输出结果
  console.log(result);
}

invoke().catch(console.error);
```

测试：

```shell
# 启动服务端
pnpm start
# 启动客户端
pnpm client
```

#### 创建文章微服务

安装依赖：

```shell
pnpm init
pnpm add mysql2 sofa-rpc-node
```

服务端 `server`（提供 `getPostList` 接口）：

```javascript
const { server: { RpcServer }, registry: { ZookeeperRegistry } } = require('sofa-rpc-node');
const mysql = require('mysql2/promise');
let connection;
// 引入 console 模块
const logger = console;
// 创建 Zookeeper 注册中心实例，传入地址为 '127.0.0.1:2181'
const registry = new ZookeeperRegistry({
    logger,
    address: '127.0.0.1:2181',
    connectTimeout: 1000 * 60 * 60 * 24,
});
// 创建 RPC 服务器实例，传入注册中心和端口号
const server = new RpcServer({
    logger,
    registry,
    port: 20000
});
// 添加服务接口，实现 getPostList 方法（返回文章列表，与 BFF 层的调用保持一致）
server.addService({
    interfaceName: 'com.g.bff.post'
}, {
    async getPostList(userId) {
        const [rows] = await connection.execute(`SELECT id, title, content FROM post WHERE user_id = ?`, [userId]);
        return rows;
    }
});
// 启动 RPC 服务器，并发布服务
(async function () {
    connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'bff'
    });
    await server.start();
    await server.publish();
    console.log(`文章微服务发布成功`);
})();
```

客户端 `client`：

```javascript
const { client: { RpcClient }, registry: { ZookeeperRegistry } } = require('sofa-rpc-node');
// 设置日志记录器
const logger = console;
// 创建 Zookeeper 注册中心
const registry = new ZookeeperRegistry({
    logger,
    address: '127.0.0.1:2181',
});
(async function () {
    // 创建 RPC 客户端
    const client = new RpcClient({ logger, registry });
    // 创建 RPC 服务消费者
    const consumer = client.createConsumer({
        // 指定服务接口名称
        interfaceName: 'com.g.bff.post'
    });
    // 等待服务就绪
    await consumer.ready();
    // 调用服务方法
    const result = await consumer.invoke('getPostList', [1], { responseTimeout: 3000 });
    // 输出结果
    console.log(result);
    process.exit(0);
})()
```

测试：

```shell
# 启动服务端
pnpm start
# 启动客户端
pnpm client
```

#### 创建 BFF 层

安装依赖：

```shell
pnpm add express morgan sofa-rpc-node
```

脚本配置：

```json
{
  "name": "bff",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "pm2 start src/index.js --name bff"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.5.2",
  "dependencies": {
    "compression": "^1.8.0",
    "express": "^5.1.0",
    "morgan": "^1.10.0",
    "sofa-rpc-node": "^2.10.0"
  }
}
```

BFF 服务端 `server`：

```javascript
const express = require('express');
const morgan = require('morgan');
const rpcMiddleware = require('../middleware/rpc');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(rpcMiddleware({
  //配置 rpc 中间件的参数，表示要调用的 rpc 接口名称
  interfaceNames: [
    'com.g.bff.user',
    'com.g.bff.post'
  ]
}));

app.get('/', async (req, res) => {
  const { userId } = req.query;
  const { user, post } = res?.rpcConsumers || {};
  const [userInfo, postList] = await Promise.all([
    user.invoke('getUserInfo', [userId]),
    post.invoke('getPostList', [userId])
  ]);
  // 裁剪数据
  Reflect.deleteProperty(userInfo, 'password');
  // 数据脱敏
  Reflect.set(userInfo, 'phone', userInfo.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'))
  res.json({
    userInfo,
    postList
  });
});

app.listen(3300, () => {
  console.log('Example app listening on port 3300!');
});
```

这段代码就是 BFF「脏活」的完整示范：

- `Promise.all` **并行调用**两个下游 RPC 接口
- `Reflect.deleteProperty(userInfo, 'password')` 做**字段裁剪**，删掉敏感密码
- `phone.replace(...)` 做**数据脱敏**，手机号中间四位变 `****`

rpc 中间件：

```javascript
const { client: { RpcClient }, registry: { ZookeeperRegistry } } = require('sofa-rpc-node');
const rpcMiddleware = (options) => {
  return async (req, res, next) => {
    const logger = options.logger || console;
    //创建 ZookeeperRegistry 类的实例，用于管理服务发现和注册
    const registry = new ZookeeperRegistry({
      logger,
      address: options.address || '127.0.0.1:2181',
    });
    //创建 RpcClient 类的实例，用于发送 rpc 请求
    const client = new RpcClient({ logger, registry });
    const interfaceNames = options.interfaceNames || [];
    const rpcConsumers = {};
    for (let i = 0; i < interfaceNames.length; i++) {
      const interfaceName = interfaceNames[i];
      //使用 RpcClient 的 createConsumer 方法创建 rpc 消费者
      const consumer = client.createConsumer({
        interfaceName,
      });
      //等待 rpc 消费者准备完毕
      await consumer.ready();
      rpcConsumers[interfaceName.split('.').pop()] = consumer;
    }
    res.rpcConsumers = rpcConsumers;
    await next();
  };
};
module.exports = rpcMiddleware;
```

catch 中间件（捕获下游 RPC 调用的异常，返回友好错误而不是让进程崩溃）：

```javascript
const catchMiddleware = () => {
  return async (req, res, next) => {
    try {
      await next()
    } catch (err) {
      console.error('BFF error:', err)
      res.status(500).json({
        code: 500,
        message: err.message || 'Internal Server Error'
      })
    }
  }
}

module.exports = catchMiddleware;
```

> 💬 **面试官**：BFF 调下游服务，用 RPC 还是 HTTP？为什么大厂 BFF 多用 RPC？
>
> ✅ 标准答案：内部微服务间通信优先 RPC，因为它延迟更低、性能更高（二进制序列化 + 连接复用），HTTP 每次请求有更重的协议开销。BFF 对客户端暴露 HTTP/REST，对下游内部服务用 RPC，这是常见分层。
>
> 🎁 加分答案：能说出 RPC 的代价——它把「调用方和被调用方」强耦合在同一套服务发现（Zookeeper）和接口定义（interfaceName）体系里，跨语言、跨团队、跨公网调试都比 HTTP 麻烦。所以「对内 RPC、对外 HTTP」是主流，而不是「所有调用都用 RPC」。

---

### 主线二：NestJS BFF 聚合 + 超时降级（现代主流）

RPC 那套更偏企业级 Java 生态迁移。现代 Node 全栈团队更多用 NestJS 搭 BFF——依赖注入、模块化、TypeScript 类型安全，第 09 篇已经讲过它的骨架。这里聚焦 BFF 真正难的地方：**并行聚合 + 字段裁剪 + 超时降级**。

#### 下游 mock：患者服务 + 处方服务

先起两个本地 Express 服务模拟下游。患者服务（返回 `patient_name` 这种下划线命名，用来演示字段名转换）：

```javascript
// patient-service.js
const express = require('express')
const app = express()

app.get('/patients/:id', (req, res) => {
  res.json({
    patient_name: '张伟',          // 👈 下划线命名，前端要 camelCase
    age: 42,
    gender: 'M',
    diagnosis: '疑似上呼吸道感染',   // 👈 敏感：患者端不该看到诊断意见
    doctor_private_note: '家属情绪较激动，注意沟通方式' // 👈 更敏感：医生私人备注
  })
})

app.listen(4001, () => console.log('patient-service on 4001'))
```

处方服务（返回处方数组）：

```javascript
// prescription-service.js
const express = require('express')
const app = express()

app.get('/prescriptions/:patientId', (req, res) => {
  res.json([
    { name: '阿莫西林胶囊', dosage: '0.5g 每日三次' },
    { name: '布洛芬缓释片', dosage: '0.3g 每日两次' }
  ])
})

app.listen(4002, () => console.log('prescription-service on 4002'))
```

#### NestJS 骨架

`PatientService` 负责调下游并做聚合裁剪，`PatientController` 暴露路由。复用第 09 篇的模块化结构：

```typescript
// patient.service.ts
import { Injectable } from '@nestjs/common'

@Injectable()
export class PatientService {
  // 调患者服务，内部做字段名转换 + 裁剪敏感字段
  private async fetchPatient(id: string) {
    const res = await fetch(`http://localhost:4001/patients/${id}`)
    return res.json()
  }

  private async fetchPrescriptions(id: string) {
    const res = await fetch(`http://localhost:4002/prescriptions/${id}`)
    return res.json()
  }

  async getMpPatientDetail(id: string) {
    // Promise.all 并行调两个下游，避免串行往返延迟叠加
    const [patient, prescriptions] = await Promise.all([
      this.fetchPatient(id),
      this.fetchPrescriptions(id)
    ])

    // BFF 的「脏活」：字段名转换 + 按端裁剪，只拼小程序要的字段
    return {
      patientName: patient.patient_name,   // 👈 patient_name → patientName
      age: patient.age,
      currentPrescriptions: prescriptions.map(p => p.name) // 👈 只留药名，裁剪 dosage
    }
  }
}
```

```typescript
// patient.controller.ts
import { Controller, Get, Param } from '@nestjs/common'
import { PatientService } from './patient.service'

@Controller('bff/mp')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get('patient/:id')
  getMpPatientDetail(@Param('id') id: string) {
    return this.patientService.getMpPatientDetail(id)
  }
}
```

```typescript
// patient.module.ts —— 把 Service 和 Controller 装进一个模块，复用第 09 篇的模块化结构
import { Module } from '@nestjs/common'
import { PatientController } from './patient.controller'
import { PatientService } from './patient.service'

@Module({
  controllers: [PatientController],
  providers: [PatientService],
})
export class PatientModule {}
```

```typescript
// main.ts —— 应用入口，启动 Nest 应用并监听端口
import { NestFactory } from '@nestjs/core'
import { PatientModule } from './patient.module'

async function bootstrap() {
  const app = await NestFactory.create(PatientModule)
  await app.listen(3300)
  console.log('BFF (NestJS) listening on http://localhost:3300')
}
bootstrap()
```

对比一下 RPC 版的裁剪：这里字段名转换（`patient_name → patientName`）、字段裁剪（只留 `patientName/age/currentPrescriptions`）、敏感字段剔除（不返回 `diagnosis` 和 `doctor_private_note`）三件事都在 BFF 层完成，下游服务完全不知道「小程序端长什么样」。

#### 超时降级：下游挂了，返回部分数据而不是整体失败

这是 BFF 最有区分度的能力。用 `Promise.all` 时，任何一个下游 reject，整个请求就失败。但小程序端「姓名 + 年龄」可能来自患者服务，「当前处方」来自处方服务——处方服务挂了，至少姓名年龄还能展示。

用 `Promise.allSettled` 让每个下游独立决议，再按结果拼装，挂掉的部分打错误标记：

```typescript
async getMpPatientDetailWithFallback(id: string) {
  // allSettled：每个下游独立决议，任何一个失败都不会拖垮整体
  const [patientResult, rxResult] = await Promise.allSettled([
    this.withTimeout(this.fetchPatient(id), 2000),
    this.withTimeout(this.fetchPrescriptions(id), 2000)
  ])

  const data: { patientName?: string; age?: number; currentPrescriptions?: string[] } = {}
  const errors: string[] = []

  if (patientResult.status === 'fulfilled') {
    const patient = patientResult.value
    data.patientName = patient.patient_name
    data.age = patient.age
  } else {
    errors.push('患者服务不可用')        // 👈 错误标记，而不是整体报错
  }

  if (rxResult.status === 'fulfilled') {
    data.currentPrescriptions = rxResult.value.map(p => p.name)
  } else {
    errors.push('处方服务不可用')
  }

  // 返回部分数据 + 错误标记，前端可以降级展示
  return { data, errors }
}

// 给下游调用套一个超时，超过 ttl 毫秒就 reject
private withTimeout<T>(promise: Promise<T>, ttl: number): Promise<T> {
  let timer: NodeJS.Timeout
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('downstream timeout')), ttl)
  })
  // finally 里清理定时器，避免超时后定时器悬挂、以及下游稍后 reject 触发未处理拒绝
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}
```

这段代码展示了完整的降级链路：

- `Promise.allSettled` 让每个下游**独立决议**，互不拖累
- `withTimeout` 用 `Promise.race` 给每个下游**套超时**，防止某个下游无限挂起
- 返回体是 `{ data, errors }`——**部分数据 + 错误标记**，前端据此降级展示

> 💬 **面试官**：BFF 聚合下游接口时，某个下游超时或报错了怎么处理？
>
> ✅ 标准答案：用 `Promise.allSettled` 让每个下游独立决议，而不是 `Promise.all` 一票否决；再给每个下游套超时（`Promise.race`），返回「部分数据 + 错误标记」，让前端降级展示而不是整体失败。
>
> 🎁 加分答案：能区分 `all` 和 `allSettled` 的适用场景——**「缺一不可」的下游用 `all`（比如患者详情缺了基本信息就完全没法展示），「允许部分失败」的下游用 `allSettled`**。还能补一句：超时控制要有区分度，核心字段的服务超时设短、非核心设长；并且 `errors` 标记要结构化（哪个服务、什么错误），方便前端精确降级和告警。

---

### 缓存：多级缓存（LRU + Redis）

BFF 承担大量请求转发和数据转换，用多级缓存能减少对后端系统的访问，提高响应速度。请求进来时：先查内存缓存 → 命中直接返回；没有就查 Redis → 命中返回并写回内存；都没有才调后端，结果写回 Redis 和内存。

- **多级缓存（multi-level cache）**：多个缓存层存储数据，优先级依次递减，最快的在最顶层
- **LRU（Least Recently Used）**：最近最少使用淘汰算法，保留最近用过的、淘汰最少用的，最大化命中率
- **Redis**：开源内存数据存储，可作数据库、缓存、消息中间件；`ioredis` 是 Node.js 的 Redis 客户端

缓存中间件：

```javascript
const { LRUCache } = require('lru-cache');
const Redis = require('ioredis');

// 创建缓存存储实例
class CacheStore {
  constructor(options) {
    this.stores = [];
  }
  add(store) {
    this.stores.push(store);
    return this;
  }
  async get(key) {
    for (const store of this.stores) {
      const value = await store.get(key);
      if (value) {
        return value;
      }
    }
  }
  async set(key, value) {
    for (const store of this.stores) {
      await store.set(key, value);
    }
  }
}

// 内存缓存
class MemoryStore {
  constructor(options = {
    max: 100, // 最大缓存数量
    ttl: 1000 * 60 * 5 // 缓存过期时间，单位为毫秒，设置为 5 分钟，一般来说上层的时间越短
  }) {
    this.cache = new LRUCache(options);
  }
  async get(key) {
    return await this.cache.get(key);
  }
  async set(key, value, ttl) {
    await this.cache.set(key, value, ttl);
  }
}

// Redis 缓存
class RedisStore {
  constructor(options = {
    host: '127.0.0.1',
    port: 6379,
    db: 0,
    password: null,
    keyPrefix: ''
  }) {
    this.client = new Redis(options);
  }
  async get(key) {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : undefined;
  }
  async set(key, value) {
    await this.client.set(key, JSON.stringify(value));
    await this.client.expire(key, 60 * 10); // 缓存过期时间，单位为秒，这里设置为 10 分钟
  }
}

const cacheMiddleware = (options ={}) => {
  return  async (req, res, next) => {
    // 创建缓存存储实例
    const cacheStore = new CacheStore();
    // 添加内存缓存
    cacheStore.add(new MemoryStore());
    // 添加 Redis 缓存
    const redisStore = new RedisStore(options);
    cacheStore.add(redisStore);
    // 将缓存存储实例添加到响应对象中
    res.cache = cacheStore;
    await next();
  }
};

module.exports = cacheMiddleware;
```

BFF 服务端接入缓存：

```javascript
const express = require('express');
const morgan = require('morgan');
const rpcMiddleware = require('../middleware/rpc');
const catchMiddleware = require('../middleware/catch');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(rpcMiddleware({
  //配置 rpc 中间件的参数，表示要调用的 rpc 接口名称
  interfaceNames: [
    'com.g.bff.user',
    'com.g.bff.post'
  ]
}))
app.use(catchMiddleware());

app.get('/', async (req, res) => {
  const { userId } = req.query;
  const { user, post } = res?.rpcConsumers || {};

  const cacheKey = `${req.method}-${req.path}-${userId}`;
  let cacheData = await res.cache.get(cacheKey);
  if (cacheData) {
    return res.json(cacheData);
  }

  const [userInfo, postList] = await Promise.all([
    user.invoke('getUserInfo', [userId]),
    post.invoke('getPostList', [userId])
  ]);
  // 裁剪数据
  Reflect.deleteProperty(userInfo, 'password');
  // 数据脱敏
  Reflect.set(userInfo, 'phone', userInfo.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'));
  // 数据适配
  // userInfo.avatar = "http://www.zhufengpeixun.cn/" + userInfo.avatar;
  cacheData = {
    userInfo,
    postList
  };
  await res.cache.set(cacheKey, cacheData);
  res.json({
    userInfo,
    postList
  });
});

app.listen(3300, () => {
  console.log('Example app listening on port 3300!');
});
```

缓存的 key 是 `method-path-userId`，命中直接返回，未命中才调下游并写回缓存。注意注释里那句「数据适配」——`avatar` 字段拼接 CDN 域名，就是第二节说的「适配」脏活。

---

### 消息队列：RabbitMQ 解耦

消息队列（Message Queue）在分布式系统中传递数据，把消息发送者和接收者解耦，让生产和消费可以独立开发和部署。BFF 用消息队列有几个原因：

- **大并发**：请求写入队列，后端从队列读取处理，削平高峰
- **解耦**：BFF 不关心后端具体实现，只管把请求丢进队列
- **异步**：BFF 写队列后立即返回，后端后台处理
- **流量削峰**：缓解瞬时高峰压力

`RabbitMQ` 是消息代理，工作流程：生产者发消息到服务器 → 服务器保存到队列 → 消费者从队列读取 → 消费完删除消息。

BFF 服务端（发送日志到 RabbitMQ）：

```javascript
const express = require('express');
const morgan = require('morgan');
const rpcMiddleware = require('../middleware/rpc');
const catchMiddleware = require('../middleware/catch');
const mqMiddleware = require('../middleware/mq');
require('./logger'); // 引入日志中间件

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// 配置 rpc 中间件
app.use(rpcMiddleware({
  //配置 rpc 中间件的参数，表示要调用的 rpc 接口名称
  interfaceNames: [
    'com.g.bff.user',
    'com.g.bff.post'
  ]
}))

// 配置 catch 中间件
app.use(catchMiddleware());

// 配置 mq 中间件
app.use(mqMiddleware({
  url: 'amqp://localhost'
}));

app.get('/', async (req, res) => {
  const { userId } = req.query;

  // 发送日志到 RabbitMQ
  res.channels.logger.sendToQueue('logger', Buffer.from(JSON.stringify({
    method: req.method,
    path: req.path,
    userId
  })));

  const { user, post } = res?.rpcConsumers || {};

  // 缓存数据
  const cacheKey = `${req.method}-${req.path}-${userId}`;
  let cacheData = await res.cache.get(cacheKey);
  if (cacheData) {
    return res.json(cacheData);
  }

  // 调用 rpc 接口
  const [userInfo, postList] = await Promise.all([
    user.invoke('getUserInfo', [userId]),
    post.invoke('getPostList', [userId])
  ]);

  // 数据处理
  if(userInfo) {
    // 裁剪数据
    Reflect.deleteProperty(userInfo, 'password');
    // 数据脱敏
    Reflect.set(userInfo, 'phone', userInfo.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'));
    // 数据适配
    // userInfo.avatar = "http://www.zhufengpeixun.cn/" + userInfo.avatar;
  }

  // 缓存数据
  cacheData = {
    userInfo,
    postList
  };
  await res.cache.set(cacheKey, cacheData);

  // 返回数据
  res.json(cacheData);
});

app.listen(3300, () => {
  console.log('Example app listening on port 3300!');
});
```

mq 中间件：

```javascript
const amqp = require('amqplib');

const mqMiddleware = (options = {}) => {
  return async (req, res, next) => {
    //使用 amqp.connect 方法连接 RabbitMQ 服务器
    const rabbitMQClient = await amqp.connect(options.url || 'amqp://localhost');
    //使用 rabbitMQClient 的 createChannel 方法创建 RabbitMQ 通道
    const logger = await rabbitMQClient.createChannel();
    //使用 logger 的 assertQueue 方法创建名为 "logger" 的队列，如果队列已经存在则不会重复创建
    await logger.assertQueue('logger', { durable: true });
    res.channels = {
      logger
    }
    await next();
  }
}

module.exports = mqMiddleware;
```

日志消费者：

```javascript
const amqplib = require('amqplib');
const fs = require('fs-extra');
const path = require('path');

(async () => {
  // 创建 RabbitMQ 连接和通道
  const conn = await amqplib.connect('amqp://localhost');
  // 创建日志队列
  const loggerChannel = await conn.createChannel();
  // 创建队列
  await loggerChannel.assertQueue('logger');
  // 监听队列
  loggerChannel.consume('logger', async (event) => {
    const message = JSON.parse(event.content.toString());
    await fs.appendFile(path.join(__dirname, '..', 'log','logger.txt'), JSON.stringify(message) + '\n');
  });
})();
```

到这里，一个完整的 BFF 已经具备：**RPC 聚合 + 字段裁剪脱敏 + 多级缓存 + 消息队列日志**。这是笔记原始路线走完的完整形态。

> 注：笔记里的「Serverless 实战 BFF」小节（BFF 的问题清单 + FaaS/BaaS + 优势与缺点）整体迁移到第 11 篇 Serverless 篇，本篇不重复展开。

---

## 五、参考资料

- https://samnewman.io/patterns/architectural/bff/
- https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends
- https://www.apollographql.com/blog/backend-for-frontend-pattern-with-graphql-federation
- https://www.npmjs.com/package/sofa-rpc-node
- https://zookeeper.apache.org/

---

## 💡 面试核心问

- **为什么需要 BFF 层？直接让客户端调用后端微服务会有什么问题？**（多端数据形状差异；要么后端为每端定制接口导致膨胀，要么客户端各自重复聚合且网络环境差）
- **BFF 和 API Gateway 的职责边界在哪里？两者能不能合并成一层？**（基础设施层 vs 业务聚合层；小团队可合并，多端多团队要拆）
- **「一个客户端一个 BFF」和「一个 BFF 多端复用」分别适合什么规模的团队？**（团队边界对齐 vs 避免过度设计）
- **BFF 层聚合下游接口时，怎么处理某个下游服务超时或报错的情况？**（`Promise.allSettled` + 超时 race，返回部分数据 + 错误标记）
- **BFF 和 GraphQL 解决的是不是同一个问题？什么场景下手写 BFF 比上 GraphQL 更合适？**（同一问题两种解法；端少需求简单时手写 BFF 更直接）

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 面试频率 |
|--------|-----------|---------|
| BFF 定义 | 给特定前端定制的后端，做聚合/裁剪/适配/鉴权 | ⭐⭐⭐ 必考 |
| BFF vs Gateway | 网关管流量（横切），BFF 管数据形状（业务） | ⭐⭐⭐ 必考 |
| 每端 vs 复用 | 团队边界对齐 vs 避免过度设计，信号是「开始互相迁就就拆」 | ⭐⭐ 高频 |
| 四种聚合手法 | 并行 / 超时降级 / 缓存 / 字段裁剪 | ⭐⭐⭐ 必考 |
| BFF 边界 | 只做数据形状适配，不做核心业务规则 | ⭐⭐ 高频 |
| 与 GraphQL 分工 | 同一问题两种解法，手写命令式 vs 声明式 | ⭐⭐ 高频 |

> 💡 记住这条主线：**多端数据形状差异 → 抽出 BFF 聚合层 → 划清与 Gateway/业务逻辑的边界 → 用并行 + 降级 + 缓存 + 裁剪落地**。BFF 的价值不在「多写一层代码」，而在「把面向特定端的适配逻辑，收拢到离前端最近、又独立于核心后端的那一层」。

---

## 📝 思考题

BFF 聚合了 3 个下游接口，其中一个下游挂了。你会用 `Promise.allSettled` 返回部分数据，还是用 `Promise.all` 让整个请求失败？

提示：没有标准答案，取决于「挂了的下游」是不是这个页面**缺一不可**的数据。患者详情页里，「基本信息」挂了基本没法展示，适合 `all` 快速失败；「相似药品推荐」挂了，患者姓名年龄处方都还在，适合 `allSettled` 降级。真正考验架构功底的是——你**能不能说清楚每个下游的「可降级性」，并把它设计成结构化的错误标记**，而不是一刀切。

欢迎评论区写出你的决策依据 👇

---

> 🔖 这是「Node.js 全栈深度拆解」系列第 10 篇。上一篇：《NestJS+TypeScript: IoC/DI/装饰器元编程/模块化企业级架构》；下一篇预告：《Serverless 架构：云函数/API 网关/部署形态演进》
>
> 前置基础扩展阅读：搜索关键词「Node.js Promise 并发聚合 Promise.all allSettled」「NestJS 依赖注入 模块化架构」「Express 中间件链」
