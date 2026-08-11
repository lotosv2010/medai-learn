# 源码实现
## package.json
```json
{
  "version": "1.0.0",
  "description": "pinia 源码",
  "type": "module",
  "scripts": {
    "dev": "node scripts/dev.js",
    "preview": "http-server -d -p 9091 -o /examples"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.13.1",
  "devDependencies": {
    "esbuild": "^0.25.9",
    "http-server": "^14.1.1",
    "minimist": "^1.2.8",
    "typescript": "^5.9.2"
  },
  "dependencies": {
    "pinia": "^3.0.3",
    "vue": "^3.5.18"
  }
}
```

## tsconfig.json
```json
{
  "compilerOptions": {
    "outDir": "dist", // 输出目录
    "sourceMap": true, // 生成sourceMap
    "target": "es2016", // 目标版本
    "module": "esnext", // 模块类型
    "moduleResolution": "node", // 模块解析策略
    "strict": false, // 严格模式
    "resolveJsonModule": true, // 解析JSON模块
    "esModuleInterop": true, // 启用ES模块互操作
    "jsx": "preserve", // 保留JSX语法
    "lib": ["ESNext", "DOM"], // 支持的库，ESNext和DOM
    "baseUrl": ".",
    "paths": {
      "@g-pinia/*": ["packages/*/src"],
      "g-pinia": ["packages/pinia/src"],
    }
  }
}
```

## packages
### pinia
#### package.json
```json
{
  "name": "g-pinia",
  "version": "1.0.0",
  "description": "",
  "module": "dist/g-pinia.esm.js",
  "unpkg": "dist/g-pinia.global.js",
  "buildOptions": {
    "name": "GPinia",
    "formats": [
      "esm-bundler",
      "esm-browser",
      "esm",
      "global",
      "cjs"
    ]
  },
  "scripts": {},
  "keywords": [
    "vue-next",
    "vue",
    "vue3",
    "pinia"
  ],
  "author": "Robin",
  "license": "ISC",
  "packageManager": "pnpm@10.13.1"
}

```

#### src
##### index.ts
```typescript
export { createPinia } from './createPinia'
export { defineStore } from './store'

export type {} from './store'
export type { Pinia, PiniaPlugin, PiniaPluginContext } from './rootStore'
export type {
  StateTree,
  Store,
  DefineStoreOptions,
  DefineStoreOptionsBase,
  PiniaCustomProperties,
  PiniaCustomStateProperties,
  StoreDefinition
} from './types'
export { storeToRefs } from './storeToRefs'
```

##### createPinia.ts
```typescript
import { App, effectScope, Ref, ref } from "vue";
import { Pinia, PiniaPlugin, piniaSymbol, setActivePinia } from "./rootStore";
import { StateTree } from "./types";

export function createPinia(): Pinia {
  // 全局作用域，后续可以停止这个作用域
  const scope = effectScope(true)
  // 这里是整个应用共享一个状态，后续通过 defineStore 创建的 store，会给其挂载到这里。
  const state = scope.run<Ref<Record<string, StateTree>>>(() =>
      ref<Record<string, StateTree>>({})
  );

  let _p: Pinia['_p'] = []
  let toBeInstalled: PiniaPlugin[]  = []
  const pinia = {
    install(app: App) {
      setActivePinia(pinia)
      pinia._a = app
      // 在这里挂载 pinia 对象给 Vue 的全局状态，方便后续在组件中使用 inject 函数获取，只能在 setup 中使用
      app.provide(piniaSymbol, pinia)
      // 给 app 挂载全局的属性，后续可以在组件中通过 this.$pinia 获取，这是 vue2 版本的，vue3 没有 this 属性
      // https://cn.vuejs.org/api/application.html#app-config-globalproperties
      app.config.globalProperties.$pinia = pinia as any
      toBeInstalled.forEach(plugin => _p.push(plugin))
      toBeInstalled = []
    },
    use(plugin): Pinia {
      if (!this._a) {
        toBeInstalled.push(plugin)
      } else {
        _p.push(plugin)
      }
      return this
    },
    _p,
    _a: null,
    _e: scope,
    _s: new Map<string, any>(), // 记录 store 
    state: state!
  };
  // console.log(pinia)
  return pinia
}
```

##### store.ts
```typescript
import { computed, ComputedRef, DebuggerEvent, EffectScope, effectScope, getCurrentInstance, h, hasInjectionContext, inject, isReactive, isRef, markRaw, reactive, ref, toRaw, toRefs, warn, watch, WatchOptions } from "vue";
import { activePinia, Pinia, piniaSymbol, setActivePinia } from "./rootStore";
import { _Method, _StoreWithState, DefineSetupStoreOptions, DefineStoreOptions, isPlainObject, MutationType, StateTree, Store, StoreDefinition, StoreGeneric } from "./types";
import { IS_CLIENT } from "./env";
import { assSubscriptions } from './subscriptions'

export interface SetupStoreHelpers {
  action: <Fn extends _Method>(fn: Fn, name?: string) => Fn;
}

interface MarkedAction <Fn extends _Method = _Method> {
  (...args: Parameters<Fn>): ReturnType<Fn>
  [ACTION_MARKER]: boolean
  [ACTION_NAME]: string
}

const ACTION_MARKER = Symbol()
const ACTION_NAME = Symbol()

const { assign } = Object

const fallbackRunWithContext = (fn: () => unknown) => fn()

function isComputed<T>(value: ComputedRef<T> | unknown): value is ComputedRef<T>
function isComputed(o: any): o is ComputedRef {
  return !!(isRef(o) && (o as any).effect)
}

function mergeReactiveObject<
  T extends Record<any, unknown> | Map<unknown, unknown> | Set<unknown>
>(target: T, patchToApply: any): T {
  if (target instanceof Map && patchToApply instanceof Map) {
    patchToApply.forEach((value, key) => target.set(key, value))
  } else if (target instanceof Set && patchToApply instanceof Set) {
    patchToApply.forEach(value => target.add(value))
  }

  for (const key in patchToApply) {
    if (!patchToApply.hasOwnProperty(key)) continue
    const subPatch = patchToApply[key]
    const targetValue = target[key]
    if (
      isPlainObject(targetValue) &&
      isPlainObject(subPatch) &&
      target.hasOwnProperty(key) &&
      !isRef(subPatch) &&
      !isReactive(subPatch)
    ) {
      target[key] = mergeReactiveObject(targetValue, subPatch)
    } else {
      target[key] = subPatch
    }
  }
  return target
}

// options Api
function createOptionsStore<
  Id extends string,
  S extends StateTree,
  G extends {},
  A extends {}
>(
  id: Id,
  options: DefineStoreOptions<Id, S, G, A>,
  pinia: Pinia,
  hot?: boolean
): Store<Id, S, G, A> {

  const { state, getters, actions} = options;
  // 获取缓存的状态
  const initialState: StateTree | undefined = pinia.state.value[id]
  let store: Store<Id, S, G, A>

  // 定义 setup 函数，作用是创建 store 实例
  function setup() {
    // 如果不是 hot 模式，且没有有初始 state，则赋值 state
    if (!initialState && !hot) {
      pinia.state.value[id] = state ? state() : {}
    }
    // 创建 store 实例
    const localState = hot
      ? toRefs(ref(state ? state() : {}).value)
      : toRefs(pinia.state.value[id])
    // 合并 actions 和 getter，最后赋值到 store 实例
    return assign(
      localState, // states
      actions,    // actions
      // getters
      Object.keys(getters ?? {}).reduce((computedGetters, name) => {
        if (name in localState) {
          console.warn(
            `[🍍]: A getter cannot have the same name as another state property. Rename one of them. Found with "${name}" in store "${id}".`
          )
        }
        computedGetters[name] = markRaw(
          computed(() => {
            setActivePinia(pinia)
            // 获取 store
            const store = pinia._s.get(id)
            // 这里的作用是给 getter 添加 store 的 this 指向
            return getters[name].call(store, store)
          })
        )
        return computedGetters

      }, {} as Record<string, ComputedRef>)
    )
  }
  store = createSetupStore(id, setup, options, pinia, hot, true)
  return store as any
}

// composition api
function createSetupStore<
  Id extends string,
  SS extends Record<any, unknown>,
  S extends StateTree,
  G extends {},
  A extends {}
>(
  $id: Id,
  setup: (helper: SetupStoreHelpers) => SS,
  options:
    | DefineSetupStoreOptions<Id, S, G, A>
    | DefineStoreOptions<Id, S, G, A> = {},
  pinia: Pinia,
  hot?: boolean,
  isOptionsStore?: boolean
): Store<Id, S, G, A> {
  // 定义 作用域 这里是 子作用域
  let scope: EffectScope

  const optionsForPlugin = assign({
    actions: {}
  }, options)

  const $subscribeOptions: WatchOptions = { deep: true}

  let isListening: boolean
  let isSyncListening: boolean
  let subscriptions: Set<any> = new Set()
  let actionSubscriptions: Set<any> = new Set()
  let debuggerEvents: DebuggerEvent[] | DebuggerEvent
  const initialState = pinia.state.value[$id]

  if (!isOptionsStore && !initialState && !hot) {
    /* istanbul ignore if */
    pinia.state.value[$id] = {}
  }

  const $patch = (partialStateOrMutator: any) => {
    if (typeof partialStateOrMutator === 'function') {
      partialStateOrMutator(pinia.state.value[$id])
    } else {
      mergeReactiveObject(pinia.state.value[$id], partialStateOrMutator)
    }
  }
  const $reset = isOptionsStore
    ? function $reset(this: _StoreWithState<Id, S, G, A>) {
        const { state } = options as any
        const newState = state ? state() : {}
        this.$patch(($state) => {
          assign($state, newState)
        })
      }
    : () => {
      throw new Error(
        `🍍: Store "${$id}" is built using the setup syntax and does not implement $reset().`
      )
    }

    function $dispose() {
      scope.stop()
      subscriptions.clear()
      actionSubscriptions.clear()
      pinia._s.delete($id)
    }

  // 定义 action，作用是为了增加异步等逻辑
  const action = <Fn extends _Method>(fn: Fn, name: string = ''): Fn => {
    if (ACTION_MARKER in fn) {
      ;(fn as unknown as MarkedAction<Fn>)[ACTION_NAME] = name
      return fn
    }
    const wrappedAction = function(this: any) {
      setActivePinia(pinia)
      const args = Array.from(arguments)
      // TODO 异步逻辑
      let ret: unknown
      try {
        ret = fn.apply(this && this.$id === $id ? this : store, args)
      } catch (error) {
        throw error
      }
      return ret
    }
    wrappedAction[ACTION_MARKER] = true
    wrappedAction[ACTION_NAME] = name
    return wrappedAction as any
  }

  // 定义 partialStore 
  const partialStore ={
    _p: pinia,
    $id,
    $onAction: null,
    $patch,
    $reset,
    $subscribe(callback, options = {}) {
      const removeSubscription = assSubscriptions(
        subscriptions,
        callback,
        options.detached,
        () => stopWatcher()
      )
      const stopWatcher = scope.run(() => 
        watch(
          () => pinia.state.value[$id],
          (state) => {
            if (options.flush === 'sync' ? isSyncListening : isListening) {
              callback({
                  storeId: $id,
                  type: MutationType.direct,
                  events: debuggerEvents
                },
                state
              )
            }
          },
          assign({}, $subscribeOptions, options)
        )
      )

      return removeSubscription
    },
    $dispose
  } as _StoreWithState<Id, S, G, A>

  // 创建 响应式 store
  const store: Store<Id, S, G, A> = reactive(IS_CLIENT 
    ? assign({
      _customProperties: markRaw(new Set<string>())
    }, partialStore) 
    : partialStore
  ) as unknown as Store<Id, S, G, A>

  // 将 store 添加到 _s 缓存中
  pinia._s.set($id, store)

  const runWithContext = pinia?._a?.runWithContext || fallbackRunWithContext
  // 这里是为了划分父子作用域
  const setupStore = runWithContext(() => 
    pinia._e.run(() => // 父作用域
      (scope = effectScope()).run( // 子作用域
        () => setup({ action })
      )
    )
  ) as Record<any, unknown>

  // 覆盖 store 的属性
  for (const key in setupStore) {
    const prop = setupStore[key]
    if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
      //! 只有setupStore 是 reactive 或 ref 的属性，才会被覆盖
      if (!isOptionsStore) {
        pinia.state.value[$id][key] = prop
      }
    } else if (typeof prop === 'function') {
      const actionValue = action(prop as _Method, key)
      setupStore[key] = actionValue
    }
  }

  // 合并 setupStore 结果
  assign(store, setupStore)
  assign(toRaw(store), setupStore)

  // 创建 $state 属性
  Object.defineProperty(store, '$state', {
    get: () => pinia.state.value[$id],
    set: (state) => {
      $patch(($state) => {
        assign($state, state)
      })
    }
  })

  // 执行所有插件
  pinia._p.forEach((extender) => {
    if (IS_CLIENT) {
      const extensions: any = scope.run(() => {
        extender({
          store,
          app: pinia._a,
          pinia,
          options: optionsForPlugin
        })
      })
      Object.keys(extensions || {}).forEach(key => (store as any)._customProperties.add(key))
      assign(store, extensions)
    } else {
      assign(
        store,
        scope.run(() => {
          extender({
            store,
            app: pinia._a,
            pinia,
            options: optionsForPlugin
          })
        })
      )
    }
  })

  isListening = true
  isSyncListening = true
  return store
}

export function defineStore<
  Id extends string,
  S extends StateTree = {},
  G extends {} = {},
  A = {}
>(
  id: Id,
  options: Omit<DefineStoreOptions<Id, S, G, A>, "id">
): StoreDefinition<Id, S, G, A>
export function defineStore<Id extends string, SS>(
  id: Id,
  storeSetup: (helper: SetupStoreHelpers) => SS,
  options?: DefineSetupStoreOptions<
    Id,
    {},
    {},
    {}
  >
): StoreDefinition<Id, {}, {}, {}>

export function defineStore(
  id: any,
  setup?: any,
  setupOptions?: any
) {
  let options: 
    | DefineStoreOptions<
        string,
        StateTree,
        {},
        {}
      >
    | DefineSetupStoreOptions<
        string,
        StateTree,
        {},
        {}
      >
  const isSetupStore = typeof setup === "function"
  options = isSetupStore ? setupOptions : setup

  function useStore(pinia?: Pinia | null, hot?: StoreGeneric): StoreGeneric {
    // 判断当前代码执行环境是否支持通过 provide 和 inject 进行依赖注入
    const hasContext = hasInjectionContext()
    // 获取当前活跃的 pinia
    pinia = (activePinia && activePinia._testing ? null : pinia) || (hasContext ? inject(piniaSymbol, null) : null)
    // 如果 pinia 存在，则设置当前活跃的 pinia
    if (pinia) setActivePinia(pinia) 

    // 如果当前激活的 pinia 不存在，则抛出错误
    if (!activePinia) {
      throw new Error(
        `[🍍]: "getActivePinia()" was called but there was no active Pinia. Are you trying to use a store before calling "app.use(pinia)"?\n` +
          `See https://pinia.vuejs.org/core-concepts/outside-component-usage.html for help.\n` +
          `This will fail in production.`
      )
    }

    // 让 pinia 设置当前 active pinia
    pinia = activePinia

    // 判断是否已经创建过 store，没有则创建并缓存到 _s 中
    if (!pinia._s.has(id)) {
      if (isSetupStore) {
        createSetupStore(id, setup, options, pinia)
      } else {
        createOptionsStore(id, options as any, pinia)
      }
    }

    // 获取 store
    const store: StoreGeneric = pinia._s.get(id)

    // 如果是 hot 模式，则删除并重新创建
    if (hot) {
      const hotId = '__hot' + id
      const newStore = isSetupStore
        ? createSetupStore(hotId, setup, options, pinia)
        : createOptionsStore(hotId, assign({}, options) as any, pinia, true);
      (hot as any)._hotUpdate(newStore)

      delete pinia.state.value[hotId]
      pinia._s.delete(hotId)
    }

    // 如果是 客户端 环境，从缓存中获取 store 实例
    if (IS_CLIENT) {
      const currentInstance = getCurrentInstance()
      if (
        currentInstance &&
        currentInstance.proxy &&
        !hot
      ) {
        const vm: any = currentInstance.proxy
        const cache = '_pStores' in vm ? vm._pStores : (vm._pStores = {})
        cache[id] = store
      }
    }
    // console.log(store, 'store')
    return store
  }
  useStore.$id = id
  return useStore
}

// 对于 pinia 而言有三种修改状态的方式：
//  1.store.xxx = yyy
//  2.store.action()
//  3.store.$patch()
```

##### rootStore.ts
```typescript
import { App, EffectScope, Ref } from 'vue'
import { PiniaCustomProperties, PiniaCustomStateProperties, StateTree } from './types'

export interface Pinia {
  install: (app: App) => void
  state: Ref<Record<string, StateTree>>
  use(plugin: PiniaPlugin): Pinia
  _p: PiniaPlugin[]
  _a: App
  _e: EffectScope
  _s: Map<string, any>
  _testing?: boolean
}

export interface PiniaPluginContext {
  store: any
  app: App
  pinia: Pinia
  options: Record<string, any>
}

export interface PiniaPlugin {
  (ctx: PiniaPluginContext): Partial<PiniaCustomProperties & PiniaCustomStateProperties> | void
}

interface _SetActivePinia {
  (pinia: Pinia): Pinia
  (pinia: undefined): undefined
  (pinia: Pinia | undefined): Pinia | undefined
}

export const piniaSymbol = Symbol('pinia')
export let activePinia: Pinia | undefined
export const setActivePinia: _SetActivePinia = (pinia) => (activePinia = pinia)
```

##### types.ts
```typescript
import { Ref, UnwrapRef, WatchOptions } from "vue"
import { Pinia } from "./rootStore"

export type _Method = (...args: any[]) => any

export type StateTree = Record<PropertyKey, any>

export type Store<
  Id extends string,
  S extends StateTree,
  G = {},
  A = {}
> = Record<`$${Id}`, S> & G & A

export interface DefineStoreOptionsBase<S extends StateTree, Store> {}

export interface DefineStoreOptions<
  Id extends string,
  S extends StateTree,
  G,
  A
> extends DefineStoreOptionsBase<S, Store<Id, S, G, A>> {
  id: Id
  state?: () => S
  getters?: G
  actions?: A
}

export interface PiniaCustomProperties<
  Id extends string = string,
  S extends StateTree = StateTree,
  G = {},
  A = {}
> {}

export interface PiniaCustomStateProperties<S extends StateTree = StateTree> {}

export type StoreGeneric = Store<
  string,
  StateTree,
  {},
  {}
>

export interface StoreDefinition<
  Id extends string = string,
  S extends StateTree = StateTree,
  G = {},
  A = {}
> {
  $id: Id
  (pinia?: Pinia | null | undefined, hot?: StoreGeneric): Store<Id, S, G, A>
  _pinia?: Pinia
}

export interface DefineSetupStoreOptions<
  Id extends string = string,
  S extends StateTree = StateTree,
  G = {},
  A = {}
> extends DefineStoreOptionsBase<S, Store<Id, S, G, A>> {
  actions?: A
}

export type _ActionsTree = Record<string, _Method>
export type _DeepPartial<T> = { [K in keyof T]?: _DeepPartial<T[K]> }

export interface StoreProperties<Id extends string> {
  $id: Id,
  _p: Pinia,
  _getters?: string[]
  _isOptionsAPI?: boolean
  _customProperties: Set<string>
  _hotUpdate(useStore: StoreGeneric): void
  _hotUpdating: boolean
  _hmrPayload: {
    state: string[]
    hotState: Ref<StateTree>
    actions: _ActionsTree
    getters: _ActionsTree
  }
}

export interface _StoreWithState<
  Id extends string,
  S extends StateTree,
  G /* extends GettersTree<StateTree> */,
  A /* extends ActionsTree */,
> extends StoreProperties<Id> {
  $state: UnwrapRef<S> & PiniaCustomStateProperties<S>
  $patch(partialState: _DeepPartial<UnwrapRef<S>>): void
  $patch<F extends (state: UnwrapRef<S>) => any>(
    // this prevents the user from using `async` which isn't allowed
    stateMutator: ReturnType<F> extends Promise<any> ? never : F
  ): void
  $reset(): void
  $subscribe( 
    callback: any,
    options?: { detached?: boolean } & WatchOptions
  ): () => void
  $onAction(
    callback: any,
    detached?: boolean
  ): () => void
  $dispose(): void
}

export enum MutationType {
  direct = 'direct',
  patchObject = 'patch object',
  patchFunction = 'patch function'
}

export function isPlainObject<S extends StateTree>(
  value: S | unknown
): value is S
export function isPlainObject(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  o: any
): o is StateTree {
  return (
    o &&
    typeof o === 'object' &&
    Object.prototype.toString.call(o) === '[object Object]' &&
    typeof o.toJSON !== 'function'
  )
}
```

##### storeToRefs.ts
```typescript
import { isReactive, isRef, toRaw, toRef } from "vue";
import { StoreGeneric } from "./types";

export type StoreToRefs<SS extends StoreGeneric> =
  SS extends unknown ? {} : never

export function storeToRefs <SS extends StoreGeneric>(store: SS):StoreToRefs<SS> {
  const rawStore = toRaw(store)
  const refs = {} as any
  // TODO 这里直接遍历 store，会走依赖收集，浪费性能，所有需要使用 toRaw 把原始 store 取出来
  for (const key in rawStore) {
    const value = rawStore[key]
    if (isRef(value) || isReactive(value)) {
      refs[key] = toRef(store, key)
    }
  }
  return refs
}
```

##### subscriptions.ts
```typescript
import { _Method } from "./types";

export const noop = () => {}

export function assSubscriptions<T extends _Method>(
  subscriptions: Set<T>,
  callback: T,
  detached?: boolean,
  onCleanup: () => void = noop
) {
  subscriptions.add(callback)

  const removeSubscription = () => {
    const isDel = subscriptions.delete(callback)
    if (isDel) {
      onCleanup()
    }
  }
  return removeSubscription
}

export function triggerSubscriptions<T extends _Method>(
  subscriptions: Set<T>,
  ...args: Parameters<T>
) {
  subscriptions.forEach((callback) => {
    callback(...args)
  })
}
```

##### env.ts
```typescript
export const IS_CLIENT = typeof window !== 'undefined'
```

### testing
#### package.json
```json
{
  "name": "@g-pinia/testing",
  "version": "1.0.0",
  "module": "dist/g-pinia-testing.esm.js",
  "unpkg": "dist/g-pinia-testing.global.js",
  "buildOptions": {
    "name": "GPiniaTesting",
    "formats": [
      "esm-bundler",
      "esm-browser",
      "esm",
      "global",
      "cjs"
    ]
  },
  "scripts": {},
  "keywords": [
    "vue-next",
    "vue",
    "vue3",
    "pinia"
  ],
  "author": "Robin",
  "license": "ISC",
  "packageManager": "pnpm@10.13.1",
  "dependencies": {
    "g-pinia": "workspace:^"
  }
}

```

#### src
##### index.ts
```typescript
import { App, createApp, getCurrentInstance, h, inject, onMounted, toRefs, watchEffect } from 'vue'
// import { createPinia, storeToRefs} from 'pinia'
import { createPinia, storeToRefs } from 'g-pinia'
import { piniaSymbol } from 'packages/pinia/src/rootStore'
import { useTodoStore } from './todo'
import { useCounterStore } from './counter'



const App = {
  setup() {
    // console.log('inject', inject(piniaSymbol))
    // options Api
    const counter = useCounterStore()

    // setup Api
    const todos = useTodoStore()
    const { add } = todos as any

    // (todos as any).$dispose()

    return {
      msg: 'hello pinia',
      counter,
      ...storeToRefs(todos),
      add
    }
  },
  // vue2 中使用
  // mounted(){
  //   console.log('mounted:', this.$pinia)
  // },
  render(proxy, { emit }) {
    // console.log('render:', proxy)
    return h('div', [
      h('h1', this.msg),
      h('h3', '=============== COUNTER ==============='),
      h('p', `count is: ${proxy?.counter?.count}`),
      h('p', `double is: ${proxy?.counter?.double}`),
      h('button', {
        onClick: () => proxy?.counter?.increment?.()
      }, 'Click me!'),
      h('button',{
        onClick: () => proxy?.counter?.$reset()
      }, '$reset' ),
      h('button', {
        onClick: () => proxy?.counter?.$patch({
          count: 10
        })
      }, '$patch'),
      h('h3', '=============== TODOS ==============='),
      h('ol', proxy?.todos?.map(v => {
        return h('li', { key: v }, v)
      })),
      h('p', h('input', {
        value: proxy.todo,
        onInput: (ev: any) => {
          // console.log('ev',proxy, ev.target.value)
          proxy.todo = ev.target.value
        }
      })),
      h('button', {
        onClick: () => proxy?.add?.()
      }, 'Add me!')
    ])
  }
}

const app = createApp(App)
const pinia = createPinia()

const PiniaPlugin = (context) => {
  let { store: { $subscribe, $id, $state }} = context
  const stateStr = localStorage.getItem($id)
  try {
    const state = JSON.parse(stateStr)
    $state = Object.assign($state, state)
  } catch (error) {
    $state = Object.assign($state, {})
  }
  $subscribe((mutation, state) => {
    const { storeId } = mutation
    localStorage.setItem(storeId, JSON.stringify(state))
  })
}


pinia.use(PiniaPlugin)

app.use(pinia)
app.mount('#app')
console.log('pinia', pinia)
export {
  app,
  pinia
}
```

##### counter.ts
```typescript
// import { defineStore} from 'pinia'
import { defineStore } from 'g-pinia'

const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    double: (state) => state.count * 2
  },
  actions: {
    increment() {
      this.count++
    }
  }
})

export { useCounterStore }
```

##### todo.ts
```typescript
// import { defineStore} from 'pinia'
import { defineStore } from 'g-pinia'
import { ref } from 'vue'

const useTodoStore = defineStore('todo', () => {
  const todos = ref(['vue', 'react'])
  const todo = ref('')
  function add () {
    todos.value.push(todo.value)
  }
  return { todos, add, todo }
})

export { useTodoStore }
```

# 示例代码
## index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>pinia</title>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { app, pinia } from '../packages/testing/dist/testing.esm.js'
  </script>
</body>
</html>
```

# 测试代码
```shell
pnpm preview
```



