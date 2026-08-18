# prompt

```text
/publish 下面我们规划Vue2全家桶的第13篇文章，具体如下：
{{
## 知识点范围

### 标题

- Vue 2 单元测试实战

**副标题**：组件测试不是 snapshot，是「用户行为驱动」的测试

#### 一、基本使用
- Jest 基础：describe / it / expect / beforeEach / afterEach
- Vue Test Utils 核心 API：mount / shallowMount / wrapper
- 模拟用户操作：trigger('click') / setValue / wrapper.find / wrapper.findComponent
- 异步测试：await nextTick / flushPromises / jest.useFakeTimers
- 快照测试：toMatchSnapshot 的使用与更新

#### 二、原理
- 为什么 Vue 项目单测覆盖率普遍低：难 mock / 难隔离 / 难断言
- shallowMount vs mount：子组件 stub 的意义；何时用 shallowMount（隔离子组件）/ 何时用 mount（集成测试）
- JSDOM：Node.js 环境模拟浏览器 DOM 的原理；与真实浏览器的差异
- 快照测试的本质：序列化 VNode 树做字符串对比；适合纯展示组件，不适合频繁变化的交互组件
- `wrapper.vm.$nextTick`：DOM 更新后再断言的必要性
- `flushPromises`：清空所有 pending 的 Promise（含异步组件加载）

#### 三、源码解析（重点代码，来源 GitHub 仓库）
1. Jest + @vue/test-utils 环境搭建：jest.config.js transform / moduleNameMapper / testEnvironment
2. shallowMount stub 原理：@vue/test-utils src/create-instance.js
3. wrapper.trigger 事件模拟：@vue/test-utils src/wrapper.js
4. axios-mock-adapter 网络请求 mock
5. createLocalVue + Vuex store mock 隔离测试

#### 四、生产级最佳实践
- 测什么：用户行为（点击/输入/提交）+ 状态变化 + 边界条件 + 错误状态
- 不测什么：实现细节 / 第三方库内部 / 纯 UI 样式 / 框架本身行为
- 快照测试的适用场景（稳定的纯展示组件）与滥用风险（频繁 snapshot 更新失去意义）
- CI 接入：Jest coverage + GitHub Actions 门禁（coverage 低于阈值 fail）
- 测试 mixin：createLocalVue + mixin 注入后验证行为
- 医疗场景实战：处方单组件的完整测试套件（提交 / 验证 / 加载状态 / 错误处理）


#### 七、参考
- https://vue-test-utils.vuejs.org/zh/

**面试核心问**：
- mount 和 shallowMount 的区别？什么时候选哪个？
- 如何测试 Vuex action 触发后的组件状态变化？
- 快照测试的优缺点？什么场景下不适合用快照？
- 异步操作（如 API 请求）在测试中怎么处理？flushPromises 和 nextTick 的区别？


## 分析角度（每个子主题都按此展开）

A · 实操五段式（适用于有「手写内核」的篇章）

是什么 → 核心原理 → 手写实现（关键代码） → 生产级最佳实践 → 完整最佳实践代码

B · 概念四段式（适用于概念/架构/方法论篇章）

真实场景引入 → 概念/机制拆解 → 决策矩阵或对比表 → 行动清单

## 已有笔记

- @docs/notes/05 vue 2/08 测试-概述.md
- @docs/notes/05 vue 2/09  测试-Jest.md
- @docs/notes/05 vue 2/10  测试-Jest & Vue.md
- @docs/notes/05 vue 2/11  测试-Jest & VueRouter.md
- @docs/notes/05 vue 2/12  测试-Jest & Vuex.md

## plans 地址

- @docs/plans/vue2-family-series-outline.md

## 规则

- 先阅读以上笔记，找出缺失或浅尝辄止的知识点
- 笔记只关注 @docs/notes/vue2 目录下的，其他目录禁止自行读取
- 补全内容（保留原有内容，只增不删），保留图片
- 将整理后的内容生成公众号文章，输出到 docs/articles/vue-2
- 文章结构：先出大纲等我确认，再逐节写作
}}
，保留笔记完整代码和图片，样式格式保持一致和这篇@docs/articles/05 vue 2/2026-08-18-vue2-vuex.md，不读我没要求到的文件；可以根据你的经验和最佳实践查漏补缺；主线要明确清晰，不要遗漏源码解析章节；每个知识点都要由浅入深的彻底讲透，讲明白。
```
