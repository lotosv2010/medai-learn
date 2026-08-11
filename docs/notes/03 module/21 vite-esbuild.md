# <font style="color:rgb(51, 51, 51);">esbuild 介绍</font>
+ [<font style="color:rgb(51, 122, 183);">ESbuild</font>](https://esbuild.github.io/api/)<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">是一款基于 Golang 开发的一款打包工具，相比传统的打包工具，主打性能优势，在构建速度上可以快 10~100 倍</font>

<!-- 这是一张图片，ocr 内容为：JAVASCRIPT BENCHMARK ESBUILD 0.37S 1.54S ESBUILD(1 THREAD) 36.00S ROLLUP+TERSER 41.91S WEBPACK 4 54.50S WEBPACK 5 56.71S PARCEL 2 118.51S PARCEL1 OS 120S 30S 906 S09 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1749708652227-5742a207-5788-4ed2-8a3b-97e63c777c37.png)

# 基本使用
## <font style="color:rgb(51, 51, 51);">安装</font>
```shell
# mkdir esbuild-app
pnpm init
pnpm add esbuild -D
```

## package.json
```json
{
  "name": "esbuild-app",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "build": "node esbuild.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.5.2",
  "devDependencies": {
    "esbuild": "^0.25.5"
  }
}
```

## <font style="color:rgb(51, 51, 51);">使用</font>
### esbuild.js
```javascript
import esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  outfile: 'dist/main.js',
  format: 'esm'
}).catch(() => process.exit(1));
```

### <font style="color:rgb(51, 51, 51);">src</font>
#### <font style="color:rgb(51, 51, 51);">main.js</font>
```javascript
console.log("Hello ESBuild");
```

## 测试
```shell
pnpm build
```

### <font style="color:rgb(51, 51, 51);">dist</font>
#### <font style="color:rgb(51, 51, 51);">main.js</font>
```javascript
// src/main.js
console.log("Hello ESBuild");
```

# <font style="color:rgb(51, 51, 51);">内容类型</font>
+ [esbuild - Content Types](https://esbuild.github.io/content-types/#javascript)
+ <font style="color:rgb(51, 51, 51);">每个内容类型都有一个关联的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">加载器</font>`<font style="color:rgb(51, 51, 51);">，它告诉 esbuild 如何解释文件内容。默认情况下，某些文件扩展名已经为它们配置了加载器，尽管可以覆盖默认值</font>

## <font style="color:rgb(51, 51, 51);">src</font>
### <font style="color:rgb(51, 51, 51);">main.js</font>
```diff
+ import "./index";

console.log("Hello ESBuild");
```

### index.jsx
```jsx
const title = <h1>Hello World</h1>;

console.log(title);
```

## <font style="color:rgb(51, 51, 51);">esbuild.js</font>
```diff
import esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  outfile: 'dist/main.js',
+  loader: {
+    '.js': 'jsx'
+  },
  format: 'esm'
}).catch(() => process.exit(1));
```

# <font style="color:rgb(51, 51, 51);">plugin</font>
+ [esbuild - Plugins](https://esbuild.github.io/plugins/#finding-plugins)
+ [GitHub - esbuild/community-plugins: Community plugins for esbuild](https://github.com/esbuild/community-plugins)
+ <font style="color:rgb(51, 51, 51);">一个 esbuild 插件是一个包含 name 和 setup 函数的对象</font>
+ <font style="color:rgb(51, 51, 51);">它们以数组的形式传递给构建 API 调用,</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">setup</font>`<font style="color:rgb(51, 51, 51);">函数在每次</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">BUILD API</font>`<font style="color:rgb(51, 51, 51);">调用时都会运行一次</font>

## <font style="color:rgb(51, 51, 51);">命名空间</font>
+ <font style="color:rgb(51, 51, 51);">每个模块都有一个关联的命名空间。默认情况下，esbuild 在 file 命名空间中运行，该命名空间对应于文件系统上的文件</font>
+ <font style="color:rgb(51, 51, 51);">但是 esbuild 也可以处理在文件系统上没有对应位置的“虚拟”模块</font>
+ <font style="color:rgb(51, 51, 51);">插件可用于创建虚拟模块。虚拟模块通常使用命名空间而不是 file 将它们与文件系统模块区分开来,通常命名空间特定于创建它们的插件</font>

## <font style="color:rgb(51, 51, 51);">过滤器</font>
+ <font style="color:rgb(51, 51, 51);">每个回调都必须提供一个正则表达式作为过滤器。当路径与其过滤器不匹配时，esbuild 使用它来跳过调用回调</font>
+ <font style="color:rgb(51, 51, 51);">命名空间也可用于过滤。回调必须提供过滤正则表达式，但也可以选择提供命名空间以进一步限制匹配的路径</font>

## <font style="color:rgb(51, 51, 51);">Resolve 回调</font>
+ <font style="color:rgb(51, 51, 51);">使用添加的回调 onResolve 将在 esbuild 构建的每个模块中的每个导入路径上运行</font>
+ <font style="color:rgb(51, 51, 51);">回调可以自定义 esbuild 如何进行路径解析。例如，它可以拦截导入路径并将它们重定向到其他地方。它还可以将路径标记为外部</font>
+ <font style="color:rgb(51, 51, 51);">回调可以返回而不提供将路径解析的责任传递给下一个回调的路径。对于给定的导入路径，onResolve 所有插件的所有回调都将按照它们注册的顺序运行，直到有人负责路径解析。如果没有回调返回路径，esbuild 将运行其默认路径解析逻辑</font>

## <font style="color:rgb(51, 51, 51);">Resolve 参数</font>
+ <font style="color:rgb(51, 51, 51);">当 esbuild 调用由 注册的回调时 onResolve，它将为这些参数提供有关导入路径的信息：</font>
+ <font style="color:rgb(51, 51, 51);">path 这是来自底层模块源代码的逐字未解析路径</font>
+ <font style="color:rgb(51, 51, 51);">namespace 这是包含要解析的此导入的模块的名称空间</font>

## <font style="color:rgb(51, 51, 51);">onLoad 回调</font>
+ <font style="color:rgb(51, 51, 51);">onLoad 将为每个未标记为外部的唯一路径/命名空间对运行添加的回调</font>
+ <font style="color:rgb(51, 51, 51);">它的工作是返回模块的内容并告诉 esbuild 如何解释它</font>
+ <font style="color:rgb(51, 51, 51);">回调可以在不提供模块内容的情况下返回。在这种情况下，加载模块的责任被传递给下一个注册的回调。对于给定的模块，onLoad 所有插件的所有回调都将按照它们注册的顺序运行，直到有人负责加载模块。如果没有回调返回模块的内容，esbuild 将运行其默认的模块加载逻辑</font>

## <font style="color:rgb(51, 51, 51);">onLoad 选项</font>
+ <font style="color:rgb(51, 51, 51);">filter 每个回调都必须提供一个过滤器，它是一个正则表达式。当路径与此过滤器不匹配时，将跳过注册的回调</font>
+ <font style="color:rgb(51, 51, 51);">namespace 这是可选的。如果提供，回调仅在提供的命名空间中的模块内的路径上运行</font>

## <font style="color:rgb(51, 51, 51);">load 结果</font>
+ <font style="color:rgb(51, 51, 51);">contents 将此设置为字符串以指定模块的内容。如果设置了此项，则不会针对此已解析路径运行更多加载回调。如果未设置，esbuild 将继续运行在当前回调之后注册的加载回调。然后，如果内容仍未设置，如果解析的路径在 file 命名空间中，esbuild 将默认从文件系统加载内容</font>
+ <font style="color:rgb(51, 51, 51);">loader 这告诉 esbuild 如何解释内容。例如，js 加载器将内容解释为 JavaScript，css 加载器将内容解释为 CSS。js 如果未指定，则加载程序默认为。有关所有内置加载程序的完整列表，请参阅内容类型页面。</font>

## <font style="color:rgb(51, 51, 51);">编写插件</font>
### <font style="color:rgb(51, 51, 51);">src</font>
#### <font style="color:rgb(51, 51, 51);">entry.js</font>
```javascript
import { PATH } from "env";

console.log(`Path is ${PATH}`);

```

### <font style="color:rgb(51, 51, 51);">plugins</font>
#### <font style="color:rgb(51, 51, 51);">envPlugin.js</font>
```javascript
const envPlugin = {
  name: "env",
  setup(build) {
    //拦截名为env的导入路径，以便esbuild不会尝试将它们映射到文件系统位置
    //用env-ns名称空间标记它们，以便为该插件保留它们
    build.onResolve({ filter: /^env$/ }, (args) => ({
      path: args.path,
      namespace: "env-ns",
    }));
    //加载带有env-ns名称空间标记的路径，它们的行为就像指向包含环境变量的JSON文件一样
    build.onLoad({ filter: /.*/, namespace: "env-ns" }, () => ({
      contents: JSON.stringify(process.env),
      loader: "json",
    }));
  },
};

export default envPlugin;
```

### esbuild.js
```diff
import esbuild from "esbuild";
+ import envPlugin from "./plugins/envPlugin.js";

esbuild
  .build({
- 	 entryPoints: ["src/main.js"],
+    entryPoints: ["src/entry.js"],
    bundle: true,
-    outfile: "dist/main.js",
+    outfile: "dist/entry.js",
    loader: {
      ".js": "jsx",
    },
    format: "esm",
+    plugins: [envPlugin],
  })
  .catch(() => process.exit(1));
```

# 参考
[esbuild - 极速 JavaScript 打包器](https://esbuild.bootcss.com/)

