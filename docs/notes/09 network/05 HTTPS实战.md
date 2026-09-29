# <font style="color:rgb(51, 51, 51);">HTTP</font>
+ <font style="color:rgb(51, 51, 51);">HTTP 协议(HyperText Transfer Protocol，超文本传输协议)是客户端浏览器或其他程序与Web服务器之间的应用层通信协议</font>

## <font style="color:rgb(51, 51, 51);">HTTP服务器</font>
<!-- 这是一张图片，ocr 内容为：客户端 服务器 SYN ACK+SYN ACK GET/HTTP/1.1 HTTP/1.1 200 OK -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814834022-077e51b7-f7f9-451c-be32-dab42aef3d60.png)

<!-- 这是一张图片，ocr 内容为：7788 TEP.PORT INFO PROTOCOL DESTINATION TIME LENGTH SOUR CE 359 78.815228 127.0.0.1 127.0.0.1 108 64528 + 7788 [SYN] SEQ-O WIN-65535 LEN-O MSS-65495 WS-256 SACK PERM-1 TCP 127.0.0.1 36078815279 108 7788+ 64528 [SYIL, ACK] SEQ-0 ACK-1 WIN-65535 LEN-O MSS-65495 WS-256 SACK PERM, 127.0.0.1 TCP 84 64528 + 7788 [ACK] SEQ-1 ACK-1 WIN-2619648 LEN-0 127.0.0.1 TCP 361 78.815315 127.0.0.1 572 GET / HTTP/1 HTTP 127.0.0.1 127.0.0.1 362 78.815514 TCP 84 7788 + 64528 [ACK] SEQ-1 ACK-489 WIN-2619648 LEN-0 363 78.815528 127.0.0.1 127.0.0.1 188 HTTP/1.1 200 OK 127.0.0.1 HTTP 127.0.0.1 364 78.816082 ERAWE 364: 183 BYTES ON WERE (1504 BETS), 1AB BYEES CAPTUNED (113A BITS) AN INTERFACE NPF LOOPBACK, I NULL/LOOPBACK INTERNET PROTOCOL VERSION 4, SRC: 127.0.0.1, DST: 127.0.0.0.1 TRANSMISSION CONTROL PROTOCOL, SRC PORT: 7788, 0ST PORT: 64528, 1, 1, ACK:  ACK: 489, LEN: 104 HYPERTEXT TRANSFER PROTOCOL HTTP/1.1 200 OK\R\N DATE: SUN, 29 MAR 2020 07:56:49 GMT\R\N CONNECTION: KEEP-ALIVE\R\N CONTENT-LENGTH: 5\R\N [CONTENT LENGTH: 5] LRLN [HTTP RESPONSE 1/2] [TIME SINCE REQUEST: 0005680000 SECONDS] REQUEST IN FRAME:3621 INEXT REQUEST IN FRAME : 366] INEXT RESPONSE IN FRAME:3681 [REQUEST URI:HTTP://127.0.0.1:7788/FAVICON.ICO] FILE DATA: 5 BYTES DATA(5 BYTES) DATA: 68656C6C6F [LENGTH:5] LEEE 0050 4D_54 32 30373A35 363A34 30 020 20 6F OD OA Q9 0060 6E 656563 74696F 20 65 70 61 6C 0070 697665 0D 0A 43 74 65 6E 66 74 2D 4C 65 3A 20 35 PO 0080 677468 56E 68 OA 08 65 6C 6F 0090 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814833777-862ef912-b62e-4093-97d8-9713993a9676.png)

```plain
tcp.port == 7788
```

```javascript
let http = require('http');
http.createServer(function (req, res) {
  let buffer = Buffer.from('hello');
  console.log(buffer);
  res.end(buffer);
}).listen(7788, () => console.log('listening 7788'));
```

## <font style="color:rgb(51, 51, 51);">HTTP三大风险</font>
+ <font style="color:rgb(51, 51, 51);">(1)窃听风险：黑客可以获知通信内容</font>
+ <font style="color:rgb(51, 51, 51);">(2)篡改风险：黑客可以修改通信内容</font>
+ <font style="color:rgb(51, 51, 51);">(3)冒充风险：黑客可以冒充他人身份参与通信</font>

<!-- 这是一张图片，ocr 内容为：客户端 服务器 SYN ACK+SYN ACK GET/HTTP/1.1 HTTP/1.1 200 OK -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814833584-74f1259c-6dbd-45d8-bb16-7f1e48cea35f.png)

# <font style="color:rgb(51, 51, 51);">HTTPS</font>
+ <font style="color:rgb(51, 51, 51);">HTTP = HTTP+TLS/SSL</font>

| **<font style="color:rgb(51, 51, 51);">风险</font>** | **<font style="color:rgb(51, 51, 51);">对策</font>** | **<font style="color:rgb(51, 51, 51);">方法</font>** |
| :--- | :--- | :--- |
| <font style="color:rgb(51, 51, 51);">信息窃听</font> | <font style="color:rgb(51, 51, 51);">信息加密</font> | <font style="color:rgb(51, 51, 51);">对称加密 AES</font> |
| <font style="color:rgb(51, 51, 51);">密钥传递</font> | <font style="color:rgb(51, 51, 51);">密钥协商</font> | <font style="color:rgb(51, 51, 51);">非对称加密(RSA和ECC)</font> |
| <font style="color:rgb(51, 51, 51);">信息篡改</font> | <font style="color:rgb(51, 51, 51);">完整性校验</font> | <font style="color:rgb(51, 51, 51);">散列算法(MD5和SHA)</font> |
| <font style="color:rgb(51, 51, 51);">身份冒充</font> | <font style="color:rgb(51, 51, 51);">CA权威机构</font> | <font style="color:rgb(51, 51, 51);">散列算法(MD5和SHA)+RSA签名</font> |


# <font style="color:rgb(51, 51, 51);">加密算法</font>
## <font style="color:rgb(51, 51, 51);">对称加密 AES</font>
+ <font style="color:rgb(51, 51, 51);">加密和解密使用同一个密钥</font>

<!-- 这是一张图片，ocr 内容为：密钥 信息 信息 密文 HELLO 加密 解密 HELLO !@#$% 张三 李四 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814834073-b391508d-21f1-4a79-a07b-47edec679d48.png)

## <font style="color:rgb(51, 51, 51);">非对称加密</font>
<!-- 这是一张图片，ocr 内容为：服务器 客户端 请求服务器公钥 服务器公钥 客户端公钥 发送服务器公钥 客户端私钥 服务器私钥 消息使用服务器公钥加密发给服务器 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814833721-9e4b5bda-cd44-42c8-8861-0d6458580960.png)

## <font style="color:rgb(51, 51, 51);">哈希算法</font>
+ <font style="color:rgb(51, 51, 51);">哈希函数的作用是给一个任意长度的数据生成出一个固定长度的数据</font>
    - <font style="color:rgb(51, 51, 51);">安全性 可以从给定的数据X计算出哈希值Y，但不能从哈希值Y计算机数据X</font>
    - <font style="color:rgb(51, 51, 51);">独一无二 不同的数据一定会产出不同的哈希值</font>
    - <font style="color:rgb(51, 51, 51);">长度固定 不管输入多大的数据,输出长度都是固定的</font>

<!-- 这是一张图片，ocr 内容为：任意内容 HASH算法 无序字符串 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814834421-b091112f-0ddc-4273-b149-385befccdffd.png)

## <font style="color:rgb(51, 51, 51);">签名</font>
+ <font style="color:rgb(51, 51, 51);">数字签名的基本原理是用私钥去签名，而用公钥去验证签名</font>

<!-- 这是一张图片，ocr 内容为：签名 验签 签名 公钥 文件 文件 私钥 签名算法 验签算法 成功/失败 签名 珠峰架构 微信号:ZHUFENGJIAGOU -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814835036-8de3d213-4e1e-4abf-8aff-0340ee7498ea.png)

## <font style="color:rgb(51, 51, 51);">数字证书</font>
+ <font style="color:rgb(51, 51, 51);">数字证书是一个由可信的第三方发出的，用来证明所有人身份以及所有人拥有某个公钥的电子文件</font>

<!-- 这是一张图片，ocr 内容为：数字认证机构(CA) (2)CA用自己的私钥将服务器的公钥 (1)服务器把公钥注册到CA 进行数字签名证书并颁发数字证书 珠峰架构 服务器公钥 数字证书 CA数字签名 CA公钥已经事先置入到了 浏览器或操作系统中 3.服务器把证书发给客户端 服务器公钥 4.客户端拿到服务器的数字 证书后,使用CA公钥确认 服务器数字证书的真实性 服务器 服务器私钥 5.把数据用服务器公钥加密后发送 客户端 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814835293-afc00f04-0153-489f-b57f-33d2c2c11cf0.png)

## <font style="color:rgb(51, 51, 51);">密钥交换</font>
+ <font style="color:rgb(51, 51, 51);">Diffie-Hellman算法是一种密钥交换协议，它可以让双方在不泄漏密钥的情况下协商出一个密钥来</font>

<!-- 这是一张图片，ocr 内容为：通用颜色 通用颜色 私密色B 私密色A 混合色A 混合色B 混合色B 混合色A 密钥颜色 密钥颜色 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814835151-ae8b69d0-0871-4581-ad34-6dfb9beea524.png)

## <font style="color:rgb(51, 51, 51);">ECC</font>
+ <font style="color:rgb(51, 51, 51);">椭圆曲线加密算法(ECC) 是基于椭圆曲线数学的一种公钥加密的算法</font>

```javascript
let basic = 3;//共享basic
let a = 5;
let basicA = basic * a;//15
let b = 7;
let basicB = basic * b;//21

console.log(a * basicB);//105
console.log(b * basicA);//105
```

<!-- 这是一张图片，ocr 内容为：I(X) R P+Q -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814835714-cbdf43e0-dfe5-41b5-9664-60b6cfcbedeb.png)

# <font style="color:rgb(51, 51, 51);">加密过程</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">firefox: https://47.105.191.39</font>`<font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">ip.addr ==47.105.191.39 and tls</font>`

<!-- 这是一张图片，ocr 内容为：TLS(协议) ECDHE(图明交换协议) RSA(签名算法) WITH AES 256 CBC(对称加密算法) SHA(消息认证码) 春瑞 1.CLIENT HELLO CLIENT CLIENT 发送新机数 CLIENT RANDOM RANDOM RANDOM 客户端生产商机数 客户端生产随机数 2.SERVER HELLO SERVER SERVER 发送所机数 SERVER RANDOM RANDOM 服务出生产商机数 服务出生产许机数 校验证 CA公钥 3.CERTIFICATE,CERTIFICATE STATUS 服务器公钥 服务器公销 发送服务器证书 目 目 签名 签名 服务管证    服务器证券 服务留DH参数 服务裁DH参数 4.SERVER KEY EXCHANGE 把服务器QIDH参数签名后发送给客广端 DH参数签名 DH参数签名 服务器私机 5.SERVER HELLO DONE 6.CLIENTKEYEXCHANGE 把客广端DH参数发送始服务器 客户端DH参数 客户端DH参数 PRE-MANTER-KEY PRE-MASTER-KEY MASTER KEY MASTER-KEY 7.CHANGE CIPHER SPEC 8.ENCRVPTED HANDSHAKE MESSAGE 9.CHANGE CIPHER SPEC 10.ENCRYPTED HANDSHAKE MESSAQE 小 珠峰架构 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814836507-c9865695-f55f-4953-88e7-917faef5d2ad.png)

## <font style="color:rgb(51, 51, 51);">ClientHello</font>
+ <font style="color:rgb(51, 51, 51);">在一次新的握手流程中，客户端先发送ClientHello</font>
    - <font style="color:rgb(51, 51, 51);">Version 协议版本</font>
    - <font style="color:rgb(51, 51, 51);">Random 包含32个字节的随机数 28随机数字节+4字节时间戳,随机数是为了保证每一次连接者是独立无二的</font>
    - <font style="color:rgb(51, 51, 51);">Cipher Suites 客户端支持的所有密码套件</font>
    - <font style="color:rgb(51, 51, 51);">Extensions 扩展的额外数据</font>

<!-- 这是一张图片，ocr 内容为：ADDR  105.191.39 AND TLS IP. PROTOCOL INFO TIME NO DESTINATION LENGTH SOURCE PORT SOURCE 192.168.1... 47.105.191.39 571 58215 79 2.322171 TLSV1.2 CLIENT HELLO SERVER HELLO, CERTIFICATE, SERVER KEY EXCHANGE, SERVER HELLO DONE 47.105.191... 192.168.1.101 TLSV1.2 1387 443 81  2.346293 CLIENT KEY EXCHANGE, CHANGE CIPHER SPEC, ENCRYPTED HANDSHAKE MESSAGE 147 58215 192.168.1.... 47.105.191.39 TLSV1.2 82  2.347692 192.168.1.... 47.105.191.39 547 58215 TLSV1.2 83 2.351825 APPLICATION DATA 47.105.191... 192.168.101 TLSV1.2 296 443 NEW SESSION TICKET, CHANGE CIPHER SPEC, ENCRYPTED HANDSHAKE MESSAGE 84  2.367495 TLSV1.2 263443 47.105.191... 192.168.101 86 2.370701 APPLICATION DATA CONTENT TYPE: HANDSHAKE (22) VERSION:TLS 1.0 (0X0301) LENGTH: 512 HANDSHAKE PROTOCOL: CLIENT HELLO HANDSHAKE TYPE: CLIENT HELLO (1) LENGTH:508 VERSION:TLS 1.2 (0X0303) RANDOM: 52F267D9AB2CACC5D43F36887B49D51452A8550DBF597F78... SESSION ID LENGTH: 32 SESSION ID: AC9E05DE89656126FA396FF772BB90A4F69EF300BF18970F... CIPHER SUITES LENGTH: 36 CIPHER SUITES (18 SUITES) CIPHER SUITE: TLS AES 128 GCM SHA256 (0X1301) CIPHER SUITE: TLS CHACHA20 POLY1305 SHA256 (0X1303) CIPHER SUITE: TLS AES 256 GCM SHA384 (0X1302) CIPHER SUITE: TLS ECDHE ECDSA WITH AES 128 GCM SHA256 (0XC02B) CIPHER SUITE: TLS ECDHE RSA WITH AES 128 GCM SHA256 (0XC02F) CIPHER SUITE: TLS ECDHE ECDSA WITH CHACHA20 P0LY1305 SHA256 (0XCCA9) CIPHER SUITE: TLS ECDHE RSA WITH CHACHA20 P0LY1305 SHA256 (EXCCA8) CIPHER SUITE: TLS ECDHE ECDSA WITH AES 256 GCM SHA384 (0XC02C) CIPHER SUITE: TLS ECDHE RSA WITH AES 256 GCM SHA384 (0XC030) CIPHER SUITE: TLS ECDHE ECDSA WITH AES 256 CBC SHA (0XC00A) -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814836511-cd43251b-650c-4f2a-80fa-81ba846e0d8a.png)

## <font style="color:rgb(51, 51, 51);">ServerHello</font>
+ <font style="color:rgb(51, 51, 51);">将服务器选择的连接参数发回给客户端，消息结构和ClientHello类似 ，每个字段只包含一个选项</font>

<!-- 这是一张图片，ocr 内容为：47.105.191.39 AND TLS IP.ADDR SOURCE PORT INFO PROTOCOL LENGTH NO DESTINATION TIME SOURCE TLSV1.2 571 58215 79 2.322171 CLIENT HELLO 192.168.1.... 47.105.191.39 47.105.191... 192.168.1.101 TLSV1.2 1387 443 81 2.346293 SERVER HELLO, CERTIFICATE, SERVER KEY EXCHANGE, SERVER HELLO DONE 192.168.1.... 47.105.191.39 CLIENT KEY EXCHANGE, CHANGE CIPHER SPEC, ENCRYPTED HANDSHAKE MESSAGE TLSV1.2 147 58215 82  2.347692 192.168.1.... 47.105.191.39 547 58215 83 2.351825 TLSV1.2 APPLICATION DATA NEW SESSION TICKET, CHANGE CIPHER SPEC,ENCRYPTED HANDSHAKE MESSAGE 47.105.191... 192.168.101 TLSV1.2 296 443 84 2.367495 47.105.191.. 192.168.1.101 86 2.370701 263443 TLSV1.2 APPLICATION N DATA \DEVICE\NPF [E80E4BEF-AD4D-4F3B-BF77-C989A1C6EC4D}, ID 0 FRANE 81: 1387 BYTES ON WINE (11096 BITS), 1387 BYTES CAPTURED (11096 BITS) ON INTERFACE ) ETHERNET II, SRC: TP-LINKT 8C:FA:6D (24:69:68:8C:FA:6D), DST: INTEICOR 98:FZ:EC EC(14:4F:8A:98:F INTERNET PROTOCOL VERSION 4, SRC: 47.105.191.39, DST: 192.168.1.101 TRANSMISSION CONTROL PROTOCOL, SNC PORT: 443, DST PORT: 58215, SEQ: 1, ACK: 518, LEN: 1333 TRANSPORT LAYER SECURITY TLSV1.2 RECORD LAYER: HANDSHAKE PROTOCOL:SERVER HELLO TLSV1.2 RECORD LAYER: HANDSHAKE PROTOCOL:CERTIFICATE TLSV1.2 RECORD LAYER:HANDSHAKE PROTOCOL:|SERVER KEY EXCHANGE Y T TLSV1.2 RECORD LAYER:HANDSHAKE PROTOCOL: SERVER HELLO DONE -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814837482-19aad16f-069a-43e2-ab7d-f501e8910da9.png)

<!-- 这是一张图片，ocr 内容为：TLSV1.2 RECORD LAYER: HANDSHAKE PROTOCOL: SERVER HELLO CONTENT TYPE: HANDSHAKE(22) VERSION:TLS 1.2 (0X0303) LENGTH:80 PROTOCOL: SERVER HELLO HANDSHAKE TYPE: SERVER HELLO (2) HANDSHAKE LENGTH:76 (0X0303) VERSION:TLS 1.2 RANDOM: CC7BLA4E45B47E0CCA6D0AE7D06625777EFC4A6BA61CAF0C... SESSION ID LENGTH:O ICIPHER SUITE: TLS ECDHE RSA WITH AES 256 GCM SHA384 (0XC030) COMPRESSION METHOD:NULL (0) EXTENSIONS LENGTH:36 EXTENSION: RENEGOTIATION_INFO (LEN-1) EXTENSION:EC POINT FORMATS (LEN-4) EXTENSION: SESSION TICKET (LEN-0) EXTENSION:EXTENDED MASTER SECRET (LEN-0) PROTOCOL_NEGOTIATION (LEN-11) EXTENSION: APPLICATION ON LAYER -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814837810-477267c3-51f9-443a-92de-dac0a3bcdecd.png)

## <font style="color:rgb(51, 51, 51);">Certificate</font>
+ <font style="color:rgb(51, 51, 51);">Certificate消息发送X.509证书</font>

<!-- 这是一张图片，ocr 内容为：TRANSPORT LAYER SECURITY TLSV1.2 RECORD LAYER: HANDSHAKE PROTOCOL: SERVER HELLO TLSV1.2 RECORD LAYER:HANDSHAKE PROTOCOL: CERTIFICATE CONTENT TYPE:HANDSHAKE (22) VERSION: TLS 1.2 (0X0303) LENGTH: 929 HANDSHAKE PROTOCOL:CERTIFICATE HANDSHAKE TYPE: CERTIFICATE (11) LENGTH:925 CERTIFICATES LENGTH: 922 CERTIFICATES (922 BYTES) CERTIFICATE LENGTH: 919 SIGNEDCERTIFICATE ALGORITHMIDENTIFIER(SHA256WITHRSAENCRYPTION) PADDING:0 : 1B2C79AAA91CBF0D8018BDA03A8E56A8DCBE2CDC4830FE8F... ENCRYPTED:1B2 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814837690-9e68af3a-0b2a-4491-8ba1-6773d8317453.png)

## <font style="color:rgb(51, 51, 51);">ServerKeyExchange</font>
+ <font style="color:rgb(51, 51, 51);">ServerKeyExchange的目的在于发送交换密钥的参数</font>

<!-- 这是一张图片，ocr 内容为：TLSV1.2 RECORD LAYER: HANDSHAKE PROTOCOL: EXCHANGE KEY SERVER TYPE: HANDSHAKE (22) CONTENT VERSION: TLS 1.2 (0X0303) LENGTH:300 HANDSHAKE PROTOCOL: SERVER KEY EXCHANGE E TYPE: SERVER KEY EXCHANGE (12) HANDSHAKE TY LENGTH:296 EC DIFFIE-HELLMAN SERVER PARAMS CURVE TYPE:NAMED CURVE(0X03) NAMED CURVE:X25519(0X001D) PUBKEY LENGTH: 32 PUBKEY: 7FD9A391AD0F74DE9A5FE58353BCC41DE53149CA22C8ECED.. SIGNATURE ALGORITHM: RSA PKCS1 SHA512 (0X0601) SIGNATURE LENGTH: 256 SIGNATURE: B3657E078763C4E9743EDEFD5660F5C0FE4A6936676F7F37... -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814838915-ccc0380d-7d80-4d91-8f6c-bcf08ab3130b.png)

## <font style="color:rgb(51, 51, 51);">Server Hello Done</font>
+ <font style="color:rgb(51, 51, 51);">ClientKeyExchange消息携带客户端为密钥交换的所有信息</font>

<!-- 这是一张图片，ocr 内容为：TLSV1.2 RECORD LAYER: HANDSHAKE PROTOCOL: SERVER HELLO DONE CONTENT TYPE: HANDSHAKE (22) VERSION: TLS 1.2 (0X0303) LENGTH:4 HANDSHAKE PROTOCOL: SERVER HELLO DONE HANDSHAKE TYPE: SERVER HELLO DONE (14) LENGTH: -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814838888-6c508175-0794-4687-8b4e-1ea1a07609c6.png)

## <font style="color:rgb(51, 51, 51);">ClientKeyExchange</font>
+ <font style="color:rgb(51, 51, 51);">ClientKeyExchange消息携带客户端为密钥交换的所有信息</font>

<!-- 这是一张图片，ocr 内容为：TLSV1.2 RECORD LAYER: HANDSHAKE PROTOCOL: CLIENT KEY EXCHANGE] CONTENT TYPE: HANDSHAKE (22) VERSION: TLS 1.2 (0X0303) LENGTH:37 HANDSHAKE PROTOCOL: CLIENT KEY EXCHANGE HANDSHAKE TYPE: CLIENT KEY EXCHANGE (16) LENGTH:33 EC DIFFIE-HELLMAN CLIENT PARAMS PUBKEY LENGTH:32 PUBKEY: 520F4C22A8ADB64764EE7E73049985BAFB0D9205BAB00323... -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814838897-0ccc22af-2503-4d24-8672-e81eca954494.png)

## <font style="color:rgb(51, 51, 51);">ChangeCipherSpec</font>
+ <font style="color:rgb(51, 51, 51);">ChangeCipherSpec表示客户端已经得到了连接参数的足够信息，已生成加密密钥，并切换到了加密模式</font>

<!-- 这是一张图片，ocr 内容为：CHANGE CIPHER S TLSV1.2 LAYER: R SPEC PROTOCOL: CHANGE CIPHER SPEC RECORD CONTENT TYPE: CHANGE CIPHER S R SPEC (20) (0X0303) VERSION: TLS 1.2 LENGTH:1 CHANGE CIPHER SPEC MESSAGE -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814839056-635a8a81-5f67-4762-acce-18ffc0fdef18.png)

## <font style="color:rgb(51, 51, 51);">EncryptedHandshakeMessage</font>
+ <font style="color:rgb(51, 51, 51);">这个报文的目的就是告诉对端自己在整个握手过程中收到了什么数据，发送了什么数据,来保证中间没人篡改报文</font>
+ <font style="color:rgb(51, 51, 51);">其次这个报文作用就是确认秘钥的正确性。因为</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Encrypted handshake message</font>`<font style="color:rgb(51, 51, 51);">是使用对称秘钥进行加密的第一个报文，如果这个报文加解密校验成功，那么就说明对称秘钥是正确的</font>
+ <font style="color:rgb(51, 51, 51);">计算方法就将之前所有的握手数据(包括接受和发送)计算哈希运算,然后就是使用协商好的对称密钥进行加密</font>

```plain
加密(SHA(客户端随机数+服务器随机数))
```

<!-- 这是一张图片，ocr 内容为：RECORD LAYER: HANDSHAKE PROTOCOL:ENCRYPTED HANDSHAKE MESSAGE TLSV1.2 (22) CONTENT TYPE : HANDSHAKE ( VERSION: TLS 1.2 (0X0303) LENGTH:40 HANDSHAKE PROTOCOL: ENCRYPTED HANDSHAKE MESSAGE -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814840240-d706da91-ff0b-4c9c-938c-4da576d328f1.png)

## <font style="color:rgb(51, 51, 51);">New Session Ticket</font>
+ <font style="color:rgb(51, 51, 51);">SSL 中的 session 会跟 HTTP 的 session 类似,都是用来保存客户端和服务端之间交互的一些记录</font>
+ <font style="color:rgb(51, 51, 51);">如果服务端允许使用 Session ID,客户端的 Client Hello 带上 Session ID，服务端复用 Session ID 后，会直接略过协商加密密钥的过程，直接发出一个 Change Cipher Spec 报文,然后就是加密的握手信息报文</font>
+ <font style="color:rgb(51, 51, 51);">在服务器发送New Session Ticket消息</font>
    - <font style="color:rgb(51, 51, 51);">Type 类型</font>
    - <font style="color:rgb(51, 51, 51);">Version 版本</font>
    - <font style="color:rgb(51, 51, 51);">Length长度</font>
    - <font style="color:rgb(51, 51, 51);">Session Ticket Lifetime Hint 表示Ticket的剩余有效时间</font>
    - <font style="color:rgb(51, 51, 51);">Session Ticket 会话标识</font>

<!-- 这是一张图片，ocr 内容为：TLSV1.2 RECORD LAYER: HANDSHAKE PROTOCOL: NEW SESSION TICKET CONTENT TYPE: HANDSHAKE (22) VERSION: TLS 1.2 (0X0303) LENGTH:186 HANDSHAKE PROTOCOL: NEW SESSION TICKET HANDSHAKE TYPE: NEW SESSION TICKET (4) LENGTH: 182 TLS SESSION TICKET SESSION TICKET LIFETIME HINT: 300 SECONDS (5 MINUTES) SESSION TICKET LENGTH: 176 SESSION TICKET: 30EC3AD05F94CD2AB0C2BF3FEF6D90C6524702C04E6E3B69... -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814840052-d1cc8889-4913-443c-a67b-d6c4d4e18244.png)

<!-- 这是一张图片，ocr 内容为：192.168.1.... 47.105.191.39 571 58879 TLSV1.2 33... 3145.812... CLIENT HELLO 33...3145.833... 47.105.192.192.1.1.101 SERVER HELLO, CHANGE CIPHER SPEC,ENCRYPTED HANDSHAKE MESSAGE TLSV1.2 210 443 33.. 3145.833... 192.1.... 47.105.191.39 TLSV1.2 105 58879 CHANGE CIPHER SPEC,ENCRYPTED HANDSHAKE MESSAGE INTERNET PROTOCOL VERSION 4, SRC: 192.168.1.101, DST: 47.105.191.39 TRANSMISSION CONTROL PROTOCOL, SRC PORT; 58879, 0ST PORT: 443, SEQ: 1, ACK: 1, LEN: 517 TRANSPORT LAYER SECURITY TLSV1.2 RECORD LAYER: HANDSHAKE PROTOCOL: CLIENT HELLO CONTENT TYPE: HANDSHAKE (22) VERSION:TLS 1.0(0X0301) LENGTH: 512 HANDSHAKE PROTOCOL:CLIENT HELLO HANDSHAKE TYPE: CLIENT HELLO (1) LENGTH:508 VERSION: TLS 1.2 (0X0303) RANDOM: 190E49BFA26BB2DA6BB5E024CFFFF0AB1B6A10796D26C8014... SESSION ID LENGTH: 32 SESSION ID: 1BE49F19912130F6663C850DA2FCB9D5A5F05620DB98D963.. -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1764814840149-c3c7289c-1ae3-4d6b-9916-efd981852e14.png)

# <font style="color:rgb(51, 51, 51);">openssl</font>
+ <font style="color:rgb(51, 51, 51);">linux中的openssl 是SSL/TLS协议和多种加密算法的开源实现</font>
+ <font style="color:rgb(51, 51, 51);">openssl包括libcrypto实现算法、libssl 实现TLS/SSL协议,libssl是基于会话的，实现了身份认证 ,数据加密, 会话完整性的一个TLS/SSL的库。</font>

## <font style="color:rgb(51, 51, 51);">查看版本</font>
```shell
openssl version -a
```

## <font style="color:rgb(51, 51, 51);">摘要算法</font>
```shell
openssl dgst -help
```

+ <font style="color:rgb(51, 51, 51);">file... files to digest (default is stdin) 生成摘要的文件</font>
+ <font style="color:rgb(51, 51, 51);">-out outfile Output to filename rather than stdout 输出文件</font>
+ <font style="color:rgb(51, 51, 51);">-sign val Sign digest using private key 使用私钥签名</font>
+ <font style="color:rgb(51, 51, 51);">-verify val Verify a signature using public key 使用公钥验证签名</font>
+ <font style="color:rgb(51, 51, 51);">-signature infile File with signature to verify 验证的签名的文件</font>
+ <font style="color:rgb(51, 51, 51);">-hex Print as hex dump 以16进制打印</font>
+ <font style="color:rgb(51, 51, 51);">-hmac val Create hashed MAC with key 创建hashed过的消息摘要</font>

```shell
echo 123 > msg.txt
openssl dgst -md5  msg.txt
openssl dgst -sha1  msg.txt
openssl dgst -sha256  msg.txt
```

## <font style="color:rgb(51, 51, 51);">对称加密</font>
```shell
openssl enc -help
```

+ <font style="color:rgb(51, 51, 51);">-in infile Input file 输入要加密的文件</font>
+ <font style="color:rgb(51, 51, 51);">-out outfile Output file 输出加密后的文件</font>
+ <font style="color:rgb(51, 51, 51);">-e Encrypt 加密</font>
+ <font style="color:rgb(51, 51, 51);">-d Decrypt 解密</font>
+ <font style="color:rgb(51, 51, 51);">-a Base64 encode/decode, depending on encryption flag Base64编码和解码</font>
+ <font style="color:rgb(51, 51, 51);">-pass val Passphrase source 指定密码</font>
+ <font style="color:rgb(51, 51, 51);">-k val Passphrase 指定密码</font>

```shell
openssl  enc -e -aes128 -a -k 123456789  -in msg.txt  -out enc_msg.txt
openssl  enc -d -aes128 -a -k 123456789  -in enc_msg.txt  -out dec_msg.txt

openssl  enc -e -aes128 -a -pass pass:123456  -in msg.txt  -out enc_msg.txt -P
openssl  enc -d -aes128 -a -pass pass:123456  -in enc_msg.txt  -out dec_msg.txt
```

## <font style="color:rgb(51, 51, 51);">RSA非对称加密</font>
### <font style="color:rgb(51, 51, 51);">RSA</font>
#### <font style="color:rgb(51, 51, 51);">RSA生成公私钥</font>
```shell
openssl genrsa -help
```

+ <font style="color:rgb(51, 51, 51);">-aes256 是使用aes256算法加密这个私钥</font>
+ <font style="color:rgb(51, 51, 51);">-passout 指定加密的密钥</font>
+ <font style="color:rgb(51, 51, 51);">-out output the key to file 指明输出文件</font>
+ <font style="color:rgb(51, 51, 51);">-in 指定输入文件</font>
+ <font style="color:rgb(51, 51, 51);">-pubout 输出公钥信息； 根据私钥的信息得出公钥</font>

```shell
//生成加密的私钥
openssl genrsa -aes256 -passout pass:123456 -out private.key 2048
//生成不加密的私钥
openssl genrsa  -out private.key 1024
//生成公钥
openssl rsa -pubout -in private.key  -out  public.key
```

#### <font style="color:rgb(51, 51, 51);">RSA加解密</font>
```shell
openssl rsautl -help
```

+ <font style="color:rgb(51, 51, 51);">-in infile Input file 输入文件（待加密或待解密的文件）</font>
+ <font style="color:rgb(51, 51, 51);">-out outfile Output file 输出文件 加密解密后的文件</font>
+ <font style="color:rgb(51, 51, 51);">-inkey val Input key 输入加密的公钥</font>
+ <font style="color:rgb(51, 51, 51);">-encrypt Encrypt with public key 使用公钥加密</font>
+ <font style="color:rgb(51, 51, 51);">-decrypt Decrypt with private key 使用私钥解密</font>
+ <font style="color:rgb(51, 51, 51);">-pubin Input is an RSA public 表明输入的是公钥(默认是私钥)</font>
+ <font style="color:rgb(51, 51, 51);">-sign Sign with private key 表明使用私钥签名</font>
+ <font style="color:rgb(51, 51, 51);">-verify Verify with public key 表明使用公钥验证签名</font>
+ <font style="color:rgb(51, 51, 51);">-hexdump Hex dump output 以十六进制形式输出</font>

```shell
//公钥加密
openssl rsautl -encrypt -inkey public.key  -pubin  -in msg.txt  -out enc.msg.txt 
//私钥解密
openssl rsautl -decrypt -inkey private.key -in enc.msg.txt   -out  dec.msg.txt
```

#### <font style="color:rgb(51, 51, 51);">数字签名</font>
```shell
//摘要后使用RSA私钥签名，摘要算法sha256
openssl dgst -sign private.key -sha256 -out  sign.msg.txt  msg.txt
//使用RSA公钥验证签名
openssl dgst -verify  public.key -sha256 -signature sign.msg.txt  msg.txt
```

### <font style="color:rgb(51, 51, 51);">ECDSA</font>
#### <font style="color:rgb(51, 51, 51);">生成公私钥</font>
```shell
//生成ecdsa私钥
openssl ecparam -genkey  -name secp256k1 -out ec.private.key
//提取 ecdsa 公钥
openssl ec -in ec.private.key -pubout -out ec.public.key
```

#### <font style="color:rgb(51, 51, 51);">数字签名</font>
```shell
//使用ECDSA私钥进行签名 (sha256) 
openssl  dgst -sign ec.private.key  -sha256 -out sign.msg  msg.txt
//使用ECDSA公钥进行签名验证
openssl dgst -verify ec.public.key -sha256 -signature sign.msg  msg.txt
```

# <font style="color:rgb(51, 51, 51);">证书体系（PKI）</font>
+ <font style="color:rgb(51, 51, 51);">为了检查公钥不是服务器就需要引入权威第三方</font>
+ <font style="color:rgb(51, 51, 51);">数字证书就是权威第三方发布的并包括</font>
    - <font style="color:rgb(51, 51, 51);">Issuer (证书的发布机构)：哪个权威第三方发布的证书</font>
    - <font style="color:rgb(51, 51, 51);">Valid from,Valid to(证书的有效期) 过了有效期限，证书就会作废</font>
    - <font style="color:rgb(51, 51, 51);">Public key(公钥) 权威第三方给申请者配发的公钥</font>
    - <font style="color:rgb(51, 51, 51);">Subject(主题): 证书所有者,一般是公司名称、机构名称、公司网站的网址等</font>
    - <font style="color:rgb(51, 51, 51);">Signature algorithm(签名所使用的算法): 使用哪个算法加密了指纹，指纹的加密结果就是数字签名</font>
    - <font style="color:rgb(51, 51, 51);">Thumbprint, Thumbprint algorithm (指纹以及指纹算法) 这是个加密后的结果，是用来确保证书完整性的，保证证书不被篡改</font>

## <font style="color:rgb(51, 51, 51);">生成自签的根证书</font>
+ <font style="color:rgb(51, 51, 51);">-new 新的签名请求</font>
+ <font style="color:rgb(51, 51, 51);">-x509 输出x509格式的证书</font>
+ <font style="color:rgb(51, 51, 51);">-key 私钥</font>
+ <font style="color:rgb(51, 51, 51);">-out 输出文件</font>
+ <font style="color:rgb(51, 51, 51);">-days 证书有效期天数</font>
+ <font style="color:rgb(51, 51, 51);">-subject 请求主体</font>

```shell
//1.生成CA私钥
openssl genrsa -out ca.private.key  2048
//2.根据CA私钥生成根证书
openssl req -new -x509 -key ca.private.key  -out ca.crt  -days 365  -subj /C=CN/ST=BeiJing/L=BeiJing/O=ca/OU=ca/CN=www.ca.com/emailAddress=ca@qq.com
```

## <font style="color:rgb(51, 51, 51);">服务器证书申请</font>
```shell
//1.生成服务器私钥
openssl genrsa -out server.private.key 2048
//2.创建证书签名申请CSR(certificate signing request)并且发送给CA
openssl req -new -key server.private.key -out server.csr -subj  /C=CN/ST=BeiJing/L=BeiJing/O=47.105.67.214/OU=47.105.67.214/CN=47.105.67.214/emailAddress=47.105.67.214@qq.com
//3.签发证书
openssl x509 -req -days 365  -CA ca.crt -CAkey ca.private.key -CAcreateserial  -in  server.csr  -out server.crt
```

# <font style="color:rgb(51, 51, 51);">nginx</font>
## <font style="color:rgb(51, 51, 51);">安装</font>
```shell
yum -y install gcc gcc-c++ pcre-devel zlib-devel

wget https://nginx.org/download/nginx-1.12.2.tar.gz
wget https://www.openssl.org/source/openssl-1.1.0h.tar.gz
tar zxf nginx-1.12.2.tar.gz
tar zxf openssl-1.1.0h
cd nginx-1.12.2

groupadd nginx
// -M 不要自动建立用户的登入目录 -s 不能登录的shell
useradd nginx  -M -s /sbin/nologin -g nginx

mkdir -p /usr/nginx
mkdir -p /usr/nginx/logs  
mkdir -p /usr/nginx/cache

./configure  --prefix=/usr/nginx   --with-http_ssl_module --with-openssl=/root/openssl-1.1.0h        --with-http_ssl_module --user=nginx --group=nginx

make 
make install

export PATH=/usr/nginx/sbin:$PATH
nginx -t
nginx -V
nginx
netstat -ntlp
```

## <font style="color:rgb(51, 51, 51);">布署证书</font>
+ <font style="color:rgb(51, 51, 51);">配置文件</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">/usr/nginx</font>`
+ <font style="color:rgb(51, 51, 51);">重启</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">nginx -s reload</font>`

```diff
server {
    listen       443 ssl;
    server_name  localhost;

+   ssl_certificate      /root/server.crt;
+   ssl_certificate_key  /root/server.private.key;

    ssl_session_cache    shared:SSL:1m;
    ssl_session_timeout  5m;

    ssl_ciphers  HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers  on;

    location / {
        root   html;
        index  index.html index.htm;
    }
}
```

# <font style="color:rgb(51, 51, 51);">tls安全</font>
## <font style="color:rgb(51, 51, 51);">证书吊销</font>
+ <font style="color:rgb(51, 51, 51);">证书吊销列表分发点 (CRL Distribution Point ，简称 CDP) 是含在数字证书中的一个可以共各种应用软件自动下载的最新的 CRL 的位置信息,一般 CA 每隔一定时间 ( 几天或几个月 ) 才发布新的吊销列表</font>
+ <font style="color:rgb(51, 51, 51);">OCSP(Online Certificate Status Protocol)证书状态在线查询协议，是IETF颁布的用于实时查询数字证书在某一时间是否有效的标准。</font>

## <font style="color:rgb(51, 51, 51);">证书链</font>
+ <font style="color:rgb(51, 51, 51);">一个证书链就是能溯源到一个可信根证书的有序证书列表</font>
+ <font style="color:rgb(51, 51, 51);">使用证书链的原因</font>
    - <font style="color:rgb(51, 51, 51);">保证根证书安全</font>
    - <font style="color:rgb(51, 51, 51);">交叉证书 用已有的根证书签署新的根证书</font>
    - <font style="color:rgb(51, 51, 51);">划分二级CA</font>
    - <font style="color:rgb(51, 51, 51);">委派 签发给一个组织或者公司一个二级CA，但限制用于签署其自用的证书，只能签署他们自己所拥有的域名的证书。</font>

## <font style="color:rgb(51, 51, 51);">多域名证书与泛域名证书</font>
+ <font style="color:rgb(51, 51, 51);">建议给每个域名一个单独的证书</font>
+ _<font style="color:rgb(51, 51, 51);">.xxxx.com或</font>__<font style="color:rgb(51, 51, 51);"> </font>_<font style="color:rgb(51, 51, 51);">.xxxx.org 就是泛域名</font>

## <font style="color:rgb(51, 51, 51);">安全的优化</font>
+ <font style="color:rgb(51, 51, 51);">使用服务器优先的更安全的密码套件</font>
+ <font style="color:rgb(51, 51, 51);">密钥算法与加密强度</font>
+ <font style="color:rgb(51, 51, 51);">注意保护私钥，定期更换</font>
+ <font style="color:rgb(51, 51, 51);">选择可靠的CA权威机构</font>
+ <font style="color:rgb(51, 51, 51);">前向安全保密</font>

# <font style="color:rgb(51, 51, 51);">让你的网站支持https</font>
+ [<font style="color:rgb(51, 122, 183);">实战申请Let's Encrypt永久免费SSL证书过程教程及常见问题</font>](http://www.laozuo.org/7676.html)

```shell
git clone https://github.com/letsencrypt/letsencrypt
cd letsencrypt
chmod 777 ./letsencrypt-auto
./letsencrypt-auto certonly --standalone --email zhang_renyang@126.com -d itnewhand.com

/etc/letsencrypt/live/itnewhand.com/fullchain.pem
/etc/letsencrypt/live/itnewhand.com/privkey.pem
```

> <font style="color:rgb(119, 119, 119);">生成证书时要先停掉nginx</font>
>

