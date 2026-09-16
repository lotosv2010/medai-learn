[useUrlState - ahooks 3.0](https://ahooks.js.org/)

# useRequest
+ useRequest是一个强大的异步数据管理的Hooks，React项目中的网络请求场景使用useRequest 就够了
+ useRequest 通过插件式组织代码，核心代码极其简单，并且可以很方便的扩展出更高级的功能。目前已有能力包括
    - 自动请求/手动请求
    - 轮询
    - 防抖
    - 节流
    - 屏幕聚焦重新请求
    - 错误重试
    - loading delay
    - SWR(stale-while-revalidate)重新请求的同时使用过期数据
    - 缓存

## API
```javascript
const {
  loading,
  data,
  error,
  params,
  run,
  runAsync,
  refresh,
  refreshAsync,
  mutate,
  cancel
} = useRequest(service, {
  manual,
  defaultParams,
  onBefore,
  onSuccess,
  onError,
  onFinally
})
```

## 结果
| 参数 | 说明 |
| --- | --- |
| data | service 返回的数据 |
| error | service 抛出的异常 |
| loading | service 是否正在执行 |
| params | 当次执行的 service 的参数数组 |
| run | 手动触发 service 执行 |
| runAsync | 与 run 用法一致，但返回的是 Promise，需要自行处理异常使 |
| refresh | 用上一次的 params，重新调用 run |
| refreshAsync | 使用上一次的 params，重新调用 runAsync |
| mutate | 直接修改 data |
| cancel | 取消当前正在进行的请求 |


## 选项
| 选项 | 说明 |
| --- | --- |
| manual | 默认 false。即在初始化时自动执行 service首次默认 |
| defaultParams | 执行时，传递给 service 的参数 |
| onBefore | service 执行前触发 |
| onSuccess | service resolve 时触发 |
| onError | service reject 时触发 |
| onFinally | service 执行完成时触发 |


## 安装
```shell
pnpm add ahooks
```

## 依赖Hooks
+ useRequest是一个强大的异步数据管理的 Hooks，React项目中的网络请求场景使用 useReguest 就够了
+ useUpdateEffect用法等同于 useEffect，但是会忽略首次执行，只在依赖更新时执行
+ useCreation是useMemo或useRef 的替代品
+ useLatest返回当前最新值的 Hook，可以避免闭包问题
+ useMemoizedFn是持久化,function 的 Hook，理论上，可以使用 useMemoizedFn 完全代替 useCallback
+ useMount是只在组件初始化时执行的 Hook
+ useUnmount是在组件卸载(unmount)时执行的 Hook。
+ useUpdate会返回一个函数，调用该函数会强制组件新渲染

## 使用
```jsx
import { useRequest } from 'ahooks';
import axios from 'axios';

function Demo1() {
  const url = 'https://jsonplaceholder.typicode.com/users' // + (Math.random() > 0.5 ? '' : '1');
  
  const {data, error, loading} = useRequest(() => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        axios.get(url).then(res => {
          console.log(res);
          resolve(res);
        }).catch(err => {
          reject(err);
        });
      }, 2000)
    });
  }, {
  
  });

  return (
    <>
      <h2>Demo1</h2>
      <div>
        {
          loading ? <div>loading...</div> :
            error ? <div>error</div> :
              data?.data.map((item) => {
                return <div key={item.id}>{item.name}</div>;
              })
        }
      </div>
    </>
  );
}

export default Demo1;
```

# 自动请求
+ 默认情况下 useRequest 第一个参数是一个异步函数，在组件初始化时，会自动执行该异步函数。同时自动管理该异步函数的 loading、data、error 等状态。

## ahooks
### index.js
```javascript
// ahooks 库的主入口文件
// 导出所有可用的 hooks 供外部使用
export { useRequest } from './useRequest'
```

### useRequest
#### index.js
```javascript
// useRequest hook 的入口文件
// 导出 useRequest 实现，用于处理异步请求的状态管理
export { default as useRequest } from './src/useRequest'
```

#### src
##### useRequest.js
```javascript
import useRequestImplement from './useRequestImplement';

/**
 * useRequest hook
 * 用于处理异步请求的 React Hook
 * 提供请求状态管理、错误处理等功能
 * @param {Function} service - 请求服务函数
 * @param {Object} options - 配置选项（当前未使用）
 * @param {Array} plugins - 插件数组（当前未使用）
 * @returns 请求状态和方法
 */
function useRequest(service, options, plugins) {
  return useRequestImplement(service)
}

export default useRequest
```

##### useRequestImplement.js
```javascript
import useLatest from '../../useLatest';
import useUpdate from '../../useUpdate';
import useCreation from '../../useCreation';
import useMount from '../../useMount';
import Fetch from './Fetch';

/**
 * useRequestImplement 函数
 * useRequest 的核心实现，负责创建和管理请求实例
 * @param {Function} service - 请求服务函数
 * @returns 请求状态对象
 */
function useRequestImplement(service) {
  const serviceRef = useLatest(service); // 保持 service 的最新引用
  const update = useUpdate(); // 触发组件更新的函数
  // 创建 Fetch 实例，使用 useCreation 确保实例稳定
  const fetchInstance = useCreation(() => new Fetch(serviceRef, update), []);

  // 组件挂载时自动执行请求
  useMount(() => {
    fetchInstance.run();
  });
  
  // 返回请求状态（data、loading、error 等）
  return {
    ...fetchInstance.state,
  }
}

export default useRequestImplement;
```

##### Fetch.js
```javascript
/**
 * Fetch 类
 * 负责管理异步请求的状态和执行
 * 包含请求的数据、加载状态、错误信息等
 */
class Fetch {
  constructor(service, subscribe) {
    this.service = service; // 请求服务函数
    this.subscribe = subscribe; // 触发组件重新渲染的回调函数
    this.state = { data: null, loading: false }; // 初始状态
  }

  /**
   * 更新状态并触发组件重新渲染
   * @param {Object} state - 要更新的状态对象
   */
  setState(state = {}) {
    this.state = { ...this.state, ...state };
    this.subscribe(); // 通知组件更新
  }

  /**
   * 同步执行请求（不等待结果）
   */
  run() {
    this.runAsync()
  }

  /**
   * 异步执行请求
   * 处理请求的加载状态、数据和错误
   */
  async runAsync() {
    try {
      this.setState({ loading: true });
      const data = await this.service.current();
      this.setState({ data, loading: false });
    } catch (error) {
      this.setState({ error, loading: false });
    }
  }
}

export default Fetch;
```

### useLatest
#### index.js
```javascript
import { useRef } from 'react';

/**
 * useLatest hook
 * 用于获取最新值的引用，避免闭包陷阱
 * 在异步操作或事件处理中获取最新状态时特别有用
 * @param {*} value - 需要保持最新的值
 * @returns {Object} 包含最新值的 ref 对象
 */
function useLatest(value) {
  const ref = useRef(value);

  // 每次渲染时更新 ref 的 current 值
  ref.current = value;

  return ref;
}

export default useLatest;
```

### useUpdate
#### index.js
```javascript
import { useCallback, useState } from "react";

/**
 * useUpdate hook
 * 用于强制组件重新渲染
 * 返回一个函数，调用该函数会触发组件更新
 * 常用于需要手动触发重新渲染的场景
 * @returns {Function} 触发组件更新的函数
 */
function useUpdate() {
  const [, setState] = useState({});
  // 返回一个稳定的回调函数，每次调用都会更新状态从而触发组件重新渲染
  return useCallback(() => setState({}), []);
}

export default useUpdate;
```

### useCreation
#### index.js
```javascript
import { useRef } from "react";
import depsAreSame from "../utils/depsAreSame";

/**
 * useCreation hook
 * 用于创建一个缓存的值，仅在依赖项发生变化时重新创建
 * 类似于 useMemo，但可以确保引用稳定性
 * @param {Function} factory - 创建值的函数
 * @param {Array} deps - 依赖数组
 * @returns 缓存的值
 */
function useCreation(factory, deps) {
  const { current } = useRef({
    deps, // 依赖数组
    obj: null, // 缓存的对象
    initialized: false, // 是否已初始化标志
  })

  // 如果没有初始化或者依赖发生变化，则重新创建对象
  if (!current.initialized || !depsAreSame(current.deps, deps)) {
    current.deps = deps;
    current.obj = factory();
    current.initialized = true;
  }
  return current.obj;
}

export default useCreation;
```

### useMount
#### index.js
```javascript
import { useEffect } from "react";

/**
 * useMount hook
 * 用于在组件挂载时执行一次回调函数
 * 类似于 useEffect(fn, []) 的简化版本，专门用于组件挂载时的初始化操作
 * @param {Function} fn - 组件挂载时执行的回调函数
 */
function useMount(fn) {
  useEffect(() => {
    // 使用可选链操作符确保 fn 存在时才调用
    fn?.();
  }, []); // 空依赖数组确保只在挂载时执行一次
}

export default useMount;
```

### utils
#### depsAreSame.js
```javascript
/**
 * depsAreSame 函数
 * 用于深度比较两个依赖数组是否相同
 * 使用 Object.is 进行值比较，确保正确处理 NaN 和 0/-0 等特殊情况
 * @param {Array} oldDeps - 旧的依赖数组
 * @param {Array} newDeps - 新的依赖数组
 * @returns {boolean} 两个依赖数组是否相同
 */
function depsAreSame(oldDeps, newDeps) {
  // 如果两个数组的引用地址一样，则认为是相同的
  if (oldDeps === newDeps) return true;
  // 如果两个数组的长度不一样，则认为是不同的
  if (oldDeps.length !== newDeps.length) return false;
  for (let i = 0; i < oldDeps.length; i++) {
    // 如果两个数组的元素不相等，则认为是不同的
    if (!Object.is(oldDeps[i], newDeps[i])) return false;
  }
  return true;
}

export default depsAreSame;
```

# 错误处理
## ahooks
### useRequest
#### src
##### Fetch.js
```diff
/**
 * Fetch 类
 * 负责管理异步请求的状态和执行
 * 包含请求的数据、加载状态、错误信息等
 */
class Fetch {
  constructor(service, subscribe) {
    this.service = service; // 请求服务函数
    this.subscribe = subscribe; // 触发组件重新渲染的回调函数
-    this.state = { data: null, loading: false }; // 初始状态
+    this.state = { data: null, loading: false, error: null }; // 初始状态
  }

  /**
   * 更新状态并触发组件重新渲染
   * @param {Object} state - 要更新的状态对象
   */
  setState(state = {}) {
    this.state = { ...this.state, ...state };
    this.subscribe(); // 通知组件更新
  }

  /**
   * 同步执行请求（不等待结果）
   */
  run() {
    this.runAsync()
  }

  /**
   * 异步执行请求
   * 处理请求的加载状态、数据和错误
   */
  async runAsync() {
    try {
      this.setState({ loading: true });
      const data = await this.service.current();
-      this.setState({ data, loading: false });
+      this.setState({ data, loading: false, error: null });
    } catch (error) {
+      this.setState({ error, loading: false, data: null });
    }
  }
}

export default Fetch;
```

# 手动触发
+ <font style="color:rgb(69, 77, 100);">如果设置了 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">options.manual = true</font>`<font style="color:rgb(69, 77, 100);">，则 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">useRequest</font>`<font style="color:rgb(69, 77, 100);"> 不会默认执行，需要通过 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">run</font>`<font style="color:rgb(69, 77, 100);"> 或者 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">runAsync</font>`<font style="color:rgb(69, 77, 100);"> 来触发执行。</font>
+ `<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">run</font>`<font style="color:rgb(69, 77, 100);"> </font><font style="color:rgb(69, 77, 100);">与</font><font style="color:rgb(69, 77, 100);"> </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">runAsync</font>`<font style="color:rgb(69, 77, 100);"> </font><font style="color:rgb(69, 77, 100);">的区别在于：</font>
    - `<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">run</font>`<font style="color:rgb(69, 77, 100);"> </font><font style="color:rgb(69, 77, 100);">是一个普通的同步函数，我们会自动捕获异常，你可以通过</font><font style="color:rgb(69, 77, 100);"> </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">options.onError</font>`<font style="color:rgb(69, 77, 100);"> </font><font style="color:rgb(69, 77, 100);">来处理异常时的行为。</font>
    - `<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">runAsync</font>`<font style="color:rgb(69, 77, 100);"> 是一个返回 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">Promise</font>`<font style="color:rgb(69, 77, 100);"> 的异步函数，如果使用 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">runAsync</font>`<font style="color:rgb(69, 77, 100);"> 来调用，则意味着你需要自己捕获异常。</font>

```jsx
import { useRequest } from '../../ahooks';
import axios from 'axios';

function Demo1() {
  const url = 'https://jsonplaceholder.typicode.com/users' + (Math.random() > 0.5 ? '' : '1');
  
  const {data, error, loading, run, runAsync} = useRequest(() => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        axios.get(url).then(res => {
          console.log(res);
          resolve(res);
        }).catch(err => {
          reject(err);
        });
      }, 2000)
    });
  }, {
    manual: true, // 是否手动执行
    onError: (err) => {
      console.log('onError', err);
    }
  });

  const fetchRunAsync = () => {
    runAsync().catch(err => {
      console.log('fetchRunAsync', err);
    })
  }

  return (
    <>
      <h2>Demo2</h2>
      <button onClick={() => { run() }}>{loading ? 'loading...' : 'run'}</button>
      <button onClick={fetchRunAsync }>{loading ? 'loading...' : 'runAsync'}</button>
      <div>
        {
          loading ? <div>loading...</div> :
            error ? <div>error</div> :
              data?.data.map((item) => {
                return <div key={item.id}>{item.name}</div>;
              })
        }
      </div>
    </>
  );
}

export default Demo1;
```

## ahooks
### useRequest
#### src
##### useRequest.js
```diff
import useRequestImplement from './useRequestImplement';

/**
 * useRequest hook
 * 用于处理异步请求的 React Hook
 * 提供请求状态管理、错误处理等功能
 * @param {Function} service - 请求服务函数
 * @param {Object} options - 配置选项（当前未使用）
 * @param {Array} plugins - 插件数组（当前未使用）
 * @returns 请求状态和方法
 */
function useRequest(service, options, plugins = []) {
-  return useRequestImplement(service)
+  return useRequestImplement(service, options, plugins)
}

export default useRequest
```

##### useRequestImplement.js
```diff
import useLatest from '../../useLatest';
import useUpdate from '../../useUpdate';
import useCreation from '../../useCreation';
import useMount from '../../useMount';
+import useMemoizedFn from '../../useMemoizedFn';
import Fetch from './Fetch';

/**
 * useRequestImplement 函数
 * useRequest 的核心实现，负责创建和管理请求实例
 * @param {Function} service - 请求服务函数
 * @returns 请求状态对象
 */
+function useRequestImplement(service, options) {
+  const { manual, ...rest } = options; // 解构 options 中的参数
+  const fetchOptions = { manual, ...rest }; // 创建 fetchOptions 对象
  const serviceRef = useLatest(service); // 保持 service 的最新引用
  const update = useUpdate(); // 触发组件更新的函数
  // 创建 Fetch 实例，使用 useCreation 确保实例稳定
+  const fetchInstance = useCreation(() => new Fetch(serviceRef, fetchOptions, update), []);

  // 组件挂载时自动执行请求
  useMount(() => {
+    if (!manual) {
      fetchInstance.run();
+    }
  });
  
  // 返回请求状态（data、loading、error 等）
+  const { state } = fetchInstance
  return {
+    ...state,
+    run: useMemoizedFn(() => fetchInstance.run()),
+    runAsync: useMemoizedFn(() => fetchInstance.runAsync()),
  }
}

export default useRequestImplement;
```

##### Fetch.js
```diff
/**
 * Fetch 类
 * 负责管理异步请求的状态和执行
 * 包含请求的数据、加载状态、错误信息等
 */
class Fetch {
+  constructor(service, options, subscribe) {
    this.service = service; // 请求服务函数
+    this.options = options; // 请求配置项
    this.subscribe = subscribe; // 触发组件重新渲染的回调函数
    this.state = { data: null, loading: false, error: null }; // 初始状态
  }

  /**
   * 更新状态并触发组件重新渲染
   * @param {Object} state - 要更新的状态对象
   */
  setState(state = {}) {
    this.state = { ...this.state, ...state };
    this.subscribe(); // 通知组件更新
  }

  /**
   * 同步执行请求（不等待结果）
   */
  run() {
-    this.runAsync();
+    this.runAsync().catch(error => {
+      if(this.options.onError) {
+        this.options.onError(error); // 处理错误
+      }
+    })
  }

  /**
   * 异步执行请求
   * 处理请求的加载状态、数据和错误
   */
  async runAsync() {
    try {
      this.setState({ loading: true });
      const data = await this.service.current();
      this.setState({ data, loading: false, error: null });
    } catch (error) {
      this.setState({ error, loading: false, data: null });
+      throw error; // 抛出错误，以便上层处理
    }
  }
}

export default Fetch;
```

### useMemoizedFn
#### index.js
```javascript
import { useMemo, useRef } from "react";

/**
 * 缓存函数
 * @param {Function} fn
 * @returns {Function}
 */
function useMemoizedFn(fn) {
  const fnRef = useRef(fn); // 将 fn 缓存在 ref 中
  fnRef.current = useMemo(() => fn, [fn]); // 缓存 fn
  const memoizedFn = useRef(); // 缓存 memoizedFn

  // 如果 memoizedFn 不存在，则创建一个新的函数，并将 fn 的 this 和参数传递给 fnRef.current
  if (!memoizedFn.current) {
    memoizedFn.current = function (...args) {
      return fnRef.current.apply(this, args);
    };
  }
  // 返回 memoizedFn.current
  return memoizedFn.current;
}

export default useMemoizedFn;
```

# 传递参数
```jsx
import { useRequest } from '../../ahooks';
import axios from 'axios';

function Demo1() {
  const url = 'https://jsonplaceholder.typicode.com/users' //  + (Math.random() > 0.5 ? '' : '1');
  const DEFAULT_PARAMS = {name: 'Leanne Graham', id: 1}

  const getUsers = (params) => {
    // console.log('getUsers', params);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        axios.get(url, { params }).then(res => {
          console.log(res);
          resolve(res.data)
        }).catch(err => {
          reject(err)
        })
      }, 1000)
    })
  }
  
  const {
    data,
    error,
    loading,
    run,
    runAsync,
    // params
  } = useRequest(getUsers, {
    manual: false, // 是否手动执行
    defaultParams: [DEFAULT_PARAMS],
    onError: (err) => {
      console.log('onError', err);
    }
  });

  const fetchRun = () => {
    run(DEFAULT_PARAMS)
  }

  const fetchRunAsync = () => {
    runAsync(DEFAULT_PARAMS).catch(err => {
      console.log('fetchRunAsync', err);
    })
  }

  return (
    <>
      <h2>Demo2</h2>
      <button onClick={fetchRun}>{loading ? 'loading...' : 'run'}</button>
      <button onClick={fetchRunAsync }>{loading ? 'loading...' : 'runAsync'}</button>
      <div>
        {
          loading ? <div>loading...</div> :
            error ? <div>error</div> :
              data?.map((item) => {
                return <div key={item.id}>{item.name}</div>;
              })
        }
      </div>
    </>
  );
}

export default Demo1;
```

## ahooks
### useRequest
#### src
##### useRequestImplement.js
```diff
import useLatest from '../../useLatest';
import useUpdate from '../../useUpdate';
import useCreation from '../../useCreation';
import useMount from '../../useMount';
import useMemoizedFn from '../../useMemoizedFn';
import Fetch from './Fetch';

/**
 * useRequestImplement 函数
 * useRequest 的核心实现，负责创建和管理请求实例
 * @param {Function} service - 请求服务函数
 * @returns 请求状态对象
 */
function useRequestImplement(service, options) {
  const { manual, ...rest } = options; // 解构 options 中的参数
  const fetchOptions = { manual, ...rest }; // 创建 fetchOptions 对象
  const serviceRef = useLatest(service); // 保持 service 的最新引用
  const update = useUpdate(); // 触发组件更新的函数
  // 创建 Fetch 实例，使用 useCreation 确保实例稳定
  const fetchInstance = useCreation(() => new Fetch(serviceRef, fetchOptions, update), []);

  // 组件挂载时自动执行请求
  useMount(() => {
    if (!manual) {
-      fetchInstance.run();
+      const params = fetchInstance.state.params || options.defaultParams || []; // 获取默认参数
+      fetchInstance.run(...params);
    }
  });
  
  // 返回请求状态（data、loading、error 等）
  const { state } = fetchInstance
  return {
    ...state,
-    run: useMemoizedFn(() => fetchInstance.run()),
-    runAsync: useMemoizedFn(() => fetchInstance.runAsync()),
+    run: useMemoizedFn((...args) => fetchInstance.run(...args)),
+    runAsync: useMemoizedFn((...args) => fetchInstance.runAsync(...args)),
  }
}

export default useRequestImplement;
```

##### Fetch.js
```diff
/**
 * Fetch 类
 * 负责管理异步请求的状态和执行
 * 包含请求的数据、加载状态、错误信息等
 */
class Fetch {
  constructor(service, options, subscribe) {
    this.service = service; // 请求服务函数
    this.options = options; // 请求配置项
    this.subscribe = subscribe; // 触发组件重新渲染的回调函数
    this.state = { data: null, loading: false, error: null }; // 初始状态
  }

  /**
   * 更新状态并触发组件重新渲染
   * @param {Object} state - 要更新的状态对象
   */
  setState(state = {}) {
    this.state = { ...this.state, ...state };
    this.subscribe(); // 通知组件更新
  }

  /**
   * 同步执行请求（不等待结果）
   */
+  run(...params) {
+    this.runAsync(...params).catch(error => {
      if(this.options.onError) {
        this.options.onError(error); // 处理错误
      }
    })
  }

  /**
   * 异步执行请求
   * 处理请求的加载状态、数据和错误
   */
+  async runAsync(...params) {
    try {
      this.setState({ loading: true });
+      const data = await this.service.current(...params);
+      this.setState({ data, loading: false, error: null, params });
    } catch (error) {
+      this.setState({ error, loading: false, data: null, params });
      throw error; // 抛出错误，以便上层处理
    }
  }
}

export default Fetch;
```

# 生命周期
+ `<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">useRequest</font>`<font style="color:rgb(69, 77, 100);"> 提供了以下几个生命周期配置项，供你在异步函数的不同阶段做一些处理。</font>
    - `<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">onBefore</font>`<font style="color:rgb(69, 77, 100);">：请求之前触发</font>
    - `<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">onSuccess</font>`<font style="color:rgb(69, 77, 100);">：请求成功触发</font>
    - `<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">onError</font>`<font style="color:rgb(69, 77, 100);">：请求失败触发</font>
    - `<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">onFinally</font>`<font style="color:rgb(69, 77, 100);">：请求完成触发</font>

```jsx
import { useRequest } from '../../ahooks';
// import { useRequest } from 'ahooks';
import axios from 'axios';

function Demo1() {
  const url = 'https://jsonplaceholder.typicode.com/users' + (Math.random() > 0.5 ? '' : '1');
  const DEFAULT_PARAMS = {name: 'Leanne Graham', id: 1}

  const getUsers = (params) => {
    // console.log('getUsers', params);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        axios.get(url, { params }).then(res => {
          console.log(res);
          resolve(res.data)
        }).catch(err => {
          reject(err)
        })
      }, 1000)
    })
  }
  
  const {
    data,
    error,
    loading,
    run,
    runAsync,
    // params
  } = useRequest(getUsers, {
    manual: false, // 是否手动执行
    defaultParams: [DEFAULT_PARAMS],
    onBefore: (params) => {
      console.log('onBefore', params);
    },
    onSuccess: (result, params) => {
      console.log('onSuccess', result, params);
    },
    onError: (err) => {
      console.log('onError', err);
    },
    onFinally: (params, result, error) => {
      console.log('onFinally', params, result, error);
    },
  });

  const fetchRun = () => {
    run(DEFAULT_PARAMS)
  }

  const fetchRunAsync = () => {
    runAsync(DEFAULT_PARAMS).catch(err => {
      console.log('fetchRunAsync', err);
    })
  }

  return (
    <>
      <h2>Demo2</h2>
      <button onClick={fetchRun}>{loading ? 'loading...' : 'run'}</button>
      <button onClick={fetchRunAsync }>{loading ? 'loading...' : 'runAsync'}</button>
      <div>
        {
          loading ? <div>loading...</div> :
            error ? <div>error</div> :
              data?.map((item) => {
                return <div key={item.id}>{item.name}</div>;
              })
        }
      </div>
    </>
  );
}

export default Demo1;
```

## ahooks
### useRequest
#### src
##### Fetch.js
```diff
/**
 * Fetch 类
 * 负责管理异步请求的状态和执行
 * 包含请求的数据、加载状态、错误信息等
 */
class Fetch {
  constructor(service, options, subscribe) {
    this.service = service; // 请求服务函数
    this.options = options; // 请求配置项
    this.subscribe = subscribe; // 触发组件重新渲染的回调函数
    this.state = { data: null, loading: false, error: null }; // 初始状态
  }

  /**
   * 更新状态并触发组件重新渲染
   * @param {Object} state - 要更新的状态对象
   */
  setState(state = {}) {
    this.state = { ...this.state, ...state };
    this.subscribe(); // 通知组件更新
  }

  /**
   * 同步执行请求（不等待结果）
   */
  run(...params) {
    this.runAsync(...params).catch(error => {
-      if(this.options.onError) {
-        this.options.onError(error); // 处理错误
+      if(!this.options.onError) {
+        console.error(error);
      }
    })
  }

  /**
   * 异步执行请求
   * 处理请求的加载状态、数据和错误
   */
  async runAsync(...params) {
    try {
+      this.options?.onBefore?.(params); // 处理请求开始前的操作
      this.setState({ loading: true });
      const data = await this.service.current(...params);
      this.setState({ data, loading: false, error: null, params });
+      this.options?.onSuccess?.(data, params); // 处理请求成功后的操作
+      this.options?.onFinally?.(params, data); // 处理请求结束的回调
    } catch (error) {
      this.setState({ error, loading: false, data: null, params });
+      this.options?.onError?.(error); // 处理错误
+      this.options?.onFinally?.(params, null, error); // 处理请求结束的回调
      throw error; // 抛出错误，以便上层处理
    }
  }
}

export default Fetch;
```

# 刷新
+ 重复上一次请求
+ `<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">useRequest</font>`<font style="color:rgb(69, 77, 100);"> 提供了 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">refresh</font>`<font style="color:rgb(69, 77, 100);"> 和 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">refreshAsync</font>`<font style="color:rgb(69, 77, 100);"> 方法，使我们可以使用上一次的参数，重新发起请求。</font>

```jsx
import { useRequest } from '../../ahooks';
// import { useRequest } from 'ahooks';
import axios from 'axios';

function Demo1() {
  const url = 'https://jsonplaceholder.typicode.com/users' + (Math.random() > 0.5 ? '' : '1');
  // id 为 1 - 10 的随机数
  const DEFAULT_PARAMS = {id: Math.floor(Math.random() * 10 + 1)}

  const getUsers = (params) => {
    // console.log('getUsers', params);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        axios.get(url, { params }).then(res => {
          console.log(res);
          resolve(res.data)
        }).catch(err => {
          reject(err)
        })
      }, 1000)
    })
  }
  
  const {
    data,
    error,
    loading,
    run,
    runAsync,
    refresh,
    refreshAsync,
    // params
  } = useRequest(getUsers, {
    manual: false, // 是否手动执行
    defaultParams: [DEFAULT_PARAMS],
    onBefore: (params) => {
      console.log('onBefore', params);
    },
    onSuccess: (result, params) => {
      console.log('onSuccess', result, params);
    },
    onError: (err) => {
      console.log('onError', err);
    },
    onFinally: (params, result, error) => {
      console.log('onFinally', params, result, error);
    },
  });

  const fetchRun = () => {
    run(DEFAULT_PARAMS)
  }

  const fetchRunAsync = () => {
    runAsync(DEFAULT_PARAMS).catch(err => {
      console.log('fetchRunAsync', err);
    })
  }


  return (
    <>
      <h2>Demo2</h2>
      <div style={{display: 'flex', gap: 10}}>
        <button onClick={fetchRun}>run</button>
        <button onClick={fetchRunAsync }>runAsync</button>
        <button onClick={refresh} type="button">Refresh</button>
        <button onClick={refreshAsync} type="button">RefreshAsync</button>
      </div>
      <div>
        {
          loading ? <div>loading...</div> :
            error ? <div>error</div> :
              data?.map((item) => {
                return <div key={item.id}>{item.name}</div>;
              })
        }
      </div>
    </>
  );
}

export default Demo1;
```

## ahooks
### useRequest
#### src
##### useRequestImplement.js
```diff
import useLatest from '../../useLatest';
import useUpdate from '../../useUpdate';
import useCreation from '../../useCreation';
import useMount from '../../useMount';
import useMemoizedFn from '../../useMemoizedFn';
import Fetch from './Fetch';

/**
 * useRequestImplement 函数
 * useRequest 的核心实现，负责创建和管理请求实例
 * @param {Function} service - 请求服务函数
 * @returns 请求状态对象
 */
function useRequestImplement(service, options) {
  const { manual, ...rest } = options; // 解构 options 中的参数
  const fetchOptions = { manual, ...rest }; // 创建 fetchOptions 对象
  const serviceRef = useLatest(service); // 保持 service 的最新引用
  const update = useUpdate(); // 触发组件更新的函数
  // 创建 Fetch 实例，使用 useCreation 确保实例稳定
  const fetchInstance = useCreation(() => new Fetch(serviceRef, fetchOptions, update), []);

  // 组件挂载时自动执行请求
  useMount(() => {
    if (!manual) {
      const params = fetchInstance.state.params || options.defaultParams || []; // 获取默认参数
      fetchInstance.run(...params);
    }
  });
  
  // 返回请求状态（data、loading、error 等）
  const { state } = fetchInstance
  return {
    ...state,
    run: useMemoizedFn((...args) => fetchInstance.run(...args)),
    runAsync: useMemoizedFn((...args) => fetchInstance.runAsync(...args)),
+    refresh: useMemoizedFn(() => fetchInstance.refresh()),
+    refreshAsync: useMemoizedFn(() => fetchInstance.refreshAsync()),
  }
}

export default useRequestImplement;
```

##### Fetch.js
```diff
/**
 * Fetch 类
 * 负责管理异步请求的状态和执行
 * 包含请求的数据、加载状态、错误信息等
 */
class Fetch {
  constructor(service, options, subscribe) {
    this.service = service; // 请求服务函数
    this.options = options; // 请求配置项
    this.subscribe = subscribe; // 触发组件重新渲染的回调函数
    this.state = { data: null, loading: false, error: null }; // 初始状态
  }

  /**
   * 更新状态并触发组件重新渲染
   * @param {Object} state - 要更新的状态对象
   */
  setState(state = {}) {
    this.state = { ...this.state, ...state };
    this.subscribe(); // 通知组件更新
  }

  /**
   * 同步执行请求（不等待结果）
   */
  run(...params) {
    this.runAsync(...params).catch(error => {
      if(!this.options.onError) {
        console.error(error);
      }
    })
  }

  /**
   * 异步执行请求
   * 处理请求的加载状态、数据和错误
   */
  async runAsync(...params) {
    try {
      this.options?.onBefore?.(params); // 处理请求开始前的操作
      this.setState({ loading: true });
      const data = await this.service.current(...params);
      this.setState({ data, loading: false, error: null, params });
      this.options?.onSuccess?.(data, params); // 处理请求成功后的操作
      this.options?.onFinally?.(params, data); // 处理请求结束的回调
    } catch (error) {
      this.setState({ error, loading: false, data: null, params });
      this.options?.onError?.(error); // 处理错误
      this.options?.onFinally?.(params, null, error); // 处理请求结束的回调
      throw error; // 抛出错误，以便上层处理
    }
  }

+  refresh() {
+    this.run(...(this.state.params || []));
+  }

+  refreshAsync() {
+    this.runAsync(...(this.state.params || []));
+  }
}

export default Fetch;
```

# 立即变更数据
+ `<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">useRequest</font>`<font style="color:rgb(69, 77, 100);"> 提供了 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">mutate</font>`<font style="color:rgb(69, 77, 100);">, 支持立即修改 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">useRequest</font>`<font style="color:rgb(69, 77, 100);"> 返回的 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">data</font>`<font style="color:rgb(69, 77, 100);"> 参数。</font>
+ `<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">mutate</font>`<font style="color:rgb(69, 77, 100);"> 的用法与 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">React.setState</font>`<font style="color:rgb(69, 77, 100);"> 一致，支持 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">mutate(newData)</font>`<font style="color:rgb(69, 77, 100);"> 和 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">mutate((oldData) => newData)</font>`<font style="color:rgb(69, 77, 100);"> 两种写法。</font>
+ <font style="color:rgb(69, 77, 100);"></font>

```jsx
import { useRequest } from '../../ahooks';
// import { useRequest } from 'ahooks';
import axios from 'axios';

function Demo1() {
  const url = 'https://jsonplaceholder.typicode.com/users' // + (Math.random() > 0.5 ? '' : '1');
  // id 为 1 - 10 的随机数
  const DEFAULT_PARAMS = {id: Math.floor(Math.random() * 10 + 1)}

  const getUsers = (params) => {
    // console.log('getUsers', params);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        axios.get(url, { params }).then(res => {
          console.log(res);
          resolve(res.data)
        }).catch(err => {
          reject(err)
        })
      }, 1000)
    })
  }
  
  const {
    data,
    error,
    loading,
    run,
    runAsync,
    refresh,
    refreshAsync,
    mutate
    // params
  } = useRequest(getUsers, {
    manual: false, // 是否手动执行
    defaultParams: [DEFAULT_PARAMS],
    onBefore: (params) => {
      console.log('onBefore', params);
    },
    onSuccess: (result, params) => {
      console.log('onSuccess', result, params);
      const data = result?.map?.(item => ({...item, name: 'hahaha'}))
      setTimeout(() => {
        mutate(data)
      }, 1000);
      
    },
    onError: (err) => {
      console.log('onError', err);
    },
    onFinally: (params, result, error) => {
      console.log('onFinally', params, result, error);
    },
  });

  const fetchRun = () => {
    run(DEFAULT_PARAMS)
  }

  const fetchRunAsync = () => {
    runAsync(DEFAULT_PARAMS).catch(err => {
      console.log('fetchRunAsync', err);
    })
  }


  return (
    <>
      <h2>Demo2</h2>
      <div style={{display: 'flex', gap: 10}}>
        <button onClick={fetchRun}>run</button>
        <button onClick={fetchRunAsync }>runAsync</button>
        <button onClick={refresh} type="button">Refresh</button>
        <button onClick={refreshAsync} type="button">RefreshAsync</button>
      </div>
      <div>
        {
          loading ? <div>loading...</div> :
            error ? <div>error</div> :
              data?.map((item) => {
                return <div key={item.id}>{item.name}</div>;
              })
        }
      </div>
    </>
  );
}

export default Demo1;
```

## <font style="color:rgb(69, 77, 100);">ahooks</font>
### <font style="color:rgb(69, 77, 100);">useRequest</font>
#### <font style="color:rgb(69, 77, 100);">src</font>
##### <font style="color:rgb(69, 77, 100);">useRequestImplement.js</font>
```diff
import useLatest from '../../useLatest';
import useUpdate from '../../useUpdate';
import useCreation from '../../useCreation';
import useMount from '../../useMount';
import useMemoizedFn from '../../useMemoizedFn';
import Fetch from './Fetch';

/**
 * useRequestImplement 函数
 * useRequest 的核心实现，负责创建和管理请求实例
 * @param {Function} service - 请求服务函数
 * @returns 请求状态对象
 */
function useRequestImplement(service, options) {
  const { manual, ...rest } = options; // 解构 options 中的参数
  const fetchOptions = { manual, ...rest }; // 创建 fetchOptions 对象
  const serviceRef = useLatest(service); // 保持 service 的最新引用
  const update = useUpdate(); // 触发组件更新的函数
  // 创建 Fetch 实例，使用 useCreation 确保实例稳定
  const fetchInstance = useCreation(() => new Fetch(serviceRef, fetchOptions, update), []);

  // 组件挂载时自动执行请求
  useMount(() => {
    if (!manual) {
      const params = fetchInstance.state.params || options.defaultParams || []; // 获取默认参数
      fetchInstance.run(...params);
    }
  });
  
  // 返回请求状态（data、loading、error 等）
  const { state } = fetchInstance
  return {
    ...state,
    run: useMemoizedFn((...args) => fetchInstance.run(...args)),
    runAsync: useMemoizedFn((...args) => fetchInstance.runAsync(...args)),
    refresh: useMemoizedFn(() => fetchInstance.refresh()),
    refreshAsync: useMemoizedFn(() => fetchInstance.refreshAsync()),
+    mutate: useMemoizedFn((data) => fetchInstance.mutate(data)),
  }
}

export default useRequestImplement;
```

##### <font style="color:rgb(69, 77, 100);">Fetch.js</font>
```diff
/**
 * Fetch 类
 * 负责管理异步请求的状态和执行
 * 包含请求的数据、加载状态、错误信息等
 */
class Fetch {
  constructor(service, options, subscribe) {
    this.service = service; // 请求服务函数
    this.options = options; // 请求配置项
    this.subscribe = subscribe; // 触发组件重新渲染的回调函数
    this.state = { data: null, loading: false, error: null }; // 初始状态
  }

  /**
   * 更新状态并触发组件重新渲染
   * @param {Object} state - 要更新的状态对象
   */
  setState(state = {}) {
    this.state = { ...this.state, ...state };
    this.subscribe(); // 通知组件更新
  }

  /**
   * 同步执行请求（不等待结果）
   */
  run(...params) {
    this.runAsync(...params).catch(error => {
      if(!this.options.onError) {
        console.error(error);
      }
    })
  }

  /**
   * 异步执行请求
   * 处理请求的加载状态、数据和错误
   */
  async runAsync(...params) {
    try {
      this.options?.onBefore?.(params); // 处理请求开始前的操作
      this.setState({ loading: true });
      const data = await this.service.current(...params);
      this.setState({ data, loading: false, error: null, params });
      this.options?.onSuccess?.(data, params); // 处理请求成功后的操作
      this.options?.onFinally?.(params, data); // 处理请求结束的回调
    } catch (error) {
      this.setState({ error, loading: false, data: null, params });
      this.options?.onError?.(error); // 处理错误
      this.options?.onFinally?.(params, null, error); // 处理请求结束的回调
      throw error; // 抛出错误，以便上层处理
    }
  }

  refresh() {
    this.run(...(this.state.params || []));
  }

  refreshAsync() {
    this.runAsync(...(this.state.params || []));
  }

+  mutate(data) {
+    this.setState({ data });
+  }
}

export default Fetch;
```

# 取消请求
+ `useRequest` 提供了 `cancel` 函数，用于忽略当前 promise 返回的数据和错误
+ 注意：调用 `cancel` 函数并不会取消 promise 的执行
+ 同时 `useRequest` 会在以下时机自动忽略响应：
    - 组件卸载时，正在进行的 promise
    - 竞态取消，当上一次 promise 还没返回时，又发起了下一次 promise，则会忽略上一次 promise 的响应

```jsx
import { useRequest } from '../../ahooks';
// import { useRequest } from 'ahooks';
import axios from 'axios';

function Demo1() {
  const url = 'https://jsonplaceholder.typicode.com/users' // + (Math.random() > 0.5 ? '' : '1');
  // id 为 1 - 10 的随机数
  const DEFAULT_PARAMS = {id: Math.floor(Math.random() * 10 + 1)}

  const getUsers = (params) => {
    // console.log('getUsers', params);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        axios.get(url, { params }).then(res => {
          console.log(res);
          resolve(res.data)
        }).catch(err => {
          reject(err)
        })
      }, 3000)
    })
  }
  
  const {
    data,
    error,
    loading,
    run,
    runAsync,
    refresh,
    refreshAsync,
    mutate,
    cancel
    // params
  } = useRequest(getUsers, {
    manual: false, // 是否手动执行
    defaultParams: [DEFAULT_PARAMS],
    onBefore: (params) => {
      console.log('onBefore', params);
    },
    onSuccess: (result, params) => {
      console.log('onSuccess', result, params);
      const data = result?.map?.(item => ({...item, name: 'hahaha'}))
      setTimeout(() => {
        mutate(data)
      }, 1000);
      
    },
    onError: (err) => {
      console.log('onError', err);
    },
    onFinally: (params, result, error) => {
      console.log('onFinally', params, result, error);
    },
  });

  const fetchRun = () => {
    run(DEFAULT_PARAMS)
  }

  const fetchRunAsync = () => {
    runAsync(DEFAULT_PARAMS).catch(err => {
      console.log('fetchRunAsync', err);
    })
  }

  setTimeout(() => {
    cancel()
  }, 1000);


  return (
    <>
      <h2>Demo2</h2>
      <div style={{display: 'flex', gap: 10}}>
        <button onClick={fetchRun}>run</button>
        <button onClick={fetchRunAsync }>runAsync</button>
        <button onClick={refresh} type="button">Refresh</button>
        <button onClick={refreshAsync} type="button">RefreshAsync</button>
      </div>
      <div>
        {
          loading ? <div>loading...</div> :
            error ? <div>error</div> :
              data?.map((item) => {
                return <div key={item.id}>{item.name}</div>;
              })
        }
      </div>
    </>
  );
}

export default Demo1;
```

## <font style="color:rgb(69, 77, 100);">ahooks</font>
### <font style="color:rgb(69, 77, 100);">useRequest</font>
#### <font style="color:rgb(69, 77, 100);">src</font>
##### <font style="color:rgb(69, 77, 100);">useRequestImplement.js</font>
```diff
import useLatest from '../../useLatest';
import useUpdate from '../../useUpdate';
import useCreation from '../../useCreation';
import useMount from '../../useMount';
import useMemoizedFn from '../../useMemoizedFn';
import Fetch from './Fetch';
+import useUnmount from '../../useUnmount';

/**
 * useRequestImplement 函数
 * useRequest 的核心实现，负责创建和管理请求实例
 * @param {Function} service - 请求服务函数
 * @returns 请求状态对象
 */
function useRequestImplement(service, options) {
  const { manual, ...rest } = options; // 解构 options 中的参数
  const fetchOptions = { manual, ...rest }; // 创建 fetchOptions 对象
  const serviceRef = useLatest(service); // 保持 service 的最新引用
  const update = useUpdate(); // 触发组件更新的函数
  // 创建 Fetch 实例，使用 useCreation 确保实例稳定
  const fetchInstance = useCreation(() => new Fetch(serviceRef, fetchOptions, update), []);

  // 组件挂载时自动执行请求
  useMount(() => {
    if (!manual) {
      const params = fetchInstance.state.params || options.defaultParams || []; // 获取默认参数
      fetchInstance.run(...params);
    }
  });

+  useUnmount(() => {
+    fetchInstance.cancel();
+  });
  
  // 返回请求状态（data、loading、error 等）
  const { state } = fetchInstance
  return {
    ...state,
    run: useMemoizedFn((...args) => fetchInstance.run(...args)),
    runAsync: useMemoizedFn((...args) => fetchInstance.runAsync(...args)),
    refresh: useMemoizedFn(() => fetchInstance.refresh()),
    refreshAsync: useMemoizedFn(() => fetchInstance.refreshAsync()),
    mutate: useMemoizedFn((data) => fetchInstance.mutate(data)),
+    cancel: useMemoizedFn(() => fetchInstance.cancel()),
  }
}

export default useRequestImplement;
```

##### <font style="color:rgb(69, 77, 100);">Fetch.js</font>
```diff
/**
 * Fetch 类
 * 负责管理异步请求的状态和执行
 * 包含请求的数据、加载状态、错误信息等
 */
class Fetch {
  constructor(service, options, subscribe) {
    this.service = service; // 请求服务函数
    this.options = options; // 请求配置项
    this.subscribe = subscribe; // 触发组件重新渲染的回调函数
    this.state = { data: null, loading: false, error: null }; // 初始状态
+    this.count = 0; // 请求计数器
  }

  /**
   * 更新状态并触发组件重新渲染
   * @param {Object} state - 要更新的状态对象
   */
  setState(state = {}) {
    this.state = { ...this.state, ...state };
    this.subscribe(); // 通知组件更新
  }

  /**
   * 同步执行请求（不等待结果）
   */
  run(...params) {
    this.runAsync(...params).catch(error => {
      if(!this.options.onError) {
        console.error(error);
      }
    })
  }

  /**
   * 异步执行请求
   * 处理请求的加载状态、数据和错误
   */
  async runAsync(...params) {
+    this.count += 1;
+    const currentCount = this.count;
    try {
      this.options?.onBefore?.(params); // 处理请求开始前的操作
      this.setState({ loading: true });
      const data = await this.service.current(...params);
+      if (currentCount !== this.count) {
+        return new Promise(() => {}); // 忽略掉旧请求
+      }
      this.setState({ data, loading: false, error: null, params });
      this.options?.onSuccess?.(data, params); // 处理请求成功后的操作
      this.options?.onFinally?.(params, data); // 处理请求结束的回调
    } catch (error) {
+      if (currentCount !== this.count) {
+        return new Promise(() => {}); // 忽略掉旧请求
+      }
      this.setState({ error, loading: false, data: null, params });
      this.options?.onError?.(error); // 处理错误
      this.options?.onFinally?.(params, null, error); // 处理请求结束的回调
      throw error; // 抛出错误，以便上层处理
    }
  }

  refresh() {
    this.run(...(this.state.params || []));
  }

  refreshAsync() {
    this.runAsync(...(this.state.params || []));
  }

  mutate(data) {
    this.setState({ data });
  }

+  cancel() {
+    this.count += 1; // 添加 count，用于取消当前请求
+    this.setState({ loading: false });
+    this.options?.onCancel?.(); // 处理请求取消的回调
+  }
}

export default Fetch;
```

### <font style="color:rgb(69, 77, 100);">useUnmount</font>
#### <font style="color:rgb(69, 77, 100);">index.js</font>
```javascript
import { useEffect } from "react"
import useLatest from "../useLatest";

function useUnmount (fn) {
  const fnRef = useLatest(fn)
  useEffect(() => () => fnRef.current?.(), [])
}

export default useUnmount;
```

# 插件系统
+ useRequest通过插件式组织代码，核心代码极其简单，所有高级功能均是通过插件实现
+ 在请求过程中会触发各种各样的事件，可以为这些事件编写钩子函数，而插件就是钩子函数的集合

| 钩子 | 说明 |
| --- | --- |
| onBefore | 请求前 |
| onRequest | 请求中 |
| onSuccess | 请求成功 |
| onError | 请求失败 |
| onFinally | 请求结束 |
| onCancel | 请求取消 |
| onMutate | 修改结果数据 |
| onInit | 初始化状态 |


```jsx
import { useRequest } from '../../ahooks';
// import { useRequest } from 'ahooks';
import axios from 'axios';

function Demo1() {
  const url = 'https://jsonplaceholder.typicode.com/users' // + (Math.random() > 0.5 ? '' : '1');
  // id 为 1 - 10 的随机数
  const DEFAULT_PARAMS = {id: Math.floor(Math.random() * 10 + 1)}

  const getUsers = (params) => {
    // console.log('getUsers', params);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        axios.get(url, { params }).then(res => {
          console.log(res);
          resolve(res.data)
        }).catch(err => {
          reject(err)
        })
      }, 1000)
    })
  }
  
  const {
    data,
    error,
    loading,
    run,
    runAsync,
    refresh,
    refreshAsync,
    mutate,
    // cancel
    // params
    id
  } = useRequest(getUsers, {
    id: 'demo2',
    manual: false, // 是否手动执行
    defaultParams: [DEFAULT_PARAMS],
    onBefore: (params) => {
      console.log('onBefore', params);
    },
    onSuccess: (result, params) => {
      console.log('onSuccess', result, params);
      const data = result?.map?.(item => ({...item, name: 'hahaha'}))
      setTimeout(() => {
        mutate(data)
      }, 1000);
      
    },
    onError: (err) => {
      console.log('onError', err);
    },
    onFinally: (params, result, error) => {
      console.log('onFinally', params, result, error);
    },
  }, []);

  console.log('id', id);

  const fetchRun = () => {
    run(DEFAULT_PARAMS)
  }

  const fetchRunAsync = () => {
    runAsync(DEFAULT_PARAMS).catch(err => {
      console.log('fetchRunAsync', err);
    })
  }

  // setTimeout(() => {
  //   cancel()
  // }, 1000);


  return (
    <>
      <h2>Demo2</h2>
      <div style={{display: 'flex', gap: 10}}>
        <button onClick={fetchRun}>run</button>
        <button onClick={fetchRunAsync }>runAsync</button>
        <button onClick={refresh} type="button">Refresh</button>
        <button onClick={refreshAsync} type="button">RefreshAsync</button>
      </div>
      <div>
        {
          loading ? <div>loading...</div> :
            error ? <div>error</div> :
              data?.map((item) => {
                return <div key={item.id}>{item.name}</div>;
              })
        }
      </div>
    </>
  );
}

export default Demo1;
```

## <font style="color:rgb(69, 77, 100);">ahooks</font>
### <font style="color:rgb(69, 77, 100);">useRequest</font>
#### <font style="color:rgb(69, 77, 100);">src</font>
##### <font style="color:rgb(69, 77, 100);">useRequest.js</font>
```diff
import useLoggerPlugin from './plugins/useLoggerPlugin';
import useRequestImplement from './useRequestImplement';

/**
 * useRequest hook
 * 用于处理异步请求的 React Hook
 * 提供请求状态管理、错误处理等功能
 * @param {Function} service - 请求服务函数
 * @param {Object} options - 配置选项（当前未使用）
 * @param {Array} plugins - 插件数组（当前未使用）
 * @returns 请求状态和方法
 */
function useRequest(service, options, plugins = []) {
-  return useRequestImplement(service, options, plugins)
+  return useRequestImplement(service, options, [
+    ...plugins, // 用户自定义插件
+    useLoggerPlugin, // 默认的日志插件
+  ])
}

export default useRequest
```

##### <font style="color:rgb(69, 77, 100);">useRequestImplement.js</font>
```diff
import useLatest from '../../useLatest';
import useUpdate from '../../useUpdate';
import useCreation from '../../useCreation';
import useMount from '../../useMount';
import useMemoizedFn from '../../useMemoizedFn';
import Fetch from './Fetch';
import useUnmount from '../../useUnmount';

/**
 * useRequestImplement 函数
 * useRequest 的核心实现，负责创建和管理请求实例
 * @param {Function} service - 请求服务函数
 * @returns 请求状态对象
 */
+function useRequestImplement(service, options, plugins) {
  const { manual, ...rest } = options; // 解构 options 中的参数
  const fetchOptions = { manual, ...rest }; // 创建 fetchOptions 对象
  const serviceRef = useLatest(service); // 保持 service 的最新引用
  const update = useUpdate(); // 触发组件更新的函数
  // 创建 Fetch 实例，使用 useCreation 确保实例稳定

+  const fetchInstance = useCreation(() => {
+    const initialStates = plugins.map(p => p?.onInit?.(fetchOptions))?.filter(Boolean); // 执行插件的 onInit 方法，获取初始状态
+    return new Fetch(serviceRef, fetchOptions, update, Object.assign({}, ...initialStates));
+  }, []);

+  fetchInstance.options = fetchOptions; // 设置请求配置项
+  fetchInstance.pluginImpls = plugins.map(p => p(fetchInstance, fetchOptions)); // 创建插件实例

  // 组件挂载时自动执行请求
  useMount(() => {
    if (!manual) {
      const params = fetchInstance.state.params || options.defaultParams || []; // 获取默认参数
      fetchInstance.run(...params);
    }
  });

  useUnmount(() => {
    fetchInstance.cancel();
  });
  
  // 返回请求状态（data、loading、error 等）
  const { state } = fetchInstance
  return {
    ...state,
    run: useMemoizedFn((...args) => fetchInstance.run(...args)),
    runAsync: useMemoizedFn((...args) => fetchInstance.runAsync(...args)),
    refresh: useMemoizedFn(() => fetchInstance.refresh()),
    refreshAsync: useMemoizedFn(() => fetchInstance.refreshAsync()),
    mutate: useMemoizedFn((data) => fetchInstance.mutate(data)),
    cancel: useMemoizedFn(() => fetchInstance.cancel()),
  }
}

export default useRequestImplement;
```

##### <font style="color:rgb(69, 77, 100);">Fetch.js</font>
```diff
/**
 * Fetch 类
 * 负责管理异步请求的状态和执行
 * 包含请求的数据、加载状态、错误信息等
 */
class Fetch {
+  constructor(service, options, subscribe, initialState = {}) {
    this.service = service; // 请求服务函数
    this.options = options; // 请求配置项
    this.subscribe = subscribe; // 触发组件重新渲染的回调函数
+    this.state = { data: null, loading: !options.manual, error: null, params: null, ...initialState }; // 初始状态
    this.count = 0; // 请求计数器
  }

  /**
   * 更新状态并触发组件重新渲染
   * @param {Object} state - 要更新的状态对象
   */
  setState(state = {}) {
    this.state = { ...this.state, ...state };
    this.subscribe(); // 通知组件更新
  }

  /**
   * 同步执行请求（不等待结果）
   */
  run(...params) {
    this.runAsync(...params).catch(error => {
      if(!this.options.onError) {
        console.error(error);
      }
    })
  }

  /**
   * 异步执行请求
   * 处理请求的加载状态、数据和错误
   */
  async runAsync(...params) {
    this.count += 1;
    const currentCount = this.count;
    try {
+      const { ...state } = this.runPluginHandler('onBefore', params); // 调用插件的 onBefore 方法
      this.options?.onBefore?.(params); // 处理请求开始前的操作
+      this.setState({ loading: true, params, ...state });

+      // 调用插件的 onRequest 方法，获取新的 servicePromise
+      let { servicePromise } = this.runPluginHandler('onRequest', this.service.current, params);
+      if (!servicePromise) {
+        servicePromise = this.service.current(...params);
+      }
+      const data = await servicePromise;

      if (currentCount !== this.count) {
        return new Promise(() => {}); // 忽略掉旧请求
      }
      this.setState({ data, loading: false, error: null, params });
      this.options?.onSuccess?.(data, params); // 处理请求成功后的操作
+      this.runPluginHandler('onSuccess', data, params); // 调用插件的 onSuccess 方法
      this.options?.onFinally?.(params, data); // 处理请求结束的回调

+      if(currentCount === this.count) {
+        this.runPluginHandler('onFinally', params, data, null); // 调用插件的 onFinally 方法
+      }
    } catch (error) {
      if (currentCount !== this.count) {
        return new Promise(() => {}); // 忽略掉旧请求
      }
      this.setState({ error, loading: false, data: null, params });
      this.options?.onError?.(error); // 处理错误
+      this.runPluginHandler('onError', error); // 调用插件的 onError 方法
      this.options?.onFinally?.(params, null, error); // 处理请求结束的回调

+      if(currentCount === this.count) {
+        this.runPluginHandler('onFinally', params, null, error); // 调用插件的 onFinally 方法
+      }
      throw error; // 抛出错误，以便上层处理
    }
  }

  refresh() {
    this.run(...(this.state.params || []));
  }

  refreshAsync() {
    this.runAsync(...(this.state.params || []));
  }

  mutate(data) {
+    this.runPluginHandler('onMutate', data); // 
    this.setState({ data });
  }

  cancel() {
    this.count += 1; // 添加 count，用于取消当前请求
    this.setState({ loading: false });
    this.options?.onCancel?.(); // 处理请求取消的回调
+    this.runPluginHandler('onCancel'); // 调用插件的 onCancel 方法
  }

+  runPluginHandler(event, ...rest) {
+    const r = this.pluginImpls.map(i => i[event]?.(...rest)).filter(Boolean);
+    return Object.assign({}, ...r);
+  }
}

export default Fetch;
```

##### plugins
###### useLoggerPlugin.js
```javascript
function useLoggerPlugin(fetchInstance, options) {
  return {
    onBefore (params) {
      console.log('useLoggerPlugin onBefore', params)
      return {
        id: options.id
      }
    },
    onRequest (service, params) {
      console.log('useLoggerPlugin onRequest', service, params)
      return null // 返回 null 或 一个新的 servicePromise 
      // return { servicePromise: Promise.resolve('新的返回值') }
    },
    onSuccess (data, params) {
      console.log('useLoggerPlugin onSuccess', data, params)
    },
    onError (error) {
      console.log('useLoggerPlugin onError', error)
    },
    onFinally (params, data, error) {
      console.log('useLoggerPlugin onFinally', params, data, error)
    },
    onCancel () {
      console.log('useLoggerPlugin onCancel')
    },
    onMutate (data) {
      console.log('useLoggerPlugin onMutate', data)
    }
  }
}

useLoggerPlugin.onInit = (options) => {
  return { ...options, logger: true }
}

export default useLoggerPlugin;
```

# Loading Delay
+ <font style="color:rgb(69, 77, 100);">通过设置 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">options.loadingDelay</font>`<font style="color:rgb(69, 77, 100);"> ，可以延迟 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">loading</font>`<font style="color:rgb(69, 77, 100);"> 变成 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">true</font>`<font style="color:rgb(69, 77, 100);"> 的时间，有效防止闪烁。</font>

```jsx
import { useRequest } from '../../ahooks';
// import { useRequest } from 'ahooks';
import axios from 'axios';

function Demo1() {
  const url = 'https://jsonplaceholder.typicode.com/users' // + (Math.random() > 0.5 ? '' : '1');
  // id 为 1 - 10 的随机数
  const DEFAULT_PARAMS = {id: Math.floor(Math.random() * 10 + 1)}

  const getUsers = (params) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        axios.get(url, { params }).then(res => {
          console.log(res);
          resolve(res.data)
        }).catch(err => {
          reject(err)
        })
      }, 3000)
    })
  }
  
  const {
    data,
    error,
    loading,
    run,
    runAsync,
    refresh,
    refreshAsync,
  } = useRequest(getUsers, {
    loadingDelay: 1000,
    manual: false, // 是否手动执行
    defaultParams: [DEFAULT_PARAMS],
    onBefore: (params) => {
      console.log('onBefore', params);
    },
    onSuccess: (result, params) => {
      console.log('onSuccess', result, params);  
    },
    onError: (err) => {
      console.log('onError', err);
    },
    onFinally: (params, result, error) => {
      console.log('onFinally', params, result, error);
    },
  }, []);

  const fetchRun = () => {
    run(DEFAULT_PARAMS)
  }

  const fetchRunAsync = () => {
    runAsync(DEFAULT_PARAMS).catch(err => {
      console.log('fetchRunAsync', err);
    })
  }

  return (
    <>
      <h2>Demo2</h2>
      <div style={{display: 'flex', gap: 10}}>
        <button onClick={fetchRun}>run</button>
        <button onClick={fetchRunAsync }>runAsync</button>
        <button onClick={refresh} type="button">Refresh</button>
        <button onClick={refreshAsync} type="button">RefreshAsync</button>
      </div>
      <div>
        {
          loading ? <div>loading...</div> :
            error ? <div>error</div> :
              data?.map((item) => {
                return <div key={item.id}>{item.name}</div>;
              })
        }
      </div>
    </>
  );
}

export default Demo1;
```

## <font style="color:rgb(69, 77, 100);">ahooks</font>
### <font style="color:rgb(69, 77, 100);">useRequest</font>
#### <font style="color:rgb(69, 77, 100);">src</font>
##### <font style="color:rgb(69, 77, 100);">useRequest.js</font>
```diff
import useLoadingDelayPlugin from './plugins/useLoadingDelayPlugin';
-import useLoggerPlugin from './plugins/useLoggerPlugin';
+import useRequestImplement from './useRequestImplement';

/**
 * useRequest hook
 * 用于处理异步请求的 React Hook
 * 提供请求状态管理、错误处理等功能
 * @param {Function} service - 请求服务函数
 * @param {Object} options - 配置选项（当前未使用）
 * @param {Array} plugins - 插件数组（当前未使用）
 * @returns 请求状态和方法
 */
function useRequest(service, options, plugins = []) {
  return useRequestImplement(service, options, [
    ...plugins, // 用户自定义插件
-    useLoggerPlugin, // 默认的日志插件
+    useLoadingDelayPlugin
  ])
}

export default useRequest
```

##### plugins
###### useLoadingDelayPlugin.js
```javascript
import { useRef } from "react"

function useLoadingDelayPlugin(fetchInstance, options) {
  const { loadingDelay } = options;
  const timerRef = useRef(null);

  if(!loadingDelay) {
    return {}; // 不使用loadingDelay，直接返回空对象
  }

  const cancelTimeout = () => {
    if(timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }

  return {
    onBefore(params) {
      console.log('useLoadingDelayPlugin onBefore', params)
      timerRef.current = setTimeout(() => {
        fetchInstance.setState({
          loading: true
        })
      }, loadingDelay);
      return { loading: false }
    },
    onFinally (params, data, error) {
      console.log('useLoadingDelayPlugin onFinally', params, data, error)
      cancelTimeout();
    },
    onCancel () {
      console.log('useLoadingDelayPlugin onCancel')
      cancelTimeout();
    }
  }
}

export default useLoadingDelayPlugin;
```

# 轮询
+ <font style="color:rgb(69, 77, 100);">通过设置 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">options.pollingInterval</font>`<font style="color:rgb(69, 77, 100);">，进入轮询模式，</font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">useRequest</font>`<font style="color:rgb(69, 77, 100);"> 会定时触发 service 执行。</font>
+ <font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">pollingWhenHidden</font><font style="color:rgb(69, 77, 100);"> 在页面隐藏时，是否继续轮询。如果设置为 false，在页面隐藏时会暂时停止轮询，页面重新显示时继续上次轮询。</font>

```jsx
import { useRequest } from '../../ahooks';
// import { useRequest } from 'ahooks';
import axios from 'axios';

function Demo1() {
  const url = 'https://jsonplaceholder.typicode.com/users' // + (Math.random() > 0.5 ? '' : '1');
  // id 为 1 - 10 的随机数
  const DEFAULT_PARAMS = {id: Math.floor(Math.random() * 10 + 1)}

  const getUsers = (params) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        axios.get(url, { params }).then(res => {
          console.log(res);
          resolve(res.data)
        }).catch(err => {
          reject(err)
        })
      }, 3000)
    })
  }
  
  const {
    data,
    error,
    loading,
    run,
    runAsync,
    refresh,
    refreshAsync,
  } = useRequest(getUsers, {
    pollingInterval: 3000, // 轮询间隔
    pollingWhenHidden: true, // 轮询时页面隐藏
    loadingDelay: 1000, // 延迟加载时间
    manual: false, // 是否手动执行
    defaultParams: [DEFAULT_PARAMS],
    onBefore: (params) => {
      console.log('onBefore', params);
    },
    onSuccess: (result, params) => {
      console.log('onSuccess', result, params);  
    },
    onError: (err) => {
      console.log('onError', err);
    },
    onFinally: (params, result, error) => {
      console.log('onFinally', params, result, error);
    },
  }, []);

  const fetchRun = () => {
    run(DEFAULT_PARAMS)
  }

  const fetchRunAsync = () => {
    runAsync(DEFAULT_PARAMS).catch(err => {
      console.log('fetchRunAsync', err);
    })
  }

  return (
    <>
      <h2>Demo2</h2>
      <div style={{display: 'flex', gap: 10}}>
        <button onClick={fetchRun}>run</button>
        <button onClick={fetchRunAsync }>runAsync</button>
        <button onClick={refresh} type="button">Refresh</button>
        <button onClick={refreshAsync} type="button">RefreshAsync</button>
      </div>
      <div>
        {
          loading ? <div>loading...</div> :
            error ? <div>error</div> :
              data?.map((item) => {
                return <div key={item.id}>{item.name}</div>;
              })
        }
      </div>
    </>
  );
}

export default Demo1;
```

## <font style="color:rgb(69, 77, 100);">ahooks</font>
### <font style="color:rgb(69, 77, 100);">useRequest</font>
#### <font style="color:rgb(69, 77, 100);">src</font>
##### <font style="color:rgb(69, 77, 100);">useRequest.js</font>
```diff
import useLoadingDelayPlugin from './plugins/useLoadingDelayPlugin';
+import usePollingPlugin from './plugins/usePollingPlugin';
// import useLoggerPlugin from './plugins/useLoggerPlugin';
import useRequestImplement from './useRequestImplement';

/**
 * useRequest hook
 * 用于处理异步请求的 React Hook
 * 提供请求状态管理、错误处理等功能
 * @param {Function} service - 请求服务函数
 * @param {Object} options - 配置选项（当前未使用）
 * @param {Array} plugins - 插件数组（当前未使用）
 * @returns 请求状态和方法
 */
function useRequest(service, options, plugins = []) {
  return useRequestImplement(service, options, [
    ...plugins, // 用户自定义插件
    // useLoggerPlugin, // 默认的日志插件
    useLoadingDelayPlugin,
+    usePollingPlugin
  ])
}

export default useRequest
```

##### <font style="color:rgb(69, 77, 100);">plugins</font>
###### usePollingPlugin.js
```javascript
import { useRef } from "react";
import useUpdateEffect from "../../../useUpdateEffect";
import isDocumentVisible from "../../../utils/isDocumentVisible";
import subscribeReVisible  from "../../../utils/subscribeReVisible";

function usePollingPlugin(fetchInstance, options) {
  const { pollingInterval, pollingWhenHidden } = options;
  const timeRef = useRef();
  const unsubscribeRef = useRef(null);

  const stopPolling = () => {
    if (timeRef.current) {
      clearTimeout(timeRef.current);
    }
    unsubscribeRef.current?.();
  };

  useUpdateEffect(() => {
    if(!pollingInterval) {
      stopPolling();
    }
  }, [pollingInterval])

  if (!pollingInterval) {
    return {};
  }

  return {
    onBefore: () => {
      console.log('usePollingPlugin onBefore')
      stopPolling();
    },
    onFinally: () => {
      console.log('usePollingPlugin onFinally')
      // 如果不开启pollingWhenHidden，并且当前页面不可见，则停止轮询
      if (!pollingWhenHidden && !isDocumentVisible()) {
        unsubscribeRef.current = subscribeReVisible(() => fetchInstance.refresh())
        return;
      }
      timeRef.current = setTimeout(() => {
        fetchInstance.refresh();
      }, pollingInterval);
    },
    onCancel: () => {
      console.log('usePollingPlugin onCancel')
      stopPolling();
    }
  }
}

export default usePollingPlugin;
```

### useUpdateEffect
#### index.js
```javascript
import { useEffect } from "react";
import createUpdateEffect from "../createUpdateEffect";

/**
 * @description: 组件更新时执行, 忽略第一次
 * @param {Function} callback 回调函数
 * @param {Array} deps 依赖数组
 * @return {*}
 */
export default createUpdateEffect(useEffect);
```

### createUpdateEffect
#### index.js
```javascript
import { useRef } from "react";

/**
 * @description: 创建一个更新时执行, 忽略第一次的hook
 * @param {Function} useEffect useEffect函数
 * @return {Function}
 */
function createUpdateEffect(useEffect) {
  return (callback, deps) => {
    const isMounted = useRef(false);
    useEffect(() => {
      if (!isMounted.current) {
        isMounted.current = true;
      } else {
        callback();
      }
    }, deps);
  };
}

export default createUpdateEffect
```

### utils
#### isDocumentVisible.js
```javascript
function isDocumentVisible() {
  return document.visibilityState !== 'hidden';
}

export default isDocumentVisible;
```

#### subscribeReVisible.js
```jsx
import isDocumentVisible from "./isDocumentVisible";

const listeners = [];
function subscribe(listener) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    listeners.splice(index, 1);
  };
}

function revalidate() {
  if (!isDocumentVisible) return;
  listeners.forEach((listener) => listener());
}

window.addEventListener("visibilitychange", revalidate);

export default subscribe;
```

# Ready
+ <font style="color:rgb(69, 77, 100);">通过设置 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">options.ready</font>`<font style="color:rgb(69, 77, 100);">，可以控制请求是否发出。当其值为 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">false</font>`<font style="color:rgb(69, 77, 100);"> 时，请求永远都不会发出。</font>
+ <font style="color:rgb(69, 77, 100);">其具体行为如下：</font>
    1. <font style="color:rgb(69, 77, 100);">当</font><font style="color:rgb(69, 77, 100);"> </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">manual=false</font>`<font style="color:rgb(69, 77, 100);"> </font><font style="color:rgb(69, 77, 100);">自动请求模式时，每次</font><font style="color:rgb(69, 77, 100);"> </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">ready</font>`<font style="color:rgb(69, 77, 100);"> </font><font style="color:rgb(69, 77, 100);">从</font><font style="color:rgb(69, 77, 100);"> </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">false</font>`<font style="color:rgb(69, 77, 100);"> </font><font style="color:rgb(69, 77, 100);">变为</font><font style="color:rgb(69, 77, 100);"> </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">true</font>`<font style="color:rgb(69, 77, 100);"> </font><font style="color:rgb(69, 77, 100);">时，都会自动发起请求，会带上参数</font><font style="color:rgb(69, 77, 100);"> </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">options.defaultParams</font>`<font style="color:rgb(69, 77, 100);">。</font>
    2. <font style="color:rgb(69, 77, 100);">当 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">manual=true</font>`<font style="color:rgb(69, 77, 100);"> 手动请求模式时，只要 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">ready=false</font>`<font style="color:rgb(69, 77, 100);">，则通过 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">run/runAsync</font>`<font style="color:rgb(69, 77, 100);"> 触发的请求都不会执行。</font>

```jsx
import { useState } from 'react';
import { useRequest } from '../../ahooks';
// import { useRequest } from 'ahooks';
import axios from 'axios';

function Demo1() {

  const [ready, setReady] = useState(true);
  const [manual, setManual] = useState(false);

  const url = 'https://jsonplaceholder.typicode.com/users' // + (Math.random() > 0.5 ? '' : '1');
  // id 为 1 - 10 的随机数
  const DEFAULT_PARAMS = {id: Math.floor(Math.random() * 10 + 1)}

  const getUsers = (params) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        axios.get(url, { params }).then(res => {
          console.log(res);
          resolve(res.data)
        }).catch(err => {
          reject(err)
        })
      }, 3000)
    })
  }
  
  const {
    data,
    error,
    loading,
    run,
    runAsync,
    refresh,
    refreshAsync,
  } = useRequest(getUsers, {
    ready, // 是否自动执行
    // pollingInterval: 3000, // 轮询间隔
    // pollingWhenHidden: true, // 轮询时页面隐藏
    // loadingDelay: 1000, // 延迟加载时间
    manual, // 是否手动执行
    defaultParams: [DEFAULT_PARAMS],
    onBefore: (params) => {
      console.log('onBefore', params);
    },
    onSuccess: (result, params) => {
      console.log('onSuccess', result, params);  
    },
    onError: (err) => {
      console.log('onError', err);
    },
    onFinally: (params, result, error) => {
      console.log('onFinally', params, result, error);
    },
  }, []);

  const fetchRun = () => {
    run(DEFAULT_PARAMS)
  }

  const fetchRunAsync = () => {
    runAsync(DEFAULT_PARAMS).catch(err => {
      console.log('fetchRunAsync', err);
    })
  }

  return (
    <>
      <h2>Demo2</h2>
      <div>
        <span>ready: {`${ready}`}, manual: {`${manual}`} </span>
        <button onClick={() => setReady(pre => !pre)}>{ready ? 'Ready' : 'Not Ready'}</button>
        <button onClick={() => setManual(pre => !pre)}>{!manual ? '自动模式' : '手动模式'}</button>
      </div>
      <br />
      <div style={{display: 'flex', gap: 10}}>
        <button onClick={fetchRun}>run</button>
        <button onClick={fetchRunAsync }>runAsync</button>
        <button onClick={refresh} type="button">Refresh</button>
        <button onClick={refreshAsync} type="button">RefreshAsync</button>
      </div>
      <div>
        {
          loading ? <div>loading...</div> :
            error ? <div>error</div> :
              data?.map((item) => {
                return <div key={item.id}>{item.name}</div>;
              })
        }
      </div>
    </>
  );
}

export default Demo1;
```

## <font style="color:rgb(69, 77, 100);">ahooks</font>
### <font style="color:rgb(69, 77, 100);">useRequest</font>
#### <font style="color:rgb(69, 77, 100);">src</font>
##### <font style="color:rgb(69, 77, 100);">useRequest.js</font>
```diff
+import useAutoPlugin from './plugins/useAutoPlugin';
import useLoadingDelayPlugin from './plugins/useLoadingDelayPlugin';
import usePollingPlugin from './plugins/usePollingPlugin';
// import useLoggerPlugin from './plugins/useLoggerPlugin';
import useRequestImplement from './useRequestImplement';

/**
 * useRequest hook
 * 用于处理异步请求的 React Hook
 * 提供请求状态管理、错误处理等功能
 * @param {Function} service - 请求服务函数
 * @param {Object} options - 配置选项（当前未使用）
 * @param {Array} plugins - 插件数组（当前未使用）
 * @returns 请求状态和方法
 */
function useRequest(service, options, plugins = []) {
  return useRequestImplement(service, options, [
    ...plugins, // 用户自定义插件
    // useLoggerPlugin, // 默认的日志插件
    useLoadingDelayPlugin,
    usePollingPlugin,
+    useAutoPlugin
  ])
}

export default useRequest
```

##### <font style="color:rgb(69, 77, 100);">Fetch.js</font>
```diff
/**
 * Fetch 类
 * 负责管理异步请求的状态和执行
 * 包含请求的数据、加载状态、错误信息等
 */
class Fetch {
  constructor(service, options, subscribe, initialState = {}) {
    this.service = service; // 请求服务函数
    this.options = options; // 请求配置项
    this.subscribe = subscribe; // 触发组件重新渲染的回调函数
    this.state = { data: null, loading: !options.manual, error: null, params: null, ...initialState }; // 初始状态
    this.count = 0; // 请求计数器
  }

  /**
   * 更新状态并触发组件重新渲染
   * @param {Object} state - 要更新的状态对象
   */
  setState(state = {}) {
    this.state = { ...this.state, ...state };
    this.subscribe(); // 通知组件更新
  }

  /**
   * 同步执行请求（不等待结果）
   */
  run(...params) {
    this.runAsync(...params).catch(error => {
      if(!this.options.onError) {
        console.error(error);
      }
    })
  }

  /**
   * 异步执行请求
   * 处理请求的加载状态、数据和错误
   */
  async runAsync(...params) {
    this.count += 1;
    const currentCount = this.count;
    try {
+      const { stopNow, ...state } = this.runPluginHandler('onBefore', params); // 调用插件的 onBefore 方法

+      if (stopNow) {
+        return new Promise(() => {}); // 忽略掉当前请求
+      }

      this.options?.onBefore?.(params); // 处理请求开始前的操作
      this.setState({ loading: true, params, ...state });

      // 调用插件的 onRequest 方法，获取新的 servicePromise
      let { servicePromise } = this.runPluginHandler('onRequest', this.service.current, params);
      if (!servicePromise) {
        servicePromise = this.service.current(...params);
      }
      const data = await servicePromise;

      if (currentCount !== this.count) {
        return new Promise(() => {}); // 忽略掉旧请求
      }
      this.setState({ data, loading: false, error: null, params });
      this.options?.onSuccess?.(data, params); // 处理请求成功后的操作
      this.runPluginHandler('onSuccess', data, params); // 调用插件的 onSuccess 方法
      this.options?.onFinally?.(params, data); // 处理请求结束的回调

      if(currentCount === this.count) {
        this.runPluginHandler('onFinally', params, data, null); // 调用插件的 onFinally 方法
      }
    } catch (error) {
      if (currentCount !== this.count) {
        return new Promise(() => {}); // 忽略掉旧请求
      }
      this.setState({ error, loading: false, data: null, params });
      this.options?.onError?.(error); // 处理错误
      this.runPluginHandler('onError', error); // 调用插件的 onError 方法
      this.options?.onFinally?.(params, null, error); // 处理请求结束的回调

      if(currentCount === this.count) {
        this.runPluginHandler('onFinally', params, null, error); // 调用插件的 onFinally 方法
      }
      throw error; // 抛出错误，以便上层处理
    }
  }

  refresh() {
    this.run(...(this.state.params || []));
  }

  refreshAsync() {
    this.runAsync(...(this.state.params || []));
  }

  mutate(data) {
    this.runPluginHandler('onMutate', data); // 
    this.setState({ data });
  }

  cancel() {
    this.count += 1; // 添加 count，用于取消当前请求
    this.setState({ loading: false });
    this.options?.onCancel?.(); // 处理请求取消的回调
    this.runPluginHandler('onCancel'); // 调用插件的 onCancel 方法
  }

  runPluginHandler(event, ...rest) {
    const r = this.pluginImpls.map(i => i[event]?.(...rest)).filter(Boolean);
    return Object.assign({}, ...r);
  }
}

export default Fetch;
```

##### <font style="color:rgb(69, 77, 100);">plugins</font>
###### useAutoPlugin.js
```jsx
import { useRef } from "react";
import useUpdateEffect from "../../../useUpdateEffect";

function useAutoPlugin(fetchInstance, options) {
  const { ready, manual, defaultParams } = options
  const hasAutoRun = useRef(false);

  useUpdateEffect(() => {
    // ready 为 true 且 manual 为 false 时，自动运行
    if (ready && !manual) {
      hasAutoRun.current = true;
      fetchInstance.run(...defaultParams);
    }
  }, [ready]);

  return {
    onBefore() {
      console.log('useAutoPlugin onBefore', ready)
      if (!ready) {
        return {
          stopNow: true // 停止当前请求
        }
      }
    }
  }
}

useAutoPlugin.onInit = (options) => {
  const { ready = true, manual = false} = options;
  return {
    loading: ready && !manual, // 初始状态为 ready 且 manual 为 false 时 loading 为 true
  };
}

export default useAutoPlugin;
```

# 依赖更新
+ <font style="color:rgb(69, 77, 100);">通过设置 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">options.refreshDeps</font>`<font style="color:rgb(69, 77, 100);">，在依赖变化时， </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">useRequest</font>`<font style="color:rgb(69, 77, 100);"> 会自动调用 </font>[<font style="color:rgb(69, 105, 212);">refresh</font>](https://ahooks.js.org/zh-CN/hooks/use-request/basic/#result)<font style="color:rgb(69, 77, 100);"> 方法，实现</font>[<font style="color:rgb(69, 105, 212);">刷新（重复上一次请求）</font>](https://ahooks.js.org/zh-CN/hooks/use-request/basic/#%E5%88%B7%E6%96%B0%E9%87%8D%E5%A4%8D%E4%B8%8A%E4%B8%80%E6%AC%A1%E8%AF%B7%E6%B1%82)<font style="color:rgb(69, 77, 100);">的效果。</font>

```jsx
import { useState } from 'react';
import { useRequest } from '../../ahooks';
// import { useRequest } from 'ahooks';
import axios from 'axios';

function Demo1() {
  const url = 'https://jsonplaceholder.typicode.com/users' // + (Math.random() > 0.5 ? '' : '1');
  // id 为 1 - 10 的随机数
  const getRandomId = () => Math.floor(Math.random() * 10 + 1);
  const DEFAULT_PARAMS = {id: getRandomId()}
  const [userId, setUserId] = useState(getRandomId());


  const getUsers = (params) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        axios.get(url, { params }).then(res => {
          console.log(res);
          resolve(res.data)
        }).catch(err => {
          reject(err)
        })
      }, 3000)
    })
  }
  
  const {
    data,
    error,
    loading,
    run,
    runAsync,
    refresh,
    refreshAsync,
  } = useRequest(getUsers, {
    refreshDeps: [userId],
    defaultParams: [DEFAULT_PARAMS],
    onBefore: (params) => {
      console.log('onBefore', params);
    },
    onSuccess: (result, params) => {
      console.log('onSuccess', result, params);  
    },
    onError: (err) => {
      console.log('onError', err);
    },
    onFinally: (params, result, error) => {
      console.log('onFinally', params, result, error);
    },
  }, []);

  const fetchRun = () => {
    run(DEFAULT_PARAMS)
  }

  const fetchRunAsync = () => {
    runAsync(DEFAULT_PARAMS).catch(err => {
      console.log('fetchRunAsync', err);
    })
  }

  const changeUserId = () => {
    setUserId(getRandomId())
  }

  return (
    <>
      <h2>Demo2</h2>
      <br />
      <div style={{display: 'flex', gap: 10}}>
        <button onClick={fetchRun}>run</button>
        <button onClick={fetchRunAsync }>runAsync</button>
        <button onClick={refresh} type="button">Refresh</button>
        <button onClick={refreshAsync} type="button">RefreshAsync</button>
        <button onClick={changeUserId} type="button">Change User Id</button>
      </div>
      <div>
        {
          loading ? <div>loading...</div> :
            error ? <div>error</div> :
              data?.map((item) => {
                return <div key={item.id}>{item.name}</div>;
              })
        }
      </div>
    </>
  );
}

export default Demo1;
```

## <font style="color:rgb(69, 77, 100);">ahooks</font>
### <font style="color:rgb(69, 77, 100);">useRequest</font>
#### <font style="color:rgb(69, 77, 100);">src</font>
##### <font style="color:rgb(69, 77, 100);">useRequestImplement.js</font>
```diff
import useLatest from '../../useLatest';
import useUpdate from '../../useUpdate';
import useCreation from '../../useCreation';
import useMount from '../../useMount';
import useMemoizedFn from '../../useMemoizedFn';
import Fetch from './Fetch';
import useUnmount from '../../useUnmount';

/**
 * useRequestImplement 函数
 * useRequest 的核心实现，负责创建和管理请求实例
 * @param {Function} service - 请求服务函数
 * @returns 请求状态对象
 */
function useRequestImplement(service, options, plugins) {
-  const { manual, ...rest } = options; // 解构 options 中的参数
+  const { manual = false, ...rest } = options; // 解构 options 中的参数
  const fetchOptions = { manual, ...rest }; // 创建 fetchOptions 对象
  const serviceRef = useLatest(service); // 保持 service 的最新引用
  const update = useUpdate(); // 触发组件更新的函数
  // 创建 Fetch 实例，使用 useCreation 确保实例稳定

  const fetchInstance = useCreation(() => {
    const initialStates = plugins.map(p => p?.onInit?.(fetchOptions))?.filter(Boolean); // 执行插件的 onInit 方法，获取初始状态
    return new Fetch(serviceRef, fetchOptions, update, Object.assign({}, ...initialStates));
  }, []);

  fetchInstance.options = fetchOptions; // 设置请求配置项
  fetchInstance.pluginImpls = plugins.map(p => p(fetchInstance, fetchOptions)); // 创建插件实例

  // 组件挂载时自动执行请求
  useMount(() => {
    if (!manual) {
      const params = fetchInstance.state.params || options.defaultParams || []; // 获取默认参数
      fetchInstance.run(...params);
    }
  });

  useUnmount(() => {
    fetchInstance.cancel();
  });
  
  // 返回请求状态（data、loading、error 等）
  const { state } = fetchInstance
  return {
    ...state,
    run: useMemoizedFn((...args) => fetchInstance.run(...args)),
    runAsync: useMemoizedFn((...args) => fetchInstance.runAsync(...args)),
    refresh: useMemoizedFn(() => fetchInstance.refresh()),
    refreshAsync: useMemoizedFn(() => fetchInstance.refreshAsync()),
    mutate: useMemoizedFn((data) => fetchInstance.mutate(data)),
    cancel: useMemoizedFn(() => fetchInstance.cancel()),
  }
}

export default useRequestImplement;
```

##### <font style="color:rgb(69, 77, 100);">plugins</font>
###### useAutoPlugin.js
```diff
import { useRef } from "react";
import useUpdateEffect from "../../../useUpdateEffect";

function useAutoPlugin(fetchInstance, options) {
+  const { ready = true, manual = false, defaultParams, refreshDeps = [], refreshDepsAction } = options
  const hasAutoRun = useRef(false);
+  hasAutoRun.current = false;

  useUpdateEffect(() => {
    // ready 为 true 且 manual 为 false 时，自动运行
    if (ready && !manual) {
      hasAutoRun.current = true;
      fetchInstance.run(...defaultParams);
    }
  }, [ready]);

+  useUpdateEffect(() => {
+    if (hasAutoRun.current) {
+      return;
+    }
+
+    if (!manual) {
+      hasAutoRun.current = true;
+      if (refreshDepsAction) {
+        refreshDepsAction();
+      } else {
+        fetchInstance.refresh();
+      }
+    }
+  }, [...refreshDeps])

  return {
    onBefore() {
      console.log('useAutoPlugin onBefore', ready)
      if (!ready) {
        return {
          stopNow: true // 停止当前请求
        }
      }
    }
  }
}

useAutoPlugin.onInit = (options) => {
  const { ready = true, manual = false} = options;
  return {
    loading: ready && !manual, // 初始状态为 ready 且 manual 为 false 时 loading 为 true
  };
}

export default useAutoPlugin;
```

# 屏幕聚焦重新请求
+ <font style="color:rgb(69, 77, 100);">通过设置 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">options.refreshOnWindowFocus</font>`<font style="color:rgb(69, 77, 100);">，在浏览器窗口 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">refocus</font>`<font style="color:rgb(69, 77, 100);"> 和 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">revisible</font>`<font style="color:rgb(69, 77, 100);"> 时，会重新发起请求。</font>

```jsx
import { useRequest } from '../../ahooks';
import axios from 'axios';

function Demo1() {
  const url = 'https://jsonplaceholder.typicode.com/users' // + (Math.random() > 0.5 ? '' : '1');
  // id 为 1 - 10 的随机数
  const getRandomId = () => Math.floor(Math.random() * 10 + 1);
  const DEFAULT_PARAMS = {id: getRandomId()}


  const getUsers = (params) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        axios.get(url, { params }).then(res => {
          console.log(res);
          resolve(res.data)
        }).catch(err => {
          reject(err)
        })
      }, 1000)
    })
  }
  
  const {
    data,
    error,
    loading,
  } = useRequest(getUsers, {
    refreshOnWindowFocus: true,
    focusTimespan: 10000,
    defaultParams: [DEFAULT_PARAMS],
    onBefore: (params) => {
      console.log('onBefore', params);
    },
    onSuccess: (result, params) => {
      console.log('onSuccess', result, params);  
    },
    onError: (err) => {
      console.log('onError', err);
    },
    onFinally: (params, result, error) => {
      console.log('onFinally', params, result, error);
    },
  }, []);


  return (
    <>
      <h2>Demo2</h2>
      <div>
        {
          loading ? <div>loading...</div> :
            error ? <div>error</div> :
              data?.map((item) => {
                return <div key={item.id}>{item.name}</div>;
              })
        }
      </div>
    </>
  );
}

export default Demo1;
```

## <font style="color:rgb(69, 77, 100);">ahooks</font>
### <font style="color:rgb(69, 77, 100);">useRequest</font>
#### <font style="color:rgb(69, 77, 100);">src</font>
##### <font style="color:rgb(69, 77, 100);">useRequest.js</font>
```diff
import useAutoPlugin from './plugins/useAutoPlugin';
import useLoadingDelayPlugin from './plugins/useLoadingDelayPlugin';
import usePollingPlugin from './plugins/usePollingPlugin';
+import useRefreshOnWindowFocus from './plugins/useRefreshOnWindowFocus';
// import useLoggerPlugin from './plugins/useLoggerPlugin';
import useRequestImplement from './useRequestImplement';

/**
 * useRequest hook
 * 用于处理异步请求的 React Hook
 * 提供请求状态管理、错误处理等功能
 * @param {Function} service - 请求服务函数
 * @param {Object} options - 配置选项（当前未使用）
 * @param {Array} plugins - 插件数组（当前未使用）
 * @returns 请求状态和方法
 */
function useRequest(service, options, plugins = []) {
  return useRequestImplement(service, options, [
    ...plugins, // 用户自定义插件
    // useLoggerPlugin, // 默认的日志插件
    useLoadingDelayPlugin,
    usePollingPlugin,
    useAutoPlugin,
+    useRefreshOnWindowFocus
  ])
}

export default useRequest
```

##### <font style="color:rgb(69, 77, 100);">plugins</font>
###### useRefreshOnWindowFocus.js
```javascript
import { useEffect, useRef } from "react";
import subscribeFocus from "../../../utils/subscribeFocus";
import useUnmount from "../../../useUnmount";
import limit from "../../../utils/limit";

function useRefreshOnWindowFocus(fetchInstance, options) {
  const { refreshOnWindowFocus, focusTimespan = 5000 } = options;

  const unsubscribeRef = useRef();
  const stopSubscribe = () => {
    unsubscribeRef.current?.();
  };

  useEffect(() => {
    if (refreshOnWindowFocus) {
      const limitRefresh = limit(fetchInstance.refresh.bind(fetchInstance), focusTimespan)
      unsubscribeRef.current = subscribeFocus(() => {
        limitRefresh();
      });
    }
    return stopSubscribe;
  }, [refreshOnWindowFocus, focusTimespan])

  useUnmount(stopSubscribe)

  return {}
}

export default useRefreshOnWindowFocus;
```

### <font style="color:rgb(69, 77, 100);">utils</font>
#### subscribeFocus.js
```javascript
import isDocumentVisible from "./isDocumentVisible";

const listeners = [];

function subscribe(listener) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    listeners.splice(index, 1);
  };
}

function revalidate() {
  if (!isDocumentVisible()) return;
  listeners.forEach((listener) => listener());
}

window.addEventListener("visibilitychange", revalidate);
window.addEventListener("focus", revalidate);

export default subscribe;
```

#### limit.js
```javascript
function limit(fn, timespan) {
  let pending = false;

  return (...args) => {
    if (pending) return;
    pending = true;
    fn(...args);
    setTimeout(() => {
      pending = false;
    }, timespan);
  };
}

export default limit;
```

# 防抖
+ <font style="color:rgb(69, 77, 100);">通过设置 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">options.debounceWait</font>`<font style="color:rgb(69, 77, 100);">，进入防抖模式，此时如果频繁触发 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">run</font>`<font style="color:rgb(69, 77, 100);"> 或者 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">runAsync</font>`<font style="color:rgb(69, 77, 100);">，则会以防抖策略进行请求。</font>

```jsx
import { useRequest } from '../../ahooks';
import axios from 'axios';

function Demo1() {
  const url = 'https://jsonplaceholder.typicode.com/users' // + (Math.random() > 0.5 ? '' : '1');
  // id 为 1 - 10 的随机数
  const getRandomId = () => Math.floor(Math.random() * 10 + 1);
  const DEFAULT_PARAMS = {id: getRandomId()}


  const getUsers = (params) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        axios.get(url, { params }).then(res => {
          console.log(res);
          resolve(res.data)
        }).catch(err => {
          reject(err)
        })
      }, 100)
    })
  }
  
  const {
    data,
    error,
    loading,
    run
  } = useRequest(getUsers, {
    debounceWait: 1000,
    manual: true,
    defaultParams: [DEFAULT_PARAMS]
  }, []);


  return (
    <>
      <h2>Demo2</h2>
      <div>
        <input type='text' placeholder='请输入id' onChange={(e) => run({id: e.target.value})} />
      </div>
      <div>
        {
          loading ? <div>loading...</div> :
            error ? <div>error</div> :
              data?.map((item) => {
                return <div key={item.id}>{item.name}</div>;
              })
        }
      </div>
    </>
  );
}

export default Demo1;
```

## <font style="color:rgb(69, 77, 100);">ahooks</font>
### <font style="color:rgb(69, 77, 100);">useRequest</font>
#### <font style="color:rgb(69, 77, 100);">src</font>
##### <font style="color:rgb(69, 77, 100);">useRequest.js</font>
```diff
import useAutoPlugin from './plugins/useAutoPlugin';
+import useDebouncePlugin from './plugins/useDebouncePlugin';
import useLoadingDelayPlugin from './plugins/useLoadingDelayPlugin';
import usePollingPlugin from './plugins/usePollingPlugin';
import useRefreshOnWindowFocus from './plugins/useRefreshOnWindowFocus';
// import useLoggerPlugin from './plugins/useLoggerPlugin';
import useRequestImplement from './useRequestImplement';

/**
 * useRequest hook
 * 用于处理异步请求的 React Hook
 * 提供请求状态管理、错误处理等功能
 * @param {Function} service - 请求服务函数
 * @param {Object} options - 配置选项（当前未使用）
 * @param {Array} plugins - 插件数组（当前未使用）
 * @returns 请求状态和方法
 */
function useRequest(service, options, plugins = []) {
  return useRequestImplement(service, options, [
    ...plugins, // 用户自定义插件
    // useLoggerPlugin, // 默认的日志插件
    useLoadingDelayPlugin,
    usePollingPlugin,
    useAutoPlugin,
    useRefreshOnWindowFocus,
+    useDebouncePlugin
  ])
}

export default useRequest
```

##### <font style="color:rgb(69, 77, 100);">plugins</font>
###### useDebouncePlugin.js
```javascript
import { useEffect, useRef } from "react";

function useDebouncePlugin(fetchInstance, options) {

  const { debounceWait = 500} = options;
  const debounceRef = useRef();

  useEffect(() => {
    if(debounceWait) {
      const originalRunAsync = fetchInstance.runAsync.bind(fetchInstance);
      debounceRef.current = dobounce(cb => cb(), debounceWait);
      fetchInstance.runAsync = (...args) => {
        return new Promise((resolve, reject) => {
          debounceRef.current?.(() => {
            originalRunAsync(...args).then(resolve).catch(reject);
          })
        })
      }
    }
  }, [debounceWait])

  return {}

}

function dobounce(fn, wait) {
  let timeout = null;
  return function(...args) {
    if(timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      fn.apply(this, args);
    }, wait);
  }
}

export default useDebouncePlugin;
```

# 节流
+ <font style="color:rgb(69, 77, 100);">通过设置 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">options.throttleWait</font>`<font style="color:rgb(69, 77, 100);">，进入节流模式，此时如果频繁触发 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">run</font>`<font style="color:rgb(69, 77, 100);"> 或者 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">runAsync</font>`<font style="color:rgb(69, 77, 100);">，则会以节流策略进行请求。</font>

```jsx
import { useRequest } from '../../ahooks';
import axios from 'axios';

function Demo1() {
  const url = 'https://jsonplaceholder.typicode.com/users' // + (Math.random() > 0.5 ? '' : '1');
  // id 为 1 - 10 的随机数
  const getRandomId = () => Math.floor(Math.random() * 10 + 1);
  const DEFAULT_PARAMS = {id: getRandomId()}


  const getUsers = (params) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        axios.get(url, { params }).then(res => {
          console.log(res);
          resolve(res.data)
        }).catch(err => {
          reject(err)
        })
      }, 100)
    })
  }
  
  const {
    data,
    error,
    loading,
    run
  } = useRequest(getUsers, {
    throttleWait: 3000,
    manual: true,
    defaultParams: [DEFAULT_PARAMS]
  }, []);


  return (
    <>
      <h2>Demo2</h2>
      <div>
        <input type='text' placeholder='请输入id' onChange={(e) => run({id: e.target.value})} />
      </div>
      <div>
        {
          loading ? <div>loading...</div> :
            error ? <div>error</div> :
              data?.map((item) => {
                return <div key={item.id}>{item.name}</div>;
              })
        }
      </div>
    </>
  );
}

export default Demo1;
```

## <font style="color:rgb(69, 77, 100);">ahooks</font>
### <font style="color:rgb(69, 77, 100);">useRequest</font>
#### <font style="color:rgb(69, 77, 100);">src</font>
##### <font style="color:rgb(69, 77, 100);">useRequest.js</font>
```diff
import useAutoPlugin from './plugins/useAutoPlugin';
import useDebouncePlugin from './plugins/useDebouncePlugin';
import useLoadingDelayPlugin from './plugins/useLoadingDelayPlugin';
import usePollingPlugin from './plugins/usePollingPlugin';
import useRefreshOnWindowFocus from './plugins/useRefreshOnWindowFocus';
+import useThrottlePlugin from './plugins/useThrottlePlugin';
// import useLoggerPlugin from './plugins/useLoggerPlugin';
import useRequestImplement from './useRequestImplement';

/**
 * useRequest hook
 * 用于处理异步请求的 React Hook
 * 提供请求状态管理、错误处理等功能
 * @param {Function} service - 请求服务函数
 * @param {Object} options - 配置选项（当前未使用）
 * @param {Array} plugins - 插件数组（当前未使用）
 * @returns 请求状态和方法
 */
function useRequest(service, options, plugins = []) {
  return useRequestImplement(service, options, [
    ...plugins, // 用户自定义插件
    // useLoggerPlugin, // 默认的日志插件
    useLoadingDelayPlugin,
    usePollingPlugin,
    useAutoPlugin,
    useRefreshOnWindowFocus,
    useDebouncePlugin,
+    useThrottlePlugin
  ])
}

export default useRequest
```

##### <font style="color:rgb(69, 77, 100);">plugins</font>
###### useThrottlePlugin.js
```javascript
import { useEffect, useRef } from "react";

function useThrottlePlugin(fetchInstance, options) { 
  const { throttleWait } = options;
  const throttleRef = useRef();
  useEffect(() => {
    if(throttleWait) {
      const originalRunAsync = fetchInstance.runAsync.bind(fetchInstance);
      throttleRef.current = throttle(cb => cb(), throttleWait);
      fetchInstance.runAsync = (...args) => {
        return new Promise((resolve, reject) => {
          throttleRef.current?.(() => {
            originalRunAsync(...args).then(resolve).catch(reject);
          })
        })
      }
    }

  }, [throttleWait]);

  return {}
}

function throttle(fn, wait) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime > wait) {
      fn.apply(this, args);
      lastTime = now;
    }
  }
}

export default useThrottlePlugin;
```

# 错误重试
+ <font style="color:rgb(69, 77, 100);">通过设置 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">options.retryCount</font>`<font style="color:rgb(69, 77, 100);">，指定错误重试次数，则 useRequest 在失败后会进行重试。</font>

```jsx
import { useRequest } from '../../ahooks';
import axios from 'axios';

function Demo1() {
  const url = 'https://jsonplaceholder.typicode.com/users1' // + (Math.random() > 0.5 ? '' : '1');
  // id 为 1 - 10 的随机数
  const getRandomId = () => Math.floor(Math.random() * 10 + 1);
  const DEFAULT_PARAMS = {id: getRandomId()}


  const getUsers = (params) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        axios.get(url, { params }).then(res => {
          console.log(res);
          resolve(res.data)
        }).catch(err => {
          reject(err)
        })
      }, 100)
    })
  }
  
  const {
    data,
    error,
    loading,
  } = useRequest(getUsers, {
    retryCount: 3,
    retryInterval: 1000,
    defaultParams: [DEFAULT_PARAMS]
  }, []);


  return (
    <>
      <h2>Demo2</h2>
      <div>
        {
          loading ? <div>loading...</div> :
            error ? <div>error</div> :
              data?.map((item) => {
                return <div key={item.id}>{item.name}</div>;
              })
        }
      </div>
    </>
  );
}

export default Demo1;
```

## <font style="color:rgb(69, 77, 100);">ahooks</font>
### <font style="color:rgb(69, 77, 100);">useRequest</font>
#### <font style="color:rgb(69, 77, 100);">src</font>
##### <font style="color:rgb(69, 77, 100);">useRequest.js</font>
```diff
import useAutoPlugin from './plugins/useAutoPlugin';
import useDebouncePlugin from './plugins/useDebouncePlugin';
import useLoadingDelayPlugin from './plugins/useLoadingDelayPlugin';
import usePollingPlugin from './plugins/usePollingPlugin';
import useRefreshOnWindowFocus from './plugins/useRefreshOnWindowFocus';
+import useRetryPlugin from './plugins/useRetryPlugin';
import useThrottlePlugin from './plugins/useThrottlePlugin';
// import useLoggerPlugin from './plugins/useLoggerPlugin';
import useRequestImplement from './useRequestImplement';

/**
 * useRequest hook
 * 用于处理异步请求的 React Hook
 * 提供请求状态管理、错误处理等功能
 * @param {Function} service - 请求服务函数
 * @param {Object} options - 配置选项（当前未使用）
 * @param {Array} plugins - 插件数组（当前未使用）
 * @returns 请求状态和方法
 */
function useRequest(service, options, plugins = []) {
  return useRequestImplement(service, options, [
    ...plugins, // 用户自定义插件
    // useLoggerPlugin, // 默认的日志插件
    useLoadingDelayPlugin,
    usePollingPlugin,
    useAutoPlugin,
    useRefreshOnWindowFocus,
    useDebouncePlugin,
    useThrottlePlugin,
+    useRetryPlugin
  ])
}

export default useRequest
```

##### <font style="color:rgb(69, 77, 100);">plugins</font>
###### useRetryPlugin.js
```javascript
import { useRef } from "react";

function useRetryPlugin(fetchInstance, options) {
  const { retryCount, retryInterval } = options;
  const timerRef = useRef(); // 定时器引用
  const countRef = useRef(); // 重试计数器引用
  const triggerByRetry = useRef(false); // 是否由重试触发的标志

  if (!retryCount) return {};

  function clearTimer() {
    if(timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  return {
    onBefore() {
      if(!triggerByRetry.current) {
        countRef.current = 0;
      }
      clearTimer();
    },
    onSuccess() {
      countRef.current = 0;
    },
    onError() {
      countRef.current += 1;
      if (countRef.current <= retryCount || retryCount === -1) {
        const timeout = retryInterval || Math.min(30000, 1000 * 2 ** countRef.current);
        timerRef.current = setTimeout(() => {
          triggerByRetry.current = true;
          fetchInstance.refresh();
        }, timeout);
      } else {
        clearTimer();
        countRef.current = 0;
      }
    },
    onCancel() {
      clearTimer();
      countRef.current = 0;
    }
  }
}

export default useRetryPlugin;
```

# 缓存
+ <font style="color:rgb(69, 77, 100);">如果设置了</font><font style="color:rgb(69, 77, 100);"> </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">options.cacheKey</font>`<font style="color:rgb(69, 77, 100);">，</font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">useRequest</font>`<font style="color:rgb(69, 77, 100);"> </font><font style="color:rgb(69, 77, 100);">会将当前请求成功的数据缓存起来。下次组件初始化时，如果有缓存数据，我们会优先返回缓存数据，然后在背后发送新请求，也就是 SWR 的能力。</font>
+ <font style="color:rgb(69, 77, 100);">你可以通过 </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">options.staleTime</font>`<font style="color:rgb(69, 77, 100);"> 设置数据保持新鲜时间，在该时间内，我们认为数据是新鲜的，不会重新发起请求。</font>
+ <font style="color:rgb(69, 77, 100);">你也可以通过</font><font style="color:rgb(69, 77, 100);"> </font>`<font style="color:rgb(213, 97, 97);background-color:rgb(246, 247, 249);">options.cacheTime</font>`<font style="color:rgb(69, 77, 100);"> </font><font style="color:rgb(69, 77, 100);">设置数据缓存时间，超过该时间，我们会清空该条缓存数据。</font>
+ <font style="color:rgb(69, 77, 100);">接下来通过几个例子来体验缓存这些功能。</font>
    - <font style="color:rgb(69, 77, 100);">SWR</font>
    - 数据保持新鲜
    - 数据共享
    - 参数缓存
    - 删除缓存
    - 自定义缓存

```jsx
import { useState } from 'react';
import { useRequest, clearCache } from '../../ahooks';
import axios from 'axios';

function User() {
  const url = 'https://jsonplaceholder.typicode.com/users' // + (Math.random() > 0.5 ? '' : '1');
  // id 为 1 - 10 的随机数
  const getRandomId = () => Math.floor(Math.random() * 10 + 1);
  const DEFAULT_PARAMS = {id: getRandomId()}

  const getUsers = (params) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        axios.get(url, { params }).then(res => {
          console.log(res);
          resolve(res.data)
        }).catch(err => {
          reject(err)
        })
      }, 2000)
    })
  }
  
  const {
    data,
    error,
    loading,
    params,
    run
  } = useRequest(getUsers, {
    cacheKey: 'cacheKey-demo',
    staleTime: 5000,
    setCache(data) {
      localStorage.setItem('cacheKey-demo', JSON.stringify(data || '{}'))
    },
    getCache() {
      return JSON.parse(localStorage.getItem('cacheKey-demo'))
    },
    manual: true,
    defaultParams: [DEFAULT_PARAMS]
  }, []);

  const [keyword, setKeyword] = useState(params?.[0]?.id || '');
  console.log('params', params, params?.[0]?.id);

  return (
    <>
      <h2>Demo2</h2>
      <div>
        <input value={keyword} onChange={e => setKeyword(e.target.value)}/>
        <button onClick={() => run({id: keyword})}>run</button>
        <button onClick={() => clearCache('cacheKey-demo')}>clearCache</button>
      </div>
      <div>
        {
          (loading && !data) ? <div>loading...</div> :
            error ? <div>error</div> :
              data?.map((item) => {
                return <div key={item.id}>{item.name}</div>;
              })
        }
      </div>
    </>
  );
}

const Demo2 = () => {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setVisible(!visible)}>
        {visible ? 'hide' : 'show'}
      </button>
      {visible && <User />}
    </div>
  );
};

export default Demo2;
```

## <font style="color:rgb(69, 77, 100);">ahooks</font>
### <font style="color:rgb(69, 77, 100);">useRequest</font>
#### <font style="color:rgb(69, 77, 100);">src</font>
##### <font style="color:rgb(69, 77, 100);">useRequest.js</font>
```diff
import useAutoPlugin from './plugins/useAutoPlugin';
+import useCachePlugin from './plugins/useCachePlugin';
import useDebouncePlugin from './plugins/useDebouncePlugin';
import useLoadingDelayPlugin from './plugins/useLoadingDelayPlugin';
import usePollingPlugin from './plugins/usePollingPlugin';
import useRefreshOnWindowFocus from './plugins/useRefreshOnWindowFocus';
import useRetryPlugin from './plugins/useRetryPlugin';
import useThrottlePlugin from './plugins/useThrottlePlugin';
// import useLoggerPlugin from './plugins/useLoggerPlugin';
import useRequestImplement from './useRequestImplement';

/**
 * useRequest hook
 * 用于处理异步请求的 React Hook
 * 提供请求状态管理、错误处理等功能
 * @param {Function} service - 请求服务函数
 * @param {Object} options - 配置选项（当前未使用）
 * @param {Array} plugins - 插件数组（当前未使用）
 * @returns 请求状态和方法
 */
function useRequest(service, options, plugins = []) {
  return useRequestImplement(service, options, [
    ...plugins, // 用户自定义插件
    // useLoggerPlugin, // 默认的日志插件
    useLoadingDelayPlugin,
    usePollingPlugin,
    useAutoPlugin,
    useRefreshOnWindowFocus,
    useDebouncePlugin,
    useThrottlePlugin,
    useRetryPlugin,
+    useCachePlugin
  ])
}

export default useRequest
```

##### Fetch.js
```diff
/**
 * Fetch 类
 * 负责管理异步请求的状态和执行
 * 包含请求的数据、加载状态、错误信息等
 */
class Fetch {
  constructor(service, options, subscribe, initialState = {}) {
    this.service = service; // 请求服务函数
    this.options = options; // 请求配置项
    this.subscribe = subscribe; // 触发组件重新渲染的回调函数
    this.state = { data: null, loading: !options.manual, error: null, params: null, ...initialState }; // 初始状态
    this.count = 0; // 请求计数器
  }

  /**
   * 更新状态并触发组件重新渲染
   * @param {Object} state - 要更新的状态对象
   */
  setState(state = {}) {
    this.state = { ...this.state, ...state };
    this.subscribe(); // 通知组件更新
  }

  /**
   * 同步执行请求（不等待结果）
   */
  run(...params) {
    this.runAsync(...params).catch(error => {
      if(!this.options.onError) {
        console.error(error);
      }
    })
  }

  /**
   * 异步执行请求
   * 处理请求的加载状态、数据和错误
   */
  async runAsync(...params) {
    this.count += 1;
    const currentCount = this.count;
    try {
+      const { stopNow, returnNow, ...state } = this.runPluginHandler('onBefore', params); // 调用插件的 onBefore 方法

      if (stopNow) {
        return new Promise(() => {}); // 忽略掉当前请求
      }
-      this.options?.onBefore?.(params); // 处理请求开始前的操作
      this.setState({ loading: true, params, ...state });

+      // 保鲜期内忽略掉当前请求
+      if(returnNow) {
+        return new Promise(() => {});
+      }

+      this.options?.onBefore?.(params); // 处理请求开始前的操作

      // 调用插件的 onRequest 方法，获取新的 servicePromise
      let { servicePromise } = this.runPluginHandler('onRequest', this.service.current, params);
      if (!servicePromise) {
        servicePromise = this.service.current(...params);
      }
      const data = await servicePromise;

      if (currentCount !== this.count) {
        return new Promise(() => {}); // 忽略掉旧请求
      }
      this.setState({ data, loading: false, error: null, params });
      this.options?.onSuccess?.(data, params); // 处理请求成功后的操作
      this.runPluginHandler('onSuccess', data, params); // 调用插件的 onSuccess 方法
      this.options?.onFinally?.(params, data); // 处理请求结束的回调

      if(currentCount === this.count) {
        this.runPluginHandler('onFinally', params, data, null); // 调用插件的 onFinally 方法
      }
    } catch (error) {
      if (currentCount !== this.count) {
        return new Promise(() => {}); // 忽略掉旧请求
      }
      this.setState({ error, loading: false, data: null, params });
      this.options?.onError?.(error); // 处理错误
      this.runPluginHandler('onError', error); // 调用插件的 onError 方法
      this.options?.onFinally?.(params, null, error); // 处理请求结束的回调

      if(currentCount === this.count) {
        this.runPluginHandler('onFinally', params, null, error); // 调用插件的 onFinally 方法
      }
      throw error; // 抛出错误，以便上层处理
    }
  }

  refresh() {
    this.run(...(this.state.params || []));
  }

  refreshAsync() {
    this.runAsync(...(this.state.params || []));
  }

  mutate(data) {
    this.runPluginHandler('onMutate', data); // 
    this.setState({ data });
  }

  cancel() {
    this.count += 1; // 添加 count，用于取消当前请求
    this.setState({ loading: false });
    this.options?.onCancel?.(); // 处理请求取消的回调
    this.runPluginHandler('onCancel'); // 调用插件的 onCancel 方法
  }

  runPluginHandler(event, ...rest) {
    const r = this.pluginImpls.map(i => i[event]?.(...rest)).filter(Boolean);
    return Object.assign({}, ...r);
  }
}

export default Fetch;
```

##### <font style="color:rgb(69, 77, 100);">plugins</font>
###### useCachePlugin.js
```javascript
import { useRef } from 'react';
import useCreation from '../../../useCreation';
import * as cache from '../../../utils/cache';
import * as cachePromise from '../../../utils/cachePromise';
import * as cacheSubscribe from '../../../utils/cacheSubscribe';

function useCachePlugin(fetchInstance, options) {
  const { cacheKey, staleTime = 0, setCache: customSetCache, getCache: customGetCache } = options;

  const currentPromiseRef = useRef();
  const unSubscribeRef = useRef();

  const _setCache = (key, cacheData) => {
    if(customSetCache) {
      customSetCache(cacheData);
    } else {
      cache.setCache(key, cacheData);
    }
    cacheSubscribe.trigger(key, cacheData.data);
  }
  const _getCache = (key) => {
    if (customGetCache) {
      return customGetCache(key);
    }
    return cache.getCache(key);
  }

  useCreation(() => {
    if(!cacheKey) {
      return {}
    }
    const cacheData = _getCache(cacheKey);
    if(cacheData && Object.hasOwnProperty.call(cacheData, 'data')){
      fetchInstance.state.data = cacheData.data;
      fetchInstance.state.params = cacheData.params;
      if(staleTime === -1 || new Date().getTime() - cacheData.time < staleTime) {
        fetchInstance.state.loading = false;
      }
    }
  })

  if(!cacheKey) {
    return {}
  }

  return {
    onBefore() {
      const cacheData = _getCache(cacheKey);
      if(!cacheData || !Object.hasOwnProperty.call(cacheData, 'data')) {
        return {}
      }
      // 如果 staleTime 为 -1 表示永不过期，或者 当前时间减去缓存时间小于 staleTime 表示在保鲜期内
      if(staleTime === -1 || new Date().getTime() - cacheData.time < staleTime) {
        return {
          data: cacheData.data,
          loading: false,
          returnNow: true
        }
      } else {
        return {
          data: cacheData.data
        }
      }
    },
    onRequest(service, params) {
      let servicePromise = cachePromise.getCachePromise(cacheKey);

      if (servicePromise && servicePromise !== currentPromiseRef.current) {
        return {
          servicePromise
        }
      }

      servicePromise = service(...params);
      currentPromiseRef.current = servicePromise;
      cachePromise.setCachePromise(cacheKey, servicePromise);
      return {
        servicePromise
      }
    },
    onSuccess(data, params) {
      if(cacheKey) {
        _setCache(cacheKey, { data, params, time: new Date().getTime() });
        unSubscribeRef.current = cacheSubscribe.subscribe(cacheKey, (d) => {
          fetchInstance.setState({data: d})
        });
      }
    }
  }
}

export default useCachePlugin;
```

### utils
#### cache.js
```javascript
const cache = new Map();

const setCache = (key, value) => {
  cache.set(key, value);
};

const getCache = (key) => {
  return cache.get(key);
};

const clearCache = (keys) => {
  if (keys) {
    const cacheKeys = Array.isArray(keys) ? keys : [keys];
    cacheKeys.forEach(key => cache.delete(key));
  } else {
    cache.clear();
  }
}

export {
  setCache,
  getCache,
  clearCache
}
```

#### cachePromise.js
```javascript
const cachePromise = new Map();

export function getCachePromise(key) {
  return cachePromise.get(key);
}

export function setCachePromise(key, promise) {
  cachePromise.set(key, promise);
  promise.finally(() => {
    cachePromise.delete(key);
  });
}
```

#### cacheSubscribe.js
```javascript
const listens = {};

export function subscribe(key, listener) {
  if (!listens[key]) {
    listens[key] = [];
  }
  listens[key].push(listener);

  return () => {
    listens[key] = listens[key].filter((l) => l !== listener);
  }
} 

export function trigger(key, data) {
  if (listens[key]) {
    listens[key].forEach((l) => l(data));
  }
}
```

### index.js
```diff
// ahooks 库的主入口文件
// 导出所有可用的 hooks 供外部使用
+export { clearCache } from './utils/cache';
export { useRequest } from './useRequest'
```

