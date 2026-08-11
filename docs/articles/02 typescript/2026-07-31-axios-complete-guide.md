# Axios 完全指南：从基础使用到源码原理，面试官最爱考的都在这里

> 面试官微笑着说："你平时用 Axios 对吧？那请说说拦截器的执行顺序，顺便讲讲源码怎么实现的。"——90% 的人在这里支吾了。今天从用法到源码，彻底把 Axios 讲清楚。

---

## 🎯 这篇文章解决什么问题

三件事：把 Axios 每个核心 API 讲清楚；拆开源码，搞懂拦截器链、配置合并、任务取消背后的设计思路；每个知识点配上面试答法，看完直接能用。

适合：在 React / Vue 项目中天天用 Axios，但被追问"原理"就说不清楚的你。

---

## 🚀 基础使用：GET / POST / 错误处理

### GET 请求

`params` 自动序列化为 URL 查询字符串，无需手动拼接：

```typescript
const res = await axios.get('/api/drugs', {
  params: { page: 1, category: '解热镇痛' }
})
// 等价于 /api/drugs?page=1&category=解热镇痛
console.log(res.data)
```

### POST 请求

Axios 默认 JSON 序列化 body，并自动设置 `Content-Type: application/json`：

```typescript
const res = await axios.post('/api/prescriptions', {
  patientId: 'P001',
  drugs: [{ id: 'D001', dosage: '10mg' }]
})
```

这是和 `fetch` 最直观的差异——fetch 需要手动 `JSON.stringify` 加 header。

### 错误处理：三种场景必须区分

Axios 对 4xx/5xx 自动抛错，但错误类型需要分辨：

```typescript
try {
  await http.get('/api/drugs/D999')
} catch (error) {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      // 服务器有响应，处理 4xx/5xx 业务错误
      console.error('状态码:', error.response.status)
    } else if (error.request) {
      // 请求发出但无响应（超时 / 断网）
      message.error('网络连接失败')
    } else {
      // 配置错误，请求根本没发出去
      console.error('配置错误:', error.message)
    }
  }
}
```

**`axios.isAxiosError` 是类型守卫**，让 TypeScript 允许访问 `.response`、`.config` 属性。用 `instanceof AxiosError` 在跨模块场景可能失效，`isAxiosError` 检查 `error.isAxiosError === true` 标记更安全。

> 💬 **面试官**：Axios 和 fetch 有什么区别？
>
> ✅ 标准答案：Axios 自动序列化 JSON、响应自动解包 `.data`、4xx/5xx 自动抛错、有内置拦截器；fetch 不自动序列化，4xx/5xx 不抛错需手动判断 `response.ok`，无拦截器需自己封装。
> 🎁 加分答案：Axios 底层在浏览器用 XHR，Node.js 用 http 模块；XHR 支持 `onUploadProgress` 监听上传进度，这是 fetch 做不到的天然优势。

---

## 🔗 拦截器：职责链模式

拦截器是 Axios 最核心的设计，面试频率最高。

Axios 内部把请求拦截器、实际请求函数、响应拦截器组合成一条 **Promise 链**顺序执行。

### 请求拦截器

统一注入 token，所有请求自动携带认证信息：

```typescript
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config // 👈 必须返回 config
  },
  (error) => Promise.reject(error)
)
```

### 响应拦截器

统一处理错误码，避免每个请求重复写 catch：

```typescript
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) router.push('/login')
    if (error.response?.status === 403) message.error('没有操作权限')
    return Promise.reject(error)
  }
)
```

**执行顺序要记清楚：** 请求拦截器**后添加先执行**（栈/LIFO），响应拦截器**先添加先执行**（队列/FIFO）。

> 💬 **面试官**：Axios 拦截器的执行原理是什么？
>
> ✅ 标准答案：Axios 内部有个 `chain` 数组，初始值是 `[dispatchRequest, undefined]`。请求拦截器用 `unshift` 插入头部，响应拦截器用 `push` 追加尾部，while 循环两两取出组成 Promise 链依次执行。
> 🎁 加分答案：这是**职责链模式**。`unshift` 导致请求拦截器后注册先执行；`push` 导致响应拦截器先注册先执行。理解这个顺序对调试多拦截器场景很关键。

🔧 **真实场景**：药品电商所有 API 需要 token 和设备指纹。用请求拦截器统一注入，比每个接口手动加 header 减少了几百行重复代码。

---

## ⚙️ 配置合并与数据转换

### 三层配置优先级

优先级从低到高：内置默认值 → `axios.create()` 实例配置 → 每次请求级配置。

```typescript
const http = axios.create({
  baseURL: 'https://api.medai.com',
  timeout: 10_000  // 实例级，默认超时 10s
})

// 这一次请求单独设超时 30s，只对这次生效
http.get('/report/generate', { timeout: 30_000 })
```

**headers 合并有特殊规则：** `headers.common` 对所有方法生效，`headers.post` 只对 POST 生效，最终深度合并而非覆盖。

### 数据转换

`transformRequest` / `transformResponse` 在发送前、接收后统一处理数据格式：

```typescript
const http = axios.create({
  transformRequest: [(data) => JSON.stringify(camelToSnake(data))], // 发送前转下划线
  transformResponse: [(data) => snakeToCamel(JSON.parse(data))]    // 接收后转驼峰
})
```

注意这里是数组，支持多个 transform 函数**串联**（管道模式）。

**transform 和拦截器的区别：** transform 只处理 `data` 字段的格式变换（序列化/反序列化）；拦截器处理完整的 config/response 对象，可以修改 headers、取消请求、做统一错误处理，职责更广。

> 💬 **面试官**：Axios 的配置合并策略是什么？
>
> ✅ 标准答案：三层优先级，请求配置 > 实例配置 > 默认配置。headers 走深度合并，其他字段直接覆盖。
> 🎁 加分答案：源码用 `mergeConfig` 函数实现，对不同字段用不同策略：headers 递归合并，`data`/`params` 只取右侧值，函数类型字段也只取右侧。

---

## ❌ 任务取消

Axios 支持两种取消方式：老版 `CancelToken`（已废弃）和新版 `AbortController`（推荐，Web 标准）。

### React 中防内存泄漏

组件卸载时如果请求还没回来，会尝试更新已卸载组件的 state：

```typescript
useEffect(() => {
  const controller = new AbortController()

  http.get('/drugs', { signal: controller.signal })
    .then(res => setDrugs(res.data.data))
    .catch(err => {
      if (axios.isCancel(err)) return // 👈 忽略主动取消的错误
      setError(err.message)
    })

  return () => controller.abort() // 👈 组件卸载时取消
}, [])
```

### Vue 中防竞态条件

用户快速切换筛选项时，旧请求可能比新请求晚返回，导致数据错乱：

```typescript
let controller: AbortController | null = null

const searchDrugs = async (keyword: string) => {
  controller?.abort() // 👈 取消上一次未完成的请求
  controller = new AbortController()

  const res = await http.get('/drugs/search', {
    params: { keyword },
    signal: controller.signal
  })
  drugList.value = res.data.data
}
```

> 💬 **面试官**：为什么要取消 HTTP 请求？说个实际场景。
>
> ✅ 标准答案：1）组件卸载时请求未完成，不取消会尝试更新已销毁组件造成内存泄漏；2）用户频繁操作（搜索输入、快速翻页），旧请求数据会覆盖新结果，造成竞态。
> 🎁 加分答案：`axios.isCancel(error)` 区分主动取消和真实网络错误，前者不该展示错误提示；`AbortController` 是 Web 标准，`controller.signal.aborted` 随时可查询取消状态。

---

## ⏱ 请求防抖与重复控制

控制请求频率有两种思路，解决的是不同场景的问题：

| 方案 | 核心机制 | 适合场景 |
|------|---------|---------|
| 定时器防抖 | setTimeout 延迟 + AbortController 中断 | 搜索框联想词，用户停止输入后才发请求 |
| CancelToken 取消重复 | Map 记录请求 key + CancelToken 取消重复 | 快速重复点击提交按钮，同参数请求防重 |

两者不互斥，实际项目往往都要加。

### 方案一：定时器防抖（搜索联想词）

**防抖只防多发，不防乱序。** 如果 300ms 后的请求响应很慢，新旧数据仍可能乱序——所以推荐防抖 + AbortController 双保险：

```typescript
let controller: AbortController | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const searchDrugs = (keyword: string) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  controller?.abort()                          // 👈 立即取消进行中的旧请求
  controller = new AbortController()
  debounceTimer = setTimeout(async () => {
    const res = await http.get('/drugs/search', {
      params: { keyword }, signal: controller!.signal
    })
    drugList.value = res.data.data
  }, 300)
}
```

Vue 项目可以用 VueUse 的 `watchDebounced`，声明式防抖：

```typescript
import { watchDebounced } from '@vueuse/core'
const keyword = ref('')
let controller: AbortController | null = null

watchDebounced(keyword, async (val) => {
  controller?.abort()
  controller = new AbortController()
  const res = await http.get('/drugs/search', {
    params: { keyword: val }, signal: controller.signal
  })
  drugList.value = res.data.data
}, { debounce: 300 })
```

> 💬 **面试官**：搜索框实时搜索你怎么做的？
>
> ✅ 标准答案：防抖 + AbortController 双层保护。防抖限制频率，AbortController 取消进行中的旧请求防数据乱序。
> 🎁 加分答案：防抖只防多发不防乱序；AbortController 只防乱序不防多发。两者职责不同，缺一不可。Vue 用 watchDebounced 省去手写定时器。

🔧 **真实场景**：药品搜索页输入「阿莫西林」触发 5 次请求。不加防抖时后端被打崩过一次；加了 300ms 防抖后只发 1 次；再加 AbortController，数据永远是最新结果。

### 方案二：CancelToken 取消重复请求（防重复提交）

> 💡 **重要认知**：Axios CancelToken 取消的是**前端接收**，不是阻止请求到达服务器。连续点 5 次提交，后端仍会收到 5 次请求——真正的防重复提交还需要按钮 loading 态或后端幂等控制。

核心思路：用 `url + method + params + data` 拼出唯一 key，存入 Map。下次相同请求来时，先取消上一次（或取消这次），再更新 Map。

**取消哪一次？** 两种策略：
- 取消前一次：新请求总能发出，数据更新；但 network 会看到 canceled 记录，用户有感知
- **取消第二次（推荐）**：第一次请求完成前阻挡后来的，用户无感知；`removeRequestKey` 加 200ms 延迟防止第一次成功后第二次立刻放行

> 💬 **面试官**：用户快速重复点击提交怎么处理？
>
> ✅ 标准答案：在 Axios 请求拦截器里，用 url+method+params+data 生成 key，Map 记录每个请求的 CancelToken。重复请求来时取消第二次（推荐），响应后从 Map 删除 key。
> 🎁 加分答案：CancelToken 只取消前端接收，后端仍会执行。真正防重还需要按钮 loading 禁用 + 后端幂等校验（如插入去重索引）。

### 完整代码

**方案一：React `useDebounceSearch` Hook**

```typescript
function useDebounceSearch<T>(fetcher: (q: string) => Promise<T>, delay = 300) {
  const [data, setData] = useState<T | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const search = useCallback((query: string) => {
    clearTimeout(timerRef.current)
    controllerRef.current?.abort()
    controllerRef.current = new AbortController()
    timerRef.current = setTimeout(async () => {
      try {
        setData(await fetcher(query))
      } catch (e) {
        if (!axios.isCancel(e)) throw e // 👈 忽略主动取消，不展示错误提示
      }
    }, delay)
  }, [fetcher, delay])

  useEffect(() => () => { controllerRef.current?.abort() }, [])
  return { data, search }
}
```

**方案二：CancelRequest 类（取消第二次，推荐）**

```typescript
import qs from 'qs'

export default class CancelRequest {
  private pendingRequest: Map<string, any>
  constructor() {
    this.pendingRequest = new Map()
  }
  geterateReqKey(config: any) {
    const { url, method, params, data } = config ?? {}
    return [url, method?.toLocaleUpperCase(), qs.stringify(params), qs.stringify(data)].join('&')
  }
  checkoutPendingRequest(config: any, CancelToken: any) {
    let source = config.cancelToken ? config.source : CancelToken.source()
    if (!config.cancelToken) config.cancelToken = source.token
    const requestKey = this.geterateReqKey(config)
    if (this.pendingRequest.has(requestKey)) {
      source.cancel('double request: ' + requestKey) // 👈 取消第二次请求
    } else {
      this.pendingRequest.set(requestKey, source)
    }
  }
  removeRequestKey(config: any) {
    setTimeout(() => { // 👈 延迟 200ms，防止第一次成功后立刻放行第二次
      this.pendingRequest.delete(this.geterateReqKey(config))
    }, 200)
  }
}
```

接入 Axios 拦截器：

```typescript
import axios from 'axios'
import CancelRequest from './CancelRequest'

const cancelRequest = new CancelRequest()
const instance = axios.create({ /* ... */ })

instance.interceptors.request.use((config: any) => {
  cancelRequest.checkoutPendingRequest(config, axios.CancelToken)
  return config
})
instance.interceptors.response.use(
  (res: any) => { cancelRequest.removeRequestKey(res.config); return res.data },
  (err: any) => { cancelRequest.removeRequestKey(err.config || {}); return Promise.reject(err) }
)
export default instance
```

---

## 📦 TypeScript 最佳实践

### 基础封装：泛型约束响应类型

定义统一响应结构，封装泛型请求方法：

```typescript
interface ApiResponse<T = unknown> {
  code: number; message: string; data: T
}

async function get<T>(url: string, params?: Record<string, unknown>) {
  const res = await http.get<ApiResponse<T>>(url, { params })
  return res.data.data // 直接返回业务数据，类型为 T
}

// 调用时有完整类型推断
interface Drug { id: string; name: string; price: number }
const drugs = await get<Drug[]>('/drugs') // drugs: Drug[]
```

### 企业级封装：三层拦截器架构

基础封装适合中小项目。企业项目需要更完整的能力：
- **三层拦截器**：接口级 / 实例级 / 全局级，各自独立，互不干扰
- **统一取消管理**：`cancelRequestSourceList` 记录每个请求的取消方法，支持按 URL 精准取消或一键全取消
- **进度条集成**：NProgress 自动 start/done，业务方无感知
- **上传下载支持**：multipart、iframe 下载开箱即用

三层拦截器执行顺序：

**请求阶段**：接口级 → 实例级 → 全局（后注册先执行）

**响应阶段**：全局 → 实例级 → 接口级（先注册先执行）

> 💬 **面试官**：你们项目的 Axios 是怎么封装的？
>
> ✅ 标准答案：封装了 Request 类，支持三层拦截器（全局/实例/接口），维护 cancelRequestSourceList 和 requestUrlList 管理请求，CancelToken 实现精准取消，集成 NProgress 做全局进度条。
> 🎁 加分答案：统一入口函数对 GET/POST 做了抽象——调用方都用 `data` 传参，内部判断 method 后把 GET 请求的 data 搬到 params，消除了调用方的心智负担。

### 企业级完整代码

**`request/types.ts`** — 扩展类型定义：

```typescript
import type { AxiosRequestConfig, AxiosResponse } from 'axios'

export interface RequestInterceptors<T> {
  requestInterceptors?: (config: AxiosRequestConfig) => AxiosRequestConfig
  requestInterceptorsCatch?: (err: any) => any
  responseInterceptors?: (config: T) => T
  responseInterceptorsCatch?: (err: any) => any
}
export interface RequestConfig<T = AxiosResponse> extends AxiosRequestConfig {
  interceptors?: RequestInterceptors<T>
}
export interface CancelRequestSource {
  [index: string]: () => void
}
```

**`request/index.ts`** — Request 类，三层拦截器 + 统一取消管理：

```typescript
import axios, { AxiosResponse } from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import type { RequestConfig, RequestInterceptors, CancelRequestSource } from './types'
import NProgress from 'nprogress'

class Request {
  instance: AxiosInstance
  interceptorsObj?: RequestInterceptors<AxiosResponse>
  cancelRequestSourceList?: CancelRequestSource[]
  requestUrlList?: string[]

  constructor(config: RequestConfig) {
    this.requestUrlList = []
    this.cancelRequestSourceList = []
    this.instance = axios.create(config)
    this.interceptorsObj = config.interceptors
    // 拦截器执行顺序：接口请求 -> 实例请求 -> 全局请求 -> 实例响应 -> 全局响应 -> 接口响应
    this.instance.interceptors.request.use(
      (res: AxiosRequestConfig) => {
        console.log('全局请求拦截')
        return res
      },
      (err: any) => err,
    )
    // 使用实例拦截器
    this.instance.interceptors.request.use(
      this.interceptorsObj?.requestInterceptors,
      this.interceptorsObj?.requestInterceptorsCatch,
    )
    this.instance.interceptors.response.use(
      this.interceptorsObj?.responseInterceptors,
      this.interceptorsObj?.responseInterceptorsCatch,
    )
    // 全局响应拦截器保证最后执行，直接返回 res.data
    this.instance.interceptors.response.use(
      (res: AxiosResponse) => {
        console.log('全局响应拦截')
        return res.data
      },
      (err: any) => err,
    )
  }

  private getSourceIndex(url: string): number {
    return this.cancelRequestSourceList?.findIndex(
      (item: CancelRequestSource) => Object.keys(item)[0] === url
    ) as number
  }

  private delUrl(url: string) {
    const urlIndex = this.requestUrlList?.findIndex((u) => u === url)
    const sourceIndex = this.getSourceIndex(url)
    urlIndex !== -1 && this.requestUrlList?.splice(urlIndex as number, 1)
    sourceIndex !== -1 && this.cancelRequestSourceList?.splice(sourceIndex as number, 1)
  }

  request<T>(config: RequestConfig<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      NProgress.start()
      if (config.interceptors?.requestInterceptors) {
        config = config.interceptors.requestInterceptors(config)
      }
      const url = config.url
      if (url) {
        this.requestUrlList?.push(url)
        config.cancelToken = new axios.CancelToken((c) => {
          this.cancelRequestSourceList?.push({ [url]: c })
        })
      }
      this.instance
        .request<any, T>(config)
        .then((res) => {
          if (config.interceptors?.responseInterceptors) {
            res = config.interceptors.responseInterceptors(res)
          }
          resolve(res)
        })
        .catch((err: any) => reject(err))
        .finally(() => {
          NProgress.done()
          url && this.delUrl(url)
        })
    })
  }

  upload(url: string, data: File) {
    return new Promise((resolve, reject) => {
      NProgress.start()
      this.request({ url, method: 'POST', data, headers: { 'Content-Type': 'multipart/form-data' } })
        .then((res: any) => { NProgress.done(); resolve(res.data) })
        .catch((err) => { NProgress.done(); reject(err.data) })
    })
  }

  download(url: string) {
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = url
    iframe.onload = function () { document.body.removeChild(iframe) }
    document.body.appendChild(iframe)
  }

  cancelRequest(url: string | string[]) {
    if (typeof url === 'string') {
      const sourceIndex = this.getSourceIndex(url)
      sourceIndex >= 0 && this.cancelRequestSourceList?.[sourceIndex][url]()
    } else {
      url.forEach((u) => {
        const sourceIndex = this.getSourceIndex(u)
        sourceIndex >= 0 && this.cancelRequestSourceList?.[sourceIndex][u]()
      })
    }
  }

  cancelAllRequest() {
    this.cancelRequestSourceList?.forEach((source) => {
      const key = Object.keys(source)[0]
      source[key]()
    })
  }
}

export default Request
export type { RequestConfig, RequestInterceptors }
```

**`index.ts`** — 业务层统一入口，创建实例 + 注册实例级拦截器：

```typescript
import Request from './request'
import { AxiosResponse } from 'axios'
import type { RequestConfig } from './request/types'

interface IResponse<T> {
  statusCode: number
  desc: string
  result: T
}
interface IRequest<T> extends RequestConfig<IResponse<any>> {
  data?: T
}

const request = new Request({
  baseURL: import.meta.env.VITE_API_HOST,
  timeout: 1000 * 60 * 5,
  interceptors: {
    requestInterceptors: (config) => {
      console.log('实例请求拦截')
      return config
    },
    responseInterceptors: (result: AxiosResponse) => {
      console.log('实例响应拦截')
      return result
    },
  },
})

const req = <D = any, T = any>(config: IRequest<D>) => {
  const { method = 'GET' } = config
  if (method === 'get' || method === 'GET') {
    config.params = config.data // 👈 统一用 data 传参，GET 时自动搬到 params
    Reflect.deleteProperty(config, 'data')
  }
  return request.request<IResponse<T>>(config)
}

export const upload = (url: string, data: File) => request.upload(url, data)
export const download = (url: string) => request.download(url)
export const cancelRequest = (url: string | string[]) => request.cancelRequest(url)
export const cancelAllRequest = () => request.cancelAllRequest()
export default req
```

---

## 🔬 源码解析：手写简版 Axios

理解 Axios 的核心只需要搞懂五个文件：**类型定义、拦截器管理器、核心 Axios 类、取消模块、入口工厂函数**。

### 拦截器链的组装方式

这是整个 Axios 最精妙的部分——用一个 `chain` 数组把所有节点串成 Promise 链：

```typescript
const chain = [{ onFulfilled: this.dispatchRequest, onRejected: e => e }]
// 请求拦截器：unshift 插头部 → 后注册先执行
this.interceptors.request.interceptors.forEach(i => { i && chain.unshift(i) })
// 响应拦截器：push 追尾部 → 先注册先执行
this.interceptors.response.interceptors.forEach(i => { i && chain.push(i) })
// while 循环两两取出，串成 Promise 链
let promise = Promise.resolve(config)
while (chain.length) {
  const { onFulfilled, onRejected } = chain.shift()!
  promise = promise.then(onFulfilled as any, onRejected)
}
```

假设有请求拦截器 A（先注册）、B（后注册）和响应拦截器 C，chain 顺序是 `[B, A, dispatchRequest, C]`，执行顺序 B → A → 发请求 → C。

### 入口工厂的秘密

为什么 `axios` 既能当函数调用，又有 `.get` 等方法？

```typescript
function createInstance(): AxiosInstance {
  const context = new Axios()
  let instance = Axios.prototype.request.bind(context)  // 绑定 this
  instance = Object.assign(instance, Axios.prototype, context) // 挂载所有方法和属性
  return instance as AxiosInstance
}
```

**函数也是对象**，可以挂属性。`Object.assign` 把 Axios 原型方法和实例属性全挂到这个函数上，挂完之后 `instance` 既可函数调用（走 `request`），又有 `interceptors`、`defaults`、`get`、`post` 等所有属性。

整个数据流：**配置合并 → 请求拦截器 → transformRequest → XHR/http → transformResponse → 响应拦截器 → 业务代码**

> 💬 **面试官**：为什么 axios 既可以作为函数调用，又有 .get / .post 等方法？
>
> ✅ 标准答案：axios 本质是 `Axios.prototype.request.bind(context)` 得到的函数，再通过 `Object.assign` 把 Axios 原型和实例属性全部挂载上去。JS 中函数也是对象，所以它既可函数调用，又有实例方法。
> 🎁 加分答案：这个工厂模式让 `axios(config)` 和 `axios.get(url)` 走同一个 `request` 方法，`this` 都指向同一个 context 实例，拦截器、defaults 是共享的。`axios.create()` 则创建全新 context，实现实例隔离。

### 完整源码（五个文件）

**`src/axios/types.ts`**

```typescript
import AxiosInterceptorManager from './AxiosInterceptorManager'

export type Methods = 'get'|'GET'|'post'|'POST'|'put'|'PUT'|'delete'|'DELETE'|'options'|'OPTIONS'

export interface AxiosRequestConfig {
  url?: string
  method?: Methods
  params?: Record<string, any>
  headers?: Record<string, any>
  data?: Record<string, any>
  timeout?: number
  transformRequest?: (data: Record<string, any>, headers: any) => any
  transformResponse?: (response: Record<string, any>) => any
  cancelToken?: any
}

export interface AxiosInstance {
  <T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>
  interceptors: {
    request: AxiosInterceptorManager<AxiosRequestConfig>
    response: AxiosInterceptorManager<AxiosResponse>
  }
  create?: (config: AxiosRequestConfig) => AxiosInstance
  CancelToken: any
  isCancel: any
}

export interface AxiosResponse<T = any> {
  data: T
  status: number
  statusText: string
  headers?: Record<string, any>
  config?: AxiosRequestConfig
  request?: XMLHttpRequest
}
```

**`src/axios/AxiosInterceptorManager.ts`**

```typescript
type OnFulFilled<V> = (value: V) => V | Promise<V>

interface OnRejected {
  (error: any): any
}

export interface Interceptor<V> {
  onFulfilled?: OnFulFilled<V>
  onRejected?: OnRejected
}

export default class AxiosInterceptorManager<V> {
  public interceptors: Array<Interceptor<V> | null> = []

  use(onFulfilled?: OnFulFilled<V>, onRejected?: OnRejected): number {
    this.interceptors.push({ onFulfilled, onRejected })
    return this.interceptors.length - 1 // 返回 id，供 eject 使用
  }

  eject(id: number): void {
    if (this.interceptors[id]) {
      this.interceptors[id] = null // 👈 置 null 保持 id 稳定，不用 splice
    }
  }
}
```

**`src/axios/cancel.ts`**

```typescript
class Cancel {
  message: string
  constructor(message: string) {
    this.message = message
  }
}

export function isCancel(error: any) {
  return error instanceof Cancel
}

export class CancelToken {
  public resolve: any
  source() {
    return {
      token: new Promise((resolve) => {
        this.resolve = resolve
      }),
      cancel: (message: string) => {
        this.resolve(new Cancel(message)) // 让 token resolve，触发 xhr.abort()
      }
    }
  }
}
```

**`src/axios/index.ts`**

```typescript
import Axios from './Axios'
import { AxiosInstance } from './types'
import { isCancel, CancelToken } from './cancel'

function createInstance(): AxiosInstance {
  const context: Axios<any> = new Axios()
  let instance = Axios.prototype.request.bind(context)
  instance = Object.assign(instance, Axios.prototype, context)
  return instance as AxiosInstance
}

const axios = createInstance()
axios.CancelToken = new CancelToken()
axios.isCancel = isCancel
export default axios
export * from './types'
```

**`src/axios/Axios.ts`**

```typescript
import { AxiosRequestConfig, AxiosResponse } from './types'
import qs from 'qs'
import parseHeaders from 'parse-headers'
import AxiosInterceptorManager, { Interceptor } from './AxiosInterceptorManager'

const defaults: AxiosRequestConfig = {
  method: 'GET',
  timeout: 0,
  headers: {
    common: { accept: 'application/json' },
  },
  transformRequest: (data: Record<string, any>, headers: any) => {
    return data
  },
  transformResponse: (response: Record<string, any>) => {
    return response.data
  }
}

const getStyleMethods = ['get', 'head', 'delete', 'options']
const postStyleMethods = ['post', 'put', 'patch']
getStyleMethods.forEach((method: string) => { defaults.headers![method] = {} })
postStyleMethods.forEach((method: string) => {
  defaults.headers![method] = { 'content-type': 'application/json' }
})
const allMethods = [...getStyleMethods, ...postStyleMethods]

export default class Axios<T> {
  public defaults: AxiosRequestConfig = defaults
  public interceptors = {
    request: new AxiosInterceptorManager<AxiosRequestConfig>(),
    response: new AxiosInterceptorManager<AxiosResponse<T>>()
  }

  request(config: AxiosRequestConfig): Promise<AxiosRequestConfig | AxiosResponse<T>> {
    config.headers = Object.assign(this.defaults.headers, config.headers)
    config = { ...this.defaults, ...config }
    if (config.transformRequest && config.data) {
      config.data = config.transformRequest(config.data, config.headers)
    }
    const chain: Array<Interceptor<AxiosRequestConfig> | Interceptor<AxiosResponse<T>>> = [{
      onFulfilled: this.dispatchRequest,
      onRejected: error => error
    }]
    this.interceptors.request.interceptors.forEach((interceptor) => {
      interceptor && chain.unshift(interceptor) // 后进先出
    })
    this.interceptors.response.interceptors.forEach((interceptor) => {
      interceptor && chain.push(interceptor) // 先进先出
    })
    let promise: Promise<any> = Promise.resolve(config)
    while (chain.length) {
      const { onFulfilled, onRejected } = chain.shift()!
      promise = promise.then(onFulfilled as any, onRejected)
    }
    return promise
  }

  dispatchRequest<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return new Promise<AxiosResponse<T>>((resolve, reject) => {
      const request = new XMLHttpRequest()
      let { method, url, params, headers, data, timeout } = config
      let body: string | null = null
      if (params && typeof params === 'object') {
        const paramsStr = qs.stringify(params)
        url += (url?.indexOf('?') !== -1 ? '&' : '?') + paramsStr
      }
      request.open(method!, url!, true)
      request.responseType = 'json'
      request.onreadystatechange = function () {
        if (request.readyState === 4 && request.status !== 0) {
          if (request.status >= 200 && request.status < 300) {
            const { response, status, statusText } = request
            const headers = parseHeaders(request.getAllResponseHeaders())
            let res: AxiosResponse<T> = { data: response || request.responseText, status, statusText, headers, config, request }
            if (config.transformResponse) { res = config.transformResponse(res) }
            resolve(res)
          } else {
            reject(`Error: Request failed with status code ${request.status}`)
          }
        }
      }
      if (headers) {
        for (const key in headers) {
          if (key === 'common' || allMethods.includes(key)) {
            if (key === 'common' || key === config.method?.toLocaleLowerCase()) {
              for (const k in headers[key]) {
                request.setRequestHeader(k, headers[key][k])
              }
            }
          } else {
            request.setRequestHeader(key, headers[key])
          }
        }
      }
      if (data) { body = JSON.stringify(data) }
      request.onerror = () => { reject('net::ERR_INTERNET_DISCONNECTED') }
      if (timeout) {
        request.timeout = timeout
        request.ontimeout = () => { reject('Error: timeout of 1000ms exceeded') }
      }
      if (config.cancelToken) {
        config.cancelToken.then((message: string) => {
          request.abort()
          reject(message)
        })
      }
      request.send(body)
    })
  }
}
```

---

## ⚖️ 与 fetch / ky / superagent 的区别

| 对比维度 | Axios | fetch（原生） | ky | superagent |
|---------|-------|-------------|-----|------------|
| 自动 JSON 序列化 | ✅ | ❌ 手动 | ✅ | ✅ |
| 4xx/5xx 抛错 | ✅ | ❌ 需判断 ok | ✅ | ✅ |
| 拦截器机制 | ✅ 内置 | ❌ 需封装 | ✅ hooks | ✅ plugins |
| 取消请求 | ✅ AbortController | ✅ | ✅ | ✅ |
| 上传进度 | ✅ onUploadProgress | ⚠️ 较复杂 | ❌ | ✅ |
| 浏览器兼容 | ✅ 含旧版（XHR） | ⚠️ 现代浏览器 | ⚠️ 现代浏览器 | ✅ |
| Bundle 大小 | ~14KB | 0（原生） | ~4KB | ~17KB |
| Node.js 支持 | ✅ 内置 | ✅ Node 18+ | ✅ | ✅ |

**怎么选：**
- **Axios**：功能最全，生态最大，大多数项目的稳健选择
- **fetch**：0 依赖，现代浏览器首选，适合自己封装一层
- **ky**：fetch 的轻量封装（4KB），追求轻量且无上传进度需求
- **Node.js 场景**：推荐 `got` 或 Node.js 18+ 内置 `fetch`

> 💬 **面试官**：新项目你会选 Axios 还是 fetch？
>
> ✅ 标准答案：看场景。需要兼容旧浏览器、大量用拦截器、有文件上传进度，选 Axios；纯现代浏览器追求 0 依赖，选 fetch 自己封装或用 ky。
> 🎁 加分答案：Axios 的 XHR 支持 `onUploadProgress` 回调，这是原生 fetch ReadableStream 的弱项。有文件上传进度条需求，Axios 有天然优势。

---

## 💡 一张图总结（面试速记）

| 知识点 | 核心结论 | 面试频率 |
|--------|---------|--------|
| 拦截器原理 | chain 数组 + Promise 链，request unshift，response push | ⭐⭐⭐⭐⭐ |
| 与 fetch 区别 | 自动 JSON、拦截器、4xx 抛错、XHR vs fetch API | ⭐⭐⭐⭐⭐ |
| TypeScript 封装 | 泛型 `get<T>()` + 三层拦截器 Request 类 | ⭐⭐⭐⭐ |
| 任务取消 | AbortController + isCancel，防竞态 + 防内存泄漏 | ⭐⭐⭐⭐ |
| 请求防抖与重复控制 | 防抖+AbortController 防乱序；CancelToken+Map 防重复提交 | ⭐⭐⭐⭐ |
| 错误处理 | isAxiosError 类型守卫，区分三种错误场景 | ⭐⭐⭐⭐ |
| 配置合并 | 三层优先级：请求 > 实例 > 默认，headers 深度合并 | ⭐⭐⭐ |

---

## 📝 留个问题

如果让你不用 Axios，只用原生 `fetch` 实现一个带拦截器、统一错误处理、自动重试的 HTTP 客户端——你会怎么设计？

欢迎在评论区写出你的思路，下一篇我们来手写这个。

---

> 🔖 TypeScript + 全栈实战系列，持续更新中。上一篇：《TypeScript 进阶三部曲：从类型体操到工程实践》
