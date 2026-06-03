'use client'

import { Accordion } from '../shared/Accordion'
import { CompareBlock } from '../shared/CompareBlock'
import { ChecklistBlock } from '../shared/ChecklistBlock'

export function TeamSection({ active }: { active: boolean }) {
  return (
    <section className={`section ${active ? 'active' : ''}`}>
      <h1 className="page-title">团队落地</h1>
      <p className="page-sub">从个人习惯到团队规范，不是一步到位的</p>

      <div className="callout callout-teal">
        <strong>核心观点：</strong>不要试图一次性改变整个团队。从&quot;个人受益&quot;开始，让团队&quot;想要&quot;而不是&quot;被要求&quot;。
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          { phase: '阶段一', badge: '地基', items: ['配置好 CLAUDE.md（50 行以内）', '新任务开新 Session（建立肌肉记忆）', '验证三连：typecheck → test → lint'], goal: '目标：养成 Verification First 的习惯', color: 'var(--blue)', bg: 'var(--blue-bg)', borderColor: 'var(--blue)' },
          { phase: '阶段二', badge: '结构化', items: ['Plan Mode + ADR 流程', '任务拆解文档（FEAT-xxx.md）', 'Critic Agent 在方案后单点介入'], goal: '目标：复杂任务不再"直接开干"', color: 'var(--teal)', bg: 'var(--teal-bg)', borderColor: 'var(--teal)' },
          { phase: '阶段三', badge: '自动化', items: ['Hooks（formatter + 安全门）', '沉淀第一批 Skills（/feat /cr）', '团队共享 .claude/settings.json'], goal: '目标：重复错误被系统拦截，不靠记忆', color: 'var(--amber)', bg: 'var(--amber-bg)', borderColor: 'var(--amber)' },
          { phase: '阶段四', badge: '规模化', items: ['Reviewer Agent + Worktree 并行', 'Extended Thinking 按场景选档位', 'CI 集成 claude -p 无头模式'], goal: '目标：专注判断和方向，把执行交给系统', color: 'var(--text3)', bg: 'var(--bg2)', borderColor: 'var(--text3)' },
        ].map((s) => (
          <div key={s.phase} style={{ padding: '18px', border: '1px solid var(--border)', borderTop: `3px solid ${s.borderColor}`, borderRadius: 10, background: s.bg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 26, fontFamily: 'var(--serif)', fontWeight: 700, color: s.color }}>{s.phase}</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: s.color, background: 'rgba(255,255,255,0.5)', padding: '2px 8px', borderRadius: 100 }}>
                {s.badge}
              </span>
            </div>
            <ul style={{ paddingLeft: 16, fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
              {s.items.map(i => <li key={i}>{i}</li>)}
            </ul>
            <div style={{ marginTop: 10, padding: '8px 12px', borderLeft: `2px solid ${s.borderColor}`, background: 'var(--bg3)', borderRadius: '0 6px 6px 0', fontSize: 12, color: 'var(--text)' }}>
              {s.goal}
            </div>
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
          <strong>阻力：</strong>&quot;配置这么麻烦，直接写代码更快。&quot;<br />
          <strong>应对：</strong>&quot;前 3 个项目花 10 分钟写 CLAUDE.md，第 4 个项目 AI 开口就在状态，不用再解释一遍'我们用 pnpm、用 antd、不许引入新库'。&quot;<br /><br />
          <strong>阻力：</strong>&quot;AI 写的代码质量不行。&quot;<br />
          <strong>应对：</strong>&quot;质量不是靠 AI 自觉，是靠你的验收标准。Prompt 里不给标准 = 开盲盒。&quot;<br /><br />
          <strong>阻力：</strong>&quot;走流程太浪费时间。&quot;<br />
          <strong>应对：</strong>&quot;简单任务直接 Execute，不需要走完整流程。只有复杂任务才需要 Plan — 问题是很多人以为简单，其实涉及多个模块。&quot;
        </div>
      </Accordion>

    </section>
  )
}
