'use client'

import { WeeklyFourQuestions } from '../shared/WeeklyFourQuestions'

export function TakeawaysSection({ active }: { active: boolean }) {
  return (
    <section className={`section ${active ? 'active' : ''}`}>
      <h1 className="page-title">总结与收获</h1>
      <p className="page-sub">持续改进，让系统替你记住每一次教训</p>

      <h3 className="section-title">持续改进循环</h3>
      <WeeklyFourQuestions />

      <div style={{ marginTop: 40, padding: '40px 32px', background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--border)', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', letterSpacing: 3, marginBottom: 20 }}>TAKEAWAYS</div>
        <h2 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontFamily: 'var(--serif)', color: 'var(--text)', lineHeight: 0.9, letterSpacing: 2, fontWeight: 700, margin: '0 0 24px' }}>
          THREE<br /><span style={{ color: 'var(--teal)' }}>THINGS</span>
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 540, margin: '0 auto', textAlign: 'left' }}>
          {[
            { num: '01', color: 'var(--blue)', title: '验证三连 + 一任务一 Session', desc: '这两个习惯，是今天能带走的最高价值' },
            { num: '02', color: 'var(--teal)', title: 'CLAUDE.md 黄金法则', desc: '删掉这行 Claude 会犯什么错？说得出留，说不出删' },
            { num: '03', color: 'var(--amber)', title: '你的判断力才是护城河', desc: 'AI 负责生成，工程师负责判断。10 年经验不是负担，是杠杆' },
          ].map((t) => (
            <div key={t.num} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 28, color: t.color, flexShrink: 0, lineHeight: 1.2, fontFamily: 'var(--serif)', fontWeight: 700 }}>{t.num}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{t.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 28, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text3)' }}>
          感谢参与 ·{" "}
          <a href="https://docs.anthropic.com/en/docs/claude-code/best-practices" target="_blank" style={{ color: 'var(--teal)', textDecoration: 'none' }}>
            docs.anthropic.com/claude-code ↗
          </a>
        </div>
      </div>
    </section>
  )
}
