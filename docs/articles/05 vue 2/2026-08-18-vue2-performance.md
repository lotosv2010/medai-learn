# Vue 2 性能优化全攻略：构建、加载、运行时到内存稳定，16 个手段从 3s 白屏到 800ms 首屏（面试收藏级）

> 一个医疗系统上线第一天，药品目录页白屏 3 秒，用户投诉「系统卡死了」。查 Chrome Performance，发现 10000 条药品数据全部被 Observer 递归劫持，首次渲染触发了 40 万次 getter/setter 定义；bundle 体积 2.8MB，gzip 都没开；Element UI 和 ECharts 直接打进了主 chunk。这不是一个问题，是四层问题同时爆发。性能优化不是调一个参数的玄学，是「构建 → 加载 → 运行时 → 内存稳定」四层按序治理的系统工程。这篇文章把 16 个手段全部梳理清楚，每个手段讲清楚原理、给出配置、告诉你面试怎么答。

---

## 📐 测量先行：找到瓶颈在哪一层

Vue Devtools 性能面板、Chrome Performance / Memory 面板、Lighthouse 指标（FCP / LCP / TTI / TBT）的详细使用已在前文介绍，此处不重复展开。搜索关键词：《Vue 2 性能分析工具实战》。

本文聚焦「测出瓶颈在哪一层之后怎么改」。先用这张决策树定位：

```
Lighthouse 总分低（< 60）
  ├── FCP / LCP 慢 → 首屏资源体积或网络传输问题 → 看构建层 + 加载层
  ├── TTI 慢        → JS 解析/执行时间过长 → 看构建层（bundle 太大）
  └── TBT 高        → 主线程长任务 → 看运行时层（大量响应式初始化 / 大列表渲染）

Chrome Performance 火焰图
  ├── Scripting 过高 → Observer 递归 / 大量 computed 重算 → 看运行时·数据层
  ├── Rendering 过高 → 频繁 patch / 大量 DOM 操作 → 看运行时·渲染层
  └── 内存快照不断增长 → 事件监听泄漏 → 看内存稳定层
```

---

## 🏗️ 一、构建层：让浏览器少搬东西

构建层的目标只有一个：**压缩传输体积，减少 JS 解析量**。Bundle 大一倍，TTI 就慢一倍。

### 选 runtime-only 版本

Vue 2 有两个主要版本：`vue.js`（Runtime + Compiler，约 91KB）和 `vue.runtime.js`（Runtime Only，约 63KB）。区别在于后者**不包含模板编译器**。

关键认知：`.vue` 单文件组件里的 `template` 在构建期就被 `vue-loader` + `vue-template-compiler` 编译成了 `render` 函数。所以运行时根本不需要编译器。

- 运行时只有字符串 `template` 模板（`new Vue({ template: '...' })`）才需要编译器
- 用 `.vue` + `vue-loader` 的项目，模板都在构建期编译完，用 runtime-only 版省掉 ~28KB 的编译器
- 默认 `vue-cli` 打包的就是 runtime-only 版（`vue/dist/vue.runtime.esm.js`）

```
vue.js           ≈ 91KB  Runtime + Compiler
vue.runtime.js   ≈ 63KB  Runtime Only（.vue 项目用这个）
```

> 💬 **面试官**：为什么生产环境不 import 'vue' 而是 'vue/dist/vue.runtime.common.js'？
>
> ✅ 标准答案：因为 `.vue` 文件的 template 已经在构建时被 vue-loader 编译成 render 函数，运行时不需要编译器；runtime-only 版体积更小（省去约 28KB 编译器）。
>
> 🎁 加分答案：能说清**只有字符串模板/运行时模板编译才需要 compiler**，而基于 vue-loader 的项目不涉及——所以这个取舍的本质是「把编译成本从运行时挪到构建期」。

### 路由懒加载 + webpackChunkName

整个应用打进一个 chunk，首屏要下载所有页面代码——这是最典型的「加载了用不到的代码」。路由懒加载把每个页面拆成独立 chunk，首屏只拉当前路由的：

```javascript
// src/router/routes/drug.router.js
export default [
  {
    path: '/list',
    name: 'DrugList',
    // webpackChunkName 指定输出文件名，生产环境可预测 chunk 名（利于缓存与排查）
    component: () => import(/* webpackChunkName: 'drug-list' */ '@/views/drug/list.vue')
  },
  {
    path: '/detail/:id',
    name: 'DrugDetail',
    component: () => import(/* webpackChunkName: 'drug-detail' */ '@/views/drug/detail.vue')
  }
]
```

`import()` 是 ES 的动态导入语法，webpack 遇到它就能把一个模块拆成独立 chunk，按需加载。

顺带说一句，`vue-cli`（webpack v4+）默认会在构建时给这些懒加载 chunk 的 `<link>` 标签注入 `rel="prefetch"`，相当于「空闲时间预拉取下一路由的资源」，后面加载层会细讲。

> 💬 **面试官**：路由懒加载的原理是什么？`webpackChunkName` 有什么用？
>
> ✅ 标准答案：用 `() => import(...)` 动态导入，webpack 把每个路由对应组件拆成独立 chunk，首屏只下载当前路由的 chunk，其余在访问到时才异步加载。
>
> 🎁 加分答案：`webpackChunkName` 魔法注释用于指定输出文件名，好处是生产环境能看出 chunk 归属、精确做缓存策略；还能用 `webpackPrefetch` / `webpackPreload` 魔法注释精细控制预加载时机。

### externals + CDN：把第三方库抽出去

Element UI / ECharts 这类大库打进主 chunk 会把主 bundle 撑到一两 MB。用 `externals` 把它们从打包中排除，改由 CDN 加载，还能命中 CDN 的跨站点缓存：

```javascript
// vue.config.js
module.exports = {
  configureWebpack: {
    externals: {
      // key: 源码里 import 的名字；value: 全局变量名（CDN 挂到 window 上）
      'element-ui': 'ELEMENT',
      'echarts': 'echarts'
    }
  }
}
```

然后在 `public/index.html` 用 CDN script 引入，注意顺序（必须在业务代码之前加载完）：

```html
<!DOCTYPE html>
<html lang="zh">
<head>
  <!-- CDN 提前加载，利用浏览器并行下载 -->
  <link rel="stylesheet" href="https://cdn.example.com/element-ui/index.css">
</head>
<body>
  <div id="app"></div>
  <script src="https://cdn.example.com/vue/v2.6.14/vue.runtime.min.js"></script>
  <script src="https://cdn.example.com/element-ui/index.js"></script>
  <!-- 业务 bundle 最后加载 -->
  <script src="/js/app.js"></script>
</body>
</html>
```

这里有个关键点：**CDN 拿到的是运行时+CDN 上的压缩文件，而且是物理上更接近用户的节点，下载速度通常比源站快**。医疗系统中，ECharts 这种只在数据可视化页出现的库尤其适合抽 CDN——不进主 chunk，用到的页面按需加载。

> 💬 **面试官**：externals 和 CDN 如何配合？设置了 externals 后 import 语句还会生效吗？
>
> ✅ 标准答案：`externals` 告诉 webpack「这些模块不用打包，运行时从全局变量取」。源码中的 `import ECharts from 'echarts'` 会编译成 `ECharts = window.echarts`，由 CDN 提前挂载的全局变量提供。
>
> 🎁 加分答案：能说清**抽取时机**——构建时 externals 排出、CDN 加载打全局，两者缺一不可；CDN 挂了会导致运行时报错，生产要加 CDN 资源容错（动态注入并检测失败兜底）。

### gzip / Brotli 压缩

即使代码体积优化了，传输层还能再省一层。gzip / Brotli 在服务端压缩后传给浏览器，传输体积能再缩小 60-70%。

用 `compression-webpack-plugin` 在构建期就产出 `.gz` / `.br` 文件，配合 Nginx 的静态预压缩，不用在请求时实时压缩（省 CPU）：

```javascript
// vue.config.js
const CompressionWebpackPlugin = require('compression-webpack-plugin')

module.exports = {
  configureWebpack: {
    plugins: [
      new CompressionWebpackPlugin({
        algorithm: 'gzip',            // 或 'brotliCompress'
        test: /\.(js|css|less|html)$/,
        threshold: 10240,              // 超过 10KB 才压缩
        minRatio: 0.8
      })
    ]
  }
}
```

Brotli（算法 `brotliCompress`）压缩率比 gzip 高 15-20%，现代浏览器都支持。Nginx 配置优先用 Brotli，回退 gzip：

```nginx
# nginx.conf
gzip on;
gzip_static on;        # 直接发送构建产出的 .gz 文件，不实时压缩
gzip_types text/plain text/css application/javascript;
brotli on;             # 需要 ngx_brotli 模块
brotli_static on;
```

> 💬 **面试官**：gzip 和 Brotli 区别？`gzip_static on` 是干什么的？
>
> ✅ 标准答案：Brotli 压缩率更高（比 gzip 提升 15-20%）但压缩耗 CPU，两者都是无失真文本压缩。`gzip_static on` 让 Nginx 直接发送预生成的 `.gz` 文件，省去请求时实时压缩的 CPU 开销。
>
> 🎁 加分答案：能说清**压缩放在构建期还是请求期**的取舍——构建期压缩（compression-webpack-plugin）不耗运行时 CPU，代价是产物体积多一份 .gz/.br；请求期压缩省磁盘但每次都要算一遍。生产对大文件优先构建期预压缩。

### Tree Shaking + Bundle 分析

做任何构建优化前，先看「体积花在了哪」。`webpack-bundle-analyzer` 输出依赖树的可视化图表，能定位异常大的依赖（比如把 whole lodash 当了一个依赖导入）：

```bash
# 安装分析插件
npm i -D webpack-bundle-analyzer

# vue.config.js 里按环境开关
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
module.exports = {
  configureWebpack: {
    plugins: process.env.NODE_ENV === 'production' && process.env.npm_config_report
      ? [new BundleAnalyzerPlugin()]
      : []
  }
}
```

**Tree Shaking（摇树优化）** 依赖两个前提才能生效：
- ES Module（`import`/`export`），webpack 只对 ESM 做静态分析
- 包声明了 `sideEffects: false`，告诉打包器「导入这个模块不会产生副作用，未使用的导出可以删掉」

```javascript
// lodash 这种要用按需导入，不要整体导入
// ❌ import _ from 'lodash'           // 整个库 500KB+ 全进 bundle
// ✅ import { debounce } from 'lodash-es'  // 只摇出 debounce

// package.json 里声明 sideEffects
{
  "sideEffects": false   // 或 ["*.css"] 有副作用的文件列出来
}
```

组件库按需引入也属于这个思路——Element UI 虽然整体挂在全局，但要走 `babel-plugin-component` 按需编译，只打包用到的组件。

---

## 🏗️ 二、加载层：让首屏等待更短

构建层决定「要下载多少」，加载层决定「怎么下载更快」。核心是**缓存**和**预加载**两个杠杆。

### 文件指纹 + HTTP 缓存策略

webpack 用 `[contenthash]` 给文件名打指纹——内容变化，文件名变，浏览器自然请求新文件；内容没变，文件名不变，命中强缓存。这是「最长缓存 + 自动失效」的黄金组合：

```javascript
// 产物文件名带 contenthash，内容变 → 文件变
output: {
  filename: 'js/[name].[contenthash:8].js',
  chunkFilename: 'js/[name].[contenthash:8].chunk.js'
}
```

配合 Nginx 缓存头：

```nginx
# index.html 不能强缓存（它内容总变，要重新拉取新资源引用）
location = /index.html {
  add_header Cache-Control "no-cache";   # 每次 revalidate
}

# 静态资源（带 hash 的文件名）可以强缓存一年
location ~* \.(js|css)$ {
  expires 1y;
  add_header Cache-Control "public, max-age=31536000, immutable";
}
```

**为什么 `index.html` 不能强缓存**：它是入口，里面引用了带 hash 的文件名。如果它被强缓存，用户就永远拿不到新版本。`no-cache` 保证每次向服务器确认「有没有新 index.html」，而带 hash 的静态文件则可以放心强缓存——文件名变了就自动请求新的。

> 💬 **面试官**：contenthash 的原理？为什么 index.html 不能强缓存？
>
> ✅ 标准答案：`[contenthash]` 基于文件内容生成哈希，内容变化文件名才变化，从而实现「内容不变永远命中缓存，内容变了自动失效」。index.html 引用了这些文件名，如果它被强缓存，浏览器不会向服务器要新入口文件，就永远拿不到更新。
>
> 🎁 加分答案：能补充分包策略——把 vendor / common 单独拆 chunk，这样业务代码频繁变，而第三方库常用部分命中长期缓存，更新时不用重下整个库。

### prefetch / preload

- `preload`：当前页面**就需要**的高优先级资源，尽早加载（字体、首屏图片、关键 CSS/JS）
- `prefetch`：**下一步可能用**的低优先级资源，浏览器空闲时加载

```html
<!-- preload：当前页首屏关键资源，立即加载 -->
<link rel="preload" href="/fonts/roboto.woff2" as="font" crossorigin>
<link rel="preload" href="/js/app.js" as="script">

<!-- prefetch：下一路由可能用到的资源，空闲时预加载 -->
<link rel="prefetch" href="/js/drug-detail.chunk.js">
```

`vue-cli` 构建时默认会给懒加载 chunk 自动注入 `prefetch`（`rel=prefetch`），这是「路由懒加载」和「登录后第一跳秒开」之间的一条隐板。

> 💬 **面试官**：preload 和 prefetch 的区别？
>
> ✅ 标准答案：preload 优先级高、当前页必要资源、尽早加载；prefetch 优先级低、预取下一步可能用到的资源、空闲时加载。preload →「我马上要用」；prefetch →「你可能等一下会用」。
>
> 🎁 加分答案：能指出**资源之间也有依赖**——preload 可用于字体/首屏图（避免 FOUT/FOIT），prefetch 用于「用户登录后的第一跳」页面，让后续切换近似秒开。滥用 preload 会挤占带宽（所以首屏资源要克制）。

### 图片懒加载 + WebP + 响应式图片

图片往往是页面体积最大的部分。三个手段组合：

**懒加载**——滚动到视口附近才加载，用 `vue-lazyload`：

```vue
<template>
  <!-- 滚动到可视区域才触发 request，替换 src -->
  <img v-lazy="drug.image">
</template>

<script>
import Vue from 'vue'
import VueLazyload from 'vue-lazyload'
Vue.use(VueLazyload, {
  preLoad: 1.3,               // 提前 1.3 倍视口高度开始加载
  loading: defaultImg,        // 占位图
  error: errorImg,            // 加载失败图
  attempt: 1                  // 重试次数
})
</script>
```

**WebP**——体积比 JPEG 小 25-35%，现代浏览器原生支持：

```vue
<template>
  <picture>
    <!-- WebP 优先，不支持则回退 jpg -->
    <source type="image/webp" :srcset="drug.image + '.webp'">
    <img :src="drug.image + '.jpg'" :alt="drug.name">
  </picture>
</template>
```

**响应式图片**——按屏幕分辨率加载不同尺寸，`srcset` + `sizes` 交给浏览器选：

```html
<!-- 窗口越宽下载的图越大；retina 屏也适配 -->
<img
  srcset="drug-320.jpg 320w, drug-640.jpg 640w, drug-1280.jpg 1280w"
  sizes="(max-width: 640px) 320px, 640px"
  src="drug-640.jpg"
  alt="药品图片"
>
```

> 💬 **面试官**：图片优化的手段有哪些？为什么视频/图片是首屏最大瓶颈？
>
> ✅ 标准答案：懒加载（滚动才请求）、WebP 格式（体积小 25-35%）、响应式图片（srcset 按分辨率选尺寸）、CDN 分发。
>
> 🎁 加分答案：能说清浏览器的**解码策略**——优先加载首屏/LCP 关键图片，非关键图 lazy；用 `loading="lazy"` 原生属性兜底（不依赖库）；WebP 用 `<picture>` + `<source>` 优雅降级，旧浏览器自动回退 jpg。

### 骨架屏

一个加载中的列表，Spinner 只有一个转圈 icon，而**骨架屏（Skeleton）用灰色的块模拟最终布局结构**，让用户知道「内容长什么样，正在填东西」。感知等待时间大幅缩短，同时减少了布局偏移（CLS）。

```vue
<template>
  <div v-if="loading" class="skeleton">
    <!-- 匹配真实药品卡片的布局骨架 -->
    <div class="drug-card" v-for="n in 6" :key="n">
      <div class="thumb shimmer"></div>
      <div class="lines">
        <div class="line w60 shimmer"></div>
        <div class="line w40 shimmer"></div>
      </div>
    </div>
  </div>
  <!-- 数据到达后替换为真实列表 -->
  <el-table v-else :data="list"> ... </el-table>
</template>

<style scoped>
.shimmer {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}
@keyframes shimmer { 0% { background-position: 100% 50% } 100% { background-position: 0 50% } }
</style>
```

> 💬 **面试官**：骨架屏相比 loading 图/Spinner 的优势？
>
> ✅ 标准答案：骨架屏模拟最终布局结构，让用户提前建立空间认知，感知等待时间更短；同时固定了元素占位，避免数据到达时布局跳动（减少 CLS）。
>
> 🎁 加分答案：能提「骨架屏的实现不只在组件层」——可以在服务端/构建期注入静态首屏骨架（`vue-skeleton-webpack-plugin`），白屏期就渲染骨架，连首屏 JS 都还没下载完时就有内容。

---

## ⚡ 三、运行时层：减少不必要的渲染与计算

前两层解决「加载」，运行时才是 Vue 性能优化的主战场。运行时再分三层递进：**数据层 → 组件层 → 渲染层**。

### 数据层：降响应式成本

**Object.freeze 冻结只读大数据**

对象一旦被观察，`Observer.walk` 会递归地把每个属性都 `defineReactive` 一遍。对 10000 条药品数据，这是数万次 defineProperty——初始化就是一场灾难。但有些数据**根本不需要响应式**（只读的药品目录、ICD 码表、配置项），`Object.freeze` 冻结它，Observer 会直接跳过：

```javascript
// src/core/observer/index.js —— Object.isFrozen 判断
class Observer {
  constructor(value) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    def(value, '__ob__', this)
    if (Array.isArray(value)) {
      // 数组：重写变异方法
      this.observeArray(value)
    } else {
      // 对象：Object.isFrozen 判断 → 冻结对象直接跳过可观察处理
      this.walk(value)
    }
  }

  walk(obj) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])   // 每个属性 defineProperty
    }
  }
}
```

真正的「跳过」在 `Observer` 工厂入口（`observe()` 方法）里用 `Object.isFrozen` 判断：

```javascript
function observe(value, asRootData) {
  // ...
  if (Object.isFrozen(value)) {   // 👈 冻结对象不再深入观察
    return
  }
  let ob = new Observer(value)
  // ...
}
```

**注意**：`Object.freeze` stop 的是「响应式」，不是「那这个对象还能不能读」。冻结对象的属性可通过 `obj` 正常访问，只是 Vue 不为它建立 getter/setter 依赖。这就是为什么它适合**只读大数据**——不需要响应式，就省掉整棵递归观察的开销。

> 💬 **面试官**：Object.freeze 冻结的数据为什么不是响应式的？Observer 在哪判断？
>
> ✅ 标准答案：Vue 的 `observe()` 入口用 `Object.isFrozen()` 判断，冻结的对象直接 `return`，不创建 Observer、不递归 defineProperty，所以没有 getter/setter，自然不响应。
>
> 🎁 加分答案：能说清**代价**——冻结后这个对象被推入视图也不会自动更新（没有依赖）；所以它只能用于「确认永不修改」的数据。面试时可补一句「大数据列表可以先 frozen，若后端偶尔变数据则可整体替换引用（整个数组重新赋值仍是响应式的）」。

**避免深层嵌套响应式 + 非响应数据不进 data**

Observer 递归是 O(属性数量) 的初始化成本，嵌套越深越贵。3 层以上的深层对象每次改动都要 diff 整个子树。两招规避：

```javascript
// ❌ 三层以上深层嵌套，Observer 全递归
data() {
  return {
    patient: {
      profile: {
        basic: { name: '', phone: '' },   // 第 3 层，响应式递归到这里
        history: { ... }
      }
    }
  }
}

// ✅ 扁平化 / 拆成独立可观察对象
data() {
  return {
    patientName: '',
    patientPhone: '',
    medicationHistory: []    // 深度更浅
  }
}
```

不需要响应式、纯运行时的缓存值（计算中间态、只读配置）不要塞进 `data`，放进实例属性（`this._xxx`）不会被观察：

```javascript
// ❌ 非响应数据也放 data，白白增加响应式成本
data() {
  return {
    thead: ['编号', '名称', '库存'],   // 静态表头，从不变化
    constants: { PAGE_SIZE: 20 }
  }
}

// ✅ 静态常量放组件外部 / 实例属性
const THREAD = ['编号', '名称', '库存']      // 组件外定义，不是响应式
export default {
  created() { this._pageSize = 20 }          // 实例属性，不会被观察
}
```

---

### 组件层：减少不必要实例化

**渲染策略四选一：v-if / v-show / v-once / 函数式组件**

这四者是「同一个元素到底怎么处理」的决策问题，本质是**销毁重建 vs 保留切换**的博弈。先记决策矩阵：

| 手段 | 机制 | 适用场景 | 成本 |
|------|------|---------|------|
| `v-if` | 条件为假时**不渲染节点** | 条件稳定不常变 | 每次切换销毁/重建 DOM |
| `v-show` | 条件为假时 `display:none` | 频繁切换显示隐藏 | 节点永远保留在 DOM |
| `v-once` | 渲染一次，后续 diff 跳过 | 完全静态的内容 | 后续不再响应 |
| `函数式组件` | 无实例无响应式 | 纯展示的叶节点组件 | 初始化极轻 |

**v-if vs v-show**

`v-if` 在编译时会变成三元表达式（`genIfConditions`），条件不满足整段不渲染、DOM 都不存在；`v-show` 编译成指令，节点永远在 DOM，只是通过 `style.display` 切换显隐：

```javascript
// src/platforms/web/runtime/directives/show.js —— v-show 指令
{
  bind(el, { value }, vnode) {
    const originalDisplay = el.__vOriginalDisplay =
      el.style.display === 'none' ? '' : el.style.display
    el.style.display = value ? originalDisplay : 'none'
  }
}
```

**核心口诀**：`v-if` 有初始渲染成本 + 切换的销毁/重建成本，省的是「不显示时的内存」；`v-show` 保留 DOM，切换只是改 style，省的是「频繁切换的开销」。

- 频繁切换（tab、展开收起）→ `v-show`（省销毁重建）
- 条件稳定（权限判断、骨架屏分支）→ `v-if`（省常驻 DOM 内存 + 初始不渲染）

**v-once**：完全静态、只渲染一次的节点，加 `v-once` 让 Vue 渲染一次后缓存 VNode，后续 diff 直接跳过去：

```vue
<template>
  <div>
    <!-- 静态页头，永远不变 -->
    <header v-once>
      <h1>药品库存管理系统</h1>
    </header>
    <!-- 下方动态内容不受影响 -->
    <el-table :data="list"> ... </el-table>
  </div>
</template>
```

**函数式组件**：`functional: true` 时组件**没有实例、没有响应式数据、没有生命周期**，渲染时直接跳到 `createFunctionalComponent`，跳过整个 `initState`（data 观测、computed、watch 初始化全省了）：

```javascript
// 函数式组件定义：props + 渲染函数即可
const DrugListItem = {
  functional: true,            // 关键标记
  props: { drug: Object },
  render(h, ctx) {
    const { drug } = ctx.props
    return h('li', { class: 'drug-item' }, [
      h('span', drug.name),
      h('span', { class: 'stock' }, `库存 ${drug.stock}`)
    ])
  }
}

// 模板里直接用
// <drug-list-item v-for="d in list" :drug="d" :key="d.id" />
```

适合**组件树里大量重复的纯展示叶节点**（比如列表每行的复杂单元、图标、纯结构模板）——每个实例省掉初始化，数量上去之后收益明显。

> 💬 **面试官**：函数式组件为什么渲染性能更好？适用于哪些场景？
>
> ✅ 标准答案：函数式组件没有实例、没有响应式数据、没有生命周期（无 this），渲染时走 `createFunctionalComponent` 路径，跳过 `initState`（data 观测、computed、watch 初始化），重量更轻。
>
> 🎁 加分答案：能说清**适用边界**——适合纯展示的叶节点（大量重复的列表单元）；数据来自 props 而非自身 state，不需要响应式；若组件有自己状态/需要生命周期，就不能函数化。数量少时收益可忽略，列表内循环渲染时收益显著。

**computed 缓存 vs methods**

`:value` 直接用 methods 每次渲染都会重算，`computed` 有 dirty flag 缓存——依赖的响应式值不变，直接返回上一次结果，不重新执行函数：

```javascript
// ❌ methods：每次渲染 / 每次调用都重新 filter
methods: {
  validDrugs() {
    return this.list.filter(d => d.stock > 0)   // 渲染 10 次，算 10 次
  }
}

// ✅ computed：依赖不变，只用一次算出的缓存值
computed: {
  validDrugs() {
    return this.list.filter(d => d.stock > 0)   // 只有 list 变了才重算
  }
}
```

dirty flag 是 Vue computed 的核心：首次取值置 dirty=false，依赖收集；之后依赖不变直接返回缓存；依赖变了置 dirty=true，下次取值重算。这在前面响应式文章已深挖过，这里记住结论——**凡是「由现有 state 派生」的值，一律用 computed 而非 methods**。

**合理使用 key**

`key` 是 diff 时判断「节点是否可复用」的标识。用错的代价是隐藏的 bug + 无意义的重建：

```vue
<!-- ❌ 用 index 做 key：列表增删时节点错乱复用 -->
<li v-for="(d, i) in list" :key="i">       <!-- 插入/删除时 index 全变，复用错乱 -->

<!-- ✅ 用业务唯一 id：每个节点可被精确定位 -->
<li v-for="d in list" :key="d.id">
```

反面场景：一个包含输入框的列表项，用 index 做 key，你删了第一项，第二项的输入框内容会「错位」粘到第一项上——因为 key=0 的节点复用了，内部状态（输入框 value）没被重置。

`key` 还能当「强制重建」开关——想重置一个自带内部状态的子组件，给它的 key 换值，Vue 会销毁重建：

```vue
<!-- 切库存批次时整个表单清零：换 key 强制重建 -->
<el-form :key="batchId" :model="form"> ... </el-form>
<el-button @click="batchId++">切换批次</el-button>
```

> 💬 **面试官**：v-for 里为什么不能用 index 作 key？key 的作用是什么？
>
> ✅ 标准答案：key 是 diff 时判断节点复用性的唯一标识。用 index 时，列表增删会造成 index 整体偏移，节点被错误复用，导致输入框内容错位、渲染异常；业务唯一 id 才能精确定位每个节点。
>
> 🎁 加分答案：能补充**强制重建**的用法——`<comp :key="version">` 换 key 等价于销毁重建，是重置组件内部状态（表单、canvas、第三方插件实例）的更优雅手段；还能顺带提 diff 是同层级对比、key 帮助最小化 DOM 操作。

---

### 渲染层：降大量 DOM 的成本

**keep-alive + LRU 缓存**

组件被切换时默认销毁重建，频繁切换「列表页 → 详情页 → 列表页」每次都重新请求 + 重新渲染。`keep-alive` 把组件实例**缓存在内存**，切换回来不再重建：

```vue
<template>
  <!-- 缓存 drug-list 组件实例，切走不销毁 -->
  <keep-alive>
    <router-view v-if="$route.name === 'drug-list'" />
  </keep-alive>
</template>
```

**LRU 缓存策略**：缓存实际上是一个维护「最近最久未使用」顺序的 Map。每次访问把 key 移到最前，缓存满了（超过 `max`）淘汰最久未访问的那个：

- 每次渲染 `vnode.key`，从 Map 中取出并删除，再重新插入（移动到最新）
- 超过 `max` 时，取出最早的 key，调用它的 `destroyed`（注意不是 `deactivated`），然后销毁

```vue
<!-- max：最多缓存 10 个组件，超出淘汰最久未访问的 -->
<keep-alive :max="10">
  <router-view :key="$route.fullPath" />
</keep-alive>
```

**生命周期变化**——这是 keep-alive 最容易答错的点：

- 首次进入缓存组件：`beforeCreate → created → mounted → activated`
- 从缓存回来：**只触发 `activated`**，不再走 `created/mounted`
- 被缓存、切走：触发 `deactivated`
- （第二次及以后进入不再走 created/mounted）

所以缓存组件里请求数据要放在 `activated` 里，而不是 `mounted`（第一次 mounted 会触发，但后续从缓存回来 mounted 不会再次触发，`activated` 每次回来都会触发）：

```javascript
activated() {
  // 每次都执行：刷新数据（从缓存回来也会刷新）
  this.fetchDrugList()
}
```

**max 参数淘汰时触发 `destroyed`，不是 `deactivated`**——因为被淘汰的组件要真销毁并释放内存，而 `deactivated` 只是暂时离开未销毁。

> 💬 **面试官**：keep-alive 的缓存策略是什么？max 参数触发哪个生命周期？
>
> ✅ 标准答案：LRU（最近最久未使用）。缓存用 Map 维护访问顺序，新访问的组件移到最新，超过 `max` 时淘汰最久未访问的组件；`activated/deactivated` 替代 `created/destroyed`。
>
> 🎁 加分答案：关键考点——**超过 max 淘汰时触发的是 `destroyed` 而不是 `deactivated`**（被淘汰的组件要真正销毁释放内存）；请求数据放在 `activated` 而非 `mounted`（每次从缓存回来都会触发 activated，mounted 只在首次）。配合文末源码解析 invokeInsertHook 讲原理更稳。

**虚拟列表**

当列表有几千上万条时，哪怕每行只是几毫秒渲染，整体 cumulate 就是白屏。虚拟列表的思路：**只渲染可视区域内的那一小段 DOM**，滚动时动态替换，永远只有 N 个节点在页面上：

```
滚动容器（高度固定，overflow: auto）
  │  内容总高度 = itemCount × itemHeight   ← 撑出完整滚动条
  │  ▼可视区▼
  │  [startIndex]  ← 第 startIndex 个 item
  │  [startIndex+1]
  │  [startIndex+2]             ← 只渲染可视区这 ~10 个节点
  │  └────────────┘
  容器整体用 transform: translateY 对齐可视区起点
```

可视区两个关键值，滚到哪、从哪渲染、整体位移多少：

```javascript
// scrollTop：容器已滚动高度；clientHeight：可视高度；itemHeight：每项固定高度
const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferedCount)
const visibleCount = Math.ceil(clientHeight / itemHeight) + bufferedCount * 2
const endIndex = startIndex + visibleCount
const offsetY = startIndex * itemHeight   // 容器 translateY，保证第一项从顶部开始

// render 时：
// 只渲染 [startIndex, endIndex) 范围内 item，其余用占位 div 撑高度
```

**为什么加 bufferedCount（缓冲）**：滚动很快时，如果只渲染精确可视区的节点，会出现「滚太快，新一屏还没渲染出来」的白块闪烁。前后各多渲染几项做缓冲，滚动更平滑。

生产环境通常直接用现成库 `vue-virtual-scroller`，它会帮你处理动态高度、缓冲、滚动时机：

```vue
<template>
  <!-- 10 万条药品只渲染可视区 -->
  <virtual-scroller :items="drugList" :item-height="40" class="scroller" v-slot="{ item }">
    <div class="drug-row">
      <span>{{ item.name }}</span><span>{{ item.stock }}</span>
    </div>
  </virtual-scroller>
</template>
```

> 💬 **面试官**：虚拟列表的核心原理？如何计算可视区范围？
>
> ✅ 标准答案：只渲染可视区域内的 DOM 节点。`startIndex = scrollTop / itemHeight`，`endIndex = startIndex + (clientHeight / itemHeight)`，容器用 transform 平移对齐。可见节点数恒定，DOM 数量不随数据量增长。
>
> 🎁 加分答案：能讲出**占位 + 缓冲**——整列高度用 `itemCount × itemHeight` 撑出滚动条；前后加 bufferedCount 防止滚动白块闪烁；项高度不固定时需用测量动态计算（这就是 vue-virtual-scroller 比你手写的部分）。面试是讲思路，不必真手写完整库。

**防抖 / 节流 + .passive**

用户高频输入 / 高频滚动会触发大量重复请求或重渲染。防抖（debounce）合并连续触发、节流（throttle）保证最小间隔：

```javascript
// 搜索框防抖：停止输入 300ms 后才发请求，避免每次按键都请求
methods: {
  onSearch: debounce(function (q) {
    this.fetchDrug(q)          // 只会发最后一次
  }, 300)
}

// 滚动节流：最多每 16ms（对齐 60fps）执行一次位置计算
methods: {
  onScroll: throttle(function () {
    this.updateVisibleRange()  // 高频滚动不卡顿
  }, 16)
}
```

滚动性能的隐藏杀手是**浏览器等待 JS 判断是否阻止默认行为**。`.passive` 修饰符明确告诉浏览器「这段滚动监听不会调用 preventDefault」，浏览器可以放心在滚动线程处理，不等 JS：

```vue
<!-- 长列表/长处方的触控滚动，加 .passive 提升流畅度 -->
<div @scroll.passive="onScroll"> ... </div>
```

> 💬 **面试官**：防抖和节流的区别？`.passive` 是什么？
>
> ✅ 标准答案：防抖（连续触发只执行最后一次，适合搜索）、节流（保证最小执行间隔，适合滚动/窗口 resize）。`.passive` 告诉浏览器监听器不会阻止默认行为，滚动可以并行处理不等 JS，提升流畅度。
>
> 🎁 加分答案：能结合事件循环讲滚动卡顿根因——被动事件监听器让浏览器能走「快速路径」，不用等主线程；`.passive` 的代价是 `preventDefault()` 失效，所以滚动类监听不该在里面调 preventDefault。

---

## ⚡ 四、内存稳定性：让页面跑得久

前三层是「首屏快」，内存层是「用久了不卡、不崩」。Vue 最经典的坑：**组件销毁了，但它监听的事件、定时器、WebSocket 还活着**，导致旧组件内存无法回收，页面越用越慢。

### 事件监听清理三件事

组件在 `beforeDestroy` 里必须清掉三类「挂在外部的东西」，否则销毁后它们还在占用：

```javascript
export default {
  data() {
    return {
      timerId: null        // 定时器 id 务必保存，否则无处可 clear
    }
  },
  created() {
    // 1. 定时器/轮询 —— 不清理就永久跑下去
    this.timerId = setInterval(this.refreshStock, 5000)

    // 2. EventBus 中央总线 —— 不 $off，事件一直残留
    this.$bus.$on('stockChanged', this.onStockChanged)

    // 3. WebSocket / 第三方库实例 —— 不 close，连接和回调都泄漏
    this.ws = new WebSocket('wss://...')
    this.ws.onmessage = this.onMessage
    this.chart = echarts.init(this.$refs.chart)
  },
  beforeDestroy() {
    // 三件事：清定时器 / 解绑事件总线 / 关闭连接与销毁实例
    clearInterval(this.timerId)
    this.$bus.$off('stockChanged', this.onStockChanged)  // 必须传同一函数引用
    this.ws.close()
    this.chart.dispose()
  }
}
```

有个细节非常坑：**`$off` 必须传「同一个函数引用」才生效**。如果在 methods 里写 `this.$bus.$on(...)` 用的是内联箭头函数，那 `$off` 传和它字面相同但实际不同的函数，事件压根移除不掉。所以 `$on` 和 `$off` 要用**同一个具名方法引用**。

### `$once + hook:beforeDestroy` 自动清理

手写 `beforeDestroy` 有个问题：清理逻辑和使用处隔了两块代码，容易漏、容易忘。用 `$once('hook:beforeDestroy', ...)` 可以**在使用处就地注册自动清理**，逻辑内聚：

```javascript
export default {
  mounted() {
    const timer = setInterval(this.refreshStock, 5000)

    // 就地注册：组件销毁前自动 clearInterval，一句话搞定，不再依赖手动 beforeDestroy
    this.$once('hook:beforeDestroy', () => {
      clearInterval(timer)
    })
  }
}
```

为什么可行？Vue 内部用 `callHook` 发布生命周期事件，而 `beforeDestroy` 就是一个可被 `$once/$on` 订阅的 hook 事件（`hook:beforeDestroy`），`$once` 订阅了一次性执行。这套监听是 Vue 生命周期发布-订阅机制的一部分——**清理副作用的逻辑和创建副作用写在同一处，只要创建处存在就必然被清理**。

### 内存泄漏排查三板斧

如果已经泄漏、想定位，三招配合：

**第一板斧：Chrome Memory 快照对比**
反复执行「进入页面 → 离开页面 → 再次进入」，每次做一次 Heap Snapshot，对比内存是否持续增长、**离开后未回收的组件对象**是什么：

```
Chrome DevTools → Memory → Heap Snapshot
  ① 进入页面前快照 A
  ② 进入页面 → 离开页面
  ③ 快照 B
  ④ 对比两个快照的 delta —— 如果 B 比 A 明显增加，且是组件实例/监听器 → 泄漏
```

**第二板斧：Vue Devtools 组件树**
打开 Vue Devtools 的组件树，离开一个页面后，看这个页面的组件是否**真的从树里消失**。若组件还在（被缓存/被引用），说明没销毁；配合 `$isDestroyed` 或者看它是否还挂在根实例上。

**第三板斧：定时器 ID 追踪**
把项目里所有定时器 ID 收进一个数组统一管理，`beforeDestroy` 统一批量清除。排查时也可以全局存一下 timer 数量，看离开页面后是否归零：

```javascript
// utils/cleanup.js —— 全局定时器登记，统一释放
const timers = new Set()

export function addTimer(id) { timers.add(id) }
export function clearAllTimers() {
  timers.forEach(id => clearInterval(id))
  timers.clear()
}
```

> 💬 **面试官**：Vue 2 内存泄漏的常见原因？如何排查防范？
>
> ✅ 标准答案：常见原因——组件销毁后定时器未清理（无限自增内存）、EventBus `$on` 未 `$off`、WebSocket/第三方库实例未销毁、全局变量/闭包持有已卸载组件。解决：`beforeDestroy`（或 `$once('hook:beforeDestroy')`）统一清理这三类。
>
> 🎁 加分答案：能给出排查方法论——Chrome Heap Snapshot 快照对比找增量、Vue Devtools 组件树确认是否真的销毁、定时器 ID 统一登记批量清除；并强调 `$off` 必须传同一函数引用的坑。

---

## 🧩 五、源码解析：性能优化背后的四段关键代码

> 源码来源：GitHub 上搜索 `vuejs/vue`（Vue 2 主仓库），对应 `src/core/observer/index.js`、`src/core/vdom/create-functional-component.js`、`src/core/vdom/patch.js`、`src/core/observer/scheduler.js`。

### Observer.walk 里的 Object.isFrozen

返回文章「数据层」提到的运行时优化——`Object.freeze` 能让 Vue 跳过响应式。它的前提正是这段代码：

```javascript
// src/core/observer/index.js —— observe 入口
export function observe(value, asRootData) {
  if (!isObject(value) || value instanceof VNode) return
  let ob
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__   // 已经观察过，复用
  } else if (shouldObserve && !isServerRendering() && (Array.isArray(value) || isPlainObject(value)) && Object.isExtensible(value) && !value._isVue) {
    ob = new Observer(value)    // 👈 关键判断
  }
  return ob
}

// Observer 构造函数里对对象类型调用 walk
class Observer {
  constructor(value) {
    // ...
    if (Array.isArray(value)) {
      this.observeArray(value)      // 数组：重写变异方法
    } else {
      this.walk(value)              // 对象：逐属性 defineReactive
    }
  }
}
```

真正挡下冻结对象的判断在 `observe()` 的 `Object.isExtensible(value)`——`Object.freeze` 做的正是让对象 **不可扩展**（`isExtensible` 返回 false），所以冻结对象直接不进入 `new Observer`，从而**不会递归 `defineReactive` 建立依赖**。这是响应式与性能之间的第一道闸门：凡是把 `Object.freeze` 塞进 JSON 都能省掉整棵递归观察开销。

### 函数式组件为什么能跳过 initState

组件渲染性能差异的根因在 `_createElement` 的分支判断——`functional: true` 的组件走完全不同的路径：

```javascript
// src/core/vdom/create-component.js —— 创建组件 vnode 时
if (isTrue(Ctor.options.functional)) {
  // 👈 functional 组件：无实例、无 state，直接生成函数式组件 vnode
  //    不走下面 new Ctor + initInstance，也就不跑 initState（data/computed/watch 初始化）
  return createFunctionalComponent(Ctor, propsData, data, context, children)
}

const listeners = data.on
data.on = data.nativeOn          // 只有普通组件走 installComponentHooks
installComponentHooks(data)      // 安装组件相关钩子（函数式组件跳过了）
// ...
```

普通组件创建 vnode 后会 `initInstance`（`new Ctor()` → `_init` → `initState`），而函数式组件在 `createFunctionalComponent` 直接基于 `render` 函数产出。所以**没有实例、没有响应式 data 观测、没有 computed/watch 初始化、没有生命周期钩子**——渲染链路短了一大截，特别适合大量重复的纯展示组件。

### keep-alive activated/deactivated：patch 的 invokeInsertHook

`keep-alive` 的 `activated/deactivated` 生命周期，本质是在 `mountComponent` 的 patch 过程中通过 `invokeInsertHook` 触发的。核心代码在 `patch.js`：

```javascript
// src/core/vdom/patch.js —— createElm 之后调用
function invokeInsertHook(vnode, queue, initial) {
  if (isTrue(initial) && isDef(vnode.parent)) {
    vnode.parent.data.pendingInsert = queue
  } else {
    for (let i = 0; i < queue.length; ++i) {
      queue[i].data.hook.insert(queue[i])    // 调用组件的 insert hook
    }
  }
}
```

而当 `keep-alive` 渲染组件时，`render` 函数里通过 `getFirstComponentChild` 找到缓存命中的组件，走 `insert(vnode, parentElm, refElm)`：

```javascript
// src/core/components/keep-alive.js —— 命中缓存时
render() {
  // ...
  // 命中缓存：复用缓存的 vnode，并把它从缓存 List 里移除重插（LRU 更新）
  if (cache[key]) {
    vnode.componentInstance = cache[key].componentInstance
    remove(this.keys, key)
    this.keys.push(key)          // 移到「最新」
  } else {
    this.cache[key] = vnode      // 未命中：缓存
    this.keys.push(key)
    if (this.max && this.keys.length > parseInt(this.max)) {
      // 超出 max：淘汰最久未访问的，触发它的 destroyed（不是 deactivated）
      pruneCacheEntry(this.cache, this.keys[0], this.keys, this._vnode)
    }
  }
  // ...
}
```

**关键记忆点**：
- `pruneCacheEntry` 淘汰最久未访问组件时调用的是 `vnode.componentInstance.$destroy()` —— 所以是 **`destroyed`，不是 `deactivated`**
- 命中缓存复用组件实例时，走的是组件的 **`activated`**，不再走 `created/mounted`——这也是为什么缓存组件的数据请求必须放 `activated`

### flushSchedulerQueue：多次 data 变更只触发一次渲染

Vue 的「批量更新」是运行时性能的基石——`setInterval` 里连续改 5 个属性，不会触发 5 次渲染，而是合并成 1 次。核心在 `scheduler.js`：

```javascript
// src/core/observer/scheduler.js —— 更新调度
let queue = []            // 待更新 watcher 队列
let has = {}              // 去重：同一 watcher 只入队一次
let flushing = false      // 是否在 flush 中

function queueWatcher(watcher) {
  const id = watcher.id
  if (has[id] == null) {        // 去重，多次赋值只入队一次
    has[id] = true
    if (!flushing) {
      queue.push(watcher)
    } else {
      // 已在 flush 中，按 id 插入排序
      let i = queue.length - 1
      // ...
    }
    // 在下一 tick 才真正 flush，一个事件循环里多次变更合并为一次
    nextTick(flushSchedulerQueue)
  }
}

function flushSchedulerQueue() {
  flushing = true
  queue.sort((a, b) => a.id - b.id)      // 按 watcher 创建顺序执行
  for (let i = 0; i < queue.length; i++) {
    const watcher = queue[i]
    watcher.run()                        // 触发一次渲染
  }
  // ... 还原状态、清空队列
}
```

这解释了面试题里常问的「**Vue 为什么能有一次更新 → 一次渲染**」：`queueWatcher` 用 `has[id]` 去重 + `nextTick` 微任务调度，一个宏任务内对同一组 watcher 的 N 次修改，合并成下一个微任务里的一次 `watcher.run()`。

---

## 💡 六、医疗场景实战：药品目录 10000 条数据优化全程

从一个真实的药品管理系统看全链条优化怎么落地。**背景**：一个医疗平台的药品目录页，一次性下发 10000 条药品数据（含通用名、商品名、规格、厂商、库存），列表页打开白屏 3 秒以上，滚动还掉帧。

**第一步：测量定位瓶颈（对应第〇节）**
用 Chrome Performance 录制首屏，发现 `Scripting` 高得吓人——10000 条数据全部被 Observer 递归 `defineReactive`，光是初始化就吃了大量主线程时间。这判定为**运行时·数据层**瓶颈，也是首屏 TTI 慢的主因。

**第二步：Object.freeze 消除响应式成本（数据层）**
药品列表是只读的（变更通过详情页操作后整组替换），根本不需要逐条响应式陷阱：

```javascript
// ❌ 直接赋值，10000 条全部进入识别式递归
this.drugList = res.data

// ✅ Object.freeze 冻结，Observer 跳过整树观察（Object.isExtensible 返回 false）
this.drugList = Object.freeze(res.data.map(d => ({
  ...d,
  priceText: d.price.toFixed(2)      // 预处理，避免渲染时反复运算
})))
```

初始化开销大幅下降，白屏从 3s 明显缩短——只改了对象创建方式，成本近乎为零。

**第三步：虚拟列表只渲染可视区（渲染层）**
药品目录很长，即便去响应式，一次性渲染 10000 个真实 DOM 节点仍会让渲染 + 布局崩溃。用虚拟列表把真实 DOM 控制在可视区（约 30 条）：

```vue
<template>
  <!-- 外层固定高度撑出滚动，只在可视区渲染节点 -->
  <div class="drug-scroller" style="height: 100%" @scroll.passive="onScroll">
    <div class="inner" :style="{ height: totalHeight + 'px' }">   <!-- 总高度撑滚动条 -->
      <div class="viewport" :style="{ transform: `translateY(${offsetY}px)` }">
        <div v-for="d in visibleItems" :key="d.id" class="drug-row">
          <span>{{ d.name }}</span>
          <span>{{ d.spec }}</span>
          <span>{{ d.stock }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      drugList: [],          // 已 freeze
      itemHeight: 40,        // 固定行高
      scrollTop: 0
    }
  },
  computed: {
    totalHeight() { return this.drugList.length * this.itemHeight },
    visibleItems() {
      const start = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - 3)
      const end = start + Math.ceil(300 / this.itemHeight) + 3   // 300≈可视高度
      return this.drugList.slice(start, end)
    },
    offsetY() {
      const start = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - 3)
      return start * this.itemHeight
    }
  },
  methods: {
    onScroll(e) { this.scrollTop = e.target.scrollTop }
  }
}
</script>
```

（实际生产建议直接用 `vue-virtual-scroller`，原理同上但处理了动态高度、缓冲、滚动精度等边角。）

**第四步：分页兜底（加载层）**
虚拟列表解决了 DOM 数量，但 10000 条全量接口传输本身仍慢。加上服务端分页 + 前端增量加载，首屏只请求第一页（50 条），滚到底再拉下一页——传输体积、解析成本一起降：

```javascript
async loadMore() {
  if (this.loading || this.finished) return
  this.loading = true
  const { data } = await api.getDrugList({ page: this.page, pageSize: 50 })
  this.drugList = Object.freeze([...this.drugList, ...data])
  this.page++
  this.finished = data.length < 50
  this.loading = false
}
```

**组合拳结果**（真实项目可复现的量级）：

| 阶段 | 白屏/交互耗时 | 做了什么 |
|------|-------------|---------|
| 优化前 | 首屏 3000ms+，滚动掉帧 | 10000 条全量响应式 + 全量 DOM + 大 bundle |
| + Object.freeze | 首屏明显缩短 | 去掉条目级响应式递归 |
| + 虚拟列表 | 渲染帧稳定在 60fps | 真实 DOM 从 10000 降到 ~30 |
| + 分页 + 懒加载 | 首屏 800ms 左右 | 首屏只传 50 条 + 图片/路由懒加载 |

这一整套的主线逻辑，正是文章开头那张「四层决策树」的落地：**先测量定位层 → 数据层去响应式 → 渲染层减 DOM → 加载层减传输**，每一层只做它该做的事，层层叠加才把 3s 压到 800ms。

> 💬 **面试官**（这条是前面四层每个手段的组合追问）：给你一个 10000 条数据的列表，你怎么优化到首屏流畅？
>
> ✅ 标准答案：分层治理。数据层——只读数据 `Object.freeze` 去掉响应式递归；渲染层——虚拟列表只渲染可视区，真实 DOM 恒定在平级几十个；加载层——服务端分页 + 首屏只请求部分数据。
>
> 🎁 加分答案：能把「为什么」讲透——`Object.freeze` 省的是初始化期 Observer 递归（`isExtensible` 为 false 跳过）；虚拟列表省的是渲染期 DOM 数量与 layout 开销（`itemCount × itemHeight` 撑高度 + `translateY` 定位）；分页省的是传输体积。三者各自针对瓶颈树的一层，缺一个都会有短板。

---

## 💡 七、一张图总结（面试速记）

**全文主线：性能 = 构建层 + 加载层 + 运行时层 + 内存层，四层按序治理。**

| 手段 | 所在层 | 治什么瓶颈 | 面试频率 |
|------|--------|-----------|---------|
| runtime-only | 构建 | 省编译器 28KB | ⭐⭐⭐ |
| 路由懒加载 + chunk | 构建 | 首屏只拉当前 chunk | ⭐⭐⭐⭐⭐ |
| externals + CDN | 构建 | 抽第三方大库 | ⭐⭐⭐ |
| gzip / Brotli | 构建 | 传输体积 -60% | ⭐⭐⭐ |
| Tree Shaking / 按需引入 | 构建 | bundle 瘦身 | ⭐⭐⭐ |
| 文件指纹 + 强缓存 | 加载 | 缓存命中、免重复下载 | ⭐⭐⭐⭐ |
| prefetch / preload | 加载 | 预取关键/下一路由资源 | ⭐⭐⭐ |
| 图片懒加载 + WebP | 加载 | 图片体积与按需加载 | ⭐⭐⭐ |
| 骨架屏 | 加载 | 缩短感知等待、减 CLS | ⭐⭐⭐ |
| Object.freeze | 运行时·数据 | 去响应式递归 | ⭐⭐⭐⭐⭐ |
| 扁平化 + 非响应不进 data | 运行时·数据 | 减 Observer 深度 | ⭐⭐⭐ |
| v-if vs v-show / v-once | 运行时·组件 | 渲染策略四选 | ⭐⭐⭐⭐⭐ |
| 函数式组件 | 运行时·组件 | 跳过 initState | ⭐⭐⭐⭐ |
| computed 缓存 | 运行时·组件 | 依赖不变不重算 | ⭐⭐⭐⭐⭐ |
| 合理使用 key | 运行时·组件 | 节点精确复用/强制重建 | ⭐⭐⭐⭐⭐ |
| keep-alive LRU | 运行时·渲染 | 组件实例复用 | ⭐⭐⭐⭐⭐ |
| 虚拟列表 | 运行时·渲染 | 只渲染可视区 | ⭐⭐⭐⭐⭐ |
| 防抖节流 + .passive | 运行时·渲染 | 减高频触发 | ⭐⭐⭐⭐ |
| 事件清理三件事 | 内存 | 定时器/EventBus/WS | ⭐⭐⭐⭐⭐ |
| `$once+hook:beforeDestroy` | 内存 | 清理逻辑内聚 | ⭐⭐⭐⭐ |

---

## ❓ 留个问题

一个 `keep-alive` 缓存了超过 `max` 数量的组件时，被淘汰的组件触发的是 `activated`、`deactivated` 还是 `destroyed`？如果它里面还挂着一个 `setInterval` 且没在 `deactivated` / `activated` 里处理，会出现什么问题？

答案里说清楚**淘汰走了哪条路线**，再想想为什么要这么设计。

---

## 📚 参考资料

- Vue 2 性能优化官方指南（运行性能 + 加载性能）：https://v2.cn.vuejs.org/v2/guide/performance.html
- Vue 2 深入响应式原理（Object.freeze 跳过观察、依赖收集）：https://v2.cn.vuejs.org/v2/guide/reactivity.html
- webpack 代码分割（动态 import + magic comments）：https://webpack.docschina.org/guides/code-splitting/
- compression-webpack-plugin（gzip / Brotli 配置）：https://github.com/webpack-contrib/compression-webpack-plugin
- vue-lazyload（图片懒加载插件）：https://github.com/hilongjw/vue-lazyload
- keep-alive 组件（LRU 缓存、activated / deactivated）：https://v2.cn.vuejs.org/v2/api/#keep-alive
- Vue 2 官方源码：https://github.com/vuejs/vue/tree/2.x
- Vue 性能优化相关源码文件：`src/core/observer/index.js`、`src/core/vdom/patch.js`、`src/core/vdom/create-component.js`、`src/core/observer/scheduler.js`、`src/core/components/keep-alive.js`

---

> 🔖 这是「Vue 2 全家桶深度拆解系列」第 12 篇。上一篇：《Vue 2 SSR 原理与实战：从 renderToString 到 Nuxt.js 生产部署》；下一篇预告：《Vue 2 单元测试实战：Vue Test Utils + Jest 的组件测试策略》
