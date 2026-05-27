# DESIGN · 设计规范

**版本**：v0.1.0 · **状态**：草稿 · **更新**：2025-01-01

> 本文档定义 MedAI Learn 的视觉语言、组件规范和交互模式。
> 设计目标：专业、克制、信任感。医疗场景不需要花哨，需要清晰和安全感。

---

## 1. 设计原则

### 1.1 核心价值

| 原则 | 含义 | 体现 |
|------|------|------|
| **信任感** | 用户面对医疗信息需要安全感 | 干净的排版、清晰的信源标注、错误友好提示 |
| **克制** | 不过度设计，信息优先 | 有限的颜色使用、充足的留白 |
| **响应** | 让用户感知到系统在"思考" | 流式输出动效、加载骨架屏、即时反馈 |
| **可及** | 所有用户都能使用 | WCAG AA 对比度、键盘导航、屏幕阅读器支持 |

### 1.2 设计不做什么

- ❌ 不使用渐变背景（医疗场景需要白色基底）
- ❌ 不使用超过 3 种主题色（避免视觉干扰）
- ❌ 不使用强动效（医疗用户可能在紧张状态下使用）
- ❌ 不隐藏重要信息（AI 来源、置信度等必须可见）

---

## 2. 设计 Token（Tailwind + CSS Variables）

### 2.1 颜色系统

```css
/* packages/ui/src/tokens.css */

:root {
  /* 主色：医疗蓝 */
  --color-primary-50:  #EFF6FF;
  --color-primary-100: #DBEAFE;
  --color-primary-500: #3B82F6;
  --color-primary-600: #2563EB;   /* 主要按钮、链接 */
  --color-primary-700: #1D4ED8;   /* Hover 状态 */
  --color-primary-900: #1E3A8A;

  /* 中性色：内容主体 */
  --color-gray-50:  #F9FAFB;    /* 页面背景 */
  --color-gray-100: #F3F4F6;    /* 卡片背景 */
  --color-gray-200: #E5E7EB;    /* 分割线 */
  --color-gray-400: #9CA3AF;    /* 占位文字 */
  --color-gray-600: #4B5563;    /* 次要文字 */
  --color-gray-800: #1F2937;    /* 主要文字 */
  --color-gray-900: #111827;    /* 标题 */

  /* 语义色 */
  --color-success: #10B981;     /* 成功状态 */
  --color-warning: #F59E0B;     /* 警告（注意事项） */
  --color-danger:  #EF4444;     /* 错误、禁忌 */
  --color-info:    #3B82F6;     /* 信息提示 */

  /* AI 专用色（对话界面） */
  --color-user-bubble:  #EFF6FF;  /* 用户消息气泡 */
  --color-ai-bubble:    #FFFFFF;  /* AI 消息区域（白色卡片） */
  --color-ai-cursor:    #3B82F6;  /* AI 打字光标 */
}

/* 暗色模式（Phase 2 后实现） */
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary-600: #60A5FA;
    --color-gray-50:  #111827;
    --color-gray-900: #F9FAFB;
    /* ... */
  }
}
```

### 2.2 排版

```css
/* 字体栈 */
--font-sans: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* 字号（rem，基于 16px） */
--text-xs:   0.75rem;   /* 12px - 来源标注、角标 */
--text-sm:   0.875rem;  /* 14px - 辅助文字、时间戳 */
--text-base: 1rem;      /* 16px - 正文（消息内容） */
--text-lg:   1.125rem;  /* 18px - 卡片标题 */
--text-xl:   1.25rem;   /* 20px - 页面次标题 */
--text-2xl:  1.5rem;    /* 24px - 页面主标题 */

/* 行高 */
--leading-tight:  1.25;  /* 标题 */
--leading-normal: 1.5;   /* 正文 */
--leading-relaxed: 1.75; /* AI 长文本（阅读舒适） */
```

### 2.3 间距系统（4px 基准）

```
4px   → 极小间隔（badge 内边距）
8px   → 组件内元素间距
12px  → 小型组件间距
16px  → 标准间距（p-4）
24px  → 卡片内边距（p-6）
32px  → 区块间距（py-8）
48px  → 大区块间距（py-12）
```

### 2.4 圆角

```
2px  → 极小（tag/badge）
6px  → 标准（button、input）
8px  → 卡片
12px → 大卡片（对话气泡）
16px → 模态框
9999px → 胶囊形（status pill）
```

---

## 3. 核心组件规范

### 3.1 对话气泡（ChatBubble）

```
用户消息（右对齐）:
  ├─ 背景：var(--color-user-bubble)
  ├─ 圆角：12px 12px 2px 12px（右下角直角）
  ├─ 最大宽度：75%
  └─ 字体：text-base，leading-relaxed

AI 消息（左对齐）:
  ├─ 背景：白色卡片（带 border）
  ├─ 圆角：2px 12px 12px 12px（左上角直角）
  ├─ 最大宽度：100%（AI 回答通常较长）
  ├─ Markdown 渲染支持
  └─ 底部显示：来源引用（RAGSource 组件）

流式输出状态:
  ├─ 末尾显示蓝色光标动效（CSS animation，pulse）
  ├─ 滚动：新 token 追加时，自动滚动到底部
  └─ abort 按钮：输出时显示"停止生成"按钮
```

### 3.2 RAG 来源引用（SourceCitation）

```
展示形态：折叠区块（默认折叠）
标题：「参考来源 (N 个)」
展开后显示：
  ├─ 药品名称 + 章节名（如"布洛芬片说明书 · 药物相互作用"）
  ├─ 相关段落摘要（截取 80 字）
  └─ 相似度指示条（视觉化 0-1 分）

颜色语义：
  相似度 > 0.85 → 绿色（高相关）
  相似度 0.7-0.85 → 蓝色（相关）
  相似度 < 0.7 → 灰色（低相关，通常不展示）
```

### 3.3 输入区（ChatInput）

```
布局：固定在底部，悬浮在消息列表上方
高度：自适应（最小 56px，最大 200px）

内部结构：
  ├─ 文本域（textarea，自动扩展）
  ├─ 图片上传按钮（处方拍照）
  └─ 发送按钮（Enter 发送 / Shift+Enter 换行）

状态：
  default  → 边框 gray-200
  focused  → 边框 primary-500 + 阴影
  loading  → 禁用输入，显示"AI 思考中..."
  error    → 边框 danger，显示错误信息
```

### 3.4 药品警告标签（DrugWarning）

```
用于 AI 回答中标注安全信息
级别与颜色：
  ⚠️ 注意   → yellow 背景（var(--color-warning)）
  ❌ 禁忌   → red 背景（var(--color-danger)）
  💊 建议   → blue 背景（var(--color-info)）

格式：
  [图标] [标题] [内容文字]
必须包含：建议咨询医生 的链接提示
```

---

## 4. 页面布局规范

### 4.1 整体布局

```
┌──────────┬──────────────────────────────────────┐
│  侧边栏  │              主内容区                 │
│  240px   │         calc(100% - 240px)            │
│          │                                       │
│ 对话列表 │  顶部导航（48px 固定）                │
│          ├──────────────────────────────────────┤
│          │                                       │
│          │  消息列表（滚动区域）                  │
│          │                                       │
│          ├──────────────────────────────────────┤
│          │  输入区（固定底部，auto height）       │
└──────────┴──────────────────────────────────────┘

移动端（< 768px）:
  侧边栏：抽屉式（默认隐藏）
  主内容：全宽
```

### 4.2 响应式断点

```
sm:  640px  → 小平板横屏
md:  768px  → 平板竖屏（侧边栏显示分界）
lg:  1024px → 笔记本
xl:  1280px → 桌面（最大布局容器宽度）
```

---

## 5. 动效规范

### 5.1 允许的动效

```
流式文字输出：
  光标闪烁：opacity 0→1→0，周期 1s，ease-in-out

页面过渡：
  消息列表新增：opacity 0→1，translateY 8px→0，duration 200ms

加载状态：
  骨架屏：背景渐变动画（shimmer），duration 1.5s，loop

按钮交互：
  Hover：scale(1.02)，duration 100ms
  Active：scale(0.98)，duration 50ms
```

### 5.2 不允许的动效

- 超过 300ms 的复杂动画（会让用户感到等待）
- 循环播放的装饰性动画（分散注意力）
- 不提供 `prefers-reduced-motion` 替代的动效

---

## 6. 可访问性规范

```
颜色对比度：
  正文文字 vs 背景：最低 4.5:1（AA 标准）
  大文字（18px+）：最低 3:1
  禁止仅用颜色区分信息（必须配文字或图标）

键盘导航：
  所有交互元素可 Tab 到达
  焦点样式：2px 蓝色 outline + 2px offset
  对话：Enter 发送，Esc 取消/关闭

屏幕阅读器：
  图片必须有 alt 属性
  图标按钮必须有 aria-label
  流式输出区域：aria-live="polite"
  错误提示：role="alert"

国际化准备（Phase 4）：
  所有用户可见字符串提取到 i18n 文件
  支持中英双语（中文优先）
```

---

## 7. 组件库目录结构（packages/ui）

```
packages/ui/src/
├── tokens.css              ← 设计 Token 变量
├── components/
│   ├── chat/
│   │   ├── ChatBubble.tsx     ← 对话气泡
│   │   ├── ChatInput.tsx      ← 输入框
│   │   ├── StreamingText.tsx  ← 流式输出渲染
│   │   └── SourceCitation.tsx ← RAG 来源引用
│   ├── drug/
│   │   ├── DrugWarning.tsx    ← 药品警告标签
│   │   └── DrugCard.tsx       ← 药品信息卡片
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── PageLayout.tsx
│   └── primitives/            ← 来自 Shadcn（不二次封装）
│       ├── Button.tsx
│       ├── Input.tsx
│       └── ...
└── index.ts                ← 统一导出
```

---

*设计是约束的产物——越少的选择，越一致的体验。遇到设计决策时，先查这份文档，再考虑新增规则。*
