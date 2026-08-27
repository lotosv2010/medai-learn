# Vite + Vue 3 通用后台管理系统从零搭建：工程化基建到业务功能全链路实战（生产收藏级）

> 面试官说：「给你一张白纸，从零搭建一个后台管理系统，你会怎么选型？」大多数人会背出 `vite + vue3 + ts + pinia + element-plus` 这几个名词——追一句「为什么不用 Webpack，Vite 到底解决了什么问题」「Pinia 为什么把 Vuex 的 mutations 砍了」，答案就开始语焉不详了。**背得出技术栈清单，不等于懂每个选型背后要解决的问题**，这才是面试官真正想听的。

> 这篇文章按一套真实后台管理系统脚手架的搭建顺序——工程化规范 → Vite 配置 → 样式方案 → 路由状态 → 请求封装 → Mock/国际化 → UI 组件库 → 测试体系 → 目录结构——把每一步「为什么这样做、怎么配、面试怎么答」串成一条线。源码在 [lotosv2010/vite-vue3-ts](https://github.com/lotosv2010/vite-vue3-ts)，跟着这篇走一遍，你会对整套后台系统的工程化决策有一个完整的因果链条，不再是零散的 API 记忆。

> 📌 说明：本文重点讲的是搭建思路和每个技术选型背后要解决的问题，文中代码片段都是**参考实现**，用来说明设计思路。实际搭建时的具体写法、配置项和目录细节，要以你自己项目的运行环境和各工具库的版本为准——比如 ESLint 8 和 9、Husky v4 和 v9、Node 版本不同，配置方式都会有差异，遇到跑不通的地方先检查版本号。

---

## 🎯 这篇文章解决什么问题

「搭建一个后台管理系统脚手架」听起来是体力活，但面试里这是**区分工程能力**的重灾区——同样是「用了 Vite」，能不能讲清楚 `resolve.alias` 和 `tsconfig.paths` 为什么要配两遍，能不能讲清楚请求层为什么要维护一个 `cancelRequestSourceList`，直接决定了面试官对你工程判断力的评分。

这篇文章会覆盖十一个核心决策点：Vite 选型、工程化规范（ESLint/Prettier/Stylelint/Husky）、Vite 配置体系（别名/环境变量/proxy）、构建优化、CSS 预处理器、路由与状态管理、请求层封装、Mock 与国际化、Element-Plus 按需引入、测试体系、目录结构。每一个都会讲透原理，给出面试标准答案，并指出原始实践里已经过时或有问题的地方，给出现在业界的做法。

---

## 🚀 为什么是 Vite，而不是 Webpack

搭建前的准备很朴素：VS Code、Chrome、Node.js/npm、Vue.js devtools 浏览器插件、Volar（Vue 3 官方语法高亮插件）、Vue 3 Snippets 快捷输入。这些是地基，不是本文重点，但选型的第一个分水岭在这里就出现了——**为什么选 Vite 而不是继续用 Webpack**。

Vite（法语「迅速」，读作 `/vit/`）由两部分组成：

- 一个基于原生 ES 模块的开发服务器，提供快到惊人的模块热更新（HMR）
- 一套用 Rollup 预配置的构建指令，产出优化过的生产环境静态资源

它的核心卖点用一句话说清楚：**极速的开发服务器启动、轻量的 HMR、丰富的内建功能、自带优化的构建、通用插件接口、完全类型化的 API**。

这套脚手架对自己提出的构建要求是：

- 支持 TypeScript、Vue 3 语法、ES6 语法、Scss Module
- 支持 ESLint、Prettier、Pre-commit hook
- 支持 HMR 快速热更新
- 支持 Element-Plus 按需引入与主题样式覆盖
- 支持 Proxy 代理、alias 别名
- 兼容传统浏览器
- 开发启动速度要以秒计算
- 支持懒加载和 chunk 分割

初始化项目本身很简单：

```shell
# npm 6.x
npm create vite@latest vite-vue3-ts --template vue-ts

# npm 7+, extra double-dash is needed:
npm create vite@latest vite-vue3-ts -- --template vue-ts

# yarn
yarn create vite vite-vue3-ts --template vue-ts

# pnpm
pnpm create vite vite-vue3-ts -- --template vue-ts
```

真正值得讲透的是背后的原理差异。Webpack 的开发服务器在启动时要先把整个应用的依赖图打包成一个（或几个）bundle，项目越大、模块越多，这个「预打包」的时间就越长——这就是为什么大型项目用 Webpack 冷启动经常要等十几秒甚至更久。Vite 反过来：开发环境下**不打包**，直接利用浏览器原生支持的 ES Module，让浏览器自己去请求每个模块文件，Vite 服务器只做「按需转译」——你访问哪个路由，才编译哪个路由用到的文件。这就是为什么 Vite 的冷启动时间几乎和项目规模无关，而 Webpack 是线性增长的。

第三方依赖是个例外：`node_modules` 里的包大多是 CommonJS 格式，且一个包可能拆成几百个内部模块，直接用原生 ESM 加载会产生大量请求瀑布。Vite 用 esbuild（Go 写的，比 JS 写的打包器快一个数量级）把这些依赖**预构建**成单文件的 ESM 格式，缓存进 `node_modules/.vite`，这一步只在依赖变化时重新触发，不影响你改业务代码时的热更新速度。

> 💬 **面试官**：Vite 为什么比 Webpack 启动快？
>
> ✅ 标准答案：Webpack 开发环境也要先打包整个依赖图才能启动服务，Vite 利用浏览器原生 ES Module，不打包业务代码，按需编译，所以启动速度基本不随项目体积增长。
> 🎁 加分答案：补充第三方依赖的预构建机制——Vite 用 esbuild 把 CommonJS 依赖预转换成 ESM 单文件并缓存，避免了裸用原生 ESM 加载 `node_modules` 时的请求瀑布问题；生产构建 Vite 底层用的是 Rollup，不是不打包，「不打包」只发生在开发环境。

🔧 **真实场景**：药品后台管理系统模块数上千（商品管理、订单、库存、说明书审核等各自独立的页面和组件），用 Webpack 时每次冷启动要等 15-20 秒，改一行代码后热更新也要好几秒；换成 Vite 后冷启动降到 1-2 秒，HMR 基本感知不到延迟——这个体感差异，是候选人能不能讲出「工程效率」这个词背后真实价值的分水岭。

---

## 🔧 工程化基建：ESLint + Prettier + Stylelint + Husky

代码规范不是「团队要求」这么简单的一句话，它背后是三个工具各自守住一块边界，配合失败会互相打架。

**职责边界**：ESLint 管**代码质量**（未使用变量、潜在 bug、最佳实践），Prettier 管**代码格式**（缩进、引号、换行），Stylelint 管**样式规范**（CSS/Scss 属性顺序、选择器写法）。三者都能对同一行代码提修改意见，冲突点集中在 ESLint 的部分规则本身也管格式（比如分号、缩进），这时候和 Prettier 的输出可能不一致。

安装 ESLint 及配套插件：

```shell
# eslint 安装
pnpm i -D eslint
# eslint 插件安装
# Vue.js 的官方 ESLint 插件，提供了 .vue 文件以及 .js 文件中的 Vue 代码的支持
pnpm i -D eslint-plugin-vue
# 针对 ts 的 eslint plugin
pnpm i -D @typescript-eslint/eslint-plugin
# 为 prettier 在 eslint 中工作提供支持
pnpm i -D eslint-plugin-prettier
# typescript parser
# 针对 eslint 的一个 ts 解析器
pnpm i -D @typescript-eslint/parser
```

配置文件 `.eslintrc.js`（和 `src` 同级新建，另配一个 `.eslintignore`）：

```javascript
module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  parser: 'vue-eslint-parser',
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended',
    // eslint-config-prettier 的缩写
    'prettier',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  // eslint-plugin-vue @typescript-eslint/eslint-plugin eslint-plugin-prettier的缩写
  plugins: ['vue', '@typescript-eslint', 'prettier'],
  rules: {
    '@typescript-eslint/ban-ts-ignore': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'no-var': 'error',
    'prettier/prettier': 'error',
    // 禁止出现console
    'no-console': 'warn',
    // 禁用debugger
    'no-debugger': 'warn',
    // 禁止出现重复的 case 标签
    'no-duplicate-case': 'warn',
    // 禁止出现空语句块
    'no-empty': 'warn',
    // 禁止不必要的括号
    'no-extra-parens': 'off',
    // 禁止对 function 声明重新赋值
    'no-func-assign': 'warn',
    // 禁止在 return、throw、continue 和 break 语句之后出现不可达代码
    'no-unreachable': 'warn',
    // 强制所有控制语句使用一致的括号风格
    curly: 'warn',
    // 要求 switch 语句中有 default 分支
    'default-case': 'warn',
    // 强制尽可能地使用点号
    'dot-notation': 'warn',
    // 要求使用 === 和 !==
    eqeqeq: 'warn',
    // 禁止 if 语句中 return 语句之后有 else 块
    'no-else-return': 'warn',
    // 禁止出现空函数
    'no-empty-function': 'warn',
    // 禁用不必要的嵌套块
    'no-lone-blocks': 'warn',
    // 禁止使用多个空格
    'no-multi-spaces': 'warn',
    // 禁止多次声明同一变量
    'no-redeclare': 'warn',
    // 禁止在 return 语句中使用赋值语句
    'no-return-assign': 'warn',
    // 禁用不必要的 return await
    'no-return-await': 'warn',
    // 禁止自我赋值
    'no-self-assign': 'warn',
    // 禁止自身比较
    'no-self-compare': 'warn',
    // 禁止不必要的 catch 子句
    'no-useless-catch': 'warn',
    // 禁止多余的 return 语句
    'no-useless-return': 'warn',
    // 禁止变量声明与外层作用域的变量同名
    'no-shadow': 'off',
    // 允许delete变量
    'no-delete-var': 'off',
    // 强制数组方括号中使用一致的空格
    'array-bracket-spacing': 'warn',
    // 强制在代码块中使用一致的大括号风格
    'brace-style': 'warn',
    // 强制使用骆驼拼写法命名约定
    camelcase: 'warn',
    // 强制使用一致的缩进
    indent: 'off',
    // 强制在 JSX 属性中一致地使用双引号或单引号
    // 'jsx-quotes': 'warn',
    // 强制可嵌套的块的最大深度4
    'max-depth': 'warn',
    // 强制最大行数 300
    // "max-lines": ["warn", { "max": 1200 }],
    // 强制函数最大代码行数 50
    // 'max-lines-per-function': ['warn', { max: 70 }],
    // 强制函数块最多允许的的语句数量20
    'max-statements': ['warn', 100],
    // 强制回调函数最大嵌套深度
    'max-nested-callbacks': ['warn', 3],
    // 强制函数定义中最多允许的参数数量
    'max-params': ['warn', 3],
    // 强制每一行中所允许的最大语句数量
    'max-statements-per-line': ['warn', { max: 1 }],
    // 要求方法链中每个调用都有一个换行符
    'newline-per-chained-call': ['warn', { ignoreChainWithDepth: 3 }],
    // 禁止 if 作为唯一的语句出现在 else 语句中
    'no-lonely-if': 'warn',
    // 禁止空格和 tab 的混合缩进
    'no-mixed-spaces-and-tabs': 'warn',
    // 禁止出现多行空行
    'no-multiple-empty-lines': 'warn',
    // 禁止出现;
    semi: ['warn', 'always'],
    // 强制在块之前使用一致的空格
    'space-before-blocks': 'warn',
    // 强制在 function的左括号之前使用一致的空格
    // 'space-before-function-paren': ['warn', 'never'],
    // 强制在圆括号内使用一致的空格
    'space-in-parens': 'warn',
    // 要求操作符周围有空格
    'space-infix-ops': 'warn',
    // 强制在一元操作符前后使用一致的空格
    'space-unary-ops': 'warn',
    // 强制在注释中 // 或 /* 使用一致的空格
    // "spaced-comment": "warn",
    // 强制在 switch 的冒号左右有空格
    'switch-colon-spacing': 'warn',
    // 强制箭头函数的箭头前后使用一致的空格
    'arrow-spacing': 'warn',
    'prefer-const': 'warn',
    'prefer-rest-params': 'warn',
    'no-useless-escape': 'warn',
    'no-irregular-whitespace': 'warn',
    'no-prototype-builtins': 'warn',
    'no-fallthrough': 'warn',
    'no-extra-boolean-cast': 'warn',
    'no-case-declarations': 'warn',
    'no-async-promise-executor': 'warn',
  },
  globals: {
    defineProps: 'readonly',
    defineEmits: 'readonly',
    defineExpose: 'readonly',
    withDefaults: 'readonly',
  },
};
```

```javascript
# eslint 忽略检查 (根据项目需要自行添加)
node_modules
dist
coverage
```

**这里有个必须点破的坑**：这份配置是 ESLint 8 及以前的 `.eslintrc.js` 传统格式。**ESLint 9 起默认要求 Flat Config**（`eslint.config.js`，用扁平数组代替 `extends` 继承链），旧格式仍能通过兼容层跑，但新项目应该直接写 Flat Config：

```javascript
// eslint.config.js（ESLint 9+ 推荐写法）
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  eslintConfigPrettier,
  {
    rules: {
      'no-console': 'warn',
      'no-debugger': 'warn',
    },
  },
];
```

Flat Config 用真实的模块导入替代字符串继承，配置的优先级由数组顺序显式决定，不再依赖 `extends` 隐式的继承规则解析，调试配置冲突时更直观。

**Prettier 支持**：

```plain
# 安装 prettier
pnpm i -D prettier
```

ESLint 和 Prettier 冲突的解决方案是**以 Prettier 的样式规范为准，让 ESLint 里的样式规则自动失效**，而不是反过来让 Prettier 妥协：

```plain
# 安装插件 eslint-config-prettier
# 为 eslint 代码校验规则与 prettier 代码校验规则部分冲突提供支持
pnpm i -D eslint-config-prettier
```

`.prettierrc.js` 配置（同样和 `src` 同级）：

```javascript
module.exports = {
  tabWidth: 2,
  jsxSingleQuote: true,
  printWidth: 100,
  singleQuote: true,
  semi: true,
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 200,
      },
    },
  ],
  arrowParens: 'always',
};
```

```javascript
# 忽略格式化文件 (根据项目需要自行添加)
node_modules
dist
coverage
```

> 💬 **面试官**：ESLint 和 Prettier 一起用会冲突吗，怎么处理？
>
> ✅ 标准答案：两者职责不同（代码质量 vs 代码格式），但 ESLint 内置的部分风格规则和 Prettier 冲突，用 `eslint-config-prettier` 关掉 ESLint 里所有和格式相关的规则，让 Prettier 统一负责格式化，`eslint-plugin-prettier` 再把 Prettier 的格式问题作为 ESLint 的错误抛出来，统一走一个检查入口。
> 🎁 想加分：说明为什么要「以 Prettier 为准」而不是反过来——Prettier 是无配置或极少配置的格式化工具，几乎不留讨论空间，团队协作时能减少「这个空格该不该加」的无意义争论，ESLint 让位给它，能省下大量 code review 里的风格争执。

**自动检测集成到 Vite**：用 `vite-plugin-checker` 让类型检查和 ESLint 检查在开发服务器里实时运行，而不是等 commit 或 CI 才发现问题。

```plain
pnpm install -D vite-plugin-checker
```

```typescript
import checker from 'vite-plugin-checker';
export default function configEslint() {
  return [
    checker({
      typescript: true,
      eslint: {
        lintCommand: 'eslint "./src/**/*.{vue,ts,tsx}"',
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

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

import createVitePlugins from './config/plugins/index';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), ...createVitePlugins()],
});
```

**样式规范交给 Stylelint**：

```shell
pnpm i -D sass
pnpm i -D stylelint
pnpm i -D stylelint-config-standard
pnpm i -D stylelint-config-prettier
pnpm i -D stylelint-order
pnpm i -D stylelint-scss
```

配置文件较长，核心是三部分：继承标准规则集并关闭和 Prettier 冲突的部分、启用 `stylelint-order` 统一属性书写顺序、针对 Vue 的伪类（`v-deep`/`v-global`/`v-slotted`）做白名单：

```javascript
module.exports = {
  extends: ['stylelint-config-standard', 'stylelint-config-prettier'],
  plugins: ['stylelint-order', 'stylelint-scss'],
  rules: {
    indentation: 2,
    'no-descending-specificity': null,
    'function-url-quotes': 'always',
    'string-quotes': 'double',
    'color-hex-case': 'lower',
    'color-hex-length': 'long',
    'selector-pseudo-class-no-unknown': [
      true,
      { ignorePseudoClasses: ['deep', 'global'] },
    ],
    'selector-pseudo-element-no-unknown': [
      true,
      { ignorePseudoElements: ['v-deep', 'v-global', 'v-slotted'] },
    ],
    'at-rule-no-unknown': [
      true,
      { ignoreAtRules: ['tailwind', 'apply', 'variants', 'responsive', 'screen', 'function', 'if', 'each', 'include', 'mixin'] },
    ],
    'order/order': [
      ['dollar-variables', 'custom-properties', 'at-rules', 'declarations', 'rules'],
      { severity: 'warning' },
    ],
    'order/properties-order': [
      'position', 'top', 'right', 'bottom', 'left', 'z-index',
      'display', 'float', 'width', 'height', 'padding', 'margin',
      'overflow', 'font', 'color', 'text-align', 'background', 'border',
      'border-radius', 'opacity', 'transform', 'transition', 'animation',
    ],
  },
  ignoreFiles: ['**/*.js', '**/*.jsx', '**/*.tsx', '**/*.ts'],
};
```

```javascript
/dist/*
/public/*
public/*
```

三个工具最终落到脚本上：

```json
{
  "scripts": {
    "lint": "eslint src --fix --ext .ts,.tsx,.vue,.js,.jsx",
    "prettier": "prettier --write .",
    "stylelint": "stylelint --fix \"**/*.{vue,less,postcss,css,scss}\" --cache --cache-location node_modules/.cache/stylelint/"
  }
}
```

**这里要指出笔记原文里的一个 JSON 语法错误**：原文写的是 `"script"`，正确的 `package.json` 字段名是 `"scripts"`（复数），漏了 s 直接复制会导致这些命令无法被 `pnpm run` 识别。

```plain
# eslint 检查
pnpm lint
# prettier 自动格式化
pnpm prettier
```

**用 Husky + lint-staged 把规范卡在提交前**：Husky 给 Git 增加钩子（比如 `pre-commit`），lint-staged 只对**暂存区文件**（被 `git add` 的文件）做检查——这个「只检查暂存区」的设计很关键：老项目如果对全量代码做一次检查，往往会炸出成百上千条历史遗留问题，而 lint-staged 只约束你这次要提交的改动，不逼你一次性修完历史债务。

安装用 `mrm` 驱动（会自动把 husky 一起装上）：

```plain
pnpm i mrm -D --registry=https://registry.npm.taobao.org
```

```plain
npx mrm lint-staged
```

执行完毕后项目根目录会出现 `.husky` 目录，其中 `pre-commit` 文件内容：

```plain
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

`package.json` 里会多出：

```json
{
  "scripts": {
    "prepare": "husky install"
  },
  "devDependencies": {
    "husky": "^7.0.4",
    "lint-staged": "^12.3.7",
    "mrm": "^4.0.0"
  },
  "lint-staged": {
    "*.{ts,tsx,vue,js,jsx}": "eslint --cache --fix",
    "*.css": "stylelint --fix"
  }
}
```

结合 Prettier 后完整配置：

```json
{
  "scripts": {
    "lint": "eslint src --fix --ext .ts,.tsx,.vue,.js,.jsx",
    "prettier": "prettier --write .",
    "stylelint": "stylelint --fix \"**/*.{vue,scss,css}\"",
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.{vue,scss}": "npm run stylelint",
    "*.{js,jsx,vue,ts,tsx}": "npm run lint",
    "*.{js,jsx,vue,tsx,ts,scss,md,json}": [
      "prettier --write"
    ]
  }
}
```

**这里要点出两处问题**：一是笔记原文在这段配置里又出现了 `"husky": { "hooks": { "pre-commit": "lint-staged" } }` 这种写法，这是 husky v4 时代「配置写在 `package.json`」的旧模式，和前面 `.husky/pre-commit` 文件的写法（husky v7+ 的模式）混在一起了——实际项目里两种风格只能选一种，选文件模式就不需要 `package.json` 里的 `husky.hooks` 字段。二是**现在的 Husky（v9+）已经不需要 `prepare: "husky install"` 这种写法**，直接是 `"prepare": "husky"`，配置进一步简化，`.husky/_` 目录也被移除了。

> 💬 **面试官**：pre-commit 钩子里适合放什么，不适合放什么？
>
> ✅ 标准答案：适合放执行快、能自动修复的检查（lint --fix、格式化），因为每次 commit 都要跑，慢了会影响开发体验；不适合放单元测试全量执行、类型检查全量跑这类耗时操作，这些应该放到 CI 流水线里。
> 🎁 想加分：提到 lint-staged 只检查暂存区文件这个设计本身就是为了控制 pre-commit 的执行时间——只查你这次改的文件，不查全仓库，这是「本地钩子要快」和「规范要全面」之间的一个工程取舍。

**踩坑记录**：`Unknown word (CssSyntaxError)` 错误，是因为 `stylelint`、`stylelint-config-standard`、`stylelint-scss`、`stylelint-order` 插件版本太新，对 `.vue` 文件里的 CSS 代码识别不好。原文的解法是把这四个插件降级到 `stylelint@^13.13.1`、`stylelint-config-standard@^22.0.0`、`stylelint-scss@^3.21.0`、`stylelint-order@^4.0.0`。另一种方案是装 `postcss-html` 插件，但 Stylelint 14 版本对该插件的支持和验证规则变化很大，且验证不了 `.scss` 文件。

🔧 **真实场景**：药品后台的说明书审核模块由多人协作开发，没有 lint-staged 之前，PR 里经常出现「这里该用单引号还是双引号」的评论拉锯战；接入 Husky + lint-staged 后，这类风格问题在 `git commit` 阶段就被自动修复，code review 精力能完全放在业务逻辑上。

---

## ⚙️ Vite 配置体系：别名、环境变量、server、proxy

**别名配置**要解决的问题是：深层嵌套的组件引用相对路径（`../../../components/xxx`）既丑又难维护。别名要配置**两处**，因为它们服务于两个完全不同的工具：

```shell
pnpm i -D @types/node
```

`vite.config.ts` 里的 `resolve.alias` 是给 **Vite 的模块解析器**用的，决定了打包和开发服务器怎么找到真实文件：

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

import createVitePlugins from './config/plugins/index';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), ...createVitePlugins()],
  server: {
    host: true,
    port: 3002,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

`tsconfig.json` 里的 `paths`/`baseUrl` 是给 **TypeScript 类型检查器**用的，决定了 IDE 和 `tsc` 怎么解析这个别名对应的类型：

```json
{
  "compilerOptions": {
    "target": "esnext",
    "useDefineForClassFields": true,
    "module": "esnext",
    "moduleResolution": "node",
    "strict": true,
    "jsx": "preserve",
    "sourceMap": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "lib": ["esnext", "dom"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"]
}
```

> 💬 **面试官**：为什么别名要配两遍，配一遍不行吗？
>
> ✅ 标准答案：Vite 的构建流程和 TypeScript 的类型检查流程是两套独立的工具链，Vite 不读 `tsconfig.json` 的 `paths` 去决定怎么打包，TypeScript 也不读 `vite.config.ts` 的 `alias` 去做类型推导，只配一处会导致「代码能跑但 IDE 报红」或者「类型检查通过但打包失败」。
> 🎁 想加分：提到一些框架（Nuxt、部分 CLI 模板）会自动同步这两处配置，减少手动维护成本，但原生 Vite + Vue 项目需要开发者自己保证两者一致。

使用方式很直接：

```typescript
import { createApp } from 'vue';
import App from '@/App.vue';
import '@/index.scss';

createApp(App).mount('#app');
```

**环境变量**：新建 `.env`、`.env.test`、`.env.staging`、`.env.production` 四个文件（和 `src` 同级），分别对应开发、测试、预发、生产四个环境。**自定义环境变量必须以 `VITE_` 为前缀才会暴露给客户端代码**，比如 `VITE_APP_TITLE`：

```plain
VITE_APP_TITLE="DEVELOPMENT APP"
```

```plain
VITE_APP_TITLE="TEST APP"
VITE_API_HOST=http://www.youbaobao.xyz
```

```plain
VITE_APP_TITLE="STAGING APP"
VITE_API_HOST=http://www.youbaobao.xyz
```

```plain
VITE_APP_TITLE="PRODUCTION APP"
VITE_API_HOST=http://www.youbaobao.xyz
```

对应脚本要显式传 `--mode`，因为默认模式只有 `production`/`development` 两种：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:test": "vite build --mode test",
    "build:staging": "vite build --mode staging",
    "preview": "vite preview"
  }
}
```

这个 `VITE_` 前缀限制不是随意设计的——它是一道**安全边界**：`.env` 里可能混着数据库连接串、内部服务密钥这类不该打进客户端 bundle 的敏感配置，Vite 默认只暴露带 `VITE_` 前缀的变量，没加前缀的变量即使写在 `.env` 里，客户端代码也访问不到，从机制上防止了敏感信息被误打包进产物。

TypeScript 类型声明让 `import.meta.env` 有类型提示：

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_APP_TITLE: 'development' | 'test' | 'staging' | 'production';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

获取环境变量用 `import.meta.env`，**不是** Webpack 时代的 `process.env`。因为反复写 `import.meta.env.XXX` 繁琐，封装一个工具函数：

```typescript
export const getEnv = () => {
  return import.meta.env;
};
```

```typescript
import { getEnv } from './env';

export { getEnv };
```

配合一个自定义 Hook 设置页面标题：

```typescript
import { onMounted } from 'vue';
import { getEnv } from '@/utils';

export default function useTitle(title?: string): void {
  onMounted(() => {
    const { VITE_APP_TITLE } = getEnv();
    document.title = title ?? VITE_APP_TITLE ?? 'Vite Project';
  });
}
```

```typescript
import useTitle from './useTitle';

export { useTitle };
```

页面里使用：

```vue
<script setup lang="ts">
import HelloWorld from '@/components/HelloWorld.vue';
import { useTitle } from '@/hooks';
import { onMounted, ref } from 'vue';

// 设置 document title
useTitle();

const msg = ref('Hello Vue 3 + TypeScript + Vite');

onMounted(() => {
  msg.value = 'Hello Vue 3 + TypeScript + Vite !!!';
});
</script>

<template>
  <img alt="Vue logo" src="./assets/logo.png" />
  <HelloWorld :msg="msg" />
</template>

<style lang="scss">
#app {
  height: 100%;
  margin-top: 50px;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  color: #2c3e50;
  text-align: center;
}
</style>
```

> 💬 **面试官**：Vite 的环境变量机制和 Webpack 的 `process.env` 有什么本质区别？
>
> ✅ 标准答案：Webpack 用 DefinePlugin 在编译时把 `process.env.XXX` 整体替换成字面量字符串，`process` 在浏览器里本身不存在，是被插件模拟出来的；Vite 原生提供 `import.meta.env`，这是 ES 模块标准里 `import.meta` 的浏览器原生能力，不需要额外模拟 Node 环境变量对象，且有 `VITE_` 前缀白名单机制做安全过滤。
> 🎁 想加分：提到 Vite 也支持通过 `envPrefix` 配置项自定义前缀（不一定非要用 `VITE_`），以及 `.env.local` 这类不进 Git 仓库、本地覆盖用的文件命名惯例。

**server 配置**：新建 `config/index.ts` 集中管理配置常量：

```typescript
/**
 * @description 开发端口
 */
export const VITE_APP_PORT = 3002;
/**
 * @description 公共基础路径
 */
export const VITE_APP_BASE = '/';
/**
 * @description 是否自动在浏览器中打开应用程序
 */
export const VITE_APP_OPEN = true;
```

新建 `config/server/index.ts`：

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

`vite.config.ts` 引用：

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

import createVitePlugins from './config/plugins/index';
import server from './config/server';
import { VITE_APP_BASE } from './config';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), ...createVitePlugins()],
  base: VITE_APP_BASE,
  server,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

**proxy 配置**解决开发环境跨域，`config/server/index.ts` 改成函数形式接收 `mode`：

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
import vue from '@vitejs/plugin-vue';
import path from 'path';

import createVitePlugins from './config/plugins/index';
import createServer from './config/server';
import { VITE_APP_BASE } from './config';

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => ({
  plugins: [vue(), ...createVitePlugins()],
  base: VITE_APP_BASE,
  server: createServer(mode),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
}));
```

`changeOrigin: true` 把请求头里的 `Host` 改成目标服务器的地址，让目标服务器以为请求是从它自己域名发出的，绕过部分服务端对 `Origin`/`Referer` 的校验。**但这套代理机制只在开发环境的 Node 服务器里生效**，生产环境静态资源部署后没有这层 Node 中间层，跨域问题必须靠后端配置 CORS 响应头或者上线时用 Nginx 做反向代理解决，不能依赖 `vite.config.ts` 里的 `proxy`。

> 💬 **面试官**：本地用 Vite 的 proxy 能解决跨域，上线后还有效吗？
>
> ✅ 标准答案：不能。`vite.config.ts` 的 proxy 只在 `vite dev` 启动的开发服务器进程里生效，生产环境打包出的是纯静态文件，没有这层服务端转发能力，线上环境的跨域必须由真实的反向代理（Nginx）或后端 CORS 配置解决。
> 🎁 想加分：说明这本质上是「同源策略是浏览器的限制，不是服务器的限制」——开发环境代理的原理是让浏览器以为自己在同源请求（请求打到 Vite 的开发服务器），再由 Node 进程转发到真实后端，服务器到服务器之间没有同源限制，所以能绕过去。

---

## 📦 构建优化四件套：分析、去冗余、压缩、兼容

**基础 build 配置**，`config/index.ts` 新增开关常量：

```typescript
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

`config/build/index.ts`：

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
import vue from '@vitejs/plugin-vue';
import path from 'path';

import createVitePlugins from './config/plugins/index';
import createServer from './config/server';
import createBuild from './config/build';
import { VITE_APP_BASE } from './config';

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => ({
  plugins: [vue(), ...createVitePlugins()],
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
npm install rollup rollup-plugin-visualizer -D
```

`config/plugins/visualizer.ts`：

```typescript
import visualizer from 'rollup-plugin-visualizer';

export default function configVisualizer() {
  return visualizer({
    // 将打包的依赖分析可视化页面，写到node_modules中，这样不占位置
    filename: './node_modules/.cache/visualizer/stats.html',
    open: true,
    gzipSize: true,
    brotliSize: true,
  });
}
```

`config/plugins/index.ts` 汇总所有插件：

```typescript
import configEslint from './eslint';
import configVisualizer from './visualizer';
import { VITE_APP_VISUALIZER } from '../index';

export default function createVitePlugins() {
  const vitePlugins: any[] = [configEslint()];
  VITE_APP_VISUALIZER && vitePlugins.push(configVisualizer());
  return vitePlugins;
}
```

**压缩 HTML**：

```shell
npm install vite-plugin-html -D
```

```typescript
import { createHtmlPlugin } from 'vite-plugin-html';

export default function configHtml() {
  return createHtmlPlugin({
    minify: true,
  });
}
```

```typescript
import configEslint from './eslint';
import configVisualizer from './visualizer';
import configHtml from './html';
import { VITE_APP_VISUALIZER } from '../index';

export default function createVitePlugins() {
  const vitePlugins: any[] = [configEslint(), configHtml()];
  VITE_APP_VISUALIZER && vitePlugins.push(configVisualizer());
  return vitePlugins;
}
```

**压缩资源**（gzip）：

```shell
npm install vite-plugin-compression -D
```

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

```typescript
import configEslint from './eslint';
import configVisualizer from './visualizer';
import configHtml from './html';
import configCompression from './compression';
import { VITE_APP_VISUALIZER } from '../index';

export default function createVitePlugins() {
  const vitePlugins: any[] = [configEslint(), configHtml(), configCompression()];
  VITE_APP_VISUALIZER && vitePlugins.push(configVisualizer());
  return vitePlugins;
}
```

**兼容传统浏览器**（`@vitejs/plugin-legacy`）：Vite 默认只产出面向现代浏览器的 ESM 格式代码，这个插件会额外生成一份用 `<script nomodule>` 加载的传统格式产物，让老浏览器也能跑：

```shell
npm i -D @vitejs/plugin-legacy
```

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

```typescript
import configEslint from './eslint';
import configVisualizer from './visualizer';
import configHtml from './html';
import configCompression from './compression';
import configLegacy from './legacy';
import { VITE_APP_VISUALIZER } from '../index';

export default function createVitePlugins() {
  const vitePlugins: any[] = [configEslint(), configHtml(), configCompression(), configLegacy()];
  VITE_APP_VISUALIZER && vitePlugins.push(configVisualizer());
  return vitePlugins;
}
```

**这里要给出一个现实判断**：`@vitejs/plugin-legacy` 这里配的目标是 `ie >= 11`，但 IE11 已于 2022 年正式退役，微软自己都不再提供技术支持，国内主流网站的 IE 用户占比早已降到统计误差范围内。如果你现在要搭一个新的后台管理系统，**大概率不需要这个插件**——它会让构建时间显著变长（要多编译一套产物），除非有明确的政企客户合规要求必须兼容老版本浏览器，否则直接砍掉这一步是更合理的选择。保留它的判断依据只有一个：产品方案里是否写明了要支持的最低浏览器版本，而不是「保险起见都兼容一下」。

> 💬 **面试官**：怎么定位一个后台系统首屏加载慢的问题？
>
> ✅ 标准答案：先用 `rollup-plugin-visualizer` 生成打包分析图，找到体积最大的几个模块（通常是没有按需引入的组件库、没有做代码分割的第三方大库），再结合 Chrome DevTools 的 Network/Performance 面板看是资源体积问题还是渲染阻塞问题，针对性地做按需引入、路由懒加载、CDN 分离等优化。
> 🎁 想加分：区分「构建产物大」和「首屏慢」不完全等价——如果做了路由级别的代码分割（`() => import('@/pages/xxx.vue')`），首屏只加载当前路由需要的 chunk，即使总产物很大，首屏体验也可能没问题；反过来即使总产物不大，如果没做分割全部塞进一个文件，首屏也会慢。

🔧 **真实场景**：药品后台的商品管理模块引入了一个体积很大的图表库用来做销量趋势图，但这个图表只在「数据看板」这一个页面用到。用可视化分析图发现这个库占了主 bundle 的 30%，改成路由懒加载（`component: () => import('@/pages/dashboard/index.vue')`）后，首屏 JS 体积直接降了将近三分之一。

---

## 🎨 样式方案：Sass + 全局变量注入

Vite 原生支持 Less/Sass/Scss/Stylus，但预处理器本身的依赖要手动装。Vite 也原生支持 CSS Module——文件名加个 `.module` 后缀（`xx.module.css`/`xx.module.scss`/`xx.module.less`）就自动启用，写法和 Create React App 里的习惯一致。

```shell
pnpm install -D sass
```

**全局变量**：`src/styles` 下新建 `variables.scss`（变量）、`mixins.scss`（混入函数）、`transition.scss`（过渡动效）、`common.scss`（通用样式）、`index.scss`（汇总入口）：

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

`config/style/index.ts` 用 `additionalData` 把这份汇总文件注入到**每一个** Scss 文件里，不用在业务代码里手动 `@import`：

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
  };
};

export default createCss;
```

> **注意点**：`additionalData` 中如果引用 `@import` 格式，后面一定要加 `;`，否则会报错。

`vite.config.ts` 接入：

```typescript
import { defineConfig, ConfigEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

import createVitePlugins from './config/plugins/index';
import createServer from './config/server';
import createBuild from './config/build';
import createCss from './config/style';
import { VITE_APP_BASE } from './config';

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => ({
  plugins: [vue(), ...createVitePlugins()],
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

使用效果——`mixins.scss` 里定义的 `@include style()`、`@include flexContainer()` 在任意组件里直接用，不需要每个文件手动 import：

```less
<script setup lang="ts">
import HelloWorld from '@/components/HelloWorld.vue';
import { useTitle } from '@/hooks';
import { onMounted, ref } from 'vue';

// 设置 document title
useTitle();

const msg = ref('Hello Vue 3 + TypeScript + Vite');

onMounted(() => {
  msg.value = 'Hello Vue 3 + TypeScript + Vite !!!';
  fetch('/api/datav-res/datav/map.json')
    .then((res) => res.json())
    .then((data) => console.log(data));
});
</script>

<template>
  <header>Vue3 + vite</header>
  <img alt="Vue logo" src="./assets/logo.png" />
  <HelloWorld :msg="msg" />
</template>

<style lang="scss">
#app {
  height: 100%;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  color: #2c3e50;
  text-align: center;
  header {
    @include style(calc(10px + 2vmin), #ffffff);
    @include flexContainer();
    min-height: 60px;
    background-color: $bg;
  }
  img {
    height: 20vmin;
    pointer-events: none;
  }
  button {
    font-size: calc(10px + 1vmin);
  }
}
</style>
```

> 💬 **面试官**：CSS Module 解决了什么问题，和 Vue 的 `scoped` 是什么关系？
>
> ✅ 标准答案：CSS Module 通过给每个类名生成唯一 hash 后缀，从根本上解决全局样式命名冲突；Vue 的 `scoped` 是给渲染出的 DOM 节点加一个唯一的 `data-v-xxx` 属性，再用属性选择器限定样式作用范围，两者都是解决样式隔离，但实现机制完全不同——CSS Module 是类名级别隔离，`scoped` 是属性选择器级别隔离。
> 🎁 想加分：提到 `scoped` 有一个常见坑，深度选择组件内部的子组件样式需要用 `:deep()` 穿透，而 CSS Module 因为类名本身就是唯一的，不存在这个穿透问题，但也因此不能像 `scoped` 一样天然支持修改子组件根节点样式。

---

## 🧭 路由与状态管理：Pinia 为什么砍掉 mutations

**路由配置**：Vue Router 4.x 原生支持 TypeScript，路由类型是 `RouteRecordRaw`，其中 `meta` 字段给了业务发挥空间，常见约定：

- `title: string` 页面标题，通常必选
- `icon?: string` 图标，配合菜单使用
- `auth?: boolean` 是否需要登录权限
- `ignoreAuth?: boolean` 是否忽略权限
- `roles?: RoleEnum[]` 可访问的角色
- `keepAlive?: boolean` 是否开启页面缓存
- `hideMenu?: boolean` 是否在菜单中隐藏（比如某些编辑页）
- `order?: number` 菜单排序
- `frameUrl?: string` 嵌套外链

```shell
pnpm install -S vue-router
```

`src/routes/index.ts`：

```typescript
import { createRouter, createWebHashHistory } from 'vue-router';

export const routes = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/pages/home/index.vue'), // 注意这里要带上 文件后缀.vue
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/pages/dashboard/index.vue'),
  },
  {
    path: '/404',
    name: '404',
    hidden: true,
    meta: { notNeedAuth: true },
    component: () => import('@/pages/404/index.vue'),
  },
  // 匹配所有路径 vue2使用* vue3使用/:pathMatch(.*)或/:catchAll(.*)
  {
    path: '/:catchAll(.*)',
    redirect: '/404',
  },
];

// 路由实例
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
```

**这里有个写法上的细节要点破**：`/:catchAll(.*)` 能正常工作，但 Vue Router 4 官方文档给出的规范写法是 `/:pathMatch(.*)*`——参数名固定用 `pathMatch`，末尾多一个 `*` 表示把匹配到的路径按 `/` 分割成数组而不是一整个字符串，这在你需要拿到 404 页面具体访问了哪个路径时（比如做埋点上报）会更方便：

```typescript
{
  path: '/:pathMatch(.*)*',
  redirect: '/404',
}
```

入口文件挂载路由：

```tsx
import { createApp } from 'vue';
import App from '@/App.vue';
import router from './routes/index';
import '@/index.scss';

createApp(App).use(router).mount('#app');
```

`App.vue` 改为渲染布局组件：

```vue
<script setup lang="ts">
import BasicLayout from '@/layouts/BasicLayout.vue';
import { useTitle } from '@/hooks';

// 设置 document title
useTitle();
</script>

<template>
  <BasicLayout />
</template>

<style lang="scss">
#app {
  height: 100vh;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  color: #2c3e50;
  text-align: center;
}
</style>
```

`src/layouts/BasicLayout.vue`：

```vue
<script setup lang="ts">
// import { ref } from 'vue';
// const layout = ref('layout');
</script>

<template>
  <div class="layout">
    <header>LOGO</header>
    <p>
      <router-link to="/dashboard">dashboard</router-link>
      <router-link to="/home">home</router-link>
    </p>
    <img src="../assets/logo.png" />
    <router-view></router-view>
  </div>
</template>

<style scoped lang="scss">
.layout {
  height: 100%;
  header {
    @include style(calc(10px + 2vmin), #ffffff);
    @include flexContainer();

    min-height: 60px;
    background-color: $bg;
  }

  img {
    height: 20vmin;
    pointer-events: none;
  }

  button {
    font-size: calc(10px + 1vmin);
  }
}
</style>
```

`src/pages/dashboard/index.vue`：

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';

const dashboard = ref('Dashboard');

onMounted(() => {
  dashboard.value = 'Dashboard !!!';
  fetch('/api/datav-res/datav/map.json')
    .then((res) => res.json())
    .then((data) => console.log(data));
});
</script>

<template>
  <div>{{ dashboard }}</div>
</template>

<style scoped lang="scss"></style>
```

`src/pages/home/index.vue`：

```vue
<script setup lang="ts">
import { ref } from 'vue';

const home = ref('Home');
</script>

<template>
  <div>{{ home }}</div>
</template>

<style scoped lang="scss"></style>
```

`src/pages/404/index.vue`：

```vue
<script setup lang="ts">
import { ref } from 'vue';

const msg = ref('NOT FUND');
</script>

<template>
  <div>{{ msg }}</div>
</template>

<style scoped lang="scss"></style>
```

> 💬 **面试官**：后台管理系统的路由权限一般怎么设计？
>
> ✅ 标准答案：在路由 `meta` 里挂 `roles`/`auth`/`ignoreAuth` 这类字段，全局路由守卫（`router.beforeEach`）里读取当前登录用户的角色，比对目标路由的 `meta.roles`，决定放行、跳转登录页或跳转 403 页面；菜单渲染同理，根据 `meta.hideMenu`/`roles` 动态过滤生成菜单树。
> 🎁 想加分：提到两种权限模型的取舍——「前端静态声明所有路由 + 动态过滤菜单」实现简单但路由表本身对未授权用户也是可见的（只是不渲染菜单），「后端返回可访问路由列表 + 前端动态注册路由」安全性更高但实现复杂度上升，需要动态 `addRoute`。

**状态管理**用 Pinia 而不是 Vuex，核心设计取舍：

- `id` 是必要的，用来把 store 连接到 devtools
- 创建方式是 `defineStore(...)`，不再是 Vuex 的 `new Vuex.Store(...)`/`createStore(...)`
- `state` 是一个返回对象的函数，不是直接的对象
- **没有 mutations**，state 的变化依然完整记录在 devtools 里
- Actions 更灵活：可以被组件或其他 action 调用，可以从其他 store 的 action 里调用，可以直接在 store 实例上调用，支持同步或异步，可以有任意数量参数，也可以直接用 `$patch` 方法改状态

```vue
pnpm install -S pinia
```

`src/stores/global.ts`：

```typescript
import { defineStore } from 'pinia';

export const useGlobalStore = defineStore({
  id: 'global',
  state: () => ({
    title: 'App',
    theme: 'default',
    language: 'zh',
  }),
  // getters
  getters: {
    // title: (state) => state.title,
  },
  actions: {
    setTitle(payload: string) {
      // 可以做异步
      // await doAjaxRequest(data);
      this.title = payload;
    },
    setTheme(payload: string) {
      this.theme = payload;
    },
    async setLanguage(payload: string) {
      // 模拟接口请求
      await new Promise((resolve) => {
        setTimeout(() => {
          this.language = payload;
          resolve(payload);
        }, 1000);
      });
    },
  },
});
```

```typescript
import { useGlobalStore } from './global';

export { useGlobalStore };
```

入口文件挂载 Pinia：

```tsx
import { createApp } from 'vue';
import App from '@/App.vue';
import { createPinia } from 'pinia';
import router from './routes/index';
import '@/index.scss';

const app = createApp(App);
app.use(router);
app.use(createPinia());
app.mount('#app');
```

组件里用 `storeToRefs` 取值——**这一步不能省**，直接解构 `store.title` 会丢失响应性（普通对象解构拿到的是那一刻的值快照，不再是响应式引用），`storeToRefs` 把 store 上的每个 state 属性转换成对应的 `ref`，保持和原 store 的响应式绑定：

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useGlobalStore } from '@/stores';

const store = useGlobalStore();
const { title, language } = storeToRefs(store);
const dashboard = ref('Dashboard');

onMounted(() => {
  store.setLanguage('en');
  dashboard.value = 'Dashboard !!!';
  fetch('/api/datav-res/datav/map.json')
    .then((res) => res.json())
    .then((data) => console.log(data));
});
</script>

<template>
  <div>
    <p>{{ dashboard }}</p>
    <p>标题：{{ title }}</p>
    <p>语言：{{ language }}</p>
  </div>
</template>

<style scoped lang="scss"></style>
```

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useGlobalStore } from '@/stores';

const home = ref('Home');
const store = useGlobalStore();
const { title, language } = storeToRefs(store);
</script>

<template>
  <div>
    <p>{{ home }}</p>
    <p>标题：{{ title }}</p>
    <p>语言：{{ language }}</p>
    <button @click="store.setTitle('Dep_App')">setTitle</button>
  </div>
</template>

<style scoped lang="scss"></style>
```

> 💬 **面试官**：用 Pinia 时怎么会出现响应性丢失的坑？
>
> ✅ 标准答案：直接对 store 实例做解构赋值（`const { title, language } = store`）会丢失响应性，因为解构拿到的是当前时刻的原始值，之后 store 状态变化不会同步过来；正确做法是用 `storeToRefs(store)` 解构，方法（actions）不需要用 `storeToRefs`，可以直接从 store 实例上取。
> 🎁 想加分：解释 `storeToRefs` 底层原理——它遍历 store 上所有 state 和 getter，为每一个都创建一个指向 store 内部响应式对象对应属性的 `ref`（本质是 `computed` 或 `toRef`），解构出的 `ref` 和 store 内部状态共享同一份响应式依赖。

---

## 🌐 请求层封装：拦截器顺序 + 取消请求

这是整份笔记里工程深度最高的一节。先装依赖：

```shell
pnpm i -S axios
pnpm i -S nprogress
pnpm i -S @types/nprogress
```

`src/service/request/types.ts` 定义拦截器和请求配置的类型：

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
}

export default Request;
export type { RequestConfig, RequestInterceptors };
```

拦截器执行顺序值得单独讲：**接口请求拦截器 → 实例请求拦截器 → 全局请求拦截器 → 实例响应拦截器 → 全局响应拦截器 → 接口响应拦截器**。请求方向是「从内到外再到外部服务器」，响应方向是「从外部服务器再到内到外」——这不是随意设计，Axios 的拦截器本身是一个队列，`use()` 调用顺序决定了请求拦截器**按注册顺序执行**，响应拦截器则**按注册顺序执行**（不是反过来），但因为「全局响应拦截器保证最后执行」这条规则要求全局拦截器最后注册，所以在这份封装里，响应方向看起来是「实例 → 全局」。

> 💬 **面试官**：Axios 拦截器的执行顺序是怎样的，为什么要设计成这样？
>
> ✅ 标准答案：请求拦截器按注册顺序从早到晚依次执行，响应拦截器同样按注册顺序执行；这份封装里全局拦截器故意注册在实例拦截器之后，是为了保证「无论业务代码怎么加拦截器，最终统一解包 `res.data` 这一步永远最后执行」，避免业务拦截器拿到的是没解包的原始响应对象。
> 🎁 想加分：提到可以给单个请求配置独立的拦截器（`config.interceptors`），这一层会在实例拦截器之前/之后单独执行一次，用来处理某个接口的特殊逻辑（比如某个接口的响应结构和其他接口不一样），不用为了一个特例去改全局拦截器。

`request<T>` 方法本身要处理请求的发起、取消令牌注册、进度条控制、完成后清理：

```typescript
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
          resolve(res);
        })
        .catch((err: any) => {
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
```

**这里要明确点出一处技术过时点**：这份封装用的是 `axios.CancelToken`，这个 API 从 Axios v0.22 起就已经被标记为**废弃**，官方推荐用浏览器标准的 `AbortController`。原理上两者做的事一样——都是创建一个可以从外部触发的取消信号，绑定到请求配置上，Axios 内部检测到信号触发就中断请求——但 `AbortController` 是 Web 标准 API（`fetch` 也用它），不依赖 Axios 私有实现，迁移成本很低：

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

业务层 API 定义，`src/apis/dashboard/index.ts`：

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

export const getDashboardInfo = (data?: object) =>
  request({
    url: '/getDashboardInfo',
    method: 'POST',
    data,
  });
```

`src/apis/home/index.ts`：

```typescript
import request from '@/service';

export const getUserInfo = (data?: object) =>
  request({
    url: '/getUserInfo',
    method: 'POST',
    data,
  });
```

入口文件补上进度条样式：

```tsx
import { createApp } from 'vue';
import App from '@/App.vue';
import { createPinia } from 'pinia';
import router from './routes/index';
import 'nprogress/nprogress.css';
import '@/index.scss';

const app = createApp(App);
app.use(router);
app.use(createPinia());
app.mount('#app');
```

`env.d.ts` 补充环境变量类型：

```typescript
// / <reference types="vite/client" />

declare module '*.vue' {
  import { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface ImportMetaEnv {
  VITE_APP_TITLE: 'development' | 'test' | 'staging' | 'production';
  VITE_API_HOST: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

`.env` 补上接口前缀：

```vue
VITE_APP_TITLE="DEVELOPMENT APP"
VITE_API_HOST=/api
```

页面里调用接口，`src/pages/dashboard/index.vue`：

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useGlobalStore } from '@/stores';
import { getMapData } from '@/apis/dashboard';

const store = useGlobalStore();
const { title, language } = storeToRefs(store);
const dashboard = ref('Dashboard');

const getMap = async () => {
  const data = await getMapData();
  console.log(data);
};

onMounted(() => {
  store.setLanguage('en');
  dashboard.value = 'Dashboard !!!';
});
</script>

<template>
  <div>
    <p>{{ dashboard }}</p>
    <p>标题：{{ title }}</p>
    <p>语言：{{ language }}</p>
    <button @click="getMap">axios</button>
  </div>
</template>

<style scoped lang="scss"></style>
```

**这里要指出笔记后面示例代码里一个真实的 bug**：在补充 `getDashboardInfo` 按钮之后（下一节 Mock 部分），笔记原文写的是 `<button @click="getDashboardInfo">mock</button>`——直接把导入的 API 函数当作事件处理器绑定给 `@click`。Vue 的事件处理器被调用时，第一个参数默认是原生 DOM 事件对象（`MouseEvent`），这意味着点击时 `getDashboardInfo` 会收到一个 `MouseEvent` 作为 `data` 参数，被当成请求体传给后端，这是无意的参数污染。正确写法要包一层箭头函数：

```vue
<!-- ❌ 原文写法：click 事件对象会被当作 data 参数传进 getDashboardInfo -->
<button @click="getDashboardInfo">mock</button>

<!-- ✅ 正确写法：包一层箭头函数，不传参数或显式传业务需要的参数 -->
<button @click="() => getDashboardInfo()">mock</button>
```

> 💬 **面试官**：怎么实现接口的取消请求和防止重复请求？
>
> ✅ 标准答案：维护一个 URL 到取消句柄的映射表（`Map` 或数组），每次发起请求前先注册取消句柄，请求完成后清理；取消某个请求时按 URL 查到句柄调用 `abort()`（或旧版的 `cancel()`）；防重复请求可以在发起新请求前先检查该 URL 是否已在进行中，如果在，先取消旧的再发新的，或者直接复用进行中的 Promise。
> 🎁 想加分：提到 `AbortController` 现在是标准做法，一个 `controller.signal` 可以同时传给多个请求，`abort()` 一次能批量取消这一组请求，比逐个维护取消句柄更省心；也可以提到 React Query/SWR、Vue 的 VueUse 里 `useFetch` 都内置了这套取消逻辑，工程上很多场景不需要自己从零封装。

🔧 **真实场景**：药品搜索页的搜索框做输入联想，用户快速打字时每敲一个字都会触发一次请求，如果不做取消，多个请求的响应会按网络返回的先后顺序覆盖 UI，导致输入「阿莫西林」但联想列表显示的是「阿」这一个字的结果（网络延迟导致后发的请求先返回）。用取消机制保证每次新请求发起时取消上一次未完成的请求，才能保证联想结果和输入内容严格对应。

---

## 🎭 Mock 与国际化：本地和生产要分开控制

**Mock** 让前端不用等后端接口就能开发：

```shell
pnpm install mockjs -S
pnpm install vite-plugin-mock -D
```

`config/plugins/mock.ts`：

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

`config/plugins/index.ts` 汇总：

```typescript
import configEslint from './eslint';
import configVisualizer from './visualizer';
import configHtml from './html';
import configCompression from './compression';
import configLegacy from './legacy';
import configMock from './mock';
import { VITE_APP_VISUALIZER } from '../index';

export default function createVitePlugins(command: string) {
  const vitePlugins: any[] = [configEslint(), configHtml(), configCompression(), configLegacy(), configMock(command)];
  VITE_APP_VISUALIZER && vitePlugins.push(configVisualizer());
  return vitePlugins;
}
```

`vite.config.ts` 要把 `command` 传下去：

```typescript
import { defineConfig, ConfigEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

import createVitePlugins from './config/plugins/index';
import createServer from './config/server';
import createBuild from './config/build';
import createCss from './config/style';
import { VITE_APP_BASE } from './config';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }: ConfigEnv) => ({
  plugins: [vue(), ...createVitePlugins(command)],
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

根目录（和 `src` 同级）新建 `mock` 文件夹，放接口实现：

```typescript
import { MockMethod } from 'vite-plugin-mock';
import Mock from 'mockjs';
export default [
  {
    url: '/api/getDashboardInfo',
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
    url: '/api/getUserInfo',
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
export * from './dashboard';
export * from './home';
```

**这里要理清笔记原文一处表述和代码不一致的地方**：原文文字说的是新建 `mock/home.ts` 和 `mock/about.ts` 两个文件，但给出的代码块实际内容分别对应的是 `getDashboardInfo`（dashboard 模块）和 `getUserInfo`（home 模块）接口，并不是字面意义上的 home/about。按实际内容命名，应该是 `mock/dashboard.ts`（对应 `getDashboardInfo`）和 `mock/home.ts`（对应 `getUserInfo`），汇总文件 `mock/index.ts` 里 `export * from './dashboard'` 和 `export * from './home'` 也印证了这一点——文件名要以代码里 `export *` 引用的模块名为准，不要被前面的文字描述带偏。

页面调用（`src/pages/dashboard/index.vue` 追加 mock 按钮）：

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useGlobalStore } from '@/stores';
import { getMapData, getDashboardInfo } from '@/apis/dashboard';

const store = useGlobalStore();
const { title, language } = storeToRefs(store);
const dashboard = ref('Dashboard');

const getMap = async () => {
  const data = await getMapData();
  console.log(data);
};

onMounted(() => {
  store.setLanguage('en');
  dashboard.value = 'Dashboard !!!';
});
</script>

<template>
  <div>
    <p>{{ dashboard }}</p>
    <p>标题：{{ title }}</p>
    <p>语言：{{ language }}</p>
    <p><button @click="getMap">axios</button></p>
    <p><button @click="() => getDashboardInfo()">mock</button></p>
  </div>
</template>

<style scoped lang="scss"></style>
```

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useGlobalStore } from '@/stores';
import { getUserInfo } from '@/apis/home';

const home = ref('Home');
const store = useGlobalStore();
const { title, language } = storeToRefs(store);
</script>

<template>
  <div>
    <p>{{ home }}</p>
    <p>标题：{{ title }}</p>
    <p>语言：{{ language }}</p>
    <button @click="store.setTitle('Dep_App')">setTitle</button>
    <p><button @click="() => getUserInfo()">mock</button></p>
  </div>
</template>

<style scoped lang="scss"></style>
```

> 💬 **面试官**：Mock 数据方案除了 `vite-plugin-mock` 还有什么选择？
>
> ✅ 标准答案：`vite-plugin-mock` 是构建期插件方案，在 Vite 服务器层拦截匹配的请求路径直接返回假数据；另一种思路是运行时的网络层拦截，比如 MSW（Mock Service Worker），它用 Service Worker 或 Node 的 `http` 模块拦截层拦截真实的网络请求，业务代码完全感知不到 mock 的存在。
> 🎁 想加分：对比两者的适用场景——`vite-plugin-mock` 和 Vite 强绑定，配置简单，适合纯前端项目独立开发；MSW 是框架无关的，同一套 mock handler 可以同时用在浏览器开发环境和 Node 测试环境（单元测试/集成测试里 mock 网络请求），如果项目里已经在用 Vitest/Jest 做接口相关的测试，MSW 能让开发 mock 和测试 mock 复用同一套定义，减少维护量。

**国际化**用 vue-i18n：

```shell
pnpm install -S vue-i18n
```

`src/locales/index.ts` 初始化：

```typescript
import { createI18n } from 'vue-i18n';
import messages from './messages';

const i18nConfig = createI18n({
  fallbackLocale: 'zh',
  globalInjection: true,
  legacy: false, // you must set `false`, to use Composition API
  locale: 'zh',
  messages,
});

export default i18nConfig;
```

`legacy: false` 这一项是硬性要求——vue-i18n 默认的 `legacy` 模式对应 Vue 2 时代的 Options API 风格 API（`this.$t()`），要用 Composition API 的 `useI18n()` 组合式函数，必须显式关闭 legacy 模式，两种模式的内部实现和响应式追踪机制不同，不能混用。

`src/locales/messages/index.ts` 汇总多语言：

```typescript
import en from './json/en.json';
import ja from './json/ja.json';
import zh from './json/zh.json';

const messages = {
  ja,
  en,
  zh,
};
export default messages;
```

`src/locales/messages/json/en.json`：

```json
{
  "欢迎使用 vue-i18n": "Welcome to react using vue-i18n",
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

`ja.json`：

```json
{
  "欢迎使用 vue-i18n": "ご利用を歓迎する vue-i18n",
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

`zh.json`：

```json
{
  "欢迎使用 vue-i18n": "欢迎使用 vue-i18n",
  "切换语言": "切换语言",
  "切换到中文": "切换到中文",
  "切换到英文": "切换到英文",
  "切换到日文": "切换到日文",
  "methods": {
    "renderProps": "用renderProps转换",
    "hook": "用hook转换",
    "hoc": "用hoc转换"
  }
}
```

**这里要指出一个维护性反模式**：这份配置直接用中文原文（`"欢迎使用 vue-i18n"`）作为 key，能跑，但存在两个隐患——一是文案改动会连带改所有语言文件的 key（key 变了，所有语言包都要同步改），二是中文 key 里如果有细微的空格、标点差异，会导致某个语言包漏翻译时静默 fallback，排查起来比看 `key.welcome` 这种语义化 key 麻烦得多。更推荐的做法是用语义化的英文 key（比如 `welcome`、`switchLanguage`），中文文案本身作为 `zh.json` 里的一个翻译值存在，和其他语言地位对等：

```json
// zh.json（推荐写法）
{
  "welcome": "欢迎使用 vue-i18n",
  "switchLanguage": "切换语言"
}
```

入口文件挂载：

```tsx
import { createApp } from 'vue';
import App from '@/App.vue';
import { createPinia } from 'pinia';
import router from './routes/index';
import i18nConfig from './locales';
import 'nprogress/nprogress.css';
import '@/index.scss';

const app = createApp(App);
app.use(router);
app.use(createPinia());
app.use(i18nConfig);
app.mount('#app');
```

页面里切换语言，`dashboard`：

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useGlobalStore } from '@/stores';
import { getMapData, getDashboardInfo } from '@/apis/dashboard';
import { useI18n } from 'vue-i18n';

const { locale, t } = useI18n({ useScope: 'global' });

const change = (type: string) => {
  locale.value = type; // change!
};

const store = useGlobalStore();
const { title, language } = storeToRefs(store);
const dashboard = ref('Dashboard');

const getMap = async () => {
  const data = await getMapData();
  console.log(data);
};

onMounted(() => {
  store.setLanguage('en');
  dashboard.value = 'Dashboard !!!';
});
</script>

<template>
  <div>
    <p>{{ dashboard }}</p>
    <p>标题：{{ title }}</p>
    <p>语言：{{ language }}</p>
    <p>
      语言切换测试：{{ t('欢迎使用 vue-i18n') }}
      <button @click="change('zh')">{{ t('切换到中文') }}</button>
      <button @click="change('en')">{{ t('切换到英文') }}</button>
      <button @click="change('ja')">{{ t('切换到日文') }}</button>
    </p>
    <p><button @click="getMap">axios</button></p>
    <p><button @click="() => getDashboardInfo()">mock</button></p>
  </div>
</template>

<style scoped lang="scss"></style>
```

`home`：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useGlobalStore } from '@/stores';
import { getUserInfo } from '@/apis/home';
import { useI18n } from 'vue-i18n';

const { t } = useI18n({ useScope: 'global' });

const home = ref('Home');
const store = useGlobalStore();
const { title, language } = storeToRefs(store);
</script>

<template>
  <div>
    <p>{{ home }}</p>
    <p>标题：{{ title }}</p>
    <p>语言：{{ language }}</p>
    <p>语言切换测试：{{ t('欢迎使用 vue-i18n') }}</p>
    <button @click="store.setTitle('Dep_App')">setTitle</button>
    <p><button @click="() => getUserInfo()">mock</button></p>
  </div>
</template>

<style scoped lang="scss"></style>
```

**踩坑记录**：`vue-i18n.esm-bundler.js` 会报警告：

> You are running the esm-bundler build of vue-i18n. It is recommended to configure your bundler to explicitly replace feature flag globals with boolean literals to get proper tree-shaking in the final bundle.

解决方式是在 `resolve.alias` 里把 `vue-i18n` 显式指向 CJS 构建产物：

```typescript
import { defineConfig, ConfigEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

import createVitePlugins from './config/plugins/index';
import createServer from './config/server';
import createBuild from './config/build';
import createCss from './config/style';
import { VITE_APP_BASE } from './config';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }: ConfigEnv) => ({
  plugins: [vue(), ...createVitePlugins(command)],
  base: VITE_APP_BASE,
  server: createServer(mode),
  build: createBuild(),
  css: createCss(),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // 解决警告You are running the esm-bundler build of vue-i18n.
      'vue-i18n': 'vue-i18n/dist/vue-i18n.cjs.js',
    },
  },
}));
```

> 💬 **面试官**：Pinia 的 `setLanguage` action 和 vue-i18n 的 `locale.value` 切换语言，这是不是重复设计？
>
> ✅ 标准答案：这是这套代码里一个值得讨论的设计问题——`store.language`（Pinia 状态）和 `locale.value`（vue-i18n 内部状态）各管一份「当前语言」，两者没有绑定关系，切换 `locale.value` 不会同步更新 `store.language`，反过来也一样，容易导致状态不一致。
> 🎁 想加分：给出改进方案——应该只保留一份「真相源」，比如让 `locale.value` 是唯一状态源，Pinia 里的 `language` 改成一个基于 `locale` 派生的只读值，或者反过来在 `setLanguage` action 内部同时调用 `i18n.global.locale.value = payload` 同步两处状态，避免双头管理。

---

## 🧩 Element-Plus 按需引入：从手动配置到自动化

```shell
pnpm install element-plus -S
pnpm install vite-plugin-style-import -D
```

`config/plugins/styleImport.ts` 让样式按需加载：

```typescript
import { createStyleImportPlugin, ElementPlusResolve } from 'vite-plugin-style-import';

export default function configStyleImport() {
  return createStyleImportPlugin({
    resolves: [ElementPlusResolve()],
    libs: [
      {
        libraryName: 'element-plus',
        esModule: true,
        base: 'element-plus/theme-chalk/base.css',
        resolveStyle: (name) => {
          return `element-plus/theme-chalk/${name}.css`;
        },
      },
    ],
  });
}
```

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

**这个方案现在已经不是主流做法**。`vite-plugin-style-import` 只解决了「样式按需加载」的问题，组件本身还是要手动 `import { ElButton } from 'element-plus'` 逐个引入。现在业界的最佳实践是 `unplugin-vue-components` + `unplugin-auto-import` 这对组合——两者都用编译时的 AST 转换，扫描你模板里用到的组件标签或代码里用到的 API，自动生成对应的 `import` 语句，连手动写 `import` 这一步都省了：

```shell
pnpm install -D unplugin-vue-components unplugin-auto-import
```

```typescript
// vite.config.ts
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';

export default defineConfig({
  plugins: [
    // ...
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
});
```

配好之后，模板里直接写 `<el-button>` 就能用，不需要任何 `import`，组件和对应样式都是按需引入的，产物体积和手动按需引入效果一致，但开发体验更接近「全局组件库」。

> 💬 **面试官**：组件库按需引入是怎么做到的，和全量引入的产物体积差异有多大？
>
> ✅ 标准答案：按需引入依赖 ES Module 的静态分析——只要组件库本身是按组件拆分导出的（每个组件对应独立文件），构建工具（Rollup/Webpack）在 Tree Shaking 阶段能识别出哪些组件实际被 `import` 了，未被引用的组件代码不会打进最终产物；`unplugin-vue-components` 这类插件更进一步，直接在编译期分析模板用到了哪些组件标签，生成精确的 `import`，不依赖开发者手动维护 import 列表。
> 🎁 想加分：全量引入 Element-Plus（`app.use(ElementPlus)`）会把整个组件库的 JS 和 CSS 全部打进产物，即使你只用了三个组件；按需引入后产物体积能从几百 KB 降到几十 KB，差异在于「引入的是组件库的入口文件（聚合了所有组件）」还是「引入具体某个组件的独立文件」。

Element-Plus 的完整使用示例（布局 + 图标）：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
  ElContainer,
  ElHeader,
  ElAside,
  ElMain,
  ElMenu,
  ElMenuItem,
  ElSubMenu,
  ElIcon,
  ElScrollbar,
  ElSpace,
  ElAvatar,
  ElDropdown,
  ElDropdownMenu,
  ElDropdownItem,
} from 'element-plus';
import { DataLine, HelpFilled, ArrowDown } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';

const { locale, t } = useI18n({ useScope: 'global' });

const change = (type: string) => {
  locale.value = type; // change!
};
const scrollbarHeight = ref('calc(100vh - 60px)');
</script>

<template>
  <el-container class="layout">
    <el-header>
      <el-space>
        <span class="logo">LOGO</span>
      </el-space>
      <el-space alignment="center" :size="30">
        <el-dropdown>
          <span>切换语言</span>
          <el-icon><arrow-down /></el-icon>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="change('zh')">{{ t('切换到中文') }}</el-dropdown-item>
              <el-dropdown-item @click="change('en')">{{ t('切换到英文') }}</el-dropdown-item>
              <el-dropdown-item @click="change('ja')">{{ t('切换到日文') }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-avatar src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
      </el-space>
    </el-header>
    <el-container>
      <el-aside width="200px">
        <el-scrollbar :height="scrollbarHeight" view-style="height:100%">
          <el-menu
            :default-openeds="['2']"
            active-text-color="#ffd04b"
            background-color="#282c34"
            text-color="#fff"
            default-active="/dashboard"
            router
          >
            <el-menu-item index="/dashboard">
              <el-icon><DataLine /></el-icon>
              <span>工作台</span>
            </el-menu-item>
            <el-sub-menu index="2">
              <template #title>
                <el-icon><HelpFilled /></el-icon>
                <span>首页</span>
              </template>
              <el-menu-item index="/home">
                <span>图表</span>
              </el-menu-item>
            </el-sub-menu>
          </el-menu>
        </el-scrollbar>
      </el-aside>
      <el-main>
        <el-scrollbar :height="scrollbarHeight">
          <router-view></router-view>
        </el-scrollbar>
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped lang="scss">
.layout {
  height: 100%;

  .logo {
    font-size: 24px;
  }

  .el-header {
    @include style(calc(10px + 2vmin), #ffffff);
    @include flexContainer(row, space-between);

    min-height: 60px;
    background-color: $bg;

    .el-space {
      .el-dropdown {
        color: #ffffff;
        cursor: pointer;

        .el-icon {
          margin-left: 5px;
        }
      }
    }
  }

  .el-aside {
    .el-scrollbar {
      .el-menu {
        height: 100%;

        .el-menu-item {
          a {
            display: inline-block;
            color: #ffffff;
            text-decoration: none;
          }
        }
      }
    }
  }

  .el-main {
    padding: 0;
  }
}
</style>
```

`dashboard` 页面接入 `ElButton`：

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useGlobalStore } from '@/stores';
import { getMapData, getDashboardInfo } from '@/apis/dashboard';
import { useI18n } from 'vue-i18n';
import { ElButton } from 'element-plus';

const { t } = useI18n({ useScope: 'global' });

const store = useGlobalStore();
const { title, language } = storeToRefs(store);
const dashboard = ref('Dashboard');

const getMap = async () => {
  const data = await getMapData();
  console.log(data);
};

onMounted(() => {
  store.setLanguage('en');
  dashboard.value = 'Dashboard !!!';
});
</script>

<template>
  <div>
    <p>{{ dashboard }}</p>
    <p>标题：{{ title }}</p>
    <p>语言：{{ language }}</p>
    <p>语言切换测试：{{ t('欢迎使用 vue-i18n') }}</p>
    <p><el-button type="warning" @click="getMap">axios</el-button></p>
    <p><el-button type="danger" @click="() => getDashboardInfo()">mock</el-button></p>
  </div>
</template>

<style scoped lang="scss"></style>
```

`home` 页面同理：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useGlobalStore } from '@/stores';
import { getUserInfo } from '@/apis/home';
import { useI18n } from 'vue-i18n';
import { ElButton } from 'element-plus';

const { t } = useI18n({ useScope: 'global' });

const home = ref('Home');
const store = useGlobalStore();
const { title, language } = storeToRefs(store);
</script>

<template>
  <div>
    <p>{{ home }}</p>
    <p>标题：{{ title }}</p>
    <p>语言：{{ language }}</p>
    <p>语言切换测试：{{ t('欢迎使用 vue-i18n') }}</p>
    <el-button @click="store.setTitle('Dep_App')">setTitle</el-button>
    <p><el-button type="success" @click="() => getUserInfo()">mock</el-button></p>
  </div>
</template>

<style scoped lang="scss"></style>
```

**Icon 图标**：

```shell
pnpm install @element-plus/icons-vue -S
```

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useGlobalStore } from '@/stores';
import { getMapData, getDashboardInfo } from '@/apis/dashboard';
import { useI18n } from 'vue-i18n';
import { ElButton, ElIcon } from 'element-plus';
import { AlarmClock } from '@element-plus/icons-vue';

const { t } = useI18n({ useScope: 'global' });

const store = useGlobalStore();
const { title, language } = storeToRefs(store);
const dashboard = ref('Dashboard');

const getMap = async () => {
  const data = await getMapData();
  console.log(data);
};

onMounted(() => {
  store.setLanguage('en');
  dashboard.value = 'Dashboard !!!';
});
</script>

<template>
  <div>
    <p>{{ dashboard }}</p>
    <p>标题：{{ title }}</p>
    <p>语言：{{ language }}</p>
    <el-icon :size="50" color="red">
      <AlarmClock />
    </el-icon>
    <p>语言切换测试：{{ t('欢迎使用 vue-i18n') }}</p>
    <p><el-button type="warning" @click="getMap">axios</el-button></p>
    <p><el-button type="danger" @click="() => getDashboardInfo()">mock</el-button></p>
  </div>
</template>

<style scoped lang="scss"></style>
```

参考：搜索关键词 `vbenjs vite-plugin-style-import`

🔧 **真实场景**：药品后台系统涉及的 Element-Plus 组件其实只有二十来个（表格、表单、弹窗、菜单为主），全量引入时 CSS 产物有 700KB+，切换到 `unplugin-vue-components` 按需引入后降到不到 100KB，且新增组件时开发者完全不需要操心「这个组件要不要手动 import 样式」，心智负担降到最低。

---

## 🧪 测试体系：从 Jest 到 Vitest 的必然迁移

**单元测试**，原始方案是 Jest 全家桶：

```shell
pnpm install @types/jest jest -D
pnpm install @vue/vue3-jest -D
pnpm install babel-jest -D
pnpm install @vue/test-utils@next -D
pnpm install @testing-library/jest-dom -D
pnpm install ts-jest -D
pnpm install @babel/preset-env @babel/core -D
pnpm install identity-obj-proxy -D
```

`jest.config.js`：

```javascript
module.exports = {
  preset: 'ts-jest',
  roots: ['<rootDir>'],
  moduleDirectories: ['node_modules', 'src'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest', // vue 文件用 vue-jest 转换
    '^.+\\.ts$': 'ts-jest', // ts 文件用 ts-jest 转换
  },
  testRegex: '(tests.unit.*.(test|spec)).(jsx?|tsx?)$',
  moduleFileExtensions: ['vue', 'ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*.{vue, ts,tsx,js,jsx}'],
  coverageDirectory: '<rootDir>/coverage/',
  verbose: true,
  testTimeout: 30000,
  // 为了修复 Consider using the "jsdom" test environment. 问题
  testEnvironment: 'jsdom',
  coveragePathIgnorePatterns: ['<rootDir>/node_modules/', '(.*).d.ts$'],
  moduleNameMapper: {
    '^@/(.*)': '<rootDir>/src/$1',
    '^.+\\.module\\.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2|svg)$': 'identity-obj-proxy',
  },
};
```

`.eslintrc.js` 补充 Jest 全局变量：

```javascript
module.exports = {
  // ...
  env: {
    // ...
    jest: true,
  },
  // ...
};
```

脚本：

```json
"unit": "jest --colors --passWithNoTests",
"unit-watch": "jest --watchAll",
"coverage": "jest --coverage",
```

`tests/unit/HelloWorld.test.tsx`：

```tsx
import getMsg from './utils';
import HelloWorld from '../../src/components/HelloWorld.vue';

test('1+1=2', () => {
  expect(1 + 1).toBe(2);
});
test('getMsg', () => {
  expect(getMsg()).toBe('this is msg');
});
test('HelloWorld', () => {
  console.log('HelloWorld', HelloWorld);
});
```

```typescript
export default function () {
  return 'this is msg';
}
```

`tests/env.d.ts`：

```typescript
// / <reference types="vite/client" />

declare module '*.vue' {
  import { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare const cy: any;
```

**这里要给出明确的技术升级建议**：在 Vite 项目里配 Jest，本质是在用两条平行的编译链路——Vite 用它自己的转换机制跑开发/构建，Jest 又要单独配 `ts-jest`/`@vue/vue3-jest` 走一条完全独立的转换链路，两条链路的模块解析、别名处理、TS 编译选项都要维护两份，很容易出现「业务代码能跑，测试跑不起来」的配置漂移问题。

现在的标配是 **Vitest**——它是 Vite 官方生态的测试框架，直接复用 Vite 的转换插件链和配置（`resolve.alias`、`vite.config.ts` 里的 CSS 处理这些直接生效，不用重新配一遍），API 基本兼容 Jest（`describe`/`test`/`expect` 语法几乎不用改），但因为跑在 Vite 的转换链路上，速度明显更快：

```shell
pnpm install -D vitest @vue/test-utils jsdom
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

```typescript
// tests/unit/HelloWorld.test.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import HelloWorld from '@/components/HelloWorld.vue'; // 👈 alias 直接复用，不用单独配 moduleNameMapper

describe('HelloWorld', () => {
  it('renders msg prop', () => {
    const wrapper = mount(HelloWorld, { props: { msg: 'hello' } });
    expect(wrapper.text()).toContain('hello');
  });
});
```

对比能看出核心差异：Jest 版本需要单独处理 `@` 别名（`moduleNameMapper`）、单独处理 `.module.scss` 的 mock（`identity-obj-proxy`）、单独转换 `.vue`/`.ts` 文件；Vitest 直接吃 `vite.config.ts` 里已经配好的一切，配置量大幅下降。

**E2E 测试**，原始方案是 Cypress：

```shell
pnpm install cypress @types/cypress -D
```

`cypress.json`：

```javascript
{
  "pluginsFile": "tests/e2e/plugins/index.ts",
  "video": false
}
```

`tests/e2e/plugins/index.ts`：

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

```typescript
module.exports = {};
```

脚本：

```json
"test": "pnpm unit && pnpm e2e",
"unit": "jest --colors --passWithNoTests",
"unit-watch": "jest --watchAll",
"coverage": "jest --coverage",
"e2e": "cypress open",
"e2e-run": "cypress run"
```

`tests/e2e/specs/index.specs.tsx`：

```tsx
describe('home', () => {
  it('button click', () => {
    cy.visit('http://localhost:3002');
    cy.get('main');
  });
});
```

**这里也要指出一处版本过时点**：`cypress.json` 是 Cypress 9 及以前的配置文件格式，Cypress 10+ 已经改用 `cypress.config.ts`，配置结构和插件系统都有较大调整（比如 `pluginsFile` 被移除，改用 `setupNodeEvents`）：

```typescript
// cypress.config.ts（Cypress 10+ 写法）
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3002',
    specPattern: 'tests/e2e/specs/**/*.cy.ts',
    supportFile: 'tests/e2e/support/index.ts',
  },
});
```

> 💬 **面试官**：Vue 组件怎么写单测，为什么很多团队后台系统单测覆盖率普遍不高？
>
> ✅ 标准答案：用 `@vue/test-utils` 的 `mount`/`shallowMount` 把组件挂载到测试环境的虚拟 DOM（jsdom）里，通过 `wrapper.find()`/`wrapper.text()`/`wrapper.trigger()` 模拟交互并断言渲染结果；后台系统单测覆盖率低的常见原因是页面逻辑高度依赖接口数据和权限状态，组件强耦合 Pinia store 和路由，写单测前要先 mock 大量外部依赖，投入产出比不如面向 C 端核心链路的项目高。
> 🎁 想加分：区分「组件单测」和「业务逻辑单测」——后台系统更务实的策略往往是把复杂的业务逻辑（比如表单校验规则、权限判断函数、数据转换函数）抽成纯函数放到 `utils` 里单独测，UI 组件本身依赖 E2E 或人工测试覆盖，纯函数的测试成本和收益比组件测试更高。

---

## 📁 目录结构：职责分离原则的落地

```vue
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
│  ├─directives     // 指令目录
│  │  └─print
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

## 💡 一张图总结（面试速记）

| 知识点 | 一句话结论 | 面试价值 |
|---|---|---|
| Vite vs Webpack | 开发环境不打包，靠浏览器原生 ESM 按需编译，第三方依赖用 esbuild 预构建 | 高频，考查底层原理 |
| ESLint + Prettier | 职责分离，Prettier 管格式、ESLint 管质量，用 `eslint-config-prettier` 消除冲突 | 中频，考查工程规范意识 |
| lint-staged | 只检查暂存区文件，控制 pre-commit 执行时间 | 中频 |
| 别名双配置 | Vite 的 `resolve.alias` 管打包，`tsconfig.paths` 管类型检查，两套独立工具链 | 高频，容易漏答一半 |
| `VITE_` 前缀 | 安全边界，防止敏感环境变量被打进客户端包 | 中频 |
| proxy 跨域 | 只在开发环境 Node 进程里生效，生产环境要靠 Nginx/CORS | 高频，考查是否理解同源策略本质 |
| Pinia 去掉 mutations | Actions 承担了原来 mutations 的职责，devtools 依然能追踪状态变化 | 高频 |
| `storeToRefs` | 直接解构 store 会丢失响应性，必须用它保持响应式绑定 | 高频，手写坑点 |
| Axios 拦截器顺序 | 请求方向从内到外，响应方向全局拦截器保证最后执行解包 `res.data` | 高频，工程深度题 |
| 取消请求 | 维护 URL 到取消句柄的映射，`AbortController` 是现在的标准做法 | 高频，手写题 |
| Mock 双开关 | `localEnabled`/`prodEnabled` 分开控制，防止假数据混入生产包 | 中频 |
| 按需引入 | 依赖 ES Module 静态分析做 Tree Shaking，`unplugin-vue-components` 是现在的最佳实践 | 中频 |
| Jest → Vitest | Vitest 复用 Vite 转换链路，配置量和运行速度都优于 Jest | 中频，考查是否跟进生态 |
| 目录结构 | 关注点分离，横向按技术职责划分是主流，规模大了叠加纵向业务划分 | 低频，但体现工程判断力 |

---

## 📝 留个问题

这套脚手架里 `axios.CancelToken` 换成 `AbortController` 之后，如果一个页面同时发起了三个并行请求（比如药品详情页的基本信息、说明书、相似推荐），用户在这三个请求都没返回时就切换到了另一个页面——你会怎么设计一个统一的机制，在路由离开时自动取消这个页面发出的所有未完成请求，而不需要每个页面手动调用三次 `cancelRequest`？评论区聊聊你的方案。

---

> 🔖 这是「Vue 3 全家桶深度拆解系列」第 12 篇。上一篇：《Turborepo + pnpm workspace：Vue 3 前端 AI 组件库从零搭建（面试收藏级）》









