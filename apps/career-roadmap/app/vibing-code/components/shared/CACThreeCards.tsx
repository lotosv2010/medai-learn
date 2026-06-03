'use client'

export function CACThreeCards() {
  const cards = [
    { letter: 'C', title: 'Context（上下文）', desc: '告诉 AI 现在在哪、有什么约束、现有代码是什么模式', color: 'var(--blue)', bg: 'var(--blue-bg)' },
    { letter: 'A', title: 'Action（动作）', desc: '具体做什么，范围是什么，"优化一下"是无效的', color: 'var(--teal)', bg: 'var(--teal-bg)' },
    { letter: 'C', title: 'Criterion（标准）', desc: '完成的定义是什么，可验证的成功标准', color: 'var(--amber)', bg: 'var(--amber-bg)' },
  ]
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        {cards.map((c) => (
          <div key={c.letter + c.title} style={{ padding: '18px', border: `1px solid ${c.color}`, borderRadius: 10, background: c.bg, textAlign: 'center' }}>
            <div style={{ fontSize: 44, fontFamily: 'var(--serif)', fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.letter}</div>
            <div style={{ fontSize: 13, fontWeight: 600, margin: '8px 0 4px', color: 'var(--text)' }}>{c.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
