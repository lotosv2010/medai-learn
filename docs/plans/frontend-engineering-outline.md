# 前端全栈系列文章总大纲

> 10 年医疗电商前端经验晋升 AI 应用工程师的完整知识体系，共规划 16 个系列。

---

## 系列总览

| # | 系列名称 | 状态 | 文章数 |
|---|---------|------|--------|
| 00 | AI 工具与职业发展 | ✅ 完成 | 4 |
| 01 | JavaScript 深度 | ✅ 完成 | 3 |
| 02 | TypeScript | ✅ 完成 | 5 |
| 03 | 工程化与构建工具 | ✅ 完成 | 8 |
| 04 | 性能与前端监控 | ✅ 完成 | 13 |
| 05 | Vue 2 源码 | ✅ 完成 | 13 |
| 06 | Vue 3 源码 | ✅ 完成 | 12 |
| 07 | React 18 | 🚧 进行中 | 1 |
| 08 | 网络原理 | 📋 规划中（大纲已定稿 10 篇，先于 Node.js 系列写） | — |
| 09 | Node.js 全栈 | 📋 规划中（大纲已定稿 16 篇） | — |
| 10 | 泛客户端（小程序） | 📋 规划中 | — |
| 11 | 数据结构与算法 | 📋 规划中 | — |
| 12 | 设计模式 | 📋 规划中 | — |
| 13 | 前端运维 | 📋 规划中 | — |
| 14 | AI 工程（应用开发） | 📋 规划中 | — |
| 15 | 测试体系 | 📋 规划中 | — |

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

## 07 React 18（🚧 进行中，1/规划篇数）

- React 18 架构演进：从 Stack Reconciler 到 Fiber（✅ 已完成）
- Fiber 架构深度：数据结构 / 工作循环 / 优先级调度
- Lane 模型：位运算优先级 / 批处理 / 并发特性
- Hooks 原理：链表结构 / useState / useEffect / useReducer
- Concurrent Mode：startTransition / useDeferredValue / Suspense
- RSC（React Server Components）：客户端 / 服务端边界 / 序列化
- React 状态管理：Zustand / Jotai / Redux Toolkit 原理对比
- React Router v6：嵌套路由 / loader / action / 数据流
- Next.js 15 App Router：RSC / Streaming / PPR / 缓存策略
- React 性能优化：memo / useMemo / useCallback / profiler 实战
- React 测试：Testing Library / MSW / 快照测试

---

## 08 网络原理（📋 规划中，大纲已定稿 10 篇，详见 `docs/plans/network-principles-series-outline.md`，先于 Node.js 系列写）

> 篇章顺序按协议栈依赖关系自底向上排列：DNS → TCP → TLS → HTTP 演进 → HTTP 语义

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

## 09 Node.js 全栈（📋 规划中，大纲已定稿 15 篇，详见 `docs/plans/node-fullstack-series-outline.md`）

> 承接《08 网络原理》系列（HTTP/TLS/WebSocket 等协议原理），本系列不重复讲协议理论，只讲 Node.js 怎么实现

- JS 异步基石：高阶函数 / 发布订阅 / Promise / 函数柯里化
- JS 调度引擎：Generator / async-await / EventLoop 浏览器与 Node 差异
- Node.js 运行时内核：V8+libuv 架构 / CommonJS 加载机制 / ESM 深度拆解
- Node.js I/O 体系：Buffer / Stream / path / fs / 背压机制
- Node.js 核心 API 大全：process / crypto / net / os / worker_threads
- Web 认证体系：Cookie / Session / JWT / OAuth2
- Express 深度：路由 / 中间件链 / 错误处理 / 手写核心
- Koa 深度：洋葱模型 / compose 原理 / 手写实现
- NestJS+TypeScript：IoC / DI / 装饰器元编程 / 模块化架构
- MySQL 全栈：事务 / 索引原理 / 慢查询优化 / 设计范式
- MongoDB 深度：文档模型 / 聚合管道 / 索引策略 / Mongoose
- Redis 深度：五大数据结构 / 持久化 / 分布式锁 / 接口限流
- PostgreSQL 进阶：窗口函数 / 高级索引 / pgvector 向量扩展
- GraphQL+Apollo：Schema 设计 / Resolver / DataLoader N+1
- Node.js 工程化：测试 / Docker / Cluster / worker_threads / 消息队列 / 安全

---

## 10 泛客户端：微信小程序（📋 规划中）

- 小程序架构：双线程模型 / 渲染层与逻辑层通信
- 生命周期：App / Page / Component 三级生命周期对比
- 数据绑定与更新：setData 原理 / 批量更新 / 性能陷阱
- 组件系统：自定义组件 / behaviors / 抽象节点
- 网络与存储：wx.request 封装 / 本地缓存 / 文件系统
- 小程序性能优化：分包加载 / 预下载 / 骨架屏 / 渲染优化
- Taro / uni-app 跨端方案：编译原理 / 运行时差异 / 选型建议
- 小程序云开发：云函数 / 数据库 / 存储 / 实时推送

---

## 11 数据结构与算法（📋 规划中）

- 复杂度分析：时间 / 空间复杂度 / 摊还分析
- 数组与链表：原地操作 / 双指针 / 快慢指针
- 栈与队列：单调栈 / 优先队列 / 循环队列
- 树：二叉树遍历 / BST / AVL / 红黑树 / 前端场景应用
- 图：BFS / DFS / 拓扑排序 / 最短路径（前端构建图场景）
- 哈希表：冲突处理 / 一致性哈希 / 布隆过滤器
- 排序算法：快排 / 归并 / 堆排 / 计数排序及稳定性分析
- 动态规划：状态转移 / 记忆化搜索 / 经典题型
- 前端高频算法：虚拟 DOM Diff / LRU 缓存 / 并发控制 / 依赖解析

---

## 12 设计模式（📋 规划中）

- 创建型：单例 / 工厂 / 抽象工厂 / 建造者 / 原型
- 结构型：代理 / 装饰器 / 适配器 / 外观 / 组合
- 行为型：观察者 / 发布订阅 / 策略 / 命令 / 职责链 / 迭代器
- 前端专属模式：MVC / MVP / MVVM 演进 / Flux / 响应式编程
- React 模式：HOC / Render Props / 自定义 Hook / 复合组件
- 设计原则：SOLID / DRY / KISS / 最小惊讶原则

---

## 13 前端运维（📋 规划中）

- Docker：多阶段构建 / Layer 缓存 / Next.js standalone 镜像
- Nginx：SPA 路由配置 / gzip / 缓存头 / 反向代理 / SSL
- GitHub Actions：工作流语法 / 缓存策略 / Matrix / Reusable Workflow
- 质量门禁：typecheck + lint + test + build / Bundle Size 门禁
- 部署策略：Vercel / 蓝绿部署 / 金丝雀发布 / Feature Flags
- 可观测性：日志聚合 / 链路追踪 / 告警策略 / Grafana 看板

---

## 14 AI 工程（📋 规划中）

- LLM API 接入：Anthropic / OpenAI / 通义 SDK 封装 / 多模型抽象
- Streaming 与 SSE：流式响应原理 / ReadableStream / 前端渲染实现
- Prompt Engineering：系统提示设计 / Few-shot / Chain-of-Thought
- RAG 系统：文本切分 / Embedding / 向量检索 / 重排序
- pgvector 实战：向量存储 / 相似度查询 / 混合检索
- AI Agent：Tool Use / ReAct 模式 / LangChain / 多步骤编排
- AI SDK（Vercel）：useChat / useCompletion / RSC Streaming
- AI 应用安全：Prompt Injection 防护 / 输出过滤 / 速率限制
- AI 工程化：评估体系 / A/B 测试 / 成本控制 / 可观测性

---

## 15 测试体系（📋 规划中）

- 测试策略：测试金字塔 / 测试分层 / 覆盖率解读
- Vitest：与 Vite 同配置 / 原生 ESM / 并发执行 / 快照测试
- React Testing Library：以用户行为为中心 / 查询优先级
- MSW：Service Worker Mock / 请求拦截 / 与测试框架集成
- Playwright：E2E 测试 / 多浏览器 / 网络拦截 / CI 集成
- 组件测试：Storybook + Chromatic 视觉回归测试
- 测试驱动开发：TDD 在前端的实践边界与适用场景

---

## 文章命名规范

```
docs/articles/{系列编号} {系列名}/YYYY-MM-DD-{slug}.md
```

系列编号两位数字，文章按实际发布日期命名，slug 全小写连字符。

---

*更新时间：2026-09-10 | 当前总文章数：59 篇*
