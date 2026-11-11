# 07 — 并发、超时与 SDK 收口

对应文章：第 07 篇《并发、超时与 SDK 收口：从脚本到可切换的包》

## 要验证什么

`index.ts` 跑三个实验（全 mock、零成本），`contract.test.ts` 跑一份契约测试（node:test）：

```
index.ts          实验 A/B/C：三策略 / jitter / 熔断
contract.test.ts  实验 D：10 条契约测试，验证 ChatProvider 的行为契约
_sdk/             最小 SDK 骨架（演示收口，不搬 packages/ai-sdk）
```

四个问题：

1. **三种批量策略的真实权衡**——`Promise.all` 一失败全批丢、`allSettled` 保留部分但最慢、信号量 + 退避成功率 100% 但请求数因重试增加。
2. **指数退避为什么必须加 jitter**——无 jitter 时同一时刻失败的请求会在同一毫秒重试，把对方限流打得更狠。
3. **熔断器三态**——连续失败 open 之后「先别打它」，冷却后放探针（half-open）试探。
4. **契约测试守什么**——不是「某个实现逻辑正确」，是「所有实现行为一致」；它就是一份可执行的接口文档。

## 怎么跑

```bash
# 仓库根目录
nvm use 22
pnpm --filter @medai/labs p2-sdk        # 实验 A/B/C（零 API 成本）
pnpm --filter @medai/labs p2-sdk-test   # 实验 D：10 条契约测试
```

不需要 key——所有错误场景都走 `_sdk/mock-provider.ts` 注入，零费用。

## 看到什么算成功

### 实验 A：三策略对照

- 策略 1（`Promise.all`）：首个失败即整批丢弃，成功数 = 0
- 策略 2（`Promise.allSettled`）：14 成功 / 6 失败，结果保留但墙钟时间最长
- 策略 3（信号量 + 超时 + 退避 jitter）：20 成功 / 0 失败，总请求数 > 20（重试所致）

### 实验 B：jitter

无 jitter 时 8 个请求的第 1 次重试落在**同一时刻**；有 jitter 后被打散到 8 个不同时刻。

### 实验 C：熔断

前 3 次真的去打（真实请求 3 次），第 4 次起被熔断拒绝，只放探针。

### 实验 D：契约测试

`p2-sdk-test` 10 条全绿。第 ⑩ 条用 `@ts-expect-error` 验证「`ChatProvider` 不含 `embed`」这条接口契约——DeepSeek 只实现 `ChatProvider`，类型系统就能拦住「把它当 EmbeddingProvider 用」。

## 预算

全部 mock，¥0。真实调用在本篇不做（前 6 篇已完成真实调用的报文采集）。

## 落点说明（与大纲的差异）

阶段二大纲说 07 篇产物「搬进 `packages/ai-sdk` 并接入 `pnpm typecheck`」。本仓库目前 `packages/` 还是空壳、无根 tsconfig、未装 vitest，完整搭 TS 工程链会让本篇范围过大。故本实验把 SDK 骨架与契约测试**留在 `labs/phase2-api/07-concurrency-sdk/` 落地成可运行演示**，正式搬包与接入 typecheck 属于工程化动作，留到阶段六上框架时一并完成。
