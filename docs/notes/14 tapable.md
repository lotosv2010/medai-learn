# <font style="color:rgb(51, 51, 51);">webpack 的插件机制</font>
+ <font style="color:rgb(51, 51, 51);">在具体介绍 webpack 内置插件与钩子可视化工具之前，我们先来了解一下 webpack 中的插件机制。 webpack 实现插件机制的大体方式是：</font>
    - <font style="color:rgb(51, 51, 51);">创建 - webpack 在其内部对象上创建各种钩子；</font>
    - <font style="color:rgb(51, 51, 51);">注册 - 插件将自己的方法注册到对应钩子上，交给 webpack；</font>
    - <font style="color:rgb(51, 51, 51);">调用 - webpack 编译过程中，会适时地触发相应钩子，因此也就触发了插件的方法。</font>
+ <font style="color:rgb(51, 51, 51);">Webpack 本质上是一种事件流的机制，它的工作流程就是将各个插件串联起来，而实现这一切的核心就是 Tapable，webpack 中最核心的负责编译的 Compiler 和负责创建 bundle 的 Compilation 都是 Tapable 的实例</font>
+ <font style="color:rgb(51, 51, 51);">通过事件和注册和监听，触发 webpack 生命周期中的函数方法</font>

```javascript
const {
  SyncHook,
  SyncBailHook,
  SyncWaterfallHook,
  SyncLoopHook,
  AsyncParallelHook,
  AsyncParallelBailHook,
  AsyncSeriesHook,
  AsyncSeriesBailHook,
  AsyncSeriesWaterfallHook,
} = require("tapable");
```

# <font style="color:rgb(51, 51, 51);">tapable 分类</font>
## <font style="color:rgb(51, 51, 51);">按同步异步分类</font>
+ <font style="color:rgb(51, 51, 51);">Hook 类型可以分为</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">同步Sync</font>`<font style="color:rgb(51, 51, 51);">和</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">异步Async</font>`<font style="color:rgb(51, 51, 51);">，异步又分为</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">并行</font>`<font style="color:rgb(51, 51, 51);">和</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">串行</font>`

<!-- 这是一张图片，ocr 内容为：ASYNCPARALLELHOOK ASYNCPARALLEL SYNCBAILHOOK ASYNCPARALLEBAILLHOOK SYNC TAPABLE ASYNC SYNCWATERFALLHOOK ASYNESERIESHOOK ASYNCSERIES ASYNCSERIESBAILHOOK SYNCLOOPHOOK ASYNCSERIESWATERFALLHOOK -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1747723013403-a5f1a69c-f067-42ac-83aa-c7cca8acbf8c.png)

## <font style="color:rgb(51, 51, 51);">按返回值分类</font>
<!-- 这是一张图片，ocr 内容为：SYNCHOOK SYNCBAILHOOK 4SYNCPARALLELHOOK BASIC BAIL 4SYNCPARALLEBAILLHOOK ASYNCSERIESBAILHOOK ASYNCSERIESHOOK TAPABLE SYNCWATERFALLHOOK WATERFALL SYNCLOOPHOOK LOOP ASYNESERIESWATERFALLHOOK -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1747723432662-4cb14f5d-a585-4977-9a95-2111b5c1701f.png)

### <font style="color:rgb(51, 51, 51);">Basic</font>
+ <font style="color:rgb(51, 51, 51);">执行每一个事件函数，不关心函数的返回值,有 SyncHook、AsyncParallelHook、AsyncSeriesHook</font>

<!-- 这是一张图片，ocr 内容为：开始 事件函数1 事件函数2 事件函数3 结束 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1747723656092-7f61e600-3a60-4771-bf38-2e00e20f947a.png)

### <font style="color:rgb(51, 51, 51);">Bail</font>
+ <font style="color:rgb(51, 51, 51);">执行每一个事件函数，遇到第一个结果</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">result !== undefined</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">则返回，不再继续执行。有：SyncBailHook、AsyncSeriesBailHook, AsyncParallelBailHook</font>

<!-- 这是一张图片，ocr 内容为：开始 事件函数1 RESULT:UNDEFINED 事件函数2 RESULT/UNDEFINED 事件函数3 结束 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1747723940816-a926e081-9ef4-4651-81d3-9a48a6c2371b.png)

### <font style="color:rgb(51, 51, 51);">Waterfall</font>
+ <font style="color:rgb(51, 51, 51);">如果前一个事件函数的结果</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">result !== undefined</font>`<font style="color:rgb(51, 51, 51);">,则 result 会作为后一个事件函数的第一个参数,有 SyncWaterfallHook，AsyncSeriesWaterfallHook</font>

<!-- 这是一张图片，ocr 内容为：开始 事件函数1(ARG1) RESULT1!UNDEFINED ARG1-RESULT1 事件函数2(RESULT1) RESULT2:UNDEFINED (ARG1) 事件函数3 结束 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1747724370582-b6337df5-27b8-4d45-b0aa-e708d4a18d4d.png)

### <font style="color:rgb(51, 51, 51);">Loop</font>
+ <font style="color:rgb(51, 51, 51);">不停的循环执行事件函数，直到所有函数结果</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">result === undefined</font>`<font style="color:rgb(51, 51, 51);">,有 SyncLoopHook 和 AsyncSeriesLoopHook</font>

<!-- 这是一张图片，ocr 内容为：开始 事件函数1 RESULT1:UNDEFINED 事件函数2 RESULT2:UNDEFINED 事件函数3  RESULT3:UNDEFINED 结束 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1747728443060-65521cde-9e09-4a7f-ab5a-7e9f25862148.png)

# <font style="color:rgb(51, 51, 51);">使用</font>
## <font style="color:rgb(51, 51, 51);">SyncHook</font>
+ <font style="color:rgb(51, 51, 51);">所有的构造函数都接收一个可选参数，参数是一个参数名的字符串数组</font>
+ <font style="color:rgb(51, 51, 51);">参数的名字可以任意填写，但是参数数组的长数必须要根实际接受的参数个数一致</font>
+ <font style="color:rgb(51, 51, 51);">如果回调函数不接受参数，可以传入空数组</font>
+ <font style="color:rgb(51, 51, 51);">在实例化的时候传入的数组长度长度有用，值没有用途</font>
+ <font style="color:rgb(51, 51, 51);">执行 call 时，参数个数和实例化时的数组长度有关</font>
+ <font style="color:rgb(51, 51, 51);">回调的时候是按先入先出的顺序执行的，先放的先执行</font>

```javascript
const { SyncHook} = require('tapable');

const hook = new SyncHook(['name', 'age']);

hook.tap('1', (name, age) => {
  console.log(1, name, age);
  return 1;
});

hook.tap('2', (name, age) => {
  console.log(2, name, age);
  return 2;
});

hook.tap('3', (name, age) => {
  console.log(3, name, age);
  return 3;
});

hook.call('SyncHook', 18);

// 1 SyncHook 18
// 2 SyncHook 18
// 3 SyncHook 18
```

## <font style="color:rgb(51, 51, 51);">SyncBailHook</font>
+ <font style="color:rgb(51, 51, 51);">BailHook 中的回调函数也是顺序执行的</font>
+ <font style="color:rgb(51, 51, 51);">调用 call 时传入的参数也可以传给回调函数</font>
+ <font style="color:rgb(51, 51, 51);">当回调函数返回非 undefined 值的时候会停止调用后续的回调</font>

```javascript
const { SyncBailHook } = require('tapable');

const hook = new SyncBailHook(['name', 'age']);

hook.tap('1', (name, age) => {
  console.log(1, name, age);
});

hook.tap('2', (name, age) => {
  console.log(2, name, age);
  // 如果返回值不为 undefined，则终止执行
  return 2;
});

hook.tap('3', (name, age) => {
  console.log(3, name, age);
});

hook.call('SyncBailHook', 18);

// 1 SyncBailHook 18
// 2 SyncBailHook 18
```

## <font style="color:rgb(51, 51, 51);">SyncWaterfallHook</font>
+ <font style="color:rgb(51, 51, 51);">SyncWaterfallHook 表示如果上一个回调函数的结果不为 undefined,则可以作为下一个回调函数的第一个参数</font>
+ <font style="color:rgb(51, 51, 51);">回调函数接受的参数来自于上一个函数的结果</font>
+ <font style="color:rgb(51, 51, 51);">调用 call 传入的第一个参数，会被上一个函数的非 undefined 结果替换</font>
+ <font style="color:rgb(51, 51, 51);">当回调函数返回非 undefined 不会停止回调栈的调用</font>

```javascript
const { SyncWaterfallHook } = require('tapable');

const hook = new SyncWaterfallHook(['name', 'age']);

hook.tap('1', (name, age) => {
  console.log(1, name, age);
  // 如果返回值不为undefined，则返回值作为参数传递给下一个函数
  return 1;
});

hook.tap('2', (name, age) => {
  console.log(2, name, age);
  //  如果返回值为undefined，参数将传递给下一个函数
});

hook.tap('3', (name, age) => {
  console.log(3, name, age);
  return 3;
});

hook.call('SyncWaterfallHook', 18);

// 1 SyncWaterfallHook 18
// 2 1 18
// 3 1 18
```

## <font style="color:rgb(51, 51, 51);">SyncLoopHook</font>
+ <font style="color:rgb(51, 51, 51);">SyncLoopHook 的特点是不停的循环执行回调函数，直到函数结果等于 undefined</font>
+ <font style="color:rgb(51, 51, 51);">要注意的是每次循环都是从头开始循环的</font>

```javascript
const { SyncLoopHook } = require("tapable");
// 当回调函数返回非undefined值的时候会停止调用后续的回调

const hook = new SyncLoopHook(["name", "age"]);

let counter1 = 0;
let counter2 = 0;
let counter3 = 0;

hook.tap("1", (name, age) => {
  console.log(1, "counter1", counter1);
  if (++counter1 == 1) {
    counter1 = 0;
    return;
  }
  return true;
});

hook.tap("2", (name, age) => {
  console.log(2, "counter2", counter2);
  if (++counter2 == 2) {
    counter2 = 0;
    return;
  }
  return true;
});

hook.tap("3", (name, age) => {
  console.log(3, "counter3", counter3);
  if (++counter3 == 3) {
    counter3 = 0;
    return;
  }
  return true;
});

hook.call("SyncLoopHook", 18);

// 一共15次 12120 12121 12123
// 1 counter1 0
// 2 counter2 0
// 1 counter1 0
// 2 counter2 1
// 3 counter3 0

// 1 counter1 0
// 2 counter2 0
// 1 counter1 0
// 2 counter2 1
// 3 counter3 1

// 1 counter1 0
// 2 counter2 0
// 1 counter1 0
// 2 counter2 1
// 3 counter3 2
```

## <font style="color:rgb(51, 51, 51);">AsyncParallelHook</font>
+ <font style="color:rgb(51, 51, 51);">异步并行执行钩子</font>

### <font style="color:rgb(51, 51, 51);">tap</font>
+ <font style="color:rgb(51, 51, 51);">同步注册</font>

```javascript
const { AsyncParallelHook } = require("tapable");

const queue = new AsyncParallelHook(["name"]);

console.time("cost");
queue.tap("1", function (name) {
  console.log(1);
});
queue.tap("2", function (name) {
  console.log(2);
});
queue.tap("3", function (name) {
  console.log(3);
});
queue.callAsync("AsyncParallelHook", (err) => {
  console.log(err);
  console.timeEnd("cost");
});

// 1
// 2
// 3
// undefined
// cost: 1.387ms
```

### <font style="color:rgb(51, 51, 51);">tapAsync</font>
+ <font style="color:rgb(51, 51, 51);">异步注册，全部任务完成后执行最终的回调</font>

```javascript
const { AsyncParallelHook } = require("tapable");

const AsyncQueue = new AsyncParallelHook(["name"]);

console.time("async cost");
AsyncQueue.tapAsync("1", function (name, callback) {
  setTimeout(function () {
    console.log(1);
    callback();
  }, 1000);
});
AsyncQueue.tapAsync("2", function (name, callback) {
  setTimeout(function () {
    console.log(2);
    callback();
  }, 2000);
});
AsyncQueue.tapAsync("3", function (name, callback) {
  setTimeout(function () {
    console.log(3);
    callback();
  }, 3000);
});
queue.callAsync("AsyncParallelHook", (err) => {
  console.log(err);
  console.timeEnd("async cost");
});

// 1
// 2
// 3
// undefined
// async cost: 0.227ms
```

### <font style="color:rgb(51, 51, 51);">tapPromise</font>
+ <font style="color:rgb(51, 51, 51);">promise 注册钩子</font>
+ <font style="color:rgb(51, 51, 51);">全部完成后执行才算成功</font>

```javascript
const { AsyncParallelHook } = require("tapable");

const promiseQueue = new AsyncParallelHook(["name"]);

console.time("promise cost");
promiseQueue.tapPromise("1", function (name) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      console.log(1);
      resolve();
    }, 1000);
  });
});
promiseQueue.tapPromise("2", function (name) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      console.log(2);
      resolve();
    }, 2000);
  });
});
promiseQueue.tapPromise("3", function (name) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      console.log(3);
      resolve();
    }, 3000);
  });
});
promiseQueue.promise("AsyncParallelHook").then(() => {
  console.timeEnd("promise cost");
});

// 1
// 2
// 3
// promise cost: 3.001s
```

## <font style="color:rgb(51, 51, 51);">AsyncParallelBailHook</font>
+ <font style="color:rgb(51, 51, 51);">带保险的异步并行执行钩子</font>
+ <font style="color:rgb(51, 51, 51);">有一个任务返回值不为空就直接结束</font>
+ <font style="color:rgb(51, 51, 51);">对于promise来说，resolve还reject并没有区别</font>
    - <font style="color:rgb(51, 51, 51);">区别在于你是否传给它们的参数</font>

### <font style="color:rgb(51, 51, 51);">tap</font>
+ <font style="color:rgb(51, 51, 51);">如果有一个任务有返回值则调用最终的回调</font>

```javascript
const { AsyncParallelBailHook } = require("tapable");

const queue = new AsyncParallelBailHook(["name"]);

console.time("cost");
queue.tap("1", function (name) {
  console.log(1);
  return "Wrong";
});
queue.tap("2", function (name) {
  console.log(2);
});
queue.tap("3", function (name) {
  console.log(3);
});
queue.callAsync("AsyncParallelBailHook", (err) => {
  console.log(err);
  console.timeEnd("cost");
});

// 1
// null
// cost: 7.934ms
```

### <font style="color:rgb(51, 51, 51);">tapAsync</font>
+ <font style="color:rgb(51, 51, 51);">有一个任务返回错误就直接调最终的回调</font>

```javascript
const { AsyncParallelBailHook } = require("tapable");

const AsyncQueue = new AsyncParallelBailHook(["name"]);

console.time("async cost");
AsyncQueue.tapAsync("1", function (name, callback) {
  console.log(1);
  callback("Wrong");
});
AsyncQueue.tapAsync("2", function (name, callback) {
  console.log(2);
  callback();
});
AsyncQueue.tapAsync("3", function (name, callback) {
  console.log(3);
  callback();
});
AsyncQueue.callAsync("AsyncParallelBailHook", (err) => {
  console.log(err);
  console.timeEnd("async cost");
});

// 1
// Wrong
// async cost: 0.482ms
```

### <font style="color:rgb(51, 51, 51);">tapPromise</font>
+ <font style="color:rgb(51, 51, 51);">只要有一个任务有 resolve 或者 reject 值，不管成功失败都结束</font>

```javascript
const { AsyncParallelBailHook } = require("tapable");

const promiseQueue = new AsyncParallelBailHook(["name"]);

console.time("promise cost");
promiseQueue.tapPromise("1", function (name) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      console.log(1);
      //对于promise来说，resolve还reject并没有区别
      //区别在于你是否传给它们的参数
      resolve(1);
    }, 1000);
  });
});
promiseQueue.tapPromise("2", function (name) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      console.log(2);
      resolve();
    }, 2000);
  });
});

promiseQueue.tapPromise("3", function (name) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      console.log(3);
      resolve();
    }, 3000);
  });
});

promiseQueue.promise("AsyncParallelBailHook").then(
  (result) => {
    console.log("成功", result);
    console.timeEnd("promise cost");
  },
  (err) => {
    console.error("失败", err);
    console.timeEnd("promise cost");
  }
);

// 1
// 成功 1
// promise cost: 1.012s
// 2
// 3
```

## <font style="color:rgb(51, 51, 51);">AsyncSeriesHook</font>
+ <font style="color:rgb(51, 51, 51);">异步串行钩子</font>
+ <font style="color:rgb(51, 51, 51);">任务一个一个执行,执行完上一个执行下一个</font>

### <font style="color:rgb(51, 51, 51);">tap</font>
```javascript
const { AsyncSeriesHook } = require("tapable");

const queue = new AsyncSeriesHook(["name"]);

console.time("cost");
queue.tap("1", function (name) {
  console.log(1);
});
queue.tap("2", function (name) {
  console.log(2);
});
queue.tap("3", function (name) {
  console.log(3);
});
queue.callAsync("AsyncSeriesHook", (err) => {
  console.log(err);
  console.timeEnd("cost");
});

// 1
// 2
// 3
// undefined
// cost: 8.288ms
```

### <font style="color:rgb(51, 51, 51);">tapAsync</font>
```javascript
const { AsyncSeriesHook } = require("tapable");

const AsyncQueue = new AsyncSeriesHook(["name"]);

console.time("async cost");
AsyncQueue.tapAsync("1", function (name, callback) {
  setTimeout(function () {
    console.log(1);
  }, 1000);
});
AsyncQueue.tapAsync("2", function (name, callback) {
  setTimeout(function () {
    console.log(2);
    callback();
  }, 2000);
});
AsyncQueue.tapAsync("3", function (name, callback) {
  setTimeout(function () {
    console.log(3);
    callback();
  }, 3000);
});
AsyncQueue.callAsync("AsyncSeriesHook", (err) => {
  console.log(err);
  console.timeEnd("async cost");
});

// 1
```

### <font style="color:rgb(51, 51, 51);">tapPromise</font>
```javascript
const { AsyncSeriesHook } = require("tapable");

const promiseQueue = new AsyncSeriesHook(["name"]);

console.time("promise cost");
promiseQueue.tapPromise("1", function (name) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      console.log(1, name);
      resolve();
    }, 1000);
  });
});
promiseQueue.tapPromise("2", function (name) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      console.log(2, name);
      resolve();
    }, 2000);
  });
});
promiseQueue.tapPromise("3", function (name) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      console.log(3, name);
      resolve();
    }, 3000);
  });
});
promiseQueue.promise("AsyncSeriesHook").then((data) => {
  console.log(data);
  console.timeEnd("promise cost");
});

// 1 AsyncSeriesHook
// 2 AsyncSeriesHook
// 3 AsyncSeriesHook
// undefined
// promise cost: 6.013s
```

## <font style="color:rgb(51, 51, 51);">AsyncSeriesBailHook</font>
+ <font style="color:rgb(51, 51, 51);">只要有一个返回了不为 undefined 的值就直接结束</font>

### <font style="color:rgb(51, 51, 51);">tap</font>
```javascript
const { AsyncSeriesBailHook } = require("tapable");

const queue = new AsyncSeriesBailHook(["name"]);

console.time("cost");
queue.tap("1", function (name) {
  console.log(1);
  return "Wrong";
});
queue.tap("2", function (name) {
  console.log(2);
});
queue.tap("3", function (name) {
  console.log(3);
});
queue.callAsync("AsyncSeriesBailHook", (err) => {
  console.log(err);
  console.timeEnd("cost");
});

// 1
// null
// cost: 7.642ms
```

### <font style="color:rgb(51, 51, 51);">tapAsync</font>
```javascript
const { AsyncSeriesBailHook } = require("tapable");

const AsyncQueue = new AsyncSeriesBailHook(["name"]);

console.time("async cost");
AsyncQueue.tapAsync("1", function (name, callback) {
  setTimeout(function () {
    console.log(1);
    callback("wrong");
  }, 1000);
});
AsyncQueue.tapAsync("2", function (name, callback) {
  setTimeout(function () {
    console.log(2);
    callback();
  }, 2000);
});
AsyncQueue.tapAsync("3", function (name, callback) {
  setTimeout(function () {
    console.log(3);
    callback();
  }, 3000);
});
AsyncQueue.callAsync("AsyncSeriesBailHook", (err) => {
  console.log(err);
  console.timeEnd("async cost");
});

// 1
// wrong
// async cost: 1.001s
```

### <font style="color:rgb(51, 51, 51);">tapPromise</font>
```javascript
const { AsyncSeriesBailHook } = require("tapable");

const promiseQueue = new AsyncSeriesBailHook(["name"]);

console.time("promise cost");
promiseQueue.tapPromise("1", function (name) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      console.log(1);
      resolve();
    }, 1000);
  });
});
promiseQueue.tapPromise("2", function (name, callback) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      console.log(2);
      reject("失败了");
    }, 2000);
  });
});
promiseQueue.tapPromise("3", function (name, callback) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      console.log(3);
      resolve();
    }, 3000);
  });
});
promiseQueue.promise("AsyncSeriesBailHook").then(
  (data) => {
    console.log(data);
    console.timeEnd("promise cost");
  },
  (error) => {
    console.log(error);
    console.timeEnd("promise cost");
  }
);

// 1
// 2
// 失败了
// promise cost: 3.003s
```

## <font style="color:rgb(51, 51, 51);">AsyncSeriesWaterfallHook</font>
+ <font style="color:rgb(51, 51, 51);">只要有一个返回了不为 undefined 的值就直接结束</font>

### <font style="color:rgb(51, 51, 51);">tap</font>
```javascript
const { AsyncSeriesWaterfallHook } = require("tapable");

const queue = new AsyncSeriesWaterfallHook(["name", "age"]);

console.time("cost");
queue.tap("1", function (name, age) {
  console.log(1, name, age);
  return "return1";
});
queue.tap("2", function (data, age) {
  console.log(2, data, age);
  return "return2";
});
queue.tap("3", function (data, age) {
  console.log(3, data, age);
});
queue.callAsync("AsyncSeriesWaterfallHook", 10, (err) => {
  console.log(err);
  console.timeEnd("cost");
});

// 1 AsyncSeriesWaterfallHook 10
// 2 return1 10
// 3 return2 10
// null
// cost: 7.683ms
```

### <font style="color:rgb(51, 51, 51);">tapAsync</font>
```javascript
let { AsyncSeriesWaterfallHook } = require("tapable");

const AsyncQueue = new AsyncSeriesWaterfallHook(["name", "age"]);

console.time("async cost");
AsyncQueue.tapAsync("1", function (name, age, callback) {
  setTimeout(function () {
    console.log(1, name, age);
    callback(null, 1);
  }, 1000);
});
AsyncQueue.tapAsync("2", function (data, age, callback) {
  setTimeout(function () {
    console.log(2, data, age);
    callback(null, 2);
  }, 2000);
});
AsyncQueue.tapAsync("3", function (data, age, callback) {
  setTimeout(function () {
    console.log(3, data, age);
    callback(null, 3);
  }, 3000);
});
AsyncQueue.callAsync("AsyncSeriesWaterfallHook", 10, (err, data) => {
  console.log(err, data);
  console.timeEnd("async cost");
});

// 1 AsyncSeriesWaterfallHook 10
// 2 1 10
// 3 2 10
// null 3
// async cost: 6.013s
```

### <font style="color:rgb(51, 51, 51);">tapPromise</font>
```javascript
const { AsyncSeriesWaterfallHook } = require("tapable");

const promiseQueue = new AsyncSeriesWaterfallHook(["name", "age"]);

console.time("promise cost");
promiseQueue.tapPromise("1", function (name, age) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      console.log(1, name, age);
      resolve(1);
    }, 1000);
  });
});
promiseQueue.tapPromise("2", function (data, age) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      console.log(2, data, age);
      resolve(2);
    }, 2000);
  });
});
promiseQueue.tapPromise("3", function (data, age) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      console.log(3, data, age);
      resolve(3);
    }, 3000);
  });
});
promiseQueue.promise("AsyncSeriesWaterfallHook", 10).then((err) => {
  console.timeEnd("promise cost");
});

// 1 AsyncSeriesWaterfallHook 10
// 2 1 10
// 3 2 10
// promise cost: 6.015s
```

# <font style="color:rgb(51, 51, 51);">SyncHook</font>
1. <font style="color:rgb(51, 51, 51);">所有的构造函数都接收一个可选参数，参数是一个参数名的字符串数组</font>
2. <font style="color:rgb(51, 51, 51);">参数的名字可以任意填写，但是参数数组的长数必须要根实际接受的参数个数一致</font>
3. <font style="color:rgb(51, 51, 51);">如果回调函数不接受参数，可以传入空数组</font>
4. <font style="color:rgb(51, 51, 51);">在实例化的时候传入的数组长度长度有用，值没有用途</font>
5. <font style="color:rgb(51, 51, 51);">执行 call 时，参数个数和实例化时的数组长度有关</font>
6. <font style="color:rgb(51, 51, 51);">回调的时候是按先入先出的顺序执行的，先放的先执行</font>

## <font style="color:rgb(51, 51, 51);">使用</font>
```javascript
const { SyncHook } = require('../../tapable');

let syncHook = new SyncHook(["name", "age"]);
let fn1 = (name, age) => {
  console.log(1, name, age);
}
syncHook.tap({name:'1'},fn1 );
let fn2 =  (name, age) => {
  console.log(2, name, age);
}
syncHook.tap("2",fn2);
syncHook.call("zhufeng", 10);

/**
(function anonymous(name, age) {
    var _x = this._x;
    var _fn0 = _x[0];
    _fn0(name, age);
    var _fn1 = _x[1];
    _fn1(name, age);
})
*/
```

<!-- 这是一张图片，ocr 内容为：SYNCHOOKCODEFACTORY SYNCHOOK ARGS TAPS ARGS TAPS INIT SETUP TAP ARGS -INSERT HEADER CALL CALLTAP CALL DELEGATE CALLTAPSSERIES -CREATECALL CONTENT CREATE COMPILE -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1747747273053-22bd90e6-6a6b-4ea3-a7ec-c1f64cc8da14.png)

## <font style="color:rgb(51, 51, 51);">实现</font>
### <font style="color:rgb(51, 51, 51);">index.js</font>
```javascript
/**
 * @file index.js
 * @description tapable 入口文件，导出所有钩子类型。
 */

const SyncHook = require('./SyncHook');

module.exports = {
  SyncHook,
}
```

### <font style="color:rgb(51, 51, 51);">SyncHook.js</font>
```javascript
/**
 * @file SyncHook.js
 * @description 定义同步钩子 SyncHook 及其工厂，支持注册和串行执行 tap 回调。
 */

let Hook = require('./Hook');
const HookCodeFactory = require('./HookCodeFactory');

/**
 * 同步钩子的代码工厂，继承自 HookCodeFactory
 * 负责生成串行执行所有 tap 的代码
 */
class SyncHookCodeFactory extends HookCodeFactory {
  /**
   * 生成串行执行所有 tap 的代码
   * @returns {string} 返回生成的代码字符串
   */
  content() {
    return this.callTapsSeries()
  }
}

// 创建 SyncHookCodeFactory 实例
let factory = new SyncHookCodeFactory();

/**
 * 同步钩子类，继承自 Hook
 * 支持注册和串行执行 tap 回调
 */
class SyncHook extends Hook {
  /**
   * 编译钩子，生成最终的调用函数
   * @param {Object} options 编译选项
   * @returns {Function} 返回生成的调用函数
   */
  compile(options) {
    factory.setup(this, options);
    return factory.create(options);
  }
}

module.exports = SyncHook;
```

### <font style="color:rgb(51, 51, 51);">Hook.js</font>
```javascript
/**
 * @file Hook.js
 * @description 钩子基类，所有钩子类型的父类，支持 tap 注册和动态编译执行。
 */

/**
 * 钩子基类
 */
class Hook {
  /**
   * 构造函数
   * @param {Array<string>} args 参数名数组
   */
  constructor(args) {
    if (!Array.isArray(args)) args = [];
    /**
     * 钩子的参数名列表
     * @type {Array<string>}
     */
    this.args = args;
    /**
     * 存储所有注册的 tap（钩子回调）
     * @type {Array<Object>}
     */
    this.taps = [];
    /**
     * call 方法，初始为代理函数
     * @type {Function}
     */
    this.call = CALL_DELEGATE;
  }

  /**
   * 注册同步钩子
   * @param {string|Object} options tap 名称或配置对象
   * @param {Function} fn 回调函数
   */
  tap(options, fn) {
    this._tap("sync", options, fn);
  }

  /**
   * 内部注册方法，支持不同类型（如 sync、async）
   * @param {string} type 类型
   * @param {string|Object} options tap 名称或配置对象
   * @param {Function} fn 回调函数
   */
  _tap(type, options, fn) {
    if (typeof options === 'string')
      options = { name: options };
    let tapInfo = { ...options, type, fn };
    this._insert(tapInfo);
  }

  /**
   * 重置编译，call 重新指向代理函数
   */
  _resetCompilation() {
    this.call = CALL_DELEGATE;
  }

  /**
   * 插入 tap，并重置编译
   * @param {Object} tapInfo
   */
  _insert(tapInfo) {
    this._resetCompilation();
    this.taps.push(tapInfo);
  }

  /**
   * 抽象方法，子类需重写
   * @param {Object} options
   */
  compile(options) {
    throw new Error("Abstract: should be overridden");
  }

  /**
   * 创建 call 方法，实际会调用 compile 生成最终执行函数
   * @param {string} type
   * @returns {Function}
   */
  _createCall(type) {
    return this.compile({
      taps: this.taps,
      args: this.args,
      type
    });
  }
}

/**
 * call 的初始代理函数，首次调用时会编译生成真正的 call 方法
 * @param  {...any} args
 * @returns {any}
 */
const CALL_DELEGATE = function (...args) {
  this.call = this._createCall("sync");
  return this.call(...args);
};

module.exports = Hook;
```

### <font style="color:rgb(51, 51, 51);">HookCodeFactory.js</font>
```javascript
/**
 * @file HookCodeFactory.js
 * @description 钩子代码工厂，负责生成钩子的执行代码（如串行/并行等）。
 */

/**
 * 钩子代码工厂基类
 */
class HookCodeFactory {
  /**
   * 设置钩子实例，将所有 tap 的回调函数提取出来赋值给 _x
   * @param {Object} hookInstance
   * @param {Object} options
   */
  setup(hookInstance, options) {
    hookInstance._x = options.taps.map(item => item.fn);
  }

  /**
   * 初始化工厂，保存 options
   * @param {Object} options
   */
  init(options) {
    this.options = options;
  }

  /**
   * 反初始化，清空 options
   */
  deinit() {
    this.options = null;
  }

  /**
   * 生成参数字符串，可插入 before/after 参数
   * @param {Object} options
   * @returns {string}
   */
  args(options = {}) {
    let { before, after } = options;
    let allArgs = this.options.args || [];
    if (before) allArgs = [before, ...allArgs];
    if (after) allArgs = [...allArgs, after];
    if (allArgs.length > 0)
      return allArgs.join(', ');
    return "";
  }

  /**
   * 生成函数头部代码，定义 _x（所有 tap 回调的数组）
   * @returns {string}
   */
  header() {
    let code = "";
    code += "var _x = this._x;\n";
    return code;
  }

  /**
   * 创建最终的钩子执行函数
   * @param {Object} options
   * @returns {Function}
   */
  create(options) {
    this.init(options);
    let fn;
    switch (this.options.type) {
      case 'sync':
        // 生成同步钩子的执行函数
        fn = new Function(
          this.args(),
          this.header() + this.content()
        )
        break;
      default:
        break;
    }
    this.deinit();
    return fn;
  }

  /**
   * 串行调用所有 tap，生成串行执行的代码
   * @returns {string}
   */
  callTapsSeries() {
    if (this.options.taps.length === 0) {
      return '';
    }
    let code = "";
    for (let j = 0; j < this.options.taps.length; j++) {
      const content = this.callTap(j);
      code += content;
    }
    return code;
  }

  /**
   * 生成调用单个 tap 的代码
   * @param {number} tapIndex
   * @returns {string}
   */
  callTap(tapIndex) {
    let code = "";
    code += `var _fn${tapIndex} = _x[${tapIndex}];\n`
    let tap = this.options.taps[tapIndex];
    switch (tap.type) {
      case 'sync':
        // 生成同步调用代码
        code += `_fn${tapIndex}(${this.args()});\n`;
        break;
      default:
        break;
    }
    return code;
  }
}

module.exports = HookCodeFactory;
```

# <font style="color:rgb(51, 51, 51);">AsyncParallelHook.callAsync</font>
## <font style="color:rgb(51, 51, 51);">使用</font>
```javascript
// const { AsyncParallelHook } = require('tapable');
const { AsyncParallelHook } = require("../../tapable");

const AsyncQueue = new AsyncParallelHook(["name", "age"]);

console.time('async cost');
AsyncQueue.tapAsync('1', (name, age, callback) => {
  setTimeout(() => {
    console.log(1, name, age);
    callback();
  }, 1000);
});
AsyncQueue.tapAsync('2', (name, age,callback) => {
  setTimeout(() => {
    console.log(2, name, age);
    callback();
  }, 2000);
});
AsyncQueue.tapAsync('3', (name, age,callback) => {
  setTimeout(() => {
    console.log(3, name, age);
    callback();
  }, 3000);
});
debugger
AsyncQueue.callAsync('AsyncParallelHook', 10, (err) => {
  console.log(err);
  console.timeEnd('async cost');
});

/*
(function anonymous(name, age, _callback) {
  var _x = this._x;
  var _counter = 3;

  var _done = function () {
    _callback();
  };
  var _fn0 = _x[0];

  _fn0(name, age, function (_err0) {
    if (--_counter === 0) _done();
  });
  var _fn1 = _x[1];

  _fn1(name, age, function (_err1) {
    if (--_counter === 0) _done();
  });
  var _fn2 = _x[2];

  _fn2(name, age, function (_err2) {
    if (--_counter === 0) _done();
  });

})
*/
```

## <font style="color:rgb(51, 51, 51);">实现</font>
### <font style="color:rgb(51, 51, 51);">index.js</font>
```diff
/**
 * @file index.js
 * @description tapable 入口文件，导出所有钩子类型。
 */

const SyncHook = require('./SyncHook');
+ const AsyncParallelHook = require('./AsyncParallelHook');

module.exports = {
  SyncHook, // 同步钩子
+  AsyncParallelHook // 异步并行钩子
}
```

### <font style="color:rgb(51, 51, 51);">AsyncParallelHook.js</font>
```javascript
/**
 * @file AsyncParallelHook.js
 * @description 定义异步并行钩子 AsyncParallelHook 及其工厂，支持注册和并行执行 tap 回调。
 */

const Hook = require('./Hook');
const HookCodeFactory = require('./HookCodeFactory');

/**
 * 异步并行钩子的代码工厂，继承自 HookCodeFactory
 * 负责生成并行执行所有 tap 的代码
 */
class AsyncParallelHookCodeFactory extends HookCodeFactory {
  /**
   * 生成并行执行所有 tap 的代码
   * @returns {string} 返回生成的代码字符串
   */
  content() {
    // 调用父类的 callTapsParallel 方法，生成并行调用的代码
    return this.callTapsParallel();
  }
}

// 创建 AsyncParallelHookCodeFactory 实例
let factory = new AsyncParallelHookCodeFactory();

/**
 * 异步并行钩子类，继承自 Hook
 * 支持注册和并行执行 tap 回调
 */
class AsyncParallelHook extends Hook {
  /**
   * 编译钩子，生成最终的调用函数
   * @param {Object} options 编译选项
   * @returns {Function} 返回生成的调用函数
   */
  compile(options) {
    // 设置工厂的上下文
    factory.setup(this, options);
    // 创建最终的钩子执行函数
    return factory.create(options);
  }
}

module.exports = AsyncParallelHook;
```

### <font style="color:rgb(51, 51, 51);">Hook.js</font>
```diff
/**
 * @file Hook.js
 * @description 钩子基类，所有钩子类型的父类，支持 tap 注册和动态编译执行。
 */

/**
 * 钩子基类
 */
class Hook {
  /**
   * 构造函数
   * @param {Array<string>} args 参数名数组
   */
  constructor(args) {
    if (!Array.isArray(args)) args = [];
    /**
     * 钩子的参数名列表
     * @type {Array<string>}
     */
    this.args = args;
    /**
     * 存储所有注册的 tap（钩子回调）
     * @type {Array<Object>}
     */
    this.taps = [];
    /**
     * call 方法，初始为代理函数
     * @type {Function}
     */
    this.call = CALL_DELEGATE;
++    /**
++     * callAsync 方法，初始为代理函数
++     * @type {Function}
++     */
++    this.callAsync = CALL_ASYNC_DELEGATE;
  }

  /**
   * 注册同步钩子
   * @param {string|Object} options tap 名称或配置对象
   * @param {Function} fn 回调函数
   */
  tap(options, fn) {
    this._tap("sync", options, fn);
  }

+  /**
+   * 注册异步钩子
+   * @param {string|Object} options tap 名称或配置对象
+   * @param {Function} fn 回调函数
+   */
+  tapAsync(options, fn) {
+    this._tap("async", options, fn);
+  }

  /**
   * 内部注册方法，支持不同类型（如 sync、async）
   * @param {string} type 类型
   * @param {string|Object} options tap 名称或配置对象
   * @param {Function} fn 回调函数
   */
  _tap(type, options, fn) {
    if (typeof options === 'string')
      options = { name: options };
    let tapInfo = { ...options, type, fn };
    this._insert(tapInfo);
  }

  /**
   * 重置编译，call 重新指向代理函数
   */
  _resetCompilation() {
    this.call = CALL_DELEGATE;
  }

  /**
   * 插入 tap，并重置编译
   * @param {Object} tapInfo
   */
  _insert(tapInfo) {
    this._resetCompilation();
    this.taps.push(tapInfo);
  }

  /**
   * 抽象方法，子类需重写
   * @param {Object} options
   */
  compile(options) {
    throw new Error("Abstract: should be overridden");
  }

  /**
   * 创建 call 方法，实际会调用 compile 生成最终执行函数
   * @param {string} type
   * @returns {Function}
   */
  _createCall(type) {
    return this.compile({
      taps: this.taps,
      args: this.args,
      type
    });
  }
}

/**
 * call 的初始代理函数，首次调用时会编译生成真正的 call 方法
 * @param  {...any} args
 * @returns {any}
 */
const CALL_DELEGATE = function (...args) {
  this.call = this._createCall("sync");
  return this.call(...args);
};

+ /**
+  * callAsync 的初始代理函数，首次调用时会编译生成真正的 callAsync 方法
+  * @param  {...any} args
+  * @returns {any}
+  */
+ const CALL_ASYNC_DELEGATE = function (...args) {
+   this.callAsync = this._createCall("async");
+   return this.callAsync(...args);
+ };

module.exports = Hook;
```

### <font style="color:rgb(51, 51, 51);">HookCodeFactory.js</font>
```diff
/**
 * @file HookCodeFactory.js
 * @description 钩子代码工厂，负责生成钩子的执行代码（如串行/并行等）。
 */

/**
 * 钩子代码工厂基类
 */
class HookCodeFactory {
  /**
   * 设置钩子实例，将所有 tap 的回调函数提取出来赋值给 _x
   * @param {Object} hookInstance
   * @param {Object} options
   */
  setup(hookInstance, options) {
    hookInstance._x = options.taps.map(item => item.fn);
  }

  /**
   * 初始化工厂，保存 options
   * @param {Object} options
   */
  init(options) {
    this.options = options;
  }

  /**
   * 反初始化，清空 options
   */
  deinit() {
    this.options = null;
  }

  /**
   * 生成参数字符串，可插入 before/after 参数
   * @param {Object} options
   * @returns {string}
   */
  args(options = {}) {
    let { before, after } = options;
    let allArgs = this.options.args || [];
    if (before) allArgs = [before, ...allArgs];
    if (after) allArgs = [...allArgs, after];
    if (allArgs.length > 0)
      return allArgs.join(', ');
    return "";
  }

  /**
   * 生成函数头部代码，定义 _x（所有 tap 回调的数组）
   * @returns {string}
   */
  header() {
    let code = "";
    code += "var _x = this._x;\n";
    return code;
  }

  /**
   * 创建最终的钩子执行函数
   * @param {Object} options
   * @returns {Function}
   */
  create(options) {
    this.init(options);
    let fn;
    switch (this.options.type) {
      case 'sync':
        // 生成同步钩子的执行函数
        fn = new Function(
          this.args(),
          this.header() + this.content()
        )
        break;
+      case 'async':
+        // 生成异步钩子的执行函数
+        fn = new Function(
+          this.args({ after: '_callback' }),
+          this.header() + this.content()
+        )
+        break;
      default:
        break;
    }
    this.deinit();
    return fn;
  }

  /**
   * 串行调用所有 tap，生成串行执行的代码
   * @returns {string}
   */
  callTapsSeries() {
    if (this.options.taps.length === 0) {
      return '';
    }
    let code = "";
    for (let j = 0; j < this.options.taps.length; j++) {
      const content = this.callTap(j);
      code += content;
    }
    return code;
  }

+  /**
+   * 并行调用所有 tap，生成并行执行的代码
+   * @returns {string}
+   */
+  callTapsParallel() {
+    let code = `var _counter = ${this.options.taps.length};\n`;
+    code += `
+      var _done = function () {
+        _callback();
+      };
+    `;
+    for (let j = 0; j < this.options.taps.length; j++) {
+      const content = this.callTap(j);
+      code += content;
+    }
+    return code;
+  }

  /**
   * 生成调用单个 tap 的代码
   * @param {number} tapIndex
   * @returns {string}
   */
  callTap(tapIndex) {
    let code = "";
    code += `var _fn${tapIndex} = _x[${tapIndex}];\n`
    let tap = this.options.taps[tapIndex];
    switch (tap.type) {
      case 'sync':
        // 生成同步调用代码
        code += `_fn${tapIndex}(${this.args()});\n`;
+        if(this.options.type ===  'async') {
+          code += `
+            if (--_counter === 0) _done();
+          `;
+        }
        break;
+      case 'async':
+        code += `
+          _fn${tapIndex}(${this.args({after:`function (_err${tapIndex}) {
+            if (--_counter === 0) _done();
+          }`})});
+        `;
+        break;
      default:
        break;
    }
    return code;
  }
}

module.exports = HookCodeFactory;
```

# <font style="color:rgb(51, 51, 51);">AsyncParallelHook.callPromise</font>
## <font style="color:rgb(51, 51, 51);">使用</font>
```javascript
//const { AsyncParallelHook } = require("tapable");
const { AsyncParallelHook } = require("../../tapable");

const promiseQueue = new AsyncParallelHook(["name", "age"]);

console.time("promise cost");
promiseQueue.tapPromise("1", function (name, age) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      console.log(1, name, age);
      resolve();
    }, 1000);
  });
});
promiseQueue.tapPromise("2", function (name, age) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      console.log(2, name, age);
      resolve();
    }, 2000);
  });
});
promiseQueue.tapPromise("3", function (name, age) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      console.log(3, name, age);
      resolve();
    }, 3000);
  });
});
promiseQueue.promise("AsyncParallelHook", 28).then(() => {
  console.timeEnd("promise cost");
});

/*
(function anonymous(name, age) {
  var _x = this._x;
  return new Promise(function (_resolve, _reject) {
    var _counter = 3;

    var _done = function () {
      _resolve();

    };

    var _fn0 = _x[0];
    var _promise0 = _fn0(name, age);
    _promise0.then(
      function () {
        if (--_counter === 0) _done();
      }
    );

    var _fn1 = _x[1];
    var _promise1 = _fn1(name, age);
    _promise1.then(
      function () {
        if (--_counter === 0) _done();
      }
    );

    var _fn2 = _x[2];
    var _promise2 = _fn2(name, age);
    _promise2.then(
      function () {
        if (--_counter === 0) _done();
      }
    );

  })
})
*/
```

## <font style="color:rgb(51, 51, 51);">实现</font>
### <font style="color:rgb(51, 51, 51);">Hook.js</font>
```diff
/**
 * @file Hook.js
 * @description 钩子基类，所有钩子类型的父类，支持 tap 注册和动态编译执行。
 */

/**
 * 钩子基类
 */
class Hook {
  /**
   * 构造函数
   * @param {Array<string>} args 参数名数组
   */
  constructor(args) {
    if (!Array.isArray(args)) args = [];
    /**
     * 钩子的参数名列表
     * @type {Array<string>}
     */
    this.args = args;
    /**
     * 存储所有注册的 tap（钩子回调）
     * @type {Array<Object>}
     */
    this.taps = [];
    /**
     * call 方法，初始为代理函数
     * @type {Function}
     */
    this.call = CALL_DELEGATE;
    /**
     * callAsync 方法，初始为代理函数
     * @type {Function}
     */
    this.callAsync = CALL_ASYNC_DELEGATE;
+    /**
+     * promise 方法，初始为代理函数
+     * @type {Function}
+     */
+    this.promise = PROMISE_DELEGATE;
  }

  /**
   * 注册同步钩子
   * @param {string|Object} options tap 名称或配置对象
   * @param {Function} fn 回调函数
   */
  tap(options, fn) {
    this._tap("sync", options, fn);
  }

  /**
   * 注册异步钩子
   * @param {string|Object} options tap 名称或配置对象
   * @param {Function} fn 回调函数
   */
  tapAsync(options, fn) {
    this._tap("async", options, fn);
  }

+  /**
+   * 注册 promise 钩子
+   * @param {string|Object} options tap 名称或配置对象
+   * @param {Function} fn 回调函数
+   */
+  tapPromise(options, fn) {
+    this._tap("promise", options, fn);
+  }

  /**
   * 内部注册方法，支持不同类型（如 sync、async）
   * @param {string} type 类型
   * @param {string|Object} options tap 名称或配置对象
   * @param {Function} fn 回调函数
   */
  _tap(type, options, fn) {
    if (typeof options === 'string')
      options = { name: options };
    let tapInfo = { ...options, type, fn };
    this._insert(tapInfo);
  }

  /**
   * 重置编译，call 重新指向代理函数
   */
  _resetCompilation() {
    this.call = CALL_DELEGATE;
  }

  /**
   * 插入 tap，并重置编译
   * @param {Object} tapInfo
   */
  _insert(tapInfo) {
    this._resetCompilation();
    this.taps.push(tapInfo);
  }

  /**
   * 抽象方法，子类需重写
   * @param {Object} options
   */
  compile(options) {
    throw new Error("Abstract: should be overridden");
  }

  /**
   * 创建 call 方法，实际会调用 compile 生成最终执行函数
   * @param {string} type
   * @returns {Function}
   */
  _createCall(type) {
    return this.compile({
      taps: this.taps,
      args: this.args,
      type
    });
  }
}

/**
 * call 的初始代理函数，首次调用时会编译生成真正的 call 方法
 * @param  {...any} args
 * @returns {any}
 */
const CALL_DELEGATE = function (...args) {
  this.call = this._createCall("sync");
  return this.call(...args);
};

/**
 * callAsync 的初始代理函数，首次调用时会编译生成真正的 callAsync 方法
 * @param  {...any} args
 * @returns {any}
 */
const CALL_ASYNC_DELEGATE = function (...args) {
  this.callAsync = this._createCall("async");
  return this.callAsync(...args);
};

+ /**
+  * promise 的初始代理函数，首次调用时会编译生成真正的 promise 方法
+  * @param  {...any} args
+  * @returns {any}
+  */
+ const PROMISE_DELEGATE = function (...args) {
+   this.promise = this._createCall("promise");
+   return this.promise(...args);
+ };
module.exports = Hook;
```

### <font style="color:rgb(51, 51, 51);">AsyncParallelHook.js</font>
```diff
/**
 * @file AsyncParallelHook.js
 * @description 定义异步并行钩子 AsyncParallelHook 及其工厂，支持注册和并行执行 tap 回调。
 */

const Hook = require('./Hook');
const HookCodeFactory = require('./HookCodeFactory');

/**
 * 异步并行钩子的代码工厂，继承自 HookCodeFactory
 * 负责生成并行执行所有 tap 的代码
 */
class AsyncParallelHookCodeFactory extends HookCodeFactory {
  /**
   * 生成并行执行所有 tap 的代码
   * @param {Object} param 参数对象
   * @returns {string} 返回生成的代码字符串
   */
  content({ onDone }) {
    // 调用父类的 callTapsParallel 方法，生成并行调用的代码
+    return this.callTapsParallel({ onDone });
  }
}

// 创建 AsyncParallelHookCodeFactory 实例
let factory = new AsyncParallelHookCodeFactory();

/**
 * 异步并行钩子类，继承自 Hook
 * 支持注册和并行执行 tap 回调
 */
class AsyncParallelHook extends Hook {
  /**
   * 编译钩子，生成最终的调用函数
   * @param {Object} options 编译选项
   * @returns {Function} 返回生成的调用函数
   */
  compile(options) {
    // 设置工厂的上下文
    factory.setup(this, options);
    // 创建最终的钩子执行函数
    return factory.create(options);
  }
}

module.exports = AsyncParallelHook;
```

### <font style="color:rgb(51, 51, 51);">HookCodeFactory.js</font>
```diff
/**
 * @file HookCodeFactory.js
 * @description 钩子代码工厂，负责生成钩子的执行代码（如串行/并行等）。
 */

/**
 * 钩子代码工厂基类
 */
class HookCodeFactory {
  /**
   * 设置钩子实例，将所有 tap 的回调函数提取出来赋值给 _x
   * @param {Object} hookInstance
   * @param {Object} options
   */
  setup(hookInstance, options) {
    hookInstance._x = options.taps.map(item => item.fn);
  }

  /**
   * 初始化工厂，保存 options
   * @param {Object} options
   */
  init(options) {
    this.options = options;
  }

  /**
   * 反初始化，清空 options
   */
  deinit() {
    this.options = null;
  }

  /**
   * 生成参数字符串，可插入 before/after 参数
   * @param {Object} options
   * @returns {string}
   */
  args(options = {}) {
    let { before, after } = options;
    let allArgs = this.options.args || [];
    if (before) allArgs = [before, ...allArgs];
    if (after) allArgs = [...allArgs, after];
    if (allArgs.length > 0)
      return allArgs.join(', ');
    return "";
  }

  /**
   * 生成函数头部代码，定义 _x（所有 tap 回调的数组）
   * @returns {string}
   */
  header() {
    let code = "";
    code += "var _x = this._x;\n";
    return code;
  }

  /**
   * 创建最终的钩子执行函数
   * @param {Object} options
   * @returns {Function}
   */
  create(options) {
    this.init(options);
    let fn;
    switch (this.options.type) {
      case 'sync':
        // 生成同步钩子的执行函数
        fn = new Function(
          this.args(),
          this.header() + this.content()
        )
        break;
      case 'async':
        // 生成异步钩子的执行函数
        fn = new Function(
          this.args({ after: '_callback' }),
+          this.header() + this.content({ onDone: () => " _callback();\n" })
        )
        break;
+      case 'promise':
+        // 生成 promise 钩子的执行函数
+        let tapsContent = this.content({ onDone: () => " _resolve();\n" });
+        let content = `return new Promise(function (_resolve, _reject) {
+          ${tapsContent}
+        })`;
+        fn = new Function(
+          this.args(),
+          this.header() + content
+        );
+        break;
      default:
        break;
    }
    this.deinit();
    return fn;
  }

  /**
   * 串行调用所有 tap，生成串行执行的代码
   * @returns {string}
   */
  callTapsSeries() {
    if (this.options.taps.length === 0) {
      return '';
    }
    let code = "";
    for (let j = 0; j < this.options.taps.length; j++) {
      const content = this.callTap(j);
      code += content;
    }
    return code;
  }

  /**
   * 并行调用所有 tap，生成并行执行的代码
   * @returns {string}
   */
+  callTapsParallel({ onDone }) {
    let code = `var _counter = ${this.options.taps.length};\n`;
    code += `
      var _done = function () {
+        ${onDone()}
      };
    `;
    for (let j = 0; j < this.options.taps.length; j++) {
      const content = this.callTap(j);
      code += content;
    }
    return code;
  }

  /**
   * 生成调用单个 tap 的代码
   * @param {number} tapIndex
   * @returns {string}
   */
  callTap(tapIndex) {
    let code = "";
    code += `var _fn${tapIndex} = _x[${tapIndex}];\n`
    let tap = this.options.taps[tapIndex];
    switch (tap.type) {
      case 'sync':
        // 生成同步调用代码
        code += `
          _fn${tapIndex}(${this.args()});
        `;
        if(this.options.type ===  'async') {
          code += `
            if (--_counter === 0) _done();
          `;
        }
        break;
      case 'async':
        code += `
          _fn${tapIndex}(${this.args({
          after: `function (_err${tapIndex}) {
            if (--_counter === 0) _done();
          }`})});
        `;
        break;
+      case 'promise':
+        code = `
+          var _fn${tapIndex} = _x[${tapIndex}];
+          var _promise${tapIndex} = _fn${tapIndex}(${this.args()});
+          _promise${tapIndex}.then(
+            function () {
+              if (--_counter === 0) _done();
+            }
+          );
+        `;
+        break;
      default:
        break;
    }
    return code;
  }
}

module.exports = HookCodeFactory;
```

# <font style="color:rgb(51, 51, 51);">AsyncSeriesHook</font>
## <font style="color:rgb(51, 51, 51);">使用</font>
```javascript
// const { AsyncSeriesHook } = require("tapable");
const { AsyncSeriesHook } = require("../../tapable");

const AsyncQueue = new AsyncSeriesHook(["name", "age"]);

console.time("async cost");
AsyncQueue.tapAsync("1", function (name, age, callback) {
  setTimeout(function () {
    console.log(1, name, age);
    callback();
  }, 1000);
});
AsyncQueue.tapAsync("2", function (name, age, callback) {
  setTimeout(function () {
    console.log(2, name, age);
    callback();
  }, 2000);
});
AsyncQueue.tapAsync("3", function (name, age, callback) {
  setTimeout(function () {
    console.log(3, name, age);
    callback();
  }, 3000);
});
debugger
AsyncQueue.callAsync("AsyncSeriesHook", 18, (err) => {
  console.log(err);
  console.timeEnd("async cost");
});

/**
(function (name, age, _callback) {
    var _x = this._x;
    function _next1() {
        var _fn2 = _x[2];
        _fn2(name, age, (function () {
            _callback();
        }));
    }
    function _next0() {
        var _fn1 = _x[1];
        _fn1(name, age, (function () {
            _next1();
        }));
    }
    var _fn0 = _x[0];
    _fn0(name, age, (function () {
        _next0();
    }));
})
```

## <font style="color:rgb(51, 51, 51);">实现</font>
### <font style="color:rgb(51, 51, 51);">index.js</font>
```diff
/**
 * @file index.js
 * @description tapable 入口文件，导出所有钩子类型。
 */

const SyncHook = require('./SyncHook');
const AsyncParallelHook = require('./AsyncParallelHook');
+ const AsyncSeriesHook = require('./AsyncSeriesHook');

module.exports = {
  SyncHook, // 同步钩子
  AsyncParallelHook, // 异步并行钩子
+  AsyncSeriesHook, // 异步串行钩子
}
```

### <font style="color:rgb(51, 51, 51);">AsyncSeriesHook.js</font>
```javascript
/**
 * @file AsyncSeriesHook.js
 * @description 定义异步串行钩子 AsyncSeriesHook 及其工厂，支持注册和并行执行 tap 回调。
 */

const Hook = require('./Hook');
const HookCodeFactory = require('./HookCodeFactory');

/**
 * 异步串行钩子的代码工厂，继承自 HookCodeFactory
 * 负责生成并执行所有 tap 回调
 */
class AsyncSeriesHookCodeFactory extends HookCodeFactory {
  /**
   * 生成并执行所有 tap 回调
   * @param {Object} options - 钩子选项
   * @param {Function} options.onDone - 所有 tap 回调执行完毕后的回调函数
   * @returns {string} 生成的代码
   */
  content({ onDone }) {
    // 调用父类 callTapsSeries 方法生成并执行所有 tap 回调
    return this.callTapsSeries({ onDone });
  }
}

// 创建异步串行钩子的代码工厂
const factory = new AsyncSeriesHookCodeFactory();

/**
 * 异步串行钩子 AsyncSeriesHook 继承自 Hook
 * 支持注册和并行执行 tap 回调
 */
class AsyncSeriesHook extends Hook {
  /**
   * 编译钩子，生成最终的调用函数
   * @param {Object} options - 编译选项
   * @returns {Function} 返回生成的调用函数
   */
  compile(options) {
    // 置工厂的上下文
    factory.setup(this, options);
    // 创建最终的钩子执行函数
    return factory.create(options);
  }
}
module.exports = AsyncSeriesHook;
```

### <font style="color:rgb(51, 51, 51);">HookCodeFactory.js</font>
```diff
/**
 * @file HookCodeFactory.js
 * @description 钩子代码工厂，负责生成钩子的执行代码（如串行/并行等）。
 */

/**
 * 钩子代码工厂基类
 */
class HookCodeFactory {
  /**
   * 设置钩子实例，将所有 tap 的回调函数提取出来赋值给 _x
   * @param {Object} hookInstance
   * @param {Object} options
   */
  setup(hookInstance, options) {
    hookInstance._x = options.taps.map(item => item.fn);
  }

  /**
   * 初始化工厂，保存 options
   * @param {Object} options
   */
  init(options) {
    this.options = options;
  }

  /**
   * 反初始化，清空 options
   */
  deinit() {
    this.options = null;
  }

  /**
   * 生成参数字符串，可插入 before/after 参数
   * @param {Object} options
   * @returns {string}
   */
  args(options = {}) {
    let { before, after } = options;
    let allArgs = this.options.args || [];
    if (before) allArgs = [before, ...allArgs];
    if (after) allArgs = [...allArgs, after];
    if (allArgs.length > 0)
      return allArgs.join(', ');
    return "";
  }

  /**
   * 生成函数头部代码，定义 _x（所有 tap 回调的数组）
   * @returns {string}
   */
  header() {
    let code = "";
    code += "var _x = this._x;\n";
    return code;
  }

  /**
   * 创建最终的钩子执行函数
   * @param {Object} options
   * @returns {Function}
   */
  create(options) {
    this.init(options);
    let fn;
    switch (this.options.type) {
      case 'sync':
        // 生成同步钩子的执行函数
        fn = new Function(
          this.args(),
          this.header() + this.content()
        )
        break;
      case 'async':
        // 生成异步钩子的执行函数
        fn = new Function(
          this.args({ after: '_callback' }),
          this.header() + this.content({ onDone: () => " _callback();\n" })
        )
        break;
      case 'promise':
        // 生成 promise 钩子的执行函数
        let tapsContent = this.content({ onDone: () => " _resolve();\n" });
        let content = `return new Promise(function (_resolve, _reject) {
          ${tapsContent}
        })`;
        fn = new Function(
          this.args(),
          this.header() + content
        );
        break;
      default:
        break;
    }
    this.deinit();
    return fn;
  }

  /**
   * 串行调用所有 tap，生成串行执行的代码
   * @returns {string}
   */
+  callTapsSeries({ onDone } = {}) {
    if (this.options.taps.length === 0) {
+      return onDone();
    }
+    let code = "";
+    let current = onDone;
+    for (let j = this.options.taps.length - 1; j >= 0; j--) {
+      let i = j;
+      const unroll = (current !== onDone); // && (this.options.taps[i].type !== "sync" );
+      if (unroll) {
+        code += `function _next${i}() {\n`;
+        code += current();
+        code += `}\n`;
+        current = () => `_next${i}();\n`;
+      }
+      const done = current;
+      const content = this.callTap(i, { onDone: done });
+      current = () => content;
+    }
+    code += current();
    return code;
  }

  /**
   * 并行调用所有 tap，生成并行执行的代码
   * @returns {string}
   */
  callTapsParallel({ onDone }) {
    let code = `var _counter = ${this.options.taps.length};\n`;
    code += `
      var _done = function () {
+          if (--_counter === 0) ${onDone()};
      };
    `;
    for (let j = 0; j < this.options.taps.length; j++) {
+      const content = this.callTap(j, { onDone: () => `_done();\n` });
      code += content;
    }
    return code;
  }

  /**
   * 生成调用单个 tap 的代码
   * @param {number} tapIndex
   * @returns {string}
   */
+  callTap(tapIndex, { onDone } = {}) {
    let code = "";
    code += `var _fn${tapIndex} = _x[${tapIndex}];\n`
    let tap = this.options.taps[tapIndex];
    switch (tap.type) {
      case 'sync':
        // 生成同步调用代码
        code += `
          _fn${tapIndex}(${this.args()});
        `;
+        if (onDone) {
+          code += onDone();
+        }
        break;
      case 'async':
+        let cbCode = `(function() {\n`;
+        if (onDone) cbCode += onDone();
+        cbCode += `})`;
+        code += `_fn${tapIndex}(${this.args({
+          after: cbCode
+        })});`;
        break;
      case 'promise':
        code += `
          var _promise${tapIndex} = _fn${tapIndex}(${this.args()});
          _promise${tapIndex}.then(
            function () {
+              ${onDone()};
            }
          );
        `;
        break;
      default:
        break;
    }
    return code;
  }
}

module.exports = HookCodeFactory;
```

```javascript
2 刚进来  _callback();
2 结束 var _fn2 = _x[2];
_fn2(name, age, (function () {
    _callback();
}));

code
1 刚进来 var _fn2 = _x[2];
_fn2(name, age, (function () {
    _callback();
}));
1 unroll _next1();
1 结束 var _fn1 = _x[1];
_fn1(name, age, (function () {
    _next1();
}));

code function _next1() {
    var _fn2 = _x[2];
    _fn2(name, age, (function () {
        _callback();
    }));
}

0 刚进来 var _fn1 = _x[1];
_fn1(name, age, (function () {
    _next1();
}));
0 unroll _next0();
0 结束 var _fn0 = _x[0];
_fn0(name, age, (function () {
    _next0();
}));

code function _next1() {
    var _fn2 = _x[2];
    _fn2(name, age, (function () {
        _callback();
    }));
}
function _next0() {
    var _fn1 = _x[1];
    _fn1(name, age, (function () {
        _next1();
    }));
}
```

# <font style="color:rgb(51, 51, 51);">interceptor</font>
+ <font style="color:rgb(51, 51, 51);">所有钩子都提供额外的拦截器API</font>
    - <font style="color:rgb(51, 51, 51);">call:(...args) => void当你的钩子触发之前,(就是call()之前),就会触发这个函数,你可以访问钩子的参数.多个钩子执行一次</font>
    - <font style="color:rgb(51, 51, 51);">tap: (tap: Tap) => void 每个钩子执行之前(多个钩子执行多个),就会触发这个函数</font>
    - <font style="color:rgb(51, 51, 51);">register:(tap: Tap) => Tap | undefined 每添加一个Tap都会触发 你interceptor上的register,你下一个拦截器的register 函数得到的参数 取决于你上一个register返回的值,所以你最好返回一个 tap 钩子.</font>
+ <font style="color:rgb(51, 51, 51);">Context(上下文) 插件和拦截器都可以选择加入一个可选的 context对象, 这个可以被用于传递随意的值到队列中的插件和拦截器</font>

## <font style="color:rgb(51, 51, 51);">使用</font>
```javascript
// const {SyncHook} = require('tapable');
const { SyncHook } = require('../../tapable');

const syncHook = new SyncHook(["name", "age"]);
debugger
syncHook.intercept({
  register: (tapInfo) => {// 当你新注册一个回调函数的时候触发
    console.log(`拦截器1开始register`);
    return tapInfo;
  },
  tap: (tapInfo) => {// 每个回调函数都会触发一次
    console.log(`拦截器1开始tap`);
  },
  call: (name, age) => {// 每个call触发，所有的回调只会总共触发一次
    console.log(`拦截器1开始call`, name, age);
  }
});
syncHook.intercept({
  register: (tapInfo) => {// 当你新注册一个回调函数的时候触发
    console.log(`拦截器2开始register`);
    return tapInfo;
  },
  tap: (tapInfo) => {// 每个回调函数都会触发一次
    console.log(`拦截器2开始tap`);
  },
  call: (name, age) => {// 每个call触发，所有的回调只会总共触发一次
    console.log(`拦截器2开始call`, name, age);
  }
});


syncHook.tap({ name: '回调函数A' }, (name, age) => {
  console.log(`回调A`, name, age);
});

syncHook.tap({ name: '回调函数B' }, (name, age) => {
  console.log('回调B', name, age);
});
debugger
syncHook.call('interceptor', 10);

/**
拦截器1开始register
拦截器2开始register
拦截器1开始register
拦截器2开始register

拦截器1开始call interceptor 10
拦截器2开始call interceptor 10

拦截器1开始tap
拦截器2开始tap
回调A interceptor 10

拦截器1开始tap
拦截器2开始tap
回调B interceptor 10
*/
```

```javascript
(function anonymous(name, age) {
  var _x = this._x;
  var _taps = this.taps;

  var _interceptors = this.interceptors;
  _interceptors[0].call(name, age);
  _interceptors[1].call(name, age);

  var _tap0 = _taps[0];
  _interceptors[0].tap(_tap0);
  _interceptors[1].tap(_tap0);
  var _fn0 = _x[0];
  _fn0(name, age);

  var _tap1 = _taps[1];
  _interceptors[0].tap(_tap1);
  _interceptors[1].tap(_tap1);
  var _fn1 = _x[1];
  _fn1(name, age);
});
```

## <font style="color:rgb(51, 51, 51);">实现</font>
### <font style="color:rgb(51, 51, 51);">Hook.js</font>
```diff
/**
 * @file Hook.js
 * @description 钩子基类，所有钩子类型的父类，支持 tap 注册和动态编译执行。
 */

/**
 * 钩子基类
 */
class Hook {
  /**
   * 构造函数
   * @param {Array<string>} args 参数名数组
   */
  constructor(args) {
    if (!Array.isArray(args)) args = [];
    /**
     * 钩子的参数名列表
     * @type {Array<string>}
     */
    this.args = args;
    /**
     * 存储所有注册的 tap（钩子回调）
     * @type {Array<Object>}
     */
    this.taps = [];
    /**
     * call 方法，初始为代理函数
     * @type {Function}
     */
    this.call = CALL_DELEGATE;
    /**
     * callAsync 方法，初始为代理函数
     * @type {Function}
     */
    this.callAsync = CALL_ASYNC_DELEGATE;
    /**
     * promise 方法，初始为代理函数
     * @type {Function}
     */
    this.promise = PROMISE_DELEGATE;
+    /**
+     * 拦截器列表
+     * @type {Array<Object>}
+     */
+    this.interceptors = [];
+  }

  /**
   * 注册同步钩子
   * @param {string|Object} options tap 名称或配置对象
   * @param {Function} fn 回调函数
   */
  tap(options, fn) {
    this._tap("sync", options, fn);
  }

  /**
   * 注册异步钩子
   * @param {string|Object} options tap 名称或配置对象
   * @param {Function} fn 回调函数
   */
  tapAsync(options, fn) {
    this._tap("async", options, fn);
  }

  /**
   * 注册 promise 钩子
   * @param {string|Object} options tap 名称或配置对象
   * @param {Function} fn 回调函数
   */
  tapPromise(options, fn) {
    this._tap("promise", options, fn);
  }

  /**
   * 内部注册方法，支持不同类型（如 sync、async）
   * @param {string} type 类型
   * @param {string|Object} options tap 名称或配置对象
   * @param {Function} fn 回调函数
   */
  _tap(type, options, fn) {
    if (typeof options === 'string')
      options = { name: options };
    let tapInfo = { ...options, type, fn };
+    tapInfo = this._runRegisterInterceptors(tapInfo);
    this._insert(tapInfo);
  }
+  /**
+   * 运行 tap 注册拦截器
+   * @param {Object} tapInfo tap 信息
+   * @returns {Object} tap 信息
+   */
+  _runRegisterInterceptors(tapInfo) {
+    for (const interceptor of this.interceptors) {
+      if (interceptor.register) {
+        const newTapInfo = interceptor.register(tapInfo);
+        if (newTapInfo !== undefined) {
+          tapInfo = newTapInfo;
+        }
+      }
+    }
+    return tapInfo;
+  }

+  /**
+   * 拦截 tap 注册
+   * @param {Object} interceptor 拦截器对象
+   */
+  intercept(interceptor) {
+    this.interceptors.push(interceptor);
+  }

  /**
   * 重置编译，call 重新指向代理函数
   */
  _resetCompilation() {
    this.call = CALL_DELEGATE;
  }

  /**
   * 插入 tap，并重置编译
   * @param {Object} tapInfo
   */
  _insert(tapInfo) {
    this._resetCompilation();
    this.taps.push(tapInfo);
  }

  /**
   * 抽象方法，子类需重写
   * @param {Object} options
   */
  compile(options) {
    throw new Error("Abstract: should be overridden");
  }

  /**
   * 创建 call 方法，实际会调用 compile 生成最终执行函数
   * @param {string} type
   * @returns {Function}
   */
  _createCall(type) {
    return this.compile({
      taps: this.taps,
      args: this.args,
      type,
+      interceptors: this.interceptors
    });
  }
}

/**
 * call 的初始代理函数，首次调用时会编译生成真正的 call 方法
 * @param  {...any} args
 * @returns {any}
 */
const CALL_DELEGATE = function (...args) {
  this.call = this._createCall("sync");
  return this.call(...args);
};

/**
 * callAsync 的初始代理函数，首次调用时会编译生成真正的 callAsync 方法
 * @param  {...any} args
 * @returns {any}
 */
const CALL_ASYNC_DELEGATE = function (...args) {
  this.callAsync = this._createCall("async");
  return this.callAsync(...args);
};

/**
 * promise 的初始代理函数，首次调用时会编译生成真正的 promise 方法
 * @param  {...any} args
 * @returns {any}
 */
const PROMISE_DELEGATE = function (...args) {
  this.promise = this._createCall("promise");
  return this.promise(...args);
};
module.exports = Hook;
```

### <font style="color:rgb(51, 51, 51);">HookCodeFactory.js</font>
```diff
/**
 * @file HookCodeFactory.js
 * @description 钩子代码工厂，负责生成钩子的执行代码（如串行/并行等）。
 */

/**
 * 钩子代码工厂基类
 */
class HookCodeFactory {
  /**
   * 设置钩子实例，将所有 tap 的回调函数提取出来赋值给 _x
   * @param {Object} hookInstance
   * @param {Object} options
   */
  setup(hookInstance, options) {
    hookInstance._x = options.taps.map(item => item.fn);
  }

  /**
   * 初始化工厂，保存 options
   * @param {Object} options
   */
  init(options) {
    this.options = options;
  }

  /**
   * 反初始化，清空 options
   */
  deinit() {
    this.options = null;
  }

  /**
   * 生成参数字符串，可插入 before/after 参数
   * @param {Object} options
   * @returns {string}
   */
  args(options = {}) {
    let { before, after } = options;
    let allArgs = this.options.args || [];
    if (before) allArgs = [before, ...allArgs];
    if (after) allArgs = [...allArgs, after];
    if (allArgs.length > 0)
      return allArgs.join(', ');
    return "";
  }

  /**
   * 生成函数头部代码，定义 _x（所有 tap 回调的数组）
   * @returns {string}
   */
  header() {
    let code = "";
    code += "var _x = this._x;\n";
+    const { interceptors } = this.options;
+    if(interceptors.length  > 0) {
+      code += `var _taps = this.taps;\n`;
+      code += `var _interceptors = this.interceptors;\n`;
+    }
+    for  (let i = 0; i < interceptors.length; i++) {
+      const interceptor = interceptors[i];
+      code += `var _interceptor${i} = _interceptors[${i}];\n`;
+      if(interceptor.call) {
+        code += `_interceptor${i}.call(${this.args()});\n`;
+      }
+    }
    return code;
  }

  /**
   * 创建最终的钩子执行函数
   * @param {Object} options
   * @returns {Function}
   */
  create(options) {
    this.init(options);
    let fn;
    switch (this.options.type) {
      case 'sync':
        // 生成同步钩子的执行函数
        fn = new Function(
          this.args(),
          this.header() + this.content()
        )
        break;
      case 'async':
        // 生成异步钩子的执行函数
        fn = new Function(
          this.args({ after: '_callback' }),
          this.header() + this.content({ onDone: () => " _callback();\n" })
        )
        break;
      case 'promise':
        // 生成 promise 钩子的执行函数
        let tapsContent = this.content({ onDone: () => " _resolve();\n" });
        let content = `return new Promise(function (_resolve, _reject) {
          ${tapsContent}
        })`;
        fn = new Function(
          this.args(),
          this.header() + content
        );
        break;
      default:
        break;
    }
    this.deinit();
    return fn;
  }

  /**
   * 串行调用所有 tap，生成串行执行的代码
   * @returns {string}
   */
  callTapsSeries({ onDone } = {}) {
    if (this.options.taps.length === 0) {
      return onDone();
    }
    let code = "";
    let current = onDone;
    for (let j = this.options.taps.length - 1; j >= 0; j--) {
      let i = j;
      const unroll = (current !== onDone); // && (this.options.taps[i].type !== "sync" );
      if (unroll) {
        code += `function _next${i}() {\n`;
        code += current();
        code += `}\n`;
        current = () => `_next${i}();\n`;
      }
      const done = current;
      const content = this.callTap(i, { onDone: done });
      current = () => content;
    }
    code += current();
    return code;
  }

  /**
   * 并行调用所有 tap，生成并行执行的代码
   * @returns {string}
   */
  callTapsParallel({ onDone }) {
    let code = `var _counter = ${this.options.taps.length};\n`;
    code += `
      var _done = function () {
          if (--_counter === 0) ${onDone()};
      };
    `;
    for (let j = 0; j < this.options.taps.length; j++) {
      const content = this.callTap(j, { onDone: () => `_done();\n` });
      code += content;
    }
    return code;
  }

  /**
   * 生成调用单个 tap 的代码
   * @param {number} tapIndex
   * @returns {string}
   */
  callTap(tapIndex, { onDone } = {}) {
    let code = "";
+    const { interceptors } = this.options;
+    if(interceptors.length > 0) {
+      code += `var _tap${tapIndex} = _taps[${tapIndex}];\n`;
+      for (let i = 0; i < interceptors.length; i++) {
+        const interceptor = interceptors[i];
+        if(interceptor.tap) {
+          code += `_interceptor${i}.tap(_tap${tapIndex});\n`;
+        }
+      }
+    }
    code += `var _fn${tapIndex} = _x[${tapIndex}];\n`;
    let tap = this.options.taps[tapIndex];
    switch (tap.type) {
      case 'sync':
        // 生成同步调用代码
        code += `
          _fn${tapIndex}(${this.args()});
        `;
        if (onDone) {
          code += onDone();
        }
        break;
      case 'async':
        let cbCode = `(function() {\n`;
        if (onDone) cbCode += onDone();
        cbCode += `})`;
        code += `_fn${tapIndex}(${this.args({
          after: cbCode
        })});`;
        break;
      case 'promise':
        code += `
          var _promise${tapIndex} = _fn${tapIndex}(${this.args()});
          _promise${tapIndex}.then(
            function () {
              ${onDone()};
            }
          );
        `;
        break;
      default:
        break;
    }
    return code;
  }
}

module.exports = HookCodeFactory;
```

# <font style="color:rgb(51, 51, 51);">HookMap</font>
+ <font style="color:rgb(51, 51, 51);">A HookMap is a helper class for a Map with Hooks</font>

## <font style="color:rgb(51, 51, 51);">使用</font>
```javascript
// const { SyncHook, HookMap } = require('tapable');
const { SyncHook, HookMap } = require('../../tapable');

const keyedHookMap = new HookMap(() => new SyncHook(["name", "age"]));

keyedHookMap.for('key1').tap('plugin1', (name, age) => { console.log('plugin1', name, age); });
keyedHookMap.for('key1').tap('plugin2', (name, age) => { console.log('plugin2', name, age); });
keyedHookMap.for('key2').tap('plugin3', (name, age) => { console.log('plugin3', name, age); });

keyedHookMap.get('key1').call('HookMap', 18);
keyedHookMap.get('key2').call('HookMap', 28);

/*
  plugin1 HookMap 18
  plugin2 HookMap 18
  plugin3 HookMap 28
 */
```

## <font style="color:rgb(51, 51, 51);">实现</font>
### <font style="color:rgb(51, 51, 51);">index.js</font>
```diff
/**
 * @file index.js
 * @description tapable 入口文件，导出所有钩子类型。
 */

const SyncHook = require('./SyncHook');
const AsyncParallelHook = require('./AsyncParallelHook');
const AsyncSeriesHook = require('./AsyncSeriesHook');
+ const HookMap = require('./HookMap');

module.exports = {
  SyncHook, // 同步钩子
  AsyncParallelHook, // 异步并行钩子
  AsyncSeriesHook, // 异步串行钩子
+  HookMap, // 钩子映射
}
```

### <font style="color:rgb(51, 51, 51);">HookMap</font>
```javascript
/**
 * @file HookMap.js
 * @description 钩子映射类
 */

class HookMap {
  /**
   * 构造函数
   * @param {Function} factory - 钩子工厂函数
   */
  constructor(factory) {
    this._map = new Map();
    this._factory = factory;
  }

  /**
   * 获取或创建钩子
   * @param {*} key - 钩子的键
   * @returns {*} 钩子
   */
  for (key) {
    const hook = this.get(key);
    if (!hook) {
      const newHook = this._factory(key);
      this.set(key, newHook);
      return newHook;
    }
    return hook;
  }

  /**
   * 获取钩子
   * @param {*} key - 钩子的键
   * @returns {*} 钩子
   */
  get(key) {
    return this._map.get(key);
  }

  /**
   * 设置钩子
   * @param {*} key - 钩子的键
   * @param {*} value - 钩子
   */
  set(key, value) {
    this._map.set(key, value);
  }

  /**
   * 添加钩子
   * @param {*} key - 钩子的键
   * @param {*} options - 钩子的选项
   * @param {*} fn - 钩子的函数
   */
  tap(key, options, fn) {
    return this.for(key).tap(options, fn);
  }

  /**
   * 添加异步钩子
   * @param {*} key - 钩子的键
   * @param {*} options - 钩子的选项
   * @param {*} fn - 钩子的函数
   */
  tapAsync(key, options, fn) {
    return this.for(key).tapAsync(options, fn);
  }

  /**
   * 添加异步钩子
   * @param {*} key - 钩子的键
   * @param {*} options - 钩子的选项
   * @param {*} fn - 钩子的函数
   */
  tapPromise(key, options, fn) {
    return this.for(key).tapPromise(options, fn);
  }
}

module.exports = HookMap;
```

# <font style="color:rgb(51, 51, 51);">stage</font>
## <font style="color:rgb(51, 51, 51);">使用</font>
```javascript
const { SyncHook } = require('tapable');

const hook = new SyncHook(['name']);

debugger
hook.tap({ name: 'tap1', stage: 1 }, (name) => {
  console.log(1, name);
});
hook.tap({ name: 'tap3', stage: 3 }, (name) => {
  console.log(3, name);
});
hook.tap({ name: 'tap5', stage: 5 }, (name) => {
  console.log(5, name);
});
hook.tap({ name: 'tap2', stage: 2 }, (name) => {
  console.log(2, name);
});

hook.call('stage');

/**
 * 1 stage
 * 2 stage
 * 3 stage
 * 5 stage
 */
```

## <font style="color:rgb(51, 51, 51);">实现</font>
### <font style="color:rgb(51, 51, 51);">Hook.js</font>
```diff
/**
 * @file Hook.js
 * @description 钩子基类，所有钩子类型的父类，支持 tap 注册和动态编译执行。
 */

/**
 * 钩子基类
 */
class Hook {
  /**
   * 构造函数
   * @param {Array<string>} args 参数名数组
   */
  constructor(args) {
    if (!Array.isArray(args)) args = [];
    /**
     * 钩子的参数名列表
     * @type {Array<string>}
     */
    this.args = args;
    /**
     * 存储所有注册的 tap（钩子回调）
     * @type {Array<Object>}
     */
    this.taps = [];
    /**
     * call 方法，初始为代理函数
     * @type {Function}
     */
    this.call = CALL_DELEGATE;
    /**
     * callAsync 方法，初始为代理函数
     * @type {Function}
     */
    this.callAsync = CALL_ASYNC_DELEGATE;
    /**
     * promise 方法，初始为代理函数
     * @type {Function}
     */
    this.promise = PROMISE_DELEGATE;
    /**
     * 拦截器列表
     * @type {Array<Object>}
     */
    this.interceptors = [];
  }

  /**
   * 注册同步钩子
   * @param {string|Object} options tap 名称或配置对象
   * @param {Function} fn 回调函数
   */
  tap(options, fn) {
    this._tap("sync", options, fn);
  }

  /**
   * 注册异步钩子
   * @param {string|Object} options tap 名称或配置对象
   * @param {Function} fn 回调函数
   */
  tapAsync(options, fn) {
    this._tap("async", options, fn);
  }

  /**
   * 注册 promise 钩子
   * @param {string|Object} options tap 名称或配置对象
   * @param {Function} fn 回调函数
   */
  tapPromise(options, fn) {
    this._tap("promise", options, fn);
  }

  /**
   * 内部注册方法，支持不同类型（如 sync、async）
   * @param {string} type 类型
   * @param {string|Object} options tap 名称或配置对象
   * @param {Function} fn 回调函数
   */
  _tap(type, options, fn) {
    if (typeof options === 'string')
      options = { name: options };
    let tapInfo = { ...options, type, fn };
    tapInfo = this._runRegisterInterceptors(tapInfo);
    this._insert(tapInfo);
  }
  /**
   * 运行 tap 注册拦截器
   * @param {Object} tapInfo tap 信息
   * @returns {Object} tap 信息
   */
  _runRegisterInterceptors(tapInfo) {
    for (const interceptor of this.interceptors) {
      if (interceptor.register) {
        const newTapInfo = interceptor.register(tapInfo);
        if (newTapInfo !== undefined) {
          tapInfo = newTapInfo;
        }
      }
    }
    return tapInfo;
  }

  /**
   * 拦截 tap 注册
   * @param {Object} interceptor 拦截器对象
   */
  intercept(interceptor) {
    this.interceptors.push(interceptor);
  }

  /**
   * 重置编译，call 重新指向代理函数
   */
  _resetCompilation() {
    this.call = CALL_DELEGATE;
  }

  /**
   * 插入 tap，并重置编译
   * @param {Object} tapInfo
   */
  _insert(tapInfo) {
    this._resetCompilation();
+    let stage = 0;
+    if (typeof tapInfo.stage === "number") {
+      stage = tapInfo.stage;
+    }
+    let i = this.taps.length;
+
+    // 从后往前遍历，找到第一个 stage 小于当前 tap 的 stage 的位置，插入当前 tap
+    while (i > 0) {
+      i--;
+      const x = this.taps[i];
+      this.taps[i + 1] = x;
+      const xStage = x.stage || 0;
+      if (xStage > stage) {
+        continue;
+      }
+      i++;
+      break;
+    }
+    this.taps[i] = tapInfo;
  }

  /**
   * 抽象方法，子类需重写
   * @param {Object} options
   */
  compile(options) {
    throw new Error("Abstract: should be overridden");
  }

  /**
   * 创建 call 方法，实际会调用 compile 生成最终执行函数
   * @param {string} type
   * @returns {Function}
   */
  _createCall(type) {
    return this.compile({
      taps: this.taps,
      args: this.args,
      type,
      interceptors: this.interceptors
    });
  }
}

/**
 * call 的初始代理函数，首次调用时会编译生成真正的 call 方法
 * @param  {...any} args
 * @returns {any}
 */
const CALL_DELEGATE = function (...args) {
  this.call = this._createCall("sync");
  return this.call(...args);
};

/**
 * callAsync 的初始代理函数，首次调用时会编译生成真正的 callAsync 方法
 * @param  {...any} args
 * @returns {any}
 */
const CALL_ASYNC_DELEGATE = function (...args) {
  this.callAsync = this._createCall("async");
  return this.callAsync(...args);
};

/**
 * promise 的初始代理函数，首次调用时会编译生成真正的 promise 方法
 * @param  {...any} args
 * @returns {any}
 */
const PROMISE_DELEGATE = function (...args) {
  this.promise = this._createCall("promise");
  return this.promise(...args);
};
module.exports = Hook;+
```

# <font style="color:rgb(51, 51, 51);">before</font>
## <font style="color:rgb(51, 51, 51);">使用</font>
```javascript
// const {SyncHook} = require('tapable');
const { SyncHook } = requi re('../../tapable');

let hook = new SyncHook(['name']);

debugger
hook.tap({ name: 'tap1' }, (name) => {
  console.log(1, name);
});
hook.tap({ name: 'tap3' }, (name) => {
  console.log(3, name);
});
hook.tap({ name: 'tap5' }, (name) => {
  console.log(5, name);
});
hook.tap({ name: 'tap2', before: ['tap3', 'tap5'] }, (name) => {
  console.log(2, name);
});

hook.call('before');

/**
 * 1 before
 * 2 before
 * 3 before
 * 5 before
 */
```

## <font style="color:rgb(51, 51, 51);">实现</font>
### <font style="color:rgb(51, 51, 51);">Hook.js</font>
```diff
/**
 * @file Hook.js
 * @description 钩子基类，所有钩子类型的父类，支持 tap 注册和动态编译执行。
 */

/**
 * 钩子基类
 */
class Hook {
  /**
   * 构造函数
   * @param {Array<string>} args 参数名数组
   */
  constructor(args) {
    if (!Array.isArray(args)) args = [];
    /**
     * 钩子的参数名列表
     * @type {Array<string>}
     */
    this.args = args;
    /**
     * 存储所有注册的 tap（钩子回调）
     * @type {Array<Object>}
     */
    this.taps = [];
    /**
     * call 方法，初始为代理函数
     * @type {Function}
     */
    this.call = CALL_DELEGATE;
    /**
     * callAsync 方法，初始为代理函数
     * @type {Function}
     */
    this.callAsync = CALL_ASYNC_DELEGATE;
    /**
     * promise 方法，初始为代理函数
     * @type {Function}
     */
    this.promise = PROMISE_DELEGATE;
    /**
     * 拦截器列表
     * @type {Array<Object>}
     */
    this.interceptors = [];
  }

  /**
   * 注册同步钩子
   * @param {string|Object} options tap 名称或配置对象
   * @param {Function} fn 回调函数
   */
  tap(options, fn) {
    this._tap("sync", options, fn);
  }

  /**
   * 注册异步钩子
   * @param {string|Object} options tap 名称或配置对象
   * @param {Function} fn 回调函数
   */
  tapAsync(options, fn) {
    this._tap("async", options, fn);
  }

  /**
   * 注册 promise 钩子
   * @param {string|Object} options tap 名称或配置对象
   * @param {Function} fn 回调函数
   */
  tapPromise(options, fn) {
    this._tap("promise", options, fn);
  }

  /**
   * 内部注册方法，支持不同类型（如 sync、async）
   * @param {string} type 类型
   * @param {string|Object} options tap 名称或配置对象
   * @param {Function} fn 回调函数
   */
  _tap(type, options, fn) {
    if (typeof options === 'string')
      options = { name: options };
    let tapInfo = { ...options, type, fn };
    tapInfo = this._runRegisterInterceptors(tapInfo);
    this._insert(tapInfo);
  }
  /**
   * 运行 tap 注册拦截器
   * @param {Object} tapInfo tap 信息
   * @returns {Object} tap 信息
   */
  _runRegisterInterceptors(tapInfo) {
    for (const interceptor of this.interceptors) {
      if (interceptor.register) {
        const newTapInfo = interceptor.register(tapInfo);
        if (newTapInfo !== undefined) {
          tapInfo = newTapInfo;
        }
      }
    }
    return tapInfo;
  }

  /**
   * 拦截 tap 注册
   * @param {Object} interceptor 拦截器对象
   */
  intercept(interceptor) {
    this.interceptors.push(interceptor);
  }

  /**
   * 重置编译，call 重新指向代理函数
   */
  _resetCompilation() {
    this.call = CALL_DELEGATE;
  }

  /**
   * 插入 tap，并重置编译
   * @param {Object} tapInfo
   */
  _insert(tapInfo) {
    this._resetCompilation();

+    // before
+    let before;
+    if (typeof tapInfo.before === "string") {
+      before = new Set([tapInfo.before]);
+    } else if (Array.isArray(tapInfo.before)) {
+      before = new Set(tapInfo.before);
+    }

    // stage
    let stage = 0;
    if (typeof tapInfo.stage === "number") {
      stage = tapInfo.stage;
    }
    let i = this.taps.length;

    // 从后往前遍历，找到第一个 stage 小于当前 tap 的 stage 的位置，插入当前 tap
    while (i > 0) {
      i--;
      const x = this.taps[i];
      this.taps[i + 1] = x;
      const xStage = x.stage || 0;

+      // 找到第一个 stage 小于当前 tap 的 stage 的位置
+      if (before) {
+        if (before.has(x.name)) {
+          before.delete(x.name);
+          continue;
+        }
+        if (before.size > 0) {
+          continue;
+        }
      }

      if (xStage > stage) {
        continue;
      }
      i++;
      break;
    }
    this.taps[i] = tapInfo;
  }

  /**
   * 抽象方法，子类需重写
   * @param {Object} options
   */
  compile(options) {
    throw new Error("Abstract: should be overridden");
  }

  /**
   * 创建 call 方法，实际会调用 compile 生成最终执行函数
   * @param {string} type
   * @returns {Function}
   */
  _createCall(type) {
    return this.compile({
      taps: this.taps,
      args: this.args,
      type,
      interceptors: this.interceptors
    });
  }
}

/**
 * call 的初始代理函数，首次调用时会编译生成真正的 call 方法
 * @param  {...any} args
 * @returns {any}
 */
const CALL_DELEGATE = function (...args) {
  this.call = this._createCall("sync");
  return this.call(...args);
};

/**
 * callAsync 的初始代理函数，首次调用时会编译生成真正的 callAsync 方法
 * @param  {...any} args
 * @returns {any}
 */
const CALL_ASYNC_DELEGATE = function (...args) {
  this.callAsync = this._createCall("async");
  return this.callAsync(...args);
};

/**
 * promise 的初始代理函数，首次调用时会编译生成真正的 promise 方法
 * @param  {...any} args
 * @returns {any}
 */
const PROMISE_DELEGATE = function (...args) {
  this.promise = this._createCall("promise");
  return this.promise(...args);
};
module.exports = Hook;
```

# 源码
[GitHub - lotosv2010/g-webpack: webpack 简版源码以及 loader 和 plugin](https://github.com/lotosv2010/g-webpack)

# 参考
[tapable](https://www.npmjs.com/package/tapable)

