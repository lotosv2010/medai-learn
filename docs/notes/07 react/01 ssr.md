# 安装依赖
```shell
npm i react react-dom -S
npm i webpack webpack-cli -D
npm i @babel/core @babel/cli @babel/preset-env -D
npm i babel-loader -D
npm i @babel/preset-react -D
npm i webpack-node-externals -D
npm i @babel/plugin-transform-runtime -D
npm i npm-run-all -D
npm i koa-router -D
npm i webpack-merge -D
npm i koa-static -D
npm i react-router-dom -S
npm i antd -S
npm i redux react-redux redux-logger redux-thunk -S
npm i axios -S
npm i @koa/cors -S
npm install koa-favicon -S
npm i react-router-config -S
npm i koa-proxies -S
npm i koa-session -S
npm i koa-bodyparser -S
npm i isomorphic-style-loader -D
npm i style-loader -D
npm i css-loader -D
```

# 目录结构
<!-- 这是一张图片，ocr 内容为：react-ssr-source EXPLORER OPENEDITORS REACT-SSR-SOURCE 哮api build 13 node_modules public src client components Tayout fedux routes gitignore LICENSE M package.json M README.Md Jswedpack.base.js ShowAllCommands 北C JSwedpack.client.js JSwebpack.serverjs GOToFILEAB FindinFiles 30 StartDebugging F5 TODOS:TREE(166) OUTLINE ToggleTerminal TIMELINE NPMSCRIPTS DEPENDENCIES ACTIONS NODEDEPENDENCIES MAVEN [上证指数:3621.86(+1.12%) LiveShare @GoLive 24min 040 1628.11 WatchSass Quokka Appworks react-ssr/yo.7* Spell -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1630947274390-fa4cfa55-732f-4537-b1cd-8d3af83ee379.png)

# 基本配置
## package.json
`package.json`

```json
{
  "name": "react-ssr-source",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "dev:start:api": "nodemon api/index.js",
    "dev:start": "nodemon build/server.js",
    "dev:build:server": "webpack --config webpack.server.js --watch",
    "dev:build:client": "webpack --config webpack.client.js --watch",
    "dev": "npm-run-all --parallel dev:**"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/lotosv2010/react-ssr-source.git"
  },
  "author": "",
  "license": "ISC",
  "bugs": {
    "url": "https://github.com/lotosv2010/react-ssr-source/issues"
  },
  "homepage": "https://github.com/lotosv2010/react-ssr-source#readme",
  "dependencies": {
    "@babel/runtime": "^7.15.4",
    "@koa/cors": "^3.1.0",
    "antd": "^4.16.13",
    "axios": "^0.21.3",
    "cors": "^2.8.5",
    "koa": "^2.13.1",
    "koa-bodyparser": "^4.3.0",
    "koa-favicon": "^2.1.0",
    "koa-proxies": "^0.12.1",
    "koa-session": "^6.2.0",
    "react": "^17.0.2",
    "react-dom": "^17.0.2",
    "react-redux": "^7.2.5",
    "react-router-config": "^5.1.1",
    "react-router-dom": "^5.3.0",
    "redux": "^4.1.1",
    "redux-logger": "^3.0.6",
    "redux-thunk": "^2.3.0"
  },
  "devDependencies": {
    "@babel/cli": "^7.15.4",
    "@babel/core": "^7.15.4",
    "@babel/plugin-transform-runtime": "^7.15.0",
    "@babel/preset-env": "^7.15.4",
    "@babel/preset-react": "^7.14.5",
    "babel-loader": "^8.2.2",
    "css-loader": "^6.2.0",
    "isomorphic-style-loader": "^5.3.2",
    "koa-router": "^10.1.1",
    "koa-static": "^5.0.0",
    "npm-run-all": "^4.1.5",
    "style-loader": "^3.2.1",
    "webpack": "^5.51.2",
    "webpack-cli": "^4.8.0",
    "webpack-merge": "^5.8.0",
    "webpack-node-externals": "^3.0.0"
  }
}

```

## webpack配置
### webpack.base
`webpack.base.js`

```javascript
const path = require('path');
const webpackNodeExternals = require('webpack-node-externals');

module.exports = {
  target: 'node', // 打包内容将要运行的环境
  mode: 'development',
  entry: './src/server/index.js',
  output: {
    path: path.resolve('build'),
    filename: 'server.js'
  },
  // 检测所有引入的node核心模块，
  // 并且告诉webpack不要把核心模块打包到server.js中去
  externals: [webpackNodeExternals()],
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: [
            '@babel/preset-env',
            '@babel/preset-react',
          ],
          plugins: [
            '@babel/plugin-transform-runtime'
          ]
        }
      }
    ]
  }
}
```

### webpack.server
`webpack.server.js`

```javascript
const path = require('path');
const webpackNodeExternals = require('webpack-node-externals');
const base = require('./webpack.base');
const { merge } = require('webpack-merge');

module.exports = merge(base, {
  target: 'node', // 打包内容将要运行的环境
  entry: './src/server/index.js',
  output: {
    path: path.resolve('build'),
    filename: 'server.js'
  },
  // 检测所有引入的node核心模块，
  // 并且告诉webpack不要把核心模块打包到server.js中去
  externals: [webpackNodeExternals()],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'isomorphic-style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true
            }
          }
        ]
      }
    ]
  }
});

```

### webpack.client
`webpack.client.js`

```javascript
const path = require('path');
const { merge } = require('webpack-merge');
const base = require('./webpack.base');

module.exports = merge(base, {
  entry: './src/client/index.js',
  output: {
    path: path.resolve('public'),
    filename: 'client.js'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true
            }
          }
        ]
      }
    ]
  }
});
```

# server
## index
`src/server/index.js`

```jsx
const Koa = require('koa');
const favicon = require('koa-favicon');
const proxy = require('koa-proxies');
import render from './render';

const app = new Koa();
// 处理静态资源
app.use(require('koa-static')('public'));

// icon
app.use(favicon(__dirname, 'public/client.js'));

// proxy
app.use(proxy('/api', {
  target: 'http://localhost:3002',    
  changeOrigin: true,
  rewrite: path => path,
  logs: true
}))

// 单独创建router的实例
const Router = require('koa-router');
const router = new Router();

router.get('(.*)', async (ctx, next) => {
  await render(ctx, next);
});

// 启动路由
app.use(router.routes()).use(router.allowedMethods());

app.listen(3001, error => {
  if (error) throw error;
  console.log(`App running at:`);
  console.log(`- Local:   http://localhost:3001`)
})
```

## render
`src/server/render.js`

```jsx
import React from 'react';
import {renderToString} from 'react-dom/server';
import {StaticRouter, matchPath} from 'react-router-dom';
import {Provider} from 'react-redux';
import {getServerStore} from '../redux';
import routes from '../routes';
import {renderRoutes, matchRoutes} from 'react-router-config';

export default async function(ctx, next) {
  let notFound = false;
  // 收集每个组件引入的样式
  const context = {csses: []};
  // 创建仓库的时候，仓库里的数据已经有了默认值
  const store = getServerStore(ctx);
  // 获取要渲染的组件
  // matchPath 判断路径和路由对象是否匹配
  const matchedRoutes = matchRoutes(routes, ctx.path);
  const promise = [];
  matchedRoutes.forEach( async ({route}) => {
    if(route.key === '/notFound') {
      notFound = true;
    }
    if(route.loadData) {
      promise.push(new Promise((resolve) => {
        return route.loadData(store).then(resolve, resolve)
      }));
    }
  });
  const data = await Promise.all(promise);
  
  const jsx = renderToString(
    <Provider store={store}>
      <StaticRouter context={context} location={ctx.path}>
        {renderRoutes(routes)}
      </StaticRouter>
    </Provider>);
  const cssStr = context.csses.join('\n');
  const html = `
  <html>
    <head></head>
    <title>react-ssr</title>
    <style>${cssStr}</style>
    <link rel="stylesheet" type="text/css" href='https://unpkg.com/antd@4.17.0-alpha.0/dist/antd.css'>
    <body>
      <div id='root'>${jsx}</div>
      <script>
        window.context = {
          state: ${JSON.stringify(store.getState())}
        }
      </script>
      <script src='/client.js'></script>
    </body>
  </html>`;
  if(notFound) {
    ctx.status = 404;
  } else if(context.action === 'REPLACE') {
    ctx.status = 302;
    ctx.response.redirect(context.url);
  } else {
    ctx.body = html;
  }
}
```

## request
`src/server/request.js`

```javascript
import axios from 'axios';

export default (ctx) => axios.create({
  baseURL: 'http://localhost:3002',
  headers: {
    Cookie: ctx.cookies.get('koa.sess') || ''
  }
});
```

# client
## index
`src/client/index.js`

```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter as Router} from 'react-router-dom';
import {Provider} from 'react-redux';
import {getClientStore} from '../redux';
import {renderRoutes} from 'react-router-config';
import routes from '../routes';

const App = () => (
  <Provider store={getClientStore()}>
    <Router>
      {renderRoutes(routes)}
    </Router>
  </Provider>
);

ReactDOM.hydrate(<App />, document.querySelector('#root'));
```

## request
`src/client/request.js`

```javascript
import axios from 'axios';

export default axios.create({
  baseURL: '/'
});
```

# 组件
## Home
`src/components/Home/index.js`

```javascript
import React, {useEffect} from 'react';
import {connect} from 'react-redux';
import actions from '../../redux/actions/home';
import { List, Avatar } from 'antd';
import {Redirect} from 'react-router-dom';

const Home = (props) => {
  const {getList, list, user} = props;
  useEffect(() => {
    list.length === 0 && getList();
  }, [user])
  return user ? <div>
    <List
      itemLayout="horizontal"
      dataSource={list}
      renderItem={u => (
        <List.Item>
          <List.Item.Meta
            avatar={<Avatar src="https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png" />}
            title={u.id}
            description={u.name}
          />
        </List.Item>
      )}
    />
  </div>: <Redirect to={{pathname: '/login', state: {from: '/'}}} />;
};

const mapToState = state => ({
  ...state.home,
  ...state.session
})

// todo：此方法是用来实现异步加载数据
Home.loadData = (store) => {
  // todo：难点 => dispatch 方法的返回值就是派发的 action，最终返回的是 promise
  return store.dispatch(actions.getList());
}
export default connect(mapToState, actions)(Home);
```

## Counter
`src/components/Counter/index.js`

```javascript
import React from 'react';
import {connect} from 'react-redux';
import actions from '../../redux/actions/counter';
import {Redirect} from 'react-router-dom';
import './index.css';

function Counter(props) {
  const {number, increment, user} = props;

  return user ? (
    <div>
      <p>{number}</p>
      <button onClick={increment}>+</button>
    </div>
  ): <Redirect to={{pathname: '/login', state: {from: '/counter'}}} />;
}

const mapToState = (state) => ({...state.counter, ...state.session})

export default connect(mapToState, actions)(Counter);

```

`src/components/Counter/index.css`

```css
p {
  color: rgb(255, 115, 0);
}
```

## Login
`src/components/Login/index.js`

```javascript
import React from 'react';
import { Form, Input, Button } from 'antd';
import {connect} from 'react-redux';
import actions from '../../redux/actions/session';

function Login(props) {
  const {login, history, location: {state}} = props;
  const onFinish = async (values) => {
    await login(values);
    history.push(state?.from||'/');
  };

  const onFinishFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  return (
    <Form
      name="basic"
      labelCol={{
        span: 8,
      }}
      wrapperCol={{
        span: 10,
      }}
      initialValues={{
        remember: true,
      }}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      autoComplete="off"
      style={{marginTop: 200}}
    >
      <Form.Item
        label="用户名"
        name="username"
        rules={[
          {
            required: true,
            message: 'Please input your username!',
          },
        ]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="密码"
        name="password"
        rules={[
          {
            required: true,
            message: 'Please input your password!',
          },
        ]}
      >
        <Input.Password />
      </Form.Item>
      <Form.Item
        wrapperCol={{
          offset: 12,
          span: 12,
        }}
      >
        <Button type="primary" htmlType="submit">
          登录
        </Button>
      </Form.Item>
    </Form>
  );
}

const mapToState = state => ({
  ...state.session
});

export default connect(mapToState, actions)(Login);
```

## NotFound
`src/components/NotFound/index.js`

```javascript
import React, {useEffect} from 'react';
import { Empty } from 'antd';

function NotFound(props) {
  useEffect(() => {
    // props.staticContext = {notFound: true}; 
  }, [])
  return (
    <Empty description="404, NOT FOUND" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  );
}

export default NotFound;
```

# routes
`src/routes/index.js`

```javascript
import React, {useLayoutEffect} from "react";
import { Layout, Menu, Avatar } from "antd";
import {
  UserOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import {renderRoutes} from 'react-router-config';
import {connect} from 'react-redux';
import actions from '../redux/actions/session';
import styles from './index.css';

const { Header, Content } = Layout;

const BaseLayout = (props) => {
  const {route: {routes}, user, logout, history, location: {pathname}, staticContext} = props;

  const handleClick = async () => {
    user && await logout();
    history.push({pathname: '/login', state: {from: '/'}})
  }

  useLayoutEffect(() => {
    if(props.staticContext) {
      // styles._get 获取处理后的css源码
      props.staticContext.csses.push(styles._get());
    }
  }, [])

  return (
    <Layout className="layout">
      <Layout>
        <Header style={{ position: 'fixed', zIndex: 1, width: '100%',display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{float: 'left', width: 120, height: 31, margin: '16px 24px 16px 0', background: 'rgba(255, 255, 255, 0.2)'}} />
          <Menu theme="dark" mode="horizontal" defaultSelectedKeys={["/"]} selectedKeys={[pathname]} style={{flex: 1}}>
            <Menu.Item key="/" icon={<UserOutlined />}>
              <Link to="/">首页</Link>
            </Menu.Item>
            <Menu.Item key="/counter" icon={<VideoCameraOutlined />}>
              <Link to="/counter">计数器</Link>
            </Menu.Item>
          </Menu>
          <div style={{float: 'right', cursor: 'pointer'}}>
            {user?.username?<Avatar className="avatar_username" size={40} onClick={handleClick}>{user?.username}</Avatar>:null}
          </div>
        </Header>
        <Content style={{ padding: '0 50px', marginTop: 64, height: 'calc(100vh - 64px)'}}>
          {renderRoutes(routes)}
        </Content>
      </Layout>
    </Layout>
  );
}

const mapToState = state => ({
  ...state.session
})

// todo
BaseLayout.loadData = (store) => {
  return store.dispatch(actions.getInfo());
}

export default connect(mapToState, actions)(BaseLayout);
```

`src/routes/index.css`

```css
.layout {
  background-color: aliceblue;
  color: red;
}
.avatar_username {
  color: red;
}
```

# layout
`src/layout/index.js`

```jsx
import React from "react";
import { Layout, Menu, Avatar } from "antd";
import {
  UserOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import {renderRoutes} from 'react-router-config';
import {connect} from 'react-redux';
import actions from '../redux/actions/session';

const { Header, Content } = Layout;

const BaseLayout = (props) => {
  const {route: {routes}, user, logout, getInfo, history, location: {pathname}} = props;

  const handleClick = async () => {
    user && await logout();
    history.push({pathname: '/login', state: {from: '/'}})
  }

  return (
    <Layout>
      <Layout>
        <Header style={{ position: 'fixed', zIndex: 1, width: '100%',display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{float: 'left', width: 120, height: 31, margin: '16px 24px 16px 0', background: 'rgba(255, 255, 255, 0.2)'}} />
          <Menu theme="dark" mode="horizontal" defaultSelectedKeys={["/"]} selectedKeys={[pathname]} style={{flex: 1}}>
            <Menu.Item key="/" icon={<UserOutlined />}>
              <Link to="/">首页</Link>
            </Menu.Item>
            <Menu.Item key="/counter" icon={<VideoCameraOutlined />}>
              <Link to="/counter">计数器</Link>
            </Menu.Item>
          </Menu>
          <div style={{float: 'right', cursor: 'pointer'}}>
            {user?.username?<Avatar size={40} onClick={handleClick}>{user?.username}</Avatar>:null}
          </div>
        </Header>
        <Content style={{ padding: '0 50px', marginTop: 64, height: 'calc(100vh - 64px)'}}>
          {renderRoutes(routes)}
        </Content>
      </Layout>
    </Layout>
  );
}

const mapToState = state => ({
  ...state.session
})

// todo
BaseLayout.loadData = (store) => {
  return store.dispatch(actions.getInfo());
}

export default connect(mapToState, actions)(BaseLayout);
```

# redux
## index
`src/redux/index.js`

```javascript
import {createStore, applyMiddleware} from 'redux';
import thunk from 'redux-thunk';
import logger from 'redux-logger';
import reducers from './reducers';
import clientRequest from '../client/request';
import createServerRequest from '../server/request';

export function getServerStore(ctx) { // 导出方法是防止服务端数据共享的问题
  return createStore(reducers, applyMiddleware(thunk.withExtraArgument(createServerRequest(ctx)), logger));
}

export function getClientStore() {
  // todo: 
  const initState = window.context.state;
  return createStore(reducers, initState, applyMiddleware(thunk.withExtraArgument(clientRequest), logger));
}
```

## action-types
`src/redux/action-types.js`

```jsx
export const INCREMENT = 'INCREMENT';
export const SET_HOME_LIST = 'SET_HOME_LIST';
export const SET_SESSION = 'SET_SESSION';
```

## reducers
### index
`src/redux/reducers/index.js`

```javascript
import {combineReducers} from 'redux';
import counter from './counter';
import home from './home';
import session from './session';

const reducers = combineReducers({
  counter,
  home,
  session
});
export default reducers;
```

### counter
`src/redux/reducers/counter.js`

```javascript
import {INCREMENT} from '../action-types';

const initState = {number: 0};

export default function(state = initState, action) {
  switch (action.type) {
    case INCREMENT:
      return {number: state.number + 1}
    default:
      return state;
  }
}
```

### home
`src/redux/reducers/home.js`

```javascript
import {SET_HOME_LIST} from '../action-types';

const initState = {list: []};

export default function(state = initState, action) {
  const {type, payload} = action
  switch (type) {
    case SET_HOME_LIST:
      return {list: payload}
    default:
      return state;
  }
}
```

### session
`src/redux/reducers/session.js`

```javascript
import {SET_SESSION} from '../action-types';

const initState = {
  user: null,
  success: null,
  error: null
};

export default function(state = initState, action) {
  const {type, payload} = action
  switch (type) {
    case SET_SESSION:
      return payload;
    default:
      return state;
  }
}
```

## actions
### counter
`src/redux/actions/counter.js`

```javascript
import {INCREMENT} from '../action-types';

export default {
  increment() {
    return {type: INCREMENT}
  }
}
```

### home
`src/redux/actions/home.js`

```javascript
import {SET_HOME_LIST} from '../action-types';
import axios from 'axios';

export default {
  getList() {
    // 返回一个函数
    return async function(dispatch, getState, request) {
      // todo
      // 如果是服务器端数据，则直接访问API服务器
      // 如果是客户端，则要访问node服务器，让node服务器访问API服务
      const url = '/api/users';
      const {data} = await request.get(url);
      dispatch({
        type: SET_HOME_LIST,
        payload: data
      })
    }
  }
}
```

### session
`src/redux/actions/session.js`

```javascript
import {SET_SESSION} from '../action-types';
import axios from 'axios';

export default {
  login(formData) {
    return async function(dispatch, getState, request) {
      const url = '/api/login';
      const {data: {data}} = await request.post(url, formData);
      dispatch({
        type: SET_SESSION,
        payload: data
      })
    }
  },
  logout() {
    return async function(dispatch, getState, request) {
      const url = '/api/logout';
      const {data: {data}} = await request.post(url);
      dispatch({
        type: SET_SESSION,
        payload: data
      })
    }
  },
  getInfo() {
    return async function(dispatch, getState, request) {
      const url = '/api/info';
      const {data: {data}} = await request.get(url);
      dispatch({
        type: SET_SESSION,
        payload: data
      })
    }
  }
}
```

# api
## index
`api/index.js`

```javascript
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const session = require('koa-session');
// const cors = require('@koa/cors');
const app = new Koa();

// session
app.keys = ['react-ssr'];
app.use(session(app));

// bodyParser
app.use(bodyParser());

// 单独创建router的实例
const Router = require('koa-router');
const router = new Router();

// 跨域
// app.use(cors());

router.get('/api/users', async (ctx) => {
  // 设置跨域
  // ctx.set('Access-Control-Allow-Origin', '*');
  const users = [{id: 1, name: 'test1'}, {id: 2, name: 'test2'}]
  ctx.body = users;
});

router.post('/api/login', async (ctx) => {
  const user = ctx.request.body;
  ctx.session.user = user;
  ctx.body = {
    code: 0,
    data: {
      user: user,
      success: '登录成功'
    }
  }
})

router.post('/api/logout', async (ctx) => {
  ctx.session.user = null;
  ctx.body = {
    code: 0,
    data: {
      success: '登出成功'
    }
  }
})

router.get('/api/info', async (ctx) => {
  const user = ctx.session.user;
  let res = {}
  if(user) {
    res = {code: 0, data: {error: '' , success: '获取用户信息成功', user}}
  } else {
    res = {code: 1 ,data: {error: '用户未登录', success: ''}}
  }
  ctx.body = res;
})

// 启动路由
app.use(router.routes()).use(router.allowedMethods());

app.listen(3002, error => {
  if (error) throw error;
  console.log(`App running at:`);
  console.log(`- Local:   http://localhost:3002`)
})
```

# 参考
[ReactDOMServer – React](https://zh-hans.reactjs.org/docs/react-dom-server.html)



