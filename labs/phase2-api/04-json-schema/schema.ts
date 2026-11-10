/**
 * 处方抽取的 Schema（Zod 定义）。
 *
 * 📚 知识点：为什么用 Zod 而不是只写一段提示词？
 * 提示词里写「字段有 drug、dose……」只是请求，模型可以不听。
 * Zod 是合同：parse 不通过就是不合格，无论模型输出得多像 JSON。
 * 本篇 DeepSeek 的 json_object 档只保证「合法 JSON」，结构与枚举全靠这里兜底。
 */

import { z } from 'zod'

/** 频次枚举：医嘱里的「每日三次」必须归一到 tid，否则下游无法统计 */
export const FREQUENCIES = ['qd', 'bid', 'tid', 'qid', 'prn'] as const
export const DOSE_UNITS = ['mg', 'g', 'ml'] as const
export const ROUTES = ['口服', '外用', '注射', '舌下含服'] as const

export const PrescriptionSchema = z
  .object({
    drug: z.string().min(1), // 药名，原文保留即可
    dose: z.number().positive(), // 剂量必须是正数；字符串 "0.5" 会被拒绝
    doseUnit: z.enum(DOSE_UNITS),
    frequency: z.enum(FREQUENCIES), // 👈 本篇最容易漂移的字段
    durationDays: z.number().int().positive(),
    route: z.enum(ROUTES),
  })
  .strict() // 👈 多出来的字段（比如模型自作主张加的 type）直接拒绝

export type Prescription = z.infer<typeof PrescriptionSchema>

/** 字段清单（给 Prompt 约定档用）：把结构写进提示词，但这只是请求 */
export const FIELD_HINT = `字段：
- drug：药名（字符串）
- dose：剂量数值（数字，不要带单位）
- doseUnit：单位，只能是 mg / g / ml
- frequency：频次，只能是 qd(每日一次) / bid(每日两次) / tid(每日三次) / qid(每日四次) / prn(必要时)
- durationDays：疗程天数（整数）
- route：给药途径，只能是 口服 / 外用 / 注射 / 舌下含服`
