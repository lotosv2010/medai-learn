## 一、Vuex的测试
我们通过一个计数器的例子来掌握如何测试vuex。

```vue
<template>
  <div>
    {{ this.$store.state.number }}
    <button @click="add(3)">添加</button>
  </div>
</template>
<script>
import { mapActions } from "vuex";
export default {
  methods: {
    ...mapActions({ add: "increment" }),
  },
};
</script>
```



编写`store/index.js`

```javascript
import Vue from 'vue'
import Vuex from 'vuex'
import config from './counter'
Vue.use(Vuex)
export default new Vuex.Store(config)
```



编写`store/counter/mutations.js`

```javascript
export default {
  increment(state,count){
    state.number+=count
  }
}
```



编写`store/counter/actions.js`

```javascript
export default {
  increment({ commit }, count) {
    setTimeout(() => {
      commit("increment", count);
    }, 1000);
  }
};
```



编写`store/counter/index.js`

```javascript
import mutations from "./mutations";
import actions from "./actions";
export default {
  state: {
    number: 0
  },
  mutations,
  actions
};
```



这里我们就不过多的详细讲解vuex的执行过程了，直接开始测试啦！



### 单元化测试store
我们可以直接把 `store` 中的方法一一进行单元测试

就是一个个测试函数，但是需要 `mock`  `commit`和`dispatch`方法

`test/unit/vuex.spec.js` 

```javascript
import mutations from '@/store/counter/mutations';
import actions from '@/store/counter/actions';
describe('单元化测试store', () => {
  jest.useFakeTimers();
  it('测试mutation',()=>{
      const state = {number:0}
      mutations.increment(state,2);
      expect(state.number).toBe(2);
  });
  it('测试action',()=>{
      let commit = jest.fn();
      actions.increment({commit},2);
      jest.advanceTimersByTime(2000);
      expect(commit).toBeCalled();
      expect(commit.mock.calls[0][1]).toBe(2);
  });
})
```



### 测试运行的store
就是产生一个 `store` ,进行测试好处是不需要`mock`任何方法

`test/unit/vuex.spec.js`

```javascript

import Vuex from 'vuex';
import {createLocalVue} from '@vue/test-utils'
import config from '@/store/counter/index';
describe('测试运行的store', () => {
  jest.useFakeTimers();
  it('测试是否可以异步增加 1',()=>{
    let localVue = createLocalVue();
    localVue.use(Vuex);
    let store = new Vuex.Store(config); // 创建一个运行store
    expect(store.state.number).toBe(0);
    store.dispatch('increment',2);
    jest.advanceTimersByTime(2000); // 前进2s
    expect(store.state.number).toBe(2); 
  });
})
```



> index文件最好每次测试时克隆一份，保证每个用例间互不干扰！
>



### 测试组件中的Vuex
`mock store`传入组件中，看函数是否能够如期调用

`test/unit/vuex.spec.js`

```javascript
import Vuex from 'vuex';
import Counter from '@/components/Counter';
import {createLocalVue,shallowMount} from '@vue/test-utils'
describe('测试组件中的Vuex', () => {
  let localVue = createLocalVue();
  localVue.use(Vuex);
  let store;
  let actions;
  beforeEach(()=>{
      actions = {
          increment:jest.fn()
      }
      store = new Vuex.Store({
          actions,
          state:{}
      });
  });
  it('测试组件中点击按钮 是否可以 1',()=>{
      let wrapper = shallowMount(Counter,{
          localVue,
          store
      });
      wrapper.find('button').trigger('click');
      // 测试actions中的increment 方法是否能正常调用
      expect(actions.increment).toBeCalled();
  })
})
```



> 到这里`Vuex`测试的方式我们就讲解完毕了, 其实前端自动化测试并不难~，大家多多练习就可以完全掌握啦!
>



