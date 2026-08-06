# 前端工程化系统大纲

> 基于 2024-2025 年市场最佳实践整理，覆盖从工程初始化到生产交付的完整链路。

---

## 一、模块系统与包管理

### 1.1 JavaScript 模块规范
- CommonJS / AMD / UMD 历史演进
- ES Modules：静态分析、Tree Shaking 基础、import.meta
- 模块解析算法（Node 与浏览器差异）

### 1.2 包管理器
- npm / yarn / pnpm 对比：存储机制、安装速度、幽灵依赖
- pnpm workspace：symlink 原理、catalog 特性
- lock 文件的意义与 CI 强制校验

### 1.3 Monorepo 架构
- 何时选 Monorepo vs Polyrepo
- Turborepo：task graph、本地缓存、Remote Cache
- Nx：项目图、Affected 命令、代码生成器
- 跨包依赖管理：tsconfig paths、package.json exports 字段
- 版本发布：Changesets 工作流

---

## 二、构建工具原理

### 2.1 Webpack 5
- 核心概念：Entry / Output / Loader / Plugin / Module Graph
- Tapable 插件体系：SyncHook / AsyncHook 原理
- Loader 执行链：pitch 阶段、资源转换管道
- SplitChunks 策略：async chunks / vendor 分离
- Module Federation：跨应用共享模块，微前端基础

### 2.2 Vite
- 开发态：ESM Dev Server + esbuild 预构建
- HMR 机制：模块热替换协议
- 生产态：Rollup 打包 + 插件体系
- Plugin API：transformIndexHtml / resolveId / load 钩子

### 2.3 Rollup / esbuild / SWC / Oxc
- Rollup：库打包标准，output.format 对比
- esbuild：Go 实现，极速 transform，适用场景与限制
- SWC：Rust 实现，Babel 替代方案
- Oxc：下一代工具链（parser + linter + transformer 一体化）

### 2.4 构建优化通用策略
- Tree Shaking：sideEffects 配置、ESM 静态分析边界
- Code Splitting：动态 import、路由懒加载、预加载（preload/prefetch）
- 持久化缓存：contenthash、长效缓存策略
- Bundle 分析：webpack-bundle-analyzer、rollup-visualizer、vite-bundle-visualizer

---

## 三、TypeScript 工程化

### 3.1 项目配置
- tsconfig.json 关键字段：strict、moduleResolution、paths、composite
- Project References：Monorepo 增量编译
- 类型声明文件：.d.ts 生成策略、@types 管理

### 3.2 类型安全全链路
- 运行时校验：Zod / Valibot 与 TS 类型联动
- Branded Types：防止原始类型滥用
- 端到端类型安全：tRPC / GraphQL Code Generator

### 3.3 构建集成
- tsc vs transpile-only（esbuild/swc）的取舍
- 类型检查与 CI 的集成策略（typecheck 独立 job）

---

## 四、代码质量与规范

### 4.1 静态分析
- ESLint Flat Config（v9+）：规则分层、共享配置设计
- 常用规则集：eslint-plugin-react / @typescript-eslint / import
- 自定义规则：AST 遍历基础

### 4.2 代码格式化
- Prettier：printWidth / 分号 / 引号约定
- EditorConfig：跨编辑器基础统一

### 4.3 Git 工作流规范
- Husky：Git Hooks 安装与管理
- lint-staged：只检查暂存文件，保证提交速度
- Commitlint：Conventional Commits 规范
- Commitizen：交互式提交辅助

### 4.4 测试体系
- 测试金字塔：Unit / Integration / E2E 比例策略
- Vitest：与 Vite 同配置、原生 ESM、并发执行
- React Testing Library：以用户行为为中心的组件测试
- Playwright：E2E 测试、多浏览器、网络拦截
- MSW：Service Worker 级别的 API Mock

---

## 五、CSS 工程化

### 5.1 方案对比
- CSS Modules：局部作用域原理
- CSS-in-JS（Styled Components / Emotion）：运行时 vs 零运行时
- Tailwind CSS：原子化、JIT 编译、设计 Token 集成
- Vanilla Extract：TypeScript 驱动的零运行时 CSS

### 5.2 设计系统工程化
- CSS Variables（自定义属性）：主题切换实现
- Design Token：Style Dictionary 管理 Token，多平台输出
- Storybook：组件文档、视觉测试（Chromatic）

---

## 六、性能工程化

### 6.1 加载性能
- Core Web Vitals：LCP / CLS / INP 定义与优化手段
- 资源优先级：preload / prefetch / dns-prefetch / preconnect
- 图片优化：WebP/AVIF、lazy loading、srcset 响应式图片
- 字体优化：font-display: swap、子集化、可变字体

### 6.2 运行时性能
- Chrome DevTools：Performance 面板、火焰图解读
- 长任务拆分：scheduler.postTask / requestIdleCallback
- 虚拟列表：TanStack Virtual 原理与实现
- Web Worker：CPU 密集任务迁移

### 6.3 监控与度量
- Lighthouse CI：PR 门禁集成
- Web Vitals 上报：PerformanceObserver API
- 错误监控：Sentry 接入、Source Map 管理
- RUM（真实用户监控）vs 合成监控对比

---

## 七、CI/CD 与自动化

### 7.1 GitHub Actions
- 工作流语法：jobs / steps / matrix strategy
- 缓存策略：actions/cache + pnpm store
- 环境变量与 Secrets 管理
- Reusable Workflows：跨仓库复用

### 7.2 质量门禁
- PR 必检：typecheck + lint + test + build
- 覆盖率门禁：Codecov / Coveralls
- Bundle Size 门禁：bundlesize / size-limit
- 视觉回归：Chromatic / Percy

### 7.3 部署策略
- 预览部署：Vercel Preview / Netlify Deploy Previews
- 蓝绿部署 / 金丝雀发布原理
- Feature Flags：LaunchDarkly / 自研方案

---

## 八、微前端架构

### 8.1 核心方案
- Module Federation（Webpack 5）：运行时共享、版本协商
- qiankun / Wujie：基于 single-spa 的封装，iframe 沙箱
- Micro App（字节）：WebComponent 容器隔离

### 8.2 关键问题
- JS 沙箱隔离：Proxy 沙箱 vs iframe 沙箱
- CSS 隔离：Shadow DOM / 动态前缀
- 路由分发：主应用路由拦截机制
- 状态共享：CustomEvent / 共享 Store 设计

---

## 九、DevOps 与容器化

### 9.1 Docker
- 多阶段构建：减小镜像体积
- Layer 缓存优化：依赖层与代码层分离
- Next.js standalone 模式：最小化生产镜像

### 9.2 基础设施即代码
- Nginx 配置：SPA 路由、gzip、缓存头
- CDN 策略：静态资源 vs HTML 缓存差异
- 环境管理：dev / staging / prod 配置隔离

---

## 十、开发者体验（DX）

### 10.1 本地开发
- 开发服务器：HMR 原理、端口代理配置
- 调试体验：Source Map 类型对比（eval / cheap-module / source-map）
- VS Code 工作区配置：推荐扩展、调试配置

### 10.2 代码生成
- Plop / Hygen：脚手架模板，减少重复代码
- OpenAPI Generator / orval：根据接口文档生成 SDK

### 10.3 文档工程化
- VitePress / Docusaurus：技术文档站点
- TypeDoc：API 文档自动生成
- ADR（架构决策记录）：长期决策追溯

---

## 学习路径建议

```
基础层（必须掌握）
  └── 模块系统 → 构建工具原理 → TypeScript 工程化 → 代码质量

应用层（项目驱动）
  └── CI/CD → 性能工程化 → CSS 工程化 → 微前端

进阶层（专项深入）
  └── 微前端架构 → DevOps → DX 工程化
```

---

## prompt

```text
今天学习：{{ Core Web Vitals 2026 全景——从指标到优化到归因 }}

知识点范围：
{{- **主题**：指标是一切优化的度量衡，本篇同时覆盖 LCP / INP 专项深挖
- **字数预警**：内容密度高，目标 4500~5000 字；写作时执行「删除 20%」红线

**一、Core Web Vitals 全貌**
- LCP / CLS / INP 定义、阈值、常见误区
- 辅助指标：FCP / TTFB / TBT
- **Long Animation Frames API (LoAF)** 替代 Long Tasks：为什么、如何用
- **web-vitals v4 attribution build**：把指标归因到具体元素/脚本
- Lab 数据 vs Field 数据为什么会不一致
- 指标选择决策矩阵（不同业务优先看哪个）

**二、LCP 专项——首屏最大内容的一切**
- LCP 候选算法（图片 / 文本 / 背景图三类元素的判定规则）
- `fetchpriority="high"` 与 `<link rel="preload">` 的正确姿势（及常见误用）
- 字体加载 FOIT / FOUT 与 `font-display` 策略
- 首屏 CSS 内联方案（Critical CSS）

**三、INP 专项——交互延迟的攻防**
- Event Timing API 与 LoAF 的关系（事件循环基础参考第 1 篇）
- `yieldToMain` / `scheduler.yield` / `isInputPending` 三种让出主线程方案对比
- React 并发模式（`useTransition` / `useDeferredValue`）对 INP 的影响

**四、手写实现**
- 一个 LCP 探针，实时输出候选变化
- 一个长任务拆分调度器 + INP 归因面板

**五、完整代码**
- 生产级 LCP + INP 双优化模板（Next.js + `next/image` + `useTransition`）

- **承上启下**：有了指标，进入监控篇——把采集搬上生产
}}

分析角度（每个子主题都按此展开）：
A · 实操五段式（适用于有「手写内核」的篇章）

是什么 → 核心原理 → 手写实现（关键代码） → 生产级最佳实践 → 完整最佳实践代码

B · 概念四段式（适用于概念/架构/方法论篇章）

真实场景引入 → 概念/机制拆解 → 决策矩阵或对比表 → 行动清单

已有笔记：
{{
@docs/notes/35 前端性能优化介绍.md
@docs/notes/36 性能指标.md
@docs/notes/37 Web 性能指标.md
@docs/notes/38 Web 性能测试.md
@docs/notes/39 前端监控之Lighthouse.md
@docs/notes/40 前端监控详解.md
}}

规则：
1. 先阅读以上笔记，找出缺失或浅尝辄止的知识点
2. 补全内容（保留原有内容，只增不删），保留图片
3. 将整理后的内容生成公众号文章，输出到 docs/articles/
4. 文章结构：先出大纲等我确认，再逐节写作

```

*整理时间：2026-08-01 | 参考：State of JS 2024 / Vite 官方 / Turborepo 官方 / web.dev*
