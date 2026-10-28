import { printTable } from '../../shared/env.ts'
import { PRICES, type ModelPrice } from './prices.ts'

/**
 * 阶段一 · 第 04 篇实验：模型选型与成本估算（纯本地计算，¥0）
 *
 * 要验证两件事：
 *   1. 单价差 10 倍的模型，月成本可能差一个数量级
 *   2. 加入模型路由（70% 简单任务走小模型 + 30% 复杂走大模型）能再省一半以上
 *
 * 核心结论：成本是设计出来的，不是省出来的。
 */

interface Workload {
  label: string
  dailyCalls: number
  inputTokens: number
  outputTokens: number
}

const WORKLOADS: Workload[] = [
  { label: '用药咨询助手（原型期）', dailyCalls: 1_000, inputTokens: 800, outputTokens: 300 },
  { label: '用药咨询助手（成长期）', dailyCalls: 10_000, inputTokens: 1_200, outputTokens: 400 },
]

const DAYS_PER_MONTH = 30

/** 单次调用的成本（元） */
function costPerCall(m: ModelPrice, w: Workload): number {
  return (w.inputTokens * m.inputPerM + w.outputTokens * m.outputPerM) / 1_000_000
}

/** 月成本（元） */
function monthlyCost(m: ModelPrice, w: Workload): number {
  return costPerCall(m, w) * w.dailyCalls * DAYS_PER_MONTH
}

function fmtYuan(n: number): string {
  if (n >= 10_000) return `¥${(n / 10_000).toFixed(2)} 万`
  if (n >= 1) return `¥${n.toFixed(0)}`
  return `¥${n.toFixed(2)}`
}

function printSingleModelTable(w: Workload): void {
  console.log(`\n${'═'.repeat(72)}`)
  console.log(`场景：${w.label}（日均 ${w.dailyCalls} 次 · 输入 ${w.inputTokens} / 输出 ${w.outputTokens} token）`)
  console.log('═'.repeat(72))

  const rows = PRICES.map((m) => [
    m.name,
    m.tier,
    m.crossBorder ? '是 ⚠️' : '否',
    fmtYuan(costPerCall(m, w)),
    fmtYuan(monthlyCost(m, w)),
  ])
  printTable(['模型', '类型', '数据出境', '每次成本', '月成本'], rows)
}

/**
 * 模型路由：把简单任务分给小模型、复杂任务分给大模型
 *
 * 📚 为什么路由能省这么多？
 * 因为「简单任务」在真实业务里往往占 70% 以上（查药品名、问禁忌、要一句提醒），
 * 而它们的输出质量在小模型上和大模型几乎无差别。
 * 花钱的大头是那 30% 真正需要推理的问题——把它们单独挑出来用强模型，总成本能砍掉一多半。
 */
function printRoutingComparison(w: Workload): void {
  const cheap = PRICES.find((m) => m.name.includes('qwen-plus'))!
  const strong = PRICES.find((m) => m.name.includes('Sonnet'))!

  const allStrong = monthlyCost(strong, w)
  const routed = monthlyCost(cheap, w) * 0.7 + monthlyCost(strong, w) * 0.3

  console.log(`\n${'═'.repeat(72)}`)
  console.log(`模型路由对比：70% 简单任务 → ${cheap.name}，30% 复杂任务 → ${strong.name}`)
  console.log('═'.repeat(72))
  printTable(
    ['方案', '月成本', '相对全用大模型'],
    [
      ['全部走强模型', fmtYuan(allStrong), '100%'],
      ['70/30 路由', fmtYuan(routed), `${((routed / allStrong) * 100).toFixed(1)}%`],
      ['节省', fmtYuan(allStrong - routed), `-${((1 - routed / allStrong) * 100).toFixed(1)}%`],
    ],
  )
}

function printSelectionGuide(): void {
  console.log(`\n${'═'.repeat(72)}`)
  console.log('选型决策：四个维度按顺序过一遍')
  console.log('═'.repeat(72))
  console.log(`
  1. 合规先行（医疗数据的硬门槛）
     数据能否出境？不能 → 只看境内模型或私有化部署（crossBorder = 否）
     ↓ 过滤后剩下的才是候选集

  2. 任务复杂度（决定要不要推理模型）
     多步逻辑 / 数值推算 → 推理模型
     抽取 / 分类 / 改写     → 不需要，用推理模型是纯浪费

  3. 上下文需求（决定窗口下限）
     单轮短问答      → 32K 足够
     长文档理解      → 128K 起
     ↑ 但注意：窗口大 ≠ 该塞满，见第 01 篇的 Lost in the Middle

  4. 成本（最后算，不是最先看）
     把单价换算成「每次问诊成本」× 日均量 × 30 → 月账单
     再评估路由能省多少
`)
}

function warnUnverified(): void {
  const unverified = PRICES.filter((p) => !p.verified)
  if (unverified.length === 0) return
  console.log(`\n⚠️  以下 ${unverified.length} 个模型的价格尚未核对官方页面：`)
  for (const m of unverified) console.log(`   · ${m.name} → ${m.priceUrl}`)
  console.log('   上面的数字只能用来理解「估算方法」，不能直接当作结论写进备忘录。')
  console.log('   核对后把 labs/phase1-cognition/04-cost/prices.ts 里的 verified 改成 true。\n')
}

function main(): void {
  console.log('💰 模型选型与成本估算（纯本地计算，不调 API，花费 ¥0）')

  for (const w of WORKLOADS) printSingleModelTable(w)
  printRoutingComparison(WORKLOADS[0])
  printSelectionGuide()
  warnUnverified()

  console.log('💡 三个可以带走的结论：')
  console.log('   1. 单价便宜 10 倍 ≠ 月成本便宜 10 倍，但通常差一个数量级')
  console.log('   2. 模型路由能再省一半以上，且用户几乎感知不到')
  console.log('   3. 成本是设计出来的，不是省出来的——所以阶段二要先把「多模型可切换」做出来\n')
  console.log('📦 阶段一交付物：把本表 + 第 02/03 篇结论整理成')
  console.log('   docs/articles/00 AI/01 认知地基/模型选型与成本估算备忘录.md\n')
}

main()
