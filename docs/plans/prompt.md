# prompt

```text
/publish 下面我们规划Vue2全家桶的第8篇文章，具体如下：
{{
## 知识点范围

### 标题

- Vue 2 内置组件与核心 API 原理

**副标题**：keep-alive 怎么缓存组件？mixin 合并策略是什么？

#### 一、基本使用
- keep-alive：include / exclude / max 的使用
- transition：enter/leave 钩子与 CSS 类名序列
- Vue.mixin：全局混入 vs 局部混入
- Vue.use：插件安装机制
- Vue.extend：动态创建组件构造函数（命令式弹窗场景）
- Vue.observable：Vue 2.6 新增的轻量响应式对象（替代简单 Vuex 场景）
- $set / $delete：触发响应式更新的 API
- $attrs / $listeners：非 props 属性和事件的透传（inheritAttrs: false 配合使用）
- errorCaptured：组件树错误捕获钩子

#### 二、原理
- keep-alive 缓存策略：LRU（最近最少使用）
  - 用 Map + Set 维护缓存 key 顺序，超过 max 时淘汰最久未访问的 key
  - activated / deactivated 钩子的触发时机；与 beforeDestroy 的区别
- transition 动画钩子执行序列：
  - enter：before-enter → enter → after-enter / enter-cancelled
  - leave：before-leave → leave → after-leave / leave-cancelled
  - CSS transition / animation 与 JS 钩子的协同机制
- scoped-slot 编译产物：父组件生成插槽函数，子组件 `$scopedSlots.default()` 调用；与普通 slot 编译产物的差异
- Vue.mixin 的合并策略（mergeOptions）：
  - 生命周期：数组合并，mixin 先于组件执行
  - data：递归合并，组件 data 优先
  - methods / computed / components：组件选项覆盖 mixin
- Vue.use 的 install 机制：调用 plugin.install(Vue) + 防重复注册（installedPlugins 数组）
- Vue.extend：创建 Sub 构造函数，缓存在 `Sub._Ctor`，避免重复创建；命令式弹窗的核心
- Vue.observable：对对象调用 `observe()`，返回响应式对象，可作轻量全局状态
- $set：对数组调用 splice，对对象调用 defineReactive + dep.notify
- errorCaptured → Vue.config.errorHandler：错误从子组件向上冒泡，可在任意祖先捕获

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. keep-alive LRU：`src/core/components/keep-alive.js`（Map + keys 数组维护顺序）
2. mergeOptions 策略：`src/core/util/options.js`（strats 策略对象）
3. Vue.use：`src/core/global-api/use.js`（installedPlugins 防重复）
4. Vue.extend：`src/core/global-api/extend.js`（Sub + `_Ctor` 缓存）
5. $set / $delete：`src/core/observer/index.js`（splice / defineReactive 两条路径）

#### 四、生产级最佳实践
- keep-alive + 路由缓存：include 动态白名单控制（医疗场景：问诊页面缓存）
- mixin 的命名冲突风险与替代方案（HOC / 插件；Vue 3 改用 Composable）
- transition 性能优化：transform + will-change，避免触发 layout
- Vue.extend 实现命令式弹窗：`new Ctor().$mount()` + `document.body.appendChild`
- `$once + hook:beforeDestroy` 优雅自清理模式，替代 beforeDestroy 中手写 $off
- Vue.observable 轻量全局状态：适合无需 Vuex 的小型跨组件状态共享

#### 五、手写实现（可独立跑通）
医疗场景：Rollup 搭建环境，手写 keep-alive LRU + mergeOptions + Vue.use + Vue.extend + $set/$delete；科室切换 keep-alive 缓存 + 命令式确认弹窗完整代码


#### 六、手写实现源码 GitHub 地址
- https://github.com/lotosv2010/g-vue


#### 七、参考
- https://v2.cn.vuejs.org/
- https://github.com/vuejs/vue/blob/dev/src/core/instance/index.js
- https://jonny-wei.github.io/blog/vue/vue/vue-event.html
- https://ustbhuangyi.github.io/vue-analysis/
- https://github.com/wbccb


**面试核心问**：
- keep-alive 的 LRU 缓存是怎么实现的？max 触发时调用哪个生命周期？
- mixin 的合并策略是什么？同名生命周期谁先执行？
- scoped-slot 和普通 slot 的编译产物有什么区别？
- Vue.extend 的使用场景是什么？命令式弹窗怎么实现？
- `$once + hook:beforeDestroy` 模式解决了什么问题？
- Vue.observable 和 Vuex 什么时候选哪个？


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
，保留笔记完整代码和图片，样式格式保持一致和这篇@docs/articles/05 vue 2/2026-08-12-vue2-reactivity.md，不读我没要求到的文件；可以根据你的经验和最佳实践查漏补缺；主线要明确清晰，不要遗漏源码解析章节；每个知识点都要由浅入深的彻底讲透，讲明白。
```
