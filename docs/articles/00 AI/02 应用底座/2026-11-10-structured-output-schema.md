# 结构化输出：把正确性押在 Schema 上（面试收藏级）

> 让模型「输出 JSON」很容易，让它输出「能直接入库的 JSON」很难。很多人以为加一句「只输出 JSON」就解决了，或者打开 `json_object` 就万事大吉——这一篇用 6 条真实处方样本拆开看，这两个想法都漏了关键一步。

---

## 🎯 这篇文章解决什么问题

上一篇讲的是「流」：模型一个字一个字吐，我们把它转成 SSE 推给浏览器。这一篇换一条线，从「流」转向「结构」——让模型的输出变成能被机器校验、能直接写进数据库的数据。

假设你要做一个处方录入功能：医生在输入框里写一句「阿莫西林胶囊 0.5g 每日三次 口服 连用7天」，系统要把它变成 `{drug, dose, frequency, durationDays, ...}` 交给下游。如果模型输出的 `frequency` 是「每日三次」这四个字，下游统计用药频次的那段代码就得自己做一次归一；如果它输出的是 `"tid"` 以外的任何东西，错误就会悄悄流进库里。

很多人对这件事有三个误判：

1. **加几句「只输出 JSON」就够了**：提示词只是请求，模型可以不听。
2. **开了 `json_object`，输出就是结构化的**：它只保证「括号配对」，字段名、枚举值、类型都不管。
3. **Schema 写对了，答案就对了**：Schema 管的是形状，管不了剂量是 0.5 还是 5。

三个误判的根子是同一个：**把「请求」当成了「合同」**。这一篇要做的，就是把正确性从「请求」里抽出来，押到 Schema 上，并且清楚知道 Schema 能押住什么、押不住什么。

---

## 🔍 概念：三档可靠性阶梯

结构化输出不是一个开关，是一条可靠性阶梯。从低到高大致三档：

| 档位 | 你怎么做 | 保证什么 | 不保证什么 |
|---|---|---|---|
| Prompt 约定 | 把字段写进提示词，要求只输出 JSON | 几乎什么都不保证 | 括号、字段名、枚举全靠模型自觉 |
| `json_object` | 请求里加 `response_format: {type: 'json_object'}` | 输出是合法 JSON | 字段名、枚举值、类型 |
| `json_schema` | 把完整 Schema 随请求发出，并开启 `strict` | 输出符合 Schema 的字段与类型 | 语义是否正确（剂量抄对没有） |

![三档可靠性阶梯示意图：Prompt 约定只是请求、json_object 保证合法 JSON、json_schema 保证字段与类型，每一档右侧标注其保证强度](https://jianda-cmsstatic.oss-cn-shenzhen.aliyuncs.com/assets/charts/202611/1794281784890_ymn7klmxrml.png)

这张阶梯图要看见的是：每往上一档，保证的东西变多，但没有哪一档保证「语义对」。

这里有一个前提很容易忽略：**支不支持 `json_schema`，是厂商的能力，不是 OpenAI 兼容协议的自动承诺**。同一段请求体，发给不同厂商可能得到完全不同的可靠性。

> 💬 **面试官**：`json_object` 和 `json_schema` 有什么本质区别？为什么前者不够用？
> ✅ **标准答案**：`json_object` 只约束输出是合法 JSON（括号配对），字段名、枚举、类型都由模型自觉。`json_schema` 把 Schema 随请求发给服务端，由服务端约束输出的字段与类型。前者解决「能不能解析」，后者解决「字段对不对」。
> 🎁 **加分答案**：两者都无法保证语义。剂量 `5` 与 `0.5` 在 Schema 看来都是合法数字，这一层必须靠业务规则和人工复核补。

---

## ⚙️ 深入：每一档到底怎么工作

### 路径一：Prompt 约定

最朴素的做法是把字段说明写进提示词。本篇实验里的字段说明就是下面这段（来自 `schema.ts`），调用时拼在「请把下面这条处方抽取为 JSON 对象……」这句话后面：

```typescript
// labs/phase2-api/04-json-schema/schema.ts（节选）
/** 字段清单（给 Prompt 约定档用）：把结构写进提示词，但这只是请求 */
export const FIELD_HINT = `字段：
- drug：药名（字符串）
- dose：剂量数值（数字，不要带单位）
- doseUnit：单位，只能是 mg / g / ml
- frequency：频次，只能是 qd(每日一次) / bid(每日两次) / tid(每日三次) / qid(每日四次) / prn(必要时)
- durationDays：疗程天数（整数）
- route：给药途径，只能是 口服 / 外用 / 注射 / 舌下含服`
```

这一档可靠性最低，但成本最低，适合做原型。它的问题是：你写的每一条约束，模型都可能按自己的理解执行。

### 路径二：json_object 与 DeepSeek 的三个坑

打开 `json_object` 很简单：

```typescript
// labs/phase2-api/04-json-schema/index.ts（节选）
const body = {
  model: 'deepseek-chat',
  messages: [{ role: 'user', content: prompt }],
  response_format: { type: 'json_object' }, // 👈 只约束「是合法 JSON」
}
```

但在 DeepSeek 上，它有三个必须知道的坑（均在 2026-11-10 实验里核实）：

1. **提示词必须含 `json` 字样**。缺了它，接口直接返回 400：`Prompt must contain the word 'json' in some form to use 'response_format' of type 'json_object'`。
2. **输出可能是空的，但 `finish_reason` 仍然是 `stop`**。这是 `json_object` 的一个已知行为：不合 JSON 的部分会被替换成空白，所以你不能只看 `finish_reason` 判断成功。
3. **`max_tokens` 截断会留下半个 JSON**。输出被截断时，`JSON.parse` 直接抛错，必须单独处理。

第一个坑的代价最低，但它说明一件事：`json_object` 不是「自动结构化」，是需要你按它的规则配合的一个模式。

### 路径三：json_schema 与 strict

`json_schema` 才是真正把结构交给服务端约束的那一档：

```typescript
// 示意代码：本篇实验未实测此档，PrescriptionJsonSchema 为 Zod 转出的 JSON Schema，未在实验中调用
// 📚 知识点：strict 打开后，服务端按 Schema 约束字段与类型
const body = {
  response_format: {
    type: 'json_schema',
    json_schema: { name: 'prescription', strict: true, schema: PrescriptionJsonSchema },
  },
}
```

这一档在本篇没有实测。DeepSeek 目前不提供 `json_schema`，而通义档因为我这次没有配置对应的 key，未能核实字段结构。文章里我只陈述它的设计位置，不对它的实际效果下结论。

这里有一个值得记住的认知：**同一段业务代码换一家模型，可靠性可能掉两档。结构化输出不是一个配置项，而是选型维度。**

### 永远过 Zod：三段式兜底

不管你用哪一档，最后一道关都应该是本地的 Schema 校验。本篇的 Zod 定义：

```typescript
// labs/phase2-api/04-json-schema/schema.ts（节选）
export const PrescriptionSchema = z
  .object({
    drug: z.string().min(1), // 药名，原文保留即可
    dose: z.number().positive(), // 剂量必须是正数；字符串 "0.5" 会被拒绝
    doseUnit: z.enum(DOSE_UNITS),
    frequency: z.enum(FREQUENCIES), // 👈 本篇最容易漂移的字段
    durationDays: z.number().int().positive(),
    route: z.enum(ROUTES),
  })
  .strict() // 👈 多出来的字段（比如模型自作主张加的 type）直接拒绝
```

我们的实验里，这一层拦下了三条样本。它们的原始输出如下：

```text
// 实验 A 中未通过 Zod 的原始输出（节选，DeepSeek json_object 档）
S2 {"drug":"布洛芬缓释片","dose":0.3,"doseUnit":"g","frequency":"prn","durationDays":0,"route":"口服"}
   → durationDays: Too small: expected number to be >0
S4 {"drug":"盐酸氨溴索口服液","dose":15,"doseUnit":"ml","frequency":"tid","durationDays":null,"route":"口服"}
   → durationDays: Invalid input: expected number, received null
```

S2 和 S4 的原文都没有写疗程。模型对「缺失」的处理却是编造：一个写成 `0`，一个写成 `null`。Zod 拦住了它们，这正是它的价值。

但 Zod 也有盲区。下面这条输出就能通过：

```text
// 实验 B：结构合法、语义错误
{"drug":"阿莫西林胶囊","dose":5,"doseUnit":"g","frequency":"qid","durationDays":7,"route":"口服"}
→ Zod 结果：✅ 放行
```

剂量 `5` 应为 `0.5`，频次 `qid` 应为 `tid`。两者都是合法值，Zod 分辨不出。这是本篇最重要的一个边界：**Zod 只保证形状，语义要靠别的层补**。

> 💬 **面试官**：既然有 `json_schema` 约束，为什么还要再用 Zod 校验一遍？
> ✅ **标准答案**：`json_schema` 约束的是服务端返回的结构，但你的代码不该无条件信任上游；另外换厂商、换模型、降级到 `json_object` 时，约束强度会变。本地 Zod 是唯一不随厂商变化的那一层。
> 🎁 **加分答案**：`json_schema` 管结构，Zod 管结构加类型加业务范围（如 `dose > 0`），两者职责不同，不能互相替代。

### Schema 设计原则，以及 Prompt 技巧的定位

设计 Schema 时有三条原则：

- **枚举优先于自由文本**：`frequency` 用 `enum` 而不是 `string`，下游才能统计。
- **缺失要有表达**：原文没写的字段，要么可选，要么明确允许缺失。否则模型会编一个值，就像 S2 的 `0`。
- **不要为了通过率放宽 Schema**：我们在实验中一度想放宽 `durationDays`，最后选择保留。拒绝是正确的，放宽只会把错误藏起来。

在这类抽取任务里，System Prompt、Few-shot、Chain-of-Thought 各有定位，但不要混用：

- **System Prompt**：定角色和总规则，比如「你是处方录入助手」。
- **Few-shot**：给 2 到 3 个示例，主要改善枚举归一（「每日三次」→ `tid`）。
- **CoT**：在这类简单抽取里收益很小，还会增加输出长度和 token 成本。我们实验 C 里开启思考模式，推理 token 从 0 涨到 44，但这条样本的结果没有变好。

🔧 **真实场景**：处方录入是这类能力最典型的落地场景。医生写的是口语化的「一天两次」，系统要的是 `bid`；前端表单要的是固定枚举。结构化输出把这两端接起来，而 Zod 决定哪些数据能进库。

---

## 🧪 动手实验

实验目录是 `labs/phase2-api/04-json-schema/`，三个文件分工很清楚：

- `schema.ts`：Zod 定义，也是字段的唯一来源。全文如下：

```typescript
// labs/phase2-api/04-json-schema/schema.ts（全文）
/**
 * 处方抽取的 Schema（Zod 定义）。
 *
 * 📚 知识点：为什么用 Zod 而不是只写一段提示词？
 * 提示词里写「字段有 drug、dose……」只是请求，模型可以不听。
 * Zod 是合同：parse 不通过就是不合格，无论模型输出得多像 JSON。
 * 本篇 DeepSeek 的 json_object 档只保证「合法 JSON」，结构与枚举全靠这里兜底。
 */

import { z } from 'zod'

/** 频次枚举：医嘱里的「每日三次」必须归一到 tid，否则下游无法统计 */
export const FREQUENCIES = ['qd', 'bid', 'tid', 'qid', 'prn'] as const
export const DOSE_UNITS = ['mg', 'g', 'ml'] as const
export const ROUTES = ['口服', '外用', '注射', '舌下含服'] as const

export const PrescriptionSchema = z
  .object({
    drug: z.string().min(1), // 药名，原文保留即可
    dose: z.number().positive(), // 剂量必须是正数；字符串 "0.5" 会被拒绝
    doseUnit: z.enum(DOSE_UNITS),
    frequency: z.enum(FREQUENCIES), // 👈 本篇最容易漂移的字段
    durationDays: z.number().int().positive(),
    route: z.enum(ROUTES),
  })
  .strict() // 👈 多出来的字段（比如模型自作主张加的 type）直接拒绝

export type Prescription = z.infer<typeof PrescriptionSchema>

/** 字段清单（给 Prompt 约定档用）：把结构写进提示词，但这只是请求 */
export const FIELD_HINT = `字段：
- drug：药名（字符串）
- dose：剂量数值（数字，不要带单位）
- doseUnit：单位，只能是 mg / g / ml
- frequency：频次，只能是 qd(每日一次) / bid(每日两次) / tid(每日三次) / qid(每日四次) / prn(必要时)
- durationDays：疗程天数（整数）
- route：给药途径，只能是 口服 / 外用 / 注射 / 舌下含服`
```

- `samples.ts`：6 条处方样本，每条附人工标准答案，覆盖标准写法、「必要时」、中文频次、缺疗程、剂量在括号里、夹杂干扰信息六种难度。全文如下：

```typescript
// labs/phase2-api/04-json-schema/samples.ts（全文）
/**
 * 6 条处方样本，每条附一份人工标准答案（expected）。
 *
 * 📚 知识点：为什么标准答案要人写，不能让模型自己判？
 * 「让模型给自己打分」会把错误也打成对。实验里的对错必须由人定，
 * 这样「枚举漂移率」「字段缺失率」才是可信的数字。
 *
 * 每条样本刻意覆盖一种难度：
 *   1 标准写法 · 2 「必要时」 · 3 中文频次 · 4 缺疗程 · 5 剂量在括号里 · 6 夹杂干扰信息
 */

import type { Prescription } from './schema.ts'

export interface Sample {
  id: string
  /** 处方原文 */
  text: string
  /** 人工标准答案；值为 undefined 表示「原文没写，应当缺」 */
  expected: Partial<Record<keyof Prescription, unknown>> & { drug: string }
  /** 这条样本考什么，用于文章里解释 */
  focus: string
}

export const SAMPLES: Sample[] = [
  {
    id: 'S1',
    text: '阿莫西林胶囊 0.5g 每日三次 口服 连用7天',
    expected: { drug: '阿莫西林胶囊', dose: 0.5, doseUnit: 'g', frequency: 'tid', durationDays: 7, route: '口服' },
    focus: '标准写法：基线',
  },
  {
    id: 'S2',
    text: '布洛芬缓释片 0.3g 疼痛时口服，每次一片，必要时使用',
    expected: { drug: '布洛芬缓释片', dose: 0.3, doseUnit: 'g', frequency: 'prn', durationDays: undefined, route: '口服' },
    focus: '「必要时」→ prn：测枚举边界',
  },
  {
    id: 'S3',
    text: '头孢克肟分散片 0.1g，一天两次，口服，连服5天',
    expected: { drug: '头孢克肟分散片', dose: 0.1, doseUnit: 'g', frequency: 'bid', durationDays: 5, route: '口服' },
    focus: '中文频次「一天两次」→ bid：测归一能力',
  },
  {
    id: 'S4',
    text: '盐酸氨溴索口服液 15ml 每日三次 口服',
    expected: { drug: '盐酸氨溴索口服液', dose: 15, doseUnit: 'ml', frequency: 'tid', durationDays: undefined, route: '口服' },
    focus: '原文缺疗程：正确做法是缺失而非编造',
  },
  {
    id: 'S5',
    text: '左氧氟沙星片 0.25g(1粒) 每日一次 口服 共3天',
    expected: { drug: '左氧氟沙星片', dose: 0.25, doseUnit: 'g', frequency: 'qd', durationDays: 3, route: '口服' },
    focus: '剂量藏在括号里：测抽取位置是否正确',
  },
  {
    id: 'S6',
    text: '注意：患者对青霉素过敏。硝酸甘油片 0.5mg 舌下含服，每晚一次，疗程按需。饭后服用、忌酒。',
    expected: { drug: '硝酸甘油片', dose: 0.5, doseUnit: 'mg', frequency: 'qd', durationDays: undefined, route: '舌下含服' },
    focus: '干扰信息多：测是否把过敏史、忌酒当成字段',
  },
]
```

- `index.ts`：主脚本，依次跑实验 A、B、C。下面是调用入口与判定逻辑的真实代码：

```typescript
// labs/phase2-api/04-json-schema/index.ts（节选：调用入口）
async function chat(prompt: string, mode: Mode | 'none', thinking: boolean): Promise<ChatResult> {
  const body: Record<string, unknown> = {
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    thinking: { type: thinking ? 'enabled' : 'disabled' }, // 👈 实验 C 只改这一个开关
    temperature: 0,
    max_tokens: 400,
  }
  if (mode === 'json_object') body.response_format = { type: 'json_object' }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`上游 ${res.status}：${await res.text()}`)

  const json = (await res.json()) as {
    model: string
    choices: { message: { content: string | null }; finish_reason: string }[]
    usage: { total_tokens: number; completion_tokens_details?: { reasoning_tokens?: number } }
  }
  const choice = json.choices[0]
  return {
    content: choice.message.content ?? '',
    finishReason: choice.finish_reason,
    servedModel: json.model, // 👈 实际服务的模型名，可能与请求不同（本篇核实过：deepseek-chat → deepseek-flash）
    reasoningTokens: json.usage.completion_tokens_details?.reasoning_tokens ?? 0,
    totalTokens: json.usage.total_tokens,
  }
}
```

```typescript
// labs/phase2-api/04-json-schema/index.ts（节选：三层判定）
function judge(raw: string, sample: Sample): Verdict {
  let obj: unknown
  try {
    obj = JSON.parse(raw)
  } catch {
    return { parsed: false, schemaOk: false, missing: [], drift: ['(非 JSON)'], data: null }
  }

  const result = PrescriptionSchema.safeParse(obj)
  const loose = (obj ?? {}) as Record<string, unknown>
  const missing: string[] = []
  const drift: string[] = []

  for (const [key, want] of Object.entries(sample.expected)) {
    if (want === undefined) continue // 标准答案就是「缺」的字段不计
    const got = loose[key]
    if (got === undefined || got === null || got === '') {
      missing.push(key)
    } else if (got !== want) {
      drift.push(`${key}: ${String(got)}≠${String(want)}`)
    }
  }
  return { parsed: true, schemaOk: result.success, missing, drift, data: result.success ? result.data : null }
}
```

- 完整脚本里还包括实验 A 的循环、实验 B 的 `runB()` 与实验 C 的 `runC()`，见 `labs/phase2-api/04-json-schema/index.ts`。

跑法是仓库根目录执行 `pnpm --filter @medai/labs p2-schema`。整次实验 14 次调用，预估花费约 ¥0.006。

### 实验 A：两档可靠性

同一批 6 条样本，分别用 Prompt 约定与 `json_object` 跑一遍，三个指标逐条判定：能否解析、能否通过 Zod、字段值是否与人工标准答案一致。

| 路径 | 能解析 JSON | 通过 Zod | 完全正确 | token 合计 |
|---|---|---|---|---|
| Prompt 约定 | 6/6（100%） | 3/6（50%） | 3/6（50%） | 1143 |
| json_object | 6/6（100%） | 3/6（50%） | 3/6（50%） | 1305 |

![两档可靠性对照柱状图：Prompt 约定与 json_object 两组的能解析率均为 100%，通过 Zod 与完全正确均为 50%](https://jianda-cmsstatic.oss-cn-shenzhen.aliyuncs.com/assets/charts/202611/1794281766485_xtgjgud314b.png)

这张图要看见的是：两档的「能解析」都是满的，而「通过」与「完全正确」都只有一半。

这个结果有一个反直觉的地方：**`json_object` 在这 6 条上没有比 Prompt 约定更好**。它保证的是「能解析」，而我们这次的失败不在那一层。失败发生在字段层：S2、S4、S6 的疗程缺失被编造，S6 的频次被判成了 `prn`。

这里要诚实地说一件事：实验 A 的数字只是一次运行的结果，样本只有 6 条，不能拿来当统计结论。它的价值是让你看到失败长什么样，而不是给出一个准确率。

### 实验 B：Zod 的语义盲区

这是一个人为构造的输出，结构完全合法，语义上却是错的。Zod 放行，它分辨不了剂量 5 与 0.5 的差别。

![Zod 结构判定与语义判定对比图：同一条错误输出，结构层通过，语义层不通过](https://jianda-cmsstatic.oss-cn-shenzhen.aliyuncs.com/assets/charts/202611/1794281774263_245ss9b4ous.png)

这张图要看见的是：结构层与语义层的判定结果不一致，这正是 Zod 的边界。

### 实验 C：思考模式对照

同一条样本 S1，只改一个开关，比较思考模式开与关：

```text
// labs/phase2-api/04-json-schema/index.ts 运行输出（节选）
思考模式  Zod 通过  推理 token  总 token  finish_reason
关闭      true      0           211      stop
开启      true      44          280      stop
```

两者都通过了 Zod，思考模式多花了 44 个推理 token，结果却没有变好。在这种简单抽取上，思考模式不是必需品。

实验里还有一条工程细节：**脚本默认显式关闭思考模式**。思考开启时 temperature 行为不同，如果不关，实验 A 的对比会被污染。

---

## 🚧 总结与边界

这一篇闭合了「结构」这一块的基础：三档阶梯、为什么 `json_object` 不够、Zod 为什么必须保留、Zod 管不到的语义该怎么补。

但要说清楚我们没做什么：

- **没测 `json_schema` 档**。它是三档里最强的一档，本篇只陈述设计位置。下一次要补它的实测，需要通义或其他支持该能力的厂商 key。
- **样本只有 6 条**。统计没有置信区间，数字只说明现象。
- **没有处理增量 JSON**。流式下边收边解析的问题，留给阶段六的流式专题。
- **没有处理 PDF 和表格等脏数据**。这些属于阶段四的 RAG 与文档解析。
- **没有量化「结构化成功率」**。这是阶段九的评估内容，需要成批样本与自动化评测。

下一篇 05 篇换一条线：Function Calling。如果说结构化输出解决的是「模型输出什么形状的数据」，Function Calling 解决的则是「模型能不能调用一个动作」。两者的区别，会是下一篇的起点。

---

## 🎤 面试追问链

**1. 为什么 `json_object` 不能替代 Schema 校验？**
✅ 它只保证括号配对，字段名、枚举、类型都不保证。
🎁 追问会往「那 `json_schema` 是不是就完全够了」走，答案是还不够，语义需要另外补。

**2. 模型返回的 `finish_reason` 是 `stop`，能说明输出是完整的吗？**
✅ 不能。`json_object` 下输出可能为空而 `finish_reason` 仍是 `stop`，必须解析后再判定。
🎁 追问会往「`max_tokens` 截断怎么处理」走，要区分截断与正常结束。

**3. 枚举字段模型老是输出中文「每日三次」，怎么办？**
✅ 首选在 Prompt 里给出明确的映射与 Few-shot 示例；仍然漏的，用 Zod 拦住，再决定是重试还是转人工。
🎁 追问会往「重试会不会让成本翻倍」走，需要设置重试上限。

**4. 你怎么判断一个结构化输出方案是好的？**
✅ 看三个指标：能解析率、通过 Zod 的比例、字段值与人工标准答案的一致率。三者要分开看，它们分别对应三层失败。
🎁 追问会往「样本量多大才够」走，这一篇的 6 条只说明现象，正式评估要成批样本。

---

## 💡 一张图总结

| 知识点 | 一句话解释 | 面试价值 |
|---|---|---|
| 三档阶梯 | Prompt 约定 < `json_object` < `json_schema`，保证强度逐档增加 | 能说清每档保证什么 |
| `json_object` 的坑 | 需含 `json` 字样；输出可能为空；截断留半个 JSON | 能说出具体的工程细节 |
| Zod 兜底 | 结构与类型可拦，语义拦不住 | 知道校验的边界在哪里 |

![结构化输出三层判定示意：能否解析、能否通过 Zod、字段是否与标准答案一致](https://jianda-cmsstatic.oss-cn-shenzhen.aliyuncs.com/assets/charts/202611/1794281776988_fehmttir8k.png)

---

## 📝 留个问题

如果你的系统里，剂量 `5` 与 `0.5` 都能通过 Schema，那你会在哪一层拦住「结构合法、剂量抄错」的输出？是靠规则引擎、二次模型核对，还是人工复核？三种方式的代价分别是什么？

---

## 📚 参考来源

**① 本篇配图**

- 三张图均由本篇实验数据渲染生成：两档可靠性对照（实验 A）、Zod 结构与语义判定对比（实验 B）、三档阶梯示意（概念章）。中文图注见正文。

**② 官方文档与规范（2026-11-10 实验核实）**

- DeepSeek API 文档 — JSON Output：搜索关键词「DeepSeek JSON Output response_format」
- Zod 文档：搜索关键词「Zod TypeScript schema validation」
- OpenAI 结构化输出说明（json_schema 与 strict）：搜索关键词「OpenAI Structured Outputs json_schema strict」

**③ 本项目实验代码**

- 实验目录：`labs/phase2-api/04-json-schema/`（`index.ts` 两档对照与 Zod 判定、`schema.ts` Zod 定义、`samples.ts` 6 条样本与标准答案、`README.md` 七段式说明）
- 阶段二大纲：`docs/roadmap/ai-phase-02-api-foundation-outline.md`

---

> 🔖 这是「AI 工程」系列 · 阶段二「应用底座」第 4 篇。上一篇：《前端接流式：接得上，更要接得住》；下一篇预告：《Function Calling：模型只写调用单，不执行》
