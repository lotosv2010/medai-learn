'use client'

import { Accordion } from '../shared/Accordion'
import { PollBlock } from '../shared/PollBlock'
import { SkillBars } from '../shared/SkillBars'
import { HumanVsAI } from '../shared/HumanVsAI'
import { SectionGroup } from '../shared/SectionGroup'

export function WhySection({ active }: { active: boolean }) {
  return (
    <section className={`section ${active ? 'active' : ''}`}>
      <h1 className="page-title">你的团队来了一位超级新人</h1>
      <p className="page-sub">他技术能力满分，但对你的业务一无所知</p>

      <div className="callout callout-teal">
        <strong>核心公式：</strong>AI 负责生成，工程师负责判断。你的经验是护城河，不是负担。
      </div>

      <h3 className="section-title">现场互动</h3>
      <PollBlock />

      <h3 className="section-title">AI "超级新人" 能力画像</h3>
      <SkillBars />

      <h3 className="section-title">人机分工边界</h3>
      <HumanVsAI />

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
