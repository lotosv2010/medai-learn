# 简介
## 介绍 vite
+ Vite：下一代前端开发与构建工具
    - 极速的开发服务器启动
    - ⚡️ 轻量快速的热模块重载（HMR）
    - 🛠️ 丰富的功能
    - 📦 自带优化的构建
    - 🔩 通用的插件接口
    - 🔑 完全类型化的 API
+ Vite （法语意为 “迅速”，发音 /vit/）是一种全新的前端构建工具，它极大地改善了前端开发体验。它主要由两部分组成：
    - 一个开发服务器，它基于原生 ES 模块提供了丰富的内建功能，如速度快到惊人的模块热更新（HMR）。
    - 一套构建指令，它使用 Rollup 打包你的代码，并且它是预配置的，可以输出用于生产环境的优化过的静态资源。
    - Vite 意在提供开箱即用的配置，同时它的 插件 API 和 JavaScript API 带来了高度的可扩展性，并有完整的类型支持。

## 目标
+ 构建项目的要求如下：
    - 支持Typescript
    - 支持React、JSX语法
    - 支持ES6语法
    - 支持Scss module
    - 支持Eslint、Prettier、Pre-commit hook
    - 支持HMR快速热更新
    - 支持Antd按需引入与主题样式覆盖
    - 支持Proxy代理、alias别名
    - 兼容传统浏览器
    - 开发启动速度要够快，以秒计算
    - 支持懒加载和chunk分割

# 初始化项目
+ 采用的 [vite 2.0](https://link.segmentfault.com/?enc=JadgkOebg1una78BjJbS4Q%3D%3D.uSLZJu4yWcX%2FnD7TbtnzF4RgEThDMa9AVu0W6OzJ3RUq9ZP7ygXSRf6ZT06f%2Fh98) 来初始化我们的项目

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

# 约束代码风格
## Eslint 支持
+ [eslint-config-alloy](https://github.com/AlloyTeam/eslint-config-alloy/blob/master/README.zh-CN.md)
+ [彻底搞懂 ESLint 和 Prettier](https://juejin.cn/post/6909788084666105864)

### <font style="color:rgb(163, 163, 163) !important;">安装依赖</font>
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

### <font style="color:rgb(163, 163, 163) !important;">配置</font>
+ 新建.eslintrc.js，.eslintignore两个文件，更src同级目录，内容如下

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

## prettier 支持
### <font style="color:rgb(163, 163, 163) !important;">安装依赖</font>
```shell
npm install -D prettier
```

### 解决 eslint 和 prettier 冲突
方案

+ 解决 ESLint 中的样式规范和 prettier 中样式规范的冲突，以 prettier 的样式规范为准，使 ESLint 中的样式规范自动失效

安装依赖

```plain
# 安装插件 eslint-config-prettier
# 为 eslint 代码校验规则与 prettier 代码校验规则部分冲突提供支持
pnpm i -D eslint-config-prettier
```

### <font style="color:rgb(163, 163, 163) !important;">配置</font>
+ 新建.prettierrc.js，.prettierignore两个文件，更src同级目录，内容如下

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

## 自动检测
### 安装依赖
```shell
npm install -D vite-plugin-checker
```

### 配置
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

## stylelint 
### 安装依赖
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

### 配置
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
    'no-descending-specificity': null,
    'font-family-no-missing-generic-family-keyword': null,
    'declaration-colon-space-after': 'always-single-line',
    'declaration-colon-space-before': 'never',
    // 'declaration-block-trailing-semicolon': 'always',
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
      'max-width',
      'max-height',
      'min-width',
      'min-height',
      'padding',
      'padding-top',
      'padding-right',
      'padding-bottom',
      'padding-left',
      'margin',
      'margin-top',
      'margin-right',
      'margin-bottom',
      'margin-left',
      'margin-collapse',
      'margin-top-collapse',
      'margin-right-collapse',
      'margin-bottom-collapse',
      'margin-left-collapse',
      'overflow',
      'overflow-x',
      'overflow-y',
      'clip',
      'clear',
      'font',
      'font-family',
      'font-size',
      'font-smoothing',
      'osx-font-smoothing',
      'font-style',
      'font-weight',
      'hyphens',
      'src',
      'line-height',
      'letter-spacing',
      'word-spacing',
      'color',
      'text-align',
      'text-decoration',
      'text-indent',
      'text-overflow',
      'text-rendering',
      'text-size-adjust',
      'text-shadow',
      'text-transform',
      'word-break',
      'word-wrap',
      'white-space',
      'vertical-align',
      'list-style',
      'list-style-type',
      'list-style-position',
      'list-style-image',
      'pointer-events',
      'cursor',
      'background',
      'background-attachment',
      'background-color',
      'background-image',
      'background-position',
      'background-repeat',
      'background-size',
      'border',
      'border-collapse',
      'border-top',
      'border-right',
      'border-bottom',
      'border-left',
      'border-color',
      'border-image',
      'border-top-color',
      'border-right-color',
      'border-bottom-color',
      'border-left-color',
      'border-spacing',
      'border-style',
      'border-top-style',
      'border-right-style',
      'border-bottom-style',
      'border-left-style',
      'border-width',
      'border-top-width',
      'border-right-width',
      'border-bottom-width',
      'border-left-width',
      'border-radius',
      'border-top-right-radius',
      'border-bottom-right-radius',
      'border-bottom-left-radius',
      'border-top-left-radius',
      'border-radius-topright',
      'border-radius-bottomright',
      'border-radius-bottomleft',
      'border-radius-topleft',
      'content',
      'quotes',
      'outline',
      'outline-offset',
      'opacity',
      'filter',
      'visibility',
      'size',
      'zoom',
      'transform',
      'box-align',
      'box-flex',
      'box-orient',
      'box-pack',
      'box-shadow',
      'box-sizing',
      'table-layout',
      'animation',
      'animation-delay',
      'animation-duration',
      'animation-iteration-count',
      'animation-name',
      'animation-play-state',
      'animation-timing-function',
      'animation-fill-mode',
      'transition',
      'transition-delay',
      'transition-duration',
      'transition-property',
      'transition-timing-function',
      'background-clip',
      'backface-visibility',
      'resize',
      'appearance',
      'user-select',
      'interpolation-mode',
      'direction',
      'marks',
      'page',
      'set-link-source',
      'unicode-bidi',
      'speak',
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

## 脚本配置
```json
{
  "script": {
    "lint:js": "eslint --cache --ext .js,.jsx,.ts,.tsx --format=pretty ./src",
    "lint:prettier": "prettier --check \"src/**/*\" --end-of-line auto",
    "lint:style": "stylelint --fix \"**/*.{vue,less,postcss,css,scss}\" --cache --cache-location node_modules/.cache/stylelint/",
  }
}
```

+ 上面配置完成后,可以运行以下命令测试下代码检查个格式化效果:

```plain
# eslint 检查
pnpm lint:js
# prettier 自动格式化
pnpm lint:prettier
```

## GitHooks
+ [一文带你彻底学会 Git Hooks 配置](https://segmentfault.com/a/1190000022970270)

### 安装依赖
```shell
npm i -D yorkie
npm i -D lint-staged
```

### 配置
```json
// 主要配置 触发pre-commit 进行elint stylelint 格式校验
{
   "lint": "npm run lint:js && npm run lint:style && npm run lint:prettier",
   "lint:js": "eslint --cache --ext .js,.jsx,.ts,.tsx --format=pretty ./src",
   "lint:prettier": "prettier --check "**/*" --end-of-line auto",
   "lint:style": "stylelint --fix "src/**/*.less" --syntax less",
   "lint-staged": "lint-staged",
   "lint-staged:js": "eslint --ext .js,.jsx,.ts,.tsx "
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

## 扩展
+ [从零构建前端 ESLint 工作流](https://segmentfault.com/a/1190000022881634)
+ [彻底搞懂 ESLint 和 Prettier](https://juejin.cn/post/6909788084666105864)

# vite 配置
## <font style="color:rgb(163, 163, 163) !important;">别名配置</font>
### 安装依赖
```shell
npm i -D path @types/node
```

### 配置
+ <font style="color:rgb(214, 51, 132);">vite.config.ts</font><font style="color:rgb(33, 37, 41);"> 中新增 </font>resolve 配置节点，<font style="color:rgb(33, 37, 41);">用来编译识别用的</font>

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

+ <font style="color:rgb(214, 51, 132);">tsconfig.json</font><font style="color:rgb(33, 37, 41);"> 中新增 </font>paths 配置节点，<font style="color:rgb(33, 37, 41);">是用来给 Typescript 识别用的</font>

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

### 使用
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

## <font style="color:rgb(163, 163, 163) !important;">环境变量</font>
### 设置环境变量
+ 新增.env，.env.test，.env.staging，.env.production 四个文件，更src同级目录
+ 分别代表<font style="color:#E8323C;">开发，测试，预发，生产</font>四个环境变量，如果想要扩展其它的变量，以此类推
+ 自定义环境变量一定要是 <font style="color:#E8323C;">VITE </font>为前缀的变量才会暴露给vite,如：VITE_APP_TITLE

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

### 设置脚本
+ 之所以要在package.json中的命令加--mode，是为了覆盖命令使用的默认模式production,development

```json
"scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:test": "vite build --mode test",
    "build:staging": "vite build --mode staging",
    "preview": "vite preview",
  },
```

### 设置typescript
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_APP_TITLE: 'development' | 'test' | 'staging' | 'production';
}
```

### 获取环境变量
+ <font style="color:rgb(163, 163, 163) !important;">在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">vite</font><font style="color:rgb(163, 163, 163) !important;">中获取环境变量通过：</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">import.meta.env</font><font style="color:rgb(163, 163, 163) !important;">来获取的，并不是</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">process.env</font><font style="color:rgb(163, 163, 163) !important;">，如果要在代码中，每次通过</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">import.meta.env</font><font style="color:rgb(163, 163, 163) !important;">来获取，写的实在繁琐，不如封装一个hooks</font>
+ <font style="color:rgb(163, 163, 163) !important;">在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">src</font><font style="color:rgb(163, 163, 163) !important;">文件夹下，新建</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">utils</font><font style="color:rgb(163, 163, 163) !important;">文件夹，</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">utils</font><font style="color:rgb(163, 163, 163) !important;">文件夹中新建</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">env.ts</font><font style="color:rgb(163, 163, 163) !important;">,在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">src/utils/env.ts</font><font style="color:rgb(163, 163, 163) !important;">中编写如下代码</font>

```typescript
export const getEnv = () => {
  return import.meta.env;
};
```

```typescript
import { getEnv } from './env';

export { getEnv };
```

### 自定义钩子
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

### 页面使用
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

<font style="color:rgb(163, 163, 163) !important;"></font>

[环境变量和模式 | Vite 官方中文文档](https://cn.vitejs.dev/guide/env-and-mode.html#env-variables)

## <font style="color:rgb(163, 163, 163) !important;">server 配置</font>
```typescript
// todo server 配置
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

+ 新建config/server/index.ts文件，新增如下代码

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

+ 找到vite.config.ts文件，修改server属性如下代码

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

## proxy <font style="color:rgb(163, 163, 163) !important;">配置</font>
+ 找到config/server/index.ts文件，新增proxy属性，修改如下代码

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

+ 找到vite.config.ts文件，修改server属性如下代码

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

+ **<font style="color:#E8323C;">测试</font>**

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

## build <font style="color:rgb(163, 163, 163) !important;">配置</font>
### 基本配置
+ 找到config/index.ts文件，新增如下代码

```typescript
// todo server 配置
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

+ 在config文件夹下，新建build/index.ts文件，且编写如下代码

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

+ 找到vite.config.ts文件，新增如下代码

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

### 打包的分析可视化图
+ 安装依赖

```shell
npm install rollup-plugin-visualizer -D
```

+ <font style="color:rgb(163, 163, 163) !important;">在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">config/plugins</font><font style="color:rgb(163, 163, 163) !important;">文件夹中，新建</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">visualizer.ts</font><font style="color:rgb(163, 163, 163) !important;">文件</font>

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

+ 找到<font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">config/plugins/index.ts</font>文件，新增如下代码

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

### 压缩 Html
+ 安装依赖

```shell
npm install vite-plugin-html -D
```

+ <font style="color:rgb(163, 163, 163) !important;">在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">config/plugins</font><font style="color:rgb(163, 163, 163) !important;">文件夹中，新建</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">html.ts</font><font style="color:rgb(163, 163, 163) !important;">文件</font>

```typescript
import { createHtmlPlugin } from 'vite-plugin-html';

export default function configHtml() {
  return createHtmlPlugin({
    minify: true,
  });
}
```

+ 找到<font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">config/plugins/index.ts</font>文件，新增如下代码

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

### 压缩资源
+ 安装依赖

```shell
npm install vite-plugin-compression -D
```

+ <font style="color:rgb(163, 163, 163) !important;">在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">config/plugins</font><font style="color:rgb(163, 163, 163) !important;">文件夹中，新建</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">compression.ts</font><font style="color:rgb(163, 163, 163) !important;">文件</font>

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

+ 找到<font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">config/plugins/index.ts</font>文件，新增如下代码

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

## <font style="color:rgb(51, 51, 51);">兼容传统浏览器</font>
### 安装依赖
```shell
npm i -D @vitejs/plugin-legacy
```

### 插件配置
+ <font style="color:rgb(163, 163, 163) !important;">在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">config/plugins</font><font style="color:rgb(163, 163, 163) !important;">文件夹中，新建</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">legacy.ts</font><font style="color:rgb(163, 163, 163) !important;">文件</font>

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

+ 找到<font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">config/plugins/index.ts</font>文件，新增如下代码

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

# CSS 预处理器
+ vite默认是支持module的，只需将文件名称加一个module即可，如：xx.module.css,这样就变成了module了，更create-react-app一样的写法。
+ scss/less的module模式同css一样，如：xx.module.scss,xx.module.less

## 安装依赖
```shell
pnpm install -D sass
```

## 全局变量
+ <font style="color:rgb(163, 163, 163) !important;">在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">src</font><font style="color:rgb(163, 163, 163) !important;">文件夹下新增</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">styles</font><font style="color:rgb(163, 163, 163) !important;">文件夹，在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">styles</font><font style="color:rgb(163, 163, 163) !important;">文件夹中新增</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">variables.scss、mixins.scss、transition.scss、common.scss、index.scss</font> <font style="color:rgb(163, 163, 163) !important;">文件，编写如下代码：</font>

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
@import'./variables.scss';
@import'./mixins.scss';
@import'./common.scss';
@import'./transition.scss';
```

## 配置
+ <font style="color:rgb(163, 163, 163) !important;">在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">config</font><font style="color:rgb(163, 163, 163) !important;">文件夹下，新增</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">style</font><font style="color:rgb(163, 163, 163) !important;">文件夹，且在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">style</font><font style="color:rgb(163, 163, 163) !important;">文件夹下新增</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">index.ts</font><font style="color:rgb(163, 163, 163) !important;">，</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">config/style/index.ts</font><font style="color:rgb(163, 163, 163) !important;">中编写如下代码：</font>

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

> **<font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">注意点:</font>**
>
> <font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">additionalData</font><font style="color:rgb(102, 102, 102);">中如果引用</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">@import</font><font style="color:rgb(102, 102, 102);">格式的，后面一定要加</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">;</font><font style="color:rgb(102, 102, 102);">否则会报错</font>
>

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

## 使用
+ <font style="color:rgb(163, 163, 163) !important;">将</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">src/app.css</font><font style="color:rgb(163, 163, 163) !important;">中的</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">app.css</font><font style="color:rgb(163, 163, 163) !important;">换成</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">app.module.scss</font><font style="color:rgb(163, 163, 163) !important;">，更改</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);"></font><font style="color:rgb(163, 163, 163) !important;">文件中的代码：</font>

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

+ <font style="color:rgb(163, 163, 163) !important;">将</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">src/App.ts</font><font style="color:rgb(163, 163, 163) !important;">中的代码修改如下：</font>

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

# <font style="color:rgb(163, 163, 163) !important;"></font><font style="color:rgb(51, 51, 51);">路由</font>
## 安装依赖
```shell
pnpm i -S react-router-dom
```

## 约定式路由
> [Vite 约定式路由的最佳实践](https://mp.weixin.qq.com/s/zgl59dbLiR8CNg1ON6Yqbw)
>

### 生成路由
+ 我们暂定 _ 开头的文件作为路由生成的规则
    - pages/_index.tsx → /
    - pages/home/_index.tsx → /home
    - pages/home/_hello-world.tsx → /home/hello-world
    - pages/home/_[name].tsx → /home/:name
    - pages/about/_index.tsx → /about
+ 用 _.tsx 作为 layout 

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
 */
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

### 封装组件
```typescript
import { useRoutes } from 'react-router-dom';
import { generateRoutes } from '../routes';

function PageRoutes() {
  const routeConfig = generateRoutes();
  return useRoutes(routeConfig);
}

export default PageRoutes;
```

### 页面编写
```tsx
import React from 'react';
import { Link, Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div>
      <h3>layout</h3>
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        <Link to="/">首页</Link>
        <Link to="/home">home</Link>
        <Link to="/home/child">home child</Link>
        <Link to="/home/child/hello-world">home hello-world</Link>
        <Link to="/home/child/1234">home name</Link>
        <Link to="/about">about</Link>
      </div>
      <Outlet />
    </div>
  );
}

export default Layout;
```

```tsx
import React from 'react';

function Index() {
  return <div>Index</div>;
}

export default Index;
```

```tsx
import React from 'react';

function Index() {
  return <div>Home Index</div>;
}

export default Index;
```

```tsx
import React from 'react';

function Index() {
  return <div>Child Index</div>;
}

export default Index;
```

```tsx
import React from 'react';

function Child() {
  return <div>hello-world</div>;
}

export default Child;
```

```tsx
import React from 'react';
import { useParams } from 'react-router-dom';

function Name() {
  const { name } = useParams();
  return <div>{name}</div>;
}

export default Name;
```

```tsx
import React from 'react';

function About() {
  return <div>About</div>;
}

export default About;
```

### 路由使用
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

## 配置式路由
### 生成路由
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

### 路由编写
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

### 封装组件
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

### 路由使用
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

# <font style="color:rgb(163, 163, 163) !important;"></font><font style="color:rgb(51, 51, 51);">状态管理</font>
## 安装依赖
```shell
pnpm i -S mobx mobx-react
```

## <font style="color:rgb(77, 77, 77);">创建</font><font style="color:rgb(33, 37, 41);">store</font>
+ 需要注意的是，在 store 初始化的时候，如果需要数据能够响应式绑定，需要在初始化的时候，给默认值，不能设置为 undefined 或者 null，这样子的话，数据是无法实现响应式的

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

## <font style="color:rgb(33, 37, 41);">Store 注入</font>
+ <font style="color:rgb(214, 51, 132);">mobx</font><font style="color:rgb(33, 37, 41);">的数据注入，采用的 </font><font style="color:rgb(214, 51, 132);">react</font><font style="color:rgb(33, 37, 41);"> 的 </font><font style="color:rgb(214, 51, 132);">context</font><font style="color:rgb(33, 37, 41);"> 特性；</font>

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

## <font style="color:rgb(33, 37, 41);">Store 使用</font>
### 默认方式
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

### 自定义钩子
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

# 请求封装
## 安装依赖
```shell
pnpm i -S axios
pnpm i -S nprogress
pnpm i -S @types/nprogress
```

## Aixos 封装
+ <font style="color:rgb(163, 163, 163) !important;">在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">src</font><font style="color:rgb(163, 163, 163) !important;">文件夹中，新建</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">service</font><font style="color:rgb(163, 163, 163) !important;">文件夹，并且新建</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">src/service/request/index.ts、src/service/request/types.ts、src/service/index.ts</font><font style="color:rgb(163, 163, 163) !important;">文件</font>

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

## Axios 使用
+ <font style="color:rgb(163, 163, 163) !important;">在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">src/api</font><font style="color:rgb(163, 163, 163) !important;">文件夹中，新建</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">home</font><font style="color:rgb(163, 163, 163) !important;">文件夹，并且新建</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">src/api/home/index.ts</font><font style="color:rgb(163, 163, 163) !important;">文件</font>

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

+ 修改入口文件 mian.ts 

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

+ 修改环境变量文件 .env

```vue
VITE_APP_TITLE="DEVELOPMENT APP"
VITE_API_HOST=/api
```

+ <font style="color:rgb(163, 163, 163) !important;">在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">src/pages/home/_index.tsx</font><font style="color:rgb(163, 163, 163) !important;">文件</font>

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
    // console.log(import.meta.env);
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

# Mock
## 安装依赖
```shell
pnpm i mockjs -S
pnpm i vite-plugin-mock -D
```

## 插件配置
+ <font style="color:rgb(163, 163, 163) !important;">在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">config/plugins</font><font style="color:rgb(163, 163, 163) !important;">文件夹中，新建</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">mock.ts</font><font style="color:rgb(163, 163, 163) !important;">文件</font>

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

+ 找到<font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">config/plugins/index.ts</font>文件，新增如下代码

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

+ 找到<font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">vite.config.ts</font>文件，新增如下代码

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

## 接口实现
+ <font style="color:rgb(163, 163, 163) !important;">在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">根目录(和src同级)</font><font style="color:rgb(163, 163, 163) !important;">新建</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">mock文</font><font style="color:rgb(163, 163, 163) !important;">件夹，新建</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">mock/home.ts </font><font style="color:rgb(163, 163, 163) !important;">文件、</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">mock/about.ts </font><font style="color:rgb(163, 163, 163) !important;">文件以及</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">mock/index.ts </font><font style="color:rgb(163, 163, 163) !important;">文件</font>

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

## Api 实现
+ <font style="color:rgb(163, 163, 163) !important;">在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">src/apis/home/index.ts</font><font style="color:rgb(163, 163, 163) !important;">文件</font>

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

+ <font style="color:rgb(163, 163, 163) !important;">在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">src/apis/about/index.ts</font><font style="color:rgb(163, 163, 163) !important;">文件</font>

```typescript
import request from '@/service';

export const getAboutInfo = (data?: object) =>
  request({
    url: '/getAboutInfo',
    method: 'POST',
    data,
  });
```

## Api 调用
+ <font style="color:rgb(163, 163, 163) !important;">在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">src/pages/home/_index.tsx</font><font style="color:rgb(163, 163, 163) !important;">文件</font>

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
    // console.log(import.meta.env);
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

+ <font style="color:rgb(163, 163, 163) !important;">在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">src/pages/about/_index.tsx</font><font style="color:rgb(163, 163, 163) !important;">文件</font>

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

# Antd
## 安装依赖
```shell
pnpm install antd -S
pnpm i vite-plugin-style-import -D
pnpm i less -D
```

## 插件配置
+ <font style="color:rgb(163, 163, 163) !important;">在</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">config/plugins</font><font style="color:rgb(163, 163, 163) !important;">文件夹中，新建</font><font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">styleImport.ts</font><font style="color:rgb(163, 163, 163) !important;">文件</font>

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

+ 找到<font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">config/plugins/index.ts</font>文件，新增如下代码

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

## Antd 使用
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

## 参考
[GitHub - vbenjs/vite-plugin-style-import: A plug-in that imports component library styles on demand.it is fast](https://github.com/vbenjs/vite-plugin-style-import)

# 国际化配置
## 安装依赖
```shell
# npm
pnpm install react-i18next i18next --save
# 如果需要检测当前浏览器的语言或者从服务器获取配置资源可以安装下面依赖
pnpm install i18next-http-backend i18next-browser-languagedetector --save
```

## <font style="color:rgb(64, 64, 64);">初始化配置</font>
+ 在src文件夹中，新建locales文件夹，添加i18n.ts和resources.ts文件，对i18n进行初始化操作及插件配置

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import resources from './resources';
// don't want to use this?
// have a look at the Quick start guide
// for passing in lng and translations on init

i18n
  // load translation using http -> see /public/locales (i.e. https://github.com/i18next/react-i18next/tree/master/example/react/public/locales)
  // learn more: https://github.com/i18next/i18next-http-backend
  .use(Backend)
  // detect user language
  // learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
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

## 多语言配置
+ 在src/locales文件夹中，新建json文件夹，添加多语言配置文件

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

## 入口文件配置
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

## 切换语言
+ 通过RenderProps的方式国际化组件

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

+ 在hook中使用react-i18next国际化

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
    // console.log(import.meta.env);
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

+ 使用高阶组件（Hoc）的方式处理国际化

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

# <font style="color:rgb(51, 51, 51);"></font><font style="color:rgb(163, 163, 163) !important;">jest</font>
## 单元测试
### 安装依赖
```shell
pnpm install @testing-library/jest-dom @testing-library/react @types/jest jest ts-jest identity-obj-proxy -D
```

### jest 配置
+ 新增jest.config.js文件，同src同级，且编写如下代码

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

### ESLint 配置
+ .eslintrc.js 中，新增如下代码

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

### 脚本配置
```json
"test": "jest --colors --passWithNoTests",
"test:watch": "jest --watchAll",
"coverage": "jest --coverage",
```

### jest 使用
+ 在src 同级新建tests目录，在tests目录中继续添加unit目录，新建<font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">App.test.tsx</font>文件，并编写如下代码

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

### 类型声明
+ 在tests目录，在tests目录中，新建 vite-env.d.ts 文件，并编写如下代码

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_APP_TITLE: 'development' | 'test' | 'staging' | 'production';
  VITE_API_HOST: string;
}
```

## <font style="color:rgb(44, 62, 80);">E2E 测试</font>
### 安装依赖
```shell
pnpm install @types/cypress cypress -D
```

### cypress 配置
+ 新增cypress.json文件，同src同级，且编写如下代码

```javascript
{
  "pluginsFile": "tests/e2e/plugins/index.ts",
  "video":false
}
```

+ 在src 同级新建tests目录，在tests目录中继续添加e2e目录，新建plugins/index.ts文件，并编写如下代码

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

+ 在src 同级新建tests目录，在tests目录中继续添加e2e目录，新建support/index.ts文件，并编写如下代码

```typescript
module.exports = {};
```

### 脚本配置
```json
"test": "npm run test:unit && npm run test:e2e",
"test:unit": "jest --colors --passWithNoTests",
"test:watch": "jest --watchAll",
"test:coverage": "jest --coverage",
"test:e2e": "cypress open",
"test:e2e-run": "cypress run ",
```

### cypress 使用
+ 在src 同级新建tests目录，在tests目录中继续添加e2e目录，新建<font style="color:rgb(255, 80, 44);background-color:rgb(255, 245, 245);">specs/index.specs.tsx</font>文件，并编写如下代码

```tsx
describe('home', () => {
  it('button click', () => {
    cy.visit('http://localhost:3001');
    cy.contains('main div', 'Index');
  });
});
```

### 类型声明
+ 在tests目录，在tests目录中，新建 vite-env.d.ts 文件，并编写如下代码

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_APP_TITLE: 'development' | 'test' | 'staging' | 'production';
  VITE_API_HOST: string;
}

declare const cy: any;
```

## 参考
[A Jest transformer with source map support that lets you use Jest to test projects written in TypeScript. | ts-jest](https://kulshekhar.github.io/ts-jest/)



[Command Line | Cypress Documentation](https://docs.cypress.io/guides/guides/command-line)



[JavaScript 程序测试 -- JavaScript 标准参考教程（alpha）](https://javascript.ruanyifeng.com/tool/testing.html#toc3)

## TODO LIST
+ **<font style="color:#E8323C;"> 待解决问题</font>**
    - **<font style="color:#E8323C;">解决 jest 单元测试不支持 import.meta.env</font>**

# <font style="color:rgb(51, 51, 51);">目录结构</font>
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

# 参考
[Vite 官方中文文档](https://cn.vitejs.dev/)



[ESLint - 插件化的 JavaScript 代码检测工具](https://eslint.bootcss.com/)



[Prettier 中文网 · Prettier 是一个“有态度”的代码格式化工具](https://www.prettier.cn/)



[stylelint](https://stylelint.docschina.org/)



[在项目中用ts封装axios，一次封装整个团队受益](https://mp.weixin.qq.com/s/v4tdFfPG2QP_3VrrpPbezQ)



[从零搭建一款vite-react-cil企业级脚手架](https://mp.weixin.qq.com/s/fFscYSw1XMg1SIYydQQQLA)



[https://heavenru.com/post/Vite-with-React-%E6%9C%80%E4%BD%B3%E5%AE%9E%E8%B7%B5](https://heavenru.com/post/Vite-with-React-%E6%9C%80%E4%BD%B3%E5%AE%9E%E8%B7%B5)



[可能是最完善的 React+Vite 解决方案，阿里飞冰团队发布 icejs 2.0 版本 - 掘金](https://juejin.cn/post/7026616296426962958)



