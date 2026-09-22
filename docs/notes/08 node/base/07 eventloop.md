# 进程
+ `cpu`  分配资源的最小单位是进程，同一时间内 `cpu`  只能运行一个进程（时间片轮转的算法)

# 线程
+ cpu 调度的最小单位是线程，一个进程里面包含着多个线程

# 浏览器的进程
+ 多进程的
+ 每一个页卡都是进程（互不影响)
+ 浏览器也有一个主进程（用户界面)
+ 渲染进程，每个页卡里面都有一个渲染进程（浏览器内核)
+ 网络进程（处理请求）
+ `GPU` 进程（ `3d` 绘制）
+ 第三方插件的进程

# 渲染进程
+ 包含着多个线程
+ `GPI` 线程（ <font style="background-color:rgba(0, 0, 0, 0.06);">渲染页面的</font>）
+ `js` 引擎线程，它和页面渲染是互斥的，为了保证渲染的一致性，要保证整个执行是单线程的
+ 事件触发线程，独立的线程 `eventLoop` 
+ 事件 click setTimeout ajax 也是一个独立的线程

# 宏任务
+ 宿主环境提供的异步方法都是宏任务，例如 `ajax event setTimeout` 等
+ 宏任务放置的时机是当 `ajax` 成功的时候，定时器成的时候，点击按钮的时候，将对应的回调放到宏任务队列中
+ 宏任务 script ui 渲染、setTimeout、setInterval、postMessageMessageChannel、SetImmediate

# 微任务
+ 语言标准提供的，例如 `promise、mutationObsrver` 等
+ 微任务放置的时机，只要调用 `promise、mutationObsrver` 就直接将回调放到微任务队列中
+ queueMircrotask
+ process.nextTick

# 事件循环机制
+ 事件队列、消息队列：存放定时器到达时间的回调函数、ajax 回调成功的函数等。
+ 事件循环：不断检测调用栈是否为空，如果为空则从事件对列中取出一个来执行。



<!-- 这是一张图片，ocr 内容为：取出一个宏任务执行 等待时间到达或者成功后将方法的回调放入到宏任务中 宏任务队列 ajax,setTimoutevent JS引擎线程 执行栈 包含同步代码,异步代码 EventLoop a0 事件触发线程 GUI道染 EventLoop轮训处理 线程 bO 将回调放入到微任务中 宏任务 Promise.thenMuatationObserver 微任务队列 清空微任务队列 -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1607137707447-4fa29db8-e686-4eb4-a82a-cf2eb64150ac.png)

+ 默认先执行 script 脚本中的代码
+ 清空微任务，将所有的微任务全部执行完
+ 渲染页面
+ 取出一个宏任务执行
+ 执行完毕后再次清空微任务
+ ......

> **<font style="color:#DF2A3F;">宏任务队列(消息队列，底层是由多个队列组成 ，我们实际看的宏任务队列当成一个来理解) 时间到达后会将任务放到宏任务队列中 webApi</font>**
>
> **<font style="color:#DF2A3F;">微任务队列，每次执行宏任务的时候都会产生一个微任务队列 , 我们在看执行过程的时候当成只有一个来理解 ，微任务就是个回调</font>**
>
> **<font style="color:#DF2A3F;">代码执行的过程中</font>**
>
> **<font style="color:#DF2A3F;">宏任务和微任务会将对应的结果放到不同的队列中</font>**
>
> **<font style="color:#DF2A3F;">等待当前宏任务执行完毕后，会将微任务全部清空(在微任务执行的过程中，如果在产生微任务，则会将当前产生的微任务放到队列尾部)</font>**
>
> **<font style="color:#DF2A3F;">微任务都执行完毕后，会在宏任务队列里拿出来一个执行(宏任务每次执行一个，微任务每次执行一堆)</font>**
>
> **<font style="color:#DF2A3F;">宏任务的执行顺序 是按照 调用的顺序（时间一样的情况下)，如果时间不一样，则以放入的顺序为准</font>**
>
> **<font style="color:#DF2A3F;">渲染是要在特定的时机才能渲染， 根据浏览器的刷新频率 16.6ms，不是每一轮都要澶染的 (一定在微任务之后)</font>**
>
> **<font style="color:#DF2A3F;">js 是单线程的所以要有一个事件触发线程 来实现任务的调度</font>**
>

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  <script>
    console.log(1)
    async function async() {
      console.log(2)
      await console.log(3) // Promise.resolve(console.log(3)).then(() => {console.log(4)}) // 第二个微任务
      console.log(4)
    }
    setTimeout(() => {
      console.log(5)
    }, 0)
    const promise = new Promise((resolve, reject) => { // new Promise 代码会立即执行
      console.log(6)
      resolve(7)
    })
    promise.then(res => { // 第一个微任务
      console.log(res)
    })
    async()
    console.log(8)

    // 1 6 2 3 8 7 4 5
  </script>
</body>
</html>
```

# 案例
## 微任务和GUI渲染
```javascript
document.body.style.backgroundColor = 'red';
console.log(1)
Promise.resolve().then(() => {
  console.log(2)
  document.body.style.backgroundColor = 'blue';
})
console.log(3)
// 渲染是要在特定的时机才能渲染， 根据浏览器的刷新频率 16.6ms，
// 不是每一轮都要澶染的 (一定在微任务之后)
// 所以先执行完微任务再渲染
// 1，2，3 蓝色
```

## 事件任务
```javascript
const button = document.createElement('button')
button.addEventListener('click', () => {
  console.log('listener 1')
  Promise.resolve().then(() => {
    console.log('micro task 1')
  })
})

button.addEventListener('click', () => {
  console.log('listener 2')
  Promise.resolve().then(() => {
    console.log('micro task 2')
  })
})

button.click()
// 用户点击是宏任务，用户点击是触发了两个宏任务，两个宏任务要依次执行
// button.click() 当前的宏任务直接触发了
```

+ [深入解析JavaScript事件循环机制与微任务宏任务执行顺序-CSDN博客](https://blog.csdn.net/weixin_42178670/article/details/127390640)

## 定时器
```javascript
Promise.resolve().then(() => {
  console.log('Promise 1')
  setTimeout(() => {
    console.log('setTimeout 2')
  })
})

setTimeout(() => {
  console.log('setTimeout 1')
  Promise.resolve().then(() => {
    console.log('Promise 2')
  })
})
```

# 参考
[并发模型与事件循环](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/EventLoop)

