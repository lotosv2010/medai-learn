/**
 * 阶段二 · 第 07 篇 —— 超时与重试
 *
 * 📚 知识点：指数退避必须加 jitter。
 * 无 jitter 时，同一秒失败的一批请求会在同一个时刻重试，再次把对方打限流——雪崩。
 */

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * 01 篇「错误二分法」的落地：哪些错误值得重试/降级，哪些直接抛。
 * 判据一句话：换成另一家厂商，这个错误会不会消失？
 * 会 → retryable（429/500/503/超时/网络中断）；不会 → terminal/auth（400/401/402/422）。
 */
export function isRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  if (/401|402|400|422/.test(msg)) return false
  return /429|500|503|timeout|aborted|fetch failed/i.test(msg)
}

/** 第 attempt 次重试的等待时长：base * 2^attempt，jitter 叠加 ±50% 随机 */
export function backoffMs(attempt: number, baseMs: number, jitter = true): number {
  const exp = baseMs * 2 ** attempt
  return jitter ? exp * (0.5 + Math.random()) : exp
}

/** 给一次调用加超时：超时即 abort，抛出 'timeout' */
export async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(new Error('timeout')), ms)
  try {
    return await fn(ac.signal)
  } finally {
    clearTimeout(timer)
  }
}

/** 带退避的重试：shouldRetry 决定哪些错误值得重试（01 篇的 retryable / rate_limited） */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxRetries: number; baseMs: number; shouldRetry: (err: unknown) => boolean; jitter?: boolean },
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt === opts.maxRetries || !opts.shouldRetry(err)) throw err
      await sleep(backoffMs(attempt, opts.baseMs, opts.jitter))
    }
  }
  throw lastErr
}
