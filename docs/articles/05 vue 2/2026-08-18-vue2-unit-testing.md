# Vue 2 单元测试实战：组件测试不是 snapshot，是「用户行为驱动」的测试（面试收藏级）

面试官微笑着问：「你们项目的单测覆盖率是多少？」

沉默。

前端项目单测覆盖率低，几乎是行业默认的痛点。原因不是大家不懂 Jest，而是不知道 **Vue 组件该怎么测**、测什么是有价值的、测什么是在浪费时间。

这篇文章把 Vue 2 单元测试体系从头捋一遍：从 Jest 基础到 Vue Test Utils，从异步处理到 VueRouter/Vuex 集成测试，最后落地一套医疗场景的处方单组件完整测试套件。读完之后你会知道，组件测试的核心不是覆盖率数字，而是**模拟用户行为，验证组件是否如预期响应**。

---

## 🧩 一、为什么要写前端自动化测试

### 三层测试金字塔

前端自动化测试分三个层次：

```
         /‾‾‾‾‾‾‾‾‾‾\
        /   E2E 测试   \      少量、慢、成本高
       /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
      /    集成测试       \    中量、中速
     /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
    /       单元测试         \  大量、快、成本低
   /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
```

- **单元测试**：测试最小独立单元（一个函数、一个组件），快但无法保证整体流程。
- **集成测试**：测试多个模块协同工作，覆盖率相对低，但能保证功能正常跑通。
- **E2E 测试**：模拟真实用户操作整个应用，成本最高，通常用 Cypress 或 Playwright。

**一般业务逻辑用集成测试（BDD 方式），工具方法用单元测试（TDD 方式）**。

### TDD 与 BDD

- **TDD（测试驱动开发）**：先写测试，再写实现。测试就是需求文档，逼着你一开始就想清楚输入输出。当实现足够简单时，也可以先实现后补测试（「测试辅助开发」）。
- **BDD（行为驱动开发）**：站在用户视角描述「应该发生什么」，本质是对 TDD 的补充，用来指导测试的**组织方式**——用 `describe` 描述行为，用 `it` 描述具体场景。

> 💬 **面试官**：为什么前端团队普遍不爱写单测？
>
> ✅ **标准答案**：一是觉得写单测慢，短期看不到收益；二是不会测组件，把「渲染结果对比」当成单测，改一行样式就要改断言，维护成本高，于是放弃。
>
> 🎁 **加分答案**：收益高的测试集中在**项目里稳定不变的核心业务逻辑**（如处方的总价与医保费用核算、给药次数换算），高频变化的部分（如 UI 细节、文案）不写或弱化测试。单测的价值是「改一个工具函数后，npm test 能秒级告诉你有没有改坏其他地方」，这一价值只在核心逻辑里最显著。**

---

## 🚀 二、Jest 基础：从第一个用例到控制器

Jest 是零配置的测试框架，自带断言、mock、覆盖率、快照等全套能力。先在 `jest.config.js` 里配置测试环境：

```js
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',        // 用 JSDOM 模拟浏览器 DOM
  moduleFileExtensions: ['js', 'json', 'vue'],
  testMatch: ['**/*.spec.js'],     // 匹配以 .spec.js 结尾的测试文件
  transform: {
    '^.+\\.vue$': 'vue-jest',      // 让 Jest 能解析 .vue 单文件组件
    '^.+\\.js$': 'babel-jest',
  },
}
```

### 第一个用例：三段式结构

Jest 用全局函数组织测试，最常见的「三段式」是 `describe` → `it` → `expect`：

```js
const { sum } = require('./calc')

describe('calc 工具函数', () => {
  it('相加两数得到正确结果', () => {
    expect(sum(1, 2)).toBe(3)
  })

  it('相加负数同样正确', () => {
    expect(sum(-1, -2)).toBe(-3)
  })
})
```

- `describe`：把相关用例分组，非必须但强烈建议（分组 = BDD 的描述单位）。
- `it / test`：一个用例，第一个参数是行为描述。
- `expect`：匹配器，断言结果。

### 断言匹配器（Matcher）

| 分类 | 匹配器 | 说明 |
|------|--------|------|
| 相等 | `toBe` / `toEqual` / `toStrictEqual` | `toBe` 用 `Object.is`，适合基本类型与引用；`toEqual` 递归比较对象属性；`toStrictEqual` 更严格，会校验原型、undefined 属性 |
| 真值 | `toBeTruthy` / `toBeFalsy` / `toBeNull` / `toBeDefined` / `toBeUndefined` / `toBeNaN` | 判断各种 null/false/0/NaN/空串 的取值 |
| 包含 | `toContain` / `toContainEqual` | 检查数组、可迭代对象或字符串是否包含某项 |
| 数字 | `toBeGreaterThan` / `toBeLessThan` / `toBeCloseTo` | 注意小数用 `toBeCloseTo` 避免浮点误差 |
| 正则 | `toMatch` | 检查字符串匹配正则 |

```js
describe('处方总价计算', () => {
  it('计算多种药品的组合价格', () => {
    // 对象比较用 toEqual
    expect(calcPrescriptionPrice([
      { price: 10.5, count: 2 },
      { price: 3.2, count: 3 },
    ])).toEqual({ total: 30.6, insuredCover: 21.0 })

    // 浮点数精度敏感时用 toBeCloseTo
    expect(0.1 + 0.2).toBeCloseTo(0.3)
  })

  it('返回的错误信息包含关键词', () => {
    expect(validatePrescription({})).toMatch(/药品不能为空/)
  })
})
```

### 生命周期钩子

Jest 提供四个 Hook，控制用例的「准备」和「清理」：

```js
describe('处方库存检查', () => {
  beforeAll(() => {
    // 所有用例执行前，只跑一次：连接数据库、读配置文件
  })

  beforeEach(() => {
    // 每个用例执行前都跑：重置 mock、初始化数据
  })

  afterEach(() => {
    // 每个用例执行后都跑：清理副作用
  })

  afterAll(() => {
    // 所有用例执行后，只跑一次：断开连接
  })
})
```

**关键原则**：每个用例应**相互独立**，不共享状态。`beforeEach` 里重置全局 mock 是防止用例间相互污染的关键。

---

## ⚙️ 三、Jest 进阶：异步与 mock

### 异步测试的三种写法

前端一大半代码是异步的（接口请求、定时器）。Jest 处理异步有三种方式：

```js
// 方式一：done 回调（最原始）
it('异步获取药品列表（done 方式）', (done) => {
  fetchDrugList().then((list) => {
    expect(list.length).toBeGreaterThan(0)
    done()  // ⚠️ 必须调用 done，否则 Jest 永远等不到用例结束
  })
})

// 方式二：直接 return Promise
it('异步获取药品列表（return Promise 方式）', () => {
  return fetchDrugList().then((list) => {
    expect(list.length).toBeGreaterThan(0)
  })
})

// 方式三：async / await（推荐，最清晰）
it('异步获取药品列表（async 方式）', async () => {
  const list = await fetchDrugList()
  expect(list.length).toBeGreaterThan(0)
})
```

**注意**：`async` 方式的用例，一旦异步回调里抛异常，Jest 能自动捕获并判失败；用 `done` 方式时如果异常发生在 `done()` 之后，可能测出「假通过」。所以优先用 `async/await`。

### jest.fn：追踪函数调用

`jest.fn()` 创建一个可追踪的 mock 函数，能断言「有没有被调用、调用了几次、用什么参数调用」：

```js
const mockFn = jest.fn()

mockFn('apple', 3)
mockFn('banana')

expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledTimes(2)
expect(mockFn).toHaveBeenCalledWith('apple', 3)     // 检查某次调用
expect(mockFn.lastCall[0]).toBe('banana')           // 检查最后一次调用的第一个参数
```

还可以直接给 mock 函数指定返回值：

```js
const mockFn = jest.fn().mockReturnValue(true)
// 或 mockReturnValueOnce 只在第一次调用时返回指定值，用于分支测试
```

### jest.mock：替换整个模块

当代码里 `require` 三方依赖（如 axios）时，真正用 axios 发请求又慢又依赖网络。用 `jest.mock` 把它换成本地假实现：

```js
import axios from 'axios'

// 关键：mock 放在文件顶层，Jest 会先于代码执行
jest.mock('axios')

it('获取药品详情成功', async () => {
  // axios.get 已经是 jest.fn，指定它"成功返回"
  axios.get.mockResolvedValue({ data: { name: '阿莫西林', stock: 100 } })

  const detail = await fetchDrugDetail('DRUG-001')
  expect(detail.name).toBe('阿莫西林')
})
```

也可以把 mock 实现抽到 `__mocks__` 目录，多个测试文件复用：

```
src/
└── __mocks__/
    └── axios.js      ← 与真实 axios 目录同名对齐的假模块
```

### jest.useFakeTimers：控制定时器

组件里常有用 `setTimeout` 做防抖、倒计时的逻辑。真实计时等着慢，用假定时器手动推进：

```js
jest.useFakeTimers()  // 用假定时器替代真实 setInterval/setTimeout

it('倒计时 60 秒后自动归零', () => {
  // 场景：发验证码按钮，60 秒内禁用

  // 快速前进 60 秒
  jest.runAllTimers()
  // 或只前进指定毫秒数，用于触发中途的定时器：
  // jest.advanceTimersByTime(60000)
  // 或只执行处于等待中的定时器：
  // jest.runOnlyPendingTimers()

  expect(btnDisabled).toBe(true)
})
```

> 💬 **面试官**：真实定时器和假定时器测出来的结果一样吗？
>
> ✅ **标准答案**：逻辑一致，但假定时器更快、更可控、不依赖真实时间流逝，能稳定测出「n 毫秒后应该发生什么」。
>
> 🎁 **加分答案**：注意 `jest.useFakeTimers()` 的调用时机——组件里有基于真实时间的逻辑（如 `Date.now`）时，假定时器不会自动 mock `Date`，需要额外用 `jest.setSystemTime` 固定时间点，否则日期断言会不稳定。**

---

## 🧩 四、Vue Test Utils：mount 与 shallowMount

Vue Test Utils 是官方测试工具库，核心 API 围绕 `wrapper`（包装器）展开。先讲它最核心的两个挂载方式。

### mount 与 shallowMount 的区别

测试中「把一个组件挂载起来」的方式有两种，对应不同的测试策略：

```js
import { mount, shallowMount } from '@vue/test-utils'
import PrescriptionForm from '@/components/PrescriptionForm.vue'

// mount：深渲染。子组件也会被真实渲染，占资源
const wrapper = mount(PrescriptionForm)

// shallowMount：浅渲染。子组件被替换成"骨架占位"（stub），不渲染子组件内部
const wrapper = shallowMount(PrescriptionForm)
```

| | `mount` | `shallowMount` |
|---|---|---|
| 子组件 | 真实渲染 | 用占位 stub 替换 |
| 资源占用 | 高 | 低 |
| 适用 | 集成测试、验证父子交互 | 单元测试：专注当前组件自身逻辑 |
| 类比 | 完整的菜（含配菜） | 只看主菜本身 |

**组件测试的默认姿势是 `shallowMount`**：你只想测当前组件，不想让它的子组件（比如里面嵌套的药品卡片、弹窗）拖慢速度或引入自己的 bug。

### wrapper 的常用 API

挂载后返回的 `wrapper` 提供一系列查询和操作接口：

```js
// 查找
wrapper.find('.btn-submit')          // 查找选择器匹配的第一个元素
wrapper.findComponent(DrugCard)      // 查找指定的子组件
wrapper.find('.prescription-list li')  // CSS 选择器
wrapper.findAll('.drug-item')        // 查找到所有匹配元素，返回数组

// 读取
wrapper.text()                        // 组件渲染的文本
wrapper.html()                        // 组件完整 HTML

// 触发与设置
wrapper.trigger('click')              // 触发事件
wrapper.setValue('阿莫西林')           // 给 input/textarea/select 设置值并触发 input 事件
wrapper.setData({ isLoading: true })  // 直接修改组件数据（测试用）
wrapper.setProps({ disabled: true })  // 修改传入的 props
```

### Todo 应用 TDD 实战

用一个极简的 Todo（患者待办清单）演示 TDD 流程：**先写测试，再写实现**。

```js
// todo.spec.js
import { shallowMount } from '@vue/test-utils'
import TodoList from '@/components/TodoList.vue'

describe('TodoList 组件', () => {
  it('初始渲染时不显示任何待办', () => {
    const wrapper = shallowMount(TodoList)
    expect(wrapper.findAll('.todo-item').length).toBe(0)
  })

  it('输入内容并回车后，新增一条待办', async () => {
    const wrapper = shallowMount(TodoList)

    // 在输入框写入内容，回车提交
    const input = wrapper.find('.todo-input')
    await input.setValue('给张三发复诊提醒')
    await input.trigger('keyup.enter')

    // 断言：多出一条待办，且输入框被清空
    expect(wrapper.findAll('.todo-item').length).toBe(1)
    expect(input.element.value).toBe('')
  })
})
```

这里的 `await` 很重要——`setValue`、`trigger` 触发后的 DOM 更新是异步的，不 await 会断言在被 Vue 更新之前执行，得出「看起来正确实则错误」的结果。

写完测试运行，先得到红色（失败），因为 `TodoList.vue` 还不存在。然后写最小实现：

```vue
<template>
  <div>
    <input class="todo-input" v-model="newTodo" @keyup.enter="addTodo" />
    <ul>
      <li class="todo-item" v-for="todo in todos" :key="todo.id">{{ todo }}</li>
    </ul>
  </div>
</template>

<script>
export default {
  data() {
    return { newTodo: '', todos: [] }
  },
  methods: {
    addTodo() {
      if (!this.newTodo.trim()) return
      this.todos.push(this.newTodo.trim())
      this.newTodo = ''
    },
  },
}
</script>
```

再跑一遍测试，绿色通过。**TDD 的好处是：测试驱动的实现通常是最小可用实现，避免了「为了未来需求过度设计」。**

> 💬 **面试官**：`trigger` 触发后为什么要 `await`？
>
> ✅ **标准答案**：Vue 的 DOM 更新是异步批量执行的，`trigger` 只是派发了事件，DOM 更新要等下一次 tick。不 `await`，断言会在更新前执行。
>
> 🎁 **加分答案**：`await trigger()` 内部等价于 `trigger()` 后紧跟 `await Vue.nextTick()`，`await wrapper.trigger(...)` 这种写法比手动调 `nextTick` 更安全——如果组件逻辑里还有 Promise 链（比如先调接口再更新），只 await 一次 nextTick 还不够，需要结合后面讲的 `flushPromises` 把整条微任务队列清空。**

---

## 🔄 五、异步测试与快照：组件测试的两大难点

组件测试两大难点：**异步状态更新** 和 **快照维护**。这一节逐个攻克。

### 难点一：模拟真实异步的 flushPromises

组件里最常见的模式是 `mounted` 里发请求，然后 `loading` 结束、渲染数据。测试要等接口「返回」、DOM 更新完成后才能断言。

`await nextTick()` 只能清空一次微任务；组件如果有多层 Promise（`$nextTick` 里面还包了 `await`），就需要把**整条微任务队列清空**。社区通用做法是 `flushPromises`：

```js
const flushPromises = () => new Promise((resolve) => setTimeout(resolve))

it('接口返回后渲染药品列表', async () => {
  const wrapper = shallowMount(PrescriptionList, {
    mocks: { api: { fetch: jest.fn().mockResolvedValue([user]) } },
  })

  // 等所有 pending 的 Promise（接口 + $nextTick）全部解决
  await flushPromises()

  expect(wrapper.text()).toContain('阿莫西林')
})
```

**回调风格对比**：当组件用 `$nextTick` 写法时，`watch` 或 `mounted` 里的异步回调分三种时序，分别对应 nextTick / setTimeout / flushPromises 三种等待策略。正确姿势是：能预估步数用 `await nextTick()`，异步链长或外部 mock 用 `flushPromises`。

> 💬 **面试官**：`flushPromises` 和 `$nextTick` 有什么区别？
>
> ✅ **标准答案**：`$nextTick` 只清空当前这一轮的微任务，`flushPromises` 通过等待一个 `setTimeout`，把排队中的整条微任务链（包括嵌套的 Promise）全部推完。
>
> 🎁 **加分答案**：真实组件里异步链往往不止一个 Promise：`接口 → 处理 → 渲染`。`flushPromises` 不关心中间有几层，一律推到干净，是组件测试异步断言最稳的兜底方式。**

### 难点二：快照测试 toMatchSnapshot

快照测试把组件渲染出的结构序列化成字符串，保存到快照文件；下次运行逐字符对比。

```js
it('处方卡片结构稳定', () => {
  const wrapper = shallowMount(PrescriptionCard, {
    propsData: { patient: { name: '李四', age: 45 } },
  })
  expect(wrapper).toMatchSnapshot()
})
```

首次运行会生成 `__snapshots__/` 目录下的快照文件。之后每次改动，Jest 会报告差异。

**快照测试的三个陷阱**：

1. **不要用快照测经常变化的东西**（动态时间、随机数、接口字段），否则天天更新快照，测试失去意义。正确做法是固定数据、或 `jest.mock` 掉随机源。
2. **快照文件要进 git**，是测试的一部分，别忽略。带着责任感更新它——更新快照前先确认差异是「真的改对了」而不是「改坏了」。
3. **结构快照 ≠ 行为测试**。快照只验证「长什么样」，不验证「交互后状态是否正确」。所以快照推荐配合断言一起用。

> 💬 **面试官**：快照测试是组件测试的主流吗？
>
> ✅ **标准答案**：不是主流，只是辅助。快照只能对比「渲染结构」，无法验证用户交互和业务逻辑。
>
> 🎁 **加分答案**：快照的价值在于**稳定组件的回归保护**——当你不小心改动了安全相关文案或布局约束时，快照第一时间报红。但对有意义的组件，核心断言必须落到 `text()`、`find()`、`trigger()` 之上，快照只是一个兜底。**

---

## 🎯 六、Jest + VueRouter / Vuex 的组件测试

真实组件几乎都依赖 Router 和 Vuex。直接 `shallowMount` 会报「找不到路由组件」「找不到 store」的错。这一节讲三种集成姿势。

### 情况一：处理 router-link / router-view

组件模板里用了 `<router-link>`、`<router-view>`，因为没装 Router 或没做全局注册，测试就崩。用 `stubs` 把它们「架空」：

```js
import { shallowMount } from '@vue/test-utils'

const wrapper = shallowMount(SomeComponent, {
  // 把全局注册的路由组件替换成空占位，避免解析失败
  stubs: ['router-link', 'router-view'],
})
```

### 情况二：处理 $route / $router

组件里通过 `this.$route.params`、`this.$router.push` 访问路由。用 `mocks` 注入假对象：

```js
const wrapper = shallowMount(PatientDetail, {
  mocks: {
    $route: { params: { id: 'PATIENT-001' } },  // 假路由参数
    $router: { push: jest.fn() },                // 假的跳转方法
  },
})

it('点击返回时跳转列表页', () => {
  const wrapper = shallowMount(PatientDetail, { mocks: { $router: { push: jest.fn() } } })
  wrapper.find('.btn-back').trigger('click')
  expect(wrapper.vm.$router.push).toHaveBeenCalledWith('/patients')
})
```

### 情况三：真实 Router 集成测试

要测「路由切换后是否正确渲染」，用 `createLocalVue` 创建独立的 Vue 构造器，挂上真实 Router：

```js
import { createLocalVue } from '@vue/test-utils'
import VueRouter from 'vue-router'
import RouterViewTest from '@/components/RouterViewTest.vue'

const localVue = createLocalVue()
localVue.use(VueRouter)

// 关键：每个测试实例化独立的路由器（而不是复用全局 Router），避免状态污染
const router = new VueRouter({
  routes: [{ path: '/', component: { template: '<div>首页</div>' } }],
})

it('路由跳转到目标页面', async () => {
  const wrapper = mount(RouterViewTest, { localVue, router })

  await router.push('/')        // 用 await 等待路由跳转完成
  expect(wrapper.text()).toContain('首页')
})
```

> **createLocalVue 的用意**：它创建独立于全局 `Vue` 的构造器，避免测试里 `Vue.use(VueRouter)`、`Vue.use(Vuex)` 污染到你项目真正的全局 Vue——尤其当你在给一个已经 `Vue.use(Router)` 的老项目补测试时，这条隔离是救命的。

### Vuex 的三种测试姿势（由小到大）

**姿势一：测 store 里的纯函数（最快）**

直接把 mutations / actions 导出来测，mock 掉 commit 和外部依赖：

```js
// store/modules/patient.js
export const mutations = {
  SET_PATIENT(state, patient) {
    state.currentPatient = patient
  },
}

// 测试
it('设置当前病人', () => {
  const state = {}
  mutations.SET_PATIENT(state, { name: '王五' })
  expect(state.currentPatient.name).toBe('王五')
})
```

**姿势二：测真实的 live vuex store**

`createLocalVue` + 自身实例化一个完整 Vuex.Store，跑真实的 mutation → state 链路：

```js
import Vuex from 'vuex'
const localVue = createLocalVue()
localVue.use(Vuex)

it('store 的 actions 能正确驱动 state', async () => {
  const store = new Vuex.Store({
    modules: {
      patient: patientModule,  // 用真实的 module
    },
  })
  await store.dispatch('patient/fetchPatient', 'PATIENT-002')
  expect(store.state.patient.currentPatient).toBeTruthy()
})
```

**姿势三：mock 整个 store 测组件（组件的世界）**

组件测试的目标是「组件」，不该真去跑 store。用假 state、假 actions 构造一个 store 对象直接注入：

```js
import Vuex from 'vuex'

const localVue = createLocalVue()
localVue.use(Vuex)

it('点击结账按钮，派发对应 action', async () => {
  const actions = { checkout: jest.fn() }  // mock 掉 action
  const store = new Vuex.Store({ state: {}, actions })

  const wrapper = mount(Checkout, { localVue, store })
  await wrapper.find('.btn-checkout').trigger('click')

  expect(actions.checkout).toHaveBeenCalled()
})
```

> 💬 **面试官**：组件测试里，Vuex 的 store 要不要用真实的？
>
> ✅ **标准答案**：组件测试用假 store（mock actions），把注意力锁在组件行为上；store 自身的逻辑单独用「姿势一」和「姿势二」去测。
>
> 🎁 **加分答案**：这体现「测试独立性」——组件不关心 store 内部怎么实现，只关心「我派发了这个 action」。mock 掉 action 后，测试速度更快、也更稳，因为 store 里任何 bug 都不会把你组件测试一起搞红。真实集成交给 E2E 或集成测试那一层。**

---

## 🛠️ 七、生产级最佳实践：测什么、不测什么

空谈理论没用，落到生产里最值钱的是「**哪些地方值得花时间测**」。

### 值得测的（优先级从高到低）

1. **核心业务逻辑 / 工具函数**：处方的价格核算、医保报销比例、用药次数换算、药品库存校验——这些是纯函数、稳定、结果明确，**性价比最高**。
2. **关键用户流程**：登录、下单、处方提交、支付回调。用集成测试覆盖核心路径，保证「流程不会断」。
3. **容易回归的边界条件**：金额为 0、库存不足、日期过期、空数组。边界 bug 是线上事故最大来源。
4. **组件对外行为**：props 变化 → 渲染变化、点击 → 事件派发。这才是组件测试该测的东西。

### 不值得测的（避免浪费）

- **纯 UI 细节**：某个 class 名是否叫 `.btn-sm`、padding 是 8px 还是 10px。改动频繁又无业务价值。
- **第三方库的行为**：axios 会不会抛错、date-fns 怎么格式化——你该测的是「你的代码如何响应」，不是库本身。
- **一个函数里每个分支都测到 100%**：过度的分支覆盖会逼你写很多「为了凑覆盖率而存在」的测试，得不偿失。

### 一个完整案例：处方单组件 TDD 全流程

把上面的知识点串成一个医疗场景的完整例子——诊断「处方单提交」组件的测试与实现：

```vue
<!-- PrescriptionForm.vue -->
<template>
  <form class="prescription-form" @submit.prevent="submit">
    <input class="drug-input" v-model="drug" placeholder="输入药品名称" />
    <input class="dose-input" v-model.number="dose" type="number" placeholder="每日用量(mg)" />
    <button class="btn-submit" :disabled="!isValid" type="submit">提交处方</button>
    <p v-if="error" class="error">{{ error }}</p>
  </form>
</template>

<script>
export default {
  name: 'PrescriptionForm',
  props: {
    patientId: { type: String, required: true },
  },
  data() {
    return { drug: '', dose: 0, error: '' }
  },
  computed: {
    isValid() {
      return this.drug.trim() !== '' && this.dose > 0
    },
  },
  methods: {
    async submit() {
      if (!this.isValid) return
      try {
        await this.$store.dispatch('prescription/submitPrescription', {
          patientId: this.patientId,
          drug: this.drug.trim(),
          dose: this.dose,
        })
        this.$router.push('/prescriptions/success')
      } catch (e) {
        this.error = '处方提交失败，请稍后重试'
      }
    },
  },
}
</script>
```

它的完整测试套件：

```js
import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import PrescriptionForm from '@/components/PrescriptionForm.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

const flushPromises = () => new Promise((resolve) => setTimeout(resolve))

describe('PrescriptionForm 处方提交组件', () => {
  let store
  let actions
  let wrapper

  // 每个用例前重建全新的 store 和 wrapper，杜绝状态泄漏
  beforeEach(() => {
    actions = { submitPrescription: jest.fn().mockResolvedValue(true) }
    const storeConfig = {
      state: {},
      actions,
    }
    store = new Vuex.Store(storeConfig)
    wrapper = shallowMount(PrescriptionForm, {
      localVue,
      store,
      propsData: { patientId: 'PATIENT-001' },
      mocks: { $router: { push: jest.fn() } },
    })
  })

  it('未填写药品或剂量时，按钮禁用', async () => {
    await wrapper.find('.dose-input').setValue(5)
    // 只填了剂量没填药品，应该禁用
    expect(wrapper.find('.btn-submit').attributes('disabled')).toBeTruthy()
  })

  it('填写药品和剂量后，按钮可用', async () => {
    await wrapper.find('.drug-input').setValue('阿莫西林')
    await wrapper.find('.dose-input').setValue(250)
    expect(wrapper.find('.btn-submit').attributes('disabled')).toBeFalsy()
  })

  it('点击提交后，正确派发 action 并跳转成功页', async () => {
    await wrapper.find('.drug-input').setValue('阿莫西林')
    await wrapper.find('.dose-input').setValue(250)
    await wrapper.find('.btn-submit').trigger('submit')

    expect(actions.submitPrescription).toHaveBeenCalledWith(expect.any(Object), {
      patientId: 'PATIENT-001',
      drug: '阿莫西林',
      dose: 250,
    })
    await flushPromises()
    expect(wrapper.vm.$router.push).toHaveBeenCalledWith('/prescriptions/success')
  })

  it('提交失败时显示错误提示', async () => {
    actions.submitPrescription = jest.fn().mockRejectedValue(new Error('失败'))
    await wrapper.find('.drug-input').setValue('阿莫西林')
    await wrapper.find('.dose-input').setValue(250)
    await wrapper.find('.btn-submit').trigger('submit')

    await flushPromises()
    expect(wrapper.find('.error').text()).toContain('提交失败')
  })
})
```

这个套件覆盖了真实生产里的关键动作：**交互驱动（setValue）→ 状态校验（按钮禁用）→ 通知外部（派发 action）→ 路由跳转 → 错误分支**。这才是组件测试该有的样子。

### CI 覆盖率门槛

生产级项目通常把覆盖率阈值写进 `jest.config.js`，不达标 CI 直接红：

```js
module.exports = {
  // 覆盖率收集范围（排除入口等无逻辑文件）
  collectCoverageFrom: [
    'src/**/*.{js,vue}',
    '!src/main.js',
    '!src/router/index.js',
  ],
  coverageDirectory: 'coverage',
  // 覆盖率门槛：四维任一不达 80% 就 fail
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
}
```

配合 GitHub Actions，每次 push 自动跑测试：

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm test -- --coverage   # 不达阈值则退出非 0，CI 标红
```

> 💬 **面试官**：覆盖率 100% 就代表测试写得好吗？
>
> ✅ **标准答案**：不。100% 覆盖率经常是「为了数字而写的测试」，比如一个 if-else 为了两个分支拆两个用例，但断言没有真正验证业务结果。
>
> 🎁 **加分答案**：除覆盖率外，要看**断言质量**——断言是否验证了真实业务行为（结果对不对），而不是只追求「每行代码都被执行过」。用「变异测试」的思路检查：把某句实现改成错误版本，看测试能不能抓到，抓得到的才是有效测试。**

---

## 📌 八、一张图总结（面试速记）

```
Vue 2 单元测试体系
─────────────────────────────
结构：describe → it → expect + 生命周期钩子

挂载：mount vs shallowMount
  └─ shallowMount 是组件单元测试默认姿势

异步：done / return Promise / async-await
  └─ 组件里用 flushPromises 清空整条微任务链

mock：
  ├─ jest.fn()        追踪/断言函数调用
  ├─ jest.mock()      替换整模块（axios → 假实现）
  └─ jest.useFakeTimers()  控制 setTimeout

集成：
  ├─ Router → createLocalVue + VueRouter / stubs / mocks.$route
  └─ Vuex   → 纯函数测 / live store 测 / mock store 测组件

生产最佳实践：
  ├─ 测核心业务逻辑 & 关键流程，不测 UI 细节 & 三方库
  ├─ TDD/BDD 指导组测试组织
  └─ 覆盖率门槛 + CI 自动跑，四维不低于 80%

一句话：组件测试 = 模拟用户行为（setValue/trigger），断言外部行为（渲染/事件/store/路由），而不是对比渲染快照。
```

---

## 💬 面试核心问集中演练

### Q1：vue 组件测试中和直接在浏览器里开发有什么不同？

Jest 环境用的是 **JSDOM**（Node 里模拟的伪浏览器）。它没有真实浏览器的渲染引擎、CSS、布局，只有一份 DOM API（`getElementById`、`addEventListener` 等）。这意味着：

- DOM 能查能改，但**看不到真实样式**（width、color 拿不到准确值）、没有动画、没有 scroll 事件坐标。
- 所以测试里查元素只能查「结构、属性、文本」，不能断言「视觉效果对不对」。
- 真实视觉和交互要用 E2E 测试（真实浏览器）兜底。

### Q2：`shallowMount` 和 `mount` 的区别是什么？分别用在什么场景？

`shallowMount` 把子组件替换成 stub，只测试当前组件自身逻辑，轻量快速、隔离性好，是**单元测试默认**；`mount` 真实渲染子组件，适合**集成测试**，验证父子组件协同，但更重、更易被子组件内的 bug 影响。

### Q3：异步测试里 `await nextTick()` 不够用怎么办？

组件异步链不止一层时（接口 → 处理 → 渲染，中间可能有多个 Promise 和 `$nextTick`），用 `flushPromises`（等待一个 macrotask 把微任务队列清空）或直接把 mock 的返回通过 `await` 链路推进。原则是：**断言前的等待量要覆盖整个异步链**。

### Q4：测试里要不要 mock 掉 axios？

要看测试目标。测**组件逻辑**时 mock 掉 axios（用 `jest.mock`），不发起真请求，快且稳；测**接口层**独立代码时则用真实请求或全局 mock 的网络层。电商/医药场景里接口调用属于"第三方边界"，一律 mock，避免测试被网络抖动打红。

### Q5：覆盖率怎么设才合理？

核心业务逻辑优先追求高覆盖（建议 80%+），纯 UI 和工具门槛低些。更关键的是「这里不测会不会出事」——宁可核心逻辑 100%，也别把时间耗在为无关紧要的模板分支凑覆盖率上。

---

## 📚 参考

https://vue-test-utils.vuejs.org/zh/
https://jestjs.io/zh-Hans/
https://v2.cn.vuejs.org/v2/guide/unit-testing.html
https://jestjs.io/docs/configuration

---

## 📝 留个问题

回到开头面试官那句「你们单测覆盖率是多少」。

如果你的回答是「我们的核心业务逻辑单测覆盖率 >80%，关键用户流程做了集成测试，UI 细节交给 E2E 兜底」——这是加分回答。但如果你能再补一句「不过我们的 VNode 是 Vue 2 的响应式实现，测试组件的 `data` 更新时机和 render 函数耦合很紧，有些场景 mock 起来挺别扭」——这个回答会让面试官眼前一亮，因为这说明你真的在**生产里踩过组件的深层坑**。

而提到 Vue 2 的响应式与 render 的深层绑定，那正是下一篇文章的主角——**Webpack + Vue 2 通用工程模板**，一起看看构建层如何把这个「别扭」的异步和响应式，变成团队默认的工程约束。

> 🔖 这是「Vue 2 全家桶深度拆解系列」第 13 篇。上一篇：[Vue 2 性能优化全攻略](2026-08-18-vue2-performance.md)；下一篇预告：**Webpack + Vue 2 通用工程模板**。
