## 一、概念
放在浏览器进行就是浏览器渲染,放在服务器进行就是服务器渲染。

`Vue.js` 是构建客户端应用程序的框架。默认情况下，可以在浏览器中输出 `Vue` 组件，进行生成 `DOM` 和操作 `DOM`。然而，也可以将同一个组件渲染为服务器端的 `HTML` 字符串，将它们直接发送到浏览器，最后将这些静态标记"激活"为客户端上完全可交互的应用程序。

服务器渲染的 `Vue.js` 应用程序也可以被认为是"同构"或"通用"，因为应用程序的大部分代码都可以在服务器和客户端上运行。



## 二、SSR特点
+ 客户端渲染不利于 `SEO` 搜索引擎优化
+ 服务端渲染是可以被爬虫抓取到的，客户端异步渲染是很难被爬虫抓取到的
+ `SSR` 直接将 `HTML` 字符串传递给浏览器。大大加快了首屏加载时间
+ `SSR` 占用更多的 `CPU` 和内存资源
+ 一些常用的浏览器 `API` 可能无法正常使用
+ 在 `vue` 中只支持 `beforeCreate` 和 `created` 两个生命周期



## 三、运行和打包过程
### 图解
<!-- 这是一张图片，ocr 内容为：Source NodeServer Universal ApplicationCode Server Server Bundle Bundle entry Renderer Router Store Render apP-js Webpack client Components HTML build Bundle Hydrate Client entry Browser -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1606717536778-5901db69-fe31-4d61-a73f-cfd6f37f44d8.png)

### SSR 的运行过程
+ 只是首屏做 `ssr`  服务端渲染
+ 后续的切换逻辑，执行的都是客户端渲染(前端路由来切换)



### SSR 整个打包过程
+ 通过一份代码，打包出来两份逻辑(前端、服务端)
+ 前端拿到打包出来的 `js` ，后段通过打包的结果渲染出字符串
+ 前端的 `js`  + 后段渲染的字符串 = 扔到浏览器上



## 四、模板渲染
### 安装依赖
+ `vue` ： `vue` 框架
+ `vue-server-renderer` ： `vue` 服务端渲染插件
+ `koa` ： `koa` 插件
+ `@koa/router` ： `koa` 路由插件

```javascript
yarn add vue-server-renderer vue koa koa-router
```

<!-- 这是一张图片，ocr 内容为：T38 nodemonserver.js yue-ssryarngddyueyue-server-rendereroackoa/route yarnaddy1.21.1 infoNolockfilefound, [1/4] Resolvingpackages... [2/4] Fetchingpackages... Linkingdependencies... [3/4] [4/4] Building gfreshpackages Savedlockfile. success onofYarnisoutofdate,Thelatestversion". warningYourcurrentversiono 5" whileyou'reon"1.21.1" info Toupgrade,runthefollowingcommand; -compressed-o--Lhttps://yarnpkq.com/insta. curL successSaved58newdependencies infoDirectdependencies @koa/router@10.0.0 koa@2.13.0 vue-server-renderer@2.6.12 vue@2.6.12 infoAizdependencies @koa/router@10.0.0 accepts@1.3.7 ansi-styLes@2.2.1 any-promise@1.3.0 cache-content-type@1.0.1 -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1606719881237-1fb9294b-b19a-49cf-bf01-e18c1bf15886.png)

### 目录结构
<!-- 这是一张图片，ocr 内容为：serverjjs-vue-ssr Readme.md EXPLORER package..son OPENEDITORS serverjs require("koa) VUE-SSR 2 38.5K(gzipped:13.8K) ConsTRouTERREquIrekoa/rOuTER)38 nodemodules constVueserverRenderrequirevueserver-renderer) gitignore constVuerequirevue6.3 index.html 三创连vue实例 U package.json constUmanewVue(I readme.mo data0 server-js return yarn.lock messagethisisthefirstyuessrapp 11 template:sdivztfmessagep/diV 吾酒 createRendere,创一个谊染函数renderTostring,染出一个字持串 constrenderVueserverRender.createRenderer 1产生一个app实例 NN LetappanewKoa0) 1产生一个路由实例 letrouternewRouter0) routerqet(Naync(ctx) ee ctx.bodyawaitrendeedeig() 11将路由注册到应用上 app.use(router.routes()) /监听3000端口号 app.uisten(3000) OUTLINE TIMELINE UTF-8LFJavascrlpt CompileHero:Off jayascriptlserver/s ?0A0 726bytes ESLINT -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1606720135819-0990b08a-93fd-4ac6-bcaa-6199a3696f1a.png)

### 服务器搭建
代码如下

`server.js` 

```javascript
const Koa = require('koa')
const Router = require('@koa/router')
const VueServerRender = require('vue-server-renderer')
const Vue = require('vue')

// 创建vue实例
const vm = new Vue({
  data() {
    return {
      message: 'this is the first vue ssr app'
    }
  },
  template: `<div>{{ message }}</div>`
})

// createRenderer,创建一个渲染函数 renderToString, 渲染出一个字符串
const render = VueServerRender.createRenderer()

// 产生一个 app 实例
let app = new Koa() 
// 产生一个路由实例
let router = new Router()
router.get('/', async (ctx) => {
  ctx.body = await render.renderToString(vm)
})
// 将路由注册到应用上
app.use(router.routes())
// 监听 3000 端口号
app.listen(3000)
```

### 模板渲染
在当前目录新建一个 `index.html` 文件，然后采用服务端渲染插件，调用 `createRenderer` 创建一个渲染函数， `renderToString` 渲染出一个字符串。代码如下：

`index.html` 

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ssr demo</title>
</head>
<body>
  <!-- 下面代码是固定写法 -->
  <!--vue-ssr-outlet-->
</body>
</html>
```

`server.js` 

```javascript
const Koa = require('koa')
const Router = require('@koa/router')
const { createRenderer } = require('vue-server-renderer')
const Vue = require('vue')
const fs = require('fs')
const path = require('path')

// 创建vue实例
const vm = new Vue({
  data() {
    return {
      message: 'this is the first vue ssr app'
    }
  },
  template: `<div>{{ message }}</div>`
})

// 读取模板
const template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8')

// createRenderer,创建一个渲染函数 renderToString, 渲染出一个字符串
const render = createRenderer({
  template
})

// 产生一个 app 实例
let app = new Koa() 
// 产生一个路由实例
let router = new Router()
router.get('/', async (ctx) => {
  ctx.body = await render.renderToString(vm)
})
// 将路由注册到应用上
app.use(router.routes())
// 监听 3000 端口号
app.listen(3000)
```

## 五、SSR 搭建
### 安装依赖
+ webpack 使用需要的包
    - webpack
    - webpack-cli
    - webpack-server
    - vue-loader
    - vue-template-complier
    - vue-style-loader
    - css-loader
    - @babel/core
    - @babel/preset-env
    - babel-loader
    - html-webpack-plugin

```javascript
yarn add webpack webpack-cli webpack-dev-server 
yarn add vue-loader vue-template-compiler vue-style-loader css-loader 
yarn add @babel/core @babel/preset-env babel-loader
yarn add html-webpack-plugin
```

<!-- 这是一张图片，ocr 内容为：t31 robi@Royan:/Downloads/codezf/vueSs kwebpack-cliwebpack-serveryue-loader xyarnaddwedpackw yue-ssrgit:master)xy vue-template-complieryue-style-loader css-Loader@babel/core@babel/oresete babel-Loaderhtml-webpack-plugin yarnaddy1.21.1 warningpackage.jonicesef warningNolicensefield [1/4] Resolvingpackages... wartngwepckerveeressmpe.e iongerSupportedPleaseupdatetomkdiptehhue changedtousePromisesin1.x connect@2.14.5:connect2.Xseriesisdepreca warningwebpack-server>express ted connect>static-favicon@1.0.fa warningwebpack-serveexpress iconmodule im connect>csurf>scmp@0.0.3:scmpyz 2usesZ express warningwebpack-server comparisonsinceNodey6.6.0 provedcorecrypto soroccurred:"https://registry.yarnpkg.com/vue-tempatec errorAnunexpectederror omplier:Notfound" infoffyouthinkthisisabug,pleaseopenabugreportwththeifatio rovidedin"users/robin/Downloads/code/zf/vue-ssr/yarn-errorg Visithttps://yarnpkg.com/en/docs/cli/addfor info onaboutthisc documentationc comm and. yue-ssrgit:master)xclear git:msterxyandddwepackwepack-cliweckdee vue-ssr aderyuestemplatecompitervuestylelodecdere -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1606723414587-0353b5ec-3e7f-499f-a707-2fba168db4f1.png)

`package.json` 

```json
{
  "name": "vue-ssr",
  "description": "- 只是首屏做 ssr 服务端渲染 - 后续的切换逻辑，执行的都是客户端渲染(前端路由来切换)",
  "version": "1.0.0",
  "main": "server.js",
  "devDependencies": {
    "@babel/core": "^7.12.9",
    "@babel/preset-env": "^7.12.7",
    "@koa/router": "^10.0.0",
    "babel-loader": "^8.2.2",
    "css-loader": "^3.6.0",
    "html-webpack-plugin": "^4.5.0",
    "less-loader": "^7.1.0",
    "sass-loader": "^10.1.0",
    "vue-loader": "^15.9.5",
    "vue-style-loader": "^4.1.2",
    "vue-template-compiler": "^2.6.12",
    "webpack": "^5.9.0",
    "webpack-cli": "^3.3.12",
    "webpack-dev-server": "^3.11.0"
  },
  "keywords": [
    "vue",
    "ssr"
  ],
  "author": "gwb",
  "license": "ISC",
  "scripts": {
    "client:dev": "webpack-dev-server",
    "client:build": "webpack",
    "start": "node server.js"
  },
  "dependencies": {
    "koa": "^2.13.0",
    "vue": "^2.6.12",
    "vue-server-renderer": "^2.6.12"
  }
}
```

### 目录结构
<!-- 这是一张图片，ocr 内容为：Vue-ssr EXPLORER OPENEDITORS VUE-SSR config webpack.bas...U 18 webpack.clie...U webpack.ser...U  public index.html index-ssr.html SrC components Bar.Vue FooVue app?js APPvue entry-client.js entry-server.js router.ls ShowAIIComMAnds store.js gitignore GotoFile package.json readme.md FInDINFILES server-js StartDebugging webpack.contl...U yarn-error.log ToggleTerminal yarn.lock OUTLINE TIMELINE AutoFormatyueOffaCompileHero:Off ?0A0 ESLINT -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1606723440560-34c4107e-6c1c-4bec-b59f-3d499c0ac366.png)

### webpack配置
`webpack.config.js` 

```javascript
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const VueLoaderPlugin = require('vue-loader/lib/plugin')
/**
 * 传入路径，通过文档当前所在位置找到这个文件
 * @param {路径} dir 
 */
const resolve = (dir) => {
  return path.resolve(__dirname, dir)
}

module.exports = {
  // 入口
  entry: resolve('./src/app.js'),
  // 出口
  output: {
    filename: 'bundle.js', // 结果文件名
    path: resolve('dist')  // 产生的路径
  },
  resolve: { // 解析文件时按照一下顺序查找后缀
    extensions: ['.js', '.vue', '.css', 'jsx']
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        use: 'vue-loader'
      },
      {
        test: /\.css$/,
        // loader 执行顺序是：从下到上，从右到左
        use: ['vue-style-loader', 'css-loader']
      },
      {
        test: /\.js$/,
        use: {
          options: { 
            // 告诉js 文件需要es6 转化成es5 的插件
            // 默认使用 babel-loader 调用 babel-core 的 transform 方法，最后调用 preset
            presets: ['@babel/preset-env']
          },
          loader: 'babel-loader'
        },
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      template: resolve('./public/index.html')
    })
  ]
}
```

### VUE程序
`public/index.html` 

```javascript
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ssr demo</title>
</head>
<body>
  <div id="app"></div>
</body>
</html>
```

`scr/app.js` 

```javascript
import Vue from 'vue'
import App from './App.vue'

const vm = new Vue({
  el: '#app',
  render: h => h(App)
})
```

`scr/App.vue`

```javascript
<template>
  <div>
    <Bar />
    <Foo />
  </div>
</template>

<script>
import Bar from './components/Bar'
import Foo from './components/Foo'
export default {
  components: {
    Bar,
    Foo
  }
}
</script>

<style scoped>

</style>
```

`scr/components/Bar.vue`

```javascript
<template>
  <div @click="show">
    bar
  </div>
</template>

<script>
  export default {
    methods: {
      show() {
        console.log('bar')
      }
    }
  }
</script>

<style scoped>

</style>
```

`scr/components/Foo.vue`

```javascript
<template>
  <div class="foo">
    foo
  </div>
</template>

<script>
  export default {
    
  }
</script>

<style scoped>
.foo {
  color: red;
}
</style>
```

### 运行
```javascript
开发：cnpm run client:dev
打包：cnpm run client:build
```

<!-- 这是一张图片，ocr 内容为：T38 cnpmrunclient:dev runclient:dev yue-ssrgit:master)xcnpm yue-ssrel..cti/ webpack-dev-server wdsJ:Projectisrunningahttpocahost:8080 wdsl:webpackoutputisser servedfrom [wdsl:Contentnotfromwebpackisserved sservedfrom/Users/robin/Downloads/code/zf/ vue-ssr node2632)DPEPCKCOMLATIONASSETSDePrecationaingmtio efrozeninfuture,allmodifications aredeprecated. setswillb BREAKINGCHANGE:Nrechanesshoudhcomlinee ngtheCompilation. Dochangestoassetsearlice MakesuretoselectangppropriatestageromComiatioC STAGE_*, wdml:assetbundle.js659Ki[emittdmei) assetindex.html250bytes[emitted runtimemodules1.25KiB6modules modulesbypath./node_modules/563KiB modulesbypath.el/kk Lient/20.9KiB10modules modulesbypath.em/hm/ KiB4modules modulesbypath./nodemodules/querystringe./ -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1606725909261-0d4fdd79-a686-4c80-9680-900258d63383.png)

### 注意
#### 问题一
运行时报如下错误时：

<!-- 这是一张图片，ocr 内容为：T38 cnpmrunclient:dev runclient:dev yue-ssrgit:master)xcnpm yue-ssrel..cti/ webpack-dev-server internal/modules/cjs/loader.js:983 throwerr; Error:Cannotfindmodulewebpack-cli/bin/config-yargs Requirestack: users/robin/Dowloads/od//e-/k @webpack-dev-server/bin/webpack-dev-server.js tFunCtionModule atFunctionModulei/// atModule.require(interna/mdul/ atreguire(internal/modules/cjs/helpers.j77:8 atobject.anoymuurs/robin/owod/ ebpack-devserver3..kk atModule.comile(interna/mdule//od atobject.Moduleextnsin atModule.odintn/mdul/jod atFunction.Module.od(intrna/mu//d) tFunCtion.eecutUserEntryotntint atFunctic 74:12) -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1606725767803-c5575ef7-0cb4-4967-bc9a-e6e67681a087.png)

原因：

```javascript
If you upgrade webpack to 5. *, and webpack cli to 4. *, an error will be reported:
Error: Cannot find module 'webpack-cli/bin/config-yargs'
Temporary solution: Back off webpack cli to version 3. * for example:
"webpack-cli": "^ 3.3.12"
```

解决方案：

卸载当前的 `webpack-cli npm uninstall webpack-cli` 

安装 `webpack-cli 3.*`  版本 `npm install webpack-cli@3 -D` 



#### 问题二
如果不解析 `vue` 文件中的样式。

解决方案：

卸载当前的 `webpack-cli npm uninstall css-loader`

安装 `css-loader 3.*`  版本 `npm install css-loader@3 -D`



#### 问题三
webpack 用第四版本



## 六、编译项目
### 项目目录改变
+ 删除 `webpack.config.js`

<!-- 这是一张图片，ocr 内容为：config webpack.ba... public app.js APpyue entry-Client'sM entry-serverjs ShowAIlCOMmands router.ls GOtOFILE 北P gitignore FINDInFILeS package.Json Readmemd StartDebugging server.js TOggLeTerminaLUnbOund yarn-error.log yarn.lock OUTLINE 口040 GoLre jAutOFormatWue:Off ESLint -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1606728925350-4392be95-968e-4fae-a355-4ea6e23e0ba1.png)

### webpack配置
#### 安装依赖
```javascript
cnpm install webpack-merge -D
```

#### 基本配置
`config/webpack.base.js` 

```javascript
// 基本配置
const path = require('path')
const VueLoaderPlugin = require('vue-loader/lib/plugin')
/**
 * 传入路径，通过文档当前所在位置找到这个文件
 * @param {路径} dir 
 */
const resolve = (dir) => {
  return path.resolve(__dirname, dir)
}

module.exports = {
  // 出口
  output: {
    // 配置多个入口
    filename: '[name].bundle.js', // 结果文件名
    path: resolve('../dist')  // 产生的路径
  },
  resolve: { // 解析文件时按照一下顺序查找后缀
    extensions: ['.js', '.vue', '.css', 'jsx']
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        use: 'vue-loader'
      },
      {
        test: /\.css$/,
        // loader 执行顺序是：从下到上，从右到左
        use: ['vue-style-loader', 'css-loader']
      },
      {
        test: /\.js$/,
        use: {
          options: { 
            // 告诉js 文件需要es6 转化成es5 的插件
            // 默认使用 babel-loader 调用 babel-core 的 transform 方法，最后调用 preset
            presets: ['@babel/preset-env']
          },
          loader: 'babel-loader'
        },
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin()
  ]
}
```

#### 客户端配置
`config/webpack.client.js`

```javascript
const base = require('./webpack.base')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { merge } = require('webpack-merge')
const path = require('path')
/**
 * 传入路径，通过文档当前所在位置找到这个文件
 * @param {路径} dir 
 */
const resolve = (dir) => {
  return path.resolve(__dirname, dir)
}

module.exports = merge(base, {
  // 入口
  entry: {
    client: resolve('../src/entry-client.js')
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: resolve('../public/index.html')
    })
  ]
})
```

#### 服务端配置
`config/webpack.server.js`

```javascript
// 通过入口，打包出一份代码。代码给node来使用
// webpack 打包服务端代码，是不需要引入打包后的js的，只是引入前端的打包后的结果
const base = require('./webpack.base')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { merge } = require('webpack-merge')
const path = require('path')
/**
 * 传入路径，通过文档当前所在位置找到这个文件
 * @param {路径} dir 
 */
const resolve = (dir) => {
  return path.resolve(__dirname, dir)
}

module.exports = merge(base, {
  // 入口
  entry: {
    server: resolve('../src/entry-server.js')
  },
  target: 'node', // 给 node 使用
  output: {
    libraryTarget: 'commonjs2' // 导出方式
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.ssr.html', // html 名字
      template: resolve('../public/index.ssr.html'),
      minify: false, // 不压缩
      excludeChunks: ['server'] // 排除引入文件
    })
  ]
})
```

### package.json
`package.json` 

```javascript
{
  "name": "vue-ssr",
  "description": "- 只是首屏做 ssr 服务端渲染 - 后续的切换逻辑，执行的都是客户端渲染(前端路由来切换)",
  "version": "1.0.0",
  "main": "server.js",
  "devDependencies": {
    "@babel/core": "^7.12.9",
    "@babel/preset-env": "^7.12.7",
    "@koa/router": "^10.0.0",
    "babel-loader": "^8.2.2",
    "css-loader": "^3.6.0",
    "html-webpack-plugin": "^4.5.0",
    "less-loader": "^7.1.0",
    "sass-loader": "^10.1.0",
    "vue-loader": "^15.9.5",
    "vue-style-loader": "^4.1.2",
    "vue-template-compiler": "^2.6.12",
    "webpack": "^4.44.2",
    "webpack-cli": "^3.3.12",
    "webpack-dev-server": "^3.11.0",
    "webpack-merge": "^5.4.0"
  },
  "keywords": [
    "vue",
    "ssr"
  ],
  "author": "gwb",
  "license": "ISC",
  "scripts": {
    "client:dev": "webpack-dev-server --config ./config/webpack.client.js",
    "client:build": "webpack --config ./config/webpack.client.js",
    "server:build": "webpack --config ./config/webpack.server.js",
    "start": "node server.js"
  },
  "dependencies": {
    "koa": "^2.13.0",
    "vue": "^2.6.12",
    "vue-server-renderer": "^2.6.12"
  }
}
```

### 客户端
`scr/app.js` 

```javascript
import Vue from 'vue'
import App from './App.vue'

// 1.vue在客户端运行的时候，每个客户端都拥有一个独立的实例
// 2.每次客户端访问都要产生一个新的实例，所以这里导出一个函数
export default () => {
  const app = new Vue({
    render: h => h(App)
  })
  // 后续会导出路由、vuex等
  return {
    app
  }
}
```

`src/entry-client.js` 

```javascript
import createApp from './app'
const { app } = createApp()

// 客户端直接挂载即可
app.$mount('#app')
```

### 服务端
`src/entry-server.js`

```javascript
import createApp from './app'

export default () => {
  const { app } = createApp()
  // 这个实例每次都是新的
  return app
}
```

`public/index.ssr.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ssr demo</title>
</head>
<body>
  <!--vue-ssr-outlet-->
</body>
</html>
```

## 七、合并打包
### 安装依赖
```javascript
cnpm i concurrently -D
```

打包命令配置

`package.json` 

```json
{
  "name": "vue-ssr",
  "description": "- 只是首屏做 ssr 服务端渲染 - 后续的切换逻辑，执行的都是客户端渲染(前端路由来切换)",
  "version": "1.0.0",
  "main": "server.js",
  "devDependencies": {
    "@babel/core": "^7.12.9",
    "@babel/preset-env": "^7.12.7",
    "@koa/router": "^10.0.0",
    "babel-loader": "^8.2.2",
    "concurrently": "^5.3.0",
    "css-loader": "^3.6.0",
    "html-webpack-plugin": "^4.5.0",
    "less-loader": "^7.1.0",
    "sass-loader": "^10.1.0",
    "vue-loader": "^15.9.5",
    "vue-style-loader": "^4.1.2",
    "vue-template-compiler": "^2.6.12",
    "webpack": "^4.44.2",
    "webpack-cli": "^3.3.12",
    "webpack-dev-server": "^3.11.0",
    "webpack-merge": "^5.4.0"
  },
  "keywords": [
    "vue",
    "ssr"
  ],
  "author": "gwb",
  "license": "ISC",
  "scripts": {
    "client:dev": "webpack-dev-server --config ./config/webpack.client.js --watch",
    "client:build": "webpack --config ./config/webpack.client.js --watch",
    "server:build": "webpack --config ./config/webpack.server.js --watch",
    "run-all": "concurrently \"npm run client:build\" \"npm run server:build\"",
    "start": "node server.js"
  },
  "dependencies": {
    "koa": "^2.13.0",
    "vue": "^2.6.12",
    "vue-server-renderer": "^2.6.12"
  }
}
```

## 八、服务端实现
### 安装依赖
```javascript
cnpm i koa-static
```

`package.json` 

```json
{
  "name": "vue-ssr",
  "description": "- 只是首屏做 ssr 服务端渲染 - 后续的切换逻辑，执行的都是客户端渲染(前端路由来切换)",
  "version": "1.0.0",
  "main": "server.js",
  "devDependencies": {
    "@babel/core": "^7.12.9",
    "@babel/preset-env": "^7.12.7",
    "@koa/router": "^10.0.0",
    "babel-loader": "^8.2.2",
    "concurrently": "^5.3.0",
    "css-loader": "^3.6.0",
    "html-webpack-plugin": "^4.5.0",
    "less-loader": "^7.1.0",
    "sass-loader": "^10.1.0",
    "vue-loader": "^15.9.5",
    "vue-style-loader": "^4.1.2",
    "vue-template-compiler": "^2.6.12",
    "webpack": "^4.44.2",
    "webpack-cli": "^3.3.12",
    "webpack-dev-server": "^3.11.0",
    "webpack-merge": "^5.4.0"
  },
  "keywords": [
    "vue",
    "ssr"
  ],
  "author": "gwb",
  "license": "ISC",
  "scripts": {
    "client:dev": "webpack-dev-server --config ./config/webpack.client.js --watch",
    "client:build": "webpack --config ./config/webpack.client.js --watch",
    "server:build": "webpack --config ./config/webpack.server.js --watch",
    "run-all": "concurrently \"npm run client:build\" \"npm run server:build\"",
    "start": "node server.js"
  },
  "dependencies": {
    "koa": "^2.13.0",
    "koa-static": "^5.0.0",
    "vue": "^2.6.12",
    "vue-server-renderer": "^2.6.12"
  }
}
```

### server实现
`server.js` 

```javascript
const Koa = require('koa')
const Router = require('@koa/router')
const { createBundleRenderer } = require('vue-server-renderer')
const Vue = require('vue')
const fs = require('fs')
const path = require('path')
const static = require('koa-static')

// 服务端编译后的js
const serverBundle = fs.readFileSync(path.resolve(__dirname, './dist/server.bundle.js'), 'utf-8')

// 读取模板
const template = fs.readFileSync(path.resolve(__dirname, './public/index.ssr.html'), 'utf-8')

// createRenderer,创建一个渲染函数 renderToString, 渲染出一个字符串
const render = createBundleRenderer(serverBundle, {
  template
})

// 产生一个 app 实例
let app = new Koa() 
// 产生一个路由实例
let router = new Router()
router.get('/', async (ctx) => {
  ctx.body = await render.renderToString()
})

// 使用静态服务插件
app.use(static(__dirname))
// 将路由注册到应用上
app.use(router.routes())
// 监听 3000 端口号
app.listen(3000)
```

`public/index.ssr.html` 

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ssr demo</title>
</head>
<body>
  <!--vue-ssr-outlet-->

  <script src="/dist/client.bundle.js"></script>
</body>
</html>
```

`scr/App.vue` 

```vue
<template>
  <div id="app">
    <Bar />
    <Foo />
  </div>
</template>

<script>
import Bar from './components/Bar'
import Foo from './components/Foo'
export default {
  components: {
    Bar,
    Foo
  }
}
</script>

<style scoped>

</style>
```

[客户端激活 (client-side hydration) | Vue SSR 指南](https://ssr.vuejs.org/zh/guide/hydration.html)



## 九、热更新
### 客户端插件
`config/webpack.client.js`

```javascript
const base = require('./webpack.base')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { merge } = require('webpack-merge')
const path = require('path')
const VueSSRClientPlugin = require('vue-server-renderer/client-plugin'); // 在客户端打包时增加插件

/**
 * 传入路径，通过文档当前所在位置找到这个文件
 * @param {路径} dir 
 */
const resolve = (dir) => {
  return path.resolve(__dirname, dir)
}

module.exports = merge(base, {
  // 入口
  entry: {
    client: resolve('../src/entry-client.js')
  },
  plugins: [
    new VueSSRClientPlugin()
    // 前端打包出的结果，只是用于挂载到服务端生成的字符串中
    // new HtmlWebpackPlugin({
    //   template: resolve('../public/index.html')
    // })
  ]
})
```

### 服务端插件
`config/webpack.server.js` 

```javascript
// 通过入口，打包出一份代码。代码给node来使用
// webpack 打包服务端代码，是不需要引入打包后的js的，只是引入前端的打包后的结果
const base = require('./webpack.base')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { merge } = require('webpack-merge')
const path = require('path')
const VueSSRServerPlugin = require('vue-server-renderer/server-plugin'); // 在服务端打包时增加插件


/**
 * 传入路径，通过文档当前所在位置找到这个文件
 * @param {路径} dir 
 */
const resolve = (dir) => {
  return path.resolve(__dirname, dir)
}

module.exports = merge(base, {
  // 入口
  entry: {
    server: resolve('../src/entry-server.js')
  },
  target: 'node', // 给 node 使用
  output: {
    libraryTarget: 'commonjs2' // 导出方式
  },
  plugins: [
    new VueSSRServerPlugin(),
    new HtmlWebpackPlugin({
      filename: 'index.ssr.html', // html 名字
      template: resolve('../public/index.ssr.html'),
      minify: false, // 不压缩
      excludeChunks: ['server'] // 排除引入文件
    })
  ]
})
```

### 服务端
`server.js`

```javascript
const Koa = require('koa')
const Router = require('@koa/router')
const { createBundleRenderer } = require('vue-server-renderer')
const Vue = require('vue')
const fs = require('fs')
const path = require('path')
const static = require('koa-static')

// 服务端编译后的js
// const serverBundle = fs.readFileSync(path.resolve(__dirname, './dist/server.bundle.js'), 'utf-8')
const serverBundle = require('./dist/vue-ssr-server-bundle.json')

// 读取模板
const template = fs.readFileSync(path.resolve(__dirname, './public/index.ssr.html'), 'utf-8')
const clientManifest = require('./dist/vue-ssr-client-manifest.json')

// createRenderer,创建一个渲染函数 renderToString, 渲染出一个字符串
const render = createBundleRenderer(serverBundle, {
  template,
  clientManifest // 自动注入客户端打包后的文件
})

// 产生一个 app 实例
let app = new Koa() 
// 产生一个路由实例
let router = new Router()

// router.get('/', async (ctx) => {
//   // 客户端 = template + 编译的结果 = 组成的html
//   ctx.body = await render.renderToString()
// })

router.get("/", async ctx => {
  ctx.body = await new Promise((resolve, reject) => {
    render.renderToString((err, html) => {
      // 必须写成回调函数的方式否则样式不生效
      resolve(html)
    })
  })
})

// 使用静态服务插件
app.use(static(path.resolve(__dirname, 'dist')))
// 将路由注册到应用上
app.use(router.routes())
// 监听 3000 端口号
app.listen(3000)
```

### 模板
`public/index.ssr.html` 

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ssr demo</title>
</head>
<body>
  <!--vue-ssr-outlet-->
</body>
</html>
```

## 十、集成VueRouter
### 安装依赖
```javascript
cnpm i vue-router -S
```

### 路由配置
`src/create-router.js` 

```javascript
// 用来创建路由
// 可以用异步组件来加载(靠的是 webpack 中代码分割功能 import())
import Vue from 'vue'
import VueRouter from 'vue-router'
Vue.use(VueRouter)

const Bar = () => import('./components/Bar.vue')
const Foo = () => import('./components/Foo.vue')

export default () => {
  const router = new  VueRouter({
    mode: 'history',
    routes: [
      {
        path: '/foo',
        component: Foo
      },
      {
        path: '/bar',
        component: Bar
      }
    ]
  })
  return router
}
```

### 配置入口
`scr/app.js` 

```javascript
import Vue from 'vue'
import App from './App.vue'
import createRouter from './create-router'

// 1.vue在客户端运行的时候，每个客户端都拥有一个独立的实例
// 2.每次客户端访问都要产生一个新的实例，所以这里导出一个函数
export default () => {
  const router = createRouter()
  const app = new Vue({
    router,
    render: h => h(App)
  })
  // 后续会导出路由、vuex等
  return {
    app,
    router
  }
}
```

### 配置组件
`scr/App.vue` 

```vue
<template>
  <div id="app">
    <header>
      <router-link to="/bar">bar</router-link>
      <router-link to="/foo">foo</router-link>
    </header>
    <main>
      <router-view></router-view>
    </main>
  </div>
</template>

<script>
import Bar from './components/Bar'
import Foo from './components/Foo'
export default {
  components: {
    Bar,
    Foo
  }
}
</script>

<style scoped>

</style>
```

### 服务端入口配置
`scr/entry-server.js` 

```javascript
import createApp from './app'

// context.url 这里包含这当前访问服务端的路径
export default (context) => {
  return new Promise((resolve, reject) => {
    const { app, router } = createApp()
    // 默认跳转到路径里，有异步组件
    router.push(context.url)
    router.onReady(() => {
      resolve(app)
    })
    // 这个实例每次都是新的
    // return app
  })
}
```

### 服务端配置
`src/server.js` 

```javascript
const Koa = require('koa')
const Router = require('@koa/router')
const { createBundleRenderer } = require('vue-server-renderer')
const Vue = require('vue')
const fs = require('fs')
const path = require('path')
const static = require('koa-static')

// 服务端编译后的js
// const serverBundle = fs.readFileSync(path.resolve(__dirname, './dist/server.bundle.js'), 'utf-8')
const serverBundle = require('./dist/vue-ssr-server-bundle.json')

// 读取模板
const template = fs.readFileSync(path.resolve(__dirname, './public/index.ssr.html'), 'utf-8')
const clientManifest = require('./dist/vue-ssr-client-manifest.json')

// createRenderer,创建一个渲染函数 renderToString, 渲染出一个字符串
const render = createBundleRenderer(serverBundle, {
  template,
  clientManifest // 自动注入客户端打包后的文件
})

// 产生一个 app 实例
let app = new Koa() 
// 产生一个路由实例
let router = new Router()

router.get("/(.*)", async ctx => {
  ctx.body = await new Promise((resolve, reject) => {
    render.renderToString({ url: ctx.url }, (err, html) => {
      // 必须写成回调函数的方式否则样式不生效
      resolve(html)
    })
  })
})

// 先匹配静态资源，资源找不到再找对应的api
// 使用静态服务插件
app.use(static(path.resolve(__dirname, 'dist')))
// 将路由注册到应用上
app.use(router.routes())
// 监听 3000 端口号
app.listen(3000)
```

## 十一、集成Vuex
### 安装依赖
```javascript
cnpm i vuex -S
```

### vuex配置
`src/create-store.js`

```javascript
import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default () =>{
  const store = new Vuex.Store({
    state: {
      name: 'robin'
    },
    mutations: {
      CHANGE_NAME(state, payload) {
        state.name = payload
      }
    },
    actions: {
      changeName({ commit }, payload) {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            commit('CHANGE_NAME', payload)
            resolve() // 执行完要返回
          }, 1000);
        })
      }
    }
  })
  // 在浏览器运行代码
  if (typeof window !== 'undefined' && window.__INITIAL_STATE__) {
    store.replaceState(window.__INITIAL_STATE__)
  }
  return store
}
```

### 配置入口
`scr/app.js`

```javascript
import Vue from 'vue'
import App from './App.vue'
import createRouter from './create-router'
import createStore from './create-store'

// 1.vue在客户端运行的时候，每个客户端都拥有一个独立的实例
// 2.每次客户端访问都要产生一个新的实例，所以这里导出一个函数
export default () => {
  const router = createRouter()
  const store = createStore()
  const app = new Vue({
    router,
    store,
    render: h => h(App)
  })
  // 后续会导出路由、vuex等
  return {
    app,
    router,
    store
  }
}
```

### 配置组件
`scr/components/Foo.vue`

```vue
<template>
  <div class="foo">
    foo
    {{ this.$store.state.name }}
  </div>
</template>

<script>
export default {
  // mounted() {
  //   return this.$store.dispatch("changeName", 'hahha');
  // },
  asyncData(store) {
    return store.dispatch("changeName", 'test');
  }
}
</script>

<style scoped>
.foo {
  color: red;
}
</style>
```

### 服务端入口配置
`scr/entry-server.js`

```javascript
import createApp from './app'

// context.url 这里包含这当前访问服务端的路径
export default (context) => {
  return new Promise((resolve, reject) => {
    const { app, router, store } = createApp()
    // 默认跳转到路径里，有异步组件
    router.push(context.url)
    router.onReady(() => {
      // 获取路由匹配到的组件
      const matchComponents = router.getMatchedComponents();
      if (!matchComponents.length) {
        return reject({ code: 404 });
      }
      Promise.all(matchComponents.map((component) => {
        if(component.asyncData) {
          return component.asyncData(store)
        }
      })).then(() => {
        context.state = store.state; // 将store挂载在window.__INITIAL_STATE__
        resolve(app)
      }, reject)
    })
    // 这个实例每次都是新的
    // return app
  })
}
```

## 参考


[Vue.js 服务器端渲染指南 | Vue SSR 指南](https://ssr.vuejs.org/zh/)



[安装](https://www.nuxtjs.cn/guide/installation)

