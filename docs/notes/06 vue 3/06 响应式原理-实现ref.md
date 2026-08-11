# 简介
+ ref：接受一个内部值，返回一个响应式的、可更改的 ref 对象，此对象只有一个指向其内部值的属性 `.value`。

# 基本使用
```typescript
import { ref } from 'vue'

const name = ref('test')

effect(() => {
  console.log(name.value)
})

setTimeout(() => {
  name.value = 'test2'
}, 1000);
```

# 功能清单
+ 实现ref

# 源码实现
## packages
### reactivity
#### src
##### index.ts
```diff
export * from './reactive'
export * from './effect'
+export * from './ref'
```

##### reactive.ts
```diff
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

+export const toReactive = <T extends unknown>(value: T): T => {
+  return isObject(value) ? reactive(value) : value
+}
```

##### ref.ts
```typescript
import { hasChanged } from "@g-vue-next/shared"
import { toReactive } from "./reactive"
import { createDep, Dep } from "./dep"
import { activeEffect, trackEffect, triggerEffects } from "./effect"

export interface Ref<T = any> {
  value: T
}

export const ref = (value: unknown) => {
  return createRef(value, false)
}

export function isRef<T>(r: Ref<T> | unknown):r is Ref<T>
export function isRef(r: any): r is Ref {
  return !!(r && r.__v_isRef === true)
}

function createRef(rawValue: unknown, shallow?: boolean) {
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue, shallow)
}

class RefImpl<T> {
  private _value: T // 缓存值
  private _rawValue: T // 原始值
  public readonly __v_isRef = true // 标记是 ref 对象
  public dep?: Dep = undefined // 记录依赖项
  constructor(value: T, public readonly __v_isShallow: boolean) {
    this._value = __v_isShallow ? value : toReactive(value)
    this._rawValue = value
  }
  get value() {
    trackRefValue(this)
    return this._value
  }
  set value(newValue) {
    if (hasChanged(newValue, this._rawValue)) {
      this._value = newValue
      this._rawValue = newValue
      triggerRefValue(this)
    }
  }
}

export const trackRefValue = (ref: any) => {
  if(activeEffect) {
    //! 这需要注意 ref.dep 优质的时候，使用 ref.dep ，否则创建 ref.dep ，防止直接创建丢失之前的依赖关系
    trackEffect(activeEffect, ref.dep ??= createDep(() => (ref.dep = undefined), undefined))
  }
}
export const triggerRefValue = (ref: any) => {
  const dep = ref.dep
  if (dep) {
    triggerEffects(dep)
  }
}
```

# 示例代码
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ref</title>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    // import { ref, effect } from '../../node_modules/vue/dist/vue.esm-browser.js'
    import { ref, effect } from '../../packages/reactivity/dist/reactivity.esm.js'

    const app = document.querySelector('#app')

    const name = ref('test')

    effect(() => {
      console.log('effect run', name)
      app.innerHTML = `${name.value}`
    })

    setTimeout(() => {
      name.value = 'test1'
    }, 1000);

  </script>
</body>
</html>
```

# 测试代码
```shell
pnpm preview
```



