# 概述
+ User-Agent中文名为用户代理，简称 UA，它是一个特殊字符串头。通过这个标识，用户所访问的网站可以显示不同的排版从而为用户提供更好的体验或者进行信息统计；例如用手机访问网页和电脑访问是不一样的，这些是网页根据访问者的UA来判断的。但是UA可以进行伪装。
+ 浏览器的UA字串的标准格式：浏览器标识 (操作系统标识; 加密等级标识; 浏览器语言) 渲染引擎标识版本信息。但各个浏览器有所不同。

# user-agent-parse
## 安装
```shell
cnpm install user-agent-parse
```

## <font style="color:rgb(17, 17, 17);">使用</font>
```javascript
const userAgent = require('user-agent-parse');
const http = require('http');

const app = http.createServer((req, res) => {
  const ua = req.headers['user-agent'];
  if(ua) {
    const uaObj = userAgent.parse(ua);
    res.setHeader("Content-Type", "application/json;charset=utf-8;")
    res.end(JSON.stringify(uaObj));
  } else {
    res.end('NOT FOUND');
  }
});
app.listen(8088, () => {
  console.log('server start port 8088');
});
```

## 测试
```shell
cd src
nodemon server.js
```

## 结果
<!-- 这是一张图片，ocr 内容为：Tocalhost:8088 FE 众 localhost:8088 品 Performance Sources Elemants Consola Natvork Memiory Application 排序:默认 乱码侈正 升序 自功解码 FeHelper 降序 金业 e DisablacacheNothrottling PresenveLog 隐戌>> 标餐所有 元数据 HIdEDAtaURL5 FetchXHR lMgMeDIaFontDocwsWasmManifestother JSCSS ANI BlockedRequests Hasblockodcookies "version:"96.0.4664.55" 3rd-partyrequsla "os":osx10.15, 1600 "name*:"chrome" "fuliname":"chrome96.0.4664.55" :Moztl/.0citoox10157ApLK/53736 KHTELlikeGecko)Chrom/960.466455S/37.36 ResponseInaiatorTiming Prewiew Cookics Headers Name devIceType:"DeSKtop 36222 Localhost TesttaffcouM 34E649E904E54A4148B44522 223WUIE7AMDE95A blueprint-select.css 88445222C22testm in4E8474434E69E90454884452247C2 fawicon.ico L2233221739676183b76 fa-16.ong 176c39667797362270:mnitorcustorerkey-3bfcc+6646b6-405 8d6182247489219k Hostlocathost:8888 secch-ua:"NotA:Brand"g""hmi""e Chrome";V-"96" 5ec-ch-ua-mabile:70 soc-ch-ua-plattorm."macos" Sec-Fetch-Destedocument Soc-Fetch-Mode:navigate Sec-Fetch-Site:none Sec-Fetch-User:?1 Upgrade-lnsecure-Requests:1 USeRAgentMozitLa/i AppLewiebkt/53736 Safari/537.36 302kBresources 7requosts -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1638185112472-7119ba69-a2c9-4182-8e27-86db9e023d1c.png)

<!-- 这是一张图片，ocr 内容为：localhoSt:8088 VOFVAO FE  localhost:8088 古 Performance Sources Consola Elemants Natwork Memory Application 乱码停正 排序:默认O 开序 自动解码 降序 FeHeper 业 O DisablacacheNothrottling PreserveLog 隐康>> 折餐所有 元数掘 下载JSON HidedataURL5 lnwert FetchXHRJS IMgMEDiaFontDocwsWasmManitestother BlockedRequests NI CSS Hasblockodcookios "version:"96.0.4664.55" 3rd-partyrequesls "os":osx10.15*, 1800 "name*:"chrome" "fuliname":"chrome96.0.4664.55" :MoztL/.0citoox10157ApLK/53736 KHTELlikeGecko)Chrom/960.466455S/3736 x TimingCookies Hondars Response lnitiator Name DevIceType:"DeSKtop L device_types"desktop" FUL:MOZILL/McIntOshelX tuIWAme"chrome96.8.4654.55" blueprint-saect.css name:"chrome" 05:"05x10.15"' version:"96.0.4664.55"' fawicon.ico fa-16.png 302kBresouirces Finish 7requosts -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1638185072491-4f1eab7b-47e5-4ecc-a05a-48add4e3fb32.png)

# 参考
[user-agent-parse](https://www.npmjs.com/package/user-agent-parse)



[user-agents](https://www.npmjs.com/package/user-agents)



[User-agent大全](https://www.jianshu.com/p/da6a44d0791e)



[谈谈 UserAgent 字符串的规律和伪造方法 - 掘金](https://juejin.cn/post/6844903501768687630)



[UserAgent查看/UA检测 - 在线工具](https://useragent.buyaocha.com/)

