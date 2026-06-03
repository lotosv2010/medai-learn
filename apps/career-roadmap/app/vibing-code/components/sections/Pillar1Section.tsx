'use client'

import { Accordion } from '../shared/Accordion'
import { CodeBlock } from '../shared/CodeBlock'
import { CompareBlock } from '../shared/CompareBlock'
import { ExtendedThinkingCards } from '../shared/ExtendedThinkingCards'
import { SectionGroup } from '../shared/SectionGroup'

export function Pillar1Section({ active }: { active: boolean }) {
  return (
    <section className={`section ${active ? 'active' : ''}`}>
      <h1 className="page-title">支柱一：配置即记忆</h1>
      <p className="page-sub">让 AI 每次对话都能立刻进入状态，不需要重复解释项目背景</p>

      <div className="callout callout-teal">
        <strong>核心论点：</strong>CLAUDE.md 是 AI 的&quot;项目记忆&quot;。没有它，每次都要重新介绍项目；有了它，AI 开口就在状态。
      </div>

      <h3 className="section-title">Bad → Good 对比</h3>
      <CompareBlock
        badLabel="❌ 无 CLAUDE.md"
        goodLabel="✅ 有 CLAUDE.md"
        bad={`> 帮我给这个组件加个 loading 状态

// AI 输出：引入了 Material UI 的 CircularProgress
// 问题：项目用的是 shadcn/ui，你还得手动纠正
// 每次都要说"我们用 shadcn"，AI 才能继续`}
        good={`# CLAUDE.md 里写了：
# 禁止引入新 UI 库（已有 shadcn/ui，够用）

> 帮我给这个组件加个 loading 状态

// AI 输出：使用 shadcn/ui 的 Button isLoading prop
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
- 禁止引入新的 UI 库（已有 shadcn/ui，够用）
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

      <h3 className="section-title">真实项目 CLAUDE.md 案例</h3>
      <Accordion title="展开查看：黄金法则实战 — 每行都问'删掉会怎样'" accent="var(--amber)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 12 }}>
          以下是一个真实项目的精简 CLAUDE.md（约 25 行）。每行都是经过黄金法则筛选后的结果。
        </div>
        <CodeBlock lang="markdown" code={`# 项目定位
医疗 AI 助手学习项目，Next.js 15 + Hono + AI SDK。
# → 删掉：Claude 不知道这是什么项目，会给出通用建议而非针对性方案

# 技术栈
- 包管理器：pnpm（禁止 npm/yarn）
# → 删掉：Claude 会用 npm install，破坏 pnpm-lock.yaml
- 前端：Next.js 15 App Router + React 19
# → 删掉：Claude 可能用 Pages Router 的写法（getServerSideProps）
- 后端：Hono + tRPC + Drizzle
# → 删掉：Claude 可能引入 Express，与现有架构冲突

# 命令
- dev: pnpm dev
- typecheck: pnpm typecheck
- test: pnpm test
# → 删掉：Claude 不知道怎么验证，会跳过类型检查

# 禁止事项
- 禁止引入新 UI 库（已有 shadcn/ui）
# → 删掉：Claude 做组件时引入 Ant Design，增加 80KB bundle
- 禁止使用 any 类型
# → 删掉：Claude 偷懒用 any，类型安全形同虚设
- 禁止 @ts-ignore
# → 删掉：Claude 遇到类型错误直接 suppress，问题被隐藏`} />
        <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--amber-bg)', borderRadius: 8, borderLeft: '3px solid var(--amber)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--amber)' }}>关键洞察：</strong>这个 CLAUDE.md 只有 25 行，但每一行都对应一个 Claude 会犯的具体错误。<br />
          不是"越多越好"，而是"每行都有存在的理由"。超过 50 行？说明你在用它代替文档。
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

      <h3 className="section-title">Hook 实战：Before / After</h3>
      <Accordion title="展开查看：一个真实场景 — 没有 Hook vs 有 Hook" accent="var(--coral)">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--coral)' }}>场景：Claude 编辑了一个 TypeScript 文件</div>
        <div className="card-grid" style={{ marginBottom: 16 }}>
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--coral)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--coral)', marginBottom: 8 }}>❌ 没有 Hook</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              1. Claude 写完代码，继续下一步<br />
              2. 代码风格不一致（缩进、引号、分号）<br />
              3. 有一个隐含的类型错误没发现<br />
              4. 30 分钟后跑 typecheck 才发现<br />
              5. 回溯定位到 5 个文件之前的问题<br />
              <span style={{ color: 'var(--coral)', fontWeight: 600 }}>代价：30 分钟 debug</span>
            </div>
          </div>
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--teal)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--teal)', marginBottom: 8 }}>✅ 有 PostToolUse Hook</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              1. Claude 写完代码<br />
              2. Hook 自动触发 prettier 格式化 ✓<br />
              3. Hook 自动跑 typecheck<br />
              4. 类型错误通过 stderr 反馈给 Claude<br />
              5. Claude 立即修复，继续下一步<br />
              <span style={{ color: 'var(--teal)', fontWeight: 600 }}>代价：0 分钟，自动修复</span>
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
      <h3 className="section-title">Skills（Slash Command）模板</h3>
      <Accordion title="展开查看：/feat 和 /cr 的完整模板" accent="var(--teal)">
        <CodeBlock lang="markdown" code={`---
# .claude/skills/feat/SKILL.md
description: 功能开发全流程：Research → Plan → 确认 → Implement → Verify
argument-hint: <任务描述或 FEAT-xxx 编号>
---

执行以下功能开发流程，任务：$ARGUMENTS

**阶段一 Research（只读，不修改任何文件）**
阅读相关文件，了解现有实现模式，识别可复用的代码。

**阶段二 Plan**
输出实现计划：修改文件清单 + 实现步骤 + 验收标准。
等待我确认计划后再进入下一阶段。

**阶段三 Implement**
按确认后的计划实现，每步完成后运行 pnpm typecheck。

**阶段四 Verify**
运行 pnpm test，全部通过后输出变更摘要。
如有 UI 改动，截图说明与设计稿的差异。`} />
        <CodeBlock lang="markdown" code={`---
# .claude/skills/cr/SKILL.md
description: Code Review：输出 Critical / Warning / Suggestion 三级问题报告
argument-hint: <@文件路径 或 改动描述>
---

以 @.claude/agents/reviewer-agent.md 的角色，审查：$ARGUMENTS

按以下维度检查，只读不修改，输出三级报告：
🔴 Critical（必须修复才能合并）
🟡 Warning（强烈建议修复）
🔵 Suggestion（可选优化）

检查维度：安全漏洞、类型缺口、未处理的错误路径、性能风险、可维护性。`} />
      </Accordion>

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
              <tr><th>场景</th><th>策略</th><th>原因</th></tr>
            </thead>
            <tbody>
              {[
                ['需求分析 → 方案 → 拆解', '单 Agent 顺序', '强上下文依赖，切换损耗大'],
                ['ADR 完成后的方案审查', 'Critic Agent（独立 Session）', '需要"外部视角"，隔离有价值'],
                ['实现完成后的代码审查', 'Reviewer Agent（独立 Session）', '只读权限，隔离防止误修改'],
                ['前端 + 后端并行实现', '各自独立 Agent + Worktree', '真正并行，上下文不重叠'],
                ['全程每步都 Critic 监督', '❌ 不推荐', '无收敛条件，陷入分析瘫痪'],
              ].map(([scene, strategy, reason]) => (
                <tr key={scene as string}>
                  <td style={{ fontWeight: 500 }}>{scene}</td>
                  <td style={{ color: (strategy as string).startsWith('❌') ? 'var(--coral)' : 'var(--teal)' }}>{strategy}</td>
                  <td>{reason}</td>
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
