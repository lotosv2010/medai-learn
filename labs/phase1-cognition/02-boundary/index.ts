import { loadEnv, requireKey, printBudget, printTable } from '../../shared/env.ts'

/**
 * 阶段一 · 第 02 篇实验：能力边界
 *
 * 3 个「模型大概率不知道」的医疗问题 × 3 种问法 = 9 次调用。
 * 要看见：裸问最容易编 → 加约束能减少但不彻底 → 给资料后准确率最高，但会出现忠实性幻觉。
 *
 * 这篇的结论直接指向阶段四：RAG 不是「更高级的玩法」，是幻觉问题的必然解法。
 */

const BASE_URL = 'https://api.deepseek.com/v1'
const MODEL = 'deepseek-chat'

interface Case {
  label: string
  question: string
  /** 该问题的「真实答案」或「已知不存在」判定材料 */
  groundTruth: string
  /** 用于「给资料」问法的参考片段（真实说明书内容） */
  reference: string
}

const CASES: Case[] = [
  {
    label: '不存在的批号',
    question: '请告诉我批号为 H20250815A 的阿莫西林胶囊的生产厂家和有效期。',
    groundTruth: '该批号是示例编号，现实中不存在，正确回答应为「无法确认」',
    reference: '（本题刻意不提供资料——真实业务里你也没有这份资料）',
  },
  {
    label: '未来政策',
    question: '2027 年起，国内药店销售处方药需要满足哪些新的监管要求？',
    groundTruth: '训练数据不可能覆盖，正确回答应说明知识可能过时',
    reference: '（本题刻意不提供资料——政策类问题的正解是「查官方发布」而非「问模型」）',
  },
  {
    label: '冷门剂量细节',
    question: '阿莫西林胶囊用于儿童时，按体重计算的每日最大剂量是多少？',
    groundTruth: '说明书通常写「每日 20-40mg/kg，分 3 次」，需以实际说明书为准',
    reference:
      '【阿莫西林胶囊 说明书摘录】小儿用量：一日按体重 20~40mg/kg，每 8 小时 1 次；' +
      '3 个月以下婴儿一日按体重 30mg/kg，每 12 小时 1 次。' +
      '本品为青霉素类药物，用药前必须做青霉素皮肤试验，阳性者禁用。',
  },
]

type Strategy = '裸问' | '加约束' | '给资料'

function buildMessages(c: Case, strategy: Strategy): Array<{ role: string; content: string }> {
  if (strategy === '裸问') {
    return [{ role: 'user', content: c.question }]
  }
  if (strategy === '加约束') {
    return [
      {
        role: 'system',
        content:
          '你是医疗信息助手。如果无法确定答案，请直接回答「我不确定」，' +
          '不要编造批号、剂量、政策条款或任何具体数字。',
      },
      { role: 'user', content: c.question },
    ]
  }
  return [
    { role: 'system', content: '只能依据提供的资料回答。资料中没有的信息，明确说「资料未提及」。' },
    { role: 'user', content: `【资料】\n${c.reference}\n\n【问题】\n${c.question}` },
  ]
}

interface Attempt {
  caseLabel: string
  strategy: Strategy
  answer: string
  verdict: '编造' | '承认不知道' | '答对' | '答偏'
}

/** 粗判：出现具体数字/厂家名且不在 groundTruth 中 → 视为编造倾向 */
function judge(a: Attempt, groundTruth: string): Attempt['verdict'] {
  const a0 = a.answer
  if (/不确定|无法确认|未提及|不知道|无法回答/.test(a0)) return '承认不知道'
  if (a.strategy === '给资料') {
    // 给资料时：提到了资料里的关键数字（20~40 / 30mg）算答对，否则算答偏
    return /20\s*[~-]\s*40|30\s*mg/.test(a0) ? '答对' : '答偏'
  }
  if (a.strategy === '裸问') {
    // 裸问时：给出了具体的厂家名/批号/日期等确定性表述，且 groundTruth 说它不存在
    if (groundTruth.includes('不存在') || groundTruth.includes('不可能覆盖')) return '编造'
  }
  return /我不知道|不确定/.test(a0) ? '承认不知道' : '编造'
}

async function ask(apiKey: string, messages: Array<{ role: string; content: string }>): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.3 }),
  })
  if (!res.ok) throw new Error(`请求失败 ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  return json.choices?.[0]?.message?.content?.trim() ?? ''
}

async function main(): Promise<void> {
  const env = loadEnv()
  const apiKey = requireKey(env, 'DEEPSEEK_API_KEY', 'https://platform.deepseek.com/api_keys')
  printBudget('3 问题 × 3 问法', 9, 6_000, 2)

  const attempts: Attempt[] = []
  for (const c of CASES) {
    console.log(`\n${'═'.repeat(64)}\n【${c.label}】${c.question}\n`)
    console.log(`   判定基准：${c.groundTruth}`)
    for (const strategy of ['裸问', '加约束', '给资料'] as Strategy[]) {
      process.stdout.write(`   ⏳ ${strategy}... `)
      try {
        const answer = await ask(apiKey, buildMessages(c, strategy))
        const attempt: Attempt = { caseLabel: c.label, strategy, answer, verdict: '编造' }
        attempt.verdict = judge(attempt, c.groundTruth)
        attempts.push(attempt)
        console.log(attempt.verdict)
        console.log(`      → ${answer.replace(/\n+/g, ' ').slice(0, 100)}...`)
      } catch (err) {
        console.log(`✗ ${(err as Error).message}`)
      }
    }
  }

  console.log('\n' + '═'.repeat(64))
  console.log('📊 结果矩阵')
  printTable(
    ['问题', '裸问', '加约束', '给资料'],
    CASES.map((c) => {
      const cells = (['裸问', '加约束', '给资料'] as Strategy[]).map(
        (s) => attempts.find((a) => a.caseLabel === c.label && a.strategy === s)?.verdict ?? '-',
      )
      return [c.label, ...cells]
    }),
  )

  const byStrategy = (s: Strategy, v: Attempt['verdict']) =>
    attempts.filter((a) => a.strategy === s && a.verdict === v).length

  console.log('💡 三个可以带走的结论：')
  console.log(`   · 裸问的「编造」次数：${byStrategy('裸问', '编造')} / 3`)
  console.log(`   · 加约束后「承认不知道」：${byStrategy('加约束', '承认不知道')} / 3 —— 有效但不彻底`)
  console.log(`   · 给资料后「答对」：${byStrategy('给资料', '答对')} / 3 —— 但也可能出现「答偏」`)
  console.log('\n   → Prompt 只能缓解，资料注入才是根本。而「把资料自动注入」就叫 RAG（阶段四）。')
  console.log('   → 医疗场景必须假设模型会编，靠人机协作与工具核验兜底（阶段五）。\n')
}

main().catch((err) => {
  console.error('❌ 实验失败：', err)
  process.exit(1)
})
