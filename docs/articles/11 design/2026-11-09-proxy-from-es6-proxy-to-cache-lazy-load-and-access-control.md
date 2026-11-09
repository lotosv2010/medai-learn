# 代理模式：从 ES6 Proxy 到缓存、懒加载与权限拦截（面试收藏级）

> **副标题**：Vue3 响应式的 Proxy 只是代理模式的一种应用，代理模式本身的分类远不止这一种

> 面试官问：「说说代理模式。」你条件反射地背出那句背了一百遍的定义——「为其他对象提供一种代理以控制对这个对象的访问」。面试官点点头，接着问：「那你们项目里的权限校验，是用代理做的吗？图片懒加载算代理吗？防抖算吗？」你愣了两秒，说「算……吧？」。
>
> 这一愣，暴露的正是这篇文章要说的事：**能把定义背出来，和能在代码里把代理认出来，是两种完全不同的能力。** 前者靠记忆，后者靠结构感。而面试官考的，从来都是后者。

---

## 🎯 这篇文章解决什么问题

大多数人对代理模式的印象只有一个：**Vue3 用 `Proxy` 做响应式**。这个印象不算错，但它把一整个家族压缩成了一个人。

真实的代理模式长这样：

- 它至少分四类——虚拟代理、缓存代理、保护代理、远程代理，四个类干的事完全不同
- 它有两套实现路径——静态代理（手写代理类）和动态代理（语言级拦截）
- 它有一个 2021 年的老笔记里堆了一堆「看起来像代理、其实不是」的东西——防抖、节流、事件委托、网络正反向代理

**这些东西混在一起，就是绝大多数人面试答崩的原因。**

所以本文只做三件事：

- **还原家族**：把四类代理摆开，每类配一个医疗业务的真实场景，让你有「什么情况该上代理」的直觉
- **讲透三个核心实现**：虚拟代理（懒加载/预加载）、缓存代理（阶乘/斐波那契/ES6 Proxy 版）、保护代理（经纪人/权限守卫）
- **划清六条边界**：代理 vs 装饰器、代理 vs 适配器、代理 vs 外观、GoF 代理 vs 网络代理、代理 vs 防抖节流、代理 vs 事件委托

主线就一句：

> **代理模式的全部价值，是在「访问对象」这条路上插一道可控的闸门——延迟、缓存、鉴权都在闸门里完成，而调用方和真实对象都不知情。**

---

## 一、三个真实场景：同一种「绕一层」的直觉

先不看定义，看三个你大概率真遇过的场景。

### 场景一：处方审核列表的图片，一屏 20 张

处方审核后台，列表一次渲染 20 条待审处方，每条带一张处方笺扫描图。如果渲染时把所有 `<img>` 的 `src` 都写上，浏览器会在首屏同时发起 20 个图片请求——用户真正看到的只有第一屏那 3 张，剩下 17 张白下了。

**做法**：图片标签先不写 `src`，只挂一个 `data-src`。等这张图滚进可视区，才把 `data-src` 赋给 `src`，这时才真正发起下载。

```text
        用户看到什么                真实发生了什么
    ┌──────────────┐          ┌────────────────────┐
    │ 处方 1  [图]  │          │ 请求 #1 ✅ 已加载   │
    │ 处方 2  [图]  │  滚动中   │ 请求 #2 ✅ 已加载   │
    │ 处方 3  [图]  │  ──────▶ │ 请求 #3 ✅ 已加载   │
    │ ─ ─ 视口边界 ─ │          │ 请求 #4 ⏸ 未发起    │
    │ 处方 4  [占位] │          │ 请求 #5 ⏸ 未发起    │
    │ 处方 5  [占位] │          │ 请求 #6 ⏸ 未发起    │
    └──────────────┘          └────────────────────┘
```

这就是**虚拟代理**：真实对象（那张图）存在，但没必要现在就要；先让一个廉价的替身顶上，等真需要了再去取。

### 场景二：药品价格，5 秒内被 8 个组件各调一次

药品详情页上方有价格卡片，下方有「同成分药品」列表、有「加入购物车」按钮的价格预览、有优惠券计算器……这些组件互不知道对方存在，但都在挂载时调了一次 `getDrugPrice(drugId)`。

结果就是：同一个 `drugId`，5 秒内发了 8 次请求，返回 8 份一模一样的数据。

**做法**：在「真正发请求」这个动作前面加一层，先查缓存，命中就直接返回，没命中才放行。

```text
  组件A ─┐
  组件B ─┤        ┌─────────────┐        ┌──────────────┐
  组件C ─┼──────▶ │ 代理：查缓存 │ ─命中─▶│ 直接返回旧值  │
  ...    │        └──────┬──────┘        └──────────────┘
  组件H ─┘               │未命中
                         ▼
                  ┌──────────────┐
                  │ 真实请求 API  │ ──▶ 写入缓存
                  └──────────────┘
```

这就是**缓存代理**：拦截重复调用，命中则直接给结果，未命中才真正执行。

### 场景三：医生、护士、药师，三种人看同一份处方

一份处方，三种角色能做的事完全不同：

- **医生**：只能看自己患者的处方（看别人的直接拒绝）
- **护士**：能看，不能改
- **药师**：能看，能审方（通过/驳回），不能开方

最直觉的写法是每个业务方法开头加一句判断：

```typescript
class PrescriptionService {
  read(id: string, role: Role) {
    if (role !== 'doctor' && role !== 'nurse' && role !== 'pharmacist') throw new Error('无权限');
    // ...真正读处方
  }
  write(id: string, role: Role) {
    if (role !== 'doctor') throw new Error('无权限');
    // ...真正写处方
  }
}
```

三十个方法就是三十段重复的权限判断。改一次权限规则（比如「护士长也能改」），要翻遍整个类，这直接违反开闭原则。

**做法**：把权限判断全部收进一个代理类，业务方法保持纯粹。

这就是**保护代理**：在访问真实对象前先判断「你该不该进来」。

### 三个场景的共同点

把这三个场景叠起来看，会发现一个极为一致的形状：

> **业务对象本身一行没改，调用方也一行没改，所有变化都发生在中间那层。**

这句话就是代理模式的全部。**它不是「新加一个功能」，而是「在访问路径上插一道闸门」。** 闸门后面是延迟、是缓存、是鉴权，闸门前面的人（调用方）和闸门后面的人（真实对象）都不知道闸门存在——这才是它值得被单独命名的原因。

> 💬 **面试官**：你项目里用过代理模式吗？举一个例子。
>
> ✅ 标准答案：不要先报「代理模式」这个名字，先讲场景。比如——处方审核列表一屏 20 张处方图，首屏只加载可视区内的 3 张，其余用 `data-src` 挂起，滚到可视区才真正请求；或者药品价格接口被页面上多个互不相关的组件重复调用，用一个带 TTL 的缓存代理在请求前拦截，5 秒内同参数只发一次。这两件事的结构都是「在真实对象前包一层，控制访问时机或次数」，所以是代理模式。
>
> 🎁 加分答案：能主动说出**为什么选代理而不是别的模式**——「权限这块我一开始想的是在每个方法里判断，但那会把权限规则打散到 N 个地方，改一次规则要改 N 处，违反 OCP；收到代理里之后，业务类只关心业务，权限规则只在一处，新增角色只改代理。之所以不是装饰器，是因为装饰器每次都会转调真实对象、只负责加能力，而代理要能**拒绝**——拒绝这一下，是装饰器做不到的。」

---

## 二、意图与本质：代理控制的到底是什么

### GoF 的原话与关键词

GoF 1994 年那本书里，代理模式的意图是这么写的：

> **为其他对象提供一种代理以控制对这个对象的访问。**

这句话里有两个词必须咬住：

- **控制**——不是「增强」，不是「转换」，是**控制**
- **对这个对象的访问**——控制的粒度是「访问」这个动作，不是对象本身的行为

所以代理模式解决的核心矛盾，可以精确地表述为：

> **调用方想要的是「像调用本人一样调用」，而中间又必须插入一段「额外的判断」。**

这两个需求天然打架：要插入判断，就得有一层东西挡在中间；但一旦挡在中间，调用方就可能感知到「这不是本人」。代理模式的解法是——**让代理和真实对象实现一模一样的接口**。接口一致，调用方才感知不到差异，判断才能「偷偷」插进去。

**这半句话，就是代理和适配器、装饰器的根本分野**（第八节展开）：适配器换接口，装饰器加能力，只有代理追求「完全一样的接口 + 完全透明的控制」。

### 笔记原文：概述与五个类比

这份笔记的开头四句概述，是理解整个模式最短的路径，原文保留：

> + 由于一个对象不能直接引用另一个对象，所以需要通过代理对象在这个对象之间起到中介作用
>
> + 代理模式就是为目标对象创造一个代理对象，以实现对目标对象的访问
>
> + 这样就可以在代理对象里添加一些逻辑判断、调用前或调用后执行一些操作，从而实现了扩展目标的功能
>
> + 火车票代购、房产中介、律师、海外代购、明星经纪人

第一句点出的是「**为什么需要中间人**」：两个对象之间没法（或不方便）直接引用时，代理充当桥梁。第二句是定义，第三句是手法——**在代理里加逻辑判断、在调用前后插操作**。第四句是五个类比的来源。

前三句合起来其实就是一条完整的推理链：

```
   对象A  ──✗ 不能直接引用──▶  对象B
        │
        └──✅ 经过代理对象 ──▶  对象B
                  ▲
                  └── 在这里插入：逻辑判断 / 调用前操作 / 调用后操作
```

**注意第三句里的「扩展目标的功能」**——这句表述在笔记里没问题，但面试时要留意它和装饰器的区分：代理确实「扩展」了，但方式是**控制**（判断放不放行），而不是叠加职责。这个细微差别，第八节会讲透。

### 生活里的代理

笔记给的五个类比，一个都不用改：

> 火车票代购、房产中介、律师、海外代购、明星经纪人。

它们共同的特征是：**你找的都不是本人，但你办成的还是本人的事。**

- 你找房产中介看房，签合同的时候对面还是房东——中介只控制「你能不能见到房东、什么时候见」
- 你找律师打官司，出庭的是律师，但法律后果由你承担——律师控制的是「你能不能直接面对法庭」
- 你找票务代购买票，票还是那张票，但代购控制了「你什么时候能拿到、加多少钱」

注意这里有个共同点：**这些代理都不是「让服务变好」，而是「让访问变得可控」。** 中介不会让房子变好，律师不会让案子变简单，代购不会让火车变快。这就是「控制访问」和「增强功能」的区别——再次对应到代理 vs 装饰器。

### 代理的四大分类

这是本篇的骨架，后面每一节都要回到这张表：

| 分类 | 控制什么 | 典型场景 | 本文对应节 |
|------|---------|---------|-----------|
| **虚拟代理** | 控制**何时创建 / 加载** | 图片懒加载、大对象延迟初始化、按需渲染 | 第四节 |
| **缓存代理** | 控制**是否真的执行** | 药品价格、阶乘、斐波那契、memoize | 第五节 |
| **保护代理** | 控制**谁能访问** | 医生 / 护士 / 药师权限、ES6 Proxy 校验 | 第六节 |
| **远程代理** | 控制**在哪执行** | Web Worker、RPC stub、gRPC-Web | 第九节 |

这四类的划分依据不是「怎么实现」，而是「**控制什么**」。同样是「包一层」，虚拟代理控制的是时机，缓存代理控制的是次数，保护代理控制的是身份，远程代理控制的是位置。

面试时如果只能答出「Vue3 用 Proxy」，问题不在答得少，而在**没有一个分类框架**——没有框架，你就只能一个个举例子，举到第三个就说不下去了。

### 补一个笔记里缺失的高频辨析：静态代理 vs 动态代理

这是代理模式里区分度最高、但很多资料一笔带过的一组概念。

**静态代理**：代理类是**手写的**。要代理 `Angelababy`，就得手动写一个 `AngelababyAgent`；要再代理一个 `Doctor`，还得再手写一个 `DoctorAgent`。

```typescript
// 静态代理：每个被代理的类，都要手写一个对应的代理类
class AngelababyAgent extends IStar {
  constructor(private angelababy: Angelababy) { super(); }
  answerPhone(): void { /* 手写的判断逻辑 */ }
}
// 想代理医生？再写一遍
class DoctorAgent extends IDoctor {
  constructor(private doctor: Doctor) { super(); }
  diagnose(): void { /* 又是手写一遍判断逻辑 */ }
}
```

**动态代理**：代理是**运行时生成的**。一个 `Proxy` 能代理任意对象，拦截逻辑写一份就够。

```typescript
// 动态代理：一份拦截逻辑，代理任意对象
const agent = new Proxy(anyTarget, { get(/* ... */) { /* ... */ } });
```

用一句话记住这个区别：

| 维度 | 静态代理 | 动态代理 |
|------|---------|---------|
| 代理类从哪来 | 手写，编译期就存在 | 运行时由 `Proxy` 生成 |
| 一个代理管几个类 | 一个 | 任意多个 |
| 新增被代理类要改什么 | 新写一个代理类 | 什么都不用改 |
| 代码量 | 与类数量成正比 | 恒定 |
| JS 里的代表 | 手写代理类、ES5 `Object.defineProperty` | ES6 `Proxy` |

> 📚 **知识点**：Java 圈把这两种叫「静态代理」和「JDK 动态代理 / CGLIB」，是面试必考内容。JS 没有接口、没有编译期，静态代理的「手写代理类」和动态代理的「`Proxy` 拦截」就构成了完整对照。**理解了这一组，你才能回答「为什么 Vue3 必须升级到 Proxy」——因为 `Object.defineProperty` 只能算「半个动态代理」：它能自动劫持已存在的属性，但新增的属性、数组下标都劫持不到，本质上是「半手动」。**

> 💬 **面试官**：代理模式有哪几种常见分类？分别对应什么场景？
>
> ✅ 标准答案：按「控制什么」分四类。虚拟代理控制创建的时机，真实对象开销大或暂时用不上时先不创建，等真正需要再创建——例子是图片懒加载、大对象延迟初始化；缓存代理控制是否真的执行，命中缓存就直接返回，例子是药品价格查询、阶乘缓存、`memoize`；保护代理控制谁能访问，在调用前判断权限，例子是医生/护士/药师三种角色对同一份处方的不同权限；远程代理控制在哪里执行，本地用一个替身代表远端对象，例子是 Web Worker、RPC stub。
>
> 🎁 加分答案：能补上「静态 vs 动态」这个维度——「这四类是按控制目标分的，还有另一个正交的维度是按实现方式分：静态代理是手写代理类，一个代理对应一个类，代码量与类数量成正比；动态代理用 ES6 `Proxy`，一份拦截逻辑代理任意对象。Vue3 的响应式、MobX、Immer 都是动态代理，笔记里那个 `AngelababyAgent` 是静态代理。这个维度面试官往往会追着问，因为它直接决定了『要不要为每个类都写一个代理』。」

---

## 三、结构与角色：GoF 三角色与经纪人类图

### 三角色

GoF 给代理模式定义了三个角色：

```text
    ┌─────────────────────┐
    │      Subject        │  ← 公共接口：代理和真实对象都实现它
    │  <<interface>>      │
    │  + request()        │
    └──────────┬──────────┘
               │ implements
      ┌────────┴────────┐
      │                 │
┌─────▼──────┐   ┌──────▼──────────┐
│ RealSubject│   │      Proxy      │
│ + request()│   │ - realSubject   │ ──持有──▶ RealSubject
└────────────┘   │ + request()     │
                 └─────────────────┘
```

- **Subject**：公共接口。客户端只认识它，不知道自己在跟谁说话
- **RealSubject**：真实对象，真正干活的
- **Proxy**：代理，持有 `RealSubject` 的引用，实现同一个接口，在转发前后插入控制逻辑

### 术语对照：笔记里的 Target / Proxy

这篇笔记写于 2021 年，它把角色叫成 **Target（目标对象）/ Proxy（代理对象）**：

> + Target：目标对象，也就是被代理的对象，是具体业务的执行者
> + Proxy：代理对象，里面会包含一个目标对象的引用，可以实现对访问的扩展和额外的处理

这个叫法在前端资料里很常见，语义也没错。但 **GoF 原文和 refactoring.guru 用的是 `Subject` / `RealSubject` / `Proxy`**。你去对照英文资料、去看大厂面试答案时，用这两个名字能对上；用 `Target` 可能会让人以为是适配器模式的 `Target`（第 05 篇那个 Target 是「客户端期望的接口」，完全是另一个角色）。

**同一样东西，两种叫法，记住映射就不会混：**

| 笔记叫法 | GoF 叫法 | 语义 |
|---------|---------|------|
| Target | RealSubject | 真实对象，干活的 |
| Proxy | Proxy | 代理，控制访问的 |
| （笔记未提） | Subject | 两者共同实现的公共接口 |

### 笔记原图的三角关系

![](https://cdn.nlark.com/yuque/0/2021/png/738210/1638859520507-99f870a5-65c5-45da-af34-8c7204f1c336.png)

这张图把这个模式最朴素的三角关系画得很清楚：左边是 **client（客户端）**，中间是 **AngelababyAgent（经纪人 / 代理）**，右边是 **Angelababy（明星 / 真实对象）**。`AngelababyAgent` 持有一个 `Angelababy` 的引用，并且和它一样对外提供 `answerPhone()` 这个能力。客户端调用 `answerPhone()` 时，并不知道电话最后是谁接的。

### 完整代码：经纪人代理明星

这是笔记里的完整实现，我们逐段看。

```typescript
abstract class IStar {
  abstract answerPhone(): void; // 接电话
}

class Angelababy extends IStar {
  available: boolean = !Math.round(Math.random()); // 是否有空
  answerPhone(): void {
    console.log("I am Angelababy");
  }
}
class AngelababyAgent extends IStar {
  // 让经纪人保持一个对angelababy的引用
  constructor(private angelababy: Angelababy = new Angelababy()) {
    super();
  }
  answerPhone(): void {
    console.log("I am  Angelababy Agent");
    // 判断angelababy是否有空
    this.angelababy.available
      ? this.angelababy.answerPhone()
      : console.log("Angelababy Unavailable");
  }
}

const proxy = new AngelababyAgent();
proxy.answerPhone();
```

这段代码只有三十行，但有几个设计细节值得一个一个抠出来——面试时能讲出这些细节，和只能说「这就是代理模式」是完全两个层次。

**第一，`AngelababyAgent extends IStar`，而不是 `extends Angelababy`。**

这是全段最关键的一行。代理必须和真实对象**实现同一个接口**（这里是抽象类 `IStar`），而不是继承真实对象的实现。为什么？

- 如果 `extends Angelababy`，代理就继承了 `answerPhone` 的实现——那它就不是「控制访问」，而是「覆盖实现」了
- 而且继承意味着代理和真实对象是 is-a 关系（代理「是一个」明星），这显然不对：经纪人不是明星
- 实现同一接口则表达的是「**代理可以被当作真实对象使用**」——客户端拿到 `IStar` 类型的引用，根本分不清后面是明星还是经纪人

**这正是「不改变接口」这条铁律在代码上的体现。** 代理模式的形式要求，就是为了服务那句「控制访问但不被感知」。

**第二，`available` 的随机值 + 三元的放行判断 = 保护代理的最小实现。**

```typescript
this.angelababy.available
  ? this.angelababy.answerPhone()   // 有空 → 放行
  : console.log("Angelababy Unavailable"); // 没空 → 拦下
```

这里做的事非常小，但结构完整：**判断 → 放行或拒绝 → 拒绝时不触碰真实对象**。把 `available` 换成一个权限校验函数，把 `Angelababy` 换成 `PrescriptionService`，这段代码就变成了生产级的保护代理。第六节会写出完整版本。

注意「没空」时它做的是 `console.log` 而不是抛错——**这是保护代理的一个真实设计选择**：拦截不一定意味着报错，也可以静默降级。什么时候抛错、什么时候降级，第六节细讲。

**第三，`constructor(private angelababy: Angelababy = new Angelababy())` 的默认值，是懒创建的前置形态。**

这个参数默认值意味着：调用方可以自己传一个 `Angelababy` 进来，也可以不传、让代理自己 `new` 一个。

- 传进来 → 真实对象的生命周期在外部，代理只是「引用」——这更接近**聚合**
- 不传 → 代理自己创建，生命周期跟着代理走——这更接近**组合**

而这个默认值还是**立即求值**的：`new AngelababyAgent()` 的瞬间就 `new` 了一个 `Angelababy`，哪怕你根本没调 `answerPhone()`。

把它改成惰性求值，这段代码立刻从「保护代理」变成「虚拟代理 + 保护代理的合体」：

```typescript
class AngelababyAgent extends IStar {
  private _star?: Angelababy;
  // 📚 知识点：懒创建 —— 只有真正用到真实对象时才 new，这就是虚拟代理的核心手法
  private get star(): Angelababy {
    return (this._star ??= new Angelababy());
  }
  answerPhone(): void {
    this.star.available ? this.star.answerPhone() : console.log('Unavailable');
  }
}
```

**同一段代码，改一个创建时机，代理的分类就从「保护」跨到了「虚拟」。** 四类代理不是四套代码，而是同一套结构上四个不同的控制点——这是理解本模式最快的方式。

> 💬 **面试官**：代理类和被代理类为什么必须实现同一接口？
>
> ✅ 标准答案：因为代理模式的目标是「控制访问而不被察觉」。调用方拿到的是 `Subject` 类型的引用，它通过接口调用方法；只要代理实现了同一个接口，调用方就完全不需要知道自己拿到的是真实对象还是代理，也就不会因为引入代理而修改任何代码。这是代理能「透明插入」的结构前提，也直接对应开闭原则——新增控制逻辑不修改调用方。
>
> 🎁 加分答案：能指出「这一条也是它和适配器的分水岭」——适配器的目标恰恰相反，它就是要让接口变化，把不兼容的接口转成客户端期望的接口，所以适配器实现的是 `Target` 接口、持有的是 `Adaptee` 引用，两个接口**不同**。代理是「接口相同、行为受控」，适配器是「接口不同、目标兼容」。再加一句：「代理如果用继承真实类的方式实现，就变成了『覆盖实现』而不是『控制访问』，本质已经变了——所以必须是 `extends Subject` 而不是 `extends RealSubject`。」

---

## 四、虚拟代理：把开销挪到访问发生的那一刻

### 定义

**虚拟代理**（Virtual Proxy）：当一个对象的创建或加载成本很高，或者它在当前时刻根本用不上时，代理先顶上一个廉价的替身；等真正需要它的时候，才去创建或加载真实对象。

关键词是「**延迟**」。它不减少总工作量，只是把开销从「一开始」挪到「真需要时」。

笔记里的两个 demo——图片预加载和图片懒加载——正好是虚拟代理的两个方向：

- **预加载**：真实图片还没到，先用占位图顶上，图片到了再换——延迟的是「呈现」
- **懒加载**：真实图片现在不用，等滚进可视区再请求——延迟的是「请求」

### 图片预加载

笔记给了完整的 index.html 和 server.js。为了手机端读起来不累，我们把它拆成四段，四段合起来就是完整可运行的两个文件。

**第一段：结构与样式（index.html 的 HTML 部分）**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    .bg-container {
      width: 600px;
      height: 400px;
      margin: 100px auto;
    }
    .bg-container img {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="background">
    <button data-src="/img/1.jpg">img1</button>
    <button data-src="/img/2.jpg">img2</button>
  </div>
  <div class="bg-container">
    <img id="bg-image" src="./img/1.JPG" alt="" srcset="">
  </div>
```

注意这里的结构：两个按钮带着 `data-src`（要换的目标图），一个 `img#bg-image`（展示位）。

**第二段：真实对象 `BackgroundImage`**

```html
  <script>
    const bg = document.querySelector('#background');
    class BackgroundImage {
      constructor() {
        this.bgImg = document.querySelector('#bg-image');
      }
      setSrc(src) {
        console.log(this.bgImg, src)
        this.bgImg.src = src;
      }
    }
```

`BackgroundImage` 的责任极其单一：给它一个地址，它就把图换上去。**它不知道「加载」这件事需要时间，也不知道占位图的存在。** 这就是「真实对象保持纯粹」——所有复杂性都被代理吃掉了。

**第三段：代理对象 `LoadingBackgroundImage`**

```html
    // 代理类
    class LoadingBackgroundImage {
      static loadingUrl = '/img/loading.jpg';
      constructor() {
        this.backgroundImage = new BackgroundImage();
      }
      setSrc(src) {
        // 加载占位图
        this.backgroundImage.setSrc(LoadingBackgroundImage.loadingUrl);
        const image = new Image();
        image.onload = () => {
          console.log(this.backgroundImage)
          this.backgroundImage.setSrc(src);
        }
        image.src = src;
      }
    }
    const lbi = new LoadingBackgroundImage();
    bg.addEventListener('click', (event) => {
      const src = event.target.dataset.src;
      if(src) {
        lbi.setSrc(src);
      }
    });
  </script>
</body>
</html>
```

代理的 `setSrc` 做了三件事，顺序不能变：

1. **先挂占位图**：`this.backgroundImage.setSrc(loadingUrl)` —— 用户立刻看到 loading，不会看到空白
2. **开一个游离的 `Image` 去预加载**：`new Image()` 创建的对象不在 DOM 里，只用来探测「这张图什么时候下载完」
3. **下载完了再换**：`image.onload` 里才调 `this.backgroundImage.setSrc(src)`

**为什么不能直接 `this.bgImg.src = src`？** 因为直接换的话，浏览器会把旧图清空、开始下载新图，中间这段时间用户看到的是破图标或上一张图的残影。代理的解法是「**先在后台下好，再一次性替换**」——这就是预加载的全部奥义。

🔧 **这段代码里「接口一模一样」体现得最清楚的地方**：`BackgroundImage` 有一个 `setSrc(src)`，`LoadingBackgroundImage` 也有一个 `setSrc(src)`，签名、参数、返回值完全一致。如果哪天你觉得 loading 图太丑、想换成骨架屏，**只要把 `lbi` 换成 `new BackgroundImage()`，调用方那三行 `addEventListener` 一个字不用改**——这就是接口一致换来的可替换性。

**第四段：mock server（server.js）**

```javascript
const express = require('express');
const path = require('path');

const app = express();

app.get('/img/loading.jpg', (req, res) => {
  console.log(req.path)
  res.sendFile(path.join(__dirname, req.path));
})

app.get('/img/:name', (req, res) => {
  setTimeout(() => {
    res.sendFile(path.join(__dirname, req.path));
  }, 2000)
});

app.get('/', (req, res) => {
  res.sendFile(path.resolve('index.html'));
});

app.listen(8088);
```

这个 server 有一个非常关键的设计：**`/img/:name` 故意延迟 2000ms**。

为什么要故意慢？因为**不慢你就看不出代理在干什么**。如果图片瞬间返回，占位图一闪而过，你甚至不会注意到它存在。这个 2 秒的延迟是「放大镜」，让「先占位、后替换」这个动作变得肉眼可见。

**这是写教学 demo 时一个值得学的技巧：把要演示的时序人为拉长，让不可见的机制变得可见。**

### 图片懒加载

懒加载是虚拟代理的另一个方向：**不是「先占位后替换」，而是「根本还没开始」**。

笔记给出的原理是两条：

> + 当前可视区域的高度 `window.innerHeight || document.documentElement.clientHeight`
> + 元素距离可视区域顶部的高度 `getBoundingClientRect().top`

第二行涉及 `getBoundingClientRect` 这个 API，笔记里的说明值得完整保留：

> DOMRect 对象包含了一组用于描述边框的只读属性——left、top、right 和 button，单位为像素，除了 width 和 height 外的属性都是相对于视口的左上角位置而言。

（顺手勘误：原文的 `buttom` 应为 `bottom`。）

这两句话合起来就构成了判断依据：

```text
   viewport（视口）                  getBoundingClientRect().top
 ┌──────────────────────────┐  ▲  0
 │                          │  │
 │  ┌────────────────────┐  │  │
 │  │  已经滚进视口的区域   │  │  │  ← top < clientHeight：可见，该加载
 │  └────────────────────┘  │  │
 │                          │  │
 │                          │  │
 └──────────────────────────┘  ▼  clientHeight（视口高度）
             ▲
             │  还没进入的地方，top > clientHeight，先不加载
```

**为什么 `clientHeight > top` 就代表可见？** 因为 `top` 是元素上边缘相对于视口顶部的距离：元素刚好从视口底部露头时，`top` 正好等于 `clientHeight`；再往上滚一点，`top` 就小于 `clientHeight` 了。所以「`top` 小于视口高度」= 「元素上边缘已经在视口内」。

**第二段：index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    .image {
      width: 300px;
      height: 200px;
      margin: 120px auto;
    }
    .image img {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div class="bg-container">
    <div class="image">
      <img data-src="./img/1.JPG">
    </div>
    <div class="image">
      <img data-src="./img/2.JPG">
    </div>
    <div class="image">
      <img data-src="./img/3.JPG">
    </div>
```

中间省略的第 4~10 个 `.image` 结构与上面完全一致，只是 `data-src` 依次递增到 `./img/10.JPG`。后面是脚本：

```html
  <script>
    const imgs = document.querySelectorAll('img');
    const clientHeight = window.innerHeight || document.documentElement.clientHeight;
    
    function lazy() {  
      for (let i = 0; i < imgs.length; i++) {
        const element = imgs[i];
        const top = element.getBoundingClientRect().top;
        console.log(`top=${top}, clientHeight=${clientHeight}`)
        if(clientHeight > top) {
          element.src = element.dataset.src;
        }
      }
    }

    lazy();
    window.addEventListener('scroll', lazy, false);
  </script>
</body>
</html>
```

这里有两个调用点，含义不同：

- **`lazy()`（首次调用）**：页面一进来先算一次，把「本来就在首屏」的图先加载掉。**少了这一句，用户不滚动就永远看不到第一屏的图**
- **`window.addEventListener('scroll', lazy)`**：每次滚动都重算一遍，把新进入视口的图补上

**这个 demo 的 server 与预加载示例是同一份**（8088 端口、`/img/:name` 延迟 2 秒），此处不再重复贴。

**这段笔记代码有两个工程缺陷，值得指出来。** 学习时用没问题，但面试时说「我项目里就这么写的」会被追问穿：

- **缺陷一：每次 `scroll` 都遍历全部 `<img>`。** 10 张图还好，200 张图、每帧遍历 200 次 `getBoundingClientRect()`——`getBoundingClientRect` 会触发样式计算甚至重排，滚动时的性能损耗非常真实
- **缺陷二：已经加载过的图没有跳过。** 第二屏滚过去再滚回来，那 10 张图会被**重复赋一次 `src`**。虽然浏览器有缓存不会重复下载，但赋值本身会触发一次属性写入

两个缺陷的修法都很简单：加一个「已加载」标记，并且从待办列表里把它移除。

```javascript
function lazy() {
  const pending = imgs.filter((el) => !el.dataset.loaded);
  // 📚 知识点：把已加载的图从待办里剔除，避免每次 scroll 重复遍历、重复赋值
  for (const el of pending) {
    if (clientHeight > el.getBoundingClientRect().top) {
      el.src = el.dataset.src;
      el.dataset.loaded = '1';
    }
  }
}
```

### 现代替代：`IntersectionObserver`

笔记的 `scroll` 方案是 2021 年的主流写法，但今天有更干净的做法——浏览器原生的 `IntersectionObserver`。

它的思路是把「**元素和视口有没有相交**」这件事交给浏览器去判断，而不是你手动算位置：

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    el.src = el.dataset.src;
    observer.unobserve(el); // 📚 加载完就取消观察，避免持续回调
  });
}, { rootMargin: '200px' }); // 提前 200px 开始加载，滚动时不闪白

document.querySelectorAll('img[data-src]').forEach((el) => observer.observe(el));
```

**注意 `observer.unobserve(el)` 这一句**——它正好补上了前面说的「缺陷二」：加载完就移除观察，天然不会重复触发。

两种方案对比：

| 维度 | scroll + getBoundingClientRect | IntersectionObserver |
|------|------|------|
| 位置计算 | 每帧手动算 | 浏览器内部算 |
| 主线程开销 | 高（`getBoundingClientRect` 触发样式计算） | 低（原生异步回调） |
| 节流 | 需要自己加 throttle | 不需要，回调本身就很稀疏 |
| 重复触发防护 | 要自己标记 | `unobserve()` 一行解决 |
| 提前加载 | 自己加偏移量 | `rootMargin` 配置 |
| 兼容性 | 全兼容 | 现代浏览器（IE 不支持） |

> 📚 **知识点**：`IntersectionObserver` 是「虚拟代理」的一个更彻底的实现——它把「判断该不该加载」这件事也代理掉了，连判断代码都不在你手里。用设计模式的话说：**它不是换了一种代理写法，而是把代理的「控制点」下沉到了平台层。** 你在业务层写的代码从「判断 + 加载」变成了只有「加载」，控制逻辑完全消失。

### 收口：虚拟代理的本质

把「预加载」和「懒加载」放在一起看，两者的差异只在延迟的方向：

```text
    预加载（先占位，后替换）          懒加载（先不请求，后请求）
  ┌────────┬──────────────┐      ┌──────────────┬──────────┐
  │ 时间轴  │ 占位图 → 真图 │      │ 时间轴        │ 请求 → 显示│
  ├────────┼──────────────┤      ├──────────────┼──────────┤
  │ 用户看到│ 立刻有内容    │      │ 用户看到      │ 滚到才出现 │
  │ 节省的  │ 空白的等待时间│      │ 节省的        │ 无用的流量 │
  └────────┴──────────────┘      └──────────────┴──────────┘
```

但它们的内核完全一样：**真实对象（那张图）始终是同一个，只是「什么时候创建它、什么时候让它露面」被代理接管了。**

一句话记住虚拟代理：

> **虚拟代理不减少工作量，它改变工作量的发生时间。**

🔧 **真实场景（示意口径）**：处方审核列表一屏 20 张处方笺，单张约 800KB，改造前首屏并发 20 个请求、约 16MB；改成懒加载 + `rootMargin: '200px'` 预取后，首屏只发 3~4 个请求、约 3MB，首屏图片可见时间从 2s 量级降到 500ms 量级。**关键收益不是「更快」，而是「用户看不到的部分一次性都不下」。**

> 💬 **面试官**：图片懒加载用代理模式怎么描述？它和直接监听 `scroll` 有区别吗？
>
> ✅ 标准答案：懒加载是虚拟代理——`<img>` 元素本身（真实对象的入口）一直存在，但真正的图片资源被延迟加载：先用 `data-src` 或占位图顶替，等元素进入可视区才把地址赋给 `src`，这时才真正发起请求。调用方（页面渲染逻辑）不需要知道加载时机被推迟了，接口仍然是同一个 `<img>` 元素、同一个 `src` 属性。至于 `scroll` 还是 `IntersectionObserver`，那只是**判断时机的技术手段**，不影响它是不是代理模式——两者都是虚拟代理，区别在主线程开销和重复触发的防护。
>
> 🎁 加分答案：能补三点——① `IntersectionObserver` 的 `rootMargin` 可以在元素进入视口**之前**就开始加载，消除滚动闪白，这比 `scroll` 版手动加偏移量干净得多；② 加载完要 `unobserve()`，否则元素反复进出视口会反复触发回调，这也是 `scroll` 版必须手动加「已加载」标记的原因；③ 能划清「懒加载 ≠ 享元」——懒加载减少的是**请求次数/加载时机**，享元减少的是**对象实例数量**（虚拟列表复用 DOM 节点），两者常被混为一谈，第 09 篇会专门对比。

---

## 五、缓存代理：空间换时间的三层递进

### 定义

**缓存代理**（Cache Proxy）：在调用真实对象之前先查缓存，命中则直接返回缓存结果，未命中才放行到真实对象，并把结果写回缓存。

关键词是「**是否真的执行**」。虚拟代理控制「何时创建」，缓存代理控制「要不要执行」。

笔记开头有一句话点得极准：

> 有时候可以用空间换时间。

这就是缓存代理的全部经济学：用一份内存，换掉一次重复计算。

### 阶乘：最小可运行的缓存代理

先看笔记给的第一版。

一个正整数的阶乘（factorial）是所有小于及等于该数的正整数的积，并且 0 的阶乘是 1。

```typescript
const factorial = function (num: number): number {
  if (num === 1) {
    return 1
  } else {
    return (num * factorial(num - 1))
  }
}

const proxy = function (fn: Function) {
  const cache: Record<string, any> = {}; // 缓存对象
  return function(num: number) {
    console.log(cache)
    if(num in cache) {
      return cache[num];
    }
    return cache[num] = fn.call(this, num);
  }
}

const proxyFactorial = proxy(factorial);
console.time();
console.log(proxyFactorial(50));
console.timeEnd();
console.time();
console.log(proxyFactorial(50));
console.timeEnd();
console.time();
console.log(proxyFactorial(50));
console.timeEnd();
```

这段代码的精妙之处在结构：`proxy(fn)` 返回的不是一个新算法，而是**一个和 `fn` 同签名的新函数**。

```text
   proxyFactorial(50)
          │
          ▼
   ┌──────────────┐  num in cache?  ┌──────────────┐
   │  缓存代理层   │ ────── 是 ────▶ │ 直接返回缓存  │
   └──────┬───────┘                 └──────────────┘
          │ 否
          ▼
   ┌──────────────┐
   │ factorial(50)│ ──▶ cache[50] = 结果，返回
   └──────────────┘
```

三次调用 `proxyFactorial(50)`，第一次走完整递归，第二三次直接命中缓存。这就是缓存代理在性能上的全部意义。

**这里有两个细节值得抠：**

**细节一：为什么用 `num in cache` 而不是 `if (cache[num])`？**

因为真值判断会把「缓存了 `0` / `''` / `false` / `null`」的情况误判成「没缓存」。`in` 判断的是**键是否存在**，与值是什么无关。这是一个非常经典的缓存代理 bug——斐波那契那一节你会看到笔记里恰好用了真值判断，我们对比着讲。

**细节二：`fn.call(this, num)` 里的 `this` 是什么？**

是 `proxy` 返回的那个匿名函数的 `this`。这种写法保证了「调用方用什么上下文调代理，真实函数就用什么上下文执行」——也就是**代理对 `this` 是透明的**。写成 `fn(num)` 的话，`this` 就丢了。这跟第九节要讲的 `$.proxy` 是同一件事的另一面。

**顺手指出这段笔记代码的一个隐藏坑**：`factorial(50)` 的结果是 `3.0414093201713376e+64`，早已远超 `Number.MAX_SAFE_INTEGER`（约 9×10¹⁵），后面的位数全是浮点误差。

但这**恰好说明了缓存代理的本质**：它的价值不是「算得对」，而是「**不用算第二次**」。第一次返回什么，后面三次就返回什么——包括那个不精确的结果。**缓存的语义是「一致」，不是「正确」**。这个认知在面试里说出来，比背十遍定义都管用。

### 斐波那契：O(2ⁿ) 到 O(n)

笔记给的第二个例子更能说明问题。斐波那契数列指的是这样的一个数列：`1，1，2，3，5，8，13，21，34`。在数学上，斐波那契数列以如下递推的方式定义：`F(1)=1, F(2)=1, F(n)=F(n-1)+F(n-2)(n>3)`。

先看朴素版：

```typescript
function fibonacci(n: number): number {
  return n <= 2 ? 1 : fibonacci(n-1) + fibonacci(n-2);
}
```

这个函数有一个致命的重复计算问题。画一下 `fibonacci(5)` 的调用树：

```text
                    fib(5)
                  /        \
              fib(4)       fib(3)        ← fib(3) 算了两遍
             /     \       /     \
         fib(3)  fib(2) fib(2) fib(1)    ← fib(3) 又出现
         /    \
     fib(2) fib(1)
```

`fib(3)` 被算了两次，`fib(2)` 被算了三次。n 越大，重复越夸张——复杂度是 **O(2ⁿ)**，`fibonacci(40)` 大约要 3 亿次函数调用，直接卡死。

再看笔记的缓存版：

```typescript
const fibonacciCache = (function() {
  const cache: Record<string, number> = {};
  function fibonacci(n: number): number {
    if(cache[n]) {
      return cache[n];
    }
    const result = n <= 2 ? 1 : fibonacci(n-1) + fibonacci(n-2);
    cache[n] = result;
    return result;
  }
  return fibonacci;
})();

console.time();
console.log(fibonacci(20));
console.timeEnd();
console.time();
console.log(fibonacci(20));
console.timeEnd();

console.time();
console.log(fibonacciCache(20));
console.timeEnd();
console.time();
console.log(fibonacciCache(20));
console.timeEnd();
```

这个版本用了 **IIFE + 闭包**：`cache` 是闭包里的私有变量，外部拿不到也改不了，`fibonacciCache` 是唯一入口。这是「缓存」最干净的封装方式。

**注意 `if(cache[n])` 这里是真值判断，而不是 `in`。**

对斐波那契来说它恰好不出错——因为每一项的值都是 ≥1 的正数，永远不可能是 `0` / `''` / `false`。但这是个**运气**，不是设计。如果换成「返回值为 0 也算有效」的场景（比如统计某个词出现次数），这个缓存会永久失效、每次都重算。

**这就是前面说的那两个细节为什么重要**：`in` 判断「键存在」，真值判断「值非空」。缓存代理里应该用前者。

**测试代码里还有一个很容易被忽略的对比点**：`fibonacci(20)` 被调用了**两次**，第二次并没有变快——因为朴素版没有缓存。而 `fibonacciCache(20)` 的第二次几乎是 0ms。**这段 `console.time` 对比的真正目的，是让你看到「第二次调用」的时间差，而不是「第一次有多快」。**

**缓存放哪？三种选择：**

| 位置 | 写法 | 生命周期 | 适用 |
|------|------|---------|------|
| 闭包私有 | IIFE 里的 `const cache = {}` | 与返回的函数同生共死 | 单例式工具函数（斐波那契、格式化） |
| 模块级变量 | 模块顶层的 `const cache = new Map()` | 整个应用运行期 | 全局共享缓存（价格表、配置） |
| 实例字段 / `WeakMap` | `this._cache` 或 `new WeakMap()` | 跟实例走，实例销毁即释放 | 类方法的缓存，尤其对象作为 key 时 |

第三种是工程上最容易被忽略的一种。**当缓存的 key 是对象时，用 `WeakMap` 能让「对象被回收时缓存自动消失」**，避免「缓存比被缓存的东西活得更久」这种典型内存泄漏。

### ES6 Proxy 版缓存代理

前面两版都是「函数包装」式的缓存代理。用 ES6 `Proxy` 来写，可以把「缓存」这件事做成**通用能力**——任何对象的任何方法都能被自动缓存，不需要为每个函数写一遍包装。

```typescript
// 缓存代理：拦截重复的药品价格查询
function createCacheProxy<T extends object>(target: T, ttl = 5000): T {
  const cache = new Map<string, { value: any; time: number }>();
  return new Proxy(target, {
    get(obj, prop: string) {
      const original = obj[prop as keyof T];
      if (typeof original !== 'function') return original;
      return (...args: any[]) => {
        const key = `${prop}:${JSON.stringify(args)}`;
        const hit = cache.get(key);
        if (hit && Date.now() - hit.time < ttl) return hit.value;
        const result = (original as Function).apply(obj, args);
        cache.set(key, { value: result, time: Date.now() });
        return result;
      };
    },
  });
}
```

先说它做对了什么，这在工程上非常实用：

- **一个代理接管所有方法**：`createCacheProxy(priceService)` 之后，`priceService` 的每一个方法都自动带缓存，不用逐个包
- **`typeof original !== 'function'` 的提前返回**：读取非方法属性（比如 `priceService.baseUrl`）时直接透传，不做包装——这是必须的，否则连配置字段都会被包成函数
- **TTL 判定写在命中检查里**：`Date.now() - hit.time < ttl`，过期就重新取。药品价格这种「短期不变、过期要新」的数据，TTL 是标配

**但这段代码有三处可改进点**，这是本篇最值得停下来读的地方——**能把别人的实现看出问题，才是「掌握」和「会用」的分界**。

**问题一：`obj[prop]` 直接取值，绕过了 `receiver`。**

正确的写法应该是 `Reflect.get(obj, prop, receiver)`。差别在哪？

如果 `target` 是一个带 getter、或者被别的代理包着的对象，直接 `obj[prop]` 就丢失了 `receiver`（当前这个代理/继承者），getter 里的 `this` 会指向原始对象而不是调用方期望的对象。在当前这个「缓存方法」的场景里影响不大（因为方法本身不依赖 `this` 的代理身份），但**作为一个通用工具函数，这是隐患**。

**问题二：每次 `get` 都返回一个新函数，破坏了引用相等。**

```typescript
const p = createCacheProxy(priceService);
p.getPrice === p.getPrice; // false！
```

因为 `get` trap 里每次 `return (...args) => {...}` 都创建了一个新的箭头函数。这会带来两个真实问题：

- **React 场景下直接出事**：把 `p.getPrice` 作为 `useEffect` 的依赖，或者传给 `React.memo` 组件，每次渲染都是新引用，导致无限重渲染 / memo 失效
- **无法 `removeEventListener`**：如果你把 `p.onSomething` 作为事件回调注册，之后想移除就找不到同一个函数引用

修法是**缓存包装后的函数本身**，而不只是缓存结果：

```typescript
function createCacheProxy<T extends object>(target: T, ttl = 5000): T {
  const resultCache = new Map<string, { value: unknown; time: number }>();
  const fnCache = new WeakMap<Function, Function>(); // 📚 知识点：缓存包装后的函数，保证引用稳定
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const original = Reflect.get(obj, prop, receiver);
      if (typeof original !== 'function') return original;
      if (fnCache.has(original)) return fnCache.get(original);
      const wrapped = (...args: unknown[]) => {
        const key = JSON.stringify(args);
        const hit = resultCache.get(key);
        if (hit && Date.now() - hit.time < ttl) return hit.value;
        const value = original.apply(obj, args);
        resultCache.set(key, { value, time: Date.now() });
        return value;
      };
      fnCache.set(original, wrapped);
      return wrapped;
    },
  });
}
```

**问题三：缓存 key 用 `JSON.stringify(args)`，参数含对象时可能漏命中。**

`JSON.stringify({ a: 1, b: 2 })` 和 `JSON.stringify({ b: 2, a: 1 })` 得到的是 `'{"a":1,"b":2}'` 和 `'{"b":2,"a":1}'`——**两个不同的字符串，但语义相同**。如果调用方传的对象字面量属性顺序不一样（这在实际代码里非常常见），缓存就会 miss。

三种处理方式，按成本递增：

- 只缓存「参数是基本类型」的调用（大部分业务场景够用）
- 对象参数排序后再序列化（增加开销、且遇嵌套对象要递归）
- 引入稳定的序列化库或自定义 hash（比如只取关键字段）

**「缓存 key 的设计」是手写缓存代理时面试官最爱追的一句**，因为它同时考了「你想不想得到边界」和「你知不知道代价在哪」。

**三个工程问题的处理：**

| 问题 | 现象 | 处理 |
|------|------|------|
| 缓存过期 | 数据变了但读到的还是旧值 | TTL（如上）+ 主动 `invalidate(key)` |
| 内存无界 | 长期运行后 `Map` 越积越大 | 定容量 LRU、定时清理、`WeakMap` |
| 异步结果 | `async` 方法返回 Promise，缓存的是 Promise 而不是值 | 缓存 Promise 可以顺带做**请求合并**（同一 key 并发只发一次），但要处理 reject 后不清缓存的问题 |

第三点特别值得说：**缓存 Promise 是「缓存代理」在前端最有价值的用法之一**——它同时解决了「重复请求」和「并发请求合并」。这也解释了为什么很多请求库里都会内置一个 in-flight 请求表。

### 防抖与节流：最容易被误称为「代理」的包装

笔记把这一节归在「代理」下面，标题叫「防抖代理」，并且给了一句很到位的描述：

> 通过防抖代理优化可以把多个请求合并为一次，提高性能。

这句话描述的**效果**是对的，但把防抖/节流称为「代理模式」是**不准确的**。这一节我们先把笔记的完整代码保留下来，再讲清楚它为什么不该算代理。

笔记对两者的定义：

> 节流与防抖都是为了减少频繁发事件回调
>
> 节流（Throttle）是在某段时间内不管发了多少次回调都只认第一个，并在第一次结束后执行回调
>
> 防抖（Debounce）就是在某段时间不管触发多少回调只看最后一个

**节流：时间戳版（立即执行）**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    .container {
      height: 400px;
      width: 300px;
      border: 1px solid royalblue;
      overflow: auto;
    }
    .content {
      height: 5000px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="content"></div>
  </div>
  <script>
    /**
     * 立即执行版（时间戳版）
     * callback 回调函数
     * interval 执行间隔 ，单位毫秒
     */
    function throttle(callback, interval) {
      let last = 0; // 上次执行时间
      return function() {
        const context = this;
        const args = Array.from(arguments);
        const now = Date.now();
        if(now - last > interval) {
          callback.apply(context, args);
          last = now;
        }
      }
    }

    const container = document.querySelector('.container');
    let lastTime = Date.now();
    const scrollEvent = (event) => {
      const nowDate = Date.now();
      console.log(`触发了滚动事件，${(nowDate - lastTime) / 1000} 秒`);
      lastTime = nowDate;
    }
    container.addEventListener('scroll', throttle(scrollEvent, 1000), false);
  </script>
</body>
</html>
```

**节流：定时器版（延迟执行）**

```html
  <script>
    /**
     * 延迟执行版（定时器版）
     * callback 回调函数
     * interval 执行间隔 ，单位毫秒
     */
    function throttle1(callback, interval) {
      let timer; // 上定时器
      return function() {
        const context = this;
        const args = Array.from(arguments);
        if(!timer) {
          timer = setTimeout(() => {
            callback.apply(context, args);
            timer = null;
          }, interval);
        }
      }
    }
  </script>
```

（上面两段是同一份 HTML demo 里的两个函数，`throttle1` 的定义与 `throttle` 并列，调用时把 `throttle(scrollEvent, 1000)` 换成 `throttle1(scrollEvent, 1000)` 即可。）

两种节流的差异，一句话总结：

| 版本 | 第一次触发 | 最后一次触发 | 典型用途 |
|------|-----------|------------|---------|
| 时间戳版 `throttle` | **立刻执行** | 如果最后一次落在间隔内，**会被丢弃** | 按钮防连点、立即响应的场景 |
| 定时器版 `throttle1` | **延迟 interval 后执行** | 保证执行一次 | 滚动上报、可以接受延迟的场景 |

**这个「最后一次会不会丢」的区别，是节流面试的高频追问点。** 时间戳版在停止滚动的那一刻，如果距上次执行不足 1 秒，最后那段滚动就永远不会被记录；定时器版至少保证「最后一个窗口内有一次执行」。要两者兼得，就得写「时间戳 + 定时器」的混合版。

**防抖**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    .container {
      height: 400px;
      width: 300px;
      border: 1px solid royalblue;
      overflow: auto;
    }
    .content {
      height: 5000px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="content"></div>
  </div>
  <script>
    /**
     * 立即执行版
     * callback 回调函数
     * interval 执行间隔 ，单位毫秒
     */
    function debounce(callback, interval) {
      let timer; // 定时器
      return function() {
        const context = this;
        const args = Array.from(arguments);
        if(timer) {
          clearTimeout(timer);
        }
        const callNow = !timer;
        timer = setTimeout(() => {
          callback.apply(context, args);
          timer = null;
        }, interval);
        if(callNow) callback.apply(context, args);
      }
    }

    const container = document.querySelector('.container');
    let lastTime = Date.now();
    const scrollEvent = (event) => {
      const nowDate = Date.now();
      console.log(`触发了滚动事件，${(nowDate - lastTime) / 1000} 秒`);
      lastTime = nowDate;
    }
    container.addEventListener('scroll', debounce(scrollEvent, 1000), false);
  </script>
</body>
</html>
```

**这里的注释和实现对不上，必须点出来。**

注释写的是「立即执行版」，但实现里有两处执行：

- `if (callNow) callback.apply(context, args)` —— 首次触发时**立刻**执行一次
- `setTimeout(..., interval)` 里又执行一次 —— 间隔结束后**再**执行一次

所以它是一个「首次立即 + 末尾再触发」的**混合版**，不是纯粹的「立即执行版」。真正的立即执行版应该是「首次立即、间隔内不再执行」：

```javascript
function debounceImmediate(callback, interval) {
  let timer;
  return function() {
    const context = this;
    const args = Array.from(arguments);
    const callNow = !timer;
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; }, interval);
    if (callNow) callback.apply(context, args);
    // 📚 知识点：立即执行版不保留"末尾补一次"，只在第一次触发时响应
  }
}
```

**这类「注释和实现对不上」的问题，在 code review 里是要敢提的。** 它不是功能 bug（代码能跑、防抖效果也在），但它会误导后来人——下一个看这段代码的人会以为「立即执行版」就是这个样子，然后在别的项目里照抄出一个「滚动停止后还多执行一次」的行为。

**现在说回正题：为什么防抖/节流不算代理模式？**

回到代理模式的三个形式要求：

| 要求 | 代理模式 | 防抖/节流 |
|------|---------|----------|
| 有真实对象（RealSubject） | 有明确的被代理对象 | 只有一个回调函数 |
| 代理和真实对象实现同一接口 | 同一个 `Subject` 接口 | 确实都是函数（形式上勉强算） |
| 代理控制**访问**（放行/拒绝/延迟） | 核心目的 | 控制的是**执行频率**，不是访问 |

关键在第三条。代理控制的是「**你这次能不能进来**」——保护代理说「你不能」，缓存代理说「你不用进，我已经有结果了」，虚拟代理说「你晚点再进」。它们判定的是**访问的有效性**。

防抖/节流控制的是「**你来得太频繁，我按某个节奏处理你**」——它不拒绝任何一次触发，它只是改变了处理节奏。**所有触发都被接受了，只是被合并/丢弃了。**

用第 00 篇那句话来定位：**防抖/节流的本质是「函数包装」，它的意图是「控制执行频率」，它更接近装饰器**（第 06 篇讲的「不改原对象、运行时包装」）——甚至严格说，它连装饰器都不完全算，因为装饰器要求「包装后接口不变且增强职责」，而防抖改变了「调用一次 = 执行一次」这个语义。

**所以准确的表述是：**

> 防抖/节流是**性能优化手段**，结构上是高阶函数/函数包装。它们和代理模式共享「包一层」这个直觉，但不满足代理模式「控制对对象的访问」这个意图，**不属于 GoF 23 种模式**。

面试时如果面试官问「防抖是代理模式吗」，标准答法是：**先说不是，再说为什么不是，最后说它像什么**。这个回答顺序能立刻把你和「嗯……算吧？」的人分开。

> 💬 **面试官**：手写一个缓存代理，你会考虑哪些问题？
>
> ✅ 标准答案：先说结构——缓存代理是「拦截重复调用」，命中则直返、未命中才执行并写回。然后分四点讲：① **缓存 key 怎么设计**：方法名 + 参数序列化，注意对象参数的属性顺序会导致 false miss，也能考虑只对基本类型参数缓存；② **什么时候失效**：TTL 时间窗（适合药品价格这种短期不变的数据）或者主动 `invalidate`，没有失效机制的缓存就是 bug 制造机；③ **内存会不会涨**：`Map` 无界增长要配合 LRU 或定时清理，key 是对象时优先 `WeakMap` 让缓存随对象回收；④ **引用是否稳定**：如果代理 `get` 每次返回新函数，`proxy.fn !== proxy.fn`，会破坏 React 依赖比较和事件解绑，要把包装后的函数缓存起来。
>
> 🎁 加分答案：能补上异步场景——「缓存 `Promise` 而不是缓存值，可以顺带实现**请求合并**：同一 key 的并发请求只发一次，后来者拿到同一个 Promise。但要处理 reject 时清掉缓存，否则一次失败会被永久缓存。这也是为什么很多请求库内部都维护一张 in-flight 表。」再加一句辨析：「缓存代理和享元的区别是减少**调用次数** vs 减少**对象数量**；和防抖的区别是——防抖不拒绝任何调用，只是合并节奏，代理是真的不让这次调用进去。」

---

## 六、保护代理：从经纪人到 ES6 Proxy 的 13 个 trap

### 定义

**保护代理**（Protection Proxy）：在访问真实对象之前先判断访问者是否有权限，根据结果决定**放行、拒绝还是降级**。

关键词是「**谁能访问**」。前面两类控制的是时机和次数，这一类控制的是身份。

### 业务版保护代理

先把它写成生产可用的样子。假设有三种角色：医生、护士、药师，对处方有三种操作：读、写、审。

```typescript
type Role = 'doctor' | 'nurse' | 'pharmacist';
interface Prescription { id: string; drugName: string; status: 'draft' | 'audited' }

// 真实对象：只关心业务，一行权限代码都没有
class PrescriptionService {
  read(id: string): Prescription { /* ... */ return { id, drugName: '', status: 'draft' }; }
  write(id: string, patch: Partial<Prescription>): void { /* ... */ }
  audit(id: string, pass: boolean): void { /* ... */ }
}

// 📚 知识点：权限规则集中在一张表里，新增角色只改这张表，业务类零改动（OCP）
const PERMISSIONS: Record<Role, Array<keyof PrescriptionService>> = {
  doctor: ['read', 'write'],
  nurse: ['read'],
  pharmacist: ['read', 'audit'],
};

class PrescriptionGuardProxy {
  constructor(
    private real: PrescriptionService,
    private role: Role,
  ) {}
  private assert(method: keyof PrescriptionService) {
    if (!PERMISSIONS[this.role].includes(method)) {
      throw new Error(`角色 ${this.role} 无权执行 ${method}`);
    }
  }
  read(id: string) { this.assert('read'); return this.real.read(id); }
  write(id: string, patch: Partial<Prescription>) { this.assert('write'); this.real.write(id, patch); }
  audit(id: string, pass: boolean) { this.assert('audit'); this.real.audit(id, pass); }
}
```

这段代码值得讲三件事。

**第一，为什么权限判断不该散落在业务方法里。**

假设有 30 个业务方法，每个方法开头都写一遍 `if (!hasPermission(role, 'write')) throw ...`：

- **改一次规则要改 N 处**：产品说「护士长也能改方」，你得翻遍 30 个方法找出所有 `write` 相关的判断
- **漏一处就是漏洞**：新增第 31 个方法时忘了加判断，就是一条越权路径
- **业务逻辑被污染**：一个方法里既有「怎么改处方」又有「谁能改处方」，两个变化原因，违反单一职责

收进代理后：业务类只关心业务（`PrescriptionService` 里一行 `role` 都没有），权限规则只在一张表里，代理层只做转发和拦截。**职责分离得干干净净。**

**第二，拒绝的三种方式，选哪个要看语义。**

| 方式 | 写法 | 适用 | 副作用 |
|------|------|------|--------|
| **抛错** | `throw new Error('无权限')` | 明确不该发生的越权，需要被监控发现 | 调用方必须有 try/catch，否则整条链路断掉 |
| **返回空值** | `return null` / `[]` | 列表类查询，无权限当「没数据」 | 调用方分不清「没数据」和「没权限」，可能掩盖 bug |
| **静默忽略** | 直接 `return`，不执行 | UI 上本来就不该点到的按钮（二次防护） | 最难排查，用户以为操作成功了 |

**选型原则**：业务操作越权 → 抛错；查询类越权 → 返回空 + 打点；UI 已禁用但可能有并发/脚本调用 → 静默 + 日志。**「静默忽略」是最后手段，因为它会让问题隐身。**

回到第三节那个经纪人例子：`available === false` 时它做的正是「静默忽略」——接了电话但只说「没空」，不报错。因为对粉丝来说，「打不通」比「被拒绝」体验更自然。**同一个模式，拒绝方式该按业务语义定，没有标准答案。**

**第三，也是最容易被忽略的一条：前端权限拦截不是安全边界。**

这一点必须单独拎出来说，因为它是保护代理最容易被误用的地方。

前端代理能做的：
- 拦住用户的**误操作**（不该点的按钮）
- **减少无效请求**（明知会 403 就别发）
- 提前给出**友好提示**（而不是等后端返回一个 500）

前端代理**做不到**的：
- 防止有人打开 DevTools 直接改代码
- 防止有人用 curl 直接调接口
- 防止篡改 `role` 变量

**真实鉴权必须在服务端做。** 前端保护代理的定位是「**减少无效请求 + 提升体验**」，不是「安全防线」。这句话在面试里说出来，是加分项——因为它表明你分得清「架构分层」和「安全边界」。

### ES6 Proxy：语言层面的动态代理

前面的保护代理是「静态代理」——手写一个 `PrescriptionGuardProxy`。ES6 `Proxy` 提供的是「动态代理」：不用手写代理类，直接在语言层面拦截对象的一切操作。

笔记给的例子非常直观：

```typescript
const girl: Record<string, any> = {
  name: 'robin',
  age: 31,
  height: 160
}

const girlAgent = new Proxy(girl, {
  get(target, key, receiver) {
    if(key === 'age') {
      target[key] = target[key] - 5;
    } else if(key === 'height') {
      target[key] = target[key] + 5;
    }
    return Reflect.get(target, key, receiver);
  },
  set(target, key, value,receiver): boolean {
    if(key === 'boyfriend') {
      if(value.age > 40) {
        throw new Error('年龄太大了');
      } else if(value.salary < 20000) {
        throw new Error('工资太低了');
      }
    }
    return Reflect.set(target, key, value, receiver);
  }
});

console.log(girlAgent.age);
console.log(girlAgent.height);
console.log(girlAgent.name);
girlAgent.boyfriend = {
  age: 30,
  salary: 10000
}
```

这段代码里藏着一个代理模式的**双面教材**，我们拆开看。

**`get` trap 里的「读一次 age 就减 5」：副作用型拦截。**

```typescript
if (key === 'age') {
  target[key] = target[key] - 5;  // ⚠️ 读操作却修改了数据
}
```

**这是一个真实项目里几乎绝不能用的写法**：读一个属性居然修改了它，多读几次年龄就变成负数了。它存在的意义只有一个——**让你一眼看到「trap 的位置在哪」**：`get` 拦截的是「读」，`set` 拦截的是「写」，位置一目了然。

用它当「可见性的教学道具」非常合适，但当「生产代码参考」就是灾难。面试时如果提到这个例子，一定要补一句「这是 demo 写法，真实场景里 `get` 只做取值和依赖收集，不做修改」——否则面试官会怀疑你没分清。

**`set` trap 里的 `age / salary` 校验：这就是保护代理。**

```typescript
set(target, key, value, receiver): boolean {
  if (key === 'boyfriend') {
    if (value.age > 40) throw new Error('年龄太大了');
    else if (value.salary < 20000) throw new Error('工资太低了');
  }
  return Reflect.set(target, key, value, receiver);
}
```

把「设置男朋友」这个动作的准入条件集中在一处：年龄不能超 40、工资不能低于 2 万。**这就是保护代理：在写入真实对象之前先判断，不满足就抛错。**

注意最后那句 `girlAgent.boyfriend = { age: 30, salary: 10000 }` 会抛错——`salary` 10000 < 20000。

**`Reflect.get` / `Reflect.set` 的第三个参数 `receiver`，是最容易写错的地方。**

为什么不能写成 `target[key] = value; return true`？

因为它丢掉了 `receiver`。`receiver` 是什么？**它就是「这次操作是从谁身上发起的」——通常是那个代理对象本身，或者继承链上的调用者。**

一个最小例子就能看懂：

```typescript
const base = { _v: 1, get v() { return this._v; } };
const p = new Proxy(base, {
  get(target, key, receiver) {
    // receiver 在这里就是 p 本身
    return Reflect.get(target, key, receiver);
  },
});
// 如果写成 return target[key]，getter 里的 this 会指向 base
// 用 receiver，getter 里的 this 才会指向 p —— 从而能继续触发 p 的 trap
```

**这个「transparent forwarding（透明转发）」是写代理时的铁律**：所有 trap 都应该用 `Reflect` 配合 `receiver` 转发，而不是直接操作 `target`。否则要么丢失 `this`，要么导致 trap 递归失效（比如在 `get` 里写 `target[key]`，如果 target 本身就是代理，就会又触发一次 trap，或者绕过本应触发的 trap）。

> 📚 **知识点**：Vue3 的 `reactive` 就是靠 `receiver` + `Reflect` 实现「嵌套对象访问时继续代理」的。它只代理访问到的那一层，子对象在被访问时才被包成新的 Proxy——这也是第七节要讲的「惰性代理」。

### 13 个 trap 全景表

ES6 `Proxy` 一共有 13 个 trap（陷阱），可以拦截对象的几乎所有操作。这是笔记里没有展开的部分，但它是回答「Proxy 到底能干什么」的完整答案：

| trap | 拦截的操作 | 常见用途 |
|------|-----------|---------|
| `get` | 读属性（`obj.x`、`obj[x]`） | 响应式依赖收集、缓存、默认值 |
| `set` | 写属性（`obj.x = v`） | 校验、响应式触发、只读保护 |
| `has` | `in` 运算符（`'x' in obj`） | 隐藏私有字段 |
| `deleteProperty` | `delete obj.x` | 禁止删除关键字段 |
| `ownKeys` | `Object.keys` / `Object.getOwnPropertyNames` / `for...in` | 过滤敏感字段 |
| `getOwnPropertyDescriptor` | `Object.getOwnPropertyDescriptor` | 与 `ownKeys` 配合保持一致性 |
| `defineProperty` | `Object.defineProperty` | 拦截动态定义属性 |
| `getPrototypeOf` | `Object.getPrototypeOf` / `instanceof` | 沙箱隔离 |
| `setPrototypeOf` | `Object.setPrototypeOf` | 禁止改原型 |
| `isExtensible` | `Object.isExtensible` | 与 `preventExtensions` 保持一致 |
| `preventExtensions` | `Object.preventExtensions` | 冻结对象 |
| `apply` | 函数调用（`fn()`、`fn.call()`） | 函数级拦截：日志、权限、缓存 |
| `construct` | `new fn()` | 构造拦截：单例、参数校验 |

**这张表里有两个 trap 需要特别提一句：**

- **`apply`**：它让你能「代理一个函数」。这对「函数式代理」（比如把缓存代理、保护代理作用在一个函数上）非常有用——`new Proxy(fn, { apply(target, thisArg, args) {...} })`
- **`construct`**：它能拦截 `new`。**单例模式的 Proxy 版就是用它实现的**——`construct` 里判断实例是否已存在，存在就返回旧实例。这是第 02 篇单例和本篇代理的交叉点

还有一对「必须配对」的 trap：`ownKeys` 和 `getOwnPropertyDescriptor`。如果你在 `ownKeys` 里过滤掉了一个字段，但 `getOwnPropertyDescriptor` 还能查出它，就会出现「`Object.keys` 看不到、但 `in` 能看到」的诡异不一致。**规范要求这两个 trap 的结果一致，写的时候要成对维护。**

### 三个容易踩的工程约束

**约束一：`Proxy` 只能代理对象，不能代理基本类型。**

```typescript
new Proxy(1, {}); // ❌ TypeError: Cannot create proxy with a non-object as target
```

想给数字、字符串加代理，只能包成对象（`{ value: 1 }`）。这也是为什么「原始值响应式」（Vue3 的 `ref`）需要另一种实现——用 `{ value }` 包一层。

**约束二：代理有性能开销。**

`Proxy` 的每一次属性访问都要走一遍 trap，比直接属性访问慢。**这个开销本身不大（几倍），但如果在热点路径上、或者代理了大量对象，就会累积起来。**

Vue3 的处理方式是**把开销限制在「显式标记」的对象上**：只有 `reactive(obj)` 包过的对象才被代理，普通对象一个字节的代理开销都没有。这是一个值得学的工程决策——**不是「能不能用」，而是「怎么把成本控制在需要的地方」**。

**约束三：`Proxy.revocable()` 让代理可撤销。**

```typescript
const { proxy, revoke } = Proxy.revocable(target, handler);
proxy.foo;      // 正常工作
revoke();       // 📚 知识点：撤销后代理彻底失效
proxy.foo;      // ❌ TypeError: Cannot perform 'get' on a proxy that has been revoked
```

这在保护代理里非常有用：**用户退出登录时 `revoke()` 掉所有代理，比逐个清理引用干净得多。** 会话失效的语义就不是「你把 token 删掉」，而是「门被彻底焊死了」。

> 💬 **面试官**：用 `Proxy` 做权限校验，前端做够了吗？
>
> ✅ 标准答案：不够，而且**前端权限拦截从来不是安全边界**。Proxy 能拦住的只是「在浏览器里通过这份 JS 发起的调用」——用户打开 DevTools 就能改判断条件，用 curl 就能绕过整个前端直接打接口。真实鉴权必须在服务端做（校验 token、校验资源归属）。前端保护代理的正确定位是：拦住用户的误操作、减少明知会 403 的无效请求、提前给友好提示，也就是**体验层和流量层的优化，不是安全层**。
>
> 🎁 加分答案：能补两个工程细节——① **拒绝方式要按语义选**：写操作越权抛错（便于监控发现），查询类越权返回空 + 打点（避免打断渲染），UI 已禁用的按钮静默忽略；② 会话注销时用 `Proxy.revocable()` 的 `revoke()` 一次性让所有代理失效，比逐个删引用可靠——「门被焊死」比「钥匙被收回」更难绕过。

---

## 七、Vue2 与 Vue3：同一种意图，两种实现

前面说过，六节里所有代理都是「控制访问」。Vue 的响应式是代理模式的一个特殊用法：**它控制的不是「能不能访问」，而是「访问时顺便记录一下、修改时顺便通知一下」。**

因为这一点特殊，很多人把「Vue3 响应式」当成了代理模式的全部。这一节我们把它放回代理家族的坐标系里看。

### 笔记原文：Vue2 的做法与局限

> Vue2 中的变化侦测实现对 Object 及 Array 分别进行了不同的处理，Object 使用了 `Object.defineProperty()` API，Array 使用了拦截器对 Array 原型上的能够改变数据的方法进行拦截，虽然也实现了数据的变化侦测，但存在很多局限，比如对象新增的属性无法被侦测，以及通过数组下标修改数组内容也无法被侦测，也因此在 Vue2 中经常会使用 `$set` 这个方法对数据修改，以确保依赖更新。

> Vue3 中使用了 ES6 的 Proxy API 对数据代理，没有像 Vue2 中对原数据进行修改，只是加了代理包装，因此首先性能上有所改善，其次解决了 Vue2 中变化侦测的局限性，可以不使用 `$set` 新增的对象属性及通过下标修改数组都能被侦测到。

这两段话已经把结论说全了。我们把它拆成可以验证的三个具体问题。

### 问题一：对象新增属性无法侦测

`Object.defineProperty` 的工作方式是「**遍历已有属性，逐个定义 getter/setter**」：

```javascript
// Vue2 的做法（简化）：遍历 → 逐个 defineProperty
Object.keys(obj).forEach((key) => {
  let value = obj[key];
  Object.defineProperty(obj, key, {
    get() { return value; },
    set(newVal) { value = newVal; /* 通知更新 */ },
  });
});
```

注意这句 `Object.keys(obj).forEach(...)`——**它只覆盖了「定义的那一刻已经存在的属性」**。

```javascript
const vm = new Vue({ data: { user: { name: 'robin' } } });
vm.user.age = 31;   // ❌ 没有 setter，Vue 侦测不到，视图不更新
vm.$set(vm.user, 'age', 31); // ✅ 必须手动补一个 defineProperty
```

这就是 `$set` 存在的原因：它是**手动补调用一次 `defineProperty`** 的工具函数。

而 `Proxy` 不需要补，因为 `set` trap 拦截的是「**任何**属性的写入」——不管这个属性原来存不存在：

```javascript
const p = new Proxy({ name: 'robin' }, {
  set(t, k, v, r) { /* 不管 k 是新属性还是旧属性，都走这里 */ return Reflect.set(t, k, v, r); },
});
p.age = 31; // ✅ 天然被拦截
```

### 问题二：数组下标赋值 / `length` 修改无法侦测

`Object.defineProperty` 对数组同样只能「逐个索引定义」。但数组的索引数量是不确定的，而且 `arr[5] = 'x'`、`arr.length = 0` 这类操作都能绕过 setter。

Vue2 的解法是：**重写数组原型上的 7 个方法**（`push` / `pop` / `shift` / `unshift` / `splice` / `sort` / `reverse`），在这些方法内部先调原生方法、再手动 `observe` 新元素并通知更新。

```text
        Vue2 的 Array 拦截器
   ┌──────────────────────────────────┐
   │ arr.__proto__ = 拦截器对象         │
   │   拦截器对象.__proto__ = Array.prototype │
   ├──────────────────────────────────┤
   │ push / pop / shift / unshift     │ → 调原生 + notify
   │ splice / sort / reverse          │
   ├──────────────────────────────────┤
   │ arr[0] = 'x'                     │ → ❌ 没被拦截
   │ arr.length = 0                   │ → ❌ 没被拦截
   └──────────────────────────────────┘
```

**这就解释了为什么 Vue2 里要用 `arr.splice(0, 1, 'x')` 代替 `arr[0] = 'x'`**——不是风格问题，是前者走的是被拦截的方法，后者绕过了。

`Proxy` 层面这个问题不存在：数组也是对象，`set` trap 同样拦截 `arr[5] = 'x'` 和 `arr.length = 0`。

### 问题三：必须递归遍历，初始化开销大

`Object.defineProperty` 是**主动式**的：要在初始化时就遍历所有属性、递归到每个嵌套对象、逐个定义 getter/setter。

```javascript
// Vue2 的 observe：一次性走完整棵树
function observe(obj) {
  Object.keys(obj).forEach((key) => {
    defineReactive(obj, key);
    if (typeof obj[key] === 'object') observe(obj[key]); // 递归到底
  });
}
```

一个 1000 个节点的数据对象，初始化时就要定义 1000 组 getter/setter——**哪怕用户这一屏只用到其中 5 个字段。**

`Proxy` 是**惰性**的：创建代理时不遍历，只有「某层被访问」时才为那一层建代理。

```javascript
// Vue3 的 reactive：创建时不遍历，访问时才递归代理
function reactive(obj) {
  return new Proxy(obj, {
    get(t, k, r) {
      const value = Reflect.get(t, k, r);
      // 📚 知识点：只有被访问到的嵌套对象才被包成新代理，未访问的一直是裸对象
      return typeof value === 'object' ? reactive(value) : value;
    },
  });
}
```

**这个「惰性」是 Vue3 性能改善的主要来源**，不是「Proxy 比 defineProperty 快」——单次拦截的开销，Proxy 反而更大。**省下来的是「没被访问的部分完全不用处理」。**

### Vue2 / Vue3 对比表

| 维度 | Vue2（`Object.defineProperty`） | Vue3（`Proxy`） |
|------|------|------|
| 拦截对象 | 已存在的属性 | 对象的所有操作 |
| 对象新增属性 | ❌ 需要 `$set` | ✅ 天然拦截 |
| 数组下标赋值 | ❌ 需要 `splice` | ✅ 天然拦截 |
| 数组 `length` 修改 | ❌ 无法拦截 | ✅ 天然拦截 |
| 初始化开销 | 递归全部属性，O(全部节点) | 惰性，O(被访问节点) |
| 引用透明度 | 修改原对象（在原对象上定义 getter） | 原对象不变，返回新代理 |
| `delete` 操作 | ❌ 无法侦测 | ✅ `deleteProperty` trap |
| 兼容性 | 支持 IE9+ | **不支持 IE**（Proxy 无法 polyfill） |

**最后一行的「不支持 IE」不是补丁问题，是能力问题**：`Object.defineProperty` 在 IE9 就有了，而 `Proxy` 属于「语言级拦截」，**无法用任何 polyfill 模拟**——因为没有语法可以在「读取属性」这件事上插一道钩子。这也是 Vue3 放弃 IE 的根本原因。

### 划界：本篇只讲「为什么能解决」

最后强调一句划界：**本篇只回答「Proxy 为什么能解决 Vue2 的三个局限」，不涉及 `track` / `trigger` / `effect` 的实现。**

理由是：响应式的核心难点不在于「用 Proxy 拦截」，而在于「**拦截之后怎么建立依赖关系、怎么精确触发更新**」——那是另一套机制（依赖收集 + 副作用调度），属于《Vue 3 源码》系列响应式篇的内容。混在一起讲，两边都讲不透。

从代理模式的视角看，Vue3 到这里就讲完了：

> **`reactive()` 就是一个保护/拦截代理——它不改数据，只在数据外面套一层 `Proxy`，把「读」变成「读 + 记录」，把「写」变成「写 + 通知」。它就是第二节那张四分类表之外的一个「复合目的代理」：`get` 里有虚拟代理的惰性，`set` 里有保护代理的判断。**

> 💬 **面试官**：Vue3 为什么用 `Proxy` 替换 `Object.defineProperty`？
>
> ✅ 标准答案：三条。① **能力更全**：`Object.defineProperty` 只能拦截「已存在属性的读写」，新增属性、数组下标赋值、`length` 修改、`delete` 都拦不到，所以 Vue2 必须提供 `$set` 和重写数组的 7 个方法；`Proxy` 拦截的是对象的操作层面，这些都天然覆盖。② **初始化开销更低**：`defineProperty` 是主动式的，要递归遍历整棵数据树、逐个定义 getter/setter；`Proxy` 是惰性的，只在某层被访问时才为那层建代理，没访问到的部分完全不处理。③ **不侵入原对象**：Vue2 是在原对象上「改写」属性，Vue3 是返回一个新代理对象，原数据保持干净。
>
> 🎁 加分答案：能补两点——① **性能改善的主因不是「Proxy 更快」，而是「惰性跳过」**：单次 `Proxy` 拦截开销其实比 `defineProperty` 的 getter 访问更大，Vue3 省的是「用户没用到的那部分不处理」，这个区分能立刻体现你是真读过还是背结论；② **`Proxy` 无法 polyfill，这是 Vue3 放弃 IE 的技术根因**，不是「不想兼容」——`Object.defineProperty` 在 IE9 就有，而 `Proxy` 属于语言级钩子，没有任何垫片能模拟「拦截属性读取」这件事。

---

## 八、易混淆辨析：代理 vs 装饰器 vs 适配器 vs 网络代理

这一节是全系列密度最高的部分。代理模式的结构（实现同一接口 + 持有一个同类引用）和装饰器几乎一样，名字又和网络术语撞车，所以它是设计模式里最容易答混的一篇。

六个辨析点，每一个都配一句可操作的判断标准。

### 代理 vs 装饰器（承接第 06 篇）

结构上，两者几乎一模一样：

```text
      装饰器                          代理
  ┌──────────────┐              ┌──────────────┐
  │  Component   │              │   Subject    │
  └──────┬───────┘              └──────┬───────┘
    ┌────┴────┐                    ┌────┴────┐
┌───▼────┐ ┌──▼─────────┐     ┌────▼────┐ ┌─▼─────────┐
│Concrete│ │ Decorator  │     │  Real   │ │   Proxy   │
│Component│ │ -component │     │ Subject │ │ -realSubj │
└────────┘ └────────────┘     └─────────┘ └───────────┘
   两者都是：实现同一接口 + 持有一个同类引用 + 转发调用
```

**分水岭只有一条：代理控制「是否放行」，装饰器只管「加了什么」。**

三个可操作的区分信号：

| 信号 | 装饰器 | 代理 |
|------|--------|------|
| **是否拦截** | 一定会转调原对象 | 可能**完全不转调**（拒绝 / 缓存命中 / 还没加载） |
| **代理对象何时确定** | 运行时任意叠加、可动态组合 | 通常在创建时就确定代理谁 |
| **调用方能否拿到真实对象** | 能（`decorator.component` 一般可访问） | 可能永远拿不到（由代理负责生死） |
| **叠加方式** | 可以 N 层任意套 | 通常一层（多层代理少见且难维护） |
| **关注点** | 增强职责：日志、埋点、校验、缓存 UI | 控制访问：延迟、拒绝、复用、跨进程 |

**最快的一句判断**：问自己「**这个包装有没有可能不让这次调用到达真实对象？**」

- 会 → 代理（保护代理拒绝、缓存代理命中、虚拟代理未加载）
- 不会，每次都会转调 → 装饰器（日志、埋点、加 loading 态）

**这个「可能不转调」是硬性区别**，因为它改变了系统行为而不只是给行为加料。装饰器的世界是「1 + 1 = 1 加一点额外动作」，代理的世界是「1 可能变成 0」。

### 代理 vs 适配器（承接第 05 篇）

笔记的总结原文非常精准，一字不改地保留：

> 代理模式 VS 适配器模式，适配器提供不同接口，代理模式提供一模一样的接口

一句判断：**看接口有没有变**。

```text
     代理：接口不变                适配器：接口改变
  ┌──────────────┐            ┌──────────────┐
  │   Subject    │            │    Target    │ ← 客户端期望的
  │  + request() │            │  + request() │
  └──────┬───────┘            └──────┬───────┘
    ┌────┴────┐                  ┌───┴────┐
┌───▼────┐ ┌──▼────┐        ┌───▼────┐ ┌─▼──────────┐
│  Real  │ │ Proxy │        │ Adapter│ │  Adaptee   │
│request()│ │request()│      │request()│ │ specificReq│ ← 接口不同
└────────┘ └───────┘        └────────┘ └────────────┘
```

- **代理**：`Proxy` 和 `RealSubject` 都有 `request()`，调用方不需要知道自己在跟谁说话——**它为的是「不让调用方察觉到那一层」**
- **适配器**：`Adapter` 有 `request()`，但 `Adaptee` 只有 `specificRequest()`——**它为的恰恰是「让不同的东西能对上」**

再补一句更本质的：**代理的目的是「多一道控制」，适配器的目的是「消除不兼容」。** 代理是「我不想让你直接碰它」，适配器是「我想让你能碰它，但它说话的方式不一样」。

### 代理 vs 外观（承接第 05 篇）

- **代理**：一对一。一个代理对应一个真实对象，接口不动
- **外观**：一对多。一个 Facade 聚合多个子系统，把「调五个方法」简化成「调一个方法」

一句话判断：**看背后是一个对象还是一组对象。**

| 维度 | 代理 | 外观 |
|------|------|------|
| 背后对象数量 | 1 | N |
| 接口是否变化 | 不变（同一接口） | **变**（新设计的简化接口） |
| 目的 | 控制访问 | 简化调用 |

### 设计模式代理 vs 网络「正向 / 反向代理」

这是最容易被误答的一处，因为两者**名字完全一样**。笔记在这一节给了很完整的内容，我们全部保留。

**正向代理（Forward proxy）**

> + 在正向代理中，Proxy 和 Client 同属于一个 LAN，隐藏了客户端信息
>
> + 正向代理的对象是客户端，服务端看不到真正的客户端
>
> + 通过公司代理服务器上网

![](https://cdn.nlark.com/yuque/0/2021/png/738210/1638883931333-30c1f4cd-9b99-4c92-8995-fa58ff3fe742.png)

这张图画的是「谁藏起来了」：代理和客户端在同一个局域网里，服务端只看得见代理的 IP，**看不见真正的客户端**。所以「翻墙」「公司统一出口上网」都是正向代理——它替客户端出面。

**反向代理（Reverse proxy）**

> + 在反向代理中，Proxy 和 Server 同属于一个 LAN，隐藏了服务端信息
>
> + 反向代理的对象是服务端，客户端看不到真正的服务端
>
> + nginx 代理应用服务器

![](https://cdn.nlark.com/yuque/0/2021/png/738210/1638883944556-4a324946-40a6-4aa4-b80f-8dae678908a3.png)

这张图正好是上一张的镜像：代理和服务端在同一个局域网里，**客户端只看得见代理，看不见真正的服务器**。用户访问 `example.com`，背后是 5 台 Node 服务器，用户永远不知道是哪台在响应——这就是反向代理。

**完整代码（笔记原文）**

server.js：

```javascript
const http = require('http');
const httpProxy = require('http-proxy');
const proxy = httpProxy.createProxyServer(); 

const app = http.createServer((req, res) => {
  proxy.web(req, res, {
    target: 'http://localhost:8089'
  });
  proxy.on('error', (error) => {
    console.log('代理服务器出错');
    console.log(error.toString());
  })
});
app.listen(8088, () => {
  console.log(`server start port 8088`);
});
```

proxyServer.js：

```javascript
const http = require('http');

const app = http.createServer((req, res) => {
  res.end(req.url);
});
app.listen(8089, () => {
  console.log(`server start port 8089`);
});
```

**这段代码干的事极其简单**：起两个服务，8089 是被访问的「真实服务」（它只回显 `req.url`），8088 是代理——收到任何请求都**原样转发给 8089**，把响应再转回去。

**这就是「反向代理」的最小实现。** 它的形状和设计模式的代理非常像：客户端 → 代理 → 真实服务，代理在中间做转发。**但两者的层次根本不同：**

| 维度 | GoF 代理模式 | 网络正 / 反向代理 |
|------|-------------|----------------|
| 层面 | **对象级**（进程内） | **连接级**（跨进程 / 跨网络） |
| 代理双方关系 | 同一个接口，可以是同一个类体系 | 完全无关，只是一个转发规则 |
| 解决什么 | 控制对某个对象的访问 | 隐藏 IP、负载均衡、缓存、SSL 卸载 |
| 谁实现 | 你的代码 | nginx / CDN / 网关 / 公司网络设备 |
| 语言依赖 | 依赖编程语言（Proxy / 手写类） | 与语言无关，是协议层的 |

**一句话划界：GoF 代理是「替一个对象出面」，网络代理是「替一台机器出面」。** 名字撞车纯属巧合（都来自 proxy 这个词的「代理人」本义），**面试里混着答会直接掉分**——尤其当面试官问「正向代理和反向代理的区别」时，你答成「装饰器那种包一层」就完全跑了。

**但有一个共通的认知值得点出来**：两者都是「**把直接访问变成间接访问**」，都遵循「**加一层解决一类问题**」这个通用思路。你能看出它们在结构上的同构，说明你对「代理」这个概念的理解已经跨越了具体领域——这一层是加分项，但前提是先能清楚分开层次。

### 防抖 / 节流不属于代理

前面 5.4 已经详细论证过，这里只留结论：

> **防抖 / 节流是函数包装（高阶函数），意图是「控制执行频率」，不满足代理模式「控制对对象的访问」这个意图，也不属于 GoF 23 种模式。** 它们和代理共享「包一层」的直觉，但它更接近装饰器——甚至严格说连装饰器都不完全算，因为它改变了「调用一次 = 执行一次」的语义。

### 事件委托算不算代理

这是最后一个边界，也是最值得讨论的一个。

事件委托的结构是：**在父元素上监听事件，让父元素代为处理所有子元素的事件。**

```html
<ul id="users">
  <li>1</li>
  <li>2</li>
  <li>3</li>
</ul>
```

```javascript
const users = document.querySelector('#users');
users.addEventListener('click', (event) => {
  console.log(event.target)
}, false);
```

**它体现了代理的「思想」**：客户端（点击事件）本来要直达 `li`，现在先经过 `ul`；`ul` 就像一个代理，在转发之前可以做一些事（判断点的是哪个 `li`）。

**但它不是 GoF 代理模式**，缺两样东西：

- **没有 `RealSubject` 引用**：`ul` 并不持有一个「真实对象」去转发调用——它压根没有「转发」这个动作，它是**自己处理**事件然后靠 `event.target` 判断来源
- **没有同一接口**：`ul` 和 `li` 之间没有「实现同一个 Subject 接口」这层关系

**准确的说法是**：事件委托是「**代理思想在 DOM 事件模型上的应用**」，实现手段是「事件冒泡」这个浏览器机制，不是设计模式意义上的代理。

**这个区分在面试里怎么用？** 当面试官问「代理模式在前端有哪些应用」时，你可以说「事件委托体现了代理的思想，但严格说不算 GoF 代理模式，因为它没有真实对象的持有和同接口转发」——**这一句同时展示了两个能力：知道它像什么，也知道它为什么不算。**

### 六个辨析汇总

把笔记「总结」两行原文保留，扩成完整对照表：

> + 代理模式 VS 适配器模式，适配器提供不同接口，代理模式提供一模一样的接口
>
> + 代理模式 VS 装饰器模式，装饰器模式原来的功能不变可以使用，代理模式改变原来的功能

（第二句里的「代理模式改变原来的功能」，更精确的说法是「**代理可能根本不让原来的功能被调用**」——不是改变功能，是控制功能能否发生。）

| 对比 | 核心区别 | 一句话判断 |
|------|---------|-----------|
| 代理 vs 装饰器 | 代理控制「是否放行」，装饰器只管「加了什么」 | 这个包装**可能不转调**真实对象 → 代理 |
| 代理 vs 适配器 | 代理接口不变，适配器换接口 | 看**接口有没有变** |
| 代理 vs 外观 | 代理一对一，外观一对多 | 看背后是**一个还是一组**对象 |
| GoF 代理 vs 网络代理 | 对象级 vs 连接级 | 是「替对象出面」还是「替机器出面」 |
| 代理 vs 防抖节流 | 控制访问 vs 控制频率 | 是「不让你进」还是「让你进但按节奏处理」 |
| 代理 vs 事件委托 | 有 RealSubject 引用 + 同接口转发 vs 只是靠冒泡代为处理 | 有没有**转发**这个动作 |

> 💬 **面试官**：代理模式和装饰器模式结构这么像，怎么从意图上区分？
>
> ✅ 标准答案：结构和代码几乎一样——都实现同一个接口、都持有一个同类引用、都在调用前后插入逻辑。区别只在意图：装饰器的意图是「**动态地给对象添加职责**」，它一定会转调原对象，只是额外加点日志、埋点、校验；代理的意图是「**控制对这个对象的访问**」，它可能完全不转调——保护代理直接拒绝、缓存代理命中后直接返回、虚拟代理在真实对象还没创建时先顶替。
>
> 🎁 加分答案：能给一个一秒判断的口径——「问自己『这个包装有没有可能不让这次调用到达真实对象』，会就是代理，每次都会转调就是装饰器」。再补两点：① 装饰器可以在运行时任意叠加 N 层，代理通常只有一层且创建时就确定了代理谁；② 从设计原则看，装饰器是 OCP 的直接落地（加能力不改老代码），代理更多是 SRP 和「关注点分离」的落地（把控制逻辑从业务逻辑里剥出来）——所以你会看到权限、缓存、懒加载这类**横切关注点**更倾向用代理，而日志、埋点那类**增强**更倾向用装饰器。

> 💬 **面试官**：正向代理和反向代理，跟设计模式里的代理是一回事吗？
>
> ✅ 标准答案：不是一回事，只是同名。GoF 代理是**对象级**的——在同一个进程里，用一个实现相同接口的对象替换真实对象，控制代码对它的访问。正向/反向代理是**网络架构层面**的——它们工作在连接层，隐藏的是 IP 而不是对象，实现者是 nginx、CDN、网关这类基础设施，与编程语言无关。两者的层次、实现者、解决的问题都不同。
>
> 🎁 加分答案：能说清两者各自「藏了谁」——正向代理和客户端在同一 LAN，**隐藏客户端**（公司统一出口上网、翻墙）；反向代理和服务端在同一 LAN，**隐藏服务端**（nginx 前置 5 台 Node、负载均衡、SSL 卸载）。再加一句：虽然层次不同，但它们共享同一个抽象直觉——「把直接访问变成间接访问，用加一层来解耦」；能看出这个同构说明理解跨了领域，但**面试时一定要先把层次分清**，否则就是概念混淆。

---

## 九、前端工程落地：事件委托、`$.proxy` 与框架里的隐身代理

### 事件委托：捕获与冒泡

笔记在这一节的原理说明值得完整保留：

> + 事件捕获指的是从 document 到触发事件的那个节点，即自上而下的去触发事件
>
> + 事件冒泡是自下而上的去触发事件
>
> + 绑定事件方法的第三个参数，就是控制事件触发顺序是否为事件捕获，true 为事件捕获，false 为事件冒泡，默认为 false

（原文「true 为时间捕获」应为「true 为事件捕获」，属错别字。）

![](https://cdn.nlark.com/yuque/0/2021/png/738210/1638862313506-81f56304-e013-4d9e-a41e-c6d6a9cf1608.png)

这张图是理解整节的关键：**同一次点击，会走两趟。** 第一趟从 `window` / `document` 一路往下钻到目标节点（捕获阶段，`useCapture = true` 的监听器在这里触发）；第二趟从目标节点一路往上传回根（冒泡阶段，`useCapture = false` 的监听器在这里触发）。中间那个「事件目标（target）」就是真正被点的元素。

**完整代码（笔记原文）**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  <ul id="users">
    <li>1</li>
    <li>2</li>
    <li>3</li>
  </ul>
  <script>
    const users = document.querySelector('#users');
    users.addEventListener('click', event => {
      console.log(event.target)
    }, false);
  </script>
</body>
</html>
```

**为什么绑在 `ul` 上能收到 `li` 的点击？** 因为点击 `li` 之后，事件会沿着「`li` → `ul` → `body` → `html` → `document` → `window`」往上冒泡。绑在 `ul` 上的监听器在冒泡路径上，所以能被触发。

**`event.target` 和 `event.currentTarget` 的区别，是这段代码唯一的考点：**

- **`event.target`**：**真正被点的那个元素**（这里是某个 `li`），它在整个传播过程中不变
- **`event.currentTarget`**：**当前正在执行监听器的那个元素**（这里是 `ul`），它会随传播阶段变化

```javascript
users.addEventListener('click', (event) => {
  console.log('target:', event.target.tagName);        // LI
  console.log('currentTarget:', event.currentTarget.tagName); // UL
});
```

**这个区别就是事件委托能生效的全部原理**：监听器挂在 `ul` 上（`currentTarget` 恒为 `UL`），靠 `target` 找出「真正被点的是哪个 `li`」，再分派处理。

**为什么生产代码要用事件委托，而不是给每个 `li` 都绑？**

| 维度 | 逐个绑定 | 事件委托 |
|------|---------|---------|
| 监听器数量 | N 个（100 条数据 = 100 个） | 1 个 |
| 内存占用 | 随条目增长 | 恒定 |
| 动态新增元素 | 需要为新元素补绑 | 自动生效 |
| 解绑管理 | 要逐个 `removeEventListener` | 父元素卸载即可 |

第三行在实际业务里最关键：**列表是分页加载/无限滚动的，新插入的 `li` 如果逐个绑定，每插一条都要绑一次。事件委托天然覆盖——因为事件总是会冒泡到 `ul`。**

### jQuery `$.proxy`

笔记给了极简的实现，值得保留：

> + 接受一个函数，然后返回一个函数，并且这个新函数始终保持了特定的上下文语境
>
> + `jQuery.proxy( function, context )`：function 为执行函数，context 为函数的上下文，this 值会被设置成这个 object 对象

```typescript
function proxy(fn: Function, context: any): Function {
  return fn.bind(context);
}
```

**它解决的是「回调里 `this` 丢失」这个经典问题：**

```javascript
const vm = { name: 'prescription', render() { console.log(this.name); } };
setTimeout(vm.render, 100);            // undefined：this 丢了
setTimeout(vm.render.bind(vm), 100);   // 'prescription'
setTimeout($.proxy(vm.render, vm), 100); // 'prescription'
```

**但要明确一点：严格说 `$.proxy` 不是对象代理，是「上下文绑定」。**

它没有任何「真实对象 + 代理对象 + 同一接口」的结构，它只是返回一个绑定了 `this` 的新函数——**本质和 `Function.prototype.bind` 完全等价**（jQuery 内部在支持 `bind` 的浏览器里就是用 `bind` 实现的）。

**它之所以被放在代理的语境里讲，是因为名字里有个 proxy。** 这也是一种「同名不同义」，和网络代理同类问题。面试时提到它，补一句「它本质是 `bind` 的封装，属于函数包装而非对象代理」，能显得你对概念边界很敏感。

### 远程代理：Web Worker

四类代理里，笔记没有覆盖的是**远程代理**（Remote Proxy）——「本地用一个替身代表远端对象」。

前端最典型的远程代理就是 **Web Worker**：

```javascript
// 主线程拿到的 worker 对象，就是"在另一个线程里执行的对象"的本地替身
const worker = new Worker('price-calculator.js');
worker.postMessage({ type: 'calc', drugIds });

worker.onmessage = (e) => {
  console.log('大计算完成：', e.data);
};
```

**为什么它算代理？** 因为从主线程的视角看：

- 它有一个「对象」（`worker`），有明确的能力（`postMessage`）
- 调用它的时候，**实际执行发生在另一个线程**——主线程完全不知道那边怎么跑的
- 主线程拿到的是一个**接口一致的本地替身**，它代表着一个不在这儿的执行体

这就是「远程代理」的定义。**这也是为什么它能解决「大计算卡死主线程」的问题**：调用方以为在「调一个对象」，实际上工作被挪到了别处。

**远程代理在前端还有两个常见形态：**

- **RPC stub**：前端调 `api.getOrder(id)`，看起来像调本地方法，实际是一次 HTTP 请求 + 响应解析。**这个「让远程调用看起来像本地调用」的能力，就是远程代理的价值**
- **gRPC-Web / tRPC 的 client**：类型定义让远端方法在 TS 里看起来和本地函数一模一样

### 框架与库里的隐身代理

这张表是「前端设计模式藏得深」的最佳注解——它们全是代理，只是你没意识到：

| 技术 | 代理形式 | 控制什么 |
|------|---------|---------|
| Vue3 `reactive` | `Proxy` 的 `get` / `set` | 访问时收集依赖、修改时触发更新 |
| MobX | `Proxy`（v6+） | 同 Vue3，observable 的读写劫持 |
| Valtio | `Proxy` | 状态读写 → React 订阅 |
| Immer | `Proxy` 的 draft | 写时复制（copy-on-write）+ 冻结 |
| Web Worker | 远程代理 | 执行位置 |
| `axios` 的 `get()` | 远程代理 | 执行位置（跨网络） |

**还要标出三个明确排除项——这三行最能体现系列内部分工：**

| 你以为的 | 其实是 | 归属 |
|---------|--------|------|
| `axios` 请求/响应拦截器 | **职责链** | 第 12 篇 |
| `React.memo` / HOC | **装饰器** | 第 06 篇 |
| 虚拟列表节点复用 | **享元** | 第 09 篇 |
| 图片懒加载 | **虚拟代理**（本篇） | 第 08 篇 |
| 请求结果缓存 | **缓存代理**（本篇） | 第 08 篇 |

🔧 **真实场景（示意口径）**：处方审核列表同时用了虚拟代理和缓存代理——图片懒加载把首屏图片请求从 20 个降到 3~4 个；药品价格用 `createCacheProxy(priceApi, 5000)` 包一层，把一屏 8 次重复请求压到 1 次。两处改造的共同点是：**`PrescriptionList` 组件和 `PriceApi` 的业务代码都没改一行**。这就是代理模式在工程上最实际的收益——**加控制不加耦合**。

> 💬 **面试官**：事件委托算不算代理模式？
>
> ✅ 标准答案：不算严格的 GoF 代理模式，但体现了代理的思想。事件委托的做法是在父元素上监听、靠事件冒泡收到子元素的事件、再用 `event.target` 判断真正被点的是谁。它像代理的地方在于「多了一层代为处理」；但缺两样东西：一是没有 `RealSubject` 的持有关系和真正的**转发**动作（`ul` 是自己处理，不是转给 `li`），二是没有「实现同一接口」的结构约束。所以准确说法是「代理思想在 DOM 事件模型上的应用」。
>
> 🎁 加分答案：能顺着讲清 `event.target` 与 `event.currentTarget`——「监听器挂在 `ul` 上所以 `currentTarget` 恒为 `UL`，靠 `target` 拿到真正点击的 `li`，这个『当前执行者』与『真正目标』的分离，正是事件委托能成立的技术前提」。再补一句工程价值：「列表分页/无限滚动场景下，逐个绑定要为每个新增 `li` 补绑，委托天然覆盖，监听器数量也恒定——这是从 O(N) 到 O(1) 的差别。」

---

## 十、面试高频问与标准答案

前面各节已经散着给了 8 个问答，这里把最常被问的 5 道单独拎出来做速查——答题时按「**先结论 → 再结构 → 最后边界**」的顺序说，比想到哪说到哪稳得多。

### 一、代理模式有哪几种常见分类？分别对应什么场景？

**✅ 标准答案**：按「控制什么」分四类——虚拟代理控制**何时创建/加载**（图片懒加载、大对象延迟初始化）；缓存代理控制**是否真的执行**（药品价格、阶乘、memoize）；保护代理控制**谁能访问**（角色权限、数据校验）；远程代理控制**在哪执行**（Web Worker、RPC stub）。

**🎁 加分答案**：这四类是按控制目标分，还有一组正交维度是按实现方式分——静态代理（手写代理类，一个代理对一个类）和动态代理（`Proxy` 一份逻辑代理任意对象）。Vue3 是动态代理，笔记里的经纪人例子是静态代理。

### 二、代理模式和装饰器模式结构相似，怎么从意图上区分？

**✅ 标准答案**：意图不同。装饰器是「动态给对象添加职责」，**每次都会转调**原对象；代理是「控制对对象的访问」，**可能完全不转调**（拒绝/缓存命中/未加载）。一秒判断口径：问「这个包装有没有可能不让这次调用到达真实对象」，会 → 代理，每次都会 → 装饰器。

**🎁 加分答案**：装饰器可运行时任意叠加 N 层、代理通常一层且创建时确定代理谁；从原则看，装饰器是 OCP 的直接落地（加能力不改老代码），代理是关注点分离的落地（把权限/缓存/懒加载这类横切关注点从业务逻辑里剥出来）。

### 三、ES6 `Proxy` 相比 `Object.defineProperty` 有什么优势？

**✅ 标准答案**：三条。① **能力更全**：`defineProperty` 只能拦截已存在属性的读写，新增属性、数组下标、`length`、`delete` 都拦不到（因此 Vue2 需要 `$set` 和重写数组 7 个方法）；`Proxy` 在对象操作层面拦截，这些都天然覆盖。② **初始化开销更低**：`defineProperty` 主动递归遍历整棵树，`Proxy` 惰性、只在访问到某层时才代理那层。③ **不侵入原对象**：Vue2 改写原对象属性，Vue3 返回新代理对象。

**🎁 加分答案**：性能改善主因不是「Proxy 更快」而是「惰性跳过」——单次 `Proxy` 拦截开销其实比 getter 更大；另外 `Proxy` 无法 polyfill，这是 Vue3 放弃 IE 的技术根因。

### 四、手写一个缓存代理，要考虑哪些问题？

**✅ 标准答案**：四点。① **key 设计**：方法名 + 参数序列化，注意对象参数属性顺序会导致 false miss；② **失效机制**：TTL 或主动 `invalidate`，没有失效的缓存就是 bug 制造机；③ **内存**：`Map` 无界增长要配 LRU 或定时清理，key 是对象时优先 `WeakMap`；④ **引用稳定**：`get` 每次返回新函数会让 `proxy.fn !== proxy.fn`，破坏 React 依赖比较和事件解绑，要把包装后的函数缓存起来。

**🎁 加分答案**：缓存 `Promise` 而不是缓存值，可顺带做**请求合并**（同 key 并发只发一次），但要处理 reject 时清缓存；缓存语义是「一致」不是「正确」——第一次算出什么，后面就一直返回什么。

### 五、前端用 `Proxy` 做权限拦截，够不够？

**✅ 标准答案**：不够。**前端权限拦截从来不是安全边界**——用户开 DevTools 就能改判断条件，用 curl 就能绕过整个前端。真实鉴权必须在服务端做。前端保护代理的正确定位是：拦住误操作、减少明知 403 的无效请求、提前给友好提示，是**体验层和流量层的优化**。

**🎁 加分答案**：拒绝方式按语义选——写操作越权抛错（便于监控），查询类越权返回空 + 打点，UI 已禁用的静默忽略；会话注销用 `Proxy.revocable()` 的 `revoke()` 一次性让所有代理失效，比逐个删引用可靠。

---

## 💡 一张图总结（面试速记表）

| 核心要点 | 一句话内核 | 考察频率 |
|------|------|------|
| 代理的意图 | 控制对对象的**访问**，不是增强功能 | ⭐⭐⭐ 必考 |
| 四类代理 | 虚拟（何时）/ 缓存（是否）/ 保护（谁）/ 远程（在哪） | ⭐⭐⭐ 必考 |
| 代理 vs 装饰器 | 可能不转调 → 代理；每次都转调 → 装饰器 | ⭐⭐⭐ 必考 |
| 代理 vs 适配器 | 接口不变 → 代理；接口改变 → 适配器 | ⭐⭐⭐ 必考 |
| 静态 vs 动态代理 | 手写代理类 vs `Proxy` 一份逻辑代理任意对象 | ⭐⭐ 高频 |
| `Proxy` vs `defineProperty` | 能力更全 + 惰性代理 + 不侵入原对象 | ⭐⭐ 高频 |
| GoF 代理 vs 网络代理 | 对象级（进程内）vs 连接级（跨网络），同名不同义 | ⭐⭐ 高频 |
| 防抖/节流 | 控制频率的函数包装，**不属于**代理模式 | ⭐⭐ 高频 |
| 13 个 trap | `get`/`set`/`has`/`apply`/`construct`… 核心就记这几个 | ⭐ 中频 |
| 前端权限不是安全边界 | 代理拦体验，服务端才是真正的鉴权 | ⭐ 中频 |

> 💡 记住这条主线：**代理模式不是「加一层」，而是「在访问路径上插一道闸门」。** 闸门后面是时机（虚拟）、次数（缓存）、身份（保护）、位置（远程）——四类代理就是四个不同的闸门。而区分闸门和「加料」的关键只有一句：**这道闸门有没有权力不放行。**

---

## 📝 留个问题

打开你手头项目里任意一处「在调用前先判断」的代码——可能是一段 `if (!hasPermission) return`，可能是一个 `if (cache[key]) return cache[key]`，也可能是一个 `withAuth(...)` 的高阶函数。

问问自己三个问题：

1. 它**有没有可能不让调用到达真实对象**？（会 → 代理，不会 → 装饰器）
2. 它背后是**一个对象还是一组对象**？（一个 → 代理，一组 → 外观）
3. 它**有没有改变接口**？（没变 → 代理，变了 → 适配器）

大多数人第一次做这个练习会发现：**自己天天在写代理，只是从来没给它起过名字。** 而给它起名字的价值在于——下次遇到新场景，你能在「要不要再写一遍」之前先想起「这个结构我已经见过」。

把答案写在评论区，我们一起看看有多少人的项目里藏着十几处没被认出来的闸门 👇

---

## 参考资料

MDN — Proxy（13 个 trap 的权威定义，`receiver` 语义必读）

https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy

MDN — `Proxy.revocable()`（可撤销代理，会话注销场景）

https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/revocable

MDN — Object.defineProperty()（Vue2 响应式的底层 API）

https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty

MDN — getBoundingClientRect()（懒加载位置计算）

https://developer.mozilla.org/zh-CN/docs/Web/API/Element/getBoundingClientRect

MDN — IntersectionObserver（现代懒加载方案）

https://developer.mozilla.org/zh-CN/docs/Web/API/IntersectionObserver

MDN — Web Workers API（远程代理的前端形态）

https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API

阮一峰 — ES6 入门教程 · Proxy 篇（中文讲解最系统的 trap 清单）

https://es6.ruanyifeng.com/#docs/proxy

jQuery API 中文文档 — jQuery.proxy()（上下文绑定，注意它不等于对象代理）

https://www.jquery123.com/jQuery.proxy/

杨会清 — JavaScript 函数的防抖(debounce)与节流(throttle)详解（笔记参考来源）

http://www.yanghuiqing.com/web/javascript/403

博客园 — nginx 正向代理、反向代理，负载均衡（笔记参考来源）

https://www.cnblogs.com/flypenguinblog/articles/11199721.html

refactoring.guru — Proxy（类图、多语言示例、与 Decorator 的对比）

https://refactoring.guru/design-patterns/proxy

《设计模式：可复用面向对象软件的基础》 Erich Gamma 等四人组著，1994（Proxy 意图与三角色的权威出处）

《JavaScript 设计模式与开发实践》 曾探 著（虚拟代理、缓存代理的中文经典讲解）

《深入浅出 Vue.js》 刘博文 著（`Object.defineProperty` 与数组拦截器的完整推导）

> 推荐搜索关键词：「代理模式 虚拟代理 缓存代理 保护代理 远程代理」「Proxy 和 Object.defineProperty 区别」「代理模式 装饰器模式 区别」「静态代理 动态代理 JavaScript」「Proxy revocable 用法」「IntersectionObserver 懒加载 rootMargin」「正向代理 反向代理 区别」。

---

> 🔖 这是「前端设计模式」系列第 08 篇。上一篇：《装饰器模式：从 TS Decorator 到 React HOC 的增强术（面试收藏级）》；下一篇预告：《组合与桥接模式：树形结构统一接口 vs 双维度解耦（面试收藏级）》
