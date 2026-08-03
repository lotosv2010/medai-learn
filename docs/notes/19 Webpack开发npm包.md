# <font style="color:rgb(51, 51, 51);">基础配置</font>
## <font style="color:rgb(51, 51, 51);">library选项</font>
+ <font style="color:rgb(51, 51, 51);">webpack的配置文件中的output对象中的library选项允许我们将模块导出的内容作为库（library）暴露给外部使用</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">library</font>`<font style="color:rgb(51, 51, 51);">属性用于指定库的名称，可以是一个字符串或者一个对象。如果是一个字符串，则将其作为全局变量暴露给浏览器环境。如果是一个对象，则可以在对象中指定library的名称和导出方式等相关选项</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">libraryExport</font>`<font style="color:rgb(51, 51, 51);">属性用于指定要导出的内容，可以是一个字符串、一个字符串数组或者一个对象。如果是一个字符串，则将该字符串指定的导出内容暴露给外部使用。如果是一个字符串数组，则将数组中指定的导出内容暴露给外部使用。如果是一个对象，则可以在对象中指定要导出的内容和导出方式等相关选项</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">libraryTarget</font>`<font style="color:rgb(51, 51, 51);">属性用于指定库的导出方式，可以是以下值之一</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">var</font>`<font style="color:rgb(51, 51, 51);">：将库导出为一个变量，该变量在全局作用域下可用</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">assign</font>`<font style="color:rgb(51, 51, 51);">：将库导出为一个变量，该变量在全局作用域下可用，但可以被其他库或模块覆盖</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">this</font>`<font style="color:rgb(51, 51, 51);">：将库导出为一个变量，该变量在this对象下可用</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">window</font>`<font style="color:rgb(51, 51, 51);">：将库导出为一个变量，该变量在window对象下可用（仅在浏览器环境下有效）</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">global</font>`<font style="color:rgb(51, 51, 51);">：将库导出为一个变量，该变量在global对象下可用（仅在Node.js环境下有效）</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">commonjs</font>`<font style="color:rgb(51, 51, 51);">：将库导出为一个CommonJS模块，该模块在Node.js环境下可用</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">commonjs2</font>`<font style="color:rgb(51, 51, 51);">：将库导出为一个CommonJS2模块，该模块在Node.js环境下可用</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">amd</font>`<font style="color:rgb(51, 51, 51);">：将库导出为一个AMD模块，该模块在浏览器环境下可用</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">umd</font>`<font style="color:rgb(51, 51, 51);">：将库导出为一个UMD模块，该模块既可在浏览器环境下，也可在Node.js环境下使用</font>

## <font style="color:rgb(51, 51, 51);">externals</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">externals</font>`<font style="color:rgb(51, 51, 51);">选项用于指定哪些模块应该被视为外部模块，不应该被打包进输出的bundle中</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">externals</font>`<font style="color:rgb(51, 51, 51);">选项可以是一个对象、一个字符串、一个正则表达式或者一个函数</font>
    - <font style="color:rgb(51, 51, 51);">如果是一个字符串，则表示要排除的模块名称</font>
    - <font style="color:rgb(51, 51, 51);">如果是一个正则表达式，则表示要排除的模块名称与该正则表达式匹配的所有模块。</font>
    - <font style="color:rgb(51, 51, 51);">如果是一个函数，则在函数中可以自定义判断哪些模块应该被排除在打包之外，需要返回一个布尔值来表示是否排除该模块</font>
+ <font style="color:rgb(51, 51, 51);">如果是一个对象，该对象的键表示要排除的模块名称，值表示在哪种环境下使用该模块。可以指定</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">commonjs</font>`<font style="color:rgb(51, 51, 51);">、</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">commonjs2</font>`<font style="color:rgb(51, 51, 51);">、</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">amd</font>`<font style="color:rgb(51, 51, 51);">或者</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">root</font>`<font style="color:rgb(51, 51, 51);">等选项来指定在不同的环境下使用该模块时的名称</font>

## <font style="color:rgb(51, 51, 51);">webpack-node-externals</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">webpack-node-externals</font>`<font style="color:rgb(51, 51, 51);">是一个npm包，它可以帮助我们排除Node.js应用程序中不需要打包的第三方模块。与webpack的externals选项类似，webpack-node-externals也可以将指定的模块排除在webpack打包之外，从而减小输出的bundle体积，提高应用程序的加载速度</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">nodeExternals</font>`<font style="color:rgb(51, 51, 51);">函数将返回一个排除所有</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">node_modules</font>`<font style="color:rgb(51, 51, 51);">中的模块的externals对象。这样，所有的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">node_modules</font>`<font style="color:rgb(51, 51, 51);">中的模块都将被排除在webpack打包之外</font>

## <font style="color:rgb(51, 51, 51);">mini-css-extract-plugin</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">mini-css-extract-plugin</font>`<font style="color:rgb(51, 51, 51);">是一个webpack插件，用于将CSS样式从JavaScript代码中提取出来，并将其保存为单独的CSS文件</font>

## <font style="color:rgb(51, 51, 51);">Sourcemap</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Sourcemap</font>`<font style="color:rgb(51, 51, 51);">是一种技术，它可以将编译后的代码映射回原始源代码，从而方便我们在调试代码时定位问题。在开发过程中，我们经常会使用压缩后的JavaScript和CSS文件，这样可以减小文件体积，提高页面的加载速度。但是，当出现问题时，我们通常很难直接定位问题所在，因为压缩后的代码已经不再具有可读性。这时，Sourcemap就可以帮助我们解决这个问题</font>

## <font style="color:rgb(51, 51, 51);">.npmignore</font>
+ <font style="color:rgb(51, 51, 51);">.npmignore是一个用于指定npm包发布时忽略哪些文件或目录的文件，它类似于.gitignore文件</font>
+ <font style="color:rgb(51, 51, 51);">在发布npm包时，如果没有指定.npmignore文件，npm会默认将当前目录下的所有文件都发布到npm仓库中，这样会包含很多不必要的文件或目录，增加npm包的体积和下载时间</font>

## <font style="color:rgb(51, 51, 51);">prepublishOnly</font>
+ <font style="color:rgb(51, 51, 51);">prepublishOnly是一个npm script，在执行npm publish命令发布npm包之前会自动执行该脚本</font>
+ <font style="color:rgb(51, 51, 51);">通常情况下，prepublishOnly脚本用于在npm包发布之前进行一些检查或准备工作，例如检查代码风格、运行单元测试、打包代码等。</font>

# <font style="color:rgb(51, 51, 51);">开发NPM</font>
## <font style="color:rgb(51, 51, 51);">安装</font>
```plain
pnpm add webpack webpack-cli webpack-node-externals mini-css-extract-plugin css-loader webpack-merge -D
pnpm add jquery lodash -D
```

## 脚本
```json
{
  "name": "g-npm-template",
  "version": "1.0.0",
  "description": "开发npm包的模板",
  "main": "lib/main.js",
  "scripts": {
    "build": "webpack --watch"
  },
  "keywords": [
    "npm",
    "template"
  ],
  "author": "gwb",
  "license": "ISC",
  "packageManager": "pnpm@10.5.2",
  "devDependencies": {
    "css-loader": "^7.1.2",
    "mini-css-extract-plugin": "^2.9.2",
    "webpack": "^5.99.7",
    "webpack-cli": "^6.0.1",
    "webpack-merge": "^6.0.1",
    "webpack-node-externals": "^3.0.0"
  },
  "peerDependencies": {
    "jquery": "^3.7.1",
    "lodash": "^4.17.21"
  }
}
```

## <font style="color:rgb(51, 51, 51);">配置</font>
```javascript
const path = require("path");
const nodeExternals = require('webpack-node-externals');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
module.exports = {
  mode: "development",
  devtool: 'source-map',
  entry: "./src/index.js",
  externals: [
    nodeExternals()
  ],  
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
    ],
  },
  output: {
    filename: "[name].js",
    path: path.join(__dirname, "./dist"),
    clean: true,
    library: "math",
    libraryExport: 'add',
    libraryTarget: 'umd'
  },
  plugins: [new MiniCssExtractPlugin()],
};
```

## <font style="color:rgb(51, 51, 51);">源码</font>
### <font style="color:rgb(51, 51, 51);">index.js</font>
```javascript
import $ from 'jquery';
import _ from 'lodash';
import './index.css';
export { 
  _,
  $
}
export const add = (a, b) => a + b
export const minus = (a, b) => a -b
```

### <font style="color:rgb(51, 51, 51);">index.css</font>
```css
body{
  background-color: green;
}
```

# <font style="color:rgb(51, 51, 51);">输出多种产物</font>
## <font style="color:rgb(51, 51, 51);">配置</font>
```diff
const path = require("path");
const nodeExternals = require('webpack-node-externals');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { merge } = require("webpack-merge");

const baseConfig = {
  mode: "development",
  devtool: 'source-map',
  entry: "./src/index.js",
  externals: [
    nodeExternals()
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
    ],
  },
  output: {
    filename: "[name].js",
    path: path.join(__dirname, "./lib"),
    clean: true,
    library: {
      // name: "g-npm-template", // 指定库的名称
      type: 'umd', // 指定导出的模块
      // export: ['g-npm-template', 'add']
    },
  },
  plugins: [new MiniCssExtractPlugin()],
};

+module.exports = [
+  merge(baseConfig, {
+    output: {
+      filename: "[name].js",
+      libraryTarget: 'umd'
+    },
+  }),
+  merge(baseConfig, {
+    output: {
+      filename: "[name]-commonjs.js",
+      libraryTarget: 'commonjs'
+    },
+  }),
+  merge(baseConfig, {
+    output: {
+      filename: "[name]-amd.js",
+      libraryTarget: 'amd'
+    },
+  }),
+  merge(baseConfig, {
+    output: {
+      filename: "[name]-commonjs2.js",
+      libraryTarget: 'commonjs2'
+    },
+  }),
+  merge(baseConfig, {
+    output: {
+      filename: "[name]-window.js",
+      libraryTarget: 'window'
+    },
+  }),
+];
```

# <font style="color:rgb(51, 51, 51);">配置函数</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">env</font>`<font style="color:rgb(51, 51, 51);">参数可以用于在命令行中设置环境变量</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">argv</font>`<font style="color:rgb(51, 51, 51);">参数可以用于获取命令行参数</font>

## <font style="color:rgb(51, 51, 51);">脚本</font>
```plain
webpack --env mode=production --watch
env { WEBPACK_WATCH: true, mode: 'production' }
argv { env: { WEBPACK_WATCH: true, mode: 'production' }, watch: true }
```

## 配置
```diff
const path = require("path");
const nodeExternals = require('webpack-node-externals');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
module.exports = function (env, argv) {
+ const isProduction = env.mode === 'production';
+ const isWatch = argv.watch;
  return {
+   mode:  isProduction ? 'production' : 'development',
+   devtool: isProduction ? 'source-map' : 'eval-source-map',
    entry: "./src/index.js",
+   watch: isWatch,
    externals: [
      nodeExternals()
    ],
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, "css-loader"],
        },
      ],
    },
    output: {
      filename: "[name].js",
      path: path.join(__dirname, "./dist"),
      library: "math",
      libraryExport: 'add',
      libraryTarget: 'umd'
    },
    plugins: [new MiniCssExtractPlugin()],
  }
}
```

# <font style="color:rgb(51, 51, 51);">区分环境</font>
## <font style="color:rgb(51, 51, 51);">mode</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">mode</font>`<font style="color:rgb(51, 51, 51);">用于指定webpack的打包模式</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">mode</font>`<font style="color:rgb(51, 51, 51);">可以设置为</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">none</font>`<font style="color:rgb(51, 51, 51);">、</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">development</font>`<font style="color:rgb(51, 51, 51);">或</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">production</font>`<font style="color:rgb(51, 51, 51);">，分别表示不使用任何优化选项、开发模式和生产模式</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">none</font>`<font style="color:rgb(51, 51, 51);">：不使用任何优化选项，通常用于测试环境</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">development</font>`<font style="color:rgb(51, 51, 51);">：在打包过程中启用调试工具，例如</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">sourcemap</font>`<font style="color:rgb(51, 51, 51);">等，同时优化打包速度和开发体验</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">production</font>`<font style="color:rgb(51, 51, 51);">：在打包过程中进行各种优化，包括代码压缩、去除无用代码等，以及启用各种性能优化工具，以提升网站的加载速度和性能</font>

## <font style="color:rgb(51, 51, 51);">区分环境</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">--mode</font>`<font style="color:rgb(51, 51, 51);">用来设置模块内的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">process.env.NODE_ENV</font>`
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">cross-env</font>`<font style="color:rgb(51, 51, 51);">用来设置node环境的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">process.env.NODE_ENV</font>`
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">DefinePlugin</font>`<font style="color:rgb(51, 51, 51);">用来设置模块内的全局变量</font>

### <font style="color:rgb(51, 51, 51);"> 命令行配置</font>
+ <font style="color:rgb(51, 51, 51);">webpack的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">mode</font>`<font style="color:rgb(51, 51, 51);">默认为</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">production</font>`
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">webpack-dev-server</font>`<font style="color:rgb(51, 51, 51);">的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">mode</font>`<font style="color:rgb(51, 51, 51);">默认为</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">development</font>`
+ <font style="color:rgb(51, 51, 51);">可以在模块内通过</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">process.env.NODE_ENV</font>`<font style="color:rgb(51, 51, 51);">获取当前的环境变量,无法在webpack配置文件中获取此变量</font>

### <font style="color:rgb(51, 51, 51);">mode配置</font>
```diff
module.exports = function (env, argv) {
+ const isProduction = env.mode === 'production';
  const isWatch = argv.watch;
  return {
    mode:  isProduction ? 'production' : 'development'
  }
}
```

### <font style="color:rgb(51, 51, 51);">DefinePlugin</font>
+ <font style="color:rgb(51, 51, 51);">可以在任意模块内通过</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">process.env.NODE_ENV</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">获取当前的环境变量</font>
+ <font style="color:rgb(51, 51, 51);">但无法在node环境(webpack 配置文件中)下获取当前的环境变量</font>

```javascript
new webpack.DefinePlugin({
  'process.env.NODE_ENV': JSON.stringify('production')
})
```

```plain
console.log(NODE_ENV);//production
```

```plain
console.log('process.env.NODE_ENV',process.env.NODE_ENV);// undefined
```

### <font style="color:rgb(51, 51, 51);">cross-env</font>
+ <font style="color:rgb(51, 51, 51);">只能设置node环境下的变量NODE_ENV</font>

```plain
"scripts": {
  "build": "cross-env NODE_ENV=development webpack"
}
```

```plain
console.log('process.env.NODE_ENV',process.env.NODE_ENV);// development
```

