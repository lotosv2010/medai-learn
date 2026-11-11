/**
 * 阶段二 · 第 07 篇 —— 两个真实厂商的 Adapter（类型契约演示）
 *
 * 📚 知识点：DeepSeek 只实现 ChatProvider，通义两个都实现。
 * 「换模型只改一行」的类型学基础就是这两个接口分开：编译期就能拦住
 * 「把 DeepSeek 当 EmbeddingProvider 用」这类误用。
 * 方法体是骨架（真实 fetch 报文见 01/02/06 篇实验），本篇只演示类型契约。
 */

import { ChatMessage, ChatProvider, ChatResult, Delta, EmbeddingProvider } from './types.ts'

const SKELETON = '演示骨架：真实报文见对应篇章实验'

export class DeepSeekAdapter implements ChatProvider {
  readonly modelId = 'deepseek-chat'
  constructor(private readonly apiKey: string) {}

  async chat(_messages: ChatMessage[], _signal?: AbortSignal): Promise<ChatResult> {
    throw new Error(SKELETON) // 01 篇
  }

  async *streamChat(_messages: ChatMessage[], _signal?: AbortSignal): AsyncIterable<Delta> {
    throw new Error(SKELETON) // 02 篇
  }
  // 👈 没有 embed：DeepSeek 不提供 embedding，这是它的「类型边界」
}

export class QwenAdapter implements ChatProvider, EmbeddingProvider {
  readonly modelId = 'qwen3.8-flash'
  constructor(private readonly apiKey: string) {}

  async chat(_messages: ChatMessage[], _signal?: AbortSignal): Promise<ChatResult> {
    throw new Error(SKELETON) // 01 篇
  }

  async *streamChat(_messages: ChatMessage[], _signal?: AbortSignal): AsyncIterable<Delta> {
    throw new Error(SKELETON) // 02 篇
  }

  async embed(_texts: string[]): Promise<number[][]> {
    throw new Error(SKELETON) // 06 篇
  }
}
