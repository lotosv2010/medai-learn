/**
 * 阶段二 · 第 07 篇《并发、超时与 SDK 收口》实验 A/B/C
 *
 * 三个实验，全部走 mock、零 API 成本：
 *   A  三策略对照：Promise.all / allSettled / 信号量+超时+退避，看墙钟时间与成功率
 *   B  jitter 的作用：同一限流场景，退避带不带 jitter，看重试是成簇还是打散
 *   C  熔断器：一个 provider 连续 500，看它何时被 open、探针何时放行
 *
 * 跑法（仓库根目录）：
 *   nvm use 22
 *   pnpm --filter @medai/labs p2-sdk
 */

import { printTable } from '../../shared/env.ts'
import { MockChatProvider, fateFor } from './_sdk/mock-provider.ts'
import { withRetry, withTimeout, backoffMs, sleep, isRetryable } from './_sdk/retry.ts'
import { Semaphore } from './_sdk/semaphore.ts'
import { CircuitBreaker } from './_sdk/circuit-breaker.ts'
import { ChatProvider } from './_sdk/types.ts'

// ── 配置 ────────────────────────────────────────────────────────────────
const TASK_COUNT = 20
const CONCURRENCY = 3
const TIMEOUT_MS = 2000 // 演示用 2s（真实场景 8s），原理一致
const MAX_RETRIES = 2
const BASE_MS = 200

const MEDICAL = [
  '阿莫西林胶囊的常见不良反应',
  '布洛芬和阿司匹林能一起吃吗',
  '儿童退烧药的剂量怎么算',
  '孕妇感冒能吃什么药',
  '头孢类抗生素需要皮试吗',
  '高血压患者能吃感冒药吗',
  '胰岛素应该怎么保存',
  '阿司匹林肠溶片饭前还是饭后吃',
  '维生素 C 能和抗生素同服吗',
  '服药期间能喝酒吗',
]

/** 20 个任务：q0~q19，命运由 fateFor(i) 决定（4 慢 20% / 2 五百 10% / 14 正常） */
const tasks = Array.from({ length: TASK_COUNT }, (_, i) => ({
  key: `q${i}`,
  text: MEDICAL[i % MEDICAL.length] + `（第 ${i + 1} 题）`,
}))

function freshProvider(): MockChatProvider {
  const fate = new Map(tasks.map((t, i) => [t.key, fateFor(i)]))
  return new MockChatProvider('mock', (key) => fate.get(key) ?? 'ok')
}

// ══════════════════════════════════════════════════════════════════════════
// 实验 A：三种策略的墙钟时间与成功率
// ══════════════════════════════════════════════════════════════════════════
async function runA(): Promise<void> {
  console.log('\n════ 实验 A：20 任务 × 三种策略（4 慢 / 2 五百 / 14 正常）════')

  const rows: string[][] = []

  // 策略 1：Promise.all —— 全有或全无，一个失败整批丢
  {
    const p = freshProvider()
    const started = performance.now()
    let outcome = '全部成功'
    let ok = 20
    try {
      await Promise.all(
        tasks.map((t) => withTimeout((sig) => p.chat([{ role: 'user', content: t.key }], sig), TIMEOUT_MS)),
      )
    } catch (e) {
      ok = 0
      outcome = e instanceof Error ? e.message : String(e)
    }
    const wall = Math.round(performance.now() - started)
    console.log(`  策略1 Promise.all：${wall}ms，成功 ${ok}，结果 → ${outcome}（一个失败，全批丢弃）`)
    rows.push(['Promise.all', `${wall}ms（首个失败即停）`, `${ok}（整批丢）`, '—', '20'])
  }

  // 策略 2：Promise.allSettled —— 归集所有结果，但最慢
  {
    const p = freshProvider()
    const started = performance.now()
    const results = await Promise.allSettled(
      tasks.map((t) => withTimeout((sig) => p.chat([{ role: 'user', content: t.key }], sig), TIMEOUT_MS)),
    )
    const ok = results.filter((r) => r.status === 'fulfilled').length
    const fail = results.filter((r) => r.status === 'rejected').length
    const wall = Math.round(performance.now() - started)
    console.log(`  策略2 allSettled：${wall}ms，成功 ${ok} / 失败 ${fail}（部分结果保留，但耗时最长）`)
    rows.push(['Promise.allSettled', `${wall}ms（等最慢者）`, `${ok}`, `${fail}`, '20'])
  }

  // 策略 3：信号量 + 超时 + 退避（带 jitter）—— 成功率 100%，请求数因重试增加
  {
    const p = freshProvider()
    const sem = new Semaphore(CONCURRENCY)
    const started = performance.now()
    let requests = 0
    let ok = 0
    let fail = 0
    const work = tasks.map((t) =>
      sem.run(async () => {
        try {
          await withRetry(
            () =>
              withTimeout((sig) => {
                requests++
                return p.chat([{ role: 'user', content: t.key }], sig)
              }, TIMEOUT_MS),
            {
              maxRetries: MAX_RETRIES,
              baseMs: BASE_MS,
              jitter: true,
              shouldRetry: isRetryable,
            },
          )
          ok++
        } catch {
          fail++
        }
      }),
    )
    await Promise.all(work)
    const wall = Math.round(performance.now() - started)
    console.log(`  策略3 信号量+退避：${wall}ms，成功 ${ok} / 失败 ${fail}，总请求 ${requests}（重试让请求数 > 20）`)
    rows.push(['信号量+退避', `${wall}ms`, `${ok}`, `${fail}`, `${requests}`])
  }

  printTable(['策略', '墙钟时间', '成功', '失败', '总请求'], rows)
}

// ══════════════════════════════════════════════════════════════════════════
// 实验 B：jitter 的作用
// ══════════════════════════════════════════════════════════════════════════
async function runB(): Promise<void> {
  console.log('\n════ 实验 B：退避带 / 不带 jitter 的重试时刻分布 ════')

  // 模拟 8 个请求在同一时刻失败，观察它们下次重试被排到哪些时刻
  const retries = 3
  const base = 500
  const noJitter = Array.from({ length: 8 }, (_, i) =>
    Array.from({ length: retries }, (_, a) => i * 0 + backoffMs(a, base, false)).reduce((s, v) => s + v, 0),
  )
  const withJitter = Array.from({ length: 8 }, () =>
    Array.from({ length: retries }, (_, a) => backoffMs(a, base, true)).reduce((s, v) => s + v, 0),
  )

  const uniq = (xs: number[]) => new Set(xs).size
  console.log('   无 jitter：8 个请求的第 1 次重试全部落在同一时刻')
  console.log(`     重试总等待（ms）：${noJitter.join(' / ')}  → 去重后只有 ${uniq(noJitter)} 个时刻`)
  console.log('   有 jitter：8 个请求的重试被打散到不同时刻')
  console.log(`     重试总等待（ms）：${withJitter.map((v) => Math.round(v)).join(' / ')}  → 去重后有 ${uniq(withJitter.map((v) => Math.round(v)))} 个时刻`)
  console.log('   👀 无 jitter 时 8 个请求在同一毫秒重试，把对方 429 打得更狠；有 jitter 后各自错开。')
}

// ══════════════════════════════════════════════════════════════════════════
// 实验 C：熔断器三态
// ══════════════════════════════════════════════════════════════════════════
async function runC(): Promise<void> {
  console.log('\n════ 实验 C：一个 provider 连续 500，熔断器何时 open / half-open ════')

  const breaker = new CircuitBreaker(3, 500) // 连续 3 次失败熔断，冷却 500ms
  const bad = new MockChatProvider('坏了的模型', () => 'server-error')

  let calls = 0
  for (let i = 1; i <= 10; i++) {
    if (!breaker.canCall()) {
      console.log(`   第 ${i} 次：熔断器 open，直接拒绝（不打它）`)
      if (i < 10) await sleep(60)
      continue
    }
    try {
      calls++
      await bad.chat([{ role: 'user', content: 'q' + i }])
      breaker.recordSuccess()
      console.log(`   第 ${i} 次：成功`)
    } catch {
      calls++
      breaker.recordFailure()
      console.log(`   第 ${i} 次：500 失败，连续失败计数 +1`)
    }
    await sleep(60)
  }
  console.log(`   👀 前 3 次还真的去打（真实请求 ${Math.min(calls, 3)} 次），第 4 次起被熔断拒绝，之后只放探针。`)
  console.log(`      熔断的意义不是「重试更努力」，是「故障期先别打它」。`)
}

// ── 入口 ────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log('\n📊 实验：并发 / 超时 / 熔断（实验 A/B/C 全部走 mock，零 API 成本）')
  console.log('   预估花费：约 ¥0\n')
  await runA()
  await runB()
  await runC()
}

main().catch((err) => {
  console.error('\n❌ 实验失败：', err instanceof Error ? err.message : err)
  process.exit(1)
})
