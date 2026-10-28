import { loadEnv, requireKey, printBudget, printTable } from '../../shared/env.ts'

/**
 * 阶段一 · 第 00 篇实验：一次 API 调用背后发生了什么
 *
 * 要看见三件事：
 *   1. 返回结构：choices[0].message.content 是人读的文本，其余都是元数据
 *   2. usage.prompt_tokens / completion_tokens / total_tokens 是账单的计量单位
 *   3. 三家对同一问题的回答措辞不同，但结构高度相似——因为都在做同一件事：概率续写
 *
 * 关键结论：你付费买的是 token 数，不是「答案」；你拿到的是文本，不是「事实」。
 */

const QUESTION = '阿莫西林胶囊的常见不良反应有哪些？请用三句话概括。'

/** 统一的调用结果形状，屏蔽各家 SDK 差异 */
interface ChatResult {
  provider: string
  model: string
  content: string
  promptTokens: number
  completionTokens: number
  raw: unknown
}

/**
 * 各家 API 的兼容性说明（📚 知识点：为什么阶段二要做多模型抽象）
 *
 * 通义千问（DashScope）与 DeepSeek 都提供 OpenAI 兼容接口，
 * 所以三个 provider 都能用同一套 /chat/completions 协议调用。
 * 但这只是「碰巧兼容」——Anthropic 的请求体、响应结构、流式格式都不同。
 * 阶段二要做的 AIProvider 抽象，正是为了不让业务代码依赖这种偶然性。
 */
interface ProviderConfig {
  name: string
  envKey: string
  hint: string
  baseURL: string
  model: string
  /** 混合单价（元/百万 token），仅用于粗估预算 */
  pricePerMillionYuan: number
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: 'DeepSeek',
    envKey: 'DEEPSEEK_API_KEY',
    hint: 'https://platform.deepseek.com/api_keys',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    pricePerMillionYuan: 2,
  },
  {
    name: '通义千问',
    envKey: 'DASHSCOPE_API_KEY',
    hint: 'https://bailian.console.aliyun.com/?tab=model#/api-key',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    pricePerMillionYuan: 4,
  },
  {
    name: 'Anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    hint: 'https://console.anthropic.com/settings/keys',
    baseURL: 'https://api.anthropic.com/v1',
    model: 'claude-haiku-5-5',
    pricePerMillionYuan: 8,
  },
]

/**
 * 📚 知识点：这里直接 fetch，不用官方 SDK
 *
 * 学习阶段刻意不用 SDK，是为了让「HTTP 请求长什么样」这件事无处可躲。
 * 你看得见 messages 数组、看得见 temperature、看得见响应里的 usage——
 * 而 SDK 会把这些细节藏起来，用起来更爽，但学不到东西。
 */
async function callOpenAICompatible(cfg: ProviderConfig, apiKey: string): Promise<ChatResult> {
  const res = await fetch(`${cfg.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [{ role: 'user', content: QUESTION }],
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    throw new Error(`${cfg.name} 请求失败 ${res.status}: ${await res.text()}`)
  }

  const json = (await res.json()) as {
    model: string
    choices: Array<{ message: { content: string } }>
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  }

  return {
    provider: cfg.name,
    model: json.model ?? cfg.model,
    content: json.choices?.[0]?.message?.content ?? '',
    promptTokens: json.usage?.prompt_tokens ?? 0,
    completionTokens: json.usage?.completion_tokens ?? 0,
    raw: json,
  }
}

async function main(): Promise<void> {
  const env = loadEnv()
  printBudget('同一问题问 3 家模型', 3, 1200, 5)

  const available = PROVIDERS.filter((p) => env[p.envKey])
  if (available.length === 0) {
    requireKey(env, PROVIDERS[0].envKey, PROVIDERS[0].hint)
  }
  if (available.length < 3) {
    const missing = PROVIDERS.filter((p) => !env[p.envKey]).map((p) => p.envKey)
    console.log(`⚠️  只配了 ${available.length} 家 key，本次跑 ${available.length} 次对比。`)
    console.log(`   想跑满 3 家，补上：${missing.join(' / ')}\n`)
  }

  console.log(`❓ 问题：${QUESTION}\n`)

  const results: ChatResult[] = []
  for (const cfg of available) {
    console.log(`⏳ 调用 ${cfg.name}（${cfg.model}）...`)
    try {
      results.push(await callOpenAICompatible(cfg, env[cfg.envKey]))
    } catch (err) {
      console.error(`   ✗ ${cfg.name} 失败：${(err as Error).message}\n`)
    }
  }

  if (results.length === 0) {
    console.error('❌ 全部调用失败，检查网络与 key 是否正确。')
    process.exit(1)
  }

  for (const r of results) {
    console.log(`\n${'═'.repeat(60)}`)
    console.log(`【${r.provider} / ${r.model}】`)
    console.log('─'.repeat(60))
    console.log(r.content.trim())
  }

  console.log('\n' + '═'.repeat(60))
  console.log('📈 token 用量：这就是账单的计量单位')
  printTable(
    ['模型', '输入 token', '输出 token', '合计'],
    results.map((r) => [
      `${r.provider}`,
      String(r.promptTokens),
      String(r.completionTokens),
      String(r.promptTokens + r.completionTokens),
    ]),
  )

  console.log('🔍 原始响应结构（第一家，只展示顶层字段）：')
  console.log(JSON.stringify(Object.keys(results[0].raw as object), null, 2))

  console.log('\n💡 三个可以带走的结论：')
  console.log('   1. 你真正读的只有 choices[0].message.content，其余全是元数据')
  console.log('   2. 你付费买的是 token 数，不是「答案」——同一句话中文常比英文更贵')
  console.log('   3. 三家措辞不同但结构相似，因为它们在学同一件事：最可能的续写')
  console.log('\n   → 下一篇：Token 到底怎么切，为什么 128K 窗口不等于能读 128K？')
}

main().catch((err) => {
  console.error('❌ 实验失败：', err)
  process.exit(1)
})
