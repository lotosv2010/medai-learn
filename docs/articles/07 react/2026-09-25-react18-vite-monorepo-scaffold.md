# Vite + TypeScript 从零搭建 React 18 通用后台管理系统：工程化基建到 Monorepo 升级实战（生产收藏级）

> 面试官说：「给你一张白纸，从零搭建一个 React 后台管理系统，你会怎么选型？」大多数人能背出 `vite + react + ts + mobx/redux + antd` 这几个名词——追一句「别名为什么要配两遍」「Vite 的 proxy 上线之后还有用吗」「pnpm 的符号链接怎么避免幽灵依赖」，答案就开始语焉不详了。**背得出技术栈清单，不等于懂每个选型背后要解决的问题**，这才是面试官真正想听的，也是这篇要讲透的。

> 这篇文章按一套真实后台管理系统脚手架的搭建顺序——工程化规范 → Vite 配置 → 构建优化 → 样式方案 → 路由 → 状态管理 → 请求封装 → Mock/国际化 → Antd 按需引入 → 测试体系 → 目录结构 → **Monorepo 架构升级** → **自定义 Hook 插件化设计**——把每一步「为什么这样做、怎么配、面试怎么答」串成一条线。源码在 [lotosv2010/vite-react-ts](https://github.com/lotosv2010/vite-react-ts)，跟着这篇走一遍，你会对整套后台系统从单体到工程化的决策链条有一个完整认知，不再是零散的 API 记忆。

> 📌 说明：本文重点讲的是搭建思路和每个技术选型背后要解决的问题，文中代码片段都是**参考实现**，用来说明设计思路。实际搭建时的具体写法、配置项和目录细节，要以你自己项目的运行环境和各工具库的版本为准——ESLint 8 和 9、Node 版本不同，配置方式都会有差异，遇到跑不通的地方先检查版本号。

---

## 🎯 这篇文章解决什么问题

「搭建一个后台管理系统脚手架」听起来是体力活，但面试里这是**区分工程能力**的重灾区——同样是「用了 Vite」，能不能讲清楚 `resolve.alias` 和 `tsconfig.paths` 为什么要配两遍，能不能讲清楚请求层为什么要维护一个 `cancelRequestSourceList`，能不能讲清楚 Monorepo 下 Turborepo 缓存命中的判断依据，直接决定了面试官对你工程判断力的评分。

这篇文章会覆盖十四个核心决策点：Vite 选型、工程化规范（ESLint/Prettier/Stylelint/GitHooks）、Vite 配置体系（别名/环境变量/proxy）、构建优化四件套、CSS 预处理器、路由（约定式/配置式）、状态管理（Mobx）、请求层封装、Mock 与国际化、Antd 按需引入、测试体系、目录结构、**Turborepo + pnpm workspace 的 Monorepo 升级**、**`useRequest` 自定义 Hook 插件化设计**。每一个都会讲透原理，给出面试标准答案，并指出原始实践里已经过时或有问题的地方，给出现在业界的做法。

---

## 🚀 为什么是 Vite，而不是 Webpack

搭建这套脚手架之前，先明确它要达到的构建目标：

- 支持 TypeScript、React、JSX 语法、ES6 语法
- 支持 Scss Module
- 支持 Eslint、Prettier、Pre-commit hook
- 支持 HMR 快速热更新
- 支持 Antd 按需引入与主题样式覆盖
- 支持 Proxy 代理、alias 别名
- 兼容传统浏览器
- 开发启动速度要够快，以秒计算
- 支持懒加载和 chunk 分割

Vite（法语「迅速」，读作 `/vit/`）由两部分组成：一个基于原生 ES 模块的开发服务器，提供快到惊人的模块热更新（HMR）；一套预配置的构建指令，用 Rollup 打包产出优化过的生产环境静态资源。它意在提供开箱即用的配置，同时插件 API 和 JavaScript API 带来高度可扩展性，并有完整类型支持。

初始化项目本身很简单：

```shell
# npm 6.x
npm create vite@latest vite-react-ts --template react-ts

# npm 7+, extra double-dash is needed:
npm create vite@latest vite-react-ts -- --template react-ts

# yarn
yarn create vite vite-react-ts --template react-ts

# pnpm
pnpm create vite vite-react-ts -- --template react-ts
```

真正值得讲透的是背后的原理差异。Webpack 的开发服务器在启动时要先把整个应用的依赖图打包成一个（或几个）bundle，项目越大、模块越多，这个「预打包」的时间就越长——这就是为什么大型项目用 Webpack 冷启动经常要等十几秒甚至更久。Vite 反过来：开发环境下**不打包**，直接利用浏览器原生支持的 ES Module，让浏览器自己去请求每个模块文件，Vite 服务器只做「按需转译」——你访问哪个路由，才编译哪个路由用到的文件。这就是为什么 Vite 的冷启动时间几乎和项目规模无关，而 Webpack 是线性增长的。

第三方依赖是个例外：`node_modules` 里的包大多是 CommonJS 格式，且一个包可能拆成几百个内部模块，直接用原生 ESM 加载会产生大量请求瀑布。Vite 用 esbuild（Go 写的，比 JS 写的打包器快一个数量级）把这些依赖**预构建**成单文件的 ESM 格式，缓存进 `node_modules/.vite`，这一步只在依赖变化时重新触发，不影响你改业务代码时的热更新速度。

> 💬 **面试官**：Vite 为什么比 Webpack 启动快？
>
> ✅ 标准答案：Webpack 开发环境也要先打包整个依赖图才能启动服务，Vite 利用浏览器原生 ES Module，不打包业务代码，按需编译，所以启动速度基本不随项目体积增长。
> 🎁 加分答案：补充第三方依赖的预构建机制——Vite 用 esbuild 把 CommonJS 依赖预转换成 ESM 单文件并缓存，避免了裸用原生 ESM 加载 `node_modules` 时的请求瀑布问题；生产构建 Vite 底层用的是 Rollup，不是不打包，「不打包」只发生在开发环境。

🔧 **真实场景**：医院管理系统模块数上百（患者管理、处方审核、药品目录、检验报告各自独立的页面和组件），用 Webpack 时每次冷启动要等十几秒，改一行代码后热更新也要好几秒；换成 Vite 后冷启动降到 1-2 秒，HMR 基本感知不到延迟——这个体感差异，是候选人能不能讲出「工程效率」这个词背后真实价值的分水岭。

---

## 🔧 工程化基建：ESLint + Prettier + Stylelint + GitHooks

代码规范不是「团队要求」这么简单的一句话，它背后是三个工具各自守住一块边界，配合失败会互相打架。

**职责边界**：ESLint 管**代码质量**（未使用变量、潜在 bug、最佳实践），Prettier 管**代码格式**（缩进、引号、换行），Stylelint 管**样式规范**（CSS/Scss 属性顺序、选择器写法）。三者都能对同一行代码提修改意见，冲突点集中在 ESLint 的部分规则本身也管格式，这时候和 Prettier 的输出可能不一致。

安装 ESLint 及配套插件（采用 `eslint-config-alloy` 规则集）：

```shell
npm install -D @typescript-eslint/eslint-plugin
npm install -D eslint
npm install -D eslint-plugin-import
npm install -D eslint-plugin-jsx-a11y
npm install -D eslint-plugin-prettier
npm install -D @typescript-eslint/parser
npm install -D eslint-config-prettier
npm install -D eslint-plugin-react
npm install -D eslint-plugin-react-hooks
npm install -D eslint-plugin-simple-import-sort
```

配置文件 `.eslintrc.js`（和 `src` 同级新建，另配一个 `.eslintignore`）：

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    browser: true,
    amd: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:prettier/recommended', // Make sure this is always the last element in the array.
  ],
  plugins: ['simple-import-sort', 'prettier'],
  rules: {
    'prettier/prettier': ['warn', {}, { usePrettierrc: true }],
    'react/react-in-jsx-scope': 'off',
    'jsx-a11y/accessible-emoji': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    'simple-import-sort/imports': 'off',
    'simple-import-sort/exports': 'error',
    'jsx-a11y/anchor-is-valid': [
      'error',
      {
        components: ['Link'],
        specialLink: ['hrefLeft', 'hrefRight'],
        aspects: ['invalidHref', 'preferButton'],
      },
    ],
    'no-debugger': 0,
    'default-case': 1,
    'no-empty-function': 1,
    'no-multi-spaces': 1,
    'spaced-comment': ['error', 'always'],
    'no-multiple-empty-lines': ['error', { max: 1 }],
  },
};
```

```shell
node_modules
.DS_Store
dist
coverage
vite-env.d.ts
*.local
node_modules/*
```

这份配置是 `.eslintrc.js` 的传统格式（ESLint 8 及以前）。**ESLint 9 起默认要求 Flat Config**（`eslint.config.js`，用扁平数组代替 `extends` 继承链），旧格式仍能通过兼容层跑，但新项目应该直接写 Flat Config：

```javascript
// eslint.config.js（ESLint 9+ 推荐写法）
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  eslintConfigPrettier,
  {
    plugins: { 'react-hooks': pluginReactHooks },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      'no-console': 'warn',
      'no-debugger': 'warn',
    },
  },
];
```

Flat Config 用真实的模块导入替代字符串继承，配置的优先级由数组顺序显式决定，不再依赖 `extends` 隐式的继承规则解析，调试配置冲突时更直观。

**Prettier 支持**：

```shell
npm install -D prettier
```

ESLint 和 Prettier 冲突的解决方案是**以 Prettier 的样式规范为准，让 ESLint 里的样式规则自动失效**，而不是反过来让 Prettier 妥协：

```shell
# 安装插件 eslint-config-prettier
# 为 eslint 代码校验规则与 prettier 代码校验规则部分冲突提供支持
pnpm i -D eslint-config-prettier
```

`.prettierrc.js` 配置（同样和 `src` 同级）：

```javascript
module.exports = {
  // 一行最多 120 字符
  printWidth: 120,
  // 使用 2 个空格缩进
  tabWidth: 2,
  // 不使用缩进符，而使用空格
  useTabs: false,
  // 行尾需要有分号
  semi: true,
  // 使用单引号
  singleQuote: true,
  // 对象的 key 仅在必要时用引号
  quoteProps: 'as-needed',
  // jsx 不使用单引号，而使用双引号
  jsxSingleQuote: false,
  // 末尾需要有逗号
  trailingComma: 'all',
  // 大括号内的首尾需要空格
  bracketSpacing: true,
  // jsx 标签的反尖括号需要换行
  bracketSameLine: false,
  // 箭头函数，只有一个参数的时候，也需要括号
  arrowParens: 'always',
  // 每个文件格式化的范围是文件的全部内容
  rangeStart: 0,
  rangeEnd: Infinity,
  // 不需要写文件开头的 @prettier
  requirePragma: false,
  // 不需要自动在文件开头插入 @prettier
  insertPragma: false,
  // 使用默认的折行标准
  proseWrap: 'preserve',
  // 根据显示样式决定 html 要不要折行
  htmlWhitespaceSensitivity: 'css',
  // vue 文件中的 script 和 style 内不用缩进
  vueIndentScriptAndStyle: false,
  // 换行符使用 lf
  endOfLine: 'lf',
  // 格式化内嵌代码
  embeddedLanguageFormatting: 'auto',
};
```

```shell
**/*.md
**/*.svg
**/*.ejs
**/*.html
package.json
```

> 💬 **面试官**：ESLint 和 Prettier 一起用会冲突吗，怎么处理？
>
> ✅ 标准答案：两者职责不同（代码质量 vs 代码格式），但 ESLint 内置的部分风格规则和 Prettier 冲突，用 `eslint-config-prettier` 关掉 ESLint 里所有和格式相关的规则，让 Prettier 统一负责格式化，`eslint-plugin-prettier` 再把 Prettier 的格式问题作为 ESLint 的错误抛出来，统一走一个检查入口。
> 🎁 想加分：说明为什么要「以 Prettier 为准」而不是反过来——Prettier 是无配置或极少配置的格式化工具，几乎不留讨论空间，团队协作时能减少「这个空格该不该加」的无意义争论，ESLint 让位给它，能省下大量 code review 里的风格争执。

**自动检测集成到 Vite**：用 `vite-plugin-checker` 让类型检查和 ESLint 检查在开发服务器里实时运行，而不是等 commit 或 CI 才发现问题。

```shell
npm install -D vite-plugin-checker
```

```typescript
import checker from 'vite-plugin-checker';
export default function configEslint() {
  return [
    checker({
      typescript: true,
      eslint: {
        lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
      },
    }),
  ];
}
```

```typescript
import configEslint from './eslint';
export default function createVitePlugins() {
  const vitePlugins = [configEslint()];
  return vitePlugins;
}
```

**样式规范交给 Stylelint**：

```shell
npm install -D sass
npm install -D stylelint
npm install -D stylelint-config-standard
npm install -D stylelint-config-prettier
npm install -D stylelint-config-html
npm install -D stylelint-order
npm install -D stylelint-scss
npm install -D postcss-html
npm install -D postcss-scss
```

配置文件较长，核心是三部分：继承标准规则集并关闭和 Prettier 冲突的部分、启用 `stylelint-order` 统一属性书写顺序、放开框架特有的伪类白名单：

```javascript
module.exports = {
  extends: ['stylelint-config-standard', 'stylelint-config-prettier'],
  plugins: ['stylelint-order', 'stylelint-scss'],
  rules: {
    indentation: 2,
    'no-descending-specificity': null,
    'function-url-quotes': 'always',
    'string-quotes': 'double',
    'unit-case': null,
    'color-hex-case': 'lower',
    'color-hex-length': 'long',
    'block-opening-brace-space-before': 'always',
    'property-no-unknown': null,
    'no-empty-source': null,
    'selector-class-pattern': null,
    'selector-pseudo-class-no-unknown': [
      true,
      {
        ignorePseudoClasses: ['deep', 'global'],
      },
    ],
    'selector-pseudo-element-no-unknown': [
      true,
      {
        ignorePseudoElements: ['v-deep', 'v-global', 'v-slotted'],
      },
    ],
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'tailwind',
          'apply',
          'variants',
          'responsive',
          'screen',
          'function',
          'if',
          'each',
          'include',
          'mixin',
        ],
      },
    ],
    'named-grid-areas-no-invalid': null,
    'unicode-bom': 'never',
    'font-family-no-missing-generic-family-keyword': null,
    'declaration-colon-space-after': 'always-single-line',
    'declaration-colon-space-before': 'never',
    'rule-empty-line-before': [
      'always',
      {
        ignore: ['after-comment', 'first-nested'],
      },
    ],
    'unit-no-unknown': [true, { ignoreUnits: ['rpx'] }],
    'keyframes-name-pattern': null,
    'order/order': [
      [
        'dollar-variables',
        'custom-properties',
        'at-rules',
        'declarations',
        {
          type: 'at-rule',
          name: 'supports',
        },
        {
          type: 'at-rule',
          name: 'media',
        },
        'rules',
      ],
      { severity: 'warning' },
    ],
    'order/properties-order': [
      'position',
      'top',
      'right',
      'bottom',
      'left',
      'z-index',
      'display',
      'float',
      'width',
      'height',
      'padding',
      'margin',
      'overflow',
      'font',
      'font-family',
      'font-size',
      'font-style',
      'font-weight',
      'line-height',
      'color',
      'text-align',
      'text-decoration',
      'background',
      'background-color',
      'border',
      'border-radius',
      'opacity',
      'transform',
      'transition',
      'animation',
    ],
  },
  ignoreFiles: ['**/*.js', '**/*.jsx', '**/*.tsx', '**/*.ts'],
};
```

```shell
/dist/*
/public/*
public/*
```

三个工具最终落到脚本上：

```json
{
  "scripts": {
    "lint:js": "eslint --cache --ext .js,.jsx,.ts,.tsx --format=pretty ./src",
    "lint:prettier": "prettier --check \"src/**/*\" --end-of-line auto",
    "lint:style": "stylelint --fix \"**/*.{vue,less,postcss,css,scss}\" --cache --cache-location node_modules/.cache/stylelint/"
  }
}
```

**这里要指出笔记原文里的一个 JSON 语法错误**：原文写的是 `"script"`，正确的 `package.json` 字段名是 `"scripts"`（复数），漏了 s 直接复制会导致这些命令无法被 `pnpm run` 识别。

```shell
# eslint 检查
pnpm lint:js
# prettier 自动格式化
pnpm lint:prettier
```

**用 GitHooks 把规范卡在提交前**：笔记原文用的是 `yorkie`（Vue CLI 早期内置的 Husky 分支）驱动 Git Hooks，配合 lint-staged 只对**暂存区文件**（被 `git add` 的文件）做检查——这个「只检查暂存区」的设计很关键：老项目如果对全量代码做一次检查，往往会炸出成百上千条历史遗留问题，而 lint-staged 只约束你这次要提交的改动，不逼你一次性修完历史债务。

```shell
npm i -D yorkie
npm i -D lint-staged
```

```json
// 主要配置 触发pre-commit 进行elint stylelint 格式校验
{
   "lint": "npm run lint:js && npm run lint:style && npm run lint:prettier",
   "lint:js": "eslint --cache --ext .js,.jsx,.ts,.tsx --format=pretty ./src",
   "lint:prettier": "prettier --check \"**/*\" --end-of-line auto",
   "lint:style": "stylelint --fix \"src/**/*.less\" --syntax less",
   "lint-staged": "lint-staged",
   "lint-staged:js": "eslint --ext .js,.jsx,.ts,.tsx"
 },
 // 使用yorkie 来自动触发识别 gitHooks这个钩子，然后执行pre-commit 然后在执行lint-staged
 "gitHooks": {
   "pre-commit": "lint-staged"
 },
 // lint-staged 配置 校验less,ts,tsx等文件有无不规范写法
 "lint-staged": {
   "*.less": "stylelint --syntax less",
   "*.{js,jsx,ts,tsx}": "npm run lint-staged:js",
   "*.{js,jsx,tsx,ts,less,md,json}": [
     "prettier --write"
     ]
 },
```

**这里要点出一个现实问题**：`yorkie` 早在 2020 年前后就已经停止维护（它本身是 Vue CLI 团队 fork 的一个 Husky 旧版本，只是为了兼容当时的 Git Hooks 机制），新项目不应该再引入它。现在的标配是 **Husky v9**，配置比 `yorkie` 的 `package.json` 内嵌写法更清爽，也和前面 Stylelint/ESLint 章节的工具链保持同一套现代化路线：

```shell
pnpm dlx husky-init && pnpm install
```

执行后项目根目录会出现 `.husky/pre-commit` 文件，内容替换成：

```shell
npx lint-staged
```

`package.json` 里对应精简为：

```json
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": "eslint --cache --fix",
    "*.{less,scss,css}": "stylelint --fix"
  }
}
```

**这里要额外指出一层版本差异**：Husky v4 及以前是把钩子逻辑写进 `package.json` 的 `husky.hooks` 字段（类似笔记原文 `gitHooks` 字段的写法思路），Husky v7-v8 改成 `.husky/` 目录下的 shell 脚本文件配合 `"prepare": "husky install"`，到了 **Husky v9 进一步简化为 `"prepare": "husky"`**（不再需要 `install` 子命令，`.husky/_` 目录也被移除）。三种写法分属三个时代，实际项目里只能选一种，不要把 `package.json` 里的钩子字段和 `.husky/` 目录文件混着用。

> 💬 **面试官**：pre-commit 钩子里适合放什么，不适合放什么？
>
> ✅ 标准答案：适合放执行快、能自动修复的检查（lint --fix、格式化），因为每次 commit 都要跑，慢了会影响开发体验；不适合放单元测试全量执行、类型检查全量跑这类耗时操作，这些应该放到 CI 流水线里。
> 🎁 想加分：提到 lint-staged 只检查暂存区文件这个设计本身就是为了控制 pre-commit 的执行时间——只查你这次改的文件，不查全仓库，这是「本地钩子要快」和「规范要全面」之间的一个工程取舍。

🔧 **真实场景**：医院管理系统的处方审核模块由多人协作开发，没有 lint-staged 之前，PR 里经常出现「这里该用单引号还是双引号」的评论拉锯战；接入 Husky + lint-staged 后，这类风格问题在 `git commit` 阶段就被自动修复，code review 精力能完全放在业务逻辑上。

---

## ⚙️ Vite 配置体系：别名、环境变量、server、proxy

**别名配置**要解决的问题是：深层嵌套的组件引用相对路径（`../../../components/xxx`）既丑又难维护。别名要配置**两处**，因为它们服务于两个完全不同的工具：

```shell
npm i -D path @types/node
```

`vite.config.ts` 中新增 `resolve` 配置节点，用来给**编译器**识别：

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

import createVitePlugins from './config/plugins/index';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), ...createVitePlugins()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

`tsconfig.json` 中新增 `paths` 配置节点，是用来给 **TypeScript 类型检查器**识别用的：

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "allowJs": false,
    "skipLibCheck": false,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["./src"]
}
```

> 💬 **面试官**：为什么别名要配两遍，配一遍不行吗？
>
> ✅ 标准答案：Vite 的构建流程和 TypeScript 的类型检查流程是两套独立的工具链，Vite 不读 `tsconfig.json` 的 `paths` 去决定怎么打包，TypeScript 也不读 `vite.config.ts` 的 `alias` 去做类型推导，只配一处会导致「代码能跑但 IDE 报红」或者「类型检查通过但打包失败」。
> 🎁 想加分：提到一些框架（Next.js、部分 CLI 模板）会自动同步这两处配置，减少手动维护成本，但原生 Vite + React 项目需要开发者自己保证两者一致。

使用方式：

```typescript
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'mobx-react';
import App from '@/App';
import stores from '@/stores';
import '@/index.scss';

ReactDOM.render(
  <React.StrictMode>
    <Provider {...stores}>
      <App />
    </Provider>
  </React.StrictMode>,
  document.getElementById('root'),
);
```

**环境变量**：新建 `.env`、`.env.test`、`.env.staging`、`.env.production` 四个文件（和 `src` 同级），分别代表开发、测试、预发、生产四个环境。**自定义环境变量一定要是 `VITE_` 为前缀的变量才会暴露给 Vite**，比如 `VITE_APP_TITLE`：

```plain
VITE_API_HOST=/api
VITE_APP_TITLE="DEVELOPMENT APP"
```

```plain
VITE_API_HOST=http://www.youbaobao.xyz
VITE_APP_TITLE="TEST APP"
```

```plain
VITE_API_HOST=http://www.youbaobao.xyz
VITE_APP_TITLE="STAGING APP"
```

```plain
VITE_API_HOST=http://www.youbaobao.xyz
VITE_APP_TITLE="PRODUCTION APP"
```

对应脚本要显式传 `--mode`，因为默认模式只有 `production`/`development` 两种：

```json
"scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:test": "vite build --mode test",
    "build:staging": "vite build --mode staging",
    "preview": "vite preview",
  },
```

这个 `VITE_` 前缀限制不是随意设计的——它是一道**安全边界**：`.env` 里可能混着数据库连接串、内部服务密钥这类不该打进客户端 bundle 的敏感配置，Vite 默认只暴露带 `VITE_` 前缀的变量，没加前缀的变量即使写在 `.env` 里，客户端代码也访问不到，从机制上防止了敏感信息被误打包进产物。

TypeScript 类型声明让 `import.meta.env` 有类型提示：

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_APP_TITLE: 'development' | 'test' | 'staging' | 'production';
}
```

获取环境变量通过 `import.meta.env` 来获取，**并不是** `process.env`。如果要在代码中每次都通过 `import.meta.env` 来获取，写起来实在繁琐，不如封装一个工具函数，在 `src` 文件夹下新建 `utils` 文件夹，新建 `env.ts`：

```typescript
export const getEnv = () => {
  return import.meta.env;
};
```

```typescript
import { getEnv } from './env';

export { getEnv };
```

自定义钩子：

```typescript
import { useEffect } from 'react';
import { getEnv } from '@/utils';

export default function useTitle(title?: string) {
  useEffect(() => {
    const { VITE_APP_TITLE } = getEnv();
    document.title = title ?? VITE_APP_TITLE ?? 'Vite Project';
  }, []);
}
```

```typescript
import useStore from './useStore';
import useTitle from './useTitle';

export { useStore, useTitle };
```

页面使用：

```tsx
import React, { useEffect } from 'react';
import { useTitle } from '@/hooks';
import { observer } from 'mobx-react';

function Index() {
  useTitle();

  return (
    <div>
      <p>Home Index</p>
    </div>
  );
}

export default observer(Index);
```

> 💬 **面试官**：Vite 的环境变量机制和 Webpack 的 `process.env` 有什么本质区别？
>
> ✅ 标准答案：Webpack 用 DefinePlugin 在编译时把 `process.env.XXX` 整体替换成字面量字符串，`process` 在浏览器里本身不存在，是被插件模拟出来的；Vite 原生提供 `import.meta.env`，这是 ES 模块标准里 `import.meta` 的浏览器原生能力，不需要额外模拟 Node 环境变量对象，且有 `VITE_` 前缀白名单机制做安全过滤。
> 🎁 想加分：提到 Vite 也支持通过 `envPrefix` 配置项自定义前缀（不一定非要用 `VITE_`），以及 `.env.local` 这类不进 Git 仓库、本地覆盖用的文件命名惯例。

**server 配置**，新建 `config/index.ts` 集中管理常量：

```typescript
/**
 * @description 开发端口
 */
export const VITE_APP_PORT = 3001;
/**
 * @description 公共基础路径
 */
export const VITE_APP_BASE = '/';
/**
 * @description 是否自动在浏览器中打开应用程序
 */
export const VITE_APP_OPEN = true;
```

新建 `config/server/index.ts` 文件：

```typescript
import { ServerOptions } from 'vite';
import { VITE_APP_PORT, VITE_APP_OPEN } from '../index';

const server: ServerOptions = {
  host: true,
  port: VITE_APP_PORT,
  open: VITE_APP_OPEN,
};
export default server;
```

找到 `vite.config.ts` 文件，修改 `server` 属性：

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

import createVitePlugins from './config/plugins/index';
import server from './config/server';
import { VITE_APP_BASE } from './config';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), ...createVitePlugins()],
  base: VITE_APP_BASE,
  server,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

**proxy 配置**解决开发环境跨域，找到 `config/server/index.ts` 文件，新增 `proxy` 属性：

```typescript
import { ServerOptions, loadEnv } from 'vite';
import { VITE_APP_PORT, VITE_APP_OPEN } from '../index';

const createServer = (mode: string): ServerOptions => ({
  host: true,
  port: VITE_APP_PORT,
  open: VITE_APP_OPEN,
  proxy: {
    '/api': {
      target: loadEnv(mode, process.cwd()).VITE_API_HOST,
      changeOrigin: true,
      rewrite: (path: any) => path.replace(/^\/api/, ''),
    },
  },
});

export default createServer;
```

`vite.config.ts` 需要拿到 `mode` 传给 `createServer`：

```typescript
import { defineConfig, ConfigEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

import createVitePlugins from './config/plugins/index';
import createServer from './config/server';
import { VITE_APP_BASE } from './config';

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => ({
  plugins: [react(), ...createVitePlugins()],
  base: VITE_APP_BASE,
  server: createServer(mode),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
}));
```

测试用法：

```tsx
import React, { useEffect } from 'react';
import { useTitle } from '@/hooks';
import { observer } from 'mobx-react';

function Index() {
  useTitle();
  useEffect(() => {
    fetch('/datav-res/datav/map.json')
      .then((res) => res.json())
      .then((data) => console.log(data));
  }, []);
  return (
    <div>
      <p>Home Index</p>
    </div>
  );
}

export default observer(Index);
```

`changeOrigin: true` 把请求头里的 `Host` 改成目标服务器的地址，让目标服务器以为请求是从它自己域名发出的，绕过部分服务端对 `Origin`/`Referer` 的校验。**但这套代理机制只在开发环境的 Node 服务器里生效**，生产环境静态资源部署后没有这层 Node 中间层，跨域问题必须靠后端配置 CORS 响应头或者上线时用 Nginx 做反向代理解决，不能依赖 `vite.config.ts` 里的 `proxy`。

> 💬 **面试官**：本地用 Vite 的 proxy 能解决跨域，上线后还有效吗？
>
> ✅ 标准答案：不能。`vite.config.ts` 的 proxy 只在 `vite dev` 启动的开发服务器进程里生效，生产环境打包出的是纯静态文件，没有这层服务端转发能力，线上环境的跨域必须由真实的反向代理（Nginx）或后端 CORS 配置解决。
> 🎁 想加分：说明这本质上是「同源策略是浏览器的限制，不是服务器的限制」——开发环境代理的原理是让浏览器以为自己在同源请求（请求打到 Vite 的开发服务器），再由 Node 进程转发到真实后端，服务器到服务器之间没有同源限制，所以能绕过去。

---

## 📦 构建优化四件套：分析、压缩、传统浏览器兼容

**基础 build 配置**，`config/index.ts` 新增开关常量：

```typescript
// todo build 配置
/**
 * @description 是否在打包环境下，开启打包的分析可视化图
 */
export const VITE_APP_VISUALIZER = true;
/**
 * @description 是否在打包环境下，去除console.log
 */
export const VITE_APP_CONSOLE = true;
/**
 * @description 打包环境下，删除debugger
 */
export const VITE_APP_DEBUGGER = true;
/**
 * @description 打包环境下是否生成source map 文件
 */
export const VITE_APP_SOURCEMAP = false;
```

在 `config` 文件夹下，新建 `build/index.ts` 文件：

```typescript
import { BuildOptions } from 'vite';
import { VITE_APP_CONSOLE, VITE_APP_DEBUGGER, VITE_APP_SOURCEMAP } from '../index';

const createBuild = (): BuildOptions => {
  return {
    minify: 'terser',
    terserOptions: {
      compress: {
        keep_infinity: true,
        drop_console: VITE_APP_CONSOLE, // 去除 console
        drop_debugger: VITE_APP_DEBUGGER, // 去除 debugger
      },
    },
    outDir: 'dist', // 指定输出路径目录
    assetsDir: 'assets', // 指定打包生成静态资源的存放路径目录
    sourcemap: VITE_APP_SOURCEMAP, // 构建后是否生成 source map文件
  };
};

export default createBuild;
```

`vite.config.ts` 接入：

```typescript
import { defineConfig, ConfigEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

import createVitePlugins from './config/plugins/index';
import createServer from './config/server';
import createBuild from './config/build';
import { VITE_APP_BASE } from './config';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }: ConfigEnv) => ({
  plugins: [react(), ...createVitePlugins(command)],
  base: VITE_APP_BASE,
  server: createServer(mode),
  build: createBuild(),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
}));
```

**打包分析可视化图**用来定位「体积黑洞」——哪个依赖占了 bundle 的大头：

```shell
npm install rollup-plugin-visualizer -D
```

在 `config/plugins` 文件夹中，新建 `visualizer.ts` 文件：

```typescript
import visualizer from 'rollup-plugin-visualizer';
export default function configVisualizerConfig() {
  return visualizer({
    // 将打包的依赖分析可视化页面，写到node_modules中，这样不占位置
    filename: './node_modules/.cache/visualizer/stats.html',
    open: true,
    gzipSize: true,
    brotliSize: true,
  });
}
```

找到 `config/plugins/index.ts` 文件，新增如下代码：

```typescript
import configEslint from './eslint';
import configVisualizerConfig from './visualizer';
import { VITE_APP_VISUALIZER } from '../index';

export default function createVitePlugins() {
  const vitePlugins: any[] = [configEslint()];
  VITE_APP_VISUALIZER && vitePlugins.push(configVisualizerConfig());
  return vitePlugins;
}
```

**压缩 Html**：

```shell
npm install vite-plugin-html -D
```

在 `config/plugins` 文件夹中，新建 `html.ts` 文件：

```typescript
import { createHtmlPlugin } from 'vite-plugin-html';

export default function configHtml() {
  return createHtmlPlugin({
    minify: true,
  });
}
```

找到 `config/plugins/index.ts` 文件，新增如下代码：

```typescript
import configEslint from './eslint';
import configVisualizerConfig from './visualizer';
import configHtml from './html';
import { VITE_APP_VISUALIZER } from '../index';

export default function createVitePlugins() {
  const vitePlugins: any[] = [configEslint(), configHtml()];
  VITE_APP_VISUALIZER && vitePlugins.push(configVisualizerConfig());
  return vitePlugins;
}
```

**压缩资源**：

```shell
npm install vite-plugin-compression -D
```

在 `config/plugins` 文件夹中，新建 `compression.ts` 文件：

```typescript
import viteCompression from 'vite-plugin-compression';
export default function configCompression() {
  // gzip压缩 生产环境生成 .gz 文件
  return viteCompression({
    verbose: true,
    disable: false,
    threshold: 10240,
    algorithm: 'gzip',
    ext: '.gz',
  });
}
```

找到 `config/plugins/index.ts` 文件，新增如下代码：

```typescript
import configEslint from './eslint';
import configVisualizerConfig from './visualizer';
import configHtml from './html';
import configCompression from './compression';
import { VITE_APP_VISUALIZER } from '../index';

export default function createVitePlugins() {
  const vitePlugins: any[] = [configEslint(), configHtml(), configCompression()];
  VITE_APP_VISUALIZER && vitePlugins.push(configVisualizerConfig());
  return vitePlugins;
}
```

**兼容传统浏览器**：

```shell
npm i -D @vitejs/plugin-legacy
```

在 `config/plugins` 文件夹中，新建 `legacy.ts` 文件：

```typescript
import legacy from '@vitejs/plugin-legacy';

export default function configLegacy() {
  return legacy({
    // targets: ['ie >= 11', 'Android >= 39', 'Chrome >= 39', 'Safari >= 10.1', 'iOS >= 10', '> 0.5%'],
    // polyfills: ['es.promise', 'regenerator-runtime'],
    targets: ['ie >= 11'],
    additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
  });
}
```

找到 `config/plugins/index.ts` 文件，新增如下代码：

```typescript
import configEslint from './eslint';
import configVisualizerConfig from './visualizer';
import configHtml from './html';
import configCompression from './compression';
import configLegacy from './legacy';
import { VITE_APP_VISUALIZER } from '../index';

export default function createVitePlugins() {
  const vitePlugins: any[] = [configEslint(), configHtml(), configCompression(), configLegacy()];
  VITE_APP_VISUALIZER && vitePlugins.push(configVisualizerConfig());
  return vitePlugins;
}
```

**这里要给出一个现实判断**：这里配的目标是 `ie >= 11`，但 IE11 已于 2022 年正式退役，微软自己都不再提供技术支持，国内主流网站的 IE 用户占比早已降到统计误差范围内。如果你现在要搭一个新的后台管理系统，**大概率不需要这个插件**——它会让构建时间显著变长（要多编译一套产物），除非有明确的政企客户合规要求必须兼容老版本浏览器，否则直接砍掉这一步是更合理的选择。保留它的判断依据只有一个：产品方案里是否写明了要支持的最低浏览器版本，而不是「保险起见都兼容一下」。

> 💬 **面试官**：怎么定位一个后台系统首屏加载慢的问题？
>
> ✅ 标准答案：先用 `rollup-plugin-visualizer` 生成打包分析图，找到体积最大的几个模块（通常是没有按需引入的组件库、没有做代码分割的第三方大库），再结合 Chrome DevTools 的 Network/Performance 面板看是资源体积问题还是渲染阻塞问题，针对性地做按需引入、路由懒加载、CDN 分离等优化。
> 🎁 想加分：区分「构建产物大」和「首屏慢」不完全等价——如果做了路由级别的代码分割（`() => import('@/pages/xxx')`），首屏只加载当前路由需要的 chunk，即使总产物很大，首屏体验也可能没问题；反过来即使总产物不大，如果没做分割全部塞进一个文件，首屏也会慢。

🔧 **真实场景**：医院管理系统的「数据看板」页面引入了一个体积很大的图表库用来做门诊量趋势图，但这个图表只在这一个页面用到。用可视化分析图发现这个库占了主 bundle 的 30%，改成路由懒加载后，首屏 JS 体积直接降了将近三分之一。

---

## 🎨 样式方案：Scss Module + 全局变量注入

Vite 默认是支持 module 的，只需将文件名称加一个 `module` 即可，如 `xx.module.css`，这样就变成了 module，和 Create React App 一样的写法；scss/less 的 module 模式同 css 一样，如 `xx.module.scss`、`xx.module.less`。

```shell
pnpm install -D sass
```

**全局变量**：在 `src` 文件夹下新增 `styles` 文件夹，在 `styles` 文件夹中新增 `variables.scss`、`mixins.scss`、`transition.scss`、`common.scss`、`index.scss` 文件：

```less
$bg: #282c34;
```

```less
@mixin flexContainer($dir: column, $jc: center, $align: center) {
  display: flex;
  flex-direction: $dir;
  align-items: $align;
  justify-content: $jc;
}
@mixin style($size, $color, $bold: normal) {
  font-size: $size;
  color: $color;
  font-weight: $bold;
}
```

```less
@import './variables.scss';
@import './mixins.scss';
@import './common.scss';
@import './transition.scss';
```

在 `config` 文件夹下，新增 `style` 文件夹，且在 `style` 文件夹下新增 `index.ts`，用 `additionalData` 把这份汇总文件注入到**每一个** Scss 文件里，不用在业务代码里手动 `@import`：

```typescript
import { CSSOptions } from 'vite';

const createCss = (): CSSOptions => {
  return {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
      scss: {
        additionalData: '@import "./src/styles/index.scss";',
      },
    },
    modules: {
      // 样式小驼峰转化
      // css: goods-list => tsx: goodsList
      localsConvention: 'camelCase',
    },
  };
};

export default createCss;
```

> **注意点**：`additionalData` 中如果引用 `@import` 格式的，后面一定要加 `;`，否则会报错。

`vite.config.ts` 接入：

```typescript
import { defineConfig, ConfigEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

import createVitePlugins from './config/plugins/index';
import createServer from './config/server';
import createBuild from './config/build';
import createCss from './config/style';
import { VITE_APP_BASE } from './config';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }: ConfigEnv) => ({
  plugins: [react(), ...createVitePlugins(command)],
  base: VITE_APP_BASE,
  server: createServer(mode),
  build: createBuild(),
  css: createCss(),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
}));
```

使用效果——将 `src/app.css` 中的 `app.css` 换成 `app.module.scss`：

```less
.App {
  text-align: center;
  header {
    @include style(calc(10px + 2vmin), #ffffff);
    @include flexContainer();
    min-height: 100vh;
    background-color: $bg;
    img {
      height: 20vmin;
      pointer-events: none;
    }
    button {
      font-size: calc(10px + 2vmin);
    }
  }
}
@media (prefers-reduced-motion: no-preference) {
  img {
    animation: App-logo-spin infinite 20s linear;
  }
}
@keyframes App-logo-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
```

将 `src/App.ts` 中的代码修改如下：

```typescript
import { useState } from 'react';
import logo from './assets/logo.svg';
import Styles from './app.module.scss';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className={Styles.App}>
      <header>
        <img src={logo} alt="logo" />
        <p>Hello Vite + React!</p>
        <p>
          <button type="button" onClick={() => setCount((count) => count + 1)}>
            count is: {count}
          </button>
        </p>
      </header>
    </div>
  );
}

export default App;
```

> 💬 **面试官**：CSS Module 解决了什么问题？
>
> ✅ 标准答案：CSS Module 通过给每个类名生成唯一 hash 后缀，从根本上解决全局样式命名冲突——`Styles.App` 编译后对应的是一个类似 `App_xxxxxx` 的唯一类名，不同组件即使写了同名的 `.App` 类，也不会互相覆盖样式。
> 🎁 想加分：提到 `localsConvention: 'camelCase'` 这个配置项的作用——CSS 里习惯用中划线命名（`goods-list`），JS/TS 里习惯用驼峰（`goodsList`），这个配置让你在 `.tsx` 里可以直接写 `Styles.goodsList` 而不用 `Styles['goods-list']`，两边的命名习惯不用互相妥协。

---

## 🧭 路由：约定式 vs 配置式

```shell
pnpm i -S react-router-dom
```

**约定式路由**：暂定 `_` 开头的文件作为路由生成的规则——`pages/_index.tsx` → `/`，`pages/home/_index.tsx` → `/home`，`pages/home/_hello-world.tsx` → `/home/hello-world`，`pages/home/_[name].tsx` → `/home/:name`，用 `_.tsx` 作为 layout。

```typescript
import React from 'react';
import set from 'lodash/set';
import { lazy, Suspense } from 'react';

/**
 * 根据 pages 目录生成路径配置
 * @returns 路径配置
 */
function generatePathConfig(): Record<string, any> {
  // 扫描 src/pages 下的所有具有路由文件
  const modules = import.meta.glob('/src/pages/**/_*.{ts,tsx}');
  const pathConfig = {};
  Object.keys(modules).forEach((filePath) => {
    const routePath = filePath
      // 去除 src/pages 不相关的字符
      .replace('/src/pages/', '')
      // 去除文件名后缀
      .replace(/.tsx?/, '')
      // 转换动态路由 $[foo].tsx => :foo
      .replace(/_\[([\w-]+)]/, ':$1')
      // 转换以 $ 开头的文件
      .replace(/_([\w-]+)/, '$1')
      // 以目录分隔
      .split('/');
    // 使用 lodash.set 合并为一个对象
    set(pathConfig, routePath, modules[filePath]);
  });
  return pathConfig;
}

/**
 * 将文件路径配置映射为 react-router 路由
 * @param cfg 路径配置
 * @returns  路由
 */
function mapPathConfigToRoute(cfg: Record<string, any>): any[] {
  // route 的子节点为数组
  return Object.entries(cfg).map(([routePath, child]) => {
    // () => import() 语法判断
    if (typeof child === 'function') {
      // 等于 index 则映射为当前根路由
      const isIndex = routePath === 'index';
      return {
        index: isIndex,
        path: isIndex ? undefined : routePath,
        // 转换为组件
        element: wrapSuspense(child),
      };
    }
    // 否则为目录，则查找下一层级
    const { $, ...rest } = child;
    return {
      path: routePath,
      // layout 处理
      element: wrapSuspense($),
      // 递归 children
      children: mapPathConfigToRoute(rest),
    };
  });
}

/**
 * 为动态 import 包裹 lazy 和 Suspense
 * @param importer
 * @returns
 */
export function wrapSuspense(importer: any) {
  if (!importer) {
    return undefined;
  }
  // 使用 React.lazy 包裹 () => import() 语法
  const Component = lazy(importer);
  // 结合 Suspense，这里可以自定义 loading 组件
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}

/**
 * 组装配置, 生成路由
 * @returns
 */
function generateRouteConfig(): any[] {
  const { _, ...pathConfig } = generatePathConfig();
  // 提取跟路由的 layout
  return [
    {
      path: '/',
      element: wrapSuspense(_),
      children: mapPathConfigToRoute(pathConfig),
    },
  ];
}

export default generateRouteConfig;
```

```typescript
import generateRoutes from './generateRoutes';

export { generateRoutes };
```

封装组件：

```typescript
import { useRoutes } from 'react-router-dom';
import { generateRoutes } from '../routes';

function PageRoutes() {
  const routeConfig = generateRoutes();
  return useRoutes(routeConfig);
}

export default PageRoutes;
```

路由使用：

```tsx
import PageRoutes from './components/PageRoutes';
import { BrowserRouter } from 'react-router-dom';

const App = () => {
  return (
    <BrowserRouter>
      <PageRoutes />
    </BrowserRouter>
  );
};

export default App;
```

这段 `generatePathConfig`/`mapPathConfigToRoute` 值得讲透原理：`import.meta.glob` 是 Vite 提供的一个**编译期静态分析**能力，会在打包阶段把匹配到的文件路径全部转换成一个「路径 → 动态 import 函数」的映射表，这一步不需要运行时去遍历文件系统（浏览器环境本身也做不到）；`generatePathConfig` 拿到这份映射表后，用一串正则把文件路径字符串转换成路由段（去掉 `_` 前缀、把 `_[name]` 转成 `:name`），再用 `lodash.set` 按目录层级组装成一棵嵌套对象树；`mapPathConfigToRoute` 递归遍历这棵树，把每个叶子节点（函数，即动态 import）转换成 `{ path, element }` 的路由配置，把每个中间节点（目录，含 `$` 代表的 layout）转换成带 `children` 的嵌套路由配置。整个过程本质是把「文件系统的目录结构」映射成「路由树结构」，这也是所有约定式路由方案（Next.js `pages`/`app` 目录、umi 的 `pages` 目录）背后共通的核心思路。

**配置式路由**：

```tsx
import { wrapSuspense } from './generateRoutes';
// 路由处理方式
export default function lazyLoad(src: any) {
  if (!src) {
    return undefined;
  }
  // 使用 React.lazy 包裹 () => import() 语法
  const Component = wrapSuspense(() => import(`../../pages/${src}.tsx`));
  return Component;
}
```

```typescript
import generateRoutes from './config/generateRoutes';
import lazyLoad from './config/lazyLoad';

export { generateRoutes, lazyLoad };
```

路由编写：

```typescript
import { lazyLoad } from '.';

const routes = [
  {
    element: lazyLoad('_'),
    path: '/',
    children: [
      {
        index: true,
        element: lazyLoad('_index'),
      },
      {
        path: 'home',
        children: [
          {
            index: true,
            element: lazyLoad('home/_index'),
          },
          {
            path: 'child',
            children: [
              {
                index: true,
                element: lazyLoad('home/child/_index'),
              },
              {
                index: false,
                path: 'hello-world',
                element: lazyLoad('home/child/_hello-world'),
              },
              {
                index: false,
                path: ':name',
                element: lazyLoad('home/child/_[name]'),
              },
            ],
          },
        ],
      },
      {
        path: 'about',
        children: [
          {
            index: true,
            element: lazyLoad('about/_index'),
          },
        ],
      },
    ],
  },
];
export default routes;
```

封装组件：

```typescript
import { useRoutes } from 'react-router-dom';
import { generateRoutes } from '../routes';

function PageRoutes(props: any) {
  let { routes } = props;
  const routeConfig = generateRoutes();
  return useRoutes(routes ?? routeConfig);
}

export default PageRoutes;
```

路由使用：

```tsx
import PageRoutes from './components/PageRoutes';
import { BrowserRouter } from 'react-router-dom';
import routes from './routes/routes';

const App = () => {
  return (
    <BrowserRouter>
      <PageRoutes routes={routes} />
    </BrowserRouter>
  );
};

export default App;
```

> 💬 **面试官**：约定式路由和配置式路由，你会怎么选？
>
> ✅ 标准答案：约定式路由靠目录结构自动生成路由表，新增页面不用同步改路由配置文件，减少手工维护成本，代价是路由行为不够直观，团队新人要理解一套目录命名约定才能预判某个文件会生成什么路由；配置式路由要手工维护路由表，但路由结构完全显式可控，调试和迁移更直接。
> 🎁 想加分：提到这套约定式路由的实现思路，后续在第 10 篇 React Router Data Router 里会进一步升级——把 `loader`/`action` 这类数据依赖也提升到路由配置层面声明，是「路由即声明」这个思路的进一步延伸。

---

## 🗃️ 状态管理：Mobx 响应式原理

```shell
pnpm i -S mobx mobx-react
```

**创建 store**：需要注意的是，在 store 初始化的时候，如果需要数据能够响应式绑定，需要在初始化的时候给默认值，不能设置为 `undefined` 或者 `null`，否则数据无法实现响应式：

```typescript
import { makeAutoObservable } from 'mobx';

class GlobalStore {
  public title = '';
  public theme = 'default';
  public language = 'zh';
  constructor() {
    makeAutoObservable(this);
  }
  setTheme(theme: string) {
    this.theme = theme;
  }
  setTitle(title: string) {
    this.title = title;
  }
  async setLanguage(language: string) {
    // 模拟接口请求
    return await new Promise((resolve) => {
      setTimeout(() => {
        this.language = language;
        resolve(language);
      }, 1000);
    });
  }
}

export default new GlobalStore();
```

```typescript
import { makeAutoObservable } from 'mobx';

class LayoutStore {
  public collapse = false;
  public pathname = location.pathname;
  constructor() {
    makeAutoObservable(this);
  }
  setCollapse(collapse: boolean) {
    this.collapse = collapse;
  }
  setPathname(pathname: string) {
    this.pathname = pathname;
  }
}

export default new LayoutStore();
```

```typescript
import globalStore from './global';
import layoutStore from './layout';

const stores = {
  globalStore,
  layoutStore,
};
export default stores;
```

**Store 注入**：Mobx 的数据注入，采用的 React 的 `context` 特性：

```tsx
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'mobx-react';
import App from '@/App';
import stores from '@/stores';
import '@/index.scss';

// App 入口
ReactDOM.render(
  <Provider {...stores}>
    <App />
  </Provider>,
  document.getElementById('root'),
);
```

**Store 使用**，默认方式：

```tsx
import React from 'react';
import { observer, inject } from 'mobx-react';

function About({ globalStore, layoutStore }: any) {
  return (
    <div>
      <p>About</p>
      <p>{globalStore.theme}</p>
      <p>{layoutStore.pathname}</p>
    </div>
  );
}

export default inject(...['globalStore', 'layoutStore'])(observer(About));
```

自定义钩子方式：

```typescript
import { useContext } from 'react';
import { MobXProviderContext } from 'mobx-react';
import stores from '../stores';

export type StoreType = typeof stores;

/**
 * 获取根 store 或者指定 store 名称数据
 * @param storeName 指定子 store 名称
 * @returns typeof StoreType[storeName]
 */
function useStores<T extends keyof StoreType>(storeName: T) {
  // 这里的 MobXProviderContext 就是上面 mobx-react 提供的
  const rootStore = useContext(MobXProviderContext);
  const stores = rootStore as StoreType;
  return stores[storeName] as StoreType[T];
}
export default useStores;
```

```typescript
import useStore from './useStore';

export { useStore };
```

```tsx
import React, { useEffect } from 'react';
import { useStores } from '../../hooks';
import { observer } from 'mobx-react';

function Index() {
  const global = useStores('globalStore');
  const layout = useStores('layoutStore');

  const setLan = async () => {
    const res = await global.setLanguage('en');
    console.log(res);
    return res;
  };
  useEffect(() => {
    setTimeout(() => {
      global.setTheme('dark');
      setLan();
      layout.setPathname('/about');
    }, 1000);
  }, []);
  return (
    <div>
      <p>Home Index</p>
      <p>{global?.theme}</p>
      <p>{layout?.pathname}</p>
    </div>
  );
}

export default observer(Index);
```

「初始化字段不能给 `undefined`/`null`」这条约束背后是 Mobx 的响应式原理：`makeAutoObservable` 用 Proxy 拦截目标对象的 `get`/`set` 操作，在 `get` 阶段自动收集「谁在读这个字段」（依赖收集），在 `set` 阶段自动通知「所有读过这个字段的地方需要重新渲染」（派发更新）——但这套拦截机制是在 `makeAutoObservable(this)` 执行的那一刻，针对当前已存在的字段建立的。如果初始化时字段是 `undefined`，Mobx 拦截的是「这个字段值为 `undefined`」这一状态，之后即使你把它赋值成一个对象，Mobx 也未必能追踪到这个新对象内部的属性变化——必须在初始化阶段就给出真实的初始值（哪怉是空字符串、空数组），让 Proxy 从一开始就能建立完整的依赖追踪链路。

`observer` 把函数组件的渲染函数包装成一个 Mobx 意义上的「响应式副作用」（Reaction）——渲染函数执行时读取了哪些 observable 字段，就订阅哪些字段的变化，字段变化时只重新触发这个渲染函数，不需要手动 `useEffect` 监听。

> 💬 **面试官**：Mobx 和 Redux 相比，本质区别是什么？
>
> ✅ 标准答案：Mobx 是隐式响应式——通过 Proxy 自动追踪「谁读了这个状态」，状态变化自动触发相关组件重渲染，不需要手写 `selector`/`connect`；Redux 是显式单向数据流——所有状态变化必须经过 `dispatch(action)` → `reducer` 这条固定路径，可预测性和可追踪性更强，但样板代码更多。
> 🎁 想加分：提到 Mobx 的响应式颗粒度是「字段级」的，但 React 的渲染单元是「组件级」的——`observer` 包装的组件只要它读取的任意一个 observable 字段变了就整体重渲染，收益主要体现在「减少了手写 `shouldComponentUpdate`/`selector` 比较逻辑的心智负担」，而不是做到了比 Redux 更精确的 DOM 更新粒度。

🔧 **真实场景**：医院管理系统的全局主题、当前登录医生信息这类跨页面共享的轻量状态，用 Mobx 的 `GlobalStore` 几行代码就能搭起来；等到状态管理复杂到需要多团队协作、需要严格的状态变更审计（比如处方审核这类涉及多方审批流程的核心业务状态），再考虑升级到 Redux Toolkit——这个判断依据会在本文「从单体到 Monorepo」章节里进一步展开。

---

## 🌐 请求层封装：拦截器顺序 + 取消请求

这是整套脚手架里工程深度最高的一节。先装依赖：

```shell
pnpm i -S axios
pnpm i -S nprogress
pnpm i -S @types/nprogress
```

在 `src` 文件夹中，新建 `service` 文件夹，并且新建 `src/service/request/index.ts`、`src/service/request/types.ts`、`src/service/index.ts` 文件。

`types.ts` 定义拦截器和请求配置的类型：

```typescript
/* eslint-disable no-unused-vars */
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
export interface RequestInterceptors<T> {
  // 请求拦截
  requestInterceptors?: (config: AxiosRequestConfig) => AxiosRequestConfig;
  requestInterceptorsCatch?: (err: any) => any;
  // 响应拦截
  responseInterceptors?: (config: T) => T;
  responseInterceptorsCatch?: (err: any) => any;
}
// 自定义传入的参数
export interface RequestConfig<T = AxiosResponse> extends AxiosRequestConfig {
  interceptors?: RequestInterceptors<T>;
}
export interface CancelRequestSource {
  [index: string]: () => void;
}
```

`src/service/request/index.ts` 封装 `Request` 类：

```typescript
import axios, { AxiosResponse } from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { RequestConfig, RequestInterceptors, CancelRequestSource } from './types';
import NProgress from 'nprogress';

class Request {
  // axios 实例
  instance: AxiosInstance;
  // 拦截器对象
  interceptorsObj?: RequestInterceptors<AxiosResponse>;

  /*
  存放取消方法的集合
  * 在创建请求后将取消请求方法 push 到该集合中
  * 封装一个方法，可以取消请求，传入 url: string|string[]
  * 在请求之前判断同一URL是否存在，如果存在就取消请求
  */
  cancelRequestSourceList?: CancelRequestSource[];
  /*
  存放所有请求URL的集合
  * 请求之前需要将url push到该集合中
  * 请求完毕后将url从集合中删除
  * 添加在发送请求之前完成，删除在响应之后删除
  */
  requestUrlList?: string[];

  constructor(config: RequestConfig) {
    this.requestUrlList = [];
    this.cancelRequestSourceList = [];
    this.instance = axios.create(config);
    this.interceptorsObj = config.interceptors;
    // 拦截器执行顺序 接口请求 -> 实例请求 -> 全局请求 -> 实例响应 -> 全局响应 -> 接口响应
    this.instance.interceptors.request.use(
      (res: AxiosRequestConfig) => res,
      (err: any) => err,
    );

    // 使用实例拦截器
    this.instance.interceptors.request.use(
      this.interceptorsObj?.requestInterceptors,
      this.interceptorsObj?.requestInterceptorsCatch,
    );
    this.instance.interceptors.response.use(
      this.interceptorsObj?.responseInterceptors,
      this.interceptorsObj?.responseInterceptorsCatch,
    );
    // 全局响应拦截器保证最后执行
    this.instance.interceptors.response.use(
      // 因为我们接口的数据都在res.data下，所以我们直接返回res.data
      (res: AxiosResponse) => {
        return res.data;
      },
      (err: any) => err,
    );
  }
  /**
   * @description: 获取指定 url 在 cancelRequestSourceList 中的索引
   * @param {string} url
   * @returns {number} 索引位置
   */
  private getSourceIndex(url: string): number {
    return this.cancelRequestSourceList?.findIndex((item: CancelRequestSource) => {
      return Object.keys(item)[0] === url;
    }) as number;
  }
  /**
   * @description: 删除 requestUrlList 和 cancelRequestSourceList
   * @param {string} url
   * @returns {*}
   */
  private delUrl(url: string) {
    const urlIndex = this.requestUrlList?.findIndex((u) => u === url);
    const sourceIndex = this.getSourceIndex(url);
    // 删除url和cancel方法
    urlIndex !== -1 && this.requestUrlList?.splice(urlIndex as number, 1);
    sourceIndex !== -1 && this.cancelRequestSourceList?.splice(sourceIndex as number, 1);
  }
  request<T>(config: RequestConfig<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      NProgress.start();
      // 如果我们为单个请求设置拦截器，这里使用单个请求的拦截器
      if (config.interceptors?.requestInterceptors) {
        config = config.interceptors.requestInterceptors(config);
      }
      const url = config.url;
      // url存在保存取消请求方法和当前请求url
      if (url) {
        this.requestUrlList?.push(url);
        config.cancelToken = new axios.CancelToken((c) => {
          this.cancelRequestSourceList?.push({
            [url]: c,
          });
        });
      }
      this.instance
        .request<any, T>(config)
        .then((res) => {
          // 如果我们为单个响应设置拦截器，这里使用单个响应的拦截器
          if (config.interceptors?.responseInterceptors) {
            res = config.interceptors.responseInterceptors(res);
          }
          // NProgress.done();
          resolve(res);
        })
        .catch((err: any) => {
          // NProgress.done();
          reject(err);
        })
        .finally(() => {
          NProgress.done();
          url && this.delUrl(url);
        });
    });
  }
  upload(url: string, data: File) {
    return new Promise((resolve, reject) => {
      NProgress.start();
      this.request({
        url,
        method: 'POST',
        data,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
        .then((res: any) => {
          NProgress.done();
          resolve(res.data);
        })
        .catch((err) => {
          NProgress.done();
          reject(err.data);
        });
    });
  }
  download(url: string) {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    iframe.onload = function () {
      document.body.removeChild(iframe);
    };
    document.body.appendChild(iframe);
  }
  // 取消请求
  cancelRequest(url: string | string[]) {
    if (typeof url === 'string') {
      // 取消单个请求
      const sourceIndex = this.getSourceIndex(url);
      sourceIndex >= 0 && this.cancelRequestSourceList?.[sourceIndex][url]();
    } else {
      // 存在多个需要取消请求的地址
      url.forEach((u) => {
        const sourceIndex = this.getSourceIndex(u);
        sourceIndex >= 0 && this.cancelRequestSourceList?.[sourceIndex][u]();
      });
    }
  }
  // 取消全部请求
  cancelAllRequest() {
    this.cancelRequestSourceList?.forEach((source) => {
      const key = Object.keys(source)[0];
      source[key]();
    });
  }
}

export default Request;
export type { RequestConfig, RequestInterceptors };
```

拦截器执行顺序值得单独讲：**接口请求拦截器 → 实例请求拦截器 → 全局请求拦截器 → 实例响应拦截器 → 全局响应拦截器 → 接口响应拦截器**。请求方向是「从内到外再到外部服务器」，响应方向是「从外部服务器再到内到外」——全局响应拦截器被故意放在最后注册，就是为了保证「无论业务代码怎么加拦截器，最终统一解包 `res.data` 这一步永远最后执行」，避免业务拦截器拿到的是没解包的原始响应对象。

> 💬 **面试官**：Axios 拦截器的执行顺序是怎样的，为什么要设计成这样？
>
> ✅ 标准答案：请求拦截器按注册顺序从早到晚依次执行，响应拦截器同样按注册顺序执行；这份封装里全局拦截器故意注册在实例拦截器之后，是为了保证「无论业务代码怎么加拦截器，最终统一解包 `res.data` 这一步永远最后执行」，避免业务拦截器拿到的是没解包的原始响应对象。
> 🎁 想加分：提到可以给单个请求配置独立的拦截器（`config.interceptors`），这一层会在实例拦截器之前/之后单独执行一次，用来处理某个接口的特殊逻辑（比如某个接口的响应结构和其他接口不一样），不用为了一个特例去改全局拦截器。

`request<T>` 方法本身要处理请求的发起、取消令牌注册、进度条控制、完成后清理。**这里要明确点出一处技术过时点**：这份封装用的是 `axios.CancelToken`，这个 API 从 Axios v0.22 起就已经被标记为**废弃**，官方推荐用浏览器标准的 `AbortController`。原理上两者做的事一样——都是创建一个可以从外部触发的取消信号，绑定到请求配置上，Axios 内部检测到信号触发就中断请求——但 `AbortController` 是 Web 标准 API（`fetch` 也用它），不依赖 Axios 私有实现，迁移成本很低：

```typescript
class Request {
  private abortControllerList: Map<string, AbortController> = new Map();

  request<T>(config: RequestConfig<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = config.url;
      const controller = new AbortController();
      if (url) {
        this.abortControllerList.set(url, controller);
        config.signal = controller.signal; // 👈 用 signal 替代 cancelToken
      }
      this.instance
        .request<any, T>(config)
        .then(resolve)
        .catch(reject)
        .finally(() => url && this.abortControllerList.delete(url));
    });
  }

  cancelRequest(url: string) {
    this.abortControllerList.get(url)?.abort(); // 👈 直接调用 abort()，不用维护索引查找
    this.abortControllerList.delete(url);
  }
}
```

用 `Map` 替代原来的数组 + `findIndex` 查找也是一个附带的简化——`Map` 用 URL 做 key 直接 `get`/`delete`，不需要 `getSourceIndex` 这个专门写来做线性查找的私有方法。

Request 对外暴露的接口层，`src/service/index.ts`：

```typescript
import Request from './request';
import { AxiosResponse } from 'axios';

import type { RequestConfig } from './request/types';

interface IResponse<T> {
  statusCode: number;
  desc: string;
  result: T;
}
interface IRequest<T> extends RequestConfig<IResponse<any>> {
  data?: T;
}

const request = new Request({
  baseURL: import.meta.env.VITE_API_HOST,
  timeout: 1000 * 60 * 5,
  interceptors: {
    // 请求拦截器
    requestInterceptors: (config) => config,
    // 响应拦截器
    responseInterceptors: (result: AxiosResponse) => {
      return result;
    },
  },
});

/**
 * @description: 函数的描述
 * @generic D 请求参数
 * @generic T 响应结构
 * @param {IRequest} config 不管是GET还是POST请求都使用data
 * @returns {Promise}
 */
const req = <D = any, T = any>(config: IRequest<D>) => {
  const { method = 'GET' } = config;
  if (method === 'get' || method === 'GET') {
    config.params = config.data;
  }
  return request.request<IResponse<T>>(config);
};
export const upload = (url: string, data: File) => {
  return request.upload(url, data);
};
export const download = (url: string) => {
  return request.download(url);
};
// 取消请求
export const cancelRequest = (url: string | string[]) => {
  return request.cancelRequest(url);
};
// 取消全部请求
export const cancelAllRequest = () => {
  return request.cancelAllRequest();
};

export default req;
```

业务层 API 定义，在 `src/api` 文件夹中，新建 `home` 文件夹，并且新建 `src/api/home/index.ts` 文件：

```typescript
import request from '@/service';

export const getMapData = (data?: any) => {
  return request({
    url: '/datav-res/datav/map.json',
    method: 'GET',
    data,
    interceptors: {
      requestInterceptors(res: any) {
        console.log('接口请求拦截');
        return res;
      },
      responseInterceptors(result: any) {
        console.log('接口响应拦截');
        return result;
      },
    },
  });
};
```

页面里调用，在 `src/pages/home/_index.tsx` 文件：

```tsx
import React, { useEffect } from 'react';
import { useStore, useTitle } from '@/hooks';
import { observer } from 'mobx-react';
import { getMapData } from '@/apis/home';

function Index() {
  const global = useStore('globalStore');
  const layout = useStore('layoutStore');

  const setLan = async () => {
    const res = await global.setLanguage('en');
    console.log(res);
    return res;
  };
  const getData = async () => {
    try {
      const res = await getMapData({ id: 111 });
      console.log(res);
    } catch (error) {
      console.log(error);
    }
  };
  useTitle();
  useEffect(() => {
    getData();
    setTimeout(() => {
      global.setTheme('dark');
      setLan();
      layout.setPathname('/about');
    }, 1000);
  }, []);
  return (
    <div>
      <p>Home Index</p>
      <p>{global?.theme}</p>
      <p>{layout?.pathname}</p>
    </div>
  );
}

export default observer(Index);
```

> 💬 **面试官**：怎么实现接口的取消请求和防止重复请求？
>
> ✅ 标准答案：维护一个 URL 到取消句柄的映射表（`Map` 或数组），每次发起请求前先注册取消句柄，请求完成后清理；取消某个请求时按 URL 查到句柄调用 `abort()`（或旧版的 `cancel()`）；防重复请求可以在发起新请求前先检查该 URL 是否已在进行中，如果在，先取消旧的再发新的，或者直接复用进行中的 Promise。
> 🎁 想加分：提到 `AbortController` 现在是标准做法，一个 `controller.signal` 可以同时传给多个请求，`abort()` 一次能批量取消这一组请求，比逐个维护取消句柄更省心。

🔧 **真实场景**：医院管理系统的患者检索输入联想，用户快速打字时每敲一个字都会触发一次请求，如果不做取消，多个请求的响应会按网络返回的先后顺序覆盖 UI，导致输入「阿莫西林」但联想列表显示的是「阿」这一个字的结果（网络延迟导致后发的请求先返回）。用取消机制保证每次新请求发起时取消上一次未完成的请求，才能保证联想结果和输入内容严格对应。

---

## 🎭 Mock 与国际化：本地和生产要分开控制

**Mock** 让前端不用等后端接口就能开发：

```shell
pnpm i mockjs -S
pnpm i vite-plugin-mock -D
```

在 `config/plugins` 文件夹中，新建 `mock.ts` 文件：

```typescript
import { viteMockServe } from 'vite-plugin-mock';

export default function configMock(command: string) {
  return viteMockServe({
    // default
    mockPath: 'mock', // 解析根目录下的mock文件夹
    localEnabled: command === 'serve', // 开发打包开关
    prodEnabled: false, // 生产打包开关
    supportTs: true, // 打开后，可以读取 ts 文件模块。 请注意，打开后将无法监视.js 文件。
    watchFiles: true, // 监视文件更改
  });
}
```

`localEnabled`（本地开发是否启用）和 `prodEnabled`（生产构建是否启用）分开控制，不是冗余设计——**Mock 的本质是「假数据」，一旦混进生产构建产物，就有可能覆盖真实接口响应**。这里把 `localEnabled` 和执行命令绑定（`command === 'serve'`），`prodEnabled` 硬编码为 `false`，就是从机制上杜绝 Mock 逻辑被打进生产包的可能性。

找到 `config/plugins/index.ts` 文件，新增如下代码：

```typescript
import configEslint from './eslint';
import configVisualizer from './visualizer';
import configHtml from './html';
import configCompression from './compression';
import configLegacy from './legacy';
import configMock from './mock';
import { VITE_APP_VISUALIZER } from '../index';

export default function createVitePlugins(command: string) {
  const vitePlugins: any[] = [
    configEslint(),
    configHtml(),
    configCompression(),
    configLegacy(),
    configMock(command),
  ];
  VITE_APP_VISUALIZER && vitePlugins.push(configVisualizer());
  return vitePlugins;
}
```

找到 `vite.config.ts` 文件，新增如下代码：

```typescript
import { defineConfig, ConfigEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

import createVitePlugins from './config/plugins/index';
import createServer from './config/server';
import createBuild from './config/build';
import createCss from './config/style';
import { VITE_APP_BASE } from './config';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }: ConfigEnv) => ({
  plugins: [react(), ...createVitePlugins(command)],
  base: VITE_APP_BASE,
  server: createServer(mode),
  build: createBuild(),
  css: createCss(),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
}));
```

在根目录（和 `src` 同级）新建 `mock` 文件夹，新建 `mock/home.ts` 文件、`mock/about.ts` 文件以及 `mock/index.ts` 文件：

```typescript
import { MockMethod } from 'vite-plugin-mock';
import Mock from 'mockjs';
export default [
  {
    url: '/api/getUserInfo',
    method: 'post',
    response: () => {
      return Mock.mock({
        code: 200,
        data: {
          nickname: '@cname',
          age: '@integer(10-100)',
          uid: '@id',
          url: '@image(200x100)',
          city: '@city',
          country: '@county(true)',
          province: '@province',
          mobile_phone: '@phone',
          email: '@email',
          region: '@region',
          menus: [
            {
              menu_name: '一级导航',
              id: '@id',
              code: 'Nav1',
              children: [
                {
                  code: 'about',
                  menu_url: 'views/about',
                  access_permissions: '["about"]',
                  children: [],
                  menu_name: '测试1',
                  id: '@id',
                },
                {
                  code: 'home',
                  menu_url: 'views/home',
                  access_permissions: '["home"]',
                  children: [],
                  menu_name: '测试2',
                  id: '@id',
                },
              ],
            },
          ],
        },
      });
    },
  },
] as MockMethod[];
```

```typescript
import { MockMethod } from 'vite-plugin-mock';
import Mock from 'mockjs';
export default [
  {
    url: '/api/getAboutInfo',
    method: 'post',
    response: () => {
      return Mock.mock({
        code: 200,
        data: {
          nickname: 'about',
          age: '@integer(10-100)',
        },
      });
    },
  },
] as MockMethod[];
```

```typescript
export * from './about';
export * from './home';
```

**这里要理清一处笔记原文表述和实际接口对应关系**：`mock/home.ts` 对应的接口是 `getUserInfo`，`mock/about.ts` 对应的接口是 `getAboutInfo`，文件名以 `mock/index.ts` 里 `export *` 引用的模块名为准。

Api 实现，在 `src/apis/home/index.ts` 文件：

```typescript
import request from '@/service';

export const getMapData = (data?: any) => {
  return request({
    url: '/datav-res/datav/map.json',
    method: 'GET',
    data,
    interceptors: {
      requestInterceptors(res: any) {
        console.log('接口请求拦截');
        return res;
      },
      responseInterceptors(result: any) {
        console.log('接口响应拦截');
        return result;
      },
    },
  });
};

export const getUserInfo = (data?: object) =>
  request({
    url: '/getUserInfo',
    method: 'POST',
    data,
  });
```

在 `src/apis/about/index.ts` 文件：

```typescript
import request from '@/service';

export const getAboutInfo = (data?: object) =>
  request({
    url: '/getAboutInfo',
    method: 'POST',
    data,
  });
```

Api 调用，在 `src/pages/home/_index.tsx` 文件：

```tsx
import React, { useEffect } from 'react';
import { useStore, useTitle } from '@/hooks';
import { observer } from 'mobx-react';
import { getMapData, getUserInfo } from '@/apis/home';

function Index() {
  const global = useStore('globalStore');
  const layout = useStore('layoutStore');

  const setLan = async () => {
    const res = await global.setLanguage('en');
    console.log(res);
    return res;
  };
  const getData = async () => {
    try {
      const res = await getMapData({ id: 111 });
      console.log(res);
    } catch (error) {
      console.log(error);
    }
  };
  const getUser = async () => {
    try {
      const res = await getUserInfo({ id: 1001 });
      console.log(res);
    } catch (error) {
      console.log(error);
    }
  };
  useTitle();
  useEffect(() => {
    getData();
    getUser();
    setTimeout(() => {
      global.setTheme('dark');
      setLan();
      layout.setPathname('/about');
    }, 1000);
  }, []);
  return (
    <div>
      <p>Home Index</p>
      <p>{global?.theme}</p>
      <p>{layout?.pathname}</p>
    </div>
  );
}

export default observer(Index);
```

在 `src/pages/about/_index.tsx` 文件：

```tsx
import React, { useEffect } from 'react';
import { observer, inject } from 'mobx-react';
import { getAboutInfo } from '@/apis/about';

function About({ globalStore, layoutStore }: any) {
  const getData = async () => {
    try {
      const res = await getAboutInfo();
      console.log(res);
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    getData();
  }, []);
  return (
    <div>
      <p>About</p>
      <p>{globalStore.theme}</p>
      <p>{layoutStore.pathname}</p>
    </div>
  );
}

export default inject(...['globalStore', 'layoutStore'])(observer(About));
```

> 💬 **面试官**：Mock 数据方案除了 `vite-plugin-mock` 还有什么选择？
>
> ✅ 标准答案：`vite-plugin-mock` 是构建期插件方案，在 Vite 服务器层拦截匹配的请求路径直接返回假数据；另一种思路是运行时的网络层拦截，比如 MSW（Mock Service Worker），它用 Service Worker 或 Node 的 `http` 模块拦截层拦截真实的网络请求，业务代码完全感知不到 mock 的存在。
> 🎁 想加分：对比两者的适用场景——`vite-plugin-mock` 和 Vite 强绑定，配置简单，适合纯前端项目独立开发；MSW 是框架无关的，同一套 mock handler 可以同时用在浏览器开发环境和 Node 测试环境（单元测试/集成测试里 mock 网络请求），如果项目里已经在用 Vitest/Jest 做接口相关的测试，MSW 能让开发 mock 和测试 mock 复用同一套定义，减少维护量。

**国际化**：

```shell
# npm
pnpm install react-i18next i18next --save
# 如果需要检测当前浏览器的语言或者从服务器获取配置资源可以安装下面依赖
pnpm install i18next-http-backend i18next-browser-languagedetector --save
```

在 `src` 文件夹中，新建 `locales` 文件夹，添加 `i18n.ts` 和 `resources.ts` 文件：

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import resources from './resources';

i18n
  // load translation using http -> see /public/locales
  .use(Backend)
  // detect user language
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  .init({
    fallbackLng: 'zh',
    lng: 'zh',
    debug: true,
    resources: resources,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });
```

```typescript
import en from './json/en.json';
import ja from './json/ja.json';
import zh from './json/zh.json';

const resources = {
  ja: {
    translation: ja,
  },
  en: {
    translation: en,
  },
  zh: {
    translation: zh,
  },
};
export default resources;
```

多语言配置文件：

```json
{
  "欢迎使用 react-i18next": "Welcome to react using react-i18next",
  "切换语言": "change language",
  "切换到中文": "change to Chinese",
  "切换到英文": "change to English",
  "切换到日文": "change to Japenese",
  "methods": {
    "renderProps": "change language with render props",
    "hook": "change language with hook",
    "hoc": "change language with hoc"
  }
 }
```

```json
{
  "欢迎使用 react-i18next": "ご利用を歓迎する react-i18next",
  "切换语言": "言語を切り替える",
  "切换到中文": "中国語に切り替える",
  "切换到英文": "英文に切り替える",
  "切换到日文": "日本語に切り替える",
  "methods": {
    "renderProps": "renderProps方式で言語を変換する",
    "hook": "hook方式で言語を変換する",
    "hoc": "hoc方式で言語を変換する"
  }
}
```

```json
{
  "methods": {
    "renderProps": "用renderProps转换",
    "hook": "用hook转换",
    "hoc": "用hoc转换"
  }
}
```

**这里要指出一个维护性反模式**：这份配置直接用中文原文（`"欢迎使用 react-i18next"`）作为 key，能跑，但存在两个隐患——一是文案改动会连带改所有语言文件的 key（key 变了，所有语言包都要同步改），二是中文 key 里如果有细微的空格、标点差异，会导致某个语言包漏翻译时静默 fallback，排查起来比看 `key.welcome` 这种语义化 key 麻烦得多。更推荐的做法是用语义化的英文 key（比如 `welcome`、`switchLanguage`），中文文案本身作为 `zh.json` 里的一个翻译值存在，和其他语言地位对等。

入口文件配置：

```tsx
import PageRoutes from '@/components/PageRoutes';
import { BrowserRouter } from 'react-router-dom';
import routes from '@/routes/routes';
import './locales/i18n';

const App = () => {
  return (
    <BrowserRouter>
      <PageRoutes routes={routes} />
    </BrowserRouter>
  );
};

export default App;
```

**切换语言**：通过 RenderProps 的方式国际化组件：

```tsx
import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Layout, Menu, Dropdown, Avatar } from 'antd';
import { HomeOutlined, DashboardOutlined, UserOutlined, TranslationOutlined } from '@ant-design/icons';
import { Translation } from 'react-i18next';

const { Header, Sider, Content } = Layout;
const { SubMenu } = Menu;

function BasicLayout() {
  return (
    <Translation>
      {(t, { i18n }) => (
        <Layout style={{ height: '100vh' }}>
          <Header style={{ color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
            <div className="left">
              <span style={{ fontSize: 24 }}>LOGO</span>
            </div>
            <div
              className="right"
              style={{ width: '50%', display: 'flex', alignItems: 'center', justifyContent: 'end' }}
            >
              <Dropdown
                overlay={
                  <Menu onClick={({ key }) => i18n.changeLanguage(key)}>
                    <Menu.Item key="zh">{t('切换到中文')}</Menu.Item>
                    <Menu.Item key="en">{t('切换到英文')}</Menu.Item>
                    <Menu.Item key="ja">{t('切换到日文')}</Menu.Item>
                  </Menu>
                }
              >
                <TranslationOutlined style={{ width: 100, fontSize: 20 }} />
              </Dropdown>
              <Avatar style={{ backgroundColor: '#f56a00' }}>Tom</Avatar>
            </div>
          </Header>
          <Layout>
            <Sider width={200} className="layout-sider">
              <Menu
                mode="inline"
                theme="dark"
                defaultSelectedKeys={['/']}
                style={{ height: '100%', borderRight: 0 }}
                defaultOpenKeys={['/']}
              >
                <Menu.Item key="/" icon={<DashboardOutlined />} title="Dashboard">
                  <Link to="/">Dashboard</Link>
                </Menu.Item>
                <SubMenu key="home" icon={<HomeOutlined />} title="首页">
                  <Menu.Item key="/home">
                    <Link to="/home">home</Link>
                  </Menu.Item>
                  <Menu.Item key="/home/child">
                    <Link to="/home/child">child</Link>
                  </Menu.Item>
                  <Menu.Item key="/home/child/hello-world">
                    <Link to="/home/child/hello-world">hello</Link>
                  </Menu.Item>
                  <Menu.Item key="/home/child/1234">
                    <Link to="/home/child/1234">name</Link>
                  </Menu.Item>
                </SubMenu>
                <SubMenu key="about" icon={<UserOutlined />} title="关于">
                  <Menu.Item key="/about">
                    <Link to="/about">about</Link>
                  </Menu.Item>
                </SubMenu>
              </Menu>
            </Sider>
            <Layout className="layout-content">
              <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Outlet />
              </Content>
            </Layout>
          </Layout>
        </Layout>
      )}
    </Translation>
  );
}

export default BasicLayout;
```

在 hook 中使用 react-i18next 国际化：

```tsx
import React, { useEffect } from 'react';
import { useStore, useTitle } from '@/hooks';
import { observer } from 'mobx-react';
import { getMapData, getUserInfo } from '@/apis/home';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

function Index() {
  const global = useStore('globalStore');
  const layout = useStore('layoutStore');
  const { t } = useTranslation();

  const setLan = async () => {
    const res = await global.setLanguage('en');
    console.log(res);
    return res;
  };
  const getData = async () => {
    try {
      const res = await getMapData({ id: 111 });
      console.log(res);
    } catch (error) {
      console.log(error);
    }
  };
  const getUser = async () => {
    try {
      const res = await getUserInfo({ id: 1001 });
      console.log(res);
    } catch (error) {
      console.log(error);
    }
  };
  useTitle();
  useEffect(() => {
    getData();
    setTimeout(() => {
      global.setTheme('dark');
      setLan();
      layout.setPathname('/about');
    }, 1000);
  }, []);
  return (
    <div>
      <p>Home Index</p>
      <p>Mobx 测试：{global?.theme}</p>
      <p>Mobx 测试：{layout?.pathname}</p>
      <p>语言切换测试：{t('methods.hook')}</p>
      <div>
        <Button type="primary" onClick={getUser}>
          axios请求测试
        </Button>
      </div>
    </div>
  );
}

export default observer(Index);
```

使用高阶组件（Hoc）的方式处理国际化：

```tsx
import React, { useEffect } from 'react';
import { observer, inject } from 'mobx-react';
import { getAboutInfo } from '@/apis/about';
import { withTranslation } from 'react-i18next';

function About({ globalStore, layoutStore, t }: any) {
  const getData = async () => {
    try {
      const res = await getAboutInfo();
      console.log(res);
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    getData();
  }, []);
  return (
    <div>
      <p>About</p>
      <p>Mobx 测试：{globalStore.theme}</p>
      <p>Mobx 测试：{layoutStore.pathname}</p>
      <p>语言切换测试：{t('methods.hoc')}</p>
    </div>
  );
}

export default withTranslation()(inject(...['globalStore', 'layoutStore'])(observer(About)));
```

三种方式的本质差异：RenderProps（`<Translation>`）适合只在单个局部区域用一次 `t` 函数、不想额外多包一层组件的场景；`useTranslation()` Hook 是函数组件的标准写法，也是目前最推荐的方式；`withTranslation()` 高阶组件是给类组件用的，因为类组件不能直接调用 Hook。

> 💬 **面试官**：React 国际化三种方式（RenderProps/Hook/HOC）你会怎么选？
>
> ✅ 标准答案：新写的函数组件统一用 `useTranslation()` Hook，这是最简洁、最贴合当前 React 代码风格的方式；类组件因为不能用 Hook，只能用 `withTranslation()` 高阶组件包裹；RenderProps 方式（`<Translation>`）用得较少，适合那种只想在某个局部渲染区域临时用一下 `t` 函数、不想为此专门抽出一个组件的场景。
> 🎁 想加分：这三种方式底层共享同一个 i18next 实例和语言状态，切换语言时（`i18n.changeLanguage`）三种写法的组件都会同步感知到变化重渲染——本质上是同一套 Context 机制在三种不同的消费形式下的体现。

---

## 🧩 Antd 按需引入：从手动配置到自动化

```shell
pnpm install antd -S
pnpm i vite-plugin-style-import -D
pnpm i less -D
```

在 `config/plugins` 文件夹中，新建 `styleImport.ts` 文件：

```typescript
import { createStyleImportPlugin, AntdResolve } from 'vite-plugin-style-import';

export default function configStyleImport() {
  return createStyleImportPlugin({
    resolves: [AntdResolve()],
    libs: [
      {
        libraryName: 'antd',
        esModule: true,
        resolveStyle: (name) => {
          return `antd/es/${name}/style/index`;
        },
      },
    ],
  });
}
```

找到 `config/plugins/index.ts` 文件，新增如下代码：

```typescript
import configEslint from './eslint';
import configVisualizer from './visualizer';
import configHtml from './html';
import configCompression from './compression';
import configLegacy from './legacy';
import configMock from './mock';
import configStyleImport from './styleImport';
import { VITE_APP_VISUALIZER } from '../index';

export default function createVitePlugins(command: string) {
  const vitePlugins: any[] = [
    configEslint(),
    configHtml(),
    configCompression(),
    configLegacy(),
    configMock(command),
    configStyleImport(),
  ];
  VITE_APP_VISUALIZER && vitePlugins.push(configVisualizer());
  return vitePlugins;
}
```

Antd 使用，入口文件：

```tsx
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'mobx-react';
import App from '@/App';
import stores from '@/stores';

import '@/index.scss';

ReactDOM.render(
  <Provider {...stores}>
    <App />
  </Provider>,
  document.getElementById('root'),
);
```

后台整体布局：

```tsx
import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { HomeOutlined, DashboardOutlined, UserOutlined } from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { SubMenu } = Menu;

function BasicLayout() {
  return (
    <Layout style={{ height: '100vh' }}>
      <Header>
        <div className="logo">logo</div>
      </Header>
      <Layout>
        <Sider width={200} className="layout-sider">
          <Menu
            mode="inline"
            theme="dark"
            defaultSelectedKeys={['/']}
            style={{ height: '100%', borderRight: 0 }}
            defaultOpenKeys={['/']}
          >
            <Menu.Item key="/" icon={<DashboardOutlined />} title="Dashboard">
              <Link to="/">Dashboard</Link>
            </Menu.Item>
            <SubMenu key="home" icon={<HomeOutlined />} title="首页">
              <Menu.Item key="/home">
                <Link to="/home">home</Link>
              </Menu.Item>
              <Menu.Item key="/home/child">
                <Link to="/home/child">child</Link>
              </Menu.Item>
              <Menu.Item key="/home/child/hello-world">
                <Link to="/home/child/hello-world">hello</Link>
              </Menu.Item>
              <Menu.Item key="/home/child/1234">
                <Link to="/home/child/1234">name</Link>
              </Menu.Item>
            </SubMenu>
            <SubMenu key="about" icon={<UserOutlined />} title="关于">
              <Menu.Item key="/about">
                <Link to="/about">about</Link>
              </Menu.Item>
            </SubMenu>
          </Menu>
        </Sider>
        <Layout className="layout-content">
          <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

export default BasicLayout;
```

参考：搜索关键词 `vbenjs vite-plugin-style-import`。

**这里要给出一个技术选型的更新判断**：`vite-plugin-style-import` 只解决了「样式按需加载」的问题，组件本身还是要手动 `import { Menu } from 'antd'` 逐个引入。这套方案现在也不是唯一选择——Antd 5 起组件库自身内置了 CSS-in-JS 方案（`@ant-design/cssinjs`），样式随组件一起按需生成，很多场景下不再需要额外配置样式按需引入插件；如果仍在用 Antd 4 或者更偏好显式控制主题变量覆盖，`vite-plugin-style-import` 依然是可行方案，但要清楚这是「按需加载样式」而不是「按需加载组件」，组件本身的 Tree Shaking 靠的是 ES Module 静态分析和组件库自身的模块拆分粒度，和这个插件无关。

> 💬 **面试官**：组件库按需引入是怎么做到的？
>
> ✅ 标准答案：按需引入依赖 ES Module 的静态分析——只要组件库本身是按组件拆分导出的（每个组件对应独立文件），构建工具在 Tree Shaking 阶段能识别出哪些组件实际被 `import` 了，未被引用的组件代码不会打进最终产物；样式按需引入则需要额外的插件（如 `vite-plugin-style-import`）根据引入的组件名动态生成对应的样式 `import`，因为传统 CSS 文件不参与 JS 模块的静态分析。
> 🎁 想加分：提到 Antd 5 的 CSS-in-JS 方案从设计上就规避了这个问题——样式和组件绑定在同一份 JS 模块里，只要组件按需引入了，样式自然跟着按需生成，不再需要额外配置样式加载插件，这是组件库设计层面对「按需加载」问题的一次范式转变。

🔧 **真实场景**：医院管理系统涉及的 Antd 组件其实只有二十来个（表格、表单、弹窗、菜单为主），全量引入时 CSS 产物有几百 KB，按需引入后能大幅下降，且新增组件时开发者不需要操心「这个组件要不要手动 import 样式」。

---

## 🧪 测试体系：Jest + Cypress，以及现在的选择

**单元测试**：

```shell
pnpm install @testing-library/jest-dom @testing-library/react @types/jest jest ts-jest identity-obj-proxy -D
```

新增 `jest.config.js` 文件，同 `src` 同级：

```javascript
module.exports = {
  preset: 'ts-jest',
  roots: ['<rootDir>'],
  moduleDirectories: ['node_modules', 'src'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  globals: {
    'ts-jest': {
      // useESM: true,
    },
  },
  transform: {
    '^.+\\.tsx$': 'ts-jest',
    '^.+\\.ts$': 'ts-jest',
  },
  testRegex: '(tests.unit.*.(test|spec)).(jsx?|tsx?)$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*.{ts,tsx,js,jsx}'],
  coverageDirectory: '<rootDir>/coverage/',
  verbose: true,
  testTimeout: 30000,
  testEnvironment: 'jsdom',
  coveragePathIgnorePatterns: ['<rootDir>/node_modules/', '(.*).d.ts$'],
  moduleNameMapper: {
    '^@/(.*)': '<rootDir>/src/$1',
    '^.+\\.module\\.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2|svg)$': 'identity-obj-proxy',
  },
};
```

`.eslintrc.js` 中，新增如下代码：

```javascript
module.exports = {
  ....
  env: {
    ....
    jest: true,
  },
  ....
}
```

脚本配置：

```json
"test": "jest --colors --passWithNoTests",
"test:watch": "jest --watchAll",
"coverage": "jest --coverage",
```

在 `src` 同级新建 `tests` 目录，在 `tests` 目录中继续添加 `unit` 目录，新建 `App.test.tsx` 文件：

```tsx
import React from 'react';
import { render, cleanup, getByTestId } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../src/App';

afterEach(cleanup);

describe('<App />', () => {
  it('renders without errors', () => {
    const { container } = render(<App />);
    // a标签含有data-testid='aNoDisabled',进行检查
    expect(getByTestId(container, 'aNoDisabled')).not.toBeDisabled();
  });
});
```

类型声明，在 `tests` 目录中，新建 `vite-env.d.ts` 文件：

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_APP_TITLE: 'development' | 'test' | 'staging' | 'production';
  VITE_API_HOST: string;
}
```

**E2E 测试**：

```shell
pnpm install @types/cypress cypress -D
```

新增 `cypress.json` 文件，同 `src` 同级：

```javascript
{
  "pluginsFile": "tests/e2e/plugins/index.ts",
  "video":false
}
```

在 `src` 同级新建 `tests` 目录，在 `tests` 目录中继续添加 `e2e` 目录，新建 `plugins/index.ts` 文件：

```typescript
module.exports = (on: any, config: any) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config
  return Object.assign({}, config, {
    // fixtures路径
    fixturesFolder: 'tests/e2e/fixtures',
    // 测试脚本文件夹
    integrationFolder: 'tests/e2e/specs',
    // 从 cy.screenshot() 命令或在 cypress 运行期间测试失败后保存屏幕截图的文件夹路径
    screenshotsFolder: 'tests/e2e/screenshots',
    // cypress 运行期间保存视频的文件夹路径
    videosFolder: 'tests/e2e/videos',
    // 在加载测试文件之前加载的文件路径。 这个文件被编译和捆绑。 （通过 false 禁用）
    supportFile: 'tests/e2e/support/index.ts',
  });
};
```

在 `src` 同级新建 `tests` 目录，在 `tests` 目录中继续添加 `e2e` 目录，新建 `support/index.ts` 文件：

```typescript
module.exports = {};
```

脚本配置：

```json
"test": "npm run test:unit && npm run test:e2e",
"test:unit": "jest --colors --passWithNoTests",
"test:watch": "jest --watchAll",
"test:coverage": "jest --coverage",
"test:e2e": "cypress open",
"test:e2e-run": "cypress run ",
```

新建 `specs/index.specs.tsx` 文件：

```tsx
describe('home', () => {
  it('button click', () => {
    cy.visit('http://localhost:3001');
    cy.contains('main div', 'Index');
  });
});
```

类型声明，新建 `vite-env.d.ts` 文件：

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_APP_TITLE: 'development' | 'test' | 'staging' | 'production';
  VITE_API_HOST: string;
}

declare const cy: any;
```

**这里要给出明确的技术升级建议**：在 Vite 项目里配 Jest，本质是在用两条平行的编译链路——Vite 用它自己的转换机制跑开发/构建，Jest 又要单独配 `ts-jest` 走一条完全独立的转换链路，两条链路的模块解析、别名处理、TS 编译选项都要维护两份，很容易出现「业务代码能跑，测试跑不起来」的配置漂移问题。

现在的标配是 **Vitest**——它是 Vite 官方生态的测试框架，直接复用 Vite 的转换插件链和配置（`resolve.alias` 直接生效，不用重新配一遍 `moduleNameMapper`），API 基本兼容 Jest（`describe`/`test`/`expect` 语法几乎不用改），配合 `@testing-library/react` 测试 React 组件：

```shell
pnpm install -D vitest jsdom @testing-library/react
```

```typescript
// vite.config.ts 追加 test 字段
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

```tsx
// tests/unit/HelloWorld.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HelloWorld from '@/components/HelloWorld'; // 👈 alias 直接复用，不用单独配 moduleNameMapper

describe('HelloWorld', () => {
  it('renders msg prop', () => {
    render(<HelloWorld msg="hello" />);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
```

对比能看出核心差异：Jest 版本需要单独处理 `@` 别名（`moduleNameMapper`）、单独处理 `.module.scss` 的 mock（`identity-obj-proxy`）；Vitest 直接吃 `vite.config.ts` 里已经配好的一切，配置量大幅下降。

E2E 测试这边，`cypress.json` 是 Cypress 9 及以前的配置文件格式，Cypress 10+ 已经改用 `cypress.config.ts`，配置结构和插件系统都有较大调整（`pluginsFile` 被移除，改用 `setupNodeEvents`）：

```typescript
// cypress.config.ts（Cypress 10+ 写法）
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3001',
    specPattern: 'tests/e2e/specs/**/*.cy.ts',
    supportFile: 'tests/e2e/support/index.ts',
  },
});
```

> 💬 **面试官**：怎么解决 jest 单元测试不支持 `import.meta.env` 的问题？
>
> ✅ 标准答案：Jest 跑在 Node/CommonJS 环境里，`import.meta` 是 ES Module 独有的语法，Jest 默认的转换器识别不了；一种做法是给 `import.meta.env` 相关代码单独 mock 或用 `babel-plugin-transform-vite-meta-env` 这类插件转换，另一种更彻底的做法是直接换成 Vitest——它本身跑在 Vite 的转换链路上，`import.meta.env` 是原生支持的，不需要额外处理。
> 🎁 想加分：这正是笔记原文自己在 TODO LIST 里标注的「待解决问题」——本质上是 Jest 和 Vite 两套编译链路不兼容导致的，选 Vitest 而不是继续给 Jest 打补丁，是从根源上解决这类问题的方式。

---

## 📁 目录结构：职责分离原则的落地

```plain
├─.vscode           // vscode配置文件
├─config            // vite配置文件
├─coverage          // jest coverage
├─dist              // 打包输出文件
├─doc               // 文档
├─tests             // 测试文件
├─mock              // mock apu存放地址，和apis对应
│  └─modules
├─src               // 代码源文件目录
│  ├─apis           // apis统一管理
│  │  └─modules     // api模块
│  ├─assets         // 静态资源
│  │  └─images
│  ├─components     // 项目组件目录
│  │  ├─Icon
│  │  ├─Charts
│  │  ├─Message
│  ├─hooks          // hooks目录
│  ├─layouts        // 布局组件
│  │  ├─dashboard
│  │  │  ├─content
│  │  │  ├─header
│  │  │  └─sider
│  │  └─fullpage
│  ├─locales         // 国际化配置文件
│  ├─pages           // 页面目录地址
│      ├─home
│      └─about
│  ├─routes          // 路由相关
│  │  └─routes
│  ├─service         // axios 封装
│  │  └─request
│  ├─stores          // 状态管理相关
│  ├─styles          // 样式相关
│  ├─types           // 类型定义相关
│  ├─utils           // 工具类相关
└─template            // 模板相关
    ├─apis
    └─page
```

这套目录结构背后是**关注点分离**原则的具体落地：`apis` 只管接口定义、`service` 只管请求基础设施、`stores` 只管全局状态、`routes` 只管路由声明、`hooks` 只管可复用逻辑——每一层只对自己的职责负责，页面（`pages`）作为组装者，把这些独立的关注点拼装成一个具体的页面功能。这种结构的价值在项目规模变大之后才会真正体现：新人接手时，「接口坏了去 `apis`/`service`」「状态不对去 `stores`」「样式问题去对应组件或 `styles`」，问题定位有明确路径，不需要靠猜。

> 💬 **面试官**：后台管理系统的目录结构一般按什么原则划分？
>
> ✅ 标准答案：按技术职责横向划分（apis/stores/routes/hooks/components 各管一类关注点），是目前最主流的方式，适合中小型项目；项目规模变大后，也可以叠加按业务模块纵向划分（每个业务模块下再有自己的 components/apis/hooks），两种划分方式经常混用——公共基础设施横向管理，业务特有逻辑就近放在业务模块目录下。
> 🎁 想加分：提到目录结构的选择本质是在优化「查找代码的路径」和「修改代码的影响范围」这两个变量，横向划分查找路径清晰但改一个业务功能要跨多个目录改文件，纵向划分改动集中但公共逻辑容易在各业务模块里重复出现，没有绝对最优解，要看团队规模和业务耦合度。

---

## 🏗️ 从单体到 Monorepo：Turborepo + pnpm workspace 架构升级

前面十三个章节搭起来的是一个**单体应用**——所有代码在一个 `package.json` 里，一个 `apps/admin` 装下所有页面。这套脚手架本身没问题，但当医院管理系统这类项目发展到需要拆出独立的组件库给多个内部系统共享（比如医院管理系统和另一个「药品供应链系统」都要用同一套按钮、表格、图表组件），或者需要多团队并行开发不同模块又要共享同一套 CI/构建流水线时，单体结构会开始出现两类典型问题：**组件库改动只能通过发 npm 包 + 各应用手动升级版本号来同步**（协作链路长），**每次 CI 跑全量 `build`/`test` 都要重新走一遍所有模块**（构建时间线性增长，不管你改的是一行 CSS 还是核心业务逻辑）。这正是 Monorepo（单一仓库管理多个包）要解决的问题，本章是本文和 Vue 3 姊妹篇唯一没有对应笔记依据的**补充章节**，按 Turborepo + pnpm workspace 当前的最佳实践来搭。

**目录规划**：把单体项目升级为 Monorepo，第一步是拆分 `apps/`（可独立运行的应用）和 `packages/`（被多个应用共享的包）：

```plain
vite-react-ts/
├─ apps/
│  └─ admin/              // 承接前 13 章的全部脚手架能力，医院管理系统本体
├─ packages/
│  ├─ ui/                 // 跨应用复用的基础组件（按钮/表格/图表等）
│  └─ request/            // 统一请求实例封装，复用第「请求层封装」章节的 Request 类设计
├─ pnpm-workspace.yaml
├─ turbo.json
└─ package.json
```

`pnpm-workspace.yaml` 声明工作区范围：

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

`turbo.json` 声明任务依赖图：

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

`packages/ui` 的最小实现，暴露一个基础按钮组件供 `apps/admin` 复用：

```typescript
// packages/ui/src/Button.tsx
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'primary' | 'default';
}

export function Button({ children, onClick, type = 'default' }: ButtonProps) {
  return (
    <button className={`ui-button ui-button--${type}`} onClick={onClick}>
      {children}
    </button>
  );
}
```

```json
// packages/ui/package.json
{
  "name": "@vite-react-ts/ui",
  "version": "0.0.1",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

`packages/request` 复用前面「请求层封装」章节的 `Request` 类思路，把它从 `apps/admin/src/service` 挪成一个独立包：

```json
// packages/request/package.json
{
  "name": "@vite-react-ts/request",
  "version": "0.0.1",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "axios": "^1.6.0",
    "nprogress": "^0.2.0"
  }
}
```

`apps/admin` 通过 `workspace:*` 协议引用这两个包：

```json
// apps/admin/package.json
{
  "name": "@vite-react-ts/admin",
  "dependencies": {
    "@vite-react-ts/ui": "workspace:*",
    "@vite-react-ts/request": "workspace:*"
  }
}
```

`workspace:*` 让 pnpm 直接用符号链接指向本地包目录，而不是去 npm 仓库下载——这意味着改动 `packages/ui` 里的组件代码，`apps/admin` 里立刻能感知到变化（配合 Vite 的 HMR），不需要任何发包、升级版本号的中间步骤，这就是 Monorepo 相比多仓库方案在协作效率上最直接的收益。

Turborepo 的任务图与缓存机制值得讲透原理：`turbo.json` 里 `"dependsOn": ["^build"]` 这个 `^` 符号表示「先构建我依赖的包」——`apps/admin` 依赖 `packages/ui`，Turborepo 会先跑 `packages/ui` 的 `build` 任务，成功后才跑 `apps/admin` 的 `build`，这就是「任务图」。而**缓存命中判断**靠的是对任务的输入（源文件内容、依赖的 `package.json` 版本、相关环境变量）做哈希计算——如果这次任务的输入哈希和上一次成功执行时的哈希完全一致，Turborepo 直接把上次的 `outputs`（比如 `dist/**`）恢复出来，不重新执行任务本体，这就是「重复构建能做到秒级完成」的原理，本质是一种更细粒度、基于内容而非基于时间戳的增量构建。

pnpm workspace 的依赖管理原理是另一个常考点：npm/yarn 早期用「扁平化提升」策略——把所有包的依赖尽量提升到根 `node_modules` 顶层，这样 A 包即使没有显式声明依赖 B 包，只要 B 包被提升到了顶层，A 包 `require('B')` 也能"意外地"找到它，这就是「幽灵依赖」（未声明却能访问到的依赖，一旦某天依赖树变化，B 包不再被提升，A 包会毫无预警地报错）。pnpm 用**内容寻址存储 + 符号链接**的方式从机制上避免了这个问题：所有包的实际内容只存一份在全局的 `.pnpm` 仓库里（按内容 hash 寻址，同一版本的包无论被多少个项目依赖，物理上只占一份磁盘空间），每个项目的 `node_modules` 里只放**该项目显式声明依赖的包**的符号链接，链接指向 `.pnpm` 仓库里的真实位置——嵌套依赖也是通过符号链接层层指向，不会被提升到顶层。这意味着如果代码里 `import` 了一个没在 `package.json` 里声明的包，pnpm 的 `node_modules` 结构里根本找不到这个包的符号链接，会直接报错，从而在安装阶段就杜绝了幽灵依赖的产生。

> 💬 **面试官**：Turborepo 缓存机制怎么判断「任务是否需要重新执行」？
>
> ✅ 标准答案：对任务的输入做内容哈希——包括这个包自身的源文件内容、依赖包的版本、相关的环境变量，把这个哈希值和历史记录比对，如果完全一致就直接从缓存恢复 `outputs`，跳过任务本体的执行；如果任意一项输入变化了，哈希就会变化，触发重新执行。
> 🎁 想加分：提到这套缓存机制不仅本地生效，配合远程缓存（Vercel Remote Cache 或自建缓存服务器）还能在团队成员之间、CI 流水线之间共享缓存——A 同事本地跑过的构建结果，B 同事拉取代码后如果输入哈希一致，可以直接复用 A 的构建产物，不需要重新跑一遍。

> 💬 **面试官**：pnpm 的符号链接结构怎么避免「幽灵依赖」？
>
> ✅ 标准答案：pnpm 的 `node_modules` 只包含项目 `package.json` 里显式声明的依赖对应的符号链接，不做 npm/yarn 那种「扁平化提升」；即使某个未声明的包因为是其他依赖的间接依赖而存在于 `.pnpm` 仓库里，由于项目根 `node_modules` 没有指向它的符号链接，代码里 `import` 它会直接报错找不到模块，从机制上强制要求「用什么就要显式声明依赖什么」。
> 🎁 想加分：补充「内容寻址存储」带来的附带收益——同一版本的依赖包在磁盘上只物理存储一份，多个项目、多个 workspace 包共享引用，相比 npm/yarn 每个项目 `node_modules` 都拷贝一份完整依赖树，大型 Monorepo 下能节省大量磁盘空间和安装时间。

有了这套 Monorepo 骨架，`apps/admin` 就可以承接前 13 章搭好的全部脚手架能力（Eslint/Prettier/Vite 配置/CSS/路由/请求层/Mock/i18n/Antd/测试），在此基础上搭建医院管理系统的具体业务页面。登录页：

```tsx
// apps/admin/src/pages/login/_index.tsx
import React, { useState } from 'react';
import { Form, Input, Button, Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import { login } from '@/apis/auth';

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values);
      navigate('/patients');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="医院管理系统登录" style={{ width: 400, margin: '100px auto' }}>
      <Form onFinish={onFinish}>
        <Form.Item name="username" rules={[{ required: true, message: '请输入工号' }]}>
          <Input placeholder="工号" />
        </Form.Item>
        <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
          <Input.Password placeholder="密码" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          登录
        </Button>
      </Form>
    </Card>
  );
}

export default LoginPage;
```

患者列表页：

```tsx
// apps/admin/src/pages/patients/_index.tsx
import React from 'react';
import { Table, Tag } from 'antd';
import { useRequest } from '@/hooks/useRequest';
import { getPatientList } from '@/apis/patient';

const columns = [
  { title: '姓名', dataIndex: 'name' },
  { title: '床号', dataIndex: 'bedNo' },
  {
    title: '状态',
    dataIndex: 'status',
    render: (status: string) => <Tag color={status === '在院' ? 'green' : 'default'}>{status}</Tag>,
  },
];

function PatientListPage() {
  const { data, loading } = useRequest(getPatientList);

  return <Table rowKey="id" columns={columns} dataSource={data} loading={loading} />;
}

export default PatientListPage;
```

处方审核页：

```tsx
// apps/admin/src/pages/prescriptions/_index.tsx
import React from 'react';
import { Table, Button, Space, message } from 'antd';
import { useRequest } from '@/hooks/useRequest';
import { getPrescriptionList, approvePrescription } from '@/apis/prescription';

function PrescriptionReviewPage() {
  const { data, loading, refresh } = useRequest(getPrescriptionList);

  const handleApprove = async (id: string) => {
    await approvePrescription(id);
    message.success('审核通过');
    refresh();
  };

  const columns = [
    { title: '处方单号', dataIndex: 'id' },
    { title: '患者', dataIndex: 'patientName' },
    { title: '药品', dataIndex: 'drugName' },
    {
      title: '操作',
      render: (_: any, record: { id: string }) => (
        <Space>
          <Button type="link" onClick={() => handleApprove(record.id)}>
            审核通过
          </Button>
        </Space>
      ),
    },
  ];

  return <Table rowKey="id" columns={columns} dataSource={data} loading={loading} />;
}

export default PrescriptionReviewPage;
```

这三个业务页面用到的 `useRequest` Hook，正是下一章要讲透的自定义 Hook 插件化设计——先在这里留一个钩子，看完下一章你会发现这个 `useRequest` 调用背后藏着一整套可插拔的能力。

Monorepo 下的状态管理选型也要重新考量（承接第 11 篇结论）：单体阶段 Mobx 的 `Provider` 注入模式足够用，但升级到 Monorepo、多团队协作后，如果 `packages/ui` 里的组件需要感知全局状态（比如一个通用的「全屏加载」组件要读取全局 loading 状态），Mobx 的 `inject`/`observer` 模式要求组件树里必须有对应的 `Provider` 包裹，跨包复用时容易出现「这个组件在另一个应用里用，忘了包 Provider」的运行时报错；Redux Toolkit 的 `store` 是显式创建、显式传递的单一实例，配合 `Provider` 同样需要包裹，但 RTK 的 `createSlice`/`createAsyncThunk` 生成的 action/reducer 更容易被多个应用共享测试用例和类型定义，对大型多团队协作场景的可预测性更友好；如果团队规模较小、更看重开发效率，Zustand 不需要 `Provider`、直接调用 hook 取状态，跨包复用的心智负担最低。三者选型对比：

| 方案 | Provider 依赖 | 跨包复用友好度 | 适用规模 |
|---|---|---|---|
| Mobx | 需要 | 中，依赖运行时 context 查找 | 单体或小型 Monorepo |
| Redux Toolkit | 需要 | 高，action/reducer 类型可共享测试 | 多团队协作的中大型 Monorepo |
| Zustand | 不需要 | 高，直接 import hook 调用 | 心智负担优先、中小型项目 |

🔧 **真实场景**：医院管理系统从单体升级为 Monorepo 后，同一家医疗集团下的「药品供应链系统」也需要用到同一套 `Button`/`Table` 封装组件——升级前，这意味着要把 `packages/ui` 发成一个 npm 私有包，药品供应链系统那边手动 `npm install` 升级版本号，组件库改一次样式，两边团队要来回沟通发版和升级节奏；升级到 Monorepo 后，如果药品供应链系统也纳入同一个 workspace，`packages/ui` 的改动通过符号链接实时生效，两个团队在同一个 PR 里就能看到组件改动对两个应用的影响，不再需要跨仓库的发版协调。

---

## 🔌 自定义 Hook 插件化设计：useRequest 源码精讲

上一章的患者列表页、处方审核页都用到了 `useRequest` 这个 Hook——它是 ahooks 库里最常用的一个，React 项目里的网络请求场景基本用它就够了。这一章不讲"怎么用"（用法和 Antd 的 `Table`/`Form` 搭配没什么特殊之处），要讲透的是它的**设计**：为什么一个请求 Hook 能同时支持自动请求、轮询、防抖、节流、错误重试、SWR 缓存这么多能力，却不会让核心代码变成一团乱麻。答案是**插件化架构**——这是本章要讲透的核心，也是本文唯一一处从「怎么搭脚手架」切换到「怎么设计一个可扩展的 Hook」的章节。

### 核心状态机：一个精简的 Fetch 类

`useRequest` 的核心不是 Hook 本身，而是一个普通的 TypeScript 类 `Fetch`，负责管理请求的状态（`data`/`loading`/`error`/`params`）和执行流程：

```typescript
// Fetch.ts —— 核心状态机
class Fetch {
  count = 0; // 请求计数器，竞态处理的关键

  constructor(service, options, subscribe, initialState = {}) {
    this.service = service; // 请求服务函数（用 useLatest 包过的 ref）
    this.options = options; // 请求配置项
    this.subscribe = subscribe; // 触发组件重新渲染的回调函数
    this.state = { data: null, loading: !options.manual, error: null, params: null, ...initialState };
  }

  setState(state = {}) {
    this.state = { ...this.state, ...state };
    this.subscribe(); // 通知组件更新
  }

  run(...params) {
    this.runAsync(...params).catch((error) => {
      if (!this.options.onError) {
        console.error(error);
      }
    });
  }

  async runAsync(...params) {
    this.count += 1;
    const currentCount = this.count; // 记住这次请求发起时的 fetchId
    try {
      const { stopNow, returnNow, ...state } = this.runPluginHandler('onBefore', params);
      if (stopNow) {
        return new Promise(() => {}); // 插件要求终止本次请求（比如 ready=false）
      }
      this.options?.onBefore?.(params);
      this.setState({ loading: true, params, ...state });

      if (returnNow) {
        return new Promise(() => {}); // 插件直接给出了结果（比如缓存命中且在保鲜期内）
      }

      let { servicePromise } = this.runPluginHandler('onRequest', this.service.current, params);
      if (!servicePromise) {
        servicePromise = this.service.current(...params);
      }
      const data = await servicePromise;

      if (currentCount !== this.count) {
        return new Promise(() => {}); // 👈 竞态处理核心：结果返回时不是最新一次请求，直接忽略
      }
      this.setState({ data, loading: false, error: null, params });
      this.options?.onSuccess?.(data, params);
      this.runPluginHandler('onSuccess', data, params);
      this.options?.onFinally?.(params, data);
      if (currentCount === this.count) {
        this.runPluginHandler('onFinally', params, data, null);
      }
    } catch (error) {
      if (currentCount !== this.count) {
        return new Promise(() => {});
      }
      this.setState({ error, loading: false, data: null, params });
      this.options?.onError?.(error);
      this.runPluginHandler('onError', error);
      this.options?.onFinally?.(params, null, error);
      if (currentCount === this.count) {
        this.runPluginHandler('onFinally', params, null, error);
      }
      throw error;
    }
  }

  refresh() {
    this.run(...(this.state.params || []));
  }

  refreshAsync() {
    this.runAsync(...(this.state.params || []));
  }

  mutate(data) {
    this.runPluginHandler('onMutate', data);
    this.setState({ data });
  }

  cancel() {
    this.count += 1; // 竖起一道"墙"：之前发出的请求即使返回了，currentCount 也不再等于 this.count
    this.setState({ loading: false });
    this.options?.onCancel?.();
    this.runPluginHandler('onCancel');
  }

  runPluginHandler(event, ...rest) {
    const r = this.pluginImpls.map((i) => i[event]?.(...rest)).filter(Boolean);
    return Object.assign({}, ...r);
  }
}

export default Fetch;
```

`useRequestImplement` 把这个类接到 React 的渲染周期上：

```typescript
import useLatest from '../../useLatest';
import useUpdate from '../../useUpdate';
import useCreation from '../../useCreation';
import useMount from '../../useMount';
import useMemoizedFn from '../../useMemoizedFn';
import useUnmount from '../../useUnmount';
import Fetch from './Fetch';

function useRequestImplement(service, options, plugins) {
  const { manual = false, ...rest } = options;
  const fetchOptions = { manual, ...rest };
  const serviceRef = useLatest(service); // 保持 service 的最新引用，避免闭包陷阱
  const update = useUpdate(); // 触发组件更新的函数

  // 创建 Fetch 实例，useCreation 保证只在首次渲染时创建一次（类似 useMemo 但引用更稳定）
  const fetchInstance = useCreation(() => {
    const initialStates = plugins.map((p) => p?.onInit?.(fetchOptions))?.filter(Boolean);
    return new Fetch(serviceRef, fetchOptions, update, Object.assign({}, ...initialStates));
  }, []);

  fetchInstance.options = fetchOptions;
  fetchInstance.pluginImpls = plugins.map((p) => p(fetchInstance, fetchOptions)); // 👈 每个插件是一个 Hook

  useMount(() => {
    if (!manual) {
      const params = fetchInstance.state.params || options.defaultParams || [];
      fetchInstance.run(...params);
    }
  });

  useUnmount(() => {
    fetchInstance.cancel();
  });

  const { state } = fetchInstance;
  return {
    ...state,
    run: useMemoizedFn((...args) => fetchInstance.run(...args)),
    runAsync: useMemoizedFn((...args) => fetchInstance.runAsync(...args)),
    refresh: useMemoizedFn(() => fetchInstance.refresh()),
    refreshAsync: useMemoizedFn(() => fetchInstance.refreshAsync()),
    mutate: useMemoizedFn((data) => fetchInstance.mutate(data)),
    cancel: useMemoizedFn(() => fetchInstance.cancel()),
  };
}

export default useRequestImplement;
```

这里有三个配角 Hook 值得点一下：`useLatest` 用一个 `ref` 包住随时可能变化的 `service` 函数，避免异步请求发出后、组件重渲染导致闭包里的 `service` 是旧版本；`useCreation` 类似 `useMemo`，但不会因为 React 未来版本"可能重新计算 memo 值"的语义变化而重新创建实例，保证 `Fetch` 实例整个组件生命周期内引用稳定；`useMemoizedFn` 返回一个永远不变的函数引用，内部转发调用到最新的闭包逻辑上，理论上可以完全代替 `useCallback`。

### fetchId 竞态处理：为什么比 AbortController 更轻量

「请求竞态」问题是这样产生的：一个组件先发起了请求 A（比如根据患者 ID 1 查详情），还没等 A 返回，用户又切换到了患者 ID 2，组件发起了请求 B；如果网络环境不稳定，完全可能出现 **B 先返回、A 后返回**的情况——如果没有任何处理，A 的结果会覆盖 B 的结果，界面上显示的是"患者 2 的页面，患者 1 的数据"，这是一个很容易被测试环境忽略、但线上环境网络抖动时必然出现的 bug。

`Fetch` 类用一个自增的 `count` 字段解决这个问题：每次 `runAsync` 执行开头 `this.count += 1`，并把这一刻的 `count` 值记在局部变量 `currentCount` 里；等到 `await servicePromise` 真正返回时，再对比 `currentCount !== this.count`——如果这次请求执行期间，`Fetch` 实例又发起了新的请求（`count` 被再次 `+1`），那么"当前正在处理结果的这次请求"就已经不是最新的一次，直接 `return new Promise(() => {})`（一个永远不会 resolve/reject 的 Promise，让这次调用彻底"哑火"，不触发任何 `setState`）。

对比 `AbortController` 的方案：`AbortController` 需要请求本身支持被真正中断（`fetch` 原生支持，很多第三方 SDK 或非网络的异步操作不支持），且需要维护一个「当前活跃的 controller」引用，取消时调用 `abort()`；`fetchId` 方案完全不关心请求本身能不能被物理中断，只关心"这次请求的结果，是不是还对应着最新一次调用"——一个纯粹的自增计数器比较，代码量和心智负担都更小，代价是**请求本身仍然会在网络层面完整地跑完**，只是结果被静默丢弃，不适合那种"必须真正终止网络传输"的场景（比如大文件上传）。

> 💬 **面试官**：请求竞态问题是怎么产生的？`fetchId` 机制相比 `AbortController` 有什么优劣？
>
> ✅ 标准答案：竞态问题产生于"后发的请求先返回"——如果不做处理，先发的请求的响应会覆盖后发请求的响应，导致界面显示的数据和当前状态不匹配。`fetchId`（自增计数器）方案在结果返回时判断"当前计数是否还是最新"，不是最新就丢弃结果；`AbortController` 是真正在网络层面中断请求。
> 🎁 想加分：`fetchId` 方案不依赖请求本身是否支持中断，适用面更广（任意异步操作都能套用这套判断逻辑），但请求本身的网络流量并没有被节省；`AbortController` 能真正省流量、省服务端资源，但要求底层请求实现支持 `signal` 参数。生产级方案里，两者经常一起用——`AbortController` 负责真正终止请求，`fetchId` 负责兜底那些不支持中断的异步操作。

### 插件系统：小核心 + 可插拔能力模块

`useRequest` 真正的高级功能（防抖、节流、轮询、缓存、竞态处理之外的能力）全部不在 `Fetch` 类里实现，而是通过**插件**挂载。每个插件是一个接收 `(fetchInstance, options)` 的自定义 Hook，返回一组生命周期钩子：

```typescript
// plugins/useLoggerPlugin.ts —— 最简单的插件示例，用来说明插件的形状
function useLoggerPlugin(fetchInstance, options) {
  return {
    onBefore(params) {
      return { id: options.id };
    },
    onRequest(service, params) {
      return null; // 返回 null 表示不介入请求本身，或返回 { servicePromise } 替换成新的 Promise
    },
    onSuccess(data, params) {},
    onError(error) {},
    onFinally(params, data, error) {},
    onCancel() {},
    onMutate(data) {},
  };
}

useLoggerPlugin.onInit = (options) => {
  return { ...options, logger: true }; // onInit 决定 Fetch 实例的初始状态
};

export default useLoggerPlugin;
```

`Fetch.runPluginHandler(event, ...rest)` 遍历所有插件实例，调用它们对应事件的钩子，把每个插件返回的对象**合并**成一份最终结果——这就是为什么 `onBefore` 可以返回 `{ stopNow: true }` 来终止请求（`useAutoPlugin` 用来实现 `ready=false` 时不发请求），也可以返回 `{ data: cacheData }` 来提前给出结果（`useCachePlugin` 用来实现 SWR）。八个生命周期钩子 `onBefore`/`onRequest`/`onSuccess`/`onError`/`onFinally`/`onCancel`/`onMutate`/`onInit` 覆盖了请求生命周期的每一个阶段，插件只需要关心自己需要介入的那一两个阶段，不需要理解整个 `Fetch` 类的完整实现。

**Loading Delay 插件**——延迟 `loading` 变成 `true` 的时间，避免请求速度快时的闪烁：

```typescript
import { useRef } from 'react';

function useLoadingDelayPlugin(fetchInstance, options) {
  const { loadingDelay } = options;
  const timerRef = useRef(null);

  if (!loadingDelay) {
    return {};
  }

  const cancelTimeout = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  return {
    onBefore(params) {
      timerRef.current = setTimeout(() => {
        fetchInstance.setState({ loading: true });
      }, loadingDelay);
      return { loading: false }; // 先不显示 loading，等 delay 时间到了再显示
    },
    onFinally() {
      cancelTimeout();
    },
    onCancel() {
      cancelTimeout();
    },
  };
}

export default useLoadingDelayPlugin;
```

**轮询插件**——`pollingInterval` 定时重新发起请求，`pollingWhenHidden` 控制页面隐藏时是否继续轮询：

```typescript
import { useRef } from 'react';
import useUpdateEffect from '../../../useUpdateEffect';
import isDocumentVisible from '../../../utils/isDocumentVisible';
import subscribeReVisible from '../../../utils/subscribeReVisible';

function usePollingPlugin(fetchInstance, options) {
  const { pollingInterval, pollingWhenHidden } = options;
  const timeRef = useRef();
  const unsubscribeRef = useRef(null);

  const stopPolling = () => {
    if (timeRef.current) {
      clearTimeout(timeRef.current);
    }
    unsubscribeRef.current?.();
  };

  useUpdateEffect(() => {
    if (!pollingInterval) {
      stopPolling();
    }
  }, [pollingInterval]);

  if (!pollingInterval) {
    return {};
  }

  return {
    onBefore: () => {
      stopPolling();
    },
    onFinally: () => {
      // 页面不可见且不允许后台轮询时，订阅"重新可见"事件，恢复轮询而不是持续空转
      if (!pollingWhenHidden && !isDocumentVisible()) {
        unsubscribeRef.current = subscribeReVisible(() => fetchInstance.refresh());
        return;
      }
      timeRef.current = setTimeout(() => {
        fetchInstance.refresh();
      }, pollingInterval);
    },
    onCancel: () => {
      stopPolling();
    },
  };
}

export default usePollingPlugin;
```

**自动请求/Ready 插件**——`ready=false` 时永远不发请求，`ready` 从 `false` 变 `true` 时自动补一次请求，`refreshDeps` 变化时自动 `refresh`：

```typescript
import { useRef } from 'react';
import useUpdateEffect from '../../../useUpdateEffect';

function useAutoPlugin(fetchInstance, options) {
  const { ready = true, manual = false, defaultParams, refreshDeps = [], refreshDepsAction } = options;
  const hasAutoRun = useRef(false);
  hasAutoRun.current = false;

  useUpdateEffect(() => {
    if (ready && !manual) {
      hasAutoRun.current = true;
      fetchInstance.run(...defaultParams);
    }
  }, [ready]);

  useUpdateEffect(() => {
    if (hasAutoRun.current) {
      return;
    }
    if (!manual) {
      hasAutoRun.current = true;
      if (refreshDepsAction) {
        refreshDepsAction();
      } else {
        fetchInstance.refresh();
      }
    }
  }, [...refreshDeps]);

  return {
    onBefore() {
      if (!ready) {
        return { stopNow: true }; // 👈 onBefore 返回 stopNow，Fetch.runAsync 里读到就直接终止
      }
    },
  };
}

useAutoPlugin.onInit = (options) => {
  const { ready = true, manual = false } = options;
  return { loading: ready && !manual };
};

export default useAutoPlugin;
```

**屏幕聚焦重新请求插件**——窗口 `refocus` 或 `revisible` 时自动 `refresh`，配合 `limit` 做节流避免短时间内重复触发：

```typescript
import { useEffect, useRef } from 'react';
import subscribeFocus from '../../../utils/subscribeFocus';
import useUnmount from '../../../useUnmount';
import limit from '../../../utils/limit';

function useRefreshOnWindowFocus(fetchInstance, options) {
  const { refreshOnWindowFocus, focusTimespan = 5000 } = options;
  const unsubscribeRef = useRef();
  const stopSubscribe = () => {
    unsubscribeRef.current?.();
  };

  useEffect(() => {
    if (refreshOnWindowFocus) {
      const limitRefresh = limit(fetchInstance.refresh.bind(fetchInstance), focusTimespan);
      unsubscribeRef.current = subscribeFocus(() => {
        limitRefresh();
      });
    }
    return stopSubscribe;
  }, [refreshOnWindowFocus, focusTimespan]);

  useUnmount(stopSubscribe);

  return {};
}

export default useRefreshOnWindowFocus;
```

**防抖插件**——`debounceWait` 内频繁触发 `run`/`runAsync`，只有最后一次真正发起请求，实现方式是替换 `fetchInstance.runAsync` 本身：

```typescript
import { useEffect, useRef } from 'react';

function useDebouncePlugin(fetchInstance, options) {
  const { debounceWait = 500 } = options;
  const debounceRef = useRef();

  useEffect(() => {
    if (debounceWait) {
      const originalRunAsync = fetchInstance.runAsync.bind(fetchInstance);
      debounceRef.current = debounce((cb) => cb(), debounceWait);
      fetchInstance.runAsync = (...args) => {
        return new Promise((resolve, reject) => {
          debounceRef.current?.(() => {
            originalRunAsync(...args).then(resolve).catch(reject);
          });
        });
      };
    }
  }, [debounceWait]);

  return {};
}

function debounce(fn, wait) {
  let timeout = null;
  return function (...args) {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      fn.apply(this, args);
    }, wait);
  };
}

export default useDebouncePlugin;
```

**节流插件**——原理和防抖插件几乎一致，区别只在具体的时间控制函数：

```typescript
import { useEffect, useRef } from 'react';

function useThrottlePlugin(fetchInstance, options) {
  const { throttleWait } = options;
  const throttleRef = useRef();
  useEffect(() => {
    if (throttleWait) {
      const originalRunAsync = fetchInstance.runAsync.bind(fetchInstance);
      throttleRef.current = throttle((cb) => cb(), throttleWait);
      fetchInstance.runAsync = (...args) => {
        return new Promise((resolve, reject) => {
          throttleRef.current?.(() => {
            originalRunAsync(...args).then(resolve).catch(reject);
          });
        });
      };
    }
  }, [throttleWait]);

  return {};
}

function throttle(fn, wait) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime > wait) {
      fn.apply(this, args);
      lastTime = now;
    }
  };
}

export default useThrottlePlugin;
```

**错误重试插件**——失败后按指数退避（或固定间隔）自动重试，达到 `retryCount` 次数上限后停止：

```typescript
import { useRef } from 'react';

function useRetryPlugin(fetchInstance, options) {
  const { retryCount, retryInterval } = options;
  const timerRef = useRef();
  const countRef = useRef();
  const triggerByRetry = useRef(false);

  if (!retryCount) return {};

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  return {
    onBefore() {
      if (!triggerByRetry.current) {
        countRef.current = 0;
      }
      clearTimer();
    },
    onSuccess() {
      countRef.current = 0;
    },
    onError() {
      countRef.current += 1;
      if (countRef.current <= retryCount || retryCount === -1) {
        // 没显式指定 retryInterval 时，用指数退避策略，最长不超过 30s
        const timeout = retryInterval || Math.min(30000, 1000 * 2 ** countRef.current);
        timerRef.current = setTimeout(() => {
          triggerByRetry.current = true;
          fetchInstance.refresh();
        }, timeout);
      } else {
        clearTimer();
        countRef.current = 0;
      }
    },
    onCancel() {
      clearTimer();
      countRef.current = 0;
    },
  };
}

export default useRetryPlugin;
```

**缓存插件——SWR 的完整实现**，是插件系统里逻辑最复杂、也最能体现"插件能改变核心行为"的一个：

```typescript
import { useRef } from 'react';
import useCreation from '../../../useCreation';
import * as cache from '../../../utils/cache';
import * as cachePromise from '../../../utils/cachePromise';
import * as cacheSubscribe from '../../../utils/cacheSubscribe';

function useCachePlugin(fetchInstance, options) {
  const { cacheKey, staleTime = 0, setCache: customSetCache, getCache: customGetCache } = options;
  const currentPromiseRef = useRef();
  const unSubscribeRef = useRef();

  const _setCache = (key, cacheData) => {
    if (customSetCache) {
      customSetCache(cacheData);
    } else {
      cache.setCache(key, cacheData);
    }
    cacheSubscribe.trigger(key, cacheData.data); // 👈 广播给所有订阅了这个 cacheKey 的组件实例
  };
  const _getCache = (key) => {
    if (customGetCache) {
      return customGetCache(key);
    }
    return cache.getCache(key);
  };

  // 组件挂载时，如果有缓存数据，先用缓存数据填充初始状态——这就是"先展示旧数据"
  useCreation(() => {
    if (!cacheKey) {
      return {};
    }
    const cacheData = _getCache(cacheKey);
    if (cacheData && Object.hasOwnProperty.call(cacheData, 'data')) {
      fetchInstance.state.data = cacheData.data;
      fetchInstance.state.params = cacheData.params;
      if (staleTime === -1 || new Date().getTime() - cacheData.time < staleTime) {
        fetchInstance.state.loading = false; // 保鲜期内，直接展示缓存，不显示 loading
      }
    }
  });

  if (!cacheKey) {
    return {};
  }

  return {
    onBefore() {
      const cacheData = _getCache(cacheKey);
      if (!cacheData || !Object.hasOwnProperty.call(cacheData, 'data')) {
        return {};
      }
      // staleTime 为 -1 表示永不过期；或当前时间减缓存时间小于 staleTime，都算"在保鲜期内"
      if (staleTime === -1 || new Date().getTime() - cacheData.time < staleTime) {
        return {
          data: cacheData.data,
          loading: false,
          returnNow: true, // 👈 直接返回缓存数据，Fetch.runAsync 读到就跳过真实请求
        };
      } else {
        // 已过保鲜期：先用旧数据垫着展示，但不阻止后面继续发真实请求——这就是"后台静默更新"
        return { data: cacheData.data };
      }
    },
    onRequest(service, params) {
      // 多个组件实例用同一个 cacheKey 同时发起请求时，共享同一个 servicePromise，避免重复请求
      let servicePromise = cachePromise.getCachePromise(cacheKey);
      if (servicePromise && servicePromise !== currentPromiseRef.current) {
        return { servicePromise };
      }
      servicePromise = service(...params);
      currentPromiseRef.current = servicePromise;
      cachePromise.setCachePromise(cacheKey, servicePromise);
      return { servicePromise };
    },
    onSuccess(data, params) {
      if (cacheKey) {
        _setCache(cacheKey, { data, params, time: new Date().getTime() });
        // 订阅同一个 cacheKey 的其他组件实例，会在这里被动更新，不需要各自重新发请求
        unSubscribeRef.current = cacheSubscribe.subscribe(cacheKey, (d) => {
          fetchInstance.setState({ data: d });
        });
      }
    },
  };
}

export default useCachePlugin;
```

配套的三个模块级共享存储，是 SWR"跨组件共享缓存"能力的地基——它们不是 React 状态，是普通的 JS `Map`/对象，天然跨组件实例共享：

```typescript
// utils/cache.ts —— 缓存数据本身
const cache = new Map();

const setCache = (key, value) => {
  cache.set(key, value);
};

const getCache = (key) => {
  return cache.get(key);
};

const clearCache = (keys) => {
  if (keys) {
    const cacheKeys = Array.isArray(keys) ? keys : [keys];
    cacheKeys.forEach((key) => cache.delete(key));
  } else {
    cache.clear();
  }
};

export { setCache, getCache, clearCache };
```

```typescript
// utils/cachePromise.ts —— 进行中的请求 Promise，用于"多组件共享同一次请求"
const cachePromise = new Map();

export function getCachePromise(key) {
  return cachePromise.get(key);
}

export function setCachePromise(key, promise) {
  cachePromise.set(key, promise);
  promise.finally(() => {
    cachePromise.delete(key); // 请求结束后清理，避免下次误用到已完成的 Promise
  });
}
```

```typescript
// utils/cacheSubscribe.ts —— 缓存更新的订阅/广播机制
const listens = {};

export function subscribe(key, listener) {
  if (!listens[key]) {
    listens[key] = [];
  }
  listens[key].push(listener);
  return () => {
    listens[key] = listens[key].filter((l) => l !== listener);
  };
}

export function trigger(key, data) {
  if (listens[key]) {
    listens[key].forEach((l) => l(data));
  }
}
```

SWR（stale-while-revalidate）策略讲透：`onBefore` 命中过期缓存时返回 `{ data: cacheData }`（不带 `returnNow`），意味着"先把旧数据摆出来，但仍然继续走后面的真实请求逻辑"；请求成功后 `onSuccess` 把新数据写入缓存并广播给所有订阅者，界面上体现为"先看到旧数据，几百毫秒后无感知地刷新成新数据"，用户不会看到 loading 状态的闪烁，这正是 SWR 这个名字的字面含义——**过期数据仍然可用，同时在后台重新验证**。

### 泛化：小核心 + 可插拔能力模块

回头看整个 `useRequest` 的设计，能提炼出一个可以复用到任何自定义 Hook 设计场景的思路：**核心状态机只负责最基础、最不可或缺的逻辑**（这里是"发起请求、管理 loading/data/error 状态、竞态处理"），**所有"高级但非必需"的能力都用统一的插件接口挂载**，插件之间互不感知、可以任意组合启用。这套思路不是 `useRequest` 独有的——任何"渐进增强、按需组合"的场景都适用，比如一个表单校验 Hook 的核心是"收集字段值 + 触发校验"，异步校验、跨字段联动校验、防抖校验都可以做成插件；一个列表 Hook 的核心是"管理列表数据"，分页、排序、筛选、虚拟滚动都可以做成插件。判断一个能力"要不要做成插件"的标准很直接：**这个能力是否只有部分场景需要，且不需要就完全不产生额外开销**——`useRequest` 里没设 `pollingInterval` 的调用完全不受轮询插件影响，正是这套架构"渐进增强"的体现。

> 💬 **面试官**：`useRequest` 的插件化架构是怎么设计的？核心状态机和插件之间是怎么协作的？
>
> ✅ 标准答案：核心是一个 `Fetch` 类，只管理最基础的请求状态和执行流程（含竞态处理）；每个插件是一个接收 `(fetchInstance, options)` 的自定义 Hook，返回一组生命周期钩子（`onBefore`/`onRequest`/`onSuccess`/`onError`/`onFinally`/`onCancel`/`onMutate`/`onInit`）；`Fetch` 在请求生命周期的每个节点调用 `runPluginHandler` 触发所有插件对应的钩子，并合并它们的返回值——插件可以通过返回值影响请求行为（比如 `stopNow` 终止请求、`returnNow` 提前返回结果、`servicePromise` 替换真实请求）。
> 🎁 想加分：强调这套架构"零成本抽象"的特点——不使用某个插件的场景，完全不产生这个插件对应的运行时开销（比如没配 `cacheKey`，`useCachePlugin` 内部直接 `return {}`，不注册任何缓存逻辑），这是"渐进增强"设计思路的核心价值，和只是简单地把所有功能塞进一个大 Hook 里有本质区别。

🔧 **真实场景**：医院管理系统的处方审核列表，用 `useRequest` 配 `pollingInterval` 做自动轮询（审核状态可能被其他医生实时更新），配 `cacheKey` 让"患者详情"这类跨页面共享的数据做 SWR 缓存（从患者列表跳到详情页秒开，因为列表页可能已经缓存过这个患者的基本信息），配 `debounceWait` 处理搜索框输入——三种能力互不干扰，因为它们分别是三个独立的插件，只在配置了对应 option 时才生效。

---

## 💡 一张图总结（面试速记）

| 知识点 | 一句话结论 | 面试价值 |
|---|---|---|
| Vite vs Webpack | 开发环境不打包，靠浏览器原生 ESM 按需编译，第三方依赖用 esbuild 预构建 | 高频，考查底层原理 |
| ESLint + Prettier | 职责分离，Prettier 管格式、ESLint 管质量，用 `eslint-config-prettier` 消除冲突 | 中频，考查工程规范意识 |
| GitHooks 演进 | yorkie 已停止维护，Husky v9 是现在的标配，`prepare` 脚本一路从 `install` 简化到裸调用 | 中频 |
| 别名双配置 | Vite 的 `resolve.alias` 管打包，`tsconfig.paths` 管类型检查，两套独立工具链 | 高频，容易漏答一半 |
| `VITE_` 前缀 | 安全边界，防止敏感环境变量被打进客户端包 | 中频 |
| proxy 跨域 | 只在开发环境 Node 进程里生效，生产环境要靠 Nginx/CORS | 高频，考查是否理解同源策略本质 |
| legacy 插件取舍 | IE11 已退役，新项目多数场景不再需要，按产品实际浏览器支持要求决定 | 中频，考查现实判断力 |
| Mobx 响应式 | Proxy 拦截 get/set 自动收集依赖，初始化字段不能给 undefined/null | 高频 |
| Axios 拦截器顺序 | 请求方向从内到外，全局拦截器保证最后执行解包 res.data | 高频，工程深度题 |
| 取消请求 | 维护 URL 到取消句柄的映射，`AbortController` 是现在的标准做法 | 高频，手写题 |
| Mock 双开关 | localEnabled/prodEnabled 分开控制，防止假数据混入生产包 | 中频 |
| i18n key 设计 | 用中文原文做 key 是反模式，语义化英文 key 才好维护 | 低频，但体现细节意识 |
| Antd 按需引入 | ES Module 静态分析做 Tree Shaking，Antd 5 CSS-in-JS 从设计上简化了这个问题 | 中频 |
| Jest → Vitest | Vitest 复用 Vite 转换链路，`import.meta.env` 原生支持，配置量和速度都更优 | 中频，考查是否跟进生态 |
| 目录结构 | 关注点分离，横向按技术职责划分是主流，规模大了叠加纵向业务划分 | 低频，但体现工程判断力 |
| Turborepo 缓存 | 基于输入内容哈希判断任务是否需要重新执行，命中直接恢复 outputs | 高频，Monorepo 核心考点 |
| pnpm 幽灵依赖 | 内容寻址存储 + 符号链接，node_modules 只放显式声明依赖的链接 | 高频 |
| useRequest 插件化 | 小核心 Fetch 类 + 生命周期钩子插件，插件通过返回值影响请求行为 | 高频，手写题常客 |
| fetchId 竞态处理 | 自增计数器判断结果是否过期，比 AbortController 更轻量但不能真正中断请求 | 高频，手写题 |

---

## 📝 留个问题

`useRequest` 的插件化架构里，如果要新增一个只在 Monorepo 的 `packages/request` 里生效、其他普通单体项目不需要的插件（比如医院管理系统特有的"处方单提交前二次确认"拦截逻辑），你会把这个插件放在 `packages/request` 里还是 `apps/admin` 业务代码里？为什么？评论区聊聊你的方案。

---

> 🔖 这是「React 18 全家桶深度拆解系列」第 14 篇（完结篇）。上一篇：《React 18 性能优化: memo/useMemo/虚拟列表与 Compiler》
