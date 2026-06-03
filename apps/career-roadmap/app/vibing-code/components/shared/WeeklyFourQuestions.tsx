'use client'

export function WeeklyFourQuestions() {
  const questions = [
    { num: '01', color: 'var(--blue)', q: '这周 Claude 犯了哪些重复性错误？', action: '→ 更新 CLAUDE.md / Hook 脚本，下次系统性避免' },
    { num: '02', color: 'var(--teal)', q: '哪些 Prompt 特别有效？', action: '→ 提炼成 Skill，放入 .claude/skills/，下次用 /命令 调用' },
    { num: '03', color: 'var(--amber)', q: '哪个步骤最耗时、最让人不爽？', action: '→ 考虑用 Hook 或 Agent 自动化掉它' },
    { num: '04', color: 'var(--text3)', q: 'Critic Agent 的反对意见哪些后来证明是对的？', action: '→ 提炼成规则，加入 CLAUDE.md 或 rules/architecture.md' },
  ]
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {questions.map((item) => (
          <div key={item.num} style={{ display: 'flex', gap: 18, alignItems: 'flex-start', padding: '16px 20px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 40, fontFamily: 'var(--serif)', fontWeight: 700, color: item.color, lineHeight: 1, flexShrink: 0 }}>{item.num}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3, color: 'var(--text)' }}>{item.q}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{item.action}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, padding: '12px 16px', borderLeft: '3px solid var(--blue)', borderRadius: '0 8px 8px 0', background: 'var(--blue-bg)', fontSize: 13, color: 'var(--text)' }}>
        <strong style={{ color: 'var(--blue)' }}>核心循环：</strong>发现问题 → 系统化 → 写入配置 → 下次自动规避。你的 CLAUDE.md 是团队每周学习的沉淀，不是一次性配置文件。
      </div>
    </div>
  )
}
