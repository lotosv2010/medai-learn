# Turborepo + pnpm workspace：Vue 3 前端 AI 组件库从零搭建（面试收藏级）

> 面试官问：「组件库为什么要用 Monorepo 管理？」大多数人会答「方便统一管理多个包」——追一句「`packages/ui` 依赖 `packages/utils`，你改了 `utils` 的源码，`ui` 包里能立刻感知到吗，还是必须重新 `build` 再重新 `install`」，很多人就开始含糊了。「用 `workspace:*` 协议就行」这种回答是**记结论**，不是**懂原理**。

> 真正的答案是：pnpm 不会把 `utils` 复制一份塞进 `ui` 的 `node_modules`，而是在全局的**内容寻址存储（content-addressable store）**里建一份唯一副本，`node_modules` 里放的是指向这份副本的**符号链接**——改动源码后 `ui` 包能不能立刻感知，取决于链接指向的是源码目录还是构建产物目录，这一条链路想透了，Monorepo 里"包与包怎么协作"的一半问题就解决了。

> 这是「Vue 3 全家桶深度拆解」系列第 11 篇。前 10 篇拆的是 Vue 3 内部怎么实现——响应式、渲染、组件、Composition API、编译优化、Pinia、Vue Router、性能优化。这一篇换个视角：不看 Vue 怎么实现，看**用 Vue 3 从零搭一个能真正发布到 npm 的 AI 组件库**这件事，从 0 到 1 要踩哪些工程化的坑——pnpm workspace 怎么组织包、Turborepo 怎么管任务依赖和缓存、Vue 组件库为什么不能照搬 React 生态常用的 tsup 打包方案、changesets 怎么做版本发布。这条主线参考了 React AI 组件库 [g-ai-ui](https://github.com/lotosv2010/g-ai-ui) 的工程结构，组件选型参考了 [Ant Design X](https://x.ant.design/components/introduce-cn/) 的分类体系。

> 📌 说明：本文重点讲的是搭建思路和每个工程化决策背后要解决的问题，文中代码片段都是**参考实现**，用来说明设计思路。实际搭建时的具体写法、配置项和目录细节，要以你自己项目的运行环境和各工具库的版本为准——比如 pnpm、Turborepo、Vite 的大版本不同，命令和配置字段都可能有差异，遇到跑不通的地方先检查版本号。

---

## 🎯 这篇文章解决什么问题

「搭个组件库」听起来门槛不高——建几个文件夹，写几个 `.vue` 组件，`npm publish` 一下就完事。但真正要做到"能被别的项目稳定依赖、能持续迭代、能让协作者放心贡献代码"这个程度，中间藏着一串容易被忽略的工程化决策：Monorepo 里包与包之间到底是怎么联动的？Turborepo 的构建缓存命中依据是什么，为什么有时候改一行注释缓存也会失效？Vue 组件库的打包工具选型和 React 组件库为什么不能用同一套方案？组件对外暴露的 TypeScript 类型要怎么设计才能让使用者在 IDE 里获得精确提示？版本号和 CHANGELOG 怎么做到不用人肉维护？

这篇文章不是纯原理解析，是一篇**可以直接照着搭一遍**的实操文章——跟着走一遍，你会同时拿到**能落地**（一套可以直接复用的 Monorepo 骨架）和**能讲透**（面试官问到 workspace 协议、Turborepo 缓存、组件库打包选型这几个高频考点，你能讲清楚"为什么这么设计"而不是"文档这么写的"）。

---

## 🧩 一、简介与搭建前准备

### 搭建前准备

+ Node.js ≥ 18.18（Turborepo 2.x 与 Vite 5 的最低要求）
+ pnpm ≥ 9（本文全程使用 pnpm，理由见下一节）
+ VS Code + Volar 插件（Vue 3 官方语言服务，`.vue` 文件的类型推导依赖它）
+ 一个 npm 账号（如果最终要真的发布组件库）

### 目标要求

本文要搭出来的不是一个能跑的 Demo，而是一套具备下面这些能力的组件库骨架：

+ 支持 TypeScript，组件对外暴露精确的 Props/Emits 类型
+ 支持按需引入（Tree Shaking 真正生效，不是打包工具"宣称"生效）
+ 支持 ESM/CJS 双格式导出，兼容新老项目
+ 有独立的文档站，组件 Demo 和源码同步维护
+ 有 Playground 示例项目，验证组件库被真实项目消费时的表现
+ 有版本发布流程，不需要手动改版本号、手写 CHANGELOG
+ 有 CI 门禁，代码合并前自动跑 lint / build / test

### 为什么是 pnpm + Turborepo，不是别的组合

Monorepo 工具选型上有几个常见候选：Lerna（老牌，社区一度停止维护后又被 Nx 团队接手）、Nx（功能全面但配置心智负担重）、Rush（微软出品，偏企业级）、Turborepo（Vercel 出品，配置最轻、专注任务编排和缓存）。本文选 Turborepo 是因为它职责单一——只管"任务怎么跑、怎么缓存"，不管依赖怎么装（那是 pnpm 的事），学习曲线最平滑，也是当前 Vue/React 生态组件库最常见的选择之一。

包管理器上，npm/yarn 的经典做法是把依赖"提升"到根目录 `node_modules`，这会带来**幽灵依赖**问题（子包能访问到自己没声明但被提升上去的依赖）；pnpm 用符号链接 + 严格的目录隔离规避了这个问题，具体原理下一节展开。

---

## 🧩 二、初始化 Monorepo：pnpm workspace + Turborepo

### 初始化项目结构

```shell
mkdir medai-ui && cd medai-ui
pnpm init

# 声明 workspace 范围
```

新建 `pnpm-workspace.yaml`，声明哪些目录是 workspace 包：

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

依次创建三个包和两个应用（目录职责在下一节详细讲）：

```shell
mkdir -p packages/ui packages/utils packages/shared apps/docs apps/playground
```

### 安装 Turborepo

```shell
pnpm add turbo -D -w   # -w 表示装在根目录（workspace root）
```

新建 `turbo.json`：

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

> **版本提示**：Turborepo 1.x 用的是 `pipeline` 字段，2.x 之后改名为 `tasks`，本文按 2.x 写法。如果你在网上搜到 `pipeline` 的配置示例，功能是等价的，只是字段名不同。

根目录 `package.json` 补上脚本：

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test"
  },
  "packageManager": "pnpm@9.7.0"
}
```

`packageManager` 字段不是装饰——它是 corepack 的约束声明，团队里不同人用不同版本的 pnpm 装依赖，`pnpm-lock.yaml` 的格式和解析结果可能有细微差异，锁定版本能避免"我这里装得动，你那里装不动"的问题。

### 原理：workspace 协议做了什么

`packages/ui/package.json` 里声明依赖内部包时这样写：

```json
{
  "dependencies": {
    "@medai/utils": "workspace:*",
    "@medai/shared": "workspace:*"
  }
}
```

`pnpm install` 遇到 `workspace:*` 时不会去 npm 远程仓库找这个包，而是直接在本地 workspace 里定位到 `packages/utils`，在 `packages/ui/node_modules/@medai/utils` 位置建一个**符号链接**指向 `packages/utils` 目录本身。这意味着：

+ 如果 `packages/utils` 没有独立的构建步骤，`ui` 包直接通过链接读到 `utils` 的最新源码（配合 TS 的 `paths` 别名或者 `exports` 字段指向 `src`）；
+ 如果 `utils` 有独立构建产物（`dist/`），`ui` 包读到的是链接指向的 `dist` 目录，`utils` 改完源码后必须先 `build` 才能被 `ui` 感知到最新代码——这也是为什么 Turborepo 的 `build` 任务要声明 `dependsOn: ["^build"]`（`^` 表示"先构建我依赖的包"），保证构建顺序永远是从底层包到上层包。

> 💬 **面试官**：pnpm 是怎么同时做到依赖提升又避免幽灵依赖的？
>
> ✅ 标准答案：pnpm 把所有版本的依赖都平铺存放在全局的内容寻址存储里（按内容 hash 去重，同一份代码物理上只存一次），每个包的 `node_modules` 里只放**自己声明过**的依赖的符号链接，深层依赖通过嵌套的符号链接逐层解析（形成一个非扁平但语义清晰的链接树）。npm/yarn 为了兼容 Node.js 早期的模块解析算法，把所有依赖强行拍平到根 `node_modules`，导致没有声明某个依赖的包也能 `require` 到它——这就是幽灵依赖。pnpm 用符号链接分层解决了"既要磁盘复用、又要避免越权访问"的矛盾。
>
> 🎁 加分答案：能提到 pnpm 的存储机制天然支持**跨项目**去重——不同 Monorepo 项目如果用了同一版本的同一个依赖，物理磁盘上也只存一份，这是 npm/yarn 的扁平化提升做不到的，因为它们的存储路径和项目强绑定。

### 原理：Turborepo 缓存命中依据什么

Turborepo 每次跑一个任务（比如 `build`）之前，会先计算一份**输入哈希**：包含该包的源码文件内容、`package.json` 里声明的依赖版本、任务用到的环境变量（需要在 `turbo.json` 里显式声明 `env`）。这份哈希如果在缓存里能找到匹配记录，就直接把缓存里存的产物（`outputs` 声明的目录）复制回来，跳过真正的执行——这也是为什么"改一行没有实际影响的注释"也会导致缓存失效：注释也是源码文件内容的一部分，哈希必然变化。

> 💬 **面试官**：Turborepo 的本地缓存和远程缓存（Remote Cache）分别解决什么问题？
>
> ✅ 标准答案：本地缓存解决"同一个人反复跑同一个任务不用重复执行"的问题，存在 `.turbo/` 目录下；远程缓存解决"团队协作和 CI 环境里，别人已经跑过的构建结果我能不能直接复用"的问题，需要连接 Vercel 提供的缓存服务或自建缓存服务器。两者用的是同一套哈希计算逻辑，区别只是缓存产物存在本地磁盘还是远程存储。

---

## 🧩 三、目录结构划分：三层包职责

Monorepo 最容易踩的坑不是工具配置，是**包的职责边界模糊**——什么代码该放进组件包，什么该抽成独立的工具包，边界不清楚，用不了多久包与包之间就会出现循环依赖。本文按主流 Vue 3 组件库的通用范式，划成三层：

```
packages/
├── shared/    # 跨包共享的类型定义 + 常量，不依赖 Vue，也不依赖 utils
├── utils/     # 无 UI 依赖的纯函数工具（防抖、格式化、打字机效果 hook）
└── ui/        # 组件本体（.vue 文件），依赖 shared 和 utils
```

依赖方向只能是单向的：`ui → utils → shared`，`ui → shared`，**禁止反向依赖**（`shared`/`utils` 不能 `import` 任何 `ui` 里的东西）。这个约束不是写在文档里靠自觉遵守的，可以用 [`dependency-cruiser`](https://github.com/sverweij/dependency-cruiser) 或 ESLint 的 `import/no-restricted-paths` 规则在 CI 里强制检查，本文不展开配置细节，只强调这条边界必须存在——一旦 `shared` 反向依赖了 `ui`，`shared` 就不再"共享"，变成了 `ui` 的附属品，其他包想复用类型定义就必须连带装上整个组件库。

两个 `apps/` 不发布到 npm，只在本地跑：

```
apps/
├── docs/         # Rspress 文档站，消费 packages/ui 生成组件文档
└── playground/   # Vite + Vue 3 示例项目，模拟真实项目引入组件库的场景
```

命名上，所有内部包统一用 `@medai/` 作用域前缀（`@medai/ui`、`@medai/utils`、`@medai/shared`），呼应本项目的医疗 AI 场景。

---

## 🧩 四、核心组件开发（手写重点）

### 组件范围：参照 Ant Design X 的分类

Ant Design X 把 AI 组件分成六大类：**通用**（Bubble 对话气泡 / Conversations 管理对话 / Notification 系统通知）、**唤醒**（Welcome 欢迎 / Prompts 提示集）、**表达**（Sender 输入框 / Attachments 附件 / Suggestion 快捷指令）、**确认**（Think 思考过程 / ThoughtChain 思维链）、**反馈**（Actions / CodeHighlighter / FileCard / Folder / Mermaid / Sources）、**其他**（XProvider 全局配置）。本文覆盖**通用 + 唤醒**两类共 5 个组件——`Bubble` / `Conversations` / `Notification` / `Welcome` / `Prompts`，把"AI 问诊助手"这个医疗场景从欢迎页到对话气泡的核心链路搭起来。

> 这 5 个组件里没有输入框 `Sender`（属于"表达"类），本文 Playground 的对话演示走的是"点击预设 `Prompts` 触发一轮问答"，不支持自由打字输入——这是本文明确的范围边界，不是遗漏。

### Bubble：对话气泡

```vue
<!-- packages/ui/src/bubble/Bubble.vue -->
<script setup lang="ts">
import type { BubbleMessage } from '@medai/shared'

interface Props {
  message: BubbleMessage
  loading?: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="medai-bubble" :class="`medai-bubble--${message.role}`">
    <div class="medai-bubble__avatar">
      <slot name="avatar" :role="message.role">
        {{ message.role === 'assistant' ? '🤖' : '🧑‍⚕️' }}
      </slot>
    </div>
    <div class="medai-bubble__content">
      <span v-if="loading" class="medai-bubble__typing">对方正在输入…</span>
      <slot v-else>{{ message.content }}</slot>
    </div>
  </div>
</template>
```

对外类型定义放在 `@medai/shared`：

```typescript
// packages/shared/src/types/bubble.ts
export interface BubbleMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: number
}
```

`defineProps<Props>()` 这种纯类型声明写法（而不是运行时对象 `defineProps({ message: Object })`），编译期会被 `@vue/compiler-sfc` 解析成运行时的 props 校验对象，同时把 TypeScript 类型完整保留到组件的 `.d.ts` 声明文件里——这意味着组件库使用者在 IDE 里输入 `<Bubble :message="` 时，能拿到 `BubbleMessage` 接口的精确字段提示，而不是一个笼统的 `any`。这一点在第 07 篇编译优化文章里讲过原理，这里是它在组件库场景的实际落地。

### Conversations：会话管理

```vue
<!-- packages/ui/src/conversations/Conversations.vue -->
<script setup lang="ts">
import type { ConversationItem } from '@medai/shared'

const props = defineProps<{
  items: ConversationItem[]
  activeKey?: string
}>()

const emit = defineEmits<{
  select: [key: string]
  delete: [key: string]
}>()
</script>

<template>
  <ul class="medai-conversations">
    <li
      v-for="item in props.items"
      :key="item.key"
      class="medai-conversations__item"
      :class="{ 'is-active': item.key === props.activeKey }"
      @click="emit('select', item.key)"
    >
      <span class="medai-conversations__label">{{ item.label }}</span>
      <button
        class="medai-conversations__delete"
        type="button"
        @click.stop="emit('delete', item.key)"
      >
        ×
      </button>
    </li>
  </ul>
</template>
```

`defineEmits<{ select: [key: string] }>()` 是 Vue 3.3+ 的简写语法，等价于 `defineEmits<(e: 'select', key: string) => void>()`，同样是纯类型声明，编译期转换为运行时的 `emits` 数组声明。

### Notification：系统通知

系统通知和 `Bubble`/`Conversations` 不一样——它不需要"挂在模板里"，而是命令式调用（"叫我的时候我才出现"）。Element Plus 的 `$message`、Ant Design 的 `message.success()` 都是这个思路，Composition API 时代的实现方式是用 `createVNode` + `render` 直接把组件挂到一个动态创建的 DOM 节点上：

```typescript
// packages/ui/src/notification/useNotification.ts
import { createVNode, render } from 'vue'
import NotificationItem from './NotificationItem.vue'
import type { NotificationOptions } from '@medai/shared'

export function useNotification() {
  function notify(options: NotificationOptions) {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const vnode = createVNode(NotificationItem, {
      ...options,
      onClose: () => {
        render(null, container) // 卸载组件，触发 unmounted 生命周期
        container.remove()
      }
    })

    render(vnode, container)
  }

  return { notify }
}
```

> 💬 **面试官**：Composition API 时代，命令式调用一个组件（不写在模板里）是怎么实现的？
>
> ✅ 标准答案：用 `createVNode(Component, props)` 创建一个虚拟节点，再用 `render(vnode, container)` 把它渲染到一个手动创建的 DOM 容器上——`render` 是 Vue 3 暴露的底层 API，不依赖组件树的父子关系，可以在任意 DOM 节点上独立渲染一棵组件树。关闭时调用 `render(null, container)` 触发卸载。这条链路本质上是 `createApp().mount()` 的"最小子集"，跳过了应用实例创建，直接操作渲染层。

### Welcome：欢迎页

```vue
<!-- packages/ui/src/welcome/Welcome.vue -->
<script setup lang="ts">
interface Props {
  title: string
  description?: string
  icon?: string
}

defineProps<Props>()
</script>

<template>
  <div class="medai-welcome">
    <div class="medai-welcome__icon">{{ icon ?? '💊' }}</div>
    <h2 class="medai-welcome__title">{{ title }}</h2>
    <p v-if="description" class="medai-welcome__desc">{{ description }}</p>
    <slot />
  </div>
</template>
```

### Prompts：预设提示集

```vue
<!-- packages/ui/src/prompts/Prompts.vue -->
<script setup lang="ts">
import type { PromptItem } from '@medai/shared'

defineProps<{ items: PromptItem[] }>()
const emit = defineEmits<{ select: [item: PromptItem] }>()
</script>

<template>
  <div class="medai-prompts">
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      class="medai-prompts__item"
      @click="emit('select', item)"
    >
      <strong>{{ item.label }}</strong>
      <small v-if="item.description">{{ item.description }}</small>
    </button>
  </div>
</template>
```

### 统一出口：`packages/ui/src/index.ts`

```typescript
export { default as Bubble } from './bubble/Bubble.vue'
export { default as Conversations } from './conversations/Conversations.vue'
export { default as Welcome } from './welcome/Welcome.vue'
export { default as Prompts } from './prompts/Prompts.vue'
export { useNotification } from './notification/useNotification'

export type * from '@medai/shared'
```

`export type *` 是 TypeScript 5.0+ 的类型专用重导出语法，明确告诉打包工具这一行只涉及类型、没有运行时代码，编译到 JS 后会被完全擦除，不会产生任何 `require('@medai/shared')` 的运行时依赖。

---

## 🧩 五、工具包与类型包

### `packages/shared`：跨包共享类型

```typescript
// packages/shared/src/types/index.ts
export * from './bubble'
export * from './conversations'
export * from './notification'
export * from './prompts'
```

```typescript
// packages/shared/src/types/conversations.ts
export interface ConversationItem {
  key: string
  label: string
  updatedAt: number
}
```

```typescript
// packages/shared/src/types/notification.ts
export interface NotificationOptions {
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  description?: string
  duration?: number
  onClose?: () => void
}
```

```typescript
// packages/shared/src/types/prompts.ts
export interface PromptItem {
  key: string
  label: string
  description?: string
}
```

`shared` 包不依赖 Vue，也不依赖 `utils`，`package.json` 里甚至不需要声明 `vue` 为 peerDependency——它纯粹是一份类型定义的集散地，这也是为什么它能被 `ui` 和 `utils` 同时依赖而不产生循环。

### `packages/utils`：无 UI 依赖的纯函数

```typescript
// packages/utils/src/typewriter.ts
export function useTypewriter(text: string, speed = 30) {
  let index = 0
  let timer: ReturnType<typeof setInterval> | null = null

  function start(onUpdate: (partial: string) => void, onDone?: () => void) {
    timer = setInterval(() => {
      index += 1
      onUpdate(text.slice(0, index))
      if (index >= text.length) {
        stop()
        onDone?.()
      }
    }, speed)
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  return { start, stop }
}
```

```typescript
// packages/utils/src/debounce.ts
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait = 200
) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
}
```

`useTypewriter` 之所以放进 `utils` 而不是 `ui`——它不产生任何 DOM、不依赖 `ref`/`reactive`，是一段和框架无关的纯逻辑（AI 回复的打字机效果本质是一个定时器 + 字符串截取）。判断一段代码该放 `ui` 还是 `utils` 的标准很简单：**这段代码里出现了 Vue 的响应式 API 或者渲染相关 API 吗？出现了就是 `ui` 的事，没出现就该待在 `utils`。**

---

## 🧩 六、构建打包配置：Vite Library Mode

### 为什么不是 tsup

`g-ai-ui`（本文参考的 React AI 组件库）用的是 [tsup](https://tsup.egoist.dev/) 打包，tsup 底层是 esbuild，速度快、配置极简，是纯 TypeScript/JavaScript 项目打包的主流选择。但它不适合直接照搬到 Vue 组件库——esbuild 本身**不认识 `.vue` 单文件组件语法**，`<template>`/`<script>`/`<style>` 三段式结构需要专门的 SFC 编译器（`@vue/compiler-sfc`）才能转成合法的 JS，esbuild 没有官方维护的 Vue 插件能完成这件事。React 组件库用 tsup 顺畅是因为 JSX 本身就是合法的 JS 语法超集，esbuild 原生支持编译 JSX，不需要额外的编译层。

主流 Vue 3 组件库（Element Plus、Ant Design Vue、Naive UI）几乎清一色用 **Vite Library Mode**（底层是 Rollup）+ `@vitejs/plugin-vue` 完成 `.vue` 编译，再配合 `vue-tsc` 生成 `.d.ts` 类型声明文件——这是 Vue 生态里打包组件库的标准工程实践。

> 💬 **面试官**：为什么 Vue 组件库不能直接用 tsup，React 组件库却可以？
>
> ✅ 标准答案：tsup 底层用 esbuild 做编译，esbuild 只认识标准 JS/TS/JSX 语法。JSX 是 JS 的语法超集，esbuild 原生支持，所以 React 组件库（源码是 `.tsx`）能被 tsup 直接处理。Vue 的 `.vue` 单文件组件是一套自定义的三段式文件格式，必须经过 `@vue/compiler-sfc` 编译成合法 JS 才能被后续工具处理，esbuild 生态里没有成熟的官方 Vue SFC 插件，因此 Vue 组件库普遍选择原生支持 `.vue` 编译的 Vite/Rollup 方案。
>
> 🎁 加分答案：能补充说明纯 `.ts` 工具包（没有任何 `.vue` 文件）其实仍然可以用 tsup——本文 `packages/utils`（纯函数）就适合 tsup，`packages/ui`（含 `.vue` 组件）才必须用 Vite Library Mode，这是一种分层打包策略，不是"Vue 项目一律不能用 tsup"的绝对结论。

### `packages/ui` 的 Vite Library Mode 配置

```typescript
// packages/ui/vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MedaiUI',
      fileName: (format) => `medai-ui.${format}.js`,
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      // vue 作为 peerDependency，不打进产物，由使用者项目提供
      external: ['vue'],
      output: {
        globals: { vue: 'Vue' }
      }
    },
    cssCodeSplit: false // 组件库样式统一输出为一个 css 文件，简化使用者的引入方式
  }
})
```

`external: ['vue']` 是组件库打包的惯例——`vue` 必须声明为 `peerDependencies` 而不是 `dependencies`，否则使用者项目里会出现两份 Vue 实例（一份自己装的，一份组件库打包进产物里的），触发"多个 Vue 实例"的运行时警告甚至响应式失效的诡异 bug。

```json
// packages/ui/package.json（关键字段）
{
  "name": "@medai/ui",
  "type": "module",
  "main": "./dist/medai-ui.cjs.js",
  "module": "./dist/medai-ui.es.js",
  "types": "./dist/index.d.ts",
  "sideEffects": ["**/*.css"],
  "exports": {
    ".": {
      "import": "./dist/medai-ui.es.js",
      "require": "./dist/medai-ui.cjs.js",
      "types": "./dist/index.d.ts"
    },
    "./style.css": "./dist/style.css"
  },
  "peerDependencies": {
    "vue": "^3.4.0"
  },
  "devDependencies": {
    "vue-tsc": "^2.0.0"
  }
}
```

`sideEffects: ["**/*.css"]` 而不是简单粗暴的 `sideEffects: false`——组件库的 CSS 文件确实有副作用（引入即生效，不能被 Tree Shaking 摇掉），但 JS 模块本身没有副作用。写成 `false` 会导致打包工具误判 CSS 文件也能被安全删除，使用者引入组件后发现样式丢失，这是组件库打包里一个常见的隐性 bug。

### 类型声明文件生成：`vue-tsc`

Vite Library Mode 本身**不生成** `.d.ts` 文件，需要单独跑一次类型检查生成声明文件：

```json
// packages/ui/package.json scripts
{
  "scripts": {
    "build": "vue-tsc --declaration --emitDeclarationOnly --outDir dist && vite build"
  }
}
```

`vue-tsc` 是 TypeScript 官方 `tsc` 的一个包装版本，专门处理 `.vue` 文件里 `<script setup>` 的类型推导（原生 `tsc` 看不懂 `.vue` 文件），`--emitDeclarationOnly` 表示只产出 `.d.ts` 文件、不产出 `.js`（`.js` 由 Vite 的 Rollup 流程负责），两条命令职责互补、缺一不可。

---

## 🧩 七、文档站搭建：Rspress

选 [Rspress](https://rspress.dev/) 而不是 VitePress，是因为 Rspress 底层是基于 Rspack（Rust 版 Webpack）的 MDX 编译，构建速度在文档数量增多后优势明显，同时官方对组件 Demo 与文档共存的场景做了针对性优化（`<PackageManagerTabs>`、代码块自动运行等内置组件）。VitePress 依然是社区更成熟的选择，两者定位接近，本文选 Rspress 主要出于"顺带体验字节生态工具链"的学习目的，不是说 VitePress 不适用。

```shell
cd apps/docs
pnpm dlx create-rspress@latest
```

`apps/docs/package.json` 里把 `@medai/ui` 声明为依赖，`workspace:*` 协议保证文档站永远消费的是本地最新构建的组件库，不是 npm 上发布过的旧版本：

```json
{
  "dependencies": {
    "@medai/ui": "workspace:*"
  }
}
```

组件文档示例直接从源码目录引入真实组件，而不是复制一份代码到 MDX 里手写：

````markdown
<!-- apps/docs/docs/components/bubble.mdx -->
# Bubble 对话气泡

```vue
<script setup>
import { Bubble } from '@medai/ui'
import '@medai/ui/style.css'

const message = {
  id: '1',
  role: 'assistant',
  content: '您好，我是 AI 问诊助手，请描述您的症状。',
  createdAt: Date.now()
}
</script>

<template>
  <Bubble :message="message" />
</template>
```
````

这种"文档从源码引入组件"的写法保证了一件事：组件行为一旦变化（比如 `Bubble` 新增了一个 prop），文档里的 Demo 会立刻表现出这个变化，不存在"文档写的是三个月前的旧版本行为"这种脱节问题。

---

## 🧩 八、Playground 挂载演示

`apps/playground` 是一个独立的 Vite + Vue 3 项目，专门用来验证"组件库被真实项目当作依赖引入"时的表现——这一步容易被忽略，但恰恰是最接近生产环境的验证方式，因为文档站里引入组件库多少带一点"自己人测自己"的意味。

```shell
cd apps/playground
pnpm create vite . --template vue-ts
```

```json
// apps/playground/package.json
{
  "dependencies": {
    "@medai/ui": "workspace:*",
    "vue": "^3.4.0"
  }
}
```

```vue
<!-- apps/playground/src/App.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { Bubble, Welcome, Prompts, Conversations, useNotification } from '@medai/ui'
import '@medai/ui/style.css'
import type { PromptItem, BubbleMessage, ConversationItem } from '@medai/shared'

const { notify } = useNotification()

const conversations = ref<ConversationItem[]>([
  { key: '1', label: '感冒发烧咨询', updatedAt: Date.now() },
  { key: '2', label: '慢性病用药提醒', updatedAt: Date.now() - 86400000 }
])

const prompts: PromptItem[] = [
  { key: 'symptom', label: '我最近头痛失眠', description: '常见症状咨询模板' },
  { key: 'medication', label: '这个药能和感冒药一起吃吗', description: '用药安全咨询模板' }
]

const messages = ref<BubbleMessage[]>([])

function handlePromptSelect(item: PromptItem) {
  messages.value.push({
    id: String(Date.now()),
    role: 'user',
    content: item.label,
    createdAt: Date.now()
  })
  notify({ type: 'info', title: '已收到咨询', description: '正在为您匹配 AI 问诊助手…' })
}
</script>

<template>
  <div class="layout">
    <Conversations :items="conversations" active-key="1" @select="() => {}" @delete="() => {}" />
    <main>
      <Welcome title="AI 问诊助手" description="描述症状，获得初步用药建议" icon="🩺" />
      <Prompts :items="prompts" @select="handlePromptSelect" />
      <Bubble v-for="msg in messages" :key="msg.id" :message="msg" />
    </main>
  </div>
</template>
```

```shell
pnpm --filter playground dev
```

打开 Playground 页面，点击 `Prompts` 里的预设问题，观察左侧会话列表、气泡消息、右上角系统通知是否按预期联动——这一步验证的是"组件库导出的类型是否精确"（`PromptItem`/`BubbleMessage` 在 IDE 里能否给出字段提示）和"样式文件是否需要手动引入"（忘记 `import '@medai/ui/style.css'` 会导致组件功能正常但样式全部丢失，这是组件库新手最容易踩的坑）。

---

## 🧩 九、版本发布与 CI

### changesets：不用人肉维护版本号和 CHANGELOG

```shell
pnpm add -D -w @changesets/cli
pnpm changeset init
```

日常开发流程：每次给某个包做了值得发布的变更，跑一次：

```shell
pnpm changeset
```

命令行交互会问你——这次改动涉及哪些包、是 `patch`/`minor`/`major` 哪种语义化版本变化、变更说明是什么。回答完会在 `.changeset/` 目录生成一个 Markdown 文件（记录本次变更），这个文件跟着 PR 一起提交。

合并到主分支后，跑一次：

```shell
pnpm changeset version   # 消费所有 .changeset/*.md，批量升版本号 + 生成 CHANGELOG.md
pnpm changeset publish   # 把改动过的包发布到 npm
```

> 💬 **面试官**：changesets 解决的核心问题是什么，Monorepo 里为什么特别需要它？
>
> ✅ 标准答案：Monorepo 里一次 PR 可能同时改了 `ui`、`utils`、`shared` 三个包，每个包该升哪个版本号（patch/minor/major）、CHANGELOG 该怎么写，靠人工记忆很容易出错或遗漏。changesets 让每次改动的作者在提交时就顺手记录"这次改了什么、影响哪些包、语义化版本升级级别"，合并后自动批量处理版本号计算和 CHANGELOG 生成，把"发布决策"这件事分散到每次 PR 里做，而不是集中到发布那一刻靠记忆重建。

### CI 四步门禁

```yaml
# .github/workflows/ci.yml
name: CI
on: [pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm build
      - run: pnpm test
```

`pnpm install --frozen-lockfile` 是 CI 环境的惯例写法——`lock` 文件和 `package.json` 声明不一致时直接报错退出，而不是静默地重新解析依赖树，避免"本地能跑、CI 上依赖版本却飘了"的问题。四步顺序也有讲究：`lint` 最快最先跑，尽早暴露风格问题；`build` 在 `test` 之前，因为组件库的类型测试和集成测试往往依赖构建产物；`build` 命中 Turborepo 缓存时，这一步在 CI 上可能几秒钟就结束，这也是把 CI 缓存和 Turborepo 远程缓存打通后最直接的收益。

---

## 🧩 十、目录结构总览

```
medai-ui/
├── apps/
│   ├── docs/                  # Rspress 文档站
│   └── playground/            # Vite + Vue 3 示例项目
├── packages/
│   ├── shared/                # 跨包类型定义（不依赖 Vue）
│   │   └── src/types/
│   ├── utils/                 # 纯函数工具（tsup 打包）
│   │   └── src/
│   └── ui/                    # 组件本体（Vite Library Mode 打包）
│       └── src/
│           ├── bubble/
│           ├── conversations/
│           ├── notification/
│           ├── welcome/
│           ├── prompts/
│           └── index.ts
├── .changeset/                # changesets 变更记录
├── .github/workflows/ci.yml
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

## 参考

- https://turbo.build/repo/docs
- https://pnpm.io/zh/workspaces
- https://rspress.dev/
- https://github.com/lotosv2010/g-ai-ui
- https://x.ant.design/components/introduce-cn/
- https://vitejs.dev/guide/build.html#library-mode
- https://github.com/changesets/changesets

---

## 💡 一张图总结（面试速记）

| 知识点 | 一句话解释 | 面试价值 |
| --- | --- | --- |
| pnpm workspace 依赖提升 | 内容寻址存储 + 符号链接分层，既复用磁盘又避免幽灵依赖 | 高频，是理解 Monorepo 包联动的根基 |
| Turborepo 缓存命中 | 源码内容 + 依赖版本 + 声明的环境变量一起算哈希，命中直接复用产物 | 高频，容易被"为什么改注释缓存也失效"追问 |
| `dependsOn: ["^build"]` | `^` 表示先构建被依赖的包，保证 Monorepo 内构建顺序自底向上 | 中频，考查对任务编排语义的理解 |
| Vue 组件库不能用 tsup | esbuild 不认识 `.vue` SFC 语法，Vue 生态标准方案是 Vite Library Mode + `@vitejs/plugin-vue` | 高频，React/Vue 组件库工程化对比的典型考点 |
| `vue-tsc` 生成 `.d.ts` | Vite Library Mode 不生成类型声明，需要 `vue-tsc --emitDeclarationOnly` 单独跑一遍 | 中频，实操中容易漏掉这一步导致类型文件缺失 |
| `sideEffects: ["**/*.css"]` | CSS 有副作用不能被摇掉，JS 模块本身无副作用，不能笼统写 `false` | 中频，组件库 Tree Shaking 失效的常见隐性 bug |
| changesets 版本管理 | 变更记录分散到每次 PR，合并后批量计算版本号和 CHANGELOG，替代人工发布决策 | 中频，Monorepo 发布流程的标准考点 |

---

## 📝 留个问题

> 💬 **面试追问**：如果 `packages/ui` 的 `package.json` 里把 `vue` 错误地声明在了 `dependencies` 而不是 `peerDependencies`，使用者项目里会出现什么现象？

提示：回到「六、构建打包配置」里 `external: ['vue']` 的讨论——打包配置声明了排除 `vue`，但 `package.json` 的依赖声明和打包配置是两件独立的事。想清楚 pnpm 安装依赖时，`dependencies` 和 `peerDependencies` 分别会在 `node_modules` 里产生什么结构差异，再想一下：使用者项目本身也装了一份 `vue`，这时候到底会存在几个 `vue` 实例，`ref`/`reactive` 创建出来的响应式对象如果分别来自两个不同的 `vue` 实例，组件间传递这些对象会发生什么。

---

> 🔖 这是「Vue 3 全家桶深度拆解系列」第 11 篇。上一篇：《Vue 3 性能优化全攻略：编译时优化 + 运行时优化的最优组合（面试收藏级）》
