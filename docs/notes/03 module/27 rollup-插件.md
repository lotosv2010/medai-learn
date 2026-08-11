# <font style="color:rgb(51, 51, 51);">开始</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Rollup</font>`<font style="color:rgb(51, 51, 51);">是一个</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">JavaScript</font>`<font style="color:rgb(51, 51, 51);">模块打包器，可以将小块代码编译成大块复杂的代码，例如</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">library</font>`<font style="color:rgb(51, 51, 51);">或应用程序</font>

## <font style="color:rgb(51, 51, 51);">debugger-plugin.js</font>
```javascript
import { rollup } from "rollup";
import options from "../rollup.config.js";

(async () => {
  // 打包阶段
  const bundle = await rollup(options);
  // 生成阶段
  await bundle.generate(options.output);
  // 写入阶段
  await bundle.write(options.output);
  // 关闭阶段
  await bundle.close();
})();
```

## <font style="color:rgb(51, 51, 51);">rollup.config.js</font>
```javascript
import First from "./plugins/rollup-plugin-first.js";

export default {
  input: "./src/index.js",
  output: {
    file: "./dist/bundle.js",
    format: "cjs",
  },
  plugins: [First()],
};
```

## <font style="color:rgb(51, 51, 51);">package.json</font>
```diff
{
  "name": "g-rollup",
  "version": "1.0.0",
  "description": "",
+  "type": "module",
  "main": "index.js",
  "scripts": {
    "dev": "node test/debugger.js",
+    "dev:plugin": "node test/debugger-plugin.js",
+    "build": "rollup -c",
    "clean": "rimraf dist"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.5.2",
  "dependencies": {
    "acorn": "^8.14.1",
    "magic-string": "^0.30.17",
    "rollup": "^4.41.1"
  },
  "devDependencies": {
    "rimraf": "^6.0.1"
  }
}
```

## plugins
### rollup-plugin-first.js
```javascript
export default function first() {
  return {
    name: "first", // 此名称将出现在警告和错误中
    resolveId(source) {
      console.log("resolveId", source);
      return source === "virtual-module" ? source : null;
    },
    load(id) {
      console.log("load", id);
      return id === "virtual-module"
        ? 'export default "This is virtual module."'
        : null;
    },
  };
}
```

## src
### index.js
```javascript
console.log("Hello Plugins!!!");
```

# <font style="color:rgb(51, 51, 51);">rollup插件</font>
+ [Rollup](https://rollupjs.org/guide/en/#plugins-overview)<font style="color:rgb(51, 51, 51);">是一个具有以下描述的一个或多个</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">属性</font>`<font style="color:rgb(51, 51, 51);">、</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">构建钩子</font>`<font style="color:rgb(51, 51, 51);">和</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">输出生成钩子</font>`<font style="color:rgb(51, 51, 51);">的对象，它遵循我们的约定。插件应该作为一个包分发，该包导出一个可以使用插件特定选项调用的函数并返回这样一个对象</font>
+ [GitHub - rollup/awesome: ⚡️ Delightful Rollup Plugins, Packages, and Resources](https://github.com/rollup/awesome)

<!-- 这是一张图片，ocr 内容为：PARALLEL ASYNC SEGUENTIAL SYNC FIRST WATCHCHANGE CLOSEWATCHER OPTIONS BUILDSTART EACH ENTRY RESOLVELD NON-EXTERNAL LOAD CACHED EACH IMPORT SHOULDTRANSFORMCACHEDMODULE NOT CACHED (NOT CACHED) EACH IMPORT UNRESOLVED TRUE (CACHED) FALSE TRANSFORM EXTERNAL NON-EXTERNAL MODULEPARSED EACH IMPORT() RESOLVEDYNAMICLMPORT NO IMPORTS EXTERNAL BUILDEND -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1749107597366-b548b427-c542-4ded-920b-940504411365.png)

## <font style="color:rgb(51, 51, 51);">插件规范</font>
+ <font style="color:rgb(51, 51, 51);">插件应该有一个清晰的名称，带有</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">rollup-plugin-prefix</font>`
+ <font style="color:rgb(51, 51, 51);">在package.json中包含插件关键字</font>
+ <font style="color:rgb(51, 51, 51);">插件应该经过测试。我们推荐mocha或ava，它们支持开箱即用的Promise</font>
+ <font style="color:rgb(51, 51, 51);">尽可能使用异步方法。</font>
+ <font style="color:rgb(51, 51, 51);">编写英文文档</font>
+ <font style="color:rgb(51, 51, 51);">如果合适的话，确保你的插件输出正确的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">sourcemap</font>`
+ <font style="color:rgb(51, 51, 51);">如果您的插件使用“虚拟模块”（例如，用于辅助功能），请在模块ID前面加上</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">\0</font>`<font style="color:rgb(51, 51, 51);">。这会阻止其他插件尝试处理它</font>

## <font style="color:rgb(51, 51, 51);">插件属性</font>
### <font style="color:rgb(51, 51, 51);">name</font>
+ <font style="color:rgb(51, 51, 51);">插件的名称，用于错误消息和警告</font>
+ <font style="color:rgb(51, 51, 51);">Type: 字符串</font>

## <font style="color:rgb(51, 51, 51);">Build Hooks</font>
+ [构建钩子](https://cn.rollupjs.org/plugin-development/#build-hooks)
+ <font style="color:rgb(51, 51, 51);">为了与构建过程交互，你的插件对象包括“钩子”</font>
+ <font style="color:rgb(51, 51, 51);">钩子是在构建的不同阶段调用的函数</font>
+ <font style="color:rgb(51, 51, 51);">钩子可以影响构建的运行方式，提供关于构建的信息，或者在构建完成后修改构建</font>
+ <font style="color:rgb(51, 51, 51);">有不同种类的钩子</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">async</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">钩子还可以返回解析为相同类型值的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Promise</font>`<font style="color:rgb(51, 51, 51);">；否则，钩子将被标记为</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">sync</font>`
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">first</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">如果有几个插件实现了这个钩子，钩子会按顺序运行，直到钩子返回一个</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">非null</font>`<font style="color:rgb(51, 51, 51);">或未定义的值</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">sequential</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">如果几个插件实现了这个钩子，那么它们都将按照指定的插件顺序运行。如果一个钩子是异步的，那么这种类型的后续钩子将等待当前钩子被解析</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">parallel</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">如果多个插件实现了这个钩子，那么它们都将按照指定的插件顺序运行。如果一个钩子是异步的，那么这类后续钩子将并行运行，而不是等待当前钩子</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Build Hooks</font>`<font style="color:rgb(51, 51, 51);">在构建阶段运行，该阶段由</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">rollup.rollup(inputOptions)</font>`<font style="color:rgb(51, 51, 51);">触发</font>
+ <font style="color:rgb(51, 51, 51);">它们主要负责在</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">rollup</font>`<font style="color:rgb(51, 51, 51);">处理输入文件之前定位、提供和转换输入文件</font>
+ <font style="color:rgb(51, 51, 51);">构建阶段的第一个钩子是</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">options</font>`<font style="color:rgb(51, 51, 51);">，最后一个钩子总是</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">buildEnd</font>`
+ <font style="color:rgb(51, 51, 51);">如果出现生成错误，将在此之后调用</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">closeBundle</font>`

### 基本使用
#### 安装依赖
```shell
pnpm add @rollup/plugin-commonjs @rollup/plugin-node-resolve -D
```

#### package.json
```diff
{
  "name": "g-rollup",
  "version": "1.0.0",
  "description": "",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "dev": "node test/debugger.js",
    "dev:plugin": "node test/debugger-plugin.js",
    "build": "rollup -c",
    "clean": "rimraf dist"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.5.2",
  "dependencies": {
    "acorn": "^8.14.1",
    "magic-string": "^0.30.17",
    "rollup": "^4.41.1"
  },
  "devDependencies": {
+    "@rollup/plugin-commonjs": "^28.0.3",
+    "@rollup/plugin-node-resolve": "^16.0.1",
    "rimraf": "^6.0.1"
  }
}

```

#### <font style="color:rgb(51, 51, 51);">rollup-plugin-build.js</font>
```javascript
function build(pluginOptions) {
  return {
    name: "build",
    // 监听文件变化
    async watchChange(id, change) {
      console.log("watchChange", id, change);
    },
    // 关闭监听
    async closeWatcher() {
      console.log("closeWatcher");
    },
    // 配置项
    async options(inputOptions) {
      console.log("options");
      // inputOptions.input = './src/main.js';
    },
    // 构建开始
    async buildStart(inputOptions) {
      console.log("buildStart");
    },
    // 解析模块
    async resolveId(source, importer) {
      if (source === "virtual") {
        console.log("resolveId", source);
        // 如果resolveId钩子有返回值了，那么就会跳过后面的查找逻辑，以此返回值作为最终的模块ID
        return source;
      }
    },
    // 加载此模块ID对应的内容
    async load(id) {
      if (id === "virtual") {
        console.log("load", id);
        return `export default "virtual"`;
      }
    },
    // 是否需要缓存此模块
    async shouldTransformCachedModule({ id, code, ast }) {
      console.log("shouldTransformCachedModule");
      //不使用缓存，再次进行转换
      return true;
    },
    // 转换此模块内容
    async transform(code, id) {
      console.log("transform");
    },
    // 模块解析
    async moduleParsed(moduleInfo) {
      console.log("moduleParsed");
    },
    // 解析动态导入
    async resolveDynamicImport(specifier, importer) {
      console.log("resolveDynamicImport", specifier, importer);
    },
    // 构建结束
    async buildEnd() {
      console.log("buildEnd");
    },
  };
}
export default build;
```

#### <font style="color:rgb(51, 51, 51);">rollup.config.js</font>
```diff
+ import commonjs from "@rollup/plugin-commonjs";
+ import resolve from "@rollup/plugin-node-resolve";
- import first from "./plugins/rollup-plugin-first.js";
+ import build from "./plugins/rollup-plugin-build.js";

export default {
  input: "./src/index.js",
  output: {
    dir: "./dist",
-    format: "cjs",
  },
  plugins: [
-    first(),
+    resolve(),
+    commonjs(),
+    build({})
  ]
};

```

#### src
##### index.js
```diff
+ import("./msg.js").then(module => console.log(module));

console.log("Hello Plugins!!!");
```

##### msg.js
```javascript
export let name = 'msg';
name +=  '🤣';
export const age = 18;
```

### Hooks
#### <font style="color:rgb(51, 51, 51);">options</font>
+ [配置选项](https://cn.rollupjs.org/configuration-options/)

| **<font style="color:rgb(103, 103, 108);">类型:</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">(options: InputOptions) => InputOptions | null</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别:</font>** | <font style="color:rgb(60, 60, 67);">async，sequential</font> |
| **<font style="color:rgb(103, 103, 108);">上一个钩子:</font>** | <font style="color:rgb(60, 60, 67);">这是构建阶段的第一个钩子</font> |
| **<font style="color:rgb(103, 103, 108);">下一个钩子:</font>** | [<font style="color:rgb(52, 81, 178);">buildStart</font>](https://cn.rollupjs.org/plugin-development/#buildstart) |


+ <font style="color:rgb(51, 51, 51);">替换或操作传递给</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">rollup</font>`<font style="color:rgb(51, 51, 51);">的选项对象</font>
+ <font style="color:rgb(51, 51, 51);">返回</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">null</font>`<font style="color:rgb(51, 51, 51);">的话rollup不会替换任何内容</font>
+ <font style="color:rgb(51, 51, 51);">如果只需要阅读</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">options</font>`<font style="color:rgb(51, 51, 51);">，建议使用</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">buildStart</font>`<font style="color:rgb(51, 51, 51);">钩子，因为在考虑了所有选项钩子的转换后，该钩子可以访问选项</font>
+ <font style="color:rgb(51, 51, 51);">这是唯一一个无法访问大多数插件上下文实用程序功能的钩子，因为它是在完全配置汇总之前运行的</font>

#### <font style="color:rgb(51, 51, 51);">buildStart</font>
| **<font style="color:rgb(103, 103, 108);">类型：</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">(options: InputOptions) => void</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别：</font>** | <font style="color:rgb(60, 60, 67);">async, parallel</font> |
| **<font style="color:rgb(103, 103, 108);">上一个钩子：</font>** | [<font style="color:rgb(52, 81, 178);">options</font>](https://cn.rollupjs.org/plugin-development/#options) |
| **<font style="color:rgb(103, 103, 108);">下一个钩子：</font>** | <font style="color:rgb(60, 60, 67);">并行解析每个入口点的</font><font style="color:rgb(60, 60, 67);"> </font>[<font style="color:rgb(52, 81, 178);">resolveId</font>](https://cn.rollupjs.org/plugin-development/#resolveid) |


+ <font style="color:rgb(51, 51, 51);">每次</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">rollup.rollup build</font>`<font style="color:rgb(51, 51, 51);">都要调用此钩子</font>
+ <font style="color:rgb(51, 51, 51);">当您需要访问传递给rollup的选项时，建议使用这个钩子</font>
+ <font style="color:rgb(51, 51, 51);">因为它考虑了所有</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">options</font>`<font style="color:rgb(51, 51, 51);">钩子的转换，还包含未设置选项的正确默认值</font>

#### <font style="color:rgb(51, 51, 51);">resolveId</font>
| **<font style="color:rgb(103, 103, 108);">类型:</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">ResolveIdHook</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别:</font>** | async, first |
| **<font style="color:rgb(103, 103, 108);">上一个钩子:</font>** | 如果我们正在解析入口点，则为 [<font style="color:rgb(52, 81, 178);">buildStart</font>](https://cn.rollupjs.org/plugin-development/#buildstart)，如果我们正在解析导入，则为 [<font style="color:rgb(52, 81, 178);">moduleParsed</font>](https://cn.rollupjs.org/plugin-development/#moduleparsed)，否则作为 [<font style="color:rgb(52, 81, 178);">resolveDynamicImport</font>](https://cn.rollupjs.org/plugin-development/#resolvedynamicimport) 的后备。此外，此钩子可以通过调用 [<font style="color:rgb(52, 81, 178);">this.emitFile</font>](https://cn.rollupjs.org/plugin-development/#this-emitfile)<font style="color:rgb(52, 81, 178);"> </font>来在构建阶段的插件钩子中触发以产出入口点，或随时调用 [<font style="color:rgb(52, 81, 178);">this.resolve</font>](https://cn.rollupjs.org/plugin-development/#this-resolve)<font style="color:rgb(52, 81, 178);"> </font>手动解析 id。 |
| **<font style="color:rgb(103, 103, 108);">下一个钩子:</font>** | 如果尚未加载解析的 id，则为 [<font style="color:rgb(52, 81, 178);">load</font>](https://cn.rollupjs.org/plugin-development/#load)，否则为 [<font style="color:rgb(52, 81, 178);">buildEnd</font>](https://cn.rollupjs.org/plugin-development/#buildend)。 |


+ <font style="color:rgb(51, 51, 51);">定义自定义解析器</font>
+ <font style="color:rgb(51, 51, 51);">解析程序可用于定位第三方依赖关系等。这里</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">source</font>`<font style="color:rgb(51, 51, 51);">是导入语句中所写的导入对象，即</font>
+ <font style="color:rgb(51, 51, 51);">来源就是</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">"../bar.js"</font>`

```plain
import { foo } from '../bar.js';
```

+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">importer</font>`<font style="color:rgb(51, 51, 51);">是导入模块的完全解析id</font>
+ <font style="color:rgb(51, 51, 51);">在解析入口点时，</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">importer</font>`<font style="color:rgb(51, 51, 51);">通常是undefined</font>
+ <font style="color:rgb(51, 51, 51);">这里的一个例外是通过</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">this.emitFile</font>`<font style="color:rgb(51, 51, 51);">生成的入口点。在这里，您可以提供一个</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">importer</font>`<font style="color:rgb(51, 51, 51);">参数</font>
+ <font style="color:rgb(51, 51, 51);">对于这些情况，</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">isEntry</font>`<font style="color:rgb(51, 51, 51);">选项将告诉您，我们是否正在解析用户定义的入口点、发出的块，或者是否为此提供了</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">isEntry</font>`<font style="color:rgb(51, 51, 51);">参数。解析上下文函数</font>
+ <font style="color:rgb(51, 51, 51);">例如，您可以将其用作为入口点定义自定义代理模块的机制。以下插件将代理所有入口点以注入</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">polyfill</font>`<font style="color:rgb(51, 51, 51);">导入</font>
+ <font style="color:rgb(51, 51, 51);">返回</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">null</font>`<font style="color:rgb(51, 51, 51);">将遵循其他</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">resolveId</font>`<font style="color:rgb(51, 51, 51);">函数，最终遵循默认的解析行</font>
+ <font style="color:rgb(51, 51, 51);">返回</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">false</font>`<font style="color:rgb(51, 51, 51);">信号，表示源应被视为</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">外部模块</font>`<font style="color:rgb(51, 51, 51);">，不包括在</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">bundle</font>`<font style="color:rgb(51, 51, 51);">中 </font>

```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 我们在polyfill id前面加上\0，告诉其他插件不要尝试加载或转换它
const POLYFILL_ID = '\0polyfill';
const PROXY_SUFFIX = '?inject-polyfill-proxy';

export default function injectPolyfillPlugin() {
  return {
    name: 'inject-polyfill',
    async resolveId(source, importer, options) {
      if (source === POLYFILL_ID) {
        // 重要的是，对于polyfills，应始终考虑副作用
        // 否则，使用`treeshake.moduleSideEffects:false`可能会阻止包含polyfill
        return { id: POLYFILL_ID, moduleSideEffects: true };
      }
      if (options.isEntry) {
        // 确定实际的入口是什么。我们需要skipSelf来避免无限循环。
        const resolution = await this.resolve(source, importer, { skipSelf: true, ...options });
        // 如果它无法解决或是外部的，只需返回它，这样Rollup就可以显示错误
        if (!resolution || resolution.external) return resolution;
        // 在代理的加载钩子中，我们需要知道入口是否有默认导出
        // 然而，在那里，我们不再有完整的"解析"对象，它可能包含来自其他插件的元数据，这些插件只在第一次加载时添加
        // 仅在第一次加载时添加。因此我们在这里触发加载。
        const moduleInfo = await this.load(resolution);
        // 我们需要确保即使对于treeshake来说，原始入口点的副作用也得到了考虑。moduleSideEffects:false。
        // moduleSideEffects是ModuleInfo上的一个可写属性
        moduleInfo.moduleSideEffects = true;
        // 重要的是，新入口不能以\0开头，并且与原始入口具有相同的目录，以免扰乱相对外部导入的生成
        // 此外，保留名称并在末尾添加一个"查询"可以确保preserveModules将为该条目生成原始条目名称
        return `${resolution.id}${PROXY_SUFFIX}`;
      }
      return null;
    },
    load(id) {
      if (id === POLYFILL_ID) {
        // 使用 import.meta.url 和 path/url 模块来获取当前文件（插件文件）的目录
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const polyfillPath = path.resolve(__dirname, '../polyfill/index.js');
        // 引入 polyfill.js
        return `import ${JSON.stringify(polyfillPath)};`;
      }
      if (id.endsWith(PROXY_SUFFIX)) {
        const entryId = id.slice(0, -PROXY_SUFFIX.length);
        // 我们知道ModuleInfo.hasDefaultExport是可靠的，因为我们在等待在resolveId中的this.load
        // We know ModuleInfo.hasDefaultExport is reliable because we awaited this.load in resolveId
        const { hasDefaultExport } = this.getModuleInfo(entryId);
        let code =
          `import ${JSON.stringify(POLYFILL_ID)};` + `export * from ${JSON.stringify(entryId)};`;
        // 命名空间重新导出不会重新导出默认值，因此我们需要在这里进行特殊处理
        if (hasDefaultExport) {
          code += `export { default } from ${JSON.stringify(entryId)};`;
        }
        return code;
      }
      return null;
    }
  };
}
```

```javascript
console.log('this is polyfill code.');
```

```diff
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
- import build from "./plugins/rollup-plugin-build.js";
+ import polyfill from "./plugins/rollup-plugin-polyfill.js";

export default {
  input: "./src/index.js",
  output: {
    dir: "./dist",
  },
  plugins: [
    resolve(),
    commonjs(),
-     build({}),
+    polyfill()
  ]
};
```

#### <font style="color:rgb(51, 51, 51);">load</font>
| **<font style="color:rgb(103, 103, 108);">类型：</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">(id: string) => LoadResult</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别：</font>** | async, first |
| **<font style="color:rgb(103, 103, 108);">上一个钩子：</font>** | 已解析加载的 id 的 [<font style="color:rgb(52, 81, 178);">resolveId</font>](https://cn.rollupjs.org/plugin-development/#resolveid)<font style="color:rgb(52, 81, 178);"> </font>或 [<font style="color:rgb(52, 81, 178);">resolveDynamicImport</font>](https://cn.rollupjs.org/plugin-development/#resolvedynamicimport)。此外，此钩子可以通过调用 [<font style="color:rgb(52, 81, 178);">this.load</font>](https://cn.rollupjs.org/plugin-development/#this-load) 来从插件钩子中的任何位置触发预加载与 id 对应的模块 |
| **<font style="color:rgb(103, 103, 108);">下一个钩子：</font>** | 如果未使用缓存，或者没有具有相同 `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">code</font>` 的缓存副本，则为 [<font style="color:rgb(52, 81, 178);">transform</font>](https://cn.rollupjs.org/plugin-development/#transform)，否则为[<font style="color:rgb(52, 81, 178);">shouldTransformCachedModule</font>](https://cn.rollupjs.org/plugin-development/#shouldtransformcachedmodule) |


+ <font style="color:rgb(51, 51, 51);">定义自定义加载程序</font>
+ <font style="color:rgb(51, 51, 51);">返回</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">null</font>`<font style="color:rgb(51, 51, 51);">会推迟到其他加载函数（最终是从文件系统加载的默认行为）</font>
+ <font style="color:rgb(51, 51, 51);">为了防止额外的解析开销，例如这个钩子已经使用了这个。parse出于某种原因，为了生成AST，这个钩子可以选择性地返回</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">{code，AST，map}</font>`<font style="color:rgb(51, 51, 51);">对象。</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">ast</font>`<font style="color:rgb(51, 51, 51);">必须是标准的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">ESTree ast</font>`<font style="color:rgb(51, 51, 51);">，每个节点都有开始和结束属性。如果转换不移动代码，可以通过将map设置为null来保留现有的sourcemaps。否则，您可能需要生成源映射。请参阅关于源代码转换的部分</font>

#### <font style="color:rgb(51, 51, 51);">transform</font>
| **<font style="color:rgb(103, 103, 108);">类型:</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">(code: string, id: string) => TransformResult</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别:</font>** | <font style="color:rgb(60, 60, 67);">async, sequential</font> |
| **<font style="color:rgb(103, 103, 108);">上一个钩子:</font>** | [<font style="color:rgb(52, 81, 178);">load</font>](https://cn.rollupjs.org/plugin-development/#load)<font style="color:rgb(60, 60, 67);">，用于加载当前处理的文件。如果使用缓存并且该模块有一个缓存副本，则为 </font>[<font style="color:rgb(52, 81, 178);">shouldTransformCachedModule</font>](https://cn.rollupjs.org/plugin-development/#shouldtransformcachedmodule)<font style="color:rgb(60, 60, 67);">，如果插件为该钩子返回了 </font>`<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">true</font>` |
| **<font style="color:rgb(103, 103, 108);">下一个钩子:</font>** | [<font style="color:rgb(52, 81, 178);">moduleParsed</font>](https://cn.rollupjs.org/plugin-development/#moduleparsed)<font style="color:rgb(60, 60, 67);">，一旦文件已被处理和解析</font> |


+ <font style="color:rgb(51, 51, 51);">可用于转换单个模块</font>
+ <font style="color:rgb(51, 51, 51);">为了防止额外的解析开销，例如这个钩子已经使用了</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">this.parse</font>`<font style="color:rgb(51, 51, 51);">出于某种原因，为了生成AST</font>
+ <font style="color:rgb(51, 51, 51);">这个钩子可以选择性地返回</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">{code，AST，map}</font>`<font style="color:rgb(51, 51, 51);">对象</font>
+ <font style="color:rgb(51, 51, 51);">ast必须是标准的ESTree ast，每个节点都有</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">start</font>`<font style="color:rgb(51, 51, 51);">和</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">end</font>`<font style="color:rgb(51, 51, 51);">属性</font>
+ <font style="color:rgb(51, 51, 51);">如果转换不移动代码，可以通过将map设置为null来保留现有的sourcemaps。否则，您可能需要生成源映射。请参阅关于源代码转换的部分</font>

```shell
pnpm add rollup-pluginutils @rollup/plugin-babel @babel/core @babel/preset-env  -D
```

```javascript
import { createFilter } from "rollup-pluginutils";
import babel from "@babel/core";

function babelPlugin(pluginOptions = {}) {
  const defaultExtensions = [".js"];
  const { exclude, include, extensions = defaultExtensions, presets } = pluginOptions;
  const extensionRegExp = new RegExp(`(${extensions.join("|")})$`);
  const userDefinedFilter = createFilter(include, exclude);
  const filter = id => extensionRegExp.test(id) && userDefinedFilter(id);

  return {
    name: "babel",
    async transform(code, id) {
      if (!filter(id)) return null;
      const result = await babel.transformAsync(code, {
        babelrc: false,
        configFile: false,
        filename: id,
        presets,
        include,
        exclude
      });
      return {
        ast: result.ast,
        code: result.code,
        map: result.map,
      };
    },
  }
}

export default babelPlugin;
```

```javascript
import babel from "./plugins/rollup-plugin-babel.js";

export default {
  input: "./src/index.js",
  output: {
    dir: "./dist",
  },
  plugins: [
    babel({
      extensions: [".js", ".jsx"],
      include: ["src/**/*"],
      exclude: "node_modules/**",
      presets: [
        [
          "@babel/preset-env",
          {
            targets: {
              ie: "11",
              chrome: "58",
            },
          },
        ],
      ],
    })
  ]
};
```

```javascript
console.log("Hello Plugins!!!");

const add = (a, b) => a + b;

console.log(add(1, 2));
```

#### <font style="color:rgb(51, 51, 51);">shouldTransformCachedModule</font>
| **<font style="color:rgb(103, 103, 108);">类型:</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">ShouldTransformCachedModuleHook</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别:</font>** | async, first |
| **<font style="color:rgb(103, 103, 108);">上一个钩子:</font>** | [<font style="color:rgb(52, 81, 178);">load</font>](https://cn.rollupjs.org/plugin-development/#load)，用于加载缓存文件并将其代码与缓存版本进行比较 |
| **<font style="color:rgb(103, 103, 108);">下一个钩子:</font>** | 如果没有插件返回 `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">true</font>`，则为 [<font style="color:rgb(52, 81, 178);">moduleParsed</font>](https://cn.rollupjs.org/plugin-development/#moduleparsed)，否则为 [<font style="color:rgb(52, 81, 178);">transform</font>](https://cn.rollupjs.org/plugin-development/#transform) |


+ <font style="color:rgb(51, 51, 51);">如果使用了</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Rollup</font>`<font style="color:rgb(51, 51, 51);">缓存（例如，在监视模式下或通过JavaScript API显式使用），如果在加载钩子之后，加载的代码与缓存副本的代码相同，则Rollup将跳过模块的转换钩子</font>
+ <font style="color:rgb(51, 51, 51);">为了防止这种情况，丢弃缓存的副本，而是转换一个模块，插件可以实现这个钩子并返回true。</font>
+ <font style="color:rgb(51, 51, 51);">这个钩子还可以用来找出缓存了哪些模块，并访问它们缓存的元信息</font>
+ <font style="color:rgb(51, 51, 51);">如果一个插件没有返回true，Rollup将触发其他插件的这个钩子，否则将跳过所有剩余的插件。</font>

```shell
npx rollup -c -w
shouldTransformCachedModule
transform
moduleParsed

shouldTransformCachedModule
moduleParsed
```

#### <font style="color:rgb(51, 51, 51);">moduleParsed</font>
| **<font style="color:rgb(103, 103, 108);">类型：</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">(moduleInfo: ModuleInfo) => void</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别：</font>** | <font style="color:rgb(60, 60, 67);">async，parallel</font> |
| **<font style="color:rgb(103, 103, 108);">上一个钩子：</font>** | [<font style="color:rgb(52, 81, 178);">transform</font>](https://cn.rollupjs.org/plugin-development/#transform)<font style="color:rgb(60, 60, 67);">，当前处理的文件已被转换</font> |
| **<font style="color:rgb(103, 103, 108);">下一个钩子：</font>** | [<font style="color:rgb(52, 81, 178);">resolveId</font>](https://cn.rollupjs.org/plugin-development/#resolveid)<font style="color:rgb(60, 60, 67);"> 和 </font>[<font style="color:rgb(52, 81, 178);">resolveDynamicImport</font>](https://cn.rollupjs.org/plugin-development/#resolvedynamicimport)<font style="color:rgb(60, 60, 67);">，并行解析所有已发现的静态和动态导入，如果存在，否则调用 </font>[<font style="color:rgb(52, 81, 178);">buildEnd</font>](https://cn.rollupjs.org/plugin-development/#buildend)<font style="color:rgb(60, 60, 67);">。</font> |


+ <font style="color:rgb(51, 51, 51);">每当模块被</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Rollup</font>`<font style="color:rgb(51, 51, 51);">完全解析时，就会调用这个钩子。看看</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">this.getModuleInfo</font>`<font style="color:rgb(51, 51, 51);">了解传递给这个钩子的信息</font>
+ <font style="color:rgb(51, 51, 51);">与</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">transform</font>`<font style="color:rgb(51, 51, 51);">钩子不同，这个钩子从不缓存，可以用来获取缓存模块和其他模块的信息，包括元属性的最终形状、代码和ast</font>

#### <font style="color:rgb(51, 51, 51);">resolveDynamicImport</font>
| **<font style="color:rgb(103, 103, 108);">类型：</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">ResolveDynamicImportHook</font>` |
| :--- | --- |
| **<font style="color:rgb(103, 103, 108);">类别：</font>** | async, first |
| **<font style="color:rgb(103, 103, 108);">上一个钩子：</font>** | 导入文件的 [<font style="color:rgb(52, 81, 178);">moduleParsed</font>](https://cn.rollupjs.org/plugin-development/#moduleparsed) 钩子 |
| **<font style="color:rgb(103, 103, 108);">下一个钩子：</font>** | 如果钩子解析出尚未加载的 id，则为 [<font style="color:rgb(52, 81, 178);">load</font>](https://cn.rollupjs.org/plugin-development/#load)，如果动态导入包含字符串并且未被钩子解析，则为 [<font style="color:rgb(52, 81, 178);">resolveId</font>](https://cn.rollupjs.org/plugin-development/#resolveid)，否则为 [<font style="color:rgb(52, 81, 178);">buildEnd</font>](https://cn.rollupjs.org/plugin-development/#buildend) |


+ <font style="color:rgb(51, 51, 51);">为动态导入定义自定义解析程序</font>
+ <font style="color:rgb(51, 51, 51);">返回</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">false</font>`<font style="color:rgb(51, 51, 51);">表明导入应该保持原样，而不是传递给其他解析程序，从而使其成为外部的</font>
+ <font style="color:rgb(51, 51, 51);">与</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">resolveId</font>`<font style="color:rgb(51, 51, 51);">钩子类似，还可以返回一个对象，将导入解析为不同的id，同时将其标记为外部</font>
+ <font style="color:rgb(51, 51, 51);">如果动态导入被传递一个字符串作为参数，那么从这个钩子返回的字符串将被解释为一个现有的模块id，而返回null将推迟到其它解析器resolveId</font>

```javascript
import('./msg.js').then(res => console.log(res))
```

#### <font style="color:rgb(51, 51, 51);">buildEnd</font>
| **<font style="color:rgb(103, 103, 108);">类型：</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">(error?: Error) => void</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别：</font>** | <font style="color:rgb(60, 60, 67);">async, parallel</font> |
| **<font style="color:rgb(103, 103, 108);">上一个钩子：</font>** | [<font style="color:rgb(52, 81, 178);">moduleParsed</font>](https://cn.rollupjs.org/plugin-development/#moduleparsed)<font style="color:rgb(60, 60, 67);">、</font>[<font style="color:rgb(52, 81, 178);">resolveId</font>](https://cn.rollupjs.org/plugin-development/#resolveid)<font style="color:rgb(60, 60, 67);"> 或 </font>[<font style="color:rgb(52, 81, 178);">resolveDynamicImport</font>](https://cn.rollupjs.org/plugin-development/#resolvedynamicimport) |
| **<font style="color:rgb(103, 103, 108);">下一个钩子：</font>** | <font style="color:rgb(60, 60, 67);">输出生成阶段的 </font>[<font style="color:rgb(52, 81, 178);">outputOptions</font>](https://cn.rollupjs.org/plugin-development/#outputoptions)<font style="color:rgb(60, 60, 67);">，因为这是构建阶段的最后一个钩子</font> |


+ <font style="color:rgb(51, 51, 51);">在</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">rollup</font>`<font style="color:rgb(51, 51, 51);">完成打包时调用，但在调用</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">generate</font>`<font style="color:rgb(51, 51, 51);">或</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">write</font>`<font style="color:rgb(51, 51, 51);">之前调用；你也可以返回一个</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Promise</font>`
+ <font style="color:rgb(51, 51, 51);">如果在构建过程中发生错误，则会将其传递给此钩子</font>

## <font style="color:rgb(51, 51, 51);">Output Generation Hooks</font>
+ <font style="color:rgb(51, 51, 51);">输出生成钩子可以提供有关生成的包的信息，并在完成后修改构建</font>
+ <font style="color:rgb(51, 51, 51);">输出生成阶段的第一个钩子是</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">outputOptions</font>`<font style="color:rgb(51, 51, 51);">，最后一个钩子要么</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">generateBundle</font>`<font style="color:rgb(51, 51, 51);">是通过成功生成输出</font>
+ <font style="color:rgb(51, 51, 51);">或者在输出生成过程中的任何时候发生错误</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">renderError</font>`
+ <font style="color:rgb(51, 51, 51);">此外，</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">closeBundle</font>`<font style="color:rgb(51, 51, 51);">可以作为最后一个钩子调用，但用户有责任手动调用</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">bundle.close()</font>`<font style="color:rgb(51, 51, 51);">以触发此钩子</font>

<!-- 这是一张图片，ocr 内容为：OUTPUTOPTIONS RENDERSTART EACH CHUNK EACH IMPORT() RENDERDYNAMICLMPORT EACH IMPORT.META. OTHER NEXT CHUNK IMPORT.META.URL RESOLVEFILEURL RESOLVELMPORTMETA BANNER FOOTER INTRO OUTRO EACH CHUNK RENDERCHUNK NEXT CHUNK AUGMENTCHUNKHASH GENERATEBUNDLE WRITEBUNDLE RENDERERROR CLOSEBUNDLE -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1749115217690-d3ee6696-0a48-4bc3-8e37-54e7c3a4c42f.png)

### 基本使用
#### <font style="color:rgb(51, 51, 51);">rollup-plugin-output.js</font>
```javascript
function output() {
  return {
    name: 'output',
    //这个钩子是同步的，不能加async
    outputOptions(outputOptions) {
      console.log('outputOptions');
    },
    async renderStart(outputOptions, inputOptions) {
      console.log('renderStart');
    },
    async banner(chunk ) {
      console.log('banner');
    },
    async footer(chunk) {
      console.log('footer');
    },
    async intro(chunk) {
      console.log('intro');
    },
    async outro(chunk) {
      console.log('outro');
    },
    renderDynamicImport() {
      console.log('renderDynamicImport');
    },
    async augmentChunkHash(chunkInfo) {
      console.log('augmentChunkHash');
    },
    async resolveFileUrl(chunkInfo) {
      console.log('resolveFileUrl');
    },
    async resolveImportMeta(property, chunkInfo) {
      console.log('resolveImportMeta');
    },
    async renderChunk() {
      console.log('renderChunk');
    },
    async generateBundle(options, bundle, isWrite) {
      console.log('generateBundle');
    },
    async writeBundle(options, bundle) {
      console.log('writeBundle');
    },
    async renderError(err) {
      console.log('renderError');
    },
    async closeBundle(err) {
      console.log('closeBundle');
    }
  }
}
export default output;
```

#### <font style="color:rgb(51, 51, 51);">rollup.config.js</font>
```diff
+ import output from "./plugins/rollup-plugin-output.js";

export default {
  input: "./src/index.js",
  output: {
    dir: "./dist",
  },
  plugins: [
+    output()
  ]
};
```

### Hooks
#### <font style="color:rgb(51, 51, 51);">outputOptions</font>
| **<font style="color:rgb(103, 103, 108);">类型:</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">(outputOptions: OutputOptions) => OutputOptions | null</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别:</font>** | <font style="color:rgb(60, 60, 67);">sync, sequential</font> |
| **<font style="color:rgb(103, 103, 108);">上一个钩子:</font>** | <font style="color:rgb(60, 60, 67);">如果这是第一次生成输出，则为 </font>[<font style="color:rgb(52, 81, 178);">buildEnd</font>](https://cn.rollupjs.org/plugin-development/#buildend)<font style="color:rgb(60, 60, 67);">，否则取决于先前生成的输出，可能是 </font>[<font style="color:rgb(52, 81, 178);">generateBundle</font>](https://cn.rollupjs.org/plugin-development/#generatebundle)<font style="color:rgb(60, 60, 67);">、</font>[<font style="color:rgb(52, 81, 178);">writeBundle</font>](https://cn.rollupjs.org/plugin-development/#writebundle)<font style="color:rgb(60, 60, 67);"> 或 </font>[<font style="color:rgb(52, 81, 178);">renderError</font>](https://cn.rollupjs.org/plugin-development/#rendererror)<font style="color:rgb(60, 60, 67);">。这是输出生成阶段的第一个钩子</font> |
| **<font style="color:rgb(103, 103, 108);">下一个钩子:</font>** | [<font style="color:rgb(52, 81, 178);">renderStart</font>](https://cn.rollupjs.org/plugin-development/#renderstart) |


+ <font style="color:rgb(51, 51, 51);">替换或操作传递给</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">bundle.generate()</font>`<font style="color:rgb(51, 51, 51);">的输出选项对象</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">bundle.write()</font>`
+ <font style="color:rgb(51, 51, 51);">返回</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">null</font>`<font style="color:rgb(51, 51, 51);">并不能代替任何东西</font>
+ <font style="color:rgb(51, 51, 51);">如果您只需要读取输出选项，建议使用</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">renderStart</font>`<font style="color:rgb(51, 51, 51);">钩子，因为在考虑</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">renderStart</font>`<font style="color:rgb(51, 51, 51);">所有钩子的转换后，此钩子可以访问输出选项</font>

#### <font style="color:rgb(51, 51, 51);">renderStart</font>
| **<font style="color:rgb(103, 103, 108);">类型:</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">(outputOptions: OutputOptions, inputOptions: InputOptions) => void</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别:</font>** | <font style="color:rgb(60, 60, 67);">async, parallel</font> |
| **<font style="color:rgb(103, 103, 108);">上一个钩子:</font>** | [<font style="color:rgb(52, 81, 178);">outputOptions</font>](https://cn.rollupjs.org/plugin-development/#outputoptions) |
| **<font style="color:rgb(103, 103, 108);">下一个钩子:</font>** | <font style="color:rgb(60, 60, 67);">对于第一个块中的每个动态导入表达式，跟随</font><font style="color:rgb(60, 60, 67);"> </font>[<font style="color:rgb(52, 81, 178);">renderDynamicImport</font>](https://cn.rollupjs.org/plugin-development/#renderdynamicimport) |


+ <font style="color:rgb(51, 51, 51);">每次初始调用</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">bundle.generate()</font>`<font style="color:rgb(51, 51, 51);">或被</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">bundle.write()</font>`<font style="color:rgb(51, 51, 51);">调用</font>
+ <font style="color:rgb(51, 51, 51);">要在生成完成时收到通知，请使用</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">generateBundle</font>`<font style="color:rgb(51, 51, 51);">和</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">renderError</font>`<font style="color:rgb(51, 51, 51);">挂钩</font>
+ <font style="color:rgb(51, 51, 51);">当您需要访问传递给的输出选项时，建议使用此挂钩.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">bundle.generate()</font>`<font style="color:rgb(51, 51, 51);">或者</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">bundle.write()</font>`<font style="color:rgb(51, 51, 51);">因为它考虑了所有</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">outputOptions</font>`<font style="color:rgb(51, 51, 51);">挂钩的转换，并且还包含未设置选项的正确默认值。它还接收传递给的输入选项</font>

#### <font style="color:rgb(51, 51, 51);">banner</font>
| **<font style="color:rgb(103, 103, 108);">类型:</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">string | ((chunk: RenderedChunk) => string)</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别:</font>** | <font style="color:rgb(60, 60, 67);">async, sequential</font> |
| **<font style="color:rgb(103, 103, 108);">上一个钩子:</font>** | [<font style="color:rgb(52, 81, 178);">resolveFileUrl</font>](https://cn.rollupjs.org/plugin-development/#resolvefileurl)<font style="color:rgb(60, 60, 67);"> 用于每个 </font>`<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">import.meta.ROLLUP_FILE_URL_referenceId</font>`<font style="color:rgb(60, 60, 67);"> 的使用和</font>[<font style="color:rgb(52, 81, 178);">resolveImportMeta</font>](https://cn.rollupjs.org/plugin-development/#resolveimportmeta)<font style="color:rgb(60, 60, 67);"> 用于当前块中所有其他 </font>`<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">import.meta</font>`<font style="color:rgb(60, 60, 67);">访问</font> |
| **<font style="color:rgb(103, 103, 108);">下一个钩子:</font>** | <font style="color:rgb(60, 60, 67);">如果有下一个块中的动态导入表达式，则为 </font>[<font style="color:rgb(52, 81, 178);">renderDynamicImport</font>](https://cn.rollupjs.org/plugin-development/#renderdynamicimport)<font style="color:rgb(60, 60, 67);">，否则为第一个块的 </font>[<font style="color:rgb(52, 81, 178);">renderChunk</font>](https://cn.rollupjs.org/plugin-development/#renderchunk) |


#### <font style="color:rgb(51, 51, 51);">footer</font>
| **<font style="color:rgb(103, 103, 108);">类型:</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">string | ((chunk: RenderedChunk) => string)</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别:</font>** | <font style="color:rgb(60, 60, 67);">async, sequential</font> |
| **<font style="color:rgb(103, 103, 108);">上一个钩子:</font>** | [<font style="color:rgb(52, 81, 178);">resolveFileUrl</font>](https://cn.rollupjs.org/plugin-development/#resolvefileurl)<font style="color:rgb(60, 60, 67);"> 用于每个 </font>`<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">import.meta.ROLLUP_FILE_URL_referenceId</font>`<font style="color:rgb(60, 60, 67);"> 的使用和 </font>[<font style="color:rgb(52, 81, 178);">resolveImportMeta</font>](https://cn.rollupjs.org/plugin-development/#resolveimportmeta)<font style="color:rgb(60, 60, 67);"> 用于当前块中所有其他 </font>`<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">import.meta</font>`<font style="color:rgb(60, 60, 67);"> 访问</font> |
| **<font style="color:rgb(103, 103, 108);">下一个钩子:</font>** | <font style="color:rgb(60, 60, 67);">如果有下一个块中的动态导入表达式，则为 </font>[<font style="color:rgb(52, 81, 178);">renderDynamicImport</font>](https://cn.rollupjs.org/plugin-development/#renderdynamicimport)<font style="color:rgb(60, 60, 67);">，否则为第一个块的 </font>[<font style="color:rgb(52, 81, 178);">renderChunk</font>](https://cn.rollupjs.org/plugin-development/#renderchunk) |


+ <font style="color:rgb(60, 60, 67);">参见 </font>[<font style="color:rgb(52, 81, 178);">output.banner/output.footer</font>](https://cn.rollupjs.org/configuration-options/#output-banner-output-footer)<font style="color:rgb(60, 60, 67);">。</font>

#### <font style="color:rgb(51, 51, 51);">intro</font>
| **<font style="color:rgb(103, 103, 108);">类型:</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">string | ((chunk: RenderedChunk) => string)</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别:</font>** | <font style="color:rgb(60, 60, 67);">async, sequential</font> |
| **<font style="color:rgb(103, 103, 108);">上一个钩子:</font>** | [<font style="color:rgb(52, 81, 178);">resolveFileUrl</font>](https://cn.rollupjs.org/plugin-development/#resolvefileurl)<font style="color:rgb(60, 60, 67);"> 用于每个 </font>`<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">import.meta.ROLLUP_FILE_URL_referenceId</font>`<font style="color:rgb(60, 60, 67);"> 的使用和 </font>[<font style="color:rgb(52, 81, 178);">resolveImportMeta</font>](https://cn.rollupjs.org/plugin-development/#resolveimportmeta)<font style="color:rgb(60, 60, 67);"> 用于当前块中所有其他 </font>`<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">import.meta</font>`<font style="color:rgb(60, 60, 67);"> 访问</font> |
| **<font style="color:rgb(103, 103, 108);">下一个钩子:</font>** | <font style="color:rgb(60, 60, 67);">如果有下一个块中的动态导入表达式，则为 </font>[<font style="color:rgb(52, 81, 178);">renderDynamicImport</font>](https://cn.rollupjs.org/plugin-development/#renderdynamicimport)<font style="color:rgb(60, 60, 67);">，否则为第一个块的 </font>[<font style="color:rgb(52, 81, 178);">renderChunk</font>](https://cn.rollupjs.org/plugin-development/#renderchunk) |


+ <font style="color:rgb(60, 60, 67);">参见 </font>[<font style="color:rgb(52, 81, 178);">output.intro/output.outro</font>](https://cn.rollupjs.org/configuration-options/#output-intro-output-outro)<font style="color:rgb(60, 60, 67);">。</font>

#### <font style="color:rgb(51, 51, 51);">outro</font>
| **<font style="color:rgb(103, 103, 108);">类型:</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">string | ((chunk: RenderedChunk) => string)</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别:</font>** | <font style="color:rgb(60, 60, 67);">async, sequential</font> |
| **<font style="color:rgb(103, 103, 108);">上一个钩子:</font>** | [<font style="color:rgb(52, 81, 178);">resolveFileUrl</font>](https://cn.rollupjs.org/plugin-development/#resolvefileurl)<font style="color:rgb(60, 60, 67);"> 用于每个 </font>`<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">import.meta.ROLLUP_FILE_URL_referenceId</font>`<font style="color:rgb(60, 60, 67);"> 的使用和 </font>[<font style="color:rgb(52, 81, 178);">resolveImportMeta</font>](https://cn.rollupjs.org/plugin-development/#resolveimportmeta)<font style="color:rgb(60, 60, 67);"> 用于当前块中所有其他 </font>`<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">import.meta</font>`<font style="color:rgb(60, 60, 67);"> 访问</font> |
| **<font style="color:rgb(103, 103, 108);">下一个钩子:</font>** | <font style="color:rgb(60, 60, 67);">如果有下一个块中的动态导入表达式，则为 </font>[<font style="color:rgb(52, 81, 178);">renderDynamicImport</font>](https://cn.rollupjs.org/plugin-development/#renderdynamicimport)<font style="color:rgb(60, 60, 67);">，否则为第一个块的 </font>[<font style="color:rgb(52, 81, 178);">renderChunk</font>](https://cn.rollupjs.org/plugin-development/#renderchunk) |


+ <font style="color:rgb(60, 60, 67);">参见 </font>[<font style="color:rgb(52, 81, 178);">output.intro/output.outro</font>](https://cn.rollupjs.org/configuration-options/#output-intro-output-outro)<font style="color:rgb(60, 60, 67);">。</font>

#### <font style="color:rgb(51, 51, 51);">renderDynamicImport</font>
| **<font style="color:rgb(103, 103, 108);">类型:</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">renderDynamicImportHook</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别:</font>** | <font style="color:rgb(60, 60, 67);">sync, first</font> |
| **<font style="color:rgb(103, 103, 108);">上一个钩子:</font>** | <font style="color:rgb(60, 60, 67);">如果这是第一个块，则为 </font>[<font style="color:rgb(52, 81, 178);">renderStart</font>](https://cn.rollupjs.org/plugin-development/#renderstart)<font style="color:rgb(60, 60, 67);">，否则为上一个块的 </font>[<font style="color:rgb(52, 81, 178);">banner</font>](https://cn.rollupjs.org/plugin-development/#banner)<font style="color:rgb(60, 60, 67);">，</font>[<font style="color:rgb(52, 81, 178);">footer</font>](https://cn.rollupjs.org/plugin-development/#footer)<font style="color:rgb(60, 60, 67);">，</font>[<font style="color:rgb(52, 81, 178);">intro</font>](https://cn.rollupjs.org/plugin-development/#intro)<font style="color:rgb(60, 60, 67);">，</font>[<font style="color:rgb(52, 81, 178);">outro</font>](https://cn.rollupjs.org/plugin-development/#outro) |
| **<font style="color:rgb(103, 103, 108);">下一个钩子:</font>** | <font style="color:rgb(60, 60, 67);">对于每个 </font>`<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">import.meta.ROLLUP_FILE_URL_referenceId</font>`<font style="color:rgb(60, 60, 67);"> 的使用，为 </font>[<font style="color:rgb(52, 81, 178);">resolveFileUrl</font>](https://cn.rollupjs.org/plugin-development/#resolvefileurl)<font style="color:rgb(60, 60, 67);">，对于当前块中所有其他访问</font>`<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">import.meta</font>`<font style="color:rgb(60, 60, 67);">，为 </font>[<font style="color:rgb(52, 81, 178);">resolveImportMeta</font>](https://cn.rollupjs.org/plugin-development/#resolveimportmeta) |


+ <font style="color:rgb(51, 51, 51);">这个钩子提供了对如何呈现动态导入的细粒度控制</font>
+ <font style="color:rgb(51, 51, 51);">方法是替换导入表达式参数的左侧 ( import() 和右侧 ( ) 的代码。)</font>
+ <font style="color:rgb(51, 51, 51);">返回null延迟到此类型的其他钩子并最终呈现特定于格式的默认值</font>
+ <font style="color:rgb(51, 51, 51);">format是渲染的输出格式</font>
+ <font style="color:rgb(51, 51, 51);">moduleId执行动态导入的模块的 id</font>
+ <font style="color:rgb(51, 51, 51);">如果导入可以解析为内部或外部 id，targetModuleId则将设置为此 id，否则将为null</font>

```javascript
export default function dynamicImportPolyfillPlugin() {
  return {
    name: 'dynamic-import-polyfill',
    renderDynamicImport() {
      return {
        left: 'dynamicImportPolyfill(',
        right: ', import.meta.url)'
      };
    }
  };
}
```

```javascript
dynamicImportPolyfill('./msg-ca034dda.js', import.meta.url).then(res => console.log(res.default));

function dynamicImportPolyfill(filename, url) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.type = "module";
    script.onload = () => {
      resolve(window.mod);
    };
    const absURL = new URL(filename, url).href;
    console.log(absURL);
    const blob = new Blob([
      `import * as mod from "${absURL}";`,
      ` window.mod = mod;`], { type: "text/javascript" });
    script.src = URL.createObjectURL(blob);
    document.head.appendChild(script);
  });
}
```

#### <font style="color:rgb(51, 51, 51);">augmentChunkHash</font>
| **<font style="color:rgb(103, 103, 108);">类型:</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">(chunkInfo: RenderedChunk) => string</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别:</font>** | <font style="color:rgb(60, 60, 67);">sync, sequential</font> |
| **<font style="color:rgb(103, 103, 108);">上一个钩子:</font>** | [<font style="color:rgb(52, 81, 178);">renderChunk</font>](https://cn.rollupjs.org/plugin-development/#renderchunk) |
| **<font style="color:rgb(103, 103, 108);">下一个钩子:</font>** | <font style="color:rgb(60, 60, 67);">如果还有其他需要处理的块，则为 </font>[<font style="color:rgb(52, 81, 178);">renderChunk</font>](https://cn.rollupjs.org/plugin-development/#renderchunk)<font style="color:rgb(60, 60, 67);">，否则为 </font>[<font style="color:rgb(58, 92, 204);">generateBundle</font>](https://cn.rollupjs.org/plugin-development/#generatebundle) |


+ <font style="color:rgb(51, 51, 51);">可用于增加单个块的散列</font>
+ <font style="color:rgb(51, 51, 51);">为每个</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Rollup</font>`<font style="color:rgb(51, 51, 51);">输出块调用</font>
+ <font style="color:rgb(51, 51, 51);">返回一个</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">false</font>`<font style="color:rgb(51, 51, 51);">值不会修改散列</font>
+ <font style="color:rgb(51, 51, 51);">真实值将传递给</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">hash.update</font>`<font style="color:rgb(51, 51, 51);">.</font>
+ <font style="color:rgb(51, 51, 51);">这</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">chunkInfo</font>`<font style="color:rgb(51, 51, 51);">是</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">generateBundle</font>`<font style="color:rgb(51, 51, 51);">不依赖文件名的属性的简化版本</font>

#### <font style="color:rgb(51, 51, 51);">resolveFileUrl</font>
+ [import.meta - JavaScript | MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/import.meta)<font style="color:rgb(51, 51, 51);">是一个给JavaScript模块暴露特定上下文的元数据属性的对象。它包含了这个模块的信息，比如说这个模块的URL。</font>

| **<font style="color:rgb(103, 103, 108);">类型:</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">ResolveFileUrlHook</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别:</font>** | <font style="color:rgb(60, 60, 67);">sync, first</font> |
| **<font style="color:rgb(103, 103, 108);">上一个钩子:</font>** | <font style="color:rgb(60, 60, 67);">当前块中的每个动态导入表达式，跟随</font><font style="color:rgb(60, 60, 67);"> </font>[<font style="color:rgb(52, 81, 178);">renderDynamicImport</font>](https://cn.rollupjs.org/plugin-development/#renderdynamicimport) |
| **<font style="color:rgb(103, 103, 108);">下一个钩子:</font>** | <font style="color:rgb(60, 60, 67);">当前块的 </font>[<font style="color:rgb(52, 81, 178);">banner</font>](https://cn.rollupjs.org/plugin-development/#banner)<font style="color:rgb(60, 60, 67);">，</font>[<font style="color:rgb(52, 81, 178);">footer</font>](https://cn.rollupjs.org/plugin-development/#footer)<font style="color:rgb(60, 60, 67);">，</font>[<font style="color:rgb(52, 81, 178);">intro</font>](https://cn.rollupjs.org/plugin-development/#intro)<font style="color:rgb(60, 60, 67);">，</font>[<font style="color:rgb(52, 81, 178);">outro</font>](https://cn.rollupjs.org/plugin-development/#outro)<font style="color:rgb(60, 60, 67);"> 并行处理</font> |


+ <font style="color:rgb(51, 51, 51);">允许自定义Rollup如何解析插件通过此链接发出的文件的URL</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">this.emitFile</font>`
+ <font style="color:rgb(51, 51, 51);">默认情况下，Rollup 将生成代码</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">import.meta.ROLLUP_FILE_URL_referenceId</font>`<font style="color:rgb(51, 51, 51);">该代码应正确生成发出文件的绝对URL，而与输出格式和部署代码的主机系统无关</font>

```javascript
import logger from 'logger'
console.log(logger);
```

```javascript
export default function resolveFileUrl() {
  return {
    name: 'resolveFileUrl',
    resolveId(source) {
      if (source === 'logger') {
        return source;
      }
    },
    load(importee) {
      if (importee === 'logger') {
        let referenceId = this.emitFile({ type: 'asset', source: 'console.log("logger")', fileName: "logger.js" });
        return `export default import.meta.ROLLUP_FILE_URL_${referenceId}`;
      }
    },
    resolveFileUrl({ chunkId, fileName, format, moduleId, referenceId, relativePath }) {//import.meta.url
      return `new URL('${fileName}', document.baseURI).href`;
    }
  };
}
```

#### <font style="color:rgb(51, 51, 51);">resolveImportMeta</font>
| **<font style="color:rgb(103, 103, 108);">类型:</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">(property: string | null, {chunkId: string, moduleId: string, format: string}) => string | null</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别:</font>** | <font style="color:rgb(60, 60, 67);">sync, first</font> |
| **<font style="color:rgb(103, 103, 108);">上一个钩子:</font>** | <font style="color:rgb(60, 60, 67);">当前块中每个动态导入表达式的</font><font style="color:rgb(60, 60, 67);"> </font>[<font style="color:rgb(52, 81, 178);">renderDynamicImport</font>](https://cn.rollupjs.org/plugin-development/#renderdynamicimport) |
| **<font style="color:rgb(103, 103, 108);">下一个钩子:</font>** | <font style="color:rgb(60, 60, 67);">当前块的 </font>[<font style="color:rgb(52, 81, 178);">banner</font>](https://cn.rollupjs.org/plugin-development/#banner)<font style="color:rgb(60, 60, 67);">, </font>[<font style="color:rgb(52, 81, 178);">footer</font>](https://cn.rollupjs.org/plugin-development/#footer)<font style="color:rgb(60, 60, 67);">, </font>[<font style="color:rgb(52, 81, 178);">intro</font>](https://cn.rollupjs.org/plugin-development/#intro)<font style="color:rgb(60, 60, 67);">, </font>[<font style="color:rgb(52, 81, 178);">outro</font>](https://cn.rollupjs.org/plugin-development/#outro)<font style="color:rgb(60, 60, 67);"> 并行处理</font> |


+ <font style="color:rgb(51, 51, 51);">允许自定义 Rollup 如何处理</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">import.meta</font>`<font style="color:rgb(51, 51, 51);">,</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">import.meta.someProperty</font>`<font style="color:rgb(51, 51, 51);">特别是</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">import.meta.url</font>`
+ <font style="color:rgb(51, 51, 51);">在 ES 模块中，</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">import.meta</font>`<font style="color:rgb(51, 51, 51);">是一个对象，</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">import.meta.url</font>`<font style="color:rgb(51, 51, 51);">包含当前模块的 URL</font>

#### <font style="color:rgb(51, 51, 51);">renderChunk</font>
| **<font style="color:rgb(103, 103, 108);">类型:</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">RenderChunkHook</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别:</font>** | <font style="color:rgb(60, 60, 67);">async，sequential</font> |
| **<font style="color:rgb(103, 103, 108);">上一个钩子:</font>** | <font style="color:rgb(60, 60, 67);">上一个块的 </font>[<font style="color:rgb(52, 81, 178);">banner</font>](https://cn.rollupjs.org/plugin-development/#banner)<font style="color:rgb(60, 60, 67);">，</font>[<font style="color:rgb(52, 81, 178);">footer</font>](https://cn.rollupjs.org/plugin-development/#footer)<font style="color:rgb(60, 60, 67);">，</font>[<font style="color:rgb(52, 81, 178);">intro</font>](https://cn.rollupjs.org/plugin-development/#intro)<font style="color:rgb(60, 60, 67);">，</font>[<font style="color:rgb(52, 81, 178);">outro</font>](https://cn.rollupjs.org/plugin-development/#outro) |
| **<font style="color:rgb(103, 103, 108);">下一个钩子:</font>** | [<font style="color:rgb(52, 81, 178);">augmentChunkHash</font>](https://cn.rollupjs.org/plugin-development/#augmentchunkhash) |


+ <font style="color:rgb(51, 51, 51);">可用于转换单个块</font>
+ <font style="color:rgb(51, 51, 51);">为每个</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">rollup</font>`<font style="color:rgb(51, 51, 51);">输出块文件调用。返回null将不应用任何转换</font>

#### <font style="color:rgb(51, 51, 51);">generateBundle</font>
| **<font style="color:rgb(103, 103, 108);">类型:</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">(options: OutputOptions, bundle: { [fileName: string]: OutputAsset | OutputChunk }, isWrite: boolean) => void</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别:</font>** | <font style="color:rgb(60, 60, 67);">async, sequential</font> |
| **<font style="color:rgb(103, 103, 108);">上一个钩子:</font>** | [<font style="color:rgb(52, 81, 178);">augmentChunkHash</font>](https://cn.rollupjs.org/plugin-development/#augmentchunkhash) |
| **<font style="color:rgb(103, 103, 108);">下一个钩子:</font>** | [<font style="color:rgb(52, 81, 178);">writeBundle</font>](https://cn.rollupjs.org/plugin-development/#writebundle)<font style="color:rgb(60, 60, 67);"> 如果输出是通过 </font>`<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">bundle.write(...)</font>`<font style="color:rgb(60, 60, 67);"> 生成的，则为，否则这是输出生成阶段的最后一个钩子，并且可能再次跟随 </font>[<font style="color:rgb(52, 81, 178);">outputOptions</font>](https://cn.rollupjs.org/plugin-development/#outputoptions)<font style="color:rgb(60, 60, 67);">，如果生成了另一个输出。</font> |


+ <font style="color:rgb(51, 51, 51);">在</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">bundle.generate()</font>`<font style="color:rgb(51, 51, 51);">之后调用</font>
+ <font style="color:rgb(51, 51, 51);">或者在</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">bundle.write()</font>`<font style="color:rgb(51, 51, 51);">把文件写入之前调用</font>
+ <font style="color:rgb(51, 51, 51);">要在写入文件后修改文件，请使用</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">writeBundle</font>`<font style="color:rgb(51, 51, 51);">挂钩</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">writeBundle</font>`<font style="color:rgb(51, 51, 51);">提供正在写入或生成的文件的完整列表及其详细信息</font>
+ <font style="color:rgb(51, 51, 51);">您可以通过从该钩子中的捆绑对象中删除文件来防止发出文件。要发出其他文件，请使用</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">this.emitFile</font>`<font style="color:rgb(51, 51, 51);">插件上下文功能</font>

```shell
pnpm add dedent -D
```

```javascript
import dedent from 'dedent';

export default function html() {
  return {
    name: 'html',
    generateBundle(options, bundle) {
      let entryName;
      for (let fileName in bundle) {
        let assetOrChunkInfo = bundle[fileName];
        //console.log(fileName, assetOrChunkInfo);
        if (assetOrChunkInfo.isEntry) {
          entryName = fileName;
        }
      }
      this.emitFile({
        type: 'asset',
        fileName: 'index.html',
        source: dedent`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>rollup</title>
         </head>
        <body>
          <script src="${entryName}" type="module"></script>
        </body>
        </html>`
      });
    }
  };
}
```

#### <font style="color:rgb(51, 51, 51);">writeBundle</font>
| **<font style="color:rgb(103, 103, 108);">类型:</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">(options: OutputOptions, bundle: { [fileName: string]: OutputAsset | OutputChunk }) => void</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别:</font>** | <font style="color:rgb(60, 60, 67);">async, parallel</font> |
| **<font style="color:rgb(103, 103, 108);">上一个钩子:</font>** | [<font style="color:rgb(52, 81, 178);">generateBundle</font>](https://cn.rollupjs.org/plugin-development/#generatebundle) |
| **<font style="color:rgb(103, 103, 108);">下一个钩子:</font>** | <font style="color:rgb(60, 60, 67);">如果调用了它，则是输出生成阶段的最后一个钩子，并且如果生成了另一个输出，则可能再次跟随</font><font style="color:rgb(60, 60, 67);"> </font>[<font style="color:rgb(52, 81, 178);">outputOptions</font>](https://cn.rollupjs.org/plugin-development/#outputoptions) |


+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">bundle.write()</font>`<font style="color:rgb(51, 51, 51);">仅在写入所有文件后才调用</font>
+ <font style="color:rgb(51, 51, 51);">与</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">generateBundle</font>`<font style="color:rgb(51, 51, 51);">钩子类似，</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">bundle</font>`<font style="color:rgb(51, 51, 51);">提供正在写入的文件的完整列表及其详细信息</font>

#### <font style="color:rgb(51, 51, 51);">renderError</font>
| **<font style="color:rgb(103, 103, 108);">类型:</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">(error: Error) => void</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别:</font>** | <font style="color:rgb(60, 60, 67);">async, parallel</font> |
| **<font style="color:rgb(103, 103, 108);">上一个钩子:</font>** | [<font style="color:rgb(52, 81, 178);">renderStart</font>](https://cn.rollupjs.org/plugin-development/#renderstart)<font style="color:rgb(60, 60, 67);"> 到 </font>[<font style="color:rgb(52, 81, 178);">renderChunk</font>](https://cn.rollupjs.org/plugin-development/#renderchunk)<font style="color:rgb(60, 60, 67);"> 中的任何一个钩子</font> |
| **<font style="color:rgb(103, 103, 108);">下一个钩子:</font>** | <font style="color:rgb(60, 60, 67);">如果调用了此钩子，则输出生成阶段的最后一个钩子，并且如果生成了另一个输出，则可能再次跟随</font><font style="color:rgb(60, 60, 67);"> </font>[<font style="color:rgb(52, 81, 178);">outputOptions</font>](https://cn.rollupjs.org/plugin-development/#outputoptions) |


+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">bundle.generate()</font>`<font style="color:rgb(51, 51, 51);">当 rollup 在或期间遇到错误时调用</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">bundle.write()</font>`
+ <font style="color:rgb(51, 51, 51);">错误被传递给这个钩子。要在生成成功完成时收到通知，请使用</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">generateBundle</font>`<font style="color:rgb(51, 51, 51);">钩子</font>

#### <font style="color:rgb(51, 51, 51);">closeBundle</font>
| **<font style="color:rgb(103, 103, 108);">类型:</font>** | `<font style="color:rgb(52, 81, 178);background-color:rgba(142, 150, 170, 0.14);">closeBundle: (error?: Error) => Promise<void> | void</font>` |
| ---: | :--- |
| **<font style="color:rgb(103, 103, 108);">类别:</font>** | <font style="color:rgb(60, 60, 67);">async，parallel</font> |
| **<font style="color:rgb(103, 103, 108);">上一个钩子:</font>** | <font style="color:rgb(60, 60, 67);">如果有构建错误，则为 </font>[<font style="color:rgb(52, 81, 178);">buildEnd</font>](https://cn.rollupjs.org/plugin-development/#buildend)<font style="color:rgb(60, 60, 67);">，否则为调用 </font>[<font style="color:rgb(52, 81, 178);">bundle.close()</font>](https://cn.rollupjs.org/javascript-api/#rollup-rollup)<font style="color:rgb(60, 60, 67);">，在这种情况下，这将是最后一个触发的钩子</font> |


+ <font style="color:rgb(51, 51, 51);">可用于清理可能正在运行的任何外部服务</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Rollup</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">的</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">CLI</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">将确保在每次运行后调用此钩子</font>
+ <font style="color:rgb(51, 51, 51);">但</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">JavaScript API</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">的用户有责任在</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">bundle.close()</font>`<font style="color:rgb(51, 51, 51);">他们完成生成包后手动调用</font>

## <font style="color:rgb(51, 51, 51);">Plugin Context</font>
### <font style="color:rgb(51, 51, 51);">this.emitFile</font>
+ [this-emitfile](https://rollupjs.org/plugin-development/#this-emitfile)
+ <font style="color:rgb(51, 51, 51);">Type: (emittedFile: EmittedChunk | EmittedAsset) => string</font>
+ <font style="color:rgb(51, 51, 51);">发出一个包含在生成输出中的新文件，并返回一个referenceId，该ID可在不同位置用于引用发出的文件</font>
+ <font style="color:rgb(51, 51, 51);">emittedFile 可以有两种形式之一</font>

```tsx
type EmittedChunk = {
  type: 'chunk';
  id: string;
  name?: string;
  fileName?: string;
};

type EmittedAsset = {
  type: 'asset';
  name?: string;
  fileName?: string;
  source?: string | Uint8Array;
};
```

### <font style="color:rgb(60, 60, 67);">this.getModuleInfo</font>
+ [this-getmoduleinfo](https://cn.rollupjs.org/plugin-development/#this-getmoduleinfo)
+ <font style="color:rgb(51, 51, 51);">Type: (moduleId: string) => (ModuleInfo | null)</font>
+ <font style="color:rgb(51, 51, 51);">返回有关相关模块的其他信息</font>

### <font style="color:rgb(51, 51, 51);">this.load</font>
+ [this-load](https://cn.rollupjs.org/plugin-development/#this-load)
+ <font style="color:rgb(51, 51, 51);">Type: ({id: string, moduleSideEffects?: boolean | 'no-treeshake' | null, syntheticNamedExports?: boolean | string | null, meta?: {[plugin: string]: any} | null, resolveDependencies?: boolean}) => Promise</font>
+ <font style="color:rgb(51, 51, 51);">加载并解析与给定id对应的模块，并将附加的元信息附加到模块（如果提供）</font>
+ <font style="color:rgb(51, 51, 51);">这将触发与另一个模块导入该模块时相同的加载、转换和模块授权挂钩</font>

### <font style="color:rgb(51, 51, 51);">this.resolve</font>
+ [this-resolve](https://cn.rollupjs.org/plugin-development/#this-resolve)
+ <font style="color:rgb(51, 51, 51);">使用Rollup使用的相同插件将导入解析为模块ID（即文件名），并确定导入是否应该是外部的</font>
+ <font style="color:rgb(51, 51, 51);">如果返回null，则无法通过Rollup或任何插件解析导入，但用户未明确将其标记为外部</font>

# <font style="color:rgb(51, 51, 51);">实战案例</font>
+ [<font style="color:rgb(51, 122, 183);">astexplorer</font>](https://astexplorer.net/)<font style="color:rgb(51, 51, 51);">可以把代码转成语法树</font>

## <font style="color:rgb(51, 51, 51);">@rollup/plugin-commonjs</font>
### <font style="color:rgb(51, 51, 51);">安装</font>
```shell
pnpm add  @rollup/plugin-commonjs  -D
```

### <font style="color:rgb(51, 51, 51);">src</font>
#### <font style="color:rgb(51, 51, 51);">index.js</font>
```javascript
import catValue from './cat.js';
console.log(catValue);
```

#### <font style="color:rgb(51, 51, 51);">cat.js</font>
```javascript
module.exports = 'catValue';
```

### <font style="color:rgb(51, 51, 51);">rollup-plugin-commonjs.js</font>
```javascript
import { createFilter } from 'rollup-pluginutils'
import MagicString from 'magic-string';
import { walk } from 'estree-walker';
import path from 'path';
export default function (pluginOptions = {}) {
  const defaultExtensions = ['.js', '.jsx']
  const { exclude, include, extensions = defaultExtensions } = pluginOptions;
  const extensionRegExp = new RegExp(
    `(${extensions.join('|')})$`
  )
  const userDefinedFilter = createFilter(include, exclude);
  const filter = id => extensionRegExp.test(id) && userDefinedFilter(id);
  return {
    name: 'commonjs',
    transform(code, id) {
      if (!filter(id)) return null;
      const result = transformAndCheckExports(this.parse, code, id)
      return result;
    }
  }
}
function transformAndCheckExports(parse, code, id) {
  const { isEsModule, ast } = analyzeTopLevelStatements(parse, code, id);
  if (isEsModule) {
    return null;
  }
  return transformCommonjs(code, id, ast)
}
function getKeypath(node) {
  const parts = [];
  while (node.type === 'MemberExpression') {
    parts.unshift(node.property.name);
    node = node.object;
  }
  if (node.type !== 'Identifier') return null;
  const { name } = node;
  parts.unshift(name);
  return { name, keypath: parts.join('.') };
}
function analyzeTopLevelStatements(parse, code) {
  const ast = parse(code);
  let isEsModule = false;
  for (const node of ast.body) {
    switch (node.type) {
      case 'ExportDefaultDeclaration':
        isEsModule = true;
        break;
      case 'ExportNamedDeclaration':
        isEsModule = true;
        break;
      case 'ImportDeclaration':
        isEsModule = true;
        break;
      default:
    }
  }
  return { isEsModule, ast };
}
function transformCommonjs(code, id, ast) {
  const magicString = new MagicString(code);
  const exportDeclarations = [];
  let moduleExportsAssignment;
  walk(ast, {
    enter(node) {
      switch (node.type) {
        case 'AssignmentExpression':
          if (node.left.type === 'MemberExpression') {
            const flattened = getKeypath(node.left);
            if (flattened.keypath === 'module.exports') {
              moduleExportsAssignment = node;
            }
          }
          break;
        default:
          break;
      }
    }
  });
  const { left } = moduleExportsAssignment;
  const exportsName = path.basename(id, path.extname(id));
  magicString.overwrite(left.start, left.end, exportsName);
  magicString.prependRight(left.start, 'var ');
  exportDeclarations.push(`export default ${exportsName};`);
  const exportBlock = `\n\n${exportDeclarations.join('\n')}`;
  magicString.trim().append(exportBlock);
  return {
    code: magicString.toString()
  }
}
```

### <font style="color:rgb(51, 51, 51);">rollup.config.js</font>
```diff
//import babel from '@rollup/plugin-babel'
//import babel from './plugins/rollup-plugin-babel.js'
//import commonjs from '@rollup/plugin-commonjs'
+import commonjs from './plugins/rollup-plugin-commonjs'
export default {
  input: "./src/index.js",
  output: {
    dir: 'dist'
  },
  plugins: [
    //babel(),
+   commonjs()
  ]
}
```

## <font style="color:rgb(51, 51, 51);">@rollup/plugin-node-resolve</font>
### <font style="color:rgb(51, 51, 51);">安装</font>
```shell
pnpm add @rollup/plugin-node-resolve check-is-array -D
```

### <font style="color:rgb(51, 51, 51);">src</font>
#### <font style="color:rgb(51, 51, 51);">index.js</font>
```javascript
import isArray from 'check-is-array';
console.log(isArray);
```

### <font style="color:rgb(51, 51, 51);">rollup-plugin-node-resolve.js</font>
```javascript
import path from 'path';
import Module from 'module';
function resolve() {
  return {
    name: 'resolve',
    //因为我们要改造根据模块的名称查找模所路径的逻辑
    async resolveId(importee, importer) {
      //如果是相对路径，则走默认逻辑
      if (importee[0] === '.' || path.isAbsolute(importee)) {
        return null;
      }
      let location = Module.createRequire(path.dirname(importer)).resolve(importee);
      console.log(location);
      return location;
    }
  }
}
export default resolve;
```

## <font style="color:rgb(51, 51, 51);">@rollup/plugin-alias</font>
### <font style="color:rgb(51, 51, 51);">rollup.config.js</font>
```javascript
import resolve from './plugins/rollup-plugin-node-resolve.js';
//import alias from '@rollup/plugin-alias';
import alias from './plugins/rollup-plugin-alias.js';

export default {
  input: './src/index.js',
  //watch: true,
  output: {
    //file: 'dist/main.js',
    dir: 'dist'
  },
  plugins: [
    resolve(),
    alias({
      entries: [
        { find: './xx.js', replacement: 'check-is-array' }
      ]
    }),
  ],
  watch: {
    clearScreen: false
  }
}
```

### <font style="color:rgb(51, 51, 51);">rollup-plugin-alias.js</font>
```javascript
function matches(pattern, importee) {
  if (pattern instanceof RegExp) {
    return pattern.test(importee);
  }
  if (importee.length < pattern.length) {
    return false;
  }
  if (importee === pattern) {
    return true;
  }
  return importee.startsWith(pattern + '/');
}

function alias(options = {}) {
  const { entries } = options;
  if (entries.length === 0) {
    return {
      name: 'alias',
      resolveId: () => null
    };
  }
  return {
    name: 'alias',
    resolveId(importee, importer) {
      if (!importer) {
        return null;
      }
      const matchedEntry = entries.find((entry) => matches(entry.find, importee));
      if (!matchedEntry) {
        return null;
      }
      const updatedId = importee.replace(matchedEntry.find, matchedEntry.replacement);
      //调用this.resolve意味着重新解析
      return this.resolve(updatedId, importer, Object.assign({ skipSelf: true }))
        .then((resolved) => resolved || { id: updatedId });
    }
  };
}
export default alias;
```

# 源码
[GitHub - lotosv2010/g-rollup: 实现简版的 rollup](https://github.com/lotosv2010/g-rollup)

