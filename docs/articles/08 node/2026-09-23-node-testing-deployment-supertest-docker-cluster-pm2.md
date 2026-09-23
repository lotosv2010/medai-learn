# Node.js 测试与部署：测试分层/supertest/Docker 多阶段构建/PM2 与 Cluster 多进程（生产收藏级）

> **副标题**：单元测试与集成测试分层、supertest 进程内请求模拟、多阶段构建镜像、cluster 多进程与 PM2 进程守护

> 面试官连问三连：「你们测试怎么分层的？」「Docker 镜像为什么 1.2G 这么大？」「Node 是单线程的，怎么压满 8 核？」——多数人卡在第三个。测试、打包、多进程，这三件事决定了你的代码能不能稳定地「上线并扛住流量」，也决定了你在面试官眼里的工程化段位。

---

## 🎯 这篇文章解决什么问题

写完业务代码只是第一步。从「代码写完」到「稳定跑在生产环境」，中间横着三座山：**怎么证明它没写错（测试）、怎么把它装进一个可复现的运行时（Docker）、怎么让一个单线程的 Node 进程吃满多核 CPU（cluster/PM2）**。

这篇文章是「Node.js 全栈深度拆解」系列的第 17 篇，也是工程化板块的第一篇。它把「测试 → 打包部署 → 多核利用」这条交付链讲透，三件事各有侧重：

- **测试**：单元 / 集成 / 端到端怎么分层，为什么「大量单元、少量集成、极少端到端」是性价比的铁律；`supertest` 怎么在进程内模拟 HTTP 请求而不起真实端口
- **部署**：Dockerfile 怎么写，多阶段构建为什么能把镜像从 1G 砍到 200M
- **多核**：Node 单线程单核的瓶颈在哪，`cluster` 怎么用多进程共享端口扩展吞吐，PM2 又在这一层之上补了什么

**既讲怎么用，也讲面试怎么答。** 下一篇（第 18 篇）会接着讲「任务解耦、安全、可观测性」——本篇先解决「交付」，下一篇解决「守住」。

---

## 一、基本使用

### 1. 单元测试基本写法：Jest / Vitest

先写第一个单元测试。所谓单元测试，就是**针对一个单一函数 / 模块，验证它在给定输入下产出期望输出**。它不碰数据库、不碰网络，跑得快、结果稳定。

以医疗场景里一个「剂量换算」纯函数为例——把克（g）换成毫克（mg）：

```javascript
// dose.js —— 被测试的纯函数
function toMilligrams(dose) {
  if (dose == null) throw new Error('剂量不能为空')
  if (dose < 0) throw new Error('剂量不能为负数')
  return dose * 1000 // 1g = 1000mg
}

module.exports = { toMilligrams }
```

用 Jest 写它的单元测试。Jest 是 Node 生态最主流的测试框架，`describe` 分组、`test`（或 `it`）声明用例、`expect` 断言：

```javascript
// dose.test.js —— 单元测试
const { toMilligrams } = require('./dose')

describe('toMilligrams 剂量换算', () => {
  test('0.5g 换算成 500mg', () => {
    expect(toMilligrams(0.5)).toBe(500)
  })

  test('边界：0 剂量返回 0', () => {
    expect(toMilligrams(0)).toBe(0)
  })

  test('非法输入抛错', () => {
    expect(() => toMilligrams(-1)).toThrow('剂量不能为负数')
    expect(() => toMilligrams(null)).toThrow('剂量不能为空')
  })
})
```

三个用例覆盖了「正常路径 + 边界 + 异常」，这正是单元测试最该做的——**大量覆盖边界与异常**，而不是只测一条 happy path。`expect(...).toBe(...)` 是精确相等断言，`.toThrow(...)` 验证抛错。

Vitest 的写法几乎一模一样（API 对齐 Jest），只是速度更快、原生支持 ESM，新项目二选一即可：

```javascript
// dose.test.js —— Vitest 版本（API 几乎一致）
import { describe, test, expect } from 'vitest'
import { toMilligrams } from './dose'

describe('toMilligrams 剂量换算', () => {
  test('0.5g 换算成 500mg', () => {
    expect(toMilligrams(0.5)).toBe(500)
  })
})
```

> 💬 **面试官**：单元测试测什么？怎么写才算「有效」的单元测试？
>
> ✅ 标准答案：单元测试针对单一函数/模块，验证给定输入产生期望输出，不碰数据库、网络等外部依赖。有效单元测试的核心是**覆盖边界和异常**（空值、负数、超界、抛错），而不是只测一条正常路径。
>
> 🎁 加分答案：能点出「纯函数最易测」——副作用越少、依赖越少，测试越稳定。所以好的单元测试会倒逼你把业务逻辑抽成纯函数，把「取数」和「算数」分离。再补一句：单元测试的另一个价值是「可当文档读」，断言直接描述了函数契约。

### 2. supertest：HTTP 层集成测试

单元测试只测单个函数，但「多个模块拼起来能不能正常工作」——比如路由 + 中间件 + 控制器 + 数据库这一整条链路——需要**集成测试**。

`supertest` 就是为 HTTP 层集成测试而生的。它最关键的用法是：**把 Express/Koa 的 `app` 实例直接传给它，它就在进程内发请求、拿响应做断言，完全不需要 `app.listen` 监听真实端口**。

假设你有这样一个 Express 应用：

```javascript
// app.js —— 被测的 Express 应用
const express = require('express')
const app = express()

app.get('/patients/:id', (req, res) => {
  // 简化：直接返回患者信息（真实场景会查库）
  res.json({ id: req.params.id, name: '张三', age: 45 })
})

module.exports = app // 👈 导出 app 实例，而不是直接 app.listen
```

用 supertest 测它：

```javascript
// app.test.js —— 集成测试
const request = require('supertest')
const app = require('./app')

describe('GET /patients/:id', () => {
  test('返回 200 和患者信息', async () => {
    const res = await request(app) // 👈 传 app，不 listen
      .get('/patients/P10086')
      .expect('Content-Type', /json/)
      .expect(200)

    expect(res.body).toEqual({ id: 'P10086', name: '张三', age: 45 })
  })

  test('不存在的路径返回 404', async () => {
    await request(app).get('/unknown').expect(404)
  })
})
```

注意几个关键点：

- `module.exports = app` 而不是在文件里 `app.listen(3000)`——**「导出 app、由启动脚本负责监听」** 是可测试性的关键拆分。app 是「路由与中间件的组装逻辑」，listen 是「启动动作」，两者分开，测试才能拿到 app 实例而不触发真实监听。
- `request(app).get(...)` 是链式调用，`.expect()` 既能断言状态码也能断言响应头，返回的 `res` 还能进一步对 `res.body` 做 `expect` 断言。
- 全程**没有真实 TCP 端口**参与——这就是「进程内模拟」的含义，具体原理在第二部分第 2 节展开。

> 💬 **面试官**：集成测试和单元测试的区别是什么？什么时候需要集成测试？
>
> ✅ 标准答案：单元测试测单个函数/模块（不碰外部依赖），集成测试验证多个模块协作（一次完整的 HTTP 请求穿过路由、中间件、控制器、数据库）。当你需要验证「这些零件拼在一起能正常转」时，就需要集成测试——单元测试全绿不代表整个请求链路是通的。
>
> 🎁 加分答案：能点出「测试成本」的差异——集成测试更接近真实、但更慢也更脆（外部依赖多），所以数量应少于单元测试。再补一句：`supertest` 做集成测试之所以快，是因为它进程内模拟请求、不起真实端口，这条链路上「路由 + 中间件 + 控制器」全都被真实执行了，只有 TCP 网络层被绕开。

### 3. Mock 数据库依赖

集成测试真正麻烦的地方，是「数据库」这个外部依赖。你不想测试时真的连上一个 MySQL——那样测试又慢又脆（依赖环境、数据状态），而且测试之间会互相污染数据。

解法就是 **Mock**：用「内存实现」或 mock 库，把真实数据库连接替换掉。两种主流方式：

**方式一：依赖注入**——把「数据访问对象」通过参数注入，测试时传一个内存版：

```javascript
// patientService.js —— 通过构造函数注入数据源
class PatientService {
  constructor(db) {
    this.db = db // 👈 数据源由外部注入，不直接连库
  }
  async getPatient(id) {
    return this.db.findPatient(id)
  }
}

// 生产：注入真实 DB
const realDb = createMysqlClient()
const service = new PatientService(realDb)

// 测试：注入内存实现
const memoryDb = {
  async findPatient(id) {
    return { id, name: '张三', age: 45 } // 内存 Map 模拟
  }
}
const testService = new PatientService(memoryDb)
```

**方式二：jest.mock**——在测试里把整个模块「替换」掉，让它的方法返回固定值：

```javascript
// patientService.test.js —— 用 jest.mock 替换数据库模块
jest.mock('./db', () => ({
  findPatient: jest.fn().mockResolvedValue({ id: 'P10086', name: '张三', age: 45 }),
}))

const { findPatient } = require('./db')
const PatientService = require('./patientService')

test('getPatient 调用 db.findPatient 并透传结果', async () => {
  const service = new PatientService()
  const result = await service.getPatient('P10086')
  expect(result.name).toBe('张三')
  expect(findPatient).toHaveBeenCalledWith('P10086') // 👈 验证被正确调用
})
```

两种方式的核心思想一致：**测试时把「慢的、有状态的、不可控的」外部依赖，换成「快的、无状态的、可控的」假实现**，让测试聚焦在「被测模块自己的逻辑」上。

> 💬 **面试官**：单元/集成测试里为什么要 mock 数据库？有哪些做法？
>
> ✅ 标准答案：因为真实数据库又慢又有状态（数据会变、测试会互相污染），直接连库会让测试又慢又脆。Mock 用内存实现或 mock 库把数据库替换成可控假实现，让测试聚焦在业务逻辑本身。两种主流做法：依赖注入（传入内存版数据源）和 jest.mock（替换模块）。
>
> 🎁 加分答案：能点出「依赖注入比 jest.mock 更利于重构」——它把依赖显式化，测试替身不用依赖模块路径字符串，改文件也不会坏。再补一句：mock 要 mock 在「边界」上（数据访问、外部 API），不要 mock 被测模块自己，否则测了个寂寞。

### 4. Dockerfile 基本结构

测试通过，下一步是「打包部署」。Docker 把应用和它的运行环境装进一个**镜像（image）**，跑起来就是**容器（container）**——任何机器上 `docker run` 出来的环境都完全一致，解决「我本地能跑、服务器跑不了」的老问题。

一个最朴素的 Node.js 单阶段 Dockerfile，长这样：

```dockerfile
# 单阶段 Dockerfile —— 最朴素写法
FROM node:20-alpine            # 👈 基础镜像：Node 20 + Alpine（极小的 Linux）

WORKDIR /app                   # 👈 容器内的工作目录

COPY package*.json ./          # 先拷依赖清单，利用 Docker 层缓存
RUN npm ci                     # 安装依赖

COPY . .                       # 再拷全部源码

EXPOSE 3000                    # 声明容器监听端口

CMD ["node", "app.js"]         # 容器启动时执行
```

每个指令一行，按顺序解释：

- `FROM node:20-alpine`——基于哪个镜像。`alpine` 是一个只有几 MB 的超轻量 Linux 发行版，用它做底能显著减小最终镜像体积（对比 `node:20` 那个基于 Debian 的几百 MB 镜像）。
- `WORKDIR /app`——后续命令都在容器内 `/app` 目录执行。
- `COPY package*.json ./` 先于 `COPY . .`——这是 Docker **层缓存**的关键技巧：`package*.json` 不变，`npm ci` 这层就不会重跑，只重跑「拷贝源码」之后的部分，构建快很多。
- `RUN npm ci`——`ci` 严格按 lockfile 安装（干净、可复现），适合构建；`install` 会改 lockfile，适合开发。
- `CMD` 是容器启动时的默认命令（可被 `docker run` 覆盖），区别于 `RUN`（构建时执行）。

构建 + 运行：

```plain
$ docker build -t his-api:v1 .
$ docker run -p 3000:3000 his-api:v1
```

`-t` 打标签，`-p 3000:3000` 把容器 3000 端口映射到宿主机 3000。这就是最基础的部署闭环。

> 💬 **面试官**：Dockerfile 里 `COPY package*.json` 为什么放在 `COPY . .` 之前？`npm ci` 和 `npm install` 有什么区别？
>
> ✅ 标准答案：先拷依赖清单、再装依赖、最后拷源码，是为了**利用 Docker 层缓存**——只要依赖清单不变，`npm ci` 这一层就能命中缓存，不必每次构建都重装依赖。`npm ci` 严格按 lockfile 干净安装（可复现），`npm install` 可能改写 lockfile——构建用 `ci`，开发用 `install`。
>
> 🎁 加分答案：能点出「`alpine` 基础镜像」的作用——它比默认的 Debian 系镜像小一个数量级，是减小镜像体积的第一道杠杆（后面多阶段构建会在这个基础上进一步瘦身）。再补一句 `CMD` vs `RUN` 的区别：`RUN` 构建时执行、`CMD` 容器启动时执行。

### 5. PM2 基本用法：一键多实例 + 进程守护

应用写好了、也能跑在容器里了，但「直接 `node app.js`」在生产上很脆弱——进程崩了没人管、日志看不到、CPU 多核用不上。

PM2 是 Node 生态最主流的**进程管理器**，它帮你解决三件事：**进程守护（崩溃自动重启）、多实例（吃满多核）、日志管理**。先看最常用的几个命令：

```plain
# 按 CPU 核数启动多个实例（cluster 模式）
$ pm2 start app.js -i max

# 查看所有进程状态
$ pm2 list

# 实时看所有实例的聚合日志
$ pm2 logs

# 实时监控面板（CPU / 内存 / 请求）
$ pm2 monit

# 重启 / 停止 / 删除
$ pm2 restart app
$ pm2 stop app
$ pm2 delete app

# 保存进程列表 + 开机自启
$ pm2 save
$ pm2 startup
```

关键命令解释：

- `pm2 start app.js -i max`——`-i` 指定实例数，`max` 表示「按 CPU 核数」启动（8 核就起 8 个实例），这是 PM2 的多进程 cluster 模式（本质是第二部分第 4 节要讲的 `cluster` 封装）。
- `pm2 logs`——把多个实例的日志**聚合**到一起实时输出，不用你去每个进程的 stdout 里翻。
- `pm2 monit`——一个终端里的实时监控面板，直观看到各实例的 CPU、内存占用。
- `pm2 startup` + `pm2 save`——让 PM2 守护的进程开机自动拉起，配合它的崩溃重启，实现「进程永远在线」。

> 💬 **面试官**：PM2 在生产里解决了什么问题？`-i max` 是什么意思？
>
> ✅ 标准答案：PM2 是进程管理器，解决三件事——进程守护（崩溃自动重启）、多实例（`-i max` 按 CPU 核数起实例，吃满多核）、日志管理（`pm2 logs` 聚合多实例日志）。`-i max` 的 `max` 就是「按机器 CPU 核数启动对应数量的实例」。
>
> 🎁 加分答案：能点出 PM2 的 `-i`（cluster 模式）本质是 Node `cluster` 模块的封装——PM2 在你代码之上补了进程守护、日志聚合、零停机重启这些运维能力，而你不用自己写 cluster 代码。再补一句：PM2 的崩溃自动重启「只是兜底，不是根治」，后面第三部分第 4 节会讲为什么。

### 6. Node 内置 cluster：手动起多进程

PM2 帮你把多进程封装好了，但面试一定会问你「`cluster` 模块本身怎么用」——因为它才是多进程的地基。

Node 是**单线程单进程**的，一个 `node app.js` 只能跑在一个 CPU 核上，8 核机器跑单进程等于浪费了 7 个核。`cluster` 模块让你**手动 `fork` 多个工作进程**，共享同一个端口：

```javascript
// cluster.js —— 用 cluster 手动起多进程
const cluster = require('cluster')
const os = require('os')
const app = require('./app') // 前面的 Express app

if (cluster.isPrimary) {
  // 👈 主进程：负责 fork 工作进程，不处理业务
  const numCPUs = os.cpus().length
  console.log(`主进程 ${process.pid} 启动，fork ${numCPUs} 个工作进程`)

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork() // 👈 每个 fork 都重新执行本文件，但走 else 分支
  }

  // 工作进程退出时，补一个新的（崩溃自愈）
  cluster.on('exit', (worker) => {
    console.log(`工作进程 ${worker.process.pid} 退出，重启一个`)
    cluster.fork()
  })
} else {
  // 👈 工作进程：各自 listen 同一个端口
  app.listen(3000, () => {
    console.log(`工作进程 ${process.pid} 监听 3000`)
  })
}
```

这段代码的两个关键点：

- `cluster.isPrimary` 判断当前进程是主进程还是工作进程。主进程 `fork()` 出 N 个工作进程，**每个 fork 都会重新执行整个文件**，只是工作进程走 `else` 分支去 `listen`。
- **多个工作进程监听同一个 3000 端口**——这是 `cluster` 最反直觉也最核心的能力。它不是每个进程占一个端口，而是主进程拿到 socket 后**分发给**工作进程，对外看起来是一个端口、一个服务。

跑起来看效果：

```plain
$ node cluster.js
主进程 12345 启动，fork 8 个工作进程
工作进程 12346 监听 3000
工作进程 12347 监听 3000
...
```

8 个进程监听同一个 3000，请求进来被分发给不同的 `process.pid` 处理——吞吐随核数扩展。

> 💬 **面试官**：Node 是单线程的，为什么多个工作进程能监听同一个端口？
>
> ✅ 标准答案：`cluster` 的主进程负责 `fork` 出多个工作进程，**主进程先监听端口拿到 socket，再通过 IPC 把连接句柄分发给工作进程**，工作进程各自处理请求。所以对外只有一个端口、一个服务，对内是多个进程并行处理，把单核利用率提到了多核。
>
> 🎁 加分答案：能区分「主进程轮询分发」和「内核负载均衡」两种策略——老版本 Node 靠操作系统把请求均衡到各进程，新版本（round-robin 默认）由主进程轮询分发，避免「忙的忙死、闲的闲死」。再补一句：工作进程之间**不共享内存**，各自有独立的 V8 和事件循环，这既是隔离（一个崩不影响其他），也是后面「状态共享坑」的根源。

---

## 二、企业最佳实践

### 1. 测试金字塔分层

基本用法讲了「怎么写测试」，但企业级的问题是「**写多少、写哪种**」。这就是测试金字塔要回答的——它不是具体技术，而是一套**测试投入分配策略**。

测试金字塔把测试按「粒度 + 成本」分成三层：

- **单元测试（底层，最多）**：测单一函数/模块，快、不依赖外部、稳定。它应该在金字塔最底部、数量最多——因为便宜，能大量覆盖各种边界和异常分支。
- **集成测试（中层，适中）**：验证多模块协作，通常是一次完整的 HTTP 请求穿过路由、中间件、控制器、数据库。比单元慢、比单元脆，但能验证「拼装正确性」。
- **端到端测试（顶层，最少）**：模拟真实用户操作（开浏览器、点页面、走完整用户路径）。最慢、最贵、最脆——一次改动、一个环境抖动都可能让它挂，且挂了很难定位是哪个环节的问题。

![测试金字塔：底部大量单元测试、中层少量集成测试、顶部极少端到端测试](https://martinfowler.com/bliki/images/testPyramid/test-pyramid.png)

**比例分配「大量单元、少量集成、极少端到端」，是测试体系性价比的关键。** 为什么是这个形状？因为越往上，测试的**成本（时间、维护、脆弱性）**和**价值**的比值越差——端到端测试能发现的问题，往往单元测试就能以十分之一的成本发现。

一张表看清三层的成本与价值：

| 层级 | 测什么 | 速度 | 稳定性 | 定位难度 | 数量 |
|------|--------|------|--------|---------|------|
| 单元测试 | 单一函数/模块 | 毫秒级 | 高（无外部依赖） | 精确到行 | 大量 |
| 集成测试 | 多模块协作（一次 HTTP） | 百毫秒级 | 中（mock 外部） | 精确到模块 | 少量 |
| 端到端测试 | 真实用户路径 | 秒级 | 低（真实环境） | 难（全链路） | 极少 |

> 💬 **面试官**：测试金字塔的分层策略是什么？为什么端到端测试的数量应该最少？
>
> ✅ 标准答案：测试金字塔按粒度和成本分三层——底层是大量单元测试（快、稳定、便宜），中层是少量集成测试（验证多模块协作），顶层是极少端到端测试（验证真实用户路径）。端到端测试最少，是因为它最慢、最贵、最脆（依赖真实环境、一次抖动就挂），且失败时最难定位，性价比最低。
>
> 🎁 加分答案：能点出「金字塔的核心是**投入产出比**」——测试体系的目标不是覆盖率 100%，而是用最低成本抓到最多 bug，而 bug 大多能在单元层就被更便宜地抓住。再补一句：**「冰淇淋反模式」（端到端最多、单元最少）是反面教材**，它会让 CI 慢到没人愿意跑、测试脆到没人敢改。

### 2. supertest 进程内模拟：为什么不起真实端口

第一部分已经用了 supertest，这里讲透它「进程内模拟」的原理——这是理解「为什么集成测试能这么快、这么稳」的关键。

先说「真实监听端口」的测试会有什么问题：

- **端口冲突**：多个测试并行跑，都去 listen 同一个端口，直接报 `EADDRINUSE`。
- **受环境变量影响**：测试可能依赖 `PORT`、`NODE_ENV`、数据库地址等环境变量，换个环境结果就变。
- **慢**：真实请求要走完整的 TCP 握手 + 网络栈，一层层开销。

`supertest` 的核心做法是：**不监听端口，直接把 `app` 实例当 HTTP 请求处理器用**。Node 的 `http` 模块有两个能力——`http.createServer(app)` 监听端口对外服务，以及 `app` 本身作为 `(req, res) => ...` 的请求处理器。supertest 用的是后者：

```javascript
// supertest 的简化原理：复用 Node http 模块，但绕开 TCP 网络层
const http = require('http')

// 真实监听：走 TCP 网络层
const server = http.createServer(app)
server.listen(3000) // 👈 这一步是 supertest 不会做的

// supertest 的做法：把 app 当 handler，直接在进程内构造请求
const req = new http.IncomingMessage()   // 进程内构造请求对象
const res = new http.ServerResponse(req) // 进程内构造响应对象
app(req, res)                            // 直接调用 app，绕开 TCP
```

结果就是：**路由、中间件、控制器这些业务逻辑被完整真实地执行了，但 TCP 网络层被绕开**。所以 supertest 的集成测试——快（省掉网络开销）、稳（不受端口/环境变量影响）、可并行（没有端口冲突）。

这里再强调一个工程上的关键配合：**「导出 app、启动脚本单独 listen」**。如果你的 `app.js` 里直接 `app.listen(3000)`，那 `require('./app')` 就会真的起服务，测试就没法进程内模拟了。所以生产项目里几乎都约定：

```javascript
// app.js —— 只组装 app，导出
module.exports = app

// server.js —— 单独的启动脚本，负责监听
const app = require('./app')
app.listen(3000)
```

> 💬 **面试官**：supertest 做集成测试为什么不需要真实启动监听端口？它和真实请求差在哪？
>
> ✅ 标准答案：supertest 把 `app` 实例直接当作 Node `http` 模块的请求处理器，在进程内构造请求/响应对象并调用 `app(req, res)`，**复用了 http 模块但绕开了 TCP 网络层**。所以业务逻辑（路由/中间件/控制器）真实执行了，但省掉了网络开销——更快、不受端口占用影响、可并行。它和真实请求的唯一差别就是少了 TCP 这一层。
>
> 🎁 加分答案：能点出「导出 app、启动脚本单独 listen」这个工程约定是进程内测试的前提——`app.listen` 一旦写进 app 文件，`require` 就会触发真实监听。再补一句：正因为它绕开了网络层，有些网络层的 bug（如负载均衡、真实 socket 异常）它测不到，所以极少数场景仍需「起真实端口」的测试来兜底。

### 3. Docker 多阶段构建：镜像从 1G 到 200M

第一部分给的是「单阶段」Dockerfile，它有个致命问题：**把构建工具链和运行时混在一个镜像里**。

想象一个 TypeScript 项目——你需要 `typescript`、各种编译工具、`devDependencies` 来「编译」，但编译产物（`dist/`）跑起来只需要 `node` + 生产依赖。单阶段把这一切都塞进最终镜像：编译器、源码、测试工具、devDependencies 全都在，镜像轻松上 1G，还带着一堆攻击面（编译器、构建工具本身就有漏洞风险）。

**多阶段构建**把「构建」和「运行」拆成两个阶段，最终镜像只保留运行需要的部分：

```dockerfile
# 多阶段 Dockerfile —— 构建阶段 + 运行阶段

# ---------- 阶段 1：builder（构建）----------
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci                     # 装全部依赖（含 devDependencies，编译需要）

COPY . .
RUN npm run build              # 编译 TS → dist/（构建工具链在这里用完即弃）

# ---------- 阶段 2：production（运行）----------
FROM node:20-alpine AS production   # 👈 全新的干净基础镜像
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev          # 👈 只装生产依赖，devDependencies 全部不要

COPY --from=builder /app/dist ./dist   # 👈 只拷构建产物，不拷源码/编译器

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

对比单阶段，多阶段做了三件关键的事：

- **`npm ci --omit=dev`**——运行阶段只装 `dependencies`，`devDependencies`（编译工具、测试框架）一个都不进最终镜像。
- **`COPY --from=builder /app/dist`**——只从 builder 阶段拷**构建产物**，源码、TS 编译器、构建工具统统留在 builder 阶段被丢弃。
- **不携带构建工具链**——最终镜像里没有 `typescript`、没有测试框架，攻击面大幅缩小。

效果对比，直观感受「减体积 + 缩攻击面」：

```text
单阶段镜像：  [node 基础 ~170M] + [devDependencies ~300M] + [源码+编译器 ~200M] + [生产依赖 ~80M]  ≈ 750M+
多阶段镜像：  [node 基础 ~170M] + [生产依赖 ~80M] + [dist 构建产物 ~5M]                            ≈ 255M
```

镜像小了一个数量级——**拉取快、部署快、攻击面小**，这是生产必须做的优化。

> 💬 **面试官**：Docker 多阶段构建解决了什么问题？为什么能显著减小最终镜像体积？
>
> ✅ 标准答案：多阶段构建把「构建」和「运行」拆成两个阶段——builder 阶段装全依赖、做编译，production 阶段换一个干净的基础镜像，只 `COPY` 构建产物 + `npm ci --omit=dev` 的生产依赖。它能把镜像砍小，是因为**构建工具链（编译器、devDependencies、源码）被隔离在 builder 阶段，不进最终镜像**。
>
> 🎁 加分答案：能点出「减体积」之外的第二个收益——**缩小攻击面**。编译工具、构建工具本身也有漏洞，把它们排除出运行时镜像，等于减少了可被利用的组件。再补一句：`--omit=dev` 和 `.dockerignore` 是配套手段，前者管依赖、后者管文件（排除 `node_modules`、`.git`、测试文件等不该进镜像的东西）。

### 4. 单进程瓶颈与多进程扩展：cluster 吃满多核

这是本篇「多核」主题的核心。先回到那个最根本的事实：**Node 是单线程单核的**。

Node 的事件循环跑在**一个线程**上，一个 `node app.js` 进程只能吃满**一个 CPU 核**。你的机器是 8 核，跑单进程 Node，意味着 7 个核在闲置——请求一多，单核的吞吐上限就是整个服务的上限。这就是「单进程瓶颈」。

`cluster` 的解法是**多进程扩展**：`fork` 出 N 个工作进程（N = CPU 核数），每个进程独占一个核、独立跑自己的事件循环，主进程把进来的请求分发给它们：

```text
                 ┌─────────────────────────────┐
                 │        主进程 (Primary)        │
                 │   监听 3000 端口，接收连接       │
                 │   （round-robin 轮询分发）       │
                 └──────────────┬──────────────┘
            ┌──────────┬────────┼────────┬──────────┐
            ▼          ▼        ▼        ▼          ▼
       ┌────────┐ ┌────────┐ ... ┌────────┐
       │ Worker │ │ Worker │     │ Worker │   ← 每个 Worker 独占一个 CPU 核
       │ pid A  │ │ pid B  │     │ pid N  │
       └────────┘ └────────┘     └────────┘
```

关键机制讲透——**多个 worker 为什么能共享同一个端口**：

- 主进程调用 `listen` 拿到 socket，**不自己处理请求**，而是把「连接」通过 IPC 分发给工作进程。
- 默认是 **round-robin（轮询）** 分发：主进程按顺序把连接轮流交给各个 worker，保证负载均衡，不会「一个 worker 忙死、其他闲死」。
- 每个 worker 收到连接后，在自己的事件循环里独立处理，**彼此内存完全隔离**（一个 worker 崩了，其他 worker 不受影响，主进程还能把它重新 `fork` 起来）。

于是吞吐随核数扩展：8 核起 8 个 worker，理论上吞吐接近 8 倍（受限于下游数据库、IO 等真实瓶颈，实际不会线性，但趋势成立）。

**PM2 的 `-i max` 本质就是这套东西的封装**——`cluster` 模块（多进程）+ 进程守护（崩溃重启）+ 日志管理（`pm2 logs` 聚合）。你不用自己写 cluster 代码，PM2 帮你把 `fork`、轮询、崩溃重启都做了。

> 💬 **面试官**：Node.js 是单线程的，cluster 模块是怎么利用多核 CPU 的？
>
> ✅ 标准答案：cluster 用多进程扩展——主进程 `fork` 出 N 个工作进程（N 通常等于 CPU 核数），每个进程独占一个核、跑独立的事件循环。主进程监听端口拿到连接后，通过 IPC 轮询分发给各工作进程处理。这样把「单核单进程」的吞吐瓶颈，扩展成了「多核并行处理」。
>
> 🎁 加分答案：能讲出「共享端口」的机制——主进程监听、round-robin 轮询分发 socket 给 worker，对外一个端口、对内多个进程；以及「内存隔离」的代价——worker 间不共享内存，所以跨请求共享状态必须外置（这正是第三部分第 1 节的坑）。再补一句：PM2 的 `-i max` 就是 cluster + 守护 + 日志的封装，你手写的 cluster 代码 PM2 都能替你完成。

### 5. cluster vs worker_threads：各管一层，不能互相替代

聊到「Node 怎么用多核」，几乎一定被追问：`cluster` 和 `worker_threads` 有什么区别？能不能互相替代？（`worker_threads` 在第 05 篇核心 API 篇已经讲过，这里做生产视角的分工总结。）

两者都解决「单线程不够用」，但解决的是**两个不同维度**的问题：

- **`cluster` 解决「吞吐」**：多进程隔离、多核并发，把「很多个独立的请求」分摊到多个核上。它是**水平扩展**——增加处理请求的「副本数」。
- **`worker_threads` 解决「单请求不卡」**：同一个进程内开线程，把「单次请求里夹带的 CPU 密集计算」挪到别的线程去算，**不阻塞事件循环**。它是**垂直卸载**——把一个请求内部的「重活」挪出主线程。

一句话记分工：**`cluster` 扩展吞吐，`worker_threads` 保单个请求不卡，生产两者各管一层。**

为什么不能互相替代？三个根本差异：

| 维度 | cluster | worker_threads |
|------|---------|----------------|
| 模型 | 多**进程**（独立内存、独立 V8） | 多**线程**（同进程内） |
| 隔离性 | 强（一个进程崩不影响其他） | 弱（线程共享进程，一个 OOM 全挂） |
| 通信 | IPC，需序列化，开销大 | `SharedArrayBuffer` 共享内存，零拷贝 |
| 适用场景 | 多个独立请求的水平扩展 | 单个请求内的 CPU 密集计算 |

看两个典型场景的对照，感受「为什么两者都要有」：

- **大量独立 HTTP 请求**（医院 HIS 系统白天接诊高峰，无数患者查询）→ 用 `cluster`，起 8 个进程分摊吞吐。用 `worker_threads` 反而错——它不增加「处理请求的副本数」，救不了吞吐。
- **单次请求夹带重计算**（医生上传一张医学影像，要同步做像素级处理/哈希计算，阻塞事件循环 5 秒，导致所有其他请求卡住）→ 用 `worker_threads`，把计算丢到 worker 线程，主线程事件循环继续响应其他请求。用 `cluster` 救不了——它只加副本，单请求内的 5 秒计算依然会卡住「处理它的那个进程」。

> 💬 **面试官**：cluster 和 worker_threads 在生产架构里分别解决什么问题？能不能互相替代？
>
> ✅ 标准答案：不能互相替代。cluster 解决**水平扩展吞吐**——多进程隔离、多核并发，把大量独立请求分摊到多个核；worker_threads 解决**垂直卸载**——把单次请求内夹带的 CPU 密集计算挪到别的线程，不阻塞事件循环。前者管「请求多」，后者管「单个请求重」。
>
> 🎁 加分答案：能讲出「为什么不能替代」的三个本质差异——隔离模型（进程 vs 线程）、通信开销（IPC 序列化 vs SharedArrayBuffer 零拷贝）、适用场景（独立请求 vs 单请求内重计算）。再补一句落地经验：**生产常见的是「cluster 起多进程 + 每个进程内按需用 worker_threads 算重活」的叠加架构**，两者是互补关系而非二选一。

### 6. 工程落地：给 his-api 补上测试 + Docker + 多进程

前面都是拆开讲，这一节把三件事落到贯穿系列的 `apps/his-api` 项目主线上——一个完整的「测试 → 打包 → 多核」落地。

**① 多阶段构建 Dockerfile**。给 his-api 搭一份多阶段 Dockerfile（对比单阶段，体积从 ~750M 降到 ~255M）：

```dockerfile
# apps/his-api/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**② cluster 改造成多进程，响应体带 `process.pid` 验证分发**。改造入口脚本，让每个请求的响应带上处理它的进程 pid，直观验证「请求确实被分发到了不同 worker」：

```javascript
// apps/his-api/src/server.js —— cluster 多进程入口
const cluster = require('cluster')
const os = require('os')
const app = require('./app')

// 给所有路由统一挂一个中间件：响应头带上处理本请求的进程 pid
app.use((req, res, next) => {
  res.setHeader('X-Served-By-Pid', process.pid) // 👈 验证分发的关键
  next()
})

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length
  for (let i = 0; i < numCPUs; i++) cluster.fork()
  cluster.on('exit', (worker) => cluster.fork())
} else {
  app.listen(3000)
}
```

验证分发：连续发几个请求，看 `X-Served-By-Pid` 是不是在多个不同的 pid 之间轮转：

```plain
$ curl -i http://localhost:3000/patients/P10086 | grep X-Served-By-Pid
X-Served-By-Pid: 12346
$ curl -i http://localhost:3000/patients/P10086 | grep X-Served-By-Pid
X-Served-By-Pid: 12347   # 👈 不同的 pid，证明请求被分发到了不同 worker
```

**③ 给核心路由补 supertest 集成测试**。核心的「患者查询」路由，补一条进程内集成测试：

```javascript
// apps/his-api/test/patients.test.js
const request = require('supertest')
const app = require('../src/app')

describe('患者核心路由', () => {
  test('GET /patients/:id 返回患者信息', async () => {
    const res = await request(app)
      .get('/patients/P10086')
      .expect(200)

    expect(res.body.id).toBe('P10086')
  })
})
```

> 🔧 **真实场景**：医院 HIS 系统白天接诊高峰，患者查询、处方提交的请求量是深夜的几十倍。用 `cluster` 起满核进程分摊吞吐，避免单核打满导致响应变慢；患者查询这类核心路由用 supertest 守住，每次改动都跑一遍集成测试，防止「改了一个字段结果整个查询接口崩了」的回归。多阶段 Dockerfile 让镜像体积降下来，滚动发布时拉取快、回滚也快。

---

## 三、注意事项

### 1. 多进程下的状态共享坑（最容易踩的坑）

这是从单进程到多进程部署**最容易踩的坑**，也是本篇最该记住的一条。

单进程时代，你可能会这么存 Session：

```javascript
// ❌ 单进程能跑、多进程必挂的写法
const sessionStore = new Map() // 进程内存里存 Session

app.post('/login', (req, res) => {
  const sessionId = generateId()
  sessionStore.set(sessionId, { userId: req.body.userId }) // 存进进程内存
  res.cookie('sessionId', sessionId)
})

app.get('/profile', (req, res) => {
  const session = sessionStore.get(req.cookies.sessionId) // 从进程内存读
  // ...
})
```

单进程时，这个 `Map` 是「全服务共享」的——存进去，下次请求读得到。但一旦上 `cluster` 起 8 个 worker，**每个 worker 有自己独立的内存，各自的 `Map` 是各自独立的**：

```text
Worker A 的内存：sessionStore = { "sess1": {...} }   ← 登录请求落在这，Session 存这
Worker B 的内存：sessionStore = {}                     ← 下次请求落这，读不到 Session！
```

问题就出在「**不能假设这次和上次请求落在同一个进程**」。round-robin 轮询下，登录请求可能被 Worker A 处理、把 Session 存进 A 的内存；下一次带 cookie 的请求被分发到 Worker B，B 的内存里根本没有这个 Session——用户「莫名其妙被登出」。

**解法：跨请求共享的状态，必须放 Redis 等外部存储**。内存态 Session、内存缓存，统统外置：

```javascript
// ✅ 正确：Session 放 Redis，所有 worker 共享同一份外部状态
const redis = createRedisClient()

app.post('/login', async (req, res) => {
  const sessionId = generateId()
  await redis.set(sessionId, JSON.stringify({ userId: req.body.userId }), 'EX', 3600)
  res.cookie('sessionId', sessionId)
})

app.get('/profile', async (req, res) => {
  const session = JSON.parse(await redis.get(req.cookies.sessionId))
  // ...
})
```

这和第 11 篇 Serverless 的「无状态原则」是**同一件事的姊妹题**——Serverless 把「实例随时销毁」推到了极致，多进程部署是「进程内存各自独立」。本质都是：**进程内状态不可靠，跨请求共享状态必须外置**。

> 💬 **面试官**：多进程部署下，为什么不能用进程内存存储 Session？
>
> ✅ 标准答案：因为 cluster 模式下每个工作进程有独立的内存，进程内的 Session Map 各进程各自独立。round-robin 轮询会让「登录」和「后续请求」可能落到不同进程——存在 A 进程的 Session，B 进程读不到，用户被误登出。跨请求共享状态必须放 Redis 等外部存储，所有进程共享同一份。
>
> 🎁 加分答案：能点出「粘性会话（sticky session）」这个折中方案——让同一用户的请求固定路由到同一个进程，进程内存就能用了；但粘性会话破坏负载均衡、进程重启就丢会话，生产更倾向 Redis 共享。再补一句：这条原则和第 11 篇 Serverless 无状态是姊妹题，本质都是「进程内状态不可靠」。

### 2. 测试环境的端口 / 外部依赖

集成测试最大的敌人，是「不可重复」。一条测试今天过、明天挂，往往是踩了这两个坑：

- **真实监听端口**：多个测试文件并行跑，都 `listen` 同一个端口，`EADDRINUSE` 冲突；或者测试依赖机器上某个端口恰好空闲。
- **真实外部依赖**：测试真的去连数据库、真的去调外部 API，数据状态、网络抖动、服务可用性都会让结果不稳定。

所以两条铁律：

- **用 supertest 进程内模拟**，不真实监听端口（前面第二部分第 2 节已讲透）。
- **mock 掉外部依赖**，数据库、外部 API、消息队列统统替换成内存实现或 mock。

核心目标就一个：**让测试可重复**——同样的代码，跑一百次结果一样，和「跑在哪台机器、几点跑、数据库里有什么数据」都无关。可重复的测试才能进 CI 门禁，才会被团队真正信任。

> 💬 **面试官**：怎么保证集成测试「可重复」？哪些因素会破坏它？
>
> ✅ 标准答案：破坏可重复性的是「真实端口」和「真实外部依赖」——端口冲突、数据状态漂移、网络抖动都会让结果不稳定。保证可重复的手段是 supertest 进程内模拟（不起真实端口）+ mock 外部依赖（内存实现/mock 库替换数据库、外部 API），让测试结果只依赖被测代码本身。
>
> 🎁 加分答案：能点出「测试隔离」——每个测试用独立的 mock 数据、不共享可变状态，`beforeEach` 里重置，避免测试之间互相污染。再补一句：环境变量也是破坏可重复性的元凶，测试应显式注入配置而非依赖外部 `process.env`。

### 3. 镜像体积治理

「把所有依赖打进镜像」是新手最常见的错。后果是连环的：

- **体积膨胀**：devDependencies + 编译器 + 源码全进去，镜像轻松上 G。
- **拉取慢**：每次部署、每次新节点扩容都要拉这个 G 级镜像，慢且浪费带宽。
- **攻击面大**：依赖越多，可被利用的漏洞面越大。

治理手段（第二部分第 3 节已展开，这里收敛成清单）：

- **多阶段构建**——构建工具链隔离在 builder 阶段，不进最终镜像。
- **只装生产依赖**——`npm ci --omit=dev`，devDependencies 一个不留。
- **排除不该进镜像的文件**——`.dockerignore` 排除 `node_modules`、`.git`、测试文件、日志等。
- **选更小的基础镜像**——`node:20-alpine` 比 `node:20` 小一个数量级。

四招下来，镜像从 G 级降到几百 M 甚至更小，是「低成本高收益」的优化。

> 💬 **面试官**：镜像体积过大有什么危害？怎么治理？
>
> ✅ 标准答案：危害是体积膨胀（拉取慢、部署慢）和攻击面大（依赖多、漏洞面广）。治理手段：多阶段构建（隔离构建工具链）、只装生产依赖（`npm ci --omit=dev`）、`.dockerignore` 排除无关文件、选更小的 alpine 基础镜像。
>
> 🎁 加分答案：能点出「`npm ci --omit=dev` 的前提是依赖清单里 dev/prod 划分正确」——如果生产运行所需的包被错放进 devDependencies，`--omit=dev` 会导致生产缺依赖、启动即崩。再补一句：可以用 `docker history` 看每一层的大小，定位「体积都花在哪一层」。

### 4. PM2 / 集群下的日志与崩溃

多进程部署带来两个运维层面的新问题，都容易在「它崩了但它会自动重启」的假象下被忽视。

**问题一：日志要聚合**。单进程时 `console.log` 直接看 stdout 就行；起 8 个进程，日志散在 8 个 stdout 里，不聚合根本没法排查。PM2 的 `pm2 logs` 帮你在终端聚合了，但更规范的作法是**把日志统一收集到外部**（如 ELK、云日志服务），按 trace id 关联一次请求在多进程里的日志。

**问题二：崩溃重启只是兜底，不能掩盖根因**。PM2 的崩溃自动重启，会让「服务崩了 → 自动重启 → 又崩 → 又重启」变成一个**死循环**——表面看服务「一直在」，实际一直没好，用户持续拿到 5xx。这是最隐蔽的故障形态：

```text
崩溃 → PM2 自动重启 → 崩溃 → PM2 自动重启 → ...  （死循环，用户持续 5xx，无感知）
```

正确姿势是**配合健康检查与日志收集**：

- **健康检查**：探针定期 `GET /health`，连续失败就告警（而不是「等它自动重启」）。
- **日志收集**：崩溃前的错误日志、堆栈要能被采集到，定位根因。
- **限制重启次数**：连续崩溃超过阈值（如 10 次/分钟）就停止重启、转为告警，避免死循环空转。

核心原则一句话：**「崩了就重启」是保命，「崩了就告警 + 定位根因」是治病**——生产要的是后者。

> 💬 **面试官**：PM2 的崩溃自动重启是不是就万事大吉了？还缺什么？
>
> ✅ 标准答案：不是。自动重启只是兜底，会掩盖根因——如果代码有必现 bug，服务会「崩了重启、重启又崩」死循环，用户持续拿 5xx 却无人感知。还需要健康检查（连续失败告警）和日志收集（采集崩溃堆栈定位根因），并限制重启次数避免死循环空转。
>
> 🎁 加分答案：能点出「多实例日志聚合」这个独立问题——8 个进程的日志散在 8 处，必须统一收集、按 trace id 关联，否则排查一次请求的调用链要翻 8 个进程的日志。再补一句：**零停机重启（graceful restart）** 是 PM2 的进阶能力，重启时先起新进程再停旧进程，避免重启瞬间丢请求。

---

## 参考资料

- https://jestjs.io/ （Jest 官方文档）
- https://vitest.dev/ （Vitest 官方文档）
- https://www.npmjs.com/package/supertest （supertest 文档）
- https://docs.docker.com/ （Docker 官方文档）
- https://docs.docker.com/build/building/multi-stage/ （多阶段构建官方指南）
- https://pm2.keymetrics.io/ （PM2 官方文档）
- https://nodejs.org/api/cluster.html （cluster 模块官方文档）
- https://nodejs.org/api/worker_threads.html （worker_threads 模块官方文档）

> 说明：测试金字塔分层策略是业界公认的经典模型，正文配图出自经典博客文章《Practical Test Pyramid》；可搜索关键词「Test Pyramid 测试金字塔」查阅原文。

---

## 💡 面试核心问

- **测试金字塔的分层策略是什么？为什么端到端测试的数量应该最少？**（单元/集成/端到端三层，越往上越慢越贵越脆、性价比越低，所以端到端最少）
- **Docker 多阶段构建解决了什么问题？为什么能显著减小最终镜像体积？**（把构建工具链隔离在 builder 阶段，最终镜像只装生产依赖 + 构建产物，砍掉 devDependencies/编译器）
- **Node.js 是单线程的，cluster 模块是怎么利用多核 CPU 的？**（主进程 fork 多 worker、监听端口 round-robin 分发连接，每个 worker 独占一核并行处理）
- **cluster 和 worker_threads 在生产架构里分别解决什么问题？能不能互相替代？**（cluster 扩展吞吐、worker_threads 卸载单请求内重计算；不能替代，隔离/通信/场景都不同）
- **多进程部署下，为什么不能用进程内存存储 Session？**（各进程内存独立，轮询让请求落到不同进程，Session 存在 A 进程、B 进程读不到；必须外置 Redis）

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 考察频率 |
|--------|-----------|---------|
| 测试金字塔 | 大量单元、少量集成、极少端到端，本质是投入产出比 | ⭐⭐⭐ 必考 |
| supertest 进程内 | 复用 http 模块但绕开 TCP，导出 app 不 listen | ⭐⭐⭐ 必考 |
| Docker 多阶段 | 构建工具链隔离在 builder，最终镜像只留产物 + 生产依赖 | ⭐⭐⭐ 必考 |
| cluster 共享端口 | 主进程 listen、round-robin 分发 socket 给多 worker | ⭐⭐⭐ 必考 |
| cluster vs worker_threads | cluster 扩展吞吐、worker_threads 保单请求不卡，不能替代 | ⭐⭐⭐ 必考 |
| 多进程状态共享 | 进程内存各独立，Session/缓存必须外置 Redis | ⭐⭐⭐ 必考 |
| PM2 崩溃重启 | 自动重启是兜底，还要健康检查 + 日志聚合 + 限重启次数 | ⭐⭐ 高频 |

> 💡 记住这条主线：**测试证明「没写错」（金字塔分层 + supertest 进程内）→ Docker 保证「可复现」（多阶段减体积）→ cluster/PM2 让「扛得住」（多进程吃满多核）**。从「写完代码」到「稳定上线」，每一步都在把不确定性一点点收窄。

---

## 📝 思考题

`cluster` 多进程下，Session 共享有两种常见解法——**粘性会话（sticky session，同一用户固定路由到同一进程）** 和 **Redis 共享存储（所有进程读同一份外部 Session）**。

粘性会话看起来更简单（不用引入 Redis），为什么生产实践里反而更倾向 Redis？

提示：想想「进程重启」「负载均衡」「水平扩缩容」这三个维度——粘性会话在这些场景下分别会暴露什么问题？Redis 方案又是怎么天然规避这些问题的？

欢迎评论区写出你的答案 👇

---

> 🔖 这是「Node.js 全栈深度拆解」系列第 17 篇。上一篇：《GraphQL + Apollo：Schema 设计/Resolver/DataLoader N+1/Server 实战》；下一篇预告：《Node.js 可观测性与安全：消息队列解耦/安全实践/内存泄漏排查/APM 链路追踪》。
>
> 前置基础扩展阅读：搜索关键词「worker_threads cluster 区别」「Serverless 无状态设计」「Redis 连接池」「Docker 多阶段构建」
