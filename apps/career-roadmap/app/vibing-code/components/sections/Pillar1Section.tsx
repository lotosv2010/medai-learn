'use client'

import { Accordion } from '../shared/Accordion'
import { CodeBlock } from '../shared/CodeBlock'
import { CompareBlock } from '../shared/CompareBlock'
import { ExtendedThinkingCards } from '../shared/ExtendedThinkingCards'
import { SectionGroup } from '../shared/SectionGroup'

export function Pillar1Section({ active }: { active: boolean }) {
  return (
    <section className={`section ${active ? 'active' : ''}`}>
      <h1 className="page-title">配置</h1>
      <p className="page-sub">让 AI 每次对话都能立刻进入状态，不需要重复解释项目背景</p>

      <div className="callout callout-teal">
        <strong>核心论点：</strong>CLAUDE.md 是 AI 的&quot;项目记忆&quot;。没有它，每次都要重新介绍项目；有了它，AI 开口就在状态。
      </div>

      <h3 className="section-title">Bad → Good 对比</h3>
      <CompareBlock
        badLabel="❌ 无 CLAUDE.md"
        goodLabel="✅ 有 CLAUDE.md"
        bad={`> 帮我给这个组件加个 loading 状态

// AI 输出：引入了 shadcn/ui 的 Spin
// 问题：项目用的是 antd，你还得手动纠正
// 每次都要说"我们用 antd"，AI 才能继续`}
        good={`# CLAUDE.md 里写了：
# 禁止引入新 UI 库（已有 antd，够用）

> 帮我给这个组件加个 loading 状态

// AI 输出：使用 antd 的 Button isLoading prop
// 直接对，不需要纠正`}
      />

      <SectionGroup title="基础设施" accent="var(--blue)">
      <h3 className="section-title">完整项目配置结构</h3>
      <Accordion title="展开查看：推荐的项目目录结构" accent="var(--blue)">
        <CodeBlock lang="tree" code={`project-root/
│
├── CLAUDE.md               # Claude 每次对话必读（项目级）；精简！
├── AGENTS.md               # 兼容 Codex / Gemini CLI 等其他 agent 工具
├── README.md               # 项目概述，Claude 会读取
├── .claudeignore           # 不让 Claude 读取的文件/目录
│
├── .claude/
│   ├── settings.json       # 权限规则、Hooks 注册；团队共享，纳入 git
│   ├── settings.local.json # 个人覆盖（调试开关等）；加入 .gitignore
│   │
│   ├── skills/             # Skill = Slash Command，文件名即命令名
│   │   ├── feat.md         # 功能开发全流程（/feat T1:用户上传）
│   │   └── cr.md           # Code Review 检查清单（/cr @src/api/upload.ts）
│   │
│   ├── rules/              # 细粒度规则文件，CLAUDE.md 中用 @import 引入
│   │   ├── architecture.md # 架构约束：模块边界、禁止的依赖方向
│   │   ├── coding.md       # 编码规范：命名、文件结构、禁用 API
│   │   └── review.md       # Review 标准：性能、安全、可维护性清单
│   │
│   ├── hooks/              # Hook 脚本（由 settings.json 注册）
│   │   ├── post-edit-quality.sh   # 编辑后：自动格式化 + 类型检查
│   │   └── pre-bash-firewall.sh   # 执行前：危险命令拦截
│   │
│   └── agents/             # 专职 Agent 定义
│       ├── critic-agent.md    # 批判角色：方案确认前挑战假设
│       ├── reviewer-agent.md  # 审查角色：PR 前只读审查
│       ├── frontend-agent.md  # 专注 UI 层
│       └── backend-agent.md   # 专注服务层
│
├── docs/                   # 项目知识库（Claude 的"长期记忆"）
│   ├── product.md          # 产品背景、用户画像
│   ├── architecture.md     # 系统架构决策
│   ├── tech-stack.md       # 技术选型及理由
│   ├── coding-style.md     # 代码风格详细规范
│   ├── api-contract.md     # 前后端接口契约
│   ├── database.md         # 表结构、索引策略
│   ├── ui-rules.md         # UI 规范、设计 Token
│   ├── prompts.md          # 团队沉淀的高效 Prompt 片段库
│   ├── team.md             # 团队人员分工、负责人、沟通方式
│   ├── oncall.md           # 值班安排、升级路径、紧急联系人
│   ├── sprint-board.md     # 当前 Sprint 目标、优先级、阻塞项
│   ├── decisions/          # ADR 归档
│   └── tasks/              # 任务拆解文档归档
│
└── tests/
    # unit/ | integration/ | e2e/ | fixtures/
    # Vibing Code 铁律：Claude 必须能通过跑测试来自我验证`} />
        <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--blue-bg)', borderRadius: 8, borderLeft: '3px solid var(--blue)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--blue)' }}>多工具切换 Tip：</strong>同时使用 Claude Code、Codex、Gemini CLI 等多个助手时，可以维护一份 <code>AGENTS.md</code>，有两种接入方式：<br />
          <strong>方式一（推荐）：</strong>在 CLAUDE.md 末尾用 <code>@AGENTS.md</code> 引用，各工具保持各自入口，内容按需裁剪，灵活且可维护。<br />
          <strong>方式二：</strong>将 <code>CLAUDE.md</code> 软链接到 <code>AGENTS.md</code>（<code>ln -s AGENTS.md CLAUDE.md</code>），所有工具读同一份文件，零维护成本，但需要内容对所有工具都通用——Windows 环境下软链接有额外权限要求，注意兼容性。
        </div>
      </Accordion>

      <h3 className="section-title">真实项目结构：鼎新 chat/</h3>
      <Accordion title="展开查看：鼎新项目 chat/ 目录结构（生产级参考）" accent="var(--coral)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 12 }}>
          以下是鼎新项目的真实 Claude Code 配置结构，精简至只保留对 AI 有意义的文件。
        </div>
        <CodeBlock lang="tree" code={`chat/
│
├── CLAUDE.md               # Claude 每次对话必读（项目级）；精简！
├── README.md               # 项目概述，Claude 会读取
├── .claudeignore           # 不让 Claude 读取的文件/目录
│
├── .claude/
│   ├── settings.json       # 权限规则、Hooks 注册；团队共享，纳入 git
│   │
│   ├── skills/             # Skill = Slash Command，文件名即命令名
│   │   ├── feat.md         # 功能开发全流程（/feat T1:用户上传）
│   │   └── cr.md           # Code Review 检查清单（/cr @src/api/upload.ts）
│   │
│   ├── rules/              # 细粒度规则文件，CLAUDE.md 中用 @import 引入
│   │   ├── architecture.md # 架构约束：模块边界、禁止的依赖方向
│   │   ├── coding.md       # 编码规范：命名、文件结构、禁用 API
│   │   └── review.md       # Review 标准：性能、安全、可维护性清单
│   │
│   ├── hooks/              # Hook 脚本（由 settings.json 注册）
│   │   ├── post-edit-quality.sh   # 编辑后：自动格式化 + 类型检查
│   │   └── pre-bash-firewall.sh   # 执行前：危险命令拦截
│   │
│   └── agents/             # 专职 Agent 定义
│       ├── critic-agent.md    # 批判角色：方案确认前挑战假设
│       └── reviewer-agent.md  # 审查角色：PR 前只读审查
│
├── docs/                   # 项目知识库（Claude 的"长期记忆"）
│   ├── product.md          # 产品背景、用户画像
│   ├── architecture.md     # 系统架构决策
│   ├── coding-style.md     # 代码风格详细规范
│   ├── api-contract.md     # 前后端接口契约
│   ├── ui-rules.md         # UI 规范、设计 Token
│   ├── decisions/          # ADR 归档
│   └── tasks/              # 任务拆解文档归档
│
├── tests/
└── src/`} />
        <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--coral-bg, rgba(255,100,80,0.08))', borderRadius: 8, borderLeft: '3px solid var(--coral)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--coral)' }}>与通用模板的差异：</strong>鼎新项目去掉了 <code>AGENTS.md</code>、<code>settings.local.json</code>、<code>frontend/backend-agent.md</code> 等非必要文件，<br />
          docs/ 也精简为 6 个核心文档。<strong>越少越好</strong>，只保留 Claude 真正会读的内容。
        </div>
      </Accordion>

      <h3 className="section-title">三层配置体系</h3>
      <div className="table-wrap" style={{ marginBottom: 20 }}>
        <table>
          <thead>
            <tr>
              <th>层级</th>
              <th>位置</th>
              <th>用途</th>
              <th>纳入 Git</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['个人全局', '~/.claude/CLAUDE.md', '跨项目个人习惯（输出语言、沟通风格）', '❌'],
              ['项目共享', '.claude/settings.json', '团队约束、Hooks 注册', '✅'],
              ['项目本地', '.claude/settings.local.json', '个人覆盖（调试开关等）', '❌'],
            ].map(([level, path, use, git]) => (
              <tr key={level as string}>
                <td><span style={{ fontWeight: 500, color: 'var(--text)' }}>{level}</span></td>
                <td><code style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{path}</code></td>
                <td>{use}</td>
                <td>{git}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="section-title">CLAUDE.md 完整模板</h3>
      <Accordion title="展开查看：可直接复制使用的 CLAUDE.md 模板" accent="var(--teal)">
        <CodeBlock lang="markdown" code={`# 项目上下文
[项目类型 + 一句话描述核心价值]，使用 [核心技术栈]。

# 通用行为
- 优先编辑文件而非重写整个文件
- 不要重复读取本次对话中已读过的文件（除非被修改）
- 输出结果简洁；推理过程和计划必须详尽

# 技术栈
- 包管理器：pnpm（禁止使用 npm / yarn）
- 框架：Next.js 15 App Router
- 样式：Tailwind CSS v4 + CSS Variables
- 测试：Vitest（单元）+ Playwright（E2E）

# 代码规范
- 单文件不超过 400 行，超了就拆模块
- 函数嵌套不超过 4 层
- 详细规范见 @.claude/rules/coding.md

# 命令
- 开发：pnpm dev
- 类型检查：pnpm typecheck
- 单元测试：pnpm test
- E2E：pnpm e2e
- Lint：pnpm lint

# 工作流规则
- 每次修改后必须通过 typecheck 和 test，有失败立即修复
- 禁止 @ts-ignore，有类型问题先告诉我再解决
- 迁移文件只能在 migrations/ 目录下创建

# 禁止事项（违反 = 立即停止）
- 禁止引入新的 UI 库（已有 antd，够用）
- 禁止使用 any 类型，用 unknown + 类型守卫代替
- 禁止直接操作 DOM（除非在 useEffect 内）
- 禁止在 catch 块中吞掉错误

# 常见错误（高优先级）
- DON'T 新建文件前不检查 → ALWAYS 先 Grep 搜索类似实现
- DON'T 跳过类型检查 → ALWAYS 每次修改后运行 pnpm typecheck
- DON'T 引入未在 package.json 中的依赖 → ALWAYS 先确认再安装

# 参考文档
- 架构：@docs/architecture.md
- 编码规范：@docs/coding-style.md
- API 契约：@docs/api-contract.md`} />
      </Accordion>

      <h3 className="section-title">真实项目 CLAUDE.md 案例：鼎新 chat/</h3>
      <Accordion title="展开查看：鼎新项目 CLAUDE.md（药店 AI 经营助手）" accent="var(--amber)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 12 }}>
          以下是鼎新 chat/ 项目的真实 CLAUDE.md。每行都回答了「删掉会犯什么错」。
        </div>
        <CodeBlock lang="markdown" code={`# chat app 上下文

药店 AI 经营助手，基于 Vue 3 + antd，以流式对话为核心交互。

# 通用行为

- 优先编辑文件而非重写整个文件
- 不要重复读取本次对话中已读过的文件（除非被修改）
- 输出结果简洁；推理过程和计划必须详尽

# 技术栈

- 框架：Vue 3 + Vite 2（MPA，此 app 唯一入口）
- UI：antd（已注册组件见 \`vendors/ui/vant/index.js\`）
- 状态：Vuex 4（仅 messages，业务状态基本在组件内用 ref/reactive）
- HTTP：\`apis/request.js\` 封装的 Axios 实例，**禁止直接 import axios**
- 样式：Less（全局变量自动注入，禁止手动 @import 全局变量文件）
- Markdown：marked.js（含思考面板、SQL 折叠等自定义扩展）
- 原生通信：jsBridge（通过 \`useGlobalProperties\` 获取）

# 目录职责

| 目录 | 职责 |
|------|------|
| \`apis/\` | 接口定义，\`index.js\` 聚合导出，\`request.js\` HTTP 封装 |
| \`router/\` | Hash 模式，仅一条路由 \`/\` → \`views/home/index.vue\` |
| \`store/\` | messages 列表（addMessage / clearMessages），其余状态在组件内管理 |
| \`startup/\` | 应用初始化，注册 antd 组件、插件、jsBridge 全局属性 |
| \`views/home/\` | 核心页面（index.vue + index.less） |
| \`utils/\` | \`hasToken()\` 检测登录，\`getMallLoginUrl()\` 生成登录跳转地址 |
| \`hooks/\` | \`useGlobalProperties\` 访问 jsBridge 等全局注入对象 |

# 核心业务逻辑

## 三个视图状态（currentView）

- \`welcome\`：欢迎页，居中输入框 + 技能 Tab + 引导问题
- \`chat\`：对话视图，消息列表 + 底部输入栏
- \`empty\`：今日次数用尽

## 关键数据流

1. **初始化**：检测登录 → 拉取预设问题（新手任务）→ 拉取配额 → 恢复上次会话
2. **发送消息**：验证登录/配额 → \`sendMessage()\` 流式接收 → 打字机效果更新 → 更新配额
3. **会话恢复**：历史抽屉选择 → \`getRecentConv()\` → 渲染历史消息

## 流式响应

\`sendMessage()\` 在 \`apis/index.js\` 中模拟流式输出（3字/段，30ms 间隔），通过 \`onChunk\` 回调更新 \`assistantMsg.content\`。

## Markdown 扩展

- \`<verification>\` 标签 → 可折叠"分析思考过程"面板
- \`- 模板：<sql>\` 行 → 可展开 SQL 块
- 每条回答末尾追加内联 AI 标识徽章（\`.msg-ai-badge\`）

# 命令

\`\`\`bash
# 启动
npm run dev:chat

# 构建
npm run build
\`\`\`

# 代码规范

- 单文件不超过 400 行，超了就拆模块
- 新增接口函数命名：动词 + 名词，camelCase（如 \`fetchUserInfo\`）
- 组件样式加 \`scoped\`；全局样式放 \`assets/style/\`
- 禁止在 app 组件中引用其他 app 的代码，公共逻辑走 \`src/\`

# 禁止事项

- 禁止直接 \`import axios\`，统一走 \`apis/request.js\`
- 禁止在 \`<style>\` 中手动 import 全局 Less 变量
- 禁止引用其他 app（如 \`@trade/\`、\`@mall/\`）的组件或工具
- 禁止在 catch 块中吞掉错误，至少 Toast 或 console.error

# 常见陷阱

- \`handleSend\` 作为事件处理器时必须加括号 \`@click="handleSend()"\`，否则会把 MouseEvent 当参数传入
- Less 嵌套规则须在父选择器 \`{}\` 内，不能在外部使用 \`&\` 引用父类
- \`typingStatus\` 切换间隔为 8s，文案共 12 条，顺序不要打乱

# 知识库文档

| 文档 | 内容 |
|------|------|
| [\`docs/product.md\`](docs/product.md) | 产品背景、功能概览、视图状态 |
| [\`docs/architecture.md\`](docs/architecture.md) | 目录职责、数据流、依赖说明 |
| [\`docs/api-contract.md\`](docs/api-contract.md) | 接口列表、认证、错误码、流式处理 |
| [\`docs/ui-rules.md\`](docs/ui-rules.md) | 主题色、气泡样式、动画、布局约束 |
| [\`docs/coding-style.md\`](docs/coding-style.md) | 命名规范、禁止事项、常见陷阱 |`} />
        <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--amber-bg)', borderRadius: 8, borderLeft: '3px solid var(--amber)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--amber)' }}>关键洞察：</strong>鼎新这份 CLAUDE.md 覆盖了技术栈、目录职责、业务逻辑、禁止事项和常见陷阱。<br />
          每一条都对应一个 Claude 在没有上下文时会犯的具体错误。知识库文档用 @引用，不内联，保持精简。
        </div>
      </Accordion>
      </SectionGroup>

      <SectionGroup title="CLAUDE.md 设计原则" accent="var(--teal)">
      <h3 className="section-title">CLAUDE.md vs Hook：规则放哪里？</h3>
      <div className="callout callout-amber">
        <strong>核心区别：</strong>CLAUDE.md 是&quot;建议&quot;，Claude 理解后遵循；Hook 是&quot;法律&quot;，确定性执行，不依赖 AI 理解。
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>规则类型</th><th>放 CLAUDE.md</th><th>放 Hook</th></tr>
          </thead>
          <tbody>
            {[
              ['不引入新 UI 库', '✅ 语义约束', '—'],
              ['禁止 any 类型', '✅ 编码习惯', '—'],
              ['编辑后自动格式化', '—', '✅ PostToolUse 确定执行'],
              ['阻止写入 .env*', '❌ 不可靠', '✅ PreToolUse exit 2 强制拦截'],
              ['阻止修改 migrations/', '❌ 不可靠', '✅ PreToolUse 强制拦截'],
              ['阻止 rm -rf 类命令', '❌ 不可靠', '✅ PreToolUse 强制拦截'],
            ].map(([rule, claude, hook]) => (
              <tr key={rule as string}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{rule}</td>
                <td style={{ color: (claude as string).startsWith('✅') ? 'var(--teal)' : (claude as string).startsWith('❌') ? 'var(--coral)' : 'var(--text3)' }}>{claude}</td>
                <td style={{ color: (hook as string).startsWith('✅') ? 'var(--teal)' : 'var(--text3)' }}>{hook}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="section-title">Bad → Good 对比：规则执行方式</h3>
      <CompareBlock
        badLabel="❌ 写在 CLAUDE.md（不可靠）"
        goodLabel="✅ 写在 Hook（强制拦截）"
        bad={`# CLAUDE.md 里写：
- 禁止写入 .env 文件
- 禁止修改 migrations/

// 问题：这是"建议"，AI 理解后遵循，
// 但偶尔会在复杂任务中忽略，造成不可逆损失`}
        good={`// .claude/settings.json — PreToolUse Hook
// 匹配到 .env 或 migrations → exit 2 强制阻断
// 这是"法律"，不依赖 AI 的理解力

// 危险命令同理：rm -rf /、git reset --hard
// 都会被 shell 脚本拦截，stderr 反馈给 Claude`}
      />

      <h3 className="section-title">黄金法则</h3>
      <div style={{ padding: '16px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text2)', lineHeight: 1.9 }}>
        每一行都问：<br />
        <span style={{ color: 'var(--teal)' }}>&quot;删掉这行，Claude 会犯什么具体的错误？&quot;</span><br />
        → 能说出具体错误：<strong style={{ color: 'var(--text)' }}>保留</strong><br />
        → 说不出来：<strong style={{ color: 'var(--coral)' }}>删除</strong>，或移入 docs/<br /><br />
        目标：<span style={{ color: 'var(--amber)' }}>50 行以内</span>。超过 100 行说明你在用它代替文档。
      </div>
      </SectionGroup>

      <SectionGroup title="Hooks 执行层" accent="var(--purple)">
      <h3 className="section-title">Hooks 完整配置</h3>
      <div className="callout callout-amber">
        <strong>核心概念：</strong>Hook 在 Claude Code 生命周期的特定节点自动触发，不依赖 AI 理解，确定性执行。
      </div>
      <div className="table-wrap" style={{ marginBottom: 20 }}>
        <table>
          <thead>
            <tr>
              <th>事件</th>
              <th>触发时机</th>
              <th>matcher</th>
              <th>典型用途</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['PreToolUse', '工具执行前', '工具名', '日志记录、权限拦截'],
              ['PostToolUse', '工具执行后（成功）', '工具名', '自动格式化、运行测试'],
              ['PostToolUseFailure', '工具执行后（失败）', '工具名', '错误处理'],
              ['PermissionRequest', '权限弹窗前', '工具名', '自动放行/拦截'],
              ['UserPromptSubmit', '用户提交消息时', '—', '输入预处理'],
              ['SessionStart', '会话启动时', '—', '初始化环境'],
              ['Stop', 'Claude 停止响应时（含 clear/resume/compact）', '—', '收尾通知'],
              ['PreCompact', '上下文压缩前', '"manual"/"auto"', '保存关键上下文'],
              ['PostCompact', '上下文压缩后', '"manual"/"auto"', '恢复上下文'],
              ['Notification', '通知触发时', '通知类型', '自定义通知处理'],
            ].map(([event, timing, matcher, usage]) => (
              <tr key={event as string}>
                <td><code style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--teal)' }}>{event}</code></td>
                <td>{timing}</td>
                <td><code style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{matcher}</code></td>
                <td>{usage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Accordion title="展开查看：settings.json + 两个 Hook 脚本" accent="var(--purple)">
        <CodeBlock lang="json" code={`{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{
          "type": "command",
          "command": ".claude/hooks/post-edit-quality.sh",
          "timeout": 30
        }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "command",
          "command": ".claude/hooks/pre-bash-firewall.sh",
          "timeout": 10
        }]
      }
    ]
  }
}`} />
        <CodeBlock lang="bash" code={`#!/usr/bin/env bash
# .claude/hooks/post-edit-quality.sh
set -euo pipefail

# 自动格式化（失败不阻断）
npx prettier --write . --quiet 2>/dev/null || true

# 类型检查失败时通知 Claude
if ! pnpm typecheck --quiet 2>&1; then
  echo "⚠️ TypeScript 类型检查失败，请在继续前修复类型错误" >&2
fi

exit 0`} />
        <CodeBlock lang="bash" code={`#!/usr/bin/env bash
# .claude/hooks/pre-bash-firewall.sh
# PreToolUse：exit 2 = 阻断 + stderr 反馈给 Claude

input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // ""')

# 危险模式检测
patterns=("rm -rf /" "git reset --hard" "DROP TABLE" "> /dev/null.*&&.*rm")
for pattern in "\${patterns[@]}"; do
  if echo "$command" | grep -qiE "$pattern"; then
    echo "🚫 危险命令被拦截（匹配：'$pattern'）" >&2
    exit 2
  fi
done

# 保护敏感目录
if echo "$command" | grep -qE "\.(env|env\.local)|migrations/.*\.(sql|ts)"; then
  echo "🚫 禁止通过 Bash 直接操作 .env 或 migrations/ 文件" >&2
  exit 2
fi

exit 0`} />
      </Accordion>

      <h3 className="section-title">Hook 实战：Before / After（鼎新项目）</h3>
      <Accordion title="展开查看：鼎新真实场景 — 没有 Hook vs 有 Hook" accent="var(--coral)">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--coral)' }}>场景：Claude 编辑了一个 Vue 文件</div>
        <div className="card-grid" style={{ marginBottom: 16 }}>
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--coral)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--coral)', marginBottom: 8 }}>❌ 没有 Hook</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              1. Claude 修改了 views/home/index.vue<br />
              2. 直接用了 import axios — 违反禁止事项<br />
              3. Less 嵌套写在了父选择器外，样式错乱<br />
              4. 手动跑 ESLint 才发现两处违规<br />
              5. 回溯已有 3 条消息，定位耗时<br />
              <span style={{ color: 'var(--coral)', fontWeight: 600 }}>代价：20 分钟 debug</span>
            </div>
          </div>
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--teal)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--teal)', marginBottom: 8 }}>✅ 有 PostToolUse Hook</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              1. Claude 修改了 views/home/index.vue<br />
              2. Hook 自动触发 ESLint --fix ✓<br />
              3. axios 直接引用被规则拦截，stderr 报错<br />
              4. Claude 立即改用 apis/request.js<br />
              5. Less 嵌套警告同步修复，继续下一步<br />
              <span style={{ color: 'var(--teal)', fontWeight: 600 }}>代价：0 分钟，自动纠错</span>
            </div>
          </div>
        </div>
        <div style={{ padding: '12px 16px', background: 'var(--blue-bg)', borderRadius: 8, borderLeft: '3px solid var(--blue)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--blue)' }}>关键机制：</strong>Hook 的 stderr 输出会直接反馈给 Claude，形成<strong>自动纠错循环</strong>。<br />
          Claude 不需要你手动指出错误 — Hook 替你做了这一步，而且是每次编辑后都自动执行。
        </div>
      </Accordion>
      </SectionGroup>

      <SectionGroup title="Skills 与文件管理" accent="var(--amber)">
      <h3 className="section-title">Skill 最小模板</h3>
      <Accordion title="展开查看：一个 Skill 的最小可用结构" accent="var(--amber)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 12 }}>
          Skill 放在 <code>.claude/skills/</code> 下，以<strong>文件夹名</strong>作为命令名。例如 <code>.claude/skills/feat/SKILL.md</code> → <code>/feat</code>。
        </div>
        <CodeBlock lang="tree" code={`my-skill/                          ← 文件夹名 = 命令名
│
├── SKILL.md                       ← [必须] Skill 定义（frontmatter + 行为指令）
│
├── references/                    ← [可选] 参考文档，SKILL.md 中 @import 按需读取
│   ├── strategy-a.md              ←     如方案模板、评分细则、Checklist
│   └── strategy-b.md
│
├── scripts/                       ← [可选] 可执行脚本（JS / SH / PY）
│   ├── helper.js                  ←     如数据处理、模板渲染、自动化脚本
│   └── start-server.sh
│
├── examples/                      ← [可选] 示例文件，供 Claude 参考或学习
│   └── sample-output.md
│
└── *.md                           ← [可选] 子 Agent Prompt 或补充文档
    ├── reviewer-prompt.md         ←     如 subagent 的专用 Prompt
    └── implementer-prompt.md`} />
        <CodeBlock lang="markdown" code={`---
name: my-skill
description: 一句话描述这个 Skill 做什么
---

# Skill 正文

这里写 Claude 拿到这个 Skill 后的行为指令。
可以包含步骤、规则、模板、输出格式等。`} />
        <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--teal-bg)', borderRadius: 8, borderLeft: '3px solid var(--teal)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--teal)' }}>Tip：</strong>创建新 Skill 可以用 <code>/skill-creator</code>，它会引导你完成描述、触发词、参数、正文的结构化生成，比手写更快也更规范。
        </div>
      </Accordion>

      <h3 className="section-title">真实 Skill 案例：鼎新项目 /feat</h3>
      <Accordion title="展开查看：鼎新 /feat 完整 Skill（端到端需求交付）" accent="var(--teal)">
        <CodeBlock lang="yaml" code={`---
name: feat
description: |
  端到端需求交付流程，覆盖全生命周期：需求分析 → ADR 方案设计 → 任务拆解 →
  逐任务实现 → 测试用例 → Code Review → 交付确认。
triggers:
  - 新需求 / 新功能 / 实现需求 / 需求交付
  - 分析需求 / 拆分任务 / 写PRD / 写ARD
  - Code Review / CR / 代码审查
  - 写测试用例
invocable: true
arguments:
  - name: requirement
    hint: "<需求描述>"
    required: true
capabilities: [read, write, search, execute]
extensions:
  claude:
    allowed-tools: "Read Write Edit Glob Grep Bash Agent"
---`} />
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)', margin: '12px 0 6px' }}>流程全景</div>
        <CodeBlock lang="plain" code={`P1:需求理解 → P2:ADR方案设计 → P3:任务拆解 → P4:逐任务实现 → P5:测试用例 → P6:Code Review → P7:交付确认
  5W1H         备选方案+推荐       INVEST+可追溯ID    遵循rules/*       金字塔+六维      六维评分+四级严重度   变更清单+验证状态
  In/Out       写入decisions/     写入CURRENT.md      每任务更新状态    AC覆盖矩阵      Critical归零方可合并   文档传导`} />
        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, margin: '8px 0 12px', padding: '10px 14px', background: 'var(--bg2)', borderRadius: 8 }}>
          <strong>设计原则：</strong>SKILL.md 只写框架型判断；完整模板和评分细则放入 <code>references/</code>，按需读取。<br />
          阶段可独立触发：先检查上下文是否有前序产出，有则复用，无则直接执行。
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)', margin: '12px 0 6px' }}>P1：需求理解</div>
        <CodeBlock lang="markdown" code={`目标：5W1H + In/Out Scope + 假设登记册
读取顺序：docs/PRD.md → SPEC.md → ARCHITECTURE.md → DESIGN.md → tasks/CURRENT.md → decisions/ → .claude/rules/

产出：
- 需求概述（一句话）+ PRD 章节归属
- In Scope / Out of Scope 功能边界表格
- 涉及应用/模块/队列/数据表/契约清单
- 假设与风险登记册（编号 + 影响 + 优先级）
- 关键约束（如 SDK 无 Node API、不绕过 GatewayModule）
- 追问清单（≤3 条，有疑问时）

质量门：In/Out Scope 明确，高优先级风险已标记，无疑问时直接进入 P2`} />

        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)', margin: '12px 0 6px' }}>P2：方案设计（ADR）</div>
        <CodeBlock lang="markdown" code={`目标：产出架构决策记录，作为实现契约

文档类型决策树：
├─ 涉及 UI/用户交互 → PRD（references/prd-template.md）
├─ 涉及新接口/数据模型/队列 → ARD（references/ard-template.md）
├─ 涉及架构决策 → ADR（docs/decisions/）
└─ 轻量变更 → 直接更新 docs/SPEC.md，不建独立文档

执行：1~3 个备选方案 → 推荐方案 → 写入 ADR + 更新索引 → 输出摘要请求 Review

质量门：≥1 备选方案被评估，推荐方案符合架构红线，ADR 已写入
⛔ 卡点：须等用户确认 ADR 后才进入 P3`} />

        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--purple)', margin: '12px 0 6px' }}>P3：任务拆解</div>
        <CodeBlock lang="markdown" code={`目标：INVEST 原则 + 垂直切片 + 可追溯 ID 链

可追溯 ID 体系：
REQ-001 → ADR-NNNN → TX.Y.Z（CURRENT.md 任务）→ TC-U01（测试用例）→ CR-C01（CR 问题）

格式：[ ] TX.Y.Z {标题} — {估时}d + 输入/输出/Given-When-Then AC/依赖
粒度：≤1 人日（AI 约 1~2 轮对话），底层先于上层

质量门：每个 Story 可独立交付，每个 Task 有 Given/When/Then AC，依赖显式标注
⛔ 卡点：须等用户确认任务拆解后才进入 P4`} />

        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)', margin: '12px 0 6px' }}>P4：逐任务实现</div>
        <CodeBlock lang="markdown" code={`每任务流程：
1. 切换状态 [ ] → [~]，更新 CURRENT.md
2. 先读后写：理解现有实现模式
3. 编码 + 测试（测试放 <package>/tests/，禁止散落 src/）
4. 本地验证：pnpm typecheck && pnpm lint && pnpm test
5. 自检：对照 .claude/rules/review.md Checklist
6. Demo + 文档传导（用户可感知需求必做）
7. 收尾 [~] → [x] + 日期，更新"当前焦点"

质量门：typecheck/lint/test 全通过，文档已传导
⚠️ 禁止自动 git commit/push`} />

        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)', margin: '12px 0 6px' }}>P5：测试用例设计</div>
        <CodeBlock lang="markdown" code={`测试金字塔：E2E 10% / 集成 30% / 单元 60%

六维用例设计：
- Happy Path：正常输入 → 期望输出
- 边界值：空值/零值/最大最小值
- 异常输入：非法类型/超长/恶意 payload
- 并发/竞态：幂等性/重复提交
- 权限/安全：未授权 401 / 越权 403
- 性能边界：大数据量/高频调用/超时

产出：AC 覆盖矩阵 + 单元/集成/E2E 测试（测试文件在 tests/）
质量门：AC 覆盖 100%，Happy Path + 边界 + 异常三维已覆盖`} />

        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--coral)', margin: '12px 0 6px' }}>P6：Code Review（六维评分）</div>
        <CodeBlock lang="markdown" code={`评分维度（权重）：
- 正确性 25 | 可读性 20 | 可维护性 20 | 安全性 15 | 性能 10 | 测试覆盖 10

严重度：
🔴 Critical（阻塞合并）→ Bug/安全漏洞/数据损坏/架构红线违反
🟠 Major（强烈建议）→ 影响可维护性/性能/扩展性
🟡 Minor（建议）→ 代码质量可后续改进
🔵 Nitpick（可选）→ 风格/习惯问题

速查 🔴：any/空 catch/apps 间 import/硬编码密钥/SQL 注入
速查 🟠：队列名硬编码/N+1/手写类型代替 z.infer<>/测试文件在 src/

评级：≥90 ✅ / 75-89 🟡 / 60-74 🟠 / <60 🔴
质量门：Critical = 0，总分 ≥ 75，每扣分项附 Before/After
⛔ 卡点：有 Critical 时须修复后重审`} />

        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)', margin: '12px 0 6px' }}>P7：交付确认</div>
        <CodeBlock lang="markdown" code={`交付摘要包含：
- 可追溯链路：REQ → ADR → Tasks → TCs → CRs（全部 Closed）
- 变更清单：新增/修改文件 + SPEC/ARCHITECTURE/DESIGN 更新状态
- Demo + docs：场景路径 + 触发方式 + 使用说明落点
- 文档传导：PRD/SPEC/ARCHITECTURE/DESIGN/ADR/CURRENT/GETTING_STARTED/README/CLAUDE
- 验证状态：typecheck / lint / test / SDK 体积预算 | CR：总分 / Critical / Major / 评级`} />
      </Accordion>

      <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--teal-bg)', borderRadius: 8, borderLeft: '3px solid var(--teal)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--teal)' }}>Tip：</strong>上面的 /feat Skill 把「流程」章节的 Step 1→7 编排成了可执行的命令。后面讲完流程后，回过头来看这个 Skill，你会发现：它不只是一个命令，而是把 Prompt 三要素（CAC）、四阶段流程、Reviewer Agent、交付确认串成了一条完整链路。
      </div>

      <h3 className="section-title">.claudeignore 参考</h3>
      <Accordion title="展开查看：不让 Claude 读取的文件清单" accent="var(--blue)">
        <CodeBlock lang="gitignore" code={`# 构建产物
.next/
dist/
build/
out/

# 依赖（体积大且对 Claude 无意义）
node_modules/

# 敏感文件（Hook 也要拦截写入，双重保护）
.env
.env.local
.env.*.local
**/secrets/**

# 生成文件（读了没用，浪费 context）
**/*.generated.ts
**/prisma/migrations/

# 大型静态资源
public/assets/videos/
**/*.mp4
**/*.zip`} />
      </Accordion>

      <h3 className="section-title">docs/prompts.md 维护规则</h3>
      <Accordion title="展开查看：Prompt 片段库的沉淀与清理规则" accent="var(--amber)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong>沉淀触发条件：</strong>某个 Prompt 在一个月内被复用 3 次以上 → 提炼进来
        </div>
        <CodeBlock lang="markdown" code={`### [场景名称]
> 适用时机：[描述什么情况下用]
> 最后更新：YYYY-MM-DD

[Prompt 正文]

## 清理规则
超过 6 个月未使用的条目 → 移入 docs/prompts-archive.md`} />
      </Accordion>
      </SectionGroup>

      <SectionGroup title="高级配置" accent="var(--coral)">
      <h3 className="section-title">多 Agent 策略</h3>
      <Accordion title="展开查看：三种 Agent 模式 + 决策表 + Worktree 并行" accent="var(--coral)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 12 }}>
          <strong>结论先行：</strong>90% 场景用 Single Agent 就够了。只有真正需要并行或外部视角时，才引入 Multi-Agent。
        </div>
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr>
                <th></th>
                <th style={{ color: 'var(--teal)' }}>单 Agent</th>
                <th style={{ color: 'var(--blue)' }}>多 Agent（独立 Session）</th>
                <th style={{ color: 'var(--purple)' }}>多子 Agent（同一 Session）</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['原理', '一个 Claude 全程负责', '多个独立 Claude，各自隔离', '主 Agent 调度子 Agent'],
                ['上下文', '✅ 全局共享，零切换损耗', '❌ 各自独立，需传递上下文', '⚠️ 主 Agent 分发，子 Agent 局部'],
                ['并行能力', '❌ 顺序执行', '✅ 真并行（Worktree）', '⚠️ 有限并行（受限主 Agent）'],
                ['外部视角', '❌ 只有自身视角', '✅ 隔离带来真正的"外部审查"', '⚠️ 共享上下文，隔离度弱'],
                ['典型场景', '需求分析 → 方案 → 拆解 → 实现', 'ADR 审查 · PR 代码审查 · 前后端并行', '批量任务分发（如批量生成测试）'],
                ['实战案例', '从 PRD 到代码全程一人搞定', 'Reviewer Agent 独立 Session 审 PR\nCritic Agent 挑战 ADR 假设', '主 Agent 拆任务 → 子 Agent 逐个执行'],
                ['开销成本', '最低，无协调成本', '高，需手动管理 Session 和上下文', '中等，主 Agent 负担重'],
                ['推荐度', '✅ 90% 场景首选', '⚠️ 需要外部视角或真并行时', '⚠️ 批量重复任务时考虑'],
              ].map(([dim, single, multi, sub]) => (
                <tr key={dim as string}>
                  <td style={{ fontWeight: 600, fontFamily: 'var(--mono)', fontSize: 12, whiteSpace: 'nowrap' }}>{dim}</td>
                  <td style={{ fontSize: 12 }}>{single}</td>
                  <td style={{ fontSize: 12 }}>{multi}</td>
                  <td style={{ fontSize: 12 }}>{sub}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Git Worktree 并行模式：</div>
        <CodeBlock lang="bash" code={`# 前后端并行实现同一功能
git worktree add ../project-frontend feat/avatar-frontend
git worktree add ../project-backend feat/avatar-backend

# 各自启动独立 Claude Code
cd ../project-frontend && claude
cd ../project-backend && claude

# 完成后合并并清理
git worktree remove ../project-frontend`} />
      </Accordion>

      <h3 className="section-title">Extended Thinking 思维档位</h3>
      <ExtendedThinkingCards />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ padding: '12px 16px', borderLeft: '3px solid var(--blue)', borderRadius: '0 8px 8px 0', background: 'var(--blue-bg)', fontSize: 12 }}>
          <strong>省 Token 小技巧：</strong><code>/fast</code> 开启速度模式，简单改动（改文案、重命名、加注释）用它，速度 2.5x
        </div>
        <div style={{ padding: '12px 16px', borderLeft: '3px solid var(--teal)', borderRadius: '0 8px 8px 0', background: 'var(--teal-bg)', fontSize: 12 }}>
          <strong>无头模式（CI）：</strong><code>claude -p &quot;审查安全风险&quot; &lt; src/api/upload.ts</code>
        </div>
      </div>
      </SectionGroup>
    </section>
  )
}
