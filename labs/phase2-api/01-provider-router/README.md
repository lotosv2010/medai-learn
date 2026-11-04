# 01 — 多模型接入与降级链（真实调用版）

对应文章：第 01 篇《多模型接入与降级链：先把请求发出去、发得稳》

## 要验证什么

读 key → fetch 一次 DeepSeek chat/completions → 打印：

- 请求体（脱敏，key 在 header 不打印）
- 模型回复
- token 用量（`prompt_tokens` / `completion_tokens`，账单的计量单位）
- 归一化后的 `ChatResult`（对应文章「归一化的两层设计」里的形状层）

## 怎么跑

```bash
# 仓库根目录
nvm use 22
pnpm --filter @medai/labs p2-router
```

需要 `.env.local` 里配 `DEEPSEEK_API_KEY`，缺 key 时报错退出。

## 看到什么算成功

- 打印出模型回复，且 `finishReason` 为 `stop`
- `usage.prompt` / `usage.completion` 有值

## 预算

真实调用 1 次约 ¥0.01。
