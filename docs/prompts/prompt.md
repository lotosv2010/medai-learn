# prompt

```text
/publish 下面我们规划nodejs系列的第3篇文章，具体如下：
{{
## 知识点范围

### 第 03 篇：Node.js 运行时内核: V8+libuv 架构/CommonJS 加载机制/ESM 深度拆解（面试收藏级）

**副标题**：V8+libuv 双引擎架构、CommonJS 模块加载机制、ESM 三阶段加载与 CJS 互操作、模块解析算法与幽灵依赖成因

> 与已发布《JS 有几种模块化规范》（`docs/articles/03 module/2026-08-01-js-module-systems.md`）的分工：那篇讲的是 IIFE/AMD/CMD/UMD/ESM 等**语言规范层面**的演进对比与 Tree Shaking 原理，本篇不再重复这部分内容，只讲 Node.js **运行时**具体怎么加载、解析、缓存模块——即"规范之上，Node.js 是怎么实现的"

#### 一、使用与实践

- `package.json` 里 `"type": "module"` 对模块解析规则的影响，`.mjs`/`.cjs` 双扩展名并存策略
- Node.js 全局对象：`process`、`__dirname`/`__filename`（CJS 独有）、`global`、`Buffer`
- 在 ESM 模块中获取等价的 `__dirname`：`import.meta.url` + `fileURLToPath`
- `require.cache` 查看已加载模块缓存，手动清除缓存实现"热重载"的原理性演示
- 动态 `import()` 在 CJS 文件中按需加载 ESM 模块的实际写法

#### 二、设计与原理

- Node.js 的双引擎架构：V8 负责执行 JS 代码本身（解析、编译、GC），libuv 负责跨平台的异步 I/O、事件循环、线程池——Node.js 是"V8 + libuv + 一层 C++ 绑定"组成的运行时，JS 代码本身不具备任何 I/O 能力，全部依赖 libuv 提供的异步接口
- **CommonJS 模块加载机制**：`require` 是同步的——Node.js 在遇到 `require` 时会立即读取目标文件内容、编译执行，并缓存到 `require.cache`（以绝对路径为 key），后续对同一模块的 `require` 直接返回缓存的 `module.exports`，不会重新执行；模块包装：Node.js 会把每个 CJS 文件包装成一个函数 `function(exports, require, module, __filename, __dirname) { ...文件内容... }` 再执行，这解释了为什么 CJS 文件里能直接用这几个"看起来像全局变量"的标识符
- **循环依赖问题**：CJS 遇到循环 `require` 时，后加载的模块拿到的是"当前已执行部分"的 `exports`（可能是不完整的），这是"运行时求值 + 提前缓存占位"机制的直接后果
- **ESM 模块机制**：`import`/`export` 是静态的、编译期可分析的（这也是"tree-shaking"能够实现的基础），Node.js 对 ESM 的加载分为"解析（parse）→ 实例化（instantiate，建立模块间的绑定关系）→ 求值（evaluate）"三个阶段，和 CJS "读取即执行"的同步模型完全不同
- **ESM 与 CJS 互操作规则**：ESM 可以 `import` CJS 模块（CJS 的 `module.exports` 会被当作默认导出）；但 CJS 不能直接 `require` 一个 ESM 模块（同步的 `require` 无法等待 ESM 异步的实例化过程），只能用动态 `import()`（返回 Promise）
- 模块解析算法：Node.js 按"核心模块 → 相对/绝对路径 → `node_modules` 逐级向上查找"的顺序解析裸模块名（bare specifier），这是"幽灵依赖"问题的成因——`node_modules` 逐级查找机制让一个包可能访问到并非自己直接声明依赖的其他包
- 对比前端打包工具：Webpack/Vite 在打包阶段模拟了一套自己的模块解析和加载逻辑（不直接依赖 Node.js 运行时的 `require` 实现），但解析算法的思路（裸模块名 → `node_modules` 查找）与 Node.js 保持了兼容，这是前端生态"约定俗成"的一部分

#### 三、工程落地参考

1. CJS 模块包装与加载：`lib/internal/modules/cjs/loader.js`（nodejs/node 仓库）— `Module.prototype._compile`、`Module._cache`、`Module._resolveFilename` 路径解析算法
2. ESM 加载器：`lib/internal/modules/esm/loader.js` — 解析/实例化/求值三阶段的实现入口
3. libuv 线程池与异步 I/O 的 C++ 绑定：概览级介绍 `deps/uv` 目录结构和 `lib/internal/bootstrap` 中 JS 层如何调用底层绑定

#### 四、实践演示与验证

1. 搭建 `packages/mini-require`：手写一个简化版 `require` 实现——读取文件、用 `vm` 模块或 `new Function` 包装执行、维护自己的模块缓存 Map，验证"同一模块二次 require 不会重新执行"与"循环依赖时后加载方拿到不完整 exports"两个现象
2. 写一组对照 demo：同一份逻辑分别用 CJS 和 ESM 实现一次循环依赖场景，观察两者行为差异

#### 五、参考
- https://nodejs.org/api/modules.html
- https://nodejs.org/api/esm.html
- https://github.com/nodejs/node

**面试核心问**：
- Node.js 的运行时架构是怎样的？V8 和 libuv 分别负责什么？
- `require` 的模块缓存机制是怎样的？为什么二次 `require` 同一个模块不会重新执行代码？
- CJS 遇到循环依赖会发生什么？和 ESM 处理循环依赖的方式有什么不同？
- ESM 为什么不能被 CJS 用 `require` 直接引入，只能用动态 `import()`？
- 什么是"幽灵依赖"？它是怎么由 Node.js 的模块解析算法导致的？



## 已有笔记

- @docs\notes\08 node\08 Node基本概念.md
- @docs\notes\08 node\09 Node中的模块.md
- @docs\notes\08 node\11 NPM.md

## plans 地址

- @docs\plans\05 node-fullstack-series-outline.md

## 规则

- 笔记只关注 @docs/notes/08 node 目录下的，其他目录禁止自行读取
- 补全内容（保留原有内容，只增不删），保留图片，一些知识点的说明图片可以从网络上获取，尽量使用图片加以说明，这样跟容易学习和理解
- 将整理后的内容生成公众号文章，输出到 @docs/articles/08 node
- 文章结构：先出大纲等我确认，再逐节写作
}}
，注意⚠️：
- 本系列 适用于 5-10年的nodejs 开发者，想要系统性的学习，并且想要完全掌握 nodejs 的开发者。
- 保留笔记完整代码和图片，样式格式保持一致和这篇@docs\articles\08 node\2026-09-18-node-eventemitter-promise-concurrency.md，不读我没要求到的文件；
- 可以根据你的经验和最佳实践查漏补缺；主线要明确清晰，不要遗漏源码解析章节；每个知识点都要由浅入深的彻底讲透，讲明白。
```
