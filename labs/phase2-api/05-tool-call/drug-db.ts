/**
 * 阶段二 · 第 05 篇《Function Calling：模型只写调用单，不执行》实验 —— 本地 mock 药品库
 *
 * 只存「药物相互作用规则」，不连任何真实数据库。
 * 刻意与 tools.ts 分离存放：07 篇会把工具执行器搬进 SDK，mock 库要能原样挪走。
 *
 * 📚 知识点：为什么库要独立成一个文件？
 * 模型永远够不到这个文件——它只能「说想查什么」，真正读库的是你的代码。
 * 把数据放哪、怎么查，全是代码的职责，与模型无关。
 */

export interface InteractionRule {
  drugA: string
  drugB: string
  level: '禁止联用' | '慎用' | '注意' | '安全'
  note: string
}

/** mock 库中「已知」的药名，只有这些名字能被查中 */
export const DRUG_NAMES = [
  '阿莫西林',
  '布洛芬',
  '甲硝唑',
  '华法林',
  '二甲双胍',
  '辛伐他汀',
  '奥美拉唑',
  '左氧氟沙星',
  '氯吡格雷',
  '阿司匹林',
  '苯妥英钠',
  '地高辛',
] as const

/** 10 条相互作用规则（示例数据，仅作演示，不作用药依据） */
export const RULES: InteractionRule[] = [
  { drugA: '阿莫西林', drugB: '布洛芬', level: '安全', note: '无明确相互作用，但两者都可能刺激胃肠道，联用建议随餐服用' },
  { drugA: '阿莫西林', drugB: '甲硝唑', level: '注意', note: '抗菌谱互补，常用于根除幽门螺杆菌，需遵医嘱联合用药' },
  { drugA: '阿莫西林', drugB: '华法林', level: '慎用', note: '可能增强华法林抗凝作用，联用期间需监测 INR' },
  { drugA: '华法林', drugB: '阿司匹林', level: '禁止联用', note: '两者都增加出血风险，联用可致严重出血' },
  { drugA: '华法林', drugB: '氯吡格雷', level: '慎用', note: '抗凝与抗血小板叠加，出血风险显著升高' },
  { drugA: '二甲双胍', drugB: '左氧氟沙星', level: '注意', note: '可能影响血糖，联用期间加强血糖监测' },
  { drugA: '辛伐他汀', drugB: '阿奇霉素', level: '注意', note: '阿奇霉素可升高辛伐他汀血药浓度，增加肌病风险' },
  { drugA: '奥美拉唑', drugB: '氯吡格雷', level: '注意', note: '奥美拉唑可能降低氯吡格雷抗血小板活性' },
  { drugA: '苯妥英钠', drugB: '奥美拉唑', level: '慎用', note: '奥美拉唑抑制苯妥英钠代谢，血药浓度升高' },
  { drugA: '地高辛', drugB: '呋塞米', level: '慎用', note: '呋塞米引起低钾，可增强地高辛毒性' },
]

/**
 * 查询两药的相互作用。查到返回说明文本；查不到（药名不在库或规则未覆盖）返回「暂无数据」。
 *
 * ⚠️ 注意这个返回值的措辞：它返回的是「数据库里没有记录」，不是「没有相互作用」。
 * 实验 B 里模型正是把这句话曲解成了「可以一起吃」——这就是参数幻觉 / 误导结论的现场。
 */
export function lookupInteraction(drugA: string, drugB: string): string {
  const a = RULES.find((r) => (r.drugA === drugA && r.drugB === drugB) || (r.drugA === drugB && r.drugB === drugA))
  if (!a) return `暂无数据：未收录「${drugA}」与「${drugB}」的相互作用记录`
  return `${a.level}：${a.note}`
}
