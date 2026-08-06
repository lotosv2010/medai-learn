# 手写性能监控 SDK：从 PerformanceObserver 到生产可用的采集库（面试收藏级）

> 面试官问：「你们的性能监控是怎么采集 LCP 的？」你说用了 `PerformanceObserver`，然后卡住了。底层到底发生了什么，web-vitals 帮你做了什么，你手写版和生产库的差距在哪——这篇全讲透。

---

## 🎯 这篇文章解决什么问题

很多人写过 `PerformanceObserver` 采集 LCP 的代码，但真正落到生产会踩一堆坑：LCP 采到的不是最终值、CLS 累加逻辑全错、INP 根本不知道怎么算、页面关闭前数据全丢。

这篇文章从「旧写法有什么问题」出发，拆解 web-vitals@v4 的内部原理，带你手写 mini LCP / CLS / INP 采集器，再对照生产级项目（g-heal-claw）的真实实现讲清楚生产边界。读完既懂原理，也能在面试里把这块讲得滴水不漏。

---

## 🔍 是什么：从"能采"到"采得准"

### 旧写法的致命问题

笔记里最常见的 LCP 采集代码长这样：

```javascript
new PerformanceObserver((entryList, observer) => {
  const entries = entryList.getEntries();
  entries.forEach(entry => {
    data.LCP = entry.startTime;
  });
  observer.disconnect(); // 问题就在这里
}).observe({ type: 'largest-contentful-paint', buffered: true });
```

看起来没问题，实际上 `observer.disconnect()` 调得太早了。

`largest-contentful-paint` 这个类型的 entry 会**持续触发**——每次浏览器发现更大的内容元素，都会产生一条新 entry。如果你在第一批回调里就 `disconnect`，后续更大的元素（比如懒加载的 banner 图）就再也采不到了。

同样的问题出在 CLS 上——旧写法直接累加所有 `layout-shift` 的 value，而 web-vitals 的 CLS 定义是「所有会话窗口中值最大的那个窗口」，不是全页面累加。

**这就是为什么要用 web-vitals 库，或者至少理解它做了什么。**

### web-vitals@v4 做了什么

v4 最大的变化是 **INP 正式取代 FID**（2024 年 3 月 Google 官方切换）。

| 版本 | 核心 Web Vitals 三项 |
|---|---|
| v3 及以前 | LCP + FID + CLS |
| v4 | LCP + INP + CLS |

FID 只测「第一次交互的输入延迟」，而 INP 测「整个页面生命周期内所有交互的响应延迟分布」，覆盖更全面。

### 五指标上报时机：即时 vs 封板

这是面试高频考点，也是手写版最容易出错的地方：

| 指标 | 上报时机 | 原因 |
|---|---|---|
| FCP | 即时（首次 paint 条目出现即触发） | paint 类型首次即终态，不会再变 |
| TTFB | 即时（navigation 条目加载完即可读） | responseStart 是确定值 |
| LCP | `pagehide` / `visibilitychange=hidden` 封板 | 候选元素持续刷新，用户交互后才封板 |
| CLS | `pagehide` / `visibilitychange=hidden` 封板 | 会话窗口持续累计 |
| INP | `pagehide` / `visibilitychange=hidden` 封板 | 交互列表持续增长，取最终分布 |

> 💬 **面试官**：LCP 和 FCP 都是用 PerformanceObserver 采集，为什么上报时机不一样？
>
> ✅ 标准答案：FCP 对应 `paint` 类型的 `first-contentful-paint` 条目，首次出现即为终态；LCP 对应 `largest-contentful-paint`，浏览器会持续产出新候选，用户交互后才封板，所以必须等 `pagehide` 再上报最终值。
> 🎁 加分答案：提到 `buffered: true` 的作用——SDK 可能在页面加载后才注册 Observer，`buffered` 让它能拿到历史条目，不错过已产生的 FCP。

---

## 🧠 核心原理：三个"难"指标

### LCP：候选追踪 + 用户交互封板

LCP 的采集不是「观察一次拿结果」，而是一个**持续更新候选值**的过程：

```javascript
let lcpValue = 0;
const po = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // 每次发现更大元素，就更新候选值
    if (entry.startTime > lcpValue) {
      lcpValue = entry.startTime;
    }
  }
});
po.observe({ type: 'largest-contentful-paint', buffered: true });
```

封板时机有两个：
1. **用户交互**（`keydown` / `pointerdown` / `click`）——交互后页面内容由用户驱动，LCP 不再有意义
2. **页面隐藏**（`pagehide` / `visibilitychange=hidden`）——页面离开前上报最终值

web-vitals 内部正是这个逻辑：维护一个 `metric.value`，每次新候选都更新，直到封板才调用回调。

🔧 **真实场景**：药品详情页的主图是懒加载的，首次渲染只有骨架屏，真正的商品大图 800ms 后才出现。如果在第一批 entry 就 `disconnect`，采到的 LCP 是骨架屏的时间，比真实值小了近 1s，监控数据完全失真。

### CLS：会话窗口状态机

CLS 最大的坑是：**不是把所有 layout-shift 的 value 累加**。

真正的算法是会话窗口累计：
- 把连续发生的 shift 组成一个「会话窗口」
- 窗口规则：两次 shift 间隔 ≤ 1s，且窗口总长 ≤ 5s
- 每个窗口内的 value 求和
- CLS = **所有窗口中 value 总和最大的那个**

还有一个重要过滤：`hadRecentInput === true` 的 shift 要忽略（用户交互后 500ms 内的偏移是预期行为，不算布局不稳定）。

```javascript
// CLS 会话窗口状态机
let clsValue = 0;           // 最终 CLS 值（最大窗口）
let sessionValue = 0;       // 当前窗口累计
let sessionEntries = [];    // 当前窗口条目

new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // 过滤用户交互引起的偏移
    if (entry.hadRecentInput) continue;

    const firstEntry = sessionEntries[0];
    const lastEntry = sessionEntries[sessionEntries.length - 1];

    // 判断是否属于当前窗口
    const isNewSession =
      sessionEntries.length !== 0 &&
      (entry.startTime - lastEntry.startTime > 1000 ||
       entry.startTime - firstEntry.startTime > 5000);

    if (isNewSession) {
      sessionValue = 0;
      sessionEntries = [];
    }

    sessionEntries.push(entry);
    sessionValue += entry.value;
    // 取所有窗口中的最大值
    if (sessionValue > clsValue) clsValue = sessionValue;
  }
}).observe({ type: 'layout-shift', buffered: true });
```

> 💬 **面试官**：CLS 的值是怎么计算的？
>
> ✅ 标准答案：CLS 是所有「会话窗口」中 value 总和最大的那个窗口的值，而不是页面全部布局偏移的累加。会话窗口要求相邻 shift 间隔 ≤ 1s 且窗口总长 ≤ 5s。
> 🎁 加分答案：提到 `hadRecentInput` 过滤——用户点击、输入后 500ms 内的偏移会被忽略，避免主动交互导致 CLS 虚高。

### INP：interactionId 聚合 + p98

INP 用到了 **Event Timing API**，这是面试时能拉开差距的知识点。

每次用户交互（点击、键盘输入）都会产生多个事件：`pointerdown` → `pointerup` → `click`。这些事件共享同一个 `interactionId`，把它们聚合起来，取这次交互中**最长的那条耗时**，就是这次交互的 INP 贡献值。

耗时的三段构成：

```
输入延迟（Input Delay）      处理时间（Processing Time）    呈现延迟（Presentation Delay）
    |—————————————————|——————————————————————————|—————————————————————|
  startTime       processingStart           processingEnd          paintTime
```

INP = `max(processingEnd - startTime)`，涵盖全程。

交互次数较多时取 **p98**（第 98 百分位），少量交互时取最大值。

```javascript
const interactionMap = new Map(); // interactionId → max duration

new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.interactionId) continue;
    const duration = entry.duration;
    const prev = interactionMap.get(entry.interactionId) ?? 0;
    if (duration > prev) interactionMap.set(entry.interactionId, duration);
  }
}).observe({ type: 'event', buffered: true, durationThreshold: 16 });

// pagehide 时计算 p98
function getINP() {
  const values = [...interactionMap.values()].sort((a, b) => b - a);
  if (values.length === 0) return 0;
  const p98Index = Math.floor(values.length * 0.02);
  return values[p98Index] ?? values[0];
}
```

> 💬 **面试官**：INP 和 FID 有什么区别？为什么 Google 要用 INP 替代 FID？
>
> ✅ 标准答案：FID 只测第一次用户交互的输入延迟，一次点击就决定了；INP 测整个页面生命周期内所有交互的响应延迟，取 p98，能反映整体交互质量。
> 🎁 加分答案：FID 不包含处理时间和呈现延迟，只测从事件到主线程开始处理的等待时间；INP 的 duration 涵盖输入延迟 + 处理时间 + 呈现延迟，更完整。

---

## ✍️ 手写实现：mini 采集器

理解了原理，手写就是把上面的逻辑串起来，加上封板工具函数和 BFCache 复活处理。

### onHidden：封板工具函数

LCP / CLS / INP 都需要在页面隐藏时上报最终值，封装一个工具函数：

```javascript
function onHidden(callback) {
  // pagehide 比 beforeunload 更可靠，BFCache 场景下 beforeunload 不触发
  window.addEventListener('pagehide', callback, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') callback();
  });
}
```

> 为什么用 `pagehide` 而不是 `beforeunload`？`beforeunload` 在 BFCache 场景下不触发，会导致数据丢失。`pagehide` 是更现代的替代方案。

### mini onLCP

```javascript
function onLCP(callback) {
  let lcpValue = 0;
  let reported = false;

  const po = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.startTime > lcpValue) lcpValue = entry.startTime;
    }
  });
  po.observe({ type: 'largest-contentful-paint', buffered: true });

  // 用户交互后封板（LCP 不再有意义）
  const seal = () => {
    if (!reported) { reported = true; po.disconnect(); callback(lcpValue); }
  };
  ['keydown', 'click', 'pointerdown'].forEach(t =>
    window.addEventListener(t, seal, { once: true, capture: true })
  );

  // 页面隐藏时封板
  onHidden(seal);
}
```

### mini onCLS

```javascript
function onCLS(callback) {
  let clsValue = 0;
  let sessionValue = 0;
  let sessionEntries = [];

  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      const first = sessionEntries[0];
      const last = sessionEntries[sessionEntries.length - 1];
      const isNew = sessionEntries.length > 0 &&
        (entry.startTime - last.startTime > 1000 ||
         entry.startTime - first.startTime > 5000);
      if (isNew) { sessionValue = 0; sessionEntries = []; }
      sessionEntries.push(entry);
      sessionValue += entry.value;
      if (sessionValue > clsValue) clsValue = sessionValue;
    }
  }).observe({ type: 'layout-shift', buffered: true });

  onHidden(() => callback(clsValue));
}
```

### mini onINP

```javascript
function onINP(callback) {
  const interactionMap = new Map();

  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.interactionId) continue;
      const prev = interactionMap.get(entry.interactionId) ?? 0;
      if (entry.duration > prev) {
        interactionMap.set(entry.interactionId, entry.duration);
      }
    }
  }).observe({ type: 'event', buffered: true, durationThreshold: 16 });

  onHidden(() => {
    const values = [...interactionMap.values()].sort((a, b) => b - a);
    if (values.length === 0) return;
    // p98：交互多时取第 98 百分位，少时取最大值
    const idx = Math.floor(values.length * 0.02);
    callback(values[idx] ?? values[0]);
  });
}
```

### BFCache 复活处理

BFCache（往返缓存）是浏览器把整个页面快照存起来，用户点「返回」时直接从内存恢复，不重新加载。这会导致 LCP / CLS / INP 的采集状态残留上一次页面的数据。

```javascript
// pageshow persisted=true 表示从 BFCache 恢复
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    // 重置所有指标状态，重新采集
    resetMetrics();
  }
});
```

web-vitals v3+ 内部已经处理了这个场景——每次 BFCache 复活，库会自动重置内部状态并重新订阅 Observer。自己手写时需要手动处理。

> 💬 **面试官**：BFCache 对性能监控有什么影响？怎么处理？
>
> ✅ 标准答案：BFCache 恢复时页面不会重新加载，但 LCP/CLS/INP 的 Observer 状态是上次页面的，需要监听 `pageshow` 事件的 `persisted` 属性，重置采集状态重新开始。
> 🎁 加分答案：`pagehide` 在 BFCache 场景下也会触发，此时应该上报当前指标值（用户可能不会回来），但标记 navigationType 为 `back-forward-cache` 便于服务端过滤。

---

## 🏭 生产边界：手写版之外还需要什么

手写 mini 版能跑，但生产环境还差几个关键环节。以下均来自 g-heal-claw 项目的真实实现。

### 上报时机：四层兜底机制

只靠 `pagehide` 封板是不够的。g-heal-claw 的 `transport/queue.ts` 实现了四层 flush 触发：

| 触发时机 | 层级 | 说明 |
|---|---|---|
| `buffer.length >= maxBatchSize` | Queue 层 | 攒够 30 条立即发 |
| `setInterval(flushIntervalMs)` | Queue 层 | 每 5s 定时发一次 |
| `window.pagehide` | Queue 层 | 页面卸载前强制 flush |
| `visibilitychange=hidden` | Queue 层 | 切后台时 flush |

各插件（FSP、Speed Index、LongTask）在 Plugin 层还有各自的 `pagehide` 兜底，做双保险。

```javascript
// queue.ts 关键逻辑
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', doFlush, { once: false });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') doFlush();
  });
}
```

### 上报通道：三级降级链

`transport/sender.ts` 实现了 beacon → fetch → image 三级降级：

```javascript
function detectBestChannel() {
  // 页面隐藏时优先 beacon（不阻塞页面卸载）
  if (document.visibilityState === 'hidden') {
    if (navigator.sendBeacon) return 'beacon';
  }
  if (typeof fetch !== 'undefined') return 'fetch';
  if (navigator.sendBeacon) return 'beacon';
  return 'image';
}
```

Beacon 有 64KB 单次限制，超出时自动拆批：

```javascript
function sendViaBeacon(events) {
  const body = serialize(events);
  if (body.length <= BEACON_MAX_BYTES) {
    return navigator.sendBeacon(beaconEndpoint, body);
  }
  // 超限拆批
  const batches = splitBatches(events);
  return batches.every(batch =>
    navigator.sendBeacon(beaconEndpoint, serialize(batch))
  );
}
```

Image 兜底只支持单条 ≤ 2KB，超出直接跳过：

```javascript
function sendViaImage(events) {
  for (const event of events) {
    const payload = encodeURIComponent(JSON.stringify({ dsn, events: [event] }));
    if (payload.length > 2048) continue; // 超限跳过
    const img = new Image();
    img.src = `${endpoint}?payload=${payload}`;
  }
}
```

> 💬 **面试官**：为什么在页面卸载时不用 fetch，而要用 sendBeacon？
>
> ✅ 标准答案：`fetch` 在页面卸载时可能被浏览器中断，导致请求丢失。`sendBeacon` 是专为「页面关闭时可靠上报」设计的，浏览器保证即使页面卸载也会把请求发出去。
> 🎁 加分答案：`fetch` 加 `keepalive: true` 也能达到类似效果，但单次有 64KB 限制，与 beacon 相同；两者都失败时才降级到 image 像素打点。

### IndexedDB 离线队列

网络抖动时请求失败，数据应该缓存到本地等网络恢复后重试。g-heal-claw 用 IndexedDB 实现离线队列（`transport/persistence.ts`）：

- **DB 名**：`ghc-offline-queue`，Store：`pending-events`
- **容量上限**：500 条，超出按 `createdAt` 升序删最旧
- **重试上限**：最多 3 次，`retryCount >= 3` 直接永久删除

```javascript
// 失败时写入 IndexedDB
async function store(events) {
  const record = { events, retryCount: 0, createdAt: Date.now() };
  await withStore('readwrite', s => s.add(record));
  await trim(); // 超限清理
}

// SDK 启动 + online 事件触发重试
async function retryPending() {
  const batches = await readAll();
  for (const batch of batches) {
    const ok = await sendBatch(batch.events);
    if (ok) {
      await remove(batch.id);
    } else {
      await incrementRetry(batch.id); // retryCount+1 或删除
    }
  }
}
```

🔧 **真实场景**：用户在地铁里打开医疗 APP，网络时断时续。如果不做离线队列，这些用户的性能数据全部丢失，而移动端用户的网络质量恰恰最差、最需要监控。

### eventId 幂等去重

网络重试会导致同一条事件上报多次。g-heal-claw 的方案是：

- SDK 侧每次 `createBaseEvent` 生成 UUID v4 作为 `eventId`
- 重试时**复用相同的 `eventId`**，不生成新 ID
- 服务端对 `eventId` 加 `UNIQUE` 约束，`INSERT ... ON CONFLICT DO NOTHING`

```javascript
// event.ts：生成带 eventId 的基础事件
function createBaseEvent(hub, type) {
  return {
    eventId: crypto.randomUUID(), // UUID v4
    type,
    projectId: hub.dsn.projectId,
    timestamp: Date.now(),
    sessionId: hub.sessionId,
    // ... 其他基础字段
  };
}
```

这样即使网络重试把同一条事件发了 3 次，服务端只入库一次，完全幂等。

> 💬 **面试官**：如何保证监控数据不重复入库？
>
> ✅ 标准答案：SDK 生成全局唯一 eventId（UUID），服务端对 eventId 建 UNIQUE 约束，重试时复用相同 eventId，INSERT ON CONFLICT DO NOTHING 保证幂等。
> 🎁 加分答案：UUID v4 是随机的，B-tree 索引写性能不如时序递增 ID；如果对写入性能有更高要求，可以考虑 UUID v7（时间有序），写性能更好。

### 采样率在序列化前完成

采样判断必须在事件序列化和入队之前做，否则已经申请了内存、占了配额却还是丢弃，白白浪费。

g-heal-claw 的 `filter.ts` 保证采样在 `enqueue` 之前：

```javascript
// filter.ts：采样率过滤（在入队前执行）
function applyFilters(event, options) {
  const rate = Math.min(
    options.sampleRate ?? 1,
    getTypeRate(event.type, options) // 各类型独立采样率
  );
  if (Math.random() >= rate) return null; // 丢弃
  // 继续其他过滤（ignoreErrors / 敏感字段脱敏 / beforeSend）
  return redactSensitiveFields(event);
}
```

---

## 🔬 对齐 web-vitals 源码：手写版还差什么

手写版能跑，但和 web-vitals 生产库比还差几个关键细节。

### attribution build：归因数据

web-vitals 提供了 `attribution` build（需单独引入），能告诉你指标劣化的具体原因：

- **LCP attribution**：LCP 元素是什么（`img` / `div` / `svg`）、URL、加载各阶段耗时
- **CLS attribution**：哪些 DOM 节点发生了偏移、偏移量、来源节点
- **INP attribution**：哪个元素触发了交互、事件类型、输入延迟 / 处理时间 / 呈现延迟各是多少

```javascript
import { onLCP } from 'web-vitals/attribution';

onLCP(metric => {
  console.log(metric.attribution.lcpEntry?.element); // 具体是哪个元素
  console.log(metric.attribution.timeToFirstByte);   // TTFB 占了多少
  console.log(metric.attribution.resourceLoadTime);   // 资源加载占了多少
});
```

手写版没有这些，只有一个数字。面试时提到「我们用了 attribution build 定位 LCP 劣化来自懒加载图片的 CDN 响应慢」是加分项。

### 导航类型判断

web-vitals 内部会读取 `PerformanceNavigationTiming.type` 区分导航类型：

| type | 含义 |
|---|---|
| `navigate` | 正常导航（输 URL / 点链接） |
| `reload` | 刷新 |
| `back-forward` | 浏览器前进/后退 |
| `back-forward-cache` | 从 BFCache 恢复 |

不同导航类型的 LCP 基线不同，混在一起统计会导致数据偏高（BFCache 恢复的 LCP 几乎为 0）。生产系统应该按 navigationType 分桶统计。

### BFCache 边界的完整处理

web-vitals v3+ 在 `pageshow persisted=true` 时会完整重置所有内部状态，重新订阅 Observer，并在下次 `pagehide` 时上报这次 BFCache 会话的指标值。

手写版最容易漏掉的是：BFCache 恢复后，**之前注册的 Observer 依然有效**，但 `interactionMap`、`sessionEntries` 等状态是上一次页面的，必须全部清空。

### 手写版 vs 生产库差异总结

| 能力 | 手写 mini 版 | web-vitals 生产库 |
|---|---|---|
| LCP 候选追踪 | ✅ | ✅ |
| CLS 会话窗口 | ✅ | ✅ |
| INP p98 计算 | ✅ | ✅ |
| BFCache 复活重置 | 需手动处理 | ✅ 自动处理 |
| attribution 归因 | ❌ | ✅（attribution build） |
| 导航类型判断 | ❌ | ✅ |
| 跨浏览器兼容 polyfill | ❌ | ✅ |
| TypeScript 类型定义 | ❌ | ✅ |

结论：理解原理之后，生产环境还是用 web-vitals 库，手写版用于面试和深度理解。

---

## 🔌 SDK 接入指南：从零到全链路可观测

上面讲了原理，这一节讲怎么把 g-heal-claw SDK 真正接起来。只覆盖性能相关插件，其他插件（错误、接口、资源）后续独立成文。

### 最小可用配置

只需三步：安装、配置 DSN、注册 `performancePlugin`。

```bash
pnpm add @g-heal-claw/sdk
```

```typescript
// src/monitor.ts
import { init, performancePlugin } from "@g-heal-claw/sdk";

init(
  {
    dsn: import.meta.env.VITE_GHC_DSN,
    environment: import.meta.env.VITE_GHC_ENV ?? "development",
  },
  { plugins: [performancePlugin()] }
);
```

在 `main.ts` 最顶部调用（早于框架初始化，避免错过 FCP / LCP 早期事件）：

```typescript
// main.ts
import "./monitor"; // 必须在第一行
import { createApp } from "vue";
import App from "./App.vue";
```

接入后打开控制台性能页，头部 badge 从 `empty`（SDK 未接入）变成 `live`（有真实数据），表示接入成功。

> 💬 **面试官**：控制台怎么判断 SDK 有没有正常上报数据？
>
> ✅ 标准答案：后端 `getPerformanceOverview` 判断 `vitals` 数组中是否有任意一项 `sampleCount > 0`，有则返回 `source: "live"`，否则 `source: "empty"`。
> 🎁 加分答案：`source: "error"` 是第三种状态，表示后端不可用，前端降级渲染空状态，而不是报错白屏——这是监控系统自身的可用性保障。

### performancePlugin 四个开关

`performancePlugin` 接受一个可选配置对象，四个布尔开关控制上报范围：

```typescript
performancePlugin({
  reportNavigation: true,   // Navigation 瀑布（DNS/TCP/请求/DOM各阶段），默认开
  reportDeprecated: true,   // FID + TTI（已废弃但保留），默认开
  reportTBT: true,          // Total Blocking Time，默认开
  reportFSP: false,         // 合成 FSP，默认关（配合 fspPlugin 避免重复）
})
```

`reportNavigation: true` 时，TTFB 事件会携带完整的 `navigation` 字段，包含 DNS / TCP / SSL / 请求 / 响应 / DOM 解析各阶段原始耗时，这是瀑布图的数据来源。

`reportDeprecated` 的意义：FID / TTI 虽已被 web-vitals v4 移除，但历史数据对比和旧版 Android WebView 兼容仍需要它们。关掉这个开关可以略微减少上报量，但会丢失这两个维度。

### 补充两个实验室指标

`fspPlugin` 和 `speedIndexPlugin` 是独立插件，需要单独注册。

**为什么 FSP 不放进 performancePlugin？**

FSP（首屏时间）基于 MutationObserver 合成，和 FCP（浏览器原生 paint 事件）是两套采集通道。如果 `performancePlugin({ reportFSP: true })` 同时又注册了 `fspPlugin()`，同一次页面加载会上报两条 FSP 事件，服务端聚合时数据翻倍。设计上选择默认关闭 `reportFSP`，让 `fspPlugin` 独立承担这个职责。

```typescript
import {
  init, performancePlugin, fspPlugin, speedIndexPlugin
} from "@g-heal-claw/sdk";

init(
  { dsn: import.meta.env.VITE_GHC_DSN },
  {
    plugins: [
      performancePlugin({ reportFSP: false }), // FSP 交给 fspPlugin
      fspPlugin({
        settleMs: 1000,    // DOM 静默 1s 后认为首屏稳定
        minFspMs: 100,     // 低于 100ms 视为误判丢弃
        maxFspMs: 10000,   // 超过 10s 强制封板
      }),
      speedIndexPlugin(),  // 三里程碑梯形法，精度 ±20%，适合趋势对比
    ],
  }
);
```

> 💬 **面试官**：FSP 和 FCP 有什么区别？
>
> ✅ 标准答案：FCP 是浏览器原生指标，由 `paint` 类型的 PerformanceEntry 产出，测量"第一块有意义内容出现"的时间；FSP 是 SDK 合成指标，通过 MutationObserver 追踪 DOM 变化，测量"首屏 DOM 稳定"的时间，两者角度不同。
> 🎁 加分答案：FCP 可能在骨架屏出现时就触发，但用户看到真实内容要等更久；FSP 的 settle 窗口（默认 1s 无新 DOM 变化）更能反映"用户真正看到有效内容"的时刻。

**Speed Index 的使用建议**

SI 精度只有 ±20%，不适合用绝对值做告警（"SI > 3400ms 触发告警"这种配置会有大量误报）。正确的用法是**趋势监控**：某次发布后 SI 从 2800ms 升到 3500ms，相对变化 25%，值得排查。

### 补充长任务监控

```typescript
import { init, performancePlugin, longTaskPlugin } from "@g-heal-claw/sdk";

init(
  { dsn: import.meta.env.VITE_GHC_DSN },
  {
    plugins: [
      performancePlugin(),
      longTaskPlugin({
        minDurationMs: 50,        // 低于 50ms 不算长任务
        maxBatch: 20,             // 攒够 20 条批量上报
        flushIntervalMs: 5000,    // 每 5s 定时上报
        reportAttribution: true,  // 上报任务归因（哪段脚本导致的）
      }),
    ],
  }
);
```

`longTaskPlugin` 采集的是"主线程被占用超过 50ms 的任务"，这是 TBT（Total Blocking Time）的原始数据来源。控制台长任务卡片会展示 `count`（总次数）、`p75Ms`（75 分位耗时）和三级 tier 分布：

| tier | 耗时范围 | 含义 |
|---|---|---|
| longTask | 50ms ~ 2s | 普通长任务，用户可能感知到轻微卡顿 |
| jank | 2s ~ 5s | 严重卡顿，交互响应明显延迟 |
| unresponsive | ≥ 5s | 页面失响应，用户体验极差 |

> 💬 **面试官**：TBT 和长任务是什么关系？
>
> ✅ 标准答案：TBT 是 FCP 到 TTI 时间窗口内，所有长任务超出 50ms 部分的累加：`TBT = Σ max(0, duration - 50ms)`。长任务是原始采集，TBT 是在特定时间窗口内对长任务的聚合计算。
> 🎁 加分答案：TBT 是 Lighthouse 实验室指标，只在 FCP~TTI 窗口内计算；而 `longTaskPlugin` 采集整个页面生命周期的长任务，控制台的长任务卡片数据范围更广，更能反映运行时的整体主线程健康度。

---

## 📊 看懂控制台数据

接入 SDK 后，打开智愈系统性能页，数据从哪来、代表什么——逐一拆解。

### source badge：数据三态

控制台右上角 badge 反映当前数据状态。判定逻辑在 `apps/web/lib/api/performance.ts`：

```typescript
// vitals 中有任意一项 sampleCount > 0 → live；全为 0 → empty；fetch 抛错 → error
const hasSamples = data.vitals.some((v) => v.sampleCount > 0);
return { source: hasSamples ? "live" : "empty", data };
```

```typescript
// apps/web/app/(console)/monitor/performance/page.tsx
function SourceBadge({ source }: { source: OverviewSource }) {
  if (source === "live")
    return <Badge variant="good">数据来自 perf_events_raw</Badge>;
  if (source === "empty")
    return <Badge variant="warn">暂无数据 · 请确保 SDK 已接入并访问 demo</Badge>;
  return <Badge variant="destructive">大盘 API 不可用 · 检查 apps/server</Badge>;
}
```

> 💬 **面试官**：控制台怎么判断 SDK 有没有正常上报数据？
>
> ✅ 标准答案：后端检查 `vitals` 数组中是否有任意一项 `sampleCount > 0`，有则 `source: "live"`，否则 `source: "empty"`。
> 🎁 加分答案：`source: "error"` 表示后端不可用，前端降级渲染空态而非白屏——监控系统自身也需要高可用设计。

### 头部 7 张指标卡片

卡片数据来自 `common-metrics-cards.tsx`，每张卡片的计算方式源码里都有明确注释：

```typescript
// apps/web/app/(console)/monitor/performance/common-metrics-cards.tsx
const fmpMs = stageOf("firstScreen")?.ms;              // fspPlugin 上报
const domReadyMs = stageOf("domParse")?.endMs;         // DOMContentLoaded 时间点
const fullyLoadedMs = stages.reduce<number | undefined>(
  (acc, s) => (acc === undefined ? s.endMs : Math.max(acc, s.endMs)),
  undefined,
);                                                     // 所有 stage 中最大的 endMs
const sampleCount = vitals.reduce<number>(
  (acc, v) => Math.max(acc, v.sampleCount),
  0,
);                                                     // vitals 中 sampleCount 最大值
```

`fullyLoadedMs` 取所有 stage 的 `endMs` 最大值，而不是直接用 `total` 字段——因为 `firstScreen` 和 `lcp` 是合成阶段，endMs 可能超过 Navigation 串联结果。

长任务卡片额外渲染三级分布条 `LongTaskTierBar`，用颜色直观呈现各 tier 占比：

```typescript
function LongTaskTierBar({ tiers }: { readonly tiers: LongTaskSummary["tiers"] }) {
  const total = tiers.longTask + tiers.jank + tiers.unresponsive;
  if (total === 0) return null;
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full">
      <div className="bg-emerald-500" style={{ width: pct(tiers.longTask) }} />
      <div className="bg-amber-500"   style={{ width: pct(tiers.jank) }} />
      <div className="bg-rose-500"    style={{ width: pct(tiers.unresponsive) }} />
    </div>
  );
}
```

绿色 = longTask（50ms~2s）/ 黄色 = jank（2s~5s）/ 红色 = unresponsive（≥5s）。长任务卡片全绿说明主线程压力可控，出现红色条需要排查。

| 卡片 | 数据字段 | 计算方式 |
|---|---|---|
| 首屏时间（FMP） | `stages.firstScreen.ms` | fspPlugin 上报，DOM 稳定时刻 |
| TTFB | `vitals.TTFB.value` | 首字节时间 p75 |
| DOM Ready | `stages.domParse.endMs` | DOMContentLoaded 触发时刻 |
| 页面完全加载 | `max(stages[*].endMs)` | 含 firstScreen 和 LCP 合成阶段 |
| 总阻塞时间 | `vitals.TBT.value` | sampleCount=0 时显示 N/A |
| 长任务 | `longTasks.count / p75Ms / tiers` | 含 tier 三色分布条 |
| 采样数量 | `max(vitals[*].sampleCount)` | 置信度参考，< 50 时 p75 波动大 |

### 性能视图趋势图

趋势图是三轴组合图（`TrendChart`），每小时一桶，数据来自 `TrendBucket`：

```typescript
// apps/web/lib/api/performance.ts
export interface TrendBucket {
  readonly hour: string;           // UTC 时间，1小时一桶
  readonly lcpP75: number;  readonly fcpP75: number;
  readonly clsP75: number;  readonly inpP75: number;
  readonly ttfbP75: number; readonly tbtP75: number;
  readonly fmpP75: number;  readonly siP75: number;
  readonly dnsP75: number;  readonly tcpP75: number;
  readonly domParseP75: number; readonly resourceLoadP75: number;
  readonly sampleCount: number;
}
```

图表默认展示「样本数 + 首屏时间 + CLS」，其余 12 个系列通过图例按需切换。三轴解决量纲不统一：左轴耗时（ms）/ 右轴 CLS 评分（0~1）/ 右轴样本数（柱状）。CLS 轴 domain 对齐 web-vitals 阈值（≤0.1 / ≤0.25 / ≤0.5 / ≤1），避免数值在图中被放大夸张。

### 页面加载瀑布图（9 段）

瀑布图用 AntV G2 渲染横向甘特条，核心是 `coordinate.transpose` 把竖向区间图转为横向：

```typescript
// apps/web/app/(console)/monitor/performance/page-waterfall.tsx
chart.coordinate({ transform: [{ type: "transpose" }] });
chart.interval()
  .data(data)
  .encode("x", "label")
  .encode("y", ["startMs", "endMs"])   // range 区间编码，两端点即 [startMs, endMs]
  .encode("color", "label")
  .axis("y", { position: "top", grid: true, title: "ms" });
```

SDK 上报的 NavigationTimingSchema 原始字段（随 TTFB 事件携带）：

```typescript
{
  dns: number,          // DNS 查询耗时
  tcp: number,          // TCP 连接耗时
  ssl?: number,         // TLS 握手耗时（HTTPS 才有）
  request: number,      // 请求发出到首字节等待
  response: number,     // 内容传输耗时
  domParse: number,     // HTML 解析 + DOM 构建
  domReady: number,     // DOMContentLoaded 触发
  resourceLoad: number, // 子资源（JS/CSS/图片）加载
  total: number,        // 总耗时（load 事件）
  redirect?: number,    // 重定向耗时（有重定向才有）
  type: "navigate" | "reload" | "back_forward" | "prerender"
}
```

前 7 段（DNS~资源加载）是 Navigation Timing 的串联累积，`firstScreen` 和 `lcp` 是独立的合成阶段，起点均为 0，代表从导航开始到该事件的绝对总耗时，不参与串联。这也是"首屏时间"和"LCP"条的起点看起来和其他段不对齐的原因。

> 💬 **面试官**：瀑布图里首屏时间和 LCP 的起点为什么不一样？
>
> ✅ 标准答案：DNS~资源加载是串联阶段，endMs 累积递增；首屏（FSP）和 LCP 是独立全程耗时，startMs = 0，表示从导航开始到该事件的绝对时间，不参与串联。
> 🎁 加分答案：这两个合成阶段由 fspPlugin 和 LCP observer 独立上报，后端单独补充到 `stages` 数组；前端用 `stages.reduce((acc, s) => Math.max(acc, s.endMs), 0)` 计算时间轴总宽度。

🔧 **定位瓶颈**：DNS 段异常长 → DNS 预解析未配置；response 段异常长 → 服务端响应慢或 CDN 命中率低；resourceLoad 段异常长 → JS bundle 过大或图片未做懒加载。

### Core Web Vitals 面板

面板展示 9 个指标的三段式评级条，CONFIGS 数组完整定义了阈值和元信息：

```typescript
// apps/web/app/(console)/monitor/performance/core-vitals-panel.tsx
// 面板展示顺序：LCP → INP → CLS → TTFB → FCP → TTI → TBT → FID → SI
const CONFIGS = [
  { key: "LCP",  thresholds: [2500, 4000], poorCap: 8000,  unit: "ms" },
  { key: "INP",  thresholds: [200,  500],  poorCap: 1200,  unit: "ms" },
  { key: "CLS",  thresholds: [0.1,  0.25], poorCap: 1,    unit: ""   },
  { key: "TTFB", thresholds: [800,  1800], poorCap: 4000,  unit: "ms" },
  { key: "FCP",  thresholds: [1800, 3000], poorCap: 6000,  unit: "ms" },
  { key: "TTI",  thresholds: [3800, 7300], poorCap: 15000, unit: "ms" },
  { key: "TBT",  thresholds: [200,  600],  poorCap: 2000,  unit: "ms" },
  { key: "FID",  thresholds: [100,  300],  poorCap: 1000,  unit: "ms", deprecated: true, replacedBy: "INP" },
  { key: "SI",   thresholds: [3400, 5800], poorCap: 10000, unit: "ms" },
] as const;
```

`poorCap` 是 poor 段的视觉上界，超过这个值指针仍在 poor 区内不会跑出色条。`deprecated: true` 的指标渲染"Deprecated"灰色 badge，数值仍展示保留历史对比。

面板支持"当前 / 环比"两种视图。环比模式下，数值变化方向颜色规则：对所有 9 个指标（均为越低越好），数值下降显绿（优化），上升显红（恶化）。当指标处于 warn 或 poor 状态时，数值旁出现 AI 诊断按钮 🤖，点击可调起 AI 分析优化建议。

### 维度分析

维度分析支持 8 个维度，定义来自 `dimension-tabs.tsx`：

```typescript
// apps/web/app/(console)/monitor/performance/dimension-tabs.tsx
const TABS = [
  { key: "device",   label: "机型" },
  { key: "browser",  label: "浏览器" },
  { key: "os",       label: "操作系统" },
  { key: "version",  label: "版本" },
  { key: "region",   label: "地域" },
  { key: "language", label: "语言" },
  { key: "network",  label: "网络" },
  { key: "timezone", label: "时区" },
] as const;
```

每个 Tab 内是"左 1/3 环图 + 右 2/3 表格"布局，表格列：`#` / 取值 / 占比（`sharePercent`，0~100）/ FMP 均值（`fmpAvgMs`）。

🔧 **典型排查场景**：某次发布后 LCP 整体劣化，按 browser 维度下钻发现只有 Safari 劣化，其他浏览器正常——定位到 Safari 不支持某个 CSS 特性导致重排，避免了全量回滚。

### 全链路数据流：从 Controller 到页面渲染

理解完每个面板，最后看一眼完整的数据流——从 Next.js 页面到后端聚合，每一层做什么。

**前端页面（RSC，强制动态渲染）**

```typescript
// apps/web/app/(console)/monitor/performance/page.tsx
// force-dynamic：禁止 SSG 冻结，每次请求都从 apps/server 拉最新聚合结果
export const dynamic = "force-dynamic";

export default async function PerformancePage({ searchParams }) {
  const windowHours = await resolveWindowHours(searchParams);
  const sp = await searchParams;
  // pagePath 来自 PagePathFilter 下拉，用于聚焦单个页面的瀑布图
  const pagePath = typeof sp?.pagePath === "string" ? sp.pagePath : undefined;
  const { source, data } = await getPerformanceOverview({ windowHours, pagePath });
  // 依次渲染：指标卡 / 趋势图 / 瀑布图 / Core Vitals / FMP 表 / 维度分析
}
```

`searchParams` 在 Next.js 15+ 是 `Promise`，必须 `await` 后再读取。`resolveWindowHours` 把 `range=24h` 这类顶栏参数转成 `windowHours=24` 传给后端。

**后端 Controller（鉴权 + 参数校验入口）**

```typescript
// apps/server/src/dashboard/monitor/performance.controller.ts
@Get("overview")
@UsePipes(new ZodValidationPipe(OverviewQuerySchema))
@UseGuards(JwtAuthGuard, ProjectGuard)
public async getOverview(
  @Query() query: OverviewQuery,
): Promise<{ data: PerformanceOverviewDto }> {
  const data = await this.service.getOverview(query);
  return { data };
}
```

Controller 只负责两件事：用 `JwtAuthGuard + ProjectGuard` 鉴权、用 `ZodValidationPipe` 校验 query 参数（`projectId` 必填、`windowHours` 范围 1~168）。核心聚合全在 Service。

**后端 Service：18 路并发 DB 查询**

一次 `getOverview` 请求内部用 `Promise.all` 并发 18 路聚合：

```typescript
// apps/server/src/dashboard/monitor/performance.service.ts
// current：当前时间窗；previous：前一周期（用于计算环比 delta）
const current: WindowParams  = { projectId, sinceMs: now - windowMs, untilMs: now, ... };
const previous: WindowParams = { projectId, sinceMs: now - 2*windowMs, untilMs: now - windowMs, ... };
```

```typescript
const [
  vitalsCurrent, vitalsPrevious,     // Vitals p75（两个周期，用于环比）
  trendRows, navTrendRows,            // 趋势 + Navigation 子字段趋势
  waterfallSamples,                   // 瀑布图原始样本
  slowPageRows, fmpPageRows,          // 慢页面 Top N + FMP 页面列表
  browserRows, browserVersionRows, osRows, osVersionRows,
  platformRows, networkRows, countryRows, languageRows,
  timezoneRows,                       // 8 个维度聚合行
  longTasksCurrent, distinctPaths,    // 长任务概览 + 页面路径下拉
] = await Promise.all([ /* 18 路并发 */ ]);
```

18 路全部并发，DB 端无写竞争，总耗时等于最慢的一路而非串行累加。

**环比 delta 计算**

每个 Vital 卡片右上角的"↑12.5%"来自 `computeDelta`：

```typescript
function computeDelta(current: number, previous: number | undefined) {
  if (previous == null || previous === 0 || current === 0)
    return { deltaPercent: 0, deltaDirection: "flat" };
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct * 10) / 10;
  if (Math.abs(rounded) < 0.1)
    return { deltaPercent: 0, deltaDirection: "flat" };
  return {
    deltaPercent: Math.abs(rounded),
    deltaDirection: rounded > 0 ? "up" : "down",
  };
}
```

`< 0.1%` 的变化视为 flat，避免显示无意义的微小波动。`deltaDirection: "up"` 配合前端颜色规则：所有指标均为越低越好，所以 `up` = 恶化 = 红，`down` = 优化 = 绿。

**瀑布图：中位数而非均值**

7 个串联 Navigation 阶段用所有样本的中位数拼接：

```typescript
function buildStages(samples: readonly NavigationTiming[], firstScreenMs, lcpMs) {
  const dns = median(samples.map((s) => s.dns));
  const tcp = median(samples.map((s) => s.tcp));
  const ssl = median(samples.map((s) => s.ssl ?? 0));
  // ... request / response / domParse / resourceLoad
  let cursor = 0;
  for (const [key, label, ms] of serial) {
    stages.push({ key, label, ms, startMs: cursor, endMs: cursor + ms });
    cursor += ms;
  }
  // firstScreen / lcp 是整体指标，startMs = 0，不参与串联
  stages.push({ key: "firstScreen", ms: firstScreenMs, startMs: 0, endMs: firstScreenMs });
  stages.push({ key: "lcp",         ms: lcpMs,         startMs: 0, endMs: lcpMs });
}
```

用中位数而非均值：单次极慢加载（比如 DNS 劫持导致某条样本 dns=3000ms）不会把中位数拉高，瀑布图更能代表"典型用户体验"。

> 💬 **面试官**：后端性能大盘接口一次请求要查多少路数据？怎么保证性能？
>
> ✅ 标准答案：18 路 DB 查询，全部用 `Promise.all` 并发执行，总耗时等于最慢的一路。两个时间窗（当前 + 前一周期）分别聚合用于计算环比；瀑布图用中位数构建，对离群样本有抗性。
> 🎁 加分答案：`pagePathFilter` 不影响 `distinctPaths` 查询——路径下拉列表用 `baseParams`（不带 pagePath 过滤）单独查，保证筛选后下拉仍显示全量页面路径，用户体验细节。

---

## 🚀 完整最佳实践代码

### 真实 SDK 初始化（g-heal-claw 项目）

这是生产级前端监控 SDK 的完整注册方式，覆盖了性能、异常、API、资源、埋点全链路：

```typescript
import {
  init, contextPlugin, breadcrumbPlugin,
  errorPlugin, httpPlugin, apiPlugin,
  performancePlugin, pageViewPlugin,
  resourcePlugin, customPlugin,
} from "@g-heal-claw/sdk";

export function initGhc(): void {
  init(
    {
      dsn: import.meta.env.VITE_GHC_DSN,
      environment: import.meta.env.VITE_GHC_ENV ?? "development",
      release: import.meta.env.VITE_GHC_RELEASE,
      debug: true,
    },
    {
      plugins: [
        contextPlugin(),       // 采集 UA / 设备 / UTM 等上下文
        breadcrumbPlugin(),    // 记录用户行为轨迹（面包屑）
        errorPlugin(),         // JS 异常 + Promise 拒绝 + 资源错误
        httpPlugin({ codeFilter: (code) => code >= 400 }), // HTTP 错误拦截
        apiPlugin({ slowThreshold: 2000 }),  // API 监控，2s 以上标慢请求
        performancePlugin(),   // Core Web Vitals + 瀑布图
        pageViewPlugin(),      // PV/UV + SPA 路由切换
        resourcePlugin(),      // 静态资源加载监控
        customPlugin(),        // track/time/log 自定义上报
      ],
    },
  );
}
```

### 仅性能插件精简版

如果项目只需要性能监控，不需要错误、接口等其他插件，用这个精简版：

```typescript
import {
  init,
  performancePlugin,
  fspPlugin,
  speedIndexPlugin,
  longTaskPlugin,
} from "@g-heal-claw/sdk";

export function initPerformanceMonitor(): void {
  init(
    {
      dsn: import.meta.env.VITE_GHC_DSN,
      environment: import.meta.env.VITE_GHC_ENV ?? "development",
    },
    {
      plugins: [
        // Core Web Vitals + Navigation 瀑布 + TBT + FID/TTI
        performancePlugin({
          reportNavigation: true,  // 瀑布图数据来源
          reportDeprecated: true,  // 保留 FID/TTI 历史对比
          reportTBT: true,
          reportFSP: false,        // 交给 fspPlugin 避免重复
        }),
        // 首屏时间（MutationObserver 合成）
        fspPlugin({ settleMs: 1000, minFspMs: 100, maxFspMs: 10000 }),
        // Speed Index 近似值（趋势监控用，非精确值）
        speedIndexPlugin(),
        // 长任务原始数据（TBT 的底层数据源）
        longTaskPlugin({ reportAttribution: true }),
      ],
    },
  );
}
```

### mini SDK 完整实现（约 120 行）

下面是一个可直接运行的 mini SDK，接口风格对齐 web-vitals：

```javascript
// ---- 工具函数 ----
function onHidden(cb) {
  window.addEventListener('pagehide', cb, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') cb();
  });
}

function ratingOf(value, [good, needsImprovement]) {
  if (value <= good) return 'good';
  if (value <= needsImprovement) return 'needs-improvement';
  return 'poor';
}
```

```javascript
// ---- LCP ----
export function onLCP(callback) {
  let lcpValue = 0, reported = false;
  const po = new PerformanceObserver((list) => {
    for (const e of list.getEntries())
      if (e.startTime > lcpValue) lcpValue = e.startTime;
  });
  po.observe({ type: 'largest-contentful-paint', buffered: true });

  const seal = () => {
    if (reported) return;
    reported = true; po.disconnect();
    callback({ value: lcpValue, rating: ratingOf(lcpValue, [2500, 4000]) });
  };
  ['keydown','click','pointerdown'].forEach(t =>
    window.addEventListener(t, seal, { once: true, capture: true }));
  onHidden(seal);
}
```

```javascript
// ---- CLS ----
export function onCLS(callback) {
  let clsValue = 0, sessionValue = 0, sessionEntries = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.hadRecentInput) continue;
      const first = sessionEntries[0], last = sessionEntries.at(-1);
      const isNew = sessionEntries.length > 0 &&
        (e.startTime - last.startTime > 1000 ||
         e.startTime - first.startTime > 5000);
      if (isNew) { sessionValue = 0; sessionEntries = []; }
      sessionEntries.push(e); sessionValue += e.value;
      if (sessionValue > clsValue) clsValue = sessionValue;
    }
  }).observe({ type: 'layout-shift', buffered: true });
  onHidden(() =>
    callback({ value: clsValue, rating: ratingOf(clsValue, [0.1, 0.25]) }));
}
```

```javascript
// ---- INP ----
export function onINP(callback) {
  const map = new Map();
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (!e.interactionId) continue;
      const prev = map.get(e.interactionId) ?? 0;
      if (e.duration > prev) map.set(e.interactionId, e.duration);
    }
  }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
  onHidden(() => {
    const vals = [...map.values()].sort((a, b) => b - a);
    if (!vals.length) return;
    const inp = vals[Math.floor(vals.length * 0.02)] ?? vals[0];
    callback({ value: inp, rating: ratingOf(inp, [200, 500]) });
  });
}
```

```javascript
// ---- BFCache 复活处理 ----
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    // BFCache 复活：重新初始化所有指标采集
    onLCP(report); onCLS(report); onINP(report);
  }
});
```

---

## 💡 一张图总结（面试速记）

| 指标 | 采集 API / 来源 | 上报时机 | 核心算法 | 插件 | 面试频率 |
|---|---|---|---|---|---|
| LCP | `largest-contentful-paint` | pagehide 封板 | 持续追踪候选值 + 交互封板 | performancePlugin | ⭐⭐⭐⭐⭐ |
| CLS | `layout-shift` | pagehide 封板 | 会话窗口最大值（非累加） | performancePlugin | ⭐⭐⭐⭐⭐ |
| INP | `event`（Event Timing） | pagehide 封板 | interactionId 聚合 + p98 | performancePlugin | ⭐⭐⭐⭐ |
| FCP | `paint` | 即时上报 | 首次 first-contentful-paint | performancePlugin | ⭐⭐⭐⭐ |
| TTFB | `navigation` | 即时上报 | responseStart - requestStart | performancePlugin | ⭐⭐⭐ |
| TBT | `longtask` | load+5s 封板 | Σ max(0, duration-50)，FCP~TTI | performancePlugin | ⭐⭐⭐ |
| FSP | MutationObserver + rAF | DOM 稳定后 | settle 窗口 1s，三路兜底 | fspPlugin | ⭐⭐⭐ |
| SI | paint + LCP 里程碑 | load+3s 封板 | 三里程碑梯形法 AUC，±20% 精度 | speedIndexPlugin | ⭐⭐ |
| 长任务 | `longtask` | 批量 flush | 50ms 过滤 + tier 分级 | longTaskPlugin | ⭐⭐⭐ |
| FID（废弃） | `first-input` | 即时上报 | processingStart - startTime | performancePlugin | ⭐⭐ |
| TTI（废弃） | longtask + FCP | 5s quiet 窗口 | 推导式，pagehide 兜底 | performancePlugin | ⭐⭐ |

---

## 🏗️ 项目实战

理论讲透了，来看一个完整的"从接入到发现问题"闭环。

### 场景：药品搜索页上线后 LCP 劣化

**背景**：医疗电商的药品搜索页是核心流量入口，新版本增加了"智能推荐"模块，上线后收到用户反馈"打开变慢了"。

**第一步：看头部卡片**

打开控制台性能页，source badge 显示 `live`，说明 SDK 上报正常。头部卡片数据：

| 卡片 | 上线前 | 上线后 | 变化 |
|---|---|---|---|
| 首屏时间（FMP） | 1.2s | 2.8s | ↑ 133% |
| LCP | 1.8s | 4.1s | ↑ 128%（poor） |
| TBT | 180ms | 520ms | ↑ 189%（poor） |
| 采样数量 | 3200 | 3500 | 正常 |

LCP 和 TBT 同时劣化，说明不是单纯的网络问题，主线程也在承压。

**第二步：看瀑布图定位阶段**

瀑布图显示 `resourceLoad` 阶段从 320ms 升到 980ms，其他阶段基本不变。结合 TBT 升高，锁定方向：新增的"智能推荐"模块加载了额外的 JS bundle，block 了主线程。

**第三步：看维度分析缩小范围**

按 network 维度下钻：4G 用户 LCP = 4.8s（poor），WiFi 用户 LCP = 2.2s（needs-improvement）。说明问题在 bundle 大小，而非服务端响应，网络敏感用户感受最明显。

**第四步：看长任务卡片确认主线程压力**

长任务卡片：count = 47 次，p75 = 280ms，tier 分布条出现黄色（jank 占比 30%）。TBT = 520ms，说明推荐模块引入的 JS 在解析执行时频繁阻塞主线程。

**定位结论**：推荐模块没有做代码分割，整包同步加载导致 resourceLoad 阶段拉长、TBT 飙升、LCP 连带劣化。

**修复方案**：

```typescript
// 修复前：同步导入，block 主线程
import { RecommendModule } from "@/modules/recommend";

// 修复后：懒加载 + Suspense，推迟到 LCP 完成后再加载
const RecommendModule = lazy(() => import("@/modules/recommend"));

function SearchPage() {
  return (
    <>
      <SearchResults />  {/* LCP 元素，优先渲染 */}
      <Suspense fallback={null}>
        <RecommendModule />  {/* 非关键模块，延迟加载 */}
      </Suspense>
    </>
  );
}
```

修复上线后，LCP 回落到 1.9s（good），TBT 降至 160ms（good），首屏时间 1.3s。

> 💬 **面试官**：你们是怎么发现和定位性能问题的？
>
> ✅ 标准答案：通过监控系统的头部卡片发现指标异常，用瀑布图定位到具体阶段，结合维度分析缩小影响范围，再看长任务卡片确认主线程状态，最终锁定到代码分割缺失导致 bundle 同步加载。
> 🎁 加分答案：监控系统的价值不只是"知道慢了"，而是把模糊的用户感受转化为可量化的数据链——从 LCP 劣化 → resourceLoad 段拉长 → 长任务增加 → 没做代码分割，每一跳都有数据支撑，不靠猜。

---

## 📝 留个问题

你们项目的 LCP 现在是多少？有没有因为懒加载图片导致 LCP 虚高的情况？欢迎评论区晒出你的监控数据和优化方案。

---

> 🔖 这是「前端性能与监控系列」第 42 篇。上一篇：《前端监控体系设计》；下一篇预告：《错误监控专项——从捕获到还原的全链路》
