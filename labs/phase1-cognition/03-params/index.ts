import { loadEnv, requireKey, printBudget, printTable } from '../../shared/env.ts'

/**
 * 阶段一 · 第 03 篇实验：采样参数与推理模型
 *
 * 实验 A：固定 prompt，temperature 扫 0 / 0.3 / 0.7 / 1.0，每档 5 次
 *         要看见：0 档几乎一致；1.0 档偶尔偏离事实
 * 实验 B：同一模型的「思考关闭 / 思考开启」两种模式，跑同一道多步计算题
 *         要看见：思考模式答对但慢几倍、贵几倍；换简单题后两者无差别
 *
 * 核心结论：参数是「成本与稳定性」的旋钮，不是「智能程度」的旋钮。
 *
 * 📚 知识点：为什么这里用「一个模型的两种模式」，而不是「两个模型」？
 * 2026 年的商业化 API 已经把推理能力做成了开关（thinking: enabled / disabled），
 * 不再是 deepseek-chat / deepseek-reasoner 那样的两个模型名。
 * 用同一个模型切换模式，变量只剩「要不要先写草稿」，对照才干净。
 */

const BASE_URL = 'https://api.deepseek.com'
/** 同一个模型，两种思考模式 */
const MODEL = 'deepseek-flash'

const PROMPT_A = '给「阿莫西林胶囊需空腹服用」这条用药提醒写一句话版本，不超过 30 字。'

const PROMPT_B = `一名 6 岁儿童体重 20kg，需要服用阿莫西林胶囊治疗上呼吸道感染。
说明书规定：小儿一日按体重 20~40mg/kg，每 8 小时 1 次；成人单次剂量上限为 0.5g。
请以每日最大剂量计算，回答：
（1）该儿童单次应服用多少 mg？
（2）换算成 0.25g/粒的胶囊，单次应服几粒（可含半粒）？
（3）这个剂量是否超过成人单次上限？
只给最终数字和结论，简短回答。`

/** 简单题：用来看「推理模式在简单任务上是不是纯浪费」 */
const PROMPT_C = '阿莫西林属于哪一类抗生素？一句话回答。'

interface CallStats {
  /** 展示用的模式名 */
  mode: string
  thinking: boolean
  elapsedMs: number
  promptTokens: number
  completionTokens: number
  /** 思考 token 数 */
  reasoningTokens: number
  /** 思考 token 是估算值还是服务端返回的实测值 */
  reasoningEstimated: boolean
  content: string
}

/**
 * 粗估 token：中文约 1 字 1 token，英文约 4 字符 1 token，混排取 0.6 是个折中系数。
 * ⚠️ 仅用于「服务端没返回思考 token 数」时的兜底展示，不是计费口径。
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length * 0.6)
}

async function call(
  apiKey: string,
  thinking: boolean,
  prompt: string,
  temperature: number,
): Promise<CallStats> {
  const started = Date.now()
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      // 👈 关键：思考模式下 temperature 不生效（传了不报错，但也不会生效）。
      // 想让温度扫描有意义，必须显式关掉思考。
      thinking: { type: thinking ? 'enabled' : 'disabled' },
    }),
  })
  if (!res.ok) throw new Error(`请求失败 ${res.status}: ${await res.text()}`)

  const json = (await res.json()) as {
    choices: Array<{ message: { content: string; reasoning_content?: string } }>
    usage: {
      prompt_tokens: number
      completion_tokens: number
      completion_tokens_details?: { reasoning_tokens?: number }
    }
  }

  const message = json.choices?.[0]?.message
  const measured = json.usage?.completion_tokens_details?.reasoning_tokens
  const reasoningText = message?.reasoning_content ?? ''

  return {
    mode: thinking ? '思考开启' : '思考关闭',
    thinking,
    elapsedMs: Date.now() - started,
    promptTokens: json.usage?.prompt_tokens ?? 0,
    completionTokens: json.usage?.completion_tokens ?? 0,
    // 服务端给了实测值就用实测，否则按思维链文本粗估
    reasoningTokens: measured ?? estimateTokens(reasoningText),
    reasoningEstimated: measured === undefined,
    content: message?.content?.trim() ?? '',
  }
}

async function experimentA(apiKey: string): Promise<void> {
  console.log('\n' + '═'.repeat(64))
  console.log('实验 A：temperature 扫描（思考关闭，每档 5 次，共 20 次）')
  console.log('═'.repeat(64))

  const LEVELS = [0, 0.3, 0.7, 1.0]
  const rows: string[][] = []

  for (const t of LEVELS) {
    const outputs: string[] = []
    process.stdout.write(`   ⏳ temperature=${t} ... `)
    for (let i = 0; i < 5; i++) {
      try {
        outputs.push((await call(apiKey, false, PROMPT_A, t)).content)
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

/** 智能四舍五入到小整数，便于阅读 */
function round(x: number): string {
  return Number.isInteger(x) ? String(x) : x.toFixed(2)
}

/**
 * 计算一次调用的成本（元）。
 *
 * 📚 知识点：DeepSeek 官方定价（2026-11 核对，非高峰档）
 *   deepseek-flash：输入 ¥1 / 百万 token，输出 ¥4 / 百万 token
 *   deepseek-v4-pro：输入 ¥4.5 / 百万 token，输出 ¥13.5 / 百万 token
 * 高峰时段（北京时间工作日 09:00-12:00、14:00-18:00）价格翻倍。
 * 思考 token 计入输出，所以「想得越久越贵」不是错觉。
 */
const PRICE_FLASH = { in: 1, out: 4 }

function costOf(stats: CallStats): number {
  return (
    (stats.promptTokens * PRICE_FLASH.in) / 1e6 + (stats.completionTokens * PRICE_FLASH.out) / 1e6
  )
}

/** 跑一组「关闭 / 开启思考」的对照 */
async function runPair(
  apiKey: string,
  prompt: string,
  temperature: number,
): Promise<CallStats[]> {
  const results: CallStats[] = []
  for (const thinking of [false, true]) {
    const label = thinking ? '思考开启' : '思考关闭'
    process.stdout.write(`   ⏳ ${label} ... `)
    try {
      const r = await call(apiKey, thinking, prompt, temperature)
      results.push(r)
      console.log(`完成（${r.elapsedMs}ms，输出 ${r.completionTokens} token）`)
    } catch (err) {
      console.log(`✗ ${(err as Error).message}`)
    }
  }
  return results
}

function printPair(results: CallStats[], title: string): void {
  console.log(`\n${title}`)
  for (const r of results) {
    console.log(`\n【${r.mode}】`)
    console.log(r.content.replace(/\n+/g, ' '))
  }

  printTable(
    ['模式', '耗时', '输入 token', '输出 token', '思考 token', '本次成本'],
    results.map((r) => [
      r.mode,
      `${(r.elapsedMs / 1000).toFixed(1)}s`,
      String(r.promptTokens),
      String(r.completionTokens),
      r.reasoningEstimated ? `≈${r.reasoningTokens}` : String(r.reasoningTokens),
      `¥${costOf(r).toFixed(5)}`,
    ]),
  )
}

async function experimentB(apiKey: string): Promise<void> {
  console.log('\n' + '═'.repeat(64))
  console.log('实验 B：思考模式开 / 关对照（题目：多步剂量计算）')
  console.log('═'.repeat(64))
  printBudget('1 次关闭 + 1 次开启', 2, 3_000, 6)

  const hard = await runPair(apiKey, PROMPT_B, 0)
  printPair(hard, `【多步计算题】${PROMPT_B.split('\n')[0]}`)

  console.log('─'.repeat(64))
  console.log('再看同一对照组做一道简单题：')

  const easy = await runPair(apiKey, PROMPT_C, 0)
  printPair(easy, '【简单题】阿莫西林属于哪一类抗生素？')

  console.log('💡 多步题上思考模式明显更稳，代价是耗时与 token 数倍。')
  console.log('   简单题上两者结果与成本几乎拉不开差距——这时开思考就是纯浪费。')
  console.log('   判断标准：多步推理 / 数学 / 复杂权衡 → 开；简单抽取问答 → 关。')
  console.log('   → 下一篇：既然模型有强弱之分，怎么算清楚「选哪个才划算」？\n')
}

async function main(): Promise<void> {
  const env = loadEnv()
  const apiKey = requireKey(env, 'DEEPSEEK_API_KEY', 'https://platform.deepseek.com/api_keys')
  printBudget('temperature 扫描', 20, 10_000, 4)

  await experimentA(apiKey)
  await experimentB(apiKey)
}

main().catch((err) => {
  console.error('❌ 实验失败：', err)
  process.exit(1)
})
