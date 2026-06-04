'use client'

export function ExtendedThinkingCards() {
  const tiers = [
    { name: 'low', desc: '低推理开销，适合简单任务', use: '改文案、重命名、加注释、格式调整', color: 'var(--text3)', borderColor: 'var(--border2)' },
    { name: 'medium', desc: '平衡成本与智能', use: '常规编码、单文件修改、简单 bug 修复', color: 'var(--blue)', borderColor: 'var(--blue)' },
    { name: 'high', desc: '默认档位，深度推理', use: '算法设计、跨模块重构、复杂逻辑', color: 'var(--teal)', borderColor: 'var(--teal)' },
    { name: 'xhigh', desc: '更强推理，更高 Token 消耗', use: '复杂 bug 调试、安全审查、架构决策', color: 'var(--amber)', borderColor: 'var(--amber)' },
    { name: 'max', desc: '最深推理，无 Token 限制', use: '重大架构决策、跨系统分析（仅当前会话）', color: 'var(--coral)', borderColor: 'var(--coral)' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 10, padding: '8px 12px', background: 'var(--bg2)', borderRadius: 6, borderLeft: '3px solid var(--text3)', fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
        Effort Level 控制 adaptive reasoning 深度 — 模型自动决定每步是否需要深度思考。<br />
        设置方式：<code style={{ fontFamily: 'var(--mono)' }}>/effort high</code>（交互）、<code style={{ fontFamily: 'var(--mono)' }}>--effort high</code>（CLI）、<code style={{ fontFamily: 'var(--mono)' }}>CLAUDE_CODE_EFFORT_LEVEL</code>（环境变量）、<code style={{ fontFamily: 'var(--mono)' }}>effortLevel</code>（settings.json）。<br />
        <code style={{ fontFamily: 'var(--mono)' }}>low</code> ~ <code style={{ fontFamily: 'var(--mono)' }}>xhigh</code> 跨会话持久化；<code style={{ fontFamily: 'var(--mono)' }}>max</code> 和 <code style={{ fontFamily: 'var(--mono)' }}>ultracode</code> 仅当前会话生效。
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        {tiers.map((t) => (
          <div key={t.name} style={{ padding: '16px', border: '1px solid var(--border)', borderTop: `3px solid ${t.borderColor}`, borderRadius: 10, background: 'var(--bg3)' }}>
            <div style={{ fontSize: t.name === 'medium' ? 20 : 24, fontFamily: 'var(--serif)', fontWeight: 700, color: t.color, lineHeight: 1, marginBottom: 8 }}>
              {t.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, marginBottom: 3 }}>{t.desc}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.use}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ padding: '10px 14px', borderLeft: '3px solid var(--coral)', borderRadius: '0 8px 8px 0', background: 'var(--coral-bg, rgba(255,100,80,0.08))', fontSize: 12 }}>
          <strong style={{ color: 'var(--coral)' }}>ultrathink</strong>：在 prompt 中包含 <code style={{ fontFamily: 'var(--mono)' }}>ultrathink</code> 关键词，<br />
          可在该轮对话中触发更深推理，不改变会话 effort 设置。<br />
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>注意：&quot;think&quot;、&quot;think hard&quot; 等其他短语不会被识别为关键词。</span>
        </div>
        <div style={{ padding: '10px 14px', borderLeft: '3px solid var(--purple)', borderRadius: '0 8px 8px 0', background: 'var(--purple-bg, rgba(139,92,246,0.08))', fontSize: 12 }}>
          <strong style={{ color: 'var(--purple)' }}>ultracode</strong>：通过 <code style={{ fontFamily: 'var(--mono)' }}>/effort ultracode</code> 启用，<br />
          以 <code style={{ fontFamily: 'var(--mono)' }}>xhigh</code> 推理 + 动态工作流编排处理实质性任务。<br />
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>仅当前会话生效，非 effort level，而是 Claude Code 的工作流模式。</span>
        </div>
      </div>
    </div>
  )
}
