'use client'

export function CodeBlock({ lang, code }: { lang: string; code: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)', background: 'var(--bg2)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)' }}>{lang}</span>
      </div>
      <pre style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', fontSize: 12, fontFamily: 'var(--mono)', overflowX: 'auto', lineHeight: 1.7, color: 'var(--text2)', whiteSpace: 'pre' }}>{code}</pre>
    </div>
  )
}
