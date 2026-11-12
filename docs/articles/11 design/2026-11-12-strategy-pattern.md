# 策略模式：从表单校验到 Hook 封装的算法替换术（面试收藏级）

> **副标题**：把「算法」封装成可互换的对象，让调用方不知道也不关心用的是哪一种

面试官问：「你项目里哪儿用了设计模式？」你说：「我们把一堆 if-else 重构成了策略模式。」他点点头，追问了一句：「那 if 去哪了？」你卡住了——重构完之后，代码里明明还有一行 `strategies[type]`，这算不算 if 还在？这一问问倒的人，比「讲一下策略模式」问倒的人多得多。因为大多数人学策略模式，学的是「把 if-else 换成 Map」这个手法，却没学过这句话：**策略模式不消灭 if，它把「选哪个算法」的判断，从调用方的每个分支，收敛到注册表这一处映射——从此新增算法只加一行注册，调用方一行不改。** 这篇文章就沿着这条主线，把策略模式从表单校验讲到 Hook 封装，从 GoF 类图讲到「什么时候不该用它」。

---

## 🎯 这篇文章解决什么问题

读完这篇，你应该能做到四件事：

- 一句话说清策略模式和 if-else 的本质区别，并扛得住「那 if 去哪了」这句追问。
- 手写三种形态的策略实现：class 版、函数注册表版、类型安全版，并说清各自适用场景。
- 在 React 里落地策略模式：策略作为参数注入 Hook，运行时可切换、可独立测试。
- 辨清四组边界：策略 vs if-else、策略 vs 状态、策略 vs 职责链、策略 vs 命令，并知道什么时候**不该**用。

全篇主线就一句：**同一功能、多种算法、算法还会增——把「会变的部分」封装成可互换的对象，让调用方只面向契约编程。** 抓住这一句，策略模式的所有面试题就都有了同一个答案。

---

## 一、场景切入：两个医疗信号，同一个病根

先看两个你大概率写过的业务，它们表面毫不相干，病根却是同一个。

**场景一：药品搜索排序。** 医疗平台的药品搜索页，支持按「价格升序」「销量降序」「综合评分」「距离」四种方式排序。最直觉的写法：

```typescript
function sortDrugs(drugs: Drug[], type: string): Drug[] {
  if (type === 'price') {
    return [...drugs].sort((a, b) => a.price - b.price);
  } else if (type === 'sales') {
    return [...drugs].sort((a, b) => b.sales - a.sales);
  } else if (type === 'rating') {
    return [...drugs].sort((a, b) => b.rating - a.rating);
  } else {
    return [...drugs].sort((a, b) => a.distance - b.distance);
  }
}
```

写的时候没觉得有什么问题。三个月后，产品加了「按医保报销比例排序」，半年后又加了「按复购率排序」——每一次，你都要**重新打开这个函数**，在 if-else 链上再插一段。改一次，回归测试一次。更要命的是，这个函数被三个页面共用，你改的是「大家共用的主干道」。

**场景二：处方表单校验。** 医疗系统里，普通处方、精神类处方、麻醉处方的校验规则完全不同：普通处方只要求编号非空，精神类处方编号必须符合管制药品编码规范，麻醉处方编号有专门的位数要求。最直觉的写法，是在表单组件的校验函数里堆 if-else：

```typescript
function validateCode(type: string, value: string): string | null {
  if (type === 'normal') {
    return value.trim() ? null : '编号不能为空';
  } else if (type === 'controlled') {
    return /^[A-Z]{2}\d{6}$/.test(value) ? null : '编号不符合管制药品规范';
  } else {
    return value.length >= 20 ? null : '麻醉药品处方编号不足20位';
  }
}
```

这个函数有三个致命伤：**它混在表单组件里，跟 UI 代码长在一起，没法单独测试**；每次新增处方类型要改表单组件；改「麻醉处方」的规则，得重新验证「普通处方」没被改坏。

两个场景，病根是同一句话：**同一功能、多种算法、算法还会增。** 这三个条件同时成立，就是策略模式的主场。注意缺一不可——如果算法永远只有一种，直接写就行；如果算法稳定就两三种且不再增，if-else 反而更直观。策略模式解决的从来不是「有多个分支」，而是「分支还在长」。

🔧 **真实场景**：药品电商的搜索排序，是策略模式最典型的落地点——排序维度跟着运营策略走，一个季度加两三种是常态。如果每加一种排序都要动搜索主流程，风险和收益完全不成比例；改成策略注册表之后，新增排序维度就是「加一个函数、注册一行」，搜索主流程半年没动过。

> 💬 **面试官**：什么信号出现时，你会想到用策略模式？
> ✅ 标准答案：同一个功能存在多种并列的算法实现（多种排序、多种校验规则、多种支付方式），且调用方只关心结果、不关心用的是哪一种，并且可以预期算法种类还会增加。此时把每种算法封装成实现同一契约的可替换对象，调用方只面向契约编程。
> 🎁 加分答案：能主动补上「什么信号不该用」——如果分支只有两三个且稳定，或者算法之间需要共享大量状态，if-else 或状态模式反而更合适。能说出「什么时候不用」，比背出「什么时候用」更能体现工程判断。

---

## 二、意图与本质：把「会变的部分」封装成可互换的对象

### GoF 的原始定义

GoF《设计模式》对策略模式的意图描述是：**定义一系列算法，将每一个封装起来，并使它们可以相互替换。策略模式让算法独立于使用它的客户而变化。**

拆开这句话，有三个关键词：

- **一系列**：不是一种算法，是一个家族。策略模式天然面向「多」。
- **封装**：每种算法被包进一个独立的实现里，外界拿到的是一个「实现了契约的对象」，看不到内部逻辑。
- **相互替换**：这是灵魂。替换的前提是所有策略遵守同一契约（同样的入参、同样的出参），所以换一个策略，调用方的代码不用改一个字。

它解决的核心矛盾是：**「同一功能有多种算法」和「切换、新增算法不能改调用方」之间的张力。** 用 if-else，这两个需求天然打架——新算法必然要往函数里插分支；用策略模式，算法家族和调用方之间隔了一层契约，家族里随便增删，调用方无感。

### 它是 DIP 和 OCP 的直接落地

策略模式是第 2 篇 SOLID 那两组原则最典型的落地现场：

- **OCP（开闭原则）**：新增一种排序，只需要新写一个策略对象并注册，`sortDrugs` 主流程一行不改——对扩展开放、对修改关闭。
- **DIP（依赖倒置原则）**：调用方不再依赖「价格排序的具体实现」，而是依赖「排序策略」这个抽象——高层和低层共同依赖抽象，谁也不依赖谁的具体。

### 回到开头那个追问：if 去哪了

现在可以正面回答面试官的「那 if 去哪了」了：

**if 没有消失，也不可能消失——「用户选了哪种排序」这个事实总得有个地方被翻译成「执行哪个算法」。策略模式做的，是把这个判断从「散落在调用逻辑里的 if-else 链」变成「注册表里的一次查表」：`strategies[type]`。区别在哪？if-else 每加一个分支都要**修改已有函数**，注册表每加一个策略只是**新增一条数据**。改代码要重新测试、可能引入回归；加数据对既有逻辑零影响。这就是「对扩展开放、对修改关闭」在代码层面的样子。**

一句话总结本节：**策略模式不是消灭变化的工具，而是把变化圈禁起来的工具——变化被圈进一个个独立的策略对象里，注册表是唯一的围栏入口。**

> 💬 **面试官**：用 if-else 实现多种算法和用策略模式实现，本质区别是什么？
> ✅ 标准答案：if-else 把「选算法的判断」和「算法的实现」耦在同一个函数里，新增算法必须修改这个函数，违反开闭原则；策略模式把每种算法封装成实现同一契约的可替换对象，「选择」收敛为注册表一次查表，新增算法只加策略不改调用方。
> 🎁 加分答案：能点出「if 并没有消失，而是被收敛」——`strategies[type]` 本质仍是一次分发，只是分发依据从「代码结构」变成了「数据结构」。判断逻辑从代码移到数据，才是「对扩展开放」的机制本质；顺带能说出「两三个稳定分支不值得上策略模式」的边界，说明你不是拿着锤子找钉子。

---

## 三、结构与角色：Context 持有策略，委托执行

### 标准结构图

策略模式的标准结构长这样：

![策略模式标准结构图](https://refactoring.guru/images/patterns/diagrams/strategy/structure.png)

图注：这张图是策略模式的标准结构——Context 持有一个 Strategy 引用，自己的 `doAlgorithm()` 只做委托；ConcreteStrategyA 和 ConcreteStrategyB 各自实现 `doAlgorithm()`，两者对 Context 完全可互换。Context 与具体策略之间只隔着 Strategy 接口这一层契约。

三个角色：

- **Strategy（策略接口）**：定义所有算法的公共契约——同样的入参、同样的出参。它是「可互换」的法律基础。
- **ConcreteStrategy（具体策略）**：每种算法的一个实现，只干一件事：把这种算法算对。
- **Context（上下文）**：持有策略引用，把请求委托给策略执行。它自己不含任何算法逻辑。

病根和药方的对照图，refactoring.guru 画得最直白。先看病灶——if-else 版本里，Context（比如 NavContext）自己长出了一堆分支：

![if-else 堆分支的问题图](https://refactoring.guru/images/patterns/diagrams/strategy/problem.png)

图注：这张图画的是问题形态——Context 内部用条件分支逐个判断要走哪种行为（走路、公交、自行车……），每新增一种行为都要回到 Context 里改代码，各种交通逻辑和判断逻辑全部长在一起。

再看药方——分支拆掉，行为变成一个个可替换的策略对象：

![策略模式的解法图](https://refactoring.guru/images/patterns/diagrams/strategy/solution.png)

图注：这张图画的是解法形态——同一功能的各种行为被封装成独立的策略类（汽车、公交、步行、自行车），Context 只持有一个策略引用并委托执行，切换路线策略时换掉引用即可，Context 自身不再感知任何具体算法。

### 笔记里的类图：Customer 与 Kind

笔记里用「客户折扣」这个例子画了类图：

![策略模式类图：Customer 与 Kind](https://cdn.nlark.com/yuque/0/2021/png/738210/1639313302291-a338ba4b-44e5-426c-92e8-65586dfaf16a.png)

图注：这张图里 `Customer` 是 Context，持有 `kind: Kind` 引用，对外提供 `discount(amount)`；`Kind` 是策略抽象（声明 `discount(amount)` 契约），`Normal`、`VIP`、`Member` 是三个具体策略，各自实现折扣算法。`Customer` 只认识 `Kind`，不认识任何一个具体策略——这就是「面向契约编程」。

### JavaScript 一等函数下的简化：函数即策略对象

GoF 写这本书时，策略必须封装成类，因为 C++ 和早期 Java 的函数不是一等公民，没法「被传来传去」。但 JavaScript 里函数就是对象——这一下把策略模式的实现成本打到地板上：

- **一个函数就是一个策略**：签名 `(data: T) => R` 就是契约，函数体就是算法。
- **一张 `Map` / `Record` 就是注册表**：`Map<string, (data: T) => R>`，key 是策略名，value 是策略本身。
- **Context 经常退化成一个函数**：既然策略可以直接当参数传，很多场景里不需要一个持有状态的 Context 类，一个 `validate(type, value)` 的函数就够了。

```typescript
// 函数式策略注册表：函数即策略，Record 即注册表
type ValidateStrategy = (value: string) => string | null;
const validators: Record<string, ValidateStrategy> = { /* 策略们 */ };
function validate(type: string, value: string) {
  return validators[type]?.(value) ?? null; // 👈 Context 退化成一个查表函数
}
```

所以「JavaScript 里不用 class 怎么实现策略模式」这道面试题的答案就是：**一等函数天然就是策略对象，对象字面量 / Map 天然就是策略注册表——class 版有的三角色，函数版一个不少，只是全部退化成了值。**

> 💬 **面试官**：Context 这个角色在策略模式里是必须的吗？为什么前端代码里经常看不到它？
> ✅ 标准答案：Context 的职责是「持有策略引用并委托执行」。它是否需要独立存在，取决于有没有「状态要被持有」。前端大量场景里策略是按次传入、用完即弃的，此时 Context 退化成一个普通函数，策略是它的参数——角色还在，只是没有独立形态。
> 🎁 加分答案：能补上「什么时候 Context 必须显式存在」——当策略需要在运行时被反复切换（比如排序器组件记住用户当前选的排序方式），或者多个方法要共享同一个策略引用时，就需要一个持有状态的 Context（React 里往往就是一个 Hook 或组件内部 state）。

---

## 四、核心实现：从 if-else 到策略注册表

现在把笔记里的完整演进过程走一遍。例子是「客户折扣」：普通客户不打折、会员 9 折、VIP 8 折。

### 病灶：不采用设计模式的 if-else 版

```typescript
class Customer {
  public kind: any;
  constructor(kind: any) {
    this.kind = kind;
  }
  discount(amount: number) {
    if(this.kind == 'member') {
      return amount * .9;
    } else if(this.kind == 'vip') {
      return amount * .8;
    } else {
      return amount;
    }
  }
}

const customer = new Customer('normal');
console.log(customer.discount(100));
const customer2 = new Customer('member');
console.log(customer2.discount(100));
const customer3 = new Customer('vip');
console.log(customer3.discount(100));
```

这段代码的问题不在「写错了」，而在「长歪了」：折扣算法、类型判断、金额计算全部长在 `discount` 一个方法里。想加「黑卡客户 7 折」，就得回来改这个方法；改的时候，「member」和「vip」两条既有路径都在回归范围内。

### 方式一：类版策略，抽象 Kind 定义契约

```typescript
abstract class Kind {
  abstract discount(amount: number): number;
}

class Normal extends Kind {
  discount(amount: number): number {
    return amount;
  }
}
class Member extends Kind {
  discount(amount: number): number {
    return amount * .9;
  }
}
class VIP extends Kind {
  discount(amount: number): number {
    return amount * .8;
  }
}

class Customer {
  public kind: Kind;
  constructor(kind: Kind) {
    this.kind = kind;
  }
  discount(amount: number) {
    return this.kind.discount(amount);
  }
}

const customer = new Customer(new Normal);
console.log(customer.discount(100));
customer.kind = new Member;
console.log(customer.discount(100));
customer.kind = new VIP;
console.log(customer.discount(100));
```

对照类图逐个认角色：`Kind` 是 Strategy（契约），`Normal` / `Member` / `VIP` 是 ConcreteStrategy（算法），`Customer` 是 Context（持有 `kind: Kind`，委托执行）。

注意最后三行用法——`customer.kind = new Member` 直接换策略对象，`Customer` 的代码一个字没动，折扣立刻变了。**这就是「可互换」的可执行证明。**

类版的优势在于策略有状态、有生命周期管理需求时（比如某个策略要维护自己的缓存或配置）依然成立；劣势是仪式感重——一个算法要开一个类。在 JavaScript 里，下面这种函数版是更日常的写法。

### 方式二：函数注册表版——策略模式的 JS 母语形态

```typescript
class Customer {
  public kinds: Record<string, any>;
  constructor(kinds: Record<string, any> = {}) {
    const defaultKinds = {
      normal(amount: number): number {
        return amount;
      },
      member(amount: number): number {
        return amount * .9;
      },
      vip(amount: number): number {
        return amount * .8;
      }
    }
    this.kinds = Object.assign(defaultKinds, kinds);
  }
  discount(kind: string, amount: number) {
    return this.kinds[kind](amount);
  }
}

const kinds = {
  superVip(amount: number): number {
    return amount * .7;
  }
}
const customer = new Customer(kinds);
console.log(customer.discount('normal', 100));
console.log(customer.discount('member', 100));
console.log(customer.discount('vip', 100));
console.log(customer.discount('superVip', 100));
```

这版把「策略注册表」直接做成了主角：三个内置策略是默认注册项，调用方还能通过构造参数**追加**自己的策略（`superVip` 7 折）——`Customer` 类不知道 superVip 的存在，但照样能执行它。新增算法，「增」的对象是数据（传进去的对象），不是代码（改类内部）。

细看 `Object.assign(defaultKinds, kinds)` 这行：它把调用方传入的 `kinds` 合并进 `defaultKinds`——同名键会覆盖默认策略，新键追加。两个工程细节值得说：一是 `defaultKinds` 是构造函数里的局部对象，每次 `new Customer` 都重新创建，所以一个实例的定制策略不会泄漏到另一个实例；二是这个写法会**原地修改** `defaultKinds`，虽然此处无副作用，但更稳的写法是不变更源对象：`this.kinds = { ...defaultKinds, ...kinds }`——语义相同，且不会让任何一个源对象被悄悄改掉。

### 医疗完整版：处方校验策略注册表

把同一套结构搬到处方校验场景——这就是第一节场景二的重构结果：

```typescript
// 校验策略注册表（函数式版）
type ValidateStrategy = (value: string) => string | null;
const prescriptionValidators: Record<string, ValidateStrategy> = {
  normal: (v) => v.trim() ? null : '不能为空',
  controlled: (v) => /^[A-Z]{2}\d{6}$/.test(v) ? null : '格式不符合管制药品规范',
  anesthetic: (v) => v.length >= 20 ? null : '麻醉药品处方编号不足20位',
};
function validate(type: string, value: string) {
  return prescriptionValidators[type]?.(value) ?? null;
}
```

注意两个细节。第一，策略的返回值约定统一为 `string | null`——`null` 表示通过，非空字符串是错误文案。**契约统一，策略才可互换**；如果有的策略返回 boolean、有的返回错误信息，这张表就拼不起来。第二，`?.` + `?? null` 兜住了传入未知 type 的情况，不会抛 `undefined is not a function`。

但这个版本有个隐患：`type` 是 `string`，调用方手滑传了 `'anestheitc'`（拼错了），运行时不报错、静默返回 `null`（通过）——**处方校验里「静默通过」是最危险的失败方式**。用 `keyof` 把注册表的键收窄成字面量联合类型，这个错误就变成编译期错误：

```typescript
// keyof 类型安全版：非法 type 直接编译报错
type PrescriptionType = 'normal' | 'controlled' | 'anesthetic';
const prescriptionValidators: Record<PrescriptionType, ValidateStrategy> = {
  normal: (v) => v.trim() ? null : '不能为空',
  controlled: (v) => /^[A-Z]{2}\d{6}$/.test(v) ? null : '格式不符合管制药品规范',
  anesthetic: (v) => v.length >= 20 ? null : '麻醉药品处方编号不足20位',
};
function validate(type: PrescriptionType, value: string) {
  return prescriptionValidators[type](value); // 👈 不再需要 ?. 兜底
}
```

`Record<PrescriptionType, ...>` 同时锁住了两头：注册表里**少注册**一个类型，编译不过（对象字面量缺键）；调用方**传错**一个类型，也编译不过。注册表本身成了类型的唯一事实来源——新增处方类型时，TS 会逼着你把策略补齐。这是「查漏补缺」里最值得补的一块：**函数式策略注册表请一律配 keyof 收窄，让「漏注册」和「传错键」都死在编译期。**

### 独立可测：策略模式的隐藏红利

回看场景二的第二个痛点「规则混在表单组件里没法单独测」。策略化之后，每条规则都是一个纯函数——测试不需要渲染组件、不需要 mock 表单：

```typescript
// 每条策略独立测试，互不牵连
test('麻醉处方编号不足20位应报错', () => {
  expect(prescriptionValidators.anesthetic('AB12345')).toBe('麻醉药品处方编号不足20位');
});
test('管制处方编号符合规范应通过', () => {
  expect(prescriptionValidators.controlled('AB123456')).toBeNull();
});
```

普通、管制、麻醉三种处方的规则各自一个测试文件，改麻醉规则的测试，不用碰另外两组——**策略模式在动手之前就替你把测试的边界画好了**。

> 💬 **面试官**：JavaScript 里不用 class 怎么实现策略模式？
> ✅ 标准答案：利用函数是一等公民——一个函数就是一个策略（签名即契约），一个对象字面量或 Map 就是策略注册表（`Record<string, (data) => R>`），原来 Context 的角色退化成一个「查表并调用」的函数，策略通过参数传入。
> 🎁 加分答案：能补两层工程细节——① 注册表的键用字面量联合类型收窄（`Record<'normal' | 'controlled' | ..., ...>`），漏注册、传错键都在编译期报错；② 策略返回值契约要统一（比如统一 `string | null`），契约不统一注册表就拼不起来，这是函数式实现里最容易烂掉的地方。

---

## 五、Hook 封装：把策略注入 React

副标题里承诺了「Hook 封装」，这一节兑现。React 组件里的策略模式有两个落点：**策略作为 Hook 参数注入**（`useSortable`），和**策略表驱动整个表单**（`usePrescriptionForm`）。

### useSortable：排序策略注入 Hook

药品搜索页的排序，用 Hook 封装后长这样：

```typescript
import { useMemo, useState } from 'react';

type SortStrategy<T> = (a: T, b: T) => number;

function useSortable<T>(items: T[], initialStrategy: SortStrategy<T>) {
  const [strategy, setStrategy] = useState<SortStrategy<T>>(initialStrategy);
  // 👈 useMemo 依赖策略引用：换策略才重排，换别的 state 不重排
  const sorted = useMemo(() => [...items].sort(strategy), [items, strategy]);
  return { sorted, setStrategy };
}
```

组件里的用法：

```typescript
// 排序策略注册表：新增一种排序 = 加一行
const sortStrategies: Record<SortKey, SortStrategy<Drug>> = {
  price: (a, b) => a.price - b.price,
  sales: (a, b) => b.sales - a.sales,
  rating: (a, b) => b.rating - a.rating,
  distance: (a, b) => a.distance - b.distance,
};

function DrugSearchPage({ drugs }: { drugs: Drug[] }) {
  const { sorted, setStrategy } = useSortable(drugs, sortStrategies.price);
  return (
    <div>
      {(['price', 'sales', 'rating', 'distance'] as SortKey[]).map(key => (
        <button key={key} onClick={() => setStrategy(() => sortStrategies[key])}>
          {sortLabels[key]}
        </button>
      ))}
      <DrugList drugs={sorted} />
    </div>
  );
}
```

三个细节值得停在代码上看：

- **策略通过参数注入**：`useSortable` 完全不知道「价格排序」的存在，它只认 `SortStrategy<T>` 这个契约。任何数组、任何比较规则都能用这个 Hook。
- **运行时可切换**：`setStrategy` 换掉策略引用，`useMemo` 检测到依赖变化，自动重排——「用户切换排序方式」就是一次策略替换。
- **注意 `[...items].sort(strategy)` 的展开**：`sort` 会原地修改数组，不拷贝就直接改了 props 传进来的数据源，React 里属于典型事故。

### usePrescriptionForm：策略表驱动整个表单

第二个落点更有代表性——把第四节的校验策略注册表装进 Hook，做成一个「表单级」的校验引擎：

```typescript
import { useState } from 'react';

type ValidateStrategy = (value: string) => string | null;

function usePrescriptionForm(validators: Record<string, ValidateStrategy>) {
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const validateField = (field: string, value: string) => {
    const error = validators[field]?.(value) ?? null;
    setErrors(prev => ({ ...prev, [field]: error }));
    return error;
  };

  const validateAll = (values: Record<string, string>) => {
    const next: Record<string, string | null> = {};
    for (const field of Object.keys(values)) {
      next[field] = validators[field]?.(values[field]) ?? null;
    }
    setErrors(next);
    return Object.values(next).every(e => e === null);
  };

  return { errors, validateField, validateAll };
}
```

用法：麻醉处方页面传麻醉的规则表，精神类处方页面传精神类的规则表——**Hook 本身一行不用改**：

```typescript
// 麻醉处方页：注入麻醉规则
const { errors, validateField, validateAll } = usePrescriptionForm({
  code: (v) => v.length >= 20 ? null : '麻醉药品处方编号不足20位',
  dosage: (v) => v.trim() ? null : '用法用量不能为空',
});

// 精神类处方页：注入管制规则
const psychiatricForm = usePrescriptionForm({
  code: (v) => /^[A-Z]{2}\d{6}$/.test(v) ? null : '格式不符合管制药品规范',
  dosage: (v) => v.trim() ? null : '用法用量不能为空',
});
```

这就是策略模式在 React 里的完整形态：**Hook 是 Context（持有策略表、委托执行），策略表通过参数注入，表单组件只管渲染和收集输入**。UI 和规则彻底分家，规则独立成纯函数、独立测试，新处方类型等于新策略表，Hook 和组件零改动。

> 💬 **面试官**：React 项目里怎么落地策略模式？
> ✅ 标准答案：把可变的算法抽成遵守统一契约的函数，以参数形式注入自定义 Hook 或组件——Hook 内部持有策略（state 或参数）、需要时可切换（setState 换策略引用），派生结果用 `useMemo` 以策略引用为依赖。调用方只面向契约，算法家族增删不影响组件。
> 🎁 加分答案：能点出两个工程细节——① `useMemo` 依赖的是策略函数引用，内联定义策略会让引用每次渲染都变、缓存失效，策略要定义在组件外或用 `useCallback` 稳住；② `sort` 这类原地修改的方法要先拷贝再调用，避免污染 props 数据源。这两处都是「实现过」和「背过」的分水岭。

---

## 六、前端工程落地：你天天在用的策略

策略模式在前端不是「要不要用」的问题，而是「你早就在用、只是没认出来」。这一节把笔记里的案例和日常 API 逐个过一遍，重点说清**每个 API 背后的策略结构**。

### jQuery animate 的 easing：swing 和 linear 是两个缓动策略

先看笔记里的可运行示例（这个 `title` 是当年从迭代器示例复制来的，原样保留）：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>迭代器模式</title>
  <script src="https://cdn.staticfile.org/jquery/1.10.2/jquery.js"></script>
  <style>
    #content {
      width: 100px;
      height: 100px;
      background-color: aquamarine;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <h1>动画</h1>
  <div id="content"></div>
  <button id="animate">开始</button>
  <script>
    $('#animate').on('click', () => {
      $('#content').animate({width: '100%'}, 1000, 'linear')
    })
  </script>
</body>
</html>
```

先补上背景知识。`animate()` 方法执行 CSS 属性集的自定义动画；该方法通过 CSS 样式将元素从一个状态改变为另一个状态，CSS 属性值是逐渐改变的，这样就可以创建动画效果。完整签名是：

```text
$(selector).animate(style, speed, easing, callback)
```

其中 `easing` 参数有两个可选值：**swing**（默认）——动画的开始变得更快一些，然后再慢下来，先加速后减速；**linear**——提供一个稳定的动画，以使得动画的每个步骤都是相同的，匀速进行。

现在用策略模式的眼光重新看这个参数：`swing` 和 `linear` 是什么？是两个**「把时间进度映射为动画进度」的算法**——输入都是 `(0, 1]` 的时间比例，输出都是 `[0, 1]` 的完成比例，契约完全一致、可以互相替换。jQuery 内部维护着一张缓动函数注册表（`jQuery.easing` 对象），`animate` 按名字查表取出缓动函数执行。你甚至可以往注册表里注册自己的缓动策略：

```javascript
// jQuery 的缓动策略注册表是公开的，可以追加自定义策略
jQuery.easing.customEase = function(p) {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOutQuad
};
$('#content').animate({ width: '100%' }, 1000, 'customEase');
```

**新增缓动算法，不改 jQuery 一行源码，只往注册表加一项数据**——这是策略模式 OCP 特性最标准的样子。

### Array.prototype.sort：比较器就是策略

原生 `sort` 的参数 `compareFn` 就是一个策略：

```typescript
// 同一个数组，注入不同比较策略，得到不同顺序
drugs.sort((a, b) => a.price - b.price);   // 价格升序策略
drugs.sort((a, b) => b.rating - a.rating); // 评分降序策略
```

比较函数的契约由语言规定：返回负数 a 排前、正数 b 排前、零保持相对位置。**排序的「骨架」（排序算法本身）由引擎实现，排序的「策略」（怎么算先后）由你注入**——sort 是引擎内置的策略模式入口。

### Zod / yup：schema 校验库的策略组合

第四节手写的校验策略注册表，在工程里早有成熟的库级实现。Zod 的链式 schema，每一环都是一个策略对象：

```typescript
import { z } from 'zod';

const prescriptionSchema = z.object({
  code: z.string().regex(/^[A-Z]{2}\d{6}$/, '格式不符合管制药品规范'),
  dosage: z.string().min(1, '用法用量不能为空'),
});

prescriptionSchema.safeParse({ code: 'AB123456', dosage: '' });
// => { success: false, error: ... dosage: ['用法用量不能为空'] }
```

`z.string().min(1)` 是「非空策略」，`.regex(...)` 是「正则策略」，`.length(20)` 是「长度策略」——每条规则都是一个实现同一契约（「拿到值、返回通过或错误」）的策略对象，链式调用把它们组合成一张策略表。yup 的 `yup.string().required().matches(...)` 同构。**手写校验注册表理解原理，用 Zod 落地工程**，两者的关系就是这样。

### Redux reducer：从 switch 到策略表

Redux 的 reducer 官方写法是 switch-case，社区流传更广的写法是把它策略化——把每个 action 的处理逻辑变成 handler 表里的一个策略：

```typescript
// switch 版：新增 action 要回到函数里加 case
function cartReducer(state = initialState, action) {
  switch (action.type) {
    case 'ADD_TO_CART':   return { ...state, items: [...state.items, action.payload] };
    case 'REMOVE_FROM_CART': return { ...state, items: state.items.filter(i => i.id !== action.payload) };
    default: return state;
  }
}

// 策略表版：新增 action 只加一个 handler
const handlers = {
  ADD_TO_CART: (state, action) => ({ ...state, items: [...state.items, action.payload] }),
  REMOVE_FROM_CART: (state, action) => ({ ...state, items: state.items.filter(i => i.id !== action.payload) }),
};
function cartReducer(state = initialState, action) {
  return handlers[action.type]?.(state, action) ?? state; // 👈 和第四节 validate 同一个形状
};
```

两版功能完全一致，结构差异和第四节的 if-else vs 注册表一模一样：**switch 版新增行为要修改函数体，策略表版新增行为只是加一条数据**。`handlers[action.type]?.(state, action) ?? state` 和 `prescriptionValidators[type]?.(value) ?? null` 是同一个形状——你在一个地方看懂了它，四个地方都能认出它。

> 💬 **面试官**：`Array.prototype.sort` 算策略模式的应用吗？
> ✅ 标准答案：算。比较函数是满足统一契约（负数/零/正数的返回约定）的可替换算法对象，`sort` 内部（Context）接收它并委托比较——排序骨架与比较策略分离，完全符合策略模式的结构。
> 🎁 加分答案：能再举出同构的例子——jQuery easing 的缓动函数注册表（可追加自定义缓动）、Zod 的规则链（每条校验规则一个策略对象）、Redux reducer 的 handler 表，并点出它们共同的判据：**有一个稳定骨架在接收可替换的算法对象**。能一次报出一串例子并给出统一判据，比背一个定义有说服力得多。

---

## 七、易混淆辨析：三组边界

辨析是这个系列每篇的核心增值。策略模式的辨析题有四组，前两组是必考。

### 策略 vs if-else：改哪里、谁承担变化

第二节已经把机制讲透，这里给一张对照表收束：

| 维度 | if-else 版 | 策略模式版 |
|---|---|---|
| 新增算法 | 修改已有函数体（加分支） | 新增策略对象 + 注册一行数据 |
| 对既有逻辑的影响 | 回归范围包含所有旧分支 | 零影响（旧代码未动） |
| 测试 | 整个函数一起测 | 每个策略独立测 |
| 判断逻辑位置 | 散在每个调用点 | 收敛到注册表一次查表 |

要补的只有一句反直觉的话：**if-else 不是「错的」**。它输在「变化方向」上——当分支数量会增长、且增长不该牵动调用方时，if-else 的修改成本会线性上升；策略模式把这条成本曲线压平。分支稳定在两三个、且看不见增长预期时，if-else 就是正确答案（KISS 原则），硬上策略模式反而增加间接层。

### 策略 vs 状态：谁决定切换（为状态模式篇埋点）

这是策略模式辨析题里的头名，也是行为型模式里最常被问的一组。两者结构几乎同构：都是一个 Context 持有一堆实现同一接口的对象，都会切换当前持有的那个。**区分点只有一个：谁决定切换。**

- **策略模式**：策略由**外部传入**——调用方决定用哪个，Context 自己不会换策略。用户点了「按价格排序」，排序器才用价格策略；用户不点，它永远不换。
- **状态模式**：状态由**内部自主迁移**——对象根据当前状态和发生的事件，自己决定切到哪个状态，调用方无权也没必要指定。处方订单在「待审核」状态被审批通过，自己迁移到「已通过」，外部只触发事件。

```text
        策略模式                      状态模式
  ┌──────────────────┐        ┌──────────────────┐
  │  Context          │        │  Context          │
  │  策略：外部塞进来   │        │  状态：自己换过去   │
  │  谁选：调用方       │        │  谁换：对象自己     │
  │  策略之间：平等     │        │  状态之间：有迁移   │
  │  互不知道对方存在    │        │  图（知道下一步）   │
  └──────────────────┘        └──────────────────┘
```

补一层结构差异：策略之间是**平等的、互不相识的**——价格排序不知道销量排序的存在，也不该知道；状态之间是**有迁移图的**——「待审核」知道审批通过后要去「已通过」，状态对象往往要持有 Context 的引用才能触发迁移。这也解释了笔记概述里那句话：「策略模式中各个类是平等的，没有关系，客户端需要知道算法主动切换；状态模式中，状态切换需要了解细节」。状态模式的完整拆解放到第 14 篇展开。

### 策略 vs 职责链：选一个执行 vs 依次全过

两者都会收到一个请求并交给一组处理逻辑，差别在**执行路径**：

- **策略**：按 key **选中一个**执行，其余的策略完全不参与。选了「价格排序」，销量策略根本不会被调用。
- **职责链**：请求**沿链依次流过**每个处理器，每个处理器都可以处理、加工或放行——处方提交前的「参数校验 → 禁忌检查 → 库存校验 → 风控」是一条链全过，不是四选一。

判据一句话：**策略是「多选一」，职责链是「全过一遍（或中途断掉）」**。职责链模式的完整展开在第 13 篇。

### 策略 vs 命令：封装算法 vs 封装可撤销的请求

命令模式把「请求」封装成对象（有 `execute()`、`undo()`），重点在请求可以**存储、排队、撤销**；策略封装的是「算法」，重点在**可替换**。命令对象一般有 `undo()` 方法、有身份（可以放进历史栈）；策略是纯算法，没有身份、用完即弃，也不需要 undo。命令模式的完整展开在第 14 篇。

> 💬 **面试官**：策略模式和状态模式的区别是什么？
> ✅ 标准答案：谁决定切换。策略模式的策略由外部调用方传入，Context 自己不换策略，策略之间平等且互不相识；状态模式的状态由对象内部根据当前状态和事件自主迁移，状态之间构成迁移图，状态对象往往要持有 Context 引用来触发迁移。
> 🎁 加分答案：能补一句结构证据——状态对象的方法签名通常是 `handle(context)`，把 Context 传进来就是为了迁移状态；策略的签名是纯入参出参 `(data) => R`，根本不认识 Context。再能举一个真实判断案例（「搜索排序该用策略，因为切换权在用户手里；订单流转该用状态，因为切换权在业务规则手里」），这道题就是满分答法。

---

## 八、什么时候不该用策略模式

5-10 年的工程师和 3 年的工程师拉开差距的地方，往往不是「会用什么模式」，而是「知道什么时候不用」。策略模式有三种典型的不适用场景。

### 分支少且稳定：KISS 和 YAGNI 的地盘

「读取 URL 参数，有值走 A 逻辑，没值走 B 逻辑」——就两个分支，且看不见第三种出现的可能。这种场景套策略模式，需要新增：一个策略类型、一个注册表、一个查表函数，三样东西服务于一个本来两行就能写完的判断。**模式的间接层本身是有维护成本的**：读者要多跳一层才能看到真正执行的代码。KISS（保持简单）和 YAGNI（不要现在用不上的抽象）在这个场景里优先级高于 OCP。

### 策略之间需要共享状态或互相协作：说明该选的是别的结构

策略模式的前提是「策略互相独立、平等、互不相识」。如果你发现两个策略之间需要读写同一份数据、需要互相通知、或者「算法」其实是同一个对象在不同阶段的形态——继续硬上策略模式，会出现策略里到处传上下文对象、或者注册表里塞进一堆带状态的怪东西的场面。前者该考虑把共享状态收进 Context 或用状态模式（策略其实在迁移），后者该考虑职责链（步骤之间要传中间结果）。

### string key 注册表的松散性扩散：注册表也要有治理

函数注册表用 `Record<string, ...>`，key 是裸字符串——没有任何编译期约束时，「注册表里有哪些策略」只存在于人的记忆里。第四节给的 keyof 收窄是解药，但如果项目里已经出现十几张各自为政的策略表、key 命名风格混乱（`byPrice` / `price-sort` / `SORT_PRICE` 并存），那问题已经不是「要不要用策略模式」，而是「注册表需要统一治理」——集中定义所有策略 key 的联合类型、注册表收口到一个模块导出，别让每个业务文件自己拼字符串。

> 💬 **面试官**：什么时候不应该用策略模式？
> ✅ 标准答案：三种情况——分支只有两三个且稳定（YAGNI/KISS，间接层成本大于收益）；策略之间需要共享状态或协作（该考虑状态模式或职责链）；以及注册表缺乏类型收窄和统一治理时，string key 的松散性会取代原来的 if-else 成为新的维护负担。
> 🎁 加分答案：能点出「模式的价格」这个视角——每个设计模式都在卖一个「扩展性承诺」，代价是至少一层间接。判断该不该买，就是判断扩展性需求是真实的还是想象的。能主动说出「我上个月刚把一个过度设计的策略注册表简化回了 switch」，基本就是这道题的满分形态。

---

## 💡 一张图总结（面试速记表）

| 要点 | 一句话内核 | 考察频率 |
|---|---|---|
| 策略 vs if-else | if 收敛到注册表一处查表，新增算法只加数据不改调用方 | ⭐⭐⭐ 必考 |
| 策略 vs 状态 | 谁决定切换：策略外部传入，状态内部自主迁移 | ⭐⭐⭐ 必考 |
| 三角色 | Strategy 定契约，ConcreteStrategy 封算法，Context 持有并委托 | ⭐⭐ 高频 |
| JS 函数式实现 | 函数即策略对象，Record/Map 即注册表，Context 退化为函数 | ⭐⭐⭐ 必考 |
| keyof 收窄注册表 | 漏注册、传错键都在编译期报错，注册表是类型唯一事实来源 | ⭐⭐ 高频 |
| Hook 落地 | 策略注入 Hook，setStrategy 运行时切换，useMemo 依赖策略引用 | ⭐⭐ 高频 |
| sort / Zod / easing / reducer 表 | 比较器、规则链、缓动函数、handler 表都是策略 | ⭐⭐ 高频 |
| 策略 vs 职责链 | 多选一执行 vs 沿链依次全过 | ⭐⭐ 高频 |
| 策略 vs 命令 | 封装可替换的算法 vs 封装可撤销的请求 | ⭐ 中频 |
| 什么时候不用 | 分支少且稳定、策略需共享状态、注册表失控时回归简单 | ⭐⭐ 高频 |

> 💡 记住这条主线：**策略模式不消灭 if，它把「选哪个算法」收敛到注册表一次查表，从此新增算法是加数据、不是改代码。** 同一功能、多种算法、算法还会增——三个条件齐了才出手；策略由外部传入，记住这一句，策略 vs 状态就永远答不错。

---

## 📝 留个问题

打开你手头项目，全文搜一遍 `if (type ===` 或 `switch (`，挑出最长的那一个分支链，回答两个问题：

第一，未来半年它还会新增分支吗？第二，调用方是真的关心「走的是哪个分支」，还是只要一个结果？

如果两个答案分别是「会」和「只要结果」——那它就是策略模式该接管的地方。把你找到的最长分支数、以及它对应的业务含义写在评论区，我们一起看看谁的项目里躺着最长的 if-else 👇

---

## 参考资料

https://refactoring.guru/design-patterns/strategy （策略模式的意图、结构与伪代码示例，文中问题图/解法图/结构图出处）

https://refactoring.guru/design-patterns/state （状态模式，策略 vs 状态辨析的参照）

https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/sort （sort 比较函数契约）

https://zod.dev/ （Zod schema 校验库，规则链的策略组合形态）

https://api.jquery.com/animate/ （jQuery animate 的 easing 参数文档）

https://redux.js.org/usage/reducing-boilerplate （Redux reducer 的 handler 表写法）

《设计模式：可复用面向对象软件的基础》 Erich Gamma 等四人组著，1994（策略模式的权威出处）

《JavaScript 设计模式与开发实践》 曾探 著（策略模式的前端场景化讲解）

搜索关键词：strategy pattern JavaScript、策略模式 状态模式 区别、策略模式替代 if-else、React 自定义 Hook 策略模式、Zod schema validation、jQuery easing 自定义缓动函数

---

> 🔖 这是「前端设计模式」系列第 12 篇。上一篇：《观察者与发布订阅模式：有没有中介，是解耦的分水岭》；下一篇预告：《职责链模式：中间件、拦截器与事件冒泡的本质》
