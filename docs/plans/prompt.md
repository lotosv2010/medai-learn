# prompt

- 下面我们规划Vue全家桶的第1篇文章，具体如下：

## 知识点范围

### 标题

- 标题保持不变，内容补充白屏兜底和动画无障碍两个遗漏点。

### 大纲

#### 一、感知性能 vs 客观性能

- 为什么 LCP 2.0s 用户还说「慢」（等待心理学：不确定的等待更痛苦）
- Doherty Threshold：响应时间 400ms 以内用户感知「即时」
- 客观指标好但感知差的三种典型场景

#### 二、Loading 状态设计：骨架屏

- 骨架屏 vs Spinner vs 进度条：各自适合什么场景
- CSS shimmer 动画实现（`@keyframes` + `background-position`，~20 行）
- 与 React `Suspense` fallback 的组合方式
- 骨架屏自动生成思路：DOM 快照 + CSS 灰化
- 骨架屏的 CLS 风险：占位尺寸不准导致布局偏移

#### 三、白屏兜底策略

- 白屏检测：`requestIdleCallback` 后采样关键节点可视尺寸（引用第 5 篇监控）
- 兜底 UI：最小化静态 HTML fallback，确保用户至少看到内容框架
- 错误边界（Error Boundary）+ 降级渲染

#### 四、Optimistic UI（乐观更新）

- 原理：先更新本地状态，后等待服务端确认
- React Query `useMutation` 的 `onMutate` / `onError` / `onSettled` 三阶段
- 失败回滚策略（rollback + toast 提示）
- 适合场景：点赞 / 收藏 / 评论发布，不适合：支付 / 权限变更

#### 五、View Transitions API（从用法到原理）

- 基础用法：`document.startViewTransition(() => updateDOM())`
- 浏览器快照机制：old / new 两帧截图 + CSS 动画过渡
- 自定义动画：`::view-transition-old` / `::view-transition-new` 伪元素
- 跨文档 MPA 过渡：`@view-transition { navigation: auto }` CSS 规则
- 与 Next.js App Router / React Router 的集成
- 兼容性处理：`document.startViewTransition` 特性检测

#### 六、动画性能

- 60fps 的含义：每帧 16.6ms，主线程任务必须在这之内完成
- CSS 动画 vs JS 动画（rAF）vs Web Animations API 选型
- 只用 `transform` + `opacity` 做动画的原因（Compositor 线程）
- `prefers-reduced-motion`：无障碍适配，系统级减弱动画设置

#### 七、完整代码

- Skeleton Screen 组件（可复用，支持多种布局，~60 行）
- View Transitions 列表 → 详情丝滑过渡（Next.js App Router）
- Optimistic 点赞按钮（React Query，~40 行）

#### 八、系列收尾预告

### 涉及知识点

- 感知等待心理学（Doherty Threshold / 不确定性放大等待感）
- CSS `contain: layout style paint` 与骨架屏性能
- React Suspense 的 transition 语义与 fallback 触发时机
- React Query `onMutate` 的 context 传递机制
- `document.startViewTransition` 的双帧快照原理
- View Transitions Level 2（跨文档）的触发条件
- Web Animations API 与 Compositor 线程的调度关系
- `prefers-reduced-motion` 媒体查询与 WCAG 2.1 AA 要求

## 分析角度（每个子主题都按此展开）

A · 实操五段式（适用于有「手写内核」的篇章）

是什么 → 核心原理 → 手写实现（关键代码） → 生产级最佳实践 → 完整最佳实践代码

B · 概念四段式（适用于概念/架构/方法论篇章）

真实场景引入 → 概念/机制拆解 → 决策矩阵或对比表 → 行动清单

## 已有笔记

- @docs/notes/38 Web 性能测试.md
- @docs/notes/35 前端性能优化介绍.md
- @docs/notes/34 前端页面的生命周期.md
- @docs/notes/41 防抖节流.md
- @docs/notes/42 请求和响应优化.md
- @docs/notes/43 资源加载优化.md
- @docs/notes/44 渲染优化.md
- @docs/notes/45 图片优化.md
- @docs/notes/46 Web性能优化地图.md
- @docs/notes/47 压缩和解压缩.md
- @docs/notes/48 Web缓存.md
- @docs/notes/49 代理服务器.md

## 规则

- 先阅读以上笔记，找出缺失或浅尝辄止的知识点
- 笔记只关注 @docs/notes/vue2 目录下的，其他目录禁止自行读取
- 补全内容（保留原有内容，只增不删），保留图片
- 将整理后的内容生成公众号文章，输出到 docs/articles/vue-2
- 文章结构：先出大纲等我确认，再逐节写作

## 参考

- 每一篇最后加一个 参考 章节，引用内容如下，直接用一下内容不需要自行修改：
- https://web.dev/articles/vitals?hl=zh-cn
- https://web.dev/articles/rail?hl=zh-cn
- https://web.dev/articles/rendering-performance?hl=zh-cn
- https://web.dev/learn/performance/welcome?hl=zh-cn
- https://developer.mozilla.org/zh-CN/docs/Web/Performance
- https://github.com/berwin/Blog/issues/23
- https://github.com/GoogleChromeLabs/quicklink
