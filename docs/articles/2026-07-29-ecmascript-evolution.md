# ECMAScript 版本演进全景：ES6 到 ES2026 完整解析（面试收藏级）

> 面试官说「讲讲 ES6 的新特性」，大多数人只能想到箭头函数、let/const、Promise。  
> 能把 ES6 到 ES2026 这 12 年演进说清楚的，才是真正系统理解了 JavaScript 的进化方向。

---

## 🎯 这篇文章解决什么问题

ECMAScript 是 JavaScript 的语言规范，每年 6 月发布一个新版本。从 2015 年的语法大爆炸，到 2026 年的标准库完善，每个版本都有值得深入理解的特性。

这篇文章做两件事：**把每个版本讲清楚原理**，同时**告诉你面试怎么答**。

---

## 🗺️ ECMAScript 是什么

ECMAScript 是语言规范，JavaScript 是实现。就像 USB 协议是规范，不同厂商的设备是实现一样。

浏览器端的 JavaScript = ECMAScript + Web APIs (DOM、BOM)  
Node.js 端的 JavaScript = ECMAScript + Node APIs (fs、net 等)

ES 从 ES1 (1997) 发展至今，ES4 因争议被放弃，ES5 (2009) 确立严格模式，真正的现代化始于 **ES2015 (ES6)**。

---

## ⚡ ES2015 (ES6)：语法大爆炸

ES6 是 JavaScript 史上最重要的版本，从 2009 年的 ES5 一路等到 2015 年，积累了大量新特性。

### let 和 const

`var` 存在三个著名问题：变量提升、函数作用域、可重复声明。`let/const` 解决了这些：

```javascript
// var 的变量提升陷阱
console.log(x); // undefined（不报错！）
var x = 1;

// let 的暂时性死区（TDZ）
console.log(y); // ReferenceError：Cannot access before initialization
let y = 1;
```

`const` 保证的是**绑定不变**，不是值不变：

```javascript
const obj = { name: 'Alice' };
obj.name = 'Bob';  // ✅ 合法，修改的是属性，不是绑定
obj = {};          // ❌ TypeError，修改的是绑定
```

> 💬 **面试官**：let 和 var 的区别是什么？
>
> ✅ **标准答案**：let 是块级作用域，var 是函数作用域；let 有暂时性死区，访问前报 ReferenceError；let 不允许在同一作用域重复声明；var 存在变量提升（声明提升但赋值不提升）。
>
> 🎁 **加分答案**：TDZ 的原理——`let/const` 声明的变量在词法环境创建时就被登记，但直到初始化语句执行才能访问，这段「登记到初始化之间」的区域就是暂时性死区。Babel 编译后可以清楚看到 let 变成了 var，但加了运行时检查。

### 箭头函数

箭头函数不只是语法糖，最核心的区别是 **`this` 的绑定方式**：

```javascript
// 普通函数：this 由调用方式决定（动态绑定）
const obj = {
  name: 'obj',
  greet: function () {
    setTimeout(function () {
      console.log(this.name); // undefined（this 指向全局）
    }, 100);
  }
};

// 箭头函数：this 继承外层词法作用域（静态绑定）
const obj2 = {
  name: 'obj2',
  greet: function () {
    setTimeout(() => {
      console.log(this.name); // 'obj2'，继承 greet 的 this
    }, 100);
  }
};
```

箭头函数的其他限制：没有 `arguments` 对象、不能用作构造函数（无 `prototype`）、不能用 `call/apply/bind` 改变 `this`。

> 💬 **面试官**：箭头函数和普通函数的区别？
>
> ✅ **标准答案**：① `this` 绑定不同：箭头函数词法绑定，普通函数动态绑定。② 没有 arguments，用 rest 参数替代。③ 不能 new，没有 prototype。④ 不能用 call/apply/bind 改变 this。
>
> 🎁 **加分答案**：箭头函数的 this 在定义时确定，Babel 编译时会用 `var _this = this` 提前捕获——这解释了为什么箭头函数的 this「永远指向定义时的外层作用域」这句话是准确的。

### 解构赋值

数组解构和对象解构极大提升了代码可读性：

```javascript
// 数组解构：按位置匹配
const [a, b, ...rest] = [1, 2, 3, 4];
// a=1, b=2, rest=[3,4]

// 对象解构：按名称匹配，可重命名 + 默认值
const { name: username = 'Anonymous', age } = { age: 25 };
// username='Anonymous', age=25
```

🔧 **真实场景**：接口返回值处理中，`const { code, data: { user } } = res` 比层层引用 `res.data.user` 清晰得多。

### 模板字符串

不只是字符串拼接，**标签模板函数（Tagged Template）**才是高级用法：

```javascript
// 基础用法：嵌入表达式
const msg = `Hello, ${name}! 共 ${count} 条消息。`;

// 标签模板：处理 SQL 注入防护
function safeSQL(strings, ...values) {
  return strings.reduce((acc, str, i) =>
    acc + str + (values[i] ? escape(values[i]) : ''), '');
}
const query = safeSQL`SELECT * FROM users WHERE id = ${userInput}`;
```

### 函数参数增强

默认参数、rest 参数和展开运算符：

```javascript
// 默认参数（惰性求值，每次调用重新求值）
function create(name, role = 'user', ts = Date.now()) { ... }

// rest 参数：收集剩余参数为真正的数组（不同于 arguments）
function sum(first, ...nums) {
  return nums.reduce((a, b) => a + b, first);
}

// 展开运算符：数组 / 对象展开
const merged = [...arr1, ...arr2];
const config = { ...defaults, ...userConfig }; // 后者覆盖前者
```

### Class 语法

ES6 Class 是基于原型链的语法糖，本质不变，写法更清晰：

```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() { // 定义在 Animal.prototype，enumerable: false
    return `${this.name} makes a sound.`;
  }

  static create(name) { // 静态方法，定义在 Animal 本身
    return new Animal(name);
  }

  get info() { // 访问器属性
    return `[Animal: ${this.name}]`;
  }
}

class Dog extends Animal {
  constructor(name) {
    super(name); // 📚 子类必须先 super()，才能访问 this
  }

  speak() {
    return super.speak().replace('sound', 'bark');
  }
}
```

> 💬 **面试官**：Class 和构造函数有什么区别？
>
> ✅ **标准答案**：本质相同，都是基于原型链。但 Class 必须用 new 调用（否则 TypeError）；Class 内部默认严格模式；Class 不存在提升；Class 的方法 `enumerable: false`，不会被 `for...in` 遍历。
>
> 🎁 **加分答案**：`class Foo extends Bar {}` 不只建立了 `Foo.prototype` 继承自 `Bar.prototype`，还让 `Foo.__proto__ === Bar`，实现了静态方法的继承——这是函数直接实现继承做不到的。

### 模块化（Module）

ES6 之前有 CommonJS，ES6 引入静态模块系统：

```javascript
// 命名导出
export const PI = 3.14159;
export function add(a, b) { return a + b; }

// 默认导出（每个模块只有一个）
export default class Calculator { ... }

// 导入
import Calculator, { PI, add } from './math.js';
import * as math from './math.js'; // 命名空间导入
```

**ES Module 和 CommonJS 核心对比**：

| 特性 | ES Module | CommonJS |
|------|-----------|----------|
| 加载方式 | 静态分析（编译时） | 动态加载（运行时） |
| 导出内容 | 实时绑定（live binding） | 值拷贝 |
| 异步支持 | ✅ | ❌ |
| Tree-shaking | ✅ | ❌ |

> 💬 **面试官**：ES Module 的 live binding 是什么？
>
> ✅ **标准答案**：ES Module 导出的是值的引用（绑定），不是拷贝。导出模块修改变量后，导入方读到的是最新值。CommonJS `require` 得到的是拷贝，之后的修改不影响已导入的值。
>
> 🎁 **加分答案**：live binding 也是 ESM 支持 Tree-shaking 的基础——静态分析可以确定哪些 binding 实际被用到，打包工具据此删除未引用的代码。

### Promise

Promise 解决了回调地狱，代表异步操作的最终状态：

```javascript
// 状态机：pending → fulfilled | rejected（单向不可逆）
const p = new Promise((resolve, reject) => {
  setTimeout(() => resolve('done'), 1000);
});

// 链式调用：每个 then 返回新 Promise
p.then(result => transform(result))
 .then(data => process(data))
 .catch(err => handleError(err))
 .finally(() => cleanup()); // ES2018 新增
```

ES6 静态方法：

```javascript
// Promise.all：全部成功才成功，任一失败即 reject
const [user, posts] = await Promise.all([fetchUser(), fetchPosts()]);

// Promise.race：第一个决议（成功或失败）就返回
const result = await Promise.race([fetch(url), timeout(5000)]);
```

### Symbol

新的原始类型，每次创建唯一不重复，常用于对象属性键和内置协议扩展点：

```javascript
const id = Symbol('id');
const obj = { [id]: 123 }; // 不被 for...in / JSON.stringify 枚举

// Well-known Symbols：扩展语言内置行为
class Range {
  constructor(start, end) { this.start = start; this.end = end; }
  [Symbol.iterator]() {
    let i = this.start;
    return { next: () => i <= this.end
      ? { value: i++, done: false }
      : { done: true } };
  }
}
for (const n of new Range(1, 3)) console.log(n); // 1 2 3
```

### Map、Set 及其 Weak 版本

```javascript
// Map：键可以是任意类型（对象、函数等）
const map = new Map();
map.set(domNode, metadata); // DOM 节点作键

// Set：值唯一的集合
const unique = [...new Set([1, 2, 2, 3])]; // [1, 2, 3]

// WeakMap：弱引用，键必须是对象，不阻止 GC
// 经典用法：私有数据存储，DOM 删除后数据自动回收
const _private = new WeakMap();
class Foo {
  constructor() { _private.set(this, { secret: 42 }); }
  getSecret() { return _private.get(this).secret; }
}

// WeakSet：跟踪对象是否被处理过（不持有强引用）
const processed = new WeakSet();
```

### Proxy 和 Reflect

Proxy 拦截对象操作，Reflect 提供对应的默认行为：

```javascript
const handler = {
  get(target, prop, receiver) {
    console.log(`Getting ${prop}`);
    return Reflect.get(target, prop, receiver); // 👈 保持默认行为
  },
  set(target, prop, value, receiver) {
    if (typeof value !== 'number') throw TypeError('Must be number');
    return Reflect.set(target, prop, value, receiver);
  }
};

const proxy = new Proxy({}, handler);
```

🔧 **Vue3 的响应式系统**用 Proxy 替代了 Vue2 的 `Object.defineProperty`，解决了后者无法检测数组索引赋值和对象属性新增的问题。Reflect 的所有方法与 Proxy 的 trap 一一对应（共 13 个），让「转发默认行为」的写法更规范。

### Iterator 和 Generator

```javascript
// 可迭代协议：实现 [Symbol.iterator] 方法
function* range(start, end) {
  for (let i = start; i < end; i++) {
    yield i; // 📚 yield 让出控制权，.next() 才继续
  }
}

for (const num of range(1, 4)) console.log(num); // 1 2 3

// Generator 双向通信：.next(value) 可以传值进去
function* accumulate() {
  let total = 0;
  while (true) {
    const n = yield total; // yield 的返回值由下次 .next(n) 提供
    total += n;
  }
}
```

Generator 是协程的实现——这正是 async/await 在 Babel 编译后的本质。

---

## 🎯 ES2016 (ES7)：小而美

只有两个特性，但都很实用：

```javascript
// Array.prototype.includes：语义更清晰，正确处理 NaN
[1, 2, NaN].includes(NaN);  // true ✅
[1, 2, NaN].indexOf(NaN);   // -1 ❌（NaN !== NaN）

// 指数运算符 **（幂运算，右结合）
2 ** 10;      // 1024
2 ** 3 ** 2;  // 右结合：2 ** (3**2) = 2 ** 9 = 512
```

> 💬 **面试官**：includes 和 indexOf 的区别？
>
> ✅ **标准答案**：includes 使用 SameValueZero 算法，能正确处理 NaN（`NaN === NaN` 在此为 true）；indexOf 使用严格相等（===），找不到 NaN。includes 返回布尔值，语义更清晰。

---

## 🔄 ES2017 (ES8)：async/await 改变异步格局

### async/await

async/await 是 Promise + Generator 的语法糖，让异步代码看起来像同步：

```javascript
// 三种写法对比
// 1. 回调（回调地狱）
fetchUser(id, (err, user) => fetchPosts(user.id, (err, posts) => ...));

// 2. Promise 链
fetchUser(id).then(user => fetchPosts(user.id)).then(posts => ...);

// 3. async/await（最清晰）
async function loadUserPosts(id) {
  const user = await fetchUser(id);
  const posts = await fetchPosts(user.id);
  return { user, posts };
}
```

**常见的并发陷阱**：await 会串行化，需要并发时用 Promise.all：

```javascript
// ❌ 串行执行（总耗时 = t1 + t2）
const user  = await fetchUser(1);
const posts = await fetchPosts(1);

// ✅ 并发执行（总耗时 = max(t1, t2)）
const [user, posts] = await Promise.all([fetchUser(1), fetchPosts(1)]);
```

### Object 新方法

```javascript
const obj = { a: 1, b: 2, c: 3 };

Object.values(obj);  // [1, 2, 3]
Object.entries(obj); // [['a',1], ['b',2], ['c',3]]

// Object.getOwnPropertyDescriptors：获取完整描述符（含 getter/setter）
// 用于对象的完整克隆（Object.assign 无法拷贝 getter/setter）
const clone = Object.defineProperties({},
  Object.getOwnPropertyDescriptors(source));
```

### String Padding

```javascript
'5'.padStart(3, '0');     // '005'（数字补零）
'hello'.padEnd(10, '.');  // 'hello.....'
```

---

## 🌊 ES2018 (ES9)：异步迭代与对象展开

### for await...of

异步迭代，处理异步数据流（文件流、数据库游标、分页查询等）：

```javascript
async function processStream(stream) {
  for await (const chunk of stream) {
    // 每次迭代等待下一个异步值再继续
    await process(chunk);
  }
}
```

### 对象 Rest/Spread

注意：数组 Spread 是 ES6，**对象 Spread 是 ES9**：

```javascript
// 对象 Spread：浅合并，后者覆盖前者
const config = { ...defaults, ...userConfig };

// 对象 Rest：解构时收集剩余属性
const { a, b, ...rest } = { a: 1, b: 2, c: 3, d: 4 };
// rest = { c: 3, d: 4 }
```

### Promise.prototype.finally

无论成功或失败都执行，专门用于清理工作：

```javascript
fetch(url)
  .then(res => res.json())
  .catch(err => handleError(err))
  .finally(() => setLoading(false)); // 👈 无论成败都关闭 loading
```

### RegExp 增强

```javascript
// 命名捕获组
const { groups: { year, month, day } } =
  '2026-07-29'.match(/(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/);

// 后行断言（lookbehind）：匹配前面是 $ 的数字
'$100 €200'.match(/(?<=\$)\d+/); // ['100']

// dotAll 模式（s 标志）：让 . 匹配换行符
/foo.bar/s.test('foo\nbar'); // true

// Unicode 属性转义
/\p{Script=Chinese}/u.test('汉'); // true
```

---

## 🧰 ES2019 (ES10)：数组与字符串工具箱

### Array.prototype.flat 和 flatMap

```javascript
[1, [2, [3, [4]]]].flat();          // [1, 2, [3, [4]]]（默认深度 1）
[1, [2, [3, [4]]]].flat(Infinity);  // [1, 2, 3, 4]（完全展平）

// flatMap = map + flat(1)，但更高效（单次遍历）
const words = ['hello world', 'foo bar'];
words.flatMap(s => s.split(' ')); // ['hello', 'world', 'foo', 'bar']
```

### Object.fromEntries

`Object.entries` 的逆操作，从键值对构建对象：

```javascript
// URL 参数解析
const params = new URLSearchParams('a=1&b=2');
Object.fromEntries(params); // { a: '1', b: '2' }

// Map 转对象
Object.fromEntries(new Map([['a', 1], ['b', 2]])); // { a: 1, b: 2 }

// 过滤对象属性（经典组合技）
const positive = Object.fromEntries(
  Object.entries(obj).filter(([, v]) => v > 0)
);
```

### 其他 ES2019 特性

```javascript
// 精确的字符串裁剪
'  hello  '.trimStart(); // 'hello  '
'  hello  '.trimEnd();   // '  hello'

// 可选的 catch 绑定（不需要 error 变量时省略）
try { JSON.parse(str) } catch { return null; }

// Symbol.prototype.description（之前只能 toString() 后截取）
Symbol('my symbol').description; // 'my symbol'

// Function.prototype.toString 标准化（保留注释和空白）
function /* note */ foo() {}
foo.toString(); // 'function /* note */ foo() {}'

// JSON.stringify 修复：正确处理  /  字符
// Array.prototype.sort 稳定性保证（引擎必须实现稳定排序）
```

---

## 🚀 ES2020 (ES11)：可选链与空值处理

这个版本的三个特性是**最高频面试考点**。

### 可选链 ?.

```javascript
// 之前：需要层层防御，啰嗦且容易漏
const city = user && user.address && user.address.city;

// 之后：简洁优雅
const city = user?.address?.city;

// 方法调用 / 动态属性 / 函数调用都支持
const len    = arr?.length;
const val    = obj?.[dynamicKey];
const result = callback?.(); // callback 不是函数时返回 undefined
```

> 💬 **面试官**：`?.` 和 `&&` 的区别？
>
> ✅ **标准答案**：`&&` 遇到任何 falsy 值（`0`、`''`、`false`）都会短路；`?.` 只在 `null` 或 `undefined` 时短路，对其他 falsy 值正常继续。
>
> 🎁 **加分答案**：`0?.toString()` 返回 `'0'`（因为 0 不是 null/undefined）；`0 && 0..toString()` 返回 `0`（因为 0 是 falsy）。在处理数字、空字符串等合法值的属性访问时，这个差异至关重要。

### 空值合并运算符 ??

```javascript
// || 的问题：0、''、false 都被误判为"空"
const port = config.port || 3000; // config.port=0 时错误地使用了 3000

// ?? 只在 null/undefined 时使用默认值
const port = config.port ?? 3000; // config.port=0 时正确使用 0
```

### BigInt

Number 最大安全整数是 `2^53 - 1`，BigInt 处理任意精度整数：

```javascript
const big = 9007199254740993n;  // 超过 MAX_SAFE_INTEGER 的精确值
const sum = big + 1n;           // BigInt + BigInt，不能混用 Number

typeof 1n;  // 'bigint'
BigInt(42); // 42n（从 Number 转换，必须是整数）

// 应用：大数 ID（服务端返回 64 位整数）、金融精度计算
```

### 其他 ES2020 特性

```javascript
// Promise.allSettled：等所有 Promise 决议（不管成败）
// 对比 Promise.all（任一 reject 就快速失败）
const results = await Promise.allSettled([fetch('/1'), fetch('/2')]);
results.forEach(({ status, value, reason }) => { ... });

// globalThis：跨环境统一访问全局对象
// 浏览器=window / Worker=self / Node.js=global
globalThis.setTimeout(() => {}, 100); // 任何环境都有效

// String.prototype.matchAll：获取所有匹配（含命名捕获组）
const matches = [...'test1 test2'.matchAll(/test(\d)/g)];

// 动态 import()：按需异步加载模块
const { default: Editor } = await import('./Editor.js');

// import.meta：模块元信息
console.log(import.meta.url); // 当前模块的 URL
```

---

## 💎 ES2021 (ES12)：优雅的语法糖

### String.prototype.replaceAll

```javascript
// 之前：字符串替换全部需要正则 + g 标志
'aabbcc'.replace(/a/g, 'x');  // 'xxbbcc'

// 之后：直接字符串全量替换
'aabbcc'.replaceAll('a', 'x'); // 'xxbbcc'
```

### 逻辑赋值运算符

三个新运算符：组合了逻辑运算和赋值，短路语义保留：

```javascript
// &&=：左侧为真才赋值（常用于条件更新）
user.name &&= user.name.trim();
// 等价于：if (user.name) user.name = user.name.trim()

// ||=：左侧为假才赋值（常用于默认值，注意 0 / '' 的陷阱）
options.timeout ||= 5000;
// 等价于：options.timeout = options.timeout || 5000

// ??=：左侧为 null/undefined 才赋值（推荐的默认值方式）
config.cache ??= new Map();
// 等价于：config.cache = config.cache ?? new Map()
```

### Promise.any 和 AggregateError

```javascript
// Promise.any：任一成功即返回（对比 race：第一个决议无论成败）
// 应用：并发请求多个 CDN 镜像，取最快成功的结果
const fastest = await Promise.any([fetchCDN1(), fetchCDN2(), fetchCDN3()]);

// 全部失败时抛出 AggregateError（包含所有失败原因）
try {
  await Promise.any([reject1, reject2]);
} catch (e) {
  e instanceof AggregateError; // true
  e.errors; // [err1, err2] 所有失败原因
}
```

### WeakRef 和 FinalizationRegistry

```javascript
// WeakRef：持有对象的弱引用，不阻止 GC
const ref = new WeakRef(heavyObject);
heavyObject = null; // 允许被 GC 回收

const obj = ref.deref(); // 返回对象或 undefined（已被回收）
if (obj) { ... }

// FinalizationRegistry：对象被 GC 时触发回调
const registry = new FinalizationRegistry((key) => {
  cache.delete(key); // 清理相关缓存
});
registry.register(target, cacheKey);
```

### 数字分隔符

```javascript
const million   = 1_000_000;
const hex       = 0xFF_FF_FF;
const binary    = 0b1010_0001;
const float     = 1_234.567_89;
```

---

## 🏗️ ES2022 (ES13)：类的现代化

### 顶层 await（Top-level await）

之前 `await` 只能在 `async` 函数内，现在 ES Module 顶层可直接使用：

```javascript
// 之前：必须包一层 async IIFE
(async () => {
  const config = await loadConfig();
  startApp(config);
})();

// 之后：直接顶层 await（仅限 ES Module）
const config = await loadConfig(); // 👈 简洁直接
startApp(config);
```

> 💬 **面试官**：顶层 await 有什么限制？
>
> ✅ **标准答案**：只能在 ES Module 中使用；它会阻塞依赖该模块的其他模块的初始化；可能影响应用启动时间。
>
> 🎁 **加分答案**：顶层 await 是异步的，利用了 ES Module 的异步加载机制。有顶层 await 的模块会暂停，但模块图中不依赖该模块的分支可以并行加载。实际上它实现了「模块级别的条件性 polyfill 加载」（`const polyfill = await (needsPolyfill ? import('./polyfill') : {})`）。

### 类私有属性和方法

`#` 前缀实现真正的私有（而不是约定俗成的 `_` 前缀）：

```javascript
class BankAccount {
  #balance = 0;       // 私有字段
  #owner;
  static #count = 0;  // 私有静态字段

  constructor(owner, initial) {
    this.#owner = owner;
    this.#balance = initial;
    BankAccount.#count++;
  }

  #validate(amount) { // 私有方法
    if (amount <= 0) throw new Error('Invalid amount');
  }

  deposit(amount) {
    this.#validate(amount);
    this.#balance += amount;
  }

  get balance() { return this.#balance; }
  static get count() { return BankAccount.#count; }
}

const acc = new BankAccount('Alice', 100);
acc.#balance; // SyntaxError！（访问私有字段，非 undefined）

// in 运算符支持私有字段检测
#balance in acc; // true（类方法内部使用）
```

### 其他 ES2022 特性

```javascript
// Array.prototype.at()：负索引访问（字符串、TypedArray 也支持）
[1, 2, 3].at(-1);  // 3（最后一个）
'hello'.at(-2);    // 'l'

// Object.hasOwn()：替代 hasOwnProperty（更健壮，不受原型链污染）
Object.hasOwn({ a: 1 }, 'a'); // true
// 对比：({ a: 1 }).hasOwnProperty('a') — 如果原型链被修改会出错

// Error.cause：错误链，保留原始错误上下文
try {
  await connectDB();
} catch (err) {
  throw new Error('App init failed', { cause: err }); // 👈 链式错误
}

// 类静态块：复杂的静态初始化（只运行一次）
class Config {
  static env;
  static level;
  static {
    Config.env = process.env.NODE_ENV;
    Config.level = Config.env === 'production' ? 'warn' : 'debug';
  }
}
```

---

## 🔍 ES2023 (ES14)：数组的非破坏性操作

ES2023 的重心是给数组添加**不修改原数组**的方法：

```javascript
const arr = [3, 1, 4, 1, 5];

// findLast / findLastIndex：从尾部查找
arr.findLast(x => x < 4);       // 1（最后一个 < 4 的元素）
arr.findLastIndex(x => x < 4);  // 3（对应的索引）

// 非破坏性版本的排序、反转、截取
const sorted   = arr.toSorted();      // [1,1,3,4,5]，arr 不变
const reversed = arr.toReversed();    // [5,1,4,1,3]，arr 不变
const spliced  = arr.toSpliced(1, 2, 99); // [3,99,1,5]，arr 不变

// with：替换指定索引，返回新数组
const updated = arr.with(2, 99); // [3,1,99,1,5]，arr 不变
```

> 💬 **面试官**：为什么需要这些非破坏性方法？
>
> ✅ **标准答案**：函数式编程的不可变原则——避免副作用，使代码更可预测。在 React/Redux 中，直接修改数组不会触发重渲染，必须返回新数组；这些方法让不可变操作更简洁，避免意外使用会原地排序的 `sort()`。
>
> 🎁 **加分答案**：`toSorted` 底层等价于 `[...arr].sort()`，但明确表达了「不修改原数组」的意图，可读性更强。联系 Redux reducer：`return state.toSorted(compareFn)` 比 `return [...state].sort(compareFn)` 清晰很多。

---

## 🌐 ES2024 (ES15)：分组与 Promise 改进

### Object.groupBy / Map.groupBy

```javascript
const drugs = [
  { name: '阿莫西林', type: 'antibiotic', price: 15 },
  { name: '布洛芬',   type: 'painkiller', price: 8 },
  { name: '头孢克洛', type: 'antibiotic', price: 32 },
];

// Object.groupBy：按回调返回值分组，键为字符串/Symbol
const byType = Object.groupBy(drugs, d => d.type);
// { antibiotic: [...], painkiller: [...] }

// Map.groupBy：键可以是任意类型（对象等）
const byPriceRange = Map.groupBy(drugs, d =>
  d.price < 20 ? 'cheap' : 'expensive');
```

### Promise.withResolvers

提供在 Promise 外部控制决议的能力（Deferred 模式）：

```javascript
// 之前：通过闭包暴露 resolve/reject（丑陋）
let resolve, reject;
const p = new Promise((res, rej) => { resolve = res; reject = rej; });

// 之后：一行搞定
const { promise, resolve, reject } = Promise.withResolvers();

// 实际应用：将事件转为 Promise
function waitForEvent(emitter, event) {
  const { promise, resolve, reject } = Promise.withResolvers();
  emitter.once(event, resolve);
  emitter.once('error', reject);
  return promise;
}
```

### 其他 ES2024 特性

```javascript
// RegExp v 标志：集合操作和 Unicode 属性访问
/[\p{Script=Greek}&&\p{Letter}]/v  // 希腊字母（交集语法）
/[\p{ASCII}--\p{Number}]/v         // ASCII 排除数字（差集语法）

// ArrayBuffer 可调整大小
const buf = new ArrayBuffer(8, { maxByteLength: 16 });
buf.resize(12); // 动态扩容

// ArrayBuffer.prototype.transfer：零拷贝转移所有权
const newBuf = oldBuf.transfer(newSize);
// oldBuf 变为 detached 状态，防止两处同时访问
```

---

## 🔮 ES2025 (ES16)：迭代器助手与集合运算

### Iterator Helpers

为迭代器添加类似数组的链式操作，**关键：惰性求值**：

```javascript
// 之前：先转数组，产生大量中间数组
const result = Array.from(generator())
  .filter(x => x > 0)
  .map(x => x * 2)
  .slice(0, 5);

// 之后：Iterator Helpers，延迟执行，不创建中间集合
const result = generator()
  .filter(x => x > 0)   // 惰性，不立即执行
  .map(x => x * 2)       // 惰性，链接 filter 的输出
  .take(5)               // 取前 5 个，后面的根本不会被处理
  .toArray();            // 最终触发求值
```

完整 API：`map`、`filter`、`take`、`drop`、`flatMap`、`reduce`、`toArray`、`forEach`、`some`、`every`、`find`、`from`（静态）。

> 💬 **面试官**：Iterator Helpers 和数组方法的本质区别？
>
> ✅ **标准答案**：惰性求值（lazy evaluation）。数组方法每次创建完整中间数组；Iterator Helpers 是延迟的，`.take(5)` 读到第 5 个就停止，不处理后续元素。对大数据集、无限序列更友好。
>
> 🎁 **加分答案**：类比 Rust 的 Iterator / Java Stream。`.filter().map().take(5)` 在 take 结束后整条链立即停止——不会多执行任何 filter 或 map。这对无限生成器（`function* naturals() { let n = 0; while(true) yield n++ }`）是必须的。

### Set 集合运算

ES2025 终于给 Set 加上了期盼已久的集合操作 API：

```javascript
const a = new Set([1, 2, 3, 4]);
const b = new Set([3, 4, 5, 6]);

a.union(b);                 // {1,2,3,4,5,6} — 并集
a.intersection(b);          // {3,4}          — 交集
a.difference(b);            // {1,2}          — 差集（a - b）
a.symmetricDifference(b);   // {1,2,5,6}      — 对称差集

a.isSubsetOf(b);            // false — a ⊆ b？
a.isSupersetOf(b);          // false — a ⊇ b？
a.isDisjointFrom(b);        // false — a ∩ b = ∅？
```

### 其他 ES2025 特性

```javascript
// Promise.try：统一同步/异步错误处理
// 之前：同步函数 throw 不会被 .catch 捕获
Promise.resolve().then(() => syncFn()); // 笨拙的包装
// 之后：
Promise.try(() => syncFn()); // 同步 throw 也变成 rejected Promise

// import with（导入属性，标准化版本）
import data from './data.json' with { type: 'json' };
import styles from './theme.css' with { type: 'css' };

// RegExp.escape：安全地将字符串用于正则
const input = '1 + 2 = 3';
const re = new RegExp(RegExp.escape(input)); // '1 \+ 2 \= 3'

// Error.isError：可靠地检测 Error 实例（跨 realm 也有效）
Error.isError(new Error());        // true
Error.isError(new DOMException()); // true
Error.isError({ message: 'x' });  // false（鸭子类型不算）
```

---

## 🛠️ ES2026 (ES17)：标准库完善

### Map.prototype.getOrInsert

「没有则插入并返回」的原子操作，避免重复 has + set：

```javascript
const map = new Map();

// 之前：需要三行
if (!map.has('key')) map.set('key', []);
map.get('key').push(item);

// 之后：
map.getOrInsert('key', []).push(item); // 没有才插入，直接返回值

// getOrInsertComputed：延迟计算默认值（只在需要时才调用）
map.getOrInsertComputed(key, k => expensiveInit(k));
```

### Float16Array 和相关方法

```javascript
// Float16Array：16 位浮点（ML 模型权重的常用格式，节省内存）
const weights = new Float16Array(1024);

// Math.f16round：将数字舍入到 float16 精度
Math.f16round(1.337); // 1.3369140625（float16 能表示的最近值）

// Uint8Array.prototype.toBase64 / fromBase64（原生 Base64）
const bytes = new Uint8Array([72, 101, 108, 108, 111]);
const b64 = bytes.toBase64();       // 'SGVsbG8='
const back = Uint8Array.fromBase64('SGVsbG8='); // 反向
bytes.toHex();                      // '48656c6c6f'
Uint8Array.fromHex('48656c6c6f');   // 反向
```

---

## 💡 版本特性速查表（面试速记）

| 版本 | 年份 | 核心特性 | 面试热度 |
|------|------|---------|---------|
| ES6  | 2015 | let/const、箭头函数、Class、Module、Promise、Proxy | ⭐⭐⭐⭐⭐ |
| ES7  | 2016 | Array.includes、** 运算符 | ⭐⭐ |
| ES8  | 2017 | async/await、Object.values/entries、String padding | ⭐⭐⭐⭐⭐ |
| ES9  | 2018 | for await、对象 spread/rest、Promise.finally、RegExp 增强 | ⭐⭐⭐ |
| ES10 | 2019 | flat/flatMap、Object.fromEntries、可选 catch | ⭐⭐⭐ |
| ES11 | 2020 | ?.、??、BigInt、Promise.allSettled、globalThis | ⭐⭐⭐⭐⭐ |
| ES12 | 2021 | replaceAll、逻辑赋值、Promise.any、WeakRef | ⭐⭐⭐ |
| ES13 | 2022 | 顶层 await、类私有 #、Array.at()、Error.cause | ⭐⭐⭐⭐ |
| ES14 | 2023 | findLast、toSorted/toReversed/with（非破坏性） | ⭐⭐⭐ |
| ES15 | 2024 | Object.groupBy、Promise.withResolvers、RegExp v | ⭐⭐⭐ |
| ES16 | 2025 | Iterator Helpers、Set 集合运算、Promise.try、RegExp.escape | ⭐⭐⭐⭐ |
| ES17 | 2026 | Map.getOrInsert、Float16Array、Uint8Array Base64 | ⭐⭐ |

---

## 📝 留个问题

**面试题**：下面代码的输出是什么？解释原因。

```javascript
// 题目一
const arr = [1, [2, [3]]];
console.log(arr.flat());         // ?
console.log(arr.flat(Infinity)); // ?

// 题目二
const config = { port: 0, host: '' };
console.log(config.port || 8080);   // ?
console.log(config.port ?? 8080);   // ?
console.log(config.host || 'localhost');  // ?
console.log(config.host ?? 'localhost'); // ?

// 题目三
const set = new Set([1, 2, 3]);
// 用 ES2025 的 API 求与 new Set([2, 3, 4]) 的交集
```

欢迎在评论区写出你的答案，以及你认为哪个版本的改动对你日常开发影响最大。

---

> 🔖 本文是「JavaScript 深度系列」的一篇。覆盖 ES6 → ES2026 的完整演进，建议收藏备用。下一篇：**TypeScript 类型体操：从泛型约束到条件类型的完整解析**。
