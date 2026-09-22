# <font style="color:rgb(51, 51, 51);">BFF架构演进</font>
### <font style="color:rgb(51, 51, 51);">2.1 单体服务</font>
+ <font style="color:rgb(51, 51, 51);">单体服务是指一个独立的应用程序，包含了所有的功能和业务逻辑。这种架构方式在小型应用程序中很常见</font>
+ <font style="color:rgb(51, 51, 51);">随着应用程序的功能越来越多，代码库也会越来越大，维护起来也会变得更加困难。此外，单体服务的整体复杂度也会增加，这可能导致软件开发周期变长，质量下降，并且系统的扩展性也会受到限制</font>

<!-- 这是一张图片，ocr 内容为：,., --,. ......... MYSQL 浏览器 WEB服务器 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1744943926642-6034bf14-bbe0-4a6b-a8dc-a238e3cacd4f.png)

### <font style="color:rgb(51, 51, 51);">2.2 微服务</font>
+ <font style="color:rgb(51, 51, 51);">为了应对这些问题，许多公司开始使用微服务架构。微服务是指将一个大型应用程序拆分成若干个小型服务，每个服务负责执行特定的任务。这种架构方式可以帮助公司更快地开发和部署新功能，并提高系统的可扩展性和可维护性</font>
+ <font style="color:rgb(51, 51, 51);">这种方式会有以下问题</font>
    - <font style="color:rgb(51, 51, 51);">域名开销增加</font>
        * <font style="color:rgb(51, 51, 51);">内部服务器暴露在公网，有安全隐患</font>
        * <font style="color:rgb(51, 51, 51);">各个端有大量的个性化需求</font>
            + <font style="color:rgb(51, 51, 51);">数据聚合 某些功能可能需要调用多个微服务进行组合</font>
                - <font style="color:rgb(51, 51, 51);">数据裁剪 后端服务返回的数据可能需要过滤掉一些敏感数据</font>
                - <font style="color:rgb(51, 51, 51);">数据适配 后端返回的数据可能需要针对不同端进行数据结构的适配，后端返回</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">XML</font>`<font style="color:rgb(51, 51, 51);">，但前端需要</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">JSON</font>`
                - <font style="color:rgb(51, 51, 51);">数据鉴权 不同的客户端有不同的权限要求</font>

<!-- 这是一张图片，ocr 内容为：用户 微服务 创作 PC端 微服务 MYSQL 关注 微服务 移动端 收藏 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1744943941086-08789969-647b-47e9-aa35-5932bdd5e21f.png)

### <font style="color:rgb(51, 51, 51);">2.3 BFF</font>
+ <font style="color:rgb(51, 51, 51);">BFF是</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Backend for Frontend</font>`<font style="color:rgb(51, 51, 51);">的缩写，指的是专门为前端应用设计的后端服务</font>
+ <font style="color:rgb(51, 51, 51);">主要用来为各个端提供代理数据聚合、裁剪、适配和鉴权服务，方便各个端接入后端服务</font>
+ <font style="color:rgb(51, 51, 51);">BFF可以把前端和微服务进行解耦，各自可以独立演进</font>

<!-- 这是一张图片，ocr 内容为：用户 PC端 微服务 BFF PC端 创作 微服务 MYSQU 关注 移动端 微服务 BFF 移动端 收藏 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1744943952092-d1776d7f-6e91-4253-ad4d-20a93955a14d.png)

### <font style="color:rgb(51, 51, 51);">2.4 网关</font>
+ <font style="color:rgb(51, 51, 51);">API 网关是一种用于在应用程序和 API 之间提供安全访问的中间层</font>
+ <font style="color:rgb(51, 51, 51);">API 网关还可以用于监控 API 调用，路由请求，以及在请求和响应之间添加附加功能（例如身份验证，缓存，数据转换，压缩、流量控制、限流熔断、防爬虫等）</font>
+ <font style="color:rgb(51, 51, 51);">网关和BFF可能合二为一</font>

<!-- 这是一张图片，ocr 内容为：用户 PC端 PC端网关 微服务 BFF PC端 创作 微服务 MYSQU 关注 移动端 移动端 微服务 网关 BFF 移动端 收藏 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1744943959746-9df330f3-f9fe-4527-9d68-4b906ab3e3eb.png)

### <font style="color:rgb(51, 51, 51);">2.5 集群化</font>
+ <font style="color:rgb(51, 51, 51);">单点服务器可能会存在以下几个问题：</font>
    - <font style="color:rgb(51, 51, 51);">单点故障：单点服务器只有一台，如果这台服务器出现故障，整个系统都会停止工作，这会导致服务中断</font>
    - <font style="color:rgb(51, 51, 51);">计算能力有限：单点服务器的计算能力是有限的，无法应对大规模的计算需求</font>
    - <font style="color:rgb(51, 51, 51);">可扩展性差：单点服务器的扩展能力有限，如果想要提升计算能力，就必须改造或者替换现有的服务器</font>
+ <font style="color:rgb(51, 51, 51);">这些问题可以通过采用服务器集群的方式来解决</font>

<!-- 这是一张图片，ocr 内容为：BFF集群 网关集群 PC端 用户 BFF PC端 网关 PC端 微服务 BFF PC端 网关 PC端 PC端 创作 BFF 微服务 MYSQL 移动端 关注 移动端 BFF 网关 移动端 BFF 微服务 移动端 移动端 网关 移动端 BFF 收藏 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1744943981803-0cb927bc-9977-49ee-ba96-fc1cdf178c08.png)

# <font style="color:rgb(51, 51, 51);">RPC高性性能BFF实战</font>
## <font style="color:rgb(51, 51, 51);">微服务</font>
+ <font style="color:rgb(51, 51, 51);">微服务是一种架构模式，它将单个应用程序划分为小的服务，每个服务都独立运行并且可以使用不同的语言开发。这种架构模式使得应用程序变得更容易开发、维护和扩展</font>
+ <font style="color:rgb(51, 51, 51);">微服务架构通常会有许多不同的服务，这些服务可能位于不同的机器上，因此需要使用某种通信协议来进行通信</font>
+ <font style="color:rgb(51, 51, 51);">因为</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">RPC</font>`<font style="color:rgb(51, 51, 51);">协议比</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">HTTP</font>`<font style="color:rgb(51, 51, 51);">协议具有更低的延迟和更高的性能，所以用的更多</font>

## <font style="color:rgb(51, 51, 51);">RPC</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">RPC（Remote Procedure Call）</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">是远程过程调用的缩写，是一种通信协议，允许程序在不同的计算机上相互调用远程过程，就像调用本地过程一样</font>

## <font style="color:rgb(51, 51, 51);">sofa-rpc-node</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">sofa-rpc-node</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">是基于 Node.js 的一个 RPC 框架，支持多种协议</font>

## <font style="color:rgb(51, 51, 51);">Protocol Buffers</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Protocol Buffers</font>`<font style="color:rgb(51, 51, 51);">（简称 protobuf）是 Google 开发的一种数据序列化格式，可以将结构化数据序列化成二进制格式，并能够跨语言使用</font>

## <font style="color:rgb(51, 51, 51);">Zookeeper</font>
### <font style="color:rgb(51, 51, 51);">简介</font>
+ <font style="color:rgb(51, 51, 51);">ZooKeeper 是一个分布式协调服务，提供了一些简单的分布式服务，如配置维护、名字服务、组服务等。它可以用于管理分布式系统中的数据</font>
+ [<font style="color:rgb(51, 122, 183);">Apache Zookeeper 官网</font>](https://zookeeper.apache.org/releases.html)

### <font style="color:rgb(51, 51, 51);">安装</font>
1. <font style="color:rgb(51, 51, 51);">下载 Zookeeper 安装包，可以从</font>[<font style="color:rgb(51, 122, 183);">Apache Zookeeper 官网</font>](https://zookeeper.apache.org/releases.html)<font style="color:rgb(51, 51, 51);">下载最新版本的安装包</font>
2. <font style="color:rgb(51, 51, 51);">解压安装包，将下载的压缩包解压到指定的目录。</font>
3. <font style="color:rgb(51, 51, 51);">配置环境变量，将 Zookeeper 安装目录添加到环境变量中</font>
4. <font style="color:rgb(51, 51, 51);">修改配置文件，在安装目录下的</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">conf</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">目录中找到</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">zookeeper.properties</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">文件，修改相关配置</font>
5. <font style="color:rgb(51, 51, 51);">启动 Zookeeper，在安装目录下运行命令 </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">bin\zkServer.cmd</font>`<font style="color:rgb(51, 51, 51);"> 即可启动 Zookeeper</font>

```diff
+dataDir=./data
```

### <font style="color:rgb(51, 51, 51);">启动服务</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">logger</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">是日志记录器，用于记录服务器运行时的日志信息</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">registry</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">是一个注册中心，用于维护服务的注册信息，帮助服务节点和客户端找到对方。</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">server</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">表示服务端。服务端是提供服务的节点，它会将自己所提供的服务注册到注册中心，并等待客户端的调用。服务端通常会实现具体的业务逻辑，并使用</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">RPC</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">或其他通信协议与客户端进行通信</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">server</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">的</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">addService</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">方法接受两个参数：服务接口和服务实现。服务接口是一个对象，其中包含了服务的名称信息。服务实现是一个对象，其中包含了具体实现服务方法的函数</font>
+ <font style="color:rgb(51, 51, 51);">RPC 服务器的</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">start</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">方法，用于启动服务器</font>
+ <font style="color:rgb(51, 51, 51);">RPC 服务器的 </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">publish</font>`<font style="color:rgb(51, 51, 51);"> 方法，用于向注册中心注册服务。这样，客户端就可以通过注册中心获取服务的地址和端口，并直接向服务器发起调用</font>

```shell
./zookeeper/bin/zkServer.sh start 
```

## <font style="color:rgb(51, 51, 51);">创建用户微服务</font>
### <font style="color:rgb(51, 51, 51);">安装</font>
```shell
pnpm init
pnpm add mysql2 sofa-rpc-node 
```

### 配置脚本
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

### server
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

### client
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

### 测试
```shell
# 启动服务端
pnpm start
# 启动客户端
pnpm client
```

## <font style="color:rgb(51, 51, 51);">创建文章微服务</font>
### <font style="color:rgb(51, 51, 51);">安装</font>
```shell
pnpm init
pnpm add mysql2 sofa-rpc-node 
```

### 配置脚本
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

### server
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
// 添加服务接口，实现 getPostCount 方法
server.addService({
    interfaceName: 'com.zhufeng.post'
}, {
    async getPostCount(userId) {
        const [rows] = await connection.execute(`SELECT count(*) as postCount FROM post WHERE user_id=${userId} limit 1`);
        return rows[0].postCount;
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

### client
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
        interfaceName: 'com.zhufeng.post'
    });
    // 等待服务就绪
    await consumer.ready();
    // 调用服务方法
    const result = await consumer.invoke('getPostCount', [1], { responseTimeout: 3000 });
    // 输出结果
    console.log(result);
    process.exit(0);
})()
```

### 测试
```shell
# 启动服务端
pnpm start
# 启动客户端
pnpm client
```

## <font style="color:rgb(51, 51, 51);">创建BFF</font>
### <font style="color:rgb(51, 51, 51);">5.1 安装</font>
```shell
pnpm add express morgan sofa-rpc-node
```

### <font style="color:rgb(51, 51, 51);">脚本配置</font>
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

### <font style="color:rgb(51, 51, 51);">server</font>
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

### <font style="color:rgb(51, 51, 51);">中间件</font>
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

## <font style="color:rgb(51, 51, 51);">缓存</font>
+ <font style="color:rgb(51, 51, 51);">BFF 作为前端应用和后端系统之间的抽象层，承担了大量的请求转发和数据转换工作。使用多级缓存可以帮助 BFF 减少对后端系统的访问，从而提高应用的响应速度</font>
+ <font style="color:rgb(51, 51, 51);">当 BFF 收到一个请求时，首先会检查内存缓存中是否存在对应的数据，如果有就直接返回数据。如果内存缓存中没有数据，就会检查Redis缓存，如果Redis缓存中有数据就返回数据，并将数据写入内存缓存。如果本地缓存中也没有数据，就会向后端系统发起请求，并将数据写入Redis缓存和内存缓存</font>

### <font style="color:rgb(51, 51, 51);">多级缓存</font>
+ <font style="color:rgb(51, 51, 51);">多级缓存（multi-level cache）是指系统中使用了多个缓存层来存储数据的技术。这些缓存层的优先级通常是依次递减的，即最快的缓存层位于最顶层，最慢的缓存层位于最底层</font>

### <font style="color:rgb(51, 51, 51);">LRU</font>
+ <font style="color:rgb(51, 51, 51);">LRU（Least Recently Used）是一种常用的高速缓存淘汰算法，它的原理是将最近使用过的数据或页面保留在缓存中，而最少使用的数据或页面将被淘汰。这样做的目的是为了最大化缓存的命中率，即使用缓存尽可能多地满足用户的请求</font>

### <font style="color:rgb(51, 51, 51);">redis</font>
+ <font style="color:rgb(51, 51, 51);">Redis 是一种开源的内存数据存储系统，可以作为数据库、缓存和消息中间件使用</font>
+ <font style="color:rgb(51, 51, 51);">Redis 运行在内存中，因此它的读写速度非常快</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">ioredis</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">是一个基于 Node.js 的 Redis 客户端，提供了对 Redis 命令的高度封装和支持</font>
+ [<font style="color:rgb(51, 122, 183);">redis</font>](https://github.com/tporadowski/redis/releases)
+ [<font style="color:rgb(51, 122, 183);">Redis-x64-5.0.14.1</font>](https://static.zhufengpeixun.com/Redisx6450141_1673102444438.zip)

### <font style="color:rgb(51, 51, 51);">使用缓存</font>
#### <font style="color:rgb(51, 51, 51);">server</font>
<font style="color:rgb(51, 51, 51);"></font>

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

#### <font style="color:rgb(51, 51, 51);">中间件</font>
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
    db: 'bff',
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

## <font style="color:rgb(51, 51, 51);">消息队列</font>
+ <font style="color:rgb(51, 51, 51);">消息队列（Message Queue）用于在分布式系统中传递数据。它的特点是可以将消息发送者和接收者解耦，使得消息生产者和消息消费者可以独立的开发和部署</font>

### <font style="color:rgb(51, 51, 51);">引入原因</font>
+ <font style="color:rgb(51, 51, 51);">在 BFF 中使用消息队列（message queue）有几个原因：</font>
    - <font style="color:rgb(51, 51, 51);">大并发：消息队列可以帮助应对大并发的请求，BFF 可以将请求写入消息队列，然后后端服务可以从消息队列中读取请求并处理</font>
    - <font style="color:rgb(51, 51, 51);">解耦：消息队列可以帮助解耦 BFF 和后端服务，BFF 不需要关心后端服务的具体实现，只需要将请求写入消息队列，后端服务负责从消息队列中读取请求并处理</font>
    - <font style="color:rgb(51, 51, 51);">异步：消息队列可以帮助实现异步调用，BFF 可以将请求写入消息队列，然后立即返回响应给前端应用，后端服务在后台处理请求</font>
        * <font style="color:rgb(51, 51, 51);">流量削峰：消息队列可以帮助流量削峰，BFF 可以将请求写入消息队列，然后后端服务可以在合适的时候处理请求，从而缓解瞬时高峰流量带来的压力</font>

### <font style="color:rgb(51, 51, 51);">RabbitMQ</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">RabbitMQ</font>`<font style="color:rgb(51, 51, 51);">是一个消息代理，它可以用来在消息生产者和消息消费者之间传递消息</font>
+ <font style="color:rgb(51, 51, 51);">RabbitMQ的工作流程如下：</font>
    - <font style="color:rgb(51, 51, 51);">消息生产者将消息发送到</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">RabbitMQ</font>`<font style="color:rgb(51, 51, 51);">服务器</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">RabbitMQ</font>`<font style="color:rgb(51, 51, 51);">服务器将消息保存到队列中</font>
    - <font style="color:rgb(51, 51, 51);">消息消费者从队列中读取消息</font>
    - <font style="color:rgb(51, 51, 51);">当消息消费者处理完消息后</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">RabbitMQ</font>`<font style="color:rgb(51, 51, 51);">服务器将消息删除</font>
+ <font style="color:rgb(51, 51, 51);">安装启动</font>
    - <font style="color:rgb(51, 51, 51);">在RabbitMQ下载</font>[<font style="color:rgb(51, 122, 183);">官网安装包</font>](https://www.rabbitmq.com/docs/install-homebrew)<font style="color:rgb(51, 51, 51);">或</font>[<font style="color:rgb(51, 122, 183);">镜像安装包</font>](https://static.zhufengpeixun.com/rabbitmqserver3116_1673104196680.exe)
    - <font style="color:rgb(51, 51, 51);">双击安装包，按照提示进行安装,直接就可以启动</font>
        * <font style="color:rgb(51, 51, 51);">安装前还要安装</font>[<font style="color:rgb(51, 122, 183);">Erlang</font>](https://www.erlang.org/downloads)<font style="color:rgb(51, 51, 51);">,Erlang是一个结构化，动态类型编程语言，内建并行计算支持</font>

### <font style="color:rgb(51, 51, 51);">实现</font>
#### <font style="color:rgb(51, 51, 51);">server</font>
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

#### <font style="color:rgb(51, 51, 51);">中间件</font>
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

#### <font style="color:rgb(51, 51, 51);">日志</font>
<font style="color:rgb(51, 51, 51);"></font>

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

# <font style="color:rgb(51, 51, 51);">DDD和GraphQL实战BFF</font>
# <font style="color:rgb(51, 51, 51);">Serverless实战BFF</font>
## <font style="color:rgb(51, 51, 51);">Serverless</font>
### <font style="color:rgb(51, 51, 51);">BFF问题</font>
+ <font style="color:rgb(51, 51, 51);">复杂性增加：添加 BFF 层会增加系统的复杂性，因为它需要在后端 API 和前端应用程序之间处理请求和响应</font>
+ <font style="color:rgb(51, 51, 51);">性能问题：如果 BFF 层的实现不当，可能会导致性能问题，因为它需要在后端 API 和前端应用程序之间传输大量数据</font>
+ <font style="color:rgb(51, 51, 51);">安全风险：如果 BFF 层未得到正确保护，可能会导致安全风险，因为它可能会暴露敏感数据</font>
+ <font style="color:rgb(51, 51, 51);">维护成本：BFF 层需要维护和更新，这会增加维护成本</font>
+ <font style="color:rgb(51, 51, 51);">测试复杂性：由于 BFF 层需要在后端 API 和前端应用程序之间进行测试，因此测试可能会变得更加复杂</font>
+ <font style="color:rgb(51, 51, 51);">运维问题 要求有强大的日志、服务器监控、性能监控、负载均衡、备份冗灾、监控报警和弹性伸缩扩容等</font>

### <font style="color:rgb(51, 51, 51);">Serverless</font>
+ <font style="color:rgb(51, 51, 51);">这些问题可以通过</font>[<font style="color:rgb(51, 122, 183);">Serverless</font>](https://docs.cloudbase.net/)<font style="color:rgb(51, 51, 51);">来解决</font>
+ <font style="color:rgb(51, 51, 51);">Serverless = Faas (Function as a service) + Baas (Backend as a service)</font>
+ <font style="color:rgb(51, 51, 51);">FaaS（Function-as-a-Service）是服务商提供一个平台、提供给用户开发、运行管理这些函数的功能，而无需搭建和维护基础框架，是一种事件驱动由消息触发的函数服务</font>
+ <font style="color:rgb(51, 51, 51);">BaaS（Backend-as-a-Service）后端即服务，包含了后端服务组件，它是基于 API 的第三方服务，用于实现应用程序中的核心功能，包含常用的数据库、对象存储、消息队列、日志服务等等</font>

<!-- 这是一张图片，ocr 内容为：FAAS BAAS A SERVICE BACKEND AS FUNCTION AS  SERVICE 对象存储 消息队列 函数计算 LAMBDA 云数据库 日志服务 CLOUD RUN 云监控 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1745224053990-62e7b463-2ff5-4b36-94e2-46241927fa9f.png)

<!-- 这是一张图片，ocr 内容为：BAAS 存储 FRONTEND OSS RDS NOSQL 通信 MNS FAAS FUNCTION FUNCTION SNS FUNCTION 运维 SLS BACKEND ARMS MICRO SERVICE MICRO SERVICE MICRO SERVICE MICRO SERVICE -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1745224065210-61c3dfc9-80c4-420e-9db3-08360445765f.png)

### <font style="color:rgb(51, 51, 51);">Serverless的优势</font>
+ <font style="color:rgb(51, 51, 51);">节省成本：在传统架构中，你需要为应用程序所使用的服务器付费，即使它们没有被使用。在 Serverless 架构中，你仅需为实际使用的资源付费，这可以节省大量成本</font>
+ <font style="color:rgb(51, 51, 51);">更快的开发周期：Serverless 架构允许开发人员更快地构建和部署应用程序，因为它们可以更快地获得所需的资源</font>
+ <font style="color:rgb(51, 51, 51);">更好的可伸缩性：Serverless 架构可以自动扩展来满足增长的流量需求，无需人工干预</font>
+ <font style="color:rgb(51, 51, 51);">更好的可维护性：在 Serverless 架构中，你无需担心底层基础架构的维护，因为这些工作由云服务提供商负责</font>
+ <font style="color:rgb(51, 51, 51);">更高的可用性：由于 Serverless 架构具有自动扩展功能，因此它可以更好地应对突发流量，从而提高应用程序的可用性</font>

### <font style="color:rgb(51, 51, 51);">Serverless的缺点</font>
+ <font style="color:rgb(51, 51, 51);">复杂性：Serverless 架构可能会使应用程序的体系结构变得更加复杂，因为它需要将应用程序拆分为许多小型函数</font>
+ <font style="color:rgb(51, 51, 51);">性能问题：在某些情况下，Serverless 架构可能会导致性能问题，因为函数执行需要额外的时间来启动和终止</font>
+ <font style="color:rgb(51, 51, 51);">限制：每个函数都有资源限制，因此需要仔细规划应用程序的体系结构，以免超出这些限制</font>
+ <font style="color:rgb(51, 51, 51);">依赖云服务提供商：使用 Serverless 架构需要依赖云服务提供商，因此如果这些服务出现故障，可能会对应用程序造成影响</font>
+ <font style="color:rgb(51, 51, 51);">调试困难：由于 Serverless 架构使用许多小型函数，因此调试可能会变得更加困难</font>

# 参考
[Apache ZooKeeper](https://zookeeper.apache.org/)

[sofa-rpc-node](https://www.npmjs.com/package/sofa-rpc-node)

