# Redis 深度：五大数据结构/持久化/缓存与分布式锁最佳实践/接口限流（生产收藏级）

> **副标题**：五大数据结构适用场景、RDB/AOF 持久化、缓存穿透击穿雪崩、SETNX 分布式锁、令牌桶漏桶限流

> 面试官问「缓存穿透、击穿、雪崩三者的区别是什么？」，多数人只能背出三句定义，却讲不清每一种到底该怎么应对、代码长什么样。能把五大数据结构的选型逻辑、RDB/AOF 为什么混合使用、分布式锁的「锁误删」怎么用 Lua 原子解决、令牌桶和漏桶的核心差异——讲清楚，才说明你真的在生产里扛过 Redis，而不是只会 `SET`/`GET`。

---

## 🎯 这篇文章解决什么问题

Redis 是 Node.js 全栈开发者绕不开的一块，也是后端面试里「必考且最容易问深」的组件。你用过 `SET`/`GET`、写过缓存、加过 `EXPIRE`，但被追问到底层——五大数据结构怎么选型？RDB 和 AOF 各自丢什么、生产为什么混合用？缓存穿透/击穿/雪崩到底差在哪、代码怎么写？分布式锁用 `SET NX EX` 实现，有哪些坑？令牌桶为什么允许突发流量？——很多人就卡住了。

这篇文章是「Node.js 全栈深度拆解」系列的第 14 篇，也是数据库板块的第三篇（MySQL → MongoDB → Redis）。它把 Redis 从「基本使用」到「生产最佳实践」完整串起来，三件事讲透：

- **基本使用**：Redis 是什么、怎么装、键操作、五大数据结构的每一条命令、Node.js 客户端（node-redis 与 ioredis）、发布订阅、事务、备份与安全、接口限流入门
- **企业最佳实践**：五大数据结构选型、RDB/AOF 持久化组合、缓存穿透/击穿/雪崩三件套、分布式锁的正确姿势、淘汰策略选型、接口限流算法选型
- **注意事项**：锁误删、大 key 与 `KEYS`、`noeviction` 的坑、单线程的误读、持久化性能权衡这些生产事故高发点

**既讲怎么用，也讲面试怎么答。** 5-10 年 Node 开发者的简历上，Redis 这一栏从「会用」到「能讲清为什么这么设计」，面试官的眼睛会不一样。

---

## 一、基本使用

### 1. Redis 是什么与核心优势

Redis 是完全开源免费的，遵守 BSD 协议，是一个高性能的 key-value 数据库。它的优势可以概括成五条：

- **性能极高**：Redis 读的速度是 110000 次/s，写的速度是 81000 次/s
- **丰富的数据类型**：支持二进制的字符串、列表、哈希值、集合和有序集合等数据类型操作
- **原子性**：Redis 的所有操作都是原子性的，意思就是要么成功执行、要么失败完全不执行
- **事务支持**：单个操作是原子性的，多个操作也支持事务（及原子性），通过 `MULTI` 和 `EXEC` 指令包起来
- **丰富的特性**：Redis 还支持发布/订阅、通知、key 过期等等特性

> 📚 知识点：注意「原子性」和「事务」是两件事——单条命令天然原子（Redis 命令执行是单线程的，见第三部分「单线程误读」）；`MULTI`/`EXEC` 打包多条命令，能保证这组命令**不被其他客户端插队**，但**不保证中途出错会回滚**（这点在第 7 节事务里展开）。

### 2. 安装与启动

**Windows 平台**：

- **下载地址**：Redis 官方不直接提供 Windows 版，常用的是 tporadowski 维护的 Windows 移植版（github.com/tporadowski/redis/releases）。
- Redis 支持 32 位和 64 位，需要根据系统平台实际情况选择，下载 **Redis-x64-xxx.zip** 压缩包到 C 盘，解压后把文件夹重命名为 **redis**。

<!-- 这是一张图片，ocr 内容为：DownIoads 5.8MB Redis-x64-3.2.100.msi Redis-X64-3.2.100.zip 4.98MB Sourcecode(zip) Sourcecode(tar.gz) -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630044468346-ecd6e351-695e-4ce6-94e8-6a81135789bb.png)

- 打开文件夹，内容如下：

<!-- 这是一张图片，ocr 内容为：新建文件夹 中 共享 类型 修改日期 名称 大小 15 RDB文件 dumprdb 2017/7/2014:34 Eventlogadll 应用程序扩展 2016/7/116:27 13 MicrosoftOffice... 20167/116:07 RedisonWindowsReleaseNotesdo... 17 Microsoftoffice... RedisonWindowsdocx 20167/116:07 CONF文件 redis.windows.conf 2016/7/116:07 48 CONF文件 48 redis.windows-service.conf 20167/116:07 400 应用程序 redis-benchmark.exe 20167/116:28 redis-benchmark.pdb PDB文件 4,268 20167/116:28 251 应用程序 redis-check-aof.exe 2016/7/116:28 redis-check-aofipdb PDB文件 3,436 20167/116:28 应用程序 488 2016/7/116:28 redis-cliexe redis-clipdb PDB文件 4420 20167/116:28 1628 应用程序 redis-serverexe 20167/116:28 PDB文件 redisserver.pdb 6916 20167/116:28 14 MicrosoftOffice... WindowsServiceDocumentation.docx 20167/19:17 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630044506889-3c116990-d37a-4a2d-917f-05949b528b8c.png)

- 打开一个 **cmd** 窗口，用 `cd` 命令切换到 **C:\redis** 目录，运行：

```shell
redis-server.exe redis.windows.conf
```

- 如果想方便，可以把 redis 的路径加到系统环境变量里，省得再输路径；后面的 `redis.windows.conf` 可以省略（省略则启用默认配置）。输入之后，显示如下界面：

<!-- 这是一张图片，ocr 内容为：答理员:ciwindowslsystem32mdexe-redisserverexerediswindowsconf redis-seryerexerediswindowc edis> Redis3.2100(00990000/064bit Runninginstandalonemode Port:6379 PID:15292 http://redis.io 15292125Mu1411:13 115292125Mu141113 on ot6379 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630044565180-9594486a-84f6-4ad7-a2aa-9b246929a365.png)

- 这时另起一个 cmd 窗口（原来的不要关闭，否则无法访问服务端），切换到 redis 目录下运行：

```shell
redis-cli.exe -h 127.0.0.1 -p 6379
```

- 设置键值对：

```shell
set myKey abc
```

- 取出键值对：

```javascript
get myKey
```

<!-- 这是一张图片，ocr 内容为：理员:Windowssystemexex. p6379 CN.尝 cAvedisorediscliexeh 127.0.0.1:639>setmykeyabc OK 1270.0.1:637>getmyKey abc 127.0.0.1:6379> -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630044632459-39a0e88b-46b0-49a8-84aa-74e6887c339a.png)

**Mac 平台**：

- 没有安装 Homebrew 的话，先装（国内源快一些）：

```shell
/bin/zsh -c "$(curl -fsSL https://gitee.com/cunkai/HomebrewCN/raw/master/Homebrew.sh)"
```

- 使用 Homebrew 安装命令：

```shell
brew install redis

# brew tap ringohub/redis-cli
# brew install redis-cli
```

- 执行上述命令后出现以下，则成功安装：

<!-- 这是一张图片，ocr 内容为：飞31 robi@Royan:~ 入Royan~brewinstallredis Dowloodinght/ 二-> 世+界界界界界界界界界界界 Dowlogdinght:/ 世排排排排排界界快快排排排打打护护料料料料料护排排打打打打排排排排排件件100 Installingdependenciesforredis:openss@1. Installingredisdependency:openssl@1.1 Pouringopenss@1.1-1.1..igle RegeneratingcAcertificatebundlefromkeychain,thyk /usr/local/cella/openss@1./1 Installingredis Pouringredis-6.2.5.big-sur.ottle.trg Caveats ostartredis: brewservicesstartredis orifyoudontwant/needabackgoundserviceyoucanjust usr/locaL/opt/redis/bin/redis-server/usr/loca/et/redis.conf Summary /usr/local/Cellar/redis/6.2.5:14files.M Caveats redis Tostartredis: brewservicesstartredis orifyoudon'twant/needabackgroundserviceo youcanjustrun: lusr/local/opt/redis/bin/redis-server/usr/oca/et/redico 入Royan -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630045709531-0b6c68f4-12e6-425b-acff-2620f9e7fed3.png)

- 查看安装及配置文件位置：
  - Homebrew 安装的软件默认在 `/usr/local/Cellar/` 路径下
  - redis 的配置文件 `redis.conf` 存放在 `/usr/local/etc` 路径下
- 启动 redis 服务：

```shell
// 方式一：使用 brew 帮助我们启动软件
brew services start redis
// 方式二
redis-server /usr/local/etc/redis.conf

// 执行以下命令
redis-server
```

- 查看 redis 服务进程：

```shell
ps axu | grep redis
```

- redis-cli 连接 redis 服务（redis 默认端口 6379，默认 auth 为空）：

```shell
redis-cli -h 127.0.0.1 -p 6379
```

- 启动 redis 客户端，输入 `redis-cli` 连接本地 redis 服务，执行 `PING` 命令检测服务是否启动：

```shell
$redis-cli
redis 127.0.0.1:6379>
redis 127.0.0.1:6379> PING
PONG
```

- 关闭 redis 服务（正确停止方式是发 `SHUTDOWN` 命令，不要 `pkill` 强杀）：

```shell
// 停止 Redis
redis-cli shutdown
// 强行终止 redis（不推荐，可能丢数据）
sudo pkill redis-server
```

- `redis.conf` 配置文件详解：redis 默认前台启动，如果想以守护进程方式（后台）运行，在 `redis.conf` 里把 `daemonize no` 改成 `yes` 即可。

### 3. 配置与键的通用操作

查看配置用 `CONFIG GET`：

```shell
CONFIG GET CONFIG_SETTING_NAME
CONFIG GET port
```

**键（key）的通用操作**，先看几个常用的（Redis 键命令的完整清单可搜索关键词「Redis 键命令 菜鸟教程」）：

- 查找以 runoob 为开头的 key：

```shell
redis 127.0.0.1:6379> KEYS runoob*
1) "runoob3"
2) "runoob1"
3) "runoob2"
```

- 获取 redis 中所有的 key，用 `*`：

```shell
redis 127.0.0.1:6379> KEYS *
1) "runoob3"
2) "runoob1"
3) "runoob2"
```

> ⚠️ 这里先埋一个伏笔：`KEYS *` 在生产环境是**禁忌**——它会全库扫描、阻塞单线程（详见第三部分「大 key 与 KEYS」）。现在笔记里只是本地学习用，先会用即可，但心里要有这根弦。

### 4. 五大数据结构

Redis 有五种基础数据结构，下面按「命令 + 医疗场景」逐个讲透，每一条命令都保留笔记原文。

**字符串（String）**：最基本的类型，一个 key 对应一个 value。

### SET 设置值

```shell
SET name test
```

### GET 获取值

```shell
GET name
```

### GETRANGE 获取子串

```shell
GETRANGE name 1 2
```

### INCR 递增

```shell
SET age 1
INCR age
```

### DECR 递减

```shell
DECR age
```

### DEL 删除

```shell
DEL name
```

### EXISTS 判断键是否存在

```shell
EXISTS name
```

### EXPIRE 设置过期时间

```shell
EXPIRE age 10
```

### TTL 获取过期时间

```shell
TTL age
```

### TYPE 获取类型

```shell
TYPE age
```

### INCRBY 增量值

```shell
INCRBY age 10
```

**哈希值（Hash）**：一个字符串类型的 Key 和值的映射表，特别适合存储对象（如患者档案的多个字段）。

### HSET 设置值

```shell
HSET person name test
HSET person age 10
```

### HGET 获取值

```shell
HGET person name
```

### HGETALL 获取所有值

```shell
HGETALL person
```

### HDEL 删除键

```shell
HDEL person age
```

### HKEYS 获取所有 key

```shell
HKEYS person
```

**列表（List）**：简单的字符串列表，按插入顺序排序，可以从头部（左）或尾部（右）添加元素。

### LPUSH 头部添加元素

```shell
LPUSH ids 1
```

### RPUSH 尾部添加元素

```shell
RPUSH ids 3
```

### LRANGE 查看元素

```shell
LRANGE ids 0 -1
```

### LPOP 左边弹出元素

```shell
LPOP ids
```

### RPOP 右边弹出元素

```shell
RPOP ids
```

### LINDEX 按索引获取

```shell
LINDEX ids 0
```

### LLEN 获取列表长度

```shell
LLEN ids
```

### LREM 移除列表元素

`count` 参数控制移除方向和数量：

- `count > 0`：从表头向表尾搜索，移除与 VALUE 相等的元素，数量为 COUNT
- `count < 0`：从表尾向表头搜索，移除与 VALUE 相等的元素，数量为 COUNT 的绝对值
- `count = 0`：移除表中所有与 VALUE 相等的值

```shell
LREM ids 1 1
```

**集合（Set）**：字符串类型的无序集合（自动去重）。

### SADD 添加

```shell
SADD tags 1
SADD tags 4 5 6
```

### SMEMBERS 查看集合

```shell
SMEMBERS tags
```

### SCARD 获取集合元素个数

```shell
SCARD tags
```

### SREM 删除元素

```shell
SREM tags 2
```

### SINTER 获取集合的交集

```shell
SINTER tags res
```

### SUNION 获取集合的并集

```shell
SUNION tags res
```

### SDIFF 获取集合的差集

```shell
SDIFF tags res
```

**有序集合（Sorted Set）**：和 Set 一样是字符串集合、元素不能重复，但每个元素会关联一个 double 类型的分数，Redis 按这个分数对元素从小到大排序（元素不能重复，但分数可以重复）。

### ZADD 添加元素

```shell
ZADD levels 1 one
ZADD levels 2 two
ZADD levels 3 three
ZADD levels 4 four
```

### ZCARD 获取成员数

```shell
ZCARD levels
```

### ZRANGE 获取指定区间内的成员

```shell
ZRANGE levels 0 -1 withscores
```

### ZREM 删除成员

```shell
ZREM levels one
```

### 5. Node.js 客户端操作 Redis

**安装依赖**：

```shell
npm install redis
```

笔记里用的是旧版 `node-redis` 客户端，`createClient(port, host)` + 回调风格。这里先完整保留笔记代码（旧版 `redis` 包 v3 及以前的写法）：

```javascript
const redis = require('redis');
const client = redis.createClient(6379, '127.0.0.1');
client.on('error', (error) => {
  console.error(error);
})
client.set("key", "value", redis.print);
client.get("key", redis.print);

client.hset('person', 'name', 'test', redis.print);
client.hget('person', 'name', redis.print);

client.lpush('links', 'a', redis.print);
client.lpush('links', 'b', redis.print);
client.lrange('links', 0, -1, redis.print);

client.sadd('tags', 'a', redis.print);
client.sadd('tags', 'b', redis.print);
client.smembers('tags', redis.print);

// 模拟对象
client.hset('person', 'age', 10, redis.print);
client.hset('person', 'home', 'shanghai', redis.print);
client.hgetall('person', (error, replies) => {
  console.log(replies)
});
client.hkeys('person', redis.print);
```

> ⚠️ 这段代码用的是 `redis` 包 v3 及以前的旧 API（回调风格、`redis.print` 打印返回值），现在已废弃。官方 v4 及以后改成了「自动连接 + 全 Promise」风格，而且社区里更推荐 **ioredis**（原生 Promise、内置重连、Lua 脚本友好）。下面用 ioredis 把同样的操作重写一遍，这也是本文最佳实践部分代码的统一写法：

```javascript
const Redis = require('ioredis')
const redis = new Redis({ host: '127.0.0.1', port: 6379 })

async function main() {
  await redis.set('key', 'value')
  console.log(await redis.get('key'))       // 'value'

  await redis.hset('person', 'name', 'test')
  console.log(await redis.hget('person', 'name'))   // 'test'

  await redis.lpush('links', 'a', 'b')
  console.log(await redis.lrange('links', 0, -1))    // ['b', 'a']（LPUSH 头插，b 在前）

  await redis.sadd('tags', 'a', 'b')
  console.log(await redis.smembers('tags'))           // ['a', 'b']

  await redis.hset('person', 'age', 10)
  await redis.hset('person', 'home', 'shanghai')
  console.log(await redis.hgetall('person'))          // { name:'test', age:'10', home:'shanghai' }
}
main()
```

对比一下就清楚了：ioredis 的命令返回 Promise，`hgetall` 直接返回对象，不用处理回调嵌套——这是现代 Node.js 操作 Redis 的主流姿势。

### 6. 发布订阅

**概述**：

- Redis 发布订阅（pub/sub）是一种消息通信模式：发送者（pub）发送消息，订阅者（sub）接收消息。
- Redis 客户端可以订阅任意数量的频道。
- 下图展示了频道 channel1，以及订阅这个频道的三个客户端——client2、client5 和 client1 之间的关系：

<!-- 这是一张图片，ocr 内容为：channel1 subscribecubscribe subscribe client5 client2 client1 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630060248734-6009e4e8-1bdc-43ac-8639-044aec486909.png)

- 当有新消息通过 `PUBLISH` 命令发送给频道 channel1 时，这个消息会被发送给订阅它的三个客户端：

<!-- 这是一张图片，ocr 内容为：PUBLISHchannel1message channel1 messagermessage mmessage client5 client2 client1 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630060278893-5edc3720-b2f2-481d-8eab-ce6de6782f30.png)

**客户端一（订阅）**：

```shell
redis-cli
subscribe channel_a
```

**客户端二（发布）**：

```shell
redis-cli
publish channel_a hello
```

<!-- 这是一张图片，ocr 内容为：t31 redis-cli X Xredis-cli(redis-cli) redis-cli(redis-cli) 127.0.0.1:6379>subscribechannel-a Lastlogin:FriAug2714:26:48onttys02 入Royan~3redis-cli Readingmessages...(pressctrl-ctoquit) 127.0.0.1:6379publishchannel_ahello 1"subscribe" 2"channel-a" (integer)1 口 127.0.0.1:6379> (integer)1 "message" "channel-a" "helLo" ShowAllCommands P GotoFile P 30 FindinFiles StartDebugging F5 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630060567098-8a49f920-fb7b-4f67-99b4-cf7d66e06d72.png)

**Node.js 中使用**（保留笔记代码）：

```javascript
const redis = require('redis');
const client1 = redis.createClient(6379, '127.0.0.1');
const client2 = redis.createClient(6379, '127.0.0.1');
const count = 0;
client1.subscribe('channel_a');
client1.subscribe('channel_b');
client1.on('message', (channel, message) => {
  console.log(`%c${channel}:`, `color: green`, message);
  // 当收到第一条消息后，立刻取消订阅频道 channel_b
  // 那以后将不再接受频道 channel_b 发过的消息
  client1.unsubscribe('channel_b');
});
client2.publish('channel_a', 'hello');
client2.publish('channel_b', 'world');
setTimeout(() => {
  client2.publish('channel_a', 'hello2');
  client2.publish('channel_b', 'world2');
}, 2000)
```

> 💬 **面试官**：Redis 的 Pub/Sub 和第 01 篇讲的 EventEmitter 发布订阅，有什么区别？
>
> ✅ 标准答案：两者是同一个「发布订阅」模式的不同实现范围。EventEmitter 是**进程内**的发布订阅——发布者和订阅者在同一个 Node.js 进程里，进程一重启、订阅关系全没了；Redis Pub/Sub 是**跨进程/跨服务**的——不同机器、不同服务进程之间通过 Redis 这个中间件转发消息。核心差异在于「事件中心」在哪：EventEmitter 的事件中心是进程内存，Redis 的事件中心是 Redis 服务器。
>
> 🎁 加分答案：能点出 Redis Pub/Sub 的两个局限——① 消息**不持久化**，订阅者掉线期间发的消息就丢了（没有「历史消息」概念）；② 没有 ACK 机制，消费者处理失败无法重试。所以「需要可靠投递、失败重试」的场景应该用消息队列（如 RabbitMQ/Kafka，见第 18 篇），而不是 Pub/Sub；Pub/Sub 适合「实时广播、允许偶尔丢一条」的场景（如缓存失效通知、聊天室广播）。

### 7. 事务

**基本使用**：

- Redis 事务可以一次执行多个命令，并带有以下三个重要保证：
  - 批量操作在发送 `EXEC` 命令前被放入队列缓存。
  - 收到 `EXEC` 命令后进入事务执行，事务中任意命令执行失败，其余的命令依然被执行。
  - 在事务执行过程，其他客户端提交的命令请求不会插入到事务执行命令序列中。
- 一个事务从开始到执行经历三个阶段：开始事务 → 命令入队 → 执行事务。

```shell
MULTI
SET count 1
SET count2 2
GET count
EXEC
```

<!-- 这是一张图片，ocr 内容为：1351 redis-cli 127.0.0.1:6379>MULTI OK 127.0.0.1:6379TX>SETcount1 QUEUED 127.0.0.1:6379TX>SETcount22 OUEUED 127.0.0.1:6379TX>GETcount QUEUED 127.0.0.1:6379(TX>EXEC 10K 2)0K 3)"1" 127.0.0.1:6379> ShowAllCommands 8 GotoFile 第P FindinFiles 出 StartDebugging F5 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630061470665-91acddb9-48fc-4e93-b5d9-3746efed7744.png)

- 单个 Redis 命令的执行是原子性的，但 **Redis 没有在事务上增加任何维持原子性的机制**，所以 Redis 事务的执行**并不是原子性的**。
- 事务可以理解为一个打包的批量执行脚本，但批量指令并非原子化操作，中间某条指令的失败**不会**导致前面已做指令的回滚，也**不会**造成后续的指令不做。

```shell
multi
set a aaa
set b bbb
set c ccc
exec
```

<!-- 这是一张图片，ocr 内容为：1351 redis-cli 127.0.0.1:6379>MULTI OK 127.0.0.1:6379TX>SETcount QUEUED 127.0.0.1:6379TX>SETcount22 OUEUED 127.0.0.1:6379TX>GETcount QUEUED 127.0.0.1:6379(TX>EXEC 10K 20K 3"1" 127.0.0.1:6379>multi OK 127.0.0.1:6379(TX> set caaaa QUEUED 127.0.0.1:6379TX>setbbbb QUEUED ShowAllCommands 8 127.0.0.1:6379TX>setcccc QUEUED GotoFile 第P 127.0.0.1:6379TX> exec 10K 2)0K FindinFiles 出 3)0K 127.0.0.1:6379> StartDebugging F5 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630061600486-1e3b4a93-635d-433a-8883-6f23398685ec.png)

> 如果在 `set b bbb` 处失败，`set a` 已成功不会回滚，`set c` 还会继续执行。

**WATCH 实现乐观锁**：`WATCH` 监听某个 key，如果在 `EXEC` 之前该 key 被其他客户端改过，整个事务会执行失败（返回 nil），从而避免「基于过期数据做修改」。这是 Redis 实现乐观锁的手段——「先读、再乐观地假设没变、提交时校验」。

**Node.js 中使用**（保留笔记代码）：

```javascript
const redis = require('redis');
const client = redis.createClient(6379, '127.0.0.1');
client.multi().set('count3', 3).set('count4', 4).get('count4').exec(redis.print);
```

> 💬 **面试官**：Redis 事务和关系型数据库的事务有什么区别？Redis 事务能回滚吗？
>
> ✅ 标准答案：核心区别在**「原子性」和「回滚」**。关系型事务保证 ACID，中途失败会回滚、保持一致性；Redis 的 `MULTI`/`EXEC` 事务只保证「命令序列执行期间不被其他客户端插队」（隔离性），但**不保证原子性、不支持回滚**——某条命令失败，前面的不撤销、后面的照常执行。
>
> 🎁 加分答案：能区分两种失败——「入队时语法错误」会在 `EXEC` 前报错、整个事务不执行；「执行时类型错误」（如对 String 做 `LPUSH`）只会影响那条命令，其余照常。并能补充「需要真正的原子操作，应该用 Lua 脚本而不是事务」——Lua 脚本在 Redis 里是整体原子执行的，这也是分布式锁释放、限流要用 Lua 的原因。

### 8. 备份与恢复、安全

**备份**：

```shell
SAVE
```

> 该命令将在 redis 安装目录中创建 `dump.rdb` 文件。

**恢复**：

```shell
CONFIG GET dir
```

> `CONFIG GET dir` 输出的 redis 安装目录为 `/usr/local/redis/bin`，把备份的 `dump.rdb` 放回这个目录、重启 redis 即可恢复。

**BGSAVE**：创建 redis 备份文件也可以用 `BGSAVE` 命令，它在后台执行（`SAVE` 是前台阻塞主线程，`BGSAVE` fork 子进程做、不阻塞，生产用 `BGSAVE`）。

```shell
BGSAVE
```

> 📚 这里埋第二个伏笔：`SAVE`/`BGSAVE` 生成的 `dump.rdb` 就是 **RDB 持久化**的产物——这是第二部分「RDB 与 AOF」要重点展开的东西，现在先知道「备份 = 生成 rdb 快照文件」即可。

**安全**：可以通过 redis 配置文件设置密码参数，客户端连接需要密码验证，让 redis 服务更安全。

```shell
CONFIG get requirepass
```

> 默认情况下 `requirepass` 参数是空的，意味着无需密码验证就能连接 redis 服务。

<!-- 这是一张图片，ocr 内容为：t31 redis-cli 127.0.0.1:6379>CONFIGget requirepass 1"requirepass" 2 1550 127.0.0.1:6379> ShowAllCommands GotoFileP FindinFiles 食出F Starthabuaaina -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630062321138-3491eb35-37cc-408e-a939-ae0b5f72212e.png)

- 通过以下命令修改该参数：

```shell
CONFIG set requirepass "123456"
```

- 设置密码后，客户端连接需要密码验证，否则无法执行命令：

```shell
AUTH 123456
```

<!-- 这是一张图片，ocr 内容为：1381 redis-cli 127.0.0.1:6379>CONFIGset requirepass"123456" OK 127.0.0.1:6379>CONFIGget requirepass 1"requirepass" 2)"123456" 127.0.0.1:6379> 入Royan~redis-cli 127.0.0.1:6379ConFIGgetrequiras (error)noauTHAuthenticationrequired. 127.0.0.1:6379>AUTH123456 OK 127.0.0.1:6379ConFIGgetrquiepass 1) "requirepass" 2) "123456" 127.0.0.1:6379> ShowAllCommands GotoFile3P FindinFILes 仓出F StartDAbMaaina -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630062524351-59a67479-4167-4c40-8eb9-08d4ddec012e.png)

> ⚠️ 安全提醒：`requirepass` 只是基础防护。生产环境 Redis 绝不能裸奔在公网——除了设密码，还要配 `bind` 限制监听地址、用防火墙/安全组隔离、禁止 `protected-mode no`。密码应该用 `AUTH` 或客户端配置传入，不要硬编码在代码里（走环境变量）。

### 9. 接口限流基本用法

Redis 还能做**接口限流**——保护医院 HIS 系统的「处方提交」接口不被恶意刷单。最简单的做法是用 `INCR` + `EXPIRE` 实现**固定窗口计数**：

```javascript
// 固定窗口限流：一个用户 1 分钟内最多提交 10 次处方
async function rateLimit(userId) {
  const key = `rate:prescription:${userId}`
  const count = await redis.incr(key)          // 计数 +1
  if (count === 1) {
    await redis.expire(key, 60)                // 第一次访问才设 1 分钟过期（窗口起点）
  }
  return count <= 10                           // 超过 10 次返回 false
}
```

这个写法的关键点：`INCR` 本身是原子操作（并发安全），第一次计数为 1 时才 `EXPIRE` 设置 60 秒过期——这样每个用户就有了一个「从第一次访问起算的 60 秒窗口」。超过阈值（10 次）就拒绝。但固定窗口有个「窗口边界突刺」的问题（第 60 秒和第 61 秒交界处，短时间能放行 2 倍流量），这在第二部分限流算法选型里展开。

到这里，「基本使用」的九个知识点——简介、安装、键操作、五大数据结构、Node 客户端、发布订阅、事务、备份安全、限流入门——就串完了。下面进入「企业最佳实践」，把这些东西往生产深度上推一层。

---

## 二、企业最佳实践

### 1. 五大数据结构选型：先想「要什么操作」

五大数据结构怎么选，是面试必考、也是实际开发最容易选错的地方。选型的核心方法一句话：**先想「要什么操作」，再反推用哪种结构**。

| 数据结构 | 适合存什么 | 核心操作 | 医疗场景 |
|---------|-----------|---------|---------|
| String | 单个值、计数器 | `SET`/`GET`/`INCR` | 缓存单个患者信息、处方提交次数计数 |
| Hash | 对象的多字段 | `HSET`/`HGET`/`HGETALL` | 患者档案（姓名/年龄/血型/过敏史多个字段） |
| List | 简单队列、时间线 | `LPUSH`/`RPOP`/`LRANGE` | 简单消息队列、就诊排队 |
| Set | 去重、集合运算 | `SADD`/`SINTER`/`SUNION` | 标签系统、共同标签交集 |
| Sorted Set | 带权重的排序 | `ZADD`/`ZRANGE` | 医生接诊排队优先级、排行榜 |

选型时的决策口诀：

- **需要排序** → Sorted Set（每个元素带分数，按分数排序）
- **需要去重** → Set（自动去重，支持交并差集）
- **需要队列** → List（头插尾弹，先进先出）
- **存对象多字段** → Hash（比序列化 JSON 存 String 更省内存、支持按字段单独读写）
- **单个值 / 计数器** → String

一个高频误区是「存对象就用 String 存 JSON」。两者都能存对象，但差别很大：

```javascript
// ❌ 用 String 存 JSON：改一个字段要整体序列化/反序列化，浪费 CPU 和带宽
await redis.set('patient:10086', JSON.stringify({ name: '张三', age: 30, bloodType: 'A' }))

// ✅ 用 Hash：按字段单独读写，只动需要改的那个字段
await redis.hset('patient:10086', 'name', '张三')
await redis.hset('patient:10086', 'age', 30)
await redis.hget('patient:10086', 'bloodType')   // 只读血型，不用拉整个对象
```

Hash 的优势在于**字段独立**：改年龄不用重新写整个对象，读血型不用拉全部字段。当对象的字段频繁被单独读写时，Hash 明显更优。

> 💬 **面试官**：Redis 的 Hash/List 等结构各适合什么场景？选型时先想什么？
>
> ✅ 标准答案：String 存单个值、Hash 存对象多字段、List 做简单队列、Set 做去重/交集、Sorted Set 做带权重的排序。选型时先想「要什么操作」：需要排序用 ZSet、需要去重用 Set、需要队列用 List、对象多字段用 Hash、单值计数用 String。
>
> 🎁 加分答案：能点出「存对象用 Hash 而非 String 存 JSON」的原因——Hash 支持按字段单独读写（改一个字段不用整体序列化）、更省内存；并补充底层细节：Hash 在字段少时会用紧凑的 ziplist/listpack 编码，内存占用远小于等价的 String JSON。

### 2. RDB 与 AOF 持久化：为什么要混合使用

第一部分第 8 节讲了 `SAVE`/`BGSAVE` 生成 `dump.rdb`，这就是 **RDB 持久化**。Redis 其实有两种持久化机制，各自有优缺点，生产环境是**组合使用**的。

**RDB（Redis Database）——内存快照**：

- 原理：在某个时间点把内存里的数据「拍照」存成 `dump.rdb` 文件（`SAVE` 前台阻塞、`BGSAVE` fork 子进程后台做）
- 优点：文件紧凑（二进制快照）、恢复快（直接加载进内存即可）
- 缺点：**两次快照之间**的变更会丢——因为快照是周期性触发的，最后一次快照之后、宕机之前写入的数据就没了

**AOF（Append Only File）——追加写命令日志**：

- 原理：把每条**写命令**追加记录到日志文件里（类似「重放」思路），重启时重放这些命令恢复数据
- 优点：丢数据窗口小（取决于刷盘策略，见第三部分「持久化性能权衡」）
- 缺点：文件比 RDB 大（记录的是命令而非紧凑快照）、恢复慢（要重放所有命令）

一张表对比：

| 维度 | RDB | AOF |
|------|-----|-----|
| 本质 | 内存快照 | 追加写命令日志 |
| 文件大小 | 小（紧凑二进制） | 大（命令日志） |
| 恢复速度 | 快（直接加载） | 慢（重放命令） |
| 丢数据窗口 | 两次快照之间会丢 | 小（取决于刷盘策略） |
| 触发方式 | 周期触发 | 每次写都记录 |

**生产通用做法是「RDB + AOF 混合持久化」**——用 AOF 保证数据安全（丢数据窗口小），用 RDB 加快重启恢复（大文件恢复不用一条条重放命令）。Redis 4.0+ 的「混合持久化」机制：AOF 文件前半段是 RDB 快照、后半段是增量命令，重启时先加载快照再补命令，兼顾了两者的优点。

> 💬 **面试官**：RDB 和 AOF 各自的优缺点是什么？生产环境一般怎么组合使用？
>
> ✅ 标准答案：RDB 是内存快照，文件小、恢复快，但两次快照间的变更会丢；AOF 是追加写命令日志，丢数据窗口小，但文件大、恢复慢。生产通用做法是「RDB + AOF 混合持久化」——用 AOF 保证数据安全、用 RDB（或混合模式的快照段）加快重启恢复。
>
> 🎁 加分答案：能点出 Redis 4.0+ 的「混合持久化」细节（AOF 文件 = RDB 快照头 + 增量命令），以及 `BGSAVE` fork 子进程、`SAVE` 会阻塞主线程所以生产用 `BGSAVE`；还能关联 AOF 的 `appendfsync` 三档策略（`always`/`everysec`/`no`）对丢数据窗口的影响。

### 3. 缓存穿透 / 击穿 / 雪崩三件套（重点）

这是 Redis 面试的「三座大山」，几乎必考，也是生产缓存事故的三类典型形态。三者名字像、场景像，但成因和应对完全不同，必须分清。

**缓存穿透**——查一个「数据库里也没有」的 key，每次都打到 DB：

- 成因：请求的 key 既不在缓存、也不在数据库（如恶意请求 `id=-1`），缓存永远不命中，请求每次都穿透到数据库
- 后果：数据库被大量无效查询打垮
- 应对：**缓存空值**（查 DB 没有也缓存一个「空」标记，短 TTL，下次直接拦在缓存层）或**布隆过滤器**（在缓存前加一层，快速判断 key 是否可能存在）

```javascript
// 应对穿透：缓存空值（短 TTL）
async function getPatient(id) {
  const cacheKey = `patient:${id}`
  let data = await redis.get(cacheKey)
  if (data !== null) {
    return data === '__NULL__' ? null : JSON.parse(data)   // 命中空值标记，直接返回
  }
  const patient = await db.queryPatient(id)                  // 查数据库
  if (patient) {
    await redis.set(cacheKey, JSON.stringify(patient), 'EX', 600)
  } else {
    await redis.set(cacheKey, '__NULL__', 'EX', 60)          // 👈 空值也缓存 60s，拦截穿透
  }
  return patient
}
```

**缓存击穿**——热点 key 过期的瞬间，大量并发同时打到 DB：

- 成因：某个热点 key（如明星医生的挂号信息）突然过期，海量请求同一瞬间涌向数据库重建
- 后果：数据库瞬时压力暴增
- 应对：**互斥锁只让一个请求重建缓存**（其他请求等待或返回旧值），或**热点数据永不过期**（后台异步更新）

```javascript
// 应对击穿：互斥锁只让一个请求重建缓存
async function getHotDoctor(doctorId) {
  const cacheKey = `doctor:${doctorId}`
  let data = await redis.get(cacheKey)
  if (data) return JSON.parse(data)

  const lockKey = `lock:doctor:${doctorId}`
  const lock = await redis.set(lockKey, '1', 'EX', 10, 'NX')  // 👈 抢锁，只有抢到锁的请求去重建
  if (lock) {
    try {
      data = await db.queryDoctor(doctorId)                    // 只有抢到锁的请求查 DB
      await redis.set(cacheKey, JSON.stringify(data), 'EX', 600)
    } finally {
      await redis.del(lockKey)                                 // 释放锁
    }
    return data
  }
  // 没抢到锁：短暂重试，等抢锁的请求把缓存建好
  await sleep(100)
  return getHotDoctor(doctorId)
}
```

**缓存雪崩**——大量 key 同时过期，或 Redis 宕机：

- 成因：① 大量 key 设置了相同的过期时间，到点集体失效；② Redis 本身宕机/重启
- 后果：缓存集体失效，所有请求瞬间打到 DB，造成「雪崩」
- 应对：**过期时间加随机抖动**（`TTL + 随机数`，避免同时失效）+ **Redis 高可用集群**（主从/哨兵/Cluster，避免单点宕机）

```javascript
// 应对雪崩：过期时间加随机抖动，避免大量 key 同时失效
const baseTTL = 600
const jitter = Math.floor(Math.random() * 120)     // 随机 0~120s 抖动
await redis.set(cacheKey, value, 'EX', baseTTL + jitter)
```

> 💬 **面试官**：缓存穿透、击穿、雪崩三者的区别是什么？分别怎么应对？
>
> ✅ 标准答案：穿透是「查数据库也没有的 key」，每次都打到 DB——应对是缓存空值或布隆过滤器；击穿是「热点 key 过期瞬间大量并发打到 DB」——应对是互斥锁只让一个请求重建缓存，或热点数据永不过期；雪崩是「大量 key 同时过期或 Redis 宕机」——应对是过期时间加随机抖动 + Redis 高可用集群。
>
> 🎁 加分答案：能说清三者的**成因关键词**——穿透是「key 不存在」、击穿是「热点 key 过期 + 高并发」、雪崩是「集体失效」；并能补充「互斥锁重建」和「布隆过滤器」的具体实现细节，以及「雪崩的 Redis 宕机要配合主从切换/哨兵，不是单靠应用层能解决的」。

### 4. 分布式锁的正确姿势

在分布式系统里，多个服务实例要竞争同一份资源（如「同一个处方只能被一个医生重复提交一次」），就需要**分布式锁**。Redis 实现分布式锁的核心命令是：

```
SET key value NX EX seconds
```

三个关键参数：

- **`NX`**：只在 key 不存在时才设置（`set if Not eXists`），保证「设置成功即获锁」——这是原子性抢锁的关键
- **`EX seconds`**：设置过期时间，**自动过期防死锁**（万一持锁进程崩溃，锁不会永久卡死）
- **`value`**：存一个**唯一标识**（如 `uuid`），用于释放锁时校验「这把锁是不是我加的」

```javascript
const { randomUUID } = require('crypto')

async function acquireLock(key, ttl = 30) {
  const token = randomUUID()                        // 唯一标识，标识「这把锁是我的」
  const ok = await redis.set(key, token, 'EX', ttl, 'NX')
  return ok ? token : null                          // 返回 null 表示没抢到锁
}
```

**释放锁**是最容易出事故的地方（详见第三部分「锁误删」），正确做法是「校验 value + 删除」必须原子完成，用 Lua 脚本：

```javascript
// 释放锁：Lua 保证「校验 value + DEL」原子执行
const RELEASE_LOCK_SCRIPT = `
  if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
  else
    return 0
  end
`

async function releaseLock(key, token) {
  await redis.eval(RELEASE_LOCK_SCRIPT, 1, key, token)
}
```

`SET NX EX` 实现分布式锁有**三个进阶坑**：

**坑① 锁被误删**：如果释放锁时直接 `DEL`（不校验 value），会出现「我的锁过期了、别人抢到了锁、我却把别人的锁删了」的乌龙。解决：value 存唯一标识，释放时先校验 value 再删，且「校验 + 删除」用 Lua 保证原子（上面的代码）。

**坑② 业务超时锁提前释放**：如果业务执行时间超过了锁的 `EX` 过期时间，锁会自动过期，别的请求抢到锁后，两个请求同时在改同一份数据。解决：**看门狗自动续期**——持锁期间定时检查，如果业务还没完成就 `EXPIRE` 延长锁的过期时间（Redisson 的 `watchdog` 就是这个机制）。

**坑③ 单实例宕机锁失效**：如果 Redis 是单实例，Redis 一宕机，锁就全失效了（或者主从切换时锁还没同步到从节点就丢了）。解决：**Redlock 多实例算法**（向多个独立的 Redis 实例分别抢锁，超过半数成功才算获锁）——但 Redlock 有争议（Martin Kleppmann 等指出它在时钟跳变、GC 停顿等极端情况下仍可能失效），需要权衡复杂度。多数场景「单实例 + 看门狗 + 正确释放」已经够用，Redlock 只在「对锁的强一致性要求极高、且能接受多实例运维成本」时才上。

> 💬 **面试官**：用 `SET key value NX EX` 实现分布式锁，有哪些坑？怎么解决锁被误删的问题？
>
> ✅ 标准答案：三个坑——① 锁被误删：value 存唯一标识，释放时先校验再删，用 Lua 保证原子；② 业务超时锁提前释放：用看门狗自动续期；③ 单实例宕机锁失效：Redlock 多实例。解决锁误删的关键是「校验 value + 删除」用 Lua 脚本原子完成，不能分两步（先 GET 再 DEL 中间可能被插队）。
>
> 🎁 加分答案：能讲清「为什么释放锁必须原子」——如果先 `GET` 判断 value 相等、再 `DEL`，两步之间锁可能刚好过期、被别人抢走，`DEL` 就删了别人的锁；并能补充 Redlock 的争议（时钟跳变/GC 停顿下仍可能失效），体现对方案的权衡判断而非背结论。

### 5. 淘汰策略选型：别用默认的 noeviction

Redis 内存是有限的，当内存达到 `maxmemory` 上限时，按什么策略淘汰旧数据？这就是**淘汰策略（eviction policy）**。常见的几种：

- **`noeviction`（默认）**：内存满时**拒绝写入**、报错——生产缓存忘了配策略，会表现为「突然写不进去」的诡异故障
- **`allkeys-lru`**：对所有 key 按 **LRU（最近最少使用）**淘汰——把「最久没被访问」的键删掉
- **`allkeys-lfu`**：对所有 key 按 **LFU（最不经常使用）**淘汰——把「历史访问频率最低」的键删掉
- **`volatile-lru`/`volatile-lfu`**：只对「设了过期时间」的 key 做 LRU/LFU 淘汰（没设过期的 key 不淘汰）

LRU 和 LFU 的区别，是高频考点：

- **LRU（Least Recently Used）**：看「最近一次访问时间」，越久没访问越先被淘汰。它区分不了「历史高频但最近没访问」和「只访问过一次」——一个刚访问过、但只访问了一次的 key，在 LRU 眼里比一个「昨天访问了 100 次、今天还没访问」的 key 更「年轻」。
- **LFU（Least Frequently Used）**：看「历史访问频率」，频率越低的越先被淘汰。它能更好地区分「历史高频」和「刚访问一次」——刚访问一次的 key 频率还是低，会被优先淘汰。

> 一句话：**LRU 看「最近有没有用」，LFU 看「历史上用了多少次」**。LFU 更适合「热点数据」和「一次性数据」混杂的缓存场景。

**选型原则**：缓存场景通常**显式配 `allkeys-lru` 或 `allkeys-lfu`，不要用默认的 `noeviction`**——否则内存一满就写不进去，故障表现极其诡异（第三部分展开）。

```shell
CONFIG SET maxmemory 2gb
CONFIG SET maxmemory-policy allkeys-lru   # 缓存场景推荐，显式指定淘汰策略
```

> 💬 **面试官**：Redis 的淘汰策略有哪些？LRU 和 LFU 有什么区别？为什么缓存场景别用默认的 noeviction？
>
> ✅ 标准答案：常见有 `noeviction`（默认，内存满拒绝写入）、`allkeys-lru`、`allkeys-lfu`、`volatile-lru/lfu`。LRU 看「最近访问时间」、LFU 看「历史访问频率」——LFU 更能区分「历史高频」和「刚访问一次」。缓存场景应显式配 `allkeys-lru` 或 `allkeys-lfu`，别用默认 `noeviction`，否则内存满会拒绝写入、表现为诡异的写失败。
>
> 🎁 加分答案：能讲清 LRU 的盲区（无法区分「历史高频最近没访问」和「只访问一次」），以及 Redis 的 LRU/LFU 是「近似实现」（抽样而非全量排序，兼顾性能），不是严格意义上的精确 LRU/LFU。

### 6. 接口限流算法选型：令牌桶 vs 漏桶

第一部分第 9 节讲了固定窗口限流。生产里的限流算法不止这一种，从简单到复杂有四种，核心是理解「令牌桶」和「漏桶」的差异。

**固定窗口计数**（`INCR`+`EXPIRE`，最简单）：

- 原理：一个固定时间窗口内计数，超过阈值拒绝
- 缺点：**窗口边界突刺**——第 59 秒和第 61 秒交界处，两个窗口「背靠背」，短时间能放行 2 倍流量

**滑动窗口**（更平滑）：

- 原理：窗口是「滑动」的（如任意 1 分钟），用 ZSet 记录每次请求时间戳、淘汰窗口外的
- 优点：平滑、无边界突刺；缺点：内存开销大（要记录每次请求时间戳）

**令牌桶（Token Bucket）**：

- 原理：一个桶以恒定速率往里面放令牌，桶有容量上限；每个请求要先「取走一个令牌」才能放行，桶空了就拒绝
- 特点：**允许突发**——桶里积攒的令牌可以一次性取走，所以短时间能放行一波突发流量（桶容量就是「突发上限」）

**漏桶（Leaky Bucket）**：

- 原理：请求先进一个「漏桶」，漏桶以恒定速率「漏水」（处理请求），桶满了就拒绝
- 特点：**强制平滑**——不管请求来得有多猛，出去的速率是恒定的，把突发流量「削平」成匀速流

**令牌桶 vs 漏桶的核心差异**，一句话：**令牌桶允许突发、漏桶强制平滑**。令牌桶攒下的令牌可以让「瞬时流量」冲一下（如秒杀开闸瞬间），漏桶则把一切都压成匀速。按「是否允许短时突发」选型：需要允许突发（如秒杀、抢购）用令牌桶；需要严格匀速（如对下游接口的保护、按固定速率调用）用漏桶。

**生产用 Lua 脚本**：无论哪种算法，生产实现都要用 Lua 脚本把「读取-判断-更新」封装成**原子操作**，避免并发竞态（多个请求同时读计数、都判断「没超限」、都放行）：

```lua
-- 固定窗口限流 Lua：原子地「读计数 → 判断 → 更新」
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current = tonumber(redis.call('get', key) or '0')
if current >= limit then
  return 0                      -- 超限，拒绝
end
redis.call('incr', key)
if current == 0 then
  redis.call('expire', key, window)
end
return 1                        -- 放行
```

```javascript
// Node.js 侧调用
const result = await redis.eval(LIMIT_SCRIPT, 1, `rate:prescription:${userId}`, 10, 60)
if (result === 0) return { code: 429, message: '提交过于频繁' }
```

为什么必须用 Lua？因为「读计数 → 判断 → 加一」这三步如果不是原子操作，两个并发请求可能同时读到 `count=9`、同时判断「没超限」、同时放行——限流就失效了。Lua 脚本在 Redis 里是整体原子执行的，天然避免了这个竞态。

> 💬 **面试官**：令牌桶和漏桶算法的核心区别是什么？为什么令牌桶允许突发流量？
>
> ✅ 标准答案：令牌桶以恒定速率往桶里放令牌，请求取到令牌才放行——因为令牌可以积攒，攒下的令牌能让短时间放行一波突发流量；漏桶以恒定速率漏水（处理请求），不管请求来得多猛，出去的速率恒定——把突发「削平」成匀速流。核心差异是「是否允许短时突发」：允许突发用令牌桶，强制平滑用漏桶。
>
> 🎁 加分答案：能补充「桶容量 = 突发上限」这个细节（令牌桶容量越大，能扛的突发越大），以及「固定窗口有边界突刺、滑动窗口平滑但内存开销大」的演进逻辑，并能点出「生产限流必须用 Lua 脚本把读-判-更封装成原子操作，否则并发下会失效」。

到这里，「企业最佳实践」讲完了六个深度点。下面进入「注意事项」——那些在生产里最容易翻车、面试里也常被追问的坑。

---

## 三、注意事项

### 1. 锁误删是最常见事故

释放分布式锁时若直接 `DEL`，会把**别人的锁**删掉——这是分布式锁最常见、也最隐蔽的事故。场景还原：

1. 请求 A 持锁，业务执行超过了锁的过期时间，锁自动过期
2. 请求 B 抢到了锁，开始执行
3. 请求 A 业务终于执行完，直接 `DEL` 把锁删了——删的是 **B 的锁**
4. 请求 C 又抢到锁，于是 B、C 同时在改同一份数据

**正确做法**：释放时必须「校验 value 唯一标识 + 删除」**原子完成**（第二部分第 4 节的 Lua 脚本）。判断「这把锁是不是我的」再删，且两步合成一步，中间不能被插队。

> 一句话记住：**加锁用 `SET NX EX`，解锁用 Lua「校验 value 再 DEL」，永远不要裸 `DEL`。**

### 2. 大 key 与 `KEYS *`

**大 key**（超大 List/Hash，如一个 List 里塞了几百万个元素）会导致阻塞——读取、删除、迁移这个大 key 时，Redis 单线程会被长时间占用，所有其他请求都被卡住。应对：**大 key 拆分成小 key**（如按日期分片 `queue:2026-09-23`），避免单个 key 过大。

**`KEYS *` 在生产是禁忌**——它是**全库扫描**，会阻塞 Redis 单线程。数据量一大，执行 `KEYS *` 期间整个 Redis 都无响应。应对：用 **`SCAN` 游标**替代：

```shell
# ❌ 生产禁忌：全库扫描，阻塞单线程
KEYS *

# ✅ 用 SCAN 游标，分批迭代，不阻塞
SCAN 0 MATCH patient:* COUNT 100
```

`SCAN` 每次只返回一小批 + 一个游标，迭代式地把所有 key 遍历出来，中间不阻塞其他请求。虽然 `SCAN` 不是精确遍历（遍历过程中增删 key 可能漏/重），但生产宁可接受这个「近似」，也要避免 `KEYS *` 的「阻塞」。

> 💬 **面试官**：为什么生产环境禁用 `KEYS *`？用什么替代？
>
> ✅ 标准答案：`KEYS *` 是全库扫描，Redis 命令执行是单线程的，扫描期间会阻塞所有其他请求，数据量大时整个 Redis 无响应。用 `SCAN` 游标替代——`SCAN` 分批迭代返回，不阻塞。
>
> 🎁 加分答案：能补充 `SCAN` 的三个特性——① 不阻塞（分批返回）；② 不是精确遍历（迭代期间增删 key 可能漏/重，因为它基于游标而非快照）；③ 大 key 也要拆分成小 key（否则单个 key 过大仍会阻塞）。

### 3. `noeviction` 的坑

Redis **默认**淘汰策略是 `noeviction`——内存满了**拒绝写入**。生产缓存忘了配策略，会表现为「突然写不进去」的诡异故障：某个时间点开始，缓存写操作开始报 `OOM command not allowed when used memory > 'maxmemory'`，但读操作正常、也没报什么明显错误，排查半天才发现是内存满了。

应对：缓存场景**显式配 `allkeys-lru` 或 `allkeys-lfu`**（第二部分第 5 节），并设好 `maxmemory`，让内存满时按策略淘汰旧数据，而不是直接拒绝写入。

### 4. 「Redis 单线程」的误读

「Redis 是单线程的」这个说法**只对了一半**，误读它会导致两个错误判断：

- **正确的一半**：Redis 的**命令执行**是单线程的——所以单条命令很快（没有锁开销、没有线程切换），但反过来，任何一条慢命令（`KEYS *`、大 key 操作）都会**阻塞所有请求**，因为大家都排队等这单线程处理。
- **错误的一半**：别把「单线程」当成「所有操作都慢」或「可以随便来」的理由。**Redis 6.0+ 的网络 I/O 已经多线程化**（读写 socket 用多线程，命令执行仍单线程）——这是「I/O 多线程、命令单线程」的架构。

所以正确的理解是：**命令执行单线程（所以单条命令很快、但要小心慢命令阻塞全局），网络 I/O 已多线程（所以吞吐能继续往上堆）**。这解释了为什么 Redis 能单机扛 10w+ QPS，也解释了为什么 `KEYS`/大 key 会拖垮全局。

### 5. 持久化与性能的权衡

AOF 的 `appendfsync`（刷盘策略）有三档，是「数据安全 vs 性能」的经典权衡：

| 策略 | 刷盘时机 | 安全性 | 性能 |
|------|---------|-------|------|
| `always` | 每次写命令都刷盘 | 最安全（几乎不丢） | 最慢 |
| `everysec` | 每秒刷盘一次 | 折中（最多丢 1 秒） | 折中 |
| `no` | 交给操作系统决定 | 最快 | 可能丢数据（依赖 OS 刷盘时机） |

**按业务对丢数据的容忍度配，不要盲目求安全或求快**：金融交易、订单扣款这类不能丢数据的场景，宁可 `everysec` 甚至 `always`（配合硬件和架构）；缓存、浏览计数这类「丢一点没关系」的场景，`everysec` 或 `no` 即可。绝大多数生产场景 **`everysec` 是性价比最优解**——最多丢 1 秒数据，性能损失可接受。

---

## 参考资料

- https://redis.io/docs/latest/ （Redis 官方文档）
- https://redis.io/docs/latest/commands/ （Redis 命令参考）
- https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/ （RDB/AOF 持久化）
- https://redis.io/docs/latest/operate/oss_and_stack/management/eviction/ （内存淘汰策略）
- https://redis.io/docs/latest/develop/use/patterns/distributed-locks/ （分布式锁模式）
- https://github.com/redis/ioredis （ioredis 官方仓库）
- https://github.com/redis/node-redis （node-redis 官方仓库）

> 缓存穿透/击穿/雪崩、Redlock 争议、令牌桶/漏桶算法等主题，推荐搜索关键词「Redis 缓存穿透 击穿 雪崩」「Redlock 分布式锁 争议 Martin Kleppmann」「令牌桶 漏桶 限流算法」「Redis 大 key 排查 SCAN」。

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 考察频率 |
|--------|-----------|---------|
| 五大数据结构选型 | 先想「要什么操作」：排序 ZSet、去重 Set、队列 List、对象 Hash、单值 String | ⭐⭐⭐ 必考 |
| RDB vs AOF | RDB 快照快但会丢、AOF 日志安全但慢，生产「混合持久化」 | ⭐⭐⭐ 必考 |
| 缓存穿透 | 查 DB 也没有的 key → 缓存空值 / 布隆过滤器 | ⭐⭐⭐ 必考 |
| 缓存击穿 | 热点 key 过期 + 高并发 → 互斥锁只让一个请求重建 | ⭐⭐⭐ 必考 |
| 缓存雪崩 | 大量 key 同时过期 / Redis 宕机 → 随机抖动 + 高可用集群 | ⭐⭐⭐ 必考 |
| 分布式锁 | `SET NX EX` 加锁 + Lua「校验 value 再删」解锁 | ⭐⭐⭐ 必考 |
| 淘汰策略 | 缓存显式配 allkeys-lru/lfu，别用默认 noeviction | ⭐⭐ 高频 |
| 令牌桶 vs 漏桶 | 令牌桶允许突发、漏桶强制平滑 | ⭐⭐ 高频 |
| 大 key 与 KEYS | 禁 `KEYS *`，用 `SCAN` 游标 + 大 key 拆分 | ⭐⭐ 高频 |
| 单线程误读 | 命令执行单线程，6.0+ 网络 I/O 已多线程 | ⭐⭐ 高频 |

> 💡 记住这条主线：**五大数据结构是「按操作选型」→ 持久化是「安全 vs 性能的算账」→ 缓存三件套是「穿透/击穿/雪崩三类事故的分别应对」→ 分布式锁是「加锁原子、解锁更原子」→ 限流是「令牌桶允许突发、漏桶强制平滑」**。Redis 的生产实践，每一步都在做取舍。

---

## 💡 面试核心问

- **Redis 的 Hash/List 等结构各适合什么场景？选型时先想什么？**（String 单值、Hash 对象、List 队列、Set 去重、ZSet 排序；先想「要什么操作」）
- **RDB 和 AOF 各自的优缺点是什么？生产环境一般怎么组合使用？**（RDB 快照快但会丢、AOF 安全但慢；混合持久化）
- **缓存穿透、击穿、雪崩三者的区别是什么？分别怎么应对？**（穿透=key 不存在、击穿=热点 key 过期、雪崩=集体失效；空值/互斥锁/随机抖动）
- **用 `SET key value NX EX` 实现分布式锁，有哪些坑？怎么解决锁被误删的问题？**（锁误删/超时提前释放/单实例宕机；Lua 校验 value 再删）
- **令牌桶和漏桶算法的核心区别是什么？为什么令牌桶允许突发流量？**（令牌桶令牌可积攒、允许突发；漏桶恒定速率、强制平滑）
- **为什么生产环境禁用 `KEYS *`？`noeviction` 默认策略会带来什么坑？**（全库扫描阻塞单线程，用 SCAN；内存满拒绝写入）

---

## 📝 思考题

你给「医生接诊排队」设计一个优先级队列，用 Redis 的 Sorted Set 实现——分数是「接诊优先级」，元素是「患者 ID」。现在有两个细节要考虑：

1. 分数相同怎么办？Sorted Set 分数可以重复，但元素不能重复——两个患者优先级都是 5，怎么保证他们按「先来后到」排序？
2. 如果患者中途转诊、优先级要改（`ZADD` 更新分数），会不会有什么问题？

提示：想想 Sorted Set 底层在「分数相同」时按什么排序（成员字典序），以及「分数 + 时间戳」组合的技巧能不能解决「同分先来后到」的问题。

欢迎评论区写出你的答案 👇

---

> 🔖 这是「Node.js 全栈深度拆解」系列第 14 篇。上一篇：《MongoDB 深度：文档模型/聚合管道/索引策略/Mongoose 最佳实践》；下一篇预告：《PostgreSQL 进阶：窗口函数/JSONB/高级索引/pgvector 向量扩展》
>
> 前置基础扩展阅读：搜索关键词「Node.js 事件驱动 EventEmitter 发布订阅」「MySQL 索引 事务 隔离级别」「MongoDB 聚合管道 索引」「Redis 持久化 RDB AOF」
