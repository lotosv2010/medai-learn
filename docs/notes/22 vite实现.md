# <font style="color:rgb(51, 51, 51);">核心知识</font>
## <font style="color:rgb(51, 51, 51);">安装依赖</font>
```plain
pnpm add connect es-module-lexer resolve check-is-array esbuild fast-glob fs-extra serve-static magic-string chokidar ws  hash-sum --save
```

## <font style="color:rgb(51, 51, 51);">Connect</font>
+ [connect](https://www.npmjs.com/package/connect)<font style="color:rgb(51, 51, 51);">是一个框架，它使用被称为中间件的模块化组件，以可重用的方式实现 web 程序的逻辑</font>
+ <font style="color:rgb(51, 51, 51);">在 Connect 中，中间件组件是一个函数，它拦截 HTTP 服务器提供的请求和响应，执行逻辑，然后，或者结束响应，或者把它传递给下一个中间件组件</font>
+ <font style="color:rgb(51, 51, 51);">Connect 用分配器把中间件</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">连接</font>`<font style="color:rgb(51, 51, 51);">在一起</font>
+ <font style="color:rgb(51, 51, 51);">Express 构建在 Connect 之上的更高层的框架</font>

```javascript
const connect = require("connect");
const http = require("http");

const middlewares = connect();
middlewares.use(function (req, res, next) {
  console.log("middleware1");
  next();
});
middlewares.use(function (req, res, next) {
  console.log("middleware2");
  next();
});
middlewares.use(function (req, res, next) {
  res.end("Hello from Connect!");
});
http.createServer(middlewares).listen(3000);
```

## <font style="color:rgb(51, 51, 51);">serve-static</font>
+ [serve-static](https://www.npmjs.com/package/serve-static)<font style="color:rgb(51, 51, 51);">是一个静态文件中中间件</font>

```javascript
const connect = require("connect");
const static = require("serve-static");
const http = require("http");

const middlewares = connect();
middlewares.use(static(__dirname));
http.createServer(middlewares).listen(3001);
```

## <font style="color:rgb(51, 51, 51);">es-module-lexer</font>
+ [es-module-lexer](https://www.npmjs.com/package/es-module-lexer)<font style="color:rgb(51, 51, 51);">是一个 JS 模块语法解析器</font>

```javascript
const { init, parse } = require("es-module-lexer");
(async () => {
  await init;
  const [imports, exports] = parse(`import _ from 'lodash';\nexport var p = 5`);
  console.log(imports);
  console.log(exports);
})();
```

## <font style="color:rgb(51, 51, 51);">resolve</font>
+ [resolve](https://www.npmjs.com/package/resolve)<font style="color:rgb(51, 51, 51);">实现了 node 的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">require.resolve()</font>`<font style="color:rgb(51, 51, 51);">算法</font>

```javascript
const resolve = require("resolve");
const res = resolve.sync("check-is-array", { basedir: __dirname });
console.log(res);
```

## <font style="color:rgb(51, 51, 51);">fast-glob</font>
+ [fast-glob](https://www.npmjs.com/package/fast-glob)<font style="color:rgb(51, 51, 51);">该包提供了一些方法，用于遍历文件系统，并根据</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Unix Bash shell</font>`<font style="color:rgb(51, 51, 51);">使用的规则返回与指定模式的定义集匹配的路径名</font>

```javascript
const fg = require("fast-glob");
(async () => {
  const entries = await fg(["**/*.js"]);
  console.log(entries);
})();
```

## <font style="color:rgb(51, 51, 51);">magic-string</font>
+ [magic-string](https://www.npmjs.com/package/magic-string)<font style="color:rgb(51, 51, 51);">是一个用来操作字符串的库</font>

```javascript
const MagicString = require("magic-string");
const ms = new MagicString("var age = 10");
ms.overwrite(10, 12, "11");
console.log(ms.toString());
```

# <font style="color:rgb(51, 51, 51);">实现命令行</font>
## <font style="color:rgb(51, 51, 51);">package.json</font>
```json
{
  "name": "g-vite",
  "version": "1.0.0",
  "description": "",
  "main": "lib/cli.js",
  "bin": {
    "g-vite": "bin/g-vite.js"
  },
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "chalk": "^4.1.2",
    "connect": "^3.7.0"
  }
}
```

## <font style="color:rgb(51, 51, 51);">bin</font>
### <font style="color:rgb(51, 51, 51);">g-vite.js</font>
```javascript
#! /usr/bin/env node

require("../lib/cli");
```

## <font style="color:rgb(51, 51, 51);">lib</font>
### <font style="color:rgb(51, 51, 51);">cli.js</font>
```javascript
console.log("g-vite");
```

## 测试
```shell
pnpm link -g
g-vite
```

# <font style="color:rgb(51, 51, 51);">实现 http 服务器</font>
## 安装依赖
```shell
pnpm add connect chalk@4 -D
```

## package.json
```diff
{
  "name": "g-vite",
  "version": "1.0.0",
  "description": "",
  "main": "lib/cli.js",
  "bin": {
    "g-vite": "bin/g-vite.js"
  },
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "chalk": "^4.1.2",
+    "connect": "^3.7.0"
  }
}
```

## <font style="color:rgb(51, 51, 51);">lib</font>
### <font style="color:rgb(51, 51, 51);">cli.js</font>
```diff
+ const { createServer } = require("./server");
+ 
+ async function start() {
+   const server = await createServer();
+   server.listen(5173);
+ }
+ 
+ start();
```

### <font style="color:rgb(51, 51, 51);">server</font>
#### <font style="color:rgb(51, 51, 51);">index.js</font>
```javascript
const connect = require("connect");
const http = require("http");
const { printInfo } = require("../utils");

async function createServer() {
  const middlewares = connect();

  const server = {
    async listen(port) {
      http.createServer(middlewares).listen(port, async () => {
        printInfo(port);
      });
    },
  };

  return server;
}

exports.createServer = createServer;
```

### utils.js
```javascript
const os = require("os");
const chalk = require("chalk");

// 获取内网ip
function getIPAddress() {
  let IPAddress = "";
  const interfaces = os.networkInterfaces();
  for (let devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (
        alias.family === "IPv4" &&
        alias.address !== "127.0.0.1" &&
        !alias.internal
      ) {
        IPAddress = alias.address;
      }
    }
  }
  return IPAddress;
}

function printInfo(port) {
  const ip = getIPAddress();
  console.log(`
    ${chalk.yellow("Starting up http-server, serving")} ${chalk.blue("./")}
    ${chalk.yellow("Available on:")}
      http://127.0.0.1:${chalk.green(port)}
      http://${ip}:${chalk.green(port)}
    Hit CTRL-C to stop the server
  `);
}

exports.printInfo = printInfo;
exports.getIPAddress = getIPAddress;
```

## 测试
```shell
cd example
g-vite
```

# <font style="color:rgb(51, 51, 51);">实现静态文件中间件</font>
## 安装依赖
```shell
pnpm add serve-static -D
```

## package.json
```diff
{
  "name": "g-vite",
  "version": "1.0.0",
  "description": "",
  "main": "lib/cli.js",
  "bin": {
    "g-vite": "bin/g-vite.js"
  },
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "chalk": "^4.1.2",
    "connect": "^3.7.0",
+    "serve-static": "^2.2.0"
  }
}
```

## lib
### server
#### index.js
```diff
const connect = require("connect");
const http = require("http");
const { printInfo } = require("../utils");
+ const serverStaticMiddleware = require("./middlewares/static");
+ const resolveConfig = require("../config");

/**
 * 创建服务器
 * @returns Promise<Server> 服务器实例
 */
async function createServer() {
  const middlewares = connect();
+  const config = await resolveConfig();

  const server = {
    async listen(port) {
      http.createServer(middlewares).listen(port, async () => {
        printInfo(port);
      });
    },
  };

+  // 静态资源处理
+  middlewares.use(serverStaticMiddleware(config));

  return server;
}

exports.createServer = createServer;
```

#### <font style="color:rgb(51, 51, 51);">middlewares</font>
##### <font style="color:rgb(51, 51, 51);">static.js</font>
```javascript
const static = require("serve-static");

/**
 * 静态资源服务中间件
 * @param {object} options 配置项 
 */
function serverStaticMiddleware({ root }) {
  return static(root);
}

module.exports = serverStaticMiddleware;
```

### <font style="color:rgb(51, 51, 51);">config.js</font>
```javascript
const { normalizePath } = require("./utils");

/**
 * 解析配置文件
 * @returns {Promise<{root: string}>} 配置对象
 */
async function resolveConfig() {
  const root = normalizePath(process.cwd());
  const config = {
    root,
  };
  return config;
}

module.exports = resolveConfig;
```

### <font style="color:rgb(51, 51, 51);">utils.js</font>
```diff
const os = require("os");
const chalk = require("chalk");

/**
 * @description 获取内网ip
 * @returns {string} 内网ip
 */
function getIPAddress() {
  let IPAddress = "";
  const interfaces = os.networkInterfaces();
  for (let devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (
        alias.family === "IPv4" &&
        alias.address !== "127.0.0.1" &&
        !alias.internal
      ) {
        IPAddress = alias.address;
      }
    }
  }
  return IPAddress;
}

/**
 * 打印信息
 * @param {number} port 端口
 */
function printInfo(port) {
  const ip = getIPAddress();
  console.log(`
    ${chalk.yellow("Starting up http-server, serving")} ${chalk.blue("./")}
    ${chalk.yellow("Available on:")}
      http://127.0.0.1:${chalk.green(port)}
      http://${ip}:${chalk.green(port)}
    Hit CTRL-C to stop the server
  `);
}

+ /**
+  * 格式化路径
+  * @param {string} id 路径
+  * @returns {string} 格式化后的路径
+  */
+ function normalizePath(id) {
+   return id.replace(/\\/g, "/");
+ }

exports.printInfo = printInfo;
exports.getIPAddress = getIPAddress;
+ exports.normalizePath = normalizePath;
```

## example
### index.html
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + Vue</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

### src
#### main.js
```javascript
console.log("hello world");
```

## 测试
```shell
cd example
g-vite
```

# <font style="color:rgb(51, 51, 51);">分析第三方依赖</font>
## 安装依赖
```shell
pnpm add esbuild fs-extra resolve -D
```

## package.json
```diff
{
  "name": "g-vite",
  "version": "1.0.0",
  "description": "",
  "main": "lib/cli.js",
  "bin": {
    "g-vite": "bin/g-vite.js"
  },
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "chalk": "^4.1.2",
    "connect": "^3.7.0",
+    "esbuild": "^0.25.5",
+    "fs-extra": "^11.3.0",
+    "resolve": "^1.22.10",
    "serve-static": "^2.2.0"
  }
}
```

## lib
### server
#### index.js
```diff
const connect = require("connect");
const http = require("http");
const { printInfo } = require("../utils");
const serverStaticMiddleware = require("./middlewares/static");
const resolveConfig = require("../config");
+ const { createOptimizeDepsRun } = require("../optimizer");

+ /**
+  * 优化依赖，找到本项目依赖的第三方模块
+  * @param {object} config 配置项
+  * @param {object} server 服务器实例
+  */
+ async function runOptimize(config, server) {
+   await createOptimizeDepsRun(config);
+ }

/**
 * 创建服务器
 * @returns Promise<Server> 服务器实例
 */
async function createServer() {
  const middlewares = connect();
  const config = await resolveConfig();

  const server = {
    async listen(port) {
+      await runOptimize(config, server);
      http.createServer(middlewares).listen(port, async () => {
        printInfo(port);
      });
    },
  };

  // 静态资源处理
  middlewares.use(serverStaticMiddleware(config));

  return server;
}

exports.createServer = createServer;
```

#### pluginContainer.js
```javascript
const { normalizePath } = require("../utils");
const path = require("path");

/**
 * 创建插件容器
 * @param {object} options 配置项
 */
async function createPluginContainer({ plugins, root }) {
  class PluginContext {} // 创建插件上下文
  const container = {
    // 作用是存储插件，并调用插件的resolveId方法
    async resolveId(id, importer) {
      const ctx = new PluginContext(); // 创建插件上下文
      let resolveId = id; // 存储id
      for (const plugin of plugins) { // 遍历插件
        if (!plugin.resolveId) continue; // 如果插件没有resolveId方法，则跳过
        const result = await plugin.resolveId.call(ctx, id, importer); // 调用插件的resolveId方法
        if (result) {
          resolveId = result.id || result; // 存储id
          break;
        }
      }
      return { id: normalizePath(resolveId) }; // 返回id
    },
  };
  return container;
}
exports.createPluginContainer = createPluginContainer;
```

### optimizer
#### index.js
```javascript
const scanImports = require("./scan");

/**
 * 创建优化依赖任务
 * @param {object} config 配置项
 */
async function createOptimizeDepsRun(config) {
  const deps = await scanImports(config); // 扫描依赖，返回依赖对象
  console.log('createOptimizeDepsRun', deps);
  
}

exports.createOptimizeDepsRun = createOptimizeDepsRun;
```

#### scan.js
```javascript
const { build } = require("esbuild");
const esbuildScanPlugin = require("./esbuildScanPlugin");

/**
 * 扫描项目依赖
 * @param {object} config 配置对象
 */
async function scanImports(config) {
  const depImports = {}; // 存放依赖导入
  const esPlugin = await esbuildScanPlugin(config, depImports); // 创建esbuild插件
  await build({
    absWorkingDir: config.root, // 工作目录
    entryPoints: ["./index.html"], // 入口文件
    bundle: true, // 打包
    format: "esm", // esm格式
    outfile: "dist/index.js", // 输出文件
    write: false, // true为写入文件, false为不写入文件
    plugins: [esPlugin], // 插件
  });
  return depImports;
}

module.exports = scanImports;
```

#### esbuildScanPlugin.js
```javascript
const fs = require("fs-extra");
const path = require("path");
const { createPluginContainer } = require("../server/pluginContainer");
const resolvePlugin = require("../plugins/resolve");
const { normalizePath } = require("../utils");

const htmlTypesRE = /\.html$/; // html文件
const scriptModuleRE = /<script type="module" src\="(.+?)"><\/script>/; // 脚本模块
const JS_TYPES_RE = /\.js$/; // js文件

/**
 * 获取esbuild扫描插件的工厂方法
 * @param {object} config 配置对象
 * @param {object} depImports 依赖对象
 */
async function esbuildScanPlugin(config, depImports) {
  config.plugins = [resolvePlugin(config)]; // 添加解析插件
  const container = await createPluginContainer(config); // 创建插件容器
  // 创建解析方法
  const resolve = async (id, importer) => {
    return await container.resolveId(id, importer);
  };
  return {
    name: "g-vite:dep-scan",
    setup(build) {
      build.onResolve({ filter: htmlTypesRE }, async ({ path, importer }) => {
        const resolved = await resolve(path, importer); // 解析路径
        if (resolved) {
          return {
            path: resolved.id || resolved,
            namespace: "html",
          };
        }
      });
      build.onResolve({ filter: /.*/ }, async ({ path, importer }) => {
        const resolved = await resolve(path, importer); // 解析路径
        if (resolved) {
          const id = resolved.id || resolved; // 获取id
          const included = id.includes("node_modules"); // 判断是否是第三方包
          if (included) {
            depImports[path] = normalizePath(id); // 添加到依赖列表中
            return {
              path: id,
              external: true,
            };
          }
          return {
            path: id,
          };
        }
        return { path };
      });
      build.onLoad(
        { filter: htmlTypesRE, namespace: "html" },
        async ({ path }) => {
          const html = fs.readFileSync(path, "utf-8"); // 读取html文件
          const [, scriptSrc] = html.match(scriptModuleRE); // 匹配script标签
          const js = `import ${JSON.stringify(scriptSrc)};\n`; // 生成js代码
          return {
            loader: "js",
            contents: js,
          };
        }
      );
      build.onLoad({ filter: JS_TYPES_RE }, ({ path: id }) => {
        let ext = path.extname(id).slice(1); // 获取文件后缀
        let contents = fs.readFileSync(id, "utf-8"); // 读取文件
        return {
          loader: ext,
          contents,
        };
      });
    },
  };
}
module.exports = esbuildScanPlugin;
```

### plugins
#### resolve.js
```javascript
const fs = require("fs");
const path = require("path");
const resolve = require("resolve");

function resolvePlugin(config) {
  return {
    name: "g-vite:resolve",
    resolveId(id, importer) {
      // 如果以/开头表示可能是绝对路径（POSIX系统）或相对路径
      if (id.startsWith("/")) {
        // 对于Windows系统，进一步检查是否是驱动器盘符路径（如 C:/...）
        const isWindows = process.platform === 'win32';
        if (isWindows && /^[A-Za-z]:/.test(id)) {
          // Windows 驱动器盘符路径（如 C:/...）
          return { id: path.resolve(id) };
        }
        // POSIX 系统（macOS/Linux）的绝对路径
        return { id: path.resolve(config.root, id.slice(1)) };
      }
      // 如果已经是绝对路径（跨平台支持）
      if (path.isAbsolute(id)) {
        return { id };
      }
      // 如果是相对路径
      if (id.startsWith(".")) {
        const basedir = path.dirname(importer);
        const fsPath = path.resolve(basedir, id);
        return { id: fsPath };
      }
      // 如果是第三方包
      let res = tryNodeResolve(id, importer, config);
      if (res) {
        return res;
      }
    },
  };
}

function tryNodeResolve(id, importer, config) {
  const pkgPath = resolve.sync(`${id}/package.json`, { basedir: config.root });
  const pkgDir = path.dirname(pkgPath);
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const entryPoint = pkg.module || pkg.main;
  const entryPointPath = path.join(pkgDir, entryPoint);
  return { id: entryPointPath };
}
module.exports = resolvePlugin;
```

## example
### 安装依赖
```shell
pnpm install
```

### package.json
```json
{
  "name": "example",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "g-vite",
    "build": "g-vite build",
    "preview": "g-vite preview"
  },
  "dependencies": {
    "lodash": "^4.17.21",
    "vue": "^3.2.37"
  }
}
```

### src
#### main.js
```javascript
import { createApp } from "vue";
import _ from "lodash";

console.log("createApp", createApp);
console.log("lodash", _);
```

## 测试
```shell
cd example
g-vite
```

# <font style="color:rgb(51, 51, 51);">预编译并保存 metadata</font>
## <font style="color:rgb(51, 51, 51);">lib</font>
### <font style="color:rgb(51, 51, 51);">server</font>
#### <font style="color:rgb(51, 51, 51);">index.js</font>
```diff
const connect = require("connect");
const http = require("http");
const { printInfo } = require("../utils");
const serverStaticMiddleware = require("./middlewares/static");
const resolveConfig = require("../config");
const { createOptimizeDepsRun } = require("../optimizer");

/**
 * 优化依赖，找到本项目依赖的第三方模块
 * @param {object} config 配置项
 * @param {object} server 服务器实例
 */
async function runOptimize(config, server) {
+  const optimizeDeps = await createOptimizeDepsRun(config);
+  server._optimizeDepsMetadata = optimizeDeps.metadata;
+  console.log(server._optimizeDepsMetadata);
}

/**
 * 创建服务器
 * @returns Promise<Server> 服务器实例
 */
async function createServer() {
  const middlewares = connect();
  const config = await resolveConfig();

  const server = {
    async listen(port) {
      //! 1.找到本项目依赖的第三方模块
      await runOptimize(config, server);
      http.createServer(middlewares).listen(port, async () => {
        printInfo(port);
      });
    },
  };

  // 静态资源处理
  middlewares.use(serverStaticMiddleware(config));

  return server;
}

exports.createServer = createServer;
```

### <font style="color:rgb(51, 51, 51);">config.js</font>
```diff
+ const path = require("path");
const { normalizePath } = require("./utils");

/**
 * 解析配置文件
 * @returns {Promise<{root: string}>} 配置对象
 */
async function resolveConfig() {
  const root = normalizePath(process.cwd()); // 项目根目录
+  const cacheDir = normalizePath(path.resolve(`node_modules/.g-vite`)); // 缓存目录
  const config = {
    root,
+    cacheDir
  };
  return config;
}

module.exports = resolveConfig;
```

### <font style="color:rgb(51, 51, 51);">optimizer</font>
#### <font style="color:rgb(51, 51, 51);">index.js</font>
```diff
const scanImports = require("./scan");
+ const fs = require("fs-extra");
+ const path = require("path");
+ const { build } = require("esbuild");
+ const { normalizePath } = require("../utils");

/**
 * 分析项目依赖的第三方模块
 * @param {object} config 配置项
 */
async function createOptimizeDepsRun(config) {
  // 扫描依赖
  const deps = await scanImports(config);
+  // 缓存目录
+  const { cacheDir } = config;
+  // 缓存依赖的目录
+  const depsCacheDir = path.resolve(cacheDir, "deps");
+  // 缓存依赖的元数据目录
+  const metadataPath = path.join(depsCacheDir, "_metadata.json");
+  // 缓存依赖的元数据缓存
+  const metadata = {
+    optimized: {},
+  };
+  //遍历依赖
+  for (const id in deps) {
+    // 依赖的入口文件
+    const entry = deps[id];
+    // 缓存依赖的文件名
+    const file = normalizePath(path.resolve(depsCacheDir, id + ".js"));
+    // 缓存依赖
+    metadata.optimized[id] = {
+      file,
+      src: entry,
+    };
+    // 预编译
+    await build({
+      absWorkingDir: process.cwd(),
+      entryPoints: [deps[id]],
+      outfile: file,
+      bundle: true,
+      write: true,
+      format: "esm",
+    });
+  }
+  // 确保缓存目录存在
+  await fs.ensureDir(depsCacheDir);
+  // ! 把它们的es module版本进行打包，存放在`node modules/.g-vite/deps`
+  await fs.writeFile(
+    metadataPath,
+    JSON.stringify(
+      metadata,
+      (key, value) => {
+        if (key === "file" || key === "src") {
+          // optimized里存的是绝对路径，此处写入硬盘的是相对于缓存目录的相对路径
+          return normalizePath(path.relative(depsCacheDir, value));
+        }
+        return value;
+      },
+      2
+    )
+  );
+  return { metadata };
}

exports.createOptimizeDepsRun = createOptimizeDepsRun;
```

# <font style="color:rgb(51, 51, 51);">路径优化</font>
## 添加后缀
### lib
#### plugins
##### resolve.js
```diff
const fs = require("fs");
const path = require("path");
const resolve = require("resolve");

function resolvePlugin(config) {
  return {
    name: "g-vite:resolve",
    resolveId(id, importer) {
      // 如果以/开头表示可能是绝对路径（POSIX系统）或相对路径
      if (id.startsWith("/")) {
        // 对于Windows系统，进一步检查是否是驱动器盘符路径（如 C:/...）
        const isWindows = process.platform === 'win32';
        if (isWindows && /^[A-Za-z]:/.test(id)) {
          // Windows 驱动器盘符路径（如 C:/...）
          return { id: path.resolve(id) };
        }
        // POSIX 系统（macOS/Linux）的绝对路径
        return { id: path.resolve(config.root, id.slice(1)) };
      }
      // 如果已经是绝对路径（跨平台支持）
      if (path.isAbsolute(id)) {
        return { id };
      }
      // 如果是相对路径
      if (id.startsWith(".")) {
        const basedir = path.dirname(importer);
        const resolvedPath = path.resolve(basedir, id);

+        // 尝试添加 .js 扩展名
+        if (!path.extname(resolvedPath)) {
+          const jsPath = resolvedPath + ".js";
+          if (fs.existsSync(jsPath)) {
+            return { id: jsPath };
+          }
+        }

+        // 如果resolvedPath是一个目录，尝试解析 index.js
+        if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
+          const indexPath = path.join(resolvedPath, "index.js");
+          if (fs.existsSync(indexPath)) {
+            return { id: indexPath };
+          }
+        }
        return { id: resolvedPath };
      }
      // 如果是第三方包
      let res = tryNodeResolve(id, importer, config);
      if (res) {
        return res;
      }
    },
  };
}

function tryNodeResolve(id, importer, config) {
  const pkgPath = resolve.sync(`${id}/package.json`, { basedir: config.root });
  const pkgDir = path.dirname(pkgPath);
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const entryPoint = pkg.module || pkg.main;
  const entryPointPath = path.join(pkgDir, entryPoint);
  return { id: entryPointPath };
}
module.exports = resolvePlugin;
```

## 别名处理
### lib
#### plugins
##### resolve.js
```diff
const fs = require("fs");
const path = require("path");
const resolve = require("resolve");

function resolvePlugin(config) {
  return {
    name: "g-vite:resolve",
    resolveId(id, importer) {
      // 如果以/开头表示可能是绝对路径（POSIX系统）或相对路径
      if (id.startsWith("/")) {
        // 对于Windows系统，进一步检查是否是驱动器盘符路径（如 C:/...）
        const isWindows = process.platform === 'win32';
        if (isWindows && /^[A-Za-z]:/.test(id)) {
          // Windows 驱动器盘符路径（如 C:/...）
          return { id: path.resolve(id) };
        }
        // POSIX 系统（macOS/Linux）的绝对路径
        return { id: path.resolve(config.root, id.slice(1)) };
      }
      // 如果已经是绝对路径（跨平台支持）
      if (path.isAbsolute(id)) {
        return { id };
      }
      // 如果是相对路径
      if (id.startsWith(".")) {
        const basedir = path.dirname(importer);
        const resolvedPath = path.resolve(basedir, id);

        // 尝试添加 .js 扩展名
        if (!path.extname(resolvedPath)) {
          const jsPath = resolvedPath + ".js";
          if (fs.existsSync(jsPath)) {
            return { id: jsPath };
          }
        }

        // 如果resolvedPath是一个目录，尝试解析 index.js
        if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
          const indexPath = path.join(resolvedPath, "index.js");
          if (fs.existsSync(indexPath)) {
            return { id: indexPath };
          }
        }
        return { id: resolvedPath };
      }
+      // 处理别名
+      if (config.alias) {
+        for (const alias in config.alias) {
+          if (id.startsWith(alias)) {
+            const aliasedPath = path.join(config.alias[alias], id.slice(alias.length));
+            return { id: aliasedPath };
+          }
+        }
+      }
      // 如果是第三方包
      let res = tryNodeResolve(id, importer, config);
      if (res) {
        return res;
      }
    },
  };
}

function tryNodeResolve(id, importer, config) {
  const pkgPath = resolve.sync(`${id}/package.json`, { basedir: config.root });
  const pkgDir = path.dirname(pkgPath);
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const entryPoint = pkg.module || pkg.main;
  const entryPointPath = path.join(pkgDir, entryPoint);
  return { id: entryPointPath };
}
module.exports = resolvePlugin;
```

## 测试
### main.js
```diff
import { createApp } from "vue";
import _ from "lodash";
+ import { msg } from "./msg";

console.log("createApp", createApp);
console.log("lodash", _);
+ console.log("msg", msg);
```

### msg.js
```javascript
const msg = `this is a message`;

export { msg };
```

# <font style="color:rgb(51, 51, 51);">修改导入路径</font>
+ <font style="color:rgb(51, 51, 51);">修改返回的</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">main.js</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">中的</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">vue</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">的路径</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">import { createApp } from 'vue'</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">变为</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">import { createApp } from '/node_modules/.vite/deps/vue.js'</font>`
+ <font style="color:rgb(51, 51, 51);">请求</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">/src/main.js</font>`<font style="color:rgb(51, 51, 51);">,此请求先由</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">transformMiddleware</font>`<font style="color:rgb(51, 51, 51);">中间件处理，通过</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">isJSRequest</font>`<font style="color:rgb(51, 51, 51);">判断是 js 请求,走</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">transformRequest</font>`
+ <font style="color:rgb(51, 51, 51);">在</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">transformRequest</font>`<font style="color:rgb(51, 51, 51);">里执行</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">pluginContainer.resolveId(url)</font>`<font style="color:rgb(51, 51, 51);">方法,方法内会由</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">resolvePlugin</font>`<font style="color:rgb(51, 51, 51);">返回</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">/src/main.js</font>`<font style="color:rgb(51, 51, 51);">的绝对路径</font>
+ <font style="color:rgb(51, 51, 51);">再调用</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">pluginContainer.load(id)</font>`<font style="color:rgb(51, 51, 51);">方法返回 JS 文件内容,此处返回</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">null</font>`
+ <font style="color:rgb(51, 51, 51);">再调用</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">pluginContainer.transform(code, id)</font>`<font style="color:rgb(51, 51, 51);">方法,执行</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">importAnalysisPlugin</font>`<font style="color:rgb(51, 51, 51);">里的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">transform</font>`<font style="color:rgb(51, 51, 51);">方法,里面会分析依赖的模块，获取依赖的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">vue</font>`<font style="color:rgb(51, 51, 51);">,重新执行</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">PluginContext.resolve</font>`<font style="color:rgb(51, 51, 51);">,执行</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">preAliasPlugin</font>`<font style="color:rgb(51, 51, 51);">,获取</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">vue</font>`<font style="color:rgb(51, 51, 51);">相对路径</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">/node_modules/.vite/deps/vue.js</font>`<font style="color:rgb(51, 51, 51);">,把</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">vue</font>`<font style="color:rgb(51, 51, 51);">变为</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">/node_modules/.vite/deps/vue.js</font>`

<!-- 这是一张图片，ocr 内容为：浏览器卜/SRC/MAIN.JS TRANSFORMREQUEST TRANSFORMMIDDLEWARE LIB/PLUGINS/RESOLVE.JS RESOLVELD LOAD LIB/PLUGINS/PREALIAS.JS LIB/PLUGINS/IMPORTANALYSIS.JS RESOLVE TRANSFORM -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1750054367978-9bde82b2-efe2-4652-b276-266149816c99.png)

## 安装依赖
```shell
pnpm add es-module-lexer magic-string -D
```

## package.json
```diff
{
  "name": "g-vite",
  "version": "1.0.0",
  "description": "",
  "main": "lib/cli.js",
  "bin": {
    "g-vite": "bin/g-vite.js"
  },
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "chalk": "^4.1.2",
    "connect": "^3.7.0",
+    "es-module-lexer": "^1.7.0",
    "esbuild": "^0.25.5",
    "fs-extra": "^11.3.0",
+    "magic-string": "^0.30.17",
    "resolve": "^1.22.10",
    "serve-static": "^2.2.0"
  }
}
```

## <font style="color:rgb(51, 51, 51);">lib</font>
### <font style="color:rgb(51, 51, 51);">server</font>
#### <font style="color:rgb(51, 51, 51);">index.js</font>
+ <font style="color:rgb(51, 51, 51);">使用转换请求的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">transformMiddleware</font>`<font style="color:rgb(51, 51, 51);">中间件</font>
+ <font style="color:rgb(51, 51, 51);">执行</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">transformRequest</font>`
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">pluginContainer.resolveId</font>`

```diff
const connect = require("connect");
const http = require("http");
const { printInfo } = require("../utils");
const serverStaticMiddleware = require("./middlewares/static");
const resolveConfig = require("../config");
const { createOptimizeDepsRun } = require("../optimizer");
+ const transformMiddleware = require("./middlewares/transform");
+ const { createPluginContainer } = require("./pluginContainer");

/**
 * 优化依赖，找到本项目依赖的第三方模块
 * @param {object} config 配置项
 * @param {object} server 服务器实例
 */
async function runOptimize(config, server) {
  const optimizeDeps = await createOptimizeDepsRun(config);
  server._optimizeDepsMetadata = optimizeDeps.metadata;
}

/**
 * 创建服务器
 * @returns Promise<Server> 服务器实例
 */
async function createServer() {
  const middlewares = connect(); // 创建中间件
  const config = await resolveConfig(); // 获取配置项
+  const pluginContainer = await createPluginContainer(config); // 创建插件容器

  const server = {
    pluginContainer,
    async listen(port) {
      //! 1.找到本项目依赖的第三方模块
      await runOptimize(config, server);
      http.createServer(middlewares).listen(port, async () => {
        printInfo(port);
      });
    },
  };

+  // 遍历插件
+  for (const plugin of config.plugins) {
+    // 如果存在configureServer方法
+    if (plugin.configureServer) {
+      // 调用configureServer方法
+      await plugin.configureServer(server);
+    }
+  }
+  // ! 3.修改导入路径
+  middlewares.use(transformMiddleware(server));
  // 静态资源处理
  middlewares.use(serverStaticMiddleware(config));

  return server;
}

exports.createServer = createServer;
```

#### <font style="color:rgb(51, 51, 51);">middlewares</font>
##### <font style="color:rgb(51, 51, 51);">transform.js</font>
+ <font style="color:rgb(51, 51, 51);">判断如果请求的是 JS 文件的请就进行 JS 内容转换</font>

```javascript
const { parse } = require("url");
const { isJSRequest } = require("../../utils");
const send = require("../send");
const transformRequest = require("../transformRequest");

function transformMiddleware(server) {
  return async (req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }

    const url = parse(req.url).pathname;
    // 如果导入的是js文件需要重写第三方模块的路径
    if (isJSRequest(url)) {
      // 切记这个地方要把req.url传给transformRequest，不是url,否则会丢失query
      const result = await transformRequest(req.url, server);
      if (result) {
        const type = "js";
        return send(req, res, result.code, type);
      } else {
        next();
      }
    } else {
      next();
    }
  };
}

module.exports = transformMiddleware;
```

#### <font style="color:rgb(51, 51, 51);">transformRequest.js</font>
```javascript
const fs = require("fs-extra");

/**
 * 转换请求
 * @param {url} url 请求的url
 * @param {object} server 服务器对象
 */
async function transformRequest(url, server) {
  const { pluginContainer } = server; // 获取插件容器
  const { id } = await pluginContainer.resolveId(url); // 获取此文件的绝对路径
  const loadResult = await pluginContainer.load(id); // 获取此文件的内容
  let code;
  if (loadResult) {
    // 如果有loadResult，则使用loadResult.code
    code = loadResult.code;
  } else {
    // 否则使用fs.readFileSync
    code = fs.readFileSync(id, "utf-8");
  }
  // 使用插件容器的transform方法转化文件内容
  const transformResult = await pluginContainer.transform(code, id);
  return transformResult;
}

module.exports = transformRequest;
```

#### <font style="color:rgb(51, 51, 51);">pluginContainer.js</font>
```diff
const { normalizePath } = require("../utils");
const path = require("path");

/**
 * 创建插件容器
 * @param {object} options 配置项
 */
async function createPluginContainer({ plugins, root }) {
  // 创建插件上下文
  class PluginContext {
+    // 解析id
+    async resolve(id, importer = path.join(root, "index.html")) {
+      return await container.resolveId(id, importer);
+    }
  }
  const container = {
    // 作用是存储插件，并调用插件的resolveId方法
    async resolveId(id, importer) {
      const ctx = new PluginContext(); // 创建插件上下文
      let resolveId = id; // 存储id
      for (const plugin of plugins) {
        // 遍历插件
        if (!plugin.resolveId) continue; // 如果插件没有resolveId方法，则跳过
        const result = await plugin.resolveId.call(ctx, id, importer); // 调用插件的resolveId方法
        if (result) {
          resolveId = result.id || result; // 存储id
          break;
        }
      }
      return { id: normalizePath(resolveId) }; // 返回id
    },
+    // 加载文件
+    async load(id) {
+      // 创建插件上下文
+      const ctx = new PluginContext();
+      for (const plugin of plugins) {
+        // 遍历插件
+        if (!plugin.load) continue; // 如果插件没有load方法，则跳过
+        const result = await plugin.load.call(ctx, id); // 调用插件的load方法
+        if (result) {
+          return result; // 返回结果
+        }
+      }
+      return null; // 如果没有插件返回null
+    },
+    // 转换文件
+    async transform(code, id) {
+      // 创建插件上下文
+      const ctx = new PluginContext();
+      for (const plugin of plugins) {
+        // 遍历插件
+        if (!plugin.transform) continue; // 如果插件没有transform方法，则跳过
+        const result = await plugin.transform.call(ctx, code, id); // 调用插件的transform方法
+        if (!result) continue; // 如果没有返回结果，则跳过
+        code = result.code || result; // 存储代码
+      }
+      return { code };
+    },
  };
  return container;
}
exports.createPluginContainer = createPluginContainer;
```

#### <font style="color:rgb(51, 51, 51);">send.js</font>
```javascript
// 响应头
const alias = {
  js: "application/javascript",
  css: "text/css",
  json: "application/json",
  html: "text/html",
};

/**
 * 发送响应
 * @param {object} _req 请求对象
 * @param {object} res 响应对象
 * @param {object} content 内容
 * @param {string} type 类型
 * @returns void
 */
function send(_req, res, content, type) {
  res.setHeader("Content-Type", alias[type] + ";charset=utf-8");
  res.statusCode = 200;
  return res.end(content);
}

module.exports = send;
```

### <font style="color:rgb(51, 51, 51);">utils.js</font>
```diff
const os = require("os");
const chalk = require("chalk");

/**
 * @description 获取内网ip
 * @returns {string} 内网ip
 */
function getIPAddress() {
  let IPAddress = "";
  const interfaces = os.networkInterfaces();
  for (let devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (
        alias.family === "IPv4" &&
        alias.address !== "127.0.0.1" &&
        !alias.internal
      ) {
        IPAddress = alias.address;
      }
    }
  }
  return IPAddress;
}

/**
 * 打印信息
 * @param {number} port 端口
 */
function printInfo(port) {
  const ip = getIPAddress();
  console.log(`
    ${chalk.yellow("Starting up http-server, serving")} ${chalk.blue("./")}
    ${chalk.yellow("Available on:")}
      http://127.0.0.1:${chalk.green(port)}
      http://${ip}:${chalk.green(port)}
    Hit CTRL-C to stop the server
  `);
}

/**
 * 格式化路径
 * @param {string} id 路径
 * @returns {string} 格式化后的路径
 */
function normalizePath(id) {
  return id.replace(/\\/g, "/");
}

+ /**
+  * 判断是否是js请求
+  * @param {string} url 请求路径
+  * @returns {boolean} 是否是js请求
+  */
+ const knownJsSrcRE = /\.js(\?.*)?$/i; // 匹配js请求
+ function isJSRequest(url) {
+   if (knownJsSrcRE.test(url)) {
+     return true;
+   }
+   return false;
+ }

exports.printInfo = printInfo;
exports.getIPAddress = getIPAddress;
exports.normalizePath = normalizePath;
+ exports.isJSRequest = isJSRequest;
```

### <font style="color:rgb(51, 51, 51);">plugins</font>
#### <font style="color:rgb(51, 51, 51);">index.js</font>
```javascript
const importAnalysisPlugin = require("./importAnalysis");
const preAliasPlugin = require("./preAlias");
const resolvePlugin = require("./resolve");

/**
 * 获取插件
 */
async function resolvePlugins(config) {
  // 此处返回的是内部的插件
  return [
    preAliasPlugin(config), // 吧 vue 映射成 vue.js
    resolvePlugin(config),
    importAnalysisPlugin(config),
  ];
}

exports.resolvePlugins = resolvePlugins;
```

#### importAnalysis.js
+ <font style="color:rgb(51, 51, 51);">导入文件分析</font>

```javascript
const { init, parse } = require("es-module-lexer");
const MagicString = require("magic-string");

/**
 * 导入文件分析插件
 * @param {object} config  配置对象
 * @returns {object} 插件对象
 */
function importAnalysisPlugin(config) {
  const { root } = config; // 项目根目录
  return {
    name: "g-vite:import-analysis",
    async transform(source, importer) {
      // 初始化 es-module-lexer
      await init;
      // 获取当前文件的所有导入
      let imports = parse(source)[0];
      // 如果没有导入，则返回源代码
      if (!imports.length) {
        return source;
      }
      // 创建一个 MagicString 对象
      let ms = new MagicString(source);
      // 获取导入的模块路径
      const normalizeUrl = async (url) => {
        // 解析此导入的模块的路径
        // 此处的 this  指向的是插件容器中的插件上下文对象，所以可以使用 this.resolve 来解析模块路径
        // resolve 内部其实调用的是插件容器的 resolveId 方法，返回url的绝对路径
        const resolved = await this.resolve(url, importer);
        if (resolved.id.startsWith(root + "/")) {
          //把绝对路径变成相对路径
          url = resolved.id.slice(root.length);
        }
        return url;
      };
      // 遍历导入
      for (let index = 0; index < imports.length; index++) {
        // 获取导入的位置和模块名
        const { s: start, e: end, n: specifier } = imports[index];
        // 如果有模块名
        if (specifier) {
          // 获取url
          const normalizedUrl = await normalizeUrl(specifier);
          // 如果有变化
          if (normalizedUrl !== specifier) {
            // 替换
            ms.overwrite(start, end, normalizedUrl);
          }
        }
      }
      return ms.toString();
    },
  };
}
module.exports = importAnalysisPlugin;
```

#### preAlias.js
+ <font style="color:rgb(51, 51, 51);">看看是否是经过预构建的路径，如果是直接取预构建后的路径</font>

```javascript
/**
 * 预处理别名
 * @returns {object} 插件对象
 */
function preAliasPlugin() {
  let server;
  return {
    name: "g-vite:pre-alias",
    // 配置服务
    configureServer(_server) {
      server = _server;
    },
    resolveId(id) {
      // 把vue=>vue.js
      const metadata = server._optimizeDepsMetadata; // 获取优化依赖的元数据
      const isOptimized = metadata.optimized[id]; // 是否优化的依赖
      if (isOptimized) {
        return {
          id: isOptimized.file, //// vue => c:/node_modules/.vite/deps/vue.js
        };
      }
    },
  };
}
module.exports = preAliasPlugin;
```

### <font style="color:rgb(51, 51, 51);">config.js</font>
```diff
const path = require("path");
const { normalizePath } = require("./utils");
+ const { resolvePlugins } = require("./plugins");

/**
 * 解析配置文件
 * @returns {Promise<{root: string}>} 配置对象
 */
async function resolveConfig() {
  const root = normalizePath(process.cwd()); // 项目根目录
  const cacheDir = normalizePath(path.resolve(`node_modules/.g-vite`)); // 缓存目录
  const config = {
    root,
    cacheDir,
  };
+  const plugins = await resolvePlugins(config); // 获取插件
+  config.plugins = plugins;
  return config;
}

module.exports = resolveConfig;
```

## 测试
```shell
g-vite
```

# <font style="color:rgb(51, 51, 51);">支持 vue 插件</font>
## 安装依赖
```shell
pnpm add vue -S
```

## package.json
```diff
{
  "name": "g-vite",
  "version": "1.0.0",
  "description": "",
  "main": "lib/cli.js",
  "bin": {
    "g-vite": "bin/g-vite.js"
  },
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "chalk": "^4.1.2",
    "connect": "^3.7.0",
    "es-module-lexer": "^1.7.0",
    "esbuild": "^0.25.5",
    "fs-extra": "^11.3.0",
    "magic-string": "^0.30.17",
    "resolve": "^1.22.10",
    "serve-static": "^2.2.0"
  },
+  "dependencies": {
+    "vue": "^3.5.16"
+  }
}
```

## lib
### optimizer
#### esbuildScanPlugin.js
```diff
const fs = require("fs-extra");
const path = require("path");
const { createPluginContainer } = require("../server/pluginContainer");
const resolvePlugin = require("../plugins/resolve");
const { normalizePath } = require("../utils");

const htmlTypesRE = /\.html$/; // html文件
const scriptModuleRE = /<script type="module" src\="(.+?)"><\/script>/; // 脚本模块
const JS_TYPES_RE = /\.js$/; // js文件

/**
 * 获取esbuild扫描插件的工厂方法
 * @param {object} config 配置对象
 * @param {object} depImports 依赖对象
 */
async function esbuildScanPlugin(config, depImports) {
  config.plugins = [resolvePlugin(config)]; // 添加解析插件
  const container = await createPluginContainer(config); // 创建插件容器
  // 创建解析方法
  const resolve = async (id, importer) => {
    return await container.resolveId(id, importer);
  };
  return {
    name: "g-vite:dep-scan",
    setup(build) {
+      build.onResolve(
+        { filter: /.vue$/ },
+        async ({ path: id, importer }) => {
+          const resolved = await resolve(id, importer);
+          if (resolved) {
+            return {
+              path: resolved.id,
+              external: true,
+            };
+          }
+        }
+      );
      build.onResolve({ filter: htmlTypesRE }, async ({ path, importer }) => {
        const resolved = await resolve(path, importer); // 解析路径
        if (resolved) {
          return {
            path: resolved.id || resolved,
            namespace: "html",
          };
        }
      });
      build.onResolve({ filter: /.*/ }, async ({ path, importer }) => {
        const resolved = await resolve(path, importer); // 解析路径
        if (resolved) {
          const id = resolved.id || resolved; // 获取id
          const included = id.includes("node_modules"); // 判断是否是第三方包
          if (included) {
            depImports[path] = normalizePath(id); // 添加到依赖列表中
            return {
              path: id,
              external: true,
            };
          }
          return {
            path: id,
          };
        }
        return { path };
      });
      build.onLoad(
        { filter: htmlTypesRE, namespace: "html" },
        async ({ path }) => {
          const html = fs.readFileSync(path, "utf-8"); // 读取html文件
          const [, scriptSrc] = html.match(scriptModuleRE); // 匹配script标签
          const js = `import ${JSON.stringify(scriptSrc)};\n`; // 生成js代码
          return {
            loader: "js",
            contents: js,
          };
        }
      );
      build.onLoad({ filter: JS_TYPES_RE }, ({ path: id }) => {
        let ext = path.extname(id).slice(1); // 获取文件后缀
        let contents = fs.readFileSync(id, "utf-8"); // 读取文件
        return {
          loader: ext,
          contents,
        };
      });
    },
  };
}
module.exports = esbuildScanPlugin;
```

### plugins
#### index.js
```diff
const importAnalysisPlugin = require("./importAnalysis");
const preAliasPlugin = require("./preAlias");
const resolvePlugin = require("./resolve");

/**
 * 获取插件
 */
+ async function resolvePlugins(config, userPlugins) {
  // 此处返回的是内部的插件
  return [
    preAliasPlugin(config), // 吧 vue 映射成 vue.js
    resolvePlugin(config),
+    ...userPlugins,
    importAnalysisPlugin(config),
  ];
}

exports.resolvePlugins = resolvePlugins;

```

### utils.js
```diff
const os = require("os");
const chalk = require("chalk");

/**
 * @description 获取内网ip
 * @returns {string} 内网ip
 */
function getIPAddress() {
  let IPAddress = "";
  const interfaces = os.networkInterfaces();
  for (let devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (
        alias.family === "IPv4" &&
        alias.address !== "127.0.0.1" &&
        !alias.internal
      ) {
        IPAddress = alias.address;
      }
    }
  }
  return IPAddress;
}

/**
 * 打印信息
 * @param {number} port 端口
 */
function printInfo(port) {
  const ip = getIPAddress();
  console.log(`
    ${chalk.yellow("Starting up http-server, serving")} ${chalk.blue("./")}
    ${chalk.yellow("Available on:")}
      http://127.0.0.1:${chalk.green(port)}
      http://${ip}:${chalk.green(port)}
    Hit CTRL-C to stop the server
  `);
}

/**
 * 格式化路径
 * @param {string} id 路径
 * @returns {string} 格式化后的路径
 */
function normalizePath(id) {
  return id.replace(/\\/g, "/");
}

/**
 * 判断是否是js请求
 * @param {string} url 请求路径
 * @returns {boolean} 是否是js请求
 */
+ const knownJsSrcRE = /\.(js|vue)(\?.*)?$/i;// 匹配js和vue请求
function isJSRequest(url) {
  if (knownJsSrcRE.test(url)) {
    return true;
  }
  return false;
}

exports.printInfo = printInfo;
exports.getIPAddress = getIPAddress;
exports.normalizePath = normalizePath;
exports.isJSRequest = isJSRequest;
```

### config.js
```diff
const path = require("path");
+ const fs = require("fs-extra");
const { normalizePath } = require("./utils");
const { resolvePlugins } = require("./plugins");

/**
 * 解析配置文件
 * @returns {Promise<{root: string}>} 配置对象
 */
async function resolveConfig() {
  const root = normalizePath(process.cwd()); // 项目根目录
  const cacheDir = normalizePath(path.resolve(`node_modules/.g-vite`)); // 缓存目录
  let config = {
    root,
    cacheDir,
  };
+  const jsconfigFile = path.resolve(root, "vite.config.js");
+  const exists = await fs.pathExists(jsconfigFile);
+  if (exists) {
+    // 如果存在 vite.config.js 文件，则使用 require 引入
+    const userConfig = require(jsconfigFile);
+    config = { ...config, ...userConfig };
+  }
+  const userPlugins = config.plugins || [];
+  const plugins = await resolvePlugins(config, userPlugins); // 获取插件
  config.plugins = plugins;
  return config;
}

module.exports = resolveConfig;
```

## example
### package.json
```diff
{
  "name": "example",
  "private": true,
  "version": "0.0.0",
-  "type": "module",
  "scripts": {
    "dev": "g-vite",
    "build": "g-vite build",
    "preview": "g-vite preview"
  },
  "dependencies": {
    "lodash": "^4.17.21",
    "vue": "^3.5.16"
  }
}
```

### vite.config.js
```javascript
const vue = require("../plugins/vue");

module.exports = {
  plugins: [vue()],
};
```

### src
#### main.js
```javascript
import { createApp } from "vue";
import App from "/src/App.vue";

createApp(App).mount("#app");
```

#### App.vue
```vue
<template>
  <h1>App</h1>
  <p>{{ msg }}</p>
</template>

<script>
import { msg } from './msg.js'
export default {
  name: 'App',
  data() {
    return {
      msg
    }
  }
}
</script>
```

## plugins
### vue.js
```javascript
const {
  parse,
  compileScript,
  rewriteDefault,
  compileTemplate,
} = require("vue/compiler-sfc");
const fs = require("fs");

const descriptorCache = new Map();

function vue() {
  return {
    name: "vue",
    async transform(code, id) {
      const { filename } = parseVueRequest(id);
      if (filename.endsWith(".vue")) {
        let result = await transformMain(code, filename);
        return result;
      }
      return null;
    },
  };
}

async function getDescriptor(filename) {
  let descriptor = descriptorCache.get(filename);
  if (descriptor) return descriptor;
  const content = await fs.promises.readFile(filename, "utf8");
  const result = parse(content, { filename });
  descriptor = result.descriptor;
  descriptorCache.set(filename, descriptor);
  return descriptor;
}
async function transformMain(source, filename) {
  const descriptor = await getDescriptor(filename);
  const scriptCode = genScriptCode(descriptor, filename);
  const templateCode = genTemplateCode(descriptor, filename);
  let resolvedCode = [
    templateCode,
    scriptCode,
    `_sfc_main['render'] = render`,
    `export default _sfc_main`,
  ].join("\n");
  return { code: resolvedCode };
}

function genScriptCode(descriptor, id) {
  let scriptCode = "";
  let script = compileScript(descriptor, { id });
  if (!script.lang) {
    scriptCode = rewriteDefault(script.content, "_sfc_main");
  }
  return scriptCode;
}
function genTemplateCode(descriptor, id) {
  let content = descriptor.template.content;
  const result = compileTemplate({ source: content, id });
  return result.code;
}
function parseVueRequest(id) {
  const [filename, querystring = ""] = id.split("?");
  let query = new URLSearchParams(querystring);
  return {
    filename,
    query,
  };
}
module.exports = vue;
```

## 测试
```shell
pnpm dev
```

# <font style="color:rgb(51, 51, 51);">支持 style</font>
## 安装依赖
```shell
pnpm add hash-sum dedent -S
```

## package.json
```diff
{
  "name": "g-vite",
  "version": "1.0.0",
  "description": "",
  "main": "lib/cli.js",
  "bin": {
    "g-vite": "bin/g-vite.js"
  },
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "chalk": "^4.1.2",
    "connect": "^3.7.0",
    "es-module-lexer": "^1.7.0",
    "esbuild": "^0.25.5",
    "fs-extra": "^11.3.0",
    "magic-string": "^0.30.17",
    "resolve": "^1.22.10",
    "serve-static": "^2.2.0"
  },
  "dependencies": {
+    "hash-sum": "^2.0.0",
    "vue": "^3.5.16"
  }
}
```

## lib
### config.js
```diff
const path = require("path");
const fs = require("fs-extra");
const { normalizePath } = require("./utils");
const { resolvePlugins } = require("./plugins");

/**
 * 解析配置文件
 * @returns {Promise<{root: string}>} 配置对象
 */
async function resolveConfig() {
  const root = normalizePath(process.cwd()); // 项目根目录
  const cacheDir = normalizePath(path.resolve(`node_modules/.g-vite`)); // 缓存目录
  let config = {
    root,
    cacheDir,
  };
  const jsconfigFile = path.resolve(root, "vite.config.js");
  const exists = await fs.pathExists(jsconfigFile);
  if (exists) {
    // 如果存在 vite.config.js 文件，则使用 require 引入
    const userConfig = require(jsconfigFile);
    config = { ...config, ...userConfig };
  }
  const userPlugins = config.plugins || [];
+  for (const plugin of userPlugins) {
+    if (plugin.config) {
+      const res = await plugin.config(config);
+      if (res) {
+        config = { ...config, ...res };
+      }
+    }
+  }
  const plugins = await resolvePlugins(config, userPlugins); // 获取插件
  config.plugins = plugins;
  return config;
}

module.exports = resolveConfig;

```

### plugins
#### resolve.js
```diff
const fs = require("fs");
const path = require("path");
const resolve = require("resolve");

function resolvePlugin(config) {
  return {
    name: "g-vite:resolve",
    resolveId(id, importer) {
      // 如果已经是绝对路径（跨平台支持）
+      if (path.isAbsolute(id) && id.startsWith(config.root)) {
        return { id };
      }
      // 如果以/开头表示可能是绝对路径（POSIX系统）或相对路径
      if (id.startsWith("/")) {
        // 对于Windows系统，进一步检查是否是驱动器盘符路径（如 C:/...）
        const isWindows = process.platform === 'win32';
        if (isWindows && /^[A-Za-z]:/.test(id)) {
          // Windows 驱动器盘符路径（如 C:/...）
          return { id: path.resolve(id) };
        }
        // POSIX 系统（macOS/Linux）的绝对路径
        return { id: path.resolve(config.root, id.slice(1)) };
      }
      
      // 如果是相对路径
      if (id.startsWith(".")) {
        const basedir = path.dirname(importer);
        const resolvedPath = path.resolve(basedir, id);

        // 尝试添加 .js 扩展名
        if (!path.extname(resolvedPath)) {
          const jsPath = resolvedPath + ".js";
          if (fs.existsSync(jsPath)) {
            return { id: jsPath };
          }
        }

        // 如果resolvedPath是一个目录，尝试解析 index.js
        if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
          const indexPath = path.join(resolvedPath, "index.js");
          if (fs.existsSync(indexPath)) {
            return { id: indexPath };
          }
        }
        return { id: resolvedPath };
      }
      // 处理别名
      if (config.alias) {
        for (const alias in config.alias) {
          if (id.startsWith(alias)) {
            const aliasedPath = path.join(config.alias[alias], id.slice(alias.length));
            return { id: aliasedPath };
          }
        }
      }
      // 如果是第三方包
      let res = tryNodeResolve(id, importer, config);
      if (res) {
        return res;
      }
    },
  };
}

function tryNodeResolve(id, importer, config) {
  const pkgPath = resolve.sync(`${id}/package.json`, { basedir: config.root });
  const pkgDir = path.dirname(pkgPath);
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const entryPoint = pkg.module || pkg.main;
  const entryPointPath = path.join(pkgDir, entryPoint);
  return { id: entryPointPath };
}
module.exports = resolvePlugin;
```

## plugins
### vue.js
```javascript
const {
  parse,
  compileScript,
  rewriteDefault,
  compileTemplate,
  compileStyleAsync,
} = require("vue/compiler-sfc");
const fs = require("fs");
const path = require("path");
const hash = require("hash-sum");
const dedent = require("dedent");

// 缓存
const descriptorCache = new Map();

/**
 * 插件
 */
function vue() {
  let root;
  return {
    name: "vue", // 插件名称
    // 配置
    config(config) {
      root = config.root;
    },
    // 加载
    async load(id) {
      // 获取文件名
      const { filename, query } = parseVueRequest(id);
      // 如果是vue文件
      if (query.has("vue")) {
        // 获取描述
        const descriptor = await getDescriptor(filename, root);
        // 如果是style
        if (query.get("type") === "style") {
          // 获取样式
          let block = descriptor.styles[Number(query.get("index"))];
          // 如果有样式
          if (block) {
            // 返回样式
            return { code: block.content };
          }
        }
      }
    },
    // 转换
    async transform(code, id) {
      // 获取文件名
      const { filename, query } = parseVueRequest(id);
      // 如果是vue文件
      if (filename.endsWith(".vue")) {
        // 如果是style
        if (query.get("type") === "style") {
          // 获取描述
          const descriptor = await getDescriptor(filename, root);
          // 转换样式
          let result = await transformStyle(
            code,
            descriptor,
            query.get("index")
          );
          return result;
        } else { // 如果是js
          // 转换js
          let result = await transformMain(code, filename, root);
          return result;
        }
      }
      return null;
    },
  };
}

/**
 * 样式转换
 */
async function transformStyle(code, descriptor, index) {
  const block = descriptor.styles[index];
  //如果是CSS，其实翻译之后和翻译之前内容是一样的
  const result = await compileStyleAsync({
    filename: descriptor.filename,
    source: code,
    id: `data-v-${descriptor.id}`, //必须传递，不然报错
    scoped: block.scoped,
  });
  let styleCode = result.code;
  const injectCode = dedent.withOptions({ escapeSpecialCharacters: false })`
    var  style = document.createElement('style');
    style.innerHTML = ${JSON.stringify(styleCode)};
    document.head.appendChild(style);`;
  return {
    code: injectCode,
  };
}

/**
 * 获取描述
 */
async function getDescriptor(filename, root) {
  // 缓存
  let descriptor = descriptorCache.get(filename);
  // 如果缓存有，直接返回
  if (descriptor) return descriptor;
  // 获取文件内容
  const content = await fs.promises.readFile(filename, "utf8");
  // 解析
  const result = parse(content, { filename });
  // 赋值
  descriptor = result.descriptor;
  // 生成id
  descriptor.id = hash(path.relative(root, filename));
  // 设置缓存
  descriptorCache.set(filename, descriptor);
  return descriptor;
}

/**
 * 转换主文件
 */
async function transformMain(source, filename, root) {
  // 获取描述
  const descriptor = await getDescriptor(filename, root);
  // 脚本代码
  const scriptCode = genScriptCode(descriptor, filename);
  // 模板代码
  const templateCode = genTemplateCode(descriptor, filename);
  // 样式代码
  const stylesCode = genStyleCode(descriptor, filename);
  // 拼接代码
  let resolvedCode = [
    stylesCode,
    templateCode,
    scriptCode,
    `_sfc_main['render'] = render`,
    `export default _sfc_main`,
  ].join("\n");
  return { code: resolvedCode };
}

/**
 * 生成样式代码
 */
function genStyleCode(descriptor, filename) {
  let styleCode = "";
  // 如果有样式
  if (descriptor.styles.length) {
    // 遍历样式
    descriptor.styles.forEach((style, index) => {
      // 生成请求
      const query = `?vue&type=style&index=${index}&lang=css`;
      // 优化请求
      const styleRequest = (filename + query).replace(/\\/g, "/");
      // 生成导入
      styleCode += `\nimport ${JSON.stringify(styleRequest)}`;
    });
    return styleCode;
  }
}

/**
 * 生成脚本代码
 */
function genScriptCode(descriptor, id) {
  let scriptCode = "";
  // 获取脚本
  let script = compileScript(descriptor, { id });
  if (!script.lang) {
    // 获取脚本内容
    scriptCode = rewriteDefault(script.content, "_sfc_main");
  }
  return scriptCode;
}

/**
 * 模板代码
 */
function genTemplateCode(descriptor, id) {
  // 获取模板
  let content = descriptor.template.content;
  // 编译模板
  const result = compileTemplate({ source: content, id });
  return result.code;
}

/**
 * 解析请求
 */
function parseVueRequest(id) {
  // 获取文件名
  const [filename, querystring = ""] = id.split("?");
  // 创建一个 URLSearchParams 对象
  let query = new URLSearchParams(querystring);
  return {
    filename,
    query,
  };
}
module.exports = vue;
```

## example
### src
#### App.vue
```diff
<template>
  <h1>App</h1>
  <p>{{ msg }}</p>
</template>

<script>
import { msg } from './msg.js'
export default {
  name: 'App',
  data() {
    return {
      msg
    }
  }
}
</script>

+ <style>
+ body {
+   margin: 0;
+   min-height: 100vh;
+   width: 100vw;
+   background-color: beige;
+ }
+ #app {
+   font-family: Avenir, Helvetica, Arial, sans-serif;
+   -webkit-font-smoothing: antialiased;
+   -moz-osx-font-smoothing: grayscale;
+   text-align: center;
+   color: #2c3e50;
+ }
+ h1 {
+   color: brown;
+   margin: 0;
+ }
+ p {
+   color: darkorange;
+ }
+ </style>
```

## 测试
```shell
pnpm dev
```

# <font style="color:rgb(51, 51, 51);">支持环境变量</font>
## lib
### plugins
#### index.js
```diff
const importAnalysisPlugin = require("./importAnalysis");
const preAliasPlugin = require("./preAlias");
const resolvePlugin = require("./resolve");
+ const definePlugin = require("./define");

/**
 * 获取插件
 */
async function resolvePlugins(config, userPlugins) {
  // 此处返回的是内部的插件
  return [
    preAliasPlugin(config), // 吧 vue 映射成 vue.js
    resolvePlugin(config),
    ...userPlugins,
+    definePlugin(config),
    importAnalysisPlugin(config),
  ];
}

exports.resolvePlugins = resolvePlugins;
```

#### define.js
```javascript
const MagicString = require("magic-string");

/**
 * @description: 替换代码中的 define
 * @param {object} 配置项
 * @return {object} 插件对象
 */
function definePlugin(config) {
  return {
    name: "g-vite:define",
    transform(code) {
      // 获取 define 配置项
      const replacements = config.define || {};
      // 获取 define 配置项的 key
      const replacementsKeys = Object.keys(replacements);
      // 创建正则
      const pattern = new RegExp(
        "(" + replacementsKeys.map((str) => str).join("|") + ")",
        "g"
      );
      // 创建 MagicString 对象
      const s = new MagicString(code);
      // 是否有替换
      let hasReplaced = false;
      // 是否匹配
      let match;
      // 循环匹配
      while ((match = pattern.exec(code))) {
        // 标记为已替换
        hasReplaced = true;
        // 获取匹配的字符串开始索引
        const start = match.index;
        // 获取匹配的结束索引
        const end = start + match[0].length;
        // 替换匹配的字符串
        const replacement = "" + replacements[match[1]];
        // 替换字符串
        s.overwrite(start, end, replacement);
      }
      if (!hasReplaced) {
        return null;
      }
      return { code: s.toString() };
    },
  };
}
module.exports = definePlugin;
```

## plugins
### vue.js
```diff
const {
  parse,
  compileScript,
  rewriteDefault,
  compileTemplate,
  compileStyleAsync,
} = require("vue/compiler-sfc");
const fs = require("fs");
const path = require("path");
const hash = require("hash-sum");

// 缓存
const descriptorCache = new Map();

/**
 * 插件
 */
function vue() {
  let root;
  return {
    name: "vue", // 插件名称
    // 配置
    config(config) {
      root = config.root;
+      return {
+        define: {
+          __VUE_OPTIONS_API__: true, // 是否使用 options api
+          __VUE_PROD_DEVTOOLS__: false, // 是否使用 devtools
+          __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false, // 是否使用生产环境 mismatch details
+        }
+      }
    },
    // 加载
    async load(id) {
      // 获取文件名
      const { filename, query } = parseVueRequest(id);
      // 如果是vue文件
      if (query.has("vue")) {
        // 获取描述
        const descriptor = await getDescriptor(filename, root);
        // 如果是style
        if (query.get("type") === "style") {
          // 获取样式
          let block = descriptor.styles[Number(query.get("index"))];
          // 如果有样式
          if (block) {
            // 返回样式
            return { code: block.content };
          }
        }
      }
    },
    // 转换
    async transform(code, id) {
      // 获取文件名
      const { filename, query } = parseVueRequest(id);
      // 如果是vue文件
      if (filename.endsWith(".vue")) {
        // 如果是style
        if (query.get("type") === "style") {
          // 获取描述
          const descriptor = await getDescriptor(filename, root);
          // 转换样式
          let result = await transformStyle(
            code,
            descriptor,
            query.get("index")
          );
          return result;
        } else { // 如果是js
          // 转换js
          let result = await transformMain(code, filename, root);
          return result;
        }
      }
      return null;
    },
  };
}

/**
 * 样式转换
 */
async function transformStyle(code, descriptor, index) {
  const block = descriptor.styles[index];
  //如果是CSS，其实翻译之后和翻译之前内容是一样的
  const result = await compileStyleAsync({
    filename: descriptor.filename,
    source: code,
    id: `data-v-${descriptor.id}`, //必须传递，不然报错
    scoped: block.scoped,
  });
  let styleCode = result.code;
  const injectCode =
    `\nvar  style = document.createElement('style');` +
    `\nstyle.innerHTML = ${JSON.stringify(styleCode)};` +
    `\ndocument.head.appendChild(style);`;
  return {
    code: injectCode,
  };
}

/**
 * 获取描述
 */
async function getDescriptor(filename, root) {
  // 缓存
  let descriptor = descriptorCache.get(filename);
  // 如果缓存有，直接返回
  if (descriptor) return descriptor;
  // 获取文件内容
  const content = await fs.promises.readFile(filename, "utf8");
  // 解析
  const result = parse(content, { filename });
  // 赋值
  descriptor = result.descriptor;
  // 生成id
  descriptor.id = hash(path.relative(root, filename));
  // 设置缓存
  descriptorCache.set(filename, descriptor);
  return descriptor;
}

/**
 * 转换主文件
 */
async function transformMain(source, filename, root) {
  // 获取描述
  const descriptor = await getDescriptor(filename, root);
  // 脚本代码
  const scriptCode = genScriptCode(descriptor, filename);
  // 模板代码
  const templateCode = genTemplateCode(descriptor, filename);
  // 样式代码
  const stylesCode = genStyleCode(descriptor, filename);
  // 拼接代码
  let resolvedCode = [
    stylesCode,
    templateCode,
    scriptCode,
    `_sfc_main['render'] = render`,
    `export default _sfc_main`,
  ].join("\n");
  return { code: resolvedCode };
}

/**
 * 生成样式代码
 */
function genStyleCode(descriptor, filename) {
  let styleCode = "";
  // 如果有样式
  if (descriptor.styles.length) {
    // 遍历样式
    descriptor.styles.forEach((style, index) => {
      // 生成请求
      const query = `?vue&type=style&index=${index}&lang=css`;
      // 优化请求
      const styleRequest = (filename + query).replace(/\\/g, "/");
      // 生成导入
      styleCode += `\nimport ${JSON.stringify(styleRequest)}`;
    });
    return styleCode;
  }
}

/**
 * 生成脚本代码
 */
function genScriptCode(descriptor, id) {
  let scriptCode = "";
  // 获取脚本
  let script = compileScript(descriptor, { id });
  if (!script.lang) {
    // 获取脚本内容
    scriptCode = rewriteDefault(script.content, "_sfc_main");
  }
  return scriptCode;
}

/**
 * 模板代码
 */
function genTemplateCode(descriptor, id) {
  // 获取模板
  let content = descriptor.template.content;
  // 编译模板
  const result = compileTemplate({ source: content, id });
  return result.code;
}

/**
 * 解析请求
 */
function parseVueRequest(id) {
  // 获取文件名
  const [filename, querystring = ""] = id.split("?");
  // 创建一个 URLSearchParams 对象
  let query = new URLSearchParams(querystring);
  return {
    filename,
    query,
  };
}
module.exports = vue;
```

## 测试
```shell
pnpm dev
```

# <font style="color:rgb(51, 51, 51);">HMR</font>
## 基本使用
### 创建项目
#### 安装依赖
```shell
mkdir vite-hmr
cd vite-hmr
pnpm init
pnpm add vite -D
```

#### package.json
```json
{
  "name": "vite-hmr",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "dev": "vite"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.12.1",
  "dependencies": {
    "vite": "^6.3.5"
  }
}
```

#### src
##### main.js
```javascript
export function render() {
  const root = document.querySelector('#app')
  root.innerHTML = 'Hello World'
}

render()

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    newModule.render();
  })
}
```

#### index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HMR</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

#### 测试
```shell
pnpm dev
```

### 封装模块
#### src
##### main.js
```diff
+ import { render } from './render'
- export function render() {
-   const root = document.querySelector('#app')
-   root.innerHTML = 'Hello World'
- }

render()

if (import.meta.hot) {
+  import.meta.hot.accept(['./render'], ([newModule]) => {
    newModule.render();
  })
}
```

##### render.js
```javascript
export function render() {
  const root = document.querySelector('#app')
  root.innerHTML = 'Hello World!'
}
```

#### 测试
```shell
pnpm dev
```

### 销毁副作用
#### src
##### render.js
```diff
+ const counter = { number: 0};
+ const timer = setInterval(() => {
+   console.log(counter.number++)
+ }, 1000);

export function render() {
  const root = document.querySelector('#app')
  root.innerHTML = 'Hello World!'
}

+ if (import.meta.hot) {
+   import.meta.hot.dispose(() => {
+     console.log('dispose render.js  ');
+     clearInterval(timer)
+   })
+ }
```

#### 测试
```shell
pnpm dev
```

### 保留状态
#### src
##### render.js
```diff
+ const counter = import.meta.hot.data.counter || { number: 0};
const timer = setInterval(() => {
  console.log(counter.number++)
}, 1000);

export function render() {
  const root = document.querySelector('#app')
  root.innerHTML = 'Hello World!!'
}

if (import.meta.hot) {
+  // 每个模块有一个 data 属性，可以用来存储模块热更新前的状态
+  import.meta.hot.data.counter = counter;
  import.meta.hot.dispose(() => {
    console.log('dispose render.js  ');
    clearInterval(timer)
  })
}
```

#### 测试
```shell
pnpm dev
```

### 拒绝更新
#### src
##### main.js
```diff
import { render } from './render'

render()

if (import.meta.hot) {
  import.meta.hot.accept(['./render'], ([newModule]) => {
    console.log(newModule, 'newModule', newModule.counter.number < 10);
+    if (newModule.counter.number < 10) {
+      newModule.render();
+    } else { // 强制刷新
+      console.log('强制刷新');
+      import.meta.hot.invalidate(); 
+    }
  });
-  import.meta.hot.accept();
+  import.meta.hot.decline();
}
```

##### render.js
```diff
+ export const counter = import.meta.hot.data.counter || { number: 0};
const timer = setInterval(() => {
  console.log(counter.number++)
}, 1000);

export function render() {
  const root = document.querySelector('#app')
  root.innerHTML = 'Hello World!'
}

if (import.meta.hot) {
  // 每个模块有一个 data 属性，可以用来存储模块热更新前的状态
  import.meta.hot.data.counter = counter;
  import.meta.hot.dispose(() => {
    console.log('dispose render.js  ');
    clearInterval(timer)
  })
}
```

#### 测试
```shell
pnpm dev
```

## <font style="color:rgb(51, 51, 51);">支持 HMR</font>
### 安装依赖
```shell
pnpm add ws chokidar -D
```

### package.json
```diff
{
  "name": "g-vite",
  "version": "1.0.0",
  "description": "",
  "main": "lib/cli.js",
  "bin": {
    "g-vite": "bin/g-vite.js"
  },
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "chalk": "^4.1.2",
+    "chokidar": "^4.0.3",
    "connect": "^3.7.0",
    "es-module-lexer": "^1.7.0",
    "esbuild": "^0.25.5",
    "fs-extra": "^11.3.0",
    "magic-string": "^0.30.17",
    "resolve": "^1.22.10",
    "serve-static": "^2.2.0",
+    "ws": "^8.18.2"
  },
  "dependencies": {
    "dedent": "^1.6.0",
    "hash-sum": "^2.0.0",
    "vue": "^3.5.16"
  }
}
```

### lib
#### serve
##### index.js
```diff
const connect = require("connect");
const http = require("http");
+ const chokidar = require("chokidar");
+ const path = require("path");
const { printInfo } = require("../utils");
const serverStaticMiddleware = require("./middlewares/static");
const resolveConfig = require("../config");
const { createOptimizeDepsRun } = require("../optimizer");
const transformMiddleware = require("./middlewares/transform");
const { createPluginContainer } = require("./pluginContainer");
+ const { handleHMRUpdate } = require("./hmr");
+ const { createWebSocketServer } = require("./ws");
+ const { normalizePath } = require("../utils");
+ const { ModuleGraph } = require("./moduleGraph");

/**
 * 优化依赖，找到本项目依赖的第三方模块
 * @param {object} config 配置项
 * @param {object} server 服务器实例
 */
async function runOptimize(config, server) {
  const optimizeDeps = await createOptimizeDepsRun(config);
  server._optimizeDepsMetadata = optimizeDeps.metadata;
}

/**
 * 创建服务器
 * @returns Promise<Server> 服务器实例
 */
async function createServer() {
  const middlewares = connect(); // 创建中间件
  const config = await resolveConfig(); // 获取配置项
  const pluginContainer = await createPluginContainer(config); // 创建插件容器
+  const httpServer = http.createServer(middlewares);
+  const ws = createWebSocketServer(httpServer, config);
+  const watcher = chokidar.watch(path.resolve(config.root), {
+    ignored: ["**/node_modules/**", "**/.git/**"],
+  });

+  const moduleGraph = new ModuleGraph((url) => pluginContainer.resolveId(url));

  const server = {
+    config,
+    ws,
+    watcher,
+    moduleGraph,
+    httpServer,
    pluginContainer,
    async listen(port) {
      //! 1.找到本项目依赖的第三方模块
      await runOptimize(config, server);
+      httpServer.listen(port, async () => {
        printInfo(port);
      });
    },
  };

+  watcher.on('change', async (file) => {
+    file = normalizePath(file)
+    await handleHMRUpdate(file, server)
+  });

  // 遍历插件
  for (const plugin of config.plugins) {
    // 如果存在configureServer方法
    if (plugin.configureServer) {
      // 调用configureServer方法
      await plugin.configureServer(server);
    }
  }
  // ! 3.修改导入路径
  middlewares.use(transformMiddleware(server));
  // 静态资源处理
  middlewares.use(serverStaticMiddleware(config));

  return server;
}

exports.createServer = createServer;
```

##### ws.js
```javascript
const { WebSocketServer } = require("ws");

const HMR_HEADER = "vite-hmr";
function createWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true });
  httpServer.on("upgrade", (req, socket, head) => {
    if (req.headers["sec-websocket-protocol"] === HMR_HEADER) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    }
  });
  wss.on("connection", (socket) => {
    socket.send(JSON.stringify({ type: "connected" }));
  });
  return {
    on: wss.on.bind(wss),
    off: wss.off.bind(wss),
    send(payload) {
      const stringified = JSON.stringify(payload);
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(stringified);
        }
      });
    },
  };
}
exports.createWebSocketServer = createWebSocketServer;
```

##### hmr.js
```javascript
const LexerState = {
  inCall: 0,
  inQuoteString: 1,
};

async function handleHMRUpdate(file, server) {
  const { moduleGraph, ws } = server;
  //根据文件获取模块
  const module = moduleGraph.getModuleById(file);
  if (module) {
    const updates = [];
    const boundaries = new Set();
    propagateUpdate(module, boundaries);
    updates.push(
      ...[...boundaries].map(({ boundary, acceptedVia }) => ({
        type: `${boundary.type}-update`,
        path: boundary.url,
        acceptedPath: acceptedVia.url,
      }))
    );
    ws.send({
      type: "update",
      updates,
    });
  }
}

function updateModules(file, modules, { ws }) {}
function propagateUpdate(node, boundaries) {
  if (!node.importers.size) {
    return true;
  }
  for (const importer of node.importers) {
    if (importer.acceptedHmrDeps.has(node)) {
      boundaries.add({
        boundary: importer,
        acceptedVia: node,
      });
      continue;
    }
  }
  return false;
}
function lexAcceptedHmrDeps(code, start, urls) {
  let state = LexerState.inCall;
  let prevState = LexerState.inCall;
  let currentDep = "";
  function addDep(index) {
    urls.add({
      url: currentDep,
      start: index - currentDep.length - 1,
      end: index + 1,
    });
    currentDep = "";
  }
  for (let i = start; i < code.length; i++) {
    const char = code.charAt(i);
    switch (state) {
      case LexerState.inCall:
        if (char === `'` || char === `"`) {
          prevState = state;
          state = LexerState.inQuoteString;
        }
        break;
      case LexerState.inQuoteString:
        if (char === `'` || char === `"`) {
          addDep(i);
          return false;
        } else {
          currentDep += char;
        }
        break;
      default:
        break;
    }
  }
  return false;
}
exports.handleHMRUpdate = handleHMRUpdate;
exports.updateModules = updateModules;
exports.lexAcceptedHmrDeps = lexAcceptedHmrDeps;
```

##### <font style="color:rgb(51, 51, 51);">transformRequest.js</font>
```diff
const fs = require("fs-extra");
+ const { parse } = require("url");

/**
 * 转换请求
 * @param {url} url 请求的url
 * @param {object} server 服务器对象
 */
async function transformRequest(url, server) {
  const { pluginContainer } = server; // 获取插件容器
  const { id } = await pluginContainer.resolveId(url); // 获取此文件的绝对路径
  const loadResult = await pluginContainer.load(id); // 获取此文件的内容
  let code;
  if (loadResult) {
    // 如果有loadResult，则使用loadResult.code
    code = loadResult.code;
  } else {
    // 否则使用fs.readFileSync
+    let fsPath = parse(id).pathname;
+    code = await fs.readFile(decodeURIComponent(fsPath), "utf-8");
  }
+  await server.moduleGraph.ensureEntryFromUrl(url);
  // 使用插件容器的transform方法转化文件内容
  const transformResult = await pluginContainer.transform(code, id);
  return transformResult;
}

module.exports = transformRequest;
```

##### moduleGraph.js
```javascript
class ModuleNode {
  //哪些模块导入了自己
  importers = new Set();
  //接收哪些子模块的修改
  acceptedHmrDeps = new Set();
  constructor(url) {
    this.url = url;
    this.type = "js";
  }
}
class ModuleGraph {
  constructor(resolveId) {
    this.resolveId = resolveId;
  }
  idToModuleMap = new Map();
  //通过ID查找模块
  getModuleById(id) {
    return this.idToModuleMap.get(id);
  }
  //把原始的URL添加到Map
  async ensureEntryFromUrl(rawUrl) {
    const [url, resolvedId] = await this.resolveUrl(rawUrl);
    let mod = this.idToModuleMap.get(resolvedId); //通过文件URL查找模块
    if (!mod) {
      this.idToModuleMap.set(resolvedId, new ModuleNode(url)); //把绝对路径和模块的对应关系保存在idToModuleMap中
    }
    return mod;
  }
  async resolveUrl(url) {
    const resolved = await this.resolveId(url);
    const resolvedId = resolved.id || url;
    return [url, resolvedId];
  }
  async updateModuleInfo(mod, importedModules, acceptedModules) {
    for (const imported of importedModules) {
      const dep = await this.ensureEntryFromUrl(imported);
      dep.importers.add(mod); //render.js importerts main.js
    }
    const deps = (mod.acceptedHmrDeps = new Set()); //main.js acceptedHmrDeps render.js
    for (const accepted of acceptedModules) {
      const dep = await this.ensureEntryFromUrl(accepted);
      deps.add(dep);
    }
  }
}
exports.ModuleGraph = ModuleGraph;
```

#### plugins
##### importAnalysis.js
```diff
const { init, parse } = require("es-module-lexer");
const MagicString = require("magic-string");
+ const path = require("path");
+ const { lexAcceptedHmrDeps } = require("../server/hmr");

/**
 * 导入文件分析插件
 * @param {object} config  配置对象
 * @returns {object} 插件对象
 */
function importAnalysisPlugin(config) {
  const { root } = config; // 项目根目录
+  let server;
  return {
    name: "g-vite:import-analysis",
+    configureServer(_server) {
+      server = _server;
+    },
    async transform(source, importer) {
      // 初始化 es-module-lexer
      await init;
      // 获取当前文件的所有导入
      let imports = parse(source)[0];
      // 如果没有导入，则返回源代码
      if (!imports.length) {
        return source;
      }
+      const { moduleGraph } = server;
+      const importerModule = moduleGraph.getModuleById(importer);
+      const importedUrls = new Set();
+      const acceptedUrls = new Set();
      // 创建一个 MagicString 对象
      let ms = new MagicString(source);
      // 获取导入的模块路径
      const normalizeUrl = async (url) => {
        // 解析此导入的模块的路径
        // 此处的 this  指向的是插件容器中的插件上下文对象，所以可以使用 this.resolve 来解析模块路径
        // resolve 内部其实调用的是插件容器的 resolveId 方法，返回url的绝对路径
        const resolved = await this.resolve(url, importer);
        if (resolved.id.startsWith(root + "/")) {
          //把绝对路径变成相对路径
          url = resolved.id.slice(root.length);
        }
+        await moduleGraph.ensureEntryFromUrl(url);
        return url;
      };
      // 遍历导入
      for (let index = 0; index < imports.length; index++) {
        // 获取导入的位置和模块名
        const { s: start, e: end, n: specifier } = imports[index];
+        const rawUrl = source.slice(start, end);
+        if (rawUrl === "import.meta") {
+          const prop = source.slice(end, end + 4);
+          if (prop === ".hot") {
+            if (source.slice(end + 4, end + 11) === ".accept") {
+              lexAcceptedHmrDeps(
+                source,
+                source.indexOf("(", end + 11) + 1,
+                acceptedUrls
+              );
+            }
+          }
+        }
        // 如果有模块名
        if (specifier) {
          // 获取url
          const normalizedUrl = await normalizeUrl(specifier);
          // 如果有变化
          if (normalizedUrl !== specifier) {
            // 替换
            ms.overwrite(start, end, normalizedUrl);
          }
+          importedUrls.add(normalizedUrl);
        }
      }
+      const normalizedAcceptedUrls = new Set();
+      const toAbsoluteUrl = (url) =>
+        path.posix.resolve(path.posix.dirname(importerModule.url), url);
+      for (const { url, start, end } of acceptedUrls) {
+        const [normalized] = await moduleGraph.resolveUrl(toAbsoluteUrl(url));
+        normalizedAcceptedUrls.add(normalized);
+        ms.overwrite(start, end, JSON.stringify(normalized));
+      }
+      await moduleGraph.updateModuleInfo(
+        importerModule,
+        importedUrls,
+        normalizedAcceptedUrls
+      );
      return ms.toString();
    },
  };
}
module.exports = importAnalysisPlugin;
```

### example-hmr
#### package.json
```json
{
  "name": "example",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "g-vite",
    "build": "g-vite build",
    "preview": "g-vite preview"
  },
  "dependencies": {
    "lodash": "^4.17.21",
    "vue": "^3.5.16"
  }
}
```

#### vite.config.js
```javascript
const vue = require("../plugins/vue");

module.exports = {
  plugins: [vue()],
};
```

#### index.html
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + Vue</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
    <script type="module" src="/src/client.js"></script>
  </body>
</html>
```

#### src
##### main.js
```javascript
import { render } from "./render.js";
render();
window.hotModulesMap = new Map();
var ownerPath = "/src/main.js";
import.meta.hot = {
  accept(deps, callback) {
    acceptDeps(deps, callback);
  },
};
function acceptDeps(deps, callback) {
  const mod = hotModulesMap.get(ownerPath) || {
    id: ownerPath,
    callbacks: [],
  };
  mod.callbacks.push({
    deps,
    fn: callback,
  });
  hotModulesMap.set(ownerPath, mod);
}
if (import.meta.hot) {
  import.meta.hot.accept(["./render.js"], ([renderMod]) => {
    renderMod.render();
  });
}
```

##### render.js
```javascript
export function render() {
  app.innerHTML = "title123";
}
```

##### client.js
```javascript
console.log("[vite] connecting...");
var socket = new WebSocket(`ws://${window.location.host}`, "vite-hmr");
socket.addEventListener("message", async ({ data }) => {
  handleMessage(JSON.parse(data));
});
async function handleMessage(payload) {
  switch (payload.type) {
    case "connected":
      console.log(`[vite] connected.`);
      break;
    case "update":
      payload.updates.forEach((update) => {
        if (update.type === "js-update") {
          fetchUpdate(update);
        }
      });
      break;
    case "full-reload":
      location.reload();
    default:
      break;
  }
}

async function fetchUpdate({ path, acceptedPath }) {
  const mod = window.hotModulesMap.get(path);
  if (!mod) {
    return;
  }
  const moduleMap = new Map();
  const modulesToUpdate = new Set();
  for (const { deps } of mod.callbacks) {
    deps.forEach((dep) => {
      if (acceptedPath === dep) {
        modulesToUpdate.add(dep);
      }
    });
  }
  await Promise.all(
    Array.from(modulesToUpdate).map(async (dep) => {
      const newMod = await import(dep + "?ts=" + Date.now());
      moduleMap.set(dep, newMod);
    })
  );
  for (const { deps, fn } of mod.callbacks) {
    fn(deps.map((dep) => moduleMap.get(dep)));
  }
  const loggedPath = `${acceptedPath} via ${path}`;
  console.log(`[vite] hot updated: ${loggedPath}`);
}
```

### 测试
```shell
cd example-hmr
pnpm dev
```

## 参考
[HMR API](https://vitejs.cn/vite6-cn/guide/api-hmr.html)

# 源码
[GitHub - lotosv2010/g-vite](https://github.com/lotosv2010/g-vite)

