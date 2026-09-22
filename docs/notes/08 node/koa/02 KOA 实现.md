# application
```javascript
const http = require('http');
const EventEmitter = require('events');
const context = require('./context');
const request = require('./request');
const response = require('./response');

class Application extends EventEmitter {
  constructor() {
    super();
    // 应用级别的隔离
    this.context = Object.create(context);
    this.request = Object.create(request);
    this.response = Object.create(response);
    this.middlewares = []
  }
  createContext = (req, res) => {
    // 请求级别的隔离
    // 每次请求都创建一个全新的上下文
    const response = Object.create(this.response);
    const request = Object.create(this.request);
    const ctx= Object.create(this.context);

    request.response = response;
    response.request = request;

    // 扩展
    ctx.request = request;
    ctx.response = response;

    // 原生
    ctx.req = ctx.request.req = ctx.response.req = req;
    ctx.res = ctx.response.res = ctx.request.res = res;

    ctx.app = this;

    return ctx;
  }
  use(fn) {
    this.middlewares.push(fn);
  }
  compose(ctx) {
    const middlewares = this.middlewares;
    let idx = -1;
    function dispatch (index) {
      if(idx >= index) return Promise.reject(new Error('next() called multiple times'));
      if(index >= middlewares.length) return Promise.resolve();
      const fn = middlewares[index];
      idx = index;
      try {
        return Promise.resolve(fn(ctx, () => dispatch(index + 1)));
      } catch (error) {
        return Promise.reject(error);
      }
      
    }
    return dispatch(0);
  }
  handleRequest = async (req, res) => {
    const ctx = this.createContext(req, res);
    res.statusCode = 404;
    try {
      await this.compose(ctx);
    
      const body = ctx.body;
      if(typeof body === 'string' || Buffer.isBuffer(body)) {
        res.end(body);
      } else {
        res.end('Not Found');
      }
    } catch (error) {
      console.error(error);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }
  listen = (...args) => {
    const server = http.createServer(this.handleRequest);
    server.listen(...args);
  }
}

module.exports = Application;
```

# context
```javascript
const delegates = require('delegates');

const context = {};

delegates(context, 'request')
  .access('query')
  .access('path')
  .access('header')
  .access('headers')
  .access('method')
  .getter('body');

  delegates(context, 'response')
  .method('end')
  .access('body')
  .getter('status')
  .setter('status');

module.exports = context;
```

# request
```javascript
const parseURL = (url) => {
  return new URL(url, 'http://localhost');
}

const request = {
  get url() {
    return new URL(this.req.url, 'http://localhost');
  },
  get path() {
    return this.url.pathname;
  },
  get query() {
    const query = {};
    for (const [key, value] of this.url.searchParams) {
      query[key] = value;
    }
    return query;
  },
  get headers() {
    return this.req.headers;
  },
  get header() {
    return this.req.headers;
  },
  get method() {
    return this.req.method;
  },
};

module.exports = request;
```

# response
```javascript
const response = {
  _body: null,
  set body(value) {
    this.res.statusCode = 200;
    if(value === null) {
      this.res.statusCode = 204;
    }
    this._body = value;
  },
  get body() {
    return this._body;
  }
};

module.exports = response;
```

