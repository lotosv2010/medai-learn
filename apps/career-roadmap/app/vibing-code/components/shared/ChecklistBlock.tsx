'use client'

import { useState } from 'react'

export function ChecklistBlock({ items }: { items: string[] }) {
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
