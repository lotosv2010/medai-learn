/**
 * 阶段二 · 第 01 篇《多模型接入与降级链》实验（真实调用版）
 *
 * 只做一件事：读 key → fetch 一次 DeepSeek chat/completions → 打印
 *   1. 请求体（脱敏，key 在 header 不打印）
 *   2. 模型回复
 *   3. token 用量（账单的计量单位）
 *   4. 归一化后的 ChatResult（对应文章「归一化的两层设计」里的形状层）
 *
 * 不引任何 SDK，所有细节裸露在外，方便对着文章看「一次调用长什么样」。
 *
 * 跑法（仓库根目录）：
 *   nvm use 22
 *   pnpm --filter @medai/labs p2-router
 * 花费约 ¥0.01（一次调用，十几 token 级）。
 */

import { loadEnv, printTable } from '../../shared/env.ts'

const BASE_URL = 'https://api.deepseek.com'
const MODEL = 'deepseek-chat'
const QUESTION = '阿莫西林胶囊的常见不良反应有哪些？请用三句话概括。'

// ── 归一化：形状层（对应文章「深入 · 归一化的两层设计」）────────────────
interface ChatResult {
  content: string
  usage: { prompt: number; completion: number; cached?: number }
  finishReason: string
  raw: unknown
}

interface OpenAICompatResponse {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string | null }>
  usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } }
}

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

async function main(): Promise<void> {
  const env = loadEnv()
  const apiKey = env['DEEPSEEK_API_KEY']
  console.log('🔑 DEEPSEEK_API_KEY：', apiKey ? '已配置 ✅' : '未配置 ❌')
  if (!apiKey) {
    console.error('❌ 未配置 DEEPSEEK_API_KEY')
    console.error('   配置：cp .env.local.example .env.local 后填入 DEEPSEEK_API_KEY=')
    console.error('   获取：https://platform.deepseek.com/api_keys')
    process.exit(1)
  }

  console.log(`❓ 问题：${QUESTION}\n`)
  console.log('📤 请求体（key 在 header，不在此处）：')
  console.log(JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: QUESTION }] }, null, 2))

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

  const json = (await res.json()) as unknown
  const result = normalizeOpenAICompat(json)

  console.log('\n📥 回复：')
  console.log(result.content.trim())

  console.log('\n📊 归一化后的 ChatResult：')
  printTable(
    ['字段', '值'],
    [
      ['content（前 20 字）', result.content.slice(0, 20)],
      ['usage.prompt', String(result.usage.prompt)],
      ['usage.completion', String(result.usage.completion)],
      ['finishReason', result.finishReason],
    ],
  )
  console.log('   （这就是账单的计量单位——你付费买的是 token 数，不是「答案」）')
}

main().catch((err) => {
  console.error('❌ 实验失败：', err)
  process.exit(1)
})
