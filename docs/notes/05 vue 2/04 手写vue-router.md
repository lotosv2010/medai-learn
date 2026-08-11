## 一、概述
### 路由
路由：不同的路径，渲染不同的内容



### 路由分类
路由有两种模式

+ `hash` 模式
+ `history` 模式



### 区别
+ `MPA`  多页面应用中跳转逻辑都是由后端处理
+ 前后端分离，前端需要根据路径的不同进行跳转(可以根据 `hash` 值显示变化的内容)
+ `history` 模式，用于生产环境(需要服务端支持，否则一刷新页面就报 `404` )



### vue-router
+ `vue-router` 是一个插件
+ 调用 `Vu.use(Router)` ，内部会提供两个全局组件 `router-link` 、 `router-view` 
+ `this.$rout` ：路由相关的<font style="color:#F5222D;">属性</font>
+ `this.$router` ：路由相关的<font style="color:#F5222D;">方法</font>



## 二、vue-router基本使用
通过Vue路由的基本配置来探索`Vue-Router` ，这里我们不难发现核心方法就是 `Vue.use(Router)` ，在就是`new Router` 产生 `router` 实例。

```javascript
import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    component: () => import('./views/home/index.vue')
  },
  {
    path: '/login',
    component: () => import('./views/user/login.vue'),
    children: [
      {
        path: 'forget',
        component: {
          render:(h) => h('h3', {}, 'forget')
        }
      },
      {
        path: 'reg',
        component: {
          render:(h) => h('h3', {}, 'register')
        }
      }
    ]
  }
]

const router = {
  mode: 'hash',
  routes
}

export default new VueRouter(router)
```

## 三、环境搭建
### 安装依赖
```javascript
npm install -g @vue/cli-service-global
```

### 配置目录
<!-- 这是一张图片，ocr 内容为：vue-router-source EXPLORER OPENEDITORS VUE-ROUTER-SOURCE plugins/vue-router components link.js 16 JSVIeWjS history U base.js hashJjs U history-JS index.js U install.js VIeWs home qitignore Appvue U main.js U ShowAllCommands package.son readme.md GotoFIle routerjs FindinFILes StartDebugging ToggleTerminal OUTLINE TIMELINE ESLINTYCOmPILEHeRO:OfF YAutoFormatVue:Off 00A0 -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1606917087514-2b33aaba-1920-4f16-80c0-0d5774358b32.png)



### 开发环境配置
`package,json` 

```json
{
  "name": "vue-router-source",
  "version": "1.0.0",
  "description": "",
  "main": "main.js",
  "scripts": {
    "start": "vue serve -o main.js",
    "build": "vue build -h main.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "vue-router": "^3.4.9"
  }
}
```



## 四、编写Vue-Router
### 编写install方法
`plugins/vue-router/install.js` 

```javascript
export let _Vue
export default function install(Vue, options){
  // 插件安装入口
  // 插件一般用于定义全局组件、全局指令、过滤器、原型方法...
  // https://cn.vuejs.org/v2/guide/plugins.html

  _Vue = Vue // 这样其他文件都可以使用 Vue 变量

  // 给所有组件混入一个属性 router
  Vue.mixin({ // 给所有组件的生命周期都增加beforeCreate方法
    beforeCreate() {
      // 将父组件传入的 router 注入到所有的子组件
      if(this.$options.router) { // 如果有router属性说明是根实例
        // _routerRoot 代表的是 vue 组件的实例，将根实例挂载在_routerRoot属性上
        this._routerRoot = this
        // _router 代表用户传过来的属性，将当前router实例挂载在_router上
        this._router = this.$options.router
      } else {
        // 组件渲染是一层层的渲染
        // 无论是父组件还是子组件，都可以通过 this._routerRoot._router 获取共同实例
        // 保证所有子组件都拥有_routerRoot 属性，指向根实例
        // 保证所有组件都可以通过 this._routerRoot._router 拿到用户传递进来的路由实例对象
        this._routerRoot = this.$parent && this.$parent._routerRoot
        console.log(options)
      }
    }
  })

  Vue.component('router-link', {
    render: h => h('a', {}, '')
  })
  Vue.component('router-view', {
    render: h => h('div', {}, '')
  })

  Vue.prototype.$route = {}
  Vue.prototype.$router = {}
}
```

`plugins/vue-router/index.js`

```javascript
import install from "./install"

class VueRouter {
  constructor(options) {
    console.log(options)
  }
}
VueRouter.install = install
export default VueRouter
```

### 编写createMatcher方法
初始化

+ 这里我们应该在`Vue-Router`上增加一个`init`方法，主要目的就是初始化功能
+ 这里在强调下，什么是路由？ 路由就是**匹配到对应路径显示对应的组件**！

`plugins/vue-router/index.js`

```javascript
import createMatcher from "./create-matcher"
import install from "./install"

class VueRouter {
  constructor(options) {
    // 创建匹配器，可用于后续的匹配操作
    // 用户没有传递配置时默认为空数组
    // 1.match 通过路由来匹配组件
    // 2.addRoutes 动态添加路遇
    this.matcher = createMatcher(options.routes || [])
  }
  init(app) {
    console.log(app)
  }
}
VueRouter.install = install
export default VueRouter
```

`plugins/vue-router/install.js`

```javascript
export let _Vue
export default function install(Vue, options){
  // 插件安装入口
  // 插件一般用于定义全局组件、全局指令、过滤器、原型方法...
  // https://cn.vuejs.org/v2/guide/plugins.html
  _Vue = Vue // 这样其他文件都可以使用 Vue 变量
  // 给所有组件混入一个属性 router
  Vue.mixin({ // 给所有组件的生命周期都增加beforeCreate方法
    beforeCreate() {
      // 将父组件传入的 router 注入到所有的子组件
      if(this.$options.router) { // 如果有router属性说明是根实例
        // _routerRoot 代表的是 vue 组件的实例，将根实例挂载在_routerRoot属性上
        this._routerRoot = this
        // _router 代表用户传过来的属性，将当前router实例挂载在_router上
        this._router = this.$options.router
        // 初始化
        this._router.init(this) // this 代表根实例
      } else {
        // 组件渲染是一层层的渲染
        // 无论是父组件还是子组件，都可以通过 this._routerRoot._router 获取共同实例
        // 保证所有子组件都拥有_routerRoot 属性，指向根实例
        // 保证所有组件都可以通过 this._routerRoot._router 拿到用户传递进来的路由实例对象
        this._routerRoot = this.$parent && this.$parent._routerRoot
      }
    }
  })
  Vue.component('router-link', {
    render: h => h('a', {}, '')
  })
  Vue.component('router-view', {
    render: h => h('div', {}, '')
  })
  Vue.prototype.$route = {}
  Vue.prototype.$router = {}
}
```

创建匹配器。

`plugins/vue-router/create-matcher.js`

```javascript
import createRouteMap from "./create-route-map"

export default function createMatcher(routes) {
  // 扁平化配置，收集所有的路由路径, 收集路径的对应渲染关系
  // pathMap = {'/': Home, '/login': Login, '/login/reg': Register, '/login/forget': Forget}
  let { pathList, pathMap } = createRouteMap(routes)

  // 这个方法就是动态加载路由的方法
  function addRoutes(routes) {
    // 将新增的路由追加到pathList和pathMap中
    createRouteMap(routes, pathList ,pathMap)
  }
  function match() {} // 稍后根据路径找到对应的记录
  return {
    addRoutes, // 动态添加路由
    match // 匹配路由
  }
}
```

### 编写createRouteMap方法
<font style="color:#2C3E50;">这里需要创建映射关系，需要 </font>`createRouteMap`<font style="color:#2C3E50;"> 方法，该方法主要是处理路径和不同路径对应的记录。</font>

`plugins/vue-router/create-route-map.js`

```javascript
// 将当前路由存储到pathList和pathMap中
function addRouteRecord(route, pathList, pathMap, parent){
  // 如果是子路由记录 需要增加前缀 
  let path = parent?`${parent.path}/${route.path}`:route.path
  let record = { // 提取需要的信息
    path,
    component: route.component,
    parent
  }
  if(!pathMap[path]) { // 不能定义重复的路由，否则只生效第一条
    pathList.push(path)
    pathMap[path] = record
  }
  if(route.children) {
    // 递归添加子路由
    route.children.forEach(childRoute => {
      addRouteRecord(childRoute, pathList, pathMap, route)
    })
  }
}

export default function createRouteMap(routes, oldPathList, oldPathMap) {
  // 当第一次加载的时候没有 pathList 和 pathMap
  let pathList = oldPathList || []
  let pathMap = oldPathMap || Object.create(null)
  routes.forEach(route => {
    // 添加到路由记录，用户配置可能是无限层级，稍后要递归调用此方法
    addRouteRecord(route, pathList, pathMap)
  })

  // 导出映射关系
  return {
    pathList,
    pathMap
  }
}
```

### 编写浏览器历史相关代码
`plugins/vue-router/history/base.js`

```javascript
// 存放路由状态
export function createRoute(record, location) {
  // ['/login', '/login/reg']
  let res = []
  if(record) {
    while(record) {
      res.unshift(record)
      record = record.parent
    }
  }

  return {
    ...location,
    matched: res
  }
}
class History {
  constructor(router) {
    this.router = router

    // 当我们创建完路由，先有一个默认值路径和匹配到的记录做成一个映射表
    // 默认当创建history时， 路径应该是 / 并且匹配到的记录是 []
    // this.current = { path: '/', matched: [] }
    this.current = createRoute(null, {
      path: '/'
    })
  }

  // 核心逻辑，跳转时都会调用此方法，路径变化了视图要刷新，响应式的数据原理
  transitionTo(location, onComplete) {
    // 去匹配路径
    // 相同路径不必过渡
    // route => {'/', matched: []}
    let route = this.router.match(location)
    
    // 这个 route 就是相当于最新匹配到的结果
    // 防止重复跳转
    if(location == this.current.path && route.matched.length == this.current.matched.length) {
      return
    }
    this.updateRoute(route)
    console.log(`更新 current`, `路由发生了变化`)
    onComplete && onComplete()
  }
  updateRoute(route) {
    // 每次路由切换都会更新 current 属性
    this.current = route
    this.cb && this.cb(route)
    // 视图重新渲染的几个要求？
    // 1.模板中要用
    // 2.current 是响应式的
  }
  listen(cb) {
    this.cb = cb
  }
}

export {
  History
}
```

`plugins/vue-router/history/hash.js`

```javascript
import { History } from "./base";

function ensureSlash() {
  if(window.location.hash) {
    return
  }
  window.location.hash = '/'
}

function getHash() {
  return window.location.hash.slice(1)
}
class HashHistory extends History{
  constructor(router) {
    super(router)
    this.router = router

    //  确保有hash, hash 模式下，有一个/路径
    ensureSlash()
  }
  getCurrentLocation() {
    return getHash()
  }
  setupListener() {
    window.addEventListener('hashchange', () => {
      // 当 hash 值变化了，再次拿到 hash 值进行跳转
      this.transitionTo(getHash())
    })
  }
}
export default HashHistory
```

`plugins/vue-router/history/history.js`

```javascript
import { History } from "./base";

class BrowserHistory extends History {
  constructor(router) {
    super(router)
    this.router = router
  }
}

export default BrowserHistory
```

`plugins/vue-router/index.js`

<font style="color:#2C3E50;">这里我们要分别实现 </font>`transitionTo`<font style="color:#2C3E50;">(基类方法)、 </font>`getCurrentLocation`<font style="color:#2C3E50;"> 、</font>`setupListener` 。

```javascript
import createMatcher from "./create-matcher"
import HashHistory from "./history/hash";
import BrowserHistory from "./history/history";
import install from "./install"

class VueRouter {
  constructor(options) {
    // 创建匹配器，可用于后续的匹配操作
    // 用户没有传递配置时默认为空数组
    // 1.match 通过路由来匹配组件
    // 2.addRoutes 动态添加路遇
    this.matcher = createMatcher(options.routes || [])

    // vue路由有三种模式 hash / h5api /abstract ,为了保证调用时方法一致。
    // 我们需要提供一个base类，在分别实现子类，不同模式下通过父类调用对应子类的方法
    options.mode = options.mode || 'hash' // 默认是hash模式
    switch (options.mode) {
      case 'hash':
        this.history = new HashHistory(this)
        break;
      case 'history':
        this.history = new BrowserHistory(this)
        break;
      default:
        break;
    }
    console.log(this.history)
  }
  init(app) {
    // 监听 hash 变化，默认跳转到对应的路径中
    const history = this.history

    // 让路由系统过度到某个路径
    const setUpHashListener = () => {
      history.setupListener() // 监听路径变化
    }

    // 父类提供方法负责跳转
    history.transitionTo(
      history.getCurrentLocation(), // 子类获取对应的路径
      setUpHashListener // 跳转成功后注册路径监听，为视图更新做准备
    )

    history.listen((route) => {
      app._route = route
    })
  }
  match(location) {
    return this.matcher.match(location)
  }
}
VueRouter.install = install
export default VueRouter
```

`plugins/vue-router/create-matcher.js`

```javascript
import createRouteMap from "./create-route-map"
import { createRoute } from './history/base'

export default function createMatcher(routes) {
  // 扁平化配置，收集所有的路由路径, 收集路径的对应渲染关系
  // pathMap = {'/': Home, '/login': Login, '/login/reg': Register, '/login/forget': Forget}
  let { pathList, pathMap } = createRouteMap(routes)

  // 这个方法就是动态加载路由的方法
  function addRoutes(routes) {
    // 将新增的路由追加到pathList和pathMap中
    createRouteMap(routes, pathList ,pathMap)
  }
  function match(location) { // 稍后根据路径找到对应的记录
    let record = pathMap[location] // 可能一个路径有多个记录
    if(record) {
      return createRoute(record, {
        path: location
      })
    }
    // record 不存在
    return createRoute(null, {
      path: location
    })
  }
  return {
    addRoutes, // 动态添加路由
    match // 匹配路由
  }
}
```

<font style="color:#2C3E50;">我们不难发现路径变化时都会更改</font>`current`<font style="color:#2C3E50;">属性，我们可以把</font>`current`<font style="color:#2C3E50;">属性变成响应式的，每次</font>`current`<font style="color:#2C3E50;">变化刷新视图即可。</font>

`Vue.util.defineReactive` 这个方法是`vue`中响应式数据变化的核心。

当路径变化时需要执行此回调更新`_route`属性， 在`init`方法中增加监听函数。

`plugins/vue-router/install.js`

```javascript
export let _Vue
export default function install(Vue, options){
  console.log(options)
  // 插件安装入口
  // 插件一般用于定义全局组件、全局指令、过滤器、原型方法...
  // https://cn.vuejs.org/v2/guide/plugins.html

  _Vue = Vue // 这样其他文件都可以使用 Vue 变量

  // 给所有组件混入一个属性 router
  Vue.mixin({ // 给所有组件的生命周期都增加beforeCreate方法
    beforeCreate() {
      // 将父组件传入的 router 注入到所有的子组件
      if(this.$options.router) { // 如果有router属性说明是根实例
        // _routerRoot 代表的是 vue 组件的实例，将根实例挂载在_routerRoot属性上
        this._routerRoot = this
        // _router 代表用户传过来的属性，将当前router实例挂载在_router上
        this._router = this.$options.router

        // 初始化
        this._router.init(this) // this 代表根实例

        // 获取 current 属性, 包装成响应式
        Vue.util.defineReactive(this, '_route', this._router.history.current)
        // console.log(this._route)
      } else {
        // 组件渲染是一层层的渲染
        // 无论是父组件还是子组件，都可以通过 this._routerRoot._router 获取共同实例
        // 保证所有子组件都拥有_routerRoot 属性，指向根实例
        // 保证所有组件都可以通过 this._routerRoot._router 拿到用户传递进来的路由实例对象
        this._routerRoot = this.$parent && this.$parent._routerRoot
      }
    }
  })

  Vue.component('router-link', {
    render: h => h('a', {}, '')
  })
  Vue.component('router-view', {
    render: h => h('div', {}, '')
  })

  Vue.prototype.$route = {}
  Vue.prototype.$router = {}
}
```

## 五、编写Router-Link组件
### 组件实现
`plugins/vue-router/components/link.js`

```javascript
	export default {
  name: 'routerLink',
  props: {
    to: {
      type: String,
      require: true
    },
    tag: {
      type: String,
      default: 'a'
    }
  },
  methods: {
    handler(to) {
      this.$router.push(to)
    }
  },
  render() {
    let { tag, to } = this
    // jsx 语法，绑定事件
  return <tag onclick={this.handler.bind(this, to)}>{this.$slots.default}</tag>
  }
}
```

### 组件注册
`plugins/vue-router/install.js`

```javascript
import Link from './components/link'
import View from './components/view'

export let _Vue
export default function install(Vue, options){
  console.log(options)
  // 插件安装入口
  // 插件一般用于定义全局组件、全局指令、过滤器、原型方法...
  // https://cn.vuejs.org/v2/guide/plugins.html

  _Vue = Vue // 这样其他文件都可以使用 Vue 变量

  // 给所有组件混入一个属性 router
  Vue.mixin({ // 给所有组件的生命周期都增加beforeCreate方法
    beforeCreate() {
      // 将父组件传入的 router 注入到所有的子组件
      if(this.$options.router) { // 如果有router属性说明是根实例
        // _routerRoot 代表的是 vue 组件的实例，将根实例挂载在_routerRoot属性上
        this._routerRoot = this
        // _router 代表用户传过来的属性，将当前router实例挂载在_router上
        this._router = this.$options.router

        // 初始化
        this._router.init(this) // this 代表根实例

        // 获取 current 属性, 包装成响应式
        Vue.util.defineReactive(this, '_route', this._router.history.current)
        // console.log(this._route)
      } else {
        // 组件渲染是一层层的渲染
        // 无论是父组件还是子组件，都可以通过 this._routerRoot._router 获取共同实例
        // 保证所有子组件都拥有_routerRoot 属性，指向根实例
        // 保证所有组件都可以通过 this._routerRoot._router 拿到用户传递进来的路由实例对象
        this._routerRoot = this.$parent && this.$parent._routerRoot
      }
    }
  })

  Vue.component('router-link', Link)
  Vue.component('router-view', View)

  // Vue.prototype.$route = {}
  Object.defineProperty(Vue.prototype, '$route', {
    get() {
      return this._routerRoot._route // 属性：path matched
    }
  })

  // Vue.prototype.$router = {}
  Object.defineProperty(Vue.prototype, '$router', {
    get() {
      return this._routerRoot._router // 方法：match push go replace
    }
  })
}
```

### API实现
`plugins/vue-router/index.js`

```javascript
import createMatcher from "./create-matcher"
import HashHistory from "./history/hash";
import BrowserHistory from "./history/history";
import install from "./install"

class VueRouter {
  constructor(options) {
    // 创建匹配器，可用于后续的匹配操作
    // 用户没有传递配置时默认为空数组
    // 1.match 通过路由来匹配组件
    // 2.addRoutes 动态添加路遇
    this.matcher = createMatcher(options.routes || [])

    // vue路由有三种模式 hash / h5api /abstract ,为了保证调用时方法一致。
    // 我们需要提供一个base类，在分别实现子类，不同模式下通过父类调用对应子类的方法
    options.mode = options.mode || 'hash' // 默认是hash模式
    switch (options.mode) {
      case 'hash':
        this.history = new HashHistory(this)
        break;
      case 'history':
        this.history = new BrowserHistory(this)
        break;
      default:
        break;
    }
    // console.log(this.history)
  }
  init(app) {
    // 监听 hash 变化，默认跳转到对应的路径中
    const history = this.history

    // 让路由系统过度到某个路径
    const setUpHashListener = () => {
      history.setupListener() // 监听路径变化
    }

    // 父类提供方法负责跳转
    history.transitionTo(
      history.getCurrentLocation(), // 子类获取对应的路径
      setUpHashListener // 跳转成功后注册路径监听，为视图更新做准备
    )

    history.listen((route) => {
      app._route = route
    })
  }
  match(location) {
    return this.matcher.match(location)
  }
  push(to) {
    this.history.push(to)
  }
  go() {}
  replace() {}
}
VueRouter.install = install
export default VueRouter
```

`plugins/vue-router/history/base.js`

```javascript
// 存放路由状态
export function createRoute(record, location) {
  // ['/login', '/login/reg']
  let res = []
  if(record) {
    while(record) {
      res.unshift(record)
      record = record.parent
    }
  }

  return {
    ...location,
    matched: res
  }
}
class History {
  constructor(router) {
    this.router = router

    // 当我们创建完路由，先有一个默认值路径和匹配到的记录做成一个映射表
    // 默认当创建history时， 路径应该是 / 并且匹配到的记录是 []
    // this.current = { path: '/', matched: [] }
    this.current = createRoute(null, {
      path: '/'
    })
  }

  // 核心逻辑，跳转时都会调用此方法，路径变化了视图要刷新，响应式的数据原理
  transitionTo(location, onComplete) {
    // 去匹配路径
    // 相同路径不必过渡
    // route => {'/', matched: []}
    let route = this.router.match(location)
    
    // 这个 route 就是相当于最新匹配到的结果
    // 防止重复跳转
    if(location == this.current.path && route.matched.length == this.current.matched.length) {
      return
    }
    this.updateRoute(route)
    console.log(`更新 current`, `路由发生了变化`)
    onComplete && onComplete()
  }
  updateRoute(route) {
    // 每次路由切换都会更新 current 属性
    this.current = route
    this.cb && this.cb(route)
    // 视图重新渲染的几个要求？
    // 1.模板中要用
    // 2.current 是响应式的
  }
  listen(cb) {
    this.cb = cb
  }
  push(location) {
    this.transitionTo(location, () => {
      window.location.hash = location
    })
  }
}

export {
  History
}
```

## 六、编写Router-View组件
`plugins/vue-router/components/view.js`

```javascript
export default {
  name: 'routerView',
  functional: true, // 函数式组件，特点：性能高，不用创建实例
  render(h, { parent, data }) { // 调用 render 方法，说明他一定是一个 routerView组件
    // 获取当前要渲染的记录
    let route = parent.$route
    let depth = 0
    data.routerView = true

    // App.vue 中渲染组件时，默认回调用 render 函数，父级组件中没有 data.routerView 属性
    // 渲染第一次，并且标识当前 routerView 为 true
    while(parent) { // router-view 的父组件
      // $vnode 代表占位符
      // _vnode.parentVnode = $vnode 组件内部渲染的虚拟节点
      if(parent.$vnode && parent.$vnode.data.routerView) {
        depth++
      }
      parent = parent.$parent
    }

    // 获取对应层级的记录
    let record = route.matched[depth]
    if(!record) {
      return h() // 空的虚拟节点 empty-vnode 注释节点
    }
    return h(record.component, data)
  }
}
```

## 七、beforeEach实现
### 完整的导航解析流程
1. 导航被触发。
2. 在失活的组件里调用 `beforeRouteLeave` 守卫。
3. 调用全局的 `beforeEach` 守卫。
4. 在重用的组件里调用 `beforeRouteUpdate` 守卫 (2.2+)。
5. 在路由配置里调用 `beforeEnter`。
6. 解析异步路由组件。
7. 在被激活的组件里调用 `beforeRouteEnter`。
8. 调用全局的 `beforeResolve` 守卫 (2.5+)。
9. 导航被确认。
10. 调用全局的 `afterEach` 钩子。
11. 触发 DOM 更新。
12. 调用 `beforeRouteEnter` 守卫中传给 `next` 的回调函数，创建好的组件实例会作为回调函数的参数传入。



### 钩子实现
`plugins/vue-router/index.js`

```javascript
import createMatcher from "./create-matcher"
import HashHistory from "./history/hash";
import BrowserHistory from "./history/history";
import install from "./install"

class VueRouter {
  constructor(options) {
    // 创建匹配器，可用于后续的匹配操作
    // 用户没有传递配置时默认为空数组
    // 1.match 通过路由来匹配组件
    // 2.addRoutes 动态添加路遇
    this.matcher = createMatcher(options.routes || [])

    // vue路由有三种模式 hash / h5api /abstract ,为了保证调用时方法一致。
    // 我们需要提供一个base类，在分别实现子类，不同模式下通过父类调用对应子类的方法
    options.mode = options.mode || 'hash' // 默认是hash模式
    switch (options.mode) {
      case 'hash':
        this.history = new HashHistory(this)
        break;
      case 'history':
        this.history = new BrowserHistory(this)
        break;
      default:
        break;
    }
    // console.log(this.history)
    this.beforeHooks = []
  }
  init(app) {
    // 监听 hash 变化，默认跳转到对应的路径中
    const history = this.history

    // 让路由系统过度到某个路径
    const setUpHashListener = () => {
      history.setupListener() // 监听路径变化
    }

    // 父类提供方法负责跳转
    history.transitionTo(
      history.getCurrentLocation(), // 子类获取对应的路径
      setUpHashListener // 跳转成功后注册路径监听，为视图更新做准备
    )

    history.listen((route) => {
      app._route = route
    })
  }
  match(location) {
    return this.matcher.match(location)
  } 
  push(to) {
    this.history.push(to)
  }
  go() {}
  replace() {}
  beforeEach(fn) {
    this.beforeHooks.push(fn)
  }

}
VueRouter.install = install
export default VueRouter
```

`plugins/vue-router/history/base.js`

```javascript
// 存放路由状态
export function createRoute(record, location) {
  // ['/login', '/login/reg']
  let res = []
  if(record) {
    while(record) {
      res.unshift(record)
      record = record.parent
    }
  }

  return {
    ...location,
    matched: res
  }
}

function runQueue(queue, iterator, cb) {
  // 异步迭代
  function step(index) {
    if(index >= queue.length) {
      return cb()
    }
    let hook = queue[index]
    // 先执行第一个，将第二个执行逻辑当作参数传入
    iterator(hook, () => step(index + 1))
  }
  step(0)
}
class History {
  constructor(router) {
    this.router = router

    // 当我们创建完路由，先有一个默认值路径和匹配到的记录做成一个映射表
    // 默认当创建history时， 路径应该是 / 并且匹配到的记录是 []
    // this.current = { path: '/', matched: [] }
    this.current = createRoute(null, {
      path: '/'
    })
  }

  // 核心逻辑，跳转时都会调用此方法，路径变化了视图要刷新，响应式的数据原理
  transitionTo(location, onComplete) {
    // 去匹配路径
    // 相同路径不必过渡
    // route => {'/', matched: []}
    let route = this.router.match(location)
    
    // 这个 route 就是相当于最新匹配到的结果
    // 防止重复跳转
    if(location == this.current.path && route.matched.length == this.current.matched.length) {
      return
    }

    // 在更新之前调用注册好的导航钩子守卫
    let queue = [].concat(this.router.beforeHooks)

    const iterator = (hook, next) => {
      hook(this.current, route, () => {
        next()
      })
    }

    runQueue(queue, iterator, () => {
      this.updateRoute(route)
      console.log(`更新 current`, `路由发生了变化`)
      onComplete && onComplete()
    })
  }
  updateRoute(route) {
    // 每次路由切换都会更新 current 属性
    this.current = route
    this.cb && this.cb(route)
    // 视图重新渲染的几个要求？
    // 1.模板中要用
    // 2.current 是响应式的
  }
  listen(cb) {
    this.cb = cb
  }
  push(location) {
    this.transitionTo(location, () => {
      window.location.hash = location
    })
  }
}

export {
  History
}
```

### 路由配置
`router.js`

```javascript

```



## 八、测试
### 入口
`main.js` 

```javascript
import Vue from 'vue'
import router from './router'
import App from './App'

new Vue({
  el: '#app',
  name: 'Root',
  router,
  render: (h) => {
    return h(App)
  }
})
```

### 页面
`App.vue` 

```vue
<template>
  <div>
    <div style="display:flex;justify-content: space-evenly;">
      <router-link to='/'>home</router-link>
      <router-link to='/login'>login</router-link>
    </div>
    <hr>
    <router-view></router-view>
  </div>
</template>

<script>
export default {
  name: 'App',
  mounted() {
    console.log(this._routerRoot._router)
  }
}
</script>
```

`views/home/index.vue` 

```vue
<template>
  <div>
    <h2>home</h2>
  </div>
</template>

<script>
export default {
  name: 'Home',
  mounted() {
    // 路由相关的属性
    console.dir(this.$route)
    // 路由相关的方法
    console.dir(this.$router)
  }
}
</script>
```

`views/user/login.vue`

```vue
<template>
  <div>
    <h2>login</h2>
    <hr>
     <div style="display:flex;justify-content: space-evenly;">
      <router-link to='/login/forget'>forget</router-link>
      <router-link to='/login/reg'>register</router-link>
    </div>
    <router-view></router-view>
  </div>
</template>
<script>
export default {
  name: 'Login'
}
</script>
```

### 路由配置
`router.js` 

```javascript
import Vue from 'vue'
import VueRouter from './plugins/vue-router/index'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    component: () => import('./views/home/index.vue')
  },
  {
    path: '/login',
    component: () => import('./views/user/login.vue'),
    children: [
      {
        path: 'forget',
        component: {
          render:(h) => h('h3', {}, 'forget')
        }
      },
      {
        path: 'reg',
        component: {
          render:(h) => h('h3', {}, 'register')
        }
      }
    ]
  }
]

const router = new VueRouter({
  mode: 'hash',
  routes
})

router.beforeEach((to, from, next) => {
  console.log('beforeEach', 1, to, from)
  setTimeout(() => {
    next()
  }, 1000)
})

router.beforeEach((to, from, next) => {
  console.log('beforeEach', 2, to, from)
  setTimeout(() => {
    next()
  }, 1000)
})


export default router
```



## 参考
[javascript基础修炼(6)——前端路由的基本原理 - 大史不说话 - 博客园](https://www.cnblogs.com/dashnowords/p/9671213.html)



[浅谈vue-router原理](https://www.jianshu.com/p/4295aec31302)



[插件 — Vue.js](https://cn.vuejs.org/v2/guide/plugins.html)



[浅析 vue-router 源码和动态路由权限分配 - 政采云前端团队](https://www.zoo.team/article/vue-router-analysis)

