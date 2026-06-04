'use client'

import { useState } from 'react'
import { Accordion } from '../shared/Accordion'
import { ImageLightbox } from '../shared/ImageLightbox'
import { SectionGroup } from '../shared/SectionGroup'
import { TrapGrid3x3 } from '../shared/TrapGrid3x3'

export function FaqSection({ active }: { active: boolean }) {
  const [showAnswer, setShowAnswer] = useState(false)
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

      <Accordion title="问题二：大项目 / Monorepo 里 Claude Code 很慢怎么办？" accent="var(--amber)">
        <div className="callout callout-coral" style={{ marginBottom: 16 }}>
          <strong>痛点：</strong>Monorepo 下一次 <code>find</code> 扫描上万文件，等半天没结果；聊几轮上下文就满了，响应越来越慢。
        </div>

        <h3 className="section-title">为什么会慢？三个瓶颈</h3>
        <div className="card-grid">
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--coral)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--coral)', marginBottom: 4 }}>瓶颈 1</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>搜索范围太大</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              你问"认证模块在哪"，Claude 默认在<strong>整个仓库</strong>搜。Monorepo 可能有 <code>apps/</code>、<code>packages/</code>、<code>tools/</code> 加起来几万个文件，每次搜索都全量扫描。
            </div>
          </div>
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--amber)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--amber)', marginBottom: 4 }}>瓶颈 2</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>上下文被"垃圾"挤满</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              大文件内容、MCP 工具描述、长对话历史<strong>同时</strong>挤占上下文窗口。好比一张桌子堆满了不相关的资料，真正要用的东西反而放不下了。
            </div>
          </div>
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--teal)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--teal)', marginBottom: 4 }}>瓶颈 3</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>MCP 工具"搭便车"</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              你启用了 4 个 MCP server，每个注册 10–20 个工具。<strong>每次对话</strong>这些工具描述都会随请求发送，即使你根本没用它们，白白占了上下文空间。
            </div>
          </div>
        </div>

        <h3 className="section-title" style={{ marginTop: 20 }}>优化方案（按效果排序）</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {[
            {
              title: '用 Explore Agent 代替手动搜索',
              desc: '让 Claude 派出 Explore 子 Agent 帮你找代码。它<strong>只读相关文件片段</strong>，不把整个仓库塞进上下文。直接用自然语言描述需求即可，Claude 会自动判断是否派出：<br /><br />• <code>"RAG 相关的代码在哪"</code> → 快速定位文件<br />• <code>"认证中间件从哪被引用的"</code> → 追踪调用链<br />• <code>"所有用到向量检索的地方"</code> → 全仓库扫描',
              tag: '效果最大',
              color: 'var(--teal)',
            },
            {
              title: '子目录 .claude/ 局部配置',
              desc: '在 <code>apps/web/.claude/settings.json</code> 里只启用前端相关 MCP 和权限，避免加载后端、AI 引擎的工具。每个子项目独立上下文，互不干扰。',
              tag: '架构级',
              color: 'var(--blue)',
            },
            {
              title: '/compact 主动压缩',
              desc: '上下文超过 <strong>70%</strong> 时主动 <code>/compact</code>，可附加聚焦指令如 <code>/compact 只保留认证模块的讨论</code>，精准保留重要上下文。',
              tag: '日常习惯',
              color: 'var(--purple)',
            },
            {
              title: 'MCP 按需开关',
              desc: '默认关闭所有 MCP server，用时再开：<code>claude mcp enable postgres</code>，用完关掉。每个 server 省 10–20 个工具描述体积。',
              tag: '立竿见影',
              color: 'var(--amber)',
            },
            {
              title: 'CLAUDE.md 精简',
              desc: 'CLAUDE.md 每次对话都加载，控制在 <strong>200 行以内</strong>。详细文档放 <code>docs/</code> 目录按需 Read，不要全堆在 CLAUDE.md 里。',
              tag: '基础优化',
              color: 'var(--text3)',
            },
          ].map((item, i) => (
            <div key={i} style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: `3px solid ${item.color}`, borderRadius: 8, background: 'var(--bg3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.title}</span>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: `${item.color}20`, color: item.color, border: `1px solid ${item.color}40` }}>{item.tag}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: item.desc }} />
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 16px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>什么时候用 Explore Agent？</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11, color: 'var(--text2)', lineHeight: 1.7 }}>
            <div>
              <strong style={{ color: 'var(--teal)' }}>用 Explore Agent</strong><br />
              • 不确定代码在哪 → 搜索定位<br />
              • 需要理解模块关系 → 跨文件追踪<br />
              • 大范围审计 → 全仓库扫描<br />
              • 结果自动汇总，不污染主上下文
            </div>
            <div>
              <strong style={{ color: 'var(--amber)' }}>直接用 Read / grep</strong><br />
              • 已知文件路径 → 直接 Read<br />
              • 查找具体符号 → grep 精确匹配<br />
              • 单文件修改 → 不需要 Agent<br />
              • 结果立即可见，无额外开销
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 16px', background: 'var(--amber-bg)', borderRadius: 8, borderLeft: '3px solid var(--amber)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
          <strong style={{ color: 'var(--amber)' }}>Monorepo 黄金法则：</strong>启动时 <code style={{ fontFamily: 'var(--mono)', color: 'var(--amber)' }}>cd</code> 到目标子目录再开 Claude Code，而不是在仓库根目录操作。配合子目录 <code>.claude/settings.json</code>，搜索范围和工具加载都限定在子项目内，速度提升 3–5 倍。
        </div>
      </Accordion>

      <Accordion title="问题三：团队引入 Claude Code 的成本怎么控制？" accent="var(--teal)">
        <div className="callout callout-teal" style={{ marginBottom: 16 }}>
          <strong>背景：</strong>Token 消耗是团队推广时被问最多的问题。不了解消耗结构，很容易在不知情的情况下产生大量费用。
        </div>

        <h3 className="section-title">消耗大头排序</h3>
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr><th>消耗来源</th><th>量级</th><th>控制手段</th></tr>
            </thead>
            <tbody>
              {[
                ['读取大文件 / 全量文件树', '极高', '用 Explore Agent 代替全量读取'],
                ['ULTRATHINK 深度推理', '高', '按需使用，日常用 DEFAULT'],
                ['长 Session 不清理', '高', '上下文 >70% 时主动 /compact'],
                ['MCP 全时启用', '中', '默认关闭，用时再开'],
                ['单条消息本身', '低', '无需特别优化'],
              ].map(([source, level, tip]) => (
                <tr key={source as string}>
                  <td style={{ fontWeight: 500 }}>{source}</td>
                  <td style={{ color: level === '极高' ? 'var(--coral)' : level === '高' ? 'var(--amber)' : 'var(--text3)', fontWeight: 600, fontFamily: 'var(--mono)', fontSize: 12 }}>{level}</td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{tip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="section-title">成本可见性</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {[
            { cmd: '/usage', desc: '查看当前会话的 token 用量和费用，按工具分项统计' },
            { cmd: '/context', desc: '可视化上下文占用，定位哪部分内容消耗最多空间' },
            { cmd: '~/.claude/.../metrics/costs.jsonl', desc: '历史费用日志，可用于团队月度核查和预算分析' },
          ].map((item) => (
            <div key={item.cmd} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <code style={{ fontSize: 12, color: 'var(--teal)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap', flexShrink: 0 }}>{item.cmd}</code>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{item.desc}</span>
            </div>
          ))}
        </div>

        <div className="callout callout-teal">
          <strong>实践建议：</strong>团队初期设置月度预算上限（Claude Team 计划支持用量告警）。先跑 1–2 周记录实际消耗，再根据数据调整 MCP 开关策略和 /compact 触发阈值。
        </div>
      </Accordion>

      <Accordion title="问题四：如何实时监控 Claude Code 的上下文和资源消耗？" accent="var(--blue)">
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

      <Accordion title="问题五：如何让 Claude Code 保持长期记忆？" accent="var(--purple)">
        <div className="callout callout-coral" style={{ marginBottom: 16 }}>
          <strong>痛点：</strong>换个会话就忘了之前的决策、上下文丢失、重复沟通 — 每次新对话都要从头解释项目背景和偏好。
        </div>

        <h3 className="section-title">记忆体系全景</h3>
        <div className="card-grid">
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--purple)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--purple)', marginBottom: 4 }}>L1 — 即时上下文</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>CLAUDE.md</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              项目根目录的 <code>CLAUDE.md</code> 每次对话<strong>自动加载</strong>，适合存放：架构约定、代码规范、常用命令、当前迭代重点。入 Git 后全团队共享同一份"项目记忆"。
            </div>
          </div>
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--teal)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--teal)', marginBottom: 4 }}>L2 — 持久记忆</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Memory 系统</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              存储在 <code>~/.claude/projects/&lt;项目路径&gt;/memory/</code> 的 Markdown 文件，按项目隔离，跨会话持久化。四种类型覆盖所有场景：
            </div>
          </div>
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--amber)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--amber)', marginBottom: 4 }}>L3 — 会话恢复</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>/resume 恢复</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              关闭终端后用 <code>/resume</code> 恢复上一次对话，上下文自动回滚。配合 <code>/recap</code> 生成摘要，断点续工零损耗。
            </div>
          </div>
        </div>

        <h3 className="section-title" style={{ marginTop: 20 }}>Memory 四种类型详解</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {[
            {
              type: 'user',
              label: '用户画像',
              desc: '你的角色、技术栈、偏好 — 让 Claude 因材施教',
              example: '「10 年前端经验，React 熟练，Go 新手」→ Claude 自动用前端概念类比后端',
              color: 'var(--blue)',
            },
            {
              type: 'feedback',
              label: '行为反馈',
              desc: '你纠正过或认可过的做法 — 避免重复犯错',
              example: '「不要在测试里 mock 数据库」→ 以后所有测试都走真实 DB',
              color: 'var(--coral)',
            },
            {
              type: 'project',
              label: '项目上下文',
              desc: '当前迭代目标、截止日期、阻塞项 — 理解"为什么"',
              example: '「3/5 之后冻结合并，移动端在切 release 分支」→ 自动跳过非紧急 PR',
              color: 'var(--amber)',
            },
            {
              type: 'reference',
              label: '外部指针',
              desc: '去哪里找项目外的信息 — Linear、Grafana、Slack 频道',
              example: '「pipeline bug 在 Linear 的 INGEST 项目里」→ 以后查 bug 直接定位',
              color: 'var(--teal)',
            },
          ].map((item) => (
            <div key={item.type} style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: `3px solid ${item.color}`, borderRadius: 8, background: 'var(--bg3)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                <code style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: item.color }}>{item.type}</code>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.label}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 6 }}>{item.desc}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>例：{item.example}</div>
            </div>
          ))}
        </div>

        <h3 className="section-title">实战：一句话写入记忆</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {[
            { cmd: '「记住：我们用 pnpm 不用 npm」', result: '写入 feedback 类型，以后自动用 pnpm' },
            { cmd: '「我是后端转前端的，React 刚学」', result: '写入 user 类型，解释时用后端类比' },
            { cmd: '「这个项目的 bug 跟踪在 Linear INGEST」', result: '写入 reference 类型，后续自动查阅' },
            { cmd: '「忘记之前关于 mock 的那条记忆」', result: '自动查找并删除对应 memory 文件' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--purple)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>{item.cmd}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>→</span>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{item.result}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['CLAUDE.md → 全局约定', 'Memory → 个人偏好', '/resume → 会话续接', '/recap → 快速摘要'].map((tag) => (
            <span key={tag} style={{ padding: '4px 10px', background: 'var(--purple-bg)', border: '1px solid var(--purple-border, var(--border))', borderRadius: 6, fontSize: 11, color: 'var(--purple)', fontFamily: 'var(--mono)' }}>
              {tag}
            </span>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <ImageLightbox src="/images/a5.png" alt="长期记忆示例截图" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
        </div>
      </Accordion>


      <Accordion title="问题六：Vibing Code 有哪些常见陷阱？" accent="var(--coral)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 16 }}>
          9 个高频问题按严重程度分级。遇到 critical 级别时立即停止当前操作，按建议处理。
        </div>
        <TrapGrid3x3 />
      </Accordion>

      <Accordion title="问题七：Vibing Code 会被模型迭代吸收吗？" accent="var(--teal)">
        <div>
          {/* 思考区 - 始终显示 */}
          <div className="callout callout-amber" style={{ marginBottom: 16 }}>
            <strong>思考：</strong>随着模型能力增强，Vibing Code 的方法论会被淘汰吗？哪些会过时，哪些不会？
          </div>

          {/* 小眼睛按钮 */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <button
              onClick={() => setShowAnswer(!showAnswer)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                background: showAnswer ? 'var(--teal-bg)' : 'var(--bg2)',
                border: `1px solid ${showAnswer ? 'var(--teal)' : 'var(--border)'}`,
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                color: showAnswer ? 'var(--teal)' : 'var(--text2)',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: 16 }}>{showAnswer ? '👁️' : '👁️‍🗨️'}</span>
              {showAnswer ? '隐藏答案' : '点击查看答案'}
            </button>
          </div>

          {/* 答案区 - 点击显示 */}
          {showAnswer && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
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
          )}
        </div>
      </Accordion>
    </section>
  )
}