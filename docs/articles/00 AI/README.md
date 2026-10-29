# 00 AI — 文章归档说明

> 本目录同时装着两个系列，别混在一起：
> - 根目录下的 5 篇散装文章 = 《00 AI 工具与职业发展》（讲**人**怎么用 AI 工具）
> - 编号子文件夹 = 《14 AI 工程》（讲**系统**怎么调用模型），按学习阶段归档

## 为什么按阶段分文件夹

AI 工程系列是全部系列里唯一「0 基础新学」的轨道，按**阶段**推进：学完一个阶段、跑完一批实验，才集中写这一阶段的几篇。所以文章也按阶段归堆，而不是全部平铺在一个目录里。

**本系列不建 `docs/notes/` 笔记目录**——实验输出直接就是文章的输入，中间不设笔记这一层。这与其余系列的「笔记 → 文章」流程不同。

## 十个阶段与文件夹

| 阶段 | 文件夹 | 路线图主题 | 实验代码 | 状态 |
|------|--------|-----------|---------|------|
| 阶段一 | `01 认知地基/` | 认识大模型 | `labs/phase1-cognition/` | 🚧 大纲已定稿（5 篇） |
| 阶段二 | `02 应用底座/` | 调用能力 | `labs/phase2-api/` | ⬜ 待建 |
| 阶段三 | `03 上下文工程/` | Context Engineering（核心进阶） | `labs/phase3-context/` | ⬜ 待建 |
| 阶段四 | `04 RAG/` | 检索增强生成 | `labs/phase4-rag/` | ⬜ 待建 |
| 阶段五 | `05 Agent/` | 智能体 | `labs/phase5-agent/` | ⬜ 待建 |
| 阶段六 | `06 框架整合/` | 框架与工程化整合 | `labs/phase6-framework/` | ⬜ 待建 |
| 阶段七 | `07 模型定制/` | 私有化微调 | `labs/phase7-finetune/` | ⬜ 待建 |
| 阶段八 | `08 部署与推理优化/` | 自部署与推理性能 | `labs/phase8-deploy/` | ⬜ 待建 |
| 阶段九 | `09 生产化/` | 评估 / 可观测 / 安全 / 成本 | `labs/phase9-production/` | ⬜ 待建 |
| 阶段十 | `10 前沿扩展/` | 前沿方向（可选） | `labs/phase10-frontier/` | ⬜ 待建 |

## 每个阶段文件夹里放什么

1. `YYYY-MM-DD-{slug}.md` —— 本阶段的公众号文章，一篇一个文件
2. 阶段交付物（如阶段一的《模型选型与成本估算备忘录》）—— 不是文章，但属于阶段产出，一起放这里

> 阶段文件夹里**不再放**「本阶段说明」——篇目清单、命名规则与实验映射统一由 `docs/roadmap/ai-phase-NN-*.md` 阶段大纲维护，避免同一份信息两处维护、互相过期。

## 写一篇的流程

```
读原理（docs/roadmap/ai-agent-learning-roadmap.md）
  → 跑实验（labs/）
  → 写文章（本目录对应阶段文件夹）
  → 回填 progress.json
```

## 相关文档

- 学习路径：`docs/roadmap/ai-agent-learning-roadmap.md`
- 阶段一大纲：`docs/roadmap/ai-phase-01-cognitive-foundation-outline.md`
- 系列总索引：`docs/plans/00 frontend-engineering-outline.md`
- 实验区约定：`labs/README.md`
