# Node.js I/O 体系：Buffer/Stream/path/fs 全解析与背压机制（面试收藏级）

> **副标题**：Buffer 二进制数据处理、Stream 四种类型与管道、fs 同步异步 API、背压（backpressure）机制原理

> 面试官说「聊聊 Node 怎么读一个 10GB 的日志文件」，多数人只能憋出一句「用 Stream 流式读」。能说清「为什么读大文件不能用 `readFile`」「背压到底背的是什么」「`highWaterMark` 是容量上限还是触发阈值」的人，才真正掌握了 Node 的 I/O 内核。

---

## 🎯 这篇文章解决什么问题

前端转 Node 的开发者，最先被问倒的往往不是业务逻辑，而是 **I/O 这条硬骨头**：为什么处理二进制要用 `Buffer` 而不是普通数组？`fs` 的同步和异步到底差在哪？`pipe` 凭什么能读大文件不爆内存？背压机制到底是怎么运转的？

这篇文章是「Node.js 全栈深度拆解」系列的第 4 篇，讲透 Node I/O 能力层的四个模块，串成一条主线：

**数据在 Node 里如何「表示（Buffer）→ 定位（path）→ 读写（fs）→ 流式高效处理（Stream）」**。

它聚焦纯 I/O 机制，只回答一个问题——**Node 怎么高效读写大量二进制/文件数据而不爆内存**。涉及 HTTP 语义的综合实战（静态资源服务器的 `Content-Type`/`Range`/`ETag`）放到第 5 篇末尾与 `apps/his-api` 项目一起落地，避免在「I/O 体系」标题下讲偏题。

---

## 一、使用与实践

先用起来，再钻原理。这一章把四个模块的 API 用法过一遍，都用医疗场景命名落地。

### Buffer 的三种定义方式

`Buffer` 是 Node 处理二进制数据的核心类型。创建它的方式有三种，对应三种不同的数据来源：

```javascript
// 1. 通过长度定义：分配一个 6 字节的缓冲区
let buf1 = Buffer.alloc(6)

// 2. 通过字符串创建：字符串会被按编码转成字节
let buf2 = Buffer.from('测试')

// 3. 通过数组定义：每个元素是一个字节，正常范围 0-255
let buf3 = Buffer.from([65, 66, 67])
```

`Buffer.from([65,66,67])` 里 65/66/67 正好是 `A`/`B`/`C` 的 ASCII 码，所以 `buf3.toString()` 会得到 `ABC`。这是理解「字节」和「字符」关系的第一步。

### Buffer 的常用方法

`Buffer` 的方法大致可以分成三类——创建、读取/转换、操作：

| 类别 | 方法 | 作用 |
|------|------|------|
| 创建 | `Buffer.alloc(n)` | 分配 n 字节并**清零** |
| 创建 | `Buffer.allocUnsafe(n)` | 分配 n 字节**不清零**（快，但可能读到旧数据） |
| 创建 | `Buffer.from(x)` | 从字符串/数组/另一个 Buffer 创建 |
| 创建 | `Buffer.concat(list)` | 拼接多个 Buffer |
| 读取 | `buf.toString()` | 按编码解码成字符串 |
| 读取 | `buf.slice()` | 截取子 Buffer（**共享内存**，不是拷贝） |
| 读取 | `buf.indexOf()` | 查找字节位置 |
| 操作 | `buf.copy(target)` | 拷贝到目标 Buffer |
| 操作 | `buf.fill(value)` | 用某个值填充 |
| 操作 | `buf.write(str)` | 从指定位置写入字符串 |
| 查询 | `Buffer.byteLength(x)` | 计算字节长度 |
| 判断 | `Buffer.isBuffer(x)` | 判断是否是 Buffer |
| 比较 | `Buffer.compare(a, b)` | 比较两个 Buffer |

> 💬 **面试官**：`Buffer.alloc` 和 `Buffer.allocUnsafe` 有什么区别？
>
> ✅ 标准答案：`alloc` 会把分配的内存**清零初始化**（安全但稍慢），`allocUnsafe` **不做清零**（更快，但新内存里可能残留上次使用留下的旧数据，直接读取会读到脏数据）。所以性能敏感且立即要写满的场景可以用 `allocUnsafe`，读的场景必须用 `alloc`。
>
> 🎁 加分答案：能说出 `allocUnsafe` 的「脏数据」本质——它分配的是操作系统「回收但还没清零」的内存页，如果这段内存之前被别的进程写过敏感数据（比如密码），你就能读到它。这是它「不安全」名字的由来。

### 字节序：大小端

`writeInt8` 一次写入一个 8 位有符号整数，`writeInt16BE/LE` 一次写入 16 位，`BE`/`LE` 代表字节序：

```javascript
// 通过指定的 offset 将 value 写入到 Buffer 中
let buf = Buffer.alloc(4)
buf.writeInt8(0, 0)     // 0
buf.writeInt8(16, 1)    // 16
buf.writeInt8(32, 2)    // 32
buf.writeInt8(48, 3)    // 48
console.log(buf)                 // <Buffer 00 10 20 30>
console.log(buf.readInt8(0))     // 0
console.log(buf.readInt8(1))     // 16
console.log(buf.readInt8(2))     // 32
console.log(buf.readInt8(3))     // 48
```

「字节序」指的是**整数在内存中保存的顺序**——高位字节存前面还是存后面：

- **Big-endian（大端）**：高序字节存在起始地址（高位在前）
- **Little-endian（小端）**：低序字节存在起始地址（低位在前）

```javascript
let buffer = Buffer.alloc(4)
buffer.writeInt16BE(2 ** 8, 0) // 256，写入偏移 0
console.log(buffer)            // <Buffer 01 00 00 00>
console.log(buffer.readInt16BE(0)) // 256

buffer.writeInt16LE(2 ** 8, 2) // 256，写入偏移 2
console.log(buffer)            // <Buffer 01 00 00 01>
console.log(buffer.readInt16LE(2)) // 256
```

同样是 256（十六进制 `0x0100`），大端存成 `01 00`，小端存成 `00 01`。网络协议通常约定大端（「网络字节序」），x86 架构 CPU 内存里通常是小端，所以「跨网络传二进制」时要留意字节序的转换。

### 截取乱码问题与 StringDecoder

中文在 UTF-8 里一个字占 3 字节。如果按字节硬切，可能把一个汉字切成两半，解码就乱码了：

```javascript
let buffer = Buffer.from('珠峰架构')
let subBuffer = buffer.slice(0, 6)
console.log(subBuffer.toString()) // 正常显示「珠峰」
```

当切的位置恰好落在多字节字符中间时就会出问题。`string_decoder` 模块的 `StringDecoder` 专门解决这个——它内部缓存未凑整的字节，等下次 `write` 再拼上：

```javascript
let { StringDecoder } = require('string_decoder')
let sd = new StringDecoder()
let buffer = Buffer.from('珠峰')
console.log(sd.write(buffer.slice(0, 4))) // 只输出能解码的部分
console.log(sd.write(buffer.slice(4)))    // 剩下的字节拼上后再解码
```

### 医疗场景：读医学影像的字节流与 GBK 转码

一个真实落地：老系统的医学影像报告是 GBK 编码的文本文件，Node 原生不支持 GBK，需要用 `iconv-lite` 转成 UTF-8 才能正确处理：

```javascript
var iconv = require('iconv-lite')
function readGBKText(pathname) {
  var bin = fs.readFileSync(pathname)
  return iconv.decode(bin, 'gbk')
}
```

这里 `fs.readFileSync` 读出来的是一个 `Buffer`（原始字节），`iconv.decode` 把它按 GBK 解码成字符串。**「Buffer 存的是字节，字符串是字节按某种编码解码后的结果」**——这个区分贯穿整篇。

### path：跨平台路径处理

`path` 是 Node 专门处理路径的核心模块，解决了 Windows 用 `\`、Linux/macOS 用 `/` 的跨平台差异。最常用的几个：

```javascript
var path = require('path')

// normalize 把非标准路径转成标准路径：解析 . 和 ..、多个斜杠合成一个、Windows 反斜杠转成正斜杠
console.log(path.normalize('./a////b//..\\c//e//..//'))
// \a\c\

// join 把多个参数字符串拼成一个路径
console.log(path.join(__dirname, 'a', 'b'))

// resolve 以应用根目录为起点，解析出绝对路径
console.log(path.resolve())          // 空代表当前目录路径
console.log(path.resolve('a', '/c')) // /c 开头代表绝对路径根目录

// relative 获取两个路径之间的相对关系
console.log(path.relative(__dirname, '/a'))

// dirname 返回路径所在目录
console.log(path.dirname(__filename))

// basename 获取文件名
console.log(path.basename(__filename))
console.log(path.basename(__filename, '.js')) // 去掉扩展名

// extname 获取扩展名
console.log(path.extname(__filename))

// sep / delimiter：系统分隔符
console.log(path.sep)          // 文件分隔符：Windows \，Linux /
console.log(path.win32.sep)    // 强制 Windows 分隔符
console.log(path.posix.sep)    // 强制 Linux 分隔符
console.log(path.delimiter)    // 环境变量路径分隔符：Windows ;，Linux :
```

> 💬 **面试官**：`path.join` 和 `path.resolve` 有什么区别？
>
> ✅ 标准答案：`join` 只是把多个片段**拼接**成一个路径（并做规范化），`resolve` 会把结果解析成一个**绝对路径**——从右往左处理参数，直到遇到一个绝对路径或拼完所有参数，再以当前工作目录为基准拼接。
>
> 🎁 加分答案：能说出 `resolve` 的「从右往左」规则和它的一个经典坑——`path.resolve('a', '/c')` 结果是 `/c` 而不是 `当前目录/a/c`，因为 `/c` 是绝对路径，它「截断」了左边的 `a`。

### fs：同步 vs 异步

`fs` 模块做文件与目录的创建、写入、删除。**所有方法都分同步和异步两种**——带 `sync` 后缀的是同步（阻塞），不带的是异步：

```javascript
// 异步读取
fs.readFile(path[, options], callback)

// 同步读取（阻塞事件循环）
fs.readFileSync(path[, options])
```

异步写和同步写同理：

```javascript
let fs = require('fs')

// 异步写入：flag 'a' 表示追加
fs.writeFile('./1.txt', Date.now() + '\n', { flag: 'a' }, function () {
  console.log('ok')
})

// 同步写入
fs.writeFileSync(file, data[, options])

// 追加
fs.appendFile('./1.txt', Date.now() + '\n', function () {
  console.log('ok')
})
```

`flag` 决定打开文件的行为，是读写文件时的关键参数：

| 符号 | 含义 |
|------|------|
| r | 读文件，文件不存在报错 |
| r+ | 读写，文件不存在报错 |
| w | 写入，不存在则创建，存在则清空 |
| w+ | 读写，不存在则创建，存在则清空 |
| a | 追加写入 |
| a+ | 读取并追加写入 |
| x | 排它方式（存在则失败） |

助记口诀：**r 读、w 写、s 同步、+ 增加相反操作、x 排他**。一个常见辨析点——`r+` 和 `w+` 的区别：文件不存在时 `r+` 报错而 `w+` 会创建；文件存在时 `r+` 不清空、`w+` 会清空。

### fs：文件描述符与底层读写

除了 `readFile`/`writeFile` 这种「一把梭」的整体读写，fs 还提供基于**文件描述符（FileDescriptor）**的底层操作。先 `open` 拿到 fd，再用 `read`/`write` 精确读写指定位置：

```javascript
// fs.open(filename, flags, [mode], callback)
fs.open('./1.txt', 'r', 0600, function (err, fd) {})
```

文件描述符是操作系统分配给已打开文件的整数句柄，代表这个文件。三个特殊的标准描述符要记住：

- `0`（stdin）—— 标准输入（键盘）
- `1`（stdout）—— 标准输出（屏幕）
- `2`（stderr）—— 标准错误输出（屏幕）

```javascript
const fs = require('fs')
const path = require('path')
fs.open(path.join(__dirname, '1.txt'), 'r', 0o666, function (err, fd) {
  console.log(err)
  let buf = Buffer.alloc(6)
  // 从 fd 读取 6 字节，写入 buf 的 0~6 位置，文件偏移从 3 开始
  fs.read(fd, buf, 0, 6, 3, function (err, bytesRead, buffer) {
    console.log(bytesRead)       // 6
    console.log(buffer === buf)  // true
    console.log(buf.toString())  // 峰培
  })
})
```

对应地，`fs.write(fd, buffer, offset, length, position, callback)` 把 Buffer 写入文件的指定位置。完整的底层流程是 **open → read/write → fsync（刷盘）→ close**：

```javascript
let buf = Buffer.from('珠峰培训')
fs.open('./2.txt', 'w', function (err, fd) {
  fs.write(fd, buf, 3, 6, 0, function (err, written, buffer) {
    console.log(written)
    fs.fsync(fd, function (err) {   // 把缓冲刷到磁盘
      fs.close(fd, function (err) { // 关闭描述符
        console.log('写入完毕!')
      })
    })
  })
})
```

### fs：目录操作

目录的创建、查询、删除也是一组对称 API：

```javascript
fs.mkdir(path[, mode], callback)      // 创建目录（要求父目录已存在）
fs.access(path[, mode], callback)     // 判断是否有权限访问
fs.readdir(path[, options], callback) // 读取目录下所有文件
fs.stat(path, callback)               // 查看文件/目录信息
fs.rename(oldPath, newPath, callback) // 移动文件或目录
fs.unlink(path, callback)             // 删除文件
fs.ftruncate(fd[, len], callback)     // 截断文件
fs.watchFile(filename[, options], listener) // 监视文件/目录
```

`fs.stat` 返回的 `stats` 对象能区分文件类型，并带三个时间戳：

```javascript
stats.isFile()       // 是否文件
stats.isDirectory()  // 是否目录
// atime(Access Time)：上次被读取的时间
// ctime(Change Time)：属性或内容上次被修改的时间
// mtime(Modified time)：文件内容上次被修改的时间
```

一个实用例子：权限判断，`fs.access` 配合 `fs.constants` 检查可读可写：

```javascript
fs.access('/etc/passwd', fs.constants.R_OK | fs.constants.W_OK, (err) => {
  console.log(err ? 'no access!' : 'can read/write')
})
```

监视文件变化（比如医疗系统里监听配置或数据文件被改动）：

```javascript
let fs = require('fs')
fs.watchFile('1.txt', (curr, prev) => {
  // parse() 解析日期时间字符串，返回距 1970/1/1 的毫秒数
  if (Date.parse(prev.ctime) == 0) {
    console.log('创建')
  } else if (Date.parse(curr.ctime) == 0) {
    console.log('删除')
  } else if (Date.parse(prev.ctime) != Date.parse(curr.ctime)) {
    console.log('修改')
  }
})
```

### fs：递归创建目录（三种写法）

`fs.mkdir` 要求父目录已存在，所以递归创建多级目录需要自己循环。同步版：

```javascript
let fs = require('fs')
let path = require('path')
function makepSync(dir) {
  let parts = dir.split(path.sep)
  for (let i = 1; i <= parts.length; i++) {
    let parent = parts.slice(0, i).join(path.sep)
    try {
      fs.accessSync(parent)
    } catch (error) {
      fs.mkdirSync(parent)
    }
  }
}
```

异步版（回调串联）：

```javascript
function makepAsync(dir, callback) {
  let parts = dir.split(path.sep)
  let i = 1
  function next() {
    if (i > parts.length)
      return callback && callback()
    let parent = parts.slice(0, i++).join(path.sep)
    fs.access(parent, err => {
      if (err) {
        fs.mkdir(parent, next)
      } else {
        next()
      }
    })
  }
  next()
}
```

Async/Await 版（Promise 化 + 顺序 await）：

```javascript
async function mkdir(parent) {
  return new Promise((resolve, reject) => {
    fs.mkdir(parent, err => {
      if (err) reject(err)
      else resolve()
    })
  })
}

async function access(parent) {
  return new Promise((resolve, reject) => {
    fs.access(parent, err => {
      if (err) reject(err)
      else resolve()
    })
  })
}

async function makepPromise(dir, callback) {
  let parts = dir.split(path.sep)
  for (let i = 1; i <= parts.length; i++) {
    let parent = parts.slice(0, i).join(path.sep)
    try {
      await access(parent)
    } catch (err) {
      await mkdir(parent)
    }
  }
}
```

> 提醒一句：现代 Node 里 `fs.mkdir` 已经支持 `{ recursive: true }` 选项，一次调用就能递归创建，上面这些手写版本主要用于理解「递归 + 回调串联」的思路，生产代码直接用 `recursive: true` 即可。

### fs：目录遍历算法（深度优先 × 广度优先）

目录是一棵**树**。遍历时通常用「深度优先 + 先序遍历」——到达一个节点后先遍历子节点而非邻居节点，「首次到达就算遍历完成」。下面这棵树的遍历顺序是 `A → B → D → E → C → F`：

```plain
        A
       / \
      B   C
     / \   \
    D   E   F
```

四种实现（同步/异步 × 深度/广度）构成了一个完整的对比矩阵。**同步深度优先 + 先序**：

```javascript
function deepSync(dir) {
  console.log(dir)
  fs.readdirSync(dir).forEach(file => {
    let child = path.join(dir, file)
    let stat = fs.statSync(child)
    if (stat.isDirectory()) {
      deepSync(child)
    } else {
      console.log(child)
    }
  })
}
```

**异步深度优先 + 先序**（回调串联保证顺序）：

```javascript
function deep(dir, callback) {
  console.log(dir)
  fs.readdir(dir, (err, files) => {
    !function next(index) {
      if (index == files.length) {
        return callback()
      }
      let child = path.join(dir, files[index])
      fs.stat(child, (err, stat) => {
        if (stat.isDirectory()) {
          deep(child, () => next(index + 1))
        } else {
          console.log(child)
          next(index + 1)
        }
      })
    }(0)
  })
}
```

**同步广度优先**（用队列 + `shift`）：

```javascript
function wideSync(dir) {
  let dirs = [dir]
  while (dirs.length > 0) {
    let current = dirs.shift()
    console.log(current)
    let stat = fs.statSync(current)
    if (stat.isDirectory()) {
      let files = fs.readdirSync(current)
      files.forEach(item => {
        dirs.push(path.join(current, item))
      })
    }
  }
}
```

**异步广度优先**（回调驱动，逻辑更绕）：

```javascript
function wide(dir, cb) {
  console.log(dir)
  cb && cb()
  fs.readdir(dir, (err, files) => {
    !function next(i) {
      if (i >= files.length) return
      let child = path.join(dir, files[i])
      fs.stat(child, (err, stat) => {
        if (stat.isDirectory()) {
          wide(child, () => next(i + 1))
        } else {
          console.log(child)
          next(i + 1)
        }
      })
    }(0)
  })
}
wide(path.join(__dirname, 'a'))
```

四种实现的对照关系，用一张表记住：

| 策略 | 同步 | 异步 |
|------|------|------|
| 深度优先 | `deepSync`（递归 + 先序） | `deep`（回调串联 `next`） |
| 广度优先 | `wideSync`（队列 `shift`） | `wide`（回调驱动） |

**深度优先**的本质是「递归下沉，先探到叶子再回头」；**广度优先**的本质是「用队列一层层铺开」。理解这两种遍历，是后面理解「递归删除目录」的基础。

### fs：递归删除目录（六种实现）

删除非空目录不能直接 `rmdir`，必须先删光里面的文件和子目录——本质上还是「遍历 + 删除」。六种实现覆盖了「深度优先/广度优先 × 同步/异步/并行」的组合。

**同步深度优先**（递归下沉，先删子节点再删自己）：

```javascript
let fs = require('fs')
let path = require('path')
function rmSync(dir) {
  try {
    let stat = fs.statSync(dir)
    if (stat.isFile()) {
      fs.unlinkSync(dir)
    } else {
      let files = fs.readdirSync(dir)
      files
        .map(file => path.join(dir, file))
        .forEach(item => rmSync(item))
      fs.rmdirSync(dir)
    }
  } catch (e) {
    console.log('删除失败!')
  }
}
rmSync(path.join(__dirname, 'a'))
```

**异步 Promise 版**（子目录用 `Promise.all` 并行删除，删完再删自己）：

```javascript
function rmPromise(dir) {
  return new Promise((resolve, reject) => {
    fs.stat(dir, (err, stat) => {
      if (err) return reject(err)
      if (stat.isDirectory()) {
        fs.readdir(dir, (err, files) => {
          let paths = files.map(file => path.join(dir, file))
          let promises = paths.map(p => rmPromise(p))
          Promise.all(promises).then(() => fs.rmdir(dir, resolve))
        })
      } else {
        fs.unlink(dir, resolve)
      }
    })
  })
}
rmPromise(path.join(__dirname, 'a')).then(() => {
  console.log('删除成功')
})
```

**异步串行深度优先**（`next` 回调逐个串联，删完一个再删下一个）：

```javascript
function rmAsyncSeries(dir, callback) {
  setTimeout(() => {
    fs.stat(dir, (err, stat) => {
      if (err) return callback(err)
      if (stat.isDirectory()) {
        fs.readdir(dir, (err, files) => {
          let paths = files.map(file => path.join(dir, file))
          function next(index) {
            if (index >= files.length) return fs.rmdir(dir, callback)
            let current = paths[index]
            rmAsyncSeries(current, () => next(index + 1))
          }
          next(0)
        })
      } else {
        fs.unlink(dir, callback)
      }
    })
  }, 1000)
}

console.time('cost')
rmAsyncSeries(path.join(__dirname, 'a'), err => {
  console.timeEnd('cost')
})
```

**异步并行深度优先**（`done` 计数，所有子目录删完才删自己）：

```javascript
function rmAsyncParallel(dir, callback) {
  setTimeout(() => {
    fs.stat(dir, (err, stat) => {
      if (err) return callback(err)
      if (stat.isDirectory()) {
        fs.readdir(dir, (err, files) => {
          let paths = files.map(file => path.join(dir, file))
          if (paths.length > 0) {
            let i = 0
            function done() {
              if (++i == paths.length) {
                fs.rmdir(dir, callback)
              }
            }
            paths.forEach(p => rmAsyncParallel(p, done))
          } else {
            fs.rmdir(dir, callback)
          }
        })
      } else {
        fs.unlink(dir, callback)
      }
    })
  }, 1000)
}
console.time('cost')
rmAsyncParallel(path.join(__dirname, 'a'), err => {
  console.timeEnd('cost')
})
```

**同步广度优先**（先铺开收集所有节点，再倒序删除——保证先删子再删父）：

```javascript
function rmSync(dir) {
  let arr = [dir]
  let index = 0
  while (arr[index]) {
    let current = arr[index++]
    let stat = fs.statSync(current)
    if (stat.isDirectory()) {
      let dirs = fs.readdirSync(current)
      arr = [...arr, ...dirs.map(d => path.join(current, d))]
    }
  }
  let item
  while (null != (item = arr.pop())) {
    let stat = fs.statSync(item)
    if (stat.isDirectory()) {
      fs.rmdirSync(item)
    } else {
      fs.unlinkSync(item)
    }
  }
}
```

**异步广度优先**（先广度收集，再 `pop` 倒序删）：

```javascript
function rmdirWideAsync(dir, callback) {
  let dirs = [dir]
  let index = 0
  function rmdir() {
    let current = dirs.pop()
    if (current) {
      fs.stat(current, (err, stat) => {
        if (stat.isDirectory()) {
          fs.rmdir(current, rmdir)
        } else {
          fs.unlink(current, rmdir)
        }
      })
    }
  }
  !function next() {
    let current = dirs[index++]
    if (current) {
      fs.stat(current, (err, stat) => {
        if (err) callback(err)
        if (stat.isDirectory()) {
          fs.readdir(current, (err, files) => {
            dirs = [...dirs, ...files.map(item => path.join(current, item))]
            next()
          })
        } else {
          next()
        }
      })
    } else {
      rmdir()
    }
  }()
}
```

六种实现的维度对照：

| 维度 | 深度优先 | 广度优先 |
|------|---------|---------|
| 同步 | `rmSync`（递归） | `rmSync`（队列 + 倒序 pop） |
| 异步串行 | `rmAsyncSeries`（next 串联） | — |
| 异步并行 | `rmAsyncParallel` / `rmPromise` | `rmdirWideAsync` |

> 一个共同的「正确性」要点：**删除目录必须「先删子节点、再删父节点」**。深度优先靠「递归返回后再 `rmdir` 自己」天然满足；广度优先则靠「先收集到数组、再 `pop` 倒序删除」来保证——因为广度铺开时父节点一定排在子节点前面，倒序 `pop` 就变成了先删子再删父。

### Stream：读大文件的正确姿势

前面 `readFile` 是把整个文件一次性读进内存，读 10GB 的文件会直接内存爆炸。正确姿势是 `createReadStream`——它按块读取，一次只读一小段：

```javascript
// 创建可读流
var rs = fs.createReadStream(path, [options])

// 监听 data 事件：每读到一块就触发一次
rs.on('data', function (data) {
  console.log(data)
})

// 监听 end 事件：读完了
rs.on('end', function () {
  console.log('读取完成')
})

// 监听 error 事件
rs.on('error', function (err) {
  console.log(err)
})

// 监听 open / close 事件
rs.on('open', function () {})
rs.on('close', function () {})
```

`options` 常用参数：`flags`（默认 `'r'`）、`encoding`（默认 `null`）、`start`/`end`（读取的起止索引）、`highWaterMark`（每次读取的块大小，默认 64KB）。

```javascript
let fs = require('fs')
let rs = fs.createReadStream('./1.txt', {
  start: 3,
  end: 8,
  encoding: 'utf8',
  highWaterMark: 3
})
rs.on('data', function (data) {
  console.log(data)
})
```

> 一个容易踩的坑：如果指定了 `utf8` 编码，`highWaterMark` 要大于 3 字节，否则一个中文（3 字节）可能被切成两半导致乱码。

流还能手动暂停和恢复：

```javascript
rs.on('data', function (data) {
  rs.pause()   // 暂停读取
  console.log(data)
})
setTimeout(function () {
  rs.resume()  // 2 秒后恢复
}, 2000)
```

### Stream：可写流与 pipe

对应地，`createWriteStream` 把数据分块写入：

```javascript
var ws = fs.createWriteStream(path, [options])
```

`write` 方法返回一个**布尔值**，这个返回值是后面背压机制的关键：

```javascript
ws.write(chunk, [encoding], [callback])
// 返回 true：内部缓冲区未满；返回 false：缓冲区已满
```

`end` 方法表示「写完收工」：

```javascript
ws.end(chunk, [encoding], [callback])
```

把可读流和可写流串起来的 `pipe`，一句话就能读大文件不爆内存：

```javascript
var from = fs.createReadStream('./1.txt')
var to = fs.createWriteStream('./2.txt')
from.pipe(to)
```

配套的 `unpipe` 解除绑定、`cork`/`uncork` 控制缓冲批量输出：

```javascript
// unpipe：解除之前 pipe 绑定的流
setTimeout(() => {
  console.log('关闭向 2.txt 的写入')
  from.unpipe(to)
  console.log('手工关闭文件流')
  to.end()
}, 1000)

// cork：强制把写入数据暂存到内存缓冲，uncork 再一次性输出
stream.cork()
stream.write('1')
stream.write('2')
process.nextTick(() => stream.uncork())
```

---

## 二、设计与原理

用过了 API，这一章钻到「为什么这么设计」的底层。这是本篇知识密度最高、也是面试最深的章节。

### 编码发展史：Buffer 为什么存在

要理解 `Buffer`，先理解「字符」和「字节」的区别。一个字节由 8 个位组成，而不同编码里一个字占的字节数不同——`gbk` 中一个汉字 2 字节，`utf8` 中一个汉字 3 字节。编码的演进史就是「怎么用字节表示字符」的演进史：

- `ASCII`：最早的编码，1 字节表示一个英文字符
- `GB2312`：中文编码第一代，收录常用汉字
- `GBK`：GB2312 的扩展
- `GB18030`：最新国标
- `Unicode`：统一所有字符的「字符集」，给每个字符一个唯一编号
- `UTF-8`：Unicode 的一种「编码方式」，变长（1~4 字节）表示

关键区别：**Unicode 是「字符集」（字符 → 编号），UTF-8 是「编码方式」（编号 → 字节）**。Node 里字符串在内存中是 UTF-16，而文件、网络传输里的字节多是 UTF-8，这中间的转换靠 `Buffer` 完成。Node 不支持 GBK 编码，所以读 GBK 文件要借助 `iconv-lite` 转码（见「一」里的例子）。

### 进制转化：字节的本质是数字

`Buffer` 里每个字节就是一个 0~255 的整数。进制转化是理解二进制的工具：

```javascript
// 任意进制 → 十进制
console.log(parseInt('20', 10))  // 20
console.log(parseInt('11', 2))   // 3
console.log(parseInt('20', 16))  // 32

// 十进制 → 任意进制
console.log((3).toString(2))     // 11
console.log(3..toString(2))      // 11
console.log((77).toString(8))    // 115
console.log((77).toString(16))   // 4d
console.log((17).toString(8))    // 21
```

### Buffer 的本质：堆外内存

这是本篇第一个核心原理。**`Buffer` 是 Node 里表示固定长度二进制数据的类型，底层基于 V8 的 `ArrayBuffer` 分配在堆外内存——不占用 V8 堆内存的限制。**

这句话有两层意思：

- **固定长度**：`Buffer` 创建后大小不变，不像普通数组可以动态增减。
- **堆外内存**：V8 的堆内存有上限（64 位系统默认约 2GB 或 4GB，受 `--max-old-space-size` 控制），而 `Buffer` 分配在 V8 堆之外，不受这个限制。Node 处理大量二进制（网络包、文件）时，`Buffer` 既不会触发频繁的 V8 GC，也不会受堆内存上限的钳制——这是它性能和内存表现更好的根因。

用一个图看清「普通数组」和「Buffer」在内存上的本质差异：

```plain
  V8 堆内存（有上限 ~2GB，GC 管理）           V8 堆之外（操作系统直接分配）
  ┌──────────────────────────────┐
  │  普通数组：元素是 JS 对象       │
  │  [obj][obj][obj]...           │    ┌──────────────────────────┐
  │  每个数字都包成 Number 对象     │    │  Buffer：连续的内存块       │
  │  占 V8 堆、触发 GC             │    │  [e7][8f][a0][00][01]... │
  │                              │    │  每个字节 = 一个 0~255 整数 │
  │  ← 受 max-old-space 钳制 ───  │    │  不占 V8 堆、不触发 GC     │
  └──────────────────────────────┘    └──────────────────────────┘
```

左边是普通数组——存 1 万个整数，就是 1 万个 JS Number 对象，全在 V8 堆里，受堆上限钳制、被 GC 扫描。右边是 `Buffer`——一块连续的内存，存 1 万个字节就是 1 万个字节，在 V8 堆之外，既不占堆配额、也不被 GC 扫描。

> 💬 **面试官**：Buffer 和普通数组有什么区别？为什么处理二进制要用 Buffer 而不是普通数组？
>
> ✅ 标准答案：Buffer 是固定长度的二进制数据，每个元素是 0~255 的整数；底层基于 `ArrayBuffer` 分配在堆外内存，不受 V8 堆内存限制。普通数组的元素是 JS 对象，存储整数有对象包装开销，无法高效承载大量字节。
>
> 🎁 加分答案：能说出两点——① Buffer 在堆外，处理 GB 级数据不会挤爆 V8 堆、不触发频繁 GC；② Buffer 是 Node 与底层 C++ 交换二进制数据（读文件、收网络包）的「天然载体」，`fs`/`net` 模块的数据本来就是 Buffer，用数组还要来回转换。

### base64：3 字节变 4 字符的原理

Base64 是网络上最常见的二进制编码方式，把二进制数据用 64 个可打印字符表示。原理是**把每 3 个 8bit 的字节，转换为 4 个 6bit 的字节**（3×8 = 4×6 = 24），再把每个 6bit 补两位高位 0，组成 4 个 8bit 的字节，最后查表映射成字符。

用一个图看清「3 字节 → 4 字符」的位重排过程：

```plain
      「珠」的 UTF-8 编码 = 3 个字节 = 24 bit
    ┌────────────┬────────────┬────────────┐
    │    e7      │    8f      │    a0      │
    │ 11100111   │ 10001111   │ 10100000   │
    └────────────┴────────────┴────────────┘
        按 6 位一组重新切分（24 ÷ 6 = 4 组）
      111001   111000   111110   100000
    每组前面补两个 0 → 变成 4 个字节
   00111001 00111000 00111110 00100000
   转十进制：57  56  62  32
   查表（64 个字符）：54+g
```

以「珠」字为例，一步一步推：

```javascript
const buf4 = Buffer.from('珠')
console.log(buf4) // <Buffer e7 8f a0>
console.log(0xe7.toString(2), 0x8f.toString(2), 0xa0.toString(2))
// 11100111 10001111 10100000

// 拼接到一起，每 6 位分割为一个字节
// 111001 111000 111110 100000
// 每个前面补两个 0
// 00111001 00111000 00111110 00100000
// 转成十进制
console.log(parseInt('00111001', 2), parseInt('00111000', 2), parseInt('00111110', 2), parseInt('00100000', 2))
// 57, 56, 62, 32

// 查 64 个编码表
const str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
console.log(str[57] + str[56] + str[62] + str[32]) // 54+g
// 最终 base64 = 54+g（3 个字符变 4 个字符，体积增加了 1/3）
```

手写一个 base64 转换函数，把上面的原理变成代码：

```javascript
const CHARTS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
function transfer(str) {
  let buf = Buffer.from(str)
  let result = ''
  for (let b of buf) {
    result += b.toString(2)   // 每个字节转成 8 位二进制串
  }
  return result.match(/(\d{6})/g).map(val => parseInt(val, 2)).map(val => CHARTS[val]).join('')
}
let r = transfer('a')
console.log(r)
```

> base64 的核心代价：**体积膨胀 1/3**。所以它适合「把二进制塞进文本协议」（比如 JSON 里传图片、URL 里传数据），不适合「省流量」的场景——压缩数据应该用 gzip 这类真正的压缩算法。

### Buffer 的手写方法：理解内存布局

理解 Buffer 的内存布局，最好的方式是手写它的几个方法。

**split**（`slice` + `indexOf` = `split`）：

```javascript
Buffer.prototype.split = function (sep) {
  let arr = []
  let len = Buffer.from(sep).length // 分隔符的长度
  let offset = 0
  let current
  while (-1 != (current = this.indexOf(sep, offset))) {
    arr.push(this.slice(offset, current))
    offset = current + len
  }
  arr.push(this.slice(offset))
  return arr
}
```

**copy**（把源 Buffer 的一段拷贝到目标 Buffer）：

```javascript
Buffer.prototype.copy = function (targetBuffer, targetStart, sourceStart, sourceEnd) {
  for (let i = sourceStart; i < sourceEnd; i++) {
    targetBuffer[targetStart++] = this[i]
  }
}
let buffer = Buffer.from('珠峰')
let subBuffer = Buffer.alloc(6)
buffer.copy(subBuffer, 0, 0, 4) // 珠
buffer.copy(subBuffer, 3, 3, 6) // 峰
console.log(subBuffer.toString()) // 珠峰
```

**concat**（拼接多个 Buffer）：

```javascript
Buffer.concat = function (list) {
  let totalLength = list.reduce((len, item) => len + item.length, 0)
  if (list.length == 0)
    return list[0]
  let newBuffer = Buffer.alloc(totalLength)
  let pos = 0
  for (let buffer of list) {
    for (let byte of buffer) {
      newBuffer[pos++] = byte
    }
  }
  return newBuffer
}
let buffer1 = Buffer.from('珠')
let buffer2 = Buffer.from('峰')
let buffer = Buffer.concat([buffer1, buffer2])
console.log(buffer.toString())
```

还有一个关键细节——`slice` 和 `copy` 的区别：**`slice` 返回的是「共享同一块内存」的视图**（改子 Buffer 会影响到原 Buffer），而 `copy` 是真正的内存拷贝。

### 对比前端：Blob / ArrayBuffer / FileReader

前端的二进制对象和 Buffer 是一脉相承的。最常用的是 `Blob`（Binary Large Object，二进制大对象，不可变，代表文件类型）：

```javascript
// 前端下载 HTML
let str = `<h1>hello world</h1>`
const blob = new Blob([str], { type: 'text/html' })
let a = document.createElement('a')
a.setAttribute('download', 'a.html')
a.href = URL.createObjectURL(blob)
document.body.appendChild(a)
```

文件预览用 `FileReader`：

```javascript
file.addEventListener('change', (e) => {
  let file = e.target.files[0] // 二进制文件类型
  let fileReader = new FileReader()
  fileReader.onload = function () {
    let img = document.createElement('img')
    img.src = fileReader.result
    document.body.appendChild(img)
  }
  fileReader.readAsDataURL(file)
})
```

或用 `createObjectURL`：

```javascript
let r = URL.createObjectURL(file)
let img = document.createElement('img')
img.src = r
document.body.appendChild(img)
URL.revokeObjectURL(r)
```

`ArrayBuffer` 是浏览器中的「裸二进制」，配合 `TypedArray` 视图读写：

```javascript
let buffer = new ArrayBuffer(4) // 创造 4 个字节
let x1 = new Uint8Array(buffer)
x1[0] = 1
x1[1] = 255
console.log(x1) // [1, 255, 0, 0]
let x2 = new Uint16Array(buffer)
console.log(x2) // [65281, 0]
let x3 = new Uint32Array(buffer)
console.log(x3) // [65281]
```

> `ArrayBuffer` 本身不能被直接修改，必须通过 `Uint8Array`/`Uint16Array` 这些「视图」来读写。同一个 `ArrayBuffer` 用不同位宽的视图去读，会得到不同的解读——这就是「字节序 + 位宽」决定数据含义的体现。

字符串和 ArrayBuffer 的互转：

```javascript
function stringToArrayBuffer(str) { // utf16，不管字符还是汉字
  let buffer = new ArrayBuffer(str.length * 2)
  let view = new Uint16Array(buffer)
  for (let i = 0; i < str.length; i++) {
    view[i] = str.charCodeAt(i)
  }
  return buffer
}

function ArrayBufferToString(buf) {
  return String.fromCharCode(...new Uint16Array(buf))
}
```

前端下载二进制文件（`responseType: 'arraybuffer'`），配合后端 `res.download`：

```javascript
function request(url, method = "get") {
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest()
    xhr.open(method, url, true)
    xhr.responseType = 'arraybuffer'
    xhr.onload = function () {
      resolve(xhr.response)
    }
    xhr.send()
  })
}
request('/download').then(arraybuffer => {
  let b = new Blob([arraybuffer])
  let blobUrl = URL.createObjectURL(b)
  let a = document.createElement('a')
  a.href = blobUrl
  a.download = 'a.pdf'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(blobUrl)
})
```

后端对应的下载接口：

```javascript
const express = require('express')
const app = express()
app.listen(4444)
app.use(express.static(__dirname))
app.get('/download', (req, res) => {
  res.download('a.pdf')
})
```

### path 的设计：join 与 resolve 的本质区别

`path.join` 和 `path.resolve` 是 path 模块里最容易混淆的一对。本质区别一句话：

- **`join`**：纯「拼接 + 规范化」，不关心路径是相对还是绝对，结果可能还是相对路径。
- **`resolve`**：以应用根目录为起点，**解析出一个绝对路径**，处理 `..`/`.`/绝对路径片段。

`resolve` 的解析规则：以当前目录为起点，从右往左处理参数，直到拼出一个绝对路径为止。具体说——普通字符串代表当前目录的下级目录，`..` 回到上一级目录，`/` 开头代表绝对路径根目录。

> 生产里的经典坑：`path.join(__dirname, 'a', 'b')` 和 `path.resolve(__dirname, 'a', 'b')` 结果通常一样，但 `path.resolve('a', '/c')` 会返回 `/c`（因为 `/c` 是绝对路径，截断了左边的 `a`），而 `path.join('a', '/c')` 返回 `a/c`。**要「安全的绝对路径」用 resolve，要「纯拼接」用 join**。

### fs 同步 API 阻塞事件循环的代价

这是第二个核心原理。`fs.readFileSync` 会**阻塞整个 Node 主线程直到读取完成**——这期间事件循环完全停摆，无法处理任何其他请求。

用一个时间轴看清「同步阻塞」和「异步不阻塞」的差别：

```plain
  同步 readFileSync：读 50MB 文件期间，整个进程「卡死」
  ┌─────────────────────────────────────────┐
  │ 请求A：readFileSync(50MB) ┄┄┄┄┄┄┄┄┄  │  ← 阻塞，事件循环停摆
  │     请求B / C / D 全部排队等待...        │
  └─────────────────────────────────────────┘
  时间 →───────────────────────────────────→

  异步 readFile：读文件期间，事件循环照常处理别的请求
  ┌─────────────────────────────────────────┐
  │ 请求A：readFile(50MB) ──去 IO── (回调)   │
  │     请求B 正常处理 ✓                     │  ← 不阻塞，B/C/D 照常响应
  │     请求C 正常处理 ✓                     │
  │     请求D 正常处理 ✓                     │
  └─────────────────────────────────────────┘
```

想象一个医疗 HTTP 服务器，医生查一个患者的体检报告 PDF（可能几十 MB），如果用了 `readFileSync`，读文件的这段时间里，所有其他医生的请求全部卡住，整个系统「假死」。

**结论：生产环境的 HTTP 服务器代码中几乎不应该出现同步 fs 调用**，唯一可接受的是「启动阶段读配置文件」这类一次性场景——此时还没开始服务请求，阻塞无伤大雅。

| 场景 | 该用 | 原因 |
|------|------|------|
| HTTP 请求处理里读文件 | `fs.promises.readFile` 或 `createReadStream` | 不能阻塞事件循环 |
| 启动时读配置文件 | `readFileSync` | 一次性、还未服务请求，同步更简单 |
| 大文件（日志/PDF/影像） | `createReadStream` + `pipe` | 分块读，不占内存 |
| 小文件、一次性读写 | `readFile`/`writeFile` | 简单直接 |

> 💬 **面试官**：什么场景下应该用同步 fs API，什么场景绝对不能用？
>
> ✅ 标准答案：同步 fs（`readFileSync` 等）会阻塞事件循环，期间无法处理任何其他请求。所以**生产 HTTP 服务器里绝对不能用**；只有「启动阶段读配置」这类一次性、还没开始服务请求的场景可以用，因为此时阻塞没有代价，代码还更简单。
>
> 🎁 加分答案：能说出「阻塞」的具体后果——同步 fs 读一个慢速磁盘的大文件，会让整个进程所有请求排队等待，P99 延迟飙升，这正是 Node「单线程事件循环」模型的软肋，也是 Node 把 fs 全部做成异步回调 + Promise 双版本的根因。

### Stream 的核心：四种类型 + 两种模式 + 背压

接下来是本篇的灵魂——Stream 的完整机制。

**流的概念**：流是一组**有序的、有起点和终点的字节数据传输手段**。它不关心文件的整体内容，只关心「是否读到了数据、读到后怎么处理」。流是一个抽象接口，Node 里很多对象都实现了它——比如 HTTP 服务器的 `request` 和 `response` 对象就是流。

**四种基本流类型**：

| 类型 | 方向 | 典型场景 |
|------|------|---------|
| Readable | 可读 | `fs.createReadStream()` 读文件 |
| Writable | 可写 | `fs.createWriteStream()` 写文件 |
| Duplex | 可读可写 | `net.Socket`（TCP socket） |
| Transform | 可读可写 + 转换 | `zlib.createGzip()` 压缩 |

四种类型的「方向」关系，用一张图看清：

```plain
  Readable          Writable
  （只能出）          （只能进）
     │                  ▲
     │ data             │ write
     ▼                  │
    ┌──────────────────────┐
    │  Duplex（可出可进，两  │
    │  条独立的通道）        │
    └──────────────────────┘
     ▲                  │
     │ push             │ transform 转换后 push
     │                  ▼
    ┌──────────────────────┐
    │  Transform（可出可进， │
    │  输出由输入计算而来）    │
    └──────────────────────┘
```

Duplex 和 Transform 都是「可读可写」，但本质不同：**Duplex 的读和写是两条互不相关的独立通道**（比如 TCP socket，读到的和写出的是不同的数据）；**Transform 的输出是从输入「计算」出来的**（比如 gzip，输出是输入的压缩结果）。

**两种数据模式**：

- **二进制模式**：每个分块是 Buffer 或 string 对象（默认）。
- **对象模式**（`objectMode`）：流内部处理的是一系列普通 JS 对象。

> 注意：所有用 Node API 创建的流默认只能操作 string 和 Buffer。要处理其他 JS 值，需要在创建流实例时通过 `objectMode: true` 切到对象模式。`null` 在流里有特殊意义（表示流的终点），所以对象流里不能传 `null`。

### 可读流的两种模式与三种状态

可读流工作在两种模式之一：

- **flowing（流动）**：自动从底层读数据，通过 `data` 事件尽快推给应用。
- **paused（暂停）**：必须显式调用 `stream.read()` 手动读数据。

切换到 flowing 的三种途径：监听 `data` 事件、调用 `resume()`、调用 `pipe()`。切回 paused：调用 `pause()`（无管道目标时），或取消 `data` 监听 + `unpipe()`（有管道目标时）。

在底层，`_readableState.flowing` 有**三种状态**，而不是两种：

- `null`：无数据消费者，不产生数据
- `true`：flowing 模式，数据随到随发
- `false`：paused 模式，数据可能堆积在内部缓存

三种状态的切换路径，用一张状态图看清：

```plain
                 监听 data / resume() / pipe()
         ┌──────────────────────────────────┐
         ▼                                  │
      null ────────────► true (flowing) ────┘
      无消费者              │
                           │ pause() / unpipe() / 背压
                           ▼
                       false (paused)
                           │
                           │ resume()
                           └──────────► true
```

> ⚠️ 一个容易误解的点：`flowing` 变成 `false` 时，**数据生成并没有停止**，只是不主动推了，数据会堆积在流的内部缓冲区里。这就是后面背压机制的「暂停」的物理含义。

### highWaterMark：不是容量上限，是触发阈值

`highWaterMark`（高水位线）控制内部缓冲区的大小阈值。关键要纠正一个误区：**它是背压机制触发的阈值参数，而不是流的最大容量硬限制。**

用一张图理解「高水位线」在缓冲区里的位置：

```plain
  可写流内部缓冲区（length = 已缓冲字节数）
  ┌──────────────────────────────────────────┐
  │ ██████████████░░░░░░░░░░░░░░░░░░░░░░░░░ │
  │ ◄── 已缓冲 ──►◄──── 空闲 ────────────► │
  └──────────────────────────────────────────┘
              ▲
              │  highWaterMark 水位线（阈值）
              │
    length < 水位线 → write() 返回 true（继续写）
    length ≥ 水位线 → write() 返回 false（该停了）
```

水位线之上还有大片空间，所以「超阈值」只是「触发背压信号」，不是「满了」。

- 对普通流：`highWaterMark` 指定总字节数（可读流默认 64KB，可写流默认 16KB）。
- 对对象模式流：指定对象的总数。

可读流内部，当 `push(chunk)` 的数据量达到 `highWaterMark` 时，流会暂停从底层读数据（停止调用 `_read`），直到缓冲区数据被消费。可写流内部，`write(chunk)` 时若缓冲区大小**小于** `highWaterMark` 返回 `true`，**达到或超过**则返回 `false`。

> 超过 `highWaterMark` 不代表流「满了」不能写，只是它会返回 `false` 提醒你「该停一下了」。这个「提醒」就是背压信号的来源。

### 背压机制：Node 流式处理的灵魂

这是本篇最核心的原理。**背压（backpressure）解决的是「读多写少」时的流量控制问题。**

场景：从磁盘读一个大文件（快），通过慢速网络写出去（慢）。如果读的速度远超写的速度，且不加控制，未写完的数据会不断在内存里堆积——读得越快、堆得越多，最终内存爆炸。

Node 的解决方式，是一套**完全自动化的暂停/恢复协议**：

1. `writable.write(chunk)` 返回布尔值——当内部缓冲区**超过** `highWaterMark` 阈值时返回 `false`。
2. `pipe()` 内部监听到这个 `false` 信号后，调用 `readable.pause()` **暂停读取**。
3. 等 Writable 把缓冲区消化掉，触发 `drain` 事件（表示「缓冲区排空了，可以继续写」）。
4. `pipe()` 监听到 `drain`，调用 `readable.resume()` **恢复读取**。

这一套「`write` 返回 false → pause → drain → resume」的闭环，就是背压机制的全部。**手写 `pipe` 时必须正确实现这套暂停/恢复逻辑，才能称得上「正确」**——只写 `data` → `write`，忘了 `pause`/`drain`，读大文件照样会内存爆炸。

用一个图来理解这个「流量控制」的闭环：

```plain
Readable 读得快 ──data──>  write() 写进去 ──> Writable 写得慢
     ▲                          │
     │                          │ write() 返回 false（缓冲区超 highWaterMark）
     │                          ▼
   resume() 恢复读取 ◄── drain 事件 ◄── 缓冲区消化完
```

> 💬 **面试官**：什么是背压？如果没有背压控制会出现什么问题？
>
> ✅ 标准答案：背压是「生产者速度」与「消费者能力」不匹配时的流量控制机制。当 Writable 写入速度跟不上 Readable 的产出速度，若不控制，未写完的数据会在内存里不断堆积直到内存爆炸。Node 用 `write()` 返回值 + `pause`/`drain`/`resume` 这套信号，自动让快的一方等慢的一方。
>
> 🎁 加分答案：能完整描述闭环——`write()` 超 `highWaterMark` 返回 `false` → `pipe` 调 `pause()` 暂停读 → `drain` 事件触发（缓冲区消化完）→ `resume()` 恢复读。再补一句：背压思想不只在 Stream 里，前面「并发控制」里「限流让生产者匹配消费者能力」也是背压，二者同源。

> 💬 **面试官**：`pipe()` 内部是怎么实现背压的？`highWaterMark` 具体控制什么？
>
> ✅ 标准答案：`pipe()` 监听 `data` 事件调 `dest.write(data)`，判断返回值——`false` 就 `pause()` 暂停源流，等 `dest` 触发 `drain` 再 `resume()` 恢复。`highWaterMark` 控制内部缓冲区的「高水位线」，是触发背压的阈值，不是最大容量硬限制。
>
> 🎁 加分答案：能说出 `highWaterMark` 默认值（可读流 64KB、可写流 16KB）和它对对象流的意义（对象个数而非字节数），以及「超过阈值只是返回 false，不是拒绝写入」。

### 行读取器 LineReader：流的经典应用

一个把「流」玩到位的经典例子是行读取器——逐行读取文件（比如逐行处理患者的就诊记录）。它需要处理回车换行的历史差异：Unix 用 `\n`（换行），Windows 用 `\r\n`（回车+换行），Mac 老系统用 `\r`（回车）。

为什么会有回车和换行两个字符？这来自打字机时代——「回车」（`\r`，ASCII 13）让打印头回到行首，「换行」（`\n`，ASCII 10）让纸往下走一行。两个动作后来被合并成了「换行」的语义，但历史遗留了两种字节。

```javascript
let fs = require('fs')
let EventEmitter = require('events')
let util = require('util')
util.inherits(LineReader, EventEmitter)

function LineReader(path) {
  EventEmitter.call(this)
  this._rs = fs.createReadStream(path)
  this.RETURN = 0x0D // \r 13
  this.NEW_LINE = 0x0A // \n 10
  this.on('newListener', function (type, listener) {
    if (type == 'newLine') {
      let buffer = []
      this._rs.on('readable', () => {
        let bytes
        while (null != (bytes = this._rs.read(1))) {
          let ch = bytes[0]
          switch (ch) {
            case this.RETURN:
              this.emit('newLine', Buffer.from(buffer))
              buffer.length = 0
              let nByte = this._rs.read(1)
              if (nByte && nByte[0] != this.NEW_LINE) {
                buffer.push(nByte[0])
              }
              break
            case this.NEW_LINE:
              this.emit('newLine', Buffer.from(buffer))
              buffer.length = 0
              break
            default:
              buffer.push(bytes[0])
              break
          }
        }
      })
      this._rs.on('end', () => {
        if (buffer.length > 0) {
          this.emit('newLine', Buffer.from(buffer))
          buffer.length = 0
          this.emit('end')
        }
      })
    }
  })
}

var lineReader = new LineReader('./1.txt')
lineReader.on('newLine', function (data) {
  console.log(data.toString())
}).on('end', function () {
  console.log("end")
})
```

这个实现的精髓：**每次只 `read(1)` 读一个字节**，判断是 `\r`、`\n` 还是普通字符，据此决定「这一行结束」还是「继续累积」。配合 `newListener` 事件做「惰性启动」——只在有人监听 `newLine` 时才真正开始读，省掉无意义的 IO。

### unshift：把数据「反悔」地塞回去

`readable.unshift()` 把一块数据压回内部缓冲区，用在「已经乐观地拉取了数据，又需要反悔」的场景——比如解析 HTTP 请求头时，把「多读的 body 部分」塞回去给后面的解析器用：

```javascript
const { Transform } = require('stream')
const { StringDecoder } = require('string_decoder')
let decoder = new StringDecoder('utf8')
let fs = require('fs')
let rs = fs.createReadStream('./req.txt')

function parseHeader(stream, callback) {
  let header = ''
  rs.on('readable', onReadable)
  function onReadable() {
    let chunk
    while (null != (chunk = rs.read())) {
      const str = decoder.write(chunk)
      if (str.match(/\r\n\r\n/)) {
        const split = str.split(/\r\n\r\n/)
        header += split.shift()
        const remaining = split.join('\r\n\r\n')
        const buf = Buffer.from(remaining, 'utf8')
        rs.removeListener('readable', onReadable)
        if (buf.length) {
          stream.unshift(buf) // 把多读的部分塞回去
        }
        callback(null, header, rs)
      } else {
        header += str
      }
    }
  }
}
parseHeader(rs, function (err, header, stream) {
  console.log(header)
  stream.setEncoding('utf8')
  stream.on('data', function (data) {
    console.log('data', data)
  })
})
```

读取的 `req.txt` 内容是：

```basic
Host: www.baidu.com
User-Agent: curl/7.53.0
Accept: */*

name=zfpx&age=9
```

`\r\n\r\n` 是「请求头结束」的标记（空行）。`parseHeader` 读到空行时，头部解析完毕，但可能把 body 的一部分也读进来了——于是用 `unshift` 把它塞回缓冲区，让后续的 `data` 事件重新读一遍，避免 body 数据丢失。

### 对比前端：两套 Stream 体系正在收敛

浏览器的 `ReadableStream`/`WritableStream`（Web Streams API）和 Node 的 Stream **在设计理念上高度相似**——都要解决「大数据分块处理 + 流量控制」这个共同问题。Node 18+ 也在逐步兼容 Web Streams API（比如 `Readable.toWeb()` / `Readable.fromWeb()`），两套体系正在收敛。

这对前转全栈的开发者是个好消息：理解了 Node 的 Stream，前端 Web Streams 的 `getReader()`/`getWriter()` 也不会觉得陌生——它们只是「同一套思想，两种 API 形态」。

---

## 三、工程落地参考

> 这一章对 nodejs/node 仓库的核心文件做概览级印证，验证前面每一条结论在真实源码里到底长什么样。不贴大段 C++，只看「结论的落点」。

### lib/buffer.js：alloc 与 allocUnsafe 的差异

`Buffer.alloc` 和 `Buffer.allocUnsafe` 的关键差异是**是否清零初始化**：

- `Buffer.alloc(size)`：分配内存后**立即用 0 填充**，安全但多一次清零操作。
- `Buffer.allocUnsafe(size)`：直接从内存池里划出一块**不清零**的内存，快，但里面是「上一任使用者」留下的旧数据。

这是「一、使用与实践」里那个面试题的源码落点。`allocUnsafe` 之所以叫「Unsafe」，就是因为不清零——如果这块内存之前存过敏感数据，你能直接读到。

### lib/internal/streams/readable.js：_readableState 的状态维护

可读流的内部状态都集中在 `_readableState` 对象里，核心字段有三个：

- **`highWaterMark`**：高水位线阈值（默认 64KB，`getHighWaterMark()` 计算）。
- **`buffer`**：内部缓冲队列，`push(chunk)` 时数据先进入这里。
- **`length`**：当前缓冲区里的总字节数。

背压判断的依据就是 `length` 和 `highWaterMark` 的比较：当 `push()` 后 `length` 超过 `highWaterMark`，流就暂停从底层读数据（停止调用 `_read`），等消费者 `read()` 消费掉数据、`length` 降下来再恢复。

### Readable.prototype.pipe：背压的实现核心

`pipe` 的实现核心，是笔记里这段手写版的「官方版」：

```javascript
ReadStream.prototype.pipe = function (dest) {
  this.on('data', (data) => {
    let flag = dest.write(data) // 👈 拿到 write 的返回值
    if (!flag) {
      this.pause()              // 👈 返回 false 就暂停源流
    }
  })
  dest.on('drain', () => {
    this.resume()               // 👈 drain 触发就恢复
  })
  this.on('end', () => {
    dest.end()                  // 👈 读完了，结束目标流
  })
}
```

真实源码 `Readable.prototype.pipe` 比这复杂（处理了错误传播、`unpipe`、清理监听器等），但**核心逻辑就是这三件事**：`write` 返回值判断 → `pause`/`resume` 暂停恢复 → `end` 收尾。理解了这个骨架，就理解了背压的完整闭环。

对应地，可写流内部的 `drain` 触发逻辑（`WriteStream` 的简化版），在 `clearBuffer` 里：

```javascript
clearBuffer() {
  let data = this.buffers.shift()
  if (data) {
    this._write(data.chunk, data.encoding, this.clearBuffer.bind(this))
  } else {
    this.writing = false
    this.emit('drain') // 👈 缓冲区排空，触发 drain
  }
}
```

`buffers` 队列里的数据被一块块写完，当队列清空（`shift()` 拿到 `undefined`）时，`emit('drain')` 通知「可以继续写了」——这正是 `pipe` 里 `resume()` 的触发来源。

---

## 四、实践演示与验证

> 这一章把 Stream 的核心机制完整手写出来，再用「慢速写入」的实验验证背压真的在起作用。对应 `packages/mini-stream`。

### 手写可读流 ReadStream

先手写一个简化版可读流——`open` 打开文件、`read` 读数据、flowing 控制、`data` 事件驱动：

```javascript
let fs = require('fs')
let EventEmitter = require('events')

class ReadStream extends EventEmitter {
  constructor(path, options) {
    super(path, options)
    this.path = path
    this.fd = options.fd
    this.flags = options.flags || 'r'
    this.encoding = options.encoding
    this.start = options.start || 0
    this.pos = this.start
    this.end = options.end
    this.flowing = false
    this.autoClose = true
    this.highWaterMark = options.highWaterMark || 64 * 1024
    this.buffer = Buffer.alloc(this.highWaterMark)
    this.length = 0
    // 监听 data 事件时，自动切到 flowing 并开始读
    this.on('newListener', (type, listener) => {
      if (type == 'data') {
        this.flowing = true
        this.read()
      }
    })
    // 读完自动关闭
    this.on('end', () => {
      if (this.autoClose) {
        this.destroy()
      }
    })
    this.open()
  }

  read() {
    if (typeof this.fd != 'number') {
      return this.once('open', () => this.read()) // 文件还没打开，等 open 后再读
    }
    let n = this.end ? Math.min(this.end - this.pos, this.highWaterMark) : this.highWaterMark
    fs.read(this.fd, this.buffer, 0, n, this.pos, (err, bytesRead) => {
      if (err) return
      if (bytesRead) {
        let data = this.buffer.slice(0, bytesRead)
        data = this.encoding ? data.toString(this.encoding) : data
        this.emit('data', data) // 👈 读到一块就发出去
        this.pos += bytesRead
        if (this.end && this.pos > this.end) {
          return this.emit('end')
        }
        if (this.flowing) this.read() // 👈 flowing 模式下继续读
      } else {
        this.emit('end')
      }
    })
  }

  open() {
    fs.open(this.path, this.flags, this.mode, (err, fd) => {
      if (err) return this.emit('error', err)
      this.fd = fd
      this.emit('open', fd)
    })
  }

  end() {
    if (this.autoClose) this.destroy()
  }

  destroy() {
    fs.close(this.fd, () => {
      this.emit('close')
    })
  }
}

module.exports = ReadStream
```

用起来的效果，和官方 `createReadStream` 一致：

```javascript
let ReadStream = require('./ReadStream')
let rs = new ReadStream('./1.txt', {
  flags: 'r',
  encoding: 'utf8',
  start: 3,
  end: 7,
  highWaterMark: 3
})
rs.on('open', function () { console.log("open") })
rs.on('data', function (data) { console.log(data) })
rs.on('end', function () { console.log("end") })
rs.on('close', function () { console.log("close") })
/**
 * open
 * 456
 * 789
 * end
 * close
 */
```

### 手写可写流 WriteStream

可写流的简化版，核心是 `buffers` 队列 + `clearBuffer` + `write` 返回值 + `drain`：

```javascript
let fs = require('fs')
let EventEmitter = require('events')

class WriteStream extends EventEmitter {
  constructor(path, options) {
    super(path, options)
    this.path = path
    this.fd = options.fd
    this.flags = options.flags || 'w'
    this.mode = options.mode || 0o666
    this.encoding = options.encoding
    this.start = options.start || 0
    this.pos = this.start
    this.writing = false
    this.autoClose = true
    this.highWaterMark = options.highWaterMark || 16 * 1024
    this.buffers = [] // 👈 待写入的缓冲队列
    this.length = 0
    this.open()
  }

  open() {
    fs.open(this.path, this.flags, this.mode, (err, fd) => {
      if (err) return this.emit('error', err)
      this.fd = fd
      this.emit('open', fd)
    })
  }

  write(chunk, encoding, cb) {
    if (typeof encoding == 'function') {
      cb = encoding
      encoding = null
    }
    chunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, this.encoding || 'utf8')
    let len = chunk.length
    this.length += len
    let ret = this.length < this.highWaterMark // 👈 判断缓冲区是否超阈值
    if (this.writing) {
      // 正在写，先入队
      this.buffers.push({ chunk, encoding, cb })
    } else {
      // 空闲，直接写
      this.writing = true
      this._write(chunk, encoding, this.clearBuffer.bind(this))
    }
    return ret // 👈 返回布尔值，这是背压的信号
  }

  _write(chunk, encoding, cb) {
    if (typeof this.fd != 'number') {
      return this.once('open', () => this._write(chunk, encoding, cb))
    }
    fs.write(this.fd, chunk, 0, chunk.length, this.pos, (err, written) => {
      if (err) {
        if (this.autoClose) this.destroy()
        return this.emit('error', err)
      }
      this.length -= written
      this.pos += written
      cb && cb()
    })
  }

  clearBuffer() {
    let data = this.buffers.shift()
    if (data) {
      this._write(data.chunk, data.encoding, this.clearBuffer.bind(this))
    } else {
      this.writing = false
      this.emit('drain') // 👈 队列清空，触发 drain
    }
  }

  end() {
    if (this.autoClose) {
      this.emit('end')
      this.destroy()
    }
  }

  destroy() {
    fs.close(this.fd, () => {
      this.emit('close')
    })
  }
}

module.exports = WriteStream
```

用「`highWaterMark: 3` + 循环写 10 次」验证 `write` 的返回值变化：

```javascript
let FileWriteStream = require('./WriteStream')
let ws = new FileWriteStream('./2.txt', {
  flags: 'w',
  encoding: 'utf8',
  highWaterMark: 3
})
let i = 10
function write() {
  let flag = true
  while (i && flag) {
    flag = ws.write("1", 'utf8', (function (i) {
      return function () { console.log(i) }
    })(i))
    i--
    console.log(flag)
  }
}
write()
ws.on('drain', () => {
  console.log("drain")
  write()
})
/**
 * 10
 * 9
 * 8
 * drain
 * 7
 * 6
 * 5
 * drain
 * 4
 * 3
 * 2
 * drain
 * 1
 */
```

从输出能看到规律：写 3 次后 `write` 返回 `false`（因为 `highWaterMark: 3`，每写一个字节 `length` 就 +1，超过 3 就返回 false），触发一次 `drain` 后又能写 3 次。**「写 → 满 → 停 → drain → 再写」的节奏清晰可见**，这就是背压的微观表现。

### 手写 pipe：背压的正确实现

把手写的 ReadStream 和 WriteStream 串起来，`pipe` 方法本身只需要十几行：

```javascript
ReadStream.prototype.pipe = function (dest) {
  this.on('data', (data) => {
    let flag = dest.write(data)
    if (!flag) {
      this.pause() // 👈 write 返回 false，暂停读
    }
  })
  dest.on('drain', () => {
    this.resume() // 👈 drain 触发，恢复读
  })
  this.on('end', () => {
    dest.end()
  })
}
ReadStream.prototype.pause = function () {
  this.flowing = false
}
ReadStream.prototype.resume = function () {
  this.flowing = true
  this.read()
}
```

配套的 `pause`/`resume` 通过 `flowing` 标志位控制「还要不要继续读」。完整串联起来：

```javascript
let ReadStream = require('./ReadStream')
let FileWriteStream = require('./WriteStream')

let rs = new ReadStream('./1.txt', {
  flags: 'r',
  encoding: 'utf8',
  highWaterMark: 3
})
let ws = new FileWriteStream('./2.txt', {
  flags: 'w',
  encoding: 'utf8',
  highWaterMark: 3
})
rs.pipe(ws)
```

> 关键结论：**只有同时实现了「`write` 返回 false → `pause`」和「`drain` → `resume`」这两条，这个 `pipe` 才算「正确」**。只写 `data` → `write` 而忘了暂停恢复，读大文件照样会把内存撑爆——因为 Readable 会不管不顾地一直读、一直 `emit('data')`。

### 暂停模式：readable 事件 + 手动 read

除了 flowing 模式，可读流还有 paused 模式——用 `readable` 事件 + 手动 `read(n)` 精确控制读取量。下面是一个更完整的 ReadStream 实现（支持 paused 模式）：

```javascript
let fs = require('fs')
let EventEmitter = require('events')
class ReadStream extends EventEmitter {
  constructor(path, options) {
    super(path, options)
    this.path = path
    this.highWaterMark = options.highWaterMark || 64 * 1024
    this.buffer = Buffer.alloc(this.highWaterMark)
    this.flags = options.flags || 'r'
    this.encoding = options.encoding
    this.mode = options.mode || 0o666
    this.start = options.start || 0
    this.end = options.end
    this.pos = this.start
    this.autoClose = options.autoClose || true
    this.bytesRead = 0
    this.closed = false
    this.flowing
    this.needReadable = false
    this.length = 0
    this.buffers = []
    this.on('end', function () {
      if (this.autoClose) this.destroy()
    })
    this.on('newListener', (type) => {
      if (type == 'data') {
        this.flowing = true
        this.read()
      }
      if (type == 'readable') {
        this.read(0) // 监听 readable 时先读 0 字节触发可读状态
      }
    })
    this.open()
  }

  open() {
    fs.open(this.path, this.flags, this.mode, (err, fd) => {
      if (err) {
        if (this.autoClose) {
          this.destroy()
          return this.emit('error', err)
        }
      }
      this.fd = fd
      this.emit('open')
    })
  }

  read(n) {
    if (typeof this.fd != 'number') {
      return this.once('open', () => this.read())
    }
    n = parseInt(n, 10)
    if (n != n) n = this.length
    if (this.length == 0) this.needReadable = true
    let ret
    if (0 < n && n < this.length) {
      ret = Buffer.alloc(n)
      let b, index = 0
      while (null != (b = this.buffers.shift())) {
        for (let i = 0; i < b.length; i++) {
          ret[index++] = b[i]
          if (index == ret.length) {
            this.length -= n
            b = b.slice(i + 1)
            this.buffers.unshift(b)
            break
          }
        }
      }
      if (this.encoding) ret = ret.toString(this.encoding)
    }

    let _read = () => {
      let m = this.end ? Math.min(this.end - this.pos + 1, this.highWaterMark) : this.highWaterMark
      fs.read(this.fd, this.buffer, 0, m, this.pos, (err, bytesRead) => {
        if (err) return
        let data
        if (bytesRead > 0) {
          data = this.buffer.slice(0, bytesRead)
          this.pos += bytesRead
          this.length += bytesRead
          if (this.end && this.pos > this.end) {
            if (this.needReadable) this.emit('readable')
            this.emit('end')
          } else {
            this.buffers.push(data)
            if (this.needReadable) {
              this.emit('readable')
              this.needReadable = false
            }
          }
        } else {
          if (this.needReadable) this.emit('readable')
          return this.emit('end')
        }
      })
    }
    if (this.length == 0 || this.length < this.highWaterMark) {
      _read(0)
    }
    return ret
  }

  destroy() {
    fs.close(this.fd, (err) => {
      this.emit('close')
    })
  }

  pause() { this.flowing = false }

  resume() {
    this.flowing = true
    this.read()
  }

  pipe(dest) {
    this.on('data', (data) => {
      let flag = dest.write(data)
      if (!flag) this.pause()
    })
    dest.on('drain', () => this.resume())
    this.on('end', () => dest.end())
  }
}

module.exports = ReadStream
```

paused 模式的用法——监听 `readable` 事件，手动 `read(1)` 一次读一个字节，观察缓冲区长度变化：

```javascript
let ReadStream = require('./ReadStream')
let rs = new ReadStream('./1.txt', {
  start: 3,
  end: 8,
  encoding: 'utf8',
  highWaterMark: 3
})
rs.on('readable', function () {
  console.log('readable')
  console.log('rs.buffer.length', rs.length)
  let d = rs.read(1)
  console.log(d)
  console.log('rs.buffer.length', rs.length)
  setTimeout(() => {
    console.log('rs.buffer.length', rs.length)
  }, 500)
})
```

> 两个模式的分工：**flowing 模式（`data` 事件）适合「数据到了就处理」的消费场景，paused 模式（`readable` + `read`）适合「我需要精确控制读多少、什么时候读」的场景**。`pipe` 内部实际用的是 flowing 模式 + `pause`/`resume`。

### 自定义流四件套：Readable / Writable / Duplex / Transform

手写 `_read`/`_write` 就能自定义流。**自定义可读流**（实现 `_read`，用 `push` 推数据，`push(null)` 表示结束）：

```javascript
var stream = require('stream')
var util = require('util')
util.inherits(Counter, stream.Readable)
function Counter(options) {
  stream.Readable.call(this, options)
  this._index = 0
}
Counter.prototype._read = function () {
  if (this._index++ < 3) {
    this.push(this._index + '')
  } else {
    this.push(null) // 👈 push null 表示流结束
  }
}
var counter = new Counter()
counter.on('data', function (data) {
  console.log("读到数据: " + data.toString())
})
counter.on('end', function (data) {
  console.log("读完了")
})
```

**自定义可写流**（实现 `_write`，处理完 `chunk` 后必须调 `callback` 表示写入完成）：

```javascript
var stream = require('stream')
var util = require('util')
util.inherits(Writer, stream.Writable)
let stock = []
function Writer(opt) {
  stream.Writable.call(this, opt)
}
Writer.prototype._write = function (chunk, encoding, callback) {
  setTimeout(() => {
    stock.push(chunk.toString('utf8'))
    console.log("增加: " + chunk)
    callback() // 👈 不调 callback，流会认为这块没写完
  }, 500)
}
var w = new Writer()
for (var i = 1; i <= 5; i++) {
  w.write("项目:" + i, 'utf8')
}
w.end("结束写入", function () {
  console.log(stock)
})
```

**双工流 Duplex**（可读可写，读写独立）：

```javascript
const { Duplex } = require('stream')
const inoutStream = new Duplex({
  write(chunk, encoding, callback) {
    console.log(chunk.toString())
    callback()
  },
  read(size) {
    this.push((++this.index) + '')
    if (this.index > 3) {
      this.push(null)
    }
  }
})
inoutStream.index = 0
process.stdin.pipe(inoutStream).pipe(process.stdout)
```

**转换流 Transform**（实现 `transform`，对数据做转换后 `push`，如逐行转大写）：

```javascript
const { Transform } = require('stream')
const upperCase = new Transform({
  transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase())
    callback()
  }
})
process.stdin.pipe(upperCase).pipe(process.stdout)
```

### 对象流：让流处理任意 JS 对象

默认流只能处理 Buffer/String，设 `objectMode` 后可以处理任意 JS 对象。`readableObjectMode`/`writableObjectMode` 可以只让一端开启对象模式：

```javascript
const { Transform } = require('stream')
let fs = require('fs')
let rs = fs.createReadStream('./users.json')
rs.setEncoding('utf8')

// 读端是字节，写端输出 JSON 对象
let toJson = Transform({
  readableObjectMode: true,
  transform(chunk, encoding, callback) {
    this.push(JSON.parse(chunk))
    callback()
  }
})
// 读端接收对象
let jsonOut = Transform({
  writableObjectMode: true,
  transform(chunk, encoding, callback) {
    console.log(chunk)
    callback()
  }
})
rs.pipe(toJson).pipe(jsonOut)
```

输入 `users.json`：

```json
[
  {"name":"zfpx1","age":8},
  {"name":"zfpx2","age":9}
]
```

### 背压验证实验：慢速写入不爆内存

最后用一个实验**证明背压真的在起作用**。场景：生成 10 万行模拟患者数据，写入一个「慢速」目标（用 `setTimeout` 模拟每块要写 5ms 的慢速磁盘/网络），对比「有背压的 `pipe`」和「无背压的裸 `data` 事件」两种方式的内存占用。

**慢速可写流**（每块写入故意延迟 5ms，模拟慢速目标）：

```javascript
const { Writable } = require('stream')

class SlowWritable extends Writable {
  constructor(opts) { super(opts) }
  _write(chunk, encoding, callback) {
    // 每块写 5ms，模拟慢速磁盘/网络
    setTimeout(() => callback(), 5)
  }
}
```

**有背压的写法**（用 `pipe`，自动暂停恢复）：

```javascript
const { Readable } = require('stream')

// 生成 10 万行模拟患者数据的可读流
const patients = new Readable({
  read() {
    for (let i = 0; i < 100000; i++) {
      this.push(`患者${i},男,35岁,体温36.5\n`)
    }
    this.push(null)
  }
})

// 每 100ms 打点一次内存占用
const timer = setInterval(() => {
  const { rss, heapUsed } = process.memoryUsage()
  console.log(`rss=${(rss / 1024 / 1024).toFixed(1)}MB heap=${(heapUsed / 1024 / 1024).toFixed(1)}MB`)
}, 100)

patients.pipe(new SlowWritable()).on('finish', () => {
  clearInterval(timer)
  console.log('done')
})
```

观察输出：因为有背压，`Readable` 的 `push` 会等 `SlowWritable` 消化（`drain`）后才继续，内存占用被稳定控制在某个水平，**不会随数据量线性增长**。

**无背压的对照写法**（裸 `data` 事件，不判断 `write` 返回值）：

```javascript
const fs = require('fs')
// 假设这是从磁盘疯狂读、往慢速目标疯狂写
const rs = fs.createReadStream('./big.log')
const ws = new SlowWritable()

rs.on('data', (chunk) => {
  ws.write(chunk) // 👈 不判断返回值，不管不顾一直写
})
```

这种写法下，`Readable` 会全速 `push`，`SlowWritable` 内部缓冲区被无限填满，内存占用直线飙升——这就是「没有背压」的后果。

> 验证方法：把两段代码分别跑一遍，对比 `process.memoryUsage()` 打点的曲线。有 `pipe` 的版本内存曲线是一条**平稳的水平线**，裸 `data` 的版本是一条**持续上涨的斜线**。这个对比，就是背压机制「看得见」的价值。

### Transform 串管道：三段式管道验证

最后验证三段式管道——可读流 → 转换流（逐行转大写）→ 可写流：

```javascript
const { Readable, Transform, Writable } = require('stream')

// 1. 可读流：模拟患者姓名逐行输出
const source = new Readable({
  read() {
    this.push('zhangsan\nlisi\nwangwu\n')
    this.push(null)
  }
})

// 2. 转换流：逐行转大写
const toUpper = new Transform({
  transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase())
    callback()
  }
})

// 3. 可写流：收集结果
let result = ''
const sink = new Writable({
  write(chunk, encoding, callback) {
    result += chunk.toString()
    callback()
  }
})

source.pipe(toUpper).pipe(sink).on('finish', () => {
  console.log(result) // ZHANGSAN LISI WANGWU
})
```

三段式管道正常工作，验证了「Readable → Transform → Writable」这条 Stream 最经典的组合方式——这也是 `gzip` 压缩（`fs.createReadStream().pipe(zlib.createGzip()).pipe(fs.createWriteStream())`）的同一套骨架。

---

## 五、参考资料

- https://nodejs.org/api/buffer.html
- https://nodejs.org/api/fs.html
- https://nodejs.org/api/stream.html
- https://nodejs.org/api/path.html
- https://github.com/nodejs/node（`lib/buffer.js`、`lib/internal/streams/readable.js`）

---

## 💡 面试核心问

- **Buffer 和普通数组有什么区别？为什么处理二进制要用 Buffer？**（固定长度、堆外内存、不受 V8 堆限制、二进制载体）
- **`Buffer.alloc` 和 `Buffer.allocUnsafe` 有什么区别？**（是否清零初始化，Unsafe 快但可能读到脏数据）
- **Stream 有哪几种类型？分别对应什么场景？**（Readable/Writable/Duplex/Transform 四类 + 各自场景）
- **什么是背压？如果没有背压控制会出现什么问题？**（读多写少、内存堆积、爆炸；`write` 返回值 + pause/drain/resume 闭环）
- **`pipe()` 内部是怎么实现背压的？`highWaterMark` 具体控制什么？**（`write` 返回 false → pause，drain → resume；highWaterMark 是触发阈值不是容量上限）
- **什么场景下应该用同步 fs API，什么场景绝对不能用？**（启动读配置可用，HTTP 请求里绝对不行）
- **`path.join` 和 `path.resolve` 有什么区别？**（纯拼接 vs 解析绝对路径，`resolve('a','/c')` 的坑）

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 面试频率 |
|--------|-----------|---------|
| Buffer 本质 | 固定长度二进制，堆外内存，不受 V8 堆限制 | ⭐⭐⭐ 必考 |
| alloc vs allocUnsafe | 是否清零初始化（Unsafe 快但脏数据） | ⭐⭐ 高频 |
| 四种流类型 | Readable / Writable / Duplex / Transform | ⭐⭐⭐ 必考 |
| 背压机制 | `write` 返回 false → pause → drain → resume 闭环 | ⭐⭐⭐ 必考 |
| highWaterMark | 背压触发阈值，不是容量硬限制 | ⭐⭐⭐ 必考 |
| 同步 fs 代价 | 阻塞事件循环，HTTP 服务器禁用 | ⭐⭐⭐ 必考 |
| join vs resolve | 纯拼接 vs 解析绝对路径 | ⭐⭐ 高频 |
| 可读流两模式 | flowing（data 事件）/ paused（readable + read） | ⭐⭐ 高频 |

> 💡 记住这条主线：**数据如何「表示（Buffer 堆外内存）→ 定位（path 跨平台）→ 读写（fs 同步异步）→ 流式高效处理（Stream + 背压）」**。I/O 的每一步，都在回答同一个问题——「怎么读写大量数据而不爆内存」。

---

## 📝 思考题

手写 `pipe` 时，如果只写了 `data` → `dest.write(data)`，却忘了监听 `drain` 事件来 `resume()`，会发生什么？

提示：`write` 返回 `false` 后你调了 `pause()`，源流停住了；但 `drain` 事件无人监听，源流就**永远停在那里**，数据只写了一半。这和「完全不写 `pause`」是两种不同的 bug——一个是内存爆炸，一个是数据卡死。想想哪种在生产里更难排查？

欢迎评论区写出你的答案 👇

---

> 🔖 这是「Node.js 全栈深度拆解」系列第 4 篇。上一篇：《Node.js 运行时内核：V8+libuv 架构/CommonJS 加载机制/ESM 深度拆解》；下一篇预告：《Node.js 核心 API 大全：process/crypto/net/os/worker_threads 深度拆解》
>
> 前置基础扩展阅读：搜索关键词「JS 异步编程 Promise 发布订阅」「Node.js 事件循环 宏任务 微任务」「Promise/A+ 规范」
