# phase3-context — 阶段三「上下文工程」实验区

对应路线图阶段三（`docs/roadmap/ai-agent-learning-roadmap.md` 第 274~338 行）与阶段三大纲（`docs/roadmap/ai-phase-03-context-engineering-outline.md`）。

本阶段实验不是彼此独立的脚本，而是**同一个对话系统逐篇长大**：`_sdk/` 每篇加一块，实验目录编号就是系统演进顺序。

## `_sdk/` 演进路线（一次看清「01 建什么、06 加什么」）

| 篇 | 加到 `_sdk/` 的模块 | 这一块解决什么 |
|---|---|---|
| 01 Prompt 工程进阶 | `prompts.ts` | 可版本化的 Prompt 模板（v1/v2/v3 + 回归用 v4） |
| 02 上下文组装 | `assemble.ts` | 六类内容的预算统计 + 顺序排布（`measureBudget` / `assemble`） |
| 03 上下文压缩 | `compress.ts`（待建） | 历史瘦身：摘要化 / 滑动窗口 / 关键信息提取 |
| 04 记忆系统 | `memory.ts`（待建） | 跨会话事实的写入 / 检索 / 遗忘更新 |
| 05 Prompt Caching | `cost.ts`（待建） | 缓存命中收益估算（hit/miss token 计数） |
| 06 长上下文策略 | `long-doc.ts`（待建） | 分段摘要 / 定位后精读 |

另有 `client.ts`：02~06 篇共用的「发一次 DeepSeek 请求」入口（`callModel`）。

## `_sdk/` 与 `shared/` 的职责边界

- `_sdk/`：**阶段三自己的**演进产物——Prompt 资产、组装器、压缩器……只被本阶段实验 import。
- `labs/shared/env.ts`：**跨阶段共用**的脚手架工具——`loadEnv` / `requireKey` / `printBudget` / `printTable`。它们不承载任何「上下文工程」知识，只是让脚本「缺 key 给中文提示、跑之前先看预算、表格能直接贴文章」。

一句话：**知识在 `_sdk/`，脚手架在 `shared/`**。

## 各实验目录一句话

| 目录 | 一句话 | 跑法（仓库根目录） |
|---|---|---|
| `01-prompt-asset/` | 三版 Prompt 对照 + 最小版本管理器回归 | `pnpm --filter @medai/labs p3-prompt` |
| `02-context-assembly/` | 预算分配表 + temperature 隐藏变量对照 | `pnpm --filter @medai/labs p3-assemble` |

（03~06 待建，脚本名依次为 `p3-compress` / `p3-memory` / `p3-cache` / `p3-long`）

## 跑之前

每个实验目录里的 `README.md` 都写清「验证什么 / 怎么跑 / 看到什么算成功 / 预算」。共同前提只有两个：

1. 仓库根目录 `.env.local` 里配好 `DEEPSEEK_API_KEY`（04 篇还需本地 Ollama + Postgres，到时在那一篇的 README 里给）。
2. Node ≥ 20、pnpm ≥ 9（通常 `nvm use 22` 即可）。

## 给初学者的一句话

每个实验都遵循同一条「先直觉、后严谨」的节奏：先有一个**单文件、输出确定、符合直觉**的实验让你秒懂概念，再有一个**揭示真实复杂性**的实验（多候选、隐藏变量、概率性输出）让你知道「真实世界没那么干净」。前者负责建立手感，后者负责建立敬畏。
