/**
 * 阶段二 · 第 03 篇 · 实验 A 的「可复现测量」
 *
 * 为什么要单独这个脚本？
 * 渲染次数这件事必须用真实 delta 的「到达时刻」来算：策略 A 的渲染次数恒等于 delta 数（构造上必然），
 * 策略 B 的渲染次数取决于「有多少个 16.7ms 的帧里收到过内容」。
 * 浏览器里能看到，但截图里的数字无法复现；这里用真实的流把两个数字同时算出来，人人可重跑。
 *
 * 跑法（先起 p2-client 服务）：
 *   pnpm --filter @medai/labs p2-client        ← 终端 1
 *   pnpm --filter @medai/labs p2-client-measure ← 终端 2
 */

import { printTable } from '../../shared/env.ts'

const ENDPOINT = 'http://127.0.0.1:3004/sse'
const FRAME_MS = 1000 / 60 // 60fps 下一帧约 16.7ms

interface DeltaFrame {
  /** 从请求发出到这一帧到达的毫秒数 */
  at: number
  /** 这一帧的增量文本长度 */
  len: number
}

async function collectArrivals(): Promise<{ frames: DeltaFrame[]; firstByteMs: number; totalMs: number }> {
  const t0 = performance.now()
  const res = await fetch(ENDPOINT)
  const decoder = new TextDecoder()
  const reader = res.body!.getReader()
  const frames: DeltaFrame[] = []
  let buf = ''
  let firstByteMs = -1

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (firstByteMs < 0) firstByteMs = performance.now() - t0
    // 📚 知识点：必须开 { stream: true }，否则中文会被网络分片切坏（实验 B 的主题）
    buf += decoder.decode(value, { stream: true })

    let idx: number
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const frame = buf.slice(0, idx)
      buf = buf.slice(idx + 2)
      if (!frame.startsWith('data: ')) continue
      const payload = frame.slice(6)
      if (payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> }
        const text = json.choices?.[0]?.delta?.content
        if (text) frames.push({ at: performance.now() - t0, len: text.length })
      } catch {
        // 半截 JSON 帧跳过
      }
    }
  }
  return { frames, firstByteMs, totalMs: performance.now() - t0 }
}

/**
 * 模拟策略 B：把时间轴按 16.7ms 切成帧，凡是「这一帧区间内有 delta 到达」就记一次提交。
 * 📚 知识点：rAF 的语义正是如此——一个回调里把所有攒下来的增量一次性写进 DOM，
 * 所以「提交次数」= 「有产出的帧数」，而不是「delta 数」。
 */
function countRafCommits(frames: DeltaFrame[]): number {
  if (frames.length === 0) return 0
  const end = frames[frames.length - 1].at
  let commits = 0
  for (let frameStart = 0; frameStart <= end; frameStart += FRAME_MS) {
    const frameEnd = frameStart + FRAME_MS
    if (frames.some((f) => f.at >= frameStart && f.at < frameEnd)) commits += 1
  }
  return commits
}

async function main(): Promise<void> {
  console.log('\n📊 实验 A：两种渲染策略的可复现测量')
  console.log('   本次会发起 1 次真实调用（约 ¥0.01），确保本机 p2-client 服务已启动\n')

  const { frames, firstByteMs, totalMs } = await collectArrivals()
  const naiveRenders = frames.length // 策略 A：每个 delta 写一次 DOM，渲染次数恒等于 delta 数
  const batchedRenders = countRafCommits(frames)
  const ratio = batchedRenders === 0 ? 0 : naiveRenders / batchedRenders

  printTable(
    ['指标', '数值', '说明'],
    [
      ['首字节时间', `${Math.round(firstByteMs)} ms`, '流式的全部收益所在'],
      ['总耗时', `${Math.round(totalMs)} ms`, '模型生成完的墙钟时间'],
      ['delta 数', `${frames.length}`, '带 content 的增量帧数'],
      ['策略 A 渲染次数', `${naiveRenders}`, '= delta 数（构造上必然）'],
      ['策略 B 渲染次数', `${batchedRenders}`, `= 有内容到达的帧数（60fps）`],
      ['A / B 倍数', `${ratio.toFixed(1)} 倍`, '渲染次数被收敛的倍数'],
    ],
  )

  console.log('   结论：两条路径拿到的 delta 数完全一样，但写 DOM 的次数差 ' + ratio.toFixed(1) + ' 倍。')
  console.log('   策略 A 的每一次写入都可能触发一次样式计算与重排；策略 B 把它们压进一帧里只做一次。\n')
}

main().catch((err) => {
  console.error('❌ 测量失败（确认 p2-client 服务已在 3004 端口启动）：', err)
  process.exit(1)
})
