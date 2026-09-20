# 实现
```javascript
// ....

Promise.any = function(promises) {
  return new Promise((resolve, reject) => {
    let count = 0;
    let result = [];

    const processData = (index, value) => {
      result[index] = value;
      if (++count === promises.length) {
        reject(new AggregateError(result, 'All promises were rejected'));
      }
    };

    for (let i = 0; i < promises.length; i++) {
      const current = promises[i];
      if(isPromise(current)) {
        current.then(value => {
          resolve(value);
        }, reason => {
          processData(i, reason);
        })
      } else {
        resolve(current);
      }
    }
  })
}
```

# 测试
```javascript
const Promise = require('./index')

const promise1 = new Promise((resolve, reject) => {
  setTimeout(() => {
    reject(1);
  }, 0);
});
const promise2 = Promise.reject(2);
const promise3 = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve(2);
  }, 100);
});
const promise4 = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve(3);
  }, 200);
});

const promises1 = [promise2, promise1, promise3, promise4];

Promise.any(promises1)
  .then(res => {
    console.log(res);
  })

const promises2 = [promise1, promise2];

Promise.any(promises2)
  .then(res => {
    console.log(res, 'data');
  }).catch(error => {
    console.log(error.message, 'message')
    console.log(error.name, 'name');
    console.log(error.errors, 'errors');
  })
```

