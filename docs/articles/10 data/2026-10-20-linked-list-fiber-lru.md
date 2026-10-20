# 链表：React Fiber 链表结构与 LRU Cache 手写实现（面试收藏级）

> **副标题**：指针操作的心智模型、哑节点技巧，以及链表在工程中的真实形态

> 面试官微笑着说：「手写一个 LRU 缓存吧，要求 get 和 put 都是 O(1)。」你心里暗喜——这题见过，`Map` 一存不就完了？可真写下去才发现：`Map` 能保证 O(1) 查找，但「最近最少使用」这个**淘汰顺序**怎么维护？你卡住了。面试官补了一句：「提示一下，得配一个双链表。」你更懵了：链表不是又慢又难写吗，为什么要用在这里？——这篇文章，就是把「链表」这个东西从一个「课本概念」，讲到你能在面试里脱口而出、在项目里随手就用。

---

## 🎯 这篇文章解决什么问题

这是「**前端数据结构与算法**」系列的第 **5 篇**，主题是**链表**。

第 1 篇导读里，我抛下了第一个伏笔——「React Fiber 是链表」。第 3 篇讲栈（调用栈、单调栈）、第 4 篇讲队列（事件循环、BFS）之后，终于轮到链表了。它是**跟前端关系最深的两个结构之一**（另一个是树），也是很多 5-10 年经验开发者「会写、但讲不清」的典型结构。

这一篇，只做四件事：

- **讲透本质**：链表到底是什么、和数组的本质差异在哪里，为什么「指针操作」这件事值得单开一篇
- **补全实现**：单链表、双链表、循环链表、有序链表、链表实现的栈——五种形态用 TypeScript 全部手写一遍
- **吃透技巧**：**哑节点**和**快慢指针**两个「一招打天下」的核心套路，讲清它们的本质
- **打穿高频题**：9 道 LeetCode 从易到难，每道都按「思路 → 步骤 → 完整代码 → 复杂度」讲，其中 **LRU Cache（146）是设计题天花板**

全篇围绕一条主线：**先看链表在前端工程里长什么样（Fiber）→ 再讲清它是什么 → 手写四种形态 → 掌握两个核心技巧 → 刷穿高频题 → 落地到前端真实场景（LRU、原型链）**。读完这一篇，链表这一关，你就彻底过了。

---

## 一、场景切入：React Fiber 为什么用链表

先回答第 1 篇留下的问题：**React 为什么要把组件树改造成链表？**

React 16 之前，组件树是一棵真正的**树**——父组件递归渲染子组件，一层层调下去。这种「递归树」的死穴是：**一旦开始渲染，就必须一口气渲染完整棵树，中间停不下来**。一棵复杂组件树渲染 100ms，主线程就被锁死 100ms，用户点按钮都没反应——这就是掉帧。

React 16 引入 Fiber 架构，核心改动是把组件树重新编码了一下。每个组件对应一个 **FiberNode**，节点上有三个指针：

```
┌─────────────────────────────────────────────────┐
│                FiberNode 的三个指针               │
│                                                   │
│   parent ──────► child ──────► child              │
│     │              │             │                │
│     │  return      │ return      │ return         │
│     │              │             │                │
│     └── sibling ──►│── sibling ──►│                │
│                    │             │                │
│  child  ：指向第一个子节点（往下钻）               │
│  sibling：指向下一个兄弟节点（横向走）             │
│  return ：指向父节点（回溯用）                     │
└─────────────────────────────────────────────────┘
```

- `child`：指向**第一个子节点**——往下钻
- `sibling`：指向**下一个兄弟节点**——横向走
- `return`：指向**父节点**——回溯用

**这本质上就是把一棵树「拍平」成了一条可以前后游走的链**。三个指针一组合，整棵组件树就变成了一张可以任意走、随时停、随时接着走的链表结构。

### 为什么不用递归树：一句话说透

**递归树依赖的是「函数调用栈」，链表依赖的是「堆上的节点 + 自己的循环」。**

普通递归每进入一个子组件就压一层栈帧，而**调用栈是 JS 引擎托管的，业务代码根本拿不到、存不下来**。一旦进入 `render()` 递归，栈就一直往上压，不弹完所有栈帧你回不到事件循环——所以「渲染到一半暂停」在递归模型下**物理上不可能**。

链表就不同了：遍历到哪了（当前 FiberNode 是谁）保存在**堆上的对象里**，由 React 自己的 `while` 循环驱动，而不是由调用栈驱动。于是 React 可以在任意两个节点之间插一句 `if (shouldYield()) break;`——时间片用完就中断循环、把主线程让出去，下一帧从上次那个 FiberNode 接着走。

这就是**时间分片（Time Slicing）**的基础，也是 Fiber 架构的灵魂：**把遍历的控制权，从引擎的调用栈，夺回到用户态的手动循环里**。

> 💬 **面试官**：React Fiber 为什么用链表，而不是普通的树？
>
> ✅ 标准答案：Fiber 通过 `child`、`sibling`、`return` 三个指针，把组件树改造成「树 + 链表」的混合结构。链表的核心价值是**可以在任意节点暂停遍历、记住当前位置、之后恢复**——这是 React 时间分片（Time Slicing）的基础。普通递归树依赖调用栈，一旦开始渲染就必须一口气走完，无法中途暂停让出主线程，长任务会阻塞用户交互导致掉帧。
>
> 🎁 加分答案：能点出**「可中断」是 Fiber 架构的灵魂**——时间分片、Concurrent Mode 的优先级调度，都建立在这个「能暂停恢复」的链表结构之上。再深一层可以讲**为什么递归树做不到**：递归依赖引擎托管的函数调用栈，业务代码拿不到栈帧；而 Fiber 把遍历状态存在堆上的节点对象里、用 `while` 循环手动驱动，所以能 `shouldYield()` 判断时间片、随时 `break`。还可以补一句：`return` 指针额外承担了「出错时沿链回溯组件栈」的能力，React ErrorBoundary 抓错误时就是沿 `fiber.return` 链一层层找到父组件边界。

---

## 二、链表是什么

看完 Fiber，你已经有了直觉：**链表就是一种「靠指针把散落的节点串起来」的结构**。现在把定义讲清楚。

### 定义：元素存储不连续，用 next 指针连在一起

- **链表（LinkedList）**：由**多个元素组成的列表**
- 元素**存储不连续**（内存里东一块西一块），靠 `next` 指针一个指一个地串起来
- **JavaScript 中没有链表这个数据结构**，但它可以用 `Object` 模拟

![链表的物理结构：HEAD 指针 → NODE(DATA|NEXT) → ... → NODE(DATA|NULL)，TAIL 指针指向最后一个节点（发布前请自行转存素材库）](https://cdn.nlark.com/yuque/0/2022/png/738210/1641135576291-b4763dd9-223e-43d6-b21c-efcc977859f1.png)

上图就是链表的真实形态：每个节点里有**数据（DATA）**和**指向下一个节点的指针（NEXT）**，最后一个节点的 `NEXT` 是 `NULL`，表示链到此为止。整条链由一个 `HEAD` 指针（指向第一个节点）和一个 `TAIL` 指针（指向最后一个节点）把持。

用 JS 模拟一个节点，就那么几行：

```javascript
// JS 里没有原生链表，用最简单的 Object 模拟一个节点
const node = {
  value: 1,
  next: {          // 👈 下一个节点，就是把这个对象整个塞进去
    value: 2,
    next: null     // 👈 到尾巴了
  }
}
```

### 数组 VS 链表：选型的主战场

这是链表这一篇**最核心的一个对比**，也是面试最爱考「什么时候用数组、什么时候用链表」的原因所在：

| 操作 | 数组 | 链表 |
|------|------|------|
| 随机访问第 i 个元素 | **O(1)**（下标直接算地址） | O(n)（得从头一个个走） |
| 头部/中间插入、删除 | O(n)（后面元素全部搬移） | **O(1)**（只改前后两个 next 指向） |
| 尾部追加 | O(1) 摊还 | O(1)（有 tail 指针时）/ O(n)（只有 head 时） |
| 内存占用 | 连续、紧凑 | 每个节点多存一个/两个指针、更占内存 |

一句话抓住要害：

- **数组**：增删非首尾元素时，往往需要**移动元素**——删掉第 2 个，后面所有元素都得往前挪一位
- **链表**：增删非首尾元素，**不需要移动任何元素**，只需要**更改 next 的指向**即可

```
数组删除中间元素 [A, B, C, D] → 删 B → [A, C, D]
  实际发生：C 搬到 B 的位置，D 搬到 C 的位置  ← 搬移了 n-1 个元素

链表删除中间元素 A → B → C → D → 删 B
  实际发生：A.next = C                         ← 只改了 1 个指针
```

所以选型口诀是：**「读多用数组，改多用链表」**——数组擅长随机访问，链表擅长频繁增删。

> 💬 **面试官**：什么时候该用链表，而不是数组？
>
> ✅ 标准答案：看操作的分布。如果主要是**按下标随机访问**，用数组（O(1)）；如果是**频繁在头部或中间插入/删除**，用链表（O(1) 改指针，而数组要 O(n) 搬移）。典型场景：LRU 缓存、撤销栈、浏览器历史记录，都是「频繁增删 + 不关心随机访问」，天然适合链表。
>
> 🎁 加分答案：能补两点——① **链表牺牲了缓存局部性**：数组元素在内存里连续，CPU 预取友好，实际遍历往往比理论更快；链表节点散落各处，指针跳转容易触发缓存未命中，所以「链表插入快」在真实数据量下不一定赢。② 前端里数组还有个隐形优势：`Array.prototype` 提供了 `map`/`filter`/`sort` 一大堆开箱即用的方法，而链表所有操作都得自己写——所以工程里**除非插入删除极其频繁，否则默认还是用数组**，这也是为什么 React 内部才需要手写链表。

---

## 三、链表类型：单、双、循环、有序

链表不是一个结构，而是**一族结构**。按指针的连接方式，常用的有四种形态，外加一个「用链表实现的栈」作为收尾。下面逐个手写，代码全部用 TypeScript。

### 单链表：只有 next，删除需要找前驱

最基础的形态，每个节点只有一个 `next` 指针。它的软肋是：**要删除某个节点，必须先找到它的前驱节点**（因为删除靠的是 `前驱.next = 当前.next`），而找前驱得从头遍历——**删除是 O(n)**（除非你已经持有前驱引用）。

先准备两个基础工具：

`src/data-structures/util/index.ts`

```typescript
export const defaultEquals = (a: any, b: any) => {
  return a === b
}
```

`src/data-structures/models/linked-list-models.ts`

```typescript
export class Node {
  public next: any;
  constructor(public element: any) {
    this.next = undefined;
  }
}
```

核心的 `LinkedList` 类：

`src/data-structures/linked-list/linkedList.ts`

```typescript
import { defaultEquals } from '../../util';
import { Node } from '../../models/linked-list-models';

export default class LinkedList {
  protected head: any;
  protected count: number;
  constructor(protected equalsFn = defaultEquals) {
    this.count = 0;
    this.head = undefined;
  }
  push(element: any) {
    const node = new Node(element);
    let current: Node;
    if(this.head == null) { // 链表为空的情况
      this.head = node;
    } else {
      current = this.head;
      while(current.next) { // 遍历获取最后一项
        current = current.next;
      }
      current.next = node; // 将其next赋为新元素，建立链接
    }
    this.count++;
  }
  insert(element: any, position: number) {
    // 检查越界值
    if(position > 0 && position <= this.count + 1) {
      const node = new Node(element);
      // 插入的是第一项的情况
      if(position === 1) {
        const current = this.head;
        node.next = current;
        this.head = node;
      } else {
        const previous: any = this.getElementAt(position - 1);
        const current = previous?.next;
        node.next = current;
        previous.next = node;
      }
      this.count++;
      return true;
    }
    return false;
  }
  getElementAt(index: number) {
    // 检查越界值
    if(index > 0 && index <= this.count) {
      let current: Node = this.head;
      for (let i = 1; i < index && current; i++) {
        current = current.next;
      }
      return current;
    }
    return undefined;
  }
  remove(element: any) {
    const index = this.indexOf(element);
    return this.removeAt(index);
  }
  indexOf(element: any) {
    let current: Node = this.head;
    for (let i = 1; i <= this.count && current; i++){
      if(this.equalsFn(element, current.element)) {
        return i;
      }
      current = current.next;
    }
    return -1;
  }
  removeAt(position: number) {
    // 检查越界值
    if(position > 0 && position <= this.count) {
      let current: Node = this.head;
      // 移除的是第一项的情况
      if(position === 1) {
        this.head = current.next;
      } else {
        const previous: any = this.getElementAt(position - 1);
        current = previous?.next;
        previous.next = current.next;
      }
      this.count--;
      return current.element;
    }
    return undefined;
  }
  isEmpty() {
    return this.count === 0;
  }
  size() {
    return this.count;
  }
  getHead() {
    return this.head;
  }
  clear() {
    this.head = undefined;
    this.count = 0;
  }
  toString() {
    if(this.head == null) return '';
    let res = `${this.head.element}`;
    let current:Node = this.head.next;
    while(current) {
      res += `, ${current.element}`
      current = current.next;
    }
    return res;
  }
}
```

这一版代码里大量出现 `any`，是为了先把**结构本身**讲清楚。真实项目里，链表几乎总是应该用**泛型**来保证类型安全——把 `Node` 和 `LinkedList` 都改成 `LinkedList<T>` / `Node<T>`，`push` 就只收 `T`、`toString()` 出来的就是 `T`，越界错误在编译期就被拦住了。这也是本项目 CLAUDE.md 里「禁止 any」那条规范的原因：**链表是泛型最经典的练习场**。

测试覆盖面（用 mocha + chai）：依次验证了 `push`（追加 4 个元素后 `size` 为 4）、`getElementAt`（第 3 个节点元素为 3）、`removeAt`（移除第 1 项返回 1）、`insert`（头部与中间插入后 `size` 为 5）、`indexOf`、`remove`、`getHead`、`isEmpty`，以及 `toString`（最终输出 `'1, 2, 3, 4'`）。

### 双链表：prev/next 双向，删除 O(1)

双链表的每个节点多一个 `prev` 指针，指向**前一个节点**。多出来的这根指针，换来一个决定性优势：**只要拿到要删除的节点本身，就能 O(1) 把它摘掉**——因为 `prev` 让你不用再从头找前驱。

先扩展节点模型：

`src/data-structures/models/linked-list-models.ts`

```typescript
export class Node {
  public next: any;
  constructor(public element: any) {
    this.next = undefined;
  }
}

export class DoublyNode extends Node {
  public prev: any;
  constructor(public element: any) {
    super(element);
    this.prev = undefined;
  }
}
```

`src/data-structures/linked-list/doublyLinkedList.ts`

```typescript
import { defaultEquals } from '../../util';
import { DoublyNode } from '../../models/linked-list-models';
import LinkedList from './linkedList';

export default class DoublyLinkedList extends LinkedList{
  protected tail: any;
  constructor(equalsFn = defaultEquals) {
    super(equalsFn);
    this.tail = undefined;
  }
  push(element: any) {
    const node = new DoublyNode(element);
    let current: DoublyNode;
    if(this.head == null) { // 链表为空的情况
      this.head = node;
      this.tail = node;
    } else {
      current = this.tail;
      current.next = node; // 将其next赋为新元素，建立链接
      node.prev = current;
      this.tail = node;
    }
    this.count++;
  }
  insert(element: any, position: number) {
    // 检查越界值
    if(position > 0 && position <= this.count) {
      const node = new DoublyNode(element);
      // 插入的是第一项的情况
      if(position === 1) {
        if(this.head == null) {
          this.head = node;
          this.tail = node;
        } else {
          const current: DoublyNode = this.head;
          node.next = current;
          current.prev = node;
          this.head = node;
        }
      } else if(position === this.size()) { // 插入的是最后一项的情况
        // this.push(element);
        const current = this.tail;
        current.next = node;
        node.prev = current;
        this.tail = node;
      } else {
        const previous: any = this.getElementAt(position - 1);
        const current: DoublyNode = previous?.next;
        node.next = current;
        previous.next = node;
        node.prev = previous;
        current.prev = node;
      }
      this.count++;
      return true;
    }
    return false;
  }
  removeAt(position: number) {
    // 检查越界值
    if(position > 0 && position <= this.count) {
      let current: DoublyNode = this.head;
      // 移除的是第一项的情况
      if(position === 1) {
        this.head = current.next;
        if(this.size() === 1) { // 如果只有一项，更新tail
          this.tail = undefined;
        } else {
          this.head.prev = undefined;
        }
      } else if(position === this.size()) { // 移除的是最后一项的情况
        current = this.tail;
        this.tail = current.prev;
        this.tail.next = undefined;
      } else {
        const previous: any = this.getElementAt(position - 1);
        current = previous?.next;
        previous.next = current.next;
        current.next.prev = previous;
      }
      this.count--;
      return current.element;
    }
    return undefined;
  }
  getTail() {
    return this.tail;
  }
  clear() {
    super.clear();
    this.tail = undefined;
  }
  inverseToString() {
    if (this.tail == null) {
      return '';
    }
    let objString = `${this.tail.element}`;
    let previous = this.tail.prev;
    while (previous != null) {
      objString = `${objString},${previous.element}`;
      previous = previous.prev;
    }
    return objString;
  }
}
```

注意双链表多出来一个 `tail` 指针（指向尾节点），所以 `push` 不用再从头遍历到尾，直接 `tail.next = node` 即可——**尾部追加从 O(n) 变成了 O(1)**。测试与单链表基本一致，额外验证了「移除首项 + 移除尾项」的边界（`removeAt` 首尾各删一次后仍有 4 项），以及 `inverseToString`（从尾向头输出）。

### 循环链表：tail.next 指回头部

循环链表的特征是：**最后一个节点的 `next` 不再指向 `null`，而是指回 `head`**。它具有双链表的优势（可以从任意节点出发一直转圈），特别适合**轮转、环形调度**这类场景（比如轮流播放、轮询任务）。

`src/data-structures/linked-list/circularLinkedList.ts`

```typescript
import LinkedList from './linkedList';
import { defaultEquals } from '../../util';
import { Node } from '../../models/linked-list-models';

export default class CircularLinkedList extends LinkedList {
  constructor(equalsFn = defaultEquals) {
    super(equalsFn);
  }
  push(element: any): void {
    const node = new Node(element);
    let current: Node;
    if(this.head == null) { // 链表为空的情况
      this.head = node;
    } else {
      current = this.head;
      while(current.next) { // 遍历获取最后一项
        current = current.next;
      }
      current.next = node; // 将其next赋为新元素，建立链接
    }
    node.next = this.head; // 将新元素的next赋为链表头，建立链接
    this.count++;
  }
  insert(element: any, position: number): boolean {
    // 检查越界值
    if(position > 0 && position <= this.size() + 1) {
      const node = new Node(element);
      let current = this.head;
      // 插入的是第一项的情况
      if(position === 1) {
        if(this.head == null) {
          this.head = node;
          node.next = this.head;
        } else {
          node.next = current;
          current = this.getElementAt(this.size());
          this.head = node;
          current.next = this.head;
        }
      } else {
        const previous: any = this.getElementAt(position - 1);
        const current = previous?.next;
        node.next = current;
        previous.next = node;
      }
      this.count++;
      return true;
    }
    return false;
  }
  removeAt(position: number) {
    // 检查越界值
    if(position > 0 && position <= this.size()) {
      let current = this.head;
      // 移除的是第一项的情况
      if(position === 1) {
        if(this.size() === 1) {
          this.head = undefined;
        } else {
          const removed = this.head;
          const tail: any = this.getElementAt(this.size());
          this.head = this.head.next;
          tail.next = this.head;
          current = removed;
        }
      } else {
        const previous: any = this.getElementAt(position - 1);
        current = previous?.next;
        previous.next = current.next;
      }
      this.count--;
      return current.element;
    }
  }
  toString() {
    if(this.head == null) return '';
    let res = `${this.head.element}`;
    let current:Node = this.head.next;
    let count = 1;
    while(current && count < this.size()) {
      res += `, ${current.element}`
      current = current.next;
      count++;
    }
    return res;
  }
}
```

⚠️ 循环链表最容易踩的坑在 `toString()`：因为链是闭合的，如果用「`current` 为空就停」的普通遍历条件，会**永远转下去死循环**。所以这里必须额外用一个 `count < this.size()` 来兜底——**遍历循环链表时，「何时停」永远要靠计数，而不是靠指针为空**。

测试从 `push(2)` 起步，依次验证 `insert`（分别在头部、尾部插入，最终 4 项）、`getElementAt`、`removeAt`、`indexOf`、`remove`，最终 `size` 为 2、`toString()` 为 `'2, 3'`。

### 有序链表：插入时按序找位置

有序链表在**插入**时就把元素放到正确的位置上，从而始终保持整体有序。它复用了 `insert`，只是把「插入位置」交给一个比较函数去算。

先补充比较工具：

`src/data-structures/util/index.ts`

```typescript
export const defaultEquals = (a: any, b: any) => {
  return a === b
}

export enum Compare {
  LESS_THAN = -1,
  BIGGER_THAN = 1,
  EQUAL = 0
}

export const defaultCompare = (a: any, b: any) => {
  if(a === b) {
    return Compare.EQUAL;
  }
  return a < b ? Compare.LESS_THAN : Compare.BIGGER_THAN;
}
```

`src/data-structures/linked-list/sortedLinkedList.ts`

```typescript
import { defaultCompare, defaultEquals, Compare } from '../../util';
import { Node } from '../../models/linked-list-models';
import LinkedList from './linkedList';

export default class SortedLinkedList extends LinkedList{
  constructor(protected equalsFn = defaultEquals, protected compareFn = defaultCompare) {
    super(equalsFn);
  }
  push(element: any) {
    if (this.isEmpty()) {
      super.push(element);
    } else {
      const index = this.getIndexNextSortedElement(element);
      super.insert(element, index);
    }
  }
  insert(element: any, position: number = 1): boolean {
    if(this.isEmpty()) {
      return super.insert(element, position === 1 ? position : 1);
    }
    const index = this.getIndexNextSortedElement(element);
    return super.insert(element, index);
  }
  getIndexNextSortedElement(element: any) {
    let current: Node = this.head;
    let i = 1
    for(; i <= this.size() && current; i++) {
      const comp = this.compareFn(element, current.element);
      if(comp === Compare.LESS_THAN) {
        return i;
      }
      current = current.next;
    }
    return i;
  }
}
```

`getIndexNextSortedElement` 就是「帮我找到第一个比新元素大的位置」——找到就插在它前面。测试验证了乱序 `push(2)`、`push(1)` 后元素自动排好，`insert` 后 `size` 为 4、`getElementAt(2)` 为 2、`toString()` 最终为 `'2, 11'`。

### StackLinkedList：用链表实现的栈

最后收个尾，把第 3 篇的**栈**用链表重新实现一遍——这是「同一个 ADT、换一种存储结构」的绝佳例证（第 1 篇讲过的 ADT 思想在这里落地了）：

`src/data-structures/linked-list/stackLinkedList.ts`

```typescript
import DoublyLinkedList from './doublyLinkedList';

export default class StackLinkedList {
  protected stack: DoublyLinkedList;
  constructor() {
    this.stack = new DoublyLinkedList();
  }
  push(element: any) {
    this.stack.push(element);
  }
  pop() {
    if(this.stack.isEmpty()) {
      return undefined;
    }
    return this.stack.removeAt(this.size());
  }
  peek() {
    if(this.isEmpty()) {
      return undefined;
    }
    return this.stack.getElementAt(this.size())?.element;
  }
  isEmpty() {
    return this.stack.isEmpty();
  }
  clear() {
    this.stack.clear();
  }
  size() {
    return this.stack.size();
  }
  toString() {
    return this.stack.toString();
  }
}
```

内部直接持有双链表，`push` 就是往尾插、`pop` 就是从尾摘——**因为双链表有 `tail` 指针，「出栈」是 O(1)**。测试验证 `push` 4 个后 `size` 为 4、`pop` 弹出 4、`peek` 看到 3、`clear` 后归零。

### 四种链表，一张表看清

| 类型 | 指针 | 关键特点 | 典型场景 |
|------|------|---------|---------|
| 单链表 | `next` | 删除需找前驱 O(n)；结构最省内存 | 简单队列、链式栈 |
| 双链表 | `prev` + `next` | 拿到节点即可 O(1) 摘除；可双向遍历 | **LRU 缓存**、浏览器前进后退 |
| 循环链表 | `next`（尾指回头） | 可无限轮转；遍历需计数防死循环 | 轮询调度、轮流播放 |
| 有序链表 | `next` + 比较函数 | 插入即有序；查找可提前终止 | 有序数据、优先队列雏形 |

---

## 四、核心技巧：哑节点 + 快慢指针

链表题之所以让人头疼，是因为它没有数组那种 `arr[i]` 的「随机访问」，所有操作都得小心翼翼地挪指针。但好消息是：**80% 的链表题，都逃不出两个套路**——哑节点和快慢指针。这两个技巧吃透，你面对链表题就不会再"手抖"。

### 哑节点（Dummy Node）：统一边界，消灭 if

**问题**：链表题最烦的就是**头节点特殊**——头节点没有前驱，删除它、在它前面插入、返回新头，都得单独写一段 `if`。这种「边界处理」既啰嗦又容易出错。

**解法**：在 `head` 前面**再插一个哨兵节点（dummy）**，让它成为「新的头」。这样一来，**原来的头节点也变成了「有前驱的普通节点」**，所有边界情况就统一了。

```typescript
// 哑节点：在 head 前面垫一个假节点
const dummy = new ListNode(0);
dummy.next = head;

// ... 一堆操作（原 head 也成了普通节点，边界统一了）...

return dummy.next;   // 👈 最后返回 dummy.next，就是真正的新头
```

以「删除链表中等于某值的所有节点」为例，感受一下差别：

```typescript
// ❌ 不用哑节点：要单独处理「头节点被删」的情况
while (head && head.val === target) head = head.next;
let cur = head;
while (cur && cur.next) {
  if (cur.next.val === target) cur.next = cur.next.next;
  else cur = cur.next;
}
return head;

// ✅ 用哑节点：所有节点一视同仁，没有特殊情况
const dummy = new ListNode(0, head);
let cur = dummy;
while (cur.next) {
  if (cur.next.val === target) cur.next = cur.next.next;
  else cur = cur.next;
}
return dummy.next;
```

**哑节点的本质**是：**用一个「不存在的第 0 个节点」，把「第一个节点」也变成「中间节点」，从而让「头节点」这个特例消失。** 它不解决算法问题，它解决的是**代码的整洁性和正确性**——少写分支，就少一个出错的地方。

你会在本篇的 **21 合并链表、2 两数相加、25 K 组翻转、146 LRU** 里反复看到它，这也是为什么说它能覆盖 80% 的链表题。

### 快慢指针：一快一慢，解决三类问题

**快慢指针**：用两个指针同时从头出发，**慢指针每次走 1 步，快指针每次走 2 步**。就这么简单的一个设定，能解决三类经典问题：

- **判断有没有环**（141/142）：快指针会追上慢指针。想想**圆形操场跑步**——快的人跑得再快，也一定会在同一跑道上「套圈」追上慢的人
- **找链表中点**（如 234 回文链表）：快指针到终点时，慢指针刚好在中间
- **找倒数第 k 个节点**（如 19 删除倒数第 N 个）：快指针先走 k 步，再一起走，快指针到尾时慢指针正好差 k 步

**为什么快指针一定能追上慢指针（不会「跳过去」）？** 这是面试官最爱追问的点。答案在于**相对速度**：快指针每秒比慢指针多走 1 步（2 - 1 = 1）。既然两者都在环里，快指针相对慢指针**每次只追近 1 个身位**——当距离从 d 逐步减到 d-1、d-2……最终必然**恰好减到 0**，也就是相遇。**距离每次只缩短 1，不可能从 1 直接跳到 -1（越过）**，这就是它一定追得上的根本原因。

```typescript
// 快慢指针模板：判断链表是否有环
let slow = head;
let fast = head;
while (fast && fast.next) {         // 👈 注意要判 fast.next，因为 fast 一次跳两步
  slow = slow.next;                 // 慢指针走 1 步
  fast = fast.next.next;            // 快指针走 2 步
  if (slow === fast) return true;   // 相遇即有环
}
return false;                        // 快指针走到头，无环
```

> 💬 **面试官**：哑节点技巧的本质是什么？为什么说它能解决大部分链表题？
>
> ✅ 标准答案：哑节点的本质是**用一个虚拟的第 0 个节点，把「头节点」这个特例也变成「普通中间节点」**，从而消除所有针对头节点的边界判断（如「删除的是头节点怎么办」「要不要更新 head 引用」）。它不改变算法复杂度，但显著简化代码、减少出错。合并链表、删除节点、K 组翻转、LRU 等需要"修改头"的题，用哑节点都能大幅简化。
>
> 🎁 加分答案：能点出两个细节——① 哑节点最后一定要 `return dummy.next`（真正的头），**不要 `return dummy`**，否则会多返回一个哨兵节点；② 哑节点和**快慢指针**是一对黄金搭档：找倒数第 k 个节点时，快指针先走 k 步需要判越界，加个哑节点能让边界也统一处理。
>
> 💬 **面试官**：快慢指针检测环的原理是什么？Floyd 判圈算法为什么有效？
>
> ✅ 标准答案：慢指针每次走 1 步、快指针每次走 2 步。如果链表有环，两个指针都会进入环，快指针相对慢指针的速度差是 1 步/次，**每次逼近 1 个身位，必然在环内某点恰好相遇**；如果无环，快指针会先走到 null，循环结束返回 false。
>
> 🎁 加分答案：能讲清「为什么不会跳过」——因为相对速度差恰好为 1，距离只能从 d 逐次减到 0，不会从 1 直接跨到负数，所以一定追得上（若相对速度差 >1 反而可能跳过）。更进一步，能说出 142 题的结论：**相遇点到入环点的距离，正好等于头节点到入环点的距离**，所以相遇后让一个指针回到 head、两个指针同速前进，再次相遇处就是入环点——这个结论的推导用了「慢指针走的步数 = 快指针的一半」这个等式。

---

## 五、高频题精讲：9 道从易到难

下面 9 道题，覆盖了链表的所有高频考点。**每一道都按「思路 → 步骤 → 代码 → 复杂度」写全**，建议你读完一道自己默写一遍再往下。

### 删除链表中的节点（237）

**题目**：给定一个链表节点（非尾节点），在**不访问头节点**的情况下删除它。

**思路**：正常删节点需要前驱，但这里只给你**要删的节点本身**，拿不到前驱。怎么办？**「借尸还魂」**——把自己变成下一个节点。

**步骤**：

- 把当前节点的值，改成**下一个节点的值**
- 然后删掉下一个节点（把 `next` 指向「下一个的下一个」）

```typescript
export class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val?: number, next?: ListNode | null) {
    this.val = (val===undefined ? 0 : val)
    this.next = (next===undefined ? null : next)
  }
}

export function deleteNode(root: ListNode | null): void {
  root!.val = root!.next!.val;      // 👈 把下一个节点的值搬过来
  root!.next = root!.next!.next;    // 👈 再把下一个节点摘掉
};
```

**复杂度**：时间 O(1)、空间 O(1)——没遍历，纯粹改两个字段。

测试用例：`[4,5,1,9]` 删掉值为 5 的节点后，链表变成 `[4,1,9]`（头 4 不变、第二项变成 1）。

### 反转链表（206）

**题目**：反转一个单链表。

**思路**：反转两个节点，就是把 `n+1` 的 `next` 指向 `n`；反转整条链，就用双指针遍历、重复这个动作。

![反转链表的双指针过程：pre 在左、current 在右，每步把 current.next 指向 pre，然后两者一起右移（发布前请自行转存素材库）](https://cdn.nlark.com/yuque/0/2022/gif/738210/1641175887435-169e2563-f26a-4cba-90e2-be3b2ca30000.gif)

**步骤**：

- 双指针一前一后遍历链表
- 每步：先暂存 `next`，再把当前节点指回前一个（反转指针），然后两指针一起后移

```typescript
export function reverseList(head: ListNode | null): ListNode | null {
  let pre = head;
  let current = null;
  while(pre) {
    const tmp = pre.next;   // 👈 先存住下一个，否则反转后就找不到了
    pre.next = current;     // 反转指针：当前节点指向前面
    current = pre;          // 前指针前移
    pre = tmp;              // 当前指针前移
  }
  return current;
};
```

**记住一句话**：反转链表的三行口诀是 `tmp = cur.next; cur.next = pre; pre = cur; cur = tmp;`——**先存 next、再指向 pre、最后双指针后移**。`tmp` 那一步千万不能省，否则链会断。

**复杂度**：时间 O(n)（遍历一遍）、空间 O(1)（只用两个指针）。

测试：`[1,2,3,4,5]` 反转后头为 5、依次为 5→4→3→2→1。

### 合并两个有序链表（21）

**题目**：把两个升序链表合并成一个新的升序链表。

**思路**：归并排序里的「归并」思想——两个指针各指一个链表的头，谁小就接谁，然后那个指针往后退。

**步骤**：

- 建一个**哑节点**作为结果链表的假头
- 两指针同时扫两条链，小的先接到结果上
- 一条扫完后，把另一条剩下的整段接上去

```typescript
export function mergeTwoLists(
  l1: ListNode | null,
  l2: ListNode | null
): ListNode | null {
  const dummy = new ListNode(0);   // 👈 哑节点，统一「结果链表为空」的边界
  let cur = dummy;
  while (l1 && l2) {
    if (l1.val <= l2.val) {        // 谁小接谁
      cur.next = l1;
      l1 = l1.next;
    } else {
      cur.next = l2;
      l2 = l2.next;
    }
    cur = cur.next;
  }
  cur.next = l1 || l2;             // 👈 剩下的那条整段接上（不用再循环）
  return dummy.next;               // 👈 返回哑节点的下一个，才是真头
}
```

**复杂度**：时间 O(m + n)（两条链各走一遍）、空间 O(1)（只重接指针，没建新节点）。

### 删除排序链表中的重复元素（83）

**题目**：删除有序链表中所有重复的元素，使每个元素只出现一次。

**思路**：因为链表是**有序的**，所以重复元素一定**相邻**。遍历时发现当前和下个值相同，就删掉下一个。

**步骤**：

- 遍历链表，若 `cur.val === cur.next.val`，就把 `cur.next` 指向「下下个」
- 否则 `cur` 后移

```typescript
export function deleteDuplicates(head: ListNode | null): ListNode | null {
  if(!head) return head;
  let p = head;
  while(p && p.next) {
    if(p.val === p.next.val) {
      p.next = p.next.next;   // 👈 跳过重复的，注意此时 p 不后移
    } else {
      p = p.next;             // 不重复才后移
    }
  }
  return head;
};
```

**关键细节**：发现重复时删掉 `p.next` 后，**`p` 先不要动**——因为新的 `p.next` 可能还是重复值（如 `[1,1,1]`），要留在原地继续比较。

**复杂度**：时间 O(n)、空间 O(1)。

测试：`[1,1,2,3,3]` → `[1,2,3]`。

### 两数相加（2）

**题目**：两个链表分别表示两个倒序存放的整数（如 `[2,4,3]` 表示 342），求它们的和，同样以倒序链表返回。

**思路**：就是**小学竖式加法**的模拟——从低位（链表头）开始逐位相加，满 10 进 1。

**步骤**：

- 建哑节点作为结果链
- 同时遍历两条链，逐位相加并带上进位
- 个位留在新节点上、十位作为进位带到下一位
- 循环结束后**别忘了最后可能还有一位进位**（如 999 + 1 = 1000）

```typescript
export function addTwoNumbers(l1: ListNode | null, l2: ListNode | null): ListNode | null {
  const res = new ListNode(0);      // 哑节点
  let p1: any = l1;
  let p2: any = l2;
  let pr: any = res;
  let carry = 0;                    // 进位
  while(p1 || p2) {
    const val1 = p1?.val || 0;      // 短链用 0 补齐
    const val2 = p2?.val || 0;
    const sum = val1 + val2 + carry;
    carry = Math.floor(sum / 10);   // 十位 → 进位
    pr.next = new ListNode(sum % 10); // 个位 → 当前节点
    if(p1) p1 = p1.next;
    if(p2) p2 = p2.next;
    pr = pr.next;
  }
  if(carry) { // 最后一位进一的情况
    pr.next = new ListNode(carry);
  }
  return res.next;
};
```

**复杂度**：时间 O(max(m, n))、空间 O(max(m, n))（结果链表本身占的空间；若只算额外空间是 O(1)）。

测试：`[2,4,3]` + `[5,6,4]`（即 342 + 465）→ `[7,0,8]`（即 807）。✅

### 环形链表（141）

**题目**：判断链表是否有环。

**思路**：圆形操场赛跑——**跑得快的一定会追上跑得慢的**。用快慢指针遍历，若相逢则说明有环。

**步骤**：

- 快慢指针同时从头出发
- 快指针走 2 步、慢指针走 1 步
- 若指针相逢，返回 true；遍历结束仍没相遇，返回 false

```typescript
export function hasCycle(head: ListNode | null): boolean {
  let slow: any = head;
  let fast: any = head;
  while(slow && fast && fast.next) {
    slow = slow.next;
    fast = fast.next?.next;
    if(slow === fast) return true;
  }
  return false;
};
```

**复杂度**：时间 O(n)、空间 O(1)。

测试：构造 `[3,2,0,-4]` 且尾节点指回第 2 个节点（有环）→ true；`[3,2,0,-4]` 无环 → false。

### 环形链表 II（142）：找入环点

**题目**：如果链表有环，返回**入环的第一个节点**；否则返回 null。

**思路**：先用快慢指针找到**相遇点**，然后——这里有个漂亮的数学结论：**从「头节点」到「入环点」的距离，正好等于从「相遇点」继续走到「入环点」的距离**。

**推导**：设头到入环点距离为 `a`，入环点到相遇点距离为 `b`，相遇点绕回入环点距离为 `c`（环长 = b + c）。相遇时：

- 慢指针走了 `a + b`
- 快指针走了 `a + b + n(b + c)`（多转了 n 圈）
- 快指针路程是慢指针的 2 倍：`2(a + b) = a + b + n(b + c)` → 化简得 `a = c + (n - 1)(b + c)`

也就是说：**`a` 等于 `c` 再加上整数圈**（n-1 圈）。所以，**一个指针从 head 出发、一个从相遇点出发，同速前进，它们相遇的地方就是入环点**。

**步骤**：

- 快慢指针先找相遇点
- 找到后，一个指针回到 head
- 两个指针同速前进，再次相遇处即入环点

```typescript
export function detectCycle(head: ListNode | null): ListNode | null {
  let slow: ListNode | null = head;
  let fast: ListNode | null = head;
  while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) {              // 相遇了，说明有环
      let p: ListNode | null = head;  // 👈 一个指针回到头
      while (p !== slow) {            // 同速前进，相遇处即入环点
        p = p!.next;
        slow = slow!.next;
      }
      return p;
    }
  }
  return null;
}
```

**复杂度**：时间 O(n)、空间 O(1)。

> 💬 **面试官**：142 题为什么让一个指针回到头节点就能找到入环点？
>
> ✅ 标准答案：设头到入环点为 `a`、入环点到相遇点为 `b`、环长为 `L`。相遇时慢指针走了 `a + b`、快指针走了 2 倍即 `a + b + L`（或多圈），推导得**「头到入环点的距离 a」等于「相遇点沿环走回入环点的距离」**。所以让指针从 head 走 a 步、另一个从相遇点走相同距离，必然在入环点碰面。
>
> 🎁 加分答案：能现场推导等式 `2(a+b) = a+b+nL`，并指出**环长 L 的具体值和快指针多转了几圈都不影响结论**——因为 `a` 和「相遇点到入环点的距离」只差整数圈，在同一条环上「差整数圈」就等于「同一个点」。

### K 个一组翻转链表（25）

**题目**：每 k 个节点一组进行翻转，不满 k 个的保持原样。

**思路**：是「反转链表」的加强版——需要**分组**、**每组内翻转**、**再把组与组接起来**。

**步骤**：

- 用哑节点统一「第一组」的边界
- 每轮先往后走 k 步，找到本组的**第 k 个节点**；若不足 k 个，直接结束
- 翻转这一组、把「本组的前驱」接到「本组新的头（原第 k 个）」
- 记录本组的尾（翻转后是原第 1 个），作为下一组的前驱

```typescript
export function reverseKGroup(head: ListNode | null, k: number): ListNode | null {
  const dummy = new ListNode(0, head);
  let groupPrev = dummy;              // 每组「前驱节点」

  while (true) {
    // 1. 从 groupPrev 往后走 k 步，找到本组第 k 个节点
    let kth: ListNode | null = groupPrev;
    for (let i = 0; i < k && kth; i++) kth = kth.next;
    if (!kth) break;                  // 👈 不足 k 个，剩下的保持原样

    const groupNext = kth.next;       // 本组之后的第一个节点
    // 2. 翻转 groupPrev.next ... kth 这一段
    let prev = groupNext;
    let cur = groupPrev.next;
    while (cur !== groupNext) {
      const tmp = cur!.next;
      cur!.next = prev;
      prev = cur;
      cur = tmp;
    }
    // 3. 接回：groupPrev 指向本组新的头（原 kth）
    const newTail = groupPrev.next;   // 原第 1 个，翻转后成了本组尾
    groupPrev.next = kth;
    groupPrev = newTail!;             // 作为下一组的前驱
  }
  return dummy.next;
}
```

**复杂度**：时间 O(n)（每个节点恰好被翻转一次）、空间 O(1)。

### LRU 缓存（146）：设计题天花板

**题目**：设计一个 LRU（最近最少使用）缓存，容量为 `capacity`，`get(key)` 和 `put(key, value)` 都要求 **O(1)**。超出容量时，淘汰**最久未使用**的那个。

**思路**：这道题是**两道题的合体**——「O(1) 查找」靠哈希表，「O(1) 维护使用顺序」靠双链表。

- **为什么用哈希表**：`get` 要 O(1) 定位，只有哈希能做到
- **为什么用双链表**：需要按「最近使用」排序，且要能 O(1) 把任意一个节点挪到「最新」位置、O(1) 淘汰「最旧」的那个——**这要求删除任意节点是 O(1)，而只有双链表能保证这点（有 `prev` 直接摘除）**

这就是上一节「双链表删除 O(1)」的直接应用。再加一个**伪头 + 伪尾**的哨兵技巧，把「头部插入」「尾部删除」的边界也统一掉。

**步骤**：

- 哈希表 `key → 双链表节点`，双链表从左到右表示「最新 → 最旧」
- `get`：命中就把它移到链表头（标记为最新）
- `put`：已存在则更新值并移到头；不存在则新建放头部，若超出容量就删掉**尾节点**（最旧）

```typescript
class DListNode {
  key: number;
  value: number;
  prev: DListNode | null;
  next: DListNode | null;
  constructor(key: number, value: number) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

export class LRUCache {
  private capacity: number;
  private map: Map<number, DListNode>;
  private head: DListNode;   // 伪头：head.next 是「最新」的节点
  private tail: DListNode;   // 伪尾：tail.prev 是「最旧」的节点

  constructor(capacity: number) {
    this.capacity = capacity;
    this.map = new Map();
    // 伪头伪尾互相指向，构成一个空的双链表
    this.head = new DListNode(0, 0);
    this.tail = new DListNode(0, 0);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: number): number {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key)!;
    this.moveToHead(node);    // 访问过 → 变成最新
    return node.value;
  }

  put(key: number, value: number): void {
    if (this.map.has(key)) {
      const node = this.map.get(key)!;
      node.value = value;
      this.moveToHead(node);
    } else {
      const node = new DListNode(key, value);
      this.map.set(key, node);
      this.addToHead(node);
      if (this.map.size > this.capacity) {
        const removed = this.removeTail();  // 👈 淘汰最旧的
        this.map.delete(removed.key);        // 哈希和链表要同步删
      }
    }
  }

  // 把节点插到伪头后面（成为最新）
  private addToHead(node: DListNode): void {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next!.prev = node;
    this.head.next = node;
  }

  // O(1) 摘除任意节点——这正是双链表的价值
  private removeNode(node: DListNode): void {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
  }

  private moveToHead(node: DListNode): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  // 删掉伪尾前面的节点（最旧的）
  private removeTail(): DListNode {
    const node = this.tail.prev!;
    this.removeNode(node);
    return node;
  }
}
```

**复杂度**：`get` 和 `put` 都是 **O(1)**（哈希定位 O(1) + 双链表摘除/插入 O(1)）、空间 O(capacity)。

**三个关键细节**：

- **节点里必须存 `key`**：淘汰尾节点时要从哈希表里删掉它，得知道删哪个 key——所以双链表节点除了 `value` 还要存 `key`
- **哈希表和双链表必须同步增删**：只在一边改动就会内存泄漏或数据错乱
- **伪头伪尾**：省掉了「链表为空」「只有一个节点」的所有 `if`，这是哑节点思想在双链表上的又一次应用

> 💬 **面试官**：LRU Cache 为什么要用双链表，而不是单链表？
>
> ✅ 标准答案：因为 LRU 需要**把任意一个「被访问过的节点」O(1) 挪到最新位置**，还得 **O(1) 淘汰最旧节点**。这两件事的本质都是「O(1) 删除任意节点」——而删除节点需要改它的**前驱**的指针。单链表要拿到前驱必须从头遍历（O(n)），双链表因为每个节点自带 `prev` 指针，拿到节点就能 O(1) 摘除。所以必须用双链表。
>
> 🎁 加分答案：能补三点——① **`Map` 为什么不能单独胜任**：JS 的 `Map` 会保持插入顺序，但 `get` 一个已存在的 key **不会**把它挪到末尾，所以得手动 delete + set 才能维护 LRU 顺序，且这种写法在严格意义上不是 O(1) 均摊意义上的「最优解」（虽然实践中可用）；② **节点为何要存 key**（淘汰时同步删哈希）；③ **伪头伪尾哨兵**消除了空链表/单节点的边界判断，是哑节点技巧的延伸。能主动提到「哈希 + 双链表各司其职：一个解决 O(1) 定位、一个解决 O(1) 顺序维护」说明你真的理解了设计题的解题框架。

**LeetCode 重点题索引**：

| 题号 | 题目 | 考点 | 难度 |
|------|------|------|------|
| 206 | 反转链表 | 双指针反转 | 简单 |
| 21 | 合并两个有序链表 | 归并 + 哑节点 | 简单 |
| 83 | 删除排序链表中的重复元素 | 遍历去重 | 简单 |
| 141 | 环形链表 | 快慢指针判环 | 简单 |
| 142 | 环形链表 II | 快慢指针 + 找入环点 | 中等 |
| 2 | 两数相加 | 进位模拟 + 哑节点 | 中等 |
| 237 | 删除链表中的节点 | 借尸还魂 | 中等 |
| 25 | K 个一组翻转链表 | 分组翻转 + 哑节点 | 困难 |
| 146 | LRU 缓存 | 双链表 + 哈希 | 中等 |

---

## 六、前端工程落地

链表在前端不止 Fiber 一处。下面三个落地场景，都是「把链表认出来」的实际案例。

### LRU 语义：药品搜索历史天然就是 LRU

🔧 **真实场景**：在药品电商的搜索框里，「最近搜索历史」通常是**有限容量**的——只记最近 10 条，新的挤掉旧的，且**刚搜过的词会被提到最前面**。这个行为——「容量固定 + 最近使用的优先保留 + 最久未用的先淘汰」——**就是 LRU 的教科书定义**。

所以你手写的那段 `LRUCache`，并不是只在面试里用——**它可以原封不动地搬进项目**：药品搜索历史、处方模板的最近使用列表、API 响应的本地缓存，凡是「容量有限 + 按最近使用淘汰」的地方，都是它的主场。这也是第 1 篇说的「提前找好前端和算法的结合点，用于工作实战」——**LRU 就是链表最典型的实战结合点**。

### JS 原型链本质是链表

这是链表最「反直觉」的一次现身：**JavaScript 的原型链，本质就是一条链表**。

- 原型链上的节点是各种**原型对象**，比如 `Function.prototype`、`Object.prototype`、`Array.prototype`
- 它们通过 `__proto__` 属性一个个连起来，形成一条「链」
- 沿着这条链查属性，就是**遍历链表**——查到就返回，走到 `null` 就是没找到

不同对象的原型链（每条链最后都指向 `null`）：

```
obj  → Object.prototype → null
func → Function.prototype → Object.prototype → null
arr  → Array.prototype  → Object.prototype → null
```

两条核心知识点，直接对应链表的两个操作：

- **原型链查找 = 链表遍历**：如果在 A 对象上没找到 `x` 属性，就沿着原型链一路往后找 `x`
- **`instanceof` = 沿链找某个节点**：如果 A 沿着原型链能找到 `B.prototype`，那么 `A instanceof B` 为 `true`——**`instanceof` 的原理，就是沿原型链遍历、看有没有命中 `B.prototype`**

来看这道高频面试题的实现——**手写 `instanceof`**：

`src/data-structures/linked-list/prototype.ts`

```typescript
export const instanceOf = (A: any, B: any): boolean => {
  let p: any = A;
  while(p) {
    console.log(p.__proto__, B.prototype, 111)
    if(B.prototype === p) return true;   // 👈 命中 B.prototype 就是 true
    p = p.__proto__;                     // 👈 p 往后移一个节点（链表遍历）
  }
  return false;                          // 走到 null 都没找到
}
```

看出来了吗？**`while(p) { ... p = p.__proto__ }` 这就是一条标准的链表遍历**——`p = p.__proto__` 就是链表里的 `cur = cur.next`，只不过节点换成了原型对象。

配套测试验证了 `instanceOf([], Array)`、`instanceOf([], Object)`、`instanceOf({}, Object)`、`instanceOf(1, Number)` 全为 true。

再看一道原型链查找顺序的面试题（注释掉的部分是待填入的输出）：

```typescript
const foo: any = {};
const f: any = function(){};
(Object.prototype as any).a = 'value a';
(Function.prototype as any).b = 'value b';

console.log(foo.a);   // 'value a' —— foo 自己没有 a，沿原型链到 Object.prototype 找到
console.log(foo.b);   // undefined —— Object.prototype 上没有 b，且链到头了
console.log(f.a);     // 'value a' —— f 沿链：Function.prototype → Object.prototype，最后找到 a
console.log(f.b);     // 'value b' —— f 沿链先在 Function.prototype 上命中 b
```

测试验证：`foo.a === 'value a'`、`foo.b === undefined`、`f.a === 'value a'`、`f.b === 'value b'`。

**这题的解题钥匙就是「把原型链当链表走一遍」**：`foo` 的链是 `foo → Object.prototype → null`，所以只有 `a` 能被找到；`f` 的链是 `f → Function.prototype → Object.prototype → null`，所以 `b`（挂在 Function.prototype）和 `a`（挂在 Object.prototype）都能找到。

> 💬 **面试官**：手写一个 `instanceof`。
>
> ✅ 标准答案：沿对象的原型链遍历，如果链上某个节点等于 `Constructor.prototype` 就返回 true，走到 `null` 返回 false。核心就是 `while (p) { if (p === B.prototype) return true; p = p.__proto__; }`——本质是一次链表遍历。
>
> 🎁 加分答案：能补两点——① **`__proto__` 和 `Object.getPrototypeOf()` 的区别**：`__proto__` 是历史遗留的访问器属性（在对象上访问原型），规范推荐用 `Object.getPrototypeOf()`；② **为什么 `instanceof` 有局限**：它依赖「原型链」，所以跨 iframe/跨 realm 时同样的类型会判 false（因为 `Array.prototype` 不是同一个对象），这也是 `Array.isArray()` 存在的意义——**它不查原型链，而是查内部属性**。

### 用链表指针获取 JSON 节点值

最后一个落地小技巧——**「指针式」遍历取嵌套 JSON 的值**。

`src/data-structures/linked-list/json.ts`

```typescript
export const json = {
  a: {
    b: {
      c: 1
    }
  },
  d: {
    e: 2
  }
}

export const path = ['a', 'b', 'c'];
```

`src/data-structures/linked-list/test/json.test.ts`

```typescript
import "mocha";
import { expect, assert } from "chai";
import { json, path } from "../json";

describe("使用链表指针获取JSON的节点值 测试", function () {
  it("使用链表指针获取JSON的节点值", function () {
    let p: any = json;
    path.forEach(k => {
      p = p[k]          // 👈 指针一路往下走，跟链表 cur = cur.next 一个道理
    });
    expect(p).to.be.equal(1);
  });
});
```

`let p = json` 是「指针」起点，`p = p[k]` 是「指针移动」，每走一步就深入一层——**这和链表里 `cur = cur.next` 的指针语义完全一致**。理解了这个，你就理解了很多框架内部「按路径取/设值」的通用写法。

---

## 七、总结：面试核心问速查

把本篇的四个面试核心问集中放一起，方便你复习速查。

**问 1：React Fiber 为什么用链表而不是递归树？解决了什么问题？**

✅ 链表能在任意节点**暂停遍历、记住位置、之后恢复**，这是时间分片的基础。递归树依赖引擎的调用栈，业务代码拿不到栈帧，一旦开始就必须一口气走完，无法中途让出主线程、会阻塞渲染。Fiber 用 `child/sibling/return` 三指针把组件树改造成「树 + 链表」，把遍历控制权从调用栈夺回到用户态的循环里，从而支持 `shouldYield()` 中断。

**问 2：LRU Cache 为什么要用双链表而不是单链表？**

✅ LRU 要 O(1) 地把任意节点挪到最新位置、O(1) 淘汰最旧节点，本质都是「O(1) 删除任意节点」。删节点要改「前驱」的指针，单链表找前驱是 O(n)，双链表每个节点自带 `prev`，拿到节点就能 O(1) 摘除。再配哈希表解决 O(1) 定位，两者各司其职。

**问 3：哑节点技巧的本质是什么？**

✅ 用一个虚拟的第 0 个节点，把「头节点」这个特例也变成普通中间节点，从而消除所有针对头节点的边界判断。它不改变复杂度，但显著简化代码、减少出错，能覆盖 80% 需要「修改头」的链表题。注意最后要 `return dummy.next`。

**问 4：快慢指针检测环的原理是什么？Floyd 判圈算法为什么有效？**

✅ 慢指针走 1 步、快指针走 2 步。有环时两者都会进入环，相对速度差为 1，快指针**每次逼近 1 个身位**，必然恰好追到相遇（不会跳过）。无环时快指针先到 `null`。142 题进一步推导出：头到入环点的距离 = 相遇点沿环到入环点的距离，故相遇后一个指针回 head、同速前进即得入环点。

### 技术要点速览

- 链表元素**存储不连续**，之间通过 `next` 连接；JS 没有链表，用 `Object` 模拟
- 链表常用操作只有两种：**修改 next** 和**遍历链表**
- 四种形态：单链表（删需找前驱 O(n)）、双链表（删 O(1)）、循环链表（尾指回头、遍历要计数）、有序链表（插入即有序）
- 两个核心技巧：**哑节点**（统一头边界）、**快慢指针**（判环 / 找中点 / 找倒数第 k）
- **JS 的原型链就是一条链表**，`instanceof` 原理就是沿链找 `B.prototype`
- 用「指针」语义可以取 JSON 的节点值：`path.forEach(k => p = p[k])`

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 考察频率 |
|--------|-----------|---------|
| React Fiber | `child/sibling/return` 三指针把组件树编码成可暂停恢复的链表，支撑时间分片 | ⭐⭐⭐ 必考 |
| 数组 vs 链表 | 数组随机访问 O(1) 但增删 O(n)；链表增删 O(1) 但访问 O(n) | ⭐⭐⭐ 必考 |
| 哑节点 | 虚拟第 0 节点，把头节点特例变普通节点，消灭边界 if | ⭐⭐⭐ 必考 |
| 快慢指针 | 慢 1 快 2，相对速度差 1 必相遇——判环 / 找中点 / 找倒数第 k | ⭐⭐⭐ 必考 |
| Floyd 判圈 | 有环必相遇；142 结论：头到入环点 = 相遇点到入环点 | ⭐⭐ 高频 |
| LRU Cache | 哈希表管 O(1) 定位 + 双链表管 O(1) 顺序维护，节点要存 key | ⭐⭐⭐ 必考 |
| 原型链 | `obj → Object.prototype → null` 是链表；`instanceof` 即沿链查找 | ⭐⭐ 高频 |
| 双链表删除 | 拿到节点即 O(1) 摘除（有 prev），单链表不行 | ⭐⭐ 高频 |

> 💡 记住这条主线：**链表的一切，都是「指针操作」**——Fiber 用三根指针让遍历可中断，哑节点用一个假指针统一边界，快慢指针用两根指针的**速度差**探测环，LRU 用双链表的**双向指针**做到 O(1) 增删。把「指针怎么走」这件事想清楚，链表就不再是难点，而是一把能拆开 Fiber、原型链、缓存实现的万能钥匙。

---

## 📝 留个问题

链表还有一类让人头疼的题型——**「快慢指针找倒数第 k 个节点」**（对应 LeetCode 19「删除链表的倒数第 N 个节点」）。如果要求**只遍历一次**，你会怎么设计快慢指针的初始位置？提示：让快指针**先走 k 步**，再让两者同速前进……想清楚后，试试再补一个哑节点，看看边界情况是不是被顺手解决了。

欢迎在评论区写出你的答案 👇

---

## 参考资料

- https://leetcode.cn/ （刷题主站，本篇 9 道题均在此）
- https://tc39.es/ecma262/ （ECMAScript 规范，`instanceof` / 原型链的规范依据）
- https://github.com/facebook/react/tree/main/packages/react-reconciler （React Reconciler 源码，Fiber 的 `child/sibling/return` 定义）
- 《学习 JavaScript 数据结构与算法》（Loiane Groner，链表各形态实现的经典参考）
- 《算法（第 4 版）》（Sedgewick / Wayne，链表与归并思想）

> 推荐搜索关键词：「React Fiber child sibling return 三指针」「链表 哑节点 dummy node 技巧」「快慢指针 Floyd 判圈 入环点推导」「LRU Cache 双链表 哈希 O(1)」「JS 原型链 instanceof 原理」「K 个一组翻转链表 哑节点」。

---

> 🔖 这是「前端数据结构与算法」系列第 5 篇。上一篇：《队列：事件循环任务队列/BFS/双端队列与滑动窗口》；下一篇预告：《集合与散列表：ES6 Set/Map 底层原理与高频面试题》
