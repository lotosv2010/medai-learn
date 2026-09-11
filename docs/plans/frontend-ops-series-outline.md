# 前端运维系列公众号文章大纲（系列 13）

> 所属系列：前端运维
> 写作原则：使用与实践 → 设计与原理 → 配置解析 → 实践演示与验证 → 参考
> 目标读者：5-10 年前端或全栈经验，正在补齐 Linux / 容器 / 网关 / CI-CD / 容器编排的运维底层能力，备战高级/专家岗面试中的运维知识考察
> 与其他系列的分工：本系列讲的是"部署环境本身"的原理与配置（操作系统、容器、网关、流水线、编排），不涉及具体业务代码怎么写。凡是"这个进程/请求/资源是怎么被系统调度和隔离的"都在本系列讲透；涉及具体语言运行时怎么在这些设施上运行的内容（如 Node.js 应用怎么打包、Nginx 怎么反代到 Node 服务）不重复讲对应运行时系列已讲过的内容，只讲运维设施这一侧的原理和配置。

---

## 系列定位

**「前端运维深度拆解」系列**

- 篇数：18 篇
- 核心主线：Linux 系统底层能力（9 篇）→ Docker 容器化（2 篇）→ Nginx 网关配置（2 篇）→ Jenkins CI/CD 自动化（2 篇）→ Kubernetes 容器编排（3 篇）——按"部署环境从裸机到编排"的自然依赖顺序排列：Docker 的隔离能力建立在 Linux Namespace/Cgroups 之上，Nginx/Jenkins 的进程管理依赖 Linux 服务管理机制，Kubernetes 又是对多个 Docker 容器的编排调度，前面篇章的系统能力是后面篇章的直接地基
- 内容结构：五段式（使用与实践 → 设计与原理 → 配置解析 → 实践演示与验证 → 参考）——运维类文章的"配置解析"部分以官方文档规范条款 + 权威开源实现源码路径为主，"实践演示与验证"部分侧重可在本机或云主机上直接复现的命令行操作，重在建立可验证的操作直觉而非停留在概念记忆
- 特色：每篇 3-5 个「面试核心问」；示例统一沿用医疗场景命名（药品/处方/患者/医院管理系统 HIS）；Kubernetes 部分定位为"面试向 + 能看懂线上配置"，不深入自建集群运维、网络插件源码、调度器算法实现等 SRE 专职方向的内容

---

## 文章规划总览

| 编号 | 标题 | 核心主题 | 状态 |
|------|------|----------|------|
| 01 | Linux 基础与文件系统：发行版脉络/FHS 目录结构/权限位与 inode/常用命令实战 | Linux 基础 | ⬜ 待写 |
| 02 | Vim 编辑器：三种模式切换/移动编辑命令/查找替换/配置定制 | Vim | ⬜ 待写 |
| 03 | 用户与权限管理：用户组模型/UID-GID/chmod-chown/SUID-SGID-Sticky Bit | 用户权限 | ⬜ 待写 |
| 04 | 认证与安全：SSH 密钥认证原理/sudo 权限委派/PAM 机制/免密登录实战 | 认证安全 | ⬜ 待写 |
| 05 | Shell 与脚本：Bash 语法/管道重定向/grep-sed-awk 文本三剑客/脚本调试 | Shell 脚本 | ⬜ 待写 |
| 06 | 包管理：apt-yum-dpkg-rpm 对比/依赖解析原理/源码编译安装 | 包管理 | ⬜ 待写 |
| 07 | 系统资源与进程管理：ps-top-free-df/CPU 负载与内存指标/进程信号与孤儿僵尸进程 | 系统资源 | ⬜ 待写 |
| 08 | 服务与 systemd：init 系统演进/unit 文件/服务生命周期管理/journalctl 日志 | 服务管理 | ⬜ 待写 |
| 09 | 网络配置与排查：网络命名空间基础/ip-netstat-ss-curl/iptables-firewalld/端口排查实战 | 网络排查 | ⬜ 待写 |
| 10 | Docker 核心原理：容器与虚拟机对比/Namespace 隔离/Cgroups 资源限制/UnionFS 镜像分层 | Docker 原理 | ⬜ 待写 |
| 11 | Dockerfile 与生产实践：多阶段构建/Layer 缓存/Compose 编排/数据卷与网络模式 | Docker 实践 | ⬜ 待写 |
| 12 | Nginx 核心与反向代理配置：master-worker 进程模型/配置文件结构/反向代理与负载均衡实操 | Nginx 核心 | ⬜ 待写 |
| 13 | Nginx 生产实战：SPA history 路由/gzip 与缓存头/HTTPS 证书配置/常见性能调优 | Nginx 实战 | ⬜ 待写 |
| 14 | Jenkins 核心概念：CI-CD 理念/Master-Agent 架构/插件体系/自由风格任务 | Jenkins 核心 | ⬜ 待写 |
| 15 | Jenkins Pipeline 实战：Jenkinsfile 声明式语法/多分支流水线/集成 Docker 构建/自动化部署 | Jenkins 实战 | ⬜ 待写 |
| 16 | Kubernetes 核心概念：架构组件/Pod-Deployment-Service/命名空间/kubectl 基本操作 | K8s 核心 | ⬜ 待写 |
| 17 | Kubernetes 配置与网络：ConfigMap-Secret/Ingress 路由/PV-PVC 存储卷/服务发现原理 | K8s 配置网络 | ⬜ 待写 |
| 18 | Kubernetes 前端部署实战：容器化部署/滚动更新与健康检查/HPA 自动扩缩容/故障排查 | K8s 部署实战 | ⬜ 待写 |

---

## 各篇详细大纲

### 第 01 篇：Linux 基础与文件系统：发行版脉络/FHS 目录结构/权限位与 inode/常用命令实战

**副标题**：从"为什么有这么多发行版"到"一切皆文件"的目录组织哲学，再到权限位背后的 inode 数据结构

#### 一、使用与实践

- `uname -a`/`cat /etc/os-release` 查看当前系统内核版本与发行版信息
- `ls -li`/`stat file` 查看文件的 inode 号与详细元信息
- `ls -l` 权限位字符（`drwxr-xr-x`）的逐位含义现场解读
- `df -h`/`du -sh`/`lsblk` 查看磁盘挂载与占用情况
- 医院 HIS 系统部署脚本里常见的目录约定：应用装在 `/opt/his-api`，日志写到 `/var/log/his-api`，配置放 `/etc/his-api`——现场对照 FHS 规范逐条解释为什么这么放

#### 二、设计与原理

- **发行版脉络**：Linux 严格来说只是一个内核，发行版是"内核 + 包管理 + 一套用户空间工具"的组合——按包管理谱系可以分成三条主线：Debian 系（Debian/Ubuntu，`apt`/`dpkg`）、RHEL 系（RHEL/CentOS/Rocky Linux，`yum`/`dnf`/`rpm`）、其他独立谱系（Alpine 用 `apk`，体积极小，是容器镜像的常见基础镜像）——理解这条谱系关系，才能看懂"同一个命令在不同发行版上包名/参数不一样"的根本原因
- **FHS（Filesystem Hierarchy Standard）目录结构**（重点）：`/bin`/`/sbin` 系统命令，`/etc` 配置文件，`/var` 运行时可变数据（日志/缓存/PID 文件），`/opt` 第三方独立软件包，`/home` 用户目录，`/tmp` 临时文件（重启清空），`/proc`/`/sys` 是内核向用户空间暴露的虚拟文件系统（不占用磁盘，实时反映内核状态）——记住这套规范不是死记硬背路径，而是理解"数据的生命周期和用途决定了它该放哪"这条设计原则
- **一切皆文件**：Linux 把设备（`/dev/sda`）、进程信息（`/proc/1/status`）、内核参数（`/sys/class/...`）都抽象成文件路径，统一用同一套系统调用（`open`/`read`/`write`）访问——这是"进程排查为什么要看 `/proc/<pid>/`"这类操作背后的设计哲学
- **inode 与文件权限位**（重点）：文件名只是目录项里指向 inode 的一个映射，inode 本身存储文件的元信息（权限、所有者、大小、数据块指针），不存储文件名——这解释了"硬链接为什么两个不同路径指向同一份数据"（共享同一个 inode）、"删除一个文件为什么只是删掉目录项而不一定立即释放磁盘空间"（inode 的链接计数归零才真正释放）；权限位 `rwx` 分别对 owner/group/other 三组身份生效，对目录而言 `x` 权限的含义是"能否 `cd` 进入并列出内部文件的 inode 信息"，不同于对普通文件的"可执行"含义，这个目录/文件语义差异是高频面试混淆点
- **软链接与硬链接的本质区别**：硬链接是"多个目录项共享同一个 inode"，不能跨文件系统，删除源文件不影响硬链接；软链接是"一个独立的文件，内容是目标路径的字符串"，可以跨文件系统，删除源文件会导致软链接失效（悬空链接）

#### 三、配置解析

1. FHS 规范全文：Linux Foundation `Filesystem Hierarchy Standard` 3.0 — 各顶级目录用途的正式定义
2. `man 7 inode`（Linux man-pages 项目）— inode 结构字段详解
3. `man 1 ls`/`man 1 chmod` — 权限位显示格式与修改语法规范

#### 四、实践演示与验证

在本机或云主机上创建一个文件，用 `ls -li` 记录其 inode 号；用 `ln file file_hard` 创建硬链接，`ln -s file file_soft` 创建软链接，再用 `ls -li` 对比三者的 inode 号（硬链接与源文件相同，软链接是新的 inode）；删除源文件后分别用 `cat file_hard` 和 `cat file_soft` 验证硬链接依然能访问数据、软链接变成悬空链接。

#### 五、参考
- https://refspecs.linuxfoundation.org/FHS_3.0/fhs-3.0.html
- https://man7.org/linux/man-pages/man7/inode.7.html
- https://man7.org/linux/man-pages/man1/chmod.1.html

**面试核心问**：
- Linux 内核和发行版是什么关系？主流发行版按包管理可以分成哪几条谱系？
- FHS 规范里 `/etc`、`/var`、`/opt` 分别存放什么类型的数据，设计依据是什么？
- inode 和文件名是什么关系？硬链接和软链接的本质区别是什么？
- 目录的 `x` 权限位和普通文件的 `x` 权限位含义有什么不同？

---

### 第 02 篇：Vim 编辑器：三种模式切换/移动编辑命令/查找替换/配置定制

**副标题**：没有鼠标的年代设计出的编辑范式，为什么至今仍是服务器运维的默认工具

#### 一、使用与实践

- `vim file` 打开文件，`i`/`a`/`o` 进入插入模式，`Esc` 返回普通模式，`:wq`/`:q!` 保存退出
- 普通模式下移动：`hjkl`、`w`/`b`（按单词跳转）、`gg`/`G`（跳转到文件头尾）、`0`/`$`（行首行尾）
- 编辑命令组合：`dd`（删除行）、`yy`（复制行）、`p`（粘贴）、`dw`（删除一个单词）、`3dd`（删除 3 行，数字前缀是重复次数）
- 查找替换：`/pattern` 查找，`n`/`N` 跳到下一个/上一个匹配；`:%s/old/new/g` 全文替换
- 在医院 HIS 系统的 Linux 服务器上紧急修改一个 Nginx 配置文件的现场演示：SSH 登录后没有 GUI，只能用 Vim 快速定位并修改一行配置

#### 二、设计与原理

- **模式化编辑的设计动机**：Vim 的前身 vi 诞生于终端只能发送字符流、没有方向键甚至没有 Esc 键独立设计的年代——把"移动/删除/复制"这类命令操作和"输入文本"操作分离成两种模式，让单个字母键就能承载一个完整命令（如 `dd` 删除一行），大幅减少击键次数，这是模式化编辑相比"所有按键都直接输入文字"的编辑器的核心设计权衡：**牺牲学习曲线换取长期编辑效率**
- **普通模式命令的组合语法**：Vim 命令遵循 `[次数][操作符][范围]` 的语法结构，例如 `3dw` 表示"删除 3 个单词"，`d$` 表示"删除到行尾"——理解这套语法比死记硬背具体命令更重要，因为它能让你现场推导出没见过的命令组合的含义
- **可视模式（Visual Mode）**：`v` 进入字符可视模式，`V` 进入行可视模式，`Ctrl+v` 进入块可视模式——用于选中一段范围后统一执行操作（删除/复制/替换），是"先选中再操作"这种更符合直觉的编辑范式在 Vim 里的对应实现
- **为什么运维场景默认装 Vim 而不是其他编辑器**：几乎所有 Linux 发行版的最小化安装都自带 vi/Vim，而 nano、Emacs 等未必默认安装；在只能通过 SSH 终端操作、没有图形界面、网络延迟较高的服务器环境下，Vim 不依赖鼠标、所有操作都是键盘命令、且对终端环境要求极低，这是它成为运维标配的现实原因，而不是"更好用"这种主观评价
- **`.vimrc` 配置定制**：`set number`（显示行号）、`syntax on`（语法高亮）、`set expandtab`/`set tabstop=2`（缩进风格）等选项写入 `~/.vimrc` 后每次打开 Vim 自动生效——理解配置文件在 Vim 启动时的加载时机，才能排查"改了配置为什么不生效"（常见原因：改的是系统级 `/etc/vimrc` 但用户级配置覆盖了它，或者反过来）

#### 三、配置解析

1. Vim 官方文档 `:help usr_02.txt`（Vim 内置帮助系统"移动光标"章节）— 移动命令的完整分类
2. Vim 官方文档 `:help change.txt` — 编辑操作符与范围组合的语法规则
3. `vim-runtime` 项目 `.vimrc` 示例配置 — 常见选项的作用与默认值

#### 四、实践演示与验证

在终端里创建一个多行文本文件，practice 一套连续操作：用 `/关键词` 定位到某一行，`dd` 删除该行，`u` 撤销，`Ctrl+r` 重做，`:%s/foo/bar/g` 全文替换，最后 `:wq` 保存退出，验证每一步操作后文件内容的变化，建立命令与效果的直接对应关系。

#### 五、参考
- https://www.vim.org/docs.php
- https://vimhelp.org/usr_02.txt.html
- https://vimhelp.org/change.txt.html

**面试核心问**：
- Vim 为什么要设计成"模式化编辑"，这种设计解决了什么问题？
- 普通模式下命令的组合语法规律是什么？举例说明如何推导一个没见过的命令组合
- 为什么服务器运维场景默认用 Vim 而不是图形化编辑器？

---

### 第 03 篇：用户与权限管理：用户组模型/UID-GID/chmod-chown/SUID-SGID-Sticky Bit

**副标题**：多用户系统的隔离基础，以及那些容易被面试问倒的特殊权限位

#### 一、使用与实践

- `whoami`/`id`/`groups` 查看当前用户的 UID、GID 与所属组
- `useradd`/`usermod -aG`/`groupadd` 创建用户与用户组，加入附加组
- `cat /etc/passwd`/`cat /etc/group`/`cat /etc/shadow` 查看用户与密码信息的存储格式
- `chmod 755 file`/`chmod u+x file`/`chown user:group file` 数字模式与符号模式两种权限修改方式对比
- 医院 HIS 系统里"部署账号只能重启自己的服务，不能操作数据库账号的文件"这种最小权限原则的实际落地：不同职责用不同的系统用户和用户组隔离

#### 二、设计与原理

- **UID/GID 与用户名的关系**：内核层面识别用户和组的真正标识是数字化的 UID/GID，`/etc/passwd`/`/etc/group` 只是维护了"数字 ID 到可读名字"的映射表——这解释了"删除用户后残留文件的所有者显示为一串数字"这个现象：文件元数据里存的是 UID，映射关系没了，`ls` 就没法反查到名字
- **root 与 UID 0**：UID 为 0 的用户拥有绕过几乎所有权限检查的特权，"root"只是这个 UID 默认对应的用户名——如果给另一个用户名手动把 UID 改成 0，它就拥有和 root 完全相同的权限，这是理解"为什么不能随便修改 UID"的关键
- **文件权限的三组身份与检查顺序**：owner/group/other 三组权限位，内核检查权限时的顺序是：先判断请求用户是否是 owner，是则只看 owner 权限位（即使 other 权限更宽松也不生效）；不是 owner 再判断是否属于该文件的 group，是则只看 group 权限位；都不是才看 other 权限位——这个"短路"检查顺序是"为什么我明明在 other 里给了执行权限，但因为我是 owner 而 owner 权限没给执行权限，结果还是执行不了"这类问题的根源
- **SUID（Set User ID）**（重点）：可执行文件设置 SUID 后，任何用户执行它时，进程的**有效用户身份会临时变成文件所有者的身份**，而不是执行者自己——经典例子是 `passwd` 命令：普通用户需要修改自己的密码，但密码文件 `/etc/shadow` 只有 root 能写，`passwd` 命令文件所有者是 root 且设置了 SUID，普通用户执行它时临时获得 root 权限完成写入，执行结束后权限恢复——理解这个机制才能回答"为什么一个普通用户执行的命令能修改只有 root 能改的文件"
- **SGID 与 Sticky Bit**：SGID 作用于目录时，目录内新建的文件会自动继承该目录的用户组（而不是创建者的默认组），常用于多用户协作目录统一文件归属；Sticky Bit 最典型的应用是 `/tmp` 目录——该目录对所有用户可写，但设置 Sticky Bit 后，用户只能删除自己创建的文件，即使其他用户对该目录有写权限也不能删别人的文件，这是"公共可写目录如何防止用户互相删除文件"的标准方案
- **权限位的数字表示**：`chmod 4755` 中最高位的 `4` 表示 SUID，`2` 表示 SGID，`1` 表示 Sticky Bit，可以组合叠加（如 `6755` 同时设置 SUID 和 SGID）——这组"隐藏的第四位"是权限位数字表示法里最容易被面试问到但最容易被忽略的部分

#### 三、配置解析

1. `man 5 passwd`/`man 5 group`（Linux man-pages）— `/etc/passwd`、`/etc/group` 文件字段格式
2. `man 1 chmod` — SUID/SGID/Sticky Bit 的数字与符号表示法
3. `man 2 setuid`（系统调用手册）— 进程有效用户 ID 切换的内核行为

#### 四、实践演示与验证

创建两个测试用户，在共享目录上分别测试：不设置 Sticky Bit 时用户 B 能删除用户 A 创建的文件；设置 `chmod +t` 后用户 B 无法删除；再手写一个简单的 C 程序或 shell 脚本模拟"设置 SUID 后执行者获得文件所有者权限"的效果（如用 `chmod u+s` 处理一个只有 root 能执行的读取脚本，观察普通用户执行后的实际权限）。

#### 五、参考
- https://man7.org/linux/man-pages/man5/passwd.5.html
- https://man7.org/linux/man-pages/man1/chmod.1.html
- https://man7.org/linux/man-pages/man2/setuid.2.html

**面试核心问**：
- UID/GID 和用户名是什么关系？删除用户后文件所有者显示一串数字是为什么？
- Linux 检查文件权限时 owner/group/other 三组权限位的检查顺序是怎样的？
- SUID 是什么机制？`passwd` 命令为什么普通用户也能执行成功？
- Sticky Bit 解决了什么问题？`/tmp` 目录为什么需要它？

---

### 第 04 篇：认证与安全：SSH 密钥认证原理/sudo 权限委派/PAM 机制/免密登录实战

**副标题**：非对称加密如何证明"你就是你"，以及权限委派与统一认证框架的设计

#### 一、使用与实践

- `ssh-keygen -t ed25519` 生成密钥对，`ssh-copy-id user@host` 把公钥推送到远程服务器
- `ssh -i private_key user@host` 用指定私钥登录，观察免密登录的完整过程
- `visudo` 编辑 sudo 权限规则，配置"某用户只能以 root 身份重启指定服务，不能执行任意命令"这种最小权限委派
- `cat ~/.ssh/authorized_keys`/`cat ~/.ssh/known_hosts` 查看公钥授权列表与主机指纹缓存
- 医院 HIS 系统运维场景：给新加入的运维同事配置一个受限的 sudo 权限，只允许重启 `his-api` 服务，不能操作数据库或删除日志

#### 二、设计与原理

- **SSH 密钥认证的非对称加密原理**（重点）：客户端生成一对密钥，私钥留在本地永不外传，公钥推送到远程服务器的 `~/.ssh/authorized_keys`——认证时服务端用存储的公钥生成一个随机挑战数据并加密发给客户端，客户端用私钥解密后证明"我确实持有对应的私钥"，整个过程私钥从未在网络上传输，这是"密钥认证比密码认证更安全"的根本原因（密码认证是直接把密码发给服务端比对，即使加密传输也存在暴力破解和密码复用风险）
- **密码认证与密钥认证的对比**：密码是一个共享秘密，服务端需要存储密码的哈希用于比对，一旦服务端数据泄露所有用户密码哈希都暴露在暴力破解风险下；密钥认证服务端只存公钥，公钥泄露不会危及私钥安全，这是生产环境普遍推荐关闭密码认证、只允许密钥认证登录服务器的原因
- **`known_hosts` 与中间人攻击防御**：SSH 客户端首次连接一个新服务器时会提示"是否信任这个主机指纹"，确认后写入 `~/.ssh/known_hosts`——这是为了防止中间人攻击：如果之后连接同一个 IP 时对方返回的主机密钥指纹和缓存的不一致，SSH 会拒绝连接并强烈警告，因为这可能意味着流量被劫持到了伪造的服务器
- **sudo 的权限委派模型**：sudo 不是"临时变成 root"这么简单，它是一套可以精细配置的权限委派机制——`/etc/sudoers` 可以指定"某用户/组，可以以哪个身份（默认 root），执行哪些具体命令（可以用通配符限定路径避免绕过），是否需要再次输入密码"——精细配置 sudo 规则是"最小权限原则"在日常运维授权中最直接的实践场景
- **PAM（Pluggable Authentication Modules）机制**：Linux 系统级认证（登录、`sudo`、`su`、SSH 登录等场景）并不是每个程序各自实现一套认证逻辑，而是统一通过 PAM 这套可插拔的认证框架——系统管理员可以在 `/etc/pam.d/` 下为不同服务配置认证策略（如"连续 5 次密码错误锁定账户 10 分钟"这种策略），修改 PAM 配置就能同时影响所有基于 PAM 认证的服务，不需要逐个改代码——这是"统一认证框架"设计思想在操作系统层面的体现，好比应用层的统一鉴权中间件
- **`ssh-agent` 与密钥转发**：如果私钥本身设置了密码保护，每次使用都要输入密码解锁很繁琐——`ssh-agent` 在会话期间常驻内存持有解密后的私钥，后续 SSH 连接直接向 agent 请求签名而不需要重复输入密码，这是"密钥安全性"与"使用便捷性"之间的一个折中方案

#### 三、配置解析

1. SSH 协议规范：RFC 4252（SSH 认证协议）— 公钥认证方法的消息交换流程
2. `man 5 sudoers`（Linux man-pages）— sudo 权限规则语法与常用限定方式
3. Linux-PAM 官方文档 *System Administrators' Guide* — PAM 配置文件结构与常见模块

#### 四、实践演示与验证

在一台测试服务器上完整走一遍免密登录配置：生成密钥对 → 推送公钥 → 关闭密码认证（`PasswordAuthentication no`）→ 验证只能用密钥登录，密码登录被拒绝；再配置一条 sudo 规则，只允许某用户执行 `systemctl restart his-api`，验证该用户执行其他 `sudo` 命令（如 `sudo rm`）会被拒绝。

#### 五、参考
- https://www.rfc-editor.org/rfc/rfc4252
- https://man7.org/linux/man-pages/man5/sudoers.5.html
- http://www.linux-pam.org/Linux-PAM-html/

**面试核心问**：
- SSH 密钥认证的非对称加密原理是什么？为什么比密码认证更安全？
- `known_hosts` 机制是用来防御什么攻击的？
- sudo 权限委派怎么做到"只允许执行指定命令"这种最小权限控制？
- PAM 是什么？它解决了"每个需要认证的程序各自实现一套认证逻辑"的什么问题？

---

### 第 05 篇：Shell 与脚本：Bash 语法/管道重定向/grep-sed-awk 文本三剑客/脚本调试

**副标题**：把一堆命令行工具串成自动化流水线的粘合语言

#### 一、使用与实践

- 管道 `|` 把多个命令串联：`ps aux | grep node | awk '{print $2}'` 提取进程 PID
- 重定向：`command > file`（覆盖写）、`command >> file`（追加写）、`command 2>&1`（合并标准错误到标准输出）
- Bash 变量、条件判断 `if [[ ]]`、循环 `for`/`while`、函数定义的基本语法
- `grep -E`（扩展正则）、`sed -i 's/old/new/g' file`（原地替换）、`awk '{print $1, $3}'`（按列提取）三个工具的典型用法对比
- 医院 HIS 系统的一个日常运维脚本示例：批量检查多台服务器上 `his-api` 服务是否存活，不存活则自动重启并发送告警

#### 二、设计与原理

- **管道的设计本质**：`|` 把前一个命令的标准输出直接连接到下一个命令的标准输入，底层是内核创建的一个匿名管道（一段环形缓冲区），两个进程通过文件描述符读写这段共享内存——这是 Unix"小工具组合"设计哲学的直接体现：每个命令只做一件事并做好，复杂功能通过管道把多个单一职责的命令串联实现，而不是造一个大而全的工具
- **标准输入/输出/错误的三个文件描述符**：每个进程默认打开 fd 0（stdin）、fd 1（stdout）、fd 2（stderr）——重定向本质是修改这些文件描述符指向的目标；`2>&1` 读作"把 fd 2 重定向到 fd 1 当前指向的目标"，这个语法顺序容易搞反（`> file 2>&1` 和 `2>&1 > file` 效果不同，前者 stdout 和 stderr 都写入 file，后者 stderr 仍指向终端），是高频面试和实际踩坑点
- **grep/sed/awk 的定位差异**：grep 只做"过滤匹配行"，是三者中最简单的；sed 是"流编辑器"，逐行处理输入并执行替换/删除等编辑操作，适合"对文本做变换但不需要复杂逻辑"的场景；awk 本身是一门完整的编程语言，天然按字段（列）分割每一行，适合"需要按列提取、聚合计算、格式化输出"的场景——三者不是相互替代关系，而是复杂度递进关系，实际脚本里常组合使用（如先用 grep 过滤出关注的行，再用 awk 提取需要的列）
- **正则表达式在三个工具里的方言差异**：grep 默认是 BRE（基本正则），`grep -E` 才是 ERE（扩展正则，支持 `+`/`?`/`|` 等不需要转义）；sed 默认也是 BRE；awk 使用的是接近 ERE 的正则方言——不清楚这个差异会导致"同样的正则在 grep 里加转义能用，直接搬到 awk 里却报错"
- **Bash 脚本的健壮性写法**：`set -euo pipefail` 是生产脚本的标配开头——`-e` 遇到任何命令返回非零退出码立即终止脚本（避免错误被忽略后继续执行导致连锁问题）；`-u` 引用未定义变量时报错而不是静默展开成空字符串；`-o pipefail` 让管道中任意一环失败都让整个管道的退出码非零（默认 Bash 管道的退出码只看最后一个命令，会掩盖前面命令的失败）
- **命令替换与变量作用域**：`` `command` `` 和 `$(command)` 都是命令替换（把命令输出捕获成字符串），后者支持嵌套且更易读；函数内部变量默认是全局的，需要显式 `local` 声明才会限制在函数作用域内，这是"脚本里函数改了一个变量，函数外也被意外改变"这类 bug 的常见原因

#### 三、配置解析

1. GNU Bash 官方手册 *Bash Reference Manual* — 变量展开、条件测试、管道语法的规范定义
2. GNU grep/sed/awk 官方手册 — 三个工具各自的正则方言与命令行选项
3. `man 1 bash`（`set` 内置命令部分）— `-e`/`-u`/`-o pipefail` 选项的精确行为定义

#### 四、实践演示与验证

写一个脚本模拟日常运维场景：遍历一个进程名列表，用 `ps aux | grep` 检查每个进程是否存活，存活则用 `awk` 提取其内存占用并累加统计，不存活则打印告警信息；分别在开启和不开启 `set -euo pipefail` 的情况下，故意让脚本中间一步命令失败，对比两种情况下脚本的执行行为差异，直观理解这几个选项的实际作用。

#### 五、参考
- https://www.gnu.org/software/bash/manual/bash.html
- https://www.gnu.org/software/gawk/manual/gawk.html
- https://www.gnu.org/software/sed/manual/sed.html

**面试核心问**：
- 管道 `|` 底层是怎么实现两个进程间数据传递的？
- `command > file 2>&1` 和 `command 2>&1 > file` 的效果有什么区别？为什么？
- grep、sed、awk 三个工具的定位差异是什么？什么场景该选哪个？
- 生产脚本为什么建议开头写 `set -euo pipefail`？三个选项分别解决什么问题？

---

### 第 06 篇：包管理：apt-yum-dpkg-rpm 对比/依赖解析原理/源码编译安装

**副标题**：从"手动下载编译"到"一条命令自动装好依赖"，包管理器解决的核心问题

#### 一、使用与实践

- Debian 系：`apt update`/`apt install nginx`/`apt remove`/`dpkg -l`（列出已安装包）/`dpkg -L package`（查看包内文件列表）
- RHEL 系：`yum install nginx`/`dnf install nginx`（`dnf` 是 `yum` 的下一代实现）/`rpm -qa`/`rpm -ql package`
- `apt search`/`yum search` 搜索可用包，`apt show`/`yum info` 查看包详情与依赖列表
- 添加第三方软件源：`add-apt-repository`（Debian 系）或编辑 `/etc/yum.repos.d/`（RHEL 系）下的 repo 文件
- 医院 HIS 系统服务器上安装 Node.js 官方源提供的指定版本（而不是系统默认仓库里可能过旧的版本）的实际操作演示

#### 二、设计与原理

- **包管理要解决的核心问题**：软件安装不只是复制文件，还涉及"这个软件依赖哪些其他软件/库，这些依赖是否已经装好，版本是否兼容"——如果没有包管理器，用户需要手动追踪整棵依赖树、逐个下载编译安装，包管理器把这套依赖解析和版本兼容检查自动化了
- **两条谱系的技术选型差异**：Debian 系用 `.deb` 包格式，底层工具是 `dpkg`（只管理单个包的安装/卸载，不解析依赖），`apt` 是在 `dpkg` 之上的高层工具，负责联网下载、依赖解析、版本冲突处理；RHEL 系对应关系类似——`.rpm` 包格式，底层工具 `rpm`（同样不解析依赖），`yum`/`dnf` 是高层工具——这个"底层包格式管理器 + 高层依赖解析器"的两层架构在两条谱系里是对称的
- **依赖解析的本质**：包管理器维护一份"软件源索引"（记录每个包的版本、依赖列表、下载地址），安装一个包时递归查询它的所有依赖，构建出一棵完整的依赖树，再按依赖顺序（被依赖的先装）批量安装——版本冲突（A 需要 lib1.0，B 需要 lib2.0）是依赖解析中最复杂的情况，不同包管理器的冲突处理策略（拒绝安装 vs 允许多版本共存）是选型差异点之一
- **源码编译安装（`./configure && make && make install`）**：包管理器安装的是预编译好的二进制包，方便快捷但版本和编译选项受限于软件源提供的版本；源码编译安装则是从源代码现场编译，可以自定义编译选项（如指定安装路径、开启/关闭某些功能模块），代价是编译耗时、需要手动处理编译依赖（`build-essential`/`gcc` 等）、且不会被包管理器追踪（后续升级/卸载都要手动处理）——这是"什么场景该用包管理器装、什么场景要从源码编译"的判断依据
- **软件源的信任机制**：包管理器从远程软件源下载包时，会用 GPG 签名验证包的完整性和来源真实性——添加第三方软件源本质上是"扩展了信任范围"，如果添加了不可信的源就等于给了对方在你系统上执行任意代码的能力，这是生产环境需要谨慎添加第三方源、优先使用官方或知名厂商维护的源的安全考量

#### 三、配置解析

1. Debian 官方文档 *Debian Policy Manual* 依赖关系章节 — `Depends`/`Recommends`/`Conflicts` 字段语义
2. RPM 官方文档 *Maximum RPM* — RPM 包格式与依赖字段定义
3. `man 1 apt`/`man 8 yum` — 常用子命令与选项

#### 四、实践演示与验证

在一台 Debian 系和一台 RHEL 系的测试环境（或容器）里分别执行同一个软件（如 `nginx`）的安装，对比 `apt install`/`yum install` 的输出日志中"依赖解析"这一阶段列出的依赖包列表；用 `apt-cache depends nginx`/`yum deplist nginx` 单独查看依赖树，验证包管理器确实是先解析出完整依赖树再执行安装。

#### 五、参考
- https://www.debian.org/doc/debian-policy/ch-relationships.html
- https://rpm-guide.readthedocs.io/en/latest/
- https://wiki.debian.org/AptCLI

**面试核心问**：
- `dpkg`/`rpm` 和 `apt`/`yum` 分别负责什么，两者是什么关系？
- 包管理器怎么解决依赖版本冲突问题？
- 什么场景应该用包管理器安装，什么场景应该从源码编译？
- 添加第三方软件源有什么安全风险？

---

### 第 07 篇：系统资源与进程管理：ps-top-free-df/CPU 负载与内存指标/进程信号与孤儿僵尸进程

**副标题**：从命令行数字读出系统的真实健康状况，以及进程生命周期里容易被忽视的两种异常状态

#### 一、使用与实践

- `top`/`htop` 实时查看 CPU、内存占用与进程列表，`ps aux`/`ps -ef` 查看进程快照
- `free -h` 查看内存使用与可用情况，区分 `used`/`buff-cache`/`available`
- `uptime` 查看系统负载（load average）与运行时长
- `df -h`（磁盘空间）/`du -sh *`（目录占用排查）定位"磁盘写满"问题
- 医院 HIS 系统排查一次线上响应变慢问题的现场推理：先看 `top` 里 CPU/内存有没有异常进程，再看 `free` 判断是否内存不足触发了 swap，最后用 `ps` 定位具体进程

#### 二、设计与原理

- **CPU 负载（Load Average）不等于 CPU 使用率**（重点）：`uptime` 显示的 1/5/15 分钟平均负载，统计的是"处于可运行或不可中断状态的进程数量的平均值"，不是 CPU 使用率百分比——负载值超过 CPU 核心数意味着有进程在排队等待 CPU 调度；但负载高不一定是 CPU 计算密集导致，大量进程卡在磁盘 I/O 等待（不可中断睡眠状态）同样会把负载推高，这是"CPU 使用率不高但负载很高"这个常见误判场景的原理
- **内存指标的正确解读**：`free -h` 里的 `used` 包含了 Linux 内核为了性能主动占用的文件缓存/缓冲区（`buff/cache`），这部分内存在应用需要时会被内核立即释放让出——真正反映"还能给新进程用多少内存"的是 `available` 列，而不是简单的"total 减 used"；不理解这一点会误判"内存快用完了"，实际上系统运行完全正常
- **进程状态与信号机制**：进程有运行（R）、睡眠（S，可中断）、不可中断睡眠（D，通常在等待磁盘 I/O）、僵尸（Z）等状态；`kill` 命令本质是向进程发送信号，`kill -15`（SIGTERM，默认信号，进程可以捕获并执行清理逻辑后再退出）和 `kill -9`（SIGKILL，无法被捕获或忽略，内核强制终止）是两种完全不同的终止方式——生产环境应优先用 SIGTERM 给进程一个优雅关闭（清理连接、保存状态）的机会，SIGKILL 是最后手段
- **孤儿进程与僵尸进程**（重点）：子进程的父进程先于子进程退出，子进程会被系统的 1 号进程（init/systemd）收养，这类子进程叫"孤儿进程"，本身不是问题；子进程已经退出但父进程还没有调用 `wait()` 读取其退出状态，这个已终止但仍占用进程表项的子进程叫"僵尸进程"——僵尸进程本身不占用 CPU/内存资源，但如果父进程一直不清理会导致进程表项持续堆积（进程号是有限资源），大量僵尸进程堆积通常意味着父进程的进程管理逻辑有 bug（没有正确处理子进程退出事件）
- **`docker`/Node.js 场景下常见的僵尸进程问题**：容器里如果直接把应用进程当作 PID 1 运行，而这个应用本身没有实现"回收子进程"的逻辑（比如应用内部 fork 了子进程做某些任务），子进程退出后会变成僵尸进程且无人回收，因为 PID 1 有特殊职责（收养孤儿进程并回收僵尸进程），这是"容器里为什么要用 `tini`/`dumb-init` 这类极简 init 系统作为 PID 1"的原理（详见 10-11 篇 Docker 部分）

#### 三、配置解析

1. `man 1 top`/`man 1 free`/`man 1 uptime`（Linux man-pages）— 各列指标的精确定义
2. `man 7 signal`（Linux man-pages）— 信号列表与默认行为
3. `man 2 wait`（系统调用手册）— 父进程回收子进程退出状态的机制

#### 四、实践演示与验证

写一个简单脚本 fork 一个子进程后立即让父进程退出，用 `ps aux` 观察子进程被 PID 1 收养（父进程 PID 变为 1）；再写一个父进程故意不调用 `wait()` 就让子进程退出，用 `ps aux | grep Z` 观察僵尸进程的产生，最后手动杀掉父进程验证僵尸进程被系统回收清理。

#### 五、参考
- https://man7.org/linux/man-pages/man1/top.1.html
- https://man7.org/linux/man-pages/man7/signal.7.html
- https://man7.org/linux/man-pages/man2/wait.2.html

**面试核心问**：
- CPU 负载（load average）和 CPU 使用率是同一个概念吗？负载高但 CPU 使用率不高说明什么？
- `free` 命令里 `used` 和 `available` 有什么区别，为什么不能简单用 total 减 used 判断可用内存？
- `kill -15` 和 `kill -9` 的区别是什么？生产环境应该优先用哪个？
- 什么是孤儿进程，什么是僵尸进程？僵尸进程堆积会有什么风险？

---

### 第 08 篇：服务与 systemd：init 系统演进/unit 文件/服务生命周期管理/journalctl 日志

**副标题**：从"顺序执行启动脚本"到"并行化依赖管理"的系统初始化范式演进

#### 一、使用与实践

- `systemctl start`/`stop`/`restart`/`status` 服务的启停查询，`systemctl enable`/`disable` 配置开机自启
- 编写一个自定义 systemd unit 文件，把医院 HIS 系统的 Node.js 应用注册为系统服务
- `journalctl -u his-api`/`journalctl -f`（实时跟踪日志）/`journalctl --since "1 hour ago"` 日志查询
- `systemctl list-units --type=service` 查看所有已加载的服务单元及其状态
- 排查一个"服务器重启后应用没有自动启动"的问题：检查 `enable` 状态、检查 unit 文件依赖配置是否正确

#### 二、设计与原理

- **init 系统的演进**：早期的 SysV init 按固定编号的 runlevel 顺序执行一系列 shell 脚本（`/etc/init.d/`），服务之间的启动顺序靠脚本编号硬编码，无法并行、依赖关系表达能力弱、脚本本身要手动处理"检测服务是否已运行""处理启停逻辑"等重复工作；systemd 用**声明式的 unit 文件**替代了命令式脚本——只需要声明"这个服务依赖哪些其他服务/资源，启动命令是什么"，systemd 自动处理依赖图的并行化启动、失败重试、状态监控，这是从"命令式脚本"到"声明式配置"的范式转变，和后端框架从手写流程代码转向声明式配置的思路是同一类设计权衡
- **unit 文件的核心结构**（重点）：`[Unit]` 段声明元信息与依赖关系（`After=`/`Requires=`/`Wants=` 分别表示启动顺序、强依赖、弱依赖）；`[Service]` 段声明服务本身的行为（`ExecStart=` 启动命令、`Restart=on-failure` 崩溃自动重启策略、`User=` 以哪个用户身份运行）；`[Install]` 段声明开机自启的关联目标（`WantedBy=multi-user.target`）——理解 `Requires` 和 `Wants` 的区别（前者依赖服务失败会导致本服务启动失败，后者依赖服务失败不影响本服务继续启动）是配置多服务依赖关系时最容易出错的点
- **cgroup 与 systemd 的资源管理集成**：systemd 天然基于 Linux cgroup（详见 10 篇 Docker 部分）管理每个服务的资源隔离和限制——`systemctl` 里能直接给一个服务配置 CPU/内存限额（`CPUQuota=`/`MemoryLimit=`），底层就是通过 cgroup 实现的，这是 systemd 不仅是"进程启停管理器"、也承担了轻量级资源管控职责的原因
- **`journalctl` 与统一日志系统**：systemd 自带的 `journald` 统一收集所有系统服务的日志（包括内核日志、systemd 自身日志、各服务标准输出/错误输出），以二进制结构化格式存储（而不是传统 `/var/log/` 下的纯文本文件），支持按服务名/时间范围/优先级精确查询过滤——这解决了"以前要分别去看不同服务各自的日志文件路径"的分散问题，统一到一个查询入口
- **`Restart=on-failure` 与服务自愈**：配置了自动重启策略的服务，在进程异常退出（非正常 `stop` 命令导致的退出）后 systemd 会按配置的重启策略自动拉起新进程——这是生产环境保证服务可用性的基础手段之一，但要理解它只能应对"进程崩溃"这类问题，无法应对"进程存活但业务逻辑卡死无响应"的场景（后者需要应用层健康检查配合，如 Kubernetes 的 liveness probe，详见 18 篇）

#### 三、配置解析

1. systemd 官方文档 `systemd.unit(5)`/`systemd.service(5)` man page — unit 文件各字段的完整规范
2. systemd 官方文档 `journalctl(1)` man page — 日志查询选项
3. freedesktop.org systemd 项目文档 *System and Service Manager* — 整体架构设计说明

#### 四、实践演示与验证

为一个简单的 Node.js HTTP 服务编写完整的 systemd unit 文件（包含 `ExecStart`、`Restart=on-failure`、`User`），`systemctl daemon-reload` 加载后启动服务；故意在代码里制造一次进程崩溃（如访问一个会抛出未捕获异常的路由），观察 systemd 是否按配置自动重启进程；用 `journalctl -u <service>` 查看崩溃前后的完整日志。

#### 五、参考
- https://www.freedesktop.org/software/systemd/man/systemd.service.html
- https://www.freedesktop.org/software/systemd/man/systemd.unit.html
- https://www.freedesktop.org/software/systemd/man/journalctl.html

**面试核心问**：
- systemd 相比传统 SysV init 的核心改进是什么？
- unit 文件里 `Requires` 和 `Wants` 的区别是什么？
- systemd 的资源管理能力和 cgroup 是什么关系？
- `Restart=on-failure` 能解决进程崩溃后自动恢复，但解决不了什么问题？

---

### 第 09 篇：网络配置与排查：网络命名空间基础/ip-netstat-ss-curl/iptables-firewalld/端口排查实战

**副标题**：Linux 网络栈的基本工具箱，排查"服务起了但连不上"问题的标准思路

#### 一、使用与实践

- `ip addr`/`ip route` 查看网络接口配置与路由表（`ifconfig`/`route` 是已过时的旧命令）
- `ss -tlnp`/`netstat -tlnp` 查看当前监听的端口与对应进程（`ss` 是 `netstat` 的现代替代实现，性能更好）
- `curl -v url`/`telnet host port`/`nc -zv host port` 测试到目标主机端口的连通性
- `iptables -L`/`firewalld-cmd --list-all` 查看当前防火墙规则
- 医院 HIS 系统排查"服务代码明明启动成功，但外部访问却连接超时"的完整排查链路：先看进程是否真的在监听目标端口，再看防火墙规则是否放通，最后看云主机安全组

#### 二、设计与原理

- **网络排查的分层思路**（重点）：网络问题的排查应该按 OSI/TCP-IP 分层从下往上或从上往下系统性排查，而不是随机尝试——典型链路：① 进程是否真的启动并监听了目标端口（`ss -tlnp` 确认）② 本机防火墙规则是否放通该端口（`iptables`/`firewalld`）③ 云主机安全组/云防火墙是否放通（很多"明明本机规则是对的却连不上"问题出在这一层，容易被忽略）④ DNS 解析是否正确指向了目标 IP ⑤ 中间网络路径是否可达（`traceroute`/`mtr`）——建立这套分层排查清单，能让"连不上"这类模糊问题快速定位到具体环节
- **`ss` 相比 `netstat` 的改进**：`netstat` 通过遍历 `/proc/net/*` 文件解析获取连接信息，在连接数很多的场景下性能较差；`ss` 直接通过内核的 netlink 接口获取信息，速度明显更快——这也是很多现代 Linux 工具"用更底层的内核接口替代解析文本文件"这一演进趋势的一个例子（类似 `ip` 命令替代 `ifconfig`/`route`）
- **iptables 与 firewalld 的关系**：两者都是配置 Linux 内核 netfilter 防火墙规则的用户空间工具，`iptables` 是更底层、更接近内核规则本身的命令式配置方式（规则是一条条链式表项，直接对应内核规则表）；`firewalld` 是更高层、面向"区域（zone）+服务"概念的声明式配置工具（内部最终仍会转换成 `iptables`/`nftables` 规则），使用上更贴近"允许 http 服务访问"这种业务语义而不是底层协议细节——RHEL 系发行版目前默认用 `firewalld`，Debian 系更常见直接用 `iptables`或`ufw`（`ufw` 是 `iptables` 的进一步简化封装）
- **端口监听状态的常见误区**：进程绑定监听地址时如果写的是 `127.0.0.1:3000` 而不是 `0.0.0.0:3000`，那么该端口只能被本机访问，外部请求无法连接——这是"本机 `curl localhost:3000` 能访问，但从其他机器访问却连接被拒绝"的一个高频原因，`ss -tlnp` 输出里的本地地址列能直接看出监听的是哪个网卡接口
- **网络命名空间基础**：Linux 网络命名空间（Network Namespace）能让每个命名空间拥有独立的网络接口、路由表、防火墙规则，彼此隔离——这是容器网络隔离能力的底层机制之一（详见 10 篇 Docker 部分），理解"一个物理网卡可以被划分成多个相互隔离的虚拟网络环境"这个基础概念，是理解容器网络模型的前提

#### 三、配置解析

1. `man 8 ss`/`man 8 ip`（Linux man-pages）— 命令选项与输出字段含义
2. `man 8 iptables`（Linux man-pages）— 规则链（chain）与表（table）的结构说明
3. firewalld 官方文档 *firewalld.org* — zone 与 service 概念说明

#### 四、实践演示与验证

在测试服务器上启动一个只监听 `127.0.0.1` 的简单 HTTP 服务，先验证本机 `curl localhost:port` 能访问，再从另一台机器 `curl` 目标 IP 验证连接被拒绝；把监听地址改成 `0.0.0.0` 重启后再次从外部验证可以访问；额外用 `iptables -A INPUT -p tcp --dport <port> -j DROP` 临时封禁该端口，观察即使监听地址正确，连接依然会被防火墙层拦截，直观体会排查链路里"进程监听"和"防火墙放通"是两个独立环节。

#### 五、参考
- https://man7.org/linux/man-pages/man8/ss.8.html
- https://man7.org/linux/man-pages/man8/iptables.8.html
- https://firewalld.org/documentation/

**面试核心问**：
- 排查"服务连不上"问题时，你会按什么顺序逐层排查？
- `ss` 相比 `netstat` 有什么改进，为什么更推荐用 `ss`？
- iptables 和 firewalld 是什么关系？
- 监听地址写 `127.0.0.1` 和 `0.0.0.0` 有什么区别？这个区别导致过什么实际问题？

---

### 第 10 篇：Docker 核心原理：容器与虚拟机对比/Namespace 隔离/Cgroups 资源限制/UnionFS 镜像分层

**副标题**：容器不是"轻量级虚拟机"，而是宿主机内核提供的一组隔离与限制能力的组合

#### 一、使用与实践

- `docker run`/`docker ps`/`docker exec -it container sh` 基本容器生命周期操作
- `docker inspect container` 查看容器的详细配置（网络、挂载、资源限制）
- `docker stats` 实时查看容器的 CPU/内存/网络占用
- 在容器内执行 `ps aux` 观察进程列表，对比宿主机上 `ps aux` 看到的进程视图差异
- 医院 HIS 系统场景：同一台服务器上跑多个业务方的容器（处方服务/患者服务），互相进程不可见、文件系统隔离，但共享同一个宿主机内核

#### 二、设计与原理

- **容器与虚拟机的本质区别**（重点）：虚拟机通过 Hypervisor 虚拟化出完整的硬件环境，每个虚拟机运行自己独立的操作系统内核，隔离性强但资源开销大（每个虚拟机都要跑一份完整内核+系统服务）；容器直接运行在宿主机内核之上，所有容器共享同一个内核，只是通过内核提供的隔离机制让每个容器"看起来"像独立的系统环境——这是容器启动速度快（不需要启动一个完整操作系统，本质是启动一个受限的进程）、资源开销小（不需要为每个容器复制一份内核）的根本原因，代价是隔离性弱于虚拟机（共享内核意味着内核层的漏洞可能影响所有容器）
- **Namespace：让进程看到"局部真实"的世界**（重点）：Linux Namespace 是把全局系统资源（PID、网络、文件系统挂载点、用户 ID、主机名等）划分成多个独立视图的机制——PID Namespace 让容器内的进程看不到宿主机或其他容器的进程，且容器内第一个进程的 PID 是 1；Network Namespace 让容器拥有独立的网络接口、路由表（详见 09 篇网络命名空间基础）；Mount Namespace 让容器看到独立的文件系统挂载树；每种 Namespace 只隔离对应类型的资源"视图"，不是物理上的资源分割
- **Cgroups：给进程组划资源上限**：Cgroups（Control Groups）负责限制和统计一组进程能使用的资源上限——CPU 配额（`--cpus`）、内存上限（`--memory`）、磁盘 I/O 速率等，超过内存限制的容器会被内核 OOM Killer 直接杀掉——Namespace 解决的是"看不见"（隔离视图），Cgroups 解决的是"用多少"（资源限制），两者结合才构成完整的容器隔离能力，这是回答"容器的隔离原理是什么"这类问题时容易只答一半的地方
- **UnionFS 与镜像分层**（重点）：Docker 镜像由多个只读层叠加而成，每一层只记录相对上一层的文件系统变更（新增/修改/删除的文件）——运行容器时在这些只读层之上再叠加一个可写层（容器层），容器内的所有文件修改都发生在这个可写层，不会影响底层的只读镜像层——这套"分层叠加、按需写入"的机制（UnionFS 家族，如 OverlayFS）带来两个直接好处：多个容器可以共享同一份底层只读镜像层节省磁盘空间；镜像分发时已存在的层不需要重复传输（`docker pull` 输出里能看到"Layer already exists"）
- **容器镜像与容器运行时实例的关系**：镜像是静态的只读模板（多层叠加的文件系统 + 元数据），容器是"镜像 + 一个可写层 + 一组独立的 Namespace/Cgroups 配置"运行起来的进程实例——同一个镜像可以启动任意多个相互独立的容器实例，这类似"类"和"实例"的关系

#### 三、配置解析

1. Open Container Initiative（OCI）*Runtime Specification* — 容器运行时规范，定义了 Namespace/Cgroups 配置如何映射到具体容器行为
2. Linux 内核文档 `Documentation/admin-guide/cgroup-v2.rst` — Cgroups v2 的资源控制接口
3. `man 7 namespaces`（Linux man-pages）— 各类 Namespace 的作用与系统调用接口

#### 四、实践演示与验证

启动一个容器并在容器内执行 `ps aux`，观察容器内第一个进程 PID 为 1；在宿主机上用 `ps aux` 查找该容器进程的真实 PID，对比两个视图的差异；用 `docker run --memory=100m` 限制容器内存，在容器内运行一个故意消耗超量内存的脚本，观察容器被 OOM Killer 终止；用 `docker history image` 查看一个镜像的分层构成，理解每一层对应 Dockerfile 里的哪条指令。

#### 五、参考
- https://github.com/opencontainers/runtime-spec
- https://docs.kernel.org/admin-guide/cgroup-v2.html
- https://man7.org/linux/man-pages/man7/namespaces.7.html

**面试核心问**：
- 容器和虚拟机的本质区别是什么？为什么容器启动更快、资源开销更小？
- Namespace 和 Cgroups 分别解决容器隔离的哪个方面？两者的关系是什么？
- Docker 镜像的分层机制是怎么工作的？这种设计带来了什么好处？
- 容器内存超限会发生什么？由谁负责终止容器？

---

### 第 11 篇：Dockerfile 与生产实践：多阶段构建/Layer 缓存/Compose 编排/数据卷与网络模式

**副标题**：怎么写出体积小、构建快、可复现的生产级镜像

#### 一、使用与实践

- 编写一个基础 Dockerfile：`FROM`/`WORKDIR`/`COPY`/`RUN`/`EXPOSE`/`CMD` 指令的基本用法
- `docker build -t image:tag .`/`docker push`/`docker pull` 镜像构建与分发
- `docker-compose.yml` 编排多个容器（如 HIS 应用容器 + PostgreSQL 容器 + Redis 容器），`docker compose up -d` 一键启动
- `docker volume create`/`docker run -v` 数据卷挂载，验证容器删除后数据卷内数据仍保留
- 医院 HIS 系统一个前端应用（如 Next.js）的完整 Dockerfile 编写与镜像体积优化实战

#### 二、设计与原理

- **Layer 缓存机制与指令顺序优化**（重点）：Docker 构建镜像时，Dockerfile 每条指令对应生成一层，如果某一层的指令内容和上下文（如 `COPY` 的源文件内容）与上次构建相比没有变化，Docker 会直接复用缓存层而不重新执行——这决定了 Dockerfile 里指令顺序的最佳实践：把不常变化的指令（如安装系统依赖）放在前面，把频繁变化的指令（如 `COPY` 应用源代码）放在后面——常见反模式是把 `COPY . .` 放在 `npm install` 之前，导致源代码任何一次改动都会让"安装依赖"这个耗时步骤的缓存失效，重新触发完整的 `npm install`
- **多阶段构建（Multi-stage Build）**（重点）：一个 Dockerfile 里可以定义多个 `FROM` 阶段，前面阶段（如 `FROM node AS builder`）负责安装完整的构建依赖并执行编译/打包，最后阶段只 `COPY --from=builder` 把构建产物拷贝到一个更精简的基础镜像（如仅含运行时的 `node:alpine`）里——这样最终镜像不包含构建阶段用到的编译工具、开发依赖、源代码等构建期才需要的内容，显著减小生产镜像体积（也减少了攻击面）
- **镜像体积优化的常见手段**：优先选择精简基础镜像（`alpine` 系列体积远小于完整发行版镜像，但要注意它用的是 `musl libc` 而非 `glibc`，某些依赖原生编译模块的 Node.js 包可能存在兼容性问题）；合并 `RUN` 指令减少层数（`RUN apt update && apt install -y xxx && rm -rf /var/lib/apt/lists/*` 写在一条指令里，避免中间层保留了之后又被删除的缓存文件占用体积）；用 `.dockerignore` 排除 `node_modules`/`.git` 等不需要打进镜像上下文的文件
- **数据卷（Volume）与容器生命周期解耦**：容器的可写层数据在容器删除后会随之消失，对于数据库这类需要持久化的数据，需要用数据卷把宿主机上的目录（或 Docker 管理的存储区域）挂载进容器——数据卷的生命周期独立于容器，容器可以被删除重建，但挂载的数据卷内容不受影响，这是"容器本身应该被当作无状态、随时可丢弃重建"这一设计原则的直接支撑
- **容器网络模式**：`bridge` 模式（默认，Docker 创建一个虚拟网桥，容器连接到网桥并分配独立 IP，容器间可以通过网桥互通，需要显式端口映射才能被宿主机外部访问）；`host` 模式（容器直接使用宿主机的网络命名空间，没有网络隔离，性能损耗最小但失去了网络隔离能力）；Compose 编排的多个服务默认会被放进同一个自定义 bridge 网络，服务之间可以直接用服务名作为主机名互相访问（Docker 内置的 DNS 解析），这是"数据库连接字符串里直接写服务名而不是 IP"这种写法能生效的原理
- **Compose 编排的定位**：`docker-compose.yml` 用声明式配置描述"这个应用由哪几个容器组成、它们之间的依赖启动顺序、网络和数据卷怎么配置"，本质是把多条 `docker run` 命令的参数集中管理成一份可版本控制的配置文件——适合单机多容器场景（本地开发环境、小规模部署），大规模多机器编排调度则是 Kubernetes 要解决的问题（详见 16-18 篇）

#### 三、配置解析

1. Docker 官方文档 *Dockerfile reference* — 各指令的完整语法与最佳实践建议
2. Docker 官方文档 *Multi-stage builds* — 多阶段构建的具体语法与使用场景
3. Compose Specification（Compose 官方规范）— `docker-compose.yml` 的字段定义

#### 四、实践演示与验证

给一个简单的 Next.js 项目编写多阶段构建的 Dockerfile：第一阶段用完整 `node` 镜像安装依赖并执行 `next build`，第二阶段用 `node:alpine` 只拷贝 `.next/standalone` 产物；对比单阶段构建（不做多阶段拆分，直接在一个镜像里装依赖+构建+运行）和多阶段构建产出镜像的体积差异（`docker images` 查看 SIZE 列）；再写一个 `docker-compose.yml` 编排该应用容器 + 一个 PostgreSQL 容器，验证应用容器能通过服务名直接连接数据库容器。

#### 五、参考
- https://docs.docker.com/reference/dockerfile/
- https://docs.docker.com/build/building/multi-stage/
- https://docs.docker.com/reference/compose-file/

**面试核心问**：
- Docker 的 Layer 缓存机制是怎么工作的？Dockerfile 指令顺序应该怎么安排来最大化利用缓存？
- 多阶段构建解决了什么问题？为什么能显著减小最终镜像体积？
- 数据卷解决了什么问题？为什么说容器应该被设计成"无状态、可丢弃"？
- Compose 里多个服务之间怎么通过服务名互相访问？背后的网络机制是什么？

---

### 第 12 篇：Nginx 核心与反向代理配置：master-worker 进程模型/配置文件结构/反向代理与负载均衡实操

**副标题**：为什么 Nginx 能用少量进程扛住海量并发连接，以及怎么把它配置成流量入口

#### 一、使用与实践

- `nginx -t` 检查配置文件语法，`nginx -s reload` 不中断服务的情况下重新加载配置
- 编写最简 `server` 块配置一个静态站点，配置 `location` 块处理不同路径的请求
- `proxy_pass` 配置反向代理，把请求转发到后端的 Node.js 服务
- `upstream` 块配置多个后端实例，`ps aux | grep nginx` 观察 master/worker 进程数量
- 医院 HIS 系统场景：Nginx 作为统一入口，把 `/api/*` 路径的请求反代到后端 Node.js 服务，其余路径返回前端静态资源

#### 二、设计与原理

- **master-worker 进程模型**（重点）：Nginx 启动后有一个 master 进程负责读取配置、管理 worker 进程的生命周期（不直接处理请求），以及若干个 worker 进程真正处理网络请求——worker 进程数量通常配置为等于 CPU 核心数（`worker_processes auto;`），每个 worker 是单线程的事件循环，通过操作系统的 I/O 多路复用机制（Linux 下是 `epoll`）同时监听大量连接的事件，一个 worker 能用非阻塞的方式并发处理数千甚至上万个连接——这是"Nginx 用远少于 Apache 传统模型（每个连接一个进程/线程）的进程数量却能支撑更高并发"的核心原因
- **`nginx -s reload` 的热更新机制**：收到 reload 信号后，master 进程重新读取并校验配置文件，如果校验通过就启动一批新的 worker 进程（用新配置），同时给旧的 worker 进程发送信号让它们不再接受新连接，处理完当前已有的连接后再退出——这个"新旧 worker 交替"的过程实现了配置更新时不丢失正在处理的请求，是生产环境修改配置后能做到"零停机重载"的关键设计
- **配置文件的层级结构**：Nginx 配置由 `http` 块（全局 HTTP 相关配置）→ `server` 块（对应一个虚拟主机，通过 `server_name` 匹配域名）→ `location` 块（对应一类 URL 路径规则）逐层嵌套，子级配置项默认继承父级，也可以覆盖——`location` 的匹配规则有精确匹配（`=`）、正则匹配（`~`/`~*`）、前缀匹配等多种，且存在优先级顺序（不是简单按配置文件里出现的顺序匹配），这是"明明配置了一个 location 规则却没生效，因为被另一个优先级更高的规则先匹配了"这类问题的原因
- **`proxy_pass` 反向代理的请求头处理**：Nginx 把请求转发给后端时，默认后端看到的 `Host` 头、客户端 IP 等信息可能已经失真（后端看到的连接来源 IP 是 Nginx 自己，不是真实客户端）——需要显式配置 `proxy_set_header X-Real-IP $remote_addr;`、`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` 等指令，把真实客户端信息通过约定的请求头传递给后端，后端应用需要读取这些头而不是直接用连接层面的 IP 信息——这是"后端日志里记录的用户 IP 全部显示成 Nginx 所在服务器的 IP"这个高频问题的根源
- **`upstream` 与负载均衡策略**：`upstream` 块定义一组后端服务器地址，默认策略是加权轮询（可以用 `weight` 指定权重比例），此外还支持 `ip_hash`（同一客户端 IP 固定分配到同一台后端，用于需要会话保持的场景）、`least_conn`（优先分配给当前连接数最少的后端）——这几种策略与网络原理系列反向代理篇讲的负载均衡算法原理一一对应，本篇聚焦"在 Nginx 配置里具体怎么写这几种策略"

#### 三、配置解析

1. Nginx 官方文档 *Nginx Architecture* — master/worker 进程模型与事件驱动机制说明
2. Nginx 官方文档 `ngx_http_core_module` — `server`/`location` 块的匹配规则与优先级
3. Nginx 官方文档 `ngx_http_upstream_module` — 负载均衡策略配置项

#### 四、实践演示与验证

配置一个 Nginx 反向代理，后端启动两个不同端口的简单 HTTP 服务（分别返回不同的标识字符串），`upstream` 块加入这两个实例，用默认轮询策略连续发起多次请求，观察响应交替来自两个后端；改用 `ip_hash` 策略后从同一个客户端连续请求，验证请求始终落在同一个后端实例上；修改配置后执行 `nginx -s reload`，在持续请求的同时观察是否有请求失败，验证热更新不中断服务。

#### 五、参考
- https://nginx.org/en/docs/
- https://nginx.org/en/docs/http/ngx_http_core_module.html
- https://nginx.org/en/docs/http/ngx_http_upstream_module.html

**面试核心问**：
- Nginx 的 master-worker 进程模型是怎么支撑高并发的？和传统的每连接一个进程/线程模型相比优势在哪？
- `nginx -s reload` 是怎么做到不中断现有连接的情况下更新配置的？
- `location` 块的匹配优先级规则是怎样的？
- 反向代理场景下，为什么后端应用看到的客户端 IP 会失真？怎么正确获取真实客户端 IP？

---

### 第 13 篇：Nginx 生产实战：SPA history 路由/gzip 与缓存头/HTTPS 证书配置/常见性能调优

**副标题**：把一个前端项目真正稳定跑在生产环境需要配置的那些细节

#### 一、使用与实践

- 配置 SPA 项目的 `try_files $uri $uri/ /index.html;` 支持前端路由 history 模式
- `gzip on;`/`gzip_types` 开启响应压缩，配置静态资源的 `Cache-Control`/`expires` 缓存头
- `ssl_certificate`/`ssl_certificate_key` 配置 HTTPS，`listen 443 ssl;` 与 HTTP 自动跳转 HTTPS 的 `return 301` 配置
- `access_log`/`error_log` 日志格式自定义与日志切割（配合 `logrotate`）
- 医院 HIS 系统前端项目部署实战：静态资源 CDN 化、API 请求反代、HTTPS 全站启用的完整生产配置

#### 二、设计与原理

- **SPA history 路由为什么需要服务端配合**（重点）：前端路由的 history 模式下，URL 路径变化（如从 `/list` 跳到 `/detail/1`）是前端 JS 通过 `history.pushState` 修改浏览器地址栏实现的，不会向服务端发起真实的页面请求——但用户直接在地址栏输入或刷新 `/detail/1` 这个 URL 时，浏览器会发起一次真实的 HTTP 请求，如果服务端没有对应的 `/detail/1` 这个物理路径就会返回 404——`try_files $uri $uri/ /index.html;` 的作用是：先尝试按请求路径找真实文件，找不到就统一回退返回 `index.html`，让前端路由脚本加载后自己根据当前 URL 渲染正确的页面，这是所有 SPA 生产部署都需要配置的关键一步
- **gzip 压缩的配置权衡**：`gzip_comp_level` 压缩级别在 1-9 之间，级别越高压缩率越好但 CPU 开销越大——对于已经是二进制压缩格式的资源（如图片、视频），gzip 二次压缩效果有限甚至可能增大体积，应该只对文本类资源（`gzip_types text/plain text/css application/javascript application/json` 等）启用；生产环境通常直接在构建阶段预生成 `.gz` 或 `.br` 压缩文件（配合 `gzip_static on;`），避免每次请求都实时压缩消耗 CPU（这与网络原理系列 05 篇讲的"离线压缩 vs 实时压缩"的权衡是同一个原理在 Nginx 配置层的具体落地）
- **静态资源缓存头策略**：对于文件名带内容哈希的构建产物（如 `app.a1b2c3.js`），可以配置超长的 `Cache-Control: max-age=31536000, immutable`，因为内容变化必然对应新的文件名，不存在缓存过期后拿到旧内容的风险；对于 `index.html` 这个入口文件本身，则应该配置 `Cache-Control: no-cache`（每次都向服务端验证），因为它引用的资源文件名会随着每次构建变化，如果 `index.html` 本身被强缓存，用户可能长期加载到引用旧资源文件名的旧版本入口页——这组"入口文件不缓存、内容哈希资源永久缓存"的策略组合是 SPA 生产部署的标准实践
- **HTTPS 配置与证书链**：`ssl_certificate` 指令需要提供包含完整证书链（服务器证书 + 中间 CA 证书）的文件，只提供服务器证书本身会导致部分客户端（尤其是移动端浏览器和一些旧版本客户端）验证信任链失败——这是"证书配置正确、桌面浏览器访问正常，但某些移动端提示证书不可信"这类问题的常见原因；`ssl_protocols`/`ssl_ciphers` 配置项用于禁用过时不安全的 TLS 版本和加密套件（如禁用 TLS 1.0/1.1，只保留 TLS 1.2/1.3），是安全合规检查的常见要求项
- **常见性能调优项**：`worker_connections` 决定单个 worker 能同时处理的最大连接数（需要配合操作系统层面的文件描述符上限 `ulimit -n` 一起调整，否则配置了很大的 `worker_connections` 也会被系统限制卡住）；`keepalive_timeout` 控制客户端连接的持久连接保持时长；`sendfile on;` 启用内核级别的文件发送优化（数据直接从内核缓冲区发送到网络接口，不需要先拷贝到用户空间再发送，减少一次数据拷贝），是静态文件服务性能优化的基础配置项

#### 三、配置解析

1. Nginx 官方文档 `ngx_http_gzip_module` — gzip 压缩相关配置指令
2. Nginx 官方文档 `ngx_http_ssl_module` — HTTPS/TLS 相关配置指令
3. Nginx 官方文档 *Tuning Nginx for Performance* — `worker_connections`/`sendfile`/`keepalive_timeout` 等性能相关配置说明

#### 四、实践演示与验证

部署一个简单的 SPA 前端项目（如 Vite 构建的 React 应用），先不配置 `try_files`，验证直接访问 `/detail/1` 返回 404；加上正确配置后验证刷新任意子路由都能正常加载；再配置构建产物的缓存头策略，用浏览器 DevTools Network 面板验证 `index.html` 请求走协商缓存（304），带内容哈希的 JS/CSS 文件走强缓存（200 from disk cache）。

#### 五、参考
- https://nginx.org/en/docs/http/ngx_http_gzip_module.html
- https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Cache-Control

**面试核心问**：
- SPA 项目为什么需要 `try_files` 这类配置才能支持前端路由刷新不 404？原理是什么？
- 为什么生产环境通常建议预生成压缩文件而不是让 Nginx 实时压缩？
- SPA 生产部署里 `index.html` 和带内容哈希的静态资源，缓存策略应该分别怎么配置，为什么？
- HTTPS 配置里只提供服务器证书、不提供中间 CA 证书链会导致什么问题？

---

### 第 14 篇：Jenkins 核心概念：CI-CD 理念/Master-Agent 架构/插件体系/自由风格任务

**副标题**：为什么"代码提交后自动构建测试部署"需要一整套基础设施，而不只是一个定时脚本

#### 一、使用与实践

- Jenkins 安装与初始化：Web 界面基本操作，创建一个自由风格（Freestyle）任务
- 配置一个最简任务：拉取 Git 仓库代码 → 执行 `npm install && npm run build` → 归档构建产物
- 配置构建触发器：轮询 SCM（定时检查仓库是否有新提交）与 Webhook 触发（代码推送后立即触发）的区别
- 安装并配置常用插件（如 Git 插件、NodeJS 插件）
- 医院 HIS 系统场景：为前端项目配置一个"提交到 `main` 分支后自动构建"的基础任务

#### 二、设计与原理

- **CI（持续集成）与 CD（持续交付/部署）的理念区分**（重点）：CI 指的是"代码提交后自动执行构建、测试、静态检查，尽早发现集成问题"，核心目标是缩短"引入问题"到"发现问题"之间的反馈周期；CD 分为持续交付（自动化到"随时可以一键发布"的状态，实际发布动作可能仍需人工确认）和持续部署（全自动直接发布到生产，没有人工卡点）——理解这组概念的边界，才能准确回答"这个流水线做到 CI 还是 CD"这类问题，而不是笼统地都说成"CI/CD"
- **为什么需要专门的 CI/CD 工具而不是写个定时脚本**：定时脚本能完成"拉代码-跑命令"这类简单自动化，但生产级 CI/CD 需要解决更多问题——多个任务的并发调度与资源隔离、构建历史的可视化追溯（第几次构建失败在哪一步、日志是什么）、失败通知与人工审批介入点、跨团队的任务权限管理、分布式构建能力（把构建任务分发到多台机器）——Jenkins 这类工具本质是把这些工程化需求沉淀成了通用平台，而不是每个项目各自维护一套脚本
- **Master-Agent 架构**：Jenkins Master 负责任务调度、Web 界面、插件管理、构建历史存储，本身通常不直接执行繁重的构建任务；Agent（早期也叫 Slave）是实际执行构建步骤的工作节点，可以是物理机、虚拟机，也可以是动态创建的容器——这种架构支持水平扩展构建能力（构建任务多时增加 Agent 节点分摊负载）、隔离不同项目的构建环境（不同 Agent 可以预装不同语言/版本的构建工具，避免相互污染）、以及跨平台构建（如需要在 Windows Agent 上构建 Windows 专属产物）
- **插件体系的设计动机**：Jenkins 核心本身只提供任务调度和执行的基础框架，几乎所有具体能力（Git 集成、Docker 集成、各类通知渠道、Pipeline 语法支持）都通过插件实现——这种"核心极简 + 插件扩展"的架构让 Jenkins 能适配几乎任何技术栈和工作流，代价是插件质量参差不齐、插件间兼容性问题是 Jenkins 运维中常见的麻烦来源
- **自由风格任务的局限**：Freestyle 任务通过 Web 界面点选配置构建步骤，配置本身存储在 Jenkins 内部（不在代码仓库里），这意味着"流水线配置"和"代码"是分离的，无法随代码一起版本控制、无法方便地 code review 流水线变更、多环境复用配置也很麻烦——这组局限性正是下一篇 Pipeline（尤其是声明式 Pipeline 用 `Jenkinsfile` 把流水线定义为代码）要解决的问题

#### 三、配置解析

1. Jenkins 官方文档 *Jenkins User Handbook* — Jenkins 核心概念与基本操作指南
2. Jenkins 官方文档 *Distributed builds* — Master-Agent 架构与 Agent 配置方式
3. Jenkins 插件官方索引 *Jenkins Plugin Index* — 常用插件（Git/NodeJS/Credentials）的作用说明

#### 四、实践演示与验证

在本地或云主机上部署一个 Jenkins 实例（可用官方 Docker 镜像快速启动），创建一个自由风格任务拉取一个简单的前端项目仓库，配置构建步骤执行 `npm install && npm run build && npm test`，手动触发一次构建，观察构建日志的完整输出与最终构建状态（成功/失败）；配置 Webhook 触发（需要 Jenkins 实例有公网可访问地址，或用 ngrok 等工具做内网穿透测试），推送一次代码验证自动触发构建。

#### 五、参考
- https://www.jenkins.io/doc/book/
- https://www.jenkins.io/doc/book/scaling/architecting-for-scale/
- https://plugins.jenkins.io/

**面试核心问**：
- CI 和 CD 分别指什么？CD 里"持续交付"和"持续部署"的区别是什么？
- Jenkins 的 Master-Agent 架构解决了什么问题？
- Jenkins 插件体系的设计动机是什么，这种架构有什么代价？
- 自由风格任务相比 Pipeline（Jenkinsfile）有什么局限？

---

### 第 15 篇：Jenkins Pipeline 实战：Jenkinsfile 声明式语法/多分支流水线/集成 Docker 构建/自动化部署

**副标题**：把流水线定义写成代码，让 CI/CD 配置和业务代码一起接受版本控制与 code review

#### 一、使用与实践

- 编写一个声明式 `Jenkinsfile`：`pipeline`/`agent`/`stages`/`stage`/`steps` 的基本语法结构
- 配置多分支流水线（Multibranch Pipeline）：Jenkins 自动为仓库里每个分支/PR 创建独立的流水线
- 在 Pipeline 里调用 Docker：构建应用镜像、推送到镜像仓库
- 配置 `post` 块处理构建成功/失败后的通知逻辑（如失败发送告警）
- 医院 HIS 系统场景：完整的前端项目流水线——检出代码 → 安装依赖 → lint+typecheck → 单元测试 → 构建 → 构建 Docker 镜像 → 推送镜像 → 触发部署

#### 二、设计与原理

- **声明式 Pipeline 与脚本式 Pipeline**：Jenkins Pipeline 有两种语法风格——脚本式（Scripted Pipeline）基于 Groovy 语言，灵活性最高但语法复杂、学习门槛高；声明式（Declarative Pipeline）提供了一套结构化的固定语法骨架（`pipeline { agent {} stages { stage('name') { steps {} } } }`），牺牲了一部分灵活性换取更好的可读性和结构化校验（如内置了语法检查、更清晰的阶段可视化），目前是官方推荐的主流写法——理解这组权衡才能回答"什么时候该用脚本式 Pipeline 里的 `script {}` 块逃生舱"这类问题（声明式 Pipeline 内部允许嵌入 `script {}` 块执行任意 Groovy 逻辑，用于应对声明式语法覆盖不到的复杂场景）
- **Pipeline as Code 的核心价值**（重点）：`Jenkinsfile` 作为普通文件存放在代码仓库根目录，和业务代码一样接受 Git 版本管理——这意味着流水线的变更历史可追溯（谁在什么时候改了构建流程）、可以像审查代码一样 code review 流水线改动、不同分支甚至可以有不同的流水线逻辑（如 `main` 分支的流水线包含生产部署步骤，功能分支的流水线只跑到测试阶段）——这是从"点选式配置存在 Jenkins 内部"到"配置即代码"的范式升级，与 Terraform（Infrastructure as Code）解决基础设施配置可追溯性问题的思路是同一类设计理念
- **多分支流水线的自动化管理**：Multibranch Pipeline 任务类型会自动扫描仓库的所有分支，为每个包含 `Jenkinsfile` 的分支自动创建对应的子任务，分支删除后自动清理——这消除了"每次新建一个分支都要手动去 Jenkins 里配一个新任务"的重复劳动，是团队多分支并行开发场景下的标准实践
- **在 Pipeline 里集成 Docker 构建**：Jenkins Agent 上执行 `docker build`/`docker push` 本质就是普通的 shell 命令调用，不存在特殊的"Jenkins 专属 Docker 集成魔法"——需要注意的实际工程问题是"Jenkins Agent 本身是不是在容器里运行"（如果 Jenkins Agent 自己就是一个容器，要在里面执行 `docker build` 就涉及"容器里跑 Docker"的方案选择：挂载宿主机 Docker socket，或者用 Docker-in-Docker，两种方案在安全性和隔离性上有不同权衡）以及"镜像仓库的登录凭证怎么安全地传给构建脚本"（Jenkins Credentials 机制的作用，避免密钥硬编码进 `Jenkinsfile`）
- **`post` 块与构建结果处理**：声明式 Pipeline 的 `post` 块可以定义 `always`/`success`/`failure`/`unstable` 等不同结果条件下执行的逻辑（如失败时发送告警通知、无论成功失败都清理临时文件）——这是把"构建流程本身"和"构建结果的后续处理逻辑"结构化分离表达的语法设计，避免脚本式写法里到处充斥 `try/catch` 判断构建状态的重复代码

#### 三、配置解析

1. Jenkins 官方文档 *Pipeline Syntax* — 声明式 Pipeline 各语法块的完整参考
2. Jenkins 官方文档 *Using a Jenkinsfile* — Pipeline as Code 的设计理念与最佳实践
3. Jenkins 官方文档 *Multibranch Pipeline* — 多分支流水线的自动发现与管理机制

#### 四、实践演示与验证

为一个前端项目编写完整的声明式 `Jenkinsfile`，包含依赖安装、lint 检查、单元测试、构建、Docker 镜像构建五个 stage，配置 `post { failure { ... } }` 在任意阶段失败时输出明确的失败原因；把该项目配置成 Multibranch Pipeline，验证新建一个分支后 Jenkins 自动识别并创建对应流水线；故意让某个 stage 失败（如注入一个 lint 错误），观察 Jenkins 界面上流水线可视化图里失败阶段的标红显示。

#### 五、参考
- https://www.jenkins.io/doc/book/pipeline/syntax/
- https://www.jenkins.io/doc/book/pipeline/jenkinsfile/
- https://www.jenkins.io/doc/book/pipeline/multibranch/

**面试核心问**：
- 声明式 Pipeline 和脚本式 Pipeline 的区别是什么？各自的适用场景是什么？
- "Pipeline as Code" 相比传统点选式配置流水线，解决了什么实际问题？
- 多分支流水线是怎么自动管理多个分支各自的构建任务的？
- 在 Jenkins Agent 容器里执行 Docker 构建，有哪些常见的技术方案和权衡？

---

### 第 16 篇：Kubernetes 核心概念：架构组件/Pod-Deployment-Service/命名空间/kubectl 基本操作

**副标题**：当 Compose 管不住的多机器容器编排问题，Kubernetes 用什么样的对象模型来描述

#### 一、使用与实践

- `kubectl get pods`/`kubectl get deployments`/`kubectl get services` 查看集群内的核心资源对象
- `kubectl describe pod <name>`/`kubectl logs <pod>` 排查 Pod 状态与日志
- 编写一个最简 `Deployment` YAML，`kubectl apply -f deployment.yaml` 部署一个应用
- `kubectl get namespaces`/`kubectl config set-context --current --namespace=<ns>` 命名空间切换
- 医院 HIS 系统场景：为什么单机 Docker Compose 够用的小规模部署，业务规模扩大后需要迁移到 Kubernetes——多机器资源调度、故障自动恢复、滚动更新等需求单机方案难以覆盖

#### 二、设计与原理

- **为什么需要 Kubernetes——单机编排到多机编排的跨越**（重点）：Docker Compose 解决的是"单台机器上多个容器怎么配合"，但生产环境往往需要多台机器组成集群共同承载负载——这引入了一系列 Compose 不处理的问题：容器应该调度到集群里的哪台机器（考虑资源余量、亲和性）、某台机器宕机后上面的容器怎么自动迁移到其他机器、怎么统一管理集群里成百上千个容器的健康状态——Kubernetes 就是为了解决这一整套"多机器容器编排调度"问题而设计的系统
- **核心架构组件**：Control Plane（控制平面）负责集群的全局决策，包含 `kube-apiserver`（所有操作的统一入口，其他组件都通过它读写集群状态）、`etcd`（存储集群所有状态数据的分布式键值存储）、`kube-scheduler`（决定新创建的 Pod 应该调度到哪个节点）、`kube-controller-manager`（运行一系列控制器，持续观察集群实际状态与期望状态的差异并做出调整）；每个工作节点上运行 `kubelet`（负责与 apiserver 通信，管理本节点上容器的实际生命周期）和 `kube-proxy`（维护节点上的网络规则，实现 Service 的流量转发）
- **声明式 API 与控制器模式**（重点）：用户不直接命令"启动 3 个容器"，而是声明"我期望有 3 个副本的这个应用在运行"（写在 YAML 里提交给 apiserver）——对应的控制器持续对比"当前实际状态"和"期望状态"，如果实际只有 2 个副本存活（比如某个 Pod 因节点故障消失），控制器会自动创建新的 Pod 补齐到期望的 3 个——这套"声明期望状态，系统自动收敛"的设计模式贯穿 Kubernetes 几乎所有资源对象，是理解"K8s 为什么具备自动故障恢复能力"的核心
- **Pod、Deployment、Service 三个最基础的对象**：Pod 是 Kubernetes 里最小的可调度部署单元（不是容器本身），一个 Pod 内可以包含一个或多个共享网络命名空间和存储卷的容器（多容器 Pod 常用于"主容器+辅助容器"的组合模式）；Deployment 声明式管理一组相同 Pod 的期望副本数、更新策略（如滚动更新），是控制器模式在"保持一组无状态应用副本数量"这个场景的具体实现；Service 解决"Pod 会被频繁创建销毁、IP 一直在变，怎么给一组不断变化的 Pod 提供一个稳定访问入口"的问题——Service 提供一个固定的虚拟 IP 和 DNS 名称，请求会被自动转发到当前存活的某个后端 Pod，这个转发是通过每个节点上的 `kube-proxy` 维护的网络规则实现的
- **命名空间（Namespace）的隔离作用**：Kubernetes 的 Namespace 是一种逻辑隔离机制（与 Linux Namespace 是完全不同层面的概念，只是名字相同，容易在面试里被混淆问到区别），用于在同一个集群内划分多个虚拟隔离的项目/团队/环境空间——不同 Namespace 里可以存在同名的资源对象而不冲突，常用于区分开发/测试/生产环境，或不同业务团队的资源隔离

#### 三、配置解析

1. Kubernetes 官方文档 *Kubernetes Components* — 控制平面与节点组件的架构说明
2. Kubernetes 官方文档 *Pods*/*Deployments*/*Service* — 三个核心对象的完整字段参考
3. Kubernetes 官方文档 *Namespaces* — 命名空间的作用范围与使用建议

#### 四、实践演示与验证

在本地用 Minikube 或 kind 搭建一个单节点测试集群（不涉及生产级多节点集群运维），编写一个 `Deployment` YAML 部署 3 个副本的简单 Web 应用，用 `kubectl get pods -w` 实时观察 Pod 创建过程；手动删除其中一个 Pod（`kubectl delete pod <name>`），观察控制器自动创建新 Pod 补齐副本数的过程；创建一个对应的 `Service`，验证即使 Pod 被删除重建（IP 变化），通过 Service 的固定入口访问依然正常。

#### 五、参考
- https://kubernetes.io/docs/concepts/overview/components/
- https://kubernetes.io/docs/concepts/workloads/pods/
- https://kubernetes.io/docs/concepts/services-networking/service/

**面试核心问**：
- Kubernetes 解决的核心问题是什么？和 Docker Compose 的定位区别是什么？
- 声明式 API 和控制器模式是怎么让 Kubernetes 具备自动故障恢复能力的？
- Pod、Deployment、Service 三者分别扮演什么角色，为什么不能只用 Pod？
- Kubernetes 的 Namespace 和 Linux Namespace 是同一个概念吗？

---

### 第 17 篇：Kubernetes 配置与网络：ConfigMap-Secret/Ingress 路由/PV-PVC 存储卷/服务发现原理

**副标题**：应用配置怎么和镜像解耦，外部流量怎么进入集群，以及集群内部服务怎么找到彼此

#### 一、使用与实践

- `kubectl create configmap`/`kubectl create secret` 创建配置与敏感信息对象，在 Deployment 里以环境变量或挂载文件方式引用
- 编写一个 `Ingress` YAML，配置基于域名/路径的路由规则
- `kubectl get pv`/`kubectl get pvc` 查看持久卷与持久卷声明
- 在集群内部一个 Pod 里 `curl` 另一个 Service 的名称，验证集群内 DNS 服务发现
- 医院 HIS 系统场景：数据库连接字符串、第三方 API 密钥用 Secret 管理，不同环境（测试/生产）用不同的 ConfigMap 覆盖配置，业务域名通过 Ingress 统一路由到对应的后端 Service

#### 二、设计与原理

- **ConfigMap 与 Secret 的设计动机**（重点）：容器镜像应该是"环境无关"的构建产物，同一个镜像应该能不做任何修改地部署到测试环境和生产环境，区别只在于注入的配置不同——ConfigMap 把非敏感配置（如日志级别、功能开关）从镜像中剥离出来，作为独立的 Kubernetes 对象管理，运行时以环境变量或挂载文件的形式注入容器；Secret 结构上与 ConfigMap 类似但专门用于存储敏感信息（密码、密钥、证书），存储时会做 base64 编码（注意 base64 编码不是加密，只是编码转换，真正的敏感信息保护依赖 etcd 层的加密配置和严格的访问权限控制）
- **Ingress 与 Service 的分工**：Service 提供的是集群内部的稳定访问入口和四层（TCP/UDP）负载均衡能力，默认不直接处理外部 HTTP 流量的域名/路径级路由；Ingress 是专门处理"外部 HTTP(S) 流量怎么根据域名和路径规则路由到集群内不同 Service"的资源对象——Ingress 本身只是一份路由规则声明，需要集群内实际运行一个 Ingress Controller（如 Nginx Ingress Controller，本质是一个运行在集群里、根据 Ingress 规则动态生成 Nginx 配置的组件）来真正落地这些规则——这里能直接串联到本系列 12-13 篇讲的 Nginx 配置原理：Ingress Controller 本质是把 Kubernetes 声明式的路由意图，翻译成了具体的 Nginx `server`/`location` 配置
- **PV 与 PVC 的存储抽象**：PersistentVolume（PV）是集群管理员预先准备好的一块实际存储资源（可能是云盘、NFS 等各种后端），PersistentVolumeClaim（PVC）是应用方"申请一块具备某些特性（大小、访问模式）的存储"的声明——这种"申请"与"提供"分离的设计，让应用方的 YAML 配置不需要关心底层存储的具体实现细节（应用只声明"我需要 10GB 可读写存储"，具体这块存储是什么类型的云盘由集群层面的 PV 或动态供应的 StorageClass 决定），是"关注点分离"设计原则在存储管理上的体现
- **集群内服务发现原理**：Kubernetes 集群内置一个 DNS 服务（通常是 CoreDNS），每个 Service 创建时会自动获得一条对应的 DNS 记录（格式通常是 `<service-name>.<namespace>.svc.cluster.local`，同命名空间内可以简写成 `<service-name>`）——Pod 内的应用直接用 Service 名称作为主机名发起请求，DNS 解析后拿到 Service 的虚拟 IP，请求经过 `kube-proxy` 维护的转发规则最终落到某个健康的后端 Pod——这套机制让应用代码里可以用稳定的服务名而不是易变的 Pod IP 进行服务间调用，这也是本系列 11 篇讲 Compose 场景下"用服务名互相访问"背后 DNS 机制的更完整版本
- **ConfigMap/Secret 更新后的生效问题**：修改 ConfigMap/Secret 后，已经在运行的 Pod 如果是以环境变量方式注入配置的，不会自动感知更新（环境变量在进程启动时就已经固定），需要重启 Pod 才能生效；如果是以挂载文件方式注入，kubelet 会在一定延迟后自动更新挂载点里的文件内容，但应用代码需要自己实现"检测配置文件变化并重新加载"的逻辑才能真正用上新配置——这是"改了 ConfigMap 配置为什么应用没有生效"的常见排查方向

#### 三、配置解析

1. Kubernetes 官方文档 *ConfigMaps*/*Secrets* — 配置对象的创建方式与注入方法
2. Kubernetes 官方文档 *Ingress* — Ingress 资源与 Ingress Controller 的关系说明
3. Kubernetes 官方文档 *Persistent Volumes* — PV/PVC/StorageClass 的存储抽象模型

#### 四、实践演示与验证

创建一个 ConfigMap 存储一个应用的环境变量配置，以环境变量方式注入一个测试 Pod，验证 Pod 内能读到对应值；修改 ConfigMap 内容后不重启 Pod，验证环境变量确实没有更新，重启 Pod 后验证生效；部署两个不同的简单 Web 应用和对应 Service，配置一个 Ingress 按路径前缀分别路由到这两个 Service，用不同路径请求验证路由规则生效。

#### 五、参考
- https://kubernetes.io/docs/concepts/configuration/configmap/
- https://kubernetes.io/docs/concepts/services-networking/ingress/
- https://kubernetes.io/docs/concepts/storage/persistent-volumes/

**面试核心问**：
- ConfigMap 和 Secret 的区别是什么？Secret 的 base64 编码能起到安全保护作用吗？
- Service 和 Ingress 的分工区别是什么？为什么需要单独的 Ingress Controller？
- PV 和 PVC 分别代表什么角色，这种设计解决了什么问题？
- Kubernetes 集群内的服务发现是怎么工作的？

---

### 第 18 篇：Kubernetes 前端部署实战：容器化部署/滚动更新与健康检查/HPA 自动扩缩容/故障排查

**副标题**：把前端项目的完整部署流程串起来，以及线上问题排查的基本思路

#### 一、使用与实践

- 为一个前端项目编写完整的 `Deployment` + `Service` + `Ingress` 三件套 YAML，串联本系列 Docker 篇构建的镜像
- 配置 `readinessProbe`/`livenessProbe` 健康检查，观察探针失败时 Pod 的状态变化
- `kubectl rollout status`/`kubectl rollout undo` 观察和回滚一次滚动更新
- 配置 `HorizontalPodAutoscaler`（HPA）基于 CPU 使用率自动扩缩容
- 医院 HIS 系统场景：前端应用更新版本时如何做到用户无感知的滚动更新，流量高峰期自动扩容应对负载

#### 二、设计与原理

- **滚动更新（Rolling Update）机制**（重点）：Deployment 更新镜像版本时，默认策略是滚动更新——按配置的步长（`maxSurge`/`maxUnavailable`）逐步创建新版本 Pod、逐步终止旧版本 Pod，整个过程始终保持一定数量的可用 Pod 在线，不会出现"全部旧 Pod 同时下线导致服务中断"的情况——这是"部署新版本不影响线上用户访问"这一诉求在 Kubernetes 层面的标准解法；如果新版本上线后发现问题，`kubectl rollout undo` 能快速回滚到上一个版本，Kubernetes 内部记录了 Deployment 的历史版本信息支撑这个回滚能力
- **健康检查探针的两种类型与区别**（重点）：`readinessProbe`（就绪探针）判断 Pod 是否"准备好接收流量"，探测失败时 Pod 会被从 Service 的负载均衡后端列表中临时移除（但不会被重启），常用于应用启动后有一段初始化时间（如预热缓存、建立数据库连接池）的场景，避免流量打到还没准备好的实例上；`livenessProbe`（存活探针）判断 Pod 是否"仍然存活正常"，探测失败会触发 Pod 被杀掉重启，用于应对"进程存活但业务逻辑已经死锁/卡死无响应"这类僵死状态——混淆这两种探针的用途是常见的配置误区，比如误把 `livenessProbe` 配置成检测一个依赖数据库的接口，数据库短暂波动时会导致大量 Pod 被无谓重启，反而加剧故障
- **滚动更新与就绪探针的配合**：滚动更新过程中，Kubernetes 判断"新 Pod 是否可以开始接收流量、旧 Pod 是否可以被终止"依赖的正是就绪探针的状态——如果没有正确配置就绪探针，Kubernetes 可能会把流量过早导向一个容器进程已经启动但应用逻辑还没完全初始化好的新 Pod，导致滚动更新期间出现短暂的请求失败，这是"配置了滚动更新但发布时仍有零星报错"的常见原因
- **HPA 自动扩缩容原理**：HPA 持续从 Metrics Server 获取 Pod 的资源使用指标（默认是 CPU/内存使用率，也可以扩展为自定义指标如 QPS），当实际使用率超过配置的目标阈值时自动增加副本数，负载降低后自动缩减副本数——这套自动化能力建立在前面篇章的基础之上：HPA 调整的是 Deployment 管理的副本数量（依赖声明式控制器模式），扩容出的新 Pod 要靠就绪探针判断何时能接收流量，多个副本之间的流量分发靠 Service 的负载均衡机制
- **前端项目部署实战的完整链路**：本地开发的前端项目代码 → Jenkins Pipeline（14-15 篇）检出代码并执行 lint/测试/构建 → 用 Dockerfile 多阶段构建（10-11 篇）打包成一个精简的生产镜像并推送到镜像仓库 → Kubernetes Deployment 引用该镜像版本创建 Pod → Service 提供稳定访问入口 → Ingress（17 篇）把外部域名请求路由到该 Service——这条链路把本系列前面所有篇章串成了一个完整的"代码提交到用户访问"的工程闭环
- **故障排查基本思路**：Pod 处于 `Pending` 状态通常是调度失败（资源不足或没有匹配的节点），需要 `kubectl describe pod` 查看 Events 里的调度失败原因；Pod 处于 `CrashLoopBackOff` 意味着容器反复启动后立即退出，需要 `kubectl logs --previous` 查看上一次崩溃前的日志定位应用层面的错误；Pod 状态正常但访问不通，则回到 Service 的 selector 标签是否与 Pod 标签匹配、Ingress 规则是否正确这条链路逐层排查——这套排查顺序本质是"先看资源对象状态是否符合期望，再看网络链路是否通"的分层思路，与 09 篇 Linux 网络排查的分层思想是同一套方法论在不同层级的应用

#### 三、配置解析

1. Kubernetes 官方文档 *Performing a Rolling Update* — 滚动更新策略配置与回滚操作
2. Kubernetes 官方文档 *Configure Liveness, Readiness and Startup Probes* — 三种探针的配置字段与行为差异
3. Kubernetes 官方文档 *Horizontal Pod Autoscaling* — HPA 的工作原理与配置方式

#### 四、实践演示与验证

给一个前端应用的 Deployment 配置滚动更新策略和就绪/存活探针，先部署 v1 版本验证正常访问；修改镜像版本为 v2 并 `kubectl apply`，用 `kubectl get pods -w` 观察滚动更新过程中新旧 Pod 交替的完整过程，确认更新期间持续请求没有失败；故意让 v2 版本的健康检查接口返回失败，观察 Kubernetes 是否正确识别并阻止有问题的新版本完全替换旧版本（配合 `maxUnavailable` 配置观察效果）；用 `kubectl rollout undo` 回滚到 v1，验证回滚过程同样是滚动进行。

#### 五、参考
- https://kubernetes.io/docs/tutorials/kubernetes-basics/update/update-intro/
- https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/

**面试核心问**：
- 滚动更新是怎么做到发布过程中不中断服务的？
- `readinessProbe` 和 `livenessProbe` 的区别是什么？配置错误分别会导致什么问题？
- HPA 自动扩缩容依赖哪些前置机制才能正常工作？
- Pod 处于 `CrashLoopBackOff` 状态，你会怎么一步步排查？

---

## 参考链接（每篇末尾统一引用池）

```
https://refspecs.linuxfoundation.org/FHS_3.0/fhs-3.0.html
https://man7.org/linux/man-pages/man7/inode.7.html
https://man7.org/linux/man-pages/man1/chmod.1.html
https://man7.org/linux/man-pages/man5/passwd.5.html
https://man7.org/linux/man-pages/man2/setuid.2.html
https://www.rfc-editor.org/rfc/rfc4252
https://man7.org/linux/man-pages/man5/sudoers.5.html
http://www.linux-pam.org/Linux-PAM-html/
https://www.gnu.org/software/bash/manual/bash.html
https://www.gnu.org/software/gawk/manual/gawk.html
https://www.gnu.org/software/sed/manual/sed.html
https://www.debian.org/doc/debian-policy/ch-relationships.html
https://rpm-guide.readthedocs.io/en/latest/
https://man7.org/linux/man-pages/man1/top.1.html
https://man7.org/linux/man-pages/man7/signal.7.html
https://man7.org/linux/man-pages/man2/wait.2.html
https://www.freedesktop.org/software/systemd/man/systemd.service.html
https://www.freedesktop.org/software/systemd/man/systemd.unit.html
https://www.freedesktop.org/software/systemd/man/journalctl.html
https://man7.org/linux/man-pages/man8/ss.8.html
https://man7.org/linux/man-pages/man8/iptables.8.html
https://firewalld.org/documentation/
https://github.com/opencontainers/runtime-spec
https://docs.kernel.org/admin-guide/cgroup-v2.html
https://man7.org/linux/man-pages/man7/namespaces.7.html
https://docs.docker.com/reference/dockerfile/
https://docs.docker.com/build/building/multi-stage/
https://docs.docker.com/reference/compose-file/
https://nginx.org/en/docs/
https://nginx.org/en/docs/http/ngx_http_core_module.html
https://nginx.org/en/docs/http/ngx_http_upstream_module.html
https://nginx.org/en/docs/http/ngx_http_gzip_module.html
https://nginx.org/en/docs/http/ngx_http_ssl_module.html
https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Cache-Control
https://www.jenkins.io/doc/book/
https://www.jenkins.io/doc/book/scaling/architecting-for-scale/
https://plugins.jenkins.io/
https://www.jenkins.io/doc/book/pipeline/syntax/
https://www.jenkins.io/doc/book/pipeline/jenkinsfile/
https://www.jenkins.io/doc/book/pipeline/multibranch/
https://kubernetes.io/docs/concepts/overview/components/
https://kubernetes.io/docs/concepts/workloads/pods/
https://kubernetes.io/docs/concepts/services-networking/service/
https://kubernetes.io/docs/concepts/configuration/configmap/
https://kubernetes.io/docs/concepts/services-networking/ingress/
https://kubernetes.io/docs/concepts/storage/persistent-volumes/
https://kubernetes.io/docs/tutorials/kubernetes-basics/update/update-intro/
https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
```

- man-pages / GNU 官方手册：Linux 部分（01-09 篇）命令与系统调用行为的第一权威来源
- Docker / OCI 官方文档与规范：容器原理与工程实践部分（10-11 篇）的权威来源
- Nginx 官方文档：网关配置部分（12-13 篇）的权威来源，与网络原理系列的协议原理形成"原理与配置"的互补关系
- Jenkins 官方文档：CI/CD 部分（14-15 篇）的权威来源
- Kubernetes 官方文档：容器编排部分（16-18 篇）的权威来源，聚焦面向前端/全栈工程师的核心概念与部署实战，不涉及自建集群运维的 SRE 专职内容

> 引用规范：正文中不出现具体博主名/账号名/人名，仅在文末参考池中列官方文档、规范或权威来源 URL。

---

## 与其他系列的分工备忘

- 与《网络原理系列》：该系列第 10 篇讲反向代理/负载均衡的协议原理本身（Host 头如何路由、负载均衡算法的通用设计）；本系列 12-13 篇讲的是"怎么在 Nginx 配置文件里落地这些原理"，聚焦具体指令语法和生产配置细节，不重复协议层原理推导
- 与《Node.js 全栈系列》：该系列的工程化相关篇目涉及"Node.js 应用具体怎么打包适配容器环境"；本系列 10-11 篇讲的是 Docker 本身的通用隔离原理与工程实践（Namespace/Cgroups/镜像分层/多阶段构建），不绑定特定语言运行时，是任何后端技术栈做容器化都要理解的通用基础
- 本系列 16-18 篇 Kubernetes 部分明确不覆盖：自建高可用集群的部署运维、CNI 网络插件实现细节、`kube-scheduler` 调度算法源码级解析、Operator/CRD 自定义控制器开发——这些属于专职 SRE/平台工程方向的深度内容，超出面向前端/全栈工程师"看懂配置、能独立完成部署"的定位

---

*规划时间：2026-09-11 | 参考：Linux man pages / systemd 官方文档 / OCI 规范 / Nginx 官方文档 / Jenkins 官方文档 / Kubernetes 官方文档*
