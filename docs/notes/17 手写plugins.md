## 一、webpack
### 流程图
webpack只能处理javascript的模块，如果要处理其他类型的文件，需要使用loader进行转换。loader是webpack中一个重要的概念，它是指将一段代码转换成另一段代码的webpack加载器。

<!-- 这是一张图片，ocr 内容为：NqarapTHNNEIIATONOSY 新际a5济5-以阳于 源中心公杯 navEWiFOpBcHO n:颈Y入口方 u中Eh时个N 开注5酒 的兴监正限兴店至产烦饭 FUnt) 让地实姐个\7个梅对不箭的适 茶原成,唯工康品品婴据药.. 四p上e我开型个宝快生,买办卡包与两 coimpilato 牌雪成据月系证园品选 [OMpc中:IHG伴床dLt 精店店城饰品临 阳入文伴名出3 NYuin 发 addMiadukDapeadendieel AddMotuleChatne 山ul己榨U中T 并的街mdb./ GuildModukc拿) SEQL0) 一1乐 createChtinkAsSeTS) GonR 汽 AMLO无品.SIAROMOUUL MaLnTamplste.kcndern Chuakletplsterendert .士龙 Tw-rmit ModuleItmplatertnJleno 赠过线门兴脑主菁母智的]出UtPut拍h中 Compilcr.cmitakeBe -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607651596484-71db11bd-1618-4396-bca2-ae69db0afe6d.png)

### 结构图
<!-- 这是一张图片，ocr 内容为：Compiler 功能实体减 Plugin Compilation Parse DependecnyFactory Resolver Template Loader Chunk DependecniesBlock 内容实体 Dependecny Module DependeciesBlockVariable DependecisAsyncVariable 底层依赖赖 mkdir tapable enhanced-resolve acorn async -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607651721912-aefc8a47-54f3-4d8b-afd0-d5e8050671b6.png)

## 二、框架配置
### 安装依赖
```javascript
cnpm i -D webpack@4 webpack-cli@3 webpack-dev-server tml-webpack-plugin 
cnpm i -D babel-loader @babel/preset-env @babel/core
```

### 目录搭建
#### 入口文件
`src/index.js` 

```javascript
console.log('hello webpack plugins')
```

#### 配置文件
`webpack.config.js` 

```javascript
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  devServer: {
    port: 3000,
    contentBase: './dist',
    hot: true,
    progress: true
  },
  devtool: 'source-map',
  plugins: [
    new HtmlWebpackPlugin({
      title: 'home',
      template: './public/index.html'
    })
  ]
}
```

#### package.json
`package.json` 

```json
{
  "name": "webpack-plugins-source",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "dev": "webpack-dev-server --open",
    "build": "webpack",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "@babel/core": "^7.12.10",
    "@babel/preset-env": "^7.12.10",
    "babel-loader": "^8.2.2",
    "html-webpack-plugin": "^4.5.0",
    "webpack": "^4.44.2",
    "webpack-cli": "^3.3.12",
    "webpack-dev-server": "^3.11.0"
  }
}
```

#### 目录结构
<!-- 这是一张图片，ocr 内容为：webpack-plugins-source EXPLORER OPENEDITORS WEBPACKPLUGINS-SOURCE node_modules public index.html index-Js gitignore packagejson webpack.contigjs ShowAllCommands otoFile FindinFILeS StartDebugging TOGgLETeRmiNal TODOTREE:TODOS OUTLINE TIMELINE VESLINTACOmPILeHero:Otf PAutoFormatyue:off ?0A0 -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607656699770-7c6289fe-5441-44e1-803b-53c9fc9cf5fc.png)

## 三、同步异步插件
### 同步插件
#### 配置文件
`webpack.config.js` 

```json
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const SyncPlugin = require('./plugins/SyncPlugin')
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  devServer: {
    port: 3000,
    contentBase: './dist',
    hot: true,
    progress: true
  },
  devtool: 'source-map',
  plugins: [
    new HtmlWebpackPlugin({
      title: 'home',
      template: './public/index.html'
    }),
    new SyncPlugin()
  ]
}
```

#### 插件文件
`plugins/SyncPlugin.js` 

```javascript
class SyncPlugin {
  apply(compiler) {
    // 同步钩子
    compiler.hooks.done.tap('SyncPlugin', (state) => {
      console.log('编译完成....')
    })
  }
}
module.exports = SyncPlugin
```

#### 测试
```javascript
npx webpack
```

<!-- 这是一张图片，ocr 内容为：T3s robin@Royan:-/Downloadscodelztfwebackckluin-.. webpack-plugins-sourcegit:master) npxwedpack 编译完成... Hash:ba938941a3bdd5deb60 Version:webpack4.44.2 Time:68ms Builtat:12/11/202011:41:36AM ChunkNames Chunks Size Asset [emitted] bundle.js 3.79KiB main main [emitted[dev] 3.61KiB bundle.js.map main main [emitted] 231bytes index.html Entrypointmain nbundLe.jsbundle.js.map [./src/index.js]37bytesimain[built ChiLdHtmLWebpackCompiler 1asset EntrypointHtmlwebpackPlugin_iuin ./nodemdules/html-webpack-plugin..mk !./public/index.htmij 491bytestHtmlwebpackPlugin_[built] webpack-plugins-sourcegit:(master) -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607658114654-a539aba0-0ffd-4d27-ad37-eff851df45fb.png)

### 异步插件
#### 配置文件
`webpack.config.js`

```javascript
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const AsyncPlugin = require('./plugins/AsyncPlugin')
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  devServer: {
    port: 3000,
    contentBase: './dist',
    hot: true,
    progress: true
  },
  devtool: 'source-map',
  plugins: [
    new HtmlWebpackPlugin({
      title: 'home',
      template: './public/index.html'
    }),
    new AsyncPlugin()
  ]
}
```

#### 插件文件
`plugins/AsyncPlugin.js`

```javascript
class AsyncPlugin {
  apply(compiler) {
    compiler.hooks.emit.tapAsync('AsyncPlugin', (compilation, cb) => {
      setTimeout(() => {
        console.log('文件发射出来了，等一下...')
        cb()
      }, 1000);
    })
    compiler.hooks.emit.tapPromise('AsyncPlugin', (compilation) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          console.log('文件发射出来了，再等一秒...')
          resolve()
        }, 1000);
      })
    })
  }
}
module.exports = AsyncPlugin
```

#### 测试
```javascript
npx webpack
```

<!-- 这是一张图片，ocr 内容为：T3s robin@Royan:-/Downloadscodelztfwebpackbacklugin-. webpack-plugins-sourcegit:master) npxwebpack 文件发射出来了,等一下... 文件发射出来了,再等一秒... Hash:bo938941a3bdds1deb60 Version:webpack4.44.2 Time:2090ms Builtat:12/11/202011:43:50AM SizeChunks ChunkNames Asset [emitted 3.79KiB bundLe.js main mazn 3.61KiB bundle.js.map [emitted][dev] main main [emitted] 231bytes index.html Entrypointmainbundle.jsbundle.js.map [./src/index.js]37bytesimainbuilt] ChildHtmLWebpackCompiler 1asset EntrypointhtmlWebpackPlugin_ child-HtmlwebpackPlugin_0 ./nodemodules/html-webpack-plugin..mekpin !./public/index.htmlj491bytes HmlWebpackPlugin_[built] webpack-plugins-sourcegit:master) -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607658241763-5676cfb0-3c04-4b8b-82ea-33f4b33a6443.png)



## 四、文件列表插件实现
### 配置文件
`webpack.config.js`

```javascript
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const SyncPlugin = require('./plugins/SyncPlugin')
const AsyncPlugin = require('./plugins/AsyncPlugin')
const FileListPlugin = require('./plugins/FileListPlugin')
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  devServer: {
    port: 3000,
    contentBase: './dist',
    hot: true,
    progress: true
  },
  devtool: 'source-map',
  plugins: [
    new HtmlWebpackPlugin({
      title: 'home',
      template: './public/index.html'
    }),
    // new SyncPlugin(),
    // new AsyncPlugin(),
    new FileListPlugin({
      filename: 'readme.md'
    }) 
  ]
}
```

### 插件文件
`plugins/FileListPlugin.js`

```javascript
class FileListPlugin {
  constructor(options) {
    this.filename = options.filename
  }
  apply(compiler) {
    // 文件发射之前
    compiler.hooks.emit.tapAsync('FileListPlugin', (compilation, cb) => {
      // console.log(compilation.assets)
      const assets = compilation.assets
      let content = `## 文件名      资源大小\r\n`
      Object.entries(assets).forEach(([filename, value]) => {
        content += `- ${filename}      ${value.size()}\r\n`
      })
      assets[this.filename] = {
        source() {
          return content
        },
        size() {
          return content.length
        }
      }
      cb()
    })
  }
}
module.exports = FileListPlugin
```

### 测试
```javascript
npx webpack
```

<!-- 这是一张图片，ocr 内容为：readme.md-webpack-plugins-source readme.mdX EXPLORER 资源大小 dist> OPENEDITORS 四#文件名 readme.md> 爱 资源大小 ##文件名 readme.mddist bundLe.js 3879 WEBPACK-PLUGINS-SOURCE 3694 bundle.js.map dist 231 index.html bundle.js bundle.js.map index.html readme.md nodemodules plugins AsyncPlugin.js FileListPluginjs SyncPlugin.js public index.html src index.js gitignore package.json M wedpack.config.js TODOTREE:TODOS OUTLINE TIMELINE CompileHero:OFf ESLinT 105bytes Prettier master readme.md markdown -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607659719473-2937fa4b-8fbb-43bf-b26a-f6003851d102.png)



## 五、内联webpack插件实现
### 安装依赖
```javascript
cnpm i -D style-loader css-loader mini-css-extract-plugin
```

### 配置文件
`webpack.config.js`

```javascript
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const SyncPlugin = require('./plugins/SyncPlugin')
const AsyncPlugin = require('./plugins/AsyncPlugin')
const FileListPlugin = require('./plugins/FileListPlugin')
const InlineSourcePlugin = require('./plugins/InlineSourcePlugin')
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  devServer: {
    port: 3000,
    contentBase: './dist',
    hot: true,
    progress: true
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'home',
      template: './public/index.html'
    }),
    new MiniCssExtractPlugin({
      filename: 'main.css'
    }),
    // new SyncPlugin(),
    // new AsyncPlugin(),
    new FileListPlugin({
      filename: 'readme.md'
    }),
    new InlineSourcePlugin({
      match: /\.(js|css)/
    })
  ]
}
```

### 插件文件
`plugins/InlineSourcePlugin.js`

```javascript
const HtmlWebpackPlugin = require('html-webpack-plugin')
class InlineSourcePlugin {
  constructor(option) {
    this.reg = option.match
  }
  // 处理某一个标签的数据
  processTag(tag, compilation) {
    let newTag
    let url
    if(tag.tagName === 'link' && this.reg.test(tag.attributes.href)) {
      newTag = {
        tagName: 'style',
        attributes: {
          type: 'text/css'
        }
      }
      url = tag.attributes.href
    }
    if(tag.tagName === 'script' && this.reg.test(tag.attributes.src)) {
      newTag = {
        tagName: 'script',
        attributes: {
          type: 'application/javascript'
        }
      }
      url = tag.attributes.src
    }
    if(url) {
      newTag.innerHTML = compilation.assets[url].source() // 文件的内容
      // 删除原有应该生成的资源
      delete compilation.assets[url]
      return newTag
    }
    return tag
  }
  // 处理引入标签的数据
  processTags(data, compilation) {
    let headTags = []
    let bodyTags = []
    data.headTags.forEach(headTag => {
      headTags.push(this.processTag(headTag, compilation))
    })
    data.bodyTags.forEach(bodyTag => {
      bodyTags.push(this.processTag(bodyTag, compilation))
    })
    return {
      ...data,
      headTags,
      bodyTags
    }
  }
  apply(compiler) {
    // 通过HtmlWebpackPlugin来实现这个功能
    compiler.hooks.compilation.tap('InlineSourcePlugin', (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTagGroups.tapAsync('alertPlugin', (data, cb) => {
        data = this.processTags(data, compilation)
        cb(null, data)
      })
    })
  }
}
module.exports = InlineSourcePlugin
```

### 入口文件
`src/index.js`

```javascript
console.log('hello webpack plugins')
import './css/index.css'
```

### 测试文件
`src/css/index.css` 

```javascript
body {
  background-color: antiquewhite;
}
```

### 测试
```javascript
nmp run build
```

<!-- 这是一张图片，ocr 内容为：webpack-plugins-source index.html index.html EXPLORER index.html body OPENEDITORS head sTyle html dist IDOCTYPEhTmL index.htmldist shtmltang-"'en"> WEBPACK-PLUGINS-SOURCE shead> dist <metacharset-"uTF-g"> UGOIOU bundle.js.map metaname"vicuport"content"widthdevice-widthntia-a <title>homes/title index.html styletype-"text/css">body main.css.map Hantiquewhiter background-color readme.md node_modules plugins *淋sourceMappinguRLmainc <body AsyncPluginJJs index FileListPlugin.s scripttype"application/javascipt"/nu webpackB LNLINESOURCEPluginjsU 15 /*kkThemodulecache SyncPluginjs 16 1*p*w*/varinstauleaModules ****术* public 中*****/THerequiReFunction 18 index.html 19 中沐求本本*/ FunctionHebpackrequire(odueI) 20 牛*木水本 HCheckifmoduleisincache 牛*本素来* 22 if(instalLedModules[moduleId]) IndexCSs 林林木木**/ returninstaitedModules[moduleId]exprt 23 /林林木木** index.js 24 ***家** gitignore HCreateanewmodule(andputitintothecache) *味家k M package.json 26 varmoduleinstaiiedModules[modue ITApc- 27 webpack.contig-/s i:moduleId, **求火物虾 u:false **来米** 铭心窝 TODOTREE:TODOS /中** exports: 中*本本** OUTLINE 31 中*本水 TIMELINE WCompileHero:OFf ?0A0 html/Vindex.html UTF-8 4.68KiB Prettier HTML VESLINT Port:5500 master -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607749686686-8097d13b-b5ef-4100-ae31-d4ab627686ec.png)



### 参考
[MiniCssExtractPlugin | webpack](https://webpack.js.org/plugins/mini-css-extract-plugin/#root)



## 六、打包后自动发布
### 安装依赖
```javascript
cnpm i -D qiniu
```

### 配置文件
`webpack.config.js`

```javascript
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const SyncPlugin = require('./plugins/SyncPlugin')
const AsyncPlugin = require('./plugins/AsyncPlugin')
const FileListPlugin = require('./plugins/FileListPlugin')
const InlineSourcePlugin = require('./plugins/InlineSourcePlugin')
const UploadPlugin = require('./plugins/UploadPlugin')
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    // publicPath: 'http://xxx.xxx.com/'
  },
  devServer: {
    port: 3000,
    contentBase: './dist',
    hot: true,
    progress: true
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'home',
      template: './public/index.html'
    }),
    new MiniCssExtractPlugin({
      filename: 'main.css'
    }),
    // new SyncPlugin(),
    // new AsyncPlugin(),
    new FileListPlugin({
      filename: 'readme.md'
    }),
    // new InlineSourcePlugin({
    //   match: /\.(js|css)/
    // }),
    // 上传到七牛
    new UploadPlugin({
      bucket: 'g-webpack-demo', // '空间名'
      domain: '域名',
      accessKey: 'ifbUeKEDFYrmUDLgQpuRGpLtGw6l2eV0LnqrLBtc', // 'AK'
      secretKey: 'tFmSrf4ZcDOLUR4o7_KJ8KBmYsDUljoBlPmx-_5Q' // 'SK'
    })
  ]
}
```

### 插件文件
`loaders/file-loader.js`

```javascript
const path = require('path')
const qiniu = require('qiniu')
class UploadPlugin {
  constructor(options) {
    const {
      bucket = '',
      domain = '',
      accessKey = '',
      secretKey = ''
    } = options
    let mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
    let puPolicy = new qiniu.rs.PutPolicy({
      scope: bucket
    })
    this.uploadToken = puPolicy.uploadToken(mac)
    let config = new qiniu.conf.Config()
    this.formUploader = new qiniu.form_up.FormUploader(config)
    this.putExtra = new qiniu.form_up.PutExtra()
  }
  upload(filename) {
    return new Promise((resolve, reject) => {
      const localFile = path.resolve(__dirname, '../dist', filename)
      this.formUploader.putFile(this.uploadToken, filename, localFile, this.putExtra, (responseError, responseBody, responseInfo) => {
        console.log(responseError, responseInfo, responseBody)
        if(responseError) {
          reject(responseError)
        }
        if(responseInfo && responseInfo.statusCode == 200) {
          resolve(responseBody)
        }
      })
    })
  }
  apply(compiler) {
    compiler.hooks.afterEmit.tapPromise('UploadPlugin', (compilation) => {
      let assets = compilation.assets
      let promises = []
      Object.keys(assets).forEach(filename => {
        promises.push(this.upload(filename))
      })
      return Promise.all(promises)
    })
  }
}
module.exports = UploadPlugin
```



### 参考
[七牛云开发者平台](https://portal.qiniu.com/identity/personal)



## 参考
[插件(plugins) | webpack 中文网](https://www.webpackjs.com/concepts/plugins/)





