# 为什么要关注Web性能
+ Web性能可以直接影响业务指标，例如转化率和用户满意度

> Web 性能是客观的衡量标准，是用户对加载时间和运行时的直观体验。Web 性能指页面加载到可交互和可响应所消耗的时间，以及页面在交互时的流畅度——滚动是否顺滑？按钮能否点击？弹窗能否快速打开，动画是否平滑？Web 性能既包括客观的度量如加载时间，每秒帧数和到页面可交互的时间；也包括用户的对页面内容加载时间的主观感觉。
>

# Lighthouse
## 简介
+ [Lighthouse](https://www.npmjs.com/package/lighthouse#using-lighthouse-in-chrome-devtools) 是一个开源的自动化工具，用于改进网络应用的质量
+ Lighthouse 报告分析了加载页面生命周期中的各种性能指标
+ [webpagetest](https://www.webpagetest.org/) 是一个免费的网站性能测试工具

## 安装Lighthouse
```shell
npm i lighthouse -g
```

## 使用Lighthouse
```shell
lighthouse https://www.baidu.com --locale zh --quiet --chrome-flags="--headless" --only-categories=performance
```

# Lighthouse性能指标
+ [需要测量的重要指标](https://web.dev/i18n/zh/user-centric-performance-metrics/)

<!-- 这是一张图片，ocr 内容为：GET /MAIN.JS GET /INDEX.HTML 网络进程 GET/BANNER.PNG 绘制 合成 解析HTML 解析HTML 布局 编译执行JS 渲染进程 DCL LCP FP FCP -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1744796066219-9567f87f-7fb1-4653-bcc9-df1598d8bf3c.png)

## FP和FCP
### 简介
+ **<font style="color:#E8323C;">First Paint</font>** 首次渲染，表示了浏览器从开始请求网站到屏幕渲染第一个像素点的时间
+ **<font style="color:#E8323C;">First Contentful Paint</font>** 首次内容渲染，表示浏览器渲染出第一个内容的时间，这个内容可以是文本、图片或SVG元素等，不包括iframe和白色背景的canvas元素

### 记录FP和FCP
+ [First_paint](https://www.cnblogs.com/hongrunhui/p/8929001.html)
+ [First_contentful_paint](https://web.dev/first-contentful-paint/?utm_source=lighthouse&utm_medium=node)
+ [document.readyState](https://developer.mozilla.org/zh-CN/docs/Web/API/Document/readyState)
+ [PerformanceObserver](https://developer.mozilla.org/zh-CN/docs/Web/API/PerformanceObserver)
+ [PerformanceObserver.observe](https://developer.mozilla.org/zh-CN/docs/Web/API/PerformanceObserver/observe)
+ [PerformanceEntry](https://developer.mozilla.org/zh-CN/docs/Web/API/PerformanceEntry)
+ [PerformanceEntry.entryType](https://developer.mozilla.org/zh-CN/docs/Web/API/PerformanceEntry/entryType)
+ [PerformanceObserverEntryList](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserverEntryList)

#### 安装依赖
```shell
npm i -S express morgan compression
```

#### website
```javascript
const express = require('express');
const logger = require('morgan');
const delayConfig = require('./delayConfig');

const app = express();
app.use(logger('dev'));
app.use((req, res, next) => {
  const url = req.url;
  const delay = delayConfig[url];
  if(delay) {
    setTimeout(next, delay);
  } else {
    next();
  }
});
app.use(express.static('public'));
app.listen(9090, () => console.log(`服务器已经在9090端口上启动了...`));
```

```javascript
const delayConfig = {
  '/index.html': 1000
}
module.exports = delayConfig;
```

```javascript
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lighthouse</title>
  <link rel="dns-prefetch" href="//static.360buyimg.com" />
</head>
<body>
  <div>Lighthouse</div>
  <script src="./perf.js"></script>
</body>
</html>
```

```javascript
(function (ready) {
  if(document.readyState === 'complete' || document.readyState === 'interactive') {
    ready();
  } else {
    document.addEventListener('readystatechange', () => {
      if(document.readyState === 'complete') {
        ready();
      }
    });
  }
})(function perf() {
  const data = {
    FP: 0,    // 首次绘制
    FCP: 0,   // 首次内容绘制
  };
  // 如果观察者观察到了指定类型的性能条目，就执行回调
  new PerformanceObserver((entryList, observer) => {
    const entries = entryList.getEntries();
    entries.forEach(entry => {
      if(entry.name === 'first-paint') {
        // 首次绘制的开始时间
        data.FP = entry.startTime;
        console.log('记录首次绘制(FP)', data.FP);
      }
      if (entry.name === 'first-contentful-paint') {
        data.FCP = entry.startTime;
        console.log('记录首次内容绘制(FCP)', data.FCP);
      }
    });

    observer.disconnect();
  }).observe({ type: 'paint', buffered: true })
});
```

### 改进FP和FCP
+ 加快服务器响应速度
    - 升级服务器配置
    - 合理设置缓存
    - 优化数据库索引
+ 加大服务器带宽
+ 服务器开启 gzip 压缩
+ 开启服务器缓存 (redis)
+ 避免重定向操作
+ 使用 dns-prefetch 进行DNS 预解析
+ 采用域名分片技术突破同一域6个TCP连接限制或者采用HTTP2
+ 使用CDN减少网络跳转
+ 压缩JS、CSS和图片等资源
    - [TerserWebpackPlugin](https://webpack.docschina.org/plugins/terser-webpack-plugin/)
    - [purgecss-webpack-plugin](https://www.npmjs.com/package/purgecss-webpack-plugin)
+ 减少HTTP请求，合并JS和CSS，合理内嵌JS和CSS

```diff
const express = require('express');
const logger = require('morgan');
+const compression = require('compression');
const delayConfig = require('./utils/delayConfig');

const app = express();

app.use(logger('dev'));

app.use((req, _res, next) => {
  const url = req.url;
  const delay = delayConfig[url];
  if(delay) {
    setTimeout(next, delay)
  } else {
    next();
  }
})

app.use(compression());

+function setHeaders(res, path) {
+  res.setHeader('cache-control', 'no-cache')
+}

app.use(express.static('public', {
+  setHeaders
}))


app.listen(9090, () => {
  console.log(`服务器已经在9090端口上启动了...`);
});
```

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lighthouse</title>
  <link rel="dns-prefetch" href="//static.360buyimg.com" />
</head>
<body>
  <div id="root">Lighthouse</div>
  <img id="banner" style="width:500px;height:300px;" src="/1.png" /><br />
  <img src="https://cdn.wekic.com/_blog/1644215774879-image.png" />
  <img src="/lighthouse.png" />
  <script src="./perf.js"></script>
</body>
</html>
```

## SI
### 简介
+ [Speed Index](https://web.dev/speed-index/?utm_source=lighthouse&utm_medium=node) 速度指数，表明了网页内容的可见填充速度
+ 速度指数衡量页面加载期间内容的视觉显示速度

### 改进SI
#### 最小化主线程工作
+ [最小化主线程工作](https://web.dev/mainthread-work-breakdown/)
+ 脚本
    - [优化第三方的JS脚本](https://web.dev/fast/#optimize-your-third-party-resources)
    - [对输入进行防抖处理](https://developers.google.com/web/fundamentals/performance/rendering/debounce-your-input-handlers)
    - [使用web workers](https://web.dev/off-main-thread/)
+ 样式和布局
    - [缩小样式计算的范围并降低其复杂性](https://developers.google.com/web/fundamentals/performance/rendering/reduce-the-scope-and-complexity-of-style-calculations)
    - [避免复杂的布局和布局抖动](https://developers.google.com/web/fundamentals/performance/rendering/avoid-large-complex-layouts-and-layout-thrashing)
+ 渲染
    - [坚持仅合成器的属性和管理层计数](https://developers.google.com/web/fundamentals/performance/rendering/stick-to-compositor-only-properties-and-manage-layer-count)
    - [简化绘制的复杂度、减小绘制区域](https://developers.google.com/web/fundamentals/performance/rendering/simplify-paint-complexity-and-reduce-paint-areas)
+ 解析HTML和CSS
    - [提取关键CSS](https://web.dev/extract-critical-css/)
    - [压缩CSS](https://web.dev/minify-css/)
    - [延迟加载非关键的CSS](https://web.dev/defer-non-critical-css/)
+ 脚本解析和编译
    - [通过代码拆分减少JS的负载](https://web.dev/reduce-javascript-payloads-with-code-splitting/)
    - [删除未使用的JS](https://web.dev/remove-unused-code/)
+ 垃圾收集
    - [监控网页的总内存使用情况](https://web.dev/monitor-total-page-memory-usage/)

#### 减少 JavaScript 执行时间
+ [减少 JavaScript 执行时间](https://web.dev/bootup-time/)
+ [通过代码分割仅发送用户需要的代码](https://web.dev/reduce-javascript-payloads-with-code-splitting/)
+ [压缩代码](https://web.dev/reduce-network-payloads-using-text-compression/)
+ [删除未使用代码](https://web.dev/remove-unused-code/)
+ [使用PRPL模式缓存你的代码来减少网络开销](https://web.dev/apply-instant-loading-with-prpl/)

#### 确保文本在 webfont 加载期间保持可见
+ [确保文本在webfont加载期间保持可见](https://web.dev/font-display/)
+ 字体通常是需要一段时间才能加载的大文件。一些浏览器在字体加载之前隐藏文本，导致不可见文本 (FOIT) 闪烁。
+ 通过包含font-display: swap在您的@font-face风格中，您可以在大多数现代浏览器中避免 FOIT

```javascript
@font-face {
  font-family: 'Pacifico';
  font-style: normal;
  font-weight: 400;
  src: local('Pacifico Regular'), local('Pacifico-Regular'), url(https://fonts.gstatic.com/s/pacifico/v12/FwZY7-Qmy14u9lezJ-6H6MmBp0u-.woff2) format('woff2');
  font-display: swap;
}
```

#### web workers
```html
<!DOCTYPE html>
<html lang="en">

	<head>
		<meta charset="UTF-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>webworker</title>
	</head>

	<body>
		<script>
			function start() {
				//sum();
				const worker = new Worker('/worker.js');
				worker.postMessage(100000000);
				worker.addEventListener('message', function (event) {
					console.log('sum:', event.data);
				});
			}
			function sum() {
				let total = 0;
				for (let i = 0; i < 100000000; i++) {
					total += i;
				}
				console.log('sum:', total);
			}

			start();
		</script>
	</body>

</html>
```

```javascript
self.addEventListener('message', function (event) {
	let total = 0;
	for (let i = 0; i < event.data; i++) {
		total += i;
	}
	self.postMessage(total);
});

```

#### 避免强制同步布局和布局抖动
<!-- 这是一张图片，ocr 内容为：STYLE PAINT JAVASCRIPT COMPOSITE LAYOUT -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1744869731397-e97cb23e-0860-4ce5-b3ad-1664eabe943e.png)

<!-- 这是一张图片，ocr 内容为：FRAME生命周期 IDL时期 阻塞输入事件 每帧事件 非阻塞输入事件 组合样式更新 重新计算样式 REQUESTANIMATION -IDLE回调 -IDLE回调 窗口大小改变 FRAME回调执行 定时器 布局更新 触摸事件 点击事件 渲染失效 滚动 -键盘事件 交叉观察者回调执行 滚动事件 媒体查询更改 调整观察者大小回调 -记录 -动画事件 渲染 布局 JS IDLE时期 IDLE时期 INPUT EVENTS RAF 帧开始 INPUT EVENTS -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1744869741911-abdaa3c1-0cf2-4083-909f-45a774dc8e0f.png)

+ 强制同步布局
    - 改变一个元素的特性或者修改其内容有时不仅影响该元素，有时候会导致级联的变化，可能影响元素的子节点、兄弟节点、父节点的改变，所以每次进行修改时，浏览器都必须重新计算这些改变的影响
    - 如果我们编写的代码不能让浏览器有足够的时间和空间来进行优化，强制浏览器执行大量重新计算，就会造成布局抖动

| 接口对象 | 属性名 |
| --- | --- |
| Element | clientHeight、clientLeft、clientTop、clientWidth、focus、getBoundingClientRect、getClientRects、innerText、offsetHeight、offsetLeft、offsetParent、offsetTop、offsetWidth、outerText、scrollByLines、scrollByPages、scrollLeft、scrollHeight、scrollIntoView、scrollIntoViewNeeded、scrollTop、scrollWidth |
| MouseEvent | layerX、layerY、offsetX、offsetY |
| Window | getComputedStyle、scrollBy、scrollTo、scroll、scrollY |
| Frame、Document、Image | height、width |


```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>layout</title>
</head>
<body>
  <div id="root"></div>
  <script>
    function reflow() {
      console.log('reflow');
      const container = document.getElementById('root');
      const div1 = document.createElement('div');
      div1.innerHTML = 'hello';
      container.appendChild(div1);
      console.log(container.offsetHeight);
      const div2 = document.createElement('div');
      div2.innerHTML = 'world';
      container.appendChild(div2);
      // requestAnimationFrame(reflow); // 测试时打开此行代码，效果如下图
    }
    requestAnimationFrame(reflow);
  </script>
</body>
</html>
```

<!-- 这是一张图片，ocr 内容为：DEVTOOLS-LOCALHOST:9090/LAYOUT.HTML COOKIE-EDITOR REDUX  APOLLO CSS OVERVIEW & APPLICATION PERFORMANCE RECORDER ELEMENTS LAYERS LIGHTHOUSE MEMORY PRIVACY AND SECURITY CONSOLE SOURCES 园 SCREENSHOTS MEMORY DIM THIRD PARTIES LOCALHOST #8 门 5.92 1,920MS 3.420MS 2,920MS 5.420 MS 3.920 MS 4.420 MS 4.920 MS 920 MA 1400MLI 2.420 MS 420 MS INSIGHTS >> CPU HTTP://LOCALHOST:9090/LAY NET HTTP://LOCALHOST:9090/LAY 1,350 MS 1,310 MS 1.340 MS 0 MS 1,320 MS 1,380 MS 1,400 MS 1,390 MS 1,330MS 1,370MS 1,410 MS INP CLS LCP NETWORK 0.50S- 0 16.7MS 15.7 MS 15.7MS 16.8 MS 17.4 MS 17.5 MS 16.9MS MAIN-HTTP://LOCALHOST:9090/LAYOUT.HTML LCP BY PHASE THIRD PARTIES FORCED REFLOW PASSED INSIGHTS(9) CALL TREE EVENTLOG SUMMARY BOTTOM-UP PAINTING RENDERING AA(*) 山 MESSAGING FILTER SCRIPTING LOADING ALL TOTAL TIME START TIME SELF TIME ACTIVITY 0.6 MS 0.0 MS ANIMATION FRAME FIRED LAYOUT.HTML:12:20 0.0 MS 0.0 MS 1,424.8 MS REFLOW 0.0 MS 0.0 MS RECALCULATE STYLE 1,424.8 MS 0.1 MS 0.1 MS 1,424.8 MS LAYOUT 1,424.9MS PRE-PAINT 0.0 MS 0.0MS 1,425.0 MS SELECT ITEM FOR DETAILS. 0.1 MS PAINT 0.1MS 1,425.1 MS 0.1MS 0.1 M5 1,425.2MS 0.2 MS COMMIT 0.2MS FEEDBACK ISSUES PERFORMANCE MONITOR NETWORK REQUEST BLOCKING NETWORK CONDITIONS RENDERING CONSOLE AL ASSISTANCE A WHAT'S NEW Y FILTER TOP DEFAULT LEVELS 2 HIDDEN NO ISSUOS -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1744878441286-42d8eb22-668e-4d71-b6a7-00127c4cfa86.png)

+ 每次修改DOM，浏览器必须在读取任何布局新之前先重新计算布局，对性能的损耗十分巨大
+ 避免布局抖动的一种方法就是使用不会导致浏览器重排的方式编写代码，比如批量的读取和写入等

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>layout</title>
  <style>
    .box {
      width: 100px;
      border: 1px solid greenyellow;
    }
  </style>
</head>
<body>
  <div class="box">box1</div>
  <div class="box">box2</div>
  <div class="box">box3</div>
  <div class="box">box4</div>
  <div class="box">box5</div>
  <script src="https://cdn.bootcdn.net/ajax/libs/fastdom/1.0.10/fastdom.js"></script>
  <script>
    const boxes = document.querySelectorAll('.box');
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      fastdom.measure(() => { // 批量读取
        const offsetWidth = box.offsetWidth;
        fastdom.mutate(() => { // 批量修改
          box.style.width = offsetWidth + 15 + 'px';
        });
      });
    }
  </script>
</body>
</html>
```

## LCP
### 简介
+ [Largest Contentful Paint](https://web.dev/lighthouse-largest-contentful-paint/?utm_source=lighthouse&utm_medium=node)(最大内容绘制)，标记了渲染出最大文本或图片的时间
+ 最大内容绘制(LCP)是测量感知加载速度的一个以用户为中心的重要指标

<!-- 这是一张图片，ocr 内容为：LCP NEEDS POOR GOOD IMPROVEMENT 2.5 SEC 4.0 SEC LARGEST CONTENTFULPAINT -->
![](https://cdn.nlark.com/yuque/0/2022/png/738210/1641872052818-36619830-1667-43ec-9451-a006f636afa8.png)

### 记录LCP
```javascript
(function(ready) {
  // 监听页面加载完成
  if(document.readyState === 'complete' || document.readyState === 'interactive') {
    ready();
  } else {
    document.addEventListener('readystatechange', () => {
      if(document.readyState === 'complete') {
        ready();
      }
    });
  }
})(function ready() {
  const data = {
    FP: 0,  // 首次绘制
    FCP: 0, // 首次内容绘制
    LCP: 0, // 首次布局绘制
  }

  // FP & FCP: 如果观察者观察到了指定类型的性能条目，就执行回调
  new PerformanceObserver((entryList, observer) => {
    const entries = entryList.getEntries();
    entries.forEach(entry => {
      if(entry.name === 'first-paint') {
        // 首次绘制的开始时间
        data.FP = entry.startTime;
        console.log('记录首次绘制(FP)', data.FP);
      }
      if (entry.name === 'first-contentful-paint') {
        data.FCP = entry.startTime;
        console.log('记录首次内容绘制(FCP)', data.FCP);
      }
    });

    observer.disconnect();
  }).observe({ type: 'paint', buffered: true })
  // LCP
  new PerformanceObserver((entryList, observer) => {
    const entries = entryList.getEntries();
    entries.forEach(entry => {
      if(entry.startTime > data.LCP) {
        data.LCP = entry.startTime;
        console.log('记录最大内容绘制(LCP)', data.LCP);
      }
    });
    observer.disconnect();
  }).observe({ type: 'largest-contentful-paint', buffered: true })
});
```

### 改进LCP
+ [改进LCP](https://web.dev/lcp/#how-to-improve-largest-contentful-paint-on-your-site)
+ [使用 PRPL 模式做到即时加载](https://web.dev/apply-instant-loading-with-prpl/)
    - 推送(或预加载)最重要的资源 Preload是一个声明性的获取请求，它告诉浏览器尽快请求资源
    - 尽快渲染初始路线 内联首屏JS和CSS推荐其余部分
    - 预缓存剩余资源 Service Worker
    - 延迟加载其他路由和非关键资源
+ [优化关键渲染路径](https://developers.google.com/web/fundamentals/performance/critical-rendering-path/)
+ [优化您的 CSS](https://web.dev/fast/#optimize-your-css)
+ [优化您的图像](https://web.dev/fast/#optimize-your-images)
+ [优化网页字体](https://web.dev/fast/#optimize-web-fonts)
+ [优化您的JavaScript](https://web.dev/fast/#optimize-your-javascript)

```html
<link rel="preload" as="style" href=""css/style.css>
```

## TTI
### 简介
+ [Time to Interactive](https://web.dev/interactive/?utm_source=lighthouse&utm_medium=node)([可交互时间](https://web.dev/tti/))指标测量页面从开始加载到主要子资源完成渲染，并能够快速、可靠的响应用户输入所需的时间
+ [webpagetest](https://www.webpagetest.org/) 
+ 虽然TTI可以在实际情况下进行测量，但我们不建议这样做，因为用户交互会影响网页的TTI，从而导致报告中出现大量的差异，如需了解页面在实际情况中的交互性，应该测量First Input Delay 首次输入延迟(FID)

### 改进TTI
+ [缩小JavaScript](https://web.dev/unminified-javascript/)
+ [预连接到所需的来源](https://web.dev/uses-rel-preconnect/)
+ [预加载关键请求](https://web.dev/uses-rel-preload/)
+ [减少第三方代码的影响](https://web.dev/third-party-summary/)
+ [最小化关键请求深度](https://web.dev/critical-request-chains/)
+ [减少 JavaScript 执行时间](https://web.dev/bootup-time/)
+ [最小化主线程工作](https://web.dev/mainthread-work-breakdown/)
+ [保持较低的请求数和较小的传输大小](https://web.dev/resource-summary/)

## TBT
### 简介
+ [Total Blocking Time](https://web.dev/lighthouse-total-blocking-time/?utm_source=lighthouse&utm_medium=node)([总阻塞时间](https://web.dev/tbt/))指标测量First Contentful Paint 首次内容绘制(FCP)与Time to Interactive 可交互时间(TTI)之间的总时间，这期间主线程被阻塞的时间过长，无法作出输入响应
+ 虽然TBT可以在实际情况下进行测量，但我们不建议这样做，因为用户交互会影响网页的TBT，从而导致报告中出现大量的差异，如需了解页面在实际情况中的交互性，应该测量First Input Delay 首次输入延迟(FID)

### 改进TBT
+ [减少第三方代码的影响](https://web.dev/third-party-summary/)
+ [减少 JavaScript 执行时间](https://web.dev/bootup-time/)
+ [最小化主线程工作](https://web.dev/mainthread-work-breakdown/)
+ [保持较低的请求数和较小的传输大小](https://web.dev/resource-summary/)

## FID
### 简介
+ [First Input Delay (首次输入延迟)](https://web.dev/fid/)是测量加载响应的一个以用户为中心的重要指标
+ 因为该项指标将用户尝试与无响应页面进行交互的体验进行了量化，低FID有助于让用户确信页面是有效的
+ 首次输入延迟(FID)指标有助于衡量用户对网站交互性和响应度的第一印象
+ FID测量从用户第一次与页面交互(例如当单击链接、点击按钮或使用javascript驱动的自定义控件)直到浏览器对交互做出响应，并实际能够开始处理事件处理程序所经过的时间

### 记录FID
```javascript
(function(ready) {
  // 监听页面加载完成
  if(document.readyState === 'complete' || document.readyState === 'interactive') {
    ready();
  } else {
    document.addEventListener('readystatechange', () => {
      if(document.readyState === 'complete') {
        ready();
      }
    });
  }
})(function ready() {
  const data = {
    FP: 0,  // 首次绘制
    FCP: 0, // 首次内容绘制
    LCP: 0, // 首次布局绘制
    FID: 0, // 首次输入延迟
  }

  // FP & FCP: 如果观察者观察到了指定类型的性能条目，就执行回调
  new PerformanceObserver((entryList, observer) => {
    const entries = entryList.getEntries();
    entries.forEach(entry => {
      if(entry.name === 'first-paint') {
        // 首次绘制的开始时间
        data.FP = entry.startTime;
        console.log('记录首次绘制(FP)', data.FP);
      }
      if (entry.name === 'first-contentful-paint') {
        data.FCP = entry.startTime;
        console.log('记录首次内容绘制(FCP)', data.FCP);
      }
    });

    observer.disconnect();
  }).observe({ type: 'paint', buffered: true })
  // LCP
  new PerformanceObserver((entryList, observer) => {
    const entries = entryList.getEntries();
    entries.forEach(entry => {
      if(entry.startTime > data.LCP) {
        data.LCP = entry.startTime;
        console.log('记录最大内容绘制(LCP)', data.LCP);
      }
    });
    observer.disconnect();
  }).observe({ type: 'largest-contentful-paint', buffered: true })
  // FID
  new PerformanceObserver((entryList, observer) => {
    const entries = entryList.getEntries();
    entries.forEach(entry => {
      // 首次用户交互，开始处理的时间 减去 开始交互的时间，就是首次交互延迟的时间
      data.FID = entry.processingStart - entry.startTime;
      console.log('记录首次交互延迟(FID)', data.FID);
    });
    observer.disconnect();
  }).observe({ type: 'first-input', buffered: true })
});
```

### 改进FID
+ [减少第三方代码的影响](https://web.dev/third-party-summary/)
+ [减少 JavaScript 执行时间](https://web.dev/bootup-time/)
+ [最小化主线程工作](https://web.dev/mainthread-work-breakdown/)
+ [保持较低的请求数和较小的传输大小](https://web.dev/resource-summary/)

## CLS
### 简介
+ [Cumulative Layout Shift(累积布局偏移)](https://web.dev/cls/)是测量视觉稳定的一个以用户为中心的重要指标
+ CLS测量整个页面生命周期内发生的所有意外布局偏移中最大一连串的布局偏移分数

### 记录CLS
```html

```

```javascript
(function (ready) {
  if(document.readyState === 'complete' || document.readyState === 'interactive') {
    ready();
  } else {
    document.addEventListener('readystatechange', () => {
      if(document.readyState === 'complete') {
        ready();
      }
    });
  }
})(function perf() {
  const data = {
    FP:  0,   // 首次绘制
    FCP: 0,   // 首次内容绘制
    LCP: 0,   // 最大内容绘制
    FID: 0,   // 首次交互延迟
    CLS: 0,   // 累积布局偏移
  };
  // 如果观察者观察到了指定类型的性能条目，就执行回调
  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    entries.forEach(entry => {
      if(entry.name === 'first-paint') {
        // 首次绘制的开始时间
        data.FP = entry.startTime;
        console.log('记录首次绘制(FP)', data.FP);
      } else if (entry.name === 'first-contentful-paint') {
        data.FCP = entry.startTime;
        console.log('记录首次内容绘制(FCP)', data.FCP);
      }
    });
  }).observe({ type: 'paint', buffered: true });
  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    entries.forEach(entry => {
      if(entry.startTime > data.LCP) {
        data.LCP = entry.startTime;
        console.log('记录最大内容绘制(LCP)', data.LCP);
      }
    });
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    entries.forEach(entry => {
      // 首次用户交互，开始处理的时间 减去 开始交互的时间，就是首次交互延迟的时间
      data.FID = entry.processingStart - entry.startTime;
      console.log('记录首次交互延迟(FID)', data.FID);
    });
  }).observe({ type: 'first-input', buffered: true });
  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    entries.forEach(entry => {
      data.CLS += entry.value;
      console.log('累积布局偏移(CLS)', data.CLS);
    });
  }).observe({ type: 'layout-shift', buffered: true });
});
```

### 改进CLS
+ 始终在图像和视频元素上包含尺寸属性
+ 首选转换动画，而不是触发布局偏移的属性动画
+ 除非是对用户交互做出响应，否则切勿在现有内容的上方插入内容

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lighthouse</title>
  <link rel="dns-prefetch" href="//static.360buyimg.com" />
  <style>
    @keyframes grow {
      from {
        /* height: 0px; */
        transform: scaleY(0);
      }
      to {
        /* height: 400px; */
        transform: scaleY(1);
      }
    }
    img{
      width: 100vw;
      height: 200px;
    }
    #lighthouse {
      animation: grow 2s infinite;
    }
  </style>
</head>
<body>
  <div id="root">Lighthouse</div>
  <img id="banner" style="width:500px;height:300px;" src="/1.png" /><br />
  <img src="https://cdn.wekic.com/_blog/1644215774879-image.png" />
  <img id="lighthouse" src="/lighthouse.png" />
  <script src="./perf.js"></script>
</body>
</html>
```

# performance面板
## 面板说明
<!-- 这是一张图片，ocr 内容为：网络 性能 控制台 应用 安全 内存 元素 来源 LIGHTHOUSE 网页指标 内存 WWWBAIDU.COM  1 3016毫秒 7016毫沙 6516多秒 4016毫砂 5516毫克 4516毫秒 7516毫砂 16毫克 2016多钠 2516 毫防 1016毫克 6016 克防 1516毫砂 516 克莎 FPS 概览 CPU 3016宝秒 2516 字利 2016 字秒 5516 50 6516 宝秒 4016 宝秒 4516 宝秒 3516 富利 1016 宝秒 7516 字和 6016 J 7016 5千 1516 家和 网络 RNG TE ACTIVITY...HL HL HL RESULT B769C70JS... WWW.BAIDU.CO.. WEB VITALS 性能 帧 时间 主要-HTTPS://WWW.BAIDU.COM/ 任务 任务 任务 任务 解析...ML 定发 事件:BE...LOAD 网用 (-) (匿名 (() 事件日志 调用树 摘要 自下而上 详情 范围:0-8.08秒 正在加载 77毫秒 正在执行脚本 2398学秒 渲染 101  8079亮秒 0毫秒 绘制 总阻塞时间:1711.02受秒(估算面)了脏详情 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1744870139242-5c3c0704-69e5-45b0-a699-fad4d5581ae3.png)

<!-- 这是一张图片，ocr 内容为：中 网络 内存 仕熊 安全 控制台 应用 元素 来源 LIGHTHOUSE 心 ,内存 网页指标 WWBAIDU.COM #2 6591 豪门 10591 受购 11591 豪心 7591 克钠 9591  毫克 页面顺速 FPS CPU资源消耗CPU 网络请求流量网络 9.5MB-20.0 1 排 7091 老砂 591 8091元 4091 公职 7591宅砂 91% 5591 老砂 5091%纱 3591% 网整指标记录层 网络 WWWBAIDU.C. WTAU WGI. 主要指标记录追染主线程的任务执行过程 主要-HTTPS://WWW.BAIDU.COM/ 一些关键的时间节点在何时产生的数据信息 帧指标就是浏览毕生成每帧的记录 -CHROME-EXTENSION//JAJILBJJINJMGCIBALAAKNGMKILBOOBH/WIDGET.HTML 时间指标用来记录 光栅化线程池负责调用GPU 生成位图 PGPU GPU指标记录了GPU进程的任务执行过程 CHROME.CHLDIOTHREAD IO 线程主要用来接收用户输入,网络等事件 合成指标记录了台成线程的任务执行过程 交互指标用来记录用户交互操作 THREADPOOLFOREGROUNDWORKER COMPOSITOR 合成指标记录了合成线程的任务执行过程 JS堆?文档 GPU内存 ?节点 监听器 V8内存使用量 调用树 事件日志 摘要 自下而上 范围:08.45秒 22毫秒 系统 8454 亮秒 8432毫秒空闲 8454 毫秒 总计 总阻塞时间:3229.41 学秒(估算面)了解详情 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1744870936077-d36126ea-408a-4c23-972a-bf4f8305e5e2.png)

<!-- 这是一张图片，ocr 内容为：刷新页面并开 录制运行时 分钟时屏出租M/?SCENEVAL2&JXSID-15922065242790431631631 保存/上传/选择分析记录 清除记录 始新能分析 性能记录 SECURITY 杞聚闪得信息 WIEMORY NETWCRKPERFORMANCE 8 LIGHTHOUSE ELEMENTS SOURCES CPU占用表 企业M.JD.JD.JD.JD.JD.JD.JD.JD.JD.JD.JD.JD.JD.JD.JDCOM#7 记录中强制进行垃圾回收 MEMORY SEREENSHOTS DISABLEJAVASCRIPT SAMPLES禁止IS样例,忽略IS栈调用信息,MAIN中会更简短 ONLINE NETWORL 控制录制中网络加载速度,可自定义 控制录制过程中CPU工作频率,因设备而已,不能准确模拟CPU运算速度 )ENABLE ADVANCED PAINTINSTRUMENTATION(SLOW) 开启加速渲染工具,会带来大显性能开销 NO THROTTLING PU: 2500MS 4500MS 3500MS 5000MS 2000MS 500MS 4000 MS 1000 MS 3000 MS FPS OVERVIEW窗格 FPS图表 CPU DDTD公交专业专业专业专业专业贷款贷款 LLITITTL 网络 4.2MB-HFAB 2000MS 3500 MS 3000 MS 4000 MS 1000 MS 500 MS 2500 MS 4500 MS 1500 MS NETWORKAM/() FRAMES帧 212.6 MS 322.4 MS 349.2 MS 642.2 MS 264.9 MS 499.5 MS 704.8 MS 411.2 MS INTERACTIONS ANIMATION ANIMATION 交互信息 ANIMATION V ANIMATION ANIMATION ANIMATION 火焰图窗格 FP FCP LCP DCL FMP TIMINGS MAIN--HTTPS://M.JD.COM/7SCENEVAL-2&JXSID-15922065242790431631 TASK TASK 活动 PARSE HTML T...A F...I EVALUA.CRIPT E.... (..) (ANON...OUS) 内存信息 JSHEAPDOCUMENTSNODESYLISTENERS GPU MEMORY BOTTOM-UP CALL TREE EVENT LOG SUMMARY FP:首次绘制 事件日志,顺序分析 FCP:首次有内容的渲染 RA GE: .59 事件调用表,分析根活 LCP:最大内容的渲染 记录中发生的事件 事件时长表, 统计表 动和占时最多子活动 FMP:首次有意义的绘制 分析事件占时 网络通信和HTML解析 169 MS LOADING DCL:HTML 文档被完全加载和解析完成 详细信息窗格 L:页面中所以资源加载完成 934 MS JAVASCRIPT执行 SCRIPTING 557 MS 样式计算和布局 RENDERING 重绘 133MS 4594 MS PAINTING 系统事件 764 MS SYSTEM LDLE 2037MS -->
![](https://cdn.nlark.com/yuque/0/2022/png/738210/1641831175947-24e5f82b-0d87-4eda-80b5-d631ba8189f3.png)

## 核心流程
### 导航阶段
| **事件** | **含义** |
| --- | --- |
| beforeunload | 事件触发于window、document和它们的资源即将卸载时 |
| navigationstart | 相同的浏览器环境下卸载前一个文档结束之时 |
| pagehide | 当浏览器在显示与会话历史记录不同的页面的过程中隐藏当前页面时，pagehide(页面隐藏)事件被发送到一个window |
| visibilitychange | 当浏览器在某个标签切换到后台，或者从后台切换到前台时就会触发该消息 |
| unload | 当文档或一个子资源正在被卸载时，触发unload事件 |
| unloadEventEnd | 事件处理程序结束之时 |
| send request | 发送请求 |
| receive data | 接收数据 |
| commitNavigationEnd | 提交本次导航结束 |
| domLoading | 解析器开始工作时 |


### 解析HTML阶段
| **事件** | **含义** |
| --- | --- |
| receive data | 接收数据 |
| complete loading | 完成加载 |
| parseHTML | 解析HTML |
| recalculateStyle | 重新计算样式 |
| layout | 布局 |
| update layer tree | 更新图层树 |
| <font style="color:#E8323C;">paint</font> | 绘制，⚠️ 绘制可不是生成图像，而仅仅是生产一些绘制指令 |
| raster | GPU光栅化 ⚠️ 光栅化线程进行生成位图， 光栅化线程本身并不绘制，而是把绘制工作外包给GPU生成叫GPU快速栅格化 |
| compositor | 复合图层 |
| display | 显示 |
| dominteractive | 主文档的解析器结束工作时 |
| readystatechange | interactive(可交互) |
| domContentLoadEventStart | 所有的需要被运行的脚本已经被解析之时 |
| DOMContentLoaded | 当初始的HTML文档被完全加载和解析完成后，DOMContentLoaded事件被触发，而无需等待样式表、图像等完全加载 |
| domContentLoadEventEnd | 这个时刻为所需要尽早执行的脚本不管是否按顺序，都已经执行完毕 |
| domComplete | 主文档的解析器结束工作 |
| readystatechange | complete(完成) |
| load | 当整个页面及所有依赖资源，如样式表、图片都已经完成加载时，将触发load事件 |
| loadEventEnd | load事件处理程序被终止 |
| pageshow | 当一条会话历史记录被执行的时候将会触发页面显示(pageshow)事件 |


```html
<!DOCTYPE html>
<html lang="en">

	<head>
		<meta charset="UTF-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<html>
			<head>
				<title>hello</title>
				<style>
					#posts {
						width: 300px;
						height: 300px;
						background-color: green;
					}

					.post {
						width: 300px;
						height: 100px;
						background-color: red;
					}
				</style>
			</head>
			<body>
				<div id="posts"></div>
				<script>
					function addPost() {
						const posts = document.getElementById('posts');
						const element = document.createElement('div');
						element.className = 'post';
						element.innerHTML = 'post';
						posts.appendChild(element);
					}
					addPost()   
				</script>
			</body>
		</html>
	</head>
	<body>
	</body>
</html>
```

# lighthouse在Node中使用
```javascript
const express  = require('express');
const { writeFile }  = require('fs/promises');
const path  = require('path');
const lighthouse  = require('lighthouse');
const chromeLauncher  = require('chrome-launcher');
const dayjs  = require('dayjs');

const app = express();

const launchChromeAndRunLighthouse = async (url, opts, config = undefined) => {
  // 打开Chrome debug
  const chrome = await chromeLauncher.launch({
    chromeFlags: opts.chromeFlags
  });
  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['performance'],
    quiet: true,
    locale: 'zh',
    port: chrome.port,
    ...opts,
  }
  // 开始分析
  const results = await lighthouse(url, options, config);
  // 关闭Chrome
  await chrome.kill();
  // 生成报告
  const report = results?.report;
  console.log(report);
  await writeFile(path.join(__dirname, 'reports', `${dayjs().format('YYYY-MM-DD_HH-mm-SS')}report.html`), report);
  return report;
}

app.use(async (req, res, next) => {
  if(req.url.match('/performance')) {
    const opts = {
      chromeFlags: ['--show-paint-rects'],
      preset: 'desktop',
    }
    const report = await launchChromeAndRunLighthouse(
      'http://localhost:9090',
      opts
    )
    res.send(report);
    return
  }
  return next();
});

app.listen(9091, () => {
  console.log(`服务器已经在9091端口上启动了...`);
})

```

> ⚠️ 需要查看每个优化点的详情，可以运行下列源码，按如下步骤操作:
>

```shell
npm i        // 安装依赖
npm run site // 启动网站
npm run dev  // 启动lighthouse
```

> 访问 [http://localhost:9091/performance](http://localhost:9091/performance) 这个地址，生成报告，最终效果如下图，可以在红色框中查看每项的详情。
>

<!-- 这是一张图片，ocr 内容为：100 0.8秒 TOTAL BLOCKING TIM 0.8秒 下到双工地请请在是示了万元后在后转沿舞,希气意与空转长,与来放请的下程的下程在中,请出建后一后下轻清为 -->
![](https://cdn.nlark.com/yuque/0/2022/png/738210/1641889771270-7062b2af-1d99-4c3a-8838-3a005477b70e.png)

# lighthouse优化
## 减少未使用的 JavaScript
+ [Remove unused JavaScript](https://web.dev/unused-javascript/?utm_source=lighthouse&utm_medium=cli)
+ 请减少未使用的 JavaScript，并等到需要使用时再加载脚本，以减少网络活动耗用的字节数

## 采用新一代格式提供图片
+ [Serve images in modern formats](https://web.dev/uses-webp-images/?utm_source=lighthouse&utm_medium=cli)
+ WebP 和 AVIF 等图片格式的压缩效果通常优于 PNG 或 JPEG，因而下载速度更快，消耗的数据流量更少

## 适当调整图片大小
+ [Properly size images](https://web.dev/uses-responsive-images/?utm_source=lighthouse&utm_medium=cli)
+ 提供大小合适的图片可节省移动数据网络流量并缩短加载用时

## 推迟加载屏幕外图片
+ [Defer offscreen images](https://web.dev/offscreen-images/?utm_source=lighthouse&utm_medium=cli)
+ 建议您在所有关键资源加载完毕后推迟加载屏幕外图片和处于隐藏状态的图片，从而缩短可交互前的耗时

## 移除阻塞渲染的资源
+ [Eliminate render-blocking resources](https://web.dev/render-blocking-resources/?utm_source=lighthouse&utm_medium=cli)
+ 资源阻止了系统对您网页的首次渲染。建议以内嵌方式提供关键的 JS/CSS，并推迟提供所有非关键的 JS/样式

## 减少未使用的 CSS
+ [Remove unused CSS](https://web.dev/unused-css-rules/?utm_source=lighthouse&utm_medium=cli)
+ 请从样式表中减少未使用的规则，并延迟加载首屏内容未用到的 CSS，以减少网络活动耗用的字节数

## 使用视频格式提供动画内容
+ [Use video formats for animated content](https://web.dev/efficient-animated-content/?utm_source=lighthouse&utm_medium=cli)
+ 使用大型 GIF 提供动画内容会导致效率低下。建议您改用 MPEG4/WebM 视频（来提供动画）和 PNG/WebP（来提供静态图片）以减少网络活动消耗的字节数

## 预先连接到必要的来源
+ [Preconnect to required origins](https://web.dev/uses-rel-preconnect/?utm_source=lighthouse&utm_medium=cli)
+ 建议添加 `<font style="color:rgb(235, 87, 87) !important;">preconnect</font>` 或 `<font style="color:rgb(235, 87, 87) !important;">dns-prefetch</font>` 资源提示，以尽早与重要的第三方来源建立连接

## 应避免向新型浏览器提供旧版JavaScript
+ [Deploying ES2015+ Code in Production Today](https://philipwalton.com/articles/deploying-es2015-code-in-production-today/)
+ Polyfill 和 transform 让旧版浏览器能够使用新的 JavaScript 功能。不过，其中的很多函数对新型浏览器而言并非必需。对于打包的 JavaScript，请采用现代脚本部署策略，以便利用 module/nomodule 功能检测机制来减少传送到新型浏览器的代码量，同时保留对旧版浏览器的支持

## 确保文本在网页字体加载期间保持可见状态
+ [Ensure text remains visible during webfont load](https://web.dev/font-display/?utm_source=lighthouse&utm_medium=cli)
+ 利用 font-display 这项 CSS 功能，确保文本在网页字体加载期间始终对用户可见

## 未使用被动式监听器来提高滚动性能
+ [Use passive listeners to improve scrolling performance](https://web.dev/uses-passive-event-listeners/?utm_source=lighthouse&utm_medium=cli)
+ 建议您将触摸和滚轮事件监听器标记为 `<font style="color:rgb(235, 87, 87) !important;">passive</font>`，以提高页面的滚动性能,`<font style="color:rgb(235, 87, 87) !important;">passive</font>`不会对事件的默认行为说 no

## 图片元素没有明确的width和height
+ 请为图片元素设置明确的宽度值和高度值，以减少布局偏移并改善 CLS

## 注册“unload”事件监听器
+ [Legacy lifecycle APIs to avoid](https://developers.google.com/web/updates/2018/07/page-lifecycle-api?utm_source=lighthouse&utm_medium=cli#the-unload-event)
+ `<font style="color:rgb(235, 87, 87) !important;">unload</font>`事件不会可靠地触发，而且监听该事件可能会妨碍系统实施“往返缓存”之类的浏览器优化策略。建议您改用`<font style="color:rgb(235, 87, 87) !important;">pagehide</font>`或`<font style="color:rgb(235, 87, 87) !important;">visibilitychange</font>`事件

## 最大限度地减少主线程工作
+ [Minimize main thread work](https://web.dev/mainthread-work-breakdown/?utm_source=lighthouse&utm_medium=cli)
+ 建议您减少为解析、编译和执行 JS 而花费的时间。您可能会发现，提供较小的 JS 负载有助于实现此目标

## 采用高效的缓存策略提供静态资源
+ [Serve static assets with an efficient cache policy](https://web.dev/uses-long-cache-ttl/?utm_source=lighthouse&utm_medium=cli)
+ 延长缓存期限可加快重访您网页的速度

## 缩短 JavaScript 执行用时
+ [Reduce JavaScript execution time](https://web.dev/bootup-time/?utm_source=lighthouse&utm_medium=cli)
+ 建议您减少为解析、编译和执行 JS 而花费的时间。您可能会发现，提供较小的 JS 负载有助于实现此目标

## 避免链接关键请求
+ [Avoid chaining critical requests](https://web.dev/critical-request-chains/?utm_source=lighthouse&utm_medium=cli)
+ 下面的关键请求链显示了以高优先级加载的资源。请考虑缩短链长、缩减资源的下载文件大小，或者推迟下载不必要的资源，从而提高网页加载速度

## 请保持较低的请求数量和较小的传输大小
+ [Use Lighthouse for performance budgets](https://web.dev/use-lighthouse-for-performance-budgets/?utm_source=lighthouse&utm_medium=cli)
+ [performancebudget](https://www.performancebudget.io/)
+ 若要设置页面资源数量和大小的预算，请添加 budget.json 文件

## 最大内容渲染时间元素
+ [Largest Contentful Paint](https://web.dev/lighthouse-largest-contentful-paint/?utm_source=lighthouse&utm_medium=cli)
+ 这是此视口内渲染的最大内容元素

## 请避免出现大幅度的布局偏移
+ 这些 DOM 元素对该网页的 CLS 影响最大

## 应避免出现长时间运行的主线程任务
+ [Are long JavaScript tasks delaying your Time to Interactive?](https://web.dev/long-tasks-devtools/?utm_source=lighthouse&utm_medium=cli)
+ 列出了主线程中运行时间最长的任务，有助于识别出导致输入延迟的最主要原因

## 避免使用未合成的动画
+ [Avoid non-composited animations](https://web.dev/non-composited-animations/?utm_source=lighthouse&utm_medium=cli)
+ 未合成的动画可能会卡顿并增加 CLS

## 缩减 CSS
+ [Minify CSS](https://web.dev/unminified-css/?utm_source=lighthouse&utm_medium=cli)
+ 缩减 CSS 文件大小可缩减网络负载规模

## 缩减 JavaScrip
+ [Minify JavaScript](https://web.dev/unminified-javascript/?utm_source=lighthouse&utm_medium=cli)
+ 如果缩减 JavaScript 文件大小，则既能缩减负载规模，又能缩短脚本解析用时

## 对图片进行高效编码
+ [Efficiently encode images](https://web.dev/uses-optimized-images/?utm_source=lighthouse&utm_medium=cli)
+ 如果图片经过了优化，则加载速度会更快，且消耗的移动数据网络流量会更少

## 启用文本压缩
+ [Enable text compression](https://web.dev/uses-text-compression/?utm_source=lighthouse&utm_medium=cli)
+ 对于文本资源，应先压缩（gzip、deflate 或 brotli），然后再提供，以最大限度地减少网络活动消耗的字节总数

## 初始服务器响应用时较短
+ [Reduce server response times (TTFB)](https://web.dev/time-to-first-byte/?utm_source=lighthouse&utm_medium=cli)
+ 请确保服务器响应主文档的用时较短，因为这会影响到所有其他请求的响应时间

## 避免多次网页重定向
+ [Avoid multiple page redirects](https://web.dev/redirects/?utm_source=lighthouse&utm_medium=cli)
+ 重定向会在网页可加载前引入更多延迟

## 预加载关键请求
+ [Preload key requests](https://web.dev/uses-rel-preload/?utm_source=lighthouse&utm_medium=cli)
+ 建议使用 `<font style="color:rgb(235, 87, 87) !important;"><link rel=preload></font>` 来优先提取当前在网页加载后期请求的资源

## 使用 HTTP/2
+ [Does not use HTTP/2 for all of its resources](https://web.dev/uses-http2/?utm_source=lighthouse&utm_medium=cli)
+ HTTP/2 提供了许多优于 HTTP/1.1 的益处，包括二进制标头和多路复用

## 请移除 JavaScript 软件包中的重复模块
+ 从软件包中移除重复的大型 JavaScript 模块可减少网络传输时不必要的流量消耗

## 预加载 LCP 元素所用图片
+ [优化 Largest Contentful Paint 最大内容绘制](https://web.dev/optimize-lcp/?utm_source=lighthouse&utm_medium=cli#preload-important-resources)
+ 请预加载 Largest Contentful Paint (LCP) 元素所用的图片，以缩短您的 LCP 用时

## 避免网络负载过大
+ [Avoid enormous network payloads](https://web.dev/total-byte-weight/?utm_source=lighthouse&utm_medium=cli)
+ 网络负载过大不仅会让用户付出真金白银，还极有可能会延长加载用时

## 避免 DOM 规模过大
+ [Avoid an excessive DOM size](https://web.dev/dom-size/?utm_source=lighthouse&utm_medium=cli)
+ 大型 DOM 会增加内存使用量、导致样式计算用时延长，并产生高昂的布局重排成本

## User Timing 标记和测量结果
+ [User Timing marks and measures](https://web.dev/user-timings/?utm_source=lighthouse&utm_medium=cli)
+ 建议使用 User Timing API 检测您的应用，从而衡量应用在关键用户体验中的实际性能

## 尽量减少第三方使用
+ [Loading Third-Party JavaScript](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/loading-third-party-javascript/?utm_source=lighthouse&utm_medium=cli)
+ 第三方代码可能会显著影响加载性能。请限制冗余第三方提供商的数量，并尝试在页面完成主要加载后再加载第三方代码

## 使用 Facade 延迟加载第三方资源
+ [Lazy load third-party resources with facades](https://web.dev/third-party-facades/?utm_source=lighthouse&utm_medium=cli)
+ 您可以延迟加载某些第三方嵌入代码。不妨考虑使用 Facade 替换这些代码，直到您需要使用它们为止

## Largest Contentful Paint 所对应的图片未被延迟加载
+ [The performance effects of too much lazy-loading](https://web.dev/lcp-lazy-loading/?utm_source=lighthouse&utm_medium=cli)
+ 被延迟加载的首屏图片会在页面生命周期内的较晚时间呈现，这可能会致使系统延迟渲染最大内容元素

## 请勿使用 document.write()
+ [Uses document.write()](https://web.dev/no-document-write/?utm_source=lighthouse&utm_medium=cli)
+ 对于连接速度较慢的用户，通过 `<font style="color:rgb(235, 87, 87) !important;">document.write()</font>` 动态注入的外部脚本可将网页加载延迟数十秒

## 具有包含 width 或 initial-scale 的 标记
+ [Does not have a tag with width or initial-scale](https://web.dev/viewport/?utm_source=lighthouse&utm_medium=cli)
+ `<font style="color:rgb(235, 87, 87) !important;"><meta name="viewport"></font>` 不仅会针对移动设备屏幕尺寸优化您的应用，还会阻止系统在响应用户输入前出现 300 毫秒的延迟

# 源码
[GitHub - lotosv2010/g-lighthouse: 使用 lighthouse 分析网页性能](https://github.com/lotosv2010/g-lighthouse)

# 参考
[web.dev](https://web.dev/fast/)

[Web 性能 | MDN](https://developer.mozilla.org/zh-CN/docs/Web/Performance)



[我的前端性能优化知识体系](https://mp.weixin.qq.com/s/rzH_BX0W-7ezuVdTqa7_Vg)



[lighthouse](https://www.npmjs.com/package/lighthouse#using-the-node-module)



[web-vitals](https://www.npmjs.com/package/web-vitals)



[开篇：知识体系与小册格局 · 前端性能优化原理与实践 · 看云](https://www.kancloud.cn/sllyli/performance/1242194)



[HOME · PWA 应用实战](https://lavas-project.github.io/pwa-book/)



[Chrome的Performance面板](https://www.jianshu.com/p/d476bd527e48)



[Chrome渲染教程_一江春水绿如蓝的博客-CSDN博客](https://blog.csdn.net/weixin_42071117/category_9808357.html?spm=1001.2014.3001.5482)



[使用 Lighthouse 分析前端性能](https://zhuanlan.zhihu.com/p/376925215)



[Intersection Observer - Web API 接口参考 | MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/IntersectionObserver)



[渲染优化之浏览器关键渲染路径 - Tim的资源站](https://www.timsrc.com/article/267/browser-critical-rendering-path)



[Web 页面生命周期 LifeCycle API - 掘金](https://juejin.cn/post/6908281006726479879)



[Page Lifecycle API 教程 - 阮一峰的网络日志](http://www.ruanyifeng.com/blog/2018/11/page_lifecycle_api.html)



[window.requestAnimationFrame - Web API 接口参考 | MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestAnimationFrame)



[一文看懂Chrome浏览器运行机制](https://zhuanlan.zhihu.com/p/102149546)



