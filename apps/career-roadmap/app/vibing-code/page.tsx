'use client'

import { useState } from 'react'

type SectionId = 'why' | 'pillar1' | 'pillar2' | 'pillar3' | 'team' | 'faq'

const navItems: { id: SectionId; label: string }[] = [
  { id: 'why', label: '为什么：ROI & 痛点' },
  { id: 'pillar1', label: '支柱一：配置即记忆' },
  { id: 'pillar2', label: '支柱二：流程即纪律' },
  { id: 'pillar3', label: '支柱三：验证即信任' },
  { id: 'team', label: '团队推广路线' },
  { id: 'faq', label: '常见问题' },
]

export default function VibingCodePage() {
  const [active, setActive] = useState<SectionId>('why')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-tag">SHARING · 2026.06.06</div>
          <h1>Vibing Code<br />最佳实践</h1>
        </div>
        <nav className="nav">
          <div className="nav-group">
            <div className="nav-group-label">内容导航</div>
            {navItems.map((item) => (
              <div
                key={item.id}
                className={`nav-item ${active === item.id ? 'active' : ''}`}
                onClick={() => { setActive(item.id); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              >
                <span className="dot" />
                <span style={{ flex: 1 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)', lineHeight: 1.7 }}>
          核心公式<br />
          <span style={{ color: 'var(--teal)', fontFamily: 'var(--mono)', fontSize: 11 }}>
            记忆 + 流程 + 验证
          </span>
        </div>
      </aside>

      <main className="main">
        <WhySection active={active === 'why'} />
        <Pillar1Section active={active === 'pillar1'} />
        <Pillar2Section active={active === 'pillar2'} />
        <Pillar3Section active={active === 'pillar3'} />
        <TeamSection active={active === 'team'} />
        <FaqSection active={active === 'faq'} />
      </main>

      <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? '✕' : '☰'}
      </button>
    </div>
  )
}

/* ─── Shared Components ─── */

function Accordion({ title, children, accent = 'var(--teal)' }: {
  title: string
  children: React.ReactNode
  accent?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="accord">
      <div className={`accord-hd ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}
        style={{ borderLeft: open ? `3px solid ${accent}` : '3px solid transparent' }}>
        <span className="accord-title">{title}</span>
        <span className="accord-chevron">▶</span>
      </div>
      {open && <div className="accord-body open">{children}</div>}
    </div>
  )
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)', background: 'var(--bg2)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)' }}>{lang}</span>
      </div>
      <pre style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', fontSize: 12, fontFamily: 'var(--mono)', overflowX: 'auto', lineHeight: 1.7, color: 'var(--text2)', whiteSpace: 'pre' }}>{code}</pre>
    </div>
  )
}

function CompareBlock({ bad, good, badLabel = '❌ 没有上下文', goodLabel = '✅ 有约束有标准' }: {
  bad: string; good: string; badLabel?: string; goodLabel?: string
}) {
  const [tab, setTab] = useState<'bad' | 'good'>('bad')
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {(['bad', 'good'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '9px 0', fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none',
            background: tab === t ? (t === 'bad' ? 'var(--coral-bg)' : 'var(--teal-bg)') : 'var(--bg2)',
            color: tab === t ? (t === 'bad' ? 'var(--coral)' : 'var(--teal)') : 'var(--text3)',
            borderBottom: tab === t ? `2px solid ${t === 'bad' ? 'var(--coral)' : 'var(--teal)'}` : '2px solid transparent',
          }}>
            {t === 'bad' ? badLabel : goodLabel}
          </button>
        ))}
      </div>
      <pre style={{ padding: '14px 16px', fontSize: 12, fontFamily: 'var(--mono)', overflowX: 'auto', lineHeight: 1.7, color: 'var(--text2)', whiteSpace: 'pre-wrap', margin: 0, background: 'var(--bg3)' }}>
        {tab === 'bad' ? bad : good}
      </pre>
    </div>
  )
}

function PollBlock() {
  const options = [
    { id: 'drift', label: 'AI 经常跑偏，改到一半不知道在做什么', icon: '🔀' },
    { id: 'quality', label: '代码能跑，但质量差，不敢合并', icon: '😬' },
    { id: 'start', label: '不知道从哪里开始，靠感觉写 Prompt', icon: '🤷' },
    { id: 'context', label: 'Session 越来越慢，AI 开始犯低级错误', icon: '📉' },
  ]
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [voted, setVoted] = useState<string | null>(null)
  const total = Object.values(votes).reduce((a, b) => a + b, 0)

  function vote(id: string) {
    if (voted) return
    setVotes(v => ({ ...v, [id]: (v[id] ?? 0) + 1 }))
    setVoted(id)
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
        <strong>现场互动：</strong>你用 AI 写代码时，最大的痛点是哪个？（可以举手）
      </div>
      {options.map(o => {
        const count = votes[o.id] ?? 0
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={o.id} onClick={() => vote(o.id)} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
            marginBottom: 8, border: `1px solid ${voted === o.id ? 'var(--teal)' : 'var(--border)'}`,
            borderRadius: 8, cursor: voted ? 'default' : 'pointer',
            background: voted === o.id ? 'var(--teal-bg)' : 'var(--bg3)',
            transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 18 }}>{o.icon}</span>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text2)' }}>{o.label}</span>
            {voted && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                <div style={{ flex: 1, height: 4, background: 'var(--border2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--teal)', transition: 'width 0.4s' }} />
                </div>
                <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)', minWidth: 28 }}>{pct}%</span>
              </div>
            )}
          </div>
        )
      })}
      {!voted && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>点击选择你的答案</div>}
    </div>
  )
}

function ChecklistBlock({ items }: { items: string[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set())
  function toggle(i: number) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }
  return (
    <div style={{ marginBottom: 16 }}>
      {items.map((item, i) => (
        <div key={i} onClick={() => toggle(i)} style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px',
          marginBottom: 6, border: `1px solid ${checked.has(i) ? 'var(--teal)' : 'var(--border)'}`,
          borderRadius: 8, cursor: 'pointer', background: checked.has(i) ? 'var(--teal-bg)' : 'var(--bg3)',
          transition: 'all 0.15s',
        }}>
          <div style={{
            width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${checked.has(i) ? 'var(--teal)' : 'var(--border2)'}`,
            background: checked.has(i) ? 'var(--teal)' : 'transparent', flexShrink: 0, marginTop: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10,
          }}>{checked.has(i) ? '✓' : ''}</div>
          <span style={{ fontSize: 13, color: checked.has(i) ? 'var(--text)' : 'var(--text2)', lineHeight: 1.5 }}>{item}</span>
        </div>
      ))}
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
        已完成 {checked.size} / {items.length}
      </div>
    </div>
  )
}

/* ─── Why Section ─── */

function WhySection({ active }: { active: boolean }) {
  return (
    <section className={`section ${active ? 'active' : ''}`}>
      <h1 className="page-title">为什么要用 Vibing Code？</h1>
      <p className="page-sub">先讲痛点，再讲价值，最后给出框架</p>

      <div className="callout callout-teal">
        <strong>核心公式：</strong>AI 负责生成，工程师负责判断。你的经验是护城河，不是负担。
      </div>

      <h3 className="section-title">现场互动</h3>
      <PollBlock />

      <h3 className="section-title">ROI 感知：一个真实场景</h3>
      <div style={{ marginBottom: 16, padding: '14px 18px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>
          <strong>需求：</strong>给用户资料页加头像上传，支持裁剪预览，本周五上线。
        </div>
        <div className="card-grid">
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--coral)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--coral)', marginBottom: 8 }}>传统方式</div>
            <ul style={{ paddingLeft: 14, color: 'var(--text2)', fontSize: 13, lineHeight: 1.8 }}>
              <li>查文档、写样板代码</li>
              <li>手写测试用例</li>
              <li>反复调试边界情况</li>
              <li>重复性劳动 70%+</li>
            </ul>
            <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--coral)' }}>⏱ 预估 3–4 天</div>
          </div>
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--teal)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--teal)', marginBottom: 8 }}>Vibing Code</div>
            <ul style={{ paddingLeft: 14, color: 'var(--text2)', fontSize: 13, lineHeight: 1.8 }}>
              <li>你定方案 + 验收标准</li>
              <li>AI 生成代码 + 测试</li>
              <li>Hook 自动格式化/检查</li>
              <li>Reviewer Agent 把关</li>
            </ul>
            <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--teal)' }}>⏱ 预估 1–1.5 天</div>
          </div>
        </div>
      </div>

      <h3 className="section-title">ROI 数据参考</h3>
      <div className="card-grid-3">
        {[
          { label: '重复性劳动减少', value: '~60%', sub: '样板代码、测试、文档', color: 'var(--teal)' },
          { label: 'Bug 提前发现率', value: '↑3x', sub: 'Hook 自动检查 + TDV', color: 'var(--blue)' },
          { label: '新人上手周期', value: '−50%', sub: 'CLAUDE.md 沉淀团队规范', color: 'var(--purple)' },
        ].map((d) => (
          <div key={d.label} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg3)', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: d.color, fontFamily: 'var(--mono)' }}>{d.value}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: '6px 0 4px' }}>{d.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{d.sub}</div>
          </div>
        ))}
      </div>

      <h3 className="section-title">三个支柱框架</h3>
      <div className="card-grid-3">
        {[
          { num: '一', title: '配置即记忆', desc: 'CLAUDE.md + Hooks\n让 AI 每次都了解你的项目', color: 'var(--blue)', bg: 'var(--blue-bg)' },
          { num: '二', title: '流程即纪律', desc: 'Research → Plan → Execute\n防止 AI 跑偏的结构化约束', color: 'var(--teal)', bg: 'var(--teal-bg)' },
          { num: '三', title: '验证即信任', desc: 'typecheck + test + review\n给 AI 自我验证的能力', color: 'var(--purple)', bg: 'var(--purple-bg)' },
        ].map((p) => (
          <div key={p.num} style={{ padding: '18px', border: `1px solid ${p.color}`, borderRadius: 10, background: p.bg }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: p.color, marginBottom: 6 }}>支柱 {p.num}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>{p.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{p.desc}</div>
          </div>
        ))}
      </div>

      <h3 className="section-title">工具栈一览</h3>
      <Accordion title="展开查看：必装 + 推荐工具" accent="var(--blue)">
        <div className="callout callout-amber" style={{ marginBottom: 12 }}>
          <strong>原则：</strong>每个工具解决一个具体问题，避免功能重叠。本分享以 Claude Code 为例展开实践。
        </div>
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr><th>工具</th><th>用途</th><th>备注</th></tr>
            </thead>
            <tbody>
              {[
                ['VS Code', '主 IDE', '配合 Claude Code 扩展使用'],
                ['Claude Code CLI', '核心 agent 引擎', 'npm i -g @anthropic-ai/claude-code'],
                ['Claude Code VSCode 扩展', 'IDE 深度集成', '内联操作、diff 视图，与 CLI 互补'],
                ['GitHub CLI (gh)', 'PR / Issue 自动化', '没有它 Claude 只能走 GitHub API，容易触发限速'],
              ].map(([tool, use, note]) => (
                <tr key={tool as string}>
                  <td style={{ fontWeight: 500 }}>{tool}</td>
                  <td>{use}</td>
                  <td style={{ fontSize: 12, color: 'var(--text3)' }}>{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>推荐（按需接入）</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>工具</th><th>用途</th><th>接入方式</th></tr>
            </thead>
            <tbody>
              {[
                ['Playwright MCP', 'UI 自动测试 + 截图验证', 'claude mcp add playwright'],
                ['Figma MCP', '直接读取设计稿', 'claude mcp add figma'],
                ['数据库 MCP', '直接查表结构/数据', 'claude mcp add <db-mcp>'],
                ['Sentry MCP', '生产错误上下文直接喂给 Claude', 'claude mcp add sentry'],
                ['Git Worktree', '多任务并行隔离', '内置于 git，Claude Code 原生支持'],
              ].map(([tool, use, way]) => (
                <tr key={tool as string}>
                  <td style={{ fontWeight: 500 }}>{tool}</td>
                  <td>{use}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>{way}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Accordion>
    </section>
  )
}

/* ─── Pillar1 Section ─── */

function Pillar1Section({ active }: { active: boolean }) {
  return (
    <section className={`section ${active ? 'active' : ''}`}>
      <h1 className="page-title">支柱一：配置即记忆</h1>
      <p className="page-sub">让 AI 每次对话都能立刻进入状态，不需要重复解释项目背景</p>

      <div className="callout callout-teal">
        <strong>核心论点：</strong>CLAUDE.md 是 AI 的"项目记忆"。没有它，每次都要重新介绍项目；有了它，AI 开口就在状态。
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

      <h3 className="section-title">CLAUDE.md vs Hook：规则放哪里？</h3>
      <div className="callout callout-amber">
        <strong>核心区别：</strong>CLAUDE.md 是"建议"，Claude 理解后遵循；Hook 是"法律"，确定性执行，不依赖 AI 理解。
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

      <h3 className="section-title">Hooks 完整配置</h3>
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
    </section>
  )
}

/* ─── Pillar2 Section ─── */

function Pillar2Section({ active }: { active: boolean }) {
  return (
    <section className={`section ${active ? 'active' : ''}`}>
      <h1 className="page-title">支柱二：流程即纪律</h1>
      <p className="page-sub">没有流程，你是唯一的 feedback loop，AI 跑多远你才发现</p>

      <div className="callout callout-teal">
        <strong>核心论点：</strong>复杂任务不能"直接开干"。四阶段流程让 AI 在正确方向上跑，而不是让你在错误方向上追。
      </div>

      <h3 className="section-title">四阶段流程</h3>
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {[
          { step: 'Research', desc: '只读，不改任何文件。了解现有实现，找可复用代码', color: 'var(--blue)', bg: 'var(--blue-bg)' },
          { step: 'Plan', desc: '输出文件清单 + 步骤。等你确认计划后才执行', color: 'var(--teal)', bg: 'var(--teal-bg)' },
          { step: 'Execute', desc: '按确认的计划实现，每步完成后跑 typecheck', color: 'var(--purple)', bg: 'var(--purple-bg)' },
          { step: 'Review', desc: 'Reviewer Agent 只读审查，输出三级问题报告', color: 'var(--amber)', bg: 'var(--amber-bg)' },
        ].map((s, i) => (
          <div key={s.step} style={{ flex: 1, padding: '14px 12px', background: s.bg, borderLeft: i > 0 ? '1px solid var(--border)' : 'none', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: s.color, marginBottom: 4 }}>0{i + 1}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{s.step}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      <h3 className="section-title">Prompt 三要素公式</h3>
      <div className="callout callout-amber">
        <strong>公式：Context（上下文）+ Action（动作）+ Criterion（验收标准）</strong><br />
        10 年工程师的优势：你知道什么上下文是关键的，AI 不知道。
      </div>
      <div className="table-wrap" style={{ marginBottom: 16 }}>
        <table>
          <thead>
            <tr><th>要素</th><th>作用</th><th>常见失误</th></tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 500, color: 'var(--text)' }}>Context</td>
              <td>告诉 AI"现在在哪、有什么约束"</td>
              <td style={{ color: 'var(--coral)' }}>只说做什么，不说项目现状和限制</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500, color: 'var(--text)' }}>Action</td>
              <td>告诉 AI"做什么"</td>
              <td style={{ color: 'var(--coral)' }}>太模糊（"优化一下"）或太宽泛</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500, color: 'var(--text)' }}>Criterion</td>
              <td>告诉 AI"完成的定义是什么"</td>
              <td style={{ color: 'var(--coral)' }}>没有可验证的完成标准</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="section-title">Bad → Good 对比</h3>
      <CompareBlock
        badLabel="❌ 缺少三要素"
        goodLabel="✅ 完整三要素"
        bad={`帮我做一个上传组件

// AI 不知道：
// - 项目用什么 UI 库？
// - 有没有现有的上传实现？
// - 完成的标准是什么？
// 结果：AI 自由发挥，引入新依赖`}
        good={`【Context】
参考 @src/components/FileInput.tsx 的现有上传组件模式，
项目用 shadcn/ui + React Hook Form，没有 Framer Motion。

【Action】
创建支持拖拽 + 点击的 AvatarUploader 组件，
上传前支持图片裁剪预览，有实时进度条。

【Criterion】
- 只用已有 shadcn/ui，不引入新依赖
- 键盘可操作（Tab + Enter/Space）
- 完成后运行 pnpm typecheck && pnpm test`}
      />

      <CompareBlock
        badLabel="❌ 一次喂多个任务"
        goodLabel="✅ 单一任务，标准清晰"
        bad={`帮我做上传组件、修改 ProfilePage、
写测试、更新 API 文档

// 问题：AI 会"全都做"，但每件都做得不够好
// 任何一步出错，整个 session 就乱了`}
        good={`只做 AvatarUploader 组件，不动 ProfilePage。

完成标准：
- 渲染正确 + pnpm typecheck 通过
- 截图符合 @docs/ui-rules.md 设计规范
- 有 data-testid 属性，方便后续 E2E 测试`}
      />

      <h3 className="section-title">完整开发流程：Step 1 → Step 7</h3>

      <Accordion title="Step 1：需求分析（消除歧义，明确边界）" accent="var(--blue)">
        <CodeBlock lang="markdown" code={`请阅读 @docs/product.md 了解产品背景。

我需要实现以下功能：[功能描述]

请：
1. 用自己的话复述你理解的需求（不要照搬原文）
2. 列出你认为需要澄清的问题（按重要性排序）
3. 识别潜在的边界情况和实现风险

暂不写代码，暂不给方案。`} />
      </Accordion>

      <Accordion title="Step 2：ADR 方案设计（技术方案确认）" accent="var(--teal)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 12 }}>
          <strong>触发原则：</strong>有选择就记录；没有选择余地的纯实现，跳过。
        </div>
        <CodeBlock lang="markdown" code={`请阅读 @docs/architecture.md 和 @docs/tech-stack.md。

针对 [功能名称]，请提供技术方案：
1. 推荐方案及理由（为什么这个方案，不是别的）
2. 备选方案及取舍（我放弃了什么）
3. 需要修改的文件清单（越具体越好）
4. 可能影响的现有功能（回归测试范围）
5. 你对这个方案最不确定的一件事

以 ADR 格式输出到 docs/decisions/YYYY-MM-DD-[title].md。
暂不写代码。`} />
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr><th>情况</th><th>是否需要 ADR</th></tr>
            </thead>
            <tbody>
              {[
                ['涉及新的数据模型', '✅ 必须'],
                ['引入新的技术依赖', '✅ 必须'],
                ['修改核心架构或模块边界', '✅ 必须'],
                ['有多种实现路径可选择', '✅ 必须'],
                ['纯 UI 调整、文案修改', '❌ 跳过'],
                ['已有明确实现路径的小功能', '❌ 跳过'],
              ].map(([situation, need]) => (
                <tr key={situation as string}>
                  <td>{situation}</td>
                  <td style={{ color: (need as string).startsWith('✅') ? 'var(--teal)' : 'var(--coral)' }}>{need}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Accordion>

      <Accordion title="Step 2.5：Critic Agent（方案审查，一次性介入）" accent="var(--coral)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 12 }}>
          <strong>触发时机：</strong>ADR 写完后，任务拆解开始前。开新 Session 执行。<br />
          <strong>关键设计：</strong>Critic 只在这一个节点介入，不全程监督。全程监督 = 分析瘫痪。
        </div>
        <CodeBlock lang="markdown" code={`请以 @.claude/agents/critic-agent.md 的角色，审查以下方案：

[粘贴 ADR 核心内容]

输出：
1. 找出 3 个最可能出错的假设
2. 列出被忽略的边界情况
3. 质疑技术选型：有没有更简单的解法？
4. 评估 6 个月后的维护成本

每个反对意见必须附替代方案，输出后等待我决策。`} />
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 12 }}>critic-agent.md 角色模板：</div>
        <CodeBlock lang="markdown" code={`# Critic Agent

你是一个持怀疑态度的高级工程师，任务是挑战方案的合理性。

## 你的视角
- 假设所有乐观估计都会出错
- 偏好最简单能解决问题的方案
- 关注长期维护成本
- 质疑每个"显而易见"的假设

## 输出规范
- 每个反对意见必须附具体的替代方案
- 按风险级别排序（最危险的排第一）
- 语气直接，但不是为了反对而反对
- 输出后等待工程师决策，不自行修改

## 你不做的事
- 不考虑个人喜好
- 不提没有实际风险依据的建议
- 不在工程师拍板后继续争论`} />
      </Accordion>

      <Accordion title="Step 3：任务拆解（原子任务，不超过 200 行改动）" accent="var(--purple)">
        <CodeBlock lang="markdown" code={`基于已确认的方案：[粘贴 ADR 核心内容]

请将实现拆解为独立的子任务，每个任务需要：
- 明确的输入和输出
- 可运行的验收标准（不是"功能正常"，是"运行 X 命令后看到 Y"）
- 不超过 200 行代码改动
- 与其他任务的依赖关系说明

以 Markdown checklist 格式输出，存入 docs/tasks/FEAT-xxx.md。`} />
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 12 }}>产出物示例：</div>
        <CodeBlock lang="markdown" code={`# FEAT-042：用户头像上传

## 依赖顺序
T1 → T2 → T3（顺序执行）；T4 可与 T2/T3 并行

## 任务清单
- [ ] T1：创建 /api/upload 接口（含文件类型/大小/MIME 校验）
- [ ] T2：实现 AvatarUploader 组件（拖拽 + 点击，含进度条）
- [ ] T3：集成到 ProfilePage，替换现有头像展示逻辑
- [ ] T4：Vitest 单测（接口边界）+ Playwright E2E（完整上传流程）

## 验收标准
- 支持 JPG/PNG/WebP，最大 5MB，超限有明确错误提示
- 上传中展示进度，上传完成自动刷新头像
- 键盘可操作，有 aria-label
- 网络中断时有友好提示，支持重试

## 回归范围
- ProfilePage 现有功能不受影响
- 其他使用头像展示的页面正常显示`} />
      </Accordion>

      <Accordion title="Step 4：逐任务实现（标准工作模式）" accent="var(--teal)">
        <CodeBlock lang="bash" code={`# 1. 进入 Plan Mode 先探索
> 请阅读 @src/api/ 了解现有接口结构，暂不修改任何代码

# 2. 确认现状后制定计划
> 我要实现 T1：/api/upload 接口，请给出实现计划

# 3. Ctrl+G 在编辑器里直接修改计划

# 4. 确认计划后退出 Plan Mode，开始执行
> 按计划实现，完成后运行 pnpm typecheck && pnpm test

# 5. 盯着前几步确认方向正确

# 6. 完成后立即 commit
> 请生成 Conventional Commits 格式的 commit message 并提交`} />
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 16 }}>实现 Prompt 三要素完整示例：</div>
        <CodeBlock lang="markdown" code={`【Context — 现在在哪】
参考 @src/components/ImageUploader.tsx 中现有的文件上传组件实现模式。
当前项目使用 React Hook Form + Zod 做表单校验。

【Action — 做什么】
为 ProfilePage 创建 AvatarUploader 组件，支持：
- 拖拽上传和点击上传两种交互
- 图片裁剪预览（上传前确认）
- 实时上传进度条

【Criterion — 完成的定义】
- 只使用已有的 shadcn/ui 组件，不引入新依赖
- 键盘可访问（Tab 聚焦 + Enter/Space 触发）
- 所有交互元素有 data-testid 属性
- 文件超限时展示具体原因
- 完成后运行 pnpm typecheck && pnpm test，零错误`} />
      </Accordion>

      <Accordion title="Step 4.5：Test-Driven Vibing（两段式）" accent="var(--blue)">
        <CodeBlock lang="markdown" code={`# 第一段：只写测试（此时测试应当失败）
为 [功能名] 写单元测试，覆盖：
- 正常路径：[期望的成功场景]
- 边界情况：[临界值、空值、最大值]
- 错误场景：[无效输入、网络失败、权限不足]

写完后运行 pnpm test，确认测试失败（红灯）。
暂不实现功能代码。

---（我确认测试用例正确后）---

# 第二段：让测试通过
写最少的代码让上面所有测试通过。
不多写一行，不提前优化，先让红灯变绿灯。
完成后运行 pnpm test，全部通过才算完成。`} />
      </Accordion>

      <Accordion title="Step 5：测试验证（验证三连）" accent="var(--amber)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong>铁律：任一失败，立即停止，先修复再继续。</strong>堆积失败 = debug 黑洞，越修越乱。
        </div>
        <CodeBlock lang="bash" code={`pnpm typecheck   # 类型检查（最快，先跑，0 容忍）
pnpm test        # 单元/集成测试（核心逻辑护城河）
pnpm lint        # 代码规范（最后跑，不影响功能但影响 CR）`} />
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 12 }}>在 Prompt 里内嵌验证标准：</div>
        <CodeBlock lang="markdown" code={`实现完成后，按顺序执行：
1. pnpm typecheck — 零类型错误才算完成
2. 为新逻辑补写测试（正常路径 + 至少 2 个边界情况）
3. pnpm test — 全部通过
4. 如有 UI 改动，截图并说明与 @docs/ui-rules.md 设计规范的差异

任何一步失败，修复后再继续，不要跳过。`} />
      </Accordion>

      <Accordion title="Step 6：Code Review（Reviewer Agent）" accent="var(--purple)">
        <CodeBlock lang="bash" code={`/cr @src/components/AvatarUploader.tsx @src/api/upload.ts`} />
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 12 }}>或直接写 Prompt：</div>
        <CodeBlock lang="markdown" code={`请以 @.claude/agents/reviewer-agent.md 的角色，审查以下改动：

[文件列表]

重点检查（结合本次改动的风险点）：
- 安全性：文件上传相关的注入/绕过/MIME 伪造风险
- 性能：大文件处理是否有内存泄漏，并发上传是否有竞态
- 可维护性：是否遵循 @docs/coding-style.md
- 边界情况：网络中断、重复提交、用户取消、并发上传

只分析不修改，以 🔴 Critical / 🟡 Warning / 🔵 Suggestion 三级输出。`} />
      </Accordion>

      <Accordion title="Step 7：交付确认" accent="var(--teal)">
        <CodeBlock lang="markdown" code={`# 交付前自检清单
1. pnpm typecheck && pnpm test && pnpm lint — 全部通过
2. 运行回归测试范围（见任务文档中的"回归范围"）
3. 生成 Conventional Commits 格式的 commit message
4. 创建 PR，关联 Issue，填写 PR 模板
5. 更新相关文档（如有 API 变更更新 api-contract.md）

请按照 Conventional Commits 规范生成 commit message：
- 说明为什么这样做，不只是做了什么
- 列出影响范围

然后用 gh 创建 PR，关联 Issue #[编号]。`} />
      </Accordion>

      <h3 className="section-title">流程降级规则</h3>
      <Accordion title="实现中途发现方案根本性错误" accent="var(--coral)">
        <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.7 }}>
          立即停止 → <code style={{ fontFamily: 'var(--mono)' }}>git stash</code> 或丢弃当前改动<br />
          开新 Session 重新做 ADR，<strong>不要在错误方向上继续修补</strong>
        </p>
      </Accordion>
      <Accordion title="测试阶段发现设计缺陷" accent="var(--amber)">
        <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.7 }}>
          <code style={{ fontFamily: 'var(--mono)' }}>git reset</code> 到最近一个干净提交<br />
          不要试图在破损状态上继续堆 Prompt — 越堆越乱
        </p>
      </Accordion>
      <Accordion title="Review 发现 Critical 级别问题" accent="var(--blue)">
        <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.7 }}>
          必须修复后才能进入交付，不接受"下个版本修"<br />
          如果修复涉及架构变更，回到 Plan 阶段
        </p>
      </Accordion>

      <h3 className="section-title">流程缩减原则</h3>
      <div className="card">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 2 }}>
          <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', marginRight: 8 }}>纯 UI 调整</span>直接 Execute，跳过 Research + Plan<br />
          <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', marginRight: 8 }}>小功能无架构决策</span>跳过 ADR<br />
          <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', marginRight: 8 }}>快速原型验证</span>先 Vibe 后 Spec<br />
          <span style={{ color: 'var(--teal)', fontFamily: 'var(--mono)', marginRight: 8 }}>复杂跨模块功能</span>走完整四阶段，不能跳
        </div>
      </div>

      <h3 className="section-title">多 Agent 策略</h3>
      <Accordion title="展开查看：推荐架构 + 决策表 + Worktree 模式" accent="var(--purple)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 12 }}>
          <strong>结论先行：</strong>主流程用单 Agent 顺序执行，在 ADR 后和 PR 前两个关键节点插入专职 Agent。
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>三种 Agent 模式对比：</div>
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 120 }}>维度</th>
                <th>Single Agent</th>
                <th>Multi-Agent / 协作式</th>
                <th>Sub-Agents / 派生与路由式</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>模式特征</td>
                <td>一个 Agent 完成全流程，上下文连贯</td>
                <td>多个独立 Agent 并行工作，各自负责子任务</td>
                <td>主 Agent 调度子 Agent，按需派生、汇总结果</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>上下文</td>
                <td>全程共享，无切换损耗</td>
                <td>各自独立，需显式传递</td>
                <td>主 Agent 持有全局上下文，子 Agent 只看局部</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>优势</td>
                <td>
                  • 简单直接，无协调成本<br/>
                  • 决策连贯，不会矛盾<br/>
                  • 调试容易，单点追踪
                </td>
                <td>
                  • 真正并行，效率最高<br/>
                  • 各自专注，质量更优<br/>
                  • 失败隔离，互不影响
                </td>
                <td>
                  • 按需扩展，资源灵活<br/>
                  • 主控清晰，易于管理<br/>
                  • 子任务可复用
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>劣势</td>
                <td>
                  • 串行执行，效率受限<br/>
                  • 上下文累积易溢出<br/>
                  • 单点失败风险
                </td>
                <td>
                  • 协调复杂，易产生冲突<br/>
                  • 上下文同步困难<br/>
                  • 资源消耗高
                </td>
                <td>
                  • 主 Agent 成为瓶颈<br/>
                  • 子 Agent 视野受限<br/>
                  • 调度逻辑需精心设计
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>典型场景</td>
                <td>
                  • 需求分析 → 方案设计 → 任务拆解<br/>
                  • 小功能全流程（&lt; 200 行）<br/>
                  • 调试排查问题
                </td>
                <td>
                  • 前后端并行开发<br/>
                  • 多个独立模块同时实现<br/>
                  • 大型重构拆分并行
                </td>
                <td>
                  • 代码审查（Reviewer Agent）<br/>
                  • 方案批判（Critic Agent）<br/>
                  • 安全扫描、性能测试等专项任务
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Claude Code 实现</td>
                <td><code>claude</code> 单 Session 全程</td>
                <td><code>git worktree</code> + 多个 <code>claude</code> 进程</td>
                <td><code>claude -p</code> 子进程调用，或 <code>/cr</code> 等内置技能</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, background: 'var(--blue-bg)', padding: '12px 16px', borderRadius: 8, borderLeft: '3px solid var(--blue)' }}>
          <strong>实践建议：</strong>90% 的场景用 Single Agent 就够了。只有在真正需要并行（前后端同时开发）或需要外部视角（Code Review、方案审查）时，才引入 Multi-Agent 或 Sub-Agent。过度使用多 Agent 会增加协调成本，得不偿失。
        </div>
        <CodeBlock lang="plain" code={`单 Agent 顺序执行主流程（保持上下文连贯）
         ↓
    ADR 完成后 → Critic Agent（新 Session，一次性介入）
         ↓
    工程师决策 → 继续或重新 ADR
         ↓
    实现完成后 → Reviewer Agent（新 Session，一次性介入）
         ↓
    工程师决策 → 合并或修复`} />
        <div className="table-wrap" style={{ marginTop: 12 }}>
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
                ['多个独立任务同时推进', '多 Agent + Worktree 隔离', '并行效率，各自完整上下文'],
                ['全程每步都 Critic 监督', '❌ 不推荐', '无收敛条件，陷入分析瘫痪'],
                ['主流程各阶段之间切换', '❌ 不推荐', '上下文损耗大于隔离收益'],
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
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 16 }}>Git Worktree 并行模式：</div>
        <CodeBlock lang="bash" code={`# 场景：前后端并行实现同一功能
git worktree add ../project-frontend feat/avatar-frontend
git worktree add ../project-backend feat/avatar-backend

# 在两个目录各自启动 Claude Code
cd ../project-frontend && claude   # frontend-agent.md 角色
cd ../project-backend && claude    # backend-agent.md 角色

# 各自完成后合并
git worktree remove ../project-frontend
git worktree remove ../project-backend`} />
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 12 }}>reviewer-agent.md 完整模板：</div>
        <CodeBlock lang="markdown" code={`# Reviewer Agent

你是一个只读权限的代码审查员，任务是找出合并前必须处理的问题。

## 权限边界
- 只分析，不修改任何文件
- 不主动运行命令
- 不对业务决策发表意见

## 输出格式
🔴 Critical（必须修复）：[问题] → [建议修复方式]
🟡 Warning（强烈建议修复）：[问题] → [建议修复方式]
🔵 Suggestion（可选优化）：[问题] → [建议修复方式]

## 重点检查维度
1. 安全：输入校验、权限检查、敏感信息泄露、注入风险
2. 类型：类型缺口、any 滥用、未处理的 null/undefined
3. 错误处理：未捕获的异常、被吞掉的错误
4. 性能：不必要的重渲染、内存泄漏、N+1 查询
5. 可维护性：命名清晰度、复杂度、魔法数字

## 输出后
等待工程师决策，不自行修复，不追问。`} />
      </Accordion>

      <h3 className="section-title">提示工程完整示例</h3>
      <Accordion title="展开查看：完整三要素示例 + 探索性 Prompt" accent="var(--teal)">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>完整三要素示例（Modal 堆叠 + 焦点捕获）：</div>
        <CodeBlock lang="markdown" code={`【Context】
参考 @src/components/Modal/ 中现有 Modal 组件的实现模式，
当前使用 Radix UI Primitives + Tailwind，项目中没有 Framer Motion。

【Action】
为 Modal 组件增加"堆叠 (stacked)"和"焦点捕获 (focus trap)"功能：
- 堆叠：多个 Modal 同时打开时，层级正确，关闭顺序为后进先出（LIFO）
- 焦点捕获：Modal 打开时，Tab 焦点锁定在 Modal 内部，不流出

【Criterion】
- 不改变现有 Modal 的 Props 接口（向后兼容）
- 不引入新的 npm 包（Radix 已内置 FocusTrap，直接用）
- 添加 Vitest 测试覆盖堆叠场景（先写测试，后实现）
- 通过 @.claude/rules/review.md 中的无障碍检查标准
- 完成后截图对比现有 Modal 行为，确认视觉无回归`} />
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 16 }}>探索性 Prompt（非精确场景，适合分析/发现）：</div>
        <CodeBlock lang="markdown" code={`这个文件有什么可以改进的地方？（不要修改，只分析）
这段代码有哪些潜在的安全风险？
如果要支持 10 倍流量，现在的架构需要改哪里？
你觉得这个方案最大的风险是什么？`} />
      </Accordion>

      <h3 className="section-title">Claude Code 操作技巧</h3>
      <Accordion title="展开查看：基础 / 上下文 / 工作流进阶技巧 + Extended Thinking + /fast" accent="var(--amber)">
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr><th>#</th><th>技巧</th><th>说明</th></tr>
            </thead>
            <tbody>
              {[
                ['1', '多问题合并一条消息', '相关问题一次提出，避免多轮问答浪费 context'],
                ['2', '出错新起消息纠正', '编辑原消息会清空上下文，永远新起一条'],
                ['3', '临时提问用 /btw', '不影响当前任务上下文，问完 Claude 继续原任务'],
                ['4', '引用文件用 @路径', '比描述位置精准；引用目录要谨慎（会读全部文件）'],
                ['5', '新任务开新 Session', '/new 或 Ctrl+N；避免不相关上下文污染'],
                ['6', '状态栏显示 context 用量', '参考官方 statusline 配置，实时监控'],
              ].map(([n, tip, desc]) => (
                <tr key={n as string}>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--text3)', width: 28 }}>{n}</td>
                  <td style={{ fontWeight: 500 }}>{tip}</td>
                  <td>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr><th>#</th><th>上下文操作</th><th>说明</th></tr>
            </thead>
            <tbody>
              {[
                ['7', '主动压缩 /compact', 'Claude 开始"忘事"时立即压缩，别等到满了'],
                ['8', '离开前先压缩', '去开会/吃饭前 /compact，回来 Claude 仍在状态'],
                ['9', '管道传递数据', 'cat error.log | claude "分析原因，不修改文件"'],
                ['10', '截图直接粘贴', 'UI 问题最快的上下文传递方式，Ctrl+V 粘贴图片'],
              ].map(([n, tip, desc]) => (
                <tr key={n as string}>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--text3)', width: 28 }}>{n}</td>
                  <td style={{ fontWeight: 500 }}>{tip}</td>
                  <td>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr><th>#</th><th>工作流进阶</th><th>说明</th></tr>
            </thead>
            <tbody>
              {[
                ['11', 'Plan Mode 先探索', 'Shift+Tab 两次进入；Ctrl+G 直接编辑生成的计划'],
                ['12', '新任务盯着前几步', '确认方向正确再离开；早发现偏差成本低'],
                ['13', 'Auto Mode 减少打断', 'settings.json 开启，分类器自动处理低风险操作'],
                ['14', 'Git Worktree 并行', 'git worktree add ../feat-xyz，独立分支独立 Agent'],
                ['15', '/permissions 白名单', '安全命令加白名单（如 pnpm lint），免确认提速'],
                ['16', 'Critic/Reviewer 节点介入', '只在 ADR 后和 PR 前，开独立 Session'],
                ['17', '/fast 速度模式', '简单任务用 /fast，速度 2.5x，质量不变'],
                ['18', 'claude -p 无头模式', 'claude -p "prompt" 脚本化调用，适合 CI / 批量'],
              ].map(([n, tip, desc]) => (
                <tr key={n as string}>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--text3)', width: 28 }}>{n}</td>
                  <td style={{ fontWeight: 500 }}>{tip}</td>
                  <td>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Extended Thinking 思维档位：</div>
        <div className="table-wrap" style={{ marginBottom: 12 }}>
          <table>
            <thead>
              <tr><th>档位</th><th>触发方式</th><th>适用场景</th></tr>
            </thead>
            <tbody>
              <tr><td>默认（adaptive）</td><td>无需触发</td><td>日常编码、简单修改</td></tr>
              <tr><td>think</td><td>prompt 前加 think:</td><td>多步推理、算法设计、接口设计</td></tr>
              <tr><td>think hard</td><td>prompt 前加 think hard:</td><td>复杂 bug、跨模块重构、性能优化</td></tr>
              <tr><td>ultrathink</td><td>prompt 前加 ultrathink</td><td>跨 5+ 文件系统性问题、安全审查、架构决策</td></tr>
            </tbody>
          </table>
        </div>
        <CodeBlock lang="bash" code={`# 日常（默认档位）
> 给 Button 组件加一个 loading prop

# 需要多步推理（think hard）
> think hard: 分析当前鉴权架构，提出支持多租户的改造方案

# 深度调试（ultrathink）
> ultrathink: 分析 @src/store/cart.ts 和 @src/api/order.ts 中的并发 bug

# 最强组合：ultrathink + Plan Mode
> ultrathink: 设计从 Pages Router 迁移到 App Router 的完整方案`} />
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 16 }}>/fast 模式：</div>
        <CodeBlock lang="bash" code={`/fast   # 开启（适合：文案修改、注释、变量重命名、简单格式调整）

> 把所有 className 中的 px-4 改成 px-6
> 给这个函数加 JSDoc 注释
> 把这个变量名从 data 改成 userData

/fast   # 再次输入关闭（复杂任务前记得关掉）`} />
      </Accordion>
    </section>
  )
}

/* ─── Pillar3 Section ─── */

function Pillar3Section({ active }: { active: boolean }) {
  return (
    <section className={`section ${active ? 'active' : ''}`}>
      <h1 className="page-title">支柱三：验证即信任</h1>
      <p className="page-sub">没有验证，Vibing 效率全还给 debug</p>

      <div className="callout callout-teal">
        <strong>核心论点：</strong>给 Claude 验证标准，它是最好的 QA；不给，你是唯一的 feedback loop。
      </div>

      <h3 className="section-title">验证五层金字塔</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'Level 5：AI Code Review', desc: '/cr 触发 reviewer-agent，PR 前必跑', color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple)' },
          { label: 'Level 4：视觉验证', desc: '截图对比设计稿，UI 改动必须过这关', color: 'var(--amber)', bg: 'var(--amber-bg)', border: 'var(--amber)' },
          { label: 'Level 3：E2E 测试', desc: 'pnpm e2e — 关键用户路径，改动涉及流程必跑', color: 'var(--teal)', bg: 'var(--teal-bg)', border: 'var(--teal)' },
          { label: 'Level 2：单元/集成测试', desc: 'pnpm test — 核心逻辑护城河，新功能必须覆盖', color: 'var(--blue)', bg: 'var(--blue-bg)', border: 'var(--blue)' },
          { label: 'Level 1：类型检查', desc: 'pnpm typecheck — 零成本，每次修改必跑，0 容忍', color: 'var(--coral)', bg: 'var(--coral-bg)', border: 'var(--coral)' },
        ].map((l) => (
          <div key={l.label} style={{
            padding: '12px 16px', borderRadius: 8, background: l.bg,
            borderLeft: `3px solid ${l.border}`, display: 'flex', alignItems: 'center', gap: 14
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--mono)', color: l.color, minWidth: 110 }}>{l.label}</span>
            <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{l.desc}</span>
          </div>
        ))}
      </div>

      <h3 className="section-title">Test-Driven Vibing（推荐）</h3>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="block-title">两段式：先写失败的测试，再写通过的代码</div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1, padding: '14px 16px', border: '1px solid var(--coral)', borderRadius: 8, background: 'var(--coral-bg)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--coral)', marginBottom: 8 }}>第一段：只写测试</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              为功能写单元测试，覆盖：正常路径 / 边界情况 / 错误场景。<br />
              写完后运行 pnpm test，确认测试失败（红灯）。<br />
              暂不实现功能代码。
            </div>
          </div>
          <div style={{ flex: 1, padding: '14px 16px', border: '1px solid var(--teal)', borderRadius: 8, background: 'var(--teal-bg)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--teal)', marginBottom: 8 }}>第二段：让测试通过</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              写最少的代码让上面所有测试通过。<br />
              不多写一行，不提前优化。<br />
              完成后运行 pnpm test，全部通过才算完成。
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--amber)', lineHeight: 1.7 }}>
          这比"写完代码再补测试"更有效：测试失败 → 通过是 Claude 最清晰的自我验证信号；
          而且倒逼你在实现前就想清楚验收标准。
        </div>
      </div>

      <h3 className="section-title">安全护栏</h3>
      <div className="card-grid">
        <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg3)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>技术强制（Hook）</div>
          <CodeBlock lang="settings.json" code={`{
  "permissions": {
    "deny": [
      "Bash(rm -rf *)",
      "Write(.env*)",
      "Write(**/migrations/**)"
    ]
  }
}`} />
        </div>
        <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg3)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>流程约定</div>
          <ul style={{ paddingLeft: 16, color: 'var(--text2)', fontSize: 13, lineHeight: 1.9 }}>
            <li>AI 绝不操作生产环境</li>
            <li>每个原子任务完成后 git commit</li>
            <li>并行任务用 Git Worktree 隔离</li>
            <li>敏感操作（migration、配置）必须人工确认</li>
          </ul>
        </div>
      </div>

      <h3 className="section-title">定期安全扫描 Prompt</h3>
      <Accordion title="展开查看：每个 Sprint 至少运行一次的安全审查 Prompt" accent="var(--coral)">
        <CodeBlock lang="markdown" code={`# 每个 Sprint 至少一次，由 CI 或手动触发

请审查 @src/api/ 目录，重点检查：
1. 用户输入校验（XSS、SQL 注入、路径遍历、MIME 类型伪造）
2. 身份验证和授权（未保护的路由、越权访问）
3. 敏感信息泄露（日志、错误消息、API 响应中的敏感字段）
4. 依赖安全（pnpm audit 的结果）

只分析，不修改代码，输出风险报告，按严重程度排序。`} />
      </Accordion>

      <h3 className="section-title">上下文管理</h3>
      <Accordion title="展开查看：Context Window 消耗来源 + 劣化信号 + 应对策略" accent="var(--blue)">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>消耗来源（从大到小）：</div>
        <CodeBlock lang="plain" code={`完整文件读取 > 命令输出 > 对话历史 > CLAUDE.md > 单条消息`} />
        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 16 }}>
          实操意义：让 Claude 读整个目录比读单个文件贵得多；命令输出很长时考虑 head -50 截断。
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>劣化信号（出现以下现象说明 context 快满了或已"乱"）：</div>
        <ul style={{ paddingLeft: 18, color: 'var(--text2)', fontSize: 13, lineHeight: 1.9, marginBottom: 16 }}>
          <li>Claude 开始忽略 CLAUDE.md 里的规则</li>
          <li>回答与之前的讨论出现矛盾</li>
          <li>代码质量下滑，开始引入明确禁止的模式</li>
          <li>对同一问题给出不同答案</li>
          <li>开始用"如前所述"但"前面"其实没有说过</li>
        </ul>

        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>四种应对策略：</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { title: '预防', desc: '一任务一 Session\n每个独立任务开新对话', color: 'var(--teal)', bg: 'var(--teal-bg)' },
            { title: '压缩', desc: '/compact\n感觉 Claude 开始"忘事"时主动压缩', color: 'var(--blue)', bg: 'var(--blue-bg)' },
            { title: '重置', desc: '开新 Session + 精确初始化\n一旦"乱了"，不要纠正，直接重开', color: 'var(--amber)', bg: 'var(--amber-bg)' },
            { title: '监控', desc: '状态栏指示器\ncontext 用到 60% 就开始考虑处理', color: 'var(--purple)', bg: 'var(--purple-bg)' },
          ].map((s) => (
            <div key={s.title} style={{ padding: '12px 14px', borderRadius: 8, background: s.bg, borderLeft: `3px solid ${s.color}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: s.color, marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{s.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>高效上下文传递方式：</div>
        <CodeBlock lang="bash" code={`# 精确引用文件（推荐）
@src/components/Button.tsx

# 引用目录（谨慎使用，会读取全部文件）
@src/components/

# 管道输入日志（适合 debug）
cat error.log | claude "分析错误原因，不要修改任何文件"
cat package.json | claude "找出可能的版本冲突"

# 截图粘贴（UI 问题最快）
Ctrl+V 粘贴截图，直接描述问题

# 管道 + 无头模式（CI / 批量处理）
claude -p "审查以下代码的安全风险" < src/api/upload.ts`} />
      </Accordion>

      <h3 className="section-title">常见陷阱</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>陷阱</th><th>症状</th><th>应对</th></tr>
          </thead>
          <tbody>
            <tr><td style={{ fontWeight: 500 }}>Context Rot</td><td>Claude 忘记规则，代码质量下滑</td><td>/compact 或开新 Session</td></tr>
            <tr><td style={{ fontWeight: 500 }}>Doom Loop</td><td>反复修 bug，越修越多</td><td>停下来，git reset 从头</td></tr>
            <tr><td style={{ fontWeight: 500 }}>方向漂移</td><td>做了很多，但不是想要的</td><td>复杂任务必须 Plan Mode</td></tr>
            <tr><td style={{ fontWeight: 500 }}>验证缺失</td><td>代码看起来对，运行时出错</td><td>Verification First</td></tr>
            <tr><td style={{ fontWeight: 500 }}>配置臃肿</td><td>CLAUDE.md 超过 100 行</td><td>定期清理，细节移入 docs/</td></tr>
            <tr><td style={{ fontWeight: 500 }}>幻觉 API</td><td>调用不存在的函数/方法</td><td>先读文件再写；typecheck 捕获</td></tr>
            <tr><td style={{ fontWeight: 500 }}>分析瘫痪</td><td>多 Agent 互相否定，无进展</td><td>Critic 只在一个节点介入</td></tr>
            <tr><td style={{ fontWeight: 500 }}>过度工程</td><td>简单任务也走完整流程</td><td>按实际复杂度决定深度</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* ─── Team Section ─── */

function TeamSection({ active }: { active: boolean }) {
  return (
    <section className={`section ${active ? 'active' : ''}`}>
      <h1 className="page-title">团队推广路线</h1>
      <p className="page-sub">从个人习惯到团队规范，不是一步到位的</p>

      <div className="callout callout-teal">
        <strong>核心观点：</strong>不要试图一次性改变整个团队。从"个人受益"开始，让团队"想要"而不是"被要求"。
      </div>

      <h3 className="section-title">Bad → Good 对比：个人用 vs 团队推</h3>
      <CompareBlock
        badLabel="❌ 个人使用"
        goodLabel="✅ 团队推广"
        bad={`CLAUDE.md 放在本地 ~/.claude/
settings.json 只在自己机器上

// 问题：
// - 换台机器要重新配置
// - 同事接手项目要口头解释规范
// - AI 每次对新同事都是"陌生人"`}
        good={`CLAUDE.md + .claude/settings.json 纳入 git

// 效果：
// - 新同事 clone 后 AI 立刻懂项目规范
// - 团队共享的 Hooks 和 Skills 自动生效
// - 规范迭代有版本历史可追溯`}
      />

      <h3 className="section-title">分阶段上手路线</h3>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { phase: 'Week 1-2', title: '地基', items: ['CLAUDE.md 配置', '新任务开新 Session', '验证三连（typecheck + test + lint）'], color: 'var(--blue)', bg: 'var(--blue-bg)' },
          { phase: 'Week 3-4', title: '结构化', items: ['Plan Mode + ADR', '任务拆解文档', 'Prompt 三要素公式'], color: 'var(--teal)', bg: 'var(--teal-bg)' },
          { phase: 'Month 2', title: '自动化', items: ['Hooks（格式化 + 安全门）', '沉淀第一批 Skills', 'TDV 两段式'], color: 'var(--purple)', bg: 'var(--purple-bg)' },
          { phase: 'Month 3+', title: '规模化', items: ['Critic / Reviewer Agent', 'Git Worktree 并行', 'Extended Thinking'], color: 'var(--amber)', bg: 'var(--amber-bg)' },
        ].map((s) => (
          <div key={s.phase} style={{ flex: '1 1 200px', padding: '14px 16px', border: '1px solid var(--border)', borderLeft: `3px solid ${s.color}`, borderRadius: 10, background: s.bg }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: s.color, marginBottom: 6 }}>{s.phase}</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{s.title}</div>
            <ul style={{ paddingLeft: 14, fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              {s.items.map(i => <li key={i}>{i}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <h3 className="section-title">团队落地检查清单（可交互勾选）</h3>
      <ChecklistBlock items={[
        '已有 CLAUDE.md 并纳入项目仓库',
        '团队成员都能独立运行 pnpm typecheck / test / lint',
        '至少沉淀了 2 个可复用的 Skill 命令（如 /feat、/cr）',
        'Hooks 已配置：编辑后自动格式化 + 危险命令拦截',
        '每个 Sprint 至少一次 AI Code Review 实践',
      ]} />

      <h3 className="section-title">常见阻力与应对话术</h3>
      <Accordion title="展开查看：三种典型阻力及应对" accent="var(--coral)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
          <strong>阻力：</strong>"配置这么麻烦，直接写代码更快。"<br />
          <strong>应对：</strong>"前 3 个项目花 10 分钟写 CLAUDE.md，第 4 个项目 AI 开口就在状态，不用再解释一遍‘我们用 pnpm、用 shadcn、不许引入新库’。"<br /><br />
          <strong>阻力：</strong>"AI 写的代码质量不行。"<br />
          <strong>应对：</strong>"质量不是靠 AI 自觉，是靠你的验收标准。Prompt 里不给标准 = 开盲盒。"<br /><br />
          <strong>阻力：</strong>"走流程太浪费时间。"<br />
          <strong>应对：</strong>"简单任务直接 Execute，不需要走完整流程。只有复杂任务才需要 Plan — 问题是很多人以为简单，其实涉及多个模块。"
        </div>
      </Accordion>

      <h3 className="section-title">核心心法：人机分工</h3>
      <Accordion title="展开查看：你负责什么，AI 负责什么" accent="var(--purple)">
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1, padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>你负责（不可外包给 AI）</div>
            <ul style={{ paddingLeft: 16, color: 'var(--text2)', fontSize: 13, lineHeight: 1.9 }}>
              <li>架构判断 — 什么该做，什么不该做</li>
              <li>验收标准 — 完成的定义是什么</li>
              <li>方向把控 — 整体产品/技术方向</li>
              <li>上下文供给 — 业务背景、历史决策</li>
              <li>最终决策 — 有歧义时你说了算</li>
            </ul>
          </div>
          <div style={{ flex: 1, padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>AI 负责（效率倍增器）</div>
            <ul style={{ paddingLeft: 16, color: 'var(--text2)', fontSize: 13, lineHeight: 1.9 }}>
              <li>代码生成 — 把你的判断快速变成代码</li>
              <li>模式识别 — 发现描述中的模糊点</li>
              <li>知识检索 — API 用法、最佳实践</li>
              <li>重复劳动 — 写测试、文档、格式化</li>
            </ul>
          </div>
        </div>
      </Accordion>

      <h3 className="section-title">工程师的护城河</h3>
      <Accordion title="展开查看：AI 不懂的，但你懂的" accent="var(--amber)">
        <ul style={{ paddingLeft: 18, color: 'var(--text2)', fontSize: 13, lineHeight: 2 }}>
          <li><strong>业务上下文</strong> — 这个功能为什么存在，用户是谁，背后的商业逻辑</li>
          <li><strong>历史包袱</strong> — 这段代码为什么这么奇怪（有原因的，删了会出事）</li>
          <li><strong>工程权衡</strong> — 现在这样做，3 年后维护成本是多少</li>
          <li><strong>团队文化</strong> — 哪些规范是死规矩，哪些可以商量</li>
          <li><strong>产品直觉</strong> — 用户真正需要的是什么，不是他们说的那个</li>
          <li><strong>风险嗅觉</strong> — 哪个改动看起来简单但其实危险</li>
        </ul>
      </Accordion>

      <h3 className="section-title">持续改进循环</h3>
      <div className="card">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 2 }}>
          每周问自己（答案直接更新文档，不要单独记笔记）：<br />
          <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', marginRight: 8 }}>1.</span>这周 Claude 犯了哪些重复性错误？→ 更新 CLAUDE.md / Hook<br />
          <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', marginRight: 8 }}>2.</span>哪些 Prompt 特别有效？→ 提炼成 Skill<br />
          <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', marginRight: 8 }}>3.</span>哪个步骤最耗时、最让我不爽？→ 考虑 Hook 自动化<br />
          <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', marginRight: 8 }}>4.</span>Critic 的反对意见哪些后来被证明是对的？→ 加入规则
        </div>
      </div>
    </section>
  )
}

/* ─── FAQ Section ─── */

function FaqSection({ active }: { active: boolean }) {
  return (
    <section className={`section ${active ? 'active' : ''}`}>
      <h1 className="page-title">常见问题</h1>
      <p className="page-sub">从社区和团队实践中收集的典型疑问与解答</p>

      <div className="callout callout-amber">
        <strong>说明：</strong>以下问题来自实际使用 Claude Code 的团队常见反馈，按关注频率排序。
      </div>

      <Accordion title="Q1：AI 写的代码经常出现'幻觉'，调用不存在的 API 或函数怎么办？" accent="var(--coral)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
          <strong>根因：</strong>AI 在缺乏项目上下文时，会基于训练数据"猜测"API 签名，而不是读取现有代码。<br /><br />
          <strong>解决：</strong>
          <ul style={{ paddingLeft: 18, lineHeight: 1.9 }}>
            <li>Prompt 中明确要求"先读取相关文件再写代码"（<code style={{ fontFamily: 'var(--mono)' }}>请阅读 @src/components/xxx.tsx 了解现有模式</code>）</li>
            <li>每次修改后强制运行 <code style={{ fontFamily: 'var(--mono)' }}>pnpm typecheck</code>，类型错误会立刻暴露幻觉</li>
            <li>在 CLAUDE.md 中写入"新建文件前 ALWAYS 先 Grep 搜索类似实现"</li>
            <li>Hook 脚本在编辑后自动跑类型检查，失败即反馈</li>
          </ul>
        </div>
      </Accordion>

      <Accordion title="Q2：Session 久了 AI 开始犯低级错误、重复劳动，怎么破？" accent="var(--blue)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
          <strong>根因：</strong>Context Window 满了或"劣化"（Context Rot）。一个长而混乱的 Session 输出质量通常低于三个干净的短 Session。<br /><br />
          <strong>解决：</strong>
          <ul style={{ paddingLeft: 18, lineHeight: 1.9 }}>
            <li><strong>预防：</strong>一任务一 Session，独立任务开新对话</li>
            <li><strong>压缩：</strong>感觉 AI 开始"忘事"时，输入 <code style={{ fontFamily: 'var(--mono)' }}>/compact</code> 压缩上下文</li>
            <li><strong>重置：</strong>一旦"乱了"，不要试图纠正，直接开新 Session + <code style={{ fontFamily: 'var(--mono)' }}>@文件</code> 精确引入上下文</li>
            <li><strong>监控：</strong>配置状态栏 context 用量指示器，用到 60% 就考虑处理</li>
          </ul>
        </div>
      </Accordion>

      <Accordion title="Q3：长期用 AI 写代码，会不会导致自己退化、不会写了？" accent="var(--purple)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
          <strong>核心观点：</strong>Vibing Code 不是让 AI 替代你，是让 AI 把你的<strong>判断</strong>变成代码。你退化的风险不在于"写得少"，而在于"想得更少"。<br /><br />
          <strong>防护：</strong>
          <ul style={{ paddingLeft: 18, lineHeight: 1.9 }}>
            <li>你负责：架构判断、验收标准、方向把控、最终决策</li>
            <li>AI 负责：代码生成、知识检索、重复劳动</li>
            <li>复杂算法的核心逻辑仍然需要你先给出思路，AI 负责实现和边界情况补充</li>
            <li>定期手写关键模块（如状态机、复杂 hook），保持手感</li>
          </ul>
        </div>
      </Accordion>

      <Accordion title="Q4：AI 写的代码质量不可控，合并后才发现问题，怎么办？" accent="var(--amber)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
          <strong>根因：</strong>没有给 AI 明确的验收标准，导致"看起来对"但运行时出错。<br /><br />
          <strong>解决：</strong>
          <ul style={{ paddingLeft: 18, lineHeight: 1.9 }}>
            <li>Prompt 必须包含 Criterion："完成的定义是什么"（可验证、可执行）</li>
            <li>Hook 脚本在每次编辑后自动跑 <code style={{ fontFamily: 'var(--mono)' }}>pnpm typecheck</code> + <code style={{ fontFamily: 'var(--mono)' }}>pnpm test</code></li>
            <li>推行 Test-Driven Vibing：先写测试（确认失败），再写代码（让测试通过）</li>
            <li>PR 前强制 /cr Reviewer Agent 审查，输出 Critical / Warning / Suggestion 三级报告</li>
          </ul>
        </div>
      </Accordion>

      <Accordion title="Q5：把代码喂给 AI，会不会泄露公司敏感信息或知识产权？" accent="var(--coral)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
          <strong>现状：</strong>Claude Code CLI 默认使用 Anthropic API，数据用于改进模型（具体以公司合规政策为准）。<br /><br />
          <strong>防护：</strong>
          <ul style={{ paddingLeft: 18, lineHeight: 1.9 }}>
            <li>通过 <code style={{ fontFamily: 'var(--mono)' }}>.claudeignore</code> 排除敏感文件（<code style={{ fontFamily: 'var(--mono)' }}>.env</code>、密钥目录、大型静态资源）</li>
            <li>Hook 脚本强制拦截对 <code style={{ fontFamily: 'var(--mono)' }}>.env*</code> 的读取和写入</li>
            <li>涉及核心算法的代码片段，建议先脱敏再喂给 AI，或只描述需求不给源码</li>
            <li>遵循公司数据安全政策，不确定时咨询安全团队</li>
          </ul>
        </div>
      </Accordion>

      <Accordion title="Q6：团队成员习惯不同，AI 规范难以统一，新人上手慢？" accent="var(--teal)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
          <strong>解决：</strong>把"个人习惯"变成"项目基础设施"。<br /><br />
          <ul style={{ paddingLeft: 18, lineHeight: 1.9 }}>
            <li><code style={{ fontFamily: 'var(--mono)' }}>CLAUDE.md</code> + <code style={{ fontFamily: 'var(--mono)' }}>.claude/settings.json</code> 纳入 git，clone 后 AI 立刻懂项目规范</li>
            <li>共享 Skills（<code style={{ fontFamily: 'var(--mono)' }}>/feat</code>、<code style={{ fontFamily: 'var(--mono)' }}>/cr</code>）和 Hooks（自动格式化、安全拦截）团队共用</li>
            <li>docs/ 目录存放 <code style={{ fontFamily: 'var(--mono)' }}>coding-style.md</code>、<code style={{ fontFamily: 'var(--mono)' }}>architecture.md</code>、<code style={{ fontFamily: 'var(--mono)' }}>team.md</code>，作为 AI 的"长期记忆"</li>
            <li>新人上手路线：Week 1 只做三件事（CLAUDE.md + 新 Session + 验证三连）</li>
          </ul>
        </div>
      </Accordion>

      <Accordion title="Q7：调试 AI 写的代码比自己写还费劲，怎么办？" accent="var(--blue)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
          <strong>根因：</strong>一次给了太多任务，或没有验证标准，导致错误在多个环节堆积。<br /><br />
          <strong>解决：</strong>
          <ul style={{ paddingLeft: 18, lineHeight: 1.9 }}>
            <li>原子任务原则：每个任务改动不超过 200 行，完成后立即 <code style={{ fontFamily: 'var(--mono)' }}>git commit</code></li>
            <li>验证三连：typecheck → test → lint，任一失败立即停止修复</li>
            <li>发现根本性错误时，<code style={{ fontFamily: 'var(--mono)' }}>git stash</code> 或丢弃当前改动，开新 Session 重来</li>
            <li>避免在破损状态上"堆 Prompt"——越堆越乱，重开更快</li>
          </ul>
        </div>
      </Accordion>

      <Accordion title="Q8：Token 费用高吗？公司能承担吗？" accent="var(--amber)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
          <strong>实际情况：</strong>Claude Code 使用 Anthropic API 计费，按 token 用量收费。对于工程团队来说，成本通常远低于节省的人力时间。<br /><br />
          <strong>省钱技巧：</strong>
          <ul style={{ paddingLeft: 18, lineHeight: 1.9 }}>
            <li>简单任务（文案修改、变量重命名、格式调整）用 <code style={{ fontFamily: 'var(--mono)' }}>/fast</code> 模式，速度提升且不增加额外成本</li>
            <li>小任务开短 Session，避免无关上下文占用 token</li>
            <li>用 <code style={{ fontFamily: 'var(--mono)' }}>@文件</code> 精确引用，而不是让 AI 读整个目录</li>
            <li>定期 <code style={{ fontFamily: 'var(--mono)' }}>/compact</code>，压缩对话历史</li>
          </ul>
        </div>
      </Accordion>

      <Accordion title="Q9：AI 生成的代码有版权或知识产权风险吗？" accent="var(--purple)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
          <strong>建议：</strong>遵循公司知识产权和开源合规政策。<br /><br />
          <ul style={{ paddingLeft: 18, lineHeight: 1.9 }}>
            <li>AI 生成的代码通常不受传统版权保护，但训练数据可能包含开源代码（存在许可证污染风险）</li>
            <li>核心商业逻辑建议工程师主导设计，AI 辅助实现细节</li>
            <li>对 AI 生成的代码进行审查和调整，确保不直接复制受版权保护的代码片段</li>
            <li>涉及开源许可证时（如 GPL），务必人工确认合规性</li>
          </ul>
        </div>
      </Accordion>

      <Accordion title="Q10：为什么有时候 AI 完全不听 CLAUDE.md 里的规则？" accent="var(--coral)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
          <strong>根因：</strong>Context Rot（上下文劣化）或 CLAUDE.md 本身不够精简，关键指令被稀释。<br /><br />
          <strong>解决：</strong>
          <ul style={{ paddingLeft: 18, lineHeight: 1.9 }}>
            <li>CLAUDE.md 控制在 50 行以内，每条规则都问"删掉这行，Claude 会犯什么具体错误？"</li>
            <li>能用 Hook 强制执行的规则，不要只写在 CLAUDE.md 里（如禁止写 <code style={{ fontFamily: 'var(--mono)' }}>.env</code> 用 PreToolUse Hook 拦截）</li>
            <li>出现劣化信号时，立即 <code style={{ fontFamily: 'var(--mono)' }}>/compact</code> 或开新 Session</li>
            <li>将详细规范移入 <code style={{ fontFamily: 'var(--mono)' }}>docs/</code> 下的独立文件，CLAUDE.md 只保留"最高优先级"规则</li>
          </ul>
        </div>
      </Accordion>

      <div className="callout callout-teal" style={{ marginTop: 24 }}>
        <strong>还有其他问题？</strong><br />
        Vibing Code 的实践是持续演进的。遇到新问题，先记录症状和根因，再决定是更新 CLAUDE.md、增加 Hook，还是沉淀为新的 Skill。
      </div>
    </section>
  )
}
