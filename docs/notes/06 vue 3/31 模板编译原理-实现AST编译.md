# 源码实现
## packages
### compiler-dom
#### src
##### index.ts
```diff
+import { baseCompile, baseParse, transform,generate, ParseOptions, CompilerOptions } from '@g-vue-next/compiler-core'
+import { extend } from '@g-vue-next/shared'
+import { parserOptions } from './parserOptions'
+import { CodegenResult } from 'packages/compiler-core/src/codegen'

+// TODO 编译三部曲
+// 1.解析模板，生成ast
+// 2.转换ast节点，主要针对指令进行处理
+// 3.生成代码（ast 转换成 js）

+export function compile(
+  src: string,
+  options: CompilerOptions = {}
+): CodegenResult {
+  return baseCompile(src, extend({}, parserOptions, options)) as any
+}

+export function parse(template: string, options: ParseOptions = {}) {
+  return baseParse(template, extend({}, parserOptions, options))
+}

export * from '@g-vue-next/compiler-core'
```

##### parserOptions.ts
```typescript
import { ParseOptions } from "@g-vue-next/compiler-core";
import { isHTMLTag, isMathMLTag, isSVGTag, isVoidTag } from "@g-vue-next/shared";

export const parserOptions: ParseOptions = {
  parseMode: 'html',
  isVoidTag,
  isNativeTag: tag => isHTMLTag(tag) || isSVGTag(tag) || isMathMLTag(tag),
  isPreTag: tag => tag === 'pre',
  isBuiltInComponentTag: tag => tag === 'Transition' || tag === 'TransitionGroup',
}
```

### compiler-core
#### src
##### index.ts
```diff
export { baseParse } from './parser'
export { transform } from './transform'
export { generate } from './codegen'
export { baseCompile } from './compile'
+export * from './options'
```

##### parser.ts
```diff
-export function baseParse(input: string, options?: any) {}
+import { createRoot, NodeTypes } from "./ast"

+export interface ParserContext {
+  originalSource: string
+  source: string
+  line: number
+  column: number
+  offset: number
+}

+function createParserContext(content: string): ParserContext {
+  return {
+    originalSource: content,
+    source: content,
+    line: 1,
+    column: 1,
+    offset: 0,
+  }
+}

+function isEnd(context: ParserContext) {
+  const c = context.source
+  // 如果源字符串中包含有 </ 字符串，则为 停止
+  if (c.startsWith('</')) {
+    return true
+  }
+  return !c
+}

+function advanceBy(context: ParserContext, length: number) {
+  const str = context.source
+  context.source = context.source.slice(length)
+  advancePositionWithMutation(context, str, length)
+}

+function advanceSpaces(context: ParserContext) {
+  const match = /^[ \t\r\n]+/.exec(context.source)
+  if (match) {
+    advanceBy(context, match[0].length)
+  }
+}

+function advancePositionWithMutation(context: ParserContext, str: string, endIndex: number) {
+  let linesCount = 0
+  let returnLine = -1
+  for (let i = 0; i < endIndex; i++) { 
+    // 如果是换行，需要换行处理
+    if (str.charCodeAt(i) === 10) {
+      linesCount++
+      returnLine = i // 记录回车换行的索引
+    }
+  }
+  context.line += linesCount // 计算行号
+  context.offset += endIndex // 计算偏移量
+  // 计算列数
+  context.column = returnLine === -1 ? context.column + endIndex : endIndex - returnLine
+}

+function parseTextData(context: ParserContext, length: number): string {
+  
+  const rawText = context.source.slice(0, length)
+  advanceBy(context, length)
+  return rawText.replace(/[\n\t\r\f ]+/g, ' ').trim()
+}

+function parseText(context: ParserContext): any {
+  const tokes = ['<', '{{'] // 找当前离得最近的开始token
+  let endIndex = context.source.length // 假设结束索引值为源代码的长度
+
+  for(let i =0; i < tokes.length; i++) {
+    const index = context.source.indexOf(tokes[i], 1)
+    if (index > -1 && endIndex > index) {
+      endIndex = index
+    }
+  }
+  const start = getCursor(context)
+  const content = parseTextData(context, endIndex)
+
+  return {
+    type: NodeTypes.TEXT,
+    content,
+    loc: getSelection(context, start),
+  }
+}

+function getCursor(context: ParserContext): any {
+  const { offset, column, line } = context
+  return { offset, line, column }
+}

+function getSelection(context: ParserContext, start: any, end?: any) {
+  if (!end) {
+    end = getCursor(context)
+  }
+  return {
+    start,
+    end,
+    source: context.originalSource.slice(start.offset, end.offset),
+  }
+}

+function isQuote(text: string) {
+  return text === '"' || text === "'" || text === '`'
+}

+function parseAttributeValue(context: ParserContext): any {
+  let content
+  const quote = context.source[0]
+
+  if (isQuote(quote)) {
+    advanceBy(context, 1)
+    const endIndex = context.source.indexOf(quote)
+    content = parseTextData(context, endIndex)
+    advanceBy(context, 1)
+  } else {
+    advanceSpaces(context)
+    content = context.source.match(/([^ \t\r\n/>])+/)[1]
+    advanceBy(context, content.length)
+    advanceSpaces(context)
+  }
+  return content
+}

+function parseAttribute(context: ParserContext) {
+  const start = getCursor(context)
+  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)
+  const name = match[0]
+  advanceBy(context, name.length)
+  if (/^[\t\r\n\f ]*=/.test(context.source)) {
+    advanceSpaces(context)
+    advanceBy(context, 1) // 删除=
+  }
  
+  const content = parseAttributeValue(context)
+  return {
+    type: NodeTypes.ATTRIBUTE,
+    name,
+    value: {
+      type: NodeTypes.TEXT,
+      content,
+      loc: getSelection(context, start)
+    },
+    loc: getSelection(context, start)
+  }
+}

+function parseAttributes(context: ParserContext) {
+  const attributes = []
+
+  while(context.source.length > 0 && !context.source.startsWith('>')) {
+    const attr = parseAttribute(context)
+    attributes.push(attr)
+    advanceSpaces(context)
+  }
+
+  return attributes
+}

+function parseTag(context: ParserContext) {
+  const start = getCursor(context)
+  const match = /^<\/?([a-z][^ \t\r\n/>]*)/.exec(context.source)
+  if (match) {
+    const tag = match[1]
+    advanceBy(context, match[0].length)
+
+    // 移除空格
+    advanceSpaces(context)

+    //  解析标签的属性
+    const props = parseAttributes(context)
+
+    let isSelfClosing = context.source.startsWith('/>')
+    advanceBy(context, isSelfClosing ? 2 : 1)
+    return {
+      type: NodeTypes.ELEMENT,
+      tag,
+      isSelfClosing,
+      loc: getSelection(context, start),
+      props
+    }
+  }
+}

+function parseElement(context: ParserContext) {
+  const ele: any = parseTag(context)
+
+  // 递归解析子节点, 如果是 闭合 标签，需要跳过
+  const children = parseChildren(context)
+
+  // 移除标签的 闭合 部分
+  if (context.source.startsWith('</')) {
+    parseTag(context)
+  }
+  
+  ele.children = children
+  ele.loc = getSelection(context, ele.loc.start)
+
+  return ele
+}

+function parseInterpolation(context: ParserContext) {
+  const start = getCursor(context)
+  const endIndex = context.source.indexOf('}}')
+
+  advanceBy(context, 2)
+
+  const innerStart = getCursor(context)
+  const innerEnd = getCursor(context)
  
+  const contentIndex = endIndex - 2
+  let rawContent = parseTextData(context, contentIndex)
+  const content = rawContent.trim()
+
+  const startOffset = rawContent.indexOf(content)
+
+  if (startOffset > 0) {
+    //  更新开始位置
+    advancePositionWithMutation(innerStart, rawContent, startOffset)
+  }
+
+  const endOffset = content.length + startOffset
+  // 更新结束位置
+  advancePositionWithMutation(innerEnd, rawContent, endOffset)
+
+  advanceBy(context, 2)

+  return {
+    type: NodeTypes.INTERPOLATION,
+    content: {
+      type: NodeTypes.SIMPLE_EXPRESSION,
+      content,
+      loc: getSelection(context, innerStart, innerEnd)
+    },
+    loc: getSelection(context, start)
+  }
+}

+function parseChildren(context: ParserContext) {
+  const nodes = []
+  while(!isEnd(context)) {
+    let node 
+    const { source: c } = context
+    // 状态机(有限状态机)
+    if (c.startsWith('{{')) { // 表达式，{{ name }}
+      node = parseInterpolation(context)
+    } else if (c.startsWith('<')) { // 元素，<div></div>
+      node = parseElement(context)
+    } else { // 文本，text
+      node = parseText(context)
+    }
+    nodes.push(node)
+  }
+
+  const isWhitespace = (source: string) => {
+    return !/[^\t\r\n\f ]/.test(source.trim())
+  }
+
+  // 移除空节点等
+  const result = nodes.filter((node: any) => {
+    if (node.type === NodeTypes.TEXT) {
+      return !isWhitespace(node.content.trim())
+    }
+    return true
+  })
+  return result
+}

+export function baseParse(input: string, options?: any) {
+  const context = createParserContext(input)
+  const children = parseChildren(context)
+  const root = createRoot(children)
+  return  root
+}
```

##### codegen.ts
```diff
+export interface CodegenResult {
+  code: string
+  ast: any
+  preamble: string
+  map?: any
+}
export function generate(
  ast: any,
  options: any = {},
): any {}
```

##### options.ts
```diff
+export interface ErrorHandler {
+  onWarn?: (warning: any) => void
+  onError?: (err: any) => void
+}

export type CompilerOptions = any

+export interface ParseOptions extends ErrorHandler {
+  parseMode?: 'base' | 'html' | 'sfc'
+  ns?: any
+  isNativeTag?: (tag: string) => boolean
+  isVoidTag?: (tag: string) => boolean
+  isPreTag?: (tag: string) => boolean
+  isCustomElement?: (tag: string) => boolean
+  isBuiltInComponentTag?: (tag: string) => boolean
+  getNamespace?: (
+    tag: string,
+    parent: Element | undefined,
+    rootNamespace: any
+  ) => any
+  delimiters?: [string, string]
+  whitespace?: 'preserve' | 'condense'
+  comments?: boolean
+}
```

##### ast.ts
```typescript
export type Namespace = number

export enum Namespaces {
  HTML,
  SVG,
  MATH_ML,
}

export enum NodeTypes {
  ROOT,
  ELEMENT,
  TEXT,
  COMMENT,
  SIMPLE_EXPRESSION,
  INTERPOLATION,
  ATTRIBUTE,
  DIRECTIVE,
  // containers
  COMPOUND_EXPRESSION,
  IF,
  IF_BRANCH,
  FOR,
  TEXT_CALL,
  // codegen
  VNODE_CALL,
  JS_CALL_EXPRESSION,
  JS_OBJECT_EXPRESSION,
  JS_PROPERTY,
  JS_ARRAY_EXPRESSION,
  JS_FUNCTION_EXPRESSION,
  JS_CONDITIONAL_EXPRESSION,
  JS_CACHE_EXPRESSION,

  // ssr codegen
  JS_BLOCK_STATEMENT,
  JS_TEMPLATE_LITERAL,
  JS_IF_STATEMENT,
  JS_ASSIGNMENT_EXPRESSION,
  JS_SEQUENCE_EXPRESSION,
  JS_RETURN_STATEMENT,
}

export enum ElementTypes {
  ELEMENT,
  COMPONENT,
  SLOT,
  TEMPLATE,
}

export interface Node {
  type: NodeTypes
  loc: SourceLocation
}

// The node's range. The `start` is inclusive and `end` is exclusive.
// [start, end)
export interface SourceLocation {
  start: Position
  end: Position
  source: string
}

export interface Position {
  offset: number // from start of file
  line: number
  column: number
}

export type TemplateChildNode = any

export interface RootNode extends Node {
  type: NodeTypes.ROOT
  source: string
  children: TemplateChildNode[]
  helpers: Set<symbol>
  components: string[]
  directives: string[]
  hoists: any[]
  imports: any[]
  cached: number
  temps: number
  codegenNode?: any
  transformed?: boolean
}

export const locStub = {
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 1, offset: 0 },
  source: ''
}
export function createRoot(children: TemplateChildNode[], source = ''): RootNode {
  return {
    type: NodeTypes.ROOT,
    source,
    children,
    helpers: new Set(),
    components: [],
    directives: [],
    hoists: [],
    imports: [],
    cached: 0,
    temps: 0,
    codegenNode: null,
    loc: locStub
  }
}
```

### shared
#### src
##### index.ts
```diff
export * from './general'
export * from './shapeFlags'
export * from './normalizeProps'
export * from './toDisplayString'
export * from './patchFlags'
+export * from './makeMap'
+export * from './domTagConfig'
```

##### makeMap.ts
```typescript
export function makeMap(
  str: string,
  expectsLowerCase?: boolean
): (key: string) => boolean {
  const set = new Set(str.split(','))
  return expectsLowerCase
    ? val => set.has(val.toLowerCase())
    : val => set.has(val)
}
```

##### domTagConfig.ts
```typescript
// These tag configs are shared between compiler-dom and runtime-dom, so they
// must be extracted in shared to avoid creating a dependency between the two.
import { makeMap } from './makeMap'

// https://developer.mozilla.org/en-US/docs/Web/HTML/Element
const HTML_TAGS =
  'html,body,base,head,link,meta,style,title,address,article,aside,footer,' +
  'header,hgroup,h1,h2,h3,h4,h5,h6,nav,section,div,dd,dl,dt,figcaption,' +
  'figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,' +
  'data,dfn,em,i,kbd,mark,q,rp,rt,ruby,s,samp,small,span,strong,sub,sup,' +
  'time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,' +
  'canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,' +
  'th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,' +
  'option,output,progress,select,textarea,details,dialog,menu,' +
  'summary,template,blockquote,iframe,tfoot'

// https://developer.mozilla.org/en-US/docs/Web/SVG/Element
const SVG_TAGS =
  'svg,animate,animateMotion,animateTransform,circle,clipPath,color-profile,' +
  'defs,desc,discard,ellipse,feBlend,feColorMatrix,feComponentTransfer,' +
  'feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,' +
  'feDistantLight,feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,' +
  'feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,' +
  'fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter,' +
  'foreignObject,g,hatch,hatchpath,image,line,linearGradient,marker,mask,' +
  'mesh,meshgradient,meshpatch,meshrow,metadata,mpath,path,pattern,' +
  'polygon,polyline,radialGradient,rect,set,solidcolor,stop,switch,symbol,' +
  'text,textPath,title,tspan,unknown,use,view'

// https://www.w3.org/TR/mathml4/ (content elements excluded)
const MATH_TAGS =
  'annotation,annotation-xml,maction,maligngroup,malignmark,math,menclose,' +
  'merror,mfenced,mfrac,mfraction,mglyph,mi,mlabeledtr,mlongdiv,' +
  'mmultiscripts,mn,mo,mover,mpadded,mphantom,mprescripts,mroot,mrow,ms,' +
  'mscarries,mscarry,msgroup,msline,mspace,msqrt,msrow,mstack,mstyle,msub,' +
  'msubsup,msup,mtable,mtd,mtext,mtr,munder,munderover,none,semantics'

const VOID_TAGS =
  'area,base,br,col,embed,hr,img,input,link,meta,param,source,track,wbr'

/**
 * Compiler only.
 * Do NOT use in runtime code paths unless behind `__DEV__` flag.
 */
export const isHTMLTag = /*#__PURE__*/ makeMap(HTML_TAGS)
/**
 * Compiler only.
 * Do NOT use in runtime code paths unless behind `__DEV__` flag.
 */
export const isSVGTag = /*#__PURE__*/ makeMap(SVG_TAGS)
/**
 * Compiler only.
 * Do NOT use in runtime code paths unless behind `__DEV__` flag.
 */
export const isMathMLTag = /*#__PURE__*/ makeMap(MATH_TAGS)
/**
 * Compiler only.
 * Do NOT use in runtime code paths unless behind `__DEV__` flag.
 */
export const isVoidTag = /*#__PURE__*/ makeMap(VOID_TAGS)
```

# 示例代码
## parse.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>parse</title>
</head>
<body>
  <script type="module">
    // import { parse } from '../../node_modules/.pnpm/@vue+compiler-dom@3.5.18/node_modules/@vue/compiler-dom/dist/compiler-dom.esm-browser.js'
    import { parse } from '../../packages/vue/dist/vue.esm.js'
    // console.log(parse('内容'))
    // console.log(parse('<div  ></div>'))
    // console.log(parse('<div><span><a></a></span></div>'))
    // console.log(parse('内容 {{ name }}'))
    // console.log(parse('<div>内容 {{ name }}</div>'))
    console.log(parse('<div a="1" b="true" id="app" c=" 11 " d = 3 ></div>'))
    // console.log(parse(`
    //   <div>
    //     <div></div>

    //     <p></p>

    //     {{ name }}

    //     abc    abc     abc
    //   </div>`))
  </script>
</body>
</html>
```

# 测试代码
```shell
pnpm preview
```

# 参考
[Vue Template Explorer](https://template-explorer.vuejs.org/#eyJzcmMiOiI8ZGl2IGlkPVwiYXBwXCIgY2xhc3M9XCJtYWluXCI+MTIzPC9kaXY+PGRpdiBpZD1cImFwcDJcIiBjbGFzcz1cIm1haW4yXCI+YWJjPC9kaXY+Iiwib3B0aW9ucyI6eyJ3aGl0ZXNwYWNlIjoicHJlc2VydmUifX0=)

[GitHub - vuejs/vue-template-explorer: Vue template compilation explorer](https://github.com/vuejs/vue-template-explorer)

