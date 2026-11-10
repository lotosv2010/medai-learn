/**
 * 6 条处方样本，每条附一份人工标准答案（expected）。
 *
 * 📚 知识点：为什么标准答案要人写，不能让模型自己判？
 * 「让模型给自己打分」会把错误也打成对。实验里的对错必须由人定，
 * 这样「枚举漂移率」「字段缺失率」才是可信的数字。
 *
 * 每条样本刻意覆盖一种难度：
 *   1 标准写法 · 2 「必要时」 · 3 中文频次 · 4 缺疗程 · 5 剂量在括号里 · 6 夹杂干扰信息
 */

import type { Prescription } from './schema.ts'

export interface Sample {
  id: string
  /** 处方原文 */
  text: string
  /** 人工标准答案；值为 undefined 表示「原文没写，应当缺」 */
  expected: Partial<Record<keyof Prescription, unknown>> & { drug: string }
  /** 这条样本考什么，用于文章里解释 */
  focus: string
}

export const SAMPLES: Sample[] = [
  {
    id: 'S1',
    text: '阿莫西林胶囊 0.5g 每日三次 口服 连用7天',
    expected: { drug: '阿莫西林胶囊', dose: 0.5, doseUnit: 'g', frequency: 'tid', durationDays: 7, route: '口服' },
    focus: '标准写法：基线',
  },
  {
    id: 'S2',
    text: '布洛芬缓释片 0.3g 疼痛时口服，每次一片，必要时使用',
    expected: { drug: '布洛芬缓释片', dose: 0.3, doseUnit: 'g', frequency: 'prn', durationDays: undefined, route: '口服' },
    focus: '「必要时」→ prn：测枚举边界',
  },
  {
    id: 'S3',
    text: '头孢克肟分散片 0.1g，一天两次，口服，连服5天',
    expected: { drug: '头孢克肟分散片', dose: 0.1, doseUnit: 'g', frequency: 'bid', durationDays: 5, route: '口服' },
    focus: '中文频次「一天两次」→ bid：测归一能力',
  },
  {
    id: 'S4',
    text: '盐酸氨溴索口服液 15ml 每日三次 口服',
    expected: { drug: '盐酸氨溴索口服液', dose: 15, doseUnit: 'ml', frequency: 'tid', durationDays: undefined, route: '口服' },
    focus: '原文缺疗程：正确做法是缺失而非编造',
  },
  {
    id: 'S5',
    text: '左氧氟沙星片 0.25g(1粒) 每日一次 口服 共3天',
    expected: { drug: '左氧氟沙星片', dose: 0.25, doseUnit: 'g', frequency: 'qd', durationDays: 3, route: '口服' },
    focus: '剂量藏在括号里：测抽取位置是否正确',
  },
  {
    id: 'S6',
    text: '注意：患者对青霉素过敏。硝酸甘油片 0.5mg 舌下含服，每晚一次，疗程按需。饭后服用、忌酒。',
    expected: { drug: '硝酸甘油片', dose: 0.5, doseUnit: 'mg', frequency: 'qd', durationDays: undefined, route: '舌下含服' },
    focus: '干扰信息多：测是否把过敏史、忌酒当成字段',
  },
]
