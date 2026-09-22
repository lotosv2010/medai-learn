# 前端全栈系列文章总大纲

> 10 年医疗电商前端经验晋升 AI 应用工程师的完整知识体系，共规划 15 个系列。

---

## 写作策略

**双轨并行**：AI 工程系列（14）与其他系列同步推进——其他系列属于「整理发布」（已学知识输出），AI 工程系列属于「边学边写」（新知识输入）。两种认知负荷不冲突，互相调节。

**非 AI 系列写作顺序**：Node.js 全栈 → 网络原理 → 数据结构与算法 → 设计模式 → 泛客户端（小程序）→ 前端运维 → 测试体系。先深后广，Node 是其余系列的基础设施。

---

## 系列总览

| # | 系列名称 | 状态 | 文章数 | 写作优先级 |
|---|---------|------|--------|-----------|
| 00 | AI 工具与职业发展 | ✅ 完成 | 4 | — |
| 01 | JavaScript 深度 | ✅ 完成 | 3 | — |
| 02 | TypeScript | ✅ 完成 | 5 | — |
| 03 | 工程化与构建工具 | ✅ 完成 | 8 | — |
| 04 | 性能与前端监控 | ✅ 完成 | 13 | — |
| 05 | Vue 2 源码 | ✅ 完成 | 13 | — |
| 06 | Vue 3 源码 | ✅ 完成 | 12 | — |
| 07 | React 18 | 🚧 进行中（大纲已定稿 14 篇，详见 `docs/plans/04 react18-family-series-outline.md`） | 0/14 | 核心主线 |
| 08 | Node.js 全栈 | 📋 规划中（大纲已定稿 18 篇，详见 `docs/plans/05 node-fullstack-series-outline.md`） | — | ① 第一优先 |
| 09 | 网络原理 | 📋 规划中（大纲已定稿 10 篇，详见 `docs/plans/06 network-principles-series-outline.md`） | — | ② |
| 10 | 泛客户端（小程序） | 📋 规划中（大纲已定稿 12 篇，详见 `docs/plans/09 miniprogram-series-outline.md`） | — | ⑤ |
| 11 | 数据结构与算法 | 📋 规划中（大纲已定稿 13 篇，详见 `docs/plans/07 data-structures-algorithms-outline.md`） | — | ③ |
| 12 | 设计模式 | 📋 规划中（大纲已定稿 17 篇，详见 `docs/plans/08 design-patterns-series-outline.md`） | — | ④ |
| 13 | 前端运维 | 📋 规划中（大纲已定稿 18 篇，详见 `docs/plans/10 frontend-ops-series-outline.md`） | — | ⑥ |
| 14 | AI 工程（应用开发） | 📋 规划中（大纲已定稿 16 篇，详见 `docs/plans/11 ai-application-engineering-outline.md`） | — | ★ 同步进行 |

---

## 00 AI 工具与职业发展（✅ 4 篇）

- Vibing Code 完全指南：AI 辅助编程新范式
- 从 Prompt 到 Loop：AI 工程化思维
- OpenClaw 完整指南
- FDE 职业方向：前端工程师转型 AI 应用工程师路径

---

## 01 JavaScript 深度（✅ 3 篇）

- JS 异步演进：回调 → Promise → async/await → 调度器
- 函数式编程：纯函数 / 柯里化 / Monad 与前端实战
- ECMAScript 演进：ES6 → ES2025 核心特性全梳理

---

## 02 TypeScript（✅ 5 篇）

- TypeScript 完整指南（合集）
- Part 1 入门：基础类型与接口
- Part 2 进阶：泛型 / 工具类型 / 类型体操
- Part 3 高级：条件类型 / infer / 模板字面量类型
- Axios 完全指南：基于 TS 的 HTTP 客户端封装

---

## 03 工程化与构建工具（✅ 8 篇）

- JS 模块规范全解：CommonJS / ESM / 模块解析算法
- Git 深度指南：原理 / 工作流 / 高频命令实战
- npm / yarn / pnpm 深度对比：存储机制 / 幽灵依赖 / workspace
- Monorepo 架构：Turborepo + pnpm workspace 工程化实战
- Webpack 5 完全指南：Module Graph / Tapable / Federation
- CSS 工程化完全指南：Modules / Tailwind / Design Token / Storybook
- Rollup 完全指南：库打包标准 / output.format / 插件体系
- Vite 完全指南：ESM Dev Server / HMR / 插件 API / 生产构建

---

## 04 性能与前端监控（✅ 13 篇）

- 浏览器渲染管线：从 HTML 到像素的完整流程
- Core Web Vitals 2026：LCP / CLS / INP 定义与优化
- 前端监控系统设计：架构选型 / 数据流 / 存储方案
- 性能 SDK：Web Vitals 采集与上报实现
- 行为监控 SDK：用户行为序列采集与回放
- 错误监控 SDK：JS 错误 / Promise / 资源加载异常捕获
- 告警与 AI 自愈：阈值策略 / 智能降噪 / 自动修复闭环
- 自定义上报 SDK：埋点 DSL / 批量上报 / 离线缓存
- 渲染范式演进：从 SSR 到 ISR 再到 PPR
- 运行时优化：防抖节流 / Reflow 控制 / React 调度
- Vite Tree Shaking 与 Bundle 分析优化
- 网络与资源加载完全指南：preload / prefetch / HTTP/2 / 缓存策略
- 感知性能优化：骨架屏 / 乐观更新 / View Transitions API

---

## 05 Vue 2 源码（✅ 13 篇）

- 响应式原理：Object.defineProperty / Dep / Watcher 完整实现
- 组件渲染流程：createElement / patch / 组件实例化
- Vue 2 初始化：new Vue() 全流程 / 选项合并 / 生命周期
- 虚拟 DOM 与 Diff：snabbdom 算法 / key 的作用 / 同层比较
- 事件系统：$on / $emit / 原生事件代理
- 模板编译：parse → optimize → generate 三阶段
- 插槽机制：普通插槽 / 作用域插槽 / v-slot 语法糖
- 内置组件与核心 API：keep-alive / transition / nextTick
- Vue Router 原理：hash / history 模式 / 路由守卫 / 动态路由
- Vue 2 性能优化：长列表 / 函数式组件 / 异步组件
- SSR 服务端渲染：renderToString / 客户端激活 / 数据预取
- 单元测试：Vue Test Utils / 组件挂载 / 事件模拟
- Vuex 原理：Store 实现 / 模块化 / 插件机制

---

## 06 Vue 3 源码（✅ 12 篇）

- 设计架构：Monorepo 结构 / 模块职责 / 与 Vue 2 对比
- 响应式原理：Proxy / Reflect / effect / track / trigger
- 组件渲染：createVNode / render / 调度器 / 异步队列
- 虚拟 DOM 与 Diff：最长递增子序列 / 静态提升 / Fragment
- Composition API：setup / ref / reactive / computed / watch 原理
- 内置组件：Teleport / Suspense / KeepAlive / Transition 实现
- 模板编译器：编译优化 / Block Tree / PatchFlag / 动态节点收集
- Pinia 原理：defineStore / storeToRefs / 插件体系
- Vue Router 4：组合式 API / 动态路由 / 导航守卫
- Vue 3 性能优化：Tree Shaking / 静态提升 / 编译时优化
- Monorepo 组件库搭建：Vite + TypeScript + Vitest 工程实践
- 后台管理脚手架：权限路由 / 动态菜单 / 国际化

---

## 07 React 18（🚧 进行中，大纲已定稿 14 篇，详见 `docs/plans/04 react18-family-series-outline.md`）

> 主线：架构演进 → 状态更新与优先级 → 渲染与 Diff → commit → Hooks → 并发 → 事件与 Context → 生态（Router / 状态管理 / SSR）→ 性能与工程化

- React 18 架构全景：从 Stack 到 Fiber 的演进与源码调试环境搭建
- React 18 状态更新：Update 双轨链表与 Lane 优先级模型深度拆解
- React 18 渲染原理：mount / update / unmount 全流程与 bailout 复用机制
- React 18 Diff 算法：单节点与多节点 Diff 源码精读
- React 18 commit 阶段：三个子阶段与 effect 执行顺序原理
- React 18 Hooks 深度：设计哲学、dispatcher 切换与 Hook 链表源码
- React 18 并发渲染：Scheduler 时间切片、Lane 模型与 Suspense 原理
- React 18 事件系统：合成事件、事件委托与自动批处理原理
- React 18 Context：依赖传播机制与手写实现
- React Router 6/7：Data Router 预取数据范式与权限路由实战
- React 状态管理：Redux Toolkit 源码解析与 MobX / Zustand 选型对比
- React 18 服务端渲染：流式 SSR 与 Server Components 原理实战
- React 18 性能优化：memo / useMemo / 虚拟列表与 React Compiler
- React 18 工程化实战：Turborepo + Monorepo 后台管理系统从零搭建

---

## 08 Node.js 全栈（📋 规划中，大纲已定稿 18 篇，详见 `docs/plans/05 node-fullstack-series-outline.md`）

> 写作顺序第一优先；协议原理部分见《09 网络原理》系列，本系列聚焦 Node.js 运行时、框架、数据库的实现层；第 11 篇起统一「基本使用 / 企业最佳实践 / 注意事项」三段式

- JS 异步基石：高阶函数 / 发布订阅 / Promise / 函数柯里化
- JS 调度引擎：Generator / async-await / EventLoop 浏览器与 Node 差异
- Node.js 运行时内核：V8+libuv 架构 / CommonJS 加载机制 / ESM 深度拆解
- Node.js I/O 体系：Buffer / Stream / path / fs / 背压机制
- Node.js 核心 API 大全：process / crypto / net / os / worker_threads
- Web 认证体系：Cookie / Session / JWT / OAuth2
- Express 深度：路由 / 中间件链 / 错误处理 / 手写核心
- Koa 深度：洋葱模型 / compose 原理 / 手写实现
- NestJS+TypeScript：IoC / DI / 装饰器元编程 / 模块化架构
- BFF 架构模式：API Gateway vs BFF / 多端数据聚合与裁剪
- Serverless 架构：云函数 / API 网关 / 部署形态演进
- MySQL 全栈：基本使用 / 索引与事务最佳实践 / 慢查询与设计范式
- MongoDB 深度：文档模型 / 聚合管道 / 索引策略 / Mongoose 最佳实践
- Redis 深度：五大数据结构 / 持久化 / 缓存与分布式锁最佳实践 / 接口限流
- PostgreSQL 进阶：窗口函数 / JSONB / 高级索引 / pgvector 向量扩展
- GraphQL+Apollo：Schema 设计 / Resolver / DataLoader N+1
- Node.js 测试与部署：测试分层 / supertest / Docker 多阶段构建 / PM2 与 Cluster
- Node.js 可观测性与安全：消息队列解耦 / 安全实践 / 内存泄漏排查 / APM 链路追踪

---

## 09 网络原理（📋 规划中，大纲已定稿 10 篇，详见 `docs/plans/06 network-principles-series-outline.md`）

> 承接《08 Node.js 全栈》系列之后写；篇章顺序按协议栈依赖关系自底向上排列：DNS → TCP → TLS → HTTP 演进 → HTTP 语义

- DNS 解析：递归查询 / CDN 原理 / DNS-over-HTTPS
- TCP 深度：三次握手 / 四次挥手 / 拥塞控制 / 滑动窗口
- HTTPS 与 TLS：握手过程 / 证书链 / HSTS / Certificate Pinning
- HTTP 演进：HTTP/1.1 / HTTP/2 多路复用 / HTTP/3 + QUIC
- HTTP 语义基础：内容协商 / 状态码语义 / 方法安全性与幂等性
- WebSocket：握手协议 / 帧格式 / 心跳 / 与 SSE 对比
- 跨域与安全：CORS 机制 / CSRF / XSS / CSP / 安全响应头
- 缓存体系：强缓存 / 协商缓存 / Service Worker 缓存策略
- RESTful 与 GraphQL：设计原则 / N+1 问题 / DataLoader
- 反向代理与负载均衡：正向/反向代理 / 虚拟主机 / 负载均衡算法 / 防盗链

---

## 10 泛客户端：微信小程序（📋 规划中，大纲已定稿 12 篇，详见 `docs/plans/09 miniprogram-series-outline.md`）

> 主线：架构原理（双线程模型）→ 生命周期与路由 → 渲染机制（setData）→ 组件化 → 样式层 → 网络与存储 → 安全鉴权 → 支付与开放能力 → 性能优化 → 工程化发布 → 跨端框架 → 云开发

- 小程序架构解密：双线程模型与渲染层-逻辑层通信机制
- 生命周期与路由栈：App/Page/Component 三级生命周期 + 页面栈管理
- 数据绑定与更新原理：setData 序列化开销与渲染性能陷阱
- 组件化开发：Component 构造器 / behaviors 混入 / 组件通信全解
- WXML/WXSS 底层机制：模板编译 / rpx 单位 / 条件与列表渲染性能
- 网络与存储：wx.request 封装实战 / 本地缓存策略 / 文件系统
- 登录鉴权与安全：wx.login 授权流程 / openid-unionid / 数据签名校验
- 微信支付与开放能力：统一下单流程 / webview 跳转 / 订阅消息
- 性能优化实战：分包加载 / 预下载 / 长列表虚拟化 / 首屏优化
- 工程化与发布流程：CI/CD 自动化上传 / 分包体积治理 / 审核发布策略
- Taro / uni-app 跨端方案：编译时 vs 运行时架构对比 / 条件编译 / 选型决策
- 小程序云开发：云函数 / 云数据库 / 云调用与自建后端对比

---

## 11 数据结构与算法（📋 规划中，大纲已定稿 13 篇，详见 `docs/plans/07 data-structures-algorithms-outline.md`）

> 主线：前端场景切入 → 复杂度分析 → 线性结构（栈 / 队列 / 链表 / 散列表）→ 树与堆与图 → 算法（排序 / 搜索 / 递归 / DP）

- 为什么前端也需要算法？React Fiber / 虚拟 DOM / 事件队列里的数据结构
- 时间与空间复杂度：从前端代码瓶颈到 Big-O 分析体系
- 栈：浏览器调用栈 / undo 历史 / 单调栈高频题型全解
- 队列：事件循环任务队列 / BFS / 双端队列与滑动窗口
- 链表：React Fiber 链表结构与 LRU Cache 手写实现
- 集合与散列表：ES6 Set / Map 底层原理与高频面试题
- 树：DOM 遍历 / 虚拟 DOM diff / BST / Trie 前缀树实战
- 堆：优先队列 / Top-K / 数据流中位数手写最小堆
- 图：Webpack 模块依赖图 / 拓扑排序 / 最短路径
- 排序：V8 TimSort 源码解析 / 快排 / 归并 / 稳定性全解
- 搜索：二分搜索变体精讲 / BFS 最短路径 / DFS 回溯
- 递归：递归三要素 / 尾递归 / 记忆化到 DP 的跨越
- 动态规划：状态转移方程建模 / 编辑距离 / 背包问题

---

## 12 设计模式（📋 规划中，大纲已定稿 17 篇，详见 `docs/plans/08 design-patterns-series-outline.md`）

> 主线：UML 图示能力 → SOLID 设计原则 → 创建型模式（对象怎么生产）→ 结构型模式（对象怎么组合）→ 行为型模式（对象怎么协作）；按信息密度重新分组成篇，不是「1 个 GoF 模式 = 1 篇」

- 导读：为什么前端要懂设计模式 + UML 类图/序列图速查
- 设计原则：SOLID 与前端场景全解
- 单例模式：从 ESM 模块单例到全局状态管理
- 工厂方法与建造者模式：创建什么 vs 怎么创建
- 原型模式：JS 原型链是不是原型模式？
- 适配器模式与外观模式：包一层改接口
- 装饰器模式：从 TS Decorator 到 React HOC
- 代理模式：从 ES6 Proxy 到缓存/懒加载代理
- 组合模式与桥接模式：树形结构与维度解耦
- 享元模式：对象池与虚拟列表节点复用
- 观察者模式与发布-订阅模式：谁才是真正的解耦
- 策略模式：从表单校验到 Hook 封装
- 职责链模式：中间件的本质
- 命令模式：撤销重做与任务队列
- 状态模式与模板方法模式：用结构取代 if-else
- 迭代器模式：从 Iterator 协议到 Generator
- 收官篇：中介者模式 / 备忘录模式 / 访问者模式 / 解释器模式

---

## 13 前端运维（📋 规划中，大纲已定稿 18 篇，详见 `docs/plans/10 frontend-ops-series-outline.md`）

> 篇章顺序按部署环境依赖关系排列：Linux 系统底层能力 → Docker 容器化 → Nginx 网关配置 → Jenkins CI/CD 自动化 → Kubernetes 容器编排

- Linux 基础与文件系统：发行版脉络 / FHS 目录结构 / 权限位与 inode
- Vim 编辑器：三种模式切换 / 移动编辑命令 / 配置定制
- 用户与权限管理：用户组模型 / chmod-chown / SUID-SGID-Sticky Bit
- 认证与安全：SSH 密钥认证原理 / sudo 权限委派 / PAM 机制
- Shell 与脚本：Bash 语法 / 管道重定向 / grep-sed-awk 文本三剑客
- 包管理：apt-yum-dpkg-rpm 对比 / 依赖解析原理
- 系统资源与进程管理：CPU 负载与内存指标 / 进程信号与孤儿僵尸进程
- 服务与 systemd：unit 文件 / 服务生命周期管理 / journalctl 日志
- 网络配置与排查：ip-netstat-ss-curl / iptables-firewalld / 端口排查
- Docker 核心原理：容器与虚拟机对比 / Namespace 隔离 / Cgroups 资源限制 / UnionFS 镜像分层
- Dockerfile 与生产实践：多阶段构建 / Layer 缓存 / Compose 编排 / 数据卷与网络模式
- Nginx 核心与反向代理配置：master-worker 进程模型 / 配置文件结构 / 负载均衡实操
- Nginx 生产实战：SPA history 路由 / gzip 与缓存头 / HTTPS 证书配置
- Jenkins 核心概念：CI-CD 理念 / Master-Agent 架构 / 插件体系
- Jenkins Pipeline 实战：Jenkinsfile 声明式语法 / 多分支流水线 / 集成 Docker 构建
- Kubernetes 核心概念：架构组件 / Pod-Deployment-Service / kubectl 基本操作
- Kubernetes 配置与网络：ConfigMap-Secret / Ingress 路由 / PV-PVC 存储卷
- Kubernetes 前端部署实战：滚动更新与健康检查 / HPA 自动扩缩容 / 故障排查

---

## 14 AI 工程（📋 规划中，大纲已定稿 16 篇，详见 `docs/plans/11 ai-application-engineering-outline.md`）

> ★ 与其他系列同步进行；主线：基础设施层（多模型接入 → 流式传输）→ 交互层（Prompt 工程化 → RAG 检索增强）→ 推理层（AI Agent：工具调用 → 多步编排）→ 框架整合层（Vercel AI SDK）→ 生产化层（安全防护 → 评估体系 → 成本与可观测性）→ 综合实战；与《00 AI 工具与职业发展》系列分工不重复，pgvector 索引原理见《08 Node.js 全栈》系列

- 导读：从 Demo 到生产级 AI 系统——AI 应用工程师技术地图
- LLM API 接入与多模型抽象：用 Strategy Pattern 统一 Claude / GPT / 通义千问
- Streaming 与 SSE：Token 流如何变成打字机效果
- Prompt Engineering 进阶：结构化输出与 Function Calling Schema 设计
- RAG 系统（上）：文档分块策略与 Embedding 实战
- RAG 系统（下）：向量检索、重排序与混合检索
- pgvector 应用实战：从 Schema 设计到召回质量优化
- AI Agent 基础：Tool Use 与 Function Calling 模式
- AI Agent 进阶：ReAct 框架与多步骤编排
- MCP 协议深度：从工具定义到 MCP Server 构建与发布
- 多智能体系统：LangGraph 状态机 / Agent 间消息路由 / 防循环死锁
- Vercel AI SDK 实战：useChat / useCompletion 与 RSC Streaming
- AI 应用安全：Prompt Injection 防护与输出过滤
- AI 工程化（上）：评估体系与 A/B 测试
- AI 工程化（下）：成本控制与可观测性
- 收官篇：药品问答系统实战——RAG + Agent + SSE 全链路整合

## 文章命名规范

```
docs/articles/{系列编号} {系列名}/YYYY-MM-DD-{slug}.md
```

系列编号两位数字，文章按实际发布日期命名，slug 全小写连字符。

---

*更新时间：2026-09-11（修正总览表与章节标题的编号/篇数矛盾：10 小程序 / 11 数据结构与算法（13 篇）/ 12 设计模式，React 18 补全 14 篇大纲；写作顺序：08 Node.js 全栈优先，14 AI 工程同步进行；删除 15 测试体系（已在 Vue 系列覆盖）；系列总数 15 个）| 当前已发布文章数：60 篇*
