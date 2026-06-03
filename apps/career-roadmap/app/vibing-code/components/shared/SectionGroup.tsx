'use client'

interface SectionGroupProps {
  title: string
  accent: string
  children: React.ReactNode
}

export function SectionGroup({ title, accent, children }: SectionGroupProps) {
  return (
    <div style={{
      marginBottom: 24,
      borderLeft: `2px solid ${accent}`,
      borderRadius: '0 8px 8px 0',
      paddingLeft: 16,
    }}>
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        color: accent,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: accent,
          flexShrink: 0,
        }} />
        {title}
      </div>
      {children}
    </div>
  )
}
