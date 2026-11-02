import { printTable } from '../../shared/env.ts'
import { PRICES, pickPrice, USD_TO_CNY, type ModelPrice } from './prices.ts'

/**
 * 阶段一 · 第 04 篇实验：模型选型与成本估算（纯本地计算，¥0）
 *
 * 要验证四件事：
 *   1. 单价差 10 倍的模型，月成本可能差一个数量级
 *   2. 输出价比输入价贵 3-5 倍 → 「让它少说废话」就是最直接的省钱手段
 *   3. 缓存命中价能到未命中价的 1/20 上下 → 重复前缀场景的成本结构完全不同
 *   4. 模型路由（70% 简单任务走小模型 + 30% 复杂走大模型）能再省一半以上
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

/** 单次调用的成本（元）。cacheHitRatio 表示输入里有多少比例命中缓存 */
function costPerCall(m: ModelPrice, w: Workload, cacheHitRatio = 0): number {
  const cachePrice = m.cachedInputPerM ?? m.inputPerM
  const inputCost = w.inputTokens * (1 - cacheHitRatio) * m.inputPerM + w.inputTokens * cacheHitRatio * cachePrice
  return (inputCost + w.outputTokens * m.outputPerM) / 1_000_000
}

function monthlyCost(m: ModelPrice, w: Workload, cacheHitRatio = 0): number {
  return costPerCall(m, w, cacheHitRatio) * w.dailyCalls * DAYS_PER_MONTH
}

function dailyCost(m: ModelPrice, w: Workload): number {
  return costPerCall(m, w) * w.dailyCalls
}

/** 大额用「万」、小额保留两位，避免 ¥0.002 被压成 ¥0 */
function fmtYuan(n: number): string {
  if (n >= 10_000) return `¥${(n / 10_000).toFixed(2)} 万`
  if (n >= 1) return `¥${n.toFixed(0)}`
  if (n >= 0.01) return `¥${n.toFixed(2)}`
  return `¥${n.toFixed(4)}`
}

function printSingleModelTable(w: Workload): void {
  console.log(`\n${'═'.repeat(78)}`)
  console.log(`场景：${w.label}（日均 ${w.dailyCalls} 次 · 输入 ${w.inputTokens} / 输出 ${w.outputTokens} token）`)
  console.log('═'.repeat(78))

  const rows = PRICES.map((m) => [
    m.name,
    m.tier,
    m.crossBorder ? '是 ⚠️' : '否',
    fmtYuan(costPerCall(m, w)),
    fmtYuan(dailyCost(m, w)),
    fmtYuan(monthlyCost(m, w)),
  ])
  printTable(['模型', '类型', '数据出境', '每次成本', '日成本', '月成本'], rows)
}

/**
 * 缓存命中对账单的影响
 *
 * 📚 为什么单独算这一组？
 * 「同一个 System Prompt + 同一份药品说明书」是医疗问答的常态。
 * 这类重复前缀如果走缓存，输入价能降到 1/20 上下——但它只对「前缀完全一致」的部分生效。
 * 具体的缓存排布策略属于上下文工程（阶段三），本篇只算清它对钱的影响。
 */
function printCacheScenario(): void {
  const w = WORKLOADS[1]
  const targets = [pickPrice('deepseek-flash'), pickPrice('claude-sonnet-5.5')]
  const ratios = [0, 0.5, 0.8]

  console.log(`\n${'═'.repeat(78)}`)
  console.log(`缓存命中的影响：${w.label}（输入 ${w.inputTokens} token，其中部分为重复前缀）`)
  console.log(`汇率按 1 美元 = ${USD_TO_CNY} 元折算`)
  console.log('═'.repeat(78))

  const rows = targets.flatMap((m) =>
    ratios.map((r) => [
      m.name,
      `${(r * 100).toFixed(0)}%`,
      m.cachedInputPerM === undefined ? '未公开' : fmtYuan(monthlyCost(m, w, r)),
    ]),
  )
  printTable(['模型', '输入命中率', '月成本'], rows)
}

/**
 * 模型路由：把简单任务分给小模型、复杂任务分给大模型
 *
 * 📚 为什么路由能省这么多？
 * 因为「简单任务」在真实业务里往往占 70% 以上（查药品名、问禁忌、要一句提醒），
 * 而它们在小模型上的输出质量和大模型几乎无差别。
 * 花钱的大头是那 30% 真正需要推理的问题——单独挑出来用强模型，总成本能砍掉一多半。
 */
function printRoutingComparison(w: Workload, cheapId: string, strongId: string, label: string): void {
  const cheap = pickPrice(cheapId)
  const strong = pickPrice(strongId)
  const split = 0.7

  const allStrong = monthlyCost(strong, w)
  const routed = monthlyCost(cheap, w) * split + monthlyCost(strong, w) * (1 - split)

  console.log(`\n${'═'.repeat(78)}`)
  console.log(`路由对比（${label}）：70% 简单任务 → ${cheap.name}，30% 复杂任务 → ${strong.name}`)
  console.log('═'.repeat(78))
  printTable(
    ['方案', '月成本', '相对全用强模型'],
    [
      ['全部走强模型', fmtYuan(allStrong), '100%'],
      [`${(split * 100).toFixed(0)}/${((1 - split) * 100).toFixed(0)} 路由`, fmtYuan(routed), `${((routed / allStrong) * 100).toFixed(1)}%`],
      ['节省', fmtYuan(allStrong - routed), `-${((1 - routed / allStrong) * 100).toFixed(1)}%`],
    ],
  )
}

/**
 * 单价不可直接横比的三条口径
 *
 * 📚 这是本篇最容易被跳过、也最容易在面试里露怯的一段：
 * 「A 的单价是 B 的一半，所以 A 便宜」——这句话在没有归一化口径之前不成立。
 */
function printPriceCaveats(): void {
  console.log(`\n${'═'.repeat(78)}`)
  console.log('比价前必须先统一的三条口径')
  console.log('═'.repeat(78))
  console.log(`
  1. 输入价 ≠ 输出价
     输出普遍比输入贵 3-5 倍（本表里 DeepSeek V4 Pro 是 3 倍，Claude Sonnet 5.5 是 5 倍）。
     所以「同一句话答得更短」比「换一个更便宜的模型」有时更有效。

  2. 缓存命中价可能是未命中价的 1/20
     DeepSeek Flash：¥0.02 vs ¥1；Claude Sonnet 5.5：¥0.71 vs ¥14.2。
     重复前缀（长 System Prompt、固定说明书）走缓存和不走，是两个成本结构。

  3. tokenizer 不同，token 数就不同
     Claude 4.7 及以后的 tokenizer 对同一段文本产出比旧版多约 30% token；
     中文又比英文多花 token（第 01 篇）。不做 token 归一化，单价比较没有意义。

  → 面试里被问「哪个模型更便宜」，正确开场是反问这三件事，不是直接报单价。
`)
}

function printSelectionGuide(): void {
  console.log(`\n${'═'.repeat(78)}`)
  console.log('选型决策：四个维度按顺序过一遍')
  console.log('═'.repeat(78))
  console.log(`
  1. 合规先行（医疗数据的硬门槛）
     数据能否出境？不能 → 只看境内模型或私有化部署（crossBorder = 否）
     ↓ 过滤后剩下的才是候选集

  2. 任务复杂度（决定要不要推理档）
     多步逻辑 / 数值推算 → 开思考档
     抽取 / 分类 / 改写    → 不需要，开思考是纯浪费

  3. 上下文需求（决定窗口下限）
     单轮短问答      → 32K 足够
     长文档理解      → 128K 起
     ↑ 但注意：窗口大 ≠ 该塞满，见第 01 篇的 Lost in the Middle

  4. 成本（最后算，不是最先看）
     把单价换算成「每次问诊成本」× 日均量 × 30 → 月账单
     再评估缓存与路由能省多少
`)
}

function warnUnverified(): void {
  const unverified = PRICES.filter((p) => !p.verified)
  if (unverified.length === 0) {
    console.log('✅ 本表 6 条价格均已核对，核对日期见 prices.ts 的 sourceNote。\n')
    return
  }
  console.log(`\n⚠️  以下 ${unverified.length} 个模型的价格尚未核对官方页面：`)
  for (const m of unverified) console.log(`   · ${m.name} → ${m.priceUrl}`)
  console.log('   上面的数字只能用来理解「估算方法」，不能直接当作结论写进备忘录。\n')
}

function main(): void {
  console.log('💰 模型选型与成本估算（纯本地计算，不调 API，花费 ¥0）')
  console.log(`   价格核对日期：2026-11-02 · 汇率 1 USD = ${USD_TO_CNY} CNY`)

  for (const w of WORKLOADS) printSingleModelTable(w)
  printCacheScenario()
  printRoutingComparison(WORKLOADS[1], 'deepseek-flash', 'deepseek-v4-pro', '同厂商双档')
  printRoutingComparison(WORKLOADS[1], 'deepseek-flash', 'claude-sonnet-5.5', '跨厂商')
  printPriceCaveats()
  printSelectionGuide()
  warnUnverified()

  console.log('💡 四个可以带走的结论：')
  console.log('   1. 单价便宜 10 倍 ≠ 月成本便宜 10 倍，但通常差一个数量级')
  console.log('   2. 输出价比输入价贵 3-5 倍，控制回答长度是被低估的省钱手段')
  console.log('   3. 缓存能把重复前缀的输入价降到 1/20，路由能再省一半以上')
  console.log('   4. 成本是设计出来的，不是省出来的——所以阶段二要先把「多模型可切换」做出来\n')
  console.log('📦 阶段一交付物：把本表 + 第 02/03 篇结论整理成')
  console.log('   docs/articles/00 AI/01 认知地基/模型选型与成本估算备忘录.md\n')
}

try {
  main()
} catch (err) {
  console.error('❌ 实验失败：', err)
  process.exit(1)
}
