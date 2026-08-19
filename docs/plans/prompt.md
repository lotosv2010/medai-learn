# prompt

```text
/publish 下面我们规划Vue3全家桶的第1篇文章，具体如下：
{{
## 知识点范围

### 标题

- Vue 3 设计思想与整体架构

**副标题**：Monorepo 拆包、Tree-shaking、Composition API，Vue 3 为什么这样设计？

#### 一、基本使用
- Vue 2 vs Vue 3 项目初始化对比：`new Vue()` → `createApp()`
- 全局 API 拆分：`Vue.component / Vue.directive / Vue.use` → `app.component / app.directive / app.use`
- `createApp` 多实例模式：多个应用实例互不污染全局配置
- 按需导入：`import { ref, computed } from 'vue'` — Tree-shaking 的前提
- `app.config.globalProperties` 替代 `Vue.prototype`

#### 二、原理
- Monorepo 包结构：`@vue/reactivity / @vue/runtime-core / @vue/runtime-dom / @vue/compiler-dom / vue`；每个包职责单一，可独立使用
- Tree-shaking 设计：Vue 3 全部使用命名导出而非挂载到 Vue 原型；未使用的 API 在构建时被摇掉
- `@vue/reactivity` 与渲染器解耦：响应式系统可脱离 DOM 独立运行（Node.js / Canvas / 小程序）
- `createRenderer(options)` 渲染器工厂：7 个平台操作（createElement / patchProp / insert / remove 等）可替换，实现跨平台
- Composition API 动机：解决 Options API 逻辑碎片化 + 类型推断难两个问题；逻辑关注点聚合到 Composable 函数
- `setup()` 执行时机：在 `beforeCreate` 之前，无 `this`，接收 `props` 和 `context`

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. 包入口：`packages/vue/src/index.ts` — 重新导出所有公共 API
2. `createApp`：`packages/runtime-dom/src/index.ts` — 返回 app 实例，挂载 `use / component / directive / mount`
3. 渲染器工厂：`packages/runtime-core/src/renderer.ts` — `createRenderer` 接收 `RendererOptions`
4. 响应式独立包：`packages/reactivity/src/index.ts` — 可脱离 Vue 使用
5. 全局 API 迁移对照：`packages/runtime-core/src/apiCreateApp.ts`

#### 四、生产级最佳实践
- 只引入需要的 API，避免 `import Vue from 'vue'` 全量导入（虽然 vue 包已做 re-export 优化）
- 多 `createApp` 场景：同一页面内嵌多个独立 Vue 应用（医疗：HIS 系统内嵌第三方药品查询组件）
- `app.config.errorHandler` 统一捕获全局异常，对接监控平台
- `app.config.globalProperties` 替代 `Vue.prototype`，同时提供 TypeScript 类型扩展

#### 五、手写实现（可独立跑通）
医疗场景：Vite + TypeScript 搭建环境，手写 `createApp + app.use + app.component + app.mount`；药品查询插件通过 `app.use` 安装，多实例互不污染演示

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://cn.vuejs.org/guide/introduction.html
- https://v3-migration.vuejs.org/zh/
- https://jonny-wei.github.io/blog/vue/vue3/reactivity.html
- https://github.com/wbccb/

**面试核心问**：
- Vue 3 为什么要拆成多个包（Monorepo）？`@vue/reactivity` 单独使用有什么场景？
- Vue 3 是怎么实现 Tree-shaking 的？和 Vue 2 的区别？
- `createApp` 和 `new Vue()` 的区别？多实例有什么意义？
- Composition API 解决了 Options API 的哪两个核心问题？
- `setup()` 的执行时机是什么？为什么不能用 `this`？


## 分析角度（每个子主题都按此展开）

A · 实操五段式（适用于有「手写内核」的篇章）

是什么 → 核心原理 → 手写实现（关键代码） → 生产级最佳实践 → 完整最佳实践代码

B · 概念四段式（适用于概念/架构/方法论篇章）

真实场景引入 → 概念/机制拆解 → 决策矩阵或对比表 → 行动清单

## 已有笔记

- @docs/notes/06 vue 3/01 设计思想和理念.md
- @docs/notes/06 vue 3/02 整体架构.md
- @docs/notes/06 vue 3/03 开发环境搭建.md

## plans 地址

- @docs/plans/vue3-family-series-outline.md

## 规则

- 所有的源码解析都是vue 3.4 的版本，手写也是 3.4 的版本，仓库地址 https://github.com/vuejs/core
- 先阅读以上笔记，找出缺失或浅尝辄止的知识点
- 笔记只关注 @docs/notes/06 vue 3 目录下的，其他目录禁止自行读取
- 补全内容（保留原有内容，只增不删），保留图片
- 将整理后的内容生成公众号文章，输出到 @docs/articles/06 vue 3
- 文章结构：先出大纲等我确认，再逐节写作
}}
，保留笔记完整代码和图片，样式格式保持一致和这篇@docs/articles/05 vue 2/2026-08-18-vue2-vuex.md，不读我没要求到的文件；可以根据你的经验和最佳实践查漏补缺；主线要明确清晰，不要遗漏源码解析章节；每个知识点都要由浅入深的彻底讲透，讲明白。
```
