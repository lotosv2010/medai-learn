# 实现
```javascript
// ...
Promise.allSettled = function(promises) {
  return new Promise((resolve, reject) => {
    let count = 0;
    let result = [];

    const processData = (index, value) => {
      result[index] = value;
      if (++count === promises.length) {
        resolve(result);
      }
    };

    for (let i = 0; i < promises.length; i++) {
      const current = promises[i];
      if(isPromise(current)) {
        current.then(value => {
          processData(i, {
            status: 'fulfilled',
            value
          });
        }, reason => {
          processData(i, {
            status: 'rejected',
            reason
          });
        })
      }
    }
  })
}
```

# 测试
```javascript
const Promise = require('./index')

const promise1 = Promise.resolve(1);
const promise2 = Promise.reject(2);
const promise3 = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve(3);
  }, 1000);
});

const promises = [promise1, promise2, promise3];

Promise.allSettled(promises)
  .then(res => {
    console.log(res);
  })
```

