## axios
### index
`src/axios/index.ts`

```jsx
import Axios from './Axios';
import {AxiosInstance} from './types';
import {isCancel, CancelToken} from './cancel';

/**
 * 创建一个axios实例
 * axios其实就是一个函数
 */
function createInstance(): AxiosInstance {
  const context: Axios<any> = new Axios(); // this指针上下文
  // 让 request 方法里的this永远指向context 也就是 new Axios()
  let instance = Axios.prototype.request.bind(context);
  // 把 Axios 的类的实例和类的原型上的方法都拷贝到了 instance 上，也就是 request 方法上
  instance = Object.assign(instance, Axios.prototype,context);

  return instance as AxiosInstance;
}
const axios = createInstance();
axios.CancelToken = new CancelToken();
axios.isCancel = isCancel;
export default axios;
export * from './types';
```

### Axios
`src/axios/Axios.ts`

```jsx
import {AxiosRequestConfig, AxiosResponse} from './types';
import qs from 'qs';
import parseHeaders from 'parse-headers';
import AxiosInterceptorManager, {Interceptor} from './AxiosInterceptorManager';

const defaults: AxiosRequestConfig = {
  method: 'GET',
  timeout: 0,
  headers: { // 请求头
    common: { // 针对所有方法的请求生效
      accept: 'application/json' // 指定告诉服务器返回json格式的数据
    },
  },
  transformRequest: (data: Record<string, any>, headers: any) => {
    // headers['common']['content-type'] = 'application/json';
    // return JSON.stringify(data);
    return data
  },
  transformResponse: (response: Record<string, any>) => {
    return response.data;
  } 
}
const getStyleMethods = ['get', 'head', 'delete', 'options']; // get 风格的请求
getStyleMethods.forEach((method: string) => {
  defaults.headers![method] = {}
});
const postStyleMethods = ['post', 'put', 'patch']; // post 风格的请求
postStyleMethods.forEach((method: string) => {
  defaults.headers![method] = {
    'content-type': 'application/json', // 请求体的格式
  }
});
const allMethods = [...getStyleMethods, ...postStyleMethods];
export default class Axios<T> {
  public defaults: AxiosRequestConfig = defaults;
  public interceptors = {
    request: new AxiosInterceptorManager<AxiosRequestConfig>(),
    response: new AxiosInterceptorManager<AxiosResponse<T>>()
  }
  // T 用来限制响应对象 response 里的 data 的类型
  request(config: AxiosRequestConfig): Promise<AxiosRequestConfig|AxiosResponse<T>> {
    // return this.dispatchRequest(config);
    config.headers = Object.assign(this.defaults.headers, config.headers);
    config = {...this.defaults, ...config};
    if(config.transformRequest && config.data) {
      config.data = config.transformRequest(config.data, config.headers);
    }
    const chain: Array<Interceptor<AxiosRequestConfig>|Interceptor<AxiosResponse<T>>> = [{
      onFulfilled: this.dispatchRequest,
      onRejected: error => error
    }];
    this.interceptors.request.interceptors.forEach((interceptor:Interceptor<AxiosRequestConfig>|null) => {
      // todo: 请求拦截器先进后出
      // [request1,request] => [request1,request2,request] => [request1,request2,request3,request]
      interceptor && chain.unshift(interceptor);
    });
    this.interceptors.response.interceptors.forEach((interceptor: Interceptor<AxiosResponse<T>>|null) => {
      // todo: 响应拦截器先进先出
      interceptor && chain.push(interceptor);
    });
    let promise: Promise<AxiosRequestConfig|AxiosResponse<T>> = Promise.resolve(config);
    while(chain.length) {
      const {onFulfilled, onRejected} = chain.shift()!; // ! 断言不为空
      promise = promise.then(onFulfilled as any, onRejected);
    }
    return promise;
  }
  // 派发请求的方法
  dispatchRequest<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return new Promise<AxiosResponse<T>>((resolve, reject) => {
      const request = new XMLHttpRequest();
      let {method, url, params, headers, data, timeout} = config;
      let paramsStr;
      let body: string | null = null;
      if(params && typeof params === 'object') {
        paramsStr = qs.stringify(params);
        url += (url?.indexOf('?') !== -1 ? '&': '?') + paramsStr;
      }
      request.open(method!, url!, true);
      request.responseType = 'json';
      request.onreadystatechange = function() {
        if(request.readyState === 4 && request.status !== 0) {
          if(request.status >= 200 && request.status < 300) {
            const {response, status, statusText} = request;
            const headers = parseHeaders(request.getAllResponseHeaders());
            let res: AxiosResponse<T> = {
              data: response || request.responseText,
              status,
              statusText,
              headers,
              config,
              request
            }
            if(config.transformResponse) {
              res = config.transformResponse(res);
            }
            resolve(res);
          } else {
            // todo:状态码错误
            reject(`Error: Request failed with status code ${request.status}`);
          }
        }
      }
      if(headers) {
        for (const key in headers) {
          // common 表示所有的请求方法都生效
          // key是一个方法名
          if(key === 'common' || allMethods.includes(key)) {
            if(key === 'common' || key === config.method?.toLocaleLowerCase()) {
              for (const k in headers[key]) {
                request.setRequestHeader(k, headers[key][k]);
              }
            }
          } else {
            request.setRequestHeader(key, headers[key]);
          }
        }
      }
      if(data) {
        body = JSON.stringify(data);
      }
      // todo:网络错误
      request.onerror = () => {
        reject('net::ERR_INTERNET_DISCONNECTED');
      }
      // todo:超时错误
      if(timeout) {
        request.timeout = timeout;
        request.ontimeout = () => {
          reject('Error: timeout of 1000ms exceeded');
        }
      }
      // todo:取消请求
      if(config.cancelToken) {
        config.cancelToken.then((message: string) => {
          request.abort();
          reject(message);
        })
      }
      request.send(body);
    })
  }
}

```

### types
`src/axios/types.ts`

```jsx
import AxiosInterceptorManager from './AxiosInterceptorManager';
export type Methods = 'get'|'GET'|'post'|'POST'|'put'|'PUT'|'delete'|'DELETE'|'options'|'OPTIONS';
export interface AxiosRequestConfig {
  url?: string;
  method?: Methods;
  params?: Record<string, any>,
  headers?: Record<string, any>,
  data?: Record<string, any>,
  timeout?: number,
  transformRequest?: (data: Record<string, any>, headers: any) => any; 
  transformResponse?: (response: Record<string, any>) => any;
  cancelToken?: any;
}
export interface AxiosInstance {
  // Promise 的范型 T 代表此 Promise 变成成功态之后 resolve 的值 resolve(value)
  <T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  interceptors: {
    request: AxiosInterceptorManager<AxiosRequestConfig>;
    response:AxiosInterceptorManager<AxiosResponse>;
  }
  create?: (config: AxiosRequestConfig) => AxiosInstance;
  CancelToken: any;
  isCancel: any;
}

export interface AxiosResponse <T=any> {
  data: T;
  status: number;
  statusText: string;
  headers?: Record<string, any>;
  config?: AxiosRequestConfig;
  request?: XMLHttpRequest;
}
```

### AxiosInterceptorManager
`src/axios/AxiosInterceptorManager.ts`

```jsx
type OnFulFilled<V> = (value: V) => V | Promise<V>;
interface OnRejected {
  (error: any): any;
}

/**
 * 一个拦截器
 */
export interface Interceptor<V> {
  onFulfilled?: OnFulFilled<V>; // 成功的回调
  onRejected?: OnRejected; // 失败的回调
}

/**
 * 拦截器管理器
 * T 可能是 AxiosRequestConfig，也可能是 AxiosResponse
 */
export default class AxiosInterceptorManager<V> {
  public interceptors: Array<Interceptor<V>|null> = []; 
  use(onFulfilled?: OnFulFilled<V>, onRejected?: OnRejected): number {
    this.interceptors.push({
      onFulfilled,
      onRejected
    });
    return this.interceptors.length - 1;
  }
  eject(id: number): void {
    if(this.interceptors[id]) {
      this.interceptors[id] = null;
    }
  }
}

```

### cancel
`src/axios/cancel.ts`

```jsx
class Cancel {
  message: string;
  constructor(message: string) {
    this.message = message;
  }
}

export function isCancel(error: any) {
  return error instanceof Cancel;
}

export class CancelToken {
  public resolve: any;
  source() {
    return {
      token: new Promise((resolve) => {
        this.resolve = resolve;
      }),
      cancel: (message: string) => {
        this.resolve(new Cancel(message))
      }
    }
  }
}

```