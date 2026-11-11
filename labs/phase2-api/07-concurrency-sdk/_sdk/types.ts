/**
 * 阶段二 · 第 07 篇《并发、超时与 SDK 收口》——最小 SDK 骨架 · 类型契约
 *
 * 📚 知识点（接口隔离原则 ISP）：
 * ChatProvider 与 EmbeddingProvider 必须拆成两个接口。
 * 不是所有「能聊天的模型」都能「算向量」——DeepSeek 就只有 chat 没有 embed。
 * 塞进同一个接口，等于逼 DeepSeek 实现一个它做不到的 embed（假实现）。
 */

/** 一个消息：这里只保留演示用到的最小字段 */
export interface ChatMessage {
  role: string
  content: string
}

/** 失败四分类：01 篇「错误二分法」的落地 */
export type ErrorCategory = 'retryable' | 'terminal' | 'rate_limited' | 'auth'

export interface Usage {
  prompt: number
  completion: number
  cached?: number
}

/** 归一化后的统一结果（01 篇 ChatResult 的延续） */
export interface ChatResult {
  content: string
  usage: Usage
  finishReason: string
  raw: unknown
}

/** 流式的一小段增量 */
export interface Delta {
  content: string
}

/** 能对话的模型 */
export interface ChatProvider {
  readonly modelId: string
  chat(messages: ChatMessage[], signal?: AbortSignal): Promise<ChatResult>
  streamChat(messages: ChatMessage[], signal?: AbortSignal): AsyncIterable<Delta>
}

/** 能算向量的模型——单独一个接口，能不能 embed 由类型系统约束 */
export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>
}
