# 简介
+ [<font style="color:rgb(66, 184, 131);">computed()</font>](https://cn.vuejs.org/api/reactivity-core.html#computed)：接受一个<font style="color:rgba(255, 255, 255, 0.87);"> </font>[<font style="color:rgb(66, 184, 131);">getter 函数</font>](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Functions/get#description)，返回一个只读的响应式<font style="color:rgba(255, 255, 255, 0.87);"> </font>[<font style="color:rgb(66, 184, 131);">ref</font>](https://cn.vuejs.org/api/reactivity-core.html#ref)<font style="color:rgba(255, 255, 255, 0.87);"> </font>对象。该 ref 通过 `.value` 暴露 getter 函数的返回值。它也可以接受一个带有 `get` 和 `set` 函数的对象来创建一个可写的 ref 对象。

# 基本使用
```typescript
import { ref, computed } from 'vue'

const count = ref(1)
const plusOne = computed({
  get: () => count.value + 1,
  set: (val) => {
    count.value = val - 1
  }
})


effect(() => {
  console.log(count.value, plusOne.value) 
})

setTimeout(() => {
  plusOne.value = 1
}, 1000);
```

> 计算属性 plusOne，计算属性依赖的值 count
>
> 计算属性本身就是一个 effect，有一个标识 dirty = true，访问的时候会，触发 name 属性的 get 方法(依赖收集）
>
> 将 name 属性和计算属性做一个映射，稍后 name 变化后会触发计算属性的 scheduler
>
> 计算属性可能在 effect 中使用，当取计算属性的时候，会对当前的 effect 进行依赖收集
>
> 如果 name 属性变化了，会通知计算属性将 dirty 变为true (触发计算属性收集的 effect)
>

# 功能清单
+ 实现computed
+ 实现缓存

# 源码实现
+ 实现原理
    - 计算属性维护了一个 dirty 属性，默认就是 true，稍后运行过一次会将 dirty 变为false，并且稍后依赖的值变化后会再次让 dirty 变为 true
    - 计算属性也是一个 effect, 依赖的属性会收集这个计算属性，当前值变化后，会让 computedEffect 里面 dirty 变为true
    - 计算属性具备收集能力的，可以收集对应的 effect，依赖的值变化后会触发 effect 重新执行

## packages
### reactivity
#### src
##### index.ts
```diff
export * from './reactive'
export * from './effect'
export * from './ref'
+export * from './computed'
```

##### computed.ts
```typescript
import { isFunction, NOOP } from "@g-vue-next/shared";
import { ReactiveEffect } from "./effect";
import { Dep } from "./dep";
import { trackRefValue, triggerRefValue } from "./ref";

declare const ComputedRefSymbol: unique symbol

export type ComputedGetter<T> = (oldValue?: T) => T
export type ComputedSetter<T> = (value: T) => void
export interface WritableComputedOptions<T> {
  get: ComputedGetter<T>;
  set: ComputedSetter<T>;
}

export interface WritableComputedRef<T> {
  readonly effect: ReactiveEffect<T>
}

export interface ComputedRef<T> extends WritableComputedRef<T> {
  value: T
  [ComputedRefSymbol]: true
}

class ComputedRefImpl<T> { 
  public readonly effect: ReactiveEffect<T> // 记录响应式依赖关系
  public dep?: Dep = undefined // 记录依赖关系
  public __v_isRef = true // 标记这是一个 ref 对象
  private _value: T // 缓存值

  constructor(
    private getter: ComputedGetter<T>,
    private readonly _setter: ComputedSetter<T>,
    isReadonly: boolean
  ) {
    this.effect = new ReactiveEffect(
      () => getter(this._value), // 创建响应式依赖关系
      () => { // 触发依赖关系
        // 计算属性依赖的值变化后，触发渲染 effect 
        // 还需要让计算属性的 effect 的 dirty 变脏
        triggerRefValue(this)
      }
    )
  }

  get value() { 
    // 这里的作用是做优化，只有当 effect.dirty=true 的时候才会触发重新计算
    if (this.effect.dirty) {
      this._value = this.effect.run()
      // 这里的作用是让计算属性和其依赖收的 effect 关联起来，并且让 effect 的 dirty 设置为 true，这样就能触发渲染 effect 
      trackRefValue(this) // 收集依赖
    }
    return this._value;
  }
  set value(newValue: T) {
    // 这个就是 ref 的 setter
    this._setter(newValue)
  }
  get _dirty() {
    return this.effect.dirty
  }
  set _dirty(v: boolean) {
    this.effect.dirty = v
  }
}

export function computed<T>(getter: ComputedGetter<T>, debugOptions?: object): ComputedRef<T>
export function computed<T>(options: WritableComputedOptions<T>, debugOptions?: object): WritableComputedRef<T>
export function computed<T>(getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>, debugOptions?: object): ComputedRef<T> | WritableComputedRef<T> {
  let getter: ComputedGetter<T>
  let setter: ComputedSetter<T>

  const onlyGetter = isFunction(getterOrOptions)
  if (onlyGetter) {
    getter = getterOrOptions as ComputedGetter<T>
    setter = NOOP
  } else {
    getter = (getterOrOptions as WritableComputedOptions<T>).get
    setter = (getterOrOptions as WritableComputedOptions<T>).set
  }

  const cRef = new ComputedRefImpl(getter, setter, onlyGetter || !setter)
  return cRef
}
```

##### effect.ts
```diff
import { extend } from "@g-vue-next/shared"
import { Dep } from "./dep"
+import { DirtyLevels } from "./constants"

// 执行 effect 之前的清理逻辑
const preCleanupEffect = (effect: ReactiveEffect) => {
  effect._trackId ++ // trackId 递增，用于判断是否需要执行 cleanup
  effect._depsLength = 0 // 重置 deps 的长度
}

// 执行 effect 之后的清理逻辑
// 首次：{flag, name, age}
// 更新：{flag}
// 此时需要删除多余的属性 name 和 age
const postCleanupEffect = (effect: ReactiveEffect) => {
  // 如果 依赖项的 deps 的长度小于 trackId，则说明有属性被删除
  if (effect.deps.length > effect._depsLength) {
    //遍历删除的属性
    for (let i = effect._depsLength; i < effect.deps.length; i ++) {
      cleanupDepEffect(effect.deps[i], effect)
    }
    // 重置 deps 的长度
    effect.deps.length = effect._depsLength
  }
}

export let activeEffect: any // 当前激活的effect

// 创建响应式 effect
-export class ReactiveEffect {
+export class ReactiveEffect<T = any> {
  public active = true // 是否激活
  deps: any[] = [] // 存储依赖关系
  _trackId = 0 // 用于记录 effect 执行的次数, 防止重复收集依赖
  _depsLength = 0 // 用于记录 deps 的长度
  _running = 0 // 用于记录 effect 是否正在执行
+  _dirtyLevel = DirtyLevels.Dirty // 脏值级别, 用于标记需要重新计算的属性

  constructor(public fn: Function, public scheduler?: Function) {}

+  public get dirty() {
+    return this._dirtyLevel >= DirtyLevels.Dirty
+  }
+  public set dirty(v: boolean) {
+    this._dirtyLevel = v ? DirtyLevels.Dirty : DirtyLevels.NotDirty
+  }

  run() {
+    // 每次执行后 effect 变为不脏
+    this._dirtyLevel = DirtyLevels.NotDirty
    // 如果没有激活，则直接执行fn
    if (!this.active) {
      return this.fn()
    }
    let lastEffect = activeEffect // 保存当前激活的effect
    try {
      activeEffect = this // 设置当前激活的effect
      // 标记为正在执行
      this._running++
      // 执行之前需要清理旧的依赖关系
      preCleanupEffect(this)
      return this.fn() // 执行fn
    } finally {
      // 标记为执行完毕
      this._running--
      // 执行后需要清理旧的依赖关系
      postCleanupEffect(this)
      activeEffect = lastEffect // 恢复上一次激活的effect
    }
  }
}

// 创建effect
export const effect = (fn: Function, options: Record<string, any> = {}) => {
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run()
  })

  // 判断是否有用户传递的配置
  if (options) {
    // 合并配置
    extend(_effect, options)
  }
  // 执行渲染
  _effect.run()

  // 定义 runner 方法，返回给用户，让用户决定何时执行 effect
  const runner = _effect.run.bind(_effect)
  runner.effect = _effect
  return runner
}

// 清理旧的依赖关系
function cleanupDepEffect(dep: Dep, effect: ReactiveEffect) {
  // 获取对象和属性的依赖关系
  const trackId = dep.get(effect)
  // 如果对象和属性的依赖关系存在, 且对象和属性的依赖关系和当前effect的依赖关系不一致, 则清理
  if (trackId !== undefined && effect._trackId !== trackId) {
    // 清理对象和属性的依赖关系
    dep.delete(effect)
    // 如果对象和属性的依赖关系不存在, 则清理
    if (dep.size === 0) {
      // 清理对象和属性的依赖关系
      dep.cleanup()
    }
  }
}

// 双向记录：将effect添加到dep中映射表中，后续可以根据值的变化触发此映射表中的 effect 
// 首次：{ flag, name }
// 更新：{ flag, age }, 此时需要将 旧的 { flag, name } 中的 name 删除
// 最终：将 age 添加到 { flag, age } 中
export const trackEffect = (effect: ReactiveEffect, dep: Dep) => {
  // 如果上一次依赖项的追踪ID与当前追踪ID不同，则添加依赖项
  if (dep.get(effect) !== effect._trackId) {
    // 添加依赖项 
    dep.set(effect, effect._trackId)
    // 获取上一次的依赖项
    const oldDep = effect.deps[effect._depsLength]
    // 如果上一次的依赖项不等于新的依赖项
    if (oldDep !== dep) {
      // 如果上一次的依赖项存在
      if (oldDep) {
        // 删除旧的依赖项
        cleanupDepEffect(oldDep, effect)
      }
      // 添加新的依赖项
      effect.deps[effect._depsLength++] = dep
    } else {
      effect._depsLength++ // 添加依赖项长度
    }
  }
}

// 触发：将dep中的effect添加到effectScheduler中执行
export const triggerEffects = (dep: Dep) => {
  for (const effect of dep.keys()) {
+    // 当前的值是不脏的，触发更新需将值变脏
+    if (effect._dirtyLevel < DirtyLevels.Dirty) {
+      effect._dirtyLevel = DirtyLevels.Dirty
+    }
    if (!effect._running) {
      if (effect.scheduler) {
        // 执行调度器，等价于调用 effect.run()
        effect.scheduler() 
      } else {
        // 否则执行 effect.run()
        effect.run()
      }
    }
  }
}
```

##### constants.ts
```diff
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

+export const enum ReactiveFlags {
+  IS_REACTIVE = '__v_isReactive'
+}
+
+export const DirtyLevels = {
+  NotDirty: 0, // 不脏，用上一次返回的值
+  QueryingDirty: 1, // 脏，正在查询中
+  MaybeDirty_ComputedSideEffect: 2, // 脏，但是可能在计算属性的副作用中
+  MaybeDirty: 3, // 脏，但是不在计算属性的副作用中
+  Dirty: 4, // 脏，需要重新计算
+}
```

##### reactive.ts
```diff
import { isObject } from "@g-vue-next/shared"
import { mutableHandlers } from "./baseHandler"
+import { ReactiveFlags } from "./constants"
-// 响应式标识
-export const enum ReactiveFlags {
-  IS_REACTIVE = "__v_isReactive", // 判断对象是否是响应式对象
-}

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

export const toReactive = <T extends unknown>(value: T): T => {
  return isObject(value) ? reactive(value) : value
}
```

##### baseHandler.ts
```diff
import { hasChanged, isObject } from "@g-vue-next/shared"
-import { TrackOpTypes, TriggerOpTypes } from "./constants"
-import { reactive, ReactiveFlags } from "./reactive"
+import { ReactiveFlags, TrackOpTypes, TriggerOpTypes } from "./constants"
+import { reactive } from "./reactive"
import { track, trigger } from "./reactiveEffect"

class BaseReactiveHandler implements ProxyHandler<any> {
  get(target, p, receiver) {
    //! receiver 表示代理对象本身
    // 判断是否是 IS_REACTIVE, 如果是表示是一个代理对象则返回 true
    if (p === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    // 收集依赖
    track(target, TrackOpTypes.GET, p)
    // 获取属性值
    const res = Reflect.get(target, p, receiver)
    // 深度代理，递归代理
    if(isObject(res)) {
      return reactive(res)
    }
    return res
  }
}

class MutableReactiveHandler extends BaseReactiveHandler {
  set(target, p, value, receiver) {
    let oldValue = target[p] // 获取旧值
    const res = Reflect.set(target, p, value, receiver)
    if (hasChanged(value, oldValue)) {
      // 触发依赖
      trigger(target, TriggerOpTypes.SET, p, value, oldValue)
    }
    return res
  }
}

// 响应式对象的处理器
export const mutableHandlers: ProxyHandler<object> = new MutableReactiveHandler()
```

### shared
#### src
##### general.ts
```diff
// 判断是否是函数
export const isFunction = (val: any) => typeof val === 'function'
// 判断是否是对象
export const isObject = (val: any) => val !== null && typeof val === 'object'
// 判断是否发生改变
export const hasChanged = (value: any, oldValue: any) => !Object.is(value, oldValue)
// 合并对象
export const extend = Object.assign
// 判断是否为数组
export const isArray = Array.isArray
+// 创建一个空函数
+export const NOOP = () => {}
```

# 示例代码
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>computed</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module">
      // import { computed, reactive, effect } from '../../node_modules/vue/dist/vue.esm-browser.js';
      import {computed, reactive, effect} from "../../packages/reactivity/dist/reactivity.esm.js";

      const obj = { name: "test", age: 10 };
      const state = reactive(obj);

      const name = computed({
        get: (oldValue) => {
          console.log("name computed run", oldValue);
          return state.name + '!';
        },
        set: value => {
          // 这里是不能直接修改name的，可以通过修改依赖的state的name的值来修改name的
          state.name = value;
          // name.value = value; // 错误的写法
        }
      });
      const age = computed(() => {
        console.log("age computed run");
        return state.age + '!';
      });
      effect(() => {
        // 这里第二次访问name时由于没有脏数据，将不会再次执行getter，也不会收集effect
        console.log('name', name.value);
        console.log('name', name.value);
        console.log('name', name.value);
        console.log('age', age.value);
        console.log('age', age.value);
        console.log('age', age.value);
        document.querySelector("#app").innerHTML = `
          <div>${name.value}</div>
          <div>${age.value}</div>
        `;
      })

      setTimeout(() => {
        // name.value = "test2";
        state.name = "test2";
        // state.age = 11;
      }, 1000);
    </script>
  </body>
</html>

```

# 测试代码
```shell
pnpm preview
```



