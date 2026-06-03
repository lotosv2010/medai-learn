'use client'

export function HeroSection({ active }: { active: boolean }) {
  return (
    <section className={`section section-hero ${active ? 'active' : ''}`} style={{ position: 'relative', overflow: 'hidden', flexDirection: 'column', justifyContent: 'center', paddingLeft: '9%', paddingBottom: 60 }}>
      <div style={{ position: 'absolute', width: 380, height: 380, right: -60, top: -100, background: 'radial-gradient(circle, rgba(37,99,235,0.07), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 280, height: 280, right: 200, bottom: -40, background: 'radial-gradient(circle, rgba(13,148,136,0.05), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', letterSpacing: 3, marginBottom: 28 }}>FRONTEND TEAM · 2026</div>
      <h1 style={{ fontSize: 'clamp(72px, 11vw, 130px)', fontFamily: 'var(--serif)', color: 'var(--text)', lineHeight: 0.9, letterSpacing: 2, fontWeight: 700, margin: 0 }}>
        VIBING<br /><span style={{ color: 'var(--teal)' }}>CODE</span>
      </h1>
      <div style={{ fontSize: 'clamp(26px, 3.8vw, 46px)', color: 'var(--text2)', marginTop: 6, letterSpacing: 4, fontFamily: 'var(--serif)' }}>实践分享</div>
      <div style={{ marginTop: 28, maxWidth: 460 }}>
        <div style={{ fontSize: 17, color: 'var(--text2)', fontWeight: 300, lineHeight: 1.7 }}>
          AI 负责生成，工程师负责判断
        </div>
      </div>
      <div style={{ marginTop: 32, maxWidth: '100%', fontSize: 14, color: 'var(--text3)', lineHeight: 1.8 }}>
        Vibing Code 是一套 AI 协作工程实践——通过<strong style={{ color: 'var(--text2)' }}>配置、流程、检查</strong>三个支柱，让 AI 从「随机生成」变成「可控生产力」。
      </div>
      <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
        {[
          { label: '配置', icon: '⚙', color: 'var(--blue)', bg: 'var(--blue-bg)' },
          { label: '流程', icon: '↻', color: 'var(--teal)', bg: 'var(--teal-bg)' },
          { label: '检查', icon: '✓', color: 'var(--purple)', bg: 'var(--purple-bg)' },
        ].map((p) => (
          <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 8, border: `1px solid ${p.color}`, background: p.bg, fontSize: 13, color: p.color, fontWeight: 500 }}>
            <span style={{ fontSize: 15 }}>{p.icon}</span>
            {p.label}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 28, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-block', padding: '5px 12px', borderRadius: 100, border: '1px solid var(--blue)', color: 'var(--blue)', background: 'var(--blue-bg)', fontSize: 12, fontFamily: 'var(--mono)' }}>Claude Code CLI</span>
        <span style={{ display: 'inline-block', padding: '5px 12px', borderRadius: 100, border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 12, fontFamily: 'var(--mono)' }}>VS Code</span>
        <span style={{ display: 'inline-block', padding: '5px 12px', borderRadius: 100, border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 12, fontFamily: 'var(--mono)' }}>MCP Tools</span>
        <span style={{ display: 'inline-block', padding: '5px 12px', borderRadius: 100, border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 12, fontFamily: 'var(--mono)' }}>Git Worktree</span>
      </div>
      <div style={{ position: 'absolute', bottom: 28, left: 68, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
        ← → 切换页面 · 侧边栏导航
      </div>
    </section>
  )
}
