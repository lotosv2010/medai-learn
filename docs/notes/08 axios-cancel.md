# 一、概述
在我们日常开发中，有这样一种场景必须要进行处理，那就是在提交表单的时候，如果很快的重复点击两次，会造成重复请求，第二次请求就会报错，给用户带来很不好的体验，同时如果后端没有加以控制，也容易造成数据重复。所以我们需要对这种重复请求进行处理和控制。

# 二、思路
取消重复请求的思路就是，将每一次请求的url、method、params、data拼接起来组成一个key,然后添加到map中，下一次请求时就拿key在map中查找是否已存在，如果存在就表示重复请求，就取消，如果不存在就放行，等请求成功后在从map中删除这个key。

# 三、Axios
+ <font style="color:rgb(199, 37, 78);background-color:rgb(242, 242, 242);">axios</font><font style="color:rgb(64, 64, 64);">中是通过</font><font style="color:rgb(199, 37, 78);background-color:rgb(242, 242, 242);">CancelToken</font><font style="color:rgb(64, 64, 64);">给每个请求添加一个</font><font style="color:rgb(199, 37, 78);background-color:rgb(242, 242, 242);">cancelToken</font><font style="color:rgb(64, 64, 64);">属性,使得每个请求具备取消请求的能力。</font>
+ <font style="color:rgb(64, 64, 64);">有两种方法实现：</font>

> 但是该做法会潜藏一个问题，就是这些被取消的请求，还是会发给后端。这个问题导致的后果就是，比如我点击按钮插入数据，连续点击5次，虽然重复的被取消了，但是在后端依然接受到这5次请求，并执行了5次插入数据。
>
> <font style="color:rgb(51, 51, 51);">所以以前刚开始</font>**<font style="color:#E8323C;">理解的axios通过CancelToken取消重复请求，会把之前的取消掉，请求不会发出去给后端，这是错误的理解。</font>**
>
> 只要点击了按钮触发事件，请求就发出去了，尽管可以取消重复请求，只要网络还在连接，后端还是会一一收到所有的请求，该查库的查库，该创建的创建，只是重复请求返回的数据被前端取消了而已，前端只接受最后一次数据，渲染一次页面。
>
> 针对该问题，可以有多种优化方式，比如后端可以做控制，对于重复创建等操作进行限制，而在前端可以在按钮点击后显示loading状态等，以限制用户重复点击触发。
>

## <font style="color:rgb(64, 64, 64);">重复请求取消前一次</font>
+ <font style="color:rgb(64, 64, 64);">这种方式虽然是可以取消重复请求，但是浏览的</font><font style="color:rgb(199, 37, 78);background-color:rgb(242, 242, 242);">network</font><font style="color:rgb(64, 64, 64);">中取消的请求会显示</font><font style="color:rgb(199, 37, 78);background-color:rgb(242, 242, 242);">canceled</font><font style="color:rgb(64, 64, 64);">状态，用户是有感知的</font>

```typescript
import qs from 'qs';

export default class CancelRequest {
  private pendingRequest;
  constructor() {
    this.pendingRequest = new Map()
  }
  // 根据请求信息生成唯一标识key
  geterateReqKey(config: any) {
    const { url, method, params, data } = config;
    return [url, method?.toLocaleUpperCase(), qs.stringify(params), qs.stringify(data)].join('&');
  }
  // 把当前请求信息添加到pendingRequest对象中
  addPendingRequest(config: any, CancelToken: any) {
    const requestKey = this.geterateReqKey(config);
    config.cancelToken =
      config.cancelToken ||
      new CancelToken((cancel: any) => {
        if (!this.pendingRequest.has(requestKey)) {
          // 把请求取消方法作为 map 值存起来
          this.pendingRequest.set(requestKey, cancel);
        }
      })
  }
  // 检查是否存在重复请求，若存在则取消前一次请求
  removePendingRequest(config: any) {
    const requestKey = this.geterateReqKey(config);
    if (this.pendingRequest.has(requestKey)) {
      const cancel = this.pendingRequest.get(requestKey);
      // 取消请求
      cancel(requestKey);
      // 删除map中对应的属性
      this.removeRequestKey(config);
    }
  }
  // 从pendingRequest中删除对应的key
  removeRequestKey(config: any) {
    const requestKey = this.geterateReqKey(config);
    this.pendingRequest.delete(requestKey);
  }
}
```

```typescript
import axios from 'axios';
import CancelRequest from './CancelRequest';

// 实例化
let cancelRequest = new CancelRequest()
const instance = axios.create({
  // ...
});

// 请求拦截器
instance.interceptors.request.use((config: any) => {
  // 在请求开始之前检查先前的请求，如果是重复请求，删除之前的
  cancelRequest.removePendingRequest(config);
  // 如果不存在就将当前请求添加到pendingRequest
  cancelRequest.addPendingRequest(config);
    return config;
}, (err: any) => {
    Promise.reject(err);
});
// 响应拦截器
instance.interceptors.response.use((res: any) => {
  // 移除成功请求记录
    cancelRequest.removeRequestKey(res.config);
    return res.data;
}, (err: any) => {
  // 失败时也需要移除
    cancelRequest.removeRequestKey(err.config || {} );
    Promise.reject(err);
});
export default instance;
```

## <font style="color:rgb(64, 64, 64);">重复请求取消第二次(推荐)</font>
+ <font style="color:rgb(64, 64, 64);">取消第二次请求，并实现用户无感</font><font style="color:rgb(64, 64, 64);"></font>

```typescript
import qs from 'qs';
export default class CancelRequest {
  private pendingRequest;
  constructor() {
    this.pendingRequest = new Map();
  }
  // 根据请求信息生成唯一标识key
  geterateReqKey(config: any) {
    const { url, method, params, data } = config ?? {};
    return [url, method?.toLocaleUpperCase(), qs.stringify(params), qs.stringify(data)].join('&');
  }
  // 检查是否是重复请求，如果是取消第二次
  checkoutPendingRequest(config: any, CancelToken: any) {
    // 为每个请求添加cancelToken,同时拿到source获取到对每个请求取消请求的能力（cancel方法）
    let source = null
    if (config.cancelToken) {
      source = config.source;
    } else {
      source = CancelToken.source();
      config.cancelToken = source.token;
    }
    const requestKey = this.geterateReqKey(config)
    if (this.pendingRequest.has(requestKey)) {
      // 取消重复请求（第二次）
      source.cancel('double request：' + requestKey);
    } else {
      // 没重复就添加
      this.pendingRequest.set(requestKey, source);
    }
  }
  // 从请求列表中删除
  removeRequestKey(config: any) {
    // 延迟一点是为了避免用户快速多次点击提交，而第一次请求成功立刻清除掉，第二次请求不会被取消
    setTimeout(() => {
      const requestKey = this.geterateReqKey(config);
      this.pendingRequest.delete(requestKey);
    }, 200)
  }
}
```

```typescript
// request.js
import axios from 'axios';
import CancelRequest from './CancelRequest';

// 实例化
let cancelRequest = new CancelRequest()
const instance = axios.create({
  // ...
});

// 请求拦截器
instance.interceptors.request.use((config: any) => {
// 检查之前是否存在相同的请求，如果存在则取消。不存在就记录
  cancelRequest.checkoutPendingRequest(config);
    return config;
}, (err: any) => {
    Promise.reject(err);
});
// 响应拦截器
instance.interceptors.response.use((res: any) => {
  // 移除成功请求记录
    cancelRequest.removeRequestKey(res.config);
    return res.data;
}, (err: any) => {
    Promise.reject(err);
});
export default instance;
```

# 四、umi-request
## <font style="color:rgb(64, 64, 64);">重复请求取消前一次</font>
+ 同Axios，不推荐，此处就不实现了，需要的同学参考上面Axios示例

## <font style="color:rgb(64, 64, 64);">重复请求取消第二次(推荐)</font>
```typescript
import qs from 'qs';

export default class CancelRequest {
  private pendingRequest;
  constructor() {
    this.pendingRequest = new Map();
  }
  // 根据请求信息生成唯一标识key
  geterateReqKey(config: any) {
    const { url, method, params, data } = config ?? {};
    return [url, method?.toLocaleUpperCase(), qs.stringify(params), qs.stringify(data)].join('&');
  }
  // 检查是否是重复请求，如果是取消第二次
  checkoutPendingRequest(config: any, CancelToken: any) {
    // 为每个请求添加cancelToken,同时拿到source获取到对每个请求取消请求的能力（cancel方法）
    let source = null
    if (config.cancelToken) {
      source = config.source
    } else {
      source = CancelToken.source()
      config.cancelToken = source.token
    }
    const requestKey = this.geterateReqKey(config);
    if (this.pendingRequest.has(requestKey)) {
      // 取消重复请求（第二次）
      source.cancel(null);
    } else {
      // 没重复就添加
      this.pendingRequest.set(requestKey, source);
    }
  }
  // 从请求列表中删除
  removeRequestKey(config: any) {
    // 延迟一点是为了避免用户快速多次点击提交，而第一次请求成功立刻清除掉，第二次请求不会被取消
    setTimeout(() => {
      const requestKey = this.geterateReqKey(config);
      this.pendingRequest.delete(requestKey);
    }, 200)
  }
}
```

```typescript
import Request, { extend } from 'umi-request';
import { notification } from 'antd';
import CancelRequest from './CancelRequest';

// 实例化
let cancelRequest = new CancelRequest();
const CancelToken = Request.CancelToken;

 const codeMessage = {
   200: '服务器成功返回请求的数据。',
   201: '新建或修改数据成功。',
   202: '一个请求已经进入后台排队（异步任务）。',
   204: '删除数据成功。',
   400: '发出的请求有错误，服务器没有进行新建或修改数据的操作。',
   401: '用户没有权限（令牌、用户名、密码错误）。',
   403: '用户得到授权，但是访问是被禁止的。',
   404: '发出的请求针对的是不存在的记录，服务器没有进行操作。',
   406: '请求的格式不可得。',
   410: '请求的资源被永久删除，且不会再得到的。',
   422: '当创建一个对象时，发生一个验证错误。',
   500: '服务器发生错误，请检查服务器。',
   502: '网关错误。',
   503: '服务不可用，服务器暂时过载或维护。',
   504: '网关超时。',
 };

 /**
  * 异常处理程序
  */
 const errorHandler = (error: { response: Response }): Response => {
   const { response } = error;
  //  console.log(error, 'error');
   if(response && response.status) {
     const errorText = codeMessage[response.status] || response.statusText;
     const { status, url } = response;
     notification.error({
       message: `请求错误 ${status}: ${url}`,
       description: errorText,
     });
   } else if (!response && !(error instanceof Request.Cancel)) {
     notification.error({
       description: '您的网络发生异常，无法连接服务器',
       message: '网络异常',
     });
   }
   return response;
 };

 /**
  * 配置request请求时的默认参数
  */
 const request = extend({
   errorHandler, // 默认错误处理
   credentials: 'include', // 默认请求是否带上cookie
   prefix: 'https://test.xxx.com',
   headers: {'Accept': '*/*'},
   responseType: 'json',
 });

 // 请求拦截器
 request.interceptors.request.use((url, options) => {
   // 检查之前是否存在相同的请求，如果存在则取消。不存在就记录
   cancelRequest.checkoutPendingRequest(options, CancelToken);
   return options;
 }, { global: false })

 // 响应拦截器
 request.interceptors.response.use(async (response, options) => {
  // console.log(response, 'response');
  // 移除成功请求记录
  cancelRequest.removeRequestKey(options);
  return response
 }, { global: false })
 export default request;
```

# 五、队列
```javascript
import qs from 'qs'

export default class CancelRequest {
  private pendingRequest;
  constructor() {
    this.pendingRequest = new Map();
  }
  // 根据请求信息生成唯一标识key
  geterateReqKey(config: any) {
    const { url, method, params, data } = config ?? {};
    return [url, method?.toLocaleUpperCase(), qs.stringify(params), qs.stringify(data)].join('&');
  }
  // 检查是否是重复请求，如果是取消第二次
  checkoutPendingRequest(config: any, request: any) {
    const requestKey = this.geterateReqKey(config);
    const sameHandle = this.pendingRequest.get(requestKey);
    if (sameHandle) {
      // 遇到相同请求直接返回之前请求的promise
      return sameHandle;
    }
    const handle = new Promise((resolve, reject) => {
      request(config.url, config)
        .then((res: any) => {
          resolve(res);
        }).catch((err: any) => {
          reject(err);
        }).finally(() => {
          // 移除成功请求记录
          this.removeRequestKey(config);
        });
    });
    this.pendingRequest.set(requestKey, handle);
    return handle;
  }
  // 从请求列表中删除
  removeRequestKey(config: any) {
    // 延迟一点是为了避免用户快速多次点击提交，而第一次请求成功立刻清除掉，第二次请求不会被取消
    setTimeout(() => {
      const requestKey = this.geterateReqKey(config);
      this.pendingRequest.delete(requestKey);
    }, 200)
  }
}
```

```typescript
import Request, { extend } from 'umi-request';
import { notification } from 'antd';
import CancelRequest from './CancelRequest';

// 实例化
let cancelRequest = new CancelRequest();

 const codeMessage = {
   200: '服务器成功返回请求的数据。',
   201: '新建或修改数据成功。',
   202: '一个请求已经进入后台排队（异步任务）。',
   204: '删除数据成功。',
   400: '发出的请求有错误，服务器没有进行新建或修改数据的操作。',
   401: '用户没有权限（令牌、用户名、密码错误）。',
   403: '用户得到授权，但是访问是被禁止的。',
   404: '发出的请求针对的是不存在的记录，服务器没有进行操作。',
   406: '请求的格式不可得。',
   410: '请求的资源被永久删除，且不会再得到的。',
   422: '当创建一个对象时，发生一个验证错误。',
   500: '服务器发生错误，请检查服务器。',
   502: '网关错误。',
   503: '服务不可用，服务器暂时过载或维护。',
   504: '网关超时。',
 };

 /**
  * 异常处理程序
  */
 const errorHandler = (error: { response: Response }): Response => {
   const { response } = error;
  //  console.log(error, 'error');
   if(response && response.status) {
     const errorText = codeMessage[response.status] || response.statusText;
     const { status, url } = response;
     notification.error({
       message: `请求错误 ${status}: ${url}`,
       description: errorText,
     });
   } else if (!response && !(error instanceof Request.Cancel)) {
     notification.error({
       description: '您的网络发生异常，无法连接服务器',
       message: '网络异常',
     });
   }
   return response;
 };

 /**
  * 配置request请求时的默认参数
  */
 const request = extend({
   errorHandler, // 默认错误处理
   credentials: 'include', // 默认请求是否带上cookie
   prefix: 'https://test.xxx.com',
   headers: {'Accept': '*/*'},
   responseType: 'json',
 });

 // 请求拦截器
 request.interceptors.request.use((url, options) => {
   return options;
 }, { global: false })

 // 响应拦截器
 request.interceptors.response.use(async (response, options) => {
  // console.log(response, 'response');
  return response
 }, { global: false })

export default function(url: any, options: any) {
  // 检查之前是否存在相同的请求，如果存在则取消。不存在就记录
  return cancelRequest.checkoutPendingRequest({url , ...options}, request);
};
```

# 六、其他库
## React Query（推荐）
[React Query](https://react-query.tanstack.com/)

## ahooks


[useUrlState - ahooks 3.0](https://ahooks.js.org/)

# 参考
[GitHub - umijs/umi-request: A request tool based on fetch.](https://github.com/umijs/umi-request)



[axios取消重复请求不会阻止请求到服务器 - 掘金](https://juejin.cn/post/6931588940076072968)



[前端接口防止重复请求实现方案](https://mp.weixin.qq.com/s/8fd1Kd3wH5uPI7pCcYe3Yg)





