# 树：DOM 遍历/虚拟 DOM diff/BST/Trie 前缀树实战（面试收藏级）

> **副标题**：递归与迭代遍历、BST 有序性、Trie 前缀匹配——前端高频树形结构全解

> 面试官翻着简历随口一问：「你了解二叉树吗？」你说了解。他接着问：「那二叉搜索树为什么可能退化成链表？红黑树又是怎么把它救回来的？」你答了「会不平衡」，但再往下的旋转、着色、为什么 Java 的 HashMap 链表长度超过 8 就要转红黑树，就说不出所以然了。**这题的分水岭，恰恰在于你把它当成一个「数据结构知识点」，还是当成一棵「每天都在用的树」**——DOM 是树、虚拟 DOM 是树、级联选择是树、路由表也能组织成树。这篇文章，就把前端里的树一次性讲透：从遍历到有序查找，从前缀匹配到工程落地。

---

## 🎯 这篇文章解决什么问题

这是「**前端数据结构与算法**」系列的第 **7 篇**。上一篇讲集合与散列表，这一篇进入**非线性结构**的第一站——树。

前面六篇讲的栈、队列、链表、集合、散列表，都是「线性」的：元素一个接一个排成一条线。而树是**分层**的——它天生适合表达「父子、层级、归属」这类关系，而这恰恰是前端最常见的结构形态。

这一篇的主线只有一条，但串起了四层内容：

**先用一棵树讲清「怎么走」（遍历），再讲清「怎么有序」（BST），然后讲清「怎么前缀匹配」（Trie），最后落回「工程里怎么用」（DOM / 虚拟 DOM diff / 树形控件）。**

全篇覆盖四块：

- **两种遍历思路**：深度优先 DFS（递归 + 显式栈）与广度优先 BFS（队列），以及它们在前端的真实用途
- **先中后序三种序**：递归写法的简洁与迭代写法的栈技巧，逐一拆到每一行为什么这么写
- **BST → AVL → 红黑树**：从「有序性」出发，看清一棵树为什么会退化、又是怎么被旋转救回来的
- **Trie 前缀树**：用一个「药品搜索自动补全」的完整 demo，把字符串前缀匹配讲到底

读完你会同时拿到两样东西：**讲得清「为什么」**，和**答得出「面试怎么问」**。

---

## 一、场景切入：树在前端无处不在

先说结论：**树不是课本里的抽象结构，它是前端页面最主流的组织方式**。你随手打开一个页面，分层结构俯仰皆是。

前端工作里最常见的树，至少有这几处：

- **DOM 树**：`<html>` 下面挂 `<head>`、`<body>`，每个元素又能有子元素——整个页面就是一棵树
- **级联选择**：药品的「科室 → 疾病 → 药品」三级联动，选项之间是父子关系
- **树形控件**：后台管理里的权限树、组织架构树、药品说明书目录树
- **路由 / 菜单**：一级菜单下挂二级菜单，二级菜单下挂三级页面
- **虚拟 DOM**：React / Vue 的组件渲染结果，本质还是一棵树

**它们能被一棵树统一表达，是因为「分层」这件事本身。** 一旦数据有了「上下级」「包含关系」，树就是最自然的模型。

🔧 **真实场景**：在药品电商的搜索框里，用户输入「阿莫」两个字，下拉框要在几十毫秒内列出所有「阿莫」开头的药品——「阿莫西林胶囊」「阿莫西林克拉维酸钾片」「阿莫西林颗粒」。如果用 `filter + startsWith` 去扫几万条药品名，每次输入都是一次全量遍历；而把药品名存进一棵 **Trie（前缀树）**，找到「阿莫」这个前缀节点后，只需把它的子树一收，结果秒出。这就是本篇第七章要手写的东西。

再埋一个钩子：下面这棵树，用 DFS 和 BFS 分别走一遍，出来的节点顺序**完全不同**：

```javascript
//           a
//         /   \
//        b     c
//       / \   / \
//      d   e f   g
```

**DFS 得到 `a b d e c f g`，BFS 得到 `a b c d e f g`**——同一棵树、同一批节点，为什么顺序差这么多？这就是第三章要讲透的事。

---

## 二、树是什么：分层数据的抽象模型

### 一句话定义

**树（Tree）是一种「分层数据」的抽象模型。**

它长这样——顶层一个根，根下面分叉出若干子节点，子节点又能继续分叉，一层层往下：

```javascript
// JS 中并没有「树」这种类型，我们用 Object + Array 来构建
const orgTree = {
  value: '内科',              // 节点自身的数据
  children: [                 // 子节点用数组装
    {
      value: '呼吸内科',
      children: [
        { value: '慢阻肺' },
        { value: '哮喘' }
      ]
    },
    {
      value: '心内科',
      children: [
        { value: '高血压' },
        { value: '冠心病' }
      ]
    }
  ]
};
```

请注意这段数据的形态：**一个节点 = 一个存数据的字段（`value`）+ 一个装子节点的数组（`children`）**。整棵树就是这样一个嵌套的 Object，不需要任何特殊类型——这正是树在前端如此「顺手」的原因。

### 术语速记

面试里聊树，术语是绕不开的。这张表值得存一下：

| 术语 | 含义 |
|------|------|
| 根节点（root） | 树最顶层的那个节点，没有父节点 |
| 父节点 / 子节点 | 上下相邻的两个节点，构成父子关系 |
| 叶子节点（leaf） | 没有子节点的节点，是树的「末端」 |
| 兄弟节点（sibling） | 同一个父节点下的节点互为兄弟 |
| 子树（subtree） | 以某个节点为根，连同其所有后代构成的树 |
| 深度（depth） | 从根到该节点的边数（根节点深度为 0） |
| 高度（height） | 从该节点到最远叶子的边数（叶子高度为 0） |
| 度（degree） | 一个节点拥有的子节点个数 |

### 二叉树：最常用的一种树

树有很多变体，但**前端和面试里九成场景都是二叉树**：每个节点最多只能有两个子节点。

```javascript
// JS 中通常用 Object 来模拟二叉树：left / right 各挂一个子节点
const bt = {
  value: 1,
  left: {
    value: 2,
    left: { value: 4 },
    right: { value: 5 }
  },
  right: {
    value: 3,
    left: { value: 6 },
    right: { value: 7 }
  }
};
```

对比一下：多叉树用 `children: []`（子节点数量不限），二叉树用 `left` / `right`（最多两个）。**二叉树之所以重要，是因为它的两个子节点有「左」「右」的位置语义**——有了位置，才有了「有序」的可能，也才有了后面的 BST。

### 树的核心操作

树的常用操作，其实就两类：

- **深度 / 广度优先遍历**：怎么把整棵树的节点都访问一遍（第三章）
- **先 / 中 / 后序遍历**：二叉树特有的三种访问顺序（第四章）

后面所有的题、所有的工程场景，都是在这两个基本操作上长出来的。

> 💬 **面试官**：树和链表、图的本质区别是什么？为什么说树特别适合递归？
>
> ✅ 标准答案：链表是「一对一」的线性结构，每个节点只有一个后继；图是「多对多」的网络结构，节点之间可以任意相连；树介于两者之间，是「一对多」的**层次结构**——每个节点只有一个父节点，但可以有多个子节点，且不存在环。树特别适合递归，是因为**「树的定义本身就是递归的」**：一棵树 = 根节点 + 若干棵子树，而每棵子树又是一棵树。所以处理树的时候，只要处理好「当前节点做什么」，再对左右子树递归调用同一个函数即可——函数的结构天然对应数据的结构。
>
> 🎁 加分答案：能补上两点——① 树与图的边界：**树是「无环连通图」的一个特例**，所以树上的很多问题（遍历、路径、公共祖先）在图算法里都有对应版本，只是树上没有环，处理起来更简单；② 递归处理树的代价：递归深度等于树高，**一棵退化成链表的树递归下去会爆栈**（JS 调用栈通常约 1 万层），这也是为什么有些场景（如 React Fiber 遍历 DOM）要把递归改写成显式栈的迭代写法——这正是本篇第三章要讲的。

---

## 三、遍历（重点）：DFS 与 BFS

「遍历」就是**把树里的每个节点都访问一遍，且只访问一次**。听起来简单，但访问的**顺序**不同，能解决的问题就完全不同。最基础的是两种思路：深度优先和广度优先。

![深度优先遍历 vs 广度优先遍历（发布前请自行转存素材库）](https://cdn.nlark.com/yuque/0/2022/png/738210/1641274488781-37bffafa-a73e-4df5-8a48-2220c4c0635e.png)

用一句话先分清两者：

- **深度优先（DFS）**：尽可能深地搜索树的分支——一条路走到黑，撞到叶子再回头
- **广度优先（BFS）**：先访问离根节点最近的节点——一层一层往外扩散

### 深度优先遍历：递归就够了

DFS 的算法口诀只有两句：

- 访问根节点
- 对根节点的 `children` **依次**进行深度优先遍历

你会发现，这个口诀本身就是**递归定义**——「遍历一棵树」= 「访问根 + 遍历每棵子树」。所以 DFS 的代码写起来异常自然：

```typescript
// src/data-structures/tree/dfs.ts
export function depthFirstSearch(tree: Record<string, any>, nodeList: Array<any>): Array<any> {
  if (tree) {
    nodeList.push(tree.value);        // ① 访问根节点
    const children = tree.children;
    for (let i = 0; i < children?.length; i++) {
      depthFirstSearch(children[i], nodeList);  // ② 对每个孩子依次 DFS
    }
  }
  return nodeList;
}
```

配一组测试，跑一遍就明白了：

```typescript
// src/data-structures/tree/test/dfs.test.ts
import "mocha";
import { expect, assert } from "chai";
import { depthFirstSearch } from "../dfs";

describe("树 Tree 测试", function () {
  it("深度优先遍历", function () {
    const tree = {
      value: 'a',
      children: [
        {
          value: 'b',
          children: [
            { value: 'd' },
            { value: 'e' }
          ]
        },
        {
          value: 'c',
          children: [
            { value: 'f' },
            { value: 'g' }
          ]
        }
      ],
    };
    const nodeList: Array<any> = [];
    depthFirstSearch(tree, nodeList);
    expect(nodeList).to.be.deep.equal(['a', 'b', 'd', 'e', 'c', 'f', 'g']);
  });
});
```

**输出是 `a → b → d → e → c → f → g`**：先一头扎进 `b` 分支，把 `d`、`e` 访问完，再回头处理 `c` 分支。这正是「深度优先」的字面意思。

### 广度优先遍历：需要一个队列

BFS 的口诀有四句：

- 新建一个队列，把根节点入队
- 把队头出队并访问
- 把队头的 `children` 依次入队
- 重复第二、三步，直到队列为空

关键在于**「队列」这个辅助结构**：入队时子节点排在队尾，出队时从队头取——先入先出，正好保证了「同一层的节点先被访问完，才会轮到下一层」。

```typescript
// src/data-structures/tree/bfs.ts
export function breadthFirstSearch(tree: Record<string, any>, nodeList: Array<any>): Array<any> {
  const queue = [];                                  // 新建一个队列
  if (tree) {
    queue.unshift(tree);
    while (queue.length !== 0) {                     // 重复二、三步
      const node = queue.shift();                    // 队头出队
      nodeList.push(node?.value);                    // 访问队头
      const children: any = node?.children;
      for (let i = 0; i < children?.length; i++) {
        queue.push(children[i]);                     // 队头的 children 依次入队
      }
    }
  }
  return nodeList;
}
```

测试用的还是同一棵树：

```typescript
// src/data-structures/tree/test/bfs.test.ts
import "mocha";
import { expect, assert } from "chai";
import { breadthFirstSearch } from "../bfs";

describe("树 Tree 测试", function () {
  it("广度优先遍历", function () {
    const tree = {
      value: 'a',
      children: [
        {
          value: 'b',
          children: [
            { value: 'd' },
            { value: 'e' }
          ]
        },
        {
          value: 'c',
          children: [
            { value: 'f' },
            { value: 'g' }
          ]
        }
      ],
    };
    const nodeList: Array<any> = [];
    breadthFirstSearch(tree, nodeList);
    expect(nodeList).to.be.deep.equal(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  });
});
```

**同一棵树，DFS 得到 `a b d e c f g`，BFS 得到 `a b c d e f g`**——这就是本章开头埋的钩子。区别的根源只有一句话：**DFS 用函数调用栈（后进先出的天然递归），BFS 用显式队列（先进先出）**。

### 什么时候用 DFS，什么时候用 BFS

| 维度 | DFS 深度优先 | BFS 广度优先 |
|------|-------------|-------------|
| 辅助结构 | 函数调用栈 / 显式栈 | 队列 |
| 访问顺序 | 一条分支走到底再回头 | 一层一层往外扩散 |
| 适合的问题 | 找所有路径、检测环、拓扑排序、回溯 | 最短路径、层序遍历、找最近的解 |
| 空间代价 | 与树高成正比 | 与最宽一层的节点数成正比 |

一句话记住选择依据：**要「找最近的」用 BFS（第一次到达即最短），要「找所有的」用 DFS。**

🔧 **真实场景**：药品的「科室 → 疾病 → 药品」三级级联菜单，渲染时用 **BFS 层序**获取每一级的数据（先拿科室，再拿疾病，最后拿药品），层级关系一目了然；而权限校验时要在整棵组织树里找一个用户的归属节点，用 **DFS** 一路深入更快命中目标。

> 💬 **面试官**：DFS 和 BFS 分别用什么辅助结构？为什么？
>
> ✅ 标准答案：**DFS 用栈（或函数调用栈），BFS 用队列**。原因是访问顺序的需求不同：DFS 要「一条路走到黑、撞到叶子再回头」，这个「回头」的语义正是栈的后进先出——最后进入的分支最先处理完；BFS 要「先访问完离根近的一层，再访问下一层」，需要严格按入队顺序出队，恰好是队列的先进先出。所以两个算法的骨架完全一样，**换掉辅助结构，遍历顺序就变了**。
>
> 🎁 加分答案：能补上三点——① **DFS 的递归写法本质上就是用「引擎托管的函数调用栈」**，一旦改成显式栈的迭代写法，就只是把栈从引擎手里拿回到自己手里（第四章二叉树的非递归遍历就是这个思路）；② **复杂度对比**：两者时间复杂度都是 O(n)（每个节点访问一次），空间复杂度 DFS 最坏 O(n)（树退化成链）、最好 O(logn)（完全二叉树）；BFS 空间是 O(w)，w 为树的最大宽度，宽而浅的树 BFS 更吃内存；③ **递归爆栈问题**：树很深时 DFS 递归会触发 `Maximum call stack size exceeded`，工程里要么改成显式栈迭代，要么做深度限制——这也是 React Fiber 不用递归遍历组件树的原因。

---

## 四、二叉树的先中后序遍历

多叉树的 DFS 只有一种「访问根 → 遍历子树」的顺序，但**二叉树有两个子节点（左、右），就有了「根」夹在左右之间的位置问题**——于是衍生出三种经典顺序。

![二叉树的先序、中序、后序遍历对比（发布前请自行转存素材库）](https://cdn.nlark.com/yuque/0/2022/png/738210/1641358067072-6331ebbd-b005-4026-adbc-fb97bb905622.png)

### 三种序的口诀与用途

三者的区别，只在于「访问根节点」这一步放在哪：

- **先序**（根 → 左 → 右）：先访问根，再左，再右
- **中序**（左 → 根 → 右）：先左，再访问根，再右
- **后序**（左 → 右 → 根）：先左，再右，最后访问根

顺序不同，用途就不同——**面试里真正想听的是「你知不知道它们各自用来干什么」**：

| 遍历顺序 | 访问次序 | 典型用途 |
|---------|---------|---------|
| 先序 | 根 → 左 → 右 | 复制一棵树、序列化/反序列化 |
| 中序 | 左 → 根 → 右 | **BST 中序遍历直接得到有序序列** |
| 后序 | 左 → 右 → 根 | 删除树、计算目录总大小（先处理完子节点再处理自己） |

后面的测试统一用这棵树：

```typescript
const tree = {
  value: 1,
  left: {
    value: 2,
    left: { value: 4 },
    right: { value: 5 }
  },
  right: {
    value: 3,
    left: { value: 6 },
    right: { value: 7 }
  }
};
```

### 先序遍历

口诀：**访问根节点 → 左子树先序 → 右子树先序**。

![先序遍历示意图（发布前请自行转存素材库）](https://cdn.nlark.com/yuque/0/2022/png/738210/1641284147446-146f6f8a-76ef-4f38-86cd-8f7ae2647989.png)

递归写法——把口诀一句句翻译成代码：

```typescript
// src/data-structures/tree/bt.ts
// 先序遍历
export function preOrderTraversal(tree: Record<string, any>, nodeList: Array<any>) {
  if (tree) {
    nodeList.push(tree?.value);            // 访问根节点
    preOrderTraversal(tree?.left, nodeList);   // 左子树先序
    preOrderTraversal(tree?.right, nodeList);  // 右子树先序
  }
  return nodeList;
}
```

```typescript
// src/data-structures/tree/test/bt.test.ts
import "mocha";
import { expect, assert } from "chai";
import { preOrderTraversal } from "../bt";

describe("二叉树(Binary Tree)遍历(递归) 测试", function () {
  it("先序遍历", function () {
    const nodeList: Array<any> = [];
    preOrderTraversal(tree, nodeList);
    expect(nodeList).to.be.deep.equal([1, 2, 4, 5, 3, 6, 7]);
  });
});
```

### 用栈实现先序（非递归）

递归虽然简洁，但依赖引擎的调用栈。**面试里被追问「非递归怎么写」，就是要你把栈显式地管起来**。先序的迭代写法很巧妙：

```typescript
// src/data-structures/tree/bt.ts
// 先序遍历-非递归
export function preOrderTraversal(tree: Record<string, any>, nodeList: Array<any>) {
  if (tree) {
    const stack = [];
    stack.push(tree);                          // 根节点入栈
    while (stack.length > 0) {
      const node = stack.pop();                // （根)节点出栈
      nodeList.push(node?.value);              // 访问(根)节点
      node?.right && stack.push(node?.right);  // 右子树先入栈
      node?.left && stack.push(node?.left);    // 左子树后入栈
    }
  }
  return nodeList;
}
```

**这里有个反直觉的细节：先压右子树，再压左子树**。为什么？因为栈是**后进先出**——后压进去的左子节点会先出栈，这样访问顺序才是「根 → 左 → 右」。如果压入顺序写反，输出就变成「根 → 右 → 左」了。这个「倒着压」的技巧，是后面后序遍历迭代写法的关键铺垫。

```typescript
describe("二叉树(Binary Tree)遍历(非递归) 测试", function () {
  it("先序遍历", function () {
    const nodeList: Array<any> = [];
    preOrderTraversal(tree, nodeList);
    assert.deepEqual(nodeList, [1, 2, 4, 5, 3, 6, 7]);
  });
});
```

### 中序遍历

口诀：**左子树中序 → 访问根节点 → 右子树中序**。

![中序遍历示意图（发布前请自行转存素材库）](https://cdn.nlark.com/yuque/0/2022/png/738210/1641284147446-146f6f8a-76ef-4f38-86cd-8f7ae2647989.png)

```typescript
// src/data-structures/tree/bt.ts
// 中序遍历
export function inOrderTraversal(tree: Record<string, any>, nodeList: Array<any>) {
  if (tree) {
    inOrderTraversal(tree?.left, nodeList);   // 左子树中序
    nodeList.push(tree?.value);               // 访问根节点
    inOrderTraversal(tree?.right, nodeList);  // 右子树中序
  }
  return nodeList;
}
```

```typescript
// src/data-structures/tree/test/bt.test.ts
import { inOrderTraversal } from "../bt";

describe("二叉树(Binary Tree)遍历(递归) 测试", function () {
  it("中序遍历", function () {
    const nodeList: Array<any> = [];
    inOrderTraversal(tree, nodeList);
    expect(nodeList).to.be.deep.equal([4, 2, 5, 1, 6, 3, 7]);
  });
});
```

中序的迭代写法和先序不太一样——它不能简单地「根入栈」，而要走一条「**一路向左**」的路径：

```typescript
// src/data-structures/tree/bt.ts
// 中序遍历-非递归
export function inOrderTraversal(tree: Record<string, any>, nodeList: Array<any>) {
  if (tree) {
    const stack = [];
    let p = tree;
    while (stack.length > 0 || p) {
      while (p) {          // 一路向左，把路径上的节点全部入栈
        stack.push(p);
        p = p?.left;
      }
      const node = stack.pop();    // 左子树最左叶子节点出栈
      nodeList.push(node?.value);  // 访问(根)节点
      p = node?.right;             // 转向右子树
    }
  }
  return nodeList;
}
```

**中序迭代的思路**：先顺着左链一路压栈，直到没有左孩子；弹出栈顶（此时它一定是最左下、也就是「最该先访问」的节点）、访问它；然后转向它的右子树，重复上述过程。这正好复刻了递归展开的顺序。

```typescript
describe("二叉树(Binary Tree)遍历(非递归) 测试", function () {
  it("中序遍历", function () {
    const nodeList: Array<any> = [];
    inOrderTraversal(tree, nodeList);
    assert.deepEqual(nodeList, [4, 2, 5, 1, 6, 3, 7]);
  });
});
```

### 后序遍历

口诀：**左子树后序 → 右子树后序 → 访问根节点**。

![后序遍历示意图（发布前请自行转存素材库）](https://cdn.nlark.com/yuque/0/2022/png/738210/1641284147446-146f6f8a-76ef-4f38-86cd-8f7ae2647989.png)

```typescript
// src/data-structures/tree/bt.ts
// 后序遍历
export function postOrderTraversal(tree: Record<string, any>, nodeList: Array<any>) {
  if (tree) {
    postOrderTraversal(tree?.left, nodeList);   // 左子树后序
    postOrderTraversal(tree?.right, nodeList);  // 右子树后序
    nodeList.push(tree?.value);                 // 访问根节点
  }
  return nodeList;
}
```

```typescript
// src/data-structures/tree/test/bt.test.ts
import { postOrderTraversal } from "../bt";

describe("二叉树(Binary Tree)遍历(递归) 测试", function () {
  it("后序遍历", function () {
    const nodeList: Array<any> = [];
    postOrderTraversal(tree, nodeList);
    expect(nodeList).to.be.deep.equal([4, 5, 2, 6, 7, 3, 1]);
  });
});
```

后序的迭代是三种里最绕的，但有一个**非常漂亮的技巧**：后序是「左 → 右 → 根」，如果把它整体反过来，就是「根 → 右 → 左」——而后者只要照抄先序遍历（把左右交换）就能得到。

```typescript
// src/data-structures/tree/bt.ts
// 后序遍历-非递归
// 左 --> 右 --> 根
// 先：根 --> 左 --> 右 反转 右 --> 左 --> 根
export function postOrderTraversal(tree: Record<string, any>, nodeList: Array<any>) {
  if (tree) {
    const stack = [];
    stack.push(tree);                          // 根节点入栈
    while (stack.length > 0) {
      const node = stack.pop();
      nodeList.push(node?.value);              // 变形后的先序：根 --> 右 --> 左
      node?.left && stack.push(node?.left);    // 注意：左子树先入栈
      node?.right && stack.push(node?.right);  // 右子树后入栈
    }
  }
  return nodeList.reverse();   // 反转一次，得到 左 --> 右 --> 根
}
```

**注意这里的压栈顺序和先序正好相反**：先压左、后压右，于是出栈是「右 → 左」，产生的是「根 → 右 → 左」的序列；最后 `reverse()` 一翻，就得到了「左 → 右 → 根」。**一个 reverse，省掉了一整套「判断右子树是否已访问」的复杂逻辑**——这是很值得记住的工程技巧。

```typescript
describe("二叉树(Binary Tree)遍历(非递归) 测试", function () {
  it("后序遍历", function () {
    const nodeList: Array<any> = [];
    postOrderTraversal(tree, nodeList);
    assert.deepEqual(nodeList, [4, 5, 2, 6, 7, 3, 1]);
  });
});
```

### 三种遍历的复杂度

三种遍历（无论递归还是迭代）**时间复杂度都是 O(n)**——每个节点恰好访问一次。空间复杂度取决于树高：最好 O(logn)（完全二叉树），最坏 O(n)（退化成链）。

> 💬 **面试官**：中序遍历 BST 得到的是什么？递归和非递归遍历怎么互相转换？
>
> ✅ 标准答案：**对二叉搜索树做中序遍历，得到的一定是一个升序序列**——因为中序是「左 → 根 → 右」，而 BST 左子树的所有值都小于根、右子树都大于根，按这个顺序读出来天然有序。这也是判断一棵树是不是 BST 的直接方法（中序结果是否严格递增）。至于递归与非递归的转换：**递归只是「用引擎的函数调用栈」帮你保存了回溯现场，改写成非递归，就是自己显式建一个栈来保存同样的现场**——先序是「入栈输出，先右后左」；中序是「一路向左压栈，弹出输出后转向右子树」；后序是「按变形先序得到根右左，最后整体反转」。
>
> 🎁 加分答案：能补上三点——① **为什么非要会非递归**：递归的深度受栈空间限制，树深时会 `Maximum call stack size exceeded`，改成显式栈既避免了爆栈，也让「遍历过程可中断」成为可能（React Fiber 的工作循环就是这么干的）；② **Morris 遍历**：还有一种 O(1) 额外空间的中序遍历——利用叶子节点的空闲右指针临时指回祖先（线索化），遍历完再改回来，面试里报出这个名字是明显的加分项；③ **前序 + 中序（或后序 + 中序）可以唯一确定一棵二叉树**，这是 LeetCode 105 的原理——但**前序 + 后序不行**，因为无法确定左右子树的边界。

🔧 **真实场景**：药品说明书是一份有层级的目录（「适应症 → 用法用量 → 不良反应」），要在客户端缓存这份目录，可以先**先序遍历**序列化成一串带层级标记的字符串，读的时候再按同样的先序规则反序列化回树——**先序之所以适合序列化，是因为「根在最前面」，反序列化时第一个读到的就是根，边界清晰**。这也是很多序列化格式（如 JSON 的嵌套对象、HTML）递归解析的底层逻辑。

---

## 五、二叉搜索树 BST：让查找变成 O(log n)

普通二叉树只是「长得像树」，但节点的值怎么摆是没规矩的——要找一个值，只能把每个节点挨个看一遍，O(n)。**二叉搜索树（Binary Search Tree，BST）的价值，就是给「值的摆放」加上一条规则，让查找变成二分。**

### BST 的定义与有序性

BST 的规则只有一句话：

**对于任意一个节点，它的左子树里所有节点的值都小于它，右子树里所有节点的值都大于它。**

```
        11
       /  \
      7    15
     / \   / \
    5   9 13  20
```

对照这棵树：`7` 的左子树全是比 7 小的（`5`），右子树全是比 7 大的（`9`）——每个节点都满足这个性质。

有了这条规则，查找就有了「方向感」：**目标比当前节点小就往左走，大就往右走**，每一步都能排除掉一半的子树，平均复杂度 **O(log n)**，和二分查找是一个思路。

先准备两个基础工具，后面所有树都用得上：

```typescript
// src/data-structures/util/index.ts
export enum Compare {
  LESS_THAN = -1,
  BIGGER_THAN = 1,
  EQUAL = 0
}

export const defaultCompare = (a: any, b: any) => {
  if (a === b) {
    return Compare.EQUAL;
  }
  return a < b ? Compare.LESS_THAN : Compare.BIGGER_THAN;
}
```

```typescript
// src/data-structures/models/node.ts
export class Node {
  constructor(
    public key: any,                 // 节点值
    public left: Node | null = null, // 左子节点引用
    public right: Node | null = null // 右子节点引用
  ) {}
}
```

**为什么要抽出一个 `compareFn`？** 因为树的「大小」不该写死成数字比较——如果节点存的是药品对象，你可能想按价格比、按上架时间比。把比较逻辑抽成可传入的函数，同一个 `BinarySearchTree` 就能复用来存任意类型的数据。这是很典型的「面向接口编程」思路。

### 插入

插入的核心是**从根开始比较，一路找到那个「空缺的位置」**：

```typescript
// src/data-structures/tree/binarySearchTree.ts
import { defaultCompare, Compare } from '../../util';
import { Node } from '../../models/node';

export default class BinarySearchTree {
  protected root: Node | null;
  constructor(protected compareFn = defaultCompare) {
    this.root = null; // Node 类型的根节点
  }
  // 插入一个键
  insert(key: any) {
    if (!this.root) {
      this.root = new Node(key);        // 空树：直接当根
    } else {
      this.insertNode(this.root, key);  // 否则从根开始往下找位置
    }
  }
  protected insertNode(node: Node, key: any) {
    if (this.compareFn(key, node.key) === Compare.LESS_THAN) {
      if (!node.left) {
        node.left = new Node(key);      // 左边空着，就放这儿
      } else {
        this.insertNode(node.left, key); // 否则递归进左子树
      }
    } else {
      if (!node.right) {
        node.right = new Node(key);     // 右边空着，就放这儿
      } else {
        this.insertNode(node.right, key);
      }
    }
  }
  // 返回根节点
  getRoot() {
    return this.root;
  }
```

**注意这里的分工**：`insert` 负责处理「空树」这个边界情况，`insertNode` 负责通用的递归逻辑。这种「公开方法处理边界 + 私有方法做递归」的模式，在后面 `search`、`remove` 里会反复出现——它让递归函数可以假设「传入的 node 一定非空」，逻辑干净很多。

### 查找

查找就是**带着目标值一路往下比较**：

```typescript
  // 查找一个键
  search(key: any): boolean {
    return this.searchNode(this.root, key);
  }
  private searchNode(node: Node | null, key: any): boolean {
    if (!node) return false;                                  // 走到空，没找到
    const compare = this.compareFn(key, node.key);
    if (compare === Compare.LESS_THAN) {
      return this.searchNode(node.left, key);                 // 小了往左
    } else if (compare === Compare.BIGGER_THAN) {
      return this.searchNode(node.right, key);                // 大了往右
    } else {
      return true;                                            // 相等，命中
    }
  }
```

**`if (!node) return false;` 这一行是递归的终止条件**，也是最容易被忽略的地方：当目标值不存在时，递归会一路走到某个 `null` 子节点，这时必须返回 `false`，否则就会无限递归下去。

### 三种遍历（BST 上通用）

BST 继承自二叉树，先中后序遍历完全一样。这里的价值在于：**对 BST 跑一次中序遍历，输出的就是全树有序的序列**。

```typescript
  // 先序遍历
  preOrderTraverse(callback: Function) {
    this.preOrderTraverseNode(this.root, callback);
  }
  private preOrderTraverseNode(node: Node | null, callback: Function) {
    if (node) {
      callback(node.key);
      this.preOrderTraverseNode(node.left, callback);
      this.preOrderTraverseNode(node.right, callback);
    }
  }
  // 中序遍历
  inOrderTraverse(callback: Function) {
    this.inOrderTraverseNode(this.root, callback);
  }
  private inOrderTraverseNode(node: Node | null, callback: Function) {
    if (node) {
      this.inOrderTraverseNode(node.left, callback);
      callback(node.key);
      this.inOrderTraverseNode(node.right, callback);
    }
  }
  // 后序遍历
  postOrderTraverse(callback: Function) {
    this.postOrderTraverseNode(this.root, callback);
  }
  private postOrderTraverseNode(node: Node | null, callback: Function) {
    if (node) {
      this.postOrderTraverseNode(node.left, callback);
      this.postOrderTraverseNode(node.right, callback);
      callback(node.key);
    }
  }
```

```typescript
  // 返回树中最小的值/键
  min(): Node | null {
    return this.minNode(this.root);
  }
  private minNode(node: Node | null) {
    let current = node;
    while (current && current.left) {
      current = current.left;    // 最小的一定在最左下角
    }
    return current;
  }
  // 返回树中最大的值/键
  max(): Node | null {
    return this.maxNode(this.root);
  }
  private maxNode(node: Node | null): Node | null {
    let current = node;
    while (current && current.right) {
      current = current.right;   // 最大的一定在最右下角
    }
    return current;
  }
```

**这里为什么用循环而不用递归？** 因为「一直往左走」是一个**单向、无分支**的过程——不需要回溯，所以循环比递归更直白，也没有爆栈风险。这也提示了一个判断标准：**递归适合「有分叉、要走回来」的场景，纯粹的直线推进用循环就好。**

### 删除：BST 里最难的一步

删除之所以难，是因为「删掉一个节点」之后，**树的有序性不能被破坏**。分三种情况，难度递增：

```typescript
  // 移除某个键
  remove(key: any) {
    this.root = this.removeNode(this.root, key);
  }
  protected removeNode(node: Node | null, key: any): Node | null {
    if (!node) return null;
    const compare = this.compareFn(key, node.key);
    if (compare === Compare.LESS_THAN) {        // 键小于 node.key
      node.left = this.removeNode(node.left, key);
      return node;
    } else if (compare === Compare.BIGGER_THAN) { // 键大于 node.key
      node.right = this.removeNode(node.right, key);
      return node;
    } else {                                     // 找到了，键等于 node.key
      // 第一种情况：叶子节点，没有左右孩子
      if (!node.left && !node.right) {
        node = null;
        return node;
      }
      // 第二种情况：只有一个孩子
      if (!node.left) {
        node = node.right;    // 用右孩子顶上
        return node;
      } else if (!node.right) {
        node = node.left;     // 用左孩子顶上
        return node;
      }
      // 第三种情况：有两个孩子
      const aux = this.minNode(node.right);          // 找右子树的最小节点（后继）
      node.key = aux?.key;                           // 用后继的值覆盖当前节点
      node.right = this.removeNode(node.right, aux?.key); // 再去右子树里删掉那个后继
      return node;
    }
  }
}
```

下面把三种情况逐个拆开讲。

**情况一：删除叶子节点**（没有子节点）。直接把这个节点置为 `null` 就行——它本来就是链条的末端，拿掉不影响任何东西。

**情况二：删除只有一个孩子的节点**。让这个唯一的孩子「顶替」自己的位置——因为 BST 的性质保证了这棵子树上所有值都还在正确的大小关系里，直接接上去即可。

**情况三：删除有两个孩子的节点**（最复杂）。不能简单替换，因为左右两棵子树都得保留。解法是：

1. 找到**右子树里的最小节点**（它叫被删节点的「中序后继」——中序遍历里，它正好排在被删节点的下一个）
2. 用这个后继的值**覆盖**被删节点的值
3. 再递归地去右子树里删掉那个后继节点——**而后继节点最多只有一个右孩子**（它已经是最小了，不可能有左孩子），删除它退化成了情况一或情况二

**这就是 BST 删除的精髓：把一个「两个孩子的难问题」，转化成一个「最多一个孩子的简单问题」。**

### 完整测试

```typescript
// src/data-structures/tree/test/binarySearchTree.test.ts
import "mocha";
import { expect, assert } from "chai";
import BinarySearchTree from "../binarySearchTree";

describe("二叉搜索树-BinarySearchTree 测试", function () {
  const tree = new BinarySearchTree();
  it("insert", function () {
    tree.insert(11);
    tree.insert(7);
    tree.insert(15);
    tree.insert(5);
    tree.insert(3);
    tree.insert(9);
    tree.insert(8);
    tree.insert(10);
    tree.insert(13);
    tree.insert(12);
    tree.insert(14);
    tree.insert(20);
    tree.insert(18);
    tree.insert(25);
    tree.insert(6);
    expect(tree.getRoot()?.key).to.be.deep.equal(11);   // 第一个插入的 11 成为根
  });
```

先看插入和三种遍历的断言：

```typescript
  it("preOrderTraverse", function () {
    let str = ``;
    tree.preOrderTraverse((v: any) => str += `${v} `);
    expect(str).to.be.deep.equal('11 7 5 3 6 9 8 10 15 13 12 14 20 18 25 ');
  });
  it("inOrderTraverse", function () {
    let str = ``;
    tree.inOrderTraverse((v: any) => str += `${v} `);
    // 👈 注意：中序输出是严格升序的
    expect(str).to.be.deep.equal('3 5 6 7 8 9 10 11 12 13 14 15 18 20 25 ');
  });
  it("postOrderTraverse", function () {
    let str = ``;
    tree.postOrderTraverse((v: any) => str += `${v} `);
    expect(str).to.be.deep.equal('3 6 5 8 10 9 7 12 14 13 18 25 20 15 11 ');
  });
```

再验证 `min` / `max` / `search` / `remove`：

```typescript
  it("min", function () {
    const min = tree.min();
    expect(min?.key).to.be.deep.equal(3);
  });
  it("max", function () {
    const max = tree.max();
    expect(max?.key).to.be.deep.equal(25);
  });
  it("search", function () {
    const hasKey = [tree.search(3), tree.search(20), tree.search(30)];
    expect(hasKey).to.be.deep.equal([true, true, false]);  // 30 不在树里
  });
  it("remove", function () {
    tree.remove(6);   // 情况三：有两个孩子（6 是 5 的右孩子，5 只有 6 一个孩子）
    tree.remove(5);   // 情况二/三
    tree.remove(15);  // 情况三：删除有两个孩子的 15
    let str = ``;
    tree.inOrderTraverse((v: any) => str += `${v} `);
    expect(str).to.be.deep.equal('3 7 8 9 10 11 12 13 14 18 20 25 ');
  });
});
```

**测试里最有价值的一条是 `inOrderTraverse`**：即便经历了 15 次插入，中序输出依然是严格升序的 `3 5 6 7 8 9 ... 25`——这就是 BST 有序性最直观的验证。你也可以把它当成「怎么验证自己的 BST 写对了」的通用手段。

### 复杂度：平均 O(log n)，最坏 O(n)

| 操作 | 平均 | 最坏 |
|------|------|------|
| 插入 | O(log n) | O(n) |
| 查找 | O(log n) | O(n) |
| 删除 | O(log n) | O(n) |

**为什么会有「最坏 O(n)」？** 因为 BST 的形态完全取决于**插入顺序**。如果按 `1, 2, 3, 4, 5, 6, 7` 的顺序插入：

```
1
 \
  2
   \
    3
     \
      4   ← 每个节点都只有右孩子，树退化成了一条链表
       \
        5
```

这时树高变成 n，查找/插入/删除全部退化成 O(n)——**BST 的所有优势荡然无存**。这在真实业务里一点都不罕见：比如按自增 ID 顺序导入药品数据，或者用户的搜索历史天然就带时间顺序。

> 💬 **面试官**：二叉搜索树最坏情况什么时候出现？如何避免？
>
> ✅ 标准答案：**最坏情况在插入的数据已经有序（或近似有序）时出现**——因为 BST 的形态完全由插入顺序决定，顺序插入会让每个新节点都挂在同一侧，树退化成一条链表，高度从 log n 变成 n，查找/插入/删除全部退化为 O(n)。避免的办法是使用**自平衡二叉搜索树**：AVL 树通过严格维持左右子树高度差不超过 1 来保证树高是 O(log n)；红黑树通过颜色约束和旋转维持「近似平衡」，树高上界是 2log(n+1)。两者都能把最坏情况拉回 O(log n)。
>
> 🎁 加分答案：能补上三点——① **先说清「为什么会退化」的数学本质**：BST 的树高由节点值的分布决定，而不是由插入次数决定，随机插入时期望高度是 O(log n)，但有序插入时是 O(n)；② **工程里的真实选择**：大多数语言标准库选的是**红黑树而非 AVL**——因为红黑树的平衡条件更宽松，插入/删除时旋转次数更少（AVL 最坏要 O(log n) 次旋转，红黑树最多 3 次），而两者查找性能都是 O(log n)，**红黑树在「读写混合」的通用场景下整体更划算**；③ 还能提一句**跳表（Skip List）**——Redis 的 zset 用它代替红黑树，实现更简单、并发下更好控制。

🔧 **真实场景**：「最近搜索记录」这类需要**按值快速查找 + 有序遍历**的场景，BST 就很合适——比如药品名称的联想补全，把所有药品按名称建一棵 BST，既能 O(log n) 判断「这个药是否存在」，又能中序遍历输出「名称在某区间内的所有药品」。只是要注意导入顺序，别用自增 ID 直接建树。

---

## 六、平衡树：AVL 与红黑树

上一节留了个坑：BST 最坏会退化成链表。**平衡树要解决的，就是「无论怎么插入，都保证树高是 O(log n)」这件事。**

思路其实很朴素：**一旦发现某棵子树「一边太高、一边太矮」，就用旋转把它掰回来**。

### 为什么需要平衡：从一次旋转说起

先理解「旋转」这个基本动作。看下面这棵树：

```
        b                          a
       / \                        / \
      a   e   →  旋转 →         c   b
     / \                            / \
    c   d                          d   e
```

**右旋（rotationLL）**：以 `b` 为支点，把左孩子 `a` 提上来当新的根——`a` 原来的右子树 `d` 被「过继」给 `b` 当左子树。整个操作只改了三个指针，代价 O(1)。

关键观察是：**旋转改变了树的形状（降低了高度），但完全保持了中序遍历的顺序（`c a d b e` 不变）**。这正是旋转能用来「修复不平衡」的前提——**它调整的是结构，不是数据**。

反过来，把 `a` 提上去就是**左旋（rotationRR）**。而「先左旋再右旋」构成 **LR 旋转**，「先右旋再左旋」构成 **RL 旋转**——这四种组合，就是下面 AVL 要用的全部武器。

### AVL 树：严格平衡

AVL 树的规则比 BST 多一条：

**任意节点的左右子树高度差（平衡因子）的绝对值不超过 1。**

为了落地这条规则，先要给节点加上「高度」的概念和几种不平衡状态：

```typescript
// src/data-structures/util/index.ts
export enum Compare {
  LESS_THAN = -1,
  BIGGER_THAN = 1,
  EQUAL = 0
}

export const defaultCompare = (a: any, b: any) => {
  if (a === b) {
    return Compare.EQUAL;
  }
  return a < b ? Compare.LESS_THAN : Compare.BIGGER_THAN;
}

export enum BalanceFactor {
  UNBALANCED_RIGHT = 1,          // 右边比左边高 2，需要左旋
  SLIGHTLY_UNBALANCED_RIGHT = 2, // 右边高 1，暂时平衡
  BALANCED = 3,                  // 平衡
  SLIGHTLY_UNBALANCED_LEFT = 4,  // 左边高 1，暂时平衡
  UNBALANCED_LEFT = 5            // 左边比右边高 2，需要右旋
}
```

```typescript
// src/data-structures/models/node.ts
export class Node {
  constructor(
    public key: any,                 // 节点值
    public left: Node | null = null, // 左子节点引用
    public right: Node | null = null // 右子节点引用
  ) {}
}
```

AVL 的实现直接**继承 BST**，只在插入/删除后多一步「检查并旋转」：

```typescript
// src/data-structures/tree/avlTree.ts
import BinarySearchTree from './binarySearchTree';
import { Compare, defaultCompare, BalanceFactor } from '../../util';
import { Node } from '../../models/node';

export default class AlvTree extends BinarySearchTree {
  constructor(compareFn = defaultCompare) {
    super(compareFn);
  }
  // 计算节点高度：左右子树较高的那个 + 1；空节点高度为 -1
  private getNodeHeight(node: Node | null): number {
    if (!node) return -1;
    return Math.max(this.getNodeHeight(node.left), this.getNodeHeight(node.right)) + 1;
  }
```

**注意空节点的高度定义为 `-1` 而不是 `0`**——这样单个叶子节点的高度就是 `max(-1,-1)+1 = 0`，与「叶子节点高度为 0」的定义吻合。

四种旋转的实现：

```typescript
  /**
   * Left left case: rotate right（左左情况：右旋）
   *
   *       b                           a
   *      / \                         / \
   *     a   e -> rotationLL(b) ->   c   b
   *    / \                             / \
   *   c   d                           d   e
   */
  private rotationLL(node: Node): Node {
    const temp: Node = node.left as Node;
    node.left = temp?.right;   // a 的右子树 d 过继给 b 当左子树
    temp.right = node;         // b 变成 a 的右孩子
    return temp;               // a 上升为新的子树根
  }
  /**
   * Right right case: rotate left（右右情况：左旋）
   *
   *     a                              b
   *    / \                            / \
   *   c   b   -> rotationRR(a) ->    a   e
   *      / \                        / \
   *     d   e                      c   d
   */
  private rotationRR(node: Node) {
    const temp: Node = node.right as Node;
    node.right = temp.left;    // b 的左子树 d 过继给 a 当右子树
    temp.left = node;          // a 变成 b 的左孩子
    return temp;
  }
  // Left right case: 先对左孩子左旋，再对自己右旋
  private rotationLR(node: Node) {
    node.left = this.rotationRR(node.left as Node);
    return this.rotationLL(node);
  }
  // Right left case: 先对右孩子右旋，再对自己左旋
  private rotationRL(node: Node) {
    node.right = this.rotationLL(node.right as Node);
    return this.rotationRR(node);
  }
```

**为什么需要 LR / RL 这两种「组合旋转」？** 因为如果失衡是「左孩子的右子树太高」造成的，单独右旋反而会把问题转到另一侧。**先对子节点做一次反向旋转，把它「掰直」成 LL 或 RR 的情况，再做一次同向旋转**——这就是 LR / RL 的含义。

计算平衡因子：

```typescript
  private getBalanceFactor(node: Node) {
    const heightDifference = this.getNodeHeight(node?.left) - this.getNodeHeight(node?.right);
    switch (heightDifference) {
      case -2: return BalanceFactor.UNBALANCED_RIGHT;          // 右边太高
      case -1: return BalanceFactor.SLIGHTLY_UNBALANCED_RIGHT;
      case 1:  return BalanceFactor.SLIGHTLY_UNBALANCED_LEFT;
      case 2:  return BalanceFactor.UNBALANCED_LEFT;           // 左边太高
      default: return BalanceFactor.BALANCED;
    }
  }
```

插入的实现——**先按 BST 插，再回头修平衡**：

```typescript
  insert(key: any) {
    this.root = this.insertNode(this.root, key);
  }
  protected insertNode(node: Node | null, key: any) {
    if (node == null) {
      return new Node(key);                                // 找到空位，插入
    } else if (this.compareFn(key, node.key) === Compare.LESS_THAN) {
      node.left = this.insertNode(node.left, key);
    } else if (this.compareFn(key, node.key) === Compare.BIGGER_THAN) {
      node.right = this.insertNode(node.right, key);
    } else {
      return node;                                         // key 重复，不做处理
    }

    // 👈 以上是普通 BST 插入，以下是 AVL 特有的「修平衡」
    const balanceState = this.getBalanceFactor(node);

    if (balanceState === BalanceFactor.UNBALANCED_LEFT) {
      if (this.compareFn(key, node?.left?.key) === Compare.LESS_THAN) {
        node = this.rotationLL(node);        // LL：右旋一次
      } else {
        return this.rotationLR(node);        // LR：先左旋再右旋
      }
    }

    if (balanceState === BalanceFactor.UNBALANCED_RIGHT) {
      if (this.compareFn(key, node?.right?.key) === Compare.BIGGER_THAN) {
        node = this.rotationRR(node);        // RR：左旋一次
      } else {
        return this.rotationRL(node);        // RL：先右旋再左旋
      }
    }
    return node;
  }
```

**这段代码最精妙的地方是「递归回来时顺便修复」**：`insertNode` 是递归的，每一层在拿到子树的返回值之后，都会检查自己这个节点是否失衡。因为失衡永远发生在「插入路径上」，所以**从插入点往回回溯的过程中，第一次遇到失衡的节点就是需要修复的地方**——修完之后上层自然也就平衡了。

同样地，删除后也要修平衡：

```typescript
  protected removeNode(node: any, key: any) {
    node = super.removeNode(node, key);   // 先按 BST 删
    if (node == null) {
      return node;
    }
    const balanceFactor = this.getBalanceFactor(node);
    if (balanceFactor === BalanceFactor.UNBALANCED_LEFT) {
      // Left left case
      if (
        this.getBalanceFactor(node.left) === BalanceFactor.BALANCED
        || this.getBalanceFactor(node.left) === BalanceFactor.SLIGHTLY_UNBALANCED_LEFT
      ) {
        return this.rotationLL(node);
      }
      // Left right case
      if (this.getBalanceFactor(node.left) === BalanceFactor.SLIGHTLY_UNBALANCED_RIGHT) {
        return this.rotationLR(node.left);
      }
    }
    if (balanceFactor === BalanceFactor.UNBALANCED_RIGHT) {
      // Right right case
      if (
        this.getBalanceFactor(node.right) === BalanceFactor.BALANCED
        || this.getBalanceFactor(node.right) === BalanceFactor.SLIGHTLY_UNBALANCED_RIGHT
      ) {
        return this.rotationRR(node);
      }
      // Right left case
      if (this.getBalanceFactor(node.right) === BalanceFactor.SLIGHTLY_UNBALANCED_LEFT) {
        return this.rotationRL(node.right);
      }
    }
    return node;
  }
}
```

测试用一组精心构造的数据，从 `1` 顺序插到 `15`：

```typescript
// src/data-structures/tree/test/avlTree.test.ts
import "mocha";
import { expect, assert } from "chai";
import AlvTree from "../alvTree";

describe("ALV-AlvTree 测试", function () {
  const tree = new AlvTree();
  it("insert", function () {
    tree.insert(1);
    tree.insert(2);
    tree.insert(3);
    tree.insert(4);
    tree.insert(5);
    tree.insert(6);
    tree.insert(7);
    tree.insert(14);
    tree.insert(15);
    tree.insert(13);
    tree.insert(12);
    tree.insert(11);
    // 👈 顺序插入 1..7 本会让 BST 退化成链，这里根节点是 7，说明旋转生效了
    expect(tree.getRoot()?.key).to.be.deep.equal(7);
  });
  it("remove", function () {
    tree.remove(6);
    tree.remove(5);
    tree.remove(15);
    let str = ``;
    tree.inOrderTraverse((v: any) => str += `${v} `);
    expect(str).to.be.deep.equal('1 2 3 4 7 11 12 13 14 ');
  });
});
```

**这个测试最有说服力的一点**：如果直接顺序插入 `1→7`，普通 BST 的根会是 `1`（一条右斜链）；而 AVL 的根是 `7`——说明旋转确实把树「撑开」了。中序输出依然是升序，也验证了旋转没有破坏 BST 的有序性。

### 红黑树：近似平衡

AVL 的平衡条件很严格（高度差 ≤ 1），代价是**插入/删除时可能频繁旋转**——最坏情况下从叶子到根一路都要转。红黑树换了个思路：**只要求「近似平衡」，用少量旋转换更快的增删**。

红黑树用「颜色」来表达平衡约束，五条性质是核心：

- 每个节点要么是红色，要么是黑色
- 根节点是黑色
- 所有叶子节点（NIL 空节点）是黑色
- **红色节点的两个子节点必须是黑色**（即不存在连续的红色节点）
- **从任一节点出发，到其所有叶子的路径上，黑色节点数量相同**（黑高一致）

**最后两条是红黑树保持平衡的秘诀**：红色不能连续，且每条路径黑高相同——这两条一叠加，**最长路径不超过最短路径的 2 倍**，所以树高是 O(log n) 量级。

节点定义要额外存一个「颜色」和一个「父节点引用」（旋转时需要向上找祖先）：

```typescript
// src/data-structures/models/redBlackNode.ts
import { Node } from './node';

export enum Colors {
  RED = 0,
  BLACK = 1
}

export class RedBlackNode extends Node {
  color: Colors;
  constructor(
    public key: any,
    public left: RedBlackNode | null = null,
    public right: RedBlackNode | null = null,
    public parent: RedBlackNode | null = null,   // 👈 比普通 Node 多一个父指针
  ) {
    super(key);
    this.color = Colors.RED;   // 新节点默认插入为红色
  }
  isRed() {
    return this.color === Colors.RED;
  }
}
```

**为什么新节点默认是红色？** 因为插入红色只会破坏「红节点不能连续」（第四条），而插入黑色会直接破坏「黑高一致」（第五条）——前者修复成本低得多。

旋转在红黑树里要复杂一些，因为多了 `parent` 指针要同步维护：

```typescript
// src/data-structures/tree/redBlackTree.ts
import { defaultCompare, Compare } from '../../util';
import BinarySearchTree from './binarySearchTree';
import { RedBlackNode, Colors } from '../../models/redBlackNode';

export default class RedBlackTree extends BinarySearchTree {
  protected root: RedBlackNode | null;
  constructor(protected compareFn = defaultCompare) {
    super(compareFn);
    this.root = null;
  }
  // 右旋：左孩子上升为根，同时维护 parent 指针
  private rotationLL(node: RedBlackNode) {
    const tmp: RedBlackNode = node.left as RedBlackNode;
    node.left = tmp.right;
    if (tmp.right && tmp.right.key) {
      tmp.right.parent = node;      // 过继的子树的父指针要改
    }
    tmp.parent = node.parent;       // tmp 接替 node 的位置
    if (!node.parent) {
      this.root = tmp;              // node 原本是根，现在 tmp 当根
    } else {
      if (node === node.parent.left) {
        node.parent.left = tmp;
      } else {
        node.parent.right = tmp;
      }
    }
    tmp.right = node;
    node.parent = tmp;
  }
  // 左旋：右孩子上升为根，同时维护 parent 指针
  private rotationRR(node: RedBlackNode) {
    const tmp: RedBlackNode = node.right as RedBlackNode;
    node.right = tmp.left;
    if (tmp.left && tmp.left.key) {
      tmp.left.parent = node;
    }
    tmp.parent = node.parent;
    if (!node.parent) {
      this.root = tmp;
    } else {
      if (node === node.parent.left) {
        node.parent.left = tmp;
      } else {
        node.parent.right = tmp;
      }
    }
    tmp.left = node;
    node.parent = tmp;
  }
```

插入：**先按 BST 插，然后调用 `fixTreeProperties` 修复颜色**。

```typescript
  insert(key: any) {
    if (this.root == null) {
      this.root = new RedBlackNode(key);     // 空树：新节点当根
      this.root.color = Colors.BLACK;        // 根必须是黑色（性质 2）
    } else {
      const newNode = this.insertNode(this.root, key);
      this.fixTreeProperties(newNode);
    }
  }

  protected insertNode(node: RedBlackNode, key: any): RedBlackNode {
    if (this.compareFn(key, node.key) === Compare.LESS_THAN) {
      if (node.left == null) {
        node.left = new RedBlackNode(key);
        node.left.parent = node;
        return node.left;                    // 返回新节点，供修复逻辑使用
      } else {
        return this.insertNode(node.left, key);
      }
    } else if (node.right == null) {
      node.right = new RedBlackNode(key);
      node.right.parent = node;
      return node.right;
    } else {
      return this.insertNode(node.right, key);
    }
  }
```

**注意这里 `insertNode` 的返回值设计**：它不再返回子树根，而是**返回「新插入的那个节点」**——因为接下来要在它身上做颜色修复，必须拿到它的引用。

修复逻辑是整个红黑树最精华的部分：

```typescript
  private fixTreeProperties(node: RedBlackNode) {
    // 只要「父节点是红的」就继续修
    while (node && node.parent && node.parent.color === Colors.RED && node.color !== Colors.BLACK) {
      let parent: any = node.parent;
      const grandParent = parent.parent;

      // case A：父节点是祖父的左孩子
      if (grandParent && grandParent.left === parent) {
        const uncle = grandParent.right;

        // case 1：叔叔节点也是红色 → 只变色（祖父变红，父/叔变黑）
        if (uncle && uncle.isRed()) {
          grandParent.color = Colors.RED;
          parent.color = Colors.BLACK;
          uncle.color = Colors.BLACK;
          node = grandParent;                // 把问题上报给祖父，继续循环
        } else {
          // case 2：自己是父的右孩子 → 先对父左旋，转成 case 3
          if (node === parent.right) {
            this.rotationRR(parent);
            node = parent;
            parent = node.parent;
          }
          // case 3：自己是父的左孩子 → 对祖父右旋 + 换色
          this.rotationLL(grandParent);
          parent.color = Colors.BLACK;
          grandParent.color = Colors.RED;
          node = parent;
        }
      } else {   // case B：父节点是祖父的右孩子（左右镜像）
        const uncle = grandParent.left;

        // case 1：叔叔是红色 → 只变色
        if (uncle && uncle.isRed()) {
          grandParent.color = Colors.RED;
          parent.color = Colors.BLACK;
          uncle.color = Colors.BLACK;
          node = grandParent;
        } else {
          // case 2：自己是父的左孩子 → 先对父右旋，转成 case 3
          if (node === parent.left) {
            this.rotationLL(parent);
            node = parent;
            parent = node.parent;
          }
          // case 3：自己是父的右孩子 → 对祖父左旋 + 换色
          this.rotationRR(grandParent);
          parent.color = Colors.BLACK;
          grandParent.color = Colors.RED;
          node = parent;
        }
      }
    }
    (this.root as RedBlackNode).color = Colors.BLACK;   // 兜底：根永远是黑色
  }
}
```

**这段代码的结构化程度很高，抓住三层就懂了**：

- **case A / case B**：父节点是祖父的左孩子还是右孩子——两种情况完全镜像
- **case 1（变颜色）**：叔叔是红的，就把祖父涂红、父叔涂黑，然后把「矛盾」上移到祖父继续处理
- **case 2 + case 3（旋转）**：叔叔是黑的，就通过「先转成一条线、再转上去」的方式，把多出来的红色节点消化掉

测试里每次插入都断言了**整棵树的颜色分布**，这是理解红黑树最好的方式——**你能亲眼看到「红色连续」是怎么被消掉的**：

```typescript
// src/data-structures/tree/test/redBlackTree.test.ts
import "mocha";
import { expect, assert } from "chai";
import RedBlackTree from "../redBlackTree";
import { RedBlackNode, Colors } from '../../../models/redBlackNode';

describe("红黑树-RedBlackTree 测试", function () {
  const tree = new RedBlackTree();
  it('insert', () => {
    let node;
    tree.insert(1);
    assertNode(tree.getRoot() as RedBlackNode, 1, Colors.BLACK);   // 根是黑色

    tree.insert(2);
    assertNode(tree.getRoot() as RedBlackNode, 1, Colors.BLACK);
    assertNode(tree.getRoot()?.right as RedBlackNode, 2, Colors.RED);  // 新节点是红色

    tree.insert(3);   // 👈 出现「红 2 连红 3」，触发变色/旋转
    assertNode(tree.getRoot() as RedBlackNode, 2, Colors.BLACK);   // 2 上升为根
    assertNode(tree.getRoot()?.right as RedBlackNode, 3, Colors.RED);
    assertNode(tree.getRoot()?.left as RedBlackNode, 1, Colors.RED);

    tree.insert(4);
    assertNode(tree.getRoot() as RedBlackNode, 2, Colors.BLACK);
    assertNode(tree.getRoot()?.left as RedBlackNode, 1, Colors.BLACK);
    assertNode(tree.getRoot()?.right as RedBlackNode, 3, Colors.BLACK);
    assertNode(tree.getRoot()?.right?.right as RedBlackNode, 4, Colors.RED);

    tree.insert(5);
    assertNode(tree.getRoot() as RedBlackNode, 2, Colors.BLACK);
    assertNode(tree.getRoot()?.left as RedBlackNode, 1, Colors.BLACK);
    node = tree.getRoot()?.right as RedBlackNode;
    assertNode(node, 4, Colors.BLACK);          // 4 上升，3 和 5 成为它的红孩子
    assertNode(node.left as RedBlackNode, 3, Colors.RED);
    assertNode(node.right as RedBlackNode, 5, Colors.RED);
```

接着插入 6、7——**注意 4 变成红色这一步**：

```typescript
    tree.insert(6);
    assertNode(tree.getRoot() as RedBlackNode, 2, Colors.BLACK);
    assertNode(tree.getRoot()?.left as RedBlackNode, 1, Colors.BLACK);
    node = tree.getRoot()?.right as RedBlackNode;
    assertNode(node, 4, Colors.RED);            // 4 变红（叔叔 1 也是红 → case 1 变色）
    assertNode(node.left as RedBlackNode, 3, Colors.BLACK);
    assertNode(node.right as RedBlackNode, 5, Colors.BLACK);
    assertNode(node.right?.right as RedBlackNode, 6, Colors.RED);

    tree.insert(7);
    assertNode(tree.getRoot() as RedBlackNode, 2, Colors.BLACK);
    assertNode(tree.getRoot()?.left as RedBlackNode, 1, Colors.BLACK);
    node = tree.getRoot()?.right as RedBlackNode;
    assertNode(node, 4, Colors.RED);
    assertNode(node.left as RedBlackNode, 3, Colors.BLACK);
    assertNode(node.right as RedBlackNode, 6, Colors.BLACK);
    assertNode(node.right?.right as RedBlackNode, 7, Colors.RED);
    assertNode(node.right?.left as RedBlackNode, 5, Colors.RED);
```

最后是 8、9、10——**根节点再次发生旋转**：

```typescript
    tree.insert(8);
    assertNode(tree.getRoot() as RedBlackNode, 4, Colors.BLACK);   // 4 上升为新的根
    node = tree.getRoot()?.left as RedBlackNode;
    assertNode(node, 2, Colors.RED);
    assertNode(node.left as RedBlackNode, 1, Colors.BLACK);
    assertNode(node.right as RedBlackNode, 3, Colors.BLACK);
    node = tree.getRoot()?.right as RedBlackNode;
    assertNode(node, 6, Colors.RED);
    assertNode(node.left as RedBlackNode, 5, Colors.BLACK);
    assertNode(node.right as RedBlackNode, 7, Colors.BLACK);
    assertNode(node.right?.right as RedBlackNode, 8, Colors.RED);

    tree.insert(9);
    assertNode(tree.getRoot() as RedBlackNode, 4, Colors.BLACK);
    node = tree.getRoot()?.left as RedBlackNode;
    assertNode(node, 2, Colors.RED);
    assertNode(node.left as RedBlackNode, 1, Colors.BLACK);
    assertNode(node.right as RedBlackNode, 3, Colors.BLACK);
    node = tree.getRoot()?.right as RedBlackNode;
    assertNode(node, 6, Colors.RED);
    assertNode(node.left as RedBlackNode, 5, Colors.BLACK);
    assertNode(node.right as RedBlackNode, 8, Colors.BLACK);
    assertNode(node.right?.left as RedBlackNode, 7, Colors.RED);
    assertNode(node.right?.right as RedBlackNode, 9, Colors.RED);

    tree.insert(10);
    assertNode(tree.getRoot() as RedBlackNode, 4, Colors.BLACK);
    node = tree.getRoot()?.left as RedBlackNode;
    assertNode(node, 2, Colors.BLACK);
    assertNode(node.left as RedBlackNode, 1, Colors.BLACK);
    assertNode(node.right as RedBlackNode, 3, Colors.BLACK);
    node = tree.getRoot()?.right as RedBlackNode;
    assertNode(node, 6, Colors.BLACK);
    assertNode(node.left as RedBlackNode, 5, Colors.BLACK);
    assertNode(node.right as RedBlackNode, 8, Colors.RED);
    assertNode(node.right?.left as RedBlackNode, 7, Colors.BLACK);
    assertNode(node.right?.right as RedBlackNode, 9, Colors.BLACK);
    assertNode(node.right?.right?.right as RedBlackNode, 10, Colors.RED);
  });

  // 断言辅助函数：检查某个节点的 key 和颜色
  function assertNode(node: RedBlackNode, key: number, color: Colors) {
    expect(node.color).to.equal(color);
    expect(node.key).to.equal(key);
  }
});
```

**测试里最值得看的两处**：插入 `3` 时根从 `1` 变成 `2`（发生了旋转），插入 `8` 时根从 `2` 变成 `4`（又发生了旋转）。**顺序插入 1~10，普通 BST 会是一条 10 层的右斜链，而红黑树始终是 4 层的平衡树**——这就是平衡树的价值。

### 为什么 Java 的 HashMap 链表长度超 8 就转红黑树

这是红黑树在面试里被问得最多的「真实应用」，值得单独讲透。

**背景**：Java 的 `HashMap` 用「数组 + 链表」解决哈希冲突——同一个桶里冲突的元素挂成一条链表。但链表查找是 O(n)，**如果攻击者精心构造一批哈希值相同的 key，整张表会退化成一条长链表，查找从 O(1) 掉到 O(n)**，这就是著名的哈希碰撞攻击。

**解法**：当某个桶的链表长度达到 **8** 时，把这条链表转成红黑树，查找从 O(n) 变成 O(log n)。

**为什么是 8 而不是更小？** 这里要理解一个概率前提：HashMap 用的是扰动后的哈希，正常情况下元素分布接近均匀，**一个桶里出现 8 个元素的概率大约是 0.00000006（千万分之六）**。也就是说，链表长度到 8 已经**接近「不可能是正常哈希分布造成的」**了——这时候要么是数据分布异常，要么就是有人在恶意构造碰撞，转红黑树是止损。

**为什么转成红黑树而不是 AVL？** 前面讲过——**红黑树增删时旋转更少**，而 HashMap 的增删操作频率很高，用红黑树能在「查询变快」和「维护成本可控」之间取得平衡。

还有两个细节能加分：

- **TreeNode 内存占用是普通 Node 的两倍**（要存 parent、left、right、color 等），所以**不能一上来就用红黑树**——正常场景下链表完全够用，只在极端情况下才付出这份内存代价
- **阈值还有个「回退线」：树节点少于 6 时退化回链表**。8 进 6 出，中间留了 2 的缓冲带，避免在 7、8 之间反复横跳（**这种「双阈值 + 缓冲带」的设计思路，在很多工程场景里都能见到**——比如 React 的优先级切换、Redis 的扩容/缩容）

> 💬 **面试官**：AVL 树和红黑树怎么选？红黑树为什么只保证「近似平衡」就够？
>
> ✅ 标准答案：**选红黑树，因为它在通用场景下整体更划算**。两者查找都是 O(log n)；但 AVL 的高度差限制在 1 以内，条件更严，**插入/删除时为了维持平衡，可能从叶子一路旋转到根（最坏 O(log n) 次旋转）**；而红黑树只要求「最长路径不超过最短路径的 2 倍」，平衡条件更宽松，**增删最多旋转 3 次**。真实系统里查和改往往是混在一起的，红黑树用「略微松一点的平衡」换「更少的旋转开销」，所以 Java 的 TreeMap、HashMap 的树化桶，C++ 的 `std::map`，Linux 的 CFS 调度器，用的都是红黑树。
>
> 🎁 加分答案：能补上三点——① **「近似平衡为什么够用」的数学解释**：红黑树的高度上界是 2·log₂(n+1)，虽然比 AVL 的约 1.44·log₂n 略高，但都是 O(log n)，**在 n 很大的时候，这个常数差距带来的查找开销，远小于 AVL 频繁旋转带来的写入开销**；② **HashMap 红黑树的两个细节**：TreeNode 内存是普通节点两倍所以不能滥用、以及「8 转树 / 6 退链」的双阈值缓冲带设计，能说出这个说明你真的读过源码；③ **更进一步的对比**：如果场景是「读极多、写极少」（比如配置数据），AVL 反而更合适；如果是纯粹的有序集合且对实现简单性有要求，跳表是更现代的选择。

🔧 **真实场景**：后端做药品价格区间统计、或者前端用有序结构维护「待办任务按优先级排序」时，**TreeMap / 红黑树的定位就是「既要按 key 快速查找，又要保持有序」**——哈希表能做到 O(1) 查找但无序，数组排序能有序但查找 O(n)，红黑树两者兼顾，代价是常数更大。**这就是「数据结构选型」的典型权衡：没有最优，只有最合适。**

---

## 七、Trie 前缀树：让「阿莫」秒出结果

前面讲的 BST，解决的是**数值**的有序查找。但前端还有一类完全不同的查找需求——**字符串前缀匹配**。

回到第一章那个场景：药品搜索框里输入「阿莫」，要列出所有以「阿莫」开头的药品。用哈希表行不行？**不行**——哈希表只能回答「这个 key 存不存在」这种**精确匹配**问题，你没法拿「阿莫」这个前缀去问「有哪些 key 以它开头」。

**Trie（前缀树 / 字典树）就是为「前缀」这个词量身定做的结构。**

### Trie 的结构：每个节点一个字符

Trie 的核心思想是**把公共前缀合并到同一条路径上**：

```
            root（空）
              |
              阿
              |
              莫
             /  \
            西    司
            |     |
            林    匹
           /|\    |
          胶 克   林
          |   |
         囊  拉
              |
              维
```

看这棵树的含义：从根到任意节点的**路径**，就是这棵子树里所有字符串的**公共前缀**。

- 路径 `阿 → 莫`：代表前缀「阿莫」，它的子树里所有词都以「阿莫」开头
- 路径 `阿 → 莫 → 西 → 林`：代表字符串「阿莫西林」，它是一个**完整的词**（末尾节点要打标记）

**这就是 Trie 最妙的地方**：找到「阿莫」这个节点之后，它的整棵子树就是答案集合——**搜索一下子变成了「顺着路径走两步」**。

### 完整实现

先定义节点。和二叉树不同，Trie 的每个节点有**任意多个**孩子（取决于字符集），所以用 Map 存：

```typescript
// src/data-structures/tree/trie.ts
class TrieNode {
  children: Map<string, TrieNode>;   // 每个字符 → 对应的子节点
  isEnd: boolean;                    // 是否有单词在这里结束
  constructor() {
    this.children = new Map();
    this.isEnd = false;              // 默认不是单词结尾
  }
}
```

**`isEnd` 这个标记是必需的**，不能省。因为「阿莫西」可能只是某个更长药名（阿莫西林）的中途节点，而不是一个完整的词——**光看「有没有子节点」是分不清「这是前缀」还是「这是完整的词」的**。

核心的三个操作：

```typescript
export class Trie {
  root: TrieNode;
  constructor() {
    this.root = new TrieNode();      // 根节点是空字符，不代表任何字符
  }

  // 插入一个单词：顺着字符往下走，没有节点就建一个
  insert(word: string): void {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());   // 没走过的路，补上节点
      }
      node = node.children.get(char)!;             // 继续往下走
    }
    node.isEnd = true;                             // 👈 标记「到这里是一个完整的词」
  }
}
```

**插入的复杂度是 O(m)**（m 是字符串长度）——注意它**和树里已有多少词完全无关**。这是 Trie 相比「遍历所有词判断 startsWith」的核心优势：无论字典是一千个词还是一百万个词，插一个「阿莫西林」永远只需要走 4 步。

查询分两种，这是 Trie 最需要分清的一对概念：

```typescript
  // 查询：word 这个完整单词是否存在
  search(word: string): boolean {
    const node = this.findNode(word);
    return node !== null && node.isEnd;   // 👈 必须是「完整的词」才算命中
  }

  // 查询：是否存在以 prefix 开头的单词
  startsWith(prefix: string): boolean {
    return this.findNode(prefix) !== null;  // 👈 只要路径存在即可
  }

  // 公共辅助：顺着前缀走，返回终点节点；走不通返回 null
  private findNode(prefix: string): TrieNode | null {
    let node = this.root;
    for (const char of prefix) {
      if (!node.children.has(char)) {
        return null;                      // 路径断了，前缀不存在
      }
      node = node.children.get(char)!;
    }
    return node;
  }
```

**`search` 和 `startsWith` 只差一个 `isEnd` 判断**——这正是 `isEnd` 存在的意义：插入「阿莫西林」之后，`search("阿莫西")` 应该返回 `false`（它不是完整的词），但 `startsWith("阿莫西")` 应该返回 `true`（有词以它开头）。

### 让「阿莫」秒出结果：收集整棵子树

前面只解决了「前缀存不存在」，但业务要的是**返回所有匹配的药品名**。思路是：先走到前缀节点，再**把它的整棵子树 DFS 收集起来**：

```typescript
  // 返回所有以 prefix 开头的单词
  searchPrefix(prefix: string): string[] {
    const node = this.findNode(prefix);
    if (!node) return [];                 // 前缀不存在，直接空数组

    const result: string[] = [];
    // 👈 从「阿莫」节点开始 DFS，把子树里所有完整的词收集出来
    const dfs = (cur: TrieNode, path: string) => {
      if (cur.isEnd) {
        result.push(prefix + path);       // 走到词尾，拼出完整单词
      }
      for (const [char, child] of cur.children) {
        dfs(child, path + char);
      }
    };
    dfs(node, '');
    return result;
  }
}
```

**这里把第三章学的 DFS 用上了**——遍历的不再是固定结构，而是一棵由药品名动态拼出来的 Trie 子树。

完整跑一遍药品搜索：

```typescript
// 建树：把药品名全部插进去（只做一次）
const trie = new Trie();
['阿莫西林胶囊', '阿莫西林颗粒', '阿莫西林克拉维酸钾片', '阿司匹林肠溶片', '阿奇霉素分散片']
  .forEach(name => trie.insert(name));

// 搜索：用户每输入一次，就走一遍 searchPrefix
trie.search('阿莫西林胶囊');        // true  —— 完整存在
trie.search('阿莫西');              // false —— 👈 只是前缀，不是完整的药名
trie.startsWith('阿莫西');          // true  —— 有药名以它开头

trie.searchPrefix('阿莫');
// ['阿莫西林胶囊', '阿莫西林颗粒', '阿莫西林克拉维酸钾片']
// 👈 一次路径下探（2 步）+ 一次子树 DFS，与药品总量无关

trie.searchPrefix('阿');            // 全部 5 个 —— 前缀越短，结果越多
trie.searchPrefix('阿莫西林克');    // ['阿莫西林克拉维酸钾片']
trie.searchPrefix('头孢');          // [] —— 前缀不存在，走 2 步就返回了
```

**这里最能体现 Trie 的价值**：`searchPrefix('阿莫')` 只走了 2 步就定位到了子树，而如果用 `array.filter(name => name.startsWith('阿莫'))`，得把几万个药品名挨个比一遍。**前缀越长，Trie 的优势越明显**——这也解释了为什么输入法的联想、IDE 的代码补全、路由匹配，底层都有 Trie 的影子。

### 复杂度与代价

| 维度 | Trie | 哈希表 | 数组遍历 |
|------|------|--------|---------|
| 插入 | O(m) | O(m)（哈希计算） | O(m) |
| 精确查询 | O(m) | O(m) 均摊 O(1) | O(n·m) |
| **前缀查询** | **O(m + k)**，k 为结果数 | ❌ 不支持 | O(n·m) |
| 有序遍历 | ✅ 天然有序 | ❌ 无序 | 需先排序 |
| 空间 | **大**（每字符一个节点） | 较小 | 最小 |

**Trie 唯一的软肋是空间**：每个字符都要占一个节点，而且子节点用 Map 存还有额外开销。中文药品名尤其明显——几千个药品名可能有上万个字符节点。

优化的方向是**压缩 Trie（radix tree / 基数树）**：**把只有一个孩子的链式节点合并成一个节点**。比如上面那棵树里「阿 → 莫 → 西 → 林」如果中间没有分叉，就可以压成一个节点存 `"阿莫西林"`。Linux 内核的路由表、Redis 的部分结构都用这个思路。

> 💬 **面试官**：Trie 和哈希表相比有什么优势？又有什么劣势？
>
> ✅ 标准答案：**优势在前缀匹配和有序性**——① 哈希表只能做精确查找，Trie 能高效做**前缀查询**（走到前缀节点后收集子树即可）；② Trie 天然**按字符序组织**，中序遍历就是字典序，哈希表完全无序；③ Trie 查询的复杂度只和**字符串长度 m 有关**（O(m)），**与字典总量 n 无关**，哈希表虽然均摊 O(1) 但受哈希冲突和扩容影响，最坏也是 O(n)。**劣势在空间**：每个字符都要建节点，且子节点用 Map 存有额外开销，内存占用远大于哈希表——中文场景下尤其明显（一个汉字一个节点）。工程上的解法是**压缩 Trie（radix tree）**，把单孩子的链合并成一个节点。
>
> 🎁 加分答案：能补上三点——① **Trie 在真实工程里的位置**：IDE 的代码补全、输入法的联想、路由匹配（如 `/user/:id/profile` 的路径匹配）、IP 路由表（radix tree），以及很多搜索引擎的敏感词过滤（AC 自动机就是 Trie + KMP 思想的结合）；② **AC 自动机**：单靠 Trie 只能匹配「一个前缀」，如果要在文本里同时匹配**多个模式串**（比如一批敏感词），需要在 Trie 上加「失配指针」（fail pointer），这就是 AC 自动机，复杂度 O(n + m + 匹配数)——能报出这个名字，面试官会知道你不止会背题；③ **和 BST 的对比维度**：BST 解决的是「数值有序」，Trie 解决的是「字符串前缀」，**两者都是在「查找」这件事上做文章，但优化的维度完全不同**——一个优化的是「比多少次」，一个优化的是「比几个字符」。

🔧 **真实场景**：除了药品名自动补全，Trie 在前端还有一个常被忽略的用途——**路由匹配**。把 `/api/order/:id`、`/api/order/:id/detail` 这类动态路由按路径分段建 Trie，请求进来时顺着路径走，遇到 `:id` 这类参数段就记录通配，可以在 O(路径长度) 内完成匹配，比一条条正则去试要快得多。

---

## 八、高频题精讲

前面把树的「交通规则」都讲完了，这一节用 6 道 LeetCode 高频题，把 DFS / BFS / 递归 / 分治四种套路各练一遍。

### 104 二叉树的最大深度

**题目**：给定一棵二叉树，求它的最大深度（根到最远叶子节点的节点数）。

**解题思路**：最大深度天然适合**深度优先遍历**——DFS 过程中记录每个节点的层级，不断刷新最大值即可。

**解法一：递归求「左深右深取大」**

```typescript
// src/data-structures/tree/leet-code.ts
interface TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

export function maxDepth(root: TreeNode | null): number {
  // 👈 一行搞定：空树深度为 0，否则「左右子树深度的较大者 + 1」
  return !root ? 0 : Math.max(maxDepth(root!.left), maxDepth(root!.right)) + 1;
}
```

**这一行递归值得多看一眼**——它把「树的最大深度」这个问题的定义直接翻译成了代码：**一棵树的深度 = 左右子树深度的最大值 + 1（加的是根自己）**。这正是「信任递归」的体现：你不用去想子树里面怎么算，假设它算对了，直接用。

**解法二：DFS 记录层级**

```typescript
export function maxDepth2(root: TreeNode | null): number {
  let res = 0;
  const dfs = (root: TreeNode | null, level: number) => {
    if (root) {
      if (!root.left && !root.right) {   // 👈 优化：只有叶子节点才刷新 res
        res = Math.max(level, res);
      }
      dfs(root!.left, level + 1);
      dfs(root!.right, level + 1);
    }
  };
  dfs(root, 1);
  return res;
}
```

**注意那个「优化」**：中间节点的深度一定不是最大的（它的孩子至少比它深 1），所以只在叶子节点处刷新结果，可以少做很多次 `Math.max`。

```typescript
// src/data-structures/tree/test/leet-code.test.ts
describe("二叉树的最大深度 测试", function () {
  const tree: any = {
    val: 3,
    left: { val: 9 },
    right: {
      val: 20,
      left: { val: 15 },
      right: { val: 7 }
    }
  };
  it("二叉树的最大深度", function () {
    expect(maxDepth(tree)).to.be.deep.equal(3);
  });
  it("二叉树的最大深度", function () {
    expect(maxDepth2(tree)).to.be.deep.equal(3);
  });
});
```

**复杂度**：时间 O(n)（每个节点访问一次）；空间最好 O(log n)（完全二叉树）、最坏 O(n)（退化成链，递归栈深度为 n）。

### 111 二叉树的最小深度

**题目**：求二叉树的最小深度（根到最近叶子节点的节点数）。

**关键坑点**：**不能照抄最大深度的写法改成 `Math.min`**！因为如果某个节点只有一个孩子、另一侧是 `null`，`Math.min(0, ...) + 1` 会错误地把「不存在的分支」当成深度 0。所以必须**明确判断「是不是叶子」**。

**解法一：DFS 收集所有叶子深度再取最小**

```typescript
// 深度优先遍历
export function minDepth(root: TreeNode | null): number {
  let res: any[] = [];
  const dfs = (root: TreeNode | null, level: number) => {
    if (root) {
      if (!root.left && !root.right) {   // 只有叶子节点才记录深度
        res.push(level);
      }
      dfs(root!.left, level + 1);
      dfs(root!.right, level + 1);
    }
  };
  dfs(root, 1);
  return !root ? 0 : Math.min.apply(null, res);
}
```

**解法二：BFS 遇到叶子就停（更优）**

```typescript
// 广度优先遍历
export function minDepth2(root: TreeNode | null): number {
  const queue: Array<Array<any>> = [];
  let res = 0;
  if (root) {
    queue.unshift([root, 1]);              // 队列元素是 [节点, 层级]
    while (queue.length !== 0) {
      const [node, level]: any = queue.shift();
      if (!node?.left && !node?.right) {   // 👈 遇到叶子，直接返回，停止遍历
        res = level;
        break;
      }
      node?.left && queue.push([node?.left, level + 1]);
      node?.right && queue.push([node?.right, level + 1]);
    }
  }
  return res;
}
```

**为什么这题 BFS 比 DFS 好？** 因为 BFS 是**层层推进**的——**第一个被访问到的叶子，一定是最浅的那个**。所以一旦遇到叶子就可以 `break`，完全不用遍历完整棵树。而 DFS 必须把所有叶子都找出来，才能知道谁最小。这正好呼应了第三章那句结论：**要「找最近的」用 BFS。**

```typescript
describe("二叉树的最小深度 测试", function () {
  const tree: any = {
    val: 2,
    right: {
      val: 3,
      right: {
        val: 4,
        right: {
          val: 5,
          right: { val: 6 }
        }
      }
    }
  };
  it("深度优先遍历", function () {
    assert.equal(minDepth(tree), 5);
  });
  it("广度优先遍历", function () {
    assert.equal(minDepth2(tree), 5);
  });
});
```

**复杂度**：两种解法时间都是 O(n)（最坏都要遍历全树），空间都是 O(n)。

### 102 二叉树的层序遍历

**题目**：按层返回二叉树的节点值，即返回一个二维数组 `[[第0层], [第1层], ...]`。

**解题思路**：层序遍历顺序**就是广度优先遍历**——只不过要在遍历时记住每个节点处于第几层，好把它塞进对应的数组里。

```typescript
export function levelOrder(root: TreeNode | null): number[][] {
  const queue: Array<Array<any>> = [];
  const res: number[][] = [];
  if (root) {
    queue.unshift([root, 0]);            // [节点, 层级]
    while (queue.length !== 0) {
      const [node, level]: any = queue.shift();
      !res[level] && (res[level] = []);  // 这一层还没建数组，先建一个
      res[level]?.push(node.val);        // 按层级塞进对应数组
      node?.left && queue.push([node?.left, level + 1]);
      node?.right && queue.push([node?.right, level + 1]);
    }
  }
  return res;
}
```

**把「层级」和「节点」打包成 `[node, level]` 一起入队**，是这个解法的关键技巧——因为队列里同一时刻可能同时存在不同层的节点，不带上层级就分不清谁该进哪个数组。

```typescript
describe("二叉树的层序遍历 测试", function () {
  const tree: any = {
    val: 3,
    left: { val: 9 },
    right: {
      val: 20,
      left: { val: 15 },
      right: { val: 7 }
    }
  };
  it("层序遍历", function () {
    assert.deepEqual(levelOrder(tree), [[3], [9, 20], [15, 7]]);
  });
});
```

**复杂度**：时间 O(n)，空间 O(n)。

### 94 二叉树的中序遍历（递归 + 非递归）

**题目**：返回二叉树的中序遍历结果。

**解题思路**：口诀「左 → 根 → 右」，递归直接用；非递归则是第四章讲过的「一路向左压栈」。

```typescript
// 递归
export function inorderTraversal(root: TreeNode | null): number[] {
  const res: number[] = [];
  const rec = (root: TreeNode | null) => {
    if (root) {
      rec(root?.left);       // 左
      res.push(root?.val);   // 根
      rec(root?.right);      // 右
    }
  };
  rec(root);
  return res;
}

// 非递归
export function inorderTraversal2(root: TreeNode | null): number[] {
  const nodeList = [];
  if (root) {
    const stack = [];
    let p: any = root;
    while (stack.length > 0 || p) {
      while (p) {                     // 一路向左入栈
        stack.push(p);
        p = p?.left;
      }
      const node = stack.pop();       // 最左节点出栈
      nodeList.push(node?.val);       // 访问它
      p = node?.right;                // 转向右子树
    }
  }
  return nodeList;
}
```

**注意非递归版的 `while (stack.length > 0 || p)`**：两个条件缺一不可——`p` 用来驱动「继续往左走」，`stack.length > 0` 保证「左走到底之后还能回头处理栈里的祖先」。少了任何一个都会漏访问节点。

```typescript
describe("二叉树的中序遍历 测试", function () {
  it("递归", function () {
    assert.deepEqual(inorderTraversal(tree), [9, 3, 15, 20, 7]);
  });
  it("非递归", function () {
    assert.deepEqual(inorderTraversal2(tree), [9, 3, 15, 20, 7]);
  });
});
```

**复杂度**：时间 O(n)，空间 O(n)。

### 112 路径总和

**题目**：判断二叉树中是否存在「从根到叶子」的路径，其节点值之和等于目标值。

**解题思路**：在**深度优先**遍历的过程中，记录当前路径的节点值之和；走到**叶子节点**时，判断这个和是否等于目标值。

```typescript
export function hasPathSum(root: TreeNode | null, targetSum: number): boolean {
  if (!root) return false;
  let res = false;
  const dfs = (root: TreeNode | null, sum: number) => {
    if (root) {
      if (!root?.left && !root?.right && sum === targetSum) {  // 👈 叶子节点处判断
        res = true;
      }
      root?.left && dfs(root?.left, sum + root!.left!.val);
      root?.right && dfs(root?.right, sum + root!.right!.val);
    }
  };
  dfs(root, root!.val);   // 注意：初始和是根节点的值
  return res;
}
```

**两个容易写错的地方**：① **必须走到叶子才能判断**，中途节点即使和已经等于目标值也不算（题目要求「根到叶子」）；② **递归时提前把子节点的值加进去**（`sum + root.left.val`），而不是进去之后再加，这样「和」的含义始终是「从根到当前节点的累加」。

```typescript
describe("路径总和 测试", function () {
  const tree: any = {
    val: 1,
    left: { val: 2 },
    right: { val: 3 }
  };
  it("路径总和", function () {
    assert.equal(hasPathSum(tree, 5), false);   // 1+2=3，1+3=4，都不是 5
  });
});
```

**复杂度**：时间 O(n)；空间最好 O(log n)、最坏 O(n)。

### 226 翻转二叉树

**题目**：翻转一棵二叉树（交换每个节点的左右子树）。

> 这题有个著名段子：有候选人因为没写出这道「简单题」而面试被拒。它简单，但**最简单的东西最能看出你是否真的理解递归**。

**解题思路**：这是**分治**思想的教科书案例——**把「翻转整棵树」拆成「翻转左子树」+「翻转右子树」，最后把左右子树交换一下即可**。

```typescript
export function invertTree(root: TreeNode | null): TreeNode | null {
  if (!root) return null;              // 空节点，翻不了
  invertTree(root.left);               // 先翻左子树
  invertTree(root.right);              // 再翻右子树
  // 👈 左右都翻完了，最后交换这两个已经翻好的子树
  [root.left, root.right] = [root.right, root.left];
  return root;
}
```

**为什么说它是「分治」？** 因为「翻转一棵树」这个任务被拆成了两个**互相独立**的子任务（翻左、翻右），而且有一个明确的**「合并」步骤**（交换左右）。这和第 14 篇要讲的分治三步骤（分解 → 解决 → 合并）完全对应——**子问题独立、有合并步，是分治区别于普通递归的标志**（对比一下：斐波那契的子问题是重叠的，所以它是 DP 而不是分治）。

顺带一提，这题还有一种更「炫技」的写法——**交换和递归的顺序可以任意调换**：

```typescript
export function invertTree2(root: TreeNode | null): TreeNode | null {
  if (!root) return null;
  // 👈 先交换，再分别翻转新的左右子树，结果完全一样
  [root.left, root.right] = [root.right, root.left];
  invertTree2(root.left);
  invertTree2(root.right);
  return root;
}
```

**面试里如果能主动说出「先交换还是先递归都可以，因为两个子树的翻转互不影响」，说明你是真的理解了分治，而不是背下了模板。**

### LeetCode 重点题索引

| 题号 | 题目 | 考点 | 难度 |
|------|------|------|------|
| 94 | 二叉树的中序遍历 | 递归 / 显式栈 / 遍历序 | 简单 |
| 102 | 二叉树的层序遍历 | BFS + 层级记录 | 中等 |
| 105 | 从前序与中序遍历序列构造二叉树 | 遍历序的性质、递归分治 | 中等 |
| 208 | 实现 Trie（前缀树） | Trie 的 insert / search / startsWith | 中等 |
| 124 | 二叉树中的最大路径和 | 后序 + 树形 DP（返回值与全局最优分离） | 困难 |
| 236 | 二叉树的最近公共祖先 | 后序递归、分治思想 | 中等 |

**这 6 道的递进关系值得注意**：94 和 102 是「把树读出来」（基础遍历），105 是「从遍历序还原树」（遍历的性质），208 是「换一种树（Trie）」（结构迁移），124 和 236 是「在树上做分治」（进阶套路）。**按这个顺序刷，知识是累加的，而不是零散的。**

---

## 九、前端工程落地：树在真实代码里的样子

数据结构学到最后，最有价值的不是「会手写」，而是**在真实代码里认出它**。这一节看几处前端里树最常见的落点。

### 遍历 JSON 的所有节点

这是最基础的树遍历应用——**一个 JSON 对象本质上就是一棵树**（对象的每个 key 是一个子节点分支）。

```typescript
// src/data-structures/tree/json.ts
export function dfs(json: Record<string, any>, nodeList: any[]) {
  nodeList.push(json);                      // 先访问当前节点
  Object.keys(json).forEach(k => {
    dfs(json[k], nodeList);                 // 每个 key 的值都是一棵子树
  });
}
```

```typescript
// src/data-structures/tree/test/json.test.ts
describe("前端与树 Json 测试", function () {
  it("遍历JSON的所有节点", function () {
    const json = {
      a: {
        b: { c: 1 }
      },
      d: [1, 2]
    };
    const nodeList: [] = [];
    dfs(json, nodeList);
    expect(nodeList.length).to.be.deep.equal(7);   // 👈 每个值都是一个节点
  });
});
```

**这个函数只有 6 行，但它解决的问题很实际**：找出一个深层 JSON 里所有符合条件的字段、给每个节点打上「是否可见」的标记、统计一个配置对象的节点总数……**凡是「对一棵数据树的每个节点做同一件事」的需求，都是这个模式。**

**值得注意的细节是 `expect(nodeList.length).to.be.deep.equal(7)`**——数字 7 是怎么来的？根对象 1 个、`a` 1 个、`b` 1 个、`c` 的值 `1` 1 个、`d` 1 个、数组元素 `1` 和 `2` 各 1 个，加起来正好 7。**数组本身也是树的一层**，这一点在写递归时很容易漏掉。

### 树形控件：Ant Design 的 Tree

实际业务里最常打交道的树，就是 UI 组件库里的 Tree 组件——**药品说明书目录、后台权限树、组织架构选择器**，用的都是它。

Ant Design 的 Tree 组件的 `treeData` 结构，和我们第一章写的多叉树**一模一样**：

```typescript
const treeData = [
  {
    title: '说明书目录',
    key: '0-0',
    children: [
      {
        title: '适应症',
        key: '0-0-0',
        children: [
          { title: '适应症详情', key: '0-0-0-0' },
          { title: '适用人群', key: '0-0-0-1' }
        ]
      },
      {
        title: '用法用量',
        key: '0-0-1',
        children: [{ title: '成人用量', key: '0-0-1-0' }]
      }
    ]
  }
];
```

**注意 `children` 这个字段名**——组件库选择用 `children` 而不是 `left`/`right`，正是因为**真实的业务树基本都是多叉的**（一个目录下可以有很多条目）。这也解释了为什么「多叉树的 DFS/BFS」比「二叉树的三序」在业务里用得更频繁。组件库内部对 `treeData` 的处理（展开、勾选、筛选）全都建立在这套遍历逻辑之上。

### 虚拟 DOM diff：一棵树的对比问题

这是「树」在前端最有分量的应用，也是面试最爱问的地方。

虚拟 DOM diff 的本质是：**给定新旧两棵虚拟 DOM 树，找出最小的变化，应用到真实 DOM 上**。

最关键的约束是——**diff 只做「同层对比」，不做跨层对比**：

```
旧树            新树            diff 策略
  A              A
 / \            / \
B   C          B   C          ✅ 同层对比：A 的 children
/ \   \       / \   \             [B,C] 对比 [B,C]
D  E   F     D   E   F        ✅ 同层对比：B 的 children
                               [D,E] 对比 [D,E]
                               ❌ 不做：D 是否移动到了 F 的位置
                               （跨层移动直接被当作「删除 + 新建」处理）
```

**为什么只做同层？** 因为如果允许跨层移动，算法要把任意一个节点和任意其他节点做两两比较，找出最优的「移动方案」——这本质上是一个**树编辑距离问题**，最朴素的复杂度是 **O(n³)**。而真实前端场景里，跨层移动 DOM 是**极低频**的操作。

于是 React 做了个工程妥协：**只对比同层，跨层移动一律当作「删除旧节点 + 新建新节点」处理**。这个妥协把复杂度从 O(n³) 直接降到 **O(n)**。

**而「同层对比」在数据结构上是什么？正是第三章讲的层序遍历。** diff 沿着树的每一层横向扫描，把同层的子节点列表逐一比对——**你学的 BFS，就是虚拟 DOM diff 的行走方式**。区别只在于，diff 在每个节点上还要额外跑一套「子节点列表对比」的逻辑（比如用 key 来识别哪些节点可复用），但**遍历的骨架是层序的**。

这也是「数据结构选型」最生动的例子——**不是选一个「更聪明」的数据结构，而是选一个「复杂度更低、够用」的策略，哪怕它牺牲了某些边缘能力**。

### CSS 选择器：为什么从右往左匹配

最后看一个容易被忽略的细节：**浏览器解析 CSS 选择器，是从右往左匹配的**。

比如 `.list .item .title`，浏览器会**先找到所有 `.title` 元素**，再逐层往左验证它们的祖先里有没有 `.item`、`.list`。

**为什么这么设计？** 如果从左往右找，先找到 `.list` 下的所有元素，再在它们的子树里找 `.item`、再找 `.title`——**问题是 `.list` 可能匹配到极多的元素，每一条都要往下深挖整棵子树**。而从右往左，**先用 `.title` 这个「最具体」的条件把候选集缩到最小**，再往上回溯验证祖先——**在树的遍历里，越早缩小候选集，总遍历量越小**。

这和第三章「BFS 找最近的」是同一类优化思路：**先做最能排除的分支**。

> 💬 **面试官**：虚拟 DOM diff 为什么只做同层对比？这个限制带来什么代价？
>
> ✅ 标准答案：跨层对比要找出任意节点间的最优移动方案，本质上是一个树编辑距离问题，复杂度高达 **O(n³)**。而真实前端场景里跨层移动 DOM 是极低频操作，React 为这个低频场景付 O(n³) 不值得，于是**只做同层对比，把复杂度降到 O(n)**。代价是：**跨层移动会被当作「删除 + 新建」处理**，性能不是最优——比如把一个节点从一棵子树平移到另一棵子树，React 会直接卸载重建而不是移动。
>
> 🎁 加分答案：能补两点——① **同层对比的遍历方式就是层序遍历（BFS）**，把「树的对比」这个大问题分解成「每一层的子节点列表对比」，每个节点的处理互相独立，这又带上了分治的味道；② **`key` 的作用**：同层对比里，`key` 让框架能快速识别「哪些节点可复用、哪些是新增/删除」，没有稳定 `key` 时列表 diff 会退化成「全删重建」——这解释了为什么 React 强烈要求列表项带唯一 `key`。

### 二叉树在 JS 引擎里的身影

树不只在业务代码里，**在语言运行时内部同样无处不在**：

- **AST（抽象语法树）**：你的每一行 JavaScript 代码，都会被解析器转成一棵 AST，Babel 转译、ESLint 检查、Webpack 打包，操作的全是这棵树
- **作用域链 / 原型链**：本质是沿着一棵树往上找属性
- **B+ 树 / 红黑树**：数据库索引和语言标准库里的有序容器

**这也是为什么「树」这章值得反复看**——它不只是 6 道 LeetCode 题，而是前端从「代码」到「运行时」都要用到的底层结构。

---

## 十、总结：一张面试速记表

最后把这一章的内容浓缩成一张表，方便你面试前快速过一遍。

| 知识点 | 一句话内核 | 考察频率 |
|--------|-----------|---------|
| DFS 深度优先 | 用栈（递归即调用栈），一条路走到黑再回头，适合找所有路径/检测环 | ⭐⭐⭐ 必考 |
| BFS 广度优先 | 用队列，一层一层往外扩散，适合最短路径/层序遍历 | ⭐⭐⭐ 必考 |
| 先中后序遍历 | 「根」在左、中、右的位置不同，用途不同：序列化/有序输出/自底向上计算 | ⭐⭐⭐ 必考 |
| 非递归遍历 | 把引擎的调用栈显式化：先序「先右后左压栈」、中序「一路向左」、后序「变形先序+reverse」 | ⭐⭐ 高频 |
| BST 有序性 | 左 < 根 < 右，中序遍历即升序；删除有两种孩子的节点时用「右子树最小节点」替换 | ⭐⭐⭐ 必考 |
| BST 退化 | 插入有序数据会退化成链表，O(log n) → O(n) | ⭐⭐⭐ 必考 |
| AVL | 严格平衡（高度差 ≤ 1），四种旋转 LL/RR/LR/RL，查询快但旋转频繁 | ⭐⭐ 高频 |
| 红黑树 | 近似平衡（最长路径 ≤ 2 × 最短），增删最多旋转 3 次，工程首选 | ⭐⭐⭐ 必考 |
| HashMap 树化 | 链表长度超 8 转红黑树、少于 6 退回链表，双阈值防抖 | ⭐⭐ 高频 |
| Trie 前缀树 | 每节点一字符，查找 O(m) 与字典总量无关，缺点是空间大 → 压缩 Trie | ⭐⭐ 高频 |
| 虚拟 DOM diff | 只做同层对比（BFS 思路），跨层移动当「删除+新建」，O(n³) → O(n) | ⭐⭐ 高频 |

**一条主线记牢**：**树的价值在于「分层」——DFS/BFS 解决「怎么走」，BST 解决「怎么有序找」，Trie 解决「怎么前缀找」，AVL/红黑树解决「怎么防止退化」。** 四件事环环相扣，串起来就是一棵完整的树。

### 四个面试核心问（完整速答）

**问 1：DFS 和 BFS 分别用什么辅助结构？各自适合什么场景？**

✅ DFS 用栈（递归就是引擎的调用栈），BFS 用队列。DFS 适合「找所有路径、检测环、拓扑排序」；BFS 适合「最短路径、层序遍历、找最近的解」——因为 BFS 层层推进，第一次到达目标就是最短的。两者时间复杂度都是 O(n)，DFS 空间与树高成正比、BFS 与最宽一层成正比。

**问 2：BST 最坏情况什么时候出现？如何避免？**

✅ 插入**有序或近似有序**的数据时，每个新节点都挂在同一侧，树退化成链表，高度从 log n 变成 n，所有操作退化为 O(n)。解决办法是用自平衡树：AVL 严格控制高度差 ≤ 1；红黑树用颜色约束维持「近似平衡」，树高上界为 2·log₂(n+1)。工程上更常用红黑树，因为增删旋转更少。

**问 3：AVL 和红黑树怎么选？红黑树为什么只保证近似平衡就够？**

✅ 泛用场景选红黑树。两者查找都是 O(log n)，但 AVL 平衡条件更严、增删时可能一路旋转到根（最坏 O(log n) 次），红黑树最多旋转 3 次。「近似平衡」的高度上界 2·log₂(n+1) 虽然比 AVL 略高，但**同为 O(log n)，常数差距带来的查找开销远小于 AVL 频繁旋转的写入开销**。所以 Java 的 TreeMap、HashMap 的树化桶、C++ 的 `std::map`、Linux 的 CFS 调度器都选红黑树。

**问 4：Trie 相比哈希表的优势和劣势是什么？**

✅ 优势：① 支持**前缀查询**（哈希表只支持精确匹配）；② 天然**有序**（中序遍历即字典序）；③ 复杂度只和字符串长度 m 有关，**与字典总量无关**。劣势：**空间开销大**——每个字符一个节点，中文场景尤其明显。工程上可用**压缩 Trie（radix tree）**把单孩子的链合并成一个节点来优化。

---

## 💡 一张图总结（树的全家福）

| 树结构 | 结构特点 | 核心操作复杂度 | 典型用途 |
|--------|---------|---------------|---------|
| 多叉树 | 每个节点有任意多个孩子 | 遍历 O(n) | DOM、级联选择、树形控件 |
| 二叉树 | 最多两个孩子（左/右） | 先中后序遍历 O(n) | AST、表达式树 |
| 二叉搜索树 BST | 左 < 根 < 右 | 平均 O(log n)，最坏 O(n) | 有序查找 |
| AVL 树 | 高度差 ≤ 1，严格平衡 | 查找 O(log n)，旋转频繁 | 读多写少场景 |
| 红黑树 | 近似平衡，最长 ≤ 2×最短 | 查找 O(log n)，旋转 ≤ 3 次 | TreeMap、HashMap 树化桶 |
| Trie 前缀树 | 每节点一个字符 | 插入/查询 O(m) | 自动补全、路由匹配、敏感词 |

> 💡 记住这条主线：**树是前端的「骨架结构」——DOM 是树、虚拟 DOM 是树、AST 是树、级联选择是树。** 学会遍历，你就学会了「怎么走遍这棵树」；学会 BST 和平衡树，你就学会了「怎么在树里高效地找」；学会 Trie，你就学会了「怎么按前缀找」。这三件事，覆盖了树在面试和工程里的全部场景。

---

## 📝 留个问题

既然 Trie 查询的复杂度只和字符串长度有关、与字典总量无关，那**如果字典是「不断动态插入」的（比如用户不断搜索的新药品名），Trie 会面临什么问题？** 提示：想想节点的增长、内存回收，以及「缓存了旧前缀路径」会不会导致结果过时——再想想 LRU 缓存（第 5 篇）能不能和 Trie 结合。

欢迎在评论区写出你的答案 👇

---

## 参考资料

- https://tc39.es/ecma262/ （ECMAScript 语言规范）
- https://github.com/facebook/react/tree/main/packages/react-reconciler （React Reconciler 源码，虚拟 DOM diff 与 Fiber 遍历实现）
- https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/util/HashMap.java （OpenJDK HashMap 源码，链表树化阈值 TREEIFY_THRESHOLD = 8 与 UNTREEIFY_THRESHOLD = 6）
- https://ant.design/components/tree-cn （Ant Design Tree 组件，treeData 数据结构）
- https://developer.mozilla.org/zh-CN/docs/Web/JavaScript （MDN，递归与树遍历说明）
- https://leetcode.cn/ （LeetCode，本篇题号 94 / 102 / 104 / 105 / 111 / 112 / 124 / 208 / 226 / 236）
- 《算法》（Sedgewick / Wayne，第 4 版）（二叉搜索树、平衡树与 Trie 的经典教材）
- 《算法导论》（CLRS，第 3 版）（红黑树、B 树与树编辑距离的权威出处）
- 《学习 JavaScript 数据结构与算法》（Groner，第 3 版）（本篇笔记中 BST / AVL / 红黑树实现的原始来源）

> 推荐搜索关键词：「二叉树 先序 中序 后序 非递归 栈」「BST 退化成链表 有序插入」「AVL 四种旋转 LL RR LR RL」「红黑树 五条性质 变色 旋转」「HashMap 链表长度 8 转红黑树 6 退回」「Trie 前缀树 压缩 radix tree」「虚拟 DOM diff 同层对比 O(n³)」。

---

> 🔖 这是「前端数据结构与算法」系列第 7 篇。上一篇：《集合与散列表：ES6 Set/Map 底层原理与高频面试题》；下一篇预告：《堆：优先队列/Top-K/数据流中位数手写最小堆》
