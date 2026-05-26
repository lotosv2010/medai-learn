# apps/ai-engine — AI 核心模块

## 模块定位

所有 AI 能力的核心实现层，与上层 `apps/api` 通过内部接口通信。
**学习重点：LLM 集成 / RAG 系统 / AI Agent / Prompt Engineering**

## 技术栈

- **运行时**：Node.js 20 + TypeScript
- **AI SDK**：Vercel AI SDK + LangChain.js
- **向量数据库**：pgvector（PostgreSQL 扩展）
- **Embedding**：OpenAI text-embedding-3-small / 通义 text-embedding-v2
- **LLM**：Claude 3.5 Sonnet（主）/ GPT-4o（备）/ 通义千问（国内备用）

## 目录结构

```
apps/ai-engine/
├── src/
│   ├── llm/                    # 📚 学：多模型抽象层设计
│   │   ├── providers/
│   │   │   ├── anthropic.ts    # Claude API 接入
│   │   │   ├── openai.ts       # OpenAI 接入
│   │   │   └── dashscope.ts    # 通义千问接入（国内必备）
│   │   ├── router.ts           # 📚 学：策略模式 - 根据成本/速度路由模型
│   │   └── types.ts            # 统一的 LLM 接口类型
│   │
│   ├── rag/                    # 📚 学：RAG 完整流程
│   │   ├── pipeline/
│   │   │   ├── ingestion.ts    # 文档摄入（PDF解析 + 分块）
│   │   │   ├── embedding.ts    # 向量化（批量处理 + 重试）
│   │   │   ├── retrieval.ts    # 检索（语义 + 关键词混合）
│   │   │   └── reranking.ts   # 重排序（提升精度）
│   │   ├── chunking/
│   │   │   ├── fixed.ts        # 固定大小分块
│   │   │   ├── semantic.ts    # 语义分块（按句子/段落）
│   │   │   └── drug-specific.ts # 📚 药品说明书专用分块策略
│   │   └── index.ts
│   │
│   ├── agent/                  # 📚 学：AI Agent 设计
│   │   ├── tools/
│   │   │   ├── drug-search.ts  # 工具：药品信息检索
│   │   │   ├── interaction-check.ts # 工具：药物相互作用检查
│   │   │   └── prescription.ts # 工具：处方解读
│   │   ├── memory/
│   │   │   ├── short-term.ts  # 对话历史（滑动窗口）
│   │   │   └── long-term.ts   # 用户偏好持久化
│   │   ├── planner.ts         # 📚 学：ReAct 推理框架
│   │   └── executor.ts        # 工具执行 + 错误处理
│   │
│   ├── prompt/                 # 📚 学：Prompt Engineering
│   │   ├── templates/
│   │   │   ├── drug-advisor.ts # 用药顾问 Prompt
│   │   │   ├── prescription-reader.ts # 处方解读 Prompt
│   │   │   └── health-qa.ts   # 健康问答 Prompt
│   │   └── optimizer.ts       # Prompt 版本管理 + A/B 测试
│   │
│   └── streaming/              # 📚 学：流式输出核心
│       ├── handler.ts          # SSE 处理器
│       └── transformer.ts     # 流数据转换
```

## 核心学习路径

### Week 1：LLM API 基础
```typescript
// 从最简单的开始：packages/ai-sdk/src/base-client.ts
// 理解：API 调用 → 流式输出 → 错误处理 → 重试机制
```

### Week 2：RAG 系统
```
药品说明书 PDF
  ↓ ingestion.ts（解析）
  ↓ chunking/drug-specific.ts（分块）
  ↓ embedding.ts（向量化）
  ↓ pgvector 存储
  ↓ retrieval.ts（检索）
  ↓ reranking.ts（重排）
  ↓ LLM 生成答案
```

### Week 3：Agent 系统
```
用户问题
  ↓ planner.ts（分析意图，制定计划）
  ↓ executor.ts（选择工具）
  ↓ tools/*.ts（执行工具）
  ↓ 观察结果，继续推理或输出
```

## 关键概念标注

每个文件中遇到以下模式时，使用 `/explain` 深入理解：

- `ReadableStream` + `TransformStream` → 流式处理
- `cosine_similarity` → 向量相似度计算
- `Promise.all` + 批量处理 → 并发控制
- `AbortController` → 请求取消
- Tool definition schema → LLM 的函数调用规范

## 评估指标（需要能解释清楚）

| 指标 | 含义 | 优化方向 |
|------|------|--------|
| Faithfulness | 答案是否基于检索内容 | 减少幻觉 |
| Answer Relevancy | 答案是否回答了问题 | Prompt 优化 |
| Context Recall | 检索是否覆盖了所需信息 | 分块策略 |
| Latency (TTFT) | 首 Token 时间 | 模型选择 + 缓存 |
