# 工程构建优化：Tree Shaking 失效原因与 Vite 产物瘦身实战（面试收藏级）

> 「你们项目构建出来的包多大？」面试官随口一问，很多人答不上具体数字。这篇文章从诊断工具开始，把 Tree Shaking 失效的四个根因、Code Split 的三种粒度、Vite 生产调优的全套配置，逐一讲透——每个知识点后面都附上面试怎么答。

---

## 🎯 这篇文章解决什么问题

bundle 体积问题是大多数前端项目性能优化的第一战场，但很多人优化凭感觉、不会量化、遇到 Tree Shaking 失效也不知道从哪查起。

这篇文章给你一套完整的工程化思路：先诊断、再定标准、后逐层优化，最后用 Lighthouse CI 把性能卡点固化进流水线。既讲原理，也讲面试怎么答。

---

## 🔍 问题从哪来：bundle 体积诊断流程

优化的第一步不是改配置，而是**看清楚问题在哪**。没有可视化报告，所有优化都是盲射。

### 三种诊断工具对比

**rollup-plugin-visualizer**（Vite 首选）

安装后在 `vite.config.ts` 中引入，构建完成自动打开一张交互式地图。

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    visualizer({
      open: true,        // 构建后自动打开浏览器
      gzipSize: true,    // 显示 gzip 后体积
      brotliSize: true,  // 显示 brotli 后体积
      filename: 'dist/stats.html',
    }),
  ],
})
```

报告判读要点：**面积 = 体积**，色块越大说明这个模块在最终产物里占的字节越多。颜色区分的是不同 chunk，同色色块属于同一个入口。重点盯两类异常：单个第三方库独占大色块、业务代码里出现了不该出现的模块。

**vite-bundle-analyzer vs source-map-explorer**

| 工具 | 适用场景 | 优势 | 局限 |
|------|---------|------|------|
| `rollup-plugin-visualizer` | Vite / Rollup 项目 | 开箱即用，构建时集成 | 仅 Rollup 生态 |
| `vite-bundle-analyzer` | Vite 项目 | 支持 treemap / sunburst 两种视图 | 需额外安装 |
| `source-map-explorer` | 任意构建产物 | 通用，基于 sourcemap 精确到行 | 需先生成 sourcemap |

大部分 Vite 项目用 `rollup-plugin-visualizer` 就够了。需要精确到具体源码行时，用 `source-map-explorer`：

```bash
# 先构建并开启 sourcemap
vite build --sourcemap

# 分析指定 chunk
npx source-map-explorer dist/assets/*.js
```

### 真实诊断案例

药品详情页上线后首屏加载 4.2s，用 visualizer 一看，发现 `vendor` chunk 里有整个 `lodash`（71KB gzip），而实际只用了 `_.debounce` 一个函数。

根因：`import _ from 'lodash'` 引入了整个库。修复只需换成按需导入：

```javascript
// ❌ 全量引入，Tree Shaking 无效
import _ from 'lodash'

// ✅ 按需引入，或使用 lodash-es
import debounce from 'lodash-es/debounce'
```

这一个改动让 vendor chunk 从 183KB 降到 47KB（gzip）。

> 💬 **面试官**：你们项目怎么分析 bundle 体积？发现问题后怎么定位根因？
>
> ✅ 标准答案：用 `rollup-plugin-visualizer` 生成可视化报告，面积最大的色块就是优先优化对象；定位根因主要看是全量引入第三方库、还是某个模块被意外重复打包。
> 🎁 加分答案：提到 `source-map-explorer` 可以基于 sourcemap 精确到源码行；提到先看 gzip/brotli 后的体积而不是原始体积，因为那才是用户真正下载的字节数。

---

## 📏 体积预算：先定标准，再优化

没有预算就没有终点，优化会陷入「感觉差不多了」的循环。

### LCP 2.5s 倒推网络预算

LCP（最大内容绘制）的优秀阈值是 2.5s。在 4G 网络（约 10Mbps）下，去掉 DNS、TCP、TTFB 约 400ms，留给资源加载的时间约 2s。

```text
可用带宽 ≈ 10Mbps × 2s = 2.5MB（原始）
gzip 压缩后体积约为原始的 30%，因此原始预算 ≈ 750KB
```

按资源类型拆分：

| 资源类型 | 推荐预算（gzip 后） | 说明 |
|---------|------------------|------|
| 首屏 JS | ≤ 170KB | 含框架代码，超出明显影响 TTI |
| 首屏 CSS | ≤ 50KB | 阻塞渲染，越小越好 |
| 首屏图片 | ≤ 200KB | 使用 WebP + 懒加载 |
| 字体 | ≤ 50KB | 子集化裁剪 |

170KB 这个数字来自 HTTP Archive 的中位数研究——大多数真实用户设备在这个阈值内能维持较好的交互响应。

### 在线监测超标资源

预算不只是构建时的静态检查，也应该在运行时持续监测：

```javascript
// 监测首屏超标资源，上报到监控平台
function checkResourceBudget() {
  const entries = performance.getEntriesByType('resource')
  const oversized = entries.filter(entry => {
    // transferSize 是实际传输字节数（含压缩）
    return entry.transferSize > 170 * 1024
  })

  oversized.forEach(entry => {
    console.warn(`超标资源: ${entry.name}, 大小: ${
      (entry.transferSize / 1024).toFixed(1)
    }KB`)
    // 上报到性能监控平台
  })
}

window.addEventListener('load', checkResourceBudget)
```

> 💬 **面试官**：你们项目有没有做性能预算？怎么保证每次上线不超标？
>
> ✅ 标准答案：在构建侧用 `bundlesize` 或 Lighthouse CI 设置阈值，超标阻断 PR 合并；在运行时用 `performance.getEntriesByType('resource')` 监测实际传输大小并上报。
> 🎁 加分答案：提到预算要按资源类型分开设定（JS/CSS/图片），而不是笼统一个总数；提到 `transferSize` 比 `encodedBodySize` 更准确，因为它反映了 HTTP 缓存命中时为 0 的情况。

---

## 🌲 Tree Shaking：为什么没生效

Tree Shaking 是 Rollup 引入、Webpack 跟进的静态死代码消除技术。理论上很美好，但生产项目里失效率极高——面试也是高频考点。

### ESM 静态分析原理

Tree Shaking 能工作，根本前提是 **ESM 的 `import`/`export` 在编译期静态可确定**。

```javascript
// ESM：静态，编译期可分析
import { debounce } from 'lodash-es'  // 明确知道只用了 debounce

// CJS：动态，运行期才知道用了什么
const { debounce } = require('lodash')  // require 可以在 if 里，无法静态分析
```

Rollup（Vite 的构建内核）用**标记-清除（Mark & Sweep）算法**处理 ESM：

- **标记阶段**：从入口文件出发，遍历所有 `import`，标记被实际引用的导出
- **清除阶段**：未被标记的导出及其依赖代码，在产物里直接删除

这个过程在编译期完成，所以 ESM 语法是必要条件。

### 四大失效原因与修复

**原因一：`sideEffects` 字段缺失**

`package.json` 里没有声明 `sideEffects: false`，Rollup 会保守地保留所有模块，不敢删任何东西。

```json
// package.json（自己发布的库或业务包都应加上）
{
  "name": "my-utils",
  "sideEffects": false
}
```

如果包里有些文件确实有副作用（如 CSS 导入、polyfill），精确声明：

```json
{
  "sideEffects": ["*.css", "src/polyfills.js"]
}
```

`vite.config.ts` 中也可以针对第三方包覆盖：

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    // 告知 Vite 这个包是纯 ESM 无副作用
    include: ['lodash-es'],
  },
})
```

**原因二：桶文件（Barrel File）陷阱**

`index.ts` 重导出模式是组件库的标配，但会让 Tree Shaking 退化：

```typescript
// src/components/index.ts（桶文件）
export { Button } from './Button'
export { Modal } from './Modal'
export { DatePicker } from './DatePicker'  // 这个很重，引了 dayjs
```

```typescript
// 业务代码
import { Button } from '@/components'  // 实际只用 Button，但整个 components 都被打包
```

修复方案一：按需导入，绕过桶文件：

```typescript
import { Button } from '@/components/Button'
```

修复方案二：给桶文件所在包声明 `sideEffects: false`，让构建工具敢于删除未用导出。

**原因三：CJS 模块无法被 Shake**

CJS（`require`/`module.exports`）是动态的，`require` 可以出现在 `if` 块、函数里，编译期无法确定哪些导出被用到：

```javascript
// 无法 shake——require 是运行期
const utils = require('./utils')
if (condition) {
  utils.heavyFunction()
}
```

解决方法：优先使用提供 ESM 版本的包。大多数现代库都同时发布 `cjs` 和 `esm` 两个版本，在 `package.json` 里用 `exports` 字段区分：

```json
{
  "exports": {
    "import": "./dist/index.esm.js",
    "require": "./dist/index.cjs.js"
  }
}
```

Vite 会自动优先用 `import` 字段对应的 ESM 版本。

**原因四：带副作用的导入**

有些导入的目的本身就是触发副作用（注册全局、扩展原型），不产生导出。Rollup 不敢删这类导入：

```javascript
import 'reflect-metadata'    // 装饰器 polyfill，有副作用
import './global-styles.css' // CSS 注入，有副作用
```

这类导入放入 `sideEffects` 数组精确声明，让构建工具知道它们必须保留：

```json
{
  "sideEffects": ["reflect-metadata", "**/*.css"]
}
```

> 💬 **面试官**：项目里 Tree Shaking 没生效，你会怎么排查？
>
> ✅ 标准答案：先用 visualizer 确认是哪个模块没被 shake，再按优先级排查：是否用了 CJS 包（换 ESM 版）→ 是否走了桶文件（改直接导入）→ `sideEffects` 字段是否缺失（补上）→ 是否有副作用导入干扰（精确声明）。
> 🎁 加分答案：提到 `sideEffects` 在 `package.json`（库级别）和 `vite.config` 的 `optimizeDeps`（项目级别覆盖）作用域不同；提到可以用 `rollup-plugin-visualizer` 的 `raw` 视图对比 shake 前后的模块列表变化。

🔧 **真实场景**：某医疗电商平台引入了一个内部 UI 组件库，桶文件暴露了 60+ 个组件，但大多数页面只用其中 5 个。优化前 vendor chunk 含整个组件库 340KB（gzip），修复桶文件导入路径 + 补 `sideEffects: false` 后降到 82KB，首屏 JS 体积减少 55%。

---

## ✂️ Code Split：按需加载的三种粒度

Tree Shaking 解决的是「删掉没用的代码」，Code Split 解决的是「把有用的代码按需加载」。两者配合才能把首屏体积压到最低。

### 路由级：React.lazy + Suspense

路由级分割是投入产出比最高的优化——每条路由对应一个独立 chunk，用户访问哪条路由才下载哪个 chunk。

```typescript
// App.tsx — 路由级懒加载
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

const DrugDetail = lazy(() => import('./pages/DrugDetail'))
const Prescription = lazy(() => import('./pages/Prescription'))
const UserProfile = lazy(() => import('./pages/UserProfile'))
```

```tsx
export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/drug/:id" element={<DrugDetail />} />
          <Route path="/prescription" element={<Prescription />} />
          <Route path="/profile" element={<UserProfile />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
```

实测效果：药品电商首页从原先单 bundle 1.2MB（gzip 后 380KB）拆分为首屏 chunk 仅 95KB，其余页面按需加载，首屏 LCP 从 3.8s 降至 1.9s。

### 组件级：重型依赖的动态导入

路由粒度不够细时，单个页面内的重型依赖也要动态导入：

```typescript
// 药品数据可视化页面——ECharts 仅在图表展示时加载
const loadChart = async () => {
  const { default: echarts } = await import('echarts')
  // 👈 chunk 命名：产物文件名可预测，方便 CDN 缓存
  // 等价于 import(/* webpackChunkName: "echarts" */ 'echarts')
  return echarts
}
```

```typescript
// 处方编辑器——Monaco Editor 按需加载
const MonacoEditor = lazy(() =>
  import(
    /* @vite-ignore */
    'monaco-editor'
  ).then(mod => ({ default: mod.editor }))
)
```

Vite 支持 `/* @vite-chunk-name: "echarts" */` 注释来控制 chunk 名称，也可以在 `rollupOptions.output.chunkFileNames` 统一配置命名规则。

预加载 hint 可以提示浏览器在空闲时提前拉取：

```html
<!-- 在路由切换前预加载目标 chunk -->
<link rel="modulepreload" href="/assets/DrugDetail-abc123.js" />
```

React Router v6.4+ 的 `loader` 机制会自动处理预加载，无需手动写 `<link>`。

### vendor 拆分：manualChunks 策略

默认情况下 Vite 会把所有第三方依赖打进一个 `vendor` chunk，导致任何依赖更新都会让用户重新下载整个 vendor。

用 `manualChunks` 按变更频率分组，最大化缓存命中：

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 框架核心——几乎不变，长期缓存
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI 组件库——随版本升级而变
          'vendor-ui': ['antd', '@ant-design/icons'],
          // 工具库——按需维护
          'vendor-utils': ['lodash-es', 'dayjs', 'axios'],
          // 重型依赖——独立 chunk，不影响其他缓存
          'vendor-echarts': ['echarts'],
        },
      },
    },
  },
})
```

`splitVendorChunkPlugin` 是 Vite 内置的启发式策略（heuristic），会把所有来自 `node_modules` 的依赖自动合并进 vendor——适合快速起步，但不如 `manualChunks` 精细：

```typescript
import { splitVendorChunkPlugin } from 'vite'

export default defineConfig({
  plugins: [splitVendorChunkPlugin()],  // 简单场景够用
})
```

> 💬 **面试官**：Code Split 有哪几种粒度？manualChunks 为什么能优化缓存命中率？
>
> ✅ 标准答案：路由级（`React.lazy`）、组件级（动态 `import()`）、vendor 拆分（`manualChunks`）三种粒度。manualChunks 按变更频率分组，框架核心几乎不变所以长期缓存，UI 库升级只让用户重下 vendor-ui 这一个 chunk，不污染其他缓存。
> 🎁 加分答案：提到 `<link rel="modulepreload">` 可以在路由切换前预取目标 chunk，消除切换时的白屏；提到 `manualChunks` 分组过细会增加 HTTP 请求数，需要权衡（HTTP/2 多路复用下影响较小）。

---

## ⚙️ Vite 生产构建调优

Tree Shaking 和 Code Split 处理的是「打什么」，这一章处理的是「怎么打得更小、更快」。

### build.rollupOptions 常用配置速查

```typescript
// vite.config.ts — 生产构建核心配置
export default defineConfig({
  build: {
    target: 'es2015',          // 不降级到 ES5，产物更小
    minify: 'esbuild',         // esbuild 比 terser 快 20x，体积相近
    sourcemap: false,          // 生产关闭，开启会增加构建时间
    cssCodeSplit: true,        // CSS 随 JS chunk 分割，默认开启
    chunkSizeWarningLimit: 500, // 超过 500KB 时告警（单位 KB）
    assetsInlineLimit: 4096,    // 小于 4KB 的资源 base64 内联，减少 HTTP 请求
    rollupOptions: {
      output: {
        // chunk 文件名含 hash，利于长期缓存
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
```

### Brotli 压缩配置

Brotli 比 Gzip 体积小 20-30%，但压缩耗时更长（级别越高越慢）。构建时生成 `.br` 文件，配合 Nginx 直接返回预压缩产物，避免实时压缩的 CPU 开销：

```typescript
// vite.config.ts — 安装 vite-plugin-compression
import compression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      // 级别 4-6 是体积/速度的平衡点；11 是最高但 CI 时间翻倍
      compressionOptions: { level: 6 },
      threshold: 10240,  // 小于 10KB 的文件不压缩
    }),
  ],
})
```

Nginx 配置启用预压缩文件：

```nginx
# nginx.conf
gzip_static on;    # 优先返回 .gz
brotli_static on;  # 优先返回 .br（需要 ngx_brotli 模块）
```

Brotli 压缩级别权衡：

| 级别 | 体积 | CPU 成本 | 推荐场景 |
|------|------|---------|---------|
| 1-3 | 较大 | 低 | 实时压缩（动态内容） |
| 4-6 | 中等 | 中 | CI 构建时预压缩（推荐） |
| 9-11 | 最小 | 极高 | 离线压缩静态资产 |

### CSS 代码分割与 Critical CSS 内联

`cssCodeSplit: true`（默认）让每个 JS chunk 携带自己的 CSS，按需加载。但首屏的关键 CSS 仍然会阻塞渲染。

Critical CSS 方案：把首屏必须的 CSS 内联进 HTML `<style>` 标签，其余 CSS 异步加载：

```typescript
// 使用 vite-plugin-critical 自动提取关键 CSS
import critical from 'vite-plugin-critical'

export default defineConfig({
  plugins: [
    critical({
      criticalUrl: 'http://localhost:4173',  // 预览服务地址
      criticalBase: './dist',
      criticalPages: [{ uri: '/', template: 'index' }],
      criticalConfig: { inline: true, width: 1300, height: 900 },
    }),
  ],
})
```

### CSS 无用代码清除：CSS 的 Tree Shaking

CSS 也有 Tree Shaking 等价操作——静态分析 HTML/JS 里实际用到的 class 名，删除构建产物中未匹配的 CSS 规则。

**Tailwind CSS（JIT 模式，推荐）**

Tailwind v3 默认 JIT 模式，构建时只生成 `content` 路径下实际出现过的 class，未用到的规则不会进入产物：

```javascript
// tailwind.config.js
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',  // 扫描范围，确保覆盖所有模板文件
  ],
  theme: { extend: {} },
  plugins: [],
}
```

JIT 的关键限制：**动态拼接的 class 名无法被静态分析**，需要加入 safelist：

```javascript
// tailwind.config.js — 动态 class 需手动保留
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    'bg-red-500', 'bg-green-500',         // 精确保留
    { pattern: /^text-(sm|base|lg)$/ },   // 正则保留
  ],
}
```

**非 Tailwind 项目（vite-plugin-purgecss）**

```typescript
// vite.config.ts
import { PurgeCSSPlugin } from '@fullhuman/postcss-purgecss'
import postcss from 'postcss'

export default defineConfig({
  css: {
    postcss: {
      plugins: [
        PurgeCSSPlugin({
          content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
          safelist: { standard: [/^active/, /^is-/] },
        }),
      ],
    },
  },
})
```

实测：引入完整 Bootstrap（未 purge 约 190KB gzip）后，仅用了其中 20% 的 class，purge 后产物降至 12KB。

> 💬 **面试官**：CSS Tree Shaking 是怎么实现的？有什么局限？
>
> ✅ 标准答案：静态扫描 HTML/JS 模板中出现的 class 名，删除 CSS 产物中未匹配的规则——Tailwind JIT 在生成阶段做，PurgeCSS 在产物后处理阶段做。局限是动态拼接的 class 名（`bg-${color}`）无法被静态分析，需要手动加入 safelist。
> 🎁 加分答案：提到 CSS Modules 天然没有"无用 CSS"问题，因为每个 class 都是局部的且只在引用它的 JS 组件存在时才打包；提到 Tailwind JIT 相比旧的 purge 模式，是在生成阶段就按需输出，而不是生成全量再删除，性能和准确性都更好。

---

### cacheDir 加速 CI 二次构建

Vite 的依赖预构建结果缓存在 `node_modules/.vite`，CI 环境每次全新安装后缓存丢失。把 `cacheDir` 指向可持久化的目录并加入 CI 缓存策略：

```typescript
// vite.config.ts
export default defineConfig({
  cacheDir: '.vite-cache',  // 改到项目根目录，方便 CI 缓存
})
```

```yaml
# GitHub Actions — 缓存 Vite 预构建产物
- uses: actions/cache@v4
  with:
    path: |
      ~/.pnpm-store
      .vite-cache
    key: ${{ runner.os }}-vite-${{ hashFiles('pnpm-lock.yaml') }}
```

实测：中型项目（80+ 依赖）CI 二次构建从 142s 降至 38s，节省 73%。

---

### define：构建时常量替换与 dead code 消除

`define` 在编译期把全局常量替换为字面量，配合 minifier 的 dead code elimination，可以让整段调试代码在生产产物里彻底消失——比 `esbuild.drop` 更精细可控。

原理对比：

```typescript
// esbuild.drop: ['console'] ——无脑删所有 console，无法保留特定日志
esbuild: { drop: ['console'] }

// define ——让条件分支在编译期确定，minifier 删除 dead branch
define: { '__DEV__': JSON.stringify(false) }
```

实际用法：在业务代码里用 `__DEV__` 包裹调试逻辑：

```typescript
// src/utils/logger.ts
if (__DEV__) {
  console.log('[debug] 药品详情接口响应:', data)
  performance.mark('drug-detail-loaded')
}
```

生产构建时 `define` 把 `__DEV__` 替换为 `false`，代码变成：

```javascript
if (false) { /* ... */ }  // minifier 直接删除整个 dead branch
```

Vite 配置：

```typescript
// vite.config.ts
export default defineConfig(({ mode }) => ({
  define: {
    __DEV__: JSON.stringify(mode !== 'production'),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
}))
```

TypeScript 需要声明全局变量类型，否则编译报错：

```typescript
// src/env.d.ts
declare const __DEV__: boolean
declare const __APP_VERSION__: string
```

> 💬 **面试官**：`define` 和 `esbuild.drop` 去掉 console 有什么区别？
>
> ✅ 标准答案：`drop: ['console']` 是正则匹配删除所有 `console.*` 调用，粒度粗、不可控；`define` 是构建时常量替换，配合条件分支让 minifier 删除整个 dead code 块，可以精确控制哪些代码只在开发环境存在。
> 🎁 加分答案：提到 `define` 可以同时注入版本号、feature flag 等构建时信息，是构建时配置注入的通用方案；提到需要在 `env.d.ts` 里声明类型，否则 TypeScript 编译器不认识这些全局变量。

---

### legacy 浏览器兼容：module/nomodule 双包差异化加载

`build.target: 'es2015'` 让现代浏览器拿到更小的产物，但旧浏览器（iOS 12、Android 5）不支持原生 ESM。`@vitejs/plugin-legacy` 的解法是**输出两套产物**，让浏览器自己选择：

```text
<script type="module">      → 现代浏览器加载，原生 ESM，无 polyfill，体积小
<script nomodule>           → 旧浏览器加载，Babel 转译 + core-js polyfill，ES5 兼容
```

现代浏览器会忽略 `nomodule` 脚本，旧浏览器不识别 `type="module"` 所以忽略 module 脚本——两类浏览器各取所需，互不干扰。

配置：

```typescript
// vite.config.ts
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11'],  // browserslist 语法
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
    }),
  ],
})
```

构建产物会多出 `-legacy` 后缀的 chunk 和一个 `polyfills-legacy` chunk，只有旧浏览器才会下载它们。现代浏览器的加载体积与不加 plugin-legacy 完全相同。

`targets` 遵循 browserslist 语法，与 `package.json` 里的 `browserslist` 字段保持一致能减少维护成本：

```json
{
  "browserslist": ["defaults", "not IE 11", "not op_mini all"]
}
```

> 💬 **面试官**：怎么在支持旧浏览器的同时不增加现代浏览器的包体积？
>
> ✅ 标准答案：用 `@vitejs/plugin-legacy` 输出 module/nomodule 双包。`type="module"` 的 chunk 是现代 ESM 产物，无 polyfill；`nomodule` 的 chunk 是 Babel 降级 + core-js polyfill 的 ES5 产物。浏览器根据是否支持 ES module 自动选择，互不干扰。
> 🎁 加分答案：提到现代浏览器的包体积与不加 plugin-legacy 完全一致，旧浏览器才有额外下载成本；提到 `targets` 用 browserslist 语法，可以和 PostCSS autoprefixer 共享同一份 `.browserslistrc` 文件，避免维护两处配置。

---

> 💬 **面试官**：Vite 和 Webpack 在生产构建优化上主要差异是什么？
>
> ✅ 标准答案：Vite 底层用 Rollup 打包，天然支持 ESM Tree Shaking；Webpack 需要额外配置 `usedExports` 和 `sideEffects`。Vite 用 esbuild 做 minify，速度快 20 倍。依赖预构建（`optimizeDeps`）是 Vite 独有的，把 CJS 转成 ESM 并合并小依赖，减少开发时的请求数。
> 🎁 加分答案：提到 Vite 的 `build.target` 默认 `modules`（支持原生 ESM 的浏览器），不做 ES5 降级，产物比 Webpack 默认配置小；提到 Webpack 5 的 Module Federation 是 Vite 目前没有内置的能力。

---

## ⚡ 构建速度优化：让 CI 从 5 分钟到 1 分钟

产物体积决定用户体验，构建速度决定开发效率。两者是同一枚硬币的两面——前面几章解决了「打出来的包有多小」，这一章解决「打包本身要多久」。

### Scope Hoisting：比 Tree Shaking 更激进的体积压缩

Tree Shaking 删掉未引用的模块，Scope Hoisting 则把**被引用的模块也合并进调用方**——消除模块间的闭包包装，同时减少函数调用栈和作用域查找开销。

没有 Scope Hoisting 时，每个模块被包裹在独立的 IIFE 里：

```javascript
// 产物（未 Scope Hoisting）
(function(module, exports) {
  exports.add = function(a, b) { return a + b }
})(module, exports)

(function(module, exports, require) {
  var math = require('./math')
  console.log(math.add(1, 2))
})(module, exports, require)
```

Scope Hoisting 后，Rollup 直接把 `add` 函数提升进调用方：

```javascript
// 产物（Scope Hoisting 后）
function add(a, b) { return a + b }
console.log(add(1, 2))
```

Rollup（Vite 的打包内核）**默认开启** Scope Hoisting，条件是模块只被引用一次。被多处引用的模块不会被 inline，避免代码膨胀。Webpack 需要显式配置：

```javascript
// webpack.config.js — 需要手动开启
module.exports = {
  optimization: {
    concatenateModules: true, // 👈 即 Scope Hoisting
  },
}
```

> 💬 **面试官**：Scope Hoisting 和 Tree Shaking 有什么区别？
>
> ✅ 标准答案：Tree Shaking 删除未引用的导出；Scope Hoisting 把单次引用的模块内联到调用处，消除 IIFE 包装和闭包开销，让产物更小、运行更快。
> 🎁 加分答案：Scope Hoisting 要求 ESM 静态结构，CJS 模块无法被 inline；Rollup 默认开启，Webpack 需要 `optimization.concatenateModules: true`。

---

### HMR 为什么越来越慢：barrel file 的双重伤害

barrel file（`index.ts` 重导出模式）在 Tree Shaking 章节已经出现过一次——它会让构建工具打包多余代码。但它还有另一个伤害：**让 HMR（热模块替换）变慢**。

原因：Vite 的 HMR 沿模块依赖图向上传播变更。桶文件把所有组件汇聚到同一个 `index.ts`，任何一个子模块改动，都要从 `index.ts` 重新向上传播，触发整个依赖链的重新处理：

```text
修改 Button.tsx
  → 触发 components/index.ts 更新（桶文件）
    → 触发所有导入了 components/index.ts 的页面更新
      → 实际上只改了一个 Button，却热更新了整个应用
```

**诊断方法**：在 Vite 开发服务器控制台观察 HMR 日志，如果改动一个文件却看到大量模块被 invalidated，通常就是桶文件导致的。

**修复策略：**

```typescript
// ❌ 桶文件：所有模块通过 index.ts 汇聚
import { Button, Modal, Table } from '@/components'

// ✅ 直接导入：HMR 只更新实际改动的模块
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
```

如果项目规模大、桶文件难以全部改掉，可以在 `vite.config.ts` 配置 `server.warmup` 预热关键模块，减少首次 HMR 的冷启动耗时：

```typescript
export default defineConfig({
  server: {
    warmup: {
      clientFiles: ['./src/components/index.ts'], // 启动时预热桶文件
    },
  },
})
```

> 💬 **面试官**：本地开发 HMR 越来越慢，如何排查？
>
> ✅ 标准答案：先看 Vite 控制台 HMR 日志，观察每次改动 invalidated 的模块数量。数量异常多通常是桶文件导致依赖链过长；其次检查是否有循环依赖，可用 `vite-plugin-circular-dependency` 检测。
> 🎁 加分答案：提到 `server.warmup` 预热高频模块；提到大型项目可以考虑拆包，把不常改的基础模块放到单独的 workspace package，彻底隔离 HMR 传播边界。

---

### externals + CDN 分离：把大依赖彻底踢出 bundle

有些依赖体积巨大但版本极少变动（`moment`、`echarts`、`react`、`react-dom`），与其每次都打进 bundle，不如通过 CDN 加载——浏览器直接命中 CDN 缓存，bundle 体积立减。

这对应 webpack 的 `IgnorePlugin`（忽略无用子模块）+ `externals`（外部化依赖）两种思路，在 Vite 中：

**方案一：rollup externals + CDN script**

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['react', 'react-dom', 'echarts'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          echarts: 'echarts',
        },
      },
    },
  },
})
```

```html
<!-- index.html — 通过 CDN 加载，利用跨站缓存 -->
<script src="https://cdn.example.com/react@18/umd/react.production.min.js"></script>
<script src="https://cdn.example.com/react-dom@18/umd/react-dom.production.min.js"></script>
```

**方案二：vite-plugin-externals（更简洁）**

```typescript
import { viteExternalsPlugin } from 'vite-plugin-externals'

export default defineConfig({
  plugins: [
    viteExternalsPlugin({
      react: 'React',
      'react-dom': 'ReactDOM',
    }),
  ],
})
```

**方案三：moment locale 裁剪（对应 webpack IgnorePlugin）**

`moment` 自带 160+ 国际化语言包，全量打包约 500KB，但大多数项目只需要 `zh-cn`：

```typescript
// vite.config.ts — 用 rollup-plugin-node-resolve 的 exclude 裁剪
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      // moment 场景更推荐直接换 dayjs（3KB vs 300KB）
      external: (id) => id.startsWith('moment/locale/') && !id.includes('zh-cn'),
    },
  },
})
```

> 💬 **面试官**：项目里 moment 体积很大，怎么处理？
>
> ✅ 标准答案：首选换 `dayjs`，API 兼容，体积只有 3KB vs moment 的 300KB。如果必须用 moment，通过 externals 外部化并用 CDN 加载，或者用 rollup 的 external 函数裁掉不需要的 locale。
> 🎁 加分答案：提到 `date-fns` 是另一个选择，它天然支持 Tree Shaking，按需引入哪个函数就打包哪个函数；提到 externals 策略在有 CDN 跨站缓存的场景收益最大，内网部署项目效果有限。

---

### optimizeDeps 预构建：Vite 版的 DllPlugin

webpack 的 DllPlugin 思路是：把不常变的第三方依赖**预先编译**成一个 dll 文件，后续构建直接引用，跳过重复编译。Vite 的 `optimizeDeps`（依赖预构建）本质上是同一个思路，但**完全自动化**，不需要手动维护 dll 列表。

Vite 在首次启动时用 **esbuild** 扫描所有依赖并预构建，做了三件事：

```text
1. CJS → ESM 转换：让所有依赖统一走 ESM，支持 Tree Shaking
2. 合并细碎模块：把 lodash-es 的 600+ 小文件合并成 1 个，
   避免浏览器发出 600 个 HTTP 请求
3. 缓存到 node_modules/.vite：锁定版本，下次启动秒开
```

手动干预预构建：

```typescript
export default defineConfig({
  optimizeDeps: {
    // 强制预构建（默认不预构建的包，如动态 import 的包）
    include: ['lodash-es', 'date-fns', '@tanstack/react-query'],
    // 排除预构建（已经是 ESM 且不需要转换的包）
    exclude: ['your-local-esm-package'],
  },
})
```

`include` 的典型场景：动态 `import()` 的包 Vite 默认不预构建，首次加载会慢；手动 include 后提前处理好。

> 💬 **面试官**：Vite 的依赖预构建解决了什么问题？和 webpack DllPlugin 有什么区别？
>
> ✅ 标准答案：解决两个问题——把 CJS 包转成 ESM（让 Tree Shaking 生效），把细碎的 ESM 包合并（减少 HTTP 请求数）。和 DllPlugin 的区别是：DllPlugin 需要手动配置并单独跑一次构建；Vite 预构建完全自动，锁定在 `node_modules/.vite`，依赖变化自动失效重建。
> 🎁 加分答案：提到可以通过 `optimizeDeps.include` 把动态 import 的包也纳入预构建，避免首次访问时的瀑布请求；提到 `cacheDir` 配合 CI 缓存可以把预构建结果跨 CI 复用。

---

### esbuild 多线程 vs Rollup 单线程：Vite 快在哪

webpack 通过 `thread-loader` / `HappyPack` 把 loader 任务分配到 worker 线程实现并行构建。Vite 在开发和构建两个阶段用了截然不同的策略：

**开发阶段**：用 esbuild 做按需转译（不打包），esbuild 用 Go 编写，原生多线程，转译速度比 Babel 快 **20-100 倍**。

**生产阶段**：用 Rollup 打包，Rollup 是 JavaScript 单线程，这是 Vite 在大型项目上构建慢的根本原因。

| 工具 | 语言 | 多线程 | 适用阶段 | 速度 |
|------|------|--------|---------|------|
| esbuild | Go | ✅ 原生多线程 | 开发转译 + minify | 极快 |
| Rollup | JavaScript | ❌ 单线程 | 生产打包 | 中等 |
| Rspack | Rust | ✅ 原生多线程 | 开发+生产全程 | 快 |
| SWC | Rust | ✅ 原生多线程 | 替换 Babel | 快 |

在 Vite 项目中可以把 minify 换成 esbuild（已是默认值），把 TypeScript 转译也交给 esbuild：

```typescript
export default defineConfig({
  build: {
    minify: 'esbuild',     // 默认值，比 terser 快 20x
  },
  esbuild: {
    target: 'es2015',      // 转译目标，不做 ES5 降级，产物更小
    drop: ['console', 'debugger'], // 生产去掉 console，比 terser 插件更快
  },
})
```

大型项目（模块数 > 3000）Rollup 成为瓶颈时的选型路径：

```text
Vite（Rollup 瓶颈）
  → 先试 Rolldown（Rust 重写的 Rollup，Vite 6 的未来内核，API 兼容）
  → 或迁移 Rspack（Webpack 兼容层，迁移成本低，构建提速 5-10x）
```

🔧 **真实场景**：某医疗电商中台项目，3200 个模块，Vite 生产构建 4m20s。迁移 Rspack 后同等配置构建降至 48s，CI 流水线等待时间缩短 80%，开发者每天节省约 30 分钟等待时间。

> 💬 **面试官**：Vite 开发时很快，但生产构建慢，为什么？怎么解决？
>
> ✅ 标准答案：开发时用 esbuild 按需转译（Go 多线程，不打包），生产用 Rollup 打完整 bundle（JS 单线程），这是 Vite 开发快、构建慢的根本原因。解决方案：模块数不多时用 `esbuild` minify + 优化 manualChunks；模块数超过 3000 考虑迁移 Rspack。
> 🎁 加分答案：提到 Rolldown（Vite 团队用 Rust 重写的 Rollup）是未来方向，Vite 6 会切换到 Rolldown 作为生产打包内核，届时 Vite 开发和生产都会是 Rust 速度；提到 esbuild 的 `drop` 选项比 terser 插件去 console 更快。

---

## 🚦 Lighthouse CI 接入

手动跑 Lighthouse 只能一次性检测。把它接入 CI，让每个 PR 都自动跑一遍，超预算直接阻断合并——这才是把性能卡点固化进工程的正确姿势。

### lighthouserc.json 断言语法

先在项目根目录创建配置文件：

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:4173/", "http://localhost:4173/drug/1"],
      "startServerCommand": "pnpm preview",
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "first-contentful-paint": ["warn", { "maxNumericValue": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "uses-optimized-images": ["warn", {}],
        "total-byte-weight": ["error", { "maxNumericValue": 512000 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

断言级别说明：
- `warn`：超标时输出警告，**不阻断** PR 合并
- `error`：超标时标记 CI 失败，**阻断** PR 合并

### GitHub Actions 配置

```yaml
# .github/workflows/lighthouse-ci.yml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]

jobs:
  lhci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - run: pnpm build

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli@0.14.x
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

`LHCI_GITHUB_APP_TOKEN` 是 Lighthouse CI GitHub App 的 token，安装 App 后在仓库 Settings > Secrets 里配置，用于在 PR 页面展示性能分数对比。

### 历史基准对比

`upload.target: "temporary-public-storage"` 会把报告上传到 Google 的临时存储，每次 PR 都能看到与上次的分数对比。团队自建 LHCI Server 可以保留完整历史记录：

```yaml
# docker-compose.yml — 自建 LHCI Server
services:
  lhci-server:
    image: patrickhulce/lhci-server
    ports:
      - '9001:9001'
    volumes:
      - lhci-data:/data
```

> 💬 **面试官**：怎么在 CI 里做性能卡点，确保每次上线不会性能劣化？
>
> ✅ 标准答案：用 Lighthouse CI 在每个 PR 自动跑性能测试，在 `lighthouserc.json` 里用 `error` 级别断言 LCP/TBT/CLS 阈值，超标时 CI 失败阻断合并。
> 🎁 加分答案：提到 `numberOfRuns: 3` 取中位数，避免单次结果的噪音；提到可以针对不同页面（首页、详情页）分别设置不同阈值；提到结合 `bundlesize` 或 `size-limit` 在 build 阶段就卡住体积，比运行时 Lighthouse 更早发现问题。

---

## 🛠️ 构建工具横评：性能视角一张表

2024-2026 年构建工具格局已发生变化——Vite 不再是唯一选择，Rspack 和 Turbopack 已经进入生产可用阶段。

### 四工具对比

| 维度 | Vite 5 | Rspack 1.x | Turbopack | Rolldown（预览） |
|------|--------|-----------|-----------|----------------|
| 底层语言 | Go（esbuild）+ JS（Rollup） | Rust | Rust | Rust |
| 冷启动（1000模块） | ~800ms | ~200ms | ~150ms | ~180ms |
| HMR | ~50ms | ~30ms | ~20ms | ~25ms |
| 产物体积 | 小（Rollup 优化好） | 中（接近 Webpack） | 中 | 小（对标 Rollup） |
| Webpack 兼容 | ❌ | ✅（大部分 loader/plugin） | ❌ | ❌ |
| 生态成熟度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐（Next.js 绑定） | ⭐⭐（开发中） |
| 适用场景 | 中小型项目，新项目首选 | 大型 Webpack 迁移 | Next.js 项目 | 未来 Vite 底层 |

### Rspack：Rust 增量编译与 Webpack 兼容层原理

Rspack 的核心优势来自两个设计：

**增量编译**：Rust 的所有权模型让并行编译不需要锁，模块依赖图的变更计算用增量算法，只重新构建受影响的模块树，而不是全量重扫描。

**Webpack 兼容层**：Rspack 实现了大部分 Webpack 的 `loader` 和 `plugin` API，`babel-loader`、`css-loader`、`less-loader` 可以直接复用，迁移成本远低于切换到 Vite。

```javascript
// rspack.config.js — 几乎和 webpack.config.js 一样
module.exports = {
  entry: './src/index.ts',
  module: {
    rules: [
      { test: /\.tsx?$/, use: 'builtin:swc-loader' }, // 内置 SWC，无需安装
      { test: /\.css$/, use: ['style-loader', 'css-loader'] }, // 沿用 webpack loader
    ],
  },
}
```

### 迁移决策矩阵

| 场景 | 推荐方案 | 理由 |
|------|---------|------|
| 新项目，React/Vue | Vite | 生态最成熟，开箱即用 |
| 老 Webpack 项目，模块数 > 2000 | Rspack | 兼容 loader/plugin，迁移成本低，构建提速 5-10x |
| Next.js 项目 | Turbopack（Next 15 默认） | 官方集成，无需额外配置 |
| 追求最小产物体积 | Vite + Rollup | Rollup 的 Tree Shaking 仍是最激进的 |

> 💬 **面试官**：大型项目用 Vite 有什么问题？什么时候该考虑迁移 Rspack？
>
> ✅ 标准答案：Vite 开发时是 unbundled（基于原生 ESM），模块数超过 2000 时浏览器请求数爆炸，HMR 也会变慢。生产构建用 Rollup，速度不如 Rspack。模块数超过 2000、或 CI 构建超过 5 分钟时，可以考虑迁移 Rspack。
> 🎁 加分答案：提到 Rspack 的 Webpack 兼容层让迁移成本很低，通常一两天就能完成；提到 Rolldown 是 Vite 团队用 Rust 重写的 Rollup，未来会作为 Vite 6 的打包内核，届时 Vite 的构建速度会大幅提升。

---

## 📦 完整代码

### vite.config.ts 生产优化模板

完整配置按功能分段展示，实际使用时合并为单个文件。

**基础构建配置：**

```typescript
// vite.config.ts — Part 1: 基础配置
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import compression from 'vite-plugin-compression'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // 仅分析模式下开启可视化
    mode === 'analyze' && visualizer({ open: true, gzipSize: true }),
    // 生产构建生成 .br 文件
    compression({ algorithm: 'brotliCompress', ext: '.br', level: 6 }),
  ].filter(Boolean),
```

**构建产物配置：**

```typescript
  // vite.config.ts — Part 2: build 配置
  build: {
    target: 'es2015',
    minify: 'esbuild',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['antd', '@ant-design/icons'],
          'vendor-utils': ['lodash-es', 'dayjs', 'axios'],
        },
      },
    },
  },
```

**缓存与优化配置：**

```typescript
  // vite.config.ts — Part 3: 缓存与依赖优化
  cacheDir: '.vite-cache',
  optimizeDeps: {
    include: ['react', 'react-dom', 'lodash-es'],
  },
}))
```

`package.json` 中添加分析命令：

```json
{
  "scripts": {
    "build": "vite build",
    "build:analyze": "cross-env MODE=analyze vite build"
  }
}
```

### CI 性能卡点 workflow（完整版）

```yaml
# .github/workflows/perf-check.yml
name: Performance Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      # 检查 bundle 体积，超限直接失败
      - name: Check bundle size
        run: npx bundlesize
```

```yaml
  lighthouse:
    runs-on: ubuntu-latest
    needs: bundle-size
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli@0.14.x
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

`bundlesize` 配置（`package.json`）：

```json
{
  "bundlesize": [
    { "path": "./dist/assets/index-*.js", "maxSize": "170 kB" },
    { "path": "./dist/assets/vendor-react-*.js", "maxSize": "150 kB" },
    { "path": "./dist/assets/*.css", "maxSize": "50 kB" }
  ]
}
```

---

## 💡 一张图总结（面试速记）

| 知识点 | 一句话解释 | 面试频率 |
|--------|-----------|---------|
| rollup-plugin-visualizer | 构建产物可视化，面积=体积，找大色块 | ⭐⭐⭐⭐ |
| 体积预算 | 首屏 JS ≤ 170KB（gzip），LCP 2.5s 倒推 | ⭐⭐⭐ |
| Tree Shaking 原理 | ESM 静态分析 + Mark&Sweep，编译期删除未引用导出 | ⭐⭐⭐⭐⭐ |
| sideEffects 字段 | package.json 声明无副作用，让构建工具敢于删除 | ⭐⭐⭐⭐⭐ |
| 桶文件失效 | index.ts 重导出导致整包被打入 + HMR 传播链变长 | ⭐⭐⭐⭐ |
| Scope Hoisting | 单次引用模块 inline 到调用处，消除 IIFE 闭包开销 | ⭐⭐⭐⭐ |
| React.lazy 路由分割 | 每条路由独立 chunk，用户访问时才下载 | ⭐⭐⭐⭐⭐ |
| manualChunks | 按变更频率拆 vendor，最大化 CDN 缓存命中 | ⭐⭐⭐⭐ |
| Brotli 压缩 | 比 Gzip 小 20-30%，级别 4-6 是 CI 最佳平衡点 | ⭐⭐⭐⭐ |
| cacheDir | 持久化 Vite 预构建缓存，CI 二次构建提速 70%+ | ⭐⭐⭐ |
| optimizeDeps 预构建 | CJS→ESM 转换 + 合并细碎模块，Vite 版自动化 DllPlugin | ⭐⭐⭐⭐ |
| externals + CDN | 大依赖外部化，利用 CDN 跨站缓存，bundle 体积立减 | ⭐⭐⭐⭐ |
| esbuild vs Rollup | 开发用 Go 多线程 esbuild，生产用 JS 单线程 Rollup | ⭐⭐⭐⭐⭐ |
| Rspack | Rust 写的 Webpack 兼容构建工具，大型项目迁移首选 | ⭐⭐⭐⭐ |
| Lighthouse CI | GitHub Actions 跑 Lighthouse，error 级断言阻断 PR | ⭐⭐⭐⭐ |
| assetsInlineLimit | 小于 4KB 的资源自动 base64 内联，减少 HTTP 请求但增大 bundle | ⭐⭐⭐ |
| CSS purge（Tailwind JIT） | 静态分析 class 名，删除未使用 CSS 规则，动态 class 需加 safelist | ⭐⭐⭐⭐ |
| define + dead code 消除 | 构建时常量替换，让 if(__DEV__) 整块被 minifier 删除，比 drop 更精细 | ⭐⭐⭐⭐ |
| plugin-legacy module/nomodule | 双包差异化加载，旧浏览器走 ES5+polyfill，现代浏览器零额外成本 | ⭐⭐⭐⭐⭐ |

---

## 📝 留个问题

你的项目里 Tree Shaking 有没有遇到过失效的情况？是什么原因导致的，最后怎么解决的？欢迎在评论区分享你的案例。

---

## 参考

- 搜索关键词：web.dev Core Web Vitals
- 搜索关键词：web.dev RAIL 性能模型
- 搜索关键词：web.dev rendering performance
- 搜索关键词：web.dev learn performance
- 搜索关键词：MDN Web Performance
- 搜索关键词：berwin Blog 浏览器渲染原理
- 搜索关键词：GoogleChromeLabs quicklink 预加载
- 搜索关键词：Rollup Tree Shaking 官方文档
- 搜索关键词：Vite build.rollupOptions 官方文档
- 搜索关键词：Rspack 官方文档 Webpack 兼容层

---

> 🔖 这是「前端性能与监控系列」第 10 篇。上一篇：《渲染范式全景：从 CSR 到 PPR 的九种渲染范式》；下一篇预告：《微前端架构实战》

