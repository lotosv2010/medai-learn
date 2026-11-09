/**
 * 阶段二 · 第 03 篇《前端接流式：接得上，更要接得住》实验
 *
 * 一个自包含的服务：起一个实验页 + 一个流式端点，三组实验全在浏览器里跑。
 *   GET /          实验页（实验 A / B / C）
 *   GET /client.js esbuild 打包后的前端单文件
 *   GET /sse       调 DeepSeek 流式接口，逐帧转发（实验 A / C 用）
 *
 * 跑法（仓库根目录）：
 *   nvm use 22
 *   pnpm --filter @medai/labs p2-client
 * 然后浏览器打开 http://127.0.0.1:3004/
 */

import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSync } from 'esbuild'
import { loadEnv, requireKey, printBudget } from '../../shared/env.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const apiKey = requireKey(loadEnv(), 'DEEPSEEK_API_KEY', 'https://platform.deepseek.com/api_keys')
// 刻意选一道会「分点列出」的题：回答越长，delta 越多，两种渲染策略的差距越明显
const QUESTION =
  '请分点说明阿莫西林胶囊的适应症、常见不良反应、禁忌人群、药物相互作用和注意事项，每条一两句。'
const PORT = 3004

// 📚 知识点：esbuild 的 buildSync 把 client.ts 打成单文件 IIFE，前端不引任何库、也不配打包器
// 实验代码的「零前端工程依赖」，为的是让读者看见每一行原始逻辑，而不是被构建配置分心
const clientJs = buildSync({
  entryPoints: [resolve(HERE, 'client.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  write: false,
}).outputFiles[0].text

const page = readFileSync(resolve(HERE, 'index.html'), 'utf-8')

async function callModel(signal: AbortSignal): Promise<Response> {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: QUESTION }], stream: true }),
    signal,
  })
  if (!res.ok) throw new Error(`上游 ${res.status}：${await res.text()}`)
  return res
}

// 服务端只负责「找帧边界、原样转发」，不解析 JSON——内容解读是客户端的事（本篇主角）
async function handleSse(res: import('node:http').ServerResponse, signal: AbortSignal): Promise<void> {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.flushHeaders()

  const decoder = new TextDecoder()
  let buf = ''
  try {
    const upstream = await callModel(signal)
    const reader = upstream.body!.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let idx: number
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const frame = buf.slice(0, idx)
        buf = buf.slice(idx + 2)
        if (frame.startsWith('data: ')) res.write(`${frame}\n\n`)
      }
    }
  } finally {
    res.end()
  }
}

createServer((req, res) => {
  // 📚 知识点：'close' 在「正常结束」和「客户端断开」时都会触发，
  // 用 !res.writableEnded 区分两者——只有还没写完就断开，才是用户主动停止（实验 C 的证据）
  const ac = new AbortController()
  res.on('close', () => {
    if (!res.writableEnded) {
      ac.abort()
      console.log('🛑 客户端主动断开，上游请求被取消（实验 C 的关键日志）')
    }
  })

  const url = req.url ?? '/'
  if (url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(page)
    return
  }
  if (url === '/client.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' })
    res.end(clientJs)
    return
  }
  if (url === '/sse') {
    handleSse(res, ac.signal).catch((err) => {
      if (!ac.signal.aborted) console.error('❌ 上游出错：', err)
      if (!res.writableEnded) res.end()
    })
    return
  }
  res.writeHead(404)
  res.end()
}).listen(PORT, () => {
  printBudget('前端接流式（每点一次「开始」就是 1 次真实调用）', 4, 1200, 1)
  console.log(`🌊 实验页：http://127.0.0.1:${PORT}/\n`)
  console.log('   实验 A：两种渲染策略，对比 delta 数 / 渲染次数 / 长任务数')
  console.log('   实验 B：一个汉字 3 字节按 2 字节切，对比 TextDecoder 两种用法')
  console.log('   实验 C：点「停止生成」，看服务端日志与 DevTools 的 (canceled)\n')
})
