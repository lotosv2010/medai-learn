# 图：从 Webpack 依赖图到拓扑排序与最短路径（面试收藏级）

> **副标题**：邻接表建图、DFS/BFS 遍历、拓扑排序检测循环依赖

> 面试官盯着简历上「熟悉 Webpack 构建优化」这一行，问：「你项目里有没有遇到过循环依赖？Webpack 是怎么发现它的？」你脑子里飞快地过了一遍 `webpack.config.js`——`entry`、`output`、`loader`、`plugin`，配置写得滚瓜烂熟，但「循环依赖怎么被检测出来」这件事，好像从来没想过。沉默了几秒，你答：「就是有两个文件互相 import 吧。」面试官点点头：「那底层是用什么算法检测的呢？」——这题，考的其实是一个你早就学过、却从没和工程对上的数据结构：**图**。

---

## 🎯 这篇文章解决什么问题

这是「**前端数据结构与算法**」系列的第 **9** 篇。前面八篇，我们已经从线性结构（栈、队列、链表、集合、散列表）走到了非线性结构里的树和堆。这一篇要讲的是非线性结构里**表达能力最强、也最容易被前端忽略**的一个——**图（Graph）**。

为什么说它容易被忽略？因为「图」这个词听着就像算法教科书里的东西，跟日常写页面八竿子打不着。但真相恰恰相反：

- 你项目里的 **Webpack 依赖图**，是一张图
- `package-lock.json` 里的 **npm 包依赖关系**，是一张图
- **前端路由**的嵌套跳转关系、**社交/关注**关系、**药品配伍禁忌**关系，都是图
- 而「**循环依赖检测**」这个天天被构建工具挂在嘴边的问题，本质就是图论里的**环检测**

这篇文章只说清一条主线：**先把图建成邻接表，再用 DFS/BFS 两种方式遍历它，然后用拓扑排序检测循环依赖，最后延伸到最短路径等经典算法**。每一节讲透原理后，立刻告诉你「面试官会怎么问、标准答案是什么、加分点在哪」。读完这一篇，你不仅能答出「循环依赖怎么检测」，还能把图论里最常见的几个算法一次性吃透。

---

## 一、场景切入：Webpack 模块依赖图与循环依赖

先从一个你天天写、却可能从没深究的现象说起。

### 一行 import，背后是一张图

在任何一个现代前端工程里，`import` 是最常见的语句：

```typescript
// utils/format.ts
export const formatPrice = (n: number) => `¥${n.toFixed(2)}`;

// pages/drug-detail.ts
import { formatPrice } from '../utils/format';   // 👈 这是一条有向边
```

在 Webpack 眼里，这行 `import` 不是「加载一个文件」这么简单，而是**给模块依赖图加了一条有向边**：

```
每个 JS 文件 = 一个节点（vertex）
每条 import 语句 = 一条有向边（edge）
  pages/drug-detail.ts  ──►  utils/format.ts
```

工程越大，这张图越复杂。入口文件 `main.ts` 是起点，它 `import` 的模块是它的出边邻居，那些模块又 `import` 别的模块……层层展开，整个工程就是一张庞大的**有向图**。

### tree shaking 为什么能摇掉「没用的代码」

理解了依赖图，很多工程概念一下子就有了算法解释：

- **tree shaking（摇树优化）**：从入口节点出发做一次 **可达性分析**（DFS/BFS 遍历），凡是能被入口「走到」的模块才保留，走不到的就是死代码，直接摇掉。**这就是图的可达性问题**。
- **循环依赖（circular dependency）**：模块 A `import` 了 B，B 又反过来 `import` 了 A——在图上就表现为**一个环（cycle）**。**这就是图的环检测问题**。
- **`package-lock.json`**：记录所有 npm 包之间的依赖关系。正常情况下它是一个 **有向无环图（DAG，Directed Acyclic Graph）**——`A 依赖 B、B 依赖 C`，绝不该出现 `C 又依赖 A`。一旦出现环，就是循环依赖。

🔧 **真实场景**：在药品电商项目里，两个模块很容易「互相纠缠」——比如 `drugService`（药品服务）需要调 `authService`（鉴权服务）校验权限，而 `authService` 为了记录操作日志又需要调 `drugService` 拿药品信息。这种互相 `import` 一旦建立，运行时就会出现**很隐蔽的初始化时序问题**：模块 A 在使用模块 B 导出的值时，B 还没执行到那行导出，拿到的是 `undefined`，页面偶发报错，还很难复现。这不是玄学 bug，是**图里出现了环**。

### 为什么必须学会「用图思考」

到这里，「图」和前端工程之间的那层窗户纸已经捅破了。接下来的主线很清晰：

**怎么把这种依赖关系建成一张可计算的数据结构（邻接表）→ 怎么在图上遍历（DFS/BFS）→ 怎么发现环（拓扑排序）→ 怎么找最优路径（最短路径算法）**。

> 💬 **面试官**：你项目里遇到过循环依赖吗？构建工具是怎么检测出来的？
>
> ✅ 标准答案：循环依赖本质是模块依赖图里出现了「环」——A 依赖 B、B 依赖 A，在图上就是一条首尾相接的边。构建工具把每个模块当节点、每条 `import` 当有向边建图，然后做**环检测**：对图做深度优先遍历，如果遍历过程中遇到一条指向「正在遍历中（灰色）节点」的边，也就是后向边（back edge），就说明存在环，于是给出循环依赖警告。
>
> 🎁 加分答案：能补两层——① 点出这个检测属于**图论算法**而不是 Webpack 特有的黑魔法，环检测的标准做法就是 DFS 三色标记（白=未访问、灰=遍历中、黑=已完成）或拓扑排序，能顺着说出「拓扑排序排不完的节点就在环里」；② 能说清循环依赖的**危害**：不是报错，而是运行时初始化顺序错乱，模块 A 拿到模块 B 尚未导出的值（`undefined`），表现为偶发、难复现的 bug——这比直接报错更折磨人。

---

## 二、图是什么：邻接表 vs 邻接矩阵

### 定义：节点 + 边，表示「关系」本身

- **图（Graph）** 是**分层网络结构**的抽象模型，是一组由**边（edge）**连接的**节点（vertex）**
- 图由顶点和连接顶点的边构成，通常把数据元素称为**顶点**，顶点之间的关系称为**边**
- 图可以表示任何**二元关系**——比如道路、航班、社交关系。只要两个事物之间存在「一对一、一对多、多对多」的关联，就能用图来描述
- 图分两种：
  - **有向图**：边有方向，`A → B` 和 `B → A` 是两条不同的边（如 `import`、关注）
  - **无向图**：边无方向，`A — B` 就是 `A` 和 `B` 互相连通（如好友、道路）
- **JS 中没有原生的图**，可以用 **Object + Array** 构建

![有向图 vs 无向图示意（发布前请自行转存素材库）](https://cdn.nlark.com/yuque/0/2022/png/738210/1641356291339-d0e05f70-1cc8-48aa-8e0d-9d677e859b5a.png)

上面这张图直观对比了有向图和无向图，注意有向图的边上带箭头，方向不可逆。

### 三种表示法：怎么把图「存」下来

图在内存里怎么存，直接决定了后续操作的性能。主要有三种表示法：

**邻接矩阵（Adjacency Matrix）**

用一个 `V × V` 的二维数组，`matrix[i][j] = 1` 表示从顶点 `i` 到顶点 `j` 有一条边。

- 空间复杂度 **O(V²)**——不管有多少条边，都要开满整个矩阵
- 优点：判定「两个顶点是否相邻」是 **O(1)**，直接查表
- 缺点：**非常浪费内存**（稀疏图里有大量 0 被存下来），而且**添加/删除顶点很麻烦**（要重建整个矩阵）

![邻接矩阵示意（发布前请自行转存素材库）](https://cdn.nlark.com/yuque/0/2022/png/738210/1641356335701-8c372051-2cbb-437d-b3c9-02c4baf0fd45.png)

**邻接表（Adjacency List）**

为每个顶点维护一个「邻居列表」，只存真实存在的边。

- 空间复杂度 **O(V + E)**——只和顶点数、边数相关
- 优点：**省内存**（稀疏图尤其明显）、**增删顶点容易**、天然就是「一个顶点的所有出边」
- 缺点：判定「两点是否相邻」需要遍历该顶点的邻居列表，最坏 **O(V)**

![邻接表示意（发布前请自行转存素材库）](https://cdn.nlark.com/yuque/0/2022/png/738210/1641356356361-6db72791-d83e-47ab-a63a-e6bfbb44ed61.png)

**关联矩阵（Incidence Matrix）**

用行表示顶点、列表示边，记录顶点和边的关联关系。工程里用得少，知道有这个概念即可。

**前端为什么几乎只用邻接表？** 因为前端的图（模块依赖、路由、社交关系）绝大多数是**稀疏图**——一个模块通常只 `import` 几个模块，而不是几万个。在稀疏图里，邻接矩阵的 `O(V²)` 空间纯属浪费，邻接表的 `O(V+E)` 才合理。而且遍历出边（找「这个模块依赖了谁」）在邻接表里就是取出一个数组，天然高效。

### 用 TypeScript 实现一个图

下面用邻接表实现一个通用的图类，支持有向/无向两种模式。

![图的顶点与边示意（发布前请自行转存素材库）](https://cdn.nlark.com/yuque/0/2022/png/738210/1645423532590-f33d7d10-f270-4a8c-a9a5-030b45d4cb1b.png)

`src/data-structures/graph/graph.ts`

```typescript
import Dictionary from "../map/dictionary";

export default class Graph {
  protected vertices: any[]; // 存储所有顶点
  protected adjList: Dictionary; // 存储邻接表
  constructor(protected isDirected = false) { // isDirected 表示图是否有向
    this.vertices = [];
    this.adjList = new Dictionary();
  }
```

先看构造：`vertices` 存所有顶点，`adjList` 是一个字典（Map），键是顶点、值是「该顶点的邻居数组」——这就是邻接表。`isDirected` 决定后续加边时是否双向。

```typescript
  // 向图中添加一个新顶点
  // v：代表顶点
  addVertex(v: any) {
    if(!this.vertices.includes(v)) {          // 👈 去重，避免同一顶点加两次
      this.vertices.push(v);
      this.adjList.set(v, []);                 // 👈 为新顶点初始化一个空的邻居列表
    }
  }
  // 添加顶点之间的边
  // v：顶点1，w：顶点2
  addEdge(v: any, w: any) {
    // 如果顶点v或w不存在于图中，将它们加入顶点列表
    if(!this.adjList.get(v)) {
      this.addVertex(v);
    }
    if(!this.adjList.get(w)) {
      this.addVertex(w);
    }
    this.adjList.get(v).push(w); // 将 w 加入到 v 的邻接表中，表示添加了一条自顶点 v 到顶点 w 的边
    if(!this.isDirected) { // 无向图
      this.adjList.get(w).push(v); // 👈 无向图要补上反向边，保证「连通」是双向的
    }
  }
```

`addEdge` 的关键点在于：**有向图只加一条边，无向图要补一条反向边**。这也是有向/无向图在邻接表实现里唯一的差别。

```typescript
  // 返回顶点列表
  getVertices() {
    return this.vertices;
  }
  // 返回邻接表
  getAdjList() {
    return this.adjList;
  }
  toString() {
    let s = ``;
    for (let i = 0; i < this.vertices.length; i++) {
      s += `${this.vertices[i]} -> `;
      const neighbors = this.adjList.get(this.vertices[i]);
      for (let j = 0; j < neighbors.length; j++) {
        s += `${neighbors[j]} `;
      }
      s += `\n`;
    }
    return s;
  }
}
```

`toString` 把邻接表打印成 `A -> B C D` 这种可读形式，调试时非常直观。

配套的测试验证了邻接表构建是否正确：

`src/data-structures/graph/test/graph.test.ts`

```typescript
import "mocha";
import { expect, assert } from "chai";
import Graph from "../graph";

describe("图类实现(Graph) 测试", function () {
  const graph = new Graph();
  it("addVertex & addEdge", function () {
    const myVertices = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']; // {12}
    for (let i = 0; i < myVertices.length; i++) { // {13}
      graph.addVertex(myVertices[i]);
    }
    graph.addEdge('A', 'B'); // {14}
    graph.addEdge('A', 'C');
    graph.addEdge('A', 'D');
    graph.addEdge('C', 'D');
    graph.addEdge('C', 'G');
    graph.addEdge('D', 'G');
    graph.addEdge('D', 'H');
    graph.addEdge('B', 'E');
    graph.addEdge('B', 'F');
    graph.addEdge('E', 'I');
    // console.dir(graph, { depth: 10 });
    // console.log(graph.toString())
    expect(graph.getAdjList().toString()).to.be.deep.equal('[#A: B,C,D], [#B: A,E,F], [#C: A,D,G], [#D: A,C,G,H], [#E: B,I], [#F: B], [#G: C,D], [#H: D], [#I: E]');
  });
});
```

> 💬 **面试官**：邻接表和邻接矩阵分别适用什么场景？前端通常用哪种？
>
> ✅ 标准答案：邻接矩阵用一个 `V×V` 的二维数组存储，空间 O(V²)，判断两点是否相邻是 O(1)，适合**边密集的稠密图**；邻接表为每个顶点存一个邻居列表，空间 O(V+E)，适合**稀疏图**，且增删顶点方便，只是判断相邻最坏 O(V)。前端工程里的图大多是稀疏图（一个模块只依赖少数几个模块），所以**通常用邻接表**。
>
> 🎁 加分答案：能补两点——① 记一个判据：**看 E 和 V² 的量级关系**，稀疏图 E 远小于 V² 用邻接表，稠密图 E 接近 V² 用邻接矩阵；② 能提到邻接表有两种存储细节——用 `Map`/`Object` 存键值对（适合顶点是非数字、动态增删，如模块名），或用数组嵌套（适合顶点是 0~n-1 整数，如 LeetCode 图题），LeetCode 里因为顶点通常是连续整数，用数组嵌套更快。

---

## 三、遍历：DFS 与 BFS 一次讲透

图建好了，接下来的核心操作就是**遍历**——从某个顶点出发，访问图中所有能到达的顶点。图的两大遍历方式，就是**深度优先（DFS）**和**广度优先（BFS）**，这套东西你在第 07 篇树里已经见过雏形，但图比树多了一个关键问题：**图可能有环**，不标记「已访问」就会死循环。

### 深度优先遍历（DFS）：一路走到底

**核心思想：尽可能深地搜索图的分支**。

![深度优先遍历示意（发布前请自行转存素材库）](https://cdn.nlark.com/yuque/0/2022/png/738210/1645429198159-e43fc2b7-4ca7-4373-93a1-1274d024bcf3.png)

**算法口诀**：

- 访问根节点
- 对根节点的**没有访问过的相邻节点**依次进行深度优先遍历

翻译成人话：从起点出发，能往下走就往下走，走不动了再回头找别的路。关键是每次要记下「这个节点访问过了」，否则遇到环就会无限打转。

`src/data-structures/graph/dfs.ts`

```typescript
export function depthFirstSearch(graph: Record<string, any>, root: any, nodeList: Array<any>, visited: Set<any>): Array<any> {
  if(root) {
    nodeList.push(root);
    visited.add(root);                          // 👈 标记已访问，防止环导致死循环
    graph[root].forEach((n: any) => {
      if(!visited.has(n)){
        depthFirstSearch(graph, n, nodeList, visited); // 👈 递归深入
      }
    })
  }
  return nodeList;
}
```

`graph` 直接是一个「顶点 → 邻居数组」的对象，天然就是邻接表。`visited` 用 `Set` 记录已访问节点。递归的三步：访问自己、标记、对未访问的邻居递归。

`src/data-structures/graph/test/dfs.test.ts`

```typescript
import "mocha";
import { expect, assert } from "chai";
import { depthFirstSearch } from "../dfs";

describe("图(Graph) 测试", function () {
  it("深度优先遍历", function () {
    const graph = {
      'v1': ['v2', 'v3'],
      'v2': ['v4', 'v5'],
      'v3': ['v6', 'v7'],
      'v4': ['v2', 'v8'],
      'v5': ['v2', 'v8'],
      'v6': ['v3', 'v7'],
      'v7': ['v3', 'v6'],
      'v8': ['v4', 'v5']
    };
    const nodeList: Array<any> = [];
    const visited = new Set();
    depthFirstSearch(graph, 'v1', nodeList, visited);
    expect(nodeList).to.be.deep.equal(['v1', 'v2', 'v4', 'v8', 'v5', 'v3', 'v6', 'v7']);
  });
  it("深度优先遍历", function () {
    const graph = {
      '0': ['1', '2'],
      '1': ['2'],
      '2': ['0', '3'],
      '3': ['3']
    };
    const nodeList: Array<any> = [];
    const visited = new Set();
    depthFirstSearch(graph, '2', nodeList, visited);
    expect(nodeList).to.be.deep.equal(['2', '0', '1', '3']);
  });
});
```

第二个测试用例里，顶点 `3` 有一条指向自己的自环（`'3': ['3']`），如果没有 `visited` 标记，递归会在这里无限循环——这正说明了标记访问状态的必要性。

### DFS 进阶：白灰黑三色标记与「发现/完成时间」

上面是教学版的 DFS，工程版会多两个关键概念：**三色标记**和**时间戳**。这套机制是后面拓扑排序的基础，务必理解透。

![DFS 每步执行过程（发现/探索/完成）（发布前请自行转存素材库）](https://cdn.nlark.com/yuque/0/2022/png/738210/1645430109328-b37d8cee-2a18-4b3e-ac0c-1d9244b3cb85.png)

三色的含义：

- **白色（WHITE）**：还没被访问过
- **灰色（GREY）**：正在被访问（已经进入递归，但还没处理完它的所有邻居）——**灰色节点就是「当前递归栈上」的节点**
- **黑色（BLACK）**：已经探索完成（自己和所有邻居都处理完了）

为什么需要「灰色」这个中间状态？因为它是**环检测的钥匙**：遍历时如果能遇到一条边指向一个**灰色**节点，说明绕了一圈又回到了正在遍历的路径上——**这就是环**。白色节点是「还没去过」（正常深入），黑色节点是「去过了」（跳过），只有指向灰色的边才是后向边（back edge）。

`src/data-structures/graph/depthFirstSearch.ts`

```typescript
import Dictionary from "../map/dictionary";
import Graph from "./graph";

enum Colors {
  WHITE = 0,
  GREY = 1,
  BLACK = 2,
}

/**
 * 初始化每个顶点的颜色
 * @param vertices 顶点数组
 * @returns
 */
const initializeColor = (vertices: any[]) => {
  const color: Record<string, any> = {};
  for (let i = 0; i < vertices.length; i++) {
    color[vertices[i]] = Colors.WHITE;      // 👈 所有顶点初始为白色
  }
  return color;
};
```

先定义三色枚举，再把所有顶点初始化成白色。

```typescript
/**
 * 深度优先搜索的步骤是递归的
 * 这意味着深度优先搜索算法使用栈来存储函数调用（由递归调用所创建的栈）
 * 步骤：
 *    (1) 标注v为被发现的（灰色）；
 *    (2) 对于v的所有未访问（白色）的邻点w，访问顶点w；
 *    (3) 标注v为已被探索的（黑色）
 * @param u 顶点
 * @param color 顶点颜色字典
 * @param adjList 邻接表
 * @param callback 回调函数
 */
const depthFirstSearchVisit = (
  u: any,
  color: Record<string, Colors>,
  adjList: Dictionary,
  callback: Function
) => {
  color[u] = Colors.GREY;                    // 👈 进入即标灰（在递归栈上）
  if (callback) {
    callback(u);
  }
  const neighbors: any[] = adjList.get(u);
  for (let i = 0; i < neighbors.length; i++) {
    const w = neighbors[i];
    if (color[w] === Colors.WHITE) {         // 👈 只深入白色节点
      depthFirstSearchVisit(w, color, adjList, callback);
    }
  }
  color[u] = Colors.BLACK;                   // 👈 邻居全处理完，标黑
};
```

三色状态就在这三行里流转：进函数标灰、只对白色邻居递归、退出前标黑。

```typescript
/**
 * 深度优先搜索
 * @param graph
 * @param callback
 */
export const depthFirstSearch = (graph: Graph, callback: Function) => {
  const vertices = graph.getVertices();
  const adjList = graph.getAdjList();
  const color = initializeColor(vertices);
  for (let i = 0; i < vertices.length; i++) {
    if (color[vertices[i]] === Colors.WHITE) {  // 👈 处理非连通图：可能有多棵树
      depthFirstSearchVisit(vertices[i], color, adjList, callback);
    }
  }
};
```

外面这层循环很重要：**图不一定连通**，可能由多个互不相连的「连通分量」组成，所以要从每个还没访问的白色顶点都发起一次 DFS，才能保证遍历到全图。

接下来是带时间戳的版本——记录每个顶点的**发现时间 `d`** 和**完成时间 `f`**，以及**前溯点 `p`**：

```typescript
/**
 *
 * @param u 顶点
 * @param color 顶点颜色字典
 * @param d 顶点的发现时间
 * @param f 顶点被标注黑色时，完成探索的时间
 * @param p 前溯点
 * @param time 时间
 * @param adjList 邻接表
 */
const DFSVisit = (
  u: any,
  color: Record<string, Colors>,
  d: Record<string, number>,
  f: Record<string, number>,
  p: Record<string, any>,
  time: Record<string, number>,
  adjList: Dictionary
) => {
  color[u] = Colors.GREY;
  d[u] = ++time.count;                       // 👈 发现时间：进入时打点
  const neighbors = adjList.get(u);
  for (let i = 0; i < neighbors.length; i++) {
    const w = neighbors[i];
    if (color[w] === Colors.WHITE) {
      p[w] = u;                              // 👈 记录前溯点（w 是从 u 过来的）
      DFSVisit(w, color, d, f, p, time, adjList);
    }
  }
  color[u] = Colors.BLACK;
  f[u] = ++time.count;                       // 👈 完成时间：退出时打点
};
```

**发现时间 `d` 在进入时记录、完成时间 `f` 在退出时记录**，用一个全局递增的 `time.count` 打点。这两组时间戳是所有 DFS 进阶算法（拓扑排序、强连通分量）的地基。

```typescript
export const DFS = (graph: Graph) => {
  const vertices = graph.getVertices();
  const adjList = graph.getAdjList();
  const color = initializeColor(vertices);
  const d: Record<string, number> = {};
  const f: Record<string, number> = {};
  const p: Record<string, any> = {};
  const time = {
    count: 0
  };
  for (let i = 0; i < vertices.length; i++) {
    f[vertices[i]] = 0;
    d[vertices[i]] = 0;
    p[vertices[i]] = null;
  }
  for (let i = 0; i < vertices.length; i++) {
    if(color[vertices[i]] === Colors.WHITE) {
      DFSVisit(vertices[i], color, d, f, p, time, adjList);
    }
  }
  return {
    discovery: d,   // 发现时间
    finished: f,    // 完成探索时间
    predecessors: p // 前溯点
  }
}
```

测试里有个非常值得注意的片段——**把完成时间倒序排列，就得到了拓扑排序**：

`src/data-structures/graph/test/depthFirstSearch.test.ts`

```typescript
import "mocha";
import { expect, assert } from "chai";
import Graph from "../graph";
import { depthFirstSearch, DFS } from "../depthFirstSearch";

describe("图(Graph) 测试", function () {
  const graph = new Graph();
  const myVertices = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']; // {12}
  for (let i = 0; i < myVertices.length; i++) { // {13}
    graph.addVertex(myVertices[i]);
  }
  graph.addEdge('A', 'B'); // {14}
  graph.addEdge('A', 'C');
  graph.addEdge('A', 'D');
  graph.addEdge('C', 'D');
  graph.addEdge('C', 'G');
  graph.addEdge('D', 'G');
  graph.addEdge('D', 'H');
  graph.addEdge('B', 'E');
  graph.addEdge('B', 'F');
  graph.addEdge('E', 'I');
  it("深度优先搜索", function () {
    const list: any = []
    const cb = (u: any) => list.push(u);
    depthFirstSearch(graph, cb);
    // console.log(list);
    expect(list).to.be.deep.equal(['A', 'B', 'E', 'I', 'F', 'C', 'D', 'G', 'H']);
  });

  it("深度优先搜索", function () {
    const result = DFS(graph);

    // 倒序来排序完成时间数组，这便得出了该图的拓扑排序
    const fTimes = {...result.finished};
    let s = '';
    for (let count = 0; count < myVertices.length; count++) {
      let max = 0;
      let maxName: any = null;
      for (let i = 0; i < myVertices.length; i++) {
        if (fTimes[myVertices[i]] > max) {
          max = fTimes[myVertices[i]];
          maxName = myVertices[i];
        }
      }
      s += ' - ' + maxName;
      delete fTimes[maxName];
    }
    // console.log(result);
    expect(s).to.be.deep.equal(' - A - C - D - H - G - B - F - E - I');
  });
});
```

注意第二个测试的注释——**「倒序来排序完成时间数组，这便得出了该图的拓扑排序」**。这就是 DFS 版拓扑排序的原理，第四节会详细展开。

### 广度优先遍历（BFS）：一层一层地扫

**核心思想：先访问离根节点最近的节点**。

![广度优先遍历示意（发布前请自行转存素材库）](https://cdn.nlark.com/yuque/0/2022/png/738210/1645433662198-d47fcd3f-659b-456b-a015-31de4165e712.png)

**算法口诀**：

- 新建一个队列，把根节点入队
- 把队头出队并访问
- 把队头的**没访问过的相邻节点**依次入队
- 重复第二、三步，直到队列为空

```
从起点出发，把距离为 1 的邻居全处理完，
再处理距离为 2 的，再处理距离为 3 的……
一层一层向外扩散，所以 BFS 天然能求出「最短距离（边数最少）」。
```

`src/data-structures/graph/bfs.ts`

```typescript
export function breadthFirstSearch(graph: Record<string, any>, root: any, nodeList: Array<any>, visited: Set<any>): Array<any> {
  const queue = []; // 新建一个队列
  if(root) {
    queue.unshift(root);                        // 👈 根节点入队
    visited.add(root);
    while(queue.length !== 0) { // 重复二、三步
      const node = queue.shift();               // 队头出队
      nodeList.push(node);                      // 访问队头
      graph[node].forEach((n: any) => {
        if(!visited.has(n)){
          queue.push(n);                        // 把队头的没访问过的相邻节点依次入队
          visited.add(n);                       // 👈 入队时就标记，避免重复入队
        }
      });
    }
  }
  return nodeList;
}
```

这里有个细节容易被忽略：**标记 `visited` 是在「入队时」做的，而不是「出队时」**。如果在出队时才标记，同一个节点可能被多个邻居重复入队，队列里堆满重复元素。入队即标记，保证每个节点最多进队一次。

`src/data-structures/graph/test/bfs.test.ts`

```typescript
import "mocha";
import { expect, assert } from "chai";
import { breadthFirstSearch } from "../bfs";

describe("图(Graph) 测试", function () {
  it("深度优先遍历", function () {
    const graph = {
      'v1': ['v2', 'v3'],
      'v2': ['v4', 'v5'],
      'v3': ['v6', 'v7'],
      'v4': ['v2', 'v8'],
      'v5': ['v2', 'v8'],
      'v6': ['v3', 'v7'],
      'v7': ['v3', 'v6'],
      'v8': ['v4', 'v5']
    };
    const nodeList: Array<any> = [];
    const visited = new Set();
    breadthFirstSearch(graph, 'v1', nodeList, visited);
    expect(nodeList).to.be.deep.equal(['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8']);
  });
  it("深度优先遍历", function () {
    const graph = {
      '0': ['1', '2'],
      '1': ['2'],
      '2': ['0', '3'],
      '3': ['3']
    };
    const nodeList: Array<any> = [];
    const visited = new Set();
    breadthFirstSearch(graph, '2', nodeList, visited);
    expect(nodeList).to.be.deep.equal(['2', '0', '3', '1']);
  });
});
```

对比第一个用例的 DFS 结果 `['v1','v2','v4','v8','v5','v3','v6','v7']` 和 BFS 结果 `['v1','v2','v3','v4','v5','v6','v7','v8']`——DFS 是一条道走到黑（v1→v2→v4→v8……），BFS 是层层扩散（v1，然后 v2、v3，然后 v4~v7……）。

### BFS 进阶：记录距离与前溯点，就是最短路径

BFS 天然按「层」推进，所以它记录的信息比 DFS 多一样东西：**从起点到每个节点的最短距离**（按边数计），以及**前溯点**（记录每个节点是从哪个节点走过来的，用来还原路径）。

`src/data-structures/graph/breadthFirstSearch.ts`

```typescript
import Dictionary from "../map/dictionary";
import Queue from "../queue/queue";
import Graph from "./graph";

enum Colors {
  WHITE = 0,
  GREY = 1,
  BLACK = 2,
}

/**
 * 初始化每个顶点的颜色
 * @param vertices 顶点数组
 * @returns
 */
const initializeColor = (vertices: any[]) => {
  const color: Record<string, any> = {};
  for (let i = 0; i < vertices.length; i++) {
    color[vertices[i]] = Colors.WHITE;
  }
  return color;
};
```

BFS 同样用三色标记，只是状态转换的时机不同。

```typescript
/**
 * 广度优先搜索
 * 步骤:
 *    (1) 创建一个队列Q。
 *    (2) 标注v为被发现的（灰色），并将v入队列Q。
 *    (3) 如果Q非空，则运行以下步骤：
 *      (a) 将u从Q中出队列；
 *      (b) 标注u为被发现的（灰色）；
 *      (c) 将u所有未被访问过的邻点（白色）入队列；
 *      (d) 标注u为已被探索的（黑色）
 * @param graph 图
 * @param startVertex 顶点
 * @param callback 回调函数
 */
export const breadthFirstSearch = (
  graph: Graph,
  startVertex: any,
  callback: Function
) => {
  const vertices = graph.getVertices();
  const adjList = graph.getAdjList();
  const color = initializeColor(vertices);
  const queue = new Queue();
  queue.enqueue(startVertex);
  while(!queue.isEmpty()) {
    const u: any = queue.dequeue();
    const neighbors = adjList.get(u);
    color[u] = Colors.GREY;
    for (let i = 0; i < neighbors.length; i++) {
      const w = neighbors[i];
      if(color[w] === Colors.WHITE) {
        color[w] = Colors.GREY;              // 👈 入队时标灰
        queue.enqueue(w);
      }
    }
    color[u] = Colors.BLACK;                 // 👈 出队处理完邻居后标黑
    if(callback) {
      callback(u);
    }
  }
};
```

再看带距离和前溯点的版本 `BFS`：

```typescript
/**
 * 使用BFS寻找最短路径
 * @param graph 图
 * @param startVertex 顶点
 * @returns
 */
export const BFS = (
  graph: Graph,
  startVertex: any
) => {
  const vertices = graph.getVertices();
  const adjList = graph.getAdjList();
  const color = initializeColor(vertices);
  const queue = new Queue();
  const distances: Record<string, number> = {};
  const predecessors: Record<string, any> = {};
  queue.enqueue(startVertex);
  for (let i = 0; i < vertices.length; i++) {
    distances[vertices[i]] = 0;
    predecessors[vertices[i]] = null;
  }
  while(!queue.isEmpty()) {
    const u: any = queue.dequeue();
    const neighbors = adjList.get(u);
    color[u] = Colors.GREY;
    for (let i = 0; i < neighbors.length; i++) {
      const w = neighbors[i];
      if(color[w] === Colors.WHITE) {
        color[w] = Colors.GREY;
        distances[w] = distances[u] + 1;     // 👈 邻居的距离 = 当前节点距离 + 1
        predecessors[w] = u;                 // 👈 记录前溯点，用于还原路径
        queue.enqueue(w);
      }
    }
    color[u] = Colors.BLACK;
  }
  return {
    distances,
     predecessors
  }
}
```

`distances[w] = distances[u] + 1` 这一行，就是「BFS 求最短路径」的全部秘密：**因为 BFS 按层推进，第一次到达某节点的路径必然是最短的（边数最少）**。而 `predecessors` 记录了「我是从谁走过来的」，沿着前溯点从终点倒推回起点，就能还原出整条最短路径。

`src/data-structures/graph/test/breadthFirstSearch.test.ts`

```typescript
import "mocha";
import { expect, assert } from "chai";
import Graph from "../graph";
import { breadthFirstSearch, BFS } from "../breadthFirstSearch";

describe("图(Graph) 测试", function () {
  const graph = new Graph();
  const myVertices = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']; // {12}
  for (let i = 0; i < myVertices.length; i++) { // {13}
    graph.addVertex(myVertices[i]);
  }
  graph.addEdge('A', 'B'); // {14}
  graph.addEdge('A', 'C');
  graph.addEdge('A', 'D');
  graph.addEdge('C', 'D');
  graph.addEdge('C', 'G');
  graph.addEdge('D', 'G');
  graph.addEdge('D', 'H');
  graph.addEdge('B', 'E');
  graph.addEdge('B', 'F');
  graph.addEdge('E', 'I');
  it("广度优先搜索", function () {
    const list: any = []
    const cb = (u: any) => list.push(u);
    breadthFirstSearch(graph, myVertices[0], cb);
    expect(list).to.be.deep.equal(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
  });

  it("广度优先搜索", function () {
    const result = BFS(graph, myVertices[0]);
    // console.log(result);
    expect(result.distances).to.be.deep.equal({ A: 0, B: 1, C: 1, D: 1, E: 2, F: 2, G: 2, H: 2, I: 3 });
  });
});
```

结果一目了然：`A` 距离 0，`B/C/D` 距离 1，`E/F/G/H` 距离 2，`I` 距离 3——完全按「层」递增。

> 💬 **面试官**：DFS 和 BFS 有什么区别？各自适合什么场景？白灰黑三色分别代表什么？
>
> ✅ 标准答案：DFS 用**递归（本质是栈）**，一条路走到底再回头，适合探索所有路径、检测环、拓扑排序、回溯类问题；BFS 用**队列**，一层一层向外扩散，适合求**无权图最短路径**（第一次到达即最短）、层序遍历。三色标记：**白色=未访问**、**灰色=正在遍历中（在当前递归栈上）**、**黑色=已探索完成**；遍历时遇到指向灰色节点的边，就是后向边，说明有环。
>
> 🎁 加分答案：能补三点——① **复杂度**：两者时间都是 O(V+E)（每个顶点和每条边各访问一次），DFS 空间是最坏 O(V) 的递归栈，BFS 空间是最坏 O(V) 的队列，**BFS 在宽图（fan-out 大）上队列可能很占内存**；② **为什么 BFS 能求最短路径、DFS 不行**：BFS 按层扩散，第一次到某节点必然经过最少边数；DFS 可能绕远路先到达，不保证最短；③ **为什么需要「灰色」而不只是「访问过」**：只有区分「正在遍历中」和「已完成」才能识别后向边做环检测，如果只有两态（访问/未访问），你无法判断遇到的已访问节点是「绕回来了（有环）」还是「从别的路正常走到过（无环）」。

---

## 四、拓扑排序：循环依赖检测的杀手锏

到这里，本文的主线终于走到了最核心的一环——**拓扑排序**。这就是「循环依赖怎么检测」的标准答案。

### 拓扑排序是什么

**拓扑排序（Topological Sort）**：对一个**有向无环图（DAG）** 的所有节点排序，使得**每条边都从排在前面的节点指向排在后面的节点**。

```
原始图:  A ──► B ──► D
          └──► C ──► ┘

拓扑排序结果之一: A → B → C → D （所有边都是「前 → 后」）
```

它解决的问题是「**有先后依赖关系的任务，该按什么顺序执行**」：

- 课程表：修课程 B 前必须先修完先修课 A
- 构建工具：模块 B 依赖 A，那么打包时 A 必须先于 B 处理
- npm 安装：包 B 依赖包 A，A 要先安装

**如果图里有环，拓扑排序就做不出来**——因为环上的节点互相依赖，谁也没法排在别人前面。**这正是循环依赖检测的原理：能拓扑排序 → 无环；排不完 → 有环。**

### 算法一：Kahn 算法（BFS 版，入度法）

Kahn 算法是最直观的拓扑排序实现，核心是**入度（in-degree）**——一个节点有多少条边指向它。

```
入度 = 指向该节点的边数
     = 「有多少个前置依赖」

A ──► B ──► D          入度: A=0, B=1, C=1, D=2
└──► C ──► ┘            A 没有前置依赖，可以从它开始
```

**算法步骤**：

- 统计每个节点的入度
- 把所有**入度为 0**（没有前置依赖）的节点入队
- 循环：队头出队，加入结果；把它的所有邻居的入度减 1；**减到 0 的邻居入队**
- 重复直到队列为空
- **如果结果里的节点数 < 总节点数，说明有环**（剩下的节点互相依赖，永远等不到入度为 0）

```typescript
/**
 * Kahn 算法：BFS 版拓扑排序
 * @param numNodes 节点总数
 * @param graph 邻接表，graph[u] 表示 u 指向的所有节点
 * @returns 拓扑序数组；若存在环，返回的数组长度小于 numNodes
 */
function topologicalSortKahn(numNodes: number, graph: number[][]): number[] {
  const inDegree = new Array(numNodes).fill(0);   // 👈 统计每个节点的入度
  for (let u = 0; u < numNodes; u++) {
    for (const v of graph[u]) {
      inDegree[v]++;
    }
  }

  const queue: number[] = [];
  for (let i = 0; i < numNodes; i++) {
    if (inDegree[i] === 0) queue.push(i);         // 👈 入度为 0 的节点先入队
  }

  const order: number[] = [];
  while (queue.length) {
    const u = queue.shift()!;                     // 队头出队
    order.push(u);                                // 加入拓扑序
    for (const v of graph[u]) {
      inDegree[v]--;                              // 👈 邻居入度减 1
      if (inDegree[v] === 0) queue.push(v);       // 👈 减到 0 才能入队
    }
  }

  // order.length < numNodes 说明有环
  return order;
}
```

Kahn 算法的时间复杂度是 **O(V + E)**——每个节点入队出队一次、每条边被访问一次。

### 算法二：DFS 后序（完成时间倒序）

还记得第三节 DFS 里那个「完成时间」吗？**DFS 的完成时间倒序，就是拓扑排序**。原理是：

- 一个节点的「完成时间」，一定晚于它所有能到达的节点的完成时间（因为它要等邻居都递归完才标黑）
- 所以**依赖越深（被依赖越多）的节点，完成时间越晚**
- 把节点按完成时间**从晚到早**排列，就得到了「被依赖的在后、依赖方在前」的正确顺序

```typescript
/**
 * DFS 版拓扑排序：收集 DFS 的完成后序，再整体反转
 * @param numNodes 节点总数
 * @param graph 邻接表
 * @returns 拓扑序数组（若存在环，结果不完整）
 */
function topologicalSortDFS(numNodes: number, graph: number[][]): number[] {
  const visited = new Array(numNodes).fill(0);     // 0=白 1=灰 2=黑
  const postOrder: number[] = [];                  // 后序：完成即入栈

  const dfs = (u: number): boolean => {
    if (visited[u] === 1) return false;            // 👈 遇到灰色 → 有环
    if (visited[u] === 2) return true;             // 已探索，跳过
    visited[u] = 1;                                // 标灰
    for (const v of graph[u]) {
      if (!dfs(v)) return false;                   // 子节点有环，直接失败
    }
    visited[u] = 2;                                // 标黑
    postOrder.push(u);                             // 👈 完成时入后序
    return true;
  };

  for (let i = 0; i < numNodes; i++) {
    if (visited[i] === 0 && !dfs(i)) return [];    // 任意起点发现环即失败
  }
  return postOrder.reverse();                      // 👈 后序反转 = 拓扑序
}
```

对比笔记测试里那段「把完成时间倒序排列得到拓扑排序」的代码，是不是完全对应上了？那就是这个算法的教学版写法。

### 两种算法的选择

| 维度 | Kahn（BFS 入度法） | DFS 后序 |
|------|------------------|---------|
| 思路 | 不断摘掉入度为 0 的节点 | 递归到底后回头记录完成序 |
| 数据结构 | 队列 + 入度数组 | 递归栈（或显式栈） |
| 环检测 | 结果数 < 总数即有环 | 遇到灰色节点即有环 |
| 输出 | 天然正序 | 需要反转 |
| 复杂度 | O(V+E) | O(V+E) |
| 适用 | 更容易理解、可增量处理 | 能顺带求出强连通分量等更多信息 |

**面试建议**：优先写 Kahn 算法——代码直观、环检测的判断（结果长度）一目了然，不容易写错。DFS 版在递归深度大时还有栈溢出风险。

> 💬 **面试官**：如何用拓扑排序检测循环依赖？两种算法各有什么特点？
>
> ✅ 标准答案：拓扑排序只对 DAG 成立，**如果图有环，就排不出完整序列**。Kahn 算法用入度法：不断把入度为 0 的节点摘掉，如果最后摘掉的节点数少于总节点数，说明剩下的节点互相依赖成环了。DFS 后序法：递归遍历，完成时间倒序即拓扑序；如果遍历中遇到一条指向**灰色（遍历中）节点**的边，说明有后向边、存在环。两种算法复杂度都是 O(V+E)。
>
> 🎁 加分答案：能补三点——① **为什么 Kahn 判环有效**：环上的节点入度永远降不到 0，所以永远进不了队列，最后统计数量就能发现；② **工程意义**：Webpack/npm/Yarn 就是靠这类算法检测循环依赖，并给出「模块 A 和 B 循环引用」的警告，同时**构建任务的执行顺序本身也是拓扑排序**（被依赖的先构建）；③ **能提到 Kahn 可以「边处理边检测」**（不用等全部跑完），而且如果是并发构建调度（如 Turborepo），入度法天然适合——入度归零的节点可以并行执行。

---

## 五、最短路径 / 最小生成树 / 并查集

遍历和拓扑排序之外，图论还有三大「必知必会」的经典算法家族。这一节每个都讲清思想，并保留完整实现。它们共同的关键词是**加权图（边上带权值）**——比如模块之间的「构建耗时」、两个城市之间的「距离」。

![带权图与最短路径示意（发布前请自行转存素材库）](https://cdn.nlark.com/yuque/0/2022/png/738210/1645514752505-c32fb3fe-0281-4a48-a5ce-3bee4155c14c.png)

### Dijkstra 算法：单源最短路径（贪心）

**Dijkstra 算法是一种计算从单个源到所有其他源的最短路径的贪心算法**，这意味着我们可以用它来计算从图的一个顶点到其余各顶点的最短路径。

核心思想：每次**从未确定的节点里，选一个当前距离最小的节点「确定」下来**，然后用它去松弛（relax）它的邻居——即「通过它到邻居，会不会比已知路径更短」。

`src/data-structures/graph/dijkstra.ts`

```typescript
const INF = Number.MAX_SAFE_INTEGER;

const minDistance = (dist: number[], visited: boolean[]) => {
  let min = INF;
  let minIndex = -1;
  for (let v = 0; v < dist.length; v++) {
    if(visited[v] === false && dist[v] <= min) {  // 👈 找未确定节点中距离最小的
      min = dist[v];
      minIndex = v;
    }
  }
  return minIndex;
}

export const dijkstra = (graph: any[][], src: any) => {
  const dist: number[] = [];
  const visited: boolean[] = [];
  const { length } = graph;
  for (let i = 0; i < length; i++) {
    dist[i] = INF;
    visited[i] = false;
  }
  dist[src] = 0;                                   // 👈 源点到自己是 0
  for (let i = 0; i < length - 1; i++) {
    const u = minDistance(dist, visited);          // 选出当前最近的未确定节点
    visited[u] = true;                             // 👈 确定它
    for (let v = 0; v < length; v++) {
      if(
        !visited[v] &&
        graph[u][v] !== 0 &&
        dist[u] !== INF &&
        dist[u] + graph[u][v] < dist[v]            // 👈 松弛：借道 u 更短就更新
      ) {
        dist[v] = dist[u] + graph[u][v];
      }
    }
  }
  return dist;
}
```

关键的两步：`minDistance` 贪心地选出当前距离最小的未确定节点，然后一趟松弛它的所有邻居。时间复杂度 **O(V²)**（每次选最小是 O(V)，选 V 次）；用**最小堆（优先队列）**优化后可以降到 **O(E log V)**。

`src/data-structures/graph/test/dijkstra.test.ts`

```typescript
import "mocha";
import { expect, assert } from "chai";
import { dijkstra } from "../dijkstra";

describe("最短路径算法(Graph) 测试", function () {
  it("Dijkstra 算法", function () {
    const graph = [
      [0, 2, 4, 0, 0, 0],
      [0, 0, 2, 4, 2, 0],
      [0, 0, 0, 0, 3, 0],
      [0, 0, 0, 0, 0, 2],
      [0, 0, 0, 3, 0, 2],
      [0, 0, 0, 0, 0, 0]
    ];
    const result = dijkstra(graph, 0);
    expect(result).to.be.deep.equal([0, 2, 4, 6, 4, 6]);
  });
});
```

### Floyd-Warshall 算法：多源最短路径（动态规划）

**Floyd-Warshall 算法是一种计算图中所有最短路径的动态规划算法。通过该算法，我们可以找出从所有源到所有顶点的最短路径。**

它的思想极其优雅：**依次允许「经过第 k 个节点」作为中转，不断更新任意两点间的最短距离**。三重循环，每次问一句：「从 `i` 到 `j`，如果借道 `k`，会不会更短？」

`src/data-structures/graph/floydWarshall.ts`

```typescript
export const floydWarshall = (graph: any[][]) => {
  const dist: number[][] = [];
  const { length } = graph;
  for (let i = 0; i < length; i++) {
    dist[i] = [];
    for (let j = 0; j < length; j++) {
      if(i === j) {
        dist[i][j] = 0;
      } else if (!isFinite(graph[i][j])) {
        dist[i][j] = Infinity;
      } else {
        dist[i][j] = graph[i][j];
      }
    }
  }
  for (let k = 0; k < length; k++) { // 0
    for (let i = 0; i < length; i++) { // 1
      for (let j = 0; j < length; j++) { // 0
        // console.log(dist[i][k], dist[k][j], dist[i][j])
        if(dist[i][k] + dist[k][j] < dist[i][j]) {  // 👈 借道 k 更短就更新
          dist[i][j] = dist[i][k] + dist[k][j];
        }
      }
    }
  }
  return dist;
}
```

**最外层循环 `k` 必须放在最外面**——它代表「当前允许使用的中转节点集合」，这是 DP 的分层含义。时间复杂度 **O(V³)**，空间 **O(V²)**。

`src/data-structures/graph/test/floydWarshall.test.ts`

```typescript
import "mocha";
import { expect, assert } from "chai";
import { floydWarshall } from "../floydWarshall";

describe("最短路径算法(Graph) 测试", function () {
  it("Floyd-Warshall 算法", function () {
    const INF = Infinity;
    const graph = [
      [INF, 2, 4, INF, INF, INF],
      [INF, INF, 2, 4, 2, INF],
      [INF, INF, INF, INF, 3, INF],
      [INF, INF, INF, INF, INF, 2],
      [INF, INF, INF, 3, INF, 2],
      [INF, INF, INF, INF, INF, INF]
    ];
    const result = floydWarshall(graph);
    expect(result).to.be.deep.equal([
      [0, 2, 4, 6, 4, 6],
      [INF, 0, 2, 4, 2, 4],
      [INF, INF, 0, 6, 3, 5],
      [INF, INF, INF, 0, INF, 2],
      [INF, INF, INF, 3, 0, 2],
      [INF, INF, INF, INF, INF, 0]
    ]);
  });
});
```

### 最小生成树（MST）：用最小成本连通所有点

![最小生成树示意（发布前请自行转存素材库）](https://cdn.nlark.com/yuque/0/2022/png/738210/1645516853025-7830fae6-37bc-41ab-b6da-8ceafe08f1d7.png)

**最小生成树（Minimum Spanning Tree，MST）**：在**加权无向连通图**中，找一棵包含所有顶点、且**边的权值之和最小**的生成树（n 个点，n-1 条边）。两个贪心经典解法：

**Prim 算法**

**Prim 算法是一种求解加权无向连通图的 MST 问题的贪心算法。它能找出一个边的子集，使得其构成的树包含图中所有顶点，且边的权值之和最小。**

思想：从一个点出发，**每次选一条「连接已选集合与未选集合」的权值最小的边**，把新节点拉进来，直到所有点都在树里——像一棵树「生长」。

`src/data-structures/graph/prim.ts`

```typescript
const INF = Number.MAX_SAFE_INTEGER;

const minKey = (graph: any[][], key: number[], visited: boolean[]) => {
  let min = INF;
  let minIndex = 0;
  for(let v = 0; v < graph.length; v++) {
    if(visited[v] === false && key[v] < min) {   // 👈 找「到已选集合」权值最小的未选点
      min = key[v];
      minIndex = v;
    }
  }
  return minIndex;
}

export const prim = (graph: any[][]) => {
  const parent: number[] = [];
  const key: number[] = [];
  const visited: boolean[] = [];
  const { length } = graph;
  for (let i = 0; i < length; i++) {
    key[i] = INF;
    visited[i] = false;
  }
  key[0] = 0;                                      // 从 0 号点出发
  parent[0] = -1;
  for (let i = 0; i < length; i++) {
    const u = minKey(graph, key, visited);
    visited[u] = true;
    for (let v = 0; v < length; v++) {
      if(graph[u][v] && !visited[v] && graph[u][v] < key[v]) {
        parent[v] = u;                             // 👈 记录 v 的父节点是 u
        key[v] = graph[u][v];                      // 👈 更新 v 到树的最小连接权值
      }
    }
  }
  return parent;
}
```

`src/data-structures/graph/test/prim.test.ts`

```typescript
import "mocha";
import { expect, assert } from "chai";
import { prim } from "../prim";

describe("最小生成树(Graph) 测试", function () {
  it("Prim 算法", function () {
    const INF = Infinity;
    const graph = [
      [0, 2, 4, 0, 0, 0],
      [2, 0, 2, 4, 2, 0],
      [4, 2, 0, 0, 3, 0],
      [0, 4, 0, 0, 3, 2],
      [0, 2, 3, 3, 0, 2],
      [0, 0, 0, 2, 2, 0]
    ];
    const result = prim(graph);
    expect(result).to.be.deep.equal([-1, 0, 1, 5, 1, 4]);
  });
});
```

**Kruskal 算法**

**Kruskal 算法也是一种求加权无向连通图的 MST 的贪心算法。**

思想：把所有边**按权值从小到大排序**，依次尝试加入，**只要这条边不会形成环就保留**（用并查集判断），直到选够 n-1 条边——像一堆点各自成树、逐步合并。

`src/data-structures/graph/kruskal.ts`

```typescript
const INF = Number.MAX_SAFE_INTEGER;
const find = (i: number, parent: number[]) => {
  while (parent[i]) {                              // 👈 一路回溯到根（最简并查集）
    i = parent[i]; // eslint-disable-line prefer-destructuring
  }
  return i;
};
const union = (i: number, j: number, parent: number[]) => {
  if (i !== j) {                                   // 根不同 → 不在同一集合，可合并
    parent[j] = i;
    return true;
  }
  return false;                                    // 根相同 → 会成环，拒绝
};
const initializeCost = (graph: any[][]) => {
  const cost: number[][] = [];
  const { length } = graph;
  for (let i = 0; i < length; i++) {
    cost[i] = [];
    for (let j = 0; j < length; j++) {
      if (graph[i][j] === 0) {
        cost[i][j] = INF;                          // 0 表示无连接，置为 INF
      } else {
        cost[i][j] = graph[i][j];
      }
    }
  }
  return cost;
};
export const kruskal = (graph: any[][]) => {
  const { length } = graph;
  const parent: number[] = [];
  let ne = 0;
  let a: any;
  let b: any;
  let u: any;
  let v: any;
  const cost = initializeCost(graph);
  while (ne < length - 1) {                        // 选够 n-1 条边就停
    for (let i = 0, min = INF; i < length; i++) {
      for (let j = 0; j < length; j++) {
        if (cost[i][j] < min) {                    // 👈 找当前剩下的最小权值边
          min = cost[i][j];
          a = u = i;
          b = v = j;
        }
      }
    }
    u = find(u, parent);
    v = find(v, parent);
    if (union(u, v, parent)) {                     // 不成环才计数
      ne++;
    }
    cost[a][b] = cost[b][a] = INF;                 // 用过就置 INF，避免重复选
  }
  return parent;
};
```

`src/data-structures/graph/test/kruskal.test.ts`

```typescript
import "mocha";
import { expect, assert } from "chai";
import { kruskal } from "../kruskal";

describe("最小生成树(Graph) 测试", function () {
  it("Kruskal 算法", function () {
    const graph = [
      [0, 2, 4, 0, 0, 0],
      [2, 0, 2, 4, 2, 0],
      [4, 2, 0, 0, 3, 0],
      [0, 4, 0, 0, 3, 2],
      [0, 2, 3, 3, 0, 2],
      [0, 0, 0, 2, 2, 0]
    ];
    const result = kruskal(graph);
    expect(result).to.be.deep.equal([ , 0, 1, 1, 1, 3]);
  });
});
```

### 并查集（Union-Find）：处理连通性的利器

Kruskal 里的 `find` / `union` 就是**并查集**的雏形。并查集是一种专门处理「**动态连通性**」问题的数据结构，支持两个操作：

- **find(x)**：找到 x 所在集合的「代表元（根）」
- **union(x, y)**：把 x 和 y 所在的两个集合合并

它判断「两个元素是否属于同一集合」特别快，所以特别适合：判断加一条边会不会成环（Kruskal）、判断图中两个点是否连通（社交网络里的「共同好友」、网络里的「是否可达」）。

朴素版并查集在树退化成链时，`find` 会退化成 O(n)。两个经典优化让它均摊接近 O(1)：

- **路径压缩（Path Compression）**：`find` 时把沿途所有节点直接挂到根上，下次查找一步到位
- **按秩合并（Union by Rank）**：合并时把「矮树」挂到「高树」下，避免树长高

```typescript
class UnionFind {
  parent: number[];
  rank: number[];                                   // 秩：树的高度上界

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i); // 👈 每个元素自成一个集合
    this.rank = new Array(n).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);   // 👈 路径压缩：顺手挂到根上
    }
    return this.parent[x];
  }

  union(x: number, y: number): boolean {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX === rootY) return false;              // 已在同一集合（加边会成环）
    // 👈 按秩合并：矮树挂到高树下
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }
    return true;
  }
}
```

这是 LeetCode 684「冗余连接」的标准解法——遍历每条边，如果两个端点已经在同一集合（`union` 返回 false），这条边就是多余的、加上去就成环。

> 💬 **面试官**：Dijkstra 和 Floyd-Warshall 分别解决什么问题？复杂度各是多少？
>
> ✅ 标准答案：两者都求最短路径，但**Dijkstra 是「单源」**——求一个起点到其余所有点的最短路径，基于贪心，每次选出当前最近的未确定节点并松弛它的邻居，**不能处理负权边**，复杂度朴素实现 O(V²)、堆优化 O(E log V)；**Floyd-Warshall 是「多源」**——一次性求出任意两点间的最短路径，基于动态规划，三重循环（`k` 在最外层表示允许的中转节点），复杂度 **O(V³)**，能处理负权边（但不能有负权环）。
>
> 🎁 加分答案：能补三点——① **选型判据**：只关心一个起点用 Dijkstra，要全源对全源、或图规模小（V 通常几百以内）用 Floyd，`O(V³)` 在 V 大时直接爆炸；② **为什么 Floyd 的 `k` 必须放最外层**：`k` 代表「当前阶段允许使用的中间节点集合」这个 DP 维度，放错层会得到错误结果，这是最容易写错的点；③ **Dijkstra 为什么不能有负权**：它基于「一旦确定就不再更新」的贪心假设，负权边可能让已确定的最短路径被后续更短的路径推翻，此时要用 Bellman-Ford（O(VE)，可处理负权并可检测负环）。

---

## 六、高频题精讲

理论讲完，这一节把 LeetCode 上最高频的图题一次打通。先精讲 3 道贴主线的经典题，再完整保留笔记里已经实现过的 3 道图题。

### 200 岛屿数量：DFS/BFS 标记连通分量

这道题是「图的连通分量」在网格上的经典应用。`'1'` 是陆地、`'0'` 是水，相邻（上下左右）的陆地连成一座岛，求岛的数量。

**思路**：遍历整个网格，每遇到一块没访问过的陆地，就**岛屿计数 +1**，然后从这个格子出发做一次 DFS/BFS，把整座岛连通的所有陆地都「淹没」（标记为 `'0'`），避免重复计数。

```typescript
function numIslands(grid: string[][]): number {
  if (!grid.length) return 0;
  const m = grid.length, n = grid[0].length;
  let count = 0;

  const dfs = (r: number, c: number) => {
    // 越界或遇到水，直接返回
    if (r < 0 || r >= m || c < 0 || c >= n || grid[r][c] !== '1') return;
    grid[r][c] = '0';                          // 👈 标记已访问（淹没）
    dfs(r - 1, c);                             // 👈 向四个方向扩散
    dfs(r + 1, c);
    dfs(r, c - 1);
    dfs(r, c + 1);
  };

  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] === '1') {                // 👈 发现新岛屿
        count++;
        dfs(r, c);                             // 淹没整座岛
      }
    }
  }
  return count;
}
```

**复杂度**：时间 O(m×n)（每个格子最多被访问一次），空间 O(m×n)（最坏递归栈深度）。

### 207 课程表：拓扑排序检测环

这正是本文主线的直接应用——`numCourses` 门课，`prerequisites[i] = [a, b]` 表示修 a 前必须先修 b，判断能否修完所有课。**能修完 ⟺ 依赖图无环**（有环就死锁）。

**思路**：建图 + 统计入度，跑一遍 Kahn 算法，看排出来的节点数是否等于总课程数。

```typescript
function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  const graph: number[][] = Array.from({ length: numCourses }, () => []);
  const inDegree = new Array(numCourses).fill(0);

  for (const [a, b] of prerequisites) {
    graph[b].push(a);                          // 👈 先修 b → a，方向是 b 指向 a
    inDegree[a]++;
  }

  const queue: number[] = [];
  for (let i = 0; i < numCourses; i++) {
    if (inDegree[i] === 0) queue.push(i);      // 无前置依赖的课先入队
  }

  let studied = 0;
  while (queue.length) {
    const u = queue.shift()!;
    studied++;
    for (const v of graph[u]) {
      inDegree[v]--;                           // 👈 学完 u，v 的依赖少一个
      if (inDegree[v] === 0) queue.push(v);
    }
  }

  return studied === numCourses;               // 👈 全部学完 → 无环
}
```

**复杂度**：时间 O(V+E)，空间 O(V+E)。

### 743 网络延迟时间：Dijkstra 单源最短路

`times[i] = [u, v, w]` 表示从 u 到 v 传递信号耗时 w，求从节点 k 发出信号、所有节点都收到所需的最短时间。**本质是求 k 到所有点的最短路径中的最大值**（最慢的那个节点决定了总时间），若有节点不可达则返回 -1。

**思路**：以 k 为源点跑 Dijkstra，用最小堆选当前距离最小的节点。

```typescript
function networkDelayTime(times: number[][], n: number, k: number): number {
  const graph: [number, number][][] = Array.from({ length: n + 1 }, () => []);
  for (const [u, v, w] of times) {
    graph[u].push([v, w]);                     // 👈 邻接表：u → (v, w)
  }

  const dist = new Array(n + 1).fill(Infinity);
  dist[k] = 0;
  const heap: [number, number][] = [[0, k]];   // [距离, 节点]

  while (heap.length) {
    heap.sort((a, b) => a[0] - b[0]);          // 简化版：用排序模拟最小堆
    const [d, u] = heap.shift()!;
    if (d > dist[u]) continue;                 // 👈 过期条目，跳过
    for (const [v, w] of graph[u]) {
      if (d + w < dist[v]) {                   // 👈 松弛
        dist[v] = d + w;
        heap.push([d + w, v]);
      }
    }
  }

  const maxDist = Math.max(...dist.slice(1));  // 忽略下标 0（占位）
  return maxDist === Infinity ? -1 : maxDist;
}
```

**复杂度**：时间 O(E log V)（堆优化），空间 O(V + E)。

### 重温笔记里的三道图题

这三道题是笔记里已经实现过的，同样用「图」的思想解题，完整保留在这里。

**有效数字：把状态机看作一张有向图**

![有效数字的状态流转示意（发布前请自行转存素材库）](https://cdn.nlark.com/yuque/0/2022/png/738210/1641369449724-a27dce89-3498-402d-8963-c107faf10654.png)

**解题思路**：把「解析字符串」的过程建模成**在一张状态图上行走**——每个状态是一个节点，每读入一个字符是一次状态转移（边），最终落在「接受状态」就说明是合法数字。

![有效数字正则表达式的分组结构（发布前请自行转存素材库）](https://cdn.nlark.com/yuque/0/2022/png/738210/1641372984701-128a4687-4d5a-4138-a7f2-7fd107b95e04.png)

**解题步骤**：

- 构建一个表示状态的图
- 遍历字符串沿着图走，如果到了某个节点无路可走就返回 false
- 遍历结束，走到 3/5/6 就返回 true，否则返回 false

`src/data-structures/graph/leet-code.ts`

```typescript
import { createSecretKey } from "crypto";

// todo 有效数字
export function isNumber1(s: string): boolean {
  const regex = /^[+-]?((\d+)|(\d+\.\d*)|(\d*\.\d+))([eE][+-]?\d+)?$/;
  return regex.test(s);
};

export function isNumber(s: string): boolean {
  const graph: any = {
    0: { 'blank':0, 'sign': 1, '.': 2, 'digit': 6 },
    1: { 'digit': 6, '.': 2 },
    2: { 'digit': 3 },
    3: { 'digit': 3, 'e': 4 },
    4: { 'digit': 5, 'sign': 7 },
    5: { 'digit': 5 },
    6: { 'digit': 6, '.': 3, 'e': 4 },
    7: { 'digit': 5 }
  }
  let state = 0;                                    // 👈 从 0 号状态出发
  const blank = /\s/;
  const sign = /\+|-/;
  const dot = /\./;
  const digit = /\d/;
  const e = /e|E/;
  for (let c of s.trim()) {
    if (digit.test(c)) {
      c = 'digit';
    } else if (blank.test(c)) {
      c = 'blank'
    } else if (sign.test(c)) {
      c = 'sign'
    } else if (dot.test(c)) {
      c = '.'
    } else if (e.test(c)) {
      c = 'e'
    }
    state = graph[state][c];                        // 👈 沿边转移状态
    if(state === undefined) {
      return false;                                 // 无路可走 → 非法
    }
  }
  if([3, 5, 6].includes(state)) {                   // 👈 落在接受状态
    return true;
  }
  return false;
};
```

`src/data-structures/graph/test/leet-code.test.ts`

```typescript
import "mocha";
import { expect, assert } from "chai";
import { isNumber, isNumber1 } from "../leet-code";

describe("有效数字(Graph)-图 LeetCode 测试", function () {
  it("有效数字", function () {
    // 输入：s = "0"
    // 输出：true
    const s = '1E9';
    expect(isNumber(s)).to.be.deep.equal(true);
  });
  it("有效数字", function () {
    // 输入：s = "e"
    // 输出：false
    const s = 'e';
    expect(isNumber(s)).to.be.deep.equal(false);
  });
  it("有效数字", function () {
    // 输入：s = "."
    // 输出：false
    const s = '.';
    expect(isNumber(s)).to.be.deep.equal(false);
  });
  it("有效数字", function () {
    // 输入：s = ".1"
    // 输出：true
    const s = '.1';
    expect(isNumber(s)).to.be.deep.equal(true);
  });
  it("有效数字", function () {
    // 输入：s = "1 a"
    // 输出：false
    const s = '1 a';
    expect(isNumber(s)).to.be.deep.equal(false);
  });
});
describe("有效数字(Graph)-正则表达式 LeetCode 测试", function () {
  it("有效数字", function () {
    // 输入：s = "0"
    // 输出：true
    const s = '0';
    expect(isNumber1(s)).to.be.deep.equal(true);
  });
  it("有效数字", function () {
    // 输入：s = "e"
    // 输出：false
    const s = 'e';
    expect(isNumber1(s)).to.be.deep.equal(false);
  });
  it("有效数字", function () {
    // 输入：s = "."
    // 输出：false
    const s = '.';
    expect(isNumber1(s)).to.be.deep.equal(false);
  });
  it("有效数字", function () {
    // 输入：s = ".1"
    // 输出：true
    const s = '.1';
    expect(isNumber1(s)).to.be.deep.equal(true);
  });
  it("有效数字", function () {
    // 输入：s = "1a"
    // 输出：false
    const s = '1a';
    expect(isNumber1(s)).to.be.deep.equal(false);
  });
});
```

**复杂度**：时间复杂度 O(n)，空间复杂度 O(1)。

**太平洋大西洋水流问题：把矩阵当图，从海岸线逆流而上**

**解题思路**：

- 把矩阵想象成图
- 从海岸线逆流而上遍历图，所到之处就是可以流到某个大洋的坐标

**解题步骤**：

- 新建两个矩阵，分别记录能流到两个大洋的坐标
- 从海岸线，多管齐下，同时深度优先遍历图，过程中填充上述矩阵
- 遍历两个矩阵，找到能流到两个大洋的坐标

`src/data-structures/graph/leet-code.ts`

```typescript
// todo 太平洋大西洋水流问题
export function pacificAtlantic(heights: number[][]): number[][] {
  if(!heights || !heights[0]) return []
  const m = heights.length;
  const n = heights[0].length;
  const flow1 = Array.from({length: m}, () => new Array(n).fill(false)); // 太平洋
  const flow2 = Array.from({length: m}, () => new Array(n).fill(false)); // 大西洋
  // console.log(flow1, flow2);
  const dfs = (r: number, c: number, flow: boolean[][]) => {
    flow[r][c] = true;
    [[r-1,c],[r+1,c],[r, c-1],[r, c+1]].forEach(([nr, nc]) => {
      if(
        // 保证在矩阵中
        nr >= 0 && nr < m &&
        nc >= 0 && nc < n &&
        // 节点没有访问过，防止死循环
        !flow[nr][nc] &&
        // 保证逆流而上
        heights[nr][nc] >= heights[r][c]        // 👈 只往「不低于当前」的格子走
      ) {
        dfs(nr, nc, flow);
      }
    })
  }
  // 沿着海岸线逆流而上
  for (let r = 0; r < m; r++) {
    dfs(r, 0, flow1); // 第一列，太平洋
    dfs(r, n - 1, flow2); // 最后一列，大西洋
  }
  for (let c = 0; c < n; c++) {
    dfs(0, c, flow1); // 第一行，，太平洋
    dfs(m - 1, c, flow2); // 最后一行，大西洋
  }

  // 收集能流到两个大洋里的坐标
  const res = []
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if(flow1[r][c] && flow2[r][c]) {
        res.push([r, c]);
      }
    }
  }
  // console.log(res);
  return res;
};
```

这道题的精妙之处在于**「反向思考」**：正向枚举每个格子能不能流到海洋很麻烦，反向从海岸线「逆流而上」做 DFS，一次就能标记出所有能到达某个海洋的格子。

`src/data-structures/graph/test/leet-code.test.ts`

```typescript
import "mocha";
import { expect, assert } from "chai";
import { pacificAtlantic } from "../leet-code";

describe("太平洋大西洋水流问题 LeetCode 测试", function () {
  it("太平洋大西洋水流问题", function () {
    const heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]];
    const res = [[0, 4], [1, 3], [1, 4], [2, 2], [3, 0], [3, 1], [4, 0]];
    expect(pacificAtlantic(heights)).to.be.deep.equal(res);
  });
});
```

**复杂度**：时间复杂度 O(m*n)，空间复杂度 O(m*n)。

**克隆图：DFS/BFS 拷贝所有节点和边**

**解题思路**：

- 拷贝所有节点
- 拷贝所有边

**解题步骤**：

- 深度或广度优先遍历所有节点
- 拷贝所有节点，存储起来
- 将拷贝的节点，按照原图的连接方法进行连接

`src/data-structures/graph/leet-code.ts`

```typescript
// todo 克隆图
/**
 * Definition for Node.
 * class Node {
 *     val: number
 *     neighbors: Node[]
 *     constructor(val?: number, neighbors?: Node[]) {
 *         this.val = (val===undefined ? 0 : val)
 *         this.neighbors = (neighbors===undefined ? [] : neighbors)
 *     }
 * }
 */
class Node {
  val: number
  neighbors: Node[]
  constructor(val?: number, neighbors?: Node[]) {
    this.val = (val===undefined ? 0 : val)
    this.neighbors = (neighbors===undefined ? [] : neighbors)
  }
}
// 深度优先遍历
export function cloneGraph(node: Node | null): Node | null {
	if(!node) return null;
  const visited = new Map();
  const dfs = (n: Node) => {
    // console.log(n.val);
    const nCopy = new Node(n.val);
    visited.set(n, nCopy);                       // 👈 先登记拷贝，再处理邻居（防环）
    n?.neighbors?.forEach(ne => {
      if(!visited.has(ne)) {
        dfs(ne);
      }
      nCopy.neighbors.push(visited.get(ne));     // 👈 连边到拷贝后的邻居
    });
  }
  dfs(node);
  // console.log(visited)
  return visited.get(node);
};
// 广度优先遍历
export function cloneGraph1(node: Node | null): Node | null {
	if(!node) return null;
  const visited = new Map();
  visited.set(node, new Node(node.val));
  const queue = [node]
  while(queue.length) {
    const n: Node = queue.shift() as Node;
    n?.neighbors?.forEach(ne => {
      if(!visited.has(ne)) {
        queue.push(ne);
        visited.set(ne, new Node(ne.val));
      }
      visited.get(n).neighbors.push(visited.get(ne));
    })
  }
  return visited.get(node);
};
```

关键点：**先把当前节点登记进 `visited` 再处理邻居**——因为图有环，如果不提前登记，递归回到自己时会无限循环。`visited` 在这里身兼两职：既是「访问标记」，又是「原节点 → 拷贝节点」的映射表。

`src/data-structures/graph/test/leet-code.test.ts`

```typescript
import "mocha";
import { expect, assert } from "chai";
import { cloneGraph, cloneGraph1 } from "../leet-code";

describe("克隆图 LeetCode 测试", function () {
  const node = {
    val: 1,
    neighbors: [
      { val: 2, neighbors: [
        {val: 1, neighbors: []},
        {val: 3, neighbors: [
          {val: 2, neighbors: []},
          {val: 4, neighbors: []}
        ]}
      ] },
      { val: 4, neighbors: [
        {val: 1, neighbors: []},
        {val: 3, neighbors: []}
      ] }
    ]
  }
  it("克隆图-深度优先遍历", function () {
    // 输入：const node: any = [[2,4],[1,3],[2,4],[1,3]];
    // 输出：const res = [[2,4],[1,3],[2,4],[1,3]];
    expect(cloneGraph(node)).to.be.deep.equal(node);
  });
  it("克隆图-广度优先遍历", function () {
    // 输入：const node: any = [[2,4],[1,3],[2,4],[1,3]];
    // 输出：const res = [[2,4],[1,3],[2,4],[1,3]];
    expect(cloneGraph1(node)).to.be.deep.equal(node);
  });
});
```

**复杂度**：时间复杂度 O(n)，空间复杂度 O(n)。

> 📌 **LeetCode 图论重点题索引**
>
> | 题号 | 题目 | 考点 | 难度 |
> |------|------|------|------|
> | 200 | 岛屿数量 | DFS/BFS 连通分量 | 中等 |
> | 207 | 课程表 | 拓扑排序检测环 | 中等 |
> | 210 | 课程表 II | 拓扑排序输出序列 | 中等 |
> | 743 | 网络延迟时间 | Dijkstra 单源最短路径 | 中等 |
> | 684 | 冗余连接 | 并查集 | 中等 |

---

## 七、前端工程落地

最后，把这一篇的算法和真实前端工程对上号——这才是「学算法有用」的最有力证明。

### Webpack ModuleGraph：邻接表的工业级实现

Webpack 内部有一个 `lib/ModuleGraph.js`，专门维护模块之间的依赖关系。它提供了 `getOutgoingDependencies(module)`（获取某个模块「依赖了谁」，即出边）和 `getIncomingConnections(module)`（获取「谁依赖了这个模块」，即入边）这样的方法——这就是**邻接表在构建工具里的真实形态**。

- `getOutgoingDependencies` 返回的就是**出边集合**，等价于本文第二节里邻接表的 `adjList.get(v)`
- **tree shaking** 就是从这个图里做**可达性分析**：从入口出发能走到的模块才保留
- **循环依赖警告**就是在图上做**环检测**：DFS 遍历时发现后向边（指向灰色节点）就报警告

### npm 安装时的环检测

npm / Yarn 在解析依赖树时，会先建一张包依赖图，然后做**环检测**。如果发现 `A → B → C → A` 这样的环，就会给出 `circular dependency` 警告。正常情况下包依赖应该是 DAG——这解释了为什么「循环依赖」在依赖管理里被视为**异常状态**。

### Monorepo 构建任务的拓扑排序

这个落地特别贴近当下前端工程实践：在 Turborepo、Nx 这类 Monorepo 工具里，**各 package 的构建顺序就是一次拓扑排序**。

```
packages/ui（无依赖）      → 入度为 0，最先构建
packages/shared（无依赖）  → 入度为 0，可与 ui 并行
apps/web（依赖 ui, shared）→ 等两者都构建完，入度归零才构建
```

这正是 Kahn 算法的实际运行：**入度为 0 的任务可以并行执行**，每完成一个就把下游任务的入度减 1，减到 0 的就解锁开始构建。`turbo run build` 底层调度的就是这张依赖 DAG。

### 路由与状态管理里的「图」

- **前端路由**：页面之间的跳转关系构成一张有向图，路由懒加载的预取（prefetch）策略会分析「哪些页面相连」来提前加载
- **状态依赖**：Vue 的响应式依赖收集、React 的 hooks 依赖，本质也是「谁依赖了谁」的图，只是规模小很多

**一句话收口**：图不是课本里的抽象概念，它是**模块依赖、包依赖、构建任务、路由跳转**这些真实前端场景背后的统一数学模型。学会用图思考，你解决问题的「工具箱」就多了一整个维度。

> 💬 **面试官**：你在实际项目里用过图相关的算法吗？
>
> ✅ 标准答案：构建工具里到处都是图——Webpack 的模块依赖图本质是邻接表，tree shaking 是在图上做可达性分析，循环依赖检测是在图上做环检测；Monorepo 工具（Turborepo/Nx）按包依赖 DAG 做拓扑排序来决定构建顺序。即便你不直接写这些算法，理解它们能帮你**定位**循环依赖、**读懂**构建工具的行为、**排查**初始化时序问题。
>
> 🎁 加分答案：能举一个自己排查过的真实案例——比如遇到过两个模块循环 `import` 导致其中一个模块导出值为 `undefined` 的偶发 bug，当时不知道是循环依赖，后来从构建警告里发现，通过把公共逻辑抽成第三个模块打破环来解决。**能讲出「环 → 抽取公共依赖打破环」这个解法，说明你不仅懂检测、还懂修复。**

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 考察频率 |
|--------|-----------|---------|
| 邻接表 vs 邻接矩阵 | 稀疏图用邻接表 O(V+E)，稠密图用矩阵 O(V²)，前端几乎只用邻接表 | ⭐⭐⭐ 必考 |
| DFS | 递归/栈，一条道走到黑；白灰黑三色标记；能检测环 | ⭐⭐⭐ 必考 |
| BFS | 队列，层层扩散；求无权图最短路径（第一次到达即最短） | ⭐⭐⭐ 必考 |
| 拓扑排序 | 对 DAG 排序使边都「前 → 后」；Kahn 入度法 / DFS 后序；排不完即有环 | ⭐⭐⭐ 必考 |
| 循环依赖检测 | 建图 + 环检测（后向边 / 拓扑排序失败），Webpack/npm 的实际做法 | ⭐⭐⭐ 必考 |
| Dijkstra | 贪心，单源最短路径，O(V²) 或堆优化 O(E log V)，不能有负权 | ⭐⭐ 高频 |
| Floyd-Warshall | DP，多源最短路径，O(V³)，`k` 必须放最外层 | ⭐⭐ 高频 |
| 最小生成树 | Prim（点生长）/ Kruskal（边排序 + 并查集），都是贪心 | ⭐ 中频 |
| 并查集 | 动态连通性，路径压缩 + 按秩合并均摊近 O(1) | ⭐⭐ 高频 |

> 💡 记住这条主线：**图 = 节点 + 边，能把任何「关系」变成可计算的结构**。前端里最典型的图就是 Webpack 模块依赖图；在图上做**遍历**（DFS/BFS）能求连通性和最短路径，做**拓扑排序**能检测循环依赖，做**最短路径**能求最优解。下次面试被问到「循环依赖怎么检测」，从「建图 → 拓扑排序 → 有环则排不完」这条链路答下来，就已经甩开大多数候选人了。

---

## 📝 留个问题

除了 Webpack 模块依赖图，前端还有哪些场景本质上是「图」？提示：想想**前端路由的嵌套与跳转关系**、**社交产品的关注/好友关系**、**药品配伍禁忌关系**、**Monorepo 里各 package 的依赖拓扑**——它们分别是有向图还是无向图？需要用到 DFS/BFS/拓扑排序/并查集中的哪一个？

欢迎在评论区写出你的答案 👇

---

## 参考资料

- https://github.com/webpack/webpack/blob/main/lib/ModuleGraph.js （Webpack 模块依赖图的实现，邻接表的工业级落地）
- https://nodejs.org/api/ （Node.js 官方文档，npm 依赖解析与循环依赖处理）
- https://leetcode.cn/ （LeetCode 图论高频题库）
- 《算法》（Sedgewick / Wayne，第 4 版，图论章节）
- 《算法导论》（CLRS，第 3 版，图的基本算法：DFS/BFS、拓扑排序、最短路径、最小生成树）
- 《数据结构与算法分析》（Weiss）

> 推荐搜索关键词：「Webpack 模块依赖图 ModuleGraph 源码」「拓扑排序 Kahn 算法 入度」「DFS 三色标记 后向边 环检测」「Dijkstra 堆优化 优先队列」「并查集 路径压缩 按秩合并」「Turborepo 依赖拓扑 任务调度」。

---

> 🔖 这是「前端数据结构与算法」系列第 9 篇。上一篇：《堆：优先队列/Top-K/数据流中位数手写最小堆》；下一篇预告：《排序：V8 TimSort 源码解析/快排/归并/稳定性全解》
