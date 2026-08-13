# prompt

```text
/publish 下面我们规划Vue2全家桶的第5篇文章，具体如下：
{{
## 知识点范围

### 标题

- Vue 2 模板编译原理

**副标题**：.vue 文件里的 `<template>` 是怎么变成 render 函数的？

#### 一、基本使用
- render 函数 vs template：何时手写 render 函数
- v-if / v-for / v-model 在 render 函数中的等价写法
- `v-for` 与 `v-if` 同节点优先级：`v-for` 优先级高于 `v-if`（先循环再判断），应用 `<template>` 包裹规避
- JSX 在 Vue 2 中的使用：@vue/babel-plugin-transform-vue-jsx
- vm.$createElement：手动创建 VNode

#### 二、原理
- 编译入口：compileToFunctions（运行时编译）vs vue-loader（构建时编译）
- 第一步 parse：正则扫描 HTML 字符串 → 构建 AST
  - 开始标签、结束标签、文本节点的解析逻辑
  - 属性解析：静态属性 / v-bind / v-on / 指令
- 第二步 optimize：遍历 AST，标记纯静态节点（static / staticRoot）；静态节点跳过 Diff
- 第三步 generate：AST → render 函数字符串
  - `_c / _v / _s / _l` 等辅助函数的含义
  - v-if 编译为三元表达式，v-for 编译为 `_l(list, fn)`
  - v-model 编译产物：`<input v-model="val">` → `_c('input', { domProps: { value: val }, on: { input: fn } })`；组件 v-model 走 `model` 选项（prop + event 可自定义）
  - 自定义指令的编译：生成指令描述对象，运行时按 bind→inserted→update→componentUpdated→unbind 序列调用
- `v-for` 与 `v-if` 优先级的 AST 表现：v-for 先处理生成 `_l`，v-if 作为内层条件

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. 编译入口：`src/compiler/index.js` compileToFunctions 入口
2. parse 阶段：`src/compiler/parser/index.js` 正则扫描 HTML → AST
3. optimize 阶段：`src/compiler/optimizer.js` 标记 static 节点
4. generate 阶段：`src/compiler/codegen/index.js` AST → render 字符串（含 v-if / v-for / v-model）
5. `_c / _v / _s / _l` 辅助函数：`src/core/instance/render-helpers/index.js`

#### 四、生产级最佳实践
- 构建时编译 vs 运行时编译的体积差（约 30KB）：生产环境只用 runtime 版本
- v-pre 指令：跳过编译，提升静态内容渲染性能
- template vs render 的选择：template 可读性好，render 灵活性高（动态组件、条件渲染多分支场景）
- v-for + v-if 同节点反模式：改用 computed 过滤数据源，避免每次渲染都重算

#### 五、手写实现（可独立跑通）
医疗场景：Rollup 搭建环境，~170 行手写 parse + optimize + generate；药品说明书动态模板编译产物可视化

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）


#### 七、参考
- https://v2.cn.vuejs.org/
- https://jonny-wei.github.io/blog/vue/vue/vue-diff.html
- https://github.com/vuejs/vue/blob/dev/src/core/instance/index.js
- https://github.com/wbccb


**面试核心问**：
- 模板编译的三个阶段分别做了什么？
- v-model 的编译产物是什么？组件上的 v-model 和原生元素有何不同？
- v-for 和 v-if 同时用在一个元素上，优先级是怎样的？为什么不推荐？
- Vue 2 的静态节点优化是怎么实现的？optimize 阶段做了什么？
- 自定义指令的五个钩子分别在什么时机执行？

## 分析角度（每个子主题都按此展开）

A · 实操五段式（适用于有「手写内核」的篇章）

是什么 → 核心原理 → 手写实现（关键代码） → 生产级最佳实践 → 完整最佳实践代码

B · 概念四段式（适用于概念/架构/方法论篇章）

真实场景引入 → 概念/机制拆解 → 决策矩阵或对比表 → 行动清单

## 已有笔记

- @docs/notes/05 vue 2/01 手写vue2源码.md

## plans 地址

- @docs/plans/vue2-family-series-outline.md

## 规则

- 先阅读以上笔记，找出缺失或浅尝辄止的知识点
- 笔记只关注 @docs/notes/vue2 目录下的，其他目录禁止自行读取
- 补全内容（保留原有内容，只增不删），保留图片
- 将整理后的内容生成公众号文章，输出到 docs/articles/vue-2
- 文章结构：先出大纲等我确认，再逐节写作
}}
，保留笔记完整代码和图片，样式格式保持和上一篇一致@docs/articles/05 vue 2/2026-08-13-vue2-vdom-diff.md，不读我没要求到的文件；可以根据你的经验和最佳实践查漏补缺；主线要明确清晰，不要遗漏源码解析章节；每个知识点都要由浅入深的彻底讲透，讲明白。
```
