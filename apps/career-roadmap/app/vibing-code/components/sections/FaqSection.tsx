'use client'

import { Accordion } from '../shared/Accordion'

export function FaqSection({ active }: { active: boolean }) {
  return (
    <section className={`section ${active ? 'active' : ''}`}>
      <h1 className="page-title">常见问题</h1>
      <p className="page-sub">从社区和团队实践中收集的典型疑问与解答</p>

      <Accordion title="问题一：API Error 400 — tool_description_too_long" accent="var(--coral)">
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--coral)', marginBottom: 12 }}>
            问题现象
          </div>
          <img
            src="/images/q1.png"
            alt="问题截图：API Error 400 tool description too long"
            style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)' }}
          />
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)', marginBottom: 12 }}>
          解答
        </div>

        <div style={{ padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16, fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
          您的 Agent 配置了 <strong style={{ color: 'var(--coral)' }}>120 个工具</strong>，
          导致单次请求体达到 <strong style={{ color: 'var(--coral)' }}>190KB</strong>，超过 Claude 限制。
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
          立即可执行的修复方案（按优先级）
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            {
              num: '1',
              title: '大幅减少工具数量（最有效）',
              items: [
                '把工具从 120 个减少到 15-25 个以内',
                '功能相近的工具请合并',
              ],
              color: 'var(--coral)',
            },
            {
              num: '2',
              title: '缩短每个工具的 description',
              items: [
                '每个 description 控制在 300-600 字符以内',
                '把详细说明移到 input_schema 的 description 字段里',
              ],
              color: 'var(--amber)',
            },
            {
              num: '3',
              title: '使用分层 Agent 架构（推荐长期方案）',
              items: [
                'Supervisor（主管）Agent 只带少量工具',
                '具体任务再调用子 Agent（动态加载工具）',
              ],
              color: 'var(--teal)',
            },
            {
              num: '4',
              title: '临时方案',
              items: [
                '新建一个对话（清空历史）',
                '暂时关闭部分不常用的工具',
              ],
              color: 'var(--text3)',
            },
          ].map((fix) => (
            <div
              key={fix.num}
              style={{
                padding: '14px 16px',
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${fix.color}`,
                borderRadius: 8,
                background: 'var(--bg3)',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: fix.color, marginBottom: 8 }}>
                {fix.num}. {fix.title}
              </div>
              <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12, color: 'var(--text2)', lineHeight: 2 }}>
                {fix.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 20,
            padding: '14px 16px',
            background: 'var(--blue-bg)',
            border: '1px solid var(--blue)',
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)', marginBottom: 10 }}>
            Tips：MCP & Skills 按需开关策略
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 2 }}>
            <div style={{ marginBottom: 8 }}>
              <strong style={{ color: 'var(--text)' }}>MCP 是主要开销</strong> — 每个 MCP server 注册的工具描述会随每次请求发送，少一个 server 省 10-20 个工具体积。
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong style={{ color: 'var(--text)' }}>推荐策略：默认全关，用时再开。</strong>
            </div>
            <div style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              background: 'var(--bg2)',
              padding: '10px 14px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              marginBottom: 10,
              lineHeight: 1.9,
            }}>
              <div><span style={{ color: 'var(--text3)' }}># 禁用</span></div>
              <div>claude mcp disable chrome-devtools</div>
              <div style={{ marginTop: 4 }}><span style={{ color: 'var(--text3)' }}># 需要时启用</span></div>
              <div>claude mcp enable chrome-devtools</div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { scene: '前端调试', tool: 'chrome-devtools' },
                { scene: '数据库', tool: 'postgres' },
                { scene: '浏览器自动化', tool: 'playwright' },
                { scene: '设计稿', tool: 'figma' },
              ].map((s) => (
                <span
                  key={s.tool}
                  style={{
                    padding: '4px 10px',
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    fontSize: 11,
                    color: 'var(--text2)',
                  }}
                >
                  {s.scene} → <span style={{ color: 'var(--blue)', fontFamily: 'var(--mono)' }}>{s.tool}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </Accordion>

      <Accordion title="问题二：如何实时监控 Claude Code 的上下文和资源消耗？" accent="var(--blue)">
        <div style={{ padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 20, fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
          长时间对话后上下文膨胀、响应变慢、费用飙升——需要实时掌握 Claude Code 的运行状态。
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>
          核心监控命令
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {[
            {
              cmd: '/context [all]',
              desc: '以彩色网格可视化当前上下文窗口使用情况',
              details: [
                '显示系统提示、CLAUDE.md、工具定义、对话历史各占多少空间',
                '提供优化建议：上下文过高的工具、内存膨胀、容量警告',
                '加 all 参数展开逐项明细',
              ],
              color: 'var(--teal)',
              icon: '📊',
              images: ['/images/a21.png'],
            },
            {
              cmd: '/usage',
              desc: '查看会话费用、token 用量、计划限制',
              details: [
                'Pro/Max/Team 计划按 skill、subagent、MCP server 分项统计',
                '别名：/cost、/stats',
              ],
              color: 'var(--amber)',
              icon: '💰',
              images: [],
            },
            {
              cmd: '/status',
              desc: '查看版本、模型、账户和连接状态',
              details: [
                '打开 Settings 界面的 Status 标签页',
                '可在 Claude 响应过程中运行，无需等待',
              ],
              color: 'var(--blue)',
              icon: '🔍',
              images: ['/images/a22.png', '/images/a23.png'],
            },
          ].map((item) => (
            <div key={item.cmd}>
              <div
                style={{
                  padding: '14px 16px',
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid ${item.color}`,
                  borderRadius: 8,
                  background: 'var(--bg3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span>{item.icon}</span>
                  <code style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: item.color }}>
                    {item.cmd}
                  </code>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{item.desc}</span>
                </div>
                <ul style={{ paddingLeft: 28, margin: 0, fontSize: 12, color: 'var(--text2)', lineHeight: 2 }}>
                  {item.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
              {item.images.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10, marginBottom: 4 }}>
                  {item.images.map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt={`${item.cmd} 示例截图`}
                      style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>
          上下文管理命令
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            {
              cmd: '/compact [instructions]',
              desc: '通过总结当前对话释放上下文空间',
              hint: '可选传入聚焦指令控制总结方向，如 /compact 保留代码变更细节',
              color: 'var(--purple)',
            },
            {
              cmd: '/clear [name]',
              desc: '开始新对话，清空上下文',
              hint: '之前的对话可通过 /resume 恢复',
              color: 'var(--coral)',
            },
            {
              cmd: '/recap',
              desc: '生成当前会话的单行摘要',
              hint: '适合交接或记录工作进度',
              color: 'var(--text3)',
            },
          ].map((item) => (
            <div
              key={item.cmd}
              style={{
                padding: '12px 16px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--bg3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <code style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: item.color }}>
                  {item.cmd}
                </code>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>{item.desc}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', paddingLeft: 0 }}>{item.hint}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 20,
            padding: '14px 16px',
            background: 'var(--blue-bg)',
            border: '1px solid var(--blue)',
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)', marginBottom: 8 }}>
            实战建议
          </div>
          <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12, color: 'var(--text2)', lineHeight: 2.2 }}>
            <li>上下文超过 <strong>70%</strong> 时主动 <code style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--teal)' }}>/compact</code></li>
            <li>每次大改动前先 <code style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--teal)' }}>/context</code> 确认空间充足</li>
            <li>费用敏感场景用 <code style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--teal)' }}>/usage</code> 定期检查</li>
            <li>长任务中断后用 <code style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--teal)' }}>/recap</code> 快速恢复上下文</li>
          </ul>
        </div>
      </Accordion>
    </section>
  )
}
