'use client'

import { useState, useEffect, useCallback } from 'react'
import { HeroSection } from './components/sections/HeroSection'
import { WhySection } from './components/sections/WhySection'
import { Pillar1Section } from './components/sections/Pillar1Section'
import { Pillar2Section } from './components/sections/Pillar2Section'
import { Pillar3Section } from './components/sections/Pillar3Section'
import { TeamSection } from './components/sections/TeamSection'
import { FaqSection } from './components/sections/FaqSection'
import { TakeawaysSection } from './components/sections/TakeawaysSection'

type SectionId = 'hero' | 'why' | 'pillar1' | 'pillar2' | 'pillar3' | 'team' | 'faq' | 'takeaways'

const navItems: { id: SectionId; label: string }[] = [
  { id: 'hero', label: '开始' },
  { id: 'why', label: '超级新人' },
  { id: 'pillar1', label: '配置' },
  { id: 'pillar2', label: '流程' },
  { id: 'pillar3', label: '检查' },
  { id: 'team', label: '团队落地' },
  { id: 'takeaways', label: '总结与收获' },
  { id: 'faq', label: '常见问题' },
]

export default function VibingCodePage() {
  const [active, setActive] = useState<SectionId>('hero')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigate = useCallback((direction: -1 | 1) => {
    setActive((prev) => {
      const idx = navItems.findIndex((item) => item.id === prev)
      const next = idx + direction
      if (next < 0 || next >= navItems.length) return prev
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return navItems[next].id
    })
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') navigate(-1)
      if (e.key === 'ArrowRight') navigate(1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-tag">SHARING · 2026.06</div>
          <h1>Vibing Code<br />实践分享</h1>
        </div>
        <nav className="nav">
          <div className="nav-group">
            <div className="nav-group-label">内容导航</div>
            {navItems.map((item) => (
              <div
                key={item.id}
                className={`nav-item ${active === item.id ? 'active' : ''}`}
                onClick={() => { setActive(item.id); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              >
                <span className="dot" />
                <span style={{ flex: 1 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)', lineHeight: 1.7 }}>
          核心公式<br />
          <span style={{ color: 'var(--teal)', fontFamily: 'var(--mono)', fontSize: 11 }}>
            记忆 + 流程 + 验证
          </span>
        </div>
      </aside>

      <main className="main">
        <HeroSection active={active === 'hero'} />
        <WhySection active={active === 'why'} />
        <Pillar1Section active={active === 'pillar1'} />
        <Pillar2Section active={active === 'pillar2'} />
        <Pillar3Section active={active === 'pillar3'} />
        <TeamSection active={active === 'team'} />
        <TakeawaysSection active={active === 'takeaways'} />
        <FaqSection active={active === 'faq'} />
      </main>

      <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? '✕' : '☰'}
      </button>
    </div>
  )
}
