# 运行时优化：手写防抖节流 + 重排重绘 + React 性能排查（面试收藏级）

> 面试官微笑着说：「手写一个防抖，要支持 leading 和 trailing 两种触发，再说说 React 里怎么正确使用它。」
>
> 能完整答出来的候选人，不超过两成。大多数人写出来的版本，要么 immediate 模式有 bug，要么在 React 函数组件里每次渲染都重新创建——恰好是最常见的两个坑。

防抖节流只是这篇文章的入口。运行时性能是前端体验的最后一道防线：页面加载再快，交互卡顿一样让用户流失。这篇文章系统梳理运行时优化的完整路径——从 Performance 面板定位问题，到防抖节流手写原理，到重排重绘底层机制，再到 React 性能排查、长列表虚拟化、Web Worker、内存泄漏，每一个都给出可以直接用在面试里的标准答案。

**这篇文章解决的问题：**

- 页面卡顿，不知道从哪里下手排查
- 防抖节流会用但说不清原理，手写版本有隐藏 bug
- React 组件渲染慢，memo 加了也没用
- 长列表 10 万条数据不知道怎么优化
- 内存泄漏只知道「可能是闭包」，但不会用工具定位

---

## 🔍 问题定位：Performance 面板使用入门

### 真实场景：一次卡顿排查

药品搜索页的用户反馈「输入关键词时页面明显卡顿」。打开 Chrome DevTools，切换到 Performance 面板——从这里开始。

**录制步骤：**

1. 打开 DevTools → Performance 面板
2. 勾选 `Screenshots`，点击 `●` 开始录制
3. 在页面上复现卡顿行为（输入、滚动等）
4. 点击 `■` 停止，等待分析完成

录制完成后，你会看到四个区域：控制栏、概览（Overview）、线程面板、统计面板。

### Long Task 与 Layout Shift

**概览面板**是最先要看的地方：

- **红色竖条**：Long Task，主线程单次任务超过 50ms，直接导致帧丢失
- **紫色区域**：Layout，重排发生的位置
- **绿色区域**：Paint，重绘区域

找到红色竖条后，点击它，下方线程面板会定位到对应的 JavaScript 调用栈。

**Layout Shift 定位**：在概览的 `Experience` 行，橙色标记就是布局偏移。点击后可以看到触发偏移的 DOM 元素和触发时间。

<!-- 这是一张图片，ocr 内容为：PERFORMANCE INSIGHTS PERFORMANCE MEMORY 面板信息 LOCALHOST #1 SCREENSHOTS WEB VITALS -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672731879274-788e4a9f-8eb7-432d-9afa-b8a70b69d5c0.png)

### 火焰图判读：宽 = 耗时，深 = 调用栈

火焰图（Flame Chart）是 Performance 面板的核心视图，读法很简单：

- **水平宽度 = 耗时**：越宽的色块执行时间越长，是优化的首要目标
- **垂直深度 = 调用栈**：从上往下是调用链，最底层是实际执行的函数
- **颜色含义**：黄色 = JS 执行，紫色 = Layout/Paint，绿色 = 合成

<!-- 这是一张图片，ocr 内容为：PERFORMANCE MAIN-HTTP://LOCALHOST:3000/ TASK 火焰图 CALL TREE BOTTOM-UP SUMMARY -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672732504852-09181a5d-59d4-452f-b15f-8d1bb566022b.png)

实战技巧：按住 `Shift` + 鼠标滚轮可以水平缩放，找到宽而深的色块就是性能热点。

> 💬 **面试官**：线上页面卡顿，你的排查思路是什么？
>
> ✅ **标准答案**：先用 Performance 面板录制问题现场，在概览找 Long Task（红色竖条）定位卡顿帧，再看火焰图确认是哪个函数耗时，最后看是 JS 执行、强制重排还是大量 Paint 导致的。
>
> 🎁 **加分答案**：区分「加载性能」和「运行时性能」——加载卡顿看 Network + Lighthouse，交互卡顿看 Performance + Memory；同时结合 PerformanceObserver 在线上持续监控 Long Task（`PerformanceLongTaskTiming`），而不只靠本地复现。

### PerformanceObserver：从本地调试到线上监控

Performance 面板适合开发阶段复现问题，但线上用户的真实体验需要靠 `PerformanceObserver` 持续采集。它是浏览器提供的性能监控 API，可以在性能条目生成时**异步回调**，不阻塞主线程：

```javascript
// 监控 Long Task（主线程阻塞 > 50ms 的任务）
const longTaskObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    // entry.duration: 阻塞时长；entry.attribution:  culprit frame
    reportToAnalytics({ type: 'long-task', duration: entry.duration })
  })
})
longTaskObserver.observe({ type: 'longtask', buffered: true })

// 监控 Layout Shift（累积布局偏移）
const clsObserver = new PerformanceObserver((list) => {
  let clsScore = 0
  list.getEntries().forEach(entry => {
    if (!entry.hadRecentInput) clsScore += entry.value // 只统计非用户输入触发的偏移
  })
})
clsObserver.observe({ type: 'layout-shift', buffered: true })

// 监控首次输入延迟（FID，已逐步被 INP 替代）
new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    const delay = entry.processingStart - entry.startTime
    reportToAnalytics({ type: 'fid', delay })
  })
}).observe({ type: 'first-input', buffered: true })
```

**`buffered: true`** 是关键——它让 Observer 注册时能拿到注册前已产生的性能条目，避免漏报。

### INP：运行时性能的新核心指标

Google 已于 2024 年 3 月正式用 **INP（Interaction to Next Paint）** 替代 FID 作为 Core Web Vitals 之一。INP 衡量的是**用户交互到下一帧绘制的延迟**，取整个页面生命周期中最慢的那次交互（通常取 p98）：

```javascript
// INP 线上监控（简化版）
let maxInteractionDelay = 0
const inpObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    // INP = 所有交互延迟的最大值（实际应取 p98）
    const delay = entry.processingStart - entry.startTime
    if (delay > maxInteractionDelay) maxInteractionDelay = delay
  })
})
inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 })
// durationThreshold: 16ms —— 只关注超过一帧预算的慢交互
```

**INP 差的常见根源**：同步长任务阻塞主线程、大组件重渲染、强制同步布局。这也正是本文后续各章节要解决的问题。

> 💬 **面试官**：PerformanceObserver 和 Performance 面板是什么关系？
>
> ✅ **标准答案**：Performance 面板是开发阶段手动录制分析的本地工具；PerformanceObserver 是线上持续自动采集的 API，结合 `buffered: true` 可以拿到注册前的条目，是 RUM（Real User Monitoring）的底层基础。
>
> 🎁 **加分答案**：Google 在 2024 年用 INP 替代 FID 作为 Core Web Vitals 的交互衡量指标——INP 衡量整个页面生命周期中最慢的用户交互延迟（p98），比 FID 单纯看首次交互延迟更能反映真实体验。

---

## ⏱️ 防抖（debounce）与节流（throttle）

高频事件（`input`、`scroll`、`resize`、`mousemove`）不加控制，每次触发都执行回调，轻则浪费计算，重则卡死页面。

<!-- 这是一张图片，ocr 内容为：throttle(节流) 记录函数执行时的时间戳 TAP TAP TAP TAP TAP TAP TAP 点击 函数执行 -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607235538317-e132088f-f98d-462f-9473-a2cfc7137c98.png)

<!-- 这是一张图片，ocr 内容为：debounce(防抖) 记录每次点击的时间戳 TAP TAP TAP TAP TAP TAP 点击 函数执行 -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607235638311-4a0db10b-8b52-4d13-b71c-353ee5aa8310.png)

### 使用场景对比

| 场景 | 策略 | 原因 |
|------|------|------|
| 搜索框输入联想 | 防抖（debounce） | 只关心用户「停下来」后的最终输入 |
| 滚动加载更多 | 节流（throttle） | 需要周期性检查位置，不能完全静止才触发 |
| 窗口 resize 重算布局 | 防抖 | 只需要最终尺寸 |
| 鼠标移动绘制轨迹 | 节流 | 需要连续采样，完全防抖会丢失中间点 |
| 按钮防重复点击 | 防抖（leading） | 立即响应第一次，忽略后续连击 |
| 游戏键盘输入 | 节流 | 固定帧率处理输入 |

**核心区别**：节流是「固定频率执行」，防抖是「停止触发后才执行」。

> 💡 **小技巧**：对于 `resize` 事件的响应式布局计算，更好的选择是 `ResizeObserver`——它只在目标元素**实际尺寸变化**时触发，天然避免了「resize 回调过于频繁需要 debounce」的问题。而且 `ResizeObserver` 可以观察任意元素，不限于 `window`。

### 手写 throttle

**时间戳版**（立即执行，停止后最后一次可能不触发）：

```typescript
function throttle<T extends unknown[]>(
  fn: (...args: T) => void,
  wait: number
) {
  let previous = 0
  return function (this: unknown, ...args: T) {
    const now = Date.now()
    if (now - previous > wait) {
      fn.apply(this, args)
      previous = now
    }
  }
}
```

**定时器版**（延迟执行，停止后最后一次一定触发）：

```typescript
function throttle<T extends unknown[]>(
  fn: (...args: T) => void,
  wait: number
) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return function (this: unknown, ...args: T) {
    if (!timer) {
      timer = setTimeout(() => {
        fn.apply(this, args)
        timer = null
      }, wait)
    }
  }
}
```

两者核心差异：时间戳版第一次立即触发，停止后不再触发；定时器版第一次延迟触发，停止后还会触发一次。生产环境通常合并两者——第一次立即触发，停止后也触发最后一次。

还有一个升级版，结合了节流和防抖：在节流时间间隔内重新设置防抖定时器，但超出间隔后直接响应，避免频繁操作时回调被无限延迟（此简化版用 JavaScript 展示核心逻辑，完整 TypeScript 版见文末「完整代码合集」）：

```typescript
// 节流+防抖合并版：在节流时间内重设防抖定时器
function throttleWithDebounce<T extends unknown[]>(
  fn: (...args: T) => void,
  wait: number
): (...args: T) => void {
  let last = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  return function (this: unknown, ...args: T) {
    const now = Date.now()
    if (now - last < wait) {
      // 在节流间隔内，用防抖延迟执行
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        last = Date.now()
        fn.apply(this, args)
        timer = null
      }, wait)
    } else {
      // 超出节流间隔，立即响应
      if (timer) { clearTimeout(timer); timer = null }
      last = now
      fn.apply(this, args)
    }
  }
}
```

### 手写 debounce（修正 immediate 版本的 bug）

笔记中的 `immediate` 版本有一个 bug：即便执行了立即调用（`callNow`），后面的 `setTimeout` 依然会再执行一遍 `fn`。正确实现是两条路径互斥：

**trailing 版**（默认，停止后触发）：

```typescript
function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  wait: number
) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return function (this: unknown, ...args: T) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, wait)
  }
}
```

**leading 版**（立即触发，冷却期内忽略）：

```typescript
function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  wait: number,
  immediate = false
) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return function (this: unknown, ...args: T) {
    if (timer) clearTimeout(timer)
    if (immediate) {
      const callNow = !timer
      timer = setTimeout(() => { timer = null }, wait)
```

```typescript
      // callNow 路径只执行 fn，setTimeout 只重置 timer
      if (callNow) fn.apply(this, args)
    } else {
      timer = setTimeout(() => {
        fn.apply(this, args)
        timer = null
      }, wait)
    }
  }
}
```

**bug 说明**：原版在 `immediate=true` 时，`callNow` 执行 `fn` 后，下面的 `setTimeout` 里还有一次 `fn.apply`——每次触发都执行两次。正确做法：`immediate` 为 `true` 时 `fn` 只在 `callNow` 里调用，`setTimeout` 只用来重置 `timer`，两条路径完全互斥。

### 原理：闭包 + 定时器

防抖和节流的核心都是**闭包保存状态**：

- `timer`：定时器 ID，跨调用共享，`clearTimeout` 依赖它取消上一次
- `previous`：上次执行时间戳，跨调用共享

`clearTimeout` 是关键——它取消的是「还没执行的任务」。防抖的本质：每次新触发都把上一个还没执行的定时器取消掉，重新计时。

### React 中的正确使用方式

**错误用法**——每次渲染重新创建，防抖失效：

```tsx
function SearchBox() {
  // 每次渲染都调用 debounce，创建全新闭包，timer 状态丢失
  const handleInput = debounce((value: string) => {
    fetchSuggestions(value)
  }, 300)
  return <input onChange={(e) => handleInput(e.target.value)} />
}
```

**正确用法 1：useRef 保存定时器**

```tsx
function SearchBox() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleInput = useCallback((value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      fetchSuggestions(value)
    }, 300)
  }, [])
  return <input onChange={(e) => handleInput(e.target.value)} />
}
```

**正确用法 2：useMemo 包裹 debounce，只创建一次**

```tsx
function SearchBox() {
  const debouncedFetch = useMemo(
    () => debounce((value: string) => fetchSuggestions(value), 300),
    []
  )
  useEffect(() => () => debouncedFetch.cancel?.(), [debouncedFetch])
  return <input onChange={(e) => debouncedFetch(e.target.value)} />
}
```

> 💬 **面试官**：手写 debounce，要求支持 leading 模式，再说说 React 函数组件里怎么正确使用？
>
> ✅ **标准答案**：leading 模式的关键是两条路径互斥——立即执行时 `setTimeout` 里不再调用 `fn`，只用来重置 `timer`。React 里需要用 `useRef` 或 `useMemo` 保持 debounced 函数引用稳定，否则每次渲染都创建新闭包，`timer` 状态丢失，防抖完全失效。
>
> 🎁 **加分答案**：组件卸载时需要 `clearTimeout` 清理定时器防内存泄漏；lodash 的 `.cancel()` 方法可以在组件卸载时取消未执行的回调。

---

## 🎨 重排（Reflow）与重绘（Repaint）

浏览器渲染管线：**JavaScript → Style → Layout → Paint → Composite**

<!-- 这是一张图片，ocr 内容为：合成 绘制 计算样式 JAVASCRIPT处理 页面布局 -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672917214710-8a074c75-ec34-4af5-8d68-7fcbee7bd36b.png)

重排（Reflow）是其中成本最高的步骤——触发后整个管线从 Layout 重新走一遍。重绘（Repaint）次之，只重走 Paint。只触发 Composite 的操作成本最低，不影响主线程。

目前大部分设备屏幕刷新率在 60fps，每帧约 16.7ms，去掉浏览器自身工作，留给渲染的时间不到 10ms。重排一旦发生，这 10ms 极易超出。

### CSS 属性完整分类表

**触发重排（最贵，整个 Layout 重算）**：

| 类别 | 属性 |
|------|------|
| 盒模型 | `width` `height` `padding` `margin` `border-width` |
| 定位 | `position` `top` `left` `right` `bottom` `float` |
| 文字 | `font-size` `font-weight` `line-height` `text-align` |
| 显示 | `display` `overflow` `box-sizing` `vertical-align` |

**只触发重绘（跳过 Layout，较贵）**：

`color` `background-color` `border-color` `outline` `box-shadow` `border-radius` `visibility`

**只触发合成（最便宜，走 GPU 线程）**：

| 属性 | 说明 |
|------|------|
| `transform` | 位移/缩放/旋转，走 GPU 合成线程 |
| `opacity` | 透明度，走 GPU 合成线程 |
| `filter` | 滤镜，部分情况走合成线程 |

**实战原则：动画只用 `transform` 和 `opacity`，永远不用 `left/top/width/height` 做动画。**

### 强制同步布局（Layout Thrashing）

读写交替是最常见的性能杀手。浏览器通常批量处理布局，但如果先写后读，就会强制立即刷新布局：

**错误示范**（每次循环都触发一次强制重排）：

```javascript
const boxes = document.querySelectorAll('.box')
// 每次循环：写（触发重排）→ 读（强制再次重排）
boxes.forEach(box => {
  box.style.width = '200px'       // 写：标记布局为 dirty
  console.log(box.offsetWidth)    // 读：强制立即重算布局
})
```

**触发强制同步布局的 API**（读这些属性时浏览器必须立即完成布局）：

```text
offsetWidth / offsetHeight / offsetTop / offsetLeft
scrollWidth / scrollHeight / scrollTop / scrollLeft
clientWidth / clientHeight / clientTop / clientLeft
getBoundingClientRect() / getComputedStyle()
```

### FastDOM 模式：批量读 → 批量写

正确做法是先批量读，再批量写，浏览器只需要一次重排：

```javascript
// 第一轮：只读，收集当前布局数据
const widths = Array.from(boxes).map(box => box.offsetWidth)

// 第二轮：只写，浏览器一次性重排
boxes.forEach((box, i) => {
  box.style.width = widths[i] * 2 + 'px'
})
```

**量化代价**：一个有 1000 个 DOM 节点的页面，读写交替 100 次可导致 300-500ms 的阻塞；FastDOM 模式可以压缩到 5ms 以内。

### Passive Event Listener：告诉浏览器「我不会 preventDefault」

滚动事件（`scroll`、`touchstart`、`touchmove`、`wheel`）有一个隐藏的性能杀手。浏览器在执行这些事件的回调时，必须**等待回调执行完成**才能确定你是否调用了 `preventDefault()`——如果不等待就直接滚动，结果可能是无效的（因为你"阻止"了）。这意味着回调慢，滚动就卡。

`{ passive: true }` 告诉浏览器「我不会调用 `preventDefault()`」，浏览器就可以立即开始滚动，不等回调：

```javascript
// 错误：移动端 touchstart 默认被视为可能 preventDefault，滚动延迟 300-500ms
document.addEventListener('touchstart', handleTouch)

// 正确：声明 passive，浏览器不等待，立即滚动
document.addEventListener('touchstart', handleTouch, { passive: true })

// 滚动的正确姿势：scroll 回调加 passive
window.addEventListener('scroll', onScroll, { passive: true })

// 滚轮事件同样受益
element.addEventListener('wheel', onWheel, { passive: true })
```

**移动端尤其关键**：`touchstart` 和 `touchmove` 不加 `passive: true` 可能导致数百毫秒的滚动延迟。Chrome 已在 `document` 级别的 `touchstart`/`touchmove` 上默认设为 passive，但元素级别的监听仍需手动声明。

> ⚠️ **注意**：一旦声明 `passive: true`，回调内部就不能再调用 `preventDefault()`——浏览器会直接忽略并在控制台警告。

### transform / opacity 走合成线程的原理

浏览器有两个线程参与渲染：**主线程**（JS + Layout + Paint）和**合成线程**（Composite）。

当元素被提升为合成层（Compositing Layer）后，它的 `transform` 和 `opacity` 动画完全在合成线程运行，不需要主线程参与，也不触发 Layout 和 Paint。即使主线程在执行繁重的 JS，动画也不会卡顿。

### will-change 正确使用

`will-change` 告诉浏览器「提前给这个元素创建合成层」：

```css
/* 正确：悬停时提升，离开时移除 */
.card:hover {
  will-change: transform;
}

/* 错误：给所有元素加，显存爆炸 */
* { will-change: transform; }
```

**滥用的代价**：每个合成层都需要独立显存（Texture），一个 100×100 的合成层消耗约 40KB 显存（RGBA × 4 × 100 × 100）。在移动设备上滥用 `will-change` 会导致 GPU 内存不足，反而更卡。

还可以使用 `transform: translate(0)` 来强制提升合成层，以兼容不支持 `will-change` 的浏览器（如早期 Safari）：

```css
.nav-layer {
  transform: translate(0); /* 兼容性写法，强制创建合成层 */
}
```

> 💬 **面试官**：`left: 100px` 和 `transform: translateX(100px)` 做动画有什么区别？
>
> ✅ **标准答案**：`left` 改变触发重排（Layout → Paint → Composite），每帧都在主线程执行，容易丢帧。`transform` 只触发合成，在独立合成线程运行，不受主线程 JS 阻塞影响。
>
> 🎁 **加分答案**：`will-change: transform` 可以提前创建合成层，避免动画第一帧的提升开销；但合成层过多会增加显存压力，所以最好动态添加/删除，不能全局加。

### CSS containment：锁定布局边界

`transform` 和 `opacity` 走合成线程是针对「单个元素的动画」，但如果有一个频繁更新的独立 widget（如实时价格、计时器），每次更新都可能触发整个页面的重排。`contain` 属性告诉浏览器某个元素的样式/布局/绘制**不会影响外部**：

```css
.widget {
  /* layout: 元素内部的布局变化不影响外部元素 */
  /* style: 计数器/引用不逃出元素边界 */
  /* paint: 元素不会在自身边界外绘制 */
  contain: layout style paint;
}
```

实际效果：当 `.widget` 内部发生变化时，浏览器只需要重新计算这个元素内部的布局，不会触发整个页面的重排。

`contain: strict` 是 `contain: layout style paint size` 的简写，提供最强的隔离效果。实际上 `content-visibility: auto` 就是 `contain: layout style paint` + 自动跳过屏外内容渲染，两者在隔离机制上是相通的——CSS containment 可以看作 `content-visibility` 的理论基础。

---

## 🎞️ requestAnimationFrame 与 requestIdleCallback

### rAF：与显示器刷新率同步

`requestAnimationFrame` 的回调在浏览器**下一帧绘制前**执行，与显示器刷新率同步（60Hz ≈ 16.7ms/帧，120Hz ≈ 8.3ms/帧）。

<!-- 这是一张图片，ocr 内容为：定时器触发 阻止刷新 JAVASCRIPT处理 RS合成 16MS 16MS 16MS -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672986250410-c2bd8e01-fa76-4e1f-a2ca-0d42e5d8a48a.png)

rAF 与 setInterval 做动画的本质区别：

| | `setInterval(fn, 16)` | `requestAnimationFrame(fn)` |
|---|---|---|
| 触发时机 | 宏任务队列，不保证 16ms | 帧绘制前，与刷新率同步 |
| 标签页隐藏 | 仍然执行（浪费电量） | 自动暂停（节能） |
| 高刷屏适配 | 固定 16ms，120Hz 下动画慢 | 自动适配刷新率 |
| 丢帧风险 | 高（受事件循环影响） | 低（浏览器调度保证） |

rAF 本质上是「每帧节流一次」，滚动事件里的复杂计算通过 rAF 调度，可以保证不超过帧率限制：

```javascript
let ticking = false
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      updateScrollPosition()
      ticking = false
    })
    ticking = true
  }
})
```

一个使用 rAF 实现平移动画的示例（注意用 `transform` 而非 `left`，避免每帧触发重排）：

```javascript
const element = document.querySelector('.box')
let start

function step(timestamp) {
  if (!start) start = timestamp
  const progress = timestamp - start
  // ✅ 用 transform 走合成线程，不触发重排
  element.style.transform = `translateX(${Math.min(progress / 10, 200)}px)`
  if (progress < 2000) window.requestAnimationFrame(step)
}

window.requestAnimationFrame(step)
```

### rIC：浏览器空闲时执行

`requestIdleCallback` 在浏览器**空闲帧**执行，不抢占用户交互和动画的帧预算：

```javascript
requestIdleCallback((deadline) => {
  // timeRemaining() 返回当前空闲帧剩余毫秒数
  while (deadline.timeRemaining() > 0 && tasks.length > 0) {
    tasks.shift()()
  }
  if (tasks.length > 0) {
    requestIdleCallback(processQueue)
  }
}, { timeout: 2000 }) // 最多等 2 秒，超时强制执行
```

适合用 rIC 的任务：日志上报、预加载、非紧急数据同步、IndexedDB 写入。

**不适合用 rIC 的**：DOM 更新、动画、用户可见的状态变更（因为执行时机不确定）。

### React Scheduler 的时间切片原理

React 18 并发模式用 `MessageChannel` 实现了自己的调度器，原理与 rIC 类似但更可控：

```javascript
// React Scheduler 核心（简化版）
const channel = new MessageChannel()
channel.port1.onmessage = () => {
  // 每个 MessageChannel 消息是一个宏任务
  // 执行一小片 React 工作，然后让出主线程
  workLoop()
}
function scheduleWork() {
  channel.port2.postMessage(null)
}
```

为什么不直接用 `requestIdleCallback`？因为 rIC 的最小触发间隔约 50ms，React 需要更细粒度的调度（<5ms）。`MessageChannel` 的每次 `postMessage` 都是一个独立的宏任务，可以精确控制「执行一小片工作 → 让出主线程 → 继续」的节奏。

> 💬 **面试官**：requestAnimationFrame 和 setTimeout 做动画有什么区别？requestIdleCallback 适合做什么？
>
> ✅ **标准答案**：rAF 与显示器刷新率同步，标签页隐藏时自动暂停，不会丢帧；setTimeout 受事件循环影响，不保证 16ms 精度。rIC 在浏览器空闲帧执行，适合日志上报、预加载等非紧急任务，不能用于 DOM 更新。
>
> 🎁 **加分答案**：React Scheduler 用 MessageChannel 替代 rIC 的原因是 rIC 调度粒度太粗（~50ms），MessageChannel 可以实现 5ms 级别的时间切片，是 React 并发模式的调度基础。此外，`scheduler.yield()` 提案（TC39 Stage 2）将提供原生 API 让出主线程，未来有望简化调度器的实现——一行 `await scheduler.yield()` 就能实现「执行一小片工作 → 让出主线程 → 继续」的语义。Chrome 115+ 已率先支持实验性版本。

---

## ⚛️ React 性能优化

React 的性能问题本质只有一个：**不必要的重渲染**。解决它有三个层次：避免触发、跳过渲染、并发更新。

### React DevTools Profiler：React 版的 Performance 面板

在动手优化之前，先确认**到底哪些组件在重渲染、渲染了几次、每次耗时多少**。React DevTools 的 Profiler 面板就是干这个的：

1. 打开 React DevTools → ⚛️ Profiler 标签
2. 点击 `●` 开始录制
3. 在页面上执行操作（输入、点击、切换 tab 等）
4. 点击 `■` 停止录制

Profiler 提供两个视图：

- **Flamegraph**：每个色块是一个组件，宽度 = 最近一次渲染耗时（含子组件），从上到下是组件树
- **Ranked**：按总渲染耗时排序，一眼看到最贵的组件

点击任意组件可以看到 **"Why did this render?"**——显示触发本次渲染的 props/state/context 变化。这是排查 memo 失效、Context 全树重渲染的第一手线索。

> 💡 **技巧**：选中组件后在右侧面板勾选「Hide logs below commitment」，可以只看本次提交中有变化的组件，过滤掉无变化的渲染。

### React.memo：浅比较，何时失效

`React.memo` 对 props 做**浅比较**，props 引用没变就跳过渲染：

```tsx
const DrugCard = React.memo(({ drug }: { drug: Drug }) => {
  return <div>{drug.name} - ¥{drug.price}</div>
})
```

**失效场景 1：对象/数组/函数每次渲染重新创建**

```tsx
function DrugList() {
  // 每次渲染都创建新对象引用，浅比较 !==，memo 失效
  return <DrugCard style={{ color: 'red' }} onClick={() => {}} />
}
```

**失效场景 2：子组件自身 state 变化**——memo 只对外部 props 有效。

**失效场景 3：订阅了 Context**——Context 值变化时无论是否 memo 都会重渲染。

> 🛠️ **排查利器**：手动排查 memo 失效非常耗时。开发环境可以接入 `@welldone-software/why-did-you-render`（简称 wdyr），它能自动在控制台标记不必要的重渲染，并告诉你具体是哪个 prop 的变化触发了本次渲染。也可以使用 [React Scan](https://react-scan.com/) 在页面上直接高亮正在渲染的组件，一目了然。

### useMemo / useCallback：依赖数组陷阱

```tsx
// useMemo：缓存计算结果
const sortedDrugs = useMemo(
  () => [...drugs].sort((a, b) => a.price - b.price),
  [drugs] // drugs 引用不变时跳过重算
)

// useCallback：缓存函数引用（让 memo 子组件不因函数重建而重渲染）
const handleSelect = useCallback(
  (id: string) => selectDrug(id),
  [selectDrug]
)
```

**过度优化反变慢的原因**：每次渲染都要执行依赖比较（`Object.is`），如果计算本身很轻（如字符串拼接），比较的开销比重算还大。

使用判断标准：
- 计算结果传给 memo 子组件 → 用
- 计算本身耗时（>1ms）→ 用
- 函数作为 `useEffect` 的依赖 → 用 `useCallback`
- 简单的原始值计算 → 不用

### 状态下沉与组件拆分

这是减少重渲染**最有效的方法**，不依赖 memo：

**问题**：`searchQuery` 变化导致整个页面重渲染，包括昂贵的药品列表：

```tsx
function DrugPage() {
  const [searchQuery, setSearchQuery] = useState('')
  return (
    <div>
      <input onChange={e => setSearchQuery(e.target.value)} />
      <ExpensiveDrugList /> {/* 被迫重渲染 */}
    </div>
  )
}
```

**状态下沉**——把 state 移到真正需要它的组件：

```tsx
function SearchInput() {
  const [query, setQuery] = useState('')
  return <input onChange={e => setQuery(e.target.value)} />
}

function DrugPage() {
  return (
    <div>
      <SearchInput />      {/* query 只影响 SearchInput 自身 */}
      <ExpensiveDrugList /> {/* 完全不受影响 */}
    </div>
  )
}
```

### useTransition / useDeferredValue

React 18 并发模式允许把非紧急更新标记为「可中断」，让紧急更新（用户输入）优先处理：

```tsx
function SearchPage() {
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value) // 紧急：立即更新输入框
    startTransition(() => {
      setSearchResults(filterDrugs(e.target.value)) // 非紧急：可延迟
    })
  }
```

```tsx
  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
      <DrugList />
    </>
  )
}
```

`useDeferredValue` 效果类似，但用于接收值而非包裹更新：

```tsx
function DrugList({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query)
  // deferredQuery 在紧张时会「滞后」，优先让输入框响应
  const results = useMemo(() => filterDrugs(deferredQuery), [deferredQuery])
  return <ul>{results.map(d => <li key={d.id}>{d.name}</li>)}</ul>
}
```

### React Compiler（RC）

React Compiler（原名 Forget）是 React 官方的自动优化编译器，在编译阶段自动插入 `useMemo` 和 `useCallback`：

```tsx
// 你写的代码
function DrugCard({ drug }) {
  const formatted = formatPrice(drug.price) // 每次渲染重算
  return <div>{drug.name}: {formatted}</div>
}

// Compiler 输出（伪代码）
function DrugCard({ drug }) {
  const formatted = useMemo(() => formatPrice(drug.price), [drug.price])
  return <div>{drug.name}: {formatted}</div>
}
```

**何时手动优化仍有必要**：
- 复杂的副作用依赖（Compiler 保守策略可能多缓存）
- 需要精确控制 `useEffect` 触发时机
- 与第三方库的 ref 交互

### Context 性能问题

大 Context 导致全树重渲染，这是最容易被忽视的性能陷阱：

```tsx
// 问题：theme 或 user 任一变化，所有消费者都重渲染
const AppContext = createContext({ theme, user, cart, notifications })
```

**拆分 Context 方案**：

```tsx
const ThemeContext = createContext(theme)
const UserContext = createContext(user)
const CartContext = createContext(cart)

// 组件只订阅自己需要的 Context
function Header() {
  const user = useContext(UserContext) // 只有 user 变化时重渲染
  return <div>{user.name}</div>
}
```

> 💬 **面试官**：React.memo 在什么情况下会失效？Context 性能问题怎么解？
>
> ✅ **标准答案**：memo 失效的三种情况：父组件每次渲染时传入新的对象/函数引用（浅比较 !==）、子组件自身 state 变化、订阅了变化的 Context。Context 性能问题通过拆分 Context 解决——把不同频率更新的数据放进独立的 Context Provider。
>
> 🎁 **加分答案**：可以用 `useContextSelector`（第三方库）做细粒度订阅；或者把 Context value 用 `useMemo` 稳定引用，避免 Provider 重渲染时 value 对象重建触发所有消费者更新。

---

### content-visibility：CSS 方案 vs JS 虚拟化

在进入 JavaScript 虚拟化之前，先看一个纯 CSS 方案。`content-visibility: auto` 是 CSS Containment 规范的一部分，告诉浏览器跳过屏幕外内容的 layout 和 paint：

```css
.drug-card {
  content-visibility: auto;
  contain-intrinsic-size: 0 200px; /* 预估高度，避免滚动条跳动 */
}
```

**原理**：浏览器对不在视口内的元素跳过 Layout 和 Paint，只保留占位尺寸。在包含大量卡片的药品列表页，首次渲染时间可以降低 50% 以上（只渲染首屏可见部分的 Layout）。

**与虚拟化的区别**：`content-visibility` 是 CSS 方案，DOM 节点全部存在，只是跳过渲染计算；虚拟化是 JS 方案，不可见的 DOM 节点根本不创建。数据量不大（几百项）时用 `content-visibility` 成本低；数据量极大（万级以上）时用虚拟化。

> 💬 **面试官**：`content-visibility` 是什么原理？和虚拟列表有什么区别？
>
> ✅ **标准答案**：`content-visibility: auto` 基于 CSS Containment 规范，让浏览器跳过视口外元素的 Layout 和 Paint 计算，DOM 节点仍然存在。虚拟化是 JS 方案，不可见的 DOM 节点根本不创建。数据量不大（几百项）时用 `content-visibility` 成本低；数据量极大（万级以上）时用虚拟化。
>
> 🎁 **加分答案**：`contain-intrinsic-size` 是配套属性，为跳过渲染的元素提供占位尺寸，避免滚动时布局抖动。

## 📋 长列表虚拟化

### 为什么 DOM 节点多了会卡

DOM 节点越多，Layout 阶段的计算量越大。一个经典的药品列表页，10 万条数据全部渲染到 DOM：

- DOM 节点：10 万个 `<li>`
- Layout 计算：10 万次几何计算
- 内存占用：大量 DOM 节点持续占用堆内存
- 滚动时重绘：每帧需要绘制所有可见区域

**虚拟化的核心思路**：只渲染可视区域内的 DOM 节点（通常 10-30 个），其余用占位元素撑开滚动高度。

### @tanstack/react-virtual 使用示例

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

function DrugList({ drugs }: { drugs: Drug[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: drugs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // 预估每行高度
    overscan: 5,            // 可视区域外额外渲染的行数
  })
```

```tsx
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: rowVirtualizer.getTotalSize() }}>
        {rowVirtualizer.getVirtualItems().map(item => (
          <div
            key={item.key}
            style={{ position: 'absolute', top: item.start, height: item.size }}
          >
            {drugs[item.index].name}
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 手写最小虚拟列表（固定行高）

理解原理比会用库更重要。下面是一个约 60 行的最小实现：

```tsx
interface VirtualListProps {
  items: string[]
  itemHeight: number
  containerHeight: number
}

function VirtualList({ items, itemHeight, containerHeight }: VirtualListProps) {
  const [scrollTop, setScrollTop] = useState(0)

  const totalHeight = items.length * itemHeight
  const visibleCount = Math.ceil(containerHeight / itemHeight)
  const startIndex = Math.floor(scrollTop / itemHeight)
```

```tsx
  const endIndex = Math.min(startIndex + visibleCount + 1, items.length)
  const offsetY = startIndex * itemHeight
  const visibleItems = items.slice(startIndex, endIndex)

  return (
    <div
      style={{ height: containerHeight, overflow: 'auto', position: 'relative' }}
      onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => (
            <div key={startIndex + i} style={{ height: itemHeight }}>{item}</div>
          ))}
```

```tsx
        </div>
      </div>
    </div>
  )
}
```

**关键计算**：
- `startIndex = Math.floor(scrollTop / itemHeight)`：第一个可见项的索引
- `offsetY = startIndex * itemHeight`：用 `translateY` 把渲染项推到正确位置
- `overscan`：多渲染 1-2 个屏外项，避免快速滚动时白屏

### 动态行高方案

固定行高简单，但现实中每行高度往往不一样（药品说明长短不一）。动态行高的思路：

1. **先渲染后测量**：用 `ref` + `ResizeObserver` 测量每行实际高度
2. **缓存高度**：用 `Map<index, height>` 缓存测量结果
3. **估算 + 修正**：初始用 `estimateSize` 预估，测量后更新偏移量

`@tanstack/react-virtual` 的 `measureElement` 配合 `ResizeObserver` 已实现这套方案，生产环境直接用。

> 💬 **面试官**：10 万条数据的列表怎么渲染不卡顿？
>
> ✅ **标准答案**：虚拟化（windowing）——只渲染可视区域的 DOM 节点。核心是计算滚动偏移量确定 startIndex/endIndex，渲染这个范围内的项，并用一个撑满总高度的容器保证滚动条正确。
>
> 🎁 **加分答案**：生产环境用 `@tanstack/react-virtual`，它处理了动态行高、平滑滚动、overscan、水平虚拟化等边缘情况。分页、无限滚动是另一类方案，适合数据量不确定的场景。

### 事件委托：一个监听器管理 N 个子元素

虚拟化减少了 DOM 节点数量，但每个可见项仍可能需要绑定事件（如点击、hover）。如果为每个列表项单独绑定监听器，监听器数量 = 可见项数量 × 事件种类，内存和注册开销随之增长。

**事件委托**利用事件冒泡，在父容器上绑定一个监听器，通过 `event.target` 判断实际触发源：

```tsx
function DrugList({ drugs }: { drugs: Drug[] }) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('[data-drug-id]')
    if (!target) return
    const id = target.getAttribute('data-drug-id')
    navigateToDrug(id)
  }

  return (
    <div onClick={handleClick}>
      {drugs.map(drug => (
        <div key={drug.id} data-drug-id={drug.id}>
          {drug.name}
        </div>
      ))}
    </div>
  )
}
```

React 17+ 已经将事件委托到根节点，所以 React 内部已经享受了事件委托的性能优势。但 **`data-*` 属性的委托模式**仍然是减少重复 JSX 事件绑定、提升代码可维护性的好实践。

> ⚠️ **注意**：`focus`、`blur`、`mouseenter`、`mouseleave` 等事件不冒泡，无法委托。React 对这些事件有特殊处理，使用对应的冒泡版本（`focusin`/`focusout`/`mouseover`/`mouseout`）。

---

## 🧵 Web Worker：把计算移出主线程

JavaScript 是单线程的，所有任务都在主线程执行，与 Layout、Paint 竞争帧预算。对于耗时的纯计算任务，Web Worker 提供了真正的多线程方案。

### 适用场景

- 图片处理（压缩、格式转换、滤镜）
- 大数据排序/过滤（药品数据集的复杂查询）
- 加密/哈希计算
- CSV/Excel 解析

**不适合 Worker 的**：DOM 操作（Worker 无法访问 DOM）、需要低延迟响应的任务（Worker 通信有序列化开销）。

### 基础通信：postMessage + onmessage

Worker 的限制：无法访问 DOM、`window`、`document`，只能通过消息通信：

```javascript
// main.js（主线程）
const worker = new Worker('worker.js')

worker.postMessage({ type: 'sort', data: drugList })

worker.addEventListener('message', e => {
  const { type, data } = e.data
  if (type === 'sort') updateList(data)
})

// 任务完成后及时关闭，节省资源
// worker.terminate()
```

```javascript
// worker.js（Worker 线程）
onmessage = function(e) {
  const { type, data } = e.data
  if (type === 'sort') {
    const sorted = data.sort((a, b) => a.price - b.price)
    postMessage({ type: 'sort', data: sorted })
  }
}
```

Worker 的注意事项：
- DOM 限制：无法读取 `document`、`window`、`parent`
- 文件限制：脚本必须来自网络，不能加载本地文件
- 同源限制：Worker 脚本需与主线程同源
- 资源占用：Worker 始终运行，任务完成后及时 `terminate()`

### Comlink：封装成 RPC 风格

原始 `postMessage` 需要手动管理消息类型和回调，Comlink 把 Worker 封装成普通的异步函数调用：

```javascript
// worker.js
import { expose } from 'comlink'

const drugWorker = {
  async sortByPrice(drugs) {
    return [...drugs].sort((a, b) => a.price - b.price)
  },
  async filterByCategory(drugs, category) {
    return drugs.filter(d => d.category === category)
  }
}

expose(drugWorker)
```

```javascript
// main.js
import { wrap } from 'comlink'

const worker = new Worker('worker.js', { type: 'module' })
const drugWorker = wrap(worker)

// 像调用普通异步函数一样使用
const sorted = await drugWorker.sortByPrice(drugList)
```

Comlink 内部用 `Proxy` 拦截函数调用，自动转成 `postMessage` + Promise，代码从几十行降到几行。

### OffscreenCanvas：在 Worker 中渲染

Canvas 的渲染计算（图表绘制、图片处理、帧动画）通常也在主线程执行，与 Layout、Paint 竞争。`OffscreenCanvas` 允许将 Canvas 的控制权转移到 Worker，实现**完全脱离主线程的渲染**：

```javascript
// main.js
const canvas = document.querySelector('canvas')
const offscreen = canvas.transferControlToOffscreen()
worker.postMessage({ canvas: offscreen }, [offscreen]) // Transferable，零拷贝

// worker.js
onmessage = ({ data: { canvas } }) => {
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'red'
  ctx.fillRect(0, 0, 100, 100) // 在 Worker 线程渲染，不阻塞主线程
}
```

**适用场景**：医疗影像标注（药品分子结构图、CT 图像标注）、数据可视化图表（大量节点的关系图）、帧动画（Lottie 动画转 OffscreenCanvas）。

> ⚠️ **注意**：`OffscreenCanvas` 需要浏览器支持（Chrome 69+、Edge 79+、Firefox 105+）。在 Worker 中渲染时不能直接监听 DOM 事件（click、hover），需要通过 `postMessage` 将主线程的事件坐标传回 Worker。

### SharedArrayBuffer + Atomics

`postMessage` 的通信方式需要序列化/反序列化数据，对大数据（如几十 MB 的图像数据）开销很大。`SharedArrayBuffer` 允许主线程和 Worker 共享同一块内存：

```javascript
// 主线程创建共享内存
const sharedBuffer = new SharedArrayBuffer(1024)
const sharedArray = new Int32Array(sharedBuffer)

worker.postMessage({ buffer: sharedBuffer })

// Worker 直接读写同一块内存，无需序列化
// worker.js
onmessage = ({ data: { buffer } }) => {
  const arr = new Int32Array(buffer)
  Atomics.store(arr, 0, 42) // 原子操作，线程安全
}
```

**注意**：使用 `SharedArrayBuffer` 需要页面设置安全头（防 Spectre 攻击）：

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

> 💬 **面试官**：Web Worker 和主线程怎么通信？有没有更高效的方式？
>
> ✅ **标准答案**：基础方式是 `postMessage` + `onmessage`，消息会被结构化克隆（序列化），适合小数据。对于大数据可以用 Transferable Objects（如 `ArrayBuffer`），转移所有权而非复制，零拷贝传输。
>
> 🎁 **加分答案**：`SharedArrayBuffer` + `Atomics` 允许共享内存，完全避免序列化，但需要 COOP/COEP 安全头。Comlink 是 Worker 通信的工程化封装，用 Proxy 把 Worker 暴露成 RPC 接口，大幅降低使用成本。

---

## 🚨 内存泄漏排查

内存泄漏指的是不再使用的对象因为仍被引用而无法被垃圾回收，随时间积累导致内存持续增长，最终页面卡顿甚至崩溃。

### 四大常见来源

**1. 未清理的定时器**

```javascript
// 错误：组件卸载后定时器仍在运行，回调持有组件引用
function LivePrice() {
  const [price, setPrice] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => {
      fetchPrice().then(setPrice) // setPrice 持有组件引用
    }, 1000)
    // 没有 return () => clearInterval(timer)
  }, [])
}
```

**2. 未清理的事件监听器**

```javascript
// 错误：组件卸载后监听器仍然存在
useEffect(() => {
  window.addEventListener('resize', handleResize)
  // 没有 return () => window.removeEventListener('resize', handleResize)
}, [])
```

**3. 闭包持有大对象**

```javascript
// 错误：getData 的闭包持有 largeData，导致 largeData 无法被回收
function processData(largeData) {
  const summary = largeData.items.length
  return function getData() {
    return summary // 只用了 summary，但整个 largeData 被闭包捕获
  }
}
```

**4. 未关闭的 WebSocket / 长轮询**

```javascript
// 错误：组件卸载后 WebSocket 连接仍然存在，接收消息时尝试更新已卸载的组件
function DrugPriceMonitor() {
  const [price, setPrice] = useState(0)
  useEffect(() => {
    const ws = new WebSocket('wss://api.example.com/price-feed')
    ws.onmessage = (e) => setPrice(JSON.parse(e.data).price)
    // 没有 return () => ws.close()
  }, [])
}
```

WebSocket 和 `fetch` 轮询（`setInterval` 发请求）在组件卸载后如果没有关闭，回调中持有的 `setState` 仍然持有组件引用，阻止 GC。正确做法与定时器类似——在 cleanup 中关闭连接或标记取消。

### Chrome Memory 面板：三步定位泄漏

**第一步**：打开 Memory 面板，选择「Heap snapshot」，点击「Take snapshot」，记录为 Snapshot 1。

**第二步**：执行可能泄漏的操作（如反复打开/关闭弹窗、切换路由），再次 Take snapshot，记录为 Snapshot 2。

**第三步**：在 Snapshot 2 的下拉菜单选择「Comparison」，与 Snapshot 1 对比。重点看 `# New` 列（新增对象数量）和 `Size Delta` 列（内存增量）。

<!-- 这是一张图片，ocr 内容为：MEMORY 面板 HEAP SNAPSHOT SUMMARY RETAINERS SHALLOW SIZE RETAINED SIZE DISTANCE CONSTRUCTOR -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672731728206-287d67b1-9561-45b3-85bd-c11ec69e91b4.png)

点击可疑对象，查看底部的 **Retainers 树**——它显示「谁持有了这个对象」。沿着 Retainers 链往上找，就能定位到泄漏根源。

### React 中的典型泄漏：useEffect 未返回 cleanup

```tsx
// 错误：组件卸载后异步回调仍然尝试更新 state
function DrugDetail({ id }: { id: string }) {
  const [drug, setDrug] = useState<Drug | null>(null)

  useEffect(() => {
    fetchDrug(id).then(data => {
      setDrug(data) // 如果组件已卸载，这里会触发警告甚至泄漏
    })
  }, [id])
}
```

**正确写法：用 cleanup 取消或忽略**

```tsx
useEffect(() => {
  let cancelled = false
  fetchDrug(id).then(data => {
    if (!cancelled) setDrug(data)
  })
  return () => { cancelled = true } // cleanup：组件卸载时标记取消
}, [id])
```

对于 `AbortController` 支持的 fetch，可以更彻底地取消请求：

```tsx
useEffect(() => {
  const controller = new AbortController()
  fetchDrug(id, { signal: controller.signal })
    .then(data => setDrug(data))
    .catch(err => { if (err.name !== 'AbortError') throw err })
  return () => controller.abort()
}, [id])
```

### WeakMap / WeakRef 的正确使用场景

`WeakMap` 和 `WeakRef` 持有的引用是「弱引用」——不阻止垃圾回收：

```javascript
// WeakMap：以 DOM 节点为 key 存储额外数据，节点被移除后自动回收
const nodeMetadata = new WeakMap()
nodeMetadata.set(domElement, { createdAt: Date.now() })
// domElement 被 GC 后，WeakMap 中的条目自动消失

// WeakRef：持有对象引用但不阻止 GC，需要在使用前检查是否还存在
const weakRef = new WeakRef(largeObject)
const obj = weakRef.deref() // 可能返回 undefined（已被 GC）
if (obj) {
  // 安全使用
}
```

**适用场景**：缓存（key 被 GC 后自动清除缓存条目）、DOM 节点关联数据、大对象的可选引用。

与 `WeakRef` 互补的是 `FinalizationRegistry`——它能在对象被 GC 后**异步执行清理回调**，适合清理外部资源：

```javascript
// FinalizationRegistry：对象被垃圾回收后自动清理 IndexedDB 中的过期缓存
const cacheCleaner = new FinalizationRegistry((cacheKey) => {
  indexedDB.deleteDatabase(cacheKey) // 原始缓存对象被 GC 后，清理对应的持久化缓存
})

// 注册：当 cacheObject 被 GC 时，回调自动触发
cacheCleaner.register(cacheObject, 'drug-cache-v1')

// 如果后续确定不再需要清理，可以手动注销
// cacheCleaner.unregister(cacheObject)
```

> ⚠️ **注意**：GC 时机不可预测，`FinalizationRegistry` 回调可能在注册后很久才执行（或不执行——如果页面被直接关闭）。不要用它管理关键业务逻辑，只适合非关键的清理收尾工作。

> 💬 **面试官**：React 中内存泄漏的常见原因是什么？怎么排查？
>
> ✅ **标准答案**：最常见的是 `useEffect` 未返回 cleanup——定时器、事件监听器、异步回调在组件卸载后仍然运行并持有引用。排查方法：Chrome Memory 面板拍两次 Heap Snapshot 做 Comparison，看 `Size Delta` 增量最大的对象，通过 Retainers 树找到持有者。
>
> 🎁 **加分答案**：Performance monitor 面板可以实时观察 JS Heap Size 和 DOM Nodes 数量，操作页面时如果这两个指标持续单调上升（不随 GC 下降），基本可以确认存在泄漏。

---

## ✨ 数据存储 & 上传优化

### localStorage/sessionStorage 同步阻塞 → 大数据用 IndexedDB

`localStorage` 和 `sessionStorage` 的读写是**同步阻塞主线程**的，存储大数据时会直接卡顿：

```javascript
// 错误：存储大量数据阻塞主线程
localStorage.setItem('drugList', JSON.stringify(tenThousandDrugs))

// 正确：大数据用 IndexedDB（异步，不阻塞主线程）
const db = await openDB('pharmacy', 1, {
  upgrade(db) {
    db.createObjectStore('drugs', { keyPath: 'id' })
  }
})
await db.put('drugs', drug)
const allDrugs = await db.getAll('drugs')
```

**选择标准**：

| 存储方式 | 容量 | 同步/异步 | 适用场景 |
|---------|------|---------|---------|
| `localStorage` | ~5MB | 同步（阻塞） | 小型配置、用户偏好 |
| `sessionStorage` | ~5MB | 同步（阻塞） | 单次会话临时数据 |
| `IndexedDB` | 几百 MB+ | 异步（不阻塞） | 大数据、结构化数据、离线缓存 |

### 大文件分片上传

用户上传药品图片或说明书 PDF 时，直接上传大文件有三个问题：网络中断后需要重新上传全部、服务端内存压力大、上传进度不可控。分片上传解决这三个问题。

整个流程分四步：**计算哈希 → 查询已上传分片 → 并发上传缺失分片 → 通知服务端合并**。

#### 第一步：文件哈希计算（放入 Web Worker）

哈希是断点续传的核心——服务端用它唯一标识一个文件，也用它查询哪些分片已到达。

文件哈希计算（`SparkMD5` 对全部字节做 MD5）是 CPU 密集型操作，对大文件会阻塞主线程数秒。**必须放入 Web Worker**：

```javascript
// hash.worker.js（Worker 线程）
importScripts('spark-md5.min.js')

onmessage = function({ data: { chunks } }) {
  const spark = new SparkMD5.ArrayBuffer()
  let current = 0

  function loadNext() {
    const reader = new FileReader()
    reader.onload = (e) => {
      spark.append(e.target.result)
      current++
      // 每处理一个分片就上报进度
      postMessage({ type: 'progress', value: current / chunks.length })
      if (current < chunks.length) {
        loadNext()
      } else {
        postMessage({ type: 'done', hash: spark.end() })
      }
    }
    reader.readAsArrayBuffer(chunks[current])
  }
  loadNext()
}
```

```javascript
// main.js — 调用方：把文件切片后传给 Worker
function calculateHashInWorker(file, chunkSize = 2 * 1024 * 1024) {
  return new Promise((resolve) => {
    const chunks = []
    let cur = 0
    while (cur < file.size) {
      chunks.push(file.slice(cur, cur + chunkSize))
      cur += chunkSize
    }

    const worker = new Worker('/hash.worker.js')
    worker.postMessage({ chunks })
    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') {
        updateHashProgress(data.value) // 更新哈希进度 UI
      } else if (data.type === 'done') {
        worker.terminate()
        resolve({ hash: data.hash, chunks })
      }
    }
  })
}
```

> **为什么要逐片读而不是一次性读整个文件？** `FileReader.readAsArrayBuffer` 会把文件内容复制到内存。100MB 的文件一次性读入会瞬间占满内存。逐片读，每次只占用 2MB，内存压力可控。

#### 第二步：向服务端查询已上传分片（秒传 + 断点续传的入口）

```javascript
async function verifyUpload(fileHash, filename) {
  const res = await fetch('/api/upload/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileHash, filename })
  })
  return res.json()
  // 返回示例：
  // { status: 'done' }                      — 文件已完整上传（秒传）
  // { status: 'partial', uploaded: [0,1,3] } — 部分分片已到达（断点续传）
  // { status: 'none' }                       — 全新文件，从头上传
}
```

服务端逻辑：以 `fileHash` 为目录名存储分片，查询该目录下已有哪些分片文件：

```javascript
// 服务端伪代码（Node.js）
app.post('/api/upload/verify', async (req, res) => {
  const { fileHash, filename } = req.body
  const chunkDir = path.join(UPLOAD_DIR, fileHash)
  const mergedFile = path.join(UPLOAD_DIR, filename)

  if (fs.existsSync(mergedFile)) {
    return res.json({ status: 'done', url: `/files/${filename}` })
  }
  const uploaded = fs.existsSync(chunkDir)
    ? fs.readdirSync(chunkDir).map(Number)
    : []
  res.json({ status: uploaded.length ? 'partial' : 'none', uploaded })
})
```

#### 第三步：并发上传缺失分片（含进度 + 重试）

串行上传简单但慢。生产环境并发上传 3-5 个分片，同时支持单片失败重试：

```javascript
async function uploadChunkWithRetry(chunk, index, fileHash, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const formData = new FormData()
      formData.append('chunk', chunk)
      formData.append('index', String(index))
      formData.append('hash', fileHash)
      await fetch('/api/upload/chunk', { method: 'POST', body: formData })
      return // 成功就返回
    } catch (err) {
      if (attempt === retries - 1) throw err // 最后一次失败才抛出
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1))) // 指数退避
    }
  }
}

async function uploadChunks(chunks, uploadedIndexes, fileHash, onProgress) {
  // 过滤掉已上传的分片（断点续传核心逻辑）
  const pending = chunks
    .map((chunk, index) => ({ chunk, index }))
    .filter(({ index }) => !uploadedIndexes.includes(index))

  let done = uploadedIndexes.length // 已完成数（含之前断点续传的）
  const total = chunks.length

  // 并发池：同时最多 3 个请求在飞
  const pool = []
  const MAX = 3
  for (const { chunk, index } of pending) {
    const task = uploadChunkWithRetry(chunk, index, fileHash).then(() => {
      done++
      onProgress(done / total)           // 上报进度
      pool.splice(pool.indexOf(task), 1) // 完成后从池中移除
    })
    pool.push(task)
    if (pool.length >= MAX) await Promise.race(pool) // 池满则等最快的完成
  }
  await Promise.all(pool) // 等待剩余任务
}
```

#### 第四步：通知服务端合并分片

```javascript
async function mergeChunks(fileHash, filename, totalChunks) {
  await fetch('/api/upload/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileHash, filename, totalChunks })
  })
}
```

服务端合并逻辑：按分片索引排序后，用 `pipe` 流式合并，避免一次性读入全部分片到内存：

```javascript
// 服务端伪代码
app.post('/api/upload/merge', async (req, res) => {
  const { fileHash, filename, totalChunks } = req.body
  const chunkDir = path.join(UPLOAD_DIR, fileHash)
  const outputPath = path.join(UPLOAD_DIR, filename)

  const writeStream = fs.createWriteStream(outputPath)
  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(chunkDir, String(i))
    await new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(chunkPath)
      readStream.pipe(writeStream, { end: false }) // end:false 不关闭 writeStream
      readStream.on('end', resolve)
      readStream.on('error', reject)
    })
  }
  writeStream.end()
  fs.rmSync(chunkDir, { recursive: true }) // 合并完删除临时分片
  res.json({ url: `/files/${filename}` })
})
```

#### 完整流程串联

```javascript
async function uploadFile(file) {
  // 1. 计算哈希（Worker 中，不阻塞主线程）
  const { hash, chunks } = await calculateHashInWorker(file)

  // 2. 查询已上传状态（秒传 / 断点续传 / 全新上传）
  const { status, uploaded = [], url } = await verifyUpload(hash, file.name)
  if (status === 'done') {
    console.log('秒传成功：', url)
    return url
  }

  // 3. 上传缺失分片（并发 + 重试 + 进度）
  await uploadChunks(chunks, uploaded, hash, (progress) => {
    updateUploadProgress(progress) // 更新进度条 UI
  })

  // 4. 通知服务端合并
  const result = await mergeChunks(hash, file.name, chunks.length)
  return result.url
}
```

#### 秒传原理

秒传不是魔法，是哈希查询的副产品：上传前先把文件哈希发给服务端，服务端发现该文件已完整存在，直接返回已有的 URL，客户端跳过所有分片上传——**实际上传 0 字节，但用户拿到了完整文件的下载链接**。

这也是为什么哈希必须是文件级别（对整个文件内容做 MD5），而不能只哈希文件名或大小——文件名相同但内容不同的文件会得到不同哈希，不会被错误秒传。

> 💬 **面试官**：大文件上传怎么实现断点续传？如果用户刷新页面还能继续吗？
>
> ✅ **标准答案**：断点续传分四步：① 用 SparkMD5 计算文件哈希（放 Worker 避免阻塞主线程）；② 上传前请求服务端接口查询该哈希已上传了哪些分片索引；③ 只上传缺失的分片，并发 3-5 个，单片失败指数退避重试；④ 全部分片到齐后请求服务端合并。
>
> 刷新页面后，只要文件和分片大小不变，哈希相同，服务端已收到的分片仍然存在，再次上传时 verify 接口还是会返回已上传列表，可以继续从断点恢复。
>
> 🎁 **加分答案**：秒传是断点续传的极端情况——服务端发现文件已完整合并，直接返回 URL，客户端传输 0 字节。服务端合并时要用流式 pipe 而非一次性读入内存，否则 N 个 2MB 分片合成一个文件时会瞬间占用 N×2MB 内存。

---

## 💻 完整代码合集

### debounce + throttle（含 TypeScript 类型）

```typescript
function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  wait: number,
  immediate = false
): ((...args: T) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null
  const debounced = function (this: unknown, ...args: T) {
    if (timer) clearTimeout(timer)
    if (immediate) {
      const callNow = !timer
      timer = setTimeout(() => { timer = null }, wait)
      if (callNow) fn.apply(this, args)
    } else {
      timer = setTimeout(() => { fn.apply(this, args); timer = null }, wait)
    }
  }
  debounced.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }
  return debounced
}
```

```typescript
function throttle<T extends unknown[]>(
  fn: (...args: T) => void,
  wait: number
): (...args: T) => void {
  let previous = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  return function (this: unknown, ...args: T) {
    const now = Date.now()
    const remaining = wait - (now - previous)
    if (remaining <= 0) {
      if (timer) { clearTimeout(timer); timer = null }
      previous = now
      fn.apply(this, args)
    } else if (!timer) {
      timer = setTimeout(() => {
        previous = Date.now()
        timer = null
        fn.apply(this, args)
      }, remaining)
    }
  }
}
```

### 最小虚拟列表组件（固定行高）

```tsx
import { useState, useCallback } from 'react'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
}

function VirtualList<T>({
  items, itemHeight, containerHeight, renderItem
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const overscan = 2
  const totalHeight = items.length * itemHeight
  const visibleCount = Math.ceil(containerHeight / itemHeight)
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(items.length,
    Math.floor(scrollTop / itemHeight) + visibleCount + overscan)
  const offsetY = startIndex * itemHeight
  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => setScrollTop(e.currentTarget.scrollTop), [])

  return (
    <div style={{ height: containerHeight, overflow: 'auto' }} onScroll={onScroll}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* ✅ 用 transform 而非 absolute + top：避免每次 setState 触发重排 */}
        <div style={{ position: 'absolute', top: 0, width: '100%', transform: `translateY(${offsetY}px)` }}>
          {items.slice(startIndex, endIndex).map((item, i) => (
            <div key={startIndex + i} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default VirtualList
```

### useEventListener hook（自动 cleanup）

```typescript
import { useEffect, useRef } from 'react'

function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element: EventTarget = window,
  options?: AddEventListenerOptions
) {
  const savedHandler = useRef(handler)
  useEffect(() => { savedHandler.current = handler }, [handler])
  useEffect(() => {
    if (!element?.addEventListener) return
    const listener = (e: Event) => savedHandler.current(e as WindowEventMap[K])
    element.addEventListener(eventName, listener, options)
    return () => element.removeEventListener(eventName, listener, options)
  }, [eventName, element, options])
}

// 使用示例
function ResizeWatcher() {
  useEventListener('resize', () => {
    console.log('window resized:', window.innerWidth)
  })
  return null
}
```

---

## 📌 知识点速查表

| 知识点 | 一句话解释 | 面试频率 |
|--------|-----------|---------|
| Performance 面板 | Long Task（红色）= 主线程超 50ms；火焰图宽=耗时，深=调用栈 | ⭐⭐⭐⭐ |
| PerformanceObserver | 线上持续监控 Long Task/CLS/INP；buffered:true 拿历史条目；INP 已替代 FID | ⭐⭐⭐⭐ |
| debounce leading 版 | 两条路径互斥：callNow 执行 fn，setTimeout 只重置 timer | ⭐⭐⭐⭐⭐ |
| throttle 合并版 | 首次立即触发，停止后最后一次也触发 | ⭐⭐⭐⭐ |
| ResizeObserver | 监听元素尺寸变化，天然替代 resize+debounce，不限于 window | ⭐⭐⭐ |
| React 里用 debounce | useRef 或 useMemo 保持引用稳定，否则每次渲染新闭包，timer 丢失 | ⭐⭐⭐⭐⭐ |
| Passive Event Listener | `{ passive: true }` 告诉浏览器不 preventDefault，避免滚动阻塞 | ⭐⭐⭐⭐ |
| 强制同步布局 FSL | 读 offsetWidth 等属性强制浏览器立即重排；FastDOM = 先批量读再批量写 | ⭐⭐⭐⭐⭐ |
| transform vs left 动画 | transform 只触发合成（GPU 线程），left 触发重排（主线程） | ⭐⭐⭐⭐⭐ |
| will-change 滥用 | 每个合成层消耗显存，移动端滥用导致 GPU 内存不足反而更卡 | ⭐⭐⭐⭐ |
| rAF vs setTimeout | rAF 与刷新率同步、标签页隐藏自动暂停；setTimeout 不保证 16ms | ⭐⭐⭐⭐⭐ |
| React Scheduler | 用 MessageChannel 实现 5ms 时间切片，比 rIC 粒度更细；scheduler.yield() 提案未来可简化 | ⭐⭐⭐⭐ |
| React DevTools Profiler | 火焰图看渲染耗时，Ranked 排序找最贵组件，"Why did this render?" 找重渲染原因 | ⭐⭐⭐⭐ |
| React.memo 失效 | 新对象引用传入、自身 state 变化、订阅 Context 变化；排查用 wdyr/React Scan | ⭐⭐⭐⭐⭐ |
| 状态下沉 | 把 state 移到真正需要它的组件，比 memo 更根本 | ⭐⭐⭐⭐⭐ |
| useTransition | 标记非紧急更新，让用户输入优先响应 | ⭐⭐⭐⭐ |
| 虚拟列表原理 | startIndex = scrollTop / itemHeight，只渲染可视范围，用 translateY 定位 | ⭐⭐⭐⭐⭐ |
| 事件委托 | 父容器绑一个监听器，用 event.target.closest 判断触发源，减少监听器数量 | ⭐⭐⭐⭐ |
| Web Worker | 纯计算移出主线程；Comlink = Proxy 封装成 RPC；OffscreenCanvas = Worker 中渲染 | ⭐⭐⭐⭐ |
| 内存泄漏来源 | 四大来源：定时器/事件监听器/闭包/WebSocket；Heap Snapshot 对比 + Retainers 树定位 | ⭐⭐⭐⭐⭐ |
| FinalizationRegistry | 对象被 GC 后异步执行清理回调，适合非关键的清理收尾工作 | ⭐⭐⭐ |
| content-visibility | CSS 跳过屏外 Layout+Paint，DOM 仍存在；contain: strict 提供最强隔离 | ⭐⭐⭐ |
| IndexedDB vs Storage | Storage 同步阻塞主线程，大数据用 IndexedDB 异步操作 | ⭐⭐⭐ |

---

## 📝 留个问题

你们项目遇到过哪类运行时性能问题？是 React 重渲染、长列表卡顿、还是内存泄漏？排查过程中有没有踩过特别印象深刻的坑？欢迎在评论区分享。

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

> 🔖 这是「前端性能与监控系列」第 12 篇。上一篇：《网络资源加载优化：HTTP 缓存 + 图片懒加载 + 预测式导航（面试收藏级）》；下一篇预告：《感知性能优化：让「慢」看起来不慢——骨架屏、乐观更新与页面过渡实战（面试收藏级）》

