# <font style="color:rgb(51, 51, 51);">前置知识</font>
## <font style="color:rgb(51, 51, 51);">初始化项目</font>
```shell
pnpm add rollup magic-string acorn -S
pnpm add rimraf -D
```

## <font style="color:rgb(51, 51, 51);">magic-string</font>
+ [magic-string](https://www.npmjs.com/package/magic-string)<font style="color:rgb(51, 51, 51);">是一个操作字符串和生成source-map的工具</font>

```javascript
var MagicString = require('magic-string');
let sourceCode = `export var name = "test"`;
let ms = new MagicString(sourceCode);
console.log(ms.toString());
//裁剪出原始字符串开始和结束之间所有的内容
//返回一个克隆后的MagicString的实例
console.log(ms.snip(0, 6).toString());//sourceCode.slice(0,6);
//删除0, 7之间的内容
console.log(ms.remove(0, 7).toString());//sourceCode.slice(7);

//还可以用用来合并代码 //TODO
let bundle = new MagicString.Bundle();
bundle.addSource({
  content: 'var a = 1;',
  separator: '\n'
});
bundle.addSource({
  content: 'var b = 2;',
  separator: '\n'
});
console.log(bundle.toString());
```

## <font style="color:rgb(51, 51, 51);">AST</font>
+ <font style="color:rgb(51, 51, 51);">通过</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">JavaScript Parser</font>`<font style="color:rgb(51, 51, 51);">可以把代码转化为一颗抽象语法树AST,这颗树定义了代码的结构，通过操纵这颗树，我们可以精准的定位到声明语句、赋值语句、运算语句等等，实现对代码的分析、优化、变更等操作</font>

<!-- 这是一张图片，ocr 内容为：TOKEN "PROGRAM", "TYPE" "BODY":[[ "TYPE": VARIABLEDECLANATION", "KIN "VAR" "DECLARATIONS" ] STRING IDENTIFIER "TYPE":"VARIABLEDECLARATO "ID": "IDENTIFIER", "TYPE" VAR AST "IS TREE"; AST 'NAME" EQUAL KEYWORD INIT": SEMICOLON "TYPE":"LITERAL'', "VALUE":"IS TREE", "RAW":"\"IS TREE\""""" 打 JAVASCRIPT AST -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1748938872198-22dc0005-b8e7-4c15-a6e8-7befbd3aada2.png)

### <font style="color:rgb(51, 51, 51);">AST工作流</font>
+ <font style="color:rgb(51, 51, 51);">Parse(解析) 将源代码转换成抽象语法树，树上有很多的estree节点</font>
+ <font style="color:rgb(51, 51, 51);">Transform(转换) 对抽象语法树进行转换</font>
+ <font style="color:rgb(51, 51, 51);">Generate(代码生成) 将上一步经过转换过的抽象语法树生成新的代码</font>

<!-- 这是一张图片，ocr 内容为：PARSER 解析 00000 0000 NODE LEXICAL ANALYSIS CODE 调法分析 源代码 生成 SYNTACTIC ANALYSIS NODE NODE 转换 源代码 NODE NODE NODE 语法分析 AST AST TOKENS LOTOS -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1748939117618-25a6334f-4586-4e82-9865-dae670da881e.png)

### <font style="color:rgb(51, 51, 51);">acorn</font>
+ [AST explorer](https://astexplorer.net/)<font style="color:rgb(51, 51, 51);">可以把代码转成语法树</font>
+ <font style="color:rgb(51, 51, 51);">acorn 解析结果符合</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">The Estree Spec</font>`<font style="color:rgb(51, 51, 51);">规范</font>

<!-- 这是一张图片，ocr 内容为：AST EXPLORER PARSER:ACORN-8.7.0 DEFAULT JAVASCRIPT SNIPPET TRANSFORM ACOM 1 IMPORT $ FROM "JQUERY" JSON TREE 4MS AUTOFOCUS HIDE LOCATION DATA "HIDE TYPE KEYS HIDE METHODS HIDE EMPTY KEYS PROGRAM TYPE:"PROGRAM" -BODY:[ IMPORTDECLARATION TYPE:"LMPORTDECLARATION" SPECIFIERS :[FELEMENT] SOURCE:LITERAL TYPE: "LITERAL" VALUE: JQUERY RAW: 'IJQUERY SOURCETYPE :"MODULE" -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1748939237462-e4c4716a-6a50-403a-8870-fb3b23a06dd0.png)

#### <font style="color:rgb(51, 51, 51);">walk.js</font>
```javascript
function walk(astNode, { enter, leave }) {
  visit(astNode, null, enter, leave);
}
function visit(node, parent, enter, leave) {
  if (enter) {
    enter.call(null, node, parent);
  }
  let keys = Object.keys(node).filter(key => typeof node[key] === 'object')
  keys.forEach(key => {
    let value = node[key];
    if (Array.isArray(value)) {
      value.forEach(val => {
        if (val.type) {
          visit(val, node, enter, leave);
        }
      });
    } else if (value && value.type) {
      visit(value, node, enter, leave)
    }
  });
  if (leave) {
    leave.call(null, node, parent);
  }
}

module.exports = walk;
```

#### <font style="color:rgb(51, 51, 51);">use.js</font>
```javascript
const acorn = require('acorn');
const walk = require('./walk');
const sourceCode = 'import $ from "jquery"'
const ast = acorn.parse(sourceCode, {
  sourceType: 'module',
  ecmaVersion: 8
});
let indent = 0;
const padding = () => ' '.repeat(indent)
ast.body.forEach((statement) => {
  walk(statement, {
    enter(node) {
      if (node.type) {
        console.log(padding() + node.type + "进入");
        indent += 2;
      }
    },
    leave(node) {
      if (node.type) {
        indent -= 2;
        console.log(padding() + node.type + "离开");
      }
    }
  });
});
```

<!-- 这是一张图片，ocr 内容为：PROGRAM TYPE:"PROGRAM" BODY: LMPORTDECLARATION TYPE:"LMPORTDECLARATION" SPECIFIERS: IMPORTDEFAULTSPECIFIER 2 TYPE:"LMPORTDEFAULTSPECIFIER" LOCAL: IDENTIFIER $NODE TYPE:"LDENTIFIER" NAME: "$" 4 SOURCE: LITERAL TYPE: "LITERAL" VALUE:"JQUERY" "\JQUERY\""" RAW: SOURCETYPE:"MODULE" -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1748940329937-36fd91c3-c626-4a49-a26e-50c261566371.png)

```plain
ImportDeclaration进入
  ImportDefaultSpecifier进入
    Identifier进入
    Identifier离开
  ImportDefaultSpecifier离开
  Literal进入
  Literal离开
ImportDeclaration离开
```

## <font style="color:rgb(51, 51, 51);">作用域</font>
### <font style="color:rgb(51, 51, 51);">作用域</font>
+ <font style="color:rgb(51, 51, 51);">在JS中，作用域是用来规定变量访问范围的规则</font>

```javascript
function one() {
  var a = 1;
}
console.log(a);
```

### <font style="color:rgb(51, 51, 51);">作用域链</font>
+ <font style="color:rgb(51, 51, 51);">作用域链是由当前执行环境与上层执行环境的一系列变量对象组成的，它保证了当前执行环境对符合访问权限的变量和函数的有序访问</font>

#### <font style="color:rgb(51, 51, 51);">scope.js</font>
```javascript
class Scope {
  constructor(options = {}) {
    //作用域的名称
    this.name = options.name;
    //父作用域
    this.parent = options.parent;
    //此作用域内定义的变量
    this.names = options.names || [];
  }
  add(name) {
    this.names.push(name);
  }
  findDefiningScope(name) {
    if (this.names.includes(name)) {
      return this;
    } else if (this.parent) {
      return this.parent.findDefiningScope(name);
    } else {
      return null;
    }
  }
}
module.exports = Scope;
```

#### <font style="color:rgb(51, 51, 51);">useScope.js</font>
```javascript
// var a = 1;
// function one() {
//   var b = 1;
//   function two() {
//     var c = 2;
//     console.log(a, b, c);
//   }
// }
let Scope = require('./scope');
let globalScope = new Scope({ name: 'global', names: ['a'], parent: null });
let oneScope = new Scope({ name: 'one', names: ['b'], parent: globalScope });
let twoScope = new Scope({ name: 'two', names: ['c'], parent: oneScope });
console.log(
  twoScope.findDefiningScope('a').name,
  twoScope.findDefiningScope('b').name,
  twoScope.findDefiningScope('c').name
)
```

# <font style="color:rgb(51, 51, 51);">实现rollup</font>
## <font style="color:rgb(51, 51, 51);">目录结构</font>
+ [GitHub - lotosv2010/g-rollup: 实现简版的 rollup](https://github.com/lotosv2010/g-rollup)

```plain
├── package.json
├── README.md
├── src
    ├── main.js
├── lib
    ├── ast
    │   ├── analyse.js //分析AST节点的作用域和依赖项
    │   ├── Scope.js //有些语句会创建新的作用域实例
    │   └── walk.js //提供了递归遍历AST语法树的功能
    ├── Bundle//打包工具，在打包的时候会生成一个Bundle实例，并收集其它模块，最后把所有代码打包在一起输出
    │   └── index.js 
    ├── Module//每个文件都是一个模块
    │   └── index.js
    ├── rollup.js //打包的入口模块
    └── utils
        ├── map-helpers.js
        ├── object.js
        └── promise.js
```

## package.json
```json
{
  "name": "g-rollup",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "dev": "node test/debugger.js",
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

## <font style="color:rgb(51, 51, 51);">src</font>
### <font style="color:rgb(51, 51, 51);">main.js</font>
```javascript
console.log("Hello Rollup!!!");
```

## <font style="color:rgb(51, 51, 51);">debugger.js</font>
```javascript
const path = require("path");
const { rollup } = require("../lib/rollup");

const input = path.resolve(__dirname, "../src/main.js");
const output = path.resolve(__dirname, "../dist/main.js");

debugger;

rollup({
  input,
  plugins: [],
}).then((bundle) => {
  bundle.write({
    file: output,
    format: "cjs",
  });
});
```

## <font style="color:rgb(51, 51, 51);">lib</font>
### <font style="color:rgb(51, 51, 51);">rollup.js</font>
```javascript
const Bundle = require("./bundle");

/**
 * 打包入口，返回一个bundle对象
 * @param {object} options 打包参数
 * @returns bundle对象
 */
async function rollup(options) {
  const { input: entry } = options; // 入口文件
  const bundle = new Bundle({ entry }); // 生成bundle对象
  return bundle;
}
module.exports = { rollup };
```

### <font style="color:rgb(51, 51, 51);">bundle.js</font>
```javascript
const fs = require("fs");
const path = require("path");
const Module = require("./module");
const MagicString = require("magic-string");

/**
 * 模块打包类
 */
class Bundle {
  constructor(options) {
    //入口文件数据
    this.entryPath = path.resolve(options.entry.replace(/\.js$/, "") + ".js");
    //存放所有的模块
    this.modules = {};
  }
  /**
   * 输出打包文件
   * @param {object} options 输出文件配置
   */
  write(options) {
    // 获取入口模块
    const { file, format } = options;
    const entryModule = this.fetchModule(this.entryPath); // 获取模块代码
    this.statements = entryModule.expandAllStatements(true); // 展开所有的语句
    const { code } = this.generate(); // 生成打包后的代码
    // 判断文件夹是否存在
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      // 创建文件夹
      fs.mkdirSync(dir);
    }
    fs.writeFileSync(file, code); // 写入文件系统
  }

  /**
   * 获取模块代码
   * @param {string} importee 模块路径
   */
  fetchModule(importee) {
    const route = importee;
    if (route) {
      // 获取模块代码
      const code = fs.readFileSync(route, "utf8");
      // 创建模块
      const module = new Module({
        code,
        path: importee,
        bundle: this,
      });
      return module;
    }
  }
  /**
   * 生成代码
   */
  generate() {
    // 创建魔法字符串
    const magicString = new MagicString.Bundle();
    // 遍历所有模块
    this.statements.forEach((statement) => {
      // 获取模块代码
      const source = statement._source.clone();
      // 添加到魔法字符串中
      magicString.addSource({
        content: source,
        separator: "\n",
      });
    });
    return { code: magicString.toString() };
  }
}

module.exports = Bundle;
```

### <font style="color:rgb(51, 51, 51);">module.js</font>
```javascript
const MagicString = require("magic-string");
const { parse } = require("acorn");
const analyses = require("./ast/analyses");

/**
 * 模块类
 */
class Module {
  constructor({ code, path, bundle }) {
    // 获取代码
    this.code = new MagicString(code, { filename: path });
    // 模块路径
    this.path = path;
    // 模块依赖的模块
    this.bundle = bundle;
    // 模块的抽象语法树
    this.ast = parse(code, {
      ecmaVersion: 8,
      sourceType: "module",
    });
    // 模块的依赖关系
    analyses(this.ast, this.code, this);
  }
  /**
   * 展开所有语句
   */
  expandAllStatements() {
    const allStatements = [];
    this.ast.body.forEach((statement) => {
      const statements = this.expandStatement(statement);
      allStatements.push(...statements);
    });
    return allStatements;
  }
  /**
   * 展开语句
   */
  expandStatement(statement) {
    statement._included = true;
    const result = [];
    result.push(statement);
    return result;
  }
}
module.exports = Module;
```

### <font style="color:rgb(51, 51, 51);">ast</font>
#### <font style="color:rgb(51, 51, 51);">analyses.js</font>
```javascript
/**
 * @description 分析模块对于的AST
 * @param {object} ast 模块的抽象语法树
 * @param {string} code 模块的代码
 * @param {object} module 模块
 */
function analyses(ast, code, module) {
  //给statement定义属性
  ast.body.forEach((statement) => {
    Object.defineProperties(statement, {
      _included: { value: false, writable: true }, // 是否被包含
      _module: { value: module }, // 模块
      _source: { value: code.snip(statement.start, statement.end) }, // 模块的代码
    });
  });
}
module.exports = analyses;

```

# <font style="color:rgb(51, 51, 51);">实现tree-shaking</font>
## <font style="color:rgb(51, 51, 51);">基本原理</font>
+ <font style="color:rgb(51, 51, 51);">第一步</font>
    - <font style="color:rgb(51, 51, 51);">在</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">module</font>`<font style="color:rgb(51, 51, 51);">里收集</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">imports</font>`<font style="color:rgb(51, 51, 51);">、</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">exports</font>`<font style="color:rgb(51, 51, 51);">和</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">definitions</font>`
    - <font style="color:rgb(51, 51, 51);">在</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">analyse</font>`<font style="color:rgb(51, 51, 51);">收集</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">_defines</font>`<font style="color:rgb(51, 51, 51);">和</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">_dependsOn</font>`
+ <font style="color:rgb(51, 51, 51);">第二步</font>
    - <font style="color:rgb(51, 51, 51);">重构</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">expandAllStatements</font>`

## <font style="color:rgb(51, 51, 51);">基本语句</font>
```javascript
// 存放本模块导入了哪些变量
this.imports = {};
// 存放本模块导出了哪些变量
this.exports = {};
// 存放本模块的定义变量的语句
this.definitions = {};
// 此变量存放所有的变量修改语句,key是变量名，值是一个数组
this.modifications = {};//{name:[name+='jiagou'],age:'age++'}
// 记得重命名的变量{key老的变量名:value新的变量名}
this.canonicalNames = {};//{age:'age$1'}
// 本模块从哪个模块导入了什么变量，在当前模块内叫什么名字
//t his.imports.name = {'./msg','name'};
this.imports[localName] = { source, importName }
// 本模块导出了哪个变量，对应哪个本地变量
//t his.exports.name = {localName:'name'};
this.exports[exportName] = { localName };
// 本顶级语句定义的变量
statement._defines[name] = true;
// 定义变量的语句
this.definitions[name] = statement;
// 本语句用到的变量
statement._dependsOn[name] = true;
// 从模块中获取定义变量的语句
module.define(name);
```

## <font style="color:rgb(51, 51, 51);">src</font>
### <font style="color:rgb(51, 51, 51);">main.js</font>
```javascript
import { name, age } from './msg';

function main() {
  console.log(`Hello ${name}!!!`);
}

main();
```

### <font style="color:rgb(51, 51, 51);">msg.js</font>
```javascript
export const name = 'msg';
export const age = 18;
```

## <font style="color:rgb(51, 51, 51);">lib</font>
### <font style="color:rgb(51, 51, 51);">bundle.js</font>
```diff
const fs = require("fs");
const path = require("path");
const Module = require("./module");
const MagicString = require("magic-string");

/**
 * 模块打包类
 */
class Bundle {
  constructor(options) {
    // 入口文件数据
    this.entryPath = path.resolve(options.entry.replace(/\.js$/, "") + ".js");
    // 存放所有的模块
+    this.modules = new Set();
  }
  /**
   * 输出打包文件
   * @param {object} options 输出文件配置
   */
  write(options) {
    // 获取入口模块
    const { file, format } = options;
    const entryModule = this.fetchModule(this.entryPath); // 获取模块代码
    this.statements = entryModule.expandAllStatements(true); // 展开所有的语句
    const { code } = this.generate(); // 生成打包后的代码
    // 判断文件夹是否存在
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      // 创建文件夹
      fs.mkdirSync(dir);
    }
    fs.writeFileSync(file, code); // 写入文件系统
  }

  /**
   * 创建模块实例
   * @param {string} importee 被引入的模块
   * @param {string} importer 引入模块
   */
  fetchModule(importee, importer) {
+    let route;
+    if (!importer) {
+      route = importee;
+    } else {
+      if (path.isAbsolute(importee)) {
+        route = importee;
+      } else {
+        route = path.resolve(
+          path.dirname(importer),
+          importee.replace(/\.js$/, "") + ".js"
+        );
+      }
+    }
    if (route) {
      // 获取模块代码
      const code = fs.readFileSync(route, "utf8");
      // 创建模块
      const module = new Module({
        code,
        path: importee,
        bundle: this,
      });
+      this.modules.add(module);
      return module;
    }
  }
  /**
   * 生成代码
   */
  generate() {
    // 创建魔法字符串
    const magicString = new MagicString.Bundle();
    // 遍历所有模块
    this.statements.forEach((statement) => {
      // 获取模块代码
      const source = statement._source.clone();
+      if (statement.type === "ExportNamedDeclaration") {
+        source.remove(statement.start, statement.declaration.start);
+      }
      // 添加到魔法字符串中
      magicString.addSource({
        content: source,
        separator: "\n",
      });
    });
    return { code: magicString.toString() };
  }
}

module.exports = Bundle;

```

### <font style="color:rgb(51, 51, 51);">utils.js</font>
```javascript
/**
 * 判断对象是否有某个属性
 * @param {object} obj 对象
 * @param {string} prop 属性
 * @returns {boolean} 是否有
 */
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

exports.hasOwnProperty = hasOwnProperty;
```

### <font style="color:rgb(51, 51, 51);">module.js</font>
```diff
const MagicString = require("magic-string");
const { parse } = require("acorn");
const analyses = require("./ast/analyses");
+ const { hasOwnProperty } = require("./utils");

/**
 * 模块类
 */
class Module {
  constructor({ code, path, bundle }) {
    // 获取代码
    this.code = new MagicString(code, { filename: path });
    // 模块路径
    this.path = path;
    // 模块依赖的模块
    this.bundle = bundle;
    // 模块的抽象语法树
    this.ast = parse(code, {
      ecmaVersion: 8,
      sourceType: "module",
    });
+    // 存放本模块的导入的模块
+    this.imports = {};
+    // 存放本模块的导出的模块
+    this.exports = {};
+    // 存放本模块的变量定义
+    this.definitions = {};
    // 模块的依赖关系
    analyses(this.ast, this.code, this);
  }
  /**
   * 展开所有语句
   */
  expandAllStatements() {
    const allStatements = [];
    this.ast.body.forEach((statement) => {
+      // 忽略导入语句
+      if (statement.type === "ImportDeclaration") {
+        return;
+      }
      const statements = this.expandStatement(statement);
      allStatements.push(...statements);
    });
    return allStatements;
  }
  /**
   * 展开语句
   */
  expandStatement(statement) {
    statement._included = true;
    const result = [];
+    // 获取此语句依赖的变量
+    const _dependsOn = Object.keys(statement._dependsOn);
+    _dependsOn.forEach((name) => {
+      const definitions = this.define(name);
+      result.push(...definitions);
+    });
    result.push(statement);
    return result;
  }

+  /**
+   * 定义变量
+   * @param {string} name 变量名
+   */
+  define(name) {
+    // 判断此变量是外部导入的还是模块内部声明的
+    if (hasOwnProperty(this.imports, name)) {
+      // 说明此变量不是模块内部声明的，而是外部导入的，获取从那个模块内导入了那个变量
+      const { source, importName } = this.imports[name];
+      // 获取此变量所在的模块
+      const importModule = this.bundle.fetchModule(source, this.path);
+      // 从这个模块的导出变量获得本地变量的名称
+      const { localName } = importModule.exports[importName];
+      // 获取本地变量的定义语句
+      return importModule.define(localName);
+    } else {
+      // 否则，说明此变量是模块内部声明的
+      const statement = this.definitions[name];
+      if (statement && !statement._included) {
+        // 如果是本地变量的话还需要继续展开
+        return this.expandStatement(statement);
+      } else {
+        return [];
+      }
+    }
+  }
}
module.exports = Module;
```

### <font style="color:rgb(51, 51, 51);">ast</font>
#### <font style="color:rgb(51, 51, 51);">analyses.js</font>
+ <font style="color:rgb(51, 51, 51);">第1个循环 找出导入导出的变量</font>
+ <font style="color:rgb(51, 51, 51);">第2个循环 找出定义和依赖的变量</font>

```diff
+ const Scope = require('./scope');
+ const walk = require('./walk');
+ const { hasOwnProperty } = require('../utils');

/**
 * @description 分析模块对于的AST
 * @param {object} ast 模块的抽象语法树
 * @param {string} code 模块的代码
 * @param {object} module 模块
 */
function analyses(ast, code, module) {
  //第1个循环，找出导入导出的变量
  ast.body.forEach(statement => {
    Object.defineProperties(statement, {
      _included: { value: false, writable: true }, // 是否被包含
      _module: { value: module }, // 模块
      _source: { value: code.snip(statement.start, statement.end) }, // 源码
+      _defines: { value: {} },//此节点上定义的变量say
+      _dependsOn: { value: {} }//此此节点读取了哪些变量
+    });

+    // 判断是否是导入导出的语句，import { name, age } from './msg';
+    if (statement.type === 'ImportDeclaration') {
+      // 获取导入的模块相对路径，./msg
+      const source = statement.source.value;
+      // 遍历导入的变量
+      statement.specifiers.forEach(specifier => {
+        // 获取导入的变量名
+        const importName = specifier.imported.name;
+        // 获取本地的变量名
+        const localName = specifier.local.name;
+        // 添加导入的模块，imports.name = {source:'./msg',importName:'name'};
+        module.imports[localName] = { source, importName }
+      });
+    } else if (statement.type === 'ExportNamedDeclaration') { // 判断是否是导出声明
+      // 获取导出的变量名
+      const declaration = statement.declaration;
+      // 判断是否是变量声明
+      if (declaration && declaration.type === 'VariableDeclaration') {
+        // 获取变量声明的变量名
+        const declarations = declaration.declarations;
+        // 遍历变量声明的变量名
+        declarations.forEach(variableDeclarator => {
+          // 获取变量名，name
+          const localName = variableDeclarator.id.name;
+          // 获取导出的变量名
+          const exportName = localName;
+          // 添加导出变量，exports.name = {localName:'name'};
+          module.exports[exportName] = { localName };
+        });
+      }
+    }
+  });
+  //第2次循环创建作用域链
+  let currentScope = new Scope({ name: '全局作用域' });
+  //创建作用域链,为了知道我在此模块中声明哪些变量，这些变量的声明节点是哪个 var name = 1;
+  ast.body.forEach(statement => {
+    // 添加变量到作用域中
+    function addToScope(name) {
+      currentScope.add(name);//把name变量放入当前的作用域
+      //如果没有父亲，相当 于就是根作用域或者 当前的作用域是一个块级作用域的话
+      if (!currentScope.parent) {//如果没有父作用域，说明这是一个顶级作用域
+        statement._defines[name] = true;//在一级节点定义一个变量name _defines.say=true
+        module.definitions[name] = statement;
+      }
+    }
+    // 遍历抽象语法树
+    walk(statement, {
+      enter(node) {
+        //收集本节点上使用的变量
+        if (node.type === 'Identifier') {
+          statement._dependsOn[node.name] = true;
+        }
+        let newScope; // 新的作用域
+        switch (node.type) { // 作用域类型
+          case 'FunctionDeclaration':
+            // 添加变量到作用域
+            addToScope(node.id.name);//say
+            // 获取函数节点的参数
+            const names = node.params.map(param => param.name);
+            // 创建新的作用域
+            newScope = new Scope({ name: node.id.name, parent: currentScope, names });
+            break;
+          case 'VariableDeclaration':
+            // 遍历变量声明
+            node.declarations.forEach(declaration => {
+              addToScope(declaration.id.name);//var
+            });
+            break;
+          default:
+            break;
+        }
+        // 如果有新的作用域
+        if (newScope) {
+          // 给节点添加作用域
+          Object.defineProperty(node, '_scope', { value: newScope });
+          // 设置当前作用域为新的作用域
+          currentScope = newScope;
+        }
+      },
+      leave(node) {
+        // 判断当前节点是否有作用域
+        if (hasOwnProperty(node, '_scope')) {
+          // 指定作域为当前作用域的父作用域
+          currentScope = currentScope.parent;
+        }
+      }
    });
  });
}
module.exports = analyses;

```

#### <font style="color:rgb(51, 51, 51);">scope.js</font>
```javascript
/**
 * 作用域
 */
class Scope {
  constructor(options = {}) {
    //作用域的名称
    this.name = options.name;
    //父作用域
    this.parent = options.parent;
    //此作用域内定义的变量
    this.names = options.names || [];
  }
  /**
   * 添加变量
   * @param {string} name 变量名
   */
  add(name) {
    this.names.push(name);
  }
  /**
   * 查找定义此变量的作用域
   * @param {string} name 变量名
   */
  findDefiningScope(name) {
    if (this.names.includes(name)) {
      return this;
    } else if (this.parent) {
      return this.parent.findDefiningScope(name);
    } else {
      return null;
    }
  }
}
module.exports = Scope;
```

#### <font style="color:rgb(51, 51, 51);">walk.js</font>
```javascript
/**
 * 遍历抽象语法树
 * @param {object} astNode AST 抽象语法树
 * @param {object} params 遍历参数 
 */
function walk(astNode, { enter, leave }) {
  visit(astNode, null, enter, leave);
}
/**
 * 遍历抽象语法树
 * @param {object} node AST 抽象语法树
 * @param {object|null} parent  父节点
 * @param {function} enter 遍历进入节点
 * @param {function} leave 遍历离开节点
 */
function visit(node, parent, enter, leave) {
  if (enter) {
    enter.call(null, node, parent);
  }
  // 获取当前节点的属性
  const keys = Object.keys(node).filter((key) => typeof node[key] === "object");
  // 遍历属性
  keys.forEach((key) => {
    // 获取属性值
    const value = node[key];
    // 属性值是数组
    if (Array.isArray(value)) {
      // 递归遍历
      value.forEach((val) => visit(val, node, enter, leave));
    } else if (value && value.type) {
      // 属性值是对象
      visit(value, node, enter, leave);
    }
  });
  if (leave) {
    leave.call(null, node, parent);
  }
}
module.exports = walk;
```

# <font style="color:rgb(51, 51, 51);">包含修改语句</font>
1. 找到这个语句读到了或者说使用了哪个变量 name
2. 查找此变量name变量，它的变量定义语句，添加最终输出的结果里
3. 判断name变量是不是外部导入的
4. 如果是先获取外部的模块的定义 msg.js
5. 找到在msg.js中定义 name变量的语句 var name ='msg'; 放到输出结果里

## <font style="color:rgb(51, 51, 51);">src</font>
### <font style="color:rgb(51, 51, 51);">main.js</font>
```javascript
import { name, age } from './msg';

function main() {
  console.log(`Hello ${name}!!!`);
}

main();
```

### <font style="color:rgb(51, 51, 51);">msg.js</font>
```javascript
export let name = "msg";
name += "s";
export const age = 18;
```

## <font style="color:rgb(51, 51, 51);">lib</font>
### <font style="color:rgb(51, 51, 51);">module.js</font>
```diff
const MagicString = require("magic-string");
const { parse } = require("acorn");
const analyses = require("./ast/analyses");
const { hasOwnProperty } = require("./utils");

/**
 * 模块类
 */
class Module {
  constructor({ code, path, bundle }) {
    // 获取代码
    this.code = new MagicString(code, { filename: path });
    // 模块路径
    this.path = path;
    // 模块依赖的模块
    this.bundle = bundle;
    // 模块的抽象语法树
    this.ast = parse(code, {
      ecmaVersion: 8,
      sourceType: "module",
    });
    // 存放本模块的导入的模块
    this.imports = {};
    // 存放本模块的导出的模块
    this.exports = {};
    // 存放本模块的变量定义
    this.definitions = {};
+    // 存放变量修改语句
+    this.modifications = {};
    // 模块的依赖关系
    analyses(this.ast, this.code, this);
  }
  /**
   * 展开所有语句
   */
  expandAllStatements() {
    const allStatements = [];
    this.ast.body.forEach((statement) => {
      // 忽略导入语句
      if (statement.type === "ImportDeclaration") {
        return;
      }
      const statements = this.expandStatement(statement);
      allStatements.push(...statements);
    });
    return allStatements;
  }
  /**
   * 展开语句
   */
  expandStatement(statement) {
    statement._included = true;
    const result = [];
    // 获取此语句依赖的变量
    const _dependsOn = Object.keys(statement._dependsOn);
    _dependsOn.forEach((name) => {
      const definitions = this.define(name);
      result.push(...definitions);
    });
    result.push(statement);
+    // 找到此语句定义的变量,把定义的变量和修改语句也包括进来
+    // 注意要先定义再修改，所以要把这行放在push(statement)的下面
+    const defines = Object.keys(statement._defines);
+    defines.forEach((name) => {
+      // 找到定义的变量依赖的修改的语句
+      const modifications =
+        hasOwnProperty(this.modifications, name) && this.modifications[name];
+      if (modifications) {
+        // 把修改语句展开放到结果中
+        modifications.forEach((statement) => {
+          if (!statement._included) {
+            const statements = this.expandStatement(statement);
+            result.push(...statements);
+          }
+        });
+      }
+    });
    return result;
  }

  /**
   * 定义变量
   * @param {string} name 变量名
   */
  define(name) {
    // 判断此变量是外部导入的还是模块内部声明的
    if (hasOwnProperty(this.imports, name)) {
      // 说明此变量不是模块内部声明的，而是外部导入的，获取从那个模块内导入了那个变量
      const { source, importName } = this.imports[name];
      // 获取此变量所在的模块
      const importModule = this.bundle.fetchModule(source, this.path);
      // 从这个模块的导出变量获得本地变量的名称
      const { localName } = importModule.exports[importName];
      // 获取本地变量的定义语句
      return importModule.define(localName);
    } else {
      // 否则，说明此变量是模块内部声明的
      const statement = this.definitions[name];
      if (statement && !statement._included) {
        // 如果是本地变量的话还需要继续展开
        return this.expandStatement(statement);
      } else {
        return [];
      }
    }
  }
}
module.exports = Module;
```

### <font style="color:rgb(51, 51, 51);">ast</font>
#### <font style="color:rgb(51, 51, 51);">analyse.js</font>
```diff
const Scope = require('./scope');
const walk = require('./walk');
const { hasOwnProperty } = require('../utils');
function analyse(ast, code, module) {
  //第1个循环，找出导入导出的变量
  ast.body.forEach(statement => {
    Object.defineProperties(statement, {
      _module: { value: module },
      _source: { value: code.snip(statement.start, statement.end) },
      _defines: { value: {} },//此节点上定义的变量say
      _dependsOn: { value: {} },//此此节点读取了哪些变量
+     _modifies: { value: {} },//本语句修改的变量
    })
    //import { name, age } from './msg';
    if (statement.type === 'ImportDeclaration') {
      let source = statement.source.value;// ./msg
      statement.specifiers.forEach(specifier => {
        let importName = specifier.imported.name;//导入的变量名
        let localName = specifier.local.name;//本地的变量名
        //imports.name = {source:'./msg',importName:'name'};
        module.imports[localName] = { source, importName }
      });
    } else if (statement.type === 'ExportNamedDeclaration') {
      const declaration = statement.declaration;
      if (declaration && declaration.type === 'VariableDeclaration') {
        const declarations = declaration.declarations;
        declarations.forEach(variableDeclarator => {
          const localName = variableDeclarator.id.name;//name
          const exportName = localName;
          //exports.name = {localName:'name'};
          module.exports[exportName] = { localName };
        });
      }
    }
  });
  //第2次循环创建作用域链
  let currentScope = new Scope({ name: '全局作用域' });
  //创建作用域链,为了知道我在此模块中声明哪些变量，这些变量的声明节点是哪个 var name = 1;
  ast.body.forEach(statement => {
+   function checkForReads(node) {
+     //如果此节点类型是一个标识符话
+     if (node.type === 'Identifier') {
+       statement._dependsOn[node.name] = true;
+     }
+   }
+   function checkForWrites(node) {
+     function addNode(node) {
+       const name = node.name;
+       statement._modifies[name] = true;//statement._modifies.age = true;
+       if (!hasOwnProperty(module.modifications, name)) {
+         module.modifications[name] = [];
+       }
+       module.modifications[name].push(statement);
+     }
+     if (node.type === 'AssignmentExpression') {
+       addNode(node.left, true);
+     } else if (node.type === 'UpdateExpression') {
+       addNode(node.argument);
+     }
+   }
    function addToScope(name) {
      currentScope.add(name);//把name变量放入当前的作用域
      //如果没有父亲，相当 于就是根作用域或者 当前的作用域是一个块级作用域的话
      if (!currentScope.parent) {//如果没有父作用域，说明这是一个顶级作用域
        statement._defines[name] = true;//在一级节点定义一个变量name _defines.say=true
        module.definitions[name] = statement;
      }
    }
    walk(statement, {
      enter(node) {
-        if (node.type === 'Identifier') {
-          statement._dependsOn[node.name] = true;
-        }
+       //收集本节点上使用的变量
+       checkForReads(node);
+       checkForWrites(node);
        let newScope;
        switch (node.type) {
          case 'FunctionDeclaration':
            addToScope(node.id.name);//say
            const names = node.params.map(param => param.name);
            newScope = new Scope({ name: node.id.name, parent: currentScope, names });
            break;
          case 'VariableDeclaration':
            node.declarations.forEach(declaration => {
              addToScope(declaration.id.name);//var
            });
            break;
          default:
            break;
        }
        if (newScope) {
          Object.defineProperty(node, '_scope', { value: newScope });
          currentScope = newScope;
        }
      },
      leave(node) {
        if (hasOwnProperty(node, '_scope')) {
          currentScope = currentScope.parent;
        }
      }
    });
  });
}
module.exports = analyse;


const Scope = require("./scope");
const walk = require("./walk");
const { hasOwnProperty } = require("../utils");

/**
 * @description 分析模块对于的AST
 * @param {object} ast 模块的抽象语法树
 * @param {string} code 模块的代码
 * @param {object} module 模块
 */
function analyses(ast, code, module) {
  //第1个循环，找出导入导出的变量
  ast.body.forEach((statement) => {
    Object.defineProperties(statement, {
      _included: { value: false, writable: true }, // 是否被包含
      _module: { value: module }, // 模块
      _source: { value: code.snip(statement.start, statement.end) }, // 源码
      _defines: { value: {} }, // 此节点上定义的变量say
      _dependsOn: { value: {} }, // 此此节点读取了哪些变量
+      _modifies: { value: {} }, // 本语句修改的变量
    });

    // 判断是否是导入导出的语句，import { name, age } from './msg';
    if (statement.type === "ImportDeclaration") {
      // 获取导入的模块相对路径，./msg
      const source = statement.source.value;
      // 遍历导入的变量
      statement.specifiers.forEach((specifier) => {
        // 获取导入的变量名
        const importName = specifier.imported.name;
        // 获取本地的变量名
        const localName = specifier.local.name;
        // 添加导入的模块，imports.name = {source:'./msg',importName:'name'};
        module.imports[localName] = { source, importName };
      });
    } else if (statement.type === "ExportNamedDeclaration") {
      // 判断是否是导出声明
      // 获取导出的变量名
      const declaration = statement.declaration;
      // 判断是否是变量声明
      if (declaration && declaration.type === "VariableDeclaration") {
        // 获取变量声明的变量名
        const declarations = declaration.declarations;
        // 遍历变量声明的变量名
        declarations.forEach((variableDeclarator) => {
          // 获取变量名，name
          const localName = variableDeclarator.id.name;
          // 获取导出的变量名
          const exportName = localName;
          // 添加导出变量，exports.name = {localName:'name'};
          module.exports[exportName] = { localName };
        });
      }
    }
  });
  //第2次循环创建作用域链
  let currentScope = new Scope({ name: "全局作用域" });
  //创建作用域链,为了知道我在此模块中声明哪些变量，这些变量的声明节点是哪个 var name = 1;
  ast.body.forEach((statement) => {
    // 添加变量到作用域中
    function addToScope(name) {
      currentScope.add(name); //把name变量放入当前的作用域
      //如果没有父亲，相当 于就是根作用域或者 当前的作用域是一个块级作用域的话
      if (!currentScope.parent) {
        //如果没有父作用域，说明这是一个顶级作用域
        statement._defines[name] = true; //在一级节点定义一个变量name _defines.say=true
        module.definitions[name] = statement;
      }
    }

+    function checkForReads(node) {
+      // 如果此节点类型是一个标识符话
+      if (node.type === "Identifier") {
+        statement._dependsOn[node.name] = true;
+      }
+    }
+    function checkForWrites(node) {
+      function addNode(node) {
+        const name = node.name;
+        statement._defines[name] = true; // statement._defines.age=true
+        if (!hasOwnProperty(module.modifications, name)) {
+          module.modifications[name] = [];
+        }
+        module.modifications[name].push(statement);
+      }
+
+      if (node.type === "AssignmentExpression") {
+        addNode(node.left, true);
+      } else if (node.type === "UpdateExpression") {
+        addNode(node.argument);
+      }
+    }
    // 遍历抽象语法树
    walk(statement, {
      enter(node) {
        // 收集本节点上使用的变量
-         if (node.type === 'Identifier') {
-           statement._dependsOn[node.name] = true;
-         }
+        checkForReads(node);
+        checkForWrites(node);
        let newScope; // 新的作用域
        switch (
          node.type // 作用域类型
        ) {
          case "FunctionDeclaration":
          case "ArrowFunctionDeclaration":
            // 添加变量到作用域
            addToScope(node.id.name); //say
            // 获取函数节点的参数
            const names = node.params.map((param) => param.name);
            // 创建新的作用域
            newScope = new Scope({
              name: node.id.name,
              parent: currentScope,
              names,
            });
            break;
          case "VariableDeclaration":
            // 遍历变量声明
            node.declarations.forEach((declaration) => {
              addToScope(declaration.id.name); //var
            });
            break;
          default:
            break;
        }
        // 如果有新的作用域
        if (newScope) {
          // 给节点添加作用域
          Object.defineProperty(node, "_scope", { value: newScope });
          // 设置当前作用域为新的作用域
          currentScope = newScope;
        }
      },
      leave(node) {
        // 判断当前节点是否有作用域
        if (hasOwnProperty(node, "_scope")) {
          // 指定作域为当前作用域的父作用域
          currentScope = currentScope.parent;
        }
      },
    });
  });
}
module.exports = analyses;

```

# <font style="color:rgb(51, 51, 51);">支持块级作用域</font>
## <font style="color:rgb(51, 51, 51);">src</font>
### <font style="color:rgb(51, 51, 51);">main.js</font>
```javascript
import { name, age } from "./msg";

function main() {
  console.log(`Hello ${name}!!!`);
}

main();

if (true) {
  let a = 1;
}
console.log(a);
```

## <font style="color:rgb(51, 51, 51);">lib</font>
### <font style="color:rgb(51, 51, 51);">ast</font>
#### <font style="color:rgb(51, 51, 51);">scope.js</font>
```diff
/**
 * 作用域
 */
class Scope {
  constructor(options = {}) {
    //作用域的名称
    this.name = options.name;
    //父作用域
    this.parent = options.parent;
    //此作用域内定义的变量
    this.names = options.names || [];
    // 是否块作用域
+    this.isBlock = !!options.isBlock;
  }
  /**
   * 添加变量
   * @param {string} name 变量名
   * @param {boolean} isBlockDeclaration 是否块级作用域
   */
+  add(name, isBlockDeclaration) {
+    if (!isBlockDeclaration && this.isBlock) {
+       // 这是一个var或者函数声明，并且这是一个块级作用域，所以我们需要向上提升
+      this.parent.add(name, isBlockDeclaration);
+    } else {
      this.names.push(name);
+    }
  }
  /**
   * 查找定义此变量的作用域
   * @param {string} name 变量名
   */
  findDefiningScope(name) {
    if (this.names.includes(name)) {
      return this;
    } else if (this.parent) {
      return this.parent.findDefiningScope(name);
    } else {
      return null;
    }
  }
}
module.exports = Scope;

```

#### <font style="color:rgb(51, 51, 51);">analyse.js</font>
```diff
const Scope = require("./scope");
const walk = require("./walk");
const { hasOwnProperty } = require("../utils");

/**
 * @description 分析模块对于的AST
 * @param {object} ast 模块的抽象语法树
 * @param {string} code 模块的代码
 * @param {object} module 模块
 */
function analyses(ast, code, module) {
  // 第1个循环，找出导入导出的变量
  ast.body.forEach((statement) => {
    Object.defineProperties(statement, {
      _included: { value: false, writable: true }, // 是否被包含
      _module: { value: module }, // 模块
      _source: { value: code.snip(statement.start, statement.end) }, // 源码
      _defines: { value: {} }, // 此节点上定义的变量say
      _dependsOn: { value: {} }, // 此此节点读取了哪些变量
      _modifies: { value: {} }, // 本语句修改的变量
    });

    // 判断是否是导入导出的语句，import { name, age } from './msg';
    if (statement.type === "ImportDeclaration") {
      // 获取导入的模块相对路径，./msg
      const source = statement.source.value;
      // 遍历导入的变量
      statement.specifiers.forEach((specifier) => {
        // 获取导入的变量名
        const importName = specifier.imported.name;
        // 获取本地的变量名
        const localName = specifier.local.name;
        // 添加导入的模块，imports.name = {source:'./msg',importName:'name'};
        module.imports[localName] = { source, importName };
      });
    } else if (statement.type === "ExportNamedDeclaration") {
      // 判断是否是导出声明
      // 获取导出的变量名
      const declaration = statement.declaration;
      // 判断是否是变量声明
      if (declaration && declaration.type === "VariableDeclaration") {
        // 获取变量声明的变量名
        const declarations = declaration.declarations;
        // 遍历变量声明的变量名
        declarations.forEach((variableDeclarator) => {
          // 获取变量名，name
          const localName = variableDeclarator.id.name;
          // 获取导出的变量名
          const exportName = localName;
          // 添加导出变量，exports.name = {localName:'name'};
          module.exports[exportName] = { localName };
        });
      }
    }
  });
  // 第2次循环创建作用域链
  let currentScope = new Scope({ name: "全局作用域" });
  // 创建作用域链,为了知道我在此模块中声明哪些变量，这些变量的声明节点是哪个 var name = 1;
  ast.body.forEach((statement) => {
    // 添加变量到作用域中
+    function addToScope(name, isBlockDeclaration) {
+      currentScope.add(name, isBlockDeclaration); // 把name变量放入当前的作用域
      // 如果没有父亲，相当 于就是根作用域或者 当前的作用域是一个块级作用域的话
+      if (
+        !currentScope.parent ||
+        (currentScope.isBlock && !isBlockDeclaration)
+      ) {
        // 如果没有父作用域，说明这是一个顶级作用域
        statement._defines[name] = true; // 在一级节点定义一个变量name _defines.say=true
        module.definitions[name] = statement;
      }
    }

    // 检测变量读取时
    function checkForReads(node) {
      // 如果此节点类型是一个标识符话
      if (node.type === "Identifier") {
        statement._dependsOn[node.name] = true;
      }
    }
    // 检测变量修改时
    function checkForWrites(node) {
      function addNode(node) {
        const name = node.name;
        statement._defines[name] = true; // statement._defines.age=true
        if (!hasOwnProperty(module.modifications, name)) {
          module.modifications[name] = []; // module.modifications 对象, 属性是变量名, 值是一个修改语句组成的数组
        }
        // 存放此变量所有的修改语句
        module.modifications[name].push(statement);
      }

      // 如果是赋值表达式
      if (node.type === "AssignmentExpression") {
        addNode(node.left, true);
      } else if (node.type === "UpdateExpression") {
        // 如果是更新表达式
        addNode(node.argument);
      }
    }
    // 遍历抽象语法树
    walk(statement, {
      enter(node) {
        // 收集本节点上使用的变量
        checkForReads(node);
        checkForWrites(node);
        let newScope; // 新的作用域
        switch (
          node.type // 作用域类型
        ) {
          case "FunctionDeclaration":
          case "ArrowFunctionDeclaration":
            // 添加变量到作用域
            addToScope(node.id.name); // say
            // 获取函数节点的参数
            const names = node.params.map((param) => param.name);
            // 创建新的作用域
            newScope = new Scope({
              name: node.id.name,
              parent: currentScope,
              names,
              isBlock: false,
            });
            break;
          case "VariableDeclaration":
            // 遍历变量声明
            node.declarations.forEach((declaration) => {
+              if (node.kind === "let" || node.kind === "const") {
+                addToScope(declaration.id.name, true); // 这是一个块级作用域
+              } else {
                addToScope(declaration.id.name); // var
+              }
            });
            break;
+          case "BlockStatement":
+            newScope = new Scope({
+              parent: currentScope,
+              isBlock: true,
+            });
+            break;
          default:
            break;
        }
        // 如果有新的作用域
        if (newScope) {
          // 给节点添加作用域
          Object.defineProperty(node, "_scope", { value: newScope });
          // 设置当前作用域为新的作用域
          currentScope = newScope;
        }
      },
      leave(node) {
        // 判断当前节点是否有作用域
        if (hasOwnProperty(node, "_scope")) {
          // 指定作域为当前作用域的父作用域
          currentScope = currentScope.parent;
        }
      },
    });
  });
}
module.exports = analyses;
```

### <font style="color:rgb(51, 51, 51);">module.js</font>
```diff
const MagicString = require("magic-string");
const { parse } = require("acorn");
const analyses = require("./ast/analyses");
const { hasOwnProperty } = require("./utils");

+ const SYSTEMS = ["console", "log"];
/**
 * 模块类
 */
class Module {
  constructor({ code, path, bundle }) {
    // 获取代码
    this.code = new MagicString(code, { filename: path });
    // 模块路径
    this.path = path;
    // 模块依赖的模块
    this.bundle = bundle;
    // 模块的抽象语法树
    this.ast = parse(code, {
      ecmaVersion: 8,
      sourceType: "module",
    });
    // 存放本模块的导入的模块
    this.imports = {};
    // 存放本模块的导出的模块
    this.exports = {};
    // 存放本模块的变量定义
    this.definitions = {};
    // 存放变量修改语句
    this.modifications = {};
    // 模块的依赖关系
    analyses(this.ast, this.code, this);
  }
  /**
   * 展开所有语句
   */
  expandAllStatements() {
    const allStatements = [];
    this.ast.body.forEach((statement) => {
      // 忽略导入语句
      if (statement.type === "ImportDeclaration") {
        return;
      }
+      // 默认不包含所有的变量声明语句
+      if (statement.type === "VariableDeclaration") {
+        return;
+      }
      const statements = this.expandStatement(statement);
      allStatements.push(...statements);
    });
    return allStatements;
  }
  /**
   * 展开语句
   */
  expandStatement(statement) {
    statement._included = true;
    const result = [];
    // 获取此语句依赖的变量
    const _dependsOn = Object.keys(statement._dependsOn);
    _dependsOn.forEach((name) => {
      const definitions = this.define(name);
      result.push(...definitions);
    });
    result.push(statement);
    // 找到此语句定义的变量,把定义的变量和修改语句也包括进来
    // 注意要先定义再修改，所以要把这行放在push(statement)的下面
    const defines = Object.keys(statement._defines);
    defines.forEach((name) => {
      // 找到定义的变量依赖的修改的语句
      const modifications =
        hasOwnProperty(this.modifications, name) && this.modifications[name];
      if (modifications) {
        // 把修改语句展开放到结果中
        modifications.forEach((statement) => {
          if (!statement._included) {
            const statements = this.expandStatement(statement);
            result.push(...statements);
          }
        });
      }
    });
    return result;
  }

  /**
   * 定义变量
   * @param {string} name 变量名
   */
  define(name) {
    // 判断此变量是外部导入的还是模块内部声明的
    if (hasOwnProperty(this.imports, name)) {
      // 说明此变量不是模块内部声明的，而是外部导入的，获取从那个模块内导入了那个变量
      const { source, importName } = this.imports[name];
      // 获取此变量所在的模块
      const importModule = this.bundle.fetchModule(source, this.path);
      // 从这个模块的导出变量获得本地变量的名称
      const { localName } = importModule.exports[importName];
      // 获取本地变量的定义语句
      return importModule.define(localName);
    } else {
+      let statement = this.definitions[name]; // name
+      // 否则，说明此变量是模块内部声明的
+      if (statement) {
+        // 如果已经生成过定义语句，则直接返回
+        if (statement._included) {
+          return [];
+        } else {
+          // 否则，生成定义语句
+          return this.expandStatement(statement);
+        }
+      } else {
+        if (SYSTEMS.includes(name)) {
+          return [];
+        } else {
+          // 如果找不到定义的变量就报错
+          throw new Error(`Cannot find variable: ${name}`);
+        }
      }
    }
  }
}
module.exports = Module;
```

# <font style="color:rgb(51, 51, 51);">实现变量名重命名</font>
## <font style="color:rgb(51, 51, 51);">src</font>
### <font style="color:rgb(51, 51, 51);">main.js</font>
```javascript
import { age1 } from "./age1.js";
import { age2 } from "./age2.js";
import { age3 } from "./age3.js";

console.log(age1, age2, age3);

/**
const age$2 = '年龄';
const age1 = age$2 + '1';

const age$1 = '年龄';
const age2 = age$1 + '2';

const age = '年龄';
const age3 = age + '3';

console.log(age1, age2, age3);
 */
```

### <font style="color:rgb(51, 51, 51);">age1.js</font>
```javascript
const age = "年龄";
export const age1 = age + "1";
```

### <font style="color:rgb(51, 51, 51);">age2.js</font>
```javascript
const age = "年龄";
export const age2 = age + "2";
```

### <font style="color:rgb(51, 51, 51);">age3.js</font>
```javascript
const age = "年龄";
export const age3 = age + "3";
```

## <font style="color:rgb(51, 51, 51);">lib</font>
### <font style="color:rgb(51, 51, 51);">utils.js</font>
```diff
+ const walk = require("./ast/walk");

/**
 * 判断对象是否有某个属性
 * @param {object} obj 对象
 * @param {string} prop 属性
 * @returns {boolean} 是否有
 */
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

+ /**
+  * @description 替换标识符
+  * @param {object} statement 语句
+  * @param {string} source 源码
+  * @param {object} replacements 替换的标识符
+  */
+ function replaceIdentifiers(statement, source, replacements) {
+   walk(statement, {
+     enter(node) {
+       if (node.type === "Identifier") {
+         if (node.name && replacements[node.name]) {
+           source.overwrite(node.start, node.end, replacements[node.name]);
+         }
+       }
+     },
+   });
+ }

- exports.hasOwnProperty = hasOwnProperty;
+ module.exports = {
+   hasOwnProperty,
+   replaceIdentifiers,
+ };

```

### <font style="color:rgb(51, 51, 51);">bundle.js</font>
```diff
const fs = require("fs");
const path = require("path");
const Module = require("./module");
const MagicString = require("magic-string");
+ const { hasOwnProperty, replaceIdentifiers } = require("./utils");

/**
 * 模块打包类
 */
class Bundle {
  constructor(options) {
    // 入口文件数据
    this.entryPath = path.resolve(options.entry.replace(/\.js$/, "") + ".js");
    // 存放所有的模块
    this.modules = new Set();
  }
  /**
   * 输出打包文件
   * @param {object} options 输出文件配置
   */
  write(options) {
    // 获取入口模块
    const { file, format } = options;
    const entryModule = this.fetchModule(this.entryPath); // 获取模块代码
    this.statements = entryModule.expandAllStatements(true); // 展开所有的语句
+    this.deconflict(); // 模块去重
    const { code } = this.generate(); // 生成打包后的代码
    // 判断文件夹是否存在
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      // 创建文件夹
      fs.mkdirSync(dir);
    }
    fs.writeFileSync(file, code); // 写入文件系统
  }

  /**
   * 创建模块实例
   * @param {string} importee 被引入的模块
   * @param {string} importer 引入模块
   */
  fetchModule(importee, importer) {
    let route;
    if (!importer) {
      route = importee;
    } else {
      if (path.isAbsolute(importee)) {
        route = importee;
      } else {
        route = path.resolve(
          path.dirname(importer),
          importee.replace(/\.js$/, "") + ".js"
        );
      }
    }
    if (route) {
      // 获取模块代码
      const code = fs.readFileSync(route, "utf8");
      // 创建模块
      const module = new Module({
        code,
        path: importee,
        bundle: this,
      });
      this.modules.add(module);
      return module;
    }
  }
  /**
   * 生成代码
   */
  generate() {
    // 创建魔法字符串
    const magicString = new MagicString.Bundle();
    // 遍历所有模块
    this.statements.forEach((statement) => {
+      const replacements = {}; // 替换的标识符
+      // 遍历所有依赖的变量, 如果有定义的变量, 则替换为定义的变量
+      Object.keys(statement._dependsOn)
+        .concat(Object.keys(statement._defines))
+        .forEach((name) => {
+          const canonicalName = statement._module.getCanonicalName(name);
+          if (canonicalName !== name) {
+            replacements[name] = canonicalName;
+          }
+        });
      // 获取模块代码
      const source = statement._source.clone();
      if (statement.type === "ExportNamedDeclaration") {
        source.remove(statement.start, statement.declaration.start);
      }
+      replaceIdentifiers(statement, source, replacements);
      // 添加到魔法字符串中
      magicString.addSource({
        content: source,
        separator: "\n",
      });
    });
    return { code: magicString.toString() };
  }

+  /**
+   * 模块去重
+   */
+  deconflict() {
+    const defines = {}; // 定义的变量
+    const conflicts = {}; // 冲突的变量
+    this.statements.forEach((statement) => {
+      Object.keys(statement._defines).forEach((name) => {
+        if (hasOwnProperty(defines, name)) {
+          conflicts[name] = true; // 标记为冲突
+        } else {
+          defines[name] = []; // defines.age = [];
+        }
+        // 把此声明变量的语句，对应的模块添加到数组里
+        defines[name].push(statement._module);
+      });
+    });
+    Object.keys(conflicts).forEach((name) => {
+      const modules = defines[name]; // 获取此变量声明的模块
+      modules.pop(); // 最后一个模块不需要重命名，保留原来的名称即可 [age1, age2]
+      modules.forEach((module, index) => {
+        const replacement = `${name}$${modules.length - index}`;
+        module.rename(name, replacement);
+      });
+    });
+  }
}

module.exports = Bundle;
```

### <font style="color:rgb(51, 51, 51);">module.js</font>
```diff
const MagicString = require("magic-string");
const { parse } = require("acorn");
const analyses = require("./ast/analyses");
const { hasOwnProperty } = require("./utils");

const SYSTEMS = ["console", "log"];
/**
 * 模块类
 */
class Module {
  constructor({ code, path, bundle }) {
    // 获取代码
    this.code = new MagicString(code, { filename: path });
    // 模块路径
    this.path = path;
    // 模块依赖的模块
    this.bundle = bundle;
    // 模块的抽象语法树
    this.ast = parse(code, {
      ecmaVersion: 8,
      sourceType: "module",
    });
    // 存放本模块的导入的模块
    this.imports = {};
    // 存放本模块的导出的模块
    this.exports = {};
    // 存放本模块的变量定义
    this.definitions = {};
    // 存放变量修改语句
    this.modifications = {};
+    // 存放重命名的变量{key老的变量名:value新的变量名}
+    this.canonicalNames = {};
    // 模块的依赖关系
    analyses(this.ast, this.code, this);
  }
  /**
   * 展开所有语句
   */
  expandAllStatements() {
    const allStatements = [];
    this.ast.body.forEach((statement) => {
      // 忽略导入语句
      if (statement.type === "ImportDeclaration") {
        return;
      }
      // 默认不包含所有的变量声明语句
      if (statement.type === "VariableDeclaration") {
        return;
      }
      const statements = this.expandStatement(statement);
      allStatements.push(...statements);
    });
    return allStatements;
  }
  /**
   * 展开语句
   */
  expandStatement(statement) {
    statement._included = true;
    const result = [];
    // 获取此语句依赖的变量
    const _dependsOn = Object.keys(statement._dependsOn);
    _dependsOn.forEach((name) => {
      const definitions = this.define(name);
      result.push(...definitions);
    });
    result.push(statement);
    // 找到此语句定义的变量,把定义的变量和修改语句也包括进来
    // 注意要先定义再修改，所以要把这行放在push(statement)的下面
    const defines = Object.keys(statement._defines);
    defines.forEach((name) => {
      // 找到定义的变量依赖的修改的语句
      const modifications =
        hasOwnProperty(this.modifications, name) && this.modifications[name];
      if (modifications) {
        // 把修改语句展开放到结果中
        modifications.forEach((statement) => {
          if (!statement._included) {
            const statements = this.expandStatement(statement);
            result.push(...statements);
          }
        });
      }
    });
    return result;
  }

  /**
   * 定义变量
   * @param {string} name 变量名
   */
  define(name) {
    // 判断此变量是外部导入的还是模块内部声明的
    if (hasOwnProperty(this.imports, name)) {
      // 说明此变量不是模块内部声明的，而是外部导入的，获取从那个模块内导入了那个变量
      const { source, importName } = this.imports[name];
      // 获取此变量所在的模块
      const importModule = this.bundle.fetchModule(source, this.path);
      // 从这个模块的导出变量获得本地变量的名称
      const { localName } = importModule.exports[importName];
      // 获取本地变量的定义语句
      return importModule.define(localName);
    } else {
      let statement = this.definitions[name]; // name
      // 否则，说明此变量是模块内部声明的
      if (statement) {
        // 如果已经生成过定义语句，则直接返回
        if (statement._included) {
          return [];
        } else {
          // 否则，生成定义语句
          return this.expandStatement(statement);
        }
      } else {
        if (SYSTEMS.includes(name)) {
          return [];
        } else {
          // 如果找不到定义的变量就报错
          throw new Error(`Cannot find variable: ${name}`);
        }
      }
    }
  }

+  /**
+   * 重命名
+   * @param {string} name 变量名
+   */
+  rename(name, replacement) {
+    this.canonicalNames[name] = replacement;
+  }
+
+  /**
+   * 获取变量的规范名称
+   * @param {string} name 变量名
+   */
+  getCanonicalName(name) {
+    return this.canonicalNames[name] || name;
+  }
}
module.exports = Module;

```

