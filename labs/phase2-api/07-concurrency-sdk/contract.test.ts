/**
 * 阶段二 · 第 07 篇 · 实验 D：契约测试
 *
 * 📚 知识点：契约测试守的是「所有实现行为一致」，不是「某个实现逻辑正确」。
 * 任何新的 ChatProvider 只要通过这套用例，就能保证：正常/流式/429 降级/401 抛出/
 * 超时/abort/空 content/长回答，行为与既有实现对齐。它就是一份「可执行的接口文档」。
 *
 * 跑法（仓库根目录）：
 *   pnpm --filter @medai/labs p2-sdk-test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MockChatProvider } from './_sdk/mock-provider.ts'
import { withRetry, withTimeout, isRetryable } from './_sdk/retry.ts'
import { CircuitBreaker } from './_sdk/circuit-breaker.ts'
import { ChatProvider, ChatMessage } from './_sdk/types.ts'

const MSG = (key: string): ChatMessage[] => [{ role: 'user', content: key }]

test('① 正常：返回归一化 ChatResult', async () => {
  const p = new MockChatProvider('mock')
  const r = await p.chat(MSG('q1'))
  assert.equal(typeof r.content, 'string')
  assert.ok(r.content.length > 0)
  assert.equal(r.finishReason, 'stop')
})

test('② 流式：逐段吐出 delta，且能拼回完整内容', async () => {
  const p = new MockChatProvider('mock')
  let acc = ''
  for await (const d of p.streamChat(MSG('q2'))) acc += d.content
  const full = (await p.chat(MSG('q2'))).content
  assert.equal(acc, full)
})

test('③ 429 限流：应被分类为可重试，退避后恢复', async () => {
  const p = new MockChatProvider('mock', () => 'rate-limit')
  let attempts = 0
  const r = await withRetry(
    () => {
      attempts++
      return p.chat(MSG('q3'))
    },
    { maxRetries: 2, baseMs: 1, jitter: false, shouldRetry: isRetryable },
  )
  assert.ok(r.content.length > 0)
  assert.ok(attempts >= 2, `预期至少重试一次，实际 ${attempts} 次`)
})

test('④ 401 认证：不应重试，直接抛出', async () => {
  const p = new MockChatProvider('mock', () => 'auth')
  let attempts = 0
  await assert.rejects(
    () =>
      withRetry(
        () => {
          attempts++
          return p.chat(MSG('q4'))
        },
        { maxRetries: 3, baseMs: 1, jitter: false, shouldRetry: isRetryable },
      ),
    /401/,
  )
  assert.equal(attempts, 1, `401 不该重试，实际调了 ${attempts} 次`)
})

test('⑤ 超时：慢响应被 AbortSignal 掐断，抛出 timeout', async () => {
  const p = new MockChatProvider('mock', () => 'slow')
  await assert.rejects(
    () => withTimeout((sig) => p.chat(MSG('q5'), sig), 50),
    (err: unknown) => err instanceof Error && err.message.includes('timeout'),
  )
})

test('⑥ abort：客户端取消后调用立刻停止', async () => {
  const p = new MockChatProvider('mock', () => 'slow')
  const ac = new AbortController()
  const promise = p.chat(MSG('q6'), ac.signal)
  ac.abort()
  await assert.rejects(promise, (err: unknown) => err instanceof Error && err.message.includes('abort'))
})

test('⑦ 空 content：模型返回空串，调用层原样透出、不抛错', async () => {
  const p = new MockChatProvider('mock', () => 'empty')
  const r = await p.chat(MSG('q7'))
  assert.equal(r.content, '')
})

test('⑧ 长回答：完整返回、不被截断', async () => {
  const p = new MockChatProvider('mock', () => 'long')
  const r = await p.chat(MSG('q8'))
  assert.ok(r.content.length > 60)
})

test('⑨ 熔断器：连续失败触发 open，冷却后探针放行', async () => {
  const cb = new CircuitBreaker(2, 50)
  assert.equal(cb.canCall(), true)
  cb.recordFailure()
  cb.recordFailure() // 达到阈值 → open
  assert.equal(cb.canCall(), false)
  await new Promise((r) => setTimeout(r, 60)) // 冷却结束
  assert.equal(cb.canCall(), true) // half-open，放一个探针
})

test('⑩ 接口契约：ChatProvider 不要求 embed（ISP）', async () => {
  // 类型层面：DeepSeek 只 implements ChatProvider，没有 embed 方法
  // 这里验证「ChatProvider 结构不含 embed」这一契约承诺
  const fake: ChatProvider = new MockChatProvider('mock')
  assert.equal(typeof fake.chat, 'function')
  assert.equal(typeof fake.streamChat, 'function')
  // @ts-expect-error —— embed 不属于 ChatProvider，访问应报类型错
  assert.equal(fake.embed, undefined)
})
