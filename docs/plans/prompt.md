# prompt

```text
/publish 下面我们规划Vue2全家桶的第3篇文章，具体如下：
{{
## 知识点范围

### 标题

- Vue 2 虚拟 DOM 与 Diff 算法

**副标题**：为什么 key 不能用 index？双端四指针 Diff 一次讲透

#### 一、基本使用
- Virtual DOM 解决的问题：跨平台 + 减少直接操作 DOM
- render 函数与 h() 函数：createElement 的参数结构
- v-for 的 key 属性：正确用法与常见误区
- functional component：无实例、无响应式的轻量渲染

#### 二、原理
- VNode 数据结构：tag / data / children / key / componentOptions
- createElement：规范化 children → 创建 VNode
- patch 函数：初始化挂载 vs 更新时的差异比较
- `sameVnode` 判断条件：key + tag + isComment + data 是否定义 + input type 五项全满足才复用
- Diff 算法核心：同层比较原则（为什么不跨层）
- 双端四指针算法：oldStart/oldEnd/newStart/newEnd 四个游标的五种命中情况
  1. oldStart vs newStart（头头相同）
  2. oldEnd vs newEnd（尾尾相同）
  3. oldStart vs newEnd（头尾相同，节点右移）
  4. oldEnd vs newStart（尾头相同，节点左移）
  5. 以上均未命中 → 用 key 映射表查找 or 新建
- `patchVnode` 与 `updateChildren` 的递归关系：patchVnode 负责当前节点更新，子节点交给 updateChildren
- key 的作用：建立旧节点 key→index 映射表，O(n) 复用节点
- key 用 index 的问题：列表逆序/删除时 key 不稳定导致错误复用、输入框内容错位

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. VNode 类：`src/core/vdom/vnode.js`
2. createElement：`src/core/vdom/create-element.js`（children 规范化）
3. `sameVnode`：`src/core/vdom/patch.js` 判断条件
4. patch / createElm：首次挂载与 patchVnode 更新
5. updateChildren：双端四指针五种命中情况完整实现
6. createKeyToOldIdx：key 映射表 O(n) 复用

#### 四、生产级最佳实践
- key 的最佳实践：用数据 ID，不用 index，不用随机数
- functional component 适用场景：纯展示型叶节点组件
- v-if / v-show 选择依据：销毁重建 vs display 切换的性能对比
- 大列表渲染：结合虚拟列表，Diff 的瓶颈在节点数量而非算法
- 组件级别 key 强制重建：`<comp :key="version">` 替代手动重置逻辑

#### 五、手写实现（可独立跑通）
医疗场景：Rollup 搭建环境，手写 VNode + patch + updateChildren 双端四指针；处方药品列表增删改时 key 复用完整演示

#### 六、手写实现源码 GitHub 地址
（链接占位，写作时填入）

#### 七、参考
- https://v2.cn.vuejs.org/
- https://jonny-wei.github.io/blog/vue/vue/vue-diff.html
- https://github.com/vuejs/vue/blob/dev/src/core/instance/index.js
- https://github.com/wbccb


**面试核心问**：
- `sameVnode` 的判断条件是什么？为什么 key 不同就不复用？
- Vue 2 Diff 算法双端四指针的五种命中情况分别是什么？
- key 不能用 index 的根本原因是什么？举个具体出错场景
- `patchVnode` 和 `updateChildren` 是什么关系？
- 为什么 Virtual DOM 不一定比直接操作 DOM 快？

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
，保留笔记完整代码和图片，样式格式保持和上一篇一致@docs/articles/05 vue 2/2026-08-12-vue2-reactivity.md，不读我没要求到的文件；可以根据你的经验和最佳实践查漏补缺；主线要明确清晰；每个知识点都要由浅入深的彻底讲透，讲明白。
```
