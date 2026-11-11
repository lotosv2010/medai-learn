/**
 * 阶段二 · 第 07 篇 —— 熔断器三态
 *
 * 📚 知识点：closed → open → half-open。
 * 连续失败 N 次直接「先别打它」（保护自己也保护对方），冷却后放一个探针，
 * 探针成功恢复 closed、失败重新 open。这是 01 篇「连续失败踢出链」的正式实现。
 */

type State = 'closed' | 'open' | 'half-open'

export class CircuitBreaker {
  private state: State = 'closed'
  private failures = 0
  private openedAt = 0

  constructor(private threshold = 3, private cooldownMs = 2000) {}

  /** 当前能否放行一次调用（open 冷却结束会转 half-open 放一个探针） */
  canCall(): boolean {
    if (this.state === 'open' && Date.now() - this.openedAt >= this.cooldownMs) {
      this.state = 'half-open'
    }
    return this.state !== 'open'
  }

  recordSuccess(): void {
    this.state = 'closed'
    this.failures = 0
  }

  recordFailure(): void {
    this.failures++
    if (this.state === 'half-open' || this.failures >= this.threshold) {
      this.state = 'open'
      this.openedAt = Date.now()
    }
  }
}
