# 请说一下响应式数据的理解？
## 核心答案:
+ 数组和对象类型当值变化时如何劫持到。对象内部通过defineReactive方法，使用Object.defineProperty将属性进行劫持（只会劫持已经存在的属性），数组则是通过重写数组方法来实现。

> 这里在回答时可以带出一些相关知识点（比如多层对象是通过递归来实现劫持，顺带提出`Vue3`中是使用proxy来实现响应式数据）
>

## 补充回答:
+ 内部依赖收集是怎样做到的，每个属性都拥有自己的dep属性，存放他所依赖的watcher，当属性变化后会通知自己对应的watcher去更新 （其实后面会讲到每个对象类型自己本身也拥有一个dep属性，这个在$set面试题中在进行讲解）

> 这里可以引出性能优化相关的内容 （1）对象层级过深，性能就会差 （2）不需要响应数据的内容不要放到data中 （3） `Object.freeze`() 可以冻结数据
>

## 快速Mock:
```javascript
let state = { count: 0 };
// app.innerHTML = state.count;
// 1.将数据变成响应式数据
let active;
function defineReactive(obj) {
  for (let key in obj) {
    let value = obj[key];
    let dep = [];
    Object.defineProperty(obj, key, {
      get() {
        if (active) {
          dep.push(active);
        }
        return value;
      },
      set(newValue) {
        value = newValue;
        dep.forEach(fn => fn());
      }
    });
  }
}
defineReactive(state);
const watcher = (fn) => {
  active = fn;
  fn();
  active = null;
}
watcher(() => {
  app.innerHTML = state.count;
});
watcher(() => {
  console.log(state.count)
});
```

> 源码位置: `**src/core/observer/index.js:135**`
>

# Vue如何检测数组变化？
## 核心答案:
数组考虑性能原因没有用 `defineProperty` 对数组的每一项进行拦截，而是选择重写数组 `（push,shift,pop,splice,unshift,sort,reverse）` 方法进行重写。

## 补充回答:
在Vue中修改数组的索引和长度是无法监控到的。需要通过以上7种变异方法修改数组才会触发数组对应的 `watcher` 进行更新。数组中如果是对象数据类型也会进行递归劫持。

> 那如果想更改索引更新数据怎么办？可以通过Vue.$set()来进行处理 => 核心内部用的是splice方法
>

## 快速Mock:
```javascript
let state = [1,2,3];
let originArray = Array.prototype;
let arrayMethods = Object.create(originArray);
function defineReactive(obj) {
  arrayMethods.push = function (...args) {
    originArray.push.call(this,...args);
    render();
  }
  obj.__proto__ = arrayMethods;
}
defineReactive(state);
function render(){
  app.innerHTML = state;
}
render();
state.push(4);
```

> 源码位置: `src/core/observer/array.js:8`
>

# Vue中模板编译原理？
## 核心答案:
+ 如何将template转换成render函数(这里要注意的是我们在开发时尽量不要使用template，因为将template转化成render方法需要在运行时进行编译操作会有性能损耗，同时引用带有compiler包的vue体积也会变大。默认.vue文件中的template处理是通过vue-loader来进行处理的并不是通过运行时的编译 - 后面我们会说到默认vue项目中引入的vue.js是不带有compiler模块的)。
    - 1.将template模板转换成`ast`语法树 - `parserHTML`
    - 2.对静态语法做静态标记 - `markUp`
    - 3.重新生成代码 -`codeGen`

## 补充回答:
+ 模板引擎的实现原理就是new Function + with来进行实现的

> vue-loader中处理template属性主要靠的是vue-template-compiler模块
>

## 快速Mock:
```html
<script src="./node_modules/vue-template-compiler/browser.js"></script>
<script>
  let { ast, render } = VueTemplateCompiler.compile('<div>hello world</div>');
  console.log(ast, render);
  const fn = new Function(render);
  console.log(fn.toString());
</script>
```

> 源码位置: `**src/compiler/index.js:11**`
>

# 生命周期钩子是如何实现的?
## 核心答案:
+ Vue的生命周期钩子就是回调函数而已，当创建组件实例的过程中会调用对应的钩子方法

## 补充回答:
+ 内部主要是使用callHook方法来调用对应的方法。核心是一个发布订阅模式，将钩子订阅好（内部采用数组的方式存储），在对应的阶段进行发布！

## 快速Mock:
```javascript
function mergeHook(parentVal, childValue) {
  if (childValue) {
    if (parentVal) {
      return parentVal.concat(childValue);
    } else {
      return [childValue]
    }
  } else {
    return parentVal;
  }
}
function mergeOptions(parent, child) {
  let opts = {};
  for (let key in child) {
    opts[key] = mergeHook(parent[key], child[key]);
  }
  return opts;
}
function callHook(vm, key) {
  vm.options[key].forEach(hook => hook());
}
function Vue(options) {
  this.options = mergeOptions(this.constructor.options, options);
  callHook(this, 'beforeCreate');
}
Vue.options = {}
new Vue({
  beforeCreate() {
    console.log('before create')
  }
})
```

> 源码位置:`**src/core/util/options.js:146**`、`**core/instance/lifecycle.js:336**`
>

# Vue.mixin的使用场景和原理？
## 核心答案:
+ Vue.mixin的作用就是抽离公共的业务逻辑，原理类似“对象的继承”，当组件初始化时会调用mergeOptions方法进行合并，采用策略模式针对不同的属性进行合并。如果混入的数据和本身组件中的数据冲突，会采用“就近原则”以组件的数据为准。

## 补充回答:
+ mixin中有很多缺陷 "命名冲突问题"、"依赖问题"、"数据来源问题",这里强调一下mixin的数据是不会被共享的！

## 快速Mock:
```javascript
Vue.mixin = function (obj) {
  this.options = mergeOptions(this.options,obj);
}
Vue.mixin({
  beforeCreate(){
    console.log('before create ok')
  }
})
```

> 源码位置:`**src/global-api/mixin:5**`
>

# nextTick在哪里使用?原理是?
## 核心答案:
+ nextTick中的回调是在下次 DOM 更新循环结束之后执行的延迟回调。在修改数据之后立即使用这个方法，获取更新后的 DOM。原理就是异步方法(promise,mutationObserver,setImmediate,setTimeout)经常与事件环一起来问(宏任务和微任务)

## 补充回答:
+ vue多次更新数据，最终会进行批处理更新。内部调用的就是nextTick实现了延迟更新，用户自定义的nextTick中的回调会被延迟到更新完成后调用，从而可以获取更新后的DOM。

## 快速Mock:
```javascript
let cbs = [];
let pending = false;
function flushCallbacks() {
  cbs.forEach(fn=>fn());
}
function nextTick(fn) {
  cbs.push(fn);
  if (!pending) {
    pending = true;
    setTimeout(() => {
      flushCallbacks();
    }, 0);
  }
}
function render() {
  console.log('rerender');
};
nextTick(render)
nextTick(render)
nextTick(render);
console.log('sync...')
```

> 源码位置:`**src/core/global-api/mixin:5**`、`**src/core/util/next-tick.js:87**`
>

# Vue为什么需要虚拟DOM？
## 核心答案:
+ Virtual DOM就是用js对象来描述真实DOM，是对真实DOM的抽象，由于直接操作DOM性能低但是js层的操作效率高，可以将DOM操作转化成对象操作，最终通过diff算法比对差异进行更新DOM（减少了对真实DOM的操作）。虚拟DOM不依赖真实平台环境从而也可以实现跨平台。

## 补充回答:
+ 虚拟DOM的实现就是普通对象包含tag、data、children等属性对真实节点的描述。（本质上就是在JS和DOM之间的一个缓存）

> 源码位置:`**src/core/vdom/vnode:3**`
>

# Vue中的DIFF原理
## 核心答案:
+ Vue的diff算法是平级比较，不考虑跨级比较的情况。内部采用深度递归的方式 + 双指针的方式进行比较。
+ 补充回答:

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2020/jpeg/738210/1607996978607-fdc20bd6-dba8-4eca-b778-bb22382cd575.jpeg)

+ 1.先比较是否是相同节点
+ 2.相同节点比较属性,并复用老节点
+ 3.比较儿子节点，考虑老节点和新节点儿子的情况
+ 4.优化比较：头头、尾尾、头尾、尾头
+ 5.比对查找进行复用

> `Vue3`中采用最长递增子序列实现`diff`算法
>
> 源码位置:`**src/core/vdom/patch:501**`
>



# Vue.set方法是如何实现的?
## 核心答案:
+ 为什么$set可以触发更新,我们给对象和数组本身都增加了dep属性。当给对象新增不存在的属性则触发对象依赖的watcher去更新，当修改数组索引时我们调用数组本身的splice方法去更新数组

```javascript
export function set (target: Array | Object, key: any, val: any): any {
  // 1.是开发环境 target 没定义或者是基础类型则报错
  if (process.env.NODE_ENV !== 'production' &&
      (isUndef(target) || isPrimitive(target))
     ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 2.如果是数组 Vue.set(array,1,100); 调用我们重写的splice方法 (这样可以更新视图)
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  // 3.如果是对象本身的属性，则直接添加即可
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  // 4.如果是Vue实例 或 根数据data时 报错
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  // 5.如果不是响应式的也不需要将其定义成响应式属性
  if (!ob) {
    target[key] = val
    return val
  }
  // 6.将属性定义成响应式的
  defineReactive(ob.value, key, val)
  // 7.通知视图更新
  ob.dep.notify()
  return val
}
```

> 源码位置:`**src/core/observer/index:202**`
>

# Vue的生命周期方法有哪些？一般在哪一步发起请求及原因
## 核心答案:
+ `beforeCreate` 在实例初始化之后，数据观测(data observer) 和 event/watcher 事件配置之前被调用。
+ `created` 实例已经创建完成之后被调用。在这一步，实例已完成以下的配置：数据观测(data observer)，属性和方法的运算， watch/event 事件回调。这里没有$el
+ `beforeMount` 在挂载开始之前被调用：相关的 render 函数首次被调用。
+ `mounted` el 被新创建的 `vm.$el` 替换，并挂载到实例上去之后调用该钩子。
+ `beforeUpdate` 数据更新时调用，发生在虚拟 DOM 重新渲染和打补丁之前。
+ `updated` 由于数据更改导致的虚拟 DOM 重新渲染和打补丁，在这之后会调用该钩子。
+ `beforeDestroy` 实例销毁之前调用。在这一步，实例仍然完全可用。
+ `destroyed` Vue 实例销毁后调用。调用后，Vue 实例指示的所有东西都会解绑定，所有的事件监听器会被移  
除，所有的子实例也会被销毁。 该钩子在服务器端渲染期间不被调用。

## 补充回答:
+ `created` 实例已经创建完成，因为它是最早触发的原因可以进行一些数据，资源的请求。(服务端渲染支持created方法)
+ `mounted` 实例已经挂载完成，可以进行一些DOM操作
+ `beforeUpdate` 可以在这个钩子中进一步地更改状态，这不会触发附加的重渲染过程。
+ `updated` 可以执行依赖于 DOM 的操作。然而在大多数情况下，你应该避免在此期间更改状态，因为这可能会导致更新无限循环。 该钩子在服务器端渲染期间不被调用。
+ `destroyed` 可以执行一些优化操作,清空定时器，解除绑定事件

# Vue组件间传值的方式及之间的区别？
+ props和$emit 父组件向子组件传递数据是通过prop传递的，子组件传递数据给父组件是通过$emit触发事件来做到的
+ $parent,$children 获取当前组件的父组件和当前组件的子组件
+ `$attrs`和`$listeners` A->B->C。Vue 2.4 开始提供了`$attrs`和`$listeners`来解决这个问题
+ 父组件中通过`provide`来提供变量，然后在子组件中通过`inject`来注入变量。
+ `$refs` 获取实例
+ `envetBus` 平级组件数据传递 这种情况下可以使用中央事件总线的方式
+ `vuex`状态管理

> (1) props实现:`**src/core/vdom/create-component.js:101**`、 `**src/core/instance/init.js:74**`、`**scr/core/instance/state:64**`
>
> (2) 事件机制实现: `**src/core/vdom/create-component.js:101**`、 `**src/core/instance/init.js:74**`、`**src/core/instance/events.js:12**`
>
> (3) parent&children实现:`**src/core/vdom/create-component.js:47**`、`**src/core/instance/lifecycle.js:32**`
>
> (4)provide&inject实现: `**src/core/instance/inject.js:7**`
>
> (5)$attrs&$listener实现: `**src/core/instance/render.js:49**`、`**src/core/instance/lifecycle.js:215**`
>
> (6)$refs实现:`**src/core/vdom/modules/reg.js:20**`
>

# `$attrs` 是为了解决什么问题出现的？应用场景有哪些？provide/inject 不能解决它能解决的问题吗？
## 核心答案:
+ $attrs主要的作用就是实现批量传递数据。provide/inject更适合应用在插件中，主要是实现跨级数据传递

# Vue的组件渲染流程?
## 核心答案:
+ 父子组件渲染的先后顺序
+ 组件是如何渲染到页面上的
+ ①在渲染父组件时会创建父组件的虚拟节点,其中可能包含子组件的标签 
+ ②在创建虚拟节点时,获取组件的定义使用`Vue.extend`生成组件的构造函数。 
+ ③将虚拟节点转化成真实节点时，会创建组件的实例并且调用组件的$mount方法。 
+ ④所以组件的创建过程是先父后子

> 源码位置:`**src/core/vdom/patch:125**`
>

# Vue中组件的data为什么是一个函数?
## 核心答案:
+ 每次使用组件时都会对组件进行实例化操作，并且调用data函数返回一个对象作为组件的数据源。这样可以保证多个组件间数据互不影响

## 快速Mock:
```javascript
class Vue{
  constructor(options){
    this.data = options.data();
  }
}
let data = ()=>({a:1})
let d1 = new Vue({data});
let d2 = new Vue({data});
d1.data.a = 100;
console.log(d2); // 1
```

> 源码位置:`**src/core/util/options:121**`
>

# 请说下v-if和v-show的区别
## 核心答案:
1. v-if在编译过程中会被转化成三元表达式,条件不满足时不渲染此节点。v-show会被编译成指令，条件不满足时控制样式将对应节点隐藏 （内部其他指令依旧会继续执行）

> 扩展回答: 频繁控制显示隐藏尽量不使用v-if，v-if和v-for尽量不要连用
>

## v-if源码剖析:
```javascript
function genIfConditions (
  conditions: ASTIfConditions,
  state: CodegenState,
  altGen?: Function,
  altEmpty?: string
): string {
  if (!conditions.length) {
    return altEmpty || '_e()'
  }
  const condition = conditions.shift()
  if (condition.exp) {   // 如果有表达式
    return `(${condition.exp})?${ // 将表达式作为条件拼接成元素
      genTernaryExp(condition.block)
    }:${
      genIfConditions(conditions, state, altGen, altEmpty)
    }`
  } else {
    return `${genTernaryExp(condition.block)}` // 没有表达式直接生成元素 像v-else
  }
  // v-if with v-once should generate code like (a)?_m(0):_m(1)
  function genTernaryExp (el) {
    return altGen
      ? altGen(el, state)
      : el.once
      ? genOnce(el, state)
      : genElement(el, state)
  }
}
```

> 源码位置:`**src/compiler/codegen/index.js:155**`
>

## v-show源码剖析:
```javascript
{
  bind (el: any, { value }: VNodeDirective, vnode: VNodeWithData) {
    const originalDisplay = el.__vOriginalDisplay =
      el.style.display === 'none' ? '' : el.style.display // 获取原始显示值
    el.style.display = value ? originalDisplay : 'none' // 根据属性控制显示或者隐藏
  }  
}
```

> 源码位置:`**src/platforms/web/runtime/directives/show.js:155**`
>

# Vue.use是干什么的?原理是什么?
## 核心答案:
+ `Vue.use`是用来使用插件的，我们可以在插件中扩展全局组件、指令、原型方法等。

```javascript
Vue.use = function (plugin: Function | Object) {
  // 插件不能重复的加载
  const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
  if (installedPlugins.indexOf(plugin) > -1) {
    return this
  }
  // additional parameters
  const args = toArray(arguments, 1)
  args.unshift(this)  // install方法的第一个参数是Vue的构造函数，其他参数是Vue.use中除了第一个参数的其他参数
  if (typeof plugin.install === 'function') { // 调用插件的install方法
    plugin.install.apply(plugin, args)  Vue.install = function(Vue,args){}
  } else if (typeof plugin === 'function') { // 插件本身是一个函数，直接让函数执行
    plugin.apply(null, args) 
  }
  installedPlugins.push(plugin) // 缓存插件
  return this
}
```

> 源码位置: `**src/core/global-api/use.js:5**`
>

# Vue-router有几种钩子函数?具体是什么及执行流程是怎样的?
## 核心答案:
+ 路由钩子的执行流程, 钩子函数种类有:全局守卫、路由守卫、组件守卫

## 完整的导航解析流程:
+ ①导航被触发。
+ ②在失活的组件里调用 `beforeRouteLeave` 守卫。
+ ③调用全局的 `beforeEach` 守卫。
+ ④在重用的组件里调用 `beforeRouteUpdate` 守卫 (2.2+)。
+ ⑤在路由配置里调用 `beforeEnter`。
+ ⑥解析异步路由组件。
+ ⑦在被激活的组件里调用 `beforeRouteEnter`。
+ ⑧调用全局的 `beforeResolve` 守卫 (2.5+)。
+ ⑨导航被确认。
+ ⑩调用全局的 `afterEach` 钩子。
+ ⑪触发 DOM 更新。
+ ⑫调用 `beforeRouteEnter` 守卫中传给 next 的回调函数，创建好的组件实例会作为回调函数的参数传入。

# Vue-router 两种模式的区别？
## 核心答案:
+ `hash` 模式、 `history` 模式
    - `hash` 模式：`hash` + `hashChange` 兼容性好但是不美观
    - `history` 模式 : `historyApi`+`popState` 虽然美观，但是刷新会出现404需要后端进行配置

# 函数式组件的优势及原理
## 核心答案:
+ 函数式组件的特性,无状态、无生命周期、无this

```javascript
if (isTrue(Ctor.options.functional)) { // 带有functional的属性的就是函数式组件
  return createFunctionalComponent(Ctor, propsData, data, context, children)
}
const listeners = data.on
data.on = data.nativeOn
installComponentHooks(data) // 安装组件相关钩子 （函数式组件没有调用此方法，从而性能高于普通组件）
```

+ 源码位置: `**src/core/vdom/create-component.js:164**`、`**src/core/vdom/create-functional-component.js:5**`

# v-for和v-if的优先级
## 核心答案:
+ v-for和v-if不要在同一个标签中使用,因为解析时先解析v-for在解析v-if。如果遇到需要同时使用时可以考虑写成计算属性的方式。

```javascript
if (el.staticRoot && !el.staticProcessed) {
  return genStatic(el, state)
} else if (el.once && !el.onceProcessed) {
  return genOnce(el, state)
} else if (el.for && !el.forProcessed) {
  return genFor(el, state) // v-for
} else if (el.if && !el.ifProcessed) {
  return genIf(el, state) // v-if
}
```

> 源码位置: `**src/compiler/codegen/index.js:55**`
>

# 组件中写name选项有哪些好处及作用?
## 核心答案:
+ 可以通过名字找到对应的组件 (递归组件)
+ 可用通过name属性实现缓存功能 (keep-alive)
+ 可以通过name来识别组件 (跨级组件通信时非常重要)

```javascript
Vue.extend = function(){
  if (name) {
    Sub.options.components[name] = Sub
  }  
}
```

> 源码位置: `**src/core/vdom/create-element.js:111**`
>

# Vue事件修饰符有哪些？其实现原理是什么?
## 核心答案:
+ 事件修饰符有：.capture、.once、.passive 、.stop、.self、.prevent、

```javascript
//①生成ast时处理
export function addHandler ( 
  el: ASTElement,
  name: string,
  value: string,
  modifiers: ?ASTModifiers,
  important?: boolean,
  warn?: ?Function,
  range?: Range,
  dynamic?: boolean
) {
  modifiers = modifiers || emptyObject
  // check capture modifier
  if (modifiers.capture) { // 如果是capture 加!
    delete modifiers.capture
    name = prependModifierMarker('!', name, dynamic)
  }
  if (modifiers.once) {  // 如果是once加~
    delete modifiers.once
    name = prependModifierMarker('~', name, dynamic)
  }
  /* istanbul ignore if */
  if (modifiers.passive) { // 如果是passive 加&
    delete modifiers.passive
    name = prependModifierMarker('&', name, dynamic)
  }
}
```

> 源码位置: `**src/compiler/helpers.js:69**`
>

```javascript
//②codegen时处理
const genGuard = condition => `if(${condition})return null;`
const modifierCode: { [key: string]: string } = {
  stop: '$event.stopPropagation();', // 增加阻止默认事件
  prevent: '$event.preventDefault();', // 阻止默认行为
  self: genGuard(`$event.target !== $event.currentTarget`), // 点击是否是自己
}
for (const key in handler.modifiers) {
  if (modifierCode[key]) { 
    genModifierCode += modifierCode[key]
  }
  if (genModifierCode) {
    code += genModifierCode
  }
  const handlerCode = isMethodPath
    ? `return ${handler.value}($event)`
    : isFunctionExpression
    ? `return (${handler.value})($event)`
    : isFunctionInvocation
    ? `return ${handler.value}`
    : handler.value
  return `function($event){${code}${handlerCode}}`
}
//③处理on事件
for (name in on) {
  def = cur = on[name]
  old = oldOn[name]
  event = normalizeEvent(name) // 处理& ! ~
  if (isTrue(event.once)) {
    cur = on[name] = createOnceHandler(event.name, cur, event.capture)
  }
  add(event.name, cur, event.capture, event.passive, event.params) // 调用addEventListener绑定事件
}
```

> 源码位置: `**src/compiler/codegen/events.js:42**`
>
> 源码位置: `**src/core/vdom/helpers/update-listeners.js:65**`
>

# Vue.directive源码实现?
## 核心答案:
+ 把定义的内容进行格式化挂载到`Vue.options`属性上

```javascript
ASSET_TYPES.forEach(type => {
  Vue[type] = function ( 
    id: string,
    definition: Function | Object
  ): Function | Object | void {
    if (!definition) {
      return this.options[type + 's'][id]
    } else { // 如果是指令 将指令的定义包装成对象
      if (type === 'directive' && typeof definition === 'function') {
        definition = { bind: definition, update: definition }
      }
      this.options[type + 's'][id] = definition // 将指令的定义绑定在Vue.options上
      return definition
    }
  }
})
```

> 源码位置: `**core/global-api/assets.js**`
>

# 如何理解自定义指令?
## 核心答案:
+ 指令的实现原理，可以从编译原理=>代码生成=>指令钩子实现进行概述
    - 1.在生成`ast`语法树时，遇到指令会给当前元素添加directives属性
    - 2.通过`genDirectives`生成指令代码
    - 3.在patch前将指令的钩子提取到`cbs`中,在patch过程中调用对应的钩子
    - 4.当执行指令对应钩子函数时，调用对应指令定义的方法

```javascript
export function addDirective ( 
  el: ASTElement,
  name: string,
  rawName: string,
  value: string,
  arg: ?string,
  isDynamicArg: boolean,
  modifiers: ?ASTModifiers,
  range?: Range
) {
  (el.directives || (el.directives = [])).push(rangeSetItem({ // 给元素添加directives属性
    name,
    rawName,
    value,
    arg,
    isDynamicArg,
    modifiers
  }, range))
  el.plain = false
}
```

```javascript
function genDirectives (el: ASTElement, state: CodegenState): string | void {
  const dirs = el.directives 
  if (!dirs) return
  let res = 'directives:['
  let hasRuntime = false
  let i, l, dir, needRuntime
  for (i = 0, l = dirs.length; i < l; i++) {
    dir = dirs[i]
    needRuntime = true
    if (needRuntime) {
      hasRuntime = true
      // 将指令生成字符串directives:[{name:'def',rawName:'v-def'}]...
      res += `{name:"${dir.name}",rawName:"${dir.rawName}"${
        dir.value ? `,value:(${dir.value}),expression:${JSON.stringify(dir.value)}` : ''
      }${
        dir.arg ? `,arg:${dir.isDynamicArg ? dir.arg : `"${dir.arg}"`}` : ''
      }${
        dir.modifiers ? `,modifiers:${JSON.stringify(dir.modifiers)}` : ''
      }},`
    }
  }
  if (hasRuntime) {
    return res.slice(0, -1) + ']'
  }
}
```

```javascript
const hooks = ['create', 'activate', 'update', 'remove', 'destroy']
const { modules, nodeOps } = backend // // modules包含指令对应的hook
for (i = 0; i < hooks.length; ++i) { 
  cbs[hooks[i]] = []
  for (j = 0; j < modules.length; ++j) {  
    // 格式化的结果{create:[hook],update:[hook],destroy:[hook]}
    if (isDef(modules[j][hooks[i]])) {
      cbs[hooks[i]].push(modules[j][hooks[i]])
    }
  }
}
```

```javascript
export default { // 无论更新创建销毁调用的都是 updateDirectives方法
  create: updateDirectives, 
  update: updateDirectives,
  destroy: function unbindDirectives (vnode: VNodeWithData) {
    updateDirectives(vnode, emptyNode)
  }
}
function updateDirectives (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  if (oldVnode.data.directives || vnode.data.directives) { // 创建更新都调用此方法
    _update(oldVnode, vnode) // 指令的核心方法
  }
}
function _update (oldVnode, vnode) {
  const isCreate = oldVnode === emptyNode
  const isDestroy = vnode === emptyNode
  // 获取指令名称
  const oldDirs = normalizeDirectives(oldVnode.data.directives, oldVnode.context)
  const newDirs = normalizeDirectives(vnode.data.directives, vnode.context)
  const dirsWithInsert = []
  const dirsWithPostpatch = []
  let key, oldDir, dir
  for (key in newDirs) {
    oldDir = oldDirs[key]
    dir = newDirs[key]
    if (!oldDir) { // 没有旧的 说明是绑定 调用bind钩子
      // new directive, bind
      callHook(dir, 'bind', vnode, oldVnode)
      if (dir.def && dir.def.inserted) {
        dirsWithInsert.push(dir)
      }
    } else { // 存在指令则是更新操作
      // existing directive, update
      dir.oldValue = oldDir.value
      dir.oldArg = oldDir.arg
      callHook(dir, 'update', vnode, oldVnode)
      if (dir.def && dir.def.componentUpdated) { // 如果有componentUpdated方法
        dirsWithPostpatch.push(dir)
      }
    }
  }
  if (dirsWithInsert.length) { // 如果有insert钩子
    const callInsert = () => { // 生成回调方法
      for (let i = 0; i < dirsWithInsert.length; i++) {
        callHook(dirsWithInsert[i], 'inserted', vnode, oldVnode)
      }
    }
    if (isCreate) { // 是创建增加insert钩子
      mergeVNodeHook(vnode, 'insert', callInsert)
    } else {
      callInsert()
    }
  }
  if (dirsWithPostpatch.length) { // 如果有componentUpdated在次合并钩子
    mergeVNodeHook(vnode, 'postpatch', () => {
      for (let i = 0; i < dirsWithPostpatch.length; i++) {
        callHook(dirsWithPostpatch[i], 'componentUpdated', vnode, oldVnode)
      }
    })
  }
  if (!isCreate) { // 否则就是调用卸载钩子
    for (key in oldDirs) {
      if (!newDirs[key]) {
        // no longer present, unbind
        callHook(oldDirs[key], 'unbind', oldVnode, oldVnode, isDestroy)
      }
    }
  }
}
```

> 源码位置: `**src/compiler/helpers.js:42**`
>
> 源码位置: `**src/compiler/codegen/index.js:309**`
>
> 源码位置:`**src/core/vdom/patch:70**`
>
> 源码位置:`**src/core/vdom/modules/directives:7**`
>

# 谈一下你对Vuex的个人理解
## 核心答案:
+ `vuex`是专门为vue提供的全局状态管理系统，用于多个组件中数据共享、数据缓存等。（无法持久化、内部核心原理是通过创造一个全局实例 `new Vue`）
    - 衍生的问题`action`和`mutation`的区别
    - 核心方法: `replaceState`、`subscribe`、`registerModule`、`namespace(modules)`

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1608008287526-30805ea9-8ae1-4fe1-b037-ec6c33c50662.png)

# Vue中slot是如何实现的？什么时候用它?
## 核心答案:
+ 普通插槽（模板传入到组件中，数据采用父组件数据）和作用域插槽（在父组件中访问子组件数据）

# keep-alive平时在哪使用？原理是?
+ `keep-alive`主要是缓存，采用的是`LRU`算法。 最近最久未使用法。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2020/png/738210/1608008287172-f1284c25-45b0-47ea-9fbe-b836a790e5aa.png)

> 原理地址：`src/core/components/keep-alive.js`
>

# $refs是如何实现的?
## 核心答案:
+ 将真实DOM或者组件实例挂载在当前实例的$refs属性上

```javascript
export function registerRef (vnode: VNodeWithData, isRemoval: ?boolean) {
  const key = vnode.data.ref // 获取ref
  if (!isDef(key)) return
  const vm = vnode.context
  const ref = vnode.componentInstance || vnode.elm // 如果是组件则采用实例 否则真是dom
  const refs = vm.$refs
  if (isRemoval) {
    if (Array.isArray(refs[key])) {
      remove(refs[key], ref)
    } else if (refs[key] === ref) {
      refs[key] = undefined
    }
  } else {
    if (vnode.data.refInFor) { // 在v-for中是数组 
      if (!Array.isArray(refs[key])) {
        refs[key] = [ref]
      } else if (refs[key].indexOf(ref) < 0) {
        // $flow-disable-line
        refs[key].push(ref)
      }
    } else {
      refs[key] = ref
    }
  }
}
```



# Vue中使用了哪些设计模式?
+ 工厂模式 - 传入参数即可创建实例 (`createElement`)
+ 根据传入的参数不同返回不同的实例

```javascript
export function _createElement (
  context: Component,
  tag?: string | Class<Component> | Function | Object,
  data?: VNodeData,
  children?: any,
  normalizationType?: number
): VNode | Array<VNode> {
  // ...
  if (typeof tag === 'string') {
    let Ctor
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag)
    if (config.isReservedTag(tag)) {
      vnode = new VNode(
        config.parsePlatformTagName(tag), data, children,
        undefined, undefined, context
      )
    } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
      vnode = new VNode(
        tag, data, children,
        undefined, undefined, context
      )
    }
  } else {
  vnode = createComponent(tag, data, context, children)
}
// ....
}
```

+ 单例模式
+ 单例模式就是整个程序有且仅有一个实例。

```javascript
export function install (_Vue) {
  if (Vue && _Vue === Vue) {
    if (__DEV__) {
      console.error(
        '[vuex] already installed. Vue.use(Vuex) should be called only once.'
      )
    }
    return
  }
  Vue = _Vue
  applyMixin(Vue)
}
```

+ 发布-订阅模式
+ 订阅者把自己想订阅的事件注册到调度中心，当该事件触发时候，发布者发布该事件到调度中心，由调度中心统一调度订阅者注册到调度中心的处理代码。

```javascript
Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
  const vm: Component = this
  if (Array.isArray(event)) {
    for (let i = 0, l = event.length; i < l; i++) {
      vm.$on(event[i], fn)
    }
  } else {
    (vm._events[event] || (vm._events[event] = [])).push(fn)
    if (hookRE.test(event)) {
      vm._hasHookEvent = true
    }
  }
  return vm
}
Vue.prototype.$emit = function (event: string): Component {
  const vm: Component = this
  let cbs = vm._events[event]
  if (cbs) {
    cbs = cbs.length > 1 ? toArray(cbs) : cbs
    const args = toArray(arguments, 1)
    const info = `event handler for "${event}"`
    for (let i = 0, l = cbs.length; i < l; i++) {
      invokeWithErrorHandling(cbs[i], vm, args, vm, info)
    }
  }
  return vm
}
```

+ 观察者模式 :`watcher`&`dep`的关系
+ 代理模式 (防抖和节流) => 返回替代 （例如：`Vue3`中的proxy）
    - _代理模式_给某一个对象提供一个代理对象,并由代理对象控制对原对象的引用。
+ 装饰模式: @装饰器的用法
+ 中介者模式 => `vuex`
    - _中介者_是一个行为设计_模式_,通过提供一个统一的接口让系统的不同部分进行通信。
+ 策略模式 策略模式指对象有某个行为,但是在不同的场景中,该行为有不同的实现方案。

```javascript
function mergeField (key) {
  const strat = strats[key] || defaultStrat
  options[key] = strat(parent[key], child[key], vm, key)
}
```

+ 外观模式、适配器模式、迭代器模式、模板方法模式 .....

# 谈谈Vue3和Vue2的区别?
+ 对`TypeScript`支持不友好（所有属性都放在了this对象上，难以推倒组件的数据类型）
+ 大量的`API`挂载在Vue对象的原型上，难以实现`TreeShaking`。
+ 架构层面对跨平台`dom`渲染开发支持不友好
+ `CompositionAPI`。受`ReactHook`启发
+ 对虚拟DOM进行了重写、对模板的编译进行了优化操作...

