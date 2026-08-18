# prompt

```text
/publish 下面我们规划Vue2全家桶的第10篇文章，具体如下：
{{
## 知识点范围

### 标题

- Vuex 原理与手写实现

**副标题**：mutation 为什么必须同步？Vuex 的设计哲学

#### 一、基本使用
- 五个核心概念：State / Getter / Mutation / Action / Module
- mapState / mapGetters / mapMutations / mapActions 辅助函数
- 模块化 namespaced：命名空间隔离；跨模块访问 rootState / rootGetters
- 严格模式：防止 state 被直接修改

#### 二、原理
- Vuex 如何借用 Vue 实例实现数据响应：`new Vue({ data: { $$state: state } })`
- getters 缓存机制：挂载到 `store._vm` 的 computed 属性，依赖不变不重算
- mutation 必须同步：devtools 时间旅行依赖同步状态快照，异步会导致快照不准
- action 的本质：异步操作 + commit mutation，返回 Promise
- install：Vue.mixin beforeCreate 注入 $store，子组件从父组件继承
- modules 命名空间：路径拼接（`moduleName/actionName`）+ installModule 递归注册
- mapState / mapGetters 实现：遍历 keys，生成 computed 函数对象
- 插件机制：subscribe / subscribeAction 订阅 mutation/action
- 严格模式实现：`store._vm.$watch('$$state', handler, { deep: true, sync: true })`，在非 mutation 中修改 state 会报错

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. Store install：`src/store.js`（Vue.mixin beforeCreate 注入 $store）
2. state 响应式化：`src/store.js`（`new Vue({ data: { $$state } })` + resetStoreVM）
3. getters computed 化：`src/store.js` makeLocalGetters
4. commit / dispatch：`src/store.js`（mutation 同步 + action Promise）
5. ModuleCollection + installModule：`src/module/module-collection.js`（命名空间路径拼接）

#### 四、生产级最佳实践
- 什么时候不应该用 Vuex：组件局部状态 vs 跨组件共享状态的边界
- vuex-persistedstate 持久化原理（subscribe + storage）与使用
- 大型项目模块化拆分规范：按业务域分模块（医疗：user/drug/prescription）
- 与 Pinia 的对比：为什么 Vue 3 中更推荐 Pinia（无 mutation、TS 更友好）

#### 五、手写实现（可独立跑通）
医疗场景：Rollup 搭建环境，手写 Store + commit/dispatch + Vue.mixin install + ModuleCollection + installModule + 持久化插件；药品库存全局状态管理含模块化 + 持久化完整代码


#### 六、手写实现源码 GitHub 地址
- https://github.com/lotosv2010/vuex-source

#### 七、参考
- https://v3.vuex.vuejs.org/zh/
- https://jonny-wei.github.io/blog/vue/vuex/abstract.html

**面试核心问**：
- mutation 为什么必须是同步函数？异步会有什么问题？
- Vuex 的响应式是怎么实现的？getters 的缓存机制是什么？
- action 和 mutation 的本质区别？什么情况下必须用 action？
- modules 命名空间的路径是怎么拼接的？怎么跨模块调用 action？
- mapState / mapGetters 的实现原理是什么？


## 分析角度（每个子主题都按此展开）

A · 实操五段式（适用于有「手写内核」的篇章）

是什么 → 核心原理 → 手写实现（关键代码） → 生产级最佳实践 → 完整最佳实践代码

B · 概念四段式（适用于概念/架构/方法论篇章）

真实场景引入 → 概念/机制拆解 → 决策矩阵或对比表 → 行动清单

## 已有笔记

- @docs/notes/05 vue 2/03 手写vuex源码.md

## plans 地址

- @docs/plans/vue2-family-series-outline.md

## 规则

- 先阅读以上笔记，找出缺失或浅尝辄止的知识点
- 笔记只关注 @docs/notes/vue2 目录下的，其他目录禁止自行读取
- 补全内容（保留原有内容，只增不删），保留图片
- 将整理后的内容生成公众号文章，输出到 docs/articles/vue-2
- 文章结构：先出大纲等我确认，再逐节写作
}}
，保留笔记完整代码和图片，样式格式保持一致和这篇@docs/articles/05 vue 2/2026-08-17-vue2-vue-router.md，不读我没要求到的文件；可以根据你的经验和最佳实践查漏补缺；主线要明确清晰，不要遗漏源码解析章节；每个知识点都要由浅入深的彻底讲透，讲明白。
```
