'use client'

import { useState } from 'react'

export function CompareBlock({ bad, good, badLabel = '❌ 没有上下文', goodLabel = '✅ 有约束有标准' }: {
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
