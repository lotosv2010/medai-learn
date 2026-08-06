# 前端性能指标全景：从体系到优化到实战（面试收藏级）

> 见过太多候选人在「谈谈性能优化」这道题上翻车。不是因为没做过优化，而是因为说不清楚**为什么这样做**——哪个指标在告警、告警意味着什么、该用什么工具定位、最终怎么优化。
>
> 这篇文章给你完整认知链路：RAIL 模型 → Core Web Vitals 三大核心指标 → 全量指标地图 → 测量工具全景 → LCP / INP 专项深挖。从宏观到微观，从理论到生产代码。

---

## 🧭 先建认知框架：RAIL 模型

任何优化手段都需要一个「优先级判断框架」，否则你不知道先优化什么、优化到什么程度算够好。RAIL 模型是 Google 提出的用户体验性能框架，4 个字母代表 4 个不同的性能场景：

![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672556371010-64e5a4cf-f0d3-4349-bebf-cfb1cbf55952.png)

| 延迟时长 | 用户感知 |
|---------|---------|
| 0 ~ 16ms | 感觉流畅（60fps = 每帧 16.7ms） |
| 0 ~ 100ms | 立即响应，感觉无延迟 |
| 100ms ~ 1s | 可感知延迟，开始注意 |
| > 1s | 注意力开始分散 |
| > 10s | 用户放弃任务 |

**Response（响应）**：用户操作后 100ms 内必须给出视觉反馈，超过就有「卡顿感」。对应今天的 INP 指标。

**Animation（动画）**：每帧必须在 10ms 内完成（留 6ms 给浏览器合成），否则会掉帧。

![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672556836336-aab45254-0a46-4e1d-945f-8604ea3478c7.png)

**Idle（空闲）**：利用主线程空闲处理延迟任务，每片不超过 50ms，有用户输入就立刻让出。

**Load（加载）**：5s 内完成首屏加载并可交互，回访用户 2s 内。

RAIL 的价值不在于记住数字，而在于**按场景设定优化目标**——电商关注 Load 和 Response，工具类产品更关注 Animation 和 Idle。不同业务，优先级不同。

> 💬 **面试官**：RAIL 模型是什么，你怎么用它指导优化？
>
> ✅ 标准答案：RAIL = Response/Animation/Idle/Load，分别给出了交互（<100ms）、动画（<10ms/帧）、空闲任务（<50ms）、加载（<5s）四个场景的量化目标，是制定优化优先级的框架。
>
> 🎁 加分答案：它的核心思想是「分场景定目标」。INP 超标看 Response 层；CLS 问题往往在 Load 阶段资源加载顺序上找原因。模型给你一个「在哪个战场作战」的坐标系。

---

## 📊 Core Web Vitals：最重要的三把尺子

Google 从成百上千的用户体验指标中提炼出三个核心指标，这三个指标有一个共同特征：从用户感知角度出发，有明确的量化阈值，且被纳入 Google 搜索排名算法。

评估标准：三个指标都在真实用户 **P75 百分位**通过，才算整体「达标」——不是平均值，是第 75 个百分位的用户都能获得良好体验。

Core Web Vitals 是 Web Vitals 的子集：

![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672560527510-30448ddb-bb2a-42b6-b2de-3886891ed6a2.png)

三大核心指标现行阈值（2026 年版）：

![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672560733134-dbef4456-b8ec-479b-b8d6-44aba18fb56d.png)

注：图中显示的 FID 已于 2024 年 3 月被 INP 正式取代。

### LCP：加载体验的核心答卷

LCP（Largest Contentful Paint）= 视口内最大内容元素渲染完成的时间。良好阈值：**< 2.5s**。

纳入 LCP 候选的元素类型：`<img>`、`<video>` poster、CSS `background-image`（URL 加载）、块级文本节点。

![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672558111933-a62c6be8-48f1-45d9-9a06-77001008f439.png)

浏览器**持续更新** LCP 候选，用户首次交互（点击/键盘）后锁定最终值。手写一个 LCP 探针，实时观察候选元素变化：

```javascript
const lcpProbe = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const last = entries[entries.length - 1];
  console.log(
    'LCP candidate:', last.startTime.toFixed(1) + 'ms',
    last.element?.tagName,
    last.element?.src || last.element?.className
  );
});
lcpProbe.observe({ type: 'largest-contentful-paint', buffered: true });
```

### INP：从 FID 到 INP 的进化（面试必考）

**为什么废弃 FID？**

FID（First Input Delay）只测量**第一次**用户交互的输入延迟，三个致命缺陷：

- 只覆盖一次交互，不能反映整个会话的交互质量
- 只测量「输入延迟」，不包含事件处理时间和渲染时间
- SPA 中导航后的交互、弹框操作、表格输入——一概不计

用一句话概括：**FID 是最乐观的情况，INP 是最差情况**。

![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672558911218-e1ae493b-fabd-4132-bf8b-0889a097e6f9.png)

**INP（Interaction to Next Paint）**：取整个会话中**所有交互的最差延迟**。良好阈值：**< 200ms**。2024 年 3 月正式替代 FID。

INP 由三段时间组成：

```text
用户输入（点击/键盘/触摸）
  ↓ [输入延迟] 主线程被长任务占用，事件队列等待
开始处理事件
  ↓ [处理时间] 事件处理函数执行（JS计算、DOM操作）
处理完成
  ↓ [渲染延迟] 样式重算、布局、绘制、合成
下一帧出现（INP 终点）
```

2026 年数据：43% 的网站仍未通过 200ms 阈值，是三大指标中失败率最高的一个。根因通常不是事件处理函数本身慢，而是**输入延迟**——主线程被长任务占满，事件处理根本排不上队。

### CLS：视觉稳定性

CLS（Cumulative Layout Shift）= 页面整个生命周期中**非预期布局偏移**的累积分数。良好阈值：**< 0.1**。

布局偏移分数 = 影响分数（偏移元素占视口面积比）× 距离分数（偏移距离占视口比）。

![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672559866543-83ff8a15-519d-45f5-bee7-ceb39a64f58d.png)

常见根因：图片未设宽高属性、广告异步插入、字体加载后文字换行撑开。CLS 超标意味着用户「误点」——广告推开了原本想点的按钮。

> 💬 **面试官**：Core Web Vitals 三个指标说一下，为什么 FID 被废弃？
>
> ✅ 标准答案：LCP < 2.5s（加载），INP < 200ms（交互，2024年替代FID），CLS < 0.1（视觉稳定）。三者均在 P75 百分位达标才算整体良好。FID 被废弃因为它只测第一次交互，且只测输入延迟，无法反映 SPA 用户的整体交互质量。
>
> 🎁 加分答案：INP 取代 FID 的本质是测量范围的扩大——从「最乐观的一次」到「整个会话的最差一次」，从「一段时间」到「三段完整时间」。对 SPA 来说，FID 测的往往是页面刚加载时最好的状态，根本不代表用户真实体验。

---

## 📐 全量指标地图：把时间轴补完整

Core Web Vitals 是最重要的三个，但完整的性能体系不止这三个。把页面从 URL 到完全加载全过程展开：

```text
URL请求
  └─ DNS → TCP → TTFB → FP → FCP → LCP（加载链）
                               └─ TTI / TBT（可交互性）
                               └─ INP（交互响应，贯穿全程）
                               └─ CLS（稳定性，贯穿全程）
```

### 指标全景时间轴

每段时间可用 Navigation Timing API 精确计算：

![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672562060163-1f4cbe7e-67a8-4636-b49a-a6a12318c413.png)

```javascript
const t = performance.timing;
const metrics = {
  DNS:      t.domainLookupEnd - t.domainLookupStart,
  TCP:      t.connectEnd - t.connectStart,
  TTFB:     t.responseStart - t.requestStart,
  白屏时间:  t.responseEnd - t.fetchStart,
  DOM解析:  t.domInteractive - t.responseEnd,
  DOM就绪:  t.domContentLoadedEventEnd - t.fetchStart,
  完全加载:  t.loadEventStart - t.fetchStart,
};
```

### FP / FCP：白屏与首次内容

**FP（First Paint）**：浏览器渲染第一个像素——白屏结束点。

**FCP（First Contentful Paint）**：第一块有意义内容（文字/图片/SVG）渲染完成。FCP 良好阈值：< 1.8s。

![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672557565759-3debb633-e94c-4578-bacc-1fbf6a74121b.png)

注意：FCP ≠ 有用内容。Header 骨架、Loading 动画也算 FCP，FCP 好不代表用户看到了实质内容。

![](https://cdn.nlark.com/yuque/0/2025/png/738210/1744796066219-9567f87f-7fb1-4653-bcc9-df1598d8bf3c.png)

用 PerformanceObserver 同时采集 FP 和 FCP：

```javascript
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // entry.name: 'first-paint' 或 'first-contentful-paint'
    console.log(entry.name, entry.startTime.toFixed(1) + 'ms');
  }
}).observe({ type: 'paint', buffered: true });
```

### TTFB：服务端响应质量的晴雨表

TTFB（Time to First Byte）= 浏览器发出请求到收到第一个字节的时间。良好阈值：< 600ms。

TTFB 是 LCP 的「地基」——TTFB 高，LCP 一定不会低。优化方向在服务端和网络：CDN 部署、数据库查询优化、Edge Function 就近计算。

### TTI / TBT：可交互性的两把尺子

**TTI（Time to Interactive）**：FCP 后，主线程连续 5s 无长任务（> 50ms）且网络请求基本完成，才算「真正可交互」。良好阈值：< 3.8s。

![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672559258766-6f04a911-e2b3-4bcc-add7-7c920cfc1b5f.png)

**TBT（Total Blocking Time）** = FCP 到 TTI 之间，所有长任务超出 50ms 部分的总和。良好阈值：< 200ms。

![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672559524256-bc29175c-f7e9-4e42-8252-afe6e0c4fc46.png)

下图展示 3 个超过 50ms 的长任务，蓝色部分（超出 50ms 的阻塞时间）加总即为 TBT：

![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672559540552-30d8bf5d-d392-4a74-9177-416be948bb4e.png)

**TBT 与 INP 的关键关系**：TBT 是 Lab 可测指标，INP 是 Field 指标。TBT 高的页面，INP 大概率超标。TBT 是优化 INP 最佳的代理目标——Lab 环境优先压低 TBT。

### Speed Index：视觉填充速度

Speed Index 不是某一时刻，而是页面内容**填充速度**的平均值——曲线下面积越小，体验越好：

![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672561378882-97d409b0-f5c2-4049-a5bc-5e9d3d4a9485.png)

Example 1 在 2s 时已填充 80% 内容，SI = 3.6；Example 2 在 8s 才填充 80%，SI = 8.4。Lighthouse 良好阈值：< 3.4s。

### 白屏时间与首屏时间：两个业务最关心的指标

白屏时间 ≈ FP，是用户看到第一个像素的时刻，也是「页面还活着」的最早信号：

```javascript
const fp = performance.getEntriesByType('paint')
  .find(e => e.name === 'first-paint');
const blankScreenTime = fp ? fp.startTime : 0;
```

白屏超 3 秒，研究表明用户流失率显著上升——这是监控告警的「生死线」。

首屏时间 ≈ LCP，官方推荐用 LCP 作为首屏的代理指标；业务上需要更精确时，用 `performance.mark` 手动埋点：

```javascript
import { onLCP } from 'web-vitals';
onLCP(({ value }) => reportMetric('first-screen', value));

function markFirstScreen() {
  performance.mark('first-screen-complete');
  const m = performance.measure(
    'first-screen', 'navigationStart', 'first-screen-complete'
  );
  reportMetric('first-screen-custom', m.duration);
}
```

关系链：**白屏(FP) → FCP → 首屏(≈LCP) → TTI → Load**

> FMP（First Meaningful Paint）已于 Lighthouse 6.0 废弃，直接用 LCP 替代。

### DCL 与 Load：DOM 解析完成 vs 页面完全加载

```javascript
const t = performance.timing;
const DCL  = t.domContentLoadedEventEnd - t.navigationStart;
const Load = t.loadEventEnd - t.navigationStart;
```

**DCL（DOMContentLoaded）**：HTML 解析完毕，DOM 树就绪，JS 可安全操作 DOM。图片、字体等外部资源可能还未加载。良好目标：< 2s。

**L（onLoad）**：页面所有资源加载完成。良好目标：< 5s。

DCL 早于 Load，但 DCL ≠ 可交互——大量阻塞 JS 执行完之前，主线程仍被占用。

### 全量指标速查表

| 分类 | 指标 | 良好阈值 | 面试频率 |
|------|------|---------|---------|
| 网络 | DNS Lookup | < 100ms | ⭐⭐ |
| 网络 | TCP Connection | < 100ms | ⭐⭐ |
| 网络 | SSL Handshake | < 200ms | ⭐⭐ |
| 网络 | RTT（网络延迟） | < 100ms | ⭐⭐ |
| 加载 | TTFB | < 600ms | ⭐⭐⭐ |
| 加载 | 白屏时间（FP） | < 1s | ⭐⭐⭐ |
| 加载 | FCP | < 1.8s | ⭐⭐⭐ |
| 加载 | DCL | < 2s | ⭐⭐ |
| 加载 | 首屏时间（≈LCP） | < 2.5s | ⭐⭐⭐⭐⭐ |
| 加载 | Load（onLoad） | < 5s | ⭐⭐ |
| 可交互 | TTI | < 3.8s | ⭐⭐⭐ |
| 可交互 | TBT | < 200ms | ⭐⭐⭐⭐ |
| 视觉 | Speed Index | < 3.4s | ⭐⭐⭐ |
| Core Web Vitals | LCP | < 2.5s | ⭐⭐⭐⭐⭐ |
| Core Web Vitals | INP | < 200ms | ⭐⭐⭐⭐⭐ |
| Core Web Vitals | CLS | < 0.1 | ⭐⭐⭐⭐ |
| 资源 | Resource Timing | 各阶段 < 200ms | ⭐⭐⭐ |
| 资源 | Long Tasks | 单任务 < 50ms | ⭐⭐⭐⭐ |
| 运行时 | FPS | ≥ 60fps | ⭐⭐⭐ |
| 运行时 | Memory Usage | 无持续增长 | ⭐⭐⭐ |
| 运行时 | CPU Usage | 空闲 > 50% | ⭐⭐ |

---

## 📦 资源加载指标：Resource Timing + Long Tasks

### Resource Timing：每个资源的加载解剖

`performance.getEntriesByType('resource')` 返回页面加载的所有资源条目，每条记录包含 DNS / TCP / TTFB / 传输大小等完整时序：

```javascript
performance.getEntriesByType('resource').forEach(r => {
  console.log({
    name:      r.name,
    dns:       r.domainLookupEnd  - r.domainLookupStart,
    tcp:       r.connectEnd       - r.connectStart,
    ttfb:      r.responseStart    - r.requestStart,
    transfer:  r.responseEnd      - r.responseStart,
    total:     r.duration,
    size:      r.transferSize,
  });
});
```

实战用途：找出哪个第三方脚本 TTFB 超标、哪张图片 transfer 时间异常——比 Network 面板的手动查找快得多。

### Long Tasks：主线程的「堵车预警」

执行时间超过 50ms 的任务称为 Long Task，它会阻塞主线程、拖高 TBT 和 INP：

```javascript
new PerformanceObserver((list) => {
  for (const task of list.getEntries()) {
    console.log('Long Task:', task.duration.toFixed(1) + 'ms');
  }
}).observe({ type: 'longtask', buffered: true });
```

Long Tasks API 只告诉你「卡了多久」，不告诉你「卡在哪里」。LoAF（Long Animation Frames）是它的升级版，能精确到脚本来源和强制布局——详见上文「LoAF API」一节。

---

## 🖥️ 运行时性能指标：FPS / 内存 / CPU

这三个指标不在加载链上，而是贯穿整个页面生命周期，是动画卡顿和内存泄漏的晴雨表。

### FPS：帧率监控

60fps = 每帧 16.7ms，低于 60fps 用户感知卡顿。用 `requestAnimationFrame` 计算实时帧率：

```javascript
let lastTime = performance.now();
let frameCount = 0;

function measureFPS() {
  frameCount++;
  const now = performance.now();
  if (now - lastTime >= 1000) {
    console.log('FPS:', frameCount);
    frameCount = 0;
    lastTime = now;
  }
  requestAnimationFrame(measureFPS);
}
requestAnimationFrame(measureFPS);
```

DevTools Performance 面板概览区的绿色 FPS 条高度越低、红色越多，说明掉帧越严重。

### Memory Usage：内存泄漏探测

```javascript
// Chrome 专属，其他浏览器不支持
const mem = performance.memory;
console.log({
  used:  (mem.usedJSHeapSize  / 1048576).toFixed(1) + 'MB',
  total: (mem.totalJSHeapSize / 1048576).toFixed(1) + 'MB',
  limit: (mem.jsHeapSizeLimit / 1048576).toFixed(1) + 'MB',
});
```

内存泄漏的信号：`usedJSHeapSize` 随时间持续单调递增，且在 GC 后仍不下降。配合 DevTools Memory 面板的 Heap Snapshot 对比定位泄漏源。

### CPU Usage：主线程繁忙程度

CPU Usage 没有专用 API，通过 DevTools Performance 面板查看：打开 **More tools → Performance monitor**，实时显示 CPU 占用率。主线程空闲时间应保持 > 50%，长期满载说明存在大量同步计算，需要 Web Worker 或任务拆分处理。

---

## 🌐 网络性能指标：连接链路的每一毫秒

加载链上的前半段——DNS → TCP → SSL → TTFB，是纯网络耗时，代码无法优化渲染，只能从部署层着手。用 Navigation Timing API 采集：

```javascript
const t = performance.timing;
const network = {
  DNS:  t.domainLookupEnd      - t.domainLookupStart,
  TCP:  t.connectEnd           - t.connectStart,
  SSL:  t.secureConnectionStart > 0
          ? t.connectEnd - t.secureConnectionStart : 0,
  TTFB: t.responseStart        - t.requestStart,
  RTT:  t.responseStart        - t.fetchStart,
};
```

| 网络段 | 计算公式 | 优化方向 |
|--------|---------|---------|
| DNS（域名解析） | `domainLookupEnd - domainLookupStart` | `<link rel="dns-prefetch">` 提前解析 |
| TCP（三次握手） | `connectEnd - connectStart` | HTTP/2 多路复用、持久连接 |
| SSL（TLS 握手） | `connectEnd - secureConnectionStart` | TLS 1.3、OCSP Stapling |
| TTFB（首字节） | `responseStart - requestStart` | CDN、Edge Function、DB 查询优化 |
| RTT（往返延迟） | `responseStart - fetchStart` | CDN 节点就近命中 |

**SSL 计算注意**：`secureConnectionStart` 在 HTTP 页面下为 0，需先判断再计算，否则结果等于 `connectEnd`（几十毫秒，并非真实 SSL 耗时）。

---

## 📎 附录：不常用指标速查

以下指标已废弃或属于业务分析工具，了解即可，面试不深挖。

| 指标 | 状态 | 说明 |
|------|------|------|
| FMP（First Meaningful Paint） | **已废弃** | Lighthouse 6.0 起停用，用 LCP 替代 |
| FCI（First CPU Idle） | **已废弃** | 用 TTI 替代 |
| Bounce Rate（跳出率） | 业务分析工具 | 单页访问 / 总访问，由 GA / 神策等分析平台统计，前端 SDK 不直接采集 |
| Time on Page（停留时长） | 业务分析工具 | 用 `visibilitychange` 事件统计，非性能指标 |
| Conversion Rate（转化率） | 业务目标 | 完成目标行为 / 总访问，LCP 每提升 100ms 转化率约提升 1%（Google 研究结论） |

三者的共同点：它们是**性能的下游结果**，而非可直接优化的技术指标。LCP / INP / CLS 是因，Bounce Rate / Conversion Rate 是果。

---

## 🛠️ 测量工具全景

指标体系是「量什么」，工具是「怎么量」。两者缺一不可。

### Lighthouse：综合评分与优先级导向

Lighthouse 由 6 个指标加权计算得出 0~100 的分数：

![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672728258606-dd33e966-ba6d-4031-adf9-c78625bf11ea.png)

| 指标 | 权重 |
|------|------|
| FCP | 15% |
| Speed Index | 15% |
| LCP | 25% |
| TTI | 15% |
| TBT | 25% |
| CLS | 5% |

**TBT 占 25%，LCP 占 25%**——优先优化这两项，Lighthouse 评分 ROI 最高。

Lighthouse 评分采用对数正态分布映射，中等区间小幅改善可以带来大量分数提升：

![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672728045398-862ebafc-da5e-41d3-b079-5bbb71431af7.png)

CLI 使用方式：

```shell
npm install -g lighthouse

lighthouse https://your-site.com \
  --locale zh \
  --chrome-flags="--headless" \
  --only-categories=performance
```

### Chrome DevTools Performance 面板：主线程诊断利器

Lighthouse 告诉你「分低了」，Performance 面板告诉你「为什么低」。建议在无痕模式下使用，避免插件干扰：

![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672731879274-788e4a9f-8eb7-432d-9afa-b8a70b69d5c0.png)

录制后的面板分为四个区域：

**概览面板（Overview）**：FPS / CPU 占用 / 网络瀑布图，快速发现掉帧区间和长任务集中点。FPS 条出现红色代表掉帧。

**Web Vitals 轨道**：在时间轴上直接标注 FP / FCP / LCP / DCL 节点，方便对齐问题时间点：

![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672732056155-2f29117d-c761-46a2-9235-183252277638.png)

**主线程火焰图（Flame Chart）**：这是诊断 INP 和 TBT 的核心工具。横轴是时间，纵轴是调用栈，红色长条就是长任务。点击任意任务可以查看调用链：

![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672732504852-09181a5d-59d4-452f-b15f-8d1bb566022b.png)

**统计面板（Summary / Bottom-Up / Call Tree）**：

![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672732583886-584168f3-2fb8-48ad-8588-222abb69602d.png)

- **Summary**：Scripting / Rendering / Painting 各类任务耗时占比
- **Bottom-Up**：按 Self Time 排序的函数耗时，找到最「自私」的函数
- **Call Tree**：完整调用链，追溯问题代码的上下文

实战操作路径：录制 → 时间轴拖选长任务 → Bottom-Up 找 Self Time 最大的函数 → Call Tree 看它从哪里被调用 → 定位源码。

### web-vitals 库：一行代码接入真实用户数据

PerformanceObserver 是底层 API，web-vitals 库把三大指标的采集逻辑封装好了，直接用：

```shell
npm install web-vitals
```

基础用法——获取指标值并上报：

```javascript
import { onLCP, onINP, onCLS } from 'web-vitals';

onLCP(({ name, value, id }) => {
  sendToAnalytics({ name, value, id });
});
onINP(({ name, value, id }) => {
  sendToAnalytics({ name, value, id });
});
onCLS(({ name, value, id }) => {
  sendToAnalytics({ name, value, id });
});
```

注意：`onCLS` 在页面 unload 时才触发最终值，上报时用 `keepalive: true` 确保成功发出。

attribution build 提供更多归因信息，告诉你 **LCP 是哪个元素、INP 是哪个交互、哪段时间最长**：

```javascript
import { onLCP, onINP } from 'web-vitals/attribution';

onLCP(({ value, attribution }) => {
  console.log('LCP element:', attribution.element);
  console.log('LCP resource:', attribution.url);
  console.log('initiatorType:', attribution.initiatorType);
});
```

```javascript
onINP(({ value, attribution }) => {
  const { eventTarget, eventType, loadState } = attribution;
  const { inputDelay, processingDuration, presentationDelay } = attribution;
  console.log({ eventTarget, eventType, loadState,
    inputDelay, processingDuration, presentationDelay });
});
```

### LoAF API：归因到具体脚本

Long Tasks API 只告诉你「卡了 80ms」。LoAF（Long Animation Frames）告诉你**卡在哪段脚本、哪次强制布局**：

```javascript
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      const scripts = entry.scripts.map(
        s => s.invokerType + ':' + s.sourceURL
      );
      console.log('LoAF:', entry.duration.toFixed(1) + 'ms', scripts);
    }
  }
}).observe({ type: 'long-animation-frame', buffered: true });
```

### Lab 数据 vs Field 数据

Lighthouse 跑出 LCP 1.8s，CrUX 上却是 3.2s——这是正常的，四大根源：

| 差异维度 | Lab | Field |
|---------|-----|-------|
| 设备 | 模拟中端机 | 包含低端安卓 |
| 网络 | 节流到 4G | 真实 2G~WiFi 分布 |
| 缓存 | 清缓存冷启动 | 回访用户有缓存 |
| 行为 | 直接访问目标页 | 真实导航链路 |

**决策原则**：Lab 数据用于快速诊断和复现，Field 数据定优化目标（以 P75 为基准，不看均值）。

---

## 🔬 Core Web Vitals 深度解读

### LCP 专项：首屏最大内容的所有细节

LCP 超标，根因通常在三个地方：资源优先级排错、字体阻塞、CSS 阻塞渲染。

**fetchpriority 与 preload 的正确姿势**

两个工具职责不同，正交使用：

- `<link rel="preload">` 改变资源**发现时机**（提前发现）
- `fetchpriority="high"` 改变网络**调度优先级**（发现了先下载谁）

LCP 图片两者都要，其他图片不要加：

```html
<!-- ✅ LCP Hero 图：两者都加 -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />
<img src="/hero.webp" fetchpriority="high" alt="产品图" />
```

**常见误用**：给所有首屏图片都加 preload，5 张图竞争带宽，反而拖慢 LCP。原则：只给真正的 LCP 元素加，其他用懒加载。

Next.js 中 `priority` 属性等价于两者结合：

```tsx
<Image src="/hero.webp" priority alt="产品图" width={800} height={600} />
```

**字体加载：FOIT / FOUT 与 font-display 策略**

字体加载期间有两种糟糕体验：**FOIT**（字体加载完前文字隐形）、**FOUT**（先用系统字体，加载完替换）。`font-display` 决定取哪种体验：

| font-display 值 | 行为 | 适用场景 |
|----------------|------|---------|
| `block` | 最多 3s 不显示，再显示自定义字体 | 图标字体（避免字形乱码） |
| `swap` | 立即显示系统字体，加载完后替换 | 正文字体（FOUT 可接受） |
| `fallback` | 100ms block + 3s swap，之后放弃 | 品牌字体（较平衡） |
| `optional` | 100ms block，网络差时直接放弃 | 非必要装饰字体 |

**决策口诀**：正文用 `swap`，图标用 `block`，品牌字体用 `fallback`。

**Critical CSS：消除首屏渲染阻塞**

外部 CSS 文件是渲染阻塞资源——浏览器必须等 CSS 完全下载并解析才能渲染任何内容。Critical CSS 将首屏所需样式内联到 `<head>`，其余异步加载：

```javascript
// next.config.js
module.exports = {
  experimental: {
    // 底层使用 critters 自动提取并内联 Critical CSS
    optimizeCss: true,
  },
};
```

> 💬 **面试官**：LCP 超标，你会怎么系统排查？
>
> ✅ 标准答案：① 用 web-vitals attribution 确认 LCP 元素是哪个；② 检查是否有 `fetchpriority="high"` 和 preload；③ 看 TTFB，排查服务器响应；④ 检查是否有阻塞渲染的 CSS 或字体。
>
> 🎁 加分答案：attribution build 的 `attribution.url` 和 `initiatorType` 直接告诉你 LCP 资源从哪里加载、是 img/css/script，比手动排查效率高 10 倍。

---

### INP 专项：交互延迟的攻防

INP 是 2026 年失败率最高的指标（43%）。定位比 LCP 难，因为 INP 是运行时问题，Lab 环境不容易复现。

**Event Timing API + LoAF 联合归因**

Event Timing API 拆解 INP 的三段时间：

```javascript
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const inputDelay = entry.processingStart - entry.startTime;
    const processingTime = entry.processingEnd - entry.processingStart;
    const renderDelay = entry.duration - processingTime - inputDelay;
    console.log({ inputDelay, processingTime, renderDelay });
  }
}).observe({ type: 'event', buffered: true, durationThreshold: 40 });
```

归因路线：**输入延迟大** → LoAF 找同帧长任务脚本；**处理时间大** → Performance 面板 Profile 事件处理函数；**渲染延迟大** → 检查强制同步布局。

避免强制同步布局（Layout Thrashing）是降低渲染延迟的关键——「写 DOM → 读布局属性」交替执行，每次读都强制浏览器立即重排：

![](https://cdn.nlark.com/yuque/0/2025/png/738210/1744869731397-e97cb23e-0860-4ce5-b3ad-1664eabe943e.png)

浏览器的帧生命周期——事件处理 → 样式计算 → 布局 → 绘制，必须在 16.7ms 内完成一帧：

![](https://cdn.nlark.com/yuque/0/2025/png/738210/1744869741911-abdaa3c1-0cf2-4083-909f-45a774dc8e0f.png)

**让出主线程：三种方案对比**

| 方案 | 兼容性 | 特点 |
|------|--------|------|
| `setTimeout(fn, 0)` | 全浏览器 | 至少 4ms 延迟，优先级无保证 |
| `scheduler.yield()` | Chrome 115+ | 在任务队首执行，优先级有保证 |
| `isInputPending` | Chrome 87+ | 按需让出，有输入才中断 |

```javascript
async function yieldToMain() {
  if ('scheduler' in window && 'yield' in scheduler) {
    return scheduler.yield(); // Chrome 115+，优先级最高
  }
  return new Promise(resolve => setTimeout(resolve, 0));
}

async function runInChunks(tasks, chunkSize = 50) {
  for (let i = 0; i < tasks.length; i++) {
    tasks[i]();
    if ((i + 1) % chunkSize === 0) await yieldToMain();
  }
}
```

**React 并发模式对 INP 的影响**

`useTransition` 把非紧急更新标记为可中断，浏览器优先响应用户输入：

```tsx
function DrugSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleInput = (e) => {
    setQuery(e.target.value);              // 立即更新（紧急）
    startTransition(() => {
      setResults(filterDrugs(e.target.value)); // 延迟更新（非紧急）
    });
  };
```

```tsx
  return (
    <>
      <input value={query} onChange={handleInput} />
      {isPending ? <Spinner /> : <DrugList items={results} />}
    </>
  );
}
```

🔧 **真实场景**：药品搜索框每次按键过滤 500 条数据，未优化前 INP 约 300ms；加 `useTransition` 后降到 80ms 以内。

**手写：INP 归因面板**

拿到 attribution 对象，提取三段时间和交互上下文，输出到控制台（生产环境改为上报到监控平台）：

```javascript
import { onINP } from 'web-vitals/attribution';

onINP(({ value, attribution }) => {
  const { eventTarget, eventType, loadState } = attribution;
  const { inputDelay, processingDuration, presentationDelay } = attribution;

  console.table({
    '交互元素': eventTarget,
    '交互类型': eventType,
    '页面状态': loadState,
    '输入延迟': inputDelay?.toFixed(1) + 'ms',
    '处理耗时': processingDuration?.toFixed(1) + 'ms',
    '渲染延迟': presentationDelay?.toFixed(1) + 'ms',
    'INP 总值': value?.toFixed(1) + 'ms',
  });
});
```

`loadState` 告诉你 INP 发生时页面是否还在 loading——如果是，优化方向是推迟非关键脚本加载，而不是优化事件处理函数本身。

> 💬 **面试官**：INP 超标，你会怎么定位？
>
> ✅ 标准答案：① web-vitals attribution 确认哪个元素哪种交互；② 看三段时间哪段最长；③ 输入延迟大用 LoAF 找同帧长任务；④ 处理时间大用 Performance 面板 Profile 事件；⑤ 渲染延迟大检查强制同步布局。
>
> 🎁 加分答案：`loadState` 是关键字段。INP 发生在页面 loading 阶段，说明 hydration 或脚本执行占满了主线程——这时候不该优化事件处理函数，该推迟非关键脚本；发生在 complete 阶段才是纯交互问题，才需要拆任务让出主线程。

### CLS 专项：消灭布局偏移

CLS 超标的根因几乎都集中在三类：**图片无尺寸**、**异步内容插入**、**字体替换引起文字回流**。

**图片与媒体元素**：始终声明 `width` 和 `height`，让浏览器提前预留空间：

```html
<!-- ✅ 预留宽高，浏览器计算宽高比，不会在图片加载后引发偏移 -->
<img src="/drug.webp" width="800" height="600" alt="药品图" />
```

CSS 中用 `aspect-ratio` 也可以实现相同效果：

```css
.hero-img {
  aspect-ratio: 4 / 3;
  width: 100%;
}
```

**异步内容（广告、推荐位）**：在 DOM 中提前占位，内容加载后不改变占位高度：

```html
<!-- 广告容器提前固定高度，内容填入时不产生偏移 -->
<div class="ad-slot" style="min-height: 90px;">
  <!-- 异步插入广告内容 -->
</div>
```

**动画导致的偏移**：用 `transform` 替代 `top/left/margin`，transform 在合成层完成，不触发布局：

```css
/* ❌ 会引发布局重算，可能影响其他元素位置 */
.panel { transition: margin-top 0.3s; }

/* ✅ 仅触发合成，不影响文档流 */
.panel { transition: transform 0.3s; }
```

**字体引起的 CLS**：使用 `font-display: optional` 或提前 preload 字体，减少字形替换时的文字回流：

```html
<link rel="preload" href="/fonts/brand.woff2" as="font" crossorigin />
```

> 💬 **面试官**：CLS 超标怎么排查，有哪些常见场景？
>
> ✅ 标准答案：① DevTools Performance 面板 Layout Shift 轨道定位偏移时间点；② web-vitals attribution 的 `largestShiftTarget` 定位偏移元素；③ 三大根因：图片无宽高、异步内容插入、字体替换。
>
> 🎁 加分答案：偏移分数 = 影响分数 × 距离分数。如果广告从视口底部滑入，影响分数很小——但如果广告把导航栏顶下去，影响分数接近 1，就是 CLS 的重灾区。用 `min-height` 预留容器是最低成本的修复方式。

---

## 🏭 生产级完整代码

主页面组件——LCP、CLS、INP 三大优化同时体现：

```tsx
// app/drug-detail/page.tsx
import Image from 'next/image';
import { Suspense } from 'react';
import { DrugSearch } from './drug-search';
import { WebVitalsReporter } from '@/lib/vitals';

export default function DrugDetailPage({ drug }) {
  return (
    <main>
      {/* LCP 优化：priority = fetchpriority=high + preload */}
      <Image
        src={drug.imageUrl}
        priority            // 👈 真正的 LCP 图必须加，其他图片不要加
        alt={drug.name}
        width={800}
        height={600}        // 👈 CLS 优化：声明宽高，浏览器预留空间
      />
      <h1>{drug.name}</h1>

      {/* 广告位：提前占位，防止内容插入后触发 CLS */}
      <div style={{ minHeight: 90 }} className="ad-slot" />

      {/* INP 优化：搜索组件内部用 useTransition，避免按键卡顿 */}
      <Suspense fallback={<div>加载中...</div>}>
        <DrugSearch />
      </Suspense>

      <WebVitalsReporter />
    </main>
  );
}
```

web-vitals attribution 上报组件，采集三大 Core Web Vitals 并上报归因数据：

```tsx
// lib/vitals.tsx
'use client';
import { useEffect } from 'react';
import { onLCP, onINP, onCLS } from 'web-vitals/attribution';

function reportToAnalytics(
  name: string,
  value: number,
  attribution: Record<string, unknown>,
) {
  fetch('/api/vitals', {
    method: 'POST',
    body: JSON.stringify({ name, value, attribution }),
    keepalive: true, // 页面 unload 时也能成功发出
  });
}

export function WebVitalsReporter() {
  useEffect(() => {
    onLCP(({ name, value, attribution }) =>
      reportToAnalytics(name, value, attribution));
    onINP(({ name, value, attribution }) =>
      reportToAnalytics(name, value, attribution));
    onCLS(({ name, value, attribution }) =>
      reportToAnalytics(name, value, attribution));
  }, []);
  return null;
}
```

---

## 💡 一张图总结（面试速记）

**指标 + 优化速查**：

| 指标 | 良好阈值 | 核心优化手段 | 面试频率 |
|------|---------|------------|---------|
| DNS / TCP / SSL | < 100 / 100 / 200ms | dns-prefetch、HTTP/2、TLS 1.3 | ⭐⭐ |
| TTFB | < 600ms | CDN、Edge Function、DB 查询优化 | ⭐⭐⭐ |
| 白屏时间（FP） | < 1s | SSR、减少阻塞资源 | ⭐⭐⭐ |
| FCP | < 1.8s | SSR、Critical CSS、DNS 预解析 | ⭐⭐⭐ |
| DCL | < 2s | 减少阻塞 JS、defer 脚本 | ⭐⭐ |
| 首屏 / LCP | < 2.5s | fetchpriority + preload + font-display | ⭐⭐⭐⭐⭐ |
| TTI | < 3.8s | 代码分割、延迟非关键脚本 | ⭐⭐⭐ |
| TBT | < 200ms | 长任务拆分、scheduler.yield | ⭐⭐⭐⭐ |
| INP | < 200ms | 让出主线程 + useTransition + LoAF 归因 | ⭐⭐⭐⭐⭐ |
| CLS | < 0.1 | 图片预留宽高、transform 动画 | ⭐⭐⭐⭐ |
| FPS | ≥ 60fps | GPU 合成层、避免强制布局 | ⭐⭐⭐ |
| Memory | 无持续增长 | 清理事件监听、WeakMap 引用 | ⭐⭐⭐ |

**工具链路**：Lighthouse 发现问题 → DevTools Performance 主线程诊断 → web-vitals attribution 归因到元素 → LoAF API 精确到帧 → Event Timing 精确到三段时间 → Resource Timing 精确到每个资源

**RAIL 指导原则**：Response < 100ms / Animation 10ms/帧 / Idle 50ms 拆片 / Load < 5s

**INP 归因决策树**：输入延迟大 → LoAF 找长任务；处理时间大 → Profile 事件函数；渲染延迟大 → 排查强制同步布局；loadState = loading → 推迟非关键脚本。

---

## 📝 留个问题

INP 是 2026 年失败率最高的指标，43% 的网站仍未通过。你在实际项目里遇到过 INP 超标吗？最终归因到的是哪段时间（输入延迟 / 处理时间 / 渲染延迟），根因是什么？欢迎评论区说说你的具体案例。

---

> 🔖 这是「前端性能与监控系列」第 2 篇。上一篇：《浏览器渲染管线：从一帧 16.7ms 到 INP 的底层基础》；下一篇预告：《前端监控 SDK 从零搭建——采集、上报、告警全链路》
