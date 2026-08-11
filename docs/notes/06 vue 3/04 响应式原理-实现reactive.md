# 简介
+ [reactive](https://cn.vuejs.org/api/reactivity-core.html#reactive)：让数据变成响应式。

# 基本使用
```typescript
import { reactive } from 'vue'

const state = reactive({
  name: 'test',
  age: 18
})

console.log(state)
```

# 功能清单
+ 实现代理对象，Proxy + Reflect
+ 实现缓存代理对象
    - 保证对象不能被重复代理
    - 保证代理过的对象被再次被代理是不能被重复代理

# 知识点
## proxy
+ 问题一

```typescript
const person = {
  name: 'test',
  age: 18,
  get aliasName(){
    return this.name + ' alias'
  }
}

const proxy = new Proxy(person, {
  get(target, key, receiver){
    console.log('get', key)
    // 此处使用target，获取属性值，会出现一个问题，
    // 就是获取aliasName时，应该先走一次get aliasName 的代理，再走一次get name 的代理，
    // 而这里只走了一次get aliasName 的代理
    // 原因是这里的target是person对象，所以get aliasName 中的 this 是person对象，
    // 此时获取 this.name 的时候，不会再走一次get name 的代理，而是直接从person对象中获取name属性的值，
    // 所以这里返回的是person.name的值，而不是proxy.name的值
    return target[key] 
  },
  set(target, key, value, receiver){
    console.log('set', key, value)
    return Reflect.set(target, key, value, receiver)
  }
})

console.log(proxy.aliasName)
// get aliasName
// test alias
```

+ 问题二

```typescript
const person = {
  name: 'test',
  age: 18,
  get aliasName(){
    return this.name + ' alias'
  }
}

const proxy = new Proxy(person, {
  get(target, key, receiver){
    console.log('get', key)
    // receiver 指的是代理对象
    // 下面获取方式会导致死循环
    return receiver[key] 
  },
  set(target, key, value, receiver){
    console.log('set', key, value)
    return Reflect.set(target, key, value, receiver)
  }
})

console.log(proxy.aliasName)
// get aliasName
// test alias
```

+ 解决方案

```typescript
const person = {
  name: 'test',
  age: 18,
  get aliasName(){
    return this.name + ' alias'
  }
}

const proxy = new Proxy(person, {
  get(target, key, receiver){
    // receiver 指的是代理对象
    console.log('get', key)
    // return target[key] 
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver){
    console.log('set', key, value)
    return Reflect.set(target, key, value, receiver)
  }
})

console.log(proxy.aliasName)
// get aliasName
// get name
// test alias
```

# 源码实现
## packages
### reactivity
#### src
##### index.ts
```diff
+ export * from './reactive'
+ export * from './effect'
```

##### reactive.ts
```typescript
import { isObject } from "@g-vue-next/shared"
import { mutableHandlers } from "./baseHandler"

// 响应式标识
export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive", // 判断对象是否是响应式对象
}

// 缓存对象, 避免重复创建代理对象
const reactiveMap = new WeakMap()
// 创建代理对象
const createReactiveObject = (target: any) => {
  // 判断是否是一个对象, 如果不是对象, 直接返回
  if (!isObject(target)) {
    return target
  }
  // 创建代理对象
  const proxy = new Proxy(target, mutableHandlers)
  // 判断是否已经创建过代理对象
  if (target[ReactiveFlags.IS_REACTIVE]) {
    return target
  }
  // 获取缓存的代理对象
  const existProxy = reactiveMap.get(target)
  // 判断对象是否已经被代理过, 如果被代理过, 则直接返回缓存的代理对象
  if (existProxy) {
    return existProxy
  }
  // 缓存对象
  reactiveMap.set(target, proxy)
  return proxy
}

/**
 * 创建响应式对象
 * @param target 目标对象
 * @returns 响应式对象
 */
export const reactive = (target: any) => {
  return createReactiveObject(target)
}
```

##### baseHandler
```typescript
import { ReactiveFlags } from "./reactive"

// 响应式对象的处理器
export const mutableHandlers: ProxyHandler<any> = {
  get(target, p, receiver) {
    //! receiver 表示代理对象本身
    // 判断是否是 IS_REACTIVE, 如果是表示是一个代理对象则返回 true
    if (p === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    return Reflect.get(target, p, receiver)
  },
  set(target, p, newValue, receiver) {
    return Reflect.set(target, p, newValue, receiver)
  },
}
```

##### effect
```typescript
export const effect = (fn: Function, options = {}) => {
  fn()
}
```

# 示例代码
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>reactivity</title>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    // import { reactive } from '../../node_modules/vue/dist/vue.esm-browser.js'
    import { reactive } from '../../packages/reactivity/dist/reactivity.esm.js'

    const app = document.querySelector('#app')

    // reactive 让数据变成响应式
    // effect  副作用，数据变化后可以让 effect 函数重新执行，组件、watch、computed 都是基于 effect 实现的
    const obj = { name: 'test', age: 18}
    const state = reactive(obj)
    const state2 = reactive(obj)
    const state3 = reactive(state)

    // 1.测试缓存
    console.log(state === state2)
    console.log(state === state3)
    console.log(state2 === state3)
    
    console.log(state.name, state.age)

    setTimeout(() => {
      state.name = 'test1'
      state.age = 19

      console.log(state.name, state.age)
    }, 1000);

  </script>
</body>
</html>
```

# 测试代码
```shell
pnpm preview
```

