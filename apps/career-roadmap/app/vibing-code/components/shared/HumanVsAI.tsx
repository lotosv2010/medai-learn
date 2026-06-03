'use client'

export function HumanVsAI() {
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', marginBottom: 14 }}>
        <div style={{ flex: 1, padding: '18px', border: '1px solid var(--teal)', borderRadius: 10, background: 'var(--teal-bg)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)', marginBottom: 12, textAlign: 'center', padding: '6px 0', borderRadius: 6, background: 'rgba(13,148,136,0.12)' }}>
            👤 你来负责（不可外包）
          </div>
          <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[
              ['架构判断', '什么该做，什么不该做，为什么'],
              ['验收标准', "完成的定义是什么（AI 自我验证的依据）"],
              ['方向把控', '整体产品/技术方向是否正确'],
              ['上下文供给', '业务背景、历史决策、团队规范'],
              ['最终决策', '有歧义时你说了算，包括拒绝 Critic 的建议'],
            ].map(([title, desc]) => (
              <li key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, color: 'var(--text2)' }}>
                <span style={{ color: 'var(--teal)', flexShrink: 0 }}>▸</span>
                <span><strong style={{ color: 'var(--text)' }}>{title}</strong> — {desc}</span>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 22, color: 'var(--text3)', padding: '0 4px', flexShrink: 0 }}>×</div>
        <div style={{ flex: 1, padding: '18px', border: '1px solid var(--blue)', borderRadius: 10, background: 'var(--blue-bg)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)', marginBottom: 12, textAlign: 'center', padding: '6px 0', borderRadius: 6, background: 'rgba(37,99,235,0.12)' }}>
            🤖 AI 来负责（效率倍增器）
          </div>
          <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[
              ['代码生成', '把你的判断快速变成代码'],
              ['模式识别', '发现你描述中的模糊点和遗漏'],
              ['知识检索', 'API 用法、最佳实践、边界情况'],
              ['重复劳动', '写测试、写文档、格式化、生成 commit'],
              ['方案探索', '多个技术路径的快速原型'],
            ].map(([title, desc]) => (
              <li key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, color: 'var(--text2)' }}>
                <span style={{ color: 'var(--blue)', flexShrink: 0 }}>▸</span>
                <span><strong style={{ color: 'var(--text)' }}>{title}</strong> — {desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div style={{ padding: '12px 16px', borderLeft: '3px solid var(--blue)', borderRadius: '0 8px 8px 0', background: 'var(--blue-bg)', fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>
        <strong style={{ color: 'var(--blue)' }}>AI 不懂但你懂的：</strong> 业务上下文 · 历史包袱 · 工程权衡 · 团队文化 · 产品直觉 · <strong>风险嗅觉</strong>
        <br /><span style={{ color: 'var(--text3)', fontSize: 12 }}>这些才是 10 年经验的真实价值，也是 AI 唯一的盲区。</span>
      </div>
    </div>
  )
}
