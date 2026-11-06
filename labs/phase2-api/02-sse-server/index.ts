/**
 * 阶段二 · 第 02 篇《SSE 服务端：流式不是「更快返回」，是「更早开始」》实验
 *
 * 主案例只做两件事：
 *   /sse   调一次 DeepSeek 流式接口，把增量用 SSE 帧转发出去（真流式）
 *   /block 等模型全部写完，一次性发出去（整段发，对照组）
 *
 * 服务端不解读业务内容（不解析 JSON），它只负责判断「哪里是一帧」。
 *
 * 跑法（仓库根目录）：
 *   nvm use 22
 *   pnpm --filter @medai/labs p2-sse
 *
 * 看效果（另开一个终端）：
 *   curl -N http://127.0.0.1:3002/sse     ← 逐字出现
 *   curl    http://127.0.0.1:3002/sse     ← 去掉 -N，攒着一起出（客户端缓冲）
 *   curl -N -w '\n首字节 %{time_starttransfer}s 总耗时 %{time_total}s\n' http://127.0.0.1:3002/block
 */

import { createServer } from 'node:http'
import { loadEnv, requireKey, printBudget } from '../../shared/env.ts'

// ── 配置 ────────────────────────────────────────────────────────────────
const apiKey = requireKey(loadEnv(), 'DEEPSEEK_API_KEY', 'https://platform.deepseek.com/api_keys')
const QUESTION = '阿莫西林胶囊的常见不良反应有哪些？请用三句话概括。'
const PORT = 3002
/** --trace：打印前 5 个网络分片的到达时刻（实验 A 的时间线） */
const trace = process.argv.includes('--trace')

const requestBody = (stream: boolean) =>
  JSON.stringify({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: QUESTION }],
    stream, // 👈 真流式与整段发，唯一的差别就是这一个布尔值
  })

async function callModel(stream: boolean, signal: AbortSignal): Promise<Response> {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: requestBody(stream),
    signal,
  })
  if (!res.ok) throw new Error(`上游 ${res.status}：${await res.text()}`)
  return res
}

// ══════════════════════════════════════════════════════════════════════════
// 一、真流式：模型吐一点，我们转一点
// ══════════════════════════════════════════════════════════════════════════

async function handleStream(res: import('node:http').ServerResponse, signal: AbortSignal): Promise<void> {
  // ① 四个响应头，告诉中间每一层「这是事件流，别攒着」
  res.writeHead(200, {
    'Content-Type': 'text/event-stream', // 这是事件流，不是一堆文本
    'Cache-Control': 'no-cache', // 流是一次性的，别缓存
    Connection: 'keep-alive', // 这条连接要一直开着
    'X-Accel-Buffering': 'no', // 本地删了没感觉，上线删了就「憋八秒吐一次」
  })
  res.flushHeaders() // ② 先把头发出去，否则客户端连响应头都要等到第一帧

  // ③ 心跳：冒号开头是注释帧，客户端不会触发 message，只用来保活
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 3000)

  const decoder = new TextDecoder()
  let buf = ''
  // 这两个计数是实验 A 的全部证据：分片数 ≠ 帧数
  const started = performance.now()
  let reads = 0
  let frames = 0

  try {
    const upstream = await callModel(true, signal)
    const reader = upstream.body!.getReader()

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      reads += 1
      // 加 --trace 能看见「每个字节块什么时候到」，这就是文章实验 A 的时间线
      if (trace && reads <= 5) {
        console.log(`   分片 ${reads}: ${Math.round(performance.now() - started)}ms  ${value.byteLength} 字节`)
      }

      // ④ 一个汉字 3 字节，可能被网络切成两半；{ stream: true } 把残片留到下一轮拼
      buf += decoder.decode(value, { stream: true })

      // ⑤ 一个网络分片可能是半帧，也可能同时带来好几帧 → 只能按「两个换行」切
      let idx: number
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const frame = buf.slice(0, idx)
        buf = buf.slice(idx + 2)
        // 原样转发，不解析 JSON：服务端只负责找帧边界，内容留给客户端
        if (frame.startsWith('data: ')) {
          frames += 1
          res.write(`${frame}\n\n`) // 👈 两个换行才是帧结束
        }
      }
    }
  } finally {
    clearInterval(heartbeat)
    res.end()
    console.log(`   ✅ 这一次：${reads} 个网络分片 → ${frames} 个 data 帧（分片数 ≠ 帧数）`)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 二、整段发：对照组。首字节 = 总耗时，用户全程干等
// ══════════════════════════════════════════════════════════════════════════

async function handleBlock(res: import('node:http').ServerResponse, signal: AbortSignal): Promise<void> {
  const upstream = await callModel(false, signal)
  const json = (await upstream.json()) as { choices?: Array<{ message?: { content?: string } }> }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end(json.choices?.[0]?.message?.content ?? '')
}

// ── 路由 ────────────────────────────────────────────────────────────────
createServer(async (req, res) => {
  // 用户关页面 → 上游也停下。不写这几行，账单还在继续跑
  const ac = new AbortController()
  res.on('close', () => ac.abort())

  try {
    if (req.url === '/block') await handleBlock(res, ac.signal)
    else await handleStream(res, ac.signal)
  } catch (err) {
    if (!ac.signal.aborted) {
      console.error('❌ 上游出错：', err)
      if (!res.writableEnded) res.end()
    }
  }
}).listen(PORT, () => {
  printBudget('SSE 流式转发（每打一次 curl 就是 1 次真实调用）', 1, 800, 1)
  console.log(`🌊 服务已起：http://127.0.0.1:${PORT}\n`)
  console.log(`   真流式  curl -N http://127.0.0.1:${PORT}/sse       ← 逐字出现`)
  console.log(`   整段发  curl -N http://127.0.0.1:${PORT}/block     ← 憋到最后一起出`)
  console.log(`   量数字  curl -N -w '\\n首字节 %{time_starttransfer}s 总耗时 %{time_total}s\\n' http://127.0.0.1:${PORT}/sse`)
  console.log('\n   Ctrl+C 结束\n')
})
