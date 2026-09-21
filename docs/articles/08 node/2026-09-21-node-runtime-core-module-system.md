# Node.js 运行时内核：V8+libuv 架构 + CommonJS 加载机制 + ESM 深度拆解（面试收藏级）

> **副标题**：V8+libuv 双引擎架构、CommonJS 模块加载机制、ESM 三阶段加载与 CJS 互操作、模块解析算法与幽灵依赖成因

> 面试官把键盘推过来：「写一个 mini-require 吧，要求能缓存、能处理循环依赖。」——你心里咯噔一下：`require` 不是天生就有的吗？它背后到底发生了什么？

---

## 🎯 这篇文章解决什么问题

前端转 Node.js 到第五年，你早就把 `require`/`import` 写成了肌肉记忆。但被问到底层——`require` 是同步还是异步？模块缓存存在哪、以什么为 key？CJS 和 ESM 遇到循环依赖为什么行为不一样？「幽灵依赖」到底是谁的锅？——很多人就只能背结论，说不出机制。

这篇文章是「Node.js 全栈深度拆解」系列的第 3 篇。它不讲 JS 的模块化规范演进（IIFE/AMD/CMD/UMD/ESM 那些**语言规范层面**的对比和 Tree Shaking 原理，已经在《JS 有几种模块化规范》里讲透了，搜索关键词「JS 模块化规范 AMD CMD UMD Tree Shaking」），也不重复 npm/pnpm 的存储机制（搜索关键词「pnpm 硬链接软链接 幽灵依赖 lock 文件」）。它只讲一件事：

**「规范之上，Node.js 运行时到底是怎么把一份文件加载、解析、缓存成模块的。」**

这条主线贯穿三个层次：**运行时架构**（V8 + libuv 怎么分工）→ **两套加载器**（CommonJS 的同步缓存模型 vs ESM 的三阶段异步模型）→ **解析算法**（裸模块名怎么找到文件，幽灵依赖怎么产生）。

---

## 一、使用与实践

### 1. `"type": "module"` 与 `.mjs`/`.cjs` 双扩展名

Node.js 判断一个 `.js` 文件按 CommonJS 还是 ESM 解释，依据是它**所在目录**（向上最近的）`package.json` 里的 `type` 字段：

```json
{
  "name": "his-api",
  "type": "module"   // 👈 有它，本目录下的 .js 都按 ESM 解析；不写则默认 CommonJS
}
```

这套「就近 `package.json` 决定」的规则有个很实际的问题：同一个项目里，老代码是 CJS、新代码想写 ESM，光靠 `type` 字段只能二选一。于是 Node 提供了两个**扩展名兜底**：

- `.mjs`：无论 `type` 写什么，**强制**按 ESM 解析
- `.cjs`：无论 `type` 写什么，**强制**按 CommonJS 解析

所以在存量项目里渐进迁移 ESM，标准姿势是：把新模块写成 `.mjs`（或 `type: "module"` 后把老模块改成 `.cjs`），两种体系并存互不干扰。这个「双扩展名并存策略」本身，就是「文件类型不敏感（不猜你写的是哪种语法）」的设计思想体现——**类型由扩展名/配置显式声明，而不是让 Node 去猜**。

### 2. Node 全局对象盘点

Node 环境里有一批「看起来像全局变量」的东西，其实来源分两类，这个区分本身就是考点：

| 全局对象 | 来源 | 说明 |
|---------|------|------|
| `process` | 真正的全局对象 | 当前进程信息、环境变量、标准输入输出 |
| `global` | 真正的全局对象 | 等价于浏览器的 `window`，真正的全局作用域挂载点 |
| `Buffer` | 真正的全局对象 | 二进制数据缓冲区（Node 特有，浏览器无） |
| `setImmediate` / `setTimeout` / `setInterval` | 真正的全局对象 | 定时器类 |
| `__dirname` / `__filename` | **CJS 模块包装函数的参数** | 当前文件所在目录 / 当前文件的绝对路径，ESM 里没有 |
| `require` / `module` / `exports` | **CJS 模块包装函数的参数** | 模块加载与导出，ESM 里没有 |

关键点：`__dirname`、`__filename`、`require`、`module`、`exports` 这五个**不是**真正的全局对象，而是 CommonJS 模块包装函数的形参（后面「二、2」会展开包装函数）。这也解释了为什么在 `.mjs` 文件里直接写 `__dirname` 会 `ReferenceError`——ESM 没有这层包装函数。

### 3. ESM 里拿 `__dirname` 等价物

ESM 里没有 `__dirname`，但可以用 `import.meta.url`（当前模块的 file URL）+ `fileURLToPath` 组合出同样的值：

```javascript
// esm-mod.mjs
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __filename = fileURLToPath(import.meta.url)  // file:///D:/.../esm-mod.mjs → D:\...\esm-mod.mjs
const __dirname = dirname(__filename)              // 当前文件所在目录
```

`import.meta` 是 ESM 专有的元信息对象，`import.meta.url` 拿到的是当前模块文件的标准 URL 字符串（`file://` 开头），`fileURLToPath` 负责把它还原成平台路径。这是「ESM 里要拼路径」时绕不开的两件套。

### 4. `require.cache` 与热重载

`require.cache` 是 Node 暴露出来的模块缓存对象，它的结构是 **「绝对路径 → Module 实例」** 的映射。你可以直接看它、也可以动手清它：

```javascript
const config = require('./drug-dict')            // 第一次加载，执行文件，缓存
console.log(require.cache)                        // { 'D:\\...\\drug-dict.js': Module {...}, ... }

// 手动清除缓存，下次 require 会重新执行文件
const id = require.resolve('./drug-dict')         // 拿到绝对路径
delete require.cache[id]                          // 删掉缓存占位
const freshConfig = require('./drug-dict')        // 重新读取、重新执行
```

🔧 **真实场景**：医院 HIS 系统里的「药品字典」是一份经常要改的配置（药品增删、价格调整）。不改代码、只改配置文件就要生效的话，不能重启服务——做法就是：后台提供一个「刷新配置」接口，内部 `delete require.cache[configPath]` 后再 `require` 一次，实现**配置热重载**。这就是「缓存可清」在工程上的直接价值。要提醒的是，这只是原理性演示，生产级热更新通常要更谨慎（旧模块可能仍有对象被别处持有，删缓存不保证旧引用被回收）。

### 5. 动态 `import()` 在 CJS 里按需加载 ESM

CJS 文件想用 ESM 模块，唯一的入口是动态 `import()`（返回 Promise，后面「二、5」会讲为什么同步 `require` 做不到）：

```javascript
// check-drug.js（CommonJS 文件）
async function checkDrugInteraction(drugId) {
  // 按需加载 ESM 模块，返回 Promise
  const { interactionEngine } = await import('./interaction-engine.mjs')
  return interactionEngine.check(drugId)
}

// 调用时再 await，或者直接 .then
checkDrugInteraction('D-10086').then((result) => console.log(result))
```

动态 `import()` 和静态 `import` 语句的区别在于：它是**运行时**才决定加载哪个模块、返回 Promise、可以用在任何地方（包括条件分支、函数体内）。在 CJS 文件里，它是你连接 ESM 世界的唯一桥梁。

---

## 二、设计与原理

### 1. 双引擎架构：V8 执行 JS，libuv 负责 I/O

Node.js 不是一个「语言」，而是一个由三块拼起来的**运行时**：

- **V8**：Google 的 JS 引擎，负责执行 JS 代码本身——解析、编译、垃圾回收（GC）。它只管「把 JS 跑起来」，**没有任何 I/O 能力**。
- **libuv**：跨平台的异步 I/O 库，负责事件循环、非阻塞 I/O、线程池。Node 里所有 `fs`/`net`/`http` 的异步能力，最终都落到 libuv。
- **一层 C++ 绑定**：把 V8 和 libuv 粘起来，让 JS 能通过 `process.binding`/`internalBinding` 调到 libuv 提供的接口。

一句话记住：**JS 代码本身不具备任何 I/O 能力，Node 里的一切 I/O 都依赖 libuv 提供的异步接口**。你在 JS 里写的 `fs.readFile`，本质是调 libuv 去发起一次异步读文件，读完了 libuv 再把结果塞回事件循环通知你的回调。

![Node.js 事件循环与 libuv 架构：JS 代码交给 V8 处理，Node API 交给 libuv 处理，结果通过事件队列回到应用](https://cdn.nlark.com/yuque/0/2020/png/738210/1608040567777-b72f7907-d4a5-4f65-89df-1eec6c5ecdb2.png)

这张图的链路是：**JS 代码 → V8 执行 → 调 Node API → libuv 处理（阻塞 I/O / 多线程实现异步 I/O）→ 事件驱动把结果放进事件队列 → 回到应用回调**。libuv 六阶段的细节（timers/poll/check 那些）是第 02 篇事件循环的重点，这里你只需要抓住「V8 管计算、libuv 管 I/O」这个分工。

> 💬 **面试官**：Node.js 的运行时架构是怎样的？V8 和 libuv 分别负责什么？
>
> ✅ 标准答案：Node.js 是「V8 + libuv + 一层 C++ 绑定」组成的运行时。V8 负责执行 JS 代码本身（解析、编译、GC），libuv 负责跨平台的异步 I/O、事件循环和线程池。JS 代码本身没有任何 I/O 能力，所有异步 I/O 都依赖 libuv 提供的接口。
>
> 🎁 加分答案：能补一句「libuv 用线程池来跑那些『操作系统没有提供异步接口』的阻塞操作（如 DNS 查询、部分文件操作），而有异步接口的（如 epoll/kqueue）则直接走非阻塞事件循环」，说明你分得清「真异步」和「线程池模拟的异步」——这是 Node I/O 体系里一个很能拉开差距的细节。

### 2. CommonJS 加载机制：同步、缓存、包装函数

CommonJS 的 `require` 有三大特征，理解了它们，CJS 的所有「怪行为」都能解释：

**① `require` 是同步的。** 遇到 `require('./a')` 时，Node 会**立即**同步地读取 `a` 文件内容、编译、执行，拿到 `module.exports` 后才继续往下走。所以 CJS 里 `require` 的返回值是当场就有的，不需要 `await`。这也是为什么它能用 `fs.readFileSync`（同步读文件）来实现。

**② 模块有缓存。** 加载完的模块会缓存到 `require.cache`（key 是模块文件的**绝对路径**），下次 `require` 同一个文件时直接返回缓存的 `module.exports`，**不会重新执行文件代码**。这意味着：一个模块无论被 `require` 多少次，它的顶层代码只执行一次。

**③ 每个文件被包了一层函数再执行。** 这是最容易被忽略、也最能解释「为什么 CJS 里能直接用 `exports`/`require`/`module`/`__filename`/`__dirname`」的一点。Node 会把你的文件内容包成这样再执行：

```javascript
function (exports, require, module, __filename, __dirname) {
  // 👈 你的文件内容原样放在这里
}
```

所以这些「看起来像全局变量」的标识符，其实是**这个包装函数的五个形参**。你写的 `exports.foo = 1`，`exports` 就是这个函数收到的第一个参数；`module` 是第三个参数，`module.exports` 才是最终导出出去的东西。

理解了包装函数，`exports` 和 `module.exports` 的区别就一目了然了——它们**初始时指向同一个空对象**（`exports = module.exports = {}`），但 `exports` 只是个「引用别名」，改了它的指向不影响真正导出的 `module.exports`：

| 对比项 | `module.exports` | `exports` |
| --- | --- | --- |
| 默认指向 | 初始值 `{}`（`exports = module.exports`） | 初始值 `{}` |
| 导出类型 | 任何类型（对象、函数、类） | 只能加属性，不能改引用 |
| 修改方式 | 直接赋值会更改导出对象 | 直接赋值会断开与 `module.exports` 的关联 |
| 推荐用法 | 导出单个对象/函数/类 | 导出多个属性/方法 |

用代码验证「正确用法」和「常见错误」：

```javascript
// ✅ 正确：module.exports 导出单个函数
// myModule.js
function greet() {
  console.log("Hello, Node.js!");
}
module.exports = greet;
```

```javascript
// main.js
const greet = require('./myModule');
greet(); // 输出: Hello, Node.js!
```

```javascript
// ✅ 正确：exports 挂多个属性
// myModule.js
exports.name = "Node.js";
exports.version = "18.0.0";
exports.greet = function () {
  console.log("Hello, World!");
};
```

```javascript
// main.js
const myModule = require('./myModule');
console.log(myModule.name); // 输出: Node.js
console.log(myModule.version); // 输出: 18.0.0
myModule.greet(); // 输出: Hello, World!
```

```javascript
// ❌ 错误 1：直接给 exports 赋值，等于改了形参的引用，module.exports 还是 {}
// myModule.js
exports = function () {
  console.log("Hello, Node.js!");
};
```

```javascript
// main.js
const myModule = require('./myModule');
console.log(myModule); // 输出: {}（空对象，因为真正导出的是 module.exports）
```

错误 1 的根因：`exports = ...` 只是让「`exports` 这个形参」指向了新函数，而包装函数执行完后 Node 拿走的是 `module.exports`，它还是那个空对象。

```javascript
// ❌ 错误 2：先 exports.name，再 module.exports 赋值，后者覆盖前者
// myModule.js
exports.name = "Node.js";
module.exports = function () {
  console.log("Hello, Node.js!");
};
```

```javascript
// main.js
const myModule = require('./myModule');
console.log(myModule.name); // undefined（exports.name 被覆盖丢失）
myModule(); // 输出: Hello, Node.js!
```

最佳实践一句话：**要导出单个函数/类/对象就用 `module.exports = ...`；要导出多个属性就用 `exports.xxx = ...`；千万别在同一个文件里混用、也别给 `exports` 重新赋值。**

> 💬 **面试官**：`require` 的模块缓存机制是怎样的？为什么二次 `require` 同一个模块不会重新执行代码？
>
> ✅ 标准答案：`require` 加载完模块后，会以「文件的绝对路径」为 key，把模块缓存进 `require.cache`。之后对同一路径的 `require` 直接命中缓存、返回 `module.exports`，不会重新执行文件。所以模块顶层代码只执行一次。
>
> 🎁 加分答案：能点出「缓存 key 是绝对路径」这个细节（所以同一个文件用相对路径、绝对路径、不同大小写去 require，可能产生多份缓存），以及「提前缓存」是 CJS 循环依赖拿到「不完整 exports」的根本原因（下面第 3 点展开），说明你对缓存机制理解到了「为什么要先缓存再执行」这一层。

### 3. CJS 循环依赖：拿到的是「执行到一半」的 exports

CJS 的循环依赖问题，是「运行时求值 + 提前缓存占位」两个机制叠加的直接后果。看这个例子：

```javascript
// a.js
exports.name = 'A'
const b = require('./b')      // 👈 这里去加载 b
console.log('a 里的 b:', b)
exports.done = true           // 👈 这行要等 b 加载完才执行到

// b.js
const a = require('./a')      // 👈 b 又要加载 a
console.log('b 里的 a:', a)   // 打印的是 a「执行到一半」的 exports
exports.fromB = 'B'
```

执行 `node a.js` 的输出是：

```text
b 里的 a: { name: 'A' }
a 里的 b: { fromB: 'B' }
```

为什么 `b` 里打印的 `a` 是 `{ name: 'A' }` 而不是 `{ name: 'A', done: true }`？因为加载顺序是这样的：

1. `a` 开始执行，先挂上 `exports.name = 'A'`；
2. 执行到 `require('./b')`，此时 **a 已经被提前缓存**（占位，但还没执行完）；
3. 去加载 `b`，`b` 里 `require('./a')` 时**命中缓存**，拿到的是 a「当前已执行部分」的 exports —— 只有 `name`，没有 `done`；
4. `b` 执行完返回，`a` 继续往下，才把 `exports.done = true` 补上。

**关键结论**：循环依赖时，后加载的模块拿到的是对方「当前已执行部分」的 `exports`（可能不完整）。这是「先缓存占位、再执行」的必然结果——缓存这一步保证了循环不会死循环，但也牺牲了「拿到完整导出」的确定性。所以 CJS 里循环依赖通常意味着设计有问题，能拆就该拆。

> 💬 **面试官**：CJS 遇到循环依赖会发生什么？
>
> ✅ 标准答案：后加载的模块会拿到对方「当前已执行部分」的 `module.exports`，可能不完整（缺了还没执行到的导出）。根因是 Node 先「缓存占位」再执行模块体，循环时命中的是半成品缓存。
>
> 🎁 加分答案：能说明「缓存占位」是防止死循环的机制，同时指出这是设计缺陷的信号——CJS 循环依赖往往能跑但不稳，正确做法是抽公共依赖打破环，而不是依赖这个「半成品」行为。

### 4. ESM 模块机制：静态、三阶段、活绑定

ESM 和 CJS 的差异是根本性的，不是「换个语法」：

**① `import`/`export` 是静态的、编译期可分析的。** `import` 必须写在模块顶层、模块路径必须是字符串字面量，这让工具在**运行前**就能确定依赖关系、做静态分析——这也是 Tree Shaking 能实现的基础（哪些导出没人用，编译期就知道，直接摇掉）。CJS 的 `require` 是运行时求值的，路径可以是变量、可以写在条件里，天然无法静态分析。

**② 加载分三个阶段。** Node 对 ESM 的加载不是 CJS 那种「读取即执行」的一步到位，而是拆成三段：

- **解析（parse）**：把源码解析成模块记录（Module Record），拿到 import/export 声明；
- **实例化（instantiate）**：解析所有依赖，建立**模块图**和模块之间的**导出绑定关系**（这一步不执行代码，只建「谁导出什么、谁引用了谁」的关联）；
- **求值（evaluate）**：按依赖的深度优先后序，执行模块体代码。

**③ 导出是「活绑定」（live binding），不是值拷贝。** 这是 ESM 和 CJS 循环依赖行为不同的**根因**——CJS 的 `exports` 是个普通对象，`require` 拿到的是那个对象当时的快照；ESM 的导入是「指向导出方变量的实时引用」，导出方后续改了值，导入方能看到最新的值。

活绑定直接改变了 ESM 循环依赖的表现。看这个例子：

```javascript
// a.mjs
import { b } from './b.mjs'
export let a = 'A'
console.log('a 读到 b:', b)

// b.mjs
import { a } from './a.mjs'
export let b = 'B'
console.log('b 读到 a:', a)
```

因为 `export let a` 是**声明式导出 + 活绑定**，`b.mjs` 里引用的 `a` 和 `a.mjs` 里定义的是同一个绑定。但这里也有个陷阱——如果 `b.mjs` 在 `a.mjs` 给 `a` 赋值**之前**就访问了 `a`，会因为 TDZ（暂时性死区）直接抛 `ReferenceError`。这是 ESM 用「声明式绑定」换来的代价：**要么拿到最新的活值，要么在初始化前访问直接报错，绝不给你一个静默的半成品**。这和 CJS「静默返回不完整对象」形成鲜明对比。

> 💬 **面试官**：ESM 加载分几个阶段？和 CJS 的同步模型本质区别是什么？
>
> ✅ 标准答案：ESM 分「解析 → 实例化 → 求值」三阶段——解析生成模块记录，实例化建立模块图和导出绑定（不执行代码），求值才执行模块体。CJS 是「读取即执行」的同步一步到位，二者模型完全不同。
>
> 🎁 加分答案：能说出「实例化阶段建立的是活绑定（live binding），导入方拿到的是导出变量的实时引用而非值拷贝」，以及「Tree Shaking 之所以可行，正是因为 import/export 是编译期可静态分析的」，把三阶段和工程收益串起来。

### 5. ESM 与 CJS 互操作：单向的桥梁

两种模块体系共存，互操作的规则是**单向**的：

**ESM 可以 `import` CJS 模块。** CJS 的 `module.exports` 会被当作 ESM 的**默认导出**（`default`）：

```javascript
// my-cjs-module.js
module.exports = { name: 'CJS', version: '1.0.0' }

// my-esm.mjs
import cjsMod from './my-cjs-module.js'   // cjsMod 就是那个 module.exports 对象
console.log(cjsMod.name)
```

顺带一提，Node 内部用 `cjs-module-lexer` 对 CJS 的 `exports` 做静态分析，所以某些 CJS 模块（尤其 `module.exports.xxx = ...` 这种写法）还能被 ESM **具名导入**，比如 `import { readFile } from 'node:fs'`。但这是「尽力而为」的解析，最稳妥的还是把整个 `module.exports` 当默认导出用。

**CJS 不能直接用 `require` 加载 ESM 模块。** 根因是：`require` 是**同步**的，而 ESM 的加载要走「实例化 → 求值」这套**异步**过程（依赖解析、可能的顶层 `await`），同步的 `require` 没法等待一个异步完成。所以 CJS 侧只能走动态 `import()`（返回 Promise，前面「一、5」已经给了写法）。

> 💬 **面试官**：ESM 为什么不能被 CJS 用 `require` 直接引入，只能用动态 `import()`？
>
> ✅ 标准答案：`require` 是同步的，而 ESM 的加载是异步的（实例化建立模块图、求值、可能还有顶层 `await`），同步的 `require` 无法等待一个异步过程完成，所以只能借动态 `import()` 这个返回 Promise 的异步入口。
>
> 🎁 加分答案：能补「ESM 可以 import CJS，`module.exports` 被当作默认导出，且 Node 用 cjs-module-lexer 静态分析支持部分具名导入」这半条反向规则，再补一个前沿点——Node 22.12+ 已实验性支持「同步 ESM」的 `require()`（无顶层 `await` 的 ESM 模块可被 require，有顶层 `await` 则抛 `ERR_REQUIRE_ASYNC_MODULE`），说明你对版本演进也跟得上。

### 6. 模块解析算法与「幽灵依赖」的成因

当你写 `require('lodash')` 这种**裸模块名**（bare specifier，不带 `./` 或 `/`），Node 按固定顺序解析它到底指哪个文件：

1. **核心模块**：是不是 `fs`/`path` 这类内置模块？是就直接返回；
2. **相对/绝对路径**：`./xxx`、`/xxx` 直接定位文件；
3. **`node_modules` 逐级向上查找**：从当前文件所在目录开始，一路向上找 `node_modules/lodash`，直到文件系统根目录。找到谁就是谁。

![Node 模块加载策略：先查文件缓存，再判断是否原生模块，非原生则按扩展名加载并缓存，最后返回 exports](https://cdn.nlark.com/yuque/0/2025/png/738210/1741771294837-633aa0ad-8829-4517-8925-9de4a43de259.png)

第 3 步「逐级向上查找」就是**幽灵依赖（phantom dependency）**的成因。它意味着：**一个包能访问到的，不一定是它自己 `package.json` 里声明的依赖，而是它所在的 `node_modules` 树里「恰好能向上找到」的任何包**。

配合 npm 的「扁平化安装」（把所有依赖尽量提升到顶层 `node_modules`，只把版本冲突的嵌套下去），后果就出现了：假设你的项目没装 `lodash`，但某个依赖 `A` 依赖了它，npm 把 `lodash` 提升到了顶层 `node_modules`，于是你的代码里直接 `require('lodash')` 也能用——**直到某天 `A` 升级、不再依赖 `lodash`，`lodash` 被从顶层移除，你的代码就突然 `MODULE_NOT_FOUND` 了**。

> 幽灵依赖的完整来龙去脉（npm 扁平化机制、pnpm 如何用严格模式+符号链接规避）在《包管理器深度对比》那篇已经讲透，搜索关键词「pnpm 硬链接 软链接 幽灵依赖」。这里你只需要抓住本篇的主线：**幽灵依赖的直接推手是「node_modules 逐级向上查找」这个解析算法，npm 扁平化只是把「不该提升的包」放到了能被查到的位置。**

![文件模块查找规则：先拼路径、补扩展名、查目录 index，找不到再进入下一层 node_modules 继续找](https://cdn.nlark.com/yuque/0/2025/png/738210/1741771295237-25881a7b-9078-446a-ae9c-0a0669e43f5b.png)

> 💬 **面试官**：什么是「幽灵依赖」？它是怎么由 Node 的模块解析算法导致的？
>
> ✅ 标准答案：幽灵依赖是指「你的代码用到了一个没在自己 `package.json` 里声明的包，却能正常运行」——因为它被别的依赖间接带入、且被提升到了能被解析到的位置。根因是 Node 对裸模块名按「node_modules 逐级向上查找」解析，一个包能访问到它所在目录树上「恰好能找到」的任何包，而 npm 扁平化把间接依赖提升到顶层，放大了这个可访问范围。
>
> 🎁 加分答案：能点出「pnpm 用严格模式（只暴露声明过的依赖）从根上杜绝幽灵依赖」这一解法，以及「幽灵依赖的隐患在于它随时可能消失——上游依赖升级后你的代码会突然挂掉」，说明你不只懂成因，还懂危害和解法。

### 7. 对比前端打包工具：同一套解析思路的「约定俗成」

Webpack/Vite 这些打包工具，在打包阶段会**自己模拟一套模块解析和加载逻辑**——它们不依赖 Node 运行时的 `require` 实现（浏览器里根本没有 `require`），而是用自己的 resolver 去解析 `import`、自己生成模块 id、自己维护一个「模块 → 函数」的加载表。

但有意思的是，它们的**解析算法思路**（裸模块名 → 从当前目录逐级向上找 `node_modules`）和 Node.js 保持了兼容。原因很简单：前端依赖也装在 `node_modules` 里，如果打包工具的解析规则和 Node 不一致，同一个 `import 'lodash'` 在 Node 环境和打包后产物里会解析到不同的文件，生态就乱了。所以「裸模块名 → node_modules 向上查找」这套规则，成了前后端共用的**约定俗成**——你在 Webpack 的 `resolve` 配置里看到的那些 `extensions`、`alias`、`modules` 字段，本质就是对 Node 这套解析算法的「可配置化扩展」。

---

## 三、源码解析（重点代码，来源 nodejs/node 仓库）

> Node.js 源码地址：https://github.com/nodejs/node（本篇基于当前主分支 `lib/internal/modules/cjs/loader.js` 与 `lib/internal/modules/esm/loader.js`）

前面讲的是「设计原理」，这一节贴出 Node 真实源码（做了精简，保留关键路径），验证每一条结论在代码里到底长什么样。

### 1. `Module._load`：require 的完整生命周期

`require` 的入口最终都走到 `Module._load`，它把「解析路径 → 查缓存 → 建模块 → 提前占位 → 加载」这条链完整串了起来：

```javascript
// lib/internal/modules/cjs/loader.js（精简）
Module._cache = Object.create(null);   // 👈 模块缓存：绝对路径 -> Module 实例

Module._load = function(request, parent, isMain) {
  // ① 解析成绝对路径（补扩展名、找 node_modules）
  const filename = Module._resolveFilename(request, parent, isMain);

  // ② 查缓存：命中直接返回，不再执行文件
  const cachedModule = Module._cache[filename];
  if (cachedModule !== undefined) {
    return cachedModule.exports;
  }

  // ③ 未命中，新建一个 Module 实例
  const module = new Module(filename, parent);

  // ④ 先缓存占位，再执行 —— 这是循环依赖拿到「半成品」的根本原因
  Module._cache[filename] = module;

  try {
    module.load(filename);      // ⑤ 真正读取、编译、执行
    return module.exports;
  } catch (err) {
    delete Module._cache[filename];  // 加载失败，回滚缓存，下次可重试
    throw err;
  }
};
```

对照前面「二、2」「二、3」的结论，全部能对上：**缓存 key 是绝对路径**（`Module._cache[filename]`）、**命中缓存直接返回 `exports` 不重新执行**、**先 `_cache[filename] = module` 占位再 `load`**（所以循环依赖时后加载方拿到的是半成品）、**加载失败会删缓存回滚**（这是「require 失败后重试能重新加载」的保障）。

`new Module(filename, parent)` 建出来的这个模块实例，身上还挂着几个属性，笔记里常被问到：

- `module.id`：模块的绝对路径（主入口模块的 `id` 是 `.`）
- `module.filename`：模块文件的绝对路径
- `module.loaded`：是否已加载完成的布尔值
- `module.parent`：第一个 `require` 它的父模块
- `module.children`：它 `require` 过的所有子模块
- `module.paths`：它解析 `node_modules` 时逐级向上查找的路径列表

其中 `parent`/`children` 是「模块依赖树」的骨架——通过它们你能从任意模块回溯「谁加载了我、我加载了谁」，排查「某个模块到底被谁引入、引入顺序对不对」这类问题时很实用。

### 2. `_resolveFilename` 与 `_compile`：路径解析 + 包装执行

`Module._resolveFilename` 负责把「用户写的字符串」解析成「磁盘上的绝对路径」——补扩展名、找 node_modules，这正是「二、6」解析算法的落地：

```javascript
// lib/internal/modules/cjs/loader.js（精简）
Module._resolveFilename = function(request, parent, isMain) {
  // ... 核心逻辑：tryExtensions / tryPackage / nodeModulesPaths
  // 1. 如果是核心模块（fs/path 等），直接返回
  // 2. 相对/绝对路径：拼出绝对路径后，逐个尝试补 .js/.json/.node 扩展名
  // 3. 裸模块名：用 nodeModulesPaths() 生成「当前目录向上每一层 node_modules」的候选列表，逐个找
};
```

`Module.prototype._compile` 则是「模块包装函数」的实现处——它把文件内容读出来，用 `Module.wrap` 包成那个 `function(exports, require, module, __filename, __dirname) {...}`，再编译执行：

```javascript
// lib/internal/modules/cjs/loader.js（精简）
Module.wrapper = [
  '(function (exports, require, module, __filename, __dirname) { ',
  '\n});'
];

Module.prototype._compile = function(content, filename) {
  const wrapper = Module.wrap(content);        // 用 Module.wrapper 包裹文件内容
  const compiledWrapper = vm.runInThisContext(wrapper, { filename });  // 编译成函数
  const dirname = path.dirname(filename);
  const require = makeRequireFunction(this);   // 生成绑定到当前模块的 require
  // 👈 调用包装函数，把 exports/require/module/__filename/__dirname 五个实参传进去
  compiledWrapper.call(this.exports, this.exports, require, this, filename, dirname);
};
```

`compiledWrapper.call(this.exports, ...)` 这一句就是「二、2」包装函数原理的真实落点——五个形参被五个实参填充，你的文件内容在这个函数的执行上下文里跑，`this` 指向 `module.exports`。这也是为什么「四、1」手写 mini-require 时，用 `vm.runInThisContext` + `fn.call` 就能还原这套机制。

### 3. ESM 加载器与 libuv 绑定：概览

ESM 的加载器在 `lib/internal/modules/esm/loader.js`，核心是 `ESMLoader` 类和一个 `ModuleMap`。它不直接读文件执行，而是维护「模块 URL → Module Record」的映射，把「二、4」的三阶段落地成几个方法：

- `getModuleJob` / `getOrCreateModuleJob`：解析（parse）出模块记录；
- `link`：实例化（instantiate），递归解析依赖、建立模块图与活绑定；
- `instantiateModule` + `evaluate`：求值（evaluate），按依赖后序执行模块体。

与 CJS 的 `_load`「一条同步链路走到底」不同，ESM 加载器是**事件/Job 驱动 + 异步**的——这也是 `require` 无法同步加载 ESM 的代码层印证。至于 libuv 绑定，它藏在 `deps/uv`（libuv 的 C++ 源码，事件循环、线程池、异步 I/O 都在这里）和 `lib/internal/bootstrap`（Node 启动时 JS 层通过 `internalBinding` 把底层 C++ 能力挂载进来）——这一层属于「概览级」了解，知道「JS 层的 `fs`/`net` 最终调到了 `deps/uv` 的 C++ 实现」就够，不深入 C++ 细节。

---

## 四、手写实现

理解了原理与源码，这一节把 CommonJS 的加载机制完整手写出来——一个简化版的 `require`，再补一组 CJS vs ESM 循环依赖的对照 demo，用运行结果直观验证两种体系的差异。

### 1. mini-require：完整实现

下面这份实现，用 `fs` + `path` + `vm` 三个内置模块，还原了 CJS 的核心机制：读文件 → 包装函数 → 编译执行 → 维护自己的缓存。它验证了「二」里讲的三个现象：**同一模块二次 require 不重新执行**、**循环依赖拿到半成品 exports**：

```javascript
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function Module(id) {
  this.id = id;           // 模块的绝对路径
  this.exports = {};      // 导出的对象，默认为空
}

// 包装函数模板：你的文件内容会被塞进这两个字符串中间
Module.wrapper = [
  `(function(exports,require,module,__filename,__dirname){`,
  `})`
];

// 策略模式：不同扩展名用不同的加载方式
Module._extensions = {
  '.js'(module) {
    let content = fs.readFileSync(module.id, 'utf8');      // 同步读文件
    content = Module.wrapper[0] + content + Module.wrapper[1]; // 包一层函数
    let fn = vm.runInThisContext(content);                  // 编译成函数
    let exports = module.exports;
    let dirname = path.dirname(module.id);
    fn.call(exports, exports, req, module, module.id, dirname); // 执行，传五个实参
  },
  '.json'(module) {
    let content = fs.readFileSync(module.id, 'utf8');
    module.exports = JSON.parse(content);                   // JSON 直接解析
  }
};

// 解析路径：拼绝对路径，逐个尝试补扩展名
Module._resolveFilename = function (filename) {
  let absPath = path.resolve(__dirname, filename);
  let isExists = fs.existsSync(absPath);
  if (isExists) {
    return absPath;
  } else {
    let keys = Object.keys(Module._extensions);
    for (let i = 0; i < keys.length; i++) {
      let newPath = absPath + keys[i];
      let flag = fs.existsSync(newPath);
      if (flag) {
        return newPath;
      }
    }
    throw new Error('module not exists');
  }
};

Module.prototype.load = function () {
  let extName = path.extname(this.id);   // 拿到扩展名
  Module._extensions[extName](this);     // 按扩展名分发（策略模式）
};

Module._cache = {};                       // 模块缓存：绝对路径 -> Module 实例

function req(filename) {
  filename = Module._resolveFilename(filename);  // ① 解析成绝对路径
  let cacheModule = Module._cache[filename];
  if (cacheModule) {
    return cacheModule.exports;                  // ② 命中缓存，直接返回，不重新执行
  }
  let module = new Module(filename);             // ③ 新建模块
  Module._cache[filename] = module;              // ④ 先缓存占位（循环依赖的关键）
  module.load();                                  // ⑤ 读取、编译、执行
  return module.exports;
}
```

验证两个现象。第一个：**二次 require 不重新执行**——给模块文件加一行 `console.log`，`req` 两次，只会打印一次：

```javascript
// counter.js
console.log('counter 被加载了');
module.exports = 1;

// 验证
const a = req('./counter.js');
const b = req('./counter.js');
// 输出只有一行 "counter 被加载了"，证明第二次走了缓存，文件没重新执行
```

第二个：**循环依赖拿到半成品**——跑前面「二、3」的 `a.js`/`b.js` 例子，`b` 里打印的 `a` 只有已执行部分：

```text
b 里的 a: { name: 'A' }
a 里的 b: { fromB: 'B' }
```

这份手写代码的每个步骤都能在「三、1」的 Node 真实源码里找到对应——`_resolveFilename` 补扩展名、`_cache` 提前占位、`wrapper` 包函数、`fn.call` 传五个实参。手写一遍，你才算真正吃透了 `require`。

### 2. CJS vs ESM 循环依赖对照 demo

同一份「互相引用」的逻辑，分别用 CJS 和 ESM 各写一遍，观察行为差异：

```javascript
// ===== CJS 版本 =====
// a.js
exports.name = 'A';
const b = require('./b.js');
console.log('a 读到 b:', b);
exports.done = true;

// b.js
const a = require('./a.js');
console.log('b 读到 a:', a);   // 👈 拿到的是 a 的半成品
exports.fromB = 'B';
```

```javascript
// ===== ESM 版本 =====
// a.mjs
import { b } from './b.mjs';
export let a = 'A';
console.log('a 读到 b:', b);

// b.mjs
import { a } from './a.mjs';
console.log('b 读到 a:', a);   // 👈 活绑定，但若在 a 赋值前访问会 ReferenceError
export let b = 'B';
```

运行 `node a.js` 和 `node a.mjs`，你能看到本质差异：

```text
// CJS：b 里拿到 a 的半成品 { name: 'A' }，静默、不报错，但可能不完整
b 读到 a: { name: 'A' }
a 读到 b: { fromB: 'B' }

// ESM：b 里访问 a 时，若 a 还没执行到赋值语句，因 TDZ 直接抛 ReferenceError
// （不同引擎/时序下可能先完成实例化，读到最新值 'A'，但绝不会是「静默的半成品对象」）
```

**核心差异一句话**：CJS 循环依赖给你一个「可能不完整的值拷贝」，ESM 循环依赖给你一个「活绑定」——要么读到最新值，要么在初始化前访问直接报错，绝不给一个静默的半成品。这个差异的根，就是「二、3」「二、4」讲的「提前缓存占位」vs「实例化阶段建活绑定」两种机制。

---

## 五、手写实现源码地址

- GitHub：https://github.com/...（`medai-node-source` 仓库，`packages/mini-require` 模块，地址待补充）

---

## 六、参考资料

- https://nodejs.org/api/modules.html
- https://nodejs.org/api/esm.html
- https://github.com/nodejs/node（`lib/internal/modules/cjs/loader.js`、`lib/internal/modules/esm/loader.js`）

---

## 💡 面试核心问

- **Node.js 的运行时架构是怎样的？V8 和 libuv 分别负责什么？**（V8 管计算、libuv 管 I/O + 事件循环 + 线程池，JS 无 I/O 能力）
- **`require` 的模块缓存机制是怎样的？为什么二次 `require` 同一个模块不会重新执行？**（`require.cache` 以绝对路径为 key，命中直接返回 exports）
- **CJS 遇到循环依赖会发生什么？和 ESM 处理循环依赖的方式有什么不同？**（CJS 拿到半成品对象 / ESM 活绑定 + TDZ）
- **ESM 为什么不能被 CJS 用 `require` 直接引入，只能用动态 `import()`？**（同步 `require` 无法等待异步实例化）
- **什么是「幽灵依赖」？它是怎么由 Node 的模块解析算法导致的？**（node_modules 逐级向上查找 + npm 扁平化）

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 面试频率 |
|--------|-----------|---------|
| 双引擎架构 | V8 管计算，libuv 管 I/O/事件循环/线程池 | ⭐⭐⭐ 必考 |
| CJS 三特征 | 同步、缓存（key=绝对路径）、包装函数 | ⭐⭐⭐ 必考 |
| CJS 循环依赖 | 提前缓存占位 → 拿到半成品 exports | ⭐⭐⭐ 必考 |
| ESM 三阶段 | parse → instantiate（活绑定）→ evaluate | ⭐⭐⭐ 必考 |
| 互操作 | ESM 可 import CJS；CJS 只能 `import()` 进 ESM | ⭐⭐ 高频 |
| 幽灵依赖 | node_modules 逐级向上查找 + npm 扁平化 | ⭐⭐⭐ 必考 |
| `require.cache` | 手动 delete 实现配置热重载 | ⭐⭐ 高频 |

> 💡 记住这条主线：**运行时架构（V8+libuv）→ CJS 同步缓存加载器 → ESM 三阶段异步加载器 → 两套体系的互操作与循环依赖差异 → 解析算法与幽灵依赖**。模块系统的每一步，都在回答同一个问题：**Node.js 到底是怎么把一份文件变成「可复用、可缓存、有边界」的模块的。**

---

## 📝 思考题

有一段互相引用的循环依赖代码，CJS 版本能跑通但 `b` 里拿到的是 `a` 的半成品；ESM 版本在 `b` 里访问 `a` 时可能直接抛 `ReferenceError`。

问题是：**如果把 ESM 版本里 `b.mjs` 的 `console.log('b 读到 a:', a)` 改成一个函数，等模块求值全部完成之后再调用它去读 `a`，这时能读到什么值？为什么这和「求值过程中直接访问」的结果不一样？** 提示：想想「活绑定」和「TDZ」分别只作用于哪个时间窗口。

欢迎评论区写出你的答案 👇

---

> 🔖 这是「Node.js 全栈深度拆解」系列第 3 篇。上一篇：《Node.js 事件循环：浏览器与 Node 宏任务/微任务差异全解》；下一篇预告：《Node.js I/O 体系：Buffer/Stream/path/fs 全解析与背压机制》
>
> 前置基础扩展阅读：搜索关键词「JS 模块化规范 AMD CMD UMD Tree Shaking」「pnpm 硬链接 软链接 幽灵依赖 lock 文件」「Promise/A+ 规范」
