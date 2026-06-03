'use client'

export function ExtendedThinkingCards() {
  const tiers = [
    { name: 'DEFAULT', trigger: '无需触发', desc: 'adaptive 模式，自动决定深度', use: '日常编码、简单修改、添加组件', color: 'var(--text3)', borderColor: 'var(--border2)' },
    { name: 'THINK', trigger: 'think:', desc: '多步推理场景', use: '算法设计、接口设计、复杂逻辑', color: 'var(--blue)', borderColor: 'var(--blue)' },
    { name: 'THINK HARD', trigger: 'think hard:', desc: '深度调试', use: '复杂 bug、跨模块重构、性能优化', color: 'var(--amber)', borderColor: 'var(--amber)' },
    { name: 'ULTRATHINK', trigger: 'ultrathink', desc: '系统性深度分析', use: '跨 5+ 文件、安全审查、重大架构决策', color: 'var(--coral)', borderColor: 'var(--coral)' },
  ]
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        {tiers.map((t) => (
          <div key={t.name} style={{ padding: '16px', border: '1px solid var(--border)', borderTop: `3px solid ${t.borderColor}`, borderRadius: 10, background: 'var(--bg3)' }}>
            <div style={{ fontSize: t.name === 'ULTRATHINK' ? 18 : t.name === 'THINK HARD' ? 20 : 24, fontFamily: 'var(--serif)', fontWeight: 700, color: t.color, lineHeight: 1, marginBottom: 8 }}>
              {t.name}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, background: 'var(--bg2)', padding: '2px 8px', borderRadius: 4, color: t.color, display: 'inline-block', marginBottom: 6 }}>
              {t.trigger}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, marginBottom: 3 }}>{t.desc}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.use}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
