/**
 * 阶段二 · 第 05 篇《Function Calling：模型只写调用单，不执行》实验
 *
 * 三个实验，全程只看「模型写了什么、你的代码做了什么」：
 *   A  完整往返：问 → 调用单 → 执行 → 回传 → 答，逐帧打印五步
 *   B  参数幻觉：不校验 vs 校验，看模型从「自信地错」变成「自己纠正」
 *   C  描述宽窄：工具 description 写太宽，会不会把「问这是什么药」也误触发
 *
 * ⚠️ 关键前提：全程 thinking: disabled。思考模式会拖慢并改变行为，污染 A/B 对照。
 *
 * 跑法（仓库根目录）：
 *   pnpm --filter @medai/labs p2-tools
 */

import { loadEnv, requireKey, printBudget } from '../../shared/env.ts'
import { TOOL_DEFINITION, TOOL_DEFINITION_BROAD, executeTool } from './tools.ts'
import { lookupInteraction } from './drug-db.ts'

// ── 配置 ────────────────────────────────────────────────────────────────
const apiKey = requireKey(loadEnv(), 'DEEPSEEK_API_KEY', 'https://platform.deepseek.com/api_keys')
const ENDPOINT = 'https://api.deepseek.com/chat/completions'
const MODEL = 'deepseek-chat'

interface Msg {
  role: 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}
interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

/**
 * 统一的调用入口。tools 是发给模型的「说明书」，模型据此决定要不要写调用单。
 *
 * 📚 知识点：tool_calls 和 content 是「或」的关系——
 * 模型要么写调用单（content 为 null、finish_reason='tool_calls'），
 * 要么直接说话（content 有值、finish_reason='stop'）。这是判断「它停了还是没停」的唯一依据。
 */
async function chat(messages: Msg[], toolDef: unknown): Promise<{ message: Msg; finishReason: string }> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: [toolDef],
      thinking: { type: 'disabled' },
      temperature: 0,
    }),
  })
  if (!res.ok) throw new Error(`上游 ${res.status}：${await res.text()}`)

  const json = (await res.json()) as {
    choices: Array<{ message: Msg; finish_reason: string }>
  }
  return { message: json.choices[0].message, finishReason: json.choices[0].finish_reason }
}

// ══════════════════════════════════════════════════════════════════════════
// 实验 A：一次完整往返，逐帧打印五个步骤
// ══════════════════════════════════════════════════════════════════════════
async function runA(): Promise<void> {
  console.log('\n════ 实验 A：一次完整往返 ════')
  const question = '阿莫西林能和布洛芬一起吃吗？'

  // ① 你的代码：把工具定义发给模型
  console.log('\n① 发出去的 tools（只是一张说明书）：')
  console.log(JSON.stringify(TOOL_DEFINITION, null, 2))

  // ② 模型：输出调用单
  const first = await chat([{ role: 'user', content: question }], TOOL_DEFINITION)
  const call = first.message.tool_calls?.[0]
  console.log(`\n② 模型返回的 tool_calls（finish_reason=${first.finishReason}）：`)
  console.log(JSON.stringify(call, null, 2))
  console.log('   ⚠️ 到这一步为止，没有函数被调用、没有网络请求——模型只写了一张调用单。')
  if (!call) {
    console.log('   模型没写调用单，直接回答了：', first.message.content)
    return
  }

  // ③ 你的代码：校验 + 执行（真正产生副作用的地方）
  console.log(`\n③ 你的代码执行。注意 arguments 的类型是 ${typeof call.function.arguments}（字符串，要自己 parse）：`)
  const exec = executeTool(call.function.arguments)
  console.log(`   执行结果 → ${exec.result}`)

  // ④ 你的代码：把结果作为 role:'tool' 回传
  const toolMsg: Msg = { role: 'tool', tool_call_id: call.id, content: exec.result }
  console.log('\n④ 回传给模型的消息：')
  console.log(JSON.stringify(toolMsg, null, 2))

  // ⑤ 模型：据结果生成最终回答
  const second = await chat(
    [
      { role: 'user', content: question },
      { role: 'assistant', content: null, tool_calls: [call] },
      toolMsg,
    ],
    TOOL_DEFINITION,
  )
  console.log('\n⑤ 模型的最终回答：')
  console.log(`   ${second.message.content}`)
}

// ══════════════════════════════════════════════════════════════════════════
// 实验 B：参数幻觉 —— 不校验 vs 校验
// ══════════════════════════════════════════════════════════════════════════
async function runB(): Promise<void> {
  console.log('\n════ 实验 B：参数幻觉 —— 不校验 vs 校验 ════')
  // 「头孢克肟」不在 mock 库的 DRUG_NAMES 里，模型只能编一个不存在的药名
  const question = '阿莫西林和头孢克肟能一起吃吗？'

  // B1：不校验版 —— 直接查库，查不到就回「暂无数据」
  const r1 = await chat([{ role: 'user', content: question }], TOOL_DEFINITION)
  const c1 = r1.message.tool_calls?.[0]
  if (!c1) {
    console.log('   模型没写调用单，直接回答了：', r1.message.content)
    return
  }
  let args1: { drugA: string; drugB: string } | null = null
  try {
    args1 = JSON.parse(c1.function.arguments) as { drugA: string; drugB: string }
  } catch {
    /* 参数不是合法 JSON，交给 lookup 前的兜底 */
  }
  const rawResult = args1 ? lookupInteraction(args1.drugA, args1.drugB) : '参数不是合法 JSON'
  console.log('\n  [不校验] 模型给出的参数：', c1.function.arguments)
  console.log(`  [不校验] 不过 Zod、直接查库 → ${rawResult}`)
  const final1 = await chat(
    [
      { role: 'user', content: question },
      { role: 'assistant', content: null, tool_calls: [c1] },
      { role: 'tool', tool_call_id: c1.id, content: rawResult },
    ],
    TOOL_DEFINITION,
  )
  console.log(`  [不校验] 模型据「暂无数据」得出的结论 → ${final1.message.content}`)

  // B2：校验版 —— Zod 拦住不存在的药名，回传纠错消息
  const r2 = await chat([{ role: 'user', content: question }], TOOL_DEFINITION)
  const c2 = r2.message.tool_calls?.[0]
  if (!c2) return
  const exec2 = executeTool(c2.function.arguments)
  console.log('\n  [校验]   模型给出的参数：', c2.function.arguments)
  console.log(`  [校验]   Zod 拦截 → ${exec2.result}`)
  const final2 = await chat(
    [
      { role: 'user', content: question },
      { role: 'assistant', content: null, tool_calls: [c2] },
      { role: 'tool', tool_call_id: c2.id, content: exec2.result },
    ],
    TOOL_DEFINITION,
  )
  console.log(`  [校验]   模型收到纠错消息后的回应 → ${final2.message.content}`)
}

// ══════════════════════════════════════════════════════════════════════════
// 实验 C：工具描述宽窄对照
// ══════════════════════════════════════════════════════════════════════════
async function runC(): Promise<void> {
  console.log('\n════ 实验 C：工具描述宽窄对照 ════')
  // 「各自的用法用量」是药品信息查询，但明确不是问相互作用
  const question = '阿莫西林和布洛芬各自的用法用量是什么？'

  const broad = await chat([{ role: 'user', content: question }], TOOL_DEFINITION_BROAD)
  console.log(`\n  [宽描述「查询药品信息」] 触发工具：${broad.finishReason === 'tool_calls' ? '是（误触发）' : '否（直接回答）'}`)
  console.log(broad.finishReason === 'tool_calls' ? `    它想调用：${JSON.stringify(broad.message.tool_calls?.[0])}` : `    直接回答：${broad.message.content}`)

  const narrow = await chat([{ role: 'user', content: question }], TOOL_DEFINITION)
  console.log(`\n  [窄描述「仅相互作用时调用」] 触发工具：${narrow.finishReason === 'tool_calls' ? '是' : '否（直接回答）'}`)
  console.log(narrow.finishReason === 'tool_calls' ? `    它想调用：${JSON.stringify(narrow.message.tool_calls?.[0])}` : `    直接回答：${narrow.message.content}`)
}

// ── 入口 ────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  // A 2 次 + B 4 次 + C 2 次，共 8 次真实调用
  printBudget('DeepSeek Function Calling 对照（A:2 + B:4 + C:2）', 8, 8000, 1)
  await runA()
  await runB()
  await runC()
}

main().catch((err) => {
  console.error('\n❌ 实验失败：', err instanceof Error ? err.message : err)
  process.exit(1)
})
