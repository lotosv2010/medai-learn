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

```
今天我们学习 xxx ，主要从基本使用、项目搭建流程、最终项目配置结构以及目录、原理、最佳实践等分析讲透彻；下面是我的一些笔记：@xxx.md，尽量完整的整理这些笔记，做查缺补漏，不要删减内容，最终生成一个公众号文章，放在@docs/articles 下面，先规划后书写
```

*整理时间：2026-08-01 | 参考：State of JS 2024 / Vite 官方 / Turborepo 官方 / web.dev*
