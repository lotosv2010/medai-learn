# 组合与桥接模式：树形结构统一接口 vs 双维度解耦（面试收藏级）

> **副标题**：组合模式让单个节点和整棵树的接口一致，桥接模式让两个独立变化的维度不互相绑定

> 面试官问：「组合模式和桥接模式有什么区别？」
>
> 你答得很顺：「组合是树形结构，桥接是把抽象和实现分离。」
>
> 他点点头，把电脑转过来：「你看这段代码——`class Department { private children: StaffNode[] = [] }`。这是组合还是桥接？」
>
> 「组合。」
>
> 「为什么不是装饰器？装饰器也持有同一个接口的引用。」
>
> 你顿了一下：「因为……组合是一个对多个？」
>
> 「那这个呢——`class Report { constructor(private renderer: Renderer) {} }`，是桥接还是策略？」
>
> 你犹豫了两秒，说：「都是吧。」
>
> 面试官笑了：「你记住的是这四个模式的**结论**，不是区分它们的**判据**。结论只能对付一道题，判据才能对付一串追问。」
>
> 这一节要补的，就是这套判据。

---

## 🎯 这篇文章解决什么问题

组合和桥接被放在同一篇，不是凑数——它们恰好是**结构型模式里最容易被互相误认、又最容易被随便糊过去的一对**。

原因很具体：

- 两者的类图都长「一个接口 + 一个实现类 + 一个持有引用的类」，肉眼看不出区别
- 两者的官方定义都用了「组合」「分离」这类万能词，背下来也判断不了
- 两者各自的邻居（装饰器、策略、适配器）在结构上和它们几乎一模一样，面试官随便一换你就乱

更麻烦的是，这两份笔记写于 2021 年，各自只有 200 行左右：三张图的代码、几张类图，**没有任何辨析、没有工程落地、没有面试问答**。也就是说，只靠笔记你连「什么时候该用」都答不上来，更别说「为什么不是另一个」。

所以这篇只做四件事：

- **建两条判据**：组合看「有没有自引用 + 是不是树」，桥接看「两个维度是不是真的独立变」
- **讲透九个实现**：React 虚拟 DOM、文件夹树、绘制表单、科室医生树、`querySelector`（组合）；A/B 交叉、事件监听、Canvas 形状颜色、药品报表（桥接）
- **串起四组辨析**：组合 vs 桥接、桥接 vs 策略、组合 vs 装饰器、桥接 vs 适配器
- **做一次合体**：用一段「药品分类报表」的代码，把两个模式放进同一个需求里，让你一次看清谁解决什么

主线只有一句：

> **组合解决「纵向的层级」，桥接解决「横向的维度」——一个把 N 层压成 1 层递归，一个把 M×N 拆成 M+N。**

---

## 一、场景切入：两个医疗后台的真实困惑

先看两个真实到不能再真实的场景。它们都会让你产生「该设计一下结构」的冲动，但底下的问题是两回事。

### 痛点一：勾选「全院」等于勾选三层节点

医疗 SaaS 后台的人员选择器，层级是「院区 → 科室 → 医生」。

产品经理的需求很朴素：

- 勾选一个科室，等于勾选这个科室下所有医生
- 勾选一个院区，等于勾选这个院区下所有科室的所有医生
- 医生勾了一半，科室要显示「半选」的横杠

如果你把「科室」和「医生」当成两种不同的数据来设计，接口大概长这样：

```typescript
interface DeptNode {
  id: string;
  name: string;
  subDepartments: DeptNode[]; // 科室下面可能还有子科室
  doctors: DoctorNode[];      // 科室下面挂医生
}

interface DoctorNode {
  id: string;
  name: string;
  title: string; // 主任医师 / 主治医师
}
```

看起来挺合理。但只要你写「统计人数」，就要开始付代价了：

```typescript
// 👈 每一个遍历操作，都必须先判断节点类型
function countStaff(node: DeptNode | DoctorNode): number {
  if ('subDepartments' in node) {
    let total = 0;
    for (const sub of node.subDepartments) {
      total += countStaff(sub);      // 科室下的科室
    }
    for (const doc of node.doctors) {
      total += countStaff(doc);      // 科室下的医生
    }
    return total;
  }
  return 1;
}
```

单个函数这样写没问题。问题在于**「遍历树」这件事在整个后台里会发生几十次**：

- 渲染树（要按类型选不同的组件）
- 统计人数（要区分科室和医生）
- 导出人员清单（医生才有工号）
- 权限校验（院长看全院，科室主任看本科室）
- 批量排班（只能对医生排）

每一个操作都要重复一遍 `'subDepartments' in node` 这个判断。而一旦产品加了一层「院区」，或者医生之外又多了「护士」「药师」两种角色，**这几十个函数全都要改。**

这就是笔记里那句「客户可以使用统一的方式对待组合对象和叶子对象」要解决的问题——**不是递归难写，而是「两种节点两套接口」逼着每个调用方都去判断类型。**

### 痛点二：报表的两个维度都在变

第二个场景看起来完全不相关，但痛得更狠。

药品销售报表，有两组独立的需求在同时变化：

**变化点一：按什么分组。** 今天按地区（华东、华南、华北），明天产品说要按药品类别（抗感染、心血管、消化），后天又说要按医生。

**变化点二：用什么形式展示。** 可以出表格、可以出柱状图、可以导出 Excel。

如果你用继承来做，需要为每一种「分组 × 形式」的组合写一个子类：

```typescript
class RegionTableReport {}
class RegionChartReport {}
class RegionExcelReport {}
class CategoryTableReport {}
class CategoryChartReport {}
class CategoryExcelReport {}
class DoctorTableReport {}
class DoctorChartReport {}
class DoctorExcelReport {}
```

3 个分组 × 3 种形式 = **9 个类**。而且这个乘法是残酷的：

- 加一种分组（按医院等级）→ 立刻要写 3 个新类
- 加一种输出形式（PDF 导出）→ 立刻要写 3 个新类
- 两个方向同时扩展 → 9 变 4×4 = 16

更糟的是，这 9 个类里 80% 的代码是重复的——`RegionTableReport` 和 `CategoryTableReport` 的渲染逻辑一模一样，只有取数那一行不同。

**这就是典型的「类爆炸」：两个维度各自有 m 个值和 n 个值，继承方案需要 m×n 个类。**

### 两个痛点，两个问题

并排放一下，分界线立刻出来了：

|            | 痛点一：科室医生树              | 痛点二：销售报表                |
| ---------- | ------------------------------- | ------------------------------- |
| 纠结的问题 | 单个节点和整棵树怎么用同一套接口 | 两个都在变的维度怎么互不牵连    |
| 变化的形态 | 层级加深、节点类型增加（纵向）  | 维度取值增加（横向）            |
| 不用模式   | 每个遍历函数都要判断类型        | 类数量按乘法增长                |
| 对应模式   | 组合                            | 桥接                            |
| 一句话     | 把 N 层压成 1 层递归            | 把 M×N 拆成 M+N                 |

**这张表就是全文的分界线。** 后面每一章都会回到这两列——尤其第八章的四组辨析，全部建立在这两列的差异上。

---

## 二、组合模式：把层级差吞进递归里

### GoF 的原话与关键词

GoF 1994 年那本书对组合模式的意图定义是：

> **将对象组合成树形结构以表示「部分-整体」的层次结构。组合模式使得用户对单个对象和组合对象的使用具有一致性。**

这段话里有两个词必须咬住：

- **部分-整体**——它描述的不是「包含关系」这种泛泛的说法，而是明确的一种结构：一个整体由若干个同类型的东西组成，而这些「部分」自己也可以是整体
- **一致性**——这是整个模式的全部价值所在。**一致性不是「长得像」，是「调用方不需要区分」**

所以组合模式解决的核心矛盾可以精确表述为：

> **树形结构里，「叶子」和「容器」在数据上天然不同（容器有子节点，叶子没有），但调用方希望「一样地对待它们」。**

这两个需求天然打架：按数据的真实差异设计接口，调用方每次都要判断类型；强行统一接口，容器就必须「假装」自己也是叶子，把「我有孩子」这件事藏起来。

组合模式的解法干脆利落——**让容器也实现叶子的接口，把「我有孩子」变成容器的内部实现细节。** 对外看，一个科室和一个医生提供的能力完全一样。

![组合模式要解决的问题示意：客户代码如果直接操作不同结构的对象、大小容器理解不一致，就必须为每种结构写一套处理逻辑，组合模式把它们统一到同一个接口下](https://refactoring.guru/images/patterns/diagrams/composite/problem-zh.png)

这张图画的就是「不统一」的代价：左边的客户代码要对不同的对象结构分别处理，箭头是发散的、分叉的。而组合模式做的是**把这些发散的箭头收敛成一根**——客户只认识 `Component`，剩下的分叉全部发生在 `Component` 内部的递归里。

### 笔记原文：三句话讲完的概述

这份笔记的开头三句，是整个模式最短的路径，原文保留：

> + 又称整体-部分模式
>
> + 将对象组合成树形结构以表示部分-整体的层次结构
>
> + 客户可以使用统一的方式对待组合对象和叶子对象

第一句给了别名——**整体-部分模式**，记住这个名字，你就能在面试官说「整体-部分模式」时不至于愣住。

第二句是 GoF 原文的翻译。

第三句是**唯一有操作价值的一句**：「统一的方式」。判断一段代码是不是组合模式，不用看它有没有递归，就看**调用方有没有用统一的方式处理节点**。

![生活里的组合：一个箱子里装着若干件物品，而箱子里还可以再放箱子，问「总重多少」时，你不需要区分拿到的是单件物品还是箱子，因为它们都能回答同一个问题](https://refactoring.guru/images/patterns/content/composite/composite-comic-1-zh.png)

这张漫画说的就是组合模式的那个「一致性」：**你不会因为拿到的是箱子就不问它重量——箱子和单件物品在「称重」这件事上是同一种东西。** 你的代码里，`getCount()` 就相当于那个「称重」的动作。

### 一条能当场用的判据

把「统一的方式」翻译成代码层面的判据：

> **在持有 `Component` 引用的地方，不该出现「判断这是叶子还是容器」的代码。**

具体说，如果你写出了下面任何一种，就说明组合模式没做到位：

```typescript
// ❌ 判据一：检查 children 是否存在 → 说明接口没统一
if (node.children) { /* 是容器 */ }

// ❌ 判据二：用 instanceof / type 字段分流 → 说明接口没统一
if (node instanceof Department) { /* 是科室 */ }

// ❌ 判据三：特殊节点特殊对待 → 说明接口没统一
if (node.isLeaf) { /* 单独处理 */ }
```

反过来，最好的实现里，调用方根本拿不到「类型」这个信息——它拿到的只有一个 `Component`，只能调 `Component` 上声明的方法，而**每个方法在叶子和容器上都有意义**。

看一个正例（这是本文第四章要完整讲的科室树）：

```typescript
// 调用方只认识 StaffNode，不知道也不需要知道具体是科室还是医生
function printTree(node: StaffNode): void {
  console.log(`${'  '.repeat(depthOf(node))}${node.getName()} (${node.getCount()}人)`);
  node.getChildren().forEach(printTree); // 👈 没有任何类型判断
}
```

`getChildren()` 在科室上返回真实子节点，在医生上返回空数组。**「医生没有孩子」这件事被叶子自己吞掉了**，调用方一行 `if` 都不用写——这就是组合。

> 📚 **知识点**：组合模式在 GoF 原书里的英文名是 Composite Pattern，`Composite` 特指「容器」这个角色。但中文里「组合模式」和「组合关系（Composition）」是同两个字，很容易混。**UML 的「组合关系」是一种关联强度（生命周期绑定），「组合模式」是一种结构型设计模式——两者毫无关系。** 面试时如果对方问「组合模式和组合关系是一回事吗」，一定要能立刻划清：前者管「树形结构的统一接口」，后者管「整体销毁时部分是否跟着销毁」。

> 💬 **面试官**：组合模式的核心思想是什么？举一个前端中的天然例子。
>
> ✅ 标准答案：核心是把对象组织成树形结构来表示「部分-整体」的层次，并让叶子节点和容器节点实现同一个接口，从而让调用方可以用统一的方式处理两者，不需要判断节点类型。前端最天然的例子的 DOM——`document.body` 和它里面最深的 `<span>` 都是 `Element`，都能 `.querySelector()`、都能 `.appendChild()`、都能读 `.children`，浏览器不需要知道你在操作哪一层。
>
> 🎁 加分答案：能补一句「组合模式的价值不在递归，而在消除判断」——递归谁都会写，难的是让递归里不出现 `if (node.type === 'xx')`。再加一句成本意识：统一接口的代价是「叶子也要实现容器的方法」，DOM 选了透明式，所以 `document.createTextNode('x').appendChild(...)` 会在运行时抛错——**这正是组合模式最常见的代价，下一章会专门讲透明式与安全式的权衡。**

---

## 三、组合模式的结构：三角色与一个必须做的选择

### 三个角色

GoF 给组合模式定义了三个角色：

![组合模式三角色结构图：Component 是统一接口，Leaf 是叶子，Composite 是持有子节点列表的容器，两者都实现 Component](https://refactoring.guru/images/patterns/diagrams/composite/structure-zh.png)

- **Component（抽象构件）**：统一接口。客户端只认识它，声明所有节点共有的操作（如 `getCount()`、`getName()`、`render()`）
- **Leaf（叶子构件）**：没有子节点的节点。`getCount()` 返回自己的那一份
- **Composite（容器构件）**：持有 `Component[]` 子节点列表，`getCount()` 把子节点的结果汇总起来

注意这张图里最关键的一条线：**`Composite` 指向 `Component` 的箭头。** 这个自引用是组合模式在类图上的唯一识别特征——类图里有 `Composite --> Component`，基本就可以判定是组合。

### 术语对照：GoF 与本系列的叫法

| GoF 叫法 | 常见别称 | 语义 |
|---------|---------|------|
| Component | 抽象构件 / 统一接口 | 叶子与容器共同实现的接口 |
| Leaf | 叶子节点 / 单项 | 无子节点，操作返回自身结果 |
| Composite | 容器节点 / 组合对象 | 持有 Component 列表，操作汇总子结果 |

前端资料里有时会把 `Component` 叫成 `Node`（因为 DOM 就是这么叫的），把 `Composite` 叫成 `Group`（因为 Sketch 的图层组就是 Group）。名字不重要，**「有没有一个持有同类型列表的类」才是判断依据。**

### 笔记里的那张图：VNode 类图

笔记第二章给的结构图是这样的：

![React 虚拟 DOM 的组合结构：VNode 持有 children 列表，TextNode 是无子节点的叶子，VNode 自身也能作为 children 的元素](https://cdn.nlark.com/yuque/0/2021/png/738210/1639447101178-6962fd8b-04b1-4910-b180-eea34e9dd5da.png)

这张图上只有三个名字：`VNode`、`VNode`、`TextNode`，还有三个字段 `type` / `attrs` / `children`。

看起来简陋，但它把组合模式的精髓表达得很到位——**`VNode` 自己既是容器（有 `children`），又能作为 `children` 的元素出现在另一个 `VNode` 里。** 那个「`VNode` 里装 `VNode`」的自引用，正是上一节说的判断特征。

而且这张图还顺带解释了 React 里一个初看很怪的现象：

```jsx
<p>
  点我
  <span>详情</span>
</p>
```

这里 `<p>` 的 children 里，一个是**字符串**，一个是**元素**。为什么能混着写？因为在虚拟 DOM 里，**裸字符串会被归一化成 `TextNode`（叶子），元素是 `VNode`（容器）**，而两者在 `render` 里被同一段代码处理。

这就是组合模式最漂亮的地方：**不是「让两种东西长得像」，而是「把两种东西统一成一种东西的两种形态」。**

### 一个必须做的选择：透明式 vs 安全式

这是笔记里**完全没提**、但面试区分度最高的一点，也是你在真实项目里动手前必须做的决定。

问题在于：`add()` / `remove()` / `getChild()` 这些**只有容器才需要**的方法，要不要声明在 `Component` 上？

两种做法，各有各的死法。

**透明式（Transparent）**：把所有方法都声明在 `Component` 上，叶子实现成抛异常或空实现。

```typescript
interface StaffNode {
  getName(): string;
  getCount(): number;
  // 👈 叶子也有这三个方法，但调用会炸
  add(node: StaffNode): void;
  remove(node: StaffNode): void;
  getChildren(): StaffNode[];
}

class Doctor implements StaffNode {
  add(): void { throw new Error('医生没有子节点'); }
  remove(): void { throw new Error('医生没有子节点'); }
  getChildren(): StaffNode[] { return []; } // 空数组，安全
}
```

**好处**：客户端完全不用判断类型，接口绝对统一——这就是「透明」的含义。
**坏处**：`add()` 在叶子上会在**运行时**抛错，接口在撒谎。**从 LSP（里氏替换）角度看这是违规的**——子类不能比父类约束更严。

**安全式（Safe）**：容器专属的方法只声明在 `Composite` 上。

```typescript
interface StaffNode {
  getName(): string;
  getCount(): number;
  getChildren(): StaffNode[]; // 这个可以留，叶子返回空数组是安全的
}

class Department implements StaffNode {
  private children: StaffNode[] = [];
  add(node: StaffNode): void { this.children.push(node); }   // 👈 只在容器上
  remove(node: StaffNode): void { /* ... */ }
}
```

**好处**：类型安全，编译期就挡掉了错误调用，完全符合 LSP。
**坏处**：客户端在「要加节点」时必须知道「这个节点得是 Department」，**统一性被打破了**。

怎么选？给你一条实用判据：

> **「加子节点」这个动作是谁驱动的？**
>
> - **外部驱动**（从接口数据、配置文件、用户拖拽搭树）→ 用**安全式**。因为装配代码本来就知道自己在装配什么，它需要类型安全来避免写错。
> - **内部驱动**（容器自己知道怎么组装自己，构造时一次性传入）→ 用**透明式**，或者干脆不提供 `add`。

### React 的第三条路：不提供 add

React 的选择很有意思——它既不是透明式，也不是安全式，而是**把 children 在创建时一次性传入，之后不可变**。

```javascript
// React 的做法：children 是构造参数，创建后不能改
function createElement(type, props, ...children) {
  return new ReactElement(type, {...props, children: children.length === 1 ? children[0] : children});
}
```

这个设计同时避开了两种模式的缺点：

- 没有 `add()` 在叶子上撒谎的问题（叶子压根没有 add）
- 没有「客户端必须判断类型才能加节点」的问题（谁都不加，创建时就定死）

> 📚 **知识点**：这是**函数式思路对命令式模式的改良**。GoF 写于 1994 年，那时的对象是可变的、树是逐步搭起来的，所以 `add`/`remove` 是必需品。而 React 用不可变数据 + 一次性构造，把「组合」的装配问题从运行时挪到了构造期。**这提示了一个判断维度：如果你的树在生命周期内不变，就别给 `add`/`remove`——少一个方法，少一堆 LSP 违规。**

> 💬 **面试官**：组合模式里 `add` 方法应该放在哪？放 Component 上还是 Composite 上？
>
> ✅ 标准答案：这就是组合模式里「透明式」和「安全式」的抉择。放 Component 上是透明式——客户端完全不需要判断节点类型，代价是叶子节点上调用会抛错，接口在撒谎，违反里氏替换。放 Composite 上是安全式——类型安全，但客户端在添加子节点时必须知道具体类型，统一性被破坏。
>
> 🎁 加分答案：能给出判据——「看装配动作由谁驱动」。外部驱动搭树（配置驱动、拖拽建树）用安全式，因为装配代码需要类型保护；内部驱动（容器自己组装自己）用透明式或干脆不提供 add，像 React 把 children 作为构造参数一次性传入，从根源上消除了这个问题。再加一句：**能做到「不提供 add」就不提供，这是最省事的第三条路。**

---

## 四、组合模式的五个实现：从虚拟 DOM 到科室树

这一章把组合模式从「概念」写到「能跑」。五个实现，按理解难度由浅入深，每一个都对应一个真实场景。

### 实现一：手写一个虚拟 DOM

先看最经典的一个——笔记第三章的代码。**它做的事，就是用 60 行实现 React 的 `createElement` + `render`。**

笔记原文是一整个 HTML 页面，这里把 HTML 骨架和 CDN 引用去掉，只留逻辑主体（`#root` 由页面提供）：

```javascript
// react、虚拟dom实现
class ReactElement {
  constructor(type, props) {
    this.type = type;
    this.props = props;
  }
}

function createElement(type, props, ...children) {
  return new ReactElement(type, {...props, children: children.length === 1 ? children[0] : children});
}

function render(element, container) {
  // 👈 这一行是组合模式的入口：字符串（叶子）走这条路，直接生成 TextNode
  if (typeof element == 'string') return container.appendChild(document.createTextNode(element));

  const {type, props} = element;
  const domElement = document.createElement(type); // 创建dom节点
  for (const attr in props) {
    if (attr === 'children') {
      // children可能是一个对象、数组、字符串
      const val = props[attr];
      if (typeof val == "object") {
        val.forEach(c => {
          if (typeof c == "object") {
            render(c, domElement);        // 👈 容器：递归
          } else {
            domElement.appendChild(document.createTextNode(c)); // 👈 叶子：直接挂
          }
        });
      } else if (typeof val == "string") {
        domElement.appendChild(document.createTextNode(val));   // 👈 叶子：直接挂
      }
    } else if (attr === 'className') {
      domElement.setAttribute('class', props[attr]);
    } else if (attr === 'style') {
      for (const key in props[attr]) {
        domElement.style[key] = props[attr][key];
      }
    } else {
      domElement.setAttribute(attr, props[attr]);
    }
  }
  container.appendChild(domElement);
}

// 使用：一段带嵌套的 JSX 等价调用
const root = document.querySelector('#root');
const node = createElement(
  'p',
  {style: {color: 'lightgreen'}, id: 'p'},
  '组合模式',
  createElement('span', {id: 'span'}, '设计模式')
);
render(node, root);
```

这段代码跑出来的效果是：一个浅绿色、id 为 `p` 的 `<p>`，内容是「组合模式」加一个 id 为 `span` 的 `<span>`，里面是「设计模式」。

**为什么这是组合模式？** 看 `render` 的前三行就够了：

```javascript
if (typeof element == 'string') return container.appendChild(document.createTextNode(element));
const {type, props} = element;
const domElement = document.createElement(type);
```

`render` 接收的参数叫 `element`，它**要么是字符串，要么是对象**——但函数不检查这一点，而是统一处理。字符串被转成 `TextNode`（叶子），对象被当成 `VNode`（容器）继续递归。

> 📚 **知识点**：笔记原文这一行写的是 `domElement.appendChild(...)`，但那是个笔误——在这一行之前 `domElement` 还没被创建（它在下一行才 `createElement`）。正确写法是把文本节点挂到 `container` 上。**这类「看起来能跑其实会抛错」的代码，恰恰是手写 VDOM 时最容易踩的坑**：递归函数里同时存在「当前容器」和「当前元素」两个变量，一旦在叶子分支里写错，报的错会是 `Cannot read properties of undefined`，而堆栈还指向递归深处，很难定位。

关键在**递归调用的那一行**——`render(c, domElement)`。`VNode` 的 children 可能还是 `VNode`，所以 `render` 调用的是自己。这就是组合模式在代码层的唯一标志：**处理函数把自己作为处理子元素的函数。**

笔记末尾还留了一段对照，说明这个手写实现和 React 等价：

```javascript
// React 官方 API 的等价写法（笔记原文注释保留）
// const jsx = <p>组合模式</p>;
// const node = React.createElement('p', {style: {color: 'lightgreen'}}, '组合模式', React.createElement('span', {id: 'span'}, '设计模式'));
// ReactDOM.render(jsx, root);
// ReactDOM.render(node, root);
```

对照一下就明白，我们手写的 `createElement` 就是 `React.createElement`，`render` 就是 `ReactDOM.render` 的极简版。**理解了这个 60 行，你就理解了 React 为什么能「组件里套组件」到无限层——因为 `render` 会递归到自己。**

🔧 **真实场景**：为什么每个前端都要理解这段代码？因为你写 `props.children` 的时候，拿到的东西**既可能是单个元素，也可能是数组，还可能是字符串**。React 在 `createElement` 里用 `children.length === 1 ? children[0] : children` 做了归一化，但只做了一层。所以当你写 `React.Children.map(props.children, ...)` 时，那个 API 存在的理由就是「children 的形状不确定」——**而形状不确定的根源，正是组合模式把叶子和容器混在了同一个类型里。**

### 实现二：文件夹与文件树

第二个实现是笔记第四章的场景——**这也是组合模式最标准的教科书案例**（refactoring.guru 用的就是它）。

![文件夹与文件的组合结构示意：文件夹可以包含子文件夹和文件，文件和文件夹都支持同样的操作](https://refactoring.guru/images/patterns/diagrams/composite/example.png)

笔记的完整代码（TypeScript）：

```typescript
class Folder {
  public children: Array<Folder|File> = [];
  public parent: Folder|null = null;
  public level = 1;

  constructor(public name: string) {}

  add(child: Folder|File) {
    child.parent = this;
    // 👈 层级计算：文件跟着父文件夹的层级，文件夹自己递增
    child.level = child instanceof File ? (child.parent?.level || 0) + 1 : this.level + 1;
    this.children.push(child);
  }

  show() {
    console.log('*'.repeat(this.level) + ' 文件夹' + this.name);
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].show();   // 👈 递归：子节点自己知道自己怎么显示
    }
  }

  remove() {
    if (!this.parent) return;
    for (let i = 0; i < this.parent.children.length; i++) {
      const current = this.parent.children[i];
      if (current === this) {
        return this.parent.children.splice(i, 1)
      }
    }
  }
}

class File {
  public level = 0;
  public parent: Folder|null = null;

  constructor(public name: string) {}

  show() {
    console.log('*'.repeat(this.level) + ' 文件' + this.name);
  }

  remove() {
    if (!this.parent) return;
    for (let i = 0; i < this.parent.children.length; i++) {
      const current = this.parent.children[i];
      if (current === this) {
        return this.parent.children.splice(i, 1)
      }
    }
  }
}

// 搭建一棵树
const coding = new Folder('coding');
const vue = new Folder('vue');
const react = new Folder('react');
const vueJs = new File('vue.js');
const reactJs = new File('react.js');

coding.add(vue);
coding.add(react);
vue.add(vueJs);
react.add(reactJs);

coding.show();
// * 文件夹coding
// ** 文件夹vue
// *** 文件vue.js
// ** 文件夹react
// *** 文件react.js

console.log('===================')

react.remove();   // 删除react文件夹
vueJs.remove();   // 删除vuejs文件
coding.show();
// * 文件夹coding
// ** 文件夹vue
// ** 文件夹react
```

这段代码有几个地方值得停下来看。

**第一，`show()` 里没有类型判断。**

```typescript
show() {
  console.log('*'.repeat(this.level) + ' 文件夹' + this.name);
  for (let i = 0; i < this.children.length; i++) {
    this.children[i].show();  // 不管它是 Folder 还是 File
  }
}
```

`this.children` 的类型是 `Array<Folder|File>`，两个类都有 `show()`。所以这行循环不用写任何 `if`——**这就是「统一接口」在真实代码里的样子。**

**第二，`remove()` 在两个类里实现得一模一样。**

这是这份笔记的一个「瑕疵」，但它恰好暴露了组合模式的一个重要判断：

```typescript
// Folder 和 File 的 remove 完全相同——因为删除的逻辑只依赖 parent，与自身是叶子还是容器无关
remove() {
  if (!this.parent) return;
  for (let i = 0; i < this.parent.children.length; i++) {
    const current = this.parent.children[i];
    if (current === this) return this.parent.children.splice(i, 1)
  }
}
```

**重复的代码说明抽象位置不对。** 正确做法是抽一个共同的基类：

```typescript
abstract class Node {
  public parent: Folder | null = null;
  public level = 1;
  constructor(public name: string) {}
  abstract show(): void;

  remove() {
    if (!this.parent) return;
    const siblings = this.parent.children;
    const idx = siblings.indexOf(this);
    if (idx > -1) siblings.splice(idx, 1);
  }
}
```

但这里有一个**组合模式特有的坑**：`Node` 不能把 `parent` 声明成 `Node`（因为父节点必须是容器），所以类型得写成 `parent: Folder | null`——**叶子知道自己可能有父容器，但容器不该被叶子当成父。** 这个类型上的不对称，是组合模式在 TS 里最真实的摩擦点之一。

**第三，`level` 的计算藏着一个陷阱。**

```typescript
child.level = child instanceof File ? (child.parent?.level || 0) + 1 : this.level + 1;
```

这行用了 `instanceof`——**组合模式里出现 `instanceof`，就是个警报。** 它说明「层级」这个概念在叶子和容器上的计算方式不一样：文件没有子节点，层级等于父层级 +1；文件夹自己存着 level，直接 +1。

更好的写法是把 level 变成「从 parent 推导」，而不是「add 时写死」：

```typescript
get level(): number {
  return this.parent ? this.parent.level + 1 : 1;
}
```

这样 `add` 里一行都不用判断类型，`instanceof` 直接消失。**这是检验组合模式有没有做到位的一个很好的练习：找代码里的 `instanceof`，逐个消掉。**

> 💬 **面试官**：你提到组合模式让叶子也实现容器的操作，那文件为什么要实现 `add`？文件不能加子节点。
>
> ✅ 标准答案：这份实现里 `File` 其实**没有**实现 `add`——`add` 只在 `Folder` 上有，这属于「安全式」组合。它带来的代价是组装代码（`coding.add(vue)`）必须知道自己在操作 `Folder`，不能对任意节点调用 add。如果改成透明式，`File.add` 就得抛异常或空实现，代码更统一但类型更不安全。
>
> 🎁 加分答案：能指出「这段代码里真正的模式味道不在 `add`，而在 `show()`」——`show()` 是两边都实现、且容器内部递归调用的方法，这才是「统一遍历」的核心。再补一句：**`parent` 字段是很多教材漏掉的**——它让「删除自己」变成 O(1) 可达，也让 `level` 可以推导。加上 `parent` 之后，这棵树既是「向下遍历」的组合，又具备「向上回溯」的能力，这才是真实文件系统的形态。

### 实现三：用组合模式搭一个表单

第三个实现还是笔记第四章的内容——**用类拼出一棵 DOM 树。**

同样去掉 HTML 骨架，保留全部逻辑：

```javascript
class Container {
  constructor(type) {
    this.element = document.createElement(type);
    this.children = [];
  }
  add(child) {
    this.children.push(child);
    this.element.appendChild(child.element); // 添加元素
    return this;                              // 👈 返回 this，支持链式调用
  }
}

class FormContainer extends Container {
  constructor() {
    super('form');
  }
}

class FieldContainer extends Container {
  constructor() {
    super('p');
  }
}

class FormItem {
  constructor(type, title) {
    this.element = document.createElement(type);
    this.element.innerHTML = title;
  }
}

class FormLabel {
  constructor(type, name) {
    this.element = document.createElement(type);
    this.element.name = name;
  }
}

const form = new FormContainer();
const username = new FieldContainer();
const password = new FieldContainer();

const usernameLabel = new FormItem('label', '用户名');
const usernameTip = new FormItem('span', '请输入用户名');
const usernameInput = new FormItem('input', 'username');
username.add(usernameLabel).add(usernameInput).add(usernameTip);

const passwordLabel = new FormItem('label', '密码');
const passwordTip = new FormItem('span', '请输入密码');
const passwordInput = new FormItem('input', 'password');
password.add(passwordLabel).add(passwordInput).add(passwordTip);

form.add(username).add(password); // 添加每一项到form上

document.body.appendChild(form.element); // 添加form到body上
```

这段代码构建出来的结构是这样一棵树：

```text
form（FormContainer）
├── p（FieldContainer: username）
│   ├── label「用户名」
│   ├── input（name=username）
│   └── span「请输入用户名」
└── p（FieldContainer: password）
    ├── label「密码」
    ├── input（name=password）
    └── span「请输入密码」
```

**这棵树最漂亮的地方是 `add` 的返回值：**

```javascript
add(child) {
  this.children.push(child);
  this.element.appendChild(child.element);
  return this;   // 👈 链式调用的关键
}
```

因为返回 `this`，所以可以写 `username.add(label).add(input).add(tip)`。这个「返回自身」的手法在组合模式里格外自然——**因为组合的结果还是组合**，加完一个节点，你还站在同一个容器上，当然可以接着加。

这也是为什么 jQuery 能把链式玩到极致：

```javascript
$('#app')
  .append('<div>')
  .addClass('container')
  .append('<p>')
  // ...
```

**「每个方法返回一个同类型对象」这件事，本身就是组合模式的语法表现。**

但这段代码有一处**重要的设计问题**，必须指出来：

```javascript
class FormItem {
  constructor(type, title) {
    this.element = document.createElement(type);
    this.element.innerHTML = title;   // 👈 用 innerHTML 存 title
  }
}
const usernameLabel = new FormItem('label', '用户名');
```

`FormItem` 既可以造 `<label>`、也可以造 `<span>`、还可以造 `<input>`——但 `new FormItem('input', 'username')` 这一句里，`'username'` 不是标题，它是**name 属性**。所以笔记紧接着又定义了 `FormLabel`：

```javascript
class FormLabel {
  constructor(type, name) {
    this.element = document.createElement(type);
    this.element.name = name;   // 👈 name 而不是 innerHTML
  }
}
```

**`FormLabel` 定义了但全程没被使用**——它恰恰是这处设计问题的证据：**`FormItem` 用「type + 一个字符串」来造元素，接口太窄，装不下「属性」这个维度。** 真正工程化的写法得区分「内容」和「属性」：

```javascript
class FormItem {
  constructor(type, options = {}) {
    this.element = document.createElement(type);
    // 内容与属性分开，两者都有才叫完整
    if (options.text) this.element.textContent = options.text;
    Object.assign(this.element, options.props || {});
  }
}
new FormItem('input', { props: { name: 'username', placeholder: '请输入' } });
```

> 📚 **知识点**：这个小重构体现了一条通用判断——**「用位置参数传多个含义不同的值」是接口设计里最常见的坑**。`FormItem(type, title)` 在只有一个语义时没问题，但它诱使你把 `title` 当成万能的第二参数（有时是内容、有时是 name），最终导致 `FormLabel` 这样的重复类。**参数一旦超过两个且语义不同，就该换成对象**——这也是本系列第 04 篇建造者模式存在的理由。

### 实现四：科室-医生树

前面三个实现都来自笔记。但笔记缺了一个东西——**一个真正贴合医疗业务、且把「统计/全选」这类实操需求都做掉的例子。**

这就是第一章痛点一的答案。先定义统一接口：

```typescript
// 统一接口：叶子（医生）和容器（科室）都实现它
interface StaffNode {
  getId(): string;
  getName(): string;
  getCount(): number;                    // 人数统计
  isChecked(): boolean;                  // 自己是否被选中
  setChecked(checked: boolean): void;    // 级联勾选
  getChildren(): StaffNode[];            // 医生返回空数组
  getParent(): Department | null;
  setParent(parent: Department | null): void;
}
```

先看叶子：

```typescript
class Doctor implements StaffNode {
  private checked = false;
  private parent: Department | null = null;

  constructor(private id: string, private name: string) {}

  getId() { return this.id; }
  getName() { return this.name; }
  getCount() { return 1; }                     // 👈 叶子永远是 1
  isChecked() { return this.checked; }
  setChecked(checked: boolean) { this.checked = checked; }
  getChildren(): StaffNode[] { return []; }     // 👈 叶子返回空数组，不是抛错
  getParent() { return this.parent; }
  setParent(parent: Department | null) { this.parent = parent; }
}
```

再看容器：

```typescript
class Department implements StaffNode {
  private children: StaffNode[] = [];
  private parent: Department | null = null;

  constructor(private id: string, private name: string) {}

  getId() { return this.id; }
  getName() { return this.name; }
  getParent() { return this.parent; }
  setParent(parent: Department | null) { this.parent = parent; }

  add(node: StaffNode) {
    this.children.push(node);
    node.setParent(this);                       // 👈 接口上有，不用 instanceof
  }

  getChildren() { return this.children; }

  // 👈 核心：把统计递归下去，自己对子节点一无所知
  getCount() {
    return this.children.reduce((sum, child) => sum + child.getCount(), 0);
  }

  // 👈 自己是否选中 = 所有子节点都选中
  isChecked() {
    return this.children.length > 0 && this.children.every(c => c.isChecked());
  }

  // 👈 半选态 = 有选中的但不是全部
  isIndeterminate() {
    const checkedCount = this.children.filter(c => c.isChecked()).length;
    return checkedCount > 0 && checkedCount < this.children.length;
  }

  // 👈 级联勾选：递归下传，不需要判断子节点类型
  setChecked(checked: boolean) {
    this.children.forEach(c => c.setChecked(checked));
  }
}
```

用起来是这样：

```typescript
const root = new Department('d0', '市第一人民医院');
const internal = new Department('d1', '内科');
const surgery = new Department('d2', '外科');
const cardio = new Department('d11', '心内科');

root.add(internal);
root.add(surgery);
internal.add(cardio);
cardio.add(new Doctor('u1', '张医生'));
cardio.add(new Doctor('u2', '李医生'));
surgery.add(new Doctor('u3', '王医生'));

console.log(root.getCount());          // 3
internal.setChecked(true);             // 勾选「内科」= 勾选所有内科医生
console.log(internal.isChecked());     // true
console.log(root.isChecked());         // false
console.log(root.isIndeterminate());   // true ← 院区显示半选横杠
```

**对比一下第一章那个坏实现**，差异非常直观：

| 操作 | 第一章的坏实现 | 本章的组合实现 |
|------|---------------|-----------------|
| 统计人数 | 每次判断 `'subDepartments' in node` | `reduce` 一行，无判断 |
| 全选 | 分别遍历科室和医生两个数组 | `children.forEach(c => c.setChecked(x))` |
| 半选态 | 收集所有后代医生再算比例 | 递归 `isChecked()` + 计数 |
| 加护士角色 | 所有函数都要改 | **加一个 `Nurse implements StaffNode`，零改动** |

最后一行是这个例子真正的价值——**加一种节点类型，所有遍历逻辑一行都不用动。** 这就是「统一接口」换来的东西。

对照一下第四章实现二那条「消掉 `instanceof`」的建议：这里 `setParent` 被提到了接口上，所以 `Department.add` 里一句 `instanceof` 都不需要。**同一个道理，换个场景再验证一次：组合模式做到位的标志，是找不到 `instanceof`。**

> 💬 **面试官**：你说的「加护士角色零改动」，真的零改动吗？`isIndeterminate` 里不是依赖了 `isChecked` 吗？
>
> ✅ 标准答案：真的零改动，因为新角色只需要实现 `StaffNode` 接口，`getCount`、`isChecked`、`setChecked` 这些递归逻辑全部自动生效。`isIndeterminate` 依赖的是接口上的 `isChecked()`，不是具体类型，所以加 `Nurse` 时那个方法不用碰。
>
> 🎁 加分答案：能指出「零改动的前提是接口定义得对」——如果一开始接口里放了 `getDoctors()` 这种医疗专属方法，加护士就要改接口、改所有实现。所以组合模式的第一道功夫在**接口设计**：接口上只能放「所有节点都有意义」的操作。再加一句：**组合模式靠接口稳定性换取扩展的开放性，接口一旦漏进具体类型的信息，整个模式就退化成 if-else。**

### 实现五：`querySelector` 为什么能查任意深度

最后一个实现不是「写」出来的，是**浏览器已经替你写好的**。

```javascript
// 三个都能用，浏览器不关心你在操作哪一层
document.querySelector('.drug-card');         // 直接找深层元素
document.body.querySelector('.drug-card');    // 从 body 出发找
document.querySelector('.drug-card .price');  // 后代选择器，跨多层
```

为什么 `document` 和 `document.body` 都支持同样这三个方法？因为 DOM 里**几乎所有节点类型都继承自 `Node`**：

```text
Node（抽象基类，提供 appendChild / removeChild / parentNode / childNodes）
├── Element（元素节点，提供 querySelector / getAttribute / classList）
│   ├── HTMLElement
│   │   └── HTMLDivElement / HTMLSpanElement / ...
│   └── SVGElement
└── CharacterData
    ├── Text（文本节点 ← 叶子）
    └── Comment（注释节点 ← 叶子）
```

这张继承图就是组合模式在浏览器里的落地：`Node` 是 `Component`，`HTMLElement` 是 `Composite`（可以有 children），`Text` 是 `Leaf`（不能有 children）。

而 `querySelector` 能跨任意深度找到元素，靠的是一次**深度优先遍历**——和你刚写的 `render` 递归、`show()` 递归，本质上是同一段逻辑。

![DOM 文档树结构示意图：document 是根，html、body、div 都是可包含子节点的容器，文本节点是最底层的叶子](https://www.runoob.com/images/pic_htmltree.gif)

这张图画的是最标准的 DOM 树：最顶上是 `document`，往下是 `<html>`、`<body>` 和层层嵌套的元素，最底下是文本。**那些连线表达的正是「部分-整体」——一个 `<div>` 里可以再放 `<div>`，放到任意层。**

> 📚 **知识点**：DOM 是**透明式组合**的教科书。所有节点都继承了 `appendChild` / `removeChild`，所以 `document.createTextNode('x').appendChild(...)` 是合法的 API 调用——但会在运行时抛 `HierarchyRequestError`。浏览器用「运行时抛错」换来了「接口绝对统一」。**对照一下：TypeScript 的 `NodeListOf<T>` 泛型补的是「查到什么」的类型信息，补不了「能不能加孩子」。**

> 💬 **面试官**：`document.querySelector` 和 `element.querySelector` 有什么区别？
>
> ✅ 标准答案：功能完全一样，都是深度优先遍历查找后代元素，区别只在搜索起点。`document.querySelector` 从整个文档根开始，`element.querySelector` 只在那个元素的后代里找。从组合模式的角度看，这说明 `document` 和 `element` 提供的是同一套接口的不同实例——正是组合模式「叶子与容器接口一致」的体现。
>
> 🎁 加分答案：能补一个性能判断——**两者的复杂度都是 O(n)，n 是搜索范围内的节点数**。所以「先缩小范围再查」在深层 DOM 上是实打实的优化：在一个 5000 节点的页面里，直接 `document.querySelector('.x')` 最坏要遍历 5000 个；而先用 `getElementById` 拿到容器（哈希/索引查找，比遍历快得多）再 `container.querySelector('.x')`，范围可能只有 50 个。**这个优化之所以成立，正是因为组合模式允许你从树的任意节点作为根重新开始遍历。**

---

## 五、桥接模式：把 M×N 拆成 M+N

组合模式讲完了。现在换一个完全不同的问题——**注意，接下来这一整段都跟「树」没关系**，这就是为什么它们是两个模式。

### GoF 的原话与关键词

GoF 对桥接模式的意图定义：

> **将抽象部分与它的实现部分分离，使它们都可以独立地变化。**

这句话是 23 种模式里**最容易被误读的一句**，没有之一。因为「抽象」和「实现」在面向对象语境里有好几层意思，多数人第一反应会理解成「抽象类 / 接口」和「实现类」在 Java 里的那个层次关系——**那就完全理解错了。**

### 先破一个误解：「抽象」和「实现」到底指什么

先看一个错误理解会导致什么。

如果「抽象」= 抽象类、「实现」= 实现类，那么所有「接口 + 实现类」的结构都是桥接模式——这显然荒谬，因为那样一来 23 种模式里有 20 种都成了桥接。

**正确的理解是：「抽象」和「实现」指的是两个独立变化的维度。**

用一个最直白的例子说明。假设你要画图形：

- **维度一：图形种类。** 圆形、方形、三角形——这个维度会扩展
- **维度二：着色方式。** 红色、蓝色、绿色——这个维度也会扩展

这两个维度**互不相干**：圆可以是红的，也可以是蓝的；蓝色可以涂在圆上，也可以涂在方上。它们不是「抽象类与子类」的上下关系，而是**两个正交的轴**。

而「继承」只能表达**一个轴**——`Circle extends Shape` 表达的是「圆形是一种形状」，它没法再表达「圆形还可以是红的或蓝的」。

这才是桥接模式要解决的问题：**当你有两个正交的变化轴，而继承只能沿一个轴扩展时，怎么办？**

答案是：**让一个轴持有另一个轴的引用，而不是继承它。**

### 三种解法，代价完全不同

用一个具体的数字看清楚这三种写法的差别。

假设图形有 3 种（圆、方、三角），颜色有 3 种（红、蓝、绿）。

**解法一：继承（一个轴用继承，另一个轴用子类）**

```typescript
// 每个「图形 × 颜色」组合一个类
class RedCircle {}
class BlueCircle {}
class GreenCircle {}
class RedSquare {}
class BlueSquare {}
class GreenSquare {}
class RedTriangle {}
class BlueTriangle {}
class GreenTriangle {}
// 3 × 3 = 9 个类
```

类数量 = **M × N**。加一种颜色（黄色），立刻要写 3 个新类；加一种图形（五角星），又要写 3 个。

**解法二：只用一个轴的变化（把颜色做成参数）**

```typescript
class Circle {
  constructor(private color: string) {}
}
```

这是大多数人「顺手」会写的代码。类数量 = **M**，看起来最优——但它把颜色降级成了**一个字符串参数**。

问题在哪？颜色一旦不只是「一个值」，而是「一套着色算法」（渐变、描边、透明度、混合模式），这个字符串就装不下了。你会开始写：

```typescript
class Circle {
  constructor(private color: string) {}
  render() {
    if (this.color === 'red') { /* 红色逻辑 */ }
    else if (this.color === 'blue') { /* 蓝色逻辑，但和红色大部分一样 */ }
    // 👈 着色逻辑开始按颜色分支，两个维度又搅在一起了
  }
}
```

**解法三：桥接**

```typescript
// 维度二：颜色（实现轴）
interface Color { fill(ctx: CanvasRenderingContext2D): void; }
class RedColor implements Color { fill(ctx) { ctx.fillStyle = '#e33'; } }
class BlueColor implements Color { fill(ctx) { ctx.fillStyle = '#36c'; } }
class GreenColor implements Color { fill(ctx) { ctx.fillStyle = '#3a3'; } }

// 维度一：图形（抽象轴），持有一个 Color 引用
abstract class Shape {
  constructor(protected color: Color) {}   // 👈 桥：持有引用，不继承
  abstract draw(ctx: CanvasRenderingContext2D): void;
}
class Circle extends Shape {
  draw(ctx) { ctx.beginPath(); ctx.arc(100, 100, 50, 0, Math.PI * 2); this.color.fill(ctx); }
}
class Square extends Shape {
  draw(ctx) { ctx.fillRect(50, 50, 100, 100); this.color.fill(ctx); }
}
```

类数量 = **M + N**。加一种颜色只写 1 个类，加一种图形只写 1 个类。而且**两个方向互不影响**——这就是「独立地变化」。

三种解法对比：

| 解法 | 类数量 | 扩展成本 | 代价 |
|------|--------|---------|------|
| 全继承 | M × N | 任一维加 1 都要加 N 或 M 个类 | 类爆炸 |
| 参数化 | M | 任一维加 1 只改 1 处 | 维度二失去抽象，逻辑塞进 if-else |
| **桥接** | **M + N** | **任一维加 1 只加 1 个类** | 多一层间接，需要识别出「两个维度」 |

**M×N 到 M+N 的这个降维，就是桥接模式的全部价值。** 记住这个式子，面试时说出来比背定义有用得多。

先看看「不拆」的代价：

![桥接模式要解决的问题示意：图形的种类与颜色如果都用继承表达，会产生数量呈乘法级增长的类（几何图形 × 颜色）](https://refactoring.guru/images/patterns/diagrams/bridge/problem-zh.png)

这张图画的就是「类爆炸」：左边是图形种类，右边是颜色，中间的每一个交叉点都对应一个要手写的子类。**它的视觉冲击力比任何文字说明都强——你一眼就能看出这是乘法，不是加法。**

再看拆开之后的样子：

![桥接模式的解决方案示意：图形的形状维度（圆形、方形）与颜色维度（红色、蓝色）各自独立成体系，中间由一根引用连接，任意形状可以配任意颜色](https://refactoring.guru/images/patterns/diagrams/bridge/example-zh.png)

对比一下：**上面一张是交叉的网格（每个交点一个类），这一张是两条平行的竖线中间一根横线（两个维度各一条线）。** 同一个需求，结构从「网格」变成「工」字形——这就是桥接做的事。

### 笔记原文：三句话讲完的概述

回到笔记，它的概述也是三句，原文保留：

> + 将抽象部分与它的实现部分分离，这样抽象化与实现化解耦，使它们可以独立的变化
>
> + 应用场景是实现系统可能有多个角度分类，每一种角度都可能变化
>
> + 桥方可以通过实现桥接口进行单方面扩展，而另一方可以继续抽象类而单方面扩展，而之间的调用就从桥接口来作为突破口，不会受到双方扩展的任何影响

第一句是 GoF 原文的翻译。

**第二句是这份笔记最有价值的一句**——「可能有**多个角度分类**，每**一种角度都可能变化**」。这句话直接给出了识别桥接模式的判据：**找出两个以上的分类角度，检查它们是否各自变化。**

第三句把机制说透了：「之间的调用就从桥接口来作为突破口」。意思是**两个维度之间唯一的接触点，就是那个 `Implementor` 接口**——其他任何地方都不许互相引用。这是桥接模式的结构纪律。

### 一条能当场用的判据

把「两个维度」翻译成可操作的判断：

> **把候选的两个维度分别画成两条轴，问自己：两个轴的取值能不能自由组合？加一个轴上的值，另一个轴的代码要不要改？**
>
> - 能自由组合、且互不需改 → **这两个维度就是桥接的候选**
> - 两个轴其实有从属关系（「红圆」是一种「圆」吗？不是——红圆是一种「红色的东西」也是一种「圆形」，两个都对） → 说明是正交的
> - 两个轴不能自由组合（比如「支付方式」和「退款流程」在某些组合下不存在） → 不一定是桥接，可能只是策略

再给一个反向判据，防止滥用：

> **如果只有一个维度在变，别用桥接。** 桥接的代价是多一层间接；只有一个轴变化时，用策略模式（同一维度内替换算法）就够了。

> 📚 **知识点**：桥接模式在 GoF 原书里的两个轴，官方术语是 **Abstraction（抽象）** 和 **Implementor（实现者）**。注意 `Implementor` 不是「实现类」的意思，它是「**实现这一侧的具体做法**」——图形是「要做什么」（抽象），颜色是「具体怎么上色」（实现）。用中文说更清楚：**Abstraction 是「业务概念」，Implementor 是「底层手段」。** 图形的业务概念是「圆、方、三角」，底层手段是「用什么颜色画」。业务概念可以天天加，底层手段也可以天天加，两者不该互相知道。

> 💬 **面试官**：什么情况下继承会导致类爆炸？桥接模式怎么解决？
>
> ✅ 标准答案：当系统有两个以上正交的分类维度、且每个维度都可能扩展时，继承只能表达一个维度——另一个维度只能靠「为每个组合写一个子类」来表达，于是类数量变成两个维度取值的乘积 M×N。桥接模式把其中一个维度从事先组合改成运行时持有：抽象侧（如图形）持有一个实现侧（如颜色）的引用，两者各按自己的轴扩展，类数量变成 M+N。
>
> 🎁 加分答案：能补一句「桥接不是无脑把继承换成组合」——判断依据是「两个维度是否真的正交、是否都会变」。如果只有一个维度变化，用组合反而只增加间接性没有收益，那种情况属于策略模式。再加一句成本对比：**桥接省下的是类的数量，付出的是「运行时才知道具体实现」的调试成本**——继承方案在编译期就能看到所有组合，桥接方案要看配置文件或调用处才知道某个图形配了哪个颜色。

---

## 六、桥接模式的结构：四角色与一条桥

### 四个角色

GoF 给桥接模式定义了四个角色，分列在两个维度上：

![桥接模式四角色结构图：Abstraction 持有 Implementor 引用，RefinedAbstraction 继承 Abstraction，ConcreteImplementor 实现 Implementor](https://refactoring.guru/images/patterns/diagrams/bridge/structure-zh.png)

- **Abstraction（抽象类）**：定义「业务概念」这一侧的接口，**内部持有一个 `Implementor` 引用**
- **RefinedAbstraction（扩充抽象类）**：Abstraction 的子类，实现/扩展业务概念（如 `Circle`、`Square`）
- **Implementor（实现者接口）**：定义「底层手段」这一侧的接口（如 `Color.fill()`）
- **ConcreteImplementor（具体实现者）**：实现侧的具体类（如 `RedColor`、`BlueColor`）

注意这张图里的两条线，它们是完全不同性质的：

- `Abstraction <|-- RefinedAbstraction`——**继承**，沿「业务概念」这个轴扩展
- `Abstraction --> Implementor`——**关联（持有引用）**，这是**桥本身**

**整个模式就靠这两条线的分工：一个轴用继承，另一个轴用引用。** 这是桥接模式在类图上唯一的识别特征。

### 笔记里的那张图

笔记第二章给的类图是这样的：

![桥接模式的桥接关系图：A 侧 A1/A2/A3 三个抽象，B 侧 B1/B2/B3 三个实现，中间通过 bridge 引用连接，形成 3×3 的灵活组合](https://cdn.nlark.com/yuque/0/2021/png/738210/1639408531737-80de1434-5a7c-4490-8ed4-741e1cc9381c.png)

这张图的信息量比第一眼看起来大。它画的是：

- 左边一列 `A1` / `A2` / `A3`，各自持有 `+bridge` 这个字段
- 右边一列 `B1` / `B2` / `B3`，被左边引用
- 中间有一堆 `+from()` / `+to()` 的方法标记

**它想表达的核心是「3 × 3 = 9 种组合，但只写了 6 个类」。** 这张图上没有画出来的那 3 个类（`A1B1`、`A1B2`、`A1B3`……），才是桥接模式省下来的东西。

### 为什么一定是「持有引用」而不是「继承」

这是桥接模式里最容易被跳过、但面试官最爱追的一问。

假设我们让 `A1` 继承 `B1`：

```typescript
class B1 { to() { return 'B1'; } }
class A1 extends B1 { from() { return 'A1'; } }
```

看起来也能跑，`A1` 既有 `from()` 也有 `to()`。但问题立刻出现：

- `A1` 只能「是」B1，不能同时「是」B2。想换终点？得重新写一个 `A1B2` 类
- 如果 `A2` 也要用 `B1`，得再写一个 `A2` extends `B1`——**B1 的代码在继承树里被复制了两遍**
- 更致命的是：`A1` 从 `B1` 继承了「B1 是一种 B」这个 is-a 语义。但 `A1` 根本不是一种 B——**它们是两个维度的东西**

换成持有引用，这三个问题一次解决：

```typescript
class A {
  constructor(private bridge: B) {}   // 👈 运行时可换，不用新增类
  go() {
    console.log(`从${this.from()}到达${this.bridge.to()}`);
  }
}
new A1(new B2());   // A1 配 B2
new A1(new B3());   // A1 配 B3 —— 同一个类，换个参数
```

**「运行时可变」这一条，是引用相对继承的根本优势。** 继承在编译期就锁死了组合，引用在运行时才能确定。

### 术语对照：笔记的命名 vs GoF

笔记（写于 2021 年）用的是 `A` / `B` 这种极简命名，GoF 与 refactoring.guru 用的是四个有语义的角色名。对照表如下：

| 笔记叫法 | GoF 叫法 | 语义 |
|---------|---------|------|
| `A` | Abstraction | 业务概念侧的抽象，持有桥引用 |
| `A1` / `A2` / `A3` | RefinedAbstraction | 业务概念的具体形态 |
| `B` | Implementor | 底层手段侧的接口 |
| `B1` / `B2` / `B3` | ConcreteImplementor | 底层手段的具体实现 |

用 `A`/`B` 命名有个好处：**它强迫你把注意力放在「结构」而不是「语义」上。** 看代码时你不会被「圆」「红」这些词带偏，而是直接看到「左边三个、右边三个、中间一根线」——这恰恰是桥接模式的骨架。

不过真实项目里，一定要换成有业务含义的名字。**`A`/`B` 只适合教学，进代码就是灾难。**

> 📚 **知识点**：桥接模式和「依赖倒置」是同一件事的两种尺度上的表达。DIP 说「高层模块不该依赖低层模块，两者都该依赖抽象」——桥接模式里，`Abstraction`（业务概念，高层）和 `Implementor`（底层手段，低层）之间的连接，正是通过 `Implementor` 这个抽象接口完成的。**所以桥接模式可以说是 DIP 在「两个变化维度」这个具体场景下的落地形态。** 面试时把这句话说出来，比只背桥接定义高一个档次。

> 💬 **面试官**：桥接模式里，为什么 Abstraction 要持有 Implementor 的引用，而不是让 RefinedAbstraction 直接继承 ConcreteImplementor？
>
> ✅ 标准答案：因为这两个东西属于两个不同的变化维度，是 has-a 关系而不是 is-a 关系。继承会带来三个问题：一是锁死组合，`A1 extends B1` 之后 `A1` 就没法和 `B2` 组合了；二是代码重复，多个 A 想共用同一个 B 时要写多份继承；三是语义错误，`A1` 并不是「一种 B」。持有引用则可以在运行时任意替换实现，同时保留两个维度各自的继承体系。
>
> 🎁 加分答案：能补充「这个选择在所有结构型模式里是通用的判断」——装饰器、代理、组合、适配器全部都是「持有引用」而不是「继承被包装者」，原因完全一样：**继承表达 is-a 的静态组合，引用表达 has-a 的动态组合。** 而结构型模式存在的意义，恰恰是「用动态组合替代静态继承」。再加一句实战判断：**看到「两个维度都在变」就想到引用，看到「一个维度在变」用参数就够了。**

---

## 七、桥接模式的四个实现：从 A/B 交叉到报表双维度

上一章讲了结构，这一章把它跑起来。四个实现，前三个来自笔记，第四个补齐医疗业务落地。

### 实现一：A/B 交叉组合

笔记第三章的完整代码，是桥接模式的最小可运行版本：

```typescript
abstract class A {
  constructor(private bridge: B) {}
  go() {
    console.log(`从${this.from()}到达${this.bridge.to()}`);
  }
  abstract from(): string;
}

class A1 extends A {
  from(): string {
    return 'A1';
  }
}
class A2 extends A {
  from(): string {
    return 'A2';
  }
}
class A3 extends A {
  from(): string {
    return 'A3';
  }
}

abstract class B {
  abstract to(): string;
}

class B1 extends B {
  to(): string {
    return 'B1';
  }
}
class B2 extends B {
  to(): string {
    return 'B2';
  }
}
class B3 extends B {
  to(): string {
    return 'B3';
  }
}

const b2 = new B2();
const a1 = new A1(b2);
a1.go();          // 输出：从A1到达B2
const a2 = new A2(b2);
a2.go();          // 输出：从A2到达B2
```

**总共 6 个类，覆盖了 3 × 3 = 9 种组合。** 这就是上一章那个 M×N → M+N 的式子，在一个能跑的例子里的样子。

这段代码最值得反复看的是 `A` 的这两行：

```typescript
constructor(private bridge: B) {}                        // 👈 桥：父类持有实现的引用
console.log(`从${this.from()}到达${this.bridge.to()}`);   // 👈 桥的用法：委托给实现
```

拆开看，它做了三件事：

- **持有**：`A` 内部有一个 `B` 类型的字段，构造函数注入
- **委托**：`A.go()` 自己不实现「到达」这件事，交给 `this.bridge.to()`
- **自实现**：`A.go()` 自己负责「从哪里出发」，用抽象方法 `from()` 让子类填

**「一半自己做、一半委托出去」——这就是桥接模式在方法体内的形态。** 判断一段代码是不是桥接，与其看类图，不如看方法体里有没有这种「一半自己一半委托」的分工。

### 实现二：事件监听里的桥

第二个实现来自笔记第四章，是一个容易被低估的例子——**它把桥从「两个类之间」挪到了「DOM 和业务逻辑之间」。**

先看服务端（`server.js`）：

```javascript
const express = require('express');
const path = require('path');
const app = express();

app.use('/user/:id', (req, res) => {
  const id = req.params.id;
  res.json({
    id,
    name: `bridge${id}`
  });
});

app.use('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(8088);
```

再看前端（`index.html` 里的脚本，HTML 骨架已去掉）：

```html
<ul>
  <li data-id="1">用户1</li>
  <li data-id="2">用户2</li>
</ul>
<p id="content"></p>
<script>
  const lis = document.querySelectorAll("li");
  for (let i = 0; i < lis.length; i++) {
    const li = lis[i];
    li.addEventListener("click", getUserByIdBridge);
  }

  // todo
  function getUserByIdBridge() {
    const content = document.querySelector('#content');
    const id = this.dataset.id;
    getUserById(id, (data) => {
      content.innerHTML = data.name;
    });
  }

  function getUserById(id, callback) {
    // const id = event.target.dataset.id; // 不依赖this或event
    fetch(`/user/${id}`)
      .then((response) => response.json())
      .then(data => callback(data))
      // .then(data => content.innerHTML = data.name); // 不操作DOM
  }
</script>
```

这段代码不长，但**它体现的桥接思想需要单独讲清楚**，因为笔记只留了注释，没有解释。

先看两个维度的划分：

- **维度一：交互（谁被点了、点了之后弹什么）**——这部分是 DOM 层的事
- **维度二：数据（怎么根据 id 拿用户）**——这部分是请求层的事

看 `getUserById` 的两条注释，它们就是在标注「桥」的位置：

```javascript
function getUserById(id, callback) {
  // const id = event.target.dataset.id; // 不依赖this或event
  fetch(`/user/${id}`)
    .then((response) => response.json())
    .then(data => callback(data))
    // .then(data => content.innerHTML = data.name); // 不操作DOM
}
```

**第一行注释说「不依赖 this 或 event」**——意思是这个函数不承认自己活在一个 DOM 事件里。它只接收一个 `id` 字符串，别的一概不关心。

**最后一行注释说「不操作 DOM」**——意思是它拿完数据就交出去，不决定数据怎么用。

把这两句话连起来读，你会发现 `getUserById` 的签名 `(id, callback)` 就是那座桥：

```typescript
// 桥的接口：只要 id 和「拿到数据后做什么」
function getUserById(id: string, callback: (data: UserData) => void): void
```

而桥的两侧各自独立变化：

- **DOM 侧变化**：点击改成 hover 触发、`<li>` 改成 `<div>`、加一个右键菜单——`getUserById` 一行不改
- **请求侧变化**：`fetch` 改成 axios、加缓存、改接口路径、加重试——DOM 代码一行不改

**如果没有这座桥**，代码会变成笔记注释里那种「删掉前」的形态：

```javascript
// ❌ 没桥的版本：DOM 和请求搅在一起
li.addEventListener("click", function() {
  const id = event.target.dataset.id;                    // 依赖 event
  fetch(`/user/${id}`)
    .then(r => r.json())
    .then(data => {
      document.querySelector('#content').innerHTML = data.name;  // 操作 DOM
    });
});
```

这个版本能跑，但**三个东西被焊死在一起**：事件的形状（`event.target`）、请求的方式（`fetch`）、渲染的方式（`innerHTML`）。任何一处要变，都要动这段代码。

> 📚 **知识点**：这个例子里「桥」不是类，而是一个**函数签名**——`(id, callback) => void`。这是 JS 作为多范式语言给桥接模式带来的简化：**当两个维度的接触面只有一个数据（id）和一个出口（callback）时，一个函数就够当桥，不需要写两个抽象类。** 反过来说，**判断「要不要真的写 Abstraction / Implementor 两层抽象」，看接触面有多宽**：接触面窄，函数即桥；接触面宽（要交换多个方法、要保持状态），才需要完整的四角色结构。

> 💬 **面试官**：你说的「函数即桥」，那所有回调函数都算桥接模式吗？
>
> ✅ 标准答案：不算。判据是**回调是否真的隔离了两个独立变化的维度**。这个例子里，回调把「拿数据」和「用数据」分开了，而且分开后两边确实各自有独立的扩展需求（触发方式会变、请求实现会变），所以它是桥。而 `[1,2,3].forEach(x => console.log(x))` 里的回调，只隔离了「遍历」和「打印」一个动作，没有两个独立演化的维度，那只是高阶函数，不是桥接。
>
> 🎁 加分答案：能补一句「模式是意图的命名，不是结构的命名」——桥接模式的核心判据不是「有没有持有引用 + 有没有接口」，而是「这个引用是否切分开了两个能各自独立扩展的维度」。**同一个 `(id, callback)` 签名，如果两个维度都不会再变，那它就只是普通的分层调用；如果两个维度都会各自演化，它才是桥。** 这一点是译文/教材普遍没讲清的。

### 实现三：分离变化——Position / Color / Circle

第三个实现来自笔记第四章的第二个场景，它把桥接思想用在了**数据结构的拆分**上，比前两个更贴近日常代码。

```javascript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function Position(x, y) {
  this.x = x;
  this.y = y;
}

function Color(color) {
  this.color = color;
}

function Circle(x, y, color, radius) {
  this.position = new Position(x, y);   // 👈 维度一：位置
  this.color = new Color(color);        // 👈 维度二：颜色
  this.radius = radius;
}

Circle.prototype.render = function() {
  ctx.beginPath();
  ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
  ctx.fillStyle = this.color.color;     // getRandomColor();
  ctx.fill();
}

const c = new Circle(200, 200, '#25b864', 100);
c.render();
```

（笔记里这段 HTML 还带了 `body { margin: 50px auto; text-align: center }` 和 `canvas { border: 1px solid #ccc }` 两个样式，作用只是让画布居中并显示边框，便于看清绘制范围。）

这段代码把 `Circle` 的属性拆成了两个独立的对象：

- `position`（位置）——将来可能扩展成「相对位置」「极坐标位置」「路径位置」
- `color`（颜色）——笔记里那句注释 `// getRandomColor()` 就是线索：颜色是要变的，将来可能是随机色、渐变色、主题色

**为什么这不是「过度设计」？** 因为 `Position` 和 `Color` 各自都有明确的、独立的演化方向：

```javascript
// 位置维度演化：加一个极坐标实现
function PolarPosition(r, theta) {
  this.r = r;
  this.theta = theta;
}
// 颜色维度演化：从单色变成渐变
function GradientColor(from, to) {
  this.from = from;
  this.to = to;
}
// Circle 的 render 完全不用改——它只知道 position 和 color 有约定的接口
```

笔记里那句 `// getRandomColor()` 值得单独说：**它其实是在提示「这里的颜色将来会被替换成一个动态来源」**——而替换成动态来源的前提，就是颜色被抽成了独立对象。

不过这个实现也暴露了一个常见的问题：**`Color` 只有一个 `color` 字段，看起来「抽出来毫无意义」。**

```javascript
function Color(color) {
  this.color = color;   // 👈 就一个字段，和直接传字符串有什么区别？
}
```

区别在于**将来**：

- 现在：`new Color('#25b864')`
- 加透明度：`new Color('#25b864', 0.5)`
- 加渐变：`new GradientColor('#25b864', '#1a7f42')`
- 加描边：`new Color('#25b864', { stroke: '#000', width: 2 })`

**如果一开始传的是字符串，这四次演化的每一次都要改 `Circle`；抽成对象后，`Circle` 一次都不用改。** 这就是桥接模式「用一点前期成本换取后期扩展自由」的典型形态。

> 💬 **面试官**：把 `Color` 抽成一个只有单个字段的类，是不是过度设计？
>
> ✅ 标准答案：判断标准是「这个维度会不会演化」。如果颜色永远只有一个十六进制字符串、永远不会有透明度/渐变/描边，那抽出来确实是过度设计。但在 Canvas 绘制这个场景里，颜色维度几乎必然会演化——这一个字段的类就是给未来留的接口位。这正是桥接模式与「过早抽象」的分界：**过早抽象是为「可能」变化而抽象，桥接是为「已知会变」的两个维度而抽象。**
>
> 🎁 加分答案：能补 YAGNI 的视角——「如果你现在说不出这个维度将来会往哪两个方向变，就先别抽」。**桥接模式的正确使用姿势，是先识别出两个具体的、各自已有变化苗头的维度，而不是把所有属性都抽成对象。** 上面这个例子能立住，是因为 `// getRandomColor()` 那行注释已经证明了颜色要变。

### 实现四：药品销售报表双维度

前三个实现，两个维度都比较「小」（A/B 是教学、位置/颜色是绘制）。现在把第一章那个真正会让人加班的需求做掉——**3 个分组 × 3 种输出 = 9 个类，改成桥接后 6 个。**

先看两个维度各自的接口：

```typescript
// 维度一：分组策略（Abstraction 侧）——决定「按什么维度汇总数据」
interface GroupStrategy {
  groupName(): string;
  // 把原始订单按这个维度汇总成行
  group(orders: DrugOrder[]): ReportRow[];
}

class RegionGroup implements GroupStrategy {          // 按地区分组
  groupName() { return '按地区'; }
  group(orders: DrugOrder[]) {
    const map = new Map<string, ReportRow>();
    for (const o of orders) {
      const key = o.region;                            // 华东 / 华南 / 华北
      const row = map.get(key) ?? { label: key, amount: 0, count: 0 };
      row.amount += o.amount;
      row.count += 1;
      map.set(key, row);
    }
    return [...map.values()];
  }
}

class CategoryGroup implements GroupStrategy {        // 按药品类别分组
  groupName() { return '按药品类别'; }
  group(orders: DrugOrder[]) {
    const map = new Map<string, ReportRow>();
    for (const o of orders) {
      const key = o.drugCategory;                      // 抗感染 / 心血管 / 消化
      const row = map.get(key) ?? { label: key, amount: 0, count: 0 };
      row.amount += o.amount;
      row.count += 1;
      map.set(key, row);
    }
    return [...map.values()];
  }
}

class DoctorGroup implements GroupStrategy {          // 按医生分组
  groupName() { return '按医生'; }
  group(orders: DrugOrder[]) {
    const map = new Map<string, ReportRow>();
    for (const o of orders) {
      const key = o.doctorName;
      const row = map.get(key) ?? { label: key, amount: 0, count: 0 };
      row.amount += o.amount;
      row.count += 1;
      map.set(key, row);
    }
    return [...map.values()];
  }
}
```

```typescript
// 维度二：输出形式（Implementor 侧）——决定「怎么把这个表呈现出来」
interface ReportRenderer {
  render(title: string, rows: ReportRow[]): void;
}

class TableRenderer implements ReportRenderer {
  render(title: string, rows: ReportRow[]) {
    console.table(rows);                              // 表格
  }
}

class ChartRenderer implements ReportRenderer {
  render(title: string, rows: ReportRow[]) {
    // 柱状图：这里用 canvas 画，实际项目里换成 ECharts 或 Chart.js
    const canvas = document.querySelector<HTMLCanvasElement>('#chart')!;
    const ctx = canvas.getContext('2d')!;
    rows.forEach((row, i) => {
      const h = (row.amount / Math.max(...rows.map(r => r.amount))) * 200;
      ctx.fillRect(i * 80 + 20, 240 - h, 50, h);
    });
  }
}

class ExcelRenderer implements ReportRenderer {
  render(title: string, rows: ReportRow[]) {
    // 实际项目里用 SheetJS 导出，这里用 CSV 演示最小实现
    const csv = ['标签,金额,笔数', ...rows.map(r => `${r.label},${r.amount},${r.count}`)].join('\n');
    downloadText(`${title}.csv`, csv);
  }
}
```

**桥就在这里**——`Report` 持有 `GroupStrategy`，操作时把另一个维度作为参数传进来：

```typescript
class Report {
  constructor(
    private group: GroupStrategy,        // 👈 维度一：持有
    private renderer: ReportRenderer     // 👈 维度二：持有
  ) {}

  build(orders: DrugOrder[]) {
    const rows = this.group.group(orders);            // 维度一做事
    this.renderer.render(this.group.groupName(), rows); // 维度二做事
  }
}

// 使用：任意组合，只在构造时决定
new Report(new RegionGroup(), new TableRenderer()).build(orders);    // 按地区 + 表格
new Report(new RegionGroup(), new ChartRenderer()).build(orders);    // 按地区 + 柱状图
new Report(new CategoryGroup(), new ExcelRenderer()).build(orders);  // 按类别 + Excel
```

**注意这里有一处和前面三个实现不一样的地方，值得停下来看：** `Report` 同时持有**两个**维度。

```typescript
constructor(
  private group: GroupStrategy,        // 维度一
  private renderer: ReportRenderer     // 维度二
) {}
```

那么问题来了——**这到底是「桥接」还是「策略」？**

这正是第八章要辨析的第一组和第二组问题。答案是：

- 从 `Report` 的角度看，它同时持有两个接口引用，**这就是桥接**（`group` 和 `renderer` 是两个独立变化的维度）
- 但 `GroupStrategy` 这一侧**单独看**，又是标准的**策略模式**（同一件事——分组——的多种算法可替换）
- 而 `ReportRenderer` 这一侧，更是典型的**策略模式**（同一件事——展示——的多种形式可替换）

**关键结论：桥接和策略不是互斥的两个东西。桥接描述的是「两个维度之间的关系」，策略描述的是「一个维度内部的组织方式」。一个桥接结构里，两个维度各自内部往往都是策略集合。**

这个结论是把两个模式真正吃透的标志，第八章会展开。这里先记下一句：

> **一个完整的桥接模式 = 两个策略集合 + 一根连接它们的引用。**

> 💬 **面试官**：你这段代码里 `Report` 同时持有 group 和 renderer，这是桥接还是策略？
>
> ✅ 标准答案：`Report` 与这两个接口之间的关系是桥接——因为它连接了两个独立变化的维度：分组方式会变（地区/类别/医生），输出形式也会变（表格/图表/Excel），两者可以自由组合，各自扩展互不影响。而 `GroupStrategy` 和 `ReportRenderer` 各自内部那一组实现，是策略——同一个维度内的算法替换。
>
> 🎁 加分答案：能补一句「这两个概念描述的是不同层级的关系」——策略描述「上下文持有一个策略接口，运行时替换算法」，是**一个维度内部**的组织；桥接描述「抽象侧持有一个实现侧引用」，是**两个维度之间**的连接。**所以一个桥接结构里天然包含两个策略集合，说「桥接是两个策略的桥接」是准确的。** 反过来说，只有一个维度时用「策略」，有两个正交维度时才升级成「桥接」——这也是它们最实用的区分方式。

---

## 八、易混淆辨析：四组必考

这一章是全篇密度最高的部分。四组辨析，每一组都给出「判据」而不是「结论」。

### 辨析一：组合 vs 桥接

把它们放在一篇里，就必须先把这组讲清楚。

| 维度 | 组合 | 桥接 |
|------|------|------|
| 解决的问题 | 层级加深时，调用方要判断类型 | 维度增加时，类数量按乘法增长 |
| 结构特征 | `Composite --> Component` 自引用 | `Abstraction --> Implementor` 跨维度引用 |
| 变化方向 | **纵向**：树的层数、节点类型 | **横向**：轴的取值 |
| 扩展方式 | 新增一种节点类型 | 新增一个轴上的值 |
| 类数量 | 与节点类型数量线性相关 | 从 M×N 降为 M+N |
| 一句话 | 把 N 层压成 1 层递归 | 把 M×N 拆成 M+N |

最容易混的地方在于：**两者的类图都有一条「指向接口的箭头」。**

- 组合：`Composite` 指向 `Component`——**它指向的是自己实现的接口**
- 桥接：`Abstraction` 指向 `Implementor`——**它指向的是另一个维度的接口**

**这一条细微差别就是全部：自引用还是跨维度引用。**

用代码验证一下。下面两个类，左边是组合，右边是桥接：

```typescript
// 组合：children 里的东西和我自己是同一个接口
interface StaffNode { getName(): string; getCount(): number; }
class Department implements StaffNode {
  private children: StaffNode[] = [];   // 👈 和自己同一个类型
}

// 桥接：renderer 是另一个维度的东西，和我不是同一类
interface ReportRenderer { render(rows: ReportRow[]): void; }
class Report {
  constructor(private renderer: ReportRenderer) {}   // 👈 完全不同的接口
}
```

`Department` 的 children 类型是 `StaffNode`——**它自己也是 `StaffNode`**，这就是自引用。
`Report` 的 renderer 类型是 `ReportRenderer`——**`Report` 不是 `ReportRenderer`**，这就是跨维度。

**判据：问一句「我持有的是不是我自己的接口？」是 → 组合，不是 → 桥接。**

🔧 **真实场景**：一次 Code Review，同事问你「这个 `Menu` 类持有 `Menu[]` children，是组合还是桥接？」——答案是组合，因为 `Menu` 自己也是 `Menu`（`Menu` 实现 `MenuItem` 接口，`children` 也是 `MenuItem[]`）。但如果后来有人改成 `Menu` 持有 `MenuRenderer`，那就变成桥接了。**同一个类在重构过程中可以从组合变成桥接，判断永远看「当下这个引用指向谁」。**

> 💬 **面试官**：组合模式和桥接模式有什么区别？
>
> ✅ 标准答案：两者解决的是完全不同的问题。组合模式解决「树形结构里单个节点和整体怎么用统一接口处理」的问题，核心是让叶子和容器实现同一个接口，调用方不需要判断类型；它的类图特征是 Composite 持有 Component 的列表，这是自引用。桥接模式解决「两个正交维度都在变化时类数量爆炸」的问题，核心是把一个维度从事先组合（继承）改成运行时持有（引用），把 M×N 个类降为 M+N 个；它的类图特征是 Abstraction 持有 Implementor 的引用，这是跨维度。
>
> 🎁 加分答案：能给出「看引用的目标类型」这个判据——「我持有的是不是我自己的接口」。是 → 组合，不是 → 桥接。再补一句话把两者串起来：**组合处理的是「同类之间」的层级关系，桥接处理的是「异类之间」的组合关系。所以组合可以用递归，桥接必须靠委托。**

### 辨析二：桥接 vs 策略

这是全篇最需要讲清的一组，因为**两者的类图几乎一模一样。**

![策略模式结构图：Context 持有 Strategy 引用，多个 ConcreteStrategy 实现同一接口——与桥接模式的 Abstraction/Implementor 结构高度相似](https://refactoring.guru/images/patterns/diagrams/strategy/structure.png)

把桥接的图拿出来对比：`Abstraction --▶ Implementor ◁-- ConcreteImplementor`。
再把策略的图拿出来：`Context --▶ Strategy ◁-- ConcreteStrategy`。

**结构一模一样。** 都是「一个类持有一个接口引用，接口有几个实现」。

那区别在哪？

**区别不在结构里，在「你数得出几个维度」。**

| 维度 | 策略 | 桥接 |
|------|------|------|
| 有几个变化维度 | **1 个**（算法） | **2 个**（抽象 + 实现） |
| 谁在变 | 只有被持有的那一侧 | 两侧都在变 |
| 类数量收益 | 消除 if-else | M×N → M+N |
| 典型信号 | 「同一件事有多种做法」 | 「两件事都要独立扩展」 |
| 举例 | 排序算法、校验规则、easing | 图形 × 颜色、分组 × 输出 |

**判据：把持有的那一侧列出来，再问「持有方自己有没有子类」。**

```typescript
// 策略：Context 没有子类，只有策略在变
class Sorter {
  constructor(private strategy: SortStrategy) {}
}
// 👆 Sorter 只有这一个类，变化的只有 strategy

// 桥接：两侧都有子类
abstract class Shape {                              // 👈 这一侧有子类：Circle / Square
  constructor(protected color: Color) {}
}
class Circle extends Shape {}
class Square extends Shape {}
interface Color {}                                  // 👈 另一侧也有实现：Red / Blue
class RedColor implements Color {}
```

**「持有方有没有子类」这一条，是桥接和策略最硬的分界线。** 策略的 `Context` 通常是唯一的（一个排序上下文），桥接的 `Abstraction` 必然是一族。

回到第七章实现四那段代码，现在可以精确回答了：

```typescript
class Report {
  constructor(private group: GroupStrategy, private renderer: ReportRenderer) {}
}
```

`Report` 只有一个类、没有子类——按上面的判据，它其实**不是标准桥接**，而是「一个持有两个策略的上下文」。

**但这重要吗？不重要。** 因为它的意图完全达标了：两个维度各自独立扩展、M×N 降成 M+N。**GoF 的模式是为了沟通，不是为了给代码打分。**

严格说，标准桥接应该是这样——两个维度都有子类：

```typescript
// 标准桥接：抽象侧有子类，实现侧也有实现
abstract class BaseReport {
  constructor(protected group: GroupStrategy, protected renderer: ReportRenderer) {}
  abstract build(orders: DrugOrder[]): void;
}
class SalesReport extends BaseReport {}        // 👈 抽象侧的子类
class InventoryReport extends BaseReport {}    // 👈 抽象侧的子类
```

这样就成了「报表类型 × 分组 × 输出」三个维度，用一层桥接把「报表类型」和「分组+输出」连接起来。**真实项目里维度常常超过两个，那就需要多层桥接，或者干脆退回「组合 + 策略」的混合用法。**

> 📚 **知识点**：**桥接和策略在「结构」上不可区分，只在「意图和维度数量」上可区分。** 这也是 GoF 反复强调「模式是意图」的原因——如果只看类图，桥接、策略、状态、代理、装饰器这五个模式的类图都能画成「持有接口引用」，但它们的意图完全不同。**面试时如果你只能说结构，是拿不到分的；能说意图，才是真的懂。**

> 💬 **面试官**：桥接模式和策略模式的区别是什么？
>
> ✅ 标准答案：结构上两者完全一样，都是一个类持有一个接口引用。区别在维度数量：策略模式只有一个变化维度——被持有的那一侧（算法）会变，持有方（Context）本身不变；桥接模式有两个独立的变化维度——抽象侧有子类、实现侧也有实现，两侧都要能独立扩展，收益是把 M×N 个类降成 M+N。
>
> 🎁 加分答案：能给出最实用的判据——「看持有方有没有子类」。`Sorter` 唯一的、持有一个 `SortStrategy`，那是策略；`Shape` 有 `Circle`/`Square` 子类、同时持有一个 `Color`，那是桥接。再补一句：**实际项目里两者常常嵌套使用**——一个桥接结构里，两个维度各自的内部往往都是策略集合。所以「桥接是两个策略的桥接」这句话是准确的，它说明桥接是策略在「多维度」场景下的升级形态。

### 辨析三：组合 vs 装饰器

这一组比前两组更容易混，因为**两者的类图都有一个「实现接口 + 持有同接口引用」的类。**

![装饰器模式结构图：Decorator 实现 Component 接口，同时持有一个 Component 引用，靠层层包装叠加职责](https://refactoring.guru/images/patterns/diagrams/decorator/structure.png)

对比一下组合的 `Composite`：

| 维度 | 组合 | 装饰器 |
|------|------|--------|
| 持有的结构 | **一对多**：`Component[]` | **一对一**：单个 `Component` |
| 结构的形状 | 树（分叉） | 链（单线） |
| 语义 | 整体-部分 | 层层包装 |
| 对被包装者 | 不改变它的行为，只是聚合它的结果 | **增强**它的行为（加日志、加缓存） |
| 递归的效果 | 结果**汇总**（求和、计数、全选） | 结果**叠加**（一层层包上去） |
| 典型例子 | 科室树、文件树、DOM | HOC、中间件、AOP |

**判据：看持有的是「一个」还是「一组」。**

```typescript
// 组合：children 是数组
class Department implements StaffNode {
  private children: StaffNode[] = [];   // 👈 一组
}

// 装饰器：component 是单个
class LoggingDecorator implements StaffNode {
  constructor(private component: StaffNode) {}   // 👈 一个
}
```

再看一个更本质的差异——**递归的结果怎么处理**：

```typescript
// 组合：把多个子结果汇总（reduce）
getCount() {
  return this.children.reduce((sum, c) => sum + c.getCount(), 0);
}

// 装饰器：在自己的逻辑前后包住单个被装饰者的结果
getCount() {
  console.log('开始统计');       // 👈 前插
  const result = this.component.getCount();   // 👈 单个被装饰者
  console.log('统计结束');       // 👈 后插
  return result;                // 👈 原样返回，不改变语义
}
```

**组合是「分叉再合并」，装饰器是「穿过再返回」。** 一个是树的遍历，一个是链的传递。

还有一条更微妙的差异：**装饰器用的是「同一个接口」的极端形式——它既是 `Component` 又持有 `Component`，形成可以无限嵌套的同构结构。** 组合的 `Composite` 也是 `Component` 类型，也持有 `Component`，但它持有的是**一组**，语义是「这些东西是我的一部分」；装饰器持有的是**一个**，语义是「我包住了它」。

**一个能立刻分辨的形状：** 如果你能对同一个对象连续包多次（`new A(new B(new C(x)))`），那是装饰器；如果你是把一堆对象装进一个容器（`container.add(a).add(b).add(c)`），那是组合。

> 💬 **面试官**：组合模式和装饰器模式在类图上都是「实现接口 + 持有同接口引用」，怎么区分？
>
> ✅ 标准答案：看持有的是「一组」还是「一个」。组合的 Composite 持有 Component 数组，表达的是「整体-部分」的树形结构，方法把多个子结果汇总起来（求和、计数、全选）；装饰器的 Decorator 持有单个 Component 引用，表达的是「层层包装」的链式结构，方法在自己的逻辑前后包住被装饰者，通常原样返回或增强它的结果。
>
> 🎁 加分答案：能给出一个形状判据——「能不能对同一个对象反复包」，能就是装饰器（`new A(new B(x))`），不能而是往容器里塞就是组合（`container.add(x)`）。再补一句使用场景的差异：**组合是为了「遍历结构」，装饰器是为了「叠加能力」**——你不会用装饰器去统计一棵树，也不会用组合去给一个函数加日志。

### 辨析四：桥接 vs 适配器

这组大纲里没列，但它是**实际项目里最容易做错方向**的一组——两个模式都涉及「两个东西不匹配」，但一个是在设计时分离，一个是在事后补救。

| 维度 | 桥接 | 适配器 |
|------|------|--------|
| 出现时机 | **设计阶段**：预先识别出两个维度 | **集成阶段**：两个已有接口对不上 |
| 主动性 | 主动分两个轴 | 被动兼容旧接口 |
| 被适配方 | 自己写的，可控 | 通常第三方，改不了 |
| 是否新增能力 | 否，只是重新组织 | 否，只是翻译接口 |
| 关系形态 | 1 对多的自由组合（维度 × 维度） | 1 对 1 的包装 |
| 典型例子 | 图形 × 颜色 | axios 适配 fetch/XHR |

**判据：问「如果两个接口当初是匹配的，还需要这个模式吗？」**

- 桥接：**需要**。因为桥接的前提不是「不匹配」，而是「两个维度会各自演化」
- 适配器：**不需要**。因为适配器的前提就是「不匹配」，一开始就匹配就没事了

```typescript
// 适配器：支付宝的返回结构 → 我们期望的结构（前提是「对不上」）
class AlipayAdapter implements PayResult {
  constructor(private raw: { code: number; msg: string }) {}
  get success() { return this.raw.code === 0; }   // 👈 只是翻译字段
}

// 桥接：分组 × 输出（前提是「两个维度都要变」，无关于对不上）
class Report {
  constructor(private group: GroupStrategy, private renderer: ReportRenderer) {}
}
```

**另一个区别在「对称性」**：桥接的两个维度是**对等的**（图形和颜色，谁都不从属于谁），适配器的两边是**不对等的**（Target 是客户端期望的，Adaptee 是被迫接受的）。

🔧 **真实场景**：一次需求评审，有人提议「我们统一一下两家医院的数据格式」。这里要先分清两件事：

- 如果目的是**让旧代码能读新数据**——那是适配器，一次性把字段映射过去
- 如果目的是**让「医院」和「数据格式」各自独立演化**（将来接 5 家医院、每家都有多种格式）——那是桥接，两个维度各建一套体系

**做错方向的代价很大：** 用适配器解决「两个维度都要扩展」的需求，最后会写出 N 个适配器；用桥接解决「接口不匹配」的需求，则会为一个根本不会演化的东西建两层抽象。

> 💬 **面试官**：桥接模式和适配器模式都涉及「两个不匹配的东西」，怎么区分？
>
> ✅ 标准答案：看出现的时机和前提。适配器的前提是「两个已有接口对不上」，出现在集成阶段，目的是让不兼容的东西能协同工作，被适配方通常是改不了的第三方；桥接的前提是「两个维度会各自独立演化」，出现在设计阶段，目的是把 M×N 个类降成 M+N，两个维度都是自己可控的。所以适配器是事后补救的翻译层，桥接是事前设计的分离结构。
>
> 🎁 加分答案：能给出两个更锋利的判据——第一，「如果两个接口当初就匹配，还需不需要这个模式」：适配器不需要，桥接仍然需要；第二，「两边是对等还是不对等」：桥接的两个维度是对等的（谁都不从属谁），适配器的 Target 和 Adaptee 是不对等的（一个是标准，一个是被迫迁就的）。再补一句实战判断：**需求说「统一格式」时不能直接归为适配器——要问的是「统一之后这个维度还会不会再变」，会变就是桥接。**

### 五模式全景表

把这五组最容易混的结构型模式列在一起，用「持有谁」和「为什么持有」两个维度划清：

| 模式 | 持有什么 | 为什么持有 | 一句话 |
|------|---------|-----------|--------|
| 组合 | 一组**同接口**对象 | 汇总多个子结果（树） | 整体-部分，统一遍历 |
| 装饰器 | 一个**同接口**对象 | 增强它的行为（链） | 层层包装，叠加能力 |
| 代理 | 一个**同接口**对象 | 控制对它的访问 | 同一接口，控制放行 |
| 桥接 | 一个**异接口**对象 | 分离两个变化维度 | 两个轴，各自扩展 |
| 适配器 | 一个**异接口**对象 | 转换它的接口形态 | 两个接口，翻译过去 |

**这张表的三条分界线：**

- **同接口 + 一组** → 组合
- **同接口 + 一个** → 装饰器 或 代理（差别在「增强」还是「控制」）
- **异接口 + 一个** → 桥接 或 适配器（差别在「两个维度」还是「接口不兼容」）

掌握这三行，五个模式就再也不会混。

---

## 九、合体：当组合遇上桥接

前面八章把两个模式分开讲。这一章把它们放进**同一个需求**里，因为真实项目里它们从不单独出现。

### 需求：药品分类销售报表

产品经理的完整需求是这样的：

- 药品按**类别树**组织：抗感染类下有青霉素、头孢；心血管类下有降压药、调脂药——**这是树形，用组合模式**
- 报表要能按**地区**或按**医院等级**切换分组——**这是维度一**
- 报表要能输出成**表格**或**柱状图**——**这是维度二**
- 树上的每个节点都能出报表，出了子节点的报表要能向上汇总

**这里面有三个模式在同时工作**，我们分开看。

先说树——**组合模式**承担「药品分类」这一层：

```typescript
// 统一接口：叶子（具体药品）和容器（分类）都实现
interface DrugNode {
  getId(): string;
  getName(): string;
  // 汇总这个节点下所有药品的订单
  collectOrders(allOrders: DrugOrder[]): DrugOrder[];
}

// 叶子：具体药品
class Drug implements DrugNode {
  constructor(private id: string, private name: string) {}
  getId() { return this.id; }
  getName() { return this.name; }
  collectOrders(allOrders: DrugOrder[]) {
    return allOrders.filter(o => o.drugId === this.id);   // 👈 只筛自己
  }
}

// 容器：药品分类
class DrugCategory implements DrugNode {
  private children: DrugNode[] = [];
  constructor(private id: string, private name: string) {}
  getId() { return this.id; }
  getName() { return this.name; }
  add(node: DrugNode) { this.children.push(node); }

  // 👈 组合的核心：递归收集，对子节点类型一无所知
  collectOrders(allOrders: DrugOrder[]) {
    return this.children.flatMap(c => c.collectOrders(allOrders));
  }
}
```

注意 `collectOrders` 和第四章的 `getCount` 是同一个套路：容器 `flatMap` 子节点的结果，叶子只返回自己的。**这就是组合模式在「取数」这个动作上的形态。**

然后说报表——**桥接模式**承担「分组 × 输出」这两层：

```typescript
// 维度一：分组
interface GroupStrategy {
  groupName(): string;
  group(orders: DrugOrder[]): ReportRow[];
}
class ByRegionGroup implements GroupStrategy {
  groupName() { return '按地区'; }
  group(orders: DrugOrder[]) { /* 按 o.region 汇总 */ }
}
class ByHospitalLevelGroup implements GroupStrategy {
  groupName() { return '按医院等级'; }
  group(orders: DrugOrder[]) { /* 按 o.hospitalLevel 汇总 */ }
}

// 维度二：输出
interface ReportRenderer {
  render(title: string, rows: ReportRow[]): void;
}
class TableRenderer implements ReportRenderer { /* console.table */ }
class BarChartRenderer implements ReportRenderer { /* canvas 画柱状 */ }
```

**桥在这些维度之间：**

```typescript
class DrugReport {
  constructor(
    private node: DrugNode,            // 👈 组合：任意节点都能出报表
    private group: GroupStrategy,      // 👈 桥接维度一
    private renderer: ReportRenderer   // 👈 桥接维度二
  ) {}

  generate(allOrders: DrugOrder[]) {
    // 第一步：组合模式取数——node 是叶子还是容器，这里不知道也不需要知道
    const orders = this.node.collectOrders(allOrders);
    // 第二步：桥接维度一做事
    const rows = this.group.group(orders);
    // 第三步：桥接维度二做事
    this.renderer.render(`${this.node.getName()} · ${this.group.groupName()}`, rows);
  }
}
```

用起来是这样：

```typescript
const allOrders = await fetchAllOrders();

// 整棵抗感染类，按地区出表格
const antibiotic = new DrugCategory('c1', '抗感染类');
antibiotic.add(new Drug('d1', '阿莫西林'));
antibiotic.add(new Drug('d2', '头孢克肟'));
new DrugReport(antibiotic, new ByRegionGroup(), new TableRenderer()).generate(allOrders);

// 同一个节点，按医院等级出柱状图——只有参数变了
new DrugReport(antibiotic, new ByHospitalLevelGroup(), new BarChartRenderer()).generate(allOrders);

// 单个药品也能出报表，代码完全相同
new DrugReport(new Drug('d1', '阿莫西林'), new ByRegionGroup(), new TableRenderer()).generate(allOrders);
```

**最后一行是整篇文章最值得看的一行。** `new Drug('d1', ...)` 和 `new DrugCategory('c1', ...)` 传进 `DrugReport` 之后，`generate()` 的执行路径完全一样——`this.node.collectOrders(...)` 这一行不知道也不需要知道自己拿到的是叶子还是容器。

**这就是组合模式。** 它不是「树用递归」，而是**「调用方对叶子与容器无差别」**。

而 `group` 和 `renderer` 这两个参数，**各自独立扩展**：加一种分组（按医生）不碰 `ReportRenderer`，加一种输出（PDF）不碰 `GroupStrategy`。**这就是桥接模式。**

### 三个模式在同一个需求里的分工

用一个表把职责划清：

| 关注点 | 谁负责 | 用哪个模式 | 为什么 |
|--------|--------|-----------|--------|
| 药品怎么组织成树 | `DrugNode` 家族 | 组合 | 类别可以无限嵌套，叶子与容器要统一对待 |
| 报表按什么维度汇总 | `GroupStrategy` | 策略（桥接的一侧） | 同一件事的多种算法 |
| 报表怎么展示 | `ReportRenderer` | 策略（桥接的一侧） | 同一件事的多种形式 |
| 分组与展示如何组合 | `DrugReport` 的构造参数 | 桥接 | 两个维度各自扩展，M×N → M+N |
| 任意节点能否出报表 | `DrugReport.node` 的类型 | 组合 | 叶子与容器都满足 `DrugNode` |

**注意第四行和第五行是两种不同的「持有」**：

- `DrugReport.node` 持有的是 `DrugNode`——**它自己不属于这个家族**，但需要「任意一种节点」。这不构成组合或桥接，只是「面向接口编程」
- `DrugReport.group` 持有的是 `GroupStrategy`——**这是桥接的那根桥**

**这就是为什么「持有接口引用」本身不能作为判断模式的标准。** 判断必须结合「这个接口代表什么关系」来看。

> 📚 **知识点**：真实项目里最典型的架构是**「三种模式各管一段」**：组合管结构（数据怎么组织成树），桥接管维度（哪些轴要独立扩展），策略管算法（一个轴内部怎么做）。**它们不是竞争者，是分层协作者。** 一个成熟的后台系统里，这三种模式几乎必然会同时出现——报表模块、权限模块、表单引擎都是如此。**所以面试时如果被问「你项目里用了哪些设计模式」，答「用了策略模式」远不如答「我们在报表模块里用组合表达分组树、用桥接分离分组维度和输出维度、每个维度内部用策略注册表」——后者展示的是你理解它们如何协作。**

### 如果只让你记一句话

> **组合回答「这东西有几个」，桥接回答「这东西有几个维度」。**

树的问题永远可以问「下层还有吗」，维度的问题永远可以问「另一个轴是什么」。**问题问对了，模式就选对了。**

---

## 十、前端工程落地：DOM 树、组件树与表单设计器

前面九章讲的是模式本身。这一章回到前端——**你每天都在用的东西里，藏着这两个模式。**

### DOM：组合模式的标准答案

第四章实现五已经讲过一次，这里补一个具体的工程结论。

DOM 的透明式组合带来一个非常实用的推论：

```javascript
// 全部合法，因为所有节点都继承 Node
document.querySelector('.drug-card');        // 从根查
el.closest('.drug-card');                    // 从任意节点向上查
el.querySelector('.price');                  // 从任意节点向下查
```

**「向上查」和「向下查」都成立，是因为组合模式同时提供了 `children` 和 `parentNode` 两个方向的边。** 这一点很多教材没提——单向的孩子列表只是一个普通树，双向可达才是可操作的树。

而 `closest()` 这个 API 的存在理由特别有意思：

```javascript
// 点击事件委托里最常用的一行
list.addEventListener('click', (e) => {
  const card = e.target.closest('.drug-card');   // 👈 从被点的元素向上找最近的卡片
  if (!card) return;
  openDetail(card.dataset.id);
});
```

为什么不能直接 `e.target`？因为**你点到的往往是最深的那个节点**——可能是一个 `<span>`，可能是文本的父元素 `<p>`。`closest` 就是「沿着 parent 链向上爬，直到找到一个匹配的」——**它是一条「叶子→根」的递归，和你写的 `getCount` 是同一个东西，方向相反。**

🔧 **真实场景**：药品列表的「加入对比」按钮，如果你在按钮上直接绑事件，翻页后新渲染的按钮没有监听器。改用事件委托（在列表容器上绑一次）+ `closest` 定位，是前端最经典的两个模式合体的写法：**委托是职责链（第 12 篇），closest 是组合模式的向上遍历。**

### React 组件树：组合也是一种心智模型

React 的组件树是组合模式的运行时体现，但有三个地方和教科书不同，值得说清。

**第一，children 不是数组，是 props。**

```jsx
// React 把"子节点"变成了一种特殊的 prop
function Card({ children }) {
  return <div className="card">{children}</div>;
}

// 使用：调用方决定里面放什么，Card 不知道也不会检查
<Card>
  <h3>阿莫西林</h3>
  <p>抗生素</p>
</Card>
```

`Card` 不关心 `children` 是一个还是三个、是元素还是字符串——**它只负责把 `children` 渲染到自己内部。这就是组合模式的「容器对内容一无所知」。**

**第二，React 用不可变性消除了 `add`/`remove`。**

第三章讲过：`createElement` 一次性接收 children，之后不可变。这带来的直接后果是——**React 里不存在「透明式 vs 安全式」的纠结**，因为根本没有 `add` 方法在叶子上撒谎的问题。

**第三，`props.children` 的形状不确定是组合模式的必然代价。**

```jsx
<Card>                       {/* children 是 undefined */}
<Card></Card>                {/* children 是 undefined */}
<Card>一个</Card>            {/* children 是 "一个"（字符串） */}
<Card><a/><b/></Card>        {/* children 是 [<a/>, <b/>]（数组） */}
```

这就是为什么会有 `React.Children.map` / `React.Children.toArray` 这些 API——**它们存在的唯一理由，就是把「组合模式混装叶子与容器」造成的形状不定统一掉。**

> 📚 **知识点**：`React.Children.toArray` 不只是「转成数组」，它还会**给每个 child 加 key 并去掉 null/undefined**。这个细节说明了一个模式使用上的深层道理：**组合模式让「统一接口」成为可能，但同时把「形状归一化」的责任推给了调用方。** React 选择用工具函数接住这个责任，而不是在 `createElement` 里无限递归归一化——这是一种权衡：**把复杂度放在显式 API 上，比藏在隐式的数据结构里更好。**

### 表单设计器：组合模式的完整工业形态

第四章实现三那个手写表单只是雏形。真实的表单设计器（低代码平台的核心）是组合模式的完整工业形态。

它的数据结构是这样的：

```typescript
// 统一接口：容器和字段都实现
interface FormNode {
  id: string;
  type: string;
  render(ctx: RenderContext): HTMLElement | null;
  validate(): string[];              // 返回错误列表，容器汇总子节点错误
  getValue(): Record<string, unknown>; // 容器汇总子节点的值
}

// 容器：分组、栅格、标签页
class FormContainer implements FormNode {
  constructor(public id: string, public type: string, private children: FormNode[] = []) {}
  render(ctx: RenderContext) {
    const el = document.createElement('div');
    this.children.forEach(c => {
      const child = c.render(ctx);
      if (child) el.appendChild(child);      // 👈 递归，子节点自己负责渲染
    });
    return el;
  }
  validate() {
    return this.children.flatMap(c => c.validate());   // 👈 汇总子错误
  }
  getValue() {
    return this.children.reduce((acc, c) => ({ ...acc, ...c.getValue() }), {});  // 👈 汇总子值
  }
}

// 叶子：输入框、选择器、日期
class FormField implements FormNode {
  constructor(public id: string, public type: string, private options: FieldOptions) {}
  render(ctx: RenderContext) {
    const el = document.createElement(this.options.tag);
    el.setAttribute('name', this.options.name);
    return el;
  }
  validate() {
    // 只校验自己，几乎总是返回空数组或一条错误
    return this.options.required && !this.value ? [`${this.options.label}不能为空`] : [];
  }
  getValue() {
    return { [this.options.name]: this.value };
  }
}
```

**这个结构之所以是工业级的，是因为它把三个高频操作全部统一了：**

- **渲染**：`render` 递归，容器把自己拼成一棵 DOM
- **校验**：`validate` 递归，容器 `flatMap` 子节点的错误——**一条 `flatMap` 就实现了「提交时校验全部字段」**
- **取值**：`getValue` 递归，容器用 `reduce` 合并子节点的值——**一条 `reduce` 就实现了「一次性收集整个表单的数据」**

而这三件事，在门面（第 06 篇）、在模板方法（第 14 篇）里都会以别的形态出现——**但只有组合模式，能让「任意深度的嵌套结构」自动获得这三个能力。**

> 💬 **面试官**：低代码平台的表单引擎，为什么一定要用组合模式？
>
> ✅ 标准答案：因为表单的结构天然是树——可以分组、可以嵌栅格、可以套标签页，层数不固定。而表单需要做的三件事（渲染、校验、取值）都必须在整棵树上执行。用组合模式，这三件事各写成一份递归实现，就能自动适用于任意深度；新增一种容器类型（比如「折叠面板」）只需要实现三个方法，所有逻辑自动生效。如果不用组合模式，每个容器类型都要单独写一遍「遍历所有后代」的代码，容器类型一多就是指数级重复。
>
> 🎁 加分答案：能补一句「组合模式在表单引擎里的真正难点不是递归，是容器的特殊语义」——比如栅格容器需要控制子节点的宽度分布、标签页容器只渲染当前激活的那个，这些语义是叶子没有的。**这就回到了第三章的透明式 vs 安全式抉择：表单引擎通常选安全式（容器特有方法只放在容器上），因为装配代码（拖拽生成表单）本来就知道自己在操作哪种容器。**

### Vue 的 render 递归与桥接的影子

Vue 的模板编译是最纯粹的「编译成递归 render 函数」：

```javascript
// 编译后的 render 大致形状（简化）
function render(vnode, container) {
  if (typeof vnode === 'string') {
    container.appendChild(document.createTextNode(vnode));  // 叶子
    return;
  }
  const el = document.createElement(vnode.tag);
  vnode.children?.forEach(child => render(child, el));      // 容器：递归
  container.appendChild(el);
}
```

**这和第四章手写的那 60 行是同一个东西。** Vue 和 React 在「虚拟 DOM 是组合结构」这件事上没有分歧，分歧在「怎么把变化找出来」（diff 算法），那是另一系列的话题。

桥接的影子在 Vue 里也很明显——**`runtime-core` 和 `runtime-dom` 的拆分就是一次桥接：**

```typescript
// runtime-core 定义平台无关的抽象
interface RendererOptions {
  createElement(type: string): HostElement;   // 👈 Implementor：怎么创建元素
  insert(el: HostElement, parent: HostElement): void;
  patchProp(el: HostElement, key: string, value: unknown): void;
}
// runtime-core 持有它，自己只关心 diff 和组件生命周期
function createRenderer(options: RendererOptions) { /* ... */ }

// runtime-dom 提供浏览器实现
const { render } = createRenderer({
  createElement: tag => document.createElement(tag),
  insert: (el, parent) => parent.appendChild(el),
  patchProp: (el, key, value) => { /* setAttribute / style / on* */ },
});
```

**这就是桥接模式在框架源码里的样子：**

- **Abstraction**：`runtime-core`（与平台无关的渲染逻辑、diff 算法、组件系统）
- **Implementor**：`RendererOptions` 接口（创建元素、插入、设属性这些「平台操作」）
- **ConcreteImplementor**：`runtime-dom`（浏览器）、`runtime-test`（测试）、`runtime-native`（小程序/原生）

**为什么要这样拆？** 因为「渲染逻辑」和「平台 API」是两个独立变化的维度：

- 加一个新平台（小程序）→ 只写一套 `RendererOptions` 实现，`runtime-core` 一行不改
- 修一个 diff bug → 只改 `runtime-core`，所有平台同时受益

**这是 M×N → M+N 在框架级别的应用：** 假设有 3 套渲染能力要做（diff、组件、生命周期）× 3 个平台（浏览器、小程序、原生），全继承方案要 9 份代码；桥接之后是 3 + 3。

> 📚 **知识点**：Vue3 的 `createRenderer(options)` 这个 API 设计，是桥接模式在框架层最漂亮的落地。而且它同时是**依赖注入**（`options` 是注入的）和**桥接**（两个维度分离）——**这两个概念经常一起出现，因为「注入一个接口实现」正是「分离两个维度」的手段。** 你在项目里做「请求层抽象」「埋点 SDK 抽象」「多端适配」，用的都是同一个结构。

### 四个工程信号：什么时候该想到这两个模式

最后给一份「信号清单」——不是定义，是**你在代码里会实际看到的现象**：

| 你看到了什么 | 该想到 | 因为 |
|-------------|--------|------|
| 遍历代码里出现 `if (node.type === 'x')` | 组合 | 统一接口没做到位 |
| 数据结构是「可能嵌套任意层」的 | 组合 | 天然是树 |
| 有一批函数都在递归一棵树 | 组合 | 递归该收进节点自己 |
| 类名开始出现两个词拼起来（`RedCircle`） | 桥接 | M×N 的典型征兆 |
| 同一个功能有两个「都可能有多种」的属性 | 桥接 | 两个正交维度 |
| 加一个维度取值要写 N 个新类 | 桥接 | 乘法关系 |
| 一个类同时被两组子类继承 | 桥接 | 需要拆成持有引用 |

**第一行和第三行是最实用的。** 「遍历代码里有类型判断」这个信号一旦出现，就说明组合模式该上场了；「类名是两个词拼起来」这个信号一旦批量出现，就说明桥接模式该上场了。

---

## 十一、面试高频问：五组核心题与追问链

前几章已经埋了十几个面试问答。这一章把最核心的五组集中列出，并补上**追问链**——因为面试官从不只问一个问题。

### 第一组：组合模式的核心思想

> 💬 **面试官**：组合模式的核心思想是什么？举一个前端中的天然例子。
>
> ✅ 标准答案：把对象组织成树形结构表示「部分-整体」的层次，让叶子节点和容器节点实现同一个接口，从而让调用方用统一的方式处理两者、不需要判断节点类型。前端最天然的例子是 DOM——`document.body` 和最深的 `<span>` 都是 `Element`，都能 `querySelector`、都能 `appendChild`、都能读 `children`。
>
> 🎁 加分答案：补一句「组合模式的价值不在递归，在消除判断」——递归谁都会写，难的是让递归里不出现类型判断。

**追问链：**

- **追问一：**「那用递归遍历一棵普通树，算组合模式吗？」
  → 不算。普通树如果叶子和容器是两种类型、遍历时要判断，那就只是「树 + 递归」。**组合模式的判据是「统一接口」，不是「递归」。**

- **追问二：**「统一接口的代价是什么？」
  → 叶子要实现自己不需要的方法。透明式下这些方法要么抛错要么空实现，违反 LSP；安全式下客户端又必须知道具体类型，统一性被破坏。第三种路是 React 的做法——不提供 add，children 创建时定死。

- **追问三：**「那 React 的组件树算组合模式吗？」
  → 算，而且是改良版。它保留了「统一接口」（所有组件都返回 JSX）和「递归渲染」，但用不可变数据消除了 `add`/`remove` 的 LSP 问题。

### 第二组：桥接模式解决了什么问题

> 💬 **面试官**：桥接模式解决了什么问题？它和策略模式有什么区别？
>
> ✅ 标准答案：桥接解决「两个正交维度都在变化时，继承方案产生 M×N 个类」的类爆炸问题，做法是把一个维度从事先组合（继承）改成运行时持有（引用），类数量降为 M+N。它和策略的结构完全一样，区别在维度数量：策略只有一个变化维度（被持有的算法侧），持有方本身不变；桥接有两侧都在变。
>
> 🎁 加分答案：给出判据「看持有方有没有子类」——`Sorter` 唯一，那是策略；`Shape` 有 `Circle`/`Square` 子类，那是桥接。

**追问链：**

- **追问一：**「为什么继承会导致类爆炸？举一个具体的数字。」
  → 3 种图形 × 3 种颜色 = 9 个类。加一种颜色要写 3 个新类，加一种图形又要写 3 个。这是乘法，不是加法。

- **追问二：**「那把颜色做成构造参数不就行了，为什么要抽成接口？」
  → 参数化只解决了「颜色是一个值」的情况。一旦颜色变成一套逻辑（渐变、描边、混合模式），逻辑就得写进 `Shape` 里按颜色分支，两个维度又搅在一起了。抽成接口是为了让「颜色」这个维度也能有自己的继承体系。

- **追问三：**「那桥接是不是就是「用组合代替继承」？」
  → 不是所有「用组合代替继承」都是桥接。桥接的特定含义是「两个维度的分离」。只有一个维度时用组合替换继承，那是策略。**判据永远是「数得出几个维度」。**

### 第三组：组合 vs 桥接的判据

> 💬 **面试官**：组合模式和桥接模式都是「持有接口引用」，怎么一眼分清？
>
> ✅ 标准答案：看持有的是不是「自己实现的接口」。`Composite` 持有 `Component[]`，而 `Composite` 自己也实现 `Component`——这是自引用，组合。`Abstraction` 持有 `Implementor`，而 `Abstraction` 不实现 `Implementor`——这是跨维度引用，桥接。
>
> 🎁 加分答案：再补两条——数量上，组合持有「一组」，桥接持有「一个」；变化方向上，组合沿「纵向」（层级、节点类型），桥接沿「横向」（轴上的取值）。

**追问链：**

- **追问一：**「如果我一个类既持有自己类型的数组，又持有另一个接口的引用，那它是什么？」
  → 两者都是。组合和桥接不互斥——第九章那个 `DrugReport` 就是同时持有 `DrugNode`（组合的根）和两个策略接口（桥接的两侧）。**模式是描述关系，不是给类发身份证。**

- **追问二：**「那装饰器也持有同接口引用，和组合怎么分？」
  → 看持有一组还是一个。组合是 `Component[]`，装饰器是单个 `Component`。再看递归结果：组合是「分叉再汇总」，装饰器是「穿过再返回」。

### 第四组：透明式 vs 安全式

> 💬 **面试官**：组合模式里 `add`/`remove` 该放 Component 上还是 Composite 上？
>
> ✅ 标准答案：这是透明式与安全式的抉择。放 Component 上是透明式，客户端完全不用判断类型，代价是叶子上调用会抛错、违反 LSP；放 Composite 上是安全式，类型安全但客户端必须知道具体类型。判据是「装配动作由谁驱动」——外部驱动（配置搭树、拖拽建树）用安全式，内部驱动用透明式。
>
> 🎁 加分答案：第三条路是「不提供 add」——React 把 children 作为构造参数一次性传入，从根源上消除了这个抉择。

**追问链：**

- **追问一：**「DOM 是哪一种？」
  → 透明式。`document.createTextNode('x').appendChild(...)` 是合法的 API 调用，运行时抛 `HierarchyRequestError`。浏览器用「运行时抛错」换「接口绝对统一」。

- **追问二：**「透明式违反 LSP，为什么浏览器还要这么设计？」
  → 因为 DOM 的调用方极其多样（无数第三方库），接口不统一会让每个库都要写类型判断。**用运行时的少数错误，换取接口层面的绝对一致——这是一个明确的工程权衡，不是设计缺陷。**

### 第五组：一个真实的项目落地题

> 💬 **面试官**：说说你在项目里用这两个模式的真实例子。
>
> ✅ 标准答案：讲一个「有痛点 → 有方案 → 有收益」的链条，不要罗列模式名。比如：后台的报表模块原来每种「分组 × 输出」组合都是一个独立类，3 个分组 × 3 种输出 = 9 个类，80% 代码重复。改成桥接结构后，分组实现 `GroupStrategy`、输出实现 `ReportRenderer`，`Report` 持有两个引用，9 个类降成 6 个，加一种输出只写 1 个类。同时报表要能对「药品分类树」的任意节点出，所以节点用组合模式统一了叶子和容器的取数接口。
>
> 🎁 加分答案：带上「为什么不是另一个模式」——「分组和输出两个维度都不含接口不兼容问题，所以不是适配器；分组这一侧有 3 个以上算法且会持续增加，输出这一侧也会增加，所以不是单纯的策略，而是桥接。节点取数之所以用组合而不是简单递归，是因为叶子（药品）和容器（分类）需要被同一份出报表代码处理。」

**追问链：**

- **追问一：**「9 个类降成 6 个，只省了 3 个类，值得吗？」
  → 值得，因为省的不是「当下这 3 个」，是「将来的乘法」。从 3×3 到 4×4 时，继承方案要从 9 涨到 16，桥接方案从 6 涨到 8。**桥接的收益随维度取值数量增长而放大。**

- **追问二：**「那以后分组变成 10 种、输出变成 5 种呢？」
  → 继承方案 50 个类，桥接 15 个。差距从 3 个变成 35 个。**这就是为什么模式选择要看「演化预期」而不是「当下数量」。**

---

## 💡 一张图总结（面试速记表）

| 要点 | 一句话内核 | 考察频率 |
|------|-----------|---------|
| 组合模式的核心 | 叶子与容器实现同一接口，调用方不需要判断类型 | ⭐⭐⭐ 必考 |
| 组合的结构特征 | `Composite` 持有 `Component[]`——自引用 | ⭐⭐⭐ 必考 |
| 透明式 vs 安全式 | `add` 放 Component 上是透明（不安全），放 Composite 上是安全（不统一） | ⭐⭐⭐ 必考 |
| 桥接模式的核心 | 两个正交维度，M×N 个类降为 M+N | ⭐⭐⭐ 必考 |
| 桥接的结构特征 | `Abstraction` 持有 `Implementor`——跨维度引用 | ⭐⭐⭐ 必考 |
| 组合 vs 桥接 | 持有的是不是自己的接口：是 → 组合，不是 → 桥接 | ⭐⭐⭐ 必考 |
| 桥接 vs 策略 | 持有方有没有子类：有 → 桥接，没有 → 策略 | ⭐⭐⭐ 必考 |
| 组合 vs 装饰器 | 持有一组还是一个：一组 → 组合，一个 → 装饰器 | ⭐⭐ 高频 |
| 桥接 vs 适配器 | 设计时分离两个维度 vs 集成时补救接口不兼容 | ⭐⭐ 高频 |
| `instanceof` 信号 | 组合模式里出现 `instanceof`，说明接口没统一 | ⭐⭐ 高频 |
| 类名是两个词拼的 | `RedCircle`、`RegionExcelReport`——M×N 的典型征兆 | ⭐⭐ 高频 |

> 💡 记住这条主线：**组合回答「这东西有几个」，桥接回答「这东西有几个维度」。** 树的问题永远可以问「下层还有吗」，维度的问题永远可以问「另一个轴是什么」——问对了问题，模式就选对了。

---

## 📝 留个问题

打开你的项目，找一棵你每天都在遍历的树——可能是权限菜单、可能是组织架构、可能是分类树。

然后回答三个问题：

- 遍历它的代码里，有几处 `if (node.type === 'xxx')`？每一处都说明组合模式的接口漏进了具体类型
- 如果给这棵树加一种节点类型，要改几个文件？
- 这棵树有没有一个「另一个轴」被硬编码在里面（比如每个节点都带一个 `status` 字段、而 status 会影响渲染）——如果有，那是桥接模式的位置

把答案写在评论区。我猜**大部分人会发现自己项目里的「组合」只是「递归」，而「桥接」根本没被识别出来过**👇

---

## 参考资料

https://refactoring.guru/design-patterns/composite （组合模式的图解、多语言示例与真实案例）

https://refactoring.guru/design-patterns/bridge （桥接模式的图解、类爆炸问题图与真实案例）

https://developer.mozilla.org/zh-CN/docs/Web/API/Node （DOM Node 接口，组合模式在浏览器里的落地）

https://developer.mozilla.org/zh-CN/docs/Web/API/Element/closest （`closest` 的向上遍历语义）

https://react.dev/learn/passing-props-to-a-component （React children 与组件组合）

https://cn.vuejs.org/guide/extras/rendering-mechanism.html （Vue 渲染机制，虚拟 DOM 的递归结构）

《设计模式：可复用面向对象软件的基础》 Erich Gamma 等四人组著，1994（Composite 与 Bridge 的意图原文与角色定义）

《JavaScript 设计模式与开发实践》 曾探 著（组合模式在 JS 场景下的经典讲解）

杨会清 — JavaScript 设计模式系列笔记（本篇笔记原文来源）

> 推荐搜索关键词：「组合模式 透明方式 安全方式 区别」「桥接模式 类爆炸 M×N」「组合模式 桥接模式 区别」「桥接模式 策略模式 区别」「组合模式 装饰器模式 区别」「React children 形状 undefined 数组」「Vue3 createRenderer runtime-core runtime-dom 拆分」。

---

> 🔖 这是「前端设计模式」系列第 09 篇。上一篇：《代理模式：从 ES6 Proxy 到缓存、懒加载与权限拦截（面试收藏级）》；下一篇预告：《享元模式：对象池与虚拟列表的节点复用术（面试收藏级）》
