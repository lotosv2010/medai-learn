# 搜索算法完全指南：二分变体、BFS/DFS 与滑动窗口（面试收藏级）

> **副标题**：循环不变式建立二分思维，BFS/DFS 选择策略，双指针与滑动窗口

> 面试官微笑着说：「手写一个二分搜索吧。」你心里想「这还不简单」，提笔就写——结果面试官接着问：「为什么用 `left <= right` 而不是 `left < right`？`mid = (left + right) / 2` 有什么问题？」你愣住了。二分搜索人人会写，但能把**循环不变式**讲清楚、把**四种变体**写对的人，不到 10%。这篇文章，就是把「搜索」这个看似简单的主题，从「会写」提升到「讲透」。

---

## 🎯 这篇文章解决什么问题

这是「**前端数据结构与算法**」系列的第 **11 篇**。整个系列 16 篇，从数据结构到算法设计思想，把一名前端工程师该有的算法体系系统补齐。

搜索是前端日常开发中**最不起眼却最常用**的操作——你每天都在用 `indexOf`、`find`、`includes`，但很少想过它们底层是什么算法、什么复杂度。面试里，搜索相关题目（二分、双指针、滑动窗口、BFS/DFS）却是**绝对高频**，尤其是二分搜索的边界处理，堪称「细节决定成败」的典范。

这一篇，围绕一条主线展开：**先用真实前端场景证明「搜索就在你代码里」，再把每个算法从原理到变体到面试考法讲透，最后落到 React Fiber 源码和 Fisher-Yates 洗牌这些真实工程案例**。

读完你会获得：

- **二分搜索的「循环不变式」思维**——从此写二分不再靠运气
- **四种二分变体**——lower_bound、upper_bound、旋转数组，一网打尽
- **双指针与滑动窗口**——把 O(n²) 暴力降到 O(n) 的核心技巧
- **BFS vs DFS 的选择策略**——最短路径用 BFS、回溯用 DFS，不再混淆
- **5 道 LeetCode 高频题**精讲——33/34/3/76/11，每题带完整代码和复杂度分析
- **React Fiber 的 DFS 工作循环**——`workLoopSync` 为什么用迭代而不是递归

---

## 一、场景切入：前端每天都在搜索，只是你没意识到

先说结论，再逐个拆解：**你以为搜索离你很远，其实你每天都在用，只是它被 JS 原生方法和框架「藏」起来了**。

🔧 **真实场景**：在药品电商的「药品搜索页」，用户输入关键词后要在 10 万条药品记录里找匹配项。如果用 `indexOf` 顺序搜索，最坏情况要扫完 10 万条；如果数据有序，用二分搜索最多比较 17 次——**10 万 vs 17，这就是 O(n) 和 O(logn) 的差距**。

下面三个场景，任何一个前端都写过，但它们的搜索算法选型逻辑，大多数人从没认真想过。

### `indexOf` 为什么慢

JS 数组的 `indexOf` 方法是**顺序搜索**——从数组第一个元素开始，逐个比对，命中返回下标，未命中返回 -1：

```javascript
const arr = [3, 44, 38, 5, 47, 15, 36, 26, 27, 2, 46, 4, 19, 50, 48];
arr.indexOf(48);  // 返回 14，但要扫到第 15 个元素才找到
arr.indexOf(100); // 返回 -1，要扫完全部 15 个元素才知道没有
```

时间复杂度 **O(n)**，空间复杂度 **O(1)**。对于无序数据，这是**唯一的通用选择**——因为没有任何结构信息可以利用，只能逐个比对。

但如果数据是**有序的**，情况完全不同。

### 有序数据用二分：猜数字怎么 O(logn)

玩过一个猜数字游戏吗？我想一个 1 到 100 之间的数字，你来猜，我告诉你「大了」还是「小了」。最优策略是**每次都猜中间值**：

- 猜 50 → 小了 → 范围缩到 51-100
- 猜 75 → 大了 → 范围缩到 51-74
- 猜 62 → 中了！

最多 7 次（log₂100 ≈ 6.64）就能猜中任意数字——这就是**二分搜索**的核心思想：**每次把搜索范围缩小一半**。

🔧 **真实场景**：药品价格区间筛选。假设有 10 万种药品按价格排序，用户筛选「50-100 元区间」，用二分搜索找到第一个 ≥ 50 的位置和最后一个 ≤ 100 的位置，O(logn) 搞定；用顺序搜索要扫 10 万次。

### 前端路由匹配：Trie + DFS

Vue Router / React Router 的动态路由 `/user/:id/profile`，底层是**Trie（前缀树）+ DFS（深度优先搜索）**：

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

> 💬 **面试官**：`Array.prototype.indexOf` 的时间复杂度是多少？大列表下怎么优化？
>
> ✅ 标准答案：`indexOf` 是顺序搜索，时间复杂度 O(n)，空间复杂度 O(1)。大列表优化方向：① 如果数据有序，改用二分搜索降到 O(logn)；② 如果需要频繁查找，提前建立哈希表（Map/Set），用空间换时间降到 O(1)；③ 如果是前端列表渲染，用虚拟列表减少 DOM 节点数，从根本上降低搜索规模。
>
> 🎁 加分答案：能提到「V8 对 `indexOf` 做过优化——小数组用线性扫描，大数组会根据 Elements Kind 选择不同策略，但本质仍是 O(n)」。再补一句「如果需要在大列表里频繁查找，更好的方案是提前排序 + 二分，或者直接用 Map 建立索引，而不是每次都 `indexOf`」。

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

![搜索算法复杂度对比](https://cdn.nlark.com/yuque/0/2022/png/738210/1641565921851-5daab165-6696-4bee-8c6c-6913f3ec7679.png)

这张表是后面所有章节的基础——接下来我们逐个拆解。

---

## 二、顺序搜索：最简单也最常用

### 算法思路

顺序搜索（Sequential Search）是最朴素的搜索算法：

- 遍历数组，逐个比对每个元素
- 找到跟目标值相等的元素，就返回它的下标
- 遍历结束后，如果没有搜索到目标值，就返回 -1

![顺序搜索图解](https://cdn.nlark.com/yuque/0/2022/png/738210/1645684601309-ac5e1766-e147-4eca-9b91-576e6cf9cb25.png)

### 代码实现

先定义一个通用的相等比较函数：

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
- 需要**频繁查找** → 提前建哈希表

🔧 **真实场景**：药品搜索历史记录。用户最近搜索过的 10 个关键词存在数组里，要判断某个关键词是否已存在——数据量小（10 个）、无序，直接 `indexOf` 顺序搜索就是最优解，没必要上二分。

---

## 三、二分搜索：前端算法面试的绝对高频

二分搜索（Binary Search）是面试的**绝对高频考点**，也是「会写但写不对」的重灾区。核心难点不在于「知道思路」，而在于**边界处理**——`left <= right` 还是 `left < right`？`mid + 1` 还是 `mid`？`right - 1` 还是 `right`？

### 算法思路

二分搜索的前提是**数组有序**：

- 从数组的中间元素开始，如果中间元素正好是目标值，则搜索结束
- 如果目标值大于或小于中间值，则在大于或小于中间元素的那一半数组中搜索
- 搜索结束后，如果没有搜索到目标值，就返回 -1

![二分搜索图解](https://cdn.nlark.com/yuque/0/2022/png/738210/1645684573414-4d458fe5-2bd5-486e-be5b-7113a24780d1.png)

### 循环不变式：二分思维的基石

**循环不变式（Loop Invariant）**是理解二分搜索的关键——它指在循环的每次迭代前后都保持成立的性质。

对于二分搜索，循环不变式是：**答案始终在 `[left, right]` 闭区间内**。

每次迭代：
- `mid = (left + right) / 2`
- 如果 `arr[mid] < target`，说明答案在右半部分 → `left = mid + 1`
- 如果 `arr[mid] > target`，说明答案在左半部分 → `right = mid - 1`
- 如果 `arr[mid] === target`，找到答案

**为什么用 `left <= right` 而不是 `left < right`？** 因为 `[left, right]` 是闭区间，当 `left === right` 时区间内还有一个元素没检查，必须继续循环；如果用 `left < right`，当 `left === right` 时会漏掉最后一个元素。

> 💬 **面试官**：二分搜索的循环不变式是什么？为什么用 `left <= right` 而不是 `left < right`？
>
> ✅ 标准答案：循环不变式是「答案始终在 `[left, right]` 闭区间内」。用 `left <= right` 是因为闭区间包含 `left === right` 的情况——此时区间内还有一个元素需要检查，如果改成 `left < right` 会漏掉这个元素导致错误。
>
> 🎁 加分答案：能进一步解释「闭区间 vs 左闭右开区间」两种写法的区别——闭区间 `[left, right]` 对应 `while (left <= right)` + `left = mid + 1` / `right = mid - 1`；左闭右开 `[left, right)` 对应 `while (left < right)` + `left = mid + 1` / `right = mid`。两种写法都对，关键是**保持循环不变式的一致性**。能讲清这个，说明你真正理解了二分搜索的本质。

### 代码实现：迭代版

先定义比较函数：

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
  const sortArray = quick(array);  // 👈 先排序（前提）
  let low = 0;
  let high = array.length - 1;
  while(low <= high) {  // 👈 闭区间，等号必须有
    const mid = Math.floor((low + high) / 2);
    const element = sortArray[mid];
    if (compareFn(element, target) === Compare.LESS_THAN) {
      low = mid + 1;  // 👈 答案在右半，左边界右移
    } else if (compareFn(element, target) === Compare.BIGGER_THAN) {
      high = mid - 1;  // 👈 答案在左半，右边界左移
    } else {
      return mid;  // 👈 命中
    }
  }
  return -1;  // 👈 未命中
}
```

### 代码实现：递归版

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

### mid 溢出问题：一个隐藏的大坑

上面的代码有个隐藏问题：`Math.floor((low + high) / 2)` 在 `low + high` 很大时会**溢出**。

在 JS 里，数字是 64 位浮点数，理论上 `low + high` 最大到 `Number.MAX_SAFE_INTEGER`（约 9 × 10¹⁵）才会溢出，实际场景很难遇到。但在 C++/Java 等 32 位整数语言里，`int mid = (low + high) / 2;` 当 `low` 和 `high` 都接近 `INT_MAX`（约 21 亿）时，`low + high` 会溢出为负数，导致 `mid` 计算错误。

**解决方案**：用 `left + ((right - left) >> 1)` 代替 `(left + right) / 2`：

```typescript
// ❌ 有溢出风险（C++/Java 中）
const mid = Math.floor((low + high) / 2);

// ✅ 无溢出风险（推荐）
const mid = low + Math.floor((high - low) / 2);

// ✅ 位运算更快（推荐）
const mid = low + ((high - low) >> 1);
```

> 💬 **面试官**：二分搜索中，`mid = (left + right) / 2` 有什么问题？如何解决？
>
> ✅ 标准答案：在 32 位整数语言（如 C++/Java）中，`left + right` 在两者都很大时会溢出为负数，导致 `mid` 计算错误。解决方案是 `left + ((right - left) >> 1)`——先算差值再除以 2，避免溢出。JS 里数字是 64 位浮点数，理论上不会溢出，但养成这个习惯是面试加分项。
>
> 🎁 加分答案：能举出具体例子——`left = 1,500,000,000`，`right = 2,000,000,000`，`left + right = 3,500,000,000` 超过 `INT_MAX`（2,147,483,647）溢出；而 `right - left = 500,000,000` 不会溢出。还能提到「`>>` 是位运算右移，等价于除以 2 向下取整，比 `Math.floor((right - left) / 2)` 更快」。

### 四种变体：面试真正的分水岭

标准二分搜索人人会写，但面试真正考的是**变体**——下面四种是高频考点。

**变体 1：找目标值（标准版）**

上面已经讲过，不再重复。

**变体 2：找第一个 ≥ target 的位置（lower_bound）**

场景：药品价格区间筛选，找到第一个 ≥ 50 元的药品下标。

```typescript
function lowerBound(arr: number[], target: number): number {
  let left = 0;
  let right = arr.length;  // 👈 注意：左闭右开区间 [left, right)
  while (left < right) {
    const mid = left + ((right - left) >> 1);
    if (arr[mid] < target) {
      left = mid + 1;  // 👈 mid 太小，答案在右边
    } else {
      right = mid;  // 👈 mid 可能是答案，但不能确定，右边界左移
    }
  }
  return left;  // 👈 left 就是第一个 ≥ target 的位置
}
```

关键点：**左闭右开区间 `[left, right)`**，循环条件 `left < right`，返回 `left`。

**变体 3：找最后一个 ≤ target 的位置（upper_bound）**

场景：药品价格区间筛选，找到最后一个 ≤ 100 元的药品下标。

```typescript
function upperBound(arr: number[], target: number): number {
  let left = 0;
  let right = arr.length;  // 👈 左闭右开区间 [left, right)
  while (left < right) {
    const mid = left + ((right - left) >> 1);
    if (arr[mid] <= target) {
      left = mid + 1;  // 👈 mid 可能是答案，但不能确定，左边界右移
    } else {
      right = mid;  // 👈 mid 太大，答案在左边
    }
  }
  return left - 1;  // 👈 left - 1 就是最后一个 ≤ target 的位置
}
```

关键点：返回 `left - 1`，因为 `left` 最终指向第一个 > target 的位置。

**变体 4：旋转数组中查找（LeetCode 33）**

场景：有序数组在某个点上旋转了，如 `[4,5,6,7,0,1,2]`，找目标值。

```typescript
function search(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;
  while (left <= right) {
    const mid = left + ((right - left) >> 1);
    if (nums[mid] === target) return mid;
    
    // 👈 判断哪一半是有序的
    if (nums[left] <= nums[mid]) {
      // 左半有序
      if (nums[left] <= target && target < nums[mid]) {
        right = mid - 1;  // target 在左半
      } else {
        left = mid + 1;   // target 在右半
      }
    } else {
      // 右半有序
      if (nums[mid] < target && target <= nums[right]) {
        left = mid + 1;   // target 在右半
      } else {
        right = mid - 1;  // target 在左半
      }
    }
  }
  return -1;
}
```

关键点：**每次判断哪一半有序，然后判断 target 是否在这个有序半区里**。

> 💬 **面试官**：二分搜索有哪些常见变体？各自的核心区别是什么？
>
> ✅ 标准答案：常见四种变体：① 标准版找目标值；② lower_bound 找第一个 ≥ target 的位置（左闭右开区间，返回 left）；③ upper_bound 找最后一个 ≤ target 的位置（左闭右开区间，返回 left - 1）；④ 旋转数组搜索（每次判断哪一半有序，再判断 target 是否在该半区）。核心区别在于**区间定义和返回值**。
>
> 🎁 加分答案：能手写 lower_bound 和 upper_bound，并解释「为什么 lower_bound 返回 left 而 upper_bound 返回 left - 1」——lower_bound 的循环不变式是「left 左侧都 < target」，所以 left 就是第一个 ≥ target；upper_bound 的循环不变式是「left 左侧都 ≤ target」，所以 left - 1 是最后一个 ≤ target。能讲清这个，说明你真正理解了二分变体的循环不变式。

### 算法分析

- 每一次比较都使搜索范围缩小一半
- **时间复杂度：O(logn)**——10 万元素最多比较 17 次
- **空间复杂度：O(1)**（迭代版）/ O(logn)（递归版，调用栈深度）

---

## 四、内插搜索：均匀分布数据的加速版

### 简介

内插搜索（Interpolation Search）是二分搜索的改进版：

- 二分搜索总是检查 mid 位置上的值
- 内插搜索**根据目标值的比例估算位置**——如果数据均匀分布，能更快逼近目标

类比：查字典。你要查「apple」，不会从中间翻开（二分），而是直接翻到前面 1/10 处（内插）。

### 算法思路

- 使用 position 公式估算一个位置：`position = low + ((target - arr[low]) / (arr[high] - arr[low])) * (high - low)`
- 如果这个值是待搜索值，算法执行完毕
- 如果待搜索值比选中值要小，则在选中值左边的子数组中寻找
- 如果待搜索值比选中值要大，则在选中值右边的子数组中寻找

![内插搜索图解](https://cdn.nlark.com/yuque/0/2022/png/738210/1645691041236-7b09d0f5-677b-46d5-b84d-01aca9a27b0c.png)

### 代码实现

先定义辅助函数：

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

然后实现内插搜索：

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
    biggerEquals(target, array[low], compareFn) &&
    lesserEquals(target, array[high], compareFn)
  ) {
    // 👈 按目标值比例估算位置
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

- **时间复杂度**：均匀分布数据 **O(log log n)**，非均匀数据退化为 **O(n)**
- **空间复杂度：O(1)**

### 什么时候用内插搜索

- 数据**均匀分布**（如药品价格、日期、ID）→ 内插搜索优于二分
- 数据**非均匀分布** → 内插搜索可能退化到 O(n)，不如二分

🔧 **真实场景**：药品价格区间筛选。药品价格通常在 1-1000 元之间近似均匀分布，用内插搜索比二分更快逼近目标区间。

---

## 五、双指针与滑动窗口：把 O(n²) 暴力降到 O(n)

双指针和滑动窗口是**数组/字符串问题**的核心技巧，能把很多 O(n²) 的暴力解降到 O(n)。

### 双指针

双指针分两种：

**对撞指针**：两个指针从两端向中间移动，前提是**数组有序**。

经典场景：两数之和（LeetCode 167）、盛最多水的容器（LeetCode 11）。

```typescript
// 两数之和（有序数组）
function twoSum(numbers: number[], target: number): number[] {
  let left = 0;
  let right = numbers.length - 1;
  while (left < right) {
    const sum = numbers[left] + numbers[right];
    if (sum === target) {
      return [left + 1, right + 1];  // 👈 题目要求下标从 1 开始
    } else if (sum < target) {
      left++;  // 👈 和太小，左指针右移
    } else {
      right--;  // 👈 和太大，右指针左移
    }
  }
  return [];
}
```

**快慢指针**：两个指针一快一慢同向移动，常用于**链表**。

经典场景：检测链表是否有环（LeetCode 141）、找链表中点。这部分在第 5 篇「链表」里已详细讲过，不再重复。

### 滑动窗口

滑动窗口（Sliding Window）是**可变大小窗口**求满足条件的最短/最长子串：

- **右指针扩张**：不断扩大窗口，直到满足条件
- **左指针收缩**：满足条件后，不断收缩窗口，直到不满足条件

经典场景：无重复字符的最长子串（LeetCode 3）、最小覆盖子串（LeetCode 76）。

```typescript
// 无重复字符的最长子串（LeetCode 3）
function lengthOfLongestSubstring(s: string): number {
  const map = new Map<string, number>();  // 👈 记录字符最后一次出现的位置
  let left = 0;
  let maxLen = 0;
  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    if (map.has(char) && map.get(char)! >= left) {
      left = map.get(char)! + 1;  // 👈 收缩左边界
    }
    map.set(char, right);
    maxLen = Math.max(maxLen, right - left + 1);  // 👈 更新最大长度
  }
  return maxLen;
}
```

> 💬 **面试官**：滑动窗口什么时候扩张右指针，什么时候收缩左指针？
>
> ✅ 标准答案：右指针负责**扩张窗口**——不断右移把新元素纳入窗口，直到窗口满足条件；左指针负责**收缩窗口**——当窗口满足条件后，不断右移左边界，直到窗口不再满足条件。核心思想是「先扩张到满足条件，再收缩到刚好不满足」，这个过程中记录最优解。
>
> 🎁 加分答案：能举出具体例子——LeetCode 3 无重复字符的最长子串，右指针每次右移一个字符，如果新字符在窗口内已存在，左指针跳到重复字符的下一个位置；LeetCode 76 最小覆盖子串，右指针扩张到包含所有目标字符后，左指针收缩到刚好不满足条件。能讲清「扩张-收缩-更新答案」这个三段式，说明你真的掌握了滑动窗口。

---

## 六、BFS vs DFS：什么时候用广度，什么时候用深度

BFS（广度优先搜索）和 DFS（深度优先搜索）是**图和树的两大遍历策略**，面试必考。

### 核心区别

| 维度 | BFS（广度优先） | DFS（深度优先） |
|------|----------------|----------------|
| 数据结构 | 队列（FIFO） | 栈 / 递归 |
| 遍历顺序 | 逐层遍历 | 一条路走到黑 |
| 适用场景 | 最短路径、层序遍历 | 所有路径、检测环、拓扑排序、回溯 |
| 空间复杂度 | O(w)，w 是最大宽度 | O(h)，h 是最大深度 |

### BFS：最短路径的专属算法

BFS 的核心特性：**第一次到达某个节点时，走过的路径一定是最短的**。

为什么？因为 BFS 是**逐层扩展**的——先访问距离起点 1 步的所有节点，再访问距离 2 步的所有节点……第一次到达目标节点时，必然是经过最少步数的路径。

```typescript
// 二叉树层序遍历（LeetCode 102）—— BFS 经典应用
function levelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];
  const result: number[][] = [];
  const queue: TreeNode[] = [root];
  while (queue.length > 0) {
    const levelSize = queue.length;  // 👈 当前层的节点数
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

> 💬 **面试官**：BFS 为什么能保证找到最短路径，而 DFS 不能？
>
> ✅ 标准答案：BFS 是逐层扩展的——先访问距离起点 1 步的所有节点，再访问距离 2 步的所有节点，第一次到达目标节点时必然经过最少步数。DFS 是沿着一条路走到黑，可能先走一条很长的路径到达目标，而不是最短路径。
>
> 🎁 加分答案：能举出具体例子——二叉树层序遍历，BFS 第一次访问到某层节点时，深度就是该节点的最短距离；DFS 先序遍历可能先访问到深层节点，但不是最短距离。还能提到「BFS 的空间复杂度是 O(w)，w 是最大宽度，最坏情况下是满二叉树的最后一层节点数 O(n/2)；DFS 的空间复杂度是 O(h)，h 是最大深度，最坏情况下退化为链表 O(n)」。

---

## 七、高频题精讲：5 道 LeetCode 实战

下面 5 道题是搜索相关的高频面试题，每题给出完整代码和复杂度分析。

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
      // 左半有序
      if (nums[left] <= target && target < nums[mid]) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    } else {
      // 右半有序
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

**面试追问**：如果数组里有重复元素怎么办？（LeetCode 81）——需要额外判断 `nums[left] === nums[mid]` 的情况，此时 `left++` 跳过重复元素。

### LeetCode 34：排序数组中查找第一个和最后一个位置

**题目**：给你一个升序数组和目标值，找出目标值在数组中的开始位置和结束位置。如果不存在，返回 `[-1, -1]`。

**思路**：用 lower_bound 找第一个 ≥ target 的位置，用 upper_bound 找最后一个 ≤ target 的位置。

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
  const right = lowerBound(nums, target + 1) - 1;  // 👈 巧妙：找 target+1 的 lower_bound
  return [left, right];
}
```

**复杂度**：时间 O(logn)，空间 O(1)。

**面试追问**：为什么 `right = lowerBound(nums, target + 1) - 1`？——`lowerBound(nums, target + 1)` 返回第一个 > target 的位置，减 1 就是最后一个 ≤ target 的位置。

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

**面试追问**：如果字符集是 ASCII，怎么优化空间？——用长度为 128 的数组代替 Map。

### LeetCode 76：最小覆盖子串（滑动窗口 + Map）

**题目**：给你两个字符串 s 和 t，返回 s 中涵盖 t 所有字符的最小子串。如果不存在，返回空字符串。

**思路**：滑动窗口，右指针扩张到包含所有目标字符后，左指针收缩到刚好不满足条件。

```typescript
function minWindow(s: string, t: string): string {
  const need = new Map<string, number>();
  for (const char of t) {
    need.set(char, (need.get(char) || 0) + 1);
  }
  
  let left = 0;
  let valid = 0;  // 👈 窗口中满足 need 条件的字符数
  let start = 0;
  let len = Infinity;
  const window = new Map<string, number>();
  
  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    if (need.has(char)) {
      window.set(char, (window.get(char) || 0) + 1);
      if (window.get(char) === need.get(char)) {
        valid++;  // 👈 该字符已满足数量要求
      }
    }
    
    // 👈 收缩左边界
    while (valid === need.size) {
      if (right - left + 1 < len) {
        start = left;
        len = right - left + 1;
      }
      const leftChar = s[left];
      left++;
      if (need.has(leftChar)) {
        if (window.get(leftChar) === need.get(leftChar)) {
          valid--;  // 👈 该字符不再满足数量要求
        }
        window.set(leftChar, window.get(leftChar)! - 1);
      }
    }
  }
  
  return len === Infinity ? '' : s.substring(start, start + len);
}
```

**复杂度**：时间 O(|s| + |t|)，空间 O(|s| + |t|)。

**面试追问**：`valid` 变量的作用是什么？——记录窗口中满足 need 数量要求的字符种类数，当 `valid === need.size` 时说明窗口已覆盖所有目标字符。

### LeetCode 11：盛最多水的容器（双指针）

**题目**：给你 n 个非负整数，每个数代表坐标中的一个点 `(i, ai)`。找出其中的两条线，使得它们与 x 轴共同构成的容器可以容纳最多的水。

**思路**：对撞指针，左右指针从两端向中间移动，每次移动较短的板。

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

**面试追问**：为什么移动较短的板？——容器容量由较短的板决定，移动较长的板只会让宽度变小、高度不变或更小，容量必然变小；移动较短的板有可能找到更高的板，容量可能变大。

---

## 八、前端工程落地：搜索算法就在你代码里

搜索算法不是面试专用，它就在你每天用的框架源码里。

### React Fiber 的 DFS 工作循环

React Fiber 架构的核心是**可中断、可恢复**的渲染过程。实现这个特性的关键，就是把传统的**递归树遍历**改造成**DFS 迭代遍历**。

**为什么不用递归？** 递归依赖调用栈，一旦开始就必须一口气走完，无法中途暂停。Fiber 需要在任意节点暂停、让出主线程、之后恢复，所以必须用**迭代**模拟 DFS。

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
    workInProgress = next;  // 👈 继续处理子节点
  }
}

function completeUnitOfWork(unitOfWork: Fiber): void {
  let completedWork = unitOfWork;
  do {
    completeWork(completedWork);  // 👈 完成当前节点
    const sibling = completedWork.sibling;
    if (sibling !== null) {
      workInProgress = sibling;  // 👈 有兄弟节点，处理兄弟
      return;
    }
    completedWork = completedWork.return;  // 👈 没有兄弟，回溯到父节点
  } while (completedWork !== null);
  workInProgress = null;
}
```

这就是**DFS 迭代（非递归）实现的真实案例**：
- `performUnitOfWork` 是**递推**——处理当前节点，深入子节点
- `completeUnitOfWork` 是**回溯**——没有子节点时，沿 `sibling` 找兄弟、沿 `return` 找父节点

> 💬 **面试官**：React Fiber 为什么用 DFS 迭代而不是递归？
>
> ✅ 标准答案：递归依赖调用栈，一旦开始就必须一口气走完，无法中途暂停让出主线程。Fiber 需要可中断、可恢复的渲染过程，所以用迭代模拟 DFS——`performUnitOfWork` 递推、`completeUnitOfWork` 回溯，把遍历状态保存在堆上的 FiberNode 对象里，可以在任意节点 `shouldYield()` 判断时间片、随时中断。
>
> 🎁 加分答案：能讲清「递推 + 回溯」的具体实现——`beginWork` 处理当前节点并返回第一个子节点（递推），`completeWork` 完成当前节点并沿 `sibling`/`return` 指针回溯（回溯）。还能提到「这是把控制权从引擎的调用栈夺回到用户态的手动循环里」，是 Fiber 架构的灵魂。

### Fisher-Yates 洗牌：数组随机化的标准算法

Fisher-Yates 洗牌（Knuth Shuffle）是**数组随机化**的标准算法，时间复杂度 O(n)，空间复杂度 O(1)。

**算法思路**：
- 迭代数组，从最后一位开始
- 将当前位置和一个随机位置交换（随机位置比当前位置小）
- 保证随机过的位置不会再被随机一次

![Fisher-Yates 洗牌图解](https://cdn.nlark.com/yuque/0/2022/png/738210/1645694288223-2f4bf87f-a061-43f0-a66f-57181a89880c.png)

**代码实现**：

```typescript
// src/util/index.ts
export function swap(array: any[], a: number, b: number) {
  [array[a], array[b]] = [array[b], array[a]];
}

// src/algorithms/search/shuffle.ts
import { swap } from '../../util';

export function shuffle(array: any[]) {
  let currentIndex = array.length;
  while(currentIndex !== 0) {
    const randomIndex = Math.floor(Math.random() * currentIndex);  // 👈 随机位置
    currentIndex--;
    swap(array, currentIndex, randomIndex);  // 👈 交换
  }
  return array;
}
```

**为什么不用 `array.sort(() => Math.random() - 0.5)`？** 因为 `sort` 的比较函数要求满足「传递性」——如果 a > b 且 b > c，则 a > c。随机比较不满足传递性，导致排序结果不均匀，某些排列出现的概率更高。

> 💬 **面试官**：Fisher-Yates 洗牌的原理是什么？为什么不用 `sort(() => Math.random() - 0.5)`？
>
> ✅ 标准答案：Fisher-Yates 从最后一位开始，将当前位置和一个随机位置交换，保证每个元素等概率出现在任意位置，时间复杂度 O(n)。`sort(() => Math.random() - 0.5)` 的比较函数不满足传递性，导致排序结果不均匀，某些排列出现概率更高，不是真正的随机洗牌。
>
> 🎁 加分答案：能证明 Fisher-Yates 的公平性——第 i 个元素出现在第 j 个位置的概率是 1/n。还能提到「React 列表随机排序、抽奖、随机推荐都常用 Fisher-Yates」。

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 考察频率 |
|--------|-----------|---------|
| 顺序搜索 | 遍历数组逐个比对，O(n) 时间 O(1) 空间，无序数据唯一选择 | ⭐ 低频 |
| 二分搜索 | 每次缩小一半范围，O(logn)，关键是循环不变式 `[left, right]` | ⭐⭐⭐ 必考 |
| 二分变体 | lower_bound 找第一个 ≥ target，upper_bound 找最后一个 ≤ target，旋转数组判断哪半有序 | ⭐⭐⭐ 必考 |
| mid 溢出 | `left + ((right - left) >> 1)` 代替 `(left + right) / 2`，避免溢出 | ⭐⭐⭐ 必考 |
| 内插搜索 | 按目标值比例估算位置，均匀分布 O(log log n)，非均匀退化 O(n) | ⭐ 低频 |
| 双指针 | 对撞指针（有序）、快慢指针（链表），O(n) 解决 O(n²) 暴力 | ⭐⭐ 高频 |
| 滑动窗口 | 右指针扩张、左指针收缩，求满足条件的最短/最长子串 | ⭐⭐⭐ 必考 |
| BFS | 队列实现，逐层遍历，第一次到达即最短路径 | ⭐⭐⭐ 必考 |
| DFS | 栈/递归实现，一条路走到黑，适合所有路径、检测环、回溯 | ⭐⭐⭐ 必考 |
| React Fiber | DFS 迭代实现，`performUnitOfWork` 递推 + `completeUnitOfWork` 回溯 | ⭐⭐⭐ 必考 |
| Fisher-Yates | 从后往前随机交换，O(n) 真正均匀洗牌 | ⭐⭐ 高频 |

> 💡 记住这条主线：**搜索算法的核心是「利用数据的结构信息」——无序数据只能顺序搜索，有序数据用二分，均匀分布用内插，需要频繁查找用哈希表**。双指针和滑动窗口是数组/字符串问题的降维打击，BFS/DFS 是图和树的两大遍历策略。把这些认出来，你就不再是「会用 API 的人」，而是「能看懂框架为什么这样设计的人」。

---

## 📝 留个问题

React Fiber 的 `workLoopSync` 是 DFS 迭代实现，那 Concurrent Mode 的 `workLoopConcurrent` 和它有什么区别？提示：想想 `shouldYield()` 的作用、时间片用完后的恢复机制、以及为什么 Concurrent Mode 需要 `workInProgress` 树和 `current` 树双缓存。

欢迎在评论区写出你的答案 👇

---

## 参考资料

- 《算法》（Sedgewick / Wayne，第4版）——二分搜索、BFS/DFS 经典教材
- 《算法导论》（CLRS，第3版）——循环不变式的严格定义
- labuladong 算法笔记——二分搜索变体、滑动窗口模板（社区总结）
- React Reconciler 源码——Fiber 架构 DFS 工作循环实现
- LeetCode 33/34/3/76/11——搜索高频题

> 推荐搜索关键词：「二分搜索 循环不变式」「lower_bound upper_bound」「滑动窗口 模板」「BFS 最短路径 为什么」「React Fiber workLoopSync DFS」「Fisher-Yates 洗牌 公平性证明」。

---

> 🔖 这是「前端数据结构与算法」系列第 11 篇。上一篇：《排序：V8 TimSort 源码解析/快排/归并/稳定性全解》；下一篇预告：《递归：递归三要素/尾递归/记忆化到 DP 的跨越》
