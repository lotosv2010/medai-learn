# 架构层优化：从 CSR 到 PPR，九种渲染范式怎么选（面试收藏级）

> 面试官问「你们的页面用什么渲染方式」，你说「React」。
> 沉默两秒后，面试官说：「好的，下一题。」
>
> 渲染范式不是框架，是架构决策。选错了，Lighthouse 跑再多、bundle 压再小，LCP 该差还是差。

---

## 🎯 这篇文章解决什么问题

CSR、SSR、SSG、ISR、RSC、PPR——这些缩写在招聘 JD 和面试里高频出现，但很多人只会背概念，答不出「为什么」「什么场景选哪个」「Next.js 里怎么落地」。

这篇文章覆盖 **9 种渲染范式**，每个范式按同一主线由浅入深：**是什么 → 核心原理 → 如何决策及什么场景选 → 手写实现 → 生产级最佳实践 → 完整代码**。读完不仅理解原理，更能当场写出关键代码。文末附 SPA / MPA / PWA 与渲染范式的辨析，防止面试被追问时混淆概念。

---

## 🐌 为什么选错渲染范式，优化再多也白搭

### 一个真实对比

同一个药品列表页，两种实现方案，在 4G 网络下的 LCP 差距：

```text
CSR 方案的瀑布图：
0ms    ├── 请求 HTML（返回空 <div id="root">）
180ms  ├── 下载 React bundle（gzip 后 ~140KB）
380ms  ├── 执行 JS，ReactDOM.render
420ms  ├── 发出 /api/drugs 请求
780ms  └── 数据回来，渲染列表 → LCP = 780ms
```

```text
SSR 方案的瀑布图：
0ms    ├── 请求 HTML
120ms  └── 服务端已含数据的完整 HTML 返回 → LCP = 120ms
           （后续 JS 加载用于水合，不影响 LCP）
```

**LCP 差距：780ms vs 120ms，缩短 85%。** 这不是优化出来的，是架构决定的。

### 渲染范式是「出生决定」

性能优化有两个层次：

- **出生决定**：首字节什么时候到，关键内容什么时候可见——这由渲染范式决定
- **后天弥补**：代码分割、懒加载、缓存策略、图片优化——这是运行时优化

后天弥补有天花板。一个 CSR 应用无论压缩多彻底，LCP 永远不可能在 JS 执行前出现。

> 💬 **面试官**：你怎么理解 CSR 和 SSR 对性能的影响？
>
> ✅ 标准答案：CSR 的 LCP 依赖 JS 下载和执行，通常在 600-1200ms；SSR 直接返回含数据的 HTML，LCP 随 TTFB 走，通常在 100-300ms。核心差距在于「关键数据什么时候发出请求」。
> 🎁 加分答案：提到 CSR 对 SEO 不友好（爬虫看到的是空 HTML），以及 SSR 的 TTFB 会受服务端数据库查询耗时影响，所以 SSR 不是万能的。

---

## ⚙️ 范式逐个拆解

每种范式按同一主线展开：**是什么 → 核心原理 → 如何决策 → 手写实现 → 生产级最佳实践 → 完整代码**，从概念到落地一气呵成。文末有完整的面试速记表。

九种范式一览：CSR → SSR → SSG → ISR → RSC → Streaming SSR → PPR → DPR → Edge SSR。

### CSR（客户端渲染）：首屏白屏的根本原因

▸ 是什么

CSR（Client-Side Rendering）是 React/Vue SPA 的默认模式。服务端只返回一个空壳 HTML，真正的内容完全由浏览器端 JS 生成。典型代表：Create React App、Vite SPA 模板。

▸ 核心原理

浏览器的 4 步串行等待：

```html
<!-- 第 1 步：请求 /，服务端返回空壳 -->
<html>
  <body>
    <div id="root"></div>
    <script src="/bundle.js"></script>
  </body>
</html>
```

```text
第 2 步：下载 bundle.js（网络等待）
第 3 步：解析 + 执行 JS，调用 createRoot(...).render(<App />)
第 4 步：App 内部发 fetch /api/xxx 请求数据，拿到后才渲染内容
```

白屏的根本原因：JS 下载（网络）+ 解析执行（CPU）+ 数据请求（网络）三次串行等待，任何一环慢都直接影响 LCP。

▸ 如何决策及什么场景选

- ✅ 后台管理系统、内部工具（无 SEO 需求，用户已登录）
- ✅ 富交互的单页应用（在线 Excel、设计工具）
- ✅ 部署简单是首要考量（纯静态文件，扔 CDN 即可）
- ❌ 需要 SEO 的 C 端页面（电商、内容平台）
- ❌ 首屏性能敏感的场景（移动端弱网）

▸ 手写实现（关键代码）

```javascript
// main.jsx — CSR 入口，浏览器执行
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')).render(<App />)
```

```jsx
// App.jsx — 组件内部发起数据请求
import { useState, useEffect } from 'react'

export default function App() {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetch('/api/drugs').then(r => r.json()).then(setData)
  }, [])
  if (!data) return <p>加载中...</p>
  return <ul>{data.map(d => <li key={d.id}>{d.name}</li>)}</ul>
}
```

注意关键问题：数据请求发生在 `useEffect` 中，此时 JS 已下载并执行完毕，HTML 已渲染——用户看到的第一个东西是「加载中...」，而不是内容。这就是 CSR LCP 慢的根本原因。

▸ 生产级最佳实践

1. **代码分割**：`React.lazy(() => import('./HeavyPage'))`，首屏只加载必需 JS
2. **预请求数据**：`<link rel="prefetch">` 或 `<link rel="modulepreload">` 提前拉数据
3. **骨架屏**：在 JS 执行期间用骨架撑起页面布局，改善感知性能
4. **预渲染关键页面**：对首页、落地页单独做 prerender，兼顾 CSR 灵活性和首屏速度

▸ 完整最佳实践代码

```javascript
// vite.config.js — 代码分割 + 压缩配置
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
  },
})
```

```jsx
// App.jsx — 路由级代码分割 + Suspense
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

const HomePage = lazy(() => import('./pages/Home'))
const DrugPage = lazy(() => import('./pages/Drug'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/drug/:id" element={<DrugPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
```

> 💬 **面试官**：CSR 为什么首屏慢？怎么优化？
>
> ✅ 标准答案：CSR 首屏要经历「下载 JS → 执行 → 发数据请求 → 渲染」四个串行步骤，LCP 在最后一步才出现。优化方向：减小 bundle 体积（代码分割）、预请求数据（prefetch）、骨架屏改善感知性能。
> 🎁 加分答案：根本解法是换范式——用 SSR 把「数据请求」移到服务端，让 HTML 带数据返回，彻底消除客户端等待。

---

### SSR（服务端渲染）：服务端直出 HTML + 水合

▸ 是什么

SSR（Server-Side Rendering）在服务端执行 React 渲染，生成含完整数据的 HTML 字符串直接返回给浏览器。用户看到的第一屏就是带内容的数据，而不是空白页面。然后在客户端进行**水合（Hydration）**——认领已有 DOM、绑定事件，让页面变得可交互。

▸ 核心原理

服务端用 `renderToString` 将 React 组件渲染为 HTML 字符串，注入初始数据后返回。浏览器收到完整 HTML 后 LCP 随 TTFB 出现。接着客户端 JS 加载，调用 `hydrateRoot`（不是 `createRoot`）认领已有 DOM 节点——不重建 DOM，只遍历组件树做校验并绑定事件。

**Hydration Mismatch** 是 SSR 最常见的坑：服务端和客户端渲染结果不一致时，React 会抛出警告并重新渲染，性能反而更差。

常见原因：

- 使用了 `Date.now()` 或 `Math.random()`（服务端和客户端值不同）
- 判断了 `window` / `localStorage` 等仅客户端存在的 API
- 时区不一致导致日期格式化结果不同

```javascript
// ❌ 触发 Mismatch：服务端没有 window
const isClient = typeof window !== 'undefined'
return <div>{isClient ? '客户端' : '服务端'}</div>

// ✅ 用 useEffect 处理客户端专有逻辑
const [isClient, setIsClient] = useState(false)
useEffect(() => setIsClient(true), [])
return <div>{isClient ? '客户端内容' : null}</div>
```

▸ 如何决策及什么场景选

- ✅ 需要 SEO 的 C 端页面（电商详情、资讯文章、药品说明书）
- ✅ 首屏性能敏感（移动端弱网、4G 用户）
- ✅ 内容个性化强（每个用户看到的数据不同）
- ❌ 不需要 SEO 的内部后台系统（CSR 更简单）
- ❌ 纯静态内容（SSG 性能更好、成本更低）

▸ 手写实现（关键代码）

用最少的代码说清 SSR 的本质：服务端 `renderToString` → 客户端 `hydrateRoot`。

```javascript
// server.js — 服务端渲染入口
import express from 'express'
import { renderToString } from 'react-dom/server'
import { App } from './App.jsx'

express()
  .get('/', async (req, res) => {
    const data = await fetchDrugList()
    const html = renderToString(<App data={data} />)
    res.send(`<!DOCTYPE html>
<html><body><div id="root">${html}</div>
<script>window.__INITIAL_DATA__ = ${JSON.stringify(data)}</script>
<script src="/client.js" defer></script>
</body></html>`)
  })
  .listen(3000)
```

```javascript
// client.js — 客户端水合入口
import { hydrateRoot } from 'react-dom/client'
import { App } from './App.jsx'

const data = window.__INITIAL_DATA__
hydrateRoot(document.getElementById('root'), <App data={data} />)
```

```jsx
// App.jsx — 服务端和客户端共用
import { useState } from 'react'

export function App({ data }) {
  const [filter, setFilter] = useState('')
  const filtered = data.filter(d => d.name.includes(filter))
  return (
    <div>
      <input value={filter} onChange={e => setFilter(e.target.value)} />
      <ul>{filtered.map(d => <li key={d.id}>{d.name}</li>)}</ul>
    </div>
  )
}
```

关键点：`App` 在服务端运行时 `useState` 初始值正常工作，但 `onChange` 不会绑定（没有 DOM）。Hydration 之后客户端 React 接管，事件才开始生效。

▸ 生产级最佳实践

1. **Selective Hydration**（React 18）：`<Suspense>` 包裹的非关键区域延迟水合，用户点击时优先水合该区域，改善 TTI
2. **数据注入最小化**：`window.__INITIAL_DATA__` 只放当前页必要数据，不要把所有 store 都灌进去
3. **防止 Hydration Mismatch**：耗时差异用 `useEffect` 包裹，客户端 API 用 `useEffect` 判断
4. **TTFB 监控**：服务端渲染耗时直接影响 TTFB，对 DB 查询加超时（建议 5s），慢接口异步降级

▸ 完整最佳实践代码

```typescript
// app/drugs/[id]/page.tsx — Next.js App Router SSR
import { db } from '@/lib/db'
import { DrugDetail } from './DrugDetail'

export default async function DrugPage({ params }: { params: { id: string } }) {
  const drug = await db.query.drugs.findFirst({
    where: (drugs, { eq }) => eq(drugs.id, params.id),
  })
  if (!drug) return <NotFound />
  return <DrugDetail drug={drug} />
}
```

```typescript
// app/drugs/[id]/DrugDetail.tsx — Client Component（需要交互）
'use client'
import { useState } from 'react'

export function DrugDetail({ drug }: { drug: Drug }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <article>
      <h1>{drug.name}</h1>
      <p>{expanded ? drug.description : drug.summary}</p>
      <button onClick={() => setExpanded(!expanded)}>
        {expanded ? '收起' : '展开'}
      </button>
    </article>
  )
}
```

> 💬 **面试官**：什么是 Hydration？为什么有成本？
>
> ✅ 标准答案：Hydration 是 SSR 页面加载 JS 后，React 认领服务端 DOM 并绑定事件的过程。不重建 DOM，但需要遍历组件树做校验，有 CPU 开销，期间页面不可交互。
> 🎁 加分答案：Selective Hydration（React 18）——`<Suspense>` 包裹的区域延迟水合，用户点击某区域时优先水合该区域，改善 TTI。

---

### SSG（静态站点生成）：构建时渲染，零运行时成本

▸ 是什么

SSG（Static Site Generation）在构建阶段（`next build`）把所有页面渲染成静态 HTML 文件。请求到来时直接返回文件，TTFB 极低，可由 CDN 全量缓存，无需 Node 服务器——本质上就是纯静态资源。

▸ 核心原理

`next build` 时执行页面组件的 async 函数（包括数据库查询和 API 调用），将结果渲染为 HTML 写入磁盘。`generateStaticParams` 声明所有需要预生成的路径：

```typescript
// app/drugs/[id]/page.tsx
export async function generateStaticParams() {
  const drugs = await fetchAllDrugs()
  return drugs.map(d => ({ id: d.id }))  // 构建时生成每个药品页
}

export default async function DrugPage({ params }) {
  const drug = await fetchDrug(params.id)  // 构建时执行，不是运行时
  return <DrugDetail drug={drug} />
}
```

构建完成后的 `out/` 目录就是纯静态文件，可以直接部署到 CDN。

▸ 如何决策及什么场景选

- ✅ 内容极少变化的页面——博客文章、帮助文档、营销落地页
- ✅ 药品说明书（内容由监管审批，可能几个月才更新一次）
- ✅ 对 TTFB 零容忍的场景（用户即搜即看）
- ❌ 内容更新频繁的页面（每次更新都要重新构建和部署）
- ❌ 页面数量极大（10 万+），全量构建耗时长
- ❌ 内容强个性化的页面（每个用户看到的不同）

▸ 手写实现（关键代码）

```typescript
// app/blog/[slug]/page.tsx — 博客文章 SSG
export async function generateStaticParams() {
  const posts = await fetchPosts()
  return posts.map(p => ({ slug: p.slug }))
}

export default async function BlogPage({ params }: { params: { slug: string } }) {
  const post = await fetchPost(params.slug)
  return <article><h1>{post.title}</h1><div>{post.content}</div></article>
}
```

▸ 生产级最佳实践

1. **增量构建**：页面太多时不要全量，先构建热门页面，其余用 ISR fallback
2. **构建缓存**：CI 中持久化 `.next/cache`，加速二次构建
3. **`dynamicParams = false`**：未在 `generateStaticParams` 中声明的路径返回 404，防止意外动态渲染
4. **CDN 缓存头**：对静态 HTML 设置 `Cache-Control: public, max-age=31536000, immutable`

▸ 完整最佳实践代码

```typescript
// app/drugs/[id]/page.tsx — 药品说明书 SSG 完整版
import type { Metadata } from 'next'

export const dynamicParams = false  // 只生成 generateStaticParams 中的路径

export async function generateStaticParams() {
  const drugs = await fetchAllDrugIds()
  return drugs.map(id => ({ id }))
}

export async function generateMetadata({ params }): Promise<Metadata> {
  const drug = await fetchDrugBase(params.id)
  return { title: `${drug.name} - 药品说明书` }
}

export default async function DrugPage({ params }: { params: { id: string } }) {
  const drug = await fetchDrugFull(params.id)
  return <article><h1>{drug.name}</h1><DrugContent data={drug} /></article>
}
```

> 💬 **面试官**：SSG 适合什么场景？有什么缺点？
>
> ✅ 标准答案：SSG 适合内容不频繁变化的页面，TTFB 最低，可 CDN 全量缓存。缺点是内容更新需要重新构建部署，不适合实时性要求高的场景。
> 🎁 加分答案：ISR 解决了这个问题，大型站点可用 `dynamicParams = false` 配合 on-demand revalidation 精准更新。

---

### ISR（增量静态再生成）：stale-while-revalidate 的工程落地

▸ 是什么

ISR（Incremental Static Regeneration）是 SSG 的升级版，解决「内容更新必须全量重建」的痛点。页面在运行时按时间窗口自动重新生成，用户始终拿到已缓存的版本（最多稍旧几秒）。

▸ 核心原理

ISR 的机制和 HTTP 缓存的 `stale-while-revalidate` 完全一致：

```text
第一次请求：返回缓存的静态 HTML（stale），同时触发后台重新生成
后台生成完成后：新 HTML 替换旧缓存
第二次请求：返回新生成的 HTML（fresh）
```

配置方式：

```typescript
// app/drugs/[id]/page.tsx
export const revalidate = 3600  // 每小时后台重新生成一次

// 页面首次请求后，.next 下存储 HTML 缓存
// 超过 3600s 后的下一次请求触发后台重新生成
```

也支持按需触发，精准控制：

```typescript
// 当药品数据更新时，精准触发对应页面重新生成
import { revalidatePath, revalidateTag } from 'next/cache'

// 方式 1：按路径精准失效
revalidatePath(`/drugs/${drugId}`)

// 方式 2：按标签批量失效
revalidateTag('drugs')
```

▸ 如何决策及什么场景选

- ✅ 电商详情页、新闻资讯——内容有更新但不是实时，用旧数据服务很短时间可接受
- ✅ 药品列表 + 搜索结果——用户对秒级延迟不敏感
- ✅ 页面数量多但每次只需更新少量页面的场景
- ❌ 需要实时数据的页面（股价、库存——用 SSR）
- ❌ 用户个性化内容（购物车、订单——用 SSR）

▸ 手写实现（关键代码）

```typescript
// app/news/[slug]/page.tsx
export const revalidate = 300 // 5 分钟窗口

export default async function NewsPage({ params }: { params: { slug: string } }) {
  const article = await fetchArticle(params.slug)
  return <ArticleView data={article} />
}
```

```typescript
// app/api/revalidate/route.ts — on-demand 触发
import { revalidatePath } from 'next/cache'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const { slug } = await req.json()
  revalidatePath(`/news/${slug}`)
  return Response.json({ revalidated: true })
}
```

▸ 生产级最佳实践

1. **合理设置 revalidate 窗口**：高频内容 60-300s，低频内容 3600-86400s
2. **避免重新生成风暴**：热页面的 revalidate 时间错开（加随机偏移 `revalidate = 300 + Math.floor(Math.random() * 60)`）
3. **监控后台生成失败**：生成失败时继续服务旧缓存，但要有告警
4. **on-demand > 时间窗口**：CMS 更新时触发 `revalidatePath`，而非等时间窗口到期

▸ 完整最佳实践代码

```typescript
// app/products/[id]/page.tsx — 电商详情 ISR 完整版
export const revalidate = 300

export async function generateStaticParams() {
  const topProducts = await fetchTopProductIds(1000)  // 预生成 Top 1000
  return topProducts.map(id => ({ id }))
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await fetchProduct(params.id)
  return <ProductDetail product={product} />
}
```

```typescript
// app/api/cms-webhook/route.ts — CMS 更新时精准触发
import { revalidatePath, revalidateTag } from 'next/cache'

export async function POST(req: Request) {
  const { productId, type } = await req.json()
  if (type === 'single') revalidatePath(`/products/${productId}`)
  if (type === 'batch') revalidateTag('products')
  return Response.json({ revalidated: true })
}
```

> 💬 **面试官**：ISR 和 SSG 的区别？
>
> ✅ 标准答案：SSG 构建时一次性生成，更新需重新部署；ISR 在运行时增量更新，到期后后台重新生成，用户始终拿到已缓存的页面（最多是稍旧的数据）。
> 🎁 加分答案：ISR 本质是 stale-while-revalidate 缓存策略的服务端实现，和 HTTP `Cache-Control: stale-while-revalidate` 是同一个思想。on-demand revalidation 是更精细的控制手段。

---

### RSC（React 服务端组件）：不参与水合，zero bundle 的实现

▸ 是什么

RSC（React Server Components）是 React 18+ 引入的组件级渲染模型，默认所有组件在服务端运行、不发送 JS 到客户端、不参与水合。只有显式标记 `'use client'` 的组件才进入客户端 bundle。

▸ 核心原理

RSC 的核心是**组件级别的服务端/客户端边界**：

- **Server Component**（默认）：代码在服务端执行，可直接查询数据库和文件系统，产物是对组件树的描述（RSC Payload），**不增加客户端 JS 体积**
- **Client Component**（`'use client'`）：在服务端预渲染 HTML + 客户端水合绑定事件，行为与传统 SSR 组件一致

**RSC Payload** 不是 HTML，也不是普通 JS，而是一种 JSON-like 的组件树描述格式（React Flight 协议）。客户端运行时解析此 Payload，将 Server Component 的输出合并到 DOM，无需下载任何额外 JS。

**zero bundle 的实现**：一个读取数据库的 Server Component，它依赖的 `drizzle-orm`、数据库驱动等包完全不进入客户端 bundle。只有 `'use client'` 标记的组件才会被打包。

▸ 如何决策及什么场景选

- ✅ 数据库直连查询、读取文件系统（服务端天然优势）
- ✅ 重依赖组件（语法高亮、图表渲染）、仅服务端使用
- ✅ 需要减少客户端 JS 体积的大型应用
- ❌ 需要交互状态（`useState`、`useEffect`、事件处理）——必须用 Client Component
- ❌ 使用仅浏览器 API（`window`、`localStorage`）——标记为 Client Component

▸ 手写实现（关键代码）

```typescript
// DrugInfo.tsx — Server Component（默认），代码不进入客户端
import { db } from '@/lib/db'
import { eq } from 'drizzle-orm'

export default async function DrugInfo({ id }: { id: string }) {
  const drug = await db.query.drugs.findFirst({ where: eq(drugs, id) })
  return <div>{drug.name}</div>  // drizzle-orm 零体积进入客户端
}
```

```typescript
// AddToCart.tsx — Client Component（需要交互）
'use client'
import { useState } from 'react'

export default function AddToCart({ drugId }: { drugId: string }) {
  const [added, setAdded] = useState(false)
  return <button onClick={() => setAdded(true)}>加入购物车</button>
}
```

▸ 生产级最佳实践

1. **Server Component 放叶子位置**：交互组件下移到叶节点，中间层保持 Server Component 做数据获取
2. **Client Component 放树边缘**：将 `'use client'` 边界尽量靠近需要交互的点
3. **避免大 Client Boundary**：一个 `'use client'` 导入的所有子组件都变成了客户端代码
4. **用 RSC 替代 getServerSideProps**：直接用 `async` 组件从服务端获取数据，不需要 `getServerSideProps`

▸ 完整最佳实践代码

```typescript
// app/drugs/[id]/page.tsx — 混合 Server/Client 页面
import { Suspense } from 'react'
import DrugInfo from './DrugInfo'      // Server Component（默认）
import AddToCart from './AddToCart'    // Client Component（'use client'）
import { DrugInfoSkeleton } from './Skeletons'

export default async function DrugPage({ params }: { params: { id: string } }) {
  return (
    <main>
      <Suspense fallback={<DrugInfoSkeleton />}>
        <DrugInfo id={params.id} />
      </Suspense>
      <AddToCart drugId={params.id} />
    </main>
  )
}
```

> 💬 **面试官**：RSC 和 SSR 有什么区别？
>
> ✅ 标准答案：SSR 是整个页面在服务端渲染后水合；RSC 是组件级别的划分，Server Component 永远不水合、不发 JS，Client Component 行为与传统 SSR 一致。两者可以混用。
> 🎁 加分答案：RSC 解决了 SSR 的「水合全量」问题——只有真正需要交互的组件才进入客户端。RSC 也是 React 生态对 Islands Architecture 思路的实现。Next.js App Router 默认所有组件都是 Server Component。

---

### Streaming SSR（流式服务端渲染）：让首字节更早到达

▸ 是什么

Streaming SSR 是对传统 SSR 的升级。传统 `renderToString` 必须等所有数据查询完成后才返回完整 HTML，其中某个慢接口（如推荐系统 800ms）会拖慢整个页面的 TTFB。Streaming SSR 先返回已就绪的部分，慢的部分异步补充。

▸ 核心原理

底层是 **HTTP chunked transfer encoding**：服务端可以多次写入 Response，浏览器边收边渲染。React 通过 `renderToPipeableStream` 替代 `renderToString`，配合 `<Suspense>` 划定分块边界——fallback 先作为占位内容 flush，真实内容就绪后以独立 chunk 推送。

```javascript
import { renderToPipeableStream } from 'react-dom/server'

const { pipe } = renderToPipeableStream(<App />, {
  onShellReady() {
    // shell（Suspense 之外的内容）就绪，立即开始流式输出
    res.setHeader('Content-Type', 'text/html')
    pipe(res)  // 👈 pipe 到 Response，不等待完整字符串
  },
})
```

`renderToString` 同步阻塞；`renderToPipeableStream` 在 shell 就绪即推流，Suspense 内容异步补充。

**Next.js `loading.tsx` 的本质**：框架自动用该文件的内容包裹 `<Suspense fallback={<Loading />}>`，让路由级数据获取自动获得流式输出能力。

```text
app/drugs/[id]/
├── page.tsx      ← 真实内容
└── loading.tsx   ← 自动成为该 page 的 Suspense fallback
```

▸ 如何决策及什么场景选

- ✅ 页面包含慢接口（推荐系统、复杂报表查询）
- ✅ 需要快速展示首屏框架（header + 骨架），让用户先看到东西
- ✅ 内容区块之间互相独立（不同数据源，不相互阻塞）
- ❌ 所有数据都很快返回（普通 SSR 更简单）
- ❌ 不需要渐进渲染的简单页面

▸ 手写实现（关键代码）

```typescript
// app/drugs/[id]/page.tsx — Suspense 分块
import { Suspense } from 'react'
import DrugHeader from './DrugHeader'
import { RecommendList } from './RecommendList'
import { RecommendSkeleton } from './Skeletons'

export default function DrugPage({ params }) {
  return (
    <div>
      <DrugHeader id={params.id} />   {/* 静态部分，立即渲染 flush */}
      <Suspense fallback={<RecommendSkeleton />}>
        <RecommendList id={params.id} />  {/* 慢接口，异步 stream */}
      </Suspense>
    </div>
  )
}
```

用户感知：第一个 chunk（DrugHeader + 骨架屏）几乎即时出现，推荐系统数据就绪后第二个 chunk 替换骨架。

▸ 生产级最佳实践

1. **细粒度 Suspense**：不要整个页面包在一个 Suspense 里，独立数据块各自 Suspense
2. **合理的 fallback**：骨架屏比 spinner 更好（减少 CLS），占位尺寸与实际内容一致
3. **streaming 超时控制**：给流式组件设置超时，超时后展示降级 UI
4. **HTTP/2 必需**：chunked encoding 在 HTTP/1.1 下受连接数限制

▸ 完整最佳实践代码

```typescript
// app/drugs/[id]/page.tsx — 多 Suspense 流式页面
import { Suspense } from 'react'

export default function DrugPage({ params }: { params: { id: string } }) {
  return (
    <main>
      <DrugHeader id={params.id} />           {/* 立即 flush */}
      <Suspense fallback={<InfoSkeleton />}>
        <DrugInfo id={params.id} />           {/* 第 1 个数据块 */}
      </Suspense>
      <Suspense fallback={<ReviewSkeleton />}>
        <DrugReviews drugId={params.id} />    {/* 第 2 个数据块 */}
      </Suspense>
      <Suspense fallback={<RecommendSkeleton />}>
        <RecommendList drugId={params.id} />  {/* 第 3 个数据块 */}
      </Suspense>
    </main>
  )
}
```

> 💬 **面试官**：Streaming SSR 和普通 SSR 有什么区别？
>
> ✅ 标准答案：普通 SSR 用 `renderToString`，必须等所有数据就绪才返回 HTML，慢接口拖慢全页 TTFB；Streaming SSR 用 `renderToPipeableStream`，shell 就绪后立即推流，慢的部分用 Suspense 占位、异步补充。
> 🎁 加分答案：底层是 HTTP chunked transfer encoding，服务端可多次写入 Response，浏览器边收边渲染。Next.js `loading.tsx` 就是框架自动插入的路由级 Suspense。

---

### PPR（部分预渲染）：静态外壳 + 动态孔洞的最优解

▸ 是什么

PPR（Partial Prerendering）是 Next.js 15 引入的渲染模式，在同一页面同时获得 SSG 的极低 TTFB 和 SSR 的动态能力。一句话：**构建时预渲染静态部分（CDN 缓存），请求时流式填充动态部分（运行时生成）。**

▸ 核心原理

```text
构建时（next build）：
┌─────────────────────────────────────┐
│  静态外壳（Header、导航、SEO 元数据）  │ ← 预渲染为静态 HTML
│  ┌─────────────────────────────────┐ │
│  │  动态孔洞（用户购物车、推荐列表）  │ │ ← 占位符（Suspense fallback）
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘

请求时：
1. 立即返回静态外壳（来自 CDN 缓存，TTFB ~20ms）
2. 同时在服务端并行获取动态数据
3. 数据就绪后通过 Streaming 填充孔洞
```

- vs SSG：动态内容无需全量重建
- vs SSR：静态部分走 CDN，TTFB 极低
- vs Streaming SSR：静态部分已预渲染好，不是运行时生成

**`unstable_noStore()`** 告诉 Next.js 该函数结果不能缓存，每次请求重新执行，对应组件被排除在静态预渲染外成为动态孔洞。`connection()` 语义更清晰——显式声明「此组件需要运行时的网络连接」：

```typescript
import { connection } from 'next/server'

async function PersonalRecommend() {
  await connection()   // 👈 显式声明：需要运行时请求
  const recs = await fetchRecommendations()
  return <RecommendList items={recs} />
}
```

**dynamicIO** 是 Next.js 15 的另一个实验性配置，启用后所有 `fetch` 和数据库查询**默认不缓存**，需显式用 `cache()` 包裹才会缓存——与旧版默认缓存的行为相反，更符合直觉。

▸ 如何决策及什么场景选

- ✅ 混合页面（静态 header + 动态推荐/购物车）——PPR 的最理想场景
- ✅ 运营活动页（静态框架 + 动态库存/价格）
- ✅ C 端电商/媒体主站（SEO 框架稳定，用户内容动态）
- ❌ 全页面都是动态内容（每个用户完全不同）——直接用 SSR
- ❌ 全页面都是静态内容——直接用 SSG，更简单
- ❌ 生产环境可接受实验性 API 的风险（Next.js 15 PPR 仍标记 experimental）

▸ 手写实现（关键代码）

```javascript
// next.config.js
module.exports = { experimental: { ppr: true } }
```

```typescript
// app/page.tsx — 静态 Header + 动态推荐
import { Suspense } from 'react'
import { StaticHeader } from './StaticHeader'
import { DynamicRecommend } from './DynamicRecommend'

export default function HomePage() {
  return (
    <main>
      <StaticHeader />           {/* 构建时预渲染，CDN 缓存 */}
      <Suspense fallback={<RecommendSkeleton />}>
        <DynamicRecommend />     {/* 运行时流式填充 */}
      </Suspense>
    </main>
  )
}
```

```typescript
// app/StaticHeader.tsx — 静态组件，参与预渲染
export async function StaticHeader() {
  const config = await fetchSiteConfig()   // 构建时执行
  return <header><h1>{config.siteName}</h1></header>
}
```

```typescript
// app/DynamicRecommend.tsx — 动态组件，运行时生成
import { unstable_noStore } from 'next/cache'

export async function DynamicRecommend() {
  unstable_noStore()                         // 👈 退出静态预渲染
  const recs = await fetchPersonalRecs()     // 每次请求重新获取
  return <ul>{recs.map(r => <li key={r.id}>{r.name}</li>)}</ul>
}
```

▸ 生产级最佳实践

1. **精确静态边界**：尽量多的内容参与预渲染，`unstable_noStore()` 只标记真正动态的区域
2. **Suspense 粒度**：按动态数据的独立程度拆分，互不阻塞
3. **静态部分版本化**：`StaticHeader` 引用的 `config` 有变更时重新构建部署
4. **关注 stable 化时间线**：PPR 目前是实验性，关注 Next.js 官方 stable 公告

▸ 完整最佳实践代码

```typescript
// app/drugs/[id]/page.tsx — PPR 完整页面
import { Suspense } from 'react'
import { unstable_noStore } from 'next/cache'
import { cache } from 'react'

// 静态：药品基本信息（构建时）
async function DrugHeader({ id }: { id: string }) {
  const drug = await fetchDrug(id)
  return <header><h1>{drug.name}</h1><p>{drug.summary}</p></header>
}

// 动态：用户购物车状态（运行时）
async function UserCart() {
  unstable_noStore()
  const cart = await fetchCart()
  return <CartWidget items={cart} />
}

// 动态：个性化推荐（运行时）
async function RelatedDrugs({ id }: { id: string }) {
  unstable_noStore()
  const related = await fetchRelated(id)
  return <DrugCardList drugs={related} />
}

export default function DrugPage({ params }: { params: { id: string } }) {
  return (
    <main>
      <DrugHeader id={params.id} />
      <Suspense fallback={<CartSkeleton />}>
        <UserCart />
      </Suspense>
      <Suspense fallback={<CardListSkeleton />}>
        <RelatedDrugs id={params.id} />
      </Suspense>
    </main>
  )
}
```

> 💬 **面试官**：PPR 和 Streaming SSR 有什么区别？
>
> ✅ 标准答案：Streaming SSR 是请求时服务端流式渲染，静态部分也是运行时生成；PPR 是构建时预渲染静态外壳（可 CDN 缓存），请求时只处理动态孔洞，TTFB 更低。
> 🎁 加分答案：PPR = SSG 的 TTFB + SSR 的动态能力 + Streaming 的渐进体验，是目前在 Next.js 中最优的混合渲染方案，但仍是实验性 API。

---

### DPR（动态局部渲染）：选择性按需渲染，静态部分一律不动

▸ 是什么

DPR（Dynamic Partial Rendering）是一种**架构模式**：将页面按「静态 / 动态」维度拆分，静态部分由缓存或预渲染直接服务，动态部分在每次请求时按需渲染——而不是整页 SSR。

与 PPR 的区别：PPR 是 Next.js 构建时预渲染完整静态外壳并存 CDN、运行时流式填充动态孔洞；DPR 更侧重「选择性动态渲染」的架构决策，可通过路由分段缓存控制、Client Component 异步加载、并行路由等**稳定 API 组合**实现，不依赖实验性特性。

▸ 核心原理

DPR 的本质是**渲染粒度的精细控制**：

```text
传统 SSR：整页动态渲染（即使 80% 的内容是静态的）

DPR 思路：
├── 静态部分（导航、页脚、商品描述）→ 预渲染 / CDN 缓存
└── 动态部分（用户状态、实时价格、个性化推荐）→ 请求时渲染
```

在 Next.js 中，DPR 通过以下机制落地：

1. **路由分段级缓存控制**：`export const dynamic = 'force-dynamic' | 'force-static'`
2. **fetch 粒度缓存**：`cache: 'no-store'`（动态）vs `next: { revalidate: N }`（静态）
3. **Client Component 异步补数据**：静态 HTML 先到浏览器，动态内容客户端异步填充
4. **并行路由（Parallel Routes）**：`@slot` 机制让侧边栏和主内容各自独立缓存和渲染

```typescript
// 路由分段缓存控制——三种模式
export const dynamic = 'force-dynamic'  // 整段每次请求重新渲染
export const dynamic = 'force-static'   // 整段强制静态
// 默认 'auto'：Next.js 根据代码自动推断（有 cookies/headers 调用则变动态）
```

DPR vs PPR 对比：

| | PPR | DPR |
|---|---|---|
| 静态外壳 | 构建时预渲染，CDN 缓存 | 不依赖统一的预渲染外壳 |
| 动态部分 | Suspense 孔洞 + 流式填充 | 客户端获取 / 独立 API / 并行路由等多种手段 |
| Next.js 支持 | 实验性（`experimental.ppr: true`） | 稳定特性组合，可立即用于生产 |
| 适用场景 | 边界清晰的静态外壳 + 动态孔洞 | 需要更细粒度控制的复杂页面 |

▸ 如何决策及什么场景选

- ✅ 大型混合页面（大部分静态 + 少量用户特定动态内容）
- ✅ 仪表盘、个人主页（静态骨架 + 动态数据卡片）
- ✅ 商品详情页（静态商品描述 + 动态价格 / 库存 / 购物车状态）
- ✅ PPR 尚未 stable 时的生产替代方案
- ❌ 全页面强动态（每个用户每次都完全不同）——直接用 SSR
- ❌ 全页面静态——直接用 SSG，更简单

▸ 手写实现（关键代码）

```typescript
// app/products/[id]/page.tsx — 静态商品信息 + 动态价格/库存
import { Suspense } from 'react'

async function ProductInfo({ id }: { id: string }) {
  const product = await fetch(`/api/products/${id}`, {
    next: { revalidate: 3600 },   // 静态缓存 1 小时
  }).then(r => r.json())
  return <ProductDescription product={product} />
}

async function ProductPrice({ id }: { id: string }) {
  const price = await fetch(`/api/products/${id}/price`, {
    cache: 'no-store',            // 动态，每次请求重新获取
  }).then(r => r.json())
  return <PriceWidget data={price} />
}

export default function ProductPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <ProductInfo id={params.id} />           {/* 缓存命中，几乎不耗时 */}
      <Suspense fallback={<PriceSkeleton />}>
        <ProductPrice id={params.id} />        {/* 动态获取，不阻塞上方静态内容 */}
      </Suspense>
    </div>
  )
}
```

注意：一个路由段内只要有 `cache: 'no-store'` 或 `cookies()` / `headers()` 调用，整个段就会变成动态渲染。用 `<Suspense>` 把动态组件隔离，防止"动态传染"扩散到静态部分。

▸ 生产级最佳实践

1. **显式标注缓存策略**：每个 fetch 调用明确写 `cache: 'no-store'` 或 `next: { revalidate: N }`，不依赖隐式推断
2. **动态组件提取独立文件**：避免动态依赖"污染"整个路由段，用 Suspense 隔离边界
3. **并行路由做真正独立**：`@sidebar` 和 `@main` 各自独立缓存，互不影响
4. **监控动态段比例**：用 `next build` 输出的 `○ / λ` 标记确认哪些路由是静态、哪些是动态

▸ 完整最佳实践代码

```typescript
// app/dashboard/layout.tsx — 并行路由：静态侧边栏 + 动态主内容
export default function DashboardLayout({
  children,
  sidebar,
}: {
  children: React.ReactNode
  sidebar: React.ReactNode
}) {
  return (
    <div className="flex">
      <aside>{sidebar}</aside>   {/* @sidebar 独立缓存 */}
      <main>{children}</main>    {/* 主内容独立动态渲染 */}
    </div>
  )
}
```

```typescript
// app/dashboard/@sidebar/page.tsx — 静态侧边栏，每天更新一次
export const revalidate = 86400

export default async function Sidebar() {
  const navItems = await fetchNavItems()
  return <SidebarNav items={navItems} />
}
```

```typescript
// app/dashboard/page.tsx — 动态主内容，每次请求重新渲染
export const dynamic = 'force-dynamic'

export default async function DashboardMain() {
  const [stats, alerts] = await Promise.all([
    fetchUserStats(),
    fetchAlerts(),
  ])
  return (
    <div>
      <StatsGrid data={stats} />
      <AlertPanel alerts={alerts} />
    </div>
  )
}
```

> 💬 **面试官**：DPR 和 PPR 有什么区别？
>
> ✅ 标准答案：PPR 是 Next.js 15 的实验性特性，构建时预渲染完整静态外壳存入 CDN，运行时流式填充动态孔洞；DPR 是一种架构模式，通过路由分段缓存控制、fetch 粒度配置、并行路由等稳定 API 组合实现「静态部分不动，动态部分按需渲染」。
> 🎁 加分答案：两者思想同源——只渲染真正需要动态更新的部分。PPR stable 后会是 DPR 思想的最优工程实现；在此之前，DPR 的稳定 API 组合是生产可用的替代路径。

▸ 是什么

Edge SSR 将 SSR 的执行位置从集中式 Node.js 服务器迁移到 CDN 的边缘节点（PoP，Point of Presence）。用户请求被路由到物理距离最近的边缘节点处理，大幅缩短 TTFB。

▸ 核心原理

传统 SSR 的问题：假设服务器部署在上海，新疆用户请求的 TTFB 可能 200ms+（纯网络延迟）。Edge SSR 在全球数百个 CDN 节点上运行轻量级 JS 运行时（不是完整 Node.js），用户请求到最近节点的 RTT 通常只有 10-30ms。

```text
传统 SSR：  用户（乌鲁木齐）── 200ms RTT ──→ 服务器（上海）
Edge SSR：  用户（乌鲁木齐）── 15ms RTT ──→ CDN 边缘节点（乌鲁木齐 PoP）
```

边缘运行时（如 Vercel Edge Runtime、Cloudflare Workers）基于 V8 Isolates 或 WinterCG 兼容运行时，不支持 Node.js 原生模块（`fs`、`crypto`、`net`），数据库连接需走 HTTP 代理或边缘友好驱动。

▸ 如何决策及什么场景选

- ✅ 全球用户分布广的应用，TTFB 差异明显
- ✅ 内容可在有限 API 支持下完成渲染（轻量页面、API 代理）
- ✅ 对 TTFB 极其敏感的场景（秒杀、实时竞价）
- ❌ 依赖 Node.js 原生模块（`fs`、`child_process`、TCP socket）
- ❌ 需要长连接或 Websocket（边缘节点不太适合）
- ❌ 团队不熟悉边缘平台（引入额外的运维和调试复杂度）

▸ 手写实现（关键代码）

```typescript
// app/api/edge-example/route.ts — Vercel Edge Runtime
export const runtime = 'edge'  // 👈 指定在边缘节点执行

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const city = searchParams.get('city') || '上海'
  // 边缘节点就近查询外部 API
  const res = await fetch(`https://api.example.com/weather?city=${city}`)
  const data = await res.json()
  return Response.json({ city, weather: data })
}
```

▸ 生产级最佳实践

1. **分层策略**：静态内容走 CDN + SSG，轻量动态内容走 Edge SSR，重计算内容走传统 SSR
2. **避免 Node.js 依赖**：检查 `export const runtime = 'edge'` 的页面是否引用了 `fs`、`path`、`crypto` 等模块
3. **数据库使用 HTTP 代理**：Neon、PlanetScale 提供 HTTP 接口，兼容 Edge Runtime
4. **切换粒度**：可按页面/路由级别混合使用 Edge 和 Node.js Runtime，不必全局统一
5. **监控边缘冷启动**：V8 Isolates 冷启动一般 < 50ms，但仍需关注

▸ 完整最佳实践代码

```typescript
// app/page.tsx — 整个页面在 Edge Runtime 运行
export const runtime = 'edge'

export default async function HomePage() {
  // 并行请求多个 API，Edge 节点就近访问
  const [config, banners, hotDrugs] = await Promise.all([
    fetch('https://api.example.com/config').then(r => r.json()),
    fetch('https://api.example.com/banners').then(r => r.json()),
    fetch('https://api.example.com/hot-drugs').then(r => r.json()),
  ])
  return (
    <main>
      <Header config={config} />
      <BannerCarousel items={banners} />
      <DrugList drugs={hotDrugs} />
    </main>
  )
}
```

```typescript
// app/layout.tsx — Layout 也可以指定 runtime
export const runtime = 'edge'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <GlobalNav />    {/* 全局导航也在边缘渲染 */}
        {children}
      </body>
    </html>
  )
}
```

> 💬 **面试官**：Edge SSR 和传统 SSR 有什么区别？什么时候用？
>
> ✅ 标准答案：传统 SSR 在集中式 Node 服务器上执行，全球用户的 TTFB 受物理距离影响大（200ms+）；Edge SSR 在 CDN 边缘节点执行，TTFB 通常 30-50ms。核心取舍是延迟 vs Node.js 全功能 API 支持。
> 🎁 加分答案：Edge Runtime 基于 V8 Isolates 而非完整 Node.js，不能用 fs/child_process 等原生模块，数据库需走 HTTP 代理。最佳策略是分层——静态走 CDN、轻量动态走 Edge、重计算走传统 SSR。

---

## 🗺️ 选型决策树

不同业务场景的最优选择：

| 场景 | 推荐范式 | 核心理由 |
| --- | --- | --- |
| 博客 / 帮助文档 / 药品说明书 | SSG | 内容稳定，CDN 全量缓存，首字节最低 |
| 电商详情页 / 新闻资讯 | ISR 或 PPR | 内容有更新但不是实时；ISR 简单，PPR 性能更优 |
| 用户个性化页面（购物车、订单） | SSR 或 RSC + Client | 每次请求数据不同，必须运行时获取 |
| 后台管理系统 | CSR | 不需要 SEO，用户已登录，首屏速度不是核心指标 |
| 混合页面（静态头部 + 动态内容） | PPR（实验性）/ DPR（稳定） | 静态部分 CDN，动态部分流式或按需，两全其美 |
| 数据库直连、重计算组件 | RSC | 零客户端 JS，服务端直接查库，适合数据密集型展示 |
| 慢接口页面（推荐、报表查询） | Streaming SSR | 骨架先 flush，慢数据异步填充，TTFB 不受慢接口拖累 |
| 全球用户、TTFB 极致敏感 | Edge SSR | 就近渲染，TTFB 降低 3-5 倍，适合用户分布广的应用 |
| PPR 尚不稳定但需混合渲染 | DPR | 用 `dynamic` + `cache` 粒度控制 + 并行路由，生产可用 |

### 医疗电商场景映射

以药品平台为例：

- **药品说明书页** → SSG（内容由监管审批，极少变动）
- **药品列表 + 搜索结果** → ISR（`revalidate = 300`，5 分钟更新一次）
- **用户购物车 / 处方详情** → SSR + RSC（强个性化，不能缓存）
- **运营活动页** → PPR（静态活动框架 + 动态库存/价格）
- **后台药品管理** → CSR（内部系统，无 SEO 需求）
- **全球医讯翻译页** → Edge SSR（用户分布广，就近渲染翻译内容）

> 💬 **面试官**：后台管理系统适合用 SSR 吗？
>
> ✅ 标准答案：通常不适合。后台管理系统用户已登录、无 SEO 需求、交互复杂，CSR 反而更合适——开发简单、部署成本低（纯静态），SSR 引入服务端复杂度但收益有限。
> 🎁 加分答案：盲目 SSR 的坑：登录态处理复杂（每次请求要验证 token）、部署需要 Node 服务器而非 CDN、开发联调更麻烦。除非有明确的 SEO 或首屏性能要求，否则 CSR 够用。

---

## 📚 扩展知识：SPA / MPA / PWA 与渲染范式的关系

面试中经常被追问：「SPA 和 CSR 是一回事吗？」「PWA 属于哪种渲染范式？」这一章帮你一次性理清。

### SPA（单页应用）≠ CSR

SPA 是一种**应用架构模式**——前端接管路由，页面跳转时只替换内容区域而不整体刷新。CSR 是一种**渲染范式的选择**——内容由客户端 JS 生成。

两者不是一回事：

- **SPA + CSR**：传统 CRA/Vite SPA，路由切换不刷新，渲染在客户端（最常见组合）
- **SPA + SSR**：Next.js App Router 就是 SPA + SSR——路由切换时仍走客户端导航，但首屏在服务端渲染
- **MPA + CSR**：极其罕见，每页独立 CRA，无实际意义

### MPA（多页应用）≠ 传统 SSR

MPA 意味着每次导航都向服务端请求全新 HTML 文档。渲染可以是任何方式：

- **MPA + SSR**：传统 PHP/Rails，每次刷新页面由服务端渲染（经典组合）
- **MPA + SSG**：Astro 默认模式，每次导航请求一个预构建好的静态 HTML
- **MPA + ISR**：Next.js 开启 MPA 模式 + ISR，每个页面按需增量重建

### PWA（渐进式 Web 应用）与渲染范式正交

PWA 的本质是给 Web 应用附加原生能力——Service Worker（离线缓存）、manifest（可安装）、Push Notification（推送通知）。这些能力与渲染范式**完全正交**：

- PWA + CSR：离线缓存 JS bundle，首次打开有内容
- PWA + SSR：Service Worker 缓存 SSR HTML，离线时也能看到完整页面
- PWA + SSG：静态 HTML 天然适合 Service Worker 预缓存，PWA + SSG 是天然搭档

```text
         ┌──────────────────────────────────┐
         │          PWA（能力附加层）          │
         │  Service Worker / Push / Install  │
         ├──────────────────────────────────┤
         │         应用架构（SPA / MPA）       │
         ├──────────────────────────────────┤
         │    渲染范式（CSR / SSR / SSG / ...）  │
         └──────────────────────────────────┘
```

**一句话记住**：渲染范式决定「内容怎么生成」，应用架构决定「页面怎么跳转」，PWA 决定「离线和原生能力怎么加」。三者正交，面试时不要混淆。

---

## 💡 一张图总结（面试速记）

| 范式 | TTFB | FCP | 需要水合 | 适合场景 | Next.js 配置 |
| --- | --- | --- | --- | --- | --- |
| CSR | 极快 | 慢 | 否 | 后台管理、富交互应用 | `'use client'` + 纯客户端 |
| SSR | 中 | 快 | 是（全量） | 个性化页面、强 SEO | 默认 async Server Component |
| SSG | 极快 | 极快 | 是（全量） | 文档、博客、说明书 | `generateStaticParams` |
| ISR | 极快 | 极快 | 是（全量） | 电商详情、新闻资讯 | `export const revalidate = N` |
| RSC | 中 | 快 | 部分（仅 Client） | 数据密集展示、零 bundle | 默认（App Router） |
| Streaming SSR | 中→快 | 很快 | 是（渐进） | 慢接口页面 | `<Suspense>` + `loading.tsx` |
| PPR | 极快 | 极快 | 部分（动态区） | 混合页面（实验性） | `experimental: { ppr: true }` |
| DPR | 快 | 快 | 部分（动态区） | 复杂混合页面（生产可用） | `dynamic`+ `cache` 粒度控制 |
| Edge SSR | 极快 | 快 | 是（全量） | 全球用户、TTFB 敏感 | `export const runtime = 'edge'` |

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

> 🔖 这是「前端性能与监控系列」第 9 篇。上一篇：《自定义上报 SDK：对齐源码与控制台数据解读》；下一篇预告：《工程构建优化：Tree Shaking 为什么没生效，以及 Vite 产物瘦身实战》
