# <font style="color:rgb(51, 51, 51);">Vite</font>
+ [<font style="color:rgb(51, 122, 183);">Vite (法语意为 "快速的"，发音 /vit/)</font>](https://cn.vitejs.dev/)<font style="color:rgb(51, 51, 51);">是下一代前端开发与构建工具</font>
+ <font style="color:rgb(51, 51, 51);">💡</font><font style="color:rgb(51, 51, 51);"> 极速的服务启动 使用原生 ESM 文件，无需打包!</font>
+ <font style="color:rgb(51, 51, 51);">⚡</font><font style="color:rgb(51, 51, 51);">️ 轻量快速的热重载 无论应用程序大小如何，都始终极快的模块热重载（HMR）</font>
+ <font style="color:rgb(51, 51, 51);">🛠️</font><font style="color:rgb(51, 51, 51);"> 丰富的功能 对 TypeScript、JSX、CSS 等支持开箱即用。</font>
+ <font style="color:rgb(51, 51, 51);">📦</font><font style="color:rgb(51, 51, 51);"> 优化的构建 可选 “多页应用” 或 “库” 模式的预配置 Rollup 构建</font>
+ <font style="color:rgb(51, 51, 51);">🔩</font><font style="color:rgb(51, 51, 51);"> 通用的插件 在开发和构建之间共享 Rollup-superset 插件接口。</font>
+ <font style="color:rgb(51, 51, 51);">🔑</font><font style="color:rgb(51, 51, 51);"> 完全类型化的 API 灵活的 API 和完整 TypeS</font>

# <font style="color:rgb(51, 51, 51);">手动搭建</font>
## <font style="color:rgb(51, 51, 51);">安装依赖</font>
```plain
pnpm add vue  -S
pnpm add @vitejs/plugin-vue vite -D
```

## <font style="color:rgb(51, 51, 51);">package.json</font>
```json
{
  "name": "vite-demo",
  "version": "1.0.0",
  "type": "module",
  "description": "",
  "main": "index.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview":  "vite preview"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.5.2",
  "dependencies": {
    "vue": "^3.5.16"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.4",
    "vite": "^6.3.5"
  }
}
```

## <font style="color:rgb(51, 51, 51);">配置文件</font>
```javascript
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
});
```

## <font style="color:rgb(51, 51, 51);">index.html</font>
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vite + Vue</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

## <font style="color:rgb(51, 51, 51);">src</font>
### <font style="color:rgb(51, 51, 51);">main.js</font>
```javascript
import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";

createApp(App).mount("#app");
```

### style.css
```css
:root {
  font-size: 16px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  font-weight: 400;

  color-scheme: light dark;
  color: aliceblue;
  background-color: cadetblue;
}

body {
  margin: 0;
}

#app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}
```

### <font style="color:rgb(51, 51, 51);">App.vue</font>
```vue
<template>
  <div>
    <img src="/vite.svg" class="logo" alt="Vite logo" />
    <img src="./assets/vue.svg" class="logo vue" alt="Vue logo">
    </div>
  <HelloWorld msg="Vite + Vue" />
</template>

<script setup>
  import HelloWorld from './components/HelloWorld.vue';
</script>

<style scoped>
  .logo {
    height: 6em;
    padding: 1.5em;
    will-change: filter;
    transition: filter 300ms;
  }

  .logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
  }

  .logo.vue:hover {
    filter: drop-shadow(0 0 2em #42b883aa);
  }
</style>
```

### components
#### HelloWorld.vue
```vue
<template>
  <div>
    <h3>{{ msg }}</h3>
    <button @click="count++">count is: {{ count }}</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
defineProps({
  msg: {
    type: String,
  }
});
const count = ref(0);
</script>

<style scoped></style>
```

### assets
#### vue.svg
[vue.svg](https://www.yuque.com/attachments/yuque/0/2025/svg/738210/1749697318594-643c0ece-caa3-4276-b138-a21e07899f7f.svg)

## public
### vite.svg
[vite.svg](https://www.yuque.com/attachments/yuque/0/2025/svg/738210/1749697409218-d62e4dc6-c7a5-4d3f-ba22-ef97cf064af2.svg)

## 测试
```shell
pnpm dev     # 开发
pnpm build   # 打包
pnpm preview # 预览
```

# 脚手架搭建
```shell
pnpm create vite
```

# 参考
[开始](https://cn.vitejs.dev/guide/)

