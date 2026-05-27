# ADR-0002 · AI 模型选型与切换策略

**状态**：已采纳（Accepted）
**日期**：2025-01-01
**决策人**：你自己

---

## 背景与问题

项目需要接入 LLM 进行药品问答和处方解读。需要决定：
1. 使用哪个 LLM 服务商？
2. 当主力模型不可用时如何降级？
3. 如何设计接口层使多模型切换不影响业务代码？

---

## 决策

**主力模型：Claude 3.5 Sonnet（Anthropic）**
**降级链：Claude → GPT-4o-mini → 通义千问 Plus → 友好错误提示**
**接口层：packages/ai-sdk 统一抽象，strategy pattern 实现多模型切换**

---

## 考量因素

### 模型选型对比

| 模型 | 优势 | 劣势 | 医疗场景适合度 |
|------|------|------|-------------|
| Claude 3.5 Sonnet | 长上下文(200K)、逻辑强、幻觉少 | 国内访问需代理 | ⭐⭐⭐⭐⭐ |
| GPT-4o | 综合能力强、多模态好 | 成本高、速度慢 | ⭐⭐⭐⭐ |
| GPT-4o-mini | 速度快、成本低 | 准确性低于 4o | ⭐⭐⭐ |
| 通义千问 Max | 国内访问稳定、中文优化 | 长文本表现一般 | ⭐⭐⭐ |

**选择 Claude 原因**：
1. 药品说明书通常很长，200K context 避免截断问题
2. Claude 对"不确定时拒绝回答"的倾向在医疗场景是优点（减少幻觉）
3. 与 Anthropic/Claude Code 工具链一致，API 使用习惯同步学习

### 为什么需要降级链？

```
国内环境：Anthropic API 访问可能不稳定（需科学上网）
成本控制：复杂问题用 Sonnet，简单查询可路由到 mini 模型
高可用：主力模型限流时自动切换，不影响用户体验
```

### packages/ai-sdk 设计

```typescript
// 统一接口（Strategy Pattern）
interface AIProvider {
  chat(messages: Message[], options: ChatOptions): AsyncIterable<Delta>
  embed(texts: string[]): Promise<number[][]>
  readonly modelId: string
  readonly maxTokens: number
}

// 具体实现
class AnthropicProvider implements AIProvider { ... }
class OpenAIProvider implements AIProvider { ... }
class DashScopeProvider implements AIProvider { ... }

// 路由器（根据配置/状态选择提供商）
class AIRouter {
  private providers: AIProvider[]

  async chat(messages, options) {
    for (const provider of this.providers) {
      try {
        return await provider.chat(messages, options)
      } catch (e) {
        if (isRateLimitError(e) || isUnavailableError(e)) {
          continue  // 尝试下一个
        }
        throw e     // 其他错误直接抛出
      }
    }
    throw new Error('AI_ALL_PROVIDERS_FAILED')
  }
}
```

---

## 影响

### 正面
- 多模型无缝切换，业务代码不需要感知具体模型
- 降级链保证服务可用性
- packages/ai-sdk 可以单独测试（mock provider）

### 负面与缓解
- **接口抽象复杂度**：不同模型的 API 有差异（streaming 格式、tool use 格式）。缓解：ai-sdk 负责适配层，统一为内部格式
- **成本不可控**：多模型并发可能产生额外费用。缓解：Phase 1 先硬编码 Claude，Phase 2 再实现路由

---

## 📚 对应学习内容

通过实现 ai-sdk，你将深度理解：

- **Strategy 设计模式**：同一接口，不同实现，运行时切换——这是 TypeScript 面试常考的设计题
- **AsyncIterable / AsyncGenerator**：LLM 流式输出本质是 AsyncGenerator，理解它让你彻底搞懂 `for await...of`
- **TypeScript 接口设计**：如何用 interface 约束多个实现，`implements` 关键字的真实意义
- **错误类型收窄**：`isRateLimitError` 函数体现了 TypeScript 的类型守卫（Type Guard）

**面试角度**：能描述"如何设计一个支持多 LLM 后端的 SDK"，并说清楚 Strategy Pattern 和 Adapter Pattern 的区别——这是 AI 岗位 + 架构岗位的双向加分题。

---

## 未来可能的修订

- 如果 Claude API 价格大幅上涨 → 重新评估主力模型
- 如果需要私有化部署 → 增加 OllamaProvider（本地 llama 模型）
- 如果增加图片处理 → 评估各模型 Vision API 能力差异
