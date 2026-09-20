# 实现
+ `my-promise/promise.js` 

```javascript
// 宏
const PENDING = 'PENDING'     // 等待状态
const FULFILLED = 'FULFILLED' // 成功状态
const REJECTED = 'REJECTED'   // 失败状态

class Promise {
  constructor(executor) {
    this.status = PENDING // 默认等待状态
    this.value = undefined
    this.reason = undefined

    let resolve =(value) => {
      // 只有状态是等待状态的话才能更新状态
      if(this.status == PENDING) {
        this.status = FULFILLED
        this.value = value
      }
    }
    let reject = (reason) => {
      if(this.status == PENDING) {
        this.status = REJECTED
        this.reason = reason
      }
    }
    // executor执行的时候需要传入两个参数，用来给用户改变状态使用的
    try {
      executor(resolve, reject)
    } catch (error) {
      // 表示当前有异常，那就使用这个异常作为 Promise失败的原因
      reject(error)
    }
  }
  then(onFulFilled, onReject) {
    console.log('----my promise----')
    if(this.status == FULFILLED) {
      onFulFilled(this.value)
    } 
    if (this.status == REJECTED) {
      onReject(this.reason)
    }
  }
}
// commonjs规范
module.exports = Promise
```

# 测试
+ `my-promise/test.js`

```javascript
const Promise = require('./promise')

let promise = new Promise((resolve, reject) => {
  if(Math.random() < 0.5) {
    resolve({
      success: true,
      code: 200,
      data: {
        name: 'test'
      }
    })
  } else {
    reject({
      success: false,
      code: 500,
      errorMsg: 'fail'
    })
  }
})

promise.then((res) => {
  console.log('success', res)
}, (error) => {
  console.log('error', error)
})
```

