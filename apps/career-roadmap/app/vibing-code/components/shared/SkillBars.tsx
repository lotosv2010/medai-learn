'use client'

export function SkillBars() {
  const bars = [
    { label: '代码生成能力', level: 10, color: 'var(--teal)' },
    { label: 'API 知识储备', level: 9, color: 'var(--teal)' },
    { label: '业务背景理解', level: 0, color: 'var(--coral)' },
    { label: '历史决策记忆', level: 0, color: 'var(--coral)' },
    { label: '工程权衡判断', level: 3, color: 'var(--amber)' },
  ]
  return (
    <div style={{ padding: '16px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>🤖 AI "超级新人" 能力画像</div>
      {bars.map((b) => (
        <div key={b.label} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: 'var(--text2)' }}>{b.label}</span>
            <span style={{ fontFamily: 'var(--mono)', color: b.color, fontSize: 12 }}>
              {'█'.repeat(b.level)}{'░'.repeat(10 - b.level)} {b.level}x
            </span>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'var(--text)' }}>你的经验 × AI 能力</span>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--blue)', fontWeight: 600 }}>= ?</span>
        </div>
      </div>
    </div>
  )
}
