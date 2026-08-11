# 简介
+ [<font style="color:rgb(66, 184, 131);">toRefs()</font>](https://cn.vuejs.org/api/reactivity-utilities.html#torefs)：将一个响应式对象转换为一个普通对象，这个普通对象的每个属性都是指向源对象相应属性的 ref。每个单独的 ref 都是使用<font style="color:rgba(255, 255, 255, 0.87);"> </font>[<font style="color:rgb(66, 184, 131);">toRef()</font>](https://cn.vuejs.org/api/reactivity-utilities.html#toref)<font style="color:rgba(255, 255, 255, 0.87);"> </font>创建的。
+ [<font style="color:rgb(66, 184, 131);">toRef()</font>](https://cn.vuejs.org/api/reactivity-utilities.html#toref)：
    - 可以将值、refs 或 getters 规范化为 refs (3.3+)。
    - 也可以基于响应式对象上的一个属性，创建一个对应的 ref。这样创建的 ref 与其源属性保持同步：改变源属性的值将更新 ref 的值，反之亦然。
+ proxyRefs()：的作用是，如果对象里的数据，有 ref，就自动把数据代理出来。
    - 举个例子：const state = reactive({ count: ref(0) });
    - 这时，如果你使用 state.count.value += 1，因为 data 和 refs 是分别有 getter 和 setter 的，所以会报错，因为无法判断是否使用了 .value，所以无法自动加上或去掉。
    - 解决方案就是 proxyRefs，它会判断是否是 ref，如果是，就自动添加掉 .value。

# 基本使用
```typescript
import { reactive, effect, toRef, toRefs, proxyRefs } from 'vue'

const state = reactive({
  name: 'test',
  age: 10
})


const name = toRef(state, 'name')
const { age } = toRefs(state)
const personRefs = toRefs(state)

effect(() => {
  const {name: n, age:a } = proxyRefs(personRefs)
  console.log('effect run', name, age, )
  console.log('effect run', n, a)
})

setTimeout(() => {
  name.value = 'test2'
  age.value = 11
}, 1000);
```

# 功能清单
+ 实现toRef
+ 实现toRefs
+ 实现proxyRefs
+ 实现isRef
+ 实现unref
+ 实现toValue

# 源码实现
## packages
### reactivity
#### src
##### ref.ts
```diff
-import { hasChanged } from "@g-vue-next/shared"
+import { hasChanged, isArray, isFunction, isObject } from "@g-vue-next/shared"
import { toReactive } from "./reactive"
import { createDep, Dep } from "./dep"
import { activeEffect, trackEffect, triggerEffects } from "./effect"

export interface Ref<T = any> {
  value: T
}

+export type MaybeRef<T = any> = Ref<T> | T

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
    trackEffect(activeEffect, ref.dep ??= createDep(() => (ref.dep = undefined), undefined))
  }
}
export const triggerRefValue = (ref: any) => {
  const dep = ref.dep
  if (dep) {
    triggerEffects(dep)
  }
}

+class ObjectRefImpl<T extends object, K extends keyof T> {
+  public readonly __v_isRef = true
+  constructor(private readonly _object: T, private _key: K, private readonly _defaultValue?: T[K]) {}
+  get value() {
+    const val = this._object[this._key]
+    return val === undefined ? this._defaultValue : val
+  }
+  set value(newValue) {
+    this._object[this._key] = newValue
+  }
+}
+
+function propertyToRef(source: Record<string, any>, key: string, defaultValue?: unknown): any {
+  const val = source[key]
+  return isRef(val) ? val : new ObjectRefImpl(source, key, defaultValue)
+}
+
+class GetterRefImpl<T> {
+  public readonly __v_isRef = true
+  public readonly __v_isReadonly = true
+  constructor(private readonly _getter: () => T) {}
+  get value() {
+    return this._getter()
+  }
+
+}
+export const toRef = (source: Record<string, any> | any , key?: string, defaultValue?: unknown) => {
+  if (isRef(source)) {
+    return source
+  } else if (isFunction(source)) {
+    return new GetterRefImpl(source)
+  } else if (isObject(source)) {
+    return propertyToRef(source, key, defaultValue)
+  } else {
+    return ref(source)
+  }
+}
+
+export const toRefs = (object: Record<string, any>) => {
+  const ret: any = isArray(object) ? new Array(object.length) : {}
+  for (const key in object) {
+    ret[key] = propertyToRef(object, key)
+  }
+  return ret
+}
+
+export const unref = <T>(ref: MaybeRef<T>): T => isRef(ref) ? ref.value : ref 
+
+export const proxyRefs = <T extends object>(objectWithRefs: T) => {
+  return new Proxy(objectWithRefs, {
+    get(target, key, receiver) {
+      return unref(Reflect.get(target, key, receiver))
+    },
+    set(target, key, value, receiver) {
+      const oldValue = target[key]
+      if (isRef(oldValue) && !isRef(value)) {
+        oldValue.value = value
+        return true
+      } else {
+        return Reflect.set(target, key, value, receiver)
+      }
+    }
+  })
+}
+
+export function toValue<T>(source: any): T {
+  return isFunction(source) ? source(): unref(source)
+}
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
+// 判断是否为数组
+export const isArray = Array.isArray
```

# 示例代码
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>toRef</title>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    // import { ref, effect, reactive, toRef, toRefs, proxyRefs, toValue } from '../../node_modules/vue/dist/vue.esm-browser.js'
    import { ref, effect, reactive, toRef, toRefs, proxyRefs, toValue } from "../../packages/reactivity/dist/reactivity.esm.js"

    const app = document.querySelector('#app')

    const state = reactive({
      name: 'test',
      age: 10
    })

    // const state2 = reactive({
    //   count: ref(0)
    // })

    const name = toRef(state, 'name')
    const { age } = toRefs(state)
    const personRefs = toRefs(state)

    effect(() => {
      const {name: n, age:a } = proxyRefs(personRefs)
      // console.log('effect run', name, age, )
      console.log('effect run', n, a)
      // console.log(state2.count.value)
      app.innerHTML = `
        <div>toRef: name ==> ${name.value}</div>
        <div>toRefs: age ==> ${age.value}</div>
        <div>proxyRefs: n ==> ${n}, a ==> ${a}</div>
      `
    })

    setTimeout(() => {
      name.value = 'test2'
      age.value = 11
      // state2.count.value += 1
    }, 1000);

    setTimeout(() => {
      name.value = 'test3'
      age.value = 12
    }, 2000);

    // 测试toValue
    console.log(toValue(ref(11)))
    console.log(toValue(() => 11))
    console.log(toValue(11))
    console.log(toValue('11'))
  </script>
</body>
</html>
```

# 测试代码
```shell
pnpm preview
```



