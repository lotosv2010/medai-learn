# async...await...
+ `async-await/index.js`

```javascript
const fs = require('fs').promises

async function read (){
  let data = await fs.readFile('../data/data.json', 'utf-8')
  data = JSON.parse(data)
  console.log(data)
  const data2 = await fs.readFile(data.url, 'utf-8')
  console.log(data2)
  return data2
}

// async + await(语法糖)= generator + co
// async 返回的就是一个 promise await 后面的内容会被包装成一个 promise
read().then(data => {
  console.log(data)
})
```

[async函数](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/async_function)



[await](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/await)

