/**
 * 阶段三 · 共用调用入口：02~06 篇每篇都需要的「发一次 DeepSeek 请求」。
 *
 * 📚 知识点：为什么把它单独抽出来？
 * 阶段二每篇都自己写一遍 fetch（裸调、不引 SDK，为了看懂每一行），
 * 阶段三起「调用」已经是地基，不是学习目标——重复写反而挡住本阶段真正要学的「编排」。
 * 所以这里收敛成 20 行，02~06 篇 import 即用。
 *
 * 注意：01 篇的 eval.ts 里也有一份几乎相同的 callModel，这里没有去动它——
 * 01 篇已发布，保持零回归；实验代码不追求生产质量，两处小重复可接受。
 */

import type { Message } from './prompts.ts'

const BASE_URL = 'https://api.deepseek.com'
const MODEL = 'deepseek-chat'

export interface CallResult {
  content: string
  prompt: number
  completion: number
}

export interface CallOptions {
  /** 不传 = 用模型的默认采样；传 0 = 贪心解码（锁定最高概率 token） */
  temperature?: number
}

/**
 * 一次真实调用：发 messages，返回文本 + token 用量。
 *
 * 📚 知识点：temperature 默认不传——它是「顺序对照」这类实验里的隐藏变量（见 02 篇实验 B）。
 * 贪心解码（temperature=0）永远选概率最高的那个 token，会把「模型对中间那份信心不足、
 * 在相似候选间漂移」这个真实现象藏起来；默认采样才让位置效应可观察。
 */
export async function callModel(apiKey: string, messages: Message[], opts?: CallOptions): Promise<CallResult> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, messages, ...opts }),
  })
  if (!res.ok) throw new Error(`上游 ${res.status}：${await res.text()}`)
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  return {
    content: json.choices?.[0]?.message?.content ?? '',
    prompt: json.usage?.prompt_tokens ?? 0,
    completion: json.usage?.completion_tokens ?? 0,
  }
}
