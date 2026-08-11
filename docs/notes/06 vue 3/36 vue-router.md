# 整体架构原理图
```plain
+---------------------------------------------------+
|                  createRouter()                   |
|  - 初始化 history(HTML5History / HashHistory)      |
|  - 构建路由匹配器 matcher                            |
|  - 提供响应式 currentRoute                          |
+---------------------------------------------------+
                      |
                      v
+---------------------------------------------------+
|                   history API                     |
|  - pushState / replaceState / popstate 事件        |
|  - hashchange 事件                                 |
+---------------------------------------------------+
                      |
                      v
+---------------------------------------------------+
|                 路由匹配器 matcher                  |
|  - 解析 path，匹配路由表                             |
|  - 生成 RouteRecord                                |
|  - 提供 addRoute、removeRoute 等                    |
+---------------------------------------------------+
                      |
                      v
+---------------------------------------------------+
|                导航解析与守卫                        |
|  beforeEach -> beforeResolve -> afterEach         |
|  - 支持异步、拦截、重定向                             |
+---------------------------------------------------+
                      |
                      v
+---------------------------------------------------+
|               响应式 currentRoute                  |
|   - ref(route)                                    |
|   - 当路由变化时触发组件重新渲染                       |
+---------------------------------------------------+
                      |
                      v
+---------------------------------------------------+
|                    视图渲染                        |
|  <RouterView> 订阅 currentRoute，                  |
|  根据匹配到的组件渲染（支持嵌套路由）                   |
+---------------------------------------------------+

```

# 安装pnpm
```shell
npm install pnpm -g
```

# 初始化项目
```shell
mkdir g-vue-router
pnpm init
```

## 脚本配置
```json
{
  "private": true,
  "type": "module",
  "version": "1.0.0",
  "description": "vue-router 源码",
  "scripts": {},
  "license": "ISC",
  "packageManager": "pnpm@10.13.1",
}
```

## Typescript 配置
```json
{
  "compilerOptions": {
    "outDir": "dist", // 输出目录
    "sourceMap": true, // 生成sourceMap
    "target": "es2016", // 目标版本
    "module": "esnext", // 模块类型
    "moduleResolution": "node", // 模块解析策略
    "strict": false, // 严格模式
    "resolveJsonModule": true, // 解析JSON模块
    "esModuleInterop": true, // 启用ES模块互操作
    "jsx": "preserve", // 保留JSX语法
    "lib": ["ESNext", "DOM"], // 支持的库，ESNext和DOM
    "baseUrl": ".",
    "paths": {
      "@g-vue-router/*": ["packages/*/src"],
      "g-vue-router": ["packages/vue-router/src"],
    }
  }
}
```

# 搭建 Monorepo 环境
## 配置
```yaml
packages:
  - 'packages/*'


linkWorkspacePackages: true # 允是否许链接 workspace 包
shamefullyHoist: false  # 是否允许将 workspace 包提升到根目录
```

## 创建子包
```shell
cd g-vue-router
mkdir vue-router
```

### vue-router
#### 创建入口
```shell
cd vue-router
mkdir src
touch index.ts
```

#### 初始化
```shell
pnpm init
```

```json
{
  "name": "g-vue-router",
  "version": "1.0.0",
  "description": "",
  "module": "dist/g-vue-router.esm.js",
  "unpkg": "dist/g-vue-router.global.js",
  "buildOptions": {
    "name": "GVueRouter",
    "formats": [
      "esm-bundler",
      "esm-browser",
      "esm",
      "global",
      "cjs"
    ]
  },
  "scripts": {},
  "keywords": [
    "vue-next",
    "vue",
    "vue3",
    "vue-router"
  ],
  "author": "Robin",
  "license": "ISC",
  "packageManager": "pnpm@10.13.1"
}

```

#### 编写代码
##### index.ts
```typescript
console.log('vue-router')
```

# 打包
## 安装依赖
```shell
pnpm add esbuild http-server minimist typescript -w -D
pnpm add vue -S
```

```diff
{
  "version": "1.0.0",
  "description": "vue-router 源码",
  "type": "module",
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.13.1",
+  "devDependencies": {
+    "esbuild": "^0.25.9",
+    "http-server": "^14.1.1",
+    "minimist": "^1.2.8",
+    "typescript": "^5.9.2"
+  }
}

```

## 编写脚本
```shell
cd g-vue-router
mkdir scripts
cd scripts
touch dev.js
```

### scripts
#### dev.js
```javascript
import { context } from "esbuild";
import minimist from "minimist";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// 解析命令行参数，返回构建配置
function parseBuildOptions(args) {
  const packageName = args.pkg || "reactivity"; // 默认包名
  const formatArg = args.f || "global"; // 默认格式
  const packageJsonPath = path.resolve(
    __dirname,
    `../packages/${packageName}/package.json`
  );
  // const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  const packageJson = require(packageJsonPath);
  // 规范化输出格式
  let outputFormat = "iife";
  if (formatArg.startsWith("esm")) outputFormat = "esm";
  else if (formatArg.startsWith("cjs")) outputFormat = "cjs";
  else if (formatArg.startsWith("umd")) outputFormat = "umd";
  // 输出文件路径
  const outputFile = path.resolve(
    __dirname,
    `../packages/${packageName}/dist/${packageName}.${formatArg}.js`
  );
  return {
    packageName,
    formatArg,
    packageJson,
    outputFormat,
    outputFile,
  };
}

// 执行单个包的构建并监听
async function buildAndWatch({
  packageName,
  packageJson,
  outputFormat,
  outputFile,
}) {
  const ctx = await context({
    entryPoints: [
      path.resolve(__dirname, `../packages/${packageName}/src/index.ts`),
    ],
    outfile: outputFile,
    bundle: true,
    sourcemap: true,
    minify: false,
    format: outputFormat,
    globalName: packageJson?.buildOptions?.name,
    platform: outputFormat === "cjs" ? "node" : "browser",
  });
  await ctx.watch();
  console.log(`watching ${packageName} (${outputFormat})...`);
}

// 获取所有 packages 目录下的包名
function getAllPackageNames() {
  return fs.readdirSync(path.resolve(__dirname, "../packages"));
}

// 主入口，解析参数并批量构建
async function main() {
  const args = minimist(process.argv.slice(2));
  const allPackages = getAllPackageNames();
  // 支持命令行指定包名（如 node dev.js reactivity runtime-core）
  const targetPackages = args._.length ? args._ : allPackages;
  // 支持多格式构建
  const formats =
    !args.f || args.f === "all" ? ["global", "esm", "cjs"] : [args.f || "esm"];
  // 遍历所有包和格式，执行构建
  for (const pkgName of targetPackages) {
    for (const format of formats) {
      const buildOptions = parseBuildOptions({ pkg: pkgName, f: format });
      await buildAndWatch(buildOptions);
    }
  }
}

main();
```

## 配置指令
```diff
{
  "version": "1.0.0",
  "description": "vue-router 源码",
  "type": "module",
+  "scripts": {
+    "dev": "node scripts/dev.js",
+  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.13.1",
  "devDependencies": {
    "esbuild": "^0.25.9",
    "http-server": "^14.1.1",
    "minimist": "^1.2.8",
    "typescript": "^5.9.2"
  },
  "dependencies": {
    "vue": "^3.5.18"
  }
}
```

+ pnpm dev：打包所有子包
+ pnpm dev-xxx：打包指定的子包
+ 手动打包指定的子包：node scripts/dev.js shared -f esm
    - 参数一：为子包的目录名
    - 参数-f：为打包的格式，有 global、esm、cjs

# 测试
## 创建测试页面
```shell
cd g-vue-router
pnpm create vite
```

## 查看结果
```shell
cd router && pnpm dev
cd emp && pnpm dev
```

# 目录结构
```shell
.
├── emp # vue-router 测试代码
│   ├── index.html
│   ├── node_modules
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── public
│   │   └── vite.svg
│   ├── README.md
│   ├── src
│   │   ├── App.vue
│   │   ├── assets
│   │   ├── components
│   │   │   └── HelloWorld.vue
│   │   ├── main.ts
│   │   ├── routes
│   │   │   └── index.ts
│   │   ├── style.css
│   │   ├── views
│   │   │   ├── About.vue
│   │   │   └── Home.vue
│   │   └── vite-env.d.ts
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── readme.md # 说明文件
└── router # vue router 源码
    ├── node_modules
    ├── package.json
    ├── packages
    │   └── vue-router
    │       ├── dist
    │       ├── node_modules
    │       ├── package.json
    │       └── src
    │           └── index.ts
    ├── pnpm-lock.yaml
    ├── pnpm-workspace.yaml
    ├── scripts
    │   └── dev.js
    └── tsconfig.json
```

# 总结
## 路由模式
### Hash 模式
+ 基于 `location.hash` 和 `hashchange` 事件。
+ 兼容性最好，适合所有浏览器。

### History 模式
+ 基于 `popstate` 和 `pushState` / `replaceState` 。
+ 需要服务器支持（避免 404 问题）。
+ 更干净的 URL，适合 SEO。

### 重点
+ 明确区分两种模式的适用场景。
+ 补充服务器配置的注意事项（如 Nginx 的 `try_files` ）。

## Vue Router 4 模式统一
+ 在 Vue Router 4 中，Hash 模式的核心逻辑是通过 `popstate` 事件监听 URL 变化，而不是传统的 `hashchange` 事件。具体实现如下：

### 关键点
#### `popstate` 统一监听
+ 无论是 Hash 模式还是 History 模式，Vue Router 4 都通过 `popstate` 事件监听浏览器导航（前进/后退）。
+ 这是为了统一事件处理逻辑，减少代码冗余。

#### Hash 模式的特殊处理
+ 在 Hash 模式下，URL 的 `#` 部分（即 `location.hash` ）会被解析为路由路径。
+ 通过 `pushState` 和 `replaceState` 修改 URL 时，会手动触发 `popstate` 事件。

#### 源码中的体现
+ 在 `src/history/hash.ts` 中，Hash 模式的实现继承自 `History` 基类，并通过 `popstate` 监听路由变化。
+ 例如：

```typescript
window.addEventListener('popstate', () => {
  // 处理 Hash 或 History 模式的路由变化
});
```

### 为什么不再使用 `hashchange` 
#### 统一事件流
+ 使用 `popstate` 可以统一处理 Hash 和 History 模式的路由变化，简化代码逻辑。
+ 避免同时监听 `hashchange` 和 `popstate` 导致的事件冲突或重复触发。

#### 现代浏览器的支持
+ `popstate` 在现代浏览器中表现稳定，且能覆盖 Hash 模式的需求。
+ `hashchange` 的兼容性优势在现代开发中逐渐弱化。

#### 编程式导航的一致性
+ 无论是 Hash 还是 History 模式，都可以通过 `pushState` 和 `replaceState` 修改 URL，行为一致。

## 路由匹配与组件渲染
### 匹配逻辑
+ 根据路径解析为 `RouteRecord` 数组（嵌套路由支持）。
+ 使用 `matcher` 核心模块高效匹配。

### 组件渲染
+ 通过 `<RouterView>` 动态渲染匹配的组件。
+ 内部使用 `shallowRef` 优化性能（避免深层响应式开销）。

### 重点
+ 强调 `shallowRef` 的作用（减少不必要的响应式追踪）。
+ 补充嵌套路由的匹配顺序（父 → 子）。

## 导航守卫与生命周期
### 钩子分类
+ **全局守卫**： `beforeEach` 、 `beforeResolve` 、 `afterEach` 。
+ **路由独享守卫**： `beforeEnter` 。
+ **组件内守卫**： `onBeforeRouteUpdate` 、 `onBeforeRouteLeave` （Composition API）。

### 执行流程
+ 钩子被转换为 `Promise` 链式调用。
+ 支持异步控制（如 `next(false)` 或重定向）。

### 重点
+ 明确钩子的执行顺序（全局 → 路由 → 组件）。
+ 补充错误处理逻辑（如 `next(error)` ）。

### 完整的导航解析流程
1. 导航被触发。
2. 在失活的组件里调用 `beforeRouteLeave` 守卫。
3. 调用全局的 `beforeEach` 守卫。
4. 在重用的组件里调用 `beforeRouteUpdate` 守卫(2.2+)。
5. 在路由配置里调用 `beforeEnter`。
6. 解析异步路由组件。
7. 在被激活的组件里调用 `beforeRouteEnter`。
8. 调用全局的 `beforeResolve` 守卫(2.5+)。
9. 导航被确认。
10. 调用全局的 `afterEach` 钩子。
11. 触发 DOM 更新。
12. 调用 `beforeRouteEnter` 守卫中传给 `next` 的回调函数，创建好的组件实例会作为回调函数的参数传入。

## 动态路由
### 核心方法
+ `addRoute` ：动态添加路由规则。
+ `removeRoute` ：移除路由规则。
+ `hasRoute` ：检查路由是否存在。

### 使用场景
+ 权限控制（根据用户角色加载路由）。
+ 懒加载模块化路由。

### 重点
+ 补充动态路由的缓存策略（避免重复加载）。
+ 强调路由唯一性（ `name` 或 `path` 冲突处理）。

## 响应式设计
### 路由状态
+ 使用 `reactive` 封装当前路由信息（ `route` 对象）。
+ 通过 `inject/provide` 跨组件共享状态。

### 性能优化
+ 依赖收集仅针对必要的路由属性（如 `params` 、 `query` ）。

## 核心模块
+ **Router**：管理路由实例和全局配置。
+ **Matcher**：高效匹配路由规则。
+ **Navigation**：处理导航流程和守卫调度。
+ **History**：抽象路由模式的具体实现。



# 源码
[GitHub - lotosv2010/g-vue-router: vue-router source](https://github.com/lotosv2010/g-vue-router)

