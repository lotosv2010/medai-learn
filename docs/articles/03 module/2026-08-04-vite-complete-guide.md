# Vite 完全指南：从基本使用到原理实现（面试收藏级）

> 面试官微笑着问：「Vite 为什么比 Webpack 快那么多？」你说出了「原生 ESM」，然后停住了。他继续追：「那预构建是什么？HMR 的原理呢？自己实现一个 Vite 的 dev server 需要哪些模块？」这篇文章，把这条追问链上每一环都讲透。

---

## 🎯 这篇文章解决什么问题

Vite 的知识点很分散：用得顺手，却说不清原理；知道 esbuild 快，但不知道为什么快；手搭项目配过一堆插件，但面试讲不出它们的设计意图。

这篇文章从五个维度系统覆盖 Vite：**是什么 → 底层引擎 esbuild → 手动搭建 → 脚手架原理 → 手写实现 → 生产级实战配置**。每个知识点讲透原理，立刻给出面试怎么答。

---

## 🚀 Vite 是什么：为什么它比 Webpack 快这么多

Vite（法语，发音 /vit/，意为「快速」）是下一代前端开发与构建工具，核心特性：

- **极速启动**：使用原生 ESM，无需打包
- **极快 HMR**：无论应用多大，热重载始终极快
- **开箱即用**：TypeScript、JSX、CSS 原生支持
- **优化构建**：底层用 Rollup，支持多页应用和库模式
- **通用插件**：开发和构建共享同一套 Rollup-superset 插件接口
- **完整类型化 API**：灵活且安全

Vite 主要由两部分组成：

- **开发服务器**：基于原生 ES 模块，按需编译
- **构建指令**：使用 Rollup 打包，针对生产优化

### 传统打包工具的瓶颈

Webpack 等传统打包工具启动时需要遍历所有模块，构建完整的依赖图，再打包成 bundle 才能启动 dev server。项目越大，启动越慢——这是架构层面的问题，不是优化能彻底解决的。

Vite 的解法是：**开发时不打包，直接用浏览器的原生 ESM**。浏览器请求哪个模块，服务器就按需编译哪个，冷启动时间从几十秒变成几百毫秒。

> 💬 **面试官**：Vite 和 Webpack 的本质区别是什么？
>
> ✅ 标准答案：Webpack 是 bundle-based，启动时需要构建完整依赖图再打包；Vite 是 unbundled，开发时基于原生 ESM 按需编译，浏览器请求什么就编译什么。
> 🎁 加分答案：补充 Vite 把依赖分为「源码」和「依赖」两类，依赖用 esbuild 预构建（缓存在 node_modules/.vite/deps），源码按需编译。这样既解决了 CommonJS 兼容问题，又把启动速度压到极致。

---

## ⚡ esbuild：Vite 预构建的加速引擎

esbuild 是 Vite 预构建阶段的核心，基于 Go 开发，构建速度比传统 JS 工具快 10～100 倍。

> esbuild benchmark：打包同一份代码，esbuild 约 0.37s，Webpack 5 约 56.71s。数量级的差距来自三点：Go 原生编译执行、充分利用多核并行、从零设计无历史负担。

### 基本使用

安装依赖：

```shell
pnpm init
pnpm add esbuild -D
```

`package.json` 指定 `type: module`，然后写构建脚本：

```javascript
// esbuild.js
import esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  outfile: 'dist/main.js',
  format: 'esm'
}).catch(() => process.exit(1));
```

`src/main.js` 只有一行：

```javascript
console.log("Hello ESBuild");
```

执行 `pnpm build` 后，`dist/main.js` 输出：

```javascript
// src/main.js
console.log("Hello ESBuild");
```

### 内容类型与 loader

esbuild 通过 loader 告诉它如何解释文件内容。默认按扩展名自动匹配，也可以手动覆盖。

比如项目里有 JSX 语法但文件名是 `.js`，需要显式声明：

```javascript
esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  outfile: 'dist/main.js',
  loader: {
    '.js': 'jsx'   // 👈 告诉 esbuild 用 jsx loader 处理 .js 文件
  },
  format: 'esm'
}).catch(() => process.exit(1));
```

这样 `src/index.jsx` 里的 `<h1>Hello World</h1>` 就能正确编译。

### 插件系统

esbuild 插件是一个含 `name` 和 `setup` 函数的对象，传给 build API 的 `plugins` 数组。

插件有三个核心概念：

**命名空间**：每个模块都有命名空间，默认是 `file`（对应文件系统）。插件可以创建「虚拟模块」，用自定义命名空间标记它们。

**过滤器**：每个回调必须提供正则过滤器，路径不匹配就跳过回调，避免无效执行。

**两个核心钩子**：

`onResolve`：在每个模块的每个导入路径上运行，可以拦截导入并重定向，或标记为 external。

`onLoad`：为每个未标记为 external 的唯一路径/命名空间对运行，返回模块内容和 loader 类型。

下面是一个把 `env` 导入替换为当前进程环境变量的插件：

```javascript
// plugins/envPlugin.js
const envPlugin = {
  name: "env",
  setup(build) {
    // 拦截 import { PATH } from "env" 这样的导入
    build.onResolve({ filter: /^env$/ }, (args) => ({
      path: args.path,
      namespace: "env-ns",  // 标记为虚拟模块
    }));
```

```javascript
    // 加载 env-ns 命名空间下的模块，返回 process.env 序列化结果
    build.onLoad({ filter: /.*/, namespace: "env-ns" }, () => ({
      contents: JSON.stringify(process.env),
      loader: "json",
    }));
  },
};

export default envPlugin;
```

在源码里就可以这样写：

```javascript
// src/entry.js
import { PATH } from "env";
console.log(`Path is ${PATH}`);
```

注册插件：

```javascript
import envPlugin from "./plugins/envPlugin.js";

esbuild.build({
  entryPoints: ["src/entry.js"],
  bundle: true,
  outfile: "dist/entry.js",
  loader: { ".js": "jsx" },
  format: "esm",
  plugins: [envPlugin],   // 👈 注册插件
}).catch(() => process.exit(1));
```

> 💬 **面试官**：Vite 为什么用 esbuild 做预构建，而不用 Rollup？
>
> ✅ 标准答案：预构建需要快速扫描依赖、合并 CommonJS 模块，esbuild 在速度上远胜 Rollup（Go vs JS 运行时）。但 Vite 生产构建仍用 Rollup，因为 Rollup 的 tree-shaking 和代码分割更成熟，esbuild 在这块还不够完善。
> 🎁 加分答案：esbuild 插件系统的 onResolve/onLoad 钩子让 Vite 可以精确控制预构建过程，比如 esbuildScanPlugin 只扫描不编译，提取依赖列表。

---

## 🛠️ 手动搭建 Vite 项目：从零到跑通

脚手架能一键搭起来，但手动搭一遍才真正理解 Vite 需要什么。

### 安装依赖

```shell
pnpm add vue -S
pnpm add @vitejs/plugin-vue vite -D
```

### package.json

```json
{
  "name": "vite-demo",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.5.16"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.4",
    "vite": "^6.3.5"
  }
}
```

`"type": "module"` 是关键——告诉 Node.js 把 `.js` 文件当 ESM 处理，否则 Vite 的 ESM-based 架构无法工作。

### vite.config.js

```javascript
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
});
```

### index.html

Vite 的入口不是 JS，而是 HTML。`<script type="module">` 是浏览器原生 ESM 的触发点：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vite + Vue</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

### src 目录

`src/main.js` 是应用入口：

```javascript
import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";

createApp(App).mount("#app");
```

`src/style.css` 定义全局样式（Vite 原生支持 CSS 直接导入）：

```css
:root {
  font-size: 16px;
  font-family: system-ui, -apple-system, sans-serif;
  color: aliceblue;
  background-color: cadetblue;
}

body { margin: 0; }
#app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}
```

`src/App.vue` 引入子组件：

```vue
<template>
  <div>
    <img src="/vite.svg" class="logo" alt="Vite logo" />
    <img src="./assets/vue.svg" class="logo vue" alt="Vue logo">
  </div>
  <HelloWorld msg="Vite + Vue" />
</template>

<script setup>
import HelloWorld from './components/HelloWorld.vue';
</script>
```

`src/components/HelloWorld.vue` 演示响应式：

```vue
<template>
  <div>
    <h3>{{ msg }}</h3>
    <button @click="count++">count is: {{ count }}</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
defineProps({ msg: { type: String } });
const count = ref(0);
</script>
```

### 三个核心命令

```shell
pnpm dev      # 启动开发服务器
pnpm build    # 构建生产包
pnpm preview  # 本地预览生产包
```

> 💬 **面试官**：`package.json` 里的 `"type": "module"` 为什么必须设置？
>
> ✅ 标准答案：Node.js 默认把 `.js` 当 CommonJS 处理，设置 `type: module` 才会用 ESM 解析。Vite 的配置文件、插件等都是 ESM 格式，不设置这个字段会报 `require is not defined` 或 `Cannot use import statement` 错误。
> 🎁 加分答案：如果非要在 `type: module` 项目里用 CommonJS，可以把文件改名为 `.cjs`。反之，CommonJS 项目要用 ESM 可以改名 `.mjs`。

也可以用脚手架一键搭建：

```shell
pnpm create vite
```

按提示选择框架和变体，完成后执行 `pnpm install && pnpm dev` 即可。

---

## 🏗️ g-vite 第一部分：脚手架（对标 create-vite）

这一节和下一节共同构成 **g-vite** 这个手写项目的完整全貌。先看整体架构：

```text
g-vite（Lerna Monorepo）
├── Part 1 脚手架  ← 本节
│   ├── gvite              # CLI 入口（bin: create-gvite / gva）
│   ├── @g-vite/config     # config 命令（读写 .gviterc）
│   ├── @g-vite/create     # create 命令（交互选框架 → 复制模板）
│   ├── @g-vite/settings   # 常量 + 动态命令源码
│   └── @g-vite/utils      # 日志、子进程、配置读写
└── Part 2 Dev Server  ← 下一节
    ├── connect 中间件链
    ├── esbuild 预构建
    ├── importAnalysisPlugin（路径重写）
    ├── pluginContainer（resolveId / load / transform）
    └── HMR（chokidar + ws + ModuleGraph）
```

**脚手架**解决「如何创建项目」，**Dev Server** 解决「如何运行项目」。`pnpm create vite` 背后发生了什么？先把这个讲透。

### npm create 的本质

`pnpm create vite` 等价于 `pnpm dlx create-vite`，即下载并执行 `create-vite` 这个 npm 包的 bin 命令。`npm create X` = `npm init X` = 执行 `create-X` 包的 bin 入口。

### 三个核心依赖

调试 create-vite 源码（搜索关键词：`github vitejs vite packages/create-vite`），可以看到它只依赖三个库：

- **minimist**：解析命令行参数（类似 yargs、commander）
- **kolorist**：在控制台输出彩色文字（类似 chalk）
- **prompts**：交互式命令行提示（类似 inquirer）

### create-vite 的能力边界

create-vite 支持：

- 参数解析（`--template react-ts`）
- 自定义项目名
- 空目录检查
- 静态项目模板复制

create-vite **不支持**：

- Lerna / Monorepo 初始化
- 文件异步写入
- 多进程执行命令 / 动态执行 node 命令
- 自动安装依赖和启动服务
- 参数化配置技术栈（类似 vue-cli 的插件体系）
- GitHub / Gitee 仓库动态拉取模板
- 模板标签选择和动态模板渲染

这就是为什么有那么多基于 create-vite 二次封装的企业脚手架——把这些「不支持」的能力补上。

### 调试源码

克隆 vite 仓库后本地调试 create-vite，在 `.vscode/launch.json` 中配置：

```json
{
  "version": "0.2.0",
  "configurations": [{
    "type": "pwa-node",
    "request": "launch",
    "name": "Launch Program",
    "skipFiles": ["<node_internals>/**"],
    "program": "${workspaceFolder}\\packages\\create-vite\\index.js",
    "args": ["create", "vite-project"]
  }]
}
```

### 手写 g-vite 脚手架：Monorepo 初始化

用 Lerna 管理多包：

```shell
cd g-vite
lerna init --packages="packages/*"
```

`lerna.json` 核心配置：

```json
{
  "$schema": "node_modules/lerna/schemas/lerna-schema.json",
  "version": "2.0.1",
  "packages": ["packages/*"],
  "npmClient": "pnpm"
}
```

`pnpm-workspace.yaml` 声明工作区：

```yaml
packages:
  - 'packages/*'
```

根目录 `package.json`：

```json
{
  "name": "root",
  "private": true,
  "devDependencies": {
    "lerna": "^8.2.2"
  }
}
```

目录结构：

```text
g-vite/
├── packages/
│   ├── gvite/              # 核心命令入口
│   ├── @g-vite/config/     # 配置项
│   ├── @g-vite/create/     # 创建项目
│   ├── @g-vite/settings/   # 常量定义
│   └── @g-vite/utils/      # 工具方法
├── package.json
├── lerna.json
└── pnpm-workspace.yaml
```

创建子包（`--registry` 指向本地私有仓库）：

```shell
lerna create @g-vite/config --registry http://localhost:4873
lerna create @g-vite/create --registry http://localhost:4873
lerna create gvite --registry http://localhost:4873
lerna create @g-vite/settings --registry http://localhost:4873
lerna create @g-vite/utils --registry http://localhost:4873
```

### 实现命令行入口（gvite 包）

`bin/gvite.js` 是 CLI 可执行入口：

```javascript
#!/usr/bin/env node
require('../lib/gvite')
```

`package.json` 注册 bin 命令（两个别名指向同一入口）：

```json
{
  "name": "gvite",
  "main": "lib/gvite.js",
  "bin": {
    "create-gvite": "bin/gvite.js",
    "gva": "bin/gvite.js"
  }
}
```

`lib/gvite.js` 用 yargs 挂载所有子命令：

```javascript
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const configCmd = require("@g-vite/config/lib/command");
const createCmd = require("@g-vite/create/lib/command");

async function main() {
  const cli = yargs(hideBin(process.argv));
  cli
    .scriptName("create-gvite")
    .usage(`Usage: create-gvite|gva <command> [options]`)
    .demandCommand(1, "至少需要一个命令")
    .strict()
    .recommendCommands()
    .command(configCmd)
    .command(createCmd)
    .help().alias("help", "h")
    .version().alias("version", "v")
    .parse();
}
main().catch(console.error);
```

本地链接测试：

```shell
cd packages/gvite
pnpm link -g
create-gvite create demo   # 或 gva create demo
# 输出 [ 'create', 'demo' ]
```

安装各包之间的依赖：

```shell
pnpm add @g-vite/settings --workspace --filter @g-vite/utils
pnpm add @g-vite/settings @g-vite/utils --workspace --filter @g-vite/config
pnpm add @g-vite/config @g-vite/create --workspace --filter gvite
pnpm add userhome fs-extra cross-spawn chalk@4 signale --filter @g-vite/utils
pnpm add yargs@17 --filter gvite
```

### 实现 config 配置命令（@g-vite/config 包）

`lib/command.js` 把 yargs 子命令代理给子进程执行（多进程模式，避免主进程崩溃）：

```javascript
const { getCommandSource } = require("@g-vite/settings");
const { executeNodeScript } = require("@g-vite/utils");

const command = {
  command: "config [key] [value]",
  describe: "设置或查看配置项，如 GIT_TYPE 设置仓库类型",
  builder: (yargs) => {},
  handler: async function (argv) {
    const COMMAND_SOURCE = getCommandSource("config");
    await executeNodeScript({ cwd: __dirname }, COMMAND_SOURCE, argv);
  },
};
module.exports = command;
```

`lib/config.js` 读写用户主目录下的 `.gviterc` 配置文件：

```javascript
const fs = require("fs-extra");
const { log, config } = require("@g-vite/utils");
const chalk = require("chalk");

async function factory(argv) {
  const { key, value } = argv;
  if (key && value) {
    config[key] = value;
    await fs.writeJSON(config.configPath, config, { spaces: 2 });
    log.info(`${chalk.greenBright("create-gvite")} (%s=%s) 配置成功`, key, value);
  } else if (key) {
    log.info(chalk.magentaBright("%s=%s"), key, config[key]);
  } else {
    log.info(chalk.magentaBright(JSON.stringify(config)));
  }
}
module.exports = factory;
```

### @g-vite/settings：命令源码模块

`lib/settings.js` 提供动态 node 脚本字符串——这是实现多进程命令的核心：

```javascript
// getCommandSource 生成一段由 node -e 执行的脚本字符串
exports.getCommandSource = (filename) => `
  const args = JSON.parse(process.argv[1]);
  const factory = require('./${filename}');
  factory(args);
`;

// 配置文件名（存储在用户主目录）
exports.RC_NAME = ".gviterc";
```

### @g-vite/utils：工具模块

`lib/utils.js` 统一导出四个工具：

```javascript
exports.log = require("./log");
exports.executeNodeScript = require("./executeNodeScript");
exports.config = require("./config");
```

`log.js`：基于 signale 的结构化日志：

```javascript
const { Signale } = require("signale");
module.exports = new Signale();
```

`executeNodeScript.js`：用 cross-spawn 开子进程执行动态 node 脚本：

```javascript
const spawn = require("cross-spawn");

async function executeNodeScript({ cwd }, source, args) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ["-e", source, "--", JSON.stringify(args)],
      { cwd, stdio: "inherit" }
    );
    child.on("close", resolve);
  });
}
module.exports = executeNodeScript;
```

`config.js`：从用户主目录读取持久化配置（`.gviterc`）：

```javascript
const userhome = require("userhome");
const fs = require("fs-extra");
const { RC_NAME } = require("@g-vite/settings");

const configPath = userhome(RC_NAME);
let config = {};
if (fs.existsSync(configPath)) {
  config = fs.readJSONSync(configPath);
}
config.configPath = configPath;
module.exports = config;
```

### 实现 create 创建命令（@g-vite/create 包）

`lib/command.js` 注册 create 子命令：

```javascript
const { getCommandSource } = require("@g-vite/settings");
const { executeNodeScript } = require("@g-vite/utils");

const command = {
  command: "create [name]",
  describe: "create a new project in the current directory",
  builder: (yargs) => {
    yargs.option("name", {
      type: "string",
      description: "project name",
      default: "g-vite-project",
    });
  },
  handler: async function (argv) {
    const args = { name: argv.name, cwd: process.cwd() };
    const COMMAND_SOURCE = getCommandSource("create");
    await executeNodeScript({ cwd: __dirname }, COMMAND_SOURCE, args);
  },
};
module.exports = command;
```

### 创建项目目录

安装交互式提示依赖：

```shell
pnpm add chalk@4 fs-extra @inquirer/prompts --filter @g-vite/create
```

`lib/create.js` 第一步：获取项目名，处理目录已存在的情况：

```javascript
const { confirm, input, select } = require("@inquirer/prompts");
const path = require("path");
const { redBright, greenBright, yellowBright, cyanBright, blueBright } = require("chalk");
const fs = require("fs-extra");
const { log } = require("@g-vite/utils");

async function factory(argv) {
  const { cwd, name } = argv;
  process.chdir(cwd); // 切换为命令执行时的工作目录

  const packageName = await input({ message: `Project name:`, default: name });
  const targetDir = path.join(process.cwd(), packageName);
```

目录冲突处理（存在且非空时询问是否覆盖）：

```javascript
  try {
    await fs.access(targetDir);
    const files = await fs.readdir(targetDir);
    if (files.length > 0) {
      const overwrite = await confirm({
        message: `Target directory ${redBright(targetDir)} is not empty. Remove and continue?`,
      });
      if (overwrite) { await fs.emptyDir(targetDir); }
      else { log.error("Operation cancelled."); return; }
    }
  } catch {
    await fs.mkdirp(targetDir); // 目录不存在则创建
  }
```

### 下载并复制模板

安装 execa 用于执行 git init：

```shell
pnpm add execa --filter @g-vite/create
```

定义框架和变体列表（对应 `template-react-ts` 等模板目录）：

```javascript
const FRAMEWORKS = [
  {
    name: "vue", color: greenBright,
    variants: [
      { name: "vue",    display: "Javascript", color: yellowBright },
      { name: "vue-ts", display: "Typescript",  color: blueBright },
    ],
  },
  {
    name: "react", color: cyanBright,
    variants: [
      { name: "react",    display: "Javascript", color: yellowBright },
      { name: "react-ts", display: "Typescript",  color: blueBright },
    ],
  },
];
```

交互选择框架 → 选择变体 → 复制模板文件：

```javascript
  // 选择框架和变体
  const framework = await select({
    message: `Select a framework:`,
    choices: FRAMEWORKS.map(({ name, color }) => ({ name: color(name), value: name })),
  });
  const variant = await select({
    message: `Select a variant:`,
    choices: FRAMEWORKS.find(f => f.name === framework).variants
      .map(({ name, color, display }) => ({ name: color(display), value: name })),
  });

  // 复制模板（package.json 单独处理，修改 name 字段）
  const templateDir = path.resolve(__dirname, `../template-${variant}`);
  const files = await fs.readdir(templateDir);
  for (const file of files.filter(f => f !== "package.json")) {
    await fs.copy(path.join(templateDir, file), path.join(targetDir, file));
  }
```

写入 package.json 并执行 git init：

```javascript
  // 修改 name 字段后写入
  const pkg = JSON.parse(await fs.readFile(path.join(templateDir, "package.json"), "utf-8"));
  pkg.name = packageName;
  await fs.writeFile(path.join(targetDir, "package.json"), JSON.stringify(pkg, null, 2));

  // git init
  const { execa } = await import("execa");
  await execa("git", ["init"], { cwd: targetDir });
  log.info(`${greenBright("Done. Now run:")}\n  cd ${packageName}\n  npm install\n  npm run dev`);
}
module.exports = factory;
```

`package.json` 的 `files` 字段需包含所有模板目录，发布后用户才能用到：

```json
{
  "files": [
    "lib",
    "template-react",
    "template-vue",
    "template-vue-ts",
    "template-react-ts"
  ]
}
```

> 💬 **面试官**：npm create 和 npm init 有什么关系？create-vite 是如何被 pnpm create vite 触发的？
>
> ✅ 标准答案：`npm create X` 是 `npm init X` 的别名，两者等价。执行时，npm 查找 `create-X` 这个包，本地没有则从 registry 下载（dlx），然后执行其 `bin` 字段指向的脚本。`pnpm create vite` 就是下载 `create-vite` 包并执行。
> 🎁 加分答案：可以自己发布一个 `create-my-cli` 包，用户只需 `pnpm create my-cli` 就能使用。企业脚手架通常在 create-vite 基础上二次封装，用多进程（cross-spawn）安装依赖、用 execa 执行 git init、用 @inquirer/prompts 做交互式选择，补上 create-vite 不支持的能力。

g-vite 脚手架解决了「项目创建」。项目跑起来之后，背后的 dev server 是怎么工作的？接下来手写 g-vite 的第二部分——实现 Vite 内核。

---

## 🔬 g-vite 第二部分：Dev Server（对标 Vite 内核）

脚手架（上一节）解决了「选框架、创建目录、复制模板、初始化 git」——项目有了，但怎么跑起来？这就是 g-vite 的第二部分：**手写一个 Vite dev server**，从 HTTP 服务到 HMR 全部自己实现，把 Vite 的黑盒原理彻底打开。

理解实现之前，先认识核心依赖。

### 核心依赖解析

**connect**：轻量 HTTP 中间件框架（Express 就是构建在它上面的）。Vite dev server 本质是一个 connect 应用：

```javascript
const connect = require("connect");
const http = require("http");

const middlewares = connect();
middlewares.use(function (req, res, next) {
  console.log("middleware1");
  next();
});
middlewares.use(function (req, res, next) {
  res.end("Hello from Connect!");
});
http.createServer(middlewares).listen(3000);
```

**serve-static**：静态文件中间件，处理 HTML、图片等静态资源。

**es-module-lexer**：JS 模块语法解析器，解析 `import` 语句：

```javascript
const { init, parse } = require("es-module-lexer");
(async () => {
  await init;
  const [imports, exports] = parse(
    `import _ from 'lodash';\nexport var p = 5`
  );
  console.log(imports); // [{s: 导入路径起始, e: 结束, ...}]
})();
```

**magic-string**：字符串操作库，用于修改源码中的 import 路径：

```javascript
const MagicString = require("magic-string");
const ms = new MagicString("var age = 10");
ms.overwrite(10, 12, "11");
console.log(ms.toString()); // "var age = 11"
```

**fast-glob**：文件系统遍历，扫描项目依赖。

**chokidar + ws**：文件监听 + WebSocket，实现 HMR。

### HTTP 服务器

g-vite 的 dev server 用 connect 搭建：

```javascript
// lib/server/index.js
import connect from "connect";
import http from "http";

export function createServer() {
  const app = connect();
  const server = http.createServer(app);

  // 挂载中间件
  app.use(serveStaticMiddleware());
  app.use(transformMiddleware());

  server.listen(5173, () => {
    console.log("g-vite dev server running at http://localhost:5173");
  });
}
```

### 依赖预构建

预构建分两步：**扫描**和**构建**。

扫描阶段用 esbuildScanPlugin 只提取依赖列表，不做真正编译：

```javascript
// esbuildScanPlugin：只扫描，不编译
const esbuildScanPlugin = {
  name: "scan",
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      // 第三方依赖：记录并标记为 external，不继续打包
      if (isNodeModule(args.path)) {
        deps.add(args.path);
        return { path: args.path, external: true };
      }
    });
  }
};
```

构建阶段对扫描到的依赖用 esbuild 真正打包，输出到 `node_modules/.g-vite/deps/`：

```javascript
// createOptimizeDepsRun：真正的预构建
async function createOptimizeDepsRun(deps) {
  await esbuild.build({
    entryPoints: [...deps],
    bundle: true,
    format: "esm",
    outdir: "node_modules/.g-vite/deps",
  });
  // 写入 _metadata.json 记录依赖映射
  fs.writeFileSync(metadataPath, JSON.stringify({ optimized: deps }));
}
```

### 导入路径重写

这是 Vite 最核心的一步：把 `import { createApp } from 'vue'` 变成 `import { createApp } from '/node_modules/.vite/deps/vue.js'`。

请求 `/src/main.js` 时，transformMiddleware 拦截处理：

```javascript
// 判断是否是 JS 请求
function isJSRequest(url) {
  return /\.(js|ts|jsx|tsx|vue)$/.test(url);
}
```

核心转换流程经过插件容器的三个阶段：

```text
pluginContainer.resolveId(url)  → 解析绝对路径
pluginContainer.load(id)        → 加载文件内容
pluginContainer.transform(code, id) → 转换代码
```

在 `transform` 阶段，`importAnalysisPlugin` 用 es-module-lexer 解析所有 import，找到裸模块名（如 `vue`），再用 `preAliasPlugin` 把它映射到预构建路径：

```javascript
// importAnalysisPlugin 核心逻辑
async transform(code, id) {
  const [imports] = await init.then(() => parse(code));
  const ms = new MagicString(code);

  for (const importInfo of imports) {
    const { s: start, e: end, n: specifier } = importInfo;
    if (isBareImport(specifier)) {
      // vue → /node_modules/.vite/deps/vue.js
      const resolved = await this.resolve(specifier);
      ms.overwrite(start, end, resolved);
    }
  }
  return ms.toString();
}
```

### 插件容器

Vite 的插件容器实现了 Rollup 插件接口的子集，让同一套插件在开发和构建时复用：

```javascript
// pluginContainer：统一调度 resolveId / load / transform
const pluginContainer = {
  async resolveId(id, importer) {
    for (const plugin of plugins) {
      if (plugin.resolveId) {
        const result = await plugin.resolveId.call(ctx, id, importer);
        if (result) return result;
      }
    }
  },
  async load(id) {
    for (const plugin of plugins) {
      if (plugin.load) {
        const result = await plugin.load.call(ctx, id);
        if (result) return result;
      }
    }
    return null;
  },
  async transform(code, id) {
    for (const plugin of plugins) {
      if (plugin.transform) {
        code = await plugin.transform.call(ctx, code, id) ?? code;
      }
    }
    return code;
  }
};
```

### Vue 插件支持

Vue SFC（`.vue` 文件）需要特殊处理。插件把一个 `.vue` 文件拆成三块编译：

```javascript
// vuePlugin：处理 .vue 文件
function vuePlugin() {
  return {
    name: "vue",
    transform(code, id) {
      if (!id.endsWith(".vue")) return;
      // 解析 SFC，拆分 script / template / style
      const { descriptor } = parseVueRequest(id);
      let output = "";
      output += genScriptCode(descriptor);   // 编译 <script>
      output += genTemplateCode(descriptor); // 编译 <template>
      output += genStyleCode(descriptor);    // 注入 <style>
      return output;
    }
  };
}
```

### 环境变量支持

用 definePlugin 在编译时替换全局变量，类似 Webpack 的 DefinePlugin：

```javascript
// definePlugin：编译时替换
function definePlugin(define = {}) {
  return {
    name: "define",
    transform(code) {
      const ms = new MagicString(code);
      for (const [key, val] of Object.entries(define)) {
        // 全局替换 __VUE_OPTIONS_API__ 等变量
        ms.replaceAll(key, JSON.stringify(val));
      }
      return ms.toString();
    }
  };
}
```

### HMR 热更新

HMR 由三部分配合完成：

**文件监听**（chokidar）：监听源码变化，触发 handleHMRUpdate。

**WebSocket**（ws）：把更新通知推送给浏览器端。

**ModuleGraph**：记录模块依赖图，判断哪些模块受影响、是否需要整页刷新。

服务端 WebSocket：

```javascript
// createWebSocketServer
import { WebSocketServer } from "ws";

export function createWebSocketServer(server) {
  const wss = new WebSocketServer({ server });
  return {
    send(data) {
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify(data));
        }
      });
    }
  };
}
```

文件变化时：

```javascript
// handleHMRUpdate：文件变化处理
chokidar.watch(srcDir).on("change", async (file) => {
  const mods = moduleGraph.getModulesByFile(file);
  ws.send({ type: "update", updates: [...mods].map(toUpdate) });
});
```

浏览器端 `client.js` 收到更新，根据 `type` 决定热替换还是整页刷新：

```javascript
// 浏览器端 client.js（由 Vite 自动注入）
const socket = new WebSocket("ws://localhost:5173");
socket.addEventListener("message", ({ data }) => {
  const payload = JSON.parse(data);
  if (payload.type === "update") handleUpdate(payload);
  if (payload.type === "full-reload") location.reload();
});
```

HMR API 的基本用法：

```javascript
// 模块声明接受自身更新
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    // 热替换逻辑
  });

  import.meta.hot.dispose((data) => {
    // 清理副作用，data 在更新间传递状态
  });

  import.meta.hot.decline();     // 声明不可热替换，触发整页刷新
  import.meta.hot.invalidate();  // 手动让自身失效
}
```

> 💬 **面试官**：Vite 的 HMR 和 Webpack 的 HMR 有什么区别？
>
> ✅ 标准答案：两者都用 WebSocket 推送更新，但粒度不同。Webpack HMR 需要重新打包受影响的 chunk，推送的是 patch；Vite HMR 直接替换单个 ESM 模块，浏览器重新请求那个文件即可，不需要打包，所以快很多。
> 🎁 加分答案：Vite 通过 ModuleGraph 精确追踪依赖关系，变化的文件只需要更新它自己和向上传播到最近 `accept` 边界，不会把整个依赖链都更新。这是「局部更新」能做到极快的原因。

---

## 🏢 Vite + React + TS + Antd 后台管理实战配置

了解了原理，来看生产级项目该如何配置。目标：

- TypeScript + React + JSX + ES6+
- SCSS Module
- ESLint + Prettier + Stylelint + Pre-commit hook
- HMR 热更新
- Antd 按需引入与主题覆盖
- Proxy 代理、alias 别名
- 兼容传统浏览器
- 懒加载和 chunk 分割

### 初始化项目

```shell
pnpm create vite vite-react-ts -- --template react-ts
```

### 代码规范三件套

**ESLint 配置**

```shell
pnpm add -D eslint eslint-config-alloy @typescript-eslint/parser
```

`.eslintrc.js` 核心配置：

```javascript
module.exports = {
  extends: ["alloy", "alloy/react", "alloy/typescript"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  env: { browser: true, es6: true, node: true },
  rules: {
    // 项目自定义规则
  },
};
```

**Prettier 配置**

```shell
pnpm add -D prettier eslint-config-prettier
```

`.prettierrc.js`：

```javascript
module.exports = {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: "all",
  endOfLine: "auto",
};
```

**Stylelint 配置**

```shell
pnpm add -D stylelint stylelint-config-standard stylelint-order
```

`.stylelintrc.js` 核心（包含 CSS 属性排序规则）：

```javascript
module.exports = {
  extends: ["stylelint-config-standard"],
  plugins: ["stylelint-order"],
  rules: {
    "order/properties-order": [
      "position", "top", "right", "bottom", "left", "z-index",
      "display", "flex", "flex-direction", "align-items", "justify-content",
      "width", "height", "margin", "padding",
      "font-size", "color", "background", "border",
    ],
  },
};
```

**GitHooks + lint-staged**

```shell
pnpm add -D yorkie lint-staged
```

`package.json` 配置：

```json
{
  "gitHooks": {
    "pre-commit": "lint-staged"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{css,scss}": ["stylelint --fix"]
  }
}
```

**vite-plugin-checker 自动检测**

开发时实时显示 ESLint 错误：

```javascript
// vite.config.ts
import checker from "vite-plugin-checker";

export default defineConfig({
  plugins: [
    checker({ typescript: true, eslint: { lintCommand: 'eslint "./src/**/*.{ts,tsx}"' } }),
  ],
});
```

### vite.config.ts 生产级配置

**别名配置**

```shell
pnpm add -D @types/node
```

```typescript
// vite.config.ts
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

同步更新 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

**环境变量**

Vite 按约定加载环境变量文件：

```text
.env              # 所有环境
.env.test         # 测试环境
.env.staging      # 预发环境
.env.production   # 生产环境
```

`.env` 示例（必须以 `VITE_` 开头才能暴露给客户端）：

```shell
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_TITLE=后台管理系统
```

封装一个 `getEnv` hook：

```typescript
// src/hooks/useEnv.ts
export function getEnv() {
  return {
    apiBase: import.meta.env.VITE_API_BASE_URL as string,
    appTitle: import.meta.env.VITE_APP_TITLE as string,
  };
}
```

**server 配置**

```typescript
server: {
  host: true,    // 暴露局域网地址
  port: 3000,
  open: true,    // 自动打开浏览器
}
```

**proxy 代理**

```typescript
// vite.config.ts
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
```

**build 配置**

```typescript
build: {
  terserOptions: {
    compress: {
      drop_console: true,    // 生产环境去掉 console
      drop_debugger: true,
    },
  },
  sourcemap: false,
  outDir: "dist",
  assetsDir: "assets",
  chunkSizeWarningLimit: 1500,
}
```

**打包分析可视化**

```shell
pnpm add -D rollup-plugin-visualizer
```

```typescript
import { visualizer } from "rollup-plugin-visualizer";

plugins: [
  visualizer({ open: true, filename: "dist/stats.html" }),
]
```

**gzip 压缩**

```shell
pnpm add -D vite-plugin-compression
```

```typescript
import viteCompression from "vite-plugin-compression";

plugins: [viteCompression({ algorithm: "gzip" })]
```

**兼容传统浏览器**

```shell
pnpm add -D @vitejs/plugin-legacy
```

```typescript
import legacy from "@vitejs/plugin-legacy";

plugins: [
  legacy({
    targets: ["ie >= 11"],
    additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
  }),
]
```

> 💬 **面试官**：生产环境 Vite build 有哪些优化手段？
>
> ✅ 标准答案：① terser 压缩去掉 console/debugger；② rollup-plugin-visualizer 分析 bundle；③ vite-plugin-compression 开启 gzip/brotli；④ @vitejs/plugin-legacy 兼容旧浏览器；⑤ build.rollupOptions.output.manualChunks 手动拆分 chunk。
> 🎁 加分答案：除了工具层面，代码层面要配合路由懒加载（`React.lazy + Suspense`）和 `import.meta.glob` 动态导入，才能把 chunk 真正拆小。

### CSS 预处理器：SCSS + CSS Modules

```shell
pnpm add -D sass
```

Vite 原生支持 SCSS，配置全局变量和 Mixin：

```typescript
// vite.config.ts
css: {
  preprocessorOptions: {
    scss: {
      additionalData: `
        @import "@/styles/variables.scss";
        @import "@/styles/mixins.scss";
      `,
    },
  },
  modules: {
    localsConvention: "camelCase",  // CSS Modules 类名转驼峰
  },
}
```

使用 CSS Modules（文件名加 `.module.scss`）：

```typescript
// App.tsx
import Styles from "./App.module.scss";

export default function App() {
  return <div className={Styles.app}>内容</div>;
}
```

### 路由方案

**约定式路由**（用 `import.meta.glob` 扫描 pages 目录）：

```typescript
// src/routes/index.ts
const modules = import.meta.glob("../pages/**/*.tsx");

function generatePathConfig(modules: Record<string, unknown>) {
  return Object.keys(modules).reduce((acc, filePath) => {
    // 把 ../pages/home/index.tsx 转成路由路径 /home
    const path = filePath
      .replace("../pages", "")
      .replace(/\/index\.tsx$/, "")
      .replace(/\.tsx$/, "");
    acc[path || "/"] = modules[filePath];
    return acc;
  }, {} as Record<string, unknown>);
}
```

路由懒加载包装（配合 Suspense）：

```typescript
function wrapSuspense(Component: React.ComponentType) {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <Component />
    </React.Suspense>
  );
}
```

**配置式路由**（手写 routes 数组）：

```typescript
// src/routes/routes.ts
const lazyLoad = (path: string) => {
  const Comp = React.lazy(() => import(`../pages/${path}`));
  return <React.Suspense fallback={<div>Loading...</div>}><Comp /></React.Suspense>;
};

export const routes = [
  { path: "/", element: lazyLoad("home/index") },
  { path: "/about", element: lazyLoad("about/index") },
];
```

### 状态管理：MobX

```shell
pnpm i -S mobx mobx-react
```

```typescript
// src/stores/GlobalStore.ts
import { makeAutoObservable } from "mobx";

class GlobalStore {
  theme = "light";
  userInfo = null;

  constructor() {
    makeAutoObservable(this);  // 自动让所有属性可观察
  }

  setTheme(theme: string) {
    this.theme = theme;
  }
}

export default new GlobalStore();
```

自定义 hook 访问 store：

```typescript
// src/hooks/useStores.ts
export function useStores() {
  return { globalStore, layoutStore };
}
```

### 请求封装：Axios + cancelToken

```shell
pnpm i -S axios nprogress
pnpm i -D @types/nprogress
```

封装 Request 类，支持拦截器、取消请求：

```typescript
// src/service/request/index.ts
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

class Request {
  instance: AxiosInstance;
  cancelRequestSourceList: CancelRequestSource[];

  constructor(config: RequestConfig) {
    this.instance = axios.create(config);
    this.cancelRequestSourceList = [];

    this.instance.interceptors.request.use(
      (config) => {
        // 添加取消 token
        const cancelToken = axios.CancelToken.source();
        config.cancelToken = cancelToken.token;
        this.cancelRequestSourceList.push({ [config.url!]: cancelToken.cancel });
        return config;
      },
      (err) => Promise.reject(err)
    );
```

```typescript
    this.instance.interceptors.response.use(
      (res) => {
        // 移除已完成的请求
        this.delUrl(res.config.url!);
        return res.data;
      },
      (err) => {
        this.delUrl(err.config?.url);
        return Promise.reject(err);
      }
    );
  }

  cancelRequest(url: string | string[]) {
    const urls = Array.isArray(url) ? url : [url];
    urls.forEach(u => {
      const source = this.cancelRequestSourceList.find(s => s[u]);
      source?.[u]?.("取消请求");
    });
  }

  cancelAllRequest() {
    this.cancelRequestSourceList.forEach(source => {
      Object.values(source).forEach(cancel => cancel("取消所有请求"));
    });
  }
}
```

统一导出请求函数：

```typescript
const req = new Request({ baseURL: import.meta.env.VITE_API_BASE_URL });

export function get<T>(url: string, params?: unknown): Promise<T> {
  return req.instance.get(url, { params });
}

export function post<T>(url: string, data?: unknown): Promise<T> {
  return req.instance.post(url, data);
}
```

### Mock：mockjs + vite-plugin-mock

```shell
pnpm add -D mockjs vite-plugin-mock
```

```typescript
// vite.config.ts
import { viteMockServe } from "vite-plugin-mock";

plugins: [
  viteMockServe({ mockPath: "mock", localEnabled: true }),
]
```

Mock 数据示例：

```typescript
// mock/home.ts
export default [
  {
    url: "/api/home/list",
    method: "get",
    response: () => ({
      code: 200,
      data: [
        { id: 1, name: "药品A", category: "消炎药" },
        { id: 2, name: "药品B", category: "维生素" },
      ],
    }),
  },
];
```

### Antd 按需引入

```shell
pnpm add -S antd
pnpm add -D vite-plugin-style-import less
```

```typescript
// vite.config.ts
import { createStyleImportPlugin } from "vite-plugin-style-import";

plugins: [
  createStyleImportPlugin({
    libs: [{
      libraryName: "antd",
      esModule: true,
      resolveStyle: (name) => `antd/es/${name}/style/index`,
    }],
  }),
]
```

### 国际化：react-i18next

```shell
pnpm i -S react-i18next i18next
```

三种使用方式对比：

**方式一：Translation 渲染函数**

```tsx
import { Translation } from "react-i18next";

<Translation>{(t) => <h1>{t("home.title")}</h1>}</Translation>
```

**方式二：useTranslation hook（推荐）**

```tsx
import { useTranslation } from "react-i18next";

function Home() {
  const { t, i18n } = useTranslation();
  return <h1>{t("home.title")}</h1>;
}
```

**方式三：withTranslation HOC（类组件用）**

```tsx
import { withTranslation, WithTranslation } from "react-i18next";

class Home extends React.Component<WithTranslation> {
  render() {
    const { t } = this.props;
    return <h1>{t("home.title")}</h1>;
  }
}
export default withTranslation()(Home);
```

### 测试：Jest + Cypress

**单元测试（Jest）**

```javascript
// jest.config.js
module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest"],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|scss)$": "identity-obj-proxy",
  },
};
```

**E2E 测试（Cypress）**

```typescript
// cypress/specs/index.specs.tsx
describe("首页", () => {
  it("访问首页", () => {
    cy.visit("http://localhost:3000");
    cy.get("h1").should("contain", "后台管理系统");
  });
});
```

### 最终目录结构

```text
src/
├── apis/          # 接口请求（按模块拆分）
├── assets/        # 静态资源
├── components/    # 公共组件（Icon/Charts/Message 等）
├── hooks/         # 自定义 hook
├── layouts/       # 布局组件（dashboard/fullpage）
├── locales/       # 国际化资源（en/zh/ja）
├── pages/         # 页面（home/about...）
├── routes/        # 路由配置
├── service/       # 请求封装（request/）
├── stores/        # 状态管理（MobX）
├── styles/        # 全局样式（variables/mixins）
├── types/         # 全局类型定义
└── utils/         # 工具函数
```

---

## 💡 一张图总结（面试速记）

| 知识点 | 一句话解释 | 面试频率 |
|--------|-----------|---------|
| Vite vs Webpack | unbundled ESM vs bundle-based，开发时按需编译 | ⭐⭐⭐⭐⭐ |
| esbuild 为什么快 | Go 原生编译 + 多核并行，比 JS 工具快 10-100 倍 | ⭐⭐⭐⭐ |
| 预构建 | 用 esbuild 把三方依赖预编译到 .vite/deps，解决 CJS 兼容 | ⭐⭐⭐⭐⭐ |
| 导入路径重写 | importAnalysisPlugin 把裸模块名改成预构建路径 | ⭐⭐⭐⭐ |
| 插件容器 | resolveId / load / transform 三阶段，对齐 Rollup 接口 | ⭐⭐⭐ |
| HMR 原理 | chokidar 监听 + ws 推送 + ModuleGraph 精确定位受影响模块 | ⭐⭐⭐⭐⭐ |
| create-vite 原理 | npm create = npm init = 执行 create-X 包的 bin | ⭐⭐⭐ |
| Vite build 优化 | terser + gzip + visualizer + legacy + manualChunks | ⭐⭐⭐⭐ |
| CSS Modules | 文件名加 .module.scss，类名自动 hash 防冲突 | ⭐⭐⭐ |
| import.meta.glob | 扫描文件系统，实现约定式路由 | ⭐⭐⭐ |

---

## 📝 留个问题

Vite 开发时用原生 ESM，生产时用 Rollup 打包——为什么不直接在生产环境也用原生 ESM？浏览器不是已经支持了吗？

欢迎在评论区聊聊你的理解，也可以说说你们项目里用 Vite 踩过哪些坑。

---

> 🔖 这是「前端工程化系列」第 6 篇。上一篇：《Webpack 5 完整指南：从配置到原理（面试收藏级）》；下一篇预告：《Rollup 完整指南：从实战配置到源码原理再到插件体系（面试收藏级）》
