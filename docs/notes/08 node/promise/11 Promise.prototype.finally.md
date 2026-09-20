# 实现
+ `my-promise/promise.js`

```javascript
// 宏
const PENDING = 'PENDING'     // 等待状态
const FULFILLED = 'FULFILLED' // 成功状态
const REJECTED = 'REJECTED'   // 失败状态

const isPromise = value => {
  if(typeof (value === 'object' && value!== null) || typeof value === 'function') {
    return typeof value.then === 'function'
  }
  return false
}

const resolvePromise = (promise2, x, resolve, reject) => {
  // 判断可能你的 promise 要和别人的 promise 来混用
  // 可能不同的promise库之间要相互调用

  // 为了考虑别人的 promise 不健壮所以我们需要自己取判断一下，
  // 如果调用失败不能再调成功，如果调用成功不能再调失败
  // 不能多次调用成功或失败
  let called

  // 1.x 如果和 promise 使用一个对象，x永远不能成功或失败，所以就死循环了，我们要直接抛出一个错误
  if(promise2 == x) {
    return reject(new TypeError('Chaining cycle detected for promise'))
  }

  // todo 判断 x 的状态
  // 2.判断 x 是不是promise
  if((typeof x === 'object' && x!== null) || typeof x === 'function') {
    // x 是一个对象或这函数
    try {
      let then = x.then // 取出 then 方法，这个 then 方法采用 defineProperty 定义的
      if(typeof then === 'function') {
        // 判断 then 是不是一个函数，如果 then 不是一个函数，说明 x 不是 promise
        // todo：注意：x.then(() => {}, () => {}) 这样调用会再次取 then
        then.call(x, y => { // 如果 x 是一个 promise 就采用这个 promise 的返回结果
          if(called) return
          called = true
          // 如果 y 是一个 promise 继续解析成功的值
          resolvePromise(promise2, y, resolve, reject)
        }, r => {
          if(called) return
          called = true
          reject(r)
        })
      } else {
        // x 是一个对象，例如：x = {then:123}
        resolve(x)
      }
    } catch (e) {
      if(called) return
      called = true
      reject(e) // 去 then 失败了，直接触发 promise2 的失败逻辑
    }
  } else {
    // x 肯定不是 promise
    resolve(x)
  }
}
class Promise {
  constructor(executor) {
    this.status = PENDING // 默认等待状态
    this.value = undefined
    this.reason = undefined
    this.onResolveCallback = []
    this.onRejectCallback = []

    let resolve =(value) => {
      if(value instanceof Promise) {
        return value.then(resolve, reject)
      }
      // 只有状态是等待状态的话才能更新状态
      if(this.status == PENDING) {
        this.status = FULFILLED
        this.value = value
        this.onResolveCallback.forEach(fn => fn()) // 发布的过程
      }
    }
    let reject = (reason) => {
      if(this.status == PENDING) {
        this.status = REJECTED
        this.reason = reason
        this.onRejectCallback.forEach(fn => fn())
      }
    }
    // executor执行的时候需要传入两个参数，用来给用户改变状态使用的
    // try...catch...只能捕获同步异常
    try {
      executor(resolve, reject)
    } catch (error) {
      // 表示当前有异常，那就使用这个异常作为 Promise失败的原因
      reject(error)
    }
  }
  // 只要 x 是一个普通值，就会让下一个 promise 变成成功状态
  // 这个 x 与可能是一个 promise，我需要采用这个promise的状态
  then(onFulFilled, onReject) {
    console.log('----my promise----')
    // todo:可选参数的处理
    onFulFilled = typeof onFulFilled == 'function' ? onFulFilled : val => val
    onReject = typeof onReject == 'function' ? onReject : val => {throw val}
    // 递归
    let promise2 = new Promise((resolve, reject) => {
      if(this.status == FULFILLED) {
        setTimeout(() => {
          try {
            let x = onFulFilled(this.value)
            resolvePromise(promise2, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        }, 0)
      } 
      if (this.status == REJECTED) {
        setTimeout(() => {
          try {
            let x = onReject(this.reason)
            resolvePromise(promise2, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        }, 0)
      }
      if(this.status == PENDING) { // 订阅的过程
        this.onResolveCallback.push(() => {
          // todo
          setTimeout(() => {
            try {
              let x = onFulFilled(this.value)
              resolvePromise(promise2, x, resolve, reject)
            } catch (e) {
              reject(e)
            }
          }, 0)
        })
        this.onRejectCallback.push(() => {
          setTimeout(() => {
            try {
              let x = onReject(this.reason)
              resolvePromise(promise2, x, resolve, reject)
            } catch (e) {
              reject(e)
            }
          }, 0)
        })
      }
    })
    return promise2
  }
  catch(errorCallback) {
    return this.then(null, errorCallback)
  }
  finally(callback) {
    return this.then((value) => {
      // 等待 finally 方法执行完毕，将上一个成功的结果向下传递
      return Promise.resolve(callback()).then(() => value)
      // return value
    }, (error) => {
      return Promise.resolve(callback()).then(() => {throw error})
      // throw error
    })
  }
}

// 测试是否符合规范
// 静态方法
Promise.deferred = function() {
  let dfd = {}
  dfd.promise = new Promise((resolve, reject) => {
    dfd.resolve = resolve
    dfd.reject = reject
  })
  return dfd
}

// Promise 化：把异步的 node 中的 api 转化成 Promise 方法，只针对 node 方法
Promise.promisify = function(fn) {
  return function(...args) {
    return new Promise((resolve, reject) => {
      fn(...args, function(error, data) {
        if(error) reject(error)
        resolve(data)
      })
    })
  }
}

Promise.all =function(promises) {
  return new Promise((resolve, reject) => {
    // 让一个 promise 执行，就是调用它的 then 方法
    let res = []
    let j = 0
    let processData = (index, data) => {
      res[index] = data
      if(++j === promises.length) {
        resolve(res)
      }
    }
    for (let i = 0; i < promises.length; i++) {
      let current = promises[i];
      if(isPromise(current)) {
        // 如果有任何一个 promise 失败了，直接让这个 promise变成失败态即可
        current.then(data => {
          processData(i, data)
        }, reject)
      } else {
        processData(i, current)
      }
    }
  })
}

Promise.resolve = function(value) {
  return new Promise((resolve, reject) => {
    // resolve 方法里面放一个 promise 会等待这个 promise 执行完成
    resolve(value)
  })
}

Promise.reject = function(value) {
  return new Promise((resolve, reject) => {
    // reject 不会解析 value 中的 promise
    reject(value)
  })
}

// commonjs规范
module.exports = Promise
```

# 测试
+ `my-promise/test10.js`

```javascript
const Promise = require('./promise')

Promise.resolve(100).finally(() => {
  console.log('finally')
  // 默认会等待当前 finally 方法执行完毕
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve('hello')
    }, 2000);
  })
}).then(data => console.log('success', data), 
        error => console.error('fail', error))
```

