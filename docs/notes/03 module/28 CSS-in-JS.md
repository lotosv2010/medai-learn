# <font style="color:rgb(51, 51, 51);">CSS模块化方案</font>
## <font style="color:rgb(51, 51, 51);">CSS 命名方法</font>
+ <font style="color:rgb(51, 51, 51);">通过人工的方式来约定命名规则</font>
+ [<font style="color:rgb(51, 122, 183);">BEM</font>](https://www.bemcss.com/)<font style="color:rgb(51, 51, 51);">是一种典型的 CSS 命名方法论,BEM的命名规矩就是</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">block-name__element-name--modifier-name</font>`<font style="color:rgb(51, 51, 51);">，也就是模块名 + 元素名 + 修饰器名</font>
+ [<font style="color:rgb(51, 122, 183);">OOCSS</font>](http://oocss.org/)<font style="color:rgb(51, 51, 51);">（Object-Oriented CSS）即面向对象的 CSS，它借鉴了 OOP（面向对象编程）的抽象思维，主张将元素的样式抽象成多个独立的小型样式类，来提高样式的灵活性和可重用性。</font>
+ [<font style="color:rgb(51, 122, 183);">ITCSS</font>](https://itcss.io/)<font style="color:rgb(51, 51, 51);">（Inverted Triangle CSS，倒三角 CSS）是一套方便扩展和管理的 CSS 体系架构，它兼容 BEM、OOCSS、SMACSS 等 CSS 命名方法论</font>
+ [<font style="color:rgb(51, 122, 183);">SMACSS</font>](http://smacss.com/)<font style="color:rgb(51, 51, 51);">即可伸缩及模块化的 CSS 结构</font>

## <font style="color:rgb(51, 51, 51);">CSS Modules</font>
+ <font style="color:rgb(51, 51, 51);">CSS Modules：一个 CSS 文件就是一个独立的模块,核心思想是 通过组件名的唯一性来保证选择器的唯一性，从而保证样式不会污染到组件外</font>
+ [<font style="color:rgb(51, 122, 183);">CSS Modules</font>](https://github.com/css-modules/css-modules)<font style="color:rgb(51, 51, 51);">允许我们像 import 一个 JS Module 一样去 import 一个 CSS Module.每一个 CSS 文件都是一个独立的模块，每一个类名都是该模块所导出对象的一个属性。通过这种方式，便可在使用时明确指定所引用的 CSS 样式。并且，CSS Modules 在打包时会自动将 id 和 class 混淆成全局唯一的 hash 值，从而避免发生命名冲突问题。</font>
+ <font style="color:rgb(51, 51, 51);">使用 CSS Modules 时，推荐配合 CSS 预处理器（Sass/Less/Stylus）一起使用</font>
+ <font style="color:rgb(51, 51, 51);">CSS 预处理器提供了许多有用的功能，如嵌套、变量、mixins、functions 等，同时也让定义本地名称或全局名称变得容易</font>

## <font style="color:rgb(51, 51, 51);">CSS-in-JS</font>
+ <font style="color:rgb(51, 51, 51);">React 的出现，打破了以前</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">关注点分离</font>`<font style="color:rgb(51, 51, 51);">的网页开发原则，因其采用组件结构，而组件又强制要求将 HTML、CSS 和 JS 代码写在一起。表面上看是技术的倒退，实际上并不是</font>
+ <font style="color:rgb(51, 51, 51);">React 是在 JS 中实现了对 HTML 和 CSS 的封装，赋予了 HTML 和 CSS 全新的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">编程能力</font>`<font style="color:rgb(51, 51, 51);">。对于 HTML，衍生了 JSX 这种 JS 的语法扩展，你可以将其理解为</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">HTML-in-JS</font>`<font style="color:rgb(51, 51, 51);">；对于 CSS，衍生出一系列的第三方库，用来加强在 JS 中操作 CSS 的能力，它们被称为</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">CSS-in-JS</font>`
+ <font style="color:rgb(51, 51, 51);">随着 React 的流行以及组件化开发模式的深入人心，这种</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">关注点混合</font>`<font style="color:rgb(51, 51, 51);">的新写法逐渐成为主流</font>
+ <font style="color:rgb(51, 51, 51);">实现</font>
    - [<font style="color:rgb(51, 122, 183);">styled-components</font>](https://github.com/styled-components/styled-components)<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">36.7K</font>
    - [<font style="color:rgb(51, 122, 183);">emotion</font>](https://github.com/emotion-js/emotion)<font style="color:rgb(51, 51, 51);"> 15K</font>

### <font style="color:rgb(51, 51, 51);">案例</font>
+ [<font style="color:rgb(51, 122, 183);">material-ui</font>](https://github.com/mui-org/material-ui)<font style="color:rgb(51, 51, 51);">世界上最受欢迎的 React UI 框架</font>

### <font style="color:rgb(51, 51, 51);">CSS-IN-JS优缺点</font>
+ <font style="color:rgb(51, 51, 51);">优点</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Scoping Styles</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">可以让CSS拥有独立的作用域，实现局部样式，防止样式冲突和影响组件外的内容</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Dead Code Elimination</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">避免无用的CSS样式堆积</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Critical CSS</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">重要的CSS放在头部的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">style</font>`<font style="color:rgb(51, 51, 51);">标签内，其它的CSS异步加载可以减少渲染阻塞</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">State-based styling</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">根据组件的状态动态地生成样式</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">更彻底的封装</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">让组件拥有更好的移植性和重用性</font>
+ <font style="color:rgb(51, 51, 51);">缺点</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Steep learning curve</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">陡峭的学习曲线</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Runtime cost</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">运行时消耗</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Unreadable class names</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">代码可读性差</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">No interoperability</font>`<font style="color:rgb(51, 51, 51);">没有统一的</font><font style="color:rgb(51, 51, 51);"> </font>[<font style="color:rgb(51, 122, 183);">业界标准</font>](https://github.com/cssinjs/istf-spec)

### <font style="color:rgb(51, 51, 51);">选型</font>
+ <font style="color:rgb(51, 51, 51);">我们一定要根据自己的实际情况进行衡量和取舍来确定是不是要在自己的项目中使用它</font>
    - <font style="color:rgb(51, 51, 51);">前端初学者、页面功能简单、重视代码可读性和可维护性不要选择</font>
    - <font style="color:rgb(51, 51, 51);">如果经验丰富、应用交互逻辑复杂、重视封装性和可移植性可以尝试</font>

# <font style="color:rgb(51, 51, 51);">emotion</font>
+ [<font style="color:rgb(51, 122, 183);">emotion</font>](https://emotion.sh/docs/introduction)<font style="color:rgb(51, 51, 51);">是一个用JS编写CSS样式的库</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">emotion</font>`<font style="color:rgb(51, 51, 51);">是新一代的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">CSS-IN-JS</font>`<font style="color:rgb(51, 51, 51);">解决方案</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">CSS-in-JS</font>`<font style="color:rgb(51, 51, 51);">实现是通过生成唯一的CSS选择器来达到CSS局部作用域的效果</font>

## <font style="color:rgb(51, 51, 51);">初始化项目</font>
```shell
pnpm create vite
# Select a framework:
# │  React
# │
# Select a variant:
# │  TypeScript
pnpm install
pnpm dev
```

## <font style="color:rgb(51, 51, 51);">@emotion/css</font>
+ [<font style="color:rgb(51, 122, 183);">@emotion/css</font>](https://www.npmjs.com/package/@emotion/css)<font style="color:rgb(51, 51, 51);">与框架无关，是使用 Emotion 的最简单方法</font>
+ <font style="color:rgb(51, 51, 51);">不需要额外的设置、babel插件或其他配置更改</font>
+ <font style="color:rgb(51, 51, 51);">支持自动供应商前缀、嵌套选择器和媒体查询</font>

### <font style="color:rgb(51, 51, 51);">安装依赖</font>
```shell
pnpm add @emotion/css
```

### <font style="color:rgb(51, 51, 51);">模板字符串</font>
+ <font style="color:rgb(51, 51, 51);">模板字符串可以紧跟在一个函数名后面，该函数将被调用来处理这个模板字符串。这被称为</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">标签模板</font>`<font style="color:rgb(51, 51, 51);">功能</font>
+ <font style="color:rgb(51, 51, 51);">标签模板其实不是模板，而是函数调用的一种特殊形式</font>
+ <font style="color:rgb(51, 51, 51);">标签指的就是函数，紧跟在后面的模板字符串就是它的参数</font>
+ <font style="color:rgb(51, 51, 51);">如果模板字符里面有变量，就不是简单的调用了，而是会将模板字符串先处理成多个参数，再调用函数</font>
+ <font style="color:rgb(51, 51, 51);">模板处理函数的第一个参数（模板字符串数组），还有一个</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">raw</font>`<font style="color:rgb(51, 51, 51);">属性,保存的是转义后的原字符串</font>

```tsx
function tag(stringArr, ...values) {
  console.log(stringArr.raw);
  let output = "";
  let index;
  for (index = 0; index < values.length; index++) {
    output += stringArr[index] + values[index];
  }
  output += stringArr[index]
  return output;
}
let v1 = 1;
let v2 = 2;

let result = tag`a${v1}b${v2}c`;
console.log(result);
```

#### 基本使用
```tsx
// import { css } from '@emotion/css'
import { css } from '../@emotion/css'

const color = `white`
const bgColor = `hotpink`
const className = css`
  padding: 32px;
  background-color: ${bgColor};
  font-size: 24px;
  border-radius: 4px;
  &:hover {
    color: ${color};
  }
`

function App() {

  return <>
    <div className={className}>
      Hello Emotion
    </div>
  </>
}

export default App
```

#### 源码实现
##### @emotion\css
```tsx
export { default as css} from './css';
```

```tsx
import { serializeStyles } from '../serialize';
import { insertStyles } from '../utils';

function css(...args: any[]) {
  const serialized = serializeStyles(args);
  insertStyles(serialized);
  return `css-${serialized.name}`
}

export default css;
```

##### <font style="color:rgb(51, 51, 51);">@emotion\serialize</font>
```tsx
export { default as serializeStyles} from './serializeStyles';
```

```tsx
import { hashString } from '../utils';

function serializeStyles(args: any[]) {
  console.log('serializeStyles', args);
  let styles = '';
  const strings = args[0];
  
  // 处理第一个字符串部分
  styles += strings[0];
  
  // 处理插值表达式和后续字符串
  for (let i = 1; i < args.length; i++) {
    styles += args[i];
    if (strings[i]) {
      styles += strings[i];
    }
  }

  const name = hashString(styles);
  return {
    name,
    styles,
  };
}

export default serializeStyles;
```

##### <font style="color:rgb(51, 51, 51);">@emotion\utils</font>
```tsx
export { default as hashString} from './hashString';
export { default as insertStyles} from './insertStyles'
```

```tsx
export default function hashString(keys: string) {
  let val = 10000000;
  for (let i = 0; i < keys.length; i++) {
    val += keys.charCodeAt(i);
  }
  return val.toString(16).slice(0, 6);
}
```

```tsx
function insertStyles(serialized: {name: string, styles: string}) {
  const className = `css-${serialized.name}`;
  const rule = `.${className}{${serialized.styles}}`
  const tag = document.createElement('style');
  tag.setAttribute('data-emotion', 'css');
  tag.appendChild(document.createTextNode(rule));
  document.head.appendChild(tag);
}

export default insertStyles;
```

### <font style="color:rgb(51, 51, 51);">对象</font>
#### <font style="color:rgb(51, 51, 51);">基本使用</font>
```tsx
// import { css } from '@emotion/css'
import { css } from '../@emotion/css';

const color = `white`
const bgColor = `hotpink`
const className = css({
  padding: 32,
  backgroundColor: bgColor,
  fontSize: 24,
  borderRadius: 4,
  '&:hover': {
    color
  }
})

function App() {

  return <>
    <div className={className}>
      Hello Emotion
    </div>
  </>
}

export default App
```

#### 源码实现
```typescript
import { serializeStyles } from '../serialize';
import { insertStyles } from '../utils';

function processPseudoClasses(serialized: any) {
  if (serialized.pseudoClasses.size) {
    for (const [key, value] of serialized.pseudoClasses.entries()) {
      console.log(key, value);
      const k = key.slice(1)
      insertStyles({
        name: `${serialized.name}${k}`,
        styles: value
      })
    }
  }
}

function css(...args: any[]) {
  const serialized = serializeStyles(args);
  insertStyles(serialized);
  // 处理伪类
  processPseudoClasses(serialized);
  return `css-${serialized.name}`
}

export default css;
```

```tsx
import { hashString } from '../utils';

// 存储伪类
const pseudoClasses = new Map();
/**
 * 创建字符串
 * @param obj 
 */
const createStringFromObject = (obj: Record<string, any>): string => {
  const styles = Object.keys(obj).reduce((acc: string, key: string) => {
    const value = obj[key];
    // 处理key，将驼峰转为-
    const k = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    if (typeof value === 'string') {
      return `${acc}${k}:${value};`;
    }
    if (typeof value === 'number') {
      return `${acc}${k}:${value}px;`;
    }
    if (typeof value === 'object') {
      // 存储伪类
      if (k.startsWith('&:')) {
        pseudoClasses.set(k, createStringFromObject(value));
        return acc
      }
      return `${acc}${k}:${createStringFromObject(value)}`;
    }
    return acc;
  }, '')
  return styles;
}

/**
 * 处理插值
 * @param interpolation 
 * @returns 
 */
const handleInterpolation = (interpolation: any): string => {
  switch (typeof interpolation) {
    case 'object':
      return createStringFromObject(interpolation);
    default:
      return '';
  }
}

function serializeStyles(args: any[]) {
  let styles = '';
  const strings = args[0];

  if (strings.raw === undefined) {
    // 如果第一个参数不是模板字符串，则将其视为样式对象
    pseudoClasses.clear();
    styles = handleInterpolation(strings);
  } else {
    // 处理第一个字符串部分
    styles += strings[0];
    // 如果第一个参数是模板字符串，则将其视为样式字符串
    for (let i = 1; i < args.length; i++) {
      styles += args[i];
      if (strings[i]) {
        styles += strings[i];
      }
    }
  }

  const name = hashString(styles);
  return {
    name,
    styles,
    pseudoClasses
  };
}

export default serializeStyles;
```

## <font style="color:rgb(51, 51, 51);">@emotion/react</font>
+ [<font style="color:rgb(51, 122, 183);">@emotion/react</font>](https://www.npmjs.com/package/@emotion/react)<font style="color:rgb(51, 51, 51);">包需要React</font>
+ <font style="color:rgb(51, 51, 51);">最好将React与可配置的构建环境一起使用</font>
+ <font style="color:rgb(51, 51, 51);">css属性支持</font>
    - <font style="color:rgb(51, 51, 51);">类似于</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">style prop</font>`<font style="color:rgb(51, 51, 51);">，但也支持自动供应商前缀、嵌套选择器和媒体查询</font>

```shell
pnpm add @emotion/react @emotion/babel-plugin
```

+ <font style="color:rgb(51, 51, 51);">pragma(注解) and pragmaFrag cannot be set when runtime is automatic.</font>

### <font style="color:rgb(51, 51, 51);">vite.config.js</font>
```tsx
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react({
    jsxImportSource: "@emotion/react",
    babel: {
      plugins: [[
        "@emotion/babel-plugin",
        {
          "sourceMap": true,
          // "autoLabel": "dev-only",
          // "labelFormat": "[local]",
          // "cssPropOptimization": true
        }
      ]],
    },
  })]
})
```

### vite-env.d.ts
```typescript
/// <reference types="vite/client" />
/// <reference types="@emotion/react/types/css-prop" />
```

### 基本使用
```tsx
// import { css } from '@emotion/react';
import { css } from '../@emotion/react';

const color = `white`
const bgColor = `hotpink`
const styles = css({
  padding: 32,
  backgroundColor: bgColor,
  fontSize: 24,
  borderRadius: 4,
  '&:hover': {
    color
  }
})


function App() {

  return <div css={styles}>
    Hello Emotion
  </div>
}

export default App
```

### 源码实现
#### <font style="color:rgb(51, 51, 51);">@emotion\react</font>
```tsx
export { default as css } from './css';
export { default as jsx } from './jsx';
```

```tsx
import { serializeStyles, serializePseudo } from '../serialize'
function css(...args: any[]) {
  const serialized = serializeStyles(args);
  serializePseudo(serialized);
  return serialized;
}

export default css;
```

```tsx
import Emotion from '../components/Emotion';
function jsx(type: any, props: any, ...children: any[]) {
  return (
    <Emotion {...props} type={type}>
      {children}
    </Emotion >
  )
}
export default jsx;
```

#### <font style="color:rgb(51, 51, 51);">@emotion\</font>components
```tsx
import { serializeStyles } from '../serialize';
import Insertion from './Insertion';

function Emotion(props: any) {
  const serialized = serializeStyles(props.css);
  const {...newProps } = props
  newProps.className = 'css' + "-" + serialized.name;
  const WrappedComponent = props.type;

  return (
    <div>
      <Insertion serialized={serialized} />
      <WrappedComponent {...newProps} />
    </div>
  )
}

export default Emotion;
```

```tsx
import { useLayoutEffect } from 'react';
import { insertStyles } from '../utils';
function Insertion({ serialized }: any) {
  useLayoutEffect(() => {
    insertStyles(serialized);
  });
  return null;
};
export default Insertion;
```

#### <font style="color:rgb(51, 51, 51);">@emotion\serialize</font>
```tsx
export { default as serializeStyles} from './serializeStyles';
export { default as serializePseudo} from './serializePseudo';
```

```tsx
import { hashString } from '../utils';

// 存储伪类
const pseudoClasses = new Map();
/**
 * 创建字符串
 * @param obj 
 */
const createStringFromObject = (obj: Record<string, any>): string => {
  const styles = Object.keys(obj).reduce((acc: string, key: string) => {
    const value = obj[key];
    // 处理key，将驼峰转为-
    const k = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    if (typeof value === 'string') {
      return `${acc}${k}:${value};`;
    }
    if (typeof value === 'number') {
      return `${acc}${k}:${value}px;`;
    }
    if (typeof value === 'object') {
      // 存储伪类
      if (k.startsWith('&:')) {
        pseudoClasses.set(k, createStringFromObject(value));
        return acc
      }
      return `${acc}${k}:${createStringFromObject(value)}`;
    }
    return acc;
  }, '')
  return styles;
}

/**
 * 处理插值
 * @param interpolation 
 * @returns 
 */
const handleInterpolation = (interpolation: any): string => {
  switch (typeof interpolation) {
    case 'object':
      return createStringFromObject(interpolation);
    default:
      return '';
  }
}

function serializeStyles(args: any) {
  if (typeof args === 'object' && args.styles !== undefined) {
    return args;
  }
  console.log('serializeStyles', args);
  let styles = '';
  const strings = args[0];

  if (strings.raw === undefined) {
    // 如果第一个参数不是模板字符串，则将其视为样式对象
    pseudoClasses.clear();
    styles = handleInterpolation(strings);
  } else {
    // 处理第一个字符串部分
    styles += strings[0];
    // 如果第一个参数是模板字符串，则将其视为样式字符串
    for (let i = 1; i < args.length; i++) {
      styles += args[i];
      if (strings[i]) {
        styles += strings[i];
      }
    }
  }

  const name = hashString(styles);
  console.log(name, styles, pseudoClasses);
  return {
    name,
    styles,
    pseudoClasses
  };
}

export default serializeStyles;
```

```tsx
import { insertStyles } from '../utils';

function serializePseudo(serialized: any) {
  if (serialized.pseudoClasses.size) {
    for (const [key, value] of serialized.pseudoClasses.entries()) {
      console.log(key, value);
      const k = key.slice(1)
      insertStyles({
        name: `${serialized.name}${k}`,
        styles: value
      })
    }
  }
}

export default serializePseudo;
```

## <font style="color:rgb(51, 51, 51);">@emotion/styled</font>
+ [<font style="color:rgb(51, 122, 183);">styled</font>](https://emotion.sh/docs/@emotion/styled)<font style="color:rgb(51, 51, 51);">是一种创建附加样式的React组件的方法</font>

```shell
pnpm add @emotion/styled
```

### <font style="color:rgb(51, 51, 51);">基本使用</font>
#### <font style="color:rgb(51, 51, 51);">使用</font>
```tsx
// import styled from '@emotion/styled';
import styled from '../@emotion/styled';

const color = `white`
const bgColor = `hotpink`

const Div = styled.div({
  padding: 32,
  backgroundColor: bgColor,
  fontSize: 24,
  borderRadius: 4,
  '&:hover': {
    color
  }
})

const AnotherComp = styled.div`
color: green;
`

function App() {

  return <Div>
    Hello Emotion
    <AnotherComp>Another Comp</AnotherComp>
  </Div>
}

export default App;
```

#### <font style="color:rgb(51, 51, 51);">源码实现</font>
##### @emotion\styled
```tsx
import { serializeStyles } from '../serialize';
import Insertion from '../components/Insertion';
function createStyled(tag: any) {
  return function (...args: any[]) {
    function Styled(props: any) {
      const serialized = serializeStyles(args);
      const className = 'css' + "-" + serialized.name;
      const newProps = { ...props };
      newProps.className = className;
      const FinalTag = tag;
      return (
        <>
          <Insertion serialized={serialized} />
          <FinalTag {...newProps} />
        </>
      )
    }
    return Styled;
  }
}
const tags = ['button', 'div'];
const newStyled: any = createStyled.bind(null); // 复制一份函数
tags.forEach(function (tagName) {
  newStyled[tagName] = newStyled(tagName);
});
export default newStyled;
```

##### <font style="color:rgb(51, 51, 51);">@emotion\</font>components
```tsx
import { useLayoutEffect } from 'react';
import { insertStyles } from '../utils';
import { serializePseudo} from '../serialize';

function Insertion({ serialized }: any) {
  useLayoutEffect(() => {
    insertStyles(serialized);
    // 处理伪类
    serializePseudo(serialized);
  });
  return null;
};
export default Insertion;
```

##### @emotion\serialize
```tsx
import { hashString } from '../utils';

// 存储伪类
const pseudoClasses = new Map();
/**
 * 创建字符串
 * @param obj 
 */
const createStringFromObject = (obj: Record<string, any>): string => {
  const styles = Object.keys(obj).reduce((acc: string, key: string) => {
    const value = obj[key];
    // 处理key，将驼峰转为-
    const k = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    if (typeof value === 'string') {
      return `${acc}${k}:${value};`;
    }
    if (typeof value === 'number') {
      return `${acc}${k}:${value}px;`;
    }
    if (typeof value === 'object') {
      // 存储伪类
      if (k.startsWith('&:')) {
        pseudoClasses.set(k, createStringFromObject(value));
        return acc
      }
      return `${acc}${k}:${createStringFromObject(value)}`;
    }
    return acc;
  }, '')
  return styles;
}

/**
 * 处理插值
 * @param interpolation 
 * @returns 
 */
const handleInterpolation = (interpolation: any): string => {
  switch (typeof interpolation) {
    case 'object':
      return createStringFromObject(interpolation);
    default:
      return '';
  }
}

function serializeStyles(args: any) {
  if (typeof args === 'object' && args.styles !== undefined) {
    return args;
  }
  let styles = '';
  const strings = args[0];

  if (strings.raw === undefined) {
    // 如果第一个参数不是模板字符串，则将其视为样式对象
    styles = handleInterpolation(strings);
  } else {
    // 处理第一个字符串部分
    styles += strings[0];
    // 如果第一个参数是模板字符串，则将其视为样式字符串
    for (let i = 1; i < args.length; i++) {
      styles += args[i];
      if (strings[i]) {
        styles += strings[i];
      }
    }
  }

  const name = hashString(styles);
  return {
    name,
    styles,
    pseudoClasses
  };
}

export default serializeStyles;
```

```tsx
import { insertStyles } from '../utils';

function serializePseudo(serialized: any) {
  if (serialized.pseudoClasses.size) {
    for (const [key, value] of serialized.pseudoClasses.entries()) {
      const k = key.slice(1)
      insertStyles({
        name: `${serialized.name}${k}`,
        styles: value
      })
    }
    serialized.pseudoClasses.clear();
  }
}

export default serializePseudo;
```

### <font style="color:rgb(51, 51, 51);">根据props属性覆盖样式</font>
#### <font style="color:rgb(51, 51, 51);">使用</font>
```tsx
// import styled from '@emotion/styled';
import styled from '../@emotion/styled';

const color = `white`
const bgColor = `hotpink`

const Div = styled.div({
  padding: 32,
  backgroundColor: bgColor,
  fontSize: 24,
  borderRadius: 4,
  '&:hover': {
    color
  }
})

const AnotherComp = styled.div`
color: ${(props: any) => props.color};
`

function App() {

  return <Div>
    Hello Emotion
    <AnotherComp color='green'>Another Comp</AnotherComp>
  </Div>
}

export default App
```

#### <font style="color:rgb(51, 51, 51);">源码实现</font>
##### <font style="color:rgb(51, 51, 51);">@emotion\styled</font>
```tsx
import { serializeStyles } from '../serialize';
import Insertion from '../components/Insertion';
function createStyled(tag: any) {
  return function (...args: any[]) {
    function Styled(props: any) {
      const serialized = serializeStyles(args, props);
      const className = 'css' + "-" + serialized.name;
      const newProps = { ...props };
      newProps.className = className;
      const FinalTag = tag;
      return (
        <>
          <Insertion serialized={serialized} />
          <FinalTag {...newProps} />
        </>
      )
    }
    return Styled;
  }
}
const tags = ['button', 'div'];
const newStyled: any = createStyled.bind(null);
tags.forEach(function (tagName) {
  newStyled[tagName] = newStyled(tagName);
});
export default newStyled;
```

##### <font style="color:rgb(51, 51, 51);">@emotion\serialize</font>
```tsx
import { hashString } from '../utils';

// 存储伪类
const pseudoClasses = new Map();
/**
 * 创建字符串
 * @param obj 
 */
const createStringFromObject = (obj: Record<string, any>): string => {
  const styles = Object.keys(obj).reduce((acc: string, key: string) => {
    const value = obj[key];
    // 处理key，将驼峰转为-
    const k = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    if (typeof value === 'string') {
      return `${acc}${k}:${value};`;
    }
    if (typeof value === 'number') {
      return `${acc}${k}:${value}px;`;
    }
    if (typeof value === 'object') {
      // 存储伪类
      if (k.startsWith('&:')) {
        pseudoClasses.set(k, createStringFromObject(value));
        return acc
      }
      return `${acc}${k}:${createStringFromObject(value)}`;
    }
    return acc;
  }, '')
  return styles;
}

/**
 * 处理插值
 * @param interpolation 
 * @returns 
 */
const handleInterpolation = (interpolation: any, props: any): string => {
  switch (typeof interpolation) {
    case 'object':
      return createStringFromObject(interpolation);
    case 'function':
      if(props !== undefined) {
        const result = interpolation(props);
        return handleInterpolation(result, props);
      }
      return interpolation;
    default:
      return interpolation;
  }
}

function serializeStyles(args: any, props?: any) {
  if (typeof args === 'object' && args.styles !== undefined) {
    return args;
  }
  let styles = '';
  const strings = args[0];

  if (strings.raw === undefined) {
    // 如果第一个参数不是模板字符串，则将其视为样式对象
    styles = handleInterpolation(strings, props);
  } else {
    // 处理第一个字符串部分
    styles += strings[0];
    // 如果第一个参数是模板字符串，则将其视为样式字符串
    for (let i = 1; i < args.length; i++) {
      styles +=  handleInterpolation(args[i], props);
      if (strings[i]) {
        styles += strings[i];
      }
    }
  }
  
  const name = hashString(styles);
  return {
    name,
    styles,
    pseudoClasses
  };
}

export default serializeStyles;
```

### <font style="color:rgb(51, 51, 51);">为组件添加样式</font>
```tsx
import styled from '@emotion/styled'

function Hello({ className }: any) {
  return <div className={className}>Hello</div>
}
const RedHello = styled(Hello)`
  color: red;
  background-color: green;
`
function App() {
  return (
    <RedHello>Button</RedHello>
  )
}
export default App;
```

### <font style="color:rgb(51, 51, 51);">父组件设置子组件</font>
```css
.css-1wvgi8y-Parent{background:green;}
.css-10c6c3i-Child{color:red;}
.css-1wvgi8y-Parent .eesff8e1{color:blue;}
```

```html
<div class="css-1wvgi8y-Parent eesff8e0">
  <div class="css-10c6c3i-Child eesff8e1">App</div>
</div>
```

```tsx
import styled from '@emotion/styled';

const Child: any = styled.div({
  color: 'red'
})

const Parent = styled.div({
  background: 'green',
  [Child]: {
    color: 'blue'
  }
})
function App() {
  return (
    <>
      <Parent>
        <Child>Child</Child>
      </Parent>
      <Child>Child</Child>
    </>
  )
}
export default App;
```

### <font style="color:rgb(51, 51, 51);">嵌套选择器</font>
```tsx
import styled from '@emotion/styled';

const Container = styled.div`
  width:200px;
  height:200px;
  background:lightgray;
  &:hover{
    background:pink;
  }
  & > p {
    color:green;
  }
`
function App() {
  return (
    <Container>
      Container
      <p>span</p>
    </Container>
  )
}
export default App
```

### <font style="color:rgb(51, 51, 51);">as属性</font>
+ <font style="color:rgb(51, 51, 51);">要使用组件内的样式，但要更改呈现的元素，可以使用as属性</font>

```tsx
import styled from '@emotion/styled';

const Button = styled.button`
  color:red
`

function App() {
  return (
    <Button as="a">
      Button
    </Button>
  )
}
export default App;
```

## <font style="color:rgb(51, 51, 51);">组合样式</font>
```tsx
import { css } from '@emotion/react';

const base = css`
  color: white;
`
const warning = css`
  background: orange;
`

function App() {
  return (
    <div css={[base, warning]}>DIV</div>
  )
}
export default App;
```

## <font style="color:rgb(51, 51, 51);">全局样式</font>
```tsx
import { css, Global } from '@emotion/react';

const reset = css`
  body{
    margin:0;
  }
  a{
    color:red;
  }
`
function App() {
  return (
    <>
      <Global styles={reset} />
      <a>我是a标记</a>
    </>
  )
}
export default App;
```

## <font style="color:rgb(51, 51, 51);">关键帧动画</font>
```tsx
import { css, keyframes } from '@emotion/react';

const bounce = keyframes`
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(100px);
  }
`
const base = css`
  width:100px;
  height:100px;
  background: green;
  position: absolute;
  animation: ${bounce} 1s ease infinite alternate;
`;

function App() {
  return (
    <div css={[base]}>
      文本
    </div>
  )
}
export default App;
```

# 参考
[Emotion – Introduction](https://emotion.sh/docs/introduction)

