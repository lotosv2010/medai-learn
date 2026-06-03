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

      <Accordion title="问题三：如何让 Claude Code 保持长期记忆？" accent="var(--purple)">
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
      </Accordion>

      <Accordion title="问题四：大项目 / Monorepo 里 Claude Code 很慢怎么办？" accent="var(--amber)">
        <div className="callout callout-coral" style={{ marginBottom: 16 }}>
          <strong>痛点：</strong>工具调用多、文件搜索慢、上下文膨胀快 — Monorepo 下一个 <code>find</code> 命令扫几千文件，等半天还没出结果。
        </div>

        <h3 className="section-title">性能瓶颈分析</h3>
        <div className="card-grid">
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--coral)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--coral)', marginBottom: 4 }}>瓶颈 1</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>文件搜索范围过大</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              默认 <code>find</code> / <code>glob</code> 扫描整个仓库。Monorepo 动辄上万文件，每次工具调用都全量扫描。
            </div>
          </div>
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--amber)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--amber)', marginBottom: 4 }}>瓶颈 2</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>上下文窗口膨胀</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              大文件、多工具描述、长对话历史同时挤占上下文，响应变慢、费用飙升。
            </div>
          </div>
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--teal)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--teal)', marginBottom: 4 }}>瓶颈 3</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>MCP 工具描述冗余</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              每个 MCP server 注册 10–20 个工具，描述随每次请求发送。4 个 server = 60+ 工具定义常驻上下文。
            </div>
          </div>
        </div>

        <h3 className="section-title" style={{ marginTop: 20 }}>优化方案（按效果排序）</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {[
            {
              title: 'Explore Agent 快速定位',
              desc: '当你需要在大仓库里"找东西"时，让 Claude 自动派出 Explore 子 Agent。它只读相关文件片段，不把整个仓库塞进主上下文。支持 <code>quick</code> / <code>medium</code> / <code>very thorough</code> 三档搜索宽度。<br /><br /><strong>触发方式：</strong>直接用自然语言描述需求，Claude 会自动判断是否需要派出 Explore Agent：<br />• <code>"RAG 相关的代码在哪"</code> → quick 档，定位文件<br />• <code>"认证系统的完整流程"</code> → medium 档，跨文件追踪<br />• <code>"所有用到向量检索的地方"</code> → very thorough 桌，全仓库扫描',
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
              desc: 'CLAUDE.md 每次对话都加载，控制在 <strong>200 行以内</code>。详细文档放 <code>docs/</code> 目录按需 Read，不要全堆在 CLAUDE.md 里。',
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

        <h3 className="section-title" style={{ marginTop: 20 }}>Explore Agent 使用详解</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {[
            {
              scene: '找文件 / 定位模块',
              prompt: '"RAG 相关的代码在哪个目录"',
              breadth: 'quick',
              behavior: 'Agent 快速扫描目录结构和文件名，返回匹配的文件列表。适合不知道代码在哪的场景。',
              color: 'var(--teal)',
            },
            {
              scene: '追踪调用链',
              prompt: '"认证中间件从哪被引用的"',
              breadth: 'medium',
              behavior: 'Agent 读取相关文件片段，追踪 import/export 关系，返回调用链路。适合理解模块间依赖。',
              color: 'var(--blue)',
            },
            {
              scene: '全仓库搜索模式',
              prompt: '"所有用到向量检索的地方"',
              breadth: 'very thorough',
              behavior: 'Agent 跨越多个命名约定和目录，搜索所有可能的引用。适合排查遗漏或审计功能覆盖。',
              color: 'var(--purple)',
            },
          ].map((item) => (
            <div key={item.scene} style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: `3px solid ${item.color}`, borderRadius: 8, background: 'var(--bg3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.scene}</span>
                <code style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${item.color}20`, color: item.color }}>{item.breadth}</code>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 6 }}>
                <strong>这样说：</strong><code style={{ fontFamily: 'var(--mono)', color: item.color }}>{item.prompt}</code>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.7 }}>{item.behavior}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 16px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Explore Agent vs 直接工具</div>
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

      <Accordion title="问题五：如何在团队中统一 Claude Code 的配置？" accent="var(--teal)">
        <div className="callout callout-coral" style={{ marginBottom: 16 }}>
          <strong>痛点：</strong>每人本地配置不同、行为不一致 — 张三的 Claude 用 npm，李四用 pnpm；王五开了 5 个 MCP，赵六一个没开。代码风格、工具链、提交规范全靠口头约定。
        </div>

        <h3 className="section-title">配置分层体系</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {[
            {
              layer: '全局层',
              path: '~/.claude/settings.json',
              scope: '当前用户所有项目',
              content: '个人偏好：主题、快捷键、常用权限',
              git: false,
              color: 'var(--text3)',
            },
            {
              layer: '项目层',
              path: '.claude/settings.json',
              scope: '当前项目所有成员',
              content: '团队规范：MCP 配置、hooks、权限白名单',
              git: true,
              color: 'var(--teal)',
            },
            {
              layer: '子目录层',
              path: 'apps/web/.claude/settings.json',
              scope: '子项目独立配置',
              content: '局部工具和权限，避免加载无关 MCP',
              git: true,
              color: 'var(--blue)',
            },
          ].map((item) => (
            <div key={item.layer} style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: `3px solid ${item.color}`, borderRadius: 8, background: 'var(--bg3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.layer}</span>
                {item.git && (
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'var(--teal-bg)', color: 'var(--teal)', border: '1px solid var(--teal)' }}>入 Git</span>
                )}
              </div>
              <code style={{ fontFamily: 'var(--mono)', fontSize: 11, color: item.color, display: 'block', marginBottom: 6 }}>{item.path}</code>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
                <strong>作用域：</strong>{item.scope} ｜ <strong>内容：</strong>{item.content}
              </div>
            </div>
          ))}
        </div>

        <h3 className="section-title">团队统一三件套</h3>
        <div className="card-grid">
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--teal)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--teal)', marginBottom: 4 }}>01</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>CLAUDE.md 版本化</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              项目根目录的 <code>CLAUDE.md</code> 入 Git，全员共享同一份"AI 操作手册"。包含：架构约定、代码规范、常用命令、Git 提交格式、当前迭代重点。新人 <code>git clone</code> 后 Claude 自动对齐。
            </div>
          </div>
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--blue)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--blue)', marginBottom: 4 }}>02</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>settings.json 入 Git</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              <code>.claude/settings.json</code> 统一管理：MCP server 列表、工具权限白名单、hooks 配置。PR Review 时检查配置变更，确保团队行为一致。
            </div>
          </div>
          <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '3px solid var(--purple)', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--purple)', marginBottom: 4 }}>03</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Shared Hooks</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
              在 <code>settings.json</code> 中定义 hooks，自动执行团队规范：<br />
              • <code>post-commit</code>: 自动运行类型检查<br />
              • <code>pre-push</code>: 跑 lint + test<br />
              • <code>notification</code>: 长任务完成时通知
            </div>
          </div>
        </div>

        <h3 className="section-title" style={{ marginTop: 20 }}>推荐的 .claude/settings.json 模板</h3>
        <div style={{ background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)', padding: '14px 16px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.8, overflowX: 'auto', marginBottom: 16 }}>
          <pre style={{ margin: 0 }}>{`{
  "permissions": {
    "allow": [
      "Bash(pnpm *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)"
    ],
    "deny": [
      "Bash(git push --force *)",
      "Bash(rm -rf *)"
    ]
  },
  "mcpServers": {
    "postgres": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-postgres"] }
  },
  "hooks": {
    "postToolCall": [{
      "matcher": "Edit",
      "hooks": ["pnpm typecheck --noEmit"]
    }]
  }
}`}</pre>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['CLAUDE.md → 操作手册', 'settings.json → 行为规则', 'hooks → 自动执行', '入 Git → 全员同步'].map((tag) => (
            <span key={tag} style={{ padding: '4px 10px', background: 'var(--teal-bg)', border: '1px solid var(--teal-border, var(--border))', borderRadius: 6, fontSize: 11, color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
              {tag}
            </span>
          ))}
        </div>
      </Accordion>
    </section>
  )
}
