# 感知性能优化：让「慢」看起来不慢——骨架屏、乐观更新与页面过渡实战（面试收藏级）

> 面试官说：「你们的 LCP 是 1.8s，符合 Good 标准，但用户反馈说页面很卡，你怎么解释这个矛盾？」
>
> 能答出「客观指标和感知体验不是一回事」的候选人，不超过三成。大多数人要么陷入沉默，要么开始背 Core Web Vitals 指标定义——而这恰恰是面试官想跳过的。

性能优化有两个完全不同的战场：一个是 Lighthouse 能打分的客观指标，另一个是用户脑子里「这个页面快不快」的感受。你可以把 LCP 压到 1.5s，但如果页面一打开全是白屏、点了按钮没反应、页面切换硬闪——用户照样觉得卡。

**这篇文章解决的问题：**
- 客观指标达标，用户仍说「慢」——问题出在哪
- 骨架屏怎么写才不会引发 CLS（布局偏移）
- 乐观更新的正确姿势：失败了怎么回滚
- View Transitions API 的双帧快照原理，以及怎么在 Next.js 里用
- 动画该用 CSS 还是 JS，Compositor 线程是什么
- `prefers-reduced-motion` 为什么是无障碍必做项

---

## 🧠 感知性能 vs 客观性能

### 真实场景：指标绿了，用户还是说卡

某药品详情页，Lighthouse 跑分 92，LCP 1.8s，CLS 0.05——全部 Good。

但用户反馈：「点进去要等好久才能看到东西」「加收藏没反应，以为点没了又点了一次」「页面跳转会闪一下」。

三条反馈，三个不同的感知问题，没有一条在 Lighthouse 里有直接对应。

### Doherty Threshold：400ms 心理学阈值

1982 年，IBM 研究员 Walter Doherty 发表了一项研究：**当系统响应时间低于 400ms，用户的工作效率会出现跃升**——不是线性提升，是跃升。原因是 400ms 以内用户感知「即时」，超过这个阈值大脑开始产生「等待」意识，注意力开始游离。

更关键的是**不确定性放大等待感**。同样是等 2 秒：
- 有进度条或骨架屏：用户感知约 1.5s
- 白屏没有任何反馈：用户感知约 3-4s

这就是为什么「感知性能」和「客观性能」是两回事。

> 💬 **面试官**：LCP 达标但用户说慢，可能是什么原因？
>
> ✅ 标准答案：LCP 只度量最大内容元素的渲染时间，不感知交互反馈、加载过渡和动画流畅度。用户的「慢」感受可能来自白屏时间过长、交互无响应反馈、页面切换硬闪等感知问题。
> 🎁 加分答案：提到 Doherty Threshold（400ms 阈值）和不确定性放大等待感，说明骨架屏、乐观更新、View Transitions 分别针对哪类感知问题。

### 三种典型的「指标好但感知差」场景

| 场景 | 客观指标 | 感知问题 | 解法 |
|------|---------|---------|------|
| 接口慢，白屏等待 | LCP 达标 | 没有内容占位，不确定感 | 骨架屏 |
| 点击按钮等服务端 | TTI 达标 | 交互无即时反馈 | 乐观更新 |
| 路由切换硬刷新 | FCP 达标 | 视觉跳变，上下文丢失 | View Transitions |

---

## 🦴 Loading 状态设计：骨架屏

### 是什么：三种 Loading 的选型矩阵

| 方案 | 适合场景 | 不适合场景 |
|------|---------|-----------|
| Spinner（转圈） | 操作确认（提交/删除）、时间极短 <500ms | 内容加载，用户不知道加多少东西 |
| 进度条 | 可量化进度（上传/下载） | 接口请求（无法量化） |
| 骨架屏 | 内容加载（列表/详情/Feed流） | 操作确认类弹窗 |

骨架屏的核心价值：**提前占位 + shimmer 动画暗示「正在加载」**，让用户在内容出现前就建立了页面结构的心理预期。

### 核心原理：CSS shimmer 动画

shimmer 的原理是用一个渐变光带从左向右扫过灰色占位块。关键技术点：

```css
/* shimmer 核心：超宽渐变 + 位移动画 */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
```

`.skeleton` 类使用超宽渐变配合动画：

```css
.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%
  );
  background-size: 200% 100%; /* 👈 宽度是容器2倍，光带才能扫过 */
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}
```

`background-size: 200% 100%` 是关键——渐变宽度是容器的 2 倍，配合 `background-position` 从 `-200%` 到 `200%` 位移，产生光带扫过效果。

占位块的尺寸写法：

```css
.skeleton-title  { width: 60%; height: 20px; margin-bottom: 8px; }
.skeleton-line   { width: 100%; height: 14px; margin-bottom: 6px; }
.skeleton-avatar { width: 40px; height: 40px; border-radius: 50%; }
```

### 与 React Suspense 结合

React 18 的 `Suspense` 可以直接把骨架屏作为 `fallback`：

```jsx
// 药品详情页：数据加载期间展示骨架屏
import { Suspense } from 'react';

export default function DrugDetailPage() {
  return (
    <Suspense fallback={<DrugDetailSkeleton />}>
      <DrugDetail />  {/* 内部用 use(promise) 或 useSuspenseQuery */}
    </Suspense>
  );
}
```

**fallback 触发时机**：当 `Suspense` 边界内的组件 `throw` 一个 Promise（数据还没准备好），React 会渲染 `fallback`，Promise resolve 后切换回真实内容。

用 `startTransition` 包裹路由切换可以避免骨架屏闪烁——React 会保留旧 UI 直到新内容准备好：

```jsx
import { startTransition } from 'react';

function navigateToDrug(id) {
  startTransition(() => {
    setCurrentDrugId(id); // 👈 不立即触发 Suspense fallback
  });
}
```

### 骨架屏的 CLS 风险

**最常见的骨架屏 bug**：占位尺寸和真实内容尺寸不一致，内容加载后发生布局偏移，触发 CLS。

解决方案：用 `contain: layout style paint` 告诉浏览器骨架屏容器是独立的布局上下文，内部尺寸变化不影响外部：

```css
.skeleton-container {
  contain: layout style paint; /* 👈 隔离布局影响 */
  min-height: 200px; /* 与真实内容高度一致 */
}
```

另一个方案：骨架屏和真实内容用同一套 CSS 布局，只替换内容节点，容器尺寸不变。

> 💬 **面试官**：骨架屏加了反而 CLS 变高，什么原因？
>
> ✅ 标准答案：骨架屏占位尺寸和真实内容不一致，内容加载后布局重排触发 CLS。用 `contain: layout` 或让骨架屏与真实内容共用容器尺寸可以规避。
> 🎁 加分答案：提到 `aspect-ratio` 用于图片占位（避免图片加载后高度突变），以及 `min-height` 比 `height` 更保险（内容超出不裁切）。

---

## 🛡️ 白屏兜底策略

### 白屏检测：requestIdleCallback 采样

白屏检测的思路：在页面加载完成后的空闲时间，采样关键 DOM 节点是否可见。如果核心内容节点不可见（尺寸为 0 或不在视口），判定白屏。

```javascript
// 白屏检测：空闲时采样关键节点可见性
function detectWhiteScreen(selectors = ['#app', '.main-content']) {
  requestIdleCallback(() => {
    const isWhiteScreen = selectors.every(sel => {
      const el = document.querySelector(sel);
      if (!el) return true;
      const { width, height } = el.getBoundingClientRect();
      return width === 0 || height === 0;
    });
    if (isWhiteScreen) reportAndFallback();
  }, { timeout: 3000 }); // 👈 3s 超时强制执行
}
```

`{ timeout: 3000 }` 确保即使主线程繁忙，3 秒后也会强制执行检测，不会因为等不到空闲而漏报。

### 兜底 UI：最小化静态 HTML

白屏兜底 UI 应该是**静态的、不依赖 JS 的最小化页面框架**。哪怕 React 整体崩了，用户至少看到导航和错误提示：

```html
<!-- public/fallback.html：纯静态兜底，不依赖任何 JS -->
<div id="fallback" style="display:none; padding:40px; text-align:center;">
  <h2>页面加载出现问题</h2>
  <p>请刷新重试，或返回首页</p>
  <button onclick="location.reload()">刷新页面</button>
</div>
```

### Error Boundary + 降级渲染

React Error Boundary 是组件级兜底的标准方案：

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    reportError(error, info.componentStack);
  }
```

```jsx
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <DefaultErrorUI />;
    }
    return this.props.children;
  }
}
```

使用时按粒度嵌套——页面级兜底 + 模块级兜底：

```jsx
<ErrorBoundary fallback={<PageErrorUI />}>
  <ErrorBoundary fallback={<ModuleErrorUI name="推荐药品" />}>
    <DrugRecommendations />
  </ErrorBoundary>
  <DrugDetail />
</ErrorBoundary>
```

> 💬 **面试官**：用户反馈页面偶尔全白，你怎么排查和兜底？
>
> ✅ 标准答案：用 `requestIdleCallback` 在空闲时采样关键节点可见性，检测到白屏后上报监控并展示静态兜底 UI。React 层用 Error Boundary 捕获组件级报错做降级渲染。
> 🎁 加分答案：结合第 5 篇的白屏监控方案，说明白屏 = 页面白屏（JS 未执行）vs 逻辑白屏（JS 执行但渲染结果为空）两种类型的不同处理。

---

## ⚡ Optimistic UI（乐观更新）

### 是什么：先更新 UI，后等待服务端

乐观更新的核心假设：**大多数操作会成功**，所以先在本地立即更新 UI，再异步等服务端确认；如果服务端失败，再回滚。

🔧 **真实场景**：用户点击药品收藏按钮。传统做法：点击→等待接口→接口成功→UI 更新，用户感知 200-500ms 延迟，还可能重复点击。乐观更新：点击→UI 立即变「已收藏」→后台静默请求→失败时恢复并提示。

### 核心原理：React Query useMutation 三阶段

React Query 的 `useMutation` 提供了完整的乐观更新生命周期：

```
onMutate  → 执行乐观更新（本地修改缓存）
    ↓
mutationFn → 发送真实请求
    ↓
onSuccess / onError / onSettled → 确认或回滚
```

**onMutate**：在请求发出前执行，负责保存快照、更新本地缓存：

```javascript
async onMutate(variables) {
  const key = ['drug', variables.drugId];
  await queryClient.cancelQueries({ queryKey: key });
  const snapshot = queryClient.getQueryData(key);
  queryClient.setQueryData(key, old => ({
    ...old,
    isFavorited: !old.isFavorited,
    favoriteCount: old.isFavorited
      ? old.favoriteCount - 1
      : old.favoriteCount + 1,
  }));
  return { snapshot }; // 👈 供 onError 回滚用
},
```

**onError**：请求失败时用快照回滚：

```javascript
onError(error, variables, context) {
  // 恢复到操作前的状态
  queryClient.setQueryData(['drug', variables.drugId], context.snapshot);
  toast.error('收藏失败，请重试');
},
```

**onSettled**：无论成功失败，最终都重新同步服务端数据：

```javascript
onSettled(data, error, variables) {
  // 重新获取最新数据，确保本地与服务端一致
  queryClient.invalidateQueries({ queryKey: ['drug', variables.drugId] });
},
```

### 适合与不适合的场景

| 适合乐观更新 | 不适合乐观更新 |
|------------|--------------|
| 点赞 / 收藏 / 关注 | 支付 / 下单 |
| 评论发布 | 权限变更 / 角色切换 |
| 已读标记 / 消息删除 | 库存扣减 |
| 表单实时保存（草稿） | 涉及金额的所有操作 |

判断标准：**失败回滚的成本低、用户可感知回滚、操作本身不具有不可逆性**。

> 💬 **面试官**：乐观更新失败回滚时，用户已经看到了更新后的 UI，怎么处理用户体验？
>
> ✅ 标准答案：回滚 UI 的同时用 toast 明确告知用户操作失败，让用户知道看到的变化已撤销。回滚动画要平滑（用 CSS transition），避免状态跳变引起困惑。
> 🎁 加分答案：提到 `cancelQueries` 的重要性——如果不取消进行中的查询，后台的旧数据返回会覆盖乐观更新结果，导致 UI 先更新再还原的闪烁。

---

## 🎬 View Transitions API

### 是什么：浏览器原生页面过渡动画

View Transitions API 是 Chrome 111 正式推出的原生页面过渡方案，让 SPA 路由切换和 MPA 跨文档导航都能实现丝滑的动画过渡，不需要任何动画库。

传统路由切换：旧页面瞬间消失 → 新页面立即出现（硬闪）。View Transitions：旧页面淡出截图 → 新页面淡入截图 → 真实 DOM 替换完成。

### 核心原理：双帧快照机制

```
调用 startViewTransition(callback)
    ↓
浏览器截取当前页面快照（old frame）
    ↓
执行 callback（更新 DOM）
    ↓
浏览器截取新页面快照（new frame）
    ↓
用 CSS 动画在两帧之间过渡
    ↓
动画完成，移除快照图层
```

浏览器把两帧快照放在独立的图层上（`::view-transition-old` 和 `::view-transition-new`），用默认的淡入淡出动画过渡，整个过程在 Compositor 线程执行，不阻塞主线程。

### 基础用法

```javascript
// SPA：用 startViewTransition 包裹 DOM 更新
async function navigateTo(url) {
  if (!document.startViewTransition) {
    // 兼容降级：直接更新，无动画
    await updatePageContent(url);
    return;
  }

  const transition = document.startViewTransition(async () => {
    await updatePageContent(url); // 👈 在这里更新 DOM
  });

  await transition.finished; // 等待动画完成（可选）
}
```

### 自定义过渡动画

默认动画是全页面淡入淡出。通过 `::view-transition-old` 和 `::view-transition-new` 可以完全自定义：

```css
/* 覆盖默认淡入淡出，改为滑入效果 */
::view-transition-old(root) {
  animation: slide-out 300ms ease-in forwards;
}
::view-transition-new(root) {
  animation: slide-in 300ms ease-out forwards;
}
```

定义滑入滑出关键帧：

```css
@keyframes slide-out {
  to { transform: translateX(-100%); }
}
@keyframes slide-in {
  from { transform: translateX(100%); }
}
```

给特定元素加 `view-transition-name`，可以让该元素单独做动画（FLIP 效果）：

```css
/* 药品卡片：列表→详情时单独动画 */
.drug-card {
  view-transition-name: drug-card; /* 👈 唯一名称 */
}
```

```css
/* 针对这个元素单独设置过渡 */
::view-transition-old(drug-card) {
  animation: scale-out 250ms ease-in;
}
::view-transition-new(drug-card) {
  animation: scale-in 250ms ease-out;
}
```

### MPA 跨文档过渡

无需 JavaScript，纯 CSS 声明即可启用 MPA（多页面应用）跨文档过渡：

```css
/* 在每个页面的 CSS 里加这一行 */
@view-transition {
  navigation: auto; /* 👈 自动为同源导航启用过渡 */
}
```

浏览器会在同源页面之间的导航（点击链接、前进/后退）时自动应用默认淡入淡出动画。

### 在 Next.js App Router 中集成

Next.js 15 还没有内置 View Transitions，但可以通过路由事件手动接入：

```typescript
// hooks/useViewTransition.ts
'use client';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function useViewTransition() {
  const router = useRouter();
  const navigate = useCallback((href: string) => {
    if (!document.startViewTransition) { router.push(href); return; }
    document.startViewTransition(() => { router.push(href); });
  }, [router]);
  return { navigate };
}
```

> 💬 **面试官**：View Transitions 的双帧快照是怎么实现的？和 FLIP 动画有什么关系？
>
> ✅ 标准答案：浏览器在 `startViewTransition` 调用时截取旧页面快照，执行 DOM 更新后截取新页面快照，然后用 CSS 动画在两张快照之间过渡。整个过程在 Compositor 线程执行，不阻塞主线程。
> 🎁 加分答案：`view-transition-name` 给特定元素启用 FLIP——浏览器记录元素在旧位置和新位置的坐标，自动生成从旧位置移动到新位置的动画，开发者只需声明名称，不需要手动计算坐标差。

---

## 🎨 动画性能

### 60fps 预算：16.6ms 时间窗

屏幕刷新率 60fps 意味着每 16.6ms 渲染一帧。浏览器要在这 16.6ms 内完成：JS 执行 → 样式计算 → 布局 → 绘制 → 合成。

实际上浏览器自身要留约 6ms 的开销，留给开发者的有效预算是 **~10ms**。超出就会掉帧，用户看到卡顿。

笔记44 中的渲染五阶段图：

![渲染五阶段](https://cdn.nlark.com/yuque/0/2023/png/738210/1672917214710-8a074c75-ec34-4af5-8d68-7fcbee7bd36b.png)

每个阶段都可能超时，常见瓶颈：JS 执行时间过长（Long Task）、强制同步布局（在 JS 里读了会触发 layout 的属性后又写 DOM）。

### CSS vs rAF vs Web Animations API

| 方案 | 执行线程 | 适合场景 | 主要限制 |
|------|---------|---------|---------|
| CSS Transition/Animation | Compositor（纯 transform/opacity） | 简单过渡、hover 效果 | 无法精确控制时间轴 |
| `requestAnimationFrame` (rAF) | 主线程 | JS 驱动的复杂动画 | 占用主线程 |
| Web Animations API (WAAPI) | Compositor（纯 transform/opacity） | 程序化控制 + 高性能 | 兼容性略差 |

```javascript
// Web Animations API：兼具程序化控制和 Compositor 性能
const el = document.querySelector('.drug-card');

const animation = el.animate(
  [
    { transform: 'translateY(0)', opacity: 1 },
    { transform: 'translateY(-8px)', opacity: 0.8 },
    { transform: 'translateY(0)', opacity: 1 },
  ],
  { duration: 300, easing: 'ease-out', fill: 'none' }
);

animation.onfinish = () => console.log('动画完成');
animation.cancel(); // 随时可取消
```

### Compositor 线程：只用 transform + opacity 的原因

浏览器渲染有两条路径：

**触发 Layout（回流）**：修改 `width`、`height`、`top`、`left`、`margin` 等几何属性 → 重新计算所有受影响元素的尺寸位置 → 重新绘制 → 合成。代价极高，每次都占主线程。

**只触发 Composite（合成）**：只修改 `transform` 和 `opacity` → 直接在 Compositor 线程合成图层，完全不占主线程。代价极低，天然 60fps。

结论：**所有动画优先用 `transform` 替代 `top/left`，用 `opacity` 替代 `display/visibility`**。

```css
/* ❌ 会触发 Layout，动画卡顿 */
.bad-animation { transition: left 300ms; }

/* ✅ 只触发 Composite，丝滑 */
.good-animation { transition: transform 300ms; }
```

### prefers-reduced-motion：无障碍必做项

部分用户（前庭障碍、癫痫、晕动症）会在系统里开启「减少动画」，`prefers-reduced-motion` 媒体查询可以检测到这个设置：

```css
/* 默认动画 */
.card { transition: transform 300ms ease; }

/* 用户开启「减少动画」时，关闭或简化动画 */
@media (prefers-reduced-motion: reduce) {
  .card { transition: none; }

  /* View Transitions 也要处理 */
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none;
  }
}
```

JavaScript 中检测：

```javascript
const prefersReduced = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (!prefersReduced) {
  // 只在用户没有开启减少动画时播放动画
  playEntranceAnimation();
}
```

**WCAG 2.1 AA 要求**（2.3.3 Animation from Interactions）：所有超过 3 次闪烁的动画，或持续运动的动画（如 shimmer、轮播），都必须提供关闭或减弱的方式。`prefers-reduced-motion` 是最直接的合规方案。

> 💬 **面试官**：为什么 CSS 动画比 JS 动画性能好？什么情况下 JS 动画反而更好？
>
> ✅ 标准答案：CSS `transform` 和 `opacity` 动画可以在 Compositor 线程独立执行，不占用主线程，所以即使主线程有 JS 在运行，动画依然流畅。JS 动画（rAF）跑在主线程，主线程繁忙时会掉帧。
> 🎁 加分答案：当需要程序化控制（暂停/恢复/动态修改参数）时，Web Animations API 是更好的选择——它既能在 Compositor 线程执行 `transform/opacity`，又能像 JS 一样控制时间轴。

---

## 🔧 完整代码实战

### Skeleton Screen 组件（可复用，支持多种布局）

先定义 shimmer 基础样式：

```css
/* skeleton.css */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}
```

无障碍适配：

```css
@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; background: #f0f0f0; }
}
```

React 基础骨架块组件：

```tsx
// Skeleton.tsx
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}
export function Skeleton({ width = '100%', height = 16, circle }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: circle ? '50%' : undefined }}
    />
  );
}
```

药品详情骨架屏（contain 隔离布局）：

```tsx
// DrugDetailSkeleton.tsx
export function DrugDetailSkeleton() {
  return (
    <div style={{ contain: 'layout style paint', padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Skeleton width={80} height={80} />
        <div style={{ flex: 1 }}>
          <Skeleton height={20} width="60%" />
          <Skeleton height={14} width="40%" />
        </div>
      </div>
      <Skeleton height={14} />
    </div>
  );
}
```

列表骨架屏（count 条可配置）：

```tsx
// DrugListSkeleton.tsx
export function DrugListSkeleton({ count = 5 }: { count?: number }) {
  const items = Array.from({ length: count });
  return <div>{items.map((_, i) => <DrugListSkeletonRow key={i} />)}</div>;
}
```

单行骨架行组件：

```tsx
function DrugListSkeletonRow() {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 16px' }}>
      <Skeleton width={56} height={56} />
      <div style={{ flex: 1 }}>
        <Skeleton height={16} width="50%" />
        <Skeleton height={12} width="80%" />
      </div>
    </div>
  );
}
``````

### View Transitions 列表→详情过渡（Next.js App Router）

给列表卡片和详情页的主图加上配对的 `view-transition-name`：

```tsx
// DrugCard.tsx（列表页）
export function DrugCard({ drug }: { drug: Drug }) {
  const { navigate } = useViewTransition();

  return (
    <div onClick={() => navigate(`/drug/${drug.id}`)}>
      <img
        src={drug.image}
        alt={drug.name}
        style={{ viewTransitionName: `drug-image-${drug.id}` }} // 👈 唯一名称
      />
      <h3>{drug.name}</h3>
    </div>
  );
}
```

```tsx
// DrugDetail.tsx（详情页）
export function DrugDetailHero({ drug }: { drug: Drug }) {
  return (
    <img
      src={drug.image}
      alt={drug.name}
      style={{ viewTransitionName: `drug-image-${drug.id}` }} // 👈 名称配对
    />
  );
}
```

配对的 `view-transition-name` 让浏览器自动为这个图片生成 FLIP 动画——从卡片里的小图飞到详情页的大图位置。

### Optimistic 点赞按钮（React Query）

完整的乐观更新点赞按钮实现：

```tsx
// FavoriteButton.tsx — 导入依赖
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleFavorite } from '@/api/drug';
import toast from 'react-hot-toast';
```

定义乐观更新逻辑：

```tsx
export function FavoriteButton({ drugId, isFavorited, count }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ['drug', drugId];

  const mutation = useMutation({
    mutationFn: () => toggleFavorite(drugId),
    async onMutate() {
      await queryClient.cancelQueries({ queryKey });
      const snapshot = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: Drug) => ({
        ...old,
        isFavorited: !old.isFavorited,
        favoriteCount: old.isFavorited ? old.favoriteCount - 1 : old.favoriteCount + 1,
      }));
      return { snapshot };
    },
```

失败回滚和最终同步：

```tsx
    onError(_err, _vars, context) {
      queryClient.setQueryData(queryKey, context?.snapshot); // 回滚
      toast.error('操作失败，请重试');
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey }); // 重新同步服务端
    },
  });
```

渲染按钮（按下时缩放反馈）：

```tsx
  return (
    <button
      onClick={() => mutation.mutate()}
      style={{
        transition: 'transform 150ms',
        transform: mutation.isPending ? 'scale(0.95)' : 'scale(1)',
      }}
    >
      {isFavorited ? '❤️' : '🤍'} {count}
    </button>
  );
}
```

---

## 💡 一张图总结（面试速记）

| 感知问题 | 解法 | 核心原理 | 面试关键词 |
|---------|------|---------|-----------|
| 内容加载白屏 | 骨架屏 | CSS shimmer + Suspense fallback | CLS、contain、Doherty Threshold |
| 页面崩溃白屏 | Error Boundary + 白屏检测 | requestIdleCallback 采样 + 静态兜底 | componentDidCatch、降级渲染 |
| 交互无响应感 | 乐观更新 | onMutate 快照 + onError 回滚 | cancelQueries、context 传递 |
| 路由切换硬闪 | View Transitions | 双帧快照 + Compositor 动画 | startViewTransition、伪元素 |
| 动画卡顿 | transform + opacity | Compositor 线程 | 回流 vs 合成、rAF vs WAAPI |
| 动画无障碍 | prefers-reduced-motion | 系统级减弱设置检测 | WCAG 2.1 AA、2.3.3 条款 |

---

## 📝 留个问题

你们项目里现在用的是哪种 Loading 方案？有没有遇到过骨架屏加了之后 CLS 反而变高的情况？

欢迎在评论区分享，我来帮你分析原因。

---

## 参考

- https://web.dev/articles/vitals?hl=zh-cn
- https://web.dev/articles/rail?hl=zh-cn
- https://web.dev/articles/rendering-performance?hl=zh-cn
- https://web.dev/learn/performance/welcome?hl=zh-cn
- https://developer.mozilla.org/zh-CN/docs/Web/Performance
- https://github.com/berwin/Blog/issues/23
- https://github.com/GoogleChromeLabs/quicklink

---

> 🔖 这是「前端性能与监控系列」第 13 篇。上一篇：《运行时优化：手写防抖节流 + 重排重绘 + React 性能排查》；下一篇预告：系列完结，敬请期待
