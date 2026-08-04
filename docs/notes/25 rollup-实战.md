# 概述
+ [Rollup](https://rollupjs.org/guide/en/)<font style="color:rgb(51, 51, 51);">是下一代ES模块捆绑器</font>

## 背景
+ <font style="color:rgb(51, 51, 51);">webpack打包非常繁琐，打包体积比较大</font>
+ <font style="color:rgb(51, 51, 51);">rollup主要是用来打包JS库的</font>
+ <font style="color:rgb(51, 51, 51);">vue/react/angular都在用rollup作为打包工具</font>

# <font style="color:rgb(51, 51, 51);">初始化</font>
## 安装依赖
```plain
pnpm add rollup cross-env -D
```

## <font style="color:rgb(51, 51, 51);">rollup.config.js</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Asynchronous Module Definition</font>`<font style="color:rgb(51, 51, 51);">异步模块定义</font>
+ <font style="color:rgb(51, 51, 51);">ES6 module是es6提出了新的模块化方案</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">IIFE(Immediately Invoked Function Expression)</font>`<font style="color:rgb(51, 51, 51);">即立即执行函数表达式，所谓立即执行，就是声明一个函数，声明完了立即执行</font>
+ <font style="color:rgb(51, 51, 51);">UMD全称为</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Universal Module Definition</font>`<font style="color:rgb(51, 51, 51);">,也就是通用模块定义</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">cjs</font>`<font style="color:rgb(51, 51, 51);">是nodejs采用的模块化标准，commonjs使用方法</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">require</font>`<font style="color:rgb(51, 51, 51);">来引入模块,这里</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">require()</font>`<font style="color:rgb(51, 51, 51);">接收的参数是模块名或者是模块文件的路径</font>

```javascript
export default {
  input: 'src/main.js',
  output: {
    file: 'dist/bundle.js', // 输出文件的路径和名称
    format: 'umd', // 六种输出格式："amd", "cjs", "system", "es", "iife" or "umd"
    sourcemap: true, // 是否生成sourcemap
    name:'bundleName'// 当format为iife和umd时必须提供，将作为全局变量挂在window下
  },
  plugins: []
};
```

## <font style="color:rgb(51, 51, 51);">package.json</font>
```json
{
  "name": "rollup",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "dev": "cross-env NODE_ENV=development rollup -c -w",
    "build": "cross-env NODE_ENV=production rollup -c"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.5.2",
  "devDependencies": {
    "cross-env": "^7.0.3",
    "rollup": "^4.41.1"
  }
}
```

## <font style="color:rgb(51, 51, 51);">src</font>
```javascript
import foo from './foo.js';

console.log('foo', foo);

export default function () {
  console.log(foo);
}
```

```javascript
export default 'hello world!';
```

## <font style="color:rgb(51, 51, 51);">dist</font>
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <script src="bundle.js"></script>
</head>
<body>
  <script>
    bundleName();
  </script>
</body>
</html>
```

# <font style="color:rgb(51, 51, 51);">支持babel</font>
+ <font style="color:rgb(51, 51, 51);">为了使用新的语法，可以使用babel来进行编译输出</font>
+ [Rollup&Babel](https://cn.rollupjs.org/tools/#babel)

## <font style="color:rgb(51, 51, 51);">安装依赖</font>
+ <font style="color:rgb(51, 51, 51);">@babel/core是babel的核心包</font>
+ <font style="color:rgb(51, 51, 51);">@babel/preset-env是预设</font>
+ <font style="color:rgb(51, 51, 51);">@rollup/plugin-babel是babel插件</font>

```plain
pnpm add @rollup/plugin-babel @babel/core @babel/preset-env --save-dev
```

## package.json
```diff
{
  "name": "rollup",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "dev": "cross-env NODE_ENV=development rollup -c -w",
    "build": "cross-env NODE_ENV=production rollup -c"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.5.2",
  "devDependencies": {
+    "@babel/core": "^7.27.4",
+    "@babel/preset-env": "^7.27.2",
+    "@rollup/plugin-babel": "^6.0.4",
    "cross-env": "^7.0.3",
    "rollup": "^4.41.1"
  }
}
```

## <font style="color:rgb(51, 51, 51);">.babelrc</font>
```json
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "modules": false // 不进行模块化转换
      }
    ]
  ],
  "exclude": ["node_modules/**"],
  "include": ["src/**"],
  "plugins": []
}
```

## .browserslistrc
```javascript
# Browsers that we support
# https://github.com/browserslist/browserslist?tab=readme-ov-file#popular-configs

[production]
> 0.2%
last 2 versions
not dead
not op_mini all
not ie > 0
not ie_mob > 0

[development]
# esmodules and supports es6-module
last 1 chrome version
last 1 firefox version
last 1 safari version
```

## <font style="color:rgb(51, 51, 51);">rollup.config.js</font>
```diff
+ import babel from '@rollup/plugin-babel';

export default {
	input: 'src/main.js',
	output: {
		file: 'dist/bundle.js', // 输出文件的路径和名称
		format: 'umd', // 六种输出格式："amd", "cjs", "system", "es", "iife" or "umd"
		sourcemap: true, // 是否生成sourcemap
		name:'bundleName'// 当format为iife和umd时必须提供，将作为全局变量挂在window下
	},
+	plugins: [babel({ babelHelpers: 'bundled' })]
};
```

## <font style="color:rgb(51, 51, 51);">src</font>
```diff
import foo from './foo.js';

console.log('foo', foo);

+ const sum = (a,b)=>{
+   return a+b;
+ }
+ const result = sum(1,2);
+ console.log(result);

export default function () {
	console.log(foo);
}
```

# <font style="color:rgb(51, 51, 51);">tree-shaking</font>
+ <font style="color:rgb(51, 51, 51);">Tree-shaking的本质是消除无用的js代码</font>
+ <font style="color:rgb(51, 51, 51);">rollup只处理函数和顶层的import/export变量</font>

## <font style="color:rgb(51, 51, 51);">src</font>
### <font style="color:rgb(51, 51, 51);">main.js</font>
```diff
+ import { name,age, default as foo } from './foo.js';

console.log('foo', foo);
+ console.log('name', name);

const sum = (a,b)=>{
  return a+b;
}
const result = sum(1,2);
console.log(result);

export default function () {
	console.log(foo);
}
```

### <font style="color:rgb(51, 51, 51);">foo.js</font>
```diff
+ export var name = 'test';
+ export var age = 12;
export default 'hello world!';
```

# <font style="color:rgb(51, 51, 51);">使用第三方模块</font>
+ <font style="color:rgb(51, 51, 51);">rollup.js编译源码中的模块引用默认只支持 ES6+的模块方式</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">import/export</font>`

## <font style="color:rgb(51, 51, 51);">安装依赖</font>
```plain
pnpm add @rollup/plugin-node-resolve @rollup/plugin-commonjs lodash -D
```

## package.json
```diff
{
  "name": "rollup",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "dev": "cross-env NODE_ENV=development rollup -c -w",
    "build": "cross-env NODE_ENV=production rollup -c"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.5.2",
  "devDependencies": {
    "@babel/core": "^7.27.4",
    "@babel/preset-env": "^7.27.2",
    "@rollup/plugin-babel": "^6.0.4",
+    "@rollup/plugin-commonjs": "^28.0.3",
+    "@rollup/plugin-node-resolve": "^16.0.1",
    "cross-env": "^7.0.3",
+    "lodash": "^4.17.21",
    "rollup": "^4.41.1"
  }
}
```

## <font style="color:rgb(51, 51, 51);">rollup.config.js</font>
```diff
import babel from '@rollup/plugin-babel';
+ import commonjs from '@rollup/plugin-commonjs';
+ import resolve from '@rollup/plugin-node-resolve';

export default {
	input: 'src/main.js',
	output: {
		file: 'dist/bundle.js', // 输出文件的路径和名称
		format: 'umd', // 六种输出格式："amd", "cjs", "system", "es", "iife" or "umd"
		sourcemap: true, // 是否生成sourcemap
		name:'bundleName'// 当format为iife和umd时必须提供，将作为全局变量挂在window下
	},
	plugins: [
+		babel({ babelHelpers: 'bundled', exclude: 'node_modules/**' }),
+	  commonjs(),
+ 	resolve()
	]
};
```

## <font style="color:rgb(51, 51, 51);">src</font>
### main.js
```diff
import { name,age, default as foo } from './foo.js';
+ import _ from 'lodash';

+ console.log('lodash', _);

console.log('foo', foo);
console.log('name', name);

const sum = (a,b)=>{
  return a+b;
}
const result = sum(1,2);
console.log(result);

export default function () {
	console.log(foo);
}
```

# <font style="color:rgb(51, 51, 51);">使用CDN</font>
## <font style="color:rgb(51, 51, 51);">rollup.config.js</font>
```diff
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';

export default {
	input: 'src/main.js',
	output: {
		file: 'dist/bundle.js', // 输出文件的路径和名称
		format: 'umd', // 六种输出格式："amd", "cjs", "system", "es", "iife" or "umd"
		sourcemap: true, // 是否生成sourcemap
		name:'bundleName', // 当format为iife和umd时必须提供，将作为全局变量挂在window下
+		globals: { // 告诉rollup不要将lodash和jquery打包到bundle.js中，而是使用外部的lodash和jquery
+			lodash: '_',
+			jquery: '$'
+		}
	},
+	external: ['lodash', 'jquery'], // 告诉rollup不要将lodash和jquery打包到bundle.js中，而是使用外部的lodash和jquery
	plugins: [
		babel({ babelHelpers: 'bundled', exclude: 'node_modules/**' }),
		commonjs(),
		resolve()
	]
};
```

## <font style="color:rgb(51, 51, 51);">src</font>
### <font style="color:rgb(51, 51, 51);">main.js</font>
```diff
import { name,age, default as foo } from './foo.js';
+ import _ from 'lodash';
+ import $ from 'jquery';

+ console.log(_.concat([1,2,3],4,5));
+ console.log($);

console.log('lodash', _);

console.log('foo', foo);
console.log('name', name);

const sum = (a,b)=>{
  return a+b;
}
const result = sum(1,2);
console.log(result);

export default function () {
	console.log(foo);
}
```

## <font style="color:rgb(51, 51, 51);">dist</font>
### <font style="color:rgb(51, 51, 51);">index.html</font>
```diff
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
+  <script src="https://cdn.jsdelivr.net/npm/lodash/lodash.min.js"></script>
+  <script src="https://cdn.jsdelivr.net/npm/jquery/jquery.min.js"></script>
  <script src="bundle.js"></script>
</head>
<body>
  <script>
    bundleName();
  </script>
</body>
</html>
```

# <font style="color:rgb(51, 51, 51);">使用typescript</font>
## <font style="color:rgb(51, 51, 51);">安装</font>
```shell
pnpm add tslib typescript @rollup/plugin-typescript -D
pnpm add @types/lodash @types/jquery -D
```

## package.json
```diff
{
  "name": "rollup",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "dev": "cross-env NODE_ENV=development rollup -c -w",
    "build": "cross-env NODE_ENV=production rollup -c"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.5.2",
  "devDependencies": {
    "@babel/core": "^7.27.4",
    "@babel/preset-env": "^7.27.2",
    "@rollup/plugin-babel": "^6.0.4",
    "@rollup/plugin-commonjs": "^28.0.3",
    "@rollup/plugin-node-resolve": "^16.0.1",
+    "@rollup/plugin-typescript": "^12.1.2",
+    "@types/jquery": "^3.5.32",
+    "@types/lodash": "^4.17.17",
    "cross-env": "^7.0.3",
    "lodash": "^4.17.21",
    "rollup": "^4.41.1",
+    "tslib": "^2.8.1",
+    "typescript": "^5.8.3"
  }
}

```

## <font style="color:rgb(51, 51, 51);">tsconfig.json</font>
```json
{
  "compilerOptions": {
    "target": "es5",
    "module": "ESNext",
    "strict": true,
    "skipLibCheck": true,                    
    "forceConsistentCasingInFileNames": true,
    "allowJs": true,
    "noEmit": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

## <font style="color:rgb(51, 51, 51);">rollup.config.js</font>
```diff
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
+ import typescript from '@rollup/plugin-typescript';

export default {
	input: 'src/main.ts',
	output: {
		file: 'dist/bundle.js', // 输出文件的路径和名称
		format: 'umd', // 六种输出格式："amd", "cjs", "system", "es", "iife" or "umd"
		sourcemap: true, // 是否生成sourcemap
		name:'bundleName', // 当format为iife和umd时必须提供，将作为全局变量挂在window下
		globals: { // 告诉rollup不要将lodash和jquery打包到bundle.js中，而是使用外部的lodash和jquery
			lodash: '_',
			jquery: '$'
		}
	},
	external: ['lodash', 'jquery'], // 告诉rollup不要将lodash和jquery打包到bundle.js中，而是使用外部的lodash和jquery
	plugins: [
		babel({ babelHelpers: 'bundled', exclude: 'node_modules/**' }),
		commonjs(),
		resolve(),
+		typescript()
	]
};
```

## <font style="color:rgb(51, 51, 51);">src</font>
### <font style="color:rgb(51, 51, 51);">main.ts</font>
```tsx
import { name, age, default as foo } from "./foo.js";
import * as _ from "lodash";
import * as $ from "jquery";

console.log(_.concat([1, 2, 3], 4, 5));
console.log($);

console.log("lodash", _);

console.log("foo", foo);
console.log("name", name);

const sum = (a: number, b: number) => {
  return a + b;
};
const result = sum(1, 2);
console.log(result);

export default function () {
  console.log(foo);
}
```

### foo.ts
```typescript
export var name = 'test';
export var age = 12;
export default 'hello world!';
```

# <font style="color:rgb(51, 51, 51);">压缩JS</font>
+ <font style="color:rgb(51, 51, 51);">terser是支持ES6 +的JavaScript压缩器工具包</font>

## <font style="color:rgb(51, 51, 51);">安装</font>
```plain
pnpm add @rollup/plugin-terser -D
```

## package.json
```diff
{
  "name": "rollup",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "dev": "cross-env NODE_ENV=development rollup -c -w",
    "build": "cross-env NODE_ENV=production rollup -c"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.5.2",
  "devDependencies": {
    "@babel/core": "^7.27.4",
    "@babel/preset-env": "^7.27.2",
    "@rollup/plugin-babel": "^6.0.4",
    "@rollup/plugin-commonjs": "^28.0.3",
    "@rollup/plugin-node-resolve": "^16.0.1",
+    "@rollup/plugin-terser": "^0.4.4",
    "@rollup/plugin-typescript": "^12.1.2",
    "@types/jquery": "^3.5.32",
    "@types/lodash": "^4.17.17",
    "cross-env": "^7.0.3",
    "lodash": "^4.17.21",
    "rollup": "^4.41.1",
    "tslib": "^2.8.1",
    "typescript": "^5.8.3"
  }
}
```

## <font style="color:rgb(51, 51, 51);">rollup.config.js</font>
```diff
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
+ import terser from '@rollup/plugin-terser';

export default {
	input: 'src/main.ts',
	output: {
		file: 'dist/bundle.js', // 输出文件的路径和名称
		format: 'umd', // 六种输出格式："amd", "cjs", "system", "es", "iife" or "umd"
		sourcemap: true, // 是否生成sourcemap
		name:'bundleName', // 当format为iife和umd时必须提供，将作为全局变量挂在window下
		globals: { // 告诉rollup不要将lodash和jquery打包到bundle.js中，而是使用外部的lodash和jquery
			lodash: '_',
			jquery: '$'
		}
	},
	external: ['lodash', 'jquery'], // 告诉rollup不要将lodash和jquery打包到bundle.js中，而是使用外部的lodash和jquery
	plugins: [
		babel({ babelHelpers: 'bundled', exclude: 'node_modules/**' }),
		commonjs(),
		resolve(),
		typescript(),
+		terser()
	]
};
```

# <font style="color:rgb(51, 51, 51);">编译css</font>
+ <font style="color:rgb(51, 51, 51);">terser是支持ES6 +的JavaScript压缩器工具包</font>

## <font style="color:rgb(51, 51, 51);">安装</font>
```plain
pnpm add postcss rollup-plugin-postcss -D
```

## package.json
```diff
{
  "name": "rollup",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "dev": "cross-env NODE_ENV=development rollup -c -w",
    "build": "cross-env NODE_ENV=production rollup -c"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.5.2",
  "devDependencies": {
    "@babel/core": "^7.27.4",
    "@babel/preset-env": "^7.27.2",
    "@rollup/plugin-babel": "^6.0.4",
    "@rollup/plugin-commonjs": "^28.0.3",
    "@rollup/plugin-node-resolve": "^16.0.1",
    "@rollup/plugin-terser": "^0.4.4",
    "@rollup/plugin-typescript": "^12.1.2",
    "@types/jquery": "^3.5.32",
    "@types/lodash": "^4.17.17",
    "cross-env": "^7.0.3",
    "lodash": "^4.17.21",
    "postcss": "^8.5.4",
    "rollup": "^4.41.1",
+    "rollup-plugin-postcss": "^4.0.2",
    "tslib": "^2.8.1",
    "typescript": "^5.8.3"
  }
}
```

## <font style="color:rgb(51, 51, 51);">rollup.config.js</font>
```diff
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
+ import postcss from 'rollup-plugin-postcss';

export default {
	input: 'src/main.ts',
	output: {
		file: 'dist/bundle.js', // 输出文件的路径和名称
		format: 'umd', // 六种输出格式："amd", "cjs", "system", "es", "iife" or "umd"
		sourcemap: true, // 是否生成sourcemap
		name:'bundleName', // 当format为iife和umd时必须提供，将作为全局变量挂在window下
		globals: { // 告诉rollup不要将lodash和jquery打包到bundle.js中，而是使用外部的lodash和jquery
			lodash: '_',
			jquery: '$'
		}
	},
	external: ['lodash', 'jquery'], // 告诉rollup不要将lodash和jquery打包到bundle.js中，而是使用外部的lodash和jquery
	plugins: [
		babel({ babelHelpers: 'bundled', exclude: 'node_modules/**' }),
		commonjs(),
		resolve(),
		typescript(),
		terser(),
+ 	postcss({ // 处理css文件
+ 		extensions: ['.css', '.scss', '.less', '.styl', '.stylus', '.pcss', '.postcss']
+ 	})
	]
};
```

## <font style="color:rgb(51, 51, 51);">src</font>
### <font style="color:rgb(51, 51, 51);">main.ts</font>
```diff
import { name, age, default as foo } from "./foo.js";
import * as _ from "lodash";
import * as $ from "jquery";
+ import "./main.css";
+ import "./main.less";
+ import "./main.scss";

console.log(_.concat([1, 2, 3], 4, 5));
console.log($);

console.log("lodash", _);

console.log("foo", foo);
console.log("name", name);

const sum = (a: number, b: number) => {
  return a + b;
};
const result = sum(1, 2);
console.log(result);

export default function () {
  console.log(foo);
}
```

### <font style="color:rgb(51, 51, 51);">main.css</font>
```plain
body{
  background-color: green;
}
```

### main.less
```less
body {
  color: azure;
  div {
    color: red;
  }
}
```

### main.scss
```sass
body {
  font-size: 18px;
  div {
    font-size: 20px;
  }
}
```

# <font style="color:rgb(51, 51, 51);">本地服务器</font>
## <font style="color:rgb(51, 51, 51);">安装</font>
```plain
pnpm add rollup-plugin-serve rollup-plugin-livereload -D
```

## package.json
```diff
{
  "name": "rollup",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "type": "module",
  "scripts": {
+    "dev": "cross-env NODE_ENV=development rollup -c rollup.config.dev.js -w",
+    "build": "cross-env NODE_ENV=production rollup -c rollup.config.prod.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.5.2",
  "devDependencies": {
    "@babel/core": "^7.27.4",
    "@babel/preset-env": "^7.27.2",
    "@rollup/plugin-babel": "^6.0.4",
    "@rollup/plugin-commonjs": "^28.0.3",
    "@rollup/plugin-node-resolve": "^16.0.1",
    "@rollup/plugin-terser": "^0.4.4",
    "@rollup/plugin-typescript": "^12.1.2",
    "@types/jquery": "^3.5.32",
    "@types/lodash": "^4.17.17",
    "cross-env": "^7.0.3",
    "lodash": "^4.17.21",
    "postcss": "^8.5.4",
    "rollup": "^4.41.1",
+    "rollup-plugin-livereload": "^2.0.5",
    "rollup-plugin-postcss": "^4.0.2",
+    "rollup-plugin-serve": "^3.0.0",
    "tslib": "^2.8.1",
    "typescript": "^5.8.3"
  }
}

```

## <font style="color:rgb(51, 51, 51);">rollup.config.dev.js</font>
```diff
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';
+ import serve from 'rollup-plugin-serve';
+ import livereload from 'rollup-plugin-livereload';

export default {
	input: 'src/main.ts',
	output: {
		file: 'dist/bundle.js', // 输出文件的路径和名称
		format: 'umd', // 六种输出格式："amd", "cjs", "system", "es", "iife" or "umd"
		sourcemap: true, // 是否生成sourcemap
		name:'bundleName', // 当format为iife和umd时必须提供，将作为全局变量挂在window下
		globals: { // 告诉rollup不要将lodash和jquery打包到bundle.js中，而是使用外部的lodash和jquery
			lodash: '_',
			jquery: '$'
		}
	},
	external: ['lodash', 'jquery'], // 告诉rollup不要将lodash和jquery打包到bundle.js中，而是使用外部的lodash和jquery
	plugins: [
		babel({ babelHelpers: 'bundled', exclude: 'node_modules/**' }),
		commonjs(),
		resolve(),
		typescript(),
		terser(),
		postcss({ // 处理css文件
			extensions: ['.css', '.scss', '.less', '.styl', '.stylus', '.pcss', '.postcss']
		}),
+ 	serve({
+ 		contentBase: 'dist',
+ 		port: 3000,
+ 		open: true,
+ 		openPage: '/index.html'
+ 	}),
+ 	livereload('dist')
	]
};
```

## <font style="color:rgb(51, 51, 51);">rollup.config.prod.js</font>
```diff
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';

export default {
	input: 'src/main.ts',
	output: {
		file: 'dist/bundle.js', // 输出文件的路径和名称
		format: 'umd', // 六种输出格式："amd", "cjs", "system", "es", "iife" or "umd"
		sourcemap: true, // 是否生成sourcemap
		name:'bundleName', // 当format为iife和umd时必须提供，将作为全局变量挂在window下
		globals: { // 告诉rollup不要将lodash和jquery打包到bundle.js中，而是使用外部的lodash和jquery
			lodash: '_',
			jquery: '$'
		}
	},
	external: ['lodash', 'jquery'], // 告诉rollup不要将lodash和jquery打包到bundle.js中，而是使用外部的lodash和jquery
	plugins: [
		babel({ babelHelpers: 'bundled', exclude: 'node_modules/**' }),
		commonjs(),
		resolve(),
		typescript(),
		terser(),
		postcss({ // 处理css文件
			extensions: ['.css', '.scss', '.less', '.styl', '.stylus', '.pcss', '.postcss']
		})
	]
};
```

# 项目
[GitHub - lotosv2010/g-toolkit: 一个基于 Rollup 构建的 JavaScript 工具函数库，支持 CommonJS、ESM 和 UMD 格式。](https://github.com/lotosv2010/g-toolkit)

