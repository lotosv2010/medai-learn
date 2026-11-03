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

### 痛点一：对接多家物流商，每家的下单接口都不一样

医疗系统要对接多家物流商——顺丰、京东、极兔。每家提供的 SDK 不一样，下单方法名不同、参数结构不同、返回字段也不同：

```typescript
// 假设三家物流商的下单 SDK 长这样（接口各不相同）
sfSdk.createOrder({ sender, receiver });          // 顺丰：createOrder
jdSdk.placeOrder(receiver, sender);               // 京东：placeOrder，参数顺序都反了
jtSdk.submitBill({ to: receiver, from: sender }); // 极兔：submitBill，字段名也不一样
```

如果业务代码直接调用，每接入一家物流商，所有「发快递」的地方都要跟着改。更糟的是，调用方被逼着记住了每一家的 SDK 细节——顺丰是 `createOrder`，京东是 `placeOrder`。

**上层真正想要的是什么？** 只是一句话：「给我一个快递下单器，我调 `ship(order)` 就行，别让我知道你是谁家的。」

把实例化逻辑集中起来，调用方只调一个统一的入口——这就是**工厂方法模式**要解决的问题：**创建哪种对象**（哪种物流商的下单器），由工厂说了算，调用方不关心。

### 痛点二：药品报告配置对象，字段多到 new 不动

药品详情页要生成一份报告配置 `ReportConfig`，几十个字段：标题、药品 id、是否显示警示、是否打印副作用、页边距、字体大小、水印……其中大部分是**可选**的。

直接 `new` 会变成这样：

```typescript
const config = new ReportConfig(
  '药品说明书',      // title
  'D001',           // drugId
  true,             // showWarning
  undefined,        // showSideEffect —— 可选，传 undefined 占位
  undefined,        // printMargin —— 可选，传 undefined 占位
  undefined,        // fontSize —— 可选，传 undefined 占位
  '2026-11-03',     // date
  // ……还有十几个
);
```

你看到那一串 `undefined` 了吗？**这就是「位置参数」的灾难**：要传第 7 个参数，就得把第 4、5、6 个位置先用 `undefined` 占住。读这段代码的人完全不知道每个 `true`、每个 `undefined` 在说什么。

换成链式构建，可读性天差地别：

```typescript
const config = new ReportConfigBuilder()
  .setTitle('药品说明书')
  .setDrugId('D001')
  .setShowWarning(true)
  .build();   // 必填字段 drugId 漏了会在这里抛错
```

这就是**建造者模式**：把「组装一个复杂对象」的过程拆成一步步，构建与表示分离——解决的是**怎么创建复杂对象**的问题。

### 两个痛点，两个问题

现在把这两个场景并排放，分界线就出来了：

| | 痛点一：物流商 | 痛点二：报告配置 |
| --- | --- | --- |
| 纠结的问题 | 该 `new` 哪一家的下单器 | 这几十个字段怎么一步步填 |
| 变化点 | 「有哪几种」在变 | 「有哪些步骤 / 哪些字段」在变 |
| 对应模式 | 工厂（工厂方法） | 建造者 |
| 一句话 | 创建**哪种**对象 | **怎么**组装对象 |

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

```text
工厂：解决「创建【哪种】对象」  →  变化的，是「对象类型」
建造者：解决「【怎么】创建对象」  →  变化的，是「构建过程 / 步骤」
```

**工厂关心的是「做谁」，建造者关心的是「怎么做」。** 一个是选择问题，一个是流程问题。

> 💬 **面试官**：工厂模式和建造者模式都是创建型模式，它们在本质上是回答哪两个不同的问题？
>
> ✅ 标准答案：工厂模式回答的是「**创建哪种对象**」——把「实例化哪个类」的选择从调用方抽离，调用方面向抽象接口，不关心具体是哪个实现。建造者模式回答的是「**怎么组装对象**」——把一个复杂对象的构建过程拆成多个步骤，构建过程与最终表示分离。前者变化的维度是「对象类型」，后者变化的维度是「构建步骤」。所以工厂和建造者不是竞争关系，它们解决的是创建这件事里的两个不同侧面，甚至可以组合使用。
>
> 🎁 加分答案：能补一句「从变化点看」——判断一个创建场景该归谁，就看它的**变化点在哪**：如果变化点是「产品的种类会增多/替换」（比如支付方式从 3 种变 5 种），那是工厂；如果变化点是「对象的字段/步骤会增多、有可选部分」（比如报表配置字段从 20 个变 30 个），那是建造者。能说出「变化点的类型决定模式的选择」而不是背口诀，是这道题的加分点。

---

## 三、工厂家族：从简单工厂到抽象工厂的三层递进

这一章是全文最重的一章。**不要把简单工厂、工厂方法、抽象工厂当成三个并列的名字背**——它们是一条演进线，每一层都在回答「上一层的缺陷是什么」。

记住这条线的方向，你以后看任何工厂代码，都能立刻定位它在哪一层：

```text
 ① 简单工厂  ──▶ 一个 switch 决定 new 谁，违反 OCP
 ② 工厂方法  ──▶ 把「new 谁」下沉到子类，遵守 OCP
 ③ 抽象工厂  ──▶ 一次生产一整个「产品族」，而非单一产品
```

### 简单工厂：一个 switch 决定一切

最简单、也最常见的一种。由一个工厂对象，通过 `switch` / `if` 判断，决定创建哪种产品类的实例。

**类图**：

![简单工厂模式类图：由一个工厂对象通过判断决定创建哪种咖啡产品类的实例](https://cdn.nlark.com/yuque/0/2021/png/738210/1638511983415-9e2e4278-44bf-47cb-99e2-c3012c9813c0.png)

**代码**：

```typescript
class Coffee {
  constructor(public name: string) {}
}

class AmericanoCoffee extends Coffee {}
class LatteCoffee extends Coffee {}
class CappuccinoCoffee extends Coffee {}

class CoffeeFactory {
  static order(name: string) {
    switch (name) {
      case 'Americano':
        return new AmericanoCoffee(name);
      case 'Latte':
        return new LatteCoffee(name);
      case 'Cappuccino':
        return new CappuccinoCoffee(name);
      default:
        throw new Error('Not Found');
    }
  }
}

console.log(CoffeeFactory.order('Americano'));
console.log(CoffeeFactory.order('Latte'));
console.log(CoffeeFactory.order('Cappuccino'));
console.log(CoffeeFactory.order('water'));   // 👈 抛错：Not Found
```

注意最后一行 `order('water')` 会抛 `Not Found`——因为 `switch` 里没有「water」这个分支。

**这个模式的缺点，恰恰是它名字里「简单」二字的代价**：

- 如果产品的种类非常多，`switch case` 的判断会变得非常多——一个工厂函数最后可能长出几十个 case
- **不符合开闭原则（OCP）**：要增加或删除一个产品种类，就要去修改 `switch case` 的判断代码

第二点是致命的。回忆第 01 篇 SOLID 里讲的 OCP——「对扩展开放，对修改关闭」。简单工厂每加一种咖啡，都要回头改 `CoffeeFactory.order`，这就是「对修改不关闭」的典型。

**前端应用场景**，简单工厂其实到处都是：

jQuery 的 `$()` 就是一个简单工厂——它根据传入的 selector 类型，决定返回什么样的对象：

```typescript
interface Jquery {
  [key: number]: any;
}

class Jquery {
  public length?: number;
  constructor(selector: string) {
    const element = Array.from(document.querySelectorAll(selector));
    const length = element ? element.length : 0;
    for (let i = 0; i < length; i++) {
      this[i] = element[i];
    }
    this.length = length;
  }
  html(htmlText: string | undefined) {
    if (htmlText) {
      this[0].innerHTML = htmlText;
    } else {
      return this[0].innerHTML;
    }
  }
}

declare global {
  // 给全局对象添加属性，不加 global，就是给模块内部对象加属性
  interface Window {
    $: any;
  }
}
window.$ = function (selector: string) {
  return new Jquery(selector);
};

export default {};
```

React 的 `createElement` 也是简单工厂——内部按 `type` 决定创建什么样的 ReactElement：

```typescript
export function createElement(type: string, config: Record<string, any>, children: any) {
  return ReactElement(
    type,
    key,
    ref,
    self,
    source,
    ReactCurrentOwner.current,
    props
  );
}
```

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
}
class AmericanoCoffee extends Coffee {}
class LatteCoffee extends Coffee {}
class CappuccinoCoffee extends Coffee {}

abstract class AbstractFactory {
  abstract createCoffee(name: string): Coffee;
}

class AmericanoFactory extends AbstractFactory {
  createCoffee(name: string): Coffee {
    return new AmericanoCoffee(name);
  }
}
class LatteFactory extends AbstractFactory {
  createCoffee(name: string): Coffee {
    return new LatteCoffee(name);
  }
}
class CappuccinoFactory extends AbstractFactory {
  createCoffee(name: string): Coffee {
    return new CappuccinoCoffee(name);
  }
}

// 原来在简单工厂里，是由 Factory 来创建产品的
// 在工厂方法里，不再由 Factory 来创建产品，
// 而是先创建具体的工厂，然后由工厂创建对应的产品
class Factory {
  static order(name: string) {
    switch (name) {
      case 'Americano':
        return new AmericanoFactory().createCoffee(name);
      case 'Latte':
        return new LatteFactory().createCoffee(name);
      case 'Cappuccino':
        return new CappuccinoFactory().createCoffee(name);
      default:
        throw new Error('Not Found');
    }
  }
}

console.log(Factory.order('Americano'));
console.log(Factory.order('Latte'));
console.log(Factory.order('Cappuccino'));
console.log(Factory.order('water'));

export default {};
```

看到区别了吗？**创建每种咖啡的逻辑，被拆进了各自独立的工厂子类里**。`AmericanoFactory` 只负责 `new AmericanoCoffee`，`LatteFactory` 只负责 `new LatteCoffee`。

那么新增一种咖啡（比如「摩卡」）时会发生什么？

- **简单工厂**：要回到 `CoffeeFactory.order` 里，在 switch 里加一个 `case 'Mocha'`
- **工厂方法**：新建一个 `MochaFactory extends AbstractFactory`，**父类和其它已有工厂一行都不用改**

这就是「遵守 OCP」的含义——新增产品**只加子类，不改父类**。

（顺带说明一个细节：上面示例里那个 `Factory.order` 的 switch 还在，它只是在「选择用哪个工厂」，属于调用侧的编排；真正的「创建产品的变化点」已经被封装进各个工厂子类里了。这也是很多资料里工厂方法例子里仍保留一个选择分支的原因。）

**前端应用场景**——React 早期的 `createFactory` 就是工厂方法：

```typescript
function createElement(type: string, props: any) {
  return {
    type,
    props
  };
}

function createFactory(type: string) {
  const factory = createElement.bind(null, type);   // 👈 把 type 提前绑定
  return factory;
}

const factory = createFactory('h1');
const element = factory({ id: 'h1', className: 'title' });
console.log(element);
```

`createFactory(type)` 用 `createElement.bind(null, type)` 把 `type` 提前固定住，返回一个「专门创建某类元素的工厂」。这就是工厂方法的思想——**每种产品，一个专门的创建入口**。

> 💬 **面试官**：工厂方法和简单工厂的本质区别是什么？为什么说工厂方法遵守了 OCP 而简单工厂没有？
>
> ✅ 标准答案：本质区别在「**新增产品时，要不要改工厂代码**」。简单工厂把创建逻辑集中在一个 `switch` 里，加一种产品就要加一个 `case`，违反 OCP；工厂方法把「new 谁」下沉到各个子类，父类只定义 `createProduct()` 接口，新增产品只需要加一个工厂子类，父类和已有子类都不改，遵守 OCP。
>
> 🎁 加分答案：能点出「工厂方法的代价」——它遵守 OCP 的代价是**类的数量变多**：每加一种产品，多一个产品类 + 一个工厂类。所以「工厂方法一定比简单工厂好」是错的：产品种类少且稳定时，简单工厂更省；产品种类会持续增长时，工厂方法才值得。能同时说出「简单工厂违背 OCP 的原因」和「工厂方法为此付出的类爆炸代价」，说明你不是在背结论，而是在做取舍。

### 抽象工厂：一次生产整个产品族

工厂方法解决的是「单一产品等级」的问题。但如果系统里有一整组**相互关联、必须一起使用**的产品呢？——比如星巴克的美式、拿铁、卡布奇诺要成套搭配，瑞幸的也要成套搭配。

抽象工厂模式就是为此而生的：

> 抽象工厂可以向客户端提供一个接口，使客户端在不必指定具体产品的情况下，创建多个**产品族**中的产品对象。

先理解两个词，这两个词是全系列的辨析核心：

- **产品族**：一组相关或相互依赖的对象。系统一次只能消费某一族产品——星巴克的一整套咖啡，是同一个族
- **产品等级**：同一个产品在不同族里的对应物——「美式」这个等级，有「星巴克美式」和「瑞幸美式」两种

**产品族矩阵图**（这张图最直观）：

![产品族与产品等级的矩阵：横向是同一产品族（星巴克/瑞幸各自成套），纵向是同一产品等级（美式/拿铁/卡布奇诺）](https://cdn.nlark.com/yuque/0/2021/png/738210/1638526162398-752c2143-99ac-4fad-91ca-aa9dd16b2598.png)

**类图**：

![抽象工厂模式类图：一个抽象工厂定义多个创建方法，星巴克与瑞幸两个具体工厂各生产一整套产品族](https://cdn.nlark.com/yuque/0/2021/png/738210/1638526391362-f145eb17-86f1-4329-b1e8-a337fb467836.png)

**代码**：

```typescript
abstract class AmericanoCoffee {}
abstract class LatteCoffee {}
abstract class CappuccinoCoffee {}

class StarBucksAmericanoCoffee extends AmericanoCoffee {}
class StarBucksLatteCoffee extends LatteCoffee {}
class StarBucksCappuccinoCoffee extends CappuccinoCoffee {}

class LuckinAmericanoCoffee extends AmericanoCoffee {}
class LuckinLatteCoffee extends LatteCoffee {}
class LuckinCappuccinoCoffee extends CappuccinoCoffee {}

// 抽象工厂
abstract class AbstractFactory {
  abstract createAmericanoCoffee(name: string): AmericanoCoffee;
  abstract createLatteCoffee(name: string): LatteCoffee;
  abstract createCappuccinoCoffee(name: string): CappuccinoCoffee;
}

class StarBucksFactory extends AbstractFactory {
  createAmericanoCoffee(name: string): AmericanoCoffee {
    return new StarBucksAmericanoCoffee();
  }
  createLatteCoffee(name: string): LatteCoffee {
    return new StarBucksLatteCoffee();
  }
  createCappuccinoCoffee(name: string): CappuccinoCoffee {
    return new StarBucksCappuccinoCoffee();
  }
}
class LuckinFactory extends AbstractFactory {
  createAmericanoCoffee(name: string): AmericanoCoffee {
    return new LuckinAmericanoCoffee();
  }
  createLatteCoffee(name: string): LatteCoffee {
    return new LuckinLatteCoffee();
  }
  createCappuccinoCoffee(name: string): CappuccinoCoffee {
    return new LuckinCappuccinoCoffee();
  }
}

// 瑞幸
const luckinFactory = new LuckinFactory();
console.log(luckinFactory.createAmericanoCoffee('Americano'));

// 星巴克
const starBucksFactory = new StarBucksFactory();
console.log(starBucksFactory.createAmericanoCoffee('Americano'));
```

关键点在 `AbstractFactory` 那三行抽象方法——**一个抽象工厂里包含了多个「创建产品的方法」**。这其实就是「多个工厂方法的组合」，也是它和工厂方法最本质的关系（第五章辨析会展开）。

抽象工厂有一个**重要的权衡**必须记住：

- 当系统需要**新增一个产品族**时（比如来了个「库迪咖啡」），只需新增一个工厂类，**无需修改源代码**
- 但如果要在产品族中**新增一个产品等级**（比如每家都要新增「手冲」），则**所有的工厂类都要改**——因为每个工厂都要实现新的 `createXxxCoffee()` 方法

这个「加产品族容易、加产品等级难」的不对称，是抽象工厂最容易被考到的点。

> 💬 **面试官**：抽象工厂和工厂方法是什么关系？「产品族」和「产品等级」怎么区分？
>
> ✅ 标准答案：抽象工厂是工厂方法的进一步扩展——**一个抽象工厂里包含多个工厂方法**。工厂方法针对的是「一个产品等级」：一个 `createProduct()` 接口，各子类创建同一等级的不同实现；抽象工厂针对的是「多个产品族」：一个接口里有一组 `createXxx()` 方法，每个具体工厂一次性生产一整族相互配套的产品。产品族是「一组必须一起使用的相关产品」（星巴克全套咖啡），产品等级是「同一产品在不同族里的对应物」（美式这个等级，有星巴克美式和瑞幸美式）。
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
- **抽象建造者（Builder）**：包含创建产品各个子部件的抽象方法的接口，通常还包含一个返回复杂产品的方法 `getResult()`
- **具体建造者（Concrete Builder）**：实现 Builder 接口，完成复杂产品各个部件的具体创建方法
- **指挥者（Director）**：调用建造者对象中的部件构造与装配方法，完成复杂对象的创建，**在指挥者中不涉及具体产品的信息**

**类图**：

![建造者模式类图：指挥者调用建造者的构建步骤，具体建造者装配出产品](https://cdn.nlark.com/yuque/0/2021/png/738210/1639480922325-fa1e025a-aa7b-4633-a5fe-f3eedec8eecd.png)

### 传统 Director 写法：一辆车的组装

看一份完整的传统写法，它把四个角色和「主要流程」全部体现出来了。主要的流程是：

- 客户提出需求
- 指挥者根据用户需求，指挥建造者去完成需求的各个部分
- 建造者完成相应的部分

**产品类**（一辆加工的空壳汽车）：

```typescript
/**
 * 产品类：car 目前需要构建一辆车。
 * 产品类为一辆加工的空壳汽车。
 */
function car() {
  this.name = '';
  this.number = '';
  this.wheel = '';
  this.engine = '';
}
```

**建造者类**（里面有专门负责各个部分的工人）：

```typescript
/*
 * 建造者类，里面有专门负责各个部分的工人
 * 在这里我们可以看到各个部分的工人以及他们的工作，
 * 他们的各自的工作最终合并成一辆汽车
 */
function carBuilder() {
  this.nameBuilder = function () {
    this.name = '很厉害的车';
  };
  this.numberBuilder = function () {
    this.number = '88888888';
  };
  this.wheelBuilder = function () {
    this.wheel = '高级橡胶做的轮子';
  };
  this.engineBuilder = function () {
    this.engine = '很厉害的引擎';
  };
  this.getCar = function () {
    var Car = new car();
    Car.name = this.name;
    Car.number = this.number;
    Car.wheel = this.wheel;
    Car.engine = this.engine;
    return Car;
  };
}
```

**指挥者类**（指挥各个部分的工人工作）：

```typescript
/**
 * 指挥者类，指挥各个部分的工人工作
 */
function director() {
  this.action = function (builder) {
    builder.nameBuilder();
    builder.numberBuilder();
    builder.wheelBuilder();
    builder.engineBuilder();
  };
}
```

**使用**（最终客户通过 `getCar` 得到车，不需要知道建造细节）：

```typescript
/**
 * 使用方法：最终客户通过 getCar 方法得到了这辆车，
 * 并且不需要知道其中的建造细节
 */
var builder = new carBuilder();
var director = new director();
director.action(builder);
var Car = builder.getCar();
console.log(Car);
```

注意这段代码里的分工：`director.action(builder)` 里**只写了「按什么顺序调哪几步」，完全没碰「每一步具体怎么做」**——后者全在 `carBuilder` 里。这就是「构建过程」和「具体表示」的分离：指挥者控制顺序，建造者控制细节。

### 前端的应用：ajax 的 options 装配

建造者模式在代码里经常出现，比如 jQuery 的 `ajax` 请求：

```typescript
// 1 用户发送一个请求
// 2 $.ajax 建造者模式（指挥者）
// 3 具体实现（建造者）
$.ajax({
  url: 'www.juejin.cn',
  success: function (argument) {}
});
```

再补一个更完整、能体现「Director 指挥建造者」的 KFC 例子：

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title></title>
  </head>
  <body></body>
  <script>
    // 商店：Director 指挥者类
    function KFCShop() {
      this.construct = function (builder) {
        builder.step1();
        builder.step2();
        return builder.get();
      };
    }
    // 汉堡包制作：建造者类
    function HamburgerBuilder() {
      this.bread = null;
      this.step1 = function () {
        this.bread = new Hamburger();
      };
      this.step2 = function () {
        this.bread.addQuantity();
      };
      this.get = function () {
        return this.bread;
      };
    }
    // 薯条制作：建造者类
    function FrenchFriesBuilder() {
      this.fries = null;
      this.step1 = function () {
        this.fries = new FrenchFries();
      };
      this.step2 = function () {
        this.fries.addQuantity();
      };
      this.get = function () {
        return this.fries;
      };
    }
    // 产品类：汉堡包
    function Hamburger() {
      this.quantity = 1;
      this.addQuantity = function () {
        this.quantity = 6;
      };
      this.say = function () {
        log.add('我要' + this.quantity + '个汉堡包！');
      };
    }
    // 产品类：薯条
    function FrenchFries() {
      this.quantity = 1;
      this.addQuantity = function () {
        this.quantity = 2;
      };
      this.say = function () {
        log.add('我要' + this.quantity + '份薯条！');
      };
    }
    // 日志打印
    var log = (function () {
      var log = '';
      return {
        add: function (msg) {
          log += msg + '\n';
        },
        show: function () {
          alert(log);
          log = '';
        }
      };
    })();
    // 运行程序
    function run() {
      var shop = new KFCShop();
      var hamBuilder = new HamburgerBuilder();
      var friesBuilder = new FrenchFriesBuilder();
      // 顾客通过向商店下订不同的饮食套餐，得到不同的美食
      var hamburgerOrder = shop.construct(hamBuilder);
      var friesOrder = shop.construct(friesBuilder);
      hamburgerOrder.say();
      friesOrder.say();
      log.show();
    }
    run();
  </script>
</html>
```

`KFCShop.construct` 就是 Director——它调用 `builder.step1()`、`builder.step2()`，然后 `builder.get()` 拿结果，全程不知道 `Hamburger` 和 `FrenchFries` 内部是什么。

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
    // 👈 必填字段校验，漏了就在这里抛错，而不是运行时才炸
    if (!this.config.drugId) throw new Error('drugId required');
    if (!this.config.title) throw new Error('title required');
    return this.config as ReportConfig;
  }
}

// 用法：链式装配，可选字段想设就设、不想设就跳过
const config = new ReportConfigBuilder()
  .setTitle('药品说明书')
  .setDrugId('D001')
  .setShowWarning(true)
  .setFontSize(14)
  .setDate('2026-11-03')
  .build();
```

这一段里藏着建造者链式写法最核心的两个价值：

**价值一：链式调用的 `return this`。** 每个 `setXxx` 都返回 `this`（同一个 Builder），所以可以一路 `.setA().setB().setC()` 点下去。

**价值二：`build()` 里的必填校验。** 这是链式建造者相比「直接 `new`」最大的安全提升——必填字段（`drugId`、`title`）漏传，会在 `build()` 里立刻抛错，而不是等到后面某个地方用 `config.drugId` 时才炸出一个看不懂的 `undefined`。

顺带澄清一个前文（第 01 篇）埋过的点：**链式调用不违反迪米特法则（LoD）**。判据是「这条链上对象有没有换人」——`.setTitle().setDrugId()` 每次返回的都是同一个 `ReportConfigBuilder`，全程只有一个对象，所以不是 `a.b.c` 那种「穿越」多个对象。

> 💬 **面试官**：什么场景下选建造者而不是工厂？「参数超过 5 个就用建造者」这句话背后的真正判据是什么？
>
> ✅ 标准答案：当「对象本身很复杂、需要分步骤组装」时选建造者。具体有三个信号：① 参数很多（超过 4-5 个）；② 存在大量可选字段/参数；③ 构建过程有顺序或步骤约束（比如某些字段必须先设、某些互相依赖）。「参数超过 5 个」这句口诀，背后的真正原因是——**位置参数一旦超过 5 个，可读性和可维护性会断崖式下降**：调用方要记住每个位置的语义、要用 `undefined` 占位、漏传一个就整体错位。建造者把位置参数变成具名步骤 + 链式调用，彻底消除了这个问题。
>
> 🎁 加分答案：能补两点——① 建造者和工厂的区别不在「参数数量」这个表象，而在**变化维度**：工厂的变化维度是「有哪几种产品」，建造者的变化维度是「对象有哪些步骤/字段」。所以即使参数少，如果这些参数是「一组可变的组装步骤」，也可能用建造者；反过来参数多但如果是一次性、无可选、无顺序依赖的配置，也可以不用。② 能指出链式建造者「省略 Director」是现代前端的常见变体，以及 `build()` 里做必填校验是把「运行时错误」提前成「构造期错误」的关键设计。

---

## 五、易混淆辨析：四组必考对比

这一章是全系列「易混淆辨析」的延续，也是本篇面试考点最密集的地方。四组对比，每一组都对应至少一道面试原题。

### 简单工厂 vs 工厂方法

| 维度 | 简单工厂 | 工厂方法 |
| --- | --- | --- |
| 形态 | 一个函数 + `switch` | 抽象工厂 + 多个工厂子类 |
| 变化点位置 | 集中在工厂函数里 | 下沉到各个子类 |
| 新增产品 | 改工厂函数（加 case） | 只加子类 |
| OCP | 违反 | 遵守 |
| 代价 | 零额外类 | 每产品多一个工厂类 |

**本质区别在「新增产品时，改不改工厂代码」。** 简单工厂是「函数」，违反 OCP；工厂方法把变化点封装进子类，遵守 OCP。这一组，是全文最常被问、也最容易答错的第一道分水岭。

### 工厂方法 vs 抽象工厂

| 维度 | 工厂方法 | 抽象工厂 |
| --- | --- | --- |
| 针对对象 | 一个产品等级 | 多个产品族 |
| 创建方法数 | 一个 `createProduct()` | 一组 `createXxx()` |
| 关系 | —— | 包含多个工厂方法 |

**工厂方法针对「一个产品等级」，抽象工厂针对「多个产品族」**——抽象工厂里包含多个工厂方法。判断口诀：看工厂接口里**有几个创建方法**，一个就是工厂方法，一组就是抽象工厂。

### 建造者 vs 工厂

| 维度 | 工厂 | 建造者 |
| --- | --- | --- |
| 关心的问题 | 创建**哪种**对象 | **怎么**组装对象 |
| 返回方式 | 一次性返回完整对象 | 分步骤组装后返回 |
| 变化维度 | 产品类型 | 构建步骤 / 字段 |
| 典型场景 | 多种可替换的产品 | 一个复杂对象的多种配置 |

**工厂一次性返回完整对象（关心「创建哪种」），建造者分步骤组装（关心「怎么组装」）。** 参数超过 5 个且可选字段多时选建造者——但这句口诀背后的原因（位置参数的可读性塌方），已经在第四章讲透了。

### 抽象工厂 vs 建造者（补充辨析）

这一组大纲里没有单独列，但面试追问链里经常出现，值得补上：

| 维度 | 抽象工厂 | 建造者 |
| --- | --- | --- |
| 产出物 | 一整套**相关对象**（产品族） | 一个**复杂对象** |
| 变化的点 | 换「哪一套」产品 | 换「怎么拼装」的过程 |
| 典型场景 | 换一套 UI 主题（整套按钮/输入框/弹窗） | 生成一份报表（字段逐步装配） |

**判据**：如果你面对的是「**这套对象被换成另一套**」——比如整体切换 UI 主题、整体切换数据库方言，那是抽象工厂；如果你面对的是「**这个对象被逐步拼装出来**」——比如一步步填字段、一步步做可选配置，那是建造者。一个管「换套件」，一个管「拼单件」。

---

## 六、前端工程落地：那些你以为只是 API 的东西

把上面的抽象模式，落回你天天在写、却未必意识到它们背后是工厂/建造者的 API 上。

### React 的 createElement 与 createFactory

- **React `createElement` 是简单工厂**：内部按 `type` 决定创建什么样的 ReactElement。你在 JSX 里写的 `<div>`，编译后就是 `createElement('div', ...)`，React 内部再按 type 分发
- **React 早期的 `createFactory(type)` 是工厂方法**：`createElement.bind(null, type)` 把 `type` 提前固定，返回一个「专门创建某类元素」的工厂

Vue 的 `h()` 函数和 React 的 `createElement` 是同一件事——都是「按类型创建 VNode」的简单工厂。

### jQuery：同一个库里藏了两种模式

- **`$()` 是简单工厂**：根据 selector 类型决定返回什么样的对象
- **`$.ajax(options)` 是建造者**：`options` 对象分步骤装配（url、method、success、error……），内部按步骤组织

一个库里同时藏着工厂和建造者，说明这两者不是「选 A 就不能选 B」，而是各管一段。

### 查漏补缺：现代前端里更多的影子

结合这些年前端工程的常见实践，再补几个笔记里没有、但面试时能加分的观察：

- **依赖注入容器 / IoC 容器**，本质是「工厂 + 注册表」：`container.get('UserService')` 里，容器就是一个「按 key 查工厂、再 new 出来」的抽象工厂
- **表单 / 图表库的 schema 构建**：Zod 的 `z.object({...}).extend({...})`、ECharts 的 `option` 配置对象，都体现「配置即步骤、按需装配」的建造者思想——你装配的是一个「描述对象怎么做」的配置，而不是直接 `new`
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
- 工厂方法针对「一个产品等级」，抽象工厂针对「多个产品族」
- 追问「产品族和产品等级怎么区分」：产品族 = 一组必须一起用的相关对象（星巴克全套咖啡）；产品等级 = 同一产品在不同族里的对应物（美式这个等级有星巴克美式和瑞幸美式）

加分点：补上那个不对称——**加产品族容易（加一个具体工厂类）、加产品等级难（所有工厂类都要加方法）**，并说明这决定了抽象工厂的适用边界（产品族会变、产品等级稳定时最合适）。

---

## 💡 一张图总结（面试速记表）

| 模式 | 一句话内核 | 考察频率 |
| --- | --- | --- |
| 简单工厂 | 一个 switch 决定 new 谁；违反 OCP，非 GoF 23 种 | ⭐⭐⭐ 必考 |
| 工厂方法 | 「new 谁」下沉到子类；加产品只加子类，遵守 OCP | ⭐⭐⭐ 必考 |
| 抽象工厂 | 一次生产一整个产品族；加族容易、加等级难 | ⭐⭐⭐ 必考 |
| 建造者 | 分步骤组装复杂对象，构建与表示分离 | ⭐⭐⭐ 必考 |
| 简单工厂 vs 工厂方法 | 分水岭在「新增产品改不改工厂代码」 | ⭐⭐⭐ 必考 |
| 工厂方法 vs 抽象工厂 | 一个产品等级 vs 多个产品族；抽象工厂含多个工厂方法 | ⭐⭐⭐ 必考 |
| 建造者 vs 工厂 | 创建哪种 vs 怎么组装；参数超 5 个且可选多选建造者 | ⭐⭐⭐ 必考 |
| 抽象工厂 vs 建造者 | 换「一套相关对象」vs 拼「一个复杂对象」 | ⭐⭐ 高频 |
| 链式建造者 | `return this` 串步骤，`build()` 校验必填；不违反 LoD | ⭐⭐ 高频 |
| 前端落地 | `createElement`/`$()` 简单工厂，`createFactory` 工厂方法，`$.ajax` 建造者 | ⭐⭐ 高频 |

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

https://github.com/facebook/react/blob/main/packages/react/src/ReactElement.js （React `createElement` / `createFactory` 源码位置）

https://developer.mozilla.org/zh-CN/docs/Web/JavaScript （MDN，构造函数返回对象、`bind` 等语言机制参考）

《设计模式：可复用面向对象软件的基础》 Erich Gamma 等四人组著，1994（GoF 23 种模式的权威出处，工厂方法/抽象工厂/建造者的原始定义）

《JavaScript 设计模式与开发实践》 曾探 著（前端场景化讲解，中文资料首选）

> 推荐搜索关键词：「简单工厂 工厂方法 抽象工厂 区别」「工厂方法 开闭原则 OCP」「产品族 产品等级 抽象工厂」「建造者模式 工厂模式 区别」「建造者 链式调用 return this」「React createElement 简单工厂 createFactory 工厂方法」「jQuery 设计模式 简单工厂 建造者」。

---

> 🔖 这是「前端设计模式」系列第 04 篇。上一篇：《单例模式：从 ESM 模块缓存到全局状态管理（面试收藏级）》；下一篇预告：《原型模式：克隆创建对象，与 JS 原型链的本质区别》
