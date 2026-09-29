# HTTPS简介
## SSL和TLS
+ 传输层安全协议(Transport Layer Security，TLS)，及其前身安全套接层(Secure Sockets Layer，SSL)是一种安全协议，目的是为互联网通信，提供安全及数据完整性保障

<!-- 这是一张图片，ocr 内容为：TLS/SSL HTTPS HTTP HTTP 信息窃听 信息加密 TLS/SSL 信息篡改 完整性校验 信息劫持 身份验证 TCP 层次 风险 优势 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1752305809120-d6f48d94-9268-4e75-a235-caca42e16d8a.png)

## HTTPS
+ HTTPS协议的主要功能基本都依赖于TLS/SSL协议，TLS/SSL的功能实现主要依赖于三类基本算法
    - 散列函数：散列函数验证信息的完整性
    - 对称加密：对称加密算法采用协商的密钥对数据加密
    - 非对称加密：非对称加密实现身份认证和密钥协商

<!-- 这是一张图片，ocr 内容为：1 RSAECCDAH I MD5SHA AESDESRC4 I 一 散列算法 非对称加密 对称加密 TLS/SSL 函数不可逆 1v1 1vN 对输入敏感 服务器和客户端共享 客户端共享公钥 输出长度固定 服务器掌握私钥 相同密钥 客户端信息只能 不同客户端密钥不同 服务器维护多个密钥! 服务器解密 客户端向服务器 密钥协商是安全基! 发送唯一信息 身份验证 加密 对称密销 完整校验 信息加密 密钥协商 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1638196530173-0423e248-b09a-4b4f-ae36-a47e0d1f642b.png)

# 加密
+ 加密就是研究如果安全通信的
+ 保证数据在传输过程中不会被窃听
+ [Crypto | Node.js v13.14.0 Documentation](https://nodejs.org/dist/latest-v13.x/docs/api/crypto.html)

## 对称加密
### 描述
+ 对称加密事最快速、最简单的一种加密方式，加密(encryption)与解密(decryption)用的都是同样的密钥(secret key)
+ 主流的有 AES 和 DES

### 简单实现
+ 消息 abc
+ 密钥 3
+ 密文 def

<!-- 这是一张图片，ocr 内容为：古罗马皇帝凯撒在打仗时曾经使用过以下方法加密军 事情报: Caesarcipher(key"3) DEF XIYIZAB EFG CD AB -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1638198234954-9d79ced0-cfe5-4e52-b75f-0d839a36d783.png)

```javascript
const secretKey = 3;
const encrypt = (str) => {
  const buffer = Buffer.from(str);
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = buffer[i] + secretKey;
  }
  return buffer.toString();
}

const decrypt = (str) => {
  const buffer = Buffer.from(str);
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = buffer[i] - secretKey;
  }
  return buffer.toString();
}

const message = 'abc';
const secret = encrypt(message);
console.log(secret); // def
const value = decrypt(secret);
console.log(value); // abc
```

### AES
+ `crypto.createCipheriv(algorithm, key, iv[, options])`
    - algorithm：用于指定加密算法，如 aes-128-ecb、aes-128-cbc等
    - key：用于加密的密钥
    - iv：用于指定加密时所用的向量
+ 如果加密算法是128，则对应的密钥是16位，加密算法是256，则对应的密钥是32位

<!-- 这是一张图片，ocr 内容为：密钥 信息 信息 密文 !@#S% 解密 hello 加密 hello 李四 张三 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1638198675504-f4ace31b-4e55-4b2c-9134-e2a69c8a350c.png)

```javascript
const crypto = require('crypto');

const algorithm = 'aes-128-cbc';
const encrypt = (data, key, iv) => {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  cipher.update(data); // hex,16进制的意思，把结果输出成16进制字符串
  return cipher.final('hex');
}

const decrypt = (data, key, iv) => {
  const cipher = crypto.createDecipheriv(algorithm, key, iv);
  cipher.update(data, 'hex'); // hex,16进制的意思，把结果输出成16进制字符串
  return cipher.final('utf8'); // 输出成utf-8字符串
}

const key = '1234567890123456';
const iv = '1234567890123456';
const data = 'welcome 世界';
const encryptedData = encrypt(data, key, iv);
console.log(encryptedData); // 86d6a28536e829442eccbc0f791a892f
const decryptedData = decrypt(encryptedData, key, iv);
console.log(decryptedData);// welcome 世界
```

## 非对称加密
+ 互联网上没有办法安全的交换密钥
+ <font style="color:#E8323C;">私钥加密，公钥解密用来加密数据</font>
+ <font style="color:#E8323C;">公钥加密，私钥解密用来数字签名</font>

### 单向函数
+ 单向函数顺向计算起来非常容易，但是逆向却非常困难，也就是说，已知x，我们很容易计算出f(x)，但是已知f(x)，却很难计算出x
+ 整数分解又称<font style="color:#E8323C;">素因数分解，</font>是将一个正整数写成几个约数的乘积
+ 给出 45  这个数，他可以分解成 9*5 ，这样的分解结果应该是独一无二的

### RSA加密算法
<!-- 这是一张图片，ocr 内容为：公钥(E,N)加密 私钥(D,N)解密 C D%N M%N; C 57%33-14 14 %335 公开ENC,解密需要D-E*D%FN (P-1)*(Q-1) 珠峰架构 NP*Q 微信号:ZHUFENGJIAGOU 1024位二进制数质因数 分解数学上无解 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1752305899785-177b24e1-184f-491b-9e90-5adf858449af.png)

```javascript
/**
 * 现在实现一个RSA非对称加密算法
 * 加密用的密钥和解密用的密钥不一样
 * 但是它们有关系，你不能通过公钥算出密钥
 * 两个质数相乘得到一个结果，正向乘很容易，但是给你一个乘积，你不知道它们是由哪个数乘出来的
 * p*q=k
 */
const p = 3;
const q = 11;
const N = p * q; // 33
const fN = (p - 1) * (q - 1); // 欧拉函数
const e = 7; // 随意挑选一个指数e
// {e，N} {7, 33}就成为我们的公钥，公钥可以发给任何人，是公开的
// 公钥和密钥，是一对，公钥加密数据要用密钥解密，密钥加密数据要用公钥解密
// 我们可以从公钥去推算私钥，但是前提是你知道fN
for (var d  = 1; e * d % fN !== 1; d ++) {
  // console.log(d);
  // d++;
}
console.log(d); // 3

const publicKey = {e, N}
const privateKey = {d, N}

const encrypt = (data) => {
  return Math.pow(data, publicKey.e) % publicKey.N;
}

const decrypt = (data) => {
  return Math.pow(data, privateKey.d) % privateKey.N;
}

const data = 5;
const secret = encrypt(data);
console.log(secret); // 14
const original = decrypt(secret);
console.log(original); // 5

// 1024 位二进制数分解
/** 
 * 公开 N e
 * 私密 d
 * e * d % fN == 1
 * (p - 1) * (q - 1)
 * N = p * q
 */
```

### RSA加密
```javascript
const { generateKeyPairSync, privateEncrypt, publicDecrypt } = require('crypto');

const passphrase = 'server_passphrase';
const rsa = generateKeyPairSync('rsa', {
  modulusLength: 1024,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',
    passphrase
  }
});

const message = 'welcome 世界';
const enc_by_prv = privateEncrypt({
  key: rsa.privateKey, passphrase
}, Buffer.from(message, 'utf8'));
console.log(enc_by_prv.toString('hex'), enc_by_prv.toString('hex').length);
// 1077bb8bda3e1152f563a6d478d737421d4b7b72997b9a45df618bc39f005105fd47db9d148914bcec4b3b4e6d7e60d7a1b7cb6fa69d61cee49a78ba37fcf95c7ade2bd6d2fa2e94a21a6e99399bed72df34fb95da3723dc65d6a9dc9a6cd7fbdedc5acde53ecae68047b2c6a81edebd15ef025ce1c6a7d44cce36d90dab3937
// 256

const dec_by_pub = publicDecrypt(rsa.publicKey, enc_by_prv);
console.log(dec_by_pub.toString('utf8')); // welcome 世界

```

## 哈希
### 哈希函数
+ 哈希函数的作用是给一个任意长度的数据生成出一个固定长度的数据
+ 安全性，可以从给定的数据X计算出哈希值Y，但是不能从哈希值Y计算出数据X
+ 独一无二，不同的数据一定会产出不同的哈希值
+ 长度固定，不管输入多大的数据，输出长度都是固定的

### 哈希碰撞
+ 所谓哈希(hash)就是将不同的输入映射成独一无二的、固定长度的值(又称哈希值)，它是最常见的软件运算之一
+ 如果不同的输入得到了同一个哈希值，就发生了哈希碰撞(collision)
+ 防止哈希碰撞的最有效的方法，就是扩大哈希值的取值空间
+ 16个二进制位的哈希值，产生碰撞的可能性是65536分之一，也就是说，如果有65537个用户，就一定会产生碰撞。哈希值的长度扩展到32个二进制位，则哈希碰撞的概率会下降到 `4,294,967,296` 分之一

```javascript
console.log(Math.pow(2, 16)) // 65536
console.log(Math.pow(2, 32)) // 4294964296 ,42亿
```

### 哈希分类
+ 哈希还可以叫摘要(digest)、校验值(chunkSum)和指纹(fingerPrint)
+ 如果两端数据完全一样，就可以证明数据是一样的
+ 哈希有两种
    - 普通哈希用来做完整性校验，流行的是MD5
    - 加密哈希用来做加密，目前流行的加密算法是SHA256(Secure Hash Algorithm)系列

### 哈希使用
#### 简单哈希
```javascript
const hash = (input) => {
  return (input % 1024 + '').padStart(4, '0');
}
const r1 = hash(100);  // 0100
const r2 = hash(1025); // 0001
const r3 = hash(1124); // 0100
console.log(r1, r2, r3)
```

#### md5
```javascript
const crypto = require('crypto');

const content = 'welcome 世界';
const md5Hash = crypto.createHash('md5').update(content).update(content).digest('hex');
console.log(md5Hash, md5Hash.length);
// 965c28eb2f7f22374221488e772efb51 32
```

#### sha256
```javascript
const crypto = require('crypto');

const content = 'welcome 世界';
const salt = '123456abcdef';
const shaHash1 = crypto.createHmac('sha256', salt).update(content).update(content).digest('hex');
const shaHash2 = crypto.createHmac('sha256', salt).update(content + content).digest('hex');
const shaHash3 = crypto.createHmac('sha256', salt).update(content).digest('hex');
console.log(shaHash1, shaHash1.length);
console.log(shaHash2, shaHash2.length);
console.log(shaHash3, shaHash3.length);
// d3d6ffe01375bf5c972a3e559662182af4769c7ed895ecd858ac67463f790554 64
// d3d6ffe01375bf5c972a3e559662182af4769c7ed895ecd858ac67463f790554 64
// 69b33f11ff01a347060773a94ea2ee40bba01532581ac25ce2bccb82c4089d64 64
```

## 数字签名
+ 数字签名的基本原理是用私钥去签名，而用公钥去验证签名

<!-- 这是一张图片，ocr 内容为：数字签名 加密通信 (签名) 公钥加密(加密) 私钥加密 公钥解密(验签) 私钥解密(解密) -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1752305950224-5624afd0-a2e5-45c6-9457-579456eb1936.png)

<!-- 这是一张图片，ocr 内容为：签名 验签 签名 公钥 文件 文件 私钥 签名算法 验签算法 成功/失败 签名 珠峰架构 微信号:ZHUFENGJIAGOU -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1752305965097-e9b79498-9981-4c97-bd22-261946759922.png)

```javascript
const { generateKeyPairSync, createSign, createVerify } = require('crypto');

/**
 * 数字签名和数字证书实现过程
 * 内部是这样实现的，如何知道签名是否正确？
 * 验证方先拿到文件file，然后用publicKey计算签名sign，如果跟对方的sign匹配，则验证通过
 */

// 生成一对密钥，一个是公钥，一个是私钥
const rsa = generateKeyPairSync('rsa', {
  modulusLength: 1024,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem' // base64格式的公钥
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',
    passphrase: 'passphrase' // 私钥的秘密
  }
});

const file = 'welcome 世界';

// 先创建签名对象
const signObj = createSign('RSA-SHA256');
// 放入文件内容
signObj.update(file);
// 用rsa私钥签名，输出一个16进制的字符串
const sign = signObj.sign({
  key: rsa.privateKey,
  format: 'pem',
  passphrase: 'passphrase'
}, 'hex');
console.log(sign, sign.length);
// 208ae06bbfd447a0829341cd71aaa089be9b5ce27c4a1d82a00ea5fe9f658323aca1a0683f1d13b915c31d034561adb0f1c302dc4e3aafb4d238ce9a29fa84ef91d61c04816289671304343f99b77ceda1ea18b9a221e914a5935c52ba341f9d822760dbfd154040480849b5332b286edaf1b713eff5ba237645fc9ec63be538
// 256

// 创建验证签名对象
const verifyObj = createVerify('RSA-SHA256');
// 放入文件内容
verifyObj.update(file);
//验证签名是否合法
const isValid = verifyObj.verify(rsa.publicKey, sign, 'hex');
console.log(isValid);
// true
```

## 数字证书
+ 数字证书是一个由可信的第三方发出的，用来证明所有人身份以及所有人拥有某个公钥的电子文件

<!-- 这是一张图片，ocr 内容为：数字认证机构(CA) (2)CA用自己的私钥将服务器的公钥 (1)服务器把公钥注册到CA 进行数字签名证书并颁发数字证书 珠峰架构 服务器公钥 数字证书 CA数字签名 CA公钥已经事先置入到了 浏览器或操作系统中 3.服务器把证书发给客户端 服务器公钥 4.客户端拿到服务器的数字 证书后,使用CA公钥确认 服务器数字证书的真实性 服务器 服务器私钥 5.把数据用服务器公钥加密后发送 客户端 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1752305989657-e238e4b1-14a4-42ad-bf65-dcf20e4418e2.png)

### 数字证书原理
```javascript
const { generateKeyPairSync, createSign, createVerify, createHash } = require('crypto');

const passphrase = 'passphrase';
const serverRsa = generateKeyPairSync('rsa', {
  modulusLength: 1024,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',
    passphrase
  }
});

const caRsa = generateKeyPairSync('rsa', {
  modulusLength: 1024,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',
    passphrase
  }
});

const info = {
  domain: 'http://127.0.0.1:8080',
  publicKey: serverRsa.publicKey
}

// 把这个申请信息发给CA机构请求颁发证书
// 实现的时候签名的并不是info，而是它的hash，性能很差，一般不能计算大量数据
const hash = createHash('sha256').update(JSON.stringify(info)).digest('hex');

const sign = getSign(hash, caRsa.privateKey, passphrase);

// 这就是证书，客户端会先验证证书，用CA的公钥验证证书的合法性，然后取出服务器的公钥
const cert = {
  info,
  sign
}
const valid = verifySign(hash, cert.sign, caRsa.publicKey);
console.log('浏览器验证CA的签名:', valid);
// 拿到了serverPublicKey之后，如果想向服务器发送数据，就用这个key加密
console.log('cert:', cert.info.publicKey);

function getSign(content, privateKey, passphrase) {
  const signObj = createSign('RSA-SHA256');
  signObj.update(content);
  return signObj.sign({
    key: privateKey,
    format: 'pem',
    passphrase
  }, 'hex')
}

function verifySign(content, sign, publicKey) {
  const verifyObj = createVerify('RSA-SHA256');
  verifyObj.update(content);
  return verifyObj.verify(publicKey, sign, 'hex');
}

/*
浏览器验证CA的签名: true
cert: -----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDXPVYiAJw5Rj1hn2NnqnyhzasA
ZFhOts37VB2i7zXt24BmIvkLQ9hFK2a/HNrcI7HqTcJhsCNdj1WCaGbNhZZ3GE7G
Dy6kEgT0NxIFFZn8m96EsAjt3jSLVfrClDq1kqIYlxneE5sdHeO2e16fBa/mQvDg
UyCxVb0iKuLpNg2KUQIDAQAB
-----END PUBLIC KEY-----
*/
```

## Diffie-Hellman算法
+ Diffie-Hellman算法是一种密钥交换协议，它可以让双方在不泄漏密钥的情况下协商出一个密钥来

<!-- 这是一张图片，ocr 内容为：COMMON PAINT SECRET COLOUR PUBLIC TRANSPORT (ASSUME THAT MIXTURE SEPARATION IS EXPENSIVE) SECRET COLOUR 十 COMMON SECRET -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1752306012547-5361db15-382b-43f1-8176-42dd7bde1329.png)

### Diffie-Hellman实现
```javascript
const N = 23;
const p = 5;
const secret1 = 6; // 这是密钥
const A = Math.pow(p, secret1) % N; // 8
console.log(`p=${p}, N=${N}, A=${A}`);

const secret2 = 15; // 这是密钥
const B = Math.pow(p, secret2) % N; // 19
console.log(`p=${p}, N=${N}, B=${B}`);

console.log(Math.pow(A, secret2) % N);
console.log(Math.pow(B, secret1) % N);

/*
  p=5, N=23, A=8
  p=5, N=23, B=19
  2
  2
 */
```

### Diffie-Hellman算法
```javascript
const {createDiffieHellman} = require('crypto');

// 客户端
const client = createDiffieHellman(512);
const clientKey = client.generateKeys(); // A

const prime = client.getPrime(); // p
const generator = client.getGenerator(); // N

// 服务端
const server = createDiffieHellman(prime, generator);
const serverKey = server.generateKeys(); // B

const clientSecret = client.computeSecret(serverKey);
const serverSecret = server.computeSecret(clientKey);

console.log('clientSecret', clientSecret.toString('hex'));
console.log('serverSecret', serverSecret.toString('hex'));

/*
	clientSecret b30688fb375b7b3a195830b75e60ee41d21292b00d2902eb5712825b88e2b3bfdee73b84c2f82d77463a856f0803689d9b30e1850de4c346b2f1d6381df25cc0
	serverSecret b30688fb375b7b3a195830b75e60ee41d21292b00d2902eb5712825b88e2b3bfdee73b84c2f82d77463a856f0803689d9b30e1850de4c346b2f1d6381df25cc0
 */
```

## ECC
+ <font style="color:rgb(51, 51, 51);">椭圆曲线加密算法(ECC) 是基于椭圆曲线数学的一种公钥加密的算法</font>

<!-- 这是一张图片，ocr 内容为：I(X) R P+Q -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1752305718214-1a7259fb-9ff3-4900-add6-67814dab5e92.png)

### ECC原理
```javascript
let G = 3;
let a = 5;
let A = G * a;
let b = 7;
let B = G * b;
console.log(a * B);
console.log(b * A);
```

### ECC使用
```javascript
let { createECDH } = require('crypto');
const clientDH = createECDH('secp521r1');
const clientDHParams = clientDH.generateKeys();

const serverDH = createECDH('secp521r1');
const serverDHParams = serverDH.generateKeys();

const clientKey = clientDH.computeSecret(serverDHParams);
const serverKey = serverDH.computeSecret(clientDHParams);
console.log('clientKey', clientKey.toString('hex'));
console.log('serverKey', serverKey.toString('hex'));
```

# UDP服务器
<!-- 这是一张图片，ocr 内容为：CLIENT HELLO 443 + 58210 [ACK] SEQ-1 ACK-518 WIN-132096 LEN-1452 [TCP S T OF A REASSEMBLED PDU] CP SEGMENT STATUS, SERVER KEY EXCHANGE, SERVER HELLO, CERTIFICATE, CERTIFICATE ' E, SERVER HELLO DONE CLIENT KEY EXCHANGE, CHANGE CIPHER SPEC, ENCE ENCRYPTED HANDSHAKE MESSAGE HANDSHAKE MESSAGE CHANGE CIPHER SPEC, ENCRYPTED HA APPLICATION DATA -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1752305761344-ff0cd07e-b508-44bd-bcb7-982abe171367.png)

<!-- 这是一张图片，ocr 内容为：TLS(协议) ECDHE(图明交换协议) RSA(签名算法) WITH AES 256 CBC(对称加密算法) SHA(消息认证码) 春瑞 1.CLIENT HELLO CLIENT CLIENT 发送新机数 CLIENT RANDOM RANDOM RANDOM 客户端生产商机数 客户端生产随机数 2.SERVER HELLO SERVER SERVER 发送所机数 SERVER RANDOM RANDOM 服务出生产商机数 服务出生产许机数 校验证 CA公钥 3.CERTIFICATE,CERTIFICATE STATUS 服务器公钥 服务器公销 发送服务器证书 目 目 签名 签名 服务管证    服务器证券 服务留DH参数 服务裁DH参数 4.SERVER KEY EXCHANGE 把服务器QIDH参数签名后发送给客广端 DH参数签名 DH参数签名 服务器私机 5.SERVER HELLO DONE 6.CLIENTKEYEXCHANGE 把客广端DH参数发送始服务器 客户端DH参数 客户端DH参数 PRE-MANTER-KEY PRE-MASTER-KEY MASTER KEY MASTER-KEY 7.CHANGE CIPHER SPEC 8.ENCRVPTED HANDSHAKE MESSAGE 9.CHANGE CIPHER SPEC 10.ENCRYPTED HANDSHAKE MESSAQE 小 珠峰架构 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1752305768845-0bdfed67-e18e-46b8-8fcd-3108a350792e.png)

<!-- 这是一张图片，ocr 内容为：CLIENT RANDOM PREMASTER SECRET SERVER RANDOM CLIENT RANDOM SERVER RANDOM PREMASTER SECRET BB CCC PREMASTER SECRET CLIENT RANDOM SERVER RANDOM SHA PREMASTER SECRET HASH SHA PREMASTER SECRET SHA MD5 HASH PREMASTER SECRET MD5 HASH MD5 MASTER SECRET HASH HASH HASH -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1752306044573-b394ec90-03e2-4ce5-823b-9efacc0fc549.png)

+ <font style="color:rgb(51, 51, 51);">wireshark</font>

```shell
tls and (ip.src == 47.111.100.159 or ip.dst == 47.111.100.159)
```

## createCA.js
```javascript
const ca_passphrase = 'ca';
let CA = generateKeyPairSync('rsa', {
  modulusLength: 1024,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',
    passphrase: ca_passphrase
  }
});
let fs = require('fs');
let path = require('path');
fs.writeFileSync(path.resolve(__dirname, 'CA.publicKey'), CA.publicKey);
fs.writeFileSync(path.resolve(__dirname, 'CA.privateKey'), CA.privateKey);
```

## ca.js
```javascript
const { createHash } = require('crypto');
const { getSign } = require('./utils');
const ca_passphrase = 'ca';
const fs = require('fs');
const path = require('path');
let cAPrivateKey = fs.readFileSync(path.resolve(__dirname, 'CA.privateKey'), 'utf8');
function requestCert(info) {
  const infoHash = createHash('sha256').update(JSON.stringify(info)).digest('hex');
  const sign = getSign(infoHash, cAPrivateKey, ca_passphrase);
  return { info, sign };
}
exports.requestCert = requestCert;
```

## utils.js
```javascript
const { createCipheriv, createDecipheriv, createSign, createVerify } = require('crypto');
function encrypt(data, key) {
  let decipher = createCipheriv('aes-256-cbc', key, '1234567890123456');
  decipher.update(data);
  return decipher.final('hex');
}

function decrypt(data, key) {
  let decipher = createDecipheriv('aes-256-cbc', key, '1234567890123456');
  decipher.update(data, 'hex');
  return decipher.final('utf8');
}
function getSign(content, privateKey, passphrase) {
  var sign = createSign('RSA-SHA256');
  sign.update(content);
  return sign.sign({ key: privateKey, format: 'pem', passphrase }, 'hex');
}
function verifySign(content, sign, publicKey) {
  var verify = createVerify('RSA-SHA256');
  verify.update(content);
  return verify.verify(publicKey, sign, 'hex');
}
module.exports = {
  encrypt, decrypt, getSign, verifySign
}
```

## udp_server.js
```javascript
const dgram = require('dgram')
const udp_server = dgram.createSocket('udp4')
const protocol = require('./protocol');
const { generateKeyPairSync, randomBytes, createHash, createECDH } = require('crypto');
const server_passphrase = 'server';
const { getSign, decrypt, encrypt } = require('./utils');
const { requestCert } = require('./ca');

let serverRSA = generateKeyPairSync('rsa', {
  modulusLength: 1024,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',
    passphrase: server_passphrase
  }
});
let serverRandom = randomBytes(8).toString('hex');
const serverInfo = {
  domain: "http://127.0.0.1:20000",
  publicKey: serverRSA.publicKey
};
let serverCert = requestCert(serverInfo);
let clientRandom;
const serverDH = createECDH('secp521r1');
const ecDHServerParams = serverDH.generateKeys().toString('hex');
const ecDHServerParamsSign = getSign(ecDHServerParams, serverRSA.privateKey, server_passphrase);
let masterKey;
let sessionKey;
udp_server.on('listening', () => {
  const address = udp_server.address();
  console.log(`client running ${address.address}: ${address.port}`)
})
udp_server.on('message', (data, remote) => {
  let message = JSON.parse(data);
  switch (message.type) {
    case protocol.ClientHello:
      //2.在服务器生成随机数，通过ServerHello发送给客户端
      clientRandom = message.clientRandom;
      udp_server.send(JSON.stringify({
        type: protocol.ServerHello,
        serverRandom,//服务器端随机数
        cipherSuite: 'TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA'//约定的加密套件
      }), remote.port, remote.address);
      //3.Certificate 服务器把包含自己公钥的证书发送给客户端进行验证
      udp_server.send(JSON.stringify({
        type: protocol.Certificate,
        serverCert,//服务器公钥证书
      }), remote.port, remote.address);
      //4.ServerKeyExchange 服务器端生成DH参数，并用服务器私钥进行签名发给客户端
      udp_server.send(JSON.stringify({
        type: protocol.ServerKeyExchange,
        ecDHServerParams,
        ecDHServerParamsSign
      }), remote.port, remote.address);
      //5.Server Hello Done 服务器发送完成
      udp_server.send(JSON.stringify({
        type: protocol.ServerHelloDone
      }), remote.port, remote.address);
      break;
    case protocol.ClientKeyExchange:
      //6.ClientKeyExchange 服务器收到客户端DH参数后加上服务器DH参数生成pre-master-key
      //再由pre-master-key生成masterKey和sessionKey
      let { ecDHClientParams } = message;
      preMasterKey = serverDH.computeSecret(Buffer.from(ecDHClientParams, 'hex')).toString('hex');
      masterKey = createHash('md5').update(preMasterKey + clientRandom + serverRandom).digest('hex');
      sessionKey = createHash('md5').update(masterKey + clientRandom + serverRandom).digest('hex');
      break;
    case protocol.ChangeCipherSpec:
      //9.服务器通知客户端服务器也已经准备好切换加密套件了
      udp_server.send(JSON.stringify({
        type: protocol.ChangeCipherSpec
      }), remote.port, remote.address);
      break;
    case protocol.EncryptedHandshakeMessage:
      console.log("服务器收到解密后的数据:", decrypt(message.data, sessionKey));
      //10.服务器收到客户端的加密数据后向客户端回复加密数据
      udp_server.send(JSON.stringify({
        type: protocol.EncryptedHandshakeMessage,
        data: encrypt("i am server", sessionKey)
      }), remote.port, remote.address);
      break;
    default:
      break;
  }

})
udp_server.on('error', (error) => {
  console.log(error);
});
udp_server.bind(20000, '127.0.0.1');
```

## udp_client.js
```javascript
const dgram = require('dgram')
const udp_client = dgram.createSocket('udp4')
const { randomBytes, createHash, createECDH } = require('crypto');
const { verifySign, encrypt, decrypt } = require('./utils');
const url = require('url');
const protocol = require('./protocol');
const fs = require('fs');
const path = require('path');
const cAPublicKey = fs.readFileSync(path.resolve(__dirname, 'CA.publicKey'), 'utf8');
const clientRandom = randomBytes(8).toString('hex');
let serverRandom;
let serverPublicKey;
let ecDHServerParams;
let clientDH = createECDH('secp521r1');
let ecDHClientParams = clientDH.generateKeys();
let masterKey;
let sessionKey;
udp_client.on('listening', () => {
  const address = udp_client.address();
  console.log(`client running ${address.address}: ${address.port}`)
})
udp_client.on('message', (data, remote) => {
  let message = JSON.parse(data.toString('utf8'));
  switch (message.type) {
    case protocol.ServerHello:
      serverRandom = message.serverRandom;
      break;
    case protocol.Certificate:
      //3.Certificate 客户收到服务器证书后会用CA的公钥进行验证证书是否合法
      let { serverCert } = message;
      let { info, sign } = serverCert;
      serverPublicKey = info.publicKey;
      const serverInfoHash = createHash('sha256').update(JSON.stringify(info)).digest('hex');
      let serverCertIsValid = verifySign(serverInfoHash, sign, cAPublicKey);
      console.log('验证服务器端证书是否正确?', serverCertIsValid);
      let urlObj = url.parse(info.domain);
      let serverDomainIsValid = urlObj.hostname === remote.address && urlObj.port == remote.port;
      console.log('验证服务器端域名正确?', serverDomainIsValid);
      break;
    case protocol.ServerKeyExchange:
      //4.ServerKeyExchange 客户端收到服务器的DH参数和参数签名后会用服务器的公钥进行签名，验证服务器拥有私钥
      ecDHServerParams = message.ecDHServerParams;
      ecDHServerParamsSign = message.ecDHServerParamsSign;
      let serverDHParamIsValid = verifySign(ecDHServerParams, ecDHServerParamsSign, serverPublicKey);
      console.log('验证服务器端证书DH参数是否正确?', serverDHParamIsValid);
      break;
    case protocol.ServerHelloDone:
      //6.ClientKeyExchange 客户端生成DH参数并且发给服务器
      udp_client.send(JSON.stringify({
        type: protocol.ClientKeyExchange,
        ecDHClientParams
      }), remote.port, remote.address);
      //6.ClientKeyExchange 服务器收到客户端DH参数后加上服务器DH参数生成pre-master-key
      //再由pre-master-key生成masterKey和sessionKey
      preMasterKey = clientDH.computeSecret(Buffer.from(ecDHServerParams, 'hex')).toString('hex');
      masterKey = createHash('md5').update(preMasterKey + clientRandom + serverRandom).digest('hex');
      sessionKey = createHash('md5').update(masterKey + clientRandom + serverRandom).digest('hex');
      //7.Change Cipher Spec 通知服务器客户端已经准备好切换成加密通信了
      udp_client.send(JSON.stringify({
        type: protocol.ChangeCipherSpec
      }), remote.port, remote.address);
      //8.加密握手信息并传送给服务器端
      udp_client.send(JSON.stringify({
        type: protocol.EncryptedHandshakeMessage,
        data: encrypt("i am client", sessionKey)
      }), remote.port, remote.address);
      break;
    case protocol.EncryptedHandshakeMessage:
      //10.客户端你好到服务器的加密握手数据
      //这个报文的目的就是告诉对端自己在整个握手过程中收到了什么数据，发送了什么数据。来保证中间没人篡改报文
      console.log("客户端收到解密后的数据:", decrypt(message.data, sessionKey));
      break;
    default:
      break;
  }
})
udp_client.on('error', (error) => {
  console.log(error);
});
//1.ClientHello 客户端向服务器发送客户端随机数，服务器需要保存在服务器端
udp_client.send(JSON.stringify({
  type: protocol.ClientHello,
  clientRandom
}), 20000, '127.0.0.1');
```

# 数字证书实战
+ [Downloads | OpenSSL Library](https://www.openssl.org/source/)
+ [Win32OpenSSL](http://slproweb.com/products/Win32OpenSSL.html)
+ <font style="color:rgb(51, 51, 51);">安装后要添加环境变量 </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">C:\Program Files\OpenSSL-Win64\bin</font>`

## 自建CA
```javascript
// 1.生成CA私匙
openssl genrsa -des3 -out ca.private.pem 1024
// 2.生成CA证书请求
openssl req -new -key ca.private.pem -out ca.csr
// 3.生成CA根证书
openssl x509 -req -in ca.csr -extensions v3_ca -signkey ca.private.pem -out ca.crt
```

## 生成服务器CA证书
```javascript
// 1.生成server私匙
openssl genrsa -out server.private.pem 1024
// 2.生成server证书请求
openssl req -new -key server.private.pem -out server.csr
// 3.生成server证书
openssl x509 -days 365 -req -in server.csr -extensions  v3_req -CAkey  ca.private.pem -CA ca.crt -CAcreateserial -out server.crt  -extfile openssl.cnf
```

+ <font style="color:rgb(51, 51, 51);">openssl.cnf</font>

```yaml
[req]  
    distinguished_name = req_distinguished_name  
    req_extensions = v3_req  
    [req_distinguished_name]  
    countryName = CN 
    countryName_default = CN  
    stateOrProvinceName = Beijing  
    stateOrProvinceName_default = Beijing  
    localityName = Beijing 
    localityName_default = Beijing
    organizationalUnitName  = HD
    organizationalUnitName_default  = HD
    commonName = localhost  
    commonName_max  = 64  

    [ v3_req ]  
    # Extensions to add to a certificate request  
    basicConstraints = CA:FALSE  
    keyUsage = nonRepudiation, digitalSignature, keyEncipherment  
    subjectAltName = @alt_names  

    [alt_names]  
    #注意这个IP.1的设置，IP地址需要和你的服务器的监听地址一样 DNS为server网址，可设置多个ip和dns
    IP.1 = 127.0.0.1
    DNS.1 = localhost
```

## 服务器
```javascript
const https = require('https');
const fs = require('fs');
const path = require('path');

const options = {
  key: fs.readFileSync(path.resolve(__dirname, 'ssl/server.private.pem')),
  cert: fs.readFileSync(path.resolve(__dirname, 'ssl/server.crt'))
};


https.createServer(options, (req, res) => {
  res.end('hello world\n');
}).listen(9000);

console.log("server https is running 9000");
```

## 客户端
```javascript
const https = require('https');
const options = {
  hostname: '127.0.0.1',
  port: 9000,
  path: '/',
  method: 'GET',
  requestCert: true,  //请求客户端证书
  rejectUnauthorized: false, //不拒绝不受信任的证书
};

const req = https.request(options, (res) => {
  let buffers = [];
  res.on('data', (chunk) => {
    buffers.push(chunk);
  });
  res.on('end', () => {
    console.log(buffers.toString());
  });
});
req.end();
```

# 参考
[crypto 加密 | Node.js v24 文档](http://nodejs.cn/api/crypto.html)

[椭圆曲线加密算法原理解析（ECC）](https://segmentfault.com/a/1190000019172260)

