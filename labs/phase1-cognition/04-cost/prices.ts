/**
 * 模型价格表（阶段一 · 第 04 篇实验用）
 *
 * ✅ 与本文件上一版（2026-10-28）的区别：
 *    - 模型名换成 2026-11 在售的（deepseek-flash / v4-pro、qwen3.8-flash / max、Claude 5.5 系列）
 *    - 每条都带 sourceNote，写清「这个数字从哪来、什么时候核对的」
 *    - 加 cachedInputPerM（缓存命中价），因为它是重复前缀场景下的成本放大器
 *    - 加 tokensPerTextNote：标注 tokenizer 口径差，防止误做横向比价
 *
 * ⚠️ 价格是快照，不是承诺。核对日期：2026-11-02。用之前请到 priceUrl 复核。
 *
 * 📚 知识点：为什么成本表必须「输入价 / 输出价」分开记？
 * 因为输出 token 通常比输入贵 4-10 倍。一个「输入很长、输出极短」的抽取任务，
 * 和一个「输入短、输出很长」的生成任务，成本结构完全不同——只记一个混合单价会算错，
 * 而且会算出「让模型少说废话没用」这种反直觉的错误结论。
 */

export interface ModelPrice {
  /** 稳定标识：路由、对比都按它查，不按展示名 includes（展示名一改就崩） */
  id: string
  /** 展示名 */
  name: string
  /** 厂商 */
  vendor: string
  /** 未命中缓存的输入单价：元 / 百万 token */
  inputPerM: number
  /** 缓存命中的输入单价：元 / 百万 token（undefined 表示该模型未公开此档） */
  cachedInputPerM?: number
  /** 输出单价：元 / 百万 token */
  outputPerM: number
  /** 上下文窗口（token） */
  contextWindow: number
  /** 类型：用于选型决策 */
  tier: '旗舰闭源' | '国产商用' | '开源可部署' | '推理档'
  /** 数据是否出境（医疗场景的硬门槛维度） */
  crossBorder: boolean
  /** 是否已核对过官方价格 */
  verified: boolean
  /** 官方定价页 */
  priceUrl: string
  /** 这个数字的来源与口径，一句话 */
  sourceNote: string
  /** tokenizer 口径提醒：不做归一化就不能横比单价 */
  tokensPerTextNote?: string
}

/** 美元折算汇率（2026-11-02 取值，只用于把美元价折成人民币做对比） */
export const USD_TO_CNY = 7.1

/** 峰谷价说明：DeepSeek 高峰时段（北京时间工作日 09:00-12:00、14:00-18:00）价格翻倍，本表取非高峰价 */
const DEEPSEEK_NOTE = '官方定价页 · 非高峰档（高峰翻倍）· 核对于 2026-11-02'

export const PRICES: ModelPrice[] = [
  {
    id: 'deepseek-flash',
    name: 'DeepSeek Flash',
    vendor: 'DeepSeek',
    inputPerM: 1,
    cachedInputPerM: 0.02,
    outputPerM: 4,
    contextWindow: 1_000_000,
    tier: '国产商用',
    crossBorder: false,
    verified: true,
    priceUrl: 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing',
    sourceNote: DEEPSEEK_NOTE,
  },
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek V4 Pro（思考档）',
    vendor: 'DeepSeek',
    inputPerM: 4.5,
    cachedInputPerM: 0.15,
    outputPerM: 13.5,
    contextWindow: 1_000_000,
    tier: '推理档',
    crossBorder: false,
    verified: true,
    priceUrl: 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing',
    sourceNote: DEEPSEEK_NOTE,
  },
  {
    id: 'qwen3.8-flash',
    name: '通义 Qwen3.8 Flash',
    vendor: '阿里云',
    inputPerM: 1.07,
    outputPerM: 3.34,
    contextWindow: 1_000_000,
    tier: '国产商用',
    crossBorder: false,
    verified: true,
    priceUrl: 'https://help.aliyun.com/zh/model-studio/models',
    sourceNote: 'OpenRouter 挂牌价 $0.15/$0.47 × 7.1 折算 · 官方以百炼控制台为准 · 核对于 2026-11-02',
  },
  {
    id: 'qwen3.8-max',
    name: '通义 Qwen3.8 Max',
    vendor: '阿里云',
    inputPerM: 14.2,
    outputPerM: 42.6,
    contextWindow: 1_000_000,
    tier: '国产商用',
    crossBorder: false,
    verified: true,
    priceUrl: 'https://help.aliyun.com/zh/model-studio/models',
    sourceNote: 'OpenRouter 挂牌价 $2/$6 × 7.1 折算 · 官方以百炼控制台为准 · 核对于 2026-11-02',
  },
  {
    id: 'claude-haiku-5.5',
    name: 'Claude Haiku 5.5',
    vendor: 'Anthropic',
    inputPerM: 0.71,
    cachedInputPerM: 0.071,
    outputPerM: 3.55,
    contextWindow: 1_000_000,
    tier: '旗舰闭源',
    crossBorder: true,
    verified: true,
    priceUrl: 'https://platform.claude.com/docs/en/about-claude/pricing',
    sourceNote: '官方定价页 $0.10/$0.50（prompt ≤ 100k）× 7.1 折算 · 核对于 2026-11-02',
    tokensPerTextNote: '4.7 及以后的 tokenizer 对同一段文本多约 30% token，横比前要归一化',
  },
  {
    id: 'claude-sonnet-5.5',
    name: 'Claude Sonnet 5.5',
    vendor: 'Anthropic',
    inputPerM: 14.2,
    cachedInputPerM: 0.71,
    outputPerM: 71,
    contextWindow: 1_000_000,
    tier: '旗舰闭源',
    crossBorder: true,
    verified: true,
    priceUrl: 'https://platform.claude.com/docs/en/about-claude/pricing',
    sourceNote: '官方定价页 $2/$10（缓存命中 5%）× 7.1 折算 · 核对于 2026-11-02',
    tokensPerTextNote: '4.7 及以后的 tokenizer 对同一段文本多约 30% token，横比前要归一化',
  },
]

/** 按稳定 id 取模型，找不到就明确报错，而不是返回 undefined 让后面崩在 `!` 上 */
export function pickPrice(id: string): ModelPrice {
  const found = PRICES.find((p) => p.id === id)
  if (!found) {
    throw new Error(`价格表里没有 id="${id}"，可选：${PRICES.map((p) => p.id).join(' / ')}`)
  }
  return found
}
