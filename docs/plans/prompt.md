# prompt

- 下面我们规划Vue2全家桶的第1篇文章，具体如下：

## 知识点范围

### 标题

- Vue 2 响应式原理与手写实现

### 大纲

**副标题**：数据变了视图为什么会更新？Observer / Dep / Watcher 三件套全链路

#### 一、基本使用
- data 的响应式触发：直接赋值 vs $set / $delete
- computed 的缓存行为与 watch 的 deep/immediate 选项
- 数组变更检测：push/pop/splice 等 7 个方法 vs 索引赋值的陷阱
- 响应式边界：什么情况下数据变了视图不更新？

#### 二、原理
- Object.defineProperty 的 get/set 拦截机制
- Observer：递归劫持整个对象树；`__ob__` 标记的作用（防重复 observe + 数组依赖挂载点）
- 数组 7 个方法重写原因：defineProperty 监听不到长度和索引变化
- Dep（依赖收集器）：每个响应式属性对应一个 Dep 实例；`dep.id` 去重防止同一 Watcher 重复收集
- Watcher 三种类型：render Watcher / computed Watcher（lazy + dirty flag）/ user Watcher（watch）
- 依赖收集完整链路：render → 访问 data → dep.depend() → Dep.target → watcher.addDep()
- 派发更新完整链路：data 赋值 → dep.notify() → watcher.update() → queueWatcher → flushSchedulerQueue
- computed 惰性求值：dirty=true 时重新计算，dirty=false 直接返回缓存值
- $nextTick：flushSchedulerQueue 完成后 → Promise → MutationObserver → setImmediate → setTimeout 降级链

#### 三、手写实现（每步可独立跑通）
1. Rollup + Babel + rollup-plugin-serve 环境搭建，输出 UMD 格式
2. Observer：递归 walk + defineReactive + `__ob__` 标记
3. Dep：depend / notify / subs 管理 + id 去重
4. Watcher：get / update / run / lazy dirty 惰性求值（computed）
5. $nextTick：Promise 降级到 setTimeout 的完整实现

#### 四、生产级最佳实践
- $set / $delete 的使用时机与实现原理（数组走 splice，对象走 defineReactive）
- Object.freeze 冻结大型只读数据集（药品目录、ICD 码表）：freeze 后 defineProperty 无法重写
- 深层嵌套对象的响应式性能风险：避免 3 层以上自动递归
- watch 的 immediate + deep 与内存泄漏风险
- computed vs watch 的选型：有返回值用 computed，有副作用用 watch

#### 五、案例完整代码
医疗场景：患者信息表单，实时响应式验证

#### 六、vue2 手写完整代码

```js
```

#### 七、源码地址（单独一章节，原url文本展示）

- https://github.com/lotosv2010/g-vue

#### 八、参考（单独一章节，原url文本展示）

- https://v2.cn.vuejs.org/v2/guide/reactivity.html


**面试核心问**：
- defineProperty 和 Proxy 的区别？Vue 3 为什么换掉？
- 数组为什么不用 defineProperty 监听下标？
- computed 和 watch 的 Watcher 有什么区别？lazy/dirty 机制是什么？
- `__ob__` 标记在 Vue 2 响应式系统中有什么作用？
- $nextTick 的降级策略是什么？为什么优先用微任务？
- dep.id 去重机制解决了什么问题？

## 分析角度（每个子主题都按此展开）

A · 实操五段式（适用于有「手写内核」的篇章）

是什么 → 核心原理 → 手写实现（关键代码） → 生产级最佳实践 → 完整最佳实践代码

B · 概念四段式（适用于概念/架构/方法论篇章）

真实场景引入 → 概念/机制拆解 → 决策矩阵或对比表 → 行动清单

## 已有笔记

- @docs/notes/05 vue 2/01 手写vue2源码.md

## 规则

- 先阅读以上笔记，找出缺失或浅尝辄止的知识点
- 笔记只关注 @docs/notes/vue2 目录下的，其他目录禁止自行读取
- 补全内容（保留原有内容，只增不删），保留图片
- 将整理后的内容生成公众号文章，输出到 docs/articles/vue-2
- 文章结构：先出大纲等我确认，再逐节写作
