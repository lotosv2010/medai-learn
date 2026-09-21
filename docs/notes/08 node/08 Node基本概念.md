# Node是什么?
Node.js是一个基于 Chrome V8 引擎的JavaScript运行环境(runtime),Node不是一门语言是让js运行在后端的运行时,并且不包括javascript全集,因为在服务端中不包含DOM和BOM,Node也提供了一些新的模块例如http,fs模块等。Node.js 使用了事件驱动、非阻塞式 I/O 的模型，使其轻量又高效并且Node.js 的包管理器 npm，是全球最大的开源库生态系统。事件驱动与非阻塞IO后面我们会一一介绍。到此我们已经对node有了简单的概念。

> 浏览器中JavaScript由三部分组成：DOM、BOM、ECMAScript。
>

# Node解决了哪些问题?
Node在处理高并发,I/O密集场景有明显的性能优势

+ 高并发,是指在同一时间并发访问服务器
+ I/O密集指的是文件操作、网络操作、数据库,相对的有CPU密集,CPU密集指的是逻辑处理运算、压缩、解压、加密、解密

> Web主要场景就是接收客户端的请求读取静态资源和渲染界面,所以Node非常适合Web应用的开发。
>

# JS单线程
javascript在最初设计时设计成了单线程,为什么不是多线程呢？如果多个线程同时操作DOM那岂不会很混乱？这里所谓的单线程指的是主线程是单线程的,所以在Node中主线程依旧是单线程的。

+ 单线程特点是节约了内存,并且不需要在切换执行上下文
+ 而且单线程不需要管锁的问题

> <font style="color:rgb(51, 51, 51);">这是由 Javascript 这门脚本语言的用途决定的。</font>
>
> <font style="color:rgb(51, 51, 51);">Web Worker并没有改变 JavaScript 单线程的本质。</font>
>

# <font style="color:rgb(51, 51, 51);">浏览器模型</font>
+ <font style="color:rgb(51, 51, 51);">用户界面-包括地址栏、前进/后退按钮、书签菜单等</font>
+ <font style="color:rgb(51, 51, 51);">浏览器引擎-在用户界面和呈现引擎之间传送指令</font>
+ <font style="color:rgb(51, 51, 51);">呈现引擎-又称渲染引擎，也被称为浏览器内核，在线程方面又称为UI线程</font>
+ <font style="color:rgb(51, 51, 51);">网络-用于网络调用，比如 HTTP 请求</font>
+ <font style="color:rgb(51, 51, 51);">用户界面后端-用于绘制基本的窗口小部件,UI线程和JS共用一个线程</font>
+ <font style="color:rgb(51, 51, 51);">JavaScript解释器-用于解析和执行 JavaScript 代码</font>
+ <font style="color:rgb(51, 51, 51);">数据存储-这是持久层。浏览器需要在硬盘上保存各种数据，例如 Cookie</font>

<!-- 这是一张图片，ocr 内容为：USER INTERFACE DATA PERSISTENCE BROWSER ENGINE RENDERING ENGINE JAVASCRIPT NETWORKING UI BACKEND INTERPRETER -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1741595623254-c0a8f98c-b6b9-4500-8c6f-5fe285b084e5.png)

# <font style="color:rgb(51, 51, 51);">除JS线程和UI线程之外的其它线程</font>
+ <font style="color:rgb(51, 51, 51);">浏览器事件触发线程</font>
+ <font style="color:rgb(51, 51, 51);">定时触发器线程</font>
+ <font style="color:rgb(51, 51, 51);">异步HTTP请求线程</font>

# <font style="color:rgb(51, 51, 51);">任务队列</font>
+ <font style="color:rgb(51, 51, 51);">所有同步任务都在主线程上执行，形成一个执行栈</font>
+ <font style="color:rgb(51, 51, 51);">主线程之外，还存在一个任务队列。只要异步任务有了运行结果，就在任务队列之中放置一个事件。</font>
+ <font style="color:rgb(51, 51, 51);">一旦执行栈中的所有</font><font style="color:rgb(51, 51, 51);">同步任务</font><font style="color:rgb(51, 51, 51);">执行完毕，系统就会读取</font><font style="color:rgb(51, 51, 51);">任务队列</font><font style="color:rgb(51, 51, 51);">，看看里面有哪些事件。那些对应的异步任务，于是结束等待状态，进入执行栈，开始执行。</font>
+ <font style="color:rgb(51, 51, 51);">主线程不断重复上面的第三步。</font>

# <font style="color:rgb(51, 51, 51);">Event Loop</font>
<font style="color:rgb(51, 51, 51);">主线程从</font>**<font style="color:rgb(51, 51, 51);">任务队列</font>**<font style="color:rgb(51, 51, 51);">中读取事件，这个过程是循环不断的，所以整个的这种运行机制又称为Event Loop(事件循环)</font>

<!-- 这是一张图片，ocr 内容为：JS WEBAPIS HEAP STACK DOM(DOCUMENT) AJAX(XMLHTTPREQUEST) MATH SINO) (0XNB SETTIMEOUT BAZO BAR() TOC() EVENT LOOP CALLBACK ONCLICK ONDONE ONLOAD QUEUE -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1741595782941-399e8140-5437-4300-891b-6e7ac60c35e8.png)

# <font style="color:rgb(51, 51, 51);">Node中的Event Loop</font>
<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1608040567777-b72f7907-d4a5-4f65-89df-1eec6c5ecdb2.png)

+ <font style="color:rgb(51, 51, 51);">1.我们写的js代码会交给v8引擎进行处理</font>
+ <font style="color:rgb(51, 51, 51);">2.代码中可能会调用nodeApi,node会交给libuv库处理</font>
+ <font style="color:rgb(51, 51, 51);">3.libuv通过阻塞i/o和多线程实现了异步io</font>
+ <font style="color:rgb(51, 51, 51);">4.通过事件驱动的方式,将结果放到事件队列中,最终交给我们的应用。</font>



```javascript
本阶段执行已经被 setTimeout() 和 setInterval() 的调度回调函数。
   ┌───────────────────────────┐
┌─>│           timers          │ 
│  └─────────────┬─────────────┘
|   执行延迟到下一个循环迭代的 I/O 回调（不可控）
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │
│  └─────────────┬─────────────┘
|   仅系统内部使用。
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │
│  └─────────────┬─────────────┘      
|  事件触发线程，在轮训的过程中会在这里阻塞
|     (1.执行异步 I/O 回调)
|     (2.监控时间到了，回到timer中)
|  							 |										┌───────────────┐
│  ┌─────────────┴─────────────┐      │   incoming:   │
│  │           poll            │<─────┤  connections, │
│  └─────────────┬─────────────┘      │   data, etc.  │
│  setImmediate() 回调函数在这里执行。  	└───────────────┘
│  ┌─────────────┴─────────────┐      
│  │           check           │
│  └─────────────┬─────────────┘
|  一些关闭的回调函数（socket.on('close', () => {})等）
│  ┌─────────────┴─────────────┐
└──┤      close callbacks      │
   └───────────────────────────┘
```

<font style="color:rgb(51, 51, 51);"></font>

> <font style="color:rgb(51, 51, 51);">这里每一个阶段都对应一个事件队列,当event loop执行到某个阶段时会将当前阶段对应的队列依次执行。当该队列已用尽或达到回调限制，事件循环将移动到下一阶段</font>
>
> `<font style="color:rgb(51, 51, 51);">process.nextTick()</font>`<font style="color:rgb(51, 51, 51);"> 从技术上讲不是事件循环的一部分.</font>
>
> <font style="color:rgb(51, 51, 51);">执行顺序的三种情况：</font>
>
> <font style="color:rgb(51, 51, 51);">主栈 -> timers -> poll -> check</font>
>
> <font style="color:rgb(51, 51, 51);">主栈 -> timers -> poll -> timers</font>
>
> <font style="color:rgb(51, 51, 51);">主栈 ->timers -> poll</font>
>

```javascript
// 在node事件循环中，此代码会先执行，然后执行fs.readFile的回调函数
// setTimeout 和 setImmediate 的执行顺序是：
//    1. setImmediate
//    2. setTimeout
// 原因是： 
//    fs.readFile 是一个poll，
//    setImmediate 是一个check，
//    setTimeout 是一个timer，
//    poll > check > timer
fs.readFile(path.resolve(__dirname, 'data.json'), (err, data) => {
  console.log(data.toString());
  setTimeout(() => {
    console.log('settimeout')
  }, 0);
  setImmediate(() => {
    console.log('setimmediate')
  })
})
```

[一篇文章教会你Event loop——浏览器和Node](https://segmentfault.com/a/1190000013861128)



# 同步异步和阻塞非阻塞
> 阻塞和非阻塞 指代的是调用方的状态， 同步异步 指代的是被调用方的状态
>

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1608040567772-0d617403-4cc8-462d-9205-7b191bc8ed84.png)

## <font style="color:rgb(51, 51, 51);">同步与异步</font>
<font style="color:rgb(51, 51, 51);">同步和异步关注的是消息通知机制</font>

+ <font style="color:rgb(51, 51, 51);">同步就是发出调用后，没有得到结果之前，该调用不返回，一旦调用返回，就得到返回值了。 简而言之就是调用者主动等待这个调用的结果</font>
+ <font style="color:rgb(51, 51, 51);">而异步则相反，调用者在发出调用后这个调用就直接返回了，所以没有返回结果。换句话说当一个异步过程调用发出后，调用者不会立刻得到结果，而是调用发出后，被调用者通过状态、通知或回调函数处理这个调用。</font>

## <font style="color:rgb(51, 51, 51);">阻塞与非阻塞</font>
<font style="color:rgb(51, 51, 51);">阻塞和非阻塞关注的是程序在等待调用结果（消息，返回值）时的状态.</font>

+ <font style="color:rgb(51, 51, 51);">阻塞调用是指调用结果返回之前，当前线程会被挂起。调用线程只有在得到结果之后才会返回。</font>
+ <font style="color:rgb(51, 51, 51);">非阻塞调用指在不能立刻得到结果之前，该调用不会阻塞当前线程。</font>

## <font style="color:rgb(51, 51, 51);">组合</font>
+ <font style="color:rgb(51, 51, 51);">同步异步取决于被调用者，阻塞非阻塞取决于调用者</font>
    - <font style="color:rgb(51, 51, 51);">同步阻塞</font>
    - <font style="color:rgb(51, 51, 51);">异步阻塞</font>
    - <font style="color:rgb(51, 51, 51);">同步非阻塞</font>
    - <font style="color:rgb(51, 51, 51);">异步非阻塞</font>



# 宏任务和微任务
## 宏任务
+ script
+ ui
+ setTimeout
+ setInterval
+ requestFrameAnimation
+ setImmediate
+ MessageChannel
+ 事件
+ ajax



## 微任务
+ Promise
+ mutationObserver
+ nextTick



# Node中全局对象
+ Buffer
+ process
+ setInterval,setTimeout,setImmediate
+ console
+ queueMicrotask



# node中的模块
+ __dirname
+ __filename
+ exports
+ module
+ require()

# <font style="color:rgb(51, 51, 51);">什么场合下应该考虑使用Node框架</font>
<font style="color:rgb(51, 51, 51);">当应用程序需要处理大量并发的输入输出，而在向客户端响应之前，应用程序并不需要进行非常复杂的处理。</font>

+ <font style="color:rgb(51, 51, 51);">聊天服务器</font>
+ <font style="color:rgb(51, 51, 51);">电子商务网站</font>



# 参考
[https://segmentfault.com/a/1190000013933520?utm_source=tag-newest](https://segmentfault.com/a/1190000013933520?utm_source=tag-newest)

