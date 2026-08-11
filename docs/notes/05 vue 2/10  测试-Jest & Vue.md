通过前两章节的学习，我相信大家对`Jest`的核心用法已经可以说是掌握了，这一节我们来在Vue中，使用`Jest`

## 一、Vue中集成Jest
我们可以通过`vue`官方提供的`@vue/cli` 直接创建 `Vue` 项目,在创建前需要先安装好 `@vue/cli` 。

这里直接创建项目:

```shell
vue create jest-demo
```



```shell
? Please pick a preset:
  default (babel, eslint)
❯ Manually select features # 手动选择
```



```shell
? Check the features needed for your project:
 ◉ Babel
 ◯ TypeScript
 ◯ Progressive Web App (PWA) Support
 ◉ Router
 ◉ Vuex
 ◯ CSS Pre-processors
 ◯ Linter / Formatter
❯◉ Unit Testing
 ◯ E2E Testing
```



```shell
? Please pick a preset: Manually select features
? Check the features needed for your project: Babel, Router, Vuex, Unit
? Use history mode for router?  # history模式
ion) Yes
? Pick a unit testing solution: Jest # 测试框架选择Jest
? Where do you prefer placing config for Babel, PostCSS, ESLint, etc.? In dedicated config  # 将配置文件产生独立的文件
 files
? Save this as a preset for future projects? (y/N) # 是否保存配置
```



初始化成功后，我们先来查看项目文件，因为我们主要关注的是测试，所以先来查看下`jest.config.js`文件

`jest.config.js`

```javascript
module.exports = {
  moduleFileExtensions: [ // 测试的文件类型
    'js','jsx','json','vue'
  ],
  transform: { // 转化方式
    '^.+\\.vue$': 'vue-jest', // 如果是vue文件使用vue-jest解析
    '.+\\.(css|styl|less|sass|scss|svg|png|jpg|ttf|woff|woff2)$': 'jest-transform-stub', // 如果是图片样式则使用 jest-transform-stub
    '^.+\\.jsx?$': 'babel-jest' // 如果是jsx文件使用 babel-jest
  },
  transformIgnorePatterns: [ // 转化时忽略 node_modules
    '/node_modules/'
  ],
  moduleNameMapper: { // @符号 表示当前项目下的src
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  snapshotSerializers: [ // 快照的配置
    'jest-serializer-vue'
  ],
  testMatch: [ // 默认测试 /test/unit中包含.spec的文件 和__tests__目录下的文件
    '**/tests/unit/**/*.spec.(js|jsx|ts|tsx)|**/__tests__/*.(js|jsx|ts|tsx)'
  ],
  testURL: 'http://localhost/', // 测试地址
  watchPlugins: [ // watch提示插件
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ]
}
```



通过配置文件的查看我们知道了所有测试都应该放在`tests/unit`目录下!

我们可以查看`pacakge.json`来执行对应的测试命令。

我们可以查看`pacakge.json`来执行对应的测试命令

```json
"scripts": {
    "serve": "vue-cli-service serve",
    "build": "vue-cli-service build",
    "test:unit": "vue-cli-service test:unit --watchAll --coverage" // 这里增加个 --watchAll参数
},
```



开始测试 `npm run test:unit`

## 二、测试Vue组件
<font style="color:#2C3E50;">我们先忽略默认</font>`example.spec.js`<font style="color:#2C3E50;">文件，先来自己尝试下如何测试</font>`Vue组件` 。

### 测试HelloWorld组件
`src/components/HelloWorld.vue` 

```vue
<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  props: {
    msg: String
  }
}
</script>

```

`HelloWorld`组件需要提供一个 `msg` 属性，将 `msg` 属性渲染到`h1`标签中， `ok` 我们来编写测试用例。

在`tests/unit`下创建 `HelloWorld.spec.js` 。

`tests/unit/helloWorld.test.js`

```javascript
import Vue from 'vue'
import HelloWorld from '@/components/HelloWorld.vue'

describe('测试Hello World 组件', () => {
  it('传入 msg 属性看能否渲染到h1标签内', () => {
    const baseExtend = Vue.extend(HelloWorld)
    // 获取当前组件的构造函数，并且挂载此组件
    const vm = new baseExtend({
      propsData: {
        msg: 'hello vue'
      }
    }).$mount()
    expect(vm.$el.innerHTML).toContain('hello vue')
  })
})
```

<font style="color:#2C3E50;">这样一个简单的Vue组件就测试成功了,但是写起来感觉不简洁也不方便！所以为了更方便的测试Vue官方提供给我们了个测试工具</font>`Vue Test Utils`<font style="color:#2C3E50;">,而且这个工具为了方便应用，采用了同步的更新策略。</font>

`tests/unit/shallowMount.test.js`

```javascript
import { shallowMount } from '@vue/test-utils'
import HelloWorld from '@/components/HelloWorld.vue'

describe('测试Hello World 组件', () => {
  it('传入 msg 属性看能否渲染到h1标签内', () => {
    const wrapper = shallowMount(HelloWorld, {
      propsData: {
        msg: 'hello vue'
      }
    })
    expect(wrapper.find('h1').text()).toContain('hello vue')
  })
})
```

这样写测试是不是很 `hi` ,可以直接渲染组件传入属性，默认返回`wrapper`，`wrapper`上提供了一系列方法，可以快速的获取 `dom` 元素! 其实这个测试库的核心也是在 `wrapper`的方法上, 更多方法请看 [Vue Test Utils](https://vue-test-utils.vuejs.org/zh/api/wrapper/)

这里的`shallowMount`被译为潜渲染，也就是说`HelloWorld`中引入其他组件是会被忽略掉的，当然也有深度渲染`mount`方法！

刚才写测试的这种方式就是**先编写功能**！编写完成后,我们来**模拟用户的行为进行测试**，而且只测试其中的某个具体的功能！ 这就是我们所谓的 **BDD形式的单元测试**。接下来，我们再来换种思路再来写个组件！



### 测试Todo组件
这回呢，我们来采用**TDD的方式**来测试，也就是**先编写测试用例**

先指定测试的功能: 我们要编写个 `Todo` 组件

+ 当输入框输入内容时会将数据映射到组件实例上
+ 如果输入框为空则不能添加,不为空则新增一条
+ 增加的数据内容为刚才输入的内容

`tests/unit/todo.test.js`

```javascript
import Todo from '@/components/Todo.vue';
import {shallowMount} from '@vue/test-utils'
describe('测试Todo组件',()=>{
    it('当输入框输入内容时会将数据映射到组件实例上',()=>{
        // 1) 渲染Todo组件
        let wrapper = shallowMount(Todo);
        let input = wrapper.find('input');
        // 2.设置value属性 并触发input事件
        input.setValue('hello world');
        // 3.看下数据是否被正确替换
        expect(wrapper.vm.value).toBe('hello world')
    });
    it('如果输入框为空则不能添加,不为空则新增一条',async ()=>{
        let wrapper = shallowMount(Todo);
        let button = wrapper.find('button');
        // 点击按钮新增一条
        wrapper.setData({value:''});// 设置数据为空
        await button.trigger('click');
        expect(wrapper.findAll('li').length).toBe(0);
        wrapper.setData({value:'hello'});// 写入内容
        await button.trigger('click');
        expect(wrapper.findAll('li').length).toBe(1);
    });
    it('增加的数据内容为刚才输入的内容',async ()=>{
        let wrapper = shallowMount(Todo);
        let input = wrapper.find('input');
        let button = wrapper.find('button');
        input.setValue('hello world');
        await button.trigger('click');
        expect(wrapper.find('li').text()).toMatch(/hello world/);
    });
});
```

`src/components/Todo.vue` 

```vue
<template>
  <div>
    <input type="text" v-model="value">
    <button @click="add">添加</button>
    <ul>
      <li v-for="(t, i) in todos" :key="i">{{t}}</li>
    </ul>
  </div>
</template>

<script>
export default {
  name: "Todo",
  data() {
    return {
      value: '',
      todos: []
    }
  },
  methods: {
    add() {
      this.value && this.todos.push(this.value)
    }
  }
};
</script>
```

以上就是我们针对 `Todo` 这个组件进行了单元测试，但是真实的场景中可能会更加复杂,在真实的开发中，我们可能将这个`Todo`组件进行拆分，拆分成`TodoInput`组件和`TodoList`组件和`TodoItem`组件，如果采用单元测试的方式,就需要依次测试每个组件(**单元测试是以最小单元来测试**) 但是单元测试无法保证整个流程是可以跑通的，所以我们在单元测试的基础上还要采用**集成测试**

总结：

**1.单元测试可以保证测试覆盖率高，但是相对测试代码量大，缺点是无法保证功能正常运行**

**2.集成测试粒度大，普遍覆盖率低，但是可以保证测试过的功能正常运行**

**3.一般业务逻辑会采用BDD方式使用集成测试（像测试某个组件的功能是否符合预期）一般工具方法会采用TDD的方式使用单元测试**

**4.对于 UI 组件来说，我们不推荐一味追求行级覆盖率，因为它会导致我们过分关注组件的内部实现细节，从而导致琐碎的测试**

### 测试Vue中的异步逻辑
<font style="color:#2C3E50;">在测试Vue项目中，我们可能会在组件中发送请求，这时我们仍然需要对请求进行mock。</font>

`src/components/AsyncTodo.vue`

```vue
<template>
  <div>
    <input type="text" v-model="value">
    <button @click="add">添加</button>
    <ul>
      <li v-for="(t, i) in todos" :key="i">{{t}}</li>
    </ul>
  </div>
</template>

<script>
import { fetchTodo } from '@/api/index'
export default {
  name: "Todo",
  data() {
    return {
      value: '',
      todos: []
    }
  },
  async created(){
    let data = await fetchTodo();
    this.todos = data || [];
  },
  methods: {
    add() {
      this.value && this.todos.push(this.value)
      console.log(this.todos)
    }
  }
};
</script>
```

<font style="color:#2C3E50;">可以参考上一章节 如何实现</font>`jest`<font style="color:#2C3E50;">进行方法的</font>`mock` 。

`tests/unit/asyncTodo.test.js`

```javascript
import AsyncTodo from "@/components/AsyncTodo.vue";
import { shallowMount } from "@vue/test-utils";
jest.mock("axios");
it("测试 Async Todo 组件", done => {
  let wrapper = shallowMount(AsyncTodo);
  setTimeout(() => {
    expect(wrapper.findAll("li").length).toBe(3);
    done();
  });
});
```

这里使用 `setTimeout` 的原因是我们自己 `mock` 的方法是 `promise` ,所以是微任务，我们期望微任务执行后在进行断言,所以采用 `setTimeout` 进行包裹，保证微任务已经执行完毕! 如果组件中使用的不是 `async、await`形式，也可以使用 `$nextTick`, (新版 `node` 中`await`后的代码会延迟到下一轮微任务执行)

举个例子:

```javascript
function fn(){
    return new Promise((resolve,reject)=>{
        resolve([1,2,3]);
    })
}
async function getData(){
    await fn(); 
    // await fn()  会编译成
    // new Promise((resolve)=>resolve(fn())).then(()=>{
    //     console.log(1)
    // })
    console.log(1);
}
getData();
Promise.resolve().then(data=>{
    console.log(2);
});
```



> 当然不同版本执行效果可能会有差异
>



来简单看下不是`async、await`的写法~~~

```javascript
axios.get('/list').then(res=>{
    this.lists = res.data;
})
```



```javascript
it('测试List组件',()=>{
    let wrapper = shallowMount(AsyncTodo);
    // nextTick方法会返回一个promise,因为微任务是先进先出,所以nextTick之后的内容，会在数据获取之后执行
    return wrapper.vm.$nextTick().then(()=>{
        expect(wrapper.vm.lists).toEqual([1,2,3])
    })
})
```



### 测试Vue中的自定义事件
我们写了一个切换显示隐藏的组件，当子组件触发change事件时可以切换 `p` 标签的显示和隐藏效果。

`src/components/Head.vue`

```vue
<template>
  <div>
    <button @click="change"></button>
  </div>
</template>

<script>
export default {
  methods: {
    change() {
      this.$emit('change')
    }
  }
};
</script>

<style lang="scss" scoped></style>
```

`src/components/Modal.vue`

```vue
<template>
  <div>
    <Head @change="change"></Head>
    <p v-if="visible">这是现实的内容</p>
  </div>
</template>
<script>
import Head from "./Head";
export default {
  components: {
    Head,
  },
  data() {
    return {
      visible: false
    }
  },
  methods: {
    change() {
      this.visible = !this.visible;
    },
  }
};
</script>
```

我们来测试它！可以直接通过`wrapper.find`方法找到对应的组件来发射事件。

`tests/unit/modal.test.js`

```javascript
import Modal from '@/components/Modal.vue';
import Head from '@/components/Head.vue';
import { shallowMount } from '@vue/test-utils'
describe('测试vue中的自定义事件',()=>{
  it('测试 触发change事件后 p标签是否可以切换显示',async ()=>{
    let wrapper = shallowMount(Modal);
    let childWrapper = wrapper.findComponent(Head);
    expect(wrapper.find('p').exists()).toBeFalsy()
    await childWrapper.vm.$emit('change');
    expect(childWrapper.emitted().change).toBeTruthy(); // 检验方法是否被触发
    expect(wrapper.find('p').exists()).toBeTruthy(); // 检验p标签是否显示
  });
});
```



到这里我们对`vue`的组件测试已经基本搞定了，接下来我们再来看下如何对 `Vue` 中的`Vuex`、`Vue-router`进行处理。

