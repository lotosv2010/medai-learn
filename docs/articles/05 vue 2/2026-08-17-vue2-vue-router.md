# Vue Router 原理与手写实现：Hash / History 模式 + 导航守卫 14 步全链路（面试收藏级）

> 面试官微笑着问：「`beforeRouteEnter` 里能拿到 `this` 吗？为什么？」你答不能——面试官继续追问：「那怎么访问组件实例？`next(vm => ...)` 底层是什么时候调用的？」再问：「导航守卫完整链路有几步，每步做了什么？」一道看似简单的 Vue Router 问题，背后藏着 Hash 监听、响应式路由对象、异步队列迭代器整套机制。这篇文章，把 Vue Router 从基础使用到手写源码全链路讲透：14 步守卫链路、`depth` 递归算法、`runQueue` 异步迭代器、响应式 `_route` 核心，一次讲清楚。

## 🧭 一、前端路由的本质：SPA 为什么不需要刷新页面

### 从 MPA 到 SPA 的路由演进

传统多页面应用（MPA）每次跳转都向服务端发请求，服务端返回新 HTML——URL 变了，页面全部重新加载。患者从「药品列表」跳「药品详情」，白屏 300ms 起步。

单页面应用（SPA）的核心思路是：**拦截 URL 变化，在浏览器端决定渲染哪个组件，不向服务端发请求**。这就是前端路由的本质。

实现前端路由有两种技术方案：

| 维度 | Hash 模式 | History 模式 |
|------|-----------|-------------|
| URL 形态 | `example.com/#/drug/123` | `example.com/drug/123` |
| 核心 API | `location.hash` + `hashchange` | `history.pushState()` + `popstate` |
| 服务端要求 | 无，`#` 后内容不发到服务端 | 需要 fallback，否则刷新 404 |
| SEO | 较差 | 友好 |
| 适用场景 | 内网系统、无 SEO 需求 | 面向公网、需要 SEO |

### vue-router 的四个核心角色

```
Vue.use(VueRouter)                    ← install：注入 $router / $route
         ↓
new VueRouter({ mode, routes })       ← Matcher：路由表 pathList + pathMap
         ↓
  HashHistory / BrowserHistory         ← History：监听 URL 变化，触发 transitionTo
         ↓
  <router-view> / <router-link>        ← 两个全局组件：负责渲染和跳转
```

> 💬 **面试官**：Hash 模式和 History 模式的根本区别是什么？
>
> ✅ 标准答案：Hash 模式用 `hashchange` 监听 `#` 后的变化，`#` 后的部分不会发送给服务器，无需服务端配合；History 模式用 `pushState/replaceState` 改变 URL，配合 `popstate` 监听，URL 是正常路径格式，但刷新时浏览器会向服务端请求该路径，需要配置 fallback 到 `index.html`。
>
> 🎁 加分答案：提到 `pushState` 改变 URL 不触发 `popstate`（只有浏览器前进/后退才触发），主动调用 `pushState` 后需要同时更新路由内部状态；Hash 的 `#!` 方案（AJAX crawling scheme）已被 Google 废弃。

## 🚀 二、快速起步：HTML + JavaScript 完整配置

### 安装与注册

```bash
npm install vue-router@3  # Vue 2 对应 vue-router 3.x
```

```javascript
// router/index.js
import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)  // 注册插件，内部调用 VueRouter.install(Vue)

const routes = [
  { path: '/', redirect: '/drug' },
  { path: '/drug', component: () => import('@/views/DrugList.vue') },
  { path: '/patient', component: () => import('@/views/PatientList.vue') },
  { path: '/prescription', component: () => import('@/views/Prescription.vue') },
]

const router = new VueRouter({
  mode: 'hash',  // 或 'history'
  routes
})

export default router
```

```javascript
// main.js
import Vue from 'vue'
import App from './App.vue'
import router from './router'

new Vue({
  router,    // 注入路由，所有组件可访问 this.$router 和 this.$route
  render: h => h(App)
}).$mount('#app')
```

### HTML 模板基础用法

```html
<!-- App.vue -->
<template>
  <div id="app">
    <!-- 导航栏 -->
    <nav>
      <router-link to="/drug">药品管理</router-link>
      <router-link to="/patient">患者档案</router-link>
      <router-link to="/prescription">处方记录</router-link>
    </nav>

    <!-- 路由出口：匹配的组件在这里渲染 -->
    <router-view></router-view>
  </div>
</template>
```

### router-link 的常用 prop

```html
<!-- tag：渲染为指定标签（默认 <a>） -->
<router-link to="/drug" tag="li">药品管理</router-link>

<!-- active-class：激活时添加的 class（默认 router-link-active） -->
<router-link to="/drug" active-class="nav-active">药品管理</router-link>

<!-- exact：精确匹配（默认包含匹配，访问 /drug/123 时 to="/drug" 也会激活） -->
<router-link to="/" exact>首页</router-link>

<!-- exact-active-class：精确激活时的 class -->
<router-link to="/drug" exact exact-active-class="nav-exact-active">药品管理</router-link>
```

**包含匹配 vs 精确匹配**：访问 `/drug/123` 时，`to="/drug"` 的链接会激活（包含匹配）；加了 `exact` 后不激活。首页 `/` 必须加 `exact`，否则任何路由都会激活它。

> 💬 **面试官**：`router-link` 的 `exact` 属性有什么作用？
>
> ✅ 标准答案：`exact` 开启精确匹配，只有当前路径完全等于 `to` 时才添加激活 class；不加 `exact` 时是包含匹配，访问 `/drug/123` 时 `to="/drug"` 的链接也会被激活。
>
> 🎁 加分答案：提到 `/` 路径必须加 `exact`，否则所有路由都包含根路径，导致首页链接永远高亮；`active-class` 和 `exact-active-class` 都可以在 `new VueRouter()` 的 `linkActiveClass` / `linkExactActiveClass` 选项中全局设置。

## 🔀 三、动态路由匹配：params / query / 组件复用陷阱

### params 动态路径参数

```javascript
const routes = [
  // 冒号开头的路径段是动态参数
  { path: '/drug/:id', component: DrugDetail },
  { path: '/patient/:patientId/prescription/:prescriptionId', component: PrescriptionDetail }
]
```

```javascript
// DrugDetail.vue 中访问参数
export default {
  created() {
    const drugId = this.$route.params.id  // 'aspirin-100'
    this.fetchDrugDetail(drugId)
  }
}
```

访问 `/drug/aspirin-100` 时，`this.$route.params` 为 `{ id: 'aspirin-100' }`。

可以在同一路由中定义多个动态段：

```javascript
// /patient/42/prescription/RX001
// $route.params = { patientId: '42', prescriptionId: 'RX001' }
{ path: '/patient/:patientId/prescription/:prescriptionId', component: PrescriptionDetail }
```

### query 查询参数

```javascript
// 编程式跳转带 query
this.$router.push({ path: '/drug', query: { category: 'antibiotic', page: '1' } })
// → URL: /drug?category=antibiotic&page=1

// 模板中
// <router-link :to="{ path: '/drug', query: { category: 'antibiotic' } }">

// 组件中读取
this.$route.query.category  // 'antibiotic'
this.$route.query.page      // '1'（注意：query 都是字符串类型）
```

### 组件复用陷阱：同路由不同 params 时 created 不触发

从 `/drug/1` 跳到 `/drug/2` 时，Vue 会**复用同一个 `DrugDetail` 组件实例**（避免销毁重建），`created` / `mounted` 不会重新执行。这导致药品 ID 变了但数据没刷新的 bug。

**解决方案一：watch `$route`**

```javascript
export default {
  watch: {
    '$route'(to, from) {
      if (to.params.id !== from.params.id) {
        this.fetchDrugDetail(to.params.id)
      }
    }
  }
}
```

**解决方案二：`beforeRouteUpdate` 组件内守卫**

```javascript
export default {
  beforeRouteUpdate(to, from, next) {
    this.fetchDrugDetail(to.params.id)
    next()
  }
}
```

**解决方案三：给路由加 key 强制重建**

```html
<!-- App.vue -->
<router-view :key="$route.fullPath"></router-view>
```

> 💬 **面试官**：从 `/drug/1` 跳到 `/drug/2`，组件的生命周期会重新执行吗？为什么？
>
> ✅ 标准答案：不会。两个路由匹配同一个组件，Vue Router 会复用组件实例，不触发生命周期钩子。应该用 `watch $route` 或 `beforeRouteUpdate` 响应参数变化。
>
> 🎁 加分答案：提到给 `<router-view>` 加 `:key="$route.fullPath"` 可以强制销毁重建（每次参数变化都是新实例），但性能开销更大，适合需要完全重置状态的场景（如从处方 A 切换到处方 B，希望完全初始化）。

## 🌲 四、嵌套路由：children 配置与多层 router-view

### children 嵌套配置

```javascript
const routes = [
  {
    path: '/patient/:id',
    component: PatientLayout,    // 布局组件，内部有 <router-view>
    children: [
      {
        path: '',                // /patient/:id → 重定向到 info
        redirect: 'info'
      },
      {
        path: 'info',            // /patient/:id/info
        component: PatientInfo
      },
      {
        path: 'prescription',    // /patient/:id/prescription
        component: PatientPrescription
      },
      {
        path: 'records',         // /patient/:id/records
        component: PatientRecords,
        children: [
          {
            path: ':year',       // /patient/:id/records/:year（三级嵌套）
            component: PatientRecordsByYear
          }
        ]
      }
    ]
  }
]
```

### router-view 的放置规则

每一级路由组件内部都需要放一个 `<router-view>`，才能渲染下一级的子路由组件：

```html
<!-- PatientLayout.vue：第一级路由的布局组件 -->
<template>
  <div class="patient-layout">
    <aside class="sidebar">
      <router-link :to="`/patient/${$route.params.id}/info`">基本信息</router-link>
      <router-link :to="`/patient/${$route.params.id}/prescription`">处方记录</router-link>
    </aside>
    <main>
      <!-- 第二级 router-view：渲染 children 中匹配的组件 -->
      <router-view></router-view>
    </main>
  </div>
</template>
```

```html
<!-- PatientRecords.vue：第二级组件，内部再嵌一级 -->
<template>
  <div class="records">
    <h2>就诊记录</h2>
    <!-- 第三级 router-view -->
    <router-view></router-view>
  </div>
</template>
```

`router-view` 的渲染深度由 `$route.matched` 数组决定——后面源码章节详解这个递归算法。

## 🏷️ 五、命名路由、重定向与别名

### 命名路由

```javascript
const routes = [
  {
    path: '/prescription/:id',
    name: 'PrescriptionDetail',    // 给路由起名字
    component: PrescriptionDetail
  }
]
```

```javascript
// 使用名称跳转，不用拼接 path 字符串（路径改了只需改配置）
this.$router.push({ name: 'PrescriptionDetail', params: { id: 'RX20241201' } })
```

命名路由的核心价值：**路径改了只需修改路由配置，业务代码里的跳转调用不用批量改**。

### redirect 三种写法

```javascript
const routes = [
  // 字符串：最简单
  { path: '/', redirect: '/drug' },

  // 对象：可以携带 params / query
  { path: '/home', redirect: { name: 'DrugList' } },

  // 函数：动态计算重定向目标（根据角色跳转不同页面）
  {
    path: '/dashboard',
    redirect: to => {
      const role = store.state.user.role
      if (role === 'doctor') return '/doctor-dashboard'
      if (role === 'nurse') return '/nurse-dashboard'
      return '/login'
    }
  }
]
```

### alias 别名

```javascript
const routes = [
  {
    path: '/drug-management',
    component: DrugList,
    alias: '/drugs'  // 访问 /drugs 等价于访问 /drug-management，但 URL 保持 /drugs
  }
]
```

`redirect` 会改变 URL，`alias` 不改变 URL——这是两者的核心区别。`redirect` 适合旧路径迁移，`alias` 适合提供短路径入口。

> 💬 **面试官**：`redirect` 和 `alias` 有什么区别？
>
> ✅ 标准答案：`redirect` 是跳转，URL 会变成目标路径；`alias` 是别名，访问别名路径时渲染目标组件但 URL 保持不变。
>
> 🎁 加分答案：提到 `redirect` 函数写法可以做动态重定向（如角色分流），是权限路由设计的常用手段；`alias` 常用于兼容旧 URL，让新路径和旧路径都能渲染同一组件。

## 🖼️ 六、命名视图：多个 router-view 同级

### 基础配置

```html
<!-- App.vue：同一级放多个命名 router-view -->
<router-view name="header"></router-view>
<router-view></router-view>            <!-- 等价于 name="default" -->
<router-view name="sidebar"></router-view>
```

```javascript
const routes = [
  {
    path: '/consultation',
    components: {           // 注意：是复数 components
      default: ConsultMain,
      header: ConsultHeader,
      sidebar: PatientSidebar
    }
  }
]
```

### 医疗场景：诊断页面布局

```javascript
// 诊断页面：左边患者信息、右边诊断详情、顶部独立标题栏
const routes = [
  {
    path: '/diagnosis/:caseId',
    components: {
      default: DiagnosisDetail,    // 主内容区：诊断详情
      sidebar: PatientInfoPanel,   // 左侧：患者信息
      header: DiagnosisHeader      // 顶部：病历号 + 科室信息
    }
  }
]
```

命名视图适合**同一路由需要同时渲染多个平行组件**的布局场景（侧边栏 + 主内容区 + 头部），不同于嵌套路由的父子关系。

## ✈️ 七、编程式导航：$router.push / replace / go

### 三种导航方法对比

```javascript
// push：跳转并向历史栈压入新记录（可后退）
this.$router.push('/drug/123')
this.$router.push({ path: '/drug/123' })
this.$router.push({ name: 'DrugDetail', params: { id: '123' } })
this.$router.push({ path: '/drug', query: { category: 'antibiotic' } })

// replace：跳转但替换当前历史记录（不可后退）
this.$router.replace('/login')

// go：历史记录前进/后退
this.$router.go(-1)    // 后退一步
this.$router.go(1)     // 前进一步
this.$router.back()    // 等价于 go(-1)
this.$router.forward() // 等价于 go(1)
```

### Promise 化与错误捕获

vue-router 3.1+ 的 `push` / `replace` 返回 Promise：

```javascript
// 捕获导航失败（如重复导航到当前路由）
this.$router.push('/drug').catch(err => {
  if (err.name !== 'NavigationDuplicated') {
    console.error('路由跳转失败', err)
  }
})

// async/await 写法
async toDetail(id) {
  try {
    await this.$router.push({ name: 'DrugDetail', params: { id } })
  } catch (err) {
    // 处理导航失败
  }
}
```

> 💬 **面试官**：`push` 和 `replace` 的区别是什么？什么时候用 `replace`？
>
> ✅ 标准答案：`push` 向历史栈压入新记录，用户可以后退；`replace` 替换当前历史记录，后退后不会回到当前页。登录成功跳首页、表单提交后跳结果页通常用 `replace`，避免用户后退后重复提交。
>
> 🎁 加分答案：提到 vue-router 3.x 对重复导航（`push` 到当前路由）会抛出 `NavigationDuplicated` 错误，3.1 之前是静默忽略，3.1+ 改为 Promise.reject；可以通过覆写 `VueRouter.prototype.push` 全局静默处理。

## 🎁 八、路由组件传参：props 解耦 $route

### 为什么要解耦

直接用 `this.$route.params.id` 的组件，**强依赖路由上下文**，无法作为普通组件复用，也难以单元测试。

```javascript
// 耦合写法（不推荐）
export default {
  created() {
    this.drugId = this.$route.params.id  // 耦合了路由
  }
}

// 解耦写法（通过 props 传入）
export default {
  props: ['id'],  // 像普通组件一样接收 prop
  created() {
    this.fetchDrug(this.id)
  }
}
```

### 三种 props 模式

```javascript
const routes = [
  // 布尔模式：将 route.params 自动映射为组件 props
  {
    path: '/drug/:id',
    component: DrugDetail,
    props: true
  },

  // 对象模式：传递静态 props（不依赖路由参数）
  {
    path: '/drug-info',
    component: DrugInfo,
    props: { type: 'prescription', readonly: true }
  },

  // 函数模式：动态计算 props（最灵活）
  {
    path: '/drug/:id',
    component: DrugDetail,
    props: (route) => ({
      id: route.params.id,
      fromSearch: route.query.from === 'search',
      category: route.query.category || 'all'
    })
  }
]
```

命名视图的 props 分别配置：

```javascript
{
  path: '/drug/:id',
  components: { default: DrugDetail, sidebar: DrugSidebar },
  props: { default: true, sidebar: false }
}
```

> 💬 **面试官**：路由组件传参的三种模式分别适用什么场景？
>
> ✅ 标准答案：布尔模式适合简单的 params 传递；对象模式适合静态 props（组件需要固定配置，和路由无关）；函数模式适合需要从 query / 多个 params 组合计算 props 的场景。
>
> 🎁 加分答案：提到 props 解耦的意义：组件变成纯组件，不依赖 `$route`，可以直接传 prop 复用，也更容易写单元测试（不用 mock `$route` 和 `$router`）。

## 🌐 九、HTML5 History 模式

### pushState / replaceState 与 popstate

```javascript
// pushState 改变 URL 但不触发服务端请求，也不触发 popstate
history.pushState({ page: 1 }, 'Drug Detail', '/drug/123')

// replaceState：替换当前 history 条目
history.replaceState({ page: 1 }, 'Drug Detail', '/drug/123')

// popstate 事件：浏览器前进/后退时触发（pushState 自身不触发）
window.addEventListener('popstate', (event) => {
  console.log('location changed to:', document.location.href)
  console.log('state:', event.state)
})
```

注意：**直接调用 `pushState` 不触发 `popstate`**，只有用户点击浏览器前进/后退按钮才触发。Vue Router 的 `BrowserHistory` 在 `push` 时手动调用 `pushState`，同时更新内部路由状态——两件事分开做。

### 服务端 Nginx fallback 配置

History 模式下，访问 `/drug/123` 时浏览器会向服务端发请求 `/drug/123`。如果服务端没有这个路径，返回 404。需要配置 **fallback**，把所有路径都返回 `index.html`：

```nginx
server {
    listen 80;
    server_name hospital.example.com;
    root /usr/share/nginx/html;

    # API 请求转发到后端（必须在 location / 之前）
    location /api/ {
        proxy_pass http://backend:3000/;
    }

    # 其余所有路径：先找静态文件，找不到就返回 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Hash vs History 选型决策表

| 场景 | 推荐模式 | 原因 |
|------|---------|------|
| 内网系统、无 SEO 需求 | Hash | 无需服务端配置，部署简单 |
| 面向公网、需要 SEO | History | URL 干净，爬虫友好 |
| 静态托管（GitHub Pages / OSS） | Hash | 不支持 fallback 配置 |
| 有运维支持 + CDN | History | 可配置 fallback，体验更好 |
| 药品说明书 SEO + 首屏 | History + SSR | 结合 Nuxt.js 服务端渲染 |

> 💬 **面试官**：History 模式为什么需要服务端配合？不配置会有什么问题？
>
> ✅ 标准答案：History 模式的 URL 是正常路径格式，浏览器刷新时会向服务端发起请求。如果服务端没有对应路由，直接返回 404。需要配置 `try_files` fallback，让服务端把所有路径都返回 index.html，由前端路由处理。
>
> 🎁 加分答案：提到需要区分 API 路径和前端路由路径，API 请求（如 `/api/`）必须反向代理到后端，不能走 fallback；提到 Hash 模式的 `#` 后内容浏览器压根不会发给服务器，所以无此问题。

## 🛡️ 十、导航守卫：14 步完整链路

### 三类守卫概览

```javascript
// 1. 全局前置守卫（最常用，做权限控制）
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !store.state.isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})

// 2. 全局解析守卫（异步组件全部解析完后，导航确认前触发）
router.beforeResolve((to, from, next) => {
  next()
})

// 3. 全局后置钩子（导航完成后，不接收 next，不能改变导航）
router.afterEach((to, from) => {
  document.title = to.meta.title || '医疗系统'
})
```

```javascript
// 4. 路由独享守卫（写在路由配置中）
const routes = [
  {
    path: '/admin',
    component: Admin,
    beforeEnter: (to, from, next) => {
      if (store.state.user.role !== 'admin') {
        next('/403')
      } else {
        next()
      }
    }
  }
]
```

```javascript
// 5. 组件内守卫（写在组件选项中）
export default {
  // 进入路由前（注意：此时组件实例还未创建，不能访问 this）
  beforeRouteEnter(to, from, next) {
    // ❌ this 不可用
    next(vm => {
      // ✅ 通过 next 的回调访问组件实例（组件创建后调用）
      vm.fetchDrugDetail(to.params.id)
    })
  },

  // 路由参数变化时（组件复用，可以访问 this）
  beforeRouteUpdate(to, from, next) {
    this.fetchDrugDetail(to.params.id)
    next()
  },

  // 离开路由时（可用来提示用户保存数据）
  beforeRouteLeave(to, from, next) {
    if (this.hasUnsavedChanges) {
      const confirm = window.confirm('有未保存的处方数据，确认离开？')
      confirm ? next() : next(false)
    } else {
      next()
    }
  }
}
```

### 完整 14 步导航解析流程

以从 `/prescription/old` 跳转到 `/drug/new` 为例：

```
步骤 1  ：触发导航（调用 this.$router.push('/drug/new')）
           ↓
步骤 2  ：失活组件（PrescriptionDetail）调用 beforeRouteLeave 守卫
           ↓
步骤 3  ：失活组件 mixin 中的 beforeRouteLeave（mixin 先于组件执行）
           ↓
步骤 4  ：全局 beforeEach 守卫队列（多个 beforeEach 串行执行）
           ↓
步骤 5  ：重用组件中调用 beforeRouteUpdate（路径参数变化，组件被复用）
           ↓
步骤 6  ：路由配置中的 beforeEnter 守卫
           ↓
步骤 7  ：解析异步路由组件（等待 import() 完成，如路由懒加载）
           ↓
步骤 8  ：被激活组件（DrugDetail）调用 beforeRouteEnter
           ↓
步骤 9  ：被激活组件 mixin 中的 beforeRouteEnter
           ↓
步骤 10 ：全局 beforeResolve 守卫（所有守卫和异步组件都解析完之后）
           ↓
步骤 11 ：确认导航（导航被正式确认）
           ↓
步骤 12 ：全局 afterEach 钩子（不接收 next，导航已完成）
           ↓
步骤 13 ：触发 DOM 更新（nextTick 后）
           ↓
步骤 14 ：beforeRouteEnter 的 next(vm => ...) 回调执行（组件实例已创建）
```

### beforeRouteEnter 为什么不能访问 this

`beforeRouteEnter` 在**导航确认前**（步骤 8）调用，此时目标组件实例还没有被创建，所以 `this` 是 `undefined`。

要访问组件实例，通过 `next(vm => { ... })` 传入回调。这个回调在**步骤 14**（导航确认、DOM 更新后）才执行，此时组件已挂载，`vm` 就是组件实例。

```javascript
beforeRouteEnter(to, from, next) {
  // 在组件实例创建前获取数据
  fetchDrugDetail(to.params.id).then(data => {
    next(vm => {
      // 步骤 14 执行：vm 是已创建的组件实例
      vm.drug = data
    })
  }).catch(() => {
    next('/404')  // 获取失败，重定向
  })
}
```

### next 的五种调用方式

```javascript
next()             // 确认导航，进入下一个守卫
next(false)        // 中止导航，回到 from 路由
next('/login')     // 重定向到 /login
next({ name: 'Login', query: { redirect: to.fullPath } })  // 重定向（对象形式）
next(new Error('权限不足'))  // 传递错误，触发 router.onError 回调
// beforeRouteEnter 特有：
next(vm => { vm.xxx = 'yyy' })  // 组件创建后执行回调
```

> 💬 **面试官**：导航守卫的完整执行顺序是什么？beforeRouteEnter 里为什么不能访问 this？
>
> ✅ 标准答案：守卫按 beforeRouteLeave → 全局 beforeEach → beforeRouteUpdate → 路由 beforeEnter → 解析异步组件 → beforeRouteEnter → 全局 beforeResolve → 导航确认 → afterEach → DOM 更新 → next(vm) 回调这个顺序执行，共 14 步。beforeRouteEnter 在导航确认前调用，组件实例还没创建，所以不能访问 this；通过 next(vm => ...) 在组件创建后访问实例。
>
> 🎁 加分答案：提到 `next()` 必须被调用否则导航永久挂起；提到 vue-router 4 中组件内守卫改为 Composition API（`onBeforeRouteLeave` / `onBeforeRouteUpdate`），不再有 `next` 参数。

## 🔐 十一、路由元信息与权限控制

### meta 字段设计

```javascript
const routes = [
  {
    path: '/drug',
    component: DrugList,
    meta: {
      requiresAuth: true,                        // 需要登录
      roles: ['doctor', 'nurse', 'admin'],       // 允许的角色
      title: '药品管理',                          // 页面标题
      keepAlive: true                            // 是否缓存
    }
  },
  {
    path: '/admin',
    component: AdminPanel,
    meta: {
      requiresAuth: true,
      roles: ['admin'],       // 仅管理员
      title: '系统管理'
    }
  },
  {
    path: '/login',
    component: Login,
    meta: { requiresAuth: false }   // 白名单：不需要登录
  }
]
```

### beforeEach + meta 实现权限控制

```javascript
const WHITE_LIST = ['/login', '/register', '/404', '/403']

router.beforeEach((to, from, next) => {
  // 1. 设置页面标题
  document.title = to.meta.title || '医疗管理系统'

  const isLoggedIn = store.getters['user/isLoggedIn']
  const userRole = store.getters['user/role']

  // 2. 白名单直接放行
  if (WHITE_LIST.includes(to.path)) {
    return next()
  }

  // 3. 需要登录但未登录，跳登录页并记录目标路径
  if (to.meta.requiresAuth && !isLoggedIn) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }

  // 4. 检查角色权限
  if (to.meta.roles && !to.meta.roles.includes(userRole)) {
    return next('/403')
  }

  next()
})
```

登录成功后恢复目标路径：

```javascript
// Login.vue 登录成功
async handleLogin() {
  await store.dispatch('user/login', this.form)
  const redirect = this.$route.query.redirect || '/'
  this.$router.replace(redirect)   // 用 replace 避免登录页留在历史栈
}
```

### 动态路由注册：addRoutes（医疗角色分流）

根据角色动态添加路由，未登录用户完全无法访问权限路由：

```javascript
// 医疗系统三种角色的路由配置（定义但不注册）
const doctorRoutes = [
  { path: '/prescription/create', component: PrescriptionCreate, meta: { roles: ['doctor'] } },
  { path: '/patient/:id/diagnosis', component: DiagnosisCreate, meta: { roles: ['doctor'] } }
]

const nurseRoutes = [
  { path: '/medication', component: MedicationRecord, meta: { roles: ['nurse'] } },
  { path: '/vital-signs', component: VitalSigns, meta: { roles: ['nurse'] } }
]

const adminRoutes = [
  { path: '/admin/users', component: UserManagement, meta: { roles: ['admin'] } },
  { path: '/admin/drugs', component: DrugManagement, meta: { roles: ['admin'] } }
]

// 登录成功后根据角色注册路由
async function loginSuccess(role) {
  const roleRouteMap = {
    doctor: doctorRoutes,
    nurse: nurseRoutes,
    admin: [...adminRoutes, ...doctorRoutes]  // 管理员拥有医生路由
  }
  router.addRoutes(roleRouteMap[role] || [])
  router.push('/')
}
```

> 💬 **面试官**：`addRoutes` 动态添加路由时有哪些注意事项？
>
> ✅ 标准答案：`addRoutes` 是增量添加，不会清除已有路由。用户注销时，已注册的权限路由不会自动移除，需要重新创建 router 实例，或通过 `router.matcher = new VueRouter(options).matcher` 重置 matcher。页面刷新后动态路由消失，需要在每次刷新时重新拉取权限并调用 `addRoutes`。
>
> 🎁 加分答案：Vue Router 4 改用 `router.addRoute()`（单数）并提供 `router.removeRoute()` 删除单条路由，从根本上解决了 v3 无法精确删除路由的问题。

## 🎬 十二、过渡动效

### transition 包裹 router-view

```html
<template>
  <div id="app">
    <transition name="fade" mode="out-in">
      <!-- key 确保不同路由视为不同组件，触发过渡 -->
      <router-view :key="$route.path"></router-view>
    </transition>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
```

### 前进淡入 + 后退淡出的方向动画

```html
<template>
  <div id="app">
    <transition :name="transitionName">
      <router-view></router-view>
    </transition>
  </div>
</template>

<script>
export default {
  data() {
    return { transitionName: 'slide-left' }
  },
  watch: {
    '$route'(to, from) {
      // 根据路由 meta.index 判断前进/后退方向
      const toIndex = to.meta.index || 0
      const fromIndex = from.meta.index || 0
      this.transitionName = toIndex > fromIndex ? 'slide-left' : 'slide-right'
    }
  }
}
</script>

<style>
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease;
  /* GPU 加速：transform 不触发 layout */
  will-change: transform;
}

.slide-left-enter  { transform: translateX(100%); }
.slide-left-leave-to { transform: translateX(-100%); }
.slide-right-enter { transform: translateX(-100%); }
.slide-right-leave-to { transform: translateX(100%); }
</style>
```

在路由配置中加 index 标记层级深度：

```javascript
const routes = [
  { path: '/drug', component: DrugList, meta: { index: 0 } },
  { path: '/drug/:id', component: DrugDetail, meta: { index: 1 } },
  { path: '/drug/:id/prescription', component: Prescription, meta: { index: 2 } }
]
```

**GPU 加速最佳实践**：动画属性用 `transform` 和 `opacity`，避免触发 layout 的属性（如 `width`、`left`、`top`），配合 `will-change: transform` 告知浏览器提前优化，避免合成线程和主线程来回切换。

## 📡 十三、数据获取策略

### 策略一：导航完成后获取（推荐）

```javascript
export default {
  data() {
    return { drug: null, loading: false, error: null }
  },
  created() {
    this.fetchData()
  },
  watch: {
    '$route': 'fetchData'  // 路由参数变化时重新获取
  },
  methods: {
    async fetchData() {
      this.loading = true
      this.error = null
      try {
        this.drug = await api.getDrugDetail(this.$route.params.id)
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    }
  }
}
```

优点：组件立即渲染（可以显示骨架屏），加载状态在组件内管理，体验流畅，用户能看到页面切换。

### 策略二：导航完成前获取

```javascript
export default {
  beforeRouteEnter(to, from, next) {
    api.getDrugDetail(to.params.id)
      .then(data => {
        next(vm => { vm.drug = data })   // 组件创建后设置数据
      })
      .catch(() => {
        next('/404')                      // 获取失败直接跳 404
      })
  },
  beforeRouteUpdate(to, from, next) {
    api.getDrugDetail(to.params.id)
      .then(data => {
        this.drug = data
        next()
      })
  }
}
```

优点：组件渲染时数据已就绪，无空状态闪烁。缺点：导航期间旧页面不动，延迟感强。

### 两种策略对比

| 维度 | 导航后获取 | 导航前获取 |
|------|-----------|-----------|
| 加载状态 | 组件内骨架屏 / loading | 旧页面停留直到加载完 |
| 用户体验 | 响应快，有加载感 | 无空态，但导航延迟 |
| 错误处理 | 组件内展示错误 | 守卫中重定向 404 |
| 适用场景 | 大多数场景（推荐） | 数据是渲染前提（如 PDF 预览） |

## 📜 十四、滚动行为

```javascript
const router = new VueRouter({
  mode: 'history',
  routes,
  scrollBehavior(to, from, savedPosition) {
    // savedPosition：浏览器前进/后退时有值（历史记录保存的位置）
    if (savedPosition) {
      return savedPosition  // 保持历史位置（如列表页返回后恢复）
    }

    // 带 hash 时，滚动到锚点
    if (to.hash) {
      return {
        selector: to.hash,
        offset: { y: 80 },  // 偏移，避免被固定导航栏遮挡
        behavior: 'smooth'  // 平滑滚动
      }
    }

    // 默认回到顶部
    return { x: 0, y: 0 }
  }
})
```

### 医疗场景：问诊列表返回不丢失位置

```javascript
scrollBehavior(to, from, savedPosition) {
  // 从问诊详情返回问诊列表，恢复历史滚动位置
  if (savedPosition && from.name === 'ConsultationDetail' && to.name === 'ConsultationList') {
    return savedPosition
  }
  return { x: 0, y: 0 }
}
```

### 异步滚动

```javascript
scrollBehavior(to, from, savedPosition) {
  // 等待过渡动画完成后再滚动（与动画时长匹配）
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(savedPosition || { x: 0, y: 0 })
    }, 300)
  })
}
```

## ⚡ 十五、路由懒加载

### 基础用法：() => import()

```javascript
const routes = [
  // 每个路由对应一个独立 chunk，首屏只加载当前路由
  { path: '/drug', component: () => import('@/views/DrugList.vue') },
  { path: '/prescription', component: () => import('@/views/PrescriptionCreate.vue') },
  { path: '/patient', component: () => import('@/views/PatientList.vue') },
]
```

### webpackChunkName magic comment 命名 chunk

```javascript
const routes = [
  {
    path: '/drug',
    // 同一 chunkName 的文件会合并为一个 chunk（减少请求数）
    component: () => import(/* webpackChunkName: "drug" */ '@/views/DrugList.vue')
  },
  {
    path: '/drug/:id',
    component: () => import(/* webpackChunkName: "drug" */ '@/views/DrugDetail.vue')
  },
  {
    path: '/prescription',
    component: () => import(/* webpackChunkName: "prescription" */ '@/views/PrescriptionCreate.vue')
  }
]
```

按科室分 chunk，首屏只下载当前科室代码：

```javascript
// 内科模块（一个 chunk）
{ path: '/internal/drug', component: () => import(/* webpackChunkName: "internal" */ '@/views/internal/Drug.vue') },
{ path: '/internal/patient', component: () => import(/* webpackChunkName: "internal" */ '@/views/internal/Patient.vue') },

// 外科模块（独立 chunk，按需加载）
{ path: '/surgery/cases', component: () => import(/* webpackChunkName: "surgery" */ '@/views/surgery/Cases.vue') },
```

### 懒加载 + loading / error 状态

```javascript
// 高级异步组件写法，带加载状态控制
const DrugDetail = () => ({
  component: import('@/views/DrugDetail.vue'),
  loading: LoadingSpinner,    // 加载中显示的组件
  error: ErrorComponent,      // 加载失败显示的组件
  delay: 200,                 // 延迟 200ms 后显示 loading（避免瞬间闪烁）
  timeout: 3000               // 3秒超时，触发 error 组件
})
```

### 与 Webpack Code Splitting 的关系

动态 `import()` 是 Webpack 分包的信号：

```
开发者写 () => import('./DrugList.vue')
         ↓
Webpack 构建时：把 DrugList.vue 及其依赖单独打成 chunk（drug.xxx.js）
         ↓
运行时首屏不下载 drug.xxx.js
         ↓
用户访问 /drug 路由时，Vue Router 调用组件工厂函数
         ↓
动态插入 <script src="drug.xxx.js"> 标签
         ↓
脚本加载 → Vue 组件注册 → import() Promise resolve → 路由渲染组件
```

> 💬 **面试官**：路由懒加载的实现原理是什么？和 Webpack Code Splitting 的关系？
>
> ✅ 标准答案：路由懒加载本质是把 `component` 写成返回 Promise 的工厂函数，Vue Router 在渲染时才调用它加载组件。Webpack 的动态 `import()` 把目标模块打成独立 chunk 文件，运行时通过动态插入 `<script>` 标签加载，加载完成后 Promise resolve，组件才渲染。
>
> 🎁 加分答案：提到 `webpackChunkName` 让同模块多个组件合并为一个 chunk（减少 HTTP 请求数）；Vite 用 rollup 的 dynamic import 实现同样效果，不需要 magic comment（通过配置 `rollupOptions.output.manualChunks` 分包）。

## ⚠️ 十六、导航故障（NavigationFailure）

### 三种导航结果

vue-router 3.1+ 对导航结果做了明确分类：

```javascript
import VueRouter from 'vue-router'
const { isNavigationFailure, NavigationFailureType } = VueRouter

// 捕获并分析导航失败
this.$router.push('/admin').catch(failure => {
  if (!isNavigationFailure(failure)) {
    // 不是导航故障，是真正的异常（如网络错误）
    console.error(failure)
    return
  }

  if (isNavigationFailure(failure, NavigationFailureType.aborted)) {
    console.log('导航被守卫中止（next(false)）')
  }
  if (isNavigationFailure(failure, NavigationFailureType.cancelled)) {
    console.log('导航被新的导航取消（快速连续跳转）')
  }
  if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
    console.log('重复导航到当前路由')
  }
  if (isNavigationFailure(failure, NavigationFailureType.redirected)) {
    console.log('守卫中被重定向到其他路由')
  }
})
```

### NavigationFailureType 枚举

| 类型 | 触发场景 | 常见原因 |
|------|---------|---------|
| `redirected` | 守卫中调用 `next(otherPath)` | 登录守卫重定向到 /login |
| `aborted` | 守卫中调用 `next(false)` | 权限不足，中止导航 |
| `cancelled` | 新导航取消了当前导航 | 快速连续点击导航按钮 |
| `duplicated` | 跳转目标等于当前路由 | 重复点击同一导航链接 |

### 全局静默处理重复导航

```javascript
// 覆写 push/replace，静默处理重复导航报错
const originalPush = VueRouter.prototype.push
VueRouter.prototype.push = function push(location) {
  return originalPush.call(this, location).catch(err => {
    if (isNavigationFailure(err, NavigationFailureType.duplicated)) {
      return err  // 静默处理
    }
    return Promise.reject(err)  // 其他错误继续抛出
  })
}
```

## ⚙️ 十七、原理深潜：Vue Router 内部工作机制

### install 流程：defineReactive 是响应式核心

```
Vue.use(VueRouter)
         ↓
VueRouter.install(Vue) 调用
         ↓
Vue.mixin({ beforeCreate })         ← 给所有组件注入
         ↓
根实例 beforeCreate 执行：
  ① this._routerRoot = this
  ② this._router = this.$options.router
  ③ this._router.init(this)          ← 初始化路由，触发首次 transitionTo
  ④ Vue.util.defineReactive(this, '_route', this._router.history.current)
     ↑ 核心！把 current route 变成响应式属性
         ↓
子组件 beforeCreate 执行：
  this._routerRoot = this.$parent._routerRoot  ← 继承根实例引用
         ↓
Vue.prototype.$route  = getter → this._routerRoot._route
Vue.prototype.$router = getter → this._routerRoot._router
```

`defineReactive(this, '_route', ...)` 这一行是 Vue Router 响应式的核心：**当 `_route` 被赋新值时，所有依赖 `$route` 的组件（包括 `<router-view>`）自动重新渲染**。

### Matcher：pathList + pathMap 扁平化路由表

```
routes 配置（树状）
         ↓
createRouteMap() 遍历树，打平为两个数据结构
         ↓
pathList: ['/drug', '/drug/:id', '/patient', '/patient/:id/info']
          ← 保持路由注册顺序
          
pathMap: {
  '/drug':          { path, component, parent: null },
  '/drug/:id':      { path, component, parent: drugRecord },
  '/patient/:id/info': { path, component, parent: patientRecord }
}                   ← parent 引用支持 matched 数组构造
```

`match(location)` 在 `pathMap` 中查找 `record`，通过 `record.parent` 链向上遍历，构造 `matched` 数组（从外到内排列）——这是 `router-view` 嵌套渲染的数据基础。

### transitionTo 主链路

```
$router.push('/drug/123')
         ↓
history.push('/drug/123')
         ↓
history.transitionTo('/drug/123', onComplete)
         ↓
let route = router.match('/drug/123')
  → 在 pathMap 查到 '/drug/:id' record
  → createRoute(record, location)
  → { path: '/drug/123', params: { id: '123' }, matched: [drugRecord] }
         ↓
runQueue(beforeHooks, iterator, () => {
  updateRoute(route)         ← this.current = route
  this.cb(route)             ← app._route = route（触发响应式，视图更新）
  onComplete()               ← setupListener（开始监听 hashchange）
})
         ↓
_route 变化 → <router-view> 重新渲染 → 取 matched[depth] 的 component → 渲染
```

### router-view 的 depth 递归算法

`<router-view>` 是函数式组件，每次渲染时向上遍历父组件链，统计自身的嵌套深度：

```
<App>
  <router-view>       ← depth=0，渲染 matched[0]（PatientLayout）
    <PatientLayout>
      <router-view>   ← depth=1，渲染 matched[1]（PatientInfo）
```

depth 的计数依据是 `$vnode.data.routerView` 标记——`router-view` 在渲染时把 `data.routerView = true` 写入自身 VNode data，让子孙的 `router-view` 能感知并计数。

### router-link 的 active class 匹配

```javascript
const currentPath = this.$route.path
const targetPath = this.to

// 精确匹配（加了 exact prop）
const isExactActive = currentPath === targetPath

// 包含匹配（默认行为）
const isActive = this.exact
  ? isExactActive
  : (currentPath === targetPath || currentPath.startsWith(targetPath + '/'))
```

访问 `/drug/123` 时，`to="/drug"` 满足包含匹配（`/drug/123` 以 `/drug/` 开头），激活 `router-link-active`；而 `to="/"` 只有加了 `exact` 才不会被激活。

> 💬 **面试官**：router-view 是怎么知道渲染哪个组件的？响应式是怎么实现的？
>
> ✅ 标准答案：`router-view` 依赖响应式的 `$route`。`install` 时通过 `defineReactive` 把 `_route`（当前路由）变为响应式，路由跳转时 `updateRoute` 更新 `_route`，触发 `router-view` 重渲染。`router-view` 通过向上遍历父组件链、统计 `routerView` 标记得到 `depth`，从 `$route.matched[depth]` 取对应层级的组件渲染。
>
> 🎁 加分答案：提到 `router-view` 是函数式组件（`functional: true`），无实例、无响应式，渲染性能更好；提到 `$route.matched` 是从外到内的组件记录数组，每一项对应一级嵌套，这是嵌套路由渲染的核心数据结构。

## 🔬 十八、源码解析（6 个关键文件）

### install.js：注入 $router / $route

```javascript
// src/install.js（关键逻辑精简）
import Link from './components/link'
import View from './components/view'

export let _Vue

export function install(Vue) {
  if (install.installed && _Vue === Vue) return  // 防止重复安装
  install.installed = true
  _Vue = Vue

  Vue.mixin({
    beforeCreate() {
      if (isDef(this.$options.router)) {
        // 根实例（传入了 router 选项）
        this._routerRoot = this
        this._router = this.$options.router
        this._router.init(this)   // 初始化路由
        // 核心：把 current route 变成响应式
        Vue.util.defineReactive(this, '_route', this._router.history.current)
      } else {
        // 子组件：向上找根实例的 _routerRoot
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
      }
      registerInstance(this, this)  // 注册组件实例（用于 beforeRouteEnter 的 next(vm)）
    },
    destroyed() {
      registerInstance(this)  // 销毁时注销实例
    }
  })

  Object.defineProperty(Vue.prototype, '$router', {
    get() { return this._routerRoot._router }
  })
  Object.defineProperty(Vue.prototype, '$route', {
    get() { return this._routerRoot._route }
  })

  Vue.component('RouterView', View)
  Vue.component('RouterLink', Link)
}
```

### create-route-map.js：路由表构建

```javascript
// src/create-route-map.js（关键逻辑）
export function createRouteMap(routes, oldPathList, oldPathMap, oldNameMap) {
  const pathList = oldPathList || []
  const pathMap = oldPathMap || Object.create(null)
  const nameMap = oldNameMap || Object.create(null)

  routes.forEach(route => addRouteRecord(pathList, pathMap, nameMap, route))

  return { pathList, pathMap, nameMap }
}

function addRouteRecord(pathList, pathMap, nameMap, route, parent) {
  const normalizedPath = normalizePath(route.path, parent)

  const record = {
    path: normalizedPath,
    regex: compileRouteRegex(normalizedPath),   // 正则处理动态段 /:id
    components: route.components || { default: route.component },
    name: route.name,
    parent,                                      // 父记录引用（构造 matched 用）
    meta: route.meta || {},
    props: route.props || false,
    beforeEnter: route.beforeEnter,
  }

  if (!pathMap[record.path]) {
    pathList.push(record.path)
    pathMap[record.path] = record
  }

  if (route.name) nameMap[route.name] = record

  if (route.children) {
    route.children.forEach(child => {
      addRouteRecord(pathList, pathMap, nameMap, child, record)
    })
  }
}
```

### history/base.js：transitionTo + runQueue

```javascript
// src/history/base.js（核心逻辑）
export class History {
  constructor(router, base) {
    this.router = router
    this.current = START  // 初始路由 { path: '/', matched: [] }
    this.cb = null
  }

  transitionTo(location, onComplete, onAbort) {
    const route = this.router.match(location, this.current)
    this.confirmTransition(route, () => {
      this.updateRoute(route)
      onComplete && onComplete(route)
      // 执行 afterEach 钩子
      this.router.afterHooks.forEach(hook => hook && hook(route, this.current))
    }, onAbort)
  }

  confirmTransition(route, onComplete, onAbort) {
    const { updated, deactivated, activated } = resolveQueue(
      this.current.matched, route.matched
    )

    // 构造 14 步守卫队列（前 7 步）
    const queue = [].concat(
      extractLeaveGuards(deactivated),    // 步骤 2+3：失活组件 beforeRouteLeave
      this.router.beforeHooks,             // 步骤 4：全局 beforeEach
      extractUpdateHooks(updated),         // 步骤 5：重用组件 beforeRouteUpdate
      activated.map(m => m.beforeEnter),   // 步骤 6：路由独享 beforeEnter
      resolveAsyncComponents(activated)    // 步骤 7：解析异步组件
    )

    const iterator = (hook, next) => {
      hook(route, this.current, (to) => {
        if (to === false) {
          onAbort(createNavigationAbortedError(this.current, route))
        } else if (typeof to === 'string' || typeof to === 'object') {
          this.push(to)  // 重定向
        } else {
          next(to)       // 继续队列
        }
      })
    }

    runQueue(queue, iterator, () => {
      const postEnterCbs = []
      // 步骤 8+9：被激活组件的 beforeRouteEnter
      const enterGuards = extractEnterGuards(activated, postEnterCbs, () => this.current === route)
      // 步骤 10：全局 beforeResolve
      const queue2 = enterGuards.concat(this.router.resolveHooks)
      runQueue(queue2, iterator, () => {
        // 步骤 11：确认导航
        onComplete(route)
        // 步骤 13：nextTick 后执行 next(vm) 回调（步骤 14）
        if (this.router.app) {
          this.router.app.$nextTick(() => {
            postEnterCbs.forEach(cb => cb())
          })
        }
      })
    })
  }

  updateRoute(route) {
    this.current = route
    this.cb && this.cb(route)  // 触发 app._route = route，响应式更新
  }

  listen(cb) { this.cb = cb }
}

// 异步串行队列迭代器：是整个守卫系统的核心
export function runQueue(queue, fn, cb) {
  const step = index => {
    if (index >= queue.length) {
      cb()  // 队列执行完，调用回调
    } else {
      if (queue[index]) {
        fn(queue[index], () => step(index + 1))  // 守卫调用 next() → 进入下一个
      } else {
        step(index + 1)  // 空守卫直接跳过
      }
    }
  }
  step(0)
}
```

### history/hash.js：hashchange 监听

```javascript
// src/history/hash.js（关键逻辑）
import { History } from './base'

function getHash() {
  const href = window.location.href
  const index = href.indexOf('#')
  return index < 0 ? '' : href.slice(index + 1)
}

function ensureSlash() {
  const path = getHash()
  if (path.charAt(0) === '/') return true
  replaceHash('/' + path)
  return false
}

export class HashHistory extends History {
  constructor(router, base, fallback) {
    super(router, base)
    ensureSlash()  // 确保 URL 有 /#/
  }

  getCurrentLocation() {
    return getHash()  // 取 # 后的路径
  }

  setupListeners() {
    const handleRoutingEvent = () => {
      this.transitionTo(getHash(), route => {
        replaceHash(route.fullPath)
      })
    }
    window.addEventListener('hashchange', handleRoutingEvent)
    // 保存清理函数，组件销毁时移除监听
    this.listeners.push(() => {
      window.removeEventListener('hashchange', handleRoutingEvent)
    })
  }

  push(location, onComplete, onAbort) {
    this.transitionTo(location, route => {
      pushHash(route.fullPath)  // window.location.hash = fullPath
      onComplete && onComplete(route)
    }, onAbort)
  }

  replace(location, onComplete, onAbort) {
    this.transitionTo(location, route => {
      replaceHash(route.fullPath)  // window.location.replace(...)
      onComplete && onComplete(route)
    }, onAbort)
  }
}
```

### components/view.js：depth 递归渲染

```javascript
// src/components/view.js
export default {
  name: 'RouterView',
  functional: true,   // 函数式组件，无实例，渲染更快
  props: { name: { type: String, default: 'default' } },
  render(_, { props, children, parent, data }) {
    data.routerView = true  // 标记自身，供子层 router-view 计数

    const h = parent.$createElement
    const name = props.name
    const route = parent.$route   // 依赖响应式 $route，route 变化触发重渲染
    const cache = parent._routerViewCache || (parent._routerViewCache = {})

    // 向上遍历，计算嵌套深度
    let depth = 0
    let p = parent
    while (p && p._routerRoot !== p) {
      const vnodeData = p.$vnode && p.$vnode.data
      if (vnodeData && vnodeData.routerView) depth++
      p = p.$parent
    }
    data.routerViewDepth = depth

    const matched = route.matched[depth]   // 取对应深度的路由记录
    if (!matched) {
      cache[name] = null
      return h()   // 无匹配，渲染空注释节点
    }

    const component = cache[name] = matched.components[name]
    return h(component, data, children)
  }
}
```

### components/link.js：active class 计算

```javascript
// src/components/link.js（关键逻辑）
export default {
  name: 'RouterLink',
  props: {
    to: { type: [String, Object], required: true },
    tag: { type: String, default: 'a' },
    exact: Boolean,
    replace: Boolean,
    activeClass: String,
    exactActiveClass: String,
  },
  render(h) {
    const router = this.$router
    const current = this.$route
    const { location, route, href } = router.resolve(this.to, current)

    const classes = {}
    const activeClass = this.activeClass || router.options.linkActiveClass || 'router-link-active'
    const exactActiveClass = this.exactActiveClass || router.options.linkExactActiveClass || 'router-link-exact-active'

    // 精确匹配：path / query / hash 完全相同
    classes[exactActiveClass] = isSameRoute(current, route)
    // 包含匹配：current 路径以 target 路径开头
    classes[activeClass] = this.exact
      ? classes[exactActiveClass]
      : isIncludedRoute(current, route)

    const handler = e => {
      if (guardEvent(e)) {
        this.replace ? router.replace(location) : router.push(location)
      }
    }

    return h(this.tag, { class: classes, on: { click: handler } }, this.$slots.default)
  }
}
```

## 🏭 十九、生产级最佳实践

### 权限路由动态注册（角色分流完整方案）

```javascript
// store/modules/permission.js
const actions = {
  generateRoutes({ commit }, roles) {
    // 根据角色过滤路由树（递归）
    const accessedRoutes = filterAsyncRoutes(asyncRoutes, roles)
    commit('SET_ROUTES', accessedRoutes)
    return accessedRoutes
  }
}

function filterAsyncRoutes(routes, roles) {
  return routes.reduce((res, route) => {
    const tmp = { ...route }
    if (hasPermission(roles, tmp)) {
      if (tmp.children) tmp.children = filterAsyncRoutes(tmp.children, roles)
      res.push(tmp)
    }
    return res
  }, [])
}

function hasPermission(roles, route) {
  if (route.meta && route.meta.roles) {
    return roles.some(role => route.meta.roles.includes(role))
  }
  return true  // 无 roles 限制则所有人可访问
}
```

```javascript
// 全局守卫中动态注册
router.beforeEach(async (to, from, next) => {
  const token = store.getters.token
  if (token) {
    if (to.path === '/login') return next('/')
    const hasRoutes = store.getters.permission_routes.length > 0
    if (hasRoutes) return next()

    // 首次进入：拉取用户信息 + 注册动态路由
    try {
      const { roles } = await store.dispatch('user/getInfo')
      const accessRoutes = await store.dispatch('permission/generateRoutes', roles)
      router.addRoutes(accessRoutes)
      // replace 确保 addRoutes 完成后路由正确渲染
      next({ ...to, replace: true })
    } catch {
      await store.dispatch('user/logout')
      next(`/login?redirect=${to.path}`)
    }
  } else {
    WHITE_LIST.includes(to.path) ? next() : next(`/login?redirect=${to.path}`)
  }
})
```

### 路由懒加载 + 按科室分 chunk

```javascript
const routes = [
  // 公共模块（合并到主 chunk）
  { path: '/login', component: () => import(/* webpackChunkName: "auth" */ '@/views/Login.vue') },

  // 内科（一个 chunk，首次访问才下载）
  { path: '/internal/drug', component: () => import(/* webpackChunkName: "internal" */ '@/views/internal/Drug.vue') },
  { path: '/internal/patient', component: () => import(/* webpackChunkName: "internal" */ '@/views/internal/Patient.vue') },

  // 外科（独立 chunk）
  { path: '/surgery/cases', component: () => import(/* webpackChunkName: "surgery" */ '@/views/surgery/Cases.vue') },
  { path: '/surgery/schedule', component: () => import(/* webpackChunkName: "surgery" */ '@/views/surgery/Schedule.vue') },
]
```

### 动态路由参数变化的 3 种处理方式

```javascript
// 方式 1：watch $route（简单，适合大多数场景）
watch: {
  '$route.params.id'(newId) {
    this.loadDrugDetail(newId)
  }
}

// 方式 2：beforeRouteUpdate 守卫（推荐，可以做数据预校验）
beforeRouteUpdate(to, from, next) {
  this.loadDrugDetail(to.params.id)
  next()
}

// 方式 3：给 router-view 加 key（适合需要完全重置组件状态）
// <router-view :key="$route.params.id">
```

### 注销时重置路由（解决 addRoutes 残留问题）

```javascript
// router/index.js
const createRouter = () => new VueRouter({
  mode: 'history',
  scrollBehavior: () => ({ y: 0 }),
  routes: constantRoutes
})

const router = createRouter()

// 重置路由（注销时调用）
export function resetRouter() {
  const newRouter = createRouter()
  router.matcher = newRouter.matcher  // 替换 matcher，清除动态路由
}
```

## 🛠️ 二十、手写实现（Rollup 医疗场景完整代码）

### 目录结构

```
plugins/vue-router/
├── index.js              ← VueRouter 主类
├── install.js            ← Vue.use 插件安装
├── create-matcher.js     ← 路由匹配器（match + addRoutes）
├── create-route-map.js   ← 路由表构建（pathList + pathMap）
├── history/
│   ├── base.js           ← History 基类（transitionTo + runQueue）
│   ├── hash.js           ← HashHistory（hashchange）
│   └── history.js        ← BrowserHistory（pushState，扩展预留）
└── components/
    ├── link.js           ← router-link（active class）
    └── view.js           ← router-view（depth 递归）
```

### install.js

```javascript
import Link from './components/link'
import View from './components/view'

export let _Vue

export function install(Vue) {
  if (install.installed) return
  install.installed = true
  _Vue = Vue

  Vue.mixin({
    beforeCreate() {
      if (this.$options.router) {
        // 根实例
        this._routerRoot = this
        this._router = this.$options.router
        this._router.init(this)
        // 核心：将当前路由变为响应式，<router-view> 依赖它重渲染
        Vue.util.defineReactive(this, '_route', this._router.history.current)
      } else {
        // 子组件继承根实例的 _routerRoot
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
      }
    }
  })

  Vue.component('router-link', Link)
  Vue.component('router-view', View)

  Object.defineProperty(Vue.prototype, '$route', {
    get() { return this._routerRoot._route }
  })
  Object.defineProperty(Vue.prototype, '$router', {
    get() { return this._routerRoot._router }
  })
}
```

### index.js：VueRouter 主类

```javascript
import { install } from './install'
import createMatcher from './create-matcher'
import HashHistory from './history/hash'
import BrowserHistory from './history/history'

class VueRouter {
  constructor(options = {}) {
    this.app = null
    this.options = options
    this.beforeHooks = []
    this.afterHooks = []
    this.matcher = createMatcher(options.routes || [], this)

    const mode = options.mode || 'hash'
    this.history = mode === 'history'
      ? new BrowserHistory(this, options.base)
      : new HashHistory(this, options.base)
  }

  init(app) {
    this.app = app
    const history = this.history
    // 初始化：跳转到当前 URL 对应路由
    history.transitionTo(
      history.getCurrentLocation(),
      () => { history.setupListener() }
    )
    // 路由变化时同步 app._route（触发响应式更新）
    history.listen(route => { this.app._route = route })
  }

  beforeEach(fn) {
    this.beforeHooks.push(fn)
    // 返回移除函数
    return () => {
      const i = this.beforeHooks.indexOf(fn)
      if (i > -1) this.beforeHooks.splice(i, 1)
    }
  }

  afterEach(fn) { this.afterHooks.push(fn) }

  match(raw, current) { return this.matcher.match(raw, current) }

  push(location)    { this.history.push(location) }
  replace(location) { this.history.replace(location) }
  go(n)             { this.history.go(n) }
  back()            { this.go(-1) }
  forward()         { this.go(1) }
}

VueRouter.install = install
export default VueRouter
```

### create-route-map.js

```javascript
export function createRouteMap(routes, oldPathList, oldPathMap) {
  const pathList = oldPathList || []
  const pathMap = oldPathMap || Object.create(null)

  routes.forEach(route => addRouteRecord(route, pathList, pathMap))

  return { pathList, pathMap }
}

function addRouteRecord(route, pathList, pathMap, parent) {
  // 子路由拼接父路径
  const path = parent
    ? `${parent.path === '/' ? '' : parent.path}/${route.path}`
    : route.path

  const record = {
    path,
    component: route.component,
    components: route.components || { default: route.component },
    parent,                 // 保留父引用，构造 matched 链
    meta: route.meta || {},
    props: route.props || false,
    beforeEnter: route.beforeEnter
  }

  if (!pathMap[path]) {   // 不允许重复，重复只保留第一条
    pathList.push(path)
    pathMap[path] = record
  }

  if (route.children) {
    route.children.forEach(child => addRouteRecord(child, pathList, pathMap, record))
  }
}
```

### create-matcher.js

```javascript
import { createRouteMap } from './create-route-map'

export function createRoute(record, location) {
  // 从 record 向上遍历父链，构建 matched 数组（外 → 内）
  const matched = []
  let r = record
  while (r) {
    matched.unshift(r)
    r = r.parent
  }
  return { ...location, matched }
}

export default function createMatcher(routes) {
  let { pathList, pathMap } = createRouteMap(routes)

  // 动态追加路由（addRoutes 实现）
  function addRoutes(routes) {
    createRouteMap(routes, pathList, pathMap)
  }

  function match(location) {
    const record = pathMap[location]
    if (record) return createRoute(record, { path: location })
    return createRoute(null, { path: location })
  }

  return { match, addRoutes }
}
```

### history/base.js

```javascript
import { createRoute } from '../create-matcher'

const START = createRoute(null, { path: '/' })

export class History {
  constructor(router) {
    this.router = router
    this.current = START
    this.cb = null
  }

  transitionTo(location, onComplete) {
    const route = this.router.match(location)

    // 防止重复跳转
    if (route.path === this.current.path &&
        route.matched.length === this.current.matched.length) return

    // 收集全局 beforeEach 守卫
    const queue = [].concat(this.router.beforeHooks)
    const iterator = (hook, next) => {
      hook(this.current, route, (to) => {
        if (to === false) return
        if (typeof to === 'string' || (typeof to === 'object' && typeof to.path === 'string')) {
          this.push(to)  // 重定向
        } else {
          next()         // 继续队列
        }
      })
    }

    runQueue(queue, iterator, () => {
      this.updateRoute(route)
      onComplete && onComplete()
      // 执行 afterEach
      this.router.afterHooks.forEach(hook => hook && hook(route, this.current))
    })
  }

  updateRoute(route) {
    this.current = route
    this.cb && this.cb(route)  // 通知 app._route 更新
  }

  listen(cb) { this.cb = cb }

  push(location) {
    this.transitionTo(location, () => {
      window.location.hash = location
    })
  }

  replace(location) {
    this.transitionTo(location, () => {
      const i = window.location.href.indexOf('#')
      window.location.replace(
        window.location.href.slice(0, i >= 0 ? i : 0) + '#' + location
      )
    })
  }

  go(n) { window.history.go(n) }
}

// 异步串行迭代队列：守卫系统的核心驱动
export function runQueue(queue, fn, cb) {
  const step = (index) => {
    if (index >= queue.length) {
      cb()  // 所有守卫通过，执行最终回调
    } else {
      if (queue[index]) {
        fn(queue[index], () => step(index + 1))  // 守卫调用 next() → 进入下一项
      } else {
        step(index + 1)  // 空守卫直接跳过
      }
    }
  }
  step(0)
}

export default History
```

### history/hash.js

```javascript
import History from './base'

function getHash() { return window.location.hash.slice(1) || '/' }

function ensureSlash() {
  if (window.location.hash) return
  window.location.hash = '/'
}

export default class HashHistory extends History {
  constructor(router) {
    super(router)
    ensureSlash()
  }

  getCurrentLocation() { return getHash() }

  setupListener() {
    window.addEventListener('hashchange', () => {
      this.transitionTo(getHash())
    })
  }

  push(location) {
    this.transitionTo(location, () => {
      window.location.hash = location
    })
  }

  replace(location) {
    this.transitionTo(location, () => {
      const i = window.location.href.indexOf('#')
      window.location.replace(
        window.location.href.slice(0, i >= 0 ? i : 0) + '#' + location
      )
    })
  }
}
```

### components/view.js：router-view（depth 递归）

```javascript
export default {
  name: 'routerView',
  functional: true,   // 函数式：无实例，无响应式，纯渲染函数
  render(h, { parent, data }) {
    const route = parent.$route  // 依赖响应式 $route，route 变化时自动重渲染
    let depth = 0
    data.routerView = true       // 标记自身，供子层计数

    // 向上遍历父组件链，统计嵌套 router-view 的层数
    let p = parent
    while (p) {
      if (p.$vnode && p.$vnode.data.routerView) depth++
      p = p.$parent
    }

    const record = route.matched[depth]   // 取对应深度的路由记录
    if (!record) return h()               // 无匹配，渲染空注释节点

    return h(record.component, data)
  }
}
```

### components/link.js：router-link

```javascript
export default {
  name: 'routerLink',
  props: {
    to: { type: String, required: true },
    tag: { type: String, default: 'a' },
    exact: { type: Boolean, default: false }
  },
  methods: {
    handleClick(to) {
      this.$router.push(to)
    }
  },
  render() {
    const { tag: Tag, to, exact } = this
    const currentPath = this.$route.path
    // active class 计算
    const isExactActive = currentPath === to
    const isActive = exact ? isExactActive : (currentPath === to || currentPath.startsWith(to + '/'))

    return (
      <Tag
        onclick={this.handleClick.bind(this, to)}
        class={{
          'router-link-active': isActive,
          'router-link-exact-active': isExactActive
        }}
      >
        {this.$slots.default}
      </Tag>
    )
  }
}
```

### 医疗场景：多角色权限路由 + addRoutes 演示

```javascript
// router/index.js
import Vue from 'vue'
import MiniRouter from './plugins/vue-router'
import Home from './views/Home.vue'
import Login from './views/Login.vue'

Vue.use(MiniRouter)

// 基础路由（所有角色可访问）
const constantRoutes = [
  { path: '/', redirect: '/home' },
  { path: '/home', component: Home },
  { path: '/login', component: Login }
]

// 权限路由（按角色懒加载）
export const asyncRoutes = {
  doctor: [
    { path: '/prescription', component: () => import('./views/Prescription.vue') },
    { path: '/diagnosis', component: () => import('./views/Diagnosis.vue') }
  ],
  nurse: [
    { path: '/medication', component: () => import('./views/Medication.vue') }
  ],
  admin: [
    { path: '/admin/users', component: () => import('./views/AdminUsers.vue') },
    { path: '/admin/drugs', component: () => import('./views/AdminDrugs.vue') }
  ]
}

const router = new MiniRouter({
  mode: 'hash',
  routes: constantRoutes
})

// 全局权限守卫
router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem('token')
  if (to.path === '/login') return next()
  if (!isLoggedIn) return next('/login')
  next()
})

export default router
```

```javascript
// 登录成功后动态注册角色路由
function onLoginSuccess(role) {
  const routes = asyncRoutes[role] || []
  router.matcher.addRoutes(routes)  // 动态追加路由
  router.push('/')
}
```

```html
<!-- App.vue -->
<template>
  <div>
    <nav>
      <router-link to="/home">首页</router-link>
      <router-link to="/prescription">处方管理</router-link>
      <router-link to="/medication">用药记录</router-link>
    </nav>
    <!-- 路由出口 -->
    <router-view></router-view>
  </div>
</template>
```

## 📚 二十一、GitHub 地址与参考

### 手写实现源码

https://github.com/lotosv2010/g-vue-router/tree/3.4

### 参考资料

- Vue Router 3.x 官方文档：https://v3.router.vuejs.org/
- 导航守卫原理解析：https://jonny-wei.github.io/blog/vue/vue-router/abstract.html
- Vue Router GitHub 源码：src/install.js / src/history/base.js / src/components/view.js

### 留个问题

`router-view` 是函数式组件，没有 `this`，它怎么触发依赖收集、感知 `$route` 的变化？答案是：函数式组件的 `render` 在父组件渲染时执行，`parent.$route` 被访问时，当前渲染的 Watcher（父组件的 render watcher）订阅了 `_route` 的依赖——所以 `_route` 变化时，是父组件重渲，带动 `router-view` 重渲。想想这个链路，加深对响应式系统的理解。

---

> 🔖 这是「Vue 2 全家桶深度拆解系列」第 9 篇。上一篇：《Vue 2 内置组件与核心 API 原理：keep-alive 缓存策略与 mixin 合并机制全解析（面试收藏级）》；下一篇预告：《Vuex 原理与手写实现》
