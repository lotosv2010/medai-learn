'use client'

import { useState, useEffect } from 'react'

// Navigation data
const navGroups = [
  {
    label: '职业方向',
    items: [
      { id: 'dir', label: '方向决策分析' },
      { id: 'compare', label: 'AI 工程师 vs FDE' },
    ],
  },
  {
    label: '知识体系',
    items: [
      { id: 'ai-outline', label: 'AI 应用工程师大纲' },
      { id: 'fde-outline', label: 'FDE 知识大纲' },
    ],
  },
  {
    label: '项目实战',
    items: [
      { id: 'project', label: 'medai-learn 项目' },
      { id: 'timeline', label: '6 个月学习路线' },
    ],
  },
  {
    label: '工具',
    items: [
      { id: 'progress', label: '知识点进度追踪' },
    ],
  },
]

// AI modules data
const aiModules = [
  {
    num: { label: '一', bg: '#e0e7ff', color: '#2563eb' },
    title: 'JavaScript / TypeScript 深度',
    badge: '面试必考',
    badgeClass: 'badge-coral',
    topics: [
      {
        title: '执行机制',
        color: '#2563eb',
        items: [
          { label: '事件循环 Event Loop', cls: 'h' },
          { label: '宏任务/微任务', cls: 'h' },
          { label: '执行上下文/调用栈', cls: 'k' },
          { label: '作用域链/闭包', cls: 'k' },
          { label: 'TDZ 暂时性死区' },
          { label: '变量提升 Hoisting' },
        ],
      },
      {
        title: '原型与面向对象',
        color: '#2563eb',
        items: [
          { label: '原型链机制', cls: 'h' },
          { label: '继承的 6 种方式', cls: 'k' },
          { label: 'new 操作符原理', cls: 'k' },
          { label: 'Object.create' },
          { label: 'Class 语法糖' },
          { label: 'instanceof 原理' },
        ],
      },
      {
        title: '异步编程',
        color: '#2563eb',
        items: [
          { label: 'Promise 原理与手写', cls: 'h' },
          { label: 'async/await 实现', cls: 'h' },
          { label: 'Generator/Iterator', cls: 'k' },
          { label: 'Promise.all/race/allSettled' },
          { label: '并发控制' },
          { label: 'AbortController' },
        ],
      },
      {
        title: 'TypeScript 体系',
        color: '#2563eb',
        items: [
          { label: '类型体操（条件/映射类型）', cls: 'k' },
          { label: '泛型约束', cls: 'k' },
          { label: '工具类型实现原理', cls: 'h' },
          { label: '类型守卫' },
          { label: '协变与逆变' },
          { label: 'infer 关键字', cls: 'k' },
          { label: '装饰器' },
          { label: '声明合并' },
        ],
      },
      {
        title: '内存与性能',
        color: '#2563eb',
        items: [
          { label: '垃圾回收机制' },
          { label: '内存泄漏排查' },
          { label: 'WeakRef' },
          { label: 'V8 优化原理' },
        ],
      },
    ],
  },
  {
    num: { label: '二', bg: '#d1fae5', color: '#0d9488' },
    title: 'React / Vue 框架精通',
    badge: '面试必考',
    badgeClass: 'badge-coral',
    topics: [
      {
        title: 'React 核心原理',
        color: '#0d9488',
        items: [
          { label: 'Fiber 架构详解', cls: 'h' },
          { label: 'Reconciler/Diff 算法', cls: 'h' },
          { label: 'Concurrent Mode', cls: 'k' },
          { label: 'Scheduler 优先级调度', cls: 'k' },
          { label: 'Hooks 实现原理', cls: 'h' },
          { label: 'useTransition/useDeferredValue' },
          { label: '合成事件系统' },
          { label: 'Suspense 原理' },
        ],
      },
      {
        title: '性能优化',
        color: '#0d9488',
        items: [
          { label: 'memo/useMemo/useCallback', cls: 'h' },
          { label: '虚拟列表', cls: 'k' },
          { label: 'Code Splitting' },
          { label: 'React Server Components', cls: 'k' },
          { label: 'Hydration 问题' },
          { label: '懒加载策略' },
        ],
      },
      {
        title: '状态管理',
        color: '#0d9488',
        items: [
          { label: 'Zustand 原理', cls: 'k' },
          { label: 'Redux Toolkit' },
          { label: 'Jotai 原子化' },
          { label: 'React Query/SWR', cls: 'k' },
          { label: '状态管理选型标准', cls: 'h' },
        ],
      },
      {
        title: 'Next.js 全栈框架',
        color: '#0d9488',
        items: [
          { label: 'App Router vs Pages Router', cls: 'k' },
          { label: 'SSR/SSG/ISR 对比', cls: 'k' },
          { label: 'RSC 核心原理', cls: 'k' },
          { label: 'Server Actions' },
          { label: 'Streaming SSR' },
          { label: 'Edge Runtime' },
        ],
      },
    ],
  },
  {
    num: { label: '三', bg: '#fee2e2', color: '#dc2626' },
    title: 'AI 应用开发核心',
    badge: '重点突破',
    badgeClass: 'badge-coral',
    topics: [
      {
        title: 'LLM API 集成',
        color: '#dc2626',
        items: [
          { label: 'OpenAI/Claude/国内模型 API', cls: 'h' },
          { label: 'Streaming 流式输出', cls: 'k' },
          { label: 'Function Calling/Tool Use' },
          { label: '多模态输入', cls: 'k' },
          { label: 'Token 计算与成本优化' },
          { label: '模型选型策略' },
        ],
      },
      {
        title: 'Prompt Engineering',
        color: '#dc2626',
        items: [
          { label: 'System Prompt 设计', cls: 'k' },
          { label: 'Few-shot/Zero-shot' },
          { label: 'Chain of Thought', cls: 'k' },
          { label: '结构化输出控制' },
          { label: 'Prompt 安全防护' },
          { label: 'Temperature/Top-P 调参' },
        ],
      },
      {
        title: 'RAG 检索增强生成',
        color: '#dc2626',
        items: [
          { label: 'Embedding 向量化原理', cls: 'k' },
          { label: '向量数据库', cls: 'h' },
          { label: '文档分块策略', cls: 'k' },
          { label: '语义检索 vs 关键词检索' },
          { label: 'Reranking 重排序' },
          { label: 'RAG 评估指标' },
        ],
      },
      {
        title: 'AI Agent 开发',
        color: '#dc2626',
        items: [
          { label: 'LangChain/LangGraph', cls: 'h' },
          { label: 'ReAct 推理框架', cls: 'k' },
          { label: 'Tool/Plugin 设计' },
          { label: '多 Agent 协作', cls: 'k' },
          { label: '记忆系统设计' },
          { label: 'MCP 协议', cls: 'h' },
        ],
      },
      {
        title: 'AI 产品工程实践',
        color: '#dc2626',
        items: [
          { label: 'AI 对话 UI 组件设计', cls: 'k' },
          { label: '流式渲染优化' },
          { label: 'AI 错误降级处理' },
          { label: '语义缓存' },
          { label: 'Vercel AI SDK', cls: 'k' },
          { label: '国内模型接入（通义/文心/混元）' },
        ],
      },
    ],
  },
  {
    num: { label: '四', bg: '#fef3c7', color: '#d97706' },
    title: '前端工程化 & 架构',
    badge: '架构必备',
    badgeClass: 'badge-amber',
    topics: [
      {
        title: '构建工具体系',
        color: '#d97706',
        items: [
          { label: 'Vite 原理', cls: 'h' },
          { label: 'Webpack 5 深入', cls: 'k' },
          { label: 'Turbopack/Rspack' },
          { label: 'Tree Shaking 原理' },
          { label: '自定义插件开发' },
        ],
      },
      {
        title: '微前端架构',
        color: '#d97706',
        items: [
          { label: 'qiankun/Wujie/single-spa', cls: 'k' },
          { label: 'Module Federation' },
          { label: '沙箱隔离原理', cls: 'h' },
          { label: 'CSS 隔离方案' },
          { label: '微前端通信' },
        ],
      },
      {
        title: 'Monorepo 工程',
        color: '#d97706',
        items: [
          { label: 'pnpm workspace', cls: 'k' },
          { label: 'Turborepo/Nx' },
          { label: '包版本管理' },
          { label: 'changesets' },
          { label: '发包流程' },
        ],
      },
      {
        title: 'CI/CD & DevOps',
        color: '#d97706',
        items: [
          { label: 'GitHub Actions', cls: 'k' },
          { label: 'Docker 容器化前端' },
          { label: 'Nginx 配置' },
          { label: 'CDN 策略' },
          { label: '灰度发布' },
          { label: '监控告警接入' },
        ],
      },
    ],
  },
  {
    num: { label: '五', bg: '#d1fae5', color: '#0d9488' },
    title: 'Node.js 全栈能力',
    badge: '能力扩展',
    badgeClass: 'badge-teal',
    topics: [
      {
        title: 'Node.js 核心',
        color: '#0d9488',
        items: [
          { label: 'Event Loop（与浏览器区别）', cls: 'h' },
          { label: 'Stream 流式处理', cls: 'k' },
          { label: 'Child Process/Worker Threads' },
          { label: '模块系统 CJS/ESM' },
        ],
      },
      {
        title: 'Web 框架',
        color: '#0d9488',
        items: [
          { label: 'Hono（Edge 友好）', cls: 'k' },
          { label: 'Fastify' },
          { label: 'Express 中间件原理' },
          { label: 'tRPC 类型安全 API', cls: 'k' },
          { label: 'RESTful 设计规范' },
        ],
      },
      {
        title: '数据库',
        color: '#0d9488',
        items: [
          { label: 'PostgreSQL 核心', cls: 'k' },
          { label: 'Prisma/Drizzle ORM' },
          { label: 'Redis 缓存策略' },
          { label: '数据库事务与锁' },
          { label: '索引优化' },
          { label: 'pgvector 向量扩展', cls: 'k' },
        ],
      },
      {
        title: '云服务与部署',
        color: '#0d9488',
        items: [
          { label: 'Vercel/Serverless 部署', cls: 'k' },
          { label: '阿里云/腾讯云基础' },
          { label: '对象存储（OSS/S3）' },
          { label: '消息队列基础' },
        ],
      },
    ],
  },
  {
    num: { label: '六', bg: '#ede9fe', color: '#7c3aed' },
    title: '性能优化 & Web 基础',
    badge: '面试高频',
    badgeClass: 'badge-coral',
    topics: [
      {
        title: '浏览器渲染原理',
        color: '#7c3aed',
        items: [
          { label: '关键渲染路径', cls: 'h' },
          { label: '回流/重绘/合成', cls: 'k' },
          { label: '层叠上下文' },
          { label: 'GPU 加速原理' },
          { label: '从输入 URL 到页面展示', cls: 'h' },
        ],
      },
      {
        title: '性能指标与优化',
        color: '#7c3aed',
        items: [
          { label: 'Core Web Vitals（LCP/CLS/INP）', cls: 'k' },
          { label: '首屏优化策略', cls: 'h' },
          { label: '图片优化（WebP/AVIF）' },
          { label: 'Long Task 优化' },
          { label: '性能监控体系搭建', cls: 'k' },
        ],
      },
      {
        title: '网络协议',
        color: '#7c3aed',
        items: [
          { label: 'HTTP/1.1 vs HTTP/2 vs HTTP/3', cls: 'h' },
          { label: 'HTTPS/TLS 握手', cls: 'k' },
          { label: 'WebSocket' },
          { label: 'SSE（AI 流式输出必备）', cls: 'k' },
          { label: '缓存策略（强缓存/协商缓存）', cls: 'h' },
        ],
      },
      {
        title: '安全',
        color: '#7c3aed',
        items: [
          { label: 'XSS/CSRF 防御', cls: 'h' },
          { label: 'CSP 内容安全策略', cls: 'k' },
          { label: 'OAuth 2.0/OIDC' },
          { label: 'JWT 原理与安全' },
          { label: 'CORS 详解' },
        ],
      },
    ],
  },
  {
    num: { label: '七', bg: '#f3f4f6', color: '#6b7280' },
    title: '算法 & 数据结构',
    badge: '面试必刷',
    badgeClass: 'badge-amber',
    topics: [
      {
        title: '前端高频题型',
        color: '#6b7280',
        items: [
          { label: '双指针/滑动窗口', cls: 'h' },
          { label: '树的遍历（DFS/BFS）', cls: 'h' },
          { label: '动态规划基础', cls: 'h' },
          { label: '链表操作', cls: 'k' },
          { label: '栈/队列应用' },
          { label: '哈希表' },
        ],
      },
      {
        title: '前端特有算法',
        color: '#6b7280',
        items: [
          { label: '手写 LRU Cache', cls: 'h' },
          { label: '实现 Promise.all', cls: 'h' },
          { label: '节流/防抖', cls: 'h' },
          { label: '深克隆', cls: 'k' },
          { label: 'EventEmitter 实现', cls: 'k' },
          { label: '虚拟 DOM Diff' },
          { label: '异步并发控制', cls: 'h' },
        ],
      },
    ],
  },
]

// FDE modules data
const fdeModules = [
  {
    num: { label: '共', bg: '#ede9fe', color: '#7c3aed' },
    title: 'AI 技术基础（与 AI 工程师完全重叠）',
    badge: '共享基础',
    badgeClass: 'badge-purple',
    note: '这是两个方向的公共地基，medai-learn 项目已完整覆盖，无需重复学习，直接复用。',
    topics: [
      {
        title: 'LLM API 集成',
        color: '#7c3aed',
        items: [
          { label: 'Streaming 流式输出', cls: 's' },
          { label: 'Function Calling', cls: 's' },
          { label: '多模态输入', cls: 's' },
          { label: 'Token 计算', cls: 's' },
          { label: '错误处理与重试', cls: 's' },
        ],
      },
      {
        title: 'RAG 系统',
        color: '#7c3aed',
        items: [
          { label: '向量化与检索', cls: 's' },
          { label: '分块策略', cls: 's' },
          { label: '重排序', cls: 's' },
          { label: 'pgvector', cls: 's' },
          { label: 'RAG 评估指标', cls: 's' },
        ],
      },
      {
        title: 'AI Agent',
        color: '#7c3aed',
        items: [
          { label: 'Tool Use 设计', cls: 's' },
          { label: 'ReAct 框架', cls: 's' },
          { label: '记忆系统', cls: 's' },
          { label: 'LangChain/LangGraph', cls: 's' },
          { label: 'MCP 协议', cls: 's' },
        ],
      },
    ],
  },
  {
    num: { label: '一', bg: '#fee2e2', color: '#dc2626' },
    title: '企业级 AI 架构与部署',
    badge: 'FDE 核心',
    badgeClass: 'badge-coral',
    topics: [
      {
        title: '企业 AI 落地路径',
        color: '#dc2626',
        items: [
          { label: 'AI 成熟度模型（AMM）', cls: 'h' },
          { label: '从 PoC 到生产的差距分析', cls: 'k' },
          { label: '企业 AI 采购决策链', cls: 'k' },
          { label: 'AI ROI 计算框架' },
          { label: '变更管理 Change Management' },
        ],
      },
      {
        title: '私有化与混合部署',
        color: '#dc2626',
        items: [
          { label: '私有云 vs 公有云 vs 混合云', cls: 'h' },
          { label: 'Ollama 本地模型部署', cls: 'k' },
          { label: 'vLLM 推理服务', cls: 'k' },
          { label: '模型量化（GGUF/AWQ）' },
          { label: '气隙环境（Air-gap）部署' },
          { label: '硬件资源估算（GPU 选型）' },
        ],
      },
      {
        title: '企业集成模式',
        color: '#dc2626',
        items: [
          { label: 'API Gateway + 权限管理', cls: 'k' },
          { label: 'SSO/SAML 集成', cls: 'k' },
          { label: '多租户 AI 服务设计', cls: 'k' },
          { label: 'Batch API 批处理' },
          { label: '审计日志与合规追踪' },
        ],
      },
      {
        title: '成本控制与优化',
        color: '#dc2626',
        items: [
          { label: 'Token 用量监控与告警', cls: 'h' },
          { label: '语义缓存', cls: 'k' },
          { label: '模型路由（按复杂度分流）' },
          { label: 'Prompt 压缩技术' },
          { label: '预算上限与限流策略' },
        ],
      },
      {
        title: '可观测性与监控',
        color: '#dc2626',
        items: [
          { label: 'LangSmith/Langfuse', cls: 'k' },
          { label: '延迟/错误率/幻觉率追踪' },
          { label: 'Prompt A/B 测试' },
          { label: '用户反馈收集与迭代' },
        ],
      },
    ],
  },
  {
    num: { label: '二', bg: '#fee2e2', color: '#dc2626' },
    title: 'AI 安全、合规与治理',
    badge: 'FDE 核心',
    badgeClass: 'badge-coral',
    topics: [
      {
        title: 'AI 安全防护',
        color: '#dc2626',
        items: [
          { label: 'Prompt Injection 防御', cls: 'h' },
          { label: 'Jailbreak 防护策略', cls: 'h' },
          { label: '输入输出过滤（内容安全）', cls: 'k' },
          { label: 'Guardrails 护栏框架', cls: 'k' },
          { label: 'PII 敏感信息脱敏' },
        ],
      },
      {
        title: '合规框架',
        color: '#dc2626',
        items: [
          { label: '等保 2.0 / 网络安全法', cls: 'h' },
          { label: 'AI 大模型服务算法备案', cls: 'h' },
          { label: '医疗行业：HIPAA 基础', cls: 'k' },
          { label: '数据本地化要求' },
          { label: 'GDPR 基础（欧洲客户）' },
        ],
      },
      {
        title: '企业 AI 治理',
        color: '#dc2626',
        items: [
          { label: 'AI 使用政策制定框架', cls: 'k' },
          { label: '模型卡（Model Card）解读' },
          { label: 'AI 风险评估矩阵' },
          { label: '负责任 AI 原则落地' },
        ],
      },
    ],
  },
  {
    num: { label: '三', bg: '#fee2e2', color: '#dc2626' },
    title: '解决方案设计与 PoC 能力',
    badge: 'FDE 核心',
    badgeClass: 'badge-coral',
    topics: [
      {
        title: '需求挖掘与方案设计',
        color: '#dc2626',
        items: [
          { label: '发现式提问法', cls: 'h' },
          { label: '业务痛点到技术方案的翻译', cls: 'k' },
          { label: '方案可行性快速评估', cls: 'k' },
          { label: '竞品对比分析框架' },
          { label: '利益相关者地图' },
        ],
      },
      {
        title: 'PoC 快速交付',
        color: '#dc2626',
        items: [
          { label: '1-2 周内交付可演示 PoC', cls: 'h' },
          { label: '最小可演示原型（MDP）设计', cls: 'k' },
          { label: 'Streamlit/Gradio 快速 Demo', cls: 'k' },
          { label: 'Next.js 快速落地页' },
          { label: 'PoC 成功标准定义' },
        ],
      },
      {
        title: '技术文档能力',
        color: '#dc2626',
        items: [
          { label: '解决方案架构文档（SAD）', cls: 'h' },
          { label: '集成指南/快速开始文档', cls: 'k' },
          { label: 'API 参考文档' },
          { label: '故障排查手册（Runbook）' },
          { label: 'ROI 计算书' },
        ],
      },
    ],
  },
  {
    num: { label: '四', bg: '#fee2e2', color: '#dc2626' },
    title: '技术演讲与 Demo 能力',
    badge: 'FDE 独有',
    badgeClass: 'badge-coral',
    note: '这是 FDE 与纯技术工程师最核心的差异点，需要主动练习，技术人往往忽视。',
    topics: [
      {
        title: '演讲结构与叙事',
        color: '#dc2626',
        items: [
          { label: '金字塔原理（结论先行）', cls: 'h' },
          { label: 'STAR 法则讲项目案例', cls: 'h' },
          { label: '30 秒电梯演讲', cls: 'k' },
          { label: '技术价值量化表达', cls: 'k' },
          { label: '听众分层：CTO vs 开发 vs 业务' },
        ],
      },
      {
        title: 'Demo 设计原则',
        color: '#dc2626',
        items: [
          { label: 'Demo 剧本设计（Happy Path 优先）', cls: 'h' },
          { label: '展示业务价值而非技术细节', cls: 'k' },
          { label: '处理 Demo 失败的预案', cls: 'k' },
          { label: '实时 Demo vs 录屏选择' },
          { label: '数据脱敏与演示环境隔离' },
        ],
      },
      {
        title: '技术异议处理',
        color: '#dc2626',
        items: [
          { label: '「准确率够吗？」的应答框架', cls: 'h' },
          { label: '「数据安全怎么保证？」', cls: 'h' },
          { label: '「为什么不用 XXX 模型？」', cls: 'k' },
          { label: '「成本太高了」的拆解方式' },
          { label: '专业地说「我确认后回复」' },
        ],
      },
    ],
  },
  {
    num: { label: '五', bg: '#fef3c7', color: '#d97706' },
    title: '垂直行业 AI 落地案例',
    badge: '行业壁垒',
    badgeClass: 'badge-amber',
    note: '你的医疗电商背景在这里是核心竞争力，重点打透医疗场景，其他行业了解即可。',
    topics: [
      {
        title: '医疗健康（重点，你的护城河）',
        color: '#d97706',
        items: [
          { label: '药品智能问答/说明书解读', cls: 'h' },
          { label: '处方辅助审核', cls: 'h' },
          { label: '医疗文书生成', cls: 'k' },
          { label: '智能客服（问诊前分诊）', cls: 'k' },
          { label: '医疗数据 AI 合规要求' },
          { label: '药监局相关法规基础' },
        ],
      },
      {
        title: '金融（第二优先）',
        color: '#d97706',
        items: [
          { label: '智能投顾/财报解读', cls: 'k' },
          { label: '反欺诈辅助' },
          { label: '合规文档自动化' },
          { label: '金融 AI 监管要求' },
        ],
      },
      {
        title: '通用企业场景',
        color: '#d97706',
        items: [
          { label: '企业知识库/内部问答', cls: 'k' },
          { label: '代码辅助（竞品分析）', cls: 'k' },
          { label: '会议纪要自动生成' },
          { label: '合同审查辅助' },
        ],
      },
    ],
  },
  {
    num: { label: '六', bg: '#fef3c7', color: '#d97706' },
    title: 'AI 平台与产品深度',
    badge: '平台差异化',
    badgeClass: 'badge-amber',
    topics: [
      {
        title: 'Anthropic Claude 体系（FDE 重中之重）',
        color: '#d97706',
        items: [
          { label: 'Claude API 完整能力边界', cls: 'h' },
          { label: 'Constitutional AI 原则', cls: 'h' },
          { label: 'Claude 各模型对比', cls: 'k' },
          { label: 'Claude 企业场景差异化优势', cls: 'k' },
          { label: 'MCP 生态深度', cls: 'k' },
          { label: 'Anthropic 产品路线图' },
        ],
      },
      {
        title: '主流平台横向对比',
        color: '#d97706',
        items: [
          { label: 'OpenAI GPT-4o/o1 对比', cls: 'k' },
          { label: '国内模型：通义/文心/混元/Kimi', cls: 'k' },
          { label: 'Azure OpenAI vs 直连 API' },
          { label: '各平台定价模型' },
          { label: 'SLA 与企业协议差异' },
        ],
      },
      {
        title: 'AI 开发生态',
        color: '#d97706',
        items: [
          { label: 'LangChain vs LlamaIndex', cls: 'k' },
          { label: 'Vercel AI SDK' },
          { label: '向量数据库横评（pgvector/Pinecone/Weaviate）' },
          { label: 'AI 评估框架（Ragas/DeepEval）' },
        ],
      },
    ],
  },
  {
    num: { label: '七', bg: '#d1fae5', color: '#0d9488' },
    title: '客户成功与技术咨询软技能',
    badge: '软技能',
    badgeClass: 'badge-teal',
    topics: [
      {
        title: '客户沟通方法论',
        color: '#0d9488',
        items: [
          { label: 'SPIN 销售提问法', cls: 'h' },
          { label: '主动倾听与需求澄清', cls: 'k' },
          { label: '期望值管理', cls: 'k' },
          { label: '冲突与投诉处理' },
          { label: '利用客户成功推动续约' },
        ],
      },
      {
        title: '英文技术写作（外资必备）',
        color: '#0d9488',
        items: [
          { label: '英文技术邮件（Escalation 格式）', cls: 'h' },
          { label: '英文 PoC 报告', cls: 'k' },
          { label: '英文技术演讲', cls: 'k' },
          { label: '专业技术词汇积累' },
        ],
      },
    ],
  },
]

// Progress data
const progressData: Record<string, string[]> = {
  JavaScript: ['事件循环 & 微宏任务', 'Promise 手写实现', 'async/await 底层原理', '原型链 & 继承', '闭包 & 作用域链', 'Generator & Iterator', '内存管理 & GC'],
  TypeScript: ['类型体操（条件/映射类型）', '泛型约束设计', '工具类型原理（Partial/Required/Pick）', '协变与逆变', 'infer 关键字', '装饰器'],
  React: ['Fiber 架构', 'Reconciler & Diff 算法', 'Concurrent Mode & Scheduler', 'Hooks 实现原理', 'useTransition & useDeferredValue', 'React Server Components', 'memo/useMemo/useCallback', '虚拟列表实现'],
  'Next.js': ['App Router 路由机制', 'RSC vs Client Component', 'SSR/SSG/ISR 原理', 'Server Actions', 'Streaming SSR', 'Edge Runtime'],
  'AI 开发': ['LLM API 基础接入', 'Streaming 流式输出', 'Function Calling/Tool Use', 'Prompt Engineering 基础', 'RAG 完整流程', '向量数据库使用', '文档分块策略', 'AI Agent 设计', 'LangChain 核心', '多模型路由策略'],
  工程化: ['Monorepo + Turborepo', 'Vite 原理', 'Webpack 5 & 模块联邦', '微前端架构', 'CI/CD（GitHub Actions）', 'Docker 容器化'],
  'Node.js': ['Event Loop（与浏览器区别）', 'Stream 流式处理', 'Hono 框架', 'tRPC 端对端类型安全', 'PostgreSQL + Drizzle ORM', 'Redis 缓存策略', 'pgvector 向量扩展'],
  算法: ['双指针 & 滑动窗口', '树的遍历 DFS/BFS', '动态规划基础', '手写 LRU Cache', '手写 Promise.all', '节流 & 防抖', '深克隆实现', 'EventEmitter 实现'],
  'FDE 独有': ['企业 AI 成熟度模型', '私有化部署方案', 'Prompt Injection 防御', '技术演讲（金字塔原理）', 'Demo 设计原则', 'PoC 快速交付', '医疗 AI 落地案例', 'SPIN 提问法', '英文技术写作'],
}

const STATUS = ['未开始', '了解', '理解', '掌握']
const STATUS_CLS = ['s0', 's1', 's2', 's3']

// Accordion component
function Accordion({
  num,
  title,
  badge,
  badgeClass,
  topics,
  note,
}: {
  num: { label: string; bg: string; color: string }
  title: string
  badge: string
  badgeClass: string
  topics: Array<{
    title: string
    color: string
    items: Array<{ label: string; cls?: string }>
  }>
  note?: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="accord">
      <div
        className={`accord-hd ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div
          className="accord-num"
          style={{ background: num.bg, color: num.color }}
        >
          {num.label}
        </div>
        <span className="accord-title">{title}</span>
        <span className={`badge ${badgeClass}`}>{badge}</span>
        <span className="accord-chevron">▶</span>
      </div>
      <div className={`accord-body ${isOpen ? 'open' : ''}`}>
        {note && (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text3)',
              padding: '10px 12px',
              background: 'var(--bg2)',
              borderRadius: 'var(--r)',
              marginBottom: '12px',
              borderLeft: '2px solid var(--border2)',
            }}
          >
            {note}
          </div>
        )}
        {topics.map((topic, topicIdx) => (
          <div key={topicIdx} className="topic">
            <div className="topic-title" style={{ color: topic.color }}>
              <span className="topic-dot" />
              {topic.title}
            </div>
            <div className="tags">
              {topic.items.map((item, itemIdx) => (
                <span key={itemIdx} className={`tag ${item.cls || ''}`}>
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Main page component
export default function CareerRoadmap() {
  const [activeSection, setActiveSection] = useState('dir')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [progress, setProgress] = useState<Record<string, number>>({})

  // Load progress from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('career-progress')
      if (saved) {
        setProgress(JSON.parse(saved))
      }
    } catch {
      // ignore
    }
  }, [])

  // Save progress to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('career-progress', JSON.stringify(progress))
  }, [progress])

  const handleNavClick = (id: string) => {
    setActiveSection(id)
    setIsSidebarOpen(false)
    window.scrollTo(0, 0)
  }

  const cycleStatus = (key: string) => {
    setProgress((prev) => {
      const current = prev[key] || 0
      const next = (current + 1) % 4
      return { ...prev, [key]: next }
    })
  }

  const masteredCount = Object.values(progress).filter((v) => v === 3).length
  const totalItems = Object.values(progressData).flat().length

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-tag">CAREER ROADMAP</div>
          <h1>
            AI 工程师
            <br />
            职业学习手册
          </h1>
        </div>
        <nav className="nav">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="nav-group">
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                >
                  <span className="dot" />
                  {item.label}
                </div>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="main">
        {/* Section: Direction Decision */}
        <section className={`section ${activeSection === 'dir' ? 'active' : ''}`}>
          <div className="page-title">职业方向决策</div>
          <div className="page-sub">
            基于 10 年前端经验 + 医疗电商背景 + 当前 AI 就业市场的综合分析
          </div>

          <div className="section-title">核心推荐</div>
          <div className="callout callout-teal">
            主攻{' '}
            <strong style={{ color: 'var(--teal)' }}>AI 应用工程师</strong>，同步关注{' '}
            <strong style={{ color: 'var(--blue)' }}>FDE（前沿部署工程师）</strong>。两者技术基础 70%
            重叠，一份投入双向受益。你在 1 药网的医疗电商背景，在医疗 AI 赛道是稀缺资产。
          </div>

          <div className="section-title">三大方向对比</div>

          <div className="dir-card rec">
            <div className="dir-header">
              <div className="dir-icon" style={{ background: 'var(--teal-bg)' }}>
                🤖
              </div>
              <div>
                <div className="dir-title">
                  AI 应用工程师{' '}
                  <span className="badge badge-teal">强烈推荐</span>
                </div>
                <div className="dir-desc">
                  以前端为基础，专攻 LLM 集成、AI 产品开发。市场需求急剧增长，与 AI
                  同行而非对抗。
                </div>
              </div>
            </div>
            <div className="tags">
              <span className="tag">LLM API</span>
              <span className="tag">RAG</span>
              <span className="tag">AI Agent</span>
              <span className="tag">Prompt Engineering</span>
              <span className="tag">向量数据库</span>
              <span className="tag">Node.js</span>
            </div>
            <div className="pros-cons">
              <div className="pros">
                <div className="pros-title">✦ 优势</div>
                <ul>
                  <li>前端经验直接迁移</li>
                  <li>市场需求急剧增长</li>
                  <li>医疗背景是竞争壁垒</li>
                  <li>岗位数量多，选择多</li>
                </ul>
              </div>
              <div className="cons">
                <div className="cons-title">△ 挑战</div>
                <ul>
                  <li>需补充 AI/ML 基础知识</li>
                  <li>技术迭代极快</li>
                  <li>35岁焦虑仍存在</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="dir-card">
            <div className="dir-header">
              <div className="dir-icon" style={{ background: 'var(--blue-bg)' }}>
                🚀
              </div>
              <div>
                <div className="dir-title">
                  前沿部署工程师 FDE{' '}
                  <span className="badge badge-blue">高价值稀缺</span>
                </div>
                <div className="dir-desc">
                  帮助企业客户成功落地 AI，技术 + 咨询复合型。适合 AI 基础设施公司（Anthropic /
                  阿里云 AI 等）。
                </div>
              </div>
            </div>
            <div className="tags">
              <span className="tag">企业 AI 部署</span>
              <span className="tag">PoC 交付</span>
              <span className="tag">技术演讲</span>
              <span className="tag">客户成功</span>
              <span className="tag">解决方案设计</span>
            </div>
            <div className="pros-cons">
              <div className="pros">
                <div className="pros-title">✦ 优势</div>
                <ul>
                  <li>35岁焦虑较小（经验积累增值）</li>
                  <li>薪资天花板极高</li>
                  <li>医疗行业背景加分</li>
                </ul>
              </div>
              <div className="cons">
                <div className="cons-title">△ 挑战</div>
                <ul>
                  <li>国内岗位极少</li>
                  <li>需额外培养演讲能力</li>
                  <li>无法作为唯一目标</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="dir-card">
            <div className="dir-header">
              <div className="dir-icon" style={{ background: 'var(--amber-bg)' }}>
                🏗️
              </div>
              <div>
                <div className="dir-title">
                  前端架构师{' '}
                  <span className="badge badge-amber">大厂路线</span>
                </div>
                <div className="dir-desc">
                  将 10 年经验转化为架构设计能力，走 P8/P9 或技术管理路线。
                </div>
              </div>
            </div>
            <div className="pros-cons">
              <div className="pros">
                <div className="pros-title">✦ 优势</div>
                <ul>
                  <li>10 年经验是核心竞争力</li>
                  <li>薪资天花板高</li>
                </ul>
              </div>
              <div className="cons">
                <div className="cons-title">△ 挑战</div>
                <ul>
                  <li>大厂名额极少竞争激烈</li>
                  <li>35岁焦虑依然存在</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Compare */}
        <section className={`section ${activeSection === 'compare' ? 'active' : ''}`}>
          <div className="page-title">AI 应用工程师 vs FDE</div>
          <div className="page-sub">
            两个方向的本质差异、技能重叠与差量分析
          </div>

          <div className="section-title">本质差异</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>维度</th>
                  <th style={{ color: 'var(--teal)' }}>AI 应用工程师</th>
                  <th style={{ color: 'var(--blue)' }}>FDE 前沿部署工程师</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>工作重心</td>
                  <td>构建产品，代码交付</td>
                  <td>协助企业客户成功落地 AI</td>
                </tr>
                <tr>
                  <td>日常产出</td>
                  <td>功能代码、PR、架构设计</td>
                  <td>集成方案、PoC Demo、培训文档</td>
                </tr>
                <tr>
                  <td>核心技能</td>
                  <td>工程深度、系统设计</td>
                  <td>技术广度、沟通表达、方案咨询</td>
                </tr>
                <tr>
                  <td>雇主类型</td>
                  <td>任何有 AI 产品的公司</td>
                  <td>AI 基础设施公司（Anthropic / 阿里云 AI）</td>
                </tr>
                <tr>
                  <td>国内岗位</td>
                  <td>
                    <span className="badge badge-teal">多</span>
                  </td>
                  <td>
                    <span className="badge badge-amber">极少</span>
                  </td>
                </tr>
                <tr>
                  <td>35 岁焦虑</td>
                  <td>
                    <span className="badge badge-amber">仍存在</span>
                  </td>
                  <td>
                    <span className="badge badge-teal">较小</span>
                  </td>
                </tr>
                <tr>
                  <td>你的医疗背景</td>
                  <td>
                    <span className="badge badge-teal">直接加分</span>
                  </td>
                  <td>
                    <span className="badge badge-teal">间接加分</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="section-title">技能重叠分析</div>
          <div className="overlap-bar">
            <div
              className="ob-label"
              style={{ background: 'var(--teal-bg)', color: 'var(--teal)' }}
            >
              完全共享 70%
            </div>
            <div className="ob-content">
              LLM API 集成 · RAG 系统 · Prompt Engineering · AI Agent · 流式输出 ·
              多模型路由
              <br />
              <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
                medai-learn 项目 100% 覆盖，不需要额外学习
              </span>
            </div>
          </div>
          <div className="overlap-bar">
            <div
              className="ob-label"
              style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}
            >
              部分重叠 20%
            </div>
            <div className="ob-content">
              系统设计 · 数据库 · Node.js · Docker · 性能监控
              <br />
              <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
                AI 工程师需要深度，FDE 只需够用
              </span>
            </div>
          </div>
          <div className="overlap-bar">
            <div
              className="ob-label"
              style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}
            >
              FDE 独有 30%
            </div>
            <div className="ob-content">
              企业 AI 部署架构 · PoC 交付 · 安全合规 · 技术演讲 · 客户成功 · 行业案例库
              · 英文技术写作
              <br />
              <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
                需要额外 4-6 周专项补充
              </span>
            </div>
          </div>

          <div className="section-title">
            FDE 额外补充的差量（约 4-6 周）
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>补什么</th>
                  <th>怎么练</th>
                  <th>投入时间</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>技术演讲 / Demo</td>
                  <td>对着镜头讲 medai-learn 每个模块，录视频复盘</td>
                  <td>持续练习</td>
                </tr>
                <tr>
                  <td>企业部署架构</td>
                  <td>
                    读 Anthropic / AWS 企业 AI 白皮书，整理 3 个行业方案模板
                  </td>
                  <td>2 周</td>
                </tr>
                <tr>
                  <td>安全合规基础</td>
                  <td>读国内 AI 大模型服务管理办法 + 等保 2.0 核心条款</td>
                  <td>1 周</td>
                </tr>
                <tr>
                  <td>Streamlit PoC 工具</td>
                  <td>用 Streamlit 重新包装 medai-learn 的 RAG 模块为可演示 Demo</td>
                  <td>1 周</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="callout callout-amber">
            <strong style={{ color: 'var(--amber)' }}>决策结论</strong>：先以 AI
            应用工程师为主攻目标，第 5 个月开始把 FDE 岗位加进投递范围。两者技术基础完全重叠，一份投入双向受益。你的医疗电商
            10 年背景在医疗 AI 类 FDE 岗位是极稀缺的竞争优势。
          </div>
        </section>

        {/* Section: AI Outline */}
        <section className={`section ${activeSection === 'ai-outline' ? 'active' : ''}`}>
          <div className="page-title">AI 应用工程师知识体系</div>
          <div className="page-sub">
            系统覆盖前端工程师晋升 AI 应用工程师的完整知识点。
            <span style={{ color: 'var(--coral)' }}>红色</span>为面试高频，
            <span style={{ color: 'var(--blue)' }}>蓝色</span>为核心必掌握。
          </div>

          <div>
            {aiModules.map((m, idx) => (
              <Accordion
                key={idx}
                num={m.num}
                title={m.title}
                badge={m.badge}
                badgeClass={m.badgeClass}
                topics={m.topics}
              />
            ))}
          </div>
        </section>

        {/* Section: FDE Outline */}
        <section className={`section ${activeSection === 'fde-outline' ? 'active' : ''}`}>
          <div className="page-title">FDE 前沿部署工程师知识体系</div>
          <div className="page-sub">
            在 AI 应用工程师基础上的增量知识体系。
            <span style={{ color: 'var(--coral)' }}>红色</span>为 FDE 独有高频要求，
            <span style={{ color: 'var(--purple)' }}>紫色</span>为与 AI 工程师共享知识点。
          </div>

          <div>
            {fdeModules.map((m, idx) => (
              <Accordion
                key={idx}
                num={m.num}
                title={m.title}
                badge={m.badge}
                badgeClass={m.badgeClass}
                topics={m.topics}
                note={m.note}
              />
            ))}
          </div>
        </section>

        {/* Section: Project */}
        <section className={`section ${activeSection === 'project' ? 'active' : ''}`}>
          <div className="page-title">medai-learn 项目框架</div>
          <div className="page-sub">
            以医疗 AI 助手为载体，系统覆盖 AI 应用工程师知识体系的实战项目
          </div>

          <div className="section-title">项目定位</div>
          <div className="callout callout-teal">
            <strong style={{ color: 'var(--teal)' }}>双重价值</strong>：一是真实可上线的医疗
            AI 产品（简历项目）；二是系统学习 AI
            工程化的载体（每个功能模块对应具体知识点）。你的 1
            药网背景让业务理解成为技术学习的杠杆。
          </div>

          <div className="section-title">目录结构</div>
          <div className="tree">
            <span className="dir">medai-learn/</span>
            {'\n'}├── <span className="dir">.claude/</span>
            {'                    '}
            <span className="comment"># Claude Code Harness</span>
            {'\n'}│   ├── settings.json
            {'           '}
            <span className="comment"># Hooks 生命周期配置</span>
            {'\n'}│   ├── <span className="dir">hooks/</span>
            {'\n'}│   │   ├── session-start.js
            {'    '}
            <span className="comment"># 启动加载进度，输出学习建议</span>
            {'\n'}│   │   ├── post-edit.sh
            {'        '}
            <span className="comment"># 编辑后自动 TS 检查 + ESLint</span>
            {'\n'}│   │   ├── pre-bash.sh
            {'         '}
            <span className="comment"># 危险命令拦截</span>
            {'\n'}│   │   └── session-end.js
            {'      '}
            <span className="comment"># 会话结束生成学习小结</span>
            {'\n'}│   └── <span className="dir">skills/</span>
            {'\n'}│       ├── learn/SKILL.md
            {'      '}
            <span className="comment"># /learn 记录知识点</span>
            {'\n'}│       ├── quiz/SKILL.md
            {'       '}
            <span className="comment"># /quiz 面试题自测</span>
            {'\n'}│       ├── explain/SKILL.md
            {'    '}
            <span className="comment"># /explain 原理深挖</span>
            {'\n'}│       ├── review/SKILL.md
            {'     '}
            <span className="comment"># /review 代码审查</span>
            {'\n'}│       ├── refactor/SKILL.md
            {'   '}
            <span className="comment"># /refactor 学习式重构</span>
            {'\n'}│       └── checklist/SKILL.md
            {'  '}
            <span className="comment"># /checklist 掌握清单</span>
            {'\n'}├── <span className="dir">apps/</span>
            {'\n'}│   ├── <span className="dir">web/</span>
            {'                    '}
            <span className="comment"># Next.js 15 前端</span>
            {'\n'}│   ├── <span className="dir">api/</span>
            {'                    '}
            <span className="comment"># Hono + tRPC 后端</span>
            {'\n'}│   └── <span className="dir">ai-engine/</span>
            {'             '}
            <span className="comment"># AI 核心（RAG / Agent）</span>
            {'\n'}├── <span className="dir">packages/</span>
            {'\n'}│   ├── <span className="dir">ui/</span>
            {'                     '}
            <span className="comment"># Shadcn 组件库</span>
            {'\n'}│   ├── <span className="dir">shared/</span>
            {'                 '}
            <span className="comment"># TypeScript 类型</span>
            {'\n'}│   └── <span className="dir">ai-sdk/</span>
            {'                 '}
            <span className="comment"># 多模型抽象层</span>
            {'\n'}└── <span className="dir">docs/</span>
            {'\n'}
            {'    '}
            ├── PRD.md / SPEC.md / ARCHITECTURE.md / DESIGN.md
            {'\n'}
            {'    '}
            ├── <span className="dir">tasks/</span>CURRENT.md
            {'       '}
            <span className="comment"># 当前迭代任务</span>
            {'\n'}
            {'    '}
            ├── <span className="dir">decisions/</span>
            {'              '}
            <span className="comment"># ADR 架构决策记录</span>
            {'\n'}
            {'    '}
            └── <span className="dir">learning/</span>progress.json
            {'  '}
            <span className="comment"># 学习进度（自动维护）</span>
          </div>

          <div className="section-title">技术栈与学习目标对照</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>模块</th>
                  <th>技术选型</th>
                  <th>核心学习目标</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>apps/web</td>
                  <td style={{ color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                    Next.js 15 + React 19
                  </td>
                  <td>Fiber 架构 / RSC / Hooks 原理 / 性能优化</td>
                </tr>
                <tr>
                  <td>apps/api</td>
                  <td style={{ color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                    Hono + tRPC + Drizzle
                  </td>
                  <td>Node.js 事件循环 / API 设计 / 数据库事务</td>
                </tr>
                <tr>
                  <td>apps/ai-engine</td>
                  <td style={{ color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                    Vercel AI SDK + LangChain
                  </td>
                  <td>RAG / Agent / Streaming / Prompt Engineering</td>
                </tr>
                <tr>
                  <td>packages/shared</td>
                  <td style={{ color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                    TypeScript 5.x
                  </td>
                  <td>类型体操 / 泛型约束 / 工具类型原理</td>
                </tr>
                <tr>
                  <td>packages/ai-sdk</td>
                  <td style={{ color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                    Claude / GPT / 通义
                  </td>
                  <td>Strategy 模式 / 多模型抽象 / 接口设计</td>
                </tr>
                <tr>
                  <td>工程化</td>
                  <td style={{ color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                    Turborepo + pnpm
                  </td>
                  <td>Monorepo / 构建缓存 / CI/CD</td>
                </tr>
                <tr>
                  <td>数据层</td>
                  <td style={{ color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                    PostgreSQL + pgvector + Redis
                  </td>
                  <td>向量检索 / 缓存策略 / 索引优化</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="section-title">ADR 架构决策记录（7 个）</div>
          <div className="card-grid">
            <div className="card">
              <div className="block-title" style={{ fontSize: '13px' }}>
                ADR-0001 · Monorepo 工具链
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
                为什么用 pnpm + Turborepo 而非多 Repo
              </div>
            </div>
            <div className="card">
              <div className="block-title" style={{ fontSize: '13px' }}>
                ADR-0002 · AI 模型选型
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
                主力 Claude，降级链设计，Strategy 模式
              </div>
            </div>
            <div className="card">
              <div className="block-title" style={{ fontSize: '13px' }}>
                ADR-0003 · 数据库选型
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
                PostgreSQL + pgvector + Redis 组合理由
              </div>
            </div>
            <div className="card">
              <div className="block-title" style={{ fontSize: '13px' }}>
                ADR-0004 · App Router
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
                为什么用 App Router 而非 Pages Router
              </div>
            </div>
            <div className="card">
              <div className="block-title" style={{ fontSize: '13px' }}>
                ADR-0005 · 状态管理
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
                Zustand + React Query，为什么不用 Redux
              </div>
            </div>
            <div className="card">
              <div className="block-title" style={{ fontSize: '13px' }}>
                ADR-0006 · tRPC vs REST
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
                端对端类型安全的实现原理与取舍
              </div>
            </div>
            <div className="card">
              <div className="block-title" style={{ fontSize: '13px' }}>
                ADR-0007 · 认证方案
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
                JWT 内存存储 + HttpOnly Cookie 安全设计
              </div>
            </div>
          </div>

          <div className="section-title">Claude Code 学习命令</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>命令</th>
                  <th>用途</th>
                  <th>示例</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                    /learn
                  </td>
                  <td>记录知识点到笔记文件</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '12px' }}>
                    /learn React Fiber 双缓冲机制
                  </td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                    /quiz
                  </td>
                  <td>生成针对性面试题自测</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '12px' }}>
                    /quiz react 或 /quiz ai
                  </td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                    /explain
                  </td>
                  <td>深挖原理 WHAT-WHY-HOW-GOTCHA</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '12px' }}>
                    /explain Promise 微任务队列
                  </td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                    /review
                  </td>
                  <td>代码审查 + 学习点标注</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '12px' }}>
                    /review hooks/useChat.ts
                  </td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                    /refactor
                  </td>
                  <td>重构代码并讲解设计原则</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '12px' }}>
                    /refactor
                  </td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                    /checklist
                  </td>
                  <td>知识点掌握程度清单</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '12px' }}>
                    /checklist typescript
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section: Timeline */}
        <section className={`section ${activeSection === 'timeline' ? 'active' : ''}`}>
          <div className="page-title">6 个月学习路线</div>
          <div className="page-sub">
            在职备考，每天 1.5-2 小时，以 AI 应用工程师为主线，FDE 为并行增量
          </div>

          <div className="section-title">主线：AI 应用工程师（6 个月）</div>
          <div className="timeline">
            <div className="tl-item">
              <div
                className="tl-dot"
                style={{ background: 'var(--bg)', borderColor: 'var(--teal)' }}
              />
              <div className="tl-phase">第 1 月 · Phase 1</div>
              <div className="tl-title">夯实 JS/TS 底层 + 接触 AI API</div>
              <div className="tl-body">
                并行启动：一边查漏补缺 JavaScript 核心（执行机制、原型、异步），一边用
                Claude API 做一个小项目（药品说明书解析助手），建立 AI
                开发的感觉。完成 Monorepo 初始化和认证系统。
              </div>
              <div className="tags" style={{ marginTop: '8px' }}>
                <span className="tag">JS 核心 30 题</span>
                <span className="tag">TS 类型体操</span>
                <span className="tag">第一个 AI 项目</span>
                <span className="tag">每日 LeetCode 1 题</span>
              </div>
            </div>
            <div className="tl-item">
              <div
                className="tl-dot"
                style={{ background: 'var(--bg)', borderColor: 'var(--teal)' }}
              />
              <div className="tl-phase">第 2 月 · Phase 2 前段</div>
              <div className="tl-title">React 原理深挖 + RAG 系统实战</div>
              <div className="tl-body">
                精读 React Fiber/Hooks
                原理，同时动手搭建 RAG 知识库系统（以药品说明书为数据源），能讲清楚向量化检索流程。实现流式
                AI 对话界面。
              </div>
              <div className="tags" style={{ marginTop: '8px' }}>
                <span className="tag">React 源码精读</span>
                <span className="tag">RAG 实战</span>
                <span className="tag">向量数据库</span>
                <span className="tag">算法：树/链表</span>
              </div>
            </div>
            <div className="tl-item">
              <div
                className="tl-dot"
                style={{ background: 'var(--bg)', borderColor: 'var(--amber)' }}
              />
              <div className="tl-phase">第 3 月 · Phase 2 后段</div>
              <div className="tl-title">工程化深度 + AI Agent 开发</div>
              <div className="tl-body">
                系统整理微前端/工程化知识体系，同时学习
                LangChain/LangGraph，构建一个多工具 AI
                Agent（能查药品信息、分析处方的 Agent）。
              </div>
              <div className="tags" style={{ marginTop: '8px' }}>
                <span className="tag">微前端架构</span>
                <span className="tag">Agent 项目</span>
                <span className="tag">Monorepo 实践</span>
                <span className="tag">算法：DP/回溯</span>
              </div>
            </div>
            <div className="tl-item">
              <div
                className="tl-dot"
                style={{ background: 'var(--bg)', borderColor: 'var(--amber)' }}
              />
              <div className="tl-phase">第 4 月 · Phase 3</div>
              <div className="tl-title">Node.js 全栈 + 系统设计</div>
              <div className="tl-body">
                系统补充 Node.js + 数据库知识，能独立搭建完整 AI 后端服务。开始练习系统设计题，重点是
                AI 对话系统、知识库系统的设计方案。
                <br />
                <span style={{ color: 'var(--blue)', fontSize: '12px' }}>
                  FDE 并行：读企业 AI 白皮书 + Streamlit PoC 工具
                </span>
              </div>
              <div className="tags" style={{ marginTop: '8px' }}>
                <span className="tag">Node.js + PostgreSQL</span>
                <span className="tag">tRPC</span>
                <span className="tag">系统设计 5 题</span>
                <span className="tag">Docker 部署</span>
              </div>
            </div>
            <div className="tl-item">
              <div
                className="tl-dot"
                style={{ background: 'var(--bg)', borderColor: 'var(--coral)' }}
              />
              <div className="tl-phase">第 5 月 · Phase 4 前段</div>
              <div className="tl-title">综合项目打磨 + 简历完善</div>
              <div className="tl-body">
                完成完整的 AI 全栈项目，整理
                GitHub，开始在掘金写技术文章，完善简历，开始投递目标公司。
                <br />
                <span style={{ color: 'var(--blue)', fontSize: '12px' }}>
                  FDE 并行：准备 3 套技术演讲稿（面向 CTO / 业务 VP / 安全团队）
                </span>
              </div>
              <div className="tags" style={{ marginTop: '8px' }}>
                <span className="tag">完整项目上线</span>
                <span className="tag">GitHub 整理</span>
                <span className="tag">技术文章</span>
                <span className="tag">简历定稿</span>
              </div>
            </div>
            <div className="tl-item">
              <div
                className="tl-dot"
                style={{ background: 'var(--bg)', borderColor: 'var(--coral)' }}
              />
              <div className="tl-phase">第 6 月 · Phase 4 后段</div>
              <div className="tl-title">高强度面试冲刺</div>
              <div className="tl-body">
                全力面试，每场面试后复盘整理。AI 工程师岗位广泛投递，FDE
                精投头部 AI 平台（Anthropic / 阿里云 AI / 百度智能云）。先投中小公司练手，再冲目标公司。
              </div>
              <div className="tags" style={{ marginTop: '8px' }}>
                <span className="tag">模拟面试每日</span>
                <span className="tag">LeetCode Hot 100</span>
                <span className="tag">双线投递</span>
                <span className="tag">Offer 谈判</span>
              </div>
            </div>
          </div>

          <div className="section-title">里程碑</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>里程碑</th>
                  <th>时间</th>
                  <th>交付物</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>M1 基础运行</td>
                  <td>第 1 月末</td>
                  <td>Monorepo 启动 + 认证系统 + 基础 UI</td>
                </tr>
                <tr>
                  <td>M2 AI 对话</td>
                  <td>第 2 月中</td>
                  <td>流式对话界面 + LLM 接入</td>
                </tr>
                <tr>
                  <td>M3 RAG 上线</td>
                  <td>第 2 月末</td>
                  <td>药品知识库 + RAG 检索</td>
                </tr>
                <tr>
                  <td>M4 全栈完整</td>
                  <td>第 3-4 月</td>
                  <td>完整后端 + 数据持久化</td>
                </tr>
                <tr>
                  <td>M5 项目上线</td>
                  <td>第 5 月末</td>
                  <td>生产部署 + 性能达标 + 简历完善</td>
                </tr>
                <tr>
                  <td>M6 拿到 Offer</td>
                  <td>第 6 月</td>
                  <td>AI 工程师 Offer / FDE 面试进入终面</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section: Progress */}
        <section className={`section ${activeSection === 'progress' ? 'active' : ''}`}>
          <div className="page-title">知识点进度追踪</div>
          <div className="page-sub">
            点击每个知识点更新掌握状态。状态会保存在本地。
          </div>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '20px',
              flexWrap: 'wrap',
            }}
          >
            <span>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--text3)',
                  marginRight: '5px',
                }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text2)' }}>
                ⬜ 未开始
              </span>
            </span>
            <span>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--amber)',
                  marginRight: '5px',
                }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text2)' }}>
                🟨 了解
              </span>
            </span>
            <span>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--blue)',
                  marginRight: '5px',
                }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text2)' }}>
                🟦 理解
              </span>
            </span>
            <span>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--teal)',
                  marginRight: '5px',
                }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text2)' }}>
                ✅ 掌握
              </span>
            </span>
          </div>

          <div
            style={{
              marginBottom: '20px',
              padding: '14px 16px',
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r2)',
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--text2)' }}>
              总进度：
              <span style={{ color: 'var(--teal)', fontWeight: 500 }}>
                {masteredCount}
              </span>{' '}
              / {totalItems} 已掌握
            </div>
          </div>

          <div>
            {Object.entries(progressData).map(([category, items]) => (
              <div key={category}>
                <div className="section-title">{category}</div>
                <div className="progress-grid">
                  {items.map((item) => {
                    const key = `${category}::${item}`
                    const status = progress[key] || 0
                    return (
                      <div
                        key={key}
                        className={`prog-item s${status}`}
                        onClick={() => cycleStatus(key)}
                      >
                        <div className="pi-label">{item}</div>
                        <div className={`pi-status ${STATUS_CLS[status]}`}>
                          {STATUS[status]}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Mobile menu button */}
      <button
        className="menu-btn"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label="菜单"
      >
        ☰
      </button>
    </div>
  )
}
