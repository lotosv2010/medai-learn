# 概述
## Web缓存介绍
+ Web 缓存是指一个 Web 资源（如 html 页面，图片，js，数据等）存在于 Web 服务器和客户端（浏览器）之间的副本。
+ 缓存会根据进来的请求保存输出内容的副本；当下一个请求来到的时候，如果是相同的 URL，缓存会根据缓存机制决定是直接使用副本响应访问请求，还是向源服务器再次发送请求。
+ Web 缓存大致可以分为：数据库缓存、服务器端缓存（代理服务器缓存、CDN 缓存）、浏览器缓存。
+ <font style="color:rgb(0, 0, 0);">浏览器缓存包括HTTP缓存和浏览器本地缓存，</font><font style="color:rgb(33, 37, 41);">浏览器本地缓存最常用的是cookie、localStroage、sessionStroage、webSql、indexDB。</font>

## Web缓存的作用
+ 减少网络延迟，加快页面打开速度
+ 减少网络带宽消耗
+ 降低服务器压力等等

# CDN
## CDN的定义
+ CDN：Content Delivery Network/Content Ddistribute Network，即内容分发网络

## 访问网站的过程
### 没有CDN
+ 用户在浏览器访问栏中输入要访问的域名
+ 浏览器向DNS服务器请求对该域名的解析
+ DNS服务器返回该域名的IP地址给浏览器
+ 浏览器使用该IP地址向服务器请求内容
+ 服务器将用户请求的内容返回给浏览器

### 使用了CDN
+ 用户在浏览器中输入要访问的域名
+ 浏览器向DNS服务器请求对域名进行解析。由于CDN对域名解析进行了调整，DNS服务器会最终将域名的解析权交给CNAME指向的CDN专用DNS服务器
+ CDN的DNS服务器将CDN的负载均衡设备IP地址返回给用户
+ 用户向CDN的负载均衡设备发起内容URL访问请求
+ CDN负载均衡设备会为用户选择一台合适的缓存服务器提供服务，选择的依据包括：根据用户IP地址，判断哪一台服务器距离用户最近；根据用户所请求的URL中携带的内容名称，判断哪一台服务器上有用户所需内容；查询各个服务器的负载情况，判断哪一台服务器的负载较小，基于以上这些依据的综合分析之后，负载均衡设置会把缓存服务器的IP地址返回给用户
+ 用户向缓存服务器发出请求
+ 缓存服务器响应用户请求，将用户所需内容传送到用户，如果这台缓存服务器上并没有用户想要的内容，而负载均衡设备依然将它分配给了用户，那么这台服务器就要向它的上一级缓存服务器请求内容，直至追溯到网站的源服务器将内容拉取到本地

## CDN缓存过程
+ 没有CDN：浏览器缓存
+ 使用了CDN：浏览器缓存+CDN缓存
+ 在用户第一次访问网站后，网站的一些静态资源如图片等就会被下载到本地，作为缓存，当用户第二次访问该网站的时候，浏览器就会从缓存中加载资源，不用向服务器请求资源，从而提高了网站的访问速度，而若使用了CDN，当浏览器本地缓存的资源过期之后，浏览器不是直接向源站点请求资源，而是向CDN边缘节点请求资源，CDN边缘节点中也存在缓存，若CDN中的缓存也过期，那就由CDN边缘节点向源站点发出回源请求来获取最新资源。

## 缓存机制
### 浏览器缓存机制
+ 浏览器在加载资源时，先根据这个资源的一些http header判断它是否命中强缓存，如果命中，浏览器直接从自己的缓存中读取资源，不会发请求到服务器，当强缓存没有命中的时候，浏览器一定会发送一个请求到服务器，服务器端依据资源的另外一些http header验证这个资源是否命中协商缓存，如果命中，服务器会将这个请求返回，但是不会返回这个资源的数据，而是告诉客户端可以直接从缓存中加载这个资源，于是浏览器还是从自己的缓存中加载资源，当协商缓存也没有命中的时候，浏览器直接从服务器加载资源数据。

### CDN缓存机制
+ CDN节点缓存机制在不同服务商中是不同的，但一般都遵循HTTP协议，通过http响应头中的Cache-Control:max-age的字段来设置CDN节点文件缓存时间。当客户端向CDN节点请求数据时，CDN会判断缓存数据是否过期，若没有过期，则直接将缓存数据返回给客户端，否则就向源站点发出请求，从源站点拉取最新数据，更新本地缓存，并将最新数据返回给客户端。CDN服务商一般会提供基于文件后缀、目录多个维度来指定CDN缓存时间，为用户提供更精细化的缓存管理。CDN缓存时间会对“回源率”产生直接的影响，若CDN缓存时间短，则数据经常失效，导致频繁回源，增加了源站的负载，同时也增大了访问延时；若缓存时间长，数据更新时间慢，因此需要针对不同的业务需求来选择特定的数据缓存管理。

# HTTP缓存
## 缓存作用
+ 减少了冗余的数据传输，节省了流量
+ 减少了服务器的负担，大大提高了网络的性能
+ 加快了客户端加载资源的速度

## 缓存位置
<!-- 这是一张图片，ocr 内容为：自由控制缓存哪些文件,如何匹配缓存,如何读取级存 Serviceworker 并且缓存是持续性的 读取高效 HemoryCache 缓存持续性很短 缓存位置 读取速度侵 3 DiskCache 比之HemonryCache胜在容量和存储时效性上. 只在会话(session)中存在 PuShCache 4 会话结束就被释放,并且缓存时间也很短暂 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637734895327-ca519826-c26a-45ac-9e71-d7d3ba4be005.png)

+ 浏览器可以在内存、硬盘中开辟一个空间用于保存请求资源副本。我们经常调试时在 DevTools Network 里看到 Memory Cache（內存缓存）和 Disk Cache（硬盘缓存），指的就是缓存所在的位置。请求一个资源时，会按照优先级（Service Worker -> Memory Cache -> Disk Cache -> Push Cache）依次查找缓存，如果命中则使用缓存，否则发起请求。
+ 从缓存位置上来看，分为4种，从上往下依次检查是否命中，如果但都没有命中则重新发起请求。
    - **Service Worker** 是运行在浏览器背后的独立线程，一般可以用来实现缓存功能。使用 Service Worker的话，传输协议必须为 HTTPS。
    - **Memory Cache** 也就是内存中的缓存，主要包含的是当前页面中已经抓取到的资源,例如页面上已经下载的样式、脚本、图片等。读取内存中的数据肯定比磁盘快,内存缓存虽然读取高效，可是缓存持续性很短，会随着进程的释放而释放。 一旦我们关闭 Tab 页面，内存中的缓存也就被释放了。内存缓存中有一块重要的缓存资源是preloader相关指令（例如<link rel="prefetch">）下载的资源。它可以一边解析js/css文件，一边网络请求下一个资源。
    - **Disk Cache** 也就是存储在硬盘中的缓存，读取速度慢点，但是什么都能存储到磁盘中，比之 Memory Cache 胜在容量和存储时效性上。绝大部分的缓存都来自Disk Cache，在HTTP 的协议头中设置。
    - **Push Cache**（推送缓存）是 HTTP/2 中的内容，当以上三种缓存都没有命中时，它才会被使用。它只在会话（Session）中存在，一旦会话结束就被释放，并且缓存时间也很短暂，在Chrome浏览器中只有5分钟左右，同时它也并非严格执行HTTP头中的缓存指令。

### memory cache
+ 表示不访问服务器，直接从内存中读取缓存。因为缓存的资源保存在内存中，所以读取速度较快，但是关闭进程后，缓存资源也会随之销毁，一般来说，系统不会给内存分配较大的容量，因此内存缓存一般用于存储较小文件。同时内存缓存在有时效性要求的场景下也很有用（比如浏览器的隐私模式）。

### disk cache
+ 表示不访问服务器，直接从硬盘中读取缓存。与内存相比，硬盘的读取速度相对较慢，但硬盘缓存持续的时间更长，关闭进程之后，缓存的资源仍然存在。由于硬盘的容量较大，因此一般用于存储大文件。
+ 下图可清晰看出差别：

<!-- 这是一张图片，ocr 内容为：(diskcache) (index) 14ms TOO2R300x300M000003ue2B23T5anE_1.j... 200 webp (diskcache) TO02R300x300M00000480YVs1LdWi6 13ms 200 (index) webp (diskcache) 13ms (lndex) webp 200 TO02R300x300M000000WbZC32ZUNYO_ 13ms (index) (diskcache) webp 200 TO02R300x300M000000iE50j2CpTzn_... 0ms (lindex) (memorycache) 200 icon-sprite@2x.png?max_age-2592000&V... png 0ms (index) 200 bg.detailjpg?max_age-2592000&V05dd... (memorycache) webp 0ms index_tit@2x.png?max_age-2592000&V-C.. (index) 200 (memorycache) png (index) (memorycache) 200 0ms coverplay@2x.png?max_age-2592000&V... png -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637742367409-a7ca55b9-d1a4-40dd-b6ea-8ecce9c35651.png)

### prefetch cache
+ 在 preload 或 prefetch 的资源加载时，两者也是均存储在 http cache，当资源加载完成后，如果资源是可以被缓存的，那么其被存储在 http cache 中等待后续使用；如果资源不可被缓存，那么其在被使用前均存储在 memory cache。

<!-- 这是一张图片，ocr 内容为：200 (prefetchcache) 2dsr-1272299... sTyleshEeT index.chunk.css ms ??jdf/ib/jquery-1.6.4.js/p/common/j/. ?dsr-1272299... 2ms 200 (Prefetchcache) script script 200 ?dsr1272299... wljs 1ms (prefetchcache) script runtiMe.js 200 ?dsr1272299... (Prefetchcache) ms script index.chunk.js ?dsr-1272299.. 200 39ms (Prefetchcache) 200 ?dsn-1272299... 13ms (Pprefetchcache) png eed6f6cbtide3aaa.png 13ms (prefetchcache) Oaffoa42cece09ee.png 200 ?dsrl-1272299... png 14ms ?dsr-1272299... 200 (prefetchcache) afb4399323fe3b76.png png 14ms 200 (prefetchcache) ?dsr-1272299. 8f3f63ae04ff19af.ong png -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637742367543-62bc010f-f0f3-4ae7-8e26-02994b5a8a9e.png)

### CDN Cache
+ 以腾讯 CDN 为例：X-Cache-Lookup:Hit From MemCache 表示命中 CDN 节点的内存；X-Cache-Lookup:Hit From Disktank 表示命中 CDN 节点的磁盘；X-Cache-Lookup:Hit From Upstream 表示没有命中 CDN。

<!-- 这是一张图片，ocr 内容为：PreviewReSponseTiming Headers General RequtURGhtp:/.mg RequestMethod:GET StatusCode 2000K(Fromcache) RemoteAddress:127.0.0.1:8080 ResponseHeaders viewsource Cache-Control:max-age-2592000 Connection:keep-alive Content-Length:2254 Content-Type:image/webp Date:Hed201612:26:87T ExpiresFri7ct612687T Keep-Alivetimeout-30 Last-Modified:FriJu:4:22T Server:x2s_Platform x-Cache-Lookup:HitFromDisktank RequestHeaders viewsource Acceptimage/webp,image/**9-0.8 Accept-Encoding:gzip,deflatesdch Accept-Language:zh- Host:ygtimgcn Proxy-Connection:keep-alive Refererhttp://y.qq.com/porta/singerlist.htm UseR-AgentMozinla/s.indowsNT6.1;N64)Ap1 Applclebkit/537.36(k/ -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637742497263-93506700-c93c-4e73-a5ae-ca4679a6a370.png)

## 用户操作对缓存的影响
<!-- 这是一张图片，ocr 内容为：查找dskcache中是否有匹配 地址栏输入地址 没有匹配则发送网络请求 优先使用memorycache 用户行为的影响 普通刷新CF5) 其次才是dskcache 强制刷新(C+5) 浏览器不使用缓存 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637735122936-936ab77a-b349-474f-bb64-75a76d4c1005.png)

| **用户操作** | **Expires/Cache-Control** | **Last-Modified/Etag** |
| --- | --- | --- |
| 地址栏回车 | 有效 | 有效 |
| 页面链接跳转 | 有效 | 有效 |
| 新开窗口 | 有效 | 有效 |
| 前进、后退 | 有效 | 有效 |
| F5刷新 | 无效 | 有效 |
| Ctrl+F5刷新 | 无效 | 无效 |


## 缓存分类
+ 根据是否需要重新向服务器发起请求来分类
    - 强制缓存（也称本地缓存）
    - 协商缓存（也称弱缓存）
+ 强制缓存如果生效，不需要再和服务器发生交互，而协商缓存不管是否生效，都需要与服务端发生交互
+ 下面是强制缓存和协商缓存的一些对比：

<!-- 这是一张图片，ocr 内容为：协商缓存 强缓存 缓存存放位置 本地浏览器 本地浏览器 http状态码 304 200 Pragma ETag/if-Not-Match Cache-Control 谁来决定 Last-Modified/if-Modified-Since Expires 1,ctrl+F5强制刷新--无效 1,Ctrl+F5强制刷新--无效 2,F5刷新 -有效 2,F5刷新 --无效 --有效 3,地址栏回车 3,地址栏回车 --有效 操作是否有效 --有效 4,页面链接跳转 --有效 4,页面链接跳转 5,新开窗口 --有效 5,新开窗口 --有效 6,前进,后退 --有效 6,前进,后退 --有效 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637735455585-bbdfc61d-1120-448b-b784-30be1bf010b4.png)

### 强制缓存
+ 不需要发送请求到服务端，直接读取浏览器本地缓存，在 Chrome 的 Network 中显示的 HTTP 状态码是 200 ，在 Chrome 中，强缓存又分为 Disk Cache（存放在硬盘中）和 Memory Cache（存放在内存中），存放的位置是由浏览器控制的。是否强缓存由 Expires、Cache-Control 和 Pragma 3 个 Header 属性共同来控制。

<!-- 这是一张图片，ocr 内容为：强制缓存规则下,缓存未命中 强制缓存规则下,缓存命中 缓存数据库 客户端 服务器 缓存数据库 客户端 请求数据 请求数据 缓存数据失效 有缓存数据,且未失效,返回数据 请求数据 客户端 缓存数据库 返回数据和缓存规则 将数据和缓存规则存入缓存系统 客户端 缓存数据库 服务器 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637735822280-1ec2ab3f-045b-41a4-b464-f3f4bfc1d8b4.png)

#### Expires
+ Expires 的值是一个 HTTP 日期，在浏览器发起请求时，会根据系统时间和 Expires 的值进行比较，如果系统时间超过了 Expires 的值，缓存失效。由于和系统时间进行比较，所以当系统时间和服务器时间不一致的时候，会有缓存有效期不准的问题。Expires 的优先级在三个 Header 属性中是最低的。

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  test
  <script src="./index.js"></script>
</body>
</html>
```

```javascript
console.log(123)
```

```javascript
const http = require('http')
const url = require('url')
const fs = require('fs')
const path = require('path')

http.createServer((req, res) => {
  const { pathname } = url.parse(req.url)
  console.log(pathname)
  const filePath = path.join(__dirname, pathname)
  // 1.强制缓存
  // 分类：
  //  expires 老版本浏览器支持，绝对时间
  //  cache-control 相对时间
  // 特点
  //  默认强制缓存不缓存首页(如果已经断网，那这个网页应该访问不到，所以首页不会被缓存)
  //  引用的资源可以被缓存下来，后续找缓存，不会像服务器请求200
  // 不足
  //    强制缓存不会向服务器发送请求，会导致页面修改后，视图依旧采用老的
  res.setHeader('Expires', new Date(Date.now() + 10 * 1000).toGMTString()) // 缓存10秒

  fs.stat(filePath, (error, statObj) => {
    if(error) return res.statusCode = 404, res.end('Not Found')
    if(statObj.isFile()) {
      fs.createReadStream(filePath).pipe(res)
    } else {
      return res.statusCode = 404, res.end('Not Found')
    }
  })
}).listen(3000)
```

+ 第一次加载，页面会向服务器请求数据，并在 Response Header 中添加 Cache-Control ，过期时间为 10 秒。

<!-- 这是一张图片，ocr 内容为：DevTools-localhost:3000/public/index.htm  PerfomanceMamaryAoplication D CSSOvarviow Security Console Elements Rodux Lighthouse JavaScnptProfllor Sourcos D DisablecacheNothrotting Preservelog HIDEDAT&URLSAII BlockEdREqUests FelcHXHRJSCSSI 3rd-partyraquosts ISLIgMEDaFontDocWsWasmManifest 1109me 1200ma 400m5 300m8 5O0ma e00m 500ms SIze WATErfall Statu/s TiME Name Inifator index.html 200 477B Other 34mg docurient 200 60ms indexhtml 198B indax.s script 1.8kB 250.j52 68m5 stylesheat 293kB 461ms 2502 stylashant blueprint.css 2.9KB 379mS 250.62 200 styloshaat blueprini-Soloclcss 3.7kB 250j52 200 385ms stylesheet Finish:1.29s 301kBresources DOMCOntentLoadod:528msLoac1.33 6requests302kBtransferred -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637740839677-e1487e5d-95d5-4b50-b6fb-851849e66ac6.png)

<!-- 这是一张图片，ocr 内容为：DevTools-localhost:300/public/index.html  D PartomanceMemoryApplication CSSOwOryTow Eloments Security Congdle Redux JavaScnptProtllor Lighthouse 林 DisablecacheNothrottiling 令 Prosorvolog HIDEDALAURLSAI BlockedRequasts FontDocWs Fetch/XHR AJSCSSLMgMadin 3rd-partyraquests WasmManilestOther 1200ms 1100me 400ms 00me boCms 900ms 800m6 600ma Initiator Timing Pravie Response Cookies Name indax.html General index.Jj ReguestURL:http://ocaLhost:300/ubc/dex. RoqUesIMethod:GET blueprint.css StatusCode:82000K 口 bluoprint-solocl.css REMoteADDress::11:3000 Pcropper.css ReterrerPolicy:strict-origin-hncoi REsponseHeaders WIewSourca Connection;kgep-alive DAtE:HeD2No202108:00:10GT Expires:Hed24Nov202108:88:20T Koop-Alive:timeout-5 Transfer-Encoding:chunked REquesTHeadersViewsource Accept:*/* Accept-Encoding:gzip,deftatebr Accopt-Language:zh-on.zh;q. Connection:keep-alive 一都如都地地 都都都地心 都都 1073330@ LocathosT:3098 Host1 Ratererhttp://Locathost:300/public/idex.t SeCch-U:"NotA:Band"co SoC-ch-ua-mobile:7o Grequests302kBtransfened sec-ch-ua-platform.:"macos" -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637740863694-7d727b9f-539d-4d91-9048-8b089d5012f8.png)

+ 第二次加载，Date 头属性未更新，可以看到浏览器直接使用了强缓存，实际没有发送请求。

<!-- 这是一张图片，ocr 内容为：DevTools-localhost:3000/public/index.htm PorToMmanceMemoryAoplicaton  CSSOworvlowI Socurity Console Lghthousa Rodux Elomonts JavaScnplProtilor Nothrottling 业 Prosarvolog Disablocache HIdEDALAURLSAIl FeLch/XHRJSCSSgMAdLaFOnLDac cwsWasmmManitestOther BlockedRequests lvert Hasblockedcopkies 3rd-partyroquosls 100ms 1C0me 1000mg SOUmTS 800m6 500m6 SIzG TiMe Slatus Type lnitiator 477B 200 OThar index.html 13mg dacument 200 0ms index.html (memmorycache) 200 42m5 1.8KB 250j52 nomalize.css 293kB 403ms 250.82 blueprnt.css Stwleshaet 2.9KB 250.12 332ms 200 stylesheot blugprint-solocl.css 250j2 3.7kB 200 332m5 stylesheet 301kBresources Finish:1.18s DOMContentLoaded:449msLoac1.29 Grequests302kBtransferred -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637740898125-c6c7e5e4-2aa6-4e9e-85ee-aea97ff2c3bc.png)

<!-- 这是一张图片，ocr 内容为：DevTools-localhost:3000/public/index.htm PorlomanceMamaryApplication 林 CSSOworvlow直 Securlty Console Lghthouse Rodux JavaScnptProtilor Nothrottilng 金 Disablpcache Presorvolog HIDEDALAURLSAII FelchxHRJscslng BlockndRoquosLs 3rd-partyrequests Hasblockedcookies WasmManilestothar FOntDocws 100ms 00ma 800ms SO0Re 1000mg e00mre 200me 500ms ro0ma Tuing Initiator Response Prewew Headers index.html General index.Jj ROGUEGTURL:HTT L:http://ocathost:3000/public/index 竖RequestMethod:GET bluepint.css StatusCode: DK(fromme-orycache) 2000K 口 bluoprint-soloclcss ROMOTEADDROSS:11:3000 Pcropper.css ReferrerPolicy:strict-oriin REsponseHeaders COnnection;Keep-alive DAto:Hd24NV202108:01:09T Expires:Nd24No202108:01:19T Koep-Alive:timeout-5 Transter-Encoding:chunked RequesTHeaders ProvislonalheadersareshownDisablecachetoseeuheders Refererhttp://ocathost:3008/puolic/index.ht secch-U:"Hotr sec-ch-ua-mobile:76 Sec-ch-ua-platform:"macos" mmtt. Grequests302kBtransfered -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637740926964-946073a7-aa54-46c6-82a9-1f5e5b98f147.png)

+ 过了 10 秒的超时时间之后，再次请求资源

<!-- 这是一张图片，ocr 内容为：DevTools-localhost:300/public/index.htm  PerfomanceMomoryAoplication P CSSOwOrYHow Elomonts Security Congdlo Redux Lighthouse JavaScnplProtllor 剁堂 林 DisablecacheNothrotuilng Proscrvelog HIDADALAURLSAIN FeLCHXHRJSCSSLgMadaFontDocWs BlockedRequests 3rd-partyrequesLs ManifestOthar Wasm 1200ms 1100me 300ms 500m 100mi 800m SIze Waterfall Type TIme Status Name Iniator 200 index.html Other 477B 29ms dacumant 200 Indox.html 13ms 198B Index-/s scripi 1.8kB 200 250S2 60ms stylesheet 293KB 471m5 25032 stylesheet blueprintc5s 2.9kB 250./12 409ms stylesheet 200 blueprinl-SolocLcss 3.7kB 250j32 200 408ms stylesheet 301kBresources Finish;1.295 DOMContentLoaided:454ms Load:1.335 Grequests302kBtransferred -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637741109958-49abd5cb-e6a2-4946-871b-1aac605d5c58.png)

<!-- 这是一张图片，ocr 内容为：DevTools-localhost:300/public/index.htm  ParfomanceMomoryAoplication D CSSOWOrYNOWI Security Redux Consdle JavaScnptProfilor Lighthouse Sources DISObICAcHeNOthrottng今 林 Prosarvelog HIDEDALAURLSAIN FALcH/XHRJSCSSgModuFontDocWs BlockedRoquGsLs 3rd-partyrequosTs ManilestOther Wasmh 1200ms 1100mE 400m P0Ums 300ms g00me 900m6 bo0ms Tiring REsponse Preview Inrtiator Cookies Name index.htm General index.Jj REquesTURL:HtTP:/caLhosT:30/ubLc/IDeX ReqUesIMethod:GET blueprint.css StatusCode:82000K 口 bluoprint-solocl.css REmoteAdDress:1::11:3000 Pcropper.css ReferrerPolicy:stict-orginhec RESPOnsEHEaders VIEwvSOurce Connection;Keep-aliwe Date:Hed24Nov282108:04:47GT Expires:ned24No202108:04:57T Transfer-Encoding:chunked RequestHeadersMiewsourae Accept:*/* Accept-Encoding:qzip,deflate,br Accopt-Language:zh-on.zh;q-o. Connection:keep-alive 一都如都地地 都都地心 都都 1073330@ LocathosT:3098 Host1 Ratererhttp://Locathost:300/public/idex.t SeCch-U:"NotA:Band"co SoC-ch-ua-mobile:7o Grequests302kBtransfened sec-ch-ua-platform.:"macos" -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637741133237-e970a04e-356d-446f-b606-b6a2e395c527.png)

#### Cache-Control
+ Cache-Control 是 HTTP/1.1 中新增的属性，在请求头和响应头中都可以使用，常用的属性值如有：
    - max-age：单位是秒，缓存时间计算的方式是距离发起的时间的秒数，超过间隔的秒数缓存失效
    - no-cache：不使用强缓存，需要与服务器验证缓存是否新鲜
    - no-store：禁止使用缓存（包括协商缓存），每次都向服务器请求最新的资源
    - private：专用于个人的缓存，中间代理、CDN 等不能缓存此响应
    - public：响应可以被中间代理、CDN 等缓存
    - must-revalidate：在缓存过期前可以使用，过期后必须向服务器验证

```javascript
const http = require('http')
const url = require('url')
const fs = require('fs')
const path = require('path')

http.createServer((req, res) => {
  const { pathname } = url.parse(req.url)
  console.log(pathname)
  const filePath = path.join(__dirname, 'public',pathname)
  // 1.强制缓存
  // 分类：
  //  expires 老版本浏览器支持，绝对时间
  //  cache-control 相对时间
  // 特点
  //  默认强制缓存不缓存首页(如果已经断网，那这个网页应该访问不到，所以首页不会被缓存)
  //  引用的资源可以被缓存下来，后续找缓存，不会像服务器请求200
  // 不足
  //    强制缓存不会向服务器发送请求，会导致页面修改后，视图依旧采用老的
  res.setHeader('Cache-Control', 'max-age=10') // 缓存10秒
  // res.setHeader('Cache-Control', 'no-cache') // 错误理解：不缓存，正确理解：缓存但是每次都会发请求
  // res.setHeader('Cache-Control', 'no-store') // 不再浏览器中进行缓存，每次都请求服务器

  fs.stat(filePath, (error, statObj) => {
    if(error) return res.statusCode = 404, res.end('Not Found')
    if(statObj.isFile()) {
      fs.createReadStream(filePath).pipe(res)
    } else {
      return res.statusCode = 404, res.end('Not Found')
    }
  })
}).listen(3000)
```

<!-- 这是一张图片，ocr 内容为：DevTools-localhost:3000/index.html D ParlommanceMomoryApplication CSSOwarvlaw Console Socurity JavaScnptProfiler Lohthouse Rodux Sources P Nothrottling Disablecache Prosorvelog All Jscsslmg Felch/XHR DacwsWasmManifestOther BlocKedRoquosts Hasblockodcopkles 3rd-partyrequests MedaFontD 1500ms 200m1s 2400mma BOUTTs Tiring Response Prowew index.html Goneral ndex.Jjs RequestURL:hT//ocaLhosT:3000/index. RoquostMethod:GET bluepint.css StatusCode: 2000k(frommerorycache) 口 bluoprint-soloct.css REmoteAdDress:[::11:3000 V RefererPolicy:strict-orqin-hcooii RESponsEHeaders Date:Hled24No282108:10:23GT Koep-Alive:timeout-5 Transter-Encoding:chunked RequestHeaders ProvisionalheadersareshownDisablecacheoshd Refererhttp://loca1host:30/index.ht seCch-:"NotAn"" Sec-ch-ua-mobile:70 oc-ch-ua-platform;"anc0s" d心. Grequests302kBtransfered -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637741506417-aca9c355-d261-4450-86a3-84a8861d0841.png)

#### Pragma
+ Pragma 只有一个属性值，就是 <font style="color:#E8323C;">no-cache </font>，效果和 Cache-Control 中的 no-cache 一致，不使用强缓存，需要与服务器验证缓存是否新鲜，在 3 个头部属性中的优先级最高。

```javascript
const http = require('http')
const url = require('url')
const fs = require('fs')
const path = require('path')

http.createServer((req, res) => {
  const { pathname } = url.parse(req.url)
  console.log(pathname)
  const filePath = path.join(__dirname, 'public',pathname)
  // 1.强制缓存
  // 分类：
  //  expires 老版本浏览器支持，绝对时间
  //  cache-control 相对时间
  // 特点
  //  默认强制缓存不缓存首页(如果已经断网，那这个网页应该访问不到，所以首页不会被缓存)
  //  引用的资源可以被缓存下来，后续找缓存，不会像服务器请求200
  // 不足
  //    强制缓存不会向服务器发送请求，会导致页面修改后，视图依旧采用老的
  // res.setHeader('Expires', new Date(Date.now() + 10 * 1000).toGMTString())
  res.setHeader('Cache-Control', 'max-age=10') // 缓存10秒
  res.setHeader('Pragma', 'no-cache')

  fs.stat(filePath, (error, statObj) => {
    if(error) return res.statusCode = 404, res.end('Not Found')
    if(statObj.isFile()) {
      fs.createReadStream(filePath).pipe(res)
    } else {
      return res.statusCode = 404, res.end('Not Found')
    }
  })
}).listen(3000)
```

+ <font style="color:#E8323C;">当 Pragma 和 Cache-Control 同时存在的时候，Pragma 的优先级高于 Cache-Control</font>

<!-- 这是一张图片，ocr 内容为：DevTools-localhost:3000/index.html  PorfommanceMamaryApplication D CssOvaryiow Eloments Socurity Liahthous0 Consdle Rodux JavaScnptProfiler Tng今堂业 林 DIsablecacheNothrottiling Proservelog HIDEDALAURLSAI FetchXHR BlockedRequests CSSIMgMADiaFontDocwsWasmManiestother JsC 3rd-partymquosts 1200ms 1109mE 400m 900ms 800me Cookies Rasponse Timing Preview lnitiator Name indax.html General index.J RequestURL:htt//ocathosT:3000/index RequestMethod:GET blueprint.css StatusCode:P200OK 口 bluoprini-solocl.css RemoteADDress:1::11:3000 V ReterrerPolicy:strict-origin-hec REsponseHeadersMewgourer COnnecTion:KCEp-alive Date:Mld24No202108:15:57GT Keep-Alive:tiooout-5 Pragma:no-cache Trangfer-Encoding:chunked RaguostHoadors Viowsourco ACCEpta/4 Accept-Encoding:gzio,deftate.br Accept-Language:zh-CNhq9 COnnecTion;KCEp-alive  都  0c HOSTLoCaLhOsT:3006 Retererhttp://ocahost:3008/index.htm secch-Ua"NotArandiv"l" sec-ch-ua-moblle:70 Grequests302kBtransferred -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637741800504-97787474-e7d1-4b16-85a6-05ae2a54a59c.png)

#### 总结
| **header属性** | **可选值** | **优先级** | **优缺点** |
| --- | --- | --- | --- |
| Pragma(HTTP/1.0) | no-cache:不直接使用缓存，根据新鲜度来使用缓存 | 高 | 1、响应头不支持这个属性<br/>2、为了兼容HTTP/1.0的客户端<br/>3、在HTTP1.1中已被废弃 |
| Cache-Control(HTTP/1.1) | 1、no-cache:不直接使用缓存，根据新鲜度来使用缓存<br/>2、no-store:不使用缓存，每次都是请求下载新资源<br/>3、max-age:xx秒，缓存时常<br/>4、public/private:是否只能被单个用户使用，默认为private<br/>5、must-revalidate:每次访问需要缓存校验 | 中 | 1、请求头和响应头都支持这个属性<br/>2、不适用于HTTP/1.0<br/>3、在缓存未失效前，获取不到修改后的资源 |
| Expires(HTTP/1.0+) | GMT时间 | 低 | 1、服务器和客户端的时间不一致会出问题<br/>2、适用于HTTP/1.0和HTTP/1.1<br/>3、在缓存未失效前，获取不到修改后的资源 |




### 协商缓存
+ 当浏览器的强缓存失效的时候或者请求头中设置了不走强缓存，并且在请求头中设置了 If-Modified-Since 或者 If-None-Match 的时候，会将这两个属性值到服务端去验证是否命中协商缓存，如果命中了协商缓存，会返回 304 状态，加载浏览器缓存，并且响应头会设置 Last-Modified 或者 ETag 属性。

<!-- 这是一张图片，ocr 内容为：对比规则下,缓存命中 对比缓存规则下,缓存未命中 客户端 缓存数据库 服务器 服务器 客户端 缓存数据库 获取缓存数据的标识 获取缓存纹据的标识 返回缓存效据的标识 返回缓存数据的标识 请求服务器验证缓存标识对应的效据是否失效, 请求服务器验证缓存标识对应的数据是否失效 通知客户端缓存未失效 返回最新效据和缓存规则 获取缓存数据 将数据和存规则存入缓存系统 客户端 缓存数据库 服务器 服务器 客户端 缓存数据库 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637743723530-d6e09c94-2192-4bfc-9ef4-c211bfb99c7f.png)

#### ETag/If-None-Match
+ ETag/If-None-Match 的值是一串 hash 码，代表的是一个资源的标识符，当服务端的文件变化的时候，它的 hash 码会随之改变，通过请求头中的 If-None-Match 和当前文件的 hash 值进行比较，如果相等则表示命中协商缓存。ETag 又有强弱校验之分，如果 hash 码是以 "W/" 开头的一串字符串，说明此时协商缓存的校验是弱校验的，只有服务器上的文件差异（根据 ETag 计算方式来决定）达到能够触发 hash 值后缀变化的时候，才会真正地请求资源，否则返回 304 并加载浏览器缓存。

```javascript
const http = require('http')
const url = require('url')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
// md5 摘要算法：不是加密算法(不可逆)
//  1.不可逆
//  2.不同内容转化的结果不相同
//  3.转化后的结果都是一样长的
//  4.同样的东西产生的结果肯定是相同的

http.createServer((req, res) => {
  const { pathname } = url.parse(req.url)
  console.log(pathname)
  const filePath = path.join(__dirname, 'public',pathname)
  // 1.协商缓存
  // 分类：
  //  Last-Modified  & If-Modified-Since 
  //  ETag  & If-None-Match 
  // ETag特点
  //  第一次请求，需要跟进内容产生一个唯一标识，对应当前的文件
  // ETag不足
  //   性能不高

  // 设置强制缓存策略
  res.setHeader('Cache-Control', 'no-cache')
  // 获取缓存时间
  const ifNodeMatch = req.headers['if-none-match']

  fs.stat(filePath, (error, statObj) => {
    if(error) return res.statusCode = 404, res.end('Not Found')
    // 设置 ETag  & If-None-Match 缓存
    const contentHash = crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('base64')
    if(contentHash === ifNodeMatch) {
      res.statusCode = 304
      return res.end()
    }
    res.setHeader('ETag', contentHash)
    if(statObj.isFile()) {
      fs.createReadStream(filePath).pipe(res)
    } else {
      return res.statusCode = 404, res.end('Not Found')
    }
  })
}).listen(3000)
```

+ 第一次请求如下：

<!-- 这是一张图片，ocr 内容为：DevTools-localhost:3000/index.html  D ParfomanceMomoryApPlIcation CSsOworviowI JavaScnptPronilor Elements Lighthouse Socurity Consdle Rodux Sources 中 DIisablecachoNothrotilng Preservelog BlocKEdREqUesLs HIDEDALAURLsAIN Felch/XHRJSCSSLMgMe DacWSW IsWasmManilesLOTher 3rd-partyrequasts Hasblockedcookloes MadiaFontD 800mE 2000ms 2400ms 400ms 1400m 1800mg 2200m6 SIze Status TiMe Watertall 200 494B 178ms OTher indax.html document 200 215B Indexc.html 56ms sCriPl indax./s 250.152 1.8KB 200 98ms stylesheet 708ms 293KB 250i2 stylesheet bluaprint.c5s 2.9KB 250.S2 styloshoot 572ms 200 bluoprint-Seloct.cs 日 3.7kB 250jS:2 200 571ms stylesheet CrOPpcr.Css 404 163B OIher 5ms textiplain Taviconiao WeCom 301kBresources Finish:2,585 DOMConTenILoaded:1.33s 7requests302kBtransferrod -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637743922595-00c1a7a9-1c24-42d4-b28f-83b50f6e69b1.png)

<!-- 这是一张图片，ocr 内容为：DeyTools-localhost:3000/index.html  PerfomanceMemoryAoplication D CSsOvaryiowI Socurity Elomonts Lghthousa JavascnptPronler Consdle Rodux Sources 中 DisablecacheNothrottling Prosorvolog HIOEDALAURLSAIN Felch/xHRJscslmgMadiaFont BlocKDdROqUOSIs IDacwswasmMarilleslOther Hasblockedcookios 3rd-partyrequesls lnvert 100m5 1400ms 800ms 2100mg 1800ms 2200m6 名00m6 Prew Timing Cookies Respanse Inntialor Name index.html indax./s RequestURL:htTP:ocaLhosT:3000/inDex RoguostMothod:GET blueprint.Css 2000K StaTusCode: bluoprint-Seloct.css ROMOTEADDRESS:1:1:3000 7 cropper.css RetererPolicy:strict-orqinh-co-riqi faviconico TsMewsourcA ResponseHeaders Cache-Control:no-cache COnnecTIon:KCCP-alivc Date:Med24No202109:02:32GT ETAGPZRJXROBLIKPIGKOH9YAFIWS Keep-Alive:timeout-5 TransferEncoding:chunked RaguestHoadors Viewsource Accept*/ Accopt-Encoding:gzipdefLatebr Accept-Language:zh-cq.zh;qo.9eng0. Cache-Control:no-cache Connection:KEep-alive 都 都都都 都 1073230@ HostLocathost:3065 Pragma:no-cache Refererhttp://locahost:306/1ndex.htm 7requosts302kBtransferred -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637744617412-9d3efc71-ec91-49a9-826d-0b09f303c812.png)

+ 第二次请求如下：

<!-- 这是一张图片，ocr 内容为：DevTools-localhost:3000/index.html  PorfommanceMamoryApplication D CssOvarylow Eloments Socurlty Congalo Lighthouse Rodux JavaScnptProfler 林 DisablecacheNothrottiling 中 Prosarvolog HIDEDATAURLSAI FulchXHRJsCSS BlockEdREqUests 3rd-party7quosts lMgMadaFontDacwsWasmManifestothar HasblockedcoDkes 1109mE 1200ms 100m5 300ms 5c0mg 300m6 SIze Time Name lnitiator Slatus TyPe index.html Other 138B 25ms docurent 304 10ms indexhtml 138B indox.Js Script 1.8KB 250j52 78ms 200 stylesheet nomalize.css 293KB 476ms 250js:2 stwlasheet bluaprint.css 2.9KB 250.s2 400ms styloshoot bluoprint-Soloclcss 3.7kB 250j3:2 200 399m9 stylesheet 301kBresources Finish:1.29 DOMContentLoaded:555ms Grequests301kBtransferrod Load1.35s -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637744491142-5f5057bb-ec8f-4d1f-af0d-b725be7768b4.png)

<!-- 这是一张图片，ocr 内容为：DevTools-localhost:3000/index.html  D PerfomanceMamoryApplication CSSOweryiew JavaScnptProflor Socurity Consale Lahthouse Rodux Sources 中 Nothrottiling Disablecache Proservelog HIOEDALAURLSAII FeLcHXHRJSCSSLIgMedaFontDocwr wisWasmManitestOther HasBlocKEdCDDkies lnvert BlockedRoquosts 3rd-partyrequests 2200m3 400ms BOUM3 1500mng Tirring Cookiles Prewiew indax.html General index.Jjs RequestURL:http://ocathost:3000/index. RoquestMothod:GET blueprint.css StatusCode: 304NOTMoDiTIED 口 bluoprinl-solocl.css REMotEADDress:1::1l:3000 V RefererPolicy:stictoriqin-hcii ResponseHeaders RMeWSOurca Cache-Control:no-cache COnnection:KEep-alive Date:Hd24N202109:03:51GT Keep-Alive:timeout-5 RequestHeaders Vowsource ACCEPt*/* Accept-Encoding:gzipdeflateb Accept-Language:zh-Cn,zh;q-o.9q COnneCtIon+KEEp-al1ve 山店心 心如都 心心 310330:@ 竖HOstLocALhost:3068 f-None-Match:zrJxRoBllkpGkp4b9YqFlw REfERerhttp://LocaLhot:3/index SeCchUR:"NotABRAN" Sec-ch-ua-moblle:70 6roquosts301kBtransferred sec-ch-ua-platform:"macos" -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637744671087-64f9f0c0-651c-443d-a87a-e8df1400d447.png)

#### Last-Modified/If-Modified-Since
+ Last-Modified/If-Modified-Since 的值代表的是文件的最后修改时间，第一次请求服务端会把资源的最后修改时间放到 Last-Modified 响应头中，第二次发起请求的时候，请求头会带上上一次响应头中的 Last-Modified 的时间，并放到 If-Modified-Since 请求头属性中，服务端根据文件最后一次修改时间和 If-Modified-Since 的值进行比较，如果相等，返回 304 ，并加载浏览器缓存。

```javascript
const http = require('http')
const url = require('url')
const fs = require('fs')
const path = require('path')

http.createServer((req, res) => {
  const { pathname } = url.parse(req.url)
  console.log(pathname)
  const filePath = path.join(__dirname, pathname)
  // 1.协商缓存
  // 分类：
  //  Last-Modified  & If-Modified-Since 
  //  ETag  & If-None-Match 
  // Last-Modified特点
  //  对比最后修改时间返回内容
  // Last-Modified不足
  //   内容没有变化修改时间变化了，也会重新读取内容，时间不精确，精确到秒，如果一秒内改变多次也监控不到

  // 设置强制缓存策略
  res.setHeader('Cache-Control', 'no-cache')
  // 获取缓存时间
  const ifModifiedSince = req.headers['if-modified-since']

  fs.stat(filePath, (error, statObj) => {
    if(error) return res.statusCode = 404, res.end('Not Found')
    // 设置 Last-Modified  & If-Modified-Since 缓存
    const lastModified = statObj.ctime.toGMTString()
    if(ifModifiedSince === lastModified) {
      res.statusCode = 304
      return res.end()
    }
    res.setHeader('Last-Modified', lastModified)
    if(statObj.isFile()) {
      fs.createReadStream(filePath).pipe(res)
    } else {
      return res.statusCode = 404, res.end('Not Found')
    }
  })
}).listen(3000)
```

+ 第一次请求如下：

<!-- 这是一张图片，ocr 内容为：DevTools-localhost:300/index.html PerfomanceMamoryAoplication CSSOverytew 林 Socurlty Console JavascnptProfler Lighthouse Rodux Sources DisablecacheNothrotuiling  Prosarvolog HIDADATaURLSAII FelchxhRJscsh wsWasmmMarnlfestOther BlockidRoquests Hasblockedcodkes LMngMadiaFontDac 3rd-partyroquosts lnwert 1500m3 2000mE 3000ms Tirring Prevew lnitinlor Cookles Name index.html indax.Js RaqueStURL:http://ocahost:30/idex RoquesIMothod:GET blueprint.css StatusCode:2000k bluoprint-Seloct.css RomoteAdLdress:[::11:3000 7 cropper.css ReferrerPolicy:sttohco faviconico REsponseHeadersMiwsourca Cache-Control:no-cache COnNCTIon+KEEp-alive Date:Ned24NV202199:07:20GT Koep-Alive:timeout-5 Last-MoDIfiD:HDN1073648T Transfer-Encoding:chunked RoquestHeaders AcCept:木/ Acccpt-Encoding:gzio.deftate.br Accept-Language:zh-cn.zhq.9en. Cacho-Control:no-cache Connection:Keep-alive 都 都都都 都 1073230@ HostLocathost:3065 Pragma:no-cache Refererhttp://localhost:308/index.hm 7requosts302kBtransferred -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637744878039-25c333b7-7c68-44c9-bd44-7c344d68a5d7.png)

+ 第二次请求如下：

<!-- 这是一张图片，ocr 内容为：DevTools-localhost:3000/index.html  D PortommanceMamoryApplication CSsOvarvlow Elements Socurlty JavaScnptProflor Congdlo Lighthouse Rodux 林 DisablocacheNothrotting 今堂 Prosarvolog DacwsWasmMarillestother HIDEDALAURLSAIN BlockedRaquasts FelchXHR Js cSsl 3rd-partymquosts lmgMadiaFont HasblocKEdCoDkies lnvert 1200ms 400m5 1100me 500ms 00mE 800m 500ms 300me Tiring Prewiew Response Initintor Codkos Name Headerg indax.html General index.J RequesTURL:httP://ocaLhosT:30/inDexjs RoquestMothodGET bluepint.css StatusCode: 304NOTMoDIFIED 口 bluoprInt-Soloct.css REMoteADDress:[::11:3000 V ReferrerPolicy:stict-orqin-kh-orqin LersYawsourca REsponseHeaders Cache-Control:no-cache COnncTIon+KEEp-alive Date:H24NV282109:08:23GT Keep-Alive:timneout-5 RequestHeaders VowSourCe ACCEPt*/* Accept-Encodlng:gzp.deflatebr Accept-Language:zh-Cn,zh;q-.9q COnnecLlon:Ksep-alIwe 都西 址 心 10238220oo HOStLOCAlHOsT:3000 IFMODIFiDSice:4N02107:36:48GT Ratorerhttp://LocaLhost:300/inde.hm B"NotABand";v9.m" sec-ch-ua:" Sec-ch-ua-mobile:70 Groquosts301kBtransferred seC-ch-ua-plattform:"ma.cos" -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637744938279-062f091d-b942-4221-a44b-9880c8d46f98.png)

#### 为何出现Etag
+ <font style="color:rgb(0, 0, 0);">你可能会觉得使用Last-Modified已经足以让浏览器知道本地的缓存副本是否足够新，为什么还需要Etag（实体标识）呢？HTTP1.1中Etag的出现主要是为了解决几个Last-Modified比较难解决的问题：</font>
    - <font style="color:rgb(0, 0, 0);">Last-Modified标注的最后修改只能精确到秒级，如果某些文件在1秒钟以内，被修改多次的话，它将不能准确标注文件的修改时间</font>
    - <font style="color:rgb(0, 0, 0);">如果某些文件会被定期生成，当有时内容并没有任何变化，但Last-Modified却改变了，导致文件没法使用缓存</font>
    - <font style="color:rgb(0, 0, 0);">有可能存在服务器没有准确获取文件修改时间，或者与代理服务器时间不一致等情形</font>
    - <font style="color:rgb(0, 0, 0);">Etag是服务器自动生成或者由开发者生成的对应资源在服务器端的唯一标识符，能够更加准确的控制缓存。</font><font style="color:rgb(255, 0, 0);">Last-Modified与ETag是可以一起使用的，服务器会优先验证ETag，一致的情况下，才会继续比对Last-Modified，最后才决定是否返回304。</font>

#### 总结
| **header属性** | **可选值** | **优先级** | **优缺点** |
| --- | --- | --- | --- |
| <font style="color:rgb(48, 48, 48);">ETag/</font><br/><font style="color:rgb(48, 48, 48);">If-None-Match</font> | 校验值 | 高 | 1、默认使用hash算法，在分布环境下可能会出现不同服务器生成的ETag值不一样<br/>2、精确的判断资源有无被修改，可识别一秒内的修改次数<br/>3、计算ETag需要性能消耗 |
| <font style="color:rgb(48, 48, 48);">Last-Modified/</font><br/><font style="color:rgb(48, 48, 48);">If-Modified-Since</font> | GMT时间 | 低 | 1、只要资源修改，无论内容有无变化，都会将资源返回客户端<br/>2、以时刻为标识，无法获取一秒内的修改变化<br/>3、某些服务器不能准确获取最后修改时间 |


## 常见的与缓存有关的消息报头
<!-- 这是一张图片，ocr 内容为：规则 消息报头 类型 作用 值/示例 告诉浏览器在过期时间前可以使用副 Sun,160ct2016响应 新鲜度 Expires 本(有可能存在时间不一致问题 05:43:02GMT Pragma 告诉划览器忽略资源的缓存副本 响应 no-cache (HTTP1.1可用Cache-Control巷 告诉浏览器忽略资源的缓存副本,强 响应 Cache-Contol no-cache 制每次请求直接发送给源服务器 强制缓存在任何情况下都不要保留任 响应 no-store 何副本 max-age-秒] 响应 指明缓存副本的有效时长,从请求时 间开始到过期时间之间的秒数 任何途径的缓存者(本地缓存,代理 响应 public 服务器),可以无条件的缓存该资源 只针对单个用户或实体(不同用户, 响应 private 窗口)缓存资源 Sun,160ct2016 Last-Modified 响应 告诉浏览器当前资源的最后修改时间 05:43:02GMT 请求 If-Modified- Sun,160ct2016 如果浏览器第一次请求时响应中Last- 05:43:02GMT Modified非空,第二次请求同一资源 Since 时,会把它作为该项的值发给服务器 ETag 50b11d4f775c61响应 告知浏览器当前资源在服务器的唯一 校验值 :df3 标识符(生成规则有服务器决定) If-None-Match 50b1c1d4f775c61请求 如果浏览器第一次请求时响应中Etag 非空,第二次请求同一资源时,会把 df3 它作为该项的值发给服务器 辅助 vary 辅助从多个缓存副本中筛选合适的版 Accept-encoding响应 本(不同压缩算法产生的副本) -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637743567535-0a87f35d-bf90-41b5-b983-866c41d49899.png)

## HTTP缓存注意点
+ 强缓存情况下，只要缓存还没过期，就会直接从缓存中取数据，就算服务器端有数据变化，也不会从服务器端获取了，这样就无法获取到修改后的数据。决解的办法有：在修改后的资源加上随机数,确保不会从缓存中取。
    - 例如：
        * http://www.kimshare.club/kim/common.css?v=22324432
        * http://www.kimshare.club/kim/common.2312331.css
+ 尽量减少304的请求，因为我们知道，协商缓存每次都会与后台服务器进行交互，所以性能上不是很好。从性能上来看尽量多使用强缓存。
+ 在Firefox浏览器下，使用Cache-Control: no-cache 是不生效的，其识别的是no-store。这样能达到其他浏览器使用Cache-Control: no-cache的效果。所以为了兼容Firefox浏览器，经常会写成Cache-Control: no-cache，no-store。
+ 与缓存相关的几个header属性有：<font style="color:#E8323C;">Vary、Date/Age</font>。
    - **Vary**
        * vary本身是“变化”的意思，而在http报文中更趋于是“vary from”（与。。。不同）的含义，它表示服务端会以什么基准字段来区分、筛选缓存版本。
        * 在服务端有着这么一个地址，如果是IE用户则返回针对IE开发的内容，否则返回另一个主流浏览器版本的内容。
        * 格式：Vary: User-Agent
        * 知会代理服务器需要以 User-Agent 这个请求首部字段来区别缓存版本，防止传递给客户端的缓存不正确。
    - **Date/Age**
        * 响应报文中的 Date 和 Age 字段：区分其收到的资源是否命中了代理服务器的缓存。
        * Date 理所当然是原服务器发送该资源响应报文的时间（GMT格式），如果你发现 Date 的时间与“当前时间”差别较大，或者连续F5刷新发现 Date 的值都没变化，则说明你当前请求是命中了代理服务器的缓存。
        * Age 也是响应报文中的首部字段，它表示该文件在代理服务器中存在的时间（秒），如文件被修改或替换，Age会重新由0开始累计。

## HTTP 缓存的整体流程
<!-- 这是一张图片，ocr 内容为：开始 将缓存返回浏览器 浏览器 缓存协商 浏览器缓存 将缓存返回浏览器 304 读取浏览器缓存 发起GET请求 请求响应完成 状态是否304 200 发起请求,请求头带 发起请求,请求头带 是否有缓存 上lf-Modified-Since 上lf-None-Match 强缓存 上一次响应头中 上一次响应头中是 否 否 是否新鲜 否有Last-Modified 是否有ETag -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637745490701-c39c0941-1b60-4b5f-a7b3-922ea5c92c2a.png)

# 浏览器本地存储
+ `cookie`: cookie过期时间内一直有效，存储大小`4k`左右、同时限制字段个数，不适合大量的数据存储，每次请求会携带`cookie`,主要可以利用做身份检查。
    - 设置`cookie`有效期
    - 根据不同子域划分`cookie`较少传输
    - 静态资源域名和`cookie`域名采用不同域名，避免静态资源访问时携带`cookie`
+ `localStorage`: chrome下最大存储`5M`, 除非手动清除，否则一直存在。利用`localStorage`存储静态资源

```javascript
function cacheFile(url) {
    let fileContent = localStorage.getItem(url);
    if (fileContent) {
        eval(fileContent)
    } else {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onload = function () {
            let reponseText = xhr.responseText
            eval(reponseText);
            localStorage.setItem(url, reponseText)
        }
        xhr.send()
    }
}
cacheFile('/index.js');
```

+ `sessionStorage`: 会话级别存储，可用于页面间的传值
+ `indexDB`:浏览器的本地数据库 （基本无上限）

```javascript
let request = window.indexedDB.open('myDatabase');
request.onsuccess = function(event){
    let db = event.target.result;
    let ts = db.transaction(['student'],'readwrite')
    ts.objectStore('student').add({name:'zf'})
    let r = ts.objectStore('student').get(5);
    r.onsuccess = function(e){
        console.log(e.target.result)
    }
}
request.onupgradeneeded  = function (event) {
    let db = event.target.result;
    if (!db.objectStoreNames.contains('student')) {
        let store = db.createObjectStore('student', { autoIncrement: true });
    }
}
```

# 定义最优缓存策略
+ 使用一致的网址：如果您在不同的网址上提供相同的内容，将会多次获取和存储该内容。注意：URL 区分大小写！
+ 确定中继缓存可以缓存哪些资源：对所有用户的响应完全相同的资源很适合由 CDN 或其他中继缓存进行缓存；
+ 确定每个资源的最优缓存周期：不同的资源可能有不同的更新要求。审查并确定每个资源适合的 max-age；
+ 确定网站的最佳缓存层级：对 HTML 文档组合使用包含内容特征码的资源网址以及短时间或 no-cache 的生命周期，可以控制客户端获取更新的速度；
+ 更新最小化：有些资源的更新比其他资源频繁。如果资源的特定部分（例如 JS 函数或一组 CSS 样式）会经常更新，应考虑将其代码作为单独的文件提供。这样，每次获取更新时，剩余内容（例如不会频繁更新的库代码）可以从缓存中获取，确保下载的内容量最少；
+ 确保服务器配置或移除 ETag：因为 Etag 跟服务器配置有关，每台服务器的 Etag 都是不同的；
+ 善用 HTML5 的缓存机制：合理设计启用 LocalStorage、SessionStorage、IndexDB、SW 等存储，会给页面性能带来明显提升；
+ 结合 Native 的强大存储能力：善于利用客户端能力，定制合适的缓存机制，打造极致体验。

# 参考
[HTTP缓存和浏览器的本地存储](https://segmentfault.com/a/1190000020086923)

[Web本地存储总结](https://juejin.cn/post/6844904193996619790)

[很全很全的前端本地存储讲解](https://segmentfault.com/a/1190000012578794)

