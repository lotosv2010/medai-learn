# prompt

```text
/publish 下面我们规划Vue3全家桶的第2篇文章，具体如下：
{{
## 知识点范围

### 标题

- Vue 3 响应式原理与手写实现

**副标题**：Proxy 如何比 Object.defineProperty 做得更彻底？track/trigger 全链路拆解

#### 一、基本使用
- `reactive()`：深层响应式对象；只能代理对象类型，不能解构（丢失响应性）
- `ref()`：基本类型响应式包装，模板中自动解包，JS 中需 `.value`
- `computed()`：只读计算属性 vs 可读写 `{ get, set }` 写法
- `watch` 的 source 三种形式：单个 ref / getter 函数 / 响应式对象；`watch` vs `watchEffect` 的基本用法
- `toRef` / `toRefs`：从响应式对象中取出单个属性并保持响应式连接

#### 二、原理
- Vue 2 响应式的三个历史遗留问题：新增属性检测不到、数组下标赋值检测不到、删除属性检测不到 —— Proxy 如何逐一解决
- Proxy 的 `get / set / deleteProperty / has / ownKeys` 拦截器；Reflect 配合使用的原因（保证 `this` 指向正确）
- `reactive()` 实现：`WeakMap` 缓存代理对象（避免重复代理 + 防止内存泄漏）+ 惰性递归代理（访问到嵌套对象时才代理，而非一次性深度遍历）
- `ref()` 实现：为什么基本类型需要包装成对象——闭包在类里维护 `_value`，`get value()` / `set value()` 触发依赖收集与派发更新；对象类型的 ref 内部调用 `reactive()`
- 响应式系统三件套完整链路：
  - `track`：`targetMap`（WeakMap）→ `depsMap`（Map）→ `dep`（Set）三层结构存储依赖
  - `trigger`：从 `targetMap` 找到对应 `dep`，遍历执行 effect
  - `effect`：`activeEffect` 全局变量 + 副作用函数栈，处理嵌套 effect
- `computed()`：惰性求值 + `dirty` 脏标记；依赖的响应式数据变化时只标记 dirty，真正取值时才重新计算
- `watch` vs `watchEffect` 依赖收集时机的差异：`watchEffect` 立即执行并自动收集依赖，`watch` 显式声明依赖源，惰性执行
- `toRef` / `toRefs` 的实现：通过 `get/set` 代理转发到源对象的属性，而非拷贝值
- Collection 类型响应式（`Map/Set/WeakMap/WeakSet`）：无法用 `baseHandlers` 的 `get/set` 拦截器处理（方法调用而非属性访问），需要单独的 `collectionHandlers` 拦截 `.get/.set/.add/.delete/.forEach` 等方法并在内部手动 `track/trigger`——这是 Vue 2 完全无法解决、Proxy 才补上的第四类历史遗留问题
- `effectScope`（3.2+）：批量收集一组 effect（ref/computed/watch）以便统一暂停/恢复/销毁，无需手动逐个清理；`scope.run(fn)` 内创建的所有响应式副作用都会被收集到该 scope，`scope.stop()` 一次性停止；Pinia 的每个 Store 实例、组件卸载时清理内部 watcher，底层都依赖它

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. `reactive`：`packages/reactivity/src/reactive.ts`（`WeakMap` 缓存 + `createReactiveObject`）
2. `baseHandlers`：`packages/reactivity/src/baseHandlers.ts`（get/set/deleteProperty/has/ownKeys 五个拦截器）
3. `ref`：`packages/reactivity/src/ref.ts`（`RefImpl` 类 + `toReactive` 处理对象类型）
4. 依赖收集与派发：`packages/reactivity/src/effect.ts`（`track` / `trigger` / `ReactiveEffect`）
5. `computed`：`packages/reactivity/src/computed.ts`（`ComputedRefImpl` 的 `_dirty` 标记）
6. Collection 类型代理：`packages/reactivity/src/collectionHandlers.ts`（`Map/Set` 的 `get/set/add/delete/forEach` 方法重写）
7. `effectScope`：`packages/reactivity/src/effectScope.ts`（`EffectScope` 类 + `scope.run` / `scope.stop`）

#### 四、生产级最佳实践
- `reactive()` 解构丢失响应性的坑：用 `toRefs()` 解构，或直接用 `.value` 访问 ref
- `shallowReactive` / `shallowRef`：大型只读数据（药品目录、ICD 码表）避免深层递归代理开销
- `computed` 的 getter 必须无副作用：避免在 computed 中修改其他响应式数据导致循环依赖
- `watch` 的 `immediate` + `deep` 选项的性能代价：deep watch 会递归遍历整个对象，大对象慎用
- `markRaw`：明确标记不需要响应式化的数据（如第三方库实例、大型静态配置）
- Collection 类型响应式的实战场景：医疗场景用 `reactive(new Map())` 维护科室 → 医生列表的索引缓存，比数组 `find` 查找性能更优，且天然响应式

#### 五、手写实现（可独立跑通）
医疗场景：Vite + TypeScript 搭建环境，手写极简响应式系统（Proxy + Reflect + track/trigger + effect + ref + computed）；患者信息表单实时响应式校验完整代码

#### 六、手写实现源码 GitHub 地址
- https://github.com/lotosv2010/g-vue-next


#### 七、参考
- https://cn.vuejs.org/guide/extras/reactivity-in-depth.html
- https://jonny-wei.github.io/blog/vue/vue3/reactivity.html
- https://github.com/wbccb/

**面试核心问**：
- Proxy 相比 defineProperty 解决了哪些问题？为什么必须配合 Reflect 使用？
- `ref` 和 `reactive` 的区别？为什么基本类型需要 `.value`？
- `computed` 的缓存是怎么实现的？`dirty` 标记的作用是什么？
- `track` / `trigger` 的三层依赖存储结构是什么样的？
- `watch` 和 `watchEffect` 依赖收集时机有什么区别？
- 响应式系统是如何支持 `Map/Set` 的？和普通对象的代理方式有什么不同？
- `effectScope` 解决了什么问题？和手动逐个清理 effect 相比有什么优势？


## 分析角度（每个子主题都按此展开）

A · 实操五段式（适用于有「手写内核」的篇章）

是什么 → 核心原理 → 手写实现（关键代码） → 生产级最佳实践 → 完整最佳实践代码

B · 概念四段式（适用于概念/架构/方法论篇章）

真实场景引入 → 概念/机制拆解 → 决策矩阵或对比表 → 行动清单

## 已有笔记

- @docs/notes/06 vue 3/04 响应式原理-实现reactive.md
- @docs/notes/06 vue 3/05 响应式原理-实现effect.md
- @docs/notes/06 vue 3/06 响应式原理-实现ref.md
- @docs/notes/06 vue 3/07 响应式原理-实现toRefs.md
- @docs/notes/06 vue 3/08 响应式原理-实现computed.md
- @docs/notes/06 vue 3/09 响应式原理-实现watch.md
- @docs/notes/06 vue 3/10 响应式原理-实现watchEffect.md

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
，注意⚠️：保留笔记完整代码和图片，样式格式保持一致和这篇@docs/articles/05 vue 2/2026-08-18-vue2-vuex.md，不读我没要求到的文件；可以根据你的经验和最佳实践查漏补缺；主线要明确清晰，不要遗漏源码解析章节；每个知识点都要由浅入深的彻底讲透，讲明白。
```
