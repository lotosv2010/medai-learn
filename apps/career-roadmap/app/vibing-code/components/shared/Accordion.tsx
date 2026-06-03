'use client'

import { useState } from 'react'

export function Accordion({ title, children, accent = 'var(--teal)' }: {
  title: string
  children: React.ReactNode
  accent?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="accord">
      <div className={`accord-hd ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}
        style={{ borderLeft: open ? `3px solid ${accent}` : '3px solid transparent' }}>
        <span className="accord-title">{title}</span>
        <span className="accord-chevron">▶</span>
      </div>
      {open && <div className="accord-body open">{children}</div>}
    </div>
  )
}
