/**
 * 阶段二 · 第 07 篇 —— 假模型
 *
 * 📚 知识点：错误场景全部走 mock，零成本。真实 API 里「等它超时」「撞上 500」
 * 又慢又花钱，mock 把这些失败路径变成可复现的几行。01/07 篇的错误场景都靠它。
 */

import { ChatMessage, ChatProvider, ChatResult, Delta } from './types.ts'

/** 一次调用可能遇到的故障类型 */
export type Fault = 'ok' | 'slow' | 'server-error' | 'rate-limit' | 'auth' | 'empty' | 'long'

function httpError(status: number): Error & { status: number } {
  return Object.assign(new Error(`上游 ${status}`), { status })
}

/** 实验 A 的确定性命运：20 个任务里 4 个慢（20%）、2 个 500（10%），其余正常 */
export function fateFor(taskIndex: number): Fault {
  if ([3, 8, 13, 18].includes(taskIndex)) return 'slow'
  if ([6, 16].includes(taskIndex)) return 'server-error'
  return 'ok'
}

export class MockChatProvider implements ChatProvider {
  readonly modelId: string
  private attempts = new Map<string, number>()

  /** fault：按消息 key 决定这次调用会遇到什么故障（默认全部 ok） */
  constructor(modelId: string, private fault: (key: string) => Fault = () => 'ok') {
    this.modelId = modelId
  }

  private nextAttempt(key: string): number {
    const n = (this.attempts.get(key) ?? 0) + 1
    this.attempts.set(key, n)
    return n
  }

  /** 慢响应：拖到被 signal 掐断为止（无 signal 则拖 10 秒） */
  private async hang(signal?: AbortSignal): Promise<void> {
    if (!signal) {
      await new Promise<void>((r) => setTimeout(r, 10_000))
      return
    }
    await new Promise<void>((_, reject) => {
      const t = setTimeout(() => {}, 10_000)
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(t)
          reject(signal.reason ?? new Error('aborted'))
        },
        { once: true },
      )
    })
  }

  async chat(messages: ChatMessage[], signal?: AbortSignal): Promise<ChatResult> {
    const key = messages[0]?.content ?? ''
    const attempt = this.nextAttempt(key)
    const fault = this.fault(key)

    // 可恢复故障只在第一次调用时发作，给重试留出恢复空间；auth 永不恢复
    if (fault === 'auth') throw httpError(401)
    if (fault === 'server-error' && attempt === 1) throw httpError(500)
    if (fault === 'rate-limit' && attempt === 1) throw httpError(429)
    if (fault === 'slow' && attempt === 1) await this.hang(signal)

    if (fault === 'empty') {
      return { content: '', usage: { prompt: 5, completion: 0 }, finishReason: 'stop', raw: null }
    }
    const content =
      fault === 'long' ? '这是' + '一段'.repeat(60) + '长回答' : `[${this.modelId}] 对「${key}」的回答`

    // 正常延迟，模拟网络往返
    await new Promise((r) => setTimeout(r, 120 + Math.random() * 80))
    return { content, usage: { prompt: 10, completion: content.length }, finishReason: 'stop', raw: null }
  }

  async *streamChat(messages: ChatMessage[], signal?: AbortSignal): AsyncIterable<Delta> {
    // 流式复用同一套故障注入：先把错误/慢响应走一遍，再逐字吐增量
    const result = await this.chat(messages, signal)
    for (const ch of result.content) yield { content: ch }
  }
}
