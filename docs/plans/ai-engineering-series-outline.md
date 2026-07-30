# 「AI 应用工程实战」系列大纲

**定位**：从单次 API 调用到生产级 AI 系统，每篇聚焦一个核心工程问题，有原理、有代码、有最佳实践。

**目标读者**：3-8 年经验的全栈/前端开发，正在系统提升 AI 工程能力。

**发布节奏**：全景图 → Prompt 3 篇 → Context 3 篇 → Harness 3 篇 → Loop 3 篇 → 进阶 3 篇 → 综合收尾，按层递进。

---

## 📌 开篇（已完成）

| 编号 | 标题 | 文件 | 状态 |
|------|------|------|------|
| 00 | 从 Prompt Engineering 到 Loop Engineering：AI 工程师的四层进化 | `docs/articles/2026-07-30-prompt-to-loop-engineering.md` | ✅ 已完成 |

*全景图，系列入口，覆盖四层架构的核心概念与演进逻辑。*

---

## ⚡ Prompt Engineering 篇

| 编号 | 标题 | 状态 |
|------|------|------|
| 01 | 「让 AI 一步步思考」为什么有效？CoT 的底层逻辑与工程实现 | ⬜ 待写 |
| 02 | 一次输出不够可靠：Self-Consistency 与 Tree of Thoughts 的多路推理策略 | ⬜ 待写 |
| 03 | Structured Output：把输出格式从 prompt 约定升级到 API 合约 | ⬜ 待写 |

**核心覆盖**：CoT 机制原理 / Zero-shot CoT / scratchpad 与 KV Cache 的关系 / Self-Consistency 实现与适用场景 / ToT 搜索树 / JSON Schema 强制输出 / Structured Output API

---

## 🧠 Context Engineering 篇

| 编号 | 标题 | 状态 |
|------|------|------|
| 04 | Context Budget：如何把 200k Token 花在最值钱的地方 | ⬜ 待写 |
| 05 | RAG 系统的精确控制：混合检索 + Re-rank + Parent-Child 分块全解 | ⬜ 待写 |
| 06 | 对话历史管理：从无限堆叠到工程化有损压缩 | ⬜ 待写 |

**核心覆盖**：KV Cache prefix 共享 / Lost in the Middle / token 分配策略 / 语义分块 / Hybrid Search + RRF / Cross-Encoder Re-rank / 摘要压缩策略

---

## 🔧 Harness Engineering 篇

| 编号 | 标题 | 状态 |
|------|------|------|
| 07 | 设计让 AI 少犯错的工具接口：Tool Definition 工程学 | ⬜ 待写 |
| 08 | AI 应用的可靠性：重试、降级、限流的完整工程体系 | ⬜ 待写 |
| 09 | 权限系统的艺术：AI 自主边界怎么划 | ⬜ 待写 |

**核心覆盖**：工具参数约束设计 / enum 缩小输出分布 / Hook 中间件模式 / 指数退避重试 / 模型降级链 / 结构化输出验证循环 / 副作用分级 / 可观测性三维度

---

## 🔄 Loop Engineering 篇

| 编号 | 标题 | 状态 |
|------|------|------|
| 10 | ReAct 实战：从「推理 + 行动」论文到生产级 Agentic Loop | ⬜ 待写 |
| 11 | LLM-as-Judge：用 AI 评估 AI，构建自动化质量审查循环 | ⬜ 待写 |
| 12 | Evaluation Loop 实战：让 AI 自动修复代码直到测试全通过 | ⬜ 待写 |

**核心覆盖**：ReAct 框架原理 / 工具调用观察循环 / generator + judge 分离模式 / 多维度评分 / 终止条件设计 / worktree 隔离 / 早停策略 / Evaluation + Reflection 组合

---

## 🔬 进阶层（第五～七层）

| 编号 | 标题 | 状态 |
|------|------|------|
| 13 | Evals 工程：没有这个，你的 AI 产品优化都是在瞎猜 | ⬜ 待写 |
| 14 | Multi-Agent 协作：当单个 AI 不够用时的系统设计 | ⬜ 待写 |
| 15 | Memory Engineering：让 AI 跨会话记住用户的工程架构 | ⬜ 待写 |

**核心覆盖**：

- **Evals**：Ground Truth 数据集 / LLM-as-Judge pipeline / 回归测试套件 / 维度化评估 / A/B 测试框架
- **Multi-Agent**：Supervisor/Worker 模式 / A2A 通信协议 / 任务分解与依赖 / 信任与验证 / 涌现行为管理
- **Memory**：情节记忆 / 语义记忆 / 程序记忆 / 记忆更新与冲突解决 / 遗忘策略

---

## 🏗️ 实战综合篇

| 编号 | 标题 | 状态 |
|------|------|------|
| 16 | 医疗 AI 助手的工程全景：七层架构在真实项目中的落地 | ⬜ 待写 |

*综合收尾，以 medai 项目为载体，展示七层架构在真实业务场景（药品 RAG、多步骤问诊、跨会话记忆）中的具体实现与权衡。*

---

## 系列统计

- **总篇数**：17 篇（含已完成 1 篇）
- **待创作**：16 篇
- **预计总字数**：约 50,000-60,000 字
- **每篇目标字数**：3,000-4,000 字

## 更新记录

| 日期 | 变更 |
|------|------|
| 2026-07-30 | 初版大纲创建，基于「从 Prompt 到 Loop 四层进化」文章扩展而来 |
