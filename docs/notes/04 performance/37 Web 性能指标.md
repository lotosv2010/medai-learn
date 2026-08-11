# 一、概述
+ 我们已经知道性能的重要性，但当我们讨论性能的时候，让一个网页变得跟快，具体是指哪些？
+ 事实上性能是相对的：
    - 对于一个用户而言，一个站点可能速度很快（在具有功能强大的设备的快速网络上），而对于另一用户而言，一个站点可能会较慢（在具有低端设备的慢速网络上）。
    - 两个站点可能会在完全相同的时间内完成加载，但一个站点似乎加载速度会更快（如果它逐步加载内容，而不是等到最后显示任何内容）。
    - 一个网站可能会出现快速加载但后来（在全部或没有）慢慢地响应用户的交互。
+ 所以在讨论性能的时候，精确的、可量化的指标很重要。
+ 但是，仅仅因为一个度量标准是基于客观标准并且可以定量地度量的，并不一定意味着这些度量是有用的。
+ 对于 Web 开发人员来说，如何衡量一个 Web 页面的性能一直是一个难题。
+ 最初，我们使用 Time to First Byte、DomContentLoaded 和 Load 这些衡量文档加载进度的指标，但它们不能直接反应用户视觉体验。
+ 为了能衡量用户视觉体验，Web 标准中定义了一些性能指标，这些性能指标被各大浏览器标准化实现，例如 First Paint 和 First Contentful Paint。还有一些由 Web 孵化器社区组（WICG）提出的性能指标，如 Largest Contentful Paint 、Time to Interactive、First Input Delay、First CPU Idle。另外还有 Google 提出的 First Meaningful Paint、Speed Index，百度提出的 First Screen Paint。
+ 为了能衡量用户视觉体验，Web 标准中定义了一些性能指标，这些性能指标被各大浏览器标准化实现，例如 First Paint 和 First Contentful Paint。还有一些由 Web 孵化器社区组（WICG）提出的性能指标，如 Largest Contentful Paint 、Time to Interactive、First Input Delay、First CPU Idle。另外还有 Google 提出的 First Meaningful Paint、Speed Index，百度提出的 First Screen Paint。

# 二、<font style="color:rgb(38, 38, 38);">RAIL 性能模型</font>
+ [RAIL](https://web.dev/rail/?utm_source=devtools) 是 Response，Animation，Idle, 和 Load 的首字母缩写, 是一种由 Google Chrome 团队于 2015 年提出的性能模型,  用于提升浏览器内的用户体验和性能。
+ RAIL 模型的理念是”以用户为中心，最终目标不是让您的网站在任何特定设备上都能运行很快，而是使用户满意”。

<!-- 这是一张图片，ocr 内容为：IDLE LOAD ANIMATION RESPONSE -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672556371010-64e5a4cf-f0d3-4349-bebf-cfb1cbf55952.png)

+ 这个名字的由来是四个英文单词的首字母：
    - 响应（Response）：应该尽可能快速的响应用户, 应该在 100ms 以内响应用户输入。
    - 动画（Animation）：在展示动画的时候，每一帧应该以 16ms 进行渲染，这样可以保持动画效果的一致性，并且避免卡顿。
    - 空闲（Idle）：当使用 Javascript 主线程的时候，应该把任务划分到执行时间小于 50ms 的片段中去，这样可以释放线程以进行用户交互。
    - 加载（Load）：应该在小于 1s 的时间内加载完成你的网站，并可以进行用户交互。

> 根据网络条件和硬件的不同，用户对性能延迟的理解也有所不同。例如，通过快速的Wi-Fi连接在功能强大的台式机上加载站点通常在1秒内完成，用户对此已经习以为常。在3G连接速度较慢的移动设备上加载网站需要花费更多时间，因此移动用户通常更耐心，在移动设备上加载5 s是一个更现实的目标。
>

+ 这四个单词代表与网站或应用的生命周期相关的四个方面，这些方面会以不同的方式影响整个网站的性能。
+ 我们将用户作为之后性能优化的中心，首先需要了解用户对于延迟的反应。用户感知延迟的时间窗口，如下表所示。

|  延迟  |  用户反映  |
| --- | --- |
| 0 ~ 16ms | 人眼可以感知每秒 60 帧的动画，即每帧 16 ms，除了浏览器将一帧画面绘制到屏幕上的时间，网站应用大约需要 10ms 来生成一帧 |
| 0 ~ 100ms | 在该时间范围内响应用户操作，才会是流畅的体验 |
| 100 ~ 1000ms | 能够感觉到明显的延迟 |
| > 1s | 用户的注意力将离开对执行任务的关注 |
| > 10s | 用户感到失望，可能会放弃任务 |


## 响应
+ 指标：应该尽可能快速的响应用户，应该在 100ms 以内响应用户输入。
+ 网站性能对于响应方面的要求是，在用户感知延迟之前接收到操作的反馈。比如用户进行了文本输入、按钮单击、表单切换及启动动画等操作后，必须在 100ms 内收到反馈，如果超过 100ms 的时间窗口，用户就会感知延迟。
+ 看似很基本的用户操作背后，可能会隐藏着复杂的业务逻辑处理及网络请求与数据计算。对此我们应当谨慎，将较大开销的工作放在后台异步执行，而即便后台处理要数百毫秒才能完成的操作，也应当给用户提供及时的阶段性反馈。
+ 比如在单击按钮向后台发起某项业务处理请求时，首先反馈给用户开始处理的提示，然后在处理完成的回调后反馈完成的提示。

<!-- 这是一张图片，ocr 内容为：INPUT RESPONSE 100MS BLOCKED EVENT HANDLER INPUT QUEUED LAYOUT/PAINT INPUT HANDLING IDLE TASK IDLE TASK IDLE TASK - UP TO 50MS UP TO 50MS -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672556836336-aab45254-0a46-4e1d-945f-8604ea3478c7.png)

## 动画
+ 指标：在展示动画的时候，每一帧应该以 10ms 进行渲染，这样可以保持动画效果的一致性，并且避免卡顿。
+ 前端所涉及的动画不仅有炫酷的UI特效，还包括滚动和触摸拖动等交互效果，而这一方面的性能要求就是流畅。众所周知，人眼具有视觉暂留特性，就是当光对视网膜所产生的视觉在光停止作用后，仍能保留一段时间。
+ 研究表明这是由于视神经存在反应速度造成的，其值是 1/24s，即当我们所见的物体移除后，该物体在我们眼中并不会立即消失，而会延续存在 1/24s 的时间。对动画来说，无论动画帧率有多高，最后我们仅能分辨其中的 30 帧，但越高的帧率会带来更好的流畅体验，因此动画要尽力达到 60fps 的帧率。
+ 目前大多数设备的屏幕刷新率为 60 次/秒，那么浏览器渲染动画或页面的每一帧的速率也需要跟设备屏幕的刷新率保持一致。所以根据 60fps 帧率的计算，每一帧画面的生成都需要经过若干步骤，一帧图像的生成预算为 16ms（1000ms / 60 ≈ 16.66ms），除去浏览器绘制新帧的时间，留给执行代码的时间仅 10ms 左右。如果无法符合此预算，帧率将下降，并且内容会在屏幕上抖动。 此现象通常称为卡顿，会对用户体验产生负面影响。关于这个维度的具体优化策略，会在后面优化渲染过程的相关章节中详细介绍。
+ [Janky Animation](https://googlechrome.github.io/devtools-samples/jank/)

## 空闲
+ 指标：当使用 Javascript 主线程的时候，应该把任务划分到执行时间小于 50ms 的片段中去，这样可以释放线程以进行用户交互。
+ 要使网站响应迅速、动画流畅，通常都需要较长的处理时间，但以用户为中心来看待性能问题，就会发现并非所有工作都需要在响应和加载阶段完成，我们完全可以利用浏览器的空闲时间处理可延迟的任务，只要让用户感受不到延迟即可。利用空闲时间处理延迟，可减少预加载的数据大小，以保证网站或应用快速完成加载。
+ 为了更加合理地利用浏览器的空闲时间，最好将处理任务按 50ms 为单位分组。这么做就是保证用户在发生操作后的 100ms 内给出响应。

## 加载
+ 指标：首次加载应该在小于 5s 的时间内加载完成，并可以进行用户交互。对于后续加载，则是建议在2秒内完成。
+ 用户感知要求我们尽量在 5s 内完成页面加载，如果没有完成，用户的注意力就会分散到其他事情上，并对当前处理的任务产生中断感。需要注意的是，这里在 5s 内完成加载并渲染出页面的要求，并非要完成所有页面资源的加载，从用户感知体验的角度来说，只要关键渲染路径完成，用户就会认为全部加载已完成。
+ 对于其他非关键资源的加载，延迟到浏览器空闲时段再进行，是比较常见的渐进式优化策略。比如图片懒加载、代码拆分等优化手段。
+ 关于加载方面具体的优化方案，后续也会分出独立内容进行详细介绍。

# 三、<font style="color:rgb(38, 38, 38);">基于用户体验的性能指标</font>
+ [基于用户体验的性能指标](https://web.dev/metrics/)，是 Google 在 web.dev 提出的。

## [First Contentful Paint（FCP）](https://web.dev/fcp/?utm_source=devtools)
+ FCP（First Contentful Paint）首次内容绘制，浏览器首次绘制来自 DOM 的内容的时间，内容必须是文本、图片（包含背景图）、非白色的 canvas 或 SVG，也包括带有正在加载中的 Web 字体的文本。

<!-- 这是一张图片，ocr 内容为：GOOGLE GOOGLE LARRY PAGE LARRYPAGE LARRY PAGE LARRY PAGE LARRY PAGE LAMRY PAGE CHIEF EXECUTIVE OFFICER OF ALPHABET CHIEF EXECUTIVE OFLICER OF ALPHABET PEOPLE ALSO SEARCH FOR LAWRENCE EDWARD PAGE IS AN AMERICAN COMPUTER SCIENTIST LAWRENCE EDWARD PAGE IS AN AMERICAN COMPUTER SCLENTIST AND INTERNET ENTREPRENEUR WHO CO-FOUNDED GOOGLE WITH AND INTERNET ENTREPRENEUR WHO CO FOUNDED GOOGLE WITH AND INTERNET ENTREPRENEUR WHO CO FOUNDED GOOGLE WITH SERGEY BRIN.PAGE IS THE CHIEF EXECUTIVE OFFICER OF ALPHABET INC.AFTER STEPPING ASIDE AS GOOGLE CEO IN AUGUST 2001,IN FAVOR OF ERIC SCHMIDT HE RE-ASSUMED THE ROLE IN APRILL 2011. LARRY PAGE HIS LIFE IN IMAGES HIS LIFE IN IMAGES HIS LIFE IN IMAGES FCP -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672557565759-3debb633-e94c-4578-bacc-1fbf6a74121b.png)

+ 这是用户第一次开始看到页面内容，但仅仅有内容，并不意味着它是有用的内容（例如 Header、导航栏等），也不意味着有用户要消费的内容。

### 速度指标
| FCP 时间（以秒为单位） | 颜色编码 | FCP分数（HTTP存档百分位数） |
| --- | --- | --- |
| 0-2 | 绿色（快速） | 75–100 |
| 2-4 | 橙色（中等） | 50–74 |
| 超过4 | 红色（慢） | 0–49 |


### 优化方案
+ [First Contentful Paint (FCP)](https://web.dev/fcp/?utm_source=devtools#%E5%A6%82%E4%BD%95%E6%94%B9%E8%BF%9B-fcp)

## [Largest Contentful Paint（LCP）](https://web.dev/lcp/?utm_source=devtools) 
+ LCP（Largest Contentful Paint）最大内容绘制，可视区域中最大的内容元素呈现到屏幕上的时间，用以估算页面的主要内容对用户可见时间。
+ LCP 考虑的元素：
    - <img> 元素
    - <image> 元素内的 <svg>元素
    - <video> 元素（封面图）
    - 通过 [url() ](https://developer.mozilla.org/zh-CN/docs/Web/CSS/url)函数加载背景图片的元素
    - 包含文本节点或其他内联级文本元素子级的[块级](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Block-level_elements)元素
+ 为了提供良好的用户体验，网站应力争使用 2.5 秒或更短的“最大内容绘画” 。为确保您达到大多数用户的这一目标，衡量移动设备和台式机设备的页面加载量的第75个百分位数是一个很好的衡量标准。
+ 以下是一些示例：

<!-- 这是一张图片，ocr 内容为：CH WHO HAS QUALIFIED FOR WHO HAS QUALIFIED FOR WHO HAS QUALIFIED FOR WHO HAS QUALIFIED FOR THE SEPTEMBER THE SEPTEMBER THE SEPTEMBER THE SEPTEMBER DEBATES,SO FAR DEBATES,SO FAR DEBATES,SO FAR DEBATES,SO FAR US ONLY EIGHT CANDIDATES HAVE ALREADY QUALIFIED FOR ONLY  EHT CANDIDATES HAVE ALREADY QUALIFIED FOR ONLY EIGHT CANDIDATES HAVE ALREADY QUALIFIED FOR ONLY EIGHT CANDIDATES HAVE ALREADY QUALIFIED FOR THE THIRD DEMOCRATIC DEBATE HOSTED BY ABC AND THE THIRD DEMOCRATIC DEBATE HOSTED BY ABC AND UNIVISION HOW TO MAKE MONEY WITH MERCH FROM A VIRAL DEBATE HOW TO MAKE MONEY WITH MERCH FROM A VIRAL DEBATE R ANDERSON COOPER:THIS IS THE QUESTION FOR 2020 ANDERSON COOPER:THIS IS THE QUESTION FOR 2020 DEMOCRATS WHETHER YOU TRUST SCIENTISTS MAY DEPEND ON YOUR POLITICAL WHETHER YOU TRUST SCLENTISTS MAY DEPEND ON YOUR POIITICAL WHETHER YOU TRUST SCIENTISTS MAY DEPEND ON YOUR POLITICAL PARTY,SURVEYS FCP LCP -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672558111933-a62c6be8-48f1-45d9-9a06-77001008f439.png)

<!-- 这是一张图片，ocr 内容为：THE LATEST THE LATEST TESLA BRINGS BACK FREE TESLA BRINGS BACK FREE STOCKX WAS HACKED, UNLIMITED SUPERCHARGING UNLIMITED SUPERCHARGING EXPOSING MILLIONS OF FOR THE MODEL S AND X FOR THE MODEL S AND X CUSTOMERS' DATA AUG 03.2019 KIRSTEN KOROSEC AUG 03.2019 KIRSTEN KOROSEC STOCKX WAS HACKED, STOCKX WAS HACKED, EXPOSING MILLIONS OF EXPOSING MILLIONS OF ETHICAL FASHION IS ON THE ETHICAL FASHION IS ON THE CUSTOMERS' DATA CUSTOMERS' DATA RISE RISE AUG 03.2019 BRIAN KATEMAN ELON MUSK SAYS THE BORING COMPANY WILL APPLE CARD CAN'T BE USED APPLE CARD CAN'T BE USED ELON MUSK SAYS THE BORING COMPANY WILL TO BUY CRYPTO TO BUY CRYPTO LAUNCH IN CHINA THIS MONTH AUG 03,2019 NATASHA LOMAS AUG 03.2019 NATASHA LOMAS WHY AWS GAINS BIG STORAGE EFFICIENCIES WITH E8 ACQULSITION STOCKX WAS HACKED. STOCKX WAS HACKED, RON MILLIER EXPOSING MILLIONS OF EXPOSING MILLIONS OF WHY AWS GAINS BIG STORAGE EFFICIENCIES CUSTOMERS'DATA CUSTOMERS' DATA DIGITAL IDENTITY STARTUP YOTI RAISES WITH E8 ACQUISITION AUG 03.2019 ZACK WHITTAKER AUG 03.2019 ZACK WHITTAKER ELON MUSK SAYS THE BORING COMPANY WILL RON MITHER LAUNCH IN CHINA THIS MONTH STEVE O HEAR DIGITAL IDENTITY STARTUP YOTI RAISES E3S ORGANIZER APOLOGIZES E3'S ORGANIZER SPACEX DETAILS LAUNCH AND LANDING PLANS ADDITIONAL E8M AT A VALUATION OF E82M AFTER REVEALING APOLOGIZES AFTER FOR STARSHIP AND SUPER HEAVY IN NEW INFORMATION FOR REVEALING INFORMATION FOR THOUSANDS OF JOURNALISTS THOUSANDS OF JOURNALISTS WHY AWS GAINS BIG STORAGE EFFICIENCIES DARRELL ETHERINGTON ATD 05.2019 BRIAN HEATER SPASEX DETAITS LAUNCH AND LANDING PLANS FCP LCP -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672558127580-ce292581-e916-4f3e-9c2a-7ea3795f2d62.png)

+ 在以上两个时间轴中，最大的元素随内容加载而变化。在第一个示例中，新内容被添加到DOM中，并且更改了最大的元素。在第二个示例中，布局发生更改，以前最大的内容从视口中删除。
+ 通常情况下，延迟加载的内容要比页面上已有的内容大，但不一定是这种情况。接下来的两个示例显示了在页面完全加载之前发生的最大内容绘画。

<!-- 这是一张图片，ocr 内容为：INSTAGRAM GET OET OET CET FIND IT FOR FREE ON GOOGLE F FIND IT FOR FREE ON GOOGLE PLAY FIND IT FOR FREE ON GOOGLE PLAY ENOLISH ENOLISH ENOLISH GNSTAGIAM GNSTAGRAM GNSTAGRAM SIGN UP TO SEE PHOTOS AND VIDEOS FROM YOUR SIGN UP WITH EMAIL OR PHONE NUMBER SIGN UP WITH EMAIL OR PHONE NUMBER GOOGLE PLAY SWITCH ACCOUNTS OR SIGN UP SWITCH ACCOUNTS OR SIGN UP HAVE AN ACCOUNT?LOG IN HAVE AN ACCOUNT?LEG IN FCP LCP -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672558178139-67ad8103-371b-41ae-afca-659076983d63.png)

<!-- 这是一张图片，ocr 内容为：GOOGLE GOOGLE LANRY PAGE LANRY PAGE LANY PAGE LARRY PAGE LARRY PAGE LARRY PAGE LARRY PAGE LARRY PAGE CHIEF EXECUTIVE OFFICER OF ALPHABET PECPLE ALSO SEARCH FOR OVERVIEV VIDEOS OVERVIEW VIDCOS LAWRENCE EDWARD PAGE IS AN AMERICAN COMPUTER SCIENTIST LAWRENCE EDWARD PAGE IS AN AMERICAN COMPUTER SCIER SCIERTIST LAWRENCE EDWARD PAGE IS AN AMERICAN COMPUTER SCIENTIST THINTARNAN EPUR EPUER PAR ON AN ANTISTOROOR EDURTENTER AND INTERNET ENTREPRENEUR WHO CO-FOUNDED GOOGLE WITH AND INTERNET ENTREPRENEUR WHO CO FOUNDED GOOGLE WITH SERGEY BRIN.PAGE IS THE CHIEF EXXECUTIVE OFFICER OF ALPHABET SERGEY BRIN.PAGE IS THE CHIEF EXECUTIVE OFFICER OF ALPHABET SERGEY BRIN.PAGE IS THE CHIEF EXECUTIVE OFFICER OF ALPHABET INE.AFTER STEPPING ASIDE AS GOOGLE CEO IN AUGUST 2001,IN INC.AFTER STEPPING ASIDE AS GOOGLE CEO IN AUGUST 2001,IN INC.AFTER STEPPING ASIDE AS GOOGLE CEO IN AUGUST 2001,IN INC.AFTER STEPPING ASIDE AS GOOGLE CEO IN AUGUST 2001,IN FAVOR OF ERIC SCHMIDT,HE RE-ASSUMED THE ROLE IN APEIL 2011 FAVOR OF ERIO SCHMIDT,HE RE-ASSUMED THE ROLE IN APRIL 2011 FAVOR OF ERIO SCHMIDT HE RE-ASSUMED THE ROLE IN APEIL 2011 FAVOR OF ERIC SCHMIDT.HE RE-ASSUMED THE ROLE ROLE IN APRIL 2011. WIKIPEDIA LARRY PAGE LARRY PAGE LARRY PAGE LARRY PAGE HIS LIFE IN IMAGES HIS LIFE IN IMAGES HIS LIFE IN IMAGES HIS LIFE IN IMAGES FCP LCP -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672558194425-1edc63a3-4cf4-4543-b5a0-56f391d22e79.png)

+ 在第一个示例中，Instagram 徽标相对较早地加载，即使逐渐显示其他内容，它仍然是最大的元素。在 Google 搜索结果页面示例中，最大的元素是一段文本，该文本在任何图像或徽标加载完成之前显示。由于所有单个图像均小于此段，因此在整个加载过程中，它始终是最大的元素。

> 在 Instagram 时间轴的第一帧中，您可能会注意到相机徽标周围没有绿色框。那是因为它是一个 <svg> 元素，并且  <svg>  元素当前不被视为 LCP 候选对象。
>

### 速度指标
| LCP 时间（以秒为单位） | 颜色编码 |
| --- | --- |
| 0-2.5 | 绿色（快速） |
| 2.5-4 | 橙色（中等） |
| 超过4 | 红色（慢） |


### 优化方案
+ [Largest Contentful Paint (LCP)](https://web.dev/lcp/?utm_source=devtools#%E5%A6%82%E4%BD%95%E6%94%B9%E8%BF%9B-lcp)
+ [Optimize Largest Contentful Paint](https://web.dev/optimize-lcp/)

## [First Input Delay（FID）](https://web.dev/fid/?utm_source=devtools)
+ FID（First Input Delay）首次输入延迟，从用户第一次与页面交互（例如单击链接、点击按钮等）到浏览器实际能够响应该交互的时间。
+ 输入延迟是因为浏览器的主线程正忙于做其他事情，所以不能响应用户。发生这种情况的一个常见原因是浏览器正忙于解析和执行应用程序加载的大量计算的 JavaScript。
+ 第一次输入延迟通常发生在第一次内容绘制（FCP）和可持续交互时间（TTI）之间，因为页面已经呈现了一些内容，但还不能可靠地交互。

<!-- 这是一张图片，ocr 内容为：TTI FCP MAIN THREAD IS STYLES ARE LOADED AND NAVIGATION BROWSER CAN PAINT CONTENT START IDLE FOR 5+SECONDS NETWORK REQUESTS MAIN THREAD NETWORK REQUEST BROWSER CAN RESPOND BROWSER RECEIVES TO THE FIRST USER INPUT FIRST USER INPUT MAIN THREAD TASK FID -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672558911218-e1ae493b-fabd-4132-bf8b-0889a097e6f9.png)

+ 如上图所示，浏览器接收到用户输入操作时，主线程正在忙于执行一个耗时比较长的任务，只有当这个任务执行完成后，浏览器才能响应用户的输入操作。它必须等待的时间就此页面上该用户的 FID 值。
+ 例如，以下所有 HTML 元素都需要在响应用户交互之前等待主线程上正在进行的任务完成：
    - 文本输入框，复选框和单选按钮（<input>，<textarea>）
    - 选择下拉菜单（<select>）
    - 链接（<a>）

### 速度指标
<!-- 这是一张图片，ocr 内容为：FID NEEDS POOR GOOD IMPROVEMENT 100MS 300MS FIRST INPUT DELAY -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672559121690-b0969868-540e-4bda-944e-0e75669a8e64.png)

### 优化方案
+ [First Input Delay (FID)](https://web.dev/fid/?utm_source=devtools#%E5%A6%82%E4%BD%95%E6%94%B9%E8%BF%9B-fid)
+ [Optimize First Input Delay](https://web.dev/optimize-fid/?utm_source=devtools)

## [Time to Interactive（TTI）](https://web.dev/tti/?utm_source=devtools)
+ 表示网页第一次  **完全达到可交互状态** 的时间点，浏览器已经可以持续性的响应用户的输入。完全达到可交互状态的时间点是在最后一个长任务（Long Task）完成的时间, 并且在随后的 5 秒内网络和主线程是空闲的。

> 长任务是需要 50 毫秒以上才能完成的任务
>

<!-- 这是一张图片，ocr 内容为：5 SECOND QUIET WINDOW NETWORK FCP THREAD MAIN NAVIGATION START -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672559258766-6f04a911-e2b3-4bcc-add7-7c920cfc1b5f.png)

### 速度指标
| TTI 指标（以秒为单位） | 颜色编码 |
| --- | --- |
| 0-3.8 | 绿色（快速） |
| 3.8-7.3 | 橙色（中等） |
| 超过7.3 | 红色（慢） |


### 优化方案
+ [Time to Interactive (TTI)](https://web.dev/tti/?utm_source=devtools#%E5%A6%82%E4%BD%95%E6%94%B9%E8%BF%9B-tti)

## [Total Block Time（TBT）](https://web.dev/tbt/?utm_source=devtools)
+ Total Block Time（TBT）总阻塞时间，度量了 FCP 和 TTI 之间的总时间，在该时间范围内，主线程被阻塞足够长的时间以防止输入响应。
+ 只要存在长任务，该主线程就会被视为“阻塞”，该任务在主线程上运行超过50毫秒（ms）。我们说主线程“被阻止”是因为浏览器无法中断正在进行的任务。因此，如果用户确实在较长的任务中间与页面进行交互，则浏览器必须等待任务完成才能响应。
+ 如果任务足够长（例如，超过50毫秒的任何时间），则用户很可能会注意到延迟并感觉页面缓慢或过时。
+ 给定的长任务的阻止时间是其持续时间超过50毫秒。页面的总阻塞时间是FCP和TTI之间发生的每个长任务的阻塞时间的总和。
+ 例如，考虑页面加载期间浏览器主线程的下图：

<!-- 这是一张图片，ocr 内容为：MAIN THREAD TIMELINE(TASK DURATIONS) 90 30 250 155 -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672559524256-bc29175c-f7e9-4e42-8252-afe6e0c4fc46.png)

+ 上面的时间轴有五个任务，其中三个是长任务，因为它们的持续时间超过50毫秒。下图显示了每个长任务的阻塞时间：

<!-- 这是一张图片，ocr 内容为：MAIN THREAD TIMELINE(TASK BLOCKING TIME) 105 200 40 -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672559540552-30d8bf5d-d392-4a74-9177-416be948bb4e.png)

+ 因此，虽然在主线程上运行任务花费的总时间为560毫秒，但只有345毫秒的时间被视为阻塞时间。

### 速度指标
| TBT 时间（以毫秒为单位） | 颜色编码 |
| --- | --- |
| 0-300 | 绿色（快速） |
| 300-600 | 橙色（中等） |
| 超过600 | 红色（慢） |


### 优化方案
+ [Total Blocking Time (TBT)](https://web.dev/tbt/?utm_source=devtools#%E5%A6%82%E4%BD%95%E6%94%B9%E8%BF%9B-tbt)

## [Cumulative Layout Shift（CLS）](https://web.dev/cls/?utm_source=devtools)
+ Cumulative Layout Shift（CLS）累计布局偏移，CLS 会测量在页面整个生命周期中发生的每个意外的布局移位的所有单独布局移位分数的总和，它是一种保证页面的视觉稳定性从而提升用户体验的指标方案。

<!-- 这是一张图片，ocr 内容为：BANNER BANNER CLSO CLS044 -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672559866543-83ff8a15-519d-45f5-bee7-ceb39a64f58d.png)

+ 您是否曾经在页面上突然发生变化时在没有警告的情况下，文字移动了，并且您失去了位置。甚至更糟：您将要点击一个链接或一个按钮，但是在手指落下的瞬间，链接移动了，您最终单击了其他东西！
+ 页面内容的意外移动通常是由于异步加载资源或将 DOM 元素动态添加到现有内容上方的页面而发生的。罪魁祸首可能是尺寸未知的图像或视频，呈现比其后备更大或更小的字体，或者是动态调整自身大小的第三方广告或小部件。

### 速度指标
| CLS 时间（以毫秒为单位） | 颜色编码 |
| --- | --- |
| 0-0.1 | 绿色（快速） |
| 0.1-0.25 | 橙色（中等） |
| 超过0.25 | 红色（慢） |


### 优化方案
+ [Cumulative Layout Shift (CLS)](https://web.dev/cls/?utm_source=devtools#%E5%A6%82%E4%BD%95%E6%94%B9%E8%BF%9B-cls)
+ [Optimize Cumulative Layout Shift](https://web.dev/optimize-cls/)

## Speed Index
+ Speed Index（速度指数）是一个表示页面可视区域中内容的填充速度的指标，可以通过计算页面可见区域内容显示的平均时间来衡量。

### 测量方式
+ 捕获浏览器加载页面过程的视频，然后对每 100ms 间隔的页面截图计算页面内容填充的百分比，可以得到这样一个曲线。

<!-- 这是一张图片，ocr 内容为：100 100 SPEED INDEX 06 06 % VISUALLY COMPLETE % VISUALLY COMPLETE 80 80 70 70 09 09 SPEED INDEX 50 50 40 40 30 30 20 20 10 10 012345678910 012345678910 TIME (SECONDS) TIME (SECONDS) EXAMPLE 2 - SLOWER CONTENT LOAD EXAMPLE 1 - FASTER CONTENT LOAD VISUALLY COMPLETE 10S VISUALLY COMPLETE 10S 80% OF VISUAL CONTENT LOADED AT 8S 80% OF VISUAL CONTENT LOADED AT 2S REMAINING 20% CONTENT LOADED AT 10S REMAINING 20% CONTENT LOADED A AT 10S SPEED INDEX : 6.4 + 2.0 - 8.4 SPEED INDEX - 1.6 + 2.0 - 3.6 VC-10;SI8.4 VC-10;SI3.6 拉勾教育 -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672561378882-97d409b0-f5c2-4049-a5bc-5e9d3d4a9485.png)

+ 图中的 Example 1 和 Example 2 都是在 10s 时页面填充完成，但 Example 1 在 2s 时就已经填充了 80% 的内容，而 Example 2 在 8s 时才填充 80%。
+ 图中阴影部分的面积（即时间-内容填充百分比曲线以上部分）的大小即可表示可视区域内页面内容的填充速度，面积越小，填充速度越快。

### 速度指标
| 速度指数（以秒为单位） | 颜色编码 | 速度指数得分 |
| --- | --- | --- |
| 0-4.3 | 绿色（快速） | 75-100 |
| 4.3-5.8 | 橙色（中等） | 50-74 |
| 超过5.8 | 红色（慢） | 0-49 |


### 优化方案
+ [https://web.dev/speed-index/#how-to-improve-your-speed-index-score](https://web.dev/speed-index/#how-to-improve-your-speed-index-score)

# 四、<font style="color:rgb(38, 38, 38);">Web Vitals</font>
+ Google 开发了许多实用指标和工具，帮助衡量用户体验和质量，从而发掘优化点。一项名为 Web Vitals 的计划降低了学习成本，为网站体验提供了一组统一的质量衡量指标 — Core Web Vitals，其中包括加载体验、交互性和页面内容的视觉稳定性。
+ 有很多方法可以优化网站的用户体验。若能预先了解最佳的优化衡量方法，可以大大节省时间和成本。
+ Google 在 2020 年 5 月 5 日提出了新的用户体验量化方式 Web Vitals 来衡量网站的用户体验，并将这些衡量结果用作其排名算法的一部分。为了更好的理解这些内容，让我们来看看这些重要指标是什么。

## Core Web Vitals 与 Web Vitals
+ 什么是 Web Vitals，Google 给出的定义是 一个良好网站的基本指标（Essential metrics for a healthy site），过去要衡量一个网站的好坏，需要使用的指标太多了，Web Vitals 可以简化指标的学习曲线，只需聚焦于 Web Vitals 指标的表现即可。
+ 在这些 Web Vitals 中，Google 确定了三个主要衡量指标，即在所有类型的网站中通用的 Core Web Vitals：

<!-- 这是一张图片，ocr 内容为：WEB VITALS EWEBVITALS CORE 移动友好性 浏览安全性 加载性能 HTTPS 交互性 页面插入式广告 视觉稳定性 -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672560527510-30448ddb-bb2a-42b6-b2de-3886891ed6a2.png)

> Core Web Vitals 是应用于所有 Web 页面的 Web Vitals 的子集，是其最重要的核心。
>

<!-- 这是一张图片，ocr 内容为：(LOADING) (LNTERACTIVITY) (VISUAL STABILITY) CLS LCP FID FIRST INPUT DELAY CUMULATIVE LAYOUT SHIFT LARGEST CONTENTFUL PAINT NEEDS NEEDS NEEDS POOR GOOD GOOD GOOD POOR POOR IMPROVEMENT IMPROVEMENT IMPROVEMENT 2.5 SEC 300MS 100MS 4.0 SEC 0.25 0.1 -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672560733134-dbef4456-b8ec-479b-b8d6-44aba18fb56d.png)

    - 加载性能（LCP） -- 显示最大内容元素所需时间
    - 交互性（FID） -- 首次输入延迟时间
    - 视觉稳定性（CLS） -- 累积布局配置偏移
+ 这三个指标已经经过了一段时间的验证，如 LCP 在 WICG 已经孵化至少 1 年以上，FID 在 Google Chrome Labs 上已经实施 2 年以上，LCP 和 CLS（相关 Layout Instability API）已于今年入 W3C 草拟标准。

## 测量 Web Vitals
+ 性能测试工具，比如 Lighthouse
+ 使用 [web-vitals](https://github.com/GoogleChrome/web-vitals) 库
+ 使用浏览器插件 [Web Vitals](https://chrome.google.com/webstore/detail/web-vitals/ahfhijdlegdabablpippeagghigmibma)

## 优化 Web Vitals
+ [Optimize Largest Contentful Paint](https://web.dev/optimize-lcp/)
+ [Optimize First Input Delay](https://web.dev/optimize-fid/)
+ [Optimize Cumulative Layout Shift](https://web.dev/optimize-cls/)

# <font style="color:rgb(38, 38, 38);">五、其它性能指标</font>
## [Web的性能指标有哪些？](https://blog.csdn.net/lyj0629/article/details/80207732)
<!-- 这是一张图片，ocr 内容为：NAVIGATIONSTART REDIRECTSTART REDIRECTEND FETCHSTART DOMAINLOOKUPSTART DOMAINLOOKUPEND CONNECTSTART (SECURECONNECTIONSTART) CONNECTEND REQUESTSTART RESPONSESTART RESPONSEEND PROMPT APP TCP DNS RESPONSE FOR PROCESSING REQUEST ONLOAD REDIRECT CACHE UNLOAD UNLOAD LOADEVENTEND LOADEVENTSTART DOMCOMPLETE DOMCONTENTLOADED DOMLNTERACTIVE DOMLOADING UNLOADEND UNLOADSTART LOTOS -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672562060163-1f4cbe7e-67a8-4636-b49a-a6a12318c413.png)

+ 重定向次数：performance.navigation.redirectCount
+ 重定向耗时: redirectEnd - redirectStart
+ DNS 解析耗时: domainLookupEnd - domainLookupStart
+ TCP 连接耗时: connectEnd - connectStart
+ SSL 安全连接耗时: connectEnd - secureConnectionStart
+ 网络请求耗时 (TTFB): responseStart - requestStart
+ 数据传输耗时: responseEnd - responseStart
+ DOM 解析耗时: domInteractive - responseEnd
+ 资源加载耗时: loadEventStart - domContentLoadedEventEnd
+ 首包时间: responseStart - domainLookupStart
+ 白屏时间: responseEnd - fetchStart
+ 首次可交互时间: domInteractive - fetchStart
+ DOM Ready 时间: domContentLoadEventEnd - fetchStart
+ 页面完全加载时间: loadEventStart - fetchStart
+ http 头部大小： transferSize - encodedBodySize

## Time to First Byte（TTFB）
+ 浏览器从请求页面开始到接收第一字节的时间，这个时间段内包括 DNS 查找、TCP 连接和 SSL 连接。

## Speed Index（SI）
+ 这是一个表示页面可视区域中内容的填充速度的指标，可以通过计算页面可见区域内容显示的平均时间来衡量。

### 测量方式
+ 首先在浏览器中捕获页面加载的视频，然后对每 100 毫秒间隔的页面截图计算页面填充的百分比，可以得到这样一个曲线（纵轴是页面可视区域内容填充完成度，横轴是时间）。

<!-- 这是一张图片，ocr 内容为：100 100 SPEED INDEX 06 06 % VISUALLY COMPLETE % VISUALLY COMPLETE 80 80 70 70 09 09 SPEED INDEX 50 50 40 40 30 30 20 20 10 10 012345678910 012345678910 TIME (SECONDS) TIME (SECONDS) EXAMPLE 2 - SLOWER CONTENT LOAD EXAMPLE 1 - FASTER CONTENT LOAD VISUALLY COMPLETE 10S VISUALLY COMPLETE 10S 80% OF VISUAL CONTENT LOADED AT 8S 80% OF VISUAL CONTENT LOADED AT 2S REMAINING 20% CONTENT LOADED AT 10S REMAINING 20% CONTENT LOADED A AT 10S SPEED INDEX : 6.4 + 2.0 - 8.4 SPEED INDEX - 1.6 + 2.0 - 3.6 VC-10;SI8.4 VC-10;SI3.6 拉勾教育 -->
![](https://cdn.nlark.com/yuque/0/2023/png/738210/1672561378882-97d409b0-f5c2-4049-a5bc-5e9d3d4a9485.png)

+ 图中的 Example 1 和 Example 2 都是在 10s 时页面填充完成，但 Example 1 在 2s 是就已经填充了 80% 的内容，而 Example 2 在 8s 时才填充 80%。
+ 图中阴影部分的面积（即时间-内容填充百分比曲线以上部分）的大小即可表示可视区域内页面内容的填充速度，面积越小，填充速度越快。
+ 如果用时间来衡量，可以这样计算，以此来表示页面可见区域内容显示的平均时间。

```plain
Example 1：Speed Index = (80% * 2) + （20% * 10）= 3.6
Example 2：Speed Index = (80% * 8) + （20% * 10）= 8.4
```

+ 这个平均时间可以用来比较首屏内容完整呈现给用户的性能体验，但它计算的不是首屏内容完整呈现这一时刻，不能算是一个用时间来度量的指标。

## Frames Per Second（FPS）
+ 帧率是视频设备产生图像（或帧）的速率，用每秒可以重新绘制的帧数（Frames Per Second，FPS）表示。
+ 重新绘制可能需要重新计算样式、布局和绘制，如果每帧绘制到屏幕的时间在 16.7 ms 以上，每秒绘制的帧数就会小于 60 帧，人眼就能感受到页面出现卡顿，所以 FPS 是衡量应用流畅度的一个非常重要的指标，60fps 是页面流畅的目标，可以为每次绘制提供 16.7ms 的时间预算。
+ 既然帧率与页面重新绘制有关，那我们可以思考两个问题：
    - （1）哪些情况下会触发重新绘制？
        * FPS 在电影和游戏中最为常见，但现在被广泛用作衡量网站和网络应用程序性能的指标。
        * 在 Web 性能中，FPS 最常用于衡量动画的性能：如果 FPS 太低，动画会卡顿。
        * FPS 也可以作为用户与页面交互时页面响应性的一般度量。例如，如果将鼠标移到某个页面元素上会触发执行 JavaScript 来更新页面，这可能会触发回流和重绘，这需要在帧中完成，如果浏览器处理帧的时间过长，将会出现卡顿现象。
        * 再例如，如果在滚动页面时会触发很多复杂的页面更新，并且浏览器无法保持可接受的帧率，那么滚动页面时会显得迟缓或卡顿。
    - （2）如何降低重新绘制的时间？
        * 重新绘制到屏幕可能需要从构建 DOM 树开始、重新计算样式、布局、绘制等，我们需要尽可能的避免触发这些流程，例如使用 CSS 修改 opacity 属性就不会触发重新布局，可以减少绘制时间。
        * 所以在实现动画时，建议使用性能成本低的  CSS 属性，而不要使用 JavaScript 设置元素。

# 参考
[Measure performance with the RAIL model](https://web.dev/rail/?utm_source=devtools)

[Web Vitals](https://web.dev/vitals/)

[解读新一代 Web 性能体验和质量指标 - 掘金](https://juejin.cn/post/6844904168591736846)

[谷歌的新一代 Web 性能体验和质量指标：Web Vitals](https://www.uisdc.com/web-vitals)

[vue项目你一定会用到的性能优化！ - 掘金](https://juejin.cn/post/7089241058508275725#heading-6)

[https://chrome.google.com/webstore/detail/web-vitals/ahfhijdlegdabablpippeagghigmibma/related](https://chrome.google.com/webstore/detail/web-vitals/ahfhijdlegdabablpippeagghigmibma/related)



