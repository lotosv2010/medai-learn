'use client'

import { useState } from 'react'

export function PollBlock() {
  const options = [
    { id: 'drift', label: 'AI 经常跑偏，改到一半不知道在做什么', icon: '🔀' },
    { id: 'quality', label: '代码能跑，但质量差，不敢合并', icon: '😬' },
    { id: 'start', label: '不知道从哪里开始，靠感觉写 Prompt', icon: '🤷' },
    { id: 'context', label: 'Session 越来越慢，AI 开始犯低级错误', icon: '📉' },
  ]
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [voted, setVoted] = useState<string | null>(null)
  const total = Object.values(votes).reduce((a, b) => a + b, 0)

  function vote(id: string) {
    if (voted) return
    setVotes(v => ({ ...v, [id]: (v[id] ?? 0) + 1 }))
    setVoted(id)
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
        <strong>现场互动：</strong>你用 AI 写代码时，最大的痛点是哪个？（可以举手）
      </div>
      {options.map(o => {
        const count = votes[o.id] ?? 0
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={o.id} onClick={() => vote(o.id)} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
            marginBottom: 8, border: `1px solid ${voted === o.id ? 'var(--teal)' : 'var(--border)'}`,
            borderRadius: 8, cursor: voted ? 'default' : 'pointer',
            background: voted === o.id ? 'var(--teal-bg)' : 'var(--bg3)',
            transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 18 }}>{o.icon}</span>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text2)' }}>{o.label}</span>
            {voted && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                <div style={{ flex: 1, height: 4, background: 'var(--border2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--teal)', transition: 'width 0.4s' }} />
                </div>
                <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)', minWidth: 28 }}>{pct}%</span>
              </div>
            )}
          </div>
        )
      })}
      {!voted && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>点击选择你的答案</div>}
    </div>
  )
}
