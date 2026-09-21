# 模块化规范
+ `commonjs` 规范
    - `node` 自己实现的
+ `es6Module` 
    - `import/export` 
+ `umd` 
    - 统一模块规范
    - 如果浏览器不支持 `commonjs` 或 `requirejs` ，直接将变量放到 `window` 上
+ `amd` 
    - `requirejs` 
+ `cmd` 
    - `seajs` 



# commonjs规范
## 模块的概念
+ 可以把复杂的代码拆分成小的模块，方便管理代码和维护
+ 每个模块之间的内容都是相互独立的，互不影响的(解决变量冲突的问题)，例如单例模式(不能完全解决)



## 规范的定义
+ 每一个文件都是一个模块
+ 如果希望模块中的变量被别人使用，可以使用 `module.exports` 导出这个变量
+ 如果另一个模块想使用这个模块导出的结果，需要使用 `require` 语法来引用，`require` 语法是同步的



## 模块的分类
+ 核心模块、内置模块
    - 不是自己写的，也不是安装来的是 `node` 中自己提供的，可以直接使用
    - 例如： `require('fs')` 
+ 第三方模块
    - 别人写的，通过 `npm install` 安装过来的，不需要有路径
    - 例如： `require('commander')` 
+ 自定义模块
    - 自己写的模块，引用的时候需要增加路径(相对路径或绝对路径)
    - 例如：`require('./promise.js')`

## <font style="color:rgb(51, 51, 51);">模块的加载策略</font>
<!-- 这是一张图片，ocr 内容为：开始REQUIRE 是否在文件 模板缓存区中 否 是否原生模块 是否在原生 查找文件 模块缓存区中 模块 否 是 根据扩展名载入 加载原生模块 文件模块 缓存文件模块 缓存原生模块 返回EXPORTS -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1741771294837-633aa0ad-8829-4517-8925-9de4a43de259.png)

## <font style="color:rgb(51, 51, 51);">文件模块查找规则</font>
<!-- 这是一张图片，ocr 内容为：查找文件 查找路径为 是否从 路径为 是否相对路径 MODULE PATH 包加载 当前路径 GLOHAL M 得到查找 路径 清空查找路 是否绝对路径 径 否 根据查找路径和文件名 判断是否已缓存路径 尝试直接 是否成功 查找该文件 尝试添加扩展名 是否成功 后查找文件 查找失败 尝试根据包查找 否 文件 存在下一 从包描述文件获 是否成功 个路径 取文件名 尝试添加扩展名 是否成功 后查找文件 进入下一 查找该目录下的 是否成功 MODULEPATH中查找 INDEX(JS/.NODE) 获取实际 缓存路径 文件路径 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1741771295237-25881a7b-9078-446a-ae9c-0a0669e43f5b.png)

## <font style="color:rgb(51, 51, 51);">从模块外部访问模块内的成员</font>
+ <font style="color:rgb(51, 51, 51);">使用exports对象</font>
+ <font style="color:rgb(51, 51, 51);">使用module.exports导出引用类型</font>

## <font style="color:rgb(51, 51, 51);">模块对象的属性</font>
+ <font style="color:rgb(51, 51, 51);">module.id</font>
+ <font style="color:rgb(51, 51, 51);">module.filename</font>
+ <font style="color:rgb(51, 51, 51);">module.loaded</font>
+ <font style="color:rgb(51, 51, 51);">module.parent</font>
+ <font style="color:rgb(51, 51, 51);">module.children</font>
+ <font style="color:rgb(51, 51, 51);">module.paths</font>

# `module.exports` 和 `exports` 的区别
| **对比项** | `**module.exports**` | `**exports**` |
| --- | --- | --- |
| **默认指向** | 初始值等同于 `{}`<br/>（即 `exports = module.exports`<br/>） | 初始值等同于 `{}` |
| **导出类型** | 可以是任何类型（对象、函数、类等） | 只能添加属性，不能直接修改引用 |
| **修改方式** | 直接赋值会更改模块的导出对象 | 直接赋值会断开 `exports`<br/> 与 `module.exports`<br/> 的关联 |
| **推荐用法** | 适用于导出单个对象、函数、类 | 适用于导出多个属性或方法 |


## 示例代码
### ✅ 正确用法
+ 使用 `module.exports` 导出单个对象

```javascript
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

+ 使用 `exports` 添加多个属性

```javascript
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

---

### ❌ 常见错误
+ **错误 1：直接赋值 **`**exports =**`** 会导致导出无效**

```javascript
// myModule.js
exports = function () { 
  console.log("Hello, Node.js!"); 
};
```

```javascript
// main.js
const myModule = require('./myModule');
console.log(myModule); // 输出: {}（空对象）
```

+ **原因：**`exports =` 只是改变了 `exports` 变量的引用，而 `module.exports` 仍然指向 `{}`，导致外部无法获取导出内容。
+ ✅ **修正方式**

```javascript
// myModule.js
module.exports = function () { 
  console.log("Hello, Node.js!"); 
};
```

+ **错误 2：同时使用 **`**exports**`** 和 **`**module.exports**`** 可能导致意外覆盖**

```javascript
// myModule.js
exports.name = "Node.js";
module.exports = function () { 
  console.log("Hello, Node.js!"); 
};
```

```javascript
// main.js
const myModule = require('./myModule');
console.log(myModule.name); // undefined
myModule(); // 输出: Hello, Node.js!
```

+ **原因：**`module.exports` 最终覆盖了 `exports`，导致 `exports.name` 丢失。
+ ✅ **修正方式**

```javascript
// myModule.js
module.exports = {
  name: "Node.js",
  greet: function () {
    console.log("Hello, Node.js!");
  },
};
```

---

## 最佳实践
+ **如果要导出单个函数、类或对象，使用 **`**module.exports = ...**`（不要用 `exports = ...`）。
+ **如果要导出多个属性或方法，使用 **`**exports.xxx = ...**`**，但不要重新赋值 **`**exports**`。
+ **避免在同一个文件中混用 **`**exports**`** 和 **`**module.exports**`，否则可能会造成导出内容的覆盖问题。

# 模块实现
## 分析node源码
1. Module.load 加载这个模块
2. Module._resolveFilename处理路径为绝对路径，并且添加文件后缀
3. 拿到文件看一下文件是否加载过（Module.cache）是否缓存过，如果缓存过则直接结束
4. 如果没有缓存过则会new Module(id,exports ={}) exports 是对应模块的导出结果，默认为空
5. 将创建的模块缓存
6. 根据文件加载模块(给module.exports 赋值)
7. 找到对应的文件后缀，做加载操作 Module._extensions[.js](this，filename);策略模式
8. 读取文件内容 fs.readFileSync(filename,'utf8');
9. 将字符串执行module.compile 编译字符串
10. 包裹函数 exports，require，module，filename，_dirname
11. Reflect.apply(this,[exports, require, module, filename, path.dirname])，（module.exports = exports；this = exports）

## 源码实现
+ 实现 `node` 中的模块化机制

```javascript
const fs = require('fs');
const path = require('path');
const vm = require('vm');
function Module(id) {
	this.id = id;
	this.exports = {}; 
}
Module.wrapper = [
	`(function(exports,require,module,__filename,__dirname){`,
	`})`
];
Module._extensions = {
	'.js'(module) {
		let content = fs.readFileSync(module.id, 'utf8');
		content = Module.wrapper[0] + content + Module.wrapper[1];
		let fn = vm.runInThisContext(content);
		let exports = module.exports;
		let dirname = path.dirname(module.id);
		fn.call(exports, exports, req, module, module.id, dirname);
	},
	'.json'(module) {
		let content = fs.readFileSync(module.id, 'utf8');
		module.exports = JSON.parse(content);
	}
}
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
}
Module.prototype.load = function () {
	let extName = path.extname(this.id);
	Module._extensions[extName](this);
}
Module._cache = {};
function req(filename) {
	filename = Module._resolveFilename(filename);
	let cacheModule = Module._cache[filename];
	if (cacheModule) {
		return cacheModule.exports; 
	}
	let module = new Module(filename);
	Module._cache[filename] = module
	module.load();
	return module.exports;
}
```

## 总结
1. `require` 语法是同步的， `fs.readFileSync` 
2. 最终 `require` 语法返回的是 `module.exports` 
3. 模块的 `require` 和 `module.exports`  引用的是同一个变量
4. 模块是动态加载每次 `require` 都会获取最新的导出的结果，可以将 `require` 写到条件中
5. 更改 `exports` 的引用不会导致 `module.exports`  变化
6. 最终返回的是module.exports 所以 exports 和 modules.export 不要混用
7. 循环引用，一般不会出现，如果出现只能加载部分数据

# Events模块
+ `node` 中自己实现的发布订阅模块,订阅是将方法对应成一种一对多的关系， `on` 方法用来订阅事件

```javascript
function EventEmitter(){
	this._events = Object.create(null);
}
EventEmitter.prototype.on = function(eventName,callback){
	if(!this._events) this._events = Object.create(null);
	// 如果用户绑定的不是newListener 让newListener的回调函数执行
	if(eventName !== 'newListener'){
		if(this._events['newListener']){
			this._events['newListener'].forEach(fn=>fn(eventName))
		}
	}
	if(this._events[eventName]){
		this._events[eventName].push(callback)
	}else{
		this._events[eventName] = [callback]; // {newListener:[fn1]}
	}
}
```

+ `off` 方法可以移除对应的事件监听

```javascript
// 移除绑定的事件
EventEmitter.prototype.off = function(eventName,callback){
	if(this._events[eventName]){
		this._events[eventName] = this._events[eventName].filter(fn=>{
			return fn!=callback && fn.l !== callback
		});
	}
}
```

+ `emit` 用来执行订阅的事件

```javascript
EventEmitter.prototype.emit = function(eventName,...args){
	if(this._events[eventName]){
		this._events[eventName].forEach(fn => {
			fn.call(this,...args);
		});
	}
}
```

+ `once` 绑定事件当执行后自动删除订阅的事件

```javascript
EventEmitter.prototype.once = function(eventName,callback){
	let one = (...args)=>{
		callback.call(this,...args);
		// 删除掉这个函数
		this.off(eventName,one); // 执行完后在删除掉
	}
	one.l = callback; // one.l = fn;
	// 先绑定一个once函数，等待emit触发完后执行one函数 ，执行原有的逻辑，执行后删除once函数
	this.on(eventName,one);
}
```

# node调试
```javascript
node --inspect-brk 文件名
```

[调试 - 入门指南 | Node.js](https://nodejs.org/zh-cn/docs/guides/debugging-getting-started/)





