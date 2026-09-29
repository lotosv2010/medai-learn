# OSI七层模型
+ `Open System Interconnection` 适合于所有的网络
+ 分工带来效能
+ 将复杂的流程分解为几个功能相对单一的子进程
+ 整个流程更加清晰，复杂问题简单化
+ 更容易发现问题并针对性的解决问题
    - 应用层(Application)提供网络与用户应用软件之间的接口服务(HTTP)
    - 表示层(Presentation)提供格式化的表示和转换数据服务，如加密和压缩
    - 会话层(Session)提供包括访问验证和会话管理在内的建立和维护应用之间通信的机制
    - 传输层(Transmission)提供建立、维护和取消传输连接功能，负责可靠地传输数据(TCP)
    - 网络层(Network)处理网络间路由，确保数据及时传送(路由器)
    - 数据链路层(DataLink)负责无错传输数据，确认帧、发错重传等(交换机)
    - 物理层(Physics)提供机械、电气、功能和过程特性(网卡、网线、双绞线、同轴电缆、中继器)

## 分层模型
<!-- 这是一张图片，ocr 内容为：主要设备及协议 主要功能 层次 名称 实现具体的应用功能 7 应用层 POP3,FTPHTTPTelnet. 数据的格式与表达,加密, SMTP 6 表示层 压缩 DHCP,TFTPSNMP,DNS 建立,管理和终止会话 5 会话层 TCP,UDP 4 端到端的连接 传输层 三层交换机,路由器 网络层 3 分组传输和路由选在 ARPRARP,IP,ICMP,IGMP 网桥,交换机(多端口网桥),网卡 数据链路层 传送以顿为单位的信息 2 PPTPL2TPSLIP,PPP 物理层 二进制传输 中继器,集线器(多端口中继器) -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636556608826-f8a9e1ca-ec3b-428f-8e1a-dde7a6e333d2.png)

<!-- 这是一张图片，ocr 内容为：访问网络服务的接口 应用层 例如:为燥作系统或网络应用程序提供访网络服务的接口 常见:Telnet,FTP,LTTP,SMMP,DNS梦 提供数据格式转换服务 表示层 例如:解密与加密,图片解码和编码,数据的压缩和解压缩 常见:URL加密,门令加密,图片编解码 建立连接并提供访问验证和会话管理(SESSION) 会话层 例如:使用校验点可使会在通倍失效时从校验点恢复通信 常见:服务器验证用户登录,断点续传 提供应用进程之间的逻批通信 数据段 传输层 例如:建立连接,处理数据包错误数据包次序 (Segment 常见:TCP,UDP,SPX,进程,端口(socket) 为数据在结点之间传输创建逻辑路,并分组转发数据 分组(效据包) 网络层 例如:对子网间的数据包进行路山选择 (Packet 常见:路由器,多层交换机,防火墙,IP,IPX,RIP.OSPF 网络 在通信的实体间建立数据链路连接 例如:将数据分恢,并处理流控制,理地址址,重发 链路层 顿(Frame) 常见:网卡,网桥,二层交换机等 为数据瑞设备提供原始比特流的传输的通路 物理层 例如:网络通信的数据传输介质,由电缆与设备共同构成 比拉(Bit ato 常见:中维器,集线器,网线:HUB.RJ-45标准签 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636556682300-a22a162c-5949-4b71-89e7-79cdbbfddd1d.png)

## 封装过程
<!-- 这是一张图片，ocr 内容为：员工主机 应用层 数据 传输层 TCP头部 数据 网络层 IP头部据段(SegMent) 解封装 加包装 数据链路层 据包Packet MAC头部 尾部 拆包装 除去 除去 数据赖 比特流 物理层 邮局 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636559419193-e3c5b771-6d03-43af-8aa4-4c1db3364fe5.png)

# TCP/IP参数模型
+ TCP/IP是传输控制协议/网络互联协议的简称
+ 早期的TCP/IP模型是一个四层结构，从下往上依次是网络接口层、互联网层、传输层和应用层
+ 后来在使用过程中，借鉴OSI七层参考模型，将网络接口层划分为了物理层和数据链路层，形成五层结构

<!-- 这是一张图片，ocr 内容为：0SH七层模型 TCP/IP四层模型 TCP/IP五层模型 应用层 表示层 一 应用层 应用层 会话层 一 一 传输层 传输层 传输层 一 网络层 网络层 网络层 一 数据链路层 数据链路层 网络接口层 物理层 物理层 TCPIIP4层模型 oS17层模型 TCP/IP5层模型 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636600245971-81d70447-283a-4c1e-b351-1e0df5c4f976.png)

<!-- 这是一张图片，ocr 内容为：五层协议的体系结构 OSI的体系结构 TCP/IP的体系结构 应用层 7 应用层 (各种应用层协议,如 应用层 表示层 5 6 DNS,HTTPSP等 会话层 5 运输层(TCP或UDP) 运输层 4 运输层 3 3 网络层 网络层 网际层IP 2 数据链路层 2 数据链路层 网络接口层 (这一层并没有具体内容) 1 物理层 1 物理层 (a) (C) (b) 计算机网络体系结构: (a)OSI的七层协议;(b)t TCP/IP的四层协议;(c)五层协议 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636555530740-a0586f0c-0776-4165-86ea-fbf8e949a52b.png)

## 协议的概念和作用
+ 为了让计算机能够通信，计算机需要定义通信规则，这些规则就是协议
+ 规则是多种，协议也有多种
+ 协议就是数据封装格式+传输

## 常用协议
+ TCP/IP被称为传输控制协议/互联网协议，又称网络通讯协议
+ 是由网络层的IP协议和传输层的TCP协议组成，是一个很大的协议集合
+ 物理层和数据链路层没有定义任何协议，支持所有的标准和专用的协议

<!-- 这是一张图片，ocr 内容为：TCPIIP5层模型 HTTP TFTP FTP 应用层 DNS SMTP SNMP TCP UCP SCTP 传输层 ICMPIGMP IP 网络层 ARPRARP 数据链路层 由底层网络定义的协议 物理层 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636600509897-a3a2b50c-3152-40ef-8241-da8c3439f179.png)

| 层级 | 名称 | 含义 |
| --- | --- | --- |
| 应用层 | HTTP | 超文本传输协议(HyperText Transfer Protocol)是互联网上应用最为广泛的一种网络协议 |
| 应用层 | FTP | 文件传输协议(File Transfer Protocol)是用于在网络上进行文件传输的一套标准协议，使用客户端/服务器模式 |
| 应用层 | TFTP | 简单文件传输协议(Trivial File Transfer Protocol)是TCP/IP协议族中的一个用来在客户机与服务器之间进行简单文件传输的协议 |
| 应用层 | SMTP | 简单邮件传输协议(Simple Mail Transfer Protocol)是Internet传输Email的事实标准 |
| 应用层 | SNMP | 简单网络管理协议(Simple Network  Management Protocol)由一组网络管理的标准组成，包含一个应用层协议(Application Layer Protocol)、数据库模型(Database Schema)和一组资源对象，该协议能够支持网络管理系统，用以检测连接到网络上的设备是否有任何引起管理上关注的情况 |
| 应用层 | DNS | 域名系统(Domain Name System)是互联网的一项服务，它作为将域名和IP地址相互映射的一个分布式数据库，能够使人更方便地访问互联网 |
| 传输层 | TCP | 传输控制协议(Transmission Control Protocol)是一种面向连接的、可靠的、基于字节流的传输层通信协议 |
| 传输层 | UDP | 用户数据报协议(User Datagram Protocol)是OSI参考模型中一种无连接的传输层协议，提供面向事务的简单不可靠信息传送服务 |
| 网络层 | ICMP | Internet控制报文协议(Internet Control Message Protocol)是TCP/IP协议族的一个子协议，用于在IP主机，路由之间传递控制消息，控制消息是指网络不通、主机是否可达、路由是否可用等网络本身的消息 |
| 网络层 | IGMP | Internet组管理协议(Internet Group Management Protocol)是因特网协议家族中的一个组播协议，该协议运行在主机和组播路由之间 |
| 网络层 | IP | 互联网协议地址(Internet Protocol Address)是分配给用户上网使用的网际协议的设备的数字标签 |
| 网络层 | ARP | 地址解析协议(Address Resolution Protocol)是根据IP地址获取物理地址的一个TCP/IP协议 |
| 网络层 | RARP | 反向地址转换协议(Reverse Address Resolution Protocol)允许局域网的物理机从网关服务器的ARP表或者缓存上请求其IP地址 |


## TCP/IP模型&OSI模型
<!-- 这是一张图片，ocr 内容为：ISO/OSI模型 TCP/IP模型 TCP/IP协议 应用层 文件传输 电子邮件 远程登录 网络文件服 网络管理 应用层 协议 协议 协议 协议 务协议 农示层 (FTP) (Telnet) (SMTP) (SNMP) (NFS 会话层 传输层 传输层 TCP UDP 网络层 网际层 RARP ICMP ARP Token-Ring 数据链路层 网络接口层 Ethemet FDDI ARCnet PPP/ISLIP EEE802.3 EEE802.5 硬件层 物理层 TCP/P模型与OSI模型的对比 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636600494577-984b79f4-05ae-4a5c-866a-aedb255a1c09.png)

# 网络接口层
+ 网络接口层是TCP/IP模型的最底层，负责接收从上一层交来的数据报并将数据报通过底层的物理网络发送出去，比较常见的就是设备的驱动程序，此层没有特定的协议
+ 网络接口层又分为物理层和数据链路层

## 物理层
+ 计算机在传递数据的时候传递的都是0和1的数字，而物理层关心的是用什么信号来表示0和1，是否可以双向通信，最初的连接如何建立以及完成连接如何终止，物理层是为数据传输提供可靠的环境
+ 尽可能的屏蔽掉物理设备和传输媒介，使数据链路层不考虑这些差异，只考虑本层的协议和服务
+ 为用户提供在一条物理传输媒体上提供传送和接收比特流的能力
+ 需要解决物理连接、维护和释放的问题

<!-- 这是一张图片，ocr 内容为：传输介质 接口 网络设备 网络设备 pc pc 信号的传输 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636603251991-5c859228-166d-4221-9002-c74e641f9f6a.png)

### 数字信号的编码
+ 数字信号的编码，用何种物理信号表示0和1

#### 非归零编码
<!-- 这是一张图片，ocr 内容为：0 1 以高电平表示"0",低电平表示"1",反之亦然. og.csdn.nausky.lormat -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636603382075-4c6a1870-4b0d-476b-a8d2-ea8e1a83f509.png)

+ 优点：编/译码简单
+ 缺点：内部不含时钟信号，收/发端同步困难
+ 用途：计算机内部，或低速数据通信

#### 曼彻斯特编码
<!-- 这是一张图片，ocr 内容为：非归零码 (a) 曼彻斯特编码 (b) 差分曼彻斯特 ik (C) Bald -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636603695353-a52e22e3-ccf1-4fe6-962e-3f3982e42c4c.png)

+ 优点：
    - 内部自含时钟，收/发端同步容易
    - 抗干扰能力强
+ 缺点
    - 编/译码较复杂
    - 占用更多的通信宽带，在同样的波特率的情况下，要比非归零编码多占用一倍信道宽带
+ 用途：802.3局域网(以太网)

## 数据链路层
+ 数据链路层是OSI参考模型中的第二层，介乎于物理层和网络层之间
+ 数据链路层在物理层提供的服务的基础上向网络层提供服务，其最基本的服务是将源自网络层来的数据可靠的传输到相邻节点的目标机网络层
+ 如何将数据组合成数据块，在数据链路层中称这个种数据块为帧(Frame)，帧是数据链路层的传送单位
+ 如何控制帧在物理信道上的传输，包括如何处理传输差错，如何调节发送速率以使与接收方相匹配
+ 以及在两个网路实体之间提供数据链路通路的建立、维持和释放的管理

### 以太网
+ 以太网(Ethernet)是一种计算机局域网技术，IEEE组织的IEEE 802.3 标准制定了以太网的技术标准，它规定包括物理层的连线、电子信号和介质访问层协议的内容
+ 以太网的标准拓扑结构为总线型拓扑
+ 以太网仍然使用总线型拓扑和CSMA/CD(Carrier Sense Multiple Access/Collision Detection，即载波多重访问/碰撞侦测)的总线技术
+ 以太网实现了网络上无线电系统多个节点发送信息的想法，每个节点必须获取电缆或者信道的才能传送信息
+ 每一个节点有全球唯一的48位地址也就是制造商分配给网卡的MAC地址，以保证以太网上所有节点能互相鉴别

### 总线型拓扑
+ 总线型拓扑是采用单根传输作为共用的传输介质，将网络中所有的计算机通过相应的硬件接口和电缆直接连接到这根共享的总线上
+ 使用总线型拓扑结构需解决的是确保端用户使用媒体发送数据时不能出现冲突
+ 总线型网络采用 <font style="color:#E8323C;">载波监听多路访问/冲突检测协议(CSMA/CD) </font>作为控制策略

<!-- 这是一张图片，ocr 内容为：终端电阻 终端电阻 百 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636605660860-a6714278-914c-43f3-8489-c4a9cc500f68.png)

#### 载波监听多路访问
+ 全称 Carrier Sense Multiple Access/Collision Detection(CSMA)是一种运行多个设备在同一信道发送信号的协议，其中的设备监听其他设备是否忙碌，只有在线路空闲时才发送
+ 在此种访问方式下，网络中的所用用户共享传输介质，信息通过广播传送到所有端口，网络中的工作站对接收到的信息进行确认，若是自己的便接收，否则不理
+ 从发送端情况看，当一个工作站有数据要发送时，它首先监听信道并检测网络上是否有其他工作站正在进行发送DATA，如果检测到信道忙碌，工作站将继续WAIT，若发现信道空闲，则开始发送数据，信息发送出去后，发送端还要继续对发送出去的信息进行确认，以了解接收端是否已经正确接收到数据，如果收到则发送结束，否则再次发送
+ 核心思想
    - 先听后讲，信道空闲则发送，信道忙则等待
    - 边听边讲，发送信号时不断检测信道是否碰撞
    - 碰撞即停
    - 退避重传，二进制指数退避重传
    - 多次碰撞，放弃发送，最多16次

#### 冲突检测
+ 冲突检测即发送站点在发送数据时要边发送边监听，若监听到信道有干扰信号，则表示产生了冲突，于是就要停止发送数据，计算出退避等待时间，然后使用CSMA方法继续尝试发送
+ 计算退避等待时间采用的是 <font style="color:#E8323C;">二机制数退避算法</font>

### MAC地址
+ 在通信过程中是用内置在网卡内的地址来标识计算机身份的
+ 每个网卡都有一个全球唯一的地址来标识自己，不会重复
+ MAC地址48位的二进制组成，通常分为6段，用16进制表示

<!-- 这是一张图片，ocr 内容为：24比特 24比特 (供应商标识) (供应商对网卡的唯一编号) 00-0d-28-be-b6-42 00-06-1b-e3-93-6c IBM CIsco -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636606924952-50f0e523-8474-4b68-9e06-cfb1cb6f7a1d.png)

### 以太网帧格式
+ 在以太网链路上的数据包称作<font style="color:#E8323C;">以太帧</font>，以太帧起始部分由前导码和帧开始符组成
+ 后面紧跟着一个以太网报头，以MAC地址说明目的地址和源地址
+ 帧的中部是该帧负载的包含其他协议报头的数据包(例如IP协议)
+ 以太帧由一个32位冗余校验码结尾，它用于检验数据传输是否出损坏

<!-- 这是一张图片，ocr 内容为：IP数据报 IP层 字节 46~1500 4 2 6 MAC顿目的地址源地址 类型 数据 FCS MAC层 以太网MAC顿 物理层 8字节 1.字节 7字节 10101010101010101011 10101010101010 帖开始 前同步码 定界符 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636607567657-39cf29ec-605f-4ed5-b23f-55bfa79d99c0.png)

<!-- 这是一张图片，ocr 内容为：字段 说明 前导符(Preamble) 由1和0交互构成(10101010...,共占7个字节,用于使PLS子层电路与收到的顺达成时钟同步 为1010101,共占1个字节,表示一个帧的开始.它和前导共同使援收方能很据1.喜迅速实现比特同步,当检到 幢起始(Start-of-Frame 连续的两位时,将后续信息女给MAC子息,通带来说,Pe.SFo这两个字救只用于损触接收端新倒达,并不计人MC Delimiter.SFD) 桢大小,也不算作是MAC顿头的组或部91163 目的MAC(Destination 分别用于标识目的MAC地地和MAC地址,两个字名点个学节,它们可以是单情地址也可以是广指地.当地最 Address,DA)源 位为0时表示单播,最高位为1时为组播,全为1时为广播 MAC(SourceAddress SA) 这是一个选的段,共战个学节,对于不同的网络杨议,它有不同的含义,但是,为美型使用时,如上表示,最 长度(Length)/类型(Type) 小值也总是大于1536(+六进村D.600;所以不会产生种突,别外,在氏E2冲,数手的长度为81500个字节 该字段对于不同的以太网顾包会的内容不一,对于较老的以太网标难,它是网络屋来的数股而蛟新的标准,则是一个 数据(Data) LLC顿的全部内容 它一个包含:位CRC校验值的字段,一共占4个字节.由发送对MAC收的字段pala间(不包会导待和起 顿校验序列(FCS) 始)的二进制序列进行计算 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636607818374-68261dce-4aea-40b6-8011-3353b9f9b438.png)

### ARP协议
+ 地址解析协议，即ARP(Address Resolution Protocol)，是根据IP地址获取物理地址的一个TCP/IP协议
+ 主机发送信息时将包含目标IP地址的ARP请求广播到网络上的所有主机，并接收返回消息，以此确定目标的物理地址，收到返回消息后将该IP地址和物理地址存入本机ARP缓存中并保留一定时间，下次请求时直接查询ARP缓存以节约资源
+ 地址解析协议是建立在网络中各个主机相互信任的基础上的，网络的主机可以自主发送ARP应答消息，其他主机收到应答报文时不会检测该报文的真实性就会将其计入本机ARP缓存
+ 由此攻击者就可以向某一个主机发送伪ARP应答报文，使其发送的信息无法达到预期的主机或达到错误的主机，这就构成了一个ARP欺骗

#### ARP协议报文
<!-- 这是一张图片，ocr 内容为：ARP报文格式 硬件地址长度 协议地址长度 以太网 以太网 顿 硬件 协议 发送端 目的以太网 发送端 目的 op 目的地址 漂地址 类型 类型 类型 以太网地址 地址 IP地址 IP地址 112 6 6 以太网首部 28字节ARP请求/应答 1.ARP请求 ARP为0x0806 2.ARP应答 3.RARP请求 1.以太网 4.RARP应答 Ox8000表示IP地址 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636699605806-095a081b-273e-4905-9be5-9055cfc9bd94.png)

| **字段** | **说明** |
| --- | --- |
| <font style="color:rgb(68, 68, 68);">硬件类型</font> | <font style="color:rgb(68, 68, 68);">指明了发送方想知道的硬件接口类型，以太网的值为 1</font> |
| <font style="color:rgb(68, 68, 68);">协议类型</font> | <font style="color:rgb(68, 68, 68);">表示要映射的协议地址类型。它的值为 0x0800，表示 IP 地址</font> |
| <font style="color:rgb(68, 68, 68);">硬件地址长度和协议长度</font> | <font style="color:rgb(68, 68, 68);">分别指出硬件地址和协议的长度，以字节为单位。对于以太网上 IP 地址的ARP请求或应答来说，它们的值分别为 6 和 4</font> |
| <font style="color:rgb(68, 68, 68);">操作类型</font> | <font style="color:rgb(68, 68, 68);">用来表示这个报文的类型，ARP 请求为 1，ARP 响应为 2，RARP 请求为 3，RARP 响应为 4</font> |
| <font style="color:rgb(68, 68, 68);">发送方 MAC 地址</font> | <font style="color:rgb(68, 68, 68);">发送方设备的硬件地址</font> |
| <font style="color:rgb(68, 68, 68);">发送方 IP 地址</font> | <font style="color:rgb(68, 68, 68);">发送方设备的 IP 地址</font> |
| <font style="color:rgb(68, 68, 68);">目标 MAC 地址</font> | <font style="color:rgb(68, 68, 68);">接收方设备的硬件地址</font> |
| <font style="color:rgb(68, 68, 68);">目标 IP 地址</font> | <font style="color:rgb(68, 68, 68);">接收方设备的IP地址</font> |


#### ARP地址解析过程
<!-- 这是一张图片，ocr 内容为：HostB HostA 192168.1.1 192.168.1.2 00026779-014c DCa0-2470-febd TargerMAC SenderIP SenderMAC TargetIP address Bddress address addr9ss 0000-0000-0000 0002-6779-014c 192.168.1.1 192168.1.2 SerderIP TargerMAC SenderMAC TaroetIP Bddre5s adcress Bddress Bddress 192,168.1.2 0040-2470-lebd 0002-6779-044c 192168.1.1 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636708540947-0e805c90-8c59-4d87-8781-db3d0a131512.png)

+ 主机A和B在同一网段，主机A要向主机B发送信息
    - 主机A首先查看自己的ARP表，确定其中是否包含有主机B对应的ARP表项，如果找到了对应的MAC地址，则主机A直接利用ARP表中的MAC地址，对IP数据包进行帧封装，并将数据包发送给主机B
    - 如果主机A在ARP表中找不到对应的MAC地址，则将缓存该数据报文，然后以广播方式发送一个ARP请求报文，ARP请求报文中的发送端IP地址和发送端MAC地址为主机A的IP地址和MAC地址，目标IP地址和目标MAC地址为主机B的IP地址和全0的MAC地址，由于ARP请求报文以广播方式发送，该网段上的所有主机都可以接受到该请求，但只有被请求的主机(即主机B)会对该请求进行处理
    - 主机B比较自己的IP地址和ARP请求报文中的目标IP地址，当两者相同时进行如下处理：将ARP请求报文中的发送端(即主机A)的IP地址和MAC地址存入自己的ARP表中，之后以单播方式发送ARP响应报文给主机A，其中包含了自己的MAC地址
    - 主机A收到ARP相应报文后，将主机B的MAC地址加入到自己的ARP表中以用后续报文的转发，同时将IP数据包进行封装后发送出去

# 互联网层(网络层)
+ 位于传输层和网络接口层之间，用于把数据从源主机经过若干个中间节点传送到目标主机，并向传输层提供基础的数据传输服务，它要提供路由和选址的工作

<!-- 这是一张图片，ocr 内容为：传输层 传输层 互联网层协议 互联网层 互联网层 数据链路层 数据链路层 目标主机 源主机 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636710080374-f0379b94-3aa3-4086-86a5-9aedc995077d.png)

## 选址
+ 交换机是靠MAC来寻址的，而因为MAC地址是无层次的，所以要靠IP地址来确认计算机的位置，这就是选址。

<!-- 这是一张图片，ocr 内容为：确定具体计算机的位置 选址 大网络) IP地址 IP地址 交换机 IP地址 IP地址 MAC IP地址 IP地址 无层次结构 (适合小网络 地址表 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636710449860-00c5b9ea-0a6b-440b-923e-03d2ac4762e5.png)

## 路由
+ 在能够选择的多条道路之间选择一条最短的路径就是路由的工作。

<!-- 这是一张图片，ocr 内容为：? 最佳路径 最近的路线 网络 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636710582820-17fec35d-6a33-4136-9fbf-eedfa4b50866.png)

## IP
+ 在网络中，每台计算机都有一个唯一的地址，方便别人找到它，这个地址就是IP地址。

### IP头部
<!-- 这是一张图片，ocr 内容为：首部的前一部分是固定长度,共20字节, 是所有IP数据报必须具有的. 位0 4 16 19 24 31 8 首部长度 版本 总长度 区分服务 固定部分分 标识 片偏移 标志 首部 生存时间 首部检验和 协议 源地址 目的地址 可变 可选字段(长度可变) 填充 部分 数据部分 数据部分 首部 IP数据报 发送在前 htips:/blog.csdnnaVDarin_Yang -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636711149485-59f43b66-561c-4d5d-996c-ca022ee16a0c.png)



+ IP 报头的最小长度为 20 字节，上图中每个字段的含义如下：

| **字段** | **说明** |
| --- | --- |
| 版本（version） | 占 4 位，表示 IP 协议的版本。通信双方使用的 IP 协议版本必须一致。目前广泛使用的IP协议版本号为 4，即 IPv4 |
| 首部长度（网际报头长度IHL） | 占 4 位，可表示的最大十进制数值是 15。这个字段所表示数的单位是 32 位字长（1 个 32 位字长是 4 字节）。因此，当 IP 的首部长度为 1111 时（即十进制的 15），首部长度就达到 60 字节。当 IP 分组的首部长度不是 4 字节的整数倍时，必须利用最后的填充字段加以填充。<br/>数据部分永远在 4 字节的整数倍开始，这样在实现 IP 协议时较为方便。首部长度限制为 60 字节的缺点是，长度有时可能不够用，之所以限制长度为 60 字节，是希望用户尽量减少开销。最常用的首部长度就是 20 字节（即首部长度为 0101），这时不使用任何选项。 |
| 区分服务（tos） | 也被称为服务类型，占 8 位，用来获得更好的服务。这个字段在旧标准中叫做服务类型，但实际上一直没有被使用过。1998 年 IETF 把这个字段改名为区分服务（Differentiated Services，DS）。只有在使用区分服务时，这个字段才起作用 |
| 总长度（totlen） | 首部和数据之和，单位为字节。总长度字段为 16 位，因此数据报的最大长度为 2^16-1=65535 字节 |
| 标识（identification） | 用来标识数据报，占 16 位。IP 协议在存储器中维持一个计数器。每产生一个数据报，计数器就加 1，并将此值赋给标识字段。当数据报的长度超过网络的 MTU，而必须分片时，这个标识字段的值就被复制到所有的数据报的标识字段中。具有相同的标识字段值的分片报文会被重组成原来的数据报 |
| 标志（flag） | 占 3 位。第一位未使用，其值为 0。第二位称为 DF（不分片），表示是否允许分片。取值为 0 时，表示允许分片；取值为 1 时，表示不允许分片。第三位称为 MF（更多分片），表示是否还有分片正在传输，设置为 0 时，表示没有更多分片需要发送，或数据报没有分片 |
| 片偏移（offsetfrag） | 占 13 位。当报文被分片后，该字段标记该分片在原报文中的相对位置。片偏移以 8 个字节为偏移单位。所以，除了最后一个分片，其他分片的偏移值都是 8 字节（64 位）的整数倍 |
| 生存时间（TTL） | 表示数据报在网络中的寿命，占 8 位。该字段由发出数据报的源主机设置。其目的是防止无法交付的数据报无限制地在网络中传输，从而消耗网络资源<br/>路由器在转发数据报之前，先把 TTL 值减 1。若 TTL 值减少到 0，则丢弃这个数据报，不再转发。因此，TTL 指明数据报在网络中最多可经过多少个路由器。TTL 的最大数值为 255。若把 TTL 的初始值设为 1，则表示这个数据报只能在本局域网中传送 |
| 协议(Protocol) | 表示该数据报文所携带的数据所使用的协议类型，占 8 位。该字段可以方便目的主机的 IP 层知道按照什么协议来处理数据部分。不同的协议有专门不同的协议号   例如，TCP 的协议号为 6，UDP 的协议号为 17，ICMP 的协议号为 1 |
| 首部检验和（checksum） | 用于校验数据报的首部，占 16 位。数据报每经过一个路由器，首部的字段都可能发生变化（如TTL），所以需要重新校验。而数据部分不发生变化，所以不用重新生成校验值 |
| 源地址（Source Address） | 表示数据报的源 IP 地址，占 32 位 |
| 目的地址（Destination Address） | 表示数据报的目的 IP 地址，占 32 位。该字段用于校验发送是否正确 |
| 可选字段（Option） | 该字段用于一些可选的报头设置，主要用于测试、调试和安全的目的。这些选项包括严格源路由（数据报必须经过指定的路由）、网际时间戳（经过每个路由器时的时间戳记录）和安全限制 |
| 填充（Pading | 由于可选字段中的长度不是固定的，使用若干个 0 填充该字段，可以保证整个报头的长度是 32 位的整数倍 |
| 数据部分（Data） | 表示传输层的数据，如保存 TCP、UDP、ICMP 或 IGMP 的数据。数据部分的长度不固定 |


### IP地址格式
+ IP地址是一个网络编码，用来确定网络中的一个节点
+ IP地址是由32位二机制(32bit)组成

<!-- 这是一张图片，ocr 内容为：32bits 点分+进制 Network Host 255 255 2722553 255 最大值 25~32 1-8一*9-1617-24 二进制 11111111 11111111 11111111 11111 11 多 0V~ 多 多宋 二进制例子 10101100 01111010 11001100 00010000 +进制例子 204 122 172 16 128+64+8+4-204 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636803134629-ec440c48-8d73-428e-b612-0fc712cacc25.png)

### IP地址组成
+ 网络部分(network)
+ 主机部分(host)

<!-- 这是一张图片，ocr 内容为：标示不同的网络 Network Host 标示在一个网络中特定的主机 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636803289097-06ed98ee-a756-420a-941c-c684b514fdce.png)

### IP地址的分类
+ IP地址的网络部分是由Internet地址分配机构来统一分配的，这样可以保证IP的唯一性
+ IP地址中全为1的IP即255.255.255.255，它称为限制广播地址，如果将其作为数据包的目标地址可以理解为发送到所有网络的所有主机
+ IP地址中全为0的IP即0.0.0.0，它表示启动时的IP地址，其含义就是尚未未分配时的IP地址
+ 127是用来进行本机测试，除了127.255.255.255外，其它的127开头的地址都代表本机

<!-- 这是一张图片，ocr 内容为：25-32- 9-16 17-24 Bils: 竖---- A类: Host ONNNNNNN Host Host 每个网络中可以有2的24次方-2台的主机. 范围(1-126) 17~24 25-32 9~16 1-8 Bits: B类: Host 10NNNNNN Host Network 最大的主机数量为2的16次方减2 范围(128-191) 17-24 -25-32 9-16 1-8 Bits: :88 C类: 110NNNNN Host Network Network 范围(192-223) 最大的主机数量为2的8次方减2 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636804012293-6adccd15-970f-4358-9f4f-e174b57a0566.png)

### 共有地址和私有地址
| **分类** | **范围** |
| --- | --- |
| A类私有IP | 10.0.0.0～10.255.255.255 |
| B类私有IP | 172.16.0.0～172.31.255.255 |
| C类私有IP | 192.168.0.0～192.168.255.255 |


+ 其它范围的IP均为公有IP地址

### 子网掩码
子网掩码(Subnet mask)又叫子网络遮罩，它是一种用来指明一个IP地址的那些位标识的时主机所在的子网，以及那些位标识的时主机位的掩码

+ 子网掩码不能单独存在，它必须结合IP地址一起使用
+ 子网掩码只有一个作用，就是将某一个IP地址划分成网络地址和主机地址两部分
+ 子网掩码也是32个二机制位
+ 对应IP的网络部分用1表示
+ 对应IP地址的主机部分用0表示
+ IP地址和子网掩码做逻辑与运算得到网络地址
    - 0和任何数相与都是0
    - 1和任何数相与都等于任何数本身
+ A、B、C三类地址都有自己默认的子网掩码
    - A类：255.0.0.0
    - B类：255.255.0.0
    - C类：255.255.255.0

<!-- 这是一张图片，ocr 内容为：示例:为C类地址应用子网掩码 子网掩码255.255.255.224 IP地址192.168.5.139 IP地址 192 139 168 IP地址 11000000 10001011 10101000 00000101 子网掩码 127 11111111 11100000 11111111 11111111 子网 11000000 00000101 10000000 10101000 子网 5 192 168 128 第一台主机 192 5 10000001-129 168 最后一台主机 192 5 10011110-158 168 定向广播 192 5 168 10011111-159 下一个子网 5 192 10100000-160 168 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636807744070-f4bdb1c1-5bcc-4bec-a861-3b5cfaeee677.png)

<!-- 这是一张图片，ocr 内容为：子网掩码: 255.0.0.0 100.50.20.2 100.50.20.3 A的主机ID 网络ID 50.20.2 100.0.0.0 272291163  100.50.30.2 100.60.30.2 这四台计算机只有在同一个网段,才能互相通信. -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636808155158-4862aab5-aa42-4923-95b2-786e57a75754.png)

```javascript
// 判断两个IP是否在同一个网络内
const ip1 = '100.50.20.2';
const ip2 = '100.60.30.2';
const mask = '255.0.0.0';
const same = (ip1, ip2, mask) => {
  ip1 = ip1.split('.').map(item => parseInt(item).toString(2).padStart(8, '0')).join('');
  ip2 = ip2.split('.').map(item => parseInt(item).toString(2).padStart(8, '0')).join('');
  mask = mask.split('.').map(item => parseInt(item).toString(2).padStart(8, '0')).join('');
  return (parseInt(ip1, 2)&parseInt(mask, 2)) === (parseInt(ip2, 2)&parseInt(mask, 2))
}
const result = same(ip1, ip2, mask);
console.log(result) // true
```

# 传输层
+ 位于应用层和网络接口层之间
+ 是面向连接的、可靠的进程到进程通信的协议
+ TCP提供全双工服务，即数据可在同一时间双向传播
+ TCP将若干个字节构成一个数组，此数组称为报文段(Segment)
+ 对可靠性要求高的上层协议，实现可靠性的保证，如果数据丢失、损坏的情况下如何保证可靠性、网络层只管传递数据，成功与否并不关心

## 传输层概述
<!-- 这是一张图片，ocr 内容为：位于传输层和网络接口层之间 应用层 应用层 传输层协议 xzwwizhg ------- 传输层 传输层 gwopzn QMzWZZhZg 互联网层 互联网层 源主机 目标主机 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636891893242-96b954b9-4ccd-4248-9f0b-52701faa46cb.png)

## 传输层的功能
+ 提供了一种端到端的连接

<!-- 这是一张图片，ocr 内容为：点到点 长南I 专国: 0Q Internet? 画板 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636892074593-489bd757-6187-4fa4-aff3-e61c5113a4a5.png)

## 协议分类
+ TCP(Transmission Control Protocol)
    - 传输控制协议
    - 可靠的、面向连接的协议
    - 传输效率低
+ UDP(User Datagram Protocol)
    - 用户数据报协议
    - 不可靠的、无连接的服务
    - 传输效率高

## TCP协议
+ 将数据进行分段打包传输
+ 对每个数据包编号控制顺序
+ 运输中丢失、重发和丢弃处理
+ 流量控制避免拥塞

### TCP数据包封装
#### 格式
+ 源端口号和目标端口号，计算机通过端口号识别访问那个服务，比如http服务或ftp服务，发送方端口号是进行随机端口号，目标端口号决定了接收方那个程序来接收

<!-- 这是一张图片，ocr 内容为：31 15/16 源端口号 目标端口号 发送TCP进程 32位序列号 目标端接收 对应的端口号 32位确认号 进程的端口号 >z L-Z CK RST PSH ChO 保留 4位 200护 16位窗口大小 首部 6位 长度 16位紧急指针 16位校验和 可选项 数据 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636892774959-311d177c-e9b0-46ce-ab2c-3c1de4ea3023.png)

#### 32位序列号
+ 32位序列号TCP用序列号对数据包进行标记，以便在到达目的地后重新重装，假设当前的序列号为s，发送数据长度为1，则下次发送数据时的序列号为s+1，在建立连接时通常由计算机生成一个随机数作为序列号的初始值。<!-- 这是一张图片，ocr 内容为：15/16 31 源端口号 目标端口号 发送TCP进程 32位序列号 标端接收 对应的端口号 32位确认号 进程的端口号 共e个字W <O￥ U 2S工 保留 4位 1-1范围内 0 16位窗口大小 首部 数据段标记,用于 刹目的端对到达包 长度 6位 的重组 2 接受方 4 发送方 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636894966560-872d15ce-25ba-43cc-a20c-2fdd1c2daeb8.png)

#### 确认应答号
+ 确认应答号它等一下一次应该接收到的数据的序列号，假设发送的序列号为s，数据长度为1，那么接受返回的确认应答也是s+1，发送端接收到这个确认应答后，可以认为这个位置以前所有的数据都已被正常接收。

<!-- 这是一张图片，ocr 内容为：32位序列号 2-1范围内,对发送端的确认 信息,告诉发送端这个序号之前的 32位确认号 数据段都收到了 共 S 4位 L-z <O￥ RST ChO 保留 PSH 20 首部 16位窗口大小 个字节 长度 6位 16位紧急指针 16位校验和 第认号 接受方 发送方 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636895227845-6e05fa8e-aa81-4ab0-ad45-5dffbfeb03ea.png)

#### 首部长度
+ 首部长度：TCP首部的长度，单位为4字节，如果没有可选字段，那么这里的值就是5，表示TCP首部的长度为20字节。

<!-- 这是一张图片，ocr 内容为：15/16 源端口号 目标端口号 32位序列号 0~2-1范围肉,对发送端的确认 信息,告诉发送端这个序号之前的 32位确认号 数据段都收到了 共个字节世 TO￥ L-z S 保留 PSH RST 4位 RG Y 16位窗O大小 首部 N 6位 长度 16位紧急指针 16位校验和 可选项 数据 客 签到 画板 对TCP的连接,传输和断开进行指挥 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636895332555-3f9467af-537a-4d9b-9d0d-d0b3fed550f1.png)

#### 控制位
+ 控制位TCP的连接、传输和断开都受这六个控制位的指挥
    - PSH(push急迫位)缓存区将满，立刻传输速度
    - RST(reset重置位)连接断了重新连接
    - URG(urgent紧急位)紧急信号
+ 紧急指针：尽在URG(urgent紧急位)控制位为1时有效，表示紧急数据的末尾在TCP数据部分中的位置，通常在暂时中断通信时使用(比如输入CTRL+C)

**SYN**

+ SYN(synchronous建立联机)同步序号位，TCP建立连接时要将这个值设为1.

<!-- 这是一张图片，ocr 内容为：源端口号 目标端口号 32位序列号 0~2-1范围内,对发送端的确认 信息,告诉发送端这个序号之前的 32位确认号 据段都收到了 共个字节路 L- 3kO 保留 U>Z RST TO￥ 位 PSH 16位窗口大小 首部 N 6位 长度 位紧急指针 16位校验和 为1时,请求建立 连接 可选项 数据 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636895484227-c4b356d8-e11a-4352-a315-9cf78247b4af.png)

**ACK**

+ ACK(acknowledgement确认)为1表示确认号

<!-- 这是一张图片，ocr 内容为：15 OK 16 31 源端口号 目标端口号 32位序列号 ~2"-1范围内,对发送端的确认 信息,告诉发送端这个存号之前的 ACK-1(有效)32位确认号 数据段都收到了 20 <O￥ S U F RT 保留 4位 PSH R 16位窗口大小 首部 个字节光 S 长度 6位) 16位紧急指针 16位 确认序列号有效位 表明该数据包包含 项 确认信息 数据 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636895521583-0d045060-3b87-4da7-a1fb-139f793af099.png)

**FIN**

+ FIN发送端完成位，提出断开连接的一方把FIN置为1表示要断开连接

<!-- 这是一张图片，ocr 内容为：15/16 31 源端口号 目标端口号 32位序列号 0~2-1范围内,对发送端的确认 信息,告诉发送端这个序号之前的 32位确认号 数据段都收到了 共个字节商 STz K L-z RST ChO PSH 4位 保留 16位窗口大小 首部 长度 6位 为1时,数据发送 完毕,请求断开连 急指针 16位校验和 可选项 数据 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636895558012-962cdbc0-124c-4063-9450-b2688664720d.png)

#### 窗口值
+ 窗口值：说明本地可以接收数据段的数目，这个值的大小是可变的，当网络通畅时将这个窗口值变大加快传输速度，当网络不稳定时减少这个值可以保证网络数据的可靠传输，它是来在TCP传输中进行流量控制的
+ 窗口大小：用于表示应答号开始能够接收多少个8位字节，如果窗口大小为0，可以发送窗口探测

<!-- 这是一张图片，ocr 内容为：15/16 31 目标端口号 源端口号 32位序列号 32位确认号 3hU S TO￥ PSH RS 保留 位 20 16位窗口大小 首部 N N T 长度 6位 流量控制 16位紧急指针 16位校验和 可选项 数据 网络 (不通畅) -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636895649335-a34d5c7d-e174-459c-8d52-f27bcb0a3e80.png)

#### 差错控制
+ 校验和用来做差错控制，TCP校验和的计算包括TCP首部、数据和其它填充字节，在发送TCP数据段时，由发送端计算校验和，当到达目的地时有进行一次校验和计算，如果两次校验和一致说明数据是正确的，否则将认为数据被破坏了，接收端将丢弃该数据

<!-- 这是一张图片，ocr 内容为：31 15/16 源端口号 目标端口号 32位序列号 32位确认号 共 S F <O￥ 保留 U P RS 4位 20 16位窗口大小 S 首部 H 6位 长度 流量控制 16位紧急指针 16位校验和 可选项 主要用来实现差 数据 错控制的 签到 国板 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636896324317-6644e3fd-a385-4dc1-9609-1eb002ed92f9.png)

### 三次握手和断开
+ TCP是面向连接的协议，它在源点和终点之间建立虚拟连接，而不是物理连接
+ 在数据通信之前，发送端与接收端要先建立连接，等数据发送结束后，双方再断开连接
+ TCP连接的每一方都是有一个IP地址和一个端口组成

<!-- 这是一张图片，ocr 内容为：client Server 主潮丫三翘疆事 SYNSENT LISTEN SYNsEq-X (listen()) (connect()) SYN_RCVD sYNseg-Y.ACK-x+1 ESTABLISHED ACK-y+1 ESTABLISHED seq-x+1ACK-y+1 舆斜鲜操 (write()) reado)) ACKx+2 FINseq-x+2ACK-y+ FIN_WAIT_1 士越欢团斜弱垢 close()) CLOSE_WAIT ACKX+3 LASTACK FIN_WAIT_2 FINSeg-y+1 close()) TIME_WAIT ACK-y+2 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636896517031-a5ffd1a3-4757-43ad-ad26-c53e4fca00f5.png)

<!-- 这是一张图片，ocr 内容为：tcp Destination ProtocolLengthInfo TiNe Source Ro 6656426+8000[SYN]Seq Win64240LENOMSS-65495WS-256SACKPERM 127.0.0.1 TCP 127.0.0.1 10.000000 127.0.0.1 127.0.0.1 TCP 20.000028 ACk1Nin65535LEnMSS-65495WS256SACKPERM-1 Sec 66800056426SYN,ACK 5456426+80[ACK]SeqOck-1Win25568Len 127.0.0.1 30.000103 TCP 127.0.0.1 40002842 o0[PSH,ACK]Seq 127.0.0.1 TCP 59564268000 127.0.0.1 DAek-1-Win-5255681605 TCP Win-525568Len-0 50.002854 127.0.0.1 127.0.0.1 [acK]SeceDAck-6 548000 56426 ACKSeLeDack-6Nin-525568Leri [PSH,AC TCP 127.0.0.1 66800056426 60.003197 127.0.0.1 k-13Win-525568Len-0 TCP 70.003207 54564268000 127.0.0.1 127.0.0.1 ACK]Seg6 TCP 6Ack-13Win-525568Len-O 127.0.0.1 54564268990 80004073 127.0.0.1 [FIN,ACKSeAO6 [ACKLSeqC3Ck-7win-525568Len0 127.0.0.1 54800056426 2T9P291163 90004083 127.0.0.1 TCP [FINACKJSqL3Ack7Win525568Le 54800056426 127.0.0.1 100.004123 127.0.0.1 TCP 54564268000 [ACKISeiDAck-14Win-525568Len 127.0.0.1 110004136 127.0.0.1 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636900473270-a7fed8e6-1e8a-46da-8124-0cdbcd2e699f.png)

<!-- 这是一张图片，ocr 内容为：正在捕获NpcapLoopbackAdapter 文件国确视图机转(G)撕丸9分浙闪)统计fS)电活0)无线0工具0帮咖以 月68QT 1自区日 8080 tcp.port? Protocol LengthInfo Destination Tine No. Source TCP 6657798898WSeqin6K 127.0.0.1 131.580304 127.0.0.1 66808959 TCP 141.580333 127.0.0.1 127.0.0.1 54577908080[AcK]Seq 127.0.0.1 151.580396 TCP seq-iAck-1Win-525568Len- 127.0.0.1 PSHckseq1cki-me TCP 127.0.0.1 127.0.0.1 59577908080 161.580945 171.580957 [ACK]Seq-1Ack-6win-525568Len 127.0.0.1 54808057790 TCP 127.0.0.1 59888959 127.0.0.1 TCP 127.0.0.1 181.582350 5457790+8080[Ack]seq-6Ack-6win-25568Len-0 127.0.0.1 TCP 191.582363 127.0.0.1 127.0.0.1 [FINACKSq6Ack-6wi25568e 127.0.0.1 201.584923 54577908080 TCP [ACK]Seq-6Ack-7Win-525568Len-0 54808957790 127.0.0.1 127.0.0.1 211.584936 TCP 221.585871 [FINACKSeq-6Ack-7win525568e 54808057790 127.0.0.1 127.0.0.1 TCP 231.585895 [ACK]seq-7Ack-7Win-525568Len-0 TCP 127.0.0.1 127.0.0.1 8080 5457790 Reserved:Notset 000.....?...二R NOnCE:NotSET CONgestionWinDOwREDuced(CWR):NotSe 0... +ECN-ECHO:NotsET ...0. Urgent:Notset ....0. AcKnowledgment:Set 西1 .0.Push:Notset 竖BEReset:Notset 9000000900000000000000008004500 E 0000 0800 90.284ed4000400600007Ff00 (N@ 017f00 0010 00 25 fde2 10 90200001e1beif9068f5afo9 a950 9030 08056cf30000 ACknovledgnent(top.flags.ack,1字节 分组:119.已显示:11( -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636900228413-2537b9dd-c16f-4c7a-a6bd-7b563b9c4566.png)

#### TCP服务
`src/server.js`

```javascript
const net = require('net');
const server = net.createServer((socket) => {
  // 监听客户端发过来的数据
  socket.on('data', (data) => {
    console.log(data.toString());
    socket.write('world');
  });
  // 监听客户端端口连接
  socket.on('end', () => {
    console.log('end');
  });
  socket.on('error', (error) => {
    console.log(error)
  });
});
server.listen(8089, () => {
  console.log(`server started at 8089 port`);
})
```

`src/client.js`

```javascript
const net = require('net');
const socket = new net.Socket();
socket.connect(8089, 'localhost');
socket.on('connect', (data) => {
  socket.write('hello');
});
socket.on('data', (data) => {
  console.log(data.toString());
  socket.destroy();
});
socket.on('error', (error) => {
  console.log(error)
});
```

#### 三次握手
+ [三次握手](http://c.biancheng.net/view/6425.html)
    - 第一次握手：Client将标志位SYN置为1，随机产生一个值seq=J，并将该数据包发送给Server，<font style="color:#F5222D;">Client进入SYN_SENT状态</font>，等待Server确认。
    - 第二次握手：Server收到数据包后由标志位SYN=1知道Client请求建立连接，Server将标志位SYN和ACK都置为1，ack=J+1，随机产生一个值seq=K，并将该数据包发送给Client以确认连接请求，<font style="color:#F5222D;">Server进入SYN_RCVD状态</font>。
    - 第三次握手：Client收到确认后，检查ack是否为J+1，syn是否为1，如果正确则将标志位ACK置为1，ack=k+1，并将该数据包发送给Server，Server检查ack是否为K+1，ACK是否为1，如果正确则连接建立成功，<font style="color:#F5222D;">Client和Server进入ESTABLISHED状态</font>，完成三次握手，随后Client与Server之间可以开始传输数据了。



#### 收发数据
<!-- 这是一张图片，ocr 内容为：客户端 服务端 1.创建套接字 1.创建套接字 准备工作 2.绑定地址信息 2.发起连接 3.监听 SYNSENT SYN(seq-0) SYN.ACK SYNRCVD (seg-o,ack1) ESTABLISHED ACK(seq-1ck1) ESTABLISHED PSH,ACK (seg-1,ack-1) nihaoa ACK (seq-1,ack-7) PSH.ACK (seq-1,ack-7) wohenhao ACK (seg-7,ack-9) httos://blog.csdn.nety903414 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636993456988-4b1fb07f-8e21-4df8-a74d-45edaa7dce8a.png)

三次握手连接建立后，就可以正常的数据收发。

上图中，客户端先给服务端发送数据（nihaoa），该数据长度为6个字节；自三次握手建立之后，客户端维护的seq序列为1，则服务端给客户端确认应答时，ack = 1 + 6 = 7；

服务端再给客户端发送数据（wohenhao），该数据长度为8个字节；自三次握手建立之后，服务端维护的seq序列为1，则客户端给服务端确认应答时，ack = 1 + 8 = 9；

<!-- 这是一张图片，ocr 内容为：999SHACKIsqlAk143776LEn6T138413852583 42.659660192.168.0.1.192.168.0.1. 7437828 37828TACKISEQ1Ack7Win43776LenTSyal13855243Tecr13855243 689999 52.659689192.168.0.1.192.168.0.1..TCP 37828PSHKk 68.738685192168.0.1.192168.0.1 769999 78.738713192.168.0.1192.168.0.1.T 9999 6837828 [ACKJSe9-7ACKWIn43776LEN0TSVal-13861322Tecr1386122 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636993506137-99616fdb-2445-4ab1-81d4-90ef1b1ecf1d.png)

<!-- 这是一张图片，ocr 内容为：HNm寸5n 源端口 发送数据包 数据长度 目的端口 客户端 PSHACKseg-lack1 37828 Len 6 9999 服务端 9999 1ack-7 ACK 37828 Len二O seg 服务端 7 9999 1ack ACKseg PSH 37828 8 Len 客户端 7 ACKseg 37828 Len 9 9999 ack 0 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636993540804-da24b638-384e-443e-968c-7e6771b7259b.png)

#### 四次断开
+ [四次挥手](http://c.biancheng.net/view/6428.html)
    - 第一次挥手：Client发送一个FIN，用来关闭Client到Server的数据传送，<font style="color:#F5222D;">Client进入FIN_WAIT_1状态</font>。
    - 第二次挥手：Server收到FIN后，发送一个ACK给Client，确认序号为收到序号+1（与SYN相同，一个FIN占用一个序号），<font style="color:#F5222D;">Server进入CLOSE_WAIT状态</font>。
    - 第三次挥手：Server发送一个FIN，用来关闭Server到Client的数据传送，<font style="color:#F5222D;">Server进入LAST_ACK状态</font>。
    - 第四次挥手：Client收到FIN后，<font style="color:#F5222D;">Client进入TIME_WAIT_2状态</font>，接着发送一个ACK给Server，确认序号为收到序号+1，<font style="color:#F5222D;">Server进入CLOSED状态</font>，完成四次挥手。

#### 经典问答
+ (1) 三次握手是什么或者流程？四次握手呢？答案前面分析就是。
+ (2) 为什么建立连接是三次握手，而关闭连接却是四次挥手呢？
    - 这是因为服务端在LISTEN状态下，收到建立连接请求的SYN报文后，把ACK和SYN放在一个报文里发送给客户端。而关闭连接时，当收到对方的FIN报文时，仅仅表示对方不再发送数据了但是还能接收数据，己方也未必全部数据都发送给对方了，所以己方可以立即close，也可以发送一些数据给对方后，再发送FIN报文给对方来表示同意现在关闭连接，因此，己方ACK和FIN一般都会分开发送。

### 滑动窗口
+ 滑动窗口(Sliding window)是一种流量控制技术
+ 早期的网络通信中，通信双方不会考虑网络的拥挤情况直接发送数据，由于大家不知道网络拥塞状况，同时发送数据，导致中间节点阻塞掉包，谁也发不了数据，所以有了滑动窗口机制来解决此问题
+ TCP中采用滑动窗口来进行传输控制，滑动窗口的大小意味着接收方还有多大的缓冲区可以用于接收数据，发送方可以通过滑动窗口的大小来确定该发送多少字节的数据
+ 当滑动窗口为0时，发送方一般不能再发送数据报，但有两种情况除外，一种情况是可以发送紧急数据，例如，允许用户终止在远端机上的运行进程；另一种情况是发送方可以发送一个1字节的数据来通知接收方重新声明它希望接收下一字节及发送方的滑动窗口大小

#### 窗口机制
+ 滑动窗口协议的基本原理就是在任意时刻，发送方都维持一个连续的允许发送的帧的序号，称为发送窗口；同时，接收方也维持了一个连续的允许接收的帧的序号，称为接收窗口
+ 发送窗口和接收窗口的序号的上下界不一定要一样，甚至大小也可以不同
+ 不同的滑动窗口协议窗口大小一般不同
+ 发送窗口内的序列号代表了那些已经被发送，但是还没有被确认的帧，或者是那些可以被发送的帧

<!-- 这是一张图片，ocr 内容为：A的发送窗口-20 A的发送缓存 181920 14151617 9 3 5 4 26 10 8 2 7 28293031 32 6 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636993717743-6149cdaa-4035-4c66-9f60-b7d189ebc1c6.png)

<!-- 这是一张图片，ocr 内容为：B的接收缓存 B的接收窗口-20 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636993744791-ac31f236-22f1-4f67-84cc-5bfad462e6d3.png)

#### 拥塞控制
+ TCP拥塞控制是传输控制协议(Transmission Control Protocol)避免网络拥塞的算法，是互联网上主要的一个拥塞控制措施
+ TCP使用多种拥塞控制策略来避免雪崩式拥塞，TCP会为每一条连接维护一个“拥塞窗口”来限制可能在端对端间传输的未确认分组总数量
+ 这类似TCP流量控制中使用的滑动窗口，是由发送方控制的
+ TCP在一个连接初始化或超时后使用一种“慢启动”机制来增加拥塞窗口的大小，它的起始值一般为最大分段大小(Maximum segment size，MSS)的两倍，虽然名为“慢启动”初始值也相当低，但其增长极快；当每个分段得到确认时，拥塞窗口会增加一个MSS，使得在每次往返时间(Round-trip time，RTT)内拥塞窗口能高效地双倍增长
+ 在流量控制中，接收方通过TCP的“窗口”值(Window Size)来告知发送方，由发送方通过对拥塞窗口和接收窗口的大小比较，来确定任何时刻内需要传输的数据量
+ 和式增加，积式减少(Additive- increase/Multiplicative-decrease)是一种反馈控制算法，其包含了对拥塞窗口线性增加，和当发生拥塞时对窗口积式减少，多个使用AIMD控制的TCP流量最终会收敛到对线路的等量竞争使用
+ 未确认的数据包刚好等于带宽等于延迟
+ 当发现丢包的时候立刻减半

<!-- 这是一张图片，ocr 内容为：拥塞窗口cwnd 拥塞避免 网络拥塞 加法增大" 24 拥塞避免 "加法增大" 20 乘法减小" ssthresh的初始值16 新的ssthresh值12 指数规律增长 慢开始 传输轮次 182022 6 10 16 12 14 慢开始 慢开始 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636994527007-273874db-cfae-4871-b8a5-bdea572d086f.png)

## UDP
+ UDP是一个无连接、不保证可靠性的传输层协议，也就是说发送端不关心发送的数据是否达到目标主机、数据是否出错等，收到数据的主机也不会告诉发送方是否收到数据，它的可靠性由上层协议来保障
+ 首部结构简单，在数据传输时能实现最小的开销，如果进程想发送很短的报文而对可靠性要求不高可以使用

### UDP的封装格式
#### 数据包
<!-- 这是一张图片，ocr 内容为：16 15 16位目标端口号 16位源端口号 16位UDP长度 16位UDP校验和 数据 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637044840357-02cb2623-8b3c-47ce-8420-987edd0701f6.png)

#### 数据长度
<!-- 这是一张图片，ocr 内容为：-:一15/166 16位目标端口号 16位源端口号 16位UDP校验和 16位UDP长度 包含数据的长度,可以 算出数据的结束位置 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637045919258-e1d993d5-d4b4-4b38-8545-c4be00d87fe2.png)

#### 差错控制
<!-- 这是一张图片，ocr 内容为：一一一>31 16 15 16位目标端口号 16位源端口号 16RUDP校验和 16位UDP长度 数据 UDP的差错控制 (可选) -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637045943482-8c49c055-9d7f-41ee-82c2-2da146362698.png)

### UDP的应用
+ QQ
+ 视频软件
+ TFTP 简单文件传输协议(短信)

### UDP服务器
#### 点对点
`src/server.js`

```javascript
const dgram = require('dgram');
const socket = dgram.createSocket('udp4');
socket.on('message', (msg, rinfo) => {
  console.log(msg.toString());
  console.log(rinfo);
  socket.send(msg, 0, msg.length, rinfo.port, rinfo.address);
})
socket.bind(41234, 'localhost');
```

`src/client.js`

```javascript
const dgram = require('dgram');
const socket = dgram.createSocket('udp4');
socket.on('message', (msg, rinfo) => {
  console.log(msg.toString());
  console.log(rinfo);
})
socket.send(new Buffer.from('hello world'), 0, 11, 41234, 'localhost', (error, bytes) => {
  console.log('发送了%d字节', bytes);
});
socket.on('error', (error) => {
  console.error(error);
})
```

#### 广播
+ 创建一个UDP服务器并通过该服务器进行数据的广播

`src/server.js`

```javascript
// 广播
const dgram = require('dgram');
const socket = dgram.createSocket('udp4');
socket.on('message', (msg, rinfo) => {
  const buf = Buffer.from('已经接收客户端发送的数据:'+msg.toString());
  socket.setBroadcast(true);
  socket.send(buf, 0, buf.length, 41235, 'localhost');
})
socket.bind(41234, 'localhost');
```

`src/client.js`

```javascript
// 广播
const dgram = require('dgram');
const socket = dgram.createSocket('udp4');
socket.bind(41235, 'localhost');
const buf = Buffer.from('hello');
socket.send(buf, 0, buf.length, 41234, 'localhost');
socket.on('message', (msg, rinfo) => {
  console.log('received:', msg);
})
socket.on('error', (error) => {
  console.error(error);
})
```

#### 组播
+ 所谓的组播，就是将网络中同一业务类型进行逻辑上的分组，从某个socket端口上发送的数据只能被该组中的其它主机所接收，不被组外的任何主机接收
+ 实现组播时，并不直接把数据发送给目标地址，而是将数据发送到组播主机，操作系统将把该数据组播给组内的其它所有成员
+ 在网络中，使用D类地址作为组播地址，范围是指224.0.0.0～239.255.255.255，分三类
    - 局部组播地址：224.0.0.0～224.0.0.255 为路由协议和其它用途保留
    - 预留组播地址：224.0.1.0～238.255.255.255 可用于全球范围或网络协议
    - 管理权限组播地址：239.0.0.0～239.255.255.255 组织内部使用，不可用于internet

`src/server.js`

```javascript
// 组播
const dgram = require('dgram');
const socket = dgram.createSocket('udp4');
socket.on('listening', () => {
  socket.setMulticastTTL(128);
  socket.setMulticastLoopback(true);
  socket.addMembership('230.185.192.108');
})
function broadcast () {
  const buf = Buffer.from(new Date().toLocaleDateString());
  socket.send(buf, 0, buf.length, 8080, '230.185.192.108');
}
setInterval(broadcast, 1000);

```

`src/client.js`

```javascript
// 组播
const dgram = require('dgram');
const socket = dgram.createSocket('udp4');
socket.on('listening', () => {
  socket.addMembership('230.185.192.108');
});
socket.on('message', (msg, rinfo) => {
  console.log(msg.toString());
  console.log(rinfo);
})
socket.bind('8080', '192.168.1.103');
```

### DNS服务器
#### 域名
+ 域名空间结构
+ 根域
+ 顶级域
    - 组织域
    - 国家/地区域名
+ 二级域名

| 名称类型 | 说明 | 示例 |
| --- | --- | --- |
| 根域 | 一般认为全球共有13台根逻辑域名服务器 | 单个句点(.)或句点用于末尾的名称 |
| 顶级域 | 用来指示某个国家/地区或组织使用的名称的类型名称 | .com |
| 第二层域 | 个人或组织在网上使用的注册名称 | zol.com |
| 子域 | 已注册的二级域名派生的域名 | www.zol.com |


| DNS域名称 | cn/ru | com | net | edu | Mil | gov |
| --- | --- | --- | --- | --- | --- | --- |
| 组织类型 | 中国/俄罗斯 | 商业公司 | 网络公司 | 教育机构 | 军事政府机构 | 军事政府机构 |


#### DNS服务器
+ DNS(Domain Name Service)，DNS服务器进行域名和与之对应的IP地址转换的服务器
+ IP地址不易记忆
+ 早期使用Hosts文件解析域名
    - 主要名称重复
    - 主机维护困难
+ DNS(Domain Name System)域名系统
    - 分布式
    - 层次性

#### 查找过程
<!-- 这是一张图片，ocr 内容为：13台顶级域名 13台根服务器: 服务器: a.root-servers.net a.gtld-serers.net b.root-senvers.net b.gtld-senvers.net c.root-serers.net cgtld-servers.ner d.rootserversnef d.gtld-seners.net e.root-servers.net e.gtld-senvers.net f.root-servers.net f.gtid-senvers.net com域服务器 Step3 DNS根服务器 Step5 这个域名是由.com区域管理,给 你xld-servers.ne股务器地址, 负质163com主区的服务器应该 序应该知道答案. 知道答案,给你地址你去问它吧 163.com域服务器 Step4 Step7 域名www163.com对 Step6 经查询得知此城名对应 应的IP地址是多少? 的P地址为1.1.1.1. 域名wwx.163.com别 应的P地址是多少? Step2 缓存里没有www.163.com的 记录,联系根服务器d.root- servers.net.询问域名对应 的IP地址是多少? 本地DNS服冬器 wWw163.com的IP地址是1.1.1.1 时我也写入级存,以便备查 Step8 Step1 DNS域名解析基本过程 我要访问www.163.com; 请告诉我它的IP地址 网络客户端 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637052470025-e654fcae-7218-4ea4-a5b0-70ef87fe7262.png)

### DHCP服务器
+ DHCP(Dynamic Host Configuration Protocol，动态主机配置协议)
+ 保证任何IP地址在同一时刻只能由一台DHCP客户机所使用
+ DHCP应当可以给用户分配永久固定的IP地址
+ DHCP应当可以同用其它方法获取IP地址的主机共存(如手工配置IP地址的主机)
+ DHCP服务器应当向现有的BOOTP客户端提供服务

#### 工作流程
+ 主机发送 DHCPDISCOVER 广播包在网络上寻找DHCP服务器
+ DHCP服务器向主机发送 DHCPOFFER 单播数据包，包含IP地址、MAC地址、域名信息以及地址租期
+ 主机发送 DHCPREQUEST 广播包，正式向服务器请求分配已提供的IP地址
+ DHCP服务器向主机发送 DHCPACK 单播包，确认主机请求

<!-- 这是一张图片，ocr 内容为：DHCP的交互过程: DISCOVER DHCPClient OFFER DHCPServers REQUEST DHCPClient ACK DHCPServer DHCPClient REQUEST(renew) 3chance ACK(renew) DHCPServer DHCPClient 品百商 ,广播发送,发现本网段哪台设备是DHCP服务器 Dhcpdiscover广 Dhcpoffer.DHCP服务器提供ip地址. Request:向DHCP请求P地址 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637053961259-febc066c-8657-43ad-b301-0979f3885e3b.png)

#### 抓包
<!-- 这是一张图片，ocr 内容为：*NpcapLoopbackAdapter 文件铜拍初盟)菲(_捕(9分折)统汁9电话心无送)工具0帮助() 888 南区日 微 dhcp 加 No. TiNe LengthInfo Destination Source Protocol 342DHCPDiscoverTransactionDxcb496cd4 255.255.255.255 2..45157869 DHCP 0.0.0.0 342DHCPDiscoverTransactionDoxcb496cd4 255,255.255.255 0.0.0.0 DHCP 2-.45.158110 342DHCPDiscoverTransactionDoxcb496cd4 DHCP 2-.49,156744 255.255.255.255 0.0.0.0 342DHCPDiscoveransactionDxcb496cd4 DHCP 255.255.255.255 0.0.0.0 2-..49,156792 342DHCPDiscoveTransactionDoxcb496cd4 DHCP 255.255.255.255 0.0.0.0 2...54,155902 342DHCPDiscoveTransactionDxcb496cd4 DHCP 255.255.255.255 0.0.0.0 2...54.155946 342DHCPDiscoveTransactionDoxcb496cd4 DHCP 255.255.255.255 3.-62.874113 0.0.0.0 342DHCPDiscoveransactionDoxcb496cd4 DHCP 255.255.255.255 3.62.874172 0.0.0.0 342DHCPDiscoverTransactionDoxcb496cd4 DHCP 255.255.255.255 3...78,576394 0.0.0.0 342DHCPDiscoverransactionDoxcb496cd4 255.255.255.255 DHCP 3...78.576434 0.0.0.0 UserDatagramprotocolo6o7 DynamicHostConfigurationProtocol( col(Discover) MeSsaGETYpe:BOoTREquesT(1) Hardwaretype:Ethernet(0x01) Hardwareaddresslength:6 Hops:0 TransactionID:oxcb496cd4 Secondselapsed:0 Bootpflags:ox0000(Unicast) clientIPaddress:0.0.0.0 YOUR(ClientIPaddress:0.0.0.0 NextserverIPaddress:0.0.0.0 RelayagentiPaddress:0.0.0.0 AE.EaLan.aoudeacuac.col iiAn+MAcAAAAAANA 4D.C.4 FFff00440043 0a4201010 9020 30134 49 0600cb 9030 000000 00000000 6cd40000 00 90 90 4f 9040 40 9000000000 50 00000000 9050 90 00000000 90000000 D0 90000000 0060 0000 D6 .00 00 分组:397已显示:10(2.5 空节 DymanicHostConfi nProtoco -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637055505217-7ee06478-8441-415a-ada1-0fe66562c8ea.png)

# 应用层
## 协议
<!-- 这是一张图片，ocr 内容为：应用程序 应用程序 POP3 SMTP 应用层协议 应用层协议 TCP端口号:110 TCP端口号:25 传输层协议 传输层协议 网络层 下三层协议 下习层热议 敬据链路层 物理层 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637055583010-a707dd37-5ba5-4018-8362-534779120401.png)

## 应用层常见协议
+ HTTP超文本传输协议
+ FTP文件传输协议
+ SMTP(发送邮件)和POP3(接收邮件)

## 案例
数据-->传输层(包)-->网络层(段Segment)-->数据链路层(帧)

<!-- 这是一张图片，ocr 内容为：上层数据 应用层 数据段 TCP头部 上层数据 传输层 数据包 上层数据 IP头部 TCP头部 网络层 MAC头部IP头部 TCP头部 尾部 上层数据 数据顿 数据链路层 p 比特流 物理层 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637058783041-140aea9c-c59a-4d29-b163-2ff985b46251.png)

### 发送方时从高层到低层封装数据
+ 在应用层要把各式各样的数据如字母、数字、汉字、图片等转换成二进制
+ 在TCP传输层中，上层的数据被分割成小的数据段，并为每个分段后的数据封装TCP报文头部
+ 在TCP头部有一个关键的字段信息端口号，它用于标识上层的协议或应用程序，确保上层数据的正常通信
+ 计算机可以多进程并运行，例如在发邮件的同时也可以通过浏览器浏览网页，这两种应用通过端口号进行区分
+ 在网络层，上层数据被封装上新的报文头部(IP头部)，上层的数据是包括TCP头部的，IP地址包括的最关键字段信息就是IP地址，用于标识网络的逻辑地址
+ 数据链路层，上层数据称一个MAC头部，内部有关键的是MAC地址，MAC地址就是固化在硬件设备内部的全球唯一的物理地址
+ 在物理层，无论在之前那一层封装的报文头换时上一层数据都是由二机制组成的，物理将这些二机制数字比特流转换成电信号在网络中传输

<!-- 这是一张图片，ocr 内容为：FTP服务器 食 信息 应用层 数据 数据 传输层 TCP头部 IP头部 网络层 敬据段(Segment) 数据链路层 尾部 MAC头部 敬据包(Packet) 邮局 传递部门 比特流 物理层 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636595069978-fb1ff438-3b38-4a87-988e-fcedc0bf598d.png)

### 接收方是从低层到高层封住数据
+ 数据封装完毕传输到接收方后，将数据要进行解封装
+ 在物理层，先把电信号转成二机制数据，并将数据传送至数据链路层
+ 在数据链路层，把MAC头部拆掉，并将剩余的数据传送至上一层
+ 在网络层，把数据的IP头部拆掉，并将剩余的数据传送至上一层
+ 在传输层，把TCP头部拆掉，将真实的数据传送至应用层

<!-- 这是一张图片，ocr 内容为：员工主机 应用层 数据 传输层 .272291163TCP头部 数据 网络层 IP头部数据段(Segment) 解封装 加包装 数据链路层 尾部 敬据包"(Packet MAC头部 拆包装 降去 降芒 敬据饰 物理层 比特流 邮局 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637058225054-99631377-2a54-4e20-a40c-3fdbe009f964.png)

### 真实网络环境
+ 发送方和接收方中间可能会有多个硬件中转设备
+ 中间可能会增加交换机和路由器
+ 数据在传输过程中不断地进行封装和解封装的过程，每层设备只能处理那一层的数据
    - 交换机属于数据链路层
    - 路由器属于网络层

<!-- 这是一张图片，ocr 内容为：应用慧 应局层 传嘴层 传谢量 网 网绘层 数据镇路层 数据佳路层 m场 5层 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1637058809183-b9b2f0b9-e981-483c-828d-6d6c10b36f73.png)

# 附录
## 不同层中的称为
+ 数据帧(Frame)：是一种信息单位，它的起始点和目的点都是<font style="color:#E8323C;">数据链路层</font>
+ 数据包(Packet)：也是一种信息单位，它的起始和目的的地是<font style="color:#E8323C;">网路层</font>
+ 段(Segment)：通常是指起始点和目的地都是<font style="color:#E8323C;">传输层</font>的信息单元
+ 消息(message)：是指起始点和目的地都是网络层以上(经常在<font style="color:#E8323C;">应用层</font>)的信息单元

## IP头服务类型
+ IP首部中的服务类型(TOS)
+ TOS包括共8位，包括3 bit的优先权字段(取值可以从000-111所有值)，4 bit的TOS子字段和1 bit未用位但必须置0
+ 3 bit的8个优先级的定义如下：
    - 111--Network Control(网络控制)一般保留给网络控制数据使用，如路由
    - 110--internetwork Control(网间控制)
    - 101--Critic(关键)语音数据使用
    - 100--Flash Override(疾速)视频会议和视频流使用
    - 011--Flash(闪速)语音控制数据使用
    - 010--Immediate(快速)数据业务使用

## TCP/IP
<!-- 这是一张图片，ocr 内容为：TCP/IP 常见使用UDP价 常见使用TCP协议的庄用层服务 UNIX同络服务 议的应用层罐务 第7层应用层 HTTP TELNET REXec RWho BOOTP UNNX玩程 UNIX窄 文件传输势汉 UNXX玩羚 简单业件传输协俊 各种应用程序协议,如 引特协议 打律饼饺 执行协议 Who协议 HTTP.FTPSMTP IMAP4 POP3 Filngor DHCP Login 邦局协议第34 周特网信越讳问体议罚四应 月络箭洋代输协议 POP3 UNDX锐程Shell炒饺 NTP HP网络服务 网络时间 同时使用TCP和 外议 NTFHP RFAHP RDAHP UDP协议的度用层服务 吉服婷端 网路文伴 运邦文件访 订程萱寒片 真协议 同协议 传给协俊 FANP 简单文件 远属性通知 SHTTP 服务定位协议 微软网络服务 GDP 网关发我讯议 7 x-WnDOW SUN河络服务 x-WndOw NFS RSTAT 岗单卢络 网依文件 SUN瑞口 SUN运程 系统协议 管营协饺 状态协波 映射饼饭 NIS NSMSUN 于CPAP的 SUN网络德 培状态 MOunt CMIP协放 息系城协议 监潮价汉 第6层表示层 轻挚级表示 信息的语法语义以及 DECnCt IPX 它们的关联,如加密 外部效菜泰示协饺 NBSSN 解密,转换翻译,压 NatBIos会话 缩解压缩 服服务协设 安全协议 第5层会话层 RPC 不同机器上的用户之 传输层 PX VFRPNETBIOS 远程拉程调用纱饺 VINESNETRPC 间建立及管理会话. LDAP 录访 轻量缓目 深防邦外设 第4层传输层 Dsi IPNETBIOS NOtBios 接受上一层的数据,在必 NoIBIOS ISO-TPSSP 要的时候把数据进行分 割,并将这些数据交给网 络层,且保证这些数据段 MOBIKEIP VanJacobson 传输适配层 塞于TCP之上 移咖P协读 有效到达对端. 接口协议 TCP传输控制协议 UDP用户效起摄协设 安全协议 第3层网络层 ESP 安全封哭有 互联网协效/互联阿 控制子网的运行,如逻 效我得莎议 辑编址,分组传输,路 串行线路P街议 路由协议 由选择. ICMPY6 EGP RSVP 互联用控制 x25 外鲜同关协议 系预霸协议 信息协液 3 VRRP IE-IRGP 桥最楼式线 开是通路 墙盆内部网关路 虚拟盛由 银沟控村 经味先绑饺 立组标洗汉 器爪余协议 由医掉分议 PGM RIPNGfORIPY6 IGMP 内都风关 妞播开放最退 安际通用白并 亚离天鲁组 NenWare IPv6路由信息萨设 互联网组 价饭 管理协设 地址解析协设 成道纱议 clsco协设 数据链路层 第2层 MPLS CDP ARP L2TP PPTP 臣管传 地址解码 总料发 2 物理寻址,同时将原 点对点您亩分议 二层拯酒协设 签安换静设 始比特流转变为逻辑 CGMP RARP ATMP 12F 传输线路. 理闵地址 入攀道管理 思科迦 第二层转发协汉 串行逢接封装协议 IP套IP封装协设 解新纷饺 管电协议 第1层物理层 IEEE802.2 机械,电子,定时接 Ethernetv.2 口通信信道上的原始 比特流传输. Internetwork -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1636555837518-43ea82d1-5c77-4357-af85-ada0683ee2fa.png)

# 参考
[ARP报文格式详解](http://c.biancheng.net/view/6389.html)



[TCP/IP 教程 | 菜鸟教程](https://www.runoob.com/tcpip/tcpip-tutorial.html)

