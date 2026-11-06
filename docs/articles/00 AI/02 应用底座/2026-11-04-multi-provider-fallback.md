# 多模型接入与降级链：先把请求发出去、发得稳

> 面试官把「OpenAI 兼容」四个字写进 JD，你以为是省事，其实埋了四个雷——这四颗雷，就是本篇要拆的东西。

---

## 🎯 这篇文章解决什么问题

上一阶段收官时留了两个钩子：选型要落地成「可切换的代码」、输出要稳定成「可解析的结构」。这一篇兑现第一个。

先拆掉三个几乎所有人都会犯的误判：

- 把「调用能力」当成「会写 `fetch`」——会写一次请求，和能接住一次失败，是两回事
- 把「多模型接入」当成「复制粘贴四份」——以为给每家厂商写一份几乎一样的请求函数就叫多模型支持
- 把「OpenAI 兼容」当成「真兼容」——以为所有标注 OpenAI 兼容的接口，行为都和 OpenAI 一模一样

三个误判的根是同一个：**把「调用」当成了一次网络请求，而不是一层系统。**

一次请求失败就重发、一次返回就直出、一个模型写死一家——脚本可以这么写，系统不行。系统要回答的是三个问题：请求怎么**发得出去**、失败怎么**扛得住**、模型怎么**切得动**。

这篇文章讲四件事：

- 四块地基的依赖关系长什么样，为什么 01 是「总纲」
- 四类差异（请求 / 响应 / 流式 / 错误）各自不兼容在哪，Adapter 怎么把它们归一化
- 错误二分法：为什么 401 不该重试、429 该降级，判据是什么
- 降级链和双维路由怎么叠加，顺序为什么不能反

每一段照旧配「面试官会怎么问」。读完这一篇，你能对着任意两家 API 文档画出字段映射表，能给定一个错误码判断该重试、该降级、还是该直接抛给用户。

---

## 🔍 概念：调用是一层系统，不是一次网络请求

阶段二的七篇文章，回答的是「怎么把模型接进系统」这件事。这件事的工程链路是一条线：

```
多模型接入(01) → 流式输出(02/03) → 结构化输出(04) → Function Calling(05) → 向量嵌入(06)
```

而「异步与并发」横切前四块，管住次数与失败；最后在 07 篇把所有代码收进 `packages/ai-sdk`。这张图是阶段二唯一需要记住的图：

![阶段二四块地基的依赖关系：多模型接入、流式输出、结构化输出、Function Calling、向量嵌入五个模块从左到右依次依赖，橙色虚线框的「异步与并发」横切前四块，最后收口到绿色节点的 packages/ai-sdk](https://jianda-cmsstatic.oss-cn-shenzhen.aliyuncs.com/assets/charts/202611/1793764010017_gd5mj385ayd.png)

实线箭头代表依赖（先学会前面的才能做后面的），橙色虚线代表「横切能力」（它不排在序列里，而是贯穿每一块），最后的绿色节点是收口——把前面所有代码变成一个包。

这张图解释了为什么 01 篇是「总纲 + 第一块地基」：它是所有后续模块的入口，流式、结构化、Function Calling 全都建立在一个「能发请求、能切模型」的底座之上。

这一篇还立下阶段二的三条契约，后面每篇都会回指：

- **全程手写，不引入 Vercel AI SDK**——阶段六才上框架，先看清框架替你省掉的那几百行到底是什么
- **实验进 `labs/`**，只有 07 篇的最终产物进 `packages/ai-sdk`
- **每篇的实验都在给同一个网关加一块**，不是七个互不相干的脚本

> 💬 **面试官**：你接入过几家大模型？它们的接口有什么不一样？
>
> ✅ **标准答案**：差异有四类——请求结构（system 提示的放法、工具定义、response_format 各家各写各的）、响应结构（正常文本基本一致，但 usage 字段名、有无 cached_tokens 不同）、流式格式（OpenAI 兼容是 delta.content，Anthropic 原生是 content_block_delta）、错误类型（状态码语义不同，错误体结构完全不同）。所以「接入过多家」和「做过多模型抽象」是两回事——前者是抄了四份请求，后者是收敛成了一套接口。
>
> 🎁 **加分答案**：补一句关键的——这四类差异里，**前三类都能 100% 归一化，只有第四类（错误）只能近似**。因为「形状」是确定的，各家的成功响应结构就摆在那；但「失败」的信息不等价，有的给你 code、有的给你 type、有的只有一段人话。所以错误处理层一定是「约定」而非「映射」。这句话能直接筛掉没真做过多模型的人。

---

## ⚙️ 深入：四类差异、一次归一化、一张错误分类表

### 差异一：请求结构

同一份「你想让模型干什么」，装进不同信封时，放法完全不同。

最典型的是 `system` 提示的三种放法：

| 厂商 | system 提示怎么放 |
|---|---|
| OpenAI 兼容层（DeepSeek / 通义 compatible / OpenAI） | 作为 `messages[0].role='system'` |
| Anthropic 原生 | 顶层独立参数 `system: "..."`，不进 messages 数组 |
| 部分厂商特殊 role | 用 `role: 'developer'` 之类的自有语义 |

这只是冰山一角。工具定义、`response_format`、思考模式开关，每一家都是各写各的。所以「多模型接入」的第一步不是写请求，是**画字段映射表**——把每家的请求字段，映射到你内部的那一套语义上。

### 差异二：响应结构

好消息是：正常文本的取法基本一致，都是 `choices[0].message.content`。

坏消息是：元数据不一致。`usage` 有的叫 `prompt_tokens`，有的带 `cached_tokens` 明细，有的多个 `system_fingerprint`。这些字段在你的系统里有没有意义，取决于你要不要做成本核算和可观测——如果要，就得在归一化层把它们补成统一形状。

### 差异三：流式格式（最容易踩的坑）

同一个「流」，在不同厂商眼里是两种协议：

- **DeepSeek / OpenAI 兼容**：每个 chunk 是 `chat.completion.chunk`，增量在 `choices[0].delta.content`
- **Anthropic 原生**：走 `content_block_delta` 事件，增量在 `delta.text`，还带一堆生命周期事件（message_start / message_stop）

这两者不是「字段名不同」那么简单，是**协议形态不同**——一个是你拿到一段段 `delta`，另一个是你订阅一个个类型化事件。所以「OpenAI 兼容」四个字，在流式这一块经常是打了折扣的：它兼容了最外层，不兼容增量格式。

### 差异四：错误类型（降级设计的地基）

HTTP 状态码看似通用，语义却不同：有的厂商 402 表余额不足，有的直接 403；错误体结构更是每家一套。

所以你必须自己定义一层 `AIError`，把各家的错误收敛成四个分类：

| 分类 | 含义 | 典型触发 |
|---|---|---|
| retryable | 可重试、可降级 | 500 / 503 / 超时 / 网络中断 |
| rate_limited | 限流，退避后重试 | 429 |
| terminal | 直接抛，不重试 | 400 / 422 / 余额不足 |
| auth | 认证失败，直接抛 | 401 |

**错误二分法才是降级设计的地基**，判据一句话：

> **这个错误换成另一家厂商，会不会消失？**

会 → 可以降级（retryable / rate_limited）；不会 → 直接抛（terminal / auth），降级只是多烧一次钱。

这条判据决定了整条降级链的设计。401 认证失败，换到下一家——如果下一家用的还是同一套 key，照样 401；如果换的是另一个厂商的 key，那「认证失败」往往是 key 配错了，跟厂商无关，重试也不会好。所以 401 的正确处置是**立刻停下、报警、让人去修 key**，而不是重试三次白烧三次延迟。

DeepSeek 的 7 个错误码，2026-11-02 官方文档核实过，写成一张表直接可用：

| 状态码 | 错误信息 | 分类 | 处置 |
|---|---|---|---|
| 400 | Invalid Format | terminal | 修请求体 |
| 401 | Authentication Fails | auth | 检查 key，不降级 |
| 402 | Insufficient Balance | terminal | 充值，不降级 |
| 422 | Invalid Parameters | terminal | 修参数 |
| 429 | Rate Limit Reached | rate_limited | 退避重试，再降级 |
| 500 | Server Error | retryable | 重试，再降级 |
| 503 | Server Overloaded | retryable | 重试，再降级 |

一个跨厂商的坑：**不要只靠状态码做唯一判据**。要同时看错误体里的 `code` / `type` 字段，并把这层映射写成显式表——因为各家的状态码语义并不对齐。

> 💬 **面试官**：你的降级链会重试哪些错误？为什么 401 不该重试？
>
> ✅ **标准答案**：只重试 retryable 和 rate_limited。判据是「换一家会不会消失」——500 / 503 / 超时是某一家的临时问题，换一家可能就没了；429 是限流，退避后重试或换一家都有意义。而 401 是 key 本身的问题，跟换不换厂商无关，重试只是把同一个错重复三次。
>
> 🎁 **加分答案**：补一句——402 余额不足和 401 一样不该降级，但要区分「降级到另一家」和「降级到另一家但用的是同一个账户」。真实事故里有一种：两条「不同 provider」其实挂在同一个计费账户下，401 降级到第二条照样失败。所以降级链的粒度应该到「账户」而非「厂商」，这条判断在生产里值不少钱。

🔧 **真实场景**：一个用药咨询网关，凌晨三点 DeepSeek 突然持续 503。正确的做法不是给用户报错，而是自动切到备用的通义——因为「阿莫西林的常见不良反应」这种问题，哪家都能答。但如果错误是 402 余额不足，切到通义也救不了「DeepSeek 没充值」这件事，反而该停下手头的批量任务，先告警。

---

### 归一化的两层设计

把上面的四类差异收敛掉，靠的是两层设计，它们的可靠性不同：

- **Adapter（形状层）**：`ChatProvider.chat()` 返回统一的 `ChatResult` / `AsyncIterable<Delta>`。这层能 100% 归一化——成功响应的形状是确定的。
- **Error（失败层）**：`classifyError()` 把各家错误映射成四分类。这层只能近似，因为原文信息不等价。

一句话：**形状可以归一化，语义只能约定。**

```typescript
// 归一化后的统一结果（形状层，100% 可收敛）
interface ChatResult {
  content: string
  usage: { prompt: number; completion: number; cached?: number }
  finishReason: string
  raw: unknown          // 原始响应留一份，排查时能回溯
}

// 错误分类（失败层，只能近似）
type ErrorCategory = 'retryable' | 'terminal' | 'rate_limited' | 'auth'
```

注意 `raw` 这个字段——归一化不等于扔掉原文。生产里排查「为什么这次返回的 finishReason 是 unknown」，靠的就是把 `raw` 存下来。归一化是为了**用**，保留原文是为了**查**。

---

### 降级链的三个设计问题

有了错误分类，降级链才有设计依据。三个问题依次是：

**顺序**：按「成本 × 能力」排。阶段一备忘录的结论是 Flash 打底 + Pro 兜底——便宜的先上，能力强的殿后。反过来把最贵的放最前面，降级链就成了「烧钱链」。

**次数**：每层最多重试 1 次，整条链最多走 3 家。这是个反直觉的约束——很多人以为「多试几家更稳」，但一次故障如果每层都重试 3 次、链上排 5 家，一个请求就可能放大成 15 次调用。降级链的使命是「不扩散」，不是「更努力」。

**状态**：连续失败 N 次把一家踢出链——这是熔断的雏形，本篇只埋下这个种子，完整实现在 07 篇展开。

---

### 双维路由：和降级链叠加，不互斥

降级链回答「失败了怎么办」，路由回答「成功时该找谁」。这是两件事：

- **按复杂度路由**：简单问题走小模型（省成本），复杂问题走大模型（保质量）
- **按可用性路由**：把已经限流 / 熔断 / 被踢出链的 provider 先过滤掉

两者叠加使用，但决策顺序有讲究：**先可用性过滤，再复杂度分流**。

为什么不能反？如果先按复杂度分流，把一个「复杂问题」分给了大模型，结果大模型恰好正在限流——你只能用降级链去补救。而先做可用性过滤，是「在还活着的 provider 里挑最合适的」，省掉的是无谓的失败重试。可用性过滤是**前提**，复杂度分流是**优化**。

> 💬 **面试官**：模型路由有哪两个维度？它们的决策顺序为什么不能反？
>
> ✅ **标准答案**：两个维度是按复杂度路由（省钱）和按可用性路由（保稳定）。顺序必须先可用性过滤、再复杂度分流——先排除已经限流或熔断的 provider，再在存活的里面按任务难度挑档位。反过来的话，复杂度分流可能会分给一个已经不可用的 provider，等于先做了一次注定失败的决策，再靠降级链补救。
>
> 🎁 **加分答案**：把这两个维度说成「漏斗」比说成「两个开关」更准确。可用性过滤是硬约束（不可用的必须划掉），复杂度分流是软优化（分错只是多花钱或多花延迟）。所以它们的错误代价不对称：可用性判断错了是「请求打不出去」，复杂度判断错了是「多花点钱」——一个要严格，一个可以粗糙。

---

## 🧪 动手实验：一次真实调用，看清「发一次请求」

> **说明**：实验脚本已就绪 `labs/phase2-api/01-provider-router/`，只用 Node 内置的 `fetch`，不引任何 SDK。跑法在仓库根目录：先 `nvm use 22`，再 `pnpm --filter @medai/labs p2-router`。一次真实调用约 ¥0.01。

这个实验只做一件事：读 key → 发一次 DeepSeek 的 `chat/completions` → 把「一次调用到底长什么样」完整打印出来。它是阶段二的第一块地基——后面流式、结构化、Function Calling 全都建在这个「能发请求、能归一化」的底座上。

先把完整代码贴出来，不到 100 行，值得从头读到尾：

```typescript
// labs/phase2-api/01-provider-router/index.ts（节选）
import { loadEnv, printTable } from '../../shared/env.ts'

const BASE_URL = 'https://api.deepseek.com'
const MODEL = 'deepseek-chat'
const QUESTION = '阿莫西林胶囊的常见不良反应有哪些？请用三句话概括。'
```

归一化是这段代码的灵魂——把 DeepSeek 的原始响应收敛成统一结果，对应「归一化的两层设计」里的形状层：

```typescript
// 统一结果：形状层，100% 可收敛
interface ChatResult {
  content: string
  usage: { prompt: number; completion: number; cached?: number }
  finishReason: string
  raw: unknown          // 原始响应留一份，排查时能回溯
}

// DeepSeek 的 OpenAI 兼容响应（只声明用到的字段）
interface OpenAICompatResponse {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string | null }>
  usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } }
}
```

```typescript
function normalizeOpenAICompat(json: unknown): ChatResult {
  const r = json as OpenAICompatResponse
  const choice = r.choices?.[0]
  return {
    content: choice?.message?.content ?? '',
    usage: {
      prompt: r.usage?.prompt_tokens ?? 0,
      completion: r.usage?.completion_tokens ?? 0,
      cached: r.usage?.prompt_tokens_details?.cached_tokens,
    },
    finishReason: choice?.finish_reason ?? 'unknown',
    raw: json,
  }
}
```

真正的网络调用只有一段，拆成三步看：

```typescript
async function main(): Promise<void> {
  const env = loadEnv()
  const apiKey = env['DEEPSEEK_API_KEY']
  if (!apiKey) {
    console.error('❌ 未配置 DEEPSEEK_API_KEY')
    process.exit(1)   // 缺 key 不抛栈，给中文指引
  }
```

```typescript
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`, // 👈 唯一用到 key 的地方
    },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: QUESTION }] }),
  })

  if (!res.ok) {
    console.error(`❌ 请求失败 ${res.status}：${await res.text()}`)
    process.exit(1)
  }
```

```typescript
  const json = (await res.json()) as unknown
  const result = normalizeOpenAICompat(json)
  console.log('📥 回复：')
  console.log(result.content.trim())
  // printTable 打印 usage.prompt / usage.completion / finishReason
  // （printTable 是 labs/shared 的共用工具，输出可直贴文章）
}

main().catch((err) => {
  console.error('❌ 实验失败：', err)
  process.exit(1)
})
```

对着代码看三件事，每一件都对应「深入」章的一类差异：

**① 请求侧：最小信封只有三个字段。** `model + messages`，`messages` 里是 `role + content`。key 不进请求体，进 header 的 `Authorization: Bearer`——这正是「差异一：请求结构」，system 提示在 OpenAI 兼容层就是放进 messages 的一种 role。

**② 响应侧：归一化的形状层。** `normalizeOpenAICompat()` 把 DeepSeek 的 `choices[0].message.content`、`prompt_tokens`、`completion_tokens`、`finish_reason` 映射成统一 `ChatResult`。注意 `raw: json`——归一化不等于扔掉原文，排查时能回溯（「差异二：响应结构」）。

**③ 失败侧：`if (!res.ok)` 是错误处理的入口。** 当前代码只做了最粗的一层——非 2xx 就打印状态码和错误体退出。真正要长出的是：把状态码 + 错误体喂给 `classifyError()`，得出 `retryable | terminal | rate_limited | auth` 四分类，再决定重试、降级、还是抛——这正是「差异四：错误类型」和降级链的地基。本篇把设计讲清，完整实现收口到 07 篇的 `packages/ai-sdk`。

跑一次，你会按顺序看到四样东西：请求体（脱敏，key 不在里面）、模型回复、token 用量、归一化后的 `ChatResult`。其中 token 用量是账单的计量单位——**你付费买的是 token 数，不是「答案」**。这一步跑通，阶段二的每篇实验都从它出发。

这个实验刻意留了两个空缺，也是阶段二后面的伏笔：只发了**非流式**（流式解析留 02 篇），只做了**最粗的错误处理**（分类和降级链的设计在本篇正文，代码留 07 篇）。

---

## 🚧 结论与边界

本篇压成一句话：

> **兼容的是字段名，不兼容的是失败方式和增量格式；降级链的价值不在「换一家」，在「知道哪些不该换」。**

四条推论：

- **多模型接入的本质是 Adapter**：把「N 种信封」收敛成「1 种内部格式」，把「N 种失败」收敛成「1 张分类表」。前者能 100% 归一化，后者只能近似。
- **错误二分法是地基**：判据「换一家会不会消失」。retryable / rate_limited 才值得降级，terminal / auth 直接抛——降级只是多烧一次钱。
- **降级链要约束次数**：每层最多重试 1 次、整条链最多 3 家，防止一次故障放大成 9 倍请求。
- **双维路由先可用性、后复杂度**：可用性过滤是硬约束，复杂度分流是软优化，顺序不能反。

有意识地留到后面三件事：

- **熔断器完整实现、死信队列、背压** → 07 篇（本篇「连续失败踢出链」是它的雏形）
- **「一次调用里放什么内容、按什么顺序放」属于上下文工程** → 阶段三（本篇只讲「同一份内容怎么装进不同的信封」）
- **限流与预算告警的业务侧** → 阶段九

到这里，阶段一第 04 篇承诺的「选型落地成可切换的代码」，迈出了第一步——用 Adapter 把一次调用归一化成统一的 `ChatResult`；路由与降级链的设计在本篇正文讲清，完整实现收口到 07 篇的 `packages/ai-sdk`。

---

## 🎤 面试追问链

单个问题答对只能拿及格分。真正的区分度在追问。

**追问一：「OpenAI 兼容接口」到底兼容了什么、没兼容什么？**

兼容的是最外层的字段名和路由——`/chat/completions` 这个端点、`messages` 数组、`choices[0].message.content` 这些取法。没兼容的是三样：失败语义（错误码含义各家不同）、流式增量格式（Anthropic 原生是事件流不是 delta 流）、以及能力边界（DeepSeek 兼容接口但没 embedding）。这题基本能筛掉只会调一家的人——因为只有真接了多家，才会发现「兼容」两个字打的是折扣。

**追问二：你会怎么设计一个支持多家模型的接口层？接口里放什么、不放什么？**

接口只放「所有模型都有的最小公共能力」：`chat()` 收发统一 `ChatResult`。不放三样东西：厂商特有的字段（`system` 放法、`response_format` 档位差异留给 Adapter 内部消化）、业务语义（Prompt、Schema 是业务方定义的，不是 SDK 的）、以及并非人人具备的能力（embedding 必须拆出去，否则逼 DeepSeek 实现一个假 embed——这是接口隔离原则违例）。

**追问三：你的降级链会重试哪些错误？为什么 401 不该重试？**

见「深入」章的完整答案。追问时会往深挖一层：如果两家 provider 挂在同一个账户下怎么办——答案是降级链的粒度要精确到「账户」而非「厂商」。

**追问四：模型路由有两个维度，决策顺序为什么不能反？**

见「深入」章。加分点是把它说成漏斗：可用性过滤是硬约束（不可用必须划掉），复杂度分流是软优化（分错只是多花钱），错误代价不对称决定了一个要严格、一个可以粗糙。

---

## 💡 一张图总结

| 知识点 | 一句话解释 | 面试频率 |
|---|---|---|
| 四类差异 | 请求 / 响应 / 流式 / 错误，前三类能归一化，错误只能近似 | 高 |
| Adapter 两层 | 形状层 100% 收敛，失败层只能约定 | 极高 |
| 错误二分法 | 「换一家会不会消失」是降级判据 | 极高 |
| 7 错误码 | 400/401/402/422 不降级，429/500/503 重试降级 | 高 |
| 降级链三问 | 顺序按成本能力排，次数每层 1 次链 3 家，状态失败踢出 | 高 |
| 双维路由 | 按复杂度省钱 + 按可用性保稳定，先可用性后复杂度 | 高 |
| OpenAI 兼容真相 | 兼容最外层字段名，不兼容失败语义与流式增量 | 极高 |

---

## 📝 留个问题

给你一个真实场景，判断该降级还是该抛：

你的网关链是 DeepSeek → 通义 → 某开源自部署。凌晨两点，DeepSeek 返回 429，通义返回 429，自部署返回 500。

- 三家的错误分别该怎么处置？
- 这时候该「继续重试」还是「先停手告警」？判据是什么？
- 如果自部署返回的是 401，你的结论会变吗？

提示：不是「哪家还能用」的问题，是「这些错误换成别家会不会消失」的问题——以及，当一个错误同时打穿了三家，它可能根本不是模型侧的问题。

---

## 📚 参考来源

**① 本篇配图**

- 四块地基依赖图：由实验侧 ECharts 渲染生成（中文图注见正文）

**② 官方文档与错误码口径（2026-11-02 核实）**

- DeepSeek — API 文档与错误码表：搜索关键词「DeepSeek API docs 错误码」
- Anthropic — Messages API 与 Streaming（`content_block_delta`）：搜索关键词「Anthropic Messages API streaming」
- OpenAI — Chat Completions / Responses API / Batch API：搜索关键词「OpenAI Responses API」

**③ 本项目实验代码**

- 实验目录：`labs/phase2-api/01-provider-router/`（一次真实调用 + 归一化，只用 Node 内置 `fetch`）
- 共用工具：`labs/shared/env.ts`（`loadEnv` / `requireKey` / `printBudget` / `printTable`，阶段一沿用至今）
- 阶段二大纲：`docs/roadmap/ai-phase-02-api-foundation-outline.md`

---

> 🔖 这是「AI 工程」系列 · 阶段二「应用底座」第 1 篇。上一篇：《模型图谱与选型：把成本算清楚》（阶段一收官）；下一篇预告：《SSE 服务端：流式不是「更快返回」，是「更早开始」》
