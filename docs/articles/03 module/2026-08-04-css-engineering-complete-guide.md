# CSS 工程化完整指南：从模块化方案到设计系统（面试收藏级）

> 面试官说：「项目里你们用什么 CSS 方案？为什么选它？」很多人能答出用了什么，却说不清为什么，也答不上各方案的底层原理。这篇文章就解决这个问题。

---

## 🎯 这篇文章解决什么问题

CSS 看起来简单，但在大型项目里是工程复杂度的重灾区——全局污染、命名碰撞、主题切换、跨平台 Token 管理，每一个都是坑。这篇文章覆盖四大 CSS 方案的选型原理、设计系统工程化全链路、CSS Variables 主题切换实现，以及 Storybook 视觉测试。既讲透原理，也给出面试怎么答。

---

## 🔥 开篇：CSS 为什么需要工程化

写 CSS 的第一个月，你写得很爽。写到第六个月，你开始怀疑人生。

问题不是 CSS 本身，而是它的全局性——任何一个 class 都可以影响整个页面。项目规模一大，三个问题必然出现：

**全局污染**：你写了 `.title { color: red }`，三个月后另一个同事也写了 `.title`，谁覆盖谁取决于加载顺序。

**命名碰撞**：BEM 规范能缓解，但靠人工维护，迟早出问题。一份超过 10 万行 CSS 的老项目，没人敢随便删一行样式。

**死代码堆积**：组件删了，CSS 没人敢动，打包体积一年涨一年。

四种主流方案，本质都在解决这三个问题，但思路完全不同：

| 方案 | 核心思路 | 作用域机制 | 运行时开销 |
|------|---------|-----------|-----------|
| CSS Modules | 构建时 hash className | 编译期 | 无 |
| CSS-in-JS（Emotion/SC） | JS 运行时注入 style | 运行时 | 有 |
| Tailwind CSS | 原子化 utility class | 设计约束 | 极小 |
| Vanilla Extract | TS 驱动，构建时提取 | 编译期 | 无 |

---

## 🧩 CSS Modules：构建时的局部作用域

### 是什么

CSS Modules 的核心思想只有一句话：**一个 CSS 文件就是一个模块，class 名是该模块导出对象的属性**。

```css
/* Button.module.css */
.btn { background: blue; color: white; }
.btn:hover { opacity: 0.8; }
```

```tsx
import styles from './Button.module.css'
// styles.btn → "Button_btn__xK3p2"（实际 class 名已被 hash）

export function Button() {
  return <button className={styles.btn}>点击</button>
}
```

你写的 `.btn`，打包后变成了 `Button_btn__xK3p2`——全局唯一，和别的组件永不冲突。

### hash className 的生成原理

Webpack（css-loader）和 Vite 生成 hash className 的默认模式是：

```
[local]_[hash:base64:5]
```

- `[local]`：原始 class 名
- `[hash:base64:5]`：由「文件路径 + class 名」计算出的 base64 hash，取前 5 位

**关键点**：hash 的输入包含文件路径，所以哪怕两个文件都有 `.btn`，生成的 hash 也不同。这是作用域隔离的根本。

Vite 中自定义 hash 格式：

```typescript
// vite.config.ts
export default defineConfig({
  css: {
    modules: {
      generateScopedName: '[name]__[local]__[hash:base64:5]',
      // 生产环境可用更短的 hash：'[hash:base64:4]'
    }
  }
})
```

### composes 与 :global

CSS Modules 提供两个进阶特性：

**`composes`** 实现样式复用（类似继承）：

```css
.base { padding: 8px 16px; border-radius: 4px; }

.primary {
  composes: base; /* 👈 复用 base 的样式 */
  background: blue;
  color: white;
}
```

**`:global`** 逃逸局部作用域，用于覆盖第三方组件样式：

```css
/* 作用域内的样式 */
.container { padding: 16px; }

/* 逃逸到全局 */
:global(.ant-btn) { border-radius: 8px; }
```

> 💬 **面试官**：CSS Modules 是怎么实现局部作用域的？
>
> ✅ 标准答案：构建工具在编译阶段，将每个 CSS 文件的 class 名替换为「文件路径 + class 名」生成的唯一 hash，JS 侧通过 import 拿到映射对象。因为 hash 输入包含文件路径，不同文件的同名 class 天然不冲突。
>
> 🎁 加分答案：提到 `generateScopedName` 可自定义格式，生产环境用短 hash 减少体积；`:global` 用于第三方组件样式覆盖；`composes` 实现样式继承而非复制。

---

## ⚡ CSS-in-JS：运行时 vs 零运行时的分水岭

### 运行时派的工作原理

以 Emotion 为例，当你写：

```tsx
const styles = css`
  background: hotpink;
  color: white;
`
```

运行时发生了三件事：

**第一步：序列化（serializeStyles）**

```typescript
// 解析模板字符串，拼接成 CSS 字符串
let cssString = 'background:hotpink;color:white;'
// 对字符串内容做 hash，生成唯一 class 名
const name = hashString(cssString) // → "a7f3c2"
```

**第二步：注入（insertStyles）**

```typescript
function insertStyles(serialized) {
  const className = `css-${serialized.name}`
  const rule = `.${className}{${serialized.styles}}`
  const tag = document.createElement('style')
  tag.appendChild(document.createTextNode(rule))
  document.head.appendChild(tag) // 👈 动态写入 <style> 标签
}
```

**第三步**：返回 `className`，React 组件正常渲染。

整个过程在每次组件渲染时都会执行序列化步骤（尽管有缓存，但 hash 查找和字符串拼接不可避免）。这就是运行时开销的来源。

### 运行时的三个代价

**Re-serialize 开销**：每次渲染都要处理模板字符串，props 变化时要重新计算样式字符串和 hash。在高频更新的组件里（如动画、拖拽），这是可感知的性能瓶颈。

**SSR hydration 问题**：服务端生成的 CSS 需要内联到 HTML 中，客户端 hydration 时要避免样式闪烁，需要额外的 cache 同步机制。

**包体积**：Emotion 核心运行时约 7KB（gzip），styled-components 约 12KB，对于轻量页面是额外负担。

### 零运行时派：Vanilla Extract

Vanilla Extract 的思路是：**把 CSS-in-JS 的开发体验保留，把运行时开销砍掉**。

实现方式：所有样式定义写在 `.css.ts` 文件里，构建工具在编译阶段执行这些文件，提取出静态 CSS，最终产物和 CSS Modules 一样——只有一个 `.css` 文件。

核心 API：

```typescript
// button.css.ts
import { style, styleVariants, createTheme } from '@vanilla-extract/css'

// 基础样式
export const btn = style({
  padding: '8px 16px',
  borderRadius: '4px',
  cursor: 'pointer',
})
```

`styleVariants` 处理变体，比 if/else props 更清晰：

```typescript
export const variants = styleVariants({
  primary: { background: 'blue', color: 'white' },
  secondary: { background: 'gray', color: 'black' },
  danger: { background: 'red', color: 'white' },
})
```

`createTheme` 生成 CSS Variables 绑定（第五节会深入）：

```typescript
export const [themeClass, vars] = createTheme({
  color: { brand: '#0070f3', text: '#111' },
  space: { sm: '8px', md: '16px' },
})
```

### 选型决策树

```
需要动态样式（props 驱动颜色/尺寸实时变化）？
  ├── 是 → 考虑 Emotion / styled-components
  │         但要评估 SSR 复杂度和运行时开销
  └── 否 → 静态或主题级别的动态？
            ├── 强 TypeScript + 零运行时 → Vanilla Extract
            ├── 快速开发 + 设计系统约束 → Tailwind CSS
            └── 简单项目 / 已有预处理器 → CSS Modules
```

> 💬 **面试官**：Emotion 和 Vanilla Extract 的核心区别是什么？
>
> ✅ 标准答案：Emotion 是运行时方案，在浏览器中动态序列化样式字符串并注入 style 标签；Vanilla Extract 是零运行时方案，样式在构建阶段提取为静态 CSS 文件，浏览器加载的是普通 CSS。
>
> 🎁 加分答案：Emotion 支持完全动态的样式（任意 props 驱动），Vanilla Extract 的「动态」靠 CSS Variables 实现，编译产物更可预测，SSR 无额外开销。

---

## 🎨 Tailwind CSS：原子化 CSS 的工程哲学

### utility-first 的核心理念

Tailwind 的每个 class 只做一件事：

```html
<!-- 不写 CSS，直接组合 class -->
<button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
  提交
</button>
```

`px-4` → `padding-left: 1rem; padding-right: 1rem`，仅此而已。

这种方式看起来像内联样式，但有本质区别：**约束在设计系统里**。`bg-blue-500` 不是任意颜色，是 Tailwind 设计系统里预定义的蓝色梯度，全项目保持一致。

### JIT 编译原理

Tailwind v2 是预生成所有可能的 class（生成文件高达 15MB），再靠 PurgeCSS 扫描代码删除未用的。**这个流程又慢又不可靠**——动态拼接的 class 名会被误删。

v3 引入 JIT（Just-In-Time）编译，反转了流程：

```
启动 → 扫描所有模板文件（html/tsx/vue）
       ↓
发现 class 名（如 "text-blue-500"）
       ↓
按需生成对应 CSS，只生成用到的
       ↓
文件变化时增量更新，毫秒级响应
```

JIT 还解锁了任意值语法：

```html
<!-- 任意颜色值，不需要预先配置 -->
<div class="bg-[#1a2b3c] w-[372px] mt-[17px]">...</div>
```

这在 v2 是做不到的。

### Design Token 集成

Tailwind 的 `tailwind.config.ts` 本质是一个 Token 配置文件：

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{tsx,ts,html}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          500: '#3b82f6',  // 主色
          900: '#1e3a5f',
        },
        // 语义化 Token
        surface: 'var(--color-surface)',
        'on-surface': 'var(--color-on-surface)',
      },
      spacing: {
        '18': '4.5rem',   // 扩展间距 Token
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
} satisfies Config
```

`surface: 'var(--color-surface)'` 这一行让 Tailwind 和 CSS Variables 打通——主题切换只需修改 CSS 变量，不需要改 class。

### @apply 的用与不用

`@apply` 允许在 CSS 文件里复用 Tailwind class：

```css
/* 可以用 */
.btn-primary {
  @apply px-4 py-2 bg-brand-500 text-white rounded;
}
```

**什么时候用**：需要对第三方库组件（如富文本编辑器）统一应用样式，没法直接加 class 的场景。

**什么时候不用**：自己写的组件，直接在 JSX 里组合 class 就好。过度使用 `@apply` 会把 Tailwind 退化成普通 CSS，失去约束价值。

> 💬 **面试官**：Tailwind JIT 和旧版 Purge 有什么区别？
>
> ✅ 标准答案：旧版预生成全量 CSS 再 Purge 删除，构建慢且动态 class 会被误删；JIT 按需扫描模板文件实时生成，构建产物更小，还支持任意值语法（`w-[372px]`）。
>
> 🎁 加分答案：JIT 的扫描靠正则匹配完整 class 字符串，所以动态拼接 class（`'text-' + color`）依然会漏扫——这是 Tailwind 的设计约束，不是 bug。

🔧 **真实场景**：医疗电商项目的药品卡片组件，需要根据药品状态（在售/缺货/处方药）显示不同颜色标签。用 Tailwind 的方案是预定义完整 class 名而不是拼接：

```tsx
const statusClass = {
  available: 'bg-green-100 text-green-700',
  outOfStock: 'bg-gray-100 text-gray-500',
  prescription: 'bg-orange-100 text-orange-700',
}
// ✅ 完整 class 名，JIT 能扫描到
// ❌ 'bg-' + color → JIT 扫描不到，生产环境样式丢失
```

---

## 🌗 CSS Variables：主题切换的底层基石

### 与预处理器变量的本质区别

Sass/Less 的变量是编译时替换，产物里不存在变量概念：

```scss
$brand-color: #0070f3;
.btn { color: $brand-color; } // 编译后 → color: #0070f3;
```

CSS Variables（自定义属性）是运行时的，浏览器真正理解它：

```css
:root { --brand-color: #0070f3; }
.btn { color: var(--brand-color); } /* 浏览器保留变量引用 */
```

**关键差异**：CSS Variables 可以被 JavaScript 动态修改，可以在媒体查询里重定义，可以被子元素覆盖——这是预处理器变量做不到的。

### 手写主题切换

最简洁的主题切换方案：`data-theme` 属性 + CSS 变量重定义。

```css
/* 默认主题（亮色） */
:root {
  --color-bg: #ffffff;
  --color-text: #111111;
  --color-brand: #0070f3;
  --color-surface: #f5f5f5;
}

/* 暗色主题 */
[data-theme='dark'] {
  --color-bg: #0d1117;
  --color-text: #e6edf3;
  --color-brand: #58a6ff;
  --color-surface: #161b22;
}
```

JS 切换只需一行：

```typescript
document.documentElement.setAttribute('data-theme', 'dark')
// 或
document.documentElement.removeAttribute('data-theme')
```

组件层消费变量，完全不感知主题切换：

```css
.card {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-brand);
}
```

### 与 Tailwind / Vanilla Extract 联动

前面 Tailwind 配置里已经展示了 `surface: 'var(--color-surface)'` 的写法。Vanilla Extract 的 `createTheme` 在底层也是生成 CSS Variables：

```typescript
// Vanilla Extract 生成的 CSS（构建产物）
// .themeA { --color-brand: #0070f3; --space-sm: 8px; }
// .themeB { --color-brand: #ff6b35; --space-sm: 8px; }
export const [lightTheme, vars] = createTheme({ color: { brand: '#0070f3' } })
export const [darkTheme] = createThemeContract(vars) // 暗色覆盖
```

这三者的协作链路：**Style Dictionary 产出 Token JSON → 生成 CSS Variables → Tailwind/VE 消费变量**。

> 💬 **面试官**：CSS Variables 和 Sass 变量有什么区别？
>
> ✅ 标准答案：Sass 变量是编译时替换，最终产物是静态值；CSS Variables 是运行时概念，浏览器保留变量引用，可以被 JS 动态修改，可以响应媒体查询，可以被子元素覆盖实现级联。
>
> 🎁 加分答案：CSS Variables 支持 `@media (prefers-color-scheme: dark)` 自动响应系统主题，而 Sass 变量做不到。

---

## 🪙 Design Token：跨平台的设计语言

### Token 是什么

Design Token 是设计决策的最小存储单元——不是组件，不是样式规则，是**一个命名的值**：

```json
{
  "color-brand-primary": "#0070f3",
  "space-md": "16px",
  "font-size-body": "14px"
}
```

Token 的价值在于**单一来源，多端输出**。设计师改了一个 Token 值，Web CSS、iOS Swift 常量、Android XML 资源同步更新。

### Token 分层：三个层级

```
Global Token（全局层）
  └── color-blue-500: #3b82f6
  └── space-4: 16px

Semantic Token（语义层）        ← 引用 Global Token
  └── color-brand-primary: {color-blue-500}
  └── space-content-padding: {space-4}

Component Token（组件层）       ← 引用 Semantic Token
  └── button-bg: {color-brand-primary}
  └── button-padding-x: {space-content-padding}
```

**为什么要分三层**：设计师改品牌色，只需修改 `color-brand-primary` 指向的 Global Token。所有用到 `color-brand-primary` 的组件自动更新，不需要逐个修改。

### Style Dictionary 工作流

Style Dictionary 是 Amazon 开源的 Token 管理工具，配置一次，输出多平台。

Token 定义（JSON）：

```json
{
  "color": {
    "brand": { "value": "#0070f3", "type": "color" },
    "text": { "value": "#111111", "type": "color" }
  },
  "space": {
    "sm": { "value": "8px" },
    "md": { "value": "16px" }
  }
}
```

Style Dictionary 配置：

```javascript
// style-dictionary.config.js
module.exports = {
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      prefix: 'sd',
      buildPath: 'dist/css/',
      files: [{ destination: 'variables.css', format: 'css/variables' }],
    },
    ios: {
      transformGroup: 'ios-swift',
      buildPath: 'dist/ios/',
      files: [{ destination: 'StyleDictionary.swift', format: 'ios-swift/class.swift' }],
    },
  },
}
```

执行 `style-dictionary build`，输出：

```css
/* dist/css/variables.css */
:root {
  --sd-color-brand: #0070f3;
  --sd-color-text: #111111;
  --sd-space-sm: 8px;
  --sd-space-md: 16px;
}
```

> 💬 **面试官**：Design Token 和直接写 CSS 变量有什么区别？
>
> ✅ 标准答案：CSS 变量是 Web 端技术，Design Token 是平台无关的设计概念。Token 通过 Style Dictionary 等工具可以输出为 CSS 变量、iOS Swift 常量、Android XML 等多种格式，实现设计师和多端开发者共享同一份设计决策源。
>
> 🎁 加分答案：Token 分层（Global/Semantic/Component）让改动最小化：改品牌色只需改一个 Global Token，语义层和组件层自动级联更新。

---

## 📚 Storybook：组件文档与视觉测试

### 核心价值

Storybook 是组件的独立开发环境。组件不依赖页面上下文独立运行，每个 Story 是一个组件状态的快照：

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  component: Button,
  args: { children: '点击' },
}
export default meta

type Story = StoryObj<typeof Button>

export const Primary: Story = { args: { variant: 'primary' } }
export const Danger: Story = { args: { variant: 'danger' } }
export const Disabled: Story = { args: { disabled: true } }
```

三个核心价值：

**独立开发**：不需要启动完整应用，直接开发和调试组件。

**自动文档**：`autodocs` 功能自动生成 Props 文档和交互式 Playground。

**Design System 展示**：把所有组件状态可视化，是设计师和开发者对齐的共同语言。

### 与 Chromatic 集成：视觉回归测试

Chromatic 是 Storybook 官方推出的视觉测试云服务。每次 CI 运行时，它会对每个 Story 截图，与上一次通过的截图做像素级对比：

```yaml
# .github/workflows/chromatic.yml
- name: Run Chromatic
  uses: chromaui/action@v1
  with:
    projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
    buildScriptName: build-storybook
```

工作流：

```
PR 提交 → Chromatic 截图 → 像素对比
  ├── 无差异 → 自动通过
  └── 有差异 → 通知 Review → 人工确认（故意改动）或修复（意外回归）
```

这解决了一个痛点：**改了全局样式，不知道影响了哪些组件**。Chromatic 会把所有受影响的 Story 列出来，一目了然。

### 生产配置要点

Stories 文件规范：放在组件旁边，用 `.stories.tsx` 后缀：

```
src/
  components/
    Button/
      Button.tsx
      Button.stories.tsx    ← 和组件同目录
      Button.module.css
```

推荐 Addon：

```javascript
// .storybook/main.ts
export default {
  addons: [
    '@storybook/addon-essentials',  // controls/actions/docs 套件
    '@storybook/addon-a11y',        // 无障碍检查
    '@storybook/addon-themes',      // 主题切换预览
  ],
}
```

> 💬 **面试官**：Storybook 和单元测试有什么区别？
>
> ✅ 标准答案：单元测试验证逻辑正确性（函数输入输出），Storybook + Chromatic 验证视觉正确性（像素级渲染结果）。两者互补，不能互相替代。
>
> 🎁 加分答案：Story 本身可以复用为测试用例，配合 `@storybook/test` 可以在 Story 上直接写 play 函数做交互测试，一份 Story 同时服务于文档、视觉测试、交互测试三个场景。

---

## 💡 一张图总结（面试速记）

| 方案 | 作用域机制 | 运行时开销 | 动态样式 | TypeScript | 适用场景 |
|------|-----------|-----------|---------|-----------|---------|
| CSS Modules | 编译期 hash | 无 | 有限 | 需配置 | 传统项目迁移、预处理器配合 |
| Emotion | 运行时注入 | 中等 | 完全动态 | 原生支持 | 复杂动态样式、MUI 生态 |
| Tailwind CSS | 设计约束 | 极小 | Token 级 | 配置支持 | 快速开发、设计系统统一 |
| Vanilla Extract | 编译期提取 | 无 | CSS Vars | TypeScript-first | 零运行时 + 强类型 |

**不同场景推荐组合**：

- **新项目，重设计系统**：Tailwind CSS + CSS Variables + Style Dictionary + Storybook
- **新项目，复杂动态样式**：Vanilla Extract + CSS Variables（主题）+ Storybook
- **老项目迁移**：CSS Modules + 逐步引入 Tailwind，风险最小
- **组件库开发**：Vanilla Extract（零运行时，消费方无额外开销）+ Storybook + Chromatic

---

## 📝 留个问题

你的项目现在用的是哪种 CSS 方案？如果让你从零开始重新选，你会选什么？欢迎评论区说说你的理由——选型没有标准答案，但能说清楚「为什么」才是加分点。

---

> 🔖 这是「前端工程化系列」第 8 篇。上一篇：《Rollup 完整指南：从实战配置到源码原理再到插件体系（面试收藏级）》；
