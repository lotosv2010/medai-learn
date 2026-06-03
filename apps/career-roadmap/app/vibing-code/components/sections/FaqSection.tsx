'use client'

import { Accordion } from '../shared/Accordion'
import { ImageLightbox } from '../shared/ImageLightbox'
import { SectionGroup } from '../shared/SectionGroup'

export function FaqSection({ active }: { active: boolean }) {
  return (
    <section className={`section ${active ? 'active' : ''}`}>
      <h1 className="page-title">常见问题</h1>
      <p className="page-sub">从社区和团队实践中收集的典型疑问与解答</p>

      <Accordion title="问题一：API Error 400 — tool_description_too_long" accent="var(--coral)">
        <div className="callout callout-coral" style={{ marginBottom: 16 }}>
          <strong>现象：</strong>Agent 配置了 <strong>120 个工具</strong>，单次请求体达到 <strong>190KB</strong>，超过 Claude 限制，返回 400 错误。
        </div>

        <div style={{ marginBottom: 16 }}>
          <ImageLightbox
            src="/images/q1.png"
            alt="问题截图：API Error 400 tool description too long"
            style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)' }}
          />
        </div>

        <h3 className="section-title">修复方案（按优先级）</h3>
        <div className="card-grid">
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--coral)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--coral)', marginBottom: 4 }}>01</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>大幅减少工具数量</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              从 120 个减到 <strong>15–25 个</strong>以内。功能相近的工具合并，不常用的移除。
            </div>
          </div>
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--amber)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--amber)', marginBottom: 4 }}>02</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>缩短工具描述</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              每个 description 控制在 <strong>300–600 字符</strong>。详细说明移到 <code>input_schema</code> 的 description 字段。
            </div>
          </div>
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--teal)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--teal)', marginBottom: 4 }}>03</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>分层 Agent 架构</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              Supervisor Agent 只带少量工具，具体任务调用子 Agent 动态加载。<strong>推荐长期方案。</strong>
            </div>
          </div>
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--text3)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)', marginBottom: 4 }}>04</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>临时止血</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              新建对话清空历史，暂时关闭不常用的 MCP server。
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 16px', background: 'var(--blue-bg)', borderRadius: 8, borderLeft: '3px solid var(--blue)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, marginTop: 16 }}>
          <strong style={{ color: 'var(--blue)' }}>MCP 按需开关：</strong>MCP 是主要开销 — 每个 server 注册的工具描述随每次请求发送，少一个 server 省 10–20 个工具体积。推荐<strong>默认全关，用时再开</strong>：<code>claude mcp disable chrome-devtools</code> / <code>claude mcp enable chrome-devtools</code>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          <ImageLightbox src="/images/a21.png" alt="MCP 按需开关示例 1" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
          <ImageLightbox src="/images/a24.png" alt="MCP 按需开关示例 2" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {[
            { scene: '前端调试', tool: 'chrome-devtools' },
            { scene: '数据库', tool: 'postgres' },
            { scene: '浏览器自动化', tool: 'playwright' },
            { scene: '设计稿', tool: 'figma' },
          ].map((s) => (
            <span key={s.tool} style={{ padding: '4px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--text2)' }}>
              {s.scene} → <span style={{ color: 'var(--blue)', fontFamily: 'var(--mono)' }}>{s.tool}</span>
            </span>
          ))}
        </div>
      </Accordion>

      <Accordion title="问题二：如何实时监控 Claude Code 的上下文和资源消耗？" accent="var(--blue)">
        <div className="callout callout-blue" style={{ marginBottom: 16 }}>
          <strong>痛点：</strong>长时间对话后上下文膨胀、响应变慢、费用飙升 — 需要实时掌握 Claude Code 的运行状态。
        </div>

        <h3 className="section-title">核心监控命令</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {[
            {
              cmd: '/context [all]',
              desc: '彩色网格可视化上下文窗口使用情况',
              details: '显示系统提示、CLAUDE.md、工具定义、对话历史各占多少空间；加 all 展开逐项明细',
              color: 'var(--teal)',
              images: ['/images/a21.png'],
            },
            {
              cmd: '/usage',
              desc: '查看会话费用、token 用量、计划限制',
              details: 'Pro/Max/Team 计划按 skill、subagent、MCP server 分项统计。别名：/cost、/stats',
              color: 'var(--amber)',
              images: [],
            },
            {
              cmd: '/status',
              desc: '查看版本、模型、账户和连接状态',
              details: '打开 Settings 界面的 Status 标签页，可在 Claude 响应过程中运行，无需等待',
              color: 'var(--blue)',
              images: ['/images/a22.png', '/images/a23.png'],
            },
          ].map((item) => (
            <div key={item.cmd}>
              <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: `3px solid ${item.color}`, borderRadius: 8, background: 'var(--bg3)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                  <code style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: item.color }}>{item.cmd}</code>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{item.desc}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>{item.details}</div>
              </div>
              {item.images.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10, marginBottom: 4 }}>
                  {item.images.map((src) => (
                    <ImageLightbox key={src} src={src} alt={`${item.cmd} 示例截图`} style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <h3 className="section-title">上下文管理命令</h3>
        <div className="card-grid">
          {[
            {
              cmd: '/compact [instructions]',
              desc: '总结当前对话，释放上下文空间',
              hint: '可选传入聚焦指令控制总结方向',
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
            <div key={item.cmd} style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: `3px solid ${item.color}`, borderRadius: 8, background: 'var(--bg3)' }}>
              <code style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: item.color, display: 'block', marginBottom: 4 }}>{item.cmd}</code>
              <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>{item.desc}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.hint}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 16px', background: 'var(--teal-bg)', borderRadius: 8, borderLeft: '3px solid var(--teal)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.8, marginTop: 16 }}>
          <strong style={{ color: 'var(--teal)' }}>实战节奏：</strong>上下文超过 <strong>70%</strong> 时主动 <code style={{ fontFamily: 'var(--mono)', color: 'var(--teal)' }}>/compact</code>；每次大改动前先 <code style={{ fontFamily: 'var(--mono)', color: 'var(--teal)' }}>/context</code> 确认空间；费用敏感场景用 <code style={{ fontFamily: 'var(--mono)', color: 'var(--teal)' }}>/usage</code> 定期检查；长任务中断后用 <code style={{ fontFamily: 'var(--mono)', color: 'var(--teal)' }}>/recap</code> 快速恢复。
        </div>
      </Accordion>
    </section>
  )
}
