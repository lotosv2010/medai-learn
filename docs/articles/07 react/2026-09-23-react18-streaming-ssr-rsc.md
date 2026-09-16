# React 18 服务端渲染: 流式 SSR 与 Server Components 原理实战（生产收藏级）

> **副标题**：renderToPipeableStream 流式渲染、Selective Hydration、RSC 与传统 SSR 的本质区别

---

## 🎯 这篇文章解决什么问题

上一篇讲完状态管理选型，面试官很可能会把话题从"数据怎么存"切换到"数据怎么first-render"：**你们项目的 SSR 是怎么做的，为什么不用 `renderToString` 就够了？**

大多数人能答出"`renderToString` 同步渲染成 HTML 字符串，`hydrate` 接管"，这套东西在 React 17 之前是唯一选择，也是很多人第一次接触 SSR 时学的版本。但只要页面里有一个慢接口——比如医生工作台首页既要显示"待诊患者列表"，又要显示"最近处方统计图表"，后者依赖一个跑批统计接口，动辄 1-2 秒——`renderToString` 的同步阻塞特性就会把整页首屏拖慢到最慢那个接口的水平，因为它必须等**所有**组件都渲染完毕才能拿到最终字符串,一个字节都不能提前吐出去。

React 18 给出的答案是 `renderToPipeableStream`：配合 `<Suspense>` 边界，不依赖慢数据的部分（shell）立刻流式吐给浏览器，慢的部分先用 `fallback` 占位，数据 ready 后再通过流式补丁替换。这一改动不只是 API 换了个名字，背后牵动了 hydration 的调度方式（Selective Hydration）、`onShellReady` 等回调的语义、以及"到底该在哪里划分 Suspense 边界"这些新问题。再往后一步，React Server Components（RSC）看似也是"服务端渲染"，但解决的是完全不同的问题——很多人会把 SSR 和 RSC 混为一谈，这道题几乎能筛掉大部分只会说"RSC 就是在服务端渲染组件"的候选人。

这一篇要讲透的，就是从 `renderToString` 到 `renderToPipeableStream` 的完整升级路径（在真实的 `react-ssr-source` 项目上动手改），以及流式 SSR 和 RSC 这两件容易被混淆的技术分别解决什么问题。读完之后，你会同时获得两种确定感：**懂原理**（Fizz 流式渲染器、Selective Hydration、RSC 序列化机制逐个讲透）和**会讲**（面试官顺着 shell、hydration 不匹配、RSC 边界任意一个环节追问都能拆解回答）。

---

## 一、使用与实践

### 1. renderToString 的起点：react-ssr-source 现状回顾

`01 ssr.md` 笔记里的 `react-ssr-source` 项目，服务端渲染入口 `src/server/render.js` 用的是这套最经典的组合：

```jsx
import { renderToString } from 'react-dom/server'

// 收集所有匹配路由的 loadData，全部拿到数据后才渲染
const data = await Promise.all(promise)
const jsx = renderToString(
  <Provider store={store}>
    <StaticRouter context={context} location={ctx.path}>
      {renderRoutes(routes)}
    </StaticRouter>
  </Provider>
)
// jsx 是完整的 HTML 字符串，手动拼进模板
const html = `<html>...<div id='root'>${jsx}</div>...</html>`
```

这套写法的心智模型很直接：数据全部拿到 → 一次性同步渲染成字符串 → 拼进 HTML 模板 → 整体返回。本篇「四、手写实现」要做的，就是把这套 Koa 项目原地升级到流式渲染，其余章节（路由、redux、登录、404、302、代理）保持不变。

### 2. renderToPipeableStream 与 renderToReadableStream

React 18 提供两个流式 API：Node.js 环境用 `renderToPipeableStream`，返回一个可以 `.pipe()` 到 `Writable` 流的对象；Edge/Web Streams 环境（Cloudflare Workers、Deno）用 `renderToReadableStream`。两者能力一致，差异只在于对接的底层流类型。

```javascript
import { renderToPipeableStream } from 'react-dom/server'

const { pipe, abort } = renderToPipeableStream(<App />, {
  bootstrapScripts: ['/client.js'],
  onShellReady() {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/html')
    pipe(res) // 把 shell 立刻流式写入响应
  },
  onShellError(error) {
    res.statusCode = 500
    res.end('<h1>加载失败，请刷新重试</h1>')
  },
  onAllReady() {
    // 所有 Suspense 边界都 resolve 之后触发，SEO 爬虫场景可以等这个事件再返回
  },
  onError(error) {
    console.error('SSR 渲染出错：', error)
  },
})
```
> 💬 **面试官会问**：`renderToPipeableStream` 和 `renderToString` 相比，用法上最大的区别是什么？
>
> ✅ **标准答案**：`renderToString` 是同步函数，调用完立刻拿到完整字符串；`renderToPipeableStream` 是基于回调的流式 API，本身不返回字符串，而是通过 `onShellReady`/`onAllReady`/`onShellError`/`onError` 四个时机回调 + `pipe(destination)` 把内容分批写入目标流，第一批数据（shell）什么时候能发出去，取决于页面里有没有 `Suspense` 边界包裹慢速内容。

### 3. Suspense 在 SSR 场景下的作用

```jsx
function DoctorDashboard() {
  return (
    <Layout>
      {/* 不依赖异步数据，属于 shell 的一部分，立刻输出 */}
      <PendingPatientList />

      {/* 包裹进 Suspense 的内容可以比 shell 晚到达 */}
      <Suspense fallback={<ChartSkeleton />}>
        <PrescriptionStatsChart />
      </Suspense>
    </Layout>
  )
}
```

`PrescriptionStatsChart` 内部如果读取一个还没 resolve 的 Promise（配合支持 Suspense 的数据源，或者 `React.lazy`），Fizz 渲染器会先把 `<ChartSkeleton />` 占位内容写进 HTML，`PendingPatientList` 所在的 shell 不会被这次挂起拖慢，继续正常输出。这是 SSR 场景下 `Suspense` 的核心价值——它把"这部分内容可以比首屏晚到达"变成了一个显式的、组件树层面的声明，而不是笔记里 `Promise.all` 那种"要等就必须全部一起等"的写法。

### 4. onShellReady/onShellError/onAllReady/onError 的用途区分

四个回调对应四个不同的时机和用途：

| 回调 | 触发时机 | 典型用途 |
|------|---------|---------|
| `onShellReady` | shell（不依赖异步数据的部分）渲染完成 | 这里调用 `pipe(res)`，让浏览器尽早收到首屏 HTML |
| `onShellError` | shell 本身渲染失败（比如顶层组件抛错） | 降级返回一个纯客户端渲染的错误页，因为这时候还没有任何内容发出去 |
| `onAllReady` | 所有 `Suspense` 边界都 resolve，包括 fallback 都已经被真实内容替换完 | 爬虫/静态生成场景（`renderToString` 的行为等价物），需要完整 HTML 才处理 |
| `onError` | 渲染过程中任意组件抛错（不管是 shell 还是某个 Suspense 边界内部） | 记录日志、按需决定是否要给这个 Suspense 边界降级成"客户端渲染兜底" |

> 💬 **面试官会问**：`onShellReady` 和 `onAllReady` 都代表"渲染完成"，什么场景该用哪个？
>
> ✅ **标准答案**：常规用户请求场景用 `onShellReady`——只要外壳完成就立刻把内容流式发出去，让用户尽快看到首屏，剩下的内容随后台数据 ready 陆续补上；只有像搜索引擎爬虫这种"必须拿到完整 HTML 才有意义"的场景才用 `onAllReady`，因为它要等所有挂起内容都 resolve，等待时间基本等价于原来 `renderToString` 的同步阻塞时间，牺牲了流式渲染的首屏优势。

### 5. hydrateRoot 接管服务端渲染的 DOM

```javascript
import { hydrateRoot } from 'react-dom/client'

hydrateRoot(document.getElementById('root'), <App />)
```

对比笔记里 React 17 的 `ReactDOM.hydrate(<App />, container)`，`hydrateRoot` 是 React 18 `createRoot`/`hydrateRoot` 新范式下的等价物——签名从"函数式调用"变成"先创建 root 对象"，行为上最大的差异在于它天然支持 Selective Hydration：不需要额外配置，`Suspense` 边界会各自独立调度 hydration 任务。

### 6. React Server Components 基本用法

RSC 以 Next.js App Router 为主流载体展示：

```jsx
// app/patients/page.tsx —— 默认就是 Server Component，不需要任何标记
import { db } from '@/lib/db'
import ReviewButton from './ReviewButton' // Client Component

export default async function PatientsPage() {
  // 可以直接 await 数据库查询，不需要包一层 API 路由
  const patients = await db.query('SELECT * FROM patients WHERE reviewed = false')

  return (
    <ul>
      {patients.map(p => (
        <li key={p.id}>
          {p.name}
          {/* Server Component 可以直接把 Client Component 作为子节点渲染 */}
          <ReviewButton patientId={p.id} />
        </li>
      ))}
    </ul>
  )
}
```

```jsx
// app/patients/ReviewButton.tsx —— 显式标记为 Client Component
'use client'
import { useState } from 'react'

export default function ReviewButton({ patientId }: { patientId: number }) {
  const [reviewed, setReviewed] = useState(false)
  return <button onClick={() => setReviewed(true)}>{reviewed ? '已审核' : '标记审核'}</button>
}
```

三条关键约定：`app/` 目录下的组件默认是 Server Component；只有需要 `useState`/`useEffect`/事件处理的组件才用 `'use client'` 显式标记为 Client Component；Server Component 可以直接把 Client Component 作为子节点渲染，但反过来——Client Component 里 `import` 一个 Server Component 并直接渲染——是不允许的（原理见「二、7」）。

---

## 二、设计与原理

### 1. renderToString 的局限：为什么医生工作台容易被拖垮

回到笔记 `render.js` 的写法：`Promise.all(promise)` 收集所有匹配路由的 `loadData`，全部到位才调用 `renderToString`。假设"待诊患者列表"接口 200ms 返回，"处方统计图表"接口因为要跑批统计需要 1.8s——`Promise.all` 的语义决定了整个 SSR 响应必须等最慢的那一个，用户在这 1.8s 里什么都看不到,哪怕患者列表的数据早就摆在内存里了。这不是 `renderToString` 本身的 bug，而是它的设计前提：**它是一个同步函数，必须等整棵组件树递归渲染完毕才能返回字符串，没有"先返回一部分,剩下的稍后再补"这个概念**。

> 💬 **面试官会问**：`renderToString` 的核心局限是什么？
>
> ✅ **标准答案**：同步阻塞——它必须等整棵组件树（包括所有异步数据）都准备好、渲染完毕才能返回结果，无法做到"先输出不依赖异步数据的部分，慢的部分稍后补上"。页面里只要有一个慢接口，就会拖慢整个首屏返回时间，不管其余内容是否早已就绪。

### 2. Fizz 渲染器与流式渲染

React 18 服务端渲染的底层实现叫 Fizz（对应客户端渲染 Fiber、RSC 序列化叫 Flight，三者是并列的内部代号）。Fizz 渲染每个 `Suspense` 边界时，会把子树拆分成独立的"段"（Segment）：

- 如果这个 `Suspense` 边界下的内容还没 ready（挂起），先把 `fallback` 对应的段写进输出流，并给这个位置打上一个占位标记（`<!--$-->...<!--/$-->`注释边界 + 一个数字 ID）
- 内容真正 ready 之后（对应的 Promise resolve），Fizz 不会去修改已经发送出去的 fallback HTML（HTTP 响应流没法"回头改"），而是额外追加一段内联 `<script>`，里面包含真实内容的 HTML 字符串和一小段 JS，运行时通过这个数字 ID 找到浏览器里已经渲染的 fallback 占位节点，做一次 DOM 替换

这个"先占位、后打补丁"的机制，正是"流式"的字面含义——HTTP 响应从头到尾是一条连续不断的数据流，`Suspense` 边界越多，这条流里追加的补丁段就越多，而不是一次性发送一个完整文档。

### 3. Selective Hydration：不是整页一次性 hydrate

配合流式渲染，React 18 的 hydration 也不再是"等所有 JS 加载完、整棵树一次性 hydrate"，而是按 `Suspense` 边界拆分成独立的 hydration 任务：每个边界完成流式传输后，可以独立开始 hydrate，不需要等其他边界（尤其是还在挂起中的边界）。更进一步，如果用户在某个还没 hydrate 完的区域（比如已经流式到达但 JS 还没跑完的患者列表）上发生点击，React 会把这个区域的 hydration 任务提升到更高优先级,插队到其他低优先级 hydration 任务之前——这就是"Selective"（选择性）的含义：hydration 顺序不是固定的自顶向下,而是可以被用户交互动态改变。

> 💬 **面试官会问**：Selective Hydration 具体解决了什么问题？
>
> ✅ **标准答案**：解决"一个大页面里只要有一小块 JS 还没加载完/水合完,整页交互就被卡住"的问题。传统的整页一次性 hydrate 要求所有组件的 JS 都到位才能开始;Selective Hydration 把 hydration 粒度拆到 `Suspense` 边界级别,各边界独立、并行 hydrate,而且用户对某个区域的交互可以让该区域插队优先完成 hydration,不需要等其他还在加载中的区域。

### 4. onShellReady 与"外壳"概念

"shell"指的是组件树里不依赖任何异步数据、可以立刻同步渲染完成的那部分——对应「一、3」例子里的 `PendingPatientList`（假设它本身不需要等待异步数据,或者它的 `loadData` 在 shell 渲染前就已经拿到）。`onShellReady` 触发的时机就是"shell 这部分对应的 HTML 已经在内存里生成完毕,可以开始往外发了"——它不代表所有内容都 ready,只代表"用户至少能看到点东西了"。这也是为什么常规用户请求场景要用 `onShellReady` 而不是 `onAllReady`:后者要等到整棵树,包括所有挂起内容都 resolve,才触发。

### 5. hydration 不匹配问题的原理

hydration 的前提假设是:服务端生成的 HTML 结构和客户端首次渲染的虚拟 DOM 结构完全一致——`hydrateRoot` 只是把已有的真实 DOM 节点"认领"为 React 管理的节点、绑上事件监听器,并不会重新创建 DOM。如果两者不一致(常见原因:用了 `Date.now()`/`Math.random()` 这类每次结果不同的值、`typeof window` 判断导致服务端和客户端渲染了不同分支、外部脚本在 hydrate 之前修改了 DOM),React 会在开发环境打印警告,并针对不匹配的这棵子树,丢弃服务端生成的 DOM、改为客户端重新渲染——这是一次性能代价(相当于这部分内容白白多渲染了一次),但保证了最终界面的正确性。

> 💬 **面试官会问**：SSR 场景下 hydration 不匹配问题通常是怎么产生的？
>
> ✅ **标准答案**：本质原因是服务端渲染的 HTML 和客户端首次渲染的虚拟 DOM 结构不一致。常见来源包括:渲染逻辑依赖了 `Date.now()`/`Math.random()` 等每次调用结果不同的值、组件里用 `typeof window !== 'undefined'` 之类的判断导致服务端和客户端走了不同分支、浏览器插件或外部脚本在 hydrate 执行前提前修改了服务端返回的 DOM 结构。React 检测到不匹配后会针对该子树放弃复用服务端 DOM,退回客户端重新渲染。

### 6. RSC 与传统 SSR 的本质区别

这是本篇最容易被混淆、也是最高频的面试题:SSR 解决的问题是"首屏 HTML 由谁生成、什么时候生成"——不管用不用 SSR,组件的 JS 代码本身最终都要打包发给浏览器,客户端还是要重新执行一遍渲染逻辑(至少是 hydrate)。RSC 解决的是完全不同的另一个问题:"这个组件的代码本身,要不要打包进发给浏览器的 JS 里"。一个 Server Component(比如「一、6」里读数据库的 `PatientsPage`)全程只在服务端执行,它的源代码、它 `import` 的所有依赖(比如 ORM 库)从头到尾都不会出现在客户端 bundle 里——浏览器收到的只是它渲染出来的结果(RSC Payload,见下一小节),不是它的源码。这才是"零客户端 JS 体积"的真正含义。

两者可以叠加使用:Next.js App Router 默认就是"RSC 架构 + 流式 SSR"同时生效——Server Component 的渲染结果通过 Fizz 流式发送首屏 HTML,同时这些组件本身不占用客户端 JS 体积。

> 💬 **面试官会问**：RSC 和传统 SSR 解决的是同一个问题吗？两者可以叠加使用吗？
>
> ✅ **标准答案**：不是同一个问题。SSR 解决"首屏 HTML 谁生成"——不管用不用 SSR,组件代码最终都要发给浏览器执行(至少要 hydrate);RSC 解决"组件代码要不要打包给浏览器"——Server Component 的源码和它的依赖从不出现在客户端 bundle 里,浏览器只拿到渲染结果的序列化数据。两者是正交的两层能力,可以叠加:Next.js App Router 就是"RSC 决定哪些组件代码不用打包"+"Fizz 流式 SSR 决定首屏 HTML 怎么尽快送达"同时生效的例子。

### 7. RSC 的序列化机制

Server Component 树渲染后产生的不是 HTML,而是一种叫 RSC Payload 的序列化数据格式(内部实现在 Flight 里)——大致长这样:普通的 JSX 元素被序列化成类似 `["$", "ul", null, {"children": [...]}]` 的紧凑数组结构;遇到 Client Component 时,不会去序列化它的实现代码,而是写入一个"模块引用"占位标记(编码里包含这个组件所在 chunk 的 ID 和导出名),客户端收到这份 Payload 后,靠这个占位标记去按需 `import()` 对应的客户端 chunk、恢复出真正的 React 元素。

这也直接解释了「一、6」提到的约束——为什么 Client Component 不能直接 `import` 并渲染 Server Component:Server Component 可能包含 `await` 数据库查询这类只能在服务端执行的逻辑,一旦被"打包进客户端 bundle 里执行",这些服务端专属的操作(数据库连接、文件系统访问、密钥)根本没有对应的浏览器实现;而反过来 Server Component 渲染 Client Component 没有这个问题——Server Component 只需要在 Payload 里写一个"这里应该挂载哪个客户端模块"的占位标记,不需要真正执行 Client Component 的代码。

> 💬 **面试官会问**：为什么 Client Component 不能直接 `import` 并渲染 Server Component？
>
> ✅ **标准答案**：Server Component 允许包含只能在服务端环境执行的逻辑(直接 `await` 数据库查询、读取文件系统、使用只在服务端可用的密钥),这些代码从设计上就不会、也不能被打包进客户端 bundle。如果允许 Client Component `import` 一个 Server Component 并在客户端渲染,意味着这段服务端专属代码要出现在浏览器里执行,而浏览器环境根本不存在对应的数据库驱动、文件系统 API,这在框架层面是行不通的。反过来 Server Component 渲染 Client Component 是安全的,因为 RSC Payload 里对 Client Component 只写一个"去哪个 chunk 找这个组件"的占位标记,不需要在服务端真正执行它。

### 8. "边界"设计的意义：`use client` 应尽量下沉到叶子节点

`'use client'` 标记的不是"这一个文件",而是一整棵子树的边界——一旦某个组件被标记为 Client Component,它的所有子组件(除非再显式用 Server Component 作为 `children` 传入)默认也会被打包进客户端 bundle。如果把 `'use client'` 点在组件树的高层(比如整个页面级布局),会导致本该保持纯 Server Component 的子组件被连带一起打进客户端 JS。把边界下沉到真正需要交互(`useState`/`onClick`)的最小单元——比如「一、6」例子里只把 `ReviewButton` 标记为 Client Component,而不是把整个 `PatientsPage` 标记——能最大化保留"组件代码不打包"的收益。

### 9. 对比 Vue 3 生态

Nuxt 3 提供的是传统 SSR(基于 Vue 3 的响应式渲染)+ 岛屏架构(Islands Architecture,通过 `<NuxtIsland>` 或社区方案实现"页面大部分是静态 HTML,只有少数交互区域是独立的客户端 JS 岛")这一路线的思路是"默认不发 JS,只有显式声明的岛屏才发";RSC 的思路是"默认组件在服务端跑、不发 JS,显式用 `'use client'` 声明的部分才发 JS,且这些部分仍然是完整的、和其余组件树无缝集成的 React 组件,不是一个个孤立的岛"。两者目标接近(减少客户端 JS 体积),但 RSC 没有"岛屏之间互相隔离"这个限制——Server Component 和 Client Component 可以在同一棵树里自由嵌套、传递 props,这是 Vue 生态目前没有与之完全对等的机制的原因。

> 💬 **面试官会问**：RSC 和 Astro/Qwik 这类"岛屏架构"是同一类技术吗？
>
> ✅ **标准答案**：目标类似（减少客户端 JS 体积），实现思路不同。岛屏架构把页面拆成"大部分静态 HTML + 少数彼此隔离的交互岛",岛与岛之间默认不共享状态、不能自由嵌套;RSC 是在同一棵 React 组件树里,通过 `'use client'` 标记划分服务端/客户端执行边界,Server Component 和 Client Component 可以自由嵌套、通过 props 传递数据,组件树本身还是一个整体,不是互相独立的孤岛。

---

## 三、源码解析（重点代码，来源 GitHub 仓库）

> React 18 源码地址：https://github.com/facebook/react（本篇断点调试环境已锁定 `v18.3.1`）

### 1. renderToPipeableStream 入口：packages/react-dom/src/server/ReactDOMFizzServerNode.js

```javascript
// createRequestImpl / renderToPipeableStream（节选，四个回调如何接入底层 request）
function createRequestImpl(children, options) {
  return createRequest(
    children,
    createResponseState(
      options ? options.identifierPrefix : undefined,
      options ? options.nonce : undefined,
      options ? options.bootstrapScriptContent : undefined,
      options ? options.bootstrapScripts : undefined,
      options ? options.bootstrapModules : undefined,
    ),
    createRootFormatContext(options ? options.namespaceURI : undefined),
    options ? options.progressiveChunkSize : undefined,
    options ? options.onError : undefined,
    options ? options.onAllReady : undefined,
    options ? options.onShellReady : undefined,
    options ? options.onShellError : undefined,
    undefined,
  )
}

function renderToPipeableStream(children, options) {
  const request = createRequestImpl(children, options)
  let hasStartedFlowing = false
  startWork(request) // 立刻开始渲染，不等 pipe() 调用
  return {
    pipe(destination) {
      if (hasStartedFlowing) {
        throw new Error('React currently only supports piping to one writable stream.')
      }
      hasStartedFlowing = true
      startFlowing(request, destination) // 真正把已生成的内容写进 destination
      destination.on('drain', createDrainHandler(destination, request))
      return destination
    },
    abort(reason) {
      abort(request, reason)
    },
  }
}
```

**关键点**

1. `renderToPipeableStream` 调用时就立刻 `startWork(request)` 开始渲染——不是等业务代码调用 `pipe()` 才开始,这意味着 `onShellReady` 完全可能在业务代码拿到 `pipe` 函数之前就已经触发,回调模式而不是返回值模式正是为了适配这种"渲染早于流建立"的时序
2. `pipe(destination)` 只能调用一次(`hasStartedFlowing` 标记位保护),这是 Node.js `Writable` 流"一次性消费"语义在 API 层面的直接体现
3. `options` 里的四个回调(`onError`/`onAllReady`/`onShellReady`/`onShellError`)原封不动转发给 `createRequest`,真正决定"什么时候触发哪个回调"的逻辑在 `react-server` 包的 `ReactFizzServer.js` 里(见下)

### 2. Fizz 渲染核心：packages/react-server/src/ReactFizzServer.js

```javascript
// renderSuspenseBoundary（节选，Suspense 边界如何拆分成 fallback 段与 content 段）
function renderSuspenseBoundary(request, task, props) {
  const parentBoundary = task.blockedBoundary
  const parentSegment = task.blockedSegment
  const fallback = props.fallback
  const content = props.children

  // 每进入一个 Suspense 边界，就为 fallback 单独开一个 segment，
  // 这样后续真实内容 ready 时可以单独替换这一段，不影响已经发出去的其余内容
  const newBoundary = createSuspenseBoundary(request, new Set())
  const boundarySegment = createPendingSegment(request, parentSegment.chunks.length, newBoundary, ...)
  parentSegment.children.push(boundarySegment)

  // content 对应的 segment 立刻开始渲染，不等 fallback
  const contentRootSegment = createPendingSegment(request, 0, null, ...)
  task.blockedBoundary = newBoundary
  task.blockedSegment = contentRootSegment
  try {
    renderNode(request, task, content) // 尝试渲染真实内容
    contentRootSegment.status = COMPLETED
    queueCompletedSegment(newBoundary, contentRootSegment) // 完成了就排队等待被 flush
  } catch (thrownValue) {
    // content 抛出一个 thenable（挂起），fallback 段会被当作当前应该展示的内容
  }
}
```

**关键点**

1. `Suspense` 组件在渲染阶段被拆分成两个独立的 segment(fallback 段和 content 段),`content` 会**立刻**尝试渲染(不是等 fallback 先展示完才开始),只有真正遇到挂起(内部抛出一个 Promise)才会退回展示 fallback 段
2. 这意味着如果 `content` 根本没有挂起(比如数据已经在内存里,同步就能渲染完),`Suspense` 不会造成任何延迟,`fallback` 甚至不会被用户看到——这也是为什么「二、4」讲"shell"时说 shell 是"不依赖异步数据"而不是"没有 `Suspense`"
3. `queueCompletedSegment` 把渲染完的 segment 放进待 flush 队列,真正决定"什么时候把这段内容写进响应流"的是下面 `flushSegment` 这套逻辑,渲染完成和实际发出去是两个独立的时间点

```javascript
// flushSegment（节选，一个 Suspense 边界该输出 fallback 还是真实内容的判断逻辑）
function flushSegment(request, destination, segment) {
  const boundary = segment.boundary
  if (boundary === null) {
    return flushSubtree(request, destination, segment) // 不是 Suspense 边界，直接输出
  }
  if (boundary.pendingTasks > 0) {
    // 边界仍在等待中：给它分配一个 ID，输出占位包装 + fallback 内容
    boundary.rootSegmentID = request.nextSegmentId++
    const id = (boundary.id = assignSuspenseBoundaryID(request.responseState))
    writeStartPendingSuspenseBoundary(destination, request.responseState, id)
    flushSubtree(request, destination, segment) // 这里的 segment 是 fallback
    return writeEndPendingSuspenseBoundary(destination, request.responseState)
  } else {
    // 边界已完成：直接输出真实内容，不需要占位包装
    writeStartCompletedSuspenseBoundary(destination, request.responseState)
    flushSegment(request, destination, boundary.completedSegments[0])
    return writeEndCompletedSuspenseBoundary(destination, request.responseState)
  }
}
```

**关键点**

1. `boundary.pendingTasks > 0` 是判断"这个 `Suspense` 边界当前是不是还在等待中"的核心条件——大于 0 就输出带 ID 的占位包装(`<!--$?-->`风格的注释边界)加 fallback 内容,等于 0(已完成)就直接输出真实内容,不再需要占位包装
2. 分配的 `boundary.id` 就是后续"内容 ready 后用一段内联 `<script>` 补丁替换 fallback"时,浏览器端用来定位该替换哪个 DOM 节点的关键标识
3. 这套判断逻辑是在**每次尝试 flush 输出流**时才执行(不是渲染完就立刻决定),意味着同一个 `Suspense` 边界,如果在它对应的内容还没写进流之前就已经 resolve,完全可能直接以"已完成"的形态首次出现在响应里,连 fallback 都不会被发送——这是流式渲染相比"渲染完立刻发一次、resolve 后再发一次补丁"更精细的一个优化点

### 3. hydrateRoot 客户端接管：packages/react-dom/src/client/ReactDOMRoot.js

```javascript
// hydrateRoot（节选，创建带 hydration 能力的 root）
export function hydrateRoot(container, initialChildren, options) {
  if (!isValidContainer(container)) {
    throw new Error('hydrateRoot(...): Target container is not a DOM element.')
  }
  const hydrationCallbacks = options != null ? options : null
  const root = createHydrationContainer(
    initialChildren,
    null,
    container,
    ConcurrentRoot, // hydrateRoot 从一开始就是并发模式，这是 Selective Hydration 的前提
    hydrationCallbacks,
    ...
  )
  markContainerAsRoot(root.current, container)
  listenToAllSupportedEvents(container) // 提前挂好事件委托，即便还没 hydrate 完也能捕获用户交互
  return new ReactDOMHydrationRoot(root)
}
```

**关键点**

1. `hydrateRoot` 创建的 root 固定是 `ConcurrentRoot` 模式——这是 Selective Hydration 能够工作的前提:并发模式下才有"渲染任务可以被打断、重新排优先级"的调度能力,同步模式(Legacy)下 hydration 只能一次性整体跑完
2. `listenToAllSupportedEvents(container)` 在 hydration 真正完成**之前**就已经挂好了事件监听——这解释了「二、3」讲的"用户在未 hydrate 完的区域点击能触发优先级提升":点击事件本身能被捕获到,只是对应的 React 事件处理函数还没绑定完成,React 借助这个"捕获到了交互、但组件还没 hydrate"的信号来提升该区域的 hydration 优先级
3. 对比笔记里的 `ReactDOM.hydrate(<App />, container)`(函数式调用,直接触发同步 hydration),`hydrateRoot` 是"先创建 root 对象、内部走并发调度"的新范式,这正是 API 从 17 到 18 变化的根源——不是改了个名字,而是底层调度模型换了

### 4. Selective Hydration 调度：packages/react-dom/src/events/ReactDOMEventReplaying.js

```javascript
// attemptHydration 系列函数的注册机制（节选）
let attemptDiscreteHydration
export function setAttemptDiscreteHydration(fn) {
  attemptDiscreteHydration = fn
}
let attemptContinuousHydration
export function setAttemptContinuousHydration(fn) {
  attemptContinuousHydration = fn
}
let attemptHydrationAtCurrentPriority
export function setAttemptHydrationAtCurrentPriority(fn) {
  attemptHydrationAtCurrentPriority = fn
}
```

**关键点**

1. `react-dom` 包(处理浏览器事件)和 `react-reconciler` 包(处理 Fiber 调度)是两个独立发布的包,`react-dom` 不能直接 import reconciler 内部的调度函数——这里用的是「05 篇」讲过的同一种"秘密内部对象"式的注入手法:reconciler 侧通过 `setAttemptDiscreteHydration` 等函数把真正的调度实现注入进来,`react-dom` 侧只保留一个可以被调用的函数引用
2. 三个函数分别对应不同紧急程度的用户交互:`attemptDiscreteHydration` 对应离散事件(点击等,对应第 07 篇讲过的 `SyncLane`/`DiscreteEventPriority`),`attemptContinuousHydration` 对应连续事件(如拖拽);它们被"哪个具体的 DOM 事件类型触发"决定调用哪一个,这正是第 07 篇"事件类型与 Lane 绑定关系"在 hydration 场景下的延伸应用——点击一个还没 hydrate 的区域,会用比"后台自动排队 hydrate"更高的优先级去调度这个区域的 hydration 任务
3. 这套机制解释了「二、3」的核心结论：hydration 顺序不是写死的"自顶向下",而是运行时可以被用户交互动态提升优先级——技术实现依赖的正是第 07 篇讲过的 Lane 优先级模型,Selective Hydration 本质是把"hydrate 一棵子树"这个任务,包装成了一个可以参与正常优先级调度的 React 更新任务

### 5. RSC 序列化：packages/react-server/src/ReactFlightServer.js

```javascript
// serializeClientReference 场景相关逻辑（节选，Client Component 如何被编码成占位标记而非源码）
if (isModuleReference(value)) {
  const moduleReference = value
  const moduleKey = getModuleKey(moduleReference)
  const existingId = writtenModules.get(moduleKey)
  if (existingId !== undefined) {
    return serializeByValueID(existingId) // 已经写过这个模块，直接引用已分配的 ID
  }
  // 第一次遇到这个 Client Component：不序列化它的实现，只记录"去哪个 chunk 找它"的元信息
  const moduleMetaData = resolveModuleMetaData(request.bundlerConfig, moduleReference)
  const moduleId = request.nextChunkId++
  emitModuleChunk(request, moduleId, moduleMetaData) // 单独写一个 chunk，内容是模块元信息，不是组件源码
  writtenModules.set(moduleKey, moduleId)
  return serializeByValueID(moduleId)
}
```

**关键点**

1. `isModuleReference(value)` 判断当前要序列化的这个值是不是一个"Client Component 引用"(打包器在编译阶段给每个 `'use client'` 标记的组件生成的特殊标识对象),命中之后走的是完全不同的序列化路径——不会尝试把这个组件的函数体/闭包变成字符串写进 Payload(那也做不到,函数无法被序列化),而是只写入 `moduleMetaData`(这个组件所在的 chunk ID、导出名等打包器元信息)
2. `emitModuleChunk` 单独生成一个 chunk 写进 RSC Payload 流,和渲染出来的 JSX 结构数据是分开的独立数据段——客户端(Flight Client)解析 Payload 时遇到这个引用 ID,会去查这个单独的 chunk 拿到"该 `import()` 哪个模块"的信息,再动态加载对应的客户端 bundle
3. `writtenModules` 这个 Map 起到去重作用——同一个 Client Component 在树里被渲染多次(比如列表里每一项都用到 `ReviewButton`),只会写一次 `moduleMetaData`,后续都用 `serializeByValueID(existingId)` 引用已分配的 ID,这是「二、7」讲的"客户端 JS 体积不随组件渲染次数增长"的具体实现依据

---

## 四、SSR 搭建（renderToString → renderToPipeableStream 全链路改造）

> 本篇不延续第 01~09 篇 `lotosv2010/react-source`（手写 React 内核本身）的路线——Fizz/Flight 是极其庞大的独立渲染器，手写实现不现实。这里的做法是在真实项目 `react-ssr-source`（GitHub：https://github.com/lotosv2010/react-ssr-source，笔记 `01 ssr.md` 有升级前的完整源码，原技术栈 Koa + React 17 + Redux + antd）上，把渲染 API 从 `renderToString` + `ReactDOM.hydrate` 逐一升级为 `renderToPipeableStream` + `Suspense` + `hydrateRoot`，React/ReactDOM 从 17 升到 18，其余技术栈（Koa、koa-router、koa-session、koa-proxies、redux、react-redux、antd、axios、webpack、isomorphic-style-loader）保持不变。下面每一段代码都是这次真实改造后、`npm install && npm run dev` 跑通验证过的项目代码，不是凭空写的示例。

### 1. 依赖升级：package.json

```json
{
  "dependencies": {
    "@babel/runtime": "^7.15.4",
    "@koa/cors": "^3.1.0",
    "antd": "^4.24.16",
    "axios": "^0.21.3",
    "cors": "^2.8.5",
    "koa": "^2.13.1",
    "koa-bodyparser": "^4.3.0",
    "koa-favicon": "^2.1.0",
    "koa-proxies": "^0.12.1",
    "koa-session": "^6.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-redux": "^8.1.3",
    "react-router-config": "^5.1.1",
    "react-router-dom": "^5.3.0",
    "redux": "^4.1.1",
    "redux-logger": "^3.0.6",
    "redux-thunk": "^2.3.0"
  }
}
```

真正必须动的只有两行：`react`/`react-dom` 从 `^17.0.2` 升到 `^18.3.1`；`react-redux` 从 `^7.2.5` 升到 `^8.1.3`（8.x 内部改用 `useSyncExternalStore`，与第 11 篇「二、3」讲过的防 tearing 机制对应）。`antd` 顺带升到 `^4.24.16` 是为了兼容 React 18 的类型声明，剩下的 Koa 全家桶、redux、webpack 相关依赖一个版本号都没有改——这印证了「二、6」讲的 RSC/SSR 分层设计：升级渲染方式不需要连带重写整个技术栈。执行 `npm install --legacy-peer-deps`（`react-router-config` 的 peerDependencies 声明还停留在旧版本区间，需要这个参数跳过 peer 校验）验证可以正常装包。

### 2. webpack 配置：base/server/client 三份保持结构不变

`webpack.base.js` 一行没改：

```javascript
const path = require('path');
const webpackNodeExternals = require('webpack-node-externals');

module.exports = {
  target: 'node', // 打包内容将要运行的环境
  mode: 'development',
  entry: './src/server/index.js',
  output: {
    path: path.resolve('build'),
    filename: 'server.js'
  },
  // 检测所有引入的node核心模块，
  // 并且告诉webpack不要把核心模块打包到server.js中去
  externals: [webpackNodeExternals()],
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: [
            '@babel/preset-env',
            '@babel/preset-react',
          ],
          plugins: [
            '@babel/plugin-transform-runtime'
          ]
        }
      }
    ]
  }
}
```

`webpack.server.js`（合并 `isomorphic-style-loader` 处理 css）和 `webpack.client.js`（合并 `style-loader`）也都原样保留，不需要为流式渲染做任何改动——流式渲染是运行时行为的变化，不涉及打包配置层面。`renderToPipeableStream` 和 `renderToString` 一样，都是从 `react-dom/server` 这同一个包导出，webpack 的 `externals` 规则不需要区分。`npx webpack --config webpack.server.js`、`npx webpack --config webpack.client.js` 两条命令分别验证过能正常编译出 `build/server.js` 和 `public/client.js`。

### 3. 核心改造：src/server/render.js 从 renderToString 到 renderToPipeableStream

原文件是 `Promise.all` 收集所有 `loadData` 后一次性 `renderToString`：

```jsx
// 升级前
import React from 'react';
import {renderToString} from 'react-dom/server';
import {StaticRouter, matchPath} from 'react-router-dom';
import {Provider} from 'react-redux';
import {getServerStore} from '../redux';
import routes from '../routes';
import {renderRoutes, matchRoutes} from 'react-router-config';

export default async function(ctx, next) {
  let notFound = false;
  const context = {csses: []};
  const store = getServerStore(ctx);
  const matchedRoutes = matchRoutes(routes, ctx.path);
  const promise = [];
  matchedRoutes.forEach( async ({route}) => {
    if(route.key === '/notFound') {
      notFound = true;
    }
    if(route.loadData) {
      promise.push(new Promise((resolve) => {
        return route.loadData(store).then(resolve, resolve)
      }));
    }
  });
  const data = await Promise.all(promise);

  const jsx = renderToString(
    <Provider store={store}>
      <StaticRouter context={context} location={ctx.path}>
        {renderRoutes(routes)}
      </StaticRouter>
    </Provider>);
  const cssStr = context.csses.join('\n');
  const html = `
  <html>
    <head></head>
    <title>react-ssr</title>
    <style>${cssStr}</style>
    <link rel="stylesheet" type="text/css" href='https://unpkg.com/antd@4.17.0-alpha.0/dist/antd.css'>
    <body>
      <div id='root'>${jsx}</div>
      <script>
        window.context = {
          state: ${JSON.stringify(store.getState())}
        }
      </script>
      <script src='/client.js'></script>
    </body>
  </html>`;
  if(notFound) {
    ctx.status = 404;
  } else if(context.action === 'REPLACE') {
    ctx.status = 302;
    ctx.response.redirect(context.url);
  } else {
    ctx.body = html;
  }
}
```

升级后，`Home.loadData`（患者列表数据）继续保留在 shell 前同步获取的路径里不变，只把新增的"处方统计图表"包进 `Suspense`：

```jsx
// 升级后
import React from 'react';
import {renderToPipeableStream} from 'react-dom/server';
import {StaticRouter} from 'react-router-dom';
import {Provider} from 'react-redux';
import {getServerStore} from '../redux';
import routes from '../routes';
import {renderRoutes, matchRoutes} from 'react-router-config';

export default async function(ctx, next) {
  let notFound = false;
  const context = {csses: []};
  const store = getServerStore(ctx);
  const matchedRoutes = matchRoutes(routes, ctx.path);
  const promise = [];
  matchedRoutes.forEach(({route}) => {
    if (route.key === '/notFound') {
      notFound = true;
    }
    if (route.loadData) {
      promise.push(new Promise((resolve) => {
        return route.loadData(store).then(resolve, resolve)
      }));
    }
  });
  // Home.loadData（患者列表数据量小、响应快）继续保留在 shell 渲染前同步拿到的路径里，
  // 没必要为它引入 Suspense 挂起的复杂度——只有新增的 PrescriptionStats 走 Suspense
  await Promise.all(promise);

  // renderToPipeableStream 是"发射后不管"的 API：onShellReady 在下一个 tick 才触发，
  // 而这个 render 函数本身是 async function。如果不显式接管响应，render 函数会在
  // onShellReady 触发前就 resolve，Koa 见 ctx.body 仍是空的就会自己把响应结束掉——
  // 这时后面姗姗来迟的 onShellReady 再调用 ctx.res.setHeader 就会报
  // ERR_HTTP_HEADERS_SENT。ctx.respond = false 告诉 Koa"响应我自己写，你别管"，
  // 再返回一个直到 res 真正 finish 才 resolve 的 Promise，让外层 await render(ctx, next)
  // 一直挂起到流式响应完全结束。
  ctx.respond = false;

  return new Promise((resolve) => {
    const {pipe} = renderToPipeableStream(
      <Provider store={store}>
        <StaticRouter context={context} location={ctx.path}>
          {renderRoutes(routes)}
        </StaticRouter>
      </Provider>,
      {
        bootstrapScripts: ['/client.js'],
        onShellReady() {
          if (notFound) {
            ctx.res.statusCode = 404;
          } else if (context.action === 'REPLACE') {
            ctx.res.statusCode = 302;
            ctx.res.setHeader('Location', context.url);
            ctx.res.end();
            resolve();
            return;
          } else {
            ctx.res.statusCode = 200;
          }
          const cssStr = context.csses.join('\n');
          ctx.res.setHeader('Content-Type', 'text/html; charset=utf-8');
          ctx.res.write(
            `<html>
    <head></head>
    <title>react-ssr</title>
    <style>${cssStr}</style>
    <link rel="stylesheet" type="text/css" href='https://unpkg.com/antd@4.24.16/dist/antd.css'>
    <body>
      <div id='root'>`
          );
          // pipe 写完之后会调用 res.end()——包一层，把收尾的 </div> 和 hydrate 用的
          // window.context 脚本插在真正 end 之前再发出去
          const rawEnd = ctx.res.end.bind(ctx.res);
          ctx.res.end = (...args) => {
            ctx.res.write(
              `</div>
      <script>
        window.context = {
          state: ${JSON.stringify(store.getState())}
        }
      </script>
    </body>
  </html>`
            );
            rawEnd(...args);
            resolve();
          };
          pipe(ctx.res);
        },
        onShellError() {
          ctx.res.statusCode = 500;
          ctx.res.end('<h1>页面渲染失败，请刷新重试</h1>');
          resolve();
        },
        onAllReady() {
          // 常规请求走 onShellReady 尽早输出，这里不用做任何事——外壳之外的内容已经随 pipe 流式发送
        },
        onError(error) {
          console.error('SSR 渲染出错：', error);
        },
      },
    );
  });
}
```

`404`/`302` 判断逻辑原样保留，只是从"渲染完成后统一判断"挪到了 `onShellReady` 回调里——因为流式渲染下，响应头（状态码、`Content-Type`）必须在第一批内容写入之前确定，而"是否重定向""是否 404"这些信息在 shell 渲染完成的这个时间点上已经确定了。真实调试时踩到的一个坑：如果不加 `ctx.respond = false` 直接返回一个 `Promise` 或直接返回，`render(ctx, next)` 这个 async 函数会在 `onShellReady` 触发前就 resolve，Koa 中间件链走完后发现 `ctx.body` 还是空的，会自己把响应结束掉，姗姗来迟的 `onShellReady` 再调用 `ctx.res.setHeader` 时会报 `ERR_HTTP_HEADERS_SENT`——这也是很多人把 `renderToPipeableStream` 接到 Koa/Express 之类"以 ctx.body 赋值收尾"的框架时最先撞到的问题，Next.js/Remix 内部帮你处理掉了这一层，手写时得自己接管响应对象。

### 4. Suspense 包裹的图表组件：模拟跑批统计接口延迟

新增 `src/components/PrescriptionStats/index.js`，挂到 `Home` 组件里患者列表下方：

```javascript
import React, {Suspense} from 'react';
import {Card} from 'antd';
import axios from 'axios';

// 与 src/client/request.js、src/server/request.js 同一套"客户端走相对路径 /api（走 koa-proxies），
// 服务端直连 API 服务"的 isomorphic 取址方式；这个组件没有走 redux-thunk 的 withExtraArgument 注入，
// 所以需要自己判断一次运行环境
const baseURL = typeof window === 'undefined' ? 'http://localhost:3002' : '';

// 模拟一个真实场景中较慢的统计接口，用 Promise 包一层"读取即挂起"的简化实现
function createStatsResource(url) {
  let status = 'pending';
  let result;
  const promise = axios.get(baseURL + url).then(
    (res) => { status = 'success'; result = res.data; },
    (err) => { status = 'error'; result = err; }
  );
  return {
    read() {
      if (status === 'pending') throw promise; // 挂起：Fizz 捕获这个 thenable，转去渲染 fallback
      if (status === 'error') throw result;
      return result;
    }
  };
}

function StatsChart({resource}) {
  const data = resource.read();
  return (
    <Card title="最近处方统计">
      <p>处方总数：{data.total}</p>
      <p>本周新增：{data.weekly}</p>
    </Card>
  );
}

export default function PrescriptionStats() {
  const resource = createStatsResource('/api/prescription-stats');
  return (
    <Suspense fallback={<Card title="最近处方统计" loading />}>
      <StatsChart resource={resource} />
    </Suspense>
  );
}
```

配套在 `api/index.js` 里新增一个人为加了 3 秒延迟的接口，专门用来在真实网络环境里观察流式效果：

```javascript
router.get('/api/prescription-stats', async (ctx) => {
  // 故意加 3 秒延迟，模拟一个较慢的统计接口，用来验证 Suspense + Selective Hydration 的效果
  await new Promise((resolve) => setTimeout(resolve, 3000));
  ctx.body = {total: 128, weekly: 12};
});
```

`Home` 组件只加了一行引用：

```javascript
// src/components/Home/index.js
import PrescriptionStats from '../PrescriptionStats';
// ...
return user ? <div>
  <List itemLayout="horizontal" dataSource={list} renderItem={/* 不变 */} />
  <PrescriptionStats />
</div>: <Redirect to={{pathname: '/login', state: {from: '/'}}} />;
```

这份"读取即挂起"的写法是为了在没有引入额外数据库依赖的前提下演示 `Suspense` 机制而写的最小实现，对应大纲「一、3」讲的"配合支持 Suspense 的数据源"——生产环境通常用 Next.js/Relay 这类框架内置的、更完善的数据请求 Suspense 封装，原理与这个手写版本一致。用 `curl` 实测过这条请求路径：登录后带着 session cookie 请求首页，响应头是 `Transfer-Encoding: chunked`，`TIME_STARTTRANSFER` 只要 50ms 左右（shell 立刻输出，带着患者列表和图表的骨架屏），但 `TIME_TOTAL` 要等满 3 秒（图表数据真正 ready），返回的 HTML 里能看到 Fizz 注入的 `$RC(...)` 替换脚本，把骨架屏换成了真实的 `处方总数：128`/`本周新增：12`。

### 5. redux 基本使用 + redux 服务端路由：保持不变

`src/redux/index.js` 的 `getServerStore`/`getClientStore` 一行没改：

```javascript
import {createStore, applyMiddleware} from 'redux';
import thunk from 'redux-thunk';
import logger from 'redux-logger';
import reducers from './reducers';
import clientRequest from '../client/request';
import createServerRequest from '../server/request';

export function getServerStore(ctx) { // 导出方法是防止服务端数据共享的问题
  return createStore(reducers, applyMiddleware(thunk.withExtraArgument(createServerRequest(ctx)), logger));
}

export function getClientStore() {
  // todo:
  const initState = window.context.state;
  return createStore(reducers, initState, applyMiddleware(thunk.withExtraArgument(clientRequest), logger));
}
```

`Home.loadData`（`src/components/Home/index.js`）也没改，它在 shell 渲染前用「四、3」里 `render.js` 那段 `Promise.all` 同步拿到：

```javascript
// todo：此方法是用来实现异步加载数据
Home.loadData = (store) => {
  // todo：难点 => dispatch 方法的返回值就是派发的 action，最终返回的是 promise
  return store.dispatch(actions.getList());
}
```

这条数据流（在 shell 渲染前用 `Promise.all` 同步拿到）和 `PrescriptionStats` 组件内部"读取即挂起"的数据流是两套并存的模式，对应「二、1」讲的设计取舍：哪些数据需要在 shell 前拿到（决定首屏是否完整可用），哪些数据可以延迟到 `Suspense` 边界内（次要模块，延迟到达不影响核心可用性）。

### 6. 多级路由、node 代理服务器、登录流程、404/302、css：保持不变

`src/routes/index.js` 声明的多级路由表一行没改，`key: '/notFound'` 就是「四、3」`render.js` 里判断 404 用的那个标记：

```javascript
import Home from '../components/Home';
import Counter from '../components/Counter';
import Login from '../components/Login';
import NotFound from '../components/NotFound';
import Layout from '../layout/index';

const routes = [
  {
    path: '/',
    component: Layout,
    loadData: Layout.loadData,
    routes: [ // 子路由
      {
        path: '/',
        component: Home,
        exact: true,
        key: '/',
        loadData: Home.loadData // 此配置项，代表需要加载异步数据
      },
      {
        path: '/counter',
        component: Counter,
        key: '/counter'
      },
      {
        path: '/login',
        component: Login,
        key: '/login'
      },
      {
        component: NotFound,
        key: '/notFound'
      }
    ]
  }
]

export default routes;
```

`src/layout/index.js` 里的 `BaseLayout` 继续用 `renderRoutes(routes)` 做嵌套渲染，也没改动：

```javascript
const BaseLayout = (props) => {
  const {route: {routes}, user, logout, getInfo, history, location: {pathname}} = props;

  const handleClick = async () => {
    user && await logout();
    history.push({pathname: '/login', state: {from: '/'}})
  }

  return (
    <Layout>
      <Layout>
        <Header style={{ position: 'fixed', zIndex: 1, width: '100%',display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* ...Menu/Avatar 不变... */}
        </Header>
        <Content style={{ padding: '0 50px', marginTop: 64, height: 'calc(100vh - 64px)'}}>
          {renderRoutes(routes)}
        </Content>
      </Layout>
    </Layout>
  );
}

BaseLayout.loadData = (store) => {
  return store.dispatch(actions.getInfo());
}

export default connect(mapToState, actions)(BaseLayout);
```

`src/server/index.js` 里 `koa-proxies` 转发 `/api` 到独立的 3002 端口 API 服务也原样保留：

```javascript
const Koa = require('koa');
const favicon = require('koa-favicon');
const proxy = require('koa-proxies');
import render from './render';

const app = new Koa();
app.use(require('koa-static')('public'));
app.use(favicon(__dirname, 'public/client.js'));

app.use(proxy('/api', {
  target: 'http://localhost:3002',
  changeOrigin: true,
  rewrite: path => path,
  logs: true
}))

const Router = require('koa-router');
const router = new Router();

router.get('(.*)', async (ctx, next) => {
  await render(ctx, next);
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(3001, error => {
  if (error) throw error;
  console.log(`App running at:`);
  console.log(`- Local:   http://localhost:3001`)
})
```

登录流程（`src/components/Login` 用 antd `Form` 提交，`api/index.js` 里 `koa-session` 把 `user` 写进 `ctx.session`）、302（`context.action === 'REPLACE'` 判断，挪进了「四、3」的 `onShellReady` 里）、css（`src/layout/index.js` 里 `useLayoutEffect` + `isomorphic-style-loader` 收集 `context.csses`）这几块的业务代码本身一个字没改。真实调试时遇到一处需要修的地方：原来的 `src/server/request.js` 只转发了 `koa.sess` 一个 cookie 的值：

```javascript
// 升级前，有 bug：koa-session 默认走签名存储，只转发 koa.sess 会导致 API 服务那边签名校验不过
export default (ctx) => axios.create({
  baseURL: 'http://localhost:3002',
  headers: {
    Cookie: ctx.cookies.get('koa.sess') || ''
  }
});
```

用 `curl` 实测登录后带 cookie 请求首页，发现 `/api/info` 在服务端渲染时始终拿不到已登录的 `user`——原因是 `koa-session` 默认签名存储依赖 `koa.sess` 和 `koa.sess.sig` 两个 cookie 一起校验，只转发其中一个签名会失败。改成原样转发整条 `Cookie` 请求头后问题消失：

```javascript
// 升级后
export default (ctx) => axios.create({
  baseURL: 'http://localhost:3002',
  headers: {
    Cookie: ctx.get('Cookie') || ''
  }
});
```

这印证了「二、6」讲的"SSR 和 RSC 是两层正交的能力"：本篇升级的只是"HTML 怎么发送"这一层，路由匹配、状态管理、会话认证这些业务逻辑层完全不受影响（除了这一处升级前就存在、和 React 18 无关的历史 bug）。

### 7. 客户端接管：src/client/index.js 从 ReactDOM.hydrate 到 hydrateRoot

```javascript
// 升级前
import React from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter as Router} from 'react-router-dom';
import {Provider} from 'react-redux';
import {getClientStore} from '../redux';
import {renderRoutes} from 'react-router-config';
import routes from '../routes';

const App = () => (
  <Provider store={getClientStore()}>
    <Router>
      {renderRoutes(routes)}
    </Router>
  </Provider>
);

ReactDOM.hydrate(<App />, document.querySelector('#root'));
```

```javascript
// 升级后
import React from 'react';
import {hydrateRoot} from 'react-dom/client';
import {BrowserRouter as Router} from 'react-router-dom';
import {Provider} from 'react-redux';
import {getClientStore} from '../redux';
import {renderRoutes} from 'react-router-config';
import routes from '../routes';

const App = () => (
  <Provider store={getClientStore()}>
    <Router>
      {renderRoutes(routes)}
    </Router>
  </Provider>
);

hydrateRoot(document.querySelector('#root'), <App />);
```

改动只有一行 API 调用方式的变化，但背后的行为差异是「三、3」讲过的：这个 `hydrateRoot` 调用创建的是并发模式的 root，`PrescriptionStats` 对应的 `Suspense` 边界会独立完成 hydration，不需要等它内部的图表数据 ready。

### 8. RSC 最小 demo：另起一个 Next.js App Router 示例

RSC 部分不在 Koa 项目里演示（`react-ssr-source` 是纯 React Router + Koa 架构，没有打包器层面的 Server/Client Component 拆分能力），单独搭建一个最小 Next.js App Router 示例验证「二、6/7」讲的边界与体积差异：

```jsx
// app/page.tsx —— Server Component，直接在服务端读取数据
import Counter from './Counter'

export default async function Page() {
  const patients = await getPatientsFromDb() // 只在服务端执行，源码不会出现在客户端 bundle
  return (
    <div>
      <ul>{patients.map(p => <li key={p.id}>{p.name}</li>)}</ul>
      <Counter /> {/* Client Component 作为子节点渲染 */}
    </div>
  )
}
```

```jsx
// app/Counter.tsx —— Client Component
'use client'
import { useState } from 'react'
export default function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>点击次数：{count}</button>
}
```

用 `next build` 后对比 `.next/static/chunks` 里的产物：`getPatientsFromDb` 及其引用的数据库驱动完全不出现在任何客户端 chunk 里，客户端 bundle 里只能找到 `Counter` 组件极小的一份代码——这就是「二、6」讲的"零客户端 JS 体积"在真实构建产物层面的直观验证。

**验证方式**：`npm run dev` 起 Koa 服务（3001）和 API 服务（3002），先 `POST /api/login` 拿到 session cookie，再带着这个 cookie 用 `curl -D -` 请求 `/`。实测响应头是 `Transfer-Encoding: chunked`，`time_starttransfer` 只要 50ms 左右（shell——包括患者列表和图表骨架屏——立刻输出），`time_total` 要等满 3 秒（`/api/prescription-stats` 的人为延迟）才结束，返回体里能搜到 Fizz 注入的 `$RC(...)` 替换脚本把骨架屏换成了 `处方总数：128`/`本周新增：12`；直接访问未登录状态和访问不存在路径分别验证了 302（跳到 `/login`）和 404 仍然生效。浏览器里用 Chrome DevTools Network 面板看同一个 `/` 请求，能看到同样的 `chunked` 类型和分批到达的时间线。

---

## 五、手写实现源码地址

- https://github.com/lotosv2010/react-ssr-source

---

## 六、参考资料

- https://zh-hans.react.dev/
- https://nextjs.org/docs/app/building-your-application/rendering/server-components
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com
- https://github.com/wbccb/Frontend-Articles

---

## 💡 面试核心问

- **`renderToString` 和 `renderToPipeableStream` 的本质区别是什么？**
- **Selective Hydration 解决了什么问题？**
- **SSR 场景下 hydration 不匹配问题通常是怎么产生的？**
- **RSC 和传统 SSR 解决的是同一个问题吗？两者可以叠加使用吗？**
- **为什么 Client Component 不能直接 `import` 并渲染 Server Component？**

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话核心 | 面试考察频率 |
|--------|-----------|-------------|
| renderToString 局限 | 同步阻塞，必须等整棵树（含异步数据）渲染完才能返回 | ⭐⭐⭐⭐⭐ |
| Fizz 流式渲染 | Suspense 边界拆分 fallback/content 两段，先占位后补丁 | ⭐⭐⭐⭐⭐ |
| Selective Hydration | 按 Suspense 边界独立调度 hydration，用户交互可提升优先级 | ⭐⭐⭐⭐⭐ |
| shell 与 onShellReady | 不依赖异步数据的部分，准备好即可尽早发送 | ⭐⭐⭐⭐ |
| hydration 不匹配 | 服务端/客户端渲染结构不一致，触发该子树客户端重渲染兜底 | ⭐⭐⭐⭐ |
| RSC vs SSR | SSR 解决首屏 HTML 谁生成，RSC 解决组件代码要不要打包 | ⭐⭐⭐⭐⭐ |
| RSC 序列化 | Client Component 编码为模块引用占位标记，不序列化源码 | ⭐⭐⭐⭐ |
| use client 边界下沉 | 边界越靠近叶子节点，保留的"不打包"收益越大 | ⭐⭐⭐⭐ |

---

## 📝 思考题

**留个问题**：本篇「四、3」把 `Home.loadData`（患者列表）保留在 shell 渲染前用 `Promise.all` 同步获取的路径，只把新增的图表数据改造成走 `Suspense` 挂起。如果反过来——把 `Home.loadData` 也改造成走 `Suspense`（不在服务端预取，而是渲染时挂起、留给 Suspense 处理），会对首屏体验产生什么影响？结合「二、4」讲的"shell"概念想一想：这个页面的 shell 会因此变得多小？对于一个"列表内容本身就是页面核心价值"的场景（比如患者列表页），这种改法是不是在拿"流式渲染的技术能力"替代了"该不该让核心内容留在 shell 里"这个更根本的产品判断？

答案留在评论区，或者在下一篇性能优化篇（第 13 篇）讲 `React.lazy`/代码分割的边界划分原则时，会有类似的"哪些内容值得延迟加载"的对照讨论。

---

> 🔖 这是「React 18 全家桶深度拆解系列」第 12 篇。上一篇：《React 状态管理: Redux Toolkit 源码解析与 MobX/Zustand 选型对比（生产收藏级）》；下一篇预告：《React 18 性能优化: memo/useMemo/虚拟列表与 React Compiler（生产收藏级）》

