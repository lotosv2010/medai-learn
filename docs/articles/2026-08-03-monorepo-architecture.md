# Monorepo 架构完整指南：搭建流程、原理与最佳实践（面试收藏级）

> 面试官笑着说：「你们项目用 Monorepo，从零搭建一遍给我看看？」—— 能流畅答出这道题的人，不到 5%。

---

## 🎯 这篇文章解决什么问题

很多 Monorepo 文章停在「选型对比」层面，动手时才发现——目录怎么组织？turbo.json 怎么写？跨包依赖怎么配？Git Hook 怎么接入？这篇从空目录出发，讲透**搭建流程、每个工具的原理、工程化全链路配置**，以及面试高频考点的标准答案。

---

## 🤔 Monorepo vs Polyrepo：决策框架

**选 Monorepo 的核心信号**：

- 多包之间有共享代码（工具函数、类型定义、UI 组件）
- 需要原子提交（一个 PR 同时改前端 + 后端 + 共享类型）
- 团队规模 ≥ 3 人，包数量 ≥ 3 个

**选 Polyrepo 的核心信号**：

- 各包完全独立，不共享任何代码
- 团队分属不同业务线，发布节奏完全不同
- 包的技术栈差异极大（如一个是 Rust，一个是 Python）

> 💬 **面试官**：Monorepo 最大的代价是什么？你怎么解决？
>
> ✅ 标准答案：随包数增长，构建时间线性膨胀。用 Turborepo/Nx 的增量构建 + 缓存解决。
> 🎁 加分答案：pnpm 的硬链接机制让 `node_modules` 不重复存储，是 Monorepo 首选 pnpm 而非 npm/yarn 的核心原因。

---

## 🏗️ 从零搭建：标准目录结构

先看终态，再讲每步怎么来。一个生产可用的 Monorepo 最终目录：

```
my-monorepo/
├── apps/
│   ├── web/              ← Next.js 前端
│   └── api/              ← Hono 后端
├── packages/
│   ├── ui/               ← 共享组件库
│   ├── shared/           ← 共享类型 & 工具函数
│   └── config/           ← 共享 tsconfig/eslint 配置
├── package.json          ← 根包，private: true
├── pnpm-workspace.yaml   ← workspace 声明
├── turbo.json            ← Turborepo 任务图
├── tsconfig.base.json    ← 根 tsconfig
└── .husky/               ← Git Hooks
```

### 第一步：初始化根目录

```bash
mkdir my-monorepo && cd my-monorepo
git init
pnpm init
```

根 `package.json` 必须设 `"private": true`，防止根包被意外发布到 npm：

```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

### 第二步：声明 workspace

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

这一行告诉 pnpm：以上路径下每个目录都是一个 workspace 包。pnpm 会在根 `node_modules` 下为每个包创建符号链接，让 `@my/shared` 这样的内部包名可以像 npm 包一样被 `import`。

### 第三步：创建子包

```bash
mkdir -p apps/web apps/api
mkdir -p packages/ui packages/shared packages/config
```

每个子包有自己的 `package.json`，开发阶段 `exports` 直接指向 `src/`：

```json
{
  "name": "@my/shared",
  "version": "0.0.1",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts"
  }
}
```

发布时再改为 `dist/`，开发时免去每次改动后重新 build 的麻烦。

### 第四步：内部包相互引用

```bash
# 在 apps/web 中引用 packages/shared
pnpm add @my/shared --filter web --workspace
```

`package.json` 里写入 `"@my/shared": "workspace:^0.0.1"`——这是 pnpm workspace 协议，开发时是符号链接，发布时自动替换成真实版本号。

> 💬 **面试官**：`workspace:^` 和 `workspace:*` 有什么区别？
>
> ✅ 标准答案：`workspace:^0.0.1` 发布时替换为 `^0.0.1`（保留 semver 范围）；`workspace:*` 替换为当时的精确版本号。
> 🎁 加分答案：开源组件库用 `^`，给消费方升级自由；内部私有包用 `*` 锁定版本，避免意外升级破坏内部服务。

---

## ⚡ Turborepo：原理 + 完整配置

Turborepo 不是包管理器，是**任务调度引擎**。pnpm workspace 负责管理包，Turborepo 负责「以最快速度运行这些包的任务」。

### Task Graph 原理

Turborepo 把所有包的任务关系建成**有向无环图（DAG）**。`turbo.json` 的 `tasks` 字段描述这张图的边：

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "package.json"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "inputs": ["src/**", "__tests__/**"]
    },
    "lint": {
      "inputs": ["src/**", ".eslintrc*"]
    }
  }
}
```

`"^build"` 的 `^` 含义：**先等所有上游依赖包的 build 完成，再跑自己的 build**。`lint` 没有 `dependsOn`，各包完全并行执行。

### 本地缓存原理

缓存基于**内容寻址哈希**，计算范围：

```
hash(inputs 文件内容 + 依赖版本 + 声明的环境变量)
```

命中缓存时从 `~/.turbo/cache/<hash>/` 直接还原 `outputs`，整个任务跳过执行。

```bash
turbo run build
# 第一次：3 tasks, cached 0, 3 successful
# 代码未改动再次运行：3 tasks, cached 3  ← FULL TURBO
```

**最容易踩的坑**：`outputs` 没有正确声明。Next.js 生成 `.next/`，如果 `outputs` 里没写，缓存还原时这个目录不会被写回，导致「缓存命中但产物为空」的诡异问题。

> 💬 **面试官**：Turborepo 缓存失效的条件是什么？
>
> ✅ 标准答案：inputs 文件内容变化 / 依赖版本变化 / 声明的环境变量变化，任意一个让哈希改变，缓存失效。
> 🎁 加分答案：用 `turbo run build --dry` 预览哪些任务会命中缓存、哪些会重新执行，是排查缓存失效的标准工具。

### Remote Cache 配置

```bash
npx turbo login    # 登录 Vercel
npx turbo link     # 关联当前项目到 Remote Cache
```

也可以自托管缓存服务器，在 `turbo.json` 里配置 `apiUrl` 指向自己的缓存服务。原理：同一输入哈希，本地没有就去远端拉。A 跑过的构建，B `git pull` 后直接命中，CI 也不例外。

---

## 🏛️ Lerna 完整搭建流程

Lerna 是 Monorepo 的开创者，从零搭一遍是理解现代工具链演进的最好方式。

### 初始化

```bash
pnpm add -g lerna
mkdir g-lerna && cd g-lerna
lerna init --packages="packages/*"
```

执行后自动生成三个文件，同时检测到 pnpm 并生成 workspace 配置：

```
g-lerna/
├── packages/
├── package.json
├── lerna.json
└── pnpm-workspace.yaml
```

`lerna.json` 核心配置：

```json
{
  "packages": ["packages/*"],
  "version": "independent"
}
```

`"version": "independent"` 让各包独立维护版本号，适合工具库/组件库。填写具体版本号则是「固定模式」，所有包版本强制一致——适合框架本身（如早期 React 的 Monorepo）。

### 创建包

```bash
lerna create g-lerna --registry http://localhost:4873
lerna create @g-lerna/cli --registry http://localhost:4873
lerna create @g-lerna/init --registry http://localhost:4873
lerna create @g-lerna/create --registry http://localhost:4873
```

Lerna 本身的 CLI 架构拆分很有参考价值——职责单一，入口聚合：

```
g-lerna（入口，bin 指向 cli.js）
├── @g-lerna/cli     ← yargs 实例，全局参数配置
├── @g-lerna/init    ← init 命令实现
└── @g-lerna/create  ← create 命令实现
```

入口包通过 workspace 协议引用内部包：

```json
{
  "dependencies": {
    "@g-lerna/cli": "workspace:^0.0.1",
    "@g-lerna/init": "workspace:^0.0.1",
    "@g-lerna/create": "workspace:^0.0.1"
  }
}
```

### 跨包执行命令

```bash
lerna run build                    # 所有包执行 build script
lerna run test --scope g-lerna     # 只跑指定包的 test

lerna exec -- jest                 # 所有包执行 shell 命令
lerna exec --scope g-lerna -- jest
```

> 💬 **面试官**：`lerna run` 和 `lerna exec` 有什么区别？
>
> ✅ 标准答案：`lerna run` 调用各包 `package.json` 里的 npm scripts；`lerna exec` 在各包目录下执行任意 shell 命令。前者依赖包自己定义脚本，后者更灵活。

---

## 🔧 工程化配套：ESLint + Prettier + Husky

这套配置是 Monorepo「规范化」的完整链路，也是大厂面试必考的工程化题。

### ESLint + Prettier 分工

**ESLint 管代码质量，Prettier 管代码风格，两者职责不重叠。**

```bash
pnpm add eslint @eslint/js globals prettier \
  eslint-plugin-prettier eslint-config-prettier -D
```

根目录 `eslint.config.js`（ESLint v9 flat config）：

```javascript
const { defineConfig, globalIgnores } = require("eslint/config");
const globals = require("globals");
const js = require("@eslint/js");
const prettier = require("eslint-plugin-prettier");

module.exports = defineConfig([
  globalIgnores(["node_modules", "dist", "coverage"]),
  { files: ["**/*.js"],
    languageOptions: { globals: { ...globals.node, ...globals.es2021 } },
    plugins: { js, prettier },
    extends: ["js/recommended"],
    rules: { "prettier/prettier": "error" } },
]);
```

`prettier.config.js`：

```javascript
module.exports = { singleQuote: true };
```

`.editorconfig`（解决不同 IDE/系统换行符差异，跨平台团队必配）：

```ini
root = true
[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
```

### Git Hooks：Husky + lint-staged + commitlint

```bash
pnpm add -D husky lint-staged commitizen \
  @commitlint/cli @commitlint/config-conventional
pnpm exec husky init
echo "npx lint-staged" > .husky/pre-commit
echo "npx --no-install commitlint --edit \$1" > .husky/commit-msg
```

根 `package.json` 配置 lint-staged，**只检查本次提交的文件**：

```json
{
  "lint-staged": {
    "*.{js,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

`commitlint.config.js`（Conventional Commits 格式校验）：

```javascript
module.exports = {
  extends: ["@commitlint/config-conventional"],
};
```

提交格式：`feat(scope): 描述` / `fix: 描述` / `docs: 描述`。`BREAKING CHANGE:` 脚注会触发 major 版本号。

> 💬 **面试官**：Husky 和 lint-staged 为什么要配合使用？
>
> ✅ 标准答案：Husky 负责注册 Git Hook（commit 前触发脚本），lint-staged 负责只检查本次提交的文件而非全量。两者分工——前者是触发机制，后者是性能优化。
> 🎁 加分答案：大型项目全量 lint 可能耗时数分钟，lint-staged 把范围缩到「本次改动文件」，让 pre-commit 保持秒级响应。否则开发者会用 `--no-verify` 绕过，Hook 形同虚设。

---

## 🔗 跨包依赖：tsconfig paths 与 exports 字段

这是 Monorepo 里最容易踩坑的地方，面试官也最喜欢考。

### tsconfig paths：开发时的路径映射

根目录 `tsconfig.base.json`，集中管理所有内部包的路径别名：

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@my/shared": ["./packages/shared/src/index.ts"],
      "@my/shared/*": ["./packages/shared/src/*"],
      "@my/ui": ["./packages/ui/src/index.ts"]
    }
  }
}
```

各子包 `tsconfig.json` 继承根配置：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

**关键约束**：`paths` 只影响 TypeScript 编译期类型检查，不影响运行时模块解析。运行时依赖 `package.json` 的 `exports` 字段或 pnpm workspace 的符号链接。

### package.json exports：生产时的精确入口

```json
{
  "name": "@my/shared",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./utils": {
      "import": "./dist/utils/index.mjs",
      "types": "./dist/utils/index.d.ts"
    }
  }
}
```

`exports` 的三个核心价值：
- **封装**：只有显式声明的路径可被外部 `import`，内部文件对外不可见
- **条件导出**：同一入口根据环境（ESM/CJS/types）返回不同文件
- **子路径导出**：`@my/shared/utils` 按需引入，支持 tree-shaking

> 💬 **面试官**：tsconfig paths 和 package.json exports 各解决什么问题，在 Monorepo 里怎么配合？
>
> ✅ 标准答案：`paths` 是编译期别名，开发时指向 `src/`（改动后无需重新 build，类型实时感知）；`exports` 是运行期入口，发布后指向 `dist/`。开发阶段 Node 解析走 pnpm 符号链接，`paths` 保证 TS 类型正确；发布后 `exports` 接管模块解析。
> 🎁 加分答案：TypeScript 5.0+ 支持 `exports` 里的 `"types"` 条件字段，可以不配 `paths` 直接让 TS 识别 `dist/` 里的 `.d.ts`。但开发时仍推荐 `paths` 指向 `src/`，避免改了源码还要重新构建才能看到类型变化。

---

## 📦 版本发布：Changesets 工作流

### 三步流程

**第一步：PR 合并时记录变更意图**

```bash
pnpm add -D @changesets/cli
npx changeset init
npx changeset   # 交互式：选哪些包变了、patch/minor/major、写描述
```

生成 `.changeset/random-name.md`，随代码一起提交进仓库，可以被 review。

**第二步：发版前汇总所有 changeset**

```bash
npx changeset version
# 消费所有 .changeset/*.md，自动 bump 版本号，更新 CHANGELOG.md
```

**第三步：发布到 npm**

```bash
npx changeset publish
# 对所有版本号有变更的包执行 npm publish
```

### Lerna 发布流程

```bash
echo "pnpm test" > .husky/pre-push  # push 前跑测试
lerna version    # 交互式 bump 版本号，打 git tag
lerna publish    # 发布所有变更包到 npm
```

> 💬 **面试官**：Changesets 和 Lerna version 的核心区别？
>
> ✅ 标准答案：Lerna 是「发版时一次性决定版本号」；Changesets 是「每次 PR 就记录变更意图（.changeset 文件随代码提交）」，发版时只是消费这些记录。Changesets 的变更历史可 review、可追溯，更适合 CI 自动化。
> 🎁 加分答案：Changesets 原生支持 pre-release 模式（alpha/beta 通道），主干稳定的同时可以维护预发布版本；`lerna version --conventional-commits` 可分析 commit 自动决定版本，但粒度不如 Changesets 精细。

---

## ⚖️ Turborepo vs Lerna vs Nx：选哪个

| 维度 | Turborepo | Lerna | Nx |
|------|-----------|-------|-----|
| 核心定位 | 任务调度 + 缓存 | 版本发布 + 命令编排 | 全栈工程平台 |
| 构建加速 | 极强（本地+远端缓存） | 无 | 强（有缓存） |
| 版本发布 | 不管（配合 Changesets） | 内置 | 不管（配合 Changesets） |
| 代码生成 | 无 | `lerna create` | 极强（generators） |
| 学习成本 | 低 | 中 | 高 |
| 适合场景 | 中小型新项目 | 历史遗留项目 | 大型企业级 |

**2026 年的主流选择**：

- **新项目**：pnpm workspace + Turborepo + Changesets，最轻量，上手快，发版流程清晰
- **大型企业**：Nx，代码生成器和项目图在大团队才能发挥完整价值
- **Lerna 老项目**：v7 之后把构建委托给 Turborepo，定位回归「版本发布工具」，加 Turborepo 做加速不必迁移

> 💬 **面试官**：Turborepo 和 Lerna 能一起用吗？
>
> ✅ 标准答案：可以，职责不重叠。Lerna 管 `lerna version / publish`，Turborepo 管 `turbo run build/test`。Lerna v7 官方推荐结合 Turborepo 使用。
> 🎁 加分答案：新项目更推荐 Turborepo + Changesets。Changesets 的 PR 级别变更记录比 Lerna 发版时交互式更适合 CI 自动化，版本历史也更透明。

🔧 **真实场景**：在一个典型的全栈 AI 项目里，`packages/shared` 的类型变更后，`turbo run typecheck` 会按依赖顺序先检查 shared，再检查 web 和 api——不需要手动排序，也不会因并行导致「类型还没生成就开始检查」的竞态问题。

---

## 💡 一张图总结（面试速记）

| 知识点 | 一句话解释 | 考察频率 |
|--------|-----------|---------|
| pnpm workspace 协议 | `workspace:^x`，开发符号链接，发布替换真实版本 | ⭐⭐⭐⭐⭐ |
| 目录结构约定 | `apps/` 放应用，`packages/` 放共享包，根包设 private | ⭐⭐⭐⭐ |
| Turborepo task graph | DAG 驱动并行，`^` 表示等上游 build 完成 | ⭐⭐⭐⭐ |
| 缓存原理 | 输入哈希命中则跳过，outputs 必须正确声明 | ⭐⭐⭐⭐⭐ |
| tsconfig paths | 编译期别名，开发时指向 src/ 免重复构建 | ⭐⭐⭐⭐ |
| package.json exports | 运行期入口，条件导出 + 子路径封装 | ⭐⭐⭐⭐ |
| Husky + lint-staged | 前者触发 Hook，后者只检查本次改动文件 | ⭐⭐⭐⭐ |
| commitlint | Conventional Commits 校验，为自动 CHANGELOG 打基础 | ⭐⭐⭐ |
| Changesets 工作流 | PR 时记录变更意图，发版时自动 bump + CHANGELOG | ⭐⭐⭐⭐⭐ |
| Lerna independent 模式 | 各包独立版本，适合组件库/工具库 Monorepo | ⭐⭐⭐ |

---

## 📝 留个问题

如果让你从零设计一个有 10 个包的 Monorepo，你会怎么组织目录结构、选哪套工具链、怎么设计 Git Hook 流程？说说你的选型理由和会踩的坑。

---

> 🔖 这是「前端工程化系列」第 4 篇。上一篇：《Git 核心原理全攻略：四区五态、撤销回滚、分支策略（面试收藏级）》；下一篇预告：《构建工具原理—— Webpack 5》
