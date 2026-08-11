## 一、Jest的核心应用
在说`Jest`测试之前，先来看看以前我们是怎样测试的。

`src/utils/index.js` 

```javascript
const parser = (str) =>{
    const obj = {};
    str.replace(/([^&=]*)=([^&=]*)/g,function(){
        obj[arguments[1]] = arguments[2];
    });
    return obj;
}
const stringify = (obj) =>{
    const arr = [];
    for(let key in obj){
        arr.push(`${key}=${obj[key]}`);
    }
    return arr.join('&');
}
// console.log(parser('name=test')); // {name:'test'}
// console.log(stringify({name:'test'})) // name=test
```



我们每写完一个功能，会先手动测试功能是否正常，测试后可能会将测试代码注释起来。这样会产生一系列问题，因为会污染源代码，所有的测试代码和源代码混合在一起。如果删除掉，下次测试还需要重新编写。所以测试框架就帮我们解决了上述的问题。



### 分组、用例
`Jest` 是基于模块的，我们需要将代码包装成模块的方式,分别使用 `export` 将 `parser`、`stringify`这两个方法导出。

安装`jest`

```shell
npm init -y # 初始化pacakge.json
npm i jest
```



我们建立一个`utils.test.js`来专门编写测试用例，这里的用例你可以认为就是一条测试功能 （后缀要以 `.test.js` 结尾，这样 `jest` 测试时默认会调用这个文件）。

`tests/unit/utils.test.js` 

```javascript
import { parser, stringify } from '@/utils/index';
it('测试 parser 是否能正常解析结果', () => {
  expect(parser(`name=test`)).toEqual({
    name: 'test'
  })
})
```

`jest`默认自带断言功能，断言的意思就是判断是不是这个样子，我断定你今天没吃饭~，结果你吃了。说明这次断言就失败了，测试就无法通过。

通过配置`scripts` 来执行命令。

`package.json` 

```json
"scripts": {
    "test": "jest"
}
```

<font style="color:#2C3E50;">执行 </font>`npm run test`<font style="color:#2C3E50;">,可惜的是默认在</font>`node`<font style="color:#2C3E50;">环境下不支持</font>`es6模块`<font style="color:#2C3E50;">的语法，需要</font>`babel`<font style="color:#2C3E50;">转义,当然你也可以直接使用 </font>`<font style="color:#2C3E50;">commonjs</font>` <font style="color:#2C3E50;">规范来导出方法，因为大多数现在开发都采用 </font>`<font style="color:#2C3E50;">es6</font>` <font style="color:#2C3E50;">模块，所以就安装一下。</font>

```shell
# core是babel的核心包 preset-env将es6转化成es5
npm i @babel/core @babel/preset-env --save-dev
```

<font style="color:#2C3E50;">并且配置</font>`.babelrc`<font style="color:#2C3E50;">文件，告诉 </font>`<font style="color:#2C3E50;">babel</font>` <font style="color:#2C3E50;">用什么来转义。</font>

`<font style="color:#2C3E50;">.babelrc</font>` 

```javascript
{
    "presets":[
        [
            "@babel/preset-env",{
                "targets": {"node":"current"}
            }
        ]
    ]
}
```

<font style="color:#2C3E50;">默认 </font>`<font style="color:#2C3E50;">jest</font>` <font style="color:#2C3E50;">中集成了</font>`babel-jest`<font style="color:#2C3E50;">,运行时默认会调用</font>`.babelrc`<font style="color:#2C3E50;">进行转义，可以直接将 </font>`<font style="color:#2C3E50;">es6</font>` <font style="color:#2C3E50;">转成 </font>`<font style="color:#2C3E50;">es5</font>` <font style="color:#2C3E50;">语法</font>

<font style="color:#2C3E50;">运行 </font>`npm run test`<font style="color:#2C3E50;"> 出现:</font>

<!-- 这是一张图片，ocr 内容为：工31 robin@Royan:~/Downloadscodezf/test/jest-demo jest-demogit:master)xcpmruntest:uni jest-deme0.ti/wc vue-cli-servicetest:unit PASS tests/unit/utils.spec.js PASS tests/unit/example.spec.js TestSuites:2passed,2total passed,2total Tests: Ototal Snapshots: estimated-2s 1.732s, Time: all test Ran suites. jest-demogit:master)xclear logit:master)x jest-demo -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1611411750836-b7f26525-5ec8-4ead-9ec5-016769a3079a.png)

<font style="color:#2C3E50;">继续编写第二个用例</font>

`tests/unit/utils.test.js`

```javascript
import { parser, stringify } from '@/utils/index';
describe('测试utils库', () => {
  it('测试 parser 是否能正常解析结果', () => {
    expect(parser(`name=test`)).toEqual({
      name: 'test'
    })
  })
  it('测试 stringify 是否能正常使用 stringify', () => {
    expect(stringify({
      name: 'test'
    })).toEqual(`name=test`)
  })
})
```

> <font style="color:#999999;">describe的功能是给用例分组，这样可以更好的给用例分类，其实这就是我们所谓的单元测试，对某个具体函数和功能进行测试</font>
>



### matchers匹配器
在写第一个测试用例时，我们一直在使用`toEqual`其实这就是一个匹配器，那我们来看看`jest`中常用的匹配器有哪些？因为匹配器太多了，所以我就讲些常用的！

为了方便理解，我把匹配器分为三类、判断相等、不等、是否包含。

`tests/unit/utils.test.js`

```javascript
describe('测试matchers库', () => {
  it('判断是否相等', () => {
    expect(1 + 1).toBe(2);
    expect({name: 'test'}).toEqual({
      name: 'test'
    });
    expect(true).toBeTruthy();
    expect(false).toBeFalsy();
  })
  it('判断不相等关系', () => {
    expect(1 + 1).not.toBe(3);
    expect(1 + 1).toBeLessThan(5);
    expect(1 + 1).toBeGreaterThan(1);
  })
  it('判断是否包含', () => {
    expect('hello world').toContain('hello');
    expect('hello world').toMatch(/hello/);
  })
})
```

### 测试操作节点方法
说了半天，我们自己来写个功能测试一下!

`src/utils/index.js`

```javascript
const removeNode = (node) => {
  node.parentNode.removeChild(node)
}

export {
  removeNode
}
```

<font style="color:#2C3E50;">核心就是测试传入一个节点，这个节点是否能从</font>`DOM`<font style="color:#2C3E50;">中删除。</font>

`tests/unit/utils.test.js`

```javascript
describe('测试删除节点', () => {
  it('测试删除节点', () => {
    document.body.innerHTML = `<div><button data-btn="btn"></div>`;
    let btn = document.querySelector('[data-btn="btn"]');
    expect(btn).not.toBeNull();
    removeNode(btn);
    btn = document.querySelector('[data-btn="btn"]');
    expect(btn).toBeNull();
  })
})
```

<font style="color:#2C3E50;">这个就是我们所说的jsdom，在node中操作dom元素。</font>

### Jest常用命令
我们希望每次更改测试后，自动重新执行测试,修改执行命令:

```plain
"scripts": {
    "test": "jest --watchAll"
}
```



重新执行 `npm run test`，这时就会监控用户的修改。

<!-- 这是一张图片，ocr 内容为：T31 cnpmruntest tests/unit/utils.spec.js PASS PASS tests/unit/example.spec.js 2passed,2total TestSuites: 7passed,7total Tests: total Snapshots: 2.123s Time: all testsuites. Ran WatchUsage:Presswtoshowore -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1611414646238-daaa3191-8bce-45c5-98a7-dadbd4e56d41.png)

提示我们按下`w`，显示更多信息

<!-- 这是一张图片，ocr 内容为：L31 cnpmruntest tests/unit/utils.spec.js PASS tests/unit/example.spec.js PASS 2passed,2total TestSuites: 7passed,7total Tests: Ototal Snapshots: 2.393s Time: all testsuites. Ran WatchUsage torunonlyfailedtests. Press Press toonlyruntestsrelatedtochangedfiles pressgtoquitwatchmode Pressptofilterbyafilenameregexpattern. Pressttofilterbyatestnameregexpattern. PressEntertotriggeratestrun. -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1611414544834-1edbf750-861d-496b-adca-ad5280ea6f9a.png)

这里我把每个命令的含义都列好了，有需要可以自己尝试一下~

```shell
 › Press f to run only failed tests.
 › Press o to only run tests related to changed files.
 › Press q to quit watch mode.
 › Press p to filter by a filename regex pattern.
 › Press t to filter by a test name regex pattern.
```

## 二、Jest进阶使用
上一章节，我们已经讲述了 `Jest中` 的基本使用,这一章我们来深度使用 `Jest` 。

在测试中我们会遇到很多问题，像如何测试异步逻辑，如何mock接口数据等...

通过这一章节，可以让你在开发中对 `Jest` 的应用游刃有余，我们来逐一击破吧！

### 异步函数的测试
<font style="color:#2C3E50;">提到异步无非就两种情况，一种是回调函数的方式，一种就是现在流行的promise方式</font>

`src/utils/index.js`

```javascript
const getDataThroughCallback = fn => {
  setTimeout(() => {
    fn({ name: 'test' })
  }, 1000);
}

const getDataThroughPromise = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ name: 'test' })
    }, 1000);
  })
}

export {
  getDataThroughCallback,
  getDataThroughPromise
}
```

<font style="color:#2C3E50;">我们编写</font>`async.test.js`<font style="color:#2C3E50;">方法</font>

`tests/unit/async.test.js`

```javascript
import { getDataThroughCallback, getDataThroughPromise } from '@/utils/index'

describe('异步函数的测试', () => {
  it('测试传入回调函数 获取异步返回结果', (done) => {
    getDataThroughCallback(data => {
      expect(data).toEqual({ name: 'test' })
      done()
    })
  })
  it('测试promise 返回结果, then 方式', () => {
    return getDataThroughPromise().then(data => expect(data).toEqual({ name: 'test' }))
  })
  it('测试promise 返回结果, await方式', async() => {
    const data = await getDataThroughPromise()
    expect(data).toEqual({ name: 'test' })
  })
  it('测试promise 返回结果,自带匹配器', async() => {
    expect(getDataThroughPromise()).resolves.toMatchObject({ name: 'test' })
  })
})
```

## 三、Jest中的mock
### 模拟函数jest.fn()
为什么要模拟函数呢？来看下面这种场景，你要如何测试

`src/utils/index.js`

```javascript
export const myMap = (arr,fn) =>{
   return arr.map(fn)
}
```

<font style="color:#2C3E50;">打眼一看很简单啊，我只需要判断函数的返回结果就可以啦,像这样</font>

`tests/unit/mock.test.js`

```javascript
import { myMap } from "./map";
describe('mock 测试', () => {
  it('mock 测试, jest.fn', () => {
    // 通过jest.fn声明的函数可以被追溯
    let fn = jest.fn(item => item *= 2)
    expect(myMap([1, 2, 3], fn)).toEqual([2, 4, 6])
    // 调用3次
    expect(fn.mock.calls.length).toBe(3)
    // 每次函数返回的值是 2,4,6
    expect(fn.mock.results.map(item => item.value)).toEqual([2, 4, 6])
  })
})
```

<font style="color:#2C3E50;">但是我想更细致一些，像每一次调用函数传入的是否是数组的每一项，函数是否被调用了三次,说的更明确些就是想追溯函数具体的执行过程！</font>

`tests/unit/mock.test.js`

```javascript
import { myMap } from '@/utils/index'

describe('mock 测试', () => {
  it('测试 map方法', () => {
    const fn = item => item * 2
    expect(myMap([1, 2, 3], fn)).toEqual([2, 4, 6])
  })
  it('mock 测试, jest.fn', () => {
    // 通过jest.fn声明的函数可以被追溯
    let fn = jest.fn(item => item *= 2)
    expect(myMap([1, 2, 3], fn)).toEqual([2, 4, 6])
    // 调用3次
    expect(fn.mock.calls.length).toBe(3)
    // 每次函数返回的值是 2,4,6
    expect(fn.mock.results.map(item => item.value)).toEqual([2, 4, 6])
  })
})
```

### 模拟文件jest.mock()
我们希望对接口进行mock，可以直接在 `api` 目录下新建 `__mocks__`目录并在其目录下创建同名文件,将整个文件 `mock` 掉，例如当前文件叫`index.js`

`src/api/index.js` 

```javascript
import axios from "axios";

const fetchUser = ()=>{
  return axios.get('/user')
}
const fetchList = ()=>{
  return axios.get('/list')
}

export {
  fetchUser,
  fetchList
}
```

<font style="color:#2C3E50;">创建</font>`__mocks__/index.js`

`src/api/__mocks__/index.js`

```javascript
export const fetchUser = ()=>{
  return new Promise((resolve,reject)=> resolve({user:'test'}))
}
export const fetchList = ()=>{
  return new Promise((resolve,reject)=>resolve(['香蕉','苹果']))
}
```

<font style="color:#2C3E50;">开始测试</font>

`tests/unit/api.test.js`

```javascript
jest.mock('@/api/index.js') // 使用__mocks__ 下的api.js
import { fetchUser, fetchList} from '@/api/index' // 引入mock的方法

describe('模拟文件jest.mock', () => {
  it('fetchUser测试', async () => {
    const data = await fetchUser()
    expect(data).toEqual({ user:'test' })
  })
  it('fetchList测试', async () => {
    const data = await fetchList()
    expect(data).toEqual(['香蕉','苹果'])
  })
})
```

这里需要注意的是，如果 `mock` 的`index.js`方法不全，在测试时可能还需要引入原文件的方法，那么需要使用`jest.requireActual('@/api/index.js')` 引入真实的文件。

这里我们想这样做是不是有些麻烦呢，其实只是想将真正的请求 `mock` 掉而已，那么我们是不是可以直接`mock axios`方法呢？

在`__mocks__`下创建 `axios.js` 重写 `get` 方法。

`src/api/__mocks__/axios.js`

```javascript
const resMap = new Map([
  ['/user', { user: 'test' }],
  ['/list', ['香蕉','苹果']]
])

const get = (url) => {
  return new Promise((resolve, reject) => {
    resolve(resMap.get(url))
  })
}

export default {
  get
}
```

<font style="color:#2C3E50;">当方法中调用</font>`axios`<font style="color:#2C3E50;">时默认会找</font>`__mocks__/axios.js`

`tests/unit/axios.test.js`

```javascript
jest.mock('axios') // 使用__mocks__ 下的api.js
import { fetchUser, fetchList} from '@/api/index' // 引入mock的方法

describe('模拟文件jest.mock', () => {
  it('fetchUser测试', async () => {
    const data = await fetchUser()
    expect(data).toEqual({ user:'test' })
  })
  it('fetchList测试', async () => {
    const data = await fetchList()
    expect(data).toEqual(['香蕉','苹果'])
  })
})
```

### 模拟Timer
<font style="color:#2C3E50;">接着来看下个案例，我们期望传入一个callback，想看下callback能否被调用！</font>

`src/utils/index.js`

```javascript
const timer = callback=>{
  setTimeout(()=>{
      callback();
  },2000)
}

export {
  timer
}
```

<font style="color:#2C3E50;">因此我们很容易写出了这样的测试用例。</font>

`tests/unit/timer.test.js`

```javascript
import { timer } from '@/utils/index'
describe('模拟Timer', () => {
  it('callback 是否会执行', (done) => {
    const fn = jest.fn()
    timer(fn)
    setTimeout(() => {
      expect(fn).toHaveBeenCalled()
      done()
    }, 2500);
  })
})
```

<font style="color:#2C3E50;">有没有觉得很愚蠢，如果时间很长呢？ 很多个定时器呢？这时候我们想到了</font>`mock Timer`<font style="color:#2C3E50;">。</font>

`tests/unit/useFakeTimers.test.js`

```javascript
import { timer } from '@/utils/index'
jest.useFakeTimers()
describe('模拟Timer', () => {
  it('callback 是否会执行', () => {
    const fn = jest.fn()
    timer(fn)
    // 运行所有定时器，如果需要测试的代码是个秒表呢？
    // jest.runAllTimers();
    
    // 将时间向后移动2.5s
    // jest.advanceTimersByTime(2500);

    // 只运行当前等待定时器
    jest.runOnlyPendingTimers()
    expect(fn).toHaveBeenCalled()
  })
})
```

## 四、Jest中的钩子函数
<font style="color:#2C3E50;">为了测试的便利， </font>`<font style="color:#2C3E50;">Jest</font>` <font style="color:#2C3E50;">中也提供了类似于 </font>`<font style="color:#2C3E50;">Vue</font>` <font style="color:#2C3E50;">一样的钩子函数，可以在执行测试用例前或者后来执行。</font>

`src/utils/Counter.js`

```javascript
class Counter {
  constructor() {
    this.count = 0
  }
  add(count) {
    this.count += count
  }
}
export default Counter

```

`tests/unit/counter.test.js`

```javascript
import Counter from '@/utils/Counter'
describe('Jest中的钩子函数', () => {
  it('测试  counter增加 1 功能', () => {
    // 每个测试用例都需要创建一个counter实例，防止相互影响
    const counter = new Counter()
    counter.add(1)
    expect(counter.count).toBe(1)
  })
  it('测试  counter增加 2 功能', () => {
    // 每个测试用例都需要创建一个counter实例，防止相互影响
    const counter = new Counter()
    counter.add(2)
    expect(counter.count).toBe(2)
  })
})
```

我们发现每个测试用例都需要基于一个新的`counter`实例来测试，防止测试用例间的相互影响,这时候我们可以把重复的逻辑放到钩子中！



**钩子函数**

+ `beforeAll`  在所有测试用例执行前执行
+ `afteraAll`  在所有测试用例执行后
+ `beforeEach`  在每个用例执行前
+ `afterEach`  在每个用例执行后

`tests/unit/hook.test.js`

```javascript
import Counter from '@/utils/Counter'
let counter = null
beforeAll(() => {
  console.log('before all')
})
afterAll(() => {
  console.log('after all')
})
beforeEach(() => {
  console.log('each')
  counter = new Counter()
})
afterEach(() => {
  console.log('after')
})
describe('Jest中的钩子函数', () => {
  it('测试  counter增加 1 功能', () => {
    counter.add(1)
    expect(counter.count).toBe(1)
  })
  it('测试  counter增加 2 功能', () => {
    counter.add(2)
    expect(counter.count).toBe(2)
  })
})
```

> <font style="color:#999999;">钩子函数可以多次注册，一般我们通过describe 来划分作用域</font>
>

`tests/unit/describe.test.js`

```javascript
import Counter from '@/utils/Counter'
let counter = null
const log = console.log
beforeAll(() => log('before all'))
afterAll(() => log('after all'))
beforeEach(() => {
  console.log('each')
  counter = new Counter()
})
afterEach(() => {
  console.log('after')
})
describe('Jest中的钩子函数', () => {
  // 这里注册的钩子只对当前describe下的测试用例生效
  beforeAll(() => log('inner before all'))
  afterAll(() => log('inner after all'))
  it('测试  counter增加 1 功能', () => {
    counter.add(1)
    expect(counter.count).toBe(1)
  })
})

it('测试  counter增加 2 功能', () => {
  counter.add(2)
  expect(counter.count).toBe(2)
})
// before all => inner before=> inner after => after all
// 执行顺序很像洋葱模型 
```

## 五、Jest中的配置文件
我们可以通过jest命令生成jest的配置文件

```shell
npx jest --init
```

1

会提示我们选择配置项：

```shell
➜  unit npx jest --init
The following questions will help Jest to create a suitable configuration for your project
# 使用jsdon
✔ Choose the test environment that will be used for testing › jsdom (browser-like)
# 添加覆盖率
✔ Do you want Jest to add coverage reports? … yes
# 每次运行测试时会清除所有的mock
✔ Automatically clear mock calls and instances between every test? … yes
```

<font style="color:#2C3E50;">在当前目录下会产生一个</font>`jest.config.js`<font style="color:#2C3E50;">的配置文件。</font>

## 六、Jest覆盖率
刚才产生的配置文件我们已经勾选需要产生覆盖率报表，所有在运行时我们可以直接增加 `--coverage`参数

```json
"scripts": {
    "test": "jest --coverage"
}
```



可以直接执行`npm run test`,此时我们当前项目下就会产生coverage报表来查看当前项目的覆盖率。

<!-- 这是一张图片，ocr 内容为：t3 robin@Royan:~/Downloads/codezftest/jest-demo person jest-demoe0.t/ vue-cli-servicetest:unit--coverage tests/unit/api.spec.js PASS tests/unit/axios.spec.js PASS PASS tests/unit/utils.spec.js PASS tests/unit/mock.spec.js C_兴证概念 PASS _0820_1oc tests/unit/example.spec.js PASS tests/unit/async.spec.js %Funcs FiLe %Stmts %BranchI %Lines Line#s Uncovered AlLfiles 100 100 100 100 ECMA-26 100 100 100 100 api index.js 100 100 100 100 100 100 100 100 utils 100 100 index.js 100 100 Suites: 6passed, Test total books.p Tests: 17passed,17total total Snapshots: Time: 6.124s alltest tsuites. Ran jest-demogit:master) -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1611462498165-45bd4a2b-8f32-4f31-a376-6781f13ab726.png)

> 命令行下也会有报表的提示， `jest` 增加覆盖率还是非常方便的~
>

+ `Stmts` 表示语句的覆盖率
+ `Branch` 表示分支的覆盖率(if、else)
+ `Funcs` 函数的覆盖率
+ `Lines` 代码行数的覆盖率

到此我们的`Jest`常见的使用已经基本差不多了！接下我们来看看如何利用 `Jest` 来测试 `Vue` 项目！

