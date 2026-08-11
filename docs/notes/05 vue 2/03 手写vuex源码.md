## 一.环境搭建
### 初始化
**通过 **`**vue create**` ** 创建项目**

```javascript
vue create vuex-source 
```

不添加 `vuex` 、 `vue-router`

<!-- 这是一张图片，ocr 内容为：t31 robin@Royan:-/Downloads/code/zf zfvuecreatevuex-source QD中 VueCLIy4.5.6 Newversionqvailable4.564.5.9 Runyarnglobaladd@vue/cli update! emen PLeasepickapreset:Manuallyselectfeatures Checkthefeaturesneededforyourproject:Babel MheredoyoupreferplacingconfigfoBei.ccnf files Savethisasapresetforfutureproject?No VueCLIV4.5.6 Creatingproiectin/users/robin/Downloads/code/zf/vuex-source Initializinggitrepository.. InstallingCLIplugins,Thismightakeahie yarninstallv1.21.1 NoLockfiLefound. info [1/4] ResoLvingpackages.. 预货 [2/4] Fetchingpackages. 272291063 2020-08-22 successSavedlockfile. Donein65.53s. Inyokingqenerators... dependencies. Installingadditionaldep -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1606801491342-0f0a2866-a68a-4283-8fb1-cae6918010d7.png)

### 配置目录
```javascript
src
│  App.vue     # 根组件
│  main.js     # 入口文件
├─api          # 存放接口
├─assets       # 存放资源
├─components   # 组件
├─plugins      # 生成的插件
├───vuex       # vuex的插件(手写)
└─store        # 存放vuex配置
```

<!-- 这是一张图片，ocr 内容为：yuax-5ource 口 Welcome Index.Js--Muex index.js-/atore index.js >Plugins>VUEX VUEX-SOURCE node_modules public babel.config.is README.md yarn.lock Ln1ColSpaces:2 mbAoobytesyjavascnptlindex.js -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1606801526819-717c1f26-34fc-42ea-bb29-267f3e7a4836.png)

## 二.Vuex初始化
### 目录搭建
<!-- 这是一张图片，ocr 内容为：yuex-Source EXPLORER OPENEDITORS VUEX-SOURCE nodemodules public src assets components HelloWorld.vue plugins/vuex helper.js index.js nO mixin.js module-collection.Js modulejs store-bak.js store.s utils.js home.store.js ShowAllCommands 货 home.title.storejs index.js GotoFIle user.storejs FindinFILes App.vue main-JJs StartDebugging F5 .browserslistrc gitignore TOGgLETERMINAl babel.contig.js README.md yarn.lock OUTLINE TIMELINE 040 CompileHero: -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1606917215329-1294cce1-fb12-4642-a122-78342d415c3d.png)

### install实现
`scr/plugins/vuex/store.js` 

```javascript
import applyMixin from "./mixin"

// 暴露Vue
export let Vue

// 容器初始化
export class Store {}

// 插件安装
// Vue.use 方法回调用插件的 install 方法，此方法中的参数就是 Vue 的构造器
export const install = (_Vue) => {
  Vue = _Vue
  // 需要将跟组件注入的store 分派给每一个组件(子组件)
  applyMixin(Vue)
}
```

### mixin实现
`scr/plugins/vuex/mixin.js`

```javascript
export default function applyMixin(Vue) {
  // vue内部会把生命周期函数，拍平成一个数组
  Vue.mixin({
    beforeCreate: vuexInit // 初始化
  })
}

function vuexInit() {
  // 1.给所有的组件增加$store 属性，指向我们创建的store 实例
  // console.log(this.$options.name)
  const options = this.$options // 获取用户所有的选项
  if(options.store) { // 根实例
    this.$store = options.store
  } else if(options.parent && options.parent.$store){ // 子孙组件
    this.$store = options.parent.$store
  }
}
```

### vuex入口实现
`scr/plugins/vuex/index.js`

```javascript
import { Store, install } from './store'

// 入口文件
export default {
  Store,
  install
}
```

### vuex配置
`scr/store/index.js`

```javascript
import Vue from 'vue'
import Vuex from '../plugins/vuex/index'

Vue.use(Vuex)

const store = new Vuex.Store({

})

export default store
```

### vuex使用
`scr/main.js`

```javascript
import Vue from 'vue'
import App from './App.vue'
import store from './store/index'

Vue.config.productionTip = false

new Vue({
  name: 'Root',
  store,
  render: h => h(App),
}).$mount('#app')

```

### vuex测试
`scr/App.vue`

```vue
<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png">
    <HelloWorld msg="Welcome to Your Vue.js App"/>
  </div>
</template>

<script>
import HelloWorld from './components/HelloWorld.vue'

export default {
  name: 'App',
  components: {
    HelloWorld
  },
  mounted() {
    console.log(this.$store)
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>

```

## 三.Vuex模块实现
### state实现
将用户传入的数据定义在 `vue` 的实例上 （这个就是 `vuex` 核心）产生一个单独的 `vue` 实例进行通信，这里要注意的是定义 `$` 开头的变量不会被代理到实例上。

`scr/plugins/vuex/store.js`

```javascript
import applyMixin from "./mixin"

// 暴露Vue
export let Vue

// 容器初始化
export class Store {
  // options 就是 new Vuex.Store({state, mutation, actions, getters, modules, plugins, strict, devtools })
  constructor(options) {
    const state = options.state
    // 1.添加状态逻辑
    this._vm = new Vue({
      data: { // 属性如果是通过$ 开头的，默认不会将这个属性挂载到实例上
        $$state: state // 会将$$state 对应的对象，都通过 defineProperty来进行属性劫持
      }
    })
  }
  get state() {
    return this._vm._data.$$state
  }
}

// 插件安装
// Vue.use 方法回调用插件的 install 方法，此方法中的参数就是 Vue 的构造器
export const install = (_Vue) => {
  Vue = _Vue
  // 需要将跟组件注入的store 分派给每一个组件(子组件)
  applyMixin(Vue)
}
```

测试

`scr/store/index.js`

```javascript
import Vue from 'vue'
import Vuex from '../plugins/vuex/index'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    name: 'robin'
  }
})

export default store
```

`scr/componnets/HelloWorld.vue`

```javascript
<template>
  <div class="hello">
    <h3>{{ msg }}</h3>
    <h4>{{ this.$store.state.name}}</h4>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  mounted() {
    setTimeout(() => {
      this.$store.state.name = 'jack'
    }, 2000);
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
</style>
```

### getters实现
利用vue的computed属性的多次取值，值相同是取缓存的特性，是实现getters 属性。

`scr/plugins/vuex/store.js`

```javascript
import applyMixin from "./mixin"
import { forEachValue } from "./utils"

// 暴露Vue
export let Vue

// 容器初始化
export class Store {
  // options 就是 new Vuex.Store({state, mutation, actions, getters, modules, plugins, strict, devtools })
  constructor(options) {
    const state = options.state
    const computed = {} // getters 缓存使用

    // 2.添加getters逻辑
    // getters 属性具有缓存的
    this.getters = {}
    forEachValue(options.getters, (fn, key) => {
      // 将用户的 getters 定义在实例上
      computed[key] = () => fn(this.state)
      Object.defineProperty(this.getters, key, {
        // 当执行取值时，执行计算属性逻辑
        get: () => this._vm[key]
      })
    })

    // 1.添加状态逻辑
    this._vm = new Vue({
      data: { // 属性如果是通过$ 开头的，默认不会将这个属性挂载到实例上
        $$state: state // 会将$$state 对应的对象，都通过 defineProperty来进行属性劫持
      },
      computed
    })
  }
  get state() {
    return this._vm._data.$$state
  }
}

// 插件安装
// Vue.use 方法回调用插件的 install 方法，此方法中的参数就是 Vue 的构造器
export const install = (_Vue) => {
  Vue = _Vue
  // 需要将跟组件注入的store 分派给每一个组件(子组件)
  applyMixin(Vue)
}
```

工具类

`scr/plugins/vuex/uitls.js`

```javascript
/**
 * 遍历对象
 * @param {对象} obj 
 * @param {回调函数} callback 
 */
export const forEachValue = (obj, callback) => {
  Object.keys(obj).forEach(key => callback(obj[key], key))
}
```

测试

`scr/store/index.js`

```javascript
import Vue from 'vue'
import Vuex from '../plugins/vuex/index'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    name: 'robin',
    age: 18
  },
  getters:{
    getAge(state) {
      console.log('getAge', state.age) // 多次取值，值不变时，只会打印一次
      return state.age
    },
    getName: state => state.name
  }
})

export default store
```

`scr/componnets/HelloWorld.vue`

```vue
<template>
  <div class="hello">
    <h3>{{ msg }}</h3>
    <h4>{{ this.$store.state.name}}</h4>
    <h4>{{ this.$store.getters.getAge}}</h4>
    <h4>{{ this.$store.getters.getAge}}</h4>
    <h4>{{ this.$store.getters.getAge}}</h4>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  mounted() {
    setTimeout(() => {
      this.$store.state.name = 'jack'
      this.$store.state.age = 30
    }, 2000);
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
</style>
```

### mutations实现
`scr/plugins/vuex/store.js`

```javascript
import applyMixin from "./mixin"
import { forEachValue } from "./utils"

// 暴露Vue
export let Vue

// 容器初始化
export class Store {
  // options 就是 new Vuex.Store({state, mutation, actions, getters, modules, plugins, strict, devtools })
  constructor(options) {
    const state = options.state
    const computed = {} // getters 缓存使用

    // 2.添加getters逻辑
    // getters 属性具有缓存的
    this.getters = {}
    forEachValue(options.getters, (fn, key) => {
      // 将用户的 getters 定义在实例上
      computed[key] = () => fn(this.state)
      Object.defineProperty(this.getters, key, {
        // 当执行取值时，执行计算属性逻辑
        get: () => this._vm[key]
      })
    })

    // 1.添加状态逻辑
    this._vm = new Vue({
      data: { // 属性如果是通过$ 开头的，默认不会将这个属性挂载到实例上
        $$state: state // 会将$$state 对应的对象，都通过 defineProperty来进行属性劫持
      },
      computed
    })

    // 3.添加mutations逻辑
    this.mutations = {}
    forEachValue(options.mutations, (fn, key) => { // 绑定 mutations
      this.mutations[key] = (payload) => fn(this.state, payload)
    })
    // 4.添加actions逻辑
  }
  get state() {
    return this._vm._data.$$state
  }
  commit = (type, payload) => { // 保证当前this，永远指向当前 store 实例
    // 调用 commit 其实就是去找绑定在 mutations 上的用户方法
    this.mutations[type](payload)
  }
}

// 插件安装
// Vue.use 方法回调用插件的 install 方法，此方法中的参数就是 Vue 的构造器
export const install = (_Vue) => {
  Vue = _Vue
  // 需要将跟组件注入的store 分派给每一个组件(子组件)
  applyMixin(Vue)
}

```

测试

`scr/store/index.js`

```javascript
import Vue from 'vue'
import Vuex from '../plugins/vuex/index'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    name: 'robin',
    age: 18
  },
  getters:{
    getAge(state) {
      console.log('getAge', state.age) // 多次取值，值不变时，只会打印一次
      return state.age
    },
    getName: state => state.name
  },
  mutations: {
    CHANGE_NAME(state, payload) {
      state.name = payload
    },
    CHANGE_AGE(state, payload) {
      state.age = payload
    }
  }
})

export default store
```

`scr/componnets/HelloWorld.vue`

```vue
<template>
  <div class="hello">
    <h3>{{ msg }}</h3>
    <h4><button @click="changeName">修改名字</button></h4>
    <h4>{{ this.$store.state.name}}</h4>
    <h4>{{ this.$store.getters.getAge}}</h4>
    <h4>{{ this.$store.getters.getAge}}</h4>
    <h4>{{ this.$store.getters.getAge}}</h4>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  mounted() {
    setTimeout(() => {
      this.$store.state.name = 'jack'
      this.$store.state.age = 30
    }, 2000);
  },
  methods: {
    changeName() {
      this.$store.commit('CHANGE_NAME', 'sb')
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
</style>
```

### actions实现
`scr/plugins/vuex/store.js`

```javascript
import applyMixin from "./mixin"
import { forEachValue } from "./utils"

// 暴露Vue
export let Vue

// 容器初始化
export class Store {
  // options 就是 new Vuex.Store({state, mutation, actions, getters, modules, plugins, strict, devtools })
  constructor(options) {
    const state = options.state
    const computed = {} // getters 缓存使用

    // 2.添加getters逻辑
    // getters 属性具有缓存的
    this.getters = {}
    forEachValue(options.getters, (fn, key) => {
      // 将用户的 getters 定义在实例上
      computed[key] = () => fn(this.state)
      Object.defineProperty(this.getters, key, {
        // 当执行取值时，执行计算属性逻辑
        get: () => this._vm[key]
      })
    })

    // 1.添加状态逻辑
    this._vm = new Vue({
      data: { // 属性如果是通过$ 开头的，默认不会将这个属性挂载到实例上
        $$state: state // 会将$$state 对应的对象，都通过 defineProperty来进行属性劫持
      },
      computed
    })

    // 3.添加mutations逻辑
    this.mutations = {}
    forEachValue(options.mutations, (fn, key) => { // 绑定 mutations
      this.mutations[key] = (payload) => fn(this.state, payload)
    })
    // 4.添加actions逻辑
    this.actions = {}
    forEachValue(options.actions, (fn, key) => {
      this.actions[key] = (payload) => fn(this, payload)
    })
  }
  get state() {
    return this._vm._data.$$state
  }
  // 在严格模式下，commit 和 dispatch 是有区别的
  commit = (type, payload) => { // 保证当前this，永远指向当前 store 实例
    // 调用 commit 其实就是去找绑定在 mutations 上的用户方法
    this.mutations[type](payload)
  }
  dispatch = (type, payload) => {
    this.actions[type](payload)
  }
}

// 插件安装
// Vue.use 方法回调用插件的 install 方法，此方法中的参数就是 Vue 的构造器
export const install = (_Vue) => {
  Vue = _Vue
  // 需要将跟组件注入的store 分派给每一个组件(子组件)
  applyMixin(Vue)
}
```

测试

`scr/store/index.js`

```javascript
import Vue from 'vue'
import Vuex from '../plugins/vuex/index'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    name: 'robin',
    age: 18
  },
  getters:{
    getAge(state) {
      console.log('getAge', state.age) // 多次取值，值不变时，只会打印一次
      return state.age
    },
    getName: state => state.name
  },
  mutations: {
    CHANGE_NAME(state, payload) {
      state.name = payload
    },
    CHANGE_AGE(state, payload) {
      state.age = payload
    }
  },
  actions: {
    changeName({ commit }, payload) {
      setTimeout(() => {
        commit('CHANGE_NAME', payload)
      }, 1000)
    },
    changeAge({ commit }, payload) {
      setTimeout(() => {
        commit('CHANGE_AGE', payload)
      }, 1000);
    }
  }
})

export default store
```

`scr/componnets/HelloWorld.vue`

```vue
<template>
  <div class="hello">
    <h3>{{ msg }}</h3>
    <h4><button @click="changeName">修改名字</button></h4>
    <h4><button @click="changeAge">修改年龄(异步)</button></h4>
    <h4>{{ this.$store.state.name}}</h4>
    <h4>{{ this.$store.getters.getAge}}</h4>
    <h4>{{ this.$store.getters.getAge}}</h4>
    <h4>{{ this.$store.getters.getAge}}</h4>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  mounted() {
    setTimeout(() => {
      this.$store.state.name = 'jack'
      this.$store.state.age = 30
    }, 2000);
  },
  methods: {
    changeName() {
      this.$store.commit('CHANGE_NAME', 'sb')
    },
    changeAge() {
      this.$store.dispatch('changeAge', 8)
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
</style>
```

## 四、模块机制实现
### 格式化用户数据
`scr/plugins/vuex/store.js`

```javascript
import applyMixin from "./mixin"
import ModuleCollection from "./module-collection"
import { forEachValue } from "./utils"

// 暴露Vue
export let Vue

// 容器初始化
export class Store {
  // options 就是 new Vuex.Store({state, mutation, actions, getters, modules, plugins, strict, devtools })
  constructor(options) {
    const state = options.state
    // 数据格式化
    this._modules = new ModuleCollection(options)
    console.log(this._modules)
  }
  get state() {
    return this._vm._data.$$state
  }
  // 在严格模式下，commit 和 dispatch 是有区别的
  commit = (type, payload) => { // 保证当前this，永远指向当前 store 实例
    // 调用 commit 其实就是去找绑定在 mutations 上的用户方法
    this.mutations[type](payload)
  }
  dispatch = (type, payload) => {
    this.actions[type](payload)
  }
}

// 插件安装
// Vue.use 方法回调用插件的 install 方法，此方法中的参数就是 Vue 的构造器
export const install = (_Vue) => {
  Vue = _Vue
  // 需要将跟组件注入的store 分派给每一个组件(子组件)
  applyMixin(Vue)
}

```

`scr/plugins/vuex/module-collection.js`

```javascript
import { forEachValue } from "./utils"

/**
 * this.root = {
 *  _raw: '根模块',
 *  _children: {
 *   home: {
 *     _raw: 'home模块',
 *     _children: {}
 *     state: 'home模块的状态'
 *   },
 *   user: {
 *     _raw: 'home模块',
 *     _children: {}
 *     state: 'home模块的状态'
 *   }
 *  },
 *  state: '根模块的状态'
 * }
 */
class ModuleCollection {
  constructor(options) {
    this.register([], options) // stack 栈结构 ['根对象', 'home', 'title']
  }
  register(path, rootModule) {
    let newModule = { // 格式化后的结果
      _raw: rootModule, // 原来的模块(用户定义的)
      _children: {}, // 子模块
      state: rootModule.state // 当前模块的状态
    }
    if(path.length == 0) {
      // 根模块
      this.root = newModule
    } else {
      const parent = path.slice(0, -1).reduce((memo, current) => {
        return memo._children[current]
      }, this.root)
      parent._children[path[path.length - 1]] = newModule
    }
    if(rootModule.modules) { // 有子模块的情况
      // 循环模块
      forEachValue(rootModule.modules, (module, moduleName) => {
        this.register(path.concat(moduleName), module)
      })
    }
  }
}
export default ModuleCollection
```

### 抽离模块类
`scr/plugins/vuex/module.js`

```javascript
class Module {
  constructor(rawModule) {
    this._raw = rawModule // 原来的模块(用户定义的)
    this._children = {} // 子模块
    this.state = rawModule.state // 当前模块的状态
  }
  getChild(key) {
    return this._children[key]
  }
  addChild(key, module) {
    this._children[key] = module
  }
}

export default Module
```

`scr/plugins/vuex/module-collection.js`

```javascript
import Module from "./module"
import { forEachValue } from "./utils"

class ModuleCollection {
  constructor(options) {
    this.register([], options) // stack 栈结构 ['根对象', 'home', 'title']
  }
  register(path, rootModule) {
    // 格式化后的结果
    let newModule = new Module(rootModule)

    if(path.length == 0) {
      // 根模块
      this.root = newModule
    } else {
      const parent = path.slice(0, -1).reduce((memo, current) => {
        return memo.getChild(current)
      }, this.root)
      parent.addChild(path[path.length - 1], newModule)
    }
    if(rootModule.modules) { // 有子模块的情况
      // 循环模块
      forEachValue(rootModule.modules, (module, moduleName) => {
        this.register(path.concat(moduleName), module)
      })
    }
  }
}
export default ModuleCollection
```

### 安装模块
<font style="color:#2C3E50;">对模块进行安装操作，</font><font style="color:#2C3E50;">对</font>`dispatch`<font style="color:#2C3E50;">和 </font>`action`<font style="color:#2C3E50;">方法进行重写。</font>

`scr/plugins/vuex/store.js`

```javascript
import applyMixin from "./mixin"
import ModuleCollection from "./module-collection"
import { forEachValue } from "./utils"

// 暴露Vue
export let Vue

/**
 * 初始化模块
 * @param {容器} store 
 * @param {根模块} rootState 
 * @param {路径} path 
 * @param {格式化后的数据} module 
 */
const installModule = (store, rootState, path, module) => {
  module.forEachMutation((mutation, key) => {
    store._mutations[key] = store._mutations[key] || []
    store._mutations[key].push((payload) => {
      mutation.call(store, module.state, payload)
    })
  })
  module.forEachAction((action, key) => {
    store._actions[key] = store._actions[key] || []
    store._actions[key].push((payload) => {
      action.call(store, store, payload)
    })
  })
  module.forEachGetter((getter, key) => {
    // 模块中getters的名字重复会覆盖
    store._wrappedGetters[key] = function() {
      return getter(module.state)
    }
  })
  module.forEachChild((child, key) => {
    // 递归加载模块
    installModule(store, rootState, path.concat(key), child)
  })
}

// 容器初始化
export class Store {
  // options 就是 new Vuex.Store({state, mutation, actions, getters, modules, plugins, strict, devtools })
  constructor(options) {
    const state = options.state
    // 1.数据格式化，格式化的结果是树结构
    this._modules = new ModuleCollection(options)
    console.log(this._modules)

    // 2.安装模块
    this._actions = {}
    this._mutations = {}
    this._wrappedGetters = {}

    // 根模块的状态中，要将子模块通过模块名定义在根模块上
    installModule(this, state, [], this._modules.root)
  }
  get state() {
    return this._vm._data.$$state
  }
  // 在严格模式下，commit 和 dispatch 是有区别的
  commit = (type, payload) => { // 保证当前this，永远指向当前 store 实例
    // 调用 commit 其实就是去找绑定在 mutations 上的用户方法
    this.mutations[type].forEach(fn => fn.cal(this, payload))
  }
  dispatch = (type, payload) => {
    this.actions[type].forEach(fn => fn.call(this, payload))
  }
}

// 插件安装
// Vue.use 方法回调用插件的 install 方法，此方法中的参数就是 Vue 的构造器
export const install = (_Vue) => {
  Vue = _Vue
  // 需要将跟组件注入的store 分派给每一个组件(子组件)
  applyMixin(Vue)
}
```

<font style="color:#2C3E50;">在模块类中提供遍历方法</font>

`scr/plugins/vuex/module.js`

```javascript
import { forEachValue } from "./utils"

class Module {
  constructor(rawModule) {
    this._raw = rawModule // 原来的模块(用户定义的)
    this._children = {} // 子模块
    this.state = rawModule.state // 当前模块的状态
  }
  getChild(key) {
    return this._children[key]
  }
  addChild(key, module) {
    this._children[key] = module
  }
  forEachMutation(fn) {
    if(this._raw.mutations) {
      forEachValue(this._raw.mutations, fn)
    }
  }
  forEachAction(fn) {
    if(this._raw.actions) {
      forEachValue(this._raw.actions, fn)
    }
  }
  forEachGetter(fn) {
    if(this._raw.getters) {
      forEachValue(this._raw.getters, fn)
    }
  }
  forEachChild(fn) {
    forEachValue(this._children, fn)
  }
}

export default Module
```

### 定义状态和计算属性
`scr/plugins/vuex/store.js`

```javascript
import applyMixin from "./mixin"
import ModuleCollection from "./module-collection"
import { forEachValue } from "./utils"

// 暴露Vue
export let Vue

/**
 * 初始化模块
 * @param {容器} store 
 * @param {根模块} rootState 
 * @param {路径} path 
 * @param {格式化后的数据} module 
 */
const installModule = (store, rootState, path, module) => {

  // 状态
  // 将所有的子模块的状态安装到父模块的状态上
  if(path.length > 0) { // vuex 可以动态的添加模块
    let parent = path.slice(0, -1).reduce((memo, current) => {
      return memo[current]
    }, rootState)

    // 如果这个对象本身不是响应式的，那么 Vue.set 就相当于 obj[属性] = 值
    Vue.set(parent, path[path.length - 1], module.state)
  }

  module.forEachMutation((mutation, key) => {
    store._mutations[key] = store._mutations[key] || []
    store._mutations[key].push((payload) => {
      mutation.call(store, module.state, payload)
    })
  })
  module.forEachAction((action, key) => {
    store._actions[key] = store._actions[key] || []
    store._actions[key].push((payload) => {
      action.call(store, store, payload)
    })
  })
  module.forEachGetter((getter, key) => {
    // 模块中getters的名字重复会覆盖
    store._wrappedGetters[key] = function(state) {
      return getter(state)
    }
  })
  module.forEachChild((child, key) => {
    // 递归加载模块
    installModule(store, rootState, path.concat(key), child)
  })
}

function restStoreVM(store, state) {
  const computed = {} // 定义计算属性
  store.getters = {} // 定义 store 中的 getters

  forEachValue(store._wrappedGetters, (fn, key) => {
    computed[key] = () => {
      return fn(store.state)
    }
    Object.defineProperty(store.getters, key, {
      get: () => store._vm[key] // 去计算属性取值
    })
  })
  store._vm = new Vue({
    data: {
      $$state: state
    },
    computed // 计算属性有缓存特性
  })
}

// 容器初始化
export class Store {
  // options 就是 new Vuex.Store({state, mutation, actions, getters, modules, plugins, strict, devtools })
  constructor(options) {
    const state = options.state
    // 1.数据格式化，格式化的结果是树结构
    this._modules = new ModuleCollection(options)

    // 2.安装模块
    this._actions = {}
    this._mutations = {}
    this._wrappedGetters = {}

    // 根模块的状态中，要将子模块通过模块名定义在根模块上
    installModule(this, state, [], this._modules.root)
    // console.log(state)

    // 3.将状态和getters都定义在当前vm上
    restStoreVM(this, state)
  }
  get state() {
    return this._vm._data.$$state
  }
  // 在严格模式下，commit 和 dispatch 是有区别的
  commit = (type, payload) => { // 保证当前this，永远指向当前 store 实例
    // 调用 commit 其实就是去找绑定在 mutations 上的用户方法
    this._mutations[type].forEach(fn => fn.call(this, payload))
  }
  dispatch = (type, payload) => {
    this._actions[type].forEach(fn => fn.call(this, payload))
  }
}

// 插件安装
// Vue.use 方法回调用插件的 install 方法，此方法中的参数就是 Vue 的构造器
export const install = (_Vue) => {
  Vue = _Vue
  // 需要将跟组件注入的store 分派给每一个组件(子组件)
  applyMixin(Vue)
}
```

### 实现命名空间
<font style="color:#2C3E50;">在绑定属性时增加命名空间。</font>

`scr/plugins/vuex/store.js`

```javascript
import applyMixin from "./mixin"
import ModuleCollection from "./module-collection"
import { forEachValue } from "./utils"

// 暴露Vue
export let Vue

/**
 * 获取最新的状态
 * @param {*} store 
 * @param {*} path 
 */
function getState(store, path) {
  return path.reduce((newState, current) => {
    return newState[current]
  }, store.state)
}
/**
 * 初始化模块
 * @param {容器} store 
 * @param {根模块} rootState 
 * @param {路径} path 
 * @param {格式化后的数据} module 
 */
const installModule = (store, rootState, path, module) => {
  // 给当前订阅的事件，增加一个命名空间
  // 例如:home/changeAge user/changeAge home/title/changeAge
  let namespaced = store._modules.getNamespaced(path) // 返回前缀
  // console.log(namespaced)
  
  // 状态
  // 将所有的子模块的状态安装到父模块的状态上
  if(path.length > 0) { // vuex 可以动态的添加模块
    let parent = path.slice(0, -1).reduce((memo, current) => {
      return memo[current]
    }, rootState)

    // 如果这个对象本身不是响应式的，那么 Vue.set 就相当于 obj[属性] = 值
    Vue.set(parent, path[path.length - 1], module.state)
  }

  module.forEachMutation((mutation, key) => {
    key = namespaced + key
    store._mutations[key] = store._mutations[key] || []
    store._mutations[key].push((payload) => {
      mutation.call(store, getState(store, path), payload, namespaced)
    })
  })
  module.forEachAction((action, key) => {
    key = namespaced + key
    store._actions[key] = store._actions[key] || []
    store._actions[key].push((payload) => {
      action.call(store, store, payload)
    })
  })
  module.forEachGetter((getter, key) => {
    key = namespaced + key
    // 模块中getters的名字重复会覆盖
    store._wrappedGetters[key] = function() {
      return getter(getState(store, path))
    }
  })
  module.forEachChild((child, key) => {
    // 递归加载模块
    installModule(store, rootState, path.concat(key), child)
  })
}

function restStoreVM(store, state) {
  const computed = {} // 定义计算属性
  store.getters = {} // 定义 store 中的 getters

  forEachValue(store._wrappedGetters, (fn, key) => {
    computed[key] = () => {
      return fn(store.state)
    }
    Object.defineProperty(store.getters, key, {
      get: () => store._vm[key] // 去计算属性取值
    })
  })
  store._vm = new Vue({
    data: {
      $$state: state
    },
    computed // 计算属性有缓存特性
  })
}

// 容器初始化
export class Store {
  // options 就是 new Vuex.Store({state, mutation, actions, getters, modules, plugins, strict, devtools })
  constructor(options) {
    const state = options.state
    // 1.数据格式化，格式化的结果是树结构
    this._modules = new ModuleCollection(options)

    // 2.安装模块
    this._actions = {}
    this._mutations = {}
    this._wrappedGetters = {}

    // 根模块的状态中，要将子模块通过模块名定义在根模块上
    installModule(this, state, [], this._modules.root)
    // console.log(state)

    // 3.将状态和getters都定义在当前vm上
    restStoreVM(this, state)
  }
  get state() {
    return this._vm._data.$$state
  }
  // 在严格模式下，commit 和 dispatch 是有区别的
  commit = (type, payload) => { // 保证当前this，永远指向当前 store 实例
    // 调用 commit 其实就是去找绑定在 mutations 上的用户方法
    this._mutations[type].forEach(fn => fn.call(this, payload))
  }
  dispatch = (type, payload) => {
    this._actions[type].forEach(fn => fn.call(this, payload))
  }
}

// 插件安装
// Vue.use 方法回调用插件的 install 方法，此方法中的参数就是 Vue 的构造器
export const install = (_Vue) => {
  Vue = _Vue
  // 需要将跟组件注入的store 分派给每一个组件(子组件)
  applyMixin(Vue)
}

```

`scr/plugins/vuex/module.js`

```javascript
import { forEachValue } from "./utils"

class Module {
  constructor(rawModule) {
    this._raw = rawModule // 原来的模块(用户定义的)
    this._children = {} // 子模块
    this.state = rawModule.state // 当前模块的状态
  }
  getChild(key) {
    return this._children[key]
  }
  addChild(key, module) {
    this._children[key] = module
  }
  forEachMutation(fn) {
    if(this._raw.mutations) {
      forEachValue(this._raw.mutations, fn)
    }
  }
  forEachAction(fn) {
    if(this._raw.actions) {
      forEachValue(this._raw.actions, fn)
    }
  }
  forEachGetter(fn) {
    if(this._raw.getters) {
      forEachValue(this._raw.getters, fn)
    }
  }
  forEachChild(fn) {
    forEachValue(this._children, fn)
  }
  get namespaced() {
    return !!this._raw.namespaced
  }
}

export default Module
```



`scr/plugins/vuex/module-collection.js`

```javascript
import Module from "./module"
import { forEachValue } from "./utils"

class ModuleCollection {
  constructor(options) {
    this.register([], options) // stack 栈结构 ['根对象', 'home', 'title']
  }
  register(path, rootModule) {
    // 格式化后的结果
    let newModule = new Module(rootModule)

    if(path.length == 0) {
      // 根模块
      this.root = newModule
    } else {
      const parent = path.slice(0, -1).reduce((memo, current) => {
        return memo.getChild(current)
      }, this.root)
      parent.addChild(path[path.length - 1], newModule)
    }
    if(rootModule.modules) { // 有子模块的情况
      // 循环模块
      forEachValue(rootModule.modules, (module, moduleName) => {
        this.register(path.concat(moduleName), module)
      })
    }
  }
  getNamespaced(path) {
    let root = this.root // 从根模块开始找
    return path.reduce((str, key) => {
      root = root.getChild(key) // 不停的去找当前模块
      return str + (root.namespaced ? `${key}/` : ``)
    }, '')
  }
}
export default ModuleCollection
```



### 测试
`scr/componnets/HelloWorld.vue`

```vue
<template>
  <div class="hello">
    <h3>{{ msg }}</h3>
    <hr>
    <h3>根模块</h3>
    <h4><button @click="changeName">修改名字</button></h4>
    <h4><button @click="changeAge">修改年龄(异步)</button></h4>
    <h4><span>this.$store.state.name: </span>{{ this.$store.state.name}}</h4>
    <h4><span>this.$store.getters.getAge: </span>{{ this.$store.getters.getAge}}</h4>
    <hr>
    <h3>home模块</h3>
    <h4><button @click="changeHomeName">修改名字</button></h4>
    <h4><button @click="changeHomeAge">修改年龄(异步)</button></h4>
    <h4><span>this.$store.state.home.name: </span>{{ this.$store.state.home.name}}</h4>
    <h4><span>this.$store.getters.home.getAge: </span>{{ this.$store.getters['home/getAge']}}</h4>
    <h3>home -> title模块</h3>
    <h4><button @click="changeTitleName">修改名字</button></h4>
    <h4><button @click="changeTitleAge">修改年龄(异步)</button></h4>
    <h4><span>this.$store.state.home.title.name: </span>{{ this.$store.state.home.title.name}}</h4>
    <h4><span>this.$store.getters.home.title.getAge: </span>{{ this.$store.getters['home/title/getAge']}}</h4>
    <h3>user模块</h3>
    <h4><button @click="changeUserName">修改名字</button></h4>
    <h4><button @click="changeUserAge">修改年龄(异步)</button></h4>
    <h4><span>this.$store.state.user.name: </span>{{ this.$store.state.user.name}}</h4>
    <h4><span>this.$store.getters.user.getAge: </span>{{ this.$store.getters['user/getAge']}}</h4>
    
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  mounted() {
    setTimeout(() => {
      this.$store.state.name = 'jack'
      this.$store.state.age = 30
    }, 2000);
  },
  methods: {
    changeName() {
      this.$store.commit('CHANGE_NAME', 'sb')
    },
    changeAge() {
      this.$store.dispatch('changeAge', parseInt((Math.random() * 100)))
    },
    changeHomeName() {
      this.$store.commit('home/CHANGE_NAME', 'sb-home')
    },
    changeHomeAge() {
      this.$store.dispatch('home/changeAge', parseInt((Math.random() * 100)))
    },
    changeUserName() {
      this.$store.commit('user/CHANGE_NAME', 'sb-user')
    },
    changeUserAge() {
      this.$store.dispatch('user/changeAge', parseInt((Math.random() * 100)))
    },
    changeTitleName() {
      this.$store.commit('home/title/CHANGE_NAME', 'sb-home-title')
    },
    changeTitleAge() {
      this.$store.dispatch('home/title/changeAge', parseInt((Math.random() * 100)))
    },
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
</style>
```

`scr/store/index.vue`

```javascript
import Vue from 'vue'
import Vuex from '../plugins/vuex/index'
// import Vuex from 'vuex'
import user from './user.store'
import home from './home.store'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    name: 'robin',
    age: 8
  },
  getters:{
    getAge(state) {
      console.log('getAge', state.age) // 多次取值，值不变时，只会打印一次
      return state.age
    },
    getName: state => state.name
  },
  mutations: {
    CHANGE_NAME(state, payload) {
      state.name = payload
    },
    CHANGE_AGE(state, payload) {
      state.age = payload
    }
  },
  actions: {
    changeName({ commit }, payload) {
      setTimeout(() => {
        commit('CHANGE_NAME', payload)
      }, 1000)
    },
    changeAge({ commit }, payload) {
      setTimeout(() => {
        commit('CHANGE_AGE', payload)
      }, 1000);
    }
  },
  modules: {
    home,
    user
  }
})

export default store
```

`scr/store/home.store.vue`

```javascript
import title from './home.title.store'
export default {
  namespaced: true,
  state: {
    name: 'home',
    age: 18
  },
  getters:{
    getAge(state) {
      console.log('getAge', state.age) // 多次取值，值不变时，只会打印一次
      return state.age
    },
    getName: state => state.name
  },
  mutations: {
    CHANGE_NAME(state, payload) {
      state.name = payload
    },
    CHANGE_AGE(state, payload) {
      debugger
      state.age = payload
    }
  },
  actions: {
    changeName({ commit }, payload) {
      setTimeout(() => {
        commit('CHANGE_NAME', payload)
      }, 1000)
    },
    changeAge({ commit }, payload) {
      setTimeout(() => {
        commit('CHANGE_AGE', payload)
      }, 1000);
    }
  },
  modules: {
    title
  }
}
```



`scr/store/home.title.store.vue`

```javascript
export default {
  namespaced: true,
  state: {
    name: 'title',
    age: 0
  },
  getters:{
    getAge(state) {
      console.log('getAge', state.age) // 多次取值，值不变时，只会打印一次
      return state.age
    },
    getName: state => state.name
  },
  mutations: {
    CHANGE_NAME(state, payload) {
      state.name = payload
    },
    CHANGE_AGE(state, payload) {
      state.age = payload
    }
  },
  actions: {
    changeName({ commit }, payload) {
      setTimeout(() => {
        commit('CHANGE_NAME', payload)
      }, 1000)
    },
    changeAge({ commit }, payload) {
      setTimeout(() => {
        commit('CHANGE_AGE', payload)
      }, 1000);
    }
  }
}
```



`scr/store/user.store.vue`

```javascript
export default {
  namespaced: true,
  state: {
    name: 'user',
    age: 28
  },
  getters:{
    getAge(state) {
      console.log('getAge', state.age)
      return state.age
    },
    getName: state => state.name
  },
  mutations: {
    CHANGE_NAME(state, payload) {
      state.name = payload
    },
    CHANGE_AGE(state, payload) {
      state.age = payload
    }
  },
  actions: {
    changeName({ commit }, payload) {
      setTimeout(() => {
        commit('CHANGE_NAME', payload)
      }, 1000)
    },
    changeAge({ commit }, payload) {
      setTimeout(() => {
        commit('CHANGE_AGE', payload)
      }, 1000);
    }
  }
}
```



## 五、插件机制实现
### 插件开发
`scr/store/index.vue`

```javascript
import Vue from 'vue'
import Vuex from '../plugins/vuex/index'
// import Vuex from 'vuex'
import user from './user.store'
import home from './home.store'

Vue.use(Vuex)

function persists(store) { // 每次去服务器上拉去最新的 session、local
  let local = localStorage.getItem('VUEX:state');
  if (local) {
      store.replaceState(JSON.parse(local)); // 会用local替换掉所有的状态
  }
  store.subscribe((mutation, state) => {
      // 这里需要做一个节流  throttle lodash
      localStorage.setItem('VUEX:state', JSON.stringify(state));
  });
}

const store = new Vuex.Store({
  plugins: [
    persists
  ],
  state: {
    name: 'robin',
    age: 8
  },
  getters:{
    getAge(state) {
      console.log('getAge', state.age) // 多次取值，值不变时，只会打印一次
      return state.age
    },
    getName: state => state.name
  },
  mutations: {
    CHANGE_NAME(state, payload) {
      state.name = payload
    },
    CHANGE_AGE(state, payload) {
      state.age = payload
    }
  },
  actions: {
    changeName({ commit }, payload) {
      setTimeout(() => {
        commit('CHANGE_NAME', payload)
      }, 1000)
    },
    changeAge({ commit }, payload) {
      setTimeout(() => {
        commit('CHANGE_AGE', payload)
      }, 1000);
    }
  },
  modules: {
    home,
    user
  }
})

export default store
```

### 原理实现
这里我们要实现subscribe、replaceState方法。

`scr/plugins/vuex/store.js`

```javascript
import applyMixin from "./mixin"
import ModuleCollection from "./module-collection"
import { forEachValue } from "./utils"

// 暴露Vue
export let Vue

/**
 * 获取最新的状态
 * @param {*} store 
 * @param {*} path 
 */
function getState(store, path) {
  let local = path.reduce((newState, current) => {
      return newState[current]; 
  }, store.state);
  return local
}

/**
 * 初始化模块
 * @param {容器} store 
 * @param {根模块} rootState 
 * @param {路径} path 
 * @param {格式化后的数据} module 
 */
const installModule = (store, rootState, path, module) => {
  // 给当前订阅的事件，增加一个命名空间
  // 例如:home/changeAge user/changeAge home/title/changeAge
  let namespaced = store._modules.getNamespaced(path) // 返回前缀
  // console.log(namespaced)
  
  // 状态
  // 将所有的子模块的状态安装到父模块的状态上
  if(path.length > 0) { // vuex 可以动态的添加模块
    let parent = path.slice(0, -1).reduce((memo, current) => {
      return memo[current]
    }, rootState)

    // 如果这个对象本身不是响应式的，那么 Vue.set 就相当于 obj[属性] = 值
    Vue.set(parent, path[path.length - 1], module.state)
  }

  module.forEachMutation((mutation, key) => {
    key = namespaced + key
    store._mutations[key] = store._mutations[key] || []
    store._mutations[key].push((payload) => {
      mutation.call(store, getState(store, path), payload, namespaced)
      store._subscribes.forEach(fn => {
        fn(mutation, store.state) // 用最新的状态
      })
    })
  })
  module.forEachAction((action, key) => {
    key = namespaced + key
    store._actions[key] = store._actions[key] || []
    store._actions[key].push((payload) => {
      action.call(store, store, payload)
    })
  })
  module.forEachGetter((getter, key) => {
    key = namespaced + key
    // 模块中getters的名字重复会覆盖
    store._wrappedGetters[key] = function() {
      return getter(getState(store, path))
    }
  })
  module.forEachChild((child, key) => {
    // 递归加载模块
    installModule(store, rootState, path.concat(key), child)
  })
}

function restStoreVM(store, state) {
  const computed = {} // 定义计算属性
  store.getters = {} // 定义 store 中的 getters

  forEachValue(store._wrappedGetters, (fn, key) => {
    computed[key] = () => {
      return fn(store.state)
    }
    Object.defineProperty(store.getters, key, {
      get: () => store._vm[key] // 去计算属性取值
    })
  })
  store._vm = new Vue({
    data: {
      $$state: state
    },
    computed // 计算属性有缓存特性
  })
}

// 容器初始化
export class Store {
  // options 就是 new Vuex.Store({state, mutation, actions, getters, modules, plugins, strict, devtools })
  constructor(options) {
    const state = options.state
    // 1.数据格式化，格式化的结果是树结构
    this._modules = new ModuleCollection(options)

    // 2.安装模块
    this._actions = {}
    this._mutations = {}
    this._wrappedGetters = {}
    this._subscribes = []

    // 根模块的状态中，要将子模块通过模块名定义在根模块上
    installModule(this, state, [], this._modules.root)
    // console.log(state)

    // 3.将状态和getters都定义在当前vm上
    restStoreVM(this, state)

    // 4.插件
    options.plugins.forEach(plugin => plugin(this))
  }
  get state() {
    return this._vm._data.$$state
  }
  // 在严格模式下，commit 和 dispatch 是有区别的
  commit = (type, payload) => { // 保证当前this，永远指向当前 store 实例
    // 调用 commit 其实就是去找绑定在 mutations 上的用户方法
    this._mutations[type].forEach(fn => fn.call(this, payload))
  }
  dispatch = (type, payload) => {
    this._actions[type].forEach(fn => fn.call(this, payload))
  }
  replaceState(state) {
    this._vm._data.$$state = state;
  }
  subscribe(fn) {
    this._subscribes.push(fn)
  }
}

// 插件安装
// Vue.use 方法回调用插件的 install 方法，此方法中的参数就是 Vue 的构造器
export const install = (_Vue) => {
  Vue = _Vue
  // 需要将跟组件注入的store 分派给每一个组件(子组件)
  applyMixin(Vue)
}
```



## 六、辅助函数实现
### 实现
`scr/plugins/vuex/helper.js`

```javascript
export const mapState = stateList => {
  let obj = {};
  for (let i = 0; i < stateList.length; i++) {
    let stateName = stateList[i];
    obj[stateName] = function() {
      console.log(this)
      return this.$store.state[stateName];
    };
  }
  return obj;
};

export const mapGetters = getterList => {
  let obj = {};
  for (let i = 0; i < getterList.length; i++) {
    let getterName = getterList[i]
    obj[getterName] = function() {
      return this.$store.getters[getterName];
    };  
  }
  return obj;
};

export const mapMutations = mutationList => {
  let obj = {}
  for (let i = 0; i < mutationList.length; i++) {
    const type = mutationList[i];
    obj[type] = function(payload) {
      return this.$store.commit(type, payload)
    }
  }
  return obj
}

export const mapActions = actionList => {
  let obj = {}
  for (let i = 0; i < actionList.length; i++) {
    const type = actionList[i];
    obj[type] = function(payload) {
      return this.$store.dispatch(type, payload)
    }
  }
  return obj
}
```

`scr/plugins/vuex/index.js`

```javascript
import { Store, install } from './store'
import { mapState, mapGetters, mapMutations, mapActions } from './helper'

// 入口文件
export default {
  Store,
  install,
  mapState,
  mapGetters,
  mapMutations,
  mapActions
}

export {
  Store,
  install,
  mapState,
  mapGetters,
  mapMutations,
  mapActions
}
```

### 测试
`scr/componnets/HelloWorld.vue`

```javascript
<template>
  <div class="hello">
    <h3>{{ msg }} {{getName + ',' + age}}</h3>
    <hr>
    <h3>根模块</h3>
    <h4><button @click="changeName">修改名字</button></h4>
    <h4><button @click="changeAge(parseInt((Math.random() * 100)))">修改年龄(异步)</button></h4>
    <h4><span>this.$store.state.name: </span>{{ this.$store.state.name}}</h4>
    <h4><span>this.$store.getters.getAge: </span>{{ this.$store.getters.getAge}}</h4>
    <hr>
    <h3>home模块</h3>
    <h4><button @click="changeHomeName">修改名字</button></h4>
    <h4><button @click="changeHomeAge">修改年龄(异步)</button></h4>
    <h4><span>this.$store.state.home.name: </span>{{ this.$store.state.home.name}}</h4>
    <h4><span>this.$store.getters.home.getAge: </span>{{ this.$store.getters['home/getAge']}}</h4>
    <h3>home -> title模块</h3>
    <h4><button @click="changeTitleName">修改名字</button></h4>
    <h4><button @click="changeTitleAge">修改年龄(异步)</button></h4>
    <h4><span>this.$store.state.home.title.name: </span>{{ this.$store.state.home.title.name}}</h4>
    <h4><span>this.$store.getters.home.title.getAge: </span>{{ this.$store.getters['home/title/getAge']}}</h4>
    <h3>user模块</h3>
    <h4><button @click="changeUserName">修改名字</button></h4>
    <h4><button @click="changeUserAge">修改年龄(异步)</button></h4>
    <h4><span>this.$store.state.user.name: </span>{{ this.$store.state.user.name}}</h4>
    <h4><span>this.$store.getters.user.getAge: </span>{{ this.$store.getters['user/getAge']}}</h4>
    
  </div>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from '../plugins/vuex/index'

export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  computed: {
    ...mapState(['age']),
    ...mapGetters(['getName'])
  },
  mounted() {
    setTimeout(() => {
      this.$store.state.name = 'jack'
      this.$store.state.age = 30
    }, 2000);
  },
  methods: {
    ...mapMutations(['CHANGE_NAME']),
    ...mapActions(['changeAge']),
    changeName() {
      // this.$store.commit('CHANGE_NAME', 'sb')
      this.CHANGE_NAME('sb')
    },
    // changeAge() {
    //   this.$store.dispatch('changeAge', parseInt((Math.random() * 100)))
    // },
    changeHomeName() {
      this.$store.commit('home/CHANGE_NAME', 'sb-home')
    },
    changeHomeAge() {
      this.$store.dispatch('home/changeAge', parseInt((Math.random() * 100)))
    },
    changeUserName() {
      this.$store.commit('user/CHANGE_NAME', 'sb-user')
    },
    changeUserAge() {
      this.$store.dispatch('user/changeAge', parseInt((Math.random() * 100)))
    },
    changeTitleName() {
      this.$store.commit('home/title/CHANGE_NAME', 'sb-home-title')
    },
    changeTitleAge() {
      this.$store.dispatch('home/title/changeAge', parseInt((Math.random() * 100)))
    },
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
</style>
```



## 七、区分mutation和action
```javascript
this._committing = false;
 _withCommitting(fn) {
    let committing = this._committing;
    this._committing = true; // 在函数调用前 表示_committing为true
    fn();
    this._committing = committing;
}
```



```javascript
if (store.strict) {
    // 只要状态一变化会立即执行,在状态变化后同步执行
    store._vm.$watch(() => store._vm._data.$$state, () => {
        console.assert(store._committing, '在mutation之外更改了状态')
    }, { deep: true, sync: true });
}
```



严格模式下增加同步watcher，监控状态变化

```javascript
store._withCommitting(() => {
    mutation.call(store, getState(store, path), payload); // 这里更改状态
})
```



只有通过mutation更改状态，断言才能通过

```javascript
replaceState(newState) { // 用最新的状态替换掉
    this._withCommitting(() => {
        this._vm._data.$$state = newState;
    })
}
```



```javascript
store._withCommitting(() => {
    Vue.set(parent, path[path.length - 1], module.state);
})
```



内部更改状态属于正常更新,所以也需要用_withCommitting进行包裹



## 参考
[Vuex 是什么？ | Vuex](https://vuex.vuejs.org/zh/)

