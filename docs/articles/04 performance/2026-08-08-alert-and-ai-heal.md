# 前端监控告警与 AI 自愈：从规则引擎到自动修复 PR（面试收藏级）

> 告警响了，你的第一反应是什么？打开控制台刷页面看报错——这说明你没有建过真正的告警体系。真正建过的人，第一反应是看大盘、找维度、下钻，甚至等 AI 帮你开好修复 PR。这篇从工程实现讲透这套闭环。

---

## 🎯 这篇文章解决什么问题

监控体系里，告警和 AI 自愈是最容易被「架构图一笔带过」的两块：知道要做，但不知道怎么工程落地。这篇文章基于真实落地的 g-heal-claw 项目，从告警规则 DSL 设计、Pull 式评估引擎、5 种通知渠道，一路讲到 AI Agent ReAct 推理、Docker 沙箱验证、自动创建 PR——每一步都有可运行的代码。读完你既能理解为什么这么设计，也能直接用在面试里。

---

## 🔔 告警引擎是什么：从"知道了"到"第一时间知道"

### 大盘 vs 告警

大盘是**被动感知**：你得主动去看，才知道有没有问题。告警是**主动推送**：问题一出现，你立刻收到通知。

两者互补，缺一不可。大盘用于复盘和下钻，告警用于第一时间响应。只有大盘没有告警，相当于有监控没有报警器。

### 告警规则 DSL 设计

告警的核心是「规则」，一条规则回答四个问题：监什么、怎么判断、多严重、告诉谁。

```typescript
// 告警规则结构：监什么 + 怎么判断 + 多严重 + 告诉谁
interface AlertRule {
  id: string;  projectId: string;  name: string;  enabled: boolean
  target: 'error_rate' | 'api_success_rate'
        | 'web_vital' | 'issue_count' | 'custom_metric'
  severity: 'info' | 'warning' | 'critical'
  cooldownMs: number    // 冷却期，firing 期间不重复发送
  channels: string[]   // 通知渠道 id 数组
}
```

`condition` 字段定义具体的判断逻辑：

```typescript
interface AlertCondition {
  aggregation: 'avg' | 'p75' | 'p95' | 'count' | 'rate'
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'change_pct'
  threshold: number
  window: { durationMs: number; minSamples?: number }
}
```

`target` 定义数据来源，`condition` 定义阈值逻辑，`severity` 定义紧急程度，`cooldownMs` 防止告警轰炸，`channels` 定义通知渠道。

> 💬 **面试官**：告警规则怎么设计，才能同时支持「错误率 > 5%」和「LCP p75 > 4000ms」这两种不同类型的条件？
>
> ✅ 标准答案：用 DSL 把规则抽象为 target（监什么）+ condition（怎么判断）的组合。target 决定查哪张表、用哪种聚合；condition 的 operator 支持绝对值比较（gt/lt）和相对变化（change_pct），覆盖不同场景。
> 🎁 加分答案：`change_pct` 运算符用于相对阈值，比如「当前窗口 error_rate 比前 1h 均值上升超过 500%」，比绝对值阈值对流量波动更有抗性——流量低谷时绝对错误数少，但相对变化才是真正的异常信号。

### 6 条预置规则

每个项目创建时自动下发 6 条预置规则（`enabled=false`，需手动开启）：

| 规则名 | 条件描述 | 严重度 | 典型触发场景 |
|---|---|---|---|
| 错误率突增 | 5 分钟 error_rate > 前 1h 均值 × 5 且 > 5% | critical | 新版本引入 JS 运行时错误 |
| JS 错误数激增 | 5 分钟 error 计数 > 过去 24h 同窗口均值 × 3 | warning | CDN 挂了，资源加载失败批量上报 |
| 关键页面 LCP 劣化 | 10 分钟特定页面 LCP p75 > 4000ms | warning | 上线新图片未压缩，LCP 进入 poor 区 |
| API 成功率下降 | 5 分钟 api_success_rate < 95% | critical | 后端服务故障，接口批量 5xx |
| 慢 API Top | 10 分钟任一 API p95 > 3000ms | warning | 数据库查询未加索引，接口响应变慢 |
| 白屏事件出现 | 5 分钟 white_screen 计数 ≥ 1 | critical | SPA 路由切换后渲染失败 |

这 6 条覆盖了监控四个维度（性能、异常、行为、自定义）中最高频的告警场景，作为生产基线开箱即用。

---

## 🧠 核心原理：Pull 式定时评估

### Pull vs Push 的选型决策

告警引擎有两种架构：**Push 式**（每条事件入库时实时判断）和 **Pull 式**（定时扫描聚合数据）。

g-heal-claw 选择 Pull 式，核心理由三条：

| 维度 | Pull 式（选） | Push 式（否） |
|---|---|---|
| 窗口聚合 | 天然支持（cron 边界即窗口边界） | 需维护内存滑动窗口，高并发下内存压力大 |
| 实现复杂度 | 简单，规则变更不影响历史事件 | 复杂，每条事件都要跑一遍所有规则 |
| 精度 | 1 分钟延迟，可接受 | 毫秒级，但绝大多数告警场景不需要 |

「5 分钟内错误率 > 5%」这类条件，Pull 式只需在 cron 里查一次聚合 SQL；Push 式需要维护一个 5 分钟滑动窗口，每条事件都更新，代码复杂度和内存开销都更高。

> 💬 **面试官**：告警引擎选 Pull 还是 Push，你怎么判断？
>
> ✅ 标准答案：看告警条件是否以「时间窗口聚合」为主。大多数前端监控告警（错误率、API 成功率、Web Vital p75）都是窗口统计，Pull 式天然契合，1 分钟精度完全够用，实现也更简单。
> 🎁 加分答案：如果有「单条事件触发」的告警需求（比如「某特定用户 ID 出现错误立刻通知」），才需要 Push 式或 CEP（复杂事件处理）引擎。两种架构不互斥，可以按规则类型分流。

### 评估流程

```
@Cron('*/1 * * * *')          // 每分钟触发
  ↓
加载 enabled=true 的规则（缓存 30s，避免每分钟都查 DB）
  ↓
按规则并发查询 metric_minute 预聚合表（窗口聚合）
  ↓
metric_value [operator] threshold？
  ↓
检查冷却期：now - last_fired_at < cooldownMs → 跳过
```

```
  ↓
写 alert_history(status=firing) + 更新 rule.last_fired_at
  ↓
投递 BullMQ notifications 队列 → 通知 Worker 分发
  ↓
下次评估：条件不再满足 → 写 alert_history(status=resolved)
```

### 状态机：firing → resolved

告警历史有两种状态，对应告警触发和告警消除：

```typescript
// alert_history 表的状态机
type AlertStatus = 'firing' | 'resolved'

// firing：条件满足，写入一条 firing 记录
// resolved：下次评估条件不再满足，更新 resolved_at
interface AlertHistory {
  id: string
  ruleId: string
  status: AlertStatus
  metricValue: number     // 触发时的指标值
  firedAt: Date
  resolvedAt?: Date       // resolved 后填入
  notifiedAt?: Date       // 通知发送时间
}
```

冷却期的核心作用：假设 error_rate 持续 10 分钟都超阈值，没有冷却期就会连发 10 条通知，造成「告警疲劳」。`cooldownMs` 控制同一条规则在 firing 期间不重复发送，只在首次触发和消除时各发一次。

> 💬 **面试官**：怎么避免告警轰炸（同一个问题反复发通知）？
>
> ✅ 标准答案：规则级冷却期（cooldownMs）。规则 firing 期间记录 last_fired_at，下次评估检查 `now - last_fired_at < cooldownMs`，满足则跳过通知，只有消除时再发一次 resolved。
> 🎁 加分答案：还可以加「持续 N 个周期才告警」的防抖——单个周期的异常可能是瞬时波动，连续 3 个周期才算稳定异常。这两个机制组合：防抖减少误报，冷却期减少重复通知。

---

## ✍️ 手写实现：告警评估核心逻辑

### 评估函数骨架

```typescript
// alert-evaluator.worker.ts
async function evaluateRule(rule: AlertRule): Promise<void> {
  // 1. 查聚合数据；2. 对比阈值
  const metricValue = await queryMetric(rule)
  if (metricValue === null) return
  const triggered = compare(metricValue, rule.condition)
  if (!triggered) { await maybeResolve(rule); return }

  // 3. 检查冷却期
  if (rule.lastFiredAt) {
    const elapsed = Date.now() - rule.lastFiredAt.getTime()
    if (elapsed < rule.cooldownMs) return
  }
```

```typescript
  // 4. 写 firing 记录 + 投递通知
  await db.alertHistory.create({
    ruleId: rule.id, status: 'firing', metricValue,
  })
  await rule.$query().patch({ lastFiredAt: new Date() })
  await notificationQueue.add({ ruleId: rule.id, metricValue })
}
```

### 聚合 SQL 抽象

不同 `target` 对应不同的聚合逻辑，用工厂函数隔离：

```typescript
async function queryMetric(rule: AlertRule): Promise<number | null> {
  const { sinceMs, untilMs } = resolveWindow(rule.condition.window)
  switch (rule.target) {
    case 'error_rate':
      return queryErrorRate(rule.projectId, sinceMs, untilMs)
    case 'api_success_rate':
      return queryApiSuccessRate(rule.projectId, sinceMs, untilMs)
    case 'web_vital':
      return queryWebVitalP75(rule.projectId, rule.condition, sinceMs, untilMs)
    default:
      return null
  }
}
```

### 阈值比较函数

```typescript
function compare(value: number, condition: AlertCondition): boolean {
  const { operator, threshold } = condition
  switch (operator) {
    case 'gt':  return value > threshold
    case 'lt':  return value < threshold
    case 'gte': return value >= threshold
    case 'lte': return value <= threshold
    // change_pct：相对于基线的变化百分比
    case 'change_pct': return value > threshold  // value 已是变化率
    default: return false
  }
}
```

🔧 **真实场景**：某医疗平台上线新版本后，error_rate 绝对值是 2%，看起来不高——但相比前 1h 均值 0.3%，变化了 567%。用绝对阈值的规则没有触发告警，用 `change_pct` + 500% 阈值的规则立刻响了。Pull 式 + 相对阈值的组合，5 分钟内告警推到了值班群。

---

## 📣 通知渠道：5 种 Provider 的工程实现

### Provider 接口统一抽象

5 种渠道实现同一个接口：

```typescript
interface NotificationProvider {
  type: 'email' | 'dingtalk' | 'wecom' | 'slack' | 'webhook'
  send(payload: NotificationPayload): Promise<void>
}

interface NotificationPayload {
  rule: AlertRule
  history: AlertHistory
  templateVars: Record<string, string>
  // 模板变量：rule.name / metric.value / threshold
  // severity / project.name / environment / window
}
```

### 邮件：Nodemailer SMTP

```typescript
class EmailProvider implements NotificationProvider {
  type = 'email' as const
  async send(payload: NotificationPayload) {
    const { subject, html } = renderEmailTemplate(payload)
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: payload.rule.channels.join(','),
      subject,
      html,  // HTML 模板，支持指标值高亮、跳转链接
    })
  }
}
```

### 钉钉：HMAC-SHA256 签名

钉钉 Webhook 有签名验证，这是最容易踩坑的地方：

```typescript
function buildDingtalkSign(secret: string): { timestamp: string; sign: string } {
  const timestamp = String(Date.now())
  const stringToSign = `${timestamp}\n${secret}`
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(stringToSign)
  const sign = encodeURIComponent(hmac.digest('base64'))
  return { timestamp, sign }
}
```

```typescript
async function sendDingtalk(webhookUrl: string, secret: string, text: string) {
  const { timestamp, sign } = buildDingtalkSign(secret)
  const url = `${webhookUrl}&timestamp=${timestamp}&sign=${sign}`
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msgtype: 'markdown',
      markdown: { title: '监控告警', text } }),
  })
}
```


> 💬 **面试官**：钉钉 Webhook 告警怎么防止被恶意调用？
>
> ✅ 标准答案：钉钉安全设置开启「加签」后，每次请求需附带时间戳和 HMAC-SHA256 签名（用 secret 对「时间戳 + 换行 + secret」签名），服务端验证签名和时间戳（1 小时内有效）。
> 🎁 加分答案：时间戳有效期 1 小时防重放攻击；IP 白名单是另一种方案，但云函数/容器场景下 IP 会变，签名方案更通用。

### 企业微信：Markdown 卡片

企微 Webhook 不需要签名，直接 POST：

```typescript
async function sendWecom(webhookUrl: string, payload: NotificationPayload) {
  const { rule, history } = payload
  const icon = rule.severity === 'critical' ? '🔴' : '🟡'
  const content = [
    `## ${icon} ${rule.name}`,
    `**指标值**：${history.metricValue}`,
    `**阈值**：${rule.condition.threshold}`,
    `**时间**：${new Date(history.firedAt).toLocaleString('zh-CN')}`,
  ].join('\n')
```

```typescript
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msgtype: 'markdown', markdown: { content } }),
  })
}
```

### Slack 与自定义 Webhook

Slack Incoming Webhook 格式用 `blocks`；自定义 Webhook 用模板变量替换后直接 POST：

```typescript
function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key) => {
    return vars[key] ?? `{{${key}}}`
  })
}
// 模板：{{rule.name}} 触发，当前值 {{metric.value}}，阈值 {{threshold}}
```

> 💬 **面试官**：通知渠道这么多，怎么保证扩展时不改核心代码？
>
> ✅ 标准答案：Provider 统一实现 `send(payload)` 接口，注册到工厂 Map：`{ email: EmailProvider, dingtalk: DingtalkProvider, ... }`。新增渠道只需实现接口并注册，通知 Worker 不感知具体渠道。
> 🎁 加分答案：通知 Worker 从 BullMQ 队列消费，拿到 `channelIds` 后查 DB 加载配置，再按 type 分发到对应 Provider。DB 存渠道配置（含 webhookUrl / secret 等），加密字段用 AES-256-GCM 存储，避免密钥明文落库。

---

## 🤖 AI 自愈：从"告知"到"自动修复"

### 是什么：AI 自愈的边界

AI 自愈不是「万能修复机器」，它有清晰的能力边界：

**适合自动修复的 bug 类型**（模式固定，代码局部）：
- NPE（空指针/undefined 访问）：缺少防守性判断
- 边界条件缺失：数组越界、空字符串未处理
- 类型错误：TS 严格模式下的类型不匹配
- 未处理的 Promise 拒绝：缺少 try/catch 或 .catch()

**不适合自动修复的**（需要人工决策）：
- 业务逻辑 bug（修复需要理解需求）
- 架构问题（影响面广，改动有连锁反应）
- 数据一致性问题（涉及数据库事务）
- 安全漏洞（修复策略需要安全审查）

对于前一类，AI 的修复成功率相当高；对于后一类，AI 只能做诊断辅助，最终决策还是人来做。

### heal_job 状态机

heal_job 记录自愈流程的完整状态：

```
queued ──→ diagnosing ──→ patching ──→ verifying ──→ pr_created
   └──→ failed    └──→ failed    └──→ failed    └──→ failed
```

每个状态对应 Agent 的一个阶段，失败时写入 `error` 字段和 `trace`（工具调用全量日志），方便排查。

```typescript
type HealStatus =
  | 'queued'      // 已入队，等待 Agent 处理
  | 'diagnosing'  // Agent 正在读 Issue + Sourcemap
  | 'patching'    // Agent 正在生成 diff patch
  | 'verifying'   // Docker 沙箱跑 verify 命令
  | 'pr_created'  // GitHub PR 已创建
  | 'failed'      // 任意阶段失败
```

> 💬 **面试官**：AI 自愈流程怎么保证可观测性？出问题怎么排查？
>
> ✅ 标准答案：heal_job 表记录每个状态的时间戳和错误信息；Agent 的每次 Tool 调用（readFile/grepRepo/writePatch 等）全量写入 `heal_job.trace` 字段，相当于 Agent 的操作日志，可以回放整个推理过程。
> 🎁 加分答案：`trace` 是结构化 JSON 数组，每条记录包含 `{ step, tool, input, output, durationMs }`。控制台的自愈详情页直接渲染这个 trace，让开发者看到 AI 「想了什么、做了什么」，增强可信度。

### 核心原理：ReAct 推理 + 工具链

ReAct（Reasoning + Acting）是 Agent 框架的核心模式：

```
Thought: 分析当前情况，决定下一步做什么
Action: 调用一个 Tool（readIssue / readFile / grepRepo ...）
Observation: Tool 返回结果
Thought: 基于结果继续推理……
```

g-heal-claw 的 Agent 工具链共 7 个 Tool（MVP 5 个 + 扩展 2 个）：

| Tool | 说明 | 安全限制 |
|---|---|---|
| `readIssue(id)` | 获取 Issue 详情 + 代表事件 + 还原后堆栈 | — |
| `resolveStack(stackId)` | 调用 SourcemapService 还原堆栈 | — |
| `readFile(path)` | 读取仓库文件 | ≤ 500 行，受 paths 白名单限制 |
| `grepRepo(pattern)` | 仓库内 ripgrep | ≤ 50 条结果 |
| `writePatch(diff)` | 产出 diff patch | LOC ≤ maxLoc（默认 100） |
| `runSandbox(cmd)` | Docker 沙箱执行 verify 命令 | 网络隔离，超时 10 分钟 |
| `createPr(title, body, branch)` | 通过 Git 平台 API 创建 PR | 分支前缀 `ghc-heal/` |

### 诊断 Prompt 结构

System prompt 固定角色和输出格式，User prompt 注入结构化上下文：

```typescript
const systemPrompt = `你是资深前端工程师，任务是诊断生产环境异常并给出修复建议。
必须基于提供的代码上下文，不得臆造。
输出严格遵守 JSON 格式：
{ rootCause: string, evidence: string, suggestedFix: string, confidence: number }`
```

```typescript
const userPrompt = `
# Issue: ${issue.title}
# Stack（Sourcemap 还原后）
${resolvedStack}
# Breadcrumbs（出错前用户操作路径）
${breadcrumbs}
# 相关代码片段
${codeSnippets}
`
```

`confidence` 是 0~1 的置信度，低于 0.6 时控制台显示「建议人工介入」而非直接创建 PR。

---

## ✍️ 手写实现：ReAct 循环骨架

### Agent 主循环

```typescript
async function runHealAgent(job: HealJob): Promise<void> {
  const steps: TraceStep[] = []
  let stepCount = 0

  while (stepCount < MAX_STEPS) {
    const thought = await llm.think({ history: steps, tools: TOOL_DEFS })
    if (thought.type === 'finish') break
    const { tool, input } = thought.action
    const output = await executeTool(tool, input)
    steps.push({ step: stepCount++, tool, input, output })
    // 实时回写 trace，支持中途查看进度
    await db.healJob.update(job.id, { trace: steps })
  }
}
```

### writePatch 的 LOC 校验

```typescript
async function writePatch(diff: string): Promise<string> {
  const lines = diff.split('\n')
  const addedLines = lines.filter(l => l.startsWith('+')).length
  const removedLines = lines.filter(l => l.startsWith('-')).length
  const totalLoc = addedLines + removedLines

  if (totalLoc > MAX_PATCH_LOC) {
    throw new Error(
      `patch LOC ${totalLoc} 超过上限 ${MAX_PATCH_LOC}，请缩小修复范围`
    )
  }
  await db.healJob.update(currentJobId, { patch: diff })
  return `patch 已记录，LOC=${totalLoc}`
}
```

### Docker 沙箱验证

```typescript
// 创建容器：只读挂载仓库快照，断网隔离，内存上限 2GB
async function runSandbox(cmd: string): Promise<string> {
  const container = await docker.createContainer({
    Image: 'node:20-alpine',
    Cmd: ['sh', '-c', cmd],
    HostConfig: {
      Binds: [`${repoSnapshot}:/workspace:ro`],
      NetworkMode: 'none',
      Memory: 2 * 1024 * 1024 * 1024,
    },
    WorkingDir: '/workspace',
  })
```

```typescript
  // 启动容器，10 分钟超时后强制终止
  const result = await Promise.race([
    container.start().then(() => container.wait()),
    timeout(10 * 60 * 1000, 'sandbox timeout'),
  ])
  return result.StatusCode === 0
    ? 'PASSED' : `FAILED: exit ${result.StatusCode}`
}
```

🔧 **真实场景**：某医疗平台药品详情页出现「Cannot read properties of null (reading 'name')」，AI Agent 通过 readIssue 获取堆栈，resolveStack 还原到 `DrugCard/index.tsx:156`，readFile 读取上下文，发现 `drug.specifications` 可能为 null，writePatch 生成一行加可选链的 diff，runSandbox 跑通单测，createPr 5 分钟内创建了修复 PR。

---

## ⚖️ 告警疲劳与降噪：生产级最佳实践

### 相对阈值 vs 绝对阈值

绝对阈值的陷阱：凌晨 3 点流量低谷，error 计数从 1 升到 2，「错误数 > 5」的规则不会触发，但增长了 100%，可能是真正的问题。白天高峰期，error 率稳定在 3%，「error_rate > 5%」的规则不触发，但这可能是业务正常波动。

相对阈值（`change_pct`）更有抗性：用当前窗口与历史均值的比值判断，自动适应流量曲线，减少误报。

| 指标类型 | 推荐策略 | 原因 |
|---|---|---|
| 错误率 | 相对阈值（变化率 > 500%） | 适应流量波动，减少凌晨误报 |
| API 成功率 | 绝对阈值（< 95%） | 有明确的业务 SLA 下界 |
| Web Vital p75 | 绝对阈值（LCP > 4000ms） | 有用户体验的明确标准 |
| 白屏事件 | 绝对阈值（计数 ≥ 1） | 白屏是严重异常，零容忍 |

### P0/P1/P2 分级与通知映射

```typescript
const SEVERITY_CHANNEL_MAP = {
  critical: ['sms', 'phone', 'dingtalk'],  // P0：短信 + 电话 + 群消息
  warning:  ['dingtalk', 'wecom'],          // P1：群消息
  info:     ['email'],                      // P2：邮件日报汇总
}
```

P0 用短信/电话确保第一时间打到人；P1 用 IM 群消息保证工作时间可见；P2 邮件汇总，避免打扰。

### 告警 + 自愈联动边界

并非所有告警都应该自动触发自愈，需要明确的联动条件：

```typescript
interface AlertRule {
  // ...
  autoHeal?: {
    enabled: boolean
    minConfidence: number    // AI 置信度下限，低于此不自动创建 PR
    requireApproval: boolean // true = 仅诊断不创建 PR，需人工确认
  }
}
```

生产推荐配置：`autoHeal.requireApproval = true`（仅诊断，人工点击确认后才创建 PR），`minConfidence = 0.8`（置信度低于 80% 不推送）。完全自动修复（`requireApproval = false`）只在测试环境开启。

> 💬 **面试官**：AI 自愈会不会引入新的问题？怎么保证安全？
>
> ✅ 标准答案：三道护栏：① 路径白名单（`.ghealclaw.yml` 的 `heal.paths`）限制 AI 只能修改指定目录；② LOC 上限（`maxLoc=100`）防止大范围改动；③ Docker 沙箱运行 verify 命令（lint + test），不通过不创建 PR。
> 🎁 加分答案：所有 Tool 调用写入 `heal_job.trace` 审计日志，生产事故可回溯；PR 加 `auto-heal` 标签，Code Review 时一眼识别 AI 生成的修复，不会和人工 PR 混淆。

---

## 💬 智愈系统的其他能力

### AI 对话抽屉（AiDrawer）

除了自动修复，系统提供了一个全局 AI 对话抽屉，可以在任意页面唤起，针对当前上下文做自由问答：

```
前端 AiDrawer（SSE 流式渲染）
    ↓
server AiChatController（鉴权 + 会话管理）
    ↓
AiChatService（消息持久化 + 上下文构建）
    ↓
LlmProviderService（6 种 Provider 注册表）
    ↓
LLM 流式输出（Claude / GPT / DeepSeek / Gemini / Moonshot / Ollama）
```

会话持久化用两张表：

```typescript
// ai_conversations：会话元信息
interface AiConversation {
  id: string           // conv_xxx
  projectId: string
  userId: string
  title: string        // 取第一条 user 消息的前 50 字
  createdAt: Date
}
```

```typescript
// ai_messages：消息列表
interface AiMessage {
  id: string           // msg_xxx
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: Date
}
```

6 种 LLM Provider 用注册表 + 工厂模式，通过 `LLM_PROVIDER` 环境变量切换，不改代码：

```typescript
const PROVIDER_REGISTRY = {
  deepseek: DeepSeekProvider,
  'deepseek-reasoner': DeepSeekReasonerProvider,
  gemini: GeminiProvider,
  moonshot: MoonshotProvider,
  minimax: MinimaxProvider,
  ollama: OllamaProvider,
}
```

### 一键 AI 诊断（DiagnoseButton）

在 Issue 详情页的「诊断」按钮，不走 BullMQ 队列，而是直接流式输出诊断结果：

```typescript
// 注入结构化上下文到 system prompt
const diagnosisContext = {
  issue: { title, fingerprint, count, affectedUsers },
  stack: resolvedStack,        // Sourcemap 还原后的堆栈
  breadcrumbs: recentCrumbs,   // 出错前 20 条面包屑
  codeSnippets: relevantCode,  // 相关文件片段（≤ 2000 tokens）
}
```

输出格式固定为 JSON，前端解析后分四块展示：

```typescript
interface DiagnosisResult {
  rootCause: string     // 根本原因（1-2 句）
  evidence: string      // 证据（引用堆栈或代码行）
  suggestedFix: string  // 修复建议（可含代码片段）
  confidence: number    // 0~1，低于 0.6 显示「建议人工介入」
}
```

### Sourcemap 自动修复完整链路

这是三种 AI 能力的完整串联：

```
Sourcemap 上传（CI 发布时自动上传）
  ↓ ErrorProcessor 堆栈还原（入库时异步，存 resolved_stack）
  ↓ Issue 高频触发告警（error_rate 超阈值）
  ↓ 用户点击「一键诊断」→ AI 流式输出根因分析
  ↓ 用户确认 → 点击「一键自愈」→ HealModule 触发
```

```
  ↓ ai-agent ReAct 循环
    readIssue → readFile → grepRepo → writePatch
  ↓ Docker 沙箱 verify（pnpm lint && pnpm test）
  ↓ GitHub API 创建 PR（branch: ghc-heal/issue-xxx）
  ↓ 开发者 Code Review → 合并
```

**AI 对话 vs 一键诊断 vs 自愈的区别**：

| 能力 | 触发方式 | 输出 | 适用场景 |
|---|---|---|---|
| AI 对话 | 任意问答 | 自由文本流式输出 | 探索性分析、不确定方向时 |
| 一键诊断 | Issue 详情页按钮 | 结构化 JSON（4 字段） | 快速了解根因，决定是否自愈 |
| AI 自愈 | 诊断后人工确认 | diff patch + PR | 确认是 AI 能处理的类型后 |

---

## 📊 看懂控制台告警面板

告警面板由三部分组成：

**告警历史列表**：按时间倒序，`firing` 显示红色标签，`resolved` 显示灰色。每行展示规则名、指标值、触发时间、持续时长（firedAt → resolvedAt 差值）。

**规则管理**：CRUD 界面，支持开关切换（`enabled` 字段），修改阈值和冷却期。预置规则默认 `enabled=false`，需手动开启——避免新项目接入时被大量历史数据误触发。

**通知渠道配置**：按渠道类型分组，每种渠道有独立的测试按钮（「发送测试消息」），接入时可立即验证配置是否生效，不用等真实告警触发。

> 💬 **面试官**：告警系统本身挂了怎么办？有没有对告警系统的监控？
>
> ✅ 标准答案：告警引擎的健康状态由基础设施层监控（如 k8s 的 Pod 存活探针、BullMQ 的 Worker 心跳）。告警 Worker 自身产生的异常会写入系统日志，和业务错误分开存储，互不干扰。
> 🎁 加分答案：「监控的监控」是个经典问题。实践上，核心告警规则（error_rate 突增、白屏率异常）可以在第三方服务（如 Sentry 或云监控）做一份冗余，两套独立体系相互兜底，避免单点失效。

---

## 🚀 完整最佳实践代码

### 告警规则 DSL 完整类型定义

```typescript
// 告警规则完整接口（基础字段）
interface AlertRule {
  id: string;  projectId: string;  name: string;  enabled: boolean
  target: 'error_rate' | 'api_success_rate'
        | 'web_vital' | 'issue_count' | 'custom_metric'
  severity: 'info' | 'warning' | 'critical'
  cooldownMs: number;  channels: string[];  lastFiredAt?: Date
  autoHeal?: { enabled: boolean; minConfidence: number; requireApproval: boolean }
}
```

```typescript
// condition 子字段
interface AlertCondition {
  aggregation: 'avg' | 'p75' | 'p95' | 'count' | 'rate'
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'change_pct'
  threshold: number
  window: { durationMs: number; minSamples?: number }
  metricKey?: string  // web_vital / custom_metric 专用
}
```

### 评估引擎核心实现

```typescript
// @Cron('*/1 * * * *') — 每分钟并发评估所有启用规则
async function runAlertEvaluator(rules: AlertRule[]) {
  await Promise.all(rules.filter(r => r.enabled).map(async (rule) => {
    try {
      const value = await queryMetric(rule)
      if (value === null) return
      const fired = compare(value, rule.condition)
      if (!fired) { await maybeResolve(rule); return }
      const elapsed = rule.lastFiredAt
        ? Date.now() - rule.lastFiredAt.getTime() : Infinity
      if (elapsed < rule.cooldownMs) return  // 冷却期内跳过
```

```typescript
      // 写 firing + 更新 lastFiredAt + 投递通知队列
      await db.alertHistory.create({
        ruleId: rule.id, status: 'firing',
        metricValue: value, firedAt: new Date(),
      })
      await db.alertRule.update(rule.id, { lastFiredAt: new Date() })
      await notifyQueue.add({ ruleId: rule.id, metricValue: value })
    } catch (e) { logger.error(`rule ${rule.id} eval failed`, e) }
  }))
}
```

### `.ghealclaw.yml` 生产配置示例

```yaml
# 仓库信息
repo:
  platform: github
  url: org/medai-platform
  baseBranch: main
```

```yaml
# 自愈配置
heal:
  enabled: true
  paths:
    - "src/components/**"
    - "src/utils/**"
    - "src/hooks/**"
  forbidden:
    - "src/payment/**"
    - "src/auth/**"
  verify: "pnpm lint && pnpm test --run"
  maxLoc: 100
  requireLabels: ["auto-heal"]
```

`forbidden` 把支付和认证模块排除——即使 AI 置信度很高，这两块也必须人工审查，不允许自动修改。

---

## 🏭 生产边界：AI 自愈做不到的三类问题

AI 自愈不是万能的。上线前必须搞清楚它的边界，否则置信度再高也是在制造风险。

### 适合 vs 不适合的 bug 类型

| 类型 | 适合自愈 | 原因 |
|---|---|---|
| NPE / 空指针 | ✅ | 堆栈精准，修复模式固定（加可选链/判空） |
| 边界条件缺失 | ✅ | 上下文局部，patch 范围小，sandbox 易验证 |
| 类型错误 | ✅ | TS 类型推断 + readFile 读上下文可定位 |
| 业务逻辑 bug | ❌ | 需要理解领域语义，AI 缺乏业务上下文 |
| 架构问题 | ❌ | 修复范围跨多文件，超出 maxLoc 硬限制 |
| 跨服务联动 bug | ❌ | 根因在后端，前端 patch 无法修复 |
| 安全相关代码 | ❌ | `.ghealclaw.yml` 的 `forbidden` 强制拦截 |

### 三道护栏为什么缺一不可

**护栏一：路径白名单**。`heal.paths` 只允许修改业务组件和工具函数，不允许触碰支付、认证、权限模块。即使 AI 置信度 99%，这些模块的任何改动都必须人工审查。

**护栏二：LOC 上限**。`maxLoc=100` 限制单次 patch 最多改 100 行。真正能被 AI 安全修复的 bug，patch 通常不超过 10 行；超过 100 行意味着 AI 在猜测，不在修复。

**护栏三：Docker 沙箱验证**。`verify: "pnpm lint && pnpm test --run"` 确保 patch 不破坏已有逻辑。沙箱用只读 mount + 网络隔离，AI 无法通过 verify 脚本向外泄露代码。

> 💬 **面试官**：AI 自愈会不会把 bug 改出新 bug？怎么防？
>
> ✅ 标准答案：三道护栏防止扩散：路径白名单限制改动范围、LOC 上限阻止大范围变更、Docker 沙箱跑 lint + test 确保 patch 可以通过验证，不通过就标记 `failed` 不创建 PR。
> 🎁 加分答案：生产推荐 `requireApproval: true`——AI 诊断完只推送根因分析和建议 patch，人工确认后才创建 PR。完全自动模式只在测试环境开启，线上始终保留人工决策环节。

---

## 🔬 对齐源码：手写版告警引擎还差什么

手写版评估引擎能跑，但和 g-heal-claw 真实实现比，有几个关键差距。

### `metric_minute` 预聚合表

手写版直接在 `queryMetric` 里扫描原始事件表。真实系统不这样做——原始事件量级太大，每分钟全量扫描代价极高。

g-heal-claw 用 `metric_minute` 预聚合表：

```sql
-- metric_minute：每分钟预聚合，告警评估只查这张表
CREATE TABLE metric_minute (
  project_id   TEXT NOT NULL,
  metric_key   TEXT NOT NULL,   -- "error_rate" / "lcp_p75" 等
  minute_ts    TIMESTAMPTZ NOT NULL,
  value        NUMERIC NOT NULL,
  sample_count INT NOT NULL,
  PRIMARY KEY (project_id, metric_key, minute_ts)
);
```

评估时只需查最近 N 条 `metric_minute` 记录，不碰原始表，查询从秒级降到毫秒级。

### 多项目并发隔离

手写版用 `Promise.all` 并发评估所有规则，没有项目隔离。真实实现按 `projectId` 分桶，每个项目最多并发 5 条规则评估，防止某个流量大的项目把 Worker 线程全占满：

```typescript
// 按项目分组，每组内并发评估
const grouped = groupBy(rules, r => r.projectId)
await Promise.all(
  Object.values(grouped).map(group =>
    pLimit(5)(() => Promise.all(group.map(evaluateRule)))
  )
)
```

### 手写版 vs 真实实现差异总结

| 能力 | 手写版 | g-heal-claw |
|---|---|---|
| 数据来源 | 直接查原始事件表 | `metric_minute` 预聚合表 |
| 项目并发控制 | 无，全量 `Promise.all` | 按项目分桶，`pLimit(5)` |
| 冷却期存储 | 内存 `lastFiredAt` | 数据库持久化，重启不丢 |
| 告警历史 | 只写 firing | firing + resolved 都写，持续时长可查 |
| 错误隔离 | 单条失败中断批次 | 单条 catch 后继续，不影响其他规则 |

结论：手写版理解原理足够，生产使用 g-heal-claw 的实现，`metric_minute` 预聚合 + 项目分桶是两个最值得面试时主动提及的优化点。

---

## 🔌 接入指南：从零到第一条告警触发

### 第一步：开启预置规则

项目创建时 6 条预置规则默认 `enabled=false`，进入「告警规则」页按需开启。推荐第一批只开 `critical` 级别：

```
白屏事件出现（critical）  ← 最高优先，零容忍
API 成功率下降（critical）← 影响所有用户
错误率突增（critical）    ← 新版本质量兜底
```

`warning` 级别等项目跑稳后再开，避免初期数据噪声产生大量误报。

### 第二步：绑定通知渠道

在「通知渠道」页新建渠道，每种类型有独立的测试按钮，接入完成后立即发一条测试消息验证：

```typescript
// 最简钉钉渠道配置
{
  type: 'dingtalk',
  name: '前端告警群',
  config: {
    webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
    secret: 'SEC...',   // 加签密钥，防止伪造请求
  }
}
```

`secret` 不填则不加签，仅靠 token 鉴权——安全性较低，生产建议配置加签。

### 第三步：自定义规则（可选）

预置规则覆盖通用场景，业务特有场景需自定义。以「药品搜索页 LCP 劣化」为例：

```typescript
{
  name: '药品搜索页 LCP 劣化',
  target: 'web_vital',
  condition: {
    aggregation: 'p75',
    operator: 'gt',
    threshold: 3500,           // 搜索页 SLA 3.5s
    window: { durationMs: 10 * 60 * 1000 },
    metricKey: 'lcp',
  },
  severity: 'warning',
  cooldownMs: 30 * 60 * 1000, // 30 分钟冷却
  channels: ['dingtalk-fe'],
}
```

### 第四步：配置 AI 自愈授权（可选）

AI 自愈需要额外两步：① 在项目设置页填写 GitHub Token（`repo` scope）；② 在仓库根目录放置 `.ghealclaw.yml`，声明允许修改的路径和验证命令。

缺少 `.ghealclaw.yml` 时，AI 诊断功能正常工作，但自动创建 PR 的能力被禁用——这是有意设计，防止误接入的项目被 AI 自动修改代码。

> 💬 **面试官**：告警系统上线后，怎么判断它在正常工作？
>
> ✅ 标准答案：两个验证维度——① 规则评估层：查告警历史表，确认每分钟都有评估记录写入；② 通知层：每种渠道用测试按钮发一条消息，确认配置有效。另外开启一条低阈值的测试规则主动触发一次 firing，走完完整链路。
> 🎁 加分答案：告警系统自身的健康状态应该由基础设施层监控（BullMQ Worker 心跳 + Pod 存活探针），而不是靠告警系统自己监控自己——循环依赖，单点失效时会静默。

---

## 🏗️ 项目实战：一次完整的告警 → AI 自愈闭环

来看一个真实的端到端案例，把前面所有章节串起来。

### 场景：大促前夜，药品详情页白屏告警触发

**背景**：某医疗电商平台大促前一天下午 16:20，运营团队刚完成了一次活动配置上线，推送了新的「促销标签」组件。

**16:21 — 告警触发**

白屏检测规则（`white_screen 计数 ≥ 1 / 5min，critical`）在 16:21 触发 firing，钉钉群收到告警消息：

```
🔴 [CRITICAL] 白屏事件出现
项目：medai-platform-web
触发值：3 次 / 5min（阈值：≥ 1 次）
触发时间：16:21:04
告警规则：白屏事件出现
```

同时 API 成功率规则（`api_success_rate < 95%`）也在 16:23 触发——后端接口还在，但前端白屏导致大量 fetch 未完成就中断，成功率指标连带下降。

**16:22 — 一键 AI 诊断**

值班同学打开控制台，找到最新的白屏 Issue，点击「一键诊断」。DiagnoseButton 把结构化上下文（Issue + 3 帧堆栈 + 最近 50 条面包屑）注入 Prompt，30 秒内返回：

```json
{
  "rootCause": "PromotionTag 组件在 drug.promotions 为 undefined 时
                直接访问 .map()，导致 TypeError，触发 ErrorBoundary 白屏",
  "evidence": "面包屑第 47 条：route /drug/detail/12345；
               堆栈帧 1：PromotionTag/index.tsx:34",
  "suggestedFix": "在 .map() 前加空值守卫：
                   drug.promotions?.map(...) ?? []",
  "confidence": 0.92
}
```

置信度 0.92，超过 `minConfidence: 0.8` 阈值。

**16:24 — 人工确认，AI 开始修复**

值班同学确认根因合理，点击「确认修复」。heal_job 进入 `diagnosing` 状态，Agent 开始 ReAct 循环：

```
Thought: 需要读取 PromotionTag/index.tsx 第 34 行上下文
Action: readFile("src/components/PromotionTag/index.tsx", 28, 45)
Observation: 确认第 34 行 drug.promotions.map(...)，无空值守卫

Thought: 修复方案——改为可选链
Action: writePatch(diff)   // 1 行改动，LOC=1 < 100 ✅
Observation: patch 写入成功
```

```
Thought: 需要在沙箱验证
Action: runSandbox("pnpm lint && pnpm test --run")
Observation: 全部通过，0 失败

Thought: 可以创建 PR
Action: createPr("fix: add null guard in PromotionTag for promotions field")
Observation: PR #847 已创建，label: auto-heal
```

**16:29 — PR 合并，告警 resolved**

值班同学 Review PR #847（diff 仅 1 行），合并，触发 CI，8 分钟后新版本部署完成。白屏计数归零，告警系统在 16:40 写入 `resolved`，钉钉群收到恢复通知。

| 阶段 | 时间 | 耗时 |
|---|---|---|
| 告警触发 | 16:21 | — |
| 一键诊断完成 | 16:22 | 1 min |
| AI 自愈 PR 创建 | 16:29 | 7 min |
| 合并 + 部署完成 | 16:37 | 8 min |
| 告警 resolved | 16:40 | 共 19 min |

整个过程值班同学参与了两步：点击「一键诊断」和 Review 合并 PR。从告警到修复上线 19 分钟，其中人工操作不到 3 分钟。

> 💬 **面试官**：AI 自愈和人工修复相比，优势在哪？什么场景下还是得人工来？
>
> ✅ 标准答案：AI 自愈的优势是速度和一致性——NPE/边界条件这类模式固定的 bug，AI 30 秒内出根因分析、5 分钟内创建 PR，比人工定位快一个数量级。必须人工来的场景：① 业务逻辑 bug（AI 缺领域语义）；② 置信度低于阈值的（AI 自己也不确定）；③ 涉及安全模块的（`.ghealclaw.yml` 硬拦截）。
> 🎁 加分答案：heal_job 的 trace 字段记录了 Agent 每一步的 Thought/Action/Observation，Code Review 时不只看 diff，还能看 AI 的推理过程是否合理。这比纯人工写的 PR 多一层可审查性。

---

## 💡 一张图总结（面试速记）

| 知识点 | 核心要点 | 面试频率 |
|---|---|---|
| 告警规则 DSL | target + condition（aggregation/operator/threshold/window）+ severity + cooldownMs | ⭐⭐⭐⭐ |
| Pull vs Push | Pull：窗口聚合天然支持，实现简单，1 分钟精度够用 | ⭐⭐⭐⭐ |
| 评估状态机 | firing → resolved，冷却期防轰炸，resolved 也发通知 | ⭐⭐⭐⭐ |
| 相对 vs 绝对阈值 | 错误率用 change_pct，API 成功率/Web Vital 用绝对值 | ⭐⭐⭐ |
| 钉钉签名 | HMAC-SHA256(timestamp + \n + secret)，1 小时有效防重放 | ⭐⭐⭐ |
| AI 自愈边界 | 适合 NPE/边界条件/类型错误，不适合逻辑 bug/架构问题 | ⭐⭐⭐⭐ |
| ReAct 循环 | Thought → Action（Tool 调用）→ Observation → 循环 | ⭐⭐⭐⭐ |
| heal_job 状态机 | queued → diagnosing → patching → verifying → pr_created | ⭐⭐⭐⭐ |
| 安全护栏 | 路径白名单 + LOC 上限 + Docker 网络隔离 + trace 审计日志 | ⭐⭐⭐⭐ |
| 一键诊断 vs 自愈 | 诊断是流式输出根因分析；自愈是异步 Agent + sandbox + PR | ⭐⭐⭐ |
| AI 对话 | 6 种 Provider 注册表，普通对话直接流式，复杂修复走 BullMQ | ⭐⭐⭐ |
| 告警疲劳 | 冷却期 + 持续 N 周期防抖 + P0/P1/P2 分级通知 | ⭐⭐⭐ |

---

## 📝 留个问题

你们项目里有没有配置告警规则？告警触发后的响应链路是怎么设计的——是立刻通知所有人，还是有分级响应机制？欢迎评论区聊聊你们的实践。

---

> 🔖 这是「前端性能与监控系列」第 N 篇。上一篇：《手写性能监控 SDK——对齐 web-vitals 生产库》；下一篇预告：《自定义埋点 SDK——代码埋点、全埋点、曝光埋点三套方案》
