在 `Vue` 项目中测试组件时会引用全局组件，那么如何处理这些全局组件呢？ 还有 `Vue` 中比较重要的一个点`Vuex`如何进行测试？

## 一、测试时使用VueRouter
### 存根
在你的组件中引用了全局组件 `router-link` 或者 `router-view`组件时，我们使用`shallowMount`来渲染会提示无法找到这两个组件，我们可以使用存根的方式`mock`掉相关的组件。

`src/App.vue` 

```vue
<template>
  <div id="app">
    <div id="nav">
      <h1>当前路由:{{this.$route.path}}</h1>
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link>
    </div>
    <router-view/>
  </div>
</template>
```

`tests/unit/router.spec.js` 

```javascript
import App from '@/App.vue'
import { shallowMount } from '@vue/test-utils'

describe('测试vue router', () => {
  it('测试App组件', () => {
    const wrapper = shallowMount(App, {
      // 忽略这两个组件
      stubs: ['router-link', 'router-view'],
      mocks: {
        $route: {
          path: '/'
        }
      }
    })
    expect(wrapper.find('h1').text()).toContain('/')
  })
})
```



> 同理：我们可以mock掉一些全局组件，也可以mock一些参数传入到组件中。
>

## 二、安装VueRouter
我们可以也创建一个`localVue`来安装 `VueRouter` ,传入到组件中进行渲染。 安装 `Vue Router` 之后 `Vue`  的原型上会增加 `$route` 和 `$router` 这两个只读属性。所以不要挂载到基本的 `Vue` 构造函数上,同时也不能通过`mocks`参数重写这两个属性。

`tests/unit/createLocalVue.spec.js`

```javascript
import App from '@/App.vue'
import Home from '@/views/Home.vue'
import About from '@/views/About.vue'
import { createLocalVue, shallowMount } from '@vue/test-utils'
import VueRouter from 'vue-router'
const localVue = createLocalVue()
localVue.use(VueRouter)

describe('测试vue router', () => {
  it('测试App组件', async () => {
    const router = new VueRouter({
      routes: [
        {
          path: '/', component: Home
        },
        {
          path: '/about', component: About
        }
      ]
    })
    const wrapper = shallowMount(App, {
      localVue,
      router
    })
    await router.push('/about')
    expect(wrapper.find('h1').text()).toMatch(/about/)
  })
})
```



