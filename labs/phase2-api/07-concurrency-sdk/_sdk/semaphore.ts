/**
 * 阶段二 · 第 07 篇 —— 并发限流
 *
 * 📚 知识点：Promise.all 管成败、allSettled 管归集、信号量管节奏。
 * 「批量调用」的正确形态是把并发数压在 N 以内，而不是无脑全量并发。
 */

export class Semaphore {
  private waiters: Array<() => void> = []
  private slots: number

  constructor(slots: number) {
    this.slots = slots
  }

  private acquire(): Promise<void> {
    if (this.slots > 0) {
      this.slots--
      return Promise.resolve()
    }
    return new Promise<void>((resolve) => this.waiters.push(resolve))
  }

  private release(): void {
    const next = this.waiters.shift()
    if (next) next()
    else this.slots++
  }

  /** 在信号量保护下运行 fn，结束后自动归还名额 */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await fn()
    } finally {
      this.release()
    }
  }
}
