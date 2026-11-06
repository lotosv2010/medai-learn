# SSE 服务端：流式不是「更快返回」，是「更早开始」（面试收藏级）

> 本地 `pnpm --filter @medai/labs p2-sse` 起来逐字往外蹦，部署到线上却「憋八秒吐一次」——不是流式坏了，是中间某一层把响应缓冲了。这一篇，把这条流的每一层都拆开看。

---

## 🎯 这篇文章解决什么问题

阶段二第 1 篇把请求「发出去、发得稳」讲透了，但那还停留在「一次性拿到完整回答」的形态。真实的大模型对话不是这样——它一个字一个字地往外冒。

这一篇讲服务端的流式输出，是阶段二「应用底座」的第二块地基。读完你会拿到三样东西：

- 一条 SSE 流在字节层面到底长什么样，`data:` 和两个换行分别是什么意思
- 流式为什么没有让回答变快，却让用户感觉变快了——首字节时间 vs 总耗时，是两个被混为一谈的指标
- 「本地流、线上不流」的病根在哪一层，以及一个最容易被忽略的响应头

每一段照旧配「面试官会怎么问」。这篇是纯 Node 服务端视角，浏览器怎么消费这条流、打字机怎么不卡，留给第 3 篇。

---

## 🔍 概念：流式的本质是 `AsyncIterable<Delta>`

先把直觉纠过来。很多人以为「流式」是服务端把完整回答切成一段段发出来——**不是**。流式的本质是：

> 上游每生成一小段文本增量（Delta），就立刻把它交出来。你拿到的不是一个「被切开的完整回答」，而是一条「边生成边产生的增量序列」。

在代码里，它就是一个 `AsyncIterable<Delta>`：你用 `for await` 去迭代它，每迭代一次，就拿到一小段新生成的文字。第 1 篇里那个 `fetch` 拿到的完整 `choices[0].message.content`，在这里变成了很多个 `delta.content` 的累加。

这个区别直接决定了一个工程现象——「憋八秒吐一次」。如果你只是把完整回答切成片、再一次性发出去，那中间任何一层把响应攒起来缓冲，流就「退化」成了憋一口气再吐。所以服务端流式的全部工作，可以浓缩成三句话：

- 拿到上游的 `AsyncIterable`
- 按 SSE 帧格式逐帧写出去
- 确保中间每一层都不缓冲

前两句是本篇的技术主体，第三句是「线上不流」的万能解药。

> 💬 **面试官**：先问你一个概念题——流式输出「更快」吗？
>
> ✅ **标准答案**：不是。流式不缩短总耗时，它缩短的是**首字节时间（TTFB，Time To First Byte）**。完整回答要等模型全部生成完才能返回，首字节就等于总耗时；流式下第一个 token 生成出来就能发，用户几百毫秒内就能看到字。总耗时没变，变的是「等待的形状」——从「干等八秒」变成「立刻有反馈」。
>
> 🎁 **加分答案**：补一句——所以流式的收益要**用首字节时间来度量，而不是总耗时**。如果上线后发现流式没有带来体验提升，先别急着怀疑实现，去量一下首字节时间有没有真的提前。很多人把「流式没用」的锅甩给协议，其实是测错了指标。

---

## ⚙️ 深入：从 AsyncIterable 到字节流的三段式

### 第一段：LLM 的流，字节层面长什么样

先看 DeepSeek 流式接口真实返回的原始帧。下面这段是抓包得到的（模型回答「阿莫西林胶囊的常见不良反应有哪些」，整条流共 58 帧）：

```text
data: {"choices":[{"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"choices":[{"delta":{"content":"阿"},"finish_reason":null}]}

data: {"choices":[{"delta":{"content":"莫"},"finish_reason":null}]}
```

这是三个细节，每一个面试都能问：

**① 首帧 `delta.role` 有值、`content` 为空。** 第一条数据不是正文，是「自我介绍」——告诉你接下来增量内容的角色是 assistant。这是协议层的元信息帧，前端解析时不能把它当正文拼进去。

**② 正文帧只有 `delta.content`。** 从第二帧开始，每帧的 `delta.content` 就是新生成的那一小段文字：「阿」「莫」……一直到最后。思考模式下这里还会多一个 `delta.reasoning_content` 字段（模型先吐思考过程再吐答案），要不要把思考过程也展示给用户，是产品决策，不是技术问题——本文的实验都在非思考模式下跑。

**③ 最后一个 chunk 带完整 `usage`，以 `data: [DONE]` 收尾。** 很多教程教你在请求里加 `stream_options.include_usage: true` 才能在流里拿到 token 用量，其实 DeepSeek 不加也能拿到——**最后一个 chunk 天然带完整 `usage`**，`include_usage` 只是让中间每一帧也带上一个值为 `null` 的 usage 字段。省一次配置，账单照样算得清。

> 💬 **面试官**：SSE 流里第一个 chunk 有什么特殊？
>
> ✅ **标准答案**：首帧的 `delta.role` 有值、`content` 是空的。它是角色声明帧，正文增量从第二帧才开始。所以前端拼装文本时，要么跳过首帧，要么只累加 `delta.content` 非空的帧。
>
> 🎁 **加分答案**：能提到 `finish_reason` 的变化——中间帧都是 `null`，只有最后一帧才有值（`stop` 或 `length`），配合 `data: [DONE]` 哨兵一起作为「流结束」的双重信号。以及思考模式下 `delta.reasoning_content` 和 `delta.content` 是分开的，展示与否是产品决策。

### 第二段：Node 怎么把增量写出去

先把「上游的流」拿到手。和上一篇的唯一区别，就在请求体里的一个布尔值——`stream: true` 之后，`response.body` 就不再是一整段 JSON，而是一条可以逐块读的字节流：

```typescript
const requestBody = (stream: boolean) =>
  JSON.stringify({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: QUESTION }],
    stream, // 👈 真流式与整段发，唯一的差别就是这一个布尔值
  })

async function callModel(stream: boolean, signal: AbortSignal): Promise<Response> {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: requestBody(stream),
    signal, // 👈 客户端断开时，这个 signal 会一路传到 fetch，Node 真的会掐断上游连接
  })
  if (!res.ok) throw new Error(`上游 ${res.status}：${await res.text()}`)
  return res
}
```

拿到这条流之后，服务端要做的事朴素得近乎无聊：迭代它，每拿到一段就 `res.write()` 一段。完整实现在 `labs/phase2-api/02-sse-server/index.ts`，核心就是下面几十行：

```typescript
async function handleStream(res: ServerResponse, signal: AbortSignal) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream', // ① 告诉客户端这是事件流，不是一堆文本
    'Cache-Control': 'no-cache', // ② 别缓存，流是一次性的
    Connection: 'keep-alive', // ③ 这条连接要一直开着
    'X-Accel-Buffering': 'no', // ④ 告诉 Nginx「这一段别缓冲」——少了它就是「本地流、线上不流」
  })
  res.flushHeaders() // 👈 先把响应头推出去，否则客户端连 header 都要等到第一帧才看得见

  // 👈 冒号开头是注释帧：EventSource 收到它不会触发 message 事件，只用来保活
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 3000)

  const decoder = new TextDecoder()
  let buf = ''
  // 下面三个变量是实验 A 的「仪表盘」：分片数 ≠ 帧数，就靠它们数出来
  const started = performance.now()
  let reads = 0
  let frames = 0

  try {
    const upstream = await callModel(true, signal) // 上游：stream: true 的那一次调用
    const reader = upstream.body!.getReader()

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      reads += 1
      // 加 --trace 能看到每个字节块什么时候到（trace 来自启动参数，实验 A 的时间线由此而来）
      if (trace && reads <= 5) {
        console.log(`分片 ${reads}: ${Math.round(performance.now() - started)}ms  ${value.byteLength} 字节`)
      }

      // 📚 汉字 3 字节，可能被网络切成两半；{ stream: true } 把残片留到下一轮拼
      buf += decoder.decode(value, { stream: true })

      // 📚 一个网络分片可能是半帧，也可能同时带来好几帧 → 只能按「两个换行」切
      let idx: number
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const frame = buf.slice(0, idx)
        buf = buf.slice(idx + 2)
        // 原样转发，不解析 JSON：服务端只负责找帧边界，内容留给客户端
        if (frame.startsWith('data: ')) {
          frames += 1
          res.write(`${frame}\n\n`) // 👈 两个换行才是帧结束
        }
      }
    }
  } finally {
    clearInterval(heartbeat)
    res.end()
    console.log(`✅ 这一次：${reads} 个网络分片 → ${frames} 个 data 帧（分片数 ≠ 帧数）`)
  }
}
```

注意上面那个 `while`：**切帧的依据是「空行」，不是「一条 `data:`」**。一个 `read()` 可能给你半帧（`buf` 留着拼下一轮），也可能一次给你五帧（循环切五次）。这就是实验 A 里「分片数 ≠ 帧数」的直接原因。

还有一处刻意的设计：**这里不解析 JSON，原样转发 `data:` 行**。服务端不需要知道 `choices[0].delta.content` 是什么——它的职责只有一个，判断「哪里是一帧」。把业务逻辑剥掉，SSE 这件事才看得清；解析内容、累积文本那是客户端的事（下一篇）。

客户端断开时中止上游，是这几行：

```typescript
  // 👈 客户端一断开就中止上游。不写这几行，用户关掉页面了账单还在跑
  const ac = new AbortController()
  res.on('close', () => ac.abort())
  // 这个 signal 一路传给 fetch，Node 会真的把那个 TCP 连接掐断
```

服务端的流式就这四件事：四个响应头、`flushHeaders`、逐帧 `write`、断开时 `abort`。剩下的全是坑，不是逻辑。

前三个头是 SSE 的标配，第四个 `X-Accel-Buffering: no` 是**踩坑重灾区**。这个头是 Nginx 的私有约定：Nginx 默认会把上游响应攒到一定量再转发（就是为了吞吐优化），加了这个头，它才知道「这一段别缓冲，来一点发一点」。

「本地流、线上不流」的头号元凶，就是漏了这个头。而且——**每个代理的开关都不一样**：Nginx 认 `X-Accel-Buffering`，别的网关可能认别的配置，甚至根本不认任何头。这正是实验 C 要亲手复现的东西。

🔧 **真实场景**：一个用药咨询网关，本地 `pnpm --filter @medai/labs p2-sse` 跑得好好的，部署到 Nginx 后面，用户点开对话，页面白等八秒，然后「哗」一下整段出来。排查半天，模型、代码、前端都没问题——就是 Nginx 默认缓冲了 SSE 响应，漏了 `X-Accel-Buffering: no`。

**对照一下「整段发」那条路径**，你立刻明白为什么它有首字节问题——它必须等上游全部生成完，才第一次碰 `res`。同一份实验代码里，它和真流式唯一的差别就是 `stream: false`：

```typescript
async function handleBlock(res: ServerResponse, signal: AbortSignal) {
  const upstream = await callModel(false, signal) // 👈 唯一的差别：stream: false
  const json = await upstream.json()

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end(json.choices?.[0]?.message?.content ?? '') // 👈 用户在这之前一个字节都收不到
}
```

### 第三段：SSE 帧格式，两个换行是帧结束

流式数据的「信封」叫 SSE（Server-Sent Events），它的帧格式简单到可以一句话说完：

- 一帧 = `data: {内容}\n\n`——**两个换行**是帧结束符，一个换行只是行尾
- 心跳 = `: ping\n\n`——**冒号开头**是注释帧，`EventSource` 收到它不会触发任何事件，纯粹用来保活
- 结束 = `data: [DONE]\n\n` 或 `event: done`

为什么是「两个换行」而不是一个？因为一个 SSE 事件可以带多个字段（`data:`、`event:`、`id:`、`retry:`），每个字段一行，用**空行**（也就是连续两个换行）分隔两个事件。所以切帧的依据是「空行」，不是「一条 data」。

### 为什么是 SSE 不是 WebSocket

这是面试必问。一句话版：**AI 文本流是单向、服务端持续推、客户端只说一次的典型场景，SSE 就是为这个造的；WebSocket 是全双工，用在这里等于「为了写一封信，装了一部电话」。**

![三种实时通信方式的方向对比：SSE 只有服务端到客户端一条通道，客户端要发数据只能另开一次 HTTP 请求；WebSocket 两个方向都有通道，双方随时互发；轮询则是客户端反复发请求去问服务端有没有新数据](https://jianda-cmsstatic.oss-cn-shenzhen.aliyuncs.com/assets/charts/202611/1793936362416_0y2kgq8sv8w.png)

看上图就能明白为什么 AI 文本流选 SSE：我们只有一条「服务端 → 客户端」的通道，客户端从头到尾只发一次请求（带问题），然后就只听。这种单向结构用 WebSocket 是浪费——它那套握手、心跳、重连协议，全是为了「双向」付的代价。

具体差异是一张表：

| 维度 | SSE | WebSocket |
|---|---|---|
| 通信方向 | 单向（服务端 → 客户端） | 全双工（双向） |
| 协议基础 | 普通 HTTP 响应，连接保持不断 | HTTP 升级成独立协议 |
| 数据格式 | 只支持文本（UTF-8） | 原生支持文本 + 二进制 |
| 自动重连 | `EventSource` 内置，带 `Last-Event-ID` | 需要自己实现 |
| 过代理 | 走 HTTP，代理友好 | 部分防火墙/代理会拦截 |

那什么时候该换 WebSocket？当场景从「服务端持续推」变成「客户端要实时打断、立刻上行」的时候——比如语音对话里的 barge-in（用户开口打断 AI），这时候双向的低延迟才是刚需，那是阶段十的事。AI 文本流选 SSE 是标准答案。

### 工程细节：这一层最容易漏的四件事

原理讲完，真正拉开差距的是这些「上线才知道」的细节：

**① 客户端断开，要通知上游。** 用户点了「停止生成」或直接关掉页面，如果你什么都不做，**上游的 LLM 请求还在继续跑、继续计费**。正确做法是监听 `res.on('close')`，一旦断开就用 `AbortController.abort()` 把上游请求也停掉。

**② 代理超时。** Nginx 的 `proxy_read_timeout` 默认 60 秒，流式响应 60 秒内没有数据流动就会被掐断。所以「心跳帧」不只是给浏览器看的，也是给中间代理看的——定期发 `: ping\n\n`，告诉每一层「这条连接还活着」。

**③ 压缩中间件会攒缓冲。** 如果服务端开了 `compression`，它会为了压缩比把响应攒起来，流式端点必须把它排除掉，否则又被「憋住」。

**④ 断线重连后的「从上次位置继续」涉及消息历史。** `EventSource` 能自动重连，但重连后怎么补回没收到的那半句话，是阶段三上下文工程的事，本篇不展开。

> 💬 **面试官**：本地是流式，上线就不流了，你会怎么排查？
>
> ✅ **标准答案**：从链路的下游往上，一层层找「谁在缓冲」。先看响应头有没有 `X-Accel-Buffering: no` 且中间代理是否认这个头；再看有没有压缩中间件把流攒起来了；再看代理的 `proxy_read_timeout` 是不是把长连接掐了。核心心法是——**流式在每一层都可能被「缓冲」这个动作杀死**，排查就是找那个缓冲点。
>
> 🎁 **加分答案**：能说出「客户端自己也会缓冲」——`curl` 不加 `-N` 就会攒着一起出。所以排查时先确认「是客户端攒的、代理攒的、还是服务端根本没流」，用 `curl -N -w '\n首字节: %{time_starttransfer}s  总耗时: %{time_total}s\n'` 一次就能看到首字节时间和总耗时，定位缓冲发生在哪一段。

---

## 🧪 动手实验：一条流的三次解剖

> **说明**：实验脚本已就绪 `labs/phase2-api/02-sse-server/`，只用 Node 内置模块，不引任何 Web 框架。跑法：先 `nvm use 22`，再 `pnpm --filter @medai/labs p2-sse` 起服务，然后用 `curl` 打 `/sse`（真流式）与 `/block`（整段发）。每打一次 `curl` 是一次真实调用，约 ¥0.01；`Ctrl+C` 结束。

三个实验，分别回答三个问题：流在字节层长什么样、流式真的更快吗、缓冲是怎么杀死流的。

### 实验 A：一条流在字节层面长什么样

直接 `curl -N` 打一次 `/sse`，你会看到 `data:` 行随时间陆续出现。运行脚本会在服务端打印这一行：

```text
✅ 这一次：29 个网络分片 → 61 个 data 帧（分片数 ≠ 帧数）
```

**29 个分片，61 个帧。** 这两个数字对不上，就是整篇最重要的一个认知：客户端收到的是**字节块**（TCP 分片），帧是你自己按 `\n\n` 从字节里切出来的。一个分片可能只含半帧，也可能一次带来五帧。

加上 `--trace` 再打一次，服务端会打印前 5 个分片的到达时刻，流的「时间形状」就出来了：

```text
分片 1: 182ms   291 字节
分片 2: 895ms   275 字节    ← 首帧正文前的等待，模型在生成
分片 3: 970ms   275 字节
分片 4: 981ms  1390 字节    ← 一次挤进来五帧
分片 5: 991ms   837 字节
✅ 这一次：35 个网络分片 → 83 个 data 帧（分片数 ≠ 帧数）
```

三个细节：响应头在第一个分片之前就发出去了（`flushHeaders()` 的功劳）；第一个分片 182ms 到，但里面只有角色声明帧，真正的正文要等到模型开始吐字；从分片 4 开始一次到好几帧——TCP 攒批，服务端一次 `read()` 拿到，得自己切。

### 实验 B：流式真的更快吗

这是本篇结论的全部证据。同一个服务、同一个问题，只差请求体里一个 `stream` 布尔值：

| 测量项 | 真流式 `/sse` | 整段发 `/block` |
|---|---|---|
| 首字节时间 | 130 ~ 170ms | 1195 ~ 1219ms |
| 总耗时 | 1160 ~ 1510ms | 1195 ~ 1219ms |

三个数字往这一摆，结论就出来了：

- **总耗时几乎一样**——都是模型生成完整回答的时间，流式一点也没让它变短
- **首字节差一个数量级**——真流式一百多毫秒就吐第一个字，整段发要等一千多毫秒整段出来
- `/block` 的**首字节 ≈ 总耗时**，这两个数字近乎相等，就是「用户全程一个字节都收不到」的证据

换成一条横向对比图更直观——每根柱子的总长度差不多，但红色那段「等首字节」的长度差了一个数量级：

![三种响应路径的首字节时间与总耗时对比：整段发要等一千多毫秒才吐第一个字，真流式一百多毫秒就开始出字；两者的总耗时都差不多，红色代表「首字节之前的干等」，绿色代表「真正在出字」](https://jianda-cmsstatic.oss-cn-shenzhen.aliyuncs.com/assets/charts/202611/1793936392042_a1fxg7co9m.png)

> ⚠️ **发布前待办**：这张图与下面那张链路图是上一版脚本（fixture 回放）渲染的，柱子上的数值与上表不同。图表达的形状（红色段差距极大、总长接近）仍然成立，但**发布前必须按本版实测数据重绘**，避免图文数字打架。

**流式没有让回答变快，它只是让你更早看到第一个字。** 用户盯着屏幕的那几秒里，「有没有字冒出来」决定了他是「感觉快」还是「感觉卡」。

### 实验 C：中间加一个会缓冲的代理会怎样

另开一个终端，用 `pnpm --filter @medai/labs p2-sse-proxy` 起一个「攒够 512 字符才转发」的代理，什么都不改，再看同一条流：

| 测量项 | 直连 `:3002/sse` | 经代理 `:3003/sse` |
|---|---|---|
| 首字节时间 | 130 ~ 170ms | 636 ~ 711ms |
| 总耗时 | 1160 ~ 1510ms | 1238 ~ 1317ms |
| 网络分片数 | 25 ~ 27 | 18 ~ 27 |

代理把分片攒成批，首字节硬生生晚了 500ms 多。**服务端每一行代码都没改，客户端却从「逐字」退回了「一段一段」**——这就是「本地流、线上不流」的全部真相：病不在你的代码里，在中间某一层的缓冲开关上。

而且这个自制代理**照搬了上游的响应头**（包括那个 `X-Accel-Buffering: no`），却照攒不误——它压根不认识这个头，这正好说明「每个代理的开关都不一样」，上线后对着自己那台网关的文档调。

把三层串起来看，一条流要穿过的完整链路是这样的：

![SSE 链路四层排查图：从客户端的 curl -N、到代理网关的 X-Accel-Buffering 与 proxy_read_timeout、再到服务端的四个响应头与逐帧 write、最后到上游 LLM 的 stream true，任何一层攒缓冲都会让流退化成憋](https://jianda-cmsstatic.oss-cn-shenzhen.aliyuncs.com/assets/charts/202611/1793936464518_4qfjtq6k36p.png)

这张图就是「上线不流了」的排查清单：从下游往上游逐层验证，哪一层的首字节时间和上游对不上，缓冲就发生在哪一层。

---

## 🚧 总结与边界

本篇压成一句话：

> **服务端的流式只有三件事——拿到 `AsyncIterable`、按 SSE 帧格式写、确保中间每一层都不缓冲。**

四条推论：

- **流式的收益是首字节，不是总耗时。** 度量它要用 TTFB，别用总耗时——指标选错，结论全错。
- **`X-Accel-Buffering: no` 是「本地流、线上不流」的头号解药**，但每个代理的开关不一样，得对着自己的网关文档调。
- **客户端断开必须 abort 上游**，否则用户关了页面，账单还在跑。
- **解析 SSE 按「两个换行」切帧**，不能按网络分片切——分片数 ≠ 帧数。

有意识地留到后面三件事：

- **浏览器怎么消费这条流**（`EventSource` 为什么不够用、字节边界、打字机怎么不卡）→ 第 3 篇
- **框架的 Data Stream Protocol 与裸 SSE 的差异** → 阶段六
- **语音场景的双向流、barge-in** → 阶段十

到这里，阶段二第 1 篇的「请求发得出去」长出了第二条腿——「响应流得回来」。下一篇把这条流接到浏览器里，看看前端那一侧怎么「接得住」。

---

## 🎤 面试追问链

**追问一：SSE 和 WebSocket 的区别？AI 对话为什么默认选 SSE？**

SSE 是单向、基于普通 HTTP、只支持文本、`EventSource` 内置自动重连；WebSocket 是全双工、独立协议、支持二进制、重连要自己写。AI 文本流是「服务端持续推、客户端只说一次」的单向场景，SSE 过代理友好、部署成本低，是标准答案。WebSocket 留给需要实时双向的场景（语音 barge-in）。

**追问二：为什么本地是流式、上线就不流了？**

从链路下游往上找「谁在缓冲」：客户端（`curl` 不加 `-N`）→ 代理（`X-Accel-Buffering` / 压缩中间件 / `proxy_read_timeout`）→ 服务端（响应头、`flushHeaders`）。心法是流式在每一层都可能被缓冲杀死，用 `curl -N -w` 的首字节时间定位缓冲点。

**追问三：用户点了「停止生成」，怎么保证上游的 LLM 请求也停了？**

监听 `res.on('close')`，客户端断开时用 `AbortController.abort()` 取消上游 fetch。要验证的不是「界面停了」，而是「上游真的 cancelled」——否则只是把显示停了，token 还在继续烧。

**追问四：SSE 帧为什么用两个换行结尾？心跳帧为什么用冒号开头？**

两个换行（空行）是事件与事件的**分隔符**，因为一个事件可以带多个字段（`data:`/`event:`/`id:`），每字段一行，空行收尾。冒号开头是**注释帧**，`EventSource` 收到不触发任何事件，专门用来保活，防止代理把空闲连接掐断。

---

## 📝 留个问题

给你一个真实排查现场，判断缓冲发生在哪：

同一条流式接口，本地 `pnpm --filter @medai/labs p2-sse` + `curl -N` 逐字正常；部署上线后，Chrome 里首字延迟 8 秒然后整段出现，但用 `curl -N -w '%{time_starttransfer}s'` 打线上接口，首字节却是 0.5 秒。

- 缓冲发生在服务端、代理、还是「这一层」？
- 为什么 `curl` 能看到首字节 0.5 秒，浏览器却要等 8 秒？
- 如果换成 `curl` 不加 `-N` 打同一个接口，现象会变成什么样？

提示：不是「服务端没流」，而是「你用来验证的客户端，本身就会缓冲」。

---

## 📚 参考来源

**① 本篇配图**

- 三张图均为本篇实验数据渲染生成：方向对比图（SSE / WebSocket / 轮询）、首字节 vs 总耗时对比图、四层链路排查图。数据来源见下条实验目录，中文图注见正文。

**② 官方文档与规范（2026-11-06 实验核实）**

- WHATWG HTML Living Standard — Server-Sent Events：搜索关键词「WHATWG Server-Sent Events 规范」
- DeepSeek — 流式接口与 `chat.completion.chunk` 帧结构：搜索关键词「DeepSeek API 流式输出」
- Node.js — `ReadableStream`、`node:http`：搜索关键词「Node.js ReadableStream http」

**③ 本项目实验代码**

- 实验目录：`labs/phase2-api/02-sse-server/`（裸 `node:http` 流式端点 `/sse` + 整段发对照 `/block` + 缓冲代理 `proxy.ts`）
- 实验参数：`--trace` 打印前 5 个网络分片的到达时刻（本文实验 A 的时间线由此得来）；每打一次 `curl` 是一次真实调用
- 阶段二大纲：`docs/roadmap/ai-phase-02-api-foundation-outline.md`

---

> 🔖 这是「AI 工程」系列 · 阶段二「应用底座」第 2 篇。上一篇：《多模型接入与降级链：先把请求发出去、发得稳》；下一篇预告：《前端接流式：接得上，更要接得住》
