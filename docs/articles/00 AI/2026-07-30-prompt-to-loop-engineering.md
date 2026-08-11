# 从 Prompt Engineering 到 Loop Engineering：AI 工程师的四层进化

> 大多数 AI 应用开发者停在第一层，然后困惑于「为什么 AI 用着用着就不稳定了」。  
> 真正的 AI 工程能力，是一个四层架构的叠加体：**Prompt Engineering → Context Engineering → Harness Engineering → Loop Engineering**。  
> 每一层都建立在上一层之上，也揭示了上一层无法独立解决的问题。

---

## 🎯 这篇文章的目标

「会写 Prompt」是入门，不是天花板。

真正的 AI 工程能力，是一个四层架构：**Prompt Engineering → Context Engineering → Harness Engineering → Loop Engineering**。每一层都建立在上一层之上，也揭示了上一层无法解决的根本问题。

这篇文章从第一层讲到第四层，每层都给你：技术原理 + 关键工程决策 + 最佳实践。读完之后，你不只是「会用 AI」，而是能清晰理解每一层的能力边界，以及往上走需要跨越哪些认知门槛。

---

## ⚡ 第一层：Prompt Engineering——从零学会「问对问题」

### 什么是 Prompt Engineering

Prompt Engineering 是对**单次 LLM 调用输入文本**的优化艺术。你的目标很简单：给定一个问题，如何构造这个「问题」，让模型给出更准确的答案。

这是所有 AI 应用的起点，也是大多数教程停下来的地方。

### 三大核心技巧

**Zero-shot vs. Few-shot**

Zero-shot 是直接描述任务，Few-shot 是先给几个示例再提问。

```typescript
// Zero-shot：直接问
const zeroShot = `判断以下副作用的严重程度：
${sideEffectText}
输出：轻度 / 中度 / 重度`

// Few-shot：先给示例，再问
const fewShot = `判断药品副作用严重程度：
示例 1：头晕、轻微恶心 → 轻度
示例 2：持续呕吐、心律不齐 → 重度
示例 3：皮疹、瘙痒 → 中度
现在判断：${sideEffectText}`
```

Few-shot 通常显著优于 Zero-shot，原因不是「示例让模型更聪明」，而是示例明确了**输出格式和分类边界**，大幅压缩了模型的输出分布空间。

**Chain-of-Thought（CoT）**

让模型「一步一步思考」为什么有效？这不是玄学，而是 Transformer 架构的固有特性。

Transformer 是自回归模型：生成每个 token 时，前面所有 token 都会进入 attention 计算。当你用 CoT 强制模型先输出中间推理过程，这些推理 token 就变成了后续 token 的「草稿纸」——每个中间结论都被写入 KV Cache，参与最终答案的生成。

```typescript
// 不加 CoT（模型直接跳到结论，中间推理不可见，出错难以察觉）
`这个患者是否适合服用阿莫西林？患者信息：${patientInfo}`

// 加 CoT（强制展开推理链，每步都可被审查）
`请逐步分析患者是否适合服用阿莫西林：
1. 先列出阿莫西林的禁忌症
2. 对照患者信息逐一排查
3. 最后给出明确结论
患者信息：${patientInfo}`
```

Zero-shot CoT 更简单——在问题末尾加一句「Let's think step by step」（或「请逐步思考」）就能触发效果，这是 2022 年的一个惊人发现：不需要示例，这句话本身就能激活模型的推理模式。这也是为什么推理模型（o3/DeepSeek-R1）会主动生成大量思维链——scratchpad 本质上是 KV Cache 里的「工作记忆」，token 预算越充裕，CoT 越长，效果越好。

**Role Assignment（角色设定）**

系统 prompt 里的角色设定不是礼貌性说明，而是注意力机制的**知识域锚定**。「你是一位经验丰富的药剂师」会让模型在生成时，token 的注意力向药剂学相关知识的激活方向偏移。

这个效果是真实的，但有上限——角色设定只能激活模型已有的知识，不能让它「变聪明」。

### 格式控制：被低估的技巧

JSON 输出约束、XML 结构化标签、Markdown 分隔，这些看起来平平无奇，却是工程可靠性的关键。格式越严格，模型的自由度越低，幻觉越少，下游解析越稳定。

```typescript
// 用 XML 标签隔离不同来源的内容，减少模型「混淆」风险
const prompt = `
<system>你是医疗 AI 助手，仅基于提供的药品说明书回答问题。</system>
<drug_manual>${manualContent}</drug_manual>
<user_question>${userQuestion}</user_question>
请以 JSON 格式输出：{"answer": "...", "confidence": 0-1, "source": "..."}
`
```

现代 LLM API 已支持强制 JSON Schema 输出模式——这把格式约束从 prompt 文本层面提升到 **API 协议层面**，可靠性远高于「请输出 JSON」的 prompt 指令。只要 API 支持，就应该优先使用 Structured Output，而不是靠 prompt 约束。

### 深入：Self-Consistency 与推理可靠性

单次 CoT 的问题在于推理路径只有一条：一旦走偏，结论就跟着偏。**Self-Consistency**（2023）是对这个问题的直接回应——对同一个问题，用相同的 CoT prompt 并行生成 N 条独立推理路径（通过提高 temperature 让每次输出不同），然后对最终结论取多数投票。

```typescript
// Self-Consistency：多路推理 + 投票，提升高风险决策的可靠性
async function selfConsistency(prompt: string, n = 5) {
  const results = await Promise.all(
    Array.from({ length: n }, () =>
      llm.invoke(prompt, { temperature: 0.7 }) // 👈 高 temperature 产生推理多样性
    )
  )
  return majorityVote(results.map(extractConclusion))
}
```

Self-Consistency 在推理类任务上效果显著，但代价是 N 倍 token 消耗。实用策略：**只在高置信度要求的场景使用**（如医疗诊断辅助、合规检查），一般问答维持单次 CoT 即可。

**Tree of Thoughts（ToT）** 是 Self-Consistency 的进化——不只是并行多条完整路径，而是在推理过程中的每个分支点做多选，构成搜索树，适合需要规划的复杂问题（如多步骤诊疗路径推荐）。ToT 工程复杂度更高，目前更多停留在研究层面，但代表了 Prompt Engineering 可以触及的理论上限。

### Prompt Engineering 的天花板

Prompt Engineering 有一个根本局限：**它是静态的、无状态的**。

你精心设计的 prompt 每次调用都从零开始。它不知道用户上一次问了什么，不知道系统当前有哪些可用工具，不知道今天是什么日期，不知道这个用户已经是高血压患者。

它只是一段文本，然后等待一段输出。

这个局限催生了第二层。

---

## 🧠 第二层：Context Engineering——工程化整个「上下文窗口」

### 一次重要的重命名

2025 年，Andrej Karpathy 说过一句话：

> "The hot new skill is not 'prompt engineering' — it's context engineering. The delicate art of filling the context window with just the right information at just the right time."

「Prompt 工程」这个词低估了这件事的复杂度。你真正在工程化的，是整个 **context window** 的内容——不只是那一句用户的问题，而是模型在这次调用里能看到的所有信息。

### Context Window 里装的不只是 prompt

一个现代 LLM 调用的 context，通常由五类内容构成：

```
┌──────────────────────────────────────────────────────┐
│  System Prompt（角色定义 + 能力边界 + 格式要求）         │  稳定，变化频率最低
├──────────────────────────────────────────────────────┤
│  Few-shot Examples（动态注入的示例）                    │  按任务类型切换
├──────────────────────────────────────────────────────┤
│  Retrieved Context（RAG 检索结果）                     │  按用户问题动态检索
├──────────────────────────────────────────────────────┤
│  Conversation History（对话历史）                      │  随轮次增长，需要压缩
├──────────────────────────────────────────────────────┤
│  User Message（当前用户输入）                           │  变化最频繁
└──────────────────────────────────────────────────────┘
```

Context Engineering 就是工程化这五层的**内容、顺序、格式和预算分配**。

### KV Cache：决定「稳定内容要放前面」的根本原因

当你重复调用 LLM 时，模型会把前缀 token 的 Key/Value 矩阵缓存起来（KV Cache）。如果你的 system prompt 每次都一样，它只需要计算一次，后续调用直接命中缓存——速度更快，成本更低（Claude API 的缓存命中价格是正常输入的 1/10）。

这不是「好习惯」，这是**工程决策**：

```typescript
// ❌ 错误：把检索结果放在系统 prompt 之前
messages = [
  { role: "user", content: `参考资料：${ragResults}\n问题：${query}` },
  // system prompt 被动态内容推到后面 → KV Cache 无法命中
]

// ✅ 正确：稳定内容在前，动态内容在后
messages = [
  { role: "system", content: STABLE_SYSTEM_PROMPT }, // 👈 每次相同，命中缓存
  { role: "user", content: buildMessage(ragResults, query) }, // 动态部分放最后
]
```

### Lost in the Middle：context 位置影响关注度

实验研究发现，LLM 对 context 的开头和结尾关注度最高，中间部分容易被「忽视」——这被称为 **Lost in the Middle** 现象。

如果你的药品 RAG 系统把最关键的禁忌症信息放在 20 段对话历史的正中间，效果会打折扣。关键信息要靠近 system prompt 或靠近用户问题，而不是被埋在中间。

### Context Budget：把 token 当钱花

200k token 的 context window 是有限预算，不是无限仓库。一个成熟的 context 分配策略：

| 内容类型 | 推荐占比 | 优化方向 |
|---------|--------|---------|
| System Prompt | 5-10% | 精炼，避免冗余说明 |
| RAG 检索结果 | 20-40% | 按相关性截断，高分在后（靠近用户问题） |
| 对话历史 | 20-30% | 有损压缩，保留关键决策节点 |
| Few-shot 示例 | 10-15% | 动态按任务类型注入 |
| 用户当前输入 | 5-10% | 原文保留 |

**对话历史压缩**是最容易被忽视的问题。随着轮次增加，历史会无限膨胀。策略不是「截断最老的消息」，而是有损压缩：

```typescript
// 当 context 超过阈值，用 LLM 对历史做摘要
if (estimateTokens(history) > COMPRESS_THRESHOLD) {
  const summary = await llm.invoke(
    `请用 200 字以内概括以下对话的关键信息：\n${history}`
  )
  history = [{ role: "assistant", content: `[历史摘要] ${summary}` }]
}
```

### Context 即状态机

从 Context Engineering 的视角看，**AI 的「记忆」存在 context 里**。你在设计 context 的结构，本质上是在设计一个状态机：什么状态需要被记住、以什么格式存储、什么时候被压缩或丢弃。

### 深入：RAG 检索结果的精确组装

RAG 系统的效果上限，很大程度上由「检索结果如何进入 context」决定。从分块、检索到组装，每一步都有影响最终质量的决策。

**分块策略（Chunking）**

固定大小分块（如每 512 个 token 切一刀）是最简单的做法，但对长文档效果很差——一段关于「禁忌症」的段落可能被切成两半，两个 chunk 单独检索时都不完整。

**语义分块**（Semantic Chunking）按句子边界或段落语义相似性动态分块，保证每个 chunk 在语义上完整。更进一步的是 **Parent-Child 分块**：用小 chunk 做精准检索（粒度细，相关性高），但最终返回该 chunk 所在的父段落（上下文完整）。

**混合检索（Hybrid Search）**

纯向量检索对「含义相似」的内容找得好，但对精确关键词（药品通用名、编码）找得不如关键词检索。**混合检索**结合向量检索和 BM25 关键词检索，两路结果做 **Reciprocal Rank Fusion（RRF）** 合并，召回率明显优于单路，且不需要修改 Embedding 模型：

```
向量检索（语义相似） ──┐
                      ├─ RRF 融合 → 初始候选集 → Re-rank → 最终 Top-K
BM25 检索（关键词）  ──┘
```

**重排（Re-ranking）**

向量检索的 Top-K 结果按余弦相似度排序，不等于语义最相关。Cross-Encoder Re-ranker 对每个候选 chunk 和用户问题做 pair-wise 相关性评分，把真正相关的结果排到前面。Re-rank 不修改检索逻辑，只是在注入 context 前做一次精排，accuracy 通常提升 10-20%。

**组装格式**

进入 context 的检索结果用 XML 标签隔离，**按相关性从低到高排序**（最相关的靠近用户问题，利用 Lost-in-the-Middle 效应）：

```typescript
// 检索结果升序排列：低相关性在前，高相关性在后（靠近用户问题）
const contextBlock = rerankedChunks
  .sort((a, b) => a.score - b.score)           // 👈 低分在前，高分在后
  .map(r => `<doc id="${r.id}">\n${r.content}\n</doc>`)
  .join('\n')

const userMessage = `<context>\n${contextBlock}\n</context>\n\n问题：${query}`
```

### Context Engineering 的天花板

Context Engineering 管的是**单次 LLM 调用的输入侧**。不管调用何时触发、触发后 AI 能调用什么工具、工具结果如何被处理、出错了谁来重试。

换句话说：你优化了「问题的质量」，但还没有工程化「解决问题的能力」。

---

## 🔧 第三层：Harness Engineering——工程化 AI 的「执行环境」

### 什么是 Harness

「Harness」是马具的意思。好的马具不是束缚马，而是让马的力量被精确引导——让马能拉动重物，又不会乱跑。

在 AI 工程里，Harness 是**围绕 LLM 调用构建的整套执行脚手架**：它决定了 AI 能调用什么工具、被什么规则约束、如何与外部系统交互、操作日志如何记录、错误如何处理。

### Harness 的五个层次

**Tool Definitions（工具定义层）**

AI 能做什么，取决于你暴露了哪些工具。工具定义不只是函数签名，更是**能力边界的声明**。

```typescript
// 参数类型约束越严，模型幻觉越少
const drugSearchTool = {
  name: "search_drug_info",
  description: "搜索药品说明书，返回适应症、禁忌症、不良反应",
  parameters: {
    drugName: { type: "string", description: "药品通用名，如'阿莫西林'" },
    infoType: {
      type: "string",
      enum: ["indications", "contraindications", "side_effects"], // 👈 枚举约束
      description: "查询信息类型",
    },
  },
  required: ["drugName", "infoType"],
}
```

`enum` 约束看起来是小细节，却能大幅减少模型调用时的格式错误。结构越明确，模型越可靠，下游越好解析。

**Hook System（钩子层）**

Hook 是工具调用的 Middleware：PreTool 在调用前拦截，PostTool 在调用后处理。

```typescript
// PreTool Hook：调用前鉴权 + 日志记录
async function preToolHook(toolName: string, params: unknown) {
  logger.info({ tool: toolName, params, timestamp: Date.now() })

  // 高风险操作在工具层面直接阻断
  if (toolName === "generate_prescription" && !user.hasDoctorLicense) {
    throw new PermissionError("处方生成需要执业医师资质") // 👈 不让 AI「绕过」
  }
}
```

**Permission System（权限层）**

这是 Harness 工程最核心的设计决策：**哪些操作需要用户确认，哪些可以自动执行**？

| 操作类型 | 示例 | 处理方式 |
|---------|------|---------|
| 只读幂等 | 查询药品说明书 | 自动执行 |
| 写操作（可撤销） | 更新健康档案 | 自动执行 + 撤销记录 |
| 高风险写操作 | 生成处方单 | 用户单次确认 |
| 不可逆操作 | 提交医保报销 | 双重确认 + 延迟执行 |

**好的 Harness 是护栏，不是笼子。**

过度约束会让 AI 变成「问你答案的机器人」——每步都要确认，用户体验崩溃，AI 的价值归零。约束不足会让 AI 越权——在医疗场景里，这不是体验问题，是安全问题。

**Observability（可观测性层）**

没有可观测性的 AI 系统是一个黑盒：你知道输入什么，你知道输出什么，但中间发生了什么、哪一步最慢、哪类错误最常见——完全不知道。

三个维度必须覆盖：调用链追踪（哪些工具被调用了几次）、token 消耗统计（每步花了多少预算）、错误分类（是模型错误还是工具错误还是网络超时）。每次工具调用打 span，用 token 消耗作为「成本中心」按工具类型拆分——这样能发现哪个工具是最贵的瓶颈。

**State Management（状态持久化层）**

Harness 里有些状态不适合放在 context 里（太大、太稳定、或需要跨 session 持久化）。用户的长期健康档案、历史问诊记录、偏好设置——这些是 Harness 层管理的外部状态，通过工具调用按需注入 context。

### Harness 工程的核心张力

自主性与确定性之间存在根本张力：让 AI 自主做更多 → 风险增加；约束越多 → 自主性降低。没有一个通用答案，只有针对具体业务场景的权衡。

医疗 AI 的权衡尤为极端：「查药品信息」可以完全自主，「建议停药」必须要有人在循环中。

### 深入：错误处理、重试与降级

Harness 工程中最容易被低估的是**可靠性工程**。LLM 调用本质上是不稳定的：网络超时、服务限流、输出格式不符合预期、工具调用参数错误……

**分级重试策略**：对限流错误做指数退避，对格式错误把验证失败的原因反馈给模型再试，对不可恢复错误直接抛出：

```typescript
async function robustLLMCall(prompt: string, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await llm.invoke(prompt, { timeout: 30_000 })
      return JSON.parse(result.content) // 格式不合法会抛出异常，触发重试
    } catch (err) {
      if (err instanceof RateLimitError) {
        await sleep(Math.pow(2, attempt) * 1000) // 👈 指数退避：1s → 2s → 4s
      } else if (attempt === maxRetries - 1) {
        throw err // 最后一次仍失败，向上抛出
      }
    }
  }
}
```

**模型降级链**：当主模型不可用时，自动切换到备用模型，保证服务可用性：

```typescript
const MODEL_CHAIN = ['claude-sonnet-5', 'claude-haiku-4-5', 'fallback-local']

async function callWithFallback(prompt: string) {
  for (const model of MODEL_CHAIN) {
    try {
      return await llm.invoke(prompt, { model })
    } catch (err) {
      if (isModelUnavailableError(err)) continue // 👈 降级到下一个模型
      throw err
    }
  }
}
```

**结构化输出验证循环**：比「在 prompt 里说请输出 JSON」可靠得多——把 Schema 验证失败的具体原因回注给模型，引导自我修正：

```typescript
async function structuredOutput<T>(prompt: string, schema: ZodSchema<T>): Promise<T> {
  for (let i = 0; i < 3; i++) {
    const raw = await llm.invoke(prompt)
    const result = schema.safeParse(JSON.parse(raw))
    if (result.success) return result.data
    prompt += `\n\n上次输出 Schema 验证失败：${result.error.message}，请修正格式。`
  }
  throw new Error('结构化输出多次验证失败')
}
```

### Harness vs. Framework 的区别

很多人用 LangChain、LlamaIndex 以为自己在做「Harness Engineering」，实际上只是在用**别人已经写好的 Harness**。框架封装了工具调用、状态管理、错误重试的通用逻辑，降低了上手门槛。

真正的 Harness Engineering 是你主动设计这套脚手架：决定工具粒度、权限边界、Hook 策略、状态持久化方案。框架是参考实现，Harness 是你的工程决策——两件不同的事。

### Harness Engineering 的天花板

Harness Engineering 解决了「AI 能做什么、怎么做、谁来约束」的问题，但它仍然是以**单次完整任务**为单位设计的。

真正复杂的问题——修复一组测试、完成一份诊断报告、完成一项持续性研究——需要 AI 在时间维度上迭代、反思、修正。这是单次 Harness 调用解决不了的。

---

## 🔄 第四层：Loop Engineering——工程化 AI 的「时间维度」

### 为什么需要 Loop

有一类问题，天然是迭代的：

写代码 → 运行测试 → 发现报错 → 修代码 → 再运行 → 再发现…

这个流程，人类工程师每天都在经历。如果 AI 只能「回答一次」，它只能参与其中一个环节。如果 AI 能持续运行在这个循环里，它就能承担整个流程。

这是从「AI 工具」到「AI Agent」的根本跨越。

Loop Engineering 做的事是：**把「人在循环中」（Human-in-the-Loop）变成「AI 在循环中」（AI-in-the-Loop）**。

### Loop 的三种基础形态

**Agentic Loop（代理循环）**

最基础的 Loop：AI 推理 → 行动 → 观察结果 → 再推理。这是 **ReAct**（Reason + Act）框架的核心——推理和行动交替进行，每次行动的观察结果成为下一次推理的输入：

```
[思考] 用户问阿莫西林和头孢能否同服，需要查禁忌症
[行动] search_drug_info("阿莫西林", "contraindications")
[观察] 返回：β-内酰胺类药物联用可能增加过敏反应风险
[思考] 头孢也是 β-内酰胺类，还需确认重叠毒性
[行动] search_drug_info("头孢克洛", "drug_interactions")
[观察] 返回：与阿莫西林重复抗菌谱，存在叠加毒性风险
[思考] 信息足够，可以给出建议
[最终回答] 两者均为 β-内酰胺类抗生素，联用会增加过敏反应和消化道不良反应风险，通常不建议联用...
```

**Reflection Loop（反思循环）**

AI 生成草稿 → 另一个 LLM 实例审查（LLM-as-Judge）→ 审查反馈注入下一轮修订。

```typescript
async function reflectionLoop(task: string, maxRounds = 3) {
  let draft = await generator.invoke(task)

  for (let round = 0; round < maxRounds; round++) {
    const review = await judge.invoke(
      `评估以下医疗建议的准确性和安全性，给出 0-1 分和具体改进意见：\n${draft}`
    )
    if (parseScore(review) >= 0.9) break // 👈 质量达标，提前退出
    draft = await generator.invoke(`根据以下反馈修订建议：\n${review}\n原稿：\n${draft}`)
  }
  return draft
}
```

**Evaluation Loop（评估循环）**

运行测试 → 观察失败 → 生成修复 → 再运行测试。这是 TDD 的 AI 版本，也是目前最有实用价值的 Loop 形态：

```typescript
async function autoFixLoop(maxIterations = 5) {
  for (let i = 0; i < maxIterations; i++) {
    const result = await runTests()
    if (result.allPassed) return { success: true, iterations: i }

    const fix = await llm.invoke({
      system: "你是一个 TypeScript 专家，请修复以下测试失败",
      user: `失败用例：\n${result.failures}\n相关代码：\n${result.code}`,
    })
    await applyFix(fix) // 应用修复后进入下一轮
  }
  return { success: false, iterations: maxIterations }
}
```

### Loop Engineering 的五大挑战

Loop 不是「无限重复调用 LLM」，工程难度在于处理五个根本挑战：

**终止条件**

「什么时候停」是非平凡问题。目标达成、预算耗尽、收敛判断（连续 K 轮无进展）——都可以作为终止信号，通常需要组合使用。缺少明确终止条件的 Loop，要么提前放弃，要么永远跑下去。

**状态膨胀**

每轮 Loop 都会产生新的观察和推理，context 随轮次线性增长。到第 20 轮时，context 里 80% 的内容是前 19 轮的「废话」。解法是 **Summarize-as-you-go**：

```typescript
// 每隔 N 轮，对历史做一次有损压缩
if (round % SUMMARIZE_EVERY === 0) {
  const summary = await llm.invoke(`用 300 字概括以下执行历史的关键结论：\n${history}`)
  history = [{ role: "system", content: `[执行历史摘要] ${summary}` }] // 👈 替换，不是追加
}
```

**错误放大**

第一步的理解偏差，会在后续步骤中被不断放大。如果问诊 Loop 第一步「提取患者主诉」出了偏差，后面所有的检索和推理都在偏差基础上累积。解法：关键决策点加 human-in-the-loop 检查点，或在 Loop 开始前做独立的意图验证。

**目标漂移**

在长循环中，AI 可能因为当前观察太「有趣」而偏离原始目标。解法是在每轮 Loop 的 system prompt 里重申核心目标——相当于每次「强制复读一遍任务描述」，用稳定的锚点对抗上下文偏移。

**Token 预算**

Loop 的总消耗是「单次成本 × 轮次」，没有预算控制的 Loop 是危险的：

```typescript
// Budget-constrained Loop：动态感知剩余预算
const MIN_TOKENS_PER_ROUND = 5000

while (budget.remaining() > MIN_TOKENS_PER_ROUND) {
  const result = await llm.invoke(currentTask)
  budget.consume(result.usage.totalTokens)

  if (result.isDone) break
  log(`第 ${++round} 轮，剩余预算：${budget.remaining()} tokens`)
}
```

### Loop 设计模式速查

**Plan-Execute-Reflect（计划-执行-反思）**：先让 AI 制定完整计划（避免执行中途偏航），按计划执行，每步执行后做 mini-reflection，完成后做全局反思。适合复杂任务的首选模式。

**Until-Dry（直到干涸）**：发现新内容则继续，连续 K 轮无新发现则停止。适合开放式发现任务（找 bug、找安全漏洞、找文档缺失），避免因「找不到新东西」而无限循环。

**Multi-Agent Pipeline**：多个 Agent 并行处理不同维度，用 pipeline 而非 barrier 组织（即 A 做完立刻开始下游，不等 B/C 完成后再统一处理）。适合大规模批量处理。

### 深入：Loop 架构的组合设计

真实的生产级 Loop 往往是多种形态的组合。以「AI 自动化修复 Bug 系统」为例，单纯的 Evaluation Loop 存在一个隐患：LLM 生成的修复可能「修好了 A，引入了 B」，而测试套件未必覆盖所有回归。

**Evaluation + Reflection 组合**：在「应用修复」之前，加一个 Reflection 层——用独立的 Judge LLM 做代码审查，专门检查修复是否引入了新问题：

```
运行测试 → 发现失败 → 生成修复草稿
                            ↓
              Judge LLM 审查（会引入新 bug 吗？）
                  ↙                  ↘
            通过审查                审查拒绝
               ↓                       ↓
          应用修复 → 再运行测试      附带审查意见重新生成
```

**Worktree 隔离**：每次修复尝试在独立的 git worktree（或容器沙箱）中进行。失败了直接丢弃，不污染主干；成功了再 merge。这让「大胆尝试」的成本趋近于零，同时保证主干稳定。

**早停策略**：连续 3 轮修复后，如果失败的测试数量不减反增，说明 LLM 已经进入随机猜测状态。此时主动中止并上报人工介入，比无效消耗 token 更有价值。

**外部记忆系统**：对于超长 Loop（持续性研究任务、跨 session 的 Agent），context 无法容纳所有历史。引入**外部记忆**：将关键发现持久化到向量数据库，每轮 Loop 开始时通过语义检索按需拉取，而不是把所有历史堆进 context。这把 Loop 从「受 context 大小限制的短循环」升级为「可持续运行的长任务」。

---

## 💡 一张图总结

| 层级 | 工程单元 | 核心问题 | 关键技术 | 核心难点 |
|------|---------|---------|---------|---------|
| Prompt Engineering | 单次 prompt 文本 | 如何让模型回答得更好？ | Few-shot / CoT / Self-Consistency / Structured Output | 静态无状态，无法感知环境 |
| Context Engineering | 整个 context window | context 里放什么、如何分配预算？ | KV Cache / 混合检索 / Re-rank / 历史压缩 | token 预算有限，信息密度博弈 |
| Harness Engineering | AI 执行脚手架 | AI 能做什么、如何被约束和观测？ | Tool 定义 / Hook / 权限分级 / 错误重试 / 降级链 | 自主性与确定性的根本张力 |
| Loop Engineering | 多轮迭代系统 | AI 如何持续运行、自我修正、不失控？ | ReAct / Reflection / Evaluation / 外部记忆 | 终止条件、状态膨胀、目标漂移 |

**四层递进的本质**：工程化单元从「文本」升级到「上下文」，再到「执行环境」，最后到「时间维度上的迭代过程」。

每往上一层，可解决的问题复杂度上一个数量级；每往上一层，需要的工程能力同步升维。

---

## 📝 继续深入

这篇是整个「AI 应用工程实战」系列的全景图。每一层都值得单独展开：

- **Context Window 的 Budget 分配策略**——如何把 200k tokens 花在刀刃上
- **Harness 设计实战**——从 LangChain 的封装到自己写脚手架的边界在哪里
- **RAG 系统的精确控制**——混合检索 + Re-rank + Parent-Child 分块的完整实现

在你目前的项目里，你日常工作在哪一层？从 **Context Engineering** 到 **Harness Engineering** 的跨越，最大的认知转变是什么——是从「优化输入」变成「设计环境」，还是别的什么？

---

> 🔖 **「AI 应用工程实战」系列 · 全景图篇**
>
> 这篇是整个系列的地图。后续对每一层做深度展开：
> - 下一篇：**Context Window 的 Budget 分配策略——如何把 200k tokens 花在刀刃上**
> - 再下一篇：**Harness 设计实战——从 LangChain 的封装到自己写脚手架的边界在哪里**
