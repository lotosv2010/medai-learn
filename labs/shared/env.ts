import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 实验脚本的共用工具。
 *
 * 📚 为什么这里手写 .env 解析而不用 dotenv 包？
 * 阶段一的实验要在 `pnpm install` 之前也能跑（读者可能只想先看看代码）。
 * 一个 20 行的解析足够用，而且不引入依赖反而更贴近「看懂每一行」的学习目标。
 * 若后续实验复杂度上来，再换成 dotenv。
 */

const HERE = dirname(fileURLToPath(import.meta.url))
/** labs/ 目录，从任意 phaseX/yy-name/ 往上两级 */
export const LABS_ROOT = resolve(HERE, '../..')
export const REPO_ROOT = resolve(LABS_ROOT, '..')

/** 极简 .env 解析：KEY=VALUE，忽略注释与空行 */
export function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...(process.env as Record<string, string>) }
  for (const file of ['.env.local', '.env']) {
    const path = resolve(REPO_ROOT, file)
    if (!existsSync(path)) continue
    for (const rawLine of readFileSync(path, 'utf-8').split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq === -1) continue
      const key = line.slice(0, eq).trim()
      const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (value) env[key] = value
    }
  }
  return env
}

/** 读取必需的 key，缺失时给出中文指引而不是抛栈 */
export function requireKey(env: Record<string, string>, name: string, hint: string): string {
  const value = env[name]
  if (!value) {
    console.error(`\n❌ 缺少环境变量 ${name}`)
    console.error(`   获取地址：${hint}`)
    console.error(`   配置方法：cp .env.local.example .env.local 后填入 ${name}=\n`)
    process.exit(1)
  }
  return value
}

/**
 * 打印本次实验的预估消耗。
 *
 * 📚 知识点：为什么每条实验都要打印预算？
 * LLM 按 token 计费，一个忘关的循环能在几分钟内烧掉几十块。
 * 把「跑之前先看到要花多少钱」做成习惯，比任何成本优化技巧都重要。
 */
export function printBudget(label: string, calls: number, estToken: number, pricePerMillionYuan: number): void {
  const cost = (estToken / 1_000_000) * pricePerMillionYuan
  console.log(`\n📊 实验：${label}`)
  console.log(`   计划调用：${calls} 次 · 预估消耗：约 ${estToken.toLocaleString()} token`)
  console.log(`   预估花费：约 ¥${cost.toFixed(3)}`)
  console.log('   （按输入+输出混合单价粗估，实际以账单为准）\n')
}

/**
 * 计算字符串的「显示宽度」：CJK 字符占 2 列，其余占 1 列。
 * 不这么算的话，中英混排的表格会歪——实验输出要能直接贴进文章，所以这里值得多写几行。
 */
function displayWidth(text: string): number {
  let width = 0
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    // CJK 统一表意文字、全角标点等宽字符区间
    const isWide =
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6)
    width += isWide ? 2 : 1
  }
  return width
}

/** 按显示宽度右侧补空格 */
function padTo(text: string, width: number): string {
  return text + ' '.repeat(Math.max(0, width - displayWidth(text)))
}

/** 简易表格打印，避免为实验引入表格库 */
export function printTable(headers: string[], rows: string[][]): void {
  const width = headers.map((h, i) =>
    Math.max(displayWidth(h), ...rows.map((r) => displayWidth(r[i] ?? ''))),
  )
  const line = (cells: string[]) => cells.map((c, i) => padTo(c, width[i])).join(' │ ')
  console.log('┌─ ' + line(headers))
  console.log('├─ ' + width.map((w) => '─'.repeat(w)).join('─┼─'))
  for (const row of rows) console.log('│  ' + line(row))
  console.log('')
}
