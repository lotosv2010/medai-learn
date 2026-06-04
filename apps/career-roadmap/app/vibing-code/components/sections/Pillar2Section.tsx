'use client'

import { Accordion } from '../shared/Accordion'
import { CodeBlock } from '../shared/CodeBlock'
import { CompareBlock } from '../shared/CompareBlock'
import { CACThreeCards } from '../shared/CACThreeCards'
import { SectionGroup } from '../shared/SectionGroup'

export function Pillar2Section({ active }: { active: boolean }) {
  return (
    <section className={`section ${active ? 'active' : ''}`}>
      <h1 className="page-title">流程</h1>
      <p className="page-sub">没有流程，你是唯一的 feedback loop，AI 跑多远你才发现</p>

      <div className="callout callout-teal">
        <strong>核心论点：</strong>复杂任务不能&quot;直接开干&quot;。四阶段流程让 AI 在正确方向上跑，而不是让你在错误方向上追。
      </div>

      <SectionGroup title="流程概览" accent="var(--blue)">
      <h3 className="section-title">四阶段流程</h3>
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {[
          { step: 'Research', desc: '只读，不改任何文件。了解现有实现，找可复用代码', color: 'var(--blue)', bg: 'var(--blue-bg)' },
          { step: 'Plan', desc: '输出文件清单 + 步骤。等你确认计划后才执行', color: 'var(--teal)', bg: 'var(--teal-bg)' },
          { step: 'Execute', desc: '按确认的计划实现，每步完成后跑 typecheck', color: 'var(--purple)', bg: 'var(--purple-bg)' },
          { step: 'Review', desc: 'Reviewer Agent 只读审查，输出三级问题报告', color: 'var(--amber)', bg: 'var(--amber-bg)' },
        ].map((s, i) => (
          <div key={s.step} style={{ flex: 1, padding: '14px 12px', background: s.bg, borderLeft: i > 0 ? '1px solid var(--border)' : 'none', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: s.color, marginBottom: 4 }}>0{i + 1}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{s.step}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--blue-bg)', borderRadius: 8, borderLeft: '3px solid var(--blue)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--blue)' }}>Tip：</strong>四阶段流程回答了「什么时候做什么」，但每个阶段里你都需要跟 AI 对话 — 写得好，AI 一次到位；写得差，返工三轮。所以下一步我们先看：怎么写 Prompt。
      </div>

      <h3 className="section-title">Prompt 三要素公式（CAC）</h3>
      <div className="callout callout-amber">
        <strong>公式：Context（上下文）+ Action（动作）+ Criterion（验收标准）</strong>
      </div>
      <CACThreeCards />

      <h3 className="section-title">提示工程完整示例</h3>
      <Accordion title="展开查看：完整三要素示例 + 探索性 Prompt" accent="var(--teal)">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>完整三要素示例（Modal 堆叠 + 焦点捕获）：</div>
        <CodeBlock lang="markdown" code={`【Context】
参考 @src/components/Modal/ 中现有 Modal 组件的实现模式，
当前使用 Radix UI Primitives + Tailwind，项目中没有 Framer Motion。

【Action】
为 Modal 组件增加"堆叠 (stacked)"和"焦点捕获 (focus trap)"功能：
- 堆叠：多个 Modal 同时打开时，层级正确，关闭顺序为后进先出（LIFO）
- 焦点捕获：Modal 打开时，Tab 焦点锁定在 Modal 内部，不流出

【Criterion】
- 不改变现有 Modal 的 Props 接口（向后兼容）
- 不引入新的 npm 包（Radix 已内置 FocusTrap，直接用）
- 添加 Vitest 测试覆盖堆叠场景（先写测试，后实现）
- 通过 @.claude/rules/review.md 中的无障碍检查标准
- 完成后截图对比现有 Modal 行为，确认视觉无回归`} />
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 16 }}>探索性 Prompt（非精确场景，适合分析/发现）：</div>
        <CodeBlock lang="markdown" code={`这个文件有什么可以改进的地方？（不要修改，只分析）
这段代码有哪些潜在的安全风险？
如果要支持 10 倍流量，现在的架构需要改哪里？
你觉得这个方案最大的风险是什么？`} />
      </Accordion>

      <h3 className="section-title">从模糊需求到精确 Prompt</h3>
      <Accordion title="展开查看：三步递进 — 每一步 Claude 输出的差异" accent="var(--amber)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 12 }}>
          需求：&quot;帮我实现对话气泡&quot;。看看三步 Prompt 带来的输出差异。
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '14px 16px', border: '1px solid var(--coral)', borderRadius: 8, background: 'var(--coral-bg)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--coral)', marginBottom: 8 }}>第 1 步：只有 Action（模糊需求）</div>
            <CodeBlock lang="markdown" code={`帮我实现对话气泡`} />
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>
              <strong>Claude 输出：</strong>用 div + 内联样式写了个气泡，引用了 react-chatbot-kit 第三方库。<br />
              <span style={{ color: 'var(--coral)' }}>问题：项目用 antd 不知道；引入了新依赖；没考虑消息方向（左/右）、时间戳、长文本换行。</span>
            </div>
          </div>
          <div style={{ padding: '14px 16px', border: '1px solid var(--amber)', borderRadius: 8, background: 'var(--amber-bg)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--amber)', marginBottom: 8 }}>第 2 步：补 Context</div>
            <CodeBlock lang="markdown" code={`参考 @src/components/Card.tsx 的现有布局模式，
项目用 antd，没有 Framer Motion。

帮我实现对话气泡`} />
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>
              <strong>Claude 输出：</strong>用对了 antd Card 的样式模式。<br />
              <span style={{ color: 'var(--amber)' }}>问题：没有区分发送/接收方向、没有时间戳格式、没有长文本和图片消息的适配 — 验收标准缺失。</span>
            </div>
          </div>
          <div style={{ padding: '14px 16px', border: '1px solid var(--teal)', borderRadius: 8, background: 'var(--teal-bg)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--teal)', marginBottom: 8 }}>第 3 步：加 Criterion（完整 CAC）</div>
            <CodeBlock lang="markdown" code={`【Context】
参考 @src/components/Card.tsx，项目用 antd。

【Action】
创建 ChatBubble 组件，区分发送/接收方向，支持文本和图片消息。

【Criterion】
- 只用已有依赖，不引入新包
- 长文本自动换行，图片消息有最大宽度限制
- 时间戳格式化显示，支持相对时间
- 完成后 pnpm typecheck && pnpm test 零错误`} />
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>
              <strong>Claude 输出：</strong>完整交付，支持双向气泡、文本/图片、时间戳、长文本换行。<br />
              <span style={{ color: 'var(--teal)' }}>✓ 这就是 CAC 公式的威力 — 你的判断力 + AI 的执行力。</span>
            </div>
          </div>
        </div>
      </Accordion>

      <h3 className="section-title">Bad → Good 对比</h3>
      <CompareBlock
        badLabel="❌ 缺少三要素"
        goodLabel="✅ 完整三要素"
        bad={`帮我做一个上传组件

// AI 不知道：
// - 项目用什么 UI 库？
// - 有没有现有的上传实现？
// - 完成的标准是什么？
// 结果：AI 自由发挥，引入新依赖`}
        good={`【Context】
参考 @src/components/FileInput.tsx 的现有上传组件模式，
项目用 antd + React Hook Form，没有 Framer Motion。

【Action】
创建支持拖拽 + 点击的 AvatarUploader 组件，
上传前支持图片裁剪预览，有实时进度条。

【Criterion】
- 只用已有 antd，不引入新依赖
- 键盘可操作（Tab + Enter/Space）
- 完成后运行 pnpm typecheck && pnpm test`}
      />

      <CompareBlock
        badLabel="❌ 一次喂多个任务"
        goodLabel="✅ 单一任务，标准清晰"
        bad={`帮我做上传组件、修改 ProfilePage、
写测试、更新 API 文档

// 问题：AI 会"全都做"，但每件都做得不够好
// 任何一步出错，整个 session 就乱了`}
        good={`只做 AvatarUploader 组件，不动 ProfilePage。

完成标准：
- 渲染正确 + pnpm typecheck 通过
- 截图符合 @docs/ui-rules.md 设计规范
- 有 data-testid 属性，方便后续 E2E 测试`}
      />

      </SectionGroup>

      <SectionGroup title="流程详解 Step 1→7" accent="var(--teal)">
      <h3 className="section-title">完整开发流程：Step 1 → Step 7</h3>

      <Accordion title="Step 1：需求分析（消除歧义，明确边界）" accent="var(--blue)">
        <CodeBlock lang="markdown" code={`请阅读 @docs/product.md 了解产品背景。

我需要实现以下功能：[功能描述]

请：
1. 用自己的话复述你理解的需求（不要照搬原文）
2. 列出你认为需要澄清的问题（按重要性排序）
3. 识别潜在的边界情况和实现风险

暂不写代码，暂不给方案。`} />
      </Accordion>

      <Accordion title="Step 2：ADR 方案设计（技术方案确认）" accent="var(--teal)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 12 }}>
          <strong>触发原则：</strong>有选择就记录；没有选择余地的纯实现，跳过。
        </div>
        <CodeBlock lang="markdown" code={`请阅读 @docs/architecture.md 和 @docs/tech-stack.md。

针对 [功能名称]，请提供技术方案：
1. 推荐方案及理由（为什么这个方案，不是别的）
2. 备选方案及取舍（我放弃了什么）
3. 需要修改的文件清单（越具体越好）
4. 可能影响的现有功能（回归测试范围）
5. 你对这个方案最不确定的一件事

以 ADR 格式输出到 docs/decisions/YYYY-MM-DD-[title].md。
暂不写代码。`} />
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr><th>情况</th><th>是否需要 ADR</th></tr>
            </thead>
            <tbody>
              {[
                ['涉及新的数据模型', '✅ 必须'],
                ['引入新的技术依赖', '✅ 必须'],
                ['修改核心架构或模块边界', '✅ 必须'],
                ['有多种实现路径可选择', '✅ 必须'],
                ['纯 UI 调整、文案修改', '❌ 跳过'],
                ['已有明确实现路径的小功能', '❌ 跳过'],
              ].map(([situation, need]) => (
                <tr key={situation as string}>
                  <td>{situation}</td>
                  <td style={{ color: (need as string).startsWith('✅') ? 'var(--teal)' : 'var(--coral)' }}>{need}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Accordion>

      <Accordion title="Step 2.5：Critic Agent（方案审查，一次性介入）" accent="var(--coral)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 12 }}>
          <strong>触发时机：</strong>ADR 写完后，任务拆解开始前。开新 Session 执行。<br />
          <strong>关键设计：</strong>Critic 只在这一个节点介入，不全程监督。全程监督 = 分析瘫痪。
        </div>
        <CodeBlock lang="markdown" code={`请以 @.claude/agents/critic-agent.md 的角色，审查以下方案：

[粘贴 ADR 核心内容]

输出：
1. 找出 3 个最可能出错的假设
2. 列出被忽略的边界情况
3. 质疑技术选型：有没有更简单的解法？
4. 评估 6 个月后的维护成本

每个反对意见必须附替代方案，输出后等待我决策。`} />
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 12 }}>critic-agent.md 角色模板：</div>
        <CodeBlock lang="markdown" code={`# Critic Agent

你是一个持怀疑态度的高级工程师，任务是挑战方案的合理性。

## 你的视角
- 假设所有乐观估计都会出错
- 偏好最简单能解决问题的方案
- 关注长期维护成本
- 质疑每个"显而易见"的假设

## 输出规范
- 每个反对意见必须附具体的替代方案
- 按风险级别排序（最危险的排第一）
- 语气直接，但不是为了反对而反对
- 输出后等待工程师决策，不自行修改

## 你不做的事
- 不考虑个人喜好
- 不提没有实际风险依据的建议
- 不在工程师拍板后继续争论`} />
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 16 }}>Critic Agent vs Reviewer Agent：职责边界</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th></th><th style={{ color: 'var(--coral)' }}>Critic Agent（Step 2.5）</th><th style={{ color: 'var(--purple)' }}>Reviewer Agent（Step 6）</th></tr>
            </thead>
            <tbody>
              {[
                ['介入时机', 'ADR 写完后，任务拆解前', '代码实现完成后，PR 前'],
                ['审查对象', '方案设计 / 技术决策', '实际代码变更'],
                ['核心问题', '「这个方案会出什么问题？」', '「这段代码有没有 bug / 风险？」'],
                ['输出形式', '假设挑战 + 替代方案', '三级问题报告（Critical/Warning/Suggestion）'],
                ['是否改代码', '❌ 不改，只质疑', '❌ 只读审查，不修改'],
                ['Session', '新 Session 隔离（外部视角）', '新 Session 隔离（外部视角）'],
                ['介入次数', '一次，拍板后不再争论', '每次 PR 前执行'],
              ].map(([dim, critic, reviewer]) => (
                <tr key={dim as string}>
                  <td style={{ fontWeight: 600, fontSize: 12 }}>{dim}</td>
                  <td style={{ fontSize: 12 }}>{critic}</td>
                  <td style={{ fontSize: 12 }}>{reviewer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Accordion>

      <Accordion title="Step 3：任务拆解（原子任务，不超过 200 行改动）" accent="var(--purple)">
        <CodeBlock lang="markdown" code={`基于已确认的方案：[粘贴 ADR 核心内容]

请将实现拆解为独立的子任务，每个任务需要：
- 明确的输入和输出
- 可运行的验收标准（不是"功能正常"，是"运行 X 命令后看到 Y"）
- 不超过 200 行代码改动
- 与其他任务的依赖关系说明

以 Markdown checklist 格式输出，存入 docs/tasks/FEAT-xxx.md。`} />
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 12 }}>产出物示例：</div>
        <CodeBlock lang="markdown" code={`# FEAT-042：用户头像上传

## 依赖顺序
T1 → T2 → T3（顺序执行）；T4 可与 T2/T3 并行

## 任务清单
- [ ] T1：创建 /api/upload 接口（含文件类型/大小/MIME 校验）
- [ ] T2：实现 AvatarUploader 组件（拖拽 + 点击，含进度条）
- [ ] T3：集成到 ProfilePage，替换现有头像展示逻辑
- [ ] T4：Vitest 单测（接口边界）+ Playwright E2E（完整上传流程）

## 验收标准
- 支持 JPG/PNG/WebP，最大 5MB，超限有明确错误提示
- 上传中展示进度，上传完成自动刷新头像
- 键盘可操作，有 aria-label
- 网络中断时有友好提示，支持重试

## 回归范围
- ProfilePage 现有功能不受影响
- 其他使用头像展示的页面正常显示`} />
      </Accordion>

      <Accordion title="Step 4：逐任务实现（标准工作模式）" accent="var(--teal)">
        <CodeBlock lang="bash" code={`# 1. 进入 Plan Mode 先探索
> 请阅读 @src/api/ 了解现有接口结构，暂不修改任何代码

# 2. 确认现状后制定计划
> 我要实现 T1：/api/upload 接口，请给出实现计划

# 3. Ctrl+G 在编辑器里直接修改计划

# 4. 确认计划后退出 Plan Mode，开始执行
> 按计划实现，完成后运行 pnpm typecheck && pnpm test

# 5. 盯着前几步确认方向正确

# 6. 完成后立即 commit
> 请生成 Conventional Commits 格式的 commit message 并提交`} />
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 16 }}>实现 Prompt 三要素完整示例：</div>
        <CodeBlock lang="markdown" code={`【Context — 现在在哪】
参考 @src/components/ImageUploader.tsx 中现有的文件上传组件实现模式。
当前项目使用 React Hook Form + Zod 做表单校验。

【Action — 做什么】
为 ProfilePage 创建 AvatarUploader 组件，支持：
- 拖拽上传和点击上传两种交互
- 图片裁剪预览（上传前确认）
- 实时上传进度条

【Criterion — 完成的定义】
- 只使用已有的 antd 组件，不引入新依赖
- 键盘可访问（Tab 聚焦 + Enter/Space 触发）
- 所有交互元素有 data-testid 属性
- 文件超限时展示具体原因
- 完成后运行 pnpm typecheck && pnpm test，零错误`} />
      </Accordion>

      <Accordion title="Step 4.5：Test-Driven Vibing（两段式）" accent="var(--blue)">
        <CodeBlock lang="markdown" code={`# 第一段：只写测试（此时测试应当失败）
为 [功能名] 写单元测试，覆盖：
- 正常路径：[期望的成功场景]
- 边界情况：[临界值、空值、最大值]
- 错误场景：[无效输入、网络失败、权限不足]

写完后运行 pnpm test，确认测试失败（红灯）。
暂不实现功能代码。

---（我确认测试用例正确后）---

# 第二段：让测试通过
写最少的代码让上面所有测试通过。
不多写一行，不提前优化，先让红灯变绿灯。
完成后运行 pnpm test，全部通过才算完成。`} />
        <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--amber-bg)', borderRadius: 8, borderLeft: '3px solid var(--amber)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
          <strong style={{ color: 'var(--amber)' }}>⚠️ AI 语境下的关键风险：「测试迎合实现」</strong><br />
          AI 生成测试时容易写出「能通过但无意义」的测试 — 测试断言直接镜像实现逻辑，没有独立的业务验证价值。<br />
          <strong>人工验收两件事：</strong>① 测试描述是否能独立读懂（不看实现也能理解测试意图）；② 故意传入错误输入，测试是否真的会失败。<br />
          如果测试无论传什么都通过，说明断言写错了 — 这种测试比没有测试更危险，给了虚假的安全感。
        </div>
      </Accordion>

      <Accordion title="Step 5：测试验证（验证三连）" accent="var(--amber)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 12 }}>
          <strong>铁律：任一失败，立即停止，先修复再继续。</strong>堆积失败 = debug 黑洞，越修越乱。
        </div>
        <CodeBlock lang="bash" code={`pnpm typecheck   # 类型检查（最快，先跑，0 容忍）
pnpm test        # 单元/集成测试（核心逻辑护城河）
pnpm lint        # 代码规范（最后跑，不影响功能但影响 CR）`} />
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 12 }}>在 Prompt 里内嵌验证标准：</div>
        <CodeBlock lang="markdown" code={`实现完成后，按顺序执行：
1. pnpm typecheck — 零类型错误才算完成
2. 为新逻辑补写测试（正常路径 + 至少 2 个边界情况）
3. pnpm test — 全部通过
4. 如有 UI 改动，截图并说明与 @docs/ui-rules.md 设计规范的差异

任何一步失败，修复后再继续，不要跳过。`} />
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
          完整的验证体系（E2E、视觉验证、AI Code Review）详见「<strong>检查</strong>」章节的五层金字塔。
        </div>
      </Accordion>

      <Accordion title="Step 6：Code Review（Reviewer Agent）" accent="var(--purple)">
        <CodeBlock lang="bash" code={`/cr @src/components/AvatarUploader.tsx @src/api/upload.ts`} />
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 12 }}>或直接写 Prompt：</div>
        <CodeBlock lang="markdown" code={`请以 @.claude/agents/reviewer-agent.md 的角色，审查以下改动：

[文件列表]

重点检查（结合本次改动的风险点）：
- 安全性：文件上传相关的注入/绕过/MIME 伪造风险
- 性能：大文件处理是否有内存泄漏，并发上传是否有竞态
- 可维护性：是否遵循 @docs/coding-style.md
- 边界情况：网络中断、重复提交、用户取消、并发上传

只分析不修改，以 🔴 Critical / 🟡 Warning / 🔵 Suggestion 三级输出。`} />
      </Accordion>

      <Accordion title="Step 7：交付确认" accent="var(--teal)">
        <CodeBlock lang="markdown" code={`# 交付前自检清单
1. pnpm typecheck && pnpm test && pnpm lint — 全部通过
2. 运行回归测试范围（见任务文档中的"回归范围"）
3. 生成 Conventional Commits 格式的 commit message
4. 创建 PR，关联 Issue，填写 PR 模板
5. 更新相关文档（如有 API 变更更新 api-contract.md）

请按照 Conventional Commits 规范生成 commit message：
- 说明为什么这样做，不只是做了什么
- 列出影响范围

然后用 gh 创建 PR，关联 Issue #[编号]。`} />
      </Accordion>

      <h3 className="section-title">流程降级规则</h3>
      <Accordion title="实现中途发现方案根本性错误" accent="var(--coral)">
        <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.7 }}>
          立即停止 → <code style={{ fontFamily: 'var(--mono)' }}>git stash</code> 或丢弃当前改动<br />
          开新 Session 重新做 ADR，<strong>不要在错误方向上继续修补</strong>
        </p>
      </Accordion>
      <Accordion title="测试阶段发现设计缺陷" accent="var(--amber)">
        <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.7 }}>
          <code style={{ fontFamily: 'var(--mono)' }}>git reset</code> 到最近一个干净提交<br />
          不要试图在破损状态上继续堆 Prompt — 越堆越乱
        </p>
      </Accordion>
      <Accordion title="Review 发现 Critical 级别问题" accent="var(--blue)">
        <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.7 }}>
          必须修复后才能进入交付，不接受&quot;下个版本修&quot;<br />
          如果修复涉及架构变更，回到 Plan 阶段
        </p>
      </Accordion>

      <h3 className="section-title">流程缩减原则</h3>
      <div className="card">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 2 }}>
          <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', marginRight: 8 }}>纯 UI 调整</span>直接 Execute，跳过 Research + Plan<br />
          <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', marginRight: 8 }}>小功能无架构决策</span>跳过 ADR<br />
          <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', marginRight: 8 }}>快速原型验证</span>先 Vibe 后 Spec<br />
          <span style={{ color: 'var(--teal)', fontFamily: 'var(--mono)', marginRight: 8 }}>复杂跨模块功能</span>走完整四阶段，不能跳
        </div>
      </div>
      <div style={{ marginTop: 10, padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text2)', lineHeight: 1.9 }}>
        <strong>快速判断标准：</strong><br />
        <span style={{ color: 'var(--teal)' }}>✅ 可跳过 Plan</span>：改动文件 &lt; 3 个 / 不涉及新接口或数据模型 / 只改样式或文案<br />
        <span style={{ color: 'var(--amber)' }}>⚠️ 快速原型注意</span>：团队场景下「先 Vibe」的原型代码不能直接进主干，完成后必须补 Spec 再做正式实现，避免原型直接进生产<br />
        <span style={{ color: 'var(--coral)' }}>🔴 必须走完整流程</span>：涉及新依赖 / 修改核心数据流 / 影响已有接口契约
      </div>

      <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--teal-bg)', borderRadius: 8, borderLeft: '3px solid var(--teal)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--teal)' }}>Tip：</strong>上面 Step 1→7 的完整流程，在「配置」章节的 /feat Skill 中已经被编排成了一个可执行的命令 — 输入 <code>/feat 用户头像上传</code>，Claude 就会自动走完需求分析 → ADR → 拆解 → 实现 → 测试 → Review → 交付的全链路。流程是骨，Skill 是魂。
      </div>

      </SectionGroup>

      <SectionGroup title="上下文管理" accent="var(--blue)">
      <h3 className="section-title">上下文管理</h3>

      <div className="callout callout-blue">
        <strong>为什么流程之后讲上下文？</strong>CAC 公式决定了你「怎么写 Prompt」，四阶段流程决定了你「什么时候做什么」— 但这两件事都建立在一个前提之上：<strong>Claude 能记住你说过的话</strong>。上下文一旦劣化，再好的 Prompt 也会被忽略，再严谨的流程也会走偏。所以上下文管理不是进阶技巧，是流程能跑通的地基。
      </div>
      <Accordion title="展开查看：Context Window 消耗来源 + 劣化信号 + 应对策略" accent="var(--blue)">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>消耗来源（从大到小）：</div>
        <CodeBlock lang="plain" code={`完整文件读取 > 命令输出 > 对话历史 > CLAUDE.md > 单条消息`} />
        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 16 }}>
          实操意义：让 Claude 读整个目录比读单个文件贵得多；命令输出很长时考虑 head -50 截断。
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>劣化信号（出现以下现象说明 context 快满了或已&quot;乱&quot;）：</div>
        <ul style={{ paddingLeft: 18, color: 'var(--text2)', fontSize: 13, lineHeight: 1.9, marginBottom: 16 }}>
          <li>Claude 开始忽略 CLAUDE.md 里的规则</li>
          <li>回答与之前的讨论出现矛盾</li>
          <li>代码质量下滑，开始引入明确禁止的模式</li>
          <li>对同一问题给出不同答案</li>
          <li>开始用&quot;如前所述&quot;但&quot;前面&quot;其实没有说过</li>
        </ul>

        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>四种应对策略：</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { title: '预防', desc: '一任务一 Session\n每个独立任务开新对话', color: 'var(--teal)', bg: 'var(--teal-bg)' },
            { title: '压缩', desc: '/compact\n感觉 Claude 开始"忘事"时主动压缩', color: 'var(--blue)', bg: 'var(--blue-bg)' },
            { title: '重置', desc: '开新 Session + 精确初始化\n一旦"乱了"，不要纠正，直接重开', color: 'var(--amber)', bg: 'var(--amber-bg)' },
            { title: '监控', desc: '状态栏指示器\ncontext 用到 60% 就开始考虑处理', color: 'var(--purple)', bg: 'var(--purple-bg)' },
          ].map((s) => (
            <div key={s.title} style={{ padding: '12px 14px', borderRadius: 8, background: s.bg, borderLeft: `3px solid ${s.color}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: s.color, marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </Accordion>

      <h3 className="section-title">真实劣化案例</h3>
      <Accordion title="展开查看：一个 Session 连做 5 个任务后的灾难" accent="var(--coral)">
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
          <div style={{ padding: '10px 14px', background: 'var(--coral-bg)', borderRadius: 8, borderLeft: '3px solid var(--coral)', marginBottom: 12 }}>
            <strong style={{ color: 'var(--coral)' }}>场景：</strong>我在一个 Session 里连续做了 5 个任务，没有开新 Session
          </div>

          <div style={{ marginBottom: 12 }}>
            <strong>症状 1（60% context）— 开始忘规则：</strong><br />
            我说&quot;禁止引入新依赖&quot;，Claude 引入了 lodash。<br />
            <span style={{ color: 'var(--amber)' }}>→ /compact 后症状消失，可以继续</span>
          </div>

          <div style={{ marginBottom: 12 }}>
            <strong>症状 2（80% context）— 自相矛盾：</strong><br />
            前面说&quot;用 Zustand 做状态管理&quot;，后面说&quot;用 Redux&quot;。<br />
            <span style={{ color: 'var(--coral)' }}>→ 必须开新 Session，压缩也救不回来</span>
          </div>

          <div style={{ marginBottom: 12 }}>
            <strong>症状 3（90% context）— 幻觉：</strong><br />
            &quot;如前所述，我们选择了 PostgreSQL&quot; — 前面根本没讨论过数据库。<br />
            <span style={{ color: 'var(--coral)' }}>→ 必须开新 Session，且需要用精确的 @文件 引用初始化上下文</span>
          </div>

          <div style={{ padding: '10px 14px', background: 'var(--teal-bg)', borderRadius: 8, borderLeft: '3px solid var(--teal)' }}>
            <strong style={{ color: 'var(--teal)' }}>教训：</strong>一任务一 Session 不是建议，是铁律。<br />
            复杂度越高的任务，context 消耗越快。3 个以上相关任务就要考虑换 Session。
          </div>
        </div>
      </Accordion>

      <h3 className="section-title">高效上下文传递方式</h3>
      <CodeBlock lang="bash" code={`# 精确引用文件（推荐）
@src/components/Button.tsx

# 引用目录（谨慎使用，会读取全部文件）
@src/components/

# 管道输入日志（适合 debug）
cat error.log | claude "分析错误原因，不要修改任何文件"
cat package.json | claude "找出可能的版本冲突"

# 截图粘贴（UI 问题最快）
Ctrl+V 粘贴截图，直接描述问题

# 管道 + 无头模式（CI / 批量处理）
claude -p "审查以下代码的安全风险" < src/api/upload.ts`} />
      </SectionGroup>

      <SectionGroup title="Claude Code 操作技巧" accent="var(--amber)">
      <h3 className="section-title">Claude Code 操作技巧速查</h3>
      <Accordion title="展开查看：基础 / 上下文 / 工作流进阶技巧" accent="var(--amber)">
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr><th>#</th><th>基础</th><th>说明</th></tr>
            </thead>
            <tbody>
              {[
                ['1', '多问题合并一条消息', '相关问题一次提出，避免多轮问答浪费 context', false],
                ['2', '出错新起消息纠正', '编辑原消息会清空上下文，永远新起一条', false],
                ['3', '临时提问用 /btw', '不影响当前任务上下文，问完 Claude 继续原任务', true],
                ['4', '引用文件用 @路径', '比描述位置精准；引用目录要谨慎（会读全部文件）', true],
                ['5', '新任务开新 Session', '/new 或 Ctrl+N；避免不相关上下文污染', false],
                ['6', '状态栏显示 context 用量', '参考官方 statusline 配置，实时监控', false],
              ].map(([n, tip, desc, star]) => (
                <tr key={n as string} style={star ? { background: 'var(--blue-bg)' } : undefined}>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--blue)', width: 28, fontWeight: 600 }}>{n}</td>
                  <td style={{ fontWeight: star ? 600 : 500 }}>{tip}</td>
                  <td>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr><th>#</th><th>上下文操作</th><th>说明</th></tr>
            </thead>
            <tbody>
              {[
                ['7', '主动压缩 /compact', 'Claude 开始"忘事"时立即压缩，别等到满了', true],
                ['8', '离开前先压缩', '去开会/吃饭前 /compact，回来 Claude 仍在状态', false],
                ['9', '管道传递数据', 'cat error.log | claude "分析原因，不修改文件"', true],
                ['10', '截图直接粘贴', 'UI 问题最快的上下文传递方式，Ctrl+V 粘贴图片', false],
                ['11', '/resume 恢复对话', '选择历史 Session 继续，上下文自动恢复；中断的工作不用从头来', true],
                ['12', '/rewind 撤回改动', '回退 Claude 最近的文件修改，比 git checkout 更快更精准', true],
                ['13', '/recap 会话摘要', '生成当前 Session 的单行总结，适合交接或记录进度', false],
              ].map(([n, tip, desc, star]) => (
                <tr key={n as string} style={star ? { background: 'var(--teal-bg)' } : undefined}>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--teal)', width: 28, fontWeight: 600 }}>{n}</td>
                  <td style={{ fontWeight: star ? 600 : 500 }}>{tip}</td>
                  <td>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr><th>#</th><th>工作流进阶</th><th>说明</th></tr>
            </thead>
            <tbody>
              {[
                ['14', 'Plan Mode 先探索', 'Shift+Tab 两次进入；Ctrl+G 直接编辑生成的计划', false],
                ['15', '新任务盯着前几步', '确认方向正确再离开；早发现偏差成本低', false],
                ['16', 'Auto Mode 减少打断', 'settings.json 开启，分类器自动处理低风险操作', false],
                ['17', 'Git Worktree 并行', 'git worktree add ../feat-xyz，独立分支独立 Agent', false],
                ['18', '/permissions 白名单', '安全命令加白名单（如 pnpm lint），免确认提速', false],
                ['19', 'Critic/Reviewer 节点介入', '只在 ADR 后和 PR 前，开独立 Session', false],
                ['20', '/fast 速度模式', '简单任务用 /fast，速度 2.5x，质量不变', false],
                ['21', 'claude -p 无头模式', 'claude -p "prompt" 脚本化调用，适合 CI / 批量', false],
                ['22', '/insights 用量洞察', '查看 token 消耗、会话时长、高频操作，生成报告到 .claude/usage-data/report.html', true],
                ['23', '/model 切换模型', '中途切换 Opus/Sonnet/Haiku，复杂推理用 Opus，简单改动用 /fast', false],
                ['24', '/init 生成 CLAUDE.md', '新项目一键扫描生成项目配置，再手动精简到 50 行以内', true],
              ].map(([n, tip, desc, star]) => (
                <tr key={n as string} style={star ? { background: 'var(--purple-bg)' } : undefined}>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--purple)', width: 28, fontWeight: 600 }}>{n}</td>
                  <td style={{ fontWeight: star ? 600 : 500 }}>{tip}</td>
                  <td>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr><th>#</th><th>系统与扩展</th><th>说明</th></tr>
            </thead>
            <tbody>
              {[
                ['25', '/plugin', '管理插件（安装/卸载/查看已装插件）', true],
                ['26', '/mcp', '管理 MCP 服务器连接状态', true],
                ['27', '/skills', '列出当前可用 Skill（含自定义 + 已安装）', true],
                ['28', '/hooks', '查看已注册的 Hook 配置', true],
                ['29', '/config', '打开交互式设置界面（别名 /settings）', false],
                ['30', '/context [all]', '可视化上下文窗口消耗（比状态栏更详细）', true],
                ['31', '/effort [level]', '设置推理强度：low / medium / high / xhigh / max', false],
                ['32', '/branch [name]', '在当前节点创建对话分支（别名 /fork）', false],
                ['33', '/memory', '编辑 CLAUDE.md 记忆文件', false],
                ['34', '/permissions', '管理工具权限白名单（别名 /allowed-tools）', false],
                ['35', '/usage', '查看费用和 Token 用量（别名 /cost /stats）', true],
                ['36', '/doctor', '诊断安装问题，检查环境是否正常', false],
                ['37', '/login / /logout', '账号登录/登出，切换订阅计划', false],
                ['38', '/export', '导出当前对话为纯文本文件', false],
              ].map(([n, tip, desc, star]) => (
                <tr key={n as string} style={star ? { background: 'var(--amber-bg)' } : undefined}>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--amber)', width: 28, fontWeight: 600 }}>{n}</td>
                  <td style={{ fontWeight: star ? 600 : 500 }}>{tip}</td>
                  <td>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Accordion>
      </SectionGroup>
    </section>
  )
}
