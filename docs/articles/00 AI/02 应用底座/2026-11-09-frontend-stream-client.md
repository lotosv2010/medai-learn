# 前端接流式：接得上，更要接得住（面试收藏级）

> 服务端已经一个字一个字往外吐了，浏览器却把字攒到最后才显示——或者更糟，长回答直接卡成幻灯片。这一篇讲前端消费一条 SSE 流的三个坑，外加两个几乎所有人都会漏掉的环节。

---

## 🎯 这篇文章解决什么问题

上一篇文章把流从服务端推出来了：`AsyncIterable` → SSE 帧 → 四个响应头 → 逐帧 `write`。`curl -N` 打开，字是随着时间一段段冒出来的，看起来大功告成。

但真正的用户不在 `curl` 里，在浏览器里。而浏览器这一侧，有三个几乎每个人都会踩的坑：

- 想用 `EventSource` 一劳永逸，结果发现它发不了 POST、带不上 `Authorization` 头——AI 对话的多轮历史根本塞不进 URL
- 中文偶尔变成 `�`，排查半天以为是编码设置错了，其实是网络把一个汉字切成了两半
- 长回答在页面上卡成幻灯片，明明服务端流得很顺畅，卡在客户端自己身上

这三个坑的根子完全不同：第一个是**协议能力**问题，第二个是**字节边界**问题，第三个是**渲染调度**问题。这一篇按这个顺序拆。

每段照旧配「面试官会怎么问」。这一篇是纯浏览器视角，服务端怎么流出来见上一篇，`useChat` 怎么把它封装掉见阶段六。

---

## 🔍 概念：消费一条流 = 解析帧 + 处理字节 + 调度渲染

先说清楚「前端接流式」这件事到底包含什么。很多人以为就是「拿到数据就 `setState`」，其实它由三个独立动作组成：

> **解析 SSE 帧**（把字节流切成一条条消息）→ **处理字节边界**（保证多字节字符不被切坏）→ **调度渲染**（决定多久更新一次 DOM）

三个动作对应三个坑，也对应三层不同的知识：一个是 HTTP 与协议，一个是编码，一个是浏览器渲染循环。

有意思的是，大多数人卡在第三个坑却以为是第一个坑。用户说「接口没流式吧」，你去查响应头、查代理、查 `X-Accel-Buffering`——全都对，然后忽然发现 `fetch` 确实在流式返回，只是你的代码每次收到一小段就重画整个列表。

> 💬 **面试官**：你说接过大模型的流式接口，前端这一侧具体要处理什么？
>
> ✅ **标准答案**：三件事。一是自己解析 SSE 帧，因为 `EventSource` 只支持 GET、不能带自定义头，AI 对话几乎都用 `fetch` + `ReadableStream.getReader()`；二是处理字节边界，`TextDecoder` 必须开 `{ stream: true }`，否则一个汉字被网络切片切开会解码成 `�`；三是渲染调度，不能每收到一个 delta 就更新一次 DOM，要用 `requestAnimationFrame` 把多次更新收敛到一帧。
>
> 🎁 **加分答案**：补一句——这三个坑里只有前两个是「接得上」，第三个才是「接得住」。判断一个前端流式实现好不好，看它在长回答下的表现：能不能在 60fps 下渲染几千个 delta 而主线程不掉帧。很多项目前两件事做对了，第三件没做，上线才发现长回答卡顿。

---

## ⚙️ 深入：五个坑，三层原理

### 坑一：`EventSource` 为什么不够用

`EventSource` 是浏览器原生提供的 SSE 客户端，看起来正合需求：自动解析 `data:`、自动重连、还有 `Last-Event-ID`。但它有一个硬伤——

| 能力 | `EventSource` | `fetch` + `getReader()` |
|---|---|---|
| 请求方法 | 只能 GET | 任意方法（POST 常用） |
| 自定义请求头 | 不支持 | 支持（`Authorization` 必备） |
| 请求体 | 没有 | 支持 JSON body |
| 自动重连 | 内置 | 要自己写 |
| 手动中断 | `close()` | `AbortController` |

AI 对话的场景是这样的：对话历史可能有十几轮、几千字，必须放在 POST 的 JSON body 里；鉴权要用 `Authorization: Bearer`，不能塞进 URL 查询参数（会被日志、被代理记录）。这两条一拍，`EventSource` 就出局了。

什么时候它够用？纯 GET 订阅场景——新闻推送、任务进度通知、行情订阅。这些场景没有请求体、不需要自定义头，`EventSource` 的自动重连反而是加分项。

所以 AI 对话的默认答案永远是：**`fetch` + `ReadableStream.getReader()`，自己解析 SSE 帧**。

> 💬 **面试官**：为什么 AI 对话基本不用 `EventSource`？
>
> ✅ **标准答案**：`EventSource` 只支持 GET 请求，不能带自定义请求头和请求体。AI 对话需要 POST 传多轮对话历史（URL 长度扛不住），需要 `Authorization` 头传鉴权（放 URL 里不安全），所以必须用 `fetch` 手动消费 `ReadableStream`。
>
> 🎁 **加分答案**：补一句取舍——`EventSource` 白送一个「自动重连 + `Last-Event-ID`」，自己写 `fetch` 版本就得手动实现。但重连后「从上次位置继续」需要服务端有消息历史，这件事在阶段三才展开；在这之前，自动重连反而是个半成品能力。

### 坑二：手写一个三十行的 SSE 解析器

既然要用 `fetch`，就得自己解析。好消息是解析器很短，二十来行、两个函数就够。第一个函数负责「读一片、切一批」：

```typescript
// labs/phase2-api/03-stream-client/client.ts（节选）
async function consumeStream(body: ReadableStream<Uint8Array>, onDelta: (t: string) => void) {
  const decoder = new TextDecoder()
  const reader = body.getReader()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    // 👈 关键：stream: true；再把累积内容交给 drain 切帧，返回值是剩下的半帧
    buf = drain(buf + decoder.decode(value, { stream: true }), onDelta)
  }
}
```

第二个函数负责「切」——把 `buf` 里所有完整的帧都切出来，返回切不动的残余：

```typescript
// labs/phase2-api/03-stream-client/client.ts（节选；完整版对 JSON.parse 做了 try/catch）
function drain(buf: string, onDelta: (t: string) => void): string {
  let idx: number
  while ((idx = buf.indexOf('\n\n')) !== -1) {      // 👈 按「两个换行」切帧
    const frame = buf.slice(0, idx)
    buf = buf.slice(idx + 2)
    if (frame.startsWith('data: ')) {
      const payload = frame.slice(6)
      if (payload === '[DONE]') return ''
      const delta = JSON.parse(payload).choices?.[0]?.delta?.content
      if (delta) onDelta(delta)
    }
  }
  return buf                                        // 👈 剩下的半帧留到下一轮
}
```

拆成两个函数不只是为了好看——「读」管的是网络，「切」管的是字符串，两件事的失败模式完全不同，混在一起时排查 `�` 和排查帧错位会互相干扰。

这两段代码里有三个必须理解的点，每一个都能单独出面试题。

**第一，为什么按 `\n\n` 切帧而不是按 `data:` 切。** 一个网络分片可能只含半帧（`buf` 留着拼下一轮），也可能一次带来五帧（`while` 循环切五次）。切帧的依据必须是**帧结束符**（空行），而不是「看到 data 就切」——因为一个事件可以带多个字段（`data:` / `event:` / `id:`），每字段一行，空行才是事件与事件的分界。

**第二，为什么用 `while` 而不是 `if`。** 一次 `read()` 拿到的字节里可能有多个完整帧。用 `if` 会漏掉后面的，下一轮拼上剩下的字节后，帧内容就错位了。

**第三，`{ stream: true }` 到底做了什么。** 这是下一个坑的主题。

> 💬 **面试官**：手写一个 SSE 解析器，要注意什么？
>
> ✅ **标准答案**：三个边界。一是按空行（`\n\n`）切帧，不能按单条 `data:` 切；二是一个网络分片可能含半帧，要留 buffer 拼下一轮；三是一个分片可能含多帧，要用 `while` 循环切到底。另外 `data:` 后面要剥掉 6 个字符（`data: ` 含空格），末尾 `[DONE]` 是结束哨兵。
>
> 🎁 **加分答案**：提醒一句「`JSON.parse` 可能抛」——虽然按帧切对了不会出现半截 JSON，但线上偶发的截断、代理插入的额外内容都会让它抛。生产代码里要 `try/catch` 跳过这一帧，而不是让整个流崩掉。

### 坑三：`TextDecoder({ stream: true })` 防中文乱码

这是最容易被误诊的一个坑。现象是页面上偶尔冒出 `�`，以为是后端编码错了、`Content-Type` 漏了 charset、或者哪一步 `toString()` 把编码搞坏了——全都不是。

原因是 UTF-8 的可变长编码：

- 一个 ASCII 字符占 **1** 字节
- 一个汉字（常用字）占 **3** 字节
- 一个 emoji 可能占 **4** 字节

网络传输是按字节分片的，切的边界完全随机，**它不认识你字符的边界**。一个 3 字节的汉字，完全可能被切成「2 字节 + 1 字节」两片分两次到。

`TextDecoder` 的默认行为是：`decode()` 每调用一次，就把这次拿到的字节当作完整输入解码。遇到末尾不完整的字符，它无法等待，只能输出替换符 `�`（U+FFFD）。

开了 `{ stream: true }` 之后，解码器会把「末尾这段还不完整的多字节序列」留在内部状态里，等下一次 `decode()` 把剩下的字节喂进来再拼。

实测数据很干脆——「阿莫西林」共 12 字节，按每片 2 字节喂进去：

| 用法 | 解出的结果 |
|---|---|
| `TextDecoder()` 不开 stream | 10 个 `�`，一个字都没还原 |
| `TextDecoder({ stream: true })` | 正确拼回「阿莫西林」4 个字 |

![两种 TextDecoder 用法在字节边界上的表现对比：不开 stream 时 12 字节解出 10 个替换符、正确还原 0 个字；开启 stream 选项后正确还原全部 4 个汉字](https://jianda-cmsstatic.oss-cn-shenzhen.aliyuncs.com/assets/charts/202611/1794194695979_gor3lyaa7.png)

**同一个字节序列，只差一个布尔开关，结果从全乱码变成完全正确。** 这是本篇实验 B 的数据。

🔧 **真实场景**：一个用药咨询页面，问答用的是中文药品说明书内容。上线后用户反馈「偶尔有些字显示成问号方块」，复现概率大概几十分之一。查了半天响应头、查了数据库编码、查了 Nginx 配置——最后发现是少写了一个 `{ stream: true }`。加一个参数的修复，成本比排查便宜两个数量级。

> 💬 **面试官**：流式渲染时中文偶尔出现 `�`，什么原因？怎么修？
>
> ✅ **标准答案**：`TextDecoder` 没开 `{ stream: true }`。一个汉字 UTF-8 编码占 3 字节，网络分片可能把它切在中间；不开 `stream` 时解码器把不完整字节替换成 `�`，开了之后会把残片留在内部状态里，等下一片拼上。修法是 `decoder.decode(value, { stream: true })`。
>
> 🎁 **加分答案**：补一句「流结束后要再 `decode()` 一次不带参数的调用」，把内部残留的字节刷出来——虽然正常完整流不会残留，但异常截断时这一步能让你看见问题。另外可以提一句：`�` 这个现象只会出现在多字节字符（中文、emoji）上，纯英文流永远看不见这个坑，所以很多人本地用英文测试时一切正常。

### 坑四：渲染调度才是真正难的那个

前三个坑是「接得上」，这一个才是「接得住」。

最直觉的写法是：

```typescript
onDelta((text) => {
  output.textContent += text   // 👈 每收到一小段就写一次 DOM
})
```

看起来天经地义——收到新内容就显示，有什么问题？

问题在于频率。实测 DeepSeek 的流式输出，中文场景下 delta 到达速率约 **130 ~ 150 个/秒**。如果每个 delta 都写一次 DOM，就意味着每秒触发一百多次样式计算和布局。

浏览器的渲染循环是 60fps，也就是每 16.7ms 一帧。你每秒让 DOM 变了 150 次，但浏览器每秒只能给你画 60 次——**中间那 90 次写入是白做的**：内容还没画出来就被下一次覆盖了。

正确的做法是把多次更新收敛到一帧：

```typescript
// labs/phase2-api/03-stream-client/client.ts（节选，对应 renderBatched）
let buffer = ''
let scheduled = false
let renders = 0

const flush = (): void => {
  if (buffer === '') return
  out.textContent += buffer
  buffer = ''
  renders += 1
  scheduled = false
}

await consumeStream(res.body!, (text) => {
  buffer += text                    // 👈 先只攒着，不碰 DOM
  if (!scheduled) {
    scheduled = true
    requestAnimationFrame(flush)    // 👈 下一帧统一提交一次，每帧最多写一次 DOM
  }
})

flush()                             // 👈 收尾：把最后一帧还没提交的 buffer 刷出去
```

`requestAnimationFrame` 的语义正是「在浏览器下一次重绘之前执行」。一帧之内不管来了多少 delta，函数体只跑一次，把攒下的内容一次性写进 DOM。

实测效果（同一段回答、同一次真实调用）：

| 指标 | 数值 |
|---|---|
| delta 数 | 286 |
| 策略 A 渲染次数（逐 delta 写） | 286 |
| 策略 B 渲染次数（rAF 批量） | 101 |
| A / B 倍数 | 2.8 倍 |

![两种渲染策略在同一个流上的 DOM 写入次数对比：两条柱子的 delta 数完全一样都是 286，但策略 A 的写入次数也是 286，策略 B 只有 101，相差 2.8 倍](https://jianda-cmsstatic.oss-cn-shenzhen.aliyuncs.com/assets/charts/202611/1794194665218_mpktmk19ln.png)

这里有一个很多人会误判的地方：**倍数是有理论上限的，不是无限大**。

理论上限 = 产出速率 ÷ 帧率。delta 速率约 140 个/秒，帧率 60 帧/秒，上限就是 140/60 ≈ 2.3 倍。实测 2.8 倍是因为首帧前的等待、TCP 攒批让部分 delta 挤进同一帧。如果模型输出更快（比如每秒 600 个 delta），这个倍数会上到 10 倍。

![delta 到达速率的时间分布：每 100ms 内有十几个到五十几个 delta 到达，平均约 14 个，而一帧 16.7ms 平均只能装下 2 个，所以绝大多数 delta 必须等待同一帧合并提交](https://jianda-cmsstatic.oss-cn-shenzhen.aliyuncs.com/assets/charts/202611/1794194676176_eytwush0uzs.png)

所以正确的表述是：**渲染策略把「写入次数」从「delta 数」压到「有内容的帧数」**，能压多少取决于产出速率。反过来说，如果你的场景是「一秒只来 10 个 delta」，那不做任何优化也不卡——**优化的门槛是产出速率超过帧率**。

还有两个容易漏的细节：

**收尾要 flush。** 流结束时，最后一帧可能还在 `buffer` 里没提交（因为 `rAF` 还没触发）。必须在读取循环结束后手动调一次 flush（就是上面那段最后的 `flush()`），否则回答最后一个字会丢。

**React 里这套逻辑去哪了。** `buffer + rAF` 是框架无关的通用解。在 React 里，等价的思路是 `useSyncExternalStore` + `startTransition`（React 18+），或者干脆用 `useChat` 这种已经封装好的 Hook。本篇不用 React，是因为原生 DOM + 一行 `rAF` 计数能把「渲染次数」量出来；在 React 里你反而看不见协调次数。

> 💬 **面试官**：流式渲染为什么会卡？有哪些优化手段？
>
> ✅ **标准答案**：卡的原因是更新频率超过渲染频率——delta 到达速率可能上百个每秒，而浏览器只渲染 60 帧每秒，每个 delta 都写 DOM 等于做了大量无效工作。优化手段是把更新收敛到帧：`buffer` 攒内容 + `requestAnimationFrame` 每帧提交一次；流结束时手动 flush 最后一批。另外可以用 `PerformanceObserver` 观察 `longtask` 来量化验证。
>
> 🎁 **加分答案**：说出收益上限——「写入次数从 delta 数降到有内容的帧数，倍数上限是产出速率除以帧率」。这句话能区分「背过优化手段」和「真正量过」的人。再补一句：如果 delta 速率低于帧率，这些优化都是无用功，先量再说。

### 坑五：abort 要一路传到上游

用户点「停止生成」，你以为界面停了就完了——**如果只清了界面没断开连接，上游的模型还在跑，钱还在烧**。

完整链路是三段，第一段在浏览器，后两段在服务端：

```typescript
// ① 前端：labs/phase2-api/03-stream-client/client.ts（节选）
const controller = new AbortController()

// signal 传给 fetch，abort() 会真的断开 TCP 连接
const res = await fetch('/sse', { signal: controller.signal })

function stopStream(): void {
  controller?.abort()                 // 👈 用户点「停止生成」
  el('stop-btn')!.setAttribute('disabled', '')
}
```

```typescript
// ② 服务端：labs/phase2-api/03-stream-client/server.ts（节选）
// 这里的 res 是 Node 的 ServerResponse，和上面浏览器里的 Response 不是同一个东西
createServer((req, res) => {
  const ac = new AbortController()
  res.on('close', () => {
    if (!res.writableEnded) ac.abort()   // 👈 区分「正常结束」和「用户中断」
  })
  // ...路由与转发
})
```

那段 `if (!res.writableEnded)` 是个容易错的地方：`'close'` 事件在**正常写完**和**客户端断开**两种情况下都会触发。不加这个判断，每次正常结束都会打一条「用户取消了」的假日志，真出问题时反而找不到线索。

验证标准不是「界面停了」，是**三处同时停下**：

- 页面按钮变灰（前端停了）
- 服务端终端打印「客户端主动断开，上游请求被取消」（链路通了）
- DevTools Network 里请求状态变成 `(canceled)`（网络层真的断了）

缺任何一处，都意味着有一层还在空转。

> 💬 **面试官**：用户点「停止生成」，你怎么确保不继续产生 token 费用？
>
> ✅ **标准答案**：`AbortController` 的 `signal` 传给 `fetch`，用户点击时 `abort()`，连接断开后服务端 `res.on('close')` 触发、用另一个 `AbortController.abort()` 取消上游的 LLM 请求。验证要看三处：按钮状态、服务端日志、DevTools 里的 `(canceled)`——只看界面变灰是不够的。
>
> 🎁 **加分答案**：补一句坑——服务端的 `'close'` 事件在正常结束和异常断开时都会触发，要用 `res.writableEnded` 区分，否则日志会被假报警污染。再深一层：已经生成的 token 是收不回来的，abort 只能阻止后续生成，所以「停止」省的是后半段的钱，不是全部。

---

## 🧪 动手实验：三组对照，全部可复跑

> **说明**：实验脚本在 `labs/phase2-api/03-stream-client/`，只用 Node 内置模块 + `esbuild` 打包前端，不引任何库。跑法：先 `nvm use 22`，再 `pnpm --filter @medai/labs p2-client` 起实验页，浏览器打开 `http://127.0.0.1:3004/`。想用命令行复现实验 A 的数字，另开终端跑 `pnpm --filter @medai/labs p2-client-measure`。每次点「开始」是一次真实调用，约 ¥0.01。

### 实验页是怎么搭起来的：三个文件、三条路由

打开 `http://127.0.0.1:3004/` 看到的那个页面，是本篇实验目录下三个文件拼出来的，一个文件只干一件事：

| 文件 | 职责 | 关键内容 |
|---|---|---|
| `index.html` | 只有结构，零逻辑 | 三段 `<section>` 对应三个实验；末尾一行 `<script src="/client.js">` |
| `client.ts` | 全部行为 | 解析器 + 两种渲染策略 + 字节演示 + abort，末尾 `bind()` 按 id 挂事件 |
| `server.ts` | 起 3004 端口，同时干三件事：打包前端、发页面、转发流 | `buildSync` 内存打包、`readFileSync` 读页面、三条路由 |

`index.html` 里没有一个 `<script>` 逻辑块，只有 id：`#run-a` / `#run-b` 是实验 A 的两颗按钮、`#counts-body` 是计数表、`#run-byte` 是实验 B、`#start-c` / `#stop-btn` 是实验 C。`client.ts` 末尾的 `bind()` 负责把它们对上：

```typescript
// labs/phase2-api/03-stream-client/client.ts（节选）
function bind(): void {
  el('run-a')!.addEventListener('click', () => renderNaive(el('stream-out')!, new AbortController().signal))
  el('run-b')!.addEventListener('click', () => renderBatched(el('stream-out')!, new AbortController().signal))
  el('run-byte')!.addEventListener('click', runByteBoundaryDemo)
  el('start-c')!.addEventListener('click', startStream)
  el('stop-btn')!.addEventListener('click', stopStream)
}
```

`server.ts` 这边最值得看一眼的是**打包**：不开 webpack、不配 vite，`buildSync` 直接在内存里把 `client.ts` 打成单文件 IIFE，`write: false` 表示不落盘、只要 `outputFiles[0].text` 那段字符串。实验代码的「零前端工程依赖」是刻意的——让人看见每一行原始逻辑，而不是被构建配置分心。

```typescript
// labs/phase2-api/03-stream-client/server.ts（节选）
const clientJs = buildSync({
  entryPoints: [resolve(HERE, 'client.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  write: false,                    // 👈 不写文件，结果留在内存里
}).outputFiles[0].text

const page = readFileSync(resolve(HERE, 'index.html'), 'utf-8')
```

拿到这两段内容之后，路由就是三条 `if`：

```typescript
// labs/phase2-api/03-stream-client/server.ts（节选）
const url = req.url ?? '/'
if (url === '/') {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(page)                    // 👈 实验页
  return
}
if (url === '/client.js') {
  res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' })
  res.end(clientJs)                // 👈 打包后的前端单文件
  return
}
if (url === '/sse') {
  handleSse(res, ac.signal).catch((err) => {
    if (!ac.signal.aborted) console.error('❌ 上游出错：', err)
    if (!res.writableEnded) res.end()
  })
  return
}
res.writeHead(404)
res.end()
```

所以三个实验和路由的对应关系是：**实验 A 和实验 C 打的是 `/sse`**（每次点击都是一次真实上游调用），**实验 B 一个网络请求都不发**——它在 `runByteBoundaryDemo()` 里用 `TextEncoder` 造出「阿莫西林」的 12 个字节，再按 2 字节一片喂给两个 `TextDecoder`，纯本地、零成本。

### 实验 A：两种渲染策略

页面上点「策略 A」「策略 B」各跑一次，表格会记录 delta 数、渲染次数、长任务数。

更有说服力的是命令行版本 `p2-client-measure`——它用同一份真实流，同时算出两个策略在构造上必然得到的渲染次数，不依赖截图，人人可复跑：

```text
┌─ 指标            │ 数值    │ 说明
├─ ────────────────┼─────────┼────────────────────────────
│  首字节时间      │ 131 ms  │ 流式的全部收益所在
│  总耗时          │ 2985 ms │ 模型生成完的墙钟时间
│  delta 数        │ 286     │ 带 content 的增量帧数
│  策略 A 渲染次数 │ 286     │ = delta 数（构造上必然）
│  策略 B 渲染次数 │ 101     │ = 有内容到达的帧数（60fps）
│  A / B 倍数      │ 2.8 倍  │ 渲染次数被收敛的倍数
```

跑 3 次取区间：delta 数 286 ~ 363，策略 B 渲染次数稳定在 91 ~ 101，倍数 2.8 ~ 3.6 倍。**策略 B 的写入次数几乎不随 delta 数变化**——它跟着时间走（帧数），不跟着内容走（delta 数）。这个「不随内容增长」的性质，才是它在长回答下不卡的根本原因。

### 实验 B：字节边界

页面上点「跑字节边界对照」，结果就是前面那张表的来源——背后是 `client.ts` 里的 `runByteBoundaryDemo()`：`TextEncoder` 把「阿莫西林」编成 12 字节，按 2 字节循环切片，同一份 `slice` 同时喂给两个 `TextDecoder`，一个开 `stream` 一个不开，最后各自再调一次无参 `decode()` 收尾。

- 不开 `stream`：12 字节 → 10 个 `�`，0 个字还原
- 开 `stream`：12 字节 → 4 个字，完全正确

这个实验零成本、纯本地，值得每个接流式的人跑一遍——因为一旦你亲眼见过输入 12 字节、输出 10 个乱码，就再也不会把 `�` 归咎于「后端编码错了」。

### 实验 C：abort 传播

点「开始生成」，生成途中点「停止生成」，同时看三处：按钮变灰、服务端打印「🛑 客户端主动断开，上游请求被取消」、DevTools 里 `/sse` 变 `(canceled)`。

实现上是 `startStream()` 新建一个 `AbortController`，把它的 `signal` 交给 `renderBatched(out, signal, false)`——第三个参数 `report = false` 表示复用策略 B 的渲染逻辑但不往实验 A 的表格里插行；`stopStream()` 只做两件事：`abort()` + 禁用按钮。

三处同时对上是合格。对照组（把清空界面的代码注释掉、只保留 `abort()`）会发现界面不清了但服务端日志照常打印——这说明**「停 UI」和「停请求」是两件独立的事**，很多实现只做了前一件。

---

## 🚧 总结与边界

本篇压成一句话：

> **前端消费流式的三件事——自己解析 SSE（因为 `EventSource` 不够用）、正确处理字节边界、把渲染收敛到帧。**

五条推论：

- **`EventSource` 出局的原因是能力，不是性能**：它不能 POST、不能带自定义头，AI 对话的历史和鉴权都塞不进去。
- **切帧按空行，不按 `data:`**：一个分片可能含半帧或多帧，`while` 循环切到底。
- **`{ stream: true }` 是中文流式的必备参数**：不开它，多字节字符被网络切片切开就变成 `�`。
- **渲染优化的收益有上限**：写入次数从 delta 数降到有内容的帧数，倍数上限 = 产出速率 ÷ 帧率。产出速率低于帧率时优化无用。
- **abort 要验证三处**：按钮、服务端日志、DevTools 的 `(canceled)`。只看界面停了等于没验证。

有意识地留到后面三件事：

- **`useChat` 把这 100 行封装成了什么** → 阶段六（到时候你会认出它内部就是这套 `buffer + rAF` 加消息历史）
- **消息历史管理、多轮上下文、断线重连补发** → 阶段三
- **生成式 UI、部分结果渲染、语音 barge-in** → 阶段十

到这里，阶段二的「流式」这一块已经闭合：服务端负责「更早开始」，客户端负责「接得住」。下一篇换一条线，从「流」转向「结构」——让模型的输出变成能被机器校验的数据。

---

## 🎤 面试追问链

**追问一：`EventSource` 和 `fetch + ReadableStream` 的区别？为什么 AI 对话基本不用前者？**

`EventSource` 只能发 GET、不能带自定义请求头和请求体，但内置自动重连；`fetch` 版本支持任意方法、自定义头、请求体，重连要自己写。AI 对话需要 POST 传历史（URL 放不下）、需要 `Authorization` 头，所以选 `fetch`。追问会往「那你怎么实现重连」走——答案是重连后补发需要服务端有消息历史，这件事本身属于阶段三的上下文工程。

**追问二：流式渲染为什么会卡？有哪些优化手段？**

更新频率超过渲染频率：delta 可能上百个每秒，浏览器只画 60 帧每秒。优化是 `buffer` + `requestAnimationFrame` 把多次更新收敛到一帧，流结束时手动 flush。追问会问「能优化多少倍」——上限是产出速率 ÷ 帧率，实测同一段回答约 2.8 倍，delta 越快倍数越高。

**追问三：中文乱码（`�`）是什么原因？怎么修？**

`TextDecoder` 没开 `{ stream: true }`。汉字 UTF-8 占 3 字节，网络分片可能切在中间；不开 `stream` 时残片被替换成 `�`，开了之后留在内部状态等下一片拼。修法就是一个参数。追问可能问「为什么英文测试永远正常」——因为 ASCII 是单字节，切在哪都是完整字符，这个坑只在多字节字符上暴露。

**追问四：用户点「停止生成」时，你怎么确保不继续产生 token 费用？**

`AbortController` → 前端 `fetch` 断开 → 服务端 `res.on('close')` → 上游 `abort()`。验证三处：按钮、服务端日志、DevTools 的 `(canceled)`。加分点是「已经生成的 token 收不回来，abort 只省后半段」，以及 `res.writableEnded` 用来区分正常结束与用户中断。

---

## 💡 一张图总结

| 知识点 | 一句话解释 | 面试频率 |
|---|---|---|
| `EventSource` 的边界 | 只能 GET、无自定义头，AI 对话用 `fetch` | 极高 |
| 切帧依据 | 按 `\n\n` 切，不是按 `data:` 切 | 高 |
| 半帧与多帧 | 一个分片可能含半帧或多帧，要用 `while` | 高 |
| `{ stream: true }` | 拼接多字节字符残片，防 `�` | 极高 |
| 渲染收敛 | `buffer` + `rAF`，写入次数从 delta 数降到帧数 | 极高 |
| 收益上限 | 产出速率 ÷ 帧率，产出慢时优化无用 | 高 |
| abort 三处验证 | 按钮 / 服务端日志 / DevTools `(canceled)` | 高 |
| `res.writableEnded` | 区分正常结束与客户端断开 | 中 |

---

## 📝 留个问题

一个真实排查现场：

同一条流式接口，用 `curl -N` 打，字是一个一个出来的，首字节 130ms；在 Chrome 里用你的前端页面打开，首字要等 4 秒，然后整段一起出现。

- 服务端没问题（`curl` 证明了），那问题在客户端还是代理？
- 你会用 DevTools 的哪个面板、看哪个指标来定位？
- 如果代码里确实写了 `fetch` + `getReader`，还有哪些地方可能把流攒住了？

提示：`curl -N` 的 `-N` 关掉的是 curl 自己的缓冲；浏览器这一侧也有类似的东西，而且不止一处。

---

## 📚 参考来源

**① 本篇配图**

- 两张对比图与一张分布图均由本篇实验数据渲染生成：渲染策略 DOM 写入对比（实验 A）、delta 到达时间分布（实验 A）、`TextDecoder` 字节边界对比（实验 B）。中文图注见正文。

**② 官方文档与规范（2026-11-09 实验核实）**

- MDN — Using readable streams：搜索关键词「MDN ReadableStream getReader」
- MDN — `TextDecoder` 的 `stream` 选项：搜索关键词「MDN TextDecoder stream option」
- WHATWG HTML Living Standard — Server-Sent Events：搜索关键词「WHATWG Server-Sent Events」

**③ 本项目实验代码**

- 实验目录：`labs/phase2-api/03-stream-client/`（`index.html` 三个实验区的结构、`server.ts` 实验页与流式端点、`client.ts` 三种渲染与解析逻辑、`measure.ts` 命令行可复现测量）
- 阶段二大纲：`docs/roadmap/ai-phase-02-api-foundation-outline.md`

---

> 🔖 这是「AI 工程」系列 · 阶段二「应用底座」第 3 篇。上一篇：《SSE 服务端：流式不是「更快返回」，是「更早开始」》；下一篇预告：《结构化输出：把正确性押在 Schema 上》
