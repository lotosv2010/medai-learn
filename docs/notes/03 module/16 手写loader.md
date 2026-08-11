## 一、什么是loader？
webpack只能处理javascript的模块，如果要处理其他类型的文件，需要使用loader进行转换。loader是webpack中一个重要的概念，它是指将一段代码转换成另一段代码的webpack加载器。

## 二、框架配置
### 安装依赖
```javascript
cnpm i -D webpack webpack-cli
```

### 目录搭建
#### 入口文件
`src/index.js` 

```javascript
console.log('webpack loader')
```

#### loader文件
`loaders/g-loader.js` 

```javascript
function loader(source) {
  console.log(source)
  return source
}
module.exports = loader
```

#### 配置文件
`webpack.config.js` 

```javascript
const path = require('path')
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  }
}
```

#### package.json
`package.json` 

```json
{
  "name": "webpack-loader-source",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "dev": "webpack",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "webpack": "^5.10.0",
    "webpack-cli": "^4.2.0"
  }
}
```

#### 目录结构
<!-- 这是一张图片，ocr 内容为：EXPLORER OPENEDITORS WEBPACK-LOADER-SOURCE loaders -loaderjs node_modules index.js gitignore package.json webpack.config.js SHowAlICommands iotoFile FInDinFILES StartDebugging TOggLeTerminal Unbound OUTLINE TIMELINE WESLInTYComPiLEHErO:Otf BAutoFormaTVue:Off 80A0 -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607583836540-e6a2aada-47a1-44f2-b474-38f441bc4f8a.png)

## 三、loader引入方式
### 方式一(别名)
#### 配置文件
`webpack.config.js` 

```javascript
const path = require('path')
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  // 解析 webpack 的 loader 包
  resolveLoader: {
    // 别名
    alias: {
      gloader: path.resolve(__dirname, 'loaders', 'g-loader.js')
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        // 别名
        use: [
          'gloader'
        ]
      }
    ]
  }
}
```

#### 测试
```javascript
nmp run dev
```

<!-- 这是一张图片，ocr 内容为：t381 Robin@Royan:-/Downloadscodelffwbpackwcklre webpack-loader-sourcegit:(master)xm WePacKlogdeRSoURCee.. source wedpack console.logCwedpackloader) [webpack-clijCompilationfinished assetbundle.js806bytes s[emitted Cname:main) [built][codegenerated] /src/index.js29bytes webpack5.10.ocompileuccesfullyin68m webpack-loader-sourcegit:master) ShowAllCommands 合第P GOtoFile 3P FindinFiles 仓冠F -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607584096174-4ea70932-b007-4ee5-91e3-fb8c7079cf0d.png)

### 方式二(modules)
#### 配置文件
`webpack.config.js`

```javascript
const path = require('path')
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  // 解析 webpack 的 loader 包
  resolveLoader: {
    // 告诉 webpack 解析模块时应该搜索的目录
    modules: ["node_modules", path.resolve(__dirname, "loaders")]
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          'g-loader'
        ]
      }
    ]
  }
}
```

#### 测试
```javascript
nmp run dev
```

<!-- 这是一张图片，ocr 内容为：t381 Robin@Royan:-/Downloadscodelffwbpackwcklre webpack-loader-sourcegit:(master)xm WePacKlogdeRSoURCee.. source wedpack console.LogCwedpackloader) [webpack-cliCompilationfinishd assetbundle.js806bytes[comparedforemit](name:main) [builtj[codegenerated] /src/index.js29bytes webpack5.10.0compilesuccessfullyin77m webpack-loader-sourcegit:master) ShowAllCommands 合第P GOtoFile 3P FindinFiles 仓冠F -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607584213679-25862531-f5f8-419a-b0a1-193e2427eb0d.png)

### 参考
[解析(resolve) | webpack 中文网](https://www.webpackjs.com/configuration/resolve/#resolveloader)



## 四、配置多个loader
### loader分类
+ `pre` ：前置执行 `loader`
+ `normal` ：普通 `loader`
+ `inline` ：内敛 `loaser`
+ `post` ：后置 `loaser`



### loader执行顺序
+ loader顺序问题，从右到左，从下到上
+ pre => normal => inline => post



符号含义

+ `-!` 禁用前置和正常 `loader` 
+ `!` 禁用普通 `loader` 
+ `!!` 禁用前置和后置和正常 `loader` 



### loader组成
+ `loader` 默认是由两部分组成的 `pitch` 和 `normal` 

<!-- 这是一张图片，ocr 内容为：USE:loader3,loader2,loader Pitchloader-无返回值 Pitch Loader2 Loader1 Loader3 resource 资源 Normal Loader1 Loader3 Loader2 点击查看大图 -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607587138077-e1222637-30e7-4605-a5ac-6ae852177793.png)<!-- 这是一张图片，ocr 内容为：点击查看大图 Pitchloader-有返回值 Loader2 Pitch Loader1 Loader3 resource 有返回值 资源 Loader2 Loader1 Loader3 Normal -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607587235152-5ffddee2-fe95-4ce0-834d-92aa836d171c.png)

### loader特点
+ 第一个 `loader` 要返回 `js` 脚本
+ 每一个 `loader` 只要做一件事，为了使 `loader` 在更多的场景链式调用
+ 每一个 `loader` 都是一个模块
+ 每一个 `loader` 都是无状态的，确保 `loader` 在不同的模块转换之间不保存状态



### 配置文件
`webpack.config.js` 

```javascript
const path = require('path')
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  // 解析 webpack 的 loader 包
  resolveLoader: {
    // 告诉 webpack 解析模块时应该搜索的目录
    modules: ["node_modules", path.resolve(__dirname, "loaders")]
  },
  module: {
    // !注意：loader顺序问题，从右到左，从下到上
    rules: [
      {
        test: /\.js$/,
        loader:'g-loader',
        enforce: 'pre'
      },
      {
        test: /\.js$/,
        loader: 'w-loader'
      },
      {
        test: /\.js$/,
        loader: 'b-loader',
        enforce: 'post'
      }
    ]
  }
}
```

### laoder文件
`loaders/g-loader.js` 

```javascript
function loader(source) {
  console.log(1)
  return source
}
loader.pitch = function() {
  console.log('g-pitch')
}
module.exports = loader
```

`loaders/w-loader.js` 

```javascript
function loader(source) {
  console.log(2)
  return source
}
loader.pitch = function() {
  console.log('w-pitch')
}
module.exports = loader
```

`loaders/b-loader.js` 

```javascript
function loader(source) {
  console.log(3)
  return source
}
loader.pitch = function() {
  console.log('b-pitch')
}
module.exports = loader
```

`loaders/inline-loader.js` 

```javascript
function loader(source) {
  console.log('inline loader')
  return source
}
loader.pitch = function() {
  console.log('inline-pitch')
}
module.exports = loader
```

### 测试文件
`src/inline.js` 

```javascript
module.exports = 'inline'
```

`src/index.js` 

```javascript
console.log('webpack loader')
const str = require(`inline-loader!./inline.js`)
```

### 测试
```javascript
nmp run dev
```

<!-- 这是一张图片，ocr 内容为：飞31 robin@Royan:-/Downloadscodezfwbckwcke wepadkLoddeRoURCEL.0.dk source webpack b-pitch w-pitch g-pitch b-pitch inline-pitch w-pitch g-pitch inlineLoader [webpack-cliCompilationfinished 2.3KiB[comparedforemit]name:main) assetbundle 78bytes[builtj[codegenerated /src/index.js ine-loader.jsl./s/inline.jsbytes[builtj[codegenerated /oaders/inline- compileds wedpack5.10.0co dsuccessfullyin_86 mS webpack-loader-sourcegit:(master) -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607588758153-0744e122-9830-48d2-a0e1-b12822e29f3a.png)

### 参考
[模块(module) | webpack 中文网](https://www.webpackjs.com/configuration/module/#rule-enforce)



## 五、babel-loader实现
### 安装依赖
```javascript
cnpm i -D @babel/core @babel/preset-env
cnpm i -D loader-utils
```

### 配置文件
`webpack.config.js`

```javascript
const path = require('path')
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  // 解析 webpack 的 loader 包
  resolveLoader: {
    // 告诉 webpack 解析模块时应该搜索的目录
    modules: ["node_modules", path.resolve(__dirname, "loaders")]
  },
  devtool: 'source-map',
  module: {
    // !注意：loader顺序问题，从右到左，从下到上
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env'
              ]
            }
          }
        ]
      }
    ]
  }
}
```

### laoder文件
`loaders/babel-loader.js`

```javascript
const babel = require('@babel/core')
const loaderUtils = require('loader-utils')
function loader(source) {
  const options = loaderUtils.getOptions(this)
  const cb = this.async()
  babel.transform(source, {
    ...options,
    sourceMap: true,
    filename: this.resourcePath.split('/').pop()
  }, (error, result) => {
    cb(error, result.code, result.map) // 异步
  })
}
loader.pitch = function() {}
module.exports = loader
```

### 入口文件
`src/index.js`

```javascript
console.log('webpack loader')
// const str = require(`inline-loader!./inline.js`)
class Person {
  constructor(name) {
    this.name = name
  }
  getName() {
    return this.name
  }
}
const p = new Person('test')
const name = p.getName()
console.log(name)
```

### 测试
```javascript
nmp run dev
```

<!-- 这是一张图片，ocr 内容为：1n002-1691 AEN GHHNNSHEHENESWARENSMHOUIML aitHLneTEeaffoROA..AAHFLoA CONEOYHERENENXL8BL83 HIgIGMEHOMtheChromE7Upd61e NOwCSSGrddebuggingtools DetugandrapeccssodwtewsGddeouoon NewWtBAuthntab EMUALIGRCAORADDRTUWAHcaonAP LheneaWirbauanhn[ad. Movetodlsbetweentopandbotompsnel MOvELDDBADTOaKBATACNthETOPaNdLOMPArEL Elementspanelupdatee -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607603802978-15aa177f-1565-4f89-ab47-24141153f191.png)

### 参考
[@babel/core · Babel 中文网](https://www.babeljs.cn/docs/babel-core#transform)



[loader API | webpack 中文网](https://www.webpackjs.com/api/loaders/)



## 六、banner-loader实现
### 安装依赖
```javascript
cnpm i -D schema-utils
```

### 配置文件
`webpack.config.js`

```javascript
const path = require('path')
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  // 解析 webpack 的 loader 包
  resolveLoader: {
    // 告诉 webpack 解析模块时应该搜索的目录
    modules: ["node_modules", path.resolve(__dirname, "loaders")]
  },
  devtool: 'source-map',
  watch: true,
  module: {
    // !注意：loader顺序问题，从右到左，从下到上
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env'
              ]
            }
          },
          {
            loader: 'banner-loader',
            options: {
              text: 'test',
              filename: path.resolve(__dirname, 'src', 'template', 'banner.js')
            }
          }
        ]
      }
    ]
  }
}
```

### laoder文件
`loaders/banner-loader.js`

```javascript
const loaderUtils = require('loader-utils')
const { validate } = require('schema-utils')
const fs = require('fs')
function loader(source) {
  // this => loader context
  this.cacheable && this.cacheable() // 设置是否可缓存标志,默认是true有缓存
  const options = loaderUtils.getOptions(this)
  const cb = this.async()
  let schema = {
    type: 'object',
    properties: {
      text: {
        type: 'string'
      },
      filename: {
        type: 'string'
      }
    }
  }
  validate(schema, options, 'banner-loader')
  if(options.filename) {
    // 添加文件依赖, filename 文件改变，会重新打包
    this.addDependency(options.filename)
    fs.readFile(options.filename, 'utf-8', (error, data) => {
      cb(error, `/**${data}**/${source}`)
    })
  } else {
    cb(null, `/**${options.text}**/${source}`)
  }
}
module.exports = loader
```

### 测试文件
`src/template/banner.js` 

```javascript
robin by 2020-12-10 21:00
```

### 测试
```javascript
nmp run dev
```

<!-- 这是一张图片，ocr 内容为：bundlejswebpack-loader-source bundle.is EXPLORER <function> OPENEDITORS function>[O] dist> Person bundle.js t/webpackBootstrap ***丰 bundlejsdist 中****/ "use strict": WEBPACK-LOADER-SOURCE 中十市市本中市家中中! dist 竖***src/index.j* bundle.js 环*本冰木环市冰*冰冰木市冰本*木 好 bundle.js.map index.html classcattcheck(instancenu function oaders b-loader.js defineProperties(targetorr function <props.Length; 11 babel-loader.js function CREateCLassCConstructoRooo banner-loaderjs nO inline-loader.js 中 202012-1021:00** /**robinby20 nodemodules ConststrequireCinline-loaderl./intine Cuwautcrtugiwcbpacn-toadcooo 16 *#PURE/funcTiON varPerson template functionPerson(name) bannerjs JNNYNMH6 classCalichecklthis,Person) index-js Inlinejs this.nameaname; gitignore package.json createclass(Person,[t webpack.config-js KEy:"getName" funcTIONgeTNaMe0 value: returnthis.name H): 品沙 returnPerson 0: varp-newPeRson('test"; vaRnameEP-GETNANeO OUTLINE console.log(name): )) TIMELINE 中实*** PrettierYCompileHero:Off Port:5500 ?0A0 Javascript 1.31KiB bundle.js ESLINT javascript -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607606230040-7024a0f4-f3ae-47e5-b3b8-49acad2e8519.png)



### 参考
[schema-utils](https://www.npmjs.com/package/schema-utils)



## 七、file-loader实现
### 配置文件
`webpack.config.js`

```javascript
const path = require('path')
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  // 解析 webpack 的 loader 包
  resolveLoader: {
    // 告诉 webpack 解析模块时应该搜索的目录
    modules: ["node_modules", path.resolve(__dirname, "loaders")]
  },
  devtool: 'source-map',
  watch: true,
  module: {
    // !注意：loader顺序问题，从右到左，从下到上
    rules: [
      {
        test: /\.png$/,
        use: [
          'file-loader'
        ]
      },
      {
        test: /\.js$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env'
              ]
            }
          },
          {
            loader: 'banner-loader',
            options: {
              text: 'test',
              filename: path.resolve(__dirname, 'src', 'template', 'banner.js')
            }
          }
        ]
      }
    ]
  }
}
```

### laoder文件
`loaders/file-loader.js`

```javascript
const loaderUtils = require('loader-utils')
// 目的就是根据图片生成一个md5，发射到输出目录下，file-loader还会返回当前的图片路径
function loader(source) {
  // 生成一个md5
  const filename = loaderUtils.interpolateName(this, '[hash].[ext]', {
    content: source
  })
  console.log(filename)
  this.emitFile(filename, source) // 发射文件
  return `module.exports = "${filename}"`
}
loader.raw = true // 二进制
module.exports = loader
```

### 入口文件
`src/index.js`

```javascript
console.log('webpack loader')
// const str = require(`inline-loader!./inline.js`)
class Person {
  constructor(name) {
    this.name = name
  }
  getName() {
    return this.name
  }
}
const p = new Person('test')
const name = p.getName()
console.log(name)

// image
import pic from './assets/logo.png'
const img = document.createElement('img')
img.src = pic
document.body.appendChild(img)

```

### 测试
```javascript
nmp run dev
```

<!-- 这是一张图片，ocr 内容为：2hc05n Tcp 叫rs民婚快串 GDAiAI niRektaacbire .LORdSourcGH+D[oaLantLoxdent 竖 HHE NECSSGRDDEBUOGNgtAd3 DebugandnpectcssGdwihthenetcssGo.tuggng NOwEMObAUthnTB EMUAEnConODeOugLHeWEDAUntTonA themwMeaAutihntab. MovEtaoksbotyroontopandbattompanel MovetookhDayToobbotowenthetopwdbottompanel. Eamantspanelupdatos -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607611931771-80156a9e-e06f-4da5-90d0-e2499e06f814.png)

### 参考
[file-loader | webpack 中文网](https://www.webpackjs.com/loaders/file-loader/)



## 八、url-loader实现
### 安装依赖
```javascript
cnpm i -D mime 
```

### 配置文件
`webpack.config.js`

```javascript
const path = require('path')
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  // 解析 webpack 的 loader 包
  resolveLoader: {
    // 告诉 webpack 解析模块时应该搜索的目录
    modules: ["node_modules", path.resolve(__dirname, "loaders")]
  },
  devtool: 'source-map',
  watch: true,
  module: {
    // !注意：loader顺序问题，从右到左，从下到上
    rules: [
      {
        test: /\.png$/,
        use: [
          // 'file-loader'
          {
            // url-loader会调用
            loader: 'url-loader',
            options: {
              limit: 200 * 1024
            }
          }
        ]
      },
      {
        test: /\.js$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env'
              ]
            }
          },
          {
            loader: 'banner-loader',
            options: {
              text: 'test',
              filename: path.resolve(__dirname, 'src', 'template', 'banner.js')
            }
          }
        ]
      }
    ]
  }
}
```



### laoder文件
`loaders/url-loader.js`

```javascript
const loaderUtils = require('loader-utils')
const mime = require('mime')
function loader(source) {
  const { limit } = loaderUtils.getOptions(this)
  if(limit && limit > source.length) {
    return `module.exports = "data:${mime.getType(this.resourcePath)};base64,${source.toString('base64')}"`
  } else {
    // 自动调用file-loader
    return require('./file-loader').call(this, source)
  }
}
loader.raw = true
module.exports = loader
```

### 测试
```javascript
nmp run dev
```

<!-- 这是一张图片，ocr 内容为：rrincaici GaCodeifnjectadbyLvVEaen dvL0*oarelctiugstvtedwtwwwoltontoo DOIBABSPRIRsATPETAEERHILAY scc1 CAREELSWHATGNANXONN NewCSSGoabuggingtools DITIAnDRpoCSGhGrtoging NEWWEBAUThRtab EuTeathanticoranddabuguI Mowetodlsberyreentopandbattompanel MovEtooLinDaVTedLBLnhopadbatomnel. Elementspinelupdates -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607613160764-cc545689-02d3-4ce8-a6c1-1ed60838096b.png)

### 参考
[url-loader | webpack 中文网](https://www.webpackjs.com/loaders/url-loader/)



## 九、less-loader实现
### 安装依赖
```javascript
cnpm i -D less
```

### 配置文件
`webpack.config.js`

```javascript
const path = require('path')
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  // 解析 webpack 的 loader 包
  resolveLoader: {
    // 告诉 webpack 解析模块时应该搜索的目录
    modules: ["node_modules", path.resolve(__dirname, "loaders")]
  },
  devtool: 'source-map',
  watch: true,
  module: {
    // !注意：loader顺序问题，从右到左，从下到上
    rules: [
      {
        test: /\.less/,
        use: [
          'style-loader',
          'css-loader',
          'less-loader'
        ]
      },
      {
        test: /\.png$/,
        use: [
          // 'file-loader'
          {
            // url-loader会调用
            loader: 'url-loader',
            options: {
              limit: 200 * 1024
            }
          }
        ]
      },
      {
        test: /\.js$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env'
              ]
            }
          },
          {
            loader: 'banner-loader',
            options: {
              text: 'test',
              filename: path.resolve(__dirname, 'src', 'template', 'banner.js')
            }
          }
        ]
      }
    ]
  }
}
```

### laoder文件
`loaders/less-loader.js`

```javascript
const less = require('less')
function loader(source) {
  let css
  less.render(source, (error, r) => {
    css = r.css
  })
  return css
}
module.exports = loader
```

### less文件
`src/index.less` 

```less
@color: palegoldenrod;
body {
  background-color: @color;
}
```

### 入口文件
`src/index.js` 

```javascript
console.log('webpack loader')
// const str = require(`inline-loader!./inline.js`)
class Person {
  constructor(name) {
    this.name = name
  }
  getName() {
    return this.name
  }
}
const p = new Person('test')
const name = p.getName()
console.log(name)

// image
import pic from './assets/logo.png'
const img = document.createElement('img')
img.src = pic
document.body.appendChild(img)

// less
import './index.less'
```

### 参考
[Less 快速入门 | Less.js 中文文档 - Less 中文网](https://less.bootcss.com/)



## 十、css-loader实现
### 配置文件
`webpack.config.js`

```javascript
const path = require('path')
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  // 解析 webpack 的 loader 包
  resolveLoader: {
    // 告诉 webpack 解析模块时应该搜索的目录
    modules: ["node_modules", path.resolve(__dirname, "loaders")]
  },
  devtool: 'source-map',
  watch: true,
  module: {
    // !注意：loader顺序问题，从右到左，从下到上
    rules: [
      {
        test: /\.less/,
        use: [
          'style-loader',
          'css-loader',
          'less-loader'
        ]
      },
      {
        test: /\.png$/,
        use: [
          // 'file-loader'
          {
            // url-loader会调用
            loader: 'url-loader',
            options: {
              limit: 5 * 1024
            }
          }
        ]
      },
      {
        test: /\.js$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env'
              ]
            }
          },
          {
            loader: 'banner-loader',
            options: {
              text: 'test',
              filename: path.resolve(__dirname, 'src', 'template', 'banner.js')
            }
          }
        ]
      }
    ]
  }
}
```

### laoder文件
`loaders/css-loader.js`

```javascript
function loader(source) {
  const reg = /url\((.+?)\)/g
  let pos = 0
  let current // [matchUrl, g]
  let arr = ['let list = []']
  while(current = reg.exec(source)) {
    const [marchUrl, g] = current
    let last = reg.lastIndex - marchUrl.length
    arr.push(`list.push(${JSON.stringify(source.slice(pos, last))})`)
    pos = reg.lastIndex
    // 把g替换成require的写法
    arr.push(`list.push('url('+require(${g})+')')`)
  }
  arr.push(`list.push(${JSON.stringify(source.slice(pos))})`)
  arr.push(`module.exports = list.join('')`)
  return arr.join('\r\n')
}
module.exports = loader
```

### less文件
`src/index.less`

```less
@color: palegoldenrod;
body {
  background-color: @color;
  background: url('./assets/logo.png') no-repeat;
  color: @color;
}
```

### 测试
```javascript
nmp run dev
```



<!-- 这是一张图片，ocr 内容为：WtarifgviaocricontengenidthJie :urL126b48670465 5/5165 styletype-"text/cssoc/styles saL中 LOVSUREWEETTONRARAS Sm1lrG HOU+E AOmMSTCBNGBRNCTOROFSHAS eLerent.ssylel UERSUWUTSLYLEANM styie HENIgREsTonT.CHmRJwupdate NewCSSGrddabugglngtools DabugandnsoectcssGrdanwdb NEwWebAuthntab FAuLTGAuthontcotorsandoctuHnAlh LeNWieOAuTnntAo. MaveLoplyhnDewToolbelweenthetopandbolampanel. ELETenspaneLupdates -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607651249919-5155398a-801a-489b-a712-76c8c74af317.png)



## 十一、style-loader实现
### 配置文件
`webpack.config.js`

```javascript
const path = require('path')
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  // 解析 webpack 的 loader 包
  resolveLoader: {
    // 告诉 webpack 解析模块时应该搜索的目录
    modules: ["node_modules", path.resolve(__dirname, "loaders")]
  },
  devtool: 'source-map',
  watch: true,
  module: {
    // !注意：loader顺序问题，从右到左，从下到上
    rules: [
      {
        test: /\.less/,
        use: [
          'style-loader',
          'css-loader',
          'less-loader'
        ]
      },
      {
        test: /\.png$/,
        use: [
          // 'file-loader'
          {
            // url-loader会调用
            loader: 'url-loader',
            options: {
              limit: 200 * 1024
            }
          }
        ]
      },
      {
        test: /\.js$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env'
              ]
            }
          },
          {
            loader: 'banner-loader',
            options: {
              text: 'test',
              filename: path.resolve(__dirname, 'src', 'template', 'banner.js')
            }
          }
        ]
      }
    ]
  }
}
```

### laoder文件
`loaders/style-loader.js`

```javascript
const loaderUtils = require('loader-utils')
function loader(source) {
  let style = 
  `
    let style = document.createElement('style')
    style.innerHTML = ${JSON.stringify(source)}
    document.head.appendChild(style)
  `
  return style
}
// 在style-loader上写了pitch
// style-loader css-loader!less-loader!./index.less
loader.pitch = function(remainingRequest) { // remainingRequest 剩余的请求
  // 让style-loader去处理css-loader!less-loader!./index.less
  // require路径返回的就是css-loader处理好的结果：
  // require('!!css-loader!less-loader!index.less')
  let style = 
  `
    let style = document.createElement('style')
    style.innerHTML = require(${loaderUtils.stringifyRequest(this, '!!' + remainingRequest)})
    document.head.appendChild(style)
  `
  return style
}
module.exports = loader
```

### 测试
```javascript
nmp run dev
```

<!-- 这是一张图片，ocr 内容为：TETaARSETAUITN 址tytypa-text/c tetpetet/ Hignlyhtytomtgcnon月87po6lc NOTCSSGRNDDCTUGGINGTOOls DBUgANDspectcSSGtbooing NewWEbAuRhntab EriulhateauthenticastoeainddetugthebauthA thenerwWabAuthntao. MONEIOSINDEYTOOLSDERAEENLNELOPANDBOROMPEREL Elamantapaneupdato3 -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607614762197-3fb15bf5-66dd-4dcf-8430-e2ad33066252.png)





## 参考
[loader | webpack 中文网](https://www.webpackjs.com/concepts/loaders/)





