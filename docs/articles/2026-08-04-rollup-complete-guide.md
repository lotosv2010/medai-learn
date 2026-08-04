# Rollup 完整指南：从实战配置到源码原理再到插件体系（面试收藏级）

> 面试官把白板递给你：「说说 Rollup 的 Tree-shaking 是怎么实现的？」你知道「静态分析 + 消除无用代码」，但再往下追——「为什么 Webpack 做 Tree-shaking 比 Rollup 难？」「变量修改语句怎么处理？」「变量名冲突怎么解决？」这条追问链，今天全部讲透。

---

## 🎯 这篇文章解决什么问题

Rollup 是 Vue、React、Angular 等顶级框架共同选择的库打包工具，面试里出现频率极高却很少被系统讲解。很多人会用，但说不清：为什么 Rollup 天生适合打库？output.format 那几个选项到底有什么区别？插件钩子怎么理解？Tree-shaking 的底层逻辑是什么？

这篇文章从三个维度彻底拆解 Rollup：**实战配置（怎么用）→ 源码原理（怎么实现）→ 插件体系（怎么扩展）**。每个知识点讲透原理，立刻给出面试怎么答。

---

## 🚀 Rollup 是什么：库打包的标准选择

Rollup 是下一代 ES 模块打包器，核心定位是「**把小块代码编译成大块复杂的代码，例如 library 或应用程序**」。

为什么 Vue、React 都选 Rollup 而不是 Webpack？

- **Webpack** 打包非常繁琐，产物体积比较大，适合应用层（有完整的 HMR、代码分割、静态资源处理）
- **Rollup** 专注于 ES 模块，产物干净，Tree-shaking 是一等公民，天然适合打 JS 库

> 💬 **面试官**：Rollup 和 Webpack 的适用场景有什么区别？
>
> ✅ 标准答案：Webpack 适合打应用（SPA/MPA），有完整的 HMR、代码分割、loader 生态；Rollup 适合打库，产物干净，原生支持 ESM 输出，Tree-shaking 效果更彻底。
> 🎁 加分答案：Vite 开发时用原生 ESM + esbuild，**生产构建底层用的正是 Rollup**——Vue 官方应用场景分工如此，本质原因是 Rollup 的产物更精简。

---

## ⚙️ 实战配置：从零搭建到生产级分离

### 初始化与基础配置

安装依赖：

```bash
pnpm add rollup cross-env -D
```

最简 `rollup.config.js`：

```javascript
export default {
  input: 'src/main.js',
  output: {
    file: 'dist/bundle.js',
    format: 'umd',       // 输出格式，见下方对比表
    sourcemap: true,
    name: 'bundleName'   // format 为 iife/umd 时必填，挂到 window 上
  },
  plugins: []
};
```

`package.json` 脚本：

```json
{
  "type": "module",
  "scripts": {
    "dev": "cross-env NODE_ENV=development rollup -c -w",
    "build": "cross-env NODE_ENV=production rollup -c"
  }
}
```

### output.format 六种格式对比

这是面试必考点，六种格式的适用场景需要背清楚：

| format | 全称 | 适用场景 |
|--------|------|---------|
| `es` | ES Module | 现代浏览器 / Vite / 库的 ESM 输出 |
| `cjs` | CommonJS | Node.js 环境 |
| `umd` | Universal Module Definition | 浏览器 + Node.js 都能用（库的通用格式） |
| `iife` | Immediately Invoked Function | 直接用 `<script>` 标签引入 |
| `amd` | Asynchronous Module Definition | RequireJS 场景（较少用） |
| `system` | SystemJS | SystemJS 模块系统（较少用） |

> 💬 **面试官**：打一个给浏览器和 Node.js 都能用的 SDK，output.format 选什么？
>
> ✅ 标准答案：选 `umd`，它是通用格式，会自动判断环境（AMD / CommonJS / 全局变量），一份产物三端通用。
> 🎁 加分答案：现代库更推荐同时输出 `es` + `cjs` 两份产物，在 `package.json` 里通过 `exports` 字段区分，让打包工具按需选择。这是 dual package 模式，也是 npm 库的最佳实践。

### 逐步集成插件生态

Rollup 默认只处理 ES 模块，实际项目需要一步步集成能力：

**第一步：支持 CommonJS 依赖**

```javascript
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';

export default {
  plugins: [
    resolve(),    // 查找 node_modules 里的模块
    commonjs(),   // 把 CommonJS 转成 ES Module
  ]
};
```

**第二步：加入 Babel 转译**

```javascript
import babel from '@rollup/plugin-babel';

// .babelrc
{ "presets": [["@babel/preset-env", { "modules": false }]] }

// rollup.config.js plugins
babel({ babelHelpers: 'bundled', exclude: 'node_modules/**' })
```

`modules: false` 告诉 Babel 不要把 `import/export` 转成 CommonJS——这件事交给 Rollup 处理。

**第三步：接入 TypeScript**

```javascript
import typescript from '@rollup/plugin-typescript';

// tsconfig.json 关键配置
{
  "compilerOptions": {
    "module": "ESNext",  // 让 TS 保留 ESM 语法
    "noEmit": true       // 编译输出交给 Rollup，TS 只做类型检查
  }
}
```

**第四步：压缩 + CSS + 本地服务器**

```javascript
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
```

### 生产/开发环境分离

把配置拆成两个文件，开发环境加 serve + livereload，生产环境加 terser 压缩：

```bash
# package.json
"dev": "cross-env NODE_ENV=development rollup -c rollup.config.dev.js -w"
"build": "cross-env NODE_ENV=production rollup -c rollup.config.prod.js"
```

### 最终项目结构与完整配置

完整集成后的目录：

```
├── src/
│   ├── main.ts          ← 入口
│   ├── foo.ts
│   ├── main.css / main.less / main.scss
├── dist/                ← Rollup 产物
│   ├── bundle.js
│   └── index.html
├── rollup.config.dev.js
├── rollup.config.prod.js
├── tsconfig.json
└── .babelrc
```

`rollup.config.prod.js`（生产环境全量插件汇总）：

```javascript
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';

export default {
  input: 'src/main.ts',
  output: {
    file: 'dist/bundle.js', format: 'umd',
    sourcemap: true, name: 'bundleName',
    globals: { lodash: '_', jquery: '$' }
  },
  external: ['lodash', 'jquery'],
  plugins: [
    resolve(), commonjs(),
    babel({ babelHelpers: 'bundled', exclude: 'node_modules/**' }),
    typescript(),
    terser(),
    postcss({ extensions: ['.css', '.scss', '.less'] })
  ]
};
```

开发环境（`rollup.config.dev.js`）在此基础上去掉 `terser`，加上 `serve({ contentBase: 'dist', port: 3000, open: true })` 和 `livereload('dist')`。

### 外部依赖 + CDN 引入

不把 lodash/jQuery 打进 bundle，改用 CDN，节省体积：

```javascript
export default {
  external: ['lodash', 'jquery'],  // 排除出 bundle
  output: {
    globals: {
      lodash: '_',    // 告诉 Rollup 这个模块在全局叫什么名字
      jquery: '$'
    }
  }
};
```

在 HTML 里用 CDN 引入即可：

```html
<script src="https://cdn.jsdelivr.net/npm/lodash/lodash.min.js"></script>
<script src="bundle.js"></script>
```

🔧 **真实场景**：在药品 SDK 里，`lodash` 是外部依赖，打包时排除它，让宿主环境自行注入。这样 SDK 体积从 200KB 降到 15KB，这是面试时能讲出来的「实际优化效果」。

---

## 🌳 Tree-shaking 原理：Rollup 的核心竞争力

Tree-shaking 的本质是**消除无用的 JS 代码**。Rollup 只处理函数和顶层的 `import/export` 变量——这句话背后是一套完整的静态分析机制。

### 为什么 Rollup 比 Webpack 更擅长 Tree-shaking

**关键在于模块格式**。CommonJS 的 `require()` 是动态的，运行时才知道导入什么：

```javascript
// 这种写法无法静态分析
const utils = require(condition ? './a' : './b');
```

ES Module 的 `import` 是静态的，编译时就能建立完整的依赖图：

```javascript
import { name } from './foo.js';  // 静态，可分析
```

Rollup 从 ES Module 出发，设计之初就把静态分析作为核心，所以 Tree-shaking 效果比 Webpack 彻底。

> 💬 **面试官**：Rollup 的 Tree-shaking 是怎么实现的？
>
> ✅ 标准答案：Rollup 基于 ES Module 的静态分析——解析 AST，建立依赖图，只把真正被引用的导出变量对应的语句包含进产物，未被引用的导出和其依赖链全部丢弃。
> 🎁 加分答案：Rollup 不仅分析「哪些变量被 import」，还会追踪「变量的修改语句」。如果你 `export let name = 'msg'; name += 's';`，后面那行修改语句也会被一起包含进来，否则产物语义会出错。这是面试官真正想确认你理解的细节。

---

## 🔬 源码原理：手写简版 Rollup

理解 Rollup 工作原理最好的方式，是手写一个简版。核心依赖：

- **acorn**：JS 解析器，把代码转成 AST
- **magic-string**：字符串操作 + sourcemap 生成工具

### 前置知识：AST 和作用域

**AST 的工作流**：

```
源代码 → Parse（词法分析 + 语法分析）→ AST → Transform（转换）→ Generate（生成代码）
```

acorn 解析结果符合 ESTree 规范，可以在 `astexplorer.net` 直观看到任意代码的 AST 结构。

**magic-string** 的核心用法：

```javascript
const ms = new MagicString(sourceCode);
ms.snip(0, 6)   // 裁剪（克隆一段）
ms.remove(0, 7) // 删除
ms.overwrite(start, end, replacement)  // 替换
ms.toString()   // 输出最终字符串
```

**作用域链** 通过 Scope 类实现，`findDefiningScope` 沿父链查找变量定义位置：

```javascript
class Scope {
  constructor(options = {}) {
    this.name = options.name;
    this.parent = options.parent;
    this.names = options.names || [];
    this.isBlock = !!options.isBlock;  // 是否块级作用域
  }
  add(name, isBlockDeclaration) {
    if (!isBlockDeclaration && this.isBlock) {
      this.parent.add(name, isBlockDeclaration); // var 声明提升
    } else {
      this.names.push(name);
    }
  }
  findDefiningScope(name) {
    if (this.names.includes(name)) return this;
    if (this.parent) return this.parent.findDefiningScope(name);
    return null;
  }
}
```

### 核心架构：四个类的协作

```
rollup.js（入口）
  └── Bundle（打包主控）
        ├── fetchModule()  → 读文件、创建模块
        ├── write()        → 触发分析 + 生成产物
        ├── generate()     → 拼接 MagicString
        └── deconflict()   → 变量名去重
              └── Module（每个文件对应一个模块）
                    ├── imports / exports / definitions / modifications
                    ├── expandAllStatements()  → 展开全部语句
                    ├── expandStatement()      → 展开单条语句
                    └── define()               → 按需拉取依赖定义
```

### 分析阶段：两次循环

`analyses.js` 对每个模块做两次 AST 遍历：

**第一次循环**：找出 `import` 和 `export` 声明，建立 `module.imports` 和 `module.exports` 映射：

```javascript
// import { name } from './msg' →
module.imports['name'] = { source: './msg', importName: 'name' }

// export const age = 18 →
module.exports['age'] = { localName: 'age' }
```

**第二次循环**：用 walk 遍历 AST，建立作用域链，为每条顶级语句打标记：

```javascript
statement._defines    // 此语句定义了哪些变量
statement._dependsOn  // 此语句读取了哪些变量
statement._modifies   // 此语句修改了哪些变量
```

`checkForReads` 和 `checkForWrites` 分别收集读取和修改信息：

```javascript
function checkForReads(node) {
  if (node.type === 'Identifier') {
    statement._dependsOn[node.name] = true;
  }
}
function checkForWrites(node) {
  if (node.type === 'AssignmentExpression') addNode(node.left);
  if (node.type === 'UpdateExpression') addNode(node.argument);
}
```

### Tree-shaking 核心：按需展开语句

`Module.expandStatement` 是 Tree-shaking 的心脏：

```javascript
expandStatement(statement) {
  statement._included = true;
  const result = [];
  // 1. 先把此语句依赖的变量定义拉进来
  Object.keys(statement._dependsOn).forEach(name => {
    result.push(...this.define(name));
  });
  result.push(statement);
  // 2. 再把此语句定义的变量的修改语句也带上
  Object.keys(statement._defines).forEach(name => {
    const modifications = this.modifications[name];
    if (modifications) {
      modifications.forEach(s => {
        if (!s._included) result.push(...this.expandStatement(s));
      });
    }
  });
  return result;
}
```

`define(name)` 判断变量来源：

```javascript
define(name) {
  if (this.imports[name]) {
    // 外部导入的：跨模块追踪
    const { source, importName } = this.imports[name];
    const importModule = this.bundle.fetchModule(source, this.path);
    const { localName } = importModule.exports[importName];
    return importModule.define(localName);
  } else {
    // 本模块定义的：展开定义语句
    const statement = this.definitions[name];
    if (statement && !statement._included) {
      return this.expandStatement(statement);
    }
    return [];
  }
}
```

### 变量名冲突解决：deconflict

多个模块都有 `const age = '年龄'`，合并后会冲突。`Bundle.deconflict()` 负责重命名：

```javascript
deconflict() {
  const defines = {}, conflicts = {};
  this.statements.forEach(statement => {
    Object.keys(statement._defines).forEach(name => {
      if (defines[name]) conflicts[name] = true;
      else defines[name] = [];
      defines[name].push(statement._module);
    });
  });
  Object.keys(conflicts).forEach(name => {
    const modules = defines[name];
    modules.pop(); // 最后一个模块保留原名
    modules.forEach((module, index) => {
      module.rename(name, `${name}$${modules.length - index}`);
    });
  });
}
```

最终产物中，`age1.js` 的 `age` 变成 `age$2`，`age2.js` 变成 `age$1`，`age3.js` 保留 `age`。

重命名信息写入 `module.canonicalNames`，`Bundle.generate()` 在拼接每条语句时调用 `replaceIdentifiers` 把 AST 里所有对应的 `Identifier` 节点替换掉：

```javascript
// utils.js — 遍历 AST，用 magic-string.overwrite 替换标识符
function replaceIdentifiers(statement, source, replacements) {
  walk(statement, {
    enter(node) {
      if (node.type === 'Identifier' && replacements[node.name]) {
        source.overwrite(node.start, node.end, replacements[node.name]);
      }
    }
  });
}
```

```javascript
// Bundle.generate() 中的替换逻辑
this.statements.forEach(statement => {
  const replacements = {};
  Object.keys(statement._dependsOn)
    .concat(Object.keys(statement._defines))
    .forEach(name => {
      const canonical = statement._module.getCanonicalName(name);
      if (canonical !== name) replacements[name] = canonical;
    });
  const source = statement._source.clone();
  if (statement.type === 'ExportNamedDeclaration') {
    source.remove(statement.start, statement.declaration.start);
  }
  replaceIdentifiers(statement, source, replacements);
  magicString.addSource({ content: source, separator: '\n' });
});
```

整条链路：`deconflict` 计算重命名 → `module.rename()` 写入 `canonicalNames` → `generate()` 遍历语句时查 `getCanonicalName()` → `replaceIdentifiers` 用 `magic-string.overwrite` 精确替换字符位置 → 产物里变量名不再冲突。

> 💬 **面试官**：多个模块有同名变量，Rollup 是怎么处理的？
>
> ✅ 标准答案：Rollup 在 `deconflict` 阶段扫描所有语句的 `_defines`，找出冲突变量，给前面的模块的变量加数字后缀重命名，最后一个模块保留原名。
> 🎁 加分答案：重命名信息存在 `module.canonicalNames` 里，生成代码时 `Bundle.generate()` 为每条语句构建 `replacements` 映射，用 `replaceIdentifiers` + `magic-string.overwrite` 把 AST 中所有对应 Identifier 精确替换到字符位置，不影响其他代码。

---

## 🔌 插件体系：Build Hooks + Output Hooks

Rollup 插件是一个对象，包含 `name` 属性和若干钩子函数：

```javascript
export default function myPlugin(options = {}) {
  return {
    name: 'my-plugin', // 错误信息里会显示
    // 在这里声明钩子
  };
}
```

### 钩子的四种执行模式

| 类型 | 行为 |
|------|------|
| `async` | 可返回 Promise，否则为 `sync` |
| `first` | 多个插件按顺序运行，第一个返回非 null/undefined 的值就停止 |
| `sequential` | 多个插件按顺序全部运行，异步的等待完成再执行下一个 |
| `parallel` | 多个插件并行运行，异步的不等待 |

### Build Hooks：构建阶段钩子

构建阶段由 `rollup.rollup(inputOptions)` 触发，按执行顺序：

```
options → buildStart → resolveId → load → shouldTransformCachedModule
→ transform → moduleParsed → resolveDynamicImport → buildEnd
```

**options**（async, sequential）：修改传入的 inputOptions，是构建阶段第一个钩子。

**buildStart**（async, parallel）：构建开始，推荐在此读取最终配置（比 `options` 晚，已合并所有 hooks 的变换）。

**resolveId**（async, first）：定义自定义解析器，决定模块 ID。返回 `null` 走默认逻辑，返回 `false` 标记为外部模块。

```javascript
resolveId(source, importer) {
  if (source === 'virtual') return source; // 拦截，作为虚拟模块
  return null;                             // 走默认解析
}
```

**load**（async, first）：自定义模块内容加载。返回 `null` 走默认（从文件系统读取）。常用于虚拟模块：

```javascript
load(id) {
  if (id === 'virtual') return `export default "virtual"`;
  return null;
}
```

**transform**（async, sequential）：转换单个模块内容，返回 `{ code, ast, map }` 对象。最常用的钩子，babel 插件、ts 插件都在这里处理：

```javascript
async transform(code, id) {
  if (!filter(id)) return null;
  const result = await babel.transformAsync(code, { babelrc: false, filename: id });
  return { ast: result.ast, code: result.code, map: result.map };
}
```

**moduleParsed**（async, parallel）：模块完全解析后调用，不走缓存，可获取最终 AST 和元数据。

**buildEnd**（async, parallel）：构建完成，在 `generate` 或 `write` 之前调用。有错误时接收 error 参数。

### 典型案例：polyfill 注入插件

在所有入口点自动注入 polyfill，核心利用 `resolveId` + `load` 的 proxy 模式：

```javascript
export default function injectPolyfillPlugin() {
  return {
    name: 'inject-polyfill',
    async resolveId(source, importer, options) {
      if (source === POLYFILL_ID) {
        return { id: POLYFILL_ID, moduleSideEffects: true };
      }
      if (options.isEntry) {
        const resolution = await this.resolve(source, importer, { skipSelf: true, ...options });
        if (!resolution || resolution.external) return resolution;
        const moduleInfo = await this.load(resolution);
        moduleInfo.moduleSideEffects = true;
        return `${resolution.id}${PROXY_SUFFIX}`;
      }
      return null;
    },
    load(id) {
      if (id.endsWith(PROXY_SUFFIX)) {
        const entryId = id.slice(0, -PROXY_SUFFIX.length);
        let code = `import ${JSON.stringify(POLYFILL_ID)};`
                 + `export * from ${JSON.stringify(entryId)};`;
        return code;
      }
      return null;
    }
  };
}
```

### Output Generation Hooks：输出阶段钩子

输出阶段由 `bundle.generate()` / `bundle.write()` 触发，按执行顺序：

```
outputOptions → renderStart → renderDynamicImport → resolveFileUrl
→ resolveImportMeta → banner/footer/intro/outro → renderChunk
→ augmentChunkHash → generateBundle → writeBundle → closeBundle
```

**generateBundle**（async, sequential）：生成产物后、写入文件前调用，常用于生成 HTML 入口文件：

```javascript
generateBundle(options, bundle) {
  let entryName;
  for (let fileName in bundle) {
    if (bundle[fileName].isEntry) entryName = fileName;
  }
  this.emitFile({
    type: 'asset',
    fileName: 'index.html',
    source: `<!DOCTYPE html><html><body>
      <script src="${entryName}" type="module"></script>
    </body></html>`
  });
}
```

**renderChunk**（async, sequential）：转换单个输出 chunk，对产物做最后处理。

**closeBundle**（async, parallel）：`bundle.close()` 后调用，用于清理外部服务。

### Plugin Context 核心 API

插件钩子内可访问 `this` 上的上下文方法：

- `this.emitFile(file)`：产出新文件（chunk 或 asset）
- `this.resolve(importee, importer)`：手动解析模块 ID
- `this.load({ id })`：预加载模块
- `this.getModuleInfo(moduleId)`：获取模块元数据

### 实战案例：手写 commonjs 和 alias 插件

**`@rollup/plugin-commonjs` 核心逻辑**：用 `transform` 钩子把 `module.exports = xxx` 转换为 ES Module：

```javascript
function transformCommonjs(code, id, ast) {
  const magicString = new MagicString(code);
  // 找到 module.exports 赋值
  // 把 module.exports 替换成变量名，追加 export default
  const exportsName = path.basename(id, path.extname(id));
  magicString.overwrite(left.start, left.end, exportsName);
  magicString.prependRight(left.start, 'var ');
  magicString.trim().append(`\nexport default ${exportsName};`);
  return { code: magicString.toString() };
}
```

**`@rollup/plugin-alias` 核心逻辑**：在 `resolveId` 钩子里做路径替换：

```javascript
resolveId(importee, importer) {
  const matchedEntry = entries.find(e => matches(e.find, importee));
  if (!matchedEntry) return null;
  const updatedId = importee.replace(matchedEntry.find, matchedEntry.replacement);
  return this.resolve(updatedId, importer, { skipSelf: true });
}
```

> 💬 **面试官**：如果让你手写一个 Rollup 插件，支持 `import style from './foo.css'`，你从哪个钩子入手？
>
> ✅ 标准答案：用 `transform` 钩子。拦截 `.css` 后缀的文件，读取内容，返回生成一个 JS 模块（把 CSS 文本导出，或注入到 `<style>` 标签）。
> 🎁 加分答案：如果需要提取成独立 CSS 文件，还要在 `generateBundle` 里用 `this.emitFile` 输出 asset，并在 `transform` 里只返回一个空的 JS 占位模块。这正是 `rollup-plugin-postcss` 的 `extract` 模式的实现原理。

---

## 💡 一张图总结（面试速记）

| 知识点 | 一句话解释 | 面试频率 |
|--------|-----------|---------|
| output.format | 六种输出格式，库推荐 es+cjs 双产物 | ⭐⭐⭐⭐⭐ |
| Tree-shaking | 静态分析 `_defines`/`_dependsOn`，按需展开语句 | ⭐⭐⭐⭐⭐ |
| external + globals | 外部依赖排除 + CDN 变量名映射 | ⭐⭐⭐⭐ |
| Build Hooks 顺序 | options→buildStart→resolveId→load→transform→buildEnd | ⭐⭐⭐⭐ |
| resolveId 钩子 | 返回 null 走默认，返回 false 标记外部 | ⭐⭐⭐⭐ |
| transform 钩子 | async+sequential，可返回 code/ast/map | ⭐⭐⭐⭐⭐ |
| generateBundle | 产物生成后、写入前，可 emitFile 追加资源 | ⭐⭐⭐⭐ |
| deconflict | 多模块同名变量自动加后缀，最后一个保留原名 | ⭐⭐⭐ |
| replaceIdentifiers | walk AST + magic-string.overwrite 精确替换字符位置 | ⭐⭐⭐ |
| magic-string | 带 sourcemap 的字符串操作，snip/remove/overwrite | ⭐⭐⭐ |
| AST 两次循环 | 第一次建 imports/exports，第二次建作用域和依赖关系 | ⭐⭐⭐⭐ |

---

## 📝 留个问题

Rollup 的 `transform` 钩子是 `async, sequential`，意味着多个插件的 `transform` 会串行执行。而 `moduleParsed` 是 `async, parallel`，多个插件并行。

**问题**：`rollup-plugin-postcss` 和 `@rollup/plugin-babel` 同时存在时，它们的 `transform` 执行顺序是什么？如果 postcss 的 `transform` 对 `.js` 文件返回了 `null`，下一个插件还会收到调用吗？

欢迎在评论区分享你的思考。

---

> 🔖 这是「前端工程化系列」第 7 篇。上一篇：《Vite 完全指南：从基本使用到原理实现（面试收藏级）》；下一篇预告：《CSS 工程化完整指南：从模块化方案到设计系统（面试收藏级）》
