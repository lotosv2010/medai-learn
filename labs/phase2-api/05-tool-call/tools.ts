/**
 * 阶段二 · 第 05 篇《Function Calling：模型只写调用单，不执行》实验 —— 工具定义与执行器
 *
 * 这里同时装着两样东西，正是本篇要讲清的分界：
 *   1) tools 定义（发给模型的 JSON Schema）—— 这只是「说明书」，模型靠它决定要不要调用
 *   2) 执行器（真正的 JS 函数 + Zod 校验）—— 只有它能碰数据、产生副作用
 *
 * 模型永远执行不到下面的函数，它只负责「写出调用单」。这是 Function Calling 最核心的认知。
 */

import { z } from 'zod'
import { DRUG_NAMES, lookupInteraction } from './drug-db.ts'

// ── 参数 Schema：调用单必须长成什么样 ──────────────────────────────────
/**
 * 📚 知识点：为什么参数要过 Zod？
 * 模型的 arguments 是一段「它自己编的 JSON 字符串」，药名可能压根不在库里（参数幻觉）。
 * Zod 在这里不是约束输出形状，而是拦住「不存在的药名」，让模型能收到错误后自己纠正。
 */
export const InteractionArgsSchema = z
  .object({
    drugA: z.enum(DRUG_NAMES), // 👈 药名必须是库里已知的，编一个就会被拦下
    drugB: z.enum(DRUG_NAMES),
  })
  .strict()

export type InteractionArgs = z.infer<typeof InteractionArgsSchema>

// ── 工具定义：发给模型的 JSON Schema ───────────────────────────────────
/**
 * description 就是写给模型的 Prompt：它决定模型「什么时候该调、什么时候不该调」。
 * 实验 C 会拿「宽描述」和「窄描述」做对照，证明这句话直接决定误触发率。
 */
export const TOOL_DEFINITION = {
  type: 'function' as const,
  function: {
    name: 'check_drug_interaction',
    description: '查询两种处方药之间是否存在相互作用。仅当用户明确问「某药和某药能否一起吃 / 有没有相互作用」时才调用；药名必须是已知的通用名。',
    parameters: {
      type: 'object',
      properties: {
        drugA: { type: 'string', description: '第一种药的通用名，必须是药库中已存在的编号' },
        drugB: { type: 'string', description: '第二种药的通用名，必须是药库中已存在的编号' },
      },
      required: ['drugA', 'drugB'],
    },
  },
}

/** 实验 C 对照组：故意把描述写宽，看模型会不会误触发 */
export const TOOL_DEFINITION_BROAD = {
  type: 'function' as const,
  function: {
    name: 'check_drug_interaction',
    description: '查询药品信息。',
    parameters: {
      type: 'object',
      properties: {
        drugA: { type: 'string', description: '药品名' },
        drugB: { type: 'string', description: '药品名' },
      },
      required: ['drugA', 'drugB'],
    },
  },
}

// ── 执行器：真正的函数，只有它能产生副作用 ─────────────────────────────
/**
 * 校验并执行一次工具调用。返回一个描述性的结果对象，方便主脚本逐帧打印。
 * 校验失败时不抛异常，而是返回一条「纠错消息」——主脚本会把这条消息回传给模型，
 * 让模型换个参数重试。这是 Agent 自我修正的雏形。
 */
export function executeTool(rawArgs: string): { ok: boolean; result: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawArgs) // 👈 arguments 是字符串，必须先 parse（本篇要看见的第一个坑）
  } catch {
    return { ok: false, result: `参数不是合法 JSON，请重新输出：${rawArgs}` }
  }

  const checked = InteractionArgsSchema.safeParse(parsed)
  if (!checked.success) {
    // 把「库里有哪些药」告诉模型，它才能换一个真实存在的药名重试
    const issues = checked.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('；')
    return { ok: false, result: `参数校验失败（${issues}）。已知药名：${DRUG_NAMES.join('、')}。请换用其中的药名重新调用。` }
  }

  return { ok: true, result: lookupInteraction(checked.data.drugA, checked.data.drugB) }
}
