# 简介
+ effect：副作用，数据变化后可以让 effect 函数重新执行，组件、watch、computed 都是基于 effect 实现的。
+ effect主要做了两件事：
    - track是一个响应式数据（target）触发了get handler执行的函数，其作用是收集这个响应式数据的effect依赖。
    - trigger是一个响应式数据（target）触发了set handler执行的函数，其作用是执行这个响应式数据的所有effect依赖，从而更新数据。

<!-- 这是一张图片，ocr 内容为：WEAKMAP TARGETMAP KEY(OBJECT) VALUE(MAP) KEY DEP CLEANUP KEY VALUE ())DEPSMAP.DELETE(KEY) REACTIVEEFFECT TARGETMAP NAME : TEST' AGE:18 18 3 DEPSMAP VALUE(MAP) KEY DEP CLEANUP KEY VALLE DEPSMAP.DELETE(KEY) REACTIVEEFFECT AGE -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1753756872576-6739188c-9ec6-436a-be3a-f6d1d3e63c7d.png)

# Effect分类
+ 在 Vue 3 的响应式系统中，`effect` 是核心概念之一，主要用于依赖收集和触发更新。Vue 3 中的 `effect` 主要分为以下几种类型：

## Reactive Effect
+ 作用：用于响应式数据的依赖收集和触发更新。
+ 特点：
    - 当响应式数据变化时，自动重新执行。
    - 通过 `effect` 函数创建。
+ 示例：

```javascript
import { effect, reactive } from 'vue';

const state = reactive({ count: 0 });
effect(() => {
  console.log(state.count); // 每次 state.count 变化时触发
});
```

## Computed Effect
+ 作用：用于计算属性，基于其他响应式数据派生值。
+ 特点：
    - 惰性求值（只有被访问时才计算）。
    - 缓存结果，避免重复计算。
+ 示例：

```javascript
import { computed, reactive } from 'vue';

const state = reactive({ a: 1, b: 2 });
const sum = computed(() => state.a + state.b);
```

## Watch Effect
+ 作用：监听响应式数据的变化并执行回调。
+ 特点：
    - 类似于 `effect`，但提供更细粒度的控制（如 `immediate`、`deep` 等选项）。
    - 通过 `watch` 或 `watchEffect` 创建。
+ 示例：

```javascript
import { watchEffect, reactive } from 'vue';

const state = reactive({ count: 0 });
watchEffect(() => {
  console.log(state.count); // 立即执行，并在 state.count 变化时触发
});
```

## Render Effect
+ 作用：用于组件的渲染逻辑。
+ 特点：
    - Vue 组件内部通过 `renderEffect` 实现模板的响应式更新。
    - 开发者通常不直接接触，由框架内部管理。
+ 示例：

```javascript
// 组件内部逻辑
setup() {
  const state = reactive({ msg: 'Hello' });
  return () => h('div', state.msg); // 渲染函数自动追踪依赖
}
```

## 总结
| 类型 | 用途 | 创建方式 | 特点 |
| --- | --- | --- | --- |
| Reactive Effect | 响应式数据依赖追踪 | `effect()` | 自动触发 |
| Computed Effect | 派生计算属性 | `computed()` | 惰性求值，缓存结果 |
| Watch Effect | 监听数据变化 | `watchEffect()` | 细粒度控制 |
| Render Effect | 组件渲染 | 框架内部实现 | 开发者无需直接操作 |


# 基本使用
```typescript
import { reactive, effect } from 'vue'

const state = reactive({
  name: 'test',
  age: 18
})

effect(() => {
  console.log(state.name)
})

setTimeout(() => {
  state.name = 'test2'
}, 1000);
```

# 功能清单
+ 创建一个响应式的 effect，数据变化后可以重新执行
+ 收集依赖
+ track 方法
+ 触发更新
+ 分支切换
+ cleanup
+ 调度执行
+ 防止递归调用
+ 深度代理

# 源码实现
## packages
### reactivity
#### src
##### effect.ts
```diff
- export const effect = (fn: Function, options = {}) => {
-   fn()
+ import { extend } from "@g-vue-next/shared"
+ import { Dep } from "./dep"
+ 
+ // 执行 effect 之前的清理逻辑
+ const preCleanupEffect = (effect: ReactiveEffect) => {
+   effect._trackId ++ // trackId 递增，用于判断是否需要执行 cleanup
+   effect._depsLength = 0 // 重置 deps 的长度
+ }
+ 
+ // 执行 effect 之后的清理逻辑
+ // 首次：{flag, name, age}
+ // 更新：{flag}
+ // 此时需要删除多余的属性 name 和 age
+ const postCleanupEffect = (effect: ReactiveEffect) => {
+   // 如果 依赖项的 deps 的长度小于 trackId，则说明有属性被删除
+   if (effect.deps.length > effect._depsLength) {
+     //遍历删除的属性
+     for (let i = effect._depsLength; i < effect.deps.length; i ++) {
+       cleanupDepEffect(effect.deps[i], effect)
+     }
+     // 重置 deps 的长度
+     effect.deps.length = effect._depsLength
+   }
+ }
+ 
+ export let activeEffect: any // 当前激活的effect
+ 
+ // 创建响应式 effect
+ export class ReactiveEffect {
+   public active = true // 是否激活
+   deps: any[] = [] // 存储依赖关系
+   _trackId = 0 // 用于记录 effect 执行的次数, 防止重复收集依赖
+   _depsLength = 0 // 用于记录 deps 的长度
+   _running = 0 // 用于记录 effect 是否正在执行
+ 
+   constructor(public fn: Function, public scheduler?: Function) {}
+   run() {
+     // 如果没有激活，则直接执行fn
+     if (!this.active) {
+       return this.fn()
+     }
+     let lastEffect = activeEffect // 保存当前激活的effect
+     try {
+       activeEffect = this // 设置当前激活的effect
+       // 标记为正在执行
+       this._running++
+       // 执行之前需要清理旧的依赖关系
+       preCleanupEffect(this)
+       return this.fn() // 执行fn
+     } finally {
+       // 标记为执行完毕
+       this._running--
+       // 执行后需要清理旧的依赖关系
+       postCleanupEffect(this)
+       activeEffect = lastEffect // 恢复上一次激活的effect
+     }
+   }
+ }
+ 
+ // 创建effect
+ export const effect = (fn: Function, options: Record<string, any> = {}) => {
+   const _effect = new ReactiveEffect(fn, () => {
+     _effect.run()
+   })
+ 
+   // 判断是否有用户传递的配置
+   if (options) {
+     // 合并配置
+     extend(_effect, options)
+   }
+   // 执行渲染
+   _effect.run()
+ 
+   // 定义 runner 方法，返回给用户，让用户决定何时执行 effect
+   const runner = _effect.run.bind(_effect)
+   runner.effect = _effect
+   return runner
+ }
+ 
+ // 清理旧的依赖关系
+ function cleanupDepEffect(dep: Dep, effect: ReactiveEffect) {
+   // 获取对象和属性的依赖关系
+   const trackId = dep.get(effect)
+   // 如果对象和属性的依赖关系存在, 且对象和属性的依赖关系和当前effect的依赖关系不一致, 则清理
+   if (trackId !== undefined && effect._trackId !== trackId) {
+     // 清理对象和属性的依赖关系
+     dep.delete(effect)
+     // 如果对象和属性的依赖关系不存在, 则清理
+     if (dep.size === 0) {
+       // 清理对象和属性的依赖关系
+       dep.cleanup()
+     }
+   }
+ }
+ 
+ // 双向记录：将effect添加到dep中映射表中，后续可以根据值的变化触发此映射表中的 effect 
+ // 首次：{ flag, name }
+ // 更新：{ flag, age }, 此时需要将 旧的 { flag, name } 中的 name 删除
+ // 最终：将 age 添加到 { flag, age } 中
+ export const trackEffect = (effect: ReactiveEffect, dep: Dep) => {
+   // 如果上一次依赖项的追踪ID与当前追踪ID不同，则添加依赖项
+   if (dep.get(effect) !== effect._trackId) {
+     // 添加依赖项 
+     dep.set(effect, effect._trackId)
+     // 获取上一次的依赖项
+     const oldDep = effect.deps[effect._depsLength]
+     // 如果上一次的依赖项不等于新的依赖项
+     if (oldDep !== dep) {
+       // 如果上一次的依赖项存在
+       if (oldDep) {
+         // 删除旧的依赖项
+         cleanupDepEffect(oldDep, effect)
+       }
+       // 添加新的依赖项
+       effect.deps[effect._depsLength++] = dep
+     } else {
+       effect._depsLength++ // 添加依赖项长度
+     }
+   }
+ }
+ 
+ // 触发：将dep中的effect添加到effectScheduler中执行
+ export const triggerEffects = (dep: Dep) => {
+   for (const effect of dep.keys()) {
+     if (!effect._running) {
+       if (effect.scheduler) {
+         // 执行调度器，等价于调用 effect.run()
+         effect.scheduler() 
+       } else {
+         // 否则执行 effect.run()
+         effect.run()
+       }
+     }
+   }
}
```

##### dep.ts
```typescript
import { ReactiveEffect } from "./effect"

export type Dep = Map<ReactiveEffect, number> & {
  cleanup: () => void
  computed?: any
  name?: string // 源码中没有这个属性，这里为了方便调试
}

// 创建依赖关系
export const createDep = (cleanup: () => void, computed?: any, key?: unknown): Dep => {
  const dep = new Map() as any
  dep.cleanup = cleanup
  dep.name = key
  return dep
}
```

##### baseHandler.ts
```diff
-import { ReactiveFlags } from "./reactive"
+import { hasChanged, isObject } from "@g-vue-next/shared"
+import { TrackOpTypes, TriggerOpTypes } from "./constants"
+import { reactive, ReactiveFlags } from "./reactive"
+import { track, trigger } from "./reactiveEffect"
 
-// 响应式对象的处理器
-export const mutableHandlers: ProxyHandler<any> = {
+class BaseReactiveHandler implements ProxyHandler<any> {
   get(target, p, receiver) {
     //! receiver 表示代理对象本身
     // 判断是否是 IS_REACTIVE, 如果是表示是一个代理对象则返回 true
     if (p === ReactiveFlags.IS_REACTIVE) {
       return true
     }
-    return Reflect.get(target, p, receiver)
-  },
-  set(target, p, newValue, receiver) {
-    return Reflect.set(target, p, newValue, receiver)
-  },
-}

+    // 收集依赖
+    track(target, TrackOpTypes.GET, p)
+    // 获取属性值
+    const res = Reflect.get(target, p, receiver)
+    // 深度代理，递归代理
+    if(isObject(res)) {
+      return reactive(res)
+    }
+    return res
+  }
+}
+
+    // 收集依赖
+    track(target, TrackOpTypes.GET, p)
+    // 获取属性值
+    const res = Reflect.get(target, p, receiver)
+    // 深度代理，递归代理
+    if(isObject(res)) {
+      return reactive(res)
+    }
+    return res
+  }
+}
+
+class MutableReactiveHandler extends BaseReactiveHandler {
+  set(target, p, value, receiver) {
+    let oldValue = target[p] // 获取旧值
+    const res = Reflect.set(target, p, value, receiver)
+    if (hasChanged(value, oldValue)) {
+      // 触发依赖
+      trigger(target, TriggerOpTypes.SET, p, value, oldValue)
+    }
+    return res
+  }
+}
+
+// 响应式对象的处理器
+export const mutableHandlers: ProxyHandler<object> = new MutableReactiveHandler()
```

##### reactiveEffect.ts
```typescript
import { TrackOpTypes, TriggerOpTypes } from "./constants";
import { createDep } from "./dep";
import { activeEffect, trackEffect, triggerEffects } from "./effect";

// 存储对象和属性的依赖关系
const targetMap = new WeakMap();
// 收集依赖
export const track = (target: object, type: TrackOpTypes, key: unknown) => {
  // 判断当前是否处于effect中
  if (activeEffect) {
    // 获取对象和属性的依赖关系
    let depsMap = targetMap.get(target);
    // 如果对象和属性的依赖关系不存在, 则创建
    if (!depsMap) {
      // 创建对象和属性的依赖关系
      targetMap.set(target, (depsMap = new Map()))
    }
    // 获取属性的依赖关系
    let dep = depsMap.get(key);
    // 如果属性的依赖关系不存在, 则创建
    if(!dep) {
      // 创建属性的依赖关系
      depsMap.set(key, (dep = createDep(() => depsMap.delete(key), null, key)))
    }
    // 添加依赖关系
    trackEffect(activeEffect, dep)
  }
}

// 触发更新
export const trigger = (target, type: TriggerOpTypes, key?: unknown, value?: unknown, oldValue?: unknown) => {
  // 获取对象和属性的依赖关系
  const depsMap = targetMap.get(target)
  // 如果对象和属性的依赖关系不存在, 则返回
  if (!depsMap) return
  // 获取属性的依赖关系
  let dep = depsMap.get(key)
  // 如果属性的依赖关系存在, 则触发更新
  if (dep) {
    // 触发更新
    triggerEffects(dep)
  }
}
```

##### constants.ts
```typescript
export enum TrackOpTypes {
  GET = 'get',
  HAS = 'has',
  ITERATE = 'iterate'
}

export enum TriggerOpTypes {
  SET = 'set',
  ADD = 'add',
  DELETE = 'delete',
  CLEAR = 'clear'
}
```

### shared
#### src
##### general.ts
```diff
 // 判断是否是函数
 export const isFunction = (val: any) => typeof val === 'function'
 // 判断是否是对象
-export const isObject = (val: any) => val !== null && typeof val === 'object'
+export const isObject = (val: any) => val !== null && typeof val === 'object'
+// 判断是否发生改变
+export const hasChanged = (value: any, oldValue: any) => !Object.is(value, oldValue)
+// 合并对象
+export const extend = Object.assign
```

# 示例代码
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>effect</title>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    // import { reactive, effect } from '../../node_modules/vue/dist/vue.esm-browser.js'
    import { reactive, effect } from '../../packages/reactivity/dist/reactivity.esm.js'

    const app = document.querySelector('#app')

    // reactive 让数据变成响应式
    // effect  副作用，数据变化后可以让 effect 函数重新执行，组件、watch、computed 都是基于 effect 实现的
    const obj = { name: 'test', age: 18, flag: true, address: { province: '北京' , city: '北京', street: '朝阳' }}
    const state = reactive(obj)
    
    // 2.测试嵌套 effect
    // effect(() => {
    //   console.log('effect run')
    //   app.innerHTML = `${state.name}, ${state.age}`
    // })

    // 3.测试 effect 嵌套
    // effect(() => {
    //   console.log('effect run')
    //   app.innerHTML = `${state.name}`
    //   effect(() => {
    //     console.log('effect2 run')
    //     app.innerHTML = `${state.name}`
    //   })
    //   console.log('effect run')
    //   app.innerHTML = `${state.age}`
    // })

    // // 更新
    // setTimeout(() => {
    //   state.name = 'test1'
    //   state.age = 19
    // }, 1000)

    // setTimeout(() => {
    //   state.age++ // 这里访问age不会出发嵌套的 effect，因为实在 effect 之外访问的 age
    // }, 2000);

    // 4.测试条件
    // effect(() => {
    //   console.log('effect run')
    //   app.innerHTML = state.flag ? `${state.name}` : `${state.age}`
    // })

    // setTimeout(() => {
    //   state.flag = false
    // }, 1000);

    // setTimeout(() => {
    //   // 此时 flag 已经被修改为 false，所以 state.name 不会触发 effect
    //   state.name = 'test1'
    // }, 2000);

    // 5.测试多次获取值
    // effect(() => {
    //   console.log('effect run')
    //   app.innerHTML = state.flag ? `${state.name}` : `${state.age}`
    //   // app.innerHTML = state.flag ? `${state.name}${state.a}${state.b}${state.c}` : `${state.age}`
    // })

    // setTimeout(() => {
    //   state.flag = false
    //   setTimeout(() => {
    //     // 此时 flag 已经被修改为 false，所以 state.name 不会触发 effect
    //     console.log('修改 name 属性后，不应该出发 effect，因为此时的 依赖项为 {flag, age}')
    //     state.name = 'test1'
    //   }, 1000);
    // }, 1000);

    // 6.测试调度执行
    // const runner = effect(() => { 
    //   console.log('effect run')
    //   app.innerHTML = `${state.name}, ${state.age}`
    // }, {
    //   scheduler() {
    //     console.log('数据更新了，不重新渲染，走自己的逻辑')
    //     runner()// 用户自己决定何时重新渲染
    //   }
    // })

    // setTimeout(() => {
    //   state.name = 'test1'
    // }, 1000);

    // 7.测试防止递归调用
    // effect(() => {
    //   console.log('effect run')
    //   app.innerHTML = `${state.name}, ${state.age}`
    //   state.name = 'test1' + Math.random()
    // })

    // 8.测试深度代理
    effect(() => {
      console.log('effect run')
      app.innerHTML = `${state.address.province}, ${state.address.city}, ${state.address.street}`
    })

    setTimeout(() => {
      state.address.province = '上海'
      state.address.city = '上海'
      state.address.street = '虹口'
    }, 1000);
  </script>
</body>
</html>
```

# 测试代码
```shell
pnpm preview
```



