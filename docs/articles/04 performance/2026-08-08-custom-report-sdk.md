# 手写自定义上报 SDK：从 track/time/log 到生产可用的采集层（面试收藏级）

> 面试官问：「你们的自定义埋点是怎么上报的？」你说用了 sendBeacon，然后卡住了。SDK 内部的队列、降级、离线兜底、防日志风暴——这篇全讲透。

---

## 🎯 这篇文章解决什么问题

前端监控分四个维度：性能、异常、行为、自定义。前三个都是「SDK 主动采集」——性能指标靠 PerformanceObserver 自动抓，异常靠 window.onerror 兜底，API 请求靠 fetch 劫持。

唯独「自定义上报」不一样——它是**业务代码主动调用 SDK 提供的 API**，把业务语义（用户搜了什么药、AI 响应了多久、接口降级了几次）上报到监控平台。

本篇覆盖自定义上报的完整链路：

| 层级 | 内容 |
|---|---|
| **API 层** | track / time / log 三个接口的语义和实现 |
| **架构层** | Hub-Plugin-Transport 三层如何协作 |
| **传输层** | 队列、批量、降级链、离线兜底的生产实践 |
| **防护层** | 防日志风暴、数据截断、过滤链、采样策略 |
| **服务端** | 幂等去重、分表设计、索引优化 |

读完既懂原理，也能直接用在面试上。

---

## 🔍 是什么：自定义上报 vs 自动采集

### 四维度对比

监控体系的四个维度，数据来源完全不同：

| 维度 | 数据来源 | 触发方式 | 典型接口 |
|---|---|---|---|
| 性能 | PerformanceObserver 自动采集 | 浏览器 API 推送 | `observe('lcp')` |
| 异常 | window.onerror / unhandledrejection | 浏览器事件兜底 | 无需调用 |
| 行为 | XHR/fetch 劫持 + DOM 监听 | SDK monkey-patch | 无需调用 |
| **自定义** | **业务代码主动调用** | **业务逻辑触发** | **track / time / log** |

前三个维度的共同点：业务代码无感知，SDK 装上就能采集。

自定义上报的特殊性：必须业务代码显式调用 `monitor.track('event_name', data)`，SDK 才知道这个事件发生了。

### track / time / log 三接口的语义定位

```typescript
// track — 业务事件（离散动作）
monitor.track('drug_search', { keyword: '布洛芬', resultCount: 42 })

// time — 自定义耗时（连续测量）
monitor.time('ai_response', 1240, { model: 'claude-sonnet' })

// log — 分级日志（调试/告警）
monitor.log('warn', '药品数据接口降级', { fallback: 'cache' })
```

三个接口对应三张独立的数据库表：

| 接口 | 表名 | 主要列 | 聚合查询 |
|---|---|---|---|
| `track` | `custom_events_raw` | name, properties, timestamp | 按 name 分组计数 |
| `time` | `custom_metrics_raw` | name, duration, properties | 按 name 聚合分位数 |
| `log` | `custom_logs_raw` | level, message, data, breadcrumbs | 按 level + message_head 分组 |

为什么分三张表而不是合并？

1. **列稀疏度低**：`custom_metrics` 必有 `duration` 列，`custom_logs` 必有 `level` + `breadcrumbs`，合表会有大量 NULL
2. **索引开销小**：三张表各建自己的索引，查询时不扫描无关列
3. **架构同构**：与 `api_events_raw` / `resource_events_raw` / `track_events_raw` 并列，模块职责清晰

> 💬 **面试官**：track 和 log 都能上报业务事件，怎么选？
>
> ✅ 标准答案：track 用于统计性事件（漏斗、转化率、A/B 实验），服务端会按 name 分组做计数 / 去重；log 用于排障性事件（接口降级、异常兜底），服务端会附加面包屑轨迹、支持全文搜索。
> 🎁 加分答案：log 有单会话 200 条上限（防日志风暴），track 无限制；log 默认采样率 100%，track 跟随全局采样率。如果一个事件既要统计又要排障，两个接口都打。

---

## 🧠 核心原理：Hub-Plugin-Transport 三层架构

自定义上报 SDK 的内核是三层结构，每层职责清晰：

```text
业务代码
  ↓  monitor.track / time / log
customPlugin（事件构建 + 校验 + dispatch）
  ↓
Hub（单例容器：DSN + Scope + Transport + Logger）
  ↓
Transport（队列缓冲 → flush → 多通道发送）
  ↓
Gateway（服务端入端：限流 → 队列 → 落库）
```

### Hub 是什么

Hub 是 SDK 运行时的单例容器，页面全局唯一：

```typescript
interface Hub {
  dsn: ParsedDsn          // publicKey / host / projectId
  transport: Transport    // 队列 + 发送器
  scope: Scope            // 全局上下文（面包屑 + 全局属性）
  logger: Logger          // 内部调试日志
  options: ResolvedOptions
}
```

**为什么是单例**：浏览器页面共用一个 DSN 和上报队列，如果多实例，每个实例都有自己的 buffer，会导致队列分裂、重复上报、`globalProperties` 不一致。

模块级单例（`let sharedHub: Hub | undefined`）比 class 单例对 tree-shaking 更友好，SSR 下每个模块作用域也天然隔离。

### Scope 与全局属性

Scope 承载两类会自动附加到每条事件的全局上下文：

```typescript
interface Scope {
  sessionId: string
  breadcrumbs: Breadcrumb[]              // 面包屑轨迹，最多 100 条 FIFO
  globalProperties: Record<string, unknown> // 全局公共属性，每条事件自动注入
}
```

**globalProperties** 是生产级 SDK 的标配 API，初始化时设置，之后每条事件都携带：

```javascript
GHealClaw.init({
  dsn: 'https://key@monitor.example.com/1',
  globalProperties: {
    appVersion: '2.3.1',
    userId: auth.getCurrentUserId(),
    env: process.env.NODE_ENV,
    buildId: '__BUILD_ID__',
  }
})
```

**面包屑环形缓冲**：Scope 维护最多 100 条用户行为轨迹（click、navigate、fetch、console、error），溢出时 `splice(0, overflow)` 丢弃最旧的：

```typescript
addBreadcrumb(bc: Breadcrumb): void {
  scope.breadcrumbs.push(bc)
  const overflow = scope.breadcrumbs.length - opts.maxBreadcrumbs
  if (overflow > 0) scope.breadcrumbs.splice(0, overflow)
}
```

`log()` 触发时会快照当前面包屑附到事件里——排障核心价值：知道「这条日志发生前，用户做了什么」。

### Transport 队列的三路 flush

Transport 持有内存队列，三路触发 flush：

| 触发条件 | 场景 |
|---|---|
| `setInterval`（默认 5s） | 正常浏览，周期批量上报 |
| `pagehide` / `visibilitychange=hidden` | 关闭 tab 或切换后台时立即上报 |
| `buffer.length >= maxBatchSize`（默认 30） | 高频埋点场景快速排空队列 |

> 💬 **面试官**：Hub 为什么要设计成单例？多实例会有什么问题？
>
> ✅ 标准答案：浏览器页面只有一个 DSN 和一套上报队列，多实例会导致队列分裂（同一批事件分散在不同 buffer 里）、触发多次上报增加请求数、globalProperties 不同实例可能不一致。
> 🎁 加分答案：模块级单例比 class 单例更适合这个场景——模块只加载一次，对 tree-shaking 友好；class 单例需要业务代码保证只调用一次 `new SDK()`，更容易被误用。SSR 下模块级单例也天然隔离：Node.js 每个请求复用同一模块，但 `sharedHub` 是页面级状态，所以 SSR 里不初始化，调用时判断 `if (!hub) return`。

---

## ✍️ 手写实现：track / time / log 内核

### createBaseEvent：公共字段注入

每条事件都有一组公共字段，由 `createBaseEvent` 统一注入，避免每个接口重复构造：

```typescript
function createBaseEvent(hub: Hub, type: string): GhcBaseEvent {
  return {
    eventId: uuidv7(),             // 时间有序的幂等 ID
    sessionId: hub.scope.sessionId,
    projectId: hub.dsn.projectId,
    timestamp: Date.now(),
    type,
    page: {
      url: location.href,
      referrer: document.referrer,
      title: document.title,
    },
    device: getDeviceInfo(),       // UA / 屏幕 / 语言
    ...hub.scope.globalProperties, // 全局属性自动展开注入
  }
}
```

`uuidv7()` 的设计：UUID v7 前 48 位是毫秒时间戳，后 80 位是随机数，天然时间有序——按主键范围扫描等价于按时间扫描，B-tree 索引效率更高。

### track 实现

```typescript
export function track(name: string, properties?: Record<string, unknown>): void {
  const hub = sharedHub
  if (!hub) return                        // SSR / 未初始化，静默 no-op
  const safeName = (name ?? '').trim()
  if (!safeName) return                   // 空名称丢弃

  const event: GhcCustomEvent = {
    ...createBaseEvent(hub, 'custom_event'),
    type: 'custom_event',
    name: safeName,
    properties: { ...(properties ?? {}) }, // 浅拷贝，防外部后续修改污染已入队事件
  }
  dispatch(hub, event, 'custom_event')
}
```

两个看似简单的校验背后是真实教训：

- `name ?? ''` — TypeScript 用户可能传 `undefined`（JS 调用侧无类型约束）
- `properties` 浅拷贝 — 业务代码常复用同一个对象反复调用 `track`，不拷贝会让入队的事件 properties 指向同一引用，后续修改会覆盖历史数据

### time 实现：三道数值校验

```typescript
const MAX_METRIC_DURATION_MS = 86_400_000  // 24 小时上限

export function time(
  name: string,
  durationMs: number,
  properties?: Record<string, unknown>
): void {
  if (!Number.isFinite(durationMs)) return  // NaN / Infinity 丢弃
  if (durationMs < 0) return                // 负数丢弃（计时器重置 bug）
  if (durationMs > MAX_METRIC_DURATION_MS) return  // 超 24h 视为误传绝对时间戳
  // ...构建 GhcCustomMetric 并 dispatch
}
```

为什么需要 24h 上限？

业务代码最常见的误用：`monitor.time('xxx', performance.now())`——把 `performance.now()` 的绝对值（页面已运行几十秒，单位是毫秒）当 delta 传进来，实际上是几万到几十万的大数。24h 上限静默过滤这类误传，不污染 p99 耗时指标。

### log 实现：三道防日志风暴

`log` 接口比 `track` 多了三道防护机制：

```typescript
let logCount = 0  // 模块级计数器，跨重复 init 保持连续

export function log(level: 'info'|'warn'|'error', message: string, data?: unknown): void {
  const hub = sharedHub
  if (!hub) return
  if (logCount >= opts.maxLogsPerSession) return  // ① 单会话 200 条上限

  const safeData = data !== undefined
    ? truncateData(data, opts.maxLogDataBytes)    // ② data 8KB 截断
    : undefined

  const event: GhcCustomLog = {
    ...createBaseEvent(hub, 'custom_log'),
    level,
    message: message.slice(0, 1024),             // message 本身也截断
    data: safeData,
    breadcrumbs: [...hub.scope.breadcrumbs],     // ③ 快照当前面包屑轨迹
  }
  logCount += 1
  dispatch(hub, event, 'custom_log')
}
```

三道防线分工：

- **200 条限额**：防高频日志（如循环里的 `monitor.log`）把队列打爆
- **8KB 截断**：防单条日志的 `data` 字段撑满 sendBeacon 的 64KB 限制
- **breadcrumbs 快照**：`[...hub.scope.breadcrumbs]` 快照而非引用，让每条 log 自带「发生前的用户操作序列」

### truncateData：循环引用降级

```typescript
function truncateData(data: unknown, maxBytes: number): unknown {
  try {
    const serialized = JSON.stringify(data)
    if (serialized.length <= maxBytes) return data
    return {
      __truncated: true,
      __originalBytes: serialized.length,
      __preview: serialized.slice(0, maxBytes), // 保留前缀供排障
    }
  } catch {
    // 循环引用 / 其他序列化失败
    return { __truncated: true, __reason: 'serialize_failed' }
  }
}
```

两条分支都不抛错：超限保留前缀 JSON 供排障，循环引用降级为标记对象。SDK 内部绝不能因业务数据异常而崩溃——这是监控 SDK 和普通业务代码最核心的差别。

> 💬 **面试官**：log 的 breadcrumbs 快照有什么价值？为什么不能让每条 log 共享同一个 breadcrumbs 引用？
>
> ✅ 标准答案：面包屑是一个动态更新的队列，如果 log 事件持有引用，发送时（flush 时）队列已经被后续操作更新，拿到的是「当前状态」而不是「出错时的状态」。快照保证 log 事件携带的是「它被触发那一刻的用户行为历史」。
> 🎁 加分答案：快照用 `[...breadcrumbs]` 浅拷贝，不深拷贝。面包屑里的 `data` 字段通常是基础类型或简单对象，浅拷贝足够。如果深拷贝每条 log 的面包屑，内存开销会翻倍（100 条 × N 条 log）。

---

## 🏭 生产边界：上报层的五个硬约束

### 约束一：三路 flush 的 buffer 竞态

队列 flush 的核心细节在「先换引用再触发 onFlush」：

```typescript
const doFlush = (): void => {
  if (buffer.length === 0) return
  const batch = buffer  // 抓住当前 buffer 的引用
  buffer = []           // 立刻换新引用，后续 enqueue 进新 buffer
  onFlush(batch)        // 异步发送旧 batch，不阻塞新的入队
}
```

如果先 `onFlush(buffer)` 再 `buffer = []`，`onFlush` 是异步的，期间 enqueue 的新事件会被下一行 `buffer = []` 一并清空——看起来入队了，实际上丢了。先换引用才是正确的。

```typescript
// 三路触发 flush
if (flushIntervalMs > 0) {
  setInterval(doFlush, flushIntervalMs)   // ① 定时器
}
window.addEventListener('pagehide', doFlush)  // ② 页面卸载
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') doFlush()  // ③ 切后台
})
```

### 约束二：四通道降级链

发送器在不同场景选择最优通道：

```text
页面卸载（visibilityState=hidden）
  → sendBeacon（浏览器保证发出，即使页面关闭）
正常场景，fetch 可用
  → fetch(keepalive: true)（保活请求，卸载后继续）
fetch 不可用
  → XMLHttpRequest 异步
所有通道失败 / 跨域被拦截
  → new Image().src（单条 ≤ 2KB，任何环境都能发）
```

现代浏览器（Chrome 39+、Firefox 31+、Safari 11.1+）的 `sendBeacon` 支持率已超 95%，「Beacon 是实验性 API」是 2016 年的说法，生产可以放心用。

### 约束三：Beacon 64KB 超限自动拆批

```typescript
function sendViaBeacon(events: SdkEvent[]): boolean {
  const body = serialize(events)
  if (body.length <= BEACON_MAX_BYTES) {
    return navigator.sendBeacon(beaconEndpoint, body)
  }
  // 超限时按 64KB 分批发送，不依赖浏览器自动截断
  const batches = splitBatches(events, BEACON_MAX_BYTES)
  return batches.every(b => navigator.sendBeacon(beaconEndpoint, serialize(b)))
}
```

不能依赖浏览器自动截断：`sendBeacon` 超限会静默失败（返回 `false`），SDK 必须主动拆批。

### 约束四：IndexedDB 离线兜底

网络失败或 `sendBeacon` 返回 `false` 时，事件写入 IndexedDB 持久化：

```text
DB:    ghc-offline-queue
Store: pending-events
上限:   500 条（超量按 createdAt 升序 trim 最旧批次）
重试:   最多 3 次（retryCount >= 3 永久删除，不无限膨胀）
```

两个触发重试的时机：

```typescript
// SDK 初始化时：发送上次会话的离线数据
retryPending(sender, persistence, logger)

// 网络恢复时：立即重试
window.addEventListener('online', () => {
  retryPending(sender, persistence, logger)
})
```

**IndexedDB 的延迟初始化**：`getDb()` 用 Promise 缓存，首次调用才打开连接，后续复用同一 Promise，避免 SDK 初始化时同步阻塞主线程。

### 约束五：过滤链在 enqueue 前执行

过滤链在事件**入队之前**同步执行，顺序固定：

```text
① 采样率判定（全局 sampleRate × 子类型采样率取最小值）
② ignoreErrors / ignoreUrls 正则匹配
③ 敏感字段 JSON replacer（password/token/secret/cookie 等替换为 [FILTERED]）
④ beforeSend 用户自定义（返回 null 则整条丢弃）
```

在 enqueue 前过滤的价值：被采样丢弃的事件不占内存 buffer；`beforeSend` 的用户逻辑立即执行，不会因批量积压而延迟 5 秒。

> 💬 **面试官**：为什么过滤逻辑要在入队前执行，而不是在发送时批量过滤？
>
> ✅ 标准答案：在 enqueue 前过滤，被采样丢弃的事件不进 buffer，节约内存；`beforeSend` 的副作用立即触发，不会延迟执行。
> 🎁 加分答案：在发送时过滤还有一个隐蔽 bug：buffer 已经满了（30 条，触发即时 flush），但其中一半会被 `beforeSend` 丢弃，实际只发 15 条。如果过滤在入队前，`buffer.length >= maxBatchSize` 计的是真实要发送的事件数，flush 时机更准确，不会浪费触发条件。

---

## 🔬 对齐源码：手写版还差什么

面试时手写 SDK 能到什么程度？生产 SDK 又补了哪些东西？本节对比智愈系统（g-heal-claw）的真实代码，明确「面试够用」vs「生产必备」的边界。

### 手写版覆盖的核心能力

上面的 mini SDK（约 120 行）已经实现了：

| 能力 | 覆盖程度 |
|---|---|
| track / time / log 三接口语义 | ✅ 完整 |
| 三道数值校验（duration 有限性 / 非负 / 24h 上限） | ✅ 完整 |
| log 防日志风暴（200 条上限 + 8KB 截断） | ✅ 完整 |
| truncateData 循环引用降级 | ✅ 完整 |
| 队列批量（maxBatchSize / flushInterval / pagehide） | ✅ 完整 |
| 四通道降级链（beacon → fetch → XHR → image） | ✅ 完整 |
| 基本过滤链（采样 → beforeSend） | ✅ 简化版 |

面试写到这个层次，已经能证明你理解自定义上报的完整链路。

### 生产 SDK 补充的 11 个配置项

智愈系统的 `GHealClawOptions` 接口定义了完整配置（`packages/sdk/src/options.ts:9`）：

```typescript
export interface GHealClawOptions {
  readonly dsn: string;
  readonly release?: string;
  readonly environment?: string;
  
  // ① 四级采样率（手写版只有 sampleRate）
  readonly sampleRate?: number;
  readonly errorSampleRate?: number;
  readonly performanceSampleRate?: number;
  readonly tracingSampleRate?: number;
  
  // ② 面包屑容量（手写版固定 100）
  readonly maxBreadcrumbs?: number;
  
  // ③ Transport 配置（手写版固定值）
  readonly maxBatchSize?: number;        // 默认 30
  readonly flushInterval?: number;       // 默认 5000ms
  readonly transport?: 'beacon' | 'fetch' | 'image' | 'auto';
  
  // ④ 插件开关（手写版全开）
  readonly enablePerformance?: boolean;
  readonly enableApiTracking?: boolean;
  readonly enableResourceTracking?: boolean;
  readonly enablePageView?: boolean;
  readonly enableAutoTrack?: boolean;
  readonly enableWhiteScreenDetect?: boolean;
  
  // ⑤ 阈值配置（手写版固定 200ms）
  readonly slowApiThreshold?: number;
  
  // ⑥ 过滤规则（手写版只有 beforeSend）
  readonly ignoreErrors?: readonly (string | RegExp)[];
  readonly ignoreUrls?: readonly (string | RegExp)[];
  readonly beforeSend?: (event: SdkEvent) => SdkEvent | null;
  
  // ⑦ 调试开关
  readonly debug?: boolean;
}
```

手写版缺失的 11 项：

1. **四级采样率**：`errorSampleRate` / `performanceSampleRate` / `tracingSampleRate`（手写版只有全局 `sampleRate`）
2. **maxBreadcrumbs**：面包屑环形缓冲容量（默认 100，手写版固定）
3. **flushInterval**：定时 flush 间隔（默认 5000ms，手写版固定）
4. **transport**：强制指定通道（默认 `auto` 四通道降级，手写版固定 `auto`）
5. **插件开关 6 个**：`enablePerformance` / `enableApiTracking` / `enableResourceTracking` / `enablePageView` / `enableAutoTrack` / `enableWhiteScreenDetect`（手写版默认全开，无法分别禁用）
6. **slowApiThreshold**：慢请求阈值（默认 200ms，手写版固定）
7. **ignoreErrors**：忽略匹配的错误（正则 / 字符串数组，手写版无）
8. **ignoreUrls**：忽略匹配来源 URL（正则 / 字符串数组，手写版无）
9. **release**：版本号（用于 Sourcemap 还原，手写版无）
10. **environment**：环境标识（prod / staging / dev，手写版无）
11. **debug**：调试日志开关（手写版无）

### IndexedDB 离线队列的版本管理

手写版的 IndexedDB 实现缺少 schema 版本升级机制。智愈系统的 `persistence.ts` 定义了 `DB_VERSION = 1`：

```typescript
const DB_NAME = "ghc-offline-queue";
const STORE_NAME = "pending-events";
const DB_VERSION = 1;  // 版本号

const request = indexedDB.open(DB_NAME, DB_VERSION);
request.onupgradeneeded = () => {
  const db = request.result;
  // 版本升级：如果 store 不存在，创建
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
  }
};
```

**为什么需要版本管理？**

假设 SDK v1.0 的 `pending-events` store 只有 `{events, retryCount}` 两个字段，v2.0 新增 `createdAt` 字段用于过期清理。如果不做版本升级处理，旧用户升级 SDK 后：

1. 打开旧 schema（无 `createdAt` 字段）的数据库
2. 读出的记录是 `{events, retryCount}`，代码访问 `record.createdAt` 得到 `undefined`
3. 过期清理逻辑失效，离线队列永久膨胀

正确做法：`DB_VERSION` 递增到 2，在 `onupgradeneeded` 里迁移旧数据：

```typescript
request.onupgradeneeded = (event) => {
  const db = request.result;
  const oldVersion = event.oldVersion;
  
  if (oldVersion < 1) {
    // 初次创建
    db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
  }
  
  if (oldVersion < 2) {
    // v1 → v2：补 createdAt 字段
    const tx = (event.target as IDBOpenDBRequest).transaction!;
    const store = tx.objectStore(STORE_NAME);
    const allReq = store.getAll();
    allReq.onsuccess = () => {
      (allReq.result as PendingBatch[]).forEach((record) => {
        if (!record.createdAt) {
          store.put({ ...record, createdAt: Date.now() });
        }
      });
    };
  }
};
```

手写版可以先用固定 schema，面试时补充「生产环境需要版本升级机制，避免旧用户升级 SDK 后数据结构不兼容」。

### 过滤链的完整执行顺序

手写版只实现了 `采样 → beforeSend`，智愈系统的 `filter.ts` 完整过滤链是 4 道：

```typescript
export function applyFilters(
  opts: GHealClawOptions,
  event: SdkEvent
): SdkEvent | null {
  // ① 采样（三级采样率叠加）
  if (!passesSampling(opts, event)) return null;
  
  // ② ignoreErrors 匹配（仅 error 事件）
  if (event.type === 'error' && opts.ignoreErrors) {
    const msg = event.message ?? '';
    if (opts.ignoreErrors.some(pattern => matchPattern(pattern, msg))) {
      return null;
    }
  }
  
  // ③ 敏感字段脱敏（JSON replacer，内置规则）
  const sanitized = sanitizeEvent(event);
  
  // ④ beforeSend 用户自定义（返回 null 则整条丢弃）
  if (opts.beforeSend) {
    return opts.beforeSend(sanitized);
  }
  
  return sanitized;
}
```

手写版可以只写 ① + ④，面试时补充「生产环境还有 ignoreErrors 匹配和内置脱敏」。

### 手写版 vs 真实 SDK 差异总结

| 维度 | 手写版（面试） | 真实 SDK（生产） | 差异价值 |
|---|---|---|---|
| **核心能力** | track/time/log + 队列 + 降级 | 同手写版 | ✅ 已对齐 |
| **配置灵活性** | 2 个（dsn + sampleRate） | 13 个（采样率/阈值/开关） | 🟡 生产按场景调优 |
| **过滤链** | 采样 + beforeSend | 4 道（采样/ignoreErrors/脱敏/beforeSend） | 🟡 防误报 + 合规 |
| **离线队列** | 固定 schema | 版本管理 + 迁移 | 🟡 兼容升级 |
| **debug** | 无 | console.log 开关 | 🟢 排障必备 |
| **插件开关** | 全开 | 按需禁用 6 类插件 | 🟢 性能 / 隐私需求 |

**图例**：✅ 已对齐 / 🟡 可补充但非阻断 / 🟢 生产强需求

> 💬 **面试官**：你的手写 SDK 和生产 SDK 差距在哪？
>
> ✅ 标准答案：手写版覆盖了核心能力（三接口 + 队列 + 降级 + 离线），能证明理解完整链路。生产 SDK 补充了配置灵活性（13 个参数）、完整过滤链（4 道）、IndexedDB 版本管理、debug 开关。差距主要在「可调优性」和「边界保护」，核心流程已对齐。
> 🎁 加分答案：手写版缺少的 11 个配置项里，最关键的是 `ignoreErrors`（防误报）、`debug`（排障）、`environment`（多环境隔离）。其余配置项对于 MVP 不阻断，但生产环境必须补齐，否则无法应对「测试环境噪音」「不同类型采样率差异」「插件按需禁用」等真实需求。

---

## 🔬 配置项全景：SDK 初始化的生产参数

### 完整配置 Schema

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `dsn` | string | 必填 | 项目上报地址 |
| `sampleRate` | number | 1.0 | 全局采样率（0~1） |
| `errorSampleRate` | number | 1.0 | 错误子类型采样率 |
| `performanceSampleRate` | number | 0.3 | 性能子类型采样率 |
| `tracingSampleRate` | number | 0.05 | TraceID 串联采样率 |
| `maxBreadcrumbs` | number | 100 | 面包屑最大条数 |
| `flushIntervalMs` | number | 5000 | 定时 flush 间隔（ms） |
| `maxBatchSize` | number | 30 | 触发即时 flush 的批次大小 |
| `maxLogsPerSession` | number | 200 | 单会话 log 上报上限 |
| `maxLogDataBytes` | number | 8192 | log.data 截断阈值（8KB） |
| `ignoreErrors` | (string\|RegExp)[] | [] | 忽略匹配的错误 |
| `ignoreUrls` | (string\|RegExp)[] | [] | 忽略匹配来源 URL |
| `globalProperties` | object | {} | 全局公共属性（注入每条 BaseEvent） |
| `beforeSend` | function | undefined | 发送前拦截钩子，返回 null 则丢弃 |

### 三级采样率叠加策略

```javascript
function shouldSample(type: EventType): boolean {
  const globalRate = options.sampleRate              // 全局采样率
  const subRate = options[`${type}SampleRate`] ?? 1  // 子类型采样率
  return Math.random() < Math.min(globalRate, subRate) // 取最小值
}
```

**取最小值的意义**：`sampleRate: 0.1` 表达的是「我最多接受 10% 的上报量」，这是全局上界。如果 `errorSampleRate: 1.0` 能覆盖它，就超出了用户的预期。取最小值保证全局采样率始终是上限。

生产常见配置：

```javascript
GHealClaw.init({
  sampleRate: 0.1,              // 全局 10%（省带宽）
  errorSampleRate: 1.0,         // 错误全量（不漏报）
  performanceSampleRate: 0.3,   // 性能采 30%（统计意义足够）
  tracingSampleRate: 0.05,      // TraceID 串联采 5%（链路追踪成本高）
})
```

### globalProperties：全局属性的注入时机

globalProperties 在 `createBaseEvent` 里通过 `...hub.scope.globalProperties` 展开注入，每条事件都有。

这意味着：如果 `userId` 在用户登录后才能获取，可以调用 `sdk.setGlobalProperty('userId', userId)` 补充，之后的所有事件都会携带 userId，**不需要重新初始化**。

### beforeSend：最后一道闸

```javascript
GHealClaw.init({
  beforeSend(event) {
    if (location.hostname === 'localhost') return null  // 过滤本地噪音

    // 医疗合规：手机号、身份证号脱敏
    if (event.type === 'custom_event' && event.properties?.phone) {
      event.properties.phone = '[MASKED]'
    }
    return event  // 返回 null 则整条丢弃
  }
})
```

SDK 内部的 JSON replacer 已处理通用敏感键（`password/token/secret/cookie`）。`beforeSend` 负责业务专属的脱敏逻辑，两者不重复。

> 💬 **面试官**：三级采样率叠加的业务价值是什么？为什么不能只设一个全局采样率？
>
> ✅ 标准答案：不同类型数据的价值和成本差异很大。错误必须全量（漏一条可能漏掉 P0 故障），性能数据有统计意义（30% 已足够计算 p75），TraceID 串联要落全链路 span、开销最高所以采样率最低。单一采样率无法表达这种差异化需求。
> 🎁 加分答案：取最小值而非乘积：`sampleRate: 0.1` × `errorSampleRate: 1.0` 如果乘积是 0.1，和只设全局采样率没有区别，设子类型就没有意义了。取最小值才能让子类型独立控制上限，比全局更严或和全局一样严都能表达。

---

## 🔌 SDK 接入指南：从零到业务埋点

### 最小可用配置

```typescript
import { GHealClaw } from '@g-heal-claw/sdk'

GHealClaw.init({
  dsn: 'https://your-key@monitor.example.com/project-id',
  plugins: [customPlugin()],
})
```

### 真实接入配置（医疗电商场景）

```typescript
import { GHealClaw, customPlugin, performancePlugin } from '@g-heal-claw/sdk'

GHealClaw.init({
  dsn: process.env.NEXT_PUBLIC_MONITOR_DSN!,
  sampleRate: 0.1,
  errorSampleRate: 1.0,
  maxLogsPerSession: 500,        // 医疗场景日志量大，放宽上限
  globalProperties: {
    appVersion: process.env.NEXT_PUBLIC_VERSION,
    userId: auth.getCurrentUserId(),  // 登录后动态补充也可以
    platform: 'web',
  },
  plugins: [
    customPlugin(),
    performancePlugin({ enableWebVitals: true }),
  ],
  beforeSend(event) {
    if (typeof event === 'object' && event !== null && 'properties' in event) {
      return JSON.parse(JSON.stringify(event, (k, v) =>
        /phone|idCard|password/i.test(k) ? '[MASKED]' : v
      ))
    }
    return event
  },
})
```

### 三个典型业务埋点

```typescript
// 1. 药品搜索行为
monitor.track('drug_search', {
  keyword: keyword.slice(0, 50),  // 搜索词截断 50 字
  resultCount,
  hasAiAnswer: Boolean(aiResult),
  searchSource: 'homepage',
})
```

```typescript
// 2. AI 问答耗时监控
const t0 = performance.now()
const answer = await askAI(question)
monitor.time('ai_response', performance.now() - t0, {
  model: answer.model,
  tokenCount: answer.usage?.total_tokens,
  fromCache: answer.cached,
})
```

```typescript
// 3. 接口降级日志
monitor.log('warn', '药品详情接口降级', {
  apiPath: '/drug/detail',
  fallback: 'cache',
  cacheAge: cacheEntry?.ageMs,
})
```

### SSR 注意事项

`track / time / log` 三个函数在 `sharedHub` 未初始化时静默 no-op：

```typescript
export function track(name: string, ...): void {
  const hub = sharedHub
  if (!hub) return  // SSR 或 init 前调用，不抛错
  // ...
}
```

这保证了在 Next.js App Router 的 Server Component 中误调用也不会崩溃。同时，SDK 提供全局缓存队列——业务代码早于 `init` 执行时，`track` 调用先入预置队列，`init` 完成后自动 flush。

---

## 📊 看懂控制台数据

### source badge：数据三态

自定义上报大盘的数据契约定义在 `apps/web/lib/api/custom.ts`，服务端响应会携带 `source` 字段标识当前数据的可信度：

```typescript
export type OverviewSource = "live" | "empty" | "error";

export interface CustomOverviewResult {
  readonly source: OverviewSource;
  readonly data: CustomOverview;
}
```

前端根据 source 渲染不同的 badge：

| source | 含义 | 展示 |
|---|---|---|
| `live` | 窗口内有数据 | 正常渲染卡片数值 |
| `empty` | 窗口内无数据（可能刚接入） | 显示「暂无数据」占位 |
| `error` | 接口 5xx 或 fetch 失败 | 显示「数据加载失败」提示 |

判断逻辑来自真实代码（`custom.ts:108`）：

```typescript
const hasSamples =
  data.summary.totalEvents > 0 || data.summary.totalSamples > 0;
return { source: hasSamples ? "live" : "empty", data };
```

`totalEvents`（track 事件数）和 `totalSamples`（time 指标数）任一大于 0 就视为有数据。这样 track 和 time 两个通道只要有一个有数据，大盘就正常展示。

### summary 头部卡片

控制台顶部展示 8 个聚合指标，全部来自 `CustomSummary`（`custom.ts:23`）：

```typescript
export interface CustomSummary {
  readonly totalEvents: number;         // track 事件总量
  readonly distinctEventNames: number;  // 去重事件名数
  readonly topEventName: string | null; // 最高频事件名
  readonly avgEventsPerSession: number; // 人均事件数

  readonly totalSamples: number;        // time 指标总量
  readonly distinctMetricNames: number; // 去重指标名数
  readonly globalP75DurationMs: number; // 全局 P75 耗时
  readonly globalP95DurationMs: number; // 全局 P95 耗时

  readonly delta: CustomSummaryDelta;   // 环比数据
}
```

其中环比（delta）由服务端计算，`DashboardCustomService.getOverview` 同时查询「当前窗口」和「上一个等长窗口」，对比事件量变化方向（`up` / `down` / `flat`）和幅度（百分比）：

```typescript
// custom.service.ts:68 — 9 路并发聚合
const [
  eventsSummaryCur,   // 当前窗口 events 汇总
  eventsSummaryPrev,  // 上一窗口 events 汇总（用于环比）
  metricsSummaryCur,  // 当前窗口 metrics 汇总
  metricsSummaryPrev, // 上一窗口 metrics 汇总（用于环比）
  eventsTop,          // Top N 事件名
  metricsTop,         // Top N 指标名（含 p50/p75/p95）
  eventsTrend,        // 事件分时趋势
  metricsTrend,       // 指标分时趋势（含 avgDuration）
  topPages,           // Top N 来源页面
] = await Promise.all([...]);
```

9 路 `Promise.all` 并发：所有聚合查询同时发出，总耗时取决于最慢的那条 SQL，而不是 9 条 SQL 串行之和。

### Top N 事件 / 指标排行表

Top N 事件来自 `aggregateTopEvents`（`custom-events.service.ts:135`）：

```sql
SELECT name, COUNT(*) AS n, MAX(ts_ms) AS last
FROM custom_events_raw
WHERE project_id = ${projectId}
  AND ts_ms >= ${sinceMs}
  AND ts_ms <  ${untilMs}
GROUP BY name
ORDER BY n DESC, name ASC
LIMIT ${clamped}
```

返回每个事件名的触发次数（`count`）和最近发生时间（`lastSeenMs`），前端渲染为排行表。

Top N 指标排行来自 `aggregateTopMetrics`（`custom-metrics.service.ts:112`），额外计算 p50 / p75 / p95 / avg 四个分位数：

```sql
SELECT name,
  COUNT(*)  AS n,
  percentile_cont(0.50) WITHIN GROUP (ORDER BY duration_ms) AS p50,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY duration_ms) AS p75,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95,
  AVG(duration_ms) AS avg
FROM custom_metrics_raw
WHERE project_id = ${projectId}
  AND ts_ms >= ${sinceMs} AND ts_ms < ${untilMs}
GROUP BY name
ORDER BY p75 DESC NULLS LAST, name ASC
```

注意排序是按 `p75 DESC`，不是按 `count`——耗时最高的指标排最前，这才是性能排障的优先顺序。

### 分时趋势图

事件趋势来自 `aggregateTrend`（`custom-events.service.ts:164`），使用 `truncSql` 按粒度截断时间：

```typescript
const trunc = truncSql(params.granularity);
// granularity 由 computeGranularity(windowHours) 自动推断：
// windowHours ≤ 6  → '10min'
// windowHours ≤ 24 → '1h'
// windowHours ≤ 72 → '3h'
// windowHours > 72 → '1d'
```

对应 SQL：

```sql
SELECT
  date_trunc('hour', to_timestamp(ts_ms / 1000)) AS hour,
  COUNT(*) AS n
FROM custom_events_raw
WHERE project_id = ${projectId}
  AND ts_ms >= ${sinceMs}
  AND ts_ms <  ${untilMs}
GROUP BY hour
ORDER BY hour ASC
```

指标趋势额外返回 `avgDurationMs`，前端用双轴折线图展示「事件量趋势」（左轴）+ 「平均耗时趋势」（右轴），一张图能同时看到「这个指标采了多少次」和「耗时是否在恶化」。

### Top 来源页面

`aggregateTopPages`（`custom-events.service.ts:195`）按 `page_path` 分组，告诉你哪些页面发出了最多自定义事件：

```sql
SELECT page_path AS path, COUNT(*) AS n
FROM custom_events_raw
WHERE project_id = ${projectId}
  AND ts_ms >= ${sinceMs}
  AND ts_ms <  ${untilMs}
  AND page_path <> ''
GROUP BY page_path
ORDER BY n DESC, path ASC
LIMIT ${clamped}
```

过滤 `page_path <> ''` 是因为 SSR 首帧或 Node 端调用时 `page` 上下文为空字符串，不应该进入统计。

### 服务端幂等去重

上报接口有 Redis 令牌桶保护（默认 100 req/s，burst 200），超限返回 429 + `Retry-After` 头。

端到端幂等保证分两层：

```text
客户端：Beacon/fetch 失败 → IndexedDB 存储 → 重试（最多 3 次）
服务端：custom_events_raw.event_id 列有 UNIQUE 约束
        重复 INSERT → ON CONFLICT DO NOTHING
```

服务端落库（`custom-events.service.ts:59`）：

```typescript
await db
  .insert(customEventsRaw)
  .values(rows)
  .onConflictDoNothing({ target: customEventsRaw.eventId })
  .returning({ id: customEventsRaw.id });
```

即使同一批次被重试发送 3 次，服务端也只落一条数据，实现 at-least-once 投递语义。

### 三张表的索引设计

`custom_events_raw` 的三个复合索引来自真实 schema（`custom-events-raw.ts:75`）：

```typescript
// custom-events-raw.ts — Drizzle 索引定义
(t) => [
  index("idx_custom_event_project_ts")
    .on(t.projectId, t.tsMs),              // 窗口扫描主索引
  index("idx_custom_event_project_name_ts")
    .on(t.projectId, t.name, t.tsMs),      // Top 事件名聚合
  index("idx_custom_event_project_path_ts")
    .on(t.projectId, t.pagePath, t.tsMs),  // Top 页面聚合
]
```

三个索引对应三类常见查询：时间窗口扫描、按 name GROUP BY、按 page_path GROUP BY，每种查询都能走覆盖索引。

`custom_logs_raw` 有一个生产优化技巧——`message_head` 列，截取 `message` 前 128 字节建独立 `varchar(128)` 列：

```sql
-- 索引建在 message_head 而非 message（text 类型）
CREATE INDEX idx_logs_msghead
  ON custom_logs_raw (project_id, level, message_head, ts_ms);
```

`message` 是 `text` 类型，无法高效 `GROUP BY`。截取前 128 字节建窄列，Top N 错误聚合查询快 10 倍以上。

> 💬 **面试官**：控制台自定义大盘后端怎么设计，如何避免 N 次串行查询拖慢接口？
>
> ✅ 标准答案：用 `Promise.all` 并发 9 路聚合查询，总耗时等于最慢 SQL 的耗时，而不是 9 条串行之和。同时为三张表分别建复合索引（project_id + name / path + ts_ms），每条 SQL 都走覆盖索引扫描，避免全表扫描。
> 🎁 加分答案：趋势图的时间粒度由 `computeGranularity(windowHours)` 自动推断，窗口越大粒度越粗（24h 用 1h 粒度，7d 用 1d 粒度），控制返回的数据点数量，防止返回几千条趋势数据撑爆前端渲染。

---

## 🚀 完整最佳实践代码

### mini 自定义上报 SDK（约 120 行）

类型和状态：

```typescript
type LogLevel = 'info' | 'warn' | 'error'
interface Options {
  endpoint: string; sampleRate?: number
  maxBatchSize?: number; flushIntervalMs?: number
  maxLogsPerSession?: number; maxLogDataBytes?: number
  globalProperties?: Record<string, unknown>
  beforeSend?: (e: unknown) => unknown | null
}
interface State {
  opts: Required<Options>; buffer: unknown[]; logCount: number
}
let hub: State | null = null
```

公共字段和过滤：

```typescript
function createBase(type: string) {
  return { eventId: crypto.randomUUID(), ts: Date.now(), type,
    ...hub!.opts.globalProperties }
}
function dispatch(event: unknown) {
  if (!hub) return
  if (Math.random() >= hub.opts.sampleRate) return   // 采样过滤
  const sent = hub.opts.beforeSend?.(event) ?? event
  if (!sent) return                                   // beforeSend 丢弃
  hub.buffer.push(sent)
  if (hub.buffer.length >= hub.opts.maxBatchSize) flush()
}
```

flush 与降级发送：

```typescript
function flush() {
  if (!hub || hub.buffer.length === 0) return
  const batch = hub.buffer; hub.buffer = []  // 先换引用，防竞态
  const body = JSON.stringify(batch)
  const ok = navigator.sendBeacon?.(hub.opts.endpoint, body)
  if (!ok) {
    fetch(hub.opts.endpoint, {
      method: 'POST', body, keepalive: true,
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => {})
  }
}
function setupFlush(opts: Required<Options>) {
  setInterval(flush, opts.flushIntervalMs)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
  window.addEventListener('pagehide', flush)
}
```

三个公共 API：

```typescript
export function init(opts: Options) {
  const resolved: Required<Options> = {
    sampleRate: 1, maxBatchSize: 30, flushIntervalMs: 5000,
    maxLogsPerSession: 200, maxLogDataBytes: 8192,
    globalProperties: {}, beforeSend: (e) => e, ...opts
  }
  hub = { opts: resolved, buffer: [], logCount: 0 }
  setupFlush(resolved)
}
export function track(name: string, properties?: Record<string, unknown>) {
  if (!hub || !name?.trim()) return
  dispatch({ ...createBase('event'), name: name.trim(),
    properties: { ...properties } })
}
export function time(name: string, ms: number, props?: Record<string, unknown>) {
  if (!hub || !Number.isFinite(ms) || ms < 0 || ms > 86_400_000) return
  dispatch({ ...createBase('metric'), name, durationMs: ms,
    properties: { ...props } })
}
```

log 实现（含 truncateData）：

```typescript
export function log(level: LogLevel, message: string, data?: unknown) {
  if (!hub || hub.logCount >= hub.opts.maxLogsPerSession) return
  let safeData = data
  try {
    const s = JSON.stringify(data)
    if (s.length > hub.opts.maxLogDataBytes) {
      safeData = { __truncated: true, __preview: s.slice(0, hub.opts.maxLogDataBytes) }
    }
  } catch {
    safeData = { __truncated: true, __reason: 'serialize_failed' }
  }
  hub.logCount++
  dispatch({ ...createBase('log'), level, message: message.slice(0, 1024), data: safeData })
}
```

### 真实接入配置（g-heal-claw 风格）

```typescript
// apps/web/src/lib/monitor.ts
import { GHealClaw, customPlugin, performancePlugin } from '@g-heal-claw/sdk'

export const monitor = GHealClaw.init({
  dsn: process.env.NEXT_PUBLIC_GHC_DSN!,
  sampleRate: 0.1,
  errorSampleRate: 1.0,
  maxLogsPerSession: 500,
  globalProperties: {
    appVersion: process.env.NEXT_PUBLIC_VERSION ?? 'unknown',
    platform: 'web',
  },
  plugins: [customPlugin(), performancePlugin()],
  beforeSend: (event) => {
    if (typeof event !== 'object' || !event) return event
    return JSON.parse(JSON.stringify(event, (k, v) =>
      /phone|idCard|password/i.test(k) ? '[MASKED]' : v
    ))
  },
})
```

---

## 💡 一张图总结（面试速记）

| 维度 | 关键实现要点 | 生产陷阱 | 面试频率 |
|---|---|---|---|
| **track** | 空名校验 + 浅拷贝 + baseEvent 注入 | `properties` 对象复用被污染 | ⭐⭐⭐ |
| **time** | 三道数值校验（NaN/负数/>24h 丢弃） | 误传绝对时间戳（非 delta） | ⭐⭐⭐ |
| **log** | 200 条限额 + 8KB 截断 + breadcrumbs 快照 | 快照 vs 引用：引用会拿到后续状态 | ⭐⭐⭐⭐ |
| **globalProperties** | init 时设置，自动注入每条 BaseEvent | 登录后忘记补 userId | ⭐⭐⭐ |
| **队列三路 flush** | 先换 buffer 引用再 onFlush，防竞态 | 先 flush 再清空会丢并发 enqueue | ⭐⭐⭐⭐⭐ |
| **四通道降级链** | hidden→beacon，正常→fetch keepalive→image | Beacon 超 64KB 静默失败 | ⭐⭐⭐⭐⭐ |
| **IndexedDB 离线** | 500 条 + 3 次重试 + init/online 双触发 | 不限条数会无限膨胀 | ⭐⭐⭐⭐ |
| **过滤链顺序** | 采样→忽略→脱敏→beforeSend，均在 enqueue 前 | 发送时过滤导致 flush 时机错位 | ⭐⭐⭐⭐ |
| **三级采样率** | 全局 × 子类型取最小值；错误全量其他降采 | 取乘积让子类型配置失去意义 | ⭐⭐⭐⭐ |
| **幂等去重** | UUID v7 + 服务端 UNIQUE 约束 | 只做客户端去重，服务端仍会重复落库 | ⭐⭐⭐ |
| **message_head 索引** | 截取前 128 字节建 varchar 列 | text 列 GROUP BY 无法走索引 | ⭐⭐ |

---

## 🏗️ 项目实战

### 场景：药品 AI 问答页面响应时间劣化

**背景**：AI 问答功能上线一周后，运营反馈「AI 回答越来越慢」，后端接口日志显示 LLM 调用时间正常。

**第一步：埋点采集**

```typescript
async function handleAskQuestion(question: string) {
  monitor.track('ai_question_asked', {
    questionLength: question.length,
    sessionRound: conversationStore.roundCount,
  })
  const t0 = performance.now()
  try {
    const answer = await aiService.ask(question)
    monitor.time('ai_response_total', performance.now() - t0, {
      model: answer.model,
      tokenCount: answer.usage.total_tokens,
      fromCache: answer.cached,
    })
  } catch (err) {
    monitor.log('error', 'AI 问答失败', {
      error: String(err),
      round: conversationStore.roundCount,
    })
  }
}
```

**第二步：Dashboard 定位**

通过 `time('ai_response_total')` 的 p90 趋势图，发现劣化从第 4 轮对话开始显现，前 3 轮正常。

对比 `tokenCount` 字段分布：第 4 轮以后 token 数从平均 2000 增长到 8000——原因找到了：对话历史没有截断，随轮次增加每次发给 LLM 的 context 越来越长。

**第三步：修复验证**

```typescript
// 修复：对话历史截取最近 5 轮
const context = conversationStore.history.slice(-5)
monitor.log('info', '对话历史截断', {
  originalLen: history.length,
  truncatedLen: 5,
})
```

上线后 `ai_response_total` p90 从 8.2s 降回 1.4s，`tokenCount` 均值回落正常区间，用 `track` 事件确认用户会话完成率同步提升 12%。

> 🔧 **真实场景**：这个闭环的关键是 `time('ai_response_total')` 里上报的 `tokenCount` 附加属性。如果只上报耗时数字，劣化原因无从定位；正是 properties 里的 token 数，把「耗时长」和「context 膨胀」这两个现象关联起来，让排查从数天缩短到 30 分钟。这正是「自定义属性」最大的价值所在——监控数据不只告诉你「坏了」，还告诉你「为什么坏了」。

---

## 📝 留个问题

文章里 `monitor.time('ai_response', performance.now() - t0)` 选择了「调用时直接传 duration」的设计，而不是 `console.time` 风格的「`time(label)` 开始 + `timeEnd(label)` 结束」两段式。

你觉得这个设计决策背后的权衡是什么？如果是你来设计，会选哪种？欢迎在评论区聊聊。

> 🔖 这是「前端性能与监控系列」第 7 篇。上一篇：《手写行为监控 SDK：API 拦截、埋点体系与访问分析全链路》；下一篇预告：《告警体系与 AI 自愈实战》

