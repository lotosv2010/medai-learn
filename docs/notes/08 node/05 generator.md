# generator
总结

+ 1.每次调用 next 碰到 yield 就会暂停
+ 2.碰到 return 函数就执行完毕
+ 3.调用next方法时传递参数，会永远给上一次 yield 赋值，第一次传递的值是无效的



+ `generator/index.js` 

```javascript
// -----------基本用法--------------
// generator 函数，生成器函数
function *gen() {
  return 100
}

// 生成的是迭代器对象 => next
let it = gen()
console.log(it) // Object [Generator] {}
// value 就是当前迭代出来的结果，done 表示当前函数是否执行完成
console.log(it.next()) // { value: 100, done: true }

// -----------yield--------------
// 生成器函数 和普通函数的区别在于，生成器函数具有等待的效果
function *gen1() {
  yield 1
  yield 2
}
let it1 = gen1()

// 每次调用 next 碰到 yield 就会暂停
// yield 可以有返回值
console.log(it1.next()) // { value: 1, done: false }
console.log(it1.next()) // { value: 2, done: false }
console.log(it1.next()) // { value: undefined, done: true }

// -----------返回值问题--------------
function *gen2() {
  let r1 = yield 1
  console.log(r1) // 200
  let r2 = yield 2
  console.log(r2) // 300
  return r2
}
let it2 = gen2()

// 调用next方法时传递参数，会给上一次 yield 赋值，第一次传递的值是无效的
console.log(it2.next(100)) // { value: 1, done: false }
console.log(it2.next(200)) // { value: 2, done: false }
console.log(it2.next(300)) // { value: 300, done: true }


// -----------应用--------------
const fs = require('fs').promises

function *read (){
  const data = yield fs.readFile('../data/data.json', 'utf-8')
  const data2 = yield fs.readFile(data.url, 'utf-8')
  return data2
}

let it = read()
let { value, done } = it.next()
value.then(data1 => {
  data1 = JSON.parse(data1)
  let { value, done } = it.next(data1)
  value.then(data2 => {
    let { value, done } = it.next(data2)
    console.log(value, done)
  })
})
```

# 元编程
## 重写对象的toString方法
```javascript
const obj = {
  get [Symbol.toStringTag]() {
    return 'MyObject';
  }
}

console.log(Object.prototype.toString.call(obj)); // [object MyObject]
```

## 类数组迭代
### generator方式
```javascript
const likeArray = {
  0: 'a',
  1: 'b',
  2: 'c',
  length: 3,
  [Symbol.iterator]: function* () { // generator最终会编译成下面迭代器的形式
    for (let i = 0; i < this.length; i++) {
      yield this[i];
    }
  }
}

const arr = Array.from(likeArray);
console.log(arr);
```

### 迭代器方式
```javascript
const  likeArray = {
  0: 'a',
  1: 'b',
  2: 'c',
  length: 3,
  [Symbol.iterator]() {
    let i = 0;
    return {
      next:() => {
        return {
          value: this[i],
          done: i++ === this.length
        }
      }
    }
  }
}

const arr = [...likeArray];
console.log(arr);
```

# co
+ `co/index.js`

```javascript
// const co = require('co')
const fs = require('fs').promises

function *read (){
  let data = yield fs.readFile('../data/data.json', 'utf-8')
  data = JSON.parse(data)
  console.log(data)
  const data2 = yield fs.readFile(data.url, 'utf-8')
  return data2
}

co(read()).then(data => {
  console.log(data)
})

// co 原理
function co(it) {
  return new Promise((resolve, reject) => {
    function next(data) {
      let { value, done } = it.next(data)
      if(!done) {
        Promise.resolve(value).then(data => {
          next(data)
        }, reject)
      } else {
        resolve(value)
      }
    }
    next()
  })
}
```

# 参考
[ES6 入门教程](https://es6.ruanyifeng.com/#docs/generator)

[Generator](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Generator)

