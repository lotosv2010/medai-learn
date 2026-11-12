/**
 * 阶段三 · 第 02 篇《上下文组装：一次调用里放了什么、各占多少》实验
 *
 * 实验 A：预算分配表——构造一次真实用药咨询调用的六类内容，统计每类 token 占比（纯本地，零调用）。
 * 实验 B：顺序对照实验里的隐藏变量——同一批「相似候选」上下文，temperature 0 vs 默认采样，
 *         看「中间那份唯一的 3 级」在采样下会不会漂移（24 次真实调用）。
 *
 * 跑法（仓库根目录）：
 *   nvm use 22
 *   pnpm --filter @medai/labs p3-assemble
 */

import { loadEnv, requireKey, printBudget, printTable } from '../../shared/env.ts'
import { measureBudget, assemble, type BlockKind } from '../_sdk/assemble.ts'
import { callModel } from '../_sdk/client.ts'
import { buildBlocks, buildThreeOrders } from './fixtures.ts'

const KIND_LABEL: Record<BlockKind, string> = {
  system: 'System Prompt',
  history: '对话历史',
  rag: '检索片段',
  toolDesc: '工具描述',
  toolResult: '工具结果',
  user: '用户输入',
}

// ── 实验 A：预算分配表（纯本地，零调用）──────────────────────────────────
console.log('═══ 实验 A：一次真实用药咨询调用里，六类内容各占多少 token ═══\n')

const budget = measureBudget(buildBlocks())
printTable(
  ['类别', 'token 数', '占比'],
  budget.map((r) => [KIND_LABEL[r.kind], String(r.tokens), `${(r.ratio * 100).toFixed(1)}%`]),
)

const histRatio = budget.find((r) => r.kind === 'history')?.ratio ?? 0
const toolRatio = budget.find((r) => r.kind === 'toolResult')?.ratio ?? 0
console.log(`   👉 历史 + 工具结果两类合计吃掉 ${((histRatio + toolRatio) * 100).toFixed(1)}% 的窗口`)
console.log('      预算失控通常不是检索片段，是历史与工具返回——它们每轮都在涨、还最容易写得冗长。\n')

// ── 实验 B：顺序对照实验里的隐藏变量（temperature）───────────────────────
const apiKey = requireKey(loadEnv(), 'DEEPSEEK_API_KEY', 'https://platform.deepseek.com/api_keys')

console.log('═══ 实验 B：temperature 是「顺序对照」实验里的隐藏变量 ═══\n')
console.log('   上下文：26 段「X-7 与 W 相互作用」档案，只有一段是「3 级」，其余 25 段是 1/2 级。')
console.log('   问法：风险等级是几级？只回答等级，不要解释。')
console.log('   对照：temperature=0（贪心，锁定最高概率 token） vs 默认采样（每 token 按概率抽）。\n')

/**
 * 判定：只把「给出确定的 3 级」算命中；答「2 级」或「无法确定」都不算。
 *
 * 📚 这条正则有两半，各管一件事——
 *   ① 命中半 /3\s*级|三级/：回答里必须出现「3 级」或「三级」才算「挑对了那一份」；
 *      \s* 允许「3」和「级」之间夹空格（模型偶尔输出「3 级（高）」这类带括号的写法）。
 *   ② 排除半 /无法|不一致|冲突|多个|不确定|矛盾|不能确定/：模型可能嘴上提到「3 级」，
 *      却又补一句「无法确定」——这种「摇摆回答」不算命中，它其实没锁定答案，只是把候选都念了一遍。
 *   两个条件 AND 起来：必须「明确说了 3 级」且「没有自我否定」。
 */
function committed(content: string): boolean {
  return /3\s*级|三级/.test(content) && !/无法|不一致|冲突|多个|不确定|矛盾|不能确定/.test(content)
}

interface Tally {
  hits: number
  total: number
  sample: string
}

const ROUNDS = 4 // 每位置每采样方式的轮数；小样本只看趋势，不做显著性判断

const tally = new Map<string, Tally>()
const orders = buildThreeOrders()

// 温度 0：头中尾各 ROUNDS 轮
for (let round = 1; round <= ROUNDS; round++) {
  for (const { label, blocks } of orders) {
    const messages = assemble(blocks, {})
    const r = await callModel(apiKey, messages, { temperature: 0 })
    const t = tally.get(`temp0·${label}`) ?? { hits: 0, total: 0, sample: '' }
    tally.set(`temp0·${label}`, {
      hits: t.hits + (committed(r.content) ? 1 : 0),
      total: t.total + 1,
      sample: r.content.replace(/\s+/g, ' ').slice(0, 30),
    })
  }
}

// 默认采样：头中尾各 ROUNDS 轮
for (let round = 1; round <= ROUNDS; round++) {
  for (const { label, blocks } of orders) {
    const messages = assemble(blocks, {})
    const r = await callModel(apiKey, messages)
    const t = tally.get(`采样·${label}`) ?? { hits: 0, total: 0, sample: '' }
    tally.set(`采样·${label}`, {
      hits: t.hits + (committed(r.content) ? 1 : 0),
      total: t.total + 1,
      sample: r.content.replace(/\s+/g, ' ').slice(0, 30),
    })
  }
}

// 拼最终对照表：每个位置一行 temperature=0、一行默认采样。
// 这里不用 flatMap + 内联 IIFE，改用直白的两层循环 push——让「每轮怎么累进」一眼可读，
// 避免函数式技巧盖过实验本身要传达的结论。
const resultRows: string[][] = []
for (const { label } of orders) {
  const t0 = tally.get(`temp0·${label}`)!
  const ts = tally.get(`采样·${label}`)!
  resultRows.push(['temperature = 0', label, `${t0.hits}/${t0.total}`, t0.sample])
  resultRows.push(['默认采样', label, `${ts.hits}/${ts.total}`, ts.sample])
}
printTable(['采样方式', '3 级档案的位置', `命中率（${ROUNDS} 轮）`, '最近一轮回答开头'], resultRows)

// 结论从真实计数算出，不写死——位置效应的「中间丢」在短上下文里未必每次都出现
const temp0All = orders.every(({ label }) => (tally.get(`temp0·${label}`)?.hits ?? 0) === ROUNDS)
const sampleMisses = orders.filter(({ label }) => (tally.get(`采样·${label}`)?.hits ?? 0) < ROUNDS).map(({ label }) => label)

console.log(`   读数一：temperature=0 这一列${temp0All ? ` ${ROUNDS * 3}/${ROUNDS * 3} 全中` : ' 也有缺失'}——贪心解码永远选最高概率 token，`)
console.log('           把「模型对某个位置信心不足、在相似候选间漂移」这件事整个藏了起来。')
if (sampleMisses.length > 0) {
  console.log(`   读数二：默认采样下出现了漂移，发生在：${sampleMisses.join('、')}——`)
  console.log('           哪个位置漂，跑一轮一个样；样本太小，不能拿它当「位置效应」的证据。')
} else {
  console.log('   读数二：默认采样这一轮没有漂移——这本身也是证据：小样本下采样漂移是「偶发」不是「必然」。')
}
console.log('   结论：做「顺序 / 编排」对照实验，temperature 是必须显式控制的变量——')
console.log('         不掐住它，你测到的不是「位置」，是「采样随机性」；多轮统计才敢下结论。')
console.log('         而「关键信息放头尾」的干净证据，在阶段一 needle 实验（9 格矩阵）与 Lost in the Middle 论文里；')
console.log('         本篇实验 B 补的是方法这一课：对照实验先掐住温度。\n')

const totalCalls = ROUNDS * 3 * 2
printBudget(`实验 B 顺序×采样对照 2 组 × 3 位置 × ${ROUNDS} 轮 = ${totalCalls} 次调用`, totalCalls, 1300, 1)
