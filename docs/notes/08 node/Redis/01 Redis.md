# Redis简介
+ Redis是完全开源免费的，遵守BSD协议，是一个高性能的key-value数据库。

# 优势
+ 性能极高：Redis能读的速度是110000次/s，写的速度是81000次/s
+ 丰富的数据类型：Redis支持二进制的字符串、列表、哈希值、集合和有序集合等数据类型操作
+ 原子性：Redis的所有操作都是原子性的，意思就是要么成功执行要么失败完全不执行
+ 单个操作是原子性的，多个操作也支持事务，及原子性，通过MULTI 和 EXEC指令包起来
+ 丰富的特性：Redis还支持发布/订阅，通知，key过期等等特性

# 安装
## window


+ **<font style="color:rgb(51, 51, 51);">下载地址：</font>**[https://github.com/tporadowski/redis/releases](https://github.com/tporadowski/redis/releases)<font style="color:rgb(51, 51, 51);">。</font>
+ <font style="color:rgb(51, 51, 51);">Redis 支持 32 位和 64 位。这个需要根据你系统平台的实际情况选择，这里我们下载 </font>**<font style="color:rgb(51, 51, 51);">Redis-x64-xxx.zip</font>**<font style="color:rgb(51, 51, 51);">压缩包到 C 盘，解压后，将文件夹重新命名为 </font>**<font style="color:rgb(51, 51, 51);">redis</font>**<font style="color:rgb(51, 51, 51);">。</font>

<!-- 这是一张图片，ocr 内容为：DownIoads 5.8MB Redis-x64-3.2.100.msi Redis-X64-3.2.100.zip 4.98MB Sourcecode(zip) Sourcecode(tar.gz) -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630044468346-ecd6e351-695e-4ce6-94e8-6a81135789bb.png)

+ <font style="color:rgb(51, 51, 51);">打开文件夹，内容如下：</font>

<!-- 这是一张图片，ocr 内容为：新建文件夹 中 共享 类型 修改日期 名称 大小 15 RDB文件 dumprdb 2017/7/2014:34 Eventlogadll 应用程序扩展 2016/7/116:27 13 MicrosoftOffice... 20167/116:07 RedisonWindowsReleaseNotesdo... 17 Microsoftoffice... RedisonWindowsdocx 20167/116:07 CONF文件 redis.windows.conf 2016/7/116:07 48 CONF文件 48 redis.windows-service.conf 20167/116:07 400 应用程序 redis-benchmark.exe 20167/116:28 redis-benchmark.pdb PDB文件 4,268 20167/116:28 251 应用程序 redis-check-aof.exe 2016/7/116:28 redis-check-aofipdb PDB文件 3,436 20167/116:28 应用程序 488 2016/7/116:28 redis-cliexe redis-clipdb PDB文件 4420 2016/7/116:28 1628 应用程序 redis-serverexe 20167/116:28 PDB文件 redisserver.pdb 6916 20167/116:28 14 MicrosoftOffice... WindowsServiceDocumentation.docx 20167/19:17 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630044506889-3c116990-d37a-4a2d-917f-05949b528b8c.png)

+ <font style="color:rgb(51, 51, 51);">打开一个 </font>**<font style="color:rgb(51, 51, 51);">cmd</font>**<font style="color:rgb(51, 51, 51);"> 窗口 使用 cd 命令切换目录到 </font>**<font style="color:rgb(51, 51, 51);">C:\redis</font>**<font style="color:rgb(51, 51, 51);"> 运行：</font>

```shell
redis-server.exe redis.windows.conf
```

+ <font style="color:rgb(51, 51, 51);">如果想方便的话，可以把 redis 的路径加到系统的环境变量里，这样就省得再输路径了，后面的那个 redis.windows.conf 可以省略，如果省略，会启用默认的。输入之后，会显示如下界面：</font>

<!-- 这是一张图片，ocr 内容为：答理员:ciwindowslsystem32mdexe-redisserverexerediswindowsconf redis-seryerexerediswindowc edis> Redis3.2100(00990000/064bit Runninginstandalonemode Port:6379 PID:15292 http://redis.io 15292125Mu1411:13 115292125Mu141113 on ot6379 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630044565180-9594486a-84f6-4ad7-a2aa-9b246929a365.png)

+ <font style="color:rgb(51, 51, 51);">这时候另启一个 cmd 窗口，原来的不要关闭，不然就无法访问服务端了。</font>
+ <font style="color:rgb(51, 51, 51);">切换到 redis 目录下运行:</font>

```shell
redis-cli.exe -h 127.0.0.1 -p 6379
```

+ <font style="color:rgb(51, 51, 51);">设置键值对:</font>

```shell
set myKey abc
```

+ <font style="color:rgb(51, 51, 51);">取出键值对:</font>

```javascript
get myKey
```

<!-- 这是一张图片，ocr 内容为：理员:Windowssystemexex. p6379 CN.尝 cAvedisorediscliexeh 127.0.0.1:639>setmykeyabc OK 1270.0.1:637>getmyKey abc 127.0.0.1:6379> -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630044632459-39a0e88b-46b0-49a8-84aa-74e6887c339a.png)

## mac
+ 没有安装Homebrew，首先安装npm国内的吧，快一些。

```shell
/bin/zsh -c "$(curl -fsSL https://gitee.com/cunkai/HomebrewCN/raw/master/Homebrew.sh)"
```

+ 使用Homebrew安装命令

```shell
brew install redis

# brew tap ringohub/redis-cli
# brew install redis-cli
```

+ 执行上述命令后出现以下，则成功安装：

<!-- 这是一张图片，ocr 内容为：飞31 robi@Royan:~ 入Royan~brewinstallredis Dowloodinght/ 二-> 世+界界界界界界界界界界界 Dowlogdinght:/ 世排排排排排界界界快快排排排打打护护料料料料料护排排打打打打排排排排排件件100 Installingdependenciesforredis:openss@1. Installingredisdependency:openssl@1.1 Pouringopenss@1.1-1.1..igle RegeneratingcAcertificatebundlefromkeychain,thyk /usr/local/cella/openss@1./1 Installingredis Pouringredis-6.2.5.big-sur.ottle.trg Caveats ostartredis: brewservicesstartredis orifyoudontwant/needabackgoundserviceyoucanjust usr/locaL/opt/redis/bin/redis-server/usr/loca/et/redis.conf Summary /usr/local/Cellar/redis/6.2.5:14files.M Caveats redis Tostartredis: brewservicesstartredis orifyoudon'twant/needabackgroundserviceo youcanjustrun: lusr/local/opt/redis/bin/redis-server/usr/oca/et/redico 入Royan -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630045709531-0b6c68f4-12e6-425b-acff-2620f9e7fed3.png)

+ <font style="color:rgb(77, 77, 77);">查看安装及配置文件位置</font>
    - Homebrew安装的软件会默认在/usr/local/Cellar/路径下
    - redis的配置文件redis.conf存放在/usr/local/etc路径下
+ 启动redis服务

```shell
//方式一：使用brew帮助我们启动软件
brew services start redis
//方式二
redis-server /usr/local/etc/redis.conf

//执行以下命令
redis-server
```

+ 查看redis服务进程

```shell
ps axu | grep redis
```

+ redis-cli连接redis服务
    - redis默认端口号6379，默认auth为空，输入以下命令即可连接

```shell
redis-cli -h 127.0.0.1 -p 6379
```

+ 启动 redis 客户端，打开终端并输入命令 redis-cli。该命令会连接本地的 redis 服务。
    - 在以下实例中我们连接到本地的 redis 服务并执行 PING 命令，该命令用于检测 redis 服务是否启动。

```shell
$redis-cli
redis 127.0.0.1:6379>
redis 127.0.0.1:6379> PING
PONG
```

+ 关闭redis服务
    - 正确停止Redis的方式应该是向Redis发送SHUTDOWN命令
    - 强行终止redis

```shell
// 停止Redis
redis-cli shutdown
// 强行终止redis
sudo pkill redis-server 
```

+ redis.conf 配置文件详解
    - redis默认是前台启动，如果我们想以守护进程的方式运行（后台运行），可以在redis.conf中将daemonize no,修改成yes即可。

# 配置
```shell
CONFIG GET CONFIG_SETTING_NAME
CONFIG GET port
```

# <font style="color:rgb(0, 0, 0);background-color:rgb(250, 252, 253);">键</font>
> [Redis 键(key) | 菜鸟教程](https://www.runoob.com/redis/redis-keys.html)
>

+ <font style="color:rgb(51, 51, 51);background-color:rgb(250, 252, 253);">查找以 runoob 为开头的 key：</font>

```shell
redis 127.0.0.1:6379> KEYS runoob*
1) "runoob3"
2) "runoob1"
3) "runoob2"
```

+ <font style="color:rgb(51, 51, 51);background-color:rgb(250, 252, 253);">获取 redis 中所有的 key 可用使用 </font>**<font style="color:rgb(51, 51, 51);background-color:rgb(250, 252, 253);">*</font>**<font style="color:rgb(51, 51, 51);background-color:rgb(250, 252, 253);">。</font>

```shell
redis 127.0.0.1:6379> KEYS *
1) "runoob3"
2) "runoob1"
3) "runoob2"
```

# 数据类型
## 字符串
+ 字符串是最基本的类型，一个key对应一个value。

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

## 哈希值
+ 哈希值是一个字符串类型的Key和值的映射表，特别适合用于存储对象。

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

### HKEYS 获取所有key
```shell
HKEYS person
```

## 列表
+ 列表是简单的字符串列表，按照插入顺序排序，可以添加一个元素到列表的头部(左边)或者尾部(右边)。

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
LINDEX 0
```

### LLEN 获取列表长度
```shell
LLEN ids
```

### LREM 移除列表元素
+ count > 0 : 从表头开始向表尾搜索，移除与 VALUE 相等的元素，数量为 COUNT 。
+ count < 0 : 从表尾开始向表头搜索，移除与 VALUE 相等的元素，数量为 COUNT 的绝对值。
+ count = 0 : 移除表中所有与 VALUE 相等的值。

```shell
LREM ids 1 1
```

## 集合
+ 集合是字符串类型的无序集合。

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

## 有序列表
+ 有序集合和集合一样也是字符串的集合，而且不能重复，不同之处是每个集合都会关联一个double类型的分数，redis可以通过这个分类为集合中的元素进行从小到大排序，元素不能重复，但分数可以重复。

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

# Node.js中的使用
## 安装依赖
```shell
npm install redis
```

[redis](https://www.npmjs.com/package/redis)

## 基本使用
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

# 发布订阅
## 概述
+ Redis 发布订阅 (pub/sub) 是一种消息通信模式：发送者 (pub) 发送消息，订阅者 (sub) 接收消息。
+ Redis 客户端可以订阅任意数量的频道。
+ 下图展示了频道 channel1 ， 以及订阅这个频道的三个客户端 —— client2 、 client5 和 client1 之间的关系：

<!-- 这是一张图片，ocr 内容为：channel1 subscribecubscribe subscribe client5 client2 client1 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630060248734-6009e4e8-1bdc-43ac-8639-044aec486909.png)

+ 当有新消息通过 PUBLISH 命令发送给频道 channel1 时， 这个消息就会被发送给订阅它的三个客户端：

<!-- 这是一张图片，ocr 内容为：PUBLISHchannel1message channel1 messagermessage mmessage client5 client2 client1 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630060278893-5edc3720-b2f2-481d-8eab-ce6de6782f30.png)

## 客户端一
```shell
redis-cli
subscribe channel_a
```

## 客户端二
```shell
redis-cli
publish channel_a hello
```

<!-- 这是一张图片，ocr 内容为：t31 redis-cli X Xredis-cli(redis-cli) redis-cli(redis-cli) 127.0.0.1:6379>subscribechannel-a Lastlogin:FriAug2714:26:48onttys02 入Royan~3redis-cli Readingmessages...(pressctrl-ctoquit) 127.0.0.1:6379publishchannel_ahello 1"subscribe" 2"channel-a" (integer)1 口 127.0.0.1:6379> (integer)1 "message" "channel-a" "helLo" ShowAllCommands P GotoFile P 30 FindinFiles StartDebugging F5 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630060567098-8a49f920-fb7b-4f67-99b4-cf7d66e06d72.png)

## node中使用
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
  // 那以后将不再接受频道channel_b发过了的消息
  client1.unsubscribe('channel_b');
});
client2.publish('channel_a', 'hello');
client2.publish('channel_b', 'world');
setTimeout(() => {
  client2.publish('channel_a', 'hello2');
  client2.publish('channel_b', 'world2');
}, 2000)
```

# 事物
## 基本使用
+ Redis 事务可以一次执行多个命令， 并且带有以下三个重要的保证：
    - 批量操作在发送 EXEC 命令前被放入队列缓存。
    - 收到 EXEC 命令后进入事务执行，事务中任意命令执行失败，其余的命令依然被执行。
    - 在事务执行过程，其他客户端提交的命令请求不会插入到事务执行命令序列中。
+ 一个事务从开始到执行会经历以下三个阶段：
    - 开始事务。
    - 命令入队。
    - 执行事务。

```shell
MULTI
SET count 1
SET count2 2
GET count
EXEC
```

<!-- 这是一张图片，ocr 内容为：1351 redis-cli 127.0.0.1:6379>MULTI OK 127.0.0.1:6379TX>SETcount1 QUEUED 127.0.0.1:6379TX>SETcount22 OUEUED 127.0.0.1:6379TX>GETcount QUEUED 127.0.0.1:6379(TX>EXEC 10K 2)0K 3)"1" 127.0.0.1:6379> ShowAllCommands 8 GotoFile 第P FindinFiles 出 StartDebugging F5 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630061470665-91acddb9-48fc-4e93-b5d9-3746efed7744.png)

+ 单个 Redis 命令的执行是原子性的，但 Redis 没有在事务上增加任何维持原子性的机制，所以 Redis 事务的执行并不是原子性的。
+ 事务可以理解为一个打包的批量执行脚本，但批量指令并非原子化的操作，中间某条指令的失败不会导致前面已做指令的回滚，也不会造成后续的指令不做。

```shell
multi
set a aaa
set b bbb
set c ccc
exec
```

<!-- 这是一张图片，ocr 内容为：1351 redis-cli 127.0.0.1:6379>MULTI OK 127.0.0.1:6379TX>SETcount QUEUED 127.0.0.1:6379TX>SETcount22 OUEUED 127.0.0.1:6379TX>GETcount QUEUED 127.0.0.1:6379(TX>EXEC 10K 20K 3"1" 127.0.0.1:6379>multi OK 127.0.0.1:6379(TX> set caaaa QUEUED 127.0.0.1:6379TX>setbbbb QUEUED ShowAllCommands 8 127.0.0.1:6379TX>setcccc QUEUED GotoFile 第P 127.0.0.1:6379TX> exec 10K 2)0K FindinFiles 出 3)0K 127.0.0.1:6379> StartDebugging F5 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630061600486-1e3b4a93-635d-433a-8883-6f23398685ec.png)

> <font style="color:rgb(51, 51, 51);">如果在 set b bbb 处失败，set a 已成功不会回滚，set c 还会继续执行。</font>
>

## node中使用
```javascript
const redis = require('redis');
const client = redis.createClient(6379, '127.0.0.1');
client.multi().set('count3', 3).set('count4', 4).get('count4').exec(redis.print);
```

# 备份与恢复
## 备份
```shell
SAVE 
```

> 该命令将在 redis 安装目录中创建dump.rdb文件。
>

## 恢复
```shell
CONFIG GET dir
```

> <font style="color:rgb(51, 51, 51);">以上命令 </font>**<font style="color:rgb(51, 51, 51);">CONFIG GET dir</font>**<font style="color:rgb(51, 51, 51);"> 输出的 redis 安装目录为 /usr/local/redis/bin。</font>
>

## <font style="color:rgb(51, 51, 51);">Bgsave</font>
+ <font style="color:rgb(51, 51, 51);">创建 redis 备份文件也可以使用命令 </font>**<font style="color:rgb(51, 51, 51);">BGSAVE</font>**<font style="color:rgb(51, 51, 51);">，该命令在后台执行。</font>

```shell
BGSAVE
```

# 安全
+ 我们可以通过 redis 的配置文件设置密码参数，这样客户端连接到 redis 服务就需要密码验证，这样可以让你的 redis 服务更安全。

```shell
CONFIG get requirepass
```

> <font style="color:rgb(51, 51, 51);">默认情况下 requirepass 参数是空的，这就意味着你无需通过密码验证就可以连接到 redis 服务。</font>
>

<!-- 这是一张图片，ocr 内容为：t31 redis-cli 127.0.0.1:6379>CONFIGget requirepass 1"requirepass" 2 1550 127.0.0.1:6379> ShowAllCommands GotoFileP FindinFiles 食出F Starthabuaaina -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630062321138-3491eb35-37cc-408e-a939-ae0b5f72212e.png)

+ <font style="color:rgb(51, 51, 51);">可以通过以下命令来修改该参数</font>

```shell
CONFIG set requirepass "123456"
```

+ 设置密码后，客户端连接 redis 服务就需要密码验证，否则无法执行命令。

```shell
AUTH 123456
```

<!-- 这是一张图片，ocr 内容为：1381 redis-cli 127.0.0.1:6379>CONFIGset requirepass"123456" OK 127.0.0.1:6379>CONFIGget requirepass 1"requirepass" 2)"123456" 127.0.0.1:6379> 入Royan~redis-cli 127.0.0.1:6379ConFIGgetrequiras (error)noauTHAuthenticationrequired. 127.0.0.1:6379>AUTH123456 OK 127.0.0.1:6379ConFIGgetrquiepass 1) "requirepass" 2) "123456" 127.0.0.1:6379> ShowAllCommands GotoFile3P FindinFILes 仓出F StartDAbMaaina -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630062524351-59a67479-4167-4c40-8eb9-08d4ddec012e.png)

# 参考
[redis中文官方网站](http://redis.cn/)



[Redis 安装 | 菜鸟教程](https://www.runoob.com/redis/redis-install.html)



