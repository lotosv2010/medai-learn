/**
 * 阶段三 · 第 02 篇 —— 样例上下文 + 实验 B 的三组位置。
 *
 * 📚 知识点：实验 B 的「针」为什么是「相似候选里唯一的 3 级」，而不是「唯一事实」？
 * 我们先用「唯一事实埋中间」做过一轮对照（临时脚本验证）：在 DeepSeek 上，无论上下文拉到
 * 20k、60k token，还是换成 20 轮信息密集历史、连贯长文档，「唯一事实」放中间都稳定命中——
 * 位置效应在「答案只有一份」时几乎不显形。
 * 真正让位置效应显形的是「多候选要区分」：当 26 段档案都写着「X-7 与 W 的风险等级」、
 * 只有一段是 3 级、其余是 1/2 级时，中间那份「3 级」的信心最弱，最先被邻近候选带偏。
 * 所以「关键信息放头尾」在本篇是「回指阶段一 + 论文」的既有结论，实验 B 做的是
 * 「顺序对照实验里的隐藏变量」——temperature。
 *
 * 医疗边界：全部用「示例」字样 + 代号（X-7 / W），不写任何真实药品的精确剂量或禁忌。
 */

import { SYSTEM_V2 } from '../_sdk/prompts.ts'
import type { Block } from '../_sdk/assemble.ts'

/** 12 轮对话历史——话题是失眠、头晕、换季，不涉及「X-7 与 W 的风险等级」，让答案只可能来自 RAG */
const HISTORY: Array<[string, string]> = [
  ['user', '最近总是睡不好，凌晨三点就醒，怎么办？'],
  ['assistant', '先排查诱因：睡前是否喝咖啡浓茶、看手机过久？规律作息、睡前避免强光刺激会有帮助。'],
  ['user', '我睡前会喝点酒助眠，这个习惯好不好？'],
  ['assistant', '酒精会破坏睡眠结构，虽能让你更快入睡，但后半夜易醒、睡眠变浅，长期反而不利。'],
  ['user', '那白天头晕是怎么回事？'],
  ['assistant', '头晕原因很多：睡眠不足、血压波动、贫血都可能。建议先记录头晕发生的时间和诱因。'],
  ['user', '我量过血压，偏高，140/90。'],
  ['assistant', '单次测量偏高不算数，建议不同日多次测量；若持续偏高，需就医评估是否用药。'],
  ['user', '家里有电子血压计，是不是不太准？'],
  ['assistant', '上臂式电子血压计规范使用下准确度够用；测量前静坐 5 分钟，袖带与心脏同高。'],
  ['user', '好的，我这两天再测测。'],
  ['assistant', '好的，注意记录早晚两次的数值，方便就诊时给医生参考。'],
  ['user', '最近换季，家里老人有点咳嗽，需要吃药吗？'],
  ['assistant', '老人咳嗽先明确病因：普通感冒、过敏还是其他。多喝水观察，若咳痰多、发热或气促，尽快就医。'],
  ['user', '好，我再观察两天。'],
  ['assistant', '好的。任何用药调整或新症状出现，先咨询医生，不要自行判断。'],
]

/** 2 个工具描述（JSON Schema 的简化文本版） */
const TOOL_DESC = [
  '工具 search_drug(name)：按药名查询药品说明书要点，返回适应症、用法用量、相互作用字段。',
  '工具 check_interaction(drugA, drugB)：查询两种药是否存在已知相互作用，返回风险等级与说明。',
]

/** 1 段工具返回结果（刻意冗长，模拟真实工具回一大坨 JSON） */
const TOOL_RESULT = [
  'search_drug("示例药 X-7") 返回：{"name":"示例药 X-7","indication":"缓解季节更替引起的乏力、鼻塞、轻度头痛","dosage":"一次 1 片，一日 2 次","adverseReaction":["偶见嗜睡","口干"],"caution":"服用期间避免饮酒；从事驾驶或高空作业者慎用；孕妇及哺乳期妇女用药前请咨询医生","note":"以上为示例性信息，具体用药请遵医嘱。"}',
]

/** 用户当前输入——问题指向「风险等级」，答案只在 RAG 那份「3 级」档案里 */
const USER = '示例药 X-7 与抗凝药 W 的相互作用风险等级是几级？只回答等级，不要解释。'

/**
 * 实验 B 专用的简洁 system——刻意不用 SYSTEM_V2 的「结论 + 注意事项」两段式。
 * 📚 知识点：SYSTEM_V2 会诱导模型把互相矛盾的等级一条条列出来，位置效应被「列清单」掩盖。
 * 要单独观察顺序/采样的影响，必须用一段只要求「简洁、直接、给一个确定答案」的 system。
 */
const SYSTEM_B = '你是用药咨询助手。回答要简洁、直接，只依据提供的资料，只给一个确定答案。'

/** 实验 B 的「针」——26 段档案里唯一写着「3 级」的一份 */
const TARGET = '【药品相互作用档案】示例药 X-7 与抗凝药 W 的相互作用风险等级为「3 级（高）」，依据编号 INT-2024-88，合用时需监测凝血功能。'

/** 25 段干扰档案——都提 X-7 与 W，但等级交替是 1 级 / 2 级 */
function distractor(i: number): string {
  const level = i % 2 === 0 ? '1 级（低）' : '2 级（中）'
  const note = i % 2 === 0 ? '一般无需特殊监测' : '建议定期复查凝血指标'
  return `【药品相互作用档案】示例药 X-7 与抗凝药 W 的相互作用风险等级为「${level}」，依据编号 INT-2024-${String(i).padStart(2, '0')}，${note}。`
}

/** 组装一次完整调用的六类内容（实验 A 用：RAG 是 3 段中性说明书，重点是「历史 + 工具结果」的占比） */
export function buildBlocks(): Block[] {
  return [
    { kind: 'system', content: SYSTEM_V2 },
    { kind: 'history', content: HISTORY.map(([r, c]) => `${r}：${c}`).join('\n') },
    { kind: 'rag', content: [
      '示例药 X-7 说明书【适应症】：用于缓解季节更替引起的乏力、鼻塞、轻度头痛等症状。',
      '示例药 X-7 说明书【用法用量】：口服，一次 1 片，一日 2 次，早晚各一次，饭后服用。',
      '示例药 X-7 说明书【贮藏】：密封，置阴凉干燥处（不超过 20℃）保存。',
    ].join('\n') },
    { kind: 'toolDesc', content: TOOL_DESC.join('\n') },
    { kind: 'toolResult', content: TOOL_RESULT.join('\n') },
    { kind: 'user', content: USER },
  ]
}

/**
 * 实验 B 的三组：把「3 级」那份档案分别排进 26 段 RAG 的 头 / 中 / 尾。
 * 其余 25 段永远是「1 级 / 2 级」干扰——三组的差异只在「3 级」那一份的位置。
 *
 * 📚 知识点：实验 B 为什么只保留 system + 检索片段 + 用户问题三样？
 * 「控制变量」——阶段一 01 篇教过：只让「位置」一个变量动，其余全固定。
 * 历史、工具描述、工具结果与「3 级档案放哪」无关，塞进来只会给实验变量掺噪音。
 */
export function buildThreeOrders(): Array<{ label: string; blocks: Block[] }> {
  const makeRag = (targetIndex: number): string => {
    const parts: string[] = []
    for (let i = 0; i < 26; i++) {
      if (i === targetIndex) parts.push(TARGET)
      // 📚 i < targetIndex ? i + 1 : i：让 25 段干扰的编号保持 01~25 连续。
      // 若直接传 i，targetIndex 之前的干扰会用 00~12、之后的用 14~25，中间「13」凭空消失——
      // 编号跳号会暴露「哪一份被替换过」，成为位置之外的第二个变量。+1 让它始终 01~25 连续，
      // 三组之间的唯一差异只剩「3 级那份排在第几段」，这才是干净的位置对照。
      else parts.push(distractor(i < targetIndex ? i + 1 : i))
    }
    return parts.join('\n')
  }

  const order = (ragContent: string): Block[] => [
    { kind: 'system', content: SYSTEM_B },
    { kind: 'rag', content: ragContent },
    { kind: 'user', content: USER },
  ]

  return [
    { label: '头（26 段里第 1 段）', blocks: order(makeRag(0)) },
    { label: '中（26 段里第 13 段）', blocks: order(makeRag(13)) },
    { label: '尾（26 段里第 26 段）', blocks: order(makeRag(25)) },
  ]
}
