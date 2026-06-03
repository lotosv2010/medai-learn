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
      <div style={{ fontSize: 'clamp(26px, 3.8vw, 46px)', color: 'var(--text2)', marginTop: 6, letterSpacing: 4, fontFamily: 'var(--serif)' }}>最佳实践</div>
      <div style={{ marginTop: 28, maxWidth: 460 }}>
        <div style={{ fontSize: 17, color: 'var(--text2)', fontWeight: 300, lineHeight: 1.7 }}>
          AI 负责生成，工程师负责判断<br />
          <span style={{ color: 'var(--text3)', fontSize: 14 }}>你的 10 年经验，才是真正的护城河</span>
        </div>
      </div>
      <div style={{ marginTop: 40, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
