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

| 指标 | 采集 API | 上报时机 | 核心算法 | 面试频率 |
|---|---|---|---|---|
| LCP | `largest-contentful-paint` | pagehide 封板 | 持续追踪候选值 + 交互封板 | ⭐⭐⭐⭐⭐ |
| CLS | `layout-shift` | pagehide 封板 | 会话窗口最大值（非累加） | ⭐⭐⭐⭐⭐ |
| INP | `event`（Event Timing） | pagehide 封板 | interactionId 聚合 + p98 | ⭐⭐⭐⭐ |
| FCP | `paint` | 即时上报 | 首次 first-contentful-paint | ⭐⭐⭐⭐ |
| TTFB | `navigation` | 即时上报 | responseStart - requestStart | ⭐⭐⭐ |
| TBT | `longtask` | load+5s 封板 | Σ max(0, duration-50)，FCP~TTI 窗口 | ⭐⭐⭐ |
| FSP | MutationObserver + rAF | DOM 稳定后 | 最后一次有意义 DOM 变化时刻 | ⭐⭐⭐ |
| SI | paint + LCP | load+3s 封板 | 三里程碑梯形法 AUC，±20% 精度 | ⭐⭐ |

---

## 📝 留个问题

你们项目的 LCP 现在是多少？有没有因为懒加载图片导致 LCP 虚高的情况？欢迎评论区晒出你的监控数据和优化方案。

---

> 🔖 这是「前端性能与监控系列」第 42 篇。上一篇：《前端监控体系设计》；下一篇预告：《错误监控专项——从捕获到还原的全链路》
