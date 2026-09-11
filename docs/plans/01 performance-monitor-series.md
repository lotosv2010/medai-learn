# 前端性能与监控系列公众号文章规划

## 系列定位

**系列标题**：前端性能与监控实战

**核心主线**：「地基 → 度量 → 监控 → 优化 → 收尾」——先看得见问题，再系统解决问题。

**读者画像**：有 2~5 年经验的前端工程师，知道性能重要但不成体系，想系统补全这块短板。

**写作风格**：问题驱动，每篇以真实场景切入，配图 + 关键代码片段，结尾统一附「本篇行动清单」+「下一篇预告」。

---

## 两套写作主线（按篇章类型选择）

**A · 实操五段式**（适用于有「手写内核」的篇章）
> 是什么 → 核心原理 → 手写实现（关键代码） → 生产级最佳实践 → 完整最佳实践代码

**B · 概念四段式**（适用于概念/架构/方法论篇章）
> 真实场景引入 → 概念/机制拆解 → 决策矩阵或对比表 → 行动清单

---

## 总篇数：12 篇（含第 0 篇导读）

分为 5 个模块：地基（1）→ 度量（1）→ 监控（4）→ 优化（5）→ 收尾（1），首末加导读。

> **结构调整说明**：
> - 原「地基篇」第 2 篇（CWV 全景）移入度量模块，地基篇聚焦浏览器底层原理与渲染流程。
> - 原「度量篇」LCP 专项和 INP 专项合并入 CWV 全景篇，形成一篇「度量完全指南」（约 5000 字，接近上限，写作时执行「删除 20%」红线）。
> - 监控篇内容参照生产级 RUM 平台实现全面扩充，加入 SDK 插件化架构、上报通道降级、Source Map 还原、告警引擎等工业级细节。

---

## 模块零：导读篇（1 篇）

> 目标：建立读者对全系列的整体认知，用一张完整地图吸引收藏和持续追更。

### 第 0 篇：前端性能与监控，12 篇讲清楚——系列开篇

- **主线**：B · 概念四段式
- **主题**：建立系列地图与阅读路径
- 为什么重做性能：用真实业务场景说明代价（首屏慢 1s 的转化损失 / INP 高的投诉曲线）
- 系列全貌：12 篇的知识地图（地基 → 度量 → 监控 → 优化 → 收尾）
- 四层性能模型（架构 / 加载 / 渲染 / 感知）与每篇的定位
- 三种读者路径：新手顺读 / 进阶跳读 / 救火反查
- **承上启下**：收藏本篇作为导航

---

## 模块一：地基篇（1 篇）

> 目标：让读者先理解「浏览器如何工作」和「页面如何渲染」，建立后续所有优化的心智模型。

### 第 1 篇：从 URL 到像素——浏览器底层原理与渲染全流程

- **主线**：B · 概念四段式
- **主题**：建立所有优化的心智模型

**浏览器进程架构**
- Browser 进程 / Renderer 进程 / GPU 进程 / Network 进程的分工
- 站点隔离（Site Isolation）与进程沙箱；为什么 Tab 崩溃不影响其他 Tab

**V8 与 JavaScript 执行原理**
- 解析（Parse）→ 字节码（Bytecode）→ JIT 编译（TurboFan）流水线
- 隐藏类（Hidden Class）与内联缓存（IC）对性能的影响
- 内存区域：堆 / 栈 / 调用栈；GC 分代（新生代 Scavenge / 老生代 Mark-Compact）
- 事件循环（Event Loop）：宏任务 / 微任务 / 渲染帧时机

**渲染流水线（The Pixel Pipeline）**
- Navigation Timing 时序（DNS → TCP → TLS → HTTP → HTML 解析 → DOM/CSSOM → Render Tree → Layout → Paint → Composite）
- HTML 流式解析、CSS 阻塞渲染、JS 阻塞 HTML 解析的根本原因
- GPU 图层与合成线程 vs 主线程分工（为什么 `transform` 不触发重排）
- 重排（Reflow）vs 重绘（Repaint）vs 合成（Composite）代价对比表

- **承上启下**：明确哪些浏览器行为对应哪些性能指标，为第 2 篇铺垫

---

## 模块二：度量篇（1 篇）

> 目标：把核心指标拆到最深，让读者在监控落地前就能主动发现和优化问题。

### 第 2 篇：Core Web Vitals 2026 全景——从指标到优化到归因

- **主线**：A · 实操五段式
- **主题**：指标是一切优化的度量衡，本篇同时覆盖 LCP / INP 专项深挖
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

---

## 模块三：监控篇（4 篇）

> 目标：从零搭建前端监控体系，能发现问题、定位问题、告警到人。内容基于生产级 RUM 平台（插件化 SDK + BullMQ 队列 + PostgreSQL 分区存储 + SSE 实时推送 + 告警引擎）进行充实。

### 第 3 篇：前端监控体系设计——监什么、怎么监、怎么落地

- **主线**：B · 概念四段式
- **主题**：监控的四维度与插件化 SDK 分层架构

**监控四维度**
- 性能：Web Vitals / 加载瀑布（NavigationTiming 9 阶段）/ 长任务三级（long_task 50ms~2s / jank 2~5s / unresponsive ≥5s）
- 异常：JS 运行时错误 / Promise 未处理拒绝 / 资源加载失败 / 白屏检测
- 行为：API 监控（XHR/fetch 拦截）/ 资源监控（PerformanceResourceTiming）/ 埋点 / 页面访问
- 自定义上报：`track(eventName, properties)` / `time(name, durationMs)` / `log(level, msg)` 三接口

**SDK 插件化架构**
- Hub 核心 + Plugin 接口：`{ name: string, setup(hub: Hub): void, teardown?(): void }`
- 内置插件清单：`ErrorPlugin` / `PerformancePlugin` / `ApiPlugin` / `ResourcePlugin` / `PageViewPlugin` / `WhiteScreenPlugin` / `ExposurePlugin`（`IntersectionObserver` 曝光埋点）
- 初始化行为：DSN 解析 → 插件按需加载 → 全局 API 缓存队列（SDK 早于业务代码执行时 API 不丢失）
- 体积约束：核心 + 错误 + 性能 gzip < 15KB；全量 < 30KB；宿主 Long Task 占比 ≤ 2%

**上报通道四级降级**
- `navigator.sendBeacon`（pagehide / beforeunload，≤ 64KB；超限拆批：error/session_end 优先，其余入 IndexedDB 回滚）
- `fetch(keepalive: true)`（SPA 内部批量 flush，`flushInterval` 定时 + `maxBatchSize` 触发）
- `XMLHttpRequest` 异步（fetch 不可用降级）
- `new Image().src`（跨域 CORS 兜底，≤ 2KB）
- 离线可靠性：失败批次写 IndexedDB → `online` 事件重试，队列上限 500 条

**采样与去重策略**
- 客户端采样（决定"是否上报"）+ 服务端采样（决定"是否存储"）双层设计
- 错误默认 100%，性能 30%，API 30%，埋点 100%
- 批量幂等：`eventId`（UUID v7）+ 服务端 `UNIQUE` 约束防重入库

**隐私合规边界**
- `beforeSend` 默认过滤：password/token/authorization/cookie/secret 字段值替换为 `[FILTERED]`
- 不持久化 `email` / `name` 等 PII，只保留 `user.id`
- `requestBody` / `responseBody` 硬截断至 4KB；非 json/text/form 类型丢弃

- **承上启下**：架构清楚了，下一篇手写核心采集器

### 第 4 篇：手写性能监控 SDK——对齐 web-vitals 生产库

- **主线**：A · 实操五段式
- **主题**：从 PerformanceObserver 到生产可用的采集库

**核心原理**
- `web-vitals@v4` 内部实现（`onLCP` / `onCLS` / `onINP` 的 Observer 逻辑）
- 各指标上报时机差异：FCP/TTFB 即时上报 vs LCP/CLS/INP 在 `pagehide` / `visibilitychange=hidden` 封板
- BFCache 复活（`pageshow persisted`）导致指标重置的处理
- 跨标签页 Session 共享：`BroadcastChannel('ghc_session')` + `storage` 事件兜底，避免 UV 翻倍

**手写实现**：mini LCP / CLS / INP 采集器
- LCP PerformanceObserver 候选变化追踪
- CLS 会话窗口累计算法（5s 间隔 / 1s 间隙）
- INP `interactionId` 聚合逻辑（Event Timing API）

**生产边界**
- `visibilitychange=hidden` 时机 flush，避免最终值丢失
- 多次上报去重（`eventId` UNIQUE + IndexedDB 离线队列）
- 采样率在序列化前完成，不占用上报配额

**对齐 web-vitals 源码**：手写版还差什么（attribution build / 导航类型判断 / BFCache 边界）

**完整代码**：一个可发布的 mini SDK，接口风格对齐 web-vitals API

- **承上启下**：性能有了，错误监控是另一条主线

### 第 5 篇：错误监控专项——从捕获到还原的全链路

- **主线**：A · 实操五段式
- **主题**：错误捕获全链路 + Source Map 还原

**三大捕获入口**
- `window.onerror`：JS 运行时，链式调用不打断用户原处理，`return true` 阻止控制台打印
- `unhandledrejection`：Promise 未处理拒绝，`reason` 为 Error 或字符串
- 捕获阶段 `error` 监听：script/link/img/audio/video 资源加载失败（`initiatorType` 区分来源）
- WeakSet 去重：同一事件冒泡与捕获阶段不重复上报

**跨域 Script Error 成因与修复**
- 根因：CORS 隔离导致错误信息变成 `"Script error."`
- 修复：`crossorigin="anonymous"` + CDN 添加 `Access-Control-Allow-Origin: *`

**框架错误边界**
- React `ErrorBoundary` / Vue `app.config.errorHandler` / Next.js `error.tsx` 接入方式

**手写实现**：白屏检测算法
- `requestIdleCallback` 后对 `#app` / `#root` / `main` 关键节点采样可视尺寸与 DOM 子节点数
- 阈值触发时上报 `subType=white_screen`

**服务端 Source Map 还原**
- 上传流程：构建后 CI 自动 `POST /sourcemap/v1/releases/:version/artifacts`（multipart）
- 还原链路：`source-map v0.7`（WASM 解码）+ MinIO 存储 + LRU 100 条 TTL 1h 内存缓存
- 指纹计算：`sha1(subType | normalizeMessage | topFrame.file | topFrame.function)`（normalize 去数字/UUID/hash）
- 为什么不用整个 stack 入指纹：同 bug 不同调用链指纹爆炸

**rrweb 录屏回放核心思路**
- 序列化 DOM 快照 + MutationObserver 增量 patch + 时间轴回放
- 接入建议：仅在错误触发后 N 秒内录制片段，控制上报体积

**完整代码**：错误捕获 + 上报 + 服务端还原的最小闭环

- **承上启下**：采集有了，第 6 篇进入监控平台侧

### 第 6 篇：监控平台架构与告警——从一条上报到一次告警的完整链路

- **主线**：B · 概念四段式
- **主题**：监控数据平台的通用架构

**数据接入层（Gateway）**
- DSN 鉴权 → Zod Schema 校验 → 限流（令牌桶，100 events/s / projectId，Redis 分布式）→ 入队
- 响应体：`{ accepted, persisted, duplicates, enqueued }`（SDK 契约不变）
- 降级策略：Redis 故障自动降级为进程内同步写，打 WARN 日志

**队列与处理层**
- 多队列分流：`events-error` / `events-performance` / `events-api` / `events-resource` / `events-track`
- Worker：`concurrency=4`，`attempts=3` 指数退避；失败耗尽进死信队列（DLQ）监控告警
- MVP 过渡设计：performance/api/resource 走进程内直调，error 走队列（ERROR_PROCESSOR_MODE 开关）

**存储层选型对比**

| 方案 | 适用场景 | 切换阈值 |
|------|------|------|
| PostgreSQL + 周分区 | MVP，事件流 9 张表，热数据 30 天滚动删除 | 单库 < 2TB |
| ClickHouse | 指标聚合高频查询，p95 > 3s 时引入 | 查询 p95 > 3s |
| Elasticsearch | 全文搜索、日志检索场景 | 错误消息模糊搜索需求 |
| 时序库（TimescaleDB）| `metric_minute` 预聚合表 hypertable | T2 阶段预聚合落地后 |

- Redis：BullMQ 队列、限流令牌桶、Dashboard 查询缓存、HyperLogLog（Issue 影响用户数估算）
- MinIO/S3：Source Map、大字段原始事件（> 4KB 截断转存）

**实时推送链路（SSE）**
- Gateway 入库后：`Redis XADD rt:<projectId>:stream (MAXLEN ~1000)` + `PUBLISH rt:<projectId>:<topic>`
- 服务端 PSUBSCRIBE → 维护订阅 Map → SSE `GET /api/v1/stream/realtime`
- 断线续传：`Last-Event-ID` 触发 `XRANGE` 60s 窗口回放；15s 心跳空注释行
- 连接保护：每 projectId 最多 10 并发 SSE，超出 429

**告警引擎**
- 规则 DSL：`{ target, condition: { aggregation, operator, threshold, window }, severity, cooldownMs, channels[] }`
- 评估流程：BullMQ `alert-evaluator` Worker 每分钟按规则查聚合表 → 命中写 `alert_history`，状态机 `firing → resolved`；静默期内不重发
- 告警策略对比：阈值告警 / 环比告警 / 异常检测（3σ / EWMA）与噪音抑制
- 通知渠道：邮件（SMTP）/ 钉钉机器人 / 企微机器人 / Slack Webhook / 自定义 Webhook / 短信
- 预置规则示例：错误率突增（过去 5min error_rate 相对前 1h 均值 > 500%）/ LCP 劣化（10min LCP p75 > 4000ms）/ 白屏出现（5min white_screen ≥ 1，critical）

- **承上启下**：能发现问题了，进入系统优化

---

## 模块四：优化篇（5 篇 · 分层递进）

> 目标：按影响面从大到小排列——架构决策 → 加载 → 构建 → 运行时 → 感知。每篇聚焦一层。

### 第 7 篇：架构级性能——SSR / CSR / SSG / ISR / RSC

- **主线**：B · 概念四段式
- **主题**：渲染范式选择是最大的性能杠杆
- 五种范式对比矩阵（TTFB / 交互性 / SEO / 缓存 / 复杂度）
- **Streaming SSR**：内容逐块到达的机制与收益
- **RSC（React Server Components）**：零 bundle 与 Selective Hydration
- **Server Actions**：从数据获取到提交的服务端一体化
- **Next.js 15 PPR（Partial Prerendering）**：静态外壳 + 动态孔洞
- 何时不该 SSR：SPA 后台系统 / 私有应用的反例
- **落地锚点**：一个 Next.js 15 PPR 最小 Demo

### 第 8 篇：加载优化——网络协议 + 缓存 + 预测式加载

- **主线**：A · 实操五段式
- **主题**：把资源以最快方式送到浏览器
- 网络协议：HTTP/2 多路复用 & HTTP/3（QUIC）差异
- **103 Early Hints**：让预加载提前一个 RTT
- HTTP 缓存三件套：`Cache-Control` / `ETag` / Service Worker
- **Speculation Rules API**：声明式 prerender/prefetch，替代传统 `<link rel=prefetch>`
- `fetchpriority` / `content-visibility` / Priority Hints 组合拳
- 图片：格式决策树（WebP / AVIF / SVG）+ 响应式图片（srcset）+ 懒加载
- **完整代码**：一个电商详情页的加载优化前后对比

### 第 9 篇：构建性能视角——从产物看性能

- **主线**：A · 实操五段式
- **主题**：如何用构建工具跑出「小而快」的包（**严守性能视角**，工具原理引用已发文）
- 产物体积预算与 Code Split 策略（路由级 / 组件级）
- Tree-shaking 常见失效原因（sideEffects / 桶文件 / 动态导入）
- **SWC / Rspack / Turbopack / Rolldown 横评**（性能视角，不讲原理）
- `webpack-bundle-analyzer` / `rollup-plugin-visualizer` 报告判读
- **Lighthouse CI 集成**：性能卡点自动化
- **完整代码**：一份 CI 性能预算配置 + 超标阻断示例
- 差异化红线：不出现「webpack 配置详解」「vite 插件机制」类内容，直接引用已发文

### 第 10 篇：渲染与运行时优化——重排重绘 + React 优化 + 长列表 + Worker

- **主线**：A · 实操五段式
- **主题**：主线程和渲染管线的一切
- 强制同步布局（Layout Thrashing）识别与规避
- `transform` / `opacity` 触发合成层的机制与 `will-change` 正确姿势
- React 手动优化：`memo` / `useMemo` / `useCallback` + 状态下沉
- **React Compiler 时代的取舍**：手动 memo 会被自动化取代吗
- 长列表虚拟化：`@tanstack/react-virtual` 原理 + 手写
- **手写实现**：一个基于 Comlink 的 Web Worker 通信封装
- `content-visibility: auto` 与懒渲染
- **完整代码**：把一个 5000 行长列表从 30fps 优化到 60fps 的完整方案

### 第 11 篇：感知性能与动效——让「慢」看起来不慢

- **主线**：A · 实操五段式
- **主题**：客观数据之外的体验层兜底
- 感知性能 vs 客观性能：为什么数据好用户还是觉得慢
- Skeleton Screen 与 React Suspense fallback 的组合
- Optimistic UI：乐观更新的实现与回滚
- **View Transitions API**：同源单页 + 跨文档 MPA 的新方案
- 骨架屏自动生成方案（DSL / 编译时提取）
- 60fps 动画曲线选择与心理学（缓入缓出的时机）
- CSS 动画 vs JS 动画（requestAnimationFrame / Web Animations API）决策
- **完整代码**：一个用 View Transitions 实现的列表 → 详情丝滑过渡

---

## 模块五：收尾（1 篇）

> 目标：将前四个模块串联，给读者一个「完整闭环」的方法论。

### 第 12 篇：性能优化闭环与工作流——从「做优化」到「经营性能」

- **主线**：B · 概念四段式
- **主题**：把性能变成团队的日常工作流
- 数据先行原则：不要盲目优化
- 性能预算落地：CI 卡点 + 线上告警的两级防线
- ROI 优先级模型：影响面 × 修复成本 × 用户覆盖
- 灰度发布 + 快速回滚策略
- 跨端团队协作机制（谁负责性能、如何拉通产品/设计/后端）
- 工具箱地图（覆盖前 13 篇，一图索引）

---

## 发布顺序

```
第 0 篇（导读）
→ 第 1 篇（浏览器底层原理与渲染全流程）
→ 第 2 篇（CWV 全景 + LCP 专项 + INP 专项）
→ 第 3 篇（监控体系设计）→ 第 4 篇（SDK 手写）→ 第 5 篇（错误监控）→ 第 6 篇（平台架构与告警）
→ 第 7 篇（架构范式）→ 第 8 篇（加载）→ 第 9 篇（构建）→ 第 10 篇（运行时）→ 第 11 篇（感知）
→ 第 12 篇（闭环收尾）
```

顺序说明：
- **地基 → 度量 → 监控 → 优化 → 收尾**：先看得见问题，再解决问题
- **度量篇合并**：CWV 全景 + LCP + INP 一篇打通，减少读者等待，让指标体系整体落地
- **监控篇内部**：体系设计 → SDK 手写 → 错误监控 → 平台架构，从原理走到工业级落地
- **优化篇顺序**：架构（最大杠杆）→ 加载 → 构建 → 运行时 → 感知（体验兜底），影响面从大到小
- 导读先发，建立读者对系列全貌的认知，促进收藏

---

## 与已发内容的差异化对照

| 已发文章 / 已有笔记 | 本系列的边界处理 |
|------|------|
| `docs/articles/2026-08-03-webpack-5-complete-guide.md` | 第 9 篇只讲「性能视角下的产物优化」，webpack 原理直接引用 |
| `docs/articles/2026-08-04-vite-complete-guide.md` | 同上，Vite 预构建 / esbuild 原理不再展开 |
| `docs/articles/2026-08-04-rollup-complete-guide.md` | 第 9 篇 Rolldown 部分以「Rollup 继任者性能优势」角度切入 |
| `docs/articles/2026-08-04-css-engineering-complete-guide.md` | 第 2 篇讲首屏 CSS 内联时提及但不重讲方案 |
| `docs/articles/2026-07-31-axios-complete-guide.md` | 第 8 篇讲网络传输 / 缓存，不讲请求库封装 |
| `docs/notes/01 性能优化.md` | 全系列作为该笔记的「深度专题版」扩展，笔记留作索引 |

---

## 篇幅与节奏

| 维度 | 建议 |
|------|------|
| 每篇字数 | 3000~5000 字（含图表和代码片段） |
| 发布频率 | 每周 1~2 篇，12 篇约 7~10 周完成 |
| 每篇必有 | 真实场景引入 + 核心原理图 + 关键代码 + 行动清单 + 下一篇预告 |
| 系列封面 | 统一视觉风格，标注「第 X 篇 / 共 14 篇」 |
| 模块回顾 | 每完成一个模块（如监控 4 篇），做一次「模块合集」回顾推送，防止读者掉队 |

---

## 风险与备用方案

1. **字数超标风险**：第 2（CWV + LCP + INP 合并）、第 7（架构范式）、第 9（构建性能）、第 10（运行时）预计逼近 5000 字上限。写作时给自己「删除 20%」红线；第 2 篇若确实拦不住，可拆为「CWV 全景 + LCP」和「INP 专项」两周连载。
2. **门槛风险**：第 2（INP + 调度）、第 7（RSC / PPR）门槛最高。第 2 篇开头补一句"事件循环基础参考第 1 篇"；第 7 篇结尾必须放 PPR 最小 Demo，否则会通篇务虚。
3. **监控篇工程量**：第 4（SDK 手写）代码量大，手写实现部分严控在 50 行内关键片段，完整代码附 GitHub 仓库链接，不全量贴文中。
4. **构建篇差异化红线**：第 9 若出现任何"webpack 配置详解 / vite 插件机制"类内容即越界，写作时对照 checklist 自检。
5. **可选加篇缓冲**：如果第 8（加载优化）里图片和字体部分挤不下，可在第 8 之后单拎一篇「图片与字体专题」作为第 13 篇，扩展空间已预留。
