/**
 * 阶段二 · 第 06 篇《Embedding：把「意思相近」变成一道可以算的减法》实验
 *
 * 三个实验，全程本地 Ollama，零 API 费用：
 *   A  12×12 相似度矩阵：同类片段是否聚在一起，否定/肯定是否分不清
 *   B  5 个查询的 Top-3：看「能否饮酒」会不会撞上「酒精擦浴」
 *   C  三度量对照：归一化后，余弦与点积的排序是否完全一致
 *
 * 跑法（仓库根目录）：
 *   nvm use 22
 *   ollama pull qwen3-embedding:0.6b   # 首次
 *   pnpm --filter @medai/labs p2-embed
 */

import { loadEnv, printTable } from '../../shared/env.ts'
import { SAMPLES, QUERIES } from './samples.ts'

// ── 配置 ────────────────────────────────────────────────────────────────
// 本地 Ollama 无 key，只读 OLLAMA_HOST；默认本机 11434
const OLLAMA_HOST = loadEnv().OLLAMA_HOST ?? 'http://127.0.0.1:11434'
const MODEL = 'qwen3-embedding:0.6b'

/** 检查模型是否已拉取；没有就提示并退出，不抛栈 */
async function ensureModel(): Promise<void> {
  const res = await fetch(`${OLLAMA_HOST}/api/tags`)
  if (!res.ok) {
    console.error(`\n❌ 连不上 Ollama（${OLLAMA_HOST}），请确认已启动：\`ollama serve\`\n`)
    process.exit(1)
  }
  const { models } = (await res.json()) as { models: Array<{ name: string }> }
  if (!models.some((m) => m.name === `${MODEL}:latest` || m.name === MODEL)) {
    console.error(`\n❌ 本地还没有模型 ${MODEL}`)
    console.error(`   先执行：ollama pull ${MODEL}\n`)
    process.exit(1)
  }
}

/** 调 /api/embed，一段文本 → 一个 1024 维向量 */
async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${OLLAMA_HOST}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, input: texts }),
  })
  if (!res.ok) throw new Error(`Ollama ${res.status}：${await res.text()}`)
  const json = (await res.json()) as { embeddings: number[][] }
  return json.embeddings
}

// ── 三个度量，全部手写，不引库 ─────────────────────────────────────────
// 📚 知识点：三种度量归一化之后，只在数值上不同，排序完全一致。
// 因为归一化让所有向量长度都变成 1，欧氏距离平方 = 2 - 2*余弦，点积 = 余弦。
function dot(a: number[], b: number[]): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

function norm(a: number[]): number {
  return Math.sqrt(dot(a, a))
}

/** 余弦相似度：看夹角不看长度，文本检索默认 */
function cosine(a: number[], b: number[]): number {
  return dot(a, b) / (norm(a) * norm(b))
}

/** 欧氏距离：看直线距离，受向量长度影响；越小越近 */
function euclidean(a: number[], b: number[]): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2
  return Math.sqrt(s)
}

function normalize(a: number[]): number[] {
  const n = norm(a)
  return a.map((x) => x / n)
}

// ── 实验 A：12×12 相似度矩阵 ──────────────────────────────────────────
async function runA(embeddings: number[][]): Promise<void> {
  console.log('\n════ 实验 A：12×12 余弦相似度矩阵（两位小数，值越大越像）════')
  const header = ['id'].concat(SAMPLES.map((s) => s.id))
  const rows = SAMPLES.map((s, i) => {
    const row = SAMPLES.map((_, j) => cosine(embeddings[i], embeddings[j]).toFixed(2))
    return [s.id, ...row]
  })
  printTable(header, rows)
  console.log('   👀 看两处：S3/S4（两段「禁忌」）应该互相接近；')
  console.log('            S5「禁止饮酒」与 S6「可少量饮酒」相似度可能也很高——否定/肯定分不清。\n')
}

// ── 实验 B：5 个查询的 Top-3 ───────────────────────────────────────────
async function runB(docVec: number[][]): Promise<void> {
  console.log('\n════ 实验 B：5 个查询的 Top-3 ════')
  const qVec = await embed(QUERIES.map((q) => q.q))
  const rows: string[][] = []
  QUERIES.forEach((query, qi) => {
    const scored = SAMPLES.map((s, i) => ({ id: s.id, cat: s.category, text: s.text, score: cosine(qVec[qi], docVec[i]) }))
    scored.sort((a, b) => b.score - a.score)
    const top = scored.slice(0, 3).map((r) => `${r.id}(${r.score.toFixed(2)})`)
    rows.push([query.q, query.want, ...top])
  })
  printTable(['查询', '期望', 'Top-1', 'Top-2', 'Top-3'], rows)
  console.log('   👀 看两处：「能否饮酒」有没有撞上 S12「酒精擦浴」；')
  console.log('            「儿童剂量」是不是把 S7「成人剂量」排在了前面（数字不敏感）。\n')
}

// ── 实验 C：三度量对照（归一化后） ────────────────────────────────────
async function runC(docVec: number[][]): Promise<void> {
  console.log('\n════ 实验 C：三度量排序对照（取查询 1「服药期间能否饮酒」对 12 段的排序）════')
  const [q] = await embed(['服药期间能否饮酒'])
  const by = (fn: (a: number[], b: number[]) => number, asc = false) => {
    const scored = SAMPLES.map((s, i) => ({ id: s.id, v: fn(q, docVec[i]) }))
    scored.sort((a, b) => (asc ? a.v - b.v : b.v - a.v))
    return scored.map((r) => r.id).join(' ')
  }
  console.log(`   余弦（降序，越大越像）：${by(cosine)}`)
  console.log(`   点积（归一化后，降序）：${by((a, b) => dot(normalize(a), normalize(b)))}`)
  console.log(`   欧氏（升序，越小越像）：${by(euclidean, true)}`)
  console.log('   👀 归一化后余弦与点积的排序应当完全相同；欧氏距离的升序与其降序也一致。\n')
}

// ── 入口 ────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  await ensureModel()
  console.log(`\n📊 实验：本地 Ollama ${MODEL} 向量化（12 段 + 5 查询 + 1 对照，纯本地计算）`)
  console.log('   预估花费：约 ¥0（无 API 调用）\n')

  const docVec = await embed(SAMPLES.map((s) => s.text))
  console.log(`   ✅ 已向量化 ${docVec.length} 段，每段 ${docVec[0].length} 维\n`)

  await runA(docVec)
  await runB(docVec)
  await runC(docVec)
}

main().catch((err) => {
  console.error('\n❌ 实验失败：', err instanceof Error ? err.message : err)
  process.exit(1)
})
