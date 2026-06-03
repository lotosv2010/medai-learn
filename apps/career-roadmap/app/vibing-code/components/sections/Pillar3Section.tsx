'use client'

import { Accordion } from '../shared/Accordion'
import { CodeBlock } from '../shared/CodeBlock'
import { TrapGrid3x3 } from '../shared/TrapGrid3x3'
import { SectionGroup } from '../shared/SectionGroup'

export function Pillar3Section({ active }: { active: boolean }) {
  return (
    <section className={`section ${active ? 'active' : ''}`}>
      <h1 className="page-title">支柱三：验证即信任</h1>
      <p className="page-sub">没有验证，Vibing 效率全还给 debug</p>

      <div className="callout callout-teal">
        <strong>核心论点：</strong>给 Claude 验证标准，它是最好的 QA；不给，你是唯一的 feedback loop。
      </div>

      <SectionGroup title="验证体系" accent="var(--teal)">
      <h3 className="section-title">验证五层金字塔</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'Level 5：AI Code Review', desc: '/cr 触发 reviewer-agent，PR 前必跑', color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple)' },
          { label: 'Level 4：视觉验证', desc: '截图对比设计稿，UI 改动必须过这关', color: 'var(--amber)', bg: 'var(--amber-bg)', border: 'var(--amber)' },
          { label: 'Level 3：E2E 测试', desc: 'pnpm e2e — 关键用户路径，改动涉及流程必跑', color: 'var(--teal)', bg: 'var(--teal-bg)', border: 'var(--teal)' },
          { label: 'Level 2：单元/集成测试', desc: 'pnpm test — 核心逻辑护城河，新功能必须覆盖', color: 'var(--blue)', bg: 'var(--blue-bg)', border: 'var(--blue)' },
          { label: 'Level 1：类型检查', desc: 'pnpm typecheck — 零成本，每次修改必跑，0 容忍', color: 'var(--coral)', bg: 'var(--coral-bg)', border: 'var(--coral)' },
        ].map((l) => (
          <div key={l.label} style={{
            padding: '12px 16px', borderRadius: 8, background: l.bg,
            borderLeft: `3px solid ${l.border}`, display: 'flex', alignItems: 'center', gap: 14
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--mono)', color: l.color, minWidth: 110 }}>{l.label}</span>
            <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{l.desc}</span>
          </div>
        ))}
      </div>

      <h3 className="section-title">Test-Driven Vibing（推荐）</h3>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="block-title">两段式：先写失败的测试，再写通过的代码</div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1, padding: '14px 16px', border: '1px solid var(--coral)', borderRadius: 8, background: 'var(--coral-bg)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--coral)', marginBottom: 8 }}>第一段：只写测试</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              为功能写单元测试，覆盖：正常路径 / 边界情况 / 错误场景。<br />
              写完后运行 pnpm test，确认测试失败（红灯）。<br />
              暂不实现功能代码。
            </div>
          </div>
          <div style={{ flex: 1, padding: '14px 16px', border: '1px solid var(--teal)', borderRadius: 8, background: 'var(--teal-bg)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--teal)', marginBottom: 8 }}>第二段：让测试通过</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              写最少的代码让上面所有测试通过。<br />
              不多写一行，不提前优化。<br />
              完成后运行 pnpm test，全部通过才算完成。
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--amber)', lineHeight: 1.7 }}>
          这比&quot;写完代码再补测试&quot;更有效：测试失败 → 通过是 Claude 最清晰的自我验证信号；
          而且倒逼你在实现前就想清楚验收标准。
        </div>
      </div>

      </SectionGroup>

      <SectionGroup title="安全护栏" accent="var(--coral)">
      <h3 className="section-title">安全护栏</h3>
      <div className="card-grid">
        <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg3)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>技术强制（Hook）</div>
          <CodeBlock lang="settings.json" code={`{
  "permissions": {
    "deny": [
      "Bash(rm -rf *)",
      "Write(.env*)",
      "Write(**/migrations/**)"
    ]
  }
}`} />
        </div>
        <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg3)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>流程约定</div>
          <ul style={{ paddingLeft: 16, color: 'var(--text2)', fontSize: 13, lineHeight: 1.9 }}>
            <li>AI 绝不操作生产环境</li>
            <li>每个原子任务完成后 git commit</li>
            <li>并行任务用 Git Worktree 隔离</li>
            <li>敏感操作（migration、配置）必须人工确认</li>
          </ul>
        </div>
      </div>

      <h3 className="section-title">定期安全扫描 Prompt</h3>
      <Accordion title="展开查看：每个 Sprint 至少运行一次的安全审查 Prompt" accent="var(--coral)">
        <CodeBlock lang="markdown" code={`# 每个 Sprint 至少一次，由 CI 或手动触发

请审查 @src/api/ 目录，重点检查：
1. 用户输入校验（XSS、SQL 注入、路径遍历、MIME 类型伪造）
2. 身份验证和授权（未保护的路由、越权访问）
3. 敏感信息泄露（日志、错误消息、API 响应中的敏感字段）
4. 依赖安全（pnpm audit 的结果）

只分析，不修改代码，输出风险报告，按严重程度排序。`} />
      </Accordion>

      </SectionGroup>

      <h3 className="section-title">验证实战：红灯 → 绿灯</h3>
      <Accordion title="展开查看：完整的 Test-Driven Vibing 实操过程" accent="var(--teal)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 12 }}>
          场景：实现 AvatarUploader 组件的文件大小限制功能。先写测试（红灯），再写实现（绿灯）。
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '14px 16px', border: '1px solid var(--coral)', borderRadius: 8, background: 'var(--coral-bg)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--coral)', marginBottom: 8 }}>第一段：只写测试（红灯）</div>
            <CodeBlock lang="bash" code={`$ pnpm test

✗ AvatarUploader > 应限制文件大小为 5MB
  → Expected: error message
  → Received: undefined

✗ AvatarUploader > 应支持 JPG/PNG/WebP 格式
  → Expected: accepted types
  → Received: all types accepted

✗ AvatarUploader > 应在上传中显示进度条
  → Expected: progress element
  → Received: null

Tests: 3 failed, 0 passed`} />
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>
              <span style={{ color: 'var(--coral)' }}>✓ 测试失败是预期的。</span>这一步的价值：在写任何实现代码之前，你已经想清楚了验收标准。
            </div>
          </div>
          <div style={{ padding: '14px 16px', border: '1px solid var(--teal)', borderRadius: 8, background: 'var(--teal-bg)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--teal)', marginBottom: 8 }}>第二段：让测试通过（绿灯）</div>
            <CodeBlock lang="bash" code={`$ pnpm test

✓ AvatarUploader > 应限制文件大小为 5MB
✓ AvatarUploader > 应支持 JPG/PNG/WebP 格式
✓ AvatarUploader > 应在上传中显示进度条

Tests: 3 passed, 0 failed`} />
          </div>
          <div style={{ padding: '14px 16px', border: '1px solid var(--blue)', borderRadius: 8, background: 'var(--blue-bg)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', marginBottom: 8 }}>验证三连（铁律）</div>
            <CodeBlock lang="bash" code={`$ pnpm typecheck   ✓ 零类型错误
$ pnpm test        ✓ 3/3 通过
$ pnpm lint        ✓ 零警告`} />
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>
              <strong>任一失败，立即停止，先修复再继续。</strong>堆积失败 = debug 黑洞。
            </div>
          </div>
        </div>
      </Accordion>

      <h3 className="section-title">常见陷阱</h3>
      <TrapGrid3x3 />
    </section>
  )
}
