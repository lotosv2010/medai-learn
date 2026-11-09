/**
 * 阶段二 · 第 03 篇实验 · 前端逻辑（esbuild 打包成 /client.js）
 *
 * 三组实验全在浏览器里跑，不引任何库：
 *   A 两种渲染策略：每个 delta 直接写 DOM vs buffer + requestAnimationFrame
 *   B 字节边界：一个汉字 3 字节按 2 字节切，TextDecoder 两种用法的差别
 *   C abort 传播：点「停止生成」后，上游是否真的被取消
 */

// ── 实验 A：手写 SSE 解析器（对应文章「深入」章的坑二） ─────────────────

type DeltaCallback = (text: string) => void

/**
 * 「切」的一半：把 buf 里所有完整的帧切出来，返回切不动的半帧。
 *
 * 📚 知识点：三个必须处理的边界
 *   ① 按「两个换行」切帧，不是按 data: 切——一个事件可以带多个字段，空行才是分界
 *   ② 用 while 切到底——一次 read() 可能带来好几帧
 *   ③ 返回残余 buf——半帧要留到下一轮拼
 */
function drain(buf: string, onDelta: DeltaCallback): string {
  let idx: number
  while ((idx = buf.indexOf('\n\n')) !== -1) {
    const frame = buf.slice(0, idx)
    buf = buf.slice(idx + 2)
    if (frame.startsWith('data: ')) {
      const payload = frame.slice(6)
      if (payload === '[DONE]') return ''
      try {
        const json = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> }
        const delta = json.choices?.[0]?.delta?.content
        if (delta) onDelta(delta)
      } catch {
        // 线上偶发的截断或代理插入内容会让单帧 JSON.parse 抛，跳过这一帧即可，别让整条流崩掉
      }
    }
  }
  return buf
}

/**
 * 「读」的一半：读一片、切一批。
 *
 * 📚 知识点：{ stream: true } 让解码器把「不完整的多字节字符」留在内部，
 * 等下一片拼上——不开它就是实验 B 里那 10 个 �。
 */
async function consumeStream(body: ReadableStream<Uint8Array>, onDelta: DeltaCallback): Promise<void> {
  const decoder = new TextDecoder()
  const reader = body.getReader()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf = drain(buf + decoder.decode(value, { stream: true }), onDelta)
  }
}

// ── 两种渲染策略（实验 A 的主角） ───────────────────────────────────────

// 策略 A：每个 delta 都改一次 DOM。渲染次数 = delta 数，长回答必然卡
async function renderNaive(out: HTMLElement, signal: AbortSignal): Promise<number> {
  let deltas = 0
  let renders = 0
  // 📚 知识点：longTaskCount 是全局累计的，必须减掉开跑前的基线，
  // 否则策略 B 会把策略 A 留下的长任务算到自己头上，得出假结论
  const baseline = longTaskCount
  out.textContent = '' // 两次对照共用一块输出区，先清空
  const res = await fetch('/sse', { signal })
  await consumeStream(res.body!, (t) => {
    deltas += 1
    out.textContent += t // 👈 每次收到一小段就触发一次 DOM 写（等价于每次 setState）
    renders += 1
  })
  showCounts('A', deltas, renders, longTaskCount - baseline)
  return deltas
}

// 策略 B：buffer 攒着，每帧提交一次。渲染次数从「delta 数」降到「帧数」
// report=false 时只渲染不记表——实验 C 复用它，但不想往实验 A 的表格里插一行
async function renderBatched(out: HTMLElement, signal: AbortSignal, report = true): Promise<number> {
  let deltas = 0
  let renders = 0
  let buffer = ''
  let scheduled = false
  const baseline = longTaskCount
  out.textContent = '' // 两次对照共用一块输出区，先清空
  const flush = (): void => {
    if (buffer === '') return
    out.textContent += buffer
    buffer = ''
    renders += 1
    scheduled = false
  }
  const res = await fetch('/sse', { signal })
  await consumeStream(res.body!, (t) => {
    deltas += 1
    buffer += t
    if (!scheduled) {
      scheduled = true
      requestAnimationFrame(flush) // 👈 每帧最多写一次 DOM
    }
  })
  flush() // 收尾：把最后一帧还没提交的 buffer 刷出去
  if (report) showCounts('B', deltas, renders, longTaskCount - baseline)
  return deltas
}

// ── 长任务计数：PerformanceObserver 捕 longtask（实验 A 的第三个指标） ──

let longTaskCount = 0
new PerformanceObserver((list) => {
  longTaskCount += list.getEntries().length
}).observe({ type: 'longtask', buffered: true })

// ── 实验 B：字节边界（纯本地，零成本） ─────────────────────────────────

function runByteBoundaryDemo(): void {
  const text = '阿莫西林' // 每个汉字 UTF-8 编码 3 字节
  const bytes = new TextEncoder().encode(text)

  // 把字节按 2 字节一片喂给解码器，故意切在多字节字符中间
  const withoutStream = new TextDecoder()
  const withStream = new TextDecoder()
  let broken = ''
  let fixed = ''
  for (let i = 0; i < bytes.length; i += 2) {
    const slice = bytes.slice(i, i + 2)
    broken += withoutStream.decode(slice) // ❌ 不开 stream：残片被替换成 �
    fixed += withStream.decode(slice, { stream: true }) // ✅ 残片留到下一片拼
  }
  broken += withoutStream.decode()
  fixed += withStream.decode()

  const out = el('byte-boundary-result')!
  out.innerHTML = ''
  out.append(
    row('原文', text),
    row('TextDecoder()（不开 stream）', broken),
    row('TextDecoder({stream:true})', fixed),
  )
}

// ── 实验 C：abort 传播 ─────────────────────────────────────────────────

let controller: AbortController | null = null

async function startStream(): Promise<void> {
  controller = new AbortController()
  const out = el('stream-out-c')!
  out.textContent = ''
  el('stop-btn')!.removeAttribute('disabled')
  // report=false：实验 C 只关心「停没停」，不往实验 A 的表格里插一行
  await renderBatched(out, controller.signal, false)
  el('stop-btn')!.setAttribute('disabled', '')
}

function stopStream(): void {
  controller?.abort() // 👈 前端先断开连接，服务端 res.on('close') 才会触发
  el('stop-btn')!.setAttribute('disabled', '')
}

// ── 工具与事件绑定 ─────────────────────────────────────────────────────

function el(id: string): HTMLElement | null {
  return document.getElementById(id)
}

function showCounts(strategy: 'A' | 'B', deltas: number, renders: number, longTasks: number): void {
  const row = document.createElement('tr')
  row.innerHTML = `<td>策略 ${strategy}</td><td>${deltas}</td><td>${renders}</td><td>${longTasks}</td>`
  el('counts-body')!.append(row)
}

function row(a: string, b: string): HTMLTableRowElement {
  const tr = document.createElement('tr')
  tr.innerHTML = `<td>${a}</td><td>${b}</td>`
  return tr
}

function bind(): void {
  el('run-a')!.addEventListener('click', () => renderNaive(el('stream-out')!, new AbortController().signal))
  el('run-b')!.addEventListener('click', () => renderBatched(el('stream-out')!, new AbortController().signal))
  el('run-byte')!.addEventListener('click', runByteBoundaryDemo)
  el('start-c')!.addEventListener('click', startStream)
  el('stop-btn')!.addEventListener('click', stopStream)
}

bind()
