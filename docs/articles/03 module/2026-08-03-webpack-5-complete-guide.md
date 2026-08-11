# Webpack 5 完整指南：从配置到原理（面试收藏级）

> 面试官笑着说：「webpack 了解吗？」你说「了解」。他接着问：「那 Loader 和 Plugin 有什么区别？Tree Shaking 的原理？模块联邦怎么实现微前端？」——很多人从这里开始沉默。

---

## 🎯 这篇文章解决什么问题

Webpack 是前端工程化的基石，也是面试必考的「深水区」。这篇文章按真实项目的搭建顺序展开：**从基础使用到项目搭建流程，从企业级完整配置到构建原理，从性能优化到实战进阶**。每个知识点既讲透原理，也给出面试标准答案。

---

## ⚙️ 基础使用：Webpack 5 能处理什么

Webpack 本质是一个**静态模块打包器**。它从入口文件出发，递归解析所有依赖，构建出一张**依赖图（Dependency Graph）**，再把这张图打包成一个或多个 bundle。

**五个核心概念**：

- **Entry**：依赖图的入口，可以是单个或多个
- **Output**：打包产物的输出路径和文件名规则
- **Loader**：让 Webpack 处理非 JS 文件（转换器）
- **Plugin**：扩展编译功能，贯穿整个生命周期（扩展器）
- **Mode**：`development` / `production`，决定内置优化开关

### 样式处理链（CSS → SCSS → PostCSS）

Webpack 只认识 JS，处理样式需要 Loader 链式调用，**从右到左执行**：

```javascript
{
  test: /\.scss$/,
  use: [
    MiniCssExtractPlugin.loader, // 生产：提取为独立 CSS 文件
    // 'style-loader',           // 开发：注入 <style> 标签
    'css-loader',                // 解析 @import 和 url()
    'postcss-loader',            // 自动添加浏览器前缀
    'sass-loader',               // 把 SCSS 编译成 CSS
  ]
}
```

`postcss.config.js` 配置：

```javascript
module.exports = {
  plugins: [
    require('autoprefixer'),
    require('postcss-preset-env')({ stage: 3 }),
  ]
}
```

> 💬 **面试官**：Loader 的执行顺序是什么？为什么这样设计？
>
> ✅ 标准答案：从右到左（从下到上）执行，类似 Unix 管道，前一个 Loader 的输出是后一个的输入。
> 🎁 加分答案：可用 `enforce: 'pre'` / `enforce: 'post'` 强制调整顺序，`pre` 常用于 eslint-loader 提前校验源码。

### JS 处理：Babel + polyfill

```javascript
// babel.config.js
module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: '> 0.25%, not dead',
      useBuiltIns: 'usage', // 按需注入 polyfill（推荐）
      corejs: 3,
    }],
    '@babel/preset-typescript',
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
}
```

**三种 polyfill 策略**对比：

| 策略 | 说明 |
|------|------|
| `false` | 不注入，手动引入 |
| `entry` | 入口处全量引入，bundle 较大 |
| `usage` | 按用到的特性按需注入，最优 |

### 图片与资源：Asset Modules

Webpack 5 内置 Asset Modules，不再需要 url-loader / file-loader：

```javascript
{
  test: /\.(png|jpg|gif|svg)$/,
  type: 'asset',            // 自动判断：小文件 inline，大文件 file
  parser: {
    dataUrlCondition: { maxSize: 8 * 1024 }, // 8KB 以下转 base64
  },
  generator: {
    filename: 'images/[name].[contenthash:8][ext]',
  },
}
```

| type | 等价旧 loader | 说明 |
|------|-------------|------|
| `asset/resource` | file-loader | 输出为独立文件 |
| `asset/inline` | url-loader | 转 base64 内联 |
| `asset/source` | raw-loader | 导出源码字符串 |
| `asset` | url-loader + limit | 自动按大小选择 |

### 打包文件分类

```javascript
output: {
  path: path.resolve(__dirname, 'dist'),
  filename: 'js/[name].[contenthash:8].js',
  chunkFilename: 'js/[name].[contenthash:8].chunk.js',
  assetModuleFilename: '[ext]/[name].[hash:8][ext]',
  clean: true,  // Webpack 5 内置，替代 clean-webpack-plugin
}
```

### hash / chunkhash / contenthash 的区别

浏览器长期缓存的核心是「内容不变 → hash 不变 → 缓存不失效」，三种 hash 面试混淆率极高：

| hash 类型 | 变化粒度 | 适用场景 |
|-----------|---------|---------|
| `hash` | 整次构建，任意文件变动全变 | 不推荐用于生产 |
| `chunkhash` | 同一 chunk 内任意模块变动 | JS 文件 |
| `contenthash` | 仅该文件自身内容变动 | CSS 文件 |

> 💬 **面试官**：CSS 为什么要用 `contenthash` 而不是 `chunkhash`？
>
> ✅ 标准答案：CSS 被 MiniCssExtractPlugin 从 JS chunk 里抽出来。用 `chunkhash` 时，改了 JS 逻辑但没改样式，CSS 的 hash 也会变，用户被迫重下一个内容没变的 CSS。`contenthash` 只看文件本身内容。
> 🎁 加分答案：配合 `runtimeChunk: 'single'` 把 Webpack 运行时代码单独抽出，避免它的 hash 变化「污染」业务 chunk 的缓存，才能真正实现长期缓存。

---

## 🏗️ 项目搭建流程

### 初始化与目录结构

标准 Webpack 5 项目目录：

```
my-project/
├── src/
│   ├── index.tsx         ← 入口
│   ├── pages/            ← 多页入口（MPA）
│   ├── components/
│   └── assets/
├── public/
│   └── index.html        ← HTML 模板
├── config/
│   ├── webpack.common.js
│   ├── webpack.dev.js
│   └── webpack.prod.js
├── babel.config.js
├── postcss.config.js
└── package.json
```

### 开发服务器（devServer）完整配置

```javascript
devServer: {
  static: path.resolve(__dirname, 'public'),
  port: 3000,
  hot: true,                  // HMR 热更新
  open: true,
  compress: true,             // gzip 压缩响应
  historyApiFallback: true,   // SPA 路由回退
```

proxy 转发配置：

```javascript
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
    }
  }
}
```

### watch 模式：文件监听原理

不用 devServer 时，watch 模式可以自动监听文件变化并重新构建：

```javascript
module.exports = {
  watch: true,
  watchOptions: {
    ignored: /node_modules/,
    aggregateTimeout: 300, // 防抖：变化后等 300ms 再构建
    poll: 1000,            // 强制轮询（Docker/NFS 场景）
  }
}
```

Webpack 文件监听有两种机制：
- **系统事件**（默认）：调用 `fs.watch`，由 OS 推送变化通知，性能好
- **轮询**：每隔 `poll` ms 检查文件 `mtime`，兼容 Docker volume / NFS 等系统事件不可靠的场景

实际开发用 `webpack-dev-server`，它内部自动开启 watch，产物保存在内存而非磁盘，配合 HMR 实现毫秒级热更。

### resolve：路径别名与扩展名

```javascript
resolve: {
  alias: {
    '@': path.resolve(__dirname, 'src'),
    '@utils': path.resolve(__dirname, 'src/utils'),
  },
  extensions: ['.tsx', '.ts', '.jsx', '.js'], // 省略后缀时的查找顺序
  modules: ['node_modules'],
}
```

> 💬 **面试官**：resolve.extensions 配置太多会有什么影响？
>
> ✅ 标准答案：每次 import 无后缀文件时，Webpack 按顺序尝试所有扩展名，列表越长解析越慢。
> 🎁 加分答案：高频类型放前面（TypeScript 项目把 `.tsx` 放第一个），减少无效查找次数。

### 多页应用（MPA）配置

```javascript
const pages = ['index', 'about', 'drug-detail']

module.exports = {
  entry: Object.fromEntries(
    pages.map(name => [name, `./src/pages/${name}/index.tsx`])
  ),
  plugins: pages.map(name => new HtmlWebpackPlugin({
    template: `./src/pages/${name}/index.html`,
    filename: `${name}.html`,
    chunks: [name],  // 👈 只注入该页面对应的 bundle
  }))
}
```

### 环境变量与 DefinePlugin

```javascript
new webpack.DefinePlugin({
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  'process.env.API_BASE': JSON.stringify(process.env.API_BASE),
  __DEV__: process.env.NODE_ENV === 'development',
})
```

> 💬 **面试官**：DefinePlugin 和 dotenv 有什么区别？
>
> ✅ 标准答案：dotenv 在 Node 运行时注入变量；DefinePlugin 在编译时做字符串替换——浏览器没有 `process.env`，DefinePlugin 让代码编译后变成字面量。
> 🎁 加分答案：`dotenv-webpack` 结合两者，读 `.env` 文件后通过 DefinePlugin 注入，是实际项目最常见用法。

---

## 📁 企业级完整配置：三文件架构

能写出一套完整可维护的 Webpack 配置，是面试里最有区分度的能力。

### webpack.common.js

```javascript
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const webpack = require('webpack')
const isProd = process.env.NODE_ENV === 'production'
```

entry / output / resolve：

```javascript
module.exports = {
  entry: { main: './src/index.tsx' },
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: 'js/[name].[contenthash:8].js',
    chunkFilename: 'js/[name].[contenthash:8].chunk.js',
    clean: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '../src') },
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  },
```

module.rules 部分：

```javascript
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: ['thread-loader', 'babel-loader'],
        exclude: /node_modules/,
      },
      {
        test: /\.scss$/,
        use: [
          isProd ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader', 'postcss-loader', 'sass-loader',
        ],
      },
```

图片资源用 Asset Modules（Webpack 5 内置，替代 url-loader）：

```javascript
      {
        test: /\.(png|jpg|svg|gif)$/,
        type: 'asset',
        parser: { dataUrlCondition: { maxSize: 8 * 1024 } },
        generator: { filename: 'images/[name].[hash:8][ext]' },
      },
    ],
  },
```

plugins 公共部分：

```javascript
  plugins: [
    new HtmlWebpackPlugin({ template: './public/index.html' }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash:8].css',
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
  ],
  cache: { type: 'filesystem' }, // Webpack 5 持久化缓存
}
```

### webpack.dev.js

```javascript
const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')

module.exports = merge(common, {
  mode: 'development',
  devtool: 'eval-cheap-module-source-map',
```

devServer + optimization：

```javascript
  devServer: {
    port: 3000,
    hot: true,
    historyApiFallback: true,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
  optimization: {
    runtimeChunk: 'single', // HMR 时只更新 runtime，不污染 hash
  },
})
```

### webpack.prod.js

```javascript
const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
```

merge 生产配置，mode + devtool + 压缩器：

```javascript
module.exports = merge(common, {
  mode: 'production',
  devtool: 'hidden-source-map',
  optimization: {
    minimizer: [
      new TerserPlugin({ parallel: true }),
      new CssMinimizerPlugin(),
    ],
```

splitChunks + runtimeChunk + performance：

```javascript
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendors: { test: /[\\/]node_modules[\\/]/, name: 'vendors', priority: -10 },
        common: { minChunks: 2, name: 'common', priority: -20 },
      },
    },
    runtimeChunk: 'single',
  },
```

performance 预算（超出给 warning，不阻断构建）：

```javascript
  performance: {
    hints: 'warning',
    maxAssetSize: 500 * 1024,
    maxEntrypointSize: 1024 * 1024,
  },
})
```

`package.json` scripts：

```json
{
  "scripts": {
    "dev": "webpack serve --config config/webpack.dev.js",
    "build": "NODE_ENV=production webpack --config config/webpack.prod.js",
    "analyze": "ANALYZE=true npm run build"
  }
}
```

> 💬 **面试官**：为什么要把 Webpack 配置拆成三个文件？
>
> ✅ 标准答案：开发和生产环境需求完全不同（开发要 HMR/sourcemap/proxy，生产要压缩/hash/代码分割），拆开维护更清晰，用 `webpack-merge` 合并公共部分避免重复。
> 🎁 加分答案：也可以用函数形式 `module.exports = (env, argv) => {}` 接收 `--env` 参数，适合配置差异不大的小项目；大项目三文件可读性更好。

---

## 🗺️ Source Map：调试与安全的权衡

`devtool` 关键词拆解（面试常考）：

- `eval`：用 `eval()` 执行模块，构建最快，列信息不准
- `cheap`：省略列信息，只映射到行
- `module`：映射到 Loader 处理前的源码（如 SCSS 而非编译后 CSS）
- `hidden`：生成 .map 但不在 bundle 引用，防止源码泄露
- `inline`：把 map 以 base64 内联到 bundle

```javascript
// 开发环境：快 + 能定位源码行列
devtool: 'eval-cheap-module-source-map'

// 生产环境：只上传到错误监控，不暴露给用户
devtool: 'hidden-source-map'
```

> 💬 **面试官**：生产环境 Source Map 怎么配才既能排查 bug 又不泄露源码？
>
> ✅ 标准答案：用 `hidden-source-map`，生成 .map 但不引用它。.map 只上传到 Sentry 等错误监控，用户下载不到。
> 🎁 加分答案：`nosources-source-map` 更进一步——堆栈能定位行号但 .map 不含源码内容，进一步降低泄露风险。

---

## 🚀 性能优化全景

### Bundle 分析

优化前先看清楚问题在哪：

```javascript
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

plugins: [
  new BundleAnalyzerPlugin({
    analyzerMode: 'static',
    reportFilename: 'bundle-report.html',
    openAnalyzer: false,
  })
]
```

🔧 用 BundleAnalyzer 分析某药品 App，发现 moment.js 体积 230KB 中有 180KB 是语言包，配置 IgnorePlugin 排除后首屏 bundle 直接减少 180KB。

### 代码分割与懒加载

```javascript
// 路由级懒加载
const DrugDetail = lazy(() => import('./pages/DrugDetail'))

// 带魔法注释：给异步 chunk 命名，方便调试
const HeavyEditor = lazy(() =>
  import(/* webpackChunkName: "editor" */ './components/HeavyEditor')
)
```

SplitChunks 提取公共模块：

```javascript
splitChunks: {
  chunks: 'all',
  cacheGroups: {
    vendors: {
      test: /[\\/]node_modules[\\/]/,
      name: 'vendors',
      priority: -10,
    },
    common: { minChunks: 2, name: 'common', priority: -20 },
  },
}
```

### HMR 热更新原理

`hot: true` 背后的完整流程：

```
文件变化 → Webpack 重新编译 → 生成新 hash + 差量模块
  → DevServer 通过 WebSocket 推送 { hash, type: 'ok' }
  → Client 收到 hash，与上次对比发现变化
  → 拉取 {hash}.hot-update.json（本次变化的 chunk 清单）
  → 按需拉取 {hash}.hot-update.js（差量模块代码）
  → 执行 module.hot.accept 回调，局部替换模块
  → 找不到 accept 处理则向上冒泡，最终触发页面刷新
```

`module.hot.accept` 是 HMR 的关键 API：

```javascript
if (module.hot) {
  module.hot.accept('./App', () => {
    const NextApp = require('./App').default
    ReactDOM.render(<NextApp />, document.getElementById('root'))
  })
}
```

> 💬 **面试官**：HMR 和直接刷新页面有什么区别？底层怎么实现的？
>
> ✅ 标准答案：刷新页面丢失所有状态；HMR 只替换变化的模块，保留组件状态。底层通过 WebSocket 推送 hash，client 按需拉取差量模块，通过 `module.hot.accept` 局部更新。
> 🎁 加分答案：React Fast Refresh 比旧版 React Hot Loader 更可靠——它在 Babel 层转换，能精准识别组件函数边界，避免因模块依赖树问题导致状态丢失。

### Tree Shaking 与 Scope Hoisting

Tree Shaking 依赖 **ESM 静态分析**，CJS 动态 require 无法摇树：

```javascript
// ✅ 可以 Tree Shaking —— ESM 静态结构
import { debounce } from 'lodash-es'

// ❌ 无法 Tree Shaking —— CJS 动态结构
const _ = require('lodash')
```

在 `package.json` 声明副作用，让 Webpack 更激进地删除未用代码：

```json
{
  "sideEffects": ["*.css", "*.scss"]
}
```

**Scope Hoisting**（ModuleConcatenationPlugin）：生产模式默认开启，把多个模块合并到同一作用域，减少函数包装开销，代码更小执行更快。

> 💬 **面试官**：Tree Shaking 为什么必须用 ESM？
>
> ✅ 标准答案：ESM 的 import/export 是静态的，编译时就能确定哪些导出被用到；CJS 的 require 是运行时动态执行的，编译期无法静态分析依赖。
> 🎁 加分答案：即使用 ESM，带副作用的模块（如直接修改全局或挂载 polyfill）也不能摇掉，需要用 `sideEffects` 字段精确标注。

### 构建提速四件套

**noParse**：跳过对无依赖大库的解析：

```javascript
module: {
  noParse: /jquery|lodash/, // 这些库没有 import/require，跳过依赖分析
}
```

**IgnorePlugin**：构建时完全排除某些模块：

```javascript
new webpack.IgnorePlugin({
  resourceRegExp: /^\.\/locale$/,
  contextRegExp: /moment/,  // 排除 moment 全部语言包（约 170KB）
})
// 按需手动引入：import 'moment/locale/zh-cn'
```

**thread-loader**：耗时 Loader 放进 worker 线程池并行执行：

```javascript
{
  test: /\.(ts|tsx)$/,
  use: [
    'thread-loader', // 👈 放在其他 loader 之前
    'babel-loader',
  ]
}
```

注意：thread-loader 有进程启动开销（约 600ms），小项目反而更慢，只在模块量大的项目才有收益。

**DllPlugin**：预编译不常变动的第三方库：

```javascript
// webpack.dll.js（只运行一次）
new webpack.DllPlugin({
  name: '[name]_lib',
  path: path.join(__dirname, 'dll', '[name]-manifest.json'),
})
```

Webpack 5 的 `cache: filesystem` 效果已接近 DllPlugin，新项目优先用内置缓存；DllPlugin 在 CI 环境缓存不可用时仍有优势。

> 💬 **面试官**：noParse、IgnorePlugin、DllPlugin 的区别是什么？
>
> ✅ 标准答案：noParse 是「不解析依赖但仍打包」；IgnorePlugin 是「完全不打包」；DllPlugin 是「提前打包、主构建引用而不重复编译」。
> 🎁 加分答案：三者优化阶段不同——noParse 减少依赖分析开销，IgnorePlugin 减小产物体积，DllPlugin 减少构建时间。

---

## 🔬 原理深挖：Webpack 是怎么跑起来的

### 构建流程：Compiler → Compilation → Chunk → Asset

Webpack 构建分三个核心阶段：

**① 初始化阶段**：读取 `webpack.config.js`，合并默认配置，用 `schema-utils` 校验，创建 `Compiler` 实例，注册所有 Plugin（调用每个 plugin 的 `apply(compiler)`），触发 `environment`、`afterEnvironment`、`entryOption`、`afterPlugins`、`afterResolvers` 等钩子，最后调用 `compiler.run()` 进入编译。

**② 构建阶段（make）**：从 entry 出发，触发 `make` 钩子，`EntryPlugin` 调用 `compilation.addEntry()`。对每个模块：

```
addEntry → handleModuleCreation → factorizeModule（工厂创建模块）
  → buildModule → runLoaders（执行 Loader 链）
  → JavaScriptParser.parse（Acorn 解析 AST）
  → 遍历 AST 收集 import 依赖（HarmonyImportDependency 等）
  → processModuleDependencies（递归处理依赖模块）
```

所有模块处理完后，结果记录到 `ModuleGraph`（`_dependencyMap` + `_moduleMap` 两张 WeakMap）。

**③ 封装阶段（seal → emit）**：遍历入口模块，为每个 entry 创建 `Chunk` 和 `ChunkGroup`（EntryPoint），调用 `buildChunkGraph` 按依赖关系把模块分配给 Chunk，再经过代码生成（`codeGeneration`）和渲染（`JavascriptModulesPlugin.renderMain`），最终写入 `output.path`。

```
entry → Loader 转换 → AST 解析依赖 → 递归构建 ModuleGraph
  → seal：分配 Chunk → buildChunkGraph
  → codeGeneration → emit → 写入 dist/
```

关键数据结构一览：

| 对象 | 职责 |
|------|------|
| `Compiler` | 全局唯一，持有所有 hooks 和配置 |
| `Compilation` | 单次构建，持有 modules / chunks / assets |
| `ModuleGraph` | 记录模块间依赖关系（`_dependencyMap` / `_moduleMap`） |
| `ChunkGraph` | 记录模块与 Chunk 的归属关系 |
| `NormalModule` | 每个文件对应一个，持有源码、依赖、loader 结果 |

> 💬 **面试官**：Compiler 和 Compilation 有什么区别？
>
> ✅ 标准答案：Compiler 代表整个 Webpack 实例，贯穿构建生命周期；Compilation 代表一次具体的构建——watch 模式下文件变化会触发新的 Compilation，但 Compiler 只有一个。
> 🎁 加分答案：Plugin 可以在 `compiler.hooks` 和 `compilation.hooks` 两个层级监听，前者是全局事件（如 `done`），后者是单次构建事件（如 `buildModule`、`optimizeModules`）。ModuleGraph 和 ChunkGraph 是 Webpack 5 新引入的数据结构，替换了 4.x 的模块依赖数组，查询效率从 O(n) 提升到 O(1)。

### Bundle 结构：打开黑盒

Webpack 输出的 bundle 本质是一个**立即执行函数（IIFE）**，内部实现了一套迷你模块系统：

```javascript
;(function(modules) {
  var installedModules = {}
  function __webpack_require__(moduleId) {
    if (installedModules[moduleId]) {
      return installedModules[moduleId].exports
    }
    var module = installedModules[moduleId] = { exports: {} }
    modules[moduleId].call(
      module.exports, module, module.exports, __webpack_require__
    )
    return module.exports
  }
  return __webpack_require__('./src/index.js')
})({
```

模块对象的结构：

```javascript
  './src/index.js': function(module, exports, __webpack_require__) {
    var utils = __webpack_require__('./src/utils.js')
    // 你写的代码
  },
  './src/utils.js': function(module, exports) {
    // utils 代码
  }
})
```

关键点：`modules` 是以路径为 key 的对象，`__webpack_require__` 是 Webpack 自己实现的 `require`，有 `installedModules` 缓存防止重复执行。整个 bundle 是 IIFE，不污染全局作用域。

> 💬 **面试官**：Webpack 打包后的代码为什么能在浏览器运行？浏览器不支持 `require`？
>
> ✅ 标准答案：Webpack 自己实现了 `__webpack_require__`，把所有模块包装成函数放在一个对象里，完全不依赖浏览器原生 `require`。
> 🎁 加分答案：Webpack 5 的 `output.module: true` 可输出原生 ESM bundle，现代浏览器直接支持，不再需要 IIFE 包裹，bundle 体积更小，还能保留静态 import 供下游工具继续 Tree Shaking。

### Loader 原理与手写

Loader 本质是一个函数：接收文件内容字符串，返回转换后的内容。

```javascript
// 一个移除 console.log 的自定义 Loader
module.exports = function(source) {
  // this 是 Loader 上下文，可访问 this.query、this.async 等
  const result = source.replace(/console\.log\(.*?\);?/g, '')
  return result
}
```

Loader 有四种类型，执行顺序为：`pre → normal → inline → post`，每种类型内部从右到左执行：

```javascript
// webpack.config.js
rules: [
  { test: /\.js$/, loader: 'eslint-loader', enforce: 'pre' },  // 最先执行
  { test: /\.js$/, loader: 'babel-loader' },                   // normal
  { test: /\.js$/, loader: 'coverage-loader', enforce: 'post'} // 最后执行
]
```

异步 Loader（处理耗时操作时必须用，否则会阻塞构建线程）：

```javascript
module.exports = function(source) {
  const callback = this.async() // 声明异步，返回 callback
  someAsyncOperation(source, (err, result) => {
    if (err) return callback(err)
    callback(null, result, sourceMap) // 可额外传第三个参数 sourceMap
  })
}
```

手写一个简化版 `babel-loader`：

```javascript
const babel = require('@babel/core')

module.exports = function(source) {
  const options = this.getOptions() // 获取 webpack 配置里传入的 options
  const callback = this.async()
  babel.transform(source, {
    ...options,
    sourceMap: true,
    filename: this.resourcePath.split('/').pop(),
  }, (err, result) => {
    callback(err, result.code, result.map)
  })
}
```

手写一个简化版 `file-loader`（处理图片）：

```javascript
const { interpolateName } = require('loader-utils')

module.exports = function(source) {
  // 生成内容哈希文件名
  const filename = interpolateName(this, '[contenthash:8].[ext]', { content: source })
  this.emitFile(filename, source) // 发射文件到 output 目录
  return `module.exports = ${JSON.stringify(filename)}`
}
module.exports.raw = true // 声明接收 Buffer（处理二进制文件必须）
```

**pitch 阶段**：Loader 默认由 normal 函数处理，但每个 Loader 还可以定义 `pitch` 函数。执行顺序与 normal 相反（从左到右），如果某个 pitch 有返回值，后续的 pitch 和 normal 全部跳过：

```
use: ['style-loader', 'css-loader', 'less-loader']

pitch 阶段（→）：style-loader.pitch → css-loader.pitch → less-loader.pitch
normal 阶段（←）：less-loader → css-loader → style-loader
```

`style-loader` 利用 pitch 提前返回，跳过后续 normal 执行，直接 `require` 剩余 loader 链的结果：

```javascript
loader.pitch = function(remainingRequest) {
  // remainingRequest = 'css-loader!less-loader!./index.less'
  return `
    const css = require(${JSON.stringify('!!' + remainingRequest)})
    const style = document.createElement('style')
    style.innerHTML = css
    document.head.appendChild(style)
  `
}
```

> 💬 **面试官**：Loader 和 Plugin 有什么本质区别？
>
> ✅ 标准答案：Loader 是文件转换器，作用于单个文件内容，链式处理后返回 JS；Plugin 是事件监听器，通过钩子介入构建全流程，能访问整个 compilation 对象。
> 🎁 加分答案：Loader 只能操作文件内容，Plugin 可以做 Loader 做不到的事——修改输出路径、注入新文件、改变构建行为（如 HtmlWebpackPlugin 生成 HTML）。

### Tapable：Plugin 的底层引擎

Webpack 自研的**发布订阅 + 钩子库**，提供多种钩子类型：

```javascript
const { SyncHook, AsyncParallelHook, SyncBailHook } = require('tapable')

class Compiler {
  constructor() {
    this.hooks = {
      done: new SyncHook(['stats']),           // 同步
      emit: new AsyncParallelHook(['compilation']), // 异步并行
      shouldEmit: new SyncBailHook(['compilation']), // 返回 false 则中断
    }
  }
}
```

| 钩子类型 | 特点 | 使用场景 |
|---------|------|---------|
| `SyncHook` | 同步串行，无返回值 | 纯通知类事件 |
| `SyncBailHook` | 某个 tap 返回非 undefined 则中断 | 条件拦截 |
| `SyncWaterfallHook` | 上一个 tap 返回值传给下一个 | 链式处理 |
| `AsyncParallelHook` | 异步，所有 tap 并行 | 并发异步任务 |
| `AsyncSeriesHook` | 异步，tap 串行 | 顺序异步流程 |

Tapable 有三种注册方式，对应三种触发方式：

```javascript
// 注册
hook.tap('MyPlugin', (arg) => { /* 同步 */ })
hook.tapAsync('MyPlugin', (arg, callback) => { callback() })
hook.tapPromise('MyPlugin', (arg) => Promise.resolve())

// 触发（与注册方式对应）
hook.call(arg)
hook.callAsync(arg, (err) => {})
hook.promise(arg).then(() => {})
```

`SyncBailHook` 的熔断行为——某个 tap 返回非 `undefined` 值时，后续 tap 全部跳过：

```javascript
const { SyncBailHook } = require('tapable')
const hook = new SyncBailHook(['name'])

hook.tap('1', (name) => { console.log(1, name) })
hook.tap('2', (name) => { console.log(2, name); return 'stop' }) // 返回值非 undefined
hook.tap('3', (name) => { console.log(3, name) }) // 不会执行

hook.call('test') // 只打印：1 test，2 test
```

`SyncWaterfallHook` 的瀑布行为——前一个 tap 的返回值作为下一个 tap 的第一个参数：

```javascript
const { SyncWaterfallHook } = require('tapable')
const hook = new SyncWaterfallHook(['name'])

hook.tap('1', (name) => { return 'processed-' + name })
hook.tap('2', (name) => { console.log(name) }) // 打印：processed-test

hook.call('test')
```

还可以用 `intercept` 做全局拦截（适合 Plugin 调试）：

```javascript
hook.intercept({
  call: (arg) => { console.log('hook fired with', arg) },  // call 时触发一次
  tap: (tapInfo) => { console.log('tap:', tapInfo.name) }, // 每个 tap 执行前触发
})
```

> 💬 **面试官**：Tapable 里 Bail / Waterfall / Loop 钩子分别适合什么场景？
>
> ✅ 标准答案：Bail（熔断）——某个插件满足条件就停，如 `shouldEmit` 判断是否需要输出；Waterfall（瀑布）——链式加工同一个数据，如多个插件依次修改同一对象；Loop（循环）——某个插件返回非 undefined 则从头重跑，适合需要反复检查直到稳定的场景。
> 🎁 加分答案：Webpack 内部大量使用 `AsyncSeriesHook` 来保证插件顺序（如 `beforeCompile`、`make`），用 `AsyncParallelHook` 加速可并行的阶段（如多入口并行处理）。

### 手写 Plugin

Plugin 有三种写法对应三种钩子类型，面试里能写出同步 + 异步两种就足够了。

同步 Plugin（用 `tap`，挂同步钩子 `done`）：

```javascript
class BuildNotifyPlugin {
  apply(compiler) {
    compiler.hooks.done.tap('BuildNotifyPlugin', (stats) => {
      const time = stats.endTime - stats.startTime
      console.log(`✅ Build finished in ${time}ms`)
    })
  }
}
```

异步 Plugin（用 `tapAsync`，挂异步钩子 `emit`）——这是面试最常考的模板：

```javascript
class FileListPlugin {
  constructor(options = {}) {
    this.filename = options.filename || 'filelist.md'
  }
  apply(compiler) {
    compiler.hooks.emit.tapAsync('FileListPlugin', (compilation, callback) => {
      const fileList = Object.keys(compilation.assets)
        .map(f => `- ${f}`)
        .join('\n')
```

注入新文件到输出目录，然后调用 callback 放行：

```javascript
      compilation.assets[this.filename] = {
        source: () => fileList,
        size: () => fileList.length,
      }
      callback() // 👈 异步钩子必须调用 callback，否则构建卡死
    })
  }
}
```

也可以用 `tapPromise` 返回 Promise，写法更简洁：

```javascript
compiler.hooks.emit.tapPromise('UploadPlugin', (compilation) => {
  const uploads = Object.keys(compilation.assets).map(filename =>
    uploadToOSS(filename, compilation.assets[filename].source())
  )
  return Promise.all(uploads) // 所有文件上传完才继续
})
```

🔧 在药品 App 的 CI 流程里，用 `tapPromise` 在构建完成后自动把 sourcemap 上传到 Sentry，主 bundle 里的 sourcemap 注释用 `hidden-source-map` 去掉——用户拿不到源码，但错误监控能定位行号。

> 💬 **面试官**：Webpack Plugin 是怎么工作的？
>
> ✅ 标准答案：Plugin 实现 `apply(compiler)` 方法，在方法内通过 `compiler.hooks.xxx.tap()` 订阅生命周期事件。Webpack 在各阶段调用 `call()`，所有订阅了该阶段的 Plugin 依次执行。
> 🎁 加分答案：底层是 Tapable 库。Plugin 能在 `compiler.hooks` 和 `compilation.hooks` 两个层级监听，前者是全局级别，后者是单次构建级别，可以精准控制介入的粒度。

### 手写简易 Webpack

面试终极考法：从零实现一个能处理 `import/export` 的迷你打包器，核心只有四步：

**第一步：读取入口，解析 AST**

```javascript
const fs = require('fs')
const path = require('path')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const { transformFromAst } = require('@babel/core')
```

读文件、解析 AST、收集 import 依赖、转译为 CommonJS：

```javascript
function createModule(filename) {
  const content = fs.readFileSync(filename, 'utf-8')
  const ast = parser.parse(content, { sourceType: 'module' })
  const deps = []
  traverse(ast, {
    ImportDeclaration({ node }) { deps.push(node.source.value) }
  })
  const { code } = transformFromAst(ast, null, { presets: ['@babel/preset-env'] })
  return { filename, deps, code }
}
```

**第二步：递归构建依赖图**

```javascript
function buildGraph(entry) {
  const entryModule = createModule(entry)
  const graph = [entryModule]
  for (const module of graph) {
    const dir = path.dirname(module.filename)
    module.mapping = {}
```

递归收集每个模块的依赖：

```javascript
    module.deps.forEach(dep => {
      const absPath = path.join(dir, dep)
      const child = createModule(absPath)
      module.mapping[dep] = child.filename
      graph.push(child)
    })
  }
  return graph
}
```

**第三步：生成 bundle（IIFE + `__webpack_require__`）**

```javascript
function bundle(graph) {
  let modules = ''
  graph.forEach(mod => {
    modules += `"${mod.filename}": [
      function(require, module, exports) { ${mod.code} },
      ${JSON.stringify(mod.mapping)}
    ],`
  })
```

输出 IIFE，内置迷你 `__webpack_require__`：

```javascript
  return `(function(modules) {
    function require(id) {
      const [fn, mapping] = modules[id]
      function localRequire(name) { return require(mapping[name]) }
      const module = { exports: {} }
      fn(localRequire, module, module.exports)
      return module.exports
    }
    require("${graph[0].filename}")
  })({ ${modules} })`
}
```

> 💬 **面试官**：手写一个简易 Webpack，你会从哪里入手？
>
> ✅ 标准答案：四步——读入口 + Babel 解析 AST 收集 `import` 依赖 → 递归构建依赖图 → 把每个模块包装成函数 → 输出 IIFE + 迷你 `require` 的 bundle。
> 🎁 加分答案：真实 Webpack 还多了 Loader 转换链、Plugin 钩子系统、Chunk 分割、缓存机制。手写版是理解核心模型的最短路径，面试中能讲清这四步就已经在 90% 候选人之上。

---

## 🧩 实战进阶

### 模块联邦：微前端的 Webpack 方案

Module Federation 是 Webpack 5 最重磅的特性，让多个独立构建的应用在运行时**共享模块**。每个应用既可以是消费方（Host），也可以是提供方（Remote）。

Remote 配置——声明对外暴露的模块：

```javascript
new ModuleFederationPlugin({
  name: 'drugApp',           // 远程应用名称，Host 引用时的前缀
  filename: 'remoteEntry.js', // 远程入口文件名
  exposes: {
    './DrugCard': './src/components/DrugCard',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
  },
})
```

Host 配置——消费远程模块：

```javascript
new ModuleFederationPlugin({
  name: 'host',
  remotes: {
    drugApp: 'drugApp@http://localhost:3001/remoteEntry.js',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
  },
})
```

主应用使用远程组件，写法和本地 `import` 完全一样：

```javascript
const DrugCard = lazy(() => import('drugApp/DrugCard'))
```

`shared` 配置的关键选项：

- `singleton: true`：全局只保留一个实例，React 必须设置，否则两套 React 实例会导致 Hooks 报错
- `requiredVersion`：版本不匹配时给出警告（不会报错，但可能运行异常）

**双向依赖**：Host 和 Remote 的角色不是固定的，同一个应用可以同时是 Host 和 Remote——Remote 也可以消费另一个 Remote 暴露的组件，实现跨应用组件共享：

```javascript
// remote 应用也可以消费 host 暴露的模块
new ModuleFederationPlugin({
  name: 'remote',
  filename: 'remoteEntry.js',
  remotes: {
    host: 'host@http://localhost:3000/remoteEntry.js', // 👈 反向引用
  },
  exposes: { './Button': './src/Button' },
  shared: { react: { singleton: true } },
})
```

🔧 在医疗 App 中，将「药品搜索框」作为 Remote 暴露出去，让主站、患者端、医生端三个 Host 都复用同一份组件——组件更新后三端同步生效，不需要各自发版。

> 💬 **面试官**：模块联邦和 iframe 微前端有什么区别？
>
> ✅ 标准答案：iframe 完全隔离，通信复杂、体验割裂（弹窗/路由问题）；模块联邦在同一 JS 上下文运行，组件可以直接共享状态和 UI，`shared` 配置避免依赖重复加载。
> 🎁 加分答案：模块联邦的代价是 CSS/JS 隔离性弱，子应用全局样式可能污染主应用，生产中通常用 CSS Modules + BEM 规范隔离。另外入口文件需要用动态 `import('./bootstrap')` 异步加载，给 shared 依赖协商留出时间，否则会报版本冲突错误。

### Webpack 开发 npm 包

开发 npm 包时，目标是产出一个**不捆绑宿主依赖、支持多种模块格式**的库文件，与应用打包的目标完全不同。

基础配置——`library` + `externals`：

```javascript
const nodeExternals = require('webpack-node-externals')

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.join(__dirname, './lib'),
    filename: '[name].js',
    library: {
      type: 'umd',        // 同时支持 CJS / AMD / 浏览器全局变量
    },
    globalObject: 'this', // UMD 在 Node 和浏览器都能正确挂载
  },
  externals: [nodeExternals()], // 排除所有 node_modules，由消费方提供
}
```

`externals` 有多种写法，按需选择：

```javascript
externals: {
  react: 'react',           // 消费方以任意方式引入 react
  lodash: {
    commonjs: 'lodash',     // CJS 环境
    amd: 'lodash',          // AMD 环境
    root: '_',              // 浏览器全局变量
  },
}
```

**输出多种产物格式**（用 `webpack-merge` + 数组配置，一次构建输出 UMD/CJS/ESM）：

```javascript
const { merge } = require('webpack-merge')
const baseConfig = { entry: './src/index.js', externals: [nodeExternals()] }

module.exports = [
  merge(baseConfig, {
    output: { filename: 'index.umd.js', library: { type: 'umd' } },
  }),
  merge(baseConfig, {
    output: { filename: 'index.cjs.js', library: { type: 'commonjs2' } },
  }),
]
```

**配置函数写法**——通过 `--env` 参数在运行时区分环境：

```javascript
module.exports = function(env, argv) {
  const isProd = env.mode === 'production'
  return {
    mode: isProd ? 'production' : 'development',
    devtool: isProd ? 'source-map' : 'eval-source-map',
    watch: argv.watch,
    // ...
  }
}
```

```json
{
  "scripts": {
    "build": "webpack --env mode=production",
    "dev": "webpack --env mode=development --watch"
  }
}
```

发布前的关键文件：

- **`.npmignore`**：排除 `src/`、`webpack.config.js` 等不需要发布的文件，只发布 `lib/`
- **`package.json` 的 `prepublishOnly`**：发布前自动执行构建，防止发布过时产物

```json
{
  "main": "lib/index.js",
  "scripts": {
    "prepublishOnly": "npm run build"
  },
  "peerDependencies": {
    "react": ">=16.8.0"
  }
}
```

`peerDependencies` 声明宿主需要提供的依赖（如 React），配合 `externals` 不打包它，消费方的 node_modules 里已经有了，不会重复安装。

> 💬 **面试官**：开发 npm 包时 `externals` 和 `peerDependencies` 各解决什么问题？
>
> ✅ 标准答案：`externals` 是构建层的——告诉 Webpack 这些包不打进 bundle；`peerDependencies` 是 npm 层的——告诉使用者需要自己安装这些依赖。两者需要配套使用，缺一不可。
> 🎁 加分答案：如果只配 `externals` 不配 `peerDependencies`，消费方可能不知道要装什么，运行时报「找不到模块」；如果只配 `peerDependencies` 不配 `externals`，React 会被打进包里，消费方最终 bundle 里有两套 React，Hooks 报错。

### Webpack + TypeScript + React 完整配置要点

在三文件架构基础上，TypeScript 项目需要额外注意：

```javascript
// tsconfig.json 关键配置
{
  "compilerOptions": {
    "module": "ESNext",        // 保持 ESM，让 Webpack 做 Tree Shaking
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./src/*"]       // 和 webpack alias 保持一致
    }
  }
}
```

```javascript
// fork-ts-checker-webpack-plugin：把类型检查移到独立进程，不阻塞构建
const ForkTsCheckerPlugin = require('fork-ts-checker-webpack-plugin')
plugins: [new ForkTsCheckerPlugin()]
```

---

## 💡 一张图总结（面试速记）

| 知识点 | 核心结论 | 面试频率 |
|--------|---------|---------|
| Loader vs Plugin | Loader 转换文件内容，Plugin 贯穿生命周期 | ⭐⭐⭐⭐⭐ |
| Loader 执行顺序 | pre→normal→inline→post，每类内部从右到左 | ⭐⭐⭐⭐ |
| Loader pitch 阶段 | 从左到右执行，有返回值则跳过后续 normal，style-loader 利用此机制 | ⭐⭐⭐⭐ |
| Asset Modules | Webpack 5 内置，替代 url/file/raw-loader | ⭐⭐⭐ |
| 三文件架构 | common + dev + prod，webpack-merge 合并 | ⭐⭐⭐⭐ |
| hash / chunkhash / contenthash | 粒度依次变细，CSS 用 contenthash 避免缓存误失效 | ⭐⭐⭐⭐⭐ |
| Source Map 策略 | 开发用 `eval-cheap-module`，生产用 `hidden` | ⭐⭐⭐⭐ |
| HMR 原理 | WebSocket 推送 hash → 差量拉取 → module.hot.accept 替换 | ⭐⭐⭐⭐⭐ |
| Tree Shaking | 依赖 ESM 静态分析，CJS 不可摇 | ⭐⭐⭐⭐⭐ |
| 代码分割 | splitChunks 提取公共模块，动态 import 懒加载 | ⭐⭐⭐⭐⭐ |
| Bundle 结构 | IIFE + __webpack_require__ 实现迷你模块系统 | ⭐⭐⭐⭐ |
| Tapable 钩子分类 | Bail 熔断 / Waterfall 瀑布 / Parallel 并行 / Series 串行 | ⭐⭐⭐⭐ |
| 构建三阶段 | 初始化→构建（make/ModuleGraph）→封装（seal/ChunkGraph）| ⭐⭐⭐⭐ |
| 手写 Webpack | AST 收集依赖 → 递归依赖图 → IIFE bundle | ⭐⭐⭐⭐ |
| 模块联邦 shared | singleton 避免多实例，requiredVersion 版本协商 | ⭐⭐⭐⭐ |
| 模块联邦双向依赖 | Host/Remote 角色可互换，入口须异步 import bootstrap | ⭐⭐⭐ |
| 开发 npm 包 | externals 不打包 + peerDependencies 声明宿主依赖，缺一不可 | ⭐⭐⭐⭐ |
| 多产物格式 | webpack-merge 数组配置，一次构建输出 UMD/CJS 多格式 | ⭐⭐⭐ |
| DllPlugin vs cache | Webpack 5 优先 filesystem cache，DllPlugin 适合 CI | ⭐⭐⭐ |

---

## 📝 留个问题

同样是实现微前端，模块联邦、qiankun（基于 single-spa）、iframe 三种方案你会怎么选型？各自适合什么边界条件？

欢迎评论区说说你项目里的实际决策。

---

> 🔖 这是「前端工程化系列」第 5 篇。上一篇：《Monorepo 架构完整指南：Turborepo + pnpm workspace（面试收藏级）》；下一篇预告：《Vite 原理深挖——为什么比 Webpack 快那么多？》

