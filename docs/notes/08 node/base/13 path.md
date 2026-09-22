# <font style="color:rgb(51, 51, 51);">path模块</font>
+ <font style="color:rgb(51, 51, 51);">path是node中专门处理路径的一个核心模块</font>
    - <font style="color:rgb(51, 51, 51);">path.join 将多个参数值字符串结合为一个路径字符串</font>
    - <font style="color:rgb(51, 51, 51);">path.basename 获取一个路径中的文件名</font>
    - <font style="color:rgb(51, 51, 51);">path.extname 获取一个路径中的扩展名</font>
    - <font style="color:rgb(51, 51, 51);">path.sep 操作系统提定的文件分隔符</font>
    - <font style="color:rgb(51, 51, 51);">path.delimiter 属性值为系统指定的环境变量路径分隔符</font>
    - <font style="color:rgb(51, 51, 51);">path.normalize 将非标准的路径字符串转化为标准路径字符串 特点：</font>
        * <font style="color:rgb(51, 51, 51);">可以解析 . 和 ..</font>
        * <font style="color:rgb(51, 51, 51);">多个杠可以转换成一个杠</font>
        * <font style="color:rgb(51, 51, 51);">在windows下反杠会转化成正杠</font>
        * <font style="color:rgb(51, 51, 51);">如结尾以杠结尾的，则保留斜杠</font>
    - <font style="color:rgb(51, 51, 51);">resolve</font>
        * <font style="color:rgb(51, 51, 51);">以应用程序根目录为起点</font>
        * <font style="color:rgb(51, 51, 51);">如果参数是普通字符串，则意思是当前目录的下级目录</font>
        * <font style="color:rgb(51, 51, 51);">如果参数是.. 回到上一级目录</font>
        * <font style="color:rgb(51, 51, 51);">如果是/开头表示一个绝对的根路径</font>

```javascript
var path = require('path');
var fs = require('fs');
/**
 * normalize 将非标准化的路径转化成标准化的路径
 * 1.解析. 和 ..
 * 2.多个斜杠会转成一个斜杠
 * 3.window下的斜杠会转成正斜杠
 * 4.如果以斜杠会保留
 **/

console.log(path.normalize('./a////b//..\\c//e//..//'));
//  \a\c\

//多个参数字符串合并成一个路径 字符串
console.log(path.join(__dirname,'a','b'));

/**
 * resolve
 * 以就用程序为根目录，做为起点，根据参数解析出一个绝对路径
 *  1.以应用程序为根起点
 *  2... .
 *  3. 普通 字符串代表子目录
 *  4. /代表绝地路径根目录
 */
console.log(path.resolve());//空代表当前的目录 路径
console.log(path.resolve('a','/c'));// /a/b
// d:\c
//可以获取两个路径之间的相对关系
console.log(path.relative(__dirname,'/a'));
// a
//返回指定路径的所在目录
console.log(path.dirname(__filename)); // 9.path
console.log(path.dirname('./1.path.js'));//  9.path
//basename 获取路径中的文件名
console.log(path.basename(__filename));
console.log(path.basename(__filename,'.js'));
console.log(path.extname(__filename));

console.log(path.sep);//文件分隔符 window \ linux /
console.log(path.win32.sep);
console.log(path.posix.sep);
console.log(path.delimiter);//路径 分隔符 window ; linux :
```

# 参考
[Path | Node.js v23.10.0 Documentation](https://nodejs.org/docs/latest/api/path.html)

