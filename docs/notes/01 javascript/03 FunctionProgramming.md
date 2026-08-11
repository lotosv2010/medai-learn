# 一、函数式编程
## 为什么要学习函数式编程
+ 函数式编程是随着 React 的流行收到越来越多的关注
+ Vue3 也开始拥抱函数式编程
+ 函数式编程可以抛弃 this
+ 打包过程中可以更好的利用 tree shaking 过滤无用代码
+ 方便测试、方便并行处理
+ 有很多库可以帮助我们进行函数式开发：lodash、underscore、ramda

## 函数式编程的概念
函数式编程(Function Programming，FP)，FP是编程范式之一，我们常听说的编程范式还有面向过程编程、面向对象编程

    - 面向对象编程的思维方式：把现实世界中的事物抽象成程序世界中的类和对象，通过封装、继承和多态来演示事物事件的联系
    - 函数式编程的思维方式：把现实世界的事物和事物之间的联系抽象到程序世界(对运算过程进行抽象)
        * 程序的本质：根据输入通过某种运算获得相应的输出，程序开发过程中会涉及很多有输入和输出的函数
        * x -> f(联系、映射) -> y，y = f(x)
        * **<font style="color:#E8323C;">函数式编程中的函数指的不是程序中的函数(方法)</font>**，而是数学中的函数鸡映射关系，例如：y = sin(x)，x和y的关系
        * **<font style="color:#E8323C;">相同的输入始终要得到相同的输出(纯函数)</font>**
        * 函数式编程来描述数据(函数)之间的映射

```javascript
// 非函数式
const num1 = 2;
const num2 = 3;

const sum = num1 + num2;
console.log(sum);

// 函数式
function add(n1, n2) {
  return n1 + n2;
}
const sum = add(2, 3);
console.log(sum);
```

## <font style="color:rgb(51, 51, 51);">函数式编程优势</font>
+ <font style="color:rgb(51, 51, 51);">更少的时间</font>
+ <font style="color:rgb(51, 51, 51);">更少的BUG</font>
+ <font style="color:rgb(51, 51, 51);">更好的测试性</font>
+ <font style="color:rgb(51, 51, 51);">更方便调试</font>
+ <font style="color:rgb(51, 51, 51);">适合并发执行</font>
+ <font style="color:rgb(51, 51, 51);">更高的复用性</font>
+ <font style="color:rgb(51, 51, 51);">支持tree-shaking</font>
+ <font style="color:rgb(51, 51, 51);">React和Vue3大量使用函数式编程</font>

# 二、函数
## 函数是一等公民
+ [头等函数 - MDN Web 文档术语表：Web 相关术语的定义 | MDN](https://developer.mozilla.org/zh-CN/docs/Glossary/First-class_Function)
+ 在 JavaScript 中函数就是一个普通的对象(可以通过 `new Function()`)，我们可以把函数存储到变量或数组中，他可以作为另一个函数的参数和返回值，甚至我们可以在程序运行的时候通过 `new  Function('alert(1)')`来构造一个新函数
+ 把函数赋值给变量

```javascript
//1.函数可以赋值给变量
let add1 = add;

//2.函数可以作为参数
function exec(fn,a,b){
	fn(a,b);
}

//3.函数可以作为返回值
function exec(fn){
	return function(a,b){
		return fn(a,b);
	}
}
```

+ 函数是一等公民是学习高阶函数、柯里化等的基础

## 高阶函数
### 什么是高阶函数
+ 高阶函数
    -  Higher-order function
    - **<font style="color:#DF2A3F;">可以把函数作为参数传递给另一个函数</font>**
    - **<font style="color:#DF2A3F;">可以把函数作为另一个函数的返回结果</font>**

#### 函数作为参数
```javascript
// forEach
function forEach(array, fn) {
  for(let i = 0; i < array.length; i++) {
    fn(array[i], i);
  }
}
const arr = [1, 2, 4, 7, 8];
const fn = (item, i) => console.log(item, i);
forEach(arr, fn);

// filter
function filter(array, fn) {
  const result = [];
  for(let i = 0; i < array.length; i++) {
    const item = array[i];
    if(fn(item, i)) {
      result.push(item);
    }
  }
  return result;
}
const arr = [1, 2, 4, 7, 8];
const fn = (item, i) => item > 2;
const result = filter(arr, fn);
console.log(result);
```

#### 函数作为返回值
```javascript
function makeFn() {
  const msg = 'Hello Function';
  return function() {
    console.log(msg);
  }
}
makeFn()();

// once
function once(fn) {
  let done = false;
  return function() {
    if(!done) {
      done = true;
      return fn.apply(this, arguments);
    }
  }
}

const pay = (money) => console.log(`pay ${money} RMB`);
const oncePay = once(pay);
oncePay(4); // pay 4 RMB
oncePay(5);
oncePay(6);
```

### 高阶函数的意义
+ 抽象可以帮我们屏蔽细节，只需要关注与我们的目标
+ 高阶函数是用来抽象通用的问题

```javascript
// 面向过程的方式
const  array = [1, 2, 3, 4];
for(let i = 0; i < array.length; i++) {
  console.log(array[i]);
}
// 高阶函数
const  array = [1, 2, 3, 4];
forEach(array, item => console.log(item));

const r = filter(array, item => item % 2 === 0);
```

### 常用的高阶函数
+ forEach
+ filter
+ map
+ every
+ some
+ find/findIndex
+ reduce
+ sort

```javascript
// map
function map(array, fn) {
  const result = [];
  for(let i = 0; i < array.length; i++) {
    result.push(fn(array[i], i));
  }
  return result;
}
const arr = [1, 2, 4, 7, 8];
const r = map(arr, (item) => item * 2);
console.log(r);

// every
function every(array, fn) {
  for(let i = 0; i < array.length; i++) {
    if(!fn(array[i], i)) return false;
  }
  return true;
}
const arr = [1, 2, 4, 7, 8];
const r = every(arr, (item) => item > 2);
console.log(r);

// some
function some(array, fn) {
  for(let i = 0; i < array.length; i++) {
    if(fn(array[i], i)) return true;
  }
  return false;
}
const arr = [1, 2, 4, 7, 8];
const r = some(arr, (item) => item < 9);
console.log(r);

// find
function find(array, fn) {
  for(let i = 0; i < array.length; i++) {
    if(fn(array[i], i)) return array[i];
  }
  return undefined;
}
const arr = [1, 2, 4, 7, 8];
const r = find(arr, (item) => item === 2);
console.log(r);

// findIndex
function findIndex(array, fn) {
  for(let i = 0; i < array.length; i++) {
    if(fn(array[i], i)) return i;
  }
  return -1;
}
const arr = [1, 2, 4, 7, 8];
const r = findIndex(arr, (item) => item === 2);
console.log(r);

// reduce
// sort
```

## 闭包
### 概念
+ 闭包(Closure)：函数和其周围的状态(词法环境)的引用捆绑在一起形成闭包
    - 可以在另一个作用域中调用一个函数的内部函数并访问到该函数的作用域中的成员

```javascript
// 函数作为返回值
function makeFn() {
  const msg = 'Hello Function';
  return function() {
    console.log(msg);
  }
}
makeFn()();

// once
function once(fn) {
  let done = false;
  return function() {
    if(!done) {
      done = true;
      return fn.apply(this, arguments);
    }
  }
}

const pay = (money) => console.log(`pay ${money} RMB`);
const oncePay = once(pay);
oncePay(4); // pay 4 RMB
oncePay(5);
oncePay(6);
```

+ 闭包的本质：函数在执行的时候会放到一个执行栈上当函数执行完毕之后会从执行栈上移除，**<font style="color:#E8323C;">但是堆上的作用域成员因为被外部引用不能释放</font>**，因此内部函数依然可以访问外部函数的成员

### 案例
```javascript
// TODO: 闭包(Closure)
// 案例一
export function makePower(power) {
  return function(number) {
    return Math.pow(number, power);
  }
}

// 案例二
export function makeSalary(base) {
  return function(performance) {
    return base + performance;
  }
}
```

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Closure</title>
</head>
<body>
  <script type="module">
    import { makePower, makeSalary } from './index.js';
    // 案例一
    console.log(makePower(2)(2));
    console.log(makePower(3)(2));

    // 案例二
    const level1 = makeSalary(10000);
    const level2 = makeSalary(15000);
    console.log(level1(1000));
    console.log(level2(3000));
    console.log(level2(4000));
  </script>
</body>
</html>
```

# 三、函数式编程基础
## 纯函数
### 概念
+ 纯函数(pure function)：**<font style="color:#E8323C;">相同的输入永远会得到相同的输出</font>**，而且没有任何可观察的副作用
    - 纯函数就类似数学中的函数(用来描述输入和输出之间的关系)，y = f(x)

<!-- 这是一张图片，ocr 内容为：345 1 23 6 4 -->
![](https://cdn.nlark.com/yuque/0/2022/png/738210/1651803701146-cc817053-92eb-4e5b-98a0-c0198d29d5b8.png)

+ lodash是一个纯函数的功能库，提供了对数组、数字、对象、字符串、函数等操作的一些方法
    - 数组的 slice 和 splice 分别是：纯函数和不纯的函数
        * slice 返回数组中的指定部分，不会改变原数组
        * splice 对数组进行操作返回该数组，会改变原数组

```javascript
const array = [1, 2, 3, 4, 5];
// 纯函数
console.log(array.slice(0, 3));
console.log(array.slice(0, 3));
console.log(array.slice(0, 3));

// 纯的函数
console.log(array.splice(0, 3));
console.log(array.splice(0, 3));
console.log(array.splice(0, 3));
```

+ 函数式编程不会保留计算中间的结果，所以变量是不可变的(无状态)
+ 我们可以把一个函数的执行结果交给另一个函数去处理

### 纯函数的代表Lodash
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lodash</title>
</head>
<body>
  <script src="https://cdn.bootcss.com/lodash.js/4.17.21/lodash.js"></script>
  <script>
    const array = ['jack', 'tom', 'lucy', 'kate'];
    // first
    console.log(_.first(array));
    // last
    console.log(_.last(array));
    // toUpper
    console.log(_.toUpper(array[0]));
    // reverse -> 不纯的函数
    console.log(_.reverse(array));
    // each
    _.each(array, item => console.log(item))
    // includes
    console.log(_.includes(array, 'jack'));
    // find
    console.log(_.find(array, item => item === 'jack'));
    // findIndex
    console.log(_.findIndex(array, item => item === 'jack'));
  </script>
</body>
</html>
```

### 纯函数的好处
+ 可缓存
    - 因为纯函数对相同的输入始终有相同的结果，所以可以把纯函数的结果缓存起来

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lodash</title>
</head>
<body>
  <script src="https://cdn.bootcss.com/lodash.js/4.17.21/lodash.js"></script>
  <script>
    // memoize
    function getArea(r) {
      console.log(`r = ${r}`);
      return Math.PI * r * r;
    }
    const getAreaWithMemory = _.memoize(getArea);
    console.log(getAreaWithMemory(4));
    console.log(getAreaWithMemory(4));

    // 模拟 memoize 方法的实现
    function memoize(fn) {
      const cache = {};
      return function () {
        const key = JSON.stringify(arguments);
        cache[key] = cache[key] ?? fn.apply(fn, arguments);
        return cache[key];
      }
    }
    const getAreaWithMemory2 = memoize(getArea);
    console.log(getAreaWithMemory2(5));
    console.log(getAreaWithMemory2(5));
  </script>
</body>
</html>
```

+ 可测试
    - 纯函数让测试更方便
+ 并行处理
    - 在多线程环境下并行操作共享的内存数据很可能会出现意外情况
    - 纯函数不需要访问共享内存数据，所以在并行环境下可以任意运行纯函数(Web Worker)

### 副作用
+ 纯函数：对于相同输入永远会得到相同输出，而且没有任何可观察的**<font style="color:#E8323C;">副作用</font>**

```javascript
// 不纯的
const mini = 18;
function checkAge(age) {
  return age >= mini;
}

// 纯的(有硬编码，后续可以通过柯里化解决)
function checkAge(age) {
  const mini = 18;
  return age >= mini;
}
```

+ 副作用让一个函数变得不纯(如上例)，纯函数的根据相同的输入返回相同的输出，如果函数依赖于外部的状态就无法保证输出相同，就会带来副作用
+ 副作用来源
    - 配置文件
    - 数据库
    - 获取用户的输入
    - ......
+ 所有的外部交互都有可能带来副作用，副作用也使得方法通用性下降不适合扩展和可重用性，同时副作用会给程序中带来安全隐患给程序带来不确定性，但是副作用不可能完全禁止，尽可能控制它们在可控范围内发生

## 柯里化
+ 柯里化(Haskell Brooks Curry)
+ 使用柯里化解决上一个方案中硬编码的问题

```javascript
// 纯的(有硬编码，后续可以通过柯里化解决)
function checkAge(age) {
  const mini = 18;
  return age >= mini;
}

// 普通纯函数
function checkAge(min, age) {
  return age >= min;
}

// 柯里化
function checkAge(min) {
  return function(age) {
    return age >= min;
  }
}

// ES6 写法
const checkAge = min => age => age >= min;
```

### 概念(Currying)
+ 当一个函数有多个参数的时候先传递一部分参数调用它(这部分参数以后永远不变)
+ 然后返回一个新的函数接受剩余的参数，返回结果

### Lodash中的柯里化函数
+ _.curry(func)
    - 功能：创建一个函数，该函数接受一个或者多个func的参数，如果func所需要的参数都被提供则执行func并返回执行的结果，否则继续返回该函数并等待接受剩余的参数
    - 参数：需要柯里化的函数
    - 返回值：柯里化后的函数

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lodash</title>
</head>
<body>
  <script src="https://cdn.bootcss.com/lodash.js/4.17.21/lodash.js"></script>
  <script>
    // curry
    
    // 需要柯里化的函数
    function getSum(a, b, c) {
      return a + b + c;
    }
    
    // 柯里化
    const curried = _.curry(getSum);
    
    // 测试
    console.log(curried(1, 2, 3));
    console.log(curried(1, 2)(3));
    console.log(curried(1)(2)(3));
  </script>
</body>
</html>
```

### 柯里化案例
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lodash</title>
</head>
<body>
  <script src="https://cdn.bootcss.com/lodash.js/4.17.21/lodash.js"></script>
  <script>
    // curry
    const match = _.curry((reg, str) => {
      return str.match(reg);
    });
    const haveSpace = match(/\s+/g);
    const haveNumber = match(/\d+/g);
    
    console.log(haveSpace('hello world'));
    console.log(haveNumber('abc'));

    const filter = _.curry((func, array) => {
      return array.filter(func);
    });
    const findSpace = filter(haveSpace);
    
    console.log(findSpace(['john conner', 'john_Donne']));
  </script>
</body>
</html>
```

### 柯里化原理
```javascript
// 递归
function curry(func) {
  return function curriedFn(...args) {
    if(args.length >= func.length) return func(...args);
    return function() {
      return curriedFn(...args.concat(Array.from(arguments)));
    }
  }
}

const curried = curry((a, b, c) => a + b +c);

curried(1, 3, 2);
curried(1, 3)(2);
curried(1)(3)(2);
```

### 总结
+ 柯里化可以让我们给一函数传递较少的参数得到一个已经记住了某些固定参数的新函数
+ 这是一种对函数参数的缓存
+ 让函数变得更灵活，让函数的颗粒度更小
+ 可以把多元函数转换成一元函数，可以组合使用函数产生强大的功能

## 函数组合
+ 纯函数和柯里化很容易写出洋葱代码 h(g(f(x)))
    - 获取数组的最后一个元素再转换成大写字母，`_.toUpper(_.first(_.reverse(array)))`

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2022/png/738210/1651825818166-e4c9037a-7500-41c5-a499-618d241e21ef.png)

+ 函数组合可以让我们把细粒度的函数重新组合成一个新的函数

### 管道
+ 下面这张图表示程序中使用函数处理数据的过程，给fn函数输入参数a，返回结果 b，可以想想a数据通过一个管道得到了b数据

<!-- 这是一张图片，ocr 内容为：A FN -->
![](https://cdn.nlark.com/yuque/0/2022/png/738210/1651826008767-100f3945-dbb0-4a6b-979f-e77ce432c5cb.png)

+ 当fn函数比较复杂的时候，我们可以把函数fn拆分成多个小函数，此时多了中间运算过程产生的 m 和 n
+ 下面这张图中可以想象成把fn这个管道拆分成3个管道f1，f2，f3，数据a通过管道f3得到结果m，m再通过管道f2得到结果n，n通过管道f1得到最终的结果b

<!-- 这是一张图片，ocr 内容为：FN B F1 -->
![](https://cdn.nlark.com/yuque/0/2022/png/738210/1651826308949-831c1470-be63-4dd5-9955-c5d7f5284571.png)

```javascript
fn = compose(f1, f2, f3);
b = fn(a);
```

### 概念
+ 函数组合(Compose)：如果一个函数要经过多个函数处理才能得到最终值，这个时候可以把中间过程的函数合并成一个函数
    - 函数就像是数据的通道，函数组合就是把这些管道连接起来，让数据穿过多个管道形成最终结果
    - **<font style="color:#E8323C;">函数组合默认是从右到左执行</font>**

```javascript
// TODO: Compose
export function compose(f, g) {
  return function(value) {
    return f(g(value))
  }
}
```

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compose</title>
</head>
<body>
  <script type="module">
    import { compose } from './index.js';

    function reverse(array) {
      return array.reverse();
    }

    function first(array) {
      return array[0];
    }

    const composed = compose(first, reverse);
    const array = [1, 2, 3, 4, 5];
    console.log(composed(array));
  </script>
</body>
</html>
```

### Lodash中的组合函数
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compose</title>
</head>
<body>
  <script src="https://cdn.bootcss.com/lodash.js/4.17.21/lodash.js"></script>
  <script>
    function reverse(array) {
      return array.reverse();
    }

    function first(array) {
      return array[0];
    }

    // lodash
    const flowed = _.flowRight(first, reverse);
    const array = [1, 2, 3, 4, 5];
    console.log(flowed(array));

  </script>
</body>
</html>
```

### 组合函数原理
```javascript
// 基本实现
function compose(...args) {
  return function(value) {
    return args.reverse().reduce((pre, fn) => {
      return fn(pre);
    }, value);
  }
}

// 优化
const compose = (...args) => value => args.reverse().reduce((pre, fn) => fn(pre), value);

// 测试
function reverse(array) {
  return array.reverse();
}

function first(array) {
  return array[0];
}

function toUpper(str) {
  return str.toLocaleUpperCase();
}

// lodash
const composed = compose(toUpper, first, reverse);
const array = ['hello', 'world', 'welcome', '2', 'front end'];
console.log(composed(array));
```

### 结合律
+ 函数组合要满足结合律(associativity)
    - 我们可以把 g 和 h 组合，还可以把 f 和 g 组合，结果都是一样的

```javascript
const fn = compose(f, g, h);
const associative = compose(compose(f,g), h) == compose(f, compose(g, h)); // true
```

### 调试
```javascript
// curry
function curry(func) {
  return function curriedFn(...args) {
    if(args.length >= func.length) return func(...args);
    return function() {
      return curriedFn(...args.concat(Array.from(arguments)));
    }
  }
}

// compose
const compose = (...args) => value => args.reverse().reduce((pre, fn) => fn(pre), value);

// log
const trace = curry((tag, v) => {
  console.log(tag, v);
  return v;
});

// 测试
const split = curry((sep, str) => str.split(sep));
const join = curry((sep, array) => array.join(sep));
const map = curry((fn, array) => array.map(fn));

const composed = compose(join('-'), trace('map before') ,map((v) => v.toUpperCase()), trace('map after'), split(' '));

const str = 'nerver say die';
console.log(composed(str));
```

## Lodash-fp
+ [lodash/fp](https://github.com/lodash/lodash/tree/4.17.15-npm/fp)
+ lodash 的 fp 模块提供了实用的对 **<font style="color:#E8323C;">函数式编程友好</font>** 的方法
+ 提供了不可变auto-curried（已经被柯里化） iteratee-first（函数优先） data-last（数据滞后）的方法

```javascript
const _  = require('lodash');
const fp = require('lodash/fp');

// TODO: lodash 模块
const array = ['a', 'b', 'c'];
const str = 'Hello world';
console.log(_.map(array, _.toUpper));
console.log(_.map(array));
console.log(_.split(str, ' '));

// TODO: lodash/fp 模块
console.log(fp.map(fp.toUpper, array));
console.log(fp.map(fp.toUpper)(array));
console.log(fp.split(' ', str));
console.log(fp.split(' ')(str));
```

## Pointfree
### 概念
+ PointFree：我们可以把数据处理的过程定义成与数据无关的合成运算，不需要用到代表数据的那个参数，只要把简单的运算步骤合成到一起，在使用这种模式之前我们需要定义一些辅助的基本运算函数
    - 不需要指明处理的数据
    - **<font style="color:#E8323C;">只需要合成运算过程</font>**
    - 需要定义一些辅助的基本运算函数

```javascript
// 非 Point Free 模式
// Hello World => hello_world
function f1(word) {
  return word.toLowerCase().replace(/\s+/g, '_');
}
console.log(f1('Hello World'))

// Point Free 模式
const fp = require('lodash/fp');
const f2 = fp.flowRight(fp.replace(/\s+/g, '_'), fp.toLower);
console.log(f2('Hello World'))
```

### 案例
```javascript
// 把一个字符串中的首字母提取并转换成大写字母，使用 . 作为分隔符
// world wild web => W. W. W
// const firstLetterToUpper = fp.flowRight(fp.join('. '), fp.map(v => fp.first(v)), fp.map(v => fp.upperFirst(v)), fp.split(' '));
const firstLetterToUpper = fp.flowRight(
  fp.join('. '),
  fp.map(v => fp.flowRight(fp.first, fp.upperFirst)(v)),
  fp.split(' ')
);
console.log(firstLetterToUpper('world wild web'));
```

# 四、函子
## Functor
### 为什么要学函子
+ 到目前为止已经学习了函数式编程的一些基础，但是我们还没有演示在函数式编程中如何把副作用控制在可控的范围内、异常处理、异步操作等

### 什么是Functor
+ 容器：包含值和值的变形关系(这个变形关系就是函数)
+ 函子：是一个特殊的容器，通过一个普通对象来实现，该对象具有 map 方法，map 方法可以运行一个函数对值进行处理(变形关系)

### 案例
```javascript
// Functor(函子)
class Container {
  constructor(value) {
    this._value = value;
  }
  map(fn) {
    return new Container(fn(this._value));
  }
}

const r = new Container(5)
  .map(x => x + 1)
  .map(x => x * x);
console.log(r);

// 优化
class Container {
  static of(value) {
    return new Container(value);
  }
  constructor(value) {
    this._value = value;
  }
  map(fn) {
    return Container.of(fn(this._value));
  }
}

const r = Container.of(5)
  .map(x => x + 1)
  .map(x => x * x);
console.log(r);
```

### 总结
+ 函数式编程的运算不直接操作值，而是有函子完成
+ 函子就是一个实现了map契约的对象
+ 我们可以把函子想象成一个盒子，这个盒子里封装了一个值
+ 想要处理盒子中值，我们需要给盒子的map方法传递一个处理值的函数(纯函数)，由这个函数来对值进行处理
+ 最终map方法返回一个包含新值的盒子(函子)

## MayBe函子
+ 我们在编程的过程中可能会遇到很多错误，需要对这些错误做相应的处理
+ MayBe 函子的作用就是可以对外部的空值情况做处理(控制副作用在允许的范围)

```javascript
class MayBe {
  static of(value) {
    return new MayBe(value);
  }
  constructor(value) {
    this._value = value;
  }
  // 如果对空值变形的话直接返回，值为 null 的函子
  map(fn) {
    return this.isNothing() ? MayBe.of(null) : MayBe.of(fn(this._value));
  }
  isNothing() {
    return this._value === null || this._value === undefined;
  }
}

// 传入具体值
const m1 = MayBe.of('Hello World')
  .map(x => x.toUpperCase())
  .map(x => null)
  .map(x => x.split(x));
console.log(m1);

// 传入null的情况
const m2 = MayBe.of(null)
  .map(x => x.toUpperCase());
  console.log(m2);
```

## Either函子
+ Either 两者中的任何一个，类似 if ... else... 的处理
+ 异常会让函数变的不纯，Either 函子可以用来处理异常

```javascript
// Either functor
class Either {
  constructor(left, right) {
    this._left = left;
    this._right = right;
  }

  static of(left, right) {
    return new Either(left, right);
  }

  map(f) {
    return this._right === null
      ? Either.of(f(this._left), this._right)
      : Either.of(this._left, f(this._right));
  }
  get value() {
    return this._right === null
      ? this._left
      : this._right;
  }
}

const response = {
  name: 'test',
  age: 20
}

const r = Either.of(10, response.age)
  .map(x => `年龄: ${x}`)
  .value
console.log(r)

const r2 = Either.of(10, null)
  .map(x => `年龄: ${x}`)
  .value
console.log(r2)


const parseJson = (str) => {
  try {
    return Either.of(null, JSON.parse(str))
  } catch (error) {
    return Either.of({ error: error.message }, null);
  }
}

const r3 = parseJson('{ "name": "test" }')
  .map(x => x.name)
  .value
console.log(r3);

const r4 = parseJson('{ name: "test" }')
  .map(x => x.error)
  .value
console.log(r4);
```

## IO函子
+ <font style="color:rgb(51, 51, 51);">副作用就是程序和外部世界的交互，比如读取文件或调用接口</font>
+ <font style="color:rgb(51, 51, 51);">由于外部世界不可控，包含副作用的逻辑往往不要预测</font>
+ <font style="color:rgb(51, 51, 51);">函数式编程提倡把副作用分离出来，让没有副作用的纯逻辑们放在一起远离包含副作用的逻辑，这时就需要</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">IO Monad</font>`
+ <font style="color:rgb(51, 51, 51);">IO 就是 Input/Output，副作用无非是对外部世界的 Input(读)和 Output(写)</font>
+ <font style="color:rgb(51, 51, 51);">IO 函子通过推迟执行的方式来实现对副作用的管理和隔离</font>

```javascript
function compose(...fns) {
  return (value) => fns.reduceRight((acc, fn) => fn(acc), value)
}

const localStorage ={
  getItem(key) {
    if(key === 'data') {
      return `{"code": 0, "userId": "1"}`
    } else if(key === '1') {
      return `{"id": 1, "name": "test", "age": 18}`
    }
  }
}

class IO {
  constructor(value) {
    this._value = value
  }
  static of(value) {
    return new IO(value)
  }
  map(fn) {
    return IO.of(compose(fn, this._value))
  }
  flatMap(fn) {
    // flatMap 的作用是把 IO 的值取出来，然后执行函数，再把结果再组合成 IO
    return IO.of(compose(x => x._value(), fn, this._value))
  }
  start(cb) { // 延迟执行
    cb(this._value())
  }
}

const readkey = key => IO.of(() => localStorage.getItem(key)) // 输入是有副作用
const parse = str => JSON.parse(str)
const writeToConsole = console.log // 输出是有副作用

const r = readkey('data')
  .map(parse)
  .map(x => x.userId)
  .flatMap(readkey)
  .map(parse)
  .start(writeToConsole) // start 之前都是在组合函数，没有执行，是没有副作用的
```

+ IO函子中的 _value 是一个函数，这里是把函数作为值来处理
+ IO函子可以把不纯的动作存储到 _value 中，延迟执行这个不纯的操作(惰性执行)，包装当前的操作
+ 把不纯的操作交给调用者来处理

```javascript
const fp = require('lodash/fp');
const fs = require('fs');

// TODO: IO 函子
class IO {
  static of(value) {
    return new IO(() => value);
  }
  constructor(fn) {
    this._value = fn;
  }
  map(fn) {
    // 把当前的 value 和传入的 fn 组合成一个新的函数
    return IO.of(fp.flowRight(fn, this._value));
  }
}

const r = IO.of(process)
  .map(p => p.execPath);
console.log(r);
console.log(r._value());

// 案例
// 问题：嵌套函子不方便
const readFile = (filename) => new IO(() => fs.readFileSync(filename, 'utf-8'))
const print = (v) => new IO(() => {
  console.log('print', v);
  return v;
});
const cat = fp.flowRight(print, readFile);
// rIo => IO(IO(x)
const rIo = cat('index.js');
const pIo = rIo._value()
console.log(pIo._value());
```

## Task函子
+ **<font style="color:#DF2A3F;">难点</font>**

```javascript
function Task (execute) {
  return {
    execute,
    map: fn => {
      return Task(resolve => {
        return execute(data => {
          return resolve(fn(data))
        })
      })
    },
    flatMap: fn => {
      return Task(resolve => {
        return execute(x => {
          return fn(x).execute(data => {
            return resolve(data)
          })
        })
      })
    }
  }
}

const get = url => {
  if(url ==='code') {
    return Promise.resolve({
      code: 0,
      total: 1
    })
  } else if(url === 1) {
    return Promise.resolve({
      userId: 1,
      id: 0,
      title: 'delectus aut autem',
      completed: false
    })
  }
}

const request = url => {
  return Task(resolve => get(url).then(resolve));
}

const task = request('code');
task
  .map(x => x.total)
  .flatMap(request)
  .map(x => x.title)
  .execute(data => console.log(data)) // 此处的 execute => resolve => execute(data => resolve(data))
```

### Folktale
+ Taks 异步执行
+ 异步任务的实现过于复杂，我们使用 folktale 中的Task来演示
+ [folktale](https://www.npmjs.com/package/folktale) 一个标准的函数式编程库
    - 和 lodash 、ramda 不同的是，它没有提供很多功能函数
    - 只提供了一些函数式处理的操作，例如：compose、curry等，一些函子 Task、Either、MayBe等

```javascript
const { compose, curry } = require('folktale/core/lambda');
const { toUpper, first } = require('lodash/fp');

// 第一个参数是传入函数的参数个数
const f = curry(2, (x, y) => x + y);
console.log(f(3, 4));
console.log(f(3)(4));

// 函数组合
const c = compose(toUpper, first);
console.log(c(['one', 'two']));
```

+ folktale(2.3.2) 2.x 中的 Task 和 1.x 中的 Task 区别很大，1.x 中的用法更接近我们现在的演示的函子
+ 这里以2.3.2来演示

```javascript
const { task } = require('folktale/concurrency/task');
const fs = require('fs');
const { split, filter } = require('lodash/fp');

function readFile(filename) {
  return task(resolver => {
    fs.readFile(filename, 'utf-8', (err, data) => {
      if(err) resolver.reject(err);
      resolver.resolve(data);
    })
  });
}

// 调用 run 执行
readFile('index.js')
  .map(split('\n'))
  .map(filter(v => v.includes('TODO')))
  .run()
  .listen({
    onRejected(err) {
      console.log(err);
    },
    onResolved(value) {
      console.log(value);
    }
  })
```

## Pointed函子
+ Pointed 函子是实现 of 静态方法的函子
+ of 方法是为了避免使用 new 来创建对象，更深层的含义是 of 方法用来把值放到上下文 Context(把值放到容器中，使用 map 来处理)

<!-- 这是一张图片，ocr 内容为：VALUE JUST& VALUE AND CONTEXT -->
![](https://cdn.nlark.com/yuque/0/2022/png/738210/1652001090238-3ca1cdd7-b75c-4538-ac8d-9997a6433459.png)

```javascript
class Container {
  static of(value) {
    return new Container(value);
  }
  constructor(value) {
    this._value = value;
  }
  map(fn) {
    return Container.of(fn(this._value));
  }
}

const r = Container.of(5)
  .map(x => x + 1)
  .map(x => x * x);
console.log(r);
```

## Monad函子
+ <font style="color:rgb(51, 51, 51);">函子的值也可以是函子，这样会出现多层函子嵌套的情况</font>
+ <font style="color:rgb(51, 51, 51);">Monad(单子[不可分割的实体]) 函子的作用是，总是返回一个单层的函子</font>
+ <font style="color:rgb(51, 51, 51);">它有一个</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">flatMap</font>`<font style="color:rgb(51, 51, 51);">方法，与</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">map</font>`<font style="color:rgb(51, 51, 51);">方法作用相同，唯一的区别是如果生成了一个嵌套函子，它会取出后者内部的值，保证返回的永远是一个单层的容器，不会出现嵌套的情况</font>

```javascript
// 函子嵌套
class Monad {
  constructor(value) {
    this._value = value
  }
  map(fn) {
    return Monad.of(fn(this._value))
  }
  static of(value) {
    return new Monad(value)
  }
}

const r = Monad.of('aa')
  .map(x => Monad.of(x + 1))
  .map(x => Monad.of(x._value + 2))
  .map(x => Monad.of(x._value + 3))


console.log(r._value._value)
```

```javascript
class Monad {
  constructor(value) {
    this._value = value
  }
  map(fn) {
    return Monad.of(fn(this._value))
  }
  static of(value) {
    return new Monad(value)
  }
  join() {
    return this._value;
  }

  flatMap(fn) {
    return this.map(fn).join()
  }
}

const r = Monad.of('aa')
  .flatMap(x => Monad.of(x + 1))
  .flatMap(x => Monad.of(x + 2))
  .flatMap(x => Monad.of(x + 3))


console.log(r._value)
```

+ Monad 函子是可以变扁的 Pointed 函子，IO(IO(x))
+ 一个函子如果具有 join 和 of 两个方法并遵守一些定律是一个 Monad

```javascript
const fp = require('lodash/fp');
const fs = require('fs');

// TODO: IO 函子
class IO {
  static of(value) {
    return new IO(() => value);
  }
  constructor(fn) {
    this._value = fn;
  }
  map(fn) {
    // 把当前的 value 和传入的 fn 组合成一个新的函数
    return new IO(fp.flowRight(fn, this._value));
  }
  // 解决函子嵌套问题
  join() {
    return this._value();
  }
  flatMap(fn) {
    return this.map(fn).join();
  }
}

// 案例
// 问题：嵌套函子不方便
const readFile = (filename) => new IO(() => fs.readFileSync(filename, 'utf-8'))
const print = (v) => new IO(() => {
  console.log('print', v);
  return v;
});

// const cat = fp.flowRight(print, readFile);
// rIo => IO(IO(x)
// const rIo = cat('index.js');
// const pIo = rIo._value()
// console.log(pIo._value());

const r = readFile('index.js')
  .map(fp.toUpper)
  .flatMap(print)
  .join();
console.log(r);
```

## Ap函子
+ 函子里面包含的值，完全可能是函数。
+ 我们可以想象这样一种情况，一个函子的值是数值，另一个函子的值是函数。

```javascript
function addTwo(x) {
  return x + 2;
}

const A = Functor.of(2);
const B = Functor.of(addTwo)
```

+ 上面代码中，函子A内部的值是2，函子B内部的值是函数addTwo。
+ 有时，我们想让函子B内部的函数，可以使用函子A内部的值进行运算。这时就需要用到 Ap 函子。
+ Ap 是 applicative（应用）的缩写。
+ Ap 函子的意义在于，对于那些多参数的函数，就可以从多个容器之中取值，实现函子的链式操作。
+ 例如下面代码中，函数add是柯里化以后的形式，一共需要两个参数。通过 Ap 函子，我们就可以实现从两个容器之中取值。

```javascript
class Ap {
  static of(value) {
    return new Ap(value);
  }
  constructor(fn) {
    this._value = fn;
  }
  map(F) {
    // 把当前的 value 和传入的 fn 组合成一个新的函数
    return new Ap(this._value(F._value));
  }
}

class MayBe {
  static of(value) {
    return new MayBe(value);
  }
  constructor(value) {
    this._value = value;
  }
  // 如果对空值变形的话直接返回，值为 null 的函子
  map(fn) {
    return this.isNothing() ? MayBe.of(null) : MayBe.of(fn(this._value));
  }
  isNothing() {
    return this._value === null || this._value === undefined;
  }
}

function add(x) {
  return function (y) {
    return x + y;
  };
}

const r = Ap.of(add(2))
  .map(MayBe.of(3));
console.log(r);
```

# 参考
[Lodash 简介 | Lodash 中文文档 | Lodash 中文网](https://www.lodashjs.com/)



[Home | Folktale, a standard library for functional programming in JavaScript](https://folktale.origamitower.com/)



[Introduction · 函数式编程指北](https://llh911001.gitbooks.io/mostly-adequate-guide-chinese/content/)



[函数式编程入门教程 - 阮一峰的网络日志](http://www.ruanyifeng.com/blog/2017/02/fp-tutorial.html)





















