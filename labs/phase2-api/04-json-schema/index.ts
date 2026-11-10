/**
 * 阶段二 · 第 04 篇《结构化输出：把正确性押在 Schema 上》实验
 *
 * 只用 DeepSeek，比较三件事：
 *   实验 A  两档可靠性：Prompt 约定 vs response_format=json_object（各跑 6 条样本）
 *   实验 B  Zod 能否拦住「结构合法、语义错误」的输出
 *   实验 C  思考模式开/关对照（思考开启时 temperature 不生效，因此对照前必须关掉）
 *
 * ⚠️ 关键前提：默认请求带 thinking: disabled。思考模式下 temperature 等参数行为不同，
 *    会污染 A/B 的对比，所以实验 A/B 全程显式关闭。
 *
 * 跑法（仓库根目录）：
 *   pnpm --filter @medai/labs p2-schema
 */

import { loadEnv, requireKey, printBudget, printTable } from '../../shared/env.ts'
import { PrescriptionSchema, FIELD_HINT, type Prescription } from './schema.ts'
import { SAMPLES, type Sample } from './samples.ts'

// ── 配置 ────────────────────────────────────────────────────────────────
const apiKey = requireKey(loadEnv(), 'DEEPSEEK_API_KEY', 'https://platform.deepseek.com/api_keys')
const ENDPOINT = 'https://api.deepseek.com/chat/completions'
const MODEL = 'deepseek-chat'

type Mode = 'prompt' | 'json_object'

interface ChatResult {
  content: string
  finishReason: string
  servedModel: string
  reasoningTokens: number
  totalTokens: number
}

// ── 模型调用 ────────────────────────────────────────────────────────────
/**
 * 统一的调用入口。两档的唯一差别是 response_format 是否存在。
 *
 * 📚 知识点：json_object 只保证「输出是合法 JSON」，不保证字段名、枚举值、类型。
 * 它的承诺到「括号配对」为止，所以下游必须再用 Zod 校验。
 */
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

// ── Prompt 构造 ─────────────────────────────────────────────────────────
/**
 * 两档都必须含 "json" 字样：json_object 缺它会直接 400（本篇核实过），
 * Prompt 约定档也写上，保证两档之间只有 response_format 这一个变量。
 */
function buildPrompt(sample: Sample): string {
  return `请把下面这条处方抽取为 JSON 对象，严格按字段说明输出，不要任何解释。\n${FIELD_HINT}\n\n处方原文：${sample.text}`
}

// ── 判定 ────────────────────────────────────────────────────────────────
interface Verdict {
  parsed: boolean // 能否 JSON.parse
  schemaOk: boolean // 能否通过 Zod
  missing: string[] // 缺失字段（对照标准答案）
  drift: string[] // 枚举/数值与标准答案不一致
  data: Prescription | null
}

/**
 * 三层判定，层层递进：
 *  1) 能不能解析为 JSON   2) 能不能通过 Zod   3) 通过后，字段值是否与人工标准答案一致
 */
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

  return {
    parsed: true,
    schemaOk: result.success,
    missing,
    drift,
    data: result.success ? result.data : null,
  }
}

// ── 实验 A：两档对照 ───────────────────────────────────────────────────
interface RowA {
  sample: string
  mode: Mode
  verdict: Verdict
  finish: string
  tokens: number
}

async function runA(): Promise<RowA[]> {
  const rows: RowA[] = []
  for (const mode of ['prompt', 'json_object'] as Mode[]) {
    for (const sample of SAMPLES) {
      // Prompt 约定档不设 response_format；json_object 档设
      const res = await chat(buildPrompt(sample), mode === 'json_object' ? 'json_object' : 'none', false)
      rows.push({
        sample: sample.id,
        mode,
        verdict: judge(res.content, sample),
        finish: res.finishReason,
        tokens: res.totalTokens,
      })
    }
  }
  return rows
}

function summarizeA(rows: RowA[], mode: Mode): string[] {
  const mine = rows.filter((r) => r.mode === mode)
  const n = mine.length
  const pct = (k: number) => `${k}/${n}（${Math.round((k / n) * 100)}%）`
  return [
    mode === 'prompt' ? 'Prompt 约定' : 'json_object',
    pct(mine.filter((r) => r.verdict.parsed).length),
    pct(mine.filter((r) => r.verdict.schemaOk).length),
    pct(mine.filter((r) => r.verdict.missing.length + r.verdict.drift.length === 0 && r.verdict.schemaOk).length),
    String(mine.reduce((s, r) => s + r.tokens, 0)),
  ]
}

// ── 实验 B：Zod 能否拦住语义错误 ───────────────────────────────────────
/**
 * 人为构造一条「结构合法、语义错误」的输出：剂量抄成了 5（应为 0.5），频次写成了 qid。
 * 它能通过 Zod（类型与枚举都对），说明 Zod 只管结构，不管语义。
 */
function runB(): void {
  const wrong = {
    drug: '阿莫西林胶囊',
    dose: 5, // 👈 语义错：应为 0.5
    doseUnit: 'g',
    frequency: 'qid', // 👈 语义错：应为 tid
    durationDays: 7,
    route: '口服',
  }
  const result = PrescriptionSchema.safeParse(wrong)
  console.log('── 实验 B：结构合法、语义错误的输出 ──')
  console.log(`   Zod 结果：${result.success ? '✅ 放行' : '❌ 拒绝'}`)
  console.log('   结论：Zod 只保证「形状对」，剂量 5 与 0.5 的差别它分辨不了。')
  console.log('   这一层需要业务规则或人工复核来补（见文章「永远过 Zod」一节）。\n')
}

// ── 实验 C：思考模式对照 ───────────────────────────────────────────────
async function runC(): Promise<void> {
  const sample = SAMPLES[0]
  const off = await chat(buildPrompt(sample), 'json_object', false)
  const on = await chat(buildPrompt(sample), 'json_object', true)
  console.log('── 实验 C：思考模式对照（同一条样本 S1，json_object 档）──')
  printTable(
    ['思考模式', 'Zod 通过', '推理 token', '总 token', 'finish_reason'],
    [
      ['关闭', String(judge(off.content, sample).schemaOk), String(off.reasoningTokens), String(off.totalTokens), off.finishReason],
      ['开启', String(judge(on.content, sample).schemaOk), String(on.reasoningTokens), String(on.totalTokens), on.finishReason],
    ],
  )
}

// ── 入口 ────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  printBudget('DeepSeek 结构化输出对照（A: 6×2，C: 2）', 14, 6000, 1)

  console.log('── 实验 A：两档可靠性（Prompt 约定 vs json_object）──')
  const rows = await runA()
  printTable(
    ['路径', '能解析 JSON', '通过 Zod', '完全正确', 'token 合计'],
    [summarizeA(rows, 'prompt'), summarizeA(rows, 'json_object')],
  )

  console.log('── 逐条明细 ──')
  printTable(
    ['样本', '路径', '通过 Zod', '缺失字段', '值漂移', 'finish'],
    rows.map((r) => [
      r.sample,
      r.mode,
      String(r.verdict.schemaOk),
      r.verdict.missing.join(',') || '-',
      r.verdict.drift.join('; ') || '-',
      r.finish,
    ]),
  )

  runB()
  await runC()
}

main().catch((err) => {
  console.error('\n❌ 实验失败：', err instanceof Error ? err.message : err)
  process.exit(1)
})
