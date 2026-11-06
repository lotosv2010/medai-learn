# labs — AI 学习实验区

> 这个目录不属于生产代码。它是「0 基础新学」阶段的练习场：学一个概念，立刻写几行代码把它跑出来看。

## 为什么单独建一个 `labs/`

`apps/` 和 `packages/` 将来放的是要长期维护、要过类型检查、要部署的代码。学习实验恰恰相反——它**读一遍就懂、跑一次就够、随时可以删**。混在一起会让「生产模块」长出大量一次性脚手架。

所以约定：**实验只进 `labs/`，不进 `apps/` 和 `packages/`。**

## 目录约定

```
labs/
├── package.json          ← 单一包 @medai/labs，依赖集中装
├── README.md             ← 本文件
├── shared/               ← 共用工具：loadEnv / requireKey / printBudget / printTable
├── phase1-cognition/     ← 对应路线图阶段一：认知地基
│   ├── 00-hello-llm/     ← 一次调用背后发生了什么
│   ├── 01-token-window/  ← Token / 上下文窗口 / 注意力稀释
│   ├── 02-boundary/      ← 幻觉 / 知识截止 / 过度自信
│   ├── 03-params/        ← temperature / Top-p / 推理模型
│   └── 04-cost/          ← 模型选型与成本估算
└── phase2-api/           ← 对应路线图阶段二：应用底座（大纲已定稿，7 个实验待建）
    ├── _sdk/             ← 逐篇长大的网关：Adapter / 错误分类 / 流式 / 执行器
    │   └── mock-provider.ts  ← 假模型：注入 401/429/500/超时，零成本
    └── 01-provider-router … 07-concurrency-sdk/  ← 一篇一目录，编号见阶段二大纲
```

实验目录内按需再建 `_fixtures/`（原始响应快照），不是每个实验都要有——见规则 8。

后续阶段按 `phase2-api/`、`phase3-context/`、`phase4-rag/` 依次新增，编号与 `docs/roadmap/ai-agent-learning-roadmap.md` 的十个阶段对齐。

## 九条规则

1. **一个实验一个目录**。目录内必须有 `README.md`，写清三件事：要验证什么 / 怎么跑 / 看到什么算成功。
2. **依赖统一装在 `labs` 包**。不要在实验子目录里再 `pnpm install`，避免每个实验一套 node_modules。
3. **以真实 API 调用为主**。每篇至少 3 次真实请求；单篇预算 ≤ ¥5，阶段一合计 ≤ ¥10（**阶段二收紧为单篇 ≤ ¥2、合计 ≤ ¥10**——那一阶段贵在调用次数而非 token 长度）。脚本启动时**必须打印本次预计消耗**（token 数 + 估算金额），跑之前就知道要花多少。
4. **密钥只从 `.env.local` 读**，仓库里只留 `.env.local.example`。缺 key 时给出中文提示和获取地址，不要直接抛栈。
5. **实验代码不追求生产质量**。可以有调试输出、硬编码参数、临时脚本；不进 `pnpm typecheck` 的强制门槛。**唯一例外是阶段二的 07 篇**：它的产物进 `packages/ai-sdk`，必须过 typecheck。
6. **结论要回填**。每个实验跑完，把结论写进 `docs/learning/progress.json` 的 `ai_development` 分组；文章直接基于实验输出写（AI 系列不设 `docs/notes/` 笔记层）。实验目录保留下来作为复现证据。
7. **增量实验（阶段二起）**。实验不再彼此独立，而是在 `phase2-api/_sdk/` 里逐篇加一块：01 建 Adapter → 01 加错误分类与降级 → 02 加流式 → 04 加结构化 → 07 加执行器并整体搬进 `packages/ai-sdk`。实验目录编号就是代码的演进顺序。
8. **录制复用（阶段二起，按需）**。只有「重跑成本高」或「需要精确复现同一份输入」的实验才建 `_fixtures/`——例如 04 篇的 20 条样本 × 3 种方式、07 篇的并发场景。快照里带 `capturedAt` 与文档链接。**默认路径仍是真实调用**：02 篇单次 ¥0.01，做完全部观察 ¥0.05，为省这点钱加一层「读快照 → 按时间戳重放」的间接，反而挡住初学者看懂主线。
9. **假模型（阶段二起）**。`_sdk/mock-provider.ts` 支持按脚本注入 401 / 402 / 429 / 500 / 超时 / 慢响应；错误路径与并发场景全部走 mock，不产生费用。

> 7~9 是阶段二引入的三条，详见 `docs/roadmap/ai-phase-02-api-foundation-outline.md` 的「实验区约定」。

## 怎么跑

> **前置版本要求**：Node ≥ 20、pnpm ≥ 9（根 `package.json` 的 `engines` 里有强制校验）。
> 如果你本机默认是 Node 14/16，先 `nvm use 22` 再执行下面的命令，否则 pnpm 会直接报 `Unsupported ENGINE`。

```bash
# 1. 装依赖（在仓库根目录）
pnpm install

# 2. 配密钥
cp .env.local.example .env.local   # 然后填入真实 key

# 3. 跑某个实验
pnpm --filter @medai/labs hello     # 或 token / boundary / params / cost
```

只有 `04-cost` 是纯本地计算、不需要 key，可以先跑它验证环境是否通。

## 与文章的关系

每个实验目录对应一篇文章（阶段一见 `docs/roadmap/ai-phase-01-cognitive-foundation-outline.md`，阶段二见 `docs/roadmap/ai-phase-02-api-foundation-outline.md`）。写作顺序是：**先跑通实验 → 记下真实输出 → 再写文章**。文章里的数字、截图、对比表都来自这里跑出来的结果，不编造。
