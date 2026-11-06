# 装饰器模式：从 TS Decorator 到 React HOC 的增强术（面试收藏级）

> **副标题**：不改源码给对象加能力，是 OCP 原则最直接的落地

> 面试官扫了一眼简历上那行「用 HOC 封装权限校验」，随口问：「你这个 `withAuth`，算装饰器还是代理？」
>
> 你说：「装饰器。」
>
> 「为什么不是代理？结构上一模一样啊——都实现同一个接口，都持有一个对象引用，都在转发调用。」
>
> 你开始背定义：「装饰器是动态增强职责，代理是控制访问……」
>
> 他打断你：「那你这个 `withAuth`，没登录就直接不渲染组件了。**这到底是『增强』还是『拦截』？**」
>
> 你张了张嘴。你发现你背下来的那句定义，在此刻派不上用场——因为「增强」和「拦截」这两个词，描述的从来不是你写的代码长什么样，而是你**为什么**要写它。

这就是本篇要解决的事。装饰器是 23 种模式里**被用得最多、被认出来得最少**的一个：前端天天在写高阶函数、HOC、`@Component`，却很少有人意识到自己正在实现一个 GoF 模式。而它和代理模式的结构同构程度，又让面试官有充分的理由拿它俩互相追问。

---

## 🎯 这篇文章解决什么问题

一句话主线：

> **装饰器不是「包一层」，而是「包一层之后，调用方还认得出原来那个东西」——同接口是它的技术前提，可叠加是它的工程价值，OCP 是它的设计根据。**

读完你会拿到四样东西：

- **一条判断线**：装饰器 vs 代理 vs 继承 vs 适配器 vs 职责链，五组最容易混的对比，各自给判据而不是给定义
- **五套可运行实现**：GoF 原版（抽象类版）、函数式高阶函数版、TypeScript `@Decorator` 版、AOP 埋点版、表单校验元数据版
- **两处笔记不会告诉你的坑**：属性装饰器为什么改不了值、`@log()` 为什么必须返回函数
- **一道追问链的完整答案**：`withAuth` 到底算装饰器还是代理

---

## 一、场景切入：三个横切需求，为什么不该堆进原函数

### 痛点一：一个下单函数，被四个「额外需求」绑架

问诊业务里有个核心方法，负责创建问诊订单。第一版很干净：

```typescript
async function createConsultOrder(params: ConsultOrderParams) {
  return await request('/api/consult/order', params);
}
```

三行，干净得让人舍不得动。然后需求来了。

**第一周**，数据分析同学要埋点：下单点击、下单成功各上报一次。

**第二周**，风控要求：只有具备 `consult:create` 权限的医生能下单。

**第三周**，合规要求：日志和埋点里不能出现患者真实姓名和手机号，必须脱敏。

**第四周**，稳定性要求：网络抖动要自动重试两次。

于是这个函数变成了👇

```typescript
async function createConsultOrder(
  params: ConsultOrderParams,
  options: { log?: boolean; mask?: boolean } = {},
) {
  if (options.log) track('consult_order_create', params);
  if (!hasPermission('consult:create')) throw new Error('无权限');
  const payload = options.mask ? maskPatientInfo(params) : params;
  let result;
  try {
    result = await request('/api/consult/order', payload);
  } catch (e) {
    result = await retry(() => request('/api/consult/order', payload), 2);
  }
  if (options.log) track('consult_order_create_done', result);
  return result;
}
```

看着还行？真正的代价在下面三条：

- **每加一个需求，都要回到这个函数里改一次**——它已经因为「埋点」「权限」「脱敏」「重试」四个理由被改过四次，违反 SRP（它有了四个改变的理由），也违反 OCP（新增能力必须修改老代码）。这两条回扣第 01 篇。
- **改错了会连带影响原有逻辑**：脱敏写在权限校验之后、重试之前，一旦顺序错了，可能把未脱敏的 `params` 上报出去。
- **这四个能力，别的函数也需要**：查订单要埋点、退单要权限、上传病历要脱敏。你只能复制粘贴，或者写一个「万能 `options`」。

这就是**横切关注点（cross-cutting concern）**——它们横着切过很多业务函数，却不属于任何一个函数的本职。**装饰器模式就是为了这类需求而生的：把横切能力从业务函数里拔出来，包在外面，按需叠加。**

### 痛点二：`withAuth(Component)`，你天天在写

再看前端最熟悉的写法：

```typescript
const SecureOrderList = withAuth(withLoading(OrderList));
```

`withAuth` 不改 `OrderList` 一行代码，`withLoading` 也不改。它们各自包一层：没登录就渲染登录页、请求中就渲染骨架屏，登录且有数据了才真的渲染 `OrderList`。

**这就是装饰器模式。** 你不是「用过」，你是「每天都在用，只是没给它命名」。

### 痛点三：`@Controller` / `@Injectable`，字面叫装饰器，但它是另一回事

打开任何一个 NestJS 项目，映入眼帘的是：

```typescript
@Controller('consult')
export class ConsultController {
  constructor(private readonly service: ConsultService) {}

  @Get('order/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
```

这些 `@` 开头的写法，官方叫**装饰器（Decorator）**，TypeScript 语法也叫 Decorator。它和 GoF 的装饰器模式是同一件事吗？

**先记住这个结论，第十节会展开：不是。** TS 装饰器是**语言层的语法能力**，在这里的用途是「给类附加元信息，让框架在启动时扫描并接管」；GoF 装饰器模式是**结构层的组合手法**，用途是「运行时给对象叠加职责」。两者同名，不同义——这是本篇第二个必须划清的边界（第一个是装饰器 vs 代理）。

### 先把笔记里那句大白话归位

笔记开篇有四句话，是理解装饰器最省力的入口：

- **在不改变其原有的结构和功能为对象添加新功能的模式，其实就叫做装饰器模式**
- **最直观地就是我们买房后的装修**——房子还是那个房子，结构没动，但住起来不一样了
- **装饰比继承更加灵活，可以实现装饰者和被装饰者之间的松耦合**
- **被装饰者可以使用装饰者动态地增加和撤销功能**

最后一句里的「**动态**」和「**撤销**」是两个关键词，也是装饰器相对继承的全部优势所在：装修可以拆掉，继承不能。

> 💬 **面试官**：你在项目里哪里用过装饰器模式？
>
> ✅ 标准答案：不要罗列模式名，讲一条「有痛点 → 有方案 → 有收益」的链条。比如：问诊下单函数一开始把埋点、权限、脱敏、重试全写在自己身上，每加一个需求就得改它一次，还容易改乱执行顺序。后来改造成四个独立的高阶函数——`withLog`、`withPermission`、`withMask`、`withRetry`，按需组合成 `withLog(withPermission(withMask(withRetry(createConsultOrder))))`。新增能力只加一个函数，原业务函数一行不改，组合顺序在组装处一眼可见。
>
> 🎁 加分答案：能主动说出「为什么不用继承」——这四个能力是横切的，如果按继承做，就要为「带埋点的下单」「带权限的下单」「带埋点的带权限的下单」……每一种组合写一个子类，4 个能力就是 2⁴ = 16 个类。而装饰器只需要 4 个类，运行时自由组装。说出这个数字，比说一百遍「装饰器更灵活」都有说服力。

🔧 **真实场景**：处方单渲染是三层装饰器的典型战场——底色装饰器标管制级别（麻醉处方红底）、水印装饰器打「仅供XX药房使用」、脱敏装饰器把患者姓名中间字替换成 `*`。三层各自独立，哪个业务页面需要哪层就叠哪层，处方数据结构本身从头到尾没变。

---

## 二、意图与本质：动态加职责，而不是静态加子类

### 一句话意图

> **动态地给一个对象添加额外的职责。就增加功能而言，装饰器模式比生成子类更为灵活。**（GoF 原书意图原文）

拆开看，这句话有两个着力点：

- **动态**——装饰发生在运行时，不是编译期。同一份代码，今天叠两层、明天叠三层，取决于运行时条件
- **比子类更灵活**——这是它的存在理由。如果继承就够用，这个模式根本不需要被发明

### 核心矛盾：N × M，还是 N + M

笔记里的形状 + 颜色例子，把这件事量化得极其清楚。

假设有 **3 种形状**（圆形、矩形、五角星）和 **3 种颜色**（红、绿、黄），要求「任意形状都能任意上色」。

**用继承，需要 9 个类：**

| 形状 \ 颜色 | 红 | 绿 | 黄 |
| --- | --- | --- | --- |
| 圆形 | `RedCircle` | `GreenCircle` | `YellowCircle` |
| 矩形 | `RedRectangle` | `GreenRectangle` | `YellowRectangle` |
| 五角星 | `RedStar` | `GreenStar` | `YellowStar` |

**用装饰器，只需要 6 个类：** 3 个形状（`Circle` / `Rectangle` / `Star`）+ 3 个颜色装饰器（`RedColorShape` / `GreenColorShape` / `YellowColorShape`），组合关系由 `new RedColorShape(new Circle)` 在运行时决定。

差距随维度增长得很凶：

| 场景 | 继承需要的类 | 装饰器需要的类 |
| --- | --- | --- |
| 3 形状 × 3 颜色 | 3 × 3 = 9 | 3 + 3 = 6 |
| 4 形状 × 5 颜色 | 4 × 5 = 20 | 4 + 5 = 9 |
| 4 形状 × 5 颜色 × 3 描边 | 4 × 5 × 3 = 60 | 4 + 5 + 3 = 12 |
| 4 形状 × 5 颜色 × 3 描边 × 2 水印 | 120 | 14 |

**这就是「类爆炸」的真实成本：继承是乘法，装饰器是加法。** 更致命的是，继承的组合是**编译期焊死**的——`RedCircle` 生下来就是红的，你没法在运行时让它变成绿的；而装饰器链可以随时拆装。

### 三个必须讲清的细节

**细节一：装饰器的「不改原对象」，靠的是同接口，不是魔法**

很多人以为装饰器是「在原对象内部偷偷注入代码」。不是。装饰器**就是新建了一个对象**，它只是做到了两件事：

- 实现和被装饰者**完全相同的接口**，所以调用方看不出来
- 在转发调用前后，**选择性地**多做一点事

所以「不修改原对象」是真的——原对象一个字节都没变；但「没有新对象」是假的——多了一层包装。**透明的代价是一次调用多了一层转发**，这一点第九章讲代价时还会用到。

**细节二：「动态」这两个字，是相对继承说的**

对比一下时间轴：

- **继承**：`class RedCircle extends Circle` 写在源码里，`RedCircle` 永远是红的。运行时的你无计可施
- **装饰器**：`const s = new RedColorShape(new Circle())` 写在调用处，下一行你可以 `new GreenColorShape(s)` 套成绿色。**装配发生在运行时，装配方案可以来自配置文件、用户偏好、AB 实验**

这也是为什么装饰器能满足 OCP：**新增一种装饰，不改任何已有类，只在组装处多写一层。**

**细节三：同接口不只是「看起来一样」，它是 LSP 的硬要求**

装饰器和被装饰者实现同一接口，实质是**让装饰后的对象仍然是 Component 的一个合法替代品**——这正是里氏替换原则（LSP）：子类型必须能替换父类型使用。因为每层包装都还是 `Component`，你才能把 `RedColorShape` 再塞进 `GreenColorShape` 里，叠任意多层。（LSP 的完整讲法在第 01 篇第五章。）

> 💬 **面试官**：装饰器模式如何避免继承的类爆炸问题？
>
> ✅ 标准答案：把「基础对象」和「增强能力」拆成两组独立的类，用**组合**代替**继承**来建立关系。基础对象（形状）和增强能力（颜色）各自独立扩展 N 个和 M 个类，运行时通过「包装」把任意基础对象和任意增强能力拼起来。继承需要 N × M 个组合子类，装饰器只需要 N + M 个类，且组合方案在运行时才确定，可以自由拆装。
>
> 🎁 加分答案：补两句边界——① 装饰器不是无条件优于继承。如果组合关系固定且只有一两种（比如「所有报告都必须带水印」），直接用继承或直接在原类里实现更简单，多一层包装纯属浪费。**装饰器的价值只在「组合数量多 + 需要运行时决定」时成立**，否则就是过度设计，违反 YAGNI。② 装饰器也有它自己的成本：叠加层数多了会出现「包装地狱」，调试时调用栈变深、断点要打好几层，`fn.name` 和 `instanceof` 也可能失真——这些是继承没有的问题。

---

## 三、结构与角色：装饰器和被装饰者为什么必须同接口

### 先看图

![装饰器模式类图：装饰器 Decorator 既实现 Component 接口，内部又持有一个 Component 引用，ConcreteDecorator 在此之上叠加具体行为](https://refactoring.guru/images/patterns/diagrams/decorator/structure.png)

带着标注再读一遍同一张图，四个角色的位置会清楚得多：

![装饰器模式角色标注图：Component 定义统一接口，ConcreteComponent 是被装饰的原始对象，Decorator 持有 Component 引用并转发，ConcreteDecorator 实现具体增强](https://refactoring.guru/images/patterns/diagrams/decorator/structure-indexed.png)

四个角色，逐一对应到 TypeScript：

| 角色 | 职责 | TypeScript 里的样子 |
| --- | --- | --- |
| **Component** | 声明被装饰对象的能力，是调用方唯一认识的东西 | `interface Shape { draw(): void }` |
| **ConcreteComponent** | 真正干活的对象，不知道有装饰器存在 | `class Circle implements Shape` |
| **Decorator** | 实现同一接口 + 持有一个 Component 引用，负责转发 | `abstract class ColorShape implements Shape` |
| **ConcreteDecorator** | 在转发前后加上自己的行为 | `class RedColorShape extends ColorShape` |

### 一句话认出装饰器：自指结构

类图上有成千上万种形状，装饰器有它**唯一的指纹**：

> **它「是一种」Component，同时「里面装着一个」Component。**

对应到代码，就是这两行同时出现：

```typescript
class ColorShape extends Shape {        // 👈 是一种（is-a，同接口）
  constructor(public shape: Shape) {    // 👈 里面装着一个（has-a，持有引用）
    super();
  }
}
```

**在类图上，这个自指结构画成「Decorator 一头虚线空心三角指向 Component（实现），另一头实线箭头也指向 Component（持有）」——同一条边出现两次，方向不同，这就是装饰器的形状。** 你以后读任何源码，只要看到一个类同时「实现某个接口」又「以该接口为字段类型」，基本可以判定这是装饰器或代理，再往意图上去区分（第九章）。

### 笔记里的类图：抽象类版的装饰器

笔记里那张图，就是这个结构的手绘版本：

![](https://cdn.nlark.com/yuque/0/2021/png/738210/1638717978702-6d00756f-3cb1-41be-a62e-3864924c6f4f.png)

图里画的是四个东西：`Shape` 抽象基类、三个具体形状（`Circle` / `Rectangle` / `GreenColorfulshape` 等）、`ColorfulShape` 抽象装饰器、以及它派生的两个具体颜色装饰器。

**注意一个容易看错的点**：这张图里 `ColorShape` 用的是 `extends Shape`（继承抽象类），而 refactoring.guru 那张图用的是 `implements Component`（实现接口）。

这两种画法**是同一个模式的两种写法**，区别只在语言习惯：

- 用抽象类：装饰器继承被装饰者的抽象基类，顺手继承到默认实现，但占用了唯一的继承名额
- 用接口：装饰器实现接口，只能自己实现全部方法，但可以同时继承别的类

**面试时如果被问「装饰器的 Decorator 角色一定要继承 Component 吗」，正确答法是：不一定要「继承」，但一定要「同接口」。** 继承只是实现同接口的一种方式，而且是最不灵活的那种——JavaScript 没有多继承，一旦 `extends` 了 `Shape`，装饰器就没法再继承别的类了。

### 装饰器的堆叠：从一层到多层

先看一层：

![装饰器解法示意：基础 Notifier 只负责发邮件，其余渠道（短信、微信、Slack）各做成一个装饰器包在它外面，而不是各自成为子类](https://refactoring.guru/images/patterns/diagrams/decorator/solution2.png)

再看多层堆叠后的效果——客户端最终拿到的对象是**最外层那个装饰器**，但调用它会一层层向内穿透：

![多层装饰器叠加示意：客户端持有的对象是最外层的装饰器，但它和内部各层共享同一接口，因此客户端不需要知道里面套了几层](https://refactoring.guru/images/patterns/diagrams/decorator/solution3-en.png)

画成执行顺序，就是一条「进—穿—出」的路径：

| 阶段 | 谁在执行 | 在做什么 |
| --- | --- | --- |
| 进入 | `RedColorShape.draw()` | 先不管，向下转发 |
| 进入 | `GreenColorShape.draw()` | 先不管，向下转发 |
| 到底 | `Circle.draw()` | 画出圆形（真正的业务逻辑） |
| 返回 | `GreenColorShape` 继续 | 上色 green |
| 返回 | `RedColorShape` 继续 | 上色 red |

**注意这条链有两个关键性质，后面反复要用：**

- **每一层都必然执行**（不像职责链可以中断）
- **每一层都在做同一件事**（增强同一次调用，而不是把一个请求转交给"下一个能处理它的人"）

这两个性质，就是第九章辨别「装饰器 vs 职责链」的判据。

**穿衣类比**（笔记里的装修类比在代码层的等价物，也是 refactoring.guru 用的那个）：你穿毛衣、再穿外套、再穿雨衣——每一件都没改变你，但你对外界的防护能力变了。雨衣穿在最外层，雨水先碰到它；而真正的「你」在最里面，一件衣服都没多，也没少。**这就是「不动原对象，改变对外表现」。**

> 💬 **面试官**：为什么装饰器一定要和被装饰者实现同一个接口？
>
> ✅ 标准答案：为了让客户端**无感知**。客户端只认识 `Component` 接口，装饰后返回的对象仍然是 `Component`，所以客户端代码一行不用改就能用上增强后的能力。同时，同接口让装饰器可以**递归包裹自身**——因为装饰器本身也是 `Component`，所以它可以被另一个装饰器再包一层，从而实现任意层叠加。这是里氏替换原则（LSP）的直接应用。
>
> 🎁 加分答案：能补一句「同接口的代价是接口必须稳定」——如果 `Component` 接口频繁增加方法，所有装饰器都得跟着实现一遍，这时候会非常痛苦。所以实战中常用两个手段规避：① 用抽象装饰器（`abstract class Decorator implements Component`）把转发逻辑写一份，具体装饰器只写差异部分，笔记里的 `ColorShape` 就是这个角色；② 装饰器只包住你真正关心的那一个方法，其余方法原样透传（`return this.component[prop]`）。

---

## 四、核心实现之一：GoF 原版，形状 × 颜色

先看最教科书的一版。它是理解后面所有变体的地基，也是面试白板上最容易被要求手写的那一版。

### 第一块：被装饰的原始对象

三个具体形状，都继承同一个抽象基类 `Shape`：

```typescript
// 形状
abstract class Shape {
  abstract draw(): void;
}

class Circle extends Shape {
  draw(): void {
    console.log('draw Circle');
  }
}

class Rectangle extends Shape {
  draw(): void {
    console.log('draw Rectangle');
  }
}

class Star extends Shape {
  draw(): void {
    console.log('draw Star');
  }
}
```

**注意这三个类里没有任何颜色相关的代码。** 它们只管「画出来是什么形状」，不管「画成什么颜色」——这就是职责分离：基础对象负责**本体**，装饰器负责**附加**。

### 第二块：装饰器角色，同接口 + 持有引用

```typescript
// 颜色
abstract class ColorShape extends Shape {
  constructor(public shape: Shape) {
    super();
  }
  abstract draw(): void;
}

class RedColorShape extends ColorShape {
  draw(): void {
    this.shape.draw();
    console.log('red');
  }
}

class GreenColorShape extends ColorShape {
  draw(): void {
    this.shape.draw();
    console.log('green');
  }
}
```

`ColorShape` 这一个类，就把装饰器的定义演示完了：

- `extends Shape` —— **是一种**（同接口，客户端可无感替换）
- `constructor(public shape: Shape)` —— **里面装着一个**（持有被装饰者引用）
- 子类的 `draw()` 里先 `this.shape.draw()` **再** `console.log('red')` —— **转发 + 增强**

这三件事凑齐，装饰器就成立了。**少任何一件都不是装饰器**：少了同接口就变不成透明包装，少了持有引用就没东西可转发，少了增强就只是无意义的委托。

### 第三块：组装与调用

```typescript
class YellowColorShape extends ColorShape {
  draw(): void {
    this.shape.draw();
    console.log('yellow');
  }
}

const redColorShape = new RedColorShape(new Circle);
redColorShape.draw();

const greenColorShape = new GreenColorShape(new Rectangle);
greenColorShape.draw();

// 扩展一个黄色的五角星
const yellowColorShape = new YellowColorShape(new Star);
yellowColorShape.draw();
```

输出依次是 `draw Circle` → `red`、`draw Rectangle` → `green`、`draw Star` → `yellow`。

**最值得在面试里说的，是这段代码「没有做什么」：**

- 没有改 `Shape` 一行
- 没有改 `Circle` / `Rectangle` / `Star` 一行
- 没有新增任何「红圆形」「绿矩形」这类组合类

**想再支持一种颜色？新增一个 `BlueColorShape`，其余代码零改动——这就是 OCP 闭环。** 想再支持一种形状？新增一个 `Triangle extends Shape`，三种颜色立刻都能用在它身上。

### 这一版的三处局限

**局限一：叠不了两个维度。** `RedColorShape` 能包 `Circle`，但你没法同时让它既是红色又是「带描边」。因为 `ColorShape` 的语义已经绑死在「颜色」上，描边得另外发明一套，而这个模式没有提供「任意维度自由组合」的机制。想做到这一点，要等到第五节的函数式版本。

**局限二：`this.shape.draw()` 写在增强代码之前，顺序是硬编码的。** 想要「先上色再画」，你得另写一个类。AOP（第七节）会把这个问题变成可配置的 before / after 钩子。

**局限三：类图膨胀。** 每加一种颜色就多一个类，写到第 20 种颜色时，你可能更想用一个配置项代替——**这说明这一版适合「增强能力数量可控且语义独立」的场景，不适合「增强项可以从外部任意扩展」的场景**。

🔧 **真实场景**：处方单渲染用的就是这个结构。`PrescriptionView` 是基础对象（画出药品名、规格、用法用量），外面叠三层装饰器——`ControlledDrugView`（管制药品加红底）、`WatermarkView`（加「仅供审方使用」水印）、`PatientMaskView`（患者姓名脱敏）。三层各自独立实现 `PrescriptionView` 接口，页面按需组合：门诊页面叠两层，住院页面叠三层。

> 💬 **面试官**：你刚说加一种颜色「零改动」，那如果我现在要的是「红色 + 带描边」的圆形呢？
>
> ✅ 标准答案：用两个装饰器叠起来——`new StrokeShape(new RedColorShape(new Circle()))`。因为 `ColorShape` 和 `StrokeShape` 都实现 `Shape` 接口，也都能包装任意 `Shape`，所以它们可以互相嵌套、叠加任意层。拉开的调用顺序是：先画圆，再上红，最后描边（因为每层都是「先转发、后增强」）。
>
> 🎁 加分答案：能指出这个答案的前提条件——**要叠得起，必须先有一个稳定的「增强能力」抽象层**。如果我一开始只写了 `RedColorShape`，没写 `ColorShape` 这个抽象装饰器，那 `StrokeShape` 就得从零定义一遍「持有 `Shape` + 转发 `draw()`」的样板代码。所以实战中一定要留抽象装饰器这一层，它把转发逻辑写一次，具体装饰器只写差异。这一点在笔记的 `ColorShape` 里已经体现，但很多人抄这段代码时会把它删掉「简化」掉，结果是后面每加一个维度就要复制一遍转发代码。

---

## 五、核心实现之二：函数式装饰器，前端的主力形态

GoF 的书是 Java 年代写的，装饰器被设计成「一个类包一个类」。而 JavaScript 里，**函数是一等公民**，所以最常用的形态是「一个函数包一个函数」。这不是「另一种模式」，而是同一个模式在函数式语言里的自然形态——**Component 接口变成了函数签名，Decorator 类变成了高阶函数。**

### 第一版：`withLogging`，最简装饰器

```typescript
function withLogging<T extends (...args: any[]) => any>(fn: T): T {
  return ((...args: any[]) => {
    console.log(`调用 ${fn.name}`, args);
    return fn(...args);
  }) as T;
}

async function createConsultOrder(params: ConsultOrderParams) {
  return await request('/api/consult/order', params);
}

const loggedCreateOrder = withLogging(createConsultOrder);
```

三行代码，装饰器的三个要素全在：

- `T extends (...args: any[]) => any` —— **同签名**（等价于类版里的 `implements Component`）
- `fn` 作为参数被闭包捕获 —— **持有引用**
- 先 `console.log` 再 `fn(...args)` —— **转发 + 增强**

### `as T` 为什么必须写

把 `as T` 去掉，你会发现返回类型的推断会退化。原因很实在：**TypeScript 无法从「一个接收 `(...args:any[]) => any` 并调用它的函数」推断出原函数的具体签名**——参数类型、返回值类型、泛型参数都丢了。

`as T` 是一个**类型断言**：它没有改变运行时行为，只是在告诉编译器「相信我，这个包装函数的签名和 `fn` 一致」。所以这里有一个必须知道的代价——

> **`as T` 是「声称」而不是「证明」。** 如果你的包装函数真的改变了签名（比如多接收一个参数、返回值包了一层），`as T` 会把这个错误藏起来，直到调用方在运行时踩坑。

这是前端装饰器实现里最常见的一种「类型谎言」，面试时能主动提出来，说明你不是只抄过代码。

### 第二版：装饰器工厂，怎么给装饰器传参

`withLogging` 有个现实问题：日志前缀、采样率、上报渠道都是要配置的。但装饰器签名已经固定为 `(fn) => fn`，没法再加参数。

**解法是再套一层函数**——这就是「装饰器工厂」：

```typescript
// 👈 工厂：接收配置，返回一个真正的装饰器
function withRetry(times: number) {
  return function <T extends (...args: any[]) => any>(fn: T): T {
    return (async (...args: any[]) => {
      let lastErr: unknown;
      for (let i = 0; i <= times; i++) {
        try {
          return await fn(...args);
        } catch (err) {
          lastErr = err;
        }
      }
      throw lastErr;
    }) as T;
  };
}

// 👈 用法：先调用工厂产出装饰器，再装饰目标函数
const resilientCreateOrder = withRetry(2)(createConsultOrder);
```

**`withRetry(2)` 返回的是装饰器，不是装饰结果。** 这个「多一层」是为了**把配置和装饰分成两步**——配置可以来自常量、环境变量、甚至接口下发，而装饰动作保持不变。

同样的形状可以写出 `withTimeout(ms)`：

```typescript
function withTimeout(ms: number) {
  return function <T extends (...args: any[]) => any>(fn: T): T {
    return ((...args: any[]) => {
      return Promise.race([
        fn(...args),
        new Promise((_, reject) => setTimeout(() => reject(new Error('超时')), ms)),
      ]);
    }) as T;
  };
}
```

### 第三版：`compose`，把 N 个装饰器折起来

装饰器一多，嵌套写法就变成了嵌套地狱：

```typescript
// ❌ 括号越堆越深，一眼看不出执行顺序
const service = withLog(withPermission(withMask(withRetry(2)(createOrder))));
```

用一个 `compose` 把它变成平铺的列表：

```typescript
function compose<T extends (...args: any[]) => any>(...decorators: Array<(fn: T) => T>) {
  return (fn: T): T => decorators.reduceRight((acc, decorator) => decorator(acc), fn);
}

// 👈 从左到右写，符合阅读直觉
const service = compose(
  withLog(),
  withPermission('consult:create'),
  withMask(),
  withRetry(2),
)(createOrder);
```

**`reduceRight` 是这一行代码的全部秘密，也是全篇最容易被追问的一个细节。**

`compose(a, b, c)(fn)` 的实际组合结果是：

```typescript
a(b(c(fn)))
```

也就是说——**写在最左边的 `a` 在最外层，最先看到调用；写在最右边的 `c` 紧贴原函数，最后执行**。

用执行顺序画出来（假设三者都是「先增强、后转发」）：

| 阶段 | 谁在执行 |
| --- | --- |
| 进入 1 | `withLog` 的前置逻辑（最先执行） |
| 进入 2 | `withMask` 的前置逻辑 |
| 进入 3 | `withRetry` 的前置逻辑 |
| 到底 | `createOrder`（真正的业务逻辑） |
| 返回 3 | `withRetry` 的后置逻辑 |
| 返回 2 | `withMask` 的后置逻辑 |
| 返回 1 | `withLog` 的后置逻辑（最后执行） |

**「进入顺序从左到右，返回顺序从右到左」——这句话可以直接背。** 它和 `reduceRight` 的数学定义完全一致：从右边开始折叠，所以最右边的函数最先被应用（贴着原函数），最左边的最后被应用（成了最外层）。

> 💬 **面试官**：`compose(a, b, c)(fn)` 里，如果 `a`、`b`、`c` 都是在调用前后各打一行日志，最终输出顺序是什么？
>
> ✅ 标准答案：`a-before → b-before → c-before → fn → c-after → b-after → a-after`。原因是 `compose` 用 `reduceRight` 从右往左折叠，最终结构是 `a(b(c(fn)))`。所以 `a` 在最外层，它的 before 最先执行、after 最后执行；`c` 在最内层，它的 before 最后执行、after 最先执行。
>
> 🎁 加分答案：能主动对比 Redux 中间件——Redux 的 `applyMiddleware` 也用了 `compose`，但中间件内部的 `next()` 让「进入」和「返回」交叉，所以它呈现的是洋葱模型（第 12 篇职责链会展开）。同一个 `compose`，放在普通高阶函数上是「装饰器链」，放在中间件上是「职责链」——**结构一样，差别在于每一层是否无条件调用下一层**。这正是第九章辨析四要讲的内容。

### 类版 vs 函数版：一张表看清取舍

| 维度 | 类版（GoF 原版） | 函数版（高阶函数） |
| --- | --- | --- |
| 能否保留 `fn.name` | 能（`this.constructor.name`） | 不能，需手动 `Object.defineProperty` |
| 能否用 `instanceof` 判断 | 能 | 不能 |
| 能否被继承扩展 | 能 | 不能（函数没有继承体系） |
| 类型保留程度 | 自然（同接口） | 需 `as T` 断言，有「类型谎言」风险 |
| 适用对象 | 类实例、有状态对象 | 函数、无状态操作 |
| 在实际项目中的占比 | 少（主要在框架 / SDK 里） | **多（业务代码几乎全是这个）** |

**一句话选择法**：装饰的是「一个有状态的对象」（比如一个 service 实例），用类版；装饰的是「一次操作」（比如一个请求函数、一个事件处理函数），用函数版。

**函数版的「丢名字」问题值得单独提一句**，因为它在生产里会真的咬人：`withLogging` 返回的匿名函数，`fn.name` 是空字符串。如果你的日志、错误上报、性能监控都依赖函数名做区分，包装之后全部变成空串，监控面板会变成一坨。修法很土但有效：

```typescript
function withLogging<T extends (...args: any[]) => any>(fn: T): T {
  const wrapped = (...args: any[]) => {
    console.log(`调用 ${fn.name}`, args);
    return fn(...args);
  };
  // 👈 把名字补回去，避免监控里全是空字符串
  Object.defineProperty(wrapped, 'name', { value: fn.name });
  return wrapped as T;
}
```

> 💬 **面试官**：装饰器模式和高阶函数是一回事吗？
>
> ✅ 标准答案：结构上同构，但不等价。高阶函数是**语言特性**（函数可以作为参数和返回值），装饰器模式是**设计模式**（一种有明确意图的复用方案）。用高阶函数可以实现装饰器、职责链、策略、柯里化等很多模式——它是实现手段，不是模式本身。判断一段高阶函数代码是不是装饰器模式，看意图：**它是否在保持被包装者接口不变的前提下，给同一对象叠加了额外职责**。
>
> 🎁 加分答案：能划出两条边界——① **防抖 / 节流不算装饰器模式**。它们改变的是「调用时机」，返回的函数语义已经不同（同一时间窗口内多次调用只生效一次），不是「在原来行为上多做了点什么」，通常归为「函数包装」，与装饰器的「叠加职责」是两件事。② **`withRetry` 这类重试包装严格说也不是纯装饰器**，因为它可能**不调用**原函数（比如它自己就抛错时），更接近「带重试策略的调用器」。但在工程实践中，只要它保持签名不变、可叠加、可透明替换，团队一般仍按装饰器来组织代码。**模式是判据，不是户口本。**

---

## 六、核心实现之三：TypeScript 装饰器的四种形态

前面两节的装饰器，都是**你自己手写**的包装逻辑。而 TypeScript 提供了一套语法糖——在类、方法、属性前面加一个 `@`，编译器自动帮你把包装逻辑织进去。

先记住笔记里的三句定义，它们把这块的范围划得很清楚：

- **装饰器是一种特殊类型的声明，它能够被附加到类声明、方法、属性或参数上，可以修改类的行为**
- **常见的装饰器有类装饰器、属性装饰器、方法装饰器和参数装饰器**
- **装饰器的写法分为普通装饰器和装饰器工厂**

### 先分清两条规范路线（这是最容易翻车的地方）

在讲代码之前，必须先说清一件笔记里没有、但面试一定会踩的事：**TypeScript 装饰器有两套不兼容的规范。**

| 维度 | 老版（`experimentalDecorators`） | 新版（Stage 3 / TS 5.0+） |
| --- | --- | --- |
| 开启方式 | `tsconfig` 里 `"experimentalDecorators": true` | 默认支持，无需开关 |
| 方法装饰器签名 | `(target, key, descriptor)` | `(value, context)` |
| 元数据反射 | 依赖 `reflect-metadata` | 走 `context.metadata` |
| 谁在用 | NestJS、Angular、TypeORM、老项目 | 新项目、TC39 标准化方向 |

**一句话记住区别**：老版是「拿到 `descriptor` 自己改」，新版是「拿到 value 和 context，返回新 value」。两者语法看起来一样（都是 `@xxx`），但**装饰器函数体内的参数完全对不上**——把 NestJS 的装饰器抄到新项目里，或者反过来，都会编译报错。

本篇后面的代码全部是**老版**（因为笔记就是老版，NestJS 也是老版）。新版写法的对照放在第十章末尾，避免混淆。

### 类装饰器：改的是类本身

```typescript
interface Animal {
  swings: number;
  fly: any;
}

function flyable(target: any) {
  console.log(target);
  target.prototype.swings = 2;
  target.prototype.fly = function() {
    console.log('I can fly');
  }
}

// "experimentalDecorators": true
@flyable
class Animal {
  constructor() {}
}
const animal = new Animal();
console.log(animal.swings);
animal.fly();
```

**类装饰器的唯一参数是「类的构造函数」本身**——注意 `console.log(target)` 打印出来的是 `[Function: Animal]`，不是 `Animal.prototype`。因为装饰器要在类定义**完成之前**运行，此时实例还不存在，只有构造函数。

于是要做「给所有实例加能力」，就得写到 `target.prototype` 上。`@flyable` 干的事，等价于在类定义后手写：

```typescript
Animal.prototype.swings = 2;
Animal.prototype.fly = function() { console.log('I can fly'); };
```

**所以类装饰器的三种用法，可以对应到三种返回值：**

- **返回 `void`**：只修改 `prototype`，类本身不变（笔记里这个 `flyable` 就是）
- **返回一个新类**：**替换**原类——这是做「类级装饰器模式」的正统写法，等价于 `class Wrapped extends Original {}`
- **什么都不做**：纯粹打标记（NestJS 的 `@Controller` 就是这个用途，第十章展开）

### 装饰器工厂：唯一能给装饰器传参的写法

`@flyable` 只能写死成 `swings = 2`。想要配置翅膀数量，就必须把装饰器改成「工厂」：

```typescript
interface Animal {
  swings: number;
  fly: any;
}

// 工厂函数
function flyable(swings: number) {
  return function(target: any) {
    console.log(target);
    target.prototype.swings = swings;
    target.prototype.fly = function() {
      console.log('I can fly');
    }
  }
}

// "experimentalDecorators": true
@flyable(5)
class Animal {
  constructor() {}
}
const animal = new Animal();
console.log(animal.swings);
animal.fly();
```

**为什么必须多这一层？** 因为 `@` 后面跟着的东西，编译器会**直接当成装饰器函数调用**——`@flyable` 会被编译成 `flyable(Animal)`。所以如果你写 `@flyable(5)`，编译器实际做的是 `flyable(5)(Animal)`：

- `flyable(5)` 先执行，返回一个函数
- 这个返回的函数再被拿去装饰 `Animal`

**这就回答了那个高频问题：为什么写 `@log()` 而不是 `@log`？** 因为 `@log` 会被直接调用成 `log(Animal)`，此时 `Animal` 变成了 log 的第一个参数；而 `@log()` 是先执行 `log()` 得到一个真正的装饰器，再用它去装饰 `Animal`。

### 属性装饰器与方法装饰器：`target` 到底是什么

笔记里这四个装饰器，是全篇信息密度最高的一段——因为它一次性把「实例 vs 静态」的分野说清了：

```typescript
// 实例属性，target是类的原型对象，name是属性的名字
function instancePropertyDecorator(target: any, name: string) {
  console.log(target, name);
}
// 静态属性，target是类的构造函数，name是属性的名字
function classPropertyDecorator(target: any, name: string) {
  console.log(target, name);
}
// 实例方法，target是类的原型对象，name是方法的名字，descriptor是属性的描述
function instanceMethodDecorator(target: any, name: string, descriptor: any) {
  console.log(target, name, descriptor);
}
// 静态方法，target是类的构造函数，name是方法的名字，descriptor是属性的描述
function classMethodDecorator(target: any, name: string, descriptor: any) {
  console.log(target, name, descriptor);
}

class Person {
  @instancePropertyDecorator
  instanceProperty!: string; // 实例属性
  @classPropertyDecorator
  static classProperty: string; // 类的静态属性
  @instanceMethodDecorator
  instanceMethod() { // 实例方法
    console.log(this.instanceMethod);
  }
  @classMethodDecorator
  static classMethod() { // 类的静态方法
    console.log(Person.classProperty);
  }
}

const p = new Person();
console.log(p.instanceProperty);
p.instanceProperty = 'robin';
console.log(p.instanceProperty);
```

**这张「`target` 是什么」的对照表必须刻在脑子里：**

| 装饰的目标 | `target` 是 | 参数个数 |
| --- | --- | --- |
| 实例属性 | `Person.prototype` | 2（target, name） |
| 静态属性 | `Person`（构造函数） | 2（target, name） |
| 实例方法 | `Person.prototype` | 3（target, name, descriptor） |
| 静态方法 | `Person`（构造函数） | 3（target, name, descriptor） |

**规律只有一句：装饰器拿到的 `target`，就是这个成员「挂在谁身上」——实例成员挂在 `prototype` 上，静态成员挂在构造函数上。** 同时注意笔记里最后那个注释写的是「静态方法，target 是类的原型对象」，这一条和它上面那条矛盾：静态方法的 `target` 其实是**构造函数**，和第 2 条静态属性一致。这一点在面试白板上很容易被自己写混。

### 第四种形态：参数装饰器

笔记的定义里提到了「参数装饰器」，但没展开。它比前三种简单，只有一处要记住——**多了一个「第几个参数」的索引**：

```typescript
// 👈 参数装饰器：target、方法名、参数下标
function Param(label: string) {
  return function (target: any, name: string, index: number) {
    console.log(`${name} 的第 ${index} 个参数：${label}`);
    // 👈 通常是把「第几个参数是什么」存进元数据，供运行时读取
  };
}

class ConsultController {
  findOne(@Param('处方ID') id: string, @Param('是否含已删除') includeDeleted?: boolean) {}
}
```

**参数装饰器的返回值会被忽略**——它不能像方法装饰器那样改 `descriptor.value`，只能往元数据里写东西。这也是为什么它几乎只出现在框架里（NestJS 的 `@Param`、`@Body`、`@Query`）：框架启动时扫描这些元数据，就知道「这个方法调用时，第 0 个参数应该从路径里取」。

### `descriptor.value`：所有 AOP 的技术入口

方法装饰器的第三个参数 `descriptor` 是属性描述符，长这样：

```typescript
{
  value: Function,      // 👈 方法本体
  writable: true,
  enumerable: false,
  configurable: true
}
```

**装饰器要「改变方法行为」，唯一的合法途径就是改 `descriptor.value`，或者返回一个新的 `descriptor`。** 这个范式在笔记后面的 `deprecate` 和 `App.js` 的 `before` / `after` 里反复出现，形式都是同一个：

```typescript
function someDecorator(target: any, name: string, descriptor: any) {
  const oldVal = descriptor.value;         // 👈 1. 先把原方法存起来
  descriptor.value = function (...args: any[]) {
    // 2. 前置增强
    const result = oldVal.apply(this, args);  // 3. 转发
    // 4. 后置增强
    return result;
  };
}
```

**注意 `oldVal.apply(this, args)` 里的 `this`。** 这里必须用普通的 `function`，不能用箭头函数——因为箭头函数不绑定自己的 `this`，装饰后的方法会丢失 `this` 指向，调用 `this.instanceMethod` 之类的东西直接报错。**这是 TS 装饰器里最高频的运行时 bug。**

### `core-decorators`：别人已经写好的装饰器

笔记引用了一个现成的库，并手写了它里面 `deprecate` 的实现——这段代码值得完整读一遍，因为它是「`descriptor.value` 范式」最干净的教科书用法：

```typescript
import { readonly, /* deprecate */ } from 'core-decorators';

function deprecate(msg?: string, options?: any) {
  return function(target: any, attr: any, descriptor: any) {
    const oldVal = descriptor.value;
    descriptor.value = function(...args: any[]) {
      const message = `DEPRECATION ${target.constructor.name}#${attr}: ${msg ? msg : 'This function will be removed in future versions.'}`;
      const see = options && options.url ? `See ${options.url} for more details.` : '';
      console.log(`${message}\r\n\t${see}`);
      return oldVal(...args);
    }
  }
}
 
class Person {
  @deprecate()
  facepalm() {}
 
  @deprecate('We stopped facepalming')
  facepalmHard() {}
 
  @deprecate('We stopped facepalming', { url: 'http://knowyourmeme.com/memes/facepalm' })
  facepalmHarder() {}
}
 
let person = new Person();
 
person.facepalm();
// DEPRECATION Person#facepalm: This function will be removed in future versions.
 
person.facepalmHard();
// DEPRECATION Person#facepalmHard: We stopped facepalming
 
person.facepalmHarder();
// DEPRECATION Person#facepalmHarder: We stopped facepalming
//
//     See http://knowyourmeme.com/memes/facepalm for more details.
//
```

**为什么这段代码是装饰器模式的教科书案例？** 因为它同时做对了三件事：

- **调用方完全无感**：`person.facepalm()` 的写法一字未变，控制台多出来的那行日志是装饰器加的
- **原方法一字未改**：`facepalm() {}` 还是空的，废弃提示是包装出来的
- **可以叠加**：`deprecate` 外面还能再套 `readonly`、`@memoize`、`@debounce`——它们都遵循同一套 `descriptor.value` 协议，因此能自由组合

`target.constructor.name` 这一句也值得留意：因为实例方法的 `target` 是 `Person.prototype`，所以要从 `prototype` 反查构造函数才能拿到类名 `Person`。**这是「`target` 是 prototype」这条规律在实际代码里的直接后果。**

### 多个装饰器同时使用时的顺序

```typescript
class Report {
  @before(() => console.log('①'))
  @after(() => console.log('②'))
  submit() {}
}
```

**规则是：装饰器表达式从上到下求值，但应用（包装）从下到上。**

所以实际效果是：

```typescript
// 👈 等价于这个（注意②在里、①在外）
before(() => console.log('①'))(after(() => console.log('②'))(submit))
```

调用 `report.submit()` 时，`①` 会先把 `②` 包起来——**写在上面的装饰器在最外层，最先执行前置逻辑，最后执行后置逻辑。** 这个规则和第五节 `compose` 的规则完全一致，因为它们在语义上是同一件事。

> 💬 **面试官**：为什么写装饰器的时候，有时候是 `@log`，有时候是 `@log()`？
>
> ✅ 标准答案：取决于这个装饰器需不需要接收配置参数。`@log` 会把「被装饰的目标」直接作为第一个参数传进去，等价于 `log(Target)`——只能用在不需要配置的简单场景。`@log()` 是先**调用** `log()` 拿到一个真正的装饰器函数，再由编译器用它去装饰目标，等价于 `log()(Target)`——因为中间多了一层闭包，才有地方接配置参数。这也是「装饰器工厂」的名称来源。
>
> 🎁 加分答案：能补一句类型层面的判据——如果一个装饰器函数**返回了函数**，那它就必须用 `@xxx()` 的形式；如果它**自己就是装饰器**（参数里有 `target`），那就用 `@xxx`。判断标准很简单：看这个函数的第一个参数是不是 `target`。是，就是装饰器本身；不是（是配置项），就是工厂，必须调用一次。

---

## 七、核心实现之四：AOP 与无痕埋点

装饰器模式最出名的一个工程化落地，叫 **AOP（面向切面编程）**。它不是一个 GoF 模式，而是一种**编程范式**——但它的实现手段，几乎完全建立在装饰器思想上。

### AOP 是什么

笔记里那句定义，一字不改地给出来：

- **在软件业，AOP 为 `Aspect Oriented Programming` 的缩写，意为面向切面编程**
- **可以通过预编译方式和运行期动态代理实现在不修改源代码的情况下给程序动态统一添加功能的一种技术**

把这两句翻译成人话：**AOP 要解决的是「横切关注点」的集中管理**——日志、埋点、权限、事务、缓存这些东西，横着切过所有业务方法，不适合写在任何一个方法里，AOP 就是给它们一个统一的挂载点。

下面这张图把 AOP 的运行时结构画得很清楚：业务方法（target）外面套了一层代理，`before` 在它执行前跑，`after` 在它执行后跑。

![Spring AOP 调用过程：请求先经过 before 织入点，进入目标方法执行，返回时经过 after 织入点，业务代码本身不含任何切面逻辑](https://cdn.nlark.com/yuque/0/2021/png/738210/1638787421456-335b0f3d-45dd-4a30-b6ee-5925a9d8e139.png)

### 三种织入点

| 织入点 | 执行时机 | 典型用途 |
| --- | --- | --- |
| **before** | 目标方法执行**前** | 参数校验、权限检查、日志入参 |
| **after** | 目标方法执行**后** | 埋点上报、清理资源、记录返回值 |
| **around** | 包住整个调用 | 耗时统计、重试、缓存（before + after 的超集） |

**注意 around 不是独立的第四种，它是「一层包住前后」的写法**——也就是我们前面手写的那些高阶函数。这是后面理解「装饰器 / AOP / 中间件」三者关系的钥匙。

### 笔记里的手工 AOP 实现

```typescript
//Aop构造器
interface Aop{
  // constructor(options: Record<string, any>): void;
}
const Aop = function Aop(options: Record<string, any>){
  this.options = options
} as any;
//业务方法执行前钩子
Aop.prototype.before = function(cb: Function){
  cb.apply(this)
}
//业务方法执行后钩子
Aop.prototype.after = function(cb: Function){
  cb.apply(this)
}
//业务方法执行器
Aop.prototype.execute = function(beforeCb: Function,runner: Function,afterCb: Function){
  this.before(beforeCb)
  runner.apply(this)
  this.after(afterCb)
}

var aop = new Aop({
  afterInfo:'执行后',
  runnerInfo:'执行中',
  beforeInfo:'执行前'
})

var beforeCb = function(){
  console.log(this.options.beforeInfo)
}
var afterCb = function(){
  console.log(this.options.afterInfo)
}
var runnerCb = function(){
  console.log(this.options.runnerInfo)
}

aop.execute(beforeCb,runnerCb,afterCb);
```

**这段代码必须诚实点评一句：它是「手工 AOP」，不是「自动织入」。**

- 它把 before / after / runner 三件事**显式地传进 `execute`**，由调用方决定，业务代码 `runnerCb` 完全没被改动——这一点是对的
- 但真正的 AOP 是**业务代码什么都不用做**，切面自动生效。而这里你必须**主动调用 `aop.execute(...)`** 而不是直接调 `runnerCb()`，所以「不修改源代码」只做到了一半

**真正的自动织入，靠的是下面三种手段之一：**

- **装饰器**：`@before(() => ...)` 直接贴在方法上，编译期织入（第七节后半段的 `App.js` 就是这个）
- **动态代理**：用 `Proxy` 包一层，运行时拦截（第 08 篇代理模式的主场）
- **编译期插桩**：Babel 插件 / 打包器插件改写 AST

**能说出这个区别，是这一节最有价值的加分点**——大部分讲 AOP 的文章会直接把这段 `Aop` 构造器当「AOP 实现」讲完，但它在工程上是「手动编排」，不是「自动织入」。

### 无痕埋点：装饰器在业务里的最佳落地

先给笔记的定义，原文保留：

- **埋点分析：是网站分析的一种常用的数据采集方法**
- **无痕埋点：通过技术手段，完成对用户行为数据无差别的统计上传的工作，后期数据分析处理的时候通过技术手段筛选出合适的数据进行统计分析**

**「无痕」两个字的含义，是不需要业务开发者手动写 `track()`**——埋点动作被装饰器接管，业务代码只管干自己的活。

**工程配置：让 Babel 和 TypeScript 都认识 `@`**

用 create-react-app 起步时，CRA 默认不支持装饰器语法，要打两个补丁。

第一步，装依赖：

```shell
create-react-app tract
yarn add customize-cra react-app-rewired --dev
yarn add @babel/plugin-proposal-decorators --dev
```

第二步，打开 CRA 的配置覆写能力，`package.json` 里只贴关键部分（省略 CRA 默认依赖：`react` / `react-dom` / `react-scripts` / `@testing-library/*` / `web-vitals`）：

```json
{
  "name": "tract",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "start": "react-app-rewired start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "devDependencies": {
    "@babel/plugin-proposal-decorators": "^7.16.4",
    "customize-cra": "^1.0.0",
    "react-app-rewired": "^2.1.8"
  }
}
```

**`start` 命令从 `react-scripts start` 换成了 `react-app-rewired start`**——这是整套配置的开关，不换这一行，后面所有覆写都不会生效。

第三步，写覆写配置：

```javascript
const {override, addDecoratorsLegacy} = require('customize-cra');
module.exports = override(addDecoratorsLegacy());
```

`addDecoratorsLegacy()` 这一行，等价于往 Babel 里塞了 `@babel/plugin-proposal-decorators` 的 **legacy（老版）模式**——正是前面讲的那条老规范路线。

第四步，让编辑器/类型检查也认可——新建 `jsconfig.json`（TS 项目里则是 `tsconfig.json`）：

```json
{ 
  "compilerOptions": { 
    "experimentalDecorators": true 
  }
}
```

**这两步分工必须分清，因为很多人只做了其中一步然后报错：**

| 配置文件 | 管什么 | 不配会怎样 |
| --- | --- | --- |
| `config-overrides.js` | **Babel 编译**——把 `@` 语法转成运行时代码 | 浏览器报语法错误 |
| `jsconfig.json` | **类型检查 / 编辑器提示** | 编辑器标红，但代码能跑 |

配置完成后的项目结构如下：

![](https://cdn.nlark.com/yuque/0/2021/png/738210/1638801619160-2dd2c20c-5fa3-4617-8a01-07bf3c16f996.png)

`src/index.js`、`src/index.css`、`src/App.css` 都是 CRA 脚手架生成的默认文件，和装饰器无关，这里不贴（`index.css` 里是 `body` 的字体与抗锯齿设置，`App.css` 只有一行 `text-align: center`）。

**`src/App.js`：两个装饰器，一个埋点**

```javascript
import { Component } from 'react';
import './App.css';

function before(fn) {
  return function(target, name, descriptor) {
    const oldFn = descriptor.value;
    descriptor.value = function() {
      fn.apply(this, arguments);
      const result = oldFn.apply(this, arguments);
      return result;
    }
  }
}

function after(fn) {
  return function(target, name, descriptor) {
    const oldFn = descriptor.value;
    descriptor.value = function() {
      const result = oldFn.apply(this, arguments);
      fn.apply(this, arguments);
      return result;
    }
  }
}

class App extends Component {
  @before(() => console.log('before'))
  beforeClick() {
    console.log('beforeClick');
  }
  @after(() => console.log('after'))
  afterClick() {
    console.log('afterClick');
  }
  @after(() => fetch('/api/report'))
  ajaxClick() {
    console.log('ajaxClick');
  }
  render() {
    return <div className="App">
    <button onClick={this.beforeClick}>beforeClick</button>
    <button onClick={this.afterClick}>afterClick</button>
    <button onClick={this.ajaxClick}>afterClick</button>
  </div>
  }
}
export default App;
```

**这段代码里有四个必须讲透的细节：**

**细节一：`@before` 和 `@after` 的差别只在一行代码的位置。**

```typescript
// before：先跑增强，再跑原方法
fn.apply(this, arguments);
const result = oldFn.apply(this, arguments);

// after：先跑原方法，再跑增强（并且把原方法的返回值存下来）
const result = oldFn.apply(this, arguments);
fn.apply(this, arguments);
```

**`after` 里为什么要把 `result` 存起来再返回？** 因为如果不存，`return oldFn.apply(...)` 之后就没机会执行 `fn` 了——`return` 会直接结束函数。这是一个很小但很容易写错的点。

**细节二：`arguments` 和 `this` 都必须手动传递。**

`descriptor.value = function() {...}` 里用的是**普通函数**（不是箭头函数），并且显式 `fn.apply(this, arguments)`——这两处都是为了让装饰后的方法**保持原有的调用上下文和参数**。

- 写成箭头函数 → `this` 丢失，React 组件里的 `this.props`、`this.setState` 全部拿不到
- 不传 `arguments` → 事件对象 `e` 丢了，`onChange` 场景直接崩

**细节三：`@after(() => fetch('/api/report'))` 就是最小的无痕埋点。**

注意这一行：`ajaxClick` 的业务代码只有 `console.log('ajaxClick')`，**上报动作完全不在方法体里**，而是通过装饰器在方法执行后自动触发。如果哪天要把 `/api/report` 换成埋点 SDK，只改装饰器参数，不动任何业务方法——这就是「无痕」二字的实际含义。

**细节四：三个装饰器的执行顺序，可以用控制台验证。**

点击第一个按钮输出 `before` → `beforeClick`，点击第二个按钮输出 `afterClick` → `after`。**注意 `before` 装饰器打出的是 `before` 而不是 `beforeClick`**——它装饰时的 `fn` 是那个箭头函数 `() => console.log('before')`，`oldFn` 才是 `beforeClick` 方法本体。

🔧 **真实场景**：全站点击埋点是 `@after` 最标准的用法——把「上报点击事件」抽成一个 `@track('click', { page })` 装饰器，贴在需要统计的方法上；后续产品经理要加新指标，只改装饰器参数或规则表，业务代码零侵入。**这正是 AOP 的价值：让「跨业务的关注点」集中在装饰器里，而不是散落在 200 个方法里。**

> 💬 **面试官**：AOP 和装饰器模式是什么关系？
>
> ✅ 标准答案：AOP 是一种**编程范式**（目标是集中管理横切关注点），装饰器模式是一种**设计模式**（动态给对象加职责）。装饰器是实现 AOP 的**手段之一**，而且是最常用的手段——因为装饰器天然满足 AOP 的两个要求：不改原代码、可以在调用前后插入逻辑。除了装饰器，AOP 还可以用动态代理（`Proxy`）或编译期插桩（Babel 插件）实现。反过来说，装饰器模式并不只服务于 AOP——装饰器也可以用来做「能力叠加」（比如给对象加缓存能力），那就不涉及切面概念了。
>
> 🎁 加分答案：能区分「手工编排」和「自动织入」——很多教程里的 AOP 实现是 `aop.execute(before, runner, after)`，本质上还是调用方显式地编排三段逻辑，业务代码虽然没改，但**调用方式变了**；真正的自动织入要求调用方也完全无感，只能靠装饰器语法、代理或编译期改写来实现。**判断一个 AOP 实现是真是假，就看「调用方需不需要知道切面的存在」。** 这个判据放到任何一个「无侵入」方案上都成立。

---

## 八、核心实现之五：表单校验，装饰器收集元数据

这一节是「装饰器 + 元数据」的组合，也是 TypeScript 装饰器在企业项目里最主流的用途——**它不改变方法行为，而是把「规则」写成声明，交给一个统一执行器去跑。**

### 先讲清一个高频坑：属性装饰器改不了值

很多人第一次写校验装饰器，都想这么干：

```typescript
// ❌ 这条思路走不通
function Required(target: any, name: string) {
  const value = target[name];        // 👈 undefined
  if (!value) throw new Error(`${name} 不能为空`);
}
```

**为什么拿不到值？** 因为属性装饰器在**类定义阶段**执行，此时：

- 你拿到的是 `target`（实例成员时是 `prototype`），不是实例
- 实例还没被 `new` 出来，字段自然没有值
- 就算有值，也是所有实例共享的 `prototype`，不能存业务数据

**所以属性装饰器能做的只有一件事：把「这个字段有什么规则」记录下来。** 真正的校验，必须等到有一个具体的对象时，由外部函数遍历规则逐条执行。

这个约束看起来是限制，其实是正确设计的必然——**装饰器加的是「行为 / 元信息」，不是「状态」。** 想加状态（比如拦截赋值、读写转换），就要换工具：`Proxy` 或者 `Object.defineProperty` 的 getter / setter（第 08 篇代理模式的主场）。

### 规则注册表：用 Map 存，不引入 `reflect-metadata`

```typescript
// 👈 规则类型：一个校验函数 + 一条错误提示
type Validator = (value: unknown) => string | null;

interface FieldRule {
  name: string;
  validators: Validator[];
}

// 👈 按「类」分组存规则，key 是构造函数
const ruleStore = new WeakMap<Function, FieldRule[]>();

function addRule(target: any, name: string, validator: Validator) {
  const ctor = target.constructor;         // 👈 从 prototype 反查构造函数
  const rules = ruleStore.get(ctor) ?? [];
  const existing = rules.find((r) => r.name === name);
  if (existing) {
    existing.validators.push(validator);
  } else {
    rules.push({ name, validators: [validator] });
  }
  ruleStore.set(ctor, rules);
}
```

**两个设计选择值得说：**

- **为什么用 `WeakMap`**：规则的 key 是类的构造函数。用 `WeakMap` 可以保证类被回收时规则一起回收，不会造成内存泄漏（和用 `Map` 存 DOM 节点一个道理）
- **为什么从 `target.constructor` 反查**：因为实例属性的 `target` 是 `prototype`，而 `prototype.constructor` 指回构造函数。**这正是第六节那张「`target` 是什么」对照表的实战应用**

### 两个装饰器：`@Required` 与 `@Range`

```typescript
// 👈 必填
function Required(message = '不能为空') {
  return function (target: any, name: string) {
    addRule(target, name, (value) => {
      if (value === undefined || value === null || value === '') return message;
      return null;
    });
  };
}

// 👈 数值范围
function Range(min: number, max: number, message?: string) {
  return function (target: any, name: string) {
    addRule(target, name, (value) => {
      const num = Number(value);
      if (Number.isNaN(num)) return `${name} 必须是数字`;
      if (num < min || num > max) return message ?? `必须在 ${min} 到 ${max} 之间`;
      return null;
    });
  };
}
```

**两个装饰器都用了工厂形式（`@Required()` 而不是 `@Required`）**，因为它们都要接收配置——`Required` 要错误文案，`Range` 要上下界。原因在第六节已经讲过：`@xxx()` 才能传参。

### 执行器：`validate` 遍历规则

```typescript
interface ValidationError {
  field: string;
  message: string;
}

function validate<T extends object>(obj: T): ValidationError[] {
  const rules = ruleStore.get(obj.constructor) ?? [];
  const errors: ValidationError[] = [];
  for (const rule of rules) {
    const value = (obj as Record<string, unknown>)[rule.name];
    for (const check of rule.validators) {
      const message = check(value);
      if (message) {
        errors.push({ field: rule.name, message });
        break;                             // 👈 一个字段报一条，避免重复提示
      }
    }
  }
  return errors;
}
```

**注意 `break`：** 一个字段有多条规则时，一旦第一条失败就跳出，只报一条错误。这是表单交互的常见要求（不让用户一次看到同一字段的三条报错），但也要知道代价——**修完第一条才能看到第二条**，体验上是「挤牙膏」。所以也有另一种做法是收集全部错误，按业务场景选。

### 落到处方场景

```typescript
class PrescriptionForm {
  @Required('药品编号不能为空')
  drugCode!: string;

  @Range(1, 5, '单次处方药品数量不能超过 5 盒')
  quantity!: number;
}

const form = new PrescriptionForm();
form.drugCode = '';
form.quantity = 8;

console.log(validate(form));
// [
//   { field: 'drugCode', message: '药品编号不能为空' },
//   { field: 'quantity', message: '单次处方药品数量不能超过 5 盒' }
// ]
```

**对比一下没有装饰器的写法，就知道它省掉了什么：**

```typescript
// ❌ 规则和字段分离，加字段要改两处，字段一多就漏
function validatePrescription(form: PrescriptionForm) {
  const errors = [];
  if (!form.drugCode) errors.push({ field: 'drugCode', message: '药品编号不能为空' });
  if (form.quantity < 1 || form.quantity > 5) errors.push({ field: 'quantity', message: '...' });
  // ... 再来 20 个字段
  return errors;
}
```

**装饰器版本的价值在于：规则和字段贴在一起，新增字段不用改校验函数。** 这是「就近声明」带来的可维护性——你看到字段的时候，就看得到它的约束。

### 关于 `reflect-metadata`：知道它为什么存在就够了

上面的实现用了自己的 `WeakMap`。而很多库（NestJS、TypeORM、class-validator）用的是 `reflect-metadata`：

```typescript
import 'reflect-metadata';

function Required(target: object, name: string) {
  Reflect.defineMetadata('required', true, target, name);
}

// 👈 读取时也能直接按「类 + 字段」取
const isRequired = Reflect.getMetadata('required', target, name);
```

**它解决的是「元数据该往哪存」这个标准问题**——不像我们那样自己维护一张表，而是把元数据挂在类/字段上，用统一的 `Reflect` API 读写。

**代价也很明显**：`reflect-metadata` 是一个 polyfill，会往全局注入 `Reflect` 的扩展，包体积增加约 50KB，且需要 `emitDecoratorMetadata` 编译选项。**所以小项目自己用 `WeakMap` 就够了，只有做框架/库、需要和其他装饰器生态互通时才引入它。**

> 💬 **面试官**：属性装饰器为什么不能直接修改属性的值？
>
> ✅ 标准答案：因为属性装饰器在**类定义阶段**执行，此时实例还不存在。它拿到的 `target` 是原型对象（实例成员）或构造函数（静态成员），上面没有具体实例的数据。而且字段本身在 TypeScript 里只是类型声明，编译后默认不会产生任何实际属性——没有东西可以改。所以属性装饰器只能用来**收集元数据**（记录规则、标记、类型信息），实际行为要交给运行时执行器。想真正拦截属性的读写，要用 `Object.defineProperty` 的 getter/setter，或者 `Proxy` 的 `get`/`set` 陷阱。
>
> 🎁 加分答案：能补一句边界——「元数据」这条路本身也有取舍。好处是声明式、可组合、执行器统一；代价是**规则和执行器之间是隐式绑定**——看一个字段的 `@Range(1,5)` 你看不出它什么时候被校验、由谁校验，必须去追 `validate` 的调用点。所以企业项目里通常配一套约定（字段变更即校验、提交时全量校验、blur 时单字段校验），把这个隐式契约写进文档或类型里。**装饰器让「加规则」变简单了，但让「理解规则何时生效」变难了**，这是它真正的成本。

---

## 九、易混淆辨析：四组必考对比

这一章是全篇最值钱的部分。装饰器的定义背下来没有用，**能不能在一堆长得很像的代码里把它认出来，才是面试真正的考点。**

### 辨析一：装饰器 vs 代理（本篇最重要的一组）

先看这三组代码：

```typescript
// ① 装饰器：加日志
function withLogging<T extends (...args: any[]) => any>(fn: T): T {
  return ((...args: any[]) => {
    console.log('调用', args);
    return fn(...args);          // 👈 一定转发
  }) as T;
}

// ② 代理：加缓存
function withCache<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, unknown>();
  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);   // 👈 可能不转发
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// ③ 代理：加权限拦截
function withPermission<T extends (...args: any[]) => any>(fn: T): T {
  return ((...args: any[]) => {
    if (!isLoggedIn()) throw new Error('未登录');  // 👈 直接拦截
    return fn(...args);
  }) as T;
}
```

**三个函数的结构完全一样**：返回一个同签名函数、闭包持有 `fn`、可以层层包裹。但它们是两个模式：

| 判据 | `withLogging`（装饰器） | `withCache` / `withPermission`（代理） |
| --- | --- | --- |
| 增加的是「做了什么」还是「能不能做」 | 做了什么（多打一行日志） | 能不能做（可能不给结果） |
| 是否可能不转发到原对象 | **不可能**，每次都转发 | **可能**，命中缓存或没权限就不转发 |
| 调用方还知道原对象存在吗 | 知道（透明包装） | 应该不知道（被代理挡住） |
| 是否要求可任意叠加 | 要求（装饰的目的就是叠加） | 不要求（通常一层代理足够） |

**用一句话收口：装饰器保证「原对象一定被调用」，代理允许「原对象被绕过」。**

这条判据和笔记里的原话完全一致：

> **装饰器关注增强职责（加日志、加校验），代理关注控制访问（延迟加载、权限拦截）——意图不同，但实现结构几乎一样，因此常被面试官拿来互相追问。**

**那 `withAuth` 到底算哪个？——直面开篇那道题**

回到文章开头那个把人问住的场景。诚实地拆一遍：

- **它是「控制访问」吗？** 是。没登录就不渲染组件，本质是「不给用」
- **它不转发吗？** 也不完全是——它转发成了 `LoginPage`，而不是什么都不返回
- **调用方知道原组件存在吗？** 知道。`withAuth(OrderList)` 里的 `OrderList` 就明晃晃写在调用处
- **它能自由叠加吗？** 能。`withAuth(withLoading(OrderList))` 是标准写法

**四条判据里，前两条偏向代理，后两条偏向装饰器。**

**实操结论**：React HOC 在**社区共识**里归装饰器模式，理由有两条——

1. **HOC 的整个设计目的就是为了「组合复用」**：`withAuth`、`withLoading`、`withErrorBoundary`、`withTracker` 这堆 HOC 是可以任意叠的，这是一种明确的「能力叠加」意图，正是装饰器的适用场景
2. **代理模式通常要求「调用方感知不到原对象」**，而 HOC 的调用处必须显式写出被包装的组件，这个透明性差异很关键

**但更值钱的答法是承认这是个边界案例**：

> 「`withAuth` 从『未登录就不渲染』这一行为看，带有保护代理的语义；从『作为可叠加的能力层被复用』这一用途看，它是标准装饰器。**模式是按动机分类的，不是按某一行代码的效果分类的**——因为我设计它的目的是『给页面加一层通用能力』，而不是『替页面挡住不该进来的用户』，所以归装饰器。」

**说出这段推理，比答对任何一个标签都有分量。** 因为面试官问这道题，考的不是你记不记得分类，而是你能不能在判据冲突时做出有理有据的判断。

### 辨析二：装饰器 vs 继承

组内最经典的一对，笔记写得很简短，这里展开成可操作的对照：

| 维度 | 继承 | 装饰器 |
| --- | --- | --- |
| 扩展时机 | 编译期（写死在源码里） | 运行时（装配时才决定） |
| 组合能力 | 单继承，只能有一个父类 | 任意叠加，且能动态拆装 |
| 类数量增长 | N × M（乘法，类爆炸） | N + M（加法） |
| 关系类型 | is-a（是一个） | has-a（里面有一个） |
| 违反的原则 | 大量组合时违反 OCP | 无（新增不改旧） |
| 出问题时的调试 | 调用栈浅，容易跟 | 层数多时栈变深，需要看穿包装 |

**「组合优于继承」这句被说烂的话，在装饰器这里有了具体的含义**：它不是一句道德判断，而是一个数学事实——**8 个形状 × 5 种颜色，继承要 40 个类，装饰器要 13 个。**

**但也要知道什么时候该用继承**（这点绝大多数文章不会说）：

- 组合关系**固定且唯一**（比如「所有报告都必须带水印」）→ 直接在基类里实现，不需要装饰器
- 需要**改变对象的状态结构**（比如子类多了三个字段）→ 继承更合适，装饰器只能加行为不能加字段
- 需要**类型层面的区分**（`instanceof` 判断、类型收窄）→ 类版装饰器勉强可以，函数版做不到

### 辨析三：装饰器 vs 适配器（承接第 06 篇）

这一组在上篇讲过，这里只留判据，方便对照复习：

- **适配器改变接口形状**（`charge()` → `output()`），目的是让两个对不上的东西能配合
- **装饰器保持接口不变**，目的是在原有行为上叠加能力

**一句话：接口形状变没变，是唯一分界。** 变了 → 适配器；没变 → 装饰器（或代理，再用辨析一的判据往下分）。

### 辨析四：装饰器 vs 职责链（为第 12 篇埋点）

这一组很多人没想过，但一旦想清楚，对「中间件」的理解会上一个台阶。

```typescript
// 装饰器链：每一层都执行
const decorated = withLog(withMask(withRetry(createOrder)));

// 职责链：每个节点可以「不往下传」
type Handler = (ctx: Ctx, next: () => void) => void;
const pipeline = (ctx: Ctx) => {
  if (!validateParams(ctx)) return;        // 👈 直接中断
  checkInventory(ctx, () => riskAudit(ctx, () => submit(ctx)));
};
```

| 维度 | 装饰器 | 职责链 |
| --- | --- | --- |
| 每一层是否都执行 | **是**，无条件转发 | **否**，可以中断 |
| 处理的是 | 同一次调用的增强 | 一个请求的传递 |
| 层与层的关系 | 包装（层层向内） | 接力（传给下一个能处理的） |
| 典型形态 | HOC、`@before/@after`、AOP | 中间件、拦截器、事件冒泡 |

**关键差别只有一句：装饰器每层都在为「同一个对象」做增强，职责链每层都在判断「这个请求是不是该我处理」。** 第 12 篇讲职责链时，会拿 Koa 中间件和这里的 `compose` 做对照——它们共用同一段 `reduceRight` 代码，但语义完全不同。

### 「包一层」五兄弟总表（承接第 06 篇）

上篇那张表的完整版，装饰器这一行就是本篇的主战场：

| 模式 | 包一层的目的 | 接口变不变 | 调用方能直连原对象 |
| --- | --- | --- | --- |
| **适配器** | 让不兼容的接口能配合 | **变** | 能 |
| **外观** | 收敛多个入口为一个 | 不一定 | 能（不阻止） |
| **代理** | 控制对原对象的访问 | 不变 | **不能**（或不该） |
| **装饰器** | 动态增强原对象职责 | 不变（可扩展） | 能 |
| **中介者** | 协调多对象双向交互 | 变 | **不能**（必须走中介） |

**给装饰器补一句判据**：**「接口不变 + 一定转发 + 目的是叠加」三条同时满足，就是装饰器。** 缺一条就往隔壁模式掉——缺「一定转发」掉进代理，缺「接口不变」掉进适配器，缺「叠加」可能就是单纯的委托。

> 💬 **面试官**：装饰器模式和代理模式，结构几乎一样，你在实际项目里是怎么区分的？
>
> ✅ 标准答案：看三条——① **是否允许不转发**：装饰器每次都调用原对象，代理可以绕过它（缓存命中、无权限、懒加载未初始化）；② **调用方是否知道原对象存在**：装饰器透明，代理要隐藏；③ **目的是否是叠加**：装饰器的设计目标就是层叠组合，代理通常一层就够。用这三条对照，绝大多数代码都能一眼分清。
>
> 🎁 加分答案：能承认边界模糊——有些场景两条判据会打架，比如 `withAuth`（不渲染 = 拦截，但可叠加 = 装饰）。这时候的答法是**回到动机**：问「我加这一层，是因为我要给它多一项能力，还是因为我要管住谁能用它？」——加能力是装饰器，管访问是代理。同时补一句「同一个代码在不同团队可能被归到不同模式，面试时更重要的是说出判据，而不是抢一个标签」——这句话会让你显得比「背标准答案」的人成熟一个层次。

---

## 十、前端工程落地：那些你以为只是 API 的东西

### React HOC：装饰器在前端最广为人知的化身

HOC（Higher-Order Component，高阶组件）的定义是「接收组件、返回新组件的函数」。把它和第五节的 `withLogging` 放在一起看，你会发现**它的结构一字不差**：

```typescript
// 函数装饰器：接收函数，返回等价的新函数
function withLogging<T extends (...args: any[]) => any>(fn: T): T;

// 组件装饰器：接收组件，返回等价的新组件
function withAuth<P extends object>(Component: React.ComponentType<P>);
```

具体实现：

```typescript
import React from 'react';

// 👈 装饰器角色：持有一个 Component，并转发渲染
function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function WithAuth(props: P) {
    if (!isLoggedIn()) {
      return <LoginPage />;              // 👈 不渲染原组件（这一点的争议见第九章）
    }
    return <Component {...props} />;     // 👈 转发：原组件完全不知道自己被包了
  };
}

// 👈 第二个装饰器：加载态
function withLoading<P extends object>(Component: React.ComponentType<P>) {
  return function WithLoading(props: P & { loading?: boolean }) {
    const { loading, ...rest } = props;
    if (loading) return <Skeleton />;
    return <Component {...(rest as P)} />;
  };
}

// 👈 组装：两层叠加，原组件 OrderList 一行未改
const SecureOrderList = withAuth(withLoading(OrderList));
```

**三个角色对应得严丝合缝：**

| GoF 角色 | React HOC 里的对应 |
| --- | --- |
| Component（接口） | `React.ComponentType<P>`（组件的契约：接收 props、返回元素） |
| ConcreteComponent | `OrderList` 本体 |
| Decorator（持有引用 + 转发） | `withAuth` 返回的 `WithAuth` |
| ConcreteDecorator（具体增强） | 「未登录渲染登录页」「加载中渲染骨架屏」 |

### HOC 的四个真实坑（这些是笔记里没有、但面试会问的）

**坑一：wrapper hell（包装地狱）。**

```typescript
// ❌ 层数一多，组件树在 DevTools 里变成一长串 With...
export default withRouter(withAuth(withLoading(withTracker(withErrorBoundary(OrderList)))));
```

调试时你必须数清自己在第几层，React DevTools 里满屏都是 `WithXxx`。**这也是 React 社区后来转向 Hooks 的直接原因之一**——第 01 篇讲「组合优于继承」时提到的 wrapper hell，就是这里。

**坑二：props 命名冲突。**

`withLoading` 需要 `loading` 这个 prop，如果 `OrderList` 自己也有一个叫 `loading` 的 prop，两层就会打架。常见解法是加前缀（`__loading`）或改用 render props。

**坑三：`ref` 不会自动透传。**

```typescript
// ❌ ref 拿不到 OrderList 的实例，因为 ref 是特殊 prop，HOC 不转发它
const Secure = withAuth(OrderList);
<Secure ref={myRef} />
```

因为函数组件没有实例、`ref` 也不在 `props` 里，HOC 必须显式用 `forwardRef` 转发：

```typescript
function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return React.forwardRef<unknown, P>((props, ref) => {
    if (!isLoggedIn()) return <LoginPage />;
    return <Component {...props} ref={ref as never} />;
  });
}
```

**坑四：静态方法会丢。**

`OrderList.staticMethod` 在 `withAuth(OrderList)` 之后不存在了，因为返回的是一个新函数，原型链上没有挂任何东西。常用解法是 `hoist-non-react-statics` 这个库，把静态方法复制到包装组件上。

**这四个坑的共同根因，正是装饰器模式的固有代价：** 多包一层，就多一层「不透明」——`ref`、静态属性、`displayName`、`instanceof` 判断都会失真。**知道这个代价，比会写 HOC 更重要。**

### NestJS：同名不同义的经典陷阱

```typescript
@Injectable()                             // ① 类装饰器：标记「可被 DI 容器管理」
export class ConsultService {
  findOne(id: string) { /* ... */ }
}

@Controller('consult')                    // ② 类装饰器：标记路由前缀
export class ConsultController {
  constructor(private readonly service: ConsultService) {}   // ③ 靠类型元数据注入

  @Get('order/:id')                       // ④ 方法装饰器：标记路由
  findOne(@Param('id') id: string) {      // ⑤ 参数装饰器：取路径参数
    return this.service.findOne(id);
  }
}
```

**这五个 `@`，用的都是 TypeScript 装饰器语法，但它们实现的是 GoF 装饰器模式吗？**

**不是。** 它们做的是完全不同的事：

| 对比项 | GoF 装饰器模式 | NestJS 的 `@Controller` |
| --- | --- | --- |
| 装饰后返回什么 | **一个新的包装对象**（同接口） | **原类不变**，只在元数据里打标记 |
| 有没有「转发」 | 有（一层层往里调） | 没有 |
| 执行时机 | 每次调用时 | 应用启动时扫描一次 |
| 谁来读这个标记 | 调用方（透明的） | DI 容器 / 路由注册器 |
| 目的 | 给对象叠加职责 | 给类附加元信息，让框架接管 |

**`@Controller` 干的事，本质是往类的元数据里写一条 `{ path: 'consult' }`；框架启动时扫一遍所有类，读到这条元数据就把这个类注册成一个路由处理器。** 全程没有任何「包装」和「转发」——类还是那个类，一个字节都没变。

**所以面试时的正确表述是**：

> 「NestJS 用的是 **TypeScript 装饰器语法**，属于**语言层面的元编程能力**；GoF 的装饰器模式属于**结构层面的组合手法**。两者在 JS/TS 里都叫 Decorator，但一个是『给代码打标记』，一个是『给对象加职责』——**同名不同义**，这是最容易被搞混的一处。」

**能主动划清这条边界，说明你不是把「叫 Decorator 的都当装饰器模式」——这正是本章标题想说的：那些你以为只是 API 的东西，背后可能是完全不同的设计意图。**

### TS 5.x / Stage 3 新版装饰器长什么样

前面说过两条规范路线，这里给出对照。同一个「打印调用日志」的装饰器，新版写法是：

```typescript
// 👈 新版 Stage 3：拿到 value 和 context，返回新的 value
function logged<T extends (...args: any[]) => any>(
  value: T,
  context: ClassMethodDecoratorContext,
): T {
  const name = String(context.name);
  return function (this: unknown, ...args: any[]) {
    console.log(`调用 ${name}`, args);
    return value.apply(this, args);
  } as T;
}

class ReportService {
  @logged
  submit() { /* ... */ }
}
```

**三处关键变化：**

- **没有 `descriptor` 了**：直接拿 `value`（方法本体），返回新函数即可
- **`context` 代替了 `target` / `name`**：`context.name`、`context.static`、`context.private` 都在这里
- **不再依赖 `reflect-metadata`**：`context.metadata` 是标准 API

**老项目迁移的实用判断法**：看 `tsconfig.json` 里有没有 `"experimentalDecorators": true`。有 → 老版，装饰器签名是 `(target, name, descriptor)`；没有 → 新版，签名是 `(value, context)`。**面试被问「TS 装饰器怎么写」时，先反问一句「是 legacy 还是 Stage 3」，会立刻拉开差距。**

### 现代前端的替代方案：HOC 之后，还剩下什么

React 16.8 之后，社区逐渐用 Hooks 替代 HOC 做逻辑复用。但要说清楚：**Hooks 替代不了全部场景**。

| 方案 | 替代 HOC 的什么 | 替代不了什么 |
| --- | --- | --- |
| **自定义 Hook** | 状态逻辑复用（数据请求、表单、埋点） | 渲染劫持（决定是否渲染、渲染成别的） |
| **render props** | 渲染逻辑复用 | 组合层次依然很深，可读性差 |
| **组合式组件** | 布局结构复用 | 不涉及行为增强 |
| **HOC** | 跨组件的**能力包裹**、权限、埋点、错误边界 | 逻辑共享不如 Hook 自然 |

**一句话收口**：

> **HOC 是装饰器模式；自定义 Hook 不是装饰器，它是「职责内聚」。**

因为 Hook 不包装任何对象，也不转发调用——它只是把一段逻辑抽出来，供组件主动调用。**没有「同接口 + 持有引用 + 转发」这三件套，就不是装饰器。**

**但 HOC 至今仍不可替代的场景**：需要**决定render什么**（`withAuth` 不渲染原组件）、需要包住**任意组件而不关心其 props 细节**（`withErrorBoundary`）、需要**在渲染层面拦截**（`withTracker` 记录曝光）。这些是 Hook 做不到的——Hook 只能在组件内部运行，无法替组件做「渲不渲染」的决定。

> 💬 **面试官**：React 的 HOC 属于什么设计模式？现在都用 Hook 了，HOC 还有存在价值吗？
>
> ✅ 标准答案：HOC 是装饰器模式——它接收组件、返回一个同类型的新组件，在不修改原组件的前提下叠加行为，符合「同接口 + 持有引用 + 转发」三要素。Hooks 替代了 HOC 的大部分**逻辑复用**场景，因为 Hook 更扁平、没有 wrapper hell、没有 props 命名冲突和 ref/静态方法丢失的问题。但 HOC 在**渲染劫持**场景仍不可替代：`withAuth` 需要在未登录时不渲染原组件，`withErrorBoundary` 需要包住整个子树捕获错误——这些是 Hook 无法做到的，因为 Hook 运行在组件内部，决定不了组件要不要渲染。
>
> 🎁 加分答案：能补一句「HOC 的坑和装饰器的固有代价是同一件事」——wrapper hell、ref 丢失、静态方法丢失、props 冲突，全都源于「多包了一层」。**这不是 React 的实现缺陷，而是装饰器模式的固有成本**：只要用包装来增强，就必然带来不透明性。所以选型时不是「HOC 好还是 Hook 好」，而是「这次我要的是逻辑复用（用 Hook），还是渲染控制（用 HOC/组合式组件）」。能把框架特性归因到设计模式的固有性质，是这道题的满分答法。

---

## 十一、面试高频问：三道核心题与三条追问链

前面散落的面试视角，这里收口。三道核心题，每道给「及格答法」和「加分答法」。

### 核心题一：装饰器模式和代理模式的区别是什么？

**及格答法**：装饰器是动态给对象添加职责，代理是控制对对象的访问。结构相似，意图不同。

**加分答法**：加上四条判据 + 一句收口——

- **是否允许不转发**：装饰器每次都调用原对象，代理可以绕过（缓存命中、懒加载、无权限）
- **调用方是否知道原对象**：装饰器透明，代理要隐藏
- **目的是否为叠加**：装饰器的设计目标就是层叠，代理通常一层
- **接口是否一致**：两者都是「不变」（这一点上和适配器区分）

收口一句：**「装饰器保证原对象一定被调用，代理允许原对象被绕过。」**

### 核心题二：React HOC 属于什么设计模式？还有哪些方案能替代 HOC？

**及格答法**：HOC 属于装饰器模式。替代方案有自定义 Hook、render props、组合式组件。

**加分答法**：分三层说——

- **归类**：HOC = 装饰器（同接口 `ComponentType<P>`、持有引用、转发渲染）
- **替代方案的分工**：Hook 替代「逻辑复用」，render props / 组合式组件替代「渲染复用」
- **HOC 不可替代的部分**：渲染劫持（决定渲不渲染）、错误边界包裹、任意组件的通用能力叠加

再加一刀：**「HOC 的四个坑（wrapper hell / props 冲突 / ref 丢失 / 静态方法丢失）不是 React 的问题，是装饰器模式的固有代价。」**

### 核心题三：装饰器模式如何避免继承的类爆炸问题？

**及格答法**：把「基础对象」和「增强能力」拆成两组独立的类，用组合代替继承。继承是 N × M，装饰器是 N + M。

**加分答法**：给具体数字 + 给适用边界——

- **数字**：4 形状 × 5 颜色，继承 20 个类，装饰器 9 个；再加 3 种描边，继承 60 个，装饰器 12 个
- **边界**：组合固定且唯一时，继承更简单（用装饰器是过度设计）；需要加字段/加状态时，继承更合适（装饰器只能加行为）
- **代价**：层数多了会出现包装地狱，调试时调用栈变深、`fn.name` 与 `instanceof` 失真

### 追问链一：`compose(a, b, c)(fn)` 里谁先执行？

**标准答法**：`reduceRight` 从右往左折叠，最终结构是 `a(b(c(fn)))`。所以 `a` 在最外层，它的前置逻辑最先执行、后置逻辑最后执行；`c` 贴着原函数。

**加分答法**：能画出完整的进出顺序——`a-before → b-before → c-before → fn → c-after → b-after → a-after`。再补一句对比：**同一个 `compose`，放在 Redux 中间件里呈现的是洋葱模型（职责链），放在普通高阶函数里是装饰器链**——差别在于每一层是否无条件调用下一层。

### 追问链二：HOC 的 `ref` 和静态方法丢了怎么办？

**标准答法**：`ref` 用 `React.forwardRef` 转发；静态方法用 `hoist-non-react-statics` 复制。

**加分答法**：说清根因 + 补一句当代方案的取舍——

- **根因**：HOC 返回的是**新的函数组件**，不是原组件。`ref` 是 React 的特殊机制，不走 props，所以不会自动透传；静态属性挂在原函数对象上，新函数上自然没有
- **当代取舍**：如果组件本来就不需要 `ref` 和静态方法（大多数函数组件如此），就别为了「完整性」硬加 `forwardRef`——那只是给一个不存在的问题写代码，违反 YAGNI

### 追问链三：装饰器、AOP、中间件三者是什么关系？

**标准答法**：

- **AOP 是编程范式**（目标：集中管理横切关注点），**装饰器是实现 AOP 最常用的手段**
- **中间件是职责链的变体**（每个节点可处理、可选择是否继续传递），和装饰器结构相似但语义不同——**中间件可以中断，装饰器必须转发**

**加分答法**：能给出「怎么判断该用哪个」的实操结论——

- 需求是「给每个请求都加日志 / 埋点 / 脱敏」→ 装饰器（每层都执行）
- 需求是「按顺序判断，任一不通过就退回」→ 中间件 / 职责链（可中断）
- 需求是「不改业务代码，统一挂载」→ AOP（用装饰器或代理实现）

**这三条判据的共同底层，其实就是第九章那张辨析表——「是否允许不转发」是同一把尺子。**

---

## 💡 一张图总结（面试速记表）

| 要点 | 一句话内核 | 考察频率 |
| --- | --- | --- |
| 四个角色 | Component / ConcreteComponent / Decorator（同接口+持有引用）/ ConcreteDecorator | ⭐⭐⭐ 必考 |
| 核心意图 | 动态给对象加职责，比继承更灵活 | ⭐⭐⭐ 必考 |
| N + M vs N × M | 继承是乘法，装饰器是加法；4×5 = 20 vs 4+5 = 9 | ⭐⭐⭐ 必考 |
| 同接口的必要性 | 客户端透明 + 可递归叠加 + 符合 LSP | ⭐⭐⭐ 必考 |
| 认出装饰器 | 一个类「是一种」Component，又「里面装着一个」Component | ⭐⭐⭐ 必考 |
| 装饰器 vs 代理 | 是否允许不转发；代理挡访问，装饰器加职责 | ⭐⭐⭐ 必考 |
| 装饰器 vs 继承 | 运行时组合 vs 编译期扩展；has-a vs is-a | ⭐⭐ 高频 |
| 装饰器 vs 适配器 | 接口形状变没变（承接第 06 篇） | ⭐⭐ 高频 |
| 装饰器 vs 职责链 | 每层都执行 vs 可以中断（为第 12 篇埋点） | ⭐⭐ 高频 |
| 属性装饰器不能改值 | 类定义期执行，实例还不存在，只能收集元数据 | ⭐⭐⭐ 必考 |
| `@log` vs `@log()` | 装饰器工厂才能传参；看第一个参数是不是 `target` | ⭐⭐ 高频 |
| `target` 是谁 | 实例成员 → `prototype`；静态成员 → 构造函数 | ⭐⭐⭐ 必考 |
| 两条规范路线 | legacy `(target,name,descriptor)` vs Stage 3 `(value,context)` | ⭐⭐ 高频 |
| HOC 与 Hook | HOC 是装饰器；Hook 是职责内聚，做不了渲染劫持 | ⭐⭐⭐ 必考 |
| `withAuth` 归属 | 行为像保护代理，动机是可叠加能力 → 归装饰器（并说明推理） | ⭐⭐ 高频 |
| `compose` 顺序 | 进入从左到右，返回从右到左（`reduceRight`） | ⭐⭐ 高频 |
| NestJS 的 `@` | 只是 TS 装饰器语法（附加元信息），不是 GoF 装饰器模式 | ⭐⭐ 高频 |

> 💡 记住这条主线：**装饰器的身份不在「包了一层」，而在「包完之后调用方还认得出原来那个东西」。** 同接口让它透明，可叠加让它灵活，OCP 让它在「增强需求源源不断」时比继承更划算。以后遇到任何「在原对象外面套一层」的代码，先问三句：**接口变了吗？每次都转发吗？目的是叠加还是拦截？**——三个答案出来，模式就出来了。

---

## 📝 留个问题

现在请你打开项目里任意一个「加了增强」的函数或组件——不管是 `withAuth`、`withLoading`、一个埋点装饰器，还是一段 `try / catch` 里顺手加的日志。

问自己一个问题：**它还是装饰器吗，还是已经偷偷变成了代理？**

常见的三种「变质」信号：

- 它开始**决定要不要调用原对象**（比如「没权限就 return」）
- 它开始**缓存结果**，第二次直接返回不算了
- 它开始**改变返回值的形状**（多包一层 `{ data, code }`）

前两条说明它滑向了代理，第三条说明它滑向了适配器。**模式不是出生时就定死的，是在你每一次改它的时候被重新定义的。** 把你的发现写在评论区，我们一起看看有多少人的「装饰器」其实早就不纯了 👇

---

## 参考资料

https://es6.ruanyifeng.com/#docs/decorator （阮一峰 ES6 教程装饰器章节，ES 提案演进脉络讲得最清楚的中文资料）

https://www.babeljs.cn/docs/babel-plugin-proposal-decorators （Babel 装饰器插件文档，`legacy` 与 2023-11 两种模式的区别）

https://juejin.cn/post/6844903838172839943 （JavaScript 中 AOP 的应用，手工 AOP 与装饰器的对照）

https://www.npmjs.com/package/core-decorators （core-decorators，`@readonly` / `@deprecate` / `@memoize` 等现成装饰器）

https://refactoring.guru/design-patterns/decorator （refactoring.guru 装饰器页，本文结构图与通知渠道示例的出处）

https://developer.mozilla.org/zh-CN/docs/Web/JavaScript （MDN，`Object.defineProperty`、属性描述符、`Proxy` 等语言机制参考）

https://github.com/tc39/proposal-decorators （TC39 装饰器提案，Stage 3 规范的权威出处）

《设计模式：可复用面向对象软件的基础》 Erich Gamma 等四人组著，1994（GoF 23 种模式的权威出处，装饰器意图的原始表述）

《JavaScript 设计模式与开发实践》 曾探 著（前端场景化讲解，中文资料首选）

> 推荐搜索关键词：「装饰器模式 代理模式 区别」「装饰器模式 继承 类爆炸」「TypeScript 装饰器 四种 参数 target」「experimentalDecorators Stage 3 区别」「React HOC 装饰器模式 缺点」「compose reduceRight 执行顺序」「AOP 面向切面编程 前端 埋点」「属性装饰器 为什么不能修改属性值」。

---

> 🔖 这是「前端设计模式」系列第 07 篇。上一篇：《适配器与外观模式：包一层，改接口还是简调用（面试收藏级）》；下一篇预告：《代理模式：从 ES6 Proxy 到缓存、懒加载与权限拦截（面试收藏级）》
