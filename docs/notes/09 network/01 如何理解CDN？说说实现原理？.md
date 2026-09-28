# <font style="color:rgb(44, 62, 80);">是什么</font>
+ <font style="color:rgb(44, 62, 80);">CDN (全称 Content Delivery Network)，即内容分发网络</font>
+ <font style="color:rgb(44, 62, 80);">构建在现有网络基础之上的智能虚拟网络，依靠部署在各地的边缘服务器，通过中心平台的负载均衡、内容分发、调度等功能模块，使用户就近获取所需内容，降低网络拥塞，提高用户访问响应速度和命中率。</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">CDN</font>`<font style="color:rgb(44, 62, 80);"> </font><font style="color:rgb(44, 62, 80);">的关键技术主要有内容存储和分发技术</font>
+ <font style="color:rgb(44, 62, 80);">简单来讲，</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">CDN</font>`<font style="color:rgb(44, 62, 80);">就是根据用户位置分配最近的资源</font>
+ <font style="color:rgb(44, 62, 80);">于是，用户在上网的时候不用直接访问源站，而是访问离他“最近的”一个 CDN 节点，术语叫</font>**<font style="color:rgb(44, 62, 80);">边缘节点</font>**<font style="color:rgb(44, 62, 80);">，其实就是缓存了源站内容的代理服务器。如下图：</font>

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/webp/738210/1764904861217-af41c3ea-ebb7-43b0-a780-ca55aedafec3.webp)

# <font style="color:rgb(44, 62, 80);">原理分析</font>
+ <font style="color:rgb(44, 62, 80);">在没有应用</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">CDN</font>`<font style="color:rgb(44, 62, 80);">时，我们使用域名访问某一个站点时的路径为</font>

> <font style="color:rgb(153, 153, 153);">用户提交域名→浏览器对域名进行解释→</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">DNS</font>`<font style="color:rgb(153, 153, 153);"> 解析得到目的主机的IP地址→根据IP地址访问发出请求→得到请求数据并回复</font>
>

+ <font style="color:rgb(44, 62, 80);">应用</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">CDN</font>`<font style="color:rgb(44, 62, 80);">后，</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">DNS</font>`<font style="color:rgb(44, 62, 80);"> 返回的不再是 </font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">IP</font>`<font style="color:rgb(44, 62, 80);"> 地址，而是一个</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">CNAME</font>`<font style="color:rgb(44, 62, 80);">(Canonical Name ) 别名记录，指向</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">CDN</font>`<font style="color:rgb(44, 62, 80);">的全局负载均衡</font>
+ `<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">CNAME</font>`<font style="color:rgb(44, 62, 80);">实际上在域名解析的过程中承担了中间人（或者说代理）的角色，这是</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">CDN</font>`<font style="color:rgb(44, 62, 80);">实现的关键</font>

## <font style="color:rgb(44, 62, 80);">负载均衡系统</font>
+ <font style="color:rgb(44, 62, 80);">由于没有返回</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">IP</font>`<font style="color:rgb(44, 62, 80);">地址，于是本地</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">DNS</font>`<font style="color:rgb(44, 62, 80);">会向负载均衡系统再发送请求 ，则进入到</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">CDN</font>`<font style="color:rgb(44, 62, 80);">的全局负载均衡系统进行智能调度：</font>
    - <font style="color:rgb(44, 62, 80);">看用户的 IP 地址，查表得知地理位置，找相对最近的边缘节点</font>
    - <font style="color:rgb(44, 62, 80);">看用户所在的运营商网络，找相同网络的边缘节点</font>
    - <font style="color:rgb(44, 62, 80);">检查边缘节点的负载情况，找负载较轻的节点</font>
    - <font style="color:rgb(44, 62, 80);">其他，比如节点的“健康状况”、服务能力、带宽、响应时间等</font>
+ <font style="color:rgb(44, 62, 80);">结合上面的因素，得到最合适的边缘节点，然后把这个节点返回给用户，用户就能够就近访问</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">CDN</font>`<font style="color:rgb(44, 62, 80);">的缓存代理</font>
+ <font style="color:rgb(44, 62, 80);">整体流程如下图：</font>

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/webp/738210/1764905083804-c1d4a782-1a91-4584-98a0-281e04abbd0f.webp)

## <font style="color:rgb(44, 62, 80);">缓存代理</font>
+ <font style="color:rgb(44, 62, 80);">缓存系统是 </font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">CDN</font>`<font style="color:rgb(44, 62, 80);">的另一个关键组成部分，缓存系统会有选择地缓存那些最常用的那些资源</font>
+ <font style="color:rgb(44, 62, 80);">其中有两个衡量</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">CDN</font>`<font style="color:rgb(44, 62, 80);">服务质量的指标：</font>
    - **<font style="color:rgb(44, 62, 80);">命中率</font>**<font style="color:rgb(44, 62, 80);">：用户访问的资源恰好在缓存系统里，可以直接返回给用户，命中次数与所有访问次数之比</font>
    - **<font style="color:rgb(44, 62, 80);">回源率</font>**<font style="color:rgb(44, 62, 80);">：缓存里没有，必须用代理的方式回源站取，回源次数与所有访问次数之比</font>
+ <font style="color:rgb(44, 62, 80);">缓存系统也可以划分出层次，分成一级缓存节点和二级缓存节点。一级缓存配置高一些，直连源站，二级缓存配置低一些，直连用户</font>
+ <font style="color:rgb(44, 62, 80);">回源的时候二级缓存只找一级缓存，一级缓存没有才回源站，可以有效地减少真正的回源</font>
+ <font style="color:rgb(44, 62, 80);">现在的商业 </font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">CDN</font>`<font style="color:rgb(44, 62, 80);">命中率都在 90% 以上，相当于把源站的服务能力放大了 10 倍以上</font>

# <font style="color:rgb(44, 62, 80);">总结</font>
+ `<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">CDN</font>`<font style="color:rgb(44, 62, 80);"> 目的是为了改善互联网的服务质量，通俗一点说其实就是提高访问速度</font>
+ `<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">CDN</font>`<font style="color:rgb(44, 62, 80);"> </font><font style="color:rgb(44, 62, 80);">构建了全国、全球级别的专网，让用户就近访问专网里的边缘节点，降低了传输延迟，实现了网站加速</font>
+ <font style="color:rgb(44, 62, 80);">通过</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">CDN</font>`<font style="color:rgb(44, 62, 80);">的负载均衡系统，智能调度边缘节点提供服务，相当于</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">CDN</font>`<font style="color:rgb(44, 62, 80);">服务的大脑，而缓存系统相当于</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">CDN</font>`<font style="color:rgb(44, 62, 80);">的心脏，缓存命中直接返回给用户，否则回源</font>

# <font style="color:rgb(44, 62, 80);">参考</font>
[程序员要搞明白CDN，这篇应该够了](https://juejin.cn/post/6844903890706661389#heading-5)

[一文读懂CDN和CDN实现的原理_cdn是怎么实现频次控制-CSDN博客](https://blog.csdn.net/lxx309707872/article/details/109078783)

