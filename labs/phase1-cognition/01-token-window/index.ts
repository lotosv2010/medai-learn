import { countTokens } from 'gpt-tokenizer'
import { loadEnv, requireKey, printBudget, printTable } from '../../shared/env.ts'

/**
 * 阶段一 · 第 01 篇实验：Token 与上下文窗口
 *
 * 实验 A：中英文 / 代码的 token 密度对照（本地计算，0 成本）
 * 实验 B：needle-in-a-haystack——把唯一事实埋在长文本的开头 / 中间 / 结尾
 *
 * 要看见：中间位置的失败率显著高于两头；长度越长，整体失败率越高。
 * 这就是 Lost in the Middle——「塞进去」和「读到」是两件事。
 */

// ──────────────────────────────────────────────────────────
// 实验 A：token 密度对照
// ──────────────────────────────────────────────────────────

const SAME_MEANING = {
  中文: '阿莫西林胶囊适用于敏感菌所致的上呼吸道感染，成人常用量为每次零点五克，每六至八小时一次。',
  英文: 'Amoxicillin capsules are indicated for upper respiratory tract infections caused by susceptible bacteria. The usual adult dose is 0.5 g every 6 to 8 hours.',
  代码: "const dose = { adult: 0.5, unit: 'g', intervalHours: 8 }",
}

function experimentA(): void {
  console.log('\n' + '═'.repeat(64))
  console.log('实验 A：同一语义，不同写法的 token 消耗')
  console.log('═'.repeat(64))

  const rows = Object.entries(SAME_MEANING).map(([label, text]) => {
    const tokens = countTokens(text)
    const chars = text.length
    return [label, String(chars), String(tokens), (tokens / chars).toFixed(2)]
  })

  printTable(['写法', '字符数', 'token 数', 'token/字符'], rows)

  const zhTokens = countTokens(SAME_MEANING.中文)
  const enTokens = countTokens(SAME_MEANING.英文)
  console.log(`💡 中文是英文的 ${(zhTokens / enTokens).toFixed(2)} 倍 token。`)
  console.log('   原因：主流 tokenizer 以英文语料训练，一个汉字常被切成 1-2 个 token，')
  console.log('   而一个常见英文单词往往只占 1 个。同样的语义，中文 prompt 更贵。\n')
  console.log('   ⚠️ 注意：这里用的是 GPT 的 tokenizer，各家模型的分词器不同，')
  console.log('      绝对数值会有差异，但「中文更贵」这个结论是普遍的。\n')
}

// ──────────────────────────────────────────────────────────
// 实验 B：needle-in-a-haystack
// ──────────────────────────────────────────────────────────

const NEEDLE_FACT = '本批号药品的召回截止日是 2027 年 3 月 15 日。'
const QUESTION = '请问本批号药品的召回截止日是哪一天？只回答日期，不要解释。'

/** 生成填充文本，逼近目标 token 数 */
function buildHaystack(targetTokens: number): string {
  const fillerParagraph =
    '本院药学部定期发布药品管理与使用规范说明，内容涵盖药品储存条件、有效期管理、' +
    '处方审核流程、不良反应上报机制、临床用药监测指标以及药品调剂操作规范等方面。' +
    '各科室应严格遵照执行，定期组织学习与考核，确保用药安全与医疗质量持续改进。\n'
  const perParagraph = countTokens(fillerParagraph)
  const repeat = Math.max(1, Math.floor(targetTokens / perParagraph))
  return fillerParagraph.repeat(repeat)
}

/** 把 needle 放到指定位置 */
function placeNeedle(haystack: string, position: 'head' | 'middle' | 'tail'): string {
  if (position === 'head') return NEEDLE_FACT + '\n\n' + haystack
  if (position === 'tail') return haystack + '\n\n' + NEEDLE_FACT
  const mid = Math.floor(haystack.length / 2)
  return haystack.slice(0, mid) + '\n\n' + NEEDLE_FACT + '\n\n' + haystack.slice(mid)
}

interface Probe {
  size: number
  position: 'head' | 'middle' | 'tail'
  actualTokens: number
  answered: boolean
  answer: string
}

async function askLong(baseURL: string, apiKey: string, model: string, content: string): Promise<string> {
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: content + '\n\n' + QUESTION }],
      temperature: 0,
    }),
  })
  if (!res.ok) throw new Error(`请求失败 ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  return json.choices?.[0]?.message?.content?.trim() ?? ''
}

async function experimentB(): Promise<void> {
  const env = loadEnv()
  const apiKey = requireKey(env, 'DEEPSEEK_API_KEY', 'https://platform.deepseek.com/api_keys')
  const baseURL = 'https://api.deepseek.com/v1'
  const model = 'deepseek-chat'

  const SIZES = [5_000, 20_000, 80_000]
  const POSITIONS: Array<'head' | 'middle' | 'tail'> = ['head', 'middle', 'tail']

  // 粗估：9 次调用，平均输入 35k token
  printBudget('needle-in-a-haystack（3 长度 × 3 位置）', 9, 315_000, 2)

  const probes: Probe[] = []
  for (const size of SIZES) {
    for (const position of POSITIONS) {
      const haystack = buildHaystack(size)
      const content = placeNeedle(haystack, position)
      const actualTokens = countTokens(content)
      process.stdout.write(`⏳ ${size / 1000}k · ${position}（实际 ${actualTokens} token）... `)
      try {
        const answer = await askLong(baseURL, apiKey, model, content)
        const ok = answer.includes('2027') && answer.includes('3') && answer.includes('15')
        console.log(ok ? '✅ 命中' : `❌ 未命中 → ${answer.slice(0, 40)}`)
        probes.push({ size, position, actualTokens, answered: ok, answer })
      } catch (err) {
        console.log(`✗ ${(err as Error).message}`)
        probes.push({ size, position, actualTokens, answered: false, answer: 'ERROR' })
      }
    }
  }

  console.log('\n📊 命中矩阵（行 = 上下文长度，列 = 关键事实位置）')
  printTable(
    ['长度', '开头', '中间', '结尾'],
    SIZES.map((size) => {
      const cells = POSITIONS.map((p) => {
        const probe = probes.find((x) => x.size === size && x.position === p)
        return probe?.answered ? '✅' : '❌'
      })
      return [`${size / 1000}k`, ...cells]
    }),
  )

  const middleRate = probes.filter((p) => p.position === 'middle' && p.answered).length / 3
  const edgeRate =
    probes.filter((p) => p.position !== 'middle' && p.answered).length / 6
  console.log(`💡 中间位置命中率 ${(middleRate * 100).toFixed(0)}%，两头平均 ${(edgeRate * 100).toFixed(0)}%。`)
  console.log('   若两者差距明显 → 你刚亲手复现了 Lost in the Middle。')
  console.log('   这不是模型「不够聪明」，是注意力在长序列里被稀释了。')
  console.log('   → 所以「窗口有 128K 就整本丢进去」是错误直觉；怎么排布内容，留到阶段三。\n')
}

async function main(): Promise<void> {
  experimentA()
  const env = loadEnv()
  if (!env.DEEPSEEK_API_KEY) {
    console.log('⚠️  未配置 DEEPSEEK_API_KEY，跳过实验 B（needle-in-a-haystack）。')
    console.log('   实验 A 是纯本地计算，已经跑完了。\n')
    return
  }
  await experimentB()
}

main().catch((err) => {
  console.error('❌ 实验失败：', err)
  process.exit(1)
})
