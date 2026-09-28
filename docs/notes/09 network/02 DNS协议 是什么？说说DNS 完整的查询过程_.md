# <font style="color:rgb(44, 62, 80);">是什么</font>
+ <font style="color:rgb(44, 62, 80);">DNS（Domain Names System），域名系统，是互联网一项服务，是进行域名和与之相对应的 IP 地址进行转换的服务器</font>
+ <font style="color:rgb(44, 62, 80);">简单来讲，</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">DNS</font>`<font style="color:rgb(44, 62, 80);">相当于一个翻译官，负责将域名翻译成</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">ip</font>`<font style="color:rgb(44, 62, 80);">地址</font>
    - <font style="color:rgb(44, 62, 80);">IP 地址：一长串能够唯一地标记网络上的计算机的数字</font>
    - <font style="color:rgb(44, 62, 80);">域名：是由一串用点分隔的名字组成的 Internet 上某一台计算机或计算机组的名称，用于在数据传输时对计算机的定位标识</font>

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/webp/738210/1764904276959-39f4bc24-d18a-4e55-bc20-bc738e538f8a.webp)

# <font style="color:rgb(44, 62, 80);">域名</font>
+ <font style="color:rgb(44, 62, 80);">域名是一个具有层次的结构，从上到下一次为根域名、顶级域名、二级域名、三级域名...</font>

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/webp/738210/1764904337627-f14ebb9c-0b1a-45f2-92ae-70078280b54b.webp)

+ <font style="color:rgb(44, 62, 80);">例如</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">www.xxx.com</font>`<font style="color:rgb(44, 62, 80);">，</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">www</font>`<font style="color:rgb(44, 62, 80);">为三级域名、</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">xxx</font>`<font style="color:rgb(44, 62, 80);">为二级域名、</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">com</font>`<font style="color:rgb(44, 62, 80);">为顶级域名，系统为用户做了兼容，域名末尾的根域名</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">.</font>`<font style="color:rgb(44, 62, 80);">一般不需要输入</font>
+ <font style="color:rgb(44, 62, 80);">在域名的每一层都会有一个域名服务器，如下图：</font>

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/webp/738210/1764904347131-cd75e089-5966-44a1-8df3-56191f943aef.webp)

+ <font style="color:rgb(44, 62, 80);">除此之外，还有电脑默认的本地域名服务器</font>

# <font style="color:rgb(44, 62, 80);">查询方式</font>
+ <font style="color:rgb(44, 62, 80);">DNS 查询的方式有两种：</font>
    - <font style="color:rgb(44, 62, 80);">递归查询：如果 A 请求 B，那么 B 作为请求的接收者一定要给 A 想要的答案</font>

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/webp/738210/1764904380291-02fabf22-b109-4fa1-9b94-c85a37ca3c10.webp)

    - <font style="color:rgb(44, 62, 80);">迭代查询：如果接收者 B 没有请求者 A 所需要的准确内容，接收者 B 将告诉请求者 A，如何去获得这个内容，但是自己并不去发出请求</font>

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/webp/738210/1764904407325-4cf48f02-746d-499e-88a2-41796f406524.webp)

# <font style="color:rgb(44, 62, 80);">域名缓存</font>
+ <font style="color:rgb(44, 62, 80);">在域名服务器解析的时候，使用缓存保存域名和</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">IP</font>`<font style="color:rgb(44, 62, 80);">地址的映射</font>
+ <font style="color:rgb(44, 62, 80);">计算机中</font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">DNS</font>`<font style="color:rgb(44, 62, 80);">的记录也分成了两种缓存方式：</font>
    - <font style="color:rgb(44, 62, 80);">浏览器缓存：浏览器在获取网站域名的实际 IP 地址后会对其进行缓存，减少网络请求的损耗</font>
    - <font style="color:rgb(44, 62, 80);">操作系统缓存：操作系统的缓存其实是用户自己配置的</font><font style="color:rgb(44, 62, 80);"> </font>`<font style="color:rgb(71, 101, 130);background-color:rgba(27, 31, 35, 0.05);">hosts</font>`<font style="color:rgb(44, 62, 80);"> </font><font style="color:rgb(44, 62, 80);">文件</font>

# <font style="color:rgb(44, 62, 80);">查询过程</font>
+ <font style="color:rgb(44, 62, 80);">解析域名的过程如下：</font>
    - <font style="color:rgb(44, 62, 80);">首先搜索浏览器的 DNS 缓存，缓存中维护一张域名与 IP 地址的对应表</font>
    - <font style="color:rgb(44, 62, 80);">若没有命中，则继续搜索操作系统的 DNS 缓存</font>
    - <font style="color:rgb(44, 62, 80);">若仍然没有命中，则操作系统将域名发送至本地域名服务器，本地域名服务器采用递归查询自己的 DNS 缓存，查找成功则返回结果</font>
    - <font style="color:rgb(44, 62, 80);">若本地域名服务器的 DNS 缓存没有命中，则本地域名服务器向上级域名服务器进行迭代查询</font>
        * <font style="color:rgb(44, 62, 80);">首先本地域名服务器向根域名服务器发起请求，根域名服务器返回顶级域名服务器的地址给本地服务器</font>
        * <font style="color:rgb(44, 62, 80);">本地域名服务器拿到这个顶级域名服务器的地址后，就向其发起请求，获取权限域名服务器的地址</font>
        * <font style="color:rgb(44, 62, 80);">本地域名服务器根据权限域名服务器的地址向其发起请求，最终得到该域名对应的 IP 地址</font>
    - <font style="color:rgb(44, 62, 80);">本地域名服务器将得到的 IP 地址返回给操作系统，同时自己将 IP 地址缓存起来</font>
    - <font style="color:rgb(44, 62, 80);">操作系统将 IP 地址返回给浏览器，同时自己也将 IP 地址缓存起</font>
    - <font style="color:rgb(44, 62, 80);">至此，浏览器就得到了域名对应的 IP 地址，并将 IP 地址缓存起</font>
+ <font style="color:rgb(44, 62, 80);">流程如下图所示：</font>

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/webp/738210/1764904492631-361b02f4-47f9-4173-a873-5e3ccf38da37.webp)

# <font style="color:rgb(44, 62, 80);">参考</font>
[DNS 域名系统 - 云物互联 - 博客园](https://www.cnblogs.com/jmilkfan-fanguiju/p/12789677.html)

[超详细 DNS 协议解析](https://segmentfault.com/a/1190000039039275)

