# HTTP协议和TCP协议
<!-- 这是一张图片，ocr 内容为：我想浏览 http://hackrjjp/xss/Web页面 告诉我hackr.jp的IP地址吧 o2 hackr.jp对应的IP地址是 20X.189.105.112 DNS 客户端 HTTP协议的职责 生成针对目标Web服务器的HTTP请求报文 请给我http://hackr.jp/Xss 页面的资源 TCP协议的职责 为了方便通信,将HTTP请求报文分割成报文段 按序号分为多个 报文段 把每个报文段可靠地传给对方 IP协议的职责 搜索对方的地址,一边中转一边传送 路由器 路由器 TCP协议的职责 从对方那里接收到的报文段 重组到达的报文段 按序号以原来的顺序 重组请求报文 HTTP协议的职责 对Web服务器请求的内容的处理 原来是想要这台计算机上的/xss/资源啊 IP地址 20x.189.105.112 请求的处理结果也同样利用TCP/IP hackr.ip 通信协议向用户进行回传 服务器 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637137600286-0f453944-6b5c-40ce-b1d6-609e71a24c44.png)

## 长链接
+ <font style="color:rgb(18, 18, 18);">HTTP 协议的初始版本中，每进行一次 HTTP 通信就要断开一次 TCP 连接。</font>
+ <font style="color:rgb(18, 18, 18);">可随着 HTTP 的普及，文档中包含大量图片的情况多了起来。 比如，使用浏览器浏览一个包含多张图片的 HTML页面时，在发送请求访问 HTML页面资源的同时，也会请求该 HTML页面里包含的其他资源。例如图片。因此，每次的请求都会造成无谓的 TCP 连接建立和断开，增加通信量的开销。</font>

<!-- 这是一张图片，ocr 内容为：红最速会信园 SEBooKs 黑一出外:4*年9*797本08 本老探寸 发送请求一份包含多张图 AMLSCENWIT长AAT 华 49817641219-2 萝考 H 片的HTML文档对应的 选6 Web页面,会产生大量的 出编:821450m1a8898 加尚间 通信开销. 自 口话量学:7664282 NotAcrK 国店 以EwAo毛鑫 Wy-Xoc碑 AA产4霸 获取HTML文档 建立TCP连接 心须进行多次通信 好累...... HTTP请求/响应 获取图片 断开TCP连接 建立TCP连接 HTTP请求/响应 断开TCP连接 客户端 服务器 获取图片 建立TCP连接 HTTP请求/响应 断开TCP连接 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637132287589-ac50fdfb-5d6a-4359-bb7a-50b58c4e2021.png)

+ 为解决上述 TCP 连接的问题，HTTP/1.1 和一部分的 HTTP/1.0 想出了持久连接（HTTP Persistent Connections，也称为 HTTP keep-alive 或 HTTP connection reuse）的方法。
+ 持久连接的特点是，只要任意一端没有明确提出断开连接，则保持 TCP 连接状态。就是长连接。
+ <font style="color:rgb(18, 18, 18);">持久连接旨在建立 </font>**<font style="color:rgb(18, 18, 18);">1 </font>**<font style="color:rgb(18, 18, 18);">次 </font>**<font style="color:rgb(18, 18, 18);">TCP </font>**<font style="color:rgb(18, 18, 18);">连接后进行多次请求和响应的交互。持久连接的好处在于减少了 TCP 连接的重复建立和断开所造成的额外开销，减轻了服务器端的负载。另外，减少开销的那部分时间，使HTTP 请求和响应能够更早地结束，这样 Web 页面的显示速度也就相应提高了。</font>
+ **<font style="color:rgb(18, 18, 18);">在 HTTP/1.1 中，所有的连接默认都是持久连接，但在 HTTP/1.0 内并 未标准化。</font>**<font style="color:rgb(18, 18, 18);">除了服务器端，客户端也需要支持持久连接。</font>

<!-- 这是一张图片，ocr 内容为：建立TCP连接 SYN 三 SYN/ACK 只要建立连接就能 ACK web页面的打开 一次性发送请求的 速度变快了! HTTP请求 资源了 HTTP响应 HTTP请求 HTTP响应 08 HTTP请求 客户端 服务器 HTTP响应 FIN ACK FIN ACK 断开TCP连接 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637119906706-7d80da02-a55f-4b28-8285-fbfc7b1c1656.png)

## 管线化
+ <font style="color:rgb(18, 18, 18);">持久连接使得多数请求以管线化（pipelining）方式发送成为可能。从前发送请求后需等待并收到响应，才能发送下一个请求。管线化技术出现后，不用等待响应亦可直接发送下一个请求。 这样就能够做到同时并行发送多个请求，而不需要一个接一个地等待响应了。</font>

<!-- 这是一张图片，ocr 内容为：不用等待就能直接 发送下一个请求! 建立TCP连接 HTTP请求1 HTTP请求2 00 HTTP响应1 HTTP响应2 客户端 服务器 断开TCP连接 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637120632932-70e302f3-bfce-4a4e-a2de-744bc5589d78.png)

# URI和URL
## URI
+ URI，统一资源标志符(Uniform Resource Identifier， URI)，表示的是web上每一种可用的资源，如 HTML文档、图像、视频片段、程序等都由一个URI进行标识的。
    - Uniform：不用根据上下文来识别资源指定的访问方式
    - Resource：可以标识的任何东西
    - Identifier：表示可标识的对象
+ **<font style="color:#F5222D;">URI = URL + URN</font>**
+ URI通常由三部分组成：
    - 资源的命名机制
    - 存放资源的主机名
    - 资源自身的名称

> 注意：这只是一般URI资源的命名方式，只要是可以唯一标识资源的都被称为URI，上面三条合在一起是URI的充分不必要条件
>

+ URI举例
    - 如：https://blog.csdn.net/qq_32595453/article/details/79516787
    - 我们可以这样解释它：
        * 这是一个可以通过https协议访问的资源
        * 位于主机 blog.csdn.net上
        * 通过“/qq_32595453/article/details/79516787”可以对该资源进行唯一标识（注意，这个不一定是完整的路径）

> 注意：以上三点只不过是对实例的解释，以上三点并不是URI的必要条件，URI只是一种概念，怎样实现无所谓，只要它唯一标识一个资源就可以了。
>

## URL
+ URL：统一资源定位符(Uniform Resource Locator，URL)，用来定位唯一的资源， 必须提供足够的定位信息。
    - Uniform：不用根据上下文来识别资源指定的访问方式
    - Resource：可以识别的任何东西
    - Locator：定位
+ URL举例
    - 如：http://www.jianshu.com/u/1f0067e24ff8

### URL的格式
<!-- 这是一张图片，ocr 内容为：user:passwordckww.example.comomindexhti -1fragmentid http: 协议 登录信息 原服务器地址 文件路径 服务器 参数 片段 (认证) 端口 URL格式 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637122344701-60ed1340-d57b-474e-882f-f83ccecf38c6.png)

+ 协议：指定使用的传输协议，如：http、https、ftp等
+ 登录信息：可选，指用户名和密码作为从服务器端获取资源时必要的登录信息（身份认证）
+ 服务器地址：可以是域名www.jianshu.com，也可以是ip:192.168.1.10
+ 服务器端口：可选，指定服务器连接的网络端口。，若省略则使用该协议的默认端口
+ 文件路径：指定服务器上的路径来定位指定的资源
+ 参数：可选，用于给动态网页（如使用CGI、ISAPI、PHP/JSP/ASP/ASP.NET等技术制作的网页）传递参数，可有多个参数，用“&”符号隔开，每个参数的名和值用“=”符号隔开。
+ 片段：可选，片段用于指定网络资源中的片断。html页面中片段则是描点。例如一个网页中有多个名词解释，可使用片段可直接定位到某一名词解释（描点的位置）。

## URN
+ URN：统一资源名称(Uniform Resource Name，URN)
+ URN它命名资源但不指定如何定位资源，比如：只告诉你一个人的姓名，不告诉你这个人在哪。例如：telnet、mailto、news 和 isbn URI 等都是URN。
+ 比如 urn:issn:1535-3613 则不属于URL(统一资源定位符)，因为根据该标识符无法定位任何到资源。
+ URN举例
    - urn:issn:1535-3613 (国际标准期刊编号)
    - urn:isbn:9787115318893 (国际标准图书编号)
    - mailto:jijs@jianshu.com (简单邮件传输协议)
    - tel:+1-81-555-1212

## <font style="color:rgb(64, 64, 64);">URI、URL和URN区别</font>
+ URI 指的是一个资源
+ URL 用地址定位一个资源；
+ URN 用名称定位一个资源。
+ 举个例子：去寻找一个具体的人（URI）；如果用地址：XX省XX市XX区...XX单元XX室的主人 就是URL；如果用身份证号+名字去找就是URN（身份证号+名字 无法确认资源的地址） 。
+ <font style="color:rgb(0, 0, 0);">简而言之，</font><font style="color:rgb(0, 0, 255);">URL</font><font style="color:rgb(0, 0, 0);">代表资源的地址信息，</font><font style="color:rgb(0, 0, 255);">URN</font><font style="color:rgb(0, 0, 0);">则代表某个资源独一无二的名称。举个例子来说，“JSP&Servlet学习笔记(第2版)”的国家标准书号(International Standard Book Number，ISBN)为 ISBN 978-7-302-28366-9，这就是URN的一个例子。</font>
+ <font style="color:rgb(0, 0, 0);">由于</font><font style="color:rgb(0, 0, 255);">URL</font><font style="color:rgb(0, 0, 0);">或</font><font style="color:rgb(0, 0, 255);">URN</font><font style="color:rgb(0, 0, 0);">的目的，都是用来标识某个资源，后来的标准指定了</font><font style="color:rgb(0, 0, 255);">URI</font><font style="color:rgb(0, 0, 0);">，而</font><font style="color:rgb(255, 0, 0);">URL</font><font style="color:rgb(0, 0, 0);">与</font><font style="color:rgb(255, 0, 0);">URN</font><font style="color:rgb(0, 0, 0);">成为</font><font style="color:rgb(255, 0, 0);">URI</font><font style="color:rgb(0, 0, 0);">的子集。在一些标准机构，如W3C(World Wide Web Consortium)文件中，后来就也多使用URI这个名词，不过许多人已习惯用URL，所以URL这个名词仍广为使用，程序员口语交谈也多见使用URL这个旧称。</font>

<!-- 这是一张图片，ocr 内容为：URI URL URN https://dmn.tid/page.ht dmn.tid/page.htm ftp://ste.org/file.pdf ste.org/img.png data.htm -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637122305922-232eedad-bdb9-4385-9b0f-c83f3fb452dc.png)

# HTTP
+ 请求的一方叫客户端，响应的一方叫服务器端
+ 通过请求和相应达成通信
+ HTTP是一种不保存状态的协议

<!-- 这是一张图片，ocr 内容为：请求行 报文首部 请求首部字段 空行(CR+LF) 通用首部字段 实体首部字段 报文主体 其他 状态行 报文首部 响应首部字段 空行(CR+LF) 通用首部字段 实体首部字段 报文主体 其他 图:请求报文(上)和响应报文(下)的结构 请求行 GET/HTTP/1.1 HoST:hackr.jp bperMgent:Moata/0 Accept:text/htm, Accept-Language:ja.en-us;g-o.7e.3 Accept-Encoding:gzipderlate DNT:1 Connection:keep-alive Pragma:no-cache 各种首部字段 Cache-Control:no-cache 空行(CR+LF) HTTP/1.12000K 状态行 Date:Fri13Jul201202:45:26GMT server:Apache Last-ModiFiEDFT ETag:45bae1-16a-46d776ac" ACCept-Ranges:bytes Content-Length:362 Connection:close 各种首部字段 Content-Type:text/html 空行(CR+LF) <htmixming"http://www.w3.org/1999/xhtmi"> <head> metahtep-eguivucontent-type"content"text/hemcharet-ut-8"/ <title>hackr.jp/title> </head> cbody> ingsrc-hack.qialthackh </body> 报文主体 </html> 图:请求报文(上)和响应报文(下)的实例 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637128426763-41fc3ace-b3e8-47ed-8ecd-db93d284c1e0.png)

## 请求报文
<!-- 这是一张图片，ocr 内容为：http请求报文协议 请求行 回车符 方法 空格 空格 换行符 版本 URL 回车符 首部 换行符 城值 请求头部 ........[多个首部与域值]............. 域值 换行符 回车符 首部 回车符换行符 实体 请求数据 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637129268453-9e0adfcf-c094-44d7-a574-30bf99b21684.png)

<!-- 这是一张图片，ocr 内容为：请求行 报文首部 请求首部字段 空行(CR+LF) 通用首部字段 实体首部字段 报文主体 其他 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637129069743-2be215db-cb4d-4ae6-8b50-735a73773d12.png)

<!-- 这是一张图片，ocr 内容为：协议版本 方法 URI method 请求首部字段 form/entry HTTP/1.1 POST Host:hackr.jp 请求头 Comnection:keep-alive Content-Type:application/x-wwwm-urencd Content-Length:16 参数/实体 name-ueno&age-37 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637129106183-1b90e781-7a94-408d-a2a2-d3a3a9778429.png)

+ 请求行
    - 方法
        * GET：获取资源
        * POST：向服务器端发送数据，传输实体主体
        * PUT：传输文件
        * HEAD：获取报文头部
        * DELETE：删除文件
        * OPTIONS：询问支持的方法
        * TRACE：追踪路径
    - 协议/版本号
    - URL
+ 请求头
    - 通用首部(General Header)：请求报文和响应报文两方都会使用的首部。如协议版本号
    - 请求首部(Request Header)：从客户端向服务器端发送请求报文时使用的首部。 了请求的加内容、客户端信 、响应内容相关 先级等信 
    - 实体首部(Entity Header Fields)：对请求报文和响应报文的实体部分使用的首部。 了资源内容 更新时间等与实体有关的信
+ 请求体

<!-- 这是一张图片，ocr 内容为：我收到的是 之后将会发生些 从代理服务器路由中转时请求 这样的请求 什么呢? 可能被篡改 0O TRACE TRACE TRACE 代理服务器 服务器 代理服务器 客户端 Max-Forwards:2 Max-Forwards:1 Max-Forwards:0 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637132198582-32e13a19-54ef-4832-8d72-3f4983e8e814.png)



## 响应报文
<!-- 这是一张图片，ocr 内容为：HTTP响应报文格式 状态行 版本 状态码 回车符 空格 原因短语 空格 换行符 回车符 首部 城值 换行符 [多个首部与域值]... 首部行 首部 换行符 域值 回车符 换行符 回车符 实体 实体 (有些响应报文不用) -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637129404603-6a9fbfa6-6081-4df5-aa72-3197d96e8538.png)

<!-- 这是一张图片，ocr 内容为：状态行 HTTP版本, 报文首部 状态码 响应首部字段 HTTP首部字段 通用首部字段 空行(CR+LF) 实体首部字段 报文主体 其他 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637128755867-5e5249f8-6c29-4803-9802-f6ba2b05032a.png)

<!-- 这是一张图片，ocr 内容为：状态码的原因短语 协议版本 状态码 响应首部字段 HTTP/1.1 200 OK Date:Tue10Jul201206:50:15 GMT Content-Length:362 Content-Type:text/html 空格 shtml> 主体 图:响应报文的构成 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637129142247-7822f4a7-0db8-47c6-b1ac-a7493efaa505.png)

+ 状态行
    - 协议/版本号
    - 状态码
    - 状态码的原因短语
+ 响应头
    - 通用首部(General Header)：请求报文和响应报文两方都会使用的首部。如协议版本号
    - 响应首部(Response Header)：从服务器端向客户端返回响应报文时使用的首部。 了响应的 加内容,也会要求客户端加外的内容信
    - 实体首部(Entity Header Fields)：对请求报文和响应报文的实体部分使用的首部。 了资源内容 更新时间等与实体有关的信
+ 响应体

## 编码
+ HTTP可以在传输的过程中通过编码提升传输效率，但是会消耗更多的CPU时间

### 编码压缩
+ 发送文件时可以先用ZIP压缩功能后再发送文件
    - gzip
    - compress
    - deflate
    - identify

<!-- 这是一张图片，ocr 内容为：把实体压缩变小后发送 紧紧地压缩! 一 00 复原! 客户端 服务器 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637132505655-91969867-d1f1-48bb-bee0-7d994cf273a1.png)

### 分割发送的分块传输编码
+ 请求的实体在尚未传输完成之前浏览器不能显示，所以在传输大容量数据时，通过把数据分割成多块，能让浏览器逐步显示页面

<!-- 这是一张图片，ocr 内容为：分割物称为 先将实体主体分割变小 块(chunk) 后再发送 分割! 口 复原! 客户端 服务器 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637132786820-29f1770e-6425-48bf-a554-fef9555735d3.png)

### 多部分对象集合
<!-- 这是一张图片，ocr 内容为：份报文主体中可以包含多类型实休. 用bouy字付重重划分司分对餐可经奖实体.在个实体巡行之~,分对合最后人,记 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637133052049-93c037c4-d757-42d1-ae43-aeb3b02546d8.png)

+ 一份报文主体中可以包含多种类型实体
+ 使用boundary字符串来划分多部分对象指明的各类实体，在各个实体起始行之前插入--标记，多部分对象集合最后插入--标记

<!-- 这是一张图片，ocr 内容为：文本 图片 视频 MIME多部分对象集合 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637133155801-d2012290-8de7-43f0-ad4d-3c1cbe99cd35.png)

#### multipart/form-data
+ 上传表单文件时使用

<!-- 这是一张图片，ocr 内容为：Content-Type:multipart/orm-dataoudY-AaB03x --AaB03x Content-Dispositionorm-dataname"ied B10W Joe --AaB03X filename-"Fi Content-Disposition:orm-datainamec 1el.txt" Content-Type:text/plain ?..(filel.txt的数据)... -AaB03X-- -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637133420875-d5984df1-69b9-4d5c-a929-c5391d557065.png)

#### multipart/byteranges 206(partial Content)
+ 状态码 206（Partial Content，部分内容）响应报文包含了多个ᔴ 围的内容时使用。

<!-- 这是一张图片，ocr 内容为：HTTP/1.1206Partialconte Date:fri13Jul201202:45:26GMT 02:02:20GMT Last-Modified:FriAug272 COntent-IVPeMtttANGOUSTRGSAATE --THISSTRING SEPARATES Content-Type: application/pdf :bytes500-999/8000 Content-Range: 1...(范围指定的数据)... THISSTRINGSEPARATES application/pdf Content-Type: tes7000-7999/8000 Content-Range:bytes 1...(范围指定的数据)... THISSTRINGSEPARATES-- -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637133605906-c97091b4-f03d-43df-b069-dbe530c96a42.png)

### 获取部分内容的范围请求
+ 为了实现中断恢复下载的需求，需要能下载指定下载的实体范围
    - 请求头中的Range来指定资源的byte范围
    - 响应会返回状态码206响应报文
    - 对于多重范围的范围要求，响应会在首部字段 Content-Type 中表明 multipart/byteranges

```shell
# 5001_10 000 字节
Range: bytes=5001-10000

# 从 5001 字节之后全部的
Range: bytes=5001-

# 从一开始到3000 字节和 5000_7000 字节的多重范围
Range: bytes=-3000, 5000-7000
```

<!-- 这是一张图片，ocr 内容为：GETtip.jpgHTTP/1.1 把剩余 Host:www.usagidesign.jp 的部分 5001-10000 Range:bytes . 00 传给我 客户端 服务器 HTTP/1.1206Partialcontent Date:Fri13Jul201204:39:17GMT Content-Range:bytes5001-10000/10000 gth: 5000 Content-Lengt image/jpeg Content-fype: -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637136687016-80c08d20-618e-4faf-a58b-5340ff8fb848.png)

## 内容协商
+ 首部字段
    - Accept
    - Accept-Charset
    - Accept-Encoding
    - Accept-Language
    - Content-Language
+ 协商类型
    - 服务器驱动
    - 客户端驱动协商
    - 透明协商

## 状态码
+ 状态码负责表示客户端请求的返回结果、标记服务器端是否正常、通知出现的错误

### 状态码类别
<!-- 这是一张图片，ocr 内容为：类别 原因短语 接收的请求正在处理 Informational (信息性状态码) 1XX 请求正常处理完毕 2XX 成功状态码) Success 需要进行附加操作以完成请求 3XX 重定向状态码) Redirection ClientError(客户端错误状态码) 服务器无法处理请求 4XX 服务器处理请求出错 (服务器错误状态码) Error 5XX Server -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637137109543-712acf51-2178-48dd-b65d-6865d8b7882e.png)

### 状态码列表
| **<font style="color:#FFFFFF;">状态码</font>** | **<font style="color:#FFFFFF;">状态码英文名称</font>** | **<font style="color:#FFFFFF;">中文描述</font>** |
| --- | --- | --- |
| 100 | Continue | 继续。客户端应继续其请求 |
| 101 | Switching Protocols | 切换协议。服务器根据客户端的请求切换协议。只能切换到更高级的协议，例如，切换到HTTP的新版本协议 |
| | | |
| **<font style="color:#E8323C;">200</font>** | OK | 请求成功。一般用于GET与POST请求 |
| 201 | Created | 已创建。成功请求并创建了新的资源 |
| 202 | Accepted | 已接受。已经接受请求，但未处理完成 |
| 203 | Non-Authoritative Information | 非授权信息。请求成功。但返回的meta信息不在原始的服务器，而是一个副本 |
| **<font style="color:#E8323C;">204</font>** | No Content | 无内容。服务器成功处理，但未返回内容。在未更新网页的情况下，可确保浏览器继续显示当前文档 |
| 205 | Reset Content | 重置内容。服务器处理成功，用户终端（例如：浏览器）应重置文档视图。可通过此返回码清除浏览器的表单域 |
| **<font style="color:#E8323C;">206</font>** | Partial Content | 部分内容。服务器成功处理了部分GET请求 |
| | | |
| 300 | Multiple Choices | 多种选择。请求的资源可包括多个位置，相应可返回一个资源特征与地址的列表用于用户终端（例如：浏览器）选择 |
| **<font style="color:#E8323C;">301</font>** | Moved Permanently | 永久移动。请求的资源已被永久的移动到新URI，返回信息会包括新的URI，浏览器会自动定向到新URI。今后任何新的请求都应使用新的URI代替 |
| **<font style="color:#E8323C;">302</font>** | Found | 临时移动。与301类似。但资源只是临时被移动。客户端应继续使用原有URI |
| **<font style="color:#E8323C;">303</font>** | See Other | 查看其它地址。与301类似。使用GET和POST请求查看 |
| **<font style="color:#E8323C;">304</font>** | Not Modified | 未修改。所请求的资源未修改，服务器返回此状态码时，不会返回任何资源。客户端通常会缓存访问过的资源，通过提供一个头信息指出客户端希望只返回在指定日期之后修改的资源 |
| 305 | Use Proxy | 使用代理。所请求的资源必须通过代理访问 |
| 306 | Unused | 已经被废弃的HTTP状态码 |
| **<font style="color:#E8323C;">307</font>** | Temporary Redirect | 临时重定向。与302类似。使用GET请求重定向 |
| | | |
| **<font style="color:#E8323C;">400</font>** | Bad Request | 客户端请求的语法错误，服务器无法理解 |
| **<font style="color:#E8323C;">401</font>** | Unauthorized | 请求要求用户的身份认证 |
| 402 | Payment Required | 保留，将来使用 |
| **<font style="color:#E8323C;">403</font>** | Forbidden | 服务器理解请求客户端的请求，但是拒绝执行此请求 |
| **<font style="color:#E8323C;">404</font>** | Not Found | 服务器无法根据客户端的请求找到资源（网页）。通过此代码，网站设计人员可设置"您所请求的资源无法找到"的个性页面 |
| 405 | Method Not Allowed | 客户端请求中的方法被禁止 |
| 406 | Not Acceptable | 服务器无法根据客户端请求的内容特性完成请求 |
| 407 | Proxy Authentication Required | 请求要求代理的身份认证，与401类似，但请求者应当使用代理进行授权 |
| 408 | Request Time-out | 服务器等待客户端发送的请求时间过长，超时 |
| 409 | Conflict | 服务器完成客户端的 PUT 请求时可能返回此代码，服务器处理请求时发生了冲突 |
| 410 | Gone | 客户端请求的资源已经不存在。410不同于404，如果资源以前有现在被永久删除了可使用410代码，网站设计人员可通过301代码指定资源的新位置 |
| 411 | Length Required | 服务器无法处理客户端发送的不带Content-Length的请求信息 |
| 412 | Precondition Failed | 客户端请求信息的先决条件错误 |
| 413 | Request Entity Too Large | 由于请求的实体过大，服务器无法处理，因此拒绝请求。为防止客户端的连续请求，服务器可能会关闭连接。如果只是服务器暂时无法处理，则会包含一个Retry-After的响应信息 |
| 414 | Request-URI Too Large | 请求的URI过长（URI通常为网址），服务器无法处理 |
| 415 | Unsupported Media Type | 服务器无法处理请求附带的媒体格式 |
| 416 | Requested range not satisfiable | 客户端请求的范围无效 |
| 417 | Expectation Failed | 服务器无法满足Expect的请求头信息 |
| | | |
| **<font style="color:#E8323C;">500</font>** | Internal Server Error | 服务器内部错误，无法完成请求 |
| 501 | Not Implemented | 服务器不支持请求的功能，无法完成请求 |
| 502 | Bad Gateway | 作为网关或者代理工作的服务器尝试执行请求时，从远程服务器接收到了一个无效的响应 |
| **<font style="color:#E8323C;">503</font>** | Service Unavailable | 由于超载或系统维护，服务器暂时的无法处理客户端的请求。延时的长度可包含在服务器的Retry-After头信息中 |
| 504 | Gateway Time-out | 充当网关或代理的服务器，未及时从远端服务器获取请求 |
| 505 | HTTP Version not supported | 服务器不支持请求的HTTP协议的版本，无法完成处理 |


# web服务器
## 虚拟主机
+ 一台HTTP服务器上搭建多个Web站点，客户端发送请求时必须在Host首部完整指定主机名或域名的URL

## 通信转发程序
### 代理
+ 代理就是客户端和服务器的中间人

<!-- 这是一张图片，ocr 内容为：GET/HTTP/1.1 GET/HTTP/1.1 o 客户端 代理服务器 源服务器 HTTP/1.1200OK HTTP/1.12000K -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637158111181-95b00ad5-a9b7-450f-92f7-f2515f73ceb4.png)

#### 为啥使用代理
+ 利用缓存技术减少网络流量
+ 组织内部针对网站进行访问控制
+ 获取访问日志

#### 代理的分类
+ 缓存代理，会预先把资源副本保存在服务器上
+ 透明代理，不对报文进行任何加工

### 网关
+ 接收从客户端发来的数据时，会转发给其它服务器处理，再有自己返回
+ 使通信线路上的服务器提供非HTTP协议服务
+ 提高通信安全性

<!-- 这是一张图片，ocr 内容为：非HTTP协议通信 HTTP请求 HTTP响应 客户端 网关 非HTTP服务器 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637158855905-9dab9dca-f09e-41f4-b40b-ee3ab418c562.png)

# 首部
## 通用首部
| **<font style="color:rgb(68, 68, 68);">首部字段名</font>** | **<font style="color:rgb(68, 68, 68);">说明</font>** |
| --- | --- |
| <font style="color:rgb(68, 68, 68);">Cache-Control</font> | <font style="color:rgb(68, 68, 68);">控制缓存的行为</font> |
| <font style="color:rgb(68, 68, 68);">Connection</font> | <font style="color:rgb(68, 68, 68);">连接的管理</font> |
| <font style="color:rgb(68, 68, 68);">Date</font> | <font style="color:rgb(68, 68, 68);">创建报文的日期时间</font> |
| <font style="color:rgb(68, 68, 68);">Pragma</font> | <font style="color:rgb(68, 68, 68);">报文指令</font> |
| <font style="color:rgb(68, 68, 68);">Trailer</font> | <font style="color:rgb(68, 68, 68);">报文末端的首部一览</font> |
| <font style="color:rgb(68, 68, 68);">Transfer-Encoding</font> | <font style="color:rgb(68, 68, 68);">指定报文主体的传输编码方式</font> |
| <font style="color:rgb(68, 68, 68);">Upgrade</font> | <font style="color:rgb(68, 68, 68);">升级为其他协议</font> |
| <font style="color:rgb(68, 68, 68);">Via</font> | <font style="color:rgb(68, 68, 68);">代理服务器的相关信息</font> |
| <font style="color:rgb(68, 68, 68);">Warning</font> | <font style="color:rgb(68, 68, 68);">错误通知</font> |


## 请求首部
| **<font style="color:rgb(68, 68, 68);">首部字段名</font>** | **<font style="color:rgb(68, 68, 68);">说明</font>** |
| --- | --- |
| <font style="color:rgb(68, 68, 68);">Accept</font> | <font style="color:rgb(68, 68, 68);">用户代理可处理的媒体类型</font> |
| <font style="color:rgb(68, 68, 68);">Accept-Charset</font> | <font style="color:rgb(68, 68, 68);">优先的字符集</font> |
| <font style="color:rgb(68, 68, 68);">Accept-Encoding</font> | <font style="color:rgb(68, 68, 68);">优先的内容编码</font> |
| <font style="color:rgb(68, 68, 68);">Accept-Language</font> | <font style="color:rgb(68, 68, 68);">优先的语言（自然语言）</font> |
| <font style="color:rgb(68, 68, 68);">Authorization</font> | <font style="color:rgb(68, 68, 68);">Web认证信息</font> |
| <font style="color:rgb(68, 68, 68);">Expect</font> | <font style="color:rgb(68, 68, 68);">期待服务器的特定行为</font> |
| <font style="color:rgb(68, 68, 68);">From</font> | <font style="color:rgb(68, 68, 68);">用户的电子邮箱地址</font> |
| <font style="color:rgb(68, 68, 68);">Host</font> | <font style="color:rgb(68, 68, 68);">请求资源所在服务器</font> |
| <font style="color:rgb(68, 68, 68);">If-Match</font> | <font style="color:rgb(68, 68, 68);">比较实体标记（ETag）</font> |
| <font style="color:rgb(68, 68, 68);">If-Modified-Since</font> | <font style="color:rgb(68, 68, 68);">比较资源的更新时间</font> |
| <font style="color:rgb(68, 68, 68);">If-None-Match</font> | <font style="color:rgb(68, 68, 68);">比较实体标记（与 If-Match 相反）</font> |
| <font style="color:rgb(68, 68, 68);">If-Range</font> | <font style="color:rgb(68, 68, 68);">资源未更新时发送实体 Byte 的范围请求</font> |
| <font style="color:rgb(68, 68, 68);">If-Unmodified-Since</font> | <font style="color:rgb(68, 68, 68);">比较资源的更新时间（与If-Modified-Since相反）</font> |
| <font style="color:rgb(68, 68, 68);">Max-Forwards</font> | <font style="color:rgb(68, 68, 68);">最大传输逐跳数</font> |
| <font style="color:rgb(68, 68, 68);">Proxy-Authorization</font> | <font style="color:rgb(68, 68, 68);">代理服务器要求客户端的认证信息</font> |
| <font style="color:rgb(68, 68, 68);">Range</font> | <font style="color:rgb(68, 68, 68);">实体的字节范围请求</font> |
| <font style="color:rgb(68, 68, 68);">Referer</font> | <font style="color:rgb(68, 68, 68);">对请求中URI的原始获取方</font> |
| <font style="color:rgb(68, 68, 68);">TE</font> | <font style="color:rgb(68, 68, 68);">传输编码的优先级</font> |
| <font style="color:rgb(68, 68, 68);">User-Agent</font> | <font style="color:rgb(68, 68, 68);">HTTP客户端程序的信息</font> |


## 响应首部
| **<font style="color:rgb(68, 68, 68);">首部字段名</font>** | **<font style="color:rgb(68, 68, 68);">说明</font>** |
| --- | --- |
| <font style="color:rgb(68, 68, 68);">Accept-Ranges</font> | <font style="color:rgb(68, 68, 68);">是否接受字节范围请求</font> |
| <font style="color:rgb(68, 68, 68);">Age</font> | <font style="color:rgb(68, 68, 68);">推算资源创建经过时间</font> |
| <font style="color:rgb(68, 68, 68);">ETag</font> | <font style="color:rgb(68, 68, 68);">资源的匹配信息</font> |
| <font style="color:rgb(68, 68, 68);">Location</font> | <font style="color:rgb(68, 68, 68);">令客户端重定向至指定URI</font> |
| <font style="color:rgb(68, 68, 68);">Proxy-Authenticate</font> | <font style="color:rgb(68, 68, 68);">代理服务器对客户端的认证信息</font> |
| <font style="color:rgb(68, 68, 68);">Retry-After</font> | <font style="color:rgb(68, 68, 68);">对再次发起请求的时机要求</font> |
| <font style="color:rgb(68, 68, 68);">Server</font> | <font style="color:rgb(68, 68, 68);">HTTP服务器的安装信息</font> |
| <font style="color:rgb(68, 68, 68);">Vary</font> | <font style="color:rgb(68, 68, 68);">代理服务器缓存的管理信息</font> |
| <font style="color:rgb(68, 68, 68);">WWW-Authenticate</font> | <font style="color:rgb(68, 68, 68);">服务器对客户端的认证信息</font> |


## 实体首部
| **<font style="color:rgb(68, 68, 68);">首部字段名</font>** | **<font style="color:rgb(68, 68, 68);">说明</font>** |
| --- | --- |
| <font style="color:rgb(68, 68, 68);">Allow</font> | <font style="color:rgb(68, 68, 68);">资源可支持的HTTP方法</font> |
| <font style="color:rgb(68, 68, 68);">Content-Encoding</font> | <font style="color:rgb(68, 68, 68);">实体主体适用的编码方式</font> |
| <font style="color:rgb(68, 68, 68);">Content-Language</font> | <font style="color:rgb(68, 68, 68);">实体主体的自然语言</font> |
| <font style="color:rgb(68, 68, 68);">Content-Length</font> | <font style="color:rgb(68, 68, 68);">实体主体的大小（单位：字节）</font> |
| <font style="color:rgb(68, 68, 68);">Content-Location</font> | <font style="color:rgb(68, 68, 68);">替代对应资源的URI</font> |
| <font style="color:rgb(68, 68, 68);">Content-MD5</font> | <font style="color:rgb(68, 68, 68);">实体主体的报文摘要</font> |
| <font style="color:rgb(68, 68, 68);">Content-Range</font> | <font style="color:rgb(68, 68, 68);">实体主体的位置范围</font> |
| <font style="color:rgb(68, 68, 68);">Content-Type</font> | <font style="color:rgb(68, 68, 68);">实体主体的媒体类型</font> |
| <font style="color:rgb(68, 68, 68);">Expires</font> | <font style="color:rgb(68, 68, 68);">实体主体过期的日期时间</font> |
| <font style="color:rgb(68, 68, 68);">Last-Modified</font> | <font style="color:rgb(68, 68, 68);">资源的最后修改日期时间</font> |


# HTTP服务器
+ HTTP全称是超文本传输协议，构建于TCP之上，属于应用层协议

```javascript
const http = require('http')
const url = require('url')
const path = require('path')
const querystring = require('querystring')
const server = http.createServer((request, response) => {
  const { pathname } = url.parse(request.url)
  const { method } = request

  //! 1.配置跨域
  response.setHeader('Access-Control-Allow-Origin', request.headers.origin || '*')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  response.setHeader('Content-Type', 'application/json;charset=utf-8;')
  response.setHeader('Access-Control-Max-Age', '1800')
  if(method === 'OPTIONS') {
    response.statusCode = 200
    response.end()
  }

  //! 2.解析请求体
  const arr = []
  request.on('data', (chunk) => {
    arr.push(chunk)
  })

  request.on('end', () => {
    const res = Buffer.concat(arr).toString()
    let obj = null
    if(method === 'POST') {
      if(request.headers['content-type'] === 'application/x-www-form-urlencoded') {
        obj = querystring.parse(res)
      } else if(request.headers['content-type'] === 'application/json') {
        obj = JSON.parse(res)
      }
      //! 3.路由
      if(pathname === '/login') {
        response.end(JSON.stringify(obj))
      } else if(pathname === '/reg') {
        console.log(obj)
        response.end(JSON.stringify(obj))
      }
    }
  })
})
server.listen(3000, () => {
  console.log(`server start port 3000`)
})
```

# HTTP客户端
```javascript
const http = require('http')
const params = new URLSearchParams({
  'username' : 'Hello World!'
})
const postData = params.toString();
console.log(postData)

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头: ${JSON.stringify(res.headers)}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`响应主体: ${chunk}`);
  });
  res.on('end', () => {
    console.log('响应中已无数据。');
  });
});

req.on('error', (e) => {
  console.error(`请求遇到问题: ${e.message}`);
});

// 写入数据到请求主体
req.write(postData);
req.end();
```

# 参考
[图解http.pdf](https://www.yuque.com/attachments/yuque/0/2021/pdf/738210/1637132546333-61b5e1c4-27ff-443f-b55a-18a8b064079b.pdf)

[计算机网络常见问题总结](https://www.jianshu.com/p/195c7d2b1458)

[深度解密HTTP通信细节 - Stefno - 博客园](https://www.cnblogs.com/qcrao-2018/p/10285348.html)





