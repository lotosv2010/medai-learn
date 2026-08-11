# 简介
+ [<font style="color:rgb(66, 184, 131);">watch()</font>](https://cn.vuejs.org/api/reactivity-core.html#watch)：侦听一个或多个响应式数据源，并在数据源变化时调用所给的回调函数。

# 基本使用
```typescript
import { reactive, watch } from 'vue'

const state = reactive({ name: "test", age: 10 });

setTimeout(() => {
  state.name = "test2";
}, 1000);

watch(() => state.name, (newVal, oldVal) => {
  console.log(newVal, oldVal);
}, {
  immediate: true 
});
```

# 功能清单
+ 实现watch
+ 实现doWatch
+ 支持immediate
+ 支持deep(true/false/undefined/number)，当为 <font style="color:#DF2A3F;">数字</font> 时表示监听的层级

# 创建子包
```shell
cd g-vue-next
mkdir runtime-core 
```

## runtime-core
### 创建入口
```shell
cd packages/runtime-core
mkdir src
cd src
touch index.ts
touch apiWatch.ts
```

### 初始化
```shell
pnpm init
```

```json
{
  "name": "@g-vue-next/runtime-core",
  "version": "3.4.0",
  "description": "",
  "module": "dist/runtime-core.esm.js",
  "buildOptions": {
    "name": "GVueNextRuntimeCore",
    "formats": [
      "esm-bundler",
      "esm",
      "cjs"
    ]
  },
  "scripts": {},
  "keywords": [
    "vue-next",
    "vue",
    "vue3",
    "runtime-core"
  ],
  "author": "Robin",
  "license": "ISC",
  "packageManager": "pnpm@10.12.1"
}
```

### 安装依赖
```shell
pnpm add @g-vue-next/shared@workspace @g-vue-next/reactivity@workspace --filter @g-vue-next/runtime-core
```

```diff
{
  "name": "@g-vue-next/runtime-core",
  "version": "3.4.0",
  "description": "",
  "module": "dist/runtime-core.esm.js",
  "buildOptions": {
    "name": "GVueNextRuntimeCore",
    "formats": [
      "esm-bundler",
      "esm",
      "cjs"
    ]
  },
  "scripts": {},
  "keywords": [
    "vue-next",
    "vue",
    "vue3",
    "runtime-core"
  ],
  "author": "Robin",
  "license": "ISC",
  "packageManager": "pnpm@10.12.1",
+  "dependencies": {
+    "@g-vue-next/reactivity": "workspace:^",
+    "@g-vue-next/shared": "workspace:^"
+  }
}
```

### 编写代码
##### index.ts
```typescript
export * from './apiWatch'
```

##### apiWatch.ts
```typescript
export const watch = () => {}
```

# 源码实现
## packages
### runtime-core
#### src
##### index.ts
```typescript
export * from './apiWatch'
```

##### apiWatch.ts
```typescript
import { ComputedRef, ReactiveEffect, Ref } from "@g-vue-next/reactivity";
import { isObject } from "@g-vue-next/shared";

export interface WatchOptions {
  deep?: boolean | number;
  immediate?: boolean;
}

export type OnCleanup = (cleanupFn: () => void) => void;

export type WatchSource<T = any> = Ref<T> | ComputedRef<T> | (() => T);

export type WatchEffect = (onCleanup: OnCleanup) => void;

export type WatchCallback<V = any, OV = any> = (newValue: V, oldValue: OV, onCleanup: OnCleanup) => void;

function doWatch(
  source: WatchSource | WatchSource[] | WatchEffect | object,
  cb: Function,
  {
    deep,
    immediate
  }: WatchOptions = {}
) {
  const reactiveGetter = (source: object) => {
    if(deep) return source
    if (deep === false || deep === 0) {
      return traverse(source, 1)
    }
    return traverse(source)
  }

  let getter = () => reactiveGetter(source)
  let oldValue

  const job = () => {
    const newValue = effect.run()
    cb(newValue, oldValue)
    oldValue = newValue
  }

  if (cb && deep) {
    const baseGetter = getter
    const depth = deep === true ? Infinity : deep
    getter = () => traverse(baseGetter(), depth)
  }

  const effect = new ReactiveEffect(getter, job)

  if (cb) {
    if (immediate) {
      job()
    } else {
      oldValue = effect.run()
    }
  }
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

export const watch = <T = any>(source: WatchSource<T> | T, cb: any, options?: WatchOptions) => {
  return doWatch(source as any, cb, options);
};
```

### vue
#### 安装依赖
```shell
pnpm add @g-vue-next/runtime-core@workspace --filter g-vue-next
```

```diff
{
  "name": "g-vue-next",
  "version": "3.4.0",
  "description": "",
  "module": "dist/vue.esm.js",
  "unpkg": "dist/vue.global.js",
  "buildOptions": {
    "name": "GVueNext",
    "formats": [
      "esm-bundler",
      "esm-browser",
      "esm",
      "global",
      "cjs"
    ]
  },
  "keywords": [
    "vue",
    "vue3",
    "vue-next"
  ],
  "author": "Robin",
  "license": "ISC",
  "dependencies": {
    "@g-vue-next/reactivity": "workspace:^",
+    "@g-vue-next/runtime-core": "workspace:^",
    "@g-vue-next/shared": "workspace:^"
  }
}
```

#### src
##### index.ts
```diff
export * from '@g-vue-next/shared'
export * from '@g-vue-next/reactivity'
+export * from '@g-vue-next/runtime-core'
```

# 示例代码
```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>watch</title>
</head>

<body>
  <div id="app"></div>
  <script type="module">
    // import { watch, reactive, ref } from '../../node_modules/vue/dist/vue.esm-browser.js';
    import { watch, reactive, ref } from "../../packages/vue/dist/vue.esm.js";

    const state = reactive({ name: "test", age: 10, child: { name: 'child' } });
    const count = ref(0)

    setTimeout(() => {
      state.child.name = "test2";
      // state.age = 11;
      count.value++;
    }, 1000);

    watch(
      state,
      // () => state.age,
      (newVal, oldVal) => {
        console.log(newVal, oldVal);
      }, {
      immediate: true,
      // deep: false
      // deep: true
      deep: 2
    });

    watch(
      count,
      (newVal, oldVal) => {
        console.log('ref', newVal, oldVal);
      }
    );

  </script>
</body>

</html>
```

# 测试代码
```shell
pnpm preview
```



