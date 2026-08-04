# <font style="color:rgb(51, 51, 51);">create-vite简介</font>
+ [开始](https://cn.vitejs.dev/guide/#scaffolding-your-first-vite-project)
+ [create-vite](https://www.npmjs.com/package/create-vite)
+ [create-vite源码](https://github.com/vitejs/vite/tree/main/packages/create-vite)

## <font style="color:rgb(51, 51, 51);">使用</font>
```shell
pnpm create vite
.../1978203753f-c04b                     |   +1 +
.../1978203753f-c04b                     | Progress: resolved 1, reused 0, downloaded 1, added 1, done
│
◇  Project name:
│  vite-project
│
◇  Select a framework:
│  React
│
◇  Select a variant:
│  JavaScript
│
◇  Scaffolding project in /Users/robin/Downloads/01 git/vite/g-vite/vite-project...
│
└  Done. Now run:

  cd vite-project
  pnpm install
  pnpm run dev
```

## <font style="color:rgb(51, 51, 51);">create-vite源码调试</font>
+ [<font style="color:rgb(51, 122, 183);">minimist</font>](https://www.npmjs.com/package/minimist)<font style="color:rgb(51, 51, 51);">解析参数选项,类似的还有</font>[<font style="color:rgb(51, 122, 183);">yargs</font>](https://www.npmjs.com/package/yargs)<font style="color:rgb(51, 51, 51);">和</font>[<font style="color:rgb(51, 122, 183);">commander</font>](https://www.npmjs.com/package/commander)
+ [<font style="color:rgb(51, 122, 183);">kolorist</font>](https://www.npmjs.com/package/kolorist)<font style="color:rgb(51, 51, 51);">在控制台打印颜色,类似的还有</font>[<font style="color:rgb(51, 122, 183);">chalk</font>](https://www.npmjs.com/package/chalk)
+ [<font style="color:rgb(51, 122, 183);">prompts</font>](https://www.npmjs.com/package/prompts)<font style="color:rgb(51, 51, 51);">交互式命令行，类似还有</font>[<font style="color:rgb(51, 122, 183);">inquirer</font>](https://www.npmjs.com/package/inquirer)

```shell
git clone https://github.com/vitejs/vite.git
cd vite
yarn install
packages\create-vite\index.js
```

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "pwa-node",
      "request": "launch",
      "name": "Launch Program",
      "skipFiles": [
        "<node_internals>/**"
      ],
      "program": "${workspaceFolder}\\packages\\create-vite\\index.js",
      "args": ["create","vite-project"]
    }
  ]
}
```

## <font style="color:rgb(51, 51, 51);">create-vite功能</font>
+ <font style="color:rgb(51, 51, 51);">[√] 支持参数解析</font>
+ <font style="color:rgb(51, 51, 51);">[√] 支持自定义项目名</font>
+ <font style="color:rgb(51, 51, 51);">[√] 支持空目录检查</font>
+ <font style="color:rgb(51, 51, 51);">[√] 支持静态项目模板</font>
+ <font style="color:rgb(51, 51, 51);">[×] 不支持lerna</font><font style="color:rgb(51, 51, 51);"> </font>[<font style="color:rgb(51, 122, 183);">lerna</font>](https://github.com/lerna/lerna)
+ <font style="color:rgb(51, 51, 51);">[×] 不支持文件异步写入</font><font style="color:rgb(51, 51, 51);"> </font>[<font style="color:rgb(51, 122, 183);">create-react-app</font>](https://github.com/facebook/create-react-app)
+ <font style="color:rgb(51, 51, 51);">[×] 不支持多进程执行命令</font><font style="color:rgb(51, 51, 51);"> </font>[<font style="color:rgb(51, 122, 183);">create-react-app</font>](https://github.com/facebook/create-react-app)
+ <font style="color:rgb(51, 51, 51);">[×] 不支持执行动态</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">node</font>`<font style="color:rgb(51, 51, 51);">命令</font><font style="color:rgb(51, 51, 51);"> </font>[<font style="color:rgb(51, 122, 183);">create-react-app</font>](https://github.com/facebook/create-react-app)
+ <font style="color:rgb(51, 51, 51);">[×] 不支持自动安装依赖</font><font style="color:rgb(51, 51, 51);"> </font>[<font style="color:rgb(51, 122, 183);">create-react-app</font>](https://github.com/facebook/create-react-app)
+ <font style="color:rgb(51, 51, 51);">[×] 不支持自动启动服务</font><font style="color:rgb(51, 51, 51);"> </font>[<font style="color:rgb(51, 122, 183);">create-react-app</font>](https://github.com/facebook/create-react-app)
+ <font style="color:rgb(51, 51, 51);">[×] 不支持参数配置</font><font style="color:rgb(51, 51, 51);"> </font>[<font style="color:rgb(51, 122, 183);">yarn</font>](https://github.com/yarnpkg/yarn)
+ <font style="color:rgb(51, 51, 51);">[×] 不支持</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">gitub</font>`<font style="color:rgb(51, 51, 51);">和</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">gitee</font>`<font style="color:rgb(51, 51, 51);">仓库动态读取</font>
+ <font style="color:rgb(51, 51, 51);">[×] 不支持模板标签选择</font>
+ <font style="color:rgb(51, 51, 51);">[×] 不支持动态模板渲染</font>
+ <font style="color:rgb(51, 51, 51);">[×] 不支持插件化配置技术栈 </font>[<font style="color:rgb(51, 122, 183);">vue-cli</font>](https://github.com/vuejs/vue-cli)

# <font style="color:rgb(51, 51, 51);">初始化项目</font>
## <font style="color:rgb(51, 51, 51);">lerna初始化</font>
```shell
cd g-vite
lerna init --packages="packages/*"
```

## <font style="color:rgb(51, 51, 51);">lerna.json</font>
```json
{
  "$schema": "node_modules/lerna/schemas/lerna-schema.json",
  "version": "2.0.1",
  "packages": [
    "packages/*"
  ],
  "npmClient": "pnpm"
}
```

## <font style="color:rgb(51, 51, 51);">package.json</font>
```json
{
  "name": "root",
  "private": true,
  "dependencies": {},
  "devDependencies": {
    "lerna": "^8.2.2"
  }
}
```

## pnpm-workspace.yaml
```yaml
packages:
  - 'packages/*'
```

## 目录结构
```yaml
|g-vite
|--- packages  # 放置多个软件包(package);
|--- package.json
|--- lerna.json
|--- pnpm-workspace.yaml
```

# <font style="color:rgb(51, 51, 51);">创建子包</font>
```shell
lerna create @g-vite/config --registry http://localhost:4873     # 配置项
lerna create @g-vite/create --registry http://localhost:4873     # 创建项目
lerna create gvite --registry http://localhost:4873              # 核心命令
lerna create @g-vite/settings --registry http://localhost:4873   # 常量定义
lerna create @g-vite/utils --registry http://localhost:4873      # 工具方法
```

# <font style="color:rgb(51, 51, 51);">实现命令行</font>
## packages
### gvite
#### package.json
```diff
{
  "name": "gvite",
  "version": "2.0.1",
  "description": "> TODO: description",
  "author": "Robin <lotosv2010@163.com>",
  "homepage": "https://github.com/lotosv2010/g-vite#readme",
  "license": "ISC",
  "main": "lib/gvite.js",
+  "bin": {
+    "create-gvite": "bin/gvite.js",
+    "gva": "bin/gvite.js"
+  },
  "directories": {
    "lib": "lib",
    "test": "__tests__"
  },
  "files": [
    "lib"
  ],
  "publishConfig": {
    "registry": "http://localhost:4873"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/lotosv2010/g-vite.git"
  },
  "scripts": {
    "test": "node ./__tests__/gvite.test.js"
  },
  "bugs": {
    "url": "https://github.com/lotosv2010/g-vite/issues"
  }
}
```

#### bin
##### gvite.js
```javascript
#!/usr/bin/env node

require('../lib/gvite')
```

#### lib
##### gvite.js
```javascript
async function main() {
  let argv = process.argv.slice(2);
  console.log(argv);
}

main().catch((err) => {
  console.error(err);
});
```

## 测试
```shell
cd packages/gvite
pnpm link -g
create-gvite create demo
# 或
gva create demo
# [ 'create', 'demo' ]
```

# <font style="color:rgb(51, 51, 51);">实现配置命令</font>
## 安装依赖
```shell
pnpm add @g-vite/settings --workspace --filter @g-vite/utils
pnpm add @g-vite/settings @g-vite/utils --workspace --filter @g-vite/config
pnpm add @g-vite/config --workspace --filter gvite

pnpm add userhome fs-extra cross-spawn chalk@4 signale --filter @g-vite/utils
pnpm add userhome fs-extra --filter @g-vite/config
pnpm add yargs@17 --filter gvite
```

## gvite
### package.json
```diff
{
  "name": "gvite",
  "version": "2.0.1",
  "description": "> TODO: description",
  "author": "Robin <lotosv2010@163.com>",
  "homepage": "https://github.com/lotosv2010/g-vite#readme",
  "license": "ISC",
  "main": "lib/gvite.js",
  "bin": {
    "create-gvite": "bin/gvite.js",
    "gva": "bin/gvite.js"
  },
  "directories": {
    "lib": "lib",
    "test": "__tests__"
  },
  "files": [
    "lib"
  ],
  "publishConfig": {
    "registry": "http://localhost:4873"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/lotosv2010/g-vite.git"
  },
  "scripts": {
    "test": "node ./__tests__/gvite.test.js"
  },
  "bugs": {
    "url": "https://github.com/lotosv2010/g-vite/issues"
  },
+  "dependencies": {
+    "@g-vite/config": "workspace:^",
+    "yargs": "^17.7.2"
+  }
}
```

### lib
#### gvite.js
```diff
+ const yargs = require("yargs");
+ const { hideBin } = require("yargs/helpers");
+ const configCmd = require("@g-vite/config/lib/command");

async function main() {
+  const cli = yargs(hideBin(process.argv));
+  cli
+    .scriptName("create-gvite")
+    .usage(`Usage: create-gvite|gva <command> [options]`)
+    .demandCommand(1, "至少需要一个命令")
+    .strict()
+    .recommendCommands()
+    .command(configCmd)
+    .help()
+    .alias("help", "h")
+    .version()
+    .alias("version", "v")
+    .parse();
}

main().catch((err) => {
  console.error(err);
});

```

## @g-vite/config
### package.json
```json
{
  "name": "@g-vite/config",
  "version": "2.0.1",
  "description": "> TODO: description",
  "author": "Robin <lotosv2010@163.com>",
  "homepage": "https://github.com/lotosv2010/g-vite#readme",
  "license": "ISC",
  "main": "lib/config.js",
  "directories": {
    "lib": "lib",
    "test": "__tests__"
  },
  "files": [
    "lib"
  ],
  "publishConfig": {
    "registry": "http://localhost:4873"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/lotosv2010/g-vite.git"
  },
  "scripts": {
    "test": "node ./__tests__/@g-vite/config.test.js"
  },
  "bugs": {
    "url": "https://github.com/lotosv2010/g-vite/issues"
  },
  "dependencies": {
    "@g-vite/settings": "workspace:^",
    "@g-vite/utils": "workspace:^",
    "fs-extra": "^11.3.0",
    "userhome": "^1.0.1"
  }

```

### lib
#### config.js
```javascript
const fs = require("fs-extra");
const { log, config } = require("@g-vite/utils");
const chalk = require("chalk");

async function factory(argv) {
  const { key, value } = argv;
  if (key && value) {
    config[key] = value;
    await fs.writeJSON(config.configPath, config, { spaces: 2 });
    log.info(
      `${chalk.greenBright("create-gvite")} ${chalk.magentaBright(
        "(%s=%s)"
      )} 配置成功保存至 ${chalk.greenBright("%s")}`,
      key,
      value,
      config.configPath
    );
  } else if (key) {
    log.info(chalk.magentaBright("%s=%s"), key, config[key]);
  } else {
    log.info(chalk.magentaBright(JSON.stringify(config)));
  }
}
module.exports = factory;
```

#### command.js
```javascript
const { executeNodeScript } = require("@g-vite/utils");
const { COMMAND_SOURCE } = require("@g-vite/settings");

const command = {
  command: "config [key] [value]",
  describe: "设置或查看配置项,比如GIT_TYPE设置仓库类型，ORG_NAME设置组织名",
  builder: (yargs) => {},
  handler: async function (argv) {
    await executeNodeScript({ cwd: __dirname }, COMMAND_SOURCE, argv);
  },
};
module.exports = command;
```

## @g-vite/settings
### package.json
```json
{
  "name": "@g-vite/settings",
  "version": "2.0.1",
  "description": "> TODO: description",
  "author": "Robin <lotosv2010@163.com>",
  "homepage": "https://github.com/lotosv2010/g-vite#readme",
  "license": "ISC",
  "main": "lib/settings.js",
  "directories": {
    "lib": "lib",
    "test": "__tests__"
  },
  "files": [
    "lib"
  ],
  "publishConfig": {
    "registry": "http://localhost:4873"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/lotosv2010/g-vite.git"
  },
  "scripts": {
    "test": "node ./__tests__/@g-vite/settings.test.js"
  },
  "bugs": {
    "url": "https://github.com/lotosv2010/g-vite/issues"
  }
}
```

### lib
#### settings.js
```javascript
// 执行命令的源代码
exports.COMMAND_SOURCE = `
const args = JSON.parse(process.argv[1]);
console.log(args);
const factory = require('./config');
factory(args);
`;

// 配置文件名
exports.RC_NAME = ".gviterc";
```

## @g-vite/utils
### package.json
```json
{
  "name": "@g-vite/utils",
  "version": "2.0.1",
  "description": "> TODO: description",
  "author": "Robin <lotosv2010@163.com>",
  "homepage": "https://github.com/lotosv2010/g-vite#readme",
  "license": "ISC",
  "main": "lib/utils.js",
  "directories": {
    "lib": "lib",
    "test": "__tests__"
  },
  "files": [
    "lib"
  ],
  "publishConfig": {
    "registry": "http://localhost:4873"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/lotosv2010/g-vite.git"
  },
  "scripts": {
    "test": "node ./__tests__/@g-vite/utils.test.js"
  },
  "bugs": {
    "url": "https://github.com/lotosv2010/g-vite/issues"
  },
  "dependencies": {
    "@g-vite/settings": "workspace:^",
    "chalk": "4",
    "cross-spawn": "^7.0.6",
    "fs-extra": "^11.3.0",
    "signale": "^1.4.0",
    "userhome": "^1.0.1"
  }
}
```

### lib
#### utils.js
```javascript
exports.log = require("./log");
exports.executeNodeScript = require("./executeNodeScript");
exports.config = require("./config");
```

#### log.js
```javascript
const { Signale } = require("signale");
const signale = new Signale();

module.exports = signale;
```

#### executeNodeScript.js
```javascript
const spawn = require("cross-spawn");

async function executeNodeScript({ cwd }, source, args) {
  return new Promise((resolve) => {
    const childProcess = spawn(
      process.execPath,
      ["-e", source, "--", JSON.stringify(args)],
      { cwd, stdio: "inherit" }
    );
    childProcess.on("close", resolve);
  });
}

module.exports = executeNodeScript;
```

#### config.js
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

## @g-vite/create
### package.json
```json
{
  "name": "@g-vite/create",
  "version": "2.0.1",
  "description": "> TODO: description",
  "author": "Robin <lotosv2010@163.com>",
  "homepage": "https://github.com/lotosv2010/g-vite#readme",
  "license": "ISC",
  "main": "lib/create.js",
  "directories": {
    "lib": "lib",
    "test": "__tests__"
  },
  "files": [
    "lib"
  ],
  "publishConfig": {
    "registry": "http://localhost:4873"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/lotosv2010/g-vite.git"
  },
  "scripts": {
    "test": "node ./__tests__/@g-vite/create.test.js"
  },
  "bugs": {
    "url": "https://github.com/lotosv2010/g-vite/issues"
  }
}
```

### lib
```javascript
'use strict';

module.exports = create;

function create() {
  return 'Hello from create';
}
```

# <font style="color:rgb(51, 51, 51);">实现创建命令</font>
## 安装依赖
```shell
pnpm add @g-vite/settings @g-vite/utils --workspace --filter @g-vite/create
pnpm add @g-vite/create --workspace --filter gvite
```

## gvite
### package.json
```diff
{
  "name": "gvite",
  "version": "2.0.1",
  "description": "> TODO: description",
  "author": "Robin <lotosv2010@163.com>",
  "homepage": "https://github.com/lotosv2010/g-vite#readme",
  "license": "ISC",
  "main": "lib/gvite.js",
  "bin": {
    "create-gvite": "bin/gvite.js",
    "gva": "bin/gvite.js"
  },
  "directories": {
    "lib": "lib",
    "test": "__tests__"
  },
  "files": [
    "lib"
  ],
  "publishConfig": {
    "registry": "http://localhost:4873"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/lotosv2010/g-vite.git"
  },
  "scripts": {
    "test": "node ./__tests__/gvite.test.js"
  },
  "bugs": {
    "url": "https://github.com/lotosv2010/g-vite/issues"
  },
  "dependencies": {
    "@g-vite/config": "workspace:^",
+    "@g-vite/create": "workspace:^",
    "yargs": "^17.7.2"
  }
}
```

### lib
#### gvite.js
```diff
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const configCmd = require("@g-vite/config/lib/command");
+ const createCmd = require("@g-vite/create/lib/command");

async function main() {
  const cli = yargs(hideBin(process.argv));
  cli
    .scriptName("create-gvite")
    .usage(`Usage: create-gvite|gva <command> [options]`)
    .demandCommand(1, "至少需要一个命令")
    .strict()
    .recommendCommands()
    .command(configCmd)
+    .command(createCmd)
    .help()
    .alias("help", "h")
    .version()
    .alias("version", "v")
    .parse();
}

main().catch((err) => {
  console.error(err);
});
```

## @g-vite/create
### package.json
```diff
{
  "name": "@g-vite/create",
  "version": "2.0.1",
  "description": "> TODO: description",
  "author": "Robin <lotosv2010@163.com>",
  "homepage": "https://github.com/lotosv2010/g-vite#readme",
  "license": "ISC",
  "main": "lib/create.js",
  "directories": {
    "lib": "lib",
    "test": "__tests__"
  },
  "files": [
    "lib"
  ],
  "publishConfig": {
    "registry": "http://localhost:4873"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/lotosv2010/g-vite.git"
  },
  "scripts": {
    "test": "node ./__tests__/@g-vite/create.test.js"
  },
  "bugs": {
    "url": "https://github.com/lotosv2010/g-vite/issues"
  },
  "dependencies": {
+    "@g-vite/settings": "workspace:^",
+    "@g-vite/utils": "workspace:^"
  }
}
```

### lib
#### create.js
```javascript
async function factory(argv) {
  console.log("create", argv);
}
module.exports = factory;
```

#### command.js
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

## @g-vite/settings
### lib
#### settings.js
```diff
// 执行命令的源代码
+ exports.getCommandSource = (filename) => `
+ const args = JSON.parse(process.argv[1]);
+ const factory = require('./${filename}');
+ factory(args);
+ `;

// 配置文件名
exports.RC_NAME = ".gviterc";

```

## @g-vite/config
### lib
#### command.js
```diff
const { executeNodeScript } = require("@g-vite/utils");
+ const { getCommandSource } = require("@g-vite/settings");

const command = {
  command: "config [key] [value]",
  describe: "Set or view configuration items, such as GIT_TYPE to set the repository type, ORG_NAME to set the organization name",
  builder: (yargs) => {},
  handler: async function (argv) {
    // 开启子进程，执行命令
+    const COMMAND_SOURCE = getCommandSource("config");
    await executeNodeScript({ cwd: __dirname }, COMMAND_SOURCE, argv);
  },
};
module.exports = command;
```

# <font style="color:rgb(51, 51, 51);">创建项目目录</font>
## 安装依赖
```shell
pnpm add chalk@4 fs-extra @inquirer/prompts --filter @g-vite/create
```

## @g-vite/create
### package.json
```diff
{
  "name": "@g-vite/create",
  "version": "2.0.1",
  "description": "> TODO: description",
  "author": "Robin <lotosv2010@163.com>",
  "homepage": "https://github.com/lotosv2010/g-vite#readme",
  "license": "ISC",
  "main": "lib/create.js",
  "directories": {
    "lib": "lib",
    "test": "__tests__"
  },
  "files": [
    "lib"
  ],
  "publishConfig": {
    "registry": "http://localhost:4873"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/lotosv2010/g-vite.git"
  },
  "scripts": {
    "test": "node ./__tests__/@g-vite/create.test.js"
  },
  "bugs": {
    "url": "https://github.com/lotosv2010/g-vite/issues"
  },
  "dependencies": {
    "@g-vite/settings": "workspace:^",
    "@g-vite/utils": "workspace:^",
+    "@inquirer/prompts": "^7.5.3",
+    "chalk": "^4.1.2",
+    "fs-extra": "^11.3.0"
  }
}
```

### lib
#### create.js
```diff
+ const { confirm, input } = require("@inquirer/prompts");
+ const path = require("path");
+ const { redBright, greenBright, yellowBright } = require("chalk");
+ const fs = require("fs-extra");
+ const { config, log } = require("@g-vite/utils");

async function factory(argv) {
+  const { cwd, name } = argv;
+  process.chdir(cwd); // 切换为当前命令执行的工作目录
+  const { ORG_NAME } = config;
+  if (!ORG_NAME) {
+    log.error(`not set organization name!`);
+    return;
+  }
+  const projectName = await input({
+    message: `Project name:`,
+    default: name,
+    required: true,
+  });
+  const targetDir = path.join(process.cwd(), projectName);
+  log.info(
+    greenBright("create-gvite"),
+    `create project in ${yellowBright(targetDir)}`
+  );
+  try {
+    await fs.access(targetDir);
+    const files = await fs.readdir(targetDir);
+    if (files.length > 0) {
+      const answer = await confirm({
+        default: true,
+        message: `Target directory ${redBright(
+          targetDir
+        )} is not empty. Remove existing files and continue?`,
+      });
+      if (answer) {
+        await fs.emptyDir(targetDir);
+      } else {
+        log.error("action canceled");
+        return;
+      }
+    }
+  } catch (error) {
+    await fs.mkdirp(targetDir);
+    log.info(
+      greenBright("create-gvite"),
+      `${yellowBright(targetDir)} directory is ready`
+    );
+  }
}
module.exports = factory;
```

# <font style="color:rgb(51, 51, 51);">下载模板</font>
## 安装依赖
```shell
pnpm add execa --filter @g-vite/create
```

## @g-vite/create
### package.json
```diff
{
  "name": "@g-vite/create",
  "version": "3.0.1",
  "description": "> TODO: description",
  "author": "Robin <lotosv2010@163.com>",
  "homepage": "https://github.com/lotosv2010/g-vite#readme",
  "license": "ISC",
  "main": "lib/create.js",
  "directories": {
    "lib": "lib",
    "test": "__tests__"
  },
  "files": [
    "lib",
+    "template-react",
+    "template-vue",
+    "template-vue-ts",
+    "template-react-ts"
  ],
  "publishConfig": {
    "registry": "http://localhost:4873"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/lotosv2010/g-vite.git"
  },
  "scripts": {
    "test": "node ./__tests__/@g-vite/create.test.js"
  },
  "bugs": {
    "url": "https://github.com/lotosv2010/g-vite/issues"
  },
  "dependencies": {
    "@g-vite/settings": "workspace:^",
    "@g-vite/utils": "workspace:^",
    "@inquirer/prompts": "^7.5.3",
    "chalk": "^4.1.2",
+    "execa": "^9.6.0",
    "fs-extra": "^11.3.0"
  }
}
```

### lib
#### create.js
```diff
+ const { confirm, input, select } = require("@inquirer/prompts");
const path = require("path");
+ const {
+   redBright,
+   greenBright,
+   yellowBright,
+   cyanBright,
+   blueBright,
+ } = require("chalk");
const fs = require("fs-extra");
const { config, log } = require("@g-vite/utils");

+ const CANCELLED = `Operation cancelled.`;

+ const FRAMEWORKS = [
+   {
+     name: "vue",
+     color: greenBright,
+     variants: [
+       {
+         name: "vue",
+         color: yellowBright,
+         display: "Javascript",
+       },
+       {
+         name: "vue-ts",
+         color: blueBright,
+         display: "Typescript",
+       },
+     ],
+   },
+   {
+     name: "react",
+     color: cyanBright,
+     variants: [
+       {
+         name: "react",
+         color: yellowBright,
+         display: "Javascript",
+       },
+       {
+         name: "react-ts",
+         color: blueBright,
+         display: "Typescript",
+       },
+     ],
+   },
+ ];

+ process.on("uncaughtException", (error) => {
+   log.error(redBright(CANCELLED), error);
+   process.exit(1);
+ });
async function factory(argv) {
  const { cwd, name } = argv;
  process.chdir(cwd); // 切换为当前命令执行的工作目录
  // const { ORG_NAME } = config;
  // if (!ORG_NAME) {
  //   log.error(`not set organization name!`);
  //   return;
  // }
  
+  // 1.Get project name and target dir
+  const packageName = await input({
    message: `Project name:`,
    default: name,
    required: true,
  });
  const targetDir = path.join(process.cwd(), packageName);
  
+  // 2. Handle directory if exist and not empty
  try {
    await fs.access(targetDir);
    const files = await fs.readdir(targetDir);
    if (files.length > 0) {
+      const overwrite = await confirm({
        default: true,
        message: `Target directory ${redBright(
          targetDir
        )} is not empty. Remove existing files and continue?`,
      });
+      if (overwrite) {
        await fs.emptyDir(targetDir);
      } else {
+        log.error(CANCELLED);
        return;
      }
    }
  } catch (error) {
    await fs.mkdirp(targetDir);
  }
  
+  // 3.select framework and variant
+  const framework = await select({
+    message: `Select a framework:`,
+    choices: FRAMEWORKS.map(({ name, color }) => ({
+      name: color(name),
+      value: name,
+    })),
+  });

+  const variant = await select({
+    message: `Select a variant:`,
+    choices: FRAMEWORKS.filter(({ name }) => name === framework)[0][
+      "variants"
+    ].map(({ name, color, display }) => ({
+      name: color(display),
+      value: name,
+    })),
+  });

+  // 4.copy template
+  const templateDir = path.resolve(__dirname, `../template-${variant}`);
+  const files = await fs.readdir(templateDir);
+  for (const file of files.filter((file) => file !== "package.json")) {
+    await fs.copy(path.join(templateDir, file), path.join(targetDir, file));
+  }

+  // 5.modify package.json
+  const pkg = JSON.parse(
+    await fs.readFile(path.join(templateDir, "package.json"), "utf-8")
+  );
+  pkg.name = packageName;
+  await fs.writeFile(
+    path.join(targetDir, "package.json"),
+    JSON.stringify(pkg, null, 2)
+  );
+  // 6.init git
+  const { execa } = await import("execa");
+  await execa("git", ["init"], { cwd: targetDir });
+  log.info(`Scaffolding project in ${yellowBright(targetDir)}...`);
+  log.info(
+    `
+    ${greenBright("Done. Now run:")}
+    
+  ${yellowBright("cd %s")}
+  ${yellowBright("npm install")}
+  ${yellowBright("npm run dev")}
+  `,
+    packageName
+  );
}
module.exports = factory;
```

# 源码
[GitHub - lotosv2010/g-vite](https://github.com/lotosv2010/g-vite)

# 参考
[珠峰架构师成长计划](http://www.zhufengpeixun.com/strong/html/139.cli.html#t7012.4%20injectRouter.js)

[GitHub API](https://api.github.com/)

[为啥能用 npm create vite 创建项目](https://zhuanlan.zhihu.com/p/16849958248)

["npm create vite" 是怎么实现初始化 Vite 项目？](https://juejin.cn/post/7173609541483888670)

[jscodeshift](https://www.npmjs.com/package/jscodeshift)

[vue-codemod](https://www.npmjs.com/package/vue-codemod)

