# 概述
> 全称node package manager是世界上最大规模的包管理系统,官网是这样介绍的 _Build amazing things_...
>

+ <font style="color:rgb(51, 51, 51);">在Node.js中，可以通过包来对一组具有相互依赖关系的模块进行统一管理，通过包可以把某个独立功能封装起来 每个项目的根目录下面，一般都有一个package.json文件，定义了这个项目所需要的各种模块，以及项目的配置信息（比如名称、版本、许可证等元数据）。npm install命令根据这个配置文件，自动下载所需的模块，也就是配置项目所需的运行和开发环境</font>

| **<font style="color:rgb(51, 51, 51);">项目</font>** | **<font style="color:rgb(51, 51, 51);">描述</font>** |
| :--- | :--- |
| <font style="color:rgb(51, 51, 51);">name</font> | <font style="color:rgb(51, 51, 51);">项目名称</font> |
| <font style="color:rgb(51, 51, 51);">version</font> | <font style="color:rgb(51, 51, 51);">版本号</font> |
| <font style="color:rgb(51, 51, 51);">description</font> | <font style="color:rgb(51, 51, 51);">项目描述</font> |
| <font style="color:rgb(51, 51, 51);">keywords: {Array}</font> | <font style="color:rgb(51, 51, 51);">关键词，便于用户搜索到我们的项目</font> |
| <font style="color:rgb(51, 51, 51);">homepage</font> | <font style="color:rgb(51, 51, 51);">项目url主页</font> |
| <font style="color:rgb(51, 51, 51);">bugs</font> | <font style="color:rgb(51, 51, 51);">项目问题反馈的Url或email配置</font> |
| <font style="color:rgb(51, 51, 51);">license</font> | <font style="color:rgb(51, 51, 51);">项目许可证</font> |
| <font style="color:rgb(51, 51, 51);">author,contributors</font> | <font style="color:rgb(51, 51, 51);">作者和贡献者</font> |
| <font style="color:rgb(51, 51, 51);">main</font> | <font style="color:rgb(51, 51, 51);">主文件</font> |
| <font style="color:rgb(51, 51, 51);">bin</font> | <font style="color:rgb(51, 51, 51);">项目用到的可执行文件配置</font> |
| <font style="color:rgb(51, 51, 51);">repository</font> | <font style="color:rgb(51, 51, 51);">项目代码存放地方</font> |
| <font style="color:rgb(51, 51, 51);">scripts</font> | <font style="color:rgb(51, 51, 51);">声明一系列npm脚本指令</font> |
| <font style="color:rgb(51, 51, 51);">dependencies</font> | <font style="color:rgb(51, 51, 51);">项目在生产环境中依赖的包</font> |
| <font style="color:rgb(51, 51, 51);">devDependencies</font> | <font style="color:rgb(51, 51, 51);">项目在生产环境中依赖的包</font> |
| <font style="color:rgb(51, 51, 51);">peerDependencies</font> | <font style="color:rgb(51, 51, 51);">应用运行依赖的宿主包</font> |


+ [package.json | npm Docs](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/)
+ [package.json文件 -- JavaScript 标准参考教程（alpha）](http://javascript.ruanyifeng.com/nodejs/packagejson.html)

# <font style="color:rgb(51, 51, 51);">npm命令</font>
## 初始化
```shell
npm init -y
```

+ 默认大家肯定比较熟悉了，直接 `npm init -y`了事，这回我们再来仔细看看

```json
{
  "name": "my-pack",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {},
  "license": "ISC"
}
```

+ 这里先声明的 `npm`  版本是**6.14.4**,因为我的 `node` 版本是**v12.16.2**
+ 咱们来一个个说说这里比较重要的字段:`name`、`version`、`main`、`scripts`、`license`
    - `name` 是当前包的名字，也就是最终发布的 `npm` 官网上包的名字。不能和已有的包重名哦
    - `version` 就是当前包的版本号，主要我们要探究如果优雅的管理版本号
    - `main` 就是当前包的入口文件，也就是使用**require**默认引入的文件
    - `scripts` 可以配置一些执行脚本
    - `license` 协议许可

## 安装包
### 全局安装
```shell
npm install http-server -g
```

+ 全局安装的意思很简单,就是安装的模块会被安装到全局下，可以在命令行中直接使用安装的包,其实只是在 **/user/local/bin** **目录下作了个链接连接到 /usr/local/lib/node_modules/http-server/bin/http-server这个文件，当我们执行 http-server **这个命令时，会调用链接的这个文件。
+ `mac` 因为有权限问题，这里我们加 `sudo` 来执行命令
+ 我们可以自己来尝试写一个包 ,创建 `bin` 目录，新增 `www` 文件,名字叫什么无所谓~

```javascript
#! /usr/bin/env node
console.log('test npm'); // #! 这句表示采用node来执行此文件，同理 shell可以表示 sh
```

+ 更新 `package.json` 文件

```json
"bin": {
	"my-pack":"./bin/www" // 这里要注意名字和你建立的文件夹相同
},
```

+ 好啦，写好啦！这里我们先不说发包的事，先用一个常用的命令，他可以实现链接的功能

```shell
npm link
```

+ 这样我们在命令行中直接输入 `my-pack` 就可以 打印出**test npm。**

### 本地安装
```shell
npm install webpack --save-dev
```

+ 本地安装很好理解啦~ 就是所谓的在项目中使用，而非在命令行中使用！这里我们看到生成了一个**package-lock.json文件**，而且将安装的模块放到了**node_modules**下,而且 `json` 中也新增了些内容

```json
"devDependencies": {
    "webpack": "^4.39.3"
}
```

+ 这里我们先来简单介绍下基本的使用
+ `--save-dev`代表当前依赖只在开发时被应用,如果默认不写相当于 `--save`为项目依赖开发上线都需要
+ 也可以指定版本号来安装包

```shell
npm i jquery@2.2.0 # install可以简写成i
```

+ 默认执行`npm i`会安装项目中所需要的依赖,如果只想安装生产环境依赖可以增加`--production`参数

## <font style="color:rgb(51, 51, 51);">卸载包</font>
```bash
npm uninstall <package name>
```

## <font style="color:rgb(51, 51, 51);">更新包</font>
+ <font style="color:rgb(51, 51, 51);">我们还可以通过以下指令更新已经安装的包</font>

```bash
npm update <package name>
```

# <font style="color:rgb(51, 51, 51);">注册、登录</font>
## <font style="color:rgb(51, 51, 51);">注册</font>
+ [npm | Home](https://www.npmjs.com/)

## <font style="color:rgb(51, 51, 51);">登录</font>
```plain
npm login
```

# 包的发布
+ 包的发布比较简单，首先我们需要先切换到官方源,这里推荐个好用的工具 `nrm` 

```shell
npm install nrm -g
nrm use npm # 切换到官方源
```

+ 之后更新名字哈，这里也可以发布 [作用域包](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages) 选定版本后,忽略文件夹可以使用 `.npmignore`,一切就绪后，发布！！！

```shell
npm publish
```

+ `ok` ，我们的包就可以成功的发布到 `npm` 上啦~

# package-lock文件
+ 自 `npm 5` 之后所有的依赖包都采用扁平化管理的方式
+ `package-lock.json` 的作用是锁定依赖安装结构,保证在任意机器上执行 `npm install`  都会得到完全相同的 `node_modules` 结果,因为`package-lock.json`存储所有安装的信息。

```json
"name": "my-pack",
"version": "1.0.0",
"lockfileVersion": 1,
"requires": true,
"dependencies": {
"@webassemblyjs/ast": { 
    "version": "1.8.5", // 当前依赖的版本
    "resolved": "https://registry.npm.taobao.org/@webassemblyjs/ast/download/@webassemblyjs/ast-1.8.5.tgz", // 从哪个渠道安装的
    "integrity": "sha1-UbHF/mV2o0lTv0slPfnw1JDZ41k=", // 内容hash
    "dev": true,
    "requires": {
      "@webassemblyjs/helper-module-context": "1.8.5",
      "@webassemblyjs/helper-wasm-bytecode": "1.8.5",
      "@webassemblyjs/wast-parser": "1.8.5"
    }
},
....
```

+ 如果手动更新了`package.json`文件,执行安装命令会下载对应的新版本,并且会自动更新 `lock` 文件~

# 依赖方式
+ 简单介绍下常见的依赖方式：

## dependencies 项目依赖
+ 可以使用`npm install -S` 或 `npm install --save`保存到依赖中，当发布到 `npm` 上时 `dependencies` 下的模块会作为依赖，一起被下载!

## devDependencies 开发依赖
+ 可以使用`npm install -D` 或 `npm install --save-dev`保存到依赖中。 当发布到 `npm` 上时 `devDependencies` 下面的模块就不会自动下载了,如果只是单纯的开发项目 `dependencies,devDependencies` 只有提示的作用!

## peerDependencies 同版本依赖
+ 同等依赖,如果你安装我，那么你最好也安装我对应的依赖，如果未安装会报出警告 `bash "peerDependencies": { "jquery": "2.2.0" }`

> npm WARN youxuan@1.0.0 requires a peer of jquery@2.2.0 but none is installed. You must install peer dependencies yourself.
>

## bundledDependencies 捆绑依赖
```json
"bundleDependencies": [
    "jquery"
 ],
```

+ 使用`npm pack` 打包 `tgz` 时会将捆绑依赖一同打包

## optionalDependencies 可选依赖
+ 如果发现无法安装或无法找到，不会影响 `npm` 的安装

# npm版本管理
+ `npm` 采用了 `semver` 规范作为依赖版本管理方案。 `semver`  约定一个包的版本号必须包含3个数字
+ `MAJOR.MINOR.PATCH` 意思是 `主版本号.小版本号.修订版本号`
    - `MAJOR` 对应大的版本号迭代，做了不兼容旧版的修改时要更新 MAJOR 版本号
    - `MINOR` 对应小版本迭代，发生兼容旧版API的修改或功能更新时，更新MINOR版本号
    - `PATCH` 对应修订版本号，一般针对修复 BUG 的版本号
+ 当我们每次发布包的时候都需要升级版本号

```shell
npm version major  # 大版本号加 1，其余版本号归 0
npm version minor  # 小版本号加 1，修订号归 0
npm version patch  # 修订号加 1
```

+ 如果使用git管理项目会自动 `git tag` 标注版本号
+ 来看看版本号的标识含义:

| range | 含义 | 例 |
| --- | --- | --- |
| `^2.2.1` | 指定的 MAJOR 版本号下, 所有更新的版本 | 匹配 `2.2.3`<br/>, `2.3.0`<br/>; 不匹配 `1.0.3`<br/>, `3.0.1` |
| `~2.2.1` | 指定 MAJOR.MINOR 版本号下，所有更新的版本 | 匹配 `2.2.3`<br/>, `2.2.9`<br/> ; 不匹配 `2.3.0`<br/>, `2.4.5` |
| `>=2.1` | 版本号大于或等于 `2.1.0` | 匹配 `2.1.2`<br/>, `3.1` |
| `<=2.2` | 版本号小于或等于 `2.2` | 匹配 `1.0.0`<br/>, `2.2.1`<br/>, `2.2.11` |
| `1.0.0 - 2.0.0` | 版本号从 1.0.0 (含) 到 2.0.0 (含) | 匹配 `1.0.0`<br/>, `1.3.4`<br/>, `2.0.0` |


+ 预发版：
    - `alpha(α)`：预览版，或者叫内部测试版；一般不向外部发布，会有很多 `bug` ；一般只有测试人员使用。
    - `beta(β)`：测试版，或者叫公开测试版；这个阶段的版本会一直加入新的功能；在 `alpha` 版之后推出。
    - `rc(release candidate)`：最终测试版本；可能成为最终产品的候选版本，如果未出现问题则可发布成为正式版本。
+ `2.1.0-beta.1`这样声明的版本用户不会立马使用，可以用来做测试使用

# scripts配置
+ 在 `package.json` 中可以定义自己的脚本通过_npm run_来执

```shell
"scripts": {
   "hello": "echo hello",
   "build": "webpack"
}
```

+ 我们可以使用 `npm run hello`执行脚本,也可以使用 `npm run build`执行`node_modules/.bin`目录下的 `webpack` 文件
    - `npm run` 命令执行时，会把 `./node_modules/.bin/` 目录添加到执行环境的 `PATH` 变量中，因此如果某个**命令行包**未全局安装，而只安装在了当前项目的 `node_modules` 中，通过 `npm run` 一样可以调用该命令。
    - 执行 `npm` 脚本时要传入参数，需要在命令后加 `--` 标明, 如 `npm run hello --port 3000` 可以将 `--port` 参数传给`hello` 命令
    - `npm`  提供了 `pre`  和 `post`  两种钩子机制，可以定义某个脚本前后的执行脚本,没有定义默认会忽略

```shell
"scripts": {
   "prehello":"echo prehello",
   "hello": "echo hello",
   "posthello":"echo posthello"
}
```

+ 可以通过打印`全局env`和 在项目下执行`npm run env`来对比`PATH`属性，不难发现在执行 `npm run`  的时候确实会将 `./node_modules/.bin/` 目录添加到`PATH中`

# 协议
<!-- 这是一张图片，ocr 内容为：http://www.ruanyifeng.com/blog/ Cc-By-3.0/2011.5.2 他人修改源码后, 是否可以闭源? Yes No 新增代码是否采用 同样许可证? 每一个修改过的文 件,是否都必须放置 版权说明? No Yes Yes NO 是否需要对源码的 衍生软件的广告, 修改之处,提供说 是否可以用你的名 明文档? 字促销? Yes No NO Yes Mozilla许可证 GPL许可证 BSD许可证 MIT许可证 Apache许可证 LGPL许可证 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1613628690446-36b4f879-bb35-4df6-99d3-ac997cc303ed.png)

+ 不废话，这张图就说明了为什么 `MIT` 许可是最大的了!

# npx用法
+ `npx` 命令是 `npm v5.2` 之后引入的新命令， `npx` 可以帮我们直接执行`node_modules/.bin`文件夹下的文件

## 执行脚本
```shell
npx webpack
```

+ 是不是省略了配置`scripts`脚本啦！

## 避免安装全局模块
+ 全局安装的模块会带来很多问题，例如：多个用户全局安装的模块版本不同

```plain
npx create-react-app react-project
```

+ 我们可以直接使用 `npx` 来执行模块，它会先进行安装，安装执行后会将下载过的模块删除~，这样可以一直使用最新版本啦~

## 参数
### <font style="color:rgb(51, 51, 51);">--no-install </font>
+ <font style="color:rgb(51, 51, 51);">如果想让 npx 强制使用本地模块，不下载远程模块，可以使用</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">--no-install</font>`<font style="color:rgb(51, 51, 51);">参数。如果本地不存在该模块，就会报错</font>

### <font style="color:rgb(51, 51, 51);">--ignore-existing </font>
+ <font style="color:rgb(51, 51, 51);">反过来，如果忽略本地的同名模块，强制安装使用远程模块，可以使用</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">--ignore-existing</font>`<font style="color:rgb(51, 51, 51);">参数</font>

# pnpm
+ [Fast, disk space efficient package manager | pnpm](https://pnpm.io/zh/)

## **pnpm 关键要点**
### 🔹 **pnpm 是什么？**
+ pnpm（Performant npm）是一款高效的 Node.js 包管理器，相比于 npm 和 yarn，具有更快的安装速度和更高的磁盘利用率。它通过符号链接和内容寻址存储优化了依赖管理。

### 🔹 **核心特性**
+ 共享依赖（Content Addressable Storage）
    - 依赖存储在 `~/.pnpm-store` 目录中，所有项目共享相同的依赖版本，避免重复下载和存储。
+ 符号链接（Symlink）机制
    - `node_modules` 目录中的依赖是指向全局存储的符号链接，避免重复安装。
+ 严格模式
    - 依赖解析更加严格，确保 `node_modules` 目录结构更加稳定，不易出现幽灵依赖问题。
+ 支持 monorepo
    - 兼容 `workspace`，适合大型项目管理。
+ 增量安装
    - 只下载和更新必要的部分，速度更快。

### 软连接和硬连接
| **特性** | **软连接（Symbolic Link）** | **硬链接（Hard Link）** |
| --- | --- | --- |
| **pnpm 使用场景** | `node_modules`<br/> 目录下的依赖管理 | `pnpm store`<br/> 内部的文件存储 |
| **作用** | 让 `node_modules`<br/> 目录指向全局依赖，减少磁盘占用 | 共享相同文件，避免重复存储 |
| **跨文件系统支持** | ✅ 可以跨分区、跨磁盘 | ❌ 不能跨文件系统 |
| **删除影响** | 删除原文件后，软连接失效 | 删除某个硬链接，其他硬链接仍然可以访问 |


🔹 总结来说：

+ **<font style="color:#DF2A3F;">pnpm 使用软连接 让 </font>**`**<font style="color:#DF2A3F;">node_modules</font>**`**<font style="color:#DF2A3F;"> 指向 </font>**`**<font style="color:#DF2A3F;">pnpm store</font>**`**<font style="color:#DF2A3F;">，减少磁盘占用。</font>**
+ **<font style="color:#DF2A3F;">pnpm 使用硬链接 在 </font>**`**<font style="color:#DF2A3F;">store</font>**`**<font style="color:#DF2A3F;"> 内部优化存储，使相同的文件不会重复占用空间。</font>**

> 💡 这就是 pnpm 为什么比 npm/yarn 更节省磁盘空间、更快的原因！ 🚀
>

## **2. pnpm 使用注意事项**
### ⚠ **常见问题**
+ 不兼容 `require.resolve()`
    - 由于 `pnpm` 采用符号链接的方式管理 `node_modules`，某些依赖查找方式可能会失败，需要使用 `import.meta.resolve()`。
+ 包查找路径不同
    - `pnpm` 采用严格的依赖解析，不同于 npm 的扁平化 `node_modules` 结构，可能导致某些库找不到 `peerDependencies`。
+ `shamefully-hoist` 选项
    - 部分旧的 npm 生态库（如 `webpack` 的某些插件）可能因为 `node_modules` 结构变化而无法找到依赖，可以启用 `shamefully-hoist=true` 进行兼容。
+ 符号链接导致路径问题
    - 某些工具（如 `jest`）可能无法正确解析符号链接的路径，可能需要手动调整配置。

### ⚠ **迁移 npm/yarn 到 pnpm**
```bash
pnpm import # 读取 package-lock.json / yarn.lock 并转换为 pnpm-lock.yaml
```

## **3. 面试常见考点**
### ✅ **基础概念**
1. _<font style="color:#DF2A3F;">pnpm 相比 npm/yarn 的核心优势是什么？</font>_

| 特性 | npm | yarn | pnpm |
| --- | --- | --- | --- |
| **安装速度** | 较慢 | 快 | **最快**（增量安装 + 共享依赖） |
| **磁盘占用** | 高（每个项目存一份） | 高 | **低（全局共享存储）** |
| **依赖管理方式** | 扁平化 `node_modules` | 类似 npm | **符号链接 + 严格依赖解析** |
| **Monorepo 支持** | 有 | **强（yarn workspaces）** | **更强（pnpm workspaces）** |


    - 🔹 **pnpm 优势**
        * **磁盘复用**：全局存储依赖，只创建符号链接，避免重复占用磁盘。
        * **安装更快**：增量安装，仅下载缺失的部分。
        * **严格依赖解析**：避免幽灵依赖问题，防止错误调用 `peerDependencies`。
2. _<font style="color:#DF2A3F;">pnpm 为什么使用符号链接？如何提高磁盘利用率？</font>_
    - **传统 npm/yarn**：每个项目的 `node_modules` 都包含完整的依赖，导致重复存储和下载。
    - **pnpm 采用符号链接机制**： 
        * 依赖统一存放在 `~/.pnpm-store` 目录。
        * `node_modules` 里不是真正的文件，而是符号链接指向全局存储。
        * **结果**：相同的包不会重复下载，提高磁盘利用率和安装速度。
    - **示例**

```bash
ls -l node_modules/react
# -> 指向 ~/.pnpm-store/v3/files/...
```

3. _<font style="color:#DF2A3F;">pnpm 如何保证不同项目共享相同的依赖？</font>_
+ 通过 **内容寻址存储（Content Addressable Storage）** 机制： 
    - 所有依赖存放在 `~/.pnpm-store` 目录。
    - **相同版本的依赖** 仅存储一次，所有项目共享。
    - **提升安装速度**，节省磁盘空间。

### ✅ **技术细节**
1. _<font style="color:#DF2A3F;">pnpm 如何处理 </font>_`_<font style="color:#DF2A3F;">peerDependencies</font>_`_<font style="color:#DF2A3F;">？</font>_
    - **严格模式**：`peerDependencies` 不会自动安装，必须手动添加。
    - **npm/yarn**：如果 `peerDependencies` 未安装，可能隐式解析，导致幽灵依赖问题。
    - **pnpm 解决方案**
        * 遇到 `missing peer dependencies`，需要手动安装： 

```bash
pnpm add react@18 react-dom@18
```

        * 或者，使用 `shamefully-hoist` 让 `node_modules` 结构更接近 npm。
2. _<font style="color:#DF2A3F;">pnpm </font>_`_<font style="color:#DF2A3F;">store</font>_`_<font style="color:#DF2A3F;"> 目录作用是什么？如何影响包管理？</font>_
    - `store` 目录存放所有下载的依赖，路径一般是： 

```bash
~/.pnpm-store
```

    - 作用： 
        * **避免重复下载** 相同的依赖，提高安装速度。
        * **多个项目共享相同的依赖**，减少磁盘占用。
        * **支持离线安装**（即使删除 `node_modules`，仍可快速恢复）。
3. _<font style="color:#DF2A3F;">如何让 pnpm 兼容传统 npm 结构？（shamefully-hoist）</font>_
    - 默认情况下，pnpm 采用严格的 `node_modules` 结构，部分旧库可能无法找到依赖。
    - **解决方法**： 

```bash
pnpm install --shamefully-hoist
```

    - **作用**：让 `node_modules` 结构变得像 npm/yarn，某些老旧库可以正常运行。
4. _<font style="color:#DF2A3F;">pnpm 在 monorepo 场景下的优势？</font>_
    - **npm workspaces**：支持多个项目共享依赖，适合 monorepo 结构。
    - 主要优点： 
        * **所有包共享 **`**node_modules**`，减少重复安装。
        * **自动管理 **`**peerDependencies**`，避免版本冲突。
        * **独立 **`**lockfile**` 确保版本一致性。

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
  - "apps/*"
```

### ✅ **实际应用**
1. _<font style="color:#DF2A3F;">pnpm </font>_`_<font style="color:#DF2A3F;">lockfile</font>_`_<font style="color:#DF2A3F;">（</font>_`_<font style="color:#DF2A3F;">pnpm-lock.yaml</font>_`_<font style="color:#DF2A3F;">）如何保证一致性？</font>_
    - `pnpm-lock.yaml` 记录每个依赖的确切版本，确保跨团队安装时一致。
    - **与 npm/yarn 不同**： 
        * `pnpm` 采用**严格模式**，不会因为 `node_modules` 结构不同而导致幽灵依赖问题。
        * **CI/CD 更稳定**，不会因依赖解析不同导致构建失败。
2. _<font style="color:#DF2A3F;">pnpm 如何提升 CI/CD 速度？</font>_
    - **缓存 pnpm-store**

```yaml
cache:
  - ~/.pnpm-store
```

    - **使用 **`**pnpm install --frozen-lockfile**`** 确保一致性**
    - **增量安装** 只下载缺失的部分，大幅减少安装时间。
3. _<font style="color:#DF2A3F;">pnpm 在 monorepo 项目中的 workspace 配置？</font>_

```bash
pnpm init
pnpm init -w # 创建 monorepo
```

    - **示例配置**

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

    - **跨项目依赖**

```bash
pnpm add lodash -w # 安装到 workspace
pnpm add lodash --filter my-app # 仅安装到 my-app
```



## **4. pnpm 重要命令**
| 命令 | 作用 |
| --- | --- |
| `pnpm install` | 安装依赖（默认不会修改 `package.json`） |
| `pnpm add <pkg>` | 添加依赖 |
| `pnpm remove <pkg>` | 删除依赖 |
| `pnpm update` | 更新依赖 |
| `pnpm list` | 查看依赖 |
| `pnpm store path` | 查看存储路径 |
| `pnpm import` | 迁移 npm/yarn 到 pnpm |
| `pnpm link` | 本地链接包 |
| `pnpm exec <cmd>` | 运行命令 |
| `pnpm run <script>` | 运行 `package.json`<br/> 中的脚本 |


## **总结**
+ pnpm 通过符号链接和全局存储提高性能，减少重复下载和磁盘占用。
+ 严格依赖解析避免幽灵依赖，可能需要 `shamefully-hoist` 兼容部分老旧库。
+ 在 monorepo 场景下，pnpm 提供 `workspace` 支持，优化依赖管理。
+ 面试重点：pnpm 机制、依赖解析、monorepo 管理、peerDependencies 处理。

## 参考
[npm 模块安装机制简介 - 阮一峰的网络日志](https://www.ruanyifeng.com/blog/2016/01/npm-install.html)



[npm scripts 使用指南 - 阮一峰的网络日志](https://www.ruanyifeng.com/blog/2016/10/npm_scripts.html)



[npm模块管理器 -- JavaScript 标准参考教程（alpha）](https://javascript.ruanyifeng.com/nodejs/npm.html)



[npm 超详细教程](https://www.jianshu.com/p/b1ca85169f4a)

