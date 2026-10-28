/**
 * 模型价格表（阶段一实验用）
 *
 * ⚠️ 重要：这里的价格是**待核对的示例值**，只用于让脚本能跑通、让你理解估算方法。
 *    真实报价随时变动，用之前必须去官方页面核对并改成你查到的数字，
 *    把 `verified` 改成 true。脚本会提示你还有哪些没核对。
 *
 * 官方定价页：
 *   - DeepSeek：https://platform.deepseek.com/api-docs/pricing
 *   - 通义千问：https://help.aliyun.com/zh/model-studio/models
 *   - Anthropic：https://www.anthropic.com/pricing#api
 *   - OpenAI：https://openai.com/api/pricing/
 *   - 智谱 GLM：https://open.bigmodel.cn/pricing
 *
 * 📚 知识点：为什么成本表要「输入价 / 输出价」分开记？
 * 因为输出 token 通常比输入贵 3-5 倍。一个「输入很长、输出极短」的抽取任务，
 * 和一个「输入短、输出很长」的生成任务，成本结构完全不同——只记一个混合单价会算错。
 */

export interface ModelPrice {
  /** 展示名 */
  name: string
  /** 厂商 */
  vendor: string
  /** 输入单价：元 / 百万 token */
  inputPerM: number
  /** 输出单价：元 / 百万 token */
  outputPerM: number
  /** 上下文窗口（token） */
  contextWindow: number
  /** 类型：用于选型决策 */
  tier: '旗舰闭源' | '国产商用' | '开源可部署' | '推理专用'
  /** 数据是否出境（医疗场景关键维度） */
  crossBorder: boolean
  /** 是否已核对过官方价格 */
  verified: boolean
  priceUrl: string
}

export const PRICES: ModelPrice[] = [
  {
    name: 'Claude Haiku 5.5',
    vendor: 'Anthropic',
    inputPerM: 8,
    outputPerM: 40,
    contextWindow: 200_000,
    tier: '旗舰闭源',
    crossBorder: true,
    verified: false,
    priceUrl: 'https://www.anthropic.com/pricing#api',
  },
  {
    name: 'Claude Sonnet 5.5',
    vendor: 'Anthropic',
    inputPerM: 24,
    outputPerM: 120,
    contextWindow: 200_000,
    tier: '旗舰闭源',
    crossBorder: true,
    verified: false,
    priceUrl: 'https://www.anthropic.com/pricing#api',
  },
  {
    name: '通义千问 qwen-plus',
    vendor: '阿里云',
    inputPerM: 0.8,
    outputPerM: 2,
    contextWindow: 128_000,
    tier: '国产商用',
    crossBorder: false,
    verified: false,
    priceUrl: 'https://help.aliyun.com/zh/model-studio/models',
  },
  {
    name: 'DeepSeek chat',
    vendor: 'DeepSeek',
    inputPerM: 2,
    outputPerM: 8,
    contextWindow: 128_000,
    tier: '国产商用',
    crossBorder: false,
    verified: false,
    priceUrl: 'https://platform.deepseek.com/api-docs/pricing',
  },
  {
    name: 'DeepSeek reasoner',
    vendor: 'DeepSeek',
    inputPerM: 4,
    outputPerM: 16,
    contextWindow: 128_000,
    tier: '推理专用',
    crossBorder: false,
    verified: false,
    priceUrl: 'https://platform.deepseek.com/api-docs/pricing',
  },
  {
    name: 'Qwen 开源版（自部署参考）',
    vendor: '阿里云开源',
    inputPerM: 0.3,
    outputPerM: 0.3,
    contextWindow: 32_000,
    tier: '开源可部署',
    crossBorder: false,
    verified: false,
    priceUrl: 'https://help.aliyun.com/zh/model-studio/models',
  },
]
