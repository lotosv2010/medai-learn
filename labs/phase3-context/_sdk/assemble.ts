/**
 * 阶段三 · 第 02 篇《上下文组装：一次调用里放了什么、各占多少》——上下文组装器
 *
 * 📚 知识点：上下文组装（Context Assembly）只做两件事——「分配预算」和「排定顺序」。
 * 本文件是这两件事的最小实现，供 03~06 篇复用（03 加 compress、04 加 memory、05 加 cost、06 加 long-doc）。
 *
 * 顺序规则 = 稳定内容在前、易变/关键内容在尾。这条规则同时服务于两个维度：
 *   ① 注意力（关键信息放头尾更容易被召回——阶段一 01 篇的 Lost in the Middle 结论）
 *   ② 缓存（稳定前缀在前，05 篇的 Prompt Caching 才能命中）
 * 两个维度方向恰好一致，所以只需记一条顺序。
 */

import { countTokens, encode, decode } from 'gpt-tokenizer'
import type { Message } from './prompts.ts'

/** 一次调用里常见的六类上下文来源 */
export type BlockKind = 'system' | 'history' | 'rag' | 'toolDesc' | 'toolResult' | 'user'

/**
 * 每类内容「最多放多少 token」的配额表。
 *
 * 📚 Partial<Record<BlockKind, number>> 展开读是 { system?: number; history?: number; ... }——
 * 每一项都可选，没写的那一类不截断。起个别名，调用处一眼就知道这是「配额」而不是普通对象。
 */
export type Quota = Partial<Record<BlockKind, number>>

export interface Block {
  kind: BlockKind
  content: string
}

/** 稳定在前、关键在尾的固定顺序（index 越小越靠前） */
export const ORDER: BlockKind[] = ['system', 'toolDesc', 'history', 'rag', 'toolResult', 'user']

/** 每类内容映射到 chat message 的 role（历史/检索/工具结果简化成 user 段，学习脚手架够用） */
const ROLE: Record<BlockKind, 'system' | 'user'> = {
  system: 'system',
  toolDesc: 'system',
  history: 'user',
  rag: 'user',
  toolResult: 'user',
  user: 'user',
}

/** ① 统计每一类的 token 数与占比（gpt-tokenizer 本地估算，零调用） */
export function measureBudget(blocks: Block[]): Array<{ kind: BlockKind; tokens: number; ratio: number }> {
  const total = blocks.reduce((s, b) => s + countTokens(b.content), 0)
  const byKind = new Map<BlockKind, number>()
  for (const b of blocks) byKind.set(b.kind, (byKind.get(b.kind) ?? 0) + countTokens(b.content))
  return ORDER.filter((k) => byKind.has(k)).map((kind) => {
    const tokens = byKind.get(kind)!
    return { kind, tokens, ratio: total === 0 ? 0 : tokens / total }
  })
}

/** 把一段文本截断到 maxTokens 以内（按 token 数，不是按字符数） */
export function truncateTo(text: string, maxTokens: number): string {
  const ids = encode(text)
  if (ids.length <= maxTokens) return text
  return decode(ids.slice(0, maxTokens))
}

/**
 * ② 按「稳定在前、关键在尾」排定顺序 + 按配额截断，组装成 messages。
 * 超配额的那一类（通常是被历史、工具结果塞爆）会被截断——预算管理是这些下游手段的触发条件。
 */
export function assemble(blocks: Block[], quota: Quota): Message[] {
  const sorted = [...blocks].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))
  const byKind = new Map<BlockKind, string>()
  for (const b of sorted) {
    const prev = byKind.get(b.kind)
    byKind.set(b.kind, prev ? `${prev}\n${b.content}` : b.content)
  }
  const messages: Message[] = []
  for (const kind of ORDER) {
    const text = byKind.get(kind)
    if (text == null) continue
    const limit = quota[kind]
    messages.push({ role: ROLE[kind], content: limit != null ? truncateTo(text, limit) : text })
  }
  return messages
}
