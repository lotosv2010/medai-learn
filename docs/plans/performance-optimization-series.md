# 前端性能优化篇 · 文章规划（5 篇）

> 所属系列：前端性能与监控实战 · 模块四
> 视角：开发侧（架构 + 构建） → 用户侧（加载 + 运行时 + 感知）
> 写作原则：由浅入深，从「会用」到「懂原理」，字数不设上限

---

## 补全清单：原规划遗漏的知识点

在完善各篇大纲前，先列出原规划中未覆盖、但面试和实战中高频出现的内容：

| 遗漏点 | 归入哪篇 |
|--------|---------|
| 防抖（debounce）/ 节流（throttle）原理与手写 | 第 10 篇·运行时 |
| 图片格式选择（WebP/AVIF/SVG）+ 响应式图片 srcset | 第 9 篇·加载（新增独立章节） |
| 图片懒加载：`loading="lazy"` vs IntersectionObserver 手写 | 第 9 篇·加载 |
| 字体优化：`font-display` / FOIT / FOUT / 字体子集化 | 第 9 篇·加载 |
| requestIdleCallback / requestAnimationFrame 区别与用法 | 第 10 篇·运行时 |
| 内存泄漏排查：闭包 / 全局变量 / 未清理监听器 | 第 10 篇·运行时 |
| DNS 预解析 `<link rel="dns-prefetch">` / preconnect | 第 9 篇·加载 |
| 关键渲染路径（Critical Rendering Path）优化 | 第 9 篇·加载 |
| CSS 性能：选择器复杂度 / 强制同步样式 / 动画属性 | 第 10 篇·运行时 |
| Script 加载策略：defer / async / module 差异 | 第 9 篇·加载 |
| 首屏 Critical CSS 内联 | 第 9 篇·加载 |
| IndexedDB / localStorage 性能边界 | 第 10 篇·运行时 |
| 预渲染 / 骨架屏自动化生成 | 第 11 篇·感知 |
| 白屏率兜底策略 | 第 11 篇·感知 |
| 大文件分片上传 + 进度反馈 | 第 10 篇·运行时（新增） |
| 渲染阻塞资源识别与消除 | 第 9 篇·加载 |
| CSS containment / `contain` 属性 | 第 10 篇·运行时 |

---

## 第 7 篇：架构层优化：从 CSR 到 PPR，五种渲染范式怎么选（面试收藏级）

### 标题说明
聚焦「怎么选」这个决策场景，PPR 是亮点但不是全部，标题不堆砌技术词。

### 大纲

**一、为什么选错渲染范式，优化再多也白搭**
- 真实场景：同一个列表页，CSR vs SSR 的 LCP 差距实测（附 waterfall 图）
- 渲染范式是性能的「出生决定」，后期优化是「后天弥补」

**二、五种范式逐个拆解（基础用法 → 原理）**
- CSR：React 挂载流程，首屏白屏的根本原因
- SSR：服务端生成 HTML，水合（Hydration）是什么、为什么有成本
- SSG：构建时生成，适合哪类页面，内容更新的代价
- ISR：revalidate 机制，stale-while-revalidate 的类比
- RSC：Server Component 不参与水合，zero bundle 如何实现

**三、Streaming SSR：让首字节更早到达**
- `<Suspense>` 边界与分块 HTML flush
- 骨架先到、数据后填的用户体验
- Next.js `loading.tsx` 的本质

**四、PPR（Partial Prerendering）：静态 + 动态的最优解**
- 静态外壳 + 动态孔洞，一张图讲清楚
- 与纯 SSR / 纯 SSG 的性能对比
- Next.js 15 中如何开启，`unstable_noStore` / `connection()` 标记动态边界

**五、选型决策树**
- 博客 / 文档 → SSG
- 电商详情 / 新闻 → ISR 或 PPR
- 用户个性化数据 → SSR 或 RSC + Client Component
- 后台管理系统 → CSR（不要盲目 SSR）

**六、手写实现**
- 最小 SSR 示例（Node.js `renderToString` + 客户端水合，~50 行）
- Next.js 15 PPR Demo：静态 Header + 动态推荐列表

**七、行动清单 + 下一篇预告**

### 涉及知识点
- React Fiber 的 Selective Hydration 与 Suspense 协议
- Streaming SSR 与 HTTP chunked transfer encoding
- RSC Payload 序列化格式
- PPR 的静态分析边界（何时触发动态渲染）
- `generateStaticParams` / `revalidate` / `dynamicIO` 配置
- 水合不匹配（Hydration Mismatch）成因与排查

---

## 第 8 篇：工程构建优化：Tree Shaking 为什么没生效，以及 Vite 产物瘦身实战（面试收藏级）

### 标题说明
去掉「2.4MB → 600KB」这类数字承诺，聚焦技术手段。

### 大纲

**一、问题从哪来：bundle 体积诊断流程**
- `rollup-plugin-visualizer` 报告判读（色块含义、面积代表什么）
- `vite-bundle-analyzer` 与 `source-map-explorer` 对比
- 一个真实诊断案例：找出是谁塞大了 bundle

**二、体积预算：先定标准，再优化**
- JS / CSS / 图片分别应该多少（LCP 2.5s 倒推网络预算）
- `performance.getEntriesByType('resource')` 在线监测超标资源

**三、Tree Shaking：为什么没生效**
- ESM 静态分析原理（import/export 在编译期可确定）
- 四大失效原因：`sideEffects` 缺失 / 桶文件 / CJS 模块 / 带副作用的导入
- 修复方法逐一演示

**四、Code Split：按需加载的三种粒度**
- 路由级：`React.lazy` + `Suspense`，实测首屏体积变化
- 组件级：ECharts / Monaco Editor 重型依赖的动态导入
- vendor 拆分：`manualChunks` 策略，避免缓存失效

**五、Vite 生产构建调优**
- `build.rollupOptions` 常用配置速查
- Brotli 压缩配置（比 Gzip 体积小 20-30%）
- CSS 代码分割与 Critical CSS 内联方案
- 构建缓存：`cacheDir` 加速 CI 二次构建

**六、构建工具横评（性能视角一张表）**
- Vite / Rspack / Turbopack / Rolldown：冷启动 / HMR / 产物体积
- 什么场景值得迁移 Rspack（大型项目 webpack 迁移成本分析）

**七、Lighthouse CI 接入**
- GitHub Actions 配置，超预算阻断 PR 合并
- `lighthouserc.json` 断言语法

**八、完整代码**
- 一份可复用的 `vite.config.ts` 生产优化模板
- CI 性能卡点 workflow 配置

**九、行动清单 + 下一篇预告**

### 涉及知识点
- Rollup Tree Shaking 的标记-清除（Mark & Sweep）算法
- `sideEffects` 字段在 `package.json` 与 `vite.config` 中的作用域差异
- Dynamic `import()` 的 chunk 命名与预加载 hint
- `splitVendorChunkPlugin` 的 heuristic 策略
- Brotli 压缩级别与 CPU 成本权衡
- Lighthouse CI `assertions` 配置语法（`warn` / `error` 级别）
- Rspack 的 Rust 增量编译与 webpack 兼容层

---

## 第 9 篇：网络资源加载优化：HTTP 缓存 + 图片懒加载 + 预测式导航一篇打通（面试收藏级）

### 标题说明
覆盖面广，标题用「全攻略」明示，读者知道这是一篇索引型深度文章。

### 大纲

**一、加载性能的诊断起点**
- Network 面板 waterfall 图判读（排队 / TTFB / 下载 各阶段含义）
- 阻塞渲染资源识别：Coverage 面板找未使用的 CSS/JS

**二、Script 加载策略（基础但高频考点）**
- `defer` vs `async` vs `type="module"` 执行时机对比图
- 经典陷阱：`async` 脚本的执行顺序不可预期
- 最佳实践：非关键脚本统一 `defer`

**三、DNS 与连接优化**
- `<link rel="dns-prefetch">` vs `preconnect`：何时用哪个
- 减少域名数量 vs HTTP/2 多路复用的权衡

**四、HTTP 缓存三件套（由浅入深）**
- 强缓存：`Cache-Control: max-age` / `immutable`
- 协商缓存：`ETag` vs `Last-Modified`，哪个更可靠
- `stale-while-revalidate`：后台刷新的用户无感升级
- 缓存策略决策矩阵（HTML / JS chunk / CSS / 图片 / API 各用什么）

**五、Service Worker 离线缓存**
- 生命周期（install / activate / fetch 三阶段）
- Cache-first / Network-first / Stale-while-revalidate 策略代码
- Workbox 快速接入 vs 手写的取舍

**六、图片优化（完整专题）**
- 格式决策树：JPEG / PNG / WebP / AVIF / SVG 各适合什么
- 响应式图片：`srcset` + `sizes` 属性，让浏览器自动选图
- `loading="lazy"` 原生懒加载 vs IntersectionObserver 手写（含代码）
- `fetchpriority="high"` 给 LCP 图片提权
- `<picture>` 元素的格式降级写法

**七、字体优化**
- FOIT / FOUT / FOFT 三种闪烁现象原理
- `font-display: swap / optional / fallback` 选哪个
- `<link rel="preload" as="font">` 预加载关键字体
- 字体子集化（unicode-range + 构建工具插件）

**八、关键渲染路径（CRP）优化**
- CSS 阻塞渲染的根本原因
- Critical CSS 内联：提取首屏样式、异步加载剩余样式
- `<link rel="preload" as="style" onload>` 异步 CSS 技巧

**九、预测式加载（高阶）**
- `preload` / `prefetch` / `prerender` 语义与使用边界
- **Speculation Rules API**：声明式 prerender，JSON 规则配置
- **103 Early Hints**：让预加载提前一个 RTT（Nginx 配置示例）
- HTTP/2 多路复用与 HTTP/3 QUIC 对加载的影响

**十、完整代码**
- 一份 Next.js 应用的缓存头配置（`next.config.ts` headers）
- 图片懒加载组件（IntersectionObserver，~40 行）

**十一、行动清单 + 下一篇预告**

### 涉及知识点
- 浏览器预加载扫描器（Preload Scanner）工作原理
- `defer` / `async` 与 HTML 解析器的交互时序
- HTTP 缓存优先级：`Cache-Control` > `Expires`
- `stale-while-revalidate` 的 RFC 规范语义
- Service Worker `FetchEvent.respondWith` 拦截链路
- IntersectionObserver `rootMargin` 提前加载策略
- `font-display: optional` 的零布局偏移优势
- Speculation Rules `eagerness: immediate / eager / moderate / conservative`
- HTTP/3 0-RTT 握手与连接迁移原理

---

## 第 10 篇：运行时优化：手写防抖节流 + 重排重绘 + React 性能问题排查（面试收藏级）

### 标题说明
防抖节流是高频面试点，放进标题吸引读者，同时覆盖渲染和内存两条主线。

### 大纲

**一、问题定位：Performance 面板使用入门**
- 录制一次页面交互，找到 Long Task 和 Layout Shift
- 火焰图（Flame Chart）判读：宽 = 耗时，深 = 调用栈

**二、防抖（debounce）与节流（throttle）**
- 使用场景对比：搜索输入框 vs 滚动/resize 事件
- 手写 debounce（leading / trailing 两种触发）
- 手写 throttle（时间戳版 + 定时器版）
- 原理：闭包 + 定时器，clearTimeout 的关键作用
- 常见误用：在 React 函数组件中每次渲染重新创建（useMemo / useRef 解法）

**三、重排（Reflow）与重绘（Repaint）**
- 触发重排的 CSS 属性清单 vs 只触发合成的属性
- 强制同步布局（Layout Thrashing）：读写交替的代价
- FastDOM 模式：批量读 → 批量写
- `transform` / `opacity` 走合成线程的原理
- `will-change` 正确使用：提前创建合成层，不要滥用

**四、requestAnimationFrame 与 requestIdleCallback**
- rAF：在下一帧绘制前执行，做动画的正确方式
- rIC：在浏览器空闲时执行，适合非紧急任务
- 两者与主线程调度的关系（结合第 1 篇事件循环）

**五、React 性能优化**
- `React.memo`：浅比较，什么情况下失效
- `useMemo` / `useCallback`：依赖数组的陷阱，过度优化反而变慢
- 状态下沉与组件拆分：减少不必要重渲染的根本方法
- `useTransition` / `useDeferredValue`：并发模式下的非紧急更新
- React Compiler（RC）：自动 memo 化，何时手动优化仍有必要
- Context 性能问题：大 Context 导致全树重渲染，拆分方案

**六、长列表虚拟化**
- 为什么 DOM 节点多了会卡（Layout 成本随 DOM 数量线性增长）
- `@tanstack/react-virtual` 使用示例
- 手写最小虚拟列表（~60 行，固定行高版）
- 动态行高方案（先渲染后测量 + 缓存高度）

**七、Web Worker：把计算移出主线程**
- 适用场景：图片处理 / 大数据排序 / 加密计算
- 基础通信：`postMessage` + `onmessage`
- Comlink 封装成 RPC 风格（~20 行）
- SharedArrayBuffer + Atomics：共享内存通信（需要 COOP/COEP 头）

**八、内存泄漏排查**
- 三大常见来源：未清理的定时器 / 事件监听器 / 闭包持有大对象
- Chrome Memory 面板：Heap Snapshot 对比找泄漏对象
- React 中的典型泄漏：`useEffect` 未返回 cleanup
- WeakMap / WeakRef 的正确使用场景

**九、其他运行时优化技巧**
- `content-visibility: auto`：跳过屏外内容的 layout + paint
- CSS containment：`contain: layout style paint` 隔离影响范围
- `localStorage` / `sessionStorage` 同步阻塞问题，大数据用 IndexedDB
- 大文件分片上传：`File.slice` + 并发控制 + 断点续传思路

**十、完整代码**
- 手写 debounce + throttle（含 TypeScript 类型，~50 行）
- 手写最小虚拟列表组件
- useEventListener hook（自动 cleanup，~20 行）

**十一、行动清单 + 下一篇预告**

### 涉及知识点
- 闭包与词法作用域（debounce/throttle 的内存模型）
- 浏览器渲染流水线的 Layout / Paint / Composite 边界
- `getBoundingClientRect` / `offsetHeight` 等触发强制同步布局的 API
- GPU 合成层提升条件与内存成本
- React Reconciler bailout 路径（memo 生效的底层原因）
- React Compiler 的自动依赖追踪（Forget 算法）
- Scheduler 的 `MessageChannel` 时间切片机制
- `@tanstack/react-virtual` 的 overscan 与滚动监听
- Comlink 的 `Proxy` + `MessageChannel` 通信模型
- Chrome DevTools Memory 面板的 Retainers 树解读
- `content-visibility` 的 CSS containment 规范
- IndexedDB 异步 API 与事务模型

---

## 第 11 篇：感知性能优化：让「慢」看起来不慢——骨架屏、乐观更新与页面过渡实战（面试收藏级）

### 标题说明
标题保持不变，内容补充白屏兜底和动画无障碍两个遗漏点。

### 大纲

**一、感知性能 vs 客观性能**
- 为什么 LCP 2.0s 用户还说「慢」（等待心理学：不确定的等待更痛苦）
- Doherty Threshold：响应时间 400ms 以内用户感知「即时」
- 客观指标好但感知差的三种典型场景

**二、Loading 状态设计：骨架屏**
- 骨架屏 vs Spinner vs 进度条：各自适合什么场景
- CSS shimmer 动画实现（`@keyframes` + `background-position`，~20 行）
- 与 React `Suspense` fallback 的组合方式
- 骨架屏自动生成思路：DOM 快照 + CSS 灰化
- 骨架屏的 CLS 风险：占位尺寸不准导致布局偏移

**三、白屏兜底策略**
- 白屏检测：`requestIdleCallback` 后采样关键节点可视尺寸（引用第 5 篇监控）
- 兜底 UI：最小化静态 HTML fallback，确保用户至少看到内容框架
- 错误边界（Error Boundary）+ 降级渲染

**四、Optimistic UI（乐观更新）**
- 原理：先更新本地状态，后等待服务端确认
- React Query `useMutation` 的 `onMutate` / `onError` / `onSettled` 三阶段
- 失败回滚策略（rollback + toast 提示）
- 适合场景：点赞 / 收藏 / 评论发布，不适合：支付 / 权限变更

**五、View Transitions API（从用法到原理）**
- 基础用法：`document.startViewTransition(() => updateDOM())`
- 浏览器快照机制：old / new 两帧截图 + CSS 动画过渡
- 自定义动画：`::view-transition-old` / `::view-transition-new` 伪元素
- 跨文档 MPA 过渡：`@view-transition { navigation: auto }` CSS 规则
- 与 Next.js App Router / React Router 的集成
- 兼容性处理：`document.startViewTransition` 特性检测

**六、动画性能**
- 60fps 的含义：每帧 16.6ms，主线程任务必须在这之内完成
- CSS 动画 vs JS 动画（rAF）vs Web Animations API 选型
- 只用 `transform` + `opacity` 做动画的原因（Compositor 线程）
- `prefers-reduced-motion`：无障碍适配，系统级减弱动画设置

**七、完整代码**
- Skeleton Screen 组件（可复用，支持多种布局，~60 行）
- View Transitions 列表 → 详情丝滑过渡（Next.js App Router）
- Optimistic 点赞按钮（React Query，~40 行）

**八、行动清单 + 系列收尾预告**

### 涉及知识点
- 感知等待心理学（Doherty Threshold / 不确定性放大等待感）
- CSS `contain: layout style paint` 与骨架屏性能
- React Suspense 的 transition 语义与 fallback 触发时机
- React Query `onMutate` 的 context 传递机制
- `document.startViewTransition` 的双帧快照原理
- View Transitions Level 2（跨文档）的触发条件
- Web Animations API 与 Compositor 线程的调度关系
- `prefers-reduced-motion` 媒体查询与 WCAG 2.1 AA 要求

---

## 篇幅与节奏建议

| 篇 | 核心卖点 | 字数参考 | 写作提示 |
|----|---------|---------|---------|
| 第 7 篇 | PPR 决策树 + 手写 SSR | 不限，深挖水合原理 | RSC 原理图是重点，结尾必须有 PPR 可运行 Demo |
| 第 8 篇 | Tree Shaking 失效四原因 + CI 卡点 | 不限，代码为主 | 严守「产物性能」视角，不讲 Vite 插件机制 |
| 第 9 篇 | 图片优化 + CRP + Speculation Rules | 不限，内容最全 | 图片和字体是原计划遗漏的重点，要写透 |
| 第 10 篇 | 防抖节流手写 + 内存泄漏排查 | 不限，手写代码多 | 防抖节流要讲到原理（闭包），不只是背代码 |
| 第 11 篇 | View Transitions 原理 + 乐观更新 | 不限，体验类轻松写 | View Transitions 兼容性标注 Chrome 111+ |
