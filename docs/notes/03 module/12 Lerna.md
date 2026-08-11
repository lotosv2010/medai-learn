# <font style="color:rgb(51, 51, 51);">lerna</font>
## <font style="color:rgb(51, 51, 51);">简介</font>
+ [Lerna](https://www.lernajs.cn/)<font style="color:rgb(51, 51, 51);"> 是一个管理工具，用于管理包含多个软件包（package）的 JavaScript 项目</font>
+ [Lerna](https://github.com/lerna/lerna)<font style="color:rgb(51, 51, 51);"> 是一种工具，针对 使用 </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">git</font>`<font style="color:rgb(51, 51, 51);"> 和 </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">npm</font>`<font style="color:rgb(51, 51, 51);"> 管理多软件包代码仓库的工作流程进行优化</font>

## <font style="color:rgb(51, 51, 51);">lerna 入门</font>
+ <font style="color:rgb(51, 51, 51);">首先使用 npm 将 Lerna 安装到全局环境中</font>

```shell
pnpm add -g lerna
```

+ <font style="color:rgb(51, 51, 51);">接下来，我们将创建一个新的 git 代码仓库</font>

```shell
mkdir g-lerna && cd g-lerna
```

+ <font style="color:rgb(51, 51, 51);">现在，我们将上述仓库转变为一个 Lerna 仓库：</font>

```bash
lerna init --packages="packages/*"

lerna notice cli v8.2.2
lerna info Applying the following file system updates:
CREATE lerna.json
CREATE package.json
CREATE pnpm-workspace.yaml
lerna info Git is already initialized
lerna info Using pnpm to install packages

lerna success Initialized Lerna files
lerna info New to Lerna? Check out the docs: https://lerna.js.org/docs/getting-started
```

```yaml
|g-lerna
|--- packages  # 放置多个软件包(package);
|--- package.json
|--- lerna.json
|--- pnpm-workspace.yaml
```

```plain
# Logs
logs
*.log

# Dependency directories
node_modules/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional stylelint cache
.stylelintcache

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# Mac  OS
.DS_Store
```

# <font style="color:rgb(51, 51, 51);">lerna 源码</font>
## <font style="color:rgb(51, 51, 51);">配置安装源</font>
```shell
npm install -g yrm
npm install -g nrm
```

## <font style="color:rgb(51, 51, 51);">克隆源码</font>
```shell
git clone https://github.com/lerna/lerna.git --depth=1
```

## <font style="color:rgb(51, 51, 51);">调试源码</font>
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}\\core\\lerna\\cli.js",
      "args": ["ls"]
    }
  ]
}
```

## <font style="color:rgb(51, 51, 51);">核心包</font>
```plain
lerna 入口核心包
@lerna/cli
@lerna/create 创建包命令
@lerna/init 初始化lerna项目
```

# <font style="color:rgb(51, 51, 51);">创建 npm 私服</font>
+ [verdaccio](https://www.npmjs.com/package/verdaccio)<font style="color:rgb(51, 51, 51);">是一个简单 、零配置的本地私有化 npm 仓库</font>

```shell
pnpm add verdaccio -g
```

```shell
verdaccio # 启动一个私服
# 或 
pm2 start /Users/robin/Library/pnpm/global/5/.pnpm/verdaccio@6.1.2_encoding@0.1.13_typanion@3.14.0/node_modules/verdaccio/bin/verdaccio
# http://localhost:4873
npm adduser --registry http://localhost:4873/ # 注册一个用户
npm publish --registry http://localhost:4873/ # 发布一个包
```

# <font style="color:rgb(51, 51, 51);">创建包</font>
```shell
lerna create g-lerna --registry http://localhost:4873
# lerna success create New package lerna4 created at ./packages\lerna4
lerna create @g-lerna/cli --registry http://localhost:4873
# lerna success create New package @lerna4/cli created at ./packages\cli
lerna create @g-lerna/create --registry http://localhost:4873
# lerna success create New package @lerna4/create created at ./packages\create
lerna create @g-lerna/init --registry http://localhost:4873
# lerna success create New package @lerna4/init created at ./packages\init
```

# <font style="color:rgb(51, 51, 51);">单元测试</font>
+ [Jest](https://www.jestjs.cn/)<font style="color:rgb(51, 51, 51);">是一个 JavaScript 测试框架</font>
+ [Expect](https://www.jestjs.cn/docs/expect)

```shell
pnpm add -D jest
```

```shell
# 在所有的包下执行test命令
lerna run test
# 在g-lerna下执行test命令
lerna run test --scope g-lerna

# 在所有的包下执行shell脚本
lerna exec -- jest
# 在g-lerna下执行shell脚本
lerna exec --scope g-lerna -- jest
```

## <font style="color:rgb(51, 51, 51);">package.json</font>
```diff
{
  "name": "root",
  "private": true,
  "devDependencies": {
+    "jest": "^29.7.0",
    "lerna": "^8.2.2"
  },
+  "scripts": {
+    "install": "lerna run install",
+    "bootstrap": "lerna bootstrap",
+    "build": "lerna run build",
+    "clean": "lerna run clean",
+    "test": "lerna run test"
+  }
}

```

## <font style="color:rgb(51, 51, 51);">jest.config.js</font>
+ [Configuring Jest · Jest中文文档 | Jest中文网](https://www.jestjs.cn/docs/configuration)
+ [Expect · Jest中文文档 | Jest中文网](https://www.jestjs.cn/docs/expect)

```javascript
module.exports = {
  testMatch: ["**/__tests__/**/*.test.js"],
};
```

## <font style="color:rgb(51, 51, 51);">packages</font>
### <font style="color:rgb(51, 51, 51);">g-lerna</font>
#### <font style="color:rgb(51, 51, 51);">package.json</font>
```diff
{
+  "scripts": {
+    "test": "jest"
+  }
}
```

#### <font style="color:rgb(51, 51, 51);">g-lerna.js</font>
```javascript
'use strict';

module.exports = gLerna;

function gLerna() {
  return 'Hello from gLerna';
}
```

#### <font style="color:rgb(51, 51, 51);">g-lerna.test.js</font>
```javascript
"use strict";

const gLerna = require("..");

describe("@g-lerna/g-lerna", () => {
  it("g-lerna", () => {
    expect(gLerna()).toEqual("Hello from gLerna");
  });
});
```

### <font style="color:rgb(51, 51, 51);">cli</font>
#### <font style="color:rgb(51, 51, 51);">package.json</font>
```diff
{
+  "scripts": {
+    "test": "jest"
+  }
}
```

#### <font style="color:rgb(51, 51, 51);">g-lerna.js</font>
```javascript
'use strict';

module.exports = cli;

function cli() {
  return 'Hello from cli';
}
```

#### <font style="color:rgb(51, 51, 51);">cli.test.js</font>
```javascript
"use strict";

const cli = require("..");

describe("@g-lerna/cli", () => {
  it("cli", () => {
    expect(cli()).toEqual("Hello from cli");
  });
});
```

### <font style="color:rgb(51, 51, 51);">create</font>
#### <font style="color:rgb(51, 51, 51);">package.json</font>
```diff
{
+  "scripts": {
+    "test": "jest"
+  }
}
```

#### <font style="color:rgb(51, 51, 51);">create.js</font>
```javascript
'use strict';

module.exports = create;

function create() {
  return 'Hello from create';
}
```

#### <font style="color:rgb(51, 51, 51);">g-lerna.test.js</font>
```javascript
"use strict";

const create = require("..");

describe("@g-lerna/create", () => {
  it("create", () => {
    expect(create()).toEqual("Hello from create");
  });
});
```

### <font style="color:rgb(51, 51, 51);">init</font>
#### <font style="color:rgb(51, 51, 51);">package.json</font>
```diff
{
+  "scripts": {
+    "test": "jest"
+  }
}
```

#### <font style="color:rgb(51, 51, 51);">inita.js</font>
```javascript
'use strict';

module.exports = init;

function init() {
  return 'Hello from init';
}
```

#### <font style="color:rgb(51, 51, 51);">init.test.js</font>
```javascript
"use strict";

const init = require("..");

describe("@g-lerna/init", () => {
  it("init", () => {
    expect(init()).toEqual("Hello from init");
  });
});
```

# <font style="color:rgb(51, 51, 51);">eslint</font>
+ [eslint](https://www.npmjs.com/package/eslint)<font style="color:rgb(51, 51, 51);">是一个插件化并且可配置的 JavaScript 语法规则和代码风格的检查工具</font>
+ <font style="color:rgb(51, 51, 51);">代码质量问题：使用方式有可能有问题</font>
+ <font style="color:rgb(51, 51, 51);">代码风格问题：风格不符合一定规则</font>
+ [ESLint - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

```shell
pnpm add eslint globals @eslint/js-D
```

## <font style="color:rgb(51, 51, 51);">eslint.config.js</font>
```javascript
const { defineConfig, globalIgnores } = require("eslint/config");
const globals = require("globals");
const js = require("@eslint/js");

module.exports = defineConfig([
  globalIgnores([
    "node_modules",
    "dist",
    "coverage",
    "**/__tests__/**",
    "eslint.config.js",
    "jest.config.js"
  ]),
	{ files: ["**/*.js"], languageOptions: { globals: { ...globals.node, ...globals.es2021, ...globals.browser }  } },
	{ files: ["**/*.js"], plugins: { js }, extends: ["js/recommended"] },
]);
```

## <font style="color:rgb(51, 51, 51);">package.json</font>
```diff
{
  "name": "root",
  "private": true,
  "devDependencies": {
    "@eslint/js": "^9.28.0",
    "eslint": "^9.28.0",
    "globals": "^16.2.0",
    "jest": "^29.7.0",
    "lerna": "^8.2.2"
  },
  "scripts": {
    "install": "lerna run install",
    "bootstrap": "lerna bootstrap",
    "build": "lerna run build",
    "clean": "lerna run clean",
+    "lint": "lerna run lint",
    "test": "lerna run test"
  }
}
```

## <font style="color:rgb(51, 51, 51);">packages</font>
### <font style="color:rgb(51, 51, 51);">g-lerna</font>
#### <font style="color:rgb(51, 51, 51);">package.json</font>
```diff
"scripts": {
  "test": "jest",
+  "lint":"eslint --ext .js lib/**/*.js --no-error-on-unmatched-pattern --fix"
},
```

### <font style="color:rgb(51, 51, 51);">cli</font>
#### <font style="color:rgb(51, 51, 51);">package.json</font>
```diff
"scripts": {
  "test": "jest",
+  "lint":"eslint --ext .js lib/**/*.js --no-error-on-unmatched-pattern --fix"
},
```

### <font style="color:rgb(51, 51, 51);">create</font>
#### <font style="color:rgb(51, 51, 51);">package.json</font>
```diff
"scripts": {
  "test": "jest",
+  "lint":"eslint --ext .js lib/**/*.js --no-error-on-unmatched-pattern --fix"
},
```

### <font style="color:rgb(51, 51, 51);">init</font>
#### <font style="color:rgb(51, 51, 51);">package.json</font>
```diff
"scripts": {
  "test": "jest",
+  "lint":"eslint --ext .js lib/**/*.js --no-error-on-unmatched-pattern --fix"
},
```

# <font style="color:rgb(51, 51, 51);">Prettier</font>
+ <font style="color:#DF2A3F;">ESLint 主要解决的是代码质量问题</font>
+ <font style="color:#DF2A3F;">Prettier 主要解决的是代码风格问题</font>
+ <font style="color:rgb(51, 51, 51);">Prettier 会去掉你代码里的所有样式风格，然后用统一固定的格式重新输出</font>
+ [Prettier](https://prettier.io/)<font style="color:rgb(51, 51, 51);">声称自己是一个有主见的代码格式化工具</font>
+ [Prettier vs. Linters](https://prettier.io/docs/en/comparison.html)
+ [Integrating with Linters](https://prettier.io/docs/en/integrating-with-linters.html)
+ <font style="color:rgb(51, 51, 51);">Prettier 对应的是各种 Linters 的 Formatting rules 这一类规则</font>
+ <font style="color:rgb(51, 51, 51);">禁用 Linters 自己的 Formatting rules，让 Prettier 接管这些职责</font>
+ [GitHub - eslint-config-prettier](https://github.com/prettier/eslint-config-prettier)<font style="color:rgb(51, 51, 51);">用来关闭和 Prettier 冲突非必要的规则</font>
+ [GitHub - eslint-plugin-prettier](https://github.com/prettier/eslint-plugin-prettier#recommended-configuration)
+ [Prettier - Code formatter - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

```shell
pnpm add prettier eslint-plugin-prettier eslint-config-prettier -D
```

## <font style="color:rgb(51, 51, 51);">package.json</font>
```diff
{
  "name": "root",
  "private": true,
  "devDependencies": {
    "@eslint/js": "^9.28.0",
    "eslint": "^9.28.0",
    "eslint-config-prettier": "^10.1.5",
    "eslint-plugin-prettier": "^5.4.1",
    "globals": "^16.2.0",
    "jest": "^29.7.0",
    "lerna": "^8.2.2",
    "prettier": "^3.5.3"
  },
  "scripts": {
    "install": "lerna run install",
    "bootstrap": "lerna bootstrap",
    "build": "lerna run build",
    "clean": "lerna run clean",
    "lint": "lerna run lint",
+    "prettier": "lerna run prettier",
    "test": "lerna run test"
  }
}

```

## eslint.config.js
```diff
const { defineConfig, globalIgnores } = require("eslint/config");
const globals = require("globals");
const js = require("@eslint/js");
+ const prettier = require("eslint-plugin-prettier");

module.exports = defineConfig([
  globalIgnores([
    "node_modules",
    "dist",
    "coverage",
    "**/__tests__/**",
    "eslint.config.js",
    "jest.config.js",
+    "prettier.config.js",
  ]),
	{ files: ["**/*.js"], languageOptions: { globals: { ...globals.node, ...globals.es2021, ...globals.browser }  } },
+	{ files: ["**/*.js"], plugins: { js, prettier }, extends: ["js/recommended"], rules: { "prettier/prettier": "error" } },
]);

```

## prettier.config.js
```javascript
module.exports = {
  singleQuote: true,
};
```

## .prettierignore
```yaml
**/*.html
**/node_modules
**/dist
**/coverage

packages/**/node_modules
packages/**/dist
packages/**/coverage
packages/**/__tests__
```

## <font style="color:rgb(51, 51, 51);">packages</font>
### <font style="color:rgb(51, 51, 51);">g-lerna</font>
#### <font style="color:rgb(51, 51, 51);">package.json</font>
```diff
"scripts": {
  "test": "jest",
  "lint":"eslint --ext .js lib/**/*.js --no-error-on-unmatched-pattern --fix",
+  "prettier":"prettier --write \"**/*.{js,md}\" --ignore-path ../../.prettierignore"
},
```

### <font style="color:rgb(51, 51, 51);">cli</font>
#### <font style="color:rgb(51, 51, 51);">package.json</font>
```diff
"scripts": {
  "test": "jest",
  "lint":"eslint --ext .js lib/**/*.js --no-error-on-unmatched-pattern --fix",
+  "prettier":"prettier --write \"**/*.{js,md}\" --ignore-path ../../.prettierignore"
},
```

### <font style="color:rgb(51, 51, 51);">create</font>
#### <font style="color:rgb(51, 51, 51);">package.json</font>
```diff
"scripts": {
  "test": "jest",
  "lint":"eslint --ext .js lib/**/*.js --no-error-on-unmatched-pattern --fix",
+  "prettier":"prettier --write \"**/*.{js,md}\" --ignore-path ../../.prettierignore"
},
```

### <font style="color:rgb(51, 51, 51);">init</font>
#### <font style="color:rgb(51, 51, 51);">package.json</font>
```diff
"scripts": {
  "test": "jest",
  "lint":"eslint --ext .js lib/**/*.js --no-error-on-unmatched-pattern --fix",
+  "prettier":"prettier --write \"**/*.{js,md}\" --ignore-path ../../.prettierignore"
},
```

# <font style="color:rgb(51, 51, 51);">editorconfig</font>
+ [EditorConfig](https://editorconfig.org/)<font style="color:rgb(51, 51, 51);"> 帮助开发人员在不同的编辑器和 IDE 之间定义和维护一致的编码样式</font>
+ <font style="color:rgb(51, 51, 51);">不同的开发人员，不同的编辑器，有不同的编码风格，而 EditorConfig 就是用来协同团队开发人员之间的代码的风格及样式规范化的一个工具，而.editorconfig 正是它的默认配置文件</font>
+ [EditorConfig for VS Code - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)
+ <font style="color:rgb(51, 51, 51);">vscode 这类编辑器，需要自行安装 editorconfig 插件</font>

## <font style="color:rgb(51, 51, 51);">.editorconfig</font>
+ <font style="color:rgb(51, 51, 51);">Unix 系统里，每行结尾只有换行,即</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">\n</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">LF(Line Feed)</font>
+ <font style="color:rgb(51, 51, 51);">Windows 系统里面，每行结尾是</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">换行 回车</font>`<font style="color:rgb(51, 51, 51);">，即</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">\r\n</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">CR/LF</font>
+ <font style="color:rgb(51, 51, 51);">Mac 系统里，每行结尾是</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">回车</font>`<font style="color:rgb(51, 51, 51);">，即</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">\r</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">CR(Carriage Return)</font>

```yaml
root = true # 表示当前文件为根配置文件

[*] # 表示所有文件都适用
indent_style = space # 缩进风格
indent_size = 2 #  缩进大小
end_of_line = lf # 换行符
charset = utf-8 # 字符集
trim_trailing_whitespace = true # 去除行尾空白

[*.md] # 表示所有.md文件
trim_trailing_whitespace = false # 去除行尾空白
```

## <font style="color:rgb(51, 51, 51);">总结</font>
+ <font style="color:rgb(51, 51, 51);">开发过程中，如果写出代码质量有问题的代码，eslint 能够及时提醒开发者，便于及时修复</font>
+ <font style="color:rgb(51, 51, 51);">如果写出代码格式有问题的代码，prettier 能够自动按照我们制定的规范、格式化代码</font>
+ <font style="color:rgb(51, 51, 51);">不同开发者如果使用不同的编辑器(webstorm/vscode)或系统(windows/mac),能够执行统一的代码风格标准</font>

# <font style="color:rgb(51, 51, 51);">git hook</font>
+ [快速开始 | Husky](https://typicode.github.io/husky/zh/get-started.html)

## <font style="color:rgb(51, 51, 51);">pre-commit</font>
+ <font style="color:rgb(51, 51, 51);">可以在</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">git commit</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">之前检查代码，保证所有提交到版本库中的代码都是符合规范的</font>
+ <font style="color:rgb(51, 51, 51);">可以在</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">git push</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">之前执行单元测试,保证所有的提交的代码经过的单元测试</font>
+ [husky](https://www.npmjs.com/package/husky)<font style="color:rgb(51, 51, 51);">可以让我们向项目中方便添加 </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">git hooks</font>`
+ [lint-staged](https://www.npmjs.com/package/lint-staged)<font style="color:rgb(51, 51, 51);"> 用于实现每次提交只检查本次提交所修改的文件</font>

### <font style="color:rgb(51, 51, 51);">安装 Git hooks</font>
```shell
pnpm add -D husky 
pnpm exec husky init
```

### <font style="color:rgb(51, 51, 51);">安装 pre-commit</font>
```shell
pnpm add lint-staged -D
echo "npx lint-staged" > .husky/pre-commit
```

## <font style="color:rgb(51, 51, 51);">commit-msg</font>
+ [commitizen](https://www.npmjs.com/package/commitizen)<font style="color:rgb(51, 51, 51);">插件可帮助实现一致的提交消息</font>
+ [cz-customizable](https://www.npmjs.com/package/cz-customizable)<font style="color:rgb(51, 51, 51);">可以实现自定义的提交</font>
+ [@commitlint/cli](https://www.npmjs.com/package/@commitlint/cli)<font style="color:rgb(51, 51, 51);">可以检查提交信息</font>
+ [@commitlint/config-conventional](https://www.npmjs.com/package/@commitlint/config-conventional)<font style="color:rgb(51, 51, 51);">检查您的常规提交</font>

### <font style="color:rgb(51, 51, 51);">安装配置</font>
```shell
pnpm add commitizen cz-customizable @commitlint/cli @commitlint/config-conventional --D
```

### <font style="color:rgb(51, 51, 51);">安装 commit-msg</font>
```shell
echo "npx --no-install commitlint --edit $1" > .husky/commit-msg
```

### <font style="color:rgb(51, 51, 51);">添加命令</font>
```shell
echo "npx --no-install commitlint --edit $1" > .husky/commit-msg
```

### <font style="color:rgb(51, 51, 51);">cz-config.js</font>
```javascript
module.exports = {
  types: [
    { value: "feat", name: "feat:一个新特性" },
    { value: "fix", name: "fix:修复BUG" },
  ],
  scopes: [{ name: "sale" }, { name: "user" }, { name: "admin" }],
};
```

### <font style="color:rgb(51, 51, 51);">commitlint.config.js</font>
```javascript
module.exports = {
  extends: ["@commitlint/config-conventional"],
};
```

### <font style="color:rgb(51, 51, 51);">package.json</font>
```diff
"scripts": {
  "install": "lerna run install",
  "bootstrap": "lerna bootstrap",
  "build": "lerna run build",
  "clean": "lerna run clean",
  "lint": "lerna run lint",
  "prettier": "lerna run prettier",
  "test": "lerna run test",
+  "commit": "cz"
}
```

# <font style="color:rgb(51, 51, 51);">发布上线</font>
```shell
echo "pnpm test" > .husky/pre-push
```

```shell
lerna version
lerna publish
```

<!-- 这是一张图片，ocr 内容为：SEARCH PACKAGES LOGIN 合希0 @G-LERNA/CLI TODO: DESCRIPTION PUBLISHED A FEW SECONDS AGO V0.0.1 ISC ROBIN<LOTOSV2010@163.COM> @G-LERNA/CREATE TODO:DESCRIPTION PUBLISHED A FEW SECONDS AGO A I (() V0.1 ROBIN <LOTOSV2010@163.COM> ISC @G-LERNA/INIT TODO: DESCRIPTION PUBLISHED A FEW SECONDS AGO AJA ISC (口 V0.0.1 ROBIN <LOTOSV2010@163.COM> G-LERNA TODO:DESCRIPTION PUBLISHED A FEW SECONDS AGO ALA ISC ROBIN <LOTOSV2010@163.COM> V0.0.1 POWERED BY MADE WITH ON -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1749273766446-06e627f4-6f7e-4083-abeb-a61e0cd4c5f1.png)

# <font style="color:rgb(51, 51, 51);">yargs</font>
+ [yargs](https://www.npmjs.com/package/yargs)<font style="color:rgb(51, 51, 51);">用来解析命令行参数和选项</font>

```shell
pnpm add yargs@17 -D
```

```javascript
const yargs = require("yargs/yargs");
const argv = process.argv.slice(2);
const cli = yargs(argv);
//应用到每一个命令的全局参数
const opts = {
  loglevel: {
    defaultDescription: "info",
    describe: "报告日志的级别",
    type: "string",
    alias: "L",
  },
};
//全局的key
const globalKeys = Object.keys(opts).concat(["help", "version"]);
cli
  .options(opts) //配置全局参数
  .group(globalKeys, "Global Options:") // 把全局参数分到全局组里
  .usage("Usage: $0 <command> [options]") //提示使用说明
  .demandCommand(1, "至少需要一个命令，传递--help查看所有的命令和选项") //指定最小命令数量
  .recommendCommands() //推荐命令
  .strict() //严格命令，不正确 会报错
  .fail((msg, err) => {
    //自定义错误打印
    console.error("lerna", msg, err);
  })
  .alias("h", "help") //别名
  .alias("v", "version") //别名
  .wrap(cli.terminalWidth()) //命令行宽度
  .epilogue(
    //结语
    `当1个命令失败了，所有的日志将会写入当前工作目录中的lerna-debug.log`
  )
  .command({
    command: "create <name>",
    describe: "创建一个新的lerna管理的包",
    builder: (yargs) => {
      yargs
        .positional("name", {
          describe: "包名(包含scope)",
          type: "string",
        })
        .options({
          registry: {
            group: "Command Options:",
            describe: "配置包的发布仓库",
            type: "string",
          },
        });
    },
    handler: (argv) => {
      console.log("执行init命令", argv);
    },
  })
  .parse(argv);

/**
node lerna4.js create project --registry  http://localhost:4873
执行init命令 {
  '$0': 'lerna4.js',
  _: [ 'create' ],
  name: 'project'
  registry: 'http://localhost:4873',
}
*/
```

# <font style="color:rgb(51, 51, 51);">g-lerna实现</font>
## 初始化
### <font style="color:rgb(51, 51, 51);">g-lerna</font>
#### package.json
```diff
{
  "name": "g-lerna",
  "version": "0.0.1",
  "description": "> TODO: description",
  "author": "Robin <lotosv2010@163.com>",
  "homepage": "https://github.com/lotosv2010/g-lerna#readme",
  "license": "ISC",
  "main": "lib/g-lerna.js",
+  "bin": {
+    "g-lerna": "cli.js"
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
    "url": "git+https://github.com/lotosv2010/g-lerna.git"
  },
  "scripts": {
    "test": "jest",
    "lint": "eslint --ext .js lib/**/*.js --no-error-on-unmatched-pattern --fix",
    "prettier": "prettier --write \"**/*.{js,md}\" --ignore-path ../../.prettierignore"
  },
  "bugs": {
    "url": "https://github.com/lotosv2010/g-lerna/issues"
  },
+  "dependencies": {
+    "@g-lerna/cli": "workspace:^0.0.1",
+    "@g-lerna/create": "workspace:^0.0.1",
+    "@g-lerna/init": "workspace:^0.0.1"
  }
}
```

#### 连接内部包
```shell
# ~/Downloads/01 git/vite/g-lerna 在根目录下执行
pnpm install
```

#### <font style="color:rgb(51, 51, 51);">cli.js</font>
```javascript
#! /usr/bin/env node

require('.')(process.argv.slice(2));
```

#### lib
##### g-lerna.js
```javascript
'use strict';
const cli = require('@g-lerna/cli');
const intCmd = require('@g-lerna/init/command');
// const create = require('@g-lerna/create');

function main(argv) {
  // cli 返回的是 yargs 实例
  return cli().command(intCmd).parse(argv);
}

module.exports = main;
```

### <font style="color:rgb(51, 51, 51);">@g-lerna/cli</font>
#### lib
##### cli.js
```javascript
'use strict';
const yargs = require('yargs/yargs');

function lernaCli() {
  const cli = yargs();
  //应用到每一个命令的全局参数
  const opts = {
    loglevel: {
      defaultDescription: 'info',
      describe: '报告日志的级别',
      type: 'string',
      alias: 'L',
    },
  };
  //全局的key
  const globalKeys = Object.keys(opts).concat(['help', 'version']);
  return cli
    .options(opts) //配置全局参数
    .group(globalKeys, 'Global Options:') // 把全局参数分到全局组里
    .usage('Usage: $0 <command> [options]') //提示使用说明
    .demandCommand(1, '至少需要一个命令，传递--help查看所有的命令和选项') //指定最小命令数量
    .recommendCommands() //推荐命令
    .strict() //严格命令，不正确 会报错
    .fail((msg, err) => {
      //自定义错误打印
      console.error('lerna', msg, err);
    })
    .alias('h', 'help') //别名
    .alias('v', 'version') //别名
    .wrap(cli.terminalWidth()) //命令行宽度
    .epilogue(
      //结语
      `When a command fails, all logs are written to lerna-debug.log in the current working directory.`,
    );
}

module.exports = lernaCli;
```

### @g-lerna/init
#### command.js
```javascript
exports.command = 'init';
exports.describe = '创建一个新的Lerna仓库';
exports.builder = (yargs) => {
  console.log('执行init builder', yargs);
};
exports.handler = (argv) => {
  console.log('执行init命令', argv);
};
```

### 测试
```shell
cd packages//g-lerna
pnpm link -g

g-lerna -v
# 0.0.1
```

## <font style="color:rgb(51, 51, 51);">实现 init 命令</font>
### <font style="color:rgb(51, 51, 51);">安装依赖</font>
```shell
pnpm add fs-extra execa@5.1.1 --filter @g-lerna/init
pnpm add chalk@4 -D
```

### @g-lerna/init
#### package.json
```diff
{
  "name": "@g-lerna/init",
  "version": "0.0.1",
  "description": "> TODO: description",
  "author": "Robin <lotosv2010@163.com>",
  "homepage": "https://github.com/lotosv2010/g-lerna#readme",
  "license": "ISC",
  "main": "lib/init.js",
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
    "url": "git+https://github.com/lotosv2010/g-lerna.git"
  },
  "scripts": {
    "test": "jest",
    "lint": "eslint --ext .js lib/**/*.js --no-error-on-unmatched-pattern --fix",
    "prettier": "prettier --write \"**/*.{js,md}\" --ignore-path ../../.prettierignore"
  },
  "bugs": {
    "url": "https://github.com/lotosv2010/g-lerna/issues"
  },
+  "dependencies": {
+    "execa": "^5.1.1",
+    "fs-extra": "^11.3.0"
+  }
}
```

#### <font style="color:rgb(51, 51, 51);">command.js</font>
```javascript
const chalk = require('chalk');
const config = require('./package.json');

exports.command = 'init';
exports.describe = '创建一个新的Lerna仓库';
exports.builder = (/*yargs*/) => {
  console.log(
    `${chalk.bgBlack('lerna')} ${chalk.blueBright('notice')} ${chalk.magentaBright('cli')} v${config.version}`,
  );
};
exports.handler = (argv) => {
  console.log(
    `${chalk.bgBlack('lerna')} ${chalk.greenBright('info')} Applying the following file system updates:`,
  );
  return require('.')(argv);
};

```

#### <font style="color:rgb(51, 51, 51);">lib</font>
##### <font style="color:rgb(51, 51, 51);">init.js</font>
```javascript
const path = require('path');
const fs = require('fs-extra');
const execa = require('execa');
const chalk = require('chalk');

class InitCommand {
  constructor(argv) {
    this.argv = argv;
    this.rootPath = path.resolve();
  }
  async execute() {
    await this.ensureLernaConfig();
    await this.ensurePackageJSON();
    await this.ensurePackagesDir();
    await this.ensureGit();
    await this.ensurePnpm();
    console.log(
      `${chalk.bgBlack('lerna')} ${chalk.greenBright('success')} Initialized Lerna files`,
    );
  }
  async ensurePnpm() {
    console.log(
      `${chalk.bgBlack('lerna')} ${chalk.greenBright('info')} Using pnpm to install packages`,
    );
    await execa('pnpm', ['install'], { stdio: 'pipe' });
  }
  async ensureGit() {
    console.log(`${chalk.green('CREATE')} .gitignore`);
    await fs.outputFile(path.join(this.rootPath, '.gitignore'), '');
    console.log(
      `${chalk.bgBlack('lerna')} ${chalk.greenBright('info')} Initializing Git repository`,
    );
    await execa('git', ['init'], { stdio: 'pipe' });
  }
  async ensurePackageJSON() {
    console.log(`${chalk.greenBright('CREATE')} package.json`);
    await fs.writeJson(
      path.join(this.rootPath, 'package.json'),
      {
        name: this.rootPath.split('/').pop(),
        private: true,
        devDependencies: {
          lerna: '^4.0.0',
        },
      },
      { spaces: 2 },
    );
  }
  async ensureLernaConfig() {
    console.log(`${chalk.greenBright('CREATE')} lerna.json`);
    await fs.writeJson(
      path.join(this.rootPath, 'lerna.json'),
      {
        packages: ['packages/*'],
        version: '0.0.0',
      },
      { spaces: 2 },
    );
  }
  async ensurePackagesDir() {
    console.log(`${chalk.greenBright('CREATE')} packages directory`);
    await fs.mkdirp(path.join(this.rootPath, 'packages'));
  }
}
function factory(argv) {
  new InitCommand(argv).execute();
}
module.exports = factory;
```

### 测试
```shell
mkdir g-lerna-demo
cd g-lerna-demo
g-lerna init
```

## <font style="color:rgb(51, 51, 51);">实现 create 命令</font>
+ [pify](https://www.npmjs.com/package/pify)
+ [dedent](https://www.npmjs.com/package/dedent)
+ [init-package-json](https://www.npmjs.com/package/init-package-json)

### <font style="color:rgb(51, 51, 51);">安装依赖</font>
```shell
pnpm add pify@5 dedent init-package-json --filter @g-lerna/create
```

### <font style="color:rgb(51, 51, 51);">g-lerna</font>
#### lib
##### g-lerna.js
```diff
'use strict';
const cli = require('@g-lerna/cli');
const intCmd = require('@g-lerna/init/command');
+ const createCmd = require('@g-lerna/create/command');

function main(argv) {
  // cli 返回的是 yargs 实例
+  return cli().command(intCmd).command(createCmd).parse(argv);
}

module.exports = main;
```

### <font style="color:rgb(51, 51, 51);">@g-lerna/create</font>
#### package.json
```diff
{
  "name": "@g-lerna/create",
  "version": "0.0.1",
  "description": "> TODO: description",
  "author": "Robin <lotosv2010@163.com>",
  "homepage": "https://github.com/lotosv2010/g-lerna#readme",
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
    "url": "git+https://github.com/lotosv2010/g-lerna.git"
  },
  "scripts": {
    "test": "jest",
    "lint": "eslint --ext .js lib/**/*.js --no-error-on-unmatched-pattern --fix",
    "prettier": "prettier --write \"**/*.{js,md}\" --ignore-path ../../.prettierignore"
  },
  "bugs": {
    "url": "https://github.com/lotosv2010/g-lerna/issues"
  },
+  "dependencies": {
+    "dedent": "^1.6.0",
+    "init-package-json": "^8.2.1",
+    "pify": "^5.0.0"
+  }
}
```

#### <font style="color:rgb(51, 51, 51);">command.js</font>
```javascript
const chalk = require('chalk');
const config = require('./package.json');

exports.command = 'create <name>';
exports.describe = '创建一个新的lerna管理的包';
exports.builder = (yargs) => {
  yargs
    .positional('name', {
      describe: '包名(包含scope)',
      type: 'string',
    })
    .options({
      registry: {
        group: 'Command Options:',
        describe: '配置包的发布仓库',
        type: 'string',
      },
    })
    .fail((msg, err) => {
      if (
        msg.includes('Not enough non-option arguments') ||
        msg.includes('Missing required argument: name')
      ) {
        console.error(
          `${chalk.red.bgBlack('ERR!')} ${chalk.magentaBright('lerna')} Not enough non-option arguments: got 0, need at least 1`,
        );
      } else if (err) {
        console.error(
          `${chalk.red.bgBlack('ERR!')} ${chalk.magentaBright('lerna')} ${err.message || err}`,
        );
      } else {
        console.error(
          `${chalk.red.bgBlack('ERR!')} ${chalk.magentaBright('lerna')} ${msg}`,
        );
      }
      process.exit(1);
    });
};
exports.handler = (argv) => {
  // console.log('执行create命令', argv);
  console.log(
    `${chalk.bgBlack('lerna')} ${chalk.blueBright('notice')} ${chalk.magentaBright('cli')} v${config.version}`,
  );
  return require('.')(argv);
};
```

#### <font style="color:rgb(51, 51, 51);">lib</font>
##### <font style="color:rgb(51, 51, 51);">create.js</font>
```javascript
const path = require('path');
const fs = require('fs-extra');
const dedent = require('dedent');
const initPackageJson = require('pify')(require('init-package-json'));

class CreateCommand {
  constructor(options) {
    this.options = options;
    this.rootPath = path.resolve();
  }
  async execute() {
    const { name } = this.options;
    this.targetDir = path.join(this.rootPath, 'packages/', name);
    this.libDir = path.join(this.targetDir, 'lib');
    this.testDir = path.join(this.targetDir, '__tests__');
    this.libFileName = `${name}.js`;
    this.testFileName = `${name}.test.js`;
    await fs.mkdirp(this.libDir);
    await fs.mkdirp(this.testDir);
    await this.writeLibFile();
    await this.writeTestFile();
    await this.writeReadme();
    var initFile = path.resolve(process.env.HOME, '.npm-init');
    await initPackageJson(this.targetDir, initFile);
  }
  async writeLibFile() {
    const libContent = dedent`
        module.exports = ${this.camelName};
        function ${this.camelName}() {
            // TODO
        }
    `;
    await catFile(this.libDir, this.libFileName, libContent);
  }
  async writeTestFile() {
    const testContent = dedent`
    const ${this.camelName} = require('..');
    describe('${this.pkgName}', () => {
        it('needs tests');
    });
  `;
    await catFile(this.testDir, this.testFileName, testContent);
  }
  async writeReadme() {
    const readmeContent = dedent`## Usage`;
    await catFile(this.targetDir, 'README.md', readmeContent);
  }
}
function catFile(baseDir, fileName, content) {
  return fs.writeFile(path.join(baseDir, fileName), `${content}\n`);
}
function factory(argv) {
  new CreateCommand(argv).execute();
}

module.exports = factory;
```

### 测试
```shell
g-lerna create component
```

# <font style="color:rgb(51, 51, 51);">参考</font>
## <font style="color:rgb(51, 51, 51);">lerna 命令</font>
### <font style="color:rgb(51, 51, 51);">项目初始化</font>
| **<font style="color:rgb(51, 51, 51);">命令</font>** | **<font style="color:rgb(51, 51, 51);">说明</font>** |
| :--- | :--- |
| <font style="color:rgb(51, 51, 51);">lerna init</font> | <font style="color:rgb(51, 51, 51);">初始化项目</font> |


### <font style="color:rgb(51, 51, 51);">创建包</font>
| **<font style="color:rgb(51, 51, 51);">命令</font>** | **<font style="color:rgb(51, 51, 51);">说明</font>** |
| :--- | :--- |
| <font style="color:rgb(51, 51, 51);">lerna create</font> | <font style="color:rgb(51, 51, 51);">创建 package</font> |
| <font style="color:rgb(51, 51, 51);">lerna add</font> | <font style="color:rgb(51, 51, 51);">安装依赖</font> |
| <font style="color:rgb(51, 51, 51);">lerna link</font> | <font style="color:rgb(51, 51, 51);">链接依赖</font> |


### <font style="color:rgb(51, 51, 51);">开发和测试</font>
| **<font style="color:rgb(51, 51, 51);">命令</font>** | **<font style="color:rgb(51, 51, 51);">说明</font>** |
| :--- | :--- |
| <font style="color:rgb(51, 51, 51);">lerna exec</font> | <font style="color:rgb(51, 51, 51);">执行 shell 脚本</font> |
| <font style="color:rgb(51, 51, 51);">lerna run</font> | <font style="color:rgb(51, 51, 51);">执行 npm 命令</font> |
| <font style="color:rgb(51, 51, 51);">lerna clean</font> | <font style="color:rgb(51, 51, 51);">清空依赖</font> |
| <font style="color:rgb(51, 51, 51);">lerna bootstrap</font> | <font style="color:rgb(51, 51, 51);">重新安装依赖</font> |


### <font style="color:rgb(51, 51, 51);">发布上线</font>
| **<font style="color:rgb(51, 51, 51);">命令</font>** | **<font style="color:rgb(51, 51, 51);">说明</font>** |
| :--- | :--- |
| <font style="color:rgb(51, 51, 51);">lerna version</font> | <font style="color:rgb(51, 51, 51);">修改版本号</font> |
| <font style="color:rgb(51, 51, 51);">lerna changed</font> | <font style="color:rgb(51, 51, 51);">查看上个版本以来的所有变更</font> |
| <font style="color:rgb(51, 51, 51);">lerna diff</font> | <font style="color:rgb(51, 51, 51);">查看 diff</font> |
| <font style="color:rgb(51, 51, 51);">lerna publish</font> | <font style="color:rgb(51, 51, 51);">发布项目</font> |


# <font style="color:rgb(51, 51, 51);">格式化提交</font>
## <font style="color:rgb(51, 51, 51);">Conventional Commits</font>
+ <font style="color:rgb(51, 51, 51);">规范化的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">git commit</font>`<font style="color:rgb(51, 51, 51);">可以提高</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">git log</font>`<font style="color:rgb(51, 51, 51);">可读性，生成格式良好的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">changelog</font>`
+ [约定式提交](https://www.conventionalcommits.org/zh-hans/v1.0.0/)<font style="color:rgb(51, 51, 51);"> 是一种用于给提交信息增加人机可读含义的规范</font>
+ <font style="color:rgb(51, 51, 51);">它提供了一组简单规则来创建清晰的提交历史</font>
+ <font style="color:rgb(51, 51, 51);">通过在提交信息中描述功能、修复和破坏性变更，使这种惯例与 </font>[Semantic Versioning 2.0.0](https://semver.org/)<font style="color:rgb(51, 51, 51);"> 相互对应</font>

```plain
<类型>[可选 范围]: <描述>

[可选 正文]

[可选 脚注]
```

## <font style="color:rgb(51, 51, 51);">类型（type）</font>
+ <font style="color:rgb(51, 51, 51);">feat: 类型 为 feat 的提交表示在代码库中新增了一个功能（这和语义化版本中的 MINOR 相对应）</font>
+ <font style="color:rgb(51, 51, 51);">fix: 类型 为 fix 的提交表示在代码库中修复了一个 bug（这和语义化版本中的 PATCH 相对应）</font>
+ <font style="color:rgb(51, 51, 51);">docs: 只是更改文档</font>
+ <font style="color:rgb(51, 51, 51);">style: 不影响代码含义的变化（空白、格式化、缺少分号等）</font>
+ <font style="color:rgb(51, 51, 51);">refactor: 代码重构，既不修复错误也不添加功能</font>
+ <font style="color:rgb(51, 51, 51);">perf: 改进性能的代码更改</font>
+ <font style="color:rgb(51, 51, 51);">test: 添加确实测试或更正现有的测试</font>
+ <font style="color:rgb(51, 51, 51);">build: 影响构建系统或外部依赖关系的更改（示例范围：gulp、broccoli、NPM）</font>
+ <font style="color:rgb(51, 51, 51);">ci: 更改持续集成文件和脚本（示例范围：Travis、Circle、BrowserStack、SauceLabs）</font>
+ <font style="color:rgb(51, 51, 51);">chore: 其他不修改 src 或 test 文件。</font>
+ <font style="color:rgb(51, 51, 51);">revert: commit 回退</font>

## <font style="color:rgb(51, 51, 51);">范围（scope）</font>
+ <font style="color:rgb(51, 51, 51);">可以为提交类型添加一个围在圆括号内的作用域，以为其提供额外的上下文信息</font>

