/**
 * 阶段二 · 第 06 篇《Embedding：把「意思相近」变成一道可以算的减法》实验样本
 *
 * 12 段说明书片段 + 5 个查询。片段刻意覆盖 6 类，并埋了两处「向量会骗人」的雷：
 *   - S5（禁止饮酒）与 S6（可少量饮酒）：否定/肯定几乎同一词面，向量可能分不清
 *   - S7（成人剂量）与 S8（儿童剂量）：数字不敏感，可能互相串位
 * 实测（2026-11-11，qwen3-embedding:0.6b）两处雷都爆了：
 *   「能否饮酒」Top-1 是 S6 而非 S5；「儿童剂量」Top-2 是 S7。
 */

export interface Sample {
  id: string
  category: string
  text: string
}

export const SAMPLES: Sample[] = [
  { id: 'S1', category: '适应症', text: '阿莫西林胶囊用于敏感菌所致的上呼吸道感染、皮肤软组织感染等。' },
  { id: 'S2', category: '适应症', text: '布洛芬缓释胶囊用于缓解轻至中度疼痛，如头痛、关节痛、牙痛、痛经。' },
  { id: 'S3', category: '禁忌', text: '对青霉素类抗生素过敏者禁用本品。' },
  { id: 'S4', category: '禁忌', text: '活动性消化道溃疡、胃肠道出血者禁用布洛芬。' },
  { id: 'S5', category: '相互作用', text: '服用甲硝唑期间及停药后 7 日内禁止饮酒，否则可能引起双硫仑样反应。' },
  { id: 'S6', category: '相互作用', text: '服用本品期间可少量饮酒，但建议避免大量或空腹饮酒。' },
  { id: 'S7', category: '用法用量', text: '成人一次 0.5g，每 6～8 小时一次，一日剂量不超过 4g。' },
  { id: 'S8', category: '用法用量', text: '儿童按体重一日 20～40mg/kg，分 3 次服用。' },
  { id: 'S9', category: '特殊人群', text: '孕妇及哺乳期妇女慎用，应在医生指导下使用。' },
  { id: 'S10', category: '特殊人群', text: '老年患者肝肾功能减退，应适当减量使用。' },
  { id: 'S11', category: '储存', text: '密封，在阴凉干燥处（不超过 20℃）保存。' },
  { id: 'S12', category: '其他', text: '发热时可先用温水或酒精擦浴进行物理降温。' },
]

export interface Query {
  q: string
  /** 理想命中的片段 id；'—' 表示库中没有直接答案（用于观察「没有答案也要返回最像的」） */
  want: string
}

export const QUERIES: Query[] = [
  { q: '服药期间能否饮酒', want: 'S5' },
  { q: '儿童剂量怎么算', want: 'S8' },
  { q: '和阿司匹林能一起吃吗', want: '—' },
  { q: '孕妇能不能用', want: 'S9' },
  { q: '忘了吃药怎么办', want: '—' },
]
