# 安装pnpm
```shell
npm install pnpm -g
```

# 初始化项目
```shell
mkdir g-pinia
pnpm init
```

## 脚本配置
```json
{
  "private": true,
  "type": "module",
  "version": "1.0.0",
  "description": "pinia 源码",
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
      "@g-pinia/*": ["packages/*/src"],
      "g-pinia": ["packages/pinia/src"],
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
cd g-pinia
mkdir pinia
mkdir testing 
```

### pinia
#### 创建入口
```shell
cd pinia
mkdir src
touch index.ts
```

#### 初始化
```shell
pnpm init
```

```json
{
  "name": "g-pinia",
  "version": "1.0.0",
  "description": "",
  "module": "dist/g-pinia.esm.js",
  "unpkg": "dist/g-pinia.global.js",
  "buildOptions": {
    "name": "GPinia",
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
    "pinia"
  ],
  "author": "Robin",
  "license": "ISC",
  "packageManager": "pnpm@10.13.1"
}

```

#### 编写代码
##### index.ts
```typescript
console.log('pinia')
```

### testing
#### 创建入口
```shell
cd testing
mkdir src
touch index.ts
```

#### 初始化
```shell
pnpm init
```

```json
{
  "name": "@g-pinia/testing",
  "version": "1.0.0",
  "module": "dist/g-pinia-testing.esm.js",
  "unpkg": "dist/g-pinia-testing.global.js",
  "buildOptions": {
    "name": "GPiniaTesting",
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
    "pinia"
  ],
  "author": "Robin",
  "license": "ISC",
  "packageManager": "pnpm@10.13.1",
}
```

#### 安装依赖
```shell
pnpm add g-pinia@workspace --filter @g-pinia/testing
```

#### 编写代码
##### index.ts
```typescript
console.log('testing')
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
  "description": "pinia 源码",
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
+  },
+  "dependencies": {
+    "pinia": "^3.0.3",
+    "vue": "^3.5.18"
+  }
}

```

## 编写脚本
```shell
cd g-pinia
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
  "description": "pinia 源码",
  "type": "module",
+  "scripts": {
+    "dev": "node scripts/dev.js",
+    "preview": "http-server -d -p 9091 -o /examples"
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
    "pinia": "^3.0.3",
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
cd g-pinia
mkdir examples
cd examples
touch index.html
```

### examples
#### index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>pinia</title>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import * as test from '../packages/testing/dist/testing.esm.js'
  </script>
</body>
</html>
```

## 查看结果
```shell
pnpm dev
pnpm preview
```

# 目录结构
```shell
.
├── examples
│   └── index.html
├── LICENSE
├── node_modules
├── package.json
├── packages
│   ├── pinia
│   │   ├── dist
│   │   │   ├── pinia.cjs.js
│   │   │   ├── pinia.cjs.js.map
│   │   │   ├── pinia.esm.js
│   │   │   ├── pinia.esm.js.map
│   │   │   ├── pinia.global.js
│   │   │   └── pinia.global.js.map
│   │   ├── package.json
│   │   └── src
│   │       ├── index.ts
│   └── testing
│       ├── dist
│       ├── node_modules
│       │   └── g-pinia
│       ├── package.json
│       └── src
│           └── index.ts
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── README.md
├── scripts
│   └── dev.js
└── tsconfig.json
```

# 源码
[GitHub - lotosv2010/g-pinia: pinia source](https://github.com/lotosv2010/g-pinia)

