# 应用场景
+ 比如百度希望能获取QQ用户的相册
+ 问题是只有得到用户的授权，QQ才会同意让百度读取这些照片
+ 那么，我们怎样获得用户的授权呢 ?
+ 传统方法是，QQ用户将自己的QQ号和密码，告诉百度，后者就可以读取用户的相册了。这样的做法有以下几个严量的缺点
    - 百度为了后续的服务，会保存用户的密码，这样很不安全
    - 百度不得不部署密码登录，而我们知道，单纯的密码登录并不安全
    - 百度拥有了获取用户储存在QQ上所有资料的权力，用户没法限制百度获得授权的范圆和有效期
    - 用户只有修改弯码，才能收回赋予百度的权力。但是这样做，会使得其他所有获得用户授权的第三方应用程序全部失效
    - 只要有一个第三方应用程序被破解，就会导致用户密码泄漏，以及所有被空码保护的数据泄漏。

> OAuth就是为了解决上面这些问题而诞生的。
>

# 名词
1. client：第三方应用程序，本文中又称客户端，即上个例子中的 "百度"
2. Resource Owner：资源所有者，本文中又称 "QQ用户"( user)。
3. User Agent：用户代理，本文中就是指浏览器。
4. http service：提供服务的HTTP服务提供商 ，即上个例子中的"QQ服务器"
5. Authorization server：认证服务器，即服务提供商专门用采处理认证的服务器。
6. Resource server：资源服务器，即服务提供商存放用户生成的资源的服务器。它与认证服务器，可以是同一台服务器，也可以是不同的6服务器。

> OAuth的作用就是让"客户端”安全可控地获取"用户"的授权，与”服务商提供商”进行互动。
>

# 设计思路
+ OAuth在"客户端"与“服务提供商”之间，设置了一个授权层(authorization layer)
+ "客户端"不能真接登录"服务提供商"，只能登录授权层，以此将用户与客户端区分开来
+ "客户端"登录授权层所用的令牌(token)，与用户的密码不同。用户可以在登录的时候，指定授权层令牌的权限范围和有效期
+ "客户端"登录授权层以后，"服务提供商"根据令牌的权限范围和有效期，向"客户端"开放用户储存的资料。

# 工作流程
<!-- 这是一张图片，ocr 内容为：!--(A)- AUTHORIZATION REQUEST RESOUR CE OWNER |<-(B)-- A AUTHORIZATIONGRANT------ TIIIIIIIIIIIIIIT 1--(C)-- AUTHORIZATION AUTHORIZATION GRANT CLIENT SERVER 1<-(D)- ACCESS TOKEN 十.............+ L--(E)----- ACCESS TOKEN - RESOUR CE SERVER 1<-(F)--- PROTECTED RESOURCE --- TIILIIIIIT -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1766393094887-ec41a802-d2c9-40f7-97d9-38c473de6a8b.png)

+ <font style="color:rgb(17, 17, 17);">（A）用户打开客户端以后，客户端要求用户给予授权。</font>
+ <font style="color:rgb(17, 17, 17);">（B）用户同意给予客户端授权。</font>
+ <font style="color:rgb(17, 17, 17);">（C）客户端使用上一步获得的授权，向认证服务器申请令牌。</font>
+ <font style="color:rgb(17, 17, 17);">（D）认证服务器对客户端进行认证以后，确认无误，同意发放令牌。</font>
+ <font style="color:rgb(17, 17, 17);">（E）客户端使用令牌，向资源服务器申请获取资源。</font>
+ <font style="color:rgb(17, 17, 17);">（F）资源服务器确认令牌无误，同意向客户端开放资源</font>

> 不难看出来，上面六个步骤之中，B是关键，即用户怎样才能给于客户端授权。有了这个授权以后，客户端就可以获取令牌，进而凭令牌获取资源。
>

# 客户端授权模式
# 接入QQ
<!-- 这是一张图片，ocr 内容为：HTTPS:// GRAPH.QQ.COM/ OAUTH2.0/ AUTHORIZE?RESPON 主定向到QQ授权 点击第三方登陆 开始 SE_TYPECODE&CLI 地址 QQ登陆 ENT ID-10115049 9&REDIRECT_URI96 输入QQ账号和密 码授权登陆 验证账号密码 生成CODE 授权成功 跳转到 REDIRECTURI指向 的地址 HTTPS:// 通过CODE获取 GRAPH.GQ.COM/ OAUTH2.0/TOKEN ACCESS_TOKEN 得到令牌 ACCESS TOKEN HTTPS:// GRAPH.QQ.COM/ 通过ACCESS.TOKEN OAUTH2.0/ 得到用户的 ME?ACCESS_TOKEN OPENID 三% 得到用户OPENID HTTPS:IF GRAPH.QQ.COM/ 通过OPENID获取 USER/ 用户信息 GET USER INFO. OK取到用户信息 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1766392976424-bca58a2d-9954-45a2-990a-df90275c5bda.png)

[网站接入流程 — QQ互联WIKI](https://wiki.connect.qq.com/%E7%BD%91%E7%AB%99%E6%8E%A5%E5%85%A5%E6%B5%81%E7%A8%8B)

# 开发自己的OAuth系统
# 参考
[理解OAuth 2.0 - 阮一峰的网络日志](https://www.ruanyifeng.com/blog/2014/05/oauth_2_0.html)

[OAuth2.0 详解](https://zhuanlan.zhihu.com/p/509212673)

[oauth2-server — oauth2-server 4.0.0-dev.2 documentation](https://oauth2-server.readthedocs.io/en/latest/index.html)

[Oauth2.0实现单点登录的原理流程，通俗易懂](https://juejin.cn/post/6987207613549117453)

