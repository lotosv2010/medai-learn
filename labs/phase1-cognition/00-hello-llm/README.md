# 00 — 一次 API 调用背后发生了什么

对应文章：第 00 篇《大模型到底是什么：一次 API 调用背后发生了什么》

## 要验证什么

同一个医疗问题分别问 3 家模型，直接打印**完整原始响应 JSON**，看清两件事：

1. `choices[0].message.content` 是人读的文本，其余字段都是元数据
2. `usage.prompt_tokens` / `completion_tokens` / `total_tokens` 是账单的计量单位

## 怎么跑

```bash
pnpm --filter @medai/labs hello
```

需要 `.env.local` 中至少两个 key（推荐 `DEEPSEEK_API_KEY` + `DASHSCOPE_API_KEY`）。

## 看到什么算成功

- 三家都返回了文本，且文本结构相似（都是「最可能的续写」）
- 三家 `usage` 里的 token 数各不相同，但量级接近
- 你亲眼看到「输入 20 个字的 prompt，为什么被算了 30 个 token」——这个疑问直接引出第 01 篇

## 预算

3 次短调用，预计 < ¥0.2。
