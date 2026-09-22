# fs(fileSystem)
## 概念
+ 处理文件
+ 所有方法基本都是同步方法、异步方法
+ 同步：如果刚刚运行程序可以去使用同步方法
+ 异步：开启一个服务监听客户端访问，就需要使用异步了，异步是非阻塞的
+ 操作文件时，尽量使用绝对路径来进行操作我

## 常用方法
+ `readFileSync` 
    - 同步读取文件
+ `exists`
    - 异步判断文件是否存在，<font style="color:#F5222D;">已废弃</font>
+ `existsSync`
    - 同步判断文件是否存在

## 参考
[fs | Node.js API 文档](http://nodejs.cn/api/fs.html)

# path
+ 处理路径
+ `resolve` 
    - 解析路径
    - `resolve` 不能遇到 `/` 
    - 例如： `path.resolve(__dirname, 'data.json')` 
+ `join` 
    - 拼接路径
    - 例如： `path.join(__dirname, 'data.json')` 
+ `extname` 
    - 获取文件的扩展名
    - 例如： `path.extname(file)` 

```javascript
const fs = require('fs');
const path = require('path')
const file = path.resolve(__dirname, '..', 'data', 'person.json')
console.log(file)
// fs.exists(file, (data) => console.log(data))
const exists = fs.existsSync(file)
console.log(exists)
const extname = path.extname(file)
console.log(extname)
const data = fs.readFileSync(file ,'utf-8')
console.log(data)
```

## 参考
[path | Node.js API 文档](http://nodejs.cn/api/path.html)

# vm
+ 虚拟机模块(沙箱)，干净的环境
+ 内部一般情况下操作的都是字符串逻辑，如和让一个字符串来运行
+ 可以使用 `new Function` 来创建一个沙箱环境，让字符串执行
+ 模版引擎的实现原理： `with语法+字符串拼接+new Function来实现` 

## 参考
[vm | Node.js API 文档](http://nodejs.cn/api/vm.html)

# buffer
## 参考
[Buffer | Node.js API 文档](http://nodejs.cn/api/buffer.html)

# events
```javascript
// const EventEmitter = require('events');

class EventEmitter {
  constructor() {
    this.events = {};
  }

  /**
   * 订阅事件
   * @param {String} eventName - 事件名称
   * @param {Function} callback - 事件回调函数
   */
  on(eventName, callback) {
    if (typeof eventName !== 'string' || typeof callback !== 'function') {
      throw new TypeError('Invalid arguments: eventName must be a string and callback must be a function');
    }
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    if (eventName !== 'newListener') {
      this.emit('newListener', eventName);
    }
    this.events[eventName].push(callback);
  }

  /**
   * 触发事件
   * @param {String} eventName - 事件名称
   * @param {...any} args - 传递给回调函数的参数
   */
  emit(eventName, ...args) {
    if (typeof eventName !== 'string') {
      throw new TypeError('eventName must be a string');
    }
    if (this.events[eventName]) {
      try {
        this.events[eventName].forEach(fn => {
          try {
            fn(...args);
          } catch (error) {
            console.error(`Error in callback for event "${eventName}":`, error);
          }
        });
      } catch (error) {
        console.error(`Error while emitting event "${eventName}":`, error);
      }
    }
  }

  /**
   * 只触发一次的事件订阅
   * @param {String} eventName - 事件名称
   * @param {Function} callback - 事件回调函数
   */
  once(eventName, callback) {
    if (typeof eventName !== 'string' || typeof callback !== 'function') {
      throw new TypeError('Invalid arguments: eventName must be a string and callback must be a function');
    }
    const wrapper = (...args) => {
      this.off(eventName, wrapper);
      callback(...args);
    };
    wrapper.listener = callback;
    this.on(eventName, wrapper);
  }

  /**
   * 取消事件订阅
   * @param {String} eventName - 事件名称
   * @param {Function} callback - 要取消的事件回调函数
   */
  off(eventName, callback) {
    if (typeof eventName !== 'string' || typeof callback !== 'function') {
      throw new TypeError('Invalid arguments: eventName must be a string and callback must be a function');
    }
    if (this.events[eventName]) {
      this.events[eventName] = this.events[eventName].filter(fn => {
        return fn !== callback && fn.listener !== callback;
      });
    }
  }

  /**
   * 清空所有事件订阅
   */
  removeAllListeners() {
    this.events = {};
  }
}

/**
 * events 基本使用
 */
class MyEmitter extends EventEmitter {}

const myEmitter = new MyEmitter();

const sleep = (name) => {
  console.log(name, 'sleep!');
};

const eat = (name) => {
  console.log(name, 'eat!');
};

const study = (name) => {
  console.log(name, 'study!');
};

// 是在绑定之前触发
myEmitter.on('newListener', (type) => {
  console.log(type);
  process.nextTick(() => {
    myEmitter.emit(type, 'test');
  });
});

// 订阅事件
myEmitter.on('sleep', sleep);
myEmitter.on('eat', eat);

// 订阅只触发一次的事件
myEmitter.once('study', study);

// 取消事件订阅
// myEmitter.off('study', study);

// 触发事件
myEmitter.emit('sleep', 'test1');
myEmitter.emit('eat', 'test2');
myEmitter.emit('study', 'test4');
myEmitter.emit('study', 'test5');
```

## 参考
[events | Node.js API 文档](http://nodejs.cn/api/events.html)

# http
## 参考
[http | Node.js API 文档](http://nodejs.cn/api/http.html)

# process
## 参考
[process | Node.js API 文档](http://nodejs.cn/api/process.html)

# querystring
## 参考
[querystring | Node.js API 文档](http://nodejs.cn/api/querystring.html)

# stream
## 参考
[stream | Node.js API 文档](http://nodejs.cn/api/stream.html)

# url
## 参考
[url | Node.js API 文档](http://nodejs.cn/api/url.html)

# util
## 参考
[util | Node.js API 文档](http://nodejs.cn/api/util.html)

