# Function Calling：模型只写调用单，不执行（面试收藏级）

> 面试官问：「Function Calling 是模型在调用你的函数吗？」这题答错，基本就废了——因为它是后面所有 Agent 安全问题的根。一句话先说结论：模型从头到尾没有调用任何函数，它只是「写了一张调用单」。

---

## 🎯 这篇文章解决什么问题

上一篇讲结构化输出：让模型的输出变成能被机器校验、能入库的 JSON。它约束的是「数据」的形状。这一篇换一条线，讲 Function Calling：让模型能「提出要调一个动作」。它约束的是「动作」的形状。

很多人第一次用 Function Calling 都会有个误判：模型「调用」了工具。于是当模型答出「阿莫西林库存 120 盒」而数据库里根本没有这条记录时，会本能地去查「模型是不是调错接口了」。真相是：**模型没有调任何接口**。它只返回了一段结构化文本，说「我想调 `check_stock`，参数是 `{drugId: 'AMX-500'}`」。真正去查库、去执行的是你的代码。

把这个边界搞混，代价直接对到后面的阶段五：Agent 的所有安全问题——间接提示注入、越权操作、幻觉执行——都源于「模型能说，但不能做」这条线被抹平。所以这一篇先把这条线画清楚。

---

## 🔍 概念：模型不执行代码，它只输出一张「调用单」

先看一个现象。给模型一个工具 `check_stock(drugId)`，问「阿莫西林还有货吗」。模型回答得斩钉截铁：

```text
有货，库存 120 盒。
```

但你的数据库里根本没有这条记录。模型在撒谎吗？不准确。它是在「编」——因为它压根没有查库的能力，它只能按照「一个库存查询回答应该长什么样」来生成文本。如果它训练数据里见过「库存 120」这种写法，它就照着写了一个 120。

直觉会说「它不是调用了工具吗」——**没有**。它返回的其实是这样一段结构：

```json
{ "name": "check_stock", "arguments": "{\"drugId\": \"AMX-500\"}" }
```

这段东西的学名叫 `tool_calls`。它是一份**结构化意图**：模型在告诉你「我想查一下 AMX-500 的库存」。执行不执行、怎么执行、执行结果是什么，全在代码手里。如果那段代码写的是「查不到就返回 120」，模型也会照实念出 120。

> 💬 **面试官**：Function Calling 是模型在调用你的函数吗？
> ✅ **标准答案**：不是。模型只输出结构化的 `tool_calls`——函数名加参数的 JSON，这是纯文本、无副作用。真正执行函数、产生副作用的是你的代码。
> 🎁 **加分答案**：正因为执行权在代码，中间那一步才是你能插入一切安全措施的地方：参数校验、权限检查、只读/写操作分界，都在模型够不到的那一步完成。

---

## ⚙️ 一次完整往返的五步骤

![一次 tool call 的五步骤责任划分：蓝色节点是模型负责的两步（写调用单、生成回答），橙色节点是你的代码负责的三步（发工具定义、校验并执行、结果回传）](https://jianda-cmsstatic.oss-cn-shenzhen.aliyuncs.com/assets/charts/202611/1794296980952_yq1kc2gjl2.png)

这张图要看见的是：五个节点里，模型只占两个——第 ② 步写调用单、第 ⑤ 步生成回答，都是「生成文本」。真正做事的三步全是你的代码。把一次 tool call 拆开，是五步。这张表是本篇的核心，责任划分就是全部考点：

| 步骤 | 谁做的 | 做什么 |
|---|---|---|
| 1 | 你的代码 | 把工具定义（name / description / parameters 的 JSON Schema）发给模型 |
| 2 | 模型 | 输出 `tool_calls`：函数名 + 参数（纯文本，无副作用） |
| 3 | 你的代码 | 校验参数 → 检查权限 → 执行真实函数 |
| 4 | 你的代码 | 把结果作为 `role: 'tool'` 的消息回传 |
| 5 | 模型 | 根据结果生成最终回答 |

五个步骤里，模型只占了第 2 步和第 5 步，而且都是「生成文本」。真正做事的三步（1、3、4）全是你的代码。这张表背后有四个关键认知。

**关键认知一：`tool_calls` 是结构化意图，不是执行。** 第 2 步结束时模型就停了，`finish_reason` 是 `tool_calls`，它在等你的代码。此时没有任何函数被调用、没有任何网络请求发生。第 3 步是你唯一能拦下一切的地方。

**关键认知二：工具描述就是给模型的 Prompt。** `description` 这个字段决定了模型「什么时候该调、什么时候不该调」。写「查询药品库存」和写「查询指定 drugId 的实时库存，drugId 必须是药库中已存在的编号」，后者的调用准确率高一个档——因为后者给了模型判断的边界。这一篇的实验 C 会专门验证这个。

**关键认知三：参数会幻觉。** 模型会编一个不存在的 `drugId`。`arguments` 是模型自己生成的 JSON 字符串，官方文档明确提示「模型不总是生成合法 JSON」。所以必须在第 3 步校验，校验失败就回传一条错误消息让模型自己纠正——这是 Agent 自我修正的雏形。这一篇的实验 B 会看到它从「自由发挥」变成「知道自己不知道」。

**关键认知四：描述写太宽会误触发。** 如果 `check_stock` 的描述写成「查询药品信息」，那「阿莫西林是什么药」这种根本不需要查库的问题，也会把工具触发起来。

> 💬 **面试官**：一次 tool call 的完整流程有哪几步？哪一步是你能插入安全检查的？
> ✅ **标准答案**：五步——发工具定义、模型输出 tool_calls、代码校验并执行、结果回传、模型作答。安全检查插在第 3 步（执行前）。
> 🎁 **加分答案**：第 3 步里还能再分层——先过参数校验，再过权限检查，最后才执行；只读操作可以自动执行，写操作（下单、改处方）必须人机确认。

### 只读 vs 写操作的分界

这是为后面埋的一条线。工具分两类：

- **只读工具**（查库存、查说明书）：可以自动执行，错了代价小、可重试。
- **写操作**（下单、改处方）：必须人机确认，机器没资格替人做有后果的决定。

这条规则在阶段五会展开成 Human-in-the-Loop。现在只需要记住：**分界发生在你的代码里，不是模型里**——模型根本不知道「下单」比「查库存」危险。

### 为什么这不是 Agent

本篇是**单次**往返：一问、一调、一答，结束。Agent 是**循环**：模型自己决定「还要不要再调一个工具」「什么时候该停」。那个循环、终止条件、ReAct 规划，全部是阶段五的主题。

一句话收口：**Function Calling 是 Agent 的器官，不是 Agent 本身。** 很多人把「接了个工具调用」就当成了「做了个 Agent」，这个差距在面试里一问就穿。

🔧 **真实场景**：用药咨询是最典型的只读工具场景。用户问「阿莫西林和布洛芬能一起吃吗」，系统调一个 `check_drug_interaction` 工具查相互作用库，把结果回给模型组织成人话。这一步如果改成「模型直接背药物相互作用知识」，就会背出库里没有的、过时的、甚至错误的结论。工具的边界，就是「数据」和「模型的嘴」之间的那堵墙。

---

## 🧪 动手实验

实验目录是 `labs/phase2-api/05-tool-call/`，三个文件：

- `drug-db.ts`：本地 mock 药品库，12 个已知药名 + 10 条相互作用规则。刻意与工具定义分离存放，方便后面搬进 SDK。
- `tools.ts`：工具定义（发给模型的 JSON Schema）+ 执行器 + Zod 参数校验。
- `index.ts`：主脚本，三个实验。

跑法是仓库根目录执行 `pnpm --filter @medai/labs p2-tools`，全程 8 次真实调用，预估花费约 ¥0.008。

### 药品库：模型够不到的那份数据

`drug-db.ts` 只存数据，不连任何真实数据库。它和工具定义分开放，是因为 07 篇要把执行器搬进 SDK，这份数据要能原样挪走：

```typescript
// labs/phase2-api/05-tool-call/drug-db.ts（节选：药名与查库）
export const DRUG_NAMES = [
  '阿莫西林', '布洛芬', '甲硝唑', '华法林', '二甲双胍', '辛伐他汀',
  '奥美拉唑', '左氧氟沙星', '氯吡格雷', '阿司匹林', '苯妥英钠', '地高辛',
] as const

export function lookupInteraction(drugA: string, drugB: string): string {
  const a = RULES.find((r) => (r.drugA === drugA && r.drugB === drugB) || (r.drugA === drugB && r.drugB === drugA))
  if (!a) return `暂无数据：未收录「${drugA}」与「${drugB}」的相互作用记录`
  return `${a.level}：${a.note}`
}
```

注意 `lookupInteraction` 的返回措辞：它返回的是「数据库里没有记录」，不是「没有相互作用」。实验 B 里模型正是把这句话曲解了——这个措辞的差别是整场实验的引子。

`RULES` 是 10 条相互作用规则（示例数据，不作用药依据），格式 `{ drugA, drugB, level, note }`，其中 `level` 是「禁止联用 / 慎用 / 注意 / 安全」四档。模型永远够不到这个文件——它只能「说想查什么」，真正读库的是你的代码。

### 工具定义：一张写给模型的说明书

工具定义就是第 1 步发出去的东西。它不包含任何执行逻辑，只是 JSON Schema：

```typescript
// labs/phase2-api/05-tool-call/tools.ts（节选：工具定义）
export const TOOL_DEFINITION = {
  type: 'function' as const,
  function: {
    name: 'check_drug_interaction',
    description: '查询两种处方药之间是否存在相互作用。仅当用户明确问「某药和某药能否一起吃」时才调用；药名必须是已知的通用名。',
    parameters: {
      type: 'object',
      properties: {
        drugA: { type: 'string', description: '第一种药的通用名，必须是药库中已存在的编号' },
        drugB: { type: 'string', description: '第二种药的通用名，必须是药库中已存在的编号' },
      },
      required: ['drugA', 'drugB'],
    },
  },
}
```

注意 `description` 里那两句话——「仅当明确问能否一起吃时才调用」「药名必须是已知的」——它们就是写给模型的约束。后面实验 C 会拿掉它们看后果。

工具定义怎么进请求体？调用入口长这样。注意 `tools` 只是请求里的一个字段，和 `messages` 平级：

```typescript
// labs/phase2-api/05-tool-call/index.ts（节选：调用入口）
async function chat(messages: Msg[], toolDef: unknown): Promise<{ message: Msg; finishReason: string }> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: [toolDef], // 👈 工具定义放这里，模型据此决定要不要写调用单
      thinking: { type: 'disabled' },
      temperature: 0,
    }),
  })
  if (!res.ok) throw new Error(`上游 ${res.status}：${await res.text()}`)
  const json = (await res.json()) as { choices: Array<{ message: Msg; finish_reason: string }> }
  return { message: json.choices[0].message, finishReason: json.choices[0].finish_reason }
}
```

```typescript
// labs/phase2-api/05-tool-call/index.ts（节选：消息结构）
// 📚 知识点：tool_calls 和 content 是「或」的关系——
// 模型要么写调用单（content 为 null、finish_reason='tool_calls'），
// 要么直接说话（content 有值、finish_reason='stop'）。这是判断「它停了还是没停」的唯一依据。
interface Msg {
  role: 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}
```

执行器和它之间隔着一条清晰的线。工具定义是「说明书」，执行器是「真正的函数」，模型永远够不到后者：

```typescript
// labs/phase2-api/05-tool-call/tools.ts（节选：执行器）
export function executeTool(rawArgs: string): { ok: boolean; result: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawArgs) // 👈 arguments 是字符串，必须先 parse（第一个坑）
  } catch {
    return { ok: false, result: `参数不是合法 JSON，请重新输出：${rawArgs}` }
  }
  const checked = InteractionArgsSchema.safeParse(parsed)
  if (!checked.success) {
    return { ok: false, result: `参数校验失败。已知药名：${DRUG_NAMES.join('、')}。请换用其中的药名重新调用。` }
  }
  return { ok: true, result: lookupInteraction(checked.data.drugA, checked.data.drugB) }
}
```

参数 Schema 用 Zod 的 `enum` 把药名锁死在库内已知的那 12 个里：

```typescript
// labs/phase2-api/05-tool-call/tools.ts（节选：参数 Schema）
export const InteractionArgsSchema = z
  .object({
    drugA: z.enum(DRUG_NAMES), // 👈 药名必须是库里已知的，编一个就会被拦下
    drugB: z.enum(DRUG_NAMES),
  })
  .strict()
```

### 实验 A：一次完整往返，逐帧看五步

问「阿莫西林能和布洛芬一起吃吗」。下面是脚本打印出来的真实报文（2026-11-10 实测，DeepSeek）。

第 ② 步，模型返回的 `tool_calls`：

```json
{
  "index": 0,
  "id": "call_00_Xmw2hUBzmaKZk47AIFEv9102",
  "type": "function",
  "function": {
    "name": "check_drug_interaction",
    "arguments": "{\"drugA\": \"阿莫西林\", \"drugB\": \"布洛芬\"}"
  }
}
```

三个要点都在这段里：

- **`finish_reason` 是 `tool_calls`**：模型停了，等你的代码。
- **`arguments` 是字符串**：`"{\"drugA\": ...}"` 是转义后的字符串，不是对象，要自己 `JSON.parse`。
- **此刻零副作用**：从这段 JSON 到「真正查库」，中间隔着你的执行器。

第 ③ 步，代码执行，打印出 `arguments` 的类型是 `string`，执行结果：

```text
③ 你的代码执行。注意 arguments 的类型是 string（字符串，要自己 parse）：
   执行结果 → 安全：无明确相互作用，但两者都可能刺激胃肠道，联用建议随餐服用
```

第 ④ 步回传的消息，`tool_call_id` 对上第 ② 步的 `id`：

```json
{ "role": "tool", "tool_call_id": "call_00_Xmw2hUBzmaKZk47AIFEv9102", "content": "安全：无明确相互作用，但两者都可能刺激胃肠道，联用建议随餐服用" }
```

第 ⑤ 步，模型把这一句展开成一段完整的回答（节选）：

```text
⑤ 模型的最终回答：
   查询结果：阿莫西林和布洛芬之间没有明确的相互作用，可以一起服用，但需要注意：
   - 两者都可能刺激胃肠道，建议随餐或餐后服用……
```

五步走完，责任边界一目了然：模型只写了调用单（第 2 步）和念了结果（第 5 步），中间的查库、校验、回传全是代码。

### 实验 B：参数幻觉——不校验 vs 校验

问「阿莫西林和头孢克肟能一起吃吗」。头孢克肟不在 mock 库的 12 个药名里，模型只能编参数。

**不校验版**：不过 Zod，直接拿模型给的参数查库，返回「暂无数据」，把这句话原样回传。模型给出的结论（节选）：

```text
[不校验] 模型据「暂无数据」得出的结论 →
药库中没有收录这两种药的相互作用记录，所以无法给出「能否同服」的确定结论。
不过有几点需要提醒你：两者属于同一类抗生素……存在交叉过敏风险……
```

这里要诚实地说：这次 DeepSeek 没有「自信地说可以一起吃」，它表现得很克制。但它做了一件更隐蔽的事——**它把「我的数据库里没有这条」翻译成了「没有相互作用记录」，然后用自己的药理学先验补了一整段**。这段分析本身可能对，可它不是来自你的数据，而是模型在「数据盲区」里的自由发挥。库没拦住它，是因为库的「暂无数据」这个信号太弱，弱到模型能继续发挥。

**校验版**：Zod 拦住不存在的药名，回传一条纠错消息。模型收到后（节选）：

```text
[校验] 模型收到纠错消息后的回应 →
我查了一下，但头孢克肟不在我的药库中，所以无法给出这两种药相互作用的查询结果。
如果你愿意，也可以告诉我你手头还有哪些药（比如布洛芬、左氧氟沙星等在我的药库里），我可以帮你查它们之间的相互作用。
```

两句对比就看清了差距：不校验时，模型在盲区里自由发挥；校验后，模型明确知道「头孢克肟不在库」，并且主动把边界说出来。**校验不是让模型更聪明，是让它知道自己不知道。** 这就是 Agent 自我修正的雏形。

### 实验 C：工具描述宽窄对照

问「阿莫西林和布洛芬各自的用法用量是什么」——这不是问相互作用。分别用宽窄两种描述跑：

```text
[宽描述「查询药品信息」]          触发工具：是（误触发）
[窄描述「仅相互作用时调用」]      触发工具：否（直接回答）
```

宽描述下，模型把「用法用量」也当成「查询药品信息」，误触发了 `check_drug_interaction`；窄描述下，模型直接回答。工具描述的每个字都是发给模型的 Prompt，写太宽，误触发率就上来了。

---

## 🚧 总结与边界

这一篇闭合了「动作」这一块：Function Calling 是结构化输出的第二形态——04 篇约束**数据**的形状，05 篇约束**动作**的形状。核心只有一句：**模型能说的和能做的之间，隔着你的一个函数，那个函数就是全部安全边界。**

要清楚我们没做什么、留到后面：

- **循环与终止**：让模型自己决定「调几次、调哪个、何时停」，是阶段五的 ReAct 循环。
- **人机确认**：写操作的前置审批，是阶段五的 Human-in-the-Loop。
- **工具结果里的恶意指令**：间接 Prompt Injection，是阶段九的安全主题。
- **把工具做成独立服务**：MCP，是阶段五的事。

还有一层与本阶段代码的关系：这一篇的执行器会在 07 篇被并发调度，也会在 07 篇被搬进 `packages/ai-sdk`。所以现在把 mock 库和工具定义分开放，就是为那天做准备。

---

## 🎤 面试追问链

**1. Function Calling 是模型在调用函数吗？**
✅ 不是。模型只输出结构化的 `tool_calls`（函数名 + 参数的 JSON 字符串），这是纯文本、无副作用。执行是代码的事。
🎁 追问会往「那为什么叫 Function Calling」走——名字是历史包袱，准确说法是「工具调用意图的生成」。

**2. 一次 tool call 的完整流程有哪几步？哪一步能插入安全检查？**
✅ 五步：发工具定义 → 模型输出 tool_calls → 代码校验并执行 → 结果回传 → 模型作答。安全检查插在第 3 步。
🎁 追问会往「第 3 步内部还能怎么分层」走——参数校验、权限检查、只读/写分界，逐层把关。

**3. 模型返回了不存在的参数，你怎么处理？**
✅ 执行前用 Zod 校验；失败就回传一条错误消息，带上可用的合法值，让模型自己换参数重试。
🎁 追问会往「重试几次还错怎么办」走——设上限，超过就转人工或降级为直接回答。

**4. Function Calling 和 Agent 的区别是什么？什么时候 Function Calling 就够了？**
✅ Function Calling 是单次往返：一问、一调、一答。Agent 是循环：模型自己决定调几次、何时停。任务确定、一步到位的场景，Function Calling 就够了。
🎁 追问会往「怎么判断要不要上 Agent」走——看任务是否需要多步决策；为一步操作套一个循环，只会增加成本和不确定性。

---

## 💡 一张图总结

| 知识点 | 一句话解释 | 面试价值 |
|---|---|---|
| 本质 | 模型只写调用单（tool_calls），不执行 | 能说清「谁在调用」这个坑 |
| 五步骤 | 发定义 → 写单 → 代码执行 → 回传 → 作答 | 能指出第 3 步是安全插入点 |
| arguments | 是字符串，要 JSON.parse，且可能非法 | 能说出具体的工程坑 |
| 参数幻觉 | 必须执行前 Zod 校验，失败回传纠错消息 | 能讲「自我修正雏形」 |
| 描述即 Prompt | description 写太宽会误触发 | 能举宽窄对照的例子 |
| 与 Agent 的边界 | Function Calling 是器官，不是 Agent 本身 | 能说清循环归属阶段五 |

---

## 📝 留个问题

你的系统里有个「下单」工具。模型写了一张调用单要下单，你的代码在哪一步、用什么机制决定「这是只读查询可以自动执行，还是写操作必须人确认」？如果这一步的判断逻辑本身也要模型来帮你想，安全边界还成立吗？

---

## 📚 参考来源

**① 官方文档与规范（2026-11-10 实验核实）**

- DeepSeek API 文档 — Function Calling：搜索关键词「DeepSeek Function Calling tool_calls」
- Anthropic《Building Effective Agents》（工具调用与 Agent 边界的原始论述，阶段五精读）：搜索关键词「Anthropic Building Effective Agents」

**② 本项目实验代码**

- 实验目录：`labs/phase2-api/05-tool-call/`（`index.ts` 三个实验、`tools.ts` 工具定义与执行器、`drug-db.ts` mock 药品库、`README.md` 说明）
- 阶段二大纲：`docs/roadmap/ai-phase-02-api-foundation-outline.md`

---

> 🔖 这是「AI 工程」系列 · 阶段二「应用底座」第 5 篇。上一篇：《结构化输出：把正确性押在 Schema 上》；下一篇预告：《Embedding：把「意思相近」变成一道可以算的减法》
