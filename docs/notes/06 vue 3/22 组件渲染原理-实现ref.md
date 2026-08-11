# 简介
+ 在 Vue 3 中，`[ref](https://cn.vuejs.org/api/built-in-special-attributes.html#ref)` 是一个**内置的特殊 Attribute**，主要用于在模板中直接访问 DOM 元素或子组件实例。

## `ref` 的作用
1. **访问 DOM 元素**  
在模板中，可以通过 `ref` 绑定一个字符串名称，然后在 JavaScript 中通过 `this.$refs`（Options API）或模板引用变量（Composition API）访问对应的 DOM 节点。
2. **访问子组件实例**  
如果 `ref` 绑定在子组件上，可以获取子组件的实例，并调用其暴露的方法或属性。

## 使用场景
```vue
<template>
  <!-- 绑定到 DOM 元素 -->
  <div ref="myDiv">Hello Vue</div>

  <!-- 绑定到子组件 -->
  <ChildComponent ref="child" />
</template>

<script>
  import { onMounted } from 'vue';

  export default {
    setup() {
      const myDiv = ref(null); // 模板引用的变量名需与 ref 值一致
      const child = ref(null); // 子组件实例

      onMounted(() => {
        console.log(myDiv.value); // 输出 DOM 元素
        console.log(child.value); // 输出子组件实例
      });

      return { myDiv, child };
    }
  };
</script>
```

## 关键点
1. **模板引用 **
    - 在模板中，`ref` 是特殊 Attribute，用于获取 DOM 或组件实例。
1. **访问时机**
    - 模板中的 `ref` 只能在组件挂载后（`onMounted` 或之后）访问，因为 DOM 或子组件需要先渲染完成。
2. **与**** **`**v-for**`** ****结合**
    - 在 `v-for` 中使用 `ref` 时，`this.$refs` 会返回一个数组

```vue
<script setup>
  import { ref, onMounted } from 'vue'

  const list = ref([
    /* ... */
  ])

  const itemRefs = ref([])

  onMounted(() => console.log(itemRefs.value))
</script>

<template>
  <ul>
    <li v-for="item in list" ref="itemRefs">
      {{ item }}
    </li>
  </ul>
</template>
// 应该注意的是，ref 数组并不保证与源数组相同的顺序。
```

# 基本使用
```typescript
import { ref, render, h, Text, getCurrentInstance } from 'vue'

const Modal = {
  props: {
    name: String,
  },
  setup(props, ctx) {
    const name = ref(props.name)
    const age = ref(18)
    const add = () => {
      age.value++
    }

    ctx.expose({
      age,
      add,
    })

    return () => h('div', {}, [
      h('div', {}, `${name.value}, ${age.value}`),
    ])
  },
}

const App = {
  // setup 代替 beforeCreate 和 created
  setup(props, ctx) {
    const name = ref('test')
    const comp = ref(null)

    // 当返回一个对象时，会作为setup函数的返回值，此时this指向setup函数的返回值
    return () => {
      return h('div', {}, [
        h('h2', {}, `name: ${name.value}`),
        h(Modal, {name: 'modal', key: 'modal', ref: comp}), ,
        h('button', { onClick: () => {
          console.log(comp.value)
          comp.value.add()
        }}, 'add child age')
      ])
    }
  },
}
render(h(App, {}), document.querySelector('#app'))
```

# 功能清单
+ 实现ref属性

# 源码实现
## packages
### runtime-core
#### src
##### renderer.ts
```diff
import { invokeArrayFns, isNil, NOOP, ShapeFlags } from "@g-vue-next/shared";
import { Comment, Fragment, isSameVNodeType, mergeProps, normalizeVNode, Text, type VNode, type VNodeArrayChildren } from "./vnode";
import { ComponentInternalInstance, createComponentInstance, setupComponent } from "./component";
-import { reactive, ReactiveEffect } from "@g-vue-next/reactivity";
+import { ReactiveEffect } from "@g-vue-next/reactivity";
import { queueJob } from "./scheduler";
import { updateProps } from "./componentProps";
import { shouldUpdateComponent } from "./componentRenderUtils";
import { updateSlots } from "./componentSlots";
+import { setRef } from "./rendererTemplateRef";

export interface Renderer<HostElement = RendererElement> {
  render: RootRenderFunction<HostElement>
}

export interface RendererOptions<
  HostNode = RendererNode,
  HostElement = RendererElement
> {
  patchProp(
    el: HostElement,
    key: string,
    prevValue: any,
    nextValue: any,
    namespace?: ElementNamespace,
    patentComponent?: any
  ): void;
  insert(child: HostNode, parent: HostElement, anchor?: HostNode | null): void;
  remove(child: HostNode): void;
  createElement(type: string, namespace?: ElementNamespace): HostElement;
  createText(text: string): HostNode;
  createComment(text: string): HostNode;
  setText(node: HostNode, text: string): void;
  setElementText(node: HostElement, text: string): void;
  parentNode(node: HostNode): HostElement | null;
  nextSibling(node: HostNode): HostNode | null;
  querySelector?(selector: string): HostElement | null;
  setScopeId?(el: HostElement, id: string): void;
  cloneNode?(node: HostNode): HostNode;
  insertStaticContent?(
    content: string,
    parent: HostElement,
    anchor: HostNode | null,
    namespace: ElementNamespace,
    start?: HostNode | null,
    end?: HostNode | null
  ): [HostNode, HostNode];
}
export interface RendererNode {
  [key: string | symbol]: any;
}
export interface RendererElement extends RendererNode {}
export type ElementNamespace = "svg" | "mathml" | undefined;
export type RootRenderFunction<HostElement = RendererElement> = (
  vnode: any,
  container: HostElement,
  anchor?: RendererNode | null
) => void;
export type MountChildrenFn = (
  children: VNodeArrayChildren,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: any | null,
  parentSuspense: any | null,
  namespace: ElementNamespace
) => void
type Data = {
  [key: string]: unknown;
}
export enum MoveType {
  ENTER,
  LEAVE,
  REORDER
}
type UnmountFn = (
  vnode: VNode,
  parentComponent: any | null,
  parentSuspense: any | null,
  doRemove?: boolean,
  optimize?: boolean
) => void;
type PatchChildrenFn = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: any | null,
  parentSuspense: any | null,
  namespace: ElementNamespace
) => void
type UnmountChildrenFn = (
  children: VNode[],
  parentComponent: any | null,
  parentSuspense: any | null
) => void
type MoveFn = (
  vnode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  type: MoveType,
  parentSuspense?: any | null
) => void
type RemoveFn = (vnode: VNode) => void
export type MountComponentFn = (
  initialVNode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: any | null,
  parentSuspense: any | null,
  namespace: ElementNamespace
) => void
export type SetupRenderEffectFn = (
  instance: ComponentInternalInstance,
  initialVNode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentSuspense: any | null,
  namespace: ElementNamespace
) => void
+type PatchFn = (
+  n1: VNode | null,
+  n2: VNode,
+  container: RendererElement,
+  anchor: RendererNode | null,
+  parentComponent: any | null,
+  parentSuspense: any | null,
+  namespace: ElementNamespace
+) => void

export function createRenderer<
  HostNode = RendererNode,
  HostElement = RendererElement
>(options: RendererOptions<HostNode, HostElement>) {
  return baseCreateRenderer(options);
}

function baseCreateRenderer<
  HostNode = RendererNode,
  HostElement = RendererElement
>(options: RendererOptions<HostNode, HostElement>) {

  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    createComment: hostCreateComment,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    setScopeId: hostSetScopeId = NOOP,
    insertStaticContent: hostInsertStaticContent,
  } = options

  /*************** 处理节点 ***************/

  // patch 的主要作用：对比新前后的节点，并更新 DOM
-  const patch = (
+  const patch: PatchFn = (
    n1,
    n2,
    container,
    anchor = null,
    parentComponent = null,
    parentSuspense = null,
    namespace = undefined
  ) => {
    if (n1 === n2) {
      // 节点相同，则不需要更新
      return
    }

    // 如果老节点存在，并且新老节点不同，则直接移除老节点，再插入新的节点
    if (n1 && !isSameVNodeType(n1, n2)) {
      unmount(n1, parentComponent, parentSuspense, true)
      n1 = null // 将老节点置为空，后面会挂载新节点
    }

-    const { type, shapeFlag} = n2
+    const { type, shapeFlag, ref } = n2
    //! ⚠️ 每增加一种类型都需要考虑首次渲染、更新、卸载 三种情况
    switch (type) {
      // 文本节点：最简单的节点类型，只包含纯文本内容
      case Text:
        processText(n1, n2, container, anchor)
        break
      //  注释节点：主要用作条件渲染的占位符
      // 典型场景：v-if="false" 时创建注释节点保持DOM结构稳定
      case Comment:
        processCommentNode(n1, n2, container, anchor)
        break
      // 片段节点：主要作用是把多个节点包裹在一起，方便后续处理
      case Fragment:
        processFragment(n1, n2, container, anchor, parentComponent, parentSuspense, namespace)
        break
      // 元素节点或组件
      default:
        if(shapeFlag & ShapeFlags.ELEMENT) { // 元素节点
          processElement(n1, n2, container, anchor, parentComponent, parentSuspense, namespace)
        } else if(shapeFlag & ShapeFlags.COMPONENT) { // 组件
          processComponent(n1, n2, container, anchor, parentComponent, parentSuspense, namespace)
        }
        break
    }

+    // 设置 ref
+    if (!isNil(ref)) {
+      setRef(ref, n1 && n1.ref, parentSuspense, n2 || n1, !n2)
+    }
+  }

  // 处理元素节点
  const processElement = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: any | null,
    parentSuspense: any | null,
    namespace: ElementNamespace
  ) => { 
    // 老节点不存在，说明是初次渲染，则创建
    if (n1 === null) {
      mountElement(n2, container, anchor, parentComponent, parentSuspense, namespace)
    } else { // 否则是更新
      patchElement(n1, n2, parentComponent, parentSuspense, namespace)
    }
  }

  // 处理文本节点
  const processText = (n1, n2, container, anchor) => {
    // 老节点不存在，说明是初次渲染，则创建
    if (n1 === null) {
      // 创建文本节点
      hostInsert(
        n2.el = hostCreateText(n2.children), // 创建文本节点, 并挂载到当前元素
        container, // 插入的父元素
        anchor // 锚点
      )
    } else {
      // 节点存在，则更新
      const el = n2.el = n1.el // 获取元素节点
      if(n2.children !== n1.children) {
        // 文本内容改变，更新内容
        hostSetText(el, n2.children)
      }
    }
  }

  // 处理注释节点
  const processCommentNode = (n1, n2, container, anchor) => {
    if (n1 === null) {
      hostInsert(
        (n2.el = hostCreateComment(n2.children || '')),
        container,
        anchor
      )
    } else {
      n2.el = n1.el
    }
  }

  // 处理 Fragment
  const processFragment = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: any | null,
    parentSuspense: any | null,
    namespace: ElementNamespace
  ) => {
    // 双锚点系统：标记Fragment的边界
    const fragmentStartAnchor: any = (n2.el = n1 ? n1.el : hostCreateText('')) // Fragment开始位置的文本节点锚点
    const fragmentEndAnchor: any = (n2.anchor = n1 ? n1.anchor : hostCreateText('')) // Fragment结束位置的文本节点锚点

    // 首次挂载：创建Fragment结构
    if (n1 == null) {
      // 插入开始锚点
      hostInsert(fragmentStartAnchor, container as any, anchor as any)
      hostInsert(fragmentEndAnchor, container as any, anchor as any)

      // 挂载子节点
      mountChildren(
        n2.children as VNodeArrayChildren,
        container,
        fragmentEndAnchor, // 使用结束锚点作为插入参考
        parentComponent,
        parentSuspense,
        namespace
      )
    } else {
      // 更新操作
      patchChildren(
        n1,
        n2,
        container,
        fragmentEndAnchor,
        parentComponent,
        parentSuspense,
        namespace
      )
    }
  }

  // 移动节点
  const move: MoveFn = (
    vnode,
    container,
    anchor,
    moveType,
    parentSuspense = null
  ) => {
    const { el } = vnode
    hostInsert(el as any, container as any, anchor as any)
  }

  const processComponent = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: any | null,
    parentSuspense: any | null,
    namespace: ElementNamespace
  ) => { 
    // 首次挂载
    if (n1 === null) {
      mountComponent(
        n2,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        namespace
      )
    } else { // 更新
      updateComponent(n1, n2)
    }
  }
  /*************** 挂载 ***************/
  // 挂载元素节点
  const mountElement = (
    vnode: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: any | null,
    parentSuspense: any | null,
    namespace: ElementNamespace
  ) => {
    const { type, props, shapeFlag, children } = vnode
    // 创建元素节点
    // 第一次渲染的时候我么让虚拟节点和真实的dom 创建关联 vnode.el = 真实dom
    // 第二次渲染新的vnode，可以和上一次的vnode做比对，之后更新对应的el元素，可以后续再复用这个dom元素
    const el: any = (vnode.el = hostCreateElement(type as string, namespace))
    // 设置属性
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }

    // 处理子节点
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) { // 文本节点
      hostSetElementText(el, children as string)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 数组节点
      mountChildren((children) as VNodeArrayChildren, el, null, parentComponent, parentSuspense, namespace)
    }
    
    // 插入元素
    hostInsert(el, container as any, anchor as any)
  }
  // 挂载子节点
  const mountChildren: MountChildrenFn = (
    children,
    container,
    anchor,
    parentComponent,
    parentSuspense,
    namespace
  ) => {
    for(let i = 0; i < children?.length; i++) {
      const child = normalizeVNode(children[i])
      patch(null, child, container, anchor, parentComponent, parentSuspense, namespace)
    }
  }
  // 挂载组件
  const mountComponent: MountComponentFn = (
    initialVNode,
    container,
    anchor,
    parentComponent,
    parentSuspense,
    namespace
  ) => {
    // vnode 指向组件的虚拟节点
    // subtree 指向组件的 render 函数返回的虚拟节点
    //! 核心逻辑三部曲
    // 1.创建组件实例
    const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent, parentSuspense))
    // 2.初始化组件实例，给组件实例添加 props, data, proxy, render 等属性
    setupComponent(instance)
    // 3.创建组件实例的 effect 函数，并执行
    setupRenderEffect(
      instance,
      initialVNode,
      container,
      anchor,
      parentSuspense,
      namespace
    )
  }

  // 组件实例的 effect 函数
  const setupRenderEffect:SetupRenderEffectFn = (
    instance,
    initialVNode,
    container,
    anchor,
    parentSuspense,
    namespace
  ) => {
    const componentUpdateFn = () => {
      const { render, bm, m } = instance
      if (!instance.isMounted) {
        // TODO Lifecycle Hooks beforeMount
        if (bm) {
          invokeArrayFns(bm)
        }
        // subtree 为第一次渲染产生的vnode，这里的作用是缓存子树, 用于后续的更新
        const subTree = (instance.subTree = render.call(instance.proxy, instance.proxy))
        // 合并组件的attrs到渲染结果中，attrs是未声明的props
        subTree.props = mergeProps(instance.attrs, subTree.props)
        // 挂载组件
        patch(null, subTree, container, anchor, null, parentSuspense, namespace)
        // 缓存组件的el
        initialVNode.el = subTree.el
        // 标记组件已挂载
        instance.isMounted = true
        // TODO Lifecycle Hooks mounted
        if (m) {
          invokeArrayFns(m)
        }
      } else {
        const { bu, u} = instance
        // 如果有 next 说明需要更新属性和插槽
        if (instance.next) {
          updateComponentPreRender(instance, instance.next)
        }
        // TODO Lifecycle Hooks beforeUpdate
        if (bu) {
          invokeArrayFns(bu)
        }
        // 获取组件的虚拟DOM
        const nextTree = render.call(instance.proxy, instance.proxy)
        // 获取更新前的组件的虚拟DOM
        const prevTree = instance.subTree
        // 合并组件的props和attrs，保持与挂载时一致的逻辑
        nextTree.props = mergeProps(instance.attrs, nextTree.props)
        // 更新组件的虚拟DOM
        instance.subTree = nextTree
        // 更新组件
        patch(prevTree, nextTree, hostParentNode(prevTree.el as any), anchor, null, parentSuspense, namespace)
        // TODO Lifecycle Hooks updated
        if (u) {
          invokeArrayFns(u)
        }
      }
    }

    // 创建副作用函数
    const effect = new ReactiveEffect(componentUpdateFn, () => {
      // 异步更新，防止频繁更新
      // instance.update()
      queueJob(update)
    })
    const update = instance.update = effect.run.bind(effect)
    update() // 执行副作用函数
  }
  /*************** 更新 ***************/
  const patchProps = (
    el: RendererElement,
    oldProps: Data,
    newProps: Data,
    parentComponent: any,
    namespace: ElementNamespace
  ) => {
    // 新旧 props 不同，进行比对
    if (oldProps !== newProps) {
      // 新 prop 和 旧 prop 进行比对，如果不同，进行更新
      for (const key in newProps) {
        hostPatchProp(el as any, key, oldProps[key], newProps[key], namespace, parentComponent)
      }

      // 旧的 prop 有值,新的 prop 没有值，进行卸载
      for (const key in oldProps) {
        if (!(key in newProps)) {
          hostPatchProp(el as any, key, oldProps[key], null, namespace, parentComponent)
        }
      }
      // 值更新
      if ('value' in newProps) {
        hostPatchProp(el as any, 'value', oldProps.value, newProps.value, namespace)
      }
    }
  }
  const patchKeyedChildren = (
    c1: VNode[],
    c2: VNodeArrayChildren,
    container: RendererElement,
    parentAnchor: RendererNode | null,
    parentComponent: any,
    parentSuspense: any,
    namespace: ElementNamespace
  ) => {
    // 全量的 diff 算法
    // 对比过程是采用深度遍历，先便利父级再遍历子级，并且是同级对比
    let i = 0 // 索引
    const l2 = c2.length // 新节点的个数
    let e1 = c1.length - 1 // 旧节点的终点索引
    let e2 = l2 - 1 // 新节点的终点索引

    // 1.sync from start ==> 左侧对比
    // (a b) c
    // (a b) d e
    while (i <= e1 && i<= e2) {
      const n1 = c1[i] // 旧子节点的第一个节点
      const n2 = c2[i] = normalizeVNode(c2[i]) // 新子节点的第一个节点
      // 如果新旧节点相同
      if (isSameVNodeType(n1, n2)) {
        // 递归对比
        patch(n1, n2, container, null, parentComponent, parentSuspense, namespace)
      } else {
        break
      }
      i++
    }
    
    // 2.sync from end   ==> 右侧对比
    //   a (b c)
    // d e (b c)
    while (i<=e1 && i <= e2) {
      const n1 = c1[e1] // 旧子节点的最后一个节点
      const n2 = c2[e2] = normalizeVNode(c2[e2]) // 新子节点的最后一个节点
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, null, parentComponent, parentSuspense, namespace)
      } else {
        break
      }
      e1--
      e2--
    }
    
    // 3.common sequence + mount  ==> 同序列挂载（新增）
    // (a b)
    // (a b) c
    //i = 2, e1 = 1, e2 = 2
    //   (a b)
    // c (a b)
    // i = 0, e1 = -1, e2 = 0
    if (i > e1) {
      if (i <= e2) {
        // 判断 e2 是否向前移动，如果向前移动，说明要向前插入，如果 e2 没有移动，说明要向后插入
        const nextPos = e2 + 1
        // vue 2 的实现是 判断 下一个元素存不存在
        // vue 3 的实现是 判断 下一个元素的长度是否越界
        const anchor = nextPos < l2 ? (c2?.[nextPos] as VNode)?.el : parentAnchor // 获取下一个元素的及锚点
        while (i <= e2) {
          patch(null, c2[i] = normalizeVNode(c2[i]), container, anchor, parentComponent, parentSuspense, namespace)
          i++
        }
      }
    }
    // 4.common sequence + unmount ==> 同序列卸载（删除）
    // (a b) c
    // (a b)
    // i = 2, e1 = 2, e2 = 1
    // a (b c)
    //   (b c)
    // i = 0, e1 = 0, e2 = -1
    else if (i > e2) {
      // 卸载 i 到 e1 的旧元素
      while (i <= e1) {
        unmount(c1[i], parentComponent, parentSuspense, true)
        i++
      }
    }
    //! 以上都是优化处理，是为了确认不变化的节点，并且对新增和移除做了处理，下面是核心处理
    // 5.unknown sequence ==> 乱序比对
    // [i....e1 + 1]: a b [c d e] f g
    // [i....e2 + 1]: a b [e d c h] f g
    // i = 2, e1 = 4, e2 = 5
    else {
      //? console.log('i', i, e1, e2)
      let s1 = i // 旧的 children 的开始索引
      let s2 = i // 新的 children 的开始索引

      // 5.1. build key: index map for children ==> 构建新子节点的键索引映射表
      const keyToNewIndexMap: Map<PropertyKey, number> = new Map() // 键索引映射表
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i] = normalizeVNode(c2[i])
        if (!isNil(nextChild.key)) {
          keyToNewIndexMap.set(nextChild.key, i)
        }
      }
      
      // 5.2. loop through old children left to be patched and try to patch ==> 从左到右遍历旧子节点，如果旧子节点在新的子节点中存在，则复用，否则卸载
      let toBePatched = e2 - s2 + 1 // 需要倒序插入的节点个数
      const newIndexToOldIndexMap = new Array(toBePatched).fill(0) // 用来记录旧子节点在新子节点中的索引
      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i] // 获取旧子节点
        let nextIndex = keyToNewIndexMap.get(prevChild.key)

        // 旧子节点在新子节点中不存在，则卸载
        if (nextIndex === undefined) {
          unmount(prevChild, parentComponent, parentSuspense, true)
        } else { // 旧子节点在新子节点中存在，则复用
          // 获取新的子节点
-          const nextChild = c2[nextIndex]
+          const nextChild = c2[nextIndex] as VNode
          // 记录旧子节点在新子节点中的索引
          newIndexToOldIndexMap[nextIndex - s2] = i + 1
          // 比较新老节点的差异，更新属性和子节点
          patch(
            prevChild,
            nextChild,
            container,
            null,
            parentComponent,
            parentSuspense,
            namespace
          )
        }
      }

      // 5.3. move and mount ==> 移动和挂载
      // 获取最长递增子序列
      const increasingNewIndexSequence = getSequence(newIndexToOldIndexMap)
      // 最长递增子序列的最后一个索引
      let j = increasingNewIndexSequence.length - 1
      // 循环从最长递增子序列的最后一个索引开始
      for (let i = toBePatched - 1; i >= 0; i--) { 
        const nextIndex = i + s2 // 新节点的索引
        const nextChild = c2[nextIndex] as VNode // 新节点
        const anchor = nextIndex + 1 < l2 ? (c2[nextIndex + 1] as VNode).el : parentAnchor // 获取下一个节点及新节点的锚点
        // 如果新子节点的索引等于 0，说明新子节点在旧子节点中不存在
        if (newIndexToOldIndexMap[i] === 0) {
          // 插入新子节点
          patch(
            null,
            nextChild,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            namespace
          )
        } else { // 如果新子节点的索引大于 0，说明新子节点在旧子节点中存在
          // 倒序遍历，从后往前插入
          // 这里是暴力的插入，没有使用移动节点的方式，需要优化
          // hostInsert(nextChild.el, container, anchor)
          //! 优化：移动节点
          // 如果新子节点的索引小于 0 或者新子节点的索引与递增序列中的索引不相等
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            move(nextChild, container, anchor, MoveType.REORDER)
          } else {
            j--
          }
        }
      }
    }
  }
  const patchChildren: PatchChildrenFn = (
    n1,
    n2,
    container,
    anchor,
    parentComponent,
    parentSuspense,
    namespace
  ) => {
    // TODO 情况分析:
    // 1. 新的 children 是文本, 旧的 children 是数组 -> 删除旧的 children, 创建新的 children
    // 2. 新的 children 是文本, 旧的 children 是文本 -> 更新文本即可
    // 3. 新的 children 是文本, 旧的 children 是空 -> 更新文本即可(类似上述情况)
    // 4. 新的 children 是数组, 旧的 children 是数组 -> 比对数组(diff 算法)
    // 5. 新的 children 是数组, 旧的 children 是文本 -> 清空文本, 创建新的 children
    // 6. 新的 children 是数组, 旧的 children 是空 -> 创建新的 children(类似上述情况)
    // 7. 新的 children 是空, 旧的 children 是数组 -> 删除旧的 children
    // 8. 新的 children 是空, 旧的 children 是文本 -> 删除旧的 children
    // 9. 新的 children 是空, 旧的 children 是空 -> 什么都不做

    const c1 = n1?.children // 老的 children
    const c2 = n2?.children // 新的 children
    const prevShapeFlag = n1?.shapeFlag // 老节点的类型
    const shapeFlag = n2?.shapeFlag // 新节点的类型
    
    // TODO 上面九种情况可以分为一下几类处理:
    // 1.新的是文本, 老的是数组，移出老的
    // 2.新的是文本，老的是文本或空，内容不同，替换
    // 3.老的是数组，新的数组，全量 diff
    // 4.老的是数组，新的是空，移除
    // 5.老的是文本，新的是空，移除
    // 6.老的是文本，新的是数组，替换
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 1
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1 as VNode[], parentComponent, parentSuspense)
      }
      // 2, 3
      if (c1 !== c2) {
        hostSetElementText(container as any, c2 as string)
      }
    } else {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 4
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // TODO diff 算法
          patchKeyedChildren(
            c1 as VNode[],
            c2 as VNodeArrayChildren,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            namespace
          )
        } else {
          // 7
          unmountChildren(c1 as VNode[], parentComponent, parentSuspense)
        }
      } else {
        // 5, 8
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(container as any, '')
        }
        // 6
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(
            c2 as VNodeArrayChildren,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            namespace
          )
        }
        // 9 无需处理
      }
    }
  }
  const patchElement = (
    n1: VNode,
    n2: VNode,
    parentComponent: any | null,
    parentSuspense: any | null,
    namespace: ElementNamespace
  ) => {
    // 1.比较元素的差异，需要复用元素节点
    // 2.比较元素的属性和子节点
    const el = (n2.el = n1.el) // 获取元素的真实DOM，复用
    
    const oldProps = (n1.props || null) // 老属性
    const newProps = (n2.props || null) // 新属性

    // 比较属性是否变化了
    patchProps(el, oldProps, newProps, parentComponent, namespace)

    // 比较子节点差异
    patchChildren(n1, n2, el, null, parentComponent, parentSuspense, namespace)
  }
  const updateComponent = (n1: VNode, n2: VNode) => {
    //! 组件的更新逻辑: 组件更新的方式有三种（状态[data]、属性[props]、插槽[slot]）
    // 获取组件实例，这里是复用组件
    const instance = (n2.component = n1?.component)
    // 更新组件的虚拟DOM 
    if (shouldUpdateComponent(n1, n2)) {
      // updateComponentPreRender(instance, n2)
      instance.next = n2 // 有next 说明是属性或插槽更新，否则为状态更新
      instance.update()
    } else {
      n2.el = n1.el
      instance.vnode = n2
    }
  }

  const updateComponentPreRender = (
    instance: ComponentInternalInstance,
    nextVNode: VNode
  ) => {
    // 将组件实例赋给新的虚拟DOM 的 component 属性上
    nextVNode.component = instance
    // 获取组件实例的props
    const prevProps = instance.vnode.props
    // 更新组件实例上的虚拟DOM
    instance.vnode = nextVNode
    instance.next = null
    // 1. 更新 props
    updateProps(instance, nextVNode.props, prevProps)
    // 2. 更新 slots
    updateSlots(instance, nextVNode.children)
  }
  /*************** 卸载 ***************/
  // 卸载节点
  const unmount: UnmountFn = (
    vnode,
    parentComponent,
    parentSuspense,
    doRemove = false,
    optimize = false
  ) => {
    const { shapeFlag } = vnode
    // 卸载组件
    if (shapeFlag & ShapeFlags.COMPONENT) {
      unmountComponent(vnode.component, parentSuspense, doRemove)
    } else {
      remove(vnode)
    }
  }
  const unmountChildren: UnmountChildrenFn = (
    children,
    parentComponent,
    parentSuspense,
  ) => {
    for (let i = 0; i < children.length; i++) {
      unmount(children[i], parentComponent, parentSuspense)
    }
  }

  const unmountComponent = (
    instance: ComponentInternalInstance,
    parentSuspense: any | null,
    doRemove?: boolean
  ) => {
    const { subTree, bum, um } = instance
    // TODO Lifecycle Hooks beforeUnmount
    if (bum) {
      invokeArrayFns(bum)
    }
    unmount(subTree, instance, parentSuspense, doRemove)
    // TODO Lifecycle Hooks unmounted
    if (um) {
      invokeArrayFns(um)
    }
  };

  const remove: RemoveFn = (vnode) => {
    const { el, type, anchor } = vnode
    if (type === Fragment) {
      removeFragment(el, anchor)
      return
    }
    const performRemove = () => {
      hostRemove(el as HostNode)
    }
    if (vnode.shapeFlag & ShapeFlags.ELEMENT) {
      performRemove()
    } else {
      performRemove()
    }
  }

  const removeFragment = (cur: RendererNode, end: RendererNode) => {
    let next
    while (cur !== end) {
      next = hostNextSibling(cur as HostNode)
      hostRemove(cur as HostNode)
      cur = next
    }
    hostRemove(end as HostNode)
  }

  /*************** render ***************/
  const render = (vnode, container, namespace) => {
    // 三种情况：
    // 1. 初始渲染
    // 2. 更新渲染
    // 3. 销毁渲染
    if (vnode == null) {
      // 销毁
      if (container._vnode) { // 如果当前 container 中已经有节点，则先卸载该节点
        unmount(container._vnode, null, null, true)
      }
    } else {
      // 初次挂载 或 更新挂载
      patch(
        container._vnode || null,
        vnode,
        container,
        null,
        null,
        null,
        namespace,
      )
    }
    // 保存当前的节点，方便再次渲染的时候，进行比对
    container._vnode = vnode
  }

  return {
    render
  }
}

// https://en.wikipedia.org/wiki/Longest_increasing_subsequence
// 核心：二分查找 + 贪心算法
// 获取最长递增子序列
const getSequence = (arr) => { 
  let len = arr.length // 数组长度
  const result = [0] // 最长子序列的起始索引
  let resultLastIndex; // 最长子序列的结束索引

  let start; // 当前子序列的起始索引
  let end; // 当前子序列的结束索引
  let middle; // 当前子序列的中间索引

  let p = arr.slice(0) // 创建一个副本，用来标识索引，防止修改原数组
  // 循环数组
  for (let i = 0; i < len; i++) {
    const arrI = arr[i] // 当前元素
    if (arrI !== 0) { // 当前元素不为0
      resultLastIndex = result[result.length - 1] // 获取当前子序列的结束索引
      if (arr[resultLastIndex] < arrI) { // 当前元素大于当前子序列的结束元素
        result.push(i) // 添加当前索引到结果数组中
        p[i] = resultLastIndex // 记录当前元素的前一个元素索引
        continue
      }

      // 二分查找
      start = 0 // 当前子序列的起始索引
      end = result.length - 1 // 当前子序列的结束索引
      // 二分法查找当前元素在当前子序列中的位置
      while (start < end) {
        middle = (start + end) >> 1 // 计算中间索引
        if (arr[result[middle]] < arrI) { // 中间元素小于当前元素
          start = middle + 1 // 更新起始索引
        } else {
          end = middle // 否则更新结束索引
        }
      }

      // 找到插入位置
      if (arrI < arr[result[start]]) { //  当前元素小于中间元素
        // 如果 start 大于 0，则说明 start 不是数组的第一个元素，需要减 1
        // start 小于 0，则说明 start 是数组的第一个元素
        if (start > 0) {
          p[i] = result[start - 1] // 记录当前元素的前一个元素索引
        }
        result[start] = i // 更新结果数组中的索引
      }
    }
  }
  // 追溯结果数组，获取最长子序列的索引
  let i = result.length // 结果数组的长度
  let lastIndex = result[i - 1] // 最后一个索引
  while (i-- > 0) {
    result[i] = lastIndex // 将最后一个索引赋值给当前索引
    lastIndex = p[lastIndex] // 用p中的索引追溯
  }
  return result
}
```

##### component.ts
```diff
import { EMPTY_OBJ, isFunction } from "@g-vue-next/shared";
import { VNodeChild, type VNode } from "./vnode";
import { proxyRefs, reactive } from "@g-vue-next/reactivity";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
import { initProps } from "./componentProps";
import { initSlots } from "./componentSlots";
import { emit } from "./componentEmits";
import { LifecycleHooks } from "./enums";
import { SchedulerJob } from "./scheduler";

export type Data = Record<string, unknown>;

export type InternalRenderFunction = {
  (
    ctx:  any,
    cache: ComponentInternalInstance['renderCache'],
    $props: ComponentInternalInstance['props'],
    $setup: ComponentInternalInstance['setupState'],
    $data: ComponentInternalInstance['data'],
    $options: ComponentInternalInstance['ctx'],
  ): VNodeChild
}

type EmitFn = {
  (event: string, ...args: any[]): void
}

export type Slot<T extends any = any> = (
  ...args: T[]
) => VNode[]

export type InternalSlots = {
  [name: string]: Slot | undefined
}

export type SetupContext = {
  attrs: Data;
  slots: Data;
  emit: EmitFn;
  expose: (exposed?: Data) => void  
}

export type LifecycleHook<TFn = Function> = (TFn & SchedulerJob)[] | null

export interface ComponentInternalInstance {
  vnode: VNode
  parent: ComponentInternalInstance | null
  root: ComponentInternalInstance
  subTree: VNode
  suspense: any | null
  type: any
  next?: VNode | null
  update: () => void
  render: InternalRenderFunction | null
  renderCache: (Function | VNode | undefined)[]
  ctx: Data
  proxy: any | null
  propsOptions: Data
  // expose
  exposed: Record<string, any> | null
  exposeProxy: Record<string, any> | null
  // state
  data: Data
  props: Data
  attrs: Data
  setupState: Data
  emit: EmitFn
  slots: InternalSlots
  // lifecycle hooks
  isMounted: boolean
  isUnmounted: boolean
  [LifecycleHooks.BEFORE_CREATE]: LifecycleHook
  [LifecycleHooks.CREATED]: LifecycleHook
  [LifecycleHooks.BEFORE_MOUNT]: LifecycleHook
  [LifecycleHooks.MOUNTED]: LifecycleHook
  [LifecycleHooks.BEFORE_UPDATE]: LifecycleHook
  [LifecycleHooks.UPDATED]: LifecycleHook
  [LifecycleHooks.BEFORE_UNMOUNT]: LifecycleHook
  [LifecycleHooks.UNMOUNTED]: LifecycleHook
  [LifecycleHooks.RENDER_TRACKED]: LifecycleHook
  [LifecycleHooks.RENDER_TRIGGERED]: LifecycleHook
  [LifecycleHooks.ACTIVATED]: LifecycleHook
  [LifecycleHooks.DEACTIVATED]: LifecycleHook
  [LifecycleHooks.ERROR_CAPTURED]: LifecycleHook
  [LifecycleHooks.SERVER_PREFETCH]: LifecycleHook<() => Promise<unknown>>
}

export type Component = 
  | ComponentInternalInstance
// 创建组件实例
export function createComponentInstance (
  vnode: VNode,
  parent: ComponentInternalInstance | null,
  suspense: any |null
): ComponentInternalInstance {
  const instance = {
    vnode, // 组件的虚拟DOM
    parent, // 父组件实例
    root: null, // 根组件实例
    subTree: null, // 组件的子虚拟DOM
    suspense, // 组件的 Suspense 实例
    type: vnode.type, // 组件的类型
    update: null, // 组件的更新函数：创建一个函数，用于更新组件 ==> effect.run()
    render: null, // 组件的 render 函数
    renderCache: [], // 缓存组件的 render 函数的返回值
    ctx: EMPTY_OBJ, // 组件的上下文
    exposed: null, // 组件的暴露对象
    exposeProxy: null, // 组件的 exposed 代理对象
    proxy: null, // 组件的代理对象
    propsOptions: (vnode.type as any)?.props || {}, // 用户声明的 props 
    data: EMPTY_OBJ, // 组件的 data 数据
    props: EMPTY_OBJ, // 组件的 props 数据
    attrs: EMPTY_OBJ, // 组件的 attrs 数据
    emit: null,
    slots: EMPTY_OBJ,
    setupState: EMPTY_OBJ,
    isMounted: false, // 组件是否已挂载
    isUnmounted: false, // 组件是否已卸载
    bc: null,
    c: null,
    bm: null,
    m: null,
    bu: null,
    u: null,
    um: null,
    bum: null,
    da: null,
    a: null,
    rtg: null,
    rtc: null,
    ec: null,
    sp: null,
  }
  instance.ctx = {_: instance } // 创建组件实例的 ctx 属性
  instance.root = parent ? parent.root : instance // 创建组件实例的 root 属性
  instance.emit = emit.bind(null, instance)
  return instance
}
// 设置组件的初始状态和行为
export function setupComponent(instance: ComponentInternalInstance) { 
  setupStatefulComponent(instance)
}
// 设置一个有状态的组件实例
function setupStatefulComponent(instance: ComponentInternalInstance) {
  const { props, children } = instance.vnode
  // 初始化组件实例的props
  initProps(instance, props)
  // 初始化组件实例的插槽
  initSlots(instance, children)
  // 获取组件的构造函数
  const Component = instance.type
  // 创建组件实例的代理对象
  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers)

  // 获取组件实例的setup函数
  const { setup } = Component
  if (setup) {
    // 创建组件实例的上下文对象
    const setupContext = createSetupContext(instance)
    // 设置当前组件实例
    setCurrentInstance(instance)
    // 执行setup函数，返回setup函数的返回值
    const setupResult = setup(instance.props, setupContext)
    // 重置当前组件实例
    unsetCurrentInstance()
    // 如果 setup 的返回值是函数，则将返回值作为组件的 render 函数
    if (isFunction(setupResult)) {
      instance.render = setupResult
    } else {
      instance.setupState = proxyRefs(setupResult)
    }
  }

  // 创建组件实例的 data 数据
  const data: Function = Component.data
  if (data) {
    if (isFunction(data)) {
      instance.data = reactive(data.call(instance.proxy))
    } else {
      console.warn('data must be a function')
    }
  }

  if (!instance.render) {
    // 将组件实例的render函数赋值给组件实例
    instance.render = Component.render
  }
}
// 定义组件实例
export let currentInstance: ComponentInternalInstance | null = null
// 获取当前组件实例
export const getCurrentInstance: () => ComponentInternalInstance | null = () => {
  return currentInstance
}
const internalSetCurrentInstance: (instance: ComponentInternalInstance | null) => void = (i) => {
  currentInstance = i
}
// 设置当前组件实例
export function setCurrentInstance(instance: ComponentInternalInstance) {
  const prev = currentInstance
  internalSetCurrentInstance(instance)
  return (): void => {
    internalSetCurrentInstance(prev)
  }
}
export const unsetCurrentInstance = () => {
  internalSetCurrentInstance(null)
}
export function createSetupContext(instance: ComponentInternalInstance): SetupContext {
  const expose: SetupContext['expose'] = exposed => {
    instance.exposed = exposed || {}
  }

  return {
    attrs: instance.attrs,
    slots: instance.slots,
    emit: instance.emit,
    expose,
  }
}
+export function getComponentPublicInstance(
+  instance: ComponentInternalInstance
+) {
+  if (instance.exposed) {
+    // 这里简化了源码
+    return instance.exposed
+  } else {
+    return instance.proxy
+  }
+}
```

##### rendererTemplateRef.ts
```typescript
import { ShapeFlags } from "@g-vue-next/shared";
import { VNode, VNodeNormalizedRef, VNodeNormalizedRefAtom } from "./vnode";
import { getComponentPublicInstance } from "./component";
import { isRef } from "@g-vue-next/reactivity";

export function setRef(
  rawRef: VNodeNormalizedRef,
  oldRawRef: VNodeNormalizedRef | null,
  parentSuspense: any | null,
  vnode: VNode,
  isUnmount = false
) {
  const refValue = 
    vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
      ? getComponentPublicInstance(vnode.component!)
      : vnode.el;
  const value = isUnmount ? null : refValue;
  const { i: owner, r: ref } = rawRef as VNodeNormalizedRefAtom;

  if (isRef(ref)) {
    ref.value = value;
  }
}
```

##### vnode.ts
```diff
-import { type Ref } from "@g-vue-next/reactivity";
+import { isRef, type Ref } from "@g-vue-next/reactivity";
import type { RendererElement, RendererNode } from "./renderer";
-import { isArray, isObject, isOn, isString, normalizeClass, normalizeStyle, ShapeFlags } from "@g-vue-next/shared";
-import { Component, ComponentInternalInstance } from "./component";
+import { isArray, isFunction, isObject, isOn, isString, normalizeClass, normalizeStyle, ShapeFlags } from "@g-vue-next/shared";
+import { Component, ComponentInternalInstance, currentInstance } from "./component";
import { RawSlots } from "./componentSlots";

type Data = Record<string, unknown>;
export type VNodeRef = 
  | string
  | Ref
  | ((ref: Element | null, refs: Record<string, any>) =>void)

export type VNodeProps = { 
  key?: PropertyKey,
  ref?: VNodeRef
+  ref_for?: boolean
+  ref_key?: string
}

export type VNodeTypes = 
  | string
  | Component
  | VNode
  | typeof Text
  | typeof Comment
  | typeof Fragment

export type VNodeChildAtom = 
  | VNode
  | string
  | number
  | boolean
  | null
  | undefined
  | void

export type VNodeArrayChildren = Array<VNodeArrayChildren | VNodeChildAtom>

export type VNodeChild = VNodeChildAtom | VNodeArrayChildren

export type VNodeNormalizedChildren = 
  | string
  | VNodeArrayChildren
  | RawSlots
  | null

+export type VNodeNormalizedRefAtom = {
+  i: ComponentInternalInstance,
+  r: VNodeRef,
+  k?: string,
+  f?: boolean
+}

+export type VNodeNormalizedRef = 
+  | VNodeNormalizedRefAtom
+  | VNodeNormalizedRefAtom[]

export interface VNode<
  HostNode = RendererNode,
  HostElement = RendererElement,
  ExtraProps = { [key: string]: any }
> {
  // core
  __v_isVNode: true;
  type: VNodeTypes;
  key: PropertyKey | null
  props: (VNodeProps & ExtraProps) | null
+  ref: VNodeNormalizedRef | null

  children: VNodeNormalizedChildren
  component: ComponentInternalInstance | null
  // DOM
  el: HostNode | null
  anchor: HostNode | null
  
  // optimization
  shapeFlag: number
}

const normalizeKey = ({ key }: VNodeProps): VNodeProps['key'] => 
  key != null ? key : null
+const normalizeRef = ({
+  ref,
+  ref_key,
+  ref_for,
+}: VNodeProps): VNodeNormalizedRefAtom | null => {
+  if (typeof ref === 'number') {
+    ref = '' + ref
+  }
+  return (ref != null
+    ? isString(ref) || isRef(ref) || isFunction(ref)
+      ? { i: currentInstance, r: ref, k: ref_key, f: !!ref_for }
+      : ref
+    : null
+  ) as any
+}

function createBaseVNode(
  type: VNodeTypes,
  props: (VNodeProps | Record<string, unknown>) | null = null,
  children: unknown = null,
  shapeFlag: number = type === Fragment ? 0 : ShapeFlags.ELEMENT
) {
  const vnode = {
    __v_isVNode: true,
    type, // 类型
    props, // 属性
    children, // 子节点
    component: null, // 组件实例
    shapeFlag, // 元素节点的标识
    el: null, // 虚拟节点对应的真实元素节点
    key: props && normalizeKey(props), // 虚拟节点的key
+    ref: props && normalizeRef(props),
  } as VNode

  // 如果有子节点，则标记子节点的类型
  if(children) {
    // 获取子节点的类型
    let type = 0
    if (isArray(children)) {
      type = ShapeFlags.ARRAY_CHILDREN // 数组
    } else if(isObject(children)) {
      type = ShapeFlags.SLOTS_CHILDREN; // 插槽
    } else {
      type = ShapeFlags.TEXT_CHILDREN // 文本
    }
    // 按位或运算，将type的值添加到shapeFlag中
    vnode.shapeFlag |= type 
  }

  return vnode
}

function _createVNode(
  type: VNodeTypes,
  props: (VNodeProps | Record<string, unknown>) | null = null,
  children: unknown = null
): VNode {
  const shapeFlag = isString(type) // 元素节点
    ? ShapeFlags.ELEMENT
    : isObject(type) // 组件节点
    ? ShapeFlags.STATEFUL_COMPONENT
    : 0
  return createBaseVNode(type, props, children, shapeFlag)
}

export const Text = Symbol.for('v-text')
export const Comment = Symbol.for('v-cmt')
export const Fragment = Symbol.for('v-fgt')

// 判断两个节点是否相同
export function isSameVNodeType(n1: VNode, n2: VNode): boolean {
  return n1.type === n2.type && n1.key === n2.key
}

export const isVNode = (value: any): value is VNode => {
  return value ? value.__v_isVNode === true : false
}

export const normalizeVNode = (child: VNodeChild): VNode => {
  // child 是 false 或 null, 返回一个空节点
  if (child == null || typeof child === 'boolean') { 
    return createVNode(Comment)
  } else if (isArray(child)) {
    return createVNode(
      Fragment as any,
      null,
      child.slice()
    )
  } else if (isObject(child)) {
    return child as VNode
  } else {
    return createVNode(Text, null, String(child))
  }
}

export function mergeProps(...args: (Data & VNodeProps)[]) {
  const ret: Data = {}
  for (let i = 0; i < args.length; i++) {
    const toMerge = args[i]
    for (const key in toMerge) {
      if (key === 'class') {
        if (ret.class !== toMerge.class) {
          ret.class = normalizeClass([ret.class, toMerge.class])
        }
      } else if (key === 'style') {
        ret.style = normalizeStyle([ret.style, toMerge.style])
      } else if (isOn(key)) {
        const existing = ret[key]
        const incoming = toMerge[key]
        if (
          incoming &&
          existing !== incoming &&
          !(isArray(existing) && existing.includes(incoming))
        ) {
          ret[key] = existing
            ? [].concat(existing as any, incoming as any)
            : incoming
        }
      } else if (key !== '') {
        ret[key] = toMerge[key]
      }
    }
  }
  return ret
}

export const createVNode = _createVNode
```

# 示例代码
## ref.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ref</title>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    // import { ref, render, h, Text, getCurrentInstance } from '../../node_modules/vue/dist/vue.esm-browser.js'
    import { ref, render, h, Text, getCurrentInstance } from '../../packages/vue/dist/vue.esm.js'

    const Modal = {
      props: {
        name: String,
      },
      setup(props, ctx) {
        const name = ref(props.name)
        const age = ref(18)
        const add = () => {
          age.value++
        }

        ctx.expose({
          age,
          add,
        })

        return () => h('div', {}, [
          h('div', {}, `${name.value}, ${age.value}`),
        ])
      },
    }

    const App = {
      // setup 代替 beforeCreate 和 created
      setup(props, ctx) {
        const name = ref('test')
        const comp = ref(null)

        // 当返回一个对象时，会作为setup函数的返回值，此时this指向setup函数的返回值
        return () => {
          return h('div', {}, [
            h('h2', {}, `name: ${name.value}`),
            h(Modal, {name: 'modal', key: 'modal', ref: comp}), ,
            h('button', { onClick: () => {
              console.log(comp.value)
              comp.value.add()
            }}, 'add child age')
          ])
        }
      },
    }
    render(h(App, {}), document.querySelector('#app'))
  </script>
</body>
</html>
```

# 测试代码
```shell
pnpm preview
```



