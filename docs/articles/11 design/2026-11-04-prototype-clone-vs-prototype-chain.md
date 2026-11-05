# 原型模式：克隆创建对象，与 JS 原型链的本质区别（面试收藏级）

> **副标题**：把这两件事搞清楚，一道高频辨析题就彻底解决了

> 面试官翻着简历问：「JavaScript 的原型链和设计模式里的原型模式，是一回事吗？」
>
> 你想了想：「……算是同一套东西吧，都是基于原型创建对象。」
>
> 他没说话，换了个问法：「那 `new Foo()` 的时候，引擎到底做了哪几步？」
>
> 你答了「创建一个对象、执行构造函数、返回对象」，漏了中间那步。他追问：「那 `Foo.prototype` 是什么时候挂上去的？为什么 `p1.setName === p2.setName` 是 `true`，而 `p1.getName === p2.getName` 是 `false`？」
>
> 你开始模糊了。
>
> 问题不在你没学过原型链，而在于——**你把两个恰好都叫「原型」的东西，当成了一件事**。一个是 JS 的继承机制（方法怎么共享），一个是 GoF 的创建型模式（对象怎么克隆）。名字撞了，概念没撞。
>
> 这篇文章要做的，就是把这两个「原型」放在同一张坐标纸上，让你以后听到这三个字，第一反应是「你说的是哪一个」。

---

## 🎯 这篇文章解决什么问题

前端圈有一道存在了二十年、至今仍在被考的辨析题：

> **JavaScript 的原型链，是不是原型模式？**

绝大多数人的答法是「是，因为都是基于已有对象创建新对象」。这句听起来很有道理的话，恰恰是把两个概念揉成一团的开始——因为这两个「原型」优化的根本不是同一件事：

|                        | 优化什么                 | 关键词                        |
| ---------------------- | ------------------------ | ----------------------------- |
| GoF **原型模式** | 对象**创建的成本** | 克隆、复制、`clone()`       |
| JS **原型链**    | 方法**复用的成本** | 共享、继承、`[[Prototype]]` |

一句话主线，先记住：

> **原型模式省的是「造一个对象的力气」，原型链省的是「存一份方法的力气」。**

这篇文章会按这条线走：

- 先用医疗后台的真实场景，把 GoF 原型模式从头到尾落地一遍（三角色、注册表、浅克隆、深克隆、手写深拷贝）
- 再把 JS 原型链从零讲到完整链路（`prototype`、`__proto__`、`instanceof`、`new` 的四个步骤），配齐笔记里的六张图
- 最后用一份笔记里的 Canvas 圆点动画，做一次「案发现场复盘」——那个被很多人当作原型模式的例子，其实是原型链

读完你会拿到四样东西：

- **一张克隆路线对比表**：`Object.assign` / 展开运算符 / `JSON` 法 / `structuredClone` / 手写递归 / lodash，六条路的边界一次看清
- **一段能直接写进简历的手写深拷贝**：三层递进，含循环引用处理
- **一张完整的 JS 原型链全图**：从实例一路找到 `null`，`new` 和 `instanceof` 各自干了什么
- **一张辨析速查表**：原型链 vs 原型模式 vs 工厂 vs 享元，四条容易混的线一次划清

---

## 一、场景切入：什么时候「复制」比「新建」划算

先不谈定义。看两个医疗后台里几乎一定撞见过的场景，它们都会让你产生「复制一份改改」的冲动——而这个冲动，就是原型模式的入口。

### 痛点一：开一张处方，为什么要重走一遍所有初始化

医生在门诊系统里开处方，绝大多数情况不是从零开始，而是「照上一张改」。比如「上呼吸道感染」这套方案已经开了八百遍，只换一个剂量、加一条备注。

如果每次都 `new Prescription(...)`，构造函数背后要跑完这一串：

- 拉一遍药品字典（校验 `drugId` 是否存在、是否停用）
- 加载药品说明书里的禁忌与相互作用提示
- 按医保规则算一遍自付比例
- 填一批默认值（用法用量模板、给药途径、疗程天数）
- 初始化审核状态、签名位、留痕字段

这些工作里有两次 IO、一次规则计算、一次配置解析。而「照上一张改」这个动作，**上面这些结果一个字都不会变**——变的只是剂量和备注这两个字段。

用 `new`，你付了 100% 的初始化成本，只为了拿 2% 的差异。

### 痛点二：几十种药品规格，差异只在两三个字段

第二个场景更典型。同一个药，包装规格有 6 种：12 片/盒、24 片/盒、36 片/盒、每盒×2 板、每盒×3 板、瓶装 100 片。

这 6 个 `DrugSpec` 对象之间，**通用名、商品名、厂家、批准文号、储存条件、处方类型、医保类别完全一样**，只有「包装数量」「最小销售单位」「条码」这三个字段不同。

如果写下 6 个完整对象字面量，等于把同一份信息抄了 6 遍。以后厂家换了、批准文号变了，你要改 6 处——改漏一处就是线上数据不一致。

### 什么时候该动「复制」这个念头

从上面两个场景里，能抽出原型模式的三个触发条件。**三个同时成立，才值得考虑原型；缺一个，普通 `new` 或工厂更清晰**：

| 条件                     | 说的是什么                                    | 反例                                                |
| ------------------------ | --------------------------------------------- | --------------------------------------------------- |
| **初始化成本高**   | 构造过程中有 IO、复杂计算、配置解析、远程校验 | 一个只有 3 个字段的纯数据对象，`new` 跟复制一样快 |
| **对象之间差异小** | 差异集中在少数字段，大部分状态完全一致        | 每个对象都长得不一样，复制反而不如新建直观          |
| **差异字段明确**   | 你知道复制之后要改哪几个字段                  | 差异是动态算出来的，不如直接构造省心                |

🔧 **真实场景**：药品规格的批量维护页，运营一次要新增 20 个 SKU。最初的写法是前端遍历 20 次调 `POST /spec`，每次都传完整对象，请求体里 90% 的字段是重复的。改造成「先取一个基准规格 → 本地 `clone()` 20 份 → 只覆盖差异字段 → 一次批量提交」之后，前端代码从「拼 20 次完整对象」变成「拼 20 组差异」，请求体体积降了七成，而且运营改基准规格时，其余 19 个自动跟着变——**这就是原型模式在业务层的真实收益：不是快了几毫秒，而是把「重复信息」从代码里消掉了。**

> 💬 **面试官**：什么情况下你会考虑用原型模式，而不是直接 `new`？
>
> ✅ 标准答案：当对象的构造过程代价高、而实例之间的差异又很小时。原型模式的核心是「复制一个已有对象再微调」，所以它成立的前提有两个：第一，`new` 的初始化成本确实高（有 IO、有复杂计算、有远程校验）；第二，新对象与原型之间的差异只集中在少数字段。两个前提同时满足，克隆比重新初始化更划算。
>
> 🎁 加分答案：能补一句——「如果初始化成本其实很低，原型模式是负收益，因为它多了一次深拷贝的开销，还引入了浅拷贝/深拷贝的选择负担」。再加一句判断：真正决定选原型的往往不是性能，而是**语义**——「这张处方是从那张模板来的」这种业务关系本身，就该用 `clone()` 表达，而不是用构造参数表达。用模式表达业务意图，比用模式省几毫秒有价值得多。

---

## 二、意图与本质：原型模式在优化什么

### 一句话意图

**通过复制一个已有的实例来创建新对象，而不是通过调用构造函数实例化一个类。**

注意这句话里有两个容易滑过去的关键词：

- **复制一个已有的实例**——原型模式的原型是**对象**，不是类。这是它和工厂模式最深的分歧点
- **而不是实例化一个类**——它要绕开的是 `new` 背后的整套初始化逻辑，不是绕开「创建对象」这件事本身

### 核心矛盾：创建成本高 × 需求差异小

所有设计模式都在解一对矛盾，原型模式这对矛盾长这样：

```text
        创建成本很高                    需求差异很小
   ┌────────────────────┐        ┌────────────────────┐
   │  IO、规则计算、      │        │  只改 2~3 个字段     │
   │  配置解析、远程校验   │        │  其余状态完全一样     │
   └─────────┬──────────┘        └──────────┬─────────┘
             │                              │
             └───────────┬──────────────────┘
                         ▼
              「付了全额成本，只拿零头差异」
                         │
                         ▼
              与其重走一遍初始化 → 不如复制后微调
```

如果只有「成本高」没有「差异小」，复制没意义——两个完全不同的对象，复制的部分你都要改掉；如果只有「差异小」没有「成本高」，`new` 也不慢——复制反而多了深拷贝开销。**两个条件是一对，缺一不可。**

### 一个必须先讲透的前提：克隆凭什么比 new 便宜

这是原型模式最容易被讲成玄学的地方。「初始化成本高」到底指什么？在 JS 里，`new` 本身极快，快到你根本感受不到。所以「成本高」一定不在 `new` 这个动作上，而在**构造函数体里做的事**：

| 成本来源                 | 典型表现                                 | 为什么克隆能省掉它       |
| ------------------------ | ---------------------------------------- | ------------------------ |
| **网络 IO**        | 构造函数里请求字典、校验编码合法性       | 原型已经有结果了，直接用 |
| **复杂计算**       | 算医保自付比例、算疗程、算拆零系数       | 结果已经算好并存成字段了 |
| **配置解析**       | 解析用法用量模板字符串、解析给药途径枚举 | 已解析的中间态就在原型里 |
| **本地存储读取**   | 从 `localStorage` 恢复用户上次的选择   | 值已在内存里             |
| **大量默认值填充** | 20 个字段各有一个默认值来源              | 原型里都填好了           |

反过来说，如果你的构造只是 `this.a = a; this.b = b`——**没有原型模式什么事**。这时候克隆甚至更慢（多一次 `new` + 一次拷贝），还多了一个「深拷贝还是浅拷贝」的决策负担。

这一条判断标准，比「原型模式的意图是什么」这句定义有用得多。面试官问「你项目里为什么用/不用原型模式」，答定义没用，答这条能立刻显出你是在真实场景里想过这件事的。

### GoF 原型模式的两种落地形态

GoF 原著里，原型模式的落地方式有两种，这个区分是后面第五节辨析的伏笔：

- **显式克隆接口**：定义一个 `clone()` 方法，每个具体原型自己实现怎么复制自己。原型模式的标准形态，也是 TS / Java 里的主流写法
- **语言原生原型机制**：语言本身提供「以某个对象为原型创建新对象」的能力，不需要你手写 `clone()`

JS 的 `Object.create(proto)` 正好是第二种。注意这里的微妙之处：**`Object.create` 确实是原型模式思想的语言级实现，但它建立的原型链关系，属于「原型链」这套机制**。两个概念在这里物理上重叠了——这就是为什么那么多人把它们混为一谈。第五节会把这个交点的边界精确地画出来。

### 把笔记里的那句原话归位

笔记开头有这么一句：

> 创建基类的时候，简单差异化的属性放在构造函数中，消耗资源相同的功能放在基类原型中

这句话本身完全正确，而且是 JS 性能优化的经典法则——**差异化的数据放实例，相同的逻辑放原型**，这样 1000 个实例只存 1000 份数据 + 1 份方法，而不是 1000 份数据 + 1000 份方法。

但它讲的**不是原型模式**，是原型链。它解决的是「方法怎么复用」（内存优化），而原型模式解决的是「对象怎么创建」（创建优化）。

先在这里做一个标记。第五节会把这句话、笔记里的 `Person` 示例、以及 Canvas 动画，一起放到正确的坐标上——它们全部属于原型链那一侧。

> 💬 **面试官**：原型模式的「原型」和 JS 里说的「原型」，是同一个东西吗？
>
> ✅ 标准答案：不是。GoF 原型模式里的「原型」指的是**被克隆的那个实例对象**——它是一个普通的对象实例，你从它 `clone()` 出新对象。JS 里说的「原型」通常指函数上的 `prototype` 属性，或者对象的 `[[Prototype]]` 内部槽——它是一条**继承链的上一环**，用来共享方法和属性。前者是创建模式的角色，后者是语言的对象模型机制。
>
> 🎁 加分答案：能补一句「这两个概念在最底层确实有物理重叠」——GoF 原型模式的第二种落地形态（语言原生原型机制）在 JS 里就是 `Object.create(proto)`，它借用的正是原型链这套机制；但「实现手段借用」不等于「概念相同」，就像「用数组实现栈」不代表栈就是数组。能主动说出「重叠在哪、为什么重叠但不等价」，是这道题真正的高分位。

---

## 三、结构与角色：一个接口 + 一张注册表

### 标准结构长什么样

原型模式的结构出奇地简单——它的简单恰恰是它的难点：**没有复杂的类关系，只有一个 `clone()` 方法和一个注册表**。

![原型模式标准结构图：Prototype 接口声明 clone 方法，ConcretePrototype 实现自我复制，客户端通过 clone 获取新对象而不调用构造函数](https://refactoring.guru/images/patterns/diagrams/prototype/structure.png)

上图里有三个角色，其中两个在 GoF 定义里：

- **Prototype（抽象原型）**：声明 `clone()` 接口。在 TS 里通常是一个泛型接口 `Cloneable<T>`，因为克隆必须返回正确类型
- **ConcretePrototype（具体原型）**：实现 `clone()`，并且**必须知道自己怎么复制自己**——哪些字段要深拷、哪些可以共享引用

第三个角色是实践里加进来的，GoF 提过但没画进标准图：

- **PrototypeRegistry（原型注册表）**：按名字（或 ID）存储一批预先准备好的原型，调用方按名字取，取到之后 `clone()`

笔记里那张原型类图，画的是最精简的两个角色版本——`Prototype` 声明 `clone()`，`ConcretePrototype` 实现它，客户端只跟 `Prototype` 打交道：

![原型模式的精简类图：Prototype 声明 clone 接口，ConcretePrototype 实现自我复制，Client 通过 Prototype 接口拿到新对象，全程不接触构造函数](https://cdn.nlark.com/yuque/0/2021/png/738210/1639316570594-0a533b42-4d1a-48c0-8dfb-a6317cf85d30.png)

加上注册表之后，结构就长这样：

```text
                        ┌──────────────────────────────┐
                        │       PrototypeRegistry       │
                        │  prototypes: Map<string, P>   │
                        │  register(key, proto)         │
                        │  create(key): P   ← clone 后返回│
                        └───────────────┬───────────────┘
                                        │ 持有若干原型
                                        ▼
        ┌───────────────────────────────────────────────────────┐
        │  <<interface>>  Cloneable<T>                          │
        │  + clone(): T                                         │
        └───────────────────────▲───────────────────────────────┘
                                │ implements
                ┌───────────────┴────────────────┐
                │  PrescriptionTemplate          │
                │  drugId / dosage / warnings[]   │
                │  + clone(): PrescriptionTemplate│
                └────────────────────────────────┘
```

### 注册表为什么必须有：这是原型模式相对工厂的独特优势

很多人学到这儿会问：既然复制之后还要改字段，为什么不直接写一个工厂？`createPrescription(type)` 不香吗？

这里有一个工厂做不到的事：**工厂必须知道「要造的是哪个类」，而原型注册表不需要。**

```typescript
// 工厂：必须硬编码「有哪些类型」，新增类型要改这里
function createTemplate(type: string) {
  switch (type) {
    case 'upper-respiratory': return new PrescriptionTemplate(/* 十几个参数 */);
    case 'gastroenteritis': return new PrescriptionTemplate(/* 十几个参数 */);
    // 新增类型 → 改这个函数 → 违反 OCP
  }
}

// 注册表：只需要「有哪些实例」，新增类型只是加一条注册记录
registry.register('upper-respiratory', upperRespiratoryTemplate);
registry.register('gastroenteritis', gastroenteritisTemplate);
// 新增类型 → 注册一行 → 工厂代码零改动
```

更深一层的差异在**参数从哪来**：工厂要构造对象，必须知道构造函数的全部参数；而注册表只需要手里有一个**已经构造好的实例**——这个实例可能是后台配置下发的、用户保存的、从上一个订单复制来的。**你拿不到构造参数，但你有对象本身**的时候，工厂无能为力，原型可以。

这一点在「配置来自服务端」的医疗系统里太常见了：处方的模板是运营在后台配的，前端根本不知道构造一个「上呼吸道感染模板」需要哪些参数——但前端能拿到这个模板对象的 JSON，`Object.create` / `clone` 一下就能用。

> 💬 **面试官**：原型模式和工厂模式都能创建对象，那原型模式的独特价值在哪？
>
> ✅ 标准答案：工厂模式必须知道「要实例化哪个类」以及「构造它需要哪些参数」；原型模式只需要手里有一个现成的实例。所以原型模式在两类场景下有不可替代性：第一，构造参数复杂或不可得（比如配置从服务端下发、对象是从上一个实例派生出来的）；第二，产品的具体类型需要在运行时动态加入（注册表模式，新增类型只是注册一行，工厂代码零改动，符合开闭原则）。
>
> 🎁 加分答案：能补一句「工厂关注『创建哪种』，原型关注『以谁为样板』」——工厂的输入是类型标识，原型的输入是样板对象。再补一个工程细节：注册表模式下，原型的初始化只做一次，后面每次 `create` 都是纯内存拷贝，这在「高频创建 + 初始化昂贵」的组合下收益最明显。

---

## 四、核心实现：从处方模板到克隆工具箱

这一节从最小可用的版本开始，一路走到面试必考的手写深拷贝。

### 最小可用版：让处方模板学会复制自己

```typescript
// 📚 知识点：用泛型接口约束 clone 的返回类型
// 为什么不用 clone(): Prototype？因为那样调用方拿到的还是父类型，得手动断言
// 泛型 <T> 让每个具体原型都能声明「我复制出来的还是我自己」
interface Cloneable<T> {
  clone(): T;
}

class PrescriptionTemplate implements Cloneable<PrescriptionTemplate> {
  constructor(
    public drugId: string,
    public dosage: string,
    public warnings: string[]
  ) {}

  clone(): PrescriptionTemplate {
    // 👈 关键：warnings 必须新建一个数组，不能直接 this.warnings
    return new PrescriptionTemplate(this.drugId, this.dosage, [...this.warnings]);
  }
}

// 最简形式的原型注册表：一个 Map 就够了
const registry = new Map<string, PrescriptionTemplate>();
```

`clone()` 里那行 `[...this.warnings]` 是整段代码的重点。如果写成 `this.warnings`，两个处方会**共享同一个数组**——A 处方加一条警示，B 处方会莫名其妙多出一条。这就是浅拷贝最经典的坑，下一节「浅克隆 vs 深克隆」会专门演示。

`drugId` 和 `dosage` 是字符串，直接赋值就是安全的（原始类型没有引用）。判断标准很简单：

| 字段类型                                                         | 直接赋值安全吗                  | 原因                                               |
| ---------------------------------------------------------------- | ------------------------------- | -------------------------------------------------- |
| `string` / `number` / `boolean` / `null` / `undefined` | ✅ 安全                         | 原始类型，值拷贝                                   |
| 数组 / 普通对象 / `Map` / `Set`                              | ❌ 要新建                       | 引用类型，直接赋值就是共享                         |
| `Date` / `RegExp`                                            | ❌ 要 `new Date(d.getTime())` | 对象，共享会互相影响                               |
| 类实例                                                           | ❌ 要递归深拷或重构造           | 同上，且可能带原型方法                             |
| 函数                                                             | ⚠️ 通常直接共享               | 函数无状态时共享是安全的（原型链正是在利用这一点） |

### 原型注册表：按名字取样板

```typescript
class TemplateRegistry {
  private prototypes = new Map<string, PrescriptionTemplate>();

  register(key: string, template: PrescriptionTemplate): void {
    this.prototypes.set(key, template);
  }

  create(key: string): PrescriptionTemplate {
    const proto = this.prototypes.get(key);
    if (!proto) throw new Error(`未注册的处方模板：${key}`);
    // 👈 注册表只负责「找到样板」，复制由样板自己做
    // 这叫「把变化封装在对象内部」——注册表不需要知道 clone 的实现细节
    return proto.clone();
  }
}

// 使用：启动时注册一次，之后高频创建
const registry = new TemplateRegistry();
registry.register('upper-respiratory', new PrescriptionTemplate('A001', '每次1片，每日3次', ['孕妇慎用']));

const p1 = registry.create('upper-respiratory');
const p2 = registry.create('upper-respiratory');
p1.dosage = '每次2片，每日3次';
p1.warnings.push('肝功能不全者减量');

console.log(p2.dosage);    // '每次1片，每日3次'  ← 没被 p1 影响
console.log(p2.warnings);  // ['孕妇慎用']        ← 没被 p1 影响
```

### 浅克隆 vs 深克隆：一条内存线说清

这是全篇最需要图示的地方。假设有这样一个对象：

```typescript
const original = {
  name: '阿莫西林胶囊',
  spec: { packageCount: 24, unit: '片' },   // 嵌套对象
  tags: ['抗生素', '处方药'],                // 数组
};
```

**浅克隆**（`Object.assign` / 展开运算符）只复制第一层的「引用值」，不往下走：

```text
   浅克隆之后（Object.assign / {...original}）

   original ──► ┌─────────────────────┐
                │ name: '阿莫西林胶囊'  │  ← 原始类型，各存一份，互不影响
                │ spec: ───────────────┼──┐
                │ tags: ───────────────┼──┼──┐
                └─────────────────────┘  │  │
   shallow  ──► ┌─────────────────────┐  │  │
                │ name: '阿莫西林胶囊'  │  │  │
                │ spec: ───────────────┼──┘  │  ← 两个对象指向同一个 spec
                │ tags: ───────────────┼─────┘  ← 两个对象指向同一个 tags
                └─────────────────────┘

   改 shallow.spec.packageCount = 12
   → original.spec.packageCount 也变成了 12  ⚠️
```

**深克隆**递归地往下复制，把每一层引用都换成新的：

```text
   深克隆之后（structuredClone / 手写递归）

   original ──► ┌──────────────┐      deep ──► ┌──────────────┐
                │ name: '阿莫…'│               │ name: '阿莫…'│
                │ spec: ───┐   │               │ spec: ───┐   │
                │ tags: ─┐ │   │               │ tags: ─┐ │   │
                └────────┼─┼───┘               └────────┼─┼───┘
                         │ │                          │ │
                         │ └─► {packageCount:24}  ◄───┘ │
                         │    {packageCount:24}  ◄─────┘  ← spec 各一份
                         └───► ['抗生素','处方药']  ◄───┐
                               ['抗生素','处方药']  ◄───┘  ← tags 各一份
```

现场演示一遍浅克隆的坑：

```typescript
const original = { name: '阿莫西林胶囊', tags: ['抗生素'] };

const shallow = { ...original };
shallow.tags.push('处方药');

console.log(original.tags); // ['抗生素', '处方药']  ⚠️ 原对象被改脏了
```

**这就是为什么 `clone()` 里那行 `[...this.warnings]` 不能省。**

### 深克隆的四条路线：一张表看清边界

面试问你「深拷贝怎么写」，其实是在问「你知道每条路的边界吗」。四条主流路线：

| 路线                              | 循环引用                     | `Date`        | `Map`/`Set` | 函数                     | 类实例            | 一句话评价                       |
| --------------------------------- | ---------------------------- | --------------- | --------------- | ------------------------ | ----------------- | -------------------------------- |
| `JSON.parse(JSON.stringify(x))` | ❌ 直接抛错                  | ❌ 变字符串     | ❌ 变 `{}`    | ❌ 丢失                  | ❌ 原型丢失       | 只在纯 JSON 数据上安全           |
| `structuredClone(x)`            | ✅ 支持                      | ✅              | ✅              | ❌ 抛 `DataCloneError` | ❌ 退化为普通对象 | 浏览器原生，首选                 |
| 手写递归                          | ✅ 需自己用 `WeakMap` 处理 | ✅ 需自己写分支 | ✅ 需自己写分支 | ⚠️ 通常共享            | ⚠️ 需自己决定   | 面试必考，工程上除非有特殊需求   |
| `lodash.cloneDeep(x)`           | ✅                           | ✅              | ✅              | ✅ 默认不拷（可配）      | ⚠️ 保留原型     | 业务代码最省心，代价是多一个依赖 |

### JSON 法：看起来最方便，坑最多

```typescript
const bad = JSON.parse(JSON.stringify(original));
```

这一行在小 demo 里永远是对的，在真实业务里能埋六个坑：

| 坑                                      | 现象                                  | 为什么会踩到                  |
| --------------------------------------- | ------------------------------------- | ----------------------------- |
| `undefined` 键消失                    | `{a: undefined}` → `{}`          | JSON 没有 `undefined` 类型  |
| `Date` 变成字符串                     | `new Date()` → `"2026-11-04T…"` | `toJSON()` 被调用           |
| `RegExp` / `Map` / `Set` 变空对象 | `new Map([[1,2]])` → `{}`        | 不可枚举属性不参与序列化      |
| `NaN` / `Infinity` 变 `null`      | `{n: NaN}` → `{n: null}`         | JSON 数字规范里没有这两个值   |
| 循环引用直接抛错                        | `a.self = a` → `TypeError`       | `JSON.stringify` 处理不了环 |
| Symbol 键、不可枚举属性丢失             | —                                    | 序列化只看可枚举自有属性      |

🔧 **真实场景**：一个订单对象里有个 `createdAt: Date`，导出功能用 JSON 法复制了一遍，之后所有日期判断都变成了字符串比较。两个 `Date` 之间用 `>` 比较比的是时间戳，结果正确；但「字符串」和 `Date` 比较时，关系运算符走的是转原始值再比大小，一边是字符串一边是数字，比较结果是 `NaN`，**任何比较都返回 `false`**。于是筛选条件是「近三个月」，逻辑一条不报错，列表却永远为空。排查了两个小时才发现根因在复制那一步。**JSON 法只在这份数据 100% 是纯 JSON 结构时安全：无 Date、无 Map/Set、无 undefined、无循环引用。** 业务代码里这个前提几乎从不成立。

### `structuredClone`：现代浏览器与 Node 17+ 的首选

```typescript
const deep = structuredClone(original);
```

它是 HTML 标准里的结构化克隆算法，**能力边界靠一张表记最清楚**：

| ✅ 能正确克隆                       | ❌ 会失败或退化                                            |
| ----------------------------------- | ---------------------------------------------------------- |
| 循环引用（自动保留引用关系）        | 函数（抛 `DataCloneError`）                              |
| `Date` / `RegExp`               | `Symbol`（抛 `DataCloneError`）                        |
| `Map` / `Set`                   | DOM 节点（抛 `DataCloneError`）                          |
| `ArrayBuffer` / TypedArray        | `WeakMap` / `WeakSet`（抛 `DataCloneError`）         |
| `Blob` / `File` / `ImageData` | 类实例（**不抛错，但退化为普通对象，原型方法丢失**） |
| 嵌套任意深度                        | getter（会被求值后固化成普通数据属性，setter 丢失）        |

最后一行是**最隐蔽的一个坑**：类实例不报错，只是默默丢掉原型。你 `clone` 出来一个「看起来一样但 `instanceof` 为 false、方法全没了」的对象——比直接抛错难排查十倍。

### 手写深拷贝：面试必考，三层递进

面试官让你手写深拷贝，他要看的不是你能不能背出来，而是**你会不会一层层补边界**。分三层写，说清每层在补什么。

**第一层：基础递归骨架**

```typescript
function deepClone<T>(target: T): T {
  // 基础类型 / 函数：直接返回（函数共享是安全的，无状态时）
  if (typeof target !== 'object' || target === null) return target;

  // 📚 知识点：用 Array.isArray 而不是 instanceof Array
  // 因为 instanceof 依赖原型链，跨 iframe 传来的数组会判断失败
  const result: any = Array.isArray(target) ? [] : {};

  for (const key in target) {
    // hasOwnProperty 过滤掉原型链上的属性，只拷自己的
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      result[key] = deepClone((target as any)[key]);
    }
  }
  return result;
}
```

这一层能过「写个深拷贝」的入门关，但至少有四个洞：`Date` 会被拷成空对象（它没有可枚举自有属性）、`RegExp` 同理、`Map`/`Set` 同理、循环引用直接栈溢出。

**第二层：补齐内置类型分支**

```typescript
function deepClone<T>(target: T): T {
  if (typeof target !== 'object' || target === null) return target;

  // 用 Object.prototype.toString 拿准确类型，比 instanceof 可靠
  const type = Object.prototype.toString.call(target);

  if (type === '[object Date]') return new Date((target as Date).getTime()) as T;
  if (type === '[object RegExp]') return new RegExp((target as RegExp).source, (target as RegExp).flags) as T;

  if (type === '[object Map]') {
    const map = new Map();
    (target as Map<any, any>).forEach((v, k) => map.set(deepClone(k), deepClone(v)));
    return map as T;
  }
  if (type === '[object Set]') {
    const set = new Set();
    (target as Set<any>).forEach(v => set.add(deepClone(v)));
    return set as T;
  }

  const result: any = Array.isArray(target) ? [] : {};
  for (const key of Reflect.ownKeys(target)) {
    // Reflect.ownKeys 会带出 Symbol 键和不可枚举键，比 for...in 完整
    result[key] = deepClone((target as any)[key]);
  }
  return result;
}
```

这里三个细节值得单独说：

- **`Object.prototype.toString.call()`** 比 `instanceof` 可靠，因为在多窗口（iframe）、多执行上下文场景下 `instanceof` 会失效，而 `toString` 的 `[object Xxx]` 标记是引擎内置的
- **`Reflect.ownKeys`** 会返回字符串键 + Symbol 键，且包含不可枚举键——比 `for...in`（含原型链、只含可枚举）和 `Object.keys`（只含可枚举）都完整
- **`Map` 的键也要深拷**，因为 Map 的键可以是对象；漏掉这一步会导致克隆出来的 Map 用「新对象」去 `get` 一个「旧引用」时找不到

**第三层：`WeakMap` 解决循环引用**

```typescript
function deepClone<T>(target: T, cache = new WeakMap()): T {
  if (typeof target !== 'object' || target === null) return target;

  // 📚 知识点：先查缓存，命中直接返回同一个克隆体
  // 这既解决了循环引用（不会无限递归），也解决了「同一对象被多次引用」的引用关系保持
  if (cache.has(target as object)) return cache.get(target as object);

  const type = Object.prototype.toString.call(target);
  if (type === '[object Date]') return new Date((target as Date).getTime()) as T;
  if (type === '[object RegExp]') return new RegExp((target as RegExp).source, (target as RegExp).flags) as T;

  // 👈 Map / Set 的容器类型和数组、普通对象不同，必须先单独建容器
  if (type === '[object Map]') {
    const map = new Map();
    cache.set(target as object, map);  // 同样要「先预约」
    (target as Map<any, any>).forEach((v, k) => map.set(deepClone(k, cache), deepClone(v, cache)));
    return map as T;
  }
  if (type === '[object Set]') {
    const set = new Set();
    cache.set(target as object, set);
    (target as Set<any>).forEach(v => set.add(deepClone(v, cache)));
    return set as T;
  }

  const result: any = Array.isArray(target) ? [] : {};
  // 👈 关键：在递归子属性之前，先把「自己」预约进缓存
  // 顺序反了就会栈溢出——因为子属性指回自己时缓存里还没有
  cache.set(target as object, result);

  for (const key of Reflect.ownKeys(target)) {
    result[key] = deepClone((target as any)[key], cache);
  }
  return result;
}
```

`cache.set` 的位置是这一段唯一的陷阱：**必须在递归子属性之前把 `result` 放进缓存**。如果写在之后，遇到 `a.self = a` 这种自引用，递归进入 `a.self` 时缓存里还没有 `a` 的克隆体，就会继续往下递归，直到栈溢出。

至于**为什么用 `WeakMap` 而不是 `Map`**——这是第三层真正的考点：

|          | `Map`                           | `WeakMap`                 |
| -------- | --------------------------------- | --------------------------- |
| 键的类型 | 任意                              | 只能是对象                  |
| 键的引用 | **强引用**，键对象不会被 GC | **弱引用**，不影响 GC |
| 可枚举   | 可 `forEach` / `keys()`       | 不可枚举，无法遍历          |
| 生命周期 | 跟着 Map 本身                     | 键对象被回收后自动释放条目  |

深拷贝是**一次性的临时操作**：拷贝完成后，缓存的使命就结束了。用 `Map`，这份缓存会一直强引用着所有原对象和克隆体，直到函数返回、`Map` 被回收——中间这段时间里，本该被 GC 的临时对象全被扣住了。用 `WeakMap`，缓存条目不会阻止 GC，函数一结束这批临时引用就自然释放。**一句话：临时映射用 `WeakMap`，因为你不希望它延长任何对象的生命周期。**

### 回到处方场景：克隆逻辑该写在谁身上

有了深拷贝工具箱，可以回头把 `clone()` 写得更彻底：

```typescript
class PrescriptionTemplate implements Cloneable<PrescriptionTemplate> {
  constructor(
    public drugId: string,
    public dosage: string,
    public warnings: string[],
    public extra: { tags: string[]; audit: { reviewer: string } }
  ) {}

  clone(): PrescriptionTemplate {
    // 👈 用法一：整个对象深拷一遍，简单但对大数据量有成本
    return deepClone(this);
  }
}
```

这里有个比「用哪个深拷贝」更重要的设计问题：**为什么 `clone()` 要写在原型自己身上，而不是让外部统一调 `deepClone(target)`？**

因为**只有原型自己知道哪些字段需要深拷**。举两个例子：

- 一个 `warnings` 数组里存的是**共享的警示语常量对象**（全系统就那一份，永不修改）——这时候深拷反而是浪费，直接共享引用是对的
- 一个字段是**回调函数**——深拷贝根本拷不了函数，只能共享；如果外部工具忙着「递归一切」，它会在函数这一层卡住或悄悄丢东西

`deepClone` 只能靠反射猜结构，`clone()` 靠的是**领域知识**。这就是 GoF 强调「让对象自己负责复制自己」的真正原因——不是为了代码好看，是因为**只有它自己有足够的语义信息来做正确的拷贝决策**。

> 💬 **面试官**：`Object.assign({}, obj)` 是深拷贝还是浅拷贝？它有什么坑？
>
> ✅ 标准答案：浅拷贝。它只复制目标对象的**自有可枚举属性**，对于值是对象的属性，复制的是引用——改嵌套对象会影响源对象。它的坑主要有四个：① 不拷贝原型链上的属性，所以克隆出来的对象会丢失原型方法；② 访问器属性（getter）会被**求值**后变成普通数据属性，setter 和 getter 本身都丢失；③ 不可枚举属性不参与拷贝；④ 如果源对象和目标是同一个对象，或者传了 `null`/`undefined` 之外的怪异值，行为容易误判（`Object.assign` 会跳过 `null`/`undefined` 源而不报错，容易掩盖问题）。
>
> 🎁 加分答案：能补一句「展开运算符 `{...obj}` 和 `Object.assign` 语义几乎一致，唯一区别是 `Object.assign` 会调用目标的 setter 而展开运算符不会」——这说明你读过规范而不只是用过 API。再补一句实战建议：**克隆对象时优先用 `structuredClone`，只有在明确知道数据是扁平纯 JSON 时才用浅拷贝**；并且提醒一句「浅拷贝不是没用」——React 的 state 更新恰恰依赖浅拷贝（`setState({...state, a: 1})`），因为 React 靠引用是否变化来判断要不要重渲染，深拷贝会让 `===` 比较永远为假，反而导致每次都重渲染。

---

## 五、易混淆辨析：原型链不是原型模式

前面四节讲完了 GoF 原型模式。这一节处理这篇的真正主角——那个被混了二十年的辨析题。

### 先给坐标：一张表把两个「原型」分开

| 维度           | **GoF 原型模式**                         | **JS 原型链**                                           |
| -------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| 解决什么问题   | 对象**怎么创建**（省掉昂贵的初始化）     | 属性/方法**怎么复用**（一次定义，处处可取）             |
| 「原型」指的是 | 被克隆的**实例对象**                     | 函数上的 `prototype` 属性 / 对象的 `[[Prototype]]` 内部槽 |
| 关键词         | `clone()`、复制、深/浅拷贝                   | `prototype`、`__proto__`、继承、`instanceof`            |
| 在 GoF 分类里  | 创建型（5 种之一）                             | **不属于设计模式**，是语言的对象模型机制                |
| 典型代码       | `template.clone()`                           | `class B extends A` / `Object.create(proto)`              |
| 优化目标       | 减少**构造开销**                         | 减少**内存占用**（方法只存一份）                        |
| 面试常问       | 浅拷贝和深拷贝的区别、`structuredClone` 边界 | `new` 做了什么、`instanceof` 原理、手写原型继承           |

**一句话记住区别：原型模式是「复制实例」，原型链是「共享方法」。**

把这条线画成图：

```text
                 都叫「原型」，但站在两条不同的轨道上
   ┌─────────────────────────────────┐   ┌─────────────────────────────────┐
   │        GoF 原型模式              │   │         JS 原型链                │
   │        （创建型 · 怎么造）        │   │        （对象模型 · 怎么查）      │
   ├─────────────────────────────────┤   ├─────────────────────────────────┤
   │   Prototype ×──clone()──▶ 新实例 │   │   实例 ──[[Prototype]]──▶ 原型对象│
   │                                 │   │                            │     │
   │   目的：跳过昂贵的 new 初始化     │   │   目的：找不到属性就往上一环找    │
   │   产出：一份内容相近的副本        │   │   产出：一条向上的查找链          │
   └─────────────────────────────────┘   └─────────────────────────────────┘
                    │                                    │
                    └──────────────┬─────────────────────┘
                                   ▼
                       物理上重叠的点：Object.create(proto)
                       ——用原型链机制，实现原型模式的意图之一
```

到这里，原型模式那一侧讲完了，该把原型链那一侧补齐。下面这部分完整保留了笔记的内容——因为这些正是「原型的另一半真相」，也是面试真正的深水区。从最基础的两条判断开始，一路走到 `null` 这个终点。

### 函数和对象：一切的地基

笔记里有两条看起来很哲学、实际上极其关键的判断：

- **函数是一种对象**
- **对象都是通过函数创建的**

```javascript
// 函数是一种对象
function Person() {}
console.log(Person instanceof Object); // true  ← 函数也是对象

// 对象都是通过函数创建的
const p1 = new Person();
const o1 = { name: 'test' }
// 上句代码实现等同下面两句
const o2 = new Object();
o2.name = 'test';
console.log(p1);  // Person {}
console.log(o1);  // { name: 'test' }
console.log(o2);  // { name: 'test' }
```

这两条判断是整个原型链体系的起点：

- 「函数是对象」意味着**函数自己也有 `__proto__`**，所以函数也能走原型链
- 「对象都是通过函数创建的」意味着**每个对象背后都有一个构造函数**，哪怕字面量 `{name:'test'}` 这种「没有 new」的写法，引擎也是用 `new Object()` 完成的

记住这两条，后面所有「谁指向谁」就不会记混。

### `prototype` 与 `__proto__`：两条腿

- 每个**函数**都有一个属性叫 `prototype`
- `prototype` 的值是一个对象，默认只有一个叫 `constructor` 的属性，指向这个函数本身
- 每个**对象**都有一个隐藏属性 `__proto__`（规范里叫 `[[Prototype]]`），它引用了**创建这个对象的函数的 `prototype`**

![原型系统基本结构图：函数通过 prototype 指向原型对象，原型对象的 constructor 指回函数，实例的 proto 指向同一个原型对象](https://cdn.nlark.com/yuque/0/2021/png/738210/1639366830389-a3b58590-8d4a-40d8-af9f-c116af2b571d.png)

上图是这套机制的骨架。抓住一个循环就够了：**函数的 `prototype` 指向原型对象，原型对象的 `constructor` 指回这个函数，实例的 `__proto__` 再指向这个原型对象。**三个指针构成一个三角，这个三角是所有 JS 继承的原子单位。

接下来两条容易漏的指向：

- 自定义函数的 `prototype` 是由 `Object` 创建的，所以它的 `__proto__` 指向 `Object.prototype`
- `Object.prototype` 的 `__proto__` 指向 `null`——原型链的终点

![自定义函数与实例的完整原型关系图：f1、f2 两个实例的 proto 都指向 Foo.prototype，Foo.prototype 的 proto 指向 Object.prototype，最终指向 null](https://cdn.nlark.com/yuque/0/2021/png/738210/1639366847250-00da882b-7ca9-46a7-a4bc-c30a86431da0.png)

注意图里 **`__proto__` 有两个方向**：实例 `f1`、`f2` 指向 `Foo.prototype`（这是「实例找方法」）、`Foo.prototype` 指向 `Object.prototype`，`Object.prototype` 指向 `null`（这是「找不到就往上找」，终点是 `null`）。**`null` 是原型链的终点，这一点在面试里几乎必被追问「原型链的顶端是什么」。**

### 函数自己的原型链：一个容易被忽略的三角

函数是对象，所以函数也有 `__proto__`。三条指向经常被记混：

- 自定义函数 `Foo.__proto__` 指向 `Function.prototype`
- `Object.__proto__` 指向 `Function.prototype`
- `Function.__proto__` 指向 `Function.prototype`

![Function 与 Object 的三角关系图：Object、Function 以及所有自定义函数的 proto 都指向 Function.prototype，而 Function.prototype 的 proto 再指向 Object.prototype](https://cdn.nlark.com/yuque/0/2021/png/738210/1639366869395-9c98c078-1096-4b84-be1d-f70569ab4c04.png)

这张图最反直觉的地方是 **`Function.__proto__ === Function.prototype`**——Function 是自己创建自己的，这是一个自环。所以 `Function instanceof Function` 是 `true`：

```javascript
console.log(Object instanceof Function);   // true
console.log(Function instanceof Object);   // true
console.log(Function instanceof Function); // true
```

三个 `true` 全部成立，看起来像悖论，其实是「函数是对象 + 对象由函数创建」这两条基础判断的必然后果。

还有一个语法糖层面的证据，笔记里这一点很容易被跳过但非常有用：

```javascript
function sum(a, b) {
  return a + b;
}
// 上面方式是下面的语法糖，等价下面方式
const sum = new Function('a', 'b', 'return a + b');
```

`function` 声明这个语法，本质上就是 `new Function(...)` 的语法糖。**这行代码是「函数也是一种对象」最直接的实证**——既然 `sum` 能被 `new Function` 创建出来，它自己当然也是一个由 `Function` 构造的对象，因此它的 `__proto__` 指向 `Function.prototype`。

最后一块拼图：**`Function.prototype` 的 `__proto__` 也指向 `Object.prototype`。**

![Function.prototype 与 Object.prototype 的关系图：Function.prototype 的 proto 指向 Object.prototype，Object.prototype 的 proto 指向 null，整条链在这里终止](https://cdn.nlark.com/yuque/0/2021/png/738210/1639367970697-86603589-fc10-4cc7-8076-a7b1f8d891f4.png)

到这里，整条链闭合了。把所有图片里的关系汇总成一张文字版全图：

```text
                          ┌──────────────┐
                          │     null     │   ← 原型链终点
                          └──────▲───────┘
                                 │ [[Prototype]]
                    ┌────────────┴─────────────┐
                    │    Object.prototype      │
                    │  （链上所有对象最终都到这）│
                    └────────────▲─────────────┘
                                 │
              ┌──────────────────┴────────────────────┐
              │                                       │
  ┌───────────┴────────────┐            ┌─────────────┴──────────────┐
  │  Function.prototype    │            │  Foo.prototype              │
  │  （所有函数的公共方法） │            │  { constructor: Foo }       │
  └───────────▲────────────┘            └─────────────▲──────────────┘
              │                                       │
  ┌───────────┴────────────┐            ┌─────────────┴──────────────┐
  │ Function / Object / Foo│            │  f = new Foo()              │
  │ （函数本身，都是对象） │            │  （实例对象）                │
  └────────────────────────┘            └────────────────────────────┘
```

### `instanceof`：两条线找重合

笔记里的规则描述得很准确：

> `instanceof` 运算符的第一个变量是一个对象，暂称 A，第二个变量一般是一个函数，暂称 B。判断规则是：沿着 A 的 `__proto__` 这条线来找，同时沿着 B 的 `prototype` 这条线来找，如果两条线能找到同一个引用，即同一个对象，那么就返回 `true`；如果找到终点还未重合，则返回 `false`。

![Javascript 对象原型全图：左侧是函数与实例的 proto 链，右侧是各个 prototype 对象，instanceof 就是判断实例的 proto 链上能否找到构造函数的 prototype](https://cdn.nlark.com/yuque/0/2021/png/738210/1639365090333-f73f9200-ea63-49b5-bbe8-9c0241e1190e.png)

这张图是理解 `instanceof` 的最佳素材：**左边那一列是「实例往上爬的链」，右边那一列是「构造函数手里握着的原型对象」，`instanceof` 就是把左边往上爬的过程中，拿每一站去跟右边那个固定站点比对。**

顺带把笔记里的笔误改正一下：笔记里写的是 `hasOwnPrototype`，正确的方法是 **`hasOwnProperty`**（`Object.prototype.hasOwnProperty`）。这个笔误在面试里说出口会露怯——因为它是最基础的 API 名。

既然笔记只给了规则没给实现，把 `instanceof` 手写一遍，这道题就彻底闭环了：

```javascript
function myInstanceof(obj, Ctor) {
  // 基础校验：左操作数必须是非空值，且可以是对象「或函数」
  // 👈 为什么要放函数过去？因为 Function instanceof Function 也是 true，
  //    函数本身也是对象，把它一刀切掉就会答错这道经典题
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) return false;
  if (typeof Ctor !== 'function') throw new TypeError('Right-hand side of instanceof is not callable');

  const target = Ctor.prototype;          // 右边：构造函数手里的原型对象，固定不动
  let proto = Object.getPrototypeOf(obj); // 左边：从实例开始往上爬

  while (proto !== null) {
    if (proto === target) return true;    // 两条线在某站重合 → true
    proto = Object.getPrototypeOf(proto); // 继续往上爬
  }
  return false;                           // 爬到 null 还没重合 → false
}

// 验证三个经典结论
myInstanceof(Function, Function); // true  ← Function.__proto__ 就是 Function.prototype
myInstanceof(Object, Function);   // true
myInstanceof([], Object);         // true  ← 数组的链最终到 Object.prototype
```

注意这里用的是 `Object.getPrototypeOf(obj)` 而不是 `obj.__proto__`。原因有两个：`__proto__` 是历史遗留的访问器（虽然现在已是规范的一部分），而 `getPrototypeOf` 是标准 API；更重要的是，`Object.create(null)` 创建的对象**没有** `__proto__` 属性，但 `getPrototypeOf` 依然能正确返回 `null`。

### 原型链查找与 `hasOwnProperty`

- 访问一个对象的属性时，先在**自己身上**找，如果没有，再沿着 `__proto__` 这条链往上找——这就是原型链
- `hasOwnProperty` 可以区分一个属性到底是自己的，还是从原型上找到的

```javascript
function Foo() {
  this.a = 10
}
Foo.prototype.b = 20;
const f = new Foo();
console.log(f.a); // 10
console.log(f.b); // 20
```

`f.a` 从实例自己身上取到（`this.a = 10` 写在了实例上），`f.b` 是从 `Foo.prototype` 上「继承」来的。用 `hasOwnProperty` 一测就分明：

```javascript
f.hasOwnProperty('a'); // true   ← 自己的
f.hasOwnProperty('b'); // false  ← 从原型链上找到的
'b' in f;              // true   ← in 运算符会把原型链一起找
```

这三行的区别是面试里的高频追问点：**`hasOwnProperty` 只看自有属性，`in` 会沿原型链查找。** 所以「判断某个属性存不存在」，两个 API 给出的答案可能不同——这也是为什么遍历对象时，`for...in` 需要配合 `hasOwnProperty` 过滤，否则会把原型上的方法一起枚举出来。

### 原型的优势：可扩展、可重写

笔记里这一点用两行代码说清了：

```javascript
const obj = {};
console.log(obj.toString());   // [object Object]
const arr = [1, 2, 3];
console.log(arr.toString());   // 1,2,3
```

`obj` 和 `arr` 都是**空手起家**——`{}` 里什么都没写，`[1,2,3]` 里只有三个数字。但两个都能调 `toString()`，因为方法是从原型链上拿到：

- `obj.toString` 来自 `Object.prototype.toString` → 输出 `[object Object]`
- `arr.toString` 来自 `Array.prototype.toString`（它覆盖了 `Object.prototype` 上的同名方法）→ 输出 `1,2,3`

**这恰好就是「可扩展、可重写」的完整演示**：

- **可扩展**：不用改 `obj` 或 `arr` 的任何一行代码，给 `Object.prototype` 加一个方法，所有对象立刻具备——这就是「一次定义，处处可用」
- **可重写**：`Array.prototype.toString` 覆盖了 `Object.prototype.toString`，**离实例更近的那一环胜出**——这就是原型链查找的「就近原则」

### `new` 到底做了什么：两个概念真正的交点

到这一节，前面两条线终于要碰上了。

`new Foo()` 的实际执行过程是四步（注意是四步，不是三步）：

```text
    new Foo(args) 的四步

    ①  创建空对象           const obj = {}
                                        │
                                        ▼
    ②  挂上原型链           obj.__proto__ = Foo.prototype
        （← 面试最常漏的一步）
                                        │
                                        ▼
    ③  执行构造函数         const ret = Foo.apply(obj, args)
        （this 指向 obj）                │
                                        ▼
    ④  决定返回值           构造函数返回对象？返回它 ：返回 obj
                            （返回原始类型则忽略，仍返回 obj）
```

手写一遍，第②步的位置和作用就再也不会记错了：

```javascript
function myNew(Ctor, ...args) {
  // ① 创建一个空对象
  const obj = {};

  // ② 关键一步：把空对象的 __proto__ 指向构造函数的 prototype
  // 这一步就是「实例获得原型链」的唯一途径，也是 new 不可被普通函数替代的原因
  Object.setPrototypeOf(obj, Ctor.prototype);

  // ③ 以 obj 为 this 执行构造函数
  const ret = Ctor.apply(obj, args);

  // ④ 构造函数显式返回对象则用它，否则返回 obj
  // 为什么只认对象？因为 return 1 / return 'x' 时 this 语义不能被破坏
  return ret !== null && typeof ret === 'object' ? ret : obj;
}
```

**第②步就是两个概念的交点，也是所有混淆的源头：**

- `new` 用 `obj.__proto__ = Ctor.prototype` 建立了**原型链关系**——这是「属性怎么查找」的问题
- 原型模式用 `clone()` 跳过了第③步里那套昂贵的初始化——这是「对象怎么创建」的问题

一个管**查找**，一个管**创建**。它们在 `new` 这个动作里同时出现，所以极容易被当成一件事。

现在可以回头解释笔记开头那个看似不起眼的对比了：

```javascript
// 写法一：方法写在构造函数里
function Person (name) {
  this.name = name;
  this.getName = function() {
    return this.name;
  }
}
const p1 = new Person('zhangsan');
const p2 = new Person('lisi');
console.log(p1.getName == p2.getName); // false

// 写法二：方法写在原型上
function Person (name) {
  this.name = name;
  this.getName = function() {
    return this.name;
  }
}
// 1.复用
Person.prototype.setName = function (name) {
  this.name = name;
}
const p1 = new Person('zhangsan');
const p2 = new Person('lisi');
console.log(p1.setName == p2.setName); // true
```

两个 `console.log` 一个 `false` 一个 `true`，差别只在**方法挂在哪**：

|                         | `getName` 写在构造函数里                   | `setName` 写在 `prototype` 上                  |
| ----------------------- | -------------------------------------------- | -------------------------------------------------- |
| 归属                    | `this.getName` → 实例的**自有属性** | `Person.prototype.setName` → **原型属性** |
| 每次 `new` 时         | 每创建一个实例，就**新建一个函数对象** | 不新建，所有实例共享同一个函数                     |
| 1000 个实例的内存       | 1000 份 `name` + **1000 份函数**     | 1000 份 `name` + **1 份函数**              |
| `p1.getX === p2.getX` | `false`（两个不同的函数对象）              | `true`（同一个函数对象）                         |
| 查找路径                | 第 0 站就命中                                | 沿 `__proto__` 爬到 `Person.prototype` 才命中  |

这就把笔记开头那句话彻底解释清了：

> 简单差异化的属性放在构造函数中，消耗资源相同的功能放在基类原型中

- **差异化的属性**（`name`）→ 每个实例都不同 → 放构造函数，实例各自存一份
- **相同的功能**（`getName`/`setName`）→ 逻辑完全一样 → 放 `prototype`，全实例共享一份

**到这里，两个概念的边界就精确了：这套「方法共享」的优化，属于原型链；而「跳过初始化、复制实例」的优化，属于原型模式。笔记里那个 `Person` 示例，从头到尾讲的都是前者。**

### 案发现场：Canvas 圆点动画的 `Circle` 复用到底算什么

笔记最后的场景是这段 Canvas 圆点动画。它是全篇最容易让人误判「这是原型模式吧」的地方，所以完整保留，逐行复盘。

先是样式：

```html
<style>
  * {
    margin: 0;
    padding: 0;
  }
  body {
    margin: 50px auto;
    text-align: center;
  }
  canvas {
    border: 1px solid #ccc;
  }
</style>
```

然后是结构：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>原型模式</title>
</head>
<body>
  <canvas id="canvas" width="1000px" height="600px"></canvas>
</body>
</html>
```

最后是全部逻辑：

```javascript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const circles = [];

function Circle(x, y, radius) {
  this.x = x;
  this.y = y;
  this.radius = radius;
  circles.push(this);
}

function getRandomColor() {
  const rand = Math.floor(Math.random() * 0xFFFFFF).toString(16);
  if(rand.length == 6) {
    return `#${rand}`
  } else {
    return getRandomColor()
  }
}

Circle.prototype.render = function() {
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
  ctx.fillStyle = getRandomColor();
  ctx.fill();
}

Circle.prototype.update = function() {
  this.radius--;
  return this.radius > 0;
}

canvas.onmousemove = function(event) {
  new Circle(event.clientX, event.clientY, 30);
}

setInterval(() => {
  ctx.clearRect(0, 0, 1000, 600);
  circles.forEach(c => {
    c.update() && c.render();
  })
}, 13);
```

这段代码跑起来的效果：鼠标在画布上划过，每经过一个位置就产生一个半径 30 的圆点，每 13 毫秒所有圆点半径减 1 并重绘，缩到 0 就停止。

**现在回答那个问题：这里用原型模式了吗？**

答案是：**没有。它用的一直是原型链。**

理由很直接——看 `canvas.onmousemove` 那行：**每次鼠标移动都是 `new Circle(...)`，一个实例都没被复制过**。`Circle.prototype.render` 和 `Circle.prototype.update` 上挂的两个方法，作用是把「每个圆点都要画自己、都要缩小自己」这两段逻辑**共享给所有实例**，避免 500 个圆点就产生 500 份 `render` 函数。这正是 `p1.setName == p2.setName // true` 那个道理，属于原型链那一侧。

那这段代码里有没有「原型的味道」？有，但要说清是什么味道：

- `Circle.prototype` 上挂方法，是**原型链的方法共享**——笔记开头那句话的落地
- 而 GoF 原型模式要的是**实例的复制**——`circle.clone()` 造出一个新圆点，不重新走构造函数

如果真要按原型模式改写，代码会长这样：

```javascript
// 原型模式版：以已有圆点为样板，克隆出新圆点
Circle.prototype.clone = function() {
  // 👈 每个圆点的 x/y/radius 都不同，所以必须复制值；
  // render/update 在 prototype 上，天然共享，不需要复制
  return new Circle(this.x + 10, this.y + 10, this.radius);
}

canvas.onmousemove = function(event) {
  const base = circles[circles.length - 1];
  // 有样板就克隆，没样板才新建
  const dot = base ? base.clone() : new Circle(event.clientX, event.clientY, 30);
  circles.push(dot);
}
```

**但请注意：这个改写版本在工程上更差。** 因为 `new Circle(x, y, 30)` 的初始化成本几乎为零（就三个赋值），克隆带来的收益是负数。这就是第二节那条判断标准的实战检验——**「初始化成本高」这个前提不成立时，硬套原型模式只会让代码更绕。**

所以这段笔记的正确读法不是「这是原型模式的例子」，而是「这是原型链方法共享的例子，同时也是一个反例：它提醒你原型模式的前提条件」。**这也是真实笔记最常见的样子——同一个词在不同段落指的是不同东西，而正是这种混用，构成了面试题的来源。**

> 💬 **面试官**：你在笔记/项目里见过把原型链和原型模式搞混的地方吗？
>
> ✅ 标准答案：非常常见。最典型的是「在构造函数里定义方法」和「在 prototype 上定义方法」这组对比——很多人把它当成原型模式的例子，但它实际演示的是原型链的方法共享：`p1.getName === p2.getName` 为 `false` 是因为方法挂在实例上、每个实例各存一份；为 `true` 是因为方法挂在 `prototype` 上、全实例共享一份。整个过程没有任何对象被克隆，所以不是原型模式。
>
> 🎁 加分答案：能主动补一句判断方法——「看有没有『复制』这个动作：出现 `clone()`、`structuredClone`、`{...obj}` 这类复制语义的，才可能跟原型模式有关；只是把方法挂到 `prototype` 上的，一定是原型链」。再加一句更深的观察：真实业务里这两种东西经常写在同一个文件里（比如一个 `Circle` 类既用 `prototype` 共享方法，又提供一个 `clone()` 做复制），所以判断时不能看文件，要看**这一行代码在做哪件事**。

### 原型 vs 工厂：成本高不高、差异大不大

|                | 工厂模式                                          | 原型模式                           |
| -------------- | ------------------------------------------------- | ---------------------------------- |
| 创建方式       | 实例化类（`new`）                               | 复制已有实例（`clone`）          |
| 调用方需要知道 | 要哪种产品（类型标识）                            | 以谁为样板（原型对象/注册表 key）  |
| 新增产品的成本 | 加一个工厂子类（工厂方法）或改 switch（简单工厂） | 注册一行新原型                     |
| 构造参数       | **必须知道全部参数**                        | **不需要**（原型里已经有了） |
| 适合的场景     | 创建逻辑本身复杂，或要按不同条件选不同类          | 初始化昂贵 + 实例差异小            |
| 主要风险       | 类爆炸（每种组合一个子类）                        | 深浅拷贝判断失误、原型被意外修改   |

判据收敛成两条：

1. **`new` 的初始化成本高不高？** 不高 → 两个都不用纠结，直接 `new`
2. **差异大不大、参数有没有？** 差异小 + 参数不可得 → 原型；差异大或要按条件选类 → 工厂

### 原型 vs 享元：都「共享」，共享的不是同一个东西

这个辨析留一个钩子给第 09 篇，但这里先把最容易错的一点划清：

|                | 原型链的「共享」                 | 享元模式的「共享」                            |
| -------------- | -------------------------------- | --------------------------------------------- |
| 共享的是什么   | **方法**（无状态的行为）   | **对象实例的内部状态**（有数据）        |
| 为什么可以共享 | 逻辑一样，谁调用都执行同一段代码 | 内部状态不变、可复用                          |
| 例子           | `Circle.prototype.render`      | 虚拟列表里复用的 DOM 节点、共享的样式配置对象 |
| 不共享的部分   | 实例的字段数据（各自一份）       | 外部状态（每次调用时传入）                    |

一句话：**原型链共享「行为」，享元共享「数据」。** 笔记里 `Circle.prototype.render` 属于前者，虚拟列表复用 DOM 节点属于后者——两者形似而神不同，面试里被追问「这不都是共享吗」，就是要考这个区分。

> 💬 **面试官**：原型模式和原型链，你能用一句话说清区别吗？
>
> ✅ 标准答案：原型模式是 GoF 的创建型设计模式，通过复制一个已有实例来创建新对象，目的是跳过昂贵的初始化；原型链是 JavaScript 的语言机制，对象通过 `[[Prototype]]` 向上查找属性和方法，目的是复用共享的方法。前者管「怎么造对象」，后者管「怎么找属性」。
>
> 🎁 加分答案：能补三个层次——① **归类不同**：原型模式属于创建型，原型链根本不属于设计模式，是对象模型机制；② **重叠点明确**：`Object.create(proto)` 是两者物理重叠的地方，它用原型链机制实现了原型模式「以已有对象为样板创建新对象」的意图，但意图重叠不代表概念相同；③ **代价相反**：原型模式多付一份拷贝成本来换初始化成本，原型链则是免费获得方法复用——所以一个是「权衡」，一个是「机制」，这也是为什么原型模式的适用场景这么窄，而原型链无处不在。

---

## 六、前端工程落地：你每天都在克隆

原型模式的隐形程度和它「用得少」的名声完全不匹配——你每天写的代码里，到处都是它的影子。

### `Object.create()`：原型模式的语言级形态

`Object.create(proto)` 是 JS 里最接近「原型模式」原生形态的 API：以 `proto` 为原型创建新对象，不调用任何构造函数。

它在工程里有三种高频用法，目的完全不同：

```typescript
// 用法一：以指定原型创建对象（原型模式的语言级实现）
const template = { drugId: 'A001', dosage: '每次1片' };
const draft = Object.create(template);
draft.dosage = '每次2片';
// draft 自己只有 dosage，drugId 从 template 上「借」过来
// ⚠️ 注意这是「原型链共享」而非「状态复制」——改 template.drugId 会连带影响 draft
```

```typescript
// 用法二：Object.create(null) 做纯净字典（工程上最实用）
const drugMap = Object.create(null);
drugMap['constructor'] = '某个药品 ID';

// 对比：普通对象字面量有原型链
const normalMap = {};
console.log(normalMap['constructor']); // [Function: Object]  ⚠️ 一个"意外"的值
console.log(drugMap['constructor']);   // '某个药品 ID'    ✅ 干净

// 📚 知识点：为什么字典要用 Object.create(null)
// 因为普通对象继承自 Object.prototype，'constructor'、'toString'、'__proto__'
// 这些键名都"天然存在"。如果业务可能用到这些字符串做 key，
// 就会读到原型上的东西而不是 undefined——这类 bug 极难排查
```

```typescript
// 用法三：手写继承（ES5 时代的经典套路，读老代码必须认识）
function Child(name) {
  Parent.call(this, name);   // 继承实例属性
}
Child.prototype = Object.create(Parent.prototype);  // 继承原型方法
Child.prototype.constructor = Child;                // 修复 constructor 指向
// ⚠️ 不要用 Child.prototype = new Parent()：
//    那会调用一次 Parent 构造函数（可能带来副作用），且实例属性被挂到原型上
```

**用法一和用法二的目的完全不同**：一个是用原型链做「样板继承」（贴近原型模式），一个是用 `null` 切断原型链做「纯净数据容器」。名字一样，动机相反——这又是一个「同 API 不同用法」的例子。

### `structuredClone` 的可用性判断与实际写法

```typescript
// 浏览器：Chrome 98+ / Firefox 94+ / Safari 15.4+
// Node.js：17+ 全局可用
const copy = structuredClone(order);
```

判断能不能用，记两条：

- **数据必须可结构化**：纯数据 + 内置可克隆类型（`Date`/`Map`/`Set`/`ArrayBuffer`/`Blob`）→ 可用
- **只要数据里有函数、Symbol、DOM 节点、`WeakMap`** → 直接抛 `DataCloneError`，得退回手写或 lodash

还有一个实战边界要记住：**`structuredClone` 克隆类实例会静默丢失原型**。处理方式是给类自己加 `clone()` 方法（这也正是 GoF 的本意）：

```typescript
class PrescriptionTemplate {
  constructor(public drugId: string, public warnings: string[]) {}

  clone(): PrescriptionTemplate {
    // 👈 用 structuredClone 处理数据部分，再用构造恢复类型
    const plain = structuredClone({ drugId: this.drugId, warnings: this.warnings });
    return new PrescriptionTemplate(plain.drugId, plain.warnings);
  }
}
```

### 实例派生：`axios.create` 的克隆语义

```typescript
const http = axios.create({ baseURL: '/api', timeout: 5000 });

// 基于已有实例派生一个「子实例」：继承原有配置，只覆盖差异
const uploadHttp = http.create({ timeout: 60000 });

// ⚠️ 注意：拦截器不会跟着继承——新实例的拦截器是全新的一套
uploadHttp.interceptors.request.use(addAuthHeader); // 要自己再装一遍
```

`axios.create` 的语义和原型模式高度一致：**先复制一份现有实例的配置（深合并 `defaults`），再覆盖差异字段，产出一个新实例**。它不需要你重新传 `baseURL`——这份「初始化成本」已经被第一个实例付过了。

翻一下源码会更清楚，`instance.create` 的实现只有一行：

```javascript
// axios v1.x，lib/axios.js
instance.create = function create(instanceConfig) {
  return createInstance(mergeConfig(defaultConfig, instanceConfig));
};
// createInstance 内部会 new Axios(合并后的配置)，而 Axios 构造函数里
// this.interceptors = { request: new InterceptorManager(), ... }
// 👆 每次都新建——所以拦截器不继承，配置才继承
```

这个细节特别好，因为它把第四节最后那个问题的答案在真实源码里演了一遍：**「哪些字段复制、哪些字段重建」，是由原型自己（`Axios` 构造函数）决定的，不是由外层某个通用 `deepClone` 决定的。** 配置对象该合并（`mergeConfig`），拦截器管理器该新建（`new InterceptorManager()`）——`axios` 用一个构造函数就把这个领域判断固化了，和你给 `Prescription` 写 `clone()` 是同一件事。

🔧 **真实场景**：一个医疗后台里同时有「普通接口」和「上传接口」两种请求需求：前者 5 秒超时，后者因为要传影像文件需要 60 秒。最初的写法是每次上传单独写 `axios.post(url, formData, { timeout: 60000 })`——超时值散落在十几个调用点，改一次要全局搜索。改成 `http.create({ timeout: 60000 })` 派生一个 `uploadHttp` 之后，超时和 `baseURL` 都只有一个来源，改的时候不用全局搜；拦截器因为不继承，反而成了一件好事——上传接口不需要那套业务解密的响应拦截器，正好省得一个一个 `eject`。**这就是「以现有实例为样板派生新实例」在工程上的价值：共性自动传递，差异各自独立。**

### 不可变数据：快照、撤销栈与 copy-on-write

前端有三处高频「克隆」场景，都属于原型模式思想的应用：

```typescript
// 场景一：编辑器的撤销栈——每一步存一份快照
class History<T> {
  private stack: T[] = [];
  push(snapshot: T) { this.stack.push(structuredClone(snapshot)); }
  undo(): T | undefined { return this.stack.pop(); }
}
```

```typescript
// 场景二：表单草稿——进入编辑态复制一份，取消时丢弃
function openEditor(record: MedicalRecord) {
  const draft = structuredClone(record);  // 原记录不动，改的是草稿
  // ...用户编辑 draft
  // 取消 → 什么都不做；保存 → Object.assign(record, draft)
}
```

**场景三：Immer 的 copy-on-write** —— 这里要做一个诚实的辨析。Immer 的 `produce` 让「看起来直接改原对象」的写法产出不可变数据，底层是**按需克隆**：只有被修改的路径上的节点会被复制，没动的节点保持原引用共享。

```typescript
const next = produce(state, draft => {
  draft.prescriptions[0].dosage = '每次2片';
});
// 只有 root → prescriptions → [0] 这条路径上的节点被复制
// 其余兄弟节点、深层未改动的数组元素全部共享引用
```

这个「以旧对象为样板，只复制需要变化的部分」的思想，和原型模式一脉相承；但它不是严格的 GoF 实现——GoF 原型模式是「整体克隆一个原型」，Immer 是「路径级细粒度克隆 + 结构共享」。**面试里说「Immer 借鉴了原型模式/写时复制思想」是准确的，说「Immer 就是原型模式」会露怯。**

### 一条落地建议：`clone()` 写在原型身上，不写在工具函数里

这是第四节最后那个问题的工程版答案，也是整篇最实用的一条建议：

```typescript
// ❌ 外部工具：只能靠反射猜
function clonePrescription(p: Prescription): Prescription {
  return deepClone(p);  // 哪些字段该深拷？不知道
}

// ✅ 原型自己：靠领域知识决定
class Prescription {
  clone(): Prescription {
    return new Prescription(
      this.drugId,                        // 原始类型，直接传
      [...this.warnings],                 // 数组，新建
      SHARED_DOSAGE_TEMPLATE,             // 全系统共享的只读常量，故意不拷
      this.signature                      // 函数，共享
    );
  }
}
```

差别在这里：

|          | 外部 `deepClone(target)`    | 对象自己的 `clone()`                       |
| -------- | ----------------------------- | -------------------------------------------- |
| 依据     | 反射猜结构                    | 领域知识                                     |
| 共享常量 | 被误深拷（浪费内存）          | 明确共享                                     |
| 函数字段 | 拷不了，静默丢失              | 明确共享                                     |
| 新增字段 | 自动跟随（因为是递归）        | 需要同步改 `clone()`（**这是代价**） |
| 适合     | 纯数据结构（配置、DTO、快照） | 有业务语义的领域对象                         |

**取舍很清楚**：纯数据用 `structuredClone` 就够，领域对象自己写 `clone()`。后者的代价是「加字段时要记得改 `clone()`」——但这个代价换来的是「每一处共享/拷贝都是明确的」，出问题时你能一眼看出是故意的还是漏了。

> 💬 **面试官**：你项目里有哪些地方用到了克隆？举一个真实的例子。
>
> ✅ 标准答案：讲一个「有原因 → 有方案 → 有收益」的链条。比如：医疗后台里普通接口 5 秒超时、影像上传接口要 60 秒，最初的写法是在每个上传调用点单独传 `{ timeout: 60000 }`，超时值散落在十几处。后来改成基于已有的 axios 实例 `http.create({ timeout: 60000 })` 派生出 `uploadHttp`——`baseURL` 这份配置自动继承下来，超时配置只有一个来源，改的时候不用全局搜。这背后就是原型模式「以现有实例为样板派生新实例」的思路。
>
> 🎁 加分答案：能补一句「选择合适的克隆方式」的判断——「纯数据结构我用 `structuredClone`，因为有循环引用和 `Date` 也不会出错；有业务语义的领域对象我会给它写 `clone()` 方法，因为只有它自己知道哪些字段该深拷、哪些是刻意共享的只读常量」。再加一句风险提示：克隆最大的坑不是性能，是**浅拷贝导致的状态串改**——两个对象共享一个嵌套数组，改一个影响另一个，而且往往在两小时后才在另一个页面上暴露出来。

---

## 七、面试高频问

前面每节末尾已经给了十几组问答，这一节把最核心的五道整理成可直接背的版本。

### 核心题一：JavaScript 的原型链和 GoF 原型模式是同一件事吗

**✅ 标准答案**：不是同一件事，虽然名字相同。

- **原型模式**是 GoF 的创建型设计模式，意图是「通过复制一个已有实例来创建新对象」，目的是跳过昂贵的初始化过程。它优化的是**对象创建的成本**。
- **原型链**是 JavaScript 的语言机制，对象通过内部的 `[[Prototype]]` 指针向上查找属性和方法，实现继承和共享。它优化的是**方法复用的成本**（内存层面）。

两者唯一的物理重叠点是 `Object.create(proto)`——它利用原型链机制实现了原型模式「以已有对象为样板创建新对象」的意图。但「用某种机制实现某个模式」不等于「模式就是那个机制」。

**🎁 加分答案**：补充一个最容易被误判的例子——「方法写在构造函数里」vs「方法写在 `prototype` 上」，`p1.getName === p2.getName` 从 `false` 变成 `true`。很多人把这个当成原型模式的例子，但它全程没有任何对象被克隆，演示的是原型链的方法共享。**判断标准是「有没有复制这个动作」，不是「有没有出现 prototype 这个词」。**

### 核心题二：`Object.assign` 是浅克隆还是深克隆？有什么坑

**✅ 标准答案**：浅克隆。它只复制目标对象的**自有可枚举属性**，值为对象时复制的是引用，改嵌套结构会影响源对象。

四个常见的坑：

1. **不拷贝原型链上的属性** → 克隆出来的对象丢失原型方法，`instanceof` 也会失败
2. **访问器属性会被求值** → getter 变成普通数据属性，getter/setter 本身都丢失
3. **不可枚举属性不参与拷贝** → `Object.defineProperty` 定义的不可枚举字段全部丢失
4. **`null`/`undefined` 源会被静默跳过** → 不报错，容易掩盖上游数据为空的问题

**🎁 加分答案**：能补两点——① 展开运算符 `{...obj}` 和 `Object.assign` 语义几乎一致，唯一实质区别是 `Object.assign` 会触发目标对象的 setter，展开运算符不会；② 浅拷贝不是「劣于深拷贝」，React 的 state 更新恰恰依赖浅拷贝（`setState({...state, a: 1})`），因为 React 靠引用变化判断重渲染，深拷贝会让 `===` 永远为假，反而每次都重渲染。

### 核心题三：手写一个深拷贝，怎么处理循环引用？为什么用 `WeakMap`

**✅ 标准答案**：三层——(1) 基础递归：判原始类型直接返回，数组/对象分别建容器，用 `hasOwnProperty` 过滤原型链属性；(2) 补内置类型分支：`Date` 用 `new Date(d.getTime())`、`RegExp` 重建、`Map`/`Set` 遍历递归，用 `Object.prototype.toString.call()` 判类型比 `instanceof` 可靠；(3) 循环引用：传一个 `WeakMap` 缓存，「原对象 → 克隆体」的映射，**在递归子属性之前**先把当前克隆体放进缓存。

关键顺序：`cache.set` 必须写在递归之前，否则遇到自引用会无限递归直到栈溢出。

为什么用 `WeakMap` 而不是 `Map`：深拷贝的缓存是**一次性临时映射**，拷贝结束就失效。`Map` 对键是强引用，会扣住所有原对象和克隆体直到它自己被回收；`WeakMap` 是弱引用，不延长任何对象的生命周期，函数结束就能被 GC。

**🎁 加分答案**：能主动说出「手写深拷贝在工程上其实很少用」——除非有特殊需求（如要自定义某些类型的克隆规则），否则 `structuredClone` 或 `lodash.cloneDeep` 更可靠。手写深拷贝的真正价值是**证明你理解类型系统、引用与递归**，而这恰恰是面试官想验证的东西。再补一句：`Reflect.ownKeys` 比 `for...in` 完整，因为它包含 Symbol 键和不可枚举键。

### 核心题四：`structuredClone` 相比 JSON 法强在哪？有什么克隆不了的东西

**✅ 标准答案**：

JSON 法的六个坑：`undefined` 键消失、`Date` 变字符串、`RegExp`/`Map`/`Set` 变空对象、`NaN`/`Infinity` 变 `null`、循环引用直接抛错、Symbol 键与不可枚举属性丢失。

`structuredClone` 全部解决：支持循环引用并保留引用关系，正确克隆 `Date`/`RegExp`/`Map`/`Set`/`ArrayBuffer`/`TypedArray`/`Blob`/`File`/`ImageData`，浏览器原生实现，不需要手动递归。

它不能克隆的：**函数**、**Symbol**、**DOM 节点**、**`WeakMap`/`WeakSet`** 会直接抛 `DataCloneError`；**类实例**更隐蔽——不抛错，但**退化为普通对象，原型方法全部丢失**；**getter 会被求值后固化成普通数据属性**。

**🎁 加分答案**：能补一句「用 `structuredClone` 处理类实例的正确姿势」——先 `structuredClone` 出纯数据部分，再用 `new` 恢复类型，而不是指望它保住原型。再加一句可用性判断：浏览器 Chrome 98+ / Safari 15.4+ / Node 17+，如果还要支持更老的运行时，得用 `core-js` 的 polyfill 或者退回手写。

### 核心题五：什么场景下原型模式比工厂模式更合适

**✅ 标准答案**：三个条件同时成立时：

1. **构造初始化成本高**——构造函数里有 IO、复杂规则计算、配置解析、远程校验
2. **实例之间差异小**——大部分状态完全一致，只有少数字段不同
3. **构造参数不可得或很难拿全**——比如原型是服务端下发的配置对象，或者要基于「上一个实例」派生

第三条是原型模式的**不可替代优势**：工厂必须知道「要实例化哪个类」和「构造它需要哪些参数」，而原型只需要手里有一个现成的实例。另外，如果产品的具体类型需要在运行时动态加入，原型注册表比工厂子类更符合开闭原则——新增类型只是注册一行。

**🎁 加分答案**：能主动补一句反向判断——「如果初始化成本其实很低，原型模式是负收益：多一次深拷贝开销，还多一个『深拷还是浅拷』的决策负担」。这个判断比背定义值钱得多，因为它说明你是在真实约束下做选择，而不是拿锤子找钉子。

---

## 💡 一张图总结（面试速记表）

| 要点                         | 一句话内核                                               | 考察频率    |
| ---------------------------- | -------------------------------------------------------- | ----------- |
| 原型模式意图                 | 复制已有实例，跳过昂贵的初始化                           | ⭐⭐⭐ 必考 |
| **原型链 vs 原型模式** | **前者共享方法（管查找），后者复制实例（管创建）** | ⭐⭐⭐ 必考 |
| 浅 vs 深克隆                 | 浅拷贝只复制第一层引用，嵌套对象仍共享                   | ⭐⭐⭐ 必考 |
| `Object.assign`            | 浅拷贝；不拷原型、getter 被求值、不可枚举丢失            | ⭐⭐⭐ 必考 |
| `structuredClone` 边界     | 函数/Symbol/DOM 抛错；类实例静默丢原型                   | ⭐⭐⭐ 必考 |
| 深拷贝循环引用               | `WeakMap` 缓存，且必须在递归之前 `set`               | ⭐⭐⭐ 必考 |
| `new` 的四个步骤           | 建空对象 → 挂 `__proto__` → 执行构造函数 → 定返回值 | ⭐⭐⭐ 必考 |
| `instanceof` 原理          | 沿着 `A.__proto__` 找，看能否命中 `B.prototype`      | ⭐⭐ 高频   |
| 原型链终点                   | `Object.prototype.__proto__ === null`                  | ⭐⭐ 高频   |
| 原型 vs 工厂                 | 工厂知类型与参数，原型只需一个样板实例                   | ⭐⭐ 高频   |
| 原型 vs 享元（第 09 篇）     | 原型链共享行为，享元共享数据                             | ⭐ 中频     |

> 💡 记住这条主线：**原型模式优化的是「创建的成本」，原型链优化的是「方法复用的成本」。** 一个问「这个对象怎么来的」，一个问「这个方法从哪找到的」——把这两个问题分开，那道考了二十年的辨析题就永远不再是问题。

---

## 📝 留个问题

打开你手头项目里任意一个「每次都在 `new`、但每次差异都很小」的对象——比如一个请求配置、一个表单初值、一个报表参数对象——问自己三个问题：

1. 它的构造函数里，有多少成本是每次都白付的？
2. 有哪些字段是「全系统共享的只读常量」，我却在每个实例里各存了一份？
3. 如果给它加一个 `clone()`，哪些字段该深拷、哪些该共享？

第三问最有价值。因为大部分「浅拷贝串改」的线上事故，都不是因为不知道要深拷，而是因为**从来没在写代码的那一刻问过「这个字段共享安不安全」**。把这个问题在评论区写下来，我们一起看看有多少人的答案是「我从来没想过」👇

---

## 参考资料

- 《设计模式：可复用面向对象软件的基础》 Erich Gamma 等四人组著，1994（GoF 原型模式的权威出处）
- 《JavaScript 设计模式与开发实践》 曾探 著（原型模式在前端场景的经典讲解）
- 《JavaScript 高级程序设计》 第 4 版，第 8 章「对象、类与面向对象编程」（原型链最系统的中文讲解）
- 《UML 精粹》 Martin Fowler 著（类图关系与模式标注）
- MDN Web Docs：`Object.create`、`Object.assign`、`structuredClone`、`Object.getPrototypeOf`、`instanceof`、继承与原型链
- ECMAScript 规范：`[[Prototype]]` 内部槽、`OrdinaryCreateFromConstructor`、结构化克隆算法

> 推荐搜索关键词：「原型模式 原型链 区别」「JavaScript 原型链 完整图解」「new 运算符 四个步骤 手写实现」「instanceof 原理 手写实现」「手写深拷贝 循环引用 WeakMap」「structuredClone 兼容性 DataCloneError」「Object.create null 用途」「浅拷贝 深拷贝 区别 Object.assign 坑」「axios create 源码 配置合并」「Immer produce copy-on-write 原理」。

---

> 🔖 这是「前端设计模式」系列第 05 篇。上一篇：《工厂与建造者模式：创建哪种对象 vs 怎么组装对象（面试收藏级）》；下一篇预告：《适配器与外观模式：包一层，改接口还是简调用（面试收藏级）》
