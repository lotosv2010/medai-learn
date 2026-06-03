'use client'

export function TrapGrid3x3() {
  const traps = [
    { name: 'Context Rot', desc: 'Claude 忘记规则，质量下滑', fix: '→ 立即 /compact 或开新 Session', severity: 'critical' },
    { name: 'Doom Loop', desc: '反复修 bug，越修越多', fix: '→ 停下来，git reset 从头', severity: 'critical' },
    { name: '方向漂移', desc: '实现了很多，但不是想要的', fix: '→ Plan Mode + 人工确认计划', severity: 'warning' },
    { name: '验证缺失', desc: '看起来对，运行时出错', fix: '→ Verification First，给明确验证命令', severity: 'warning' },
    { name: '配置臃肿', desc: 'CLAUDE.md 超过 100 行', fix: '→ 定期清理，详细规范移入 docs/', severity: 'info' },
    { name: '依赖蔓延', desc: 'Agent 悄悄引入新依赖', fix: '→ Hook 拦截 + CLAUDE.md 禁止列表', severity: 'info' },
    { name: '幻觉 API', desc: '调用不存在的函数', fix: '→ 先读文件再写代码；typecheck 捕获', severity: 'info' },
    { name: '分析瘫痪', desc: '多 Agent 互相否定，无进展', fix: '→ Critic 单点介入，工程师拍板', severity: 'info' },
    { name: '过度工程', desc: '简单任务也走完整 7 步', fix: '→ 按实际复杂度决定流程深度', severity: 'info' },
  ]
  const severityColor = (s: string) => s === 'critical' ? 'var(--coral)' : s === 'warning' ? 'var(--amber)' : 'var(--text3)'
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9 }}>
      {traps.map((t) => (
        <div key={t.name} style={{ padding: '13px 15px', border: '1px solid var(--border)', borderLeft: `3px solid ${severityColor(t.severity)}`, borderRadius: 8, background: 'var(--bg3)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: severityColor(t.severity) }}>{t.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', margin: '3px 0' }}>{t.desc}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)' }}>{t.fix}</div>
        </div>
      ))}
    </div>
  )
}
