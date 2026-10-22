# 搜索算法完全指南：循环不变式、BFS/DFS 与滑动窗口（面试收藏级）

> **副标题**：循环不变式建立二分思维，BFS/DFS 选择策略，双指针与滑动窗口

> 面试官微笑着说：「手写一个二分搜索吧。」你心里想「这还不简单」，提笔就写——`while (left <= right)`、`mid = (left + right) / 2`、`left = mid + 1`，一气呵成。面试官点点头，然后问：「为什么用 `left <= right` 而不是 `left < right`？`mid = (left + right) / 2` 有什么问题？如果数组旋转过呢？如果要求找第一个等于目标值的位置呢？」你愣住了。二分搜索**人人会写，但能把循环不变式讲清楚、把四种变体一次写对的人，不到 10%**。这篇文章，就是把「搜索」这个看似简单的主题，从「会写」提升到「讲透」。

---

## 🎯 这篇文章解决什么问题

这是「**前端数据结构与算法**」系列的第 **11 篇**。整个系列 16 篇，从数据结构到算法设计思想，把一名前端工程师该有的算法体系系统补齐。

搜索是前端日常开发中**最不起眼却最常用**的操作——你每天都在用 `indexOf`、`find`、`includes`，但很少想过它们底层是什么算法、什么复杂度。面试里，搜索相关题目（二分、双指针、滑动窗口、BFS/DFS）却是**绝对高频**，尤其二分搜索的边界处理，堪称「细节决定成败」的典范。

这一篇围绕一条主线展开：**先用真实前端场景证明「搜索就在你代码里」，再把每个算法从原理讲到变体讲到面试考法，最后落到 React Fiber 源码、source-map 和 git bisect 这些真实工程案例**。

读完你会获得：

- **二分搜索的「循环不变式」思维**——从此写二分不再靠运气，而是靠推导
- **三种二分写法统一对照**——闭区间 / 左闭右开 / 左开右开，一次说清
- **四种二分变体 + 二分答案建模**——lower_bound、upper_bound、旋转数组、旋转数组找最小值，以及「求最大值的最小」这类题的通用套路
- **双指针与滑动窗口**——定长窗口、变长窗口两套模板，把 O(n²) 暴力降到 O(n)
- **BFS vs DFS 的选择策略**——最短路径用 BFS、回溯用 DFS，再补上多源 BFS 与双向 BFS
- **8 道 LeetCode 高频题**精讲——33/34/3/76/11/374/875/127，每题带完整代码和复杂度分析
- **React Fiber 的 DFS 工作循环**——`workLoopSync` 为什么用迭代而不是递归

---

## 一、场景切入：前端每天都在搜索，只是你没意识到

先说结论，再逐个拆解：**你以为搜索离你很远，其实你每天都在用它，只是它被 JS 原生方法和框架「藏」起来了**。

🔧 **真实场景**：在药品电商的「药品搜索页」，用户输入关键词后要在 10 万条药品记录里找匹配项。如果用 `indexOf` 顺序搜索，最坏情况要扫完 10 万条；如果数据有序，用二分搜索最多比较 17 次——**10 万 vs 17，这就是 O(n) 和 O(logn) 的差距**。

下面几个场景，任何一个前端都写过，但它们的搜索算法选型逻辑，大多数人从没认真想过。

### `indexOf` 为什么慢

JS 数组的 `indexOf` 方法是**顺序搜索**——从数组第一个元素开始，逐个比对，命中返回下标，未命中返回 -1：

```javascript
const arr = [3, 44, 38, 5, 47, 15, 36, 26, 27, 2, 46, 4, 19, 50, 48];
arr.indexOf(48);   // 返回 14，但要扫到第 15 个元素才找到
arr.indexOf(100);  // 返回 -1，要扫完全部 15 个元素才知道没有
```

时间复杂度 **O(n)**，空间复杂度 **O(1)**。对于无序数据，这是**唯一的通用选择**——因为没有任何结构信息可以利用，只能逐个比对。

但如果数据是**有序的**，情况完全不同。

### 猜数字怎么 O(logn)

玩过一个猜数字游戏吗？我想一个 1 到 100 之间的数字，你来猜，我告诉你「大了」还是「小了」。最优策略是**每次都猜中间值**：

- 猜 50 → 小了 → 范围缩到 51-100
- 猜 75 → 大了 → 范围缩到 51-74
- 猜 62 → 中了！

最多 7 次（log₂100 ≈ 6.64）就能猜中任意数字——这就是**二分搜索**的核心思想：**每次把搜索范围缩小一半**。

🔧 **真实场景：药品价格区间筛选**

假设有 10 万种药品按价格排序，用户筛选「50-100 元区间」。用二分搜索找到第一个 ≥ 50 的位置和最后一个 ≤ 100 的位置，O(logn) 搞定；用顺序搜索要扫 10 万次。

🔧 **真实场景：用二分找「最后一个正常的版本」**

这是前端工程里极其常见的一个需求：线上出了一堆「坏版本」，你要**定位第一个出问题的版本**（从而知道最后一个正常版本是谁）。

```
版本号（已构建，天然有序）：
v1.0 ✅  v1.1 ✅  v1.2 ✅  v1.3 ❌  v1.4 ❌  v1.5 ❌  v1.6 ❌
                          ↑ 第一个坏版本

二分思路：每次取中间版本部署验证
  → 中间是 v1.3，坏了 → 答案在左半 [v1.0, v1.3]
  → 中间是 v1.1，正常 → 答案在右半 [v1.2, v1.3]
  → ... 约 log₂(n) 次验证锁定
```

7 个版本最多 3 次就能定位，70 个版本最多 7 次——**「验证」这个动作很贵（要构建、要部署、要跑测试），二分把验证次数从 O(n) 压到 O(logn)，省下的是真金白银的构建时间**。这道题在 LeetCode 上有对应的题目，就是 278「第一个错误的版本」，后面我们会讲。

### 前端路由匹配：Trie + DFS

Vue Router / React Router 的动态路由 `/user/:id/profile`，底层是 **Trie（前缀树）+ DFS（深度优先搜索）**：

```
路由表：
/                    → Home
/user                → UserList
/user/:id            → UserDetail
/user/:id/profile    → UserProfile
/user/:id/settings   → UserSettings

Trie 结构：
/
└── user
    └── :id
        ├── profile
        └── settings
```

匹配 `/user/123/profile` 时，从根节点开始 DFS 遍历，逐段匹配 `user` → `:id`（动态参数）→ `profile`，找到对应组件。

**为什么是 Trie + DFS，而不是用 Map 直接存整条路径？** 因为动态路由段（`:id`）无法预知具体值，必须逐段「试探 + 回溯」。Trie 让相同前缀的路由共享节点（`/user/:id/profile` 和 `/user/:id/settings` 共享到 `:id` 这一段），DFS 负责在不确定的段上探索所有可能——这正好是第 07 篇「树」和第 15 篇「回溯」要讲的结构。

> 💬 **面试官**：`Array.prototype.indexOf` 的时间复杂度是多少？大列表下怎么优化？
>
> ✅ 标准答案：`indexOf` 是顺序搜索，时间复杂度 O(n)，空间复杂度 O(1)。大列表优化方向：① 如果数据有序，改用二分搜索降到 O(logn)；② 如果需要频繁查找，提前建立哈希表（Map/Set），用空间换时间降到 O(1)；③ 如果是前端列表渲染，用虚拟列表减少 DOM 节点数，从根本上降低搜索规模。
>
> 🎁 加分答案：能提到「V8 对 `indexOf` 做过优化——小数组用线性扫描，大数组会根据 Elements Kind 选择不同策略，但本质仍是 O(n)」。再补一句「前端里最常见的其实是第三种——不是把搜索变快，而是让要搜的东西变少，虚拟列表就是典型」。如果能说出「这个决策的本质是『用结构信息换速度』：无序 → 只能 O(n)，有序 → 二分 O(logn)，建索引 → 哈希 O(1)」，那这题就满分了。

### 搜索算法全景

先给一张全景表，把常见搜索算法的复杂度铺开：

| 查找条件 | 查找算法 | 平均时间复杂度 | 空间复杂度 |
|---------|---------|---------------|-----------|
| 无序或有序 | 顺序查找 | O(N) | O(1) |
| 有序 | 二分查找 | O(log₂N) | O(1) |
| 有序 | 插值查找 | O(log₂(log₂N)) | O(1) |
| 有序 | 斐波那契查找 | O(log₂N) | O(1) |
| 无序或有序 | 哈希查找 | O(1) | O(N) |
| —— | 二叉查找树 | O(log₂N) | O(N) |
| —— | 红黑树 | O(log₂N) | O(N) |
| —— | 2-3树 | O(log₂N - log₃N) | O(N) |
| —— | B树/B+树 | O(log₂N) | O(N) |

![常见查找算法复杂度对比（顺序 / 二分 / 插值 / 斐波那契 / 哈希 / 树查找）](https://cdn.nlark.com/yuque/0/2022/png/738210/1641565921851-5daab165-6696-4bee-8c6c-6913f3ec7679.png)

这张表是后面所有章节的基础。**一句话抓住主线：搜索的快慢，取决于你能利用多少「数据的结构信息」**——无序数据没有信息可用，只能 O(n)；有序数据可以用二分（O(logn)）；均匀分布可以更进一步用内插（O(log log n)）；提前建好哈希表则可达 O(1)。接下来我们逐个拆解。

---

## 二、顺序搜索：最简单也最常用

### 算法思路

顺序搜索（Sequential Search）是最朴素的搜索算法：

- 遍历数组，逐个比对每个元素
- 找到跟目标值相等的元素，就返回它的下标
- 遍历结束后，如果没有搜索到目标值，就返回 -1

![顺序搜索：从第一个元素起逐个比对，命中即返回](https://cdn.nlark.com/yuque/0/2022/png/738210/1645684601309-ac5e1766-e147-4eca-9b91-576e6cf9cb25.png)

### 代码实现

先定义一个通用的相等比较函数——把它抽出来，是为了让「怎么比较两个元素」这件事可替换（比如后续要按对象某个字段比较）：

```typescript
// src/util/index.ts
export const defaultEquals = (a: any, b: any) => {
  return a === b;
};
```

然后实现顺序搜索：

```typescript
// src/algorithms/search/sequence.ts
import { defaultEquals } from "../../util";

export function sequential(
  array: any[],
  target: any,
  equalsFn: Function = defaultEquals
): number {
  for (let i = 0; i < array.length; i++) {
    const element = array[i];
    if (equalsFn(element, target)) {  // 👈 命中就返回下标
      return i;
    }
  }
  return -1;  // 👈 扫完全部还没找到，返回 -1
}
```

测试代码：

```typescript
// src/algorithms/search/sequence.test.ts
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { sequential } from '../sequence';

describe('顺序搜索 测试', () => {
  it('顺序搜索', () => {
    const arr = [3, 44, 38, 5, 47, 15, 36, 26, 27, 2, 46, 4, 19, 50, 48];
    const res = 14;
    expect(sequential(arr, 48)).to.be.deep.equal(res);
  })
})
```

### 算法分析

- 遍历数组是一个循环操作
- **时间复杂度：O(n)**——最坏情况要扫完整个数组
- **空间复杂度：O(1)**——只用了常数额外空间

### 什么时候用顺序搜索

顺序搜索虽然慢，但有一个不可替代的优势：**对数据没有任何要求**。

- 数据**无序** → 只能顺序搜索
- 数据**有序** → 可以用二分搜索
- 需要**频繁查找** → 提前建哈希表，用空间换时间

🔧 **真实场景**：药品搜索历史记录。用户最近搜索过的 10 个关键词存在数组里，要判断某个关键词是否已存在——数据量小（10 个）、无序，直接 `indexOf` 顺序搜索就是最优解。**别小看这种「数据量小」的场景——n 很小时，O(n) 和 O(logn) 的实际耗时可能只差几纳秒，为了上二分反而引入「必须先排序」的成本，得不偿失**。这正是复杂度分析里「常数因子」在起作用（第 02 篇讲过）。

> 💬 **面试官**：什么情况下你会选择顺序搜索而不是二分？
>
> ✅ 标准答案：① 数据无序，且排序成本高于搜索收益时——比如一次性搜索一个几千条的乱序列表，排一次序 O(nlogn) 可能比直接扫一遍 O(n) 更贵；② 数据量很小（几十个元素以内）时，二分的常数开销反而更明显；③ 数据是流式到来、边收边搜，无法预先排序。
>
> 🎁 加分答案：能点出「这是个『预排序 vs 不排序』的权衡」——如果同一份数据要**反复搜索很多次**，那么一次排序的成本能被后续无数次 O(logn) 摊薄，二分稳赚；如果只搜一次，直接扫更划算。这个权衡思路可以迁移到很多场景，比如「频繁查库要不要建索引」。

---

## 三、二分搜索：前端算法面试的绝对高频

二分搜索（Binary Search）是面试的**绝对高频考点**，也是「会写但写不对」的重灾区。核心难点不在于「知道思路」，而在于**边界处理**——`left <= right` 还是 `left < right`？`mid + 1` 还是 `mid`？`right - 1` 还是 `right`？这三个问号，就是这篇文章要一次性讲透的东西。

### 算法思路

二分搜索的前提是**数组有序**：

- 从数组的中间元素开始，如果中间元素正好是目标值，则搜索结束
- 如果目标值大于或小于中间值，则在大于或小于中间元素的那一半数组中搜索
- 搜索结束后，如果没有搜索到目标值，就返回 -1

![二分搜索：每次取中间值与目标比较，排除掉一半区间](https://cdn.nlark.com/yuque/0/2022/png/738210/1645684573414-4d458fe5-2bd5-486e-be5b-7113a24780d1.png)

### 循环不变式：二分思维的基石

**循环不变式（Loop Invariant）**是理解二分搜索的关键——它指「在循环的每次迭代前后都保持成立的性质」。写二分的所有边界判断，本质上都是在**维护这个性质不被破坏**。

对于「标准二分」，循环不变式是：**答案（如果存在）始终在 `[left, right]` 闭区间内**。

```
初始：left = 0, right = n - 1   →  答案在 [0, n-1] 内 ✅
每轮：mid = (left + right) / 2
  ├─ arr[mid] < target  →  arr[mid] 及其左侧全部排除  →  left = mid + 1
  ├─ arr[mid] > target  →  arr[mid] 及其右侧全部排除  →  right = mid - 1
  └─ arr[mid] == target →  命中，直接返回 mid
循环条件 left <= right 保持不变式：区间非空时才有元素可查
循环结束：left > right，区间为空 → 答案不存在，返回 -1
```

**为什么用 `left <= right` 而不是 `left < right`？** 因为 `[left, right]` 是闭区间，当 `left === right` 时区间内还有**一个元素**没检查，必须继续循环；如果用 `left < right`，当 `left === right` 时会直接退出，漏掉这最后一个元素。

**为什么更新是 `left = mid + 1` / `right = mid - 1`，而不是 `left = mid` / `right = mid`？** 因为 `arr[mid]` 已经比较过了、确定不是答案，把它排除出区间才能**保证区间每轮严格缩小**；如果写成 `left = mid`，当 `left === mid` 时会死循环。

> 💬 **面试官**：二分搜索的循环不变式是什么？为什么用 `left <= right` 而不是 `left < right`？
>
> ✅ 标准答案：循环不变式是「答案始终在 `[left, right]` 闭区间内」。用 `left <= right` 是因为闭区间包含 `left === right` 的情况——此时区间内还有一个元素需要检查，如果改成 `left < right` 会漏掉这个元素导致错误。同时 `left = mid + 1` / `right = mid - 1` 保证了每轮区间严格缩小、不会死循环。
>
> 🎁 加分答案：能进一步解释「闭区间 vs 左闭右开区间」两种写法的区别——闭区间 `[left, right]` 对应 `while (left <= right)` + `left = mid + 1` / `right = mid - 1`，循环结束时 `left > right`；左闭右开 `[left, right)` 对应 `while (left < right)` + `left = mid + 1` / `right = mid`，循环结束时 `left === right`。**两种写法都对，关键是三处（区间定义、循环条件、边界更新）必须自洽**。能讲清「换写法时要三处一起改，只改一处必错」，说明你真正理解了二分搜索的本质，而不是背模板。

### 三种写法的统一：一张表说清所有二分

面试里最容易翻车的地方，就是把不同写法的边界混着用。下面这张表把三种主流写法并列，**只要你写二分时先确定「用哪种区间」，另外两列就自然确定了**：

| 写法 | 区间定义 | 初始化 | 循环条件 | 收缩左边界 | 收缩右边界 | 结束状态 |
|------|---------|--------|---------|-----------|-----------|---------|
| 闭区间 | `[left, right]` | `left=0, right=n-1` | `left <= right` | `left = mid + 1` | `right = mid - 1` | `left > right` |
| 左闭右开 | `[left, right)` | `left=0, right=n` | `left < right` | `left = mid + 1` | `right = mid` | `left == right` |
| 左开右开 | `(left, right)` | `left=-1, right=n` | `left + 1 < right` | `left = mid` | `right = mid` | `left + 1 == right` |

怎么记？**一句话：区间开闭决定了「mid 该不该被排除」**。

- 闭区间 `[l, r]`：`mid` 在区间内，比较过后必须排除 → `±1`
- 左闭右开 `[l, r)`：`mid + 1` 是新区间左端（闭），`mid` 是新区间右端（开，所以 `mid` 本身还在区间外）→ 左边 `+1`、右边不加不减
- 左开右开 `(l, r)`：`mid` 在区间内，排除后是新边界，但边界本身是开的 → 两边都写 `mid`

**为什么推荐新手先掌握「左闭右开」？** 因为它的结束状态很干净——`left === right` 时循环恰好退出，且此时 `left` 天然就是「第一个满足条件的位置」，写 lower_bound / upper_bound 时返回值不用 ±1，不容易错。下面讲变体时你会看到这一点。

### 代码实现：迭代版

先定义比较函数。这里返回的不是布尔值，而是三态枚举（小于/大于/等于），**为什么？因为二分的核心操作是「三路比较」——小于往右、大于往左、等于命中，用一个枚举明确表达三种情况，比 `a < b` 更贴近算法本质**：

```typescript
// src/util/index.ts
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

然后实现二分搜索（迭代版）：

```typescript
// src/algorithms/search/binary.ts
import { defaultCompare, Compare } from "../../util";
import { quick } from "../sort/quick";

export function binary(
  array: any[],
  target: any,
  compareFn: Function = defaultCompare
): number {
  const sortArray = quick(array);  // 👈 先排序（有序是二分的前提）
  let low = 0;
  let high = array.length - 1;
  while(low <= high) {  // 👈 闭区间，等号必须有
    const mid = Math.floor((low + high) / 2);
    const element = sortArray[mid];
    if (compareFn(element, target) === Compare.LESS_THAN) {
      low = mid + 1;  // 👈 答案在右半，左边界右移（排除 mid）
    } else if (compareFn(element, target) === Compare.BIGGER_THAN) {
      high = mid - 1;  // 👈 答案在左半，右边界左移（排除 mid）
    } else {
      return mid;  // 👈 命中
    }
  }
  return -1;  // 👈 未命中
}
```

⚠️ **一个容易忽略的细节**：上面这份代码里 `low`/`high` 是相对于**排序后**的 `sortArray` 的下标，但函数返回的却是这个下标——如果调用方想知道原数组里的位置，这就不对了。**二分的下标和「排序后数组」绑定，返回的是有序数组中的位置**。真实场景里，要么输入本来就是有序的（比如价格早已排好序），要么需要额外记录「排序后元素 → 原下标」的映射。这个坑面试里偶尔会被追问，心里要有数。

### 代码实现：递归版

二分天然是**分治**结构（每次只处理一半），所以也能写成递归——把 `[low, high]` 当作状态在调用间传递：

```typescript
const binarySearchRecursive = (
  array: any[],
  target: any,
  low: number,
  high: number,
  compareFn: Function = defaultCompare
): number => {
  if(low <= high) {
    const mid = Math.floor((low + high) / 2);
    const element = array[mid];
    if(compareFn(element, target) === Compare.LESS_THAN) {
      return binarySearchRecursive(array, target, mid + 1, high, compareFn);
    }
    if(compareFn(element, target) === Compare.BIGGER_THAN) {
      return binarySearchRecursive(array, target, low, mid - 1, compareFn);
    }
    return mid;
  }
  return -1;
}

export function binaryRecursive(
  array: any[],
  target: any,
  compareFn: Function = defaultCompare
): number {
  const sortArray = quick(array);
  let low = 0;
  let high = array.length - 1;
  return binarySearchRecursive(sortArray, target, low, high, compareFn);
}
```

测试代码：

```typescript
// src/algorithms/search/binary.test.ts
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { binary, binaryRecursive } from '../binary';

describe('二分搜索 测试', () => {
  it('二分搜索-递归', () => {
    const arr = [2, 3, 4, 5, 15, 19, 26, 27, 36, 38, 44, 46, 47, 48, 50];
    expect(binaryRecursive(arr, 48)).to.be.deep.equal(13);
    expect(binaryRecursive(arr, 58)).to.be.deep.equal(-1);
  });
  it('二分搜索-非递归', () => {
    const arr = [2, 3, 4, 5, 15, 19, 26, 27, 36, 38, 44, 46, 47, 48, 50];
    expect(binary(arr, 48)).to.be.deep.equal(13);
    expect(binary(arr, 58)).to.be.deep.equal(-1);
  })
});
```

> 💬 **面试官**：二分搜索能用递归写吗？递归版和迭代版有什么区别？
>
> ✅ 标准答案：能。二分本质是分治——每次只处理一半区间，把 `[low, high]` 作为状态在递归调用间传递即可。迭代版空间复杂度 O(1)，递归版因为每次调用压一个栈帧，空间复杂度是 O(logn)。
>
> 🎁 加分答案：能指出「二分是尾递归」——递归调用是函数最后一个操作，理论上可以优化成迭代、复用栈帧，但 V8 并不实现尾调用优化（第 12 篇会讲），所以实际中递归版依然占 O(logn) 栈空间。**因此工程里一律推荐迭代版**：既省栈空间，也避免了 `log n` 层调用的小开销。能说出「尾递归 + V8 不优化」这个细节，说明对引擎行为和算法结构都有理解。

### mid 溢出问题：一个隐藏的大坑

上面的代码有个隐藏问题：`Math.floor((low + high) / 2)` 在 `low + high` 很大时会**溢出**。

在 JS 里，数字是 64 位浮点数，理论上 `low + high` 最大到 `Number.MAX_SAFE_INTEGER`（约 9 × 10¹⁵）才会出问题，实际场景很难遇到。但在 C++/Java 等 32 位整数语言里，`int mid = (low + high) / 2;` 当 `low` 和 `high` 都接近 `INT_MAX`（约 21 亿）时，`low + high` 会**溢出为负数**，导致 `mid` 计算错误，进而数组越界或死循环。

**解决方案**：先做减法再除以 2，避免中间结果溢出：

```typescript
// ❌ 有溢出风险（C++/Java 等 32 位整数语言中）
const mid = Math.floor((low + high) / 2);

// ✅ 先减法再除，不会溢出（推荐）
const mid = low + Math.floor((high - low) / 2);

// ✅ 位运算更快（推荐）
const mid = low + ((high - low) >> 1);
```

`>> 1` 是算术右移一位，等价于「除以 2 向下取整」，比 `Math.floor(...)` 少一次函数调用，在高频调用的二分里更划算。

> 💬 **面试官**：二分搜索中，`mid = (left + right) / 2` 有什么问题？如何解决？
>
> ✅ 标准答案：在 32 位整数语言（如 C++/Java）中，`left + right` 在两者都很大时会溢出为负数，导致 `mid` 计算错误。解决方案是 `left + ((right - left) >> 1)`——先算差值再除以 2，`right - left` 永远不会超过区间长度，不会溢出。
>
> 🎁 加分答案：能举出具体例子——`left = 1,500,000,000`，`right = 2,000,000,000`，`left + right = 3,500,000,000`，超过了 `INT_MAX`（2,147,483,647）溢出；而 `right - left = 500,000,000` 稳稳落在 int 范围内。还能补一句「这个 bug 真实存在于 Java 的 `Arrays.binarySearch` 里，2006 年才被发现并修复（Joshua Bloch 有篇著名的博客《Extra, Extra - Read All About It: Nearly All Binary Searches and Mergesorts are Broken》）」——能讲出这个出处，面试官会立刻对你刮目相看。

### 四种变体：面试真正的分水岭

标准二分搜索人人会写，但面试真正考的是**变体**——因为**真实业务里「找一个精确的目标值」反而是少数，「找边界」才是常态**（比如「第一个满足条件的」「最后一个满足条件的」）。下面四种是高频考点。

**变体 1：找目标值（标准版）**

就是上面讲的，不再重复。

**变体 2：找第一个 ≥ target 的位置（lower_bound）**

场景：药品价格区间筛选，找到第一个 ≥ 50 元的药品下标；或者「找第一个错误版本」。

```typescript
function lowerBound(arr: number[], target: number): number {
  let left = 0;
  let right = arr.length;  // 👈 注意：左闭右开区间 [left, right)
  while (left < right) {
    const mid = left + ((right - left) >> 1);
    if (arr[mid] < target) {
      left = mid + 1;  // 👈 mid 太小（严格小于），答案一定在右边
    } else {
      right = mid;  // 👈 mid 可能就是答案，不能排除，右边界收到 mid
    }
  }
  return left;  // 👈 left 就是第一个 ≥ target 的位置
}
```

关键点：**左闭右开区间 `[left, right)`**、循环条件 `left < right`、返回 `left`。

循环不变式是：**`left` 左侧（不含 `left`）的元素全部 `< target`**。循环结束时 `left === right`，此时 `left` 恰好是「第一个不满足 `< target` 的位置」，也就是第一个 `≥ target` 的位置。

注意 `right = mid`（**不加 `-1`**）——因为 `arr[mid] >= target` 时，`mid` 本身可能就是答案，不能排除。

**变体 3：找最后一个 ≤ target 的位置（upper_bound）**

场景：药品价格区间筛选，找到最后一个 ≤ 100 元的药品下标。

```typescript
function upperBound(arr: number[], target: number): number {
  let left = 0;
  let right = arr.length;  // 👈 左闭右开区间 [left, right)
  while (left < right) {
    const mid = left + ((right - left) >> 1);
    if (arr[mid] <= target) {
      left = mid + 1;  // 👈 mid 满足「<= target」，可能仍是答案，先记着继续往右找
    } else {
      right = mid;  // 👈 mid 太大（严格大于），答案在左边
    }
  }
  return left - 1;  // 👈 left - 1 就是最后一个 ≤ target 的位置
}
```

关键点：返回 `left - 1`。

这里的循环不变式是：**`left` 左侧（不含 `left`）的元素全部 `≤ target`**。循环结束时 `left` 指向**第一个 `> target` 的位置**，所以 `left - 1` 就是「最后一个 `≤ target` 的位置」。

**这两个函数其实就是一回事**：`upperBound(t) === lowerBound(t + 1) - 1`（在整数域上）。理解了这一点，你就明白为什么 LeetCode 34「找第一个和最后一个位置」的题解里，会写 `right = lowerBound(nums, target + 1) - 1`——它其实只写了一个函数。

**变体 4：旋转数组中查找（LeetCode 33）**

场景：有序数组在某个点上旋转了，如 `[4,5,6,7,0,1,2]`，找目标值。

```typescript
function search(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;
  while (left <= right) {
    const mid = left + ((right - left) >> 1);
    if (nums[mid] === target) return mid;

    // 👈 判断哪一半是有序的（旋转后的数组，必有一半有序）
    if (nums[left] <= nums[mid]) {
      // 左半 [left, mid] 有序
      if (nums[left] <= target && target < nums[mid]) {
        right = mid - 1;  // target 落在有序的左半里
      } else {
        left = mid + 1;   // 否则去右半找
      }
    } else {
      // 右半 [mid, right] 有序
      if (nums[mid] < target && target <= nums[right]) {
        left = mid + 1;   // target 落在有序的右半里
      } else {
        right = mid - 1;  // 否则去左半找
      }
    }
  }
  return -1;
}
```

关键点：**旋转后的数组，无论从哪个 `mid` 切开，一定有一半是完全有序的**。先判断哪半有序，再看 `target` 是否落在那个有序半区的值域内——在就收缩到那一半，不在就收缩到另一半。

> 💬 **面试官**：二分搜索有哪些常见变体？各自的核心区别是什么？
>
> ✅ 标准答案：常见四种变体：① 标准版找目标值；② lower_bound 找第一个 ≥ target 的位置（左闭右开区间，返回 `left`）；③ upper_bound 找最后一个 ≤ target 的位置（左闭右开区间，返回 `left - 1`）；④ 旋转数组搜索（每次判断哪一半有序，再判断 target 是否在该半区）。核心区别在于**区间定义和返回值**，而不要死记「`+1` 还是 `-1`」。
>
> 🎁 加分答案：能手写 lower_bound 和 upper_bound，并解释「为什么 lower_bound 返回 `left` 而 upper_bound 返回 `left - 1`」——lower_bound 的循环不变式是「`left` 左侧都 `< target`」，所以 `left` 就是第一个 `≥ target`；upper_bound 的循环不变式是「`left` 左侧都 `≤ target`」，所以 `left - 1` 是最后一个 `≤ target`。再补一句「`upperBound(t) = lowerBound(t+1) - 1`，两者本质是同一个函数」，能立刻拉开和其他候选人的差距。

### 变体拓展：旋转数组找最小值与含重复元素

上面第 4 种变体是「旋转数组 + 找目标值」，面试里还有两个它的亲戚，一起讲了。

**拓展 1：旋转数组中找最小值（LeetCode 153）**

题目：升序数组旋转后，找最小元素。比如 `[4,5,6,7,0,1,2]` 的最小值是 `0`。

思路和找目标值不同——这里比较的是 `nums[mid]` 和 `nums[right]`：

```typescript
function findMin(nums: number[]): number {
  let left = 0;
  let right = nums.length - 1;
  while (left < right) {              // 👈 注意：这里是 <，不是 <=
    const mid = left + ((right - left) >> 1);
    if (nums[mid] > nums[right]) {
      left = mid + 1;                 // 👈 mid 比右端大，最小值一定在 mid 右边
    } else {
      right = mid;                    // 👈 mid 比右端小，最小值在 mid 或左边
    }
  }
  return nums[left];                  // 👈 循环结束时 left === right，指向最小值
}
```

**为什么和右端比，不和左端比？** 因为「最小值」一定落在「断崖」的右侧低谷——`nums[mid] > nums[right]` 说明 `mid` 在左半段（上升段），最小值在右侧；否则 `mid` 在右半段（可能是低谷），最小值在 `mid` 或左边。和右端比较才能稳定地分辨这两段。

**拓展 2：含重复元素的旋转数组（LeetCode 81 / 154）**

如果数组里有重复元素，`nums[left] <= nums[mid]` 这个判断会失效——比如 `[1,1,1,0,1]`，`nums[left] === nums[mid] === 1`，你无法判断哪半有序。

解决办法很朴素：**遇到 `nums[left] === nums[mid] === nums[right]` 时，无法判断，就把边界收缩一格**（`left++` 或 `right--`，或两个都动）：

```typescript
function searchWithDup(nums: number[], target: number): boolean {
  let left = 0;
  let right = nums.length - 1;
  while (left <= right) {
    const mid = left + ((right - left) >> 1);
    if (nums[mid] === target) return true;
    // 👈 三端相等时无法判断哪半有序，退化为线性收缩一格
    if (nums[left] === nums[mid] && nums[mid] === nums[right]) {
      left++;
      right--;
      continue;
    }
    if (nums[left] <= nums[mid]) {
      if (nums[left] <= target && target < nums[mid]) right = mid - 1;
      else left = mid + 1;
    } else {
      if (nums[mid] < target && target <= nums[right]) left = mid + 1;
      else right = mid - 1;
    }
  }
  return false;
}
```

**代价**：最坏情况（数组全是同一个数）会退化成 **O(n)**——因为每次只能排除一格。这又是一个「没有结构信息，二分就退化为线性」的例子。

> 💬 **面试官**：旋转数组里有重复元素，二分还能用吗？复杂度是多少？
>
> ✅ 标准答案：能用，但最坏情况会退化为 O(n)。当 `nums[left] === nums[mid] === nums[right]` 时，无法判断哪一半有序，只能收缩一格边界（`left++` / `right--`）来化解，这一步是线性排除。极端情况下（数组元素全相同）每次只排除一格，整体退化为 O(n)。
>
> 🎁 加分答案：能对比「153 找最小值（无重复）O(logn)」和「154 找最小值（有重复）O(n)」的差异，并解释**根因是「重复元素抹掉了『哪半有序』这个结构信息」**——二分的威力来自「一次比较排除一半」，一旦这个性质被破坏（无法判断该排除哪半），性能就掉回线性。这个「重复/相等破坏单调性」的洞察，在二分答案、去重类题目里反复出现。

### 二分答案：把「求最优解」变成「判可行性」

这是二分搜索**最容易被忽略、却在真题里最高频**的一类应用。它不搜索数组下标，而是**搜索答案本身**。

**核心特征**：题目问「**最小的最大值**」或「**最大的最小值**」，并且「给定一个候选答案，判断它是否可行」这件事比「直接求出最优解」容易得多。

**通用套路**：

```
1. 确定答案的取值区间 [lo, hi]（比如「速度」从 1 到「最大堆的香蕉数」）
2. 写一个 check(x) 函数：判断「答案是 x」时是否可行
3. check 具有单调性：如果 x 可行，那么所有 ≥ x 的值都可（或反之）
4. 二分搜索这个区间，用 check 收缩边界，逼近最优解
```

**例题：LeetCode 875 爱吃香蕉的珂珂**

题目：有 `piles` 堆香蕉，你每小时选一堆吃，速度为 `k`（每小时吃 `k` 根，吃不完就留到下一小时继续）。求能在 `h` 小时内吃完的**最小速度 `k`**。

```typescript
function minEatingSpeed(piles: number[], h: number): number {
  // 👈 check：速度为 k 时，能否在 h 小时内吃完
  const canFinish = (k: number): boolean => {
    let hours = 0;
    for (const pile of piles) {
      hours += Math.ceil(pile / k);  // 👈 每堆耗时 = 向上取整
    }
    return hours <= h;
  };

  let lo = 1;                        // 👈 答案下界：速度至少为 1
  let hi = Math.max(...piles);       // 👈 答案上界：一次吃最大那堆即可
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (canFinish(mid)) {
      hi = mid;                      // 👈 mid 可行，试图找更小的
    } else {
      lo = mid + 1;                  // 👈 mid 不可行，必须更大
    }
  }
  return lo;
}
```

**为什么可以二分？** 因为「速度越大，耗时越短」——`canFinish(k)` 关于 `k` 是**单调的**（`k` 一大就可行）。这构成了天然的二段性：左边一段不可行、右边一段可行，二分就是找那个分界点。这其实就是 lower_bound 的思想，只不过「比较」换成了「可行性判断」。

**同类题**：LeetCode 1011「在 D 天内送达包裹的能力」（求最小运载重量）、LeetCode 410「分割数组的最大值」（求最小的『子数组和最大值』）、LeetCode LCR 073「爱吃香蕉的狒狒」——**同一个模板，换一个 `check` 函数而已**。

> 💬 **面试官**：什么样的题目适合用「二分答案」？怎么判断？
>
> ✅ 标准答案：当题目要求「最小的最大值」或「最大的最小值」，且「给定一个候选答案，判断是否可行」是容易的（O(n) 级别），同时这个可行性关于候选答案是**单调**的，就适合二分答案。做法是：确定答案的取值区间 → 写 `check(x)` 判可行 → 二分逼近分界点。
>
> 🎁 加分答案：能点出「二分答案本质是把『最优化问题』转成『判定问题 + 二分』」——直接求最优解往往很难（贪心不对、DP 状态复杂），但判断「某个值行不行」很简单，于是用二分把「找最优」变成「log(答案范围) 次判定」。再补一句「这就是学好二分的价值——它不只是在一个有序数组里查数，而是一种『在单调空间里快速定位分界点』的通用思维」。能举出 875 / 1011 / 410 是同一模板，说明你是真会而不是背过。

### 算法分析

- 每一次比较都使搜索范围缩小一半，所以最多比较 `log₂n` 次
- **时间复杂度：O(logn)**——10 万元素最多比较 17 次；10 亿次最多 30 次
- **空间复杂度：O(1)**（迭代版）/ O(logn)（递归版，调用栈深度）

---

## 四、内插搜索：均匀分布数据的加速版

### 简介

内插搜索（Interpolation Search）是二分搜索的改进版：

- 二分搜索**总是**检查 mid 位置上的值（固定砍一半）
- 内插搜索**根据目标值的比例估算位置**——如果数据均匀分布，能更快逼近目标

一句话类比：查纸质字典。你要查「apple」，不会从正中间翻开（二分），而是**直接翻到靠前的十分之一处**（内插）——因为你大概知道 a 开头的词在前面。这就是「用值的比例估计下标比例」。

### 算法思路

- 使用 position 公式估算一个位置：`position = low + ((target - arr[low]) / (arr[high] - arr[low])) * (high - low)`
- 如果这个值是待搜索值，算法执行完毕
- 如果待搜索值比选中值要小，则在选中值左边的子数组中寻找
- 如果待搜索值比选中值要大，则在选中值右边的子数组中寻找

![内插搜索：按目标值在区间中的比例直接估算位置](https://cdn.nlark.com/yuque/0/2022/png/738210/1645691041236-7b09d0f5-677b-46d5-b84d-01aca9a27b0c.png)

### 代码实现

先补齐辅助函数（这次用到 `lesserEquals`、`biggerEquals`、`defaultDiff` 和 `DOES_NOT_EXIST`）：

```typescript
// src/util/index.ts
export const defaultEquals = (a: any, b: any) => {
  return a === b;
}

export const lesserEquals = (a: any, b: any, compareFn: Function) => {
  const comp = compareFn(a, b);
  return comp === Compare.LESS_THAN || comp === Compare.EQUAL;
}

export const biggerEquals = (a: any, b: any, compareFn: Function) => {
  const comp = compareFn(a, b);
  return comp === Compare.BIGGER_THAN || comp === Compare.EQUAL;
}

export const defaultDiff = (a: any, b: any) => {
  return Number(a) - Number(b);
}

export enum Compare {
  LESS_THAN = -1,
  BIGGER_THAN = 1,
  EQUAL = 0
}

export const DOES_NOT_EXIST = -1;

export const defaultCompare = (a: any, b: any) => {
  if(a === b) {
    return Compare.EQUAL;
  }
  return a < b ? Compare.LESS_THAN : Compare.BIGGER_THAN;
}
```

然后实现内插搜索。注意循环条件里那三个判断——它们负责保证「目标值落在当前 `[low, high]` 的值域内」，避免 `position` 被估算到区间外：

```typescript
// src/algorithms/search/interpolation.ts
import {
  Compare,
  defaultCompare,
  defaultEquals,
  defaultDiff,
  biggerEquals,
  lesserEquals,
  DOES_NOT_EXIST,
} from "../../util";

export function interpolation(
  array: any[],
  target: any,
  compareFn = defaultCompare,
  equalsFn = defaultEquals,
  diffFn = defaultDiff
) {
  const { length } = array;
  let low = 0;
  let high = length - 1;
  let position = -1;
  let delta = -1;
  while (
    low <= high &&
    biggerEquals(target, array[low], compareFn) &&   // 👈 target ≥ arr[low]
    lesserEquals(target, array[high], compareFn)     // 👈 target ≤ arr[high]
  ) {
    // 👈 按目标值在 [arr[low], arr[high]] 中的比例，估算其下标位置
    delta = diffFn(target, array[low]) / diffFn(array[high], array[low]);
    position = low + Math.floor((high - low) * delta);
    if(equalsFn(array[position], target)) {
      return position;  // 👈 命中
    }
    if(compareFn(array[position], target) === Compare.LESS_THAN) {
      low = position + 1;  // 👈 目标在右边
    } else {
      high = position - 1;  // 👈 目标在左边
    }
  }
  return DOES_NOT_EXIST;
}
```

测试代码：

```typescript
// src/algorithms/search/interpolation.test.ts
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { interpolation } from '../interpolation';

describe('内插搜索 测试', () => {
  it('内插搜索', () => {
    const arr = [2, 3, 4, 5, 15, 19, 26, 27, 36, 38, 44, 46, 47, 48, 50];
    expect(interpolation(arr, 48)).to.be.deep.equal(13);
    expect(interpolation(arr, 58)).to.be.deep.equal(-1);
  });
});
```

### 算法分析

- **时间复杂度**：数据**均匀分布**时 **O(log log n)**（比二分更快）；数据**非均匀**时退化为 **O(n)**
- **空间复杂度：O(1)**

**为什么均匀分布能到 O(log log n)？** 因为每次估算的位置都「预测得很准」，区间收缩速度比二分更快——二分每轮把区间砍一半，内插在均匀分布下每轮能砍掉更多。而一旦数据分布严重倾斜（比如 `[1, 2, 3, 1000000]` 这种），比例公式估出来的位置会严重偏离，最坏情况下每次只排除一个元素，退化成线性。

> 💬 **面试官**：内插搜索和二分搜索的区别是什么？什么时候内插更快？
>
> ✅ 标准答案：二分每次固定取区间中点，内插按「目标值在值域中的比例」估算下标位置。当数据**均匀分布**时，内插的预估更准，平均复杂度 O(log log n)，优于二分的 O(logn)；但数据**分布不均**时会退化成 O(n)，反而不如二分稳定。
>
> 🎁 加分答案：能点出「这是『利用更多数据分布信息』换性能」的思路——二分只利用了「有序」这一条信息，内插额外假设了「大概均匀分布」，假设成立就更快、假设不成立就退化。**工程上选择内插通常要看数据特征**：像药品价格、时间戳、自增 ID 这类天然近似均匀的数据适合内插；用户年龄、收入、商品销量这类长尾分布的数据就不适合，用二分更稳。再补一句「斐波那契查找也是二分的变体，用黄金分割点 `mid = low + F(k-1) - 1` 选位置，目的是把『比较』换成『加法/减法』，在只能做加减法的老硬件上更快」——能一口气说出这三种，说明你把整个「有序查找」家族串起来了。

---

## 五、双指针与滑动窗口：把 O(n²) 暴力降到 O(n)

双指针和滑动窗口是**数组/字符串问题**的核心技巧，能把很多 O(n²) 的暴力解降到 O(n)。它和第 04 篇讲过的「双端队列 + 滑动窗口最大值」是一家人，都是「用两个移动的边界，把重复扫描省掉」。

### 双指针

双指针分两种基本形态：

**对撞指针**：两个指针从两端向中间移动，前提通常是**数组有序**——有序才能保证「移动某一边」是可推理的。

经典场景：两数之和 II（LeetCode 167）、盛最多水的容器（LeetCode 11）。

```typescript
// 两数之和 II（有序数组，LeetCode 167）
function twoSum(numbers: number[], target: number): number[] {
  let left = 0;
  let right = numbers.length - 1;
  while (left < right) {
    const sum = numbers[left] + numbers[right];
    if (sum === target) {
      return [left + 1, right + 1];  // 👈 题目要求下标从 1 开始
    } else if (sum < target) {
      left++;  // 👈 和太小，说明需要更大的数 → 左指针右移
    } else {
      right--;  // 👈 和太大，说明需要更小的数 → 右指针左移
    }
  }
  return [];
}
```

**核心洞察**：暴力解法是「枚举所有两两组合」O(n²)；双指针之所以能降到 O(n)，是因为**每一步都能确定地排除掉一整个方向**——和太小，那么「`left` 与任何比 `right` 小的数搭配」肯定更小，全都不用试了。

**快慢指针**：两个指针一快一慢同向移动，常用于**链表**。

经典场景：检测链表是否有环（LeetCode 141）、找链表中点、找倒数第 k 个节点。这部分在第 05 篇「链表」里已详细讲过，不再重复。

### 滑动窗口

滑动窗口（Sliding Window）是**双指针**在子串/子数组问题上的专门形态，用一个可变大小的窗口「扫描」整个数组：

- **右指针扩张**：不断扩大窗口，把新元素纳入窗口
- **左指针收缩**：窗口满足条件后，收缩窗口寻找更优解

根据窗口是否固定，有两套模板。

**模板 A：变长窗口（求最短/最长满足条件的子串）**

```typescript
// 变长窗口通用骨架
let left = 0;
let answer = 初始值;
for (let right = 0; right < n; right++) {
  // 1. 扩张：把 s[right] 加入窗口，更新窗口状态
  add(s[right]);

  // 2. 收缩：当窗口满足条件时，尝试收缩左边界找更优解
  while (窗口满足条件) {
    answer = 更新(answer);   // 👈 记录当前窗口是一个可行解
    remove(s[left]);         // 👈 移出左边元素
    left++;
  }
}
```

**模板 B：定长窗口（窗口大小固定为 k）**

```typescript
// 定长窗口通用骨架（维护一个大小为 k 的窗口，如「窗口内最大值」）
for (let right = 0; right < n; right++) {
  add(s[right]);
  if (right - left + 1 > k) {   // 👈 超长了，左边出队，保持窗口长度 = k
    remove(s[left]);
    left++;
  }
  if (right - left + 1 === k) {
    // 👈 此时窗口刚好 k 个元素，处理一次
    answer = 更新(answer);
  }
}
```

**怎么区分用哪个？** 看清题意：题干说「固定长度 k 的窗口」→ 模板 B；说「满足条件的最短/最长」→ 模板 A。两者的共同灵魂都是——**窗口只往前走不回退，`left` 和 `right` 都最多移动 n 次，所以总复杂度 O(n)**。

经典场景：无重复字符的最长子串（LeetCode 3，模板 A）、最小覆盖子串（LeetCode 76，模板 A）、滑动窗口最大值（LeetCode 239，模板 B + 单调双端队列，见第 04 篇）。

```typescript
// 无重复字符的最长子串（LeetCode 3）—— 变长窗口
function lengthOfLongestSubstring(s: string): number {
  const map = new Map<string, number>();  // 👈 记录字符最后一次出现的位置
  let left = 0;
  let maxLen = 0;
  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    if (map.has(char) && map.get(char)! >= left) {
      left = map.get(char)! + 1;  // 👈 遇到重复字符，左边界跳到它后面
    }
    map.set(char, right);
    maxLen = Math.max(maxLen, right - left + 1);  // 👈 更新最大长度
  }
  return maxLen;
}
```

> 💬 **面试官**：滑动窗口什么时候扩张右指针，什么时候收缩左指针？
>
> ✅ 标准答案：右指针负责**扩张窗口**——不断右移把新元素纳入窗口，直到窗口满足条件；左指针负责**收缩窗口**——当窗口满足条件后，不断右移左边界，直到窗口不再满足条件，收缩过程中记录最优解。核心思想是「先扩张到满足条件，再收缩到刚好不满足」。因为左右指针都只单向移动、各自最多走 n 步，整体复杂度是 O(n)。
>
> 🎁 加分答案：能举出具体例子并区分定长/变长——LeetCode 3 无重复最长子串是变长窗口，右指针每次右移一个字符，若新字符在窗口内已存在，左指针跳到重复字符的下一个位置；LeetCode 76 最小覆盖子串也是变长窗口，右指针扩张到包含所有目标字符后，左指针收缩到刚好不满足条件；而 LeetCode 239 滑动窗口最大值是**定长窗口**（窗口固定为 k），配合单调双端队列维护窗口内最大值。能讲清「变长窗口用 `while` 收缩、定长窗口用 `if` 维持长度」，说明你真的掌握了而不是背模板。再补一句「滑动窗口的本质是『单调性』——只有当你扩张和收缩的决策是可推理的（比如『加入新字符只会让窗口更不满足』），这个技巧才成立」，这是这题的满分答案。

---

## 六、BFS vs DFS：什么时候用广度，什么时候用深度

BFS（广度优先搜索）和 DFS（深度优先搜索）是**图和树的两大遍历策略**，面试必考。第 07 篇讲树、第 09 篇讲图时都用到它们，这里集中把「怎么选」讲透。

### 核心区别

| 维度 | BFS（广度优先） | DFS（深度优先） |
|------|----------------|----------------|
| 数据结构 | 队列（FIFO） | 栈 / 递归 |
| 遍历顺序 | 逐层遍历 | 一条路走到黑 |
| 适用场景 | 最短路径、层序遍历 | 所有路径、检测环、拓扑排序、回溯 |
| 空间复杂度 | O(w)，w 是最大宽度 | O(h)，h 是最大深度 |

```
BFS 遍历顺序（逐层扩散）         DFS 遍历顺序（一路到底）

        A                         A
      /   \                       │
     B     C                      B
    / \   / \                     │
   D   E F   G                    D
                                  │
队列：[A] → [B,C] → [C,D,E] → …    E
逐层访问，像水波扩散              一条路走到底，走不通再回退
```

### BFS：最短路径的专属算法

BFS 的核心特性：**在无权图上，第一次到达某个节点时，走过的路径一定是最短的**。

为什么？因为 BFS 是**逐层扩展**的——先访问距离起点 1 步的所有节点，再访问距离 2 步的所有节点……**第一次到达目标节点时，必然是经过最少步数的路径**。而 DFS 是「一条路走到黑」，它可能先沿着一条很长的路径到达目标，再回头发现另有一条更短的路，但那时已经晚了——DFS 不保证第一次到达最优。

```typescript
// 二叉树层序遍历（LeetCode 102）—— BFS 经典应用
function levelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];
  const result: number[][] = [];
  const queue: TreeNode[] = [root];
  while (queue.length > 0) {
    const levelSize = queue.length;  // 👈 先记住当前层的节点数
    const currentLevel: number[] = [];
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;  // 👈 队头出队
      currentLevel.push(node.val);
      if (node.left) queue.push(node.left);   // 👈 左子入队
      if (node.right) queue.push(node.right); // 👈 右子入队
    }
    result.push(currentLevel);
  }
  return result;
}
```

**注意 `levelSize` 这个写法**——它在进入内层循环前就固定了「这一层有多少个节点」，从而能把「一层」和「下一层」分开。这是层序遍历的标准套路，也是 BFS 求「最短路径长度」的关键（层号就是距离）。

**多源 BFS**：有时候起点不止一个。经典题是 LeetCode 994「腐烂的橘子」——所有腐烂橘子**同时**开始传播，求所有橘子腐烂的最短时间。解法是**一开始把所有腐烂橘子一起放进队列**，然后正常 BFS：

```typescript
// 多源 BFS 骨架：把所有起点一次性入队
const queue: [number, number][] = [];
let fresh = 0;
for (let i = 0; i < rows; i++) {
  for (let j = 0; j < cols; j++) {
    if (grid[i][j] === 2) queue.push([i, j]);   // 👈 所有腐烂橘子都是起点
    if (grid[i][j] === 1) fresh++;
  }
}
// 之后就是普通 BFS，每扩散一层就是「过了一分钟」
```

**为什么多源 BFS 有效？** 把「所有起点同时扩散」等价于「一个虚拟超级源点连向所有起点」的单源 BFS——第一次被某层扩散到的节点，就是被最近的那个源点覆盖到，距离自然最短。

### DFS：回溯与路径探索的专属算法

DFS 的核心特性：**沿着一条路走到黑，走不通就回溯**。

适用场景：

- 探索所有路径（如全排列、子集）
- 检测环（如课程表）
- 拓扑排序
- 回溯（如 N 皇后）

```typescript
// 二叉树最大深度（LeetCode 104）—— DFS 经典应用
function maxDepth(root: TreeNode | null): number {
  if (!root) return 0;
  return Math.max(maxDepth(root.left), maxDepth(root.right)) + 1;
}
```

**DFS 的迭代写法**：递归 DFS 依赖调用栈，深度过大时（比如链表形状的树）会栈溢出。这时可以用**显式栈**模拟：

```typescript
// 二叉树前序遍历 —— 迭代版（显式栈）
function preorderTraversal(root: TreeNode | null): number[] {
  if (!root) return [];
  const result: number[] = [];
  const stack: TreeNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;      // 👈 弹栈
    result.push(node.val);
    if (node.right) stack.push(node.right);  // 👈 注意：先压右后压左
    if (node.left) stack.push(node.left);    // 👈 这样左子先出栈，保证「根左右」
  }
  return result;
}
```

**为什么「先压右、后压左」？** 因为栈是 LIFO——后压入的先弹出。要让左子先被访问（先序遍历「根 → 左 → 右」），就得让左子后压栈、先出栈。这个细节是手写迭代遍历最容易错的地方。

**回顾 DFS 与回溯的关系**（第 15 篇会展开）：回溯 = **DFS + 撤销选择 + 剪枝**。普通 DFS 关心「能不能走到」，回溯关心「走的所有路径分别是什么，边走边撤销状态以便复用」。React Fiber 的 `completeUnitOfWork`（后面第八节会讲）就是「沿树回溯」的工程实现。

### 双向 BFS：从两头同时搜，快一个量级

如果**起点和终点都是确定的**，可以在 BFS 的基础上再快一步：**从起点和终点同时做 BFS，两边「碰头」就找到最短路径**。

经典题：LeetCode 127「单词接龙」——从 `beginWord` 变到 `endWord`，每次只能改一个字母，每步必须是字典里的词，求最短变换次数。

```
单向 BFS 的搜索空间          双向 BFS 的搜索空间

      S                        S ──→  ·  ←── E
     /|\                       │           │
    · · ·                      ·           ·       两头各展开一半
   /|\ /|\                     ↓           ↓       搜到「碰头」为止
  · · · · · ·                  · ──────→  · 
  展开到深度 d，最大 b^d 个   两边各展开 d/2，约 2·b^(d/2) 个节点
```

**为什么快？** BFS 的节点数随深度**指数增长**（分支因子 `b`，深度 `d`，约 `b^d` 个节点）。双向 BFS 两边各走一半深度 `d/2`，节点数是 `2 × b^(d/2)`——**从平方级降到「开根号」级别**，实际可能快几十上百倍。

```typescript
// 双向 BFS 骨架（简化，以 LeetCode 127 为例）
function ladderLength(beginWord: string, endWord: string, wordList: string[]): number {
  const wordSet = new Set(wordList);
  if (!wordSet.has(endWord)) return 0;

  let front = new Set([beginWord]);   // 👈 从起点出发的这一层
  let back = new Set([endWord]);      // 👈 从终点出发的这一层
  const visited = new Set([beginWord, endWord]);
  let steps = 1;

  while (front.size > 0 && back.size > 0) {
    // 👈 关键优化：每轮让「较小的一层」先扩展，控制两边的节点数平衡
    if (front.size > back.size) {
      [front, back] = [back, front];  // 交换，总是扩展小的一边
    }
    const next = new Set<string>();
    for (const word of front) {
      for (const neighbor of generateNeighbors(word)) {
        if (back.has(neighbor)) return steps + 1;  // 👈 两头碰上了！
        if (!wordSet.has(neighbor) || visited.has(neighbor)) continue;
        visited.add(neighbor);
        next.add(neighbor);
      }
    }
    front = next;
    steps++;
  }
  return 0;
}
```

`generateNeighbors` 要生成「改一个字母能得到的所有词」，通常把 `word` 的每个位置依次换成 `a-z`。

> 💬 **面试官**：双向 BFS 为什么比单向 BFS 快？什么时候能用？
>
> ✅ 标准答案：BFS 的搜索空间随深度指数增长（约 `b^d`）。双向 BFS 从起点和终点同时搜，各展开 `d/2` 层，节点数降到约 `2 × b^(d/2)`，量级上小得多。它成立的前提是**终点已知且明确**（知道要从哪头开始搜），并且从两头走的「邻居生成」逻辑一致。
>
> 🎁 加分答案：能补充两个工程细节——① 每轮选**较小的一层**扩展（`front`/`back` 交换）能让两边节点数尽量平衡，进一步压小搜索空间；② 碰头判定要在「生成邻居」时检查 `back.has(neighbor)`，一旦命中立刻返回，不要等整层展开完。再补一句「单向 BFS 空间复杂度 O(b^d)，双向降到 O(b^(d/2))，**空间才是双向 BFS 收益最大的地方**」——因为指数级空间的节省远比时间更关键。

> 💬 **面试官**：BFS 为什么能保证找到最短路径，而 DFS 不能？
>
> ✅ 标准答案：BFS 是逐层扩展的——先访问距离起点 1 步的所有节点，再访问距离 2 步的所有节点，第一次到达目标节点时必然经过最少步数。DFS 是沿着一条路走到黑，可能先走一条很长的路径到达目标，而不是最短路径。
>
> 🎁 加分答案：能对比空间复杂度——「BFS 的空间复杂度是 O(w)，w 是最大宽度，最坏是满二叉树最后一层约 O(n/2)；DFS 的空间复杂度是 O(h)，h 是最大深度，最坏退化为链表时是 O(n)」。所以有个经验法则：**路径长度为主、层数少（宽度小）时用 BFS；树很深很宽、但只关心某条路径时用 DFS**。若能再点出「BFS 找最短路径的前提是『边权相等』（无权图或权值都相同）——一旦边权不等，就要用 Dijkstra（第 09、16 篇）」这层，就是满分。

---

## 七、高频题精讲：8 道 LeetCode 实战

下面 8 道题是搜索相关的高频面试题，每题给出完整代码和复杂度分析。

### LeetCode 33：旋转数组搜索（二分变体）

**题目**：整数数组按升序排列，在某个点上旋转了。给你旋转后的数组和目标值，返回目标值的下标，不存在返回 -1。

**思路**：每次判断哪一半有序，再判断 target 是否在该半区。

```typescript
function search(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;
  while (left <= right) {
    const mid = left + ((right - left) >> 1);
    if (nums[mid] === target) return mid;

    if (nums[left] <= nums[mid]) {
      // 👈 左半 [left, mid] 有序
      if (nums[left] <= target && target < nums[mid]) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    } else {
      // 👈 右半 [mid, right] 有序
      if (nums[mid] < target && target <= nums[right]) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
  }
  return -1;
}
```

**复杂度**：时间 O(logn)，空间 O(1)。

**面试追问**：如果数组里有重复元素怎么办？（LeetCode 81）——需要额外判断 `nums[left] === nums[mid] === nums[right]` 的情况，此时无法判断哪半有序，只能 `left++`、`right--` 收缩一格，最坏退化为 O(n)。

### LeetCode 34：排序数组中查找第一个和最后一个位置

**题目**：给你一个升序数组和目标值，找出目标值在数组中的开始位置和结束位置。如果不存在，返回 `[-1, -1]`。

**思路**：用 lower_bound 找第一个 `≥ target` 的位置，用「`target + 1` 的 lower_bound 减一」找最后一个 `≤ target` 的位置。

```typescript
function searchRange(nums: number[], target: number): number[] {
  const lowerBound = (arr: number[], target: number): number => {
    let left = 0;
    let right = arr.length;
    while (left < right) {
      const mid = left + ((right - left) >> 1);
      if (arr[mid] < target) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    return left;
  };

  const left = lowerBound(nums, target);
  if (left === nums.length || nums[left] !== target) {
    return [-1, -1];  // 👈 目标值不存在
  }
  const right = lowerBound(nums, target + 1) - 1;  // 👈 巧妙：借 target+1 的 lower_bound
  return [left, right];
}
```

**复杂度**：时间 O(logn)，空间 O(1)。

**面试追问**：为什么 `right = lowerBound(nums, target + 1) - 1`？——`lowerBound(nums, target + 1)` 返回**第一个 `> target` 的位置**，减 1 就是最后一个 `≤ target` 的位置，也就是 target 的右边界。这个技巧把「upper_bound」复用成了「lower_bound」，只需写一个函数。

### LeetCode 374：猜数字大小（笔记完整实现）

**题目**：给定范围 `[1, n]`，有一个预设数字 `pick`，你可以调用 `guess(num)` 接口（返回 -1/1/0），猜中即返回该数字。

**思路**：这就是「猜数字」的真身——二分最优。每次猜中间值，根据反馈收缩一半区间。

```typescript
// src/algorithms/search/leetcode.ts
// todo 猜数字大小
/**
 * Forward declaration of guess API.
 * @param {number} num   your guess
 * @return              -1 if num is lower than the guess number
 *                       1 if num is higher than the guess number
 *                       otherwise return 0
 * var guess = function(num) {}
 */

function guess(n: number, pick: number) {
  return pick > n ? 1 : pick < n ? -1 : 0;
}

export function guessNumber(n: number, pick: number): any {
  console.time('猜数字大小');
  let end = n;
  let start = 1;
  while(start <= end) {
    const middle = Math.floor((start + end) / 2);
    const g = guess(middle, pick);
    if (g === 0) {
      console.timeEnd('猜数字大小');
      return middle;
    } else if(g === 1) {  // 在较大范围，猜的数小了
      start = middle + 1
    } else if( g === -1) {  // 在较小范围，猜的数大了
      end = middle - 1
    }
  }
};
```

测试代码：

```typescript
// src/algorithms/search/leetcode.test.ts
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { guessNumber } from '../leetcode';

describe('猜数字大小 测试', () => {
  it('猜数字大小', () => {
    expect(guessNumber(10, 6)).to.be.deep.equal(6);
  });
  it('猜数字大小', () => {
    expect(guessNumber(1000, 50)).to.be.deep.equal(50);
  });
  it('猜数字大小', () => {
    expect(guessNumber(1, 1)).to.be.deep.equal(1);
  });
  it('猜数字大小', () => {
    expect(guessNumber(2, 1)).to.be.deep.equal(1);
  });
  it('猜数字大小', () => {
    expect(guessNumber(2, 2)).to.be.deep.equal(2);
  })
});
```

**复杂度**：时间 O(logn)，空间 O(1)。

**面试追问**：`guess` 接口返回 -1 表示「猜大了」还是「猜小了」？——这是本题最容易写反的地方，**一定要先读清接口定义**（本题注释里 `-1` 表示 `num` 比答案小，即「你猜小了」）。实际面试可以主动确认一次接口语义，比闷头写反更稳。

**变体：LeetCode 278 第一个错误的版本** —— 就是本文开篇「找最后一个正常版本」的数组版。它用「找第一个坏版本」= lower_bound 思路：

```typescript
// LeetCode 278 骨架（isBadVersion 是给定的判定接口）
function firstBadVersion(n: number): number {
  let left = 1;
  let right = n;
  while (left < right) {          // 👈 左闭右开思路：找第一个满足条件的位置
    const mid = left + ((right - left) >> 1);
    if (isBadVersion(mid)) {
      right = mid;                // 👈 mid 是坏的，答案在 mid 或左边
    } else {
      left = mid + 1;             // 👈 mid 是好的，答案在右边
    }
  }
  return left;                    // 👈 left 就是第一个坏版本
}
```

### LeetCode 3：无重复字符的最长子串（滑动窗口）

**题目**：给定一个字符串，找出不含有重复字符的最长子串的长度。

**思路**：滑动窗口，右指针扩张，遇到重复字符时左指针跳到重复字符的下一个位置。

```typescript
function lengthOfLongestSubstring(s: string): number {
  const map = new Map<string, number>();
  let left = 0;
  let maxLen = 0;
  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    if (map.has(char) && map.get(char)! >= left) {
      left = map.get(char)! + 1;
    }
    map.set(char, right);
    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}
```

**复杂度**：时间 O(n)，空间 O(min(m, n))，m 是字符集大小。

**面试追问**：如果字符集是 ASCII，怎么优化空间？——用长度为 128 的数组代替 Map，把 `map.get(char)` 换成 `lastIndex[char.charCodeAt(0)]`，常数更小。**注意 `map.get(char)! >= left` 这个判断不能省**——如果重复字符出现在 `left` 左边（已被移出窗口），就不能再收缩左边界了，否则会错误地缩小窗口。

### LeetCode 76：最小覆盖子串（滑动窗口 + Map）

**题目**：给你两个字符串 s 和 t，返回 s 中涵盖 t 所有字符的最小子串。如果不存在，返回空字符串。

**思路**：变长滑动窗口——右指针扩张到包含所有目标字符后，左指针收缩到刚好不满足条件，过程中记录最短窗口。

```typescript
function minWindow(s: string, t: string): string {
  const need = new Map<string, number>();
  for (const char of t) {
    need.set(char, (need.get(char) || 0) + 1);
  }

  let left = 0;
  let valid = 0;  // 👈 窗口中「数量已满足 need 要求」的字符种类数
  let start = 0;
  let len = Infinity;
  const window = new Map<string, number>();

  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    if (need.has(char)) {
      window.set(char, (window.get(char) || 0) + 1);
      if (window.get(char) === need.get(char)) {
        valid++;  // 👈 该字符的数量刚好达标
      }
    }

    // 👈 收缩左边界：窗口已覆盖全部目标字符
    while (valid === need.size) {
      if (right - left + 1 < len) {
        start = left;
        len = right - left + 1;
      }
      const leftChar = s[left];
      left++;
      if (need.has(leftChar)) {
        if (window.get(leftChar) === need.get(leftChar)) {
          valid--;  // 👈 移出后该字符不再达标
        }
        window.set(leftChar, window.get(leftChar)! - 1);
      }
    }
  }

  return len === Infinity ? '' : s.substring(start, start + len);
}
```

**复杂度**：时间 O(|s| + |t|)——左右指针各最多走 |s| 步；空间 O(|s| + |t|)。

**面试追问**：`valid` 变量的作用是什么？——记录窗口中「数量已满足 `need` 要求」的字符**种类数**。当 `valid === need.size` 时，说明窗口已覆盖所有目标字符。**用种类计数而不是「比较两个 Map 是否相等」**，是把每次 O(字母表大小) 的判断降成了 O(1) 的关键优化。

### LeetCode 11：盛最多水的容器（双指针）

**题目**：给你 n 个非负整数，每个数代表坐标中的一个点 `(i, ai)`。找出其中的两条线，使得它们与 x 轴共同构成的容器可以容纳最多的水。

**思路**：对撞指针，左右指针从两端向中间移动，**每次移动较短的板**。

```typescript
function maxArea(height: number[]): number {
  let left = 0;
  let right = height.length - 1;
  let maxWater = 0;
  while (left < right) {
    const width = right - left;
    const h = Math.min(height[left], height[right]);
    maxWater = Math.max(maxWater, width * h);
    if (height[left] < height[right]) {
      left++;  // 👈 移动较短的板
    } else {
      right--;
    }
  }
  return maxWater;
}
```

**复杂度**：时间 O(n)，空间 O(1)。

**面试追问**：为什么移动较短的板？——容器容量由**较短的板**决定（`min(height[l], height[r]) × 宽度`）。移动较长的板，宽度必然变小，而高度受限于那块短板、只会不变或更小，容量必然减小；移动较短的板，虽然宽度变小，但**有可能遇到更高的板**，高度可能增大，容量才有机会变大。**这正是「双指针为什么正确」的证明核心——每一步都在排除掉一个不可能更优的选择**。

### LeetCode 875：爱吃香蕉的珂珂（二分答案）

**题目**：有 `piles` 堆香蕉，每小时选一堆按速度 `k` 吃，求能在 `h` 小时内吃完的最小速度 `k`。

**思路**：二分答案——答案区间 `[1, max(piles)]`，「速度可行」关于速度单调，二分逼近。

```typescript
function minEatingSpeed(piles: number[], h: number): number {
  const canFinish = (k: number): boolean => {
    let hours = 0;
    for (const pile of piles) hours += Math.ceil(pile / k);
    return hours <= h;
  };

  let lo = 1;
  let hi = Math.max(...piles);
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (canFinish(mid)) hi = mid;   // 👈 可行，尝试更小
    else lo = mid + 1;              // 👈 不可行，必须更大
  }
  return lo;
}
```

**复杂度**：时间 O(n log(max(piles)))，空间 O(1)。

**面试追问**：为什么 `hi = Math.max(...piles)`？——速度超过最大那堆的香蕉数没有任何意义（每小时吃掉的量不能超过这堆的剩余量），所以 `max(piles)` 是答案的天然上界。**确定好答案区间是二分答案的第一步，上下界取错会直接导致错误或效率下降**。

### LeetCode 127：单词接龙（双向 BFS）

**题目**：给 `beginWord`、`endWord` 和字典 `wordList`，每次只能改一个字母且中间词必须在字典里，求从 `beginWord` 到 `endWord` 的最短转换序列长度。

**思路**：双向 BFS——起点和终点同时逐层扩展，每轮扩展较小的一层，碰头即返回。

```typescript
function ladderLength(beginWord: string, endWord: string, wordList: string[]): number {
  const wordSet = new Set(wordList);
  if (!wordSet.has(endWord)) return 0;

  let front = new Set([beginWord]);
  let back = new Set([endWord]);
  const visited = new Set([beginWord, endWord]);
  let steps = 1;

  while (front.size > 0 && back.size > 0) {
    if (front.size > back.size) {           // 👈 总是扩展较小的一层
      [front, back] = [back, front];
    }
    const next = new Set<string>();
    for (const word of front) {
      // 👈 枚举「改一个字母」得到的所有候选词
      for (let i = 0; i < word.length; i++) {
        for (let c = 'a'.charCodeAt(0); c <= 'z'.charCodeAt(0); c++) {
          const neighbor = word.slice(0, i) + String.fromCharCode(c) + word.slice(i + 1);
          if (back.has(neighbor)) return steps + 1;  // 👈 两头碰头
          if (!wordSet.has(neighbor) || visited.has(neighbor)) continue;
          visited.add(neighbor);
          next.add(neighbor);
        }
      }
    }
    front = next;
    steps++;
  }
  return 0;
}
```

**复杂度**：时间 O(N × L × 26)，N 是字典词数、L 是单词长度；双向 BFS 把节点数从指数级的两端降到开根号级。空间 O(N)。

**面试追问**：为什么用 `Set` 而不是数组存「下一层」？——Set 天然去重，避免同一层里重复节点被反复展开；同时 `visited` 用 `Set` 保证 O(1) 判重。

### LeetCode 重点题索引

| 题号 | 题目 | 考点 | 难度 |
|------|------|------|------|
| 33 | 搜索旋转排序数组 | 二分变体（判断哪半有序） | 中等 |
| 34 | 在排序数组中查找元素的第一个和最后一个位置 | lower_bound / upper_bound | 中等 |
| 3 | 无重复字符的最长子串 | 变长滑动窗口 | 中等 |
| 76 | 最小覆盖子串 | 滑动窗口 + 哈希表计数 | 困难 |
| 11 | 盛最多水的容器 | 对撞双指针 | 中等 |
| 374 | 猜数字大小 | 二分标准版 | 简单 |
| 278 | 第一个错误的版本 | 二分找边界 | 简单 |
| 875 | 爱吃香蕉的珂珂 | 二分答案 | 中等 |
| 127 | 单词接龙 | 双向 BFS | 困难 |

---

## 八、前端工程落地：搜索算法就在你代码里

搜索算法不是面试专用，它就在你每天用的框架和工具源码里。

### React Fiber 的 DFS 工作循环

第 01、05 篇都提过 Fiber，这里从「搜索/遍历」的角度再切一刀：React Fiber 架构的核心是**可中断、可恢复**的渲染过程，实现这个特性的关键，就是把传统的**递归树遍历**改造成 **DFS 迭代遍历**。

**为什么不用递归？** 递归依赖调用栈，一旦开始就必须一口气走完，无法中途暂停让出主线程。Fiber 需要在任意节点暂停、让出主线程、之后恢复，所以必须用**迭代**模拟 DFS——把遍历状态存进堆上的 FiberNode 对象里，用 `while` 循环手动驱动。

核心代码结构（简化版）：

```typescript
// ReactFiberWorkLoop.js（简化）
function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);  // 👈 处理当前节点
  }
}

function performUnitOfWork(unitOfWork: Fiber): void {
  const next = beginWork(unitOfWork);  // 👈 递推：处理当前节点，返回第一个子节点
  if (next === null) {
    completeUnitOfWork(unitOfWork);  // 👈 没有子节点，开始回溯
  } else {
    workInProgress = next;  // 👈 继续深入子节点
  }
}

function completeUnitOfWork(unitOfWork: Fiber): void {
  let completedWork = unitOfWork;
  do {
    completeWork(completedWork);  // 👈 完成当前节点
    const sibling = completedWork.sibling;
    if (sibling !== null) {
      workInProgress = sibling;  // 👈 有兄弟节点，转去处理兄弟（换一条分支）
      return;
    }
    completedWork = completedWork.return;  // 👈 没有兄弟，回溯到父节点
  } while (completedWork !== null);
  workInProgress = null;
}
```

这就是 **DFS 迭代（非递归）实现的真实案例**：

- `performUnitOfWork` / `beginWork` 是**递推（下行）**——处理当前节点，深入第一个子节点
- `completeUnitOfWork` / `completeWork` 是**回溯（上行）**——没有子节点时，沿 `sibling` 找兄弟、沿 `return` 找父节点

```
Fiber DFS 迭代的「下行 + 上行」双阶段

        A◄──────────────────────┐
       / \                       │ 回溯：completeUnitOfWork
      B   C                      │ 沿 return 一路上行
     / \                       │
    D   E ────────────────────┘
    ▲
    │ 下行：beginWork / performUnitOfWork
    一路 child 指针深入到底
```

**对比一下递归 DFS**：递归版代码更短，但控制权在引擎手里；迭代版代码稍长，却能在任意一次循环后**检查是否该 `shouldYield()` 让出主线程**。这就是 Concurrent Mode 时间分片的物质基础——**能不能中断，取决于遍历的「状态」存在哪：存栈上（引擎管）就中断不了，存堆对象里（自己管）就能中断**。

> 💬 **面试官**：React Fiber 为什么用 DFS 迭代而不是递归？
>
> ✅ 标准答案：递归依赖调用栈，一旦开始就必须一口气走完，无法中途暂停让出主线程。Fiber 需要可中断、可恢复的渲染过程，所以用迭代模拟 DFS——`performUnitOfWork` 递推、`completeUnitOfWork` 回溯，把遍历状态保存在堆上的 FiberNode 对象里，可以在任意节点 `shouldYield()` 判断时间片、随时中断。
>
> 🎁 加分答案：能讲清「递推 + 回溯」的具体实现——`beginWork` 处理当前节点并返回第一个子节点（递推下行），`completeWork` 完成当前节点并沿 `sibling`/`return` 指针回溯（上行）；`completeUnitOfWork` 里那个 `do...while` 循环就是「一路上溯直到找到有兄弟的祖先，或到根为止」。还能提到「这是把控制权从引擎的调用栈夺回到用户态的手动循环里」，正是 Fiber 架构的灵魂。

### source-map 的二分查找：为什么能秒级定位源码位置

前端构建产物（打包、压缩后的 JS）报错时，堆栈里是「第 1 行第 128340 列」这样的位置。要想还原成源码位置，就要查 **source map**。

一份 source map 里有一张 `mappings` 表，记录了「生成代码的 `行:列` → 源码的 `行:列`」的对应关系。这张表**按生成位置排好序**——排序之后，就可以**二分查找**：给定一个报错位置，`lower_bound` 找到第一个 `≥` 它的映射项，就得到了最近的源码位置。

```
source map 定位（二分）

生成位置（已排序）：  [ (1,0)   (1,20)  (1,45)  (2,0)   (2,30) ... ]
报错位置：              (1,32)
                          ↓ lower_bound：找第一个 ≥ (1,32)
命中：                  (1,45) → 对应源码 L10:C5
```

**这就是为什么 Chrome DevTools 能在几十万列的压缩文件里瞬间定位到源码**——如果每次都线性扫描 mappings 表，几万个映射项逐个比对会很慢；二分把它压到 `log₂(几万) ≈ 16` 次比较。**你天天用的「点开报错跳转到源码」，背后就是一次二分查找。**

### git bisect：用二分定位「哪个提交引入的 bug」

这是本文开头「找最后一个正常版本」的工业级实现，也是二分在做**版本历史**上的搜索。

`git bisect` 的用法就是二分：

```bash
git bisect start
git bisect bad                 # 当前版本有 bug
git bisect good v1.2.0         # v1.2.0 是正常的
# Git 自动 checkout「好版本和坏版本的正中间」那个提交，你测一下
git bisect good                # 或 git bisect bad
# Git 继续对半砍，重复 log₂(提交数) 次
git bisect reset               # 结束，回到原分支
```

**为什么快？** 假设 bug 是 3 个月前引入的，这期间有 2000 个提交。线性排查要逐个试 2000 次；二分只需 `log₂(2000) ≈ 11` 次——**从几千次测试压到十几次**。这正是二分搜索「每次砍一半」在版本历史上的直接应用。**二分不只是数组算法，它是一种「在已排序（有序）空间里快速定位分界点」的通用思维**：有序数组、版本历史、source map 映射表，只要有序，就能二分。

### Fisher-Yates 洗牌：数组随机化的标准算法

Fisher-Yates 洗牌（Knuth Shuffle）是**数组随机化**的标准算法，时间复杂度 O(n)，空间复杂度 O(1)。

**算法思路**：

- 迭代数组，从最后一位开始
- 将当前位置和一个随机位置交换（随机位置比当前位置小或相等）
- 保证随机过的位置不会再被随机一次

![Fisher-Yates 洗牌：从后往前，每个位置与它之前（含自己）的随机位置交换](https://cdn.nlark.com/yuque/0/2022/png/738210/1645694288223-2f4bf87f-a061-43f0-a66f-57181a89880c.png)

**代码实现**：

```typescript
// src/util/index.ts
export function swap(array: any[], a: number, b: number) {
  /* const temp = array[a];
  array[a] = array[b];
  array[b] = temp; */
  [array[a], array[b]] = [array[b], array[a]];
}

// src/algorithms/search/shuffle.ts
import { swap } from '../../util';

export function shuffle(array: any[]) {
  let currentIndex = array.length;
  while(currentIndex !== 0) {
    const randomIndex = Math.floor(Math.random() * currentIndex);  // 👈 随机位置 < currentIndex
    currentIndex--;
    swap(array, currentIndex, randomIndex);  // 👈 交换
  }
  return array;
}
```

测试代码：

```typescript
// src/algorithms/search/shuffle.test.ts
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { shuffle } from '../shuffle';

describe('随机算法 测试', () => {
  it('随机算法', () => {
    const arr = [2, 3, 4, 5, 15, 19, 26, 27, 36, 38, 44, 46, 47, 48, 50];
    console.log(shuffle(arr));
    console.log(shuffle(arr));
  });
});
```

**为什么公平？** 从后往前，第 `i` 个位置从「它本身及之前的所有元素」里等概率挑一个交换过去。**每个元素落到每个位置的概率都是 `1/n`**，产生的是 `n!` 种排列的均匀分布——这是它能成为「标准洗牌算法」的原因。

**为什么不用 `array.sort(() => Math.random() - 0.5)`？** 因为 `sort` 的比较函数要求满足「传递性」——如果 a > b 且 b > c，则 a > c。随机比较**不满足传递性**，排序引擎（V8 用的是 TimSort，见第 10 篇）在这种「自相矛盾」的比较下会产生**不均匀**的结果：某些排列出现的概率明显更高（实测下大约 1/3 的排列会被系统性偏向）。**这不是「随机性不够」，而是「分布根本不均匀」——看起来洗了牌，其实可被预测**。

> 💬 **面试官**：Fisher-Yates 洗牌的原理是什么？为什么不用 `sort(() => Math.random() - 0.5)`？
>
> ✅ 标准答案：Fisher-Yates 从最后一位开始，将当前位置和一个「位置 ≤ 当前」的随机位置交换，保证每个元素等概率出现在任意位置，时间复杂度 O(n)、空间 O(1)。`sort(() => Math.random() - 0.5)` 的比较函数不满足传递性，导致排序结果不均匀，某些排列出现概率显著更高，不是真正的随机洗牌。
>
> 🎁 加分答案：能证明 Fisher-Yates 的公平性——第 `i` 个元素最终出现在第 `j` 个位置的概率是 `1/n`（可用归纳法或直接计算「到达该位置的概率乘积」）。还能提到「React 列表随机排序、抽奖、随机推荐、A/B 分桶都常用 Fisher-Yates」；再补一句「如果只是需要『取 k 个不重复随机元素』，用『部分洗牌』（只洗前 k 个）即可，O(k) 而非 O(n)」——这个优化在「从 10 万条里随机抽 10 条」的场景里非常实用。

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 考察频率 |
|--------|-----------|---------|
| 顺序搜索 | 遍历数组逐个比对，O(n) 时间 O(1) 空间，无序数据的唯一通用选择 | ⭐ 低频 |
| 二分搜索 | 每次缩小一半范围，O(logn)，关键是循环不变式 `[left, right]` | ⭐⭐⭐ 必考 |
| 三种写法 | 闭区间 / 左闭右开 / 左开右开——区间定义、循环条件、边界更新必须三者自洽 | ⭐⭐⭐ 必考 |
| 二分变体 | lower_bound 找第一个 ≥ target，upper_bound 找最后一个 ≤ target，旋转数组判断哪半有序 | ⭐⭐⭐ 必考 |
| mid 溢出 | `left + ((right - left) >> 1)` 代替 `(left + right) / 2`，避免 32 位溢出 | ⭐⭐⭐ 必考 |
| 二分答案 | 把「求最优解」转成「判可行性 + 二分」，适合「最小的最大值 / 最大的最小值」 | ⭐⭐⭐ 必考 |
| 内插搜索 | 按目标值比例估算位置，均匀分布 O(log log n)，非均匀退化 O(n) | ⭐ 低频 |
| 双指针 | 对撞指针（有序）、快慢指针（链表），O(n) 解决 O(n²) 暴力 | ⭐⭐ 高频 |
| 滑动窗口 | 变长窗口用 `while` 收缩、定长窗口用 `if` 维持长度，左右各走 n 步 → O(n) | ⭐⭐⭐ 必考 |
| BFS | 队列实现，逐层遍历，无权图上第一次到达即最短路径 | ⭐⭐⭐ 必考 |
| DFS | 栈/递归实现，一条路走到黑，适合所有路径、检测环、拓扑排序、回溯 | ⭐⭐⭐ 必考 |
| 双向 BFS | 起点终点同时搜、每轮扩展较小一层，把搜索空间从 `b^d` 降到 `b^(d/2)` | ⭐⭐ 高频 |
| React Fiber | DFS 迭代实现，`beginWork` 递推 + `completeUnitOfWork` 回溯，支撑时间分片 | ⭐⭐⭐ 必考 |
| Fisher-Yates | 从后往前随机交换，O(n) 真正均匀洗牌，`sort(random)` 分布不均 | ⭐⭐ 高频 |

> 💡 记住这条主线：**搜索算法的核心是「利用数据的结构信息」——无序数据只能顺序搜索（O(n)），有序数据用二分（O(logn)），均匀分布用内插（O(log log n)），需要频繁查找用哈希表（O(1)）**。而二分不只用于数组——只要是「有序/单调空间」，版本历史（git bisect）、source map 映射表、乃至「答案的取值区间」（二分答案），都能二分。双指针和滑动窗口是数组/字符串问题的降维打击，BFS/DFS 是图和树的两大遍历策略。把这些认出来，你就不再是「会用 API 的人」，而是「能看懂框架为什么这样设计的人」。

---

## 📝 留个问题

React Fiber 的 `workLoopSync` 是 DFS 迭代实现，那 Concurrent Mode 的 `workLoopConcurrent` 和它有什么区别？提示：想想 `shouldYield()` 的作用、时间片用完后的恢复机制、以及为什么 Concurrent Mode 需要 `workInProgress` 树和 `current` 树双缓存。

再补一个：如果说「凡是有序的地方就能二分」，那**一个乱序数组里的「第 K 大元素」，能不能也用二分的思想解决**？（提示：结合第 08 篇的堆 / 快速选择）

欢迎在评论区写出你的答案 👇

---

## 参考资料

- 《算法》（Sedgewick / Wayne，第 4 版）——二分搜索、BFS/DFS 经典教材
- 《算法导论》（CLRS，第 3 版）——循环不变式的严格定义、主定理
- labuladong 算法笔记——二分搜索变体、滑动窗口模板（社区总结）
- React Reconciler 源码——Fiber 架构 DFS 工作循环实现
- V8 官方博客——数组优化与 TimSort 实现
- LeetCode 33/34/3/76/11/374/278/875/127——搜索高频题

> 推荐搜索关键词：「二分搜索 循环不变式」「lower_bound upper_bound 区别」「二分答案 模板」「滑动窗口 定长 变长 模板」「BFS 最短路径 为什么」「双向 BFS 单词接龙」「React Fiber workLoopSync DFS」「Fisher-Yates 洗牌 公平性证明」「git bisect 二分定位 bug」。

---

> 🔖 这是「前端数据结构与算法」系列第 11 篇。上一篇：《排序：V8 TimSort 源码解析/快排/归并/稳定性全解》；下一篇预告：《递归：递归三要素/尾递归/记忆化到 DP 的跨越》
