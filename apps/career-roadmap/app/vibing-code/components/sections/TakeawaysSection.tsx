'use client'

import { WeeklyFourQuestions } from '../shared/WeeklyFourQuestions'

export function TakeawaysSection({ active }: { active: boolean }) {
  return (
    <section className={`section ${active ? 'active' : ''}`}>
      <h1 className="page-title">总结与收获</h1>
      <p className="page-sub">持续改进，让系统替你记住每一次教训</p>

      <h3 className="section-title">持续改进循环</h3>
      <WeeklyFourQuestions />

      <h3 className="section-title" style={{ marginTop: 40 }}>Vibing Code 的本质</h3>
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { layer: '表层', result: '更准确的代码 + 更少的 token', color: 'var(--blue)' },
            { layer: '中层', result: '减少 AI 协作中的不确定性', color: 'var(--teal)' },
            { layer: '深层', result: '让工程师的时间从「生成」转移到「判断」', color: 'var(--amber)' },
          ].map((item) => (
            <div key={item.layer} style={{ display: 'flex', gap: 18, alignItems: 'flex-start', padding: '16px 20px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg3)' }}>
              <div style={{ fontSize: 40, fontFamily: 'var(--serif)', fontWeight: 700, color: item.color, lineHeight: 1, flexShrink: 0 }}>{item.layer}</div>
              <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7 }}>{item.result}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: '12px 16px', borderLeft: '3px solid var(--blue)', borderRadius: '0 8px 8px 0', background: 'var(--blue-bg)', fontSize: 13, color: 'var(--text)' }}>
          <strong style={{ color: 'var(--blue)' }}>本质：</strong>所有配置和文档的目的，不是为了省 token——而是为了降低 AI 协作的不确定性。三个支柱都在解决同一个问题：AI 的输出不可预测。
        </div>
      </div>
    </section>
  )
}
