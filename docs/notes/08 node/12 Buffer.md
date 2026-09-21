# 编码的发展
+ 一个字节由8个位组成， `gbk` 中一个汉字2个字节， `utf8` 中一个汉字3个字节
    - `ASCII` 编码
    - `GB2312` 
    - `GBK` 
    - `GB18030` 
    - `Unicode` 
    - `UTF-8` 
+ `Node` 中不支持 `GBK` 编码，我们需要将 `GBK` 转为 `UTF8` 编码

```javascript
var iconv = require('iconv-lite');
function readGBKText(pathname) {
    var bin = fs.readFileSync(pathname);
    return iconv.decode(bin, 'gbk');
}
```

# 进制转化
```javascript
//把任意进制转成十进制
console.log(parseInt('20',10));//20
console.log(parseInt('11',2));//3
console.log(parseInt('20',16));//32
//把十进制转成任意进制
console.log((3).toString(2));//11
console.log(3..toString(2));//11
console.log((77).toString(8));//115 
console.log((77).toString(16));//4d 
console.log((17).toString(8));//21
```

# Buffer的应用
## 定义buffer的三种方式
```javascript
// 通过长度定义buffer
let buf1 = Buffer.alloc(6);
// 字符串创建
let buf2 = Buffer.from('测试');
// 通过数组定义buffer,正常情况下为0-255之间
let buf3 = Buffer.from([65,66,67]);
```

## buffer中常用的方法
+ `Buffer.form()`
+ `Buffer.of()`
+ `Buffer.alloc()`
+ `Buffer.allocUnsafe()`
+ `Buffer.allocUnsafeSlow()`
+ `Buffer.concat()` 
+ `Buffer.isBuffer()`
+ `Buffer.compare()`
+ `Buffer.isEncoding()`
+ `Buffer.byteLength()`
+ `buff.toString()` 
+ `buff.fill()` 
+ `buff.slice()` 
+ `buff.copy()` 
+ `indexOf` 

### <font style="color:rgb(51, 51, 51);">fill</font>
```javascript
// buf.fill(value[, offset[, end]][, encoding])
buffer.fill(0);
```

### <font style="color:rgb(51, 51, 51);">write方法</font>
```javascript
// buf.write(string[, offset[, length]][, encoding])
let buffer = Buffer.allocUnsafe(6);
buffer.write('珠',0,3,'utf8');
buffer.write('峰',3,3,'utf8'); //珠峰
```

### <font style="color:rgb(51, 51, 51);">writeInt8</font>
+ <font style="color:rgb(51, 51, 51);">通过指定的 </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">offset</font>`<font style="color:rgb(51, 51, 51);"> 将 </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">value</font>`<font style="color:rgb(51, 51, 51);"> 写入到当前 Buffer 中。</font>
+ <font style="color:rgb(51, 51, 51);">这个 value 应当是一个有效的有符号的8位整数</font>

```javascript
// buf.writeInt8(value, offset[, noAssert])
let buf = Buffer.alloc(4);
buf.writeInt8()
buf.writeInt8(0,0);
buf.writeInt8(16,1);
buf.writeInt8(32,2);
buf.writeInt8(48,3);
console.log(buf);// <Buffer 00 10 20 30>
console.log(buf.readInt8(0));//0
console.log(buf.readInt8(1));//16
console.log(buf.readInt8(2));//32
console.log(buf.readInt8(3));//48
```

+ **<font style="color:rgb(51, 51, 51);">Little-Endian&Big-Endian</font>**
    - <font style="color:rgb(51, 51, 51);">不同的CPU有不同的字节序类型，这些字节序是指整数在内存中保存的顺序。</font>
        * <font style="color:rgb(51, 51, 51);">Big-endian：将高序字节存储在起始地址（高位编址）</font>
        * <font style="color:rgb(51, 51, 51);">Little-endian：将低序字节存储在起始地址（低位编址）</font>

```javascript
let buffer = Buffer.alloc(4);
buffer.writeInt16BE(2**8,0);//256
console.log(buffer);//<Buffer 01 00 00 00>
console.log(buffer.readInt16BE(0));//256

buffer.writeInt16LE(2**8,2);//256
console.log(buffer);//<Buffer 01 00 00 01>
console.log(buffer.readInt16LE(2));//256
```

### <font style="color:rgb(51, 51, 51);">toString方</font>
```javascript
// buf.toString([encoding[, start[, end]]])
let buffer = Buffer.from('珠峰架构');
console.log(buffer.toString('utf8',3,6)); // 峰
console.log(buffer.toString('base64')); // 54+g5bOw5p625p6E
```

### <font style="color:rgb(51, 51, 51);">slice方法</font>
```javascript
// buf.slice([start[, end]])
let buffer = Buffer.from('珠峰架构');
let subBuffer = buffer.slice(0,6);
console.log(subBuffer.toString());
```

+ **<font style="color:rgb(51, 51, 51);">截取乱码问题</font>**

```javascript
let {StringDecoder}  = require('string_decoder');
let sd = new StringDecoder();
let buffer = Buffer.from('珠峰');
console.log(sd.write(buffer.slice(0,4)));
console.log(sd.write(buffer.slice(4)));
```

+ buffer.split 方法的实现

```javascript
Buffer.prototype.split = function(sep){ // slice + indexOf = split
	let arr = [];
	let len = Buffer.from(sep).length; //  分割符号的长度
	let offset = 0;
	let current;
	while(-1!=(current = this.indexOf(sep,offset))){
		// 找到的位置 加上偏移量
		arr.push(this.slice(offset,current));
		offset = current+len;
	}
	arr.push(this.slice(offset));
	return arr;
}
```

### <font style="color:rgb(51, 51, 51);">copy方法</font>
+ <font style="color:rgb(51, 51, 51);">复制Buffer 把多个buffer拷贝到一个大buffer上</font>

```javascript
// buf.copy(target[, targetStart[, sourceStart[, sourceEnd]]])
let buffer = Buffer.from('珠峰架构');
let subBuffer = Buffer.alloc(6);
buffer.copy(subBuffer,0,0,3);//珠
buffer.copy(subBuffer,3,3,6);//峰
console.log(subBuffer.toString());//珠峰
```

+ copy 方法的实现

```javascript
Buffer.prototype.copy = function(targetBuffer,targetStart,sourceStart,sourceEnd){
  for(let i=sourceStart;i<sourceEnd;i++){
    targetBuffer[targetStart++] = this[i];
  }
}
let buffer = Buffer.from('珠峰');
let subBuffer = Buffer.alloc(6);
buffer.copy(subBuffer,0,0,4);//珠
buffer.copy(subBuffer,3,3,6);//峰
console.log(subBuffer.toString());//珠峰
```

### <font style="color:rgb(51, 51, 51);">concat方法</font>
```javascript
// Buffer.concat(list[, totalLength])
let buffer1 = Buffer.from('珠');
let buffer2 = Buffer.from('峰');
let buffer = Buffer.concat([buffer1,buffer2]);
console.log(buffer.toString());
```

+ concat 方法的实现

```javascript
Buffer.concat = function (list) {
  let totalLength = list.reduce((len, item) => len + item.length, 0);
  if (list.length == 0)
    return list[0];
  let newBuffer = Buffer.alloc(totalLength);
  let pos = 0;
  for (let buffer of list) {
    for (let byte of buffer) {
      newBuffer[pos++] = byte;
    }
  }
  return newBuffer;
}
let buffer1 = Buffer.from('珠');
let buffer2 = Buffer.from('峰');
let buffer = Buffer.concat([buffer1, buffer2]);
console.log(buffer.toString());
```

### <font style="color:rgb(51, 51, 51);">isBuffer</font>
+ <font style="color:rgb(51, 51, 51);">判断是否是buffer</font>

```javascript
Buffer.isBuffer();
```

### <font style="color:rgb(51, 51, 51);">length</font>
+ <font style="color:rgb(51, 51, 51);">获取字节长度(显示是字符串所代表buffer的长度)</font>

```javascript
let str = '珠峰';
console.log(str.length);//2
let buffer = Buffer.from(str);
console.log(Buffer.byteLength(buffer));//6
```

# base64转化
+ Base64是网络上最常见的用于传输8Bit字节码的编码方式之一
+ Base64就是一种基于64个可打印字符来表示二进制数据的方法
+ Base64要求把每三个8Bit的字节转换为四个6Bit的字节（38 = 46 = 24），然后把6Bit再添两位高位0，组成四个8Bit的字节

## 原理
```javascript
// base64 原理
const buf4 = Buffer.from('珠');
console.log(buf4);
console.log('toString', buf4.toString('utf-8', 0, 2)); 
console.log(0xe7.toString(2), 0x8f.toString(2), 0xa0.toString(2))
// 11100111 10001111 10100000
// 上面的拼接到一起，每六位分割为一个字节
// 111001 111000 111110 100000
// 然后把每个前面补两个0
// 00111001 00111000 00111110 00100000
// 再将上面的二进制数转成十进制
console.log(parseInt('00111001', 2), parseInt('00111000', 2), parseInt('00111110', 2), parseInt('00100000', 2))
// 57， 56， 62， 32
// 64个编码
const str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
console.log(str[57]+str[56]+str[62]+str[32]) // 54+g
// 最终 base64 = 54+g（三个字符变为了4个字符，体积增加了三分之一）
```

## 实现转换方法
```javascript
const CHARTS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function transfer(str){
  let buf = Buffer.from(str);
  let result = '';
  for(let b of buf){
      result += b.toString(2);
  }
  return result.match(/(\d{6})/g).map(val=>parseInt(val,2)).map(val=>CHARTS[val]).join('');
}
let r = transfer('a');
console.log(r);
```

# 前端二进制对象
+ 前端最常用的 `Blob` 对象 `binary large object`  (是不可变的) 代表的是文件类型。

## 前端下载html功能
```javascript
let str = `<h1>hello world</h1>`;
const blob = new Blob([str], {
     type: 'text/html'
});
let a = document.createElement('a');
a.setAttribute('download', 'a.html');
a.href = URL.createObjectURL(blob);
document.body.appendChild(a);
```

## 前端文件预览
+ 使用fileReader来实现。

```javascript
file.addEventListener('change', (e) => {
  let file = e.target.files[0]; // 二进制文件类型
  let fileReader = new FileReader();
  fileReader.onload = function () {
      let img = document.createElement('img');
      img.src = fileReader.result;
      document.body.appendChild(img)
  }
  fileReader.readAsDataURL(file);
})
```

+ `createObjectURL` 来实现

```javascript
let r = URL.createObjectURL(file);
let img = document.createElement('img');
img.src = r;
document.body.appendChild(img)
URL.revokeObjectURL(r);
```

## arrayBuffer(浏览器中的二进制)
```javascript
let buffer = new ArrayBuffer(4);// 创造4个字节
let x1 = new Uint8Array(buffer);
x1[0] = 1; // 00000000 00000000 11111111 00000001
x1[1] = 255;
console.log(x1); // [1,255,0,0]
let x2 = new Uint16Array(buffer); 
console.log(x2) // [65281,0]
let x3 = new Uint32Array(buffer);
console.log(x3) // [65281]
```

> arraybuffer不能被直接修改
>

## 字符串和arrayBuffer转化
+ 字符串转化成arrayBuffer。

```javascript
function stringToArrayBuffer(str) { // utf16 不管是字符还是汉字
    let buffer = new ArrayBuffer(str.length * 2);
    let view = new Uint16Array(buffer)
    for (let i = 0; i < str.length; i++) {
        view[i] = str.charCodeAt(i)
    }
    return buffer
}
```

+ arrayBuffer转化成字符串。

```javascript
function ArrayBufferToString(buf) {
    return String.fromCharCode(...new Uint16Array(buf))
}
```

## responseType:'arrayBuffer'
```javascript
function request(url, method = "get") {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function () {
            resolve(xhr.response);
        }
        xhr.send();
    })
}
request('/download').then(arraybuffer => {
    let b = new Blob([arraybuffer]); 
    let blobUrl = URL.createObjectURL(b);
    let a = document.createElement('a');
    a.href = blobUrl;
    a.download = 'a.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl)
})
```

+ 服务端代码

```javascript
const express = require('express');
const app = express();
app.listen(4444);
app.use(express.static(__dirname));
app.get('/download', (req, res) => {
    res.download('a.pdf');
})
```

# 参考
[Buffer | Node.js v23.9.0 Documentation](https://nodejs.org/docs/latest/api/buffer.html)



