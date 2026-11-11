/**
 * 阶段三 · 第 01 篇《Prompt 工程进阶：提示词从文案到资产》——可版本化的 Prompt 模板
 *
 * 📚 知识点：Prompt 要当代码管——版本化、可回滚、可 A/B、可回归。
 * 这里的三版是「同一用药咨询场景」的三个资产版本，供 02~06 篇每篇复用。
 * 每版都是 messages 数组（system + 可选 few-shot + user），换场景只换 build 的入参。
 *
 * 医疗边界：示例统一为「咨询式」回答，不写真实药品的精确剂量；
 * 剂量换算题用「某药 + 示例性数字」，避免误导（承阶段一以来的既定边界）。
 */

export type Message = { role: string; content: string }

export interface PromptVersion {
  version: string
  /** 这一版相对上一版改了什么，供回滚 / 回归时对照 */
  changelog: string
  /** 把一个用药咨询问题，装成这一版的完整 messages */
  build(question: string): Message[]
}

/** v2 的 System Prompt，抽出来给 v3 复用，避免同一段文案散落两处（资产要单一来源） */
export const SYSTEM_V2 = [
  '你是用药咨询助手。你的职责是回答非处方药与常见处方的用药疑问。',
  '边界：你不替代医生诊断；涉及诊断、开处方、加量减量、停药等，必须提示用户咨询医生；不知道就说不。',
  '输出格式：先给「结论：」一段，再给「注意事项：」一段，用短句。',
].join('\n')

/** v1：裸指令。没有角色、没有边界、没有格式要求。 */
const V1: PromptVersion = {
  version: 'v1',
  changelog: '初始：裸指令，只把问题丢给模型',
  build: (question) => [{ role: 'user', content: `回答这个用药问题：${question}` }],
}

/** v2：角色 + 边界 + 输出格式约束。 */
const V2: PromptVersion = {
  version: 'v2',
  changelog: '加角色、边界、拒绝策略、输出格式约束',
  build: (question) => [
    { role: 'system', content: SYSTEM_V2 },
    { role: 'user', content: question },
  ],
}

/** v3：v2 + 2 个 Few-shot 示例，校正输出格式。 */
const V3: PromptVersion = {
  version: 'v3',
  changelog: '在 v2 基础上追加 2 个 Few-shot 示例，校正输出格式',
  build: (question) => [
    { role: 'system', content: SYSTEM_V2 },
    // 示例 1：正常咨询——示范「结论 + 注意事项」两段式
    { role: 'user', content: '感冒灵颗粒一次吃一包，一天吃几次？' },
    { role: 'assistant', content: '结论：感冒灵颗粒通常一日三次，一次一包。\n注意事项：服药期间避免饮酒；若连用三天症状未缓解，请咨询医生。' },
    // 示例 2：想自行加量——示范「该拒绝时怎么拒绝」
    { role: 'user', content: '我想把布洛芬剂量加倍，可以吗？' },
    { role: 'assistant', content: '结论：不建议自行加倍剂量，可能增加不良反应风险。\n注意事项：请按说明书或医嘱剂量服用；若疼痛持续，请咨询医生。' },
    { role: 'user', content: question },
  ],
}

/**
 * v4：故意做坏的版本——把 v2 的边界「过度收紧」成「只答两类问题」。
 *
 * 📚 知识点：它只用于实验 B 的回归演示，不进「三版对照」。
 * 目的是给「改一处、看哪题被改坏」一个真实证据：边界收紧后，
 * 「能不能自己加量」这类该拒的题更坚决了，但「不良反应有哪些」「tid 是什么意思」
 * 这类本应正常作答的用药题也被误拒了——这就是回归测试要抓的东西。
 */
const V4: PromptVersion = {
  version: 'v4',
  changelog: '实验 B 专用：把 v2 的边界过度收紧为「只答能不能吃 / 一次吃多少」，其余一律拒绝',
  build: (question) => [
    {
      role: 'system',
      content: [
        '你是用药咨询助手。',
        '边界：你只回答两类问题——「这个药能不能吃」和「一次吃多少」。除此之外的任何问题，一律拒绝回答，不要展开。',
        '输出格式：先给「结论：」一段，再给「注意事项：」一段。',
      ].join('\n'),
    },
    { role: 'user', content: question },
  ],
}

/** 三版 Prompt 资产：key 是版本号，value 是那一版的完整定义（v4 是回归演示专用） */
export const PROMPT_VERSIONS: Record<string, PromptVersion> = { v1: V1, v2: V2, v3: V3, v4: V4 }
