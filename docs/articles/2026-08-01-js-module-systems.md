# 面试官问"JS 有几种模块化规范"，你能说清楚几层？

> 大多数人能背出名字：CommonJS、AMD、ESM。但面试官问"AMD 和 CMD 有什么区别"，或者"为什么 ESM 能做 Tree Shaking 而 CommonJS 不行"，就卡住了。

---

## 🎯 这篇文章解决什么问题

你可能背过"CommonJS / AMD / ES Module"，但对这几个词背后的演进逻辑和本质差异模糊不清。这篇文章带你从**前规范时代一路到 ESM 官方标准**，每个规范讲透原理，直接给出面试标准答案。


---

## 🧩 为什么要模块化

先把概念说清楚：**模块化就是按照一定规则，把代码封装成若干相互依赖的文件并进行组合**。每个模块内的数据私有，只向外选择性地暴露方法和数据。

它解决的核心问题：

- **命名冲突**：不同人写的 `utils.js` 会互相覆盖
- **依赖混乱**：手动维护 `<script>` 顺序，一错全崩
- **复用困难**：没有隔离边界，代码无法按需引用

> 💬 **面试官**：模块化到底解决了什么问题？
>
> ✅ 你可以这样答：解决了命名冲突、依赖关系混乱、代码复用困难三个核心问题。本质是把全局作用域污染问题，通过封装转化为模块私有作用域。
> 🎁 想加分：举实际场景——"在大型医疗系统里，药品模块、用户模块、支付模块如果都挂在 `window` 上，稍微有个变量重名就会数据污染。模块化给每个模块画了一条边界线。"

---

## ⚡ 前规范时代：从函数封装到 IIFE

ES6 之前，JS 没有官方模块系统。前端开发者发明了三代"土办法"。

### 第一代：函数封装

```javascript
function add(a, b) { return a + b; }
function minus(a, b) { return a - b; }
```

所有函数挂在全局，命名冲突是必然。

### 第二代：命名空间对象

```javascript
let mathModule = {
  add(a, b) { return a + b; },
  minus(a, b) { return a - b; }
}
```

减少了冲突，但内部属性完全暴露，外部可以随意 `mathModule.add = null`。

### 第三代：IIFE 自执行函数

IIFE（立即调用函数表达式）是第一个真正解决**私有变量**问题的方案：

```javascript
let moduleA = (function () {
  let state; // 外部无法访问
  function getState() {
    return state;
  }
  return { getState }; // 只暴露接口
})();
```

当模块有依赖时，通过参数注入：

```javascript
(function (global, addModule) {
  function calculate(a, b) {
    return addModule.add(a, b);
  }
  global.calcModule = { calculate };
})(window, addModule);
```

**遗留问题**：依赖靠参数顺序维护，脆弱；必须手动保证 `<script>` 引入顺序，没有自动化的依赖解析。

> 💬 **面试官**：IIFE 解决了什么问题，又有什么局限？
>
> ✅ 你可以这样答：IIFE 通过闭包实现了私有作用域，解决了命名冲突和数据污染问题。但依赖关系需要手动维护脚本引入顺序，没有自动化的依赖解析能力——这正是 AMD 出现的动机。

---

## ⚡ AMD：浏览器的"前置依赖"规范

AMD（Asynchronous Module Definition）是专为**浏览器异步加载**设计的规范，代表库是 RequireJS。

核心 API 只有一个：

```javascript
define(id?, dependencies?, factory);
```

**定义模块**：

```javascript
define(function () {
  function add(a, b) { return a + b; }
  return { add };
});
```

**加载并使用**：

```javascript
require.config({ baseUrl: 'modules' });
require(['addModule', 'minusModule'], function(add, minus) {
  console.log(add.add(1, 2));
});
```

AMD 的关键特征：**依赖前置**。`require(['A', 'B'], callback)` 会在执行 `callback` 之前，先把 A 和 B 全部下载完，无论 callback 里是否真的用到了它们。

用几行代码就能手写一个最简 AMD 实现，理解原理：

```javascript
let moduleFactory = {};
function define(name, factory) {
  moduleFactory[name] = factory;
}
function require(dependencies, callback) {
  callback(...dependencies.map(dep => moduleFactory[dep]()));
}
```

> 💬 **面试官**：AMD 的"前置依赖"有什么问题？
>
> ✅ 你可以这样答：AMD 要求在模块顶部声明所有依赖，loader 会先并行下载，全部就绪后才执行工厂函数。好处是并行下载快，坏处是即便某个依赖在特定条件下才用到，也会提前下载——影响首屏性能。
> 🎁 想加分：这正是 CMD 出现的动机，用"就近依赖"来解决这个问题。

---

## ⚡ CMD：Sea.js 的"就近依赖"

CMD（Common Module Definition）是国内工程师玉伯提出的规范，代表库是 Sea.js，与 AMD 最大的区别是**就近依赖**。

```javascript
// CMD 风格：用到时再 require
define(function (require, exports) {
  var addModule = require('./modules/addModule');
  let result1 = addModule.add(1, 2);

  var minusModule = require('./modules/minusModule');
  let result2 = minusModule.minus(1, 2);
});
```

对比一下两者的核心区别：

| 特征 | AMD | CMD |
|------|-----|-----|
| 依赖声明位置 | 顶部前置 | 就近（用时声明）|
| 加载时机 | 并行提前下载 | 懒执行 |
| 代表库 | RequireJS | Sea.js |
| 设计哲学 | 并发优先 | 按需优先 |

CMD 的 `require` 是**同步的**，靠的是"提前静默下载、延迟执行"——文件加载异步发生，`require` 调用时模块已就绪，执行是同步的。

Sea.js 核心逻辑拆成两段来看：

```javascript
// 模块注册与缓存
let factories = {};
let modules = {};
function define(name, factory) {
  factories[name] = factory;
}
```

```javascript
// 同步 require + 懒执行
function require(name) {
  if (modules[name]) return modules[name]; // 缓存命中
  let factory = factories[name];
  let exports = {};
  factory(require, exports); // 执行工厂函数
  modules[name] = exports;
  return exports;
}
```

> 💬 **面试官**：AMD 和 CMD 有什么区别？
>
> ✅ 你可以这样答：最核心的区别是依赖加载时机。AMD 前置依赖、并行下载，模块准备好后统一执行；CMD 就近依赖、懒执行，在实际用到时才 require。

🔧 **真实场景**：在药品详情页，说明书模块只有用户点击"查看说明书"才需要加载。CMD 的就近依赖让这种按需加载更自然——不会在页面初始化时就把所有依赖全拉下来。

---

## ⚡ CommonJS：Node.js 的核心模块标准

Node.js 采用 CommonJS 规范，核心理念是：**每个文件就是一个模块，拥有独立的作用域**。

```javascript
// a.js - 导出
module.exports = { a: 1 };
```

```javascript
// b.js - 引入
const a = require('./a');
const b = a.a + 2;
module.exports = { b };
```

CommonJS 最容易踩坑的特性：**运行时加载 + 值的拷贝**。

```javascript
// count.js
let count = 0;
module.exports = { count, add: () => count++ };

// main.js
const { count, add } = require('./count');
add();
console.log(count); // 0 ← 拷贝的是值，不是引用！
```

> 💬 **面试官**：CommonJS 和 ES Module 最大的区别是什么？
>
> ✅ 你可以这样答：两个维度。第一，加载时机：CommonJS 是运行时加载（`require` 执行时才读文件），ESM 是编译时输出接口（import 在代码执行前就确定了依赖图）。第二，导出内容：CommonJS 导出的是值的**拷贝**，ESM 导出的是值的**引用**（live binding），模块内部修改会反映到外部。
> 🎁 想加分：正因为 CommonJS 是运行时加载，无法静态分析，所以不支持 Tree Shaking。这是理解现代构建工具为什么要用 ESM 的关键原因。

---

## ⚡ UMD：三种规范的万能兼容层

UMD（Universal Module Definition）不是新规范，而是一种**兼容模式**，让同一段代码能在 CommonJS、AMD、甚至浏览器全局环境下运行：

```javascript
((root, factory) => {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);              // AMD 环境
  } else if (typeof exports === 'object') {
    module.exports = factory(require('jquery')); // CommonJS 环境
  } else {
    root.testModule = factory(root.jQuery);   // 浏览器全局
  }
})(this, ($) => {
  // 模块实现
});
```

核心逻辑就是"环境嗅探"：先检测 `define.amd`，再检测 `exports`，都没有就挂全局。

🔧 **真实场景**：当你在 npm 上发布一个通用 JS 库（比如日期处理工具），用 UMD 格式打包，就能同时支持 Node.js 服务端、Webpack 工程、或直接 `<script>` 引入的场景——一个构建产物多处可用。

> 💬 **面试官**：什么时候用 UMD？
>
> ✅ 你可以这样答：UMD 主要用于需要跨环境分发的库。现在大多数库会同时发布 CJS + ESM 双格式（`package.json` 的 `main` 和 `module` 字段分别指向两个入口），UMD 反而用得少了。但如果还需要支持直接 `<script>` 引入的旧场景，UMD 仍然有价值。

---

## 🚀 ESM：JavaScript 的官方模块系统

ES6（2015 年）终于给 JavaScript 带来了**语言级的模块系统**，设计思想是尽量静态化，让编译时就能确定依赖关系。

### 四种导出方式

```javascript
let a = 0;
export { a };           // 命名导出 - 方式一
export const b = 1;     // 命名导出 - 方式二
let c = 2;
export default { c };   // 默认导出
let d = 2;
export { d as e };      // 别名导出
```

### 三种导入方式

```javascript
import { a } from './a.js'   // 对应命名导出
import main from './c'        // 对应 export default
import 'lodash'               // 只执行，不引入值
```

### 命名导出 vs 默认导出的核心差异

这是面试高频考点：**命名导出（`export { x }`）导出的是变量引用，默认导出（`export default`）导出的是当前值的快照**。

```javascript
// a.js
let x = 10;
let y = 20;
setTimeout(() => { x = 100; y = 200; }, 100);
export { x };       // 命名导出 - 引用
export default y;   // 默认导出 - 值快照
```

```javascript
// b.js
import { x } from './a.js';
import y from './a.js';
setTimeout(() => {
  console.log(x, y); // 100, 20 ← x 跟着变了，y 没变
}, 200);
```

> 💬 **面试官**：为什么 ESM 能支持 Tree Shaking？
>
> ✅ 你可以这样答：ESM 是**静态结构**——`import` 和 `export` 必须在模块顶层，不能在 `if` 语句或函数里动态写（这点和 `require()` 完全不同）。这让构建工具在编译阶段就能构建完整的模块依赖图，知道哪些导出从来没被 `import`，直接打上"死代码"标签删掉。
> 🎁 想加分：Tree Shaking 还要求导出的代码没有副作用。`package.json` 里的 `"sideEffects": false` 标记很关键——告诉 Webpack/Rollup "这个包所有文件都没副作用，放心 shake"。

---

## 💡 一张图总结（面试速记）

| 规范 | 主要环境 | 加载时机 | 导出内容 | 面试关键词 |
|------|---------|---------|---------|----------|
| IIFE | 浏览器 | 同步 | 闭包私有作用域 | 命名空间、私有变量 |
| AMD | 浏览器 | 异步 | 依赖前置，并行下载 | RequireJS、前置依赖 |
| CMD | 浏览器 | 按需 | 依赖就近，懒执行 | Sea.js、就近依赖 |
| CommonJS | Node.js | 运行时 | 值的拷贝 | module.exports、同步 |
| UMD | 通用 | 运行时 | 环境嗅探兼容层 | 库打包、跨环境 |
| ESM | 通用 | 编译时 | 值的引用（live binding） | Tree Shaking、静态分析 |

---

## 📝 留个问题

学完规范演进，来一道实战题：

> 同一个变量，用 CommonJS 导出后被修改，和用 ESM 命名导出后被修改，import 的一方分别能不能感知到变化？为什么？

欢迎在评论区写出你的分析。

---

> 🔖 这是「前端工程化」系列第一篇。下一篇预告：**包管理器进化论 —— npm / yarn / pnpm，幽灵依赖和 workspace 到底怎么回事？**
