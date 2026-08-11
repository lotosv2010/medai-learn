# 简介
+ [<font style="color:rgb(66, 184, 131);">watcheffect()</font>](https://cn.vuejs.org/api/reactivity-core.html#watcheffect)：立即运行一个函数，同时响应式地追踪其依赖，并在依赖更改时重新执行。

# 基本使用
```typescript
import { reactive, watchEffect } from 'vue'

const state = reactive({ name: "test", age: 10 });

const unwatch = watchEffect(() => {
  console.log(state.name, state.age)
})

setTimeout(() => {
  state.name = "test2";
}, 1000);


setTimeout(() => {
  // 停止侦听器
  unwatch()
  state.name = "test3";
  state.age = 11;
}, 4000);
```

# 功能清单
+ 实现watchEffect
+ 实现unwatch
+ 实现副作用清理

# 源码实现
## packages
### runtime-core
#### src
##### apiWatch.ts
```diff
-import { ComputedRef, ReactiveEffect, Ref } from "@g-vue-next/reactivity";
-import { isObject } from "@g-vue-next/shared";
+import { ComputedRef, isReactive, isRef, ReactiveEffect, Ref } from "@g-vue-next/reactivity";
+import { isFunction, isObject } from "@g-vue-next/shared";

+export interface WatchOptionsBase {
+  flush?: 'pre' | 'post' | 'sync' // 默认：'pre'
+}

-export interface WatchOptions {
+export interface WatchOptions extends WatchOptionsBase {
  deep?: boolean | number;
  immediate?: boolean;
}

export type OnCleanup = (cleanupFn: () => void) => void;

export type WatchSource<T = any> = Ref<T> | ComputedRef<T> | (() => T);

export type WatchEffect = (onCleanup: OnCleanup) => void;

export type WatchCallback<V = any, OV = any> = (newValue: V, oldValue: OV, onCleanup: OnCleanup) => void;

+export type WatchStopHandle = () => void;

function doWatch(
  source: WatchSource | WatchSource[] | WatchEffect | object,
  cb: Function,
  {
    deep,
    immediate,
+    flush
  }: WatchOptions = {}
-) {
+): WatchStopHandle {
  const reactiveGetter = (source: object) => {
    if(deep) return source
    if (deep === false || deep === 0) {
      return traverse(source, 1)
    }
    return traverse(source)
  }

  let getter
  let oldValue
+  if (isReactive(source)) {
+    getter = () => reactiveGetter(source)
+  } else if (isRef(source)) {
+    getter = () => source.value
+  } else if (isFunction(source)) {
+    if (cb) {
+      getter = source
+    } else {
+      getter = () => { // watchEffect
+        if (cleanup) cleanup()
+        return (source as any)(onCleanup)
+      }
+    }
+  }

  if (cb && deep) {
    const baseGetter = getter
    const depth = deep === true ? Infinity : deep
    getter = () => traverse(baseGetter(), depth)
  }

+  let cleanup: (() => void) | undefined
+  let onCleanup: OnCleanup = (fn: () => void) => {
+    cleanup = () => {
+      fn() // 执行用户传入的函数, 执行清除副作用的逻辑
+      cleanup = undefined // 重置清除函数
+    }
+  }

+  const job = () => {
+    if (cb) { // watch(source, cb)
+      const newValue = effect.run()
+      // 执行回调前，先调用上一次的清理操作进行清理
+      if (cleanup) {
+        cleanup()
+      }
+      cb(newValue, oldValue, onCleanup)
+      oldValue = newValue
+    } else { // watchEffect
+      effect.run()
+    }
+  }

  const effect = new ReactiveEffect(getter, job)

  if (cb) { // watch
    if (immediate) { // 立即执行一遍, 传递新值和老值
      job()
    } else {
      oldValue = effect.run()
    }
+  } else { // watchEffect
+    effect.run()
+  }

+  const unwatch = () => {
+    effect.stop()
+  }
+  return unwatch
}

export function traverse(value: unknown, depth: number = Infinity, seen?: Set<unknown>) {
  if (depth <= 0 || !isObject(value)) {
    return value;
  }

  seen = seen || new Set();
  if (seen.has(value)) {
    return value;
  }
  seen.add(value);
  depth--
  for (const key in value as any) {
    traverse(value[key], depth, seen);
  }
  return value
}

export const watch = <T = any>(source: WatchSource<T> | T, cb: any, options?: WatchOptions): WatchStopHandle => {
  return doWatch(source as any, cb, options);
};

+export const watchEffect = (effect: WatchEffect, options?: WatchOptionsBase): WatchStopHandle => {
+  return doWatch(effect, null, options)
+}
```

### reactivity
#### src
##### reactive.ts
```diff
import { isObject } from "@g-vue-next/shared"
import { mutableHandlers } from "./baseHandler"
import { ReactiveFlags } from "./constants"

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

+export const isReactive = (value: unknown): boolean => {
+  return !!(value && value[ReactiveFlags.IS_REACTIVE])
+}
```

# 示例代码
## watchEffect.html
```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>watchEffect</title>
</head>

<body>
  <div id="app"></div>
  <script type="module">
    // import { watchEffect, reactive, watch } from '../../node_modules/vue/dist/vue.esm-browser.js';
    import { watchEffect, reactive, watch } from "../../packages/vue/dist/vue.esm.js";

    const state = reactive({ name: "test", age: 10 });

    const unwatch = watchEffect((onCleanup) => {
      console.log(state.name, state.age)
      onCleanup(() => {
        if (count > 3) {
          clearInterval(timer)
        }
      })
    })

    const unwatch2 = watch(
      () => state.name,
      (newVal, oldVal, onCleanup) => {
        console.log(newVal, oldVal);
        onCleanup(() => {
          if (count > 3) {
            clearInterval(timer)
          }
        })
      }, {
        immediate: true
      });

    let count = 0
    let timer = setInterval(() => {
      state.name = "test" + (++count);
      if (count > 3) {
        // 停止侦听器
        unwatch()
        unwatch2()
      }
    }, 1000);
  </script>
</body>

</html>
```

## cleanup.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>cleanup</title>
</head>
<body>
  <script>
    // vue 2 中清理接口返回第一次比第二次慢的问题
    let timer = 4000
    const getData = async (params) => { 
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(params)
        }, timer -= 2000)
      })
    }

    const arr = [];
    const get = async (data) => {
      //  第二次的会将第一次的flag变为false
      let flag = true;

      // 循环取出前面的 () => flag = false 执行
      while(arr.length) {
        const cb = arr.shift()
        cb()
      }
      // 将修改flag 的操作放入 arr 数组中，形成一个闭包，等待下一次执行
      arr.push(() => flag = false)

      // 获取接口返回的数据
      const res = await getData(data)
      console.log(data, flag)
      // 判断 flag 值，如果为 true 则展示数据
      if(flag) {
        console.log(res) // 模拟展示到页面
      }
    } 
    
    
    get('1')
    get('2')

  </script>
</body>
</html>
```

# 测试代码
```shell
pnpm preview
```



