/**
 * 阶段三 · 第 01 篇《Prompt 工程进阶：提示词从文案到资产》实验
 *
 * 实验 A：三版 Prompt（v1 裸指令 / v2 角色+边界+格式 / v3 v2+2 个 Few-shot）
 *         跑同一批 5 个测试题，对照「格式符合率 / 边界触达 / 每次平均 token」。
 * 实验 B：最小版本管理器——加一句「拒绝策略」后重跑，看「哪个题被改坏了」。
 *
 * 跑法（仓库根目录）：
 *   nvm use 22
 *   pnpm --filter @medai/labs p3-prompt
 */

import { loadEnv, requireKey, printBudget, printTable } from '../../shared/env.ts'
import { TEST_CASES } from './testcases.ts'
import { runEval } from './eval.ts'

const apiKey = requireKey(loadEnv(), 'DEEPSEEK_API_KEY', 'https://platform.deepseek.com/api_keys')

// ── 实验 A：3 版 × 5 题 = 15 次调用 ───────────────────────────────────────
const versions = ['v1', 'v2', 'v3'] as const

const byVersion: Array<{ version: string; formatRate: number; boundaryRate: number; avgTokens: number }> = []
const detailRows: string[][] = []

for (const v of versions) {
  const report = await runEval(apiKey, v, TEST_CASES)
  byVersion.push({
    version: v,
    formatRate: report.formatRate,
    boundaryRate: report.boundaryRate,
    avgTokens: report.avgTokens,
  })
  for (const r of report.rows) {
    detailRows.push([
      v,
      r.id,
      r.kind,
      r.formatOk ? '✅' : '❌',
      r.boundaryOk ? '✅' : '❌',
      String(r.prompt + r.completion),
    ])
  }
}

console.log('\n═══ 实验 A：三版 Prompt 对照（同一批 5 题）═══\n')
printTable(
  ['版本', '格式符合率', '边界触达率', '每次平均 token'],
  byVersion.map((r) => [
    r.version,
    `${Math.round(r.formatRate * 100)}%`,
    `${Math.round(r.boundaryRate * 100)}%`,
    String(Math.round(r.avgTokens)),
  ]),
)

console.log('逐题明细（格式 / 边界，kind=boundary 是「该拒绝的题」）：\n')
printTable(['版本', '题号', '类型', '格式', '边界', 'token'], detailRows)

// ── 实验 B：最小版本管理器——回归重跑 ─────────────────────────────────────
// 场景：有人想「更保险」，把 v2 的边界从「提示咨询医生」改成「只答能不能吃 / 一次吃多少」。
// 用 runEval 跑 v4，看这一处改动把哪些题改坏了——这正是回归测试的价值。
console.log('\n═══ 实验 B：改一处，看哪题被改坏（v2 正常边界 → v4 过度收紧）═══\n')

const v2report = byVersion[1]! // v2：正常边界
const v4report = await runEval(apiKey, 'v4', TEST_CASES)

printTable(
  ['指标', '改动前 v2', '改动后 v4', '变化'],
  [
    ['格式符合率', `${Math.round(v2report.formatRate * 100)}%`, `${Math.round(v4report.formatRate * 100)}%`, '—'],
    ['边界触达率', `${Math.round(v2report.boundaryRate * 100)}%`, `${Math.round(v4report.boundaryRate * 100)}%`, '—'],
    ['每次平均 token', String(Math.round(v2report.avgTokens)), String(Math.round(v4report.avgTokens)), '↓（拒绝回答更短）'],
  ],
)

const v4detail = v4report.rows.map((r) => [
  r.id,
  r.kind,
  r.boundaryOk ? '✅' : '❌',
  r.formatOk ? '✅' : '❌',
  String(r.prompt + r.completion),
])
console.log('\nv4 逐题（类型 / 边界 / 格式 / token）：\n')
printTable(['题号', '类型', '边界', '格式', 'token'], v4detail)

// 回归的关键结论：v4 把 boundary 题拒得更坚决，但也把 normal 题误拒了
const v4normalOk = v4report.rows.filter((r) => r.kind === 'normal' && r.boundaryOk).length
const v4normalTotal = v4report.rows.filter((r) => r.kind === 'normal').length
console.log(`\n回归结论：v4 的正常题只过了 ${v4normalOk}/${v4normalTotal} 道——`)
console.log('   「不良反应有哪些」「tid 是什么意思」本应正常作答，却被「只答两类问题」的边界误拒。')
console.log('   这就是回归测试要抓的：改动的影响可量化，不是感觉；不跑这一遍，误拒就悄悄上线了。')

console.log('\n──────────────────────────────────────────────\n')
printBudget(
  '三版 Prompt × 5 题（实验 A 15 次）+ 回归重跑 v4（实验 B 5 次），共 20 次调用',
  20,
  600,
  2,
)
