# prompt

```text
/publish 下面我们规划Vue3全家桶的第5篇文章，具体如下：
{{
## 知识点范围

### 标题（控制在 64个字以内，以（面试收藏级）结尾）

- Vue 3 Composition API 深度拆解

**副标题**：slots/emit/lifecycle/ref/provide-inject，组合式 API 底层怎么串起来的？

#### 一、基本使用
- `defineProps` / `defineEmits`：组件对外接口声明
- `defineModel`（3.4+）：组件双向绑定的编译时宏，替代手写 `props: ['modelValue'] + emit('update:modelValue', ...)` 的样板代码
- 插槽在 setup 中的访问：`context.slots` / `useSlots()`
- 生命周期钩子：`onMounted / onUpdated / onUnmounted` 等与 Options API 的映射关系
- 模板引用：`const el = ref(null)` 绑定 DOM 元素或子组件实例
- `provide` / `inject`：跨层级依赖注入的组合式写法
- Composables 设计模式：`use` 前缀命名约定，封装可复用的有状态逻辑

#### 二、原理
- `emit` 实现：编译时将 `emits` 选项与组件事件系统关联，`instance.emit` 调用时从 `vnode.props` 中找到对应的 `onXxx` 处理函数并执行
- `slots` 实现：父组件编译生成插槽函数对象存入 `vnode.children`，子组件通过 `instance.slots` 访问，调用时执行函数生成 VNode（对比 Vue 2 作用域插槽的编译产物，思路一致但统一了普通/作用域插槽）
- 生命周期钩子实现：`onMounted` 等函数将回调 push 到 `instance` 对应的钩子数组（如 `instance.m`），组件生命周期流程中按序 `invokeArrayFns` 调用；必须在 `setup` 同步执行期间调用（依赖 `currentInstance` 全局变量）
- 组合式 `ref`：模板引用如何在 `patch` 过程中通过 `ref` VNode 属性设置到 setup 返回的 ref 变量上
- `provide` / `inject` 实现：`instance.provides` 以原型链方式继承父组件的 provides 对象（避免深拷贝，天然实现层级覆盖）；`inject` 沿 `parent.provides` 原型链向上查找
- Composable 函数：本质是在 `setup()` 同步调用期间执行的普通函数，闭包持有响应式状态；能调用 `onMounted` 等生命周期 API 的原因是仍处于同一个 `currentInstance` 上下文
- Composable 参数响应式：接受 `ref` 或普通值，用 `toValue()` 统一处理（Vue 3.3+）
- 与 React Hooks 的本质区别：Vue Composable 无调用顺序限制（不依赖调用顺序做状态对应，而是闭包直接持有响应式引用）
- `defineModel` 编译原理：本质是 `defineProps` + `defineEmits` 的语法糖，编译时展开为声明一个 `modelValue` prop 并返回一个读写 `ref`——写这个 ref（`model.value = xxx`）会自动编译为 `emit('update:modelValue', xxx)`，因此组件内可以像操作本地 ref 一样操作父组件传入的值（与第 07 篇编译器宏擦除机制呼应）

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. `emit` 实现：`packages/runtime-core/src/componentEmits.ts`
2. `slots` 初始化：`packages/runtime-core/src/componentSlots.ts` `initSlots` / `updateSlots`
3. 生命周期钩子：`packages/runtime-core/src/apiLifecycle.ts`（`createHook` 工厂函数）
4. 模板引用设置：`packages/runtime-core/src/rendererTemplateRef.ts`
5. `provide` / `inject`：`packages/runtime-core/src/apiInject.ts`（原型链继承 provides）
6. `defineModel` 编译：`packages/compiler-sfc/src/script/defineModel.ts`

#### 四、生产级最佳实践
- Composable 命名约定与返回值设计：返回响应式状态 + 方法，命名前缀 `use`
- 有副作用的 Composable：在内部自动注册 `onUnmounted` 清理（定时器、事件监听、WebSocket）
- Composable 组合调用链：`usePrescription` 内部组合 `usePatientSearch` + `useDrugInventory`
- provide/inject 保持响应式：传入 `reactive` 对象或 `ref`，而非普通值
- Composable 的测试策略：`withSetup` 辅助函数模拟组件上下文进行单测
- `defineModel` 实战：医疗场景「药品数量选择器」组件用 `const count = defineModel<number>()` 替代手写 `props.modelValue + emit('update:modelValue')`；配合 `defineModel('visible', { default: false })` 实现多个 `v-model` 绑定（如弹窗同时绑定 `v-model:visible` 和 `v-model:selectedDrug`）
- Composable 的类型设计取舍：参数类型 + 返回类型显式声明 vs 依赖 TypeScript 自动推断——公共 Composable（跨模块复用）建议显式声明返回类型接口，方便调用方查阅；内部私有 Composable 可依赖自动推断减少维护成本；返回联合类型的 ref（如 `Ref<Drug | null>`）在使用处需要类型收窄（`if (drug.value)` 或类型断言）才能安全访问属性

#### 五、手写实现（可独立跑通）
医疗场景：Vite + TypeScript 搭建环境，手写 emit + slots + 生命周期钩子系统 + provide/inject；`usePatientSearch` + `useDrugInventory` + `usePrescription` 三个业务 Composable 组合调用完整演示


#### 六、手写实现源码 GitHub 地址
- https://github.com/lotosv2010/g-vue-next


#### 七、参考
- https://cn.vuejs.org/guide/extras/reactivity-in-depth.html
- https://cn.vuejs.org/guide/reusability/composables.html
- https://cn.vuejs.org/guide/extras/composition-api-faq.html
- https://cn.vuejs.org/guide/typescript/composition-api.html
- https://jonny-wei.github.io/blog/vue/vue3/components.html
- https://github.com/wbccb/

**面试核心问**：
- `$emit` 在 Composition API 中的实现原理是什么？和 Vue 2 的 `vm._events` 有何不同？
- 作用域插槽和普通插槽在 Vue 3 中的编译产物有何统一？
- `onMounted` 等钩子为什么必须在 `setup` 同步代码中调用？
- provide/inject 底层为什么用原型链实现？有什么好处？
- Composable 和 React 自定义 Hook 的本质区别是什么？为什么 Vue 没有调用顺序限制？
- `defineModel` 是如何替代手写 `modelValue` + `update:modelValue` 的？底层编译产物是什么样的？


## 分析角度（每个子主题都按此展开）

A · 实操五段式（适用于有「手写内核」的篇章）

是什么 → 核心原理 → 手写实现（关键代码） → 生产级最佳实践 → 完整最佳实践代码

B · 概念四段式（适用于概念/架构/方法论篇章）

真实场景引入 → 概念/机制拆解 → 决策矩阵或对比表 → 行动清单

## 已有笔记

- @docs/notes/06 vue 3/14 组件渲染原理-实现Text节点渲染.md
- @docs/notes/06 vue 3/15 组件渲染原理-实现Comment节点渲染.md
- @docs/notes/06 vue 3/16 组件渲染原理-实现Fragment节点渲染.md
- @docs/notes/06 vue 3/17 组件渲染原理-实现组件渲染.md
- @docs/notes/06 vue 3/18 组件渲染原理-实现setup.md
- @docs/notes/06 vue 3/19 组件渲染原理-实现slots.md
- @docs/notes/06 vue 3/20 组件渲染原理-实现emit.md
- @docs/notes/06 vue 3/21 组件渲染原理-实现lifecycle.md
- @docs/notes/06 vue 3/22 组件渲染原理-实现ref.md
- @docs/notes/06 vue 3/23 组件渲染原理-实现函数式组件.md
- @docs/notes/06 vue 3/24 组件渲染原理-实现provide 和 inject.md

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
，注意⚠️：保留笔记完整代码和图片，样式格式保持一致和这篇@docs/articles/06 vue 3/2026-08-21-vue3-component-render.md，不读我没要求到的文件；可以根据你的经验和最佳实践查漏补缺；主线要明确清晰，不要遗漏源码解析章节；每个知识点都要由浅入深的彻底讲透，讲明白。vue 3系列的文章中每一篇的知识点讲解中都需要对比 vue 2中对应的知识点，讲清楚问什么要这样设计。手写实现，环境搭建已经再第一篇完了，这里直接接着上一遍和笔记中的手写实现的代码。手写源码仓库和参考只保留url。
```
