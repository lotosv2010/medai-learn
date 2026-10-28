import { loadEnv, requireKey, printBudget, printTable } from '../../shared/env.ts'

/**
 * 阶段一 · 第 03 篇实验：采样参数与推理模型
 *
 * 实验 A：固定 prompt，temperature 扫 0 / 0.3 / 0.7 / 1.0，每档 5 次
 *         要看见：0 档几乎一致；1.0 档偶尔偏离事实
 * 实验 B：多步计算题，普通模型 vs 推理模型对比「正确率 / 耗时 / token / 成本」
 *         要看见：推理模型答对但贵几倍；换简单题后无差别
 *
 * 核心结论：参数是「成本与稳定性」的旋钮，不是「智能程度」的旋钮。
 */

const BASE_URL = 'https://api.deepseek.com/v1'
const NORMAL_MODEL = 'deepseek-chat'
const REASONER_MODEL = 'deepseek-reasoner'

const PROMPT_A = '给「阿莫西林胶囊需空腹服用」这条用药提醒写一句话版本，不超过 30 字。'

const PROMPT_B = `一名 6 岁儿童体重 20kg，需要服用阿莫西林胶囊治疗上呼吸道感染。
说明书规定：小儿一日按体重 20~40mg/kg，每 8 小时 1 次；成人单次剂量上限为 0.5g。
请以每日最大剂量计算，回答：
（1）该儿童单次应服用多少 mg？
（2）换算成 0.25g/粒的胶囊，单次应服几粒（可含半粒）？
（3）这个剂量是否超过成人单次上限？
只给最终数字和结论，简短回答。`

interface CallStats {
  model: string
  elapsedMs: number
  promptTokens: number
  completionTokens: number
  /** 推理模型额外产生的思考 token（DeepSeek 在 reasoning_content 与 usage 中体现） */
  reasoningTokens: number
  content: string
}

async function call(
  apiKey: string,
  model: string,
  prompt: string,
  temperature: number,
): Promise<CallStats> {
  const started = Date.now()
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
    }),
  })
  if (!res.ok) throw new Error(`请求失败 ${res.status}: ${await res.text()}`)

  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
    usage: {
      prompt_tokens: number
      completion_tokens: number
      completion_tokens_details?: { reasoning_tokens?: number }
    }
  }

  return {
    model,
    elapsedMs: Date.now() - started,
    promptTokens: json.usage?.prompt_tokens ?? 0,
    completionTokens: json.usage?.completion_tokens ?? 0,
    reasoningTokens: json.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
    content: json.choices?.[0]?.message?.content?.trim() ?? '',
  }
}

async function experimentA(apiKey: string): Promise<void> {
  console.log('\n' + '═'.repeat(64))
  console.log('实验 A：temperature 扫描（每档 5 次，共 20 次）')
  console.log('═'.repeat(64))

  const LEVELS = [0, 0.3, 0.7, 1.0]
  const rows: string[][] = []

  for (const t of LEVELS) {
    const outputs: string[] = []
    process.stdout.write(`   ⏳ temperature=${t} ... `)
    for (let i = 0; i < 5; i++) {
      try {
        outputs.push((await call(apiKey, NORMAL_MODEL, PROMPT_A, t)).content)
      } catch {
        outputs.push('<失败>')
      }
    }
    const unique = new Set(outputs).size
    const avgLen = Math.round(outputs.reduce((s, o) => s + o.length, 0) / outputs.length)
    console.log(`完成（5 条中 ${unique} 条不同）`)
    rows.push([String(t), `${unique}/5`, String(avgLen), outputs[0].slice(0, 24)])

    console.log(`     不同输出示例：`)
    for (const o of [...new Set(outputs)].slice(0, 3)) console.log(`       · ${o}`)
  }

  printTable(['temperature', '不同条数', '平均字数', '首条示例'], rows)
  console.log('💡 0 档几乎完全一致（适合事实抽取、结构化输出）')
  console.log('   1.0 档多样性最高，但也最容易偏离事实（医疗场景慎用）')
  console.log('   注意：0 档也不保证 100% 确定——浮点与批次差异仍在，可复现要靠日志与评估兜底\n')
}

async function experimentB(apiKey: string): Promise<void> {
  console.log('\n' + '═'.repeat(64))
  console.log('实验 B：普通模型 vs 推理模型（多步计算题）')
  console.log('═'.repeat(64))
  printBudget('1 次普通 + 1 次推理', 2, 3_000, 6)

  const results: CallStats[] = []
  for (const model of [NORMAL_MODEL, REASONER_MODEL]) {
    process.stdout.write(`   ⏳ ${model} ... `)
    try {
      const r = await call(apiKey, model, PROMPT_B, 0)
      results.push(r)
      console.log(`完成（${r.elapsedMs}ms，输出 ${r.completionTokens} token）`)
    } catch (err) {
      console.log(`✗ ${(err as Error).message}`)
    }
  }

  for (const r of results) {
    console.log(`\n【${r.model}】`)
    console.log(r.content.replace(/\n+/g, ' '))
  }

  // DeepSeek 定价（元/百万 token，粗估）：chat 输入 0.5 / 输出 8；reasoner 输入 1 / 输出 16
  const priceOf = (model: string) =>
    model === REASONER_MODEL ? { in: 1, out: 16 } : { in: 0.5, out: 8 }
  const costOf = (r: CallStats) => {
    const p = priceOf(r.model)
    return ((r.promptTokens * p.in) / 1e6 + (r.completionTokens * p.out) / 1e6)
  }

  printTable(
    ['模型', '耗时', '输入 token', '输出 token', '思考 token', '本次成本'],
    results.map((r) => [
      r.model,
      `${(r.elapsedMs / 1000).toFixed(1)}s`,
      String(r.promptTokens),
      String(r.completionTokens),
      String(r.reasoningTokens),
      `¥${costOf(r).toFixed(5)}`,
    ]),
  )

  console.log('💡 推理模型更慢更贵，但多步逻辑题答对率更高。')
  console.log('   判断标准：多步推理 / 数学 / 复杂权衡 → 用它；简单抽取问答 → 用它是浪费。')
  console.log('   → 下一篇：既然模型有强弱之分，怎么算清楚「选哪个才划算」？\n')
}

async function main(): Promise<void> {
  const env = loadEnv()
  const apiKey = requireKey(env, 'DEEPSEEK_API_KEY', 'https://platform.deepseek.com/api_keys')
  printBudget('temperature 扫描', 20, 10_000, 2)

  await experimentA(apiKey)
  await experimentB(apiKey)
}

main().catch((err) => {
  console.error('❌ 实验失败：', err)
  process.exit(1)
})
