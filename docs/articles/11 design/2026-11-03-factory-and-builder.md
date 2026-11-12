# 工厂与建造者模式：创建哪种对象 vs 怎么组装对象（面试收藏级）

> **副标题**：工厂负责「创建哪种对象」，建造者负责「按什么步骤组装复杂对象」

> 面试官问：「工厂模式和建造者模式有什么区别？」
>
> 你脱口而出：「都是创建对象的，一个用工厂类创建，一个用建造者创建。」
>
> 他追问：「那什么时候用工厂，什么时候用建造者？」
>
> 你犹豫了一下，挤出那句背过的口诀：「参数超过 5 个就用建造者。」
>
> 他点点头，又问：「为什么参数多就要用建造者？工厂不也能处理 5 个参数吗？」
>
> 你答不上来了。这两个模式，你「认识」，但没「分清」——它们管的是创建这件事里的**两个不同问题**。

---

## 🎯 这篇文章解决什么问题

创建型模式一共 5 个，但最容易在面试里被搅在一起的，就是工厂和建造者这一对——因为它们在表面上都「创建对象」，甚至很多代码里长得都像。

问题在于，大多数人只记住了三个名字，没记住它们各自的**分工**：

- **简单工厂、工厂方法、抽象工厂**——三个名字常被当成一回事，其实是一条递进线：从「一个 switch」到「变化点进子类」再到「整个产品族」
- **建造者**——被误解成「链式 setter」，没人讲清它和「工厂一次性返回对象」到底差在哪
- **选型的判据**——面试问「工厂和建造者怎么选」，大多数人只会背「参数超过 5 个」，却说不清这半句口诀背后的真正原因

这一篇的主线只有一句话：

> **工厂解决「创建哪种对象」的变化，建造者解决「怎么组装对象」的变化。**

前半句大家都会背，后半句的「为什么」才是全文要讲透的东西。读完你会拿到三样：

- **一条工厂演进线**：简单工厂为什么违反 OCP、工厂方法怎么补上、抽象工厂又往前走了哪一步
- **一个建造者的完整结构**：传统 Director 写法 + TypeScript 链式写法，以及「链式 setter 到底算不算建造者」这个高频追问
- **四组辨析**：把「简单工厂 vs 工厂方法」「工厂方法 vs 抽象工厂」「建造者 vs 工厂」「抽象工厂 vs 建造者」一次讲清，全是对应面试原题

---

## 一、场景切入：两个绕不开的创建痛点

先不急着背定义。看两个你项目里几乎一定遇到过、但又没往设计模式上想的场景——它们正好一个指向「创建哪种」，一个指向「怎么组装」。

### 痛点一：对接多家物流商，这一次该创建哪一家

医疗系统要对接多家物流商——顺丰、京东、极兔。每家提供的 SDK 不一样，下单方法名、参数顺序、字段名各不相同：

```typescript
// 假设三家物流商的下单 SDK 长这样（接口各不相同）
sfSdk.createOrder({ sender, receiver });          // 顺丰：createOrder
jdSdk.placeOrder(receiver, sender);               // 京东：placeOrder，参数顺序都反了
jtSdk.submitBill({ to: receiver, from: sender }); // 极兔：submitBill，字段名也不一样
```

先说清楚一件事：**「接口长得不一样」本身，是适配器模式的活儿**——把三家 SDK 抹平成同一个 `LogisticsProvider.ship(order)`，这一层本篇不展开，第 06 篇讲适配器时会完整拆解。

本篇关心的是适配器**之后**那个绕不开的问题：**「这一次该创建哪一家的 provider？」**

```typescript
// 假设三家适配器都已写好，都实现了同一个契约
interface LogisticsProvider {
  ship(order: Order): Promise<ShipResult>;
}

// 那么「选哪家」就只剩这一道选择题：
const provider: LogisticsProvider =
  courier === 'sf' ? new SfProvider() :
  courier === 'jd' ? new JdProvider() :
                    new JtProvider();

await provider.ship(order);
```

这段三元表达式看起来无害，但它会出现在**每一个需要发货的地方**——订单页、批量发货、售后补发。每对接一家新物流商，所有这些地方都要改一遍；顺带还把 `SfProvider`、`JdProvider` 这些具体类名散播进了业务代码。

**上层真正想要的是什么？** 只是一句话：「给我一个能发货的 provider，我调 `ship(order)` 就行，别让我知道你是哪家的。」

把「new 哪一个」集中到一个入口——这就是**工厂**要解决的问题：**创建哪种对象**（哪一家的 provider）由工厂决定，调用方只面向 `LogisticsProvider` 契约。至于这个入口写成 `switch`（简单工厂）还是下沉成子类（工厂方法），第三章会给出演进路径。

### 痛点二：药品报告配置对象，字段多到 new 不动

药品详情页要生成一份报告配置 `ReportConfig`，几十个字段：标题、药品 id、是否显示警示、是否打印副作用、页边距、字体大小、水印……其中大部分是**可选**的。

如果这个类用的是「位置参数构造函数」（很多老项目里就是这样），`new` 出来会长这样：

```typescript
class ReportConfig {
  constructor(
    public title: string,
    public drugId: string,
    public showWarning: boolean,
    public date: string,
    public showSideEffect?: boolean,
    public printMargin?: number,
    public fontSize?: number,
    // ……还有十几个
  ) {}
}

const config = new ReportConfig(
  '药品说明书',      // title
  'D001',           // drugId
  true,             // showWarning
  '2026-11-03',     // date
  undefined,        // showSideEffect —— 可选，传 undefined 占位
  undefined,        // printMargin —— 可选，传 undefined 占位
  undefined,        // fontSize —— 可选，传 undefined 占位
);
```

你看到那一串 `undefined` 了吗？**这就是「位置参数」的灾难**：可选参数必须排在必填参数后面，所以想设 `fontSize`、不设 `showSideEffect` 时，就得先用 `undefined` 把前面的位置占住。读这段代码的人完全不知道每个 `true`、每个 `undefined` 在说什么。

更隐蔽的一层：**参数顺序一旦定下就再也动不了**。后来想把 `date` 挪到 `drugId` 后面，所有调用点都会静默传错位——TS 也不会报错，因为 `string` 和 `string` 是可互换的。位置参数的真正代价不是「不好读」，而是**「改动成本高且失败是静默的」**。

换成链式构建，可读性天差地别：

```typescript
const config = new ReportConfigBuilder()
  .setTitle('药品说明书')
  .setDrugId('D001')
  .setShowWarning(true)
  .setDate('2026-11-03')
  .build();   // 必填字段 title / drugId 漏了会在这里抛错
```

这就是**建造者模式**：把「组装一个复杂对象」的过程拆成一步步，构建与表示分离——解决的是**怎么创建复杂对象**的问题。

### 两个痛点，两个问题

现在把这两个场景并排放，分界线就出来了：

|            | 痛点一：物流商              | 痛点二：报告配置              |
| ---------- | --------------------------- | ----------------------------- |
| 纠结的问题 | 该 `new` 哪一家的 provider | 这几十个字段怎么一步步填      |
| 变化点     | 「有哪几种」在变            | 「有哪些步骤 / 哪些字段」在变 |
| 对应模式   | 工厂（工厂方法）            | 建造者                        |
| 一句话     | 创建**哪种**对象            | **怎么**组装对象              |

**这就是全文的分界线，先把它记住，后面每一章都在反复回到这一句。**

---

## 二、意图与本质：一句话分界

把上一章的结论提炼成两个定义，这两个定义是整个创建型模式的地基。

### 工厂模式：把「实例化哪个类」抽离出来

> **工厂模式**（简单工厂 / 工厂方法 / 抽象工厂）：把「实例化哪个类」的变化点从调用方抽离，调用方只面向抽象接口编程。

它解决的是「**创建哪种对象**」的变化——当系统的产品种类会增多、会替换时，调用方不应该 `new` 死某一个具体类，而应该从工厂那里「要」一个抽象产品。

### 建造者模式：把「构建过程」拆成步骤

> **建造者模式**：将一个复杂对象分解成多个简单对象来构建，把复杂的构建层与表示层分离，使相同的构建过程可以创建不同的表示。

它解决的是「**怎么创建复杂对象**」的变化——当对象本身很复杂（字段多、步骤多、有可选部分）时，把构建过程拆成一个个步骤，让「用什么步骤组装」和「最终组装出什么」分离。

### 一句话的分界，落在「哪个字」上

这两个定义里，最关键的区别藏在两个词里：

- **工厂**：解决「创建**哪种**对象」——变化的，是「对象类型」
- **建造者**：解决「**怎么**创建对象」——变化的，是「构建过程 / 步骤」

**工厂关心的是「做谁」，建造者关心的是「怎么做」。** 一个是选择问题，一个是流程问题。

> 💬 **面试官**：工厂模式和建造者模式都是创建型模式，它们在本质上是回答哪两个不同的问题？
>
> ✅ 标准答案：工厂模式回答的是「**创建哪种对象**」——把「实例化哪个类」的选择从调用方抽离，调用方面向抽象接口，不关心具体是哪个实现。建造者模式回答的是「**怎么组装对象**」——把一个复杂对象的构建过程拆成多个步骤，构建过程与最终表示分离。前者变化的维度是「对象类型」，后者变化的维度是「构建步骤」。所以工厂和建造者不是竞争关系，它们解决的是创建这件事里的两个不同侧面，甚至可以组合使用。
>
> 🎁 加分答案：能补一句「从变化点看」——判断一个创建场景该归谁，就看它的**变化点在哪**：如果变化点是「产品的种类会增多/替换」（比如支付方式从 3 种变 5 种），那是工厂；如果变化点是「对象的字段/步骤会增多、有可选部分」（比如报表配置字段从 20 个变 30 个），那是建造者。能说出「变化点的类型决定模式的选择」而不是背口诀，是这道题的加分点。

---

## 三、工厂家族：从简单工厂到抽象工厂的三层递进

这一章是全文最重的一章。**不要把简单工厂、工厂方法、抽象工厂当成三个并列的名字背**——它们是一条演进线，每一层都在回答「上一层的缺陷是什么」。

这条线的方向，就是你在任何工厂代码里定位「它在哪一层」的标尺：

1. **简单工厂**：一个 `switch` 决定 `new` 谁——代码最省，但违反 OCP
2. **工厂方法**：把「new 谁」下沉到子类，父类只定接口——遵守 OCP，代价是类变多
3. **抽象工厂**：一次生产一整个「产品族」，而非单一产品——管的是「成套一致性」，而不是单个变化点

### 简单工厂：一个 switch 决定一切

最简单、也最常见的一种。由一个工厂对象，通过 `switch` / `if` 判断，决定创建哪种产品类的实例。

**类图**：

![简单工厂模式类图：由一个工厂对象通过判断决定创建哪种咖啡产品类的实例](https://cdn.nlark.com/yuque/0/2021/png/738210/1638511983415-9e2e4278-44bf-47cb-99e2-c3012c9813c0.png)

**代码**：

```typescript
type CoffeeType = 'Americano' | 'Latte' | 'Cappuccino';

class Coffee {
  constructor(public name: string) {}
  describe(): string {
    return `一杯${this.name}`;
  }
}

class AmericanoCoffee extends Coffee {}
class LatteCoffee extends Coffee {}
class CappuccinoCoffee extends Coffee {}

class CoffeeFactory {
  // 👈 入参是「类型」而不是「名字」，并且用联合类型收窄
  static order(type: CoffeeType): Coffee {
    switch (type) {
      case 'Americano':
        return new AmericanoCoffee('美式');
      case 'Latte':
        return new LatteCoffee('拿铁');
      case 'Cappuccino':
        return new CappuccinoCoffee('卡布奇诺');
      default:
        // 👈 收窄后这里其实是 never，保留是为了兜住来自 URL / 接口的运行时数据
        throw new Error(`不支持的咖啡类型：${String(type)}`);
    }
  }
}

CoffeeFactory.order('Americano').describe();   // 一杯美式
CoffeeFactory.order('Latte').describe();       // 一杯拿铁
CoffeeFactory.order('water');                  // 👈 编译期就报错，根本写不出来
```

这里有两个不同层次的失败要分开看，很多人会混成一句「简单工厂不安全」：

- **编译期**：入参一旦收窄成联合类型，`order('water')` 直接编译失败。这是**零成本**的改进——不改变模式结构，也不增加任何一层间接。
- **运行期**：`default` 分支仍然必须保留。因为真实数据来自 URL 参数、接口返回、用户输入，它们绕过了类型系统，运行时照样可能传进一个 `'water'`。**类型收窄管的是「你自己的代码」，管不了「外部数据」**——这两件事必须分开处理，别以为加了联合类型就可以删掉 `default`。

**这个模式的缺点，恰恰是它名字里「简单」二字的代价**：

- 如果产品的种类非常多，`switch case` 的判断会变得非常多——一个工厂函数最后可能长出几十个 case
- **不符合开闭原则（OCP）**：要增加或删除一个产品种类，就要去修改 `switch case` 的判断代码

第二点是致命的。回忆第 02 篇 SOLID 里讲的 OCP——「对扩展开放，对修改关闭」。简单工厂每加一种咖啡，都要回头改 `CoffeeFactory.order`，这就是「对修改不关闭」的典型。

不过要注意 OCP 这条批评的**适用边界**：它成立的前提是「产品种类会从外部增长」。如果像 React 的 reconciler 那样，种类是框架内部定死的封闭集合，这个 switch 永远不会被外部改动，OCP 的缺陷也就永远不会暴露（本章后面会展开这个反例）。

**前端应用场景**，简单工厂其实到处都是：

jQuery 的 `$()` 就是一个简单工厂——它根据传入的 selector 类型，决定返回什么样的对象：

```typescript
// 简化版 jQuery：$() 是入口，按 selector 类型决定怎么造对象
class Jquery {
  public length: number;
  [index: number]: Element;

  constructor(selector: string) {
    // 真实 jQuery 在这里分支：字符串走 querySelectorAll、
    // DOM 节点直接包装、函数走 ready……这里只演示字符串分支
    const elements = Array.from(document.querySelectorAll(selector));
    elements.forEach((el, i) => {
      this[i] = el;
    });
    this.length = elements.length;
  }

  // 👈 用重载区分 getter / setter，两种调用各自的返回类型都准确
  html(): string;
  html(text: string): this;
  html(text?: string): string | this {
    if (text === undefined) {
      return this[0]?.innerHTML ?? '';
    }
    if (this[0]) this[0].innerHTML = text;
    return this;                       // 👈 返回 this 才支持链式调用
  }
}

declare global {
  // 👈 只扩充 Window，不污染全局作用域；文件需要是模块（末尾 export {}）
  interface Window {
    $: (selector: string) => Jquery;
  }
}
window.$ = (selector: string) => new Jquery(selector);

window.$('.card').html('你好');                // 写入，返回 Jquery，可继续链式调用
const content: string = window.$('.card').html();   // 读取，返回 string

export {};   // 👈 让本文件成为模块，declare global 才合法
```

这里有个容易写错的点：`html()` **同一个方法既当 setter 又当 getter**。如果只写一个 `html(text?: string): string | Jquery` 签名，getter 的调用方要被迫从联合类型里再判断一次——很别扭。用**方法重载**声明两次签名，调用方零成本：无参时返回 `string`，传参时返回 `this`。很多「简化 jQuery」示例干脆把返回类型写成 `any` 蒙混过去，正是没处理这个重载。

另外两个 TypeScript 细节也在上面这段里：

- **`declare global` 必须出现在模块里**。文件末尾不加 `export {}`，它就是脚本（script），此时 `declare global` 会报 `TS2669`——这是抄这类示例时最常见的编译错误。
- **用 `window.$` 调用，而不是裸 `$`**。`declare global` 扩充的是 `Window` 接口，不是全局变量声明，所以裸 `$` 仍然找不到；写成 `window.$` 才与类型声明对得上。

再看 React 的 `createElement`——它是不是简单工厂，取决于你看哪一层：

- **`createElement` 本身不是工厂**：它只是组装一个 `{ type, props, key, ref }` 的结构体（ReactElement），不检查 `type` 是什么，也不创建组件实例。
- **真正按 type 分发的是 reconciler 里的 `createFiberFromTypeAndProps`**：它内部就是一个大 `switch`，JSX 里那个 `<div>` 到底变不变成真实 DOM 节点，是在这里被决定的。

```typescript
// 摘自 React 18 packages/react-reconciler/src/ReactFiber.new.js（删去开发期校验与分支细节）
export function createFiberFromTypeAndProps(type, key, pendingProps, owner, mode, lanes) {
  let fiberTag = IndeterminateComponent;
  if (typeof type === 'function') {
    // 函数组件 / 类组件
    if (shouldConstruct(type)) fiberTag = ClassComponent;
  } else if (typeof type === 'string') {
    // 'div'、'span' 这类宿主标签
    fiberTag = HostComponent;
  } else {
    getTag: switch (type) {
      case REACT_FRAGMENT_TYPE:      return createFiberFromFragment(...);
      case REACT_SUSPENSE_TYPE:      return createFiberFromSuspense(...);
      case REACT_OFFSCREEN_TYPE:     return createFiberFromOffscreen(...);
      // ……还有 Profiler / StrictMode / Cache 等
      default: {
        if (typeof type === 'object' && type !== null) {
          switch (type.$$typeof) {
            case REACT_FORWARD_REF_TYPE: fiberTag = ForwardRef; break getTag;
            case REACT_MEMO_TYPE:        fiberTag = MemoComponent; break getTag;
            case REACT_LAZY_TYPE:        fiberTag = LazyComponent; break getTag;
            // ……
          }
        }
        // 兜底：未知 type，给出「是不是忘了 export」之类的报错提示
      }
    }
  }
  // ……最后 new FiberNode(fiberTag, pendingProps, key, mode)
}
```

这才是那个 `switch`。**React 用 switch 造对象，不是因为它没想清楚，而是因为它就是那个「产品种类少且稳定」的场景**——组件类型（函数、class、字符串标签、Fragment、Suspense……）是框架内部定死的封闭集合，不会再从外部加一种，所以这个 switch 的 OCP 缺陷永远不会暴露。

这段话正好把下一节要讲的面试题提前回答了：**简单工厂的缺点只有在「产品种类会从外部增长」时才成立。**

Vue 3 的 `h()` 同理，它用 `shapeFlag` 位运算代替 switch（`isString(type) ? ELEMENT : isSuspense(type) ? SUSPENSE : ...`），但本质是同一个封闭枚举上的分发。

> 💬 **面试官**：简单工厂违反了哪条设计原则？它算不算 GoF 23 种设计模式？
>
> ✅ 标准答案：简单工厂违反的是**开闭原则（OCP）**。它的核心是一个 `switch`/`if` 判断，每当新增一种产品，就要回到工厂函数里加一个 `case`——对扩展开放了，但对修改没有关闭。另外，简单工厂**不属于 GoF 23 种模式**，GoF 的创建型是 5 个：单例、工厂方法、抽象工厂、建造者、原型。「简单工厂」通常被当作工厂方法的引子来讲解。
>
> 🎁 加分答案：能补一句「简单工厂的价值在场景，不在结构」——它虽然违反 OCP，但在「产品种类少且稳定」的场景下是性价比最高的写法（一个函数搞定，零类爆炸）。真正的问题只在「产品种类会频繁增减」时才暴露。所以不是「简单工厂就该被淘汰」，而是「变化点多的时候别用它」——这个「看变化点」的判断，和后面工厂方法形成对照。

### 工厂方法：把变化点封装进子类

简单工厂的病根在于「创建逻辑集中在一个 switch 里，加产品就要改它」。工厂方法的解法很直接：**把「new 谁」这件事下沉到子类，父类只管定义接口。**

工厂方法模式（Factory Method），又称**多态性工厂模式**。核心的工厂类不负责所有产品的创建，而是把具体创建工作交给**工厂子类**去做。

**类图**：

![工厂方法模式类图：抽象工厂定义创建接口，由各具体工厂子类负责创建对应产品](https://cdn.nlark.com/yuque/0/2021/png/738210/1638522710333-dc1f18ef-340e-4d2b-a8c1-c86e12a7c20e.png)

**代码**：

```typescript
class Coffee {
  constructor(public name: string) {}
  describe(): string {
    return `一杯${this.name}`;
  }
}
class AmericanoCoffee extends Coffee {}
class LatteCoffee extends Coffee {}
class CappuccinoCoffee extends Coffee {}

// 抽象工厂：只声明「怎么造」，不关心造什么
abstract class CoffeeFactory {
  abstract createCoffee(): Coffee;
}

class AmericanoFactory extends CoffeeFactory {
  createCoffee(): Coffee {
    return new AmericanoCoffee('美式');
  }
}
class LatteFactory extends CoffeeFactory {
  createCoffee(): Coffee {
    return new LatteCoffee('拿铁');
  }
}
class CappuccinoFactory extends CoffeeFactory {
  createCoffee(): Coffee {
    return new CappuccinoCoffee('卡布奇诺');
  }
}

// 调用侧：先选工厂，再由工厂造产品
const factoryMap = {
  Americano: new AmericanoFactory(),
  Latte: new LatteFactory(),
  Cappuccino: new CappuccinoFactory(),
} satisfies Record<string, CoffeeFactory>;

function order(type: keyof typeof factoryMap): Coffee {
  return factoryMap[type].createCoffee();
}

order('Latte').describe();     // 一杯拿铁
```

> 注意这里已经**不再有 switch**：`satisfies Record<string, CoffeeFactory>` 让 `factoryMap` 的键自动成为 `order` 的合法入参类型，写错一个字母就是编译错误。

**这套写法要对照着看，才看得出工厂方法到底强在哪。** 把「新增摩卡」这件事放到两个版本里比较：

- **简单工厂**：`CoffeeFactory.order` 里那个 `switch` 是唯一的分发点，同时也是唯一的创建点。加摩卡 → 必须改它，而且**没有别的地方可以改**。
- **工厂方法**：分发点和创建点被拆开了。创建点下沉进了 `MochaFactory`；而分发点——`factoryMap`——这时只是一行**数据**，加摩卡是「加一个键」，不是「加一段分支逻辑」。

这就是那句关键对照：

> **简单工厂的 switch 是「逃不掉的」**——「new 谁」这件事本身就在那个函数里，产品一变必须改代码结构。
> **工厂方法的分发是「可以挪走的」**——它只是「键 → 工厂实例」的映射，天然可以从代码结构里变成一张表/一个注册项。

两种写法长得像，性质完全不同。再往下走一步，分发点还可以不放在业务代码里：让每个 `MochaFactory` 自己声明 `static readonly key = 'Mocha'`，由一个注册函数收集进表——新增产品就彻底只剩「新增一个类 + 调用一次 register」。这是依赖注入容器 `container.get('UserService')` 的原理，第六章会再提到。

工厂方法不是「不用写分发」，而是**把分发从「改代码逻辑」降级成「增数据项」**——这正好是 OCP「对扩展开放、对修改关闭」在代码层面的样子。

**前端应用场景**——React 早期的 `createFactory` 是「工厂方法」思想的一个极简体现。它的真实源码只有两行：

```javascript
// React 18 packages/react/src/ReactElement.js
export function createFactory(type) {
  const factory = createElement.bind(null, type);   // 👈 把 type 固定成第一个参数
  factory.type = type;
  return factory;
}
```

`bind(null, type)` 做的是「预置一个参数的部分应用（partial application）」，返回一个封闭了 `type` 的专用创建入口——**这就是「每种产品，一个专门的创建入口」**。

如果要在 TS 里复刻这个模式，有一点值得知道：**`bind` 会丢掉泛型参数**。TypeScript 对 `bind` 有专门的重载推导，普通签名和重载签名都能保住，但泛型参数没有对应的「部分应用」机制，会被推成 `unknown`：

```typescript
function pick<T>(label: string, value: T): T {
  return value;
}

const bound = pick.bind(null, 'x');
bound(1);            // 返回类型是 unknown，不是 number
```

对比一下闭包：

```typescript
interface ReactElementish {
  type: string;
  props: Record<string, unknown>;
}

function createElement(type: string, props: Record<string, unknown> = {}): ReactElementish {
  return { type, props };
}

// 语义等价于 createElement.bind(null, type)，且不依赖 bind 的推导
function createFactory(type: string) {
  return (props?: Record<string, unknown>) => createElement(type, props);
}

const h1 = createFactory('h1');
h1({ className: 'title' });   // { type: 'h1', props: { className: 'title' } }
```

`createElement` 本身没有泛型，这两种写法在这里**结果一样**。但一旦你的工厂函数带泛型（比如 `createFetcher<T>(url)`），`bind` 就会把 `T` 抹成 `unknown`，这时闭包是唯一能保住类型的选择。这条区分比笼统地说「`bind` 丢类型」准确得多——**`bind` 保签名、保重载，只丢泛型**。

还有一件更要紧的事实：**`createFactory` 在 React 19 里已经被移除了**。React 18 就已把它标为 deprecated（源码注释里写着 `// Legacy hook: remove it`），理由是 JSX 转译足够成熟，这个 API 只剩历史包袱。所以讲这段时正确的话术是「**它曾经是工厂方法思想的一个例子**」，而不是「React 现在就是这么做的」——面试里把已删除的 API 当成现状讲，比答不上来更减分。

> 💬 **面试官**：工厂方法和简单工厂的本质区别是什么？为什么说工厂方法遵守了 OCP 而简单工厂没有？
>
> ✅ 标准答案：本质区别在「**新增产品时，要不要改工厂代码**」。简单工厂把创建逻辑集中在一个 `switch` 里，加一种产品就要加一个 `case`，违反 OCP；工厂方法把「new 谁」下沉到各个子类，父类只定义 `createProduct()` 接口，新增产品只需要加一个工厂子类，父类和已有子类都不改，遵守 OCP。
>
> 🎁 加分答案：能点出「工厂方法的代价」——它遵守 OCP 的代价是**类的数量变多**：每加一种产品，多一个产品类 + 一个工厂类。所以「工厂方法一定比简单工厂好」是错的：产品种类少且稳定时，简单工厂更省；产品种类会持续增长时，工厂方法才值得。能同时说出「简单工厂违背 OCP 的原因」和「工厂方法为此付出的类爆炸代价」，说明你不是在背结论，而是在做取舍。

### 抽象工厂：一次生产整个产品族

工厂方法解决的是「单一产品等级」的问题。但如果系统里有一整组**相互关联、必须一起使用**的产品呢？——比如星巴克的美式、拿铁、卡布奇诺要成套搭配，瑞幸的也要成套搭配。

抽象工厂模式就是为此而生的：

> 抽象工厂可以向客户端提供一个接口，使客户端在不必指定具体产品的情况下，创建多个**产品等级**中的产品对象。

先理解两个词，这两个词是全系列的辨析核心：

- **产品族**（也叫「产品系列」）：一组相关或相互依赖的对象，同一家店出的整套咖啡是一个族。**它是「被选择」的那一维**——选星巴克，就整族都是星巴克的
- **产品等级**：同一个产品在不同族里的对应物——「美式」这个等级，有「星巴克美式」和「瑞幸美式」两种。**它是「被生产」的那一维**——抽象工厂里的每个 `createXxx()` 对应一个等级

**产品族矩阵图**（这张图最直观）：

![产品族与产品等级的矩阵：横向是同一产品族（星巴克/瑞幸各自成套），纵向是同一产品等级（美式/拿铁/卡布奇诺）](https://cdn.nlark.com/yuque/0/2021/png/738210/1638526162398-752c2143-99ac-4fad-91ca-aa9dd16b2598.png)

**类图**：

![抽象工厂模式类图：一个抽象工厂定义多个创建方法，星巴克与瑞幸两个具体工厂各生产一整套产品族](https://cdn.nlark.com/yuque/0/2021/png/738210/1638526391362-f145eb17-86f1-4329-b1e8-a337fb467836.png)

**代码**：

```typescript
// 三个「产品等级」，各自是一个抽象类
abstract class AmericanoCoffee {
  abstract brand: string;
  describe(): string {
    return `${this.brand}美式`;
  }
}
abstract class LatteCoffee {
  abstract brand: string;
  describe(): string {
    return `${this.brand}拿铁`;
  }
}
abstract class CappuccinoCoffee {
  abstract brand: string;
  describe(): string {
    return `${this.brand}卡布奇诺`;
  }
}

// 星巴克这一族
class StarBucksAmericanoCoffee extends AmericanoCoffee { brand = '星巴克'; }
class StarBucksLatteCoffee extends LatteCoffee { brand = '星巴克'; }
class StarBucksCappuccinoCoffee extends CappuccinoCoffee { brand = '星巴克'; }

// 瑞幸这一族
class LuckinAmericanoCoffee extends AmericanoCoffee { brand = '瑞幸'; }
class LuckinLatteCoffee extends LatteCoffee { brand = '瑞幸'; }
class LuckinCappuccinoCoffee extends CappuccinoCoffee { brand = '瑞幸'; }

// 抽象工厂：一个接口，三个创建方法 = 三个产品等级
abstract class CoffeeShopFactory {
  abstract createAmericano(): AmericanoCoffee;
  abstract createLatte(): LatteCoffee;
  abstract createCappuccino(): CappuccinoCoffee;

  // 👈 模板方法：把「一套要一起用」的约束写进工厂本身
  createCombo(): string {
    return [
      this.createAmericano().describe(),
      this.createLatte().describe(),
      this.createCappuccino().describe(),
    ].join('、');
  }
}

class StarBucksFactory extends CoffeeShopFactory {
  createAmericano() { return new StarBucksAmericanoCoffee(); }
  createLatte() { return new StarBucksLatteCoffee(); }
  createCappuccino() { return new StarBucksCappuccinoCoffee(); }
}
class LuckinFactory extends CoffeeShopFactory {
  createAmericano() { return new LuckinAmericanoCoffee(); }
  createLatte() { return new LuckinLatteCoffee(); }
  createCappuccino() { return new LuckinCappuccinoCoffee(); }
}

// 调用方只认识 CoffeeShopFactory，换一族就是换一个实例
function serveCombo(shop: CoffeeShopFactory) {
  console.log(shop.createCombo());
}

serveCombo(new StarBucksFactory());   // 星巴克美式、星巴克拿铁、星巴克卡布奇诺
serveCombo(new LuckinFactory());      // 瑞幸美式、瑞幸拿铁、瑞幸卡布奇诺
```

关键在 `CoffeeShopFactory` 那三行抽象方法——**一个抽象工厂里包含了多个「创建产品的方法」**，这其实就是「多个工厂方法的组合」，也是它和工厂方法最本质的关系（第五章辨析会展开）。

再注意 `createCombo()` 那一处：调用方拿到的永远是 `CoffeeShopFactory`，它**不知道**传进来的是哪一族，却保证拿到的三杯出自同一族。这个「整族一致」的保证，正是抽象工厂唯一无法被「三个独立工厂方法」替代的价值——如果用三个独立工厂，调用方完全可能拼出「星巴克美式 + 瑞幸拿铁」这种串味的组合。

抽象工厂有一个**重要的权衡**必须记住：

- 当系统需要**新增一个产品族**时（比如来了个「库迪咖啡」），只需新增一个具体工厂类，**既有工厂一行不改**
- 但如果要在产品族中**新增一个产品等级**（比如每家都要新增「手冲」），则**所有具体工厂类都要改**——因为抽象类里多了一个抽象方法，每个子类都得实现它，而且**这是编译器逼你改的**（漏实现就编译不过）

这个「加产品族容易、加产品等级难」的不对称，是抽象工厂最容易被考到的点。它还有一个常被忽略的推论：**抽象工厂的产品等级集合是在编译期固定下来的**——`CoffeeShopFactory` 定下几个 `createXxx()`，就永远是这几个。这也解释了为什么它外面通常还要再套一层工厂方法：`new StarBucksFactory()` 这一步本身也是一次「选择」，那一层才是可变的。

> 💬 **面试官**：抽象工厂和工厂方法是什么关系？「产品族」和「产品等级」怎么区分？
>
> ✅ 标准答案：抽象工厂是工厂方法的进一步扩展——**一个抽象工厂里包含多个工厂方法**。工厂方法针对的是「一个产品等级」：一个 `createProduct()` 接口，各子类创建同一等级的不同实现；抽象工厂针对的是「同一产品族里的多个产品等级」：一个接口里有一组 `createXxx()` 方法，每个具体工厂一次性生产一整族相互配套的产品，**换具体工厂就等于换一族**。产品族是「一组必须一起使用的相关产品」（星巴克全套咖啡），产品等级是「同一产品在不同族里的对应物」（美式这个等级，有星巴克美式和瑞幸美式）。
>
> 🎁 加分答案：能补上那个不对称的权衡——抽象工厂**加产品族容易（加一个具体工厂类）、加产品等级难（所有工厂类都要加方法）**。这个不对称正好说明抽象工厂的适用场景：当系统里「产品族」的数量会变、但「产品等级」相对稳定时最合适。反过来说，如果产品等级也频繁变，抽象工厂会改得你怀疑人生。能说出这个「什么时候适合、什么时候不适合」的边界，比背定义强得多。

---

## 四、建造者模式：把复杂构建拆成步骤

讲完工厂家族，现在进入建造者。它和工厂最大的不同，从第一句话就体现出来了——它不管「创建哪种」，它管「怎么组装」。

### 定义与四个角色

建造者模式是创建型模式里相对简单的一种。它的定义：

> 将一个复杂的对象分解成多个简单的对象来进行构建，将复杂的构建层与表现层分离，使相同的构建过程可以创建不同的表示。

一个生活类比能立刻建立直觉：

> 在外面饭店吃饭，点个水煮肉片——这家辣一点、那家咸一点、对面放青菜、隔壁放菠菜，每家做出来的都不一样。而 KFC 的汉堡，不管哪个城市哪家店，做法味道都一样，因为它用料、时间、温度都是严格规定的——我们只需要下订单。**把「怎么做」标准化成固定步骤，这就是建造者模式。**

建造者模式有四个主要角色：

- **产品角色（Product）**：包含多个组成部件的复杂对象，由具体建造者创建其各个零部件
- **抽象建造者（Builder）**：声明创建产品各个子部件的抽象方法，通常还包含一个返回成品的方法（本文代码里叫 `getCar()`，GoF 原文常写 `getResult()`）
- **具体建造者（Concrete Builder）**：实现 Builder 接口，完成复杂产品各个部件的具体创建方法
- **指挥者（Director）**：调用建造者对象中的部件构造与装配方法，完成复杂对象的创建，**在指挥者中不涉及具体产品的信息**

**类图**：

![建造者模式类图：指挥者调用建造者的构建步骤，具体建造者装配出产品](https://cdn.nlark.com/yuque/0/2021/png/738210/1639480922325-fa1e025a-aa7b-4633-a5fe-f3eedec8eecd.png)

### 传统 Director 写法：一辆车的组装

一份完整的传统写法，把四个角色和「主要流程」全部体现出来。流程是：客户提出需求 → 指挥者按需求指挥建造者依次完成各部分 → 建造者产出成品。

**产品类**（一辆待组装的车）：

```typescript
interface Car {
  name: string;
  number: string;
  wheel: string;
  engine: string;
}
```

**抽象建造者**（规定「有哪几个步骤」，不规定「每步怎么做」）：

```typescript
interface CarBuilder {
  buildName(): void;
  buildNumber(): void;
  buildWheel(): void;
  buildEngine(): void;
  getCar(): Car;          // 👈 产出成品
}
```

**具体建造者**（每一步的细节都在这里）：

```typescript
class SportsCarBuilder implements CarBuilder {
  private car: Partial<Car> = {};        // 👈 逐步积累，而不是一次 new 出完整对象

  buildName()   { this.car.name = '很厉害的车'; }
  buildNumber() { this.car.number = '88888888'; }
  buildWheel()  { this.car.wheel = '高级橡胶做的轮子'; }
  buildEngine() { this.car.engine = '很厉害的引擎'; }

  getCar(): Car {
    const { name, number, wheel, engine } = this.car;
    // 👈 这里的校验和链式写法的 build() 是同一件事：产出前确认零件齐了
    if (!name || !number || !wheel || !engine) {
      throw new Error('car is incomplete');
    }
    return { name, number, wheel, engine };
  }
}
```

**指挥者**（只规定顺序，不含任何产品细节）：

```typescript
class Director {
  construct(builder: CarBuilder): Car {
    builder.buildName();
    builder.buildNumber();
    builder.buildWheel();
    builder.buildEngine();
    return builder.getCar();
  }
}

const car = new Director().construct(new SportsCarBuilder());
```

注意 `Director.construct` 里**只写了「按什么顺序调哪几步」，完全没碰「每一步具体怎么做」**——后者全在 `SportsCarBuilder` 里。这就是「构建过程」与「具体表示」的分离：**指挥者控制顺序，建造者控制细节**。

这一点也解释了 Director 存在的意义。如果只有一个具体建造者，Director 看起来纯属多余（直接调四个方法就完了）。但换成「要造一辆卡车」时：新建 `TruckBuilder implements CarBuilder`，`Director` 一行不用改——**同样的构建过程，产出了不同的表示**，这才是 Director 的收益。这也是「建造者 vs 直接 new」最硬的那条判据：**你有没有第二个具体建造者**。只有一个时，Director 就是纯样板代码，直接用链式写法更划算。

### 前端的应用：从「选项对象」到「链式装配」

很多资料会说「`$.ajax(options)` 是建造者模式」。这个说法**只对了一半，值得掰开讲**，因为它正好是「链式 setter 到底算不算建造者」这个高频追问的起点。

先看它的形态：

```typescript
$.ajax({
  url: '/api/orders',
  method: 'POST',
  data: JSON.stringify(order),
  contentType: 'application/json',
  success: (res) => console.log(res),
});
```

`options` 对象做的确实是「声明式装配」：字段可增可减、大部分可选、不用记参数顺序。这解决了建造者要解决的一半问题——**消除了位置参数，让「哪些字段被设置」一眼可见**。

但它**不是完整的建造者模式**，因为缺了两个核心特征：

1. **没有步骤约束**：`url` 和 `method` 谁先谁后、漏了哪个能不能跑，全靠 `ajax` 内部读字段时逐一兜底，没有「构造期校验」这一环。
2. **没有构建与表示的分离**：配置对象被整个传给 `ajax`，`ajax` 自己拿着它干活——这里没有「Builder 负责攒零件，最后 `build()` 一次性交出成品」的两段式结构。

所以更准确的分类是：**它是「配置对象」范式，属于建造者的近亲，但不是建造者本体**。真正的建造者，是下面这两个特征都具备的形态：

```typescript
interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: string;
  contentType?: string;
  retry: number;
  timeout: number;
}

// 特征一：链式逐步装配（每一步返回 this）
// 特征二：build() 一次性校验，并交出成品
class RequestBuilder {
  private cfg: Partial<RequestConfig> = {};

  constructor(url: string) {
    this.cfg.url = url;
  }

  method(m: 'GET' | 'POST' | 'PUT' | 'DELETE') {
    this.cfg.method = m;
    return this;
  }

  json(body: unknown) {
    this.cfg.body = JSON.stringify(body);
    this.cfg.contentType = 'application/json';   // 👈 步骤之间的依赖，封装在建造者里
    return this;
  }

  retry(n: number) { this.cfg.retry = n; return this; }
  timeout(ms: number) { this.cfg.timeout = ms; return this; }

  build(): RequestConfig {
    const { url, method, body, contentType } = this.cfg;
    if (!url) throw new Error('url required');
    // 👈 默认值在这里一次性补齐；重新拼对象而不是直接返回 this.cfg
    return {
      url,
      method: method ?? 'GET',
      retry: this.cfg.retry ?? 0,
      timeout: this.cfg.timeout ?? 10_000,
      ...(body !== undefined && { body }),
      ...(contentType !== undefined && { contentType }),
    };
  }
}

const request = new RequestBuilder('/api/orders')
  .method('POST')
  .json(order)              // 👈 设了 body 就自动补 content-type
  .retry(2)
  .timeout(5000)
  .build();                 // 👈 漏了必填项在这里抛错，而不是发出去才 400
```

（`...(body !== undefined && { body })` 这个写法是为 `exactOptionalPropertyTypes: true` 准备的：在严格模式下，`{ body: undefined }` 和「没有 body」是两种不同的类型，直接展开 `Partial` 会通不过。）

第二个例子里的 `json()` 值得多看一眼：它**同时设置了 `body` 和 `contentType`**。这是建造者相对于「选项对象」的真正优势——**步骤之间存在依赖时，建造者可以让一步操作自动带动相关字段**，而选项对象只能要求调用方自己记得成对填写。

这也是 jQuery 的 `$.ajax` 后来被吐槽「配置项太多、配对关系靠文档」的原因，以及 `axios.create(config)` + 拦截器、`fetch` + `Request` 这类演进方向背后的共同诉求：**把「一次性的大对象」拆成「可组合的步骤」**。

### TypeScript 链式写法：流式建造者，省略 Director

在 TypeScript / 现代前端里，我们更常用的是**链式调用版本**（也叫「流式建造者」）——它省略了 `Director`，把「步骤」直接串在 Builder 自己身上。

回到开头的药品报告配置场景：

```typescript
// 产品：药品报告配置
interface ReportConfig {
  title: string;
  drugId: string;
  showWarning: boolean;
  showSideEffect?: boolean;
  printMargin?: number;
  fontSize?: number;
  date: string;
}

// 建造者：分步骤装配，build() 里做校验
class ReportConfigBuilder {
  private config: Partial<ReportConfig> = {};

  setTitle(title: string) {
    this.config.title = title;
    return this;               // 👈 返回 this，链式调用的关键
  }
  setDrugId(id: string) {
    this.config.drugId = id;
    return this;
  }
  setShowWarning(show: boolean) {
    this.config.showWarning = show;
    return this;
  }
  setShowSideEffect(show: boolean) {
    this.config.showSideEffect = show;
    return this;
  }
  setPrintMargin(margin: number) {
    this.config.printMargin = margin;
    return this;
  }
  setFontSize(size: number) {
    this.config.fontSize = size;
    return this;
  }
  setDate(date: string) {
    this.config.date = date;
    return this;
  }

  build(): ReportConfig {
    // 👈 先把必填项取出来并校验，再补齐默认值——这样返回值不需要 as 强转
    const { title, drugId, date, showWarning = true, ...rest } = this.config;
    if (!title) throw new Error('title required');
    if (!drugId) throw new Error('drugId required');

    return {
      title,
      drugId,
      showWarning,
      date: date ?? new Date().toISOString().slice(0, 10),
      ...rest,
    };
  }
}

// 用法：链式装配，可选字段想设就设、不想设就跳过
const config = new ReportConfigBuilder()
  .setTitle('药品说明书')
  .setDrugId('D001')
  .setFontSize(14)
  .build();   // showWarning / date 没设，走默认值
```

这里 `build()` 的写法值得单独说两句，因为它正是很多链式建造者示例里最容易写歪的地方：

- **不要 `return this.config as ReportConfig`**。`this.config` 是 `Partial<ReportConfig>`，里面 `title`、`drugId`、`date` 都可能是 `undefined`，`as` 只是让编译器闭嘴，运行时该炸还是炸。正确做法是**在 `build()` 里重新拼一个完整对象**，让类型推导替你验证「必填项都齐了」。
- **不要返回内部对象本身**。`return this.config` 会让外部拿到建造者的内部状态，之后任何一次外部修改都会反噬建造者；重新拼一个对象天然就是一次拷贝。

这一段里藏着建造者链式写法最核心的两个价值：

**价值一：链式调用的 `return this`。** 每个 `setXxx` 都返回 `this`（同一个 Builder），所以可以一路 `.setA().setB().setC()` 点下去。

**价值二：`build()` 里的必填校验。** 这是链式建造者相比「直接 `new`」最大的安全提升——必填字段（`drugId`、`title`）漏传，会在 `build()` 里立刻抛错，而不是等到后面某个地方用 `config.drugId` 时才炸出一个看不懂的 `undefined`。

顺带澄清一个前文埋过的点：第 02 篇讲迪米特法则（LoD）时的那个常见误解——**链式调用不违反 LoD**。判据是「这条链上对象有没有换人」：`.setTitle().setDrugId()` 每次返回的都是同一个 `ReportConfigBuilder`，全程只有一个对象，所以不是 `a.b.c` 那种「穿越」多个对象。

### 回到那个高频追问：链式 setter 到底算不算建造者

现在可以正面回答了。判据不是「有没有 `return this`」，而是**这两个特征在不在**：

| 特征 | 「只是链式 setter」 | 完整的链式建造者 |
| --- | --- | --- |
| 逐步装配 | ✅ `return this` | ✅ `return this` |
| 产出前的校验与默认值 | ❌ 设完就用 | ✅ `build()` 统一校验 + 补默认值 |
| 构建与表示分离 | ❌ 对象边设边生效 | ✅ 装配期是半成品，`build()` 才产出成品 |
| 步骤间依赖能否封装 | ❌ 靠调用方自觉 | ✅ 如 `json()` 自动补 `contentType` |

所以答案是：**「只有链式 setter」不算建造者，它只是「用链式语法写的可变对象」**。差的那一步恰恰是最有价值的一步——`build()`。没有它，链式 setter 和直接改 public 字段没有本质区别，只是写法好看：半成品状态会泄漏到业务代码里，漏设字段也不会在构造期被发现。

一句话记：**链式是「手感」，`build()` 才是「分离」**。判断一段链式代码是不是建造者，看它最后有没有一个「校验 + 产出新对象」的收口。

> 💬 **面试官**：什么场景下选建造者而不是工厂？「参数超过 5 个就用建造者」这句话背后的真正判据是什么？
>
> ✅ 标准答案：当「对象本身很复杂、需要分步骤组装」时选建造者。具体有三个信号：① 参数很多（超过 4-5 个）；② 存在大量可选字段/参数；③ 构建过程有顺序或步骤约束（比如某些字段必须先设、某些互相依赖）。「参数超过 5 个」这句口诀，背后的真正原因是——**位置参数一旦超过 5 个，可读性和可维护性会断崖式下降**：调用方要记住每个位置的语义、要用 `undefined` 占位、漏传一个就整体错位。建造者把位置参数变成具名步骤 + 链式调用，彻底消除了这个问题。
>
> 🎁 加分答案：能补两点——① 建造者和工厂的区别不在「参数数量」这个表象，而在**变化维度**：工厂的变化维度是「有哪几种产品」，建造者的变化维度是「对象有哪些步骤/字段」。所以即使参数少，如果这些参数是「一组可变的组装步骤」，也可能用建造者；反过来参数多但如果是一次性、无可选、无顺序依赖的配置，也可以不用。② 能指出链式建造者「省略 Director」是现代前端的常见变体，以及 `build()` 里做必填校验是把「运行时错误」提前成「构造期错误」的关键设计。

---

## 五、易混淆辨析：四组必考对比

这一章是全系列「易混淆辨析」的延续，也是本篇面试考点最密集的地方。四组对比，每一组都对应至少一道面试原题。

### 简单工厂 vs 工厂方法

| 维度       | 简单工厂              | 工厂方法                |
| ---------- | --------------------- | ----------------------- |
| 形态       | 一个函数 + `switch` | 抽象工厂 + 多个工厂子类 |
| 变化点位置 | 集中在工厂函数里      | 下沉到各个子类          |
| 新增产品   | 改工厂函数（加 case） | 只加子类                |
| OCP        | 违反                  | 遵守                    |
| 代价       | 零额外类              | 每产品多一个工厂类      |

**本质区别在「新增产品时，改不改工厂代码」。** 简单工厂是「函数」，违反 OCP；工厂方法把变化点封装进子类，遵守 OCP。这一组，是全文最常被问、也最容易答错的第一道分水岭。

### 工厂方法 vs 抽象工厂

| 维度       | 工厂方法                | 抽象工厂                        |
| ---------- | ----------------------- | ------------------------------- |
| 针对对象   | 一个产品等级            | 同一个产品族内的多个产品等级    |
| 创建方法数 | 一个 `createProduct()`  | 一组 `createXxx()`              |
| 换实现时   | 换一个工厂              | 换一整个具体工厂（= 换一族）    |
| 关系       | ——                      | 包含多个工厂方法                |

**这里有一个必须说准、但大量资料说歪的点**：抽象工厂针对的不是「多个产品族」，而是「**一个产品族里的多个产品等级**」。

- **工厂方法**：只管「美式」这一个等级，有 `StarBucksAmericanoFactory`、`LuckinAmericanoFactory` 两个实现。
- **抽象工厂**：一次管「美式 + 拿铁 + 卡布奇诺」三个等级，由 `StarBucksFactory` 成套产出。**换产品族 = 换具体工厂**（`StarBucksFactory` → `LuckinFactory`），产品族本身是「被选择的那个维度」，不是「被生产的那些对象」。

判断口诀可以这样说：**看工厂接口里有几个创建方法**——一个就是工厂方法，一组就是抽象工厂；再看**换的是什么**——换一个工厂实现是工厂方法，成套换一个具体工厂（连带换掉一族产品）是抽象工厂。

### 建造者 vs 工厂

| 维度       | 工厂                   | 建造者                 |
| ---------- | ---------------------- | ---------------------- |
| 关心的问题 | 创建**哪种**对象 | **怎么**组装对象 |
| 返回方式   | 一次性返回完整对象     | 分步骤组装后返回       |
| 变化维度   | 产品类型               | 构建步骤 / 字段        |
| 典型场景   | 多种可替换的产品       | 一个复杂对象的多种配置 |

**工厂一次性返回完整对象（关心「创建哪种」），建造者分步骤组装（关心「怎么组装」）。** 参数超过 5 个且可选字段多时选建造者——但这句口诀背后的原因（位置参数的可读性塌方），已经在第四章讲透了。

### 抽象工厂 vs 建造者（补充辨析）

这一组大纲里没有单独列，但面试追问链里经常出现，值得补上：

| 维度     | 抽象工厂                               | 建造者                       |
| -------- | -------------------------------------- | ---------------------------- |
| 产出物   | 一整套**相关对象**（产品族）     | 一个**复杂对象**       |
| 变化的点 | 换「哪一套」产品                       | 换「怎么拼装」的过程         |
| 典型场景 | 换一套 UI 主题（整套按钮/输入框/弹窗） | 生成一份报表（字段逐步装配） |

**判据**：如果你面对的是「**这套对象被换成另一套**」——比如整体切换 UI 主题、整体切换数据库方言，那是抽象工厂；如果你面对的是「**这个对象被逐步拼装出来**」——比如一步步填字段、一步步做可选配置，那是建造者。一个管「换套件」，一个管「拼单件」。

---

## 六、前端工程落地：那些你以为只是 API 的东西

把上面的抽象模式，落回你天天在写、却未必意识到它们背后是工厂/建造者的 API 上。

### React 的 createElement 与 createFactory（分清是哪一层）

这一组最容易被讲错，正因为「按 type 分发」发生在两层，很多人把两层混成了一层：

- **`createElement(type, props, ...children)` 本身不是工厂**：它只是把入参规整成一个 `ReactElement` 结构体，不检查 `type` 合法性、不创建组件实例。JSX 里的 `<div />` 编译后就是它，但这时「div 是什么」还没被解释。
- **真正的「按 type 决定造什么」在 reconciler**：`createFiberFromTypeAndProps` 里那个 `switch`，才决定这个 type 对应 FunctionComponent / ClassComponent / HostComponent / Fragment / Suspense……（源码摘录见第三章）。
- **`createFactory(type)` 曾按「工厂方法」的思路设计**：把 type 预置进创建入口，得到「专用工厂」。它在 React 19 已被移除，React 18 时就标了 deprecated。

所以准确的说法是：**React 内部有一个简单工厂（在 reconciler），但它对外暴露的 `createElement` 只是结构体构造器**。面试里把这两层分开说，比笼统说「createElement 是简单工厂」更能体现你读过源码。

Vue 3 的 `h(type, props, children)` 是同样的情况：`h` 只组装 VNode，`type` 到 `shapeFlag` 的翻译在 `createVNode` 内部完成——用位运算代替了 switch，但本质仍是同一个封闭枚举上的分发。

### jQuery：同一个库里，一个真工厂 + 一个「准建造者」

- **`$()` 是简单工厂**：按 selector 类型决定返回什么样的对象（字符串走选择器、DOM 节点直接包装、函数走 `ready`……）
- **`$.ajax(options)` 更接近「配置对象」而非建造者**：它消除了位置参数、让可选字段可读，但**没有步骤约束、没有 `build()` 分离**。第四章已经详细拆过这条界线：缺这两个特征，就只能算建造者的近亲。

这个对比本身就很有价值：**同一个库里，一个 API 是真工厂，另一个只是「像建造者」**——说明判断模式不能靠 API 的「手感」，得靠结构特征。

### 查漏补缺：现代前端里更多的影子

结合这些年前端工程的常见实践，再补几个笔记里没有、但面试时能加分的观察：

- **依赖注入容器 / IoC 容器**，本质是「工厂 + 注册表」：`container.get('UserService')` 里，容器就是一个「按 key 查工厂、再 new 出来」的抽象工厂
- **`axios.create(config)` / `fetch` + `Request`**：把「一次性的大配置对象」拆成「可复用、可组合的步骤」，是建造者思想在现代 HTTP 客户端里的形态——第四章的 `RequestBuilder` 就是它的手写版
- **表单 / 图表库的 schema 构建**：Zod 的 `z.object({...}).extend({...})`、ECharts 的 `option` 配置对象——注意区分：Zod 的 `.extend()` 返回新 schema，**更像原型克隆**；ECharts `option` 才是纯粹的配置对象
- **路由表、Mock 数据工厂**：`routes.map(r => createRoute(r))`、`Mock.mock({...})` 都是简单工厂的日常形态——一个入参，决定产出物

**核心判断力**：以后你在代码里看到一个「创建对象」的地方，先别急着说它是什么模式，问自己一句——**这里变化的是「有哪几种」，还是「怎么拼出来」？** 前者是工厂的领地，后者是建造者的领地。这一句判断，比记住所有 API 都值钱。

---

## 七、面试高频问：标准答案 + 加分答案

这一章把前面散落的面试题收口，三组核心题 + 追问链，每道都给你「及格答法」和「加分答法」。

### 核心题一：工厂方法和简单工厂有什么区别？各自违反或遵守了哪条设计原则？

**答这道题的关键，是抓住「新增产品改不改工厂代码」这一个判据。**

- 简单工厂：一个函数里用 `switch`/`if` 决定 new 谁，新增产品要改 switch → **违反 OCP（开闭原则）**
- 工厂方法：抽象工厂定义 `createProduct()` 接口，子类决定实例化哪个类，新增产品只加子类 → **遵守 OCP**

加分点：能说出「工厂方法为此付出的代价是类数量变多」，以及「产品种类少且稳定时简单工厂更划算」——把一道「背区别」的题，答成一道「做取舍」的题。

### 核心题二：建造者模式和工厂模式的区别是什么？什么场景下选建造者？

- 工厂：一次性返回完整对象，关心「创建**哪种**」
- 建造者：分步骤组装，关心「**怎么**创建」
- 选建造者的场景：参数超过 5 个、可选字段多、构建过程有步骤/顺序约束

加分点：别停在「参数超过 5 个」这个口诀上，说出它背后的原因（位置参数可读性塌方），并补一句「现代前端的链式建造者常省略 Director」+「`build()` 里做必填校验是把运行时错误提前成构造期错误」。

### 核心题三：抽象工厂和工厂方法的关系是什么？

- 抽象工厂是工厂方法的扩展：**一个抽象工厂里包含多个工厂方法**
- 工厂方法针对「一个产品等级」，抽象工厂针对「同一产品族里的多个产品等级」
- 追问「产品族和产品等级怎么区分」：产品族 = 一组必须一起用的相关对象（星巴克全套咖啡）；产品等级 = 同一产品在不同族里的对应物（美式这个等级有星巴克美式和瑞幸美式）

加分点：补上那个不对称——**加产品族容易（加一个具体工厂类）、加产品等级难（所有工厂类都要加方法）**，并说明这决定了抽象工厂的适用边界（产品族会变、产品等级稳定时最合适）。

---

## 💡 一张图总结（面试速记表）

| 模式                 | 一句话内核                                                                        | 考察频率    |
| -------------------- | --------------------------------------------------------------------------------- | ----------- |
| 简单工厂             | 一个 switch 决定 new 谁；违反 OCP，非 GoF 23 种                                   | ⭐⭐⭐ 必考 |
| 工厂方法             | 「new 谁」下沉到子类；加产品只加子类，遵守 OCP                                    | ⭐⭐⭐ 必考 |
| 抽象工厂             | 一次生产一整个产品族；加族容易、加等级难                                          | ⭐⭐⭐ 必考 |
| 建造者               | 分步骤组装复杂对象，构建与表示分离                                                | ⭐⭐⭐ 必考 |
| 简单工厂 vs 工厂方法 | 分水岭在「新增产品改不改工厂代码」                                                | ⭐⭐⭐ 必考 |
| 工厂方法 vs 抽象工厂 | 一个产品等级 vs 同一族内多个等级；抽象工厂含多个工厂方法                            | ⭐⭐⭐ 必考 |
| 建造者 vs 工厂       | 创建哪种 vs 怎么组装；参数超 5 个且可选多选建造者                                 | ⭐⭐⭐ 必考 |
| 抽象工厂 vs 建造者   | 换「一套相关对象」vs 拼「一个复杂对象」                                           | ⭐⭐ 高频   |
| 链式建造者           | `return this` 串步骤，`build()` 校验必填并重新拼完整对象；不违反 LoD                          | ⭐⭐ 高频   |
| 前端落地             | reconciler 里的 `switch` 才是简单工厂；`$()` 简单工厂；`$.ajax` 只是「配置对象」，不算建造者 | ⭐⭐ 高频   |

> 💡 记住这条主线：**工厂解决「创建哪种对象」的变化，建造者解决「怎么组装对象」的变化。** 前者管「做谁」，后者管「怎么做」——以后遇到任何创建场景，先问自己一句「变化的是类型，还是步骤」，答案出来，该用哪个模式也就出来了。

---

## 📝 留个问题

打开你的项目，找两类代码：

1. 一个用 `switch (type)` / `if (type === ...)` 来 `new` 不同对象的函数——数一数它现在有几个分支？过去一年加过几个？
2. 一个 `new` 了超过 5 个参数的对象——里面有几个参数是可选的？有没有用 `undefined` 占位的现象？

然后各问一句：**这里变化的是「有哪几种」，还是「怎么拼出来」？** 如果是前者，它值不值得改成工厂方法（产品还会再加吗）？如果是后者，值不值得改成建造者（字段还会再加吗）？

我的猜测是：你找到的第一个函数，八成是「简单工厂」，而且已经违反 OCP 很久了。把你找到的案例写在评论区，我们一起看看大家项目里藏着多少「该用工厂却用了 switch」「该用建造者却硬传了一串 undefined」的代码 👇

---

## 参考资料

https://refactoring.guru/design-patterns/factory-method （refactoring.guru 工厂方法页，含 UML 图与多语言示例）

https://refactoring.guru/design-patterns/abstract-factory （refactoring.guru 抽象工厂页）

https://refactoring.guru/design-patterns/builder （refactoring.guru 建造者页）

https://github.com/facebook/react/blob/v18.2.0/packages/react/src/ReactElement.js （React 18 的 `createElement` / `createFactory` 源码；`main` 分支已迁到 `packages/react/src/jsx/` 且删去了 `createFactory`）

https://github.com/facebook/react/blob/v18.2.0/packages/react-reconciler/src/ReactFiber.new.js （`createFiberFromTypeAndProps`：真正按 type 分发的那个 switch）

https://developer.mozilla.org/zh-CN/docs/Web/JavaScript （MDN，构造函数返回对象、`bind` 等语言机制参考）

《设计模式：可复用面向对象软件的基础》 Erich Gamma 等四人组著，1994（GoF 23 种模式的权威出处，工厂方法/抽象工厂/建造者的原始定义）

《JavaScript 设计模式与开发实践》 曾探 著（前端场景化讲解，中文资料首选）

> 推荐搜索关键词：「简单工厂 工厂方法 抽象工厂 区别」「工厂方法 开闭原则 OCP」「产品族 产品等级 抽象工厂」「建造者模式 工厂模式 区别」「建造者 链式调用 return this」「React createFiberFromTypeAndProps」「jQuery 设计模式 简单工厂」。

---

> 🔖 这是「前端设计模式」系列第 04 篇。上一篇：《单例模式：从 ESM 模块缓存到全局状态管理（面试收藏级）》；下一篇预告：《原型模式：克隆创建对象，与 JS 原型链的本质区别（面试收藏级）》
