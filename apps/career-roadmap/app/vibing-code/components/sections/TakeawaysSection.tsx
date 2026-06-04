'use client'

import { WeeklyFourQuestions } from '../shared/WeeklyFourQuestions'

export function TakeawaysSection({ active }: { active: boolean }) {
  return (
    <section className={`section ${active ? 'active' : ''}`}>
      <h1 className="page-title">总结与收获</h1>
      <p className="page-sub">持续改进，让系统替你记住每一次教训</p>

      <h3 className="section-title">持续改进循环</h3>
      <WeeklyFourQuestions />

      <h3 className="section-title" style={{ marginTop: 40 }}>Vibing Code 的本质</h3>
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { layer: '表层', result: '更准确的代码 + 更少的 token', color: 'var(--blue)' },
            { layer: '中层', result: '减少 AI 协作中的不确定性', color: 'var(--teal)' },
            { layer: '深层', result: '让工程师的时间从「生成」转移到「判断」', color: 'var(--amber)' },
          ].map((item) => (
            <div key={item.layer} style={{ display: 'flex', gap: 18, alignItems: 'flex-start', padding: '16px 20px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg3)' }}>
              <div style={{ fontSize: 40, fontFamily: 'var(--serif)', fontWeight: 700, color: item.color, lineHeight: 1, flexShrink: 0 }}>{item.layer}</div>
              <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7 }}>{item.result}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: '12px 16px', borderLeft: '3px solid var(--blue)', borderRadius: '0 8px 8px 0', background: 'var(--blue-bg)', fontSize: 13, color: 'var(--text)' }}>
          <strong style={{ color: 'var(--blue)' }}>本质：</strong>所有配置和文档的目的，不是为了省 token——而是为了降低 AI 协作的不确定性。三个支柱都在解决同一个问题：AI 的输出不可预测。
        </div>
      </div>

      <h3 className="section-title" style={{ marginTop: 40 }}>Vibing Code 会被模型迭代淘汰吗？</h3>
      <div>
        <div className="callout callout-amber" style={{ marginBottom: 16 }}>
          <strong>结论：</strong>操作层的经验会被吸收，判断层的经验不会。
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {[
            {
              label: '会被模型吸收',
              color: 'var(--teal)',
              items: [
                'CLAUDE.md 写法、Hook 脚本、Prompt 模板 — 最佳实践会进入训练数据，未来开箱即用',
                '工具调用、上下文管理、错误恢复 — Agent 框架层会越来越自动化',
                '通用编码规范 — 模型本身就在持续学习社区共识',
              ],
            },
            {
              label: '不会被吸收',
              color: 'var(--coral)',
              items: [
                '业务上下文 — 模型不知道你的项目是药店还是电商，永远需要你输入',
                '团队约定 — 禁止用哪个库、迁移文件放哪里，是组织知识而非通用知识',
                '工程权衡 — 这个改动现在能跑，3 年后维护成本是多少，只有你知道',
                '判断力 — 什么该做、什么不该做，AI 无法替代你做决策',
              ],
            },
          ].map((group) => (
            <div key={group.label} style={{ padding: '14px 18px', border: '1px solid var(--border)', borderLeft: `3px solid ${group.color}`, borderRadius: 8, background: 'var(--bg3)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: group.color, marginBottom: 10 }}>{group.label}</div>
              <ul style={{ paddingLeft: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.items.map((item) => (
                  <li key={item} style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 16px', borderLeft: '3px solid var(--purple)', borderRadius: '0 8px 8px 0', background: 'var(--purple-bg)', fontSize: 13, color: 'var(--text)' }}>
          <strong style={{ color: 'var(--purple)' }}>长期价值：</strong>Vibing Code 的核心不是具体技巧，而是培养「如何向 AI 传递上下文和约束」的思维模式。CLAUDE.md 里「禁止引入新 UI 库」背后的业务决策，模型永远不会自己知道——除非你告诉它。<strong>这个思维模式不会过时。</strong>
        </div>
      </div>
    </section>
  )
}
