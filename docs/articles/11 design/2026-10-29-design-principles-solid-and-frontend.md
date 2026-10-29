# 设计原则：SOLID 五原则与前端落地场景（面试收藏级）

> **副标题**：所有设计模式都是 SOLID 原则的具体实现，脱离原则死记模式没有意义

> 面试官问：「说说 SOLID。」
>
> 你把五个英文全称流利地背了出来——单一职责、开闭、里氏替换、接口隔离、依赖倒置，一个字没漏。面试官点点头，追问了一句：「那举一个你在项目里违反过、后来又修复了的例子？」
>
> 你张了张嘴。脑子里闪过上周刚拆完的那个 2000 行组件，却发现自己说不清它违反的到底是哪一条，也说不清拆完之后为什么就「对了」。
>
> 背得出定义，和用得上原则，是两件事。这篇要补的，就是中间那一段：**把 SOLID 从五个名词，变成你判断代码好坏的五把尺子**。

---

## 🎯 这篇文章解决什么问题

第 00 篇解决了「看不懂图」的问题——你学会了用 UML 认出代码的形状。这一篇往下走一层，解决「看不懂形状背后为什么这么设计」的问题。

设计模式的知识结构其实是三层，很多人只学了最上面那一层：

```text
    ③ 23 种模式     ← 大多数人停在这里，背了一堆孤立的形状
         ↑
    ② SOLID 原则    ← 本篇：判断「为什么该这么设计」的标准
         ↑
    ① 面向对象机制   ← 四大特性：抽象 / 继承 / 封装 / 多态
```

这一篇要做三件事：

- **补地基**：抽象、继承、封装、多态四大特性。不讲清这四个机制，LSP 和 DIP 只能靠背——因为这两条原则管的就是「继承派生出来的子类型」和「依赖要朝向抽象」，机制都没搞明白，规范从何谈起
- **建尺子**：五条原则各自要解决什么矛盾、在前端长什么样、**以及什么时候不该用**
- **破误区**：DIP 不等于 DI、LSP 在 TS 里究竟体现为哪条编译规则、DRY 追求过头为什么会把代码改坏

全篇主线一句话：**代码变难改，是因为变化点没被圈住；SOLID 的每一条，都是在教你圈变化点。**

---

## 一、为什么你的代码越改越难改

先说一个可能让你意外的判断：**代码变难改，通常不是因为它「写错了」，而是因为它「写对了，但没有边界」。**

下面四个反例，你大概率都写过。这一节只提问题、不给答案——答案散在后面的章节里，最后再一起收口。

### 反例一：一个 2000 行的 UserProfile

```text
UserProfile.tsx  (约 2000 行)
├── 状态：user / formData / errors / loading / tabIndex ...（30+ 个 useState）
├── 副作用：3 个 useEffect，分别拉用户信息、拉订单、拉积分
├── 逻辑：表单校验规则约 200 行，全部内联在校验函数里
├── 逻辑：手机号脱敏、身份证脱敏、地址拼接，各写了一遍
└── 渲染：JSX 约 800 行，条件分支套了 5 层
```

这个组件「写错」了吗？没有。它跑得很好，上线一年没出过 bug。

但产品说「地址要支持海外格式」，你打开文件，滚了 40 屏才找到地址拼接那一行；测试说「校验规则想单独测」，你发现它压根没法单独导出——它闭包在组件内部，只认 `formData`。

**它的问题不是质量，是没有边界。** 数据请求、校验规则、脱敏工具、渲染布局——四件各自独立变化的事，被塞进了同一个变化容器里。

### 反例二：每加一种支付方式，就要改一次 handlePayment

```typescript
function handlePayment(order: Order, method: string) {
  if (method === 'alipay') {
    return alipaySdk.pay(order.amount);
  } else if (method === 'wechat') {
    return wechatSdk.pay(order.amount);
  } else if (method === 'balance') {
    return wallet.deduct(order.amount);
  }
  throw new Error('不支持的支付方式');
}
```

上个月接入了医保支付，你改了这个函数。这个月要接分期，你还得改它。

这个函数在过去一年里被改了 7 次，**每次改的原因都是「多了一种支付方式」**——同一个原因，反复打同一处代码。

### 反例三：useForm(options) 逼你传来路不明的字段

```typescript
// 组件库里 useForm 的签名
function useForm(options: {
  initialValues: Record<string, unknown>;
  validateRules?: Record<string, Rule[]>;
  persistKey?: string;      // 只有 20% 的表单需要本地草稿
  scrollToError?: boolean;  // 只有长表单需要
  analyticsId?: string;     // 只有埋点表单需要
}) { /* ... */ }
```

一个只有三个字段的搜索框，用这个 Hook 时也得把 `persistKey`、`scrollToError`、`analyticsId` 在心里过一遍：「我不传是不是就不生效了？」

**它把三个不相干的能力，捆进了同一个入口。**

### 反例四：组件直接 import axios

```typescript
import axios from 'axios';

export function DrugDetail({ id }: { id: string }) {
  const [drug, setDrug] = useState<Drug | null>(null);
  useEffect(() => {
    axios.get(`/api/drug/${id}`).then((res) => setDrug(res.data));
  }, [id]);
  return drug ? <DrugCard drug={drug} /> : <Skeleton />;
}
```

这个组件从此和 axios 焊死了。想换 fetch？要加统一的签名 header？想在单测里不碰网络？每一件事都得回到这个组件里改，或者用 `jest.mock('axios')` 这种绕过设计的手段去补。

### 四个反例，同一个病根

| 反例 | 表面现象 | 真正的病根 |
|------|---------|-----------|
| 2000 行组件 | 找不到代码、改不动、测不了 | 多个独立变化的原因共用一个容器 |
| handlePayment | 每次加支付方式都要动它 | 变化点没有被隔离到稳定边界之外 |
| useForm(options) | 调用方被迫了解用不到的能力 | 接口把无关能力捆在一起 |
| import axios | 换库、mock 都要改业务代码 | 高层业务直接依赖了低层实现 |

**这四个病根，正好对应 SOLID 里的四条。** 只有 LSP 没在这四个反例里出现——因为它管的是另一件事：不是「结构怎么分」，而是「分完之后，替换能不能成立」。这个问题放在第五章专门讲。

> 💬 **面试官**：你怎么判断一段代码需不需要重构？
>
> ✅ 标准答案：我看两个信号。第一是**改动的集中度**——如果过去半年里某个函数或组件的每一次修改，都来自同一个原因，说明它的职责没被切干净；第二是**改动的成本**——如果加一个简单需求要读 500 行代码才能确认不影响别处，说明依赖关系有问题。这两个信号背后是同一件事：变化点没有被识别和隔离。
>
> 🎁 加分答案：能补一句「重构不该等代码烂了才做」——有效的做法是在**第二次改同一个地方时**就停下来想：这两次改动的原因是不是同一类？如果是，说明这里已经形成了一个变化点，该在这一刻把它抽出去。我在后面讲「三次法则」时会细说为什么是第三次而不是第二次才动手：第二次可能只是巧合，第三次才是模式成立。

---

## 二、SOLID 的地基：面向对象四大特性

很多人会跳过这一节，直接从 SRP 开始背五条原则。但 SOLID 里有两条，你不懂这一节就永远答不到点上：

- **LSP** 讲的是「继承派生出来的子类型必须可替换」——继承机制不清，这句话就是空话
- **DIP** 讲的是「依赖方向要朝向抽象」——抽象是什么、怎么用，不懂就只能背结论

### OOA、OOD、OOP：三个容易混的阶段

面向对象不是一个「语言特性」，它是一套贯穿三个阶段的思维方式。软件开发实际经历分析和设计、编码三个阶段：

- **面向对象分析（OOA，Object Oriented Analysis）**：把业务世界里的事物抽象成对象——处方、药品、医生、订单
- **面向对象设计（OOD，Object Oriented Design）**：决定这些对象怎么组织、谁依赖谁、边界划在哪
- **面向对象编程（OOP，Object Oriented Programming）**：用类和对象把设计写成代码

一句话：**分析找对象，设计定关系，编程写实现。** SOLID 全部作用在中间那一步——OOD。

而 OOP 的本质，是把客观对象抽象成属性数据和相关操作，把内部细节和不相关的信息隐藏起来；把同类型的客观对象的属性数据和操作绑定在一起封装成类；并允许分成不同层次进行抽象，通过继承实现属性和操作的共享。**以类和对象作为组织代码的基本单位，并实现抽象、继承、封装、多态四个特性**——这四条，就是下面要逐一拆的。

### 抽象：隐藏实现，只暴露功能

抽象主要是隐藏方法的实现，让调用者只关心「有哪些功能」，而不是「功能怎么实现」。

它带来两个方向的价值：

- **修改实现不需要改变定义**：换掉底层实现，调用方一行不动
- **调用方不需要理解实现**：降低了使用者的认知负担

```typescript
interface IStorage {
  save(key: any, value: any): void;
  read(key: any): any;
}
```

`IStorage` 只声明了「能存、能取」两件事，没说是存到 `localStorage`、`sessionStorage`、IndexedDB，还是发到服务端。实现它的是一个具体类：

```typescript
class LocalStorage implements IStorage {
  save(key: any, value: any): void {
    console.log(key, value);
    localStorage.setItem(key, value);
  }
  read(key: any): any {
    console.log(key);
    return localStorage.getItem(key);
  }
}
```

然后业务对象只依赖接口，不依赖具体实现：

```typescript
class User {
  constructor(public name: string, public storage: IStorage) {}
  sava() {
    this.storage.save('userInfo', JSON.stringify(this));
  }
  read() {
    return this.storage.read('userInfo');
  }
}
```

```typescript
const user = new User('test', new LocalStorage());
user.sava();
const info = user.read();
console.log(info);
```

注意 `constructor(public name: string, public storage: IStorage)` 这一行——它就是这个例子的全部价值所在。`User` 不知道存储到底落在哪，它只认识 `IStorage`。想换成 sessionStorage、想换成内存 Mock 做单测，只需要在外面传一个不同的实现。

两个小提醒：原始例子里用的是 `any`，真实项目里应该换成具体类型（这个例子的重点在结构，不在类型）；另外 `sava()` 是笔误，原意是 `save()`，原样保留以便对照。

**这就是 DIP 的种子**，也是本章映射表里「抽象 → DIP」那一行的由来。

### 继承：从一般到特殊

继承是指这样一种能力：**它可以使用现有类的所有功能，并在无需重新编写原来的类的情况下对这些功能进行扩展。**

通过继承创建的新类称为「子类」或「派生类」，被继承的类称为「基类」「父类」或「超类」。继承的过程，就是从一般到特殊的过程。

要实现继承，可以通过「继承」（Inheritance）和「组合」（Composition）两种方式——这也是第九章的主题。

关键的分类在这里：**继承的实现方式有两类。**

- **实现继承**：直接使用基类的属性和方法而无需额外编码的能力
- **接口继承**：仅使用属性和方法的名称，但子类必须提供实现的能力

这个二分是后面两条原则的分水岭：`extends` 一个类是实现继承（复用代码），`implements` 一个接口是接口继承（只复用契约）。**LSP 管的是实现继承的正确性，DIP 管的是不要依赖实现继承的具体类。**

继承的目的有两个：

- 复用代码，减少类的冗余代码，减少开发工作量
- 使得类与类之间产生关系，为多态的实现打下基础

```typescript
// 继承主要实现代码逻辑的复用
class Animal {
  name?: string;
  constructor(name: string) {
    this.name = name;
  }
  eat() {
    console.log(`${this.name} eat`);
  }
}
const animal = new Animal('猫咪');
animal.eat();
```

```typescript
class Dog extends Animal {
  age?: number;
  constructor(name: string, age: number) {
    super(name);
    this.age = age;
  }
  speak() {
    console.log(`${this.name} is barking, it's ${this.age}  years old.`);
  }
}
const dog = new Dog('🐶', 6);
dog.eat();   // 继承来的
dog.speak(); // 自己加的
```

但继承有一个几乎所有教材都会提、却很少有人说清后果的代价：

> 过度使用继承或者说继承层次过深会导致代码可读性、可维护性变差，子类和父类高度耦合，修改父类的代码，会直接影响到子类

这句话在第九章会被完整展开（组合优于继承的五条理由）。这里先记住一个判断：**继承把两个类的生命周期绑在了一起**——父类改一次，所有子类都要跟着重新审视一遍。

### 封装：把数据和操作它的方法绑在一起

所谓封装，就是把客观事物封装成抽象的类，并且类可以把自己的数据和方法只让可信的类或者对象操作，对不可信的进行信息隐藏。

封装是面向对象的特征之一，是对象和类概念的主要特性。简单说，**一个类就是一个封装了数据以及操作这些数据的代码的逻辑实体。**

在对象内部，某些代码或数据可以是私有的，不能被外界访问。通过这些方式，对象对内部数据提供了不同级别的保护，防止程序中无关的部分意外改变或错误使用了对象的私有部分。

封装的目的：

- 可隐藏实体实现的细节
- 提高安全性，设定访问控制，只允许具有特定权限的使用者调用
- 简化编程，调用方无需知道功能是怎么实现的，即可调用

三种访问修饰符，就是封装的直接工具：

| 修饰符 | 可访问范围 |
|------|------|
| `public` | 类内部 + 子类 + 类外部，默认修饰符 |
| `protected` | 类内部 + 子类 |
| `private` | 仅类内部 |

```typescript
/**
 * 封装可以把类的内部属性隐藏起来，不让外部直接访问
 * 1.可以提供类易用性
 * 2.可以保护类的隐私
 */
class Bird {
  public name?: string;
  protected wing?: number;
  private weight?: number;

  constructor(_name: string, _wing: number, _weight: number) {
    this.name = _name;
    this.wing = _wing;
    this.weight = _weight;
  }
  print() {
    console.log(this.name, this.wing, this.weight);
  }
}
```

子类能拿到 `public` 和 `protected`，但拿不到 `private`：

```typescript
class WildGoose extends Bird {
  protected footer?: number;
  constructor(_name: string, _wing: number, _weight: number, _footer: number) {
    super(_name, _wing, _weight);
    this.footer = _footer;
  }
  getName() {
    return this.name;
  }
  getWing() {
    return this.wing;
  }
  // getWeight() {
  //   // Property 'weight' is private and only accessible within class 'Bird'.
  //   return this.weight;
  // }
  getFooter() {
    return this.footer;
  }
}
```

```typescript
const wildGoose = new WildGoose('🐦', 2, 8, 2);
console.log(wildGoose.getName());
console.log(wildGoose.getWing());
console.log(wildGoose.getFooter());
wildGoose.print();
```

那段被注释掉的 `getWeight()` 是本节的重点：**注释打开就会编译报错**——`Property 'weight' is private and only accessible within class 'Bird'`。这就是封装的边界在编译器层面的体现。

注意 `print()` 能访问 `this.weight`：**私有成员对「类的内部」开放，而不只是对「当前实例」开放**。所以同一个类的不同实例能互相访问私有字段——这是很多人误以为不可能的事。

### 多态：同一接口，不同实现

所谓多态，是指一个类实例的相同方法在不同情形下有不同表现形式。

多态机制使具有不同内部结构的对象可以共享相同的外部接口。这意味着，虽然针对不同对象的具体操作不同，但通过一个公共的类，它们（那些操作）可以通过相同的方式予以调用。

最常见的多态，就是把子类传入父类参数中——运行时调用父类方法时，通过传入的子类决定具体的内部结构或行为。

多态的目的：

- 一个外部接口可被多个同类使用
- 不同对象调用同个方法，可有不同实现

```typescript
abstract class Person {
  public name?: string;
  protected age?: number;
  private weight?: number;
  constructor(_name: string, _age: number, _weight: number) {
    this.name = _name;
    this.age = _age;
    this.weight = _weight;
  }
  abstract speak(): void;
}
```

```typescript
class Student extends Person {
  private money?: number;
  constructor(_name: string, _age: number, _weight: number, _money: number) {
    super(_name, _age, _weight);
    this.money = _money;
  }
  getName() {
    return this.name;
  }
  getAge() {
    return this.age;
  }
  getMoney() {
    return this.money;
  }
  // 不实现，会报以下错误
  // Non-abstract class 'Student' does not implement inherited abstract member 'speak' from class 'Person'.ts(2515)
  speak(): void {
    console.log('hello');
  }
}
const student = new Student('👩‍🎓', 19, 80, 2000);
console.log(student.getName());
console.log(student.getAge());
console.log(student.getMoney());
student.speak();
```

`abstract speak(): void` 这一行是「多态的契约」：父类规定了「必须有一个 `speak`」，但不定怎么实现；子类必须给出自己的版本，不给就编译不过（`ts(2515)`）。

**这个「父类定契约、子类管实现、调用方只认契约」的结构，就是下一章 LSP 要检验的对象。**

### 一张表，把四大特性和 SOLID 缝起来

到这里，四个机制讲完了。但它们只是「能力」，能力本身没有对错——用错了才产生坏代码。这张表是本节最重要的一张，它把「机制」和后面几章的「规范」接在了一起：

| 四大特性 | 它给你的能力 | 用歪了会变成什么 | 对应的原则 |
|------|------|------|------|
| **抽象** | 隐藏实现，只暴露契约 | 抽象画得太宽，把不相关的功能捆进一个接口 | **ISP 接口隔离** |
| **继承** | 代码复用 + 建立类型层次 | 父类一改子类全崩；层次过深不可读；子类偷偷改语义 | **LSP 里氏替换** |
| **封装** | 访问控制，保护内部状态 | 只封数据不封行为，外部靠 getter 拼业务逻辑 | **LoD 迪米特法则** |
| **多态** | 同一接口，不同实现 | 子类悄悄改变行为含义，调用方被坑 | **LSP + DIP** |

看过这张表，SOLID 里剩下的两条也就清楚了：**SRP 和 OCP 不讲机制，讲边界**——SRP 规定「一个变化原因配一个容器」，OCP 规定「变化要发生在容器之外」。

> 💬 **面试官**：封装、继承、多态，能各举一个前端里的例子吗？
>
> ✅ 标准答案：封装——一个 `useRequest` Hook 把 `loading`、`error`、`data` 三个状态封在内部，调用方只拿到 `{ data, loading, error, run }`，不需要知道内部用没用 `useState`、有没有做竞态处理。继承——`class ApiError extends Error`，复用 `Error` 的 `message`/`stack`，把 `name` 改成可区分的值。多态——一个 `renderChart(config)` 接收统一结构的 `config`，内部按 `type` 分派到不同渲染器，调用方只认 `config` 的形状。
>
> 🎁 加分答案：能主动说明「前端的多态主要不是靠继承实现的」。JS 是动态类型 + 结构类型，多态更多体现为**鸭子类型**：只要对象有 `getPrice()` 方法，它就能传给 `Customer.drink()`，是不是某个类的子类反而不重要。这正是 TypeScript 用结构类型判断兼容性（assignability）的根源——而结构类型兼容性检查，本质就是 LSP 的编译期实现，这是第五章要展开的重点。

---

## 三、SRP 单一职责原则：一个变化原因，一个容器

**全称**：Single Responsibility Principle

### 定义校正：大多数人背的那句是错的

先看一个常见的定义，它是对的：

> 其核心思想为：一个类，最好只做一件事，只有一个引起它的变化。一个类，最好有且仅有一个引起它变化的原因。

问题在于，很多人的记忆里只剩下了前半句「只做一件事」。

**「一件事」是个极其危险的说法**，因为「一件事」的粒度完全取决于你怎么看。一个 `UserProfile` 组件「只做渲染」算一件事吗？那它内部处理 30 个 useState 也算「只管渲染」。反过来，一个 `formatPhone` 函数「只做格式化」是绝对的单一职责吗？那它对手机号和身份证号分别格式化，是不是就变成两件事了？

Robert C. Martin 在后来多次澄清过，正确的表述是后半句：

> **一个类应该有且仅有一个引起它变化的原因（axis of change）。**

判据不在「它做了几件事」，而在「**有几种原因会让它变**」。

这个校正有实际后果：它把 SRP 从「越拆越好」的陷阱里救了出来。因为「一个变化原因」是可以数出来的——你去翻 git log，看这个文件过去被改过几次、每次改的 commit message 是什么，如果全是「新增支付方式」，那它就是单一职责；如果混着「改校验规则」「修 UI 样式」「加埋点」，那就是三个原因挤在一个容器里。

### 第一个例子：Product 和 Category

下面这个例子很短，短到容易被跳过，但它其实是 SRP 最纯粹的一次演示：

```typescript
class Product {
  public name?: string;
  public price?: number;
  // public categoryName?: string;
  // public categoryIcon?: string;
  public category?: Category;
  updateName(name: string) {}
  updatePrice(price: number) {}
  updateCategory(category: Category) {}
}
```

关键在于那两行注释掉的字段：`categoryName` 和 `categoryIcon`。

如果它们留在 `Product` 里，`Product` 就有了两个变化原因：**商品信息本身的变动**（改名、改价），和**分类展示形态的变动**（分类改叫法、图标换风格）。第二件事和商品毫无关系——所有商品都要跟着改。

抽出来一个 `Category`：

```typescript
class Category {
  public categoryName?: string;
  public categoryIcon?: string;
}
```

现在分类要加「父分类 id」，只改 `Category`，`Product` 一行不动。**这就是「一个变化原因，一个容器」在最小尺度上的样子。**

### 前端的主战场：把 2000 行组件拆开

回到第一章的反例一。那个 `UserProfile` 里其实住着四个不同的变化原因：

```text
UserProfile.tsx 里的四个变化原因
├── 接口变了（加字段、改分页）              → 数据层
├── 校验规则变了（手机号规则、实名要求）      → 校验层
├── 展示形态变了（改版、改配色、改布局）      → 视图层
└── 埋点需求变了（加曝光、加点击）           → 副作用层
```

拆法不是按「代码行数切三段」，而是**按变化原因切**：

```typescript
// 1. 数据：只管「取什么、什么时候取」
function useUserDetail(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    fetchUser(userId).then(setUser).finally(() => setLoading(false));
  }, [userId]);
  return { user, loading };
}
```

```typescript
// 2. 校验：只管「什么算合法」，纯函数，天然可单测
const rules = {
  phone: (v: string) => /^1[3-9]\d{9}$/.test(v) || '手机号格式不正确',
  idCard: (v: string) => /^\d{17}[\dXx]$/.test(v) || '身份证格式不正确',
};
export function validateProfile(form: ProfileForm) {
  return Object.entries(rules)
    .map(([key, rule]) => rule(form[key as keyof ProfileForm]))
    .filter((msg) => msg !== true);
}
```

```typescript
// 3. 视图：只管「长什么样」，不碰请求也不碰校验
export function UserProfileView({ userId }: { userId: string }) {
  const { user, loading } = useUserDetail(userId);
  if (loading) return <Skeleton />;
  return <ProfileCard user={user} />;
}
```

拆完之后的收益是具体的：

- **校验规则可以单独测**——`validateProfile` 是纯函数，喂一个对象进去断言返回值，不用 render 组件、不用 mock 网络
- **接口字段变了只改 `useUserDetail`**——视图层不感知
- **改版只改视图**——不会不小心碰坏校验

🔧 **真实场景**：一个药品详情页组件从 1800 行拆成 `useDrugDetail`（数据）、`useDrugAuth`（处方药权限判定）、`DrugDetailView`（渲染）三层后，最直接的变化是**修 bug 的平均耗时从半天降到一小时**——因为定位问题时可以先判断「是数据不对、是权限判断不对、还是渲染不对」，一次就砍掉两个方向。

### SRP 的边界：什么时候不该拆

这是本篇第一个「什么时候不该用」，也是 5-10 年经验的工程师和初级工程师最明显的分界。

**SRP 的粒度是相对的，取决于变化频率是否一致。**

判断方法：如果两个「职责」总是同时变、由同一个人改、改的原因也一样——那它们本质是**同一个变化原因**，分开反而是负担：

- 文件爆炸：一个 300 行的模块被拆成 12 个文件，每个 20 行
- 跳转成本：读一个完整流程要在 12 个文件之间来回跳，IDE 的 `Go to Definition` 按到手酸
- 抽象泄漏：拆得太细，边界反而模糊——到底该放 A 还是放 B，每次都要想

一个实用的反例：**把 `formatPhone` 拆成 `formatPhoneAreaCode` + `formatPhoneBody` + `formatPhoneSuffix`**。这三段永远一起变（运营商规则一变三个都变），拆开只是把一行代码变成三个文件。

正确的心智模型是：**SRP 不是「拆到最小」，是「拆到变化频率一致」**。同一个变化原因里的代码，就该放在一起；不同变化原因的代码，就该分开。

这条边界会在第十章 YAGNI 那里再回收一次——因为「我就想着以后可能要复用，先拆开」是同一个陷阱的另一种形态。

> 💬 **面试官**：单一职责原则里，「职责」到底指什么？是一个类只做一件事吗？
>
> ✅ 标准答案：不是。「只做一件事」这个说法有歧义，因为「一件事」的粒度无法界定。SRP 的准确表述是「一个类应该只有一个引起它变化的原因」（axis of change）。判断一个类是否违反 SRP，看的不是它有多少行、调了多少个方法，而是看**有几种不同的原因会导致它被修改**。如果「改接口字段」和「改展示样式」都会改到同一个类，那就是两个变化原因，违反 SRP。
>
> 🎁 加分答案：能补三点——① SRP 是**相对**的，取决于系统当前的关注点。同一个类在 A 系统里是单一职责，在 B 系统里可能不是，因为两个系统里「什么会变」不一样；② 判断手段可以很具体：翻 git log 看这个文件被改的原因有几类，比凭感觉判断可靠；③ 过度拆分会带来文件爆炸和跳转成本，**SRP 的正确目标是「变化频率一致的代码放在一起」，不是「越小越好」**——这一点最容易被背定义的人忽略。

---

## 四、OCP 开闭原则：把变化点推到边界之外

**全称**：Open-Closed Principle

### 定义：软件实体应该对扩展开放，对修改关闭

常见的表述是：

> 其核心思想是：软件实体应该是可扩展的，而不可修改的。一个类，可以扩展（添加属性和功能），但是不要修改已经写好的属性和方法。

这句话听起来像一个理想主义的教条——「代码写完了就不许改」？不现实。

所以它的真正含义必须翻译一下：

> **对扩展开放** = 新增一种行为时，你可以加新代码
> **对修改关闭** = 但你不必改动、也不该改动已经跑通的老代码

关键词是「**不必**」而不是「不许」。它的收益非常具体：**老代码不用改，就不用重新测老功能。**

### 核心对照：从 switch 到 discount

经典教材里有一组最直接的「不合理设计 → 合理设计」对照。先看反例：

```typescript
class Customer {
  constructor(public rank?: string) {}
}
```

```typescript
class Product {
  constructor(public name: string, public price: number) {}
  // 不同的客户有不同的等级，普通会员，VIP会员，普通顾客
  cost(customer: Customer) {
    switch(customer.rank) {
      case 'member':
        return this.price * .8;
      case 'vip':
        return this.price * .6;
      default:
        return this.price;
    }
  }
}
```

```typescript
const product = new Product('笔记本', 10000);
const c1 = new Customer('member');
const c2 = new Customer('vip');
const c3 = new Customer();
console.log(`普通会员价格：`, product.cost(c1));
console.log(`VIP会员价格：`, product.cost(c2));
console.log(`普通顾客价格：`, product.cost(c3));
```

这段代码的病灶在哪？不在 `switch` 语法本身。病在**折扣规则这个变化点，被放进了 `Product` 这个不该关心折扣的类里**。

折扣是「客户等级」的属性，商品价格是「商品」的属性。现在它们被强行放在一起判定，于是——

- 新增「超级 VIP 打 5 折」，要改 `Product.cost`
- 调整 VIP 折扣从 6 折改 65 折，还要改 `Product.cost`
- 促销活动期间临时改规则，还得改 `Product.cost`

**每次改动，都要重新回归测试「商品定价」这件跟折扣毫无关系的事。**

合理设计把折扣这个变化点移回它该在的地方：

```typescript
class Customer {
  constructor(public rank?: string, public discount: number = 1) {}
}
```

```typescript
class Product {
  constructor(public name: string, public price: number) {}
  // 不同的客户有不同的等级，普通会员，VIP会员，普通顾客
  cost(customer: Customer) {
    return this.price * customer.discount;
  }
}
```

```typescript
const product = new Product('笔记本', 10000);
const c1 = new Customer('member', 0.8);
const c2 = new Customer('vip', 0.6);
const c3 = new Customer();
const c4 = new Customer('superVip', 0.5);
console.log(`普通会员价格：`, product.cost(c1));
console.log(`VIP会员价格：`, product.cost(c2));
console.log(`普通顾客价格：`, product.cost(c3));
console.log(`SuperVip会员价格：`, product.cost(c4));
```

看 `c4` 那一行——**新增了一种客户等级，`Product` 的代码一个字都没改**。`cost()` 从「一个需要不断维护的规则表」，变成了一个「永远正确的乘法」。

这就是 OCP 的完整闭环：对扩展开放（可以传入任何折扣），对修改关闭（`cost()` 不用改）。

### 第二个例子：axios 拦截器

再看一段 axios 代码，它展示的是同一个思维的另一种形态：

```typescript
import axios from 'axios';

const instance = axios.create();

instance.interceptors.request.use((config: Record<string, any>) => {
  if(config?.url?.startWith('http')) {
    config.url = `http://localhost:3000`;
  }
  return config;
});

instance.interceptors.response.use(res => {
  if(res.status !== 200) {
    return Promise.reject(res);
  }
  return res.data;
});

instance({
  url: '/api/user',
}).then(res => {
  console.log(res);
}, error => {
  console.log(error);
});
```

（原代码里 `startWith` 是 `startsWith` 的笔误，原样保留。）

想给每个请求加签名 header、加 loading、加错误上报——你可以**一行不改 axios 源码**，只是往 `interceptors` 里再 `use()` 一个函数。

**为什么 axios 能做到这一点？** 因为它把「请求处理流程」这个变化点，做成了一个可以挂载任意中间件的**开放链表**。它不预判你会加什么，只保证「挂进来的东西会按顺序被执行」。

这正是 OCP 的本质，也是它和 SRP 的关系：**SRP 负责把变化点圈出来，OCP 负责让这个圈子能从外面往里加东西。**

### OCP 的本质：把变化点推到稳定边界之外

如果把这一章压缩成一句话：

> **OCP 不是「不许改代码」，而是「把会变的部分推出稳定的容器，让它成为容器的输入」。**

用一张图看这两个例子的同构性：

```text
             变化点                稳定容器              扩展方式
────────────────────────────────────────────────────────────────
折扣规则  ──────────▶  Customer.discount  ──────▶  传不同的 discount
支付方式  ──────────▶  策略注册表 Map      ──────▶  注册新的策略
请求处理  ──────────▶  axios 拦截器链     ──────▶  use() 新拦截器
校验规则  ──────────▶  rules 对象         ──────▶  加一个 key
```

四行是同一件事：**先把变化点从容器里剥出来，再让容器通过一个统一入口接收变化。**

这个思维一旦建立，你在看到任何 `switch`、任何连续三层 `if-else`、任何「加一种类型就改这一处」的代码时，都会本能地去找「这个变化点本来属于谁」。

### OCP 的边界：100% 的开闭不可能实现

本篇第二个「什么时候不该用」。

Robert Martin 自己说过一句很重要的话：**没有人能对所有的变化都做到 OCP，我们能做的只是对「已经预见到」的变化做 OCP。**

如果你的预计错了（预判了一个永远不会来的需求），那你付出的抽象成本就是纯亏损：

- 抽象出来的策略层没人用过第二次，只是一层无谓的间接
- 为了「方便扩展」加的配置项，五年都是默认值
- 抽象把自己套死的场景：需求变了，但你的扩展点设计错了方向，反而比不抽象更难改

所以 OCP 的正确用法是配合「三次法则」（第十章会讲）：

- **第一次**写 if-else：直接写，别想太多
- **第二次**加一个分支：还是直接加
- **第三次**再加：这时候变化点已经被证实是真实存在的了，抽它

代码里唯一值得无条件做 OCP 的，是那些**边界清晰、变化已知、影响面大**的地方——请求层（拦截器）、状态层（reducer）、插件体系（middleware）。其他地方，先让它简单。

> 💬 **面试官**：开闭原则和策略模式是什么关系？
>
> ✅ 标准答案：策略模式是开闭原则最直接的一种落地方式。策略模式的三个角色——Context（持有策略）、Strategy（策略接口）、ConcreteStrategy（具体实现）——正好对应 OCP 的三个要素：Context 是对修改关闭的稳定部分，Strategy 是对扩展开放的接口，ConcreteStrategy 是可以无限新增而不影响原有代码的扩展点。所以设计模式不是「另一种知识」，它就是原则在具体结构上的投影。
>
> 🎁 加分答案：能补两点——① 策略只是其中一种落地，OCP 还有别的形态：装饰器（不改原函数、外层包装加能力）、工厂方法（新增产品只加子类）、观察者（新增响应逻辑不用改状态产生方）、拦截器（axios 的 `interceptors.use`），它们共享同一个结构——**一个稳定容器 + 一个可插拔的扩展点**；② 要指出 100% 的 OCP 不可能，只对「已预见且高频」的变化点做关闭，否则违反 YAGNI——这一句是面试里区分「背过定义」和「真用过」的分水岭。

---

## 五、LSP 里氏替换原则：子类凭什么能替父类

**全称**：Liskov Substitution Principle

这是本篇最重的一节。前两条原则讲「怎么分」，这一条讲「**分完之后，替换成不成立**」——而它的正确答案在 TypeScript 类型系统里，比大多数教程讲得深一层。

### 定义：一句被引用了 30 年的话

常见的表述是：

> 其核心思想是：子类必须能够替换其基类。类 A 是类 B 的父类，那么在进行调用的时候，类 A 可以引用类 B，但是反过来不行。其实可以粗糙地理解为，类 A 就是对外提供一个接口，具体的实现在类 B 中。

这个说法抓住了直觉，但漏掉了最关键的一半。Liskov 本人在 1987 年的原始表述是：

> 如果对每一个类型为 S 的对象 o1，都有类型为 T 的对象 o2，使得以 T 定义的所有程序 P 在所有的对象 o2 都替换成 o1 时，程序 P 的行为没有发生变化，那么 S 是 T 的子类型。

翻译成人话：**子类不是「能编译通过」，而是「替换之后行为不变」。**

「能编译通过」是类型检查层面的事，TypeScript 会帮你做（而且做得并不完备，这是本章后半部分的内容）。「行为不变」是语义层面的事，**编译器管不了，只能靠人守**。

这就是为什么那句注释值得单独拎出来：

```typescript
// 里式替换原则可以替换，任何可以使用父类的地方，否可以使用子类
// 里式替换原则是一个原则，要求子类不能违反父类的功能和规定
```

**「要求子类不能违反父类的功能和规定」——这一句才是 LSP 的全部重量。**

### 正例：Drink 与 Customer

先看一个正确使用 LSP 的例子：

```typescript
/**
 * 尽可能使用父类或者抽象类
 * 任何在能使用父类的地方都要可以使用子类
 * 多态有关
 */
abstract class Drink {
  abstract getPrice(): number;
}

class CocaCola extends Drink{
  getPrice(): number {
    return 3;
  }
}

class Sprite extends Drink{
  getPrice(): number {
    return 4;
  }
}

class Fanta extends Drink{
  getPrice(): number {
    return 5;
  }
}
```

```typescript
class Customer {
  drink(drink: Drink) { // 这里要使用抽象类或接口
    console.log(drink.getPrice());
  }
}

// 里式替换原则可以替换，任何可以使用父类的地方，否可以使用子类
// 里式替换原则是一个原则，要求子类不能违反父类的功能和规定
const c = new Customer();
c.drink(new CocaCola);
c.drink(new Sprite);
c.drink(new Fanta);

export default Customer;
```

![LSP：Customer 依赖抽象的 Drink，任何子类都能传入](https://cdn.nlark.com/yuque/0/2021/png/738210/1638446878965-a5085e08-a91e-4a6a-9fb3-6e2a2f17d20f.png)

`Customer.drink` 的参数类型是 `Drink` 这个抽象类。三个子类都能传进来，而且**行为符合预期**——每个 `getPrice()` 都返回一个价格，`console.log` 都能正常打印。

这是 LSP 成立的形态。但注意：**它成立是因为「三个子类都老老实实返回了一个价格数字」，而不是因为「它们都 extends 了 Drink」。** 类型关系只是必要条件，行为一致才是充分条件。

下面看反例。

### 反例：正方形继承矩形

这是 LSP 领域最著名的一个反例，几乎每篇讲 LSP 的文章都会提，但很多只提了「违反」，没解释「为什么这是根本性的问题」。

```typescript
class Rectangle {
  constructor(protected width: number, protected height: number) {}
  setWidth(w: number) { this.width = w; }
  setHeight(h: number) { this.height = h; }
  getArea() { return this.width * this.height; }
}
```

正方形「是一种」矩形，所以直觉上应该能继承：

```typescript
class Square extends Rectangle {
  setWidth(w: number) {
    this.width = w;
    this.height = w;  // 为了保持正方形，高度必须跟着变
  }
  setHeight(h: number) {
    this.width = h;
    this.height = h;
  }
}
```

现在有一个 `Rectangle` 的客户端代码，它按「矩形的语义」写：

```typescript
function resize(rect: Rectangle) {
  rect.setWidth(5);
  rect.setHeight(4);
  // 矩形的语义：宽 5、高 4，面积应该是 20
  const area = rect.getArea();
  if (area !== 20) throw new Error(`期望 20，实际 ${area}`);
}

resize(new Rectangle(1, 1));  // ✅ 通过，面积 20
resize(new Square(1, 1));     // ❌ 抛错：期望 20，实际 16
```

`Square` 完全能编译通过，能通过类型检查，但**行为崩了**。

问题的根源在哪？在于 `Square` 为了满足自己「四条边相等」的不变量，**违背了父类的一条隐含约定**：`setWidth` 只影响宽度，不改高度。这条约定从来没有写在类型签名里，但它写在所有调用者的假设里。

**这就是 LSP 的要害：真正的契约，大部分不在签名里，而在调用者的假设里。**

### 四大行为契约：LSP 的可操作判据

把上面那个反例抽象一下，就是 LSP 的四条行为契约。记住这四条，比记住「子类必须能替换父类」有用得多：

| 契约 | 含义 | 反例中的体现 | 前端常见的违反 |
|------|------|------|------|
| **前置条件不能加强** | 父类接受的输入，子类必须也接受 | — | 父类 `save(data)` 不校验，子类却抛错「data 不能为空」 |
| **后置条件不能减弱** | 父类承诺的输出，子类必须也保证 | — | 父类 `getUser()` 保证返回对象，子类可能返回 `null` |
| **不变量必须保持** | 父类成立的性质，子类也必须成立 | `Square` 破坏了「setWidth 不改 height」 | 父类保证「数组长度不变」，子类过滤了元素 |
| **异常不能放宽** | 父类只抛 `Error`，子类不能抛更多种类 | — | 父类不抛异常，子类抛 `NetworkError` |

用这四条回看 `Square`：它违反的是**不变量**那条——`Rectangle` 的不变量是「`setWidth` 与 `setHeight` 互不影响」，`Square` 破坏了它。

**这四条契约之所以重要，是因为它们全都无法被编译器检查。** 你写 `class Square extends Rectangle` 时，TS 只会检查方法签名对不对，不会检查语义。

### TypeScript 里 LSP 体现在哪：协变与逆变

现在进入本节的核心。面试官问「LSP 在 TS 里体现在哪」，如果只能答「子类可以赋给父类」，只能算及格。

真正的答案是：**TypeScript 的类型兼容性检查（assignability），就是 LSP 在编译期的实现。**

TypeScript 用的是**结构类型系统**：判断 `A` 能不能赋给 `B`，不看 `A` 是不是 `B` 的子类，而看 `A` 的结构是不是包含了 `B` 要求的所有成员。

```typescript
interface Drink { getPrice(): number; }

class CocaCola { getPrice() { return 3; } }

const d: Drink = new CocaCola();  // ✅ 没写 extends / implements，照样能赋
```

`CocaCola` 没有 `implements Drink`，但它有 `getPrice(): number`，所以在结构上它就是 `Drink` 的子类型。这正是第 00 篇说的「**结构类型是多态的语言层实现**」。

但结构比较的规则，在不同位置上**方向是相反的**。这就是协变和逆变。

### 返回值协变：子类型的返回值可以是更具体的类型

```typescript
type Producer<T> = () => T;

class Animal { name = 'animal'; }
class Dog extends Animal { bark() { console.log('woof'); } }

const makeAnimal: Producer<Animal> = () => new Animal();
// ✅ 返回值更具体，安全
const makeDog: Producer<Dog> = () => new Dog();

const p: Producer<Animal> = makeDog;  // ✅ 允许
// 调用方期待拿到 Animal，实际拿到 Dog——Dog 也是 Animal，安全
```

为什么安全？因为调用方拿到 `Dog` 之后，只会按 `Animal` 的方式用（调 `name`），`Dog` 支持这套用法。**返回值方向是「多给一点没关系」。**

这就是**协变（covariant）**：`Dog` 是 `Animal` 的子类型，那么 `Producer<Dog>` 也是 `Producer<Animal>` 的子类型——子类型关系方向一致。

### 参数逆变：子类型的参数必须是更宽的类型

现在把位置换成参数，方向就反了：

```typescript
type Consumer<T> = (value: T) => void;

const takeAnimal: Consumer<Animal> = (a) => console.log(a.name);
const takeDog: Consumer<Dog> = (d) => d.bark();

const c: Consumer<Dog> = takeAnimal;  // ✅ 允许：参数更宽
// const c2: Consumer<Animal> = takeDog;  // ❌ 报错：参数更窄
```

为什么 `takeAnimal` 能当 `Consumer<Dog>` 用？因为调用方只会喂 `Dog` 进来，而 `takeAnimal` 能接受任何 `Animal`（包括 `Dog`），所以安全。

反过来，`takeDog` 不能当 `Consumer<Animal>` 用，因为调用方可能喂一个 `Cat` 进来，而 `takeDog` 里会调 `d.bark()`——`Cat` 没有 `bark`，运行时炸。

这就是**逆变（contravariant）**：`Dog` 是 `Animal` 的子类型，但 `Consumer<Animal>` 才是 `Consumer<Dog>` 的子类型——子类型关系方向相反。

一句话记住方向：

```text
返回值位置：协变（方向一致）  Producer<Dog> ⊆ Producer<Animal>
参数位置：  逆变（方向相反）  Consumer<Animal> ⊆ Consumer<Dog>
```

**为什么参数必须逆变？** 因为 LSP 的「前置条件不能加强」这条契约。子类型能接受的输入必须**至少和父类型一样宽**——收窄输入范围，就是把前置条件加强了，调用方合法传入的东西会被拒绝，替换就崩了。

**返回值协变对应的是「后置条件不能减弱」**：子类型承诺的输出必须**至少和父类型一样强**——返回一个更具体的类型，是加强后置条件，安全；返回 `Animal | null`，是减弱，不安全。

**协变和逆变不是 TypeScript 的发明，它们是 LSP 在类型系统里的数学必然。** 这是本节最重要的一句话。

### 数组协变：TS 主动放弃的安全

TypeScript 有个著名的不安全之处——数组是协变的：

```typescript
class Animal { name = 'animal'; }
class Dog extends Animal { bark() {} }

let dogs: Dog[] = [new Dog()];
let animals: Animal[] = dogs;      // ✅ TS 允许
animals.push(new Animal());        // 💥 dogs 里混进了一个不是 Dog 的东西

console.log(dogs.length);                       // 2
console.log(typeof (dogs[1] as any).bark);      // "undefined" —— 它没有 bark
```

这段代码在 `strict` 下**一行错都不报**。我实际跑了一遍，输出确认：

```text
dogs.length = 2 | 第2项有 bark 吗: undefined
```

`dogs` 名义上还是 `Dog[]`，但第 2 项是一个 `Animal`——只要后面某处循环调用 `d.bark()`，就炸了。

按上一条规则，数组的 `push` 参数在逆变位置、读取在协变位置，所以 `Dog[]` 赋值给 `Animal[]` **本应是错误的**（就像 `Consumer` 那样）。

但 TypeScript 允许了。为什么？因为如果按严格逆变，`Dog[]` 不能赋给 `Animal[]`，会让几乎所有真实的 JS 代码报错——这是**为了实用性做的妥协**，社区里管这叫 TS 的 unsoundness（不健全性）。

所以记住：**TS 的数组协变是一个已知的、有意识的不安全**。它不是 LSP 错了，是编译器选择不检查这一处。

### 方法参数双变：又一个妥协

更微妙的一处是方法（method）和函数类型（function type）的规则不一样：

```typescript
interface IBase {
  handle: (a: Animal) => void;   // 函数属性写法
}

interface ISub extends IBase {
  handle: (a: Dog) => void;      // ❌ 报 TS2430：参数收窄，不兼容
}
```

对照方法写法：

```typescript
class Base {
  handle(a: Animal) {}   // 方法写法
}

class Sub extends Base {
  handle(a: Dog) {}      // ⚠️ TS 默认放行，不报错
}
```

同样一个「参数收窄」，写成函数属性报 `TS2430`，写成方法却不报错。这两段的编译结果我都实际验过。

原因是 TypeScript 的设计者觉得**方法在 JS 里太常用**，严格检查会让大量已有代码（尤其是继承 `EventEmitter`、`React.Component` 这类库）产生海量错误，于是对方法参数采用了**双变（bivariance）**——参数既允许协变也允许逆变，两个方向都放过。

这个妥协的代价可以实测：`Sub` 的 `handle` 只认识 `Dog`，但因为它能被当成 `Base` 用，调用方可以合法地传一个 `Animal` 进去——

```typescript
const b: Base = new Sub();
b.handle(new Animal());   // 编译通过，运行时：a.bark is not a function
```

**编译期一句警告都没有，运行时直接炸。** 这就是 LSP 在类型系统里被放弃的那一格。

所以 `strictFunctionTypes` 这个编译选项管的到底是什么？说清楚它，比只说「打开严格模式」专业得多：

| 场景 | `strictFunctionTypes: false` | `strictFunctionTypes: true` |
|------|------|------|
| 函数类型的参数（箭头函数属性） | 双变（放过） | **逆变（严格检查）** |
| 方法的参数 | 双变 | **双变（仍然放过）** |
| 构造函数参数 | 双变 | **双变（仍然放过）** |

也就是说：**打开 `strictFunctionTypes` 也管不了方法的参数位置。** 这是一个很多人不知道的细节——他们以为开了严格模式就万事大吉。

### 小结：TS 能替 LSP 守住的，和守不住的

| LSP 契约 | TS 是否能检查 |
|------|------|
| 方法签名兼容 | ✅ 能（结构类型比较） |
| 参数逆变（前置不能加强） | ⚠️ 只能检查函数类型，方法参数放过 |
| 返回值协变（后置不能减弱） | ✅ 能，但 `any` 和数组协变会绕过 |
| 不变量保持 | ❌ 完全不能 |
| 异常不放宽 | ❌ 完全不能（TS 不检查 throw） |
| 语义行为一致 | ❌ 完全不能 |

**最后三行是这张表的重点。** 它们说明：TypeScript 的类型系统只能替你守住 LSP 的**形状**，守不住 LSP 的**语义**。`Square extends Rectangle` 那类问题，编译器永远不会告诉你，只有调用者会在线上告诉你。

> 💬 **面试官**：里氏替换原则在 TypeScript 的类型系统里体现在哪里？
>
> ✅ 标准答案：体现在类型兼容性检查（assignability）上，具体是协变和逆变两条规则——返回值位置是协变的，子类型可以返回更具体的类型（`Producer<Dog>` 可以赋给 `Producer<Animal>`），这对应「后置条件不能减弱」；参数位置是逆变的，子类型必须接受更宽的类型（`Consumer<Animal>` 才能赋给 `Consumer<Dog>`），这对应「前置条件不能加强」。TypeScript 的结构类型系统把这些做成了编译期检查，所以 LSP 在 TS 里不只是口头约定，一部分被编译器强制了。
>
> 🎁 加分答案：能补三点——① TS 在这个规则上有两处**有意识的不健全**：数组是协变的（`Dog[]` 能赋给 `Animal[]`，之后 `push` 一个 `Animal` 就污染了），方法参数是双变的（`strictFunctionTypes` 只对函数类型生效，管不到方法参数位置）；② 所以 LSP 里真正难守的是**行为契约**部分——不变量、异常、副作用，编译器一律不管。`Square extends Rectangle` 能完美通过类型检查，运行时行为却是错的；③ 结论是：TS 的类型检查能守住 LSP 的**形状**，守不住 LSP 的**语义**，语义只能靠代码审查和测试守。

🔧 **真实场景**：一个组件库里 `BaseModal` 定义了 `onConfirm: () => Promise<void>`，约定是「确认后由 Modal 内部负责关闭弹窗」。后来 `ConfirmDeleteModal extends BaseModal` 在 `onConfirm` 里自己调了 `close()`，导致业务方在 `onConfirm` 里也调 `close()` 时重复关闭、动画闪烁。类型检查完全通过——因为签名一模一样。**这就是 LSP 的语义契约被违反，而编译器毫无感知的真实例子。** 排查花了两天，最后靠把「关闭由内部负责」写成 `BaseModal` 的类型注释 + 加一条单测才止住。

---

## 六、DIP 依赖倒置原则：高层和低层都朝抽象看

**全称**：Dependency Inversion Principle

### 定义：倒置，到底倒在哪

准确的表述是：

> 其核心思想是：依赖于抽象。具体而言就是高层模块不依赖于底层模块，二者都同依赖于抽象；抽象不依赖于具体，具体依赖于抽象。

关键词是「**倒置**」。要理解它，得先看没倒置之前是什么样。

**传统分层结构**里，依赖是单向向下的：

```text
      业务逻辑（高层）
           │  依赖
           ▼
      具体数据库驱动（低层）
```

高层写死了低层。想换数据库？业务代码要改。想在单测里不连数据库？做不到。

DIP 把它「倒」过来：

```text
      业务逻辑（高层）            具体数据库驱动（低层）
           │  依赖                        │  依赖
           └──────────▶ 接口 ◀───────────┘
                     （抽象）
```

两边都朝中间的抽象看。换实现不影响业务，因为业务根本不知道实现是谁。

**这个「倒置」带来的最关键收益是：依赖方向被反转了。** 原本是「高层依赖低层」，现在变成「高层和低层都依赖抽象」——而抽象是由**高层**定义的（因为高层才知道自己需要什么能力）。于是控制权从低层回到了高层，这就是「倒置」二字的真实含义。

还有一句很好的补充，讲的是怎么找抽象：

> 在对客观事物抽象成逻辑实体时，可以先思考，同类事物的共性是什么，将这个共性作为这类事物的「高层模块」，若干不同的客观事物作为「底层模块」在依赖「高层」之后，对共性进行特定描述。举个栗子，苹果跟西瓜都是水果，水果的共同属性是水分、糖分。在这里，「水果」作为高层模块，其属性可以在描述「苹果」和「西瓜」的时候使用，所以「苹果」「西瓜」在此是「底层模块」。

### 例子：GirlFriend 接口

看一个拟人化的例子，但结构是标准的：

```typescript
/**
 * 依赖抽象，而非依赖具体的实现
 */

interface GirlFriend {
  age: number;
  height: number;
  cook(): void;
}
```

两个具体实现：

```typescript
class LinZhiLing implements GirlFriend {
  public age: number = 35;
  public height: number = 178;
  cook(): void {
    console.log('cook !');
  }
}
class YangMi implements GirlFriend {
  public age: number = 30;
  public height: number = 168;
  cook(): void {
    console.log('cook ?');
  }
}
```

```typescript
class SingleDog {
  girlFriend?: GirlFriend;
  constructor(g: GirlFriend) {
    this.girlFriend = g;
  }
}

const d1 = new SingleDog(new LinZhiLing());
const d2 = new SingleDog(new YangMi());
d1.girlFriend?.cook();
d2.girlFriend?.cook();
export default SingleDog;
```

![DIP：SingleDog 依赖 GirlFriend 接口，而不依赖任何具体实现](https://cdn.nlark.com/yuque/0/2021/png/738210/1638448974498-29fe6719-bd6e-423b-8883-48d058af6fab.png)

结构上要看清两件事：

- `SingleDog` 的字段类型是 **`GirlFriend`（接口）**，不是 `LinZhiLing` 或 `YangMi`
- 具体实现从**构造函数注入**，`SingleDog` 自己不 `new`

第二点尤其关键。如果 `SingleDog` 内部写着 `this.girlFriend = new LinZhiLing()`，那它依然依赖具体实现，接口等于白写了。**DIP 的成立不在「有没有接口」，而在「依赖是不是从外部进来的」。**

### 第二个例子：redux 的 AnyAction

再看一段 redux 类型，形式不太一样，但道理相同：

```typescript
import {createStore, AnyAction} from 'redux';
const store = createStore(state => state);
interface MyAction extends AnyAction {
  age: number;
}
class MyActionClass implements AnyAction {
  [extraProps: string]: any;
  type: any;
}
const action: MyAction | MyActionClass = {type: 'add', age: 10}
store.dispatch(action);
```

`store.dispatch` 的参数类型是 `AnyAction`，这是我们无法修改的**低层库**。而 `MyAction` 是我们的**高层业务类型**。`interface MyAction extends AnyAction` 的意思是：高层类型扩展了低层的抽象契约，而不是反过来让库去认识我们的业务类型。

这里有一个值得单独说的点：`store.dispatch` 接收的是 `AnyAction`（抽象），所以它不认识 `MyAction` 里的 `age` 字段——它也不需要认识。**库对业务细节一无所知，这正是 DIP 想要的效果。**

### 三个必须分清的概念：DIP / IoC / DI

这是面试追问链里最容易翻车的地方。很多人会说「DIP 就是依赖注入」，这是不准确的。

| 概念 | 全称 | 它是什么 | 一句话 |
|------|------|------|------|
| **DIP** | Dependency Inversion Principle | **原则**（设计指导思想） | 依赖要朝向抽象，不要朝向具体 |
| **IoC** | Inversion of Control | **更宽的范围**（一种设计范式） | 把控制权从代码交给外部框架/调用方 |
| **DI** | Dependency Injection | **实现手段**（一种编码技术） | 依赖由外部传进来，而不是内部 new |

它们的关系是层层包含：

```text
        IoC（控制反转：最宽的范畴）
        ├── 事件驱动 / 回调：控制权交给事件循环
        ├── 模板方法：控制权交给父类（父类调子类）
        └── DI（依赖注入：其中一种具体形式）
              └── 服务于 DIP 这个原则
```

说得更准确一点：**DIP 是「为什么」，DI 是「怎么做」，IoC 是「这一类做法的总称」。**

React 里的三个例子正好各占一格：

- **DIP**：`useRequest` 依赖一个 `fetcher` 函数类型，不依赖 axios
- **DI**：`<RequestProvider fetcher={myFetch}>` 把实现从外部传进来
- **IoC**：`useEffect(() => {...}, [])` —— 什么时候执行由 React 决定，不由你决定

### 前端落地：容器注入，而不是直接 import

回到第一章的反例四：

```typescript
import axios from 'axios';

export function DrugDetail({ id }: { id: string }) {
  useEffect(() => {
    axios.get(`/api/drug/${id}`).then((res) => setDrug(res.data));
  }, [id]);
  // ...
}
```

违反 DIP 的地方很明确：**业务组件（高层）直接依赖了 axios（低层实现细节）**。

改法是定义一个「我这层需要什么能力」的抽象：

```typescript
// 抽象由高层定义：我只要求「能按 id 取药品」
export interface DrugApi {
  getById(id: string): Promise<Drug>;
}

// 低层实现依赖这个抽象
export class HttpDrugApi implements DrugApi {
  constructor(private http: HttpClient) {}
  getById(id: string) {
    return this.http.get<Drug>(`/api/drug/${id}`);
  }
}
```

业务组件通过 Context 拿到抽象：

```typescript
const DrugApiContext = createContext<DrugApi | null>(null);

export function useDrugApi(): DrugApi {
  const api = useContext(DrugApiContext);
  if (!api) throw new Error('DrugApiContext 未提供');
  return api;
}
```

```typescript
export function DrugDetail({ id }: { id: string }) {
  const api = useDrugApi();
  const [drug, setDrug] = useState<Drug | null>(null);
  useEffect(() => {
    api.getById(id).then(setDrug);
  }, [api, id]);
  return drug ? <DrugCard drug={drug} /> : <Skeleton />;
}
```

改完之后三件事同时变得容易：

- **换 HTTP 库**：只改 `HttpDrugApi` 的实现，业务组件零改动
- **单测**：注入一个 `{ getById: async () => mockDrug }`，不碰网络
- **降级/灰度**：注入一个带缓存的实现，业务逻辑不知道

🔧 **真实场景**：医疗平台的问诊页需要在「App 内 WebView」和「浏览器」两种环境下走不同的接口地址。把 `httpClient` 做成 Context 注入后，两种环境只是注入不同的实例，业务组件里一行 `location` 判断都不需要——顺带解决了原来散落在 20 多个组件里的环境判断。

> 💬 **面试官**：依赖倒置原则和依赖注入是一回事吗？
>
> ✅ 标准答案：不是，它们是不同层次的东西。DIP 是一条**设计原则**，说的是依赖方向应该朝向抽象——高层模块和低层模块都依赖抽象，而不是高层依赖低层。DI 是一种**实现手段**，说的是依赖对象由外部传入而不是内部构造。DI 可以用来实现 DIP，但也可以用来做别的事（比如单纯为了可测试性）；反过来，实现 DIP 也不一定只能靠 DI，工厂模式、服务定位器也能做到。简单说：DIP 是「为什么」，DI 是「怎么做」。
>
> 🎁 加分答案：能把 IoC 也放进来区分——IoC 是比 DI 更宽的范畴，指控制权从代码转移到外部框架，包含事件回调、模板方法、DI 等多种形式。React 的 `useEffect` 是 IoC（执行时机由 React 决定），Context 注入 `httpClient` 是 DI（依赖从外部传进来），而要求业务层只依赖 `DrugApi` 接口是 DIP（依赖朝向抽象）。三个概念经常被混为一谈，能各举一个 HTML/JS 里天天见的例子把它们分开，是这道题最好的答法。

---

## 七、ISP 接口隔离原则：不要逼别人实现用不上的东西

**全称**：Interface Segregation Principle

### 定义

常见的表述：

> 其核心思想是：使用多个小的专门的接口，而不要使用一个大的总接口。

以及它为什么要这么做，有两个目的值得记住：

> - 避免引用接口的类，需要实现其实用不到的接口方法、属性。
> - 避免当接口修改的时候，有一连串的实现类需要更改。

第二点尤其重要，因为它指出了 ISP 的真实代价：**一个胖接口被修改时，所有实现类都会被牵连**——哪怕改动的那部分方法跟某个实现毫无关系。

另外还有一个常被忽略的技术细节：**只有实现类必须「完全」实现接口的所有成员，接口才能起到隔离作用。** 也就是说，一旦某个类 `implements` 了接口，它就必须把接口里每个方法都写出来——哪怕某个方法对它毫无意义，也只能写个空方法。这是 ISP 想避免的第一种情况。

### 正例：拆成两个小接口

```typescript
interface IUserManager {
  updateUserInfo(): void;
  updatePassword(): void;
}

interface IProductManager {
  updateProduct(): void;
  updatePrice(): void;
}
```

如果合成一个 `IManager`，那么所有做用户管理的类都得实现 `updateProduct()`——哪怕它根本不管商品。

这里还有一条容易被忽略的洞察：**ISP 不仅管「实现类」，也管「调用方」。** 一个类如果只依赖 `IUserManager`，那它就不应该知道 `updateProduct()` 的存在——依赖范围越小，被牵连的可能性越小。这就是「避免引用接口的类，需要实现其实用不到的接口方法」。

### 一个容易被抄错的反例

常见资料里还收了一段这样的代码：

```typescript
interface Running {
  run(): void;
}

interface Flying {
  fly(): void;
}

interface Swimming {
  swim(): void;
}

class Automobile implements Running, Flying, Swimming {
  run(): void {}
  fly(): void {}
  swim(): void {}
}
```

**这里要明确一句：这段写法恰恰是 ISP 要反对的样子。**

接口确实拆小了（这是个好开头），但 `Automobile` 一口气 `implements` 了三个——汽车不能飞、不能游，它的 `fly()` 和 `swim()` 只能是空实现。空实现是最危险的代码：它编译通过、不报错、调用时静默什么都没做，等到线上发现「点了飞行按钮没反应」时，你有一万行代码要排查。

ISP 的正解是：接口拆小之后，**按需实现**。

```typescript
class Automobile implements Running {
  run(): void {
    console.log('汽车在跑');
  }
}

class Airplane implements Running, Flying {
  run(): void {}
  fly(): void {}
}

class Duck implements Running, Swimming, Flying {
  run(): void {}
  swim(): void {}
  fly(): void {}
}
```

同一批小接口，三种能力组合，各自只实现自己真有的。这才是「多个小的专门接口」的正确用法——**拆接口只是第一步，按需组合才是目的。**

### 前端落地：从「大 options」到「小 Hook」

回到第一章的反例三，`useForm(options)` 的问题是它把三个互相独立的关注点捆在了一个入参里：

```typescript
function useForm(options: {
  initialValues: Record<string, unknown>;
  validateRules?: Record<string, Rule[]>;
  persistKey?: string;
  scrollToError?: boolean;
  analyticsId?: string;
})
```

拆法不是「把 options 变小」，而是**按能力拆成独立的 Hook**：

```typescript
// 只负责表单状态
function useForm<T>(initialValues: T) {
  const [values, setValues] = useState(initialValues);
  const setField = (key: keyof T, value: T[keyof T]) =>
    setValues((prev) => ({ ...prev, [key]: value }));
  return { values, setField };
}
```

```typescript
// 只负责校验，可单独使用
function useValidate<T>(values: T, rules: Partial<Record<keyof T, Rule[]>>) {
  const errors = useMemo(() => runRules(values, rules), [values, rules]);
  return { errors, valid: Object.keys(errors).length === 0 };
}
```

```typescript
// 只负责草稿持久化，用不用由调用方决定
function useFormPersist<T>(key: string, values: T) {
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(values));
  }, [key, values]);
}
```

三个字段的搜索框，就只用 `useForm`；需要草稿的病历表单，再加 `useFormPersist`。**能力按需组合，而不是被迫接受一个全能开关。**

### TypeScript 层面对应：小接口 + 交叉类型

TS 里 ISP 最直接的表达是**接口组合优于接口继承**：

```typescript
interface HasId { id: string; }
interface HasTimestamps { createdAt: string; updatedAt: string; }
interface HasAudit { createdBy: string; }

// ✅ 组合：需要哪些拼哪些
type Drug = HasId & HasTimestamps & { name: string; spec: string };
type Prescription = HasId & HasTimestamps & HasAudit & { drugIds: string[] };

// ❌ 反面：一个大接口，所有人都得带上用不到的字段
interface Entity {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;  // 药品没有这个字段，但必须写成可选
}
```

第一版的 `Drug` 里根本没有 `createdBy`，**不需要的类型压根不出现**；第二版则要么硬塞一个可选字段（让所有读取方都得判空）、要么硬塞一个假值（污染数据）。

`Pick` 和 `Omit` 也是同一思路的工具，但有一条使用建议值得说：**它们适合「从已有大类型里取子集」，不适合当作设计手段**。如果一个类型天生就该是小接口组合出来的，直接定义小接口比事后 `Omit` 更清楚——因为 `Omit<BigType, 'a' | 'b' | 'c'>` 会随着 `BigType` 变化而悄悄变化，你控制不了它。

🔧 **真实场景**：一个内部组件库的 `ModalProps` 集成了 `visible`、`onCancel`、`footer`、`maskClosable`、`centered`、`destroyOnClose`、`afterClose`、`getContainer` 等 20 多个字段。后来 `Drawer`、`Popconfirm`、`Popover` 都复用了它，于是每个组件都带着一堆「传了也不生效」的 props。最后的修法是拆成 `OverlayBaseProps`（容器/遮罩/层级）+ `ClosableProps` + `FooterProps` 三个小接口，各组件按需 & 起来——**props 表从 20 多个降到 5 到 8 个，类型提示也不再那样庞杂**。

> 💬 **面试官**：接口隔离原则和单一职责原则有什么区别？两者都是「拆」，拆的标准一样吗？
>
> ✅ 标准答案：两者都涉及拆分，但拆的维度不同。SRP 拆的是**实现**，关注「一个类有几个变化原因」，作用在类的内部分工上；ISP 拆的是**接口（契约）**，关注「一个使用方被迫依赖了多少它不需要的方法」，作用在类与类之间的依赖关系上。判断标准也不同：SRP 看变化原因是否单一，ISP 看依赖范围是否最小——一个类可以职责很单一，但如果它实现的接口很大，照样违反 ISP。
>
> 🎁 加分答案：能补一个特别容易踩的坑——**接口拆小了不等于 ISP 达成了**。拆完之后如果实现类把不相关的小接口全部 `implements` 上去、用空方法应付，那只是把「一个胖接口」变成了「若干空实现」，问题一点没解决，反而更难发现（空方法不报错、静默失败）。ISP 的真正目标是**按需组合**，不是「把接口拆得足够碎」。同时能提到「ISP 也保护调用方」——只依赖 `IUserManager` 的模块不该知道 `updateProduct()` 存在，这一半常常被忽略。

---

## 八、迪米特法则：只和你的直接朋友说话

**全称**：Law of Demeter（LoD），也称最少知识原则（Least Knowledge Principle）

### 定义

经典表述有四条：

> - 一个软件实体应当尽可能少地与其它实体发生相互作用
> - 迪米特法则的初衷在于降低类之间的耦合
> - 类定义时尽量要实现内聚，少使用 public 修饰符，尽量是有 private、protected 等

注意第三条——它把 LoD 和第二章的**封装**接上了。封装是「不让人随便碰我的数据」，LoD 是「不让自己随便碰别人的数据」。两者合起来才是一个完整的边界：**我不露出不该露的，我也不伸手去够不该够的。**

核心判据：**只和「直接朋友」交互。** 直接朋友指：

- 当前对象自己
- 当前对象的成员字段（直接持有的对象）
- 方法参数传进来的对象
- 方法内部创建的对象

**朋友的朋友，不是朋友。** 这就是 LoD 的全部。

### 例子：CEO 不直接找销售员

```typescript
class SaleMan {
  constructor(public name: string) {}
  sale() {
    console.log(`${this.name}销售中...`);
  }
}
```

```typescript
class SaleManager {
  private saleMan: Array<SaleMan> = [new SaleMan('张三'), new SaleMan('李四')];
  sale() {
    this.saleMan.forEach(s => s.sale());
  }
}
```

```typescript
class CEO {
  private saleManager: SaleManager = new SaleManager();
  sale() {
    this.saleManager.sale();
  }
}

const ceo = new CEO();
ceo.sale();
```

![LoD：CEO 只和 SaleManager 打交道，SaleManager 才认识 SaleMan](https://cdn.nlark.com/yuque/0/2021/png/738210/1638450558806-62415277-d8cc-4e8c-8756-fcf218a1dce1.png)

这个例子里有一个很实际的好处，值得点出来：`SaleMan` 的集合是 `private` 的。如果 `CEO` 直接访问 `this.saleManager.saleMan.forEach(...)`，那么**销售员的数据结构一旦变化**（比如从数组改成按区域分组的 Map），`CEO` 的代码就要跟着改。

现在 `CEO` 只知道「销售经理有个 `sale()` 方法」，销售经理内部怎么组织销售员、有多少个、是不是数组——它一概不知。**这就是 LoD 的收益：变化的传播被截断在一层之内。**

### 前端落地：三种典型的违反

**违反一：越过组件直接操作孙子组件的状态**

```typescript
// ❌ 父组件伸手去改孙子组件的内部
function OrderPage() {
  const [items, setItems] = useState<OrderItem[]>([]);
  return (
    <OrderList
      items={items}
      onItemsChange={setItems}
      // 父组件需要知道 List 内部每个 Item 的展开/选中状态
      expandedKeys={expandedKeys}
      onExpandedChange={setExpandedKeys}
      selectedKeys={selectedKeys}
      onSelectedChange={setSelectedKeys}
    />
  );
}
```

父组件不该知道「List 内部每个 Item 是怎么管理自己状态的」。正确做法是 List 自己管展开/选中，对外只暴露语义化的事件（`onSelectionComplete(selectedIds)`），或者用 Context 让 Item 自己取。

**违反二：链式取值 `props.user.address.city`**

```typescript
// ❌ 穿过三层对象去够一个值
function DeliveryCard({ user }: { user: User }) {
  return <span>{user.address.city}</span>;
}
```

`DeliveryCard` 只需要「城市」，却被迫知道 `User` 里有 `address`、`address` 里有 `city` 这个完整路径。`User` 结构一改（`address` 改成 `addresses[]`），所有这么写的组件全崩。

改法有两种，都很简单：

```typescript
// ✅ 方案一：父组件负责取值，子组件只收它需要的
function DeliveryCard({ city }: { city: string }) {
  return <span>{city}</span>;
}

// ✅ 方案二：由 User 自己提供能力（把知识留在数据旁边）
class User {
  getCity(): string {
    return this.address?.city ?? '未知';
  }
}
```

**方案二是 LoD 的精髓**：把「怎么从我的结构里取城市」这件事，变成 `User` 自己的方法。外部不再需要知道我的内部结构，我也就有了修改内部结构的自由。

**违反三：`getBoundingClientRect().width` 这类深层调用**

```typescript
// 一次调用穿越了三层
const w = el.getBoundingClientRect().width;
```

严格说这条不算严重违反（DOM API 是标准库，且返回的是值对象），但它揭示了 LoD 的一个现实标准：**调用链不超过一个点（`.`)是理想，实际工程里允许把标准库的返回当值对象直接读。** 规则的意义在于「别在自己设计的对象上这样穿」，而不是教条化。

### 一个常见误解：链式调用违反 LoD 吗

**不违反。** 这是本节最值得澄清的一点。

```typescript
new ReportConfigBuilder()
  .setTitle('处方报告')
  .setDrugId('D001')
  .setShowWarning(true)
  .build();
```

这看起来是「一路点下去四个点」，但它每次都返回**同一个对象（`this`）**，全程没有穿越到新的对象——它始终只在跟 `ReportConfigBuilder` 这一个朋友说话。

判断标准很简单：**这条链上，对象有没有换人？**

- `.setTitle()` 返回 `this` → 还是同一个对象，**不违反**
- `user.address.city` → 从 `user` 走到了 `address`，**换了朋友，违反**
- `el.getBoundingClientRect().width` → 从 `el` 走到了一个新的 `DOMRect`，**换了，但返回的是标准值对象，实践中接受**

> 💬 **面试官**：迪米特法则和封装有什么区别？两者不都是在讲「隐藏」吗？
>
> ✅ 标准答案：方向不同。封装是「向内」的——不让外部直接访问我的内部数据，我通过 public 方法控制别人怎么用我；LoD 是「向外」的——不让自己穿过中间对象去够更远的对象，我只和直接朋友交互。封装约束的是**被别人依赖的方式**，LoD 约束的是**自己依赖别人的方式**。一个类可以封装做得很好（字段全 private、只暴露方法），但如果它的方法内部写满了 `a.getB().getC().doSomething()`，照样严重违反 LoD。
>
> 🎁 加分答案：能主动澄清「链式调用违反 LoD」这个常见误解——判据是**这条链上对象有没有换人**：`.setA().setB().build()` 每次返回 `this`，始终只有一个对象，不违反 LoD；`user.address.city` 从 `user` 走到 `address` 走了两步，才是违反。另外能举出「把知识留在数据旁边」这个修法（`user.getCity()` 而不是外部拼路径），说明理解的是 LoD 的意图而不是条文。

---

## 九、合成复用原则：组合优于继承

**全称**：Composite Reuse Principle，也叫「优先使用组合/聚合，而非继承」

### 先补一小块前置：类之间的四种关系

在讲合成复用前，得先确认类之间几种关系的强弱。这块的完整识图方法（六种关系、菱形与三角、多重性标注）第 00 篇已经讲透了，这里只留一张强度阶梯，够本篇用：

```text
        依赖  ──▶  关联  ──▶  聚合  ──▶  组合
       （最弱）                          （最强）

  依赖：方法里临时用一下，用完即弃
  关联：字段持有，长期知道对方存在
  聚合：整体-部分，但部分可以独立存活（空心菱形 ◇）
  组合：整体-部分，生命周期绑定，同生共死（实心菱形 ◆）
```

> 六种关系的画法、菱形与空心三角的区别、多重性标注，见第 00 篇《UML 与设计模式全景图》，这里不再重复。

这三种基本关系的概括值得记住：

> 类之间有三种基本关系，分别是关联(聚合和组合)、泛化和依赖。如果一个类单向依赖另一个类，那么它们之间就是单向关联，如果彼此依赖，则为相互依赖，即双向关联。
>
> 关联关系包括两种特例：聚合和组合。聚合：用来表示整体与部分的关系或者拥有关系，代表部分的对象可能会被整体拥有，但并不一定会随着整体的销毁而销毁，比如班级和学生。组合：要比聚合关系强的多，部分和整体的生命周期是一致的，比如人和器官之间。
>
> 从弱到强：依赖-->关联-->聚合-->组合

四种关系在代码里的写法，各有一小段示例：

```typescript
// 依赖：只在方法执行期间用到
class Student{
  read(book: Book) {
    const pen = new Pen();
  }
}
class Book {}
class Pen {}
```

```typescript
// 关联：字段持有，可以单向也可以双向
class Category {
  // 也是关联，双向关联或互相关联
  public products?: Array<Product>;
}

class Product {
  // 产品类有一个实例属性是分类，那么就认为产品关联了分类
  // 单向关联和双向关联
  public category?: Category;
}
```

```typescript
// 聚合：班级拥有学生，但学生可以独立存在
class Class {
  public students?: Array<Student>;
}
class Student{}
```

```typescript
// 组合：人拥有心脏，人没了心脏也没了
class Person {
  public heart?: Heart;
}
class Heart{}
```

![类的关系：依赖、关联、聚合、组合的强弱层次](https://cdn.nlark.com/yuque/0/2021/png/738210/1638451993317-7de1be3e-aba5-4b1c-ad6b-0fc26b886b77.png)

注意这四段代码里有一个「看上去一样」的陷阱：`Class.students` 和 `Person.heart` 在 TS 里的写法完全一致，都是字段声明。**聚合和组合的区别不在代码形状，而在「谁创建、谁销毁」**——这个判据第 00 篇已经用 React 的 `props`（聚合）和 `useMemo` 派生数据（组合）讲过一遍，这里直接沿用。

### 合成复用原则本身

定义是：

> 合成复用原则是通过将已有的对象纳入新对象，作为新对象的成员对象来实现的。新对象可以调用已有对象的功能，从而达到复用。原则是尽量首先使用组合/聚合的方式，而不是使用继承。专业人做专业事。

代码很短，但对照很清楚：

```typescript
// 尽量使用组合或者聚合，而不是使用继承
class Cooker {
  cook() {}
}
// 继承耦合太强
class Person {
  private cooker?: Cooker;
  cook() {
    this.cooker?.cook();
  }
}
```

注释里那句「继承耦合太强」，展开就是本节的核心问题。

### 为什么组合优于继承：五条理由

这是全系列的高频题，值得一次讲透。继承不是错的，它在「确实是 is-a 关系」时是最简洁的复用方式；问题在于**它被滥用的概率极高**，原因有五条：

| 理由 | 说明 | 后果 |
|------|------|------|
| **编译期绑定** | 继承关系在写代码时就定死了，运行时无法更换 | 想「有时用 A 有时用 B」做不到，只能再造子类 |
| **破坏封装（白盒复用）** | 子类能看到 `protected` 成员，父类的内部实现被暴露给子类 | 父类想重构内部，得先检查所有子类的依赖 |
| **脆弱基类问题** | 父类改一处，所有子类的行为都可能变 | 一个「安全的小改动」能在下游炸出 bug |
| **类爆炸** | N 个基础能力 × M 个增强能力 = N×M 个子类 | 加一个维度，子类数量乘一个数 |
| **单一继承限制** | JS/TS 只有一个 `extends` | 「既想复用 A 又想复用 B」直接做不到 |

组合在这五条上全部相反：

| 组合的优势 | 说明 |
|------|------|
| 运行期绑定 | 传哪个实现就用哪个实现，可以运行时替换 |
| 黑盒复用 | 只依赖对方的 public 接口，不知道内部 |
| 弱耦合 | 换掉成员对象，宿主类一行不改 |
| 组合爆炸 ⇒ 线性组合 | N + M 个类，自由拼装 |
| 无数量限制 | 想持有几个就持有几个 |

### 前端最典型的证据：HOC 的 wrapper hell

「组合优于继承」在前端最直观的证据是 React 的历史：**HOC 用得越多，嵌套越深，最后变成 wrapper hell。**

```typescript
// ❌ HOC 层层嵌套：这就是「继承式思维」在前端的表现
export default withRouter(
  withTheme(
    withI18n(
      withAuth(
        withLoading(
          withErrorBoundary(UserProfile)
        )
      )
    )
  )
);
```

问题完全对应上表：

- **顺序有讲究但没写清**：为什么 `withAuth` 在 `withLoading` 外面？改一下顺序行为就变
- **props 命名冲突**：两个 HOC 都想注入 `loading`
- **调试困难**：React DevTools 里是五层叫 `Anonymous` 的组件
- **类爆炸**：`withAuth` × `withTheme` × `withLoading` 的任何组合都要现搭

React 后来的答案是组合：

```tsx
// ✅ 组合：能力是子节点/回调，不是包装层
<AuthProvider>
  <ThemeProvider>
    <I18nProvider>
      <RequestProvider>
        <UserProfile />
      </RequestProvider>
    </I18nProvider>
  </ThemeProvider>
</AuthProvider>
```

Provider 的嵌套在形式上也多层，但本质不同：**每一层是通过 Context 提供能力，而不是包装并替换组件本身**。组件 `<UserProfile />` 依然是那个组件，没有被五层包装包裹；能力是「被注入的」，而不是「被包裹出来的」。这就是黑盒复用与白盒复用的差别。

同样的判断也适用于「类组件 vs Hook」：`class extends React.Component` 是继承式复用（白盒，你能看到并覆写生命周期方法），`useXxx()` 是组合式复用（黑盒，只知道它的返回值和副作用）。

🔧 **真实场景**：一个药品列表的三处展示形态（列表卡片、表格行、打印版）原先用 `BaseDrugItem` + 三个子类覆盖 `render()` 实现。后来要在卡片上加「处方药」角标，得改父类；但表格行不需要角标，只能再在子类里覆盖掉——**加一个功能，改了两个类。** 改成组合后，`DrugBadge` 是一个独立组件，哪里需要就 `<DrugBadge />` 插进去，父类和另外两个形态都不用动。

> 💬 **面试官**：为什么说「组合优于继承」？继承有什么问题？
>
> ✅ 标准答案：核心原因是继承是**编译期绑定 + 白盒复用**，而组合是**运行期绑定 + 黑盒复用**。继承的具体问题有四个：① 父类改动会通过 `protected` 成员扩散到所有子类，也就是「脆弱基类问题」；② 复用是白盒的——子类依赖父类的内部实现，父类无法自由重构；③ 多维度变化时子类数量按乘法增长，N×M 个子类；④ JS 只支持单一继承，「既想复用 A 又想复用 B」做不到。组合在这四点上都相反：可以运行时替换、只依赖对方 public 接口、类数量是加法而不是乘法、想持有几个就持有几个。
>
> 🎁 加分答案：能补两点——① 不是「继承一律不用」，而是「继承只用于真正稳定的 is-a 关系，且父类的公开契约已经稳定」；一旦只是「想复用几行代码」，就该用组合。② 能举 React 的演进作为证据：HOC（组合的早期形态，但用得越来越像继承）→ render props → Hook，社区从「包装组件」转向「注入能力」，本质就是从白盒复用转向黑盒复用；`class extends React.Component` 与 `useXxx()` 的对比也是同一件事。

---

## 十、三个辅助原则：DRY / KISS / YAGNI

SOLID 之外，还有三条被反复提及、但经常被用歪的原则。它们看起来都很朴素，问题全在**三者之间存在天然张力**。

### DRY：不要重复自己——但重复代码不等于重复知识

DRY（Don't Repeat Yourself）的原始表述比「不要写重复的代码」精确得多：

> **每一处知识，在一个系统内都必须有唯一、明确、权威的表达。**

注意它说的是**知识**，不是**代码**。

这两者在很多场景下并不重合：

```typescript
// 两段代码长得一样，但表达的是完全不同的两件事
// 1) 校验用户手机号：11 位，1 开头
const isUserPhone = (v: string) => /^1[3-9]\d{9}$/.test(v);

// 2) 校验医生执业证号后 11 位：恰好也是 11 位数字
const isLicenseTail = (v: string) => /^1[3-9]\d{9}$/.test(v);
```

这两段代码完全一样，抽成一个共享函数看似「DRY 了」，但这是个陷阱：

- 手机号规则变了（比如新增 19x 号段）→ 执业证号不该跟着变，但共享函数一改两个都变
- 执业证号校验逻辑变了 → 手机号被误伤

**它们重复的是代码，不是知识。** 抽成共享函数的代价，是把两个本来独立的业务规则绑在了一起——这恰恰违反了 SRP（两个变化原因捆进一个容器）。

反过来，有些地方看起来不重复，实际上重复了知识：

```typescript
// 两个地方各自写了 0.8，看起来不重复
function memberPrice(price: number) { return price * 0.8; }
function giftThreshold(price: number) { return price > 100 ? price * 0.8 : price; }
```

这里的 `0.8` 是同一个知识（会员折扣率）的两次表达，**应该抽成常量**。这种重复比第一种更危险，因为它不明显，改规则时容易漏掉一处。

所以 DRY 的判断分开两步走：

1. 这段逻辑是不是**同一份知识**？（规则相同、且会一起变）
2. 如果是 → 抽；如果不是 → **让它重复更好**

### KISS：保持简单

KISS（Keep It Simple, Stupid）没有太多争议，但有一个前端特有的形态值得说：

**过度抽象比重复代码更贵。**

一个三层抽象（Provider → Service → Adapter）和一个直接 `fetch()`，在「只调用一次」的场景下，成本差多少？不是代码行数的差，是**下一个人理解它要花的时间**。前者要读三个文件才能确信「这里就是发了个请求」，后者三秒看完。

KISS 的可操作判据：**如果一个抽象只能让你少写三行代码，却要读三十行才能理解它，那它就不该存在。**

### YAGNI：不要实现现在还不需要的功能

YAGNI（You Aren't Gonna Need It）来自 XP（极限编程），但它在今天的前端尤其重要，因为前端的变化速度让「预判未来需求」几乎必然失败。

这条原则不在 SOLID 里，但它是本篇最需要的平衡器——因为前面九章一直在教你「怎么抽、怎么拆、怎么加扩展点」，如果没有 YAGNI 拉住，你很容易走向另一个极端：**给所有东西都留扩展点。**

一个典型的过度设计：

```typescript
// ❌ 为一个「未来可能会有」的需求预留了三层扩展点
interface PluginConfig {
  name: string;
  hooks: Record<string, Array<(...args: unknown[]) => unknown>>;
  options: Record<string, unknown>;
}

class FormEngine {
  private plugins: PluginConfig[] = [];
  registerPlugin(p: PluginConfig) { /* ... */ }
  runPipeline<T>(input: T, pipelineName: string): T { /* ... */ }
  // ... 300 行插件调度逻辑
}

// 而实际用法只有一处：
new FormEngine().runPipeline(data, 'default');
```

这 300 行插件逻辑，一年后一次都没用上，但每次改表单流程都要先读懂它。**这就是「预判需求」的成本：它不是零，它是持续的阅读成本。**

### 三者的张力：DRY 追求过头，就会违反 YAGNI

这是本节最要讲清的一点。三条原则不是并列的，它们之间有真实的拉扯：

```text
        DRY 拉你往左 ──────────────  YAGNI 拉你往右
        （抽象、合并）                （不抽象、不预防）

           「一样的就该合并」          「不需要的别写」
                    │                    │
                    └────── 冲突点 ──────┘
                             ↓
              过早抽象（Premature Abstraction）
        ——两个不相干的东西因为"长得像"被合并，
          改一处坏两处，比重复更难维护
```

一次具体的冲突过程，值得完整走一遍：

- **第一次**：药品列表页和订单列表页各写了一个分页 Hook，代码几乎一样 → DRY 说「抽出来」
- **抽完后**：第二天药品要「按分类游标分页」，订单还是「按页码分页」。共享 Hook 里塞入 `type: 'page' | 'cursor'` 分支
- **第三次**：订单要「累计已加载条数」，加一个 `mode` 参数
- **半年后**：这个共享 Hook 里有 5 个布尔开关、2 个枚举、400 行代码，两个调用方各自只用其中一部分——**它已经变成了第一章那个 `useForm(options)`**

最后你把它拆回了两个。**DRY 的收益是一次性的（少写 100 行），代价是持续的（每次改动都要考虑两个调用方）。**

### 可操作的判据：三次法则

所以怎么在「该抽」和「不该抽」之间划线？业界最实用的答案是 **Rule of Three（三次法则）**：

> **第一次**遇到重复：直接写，不抽。
> **第二次**遇到重复：复制一份，记一笔「这里有重复」，但仍然不抽。
> **第三次**遇到重复：这时候才抽——因为重复已经出现了三次，说明它不是巧合，是模式。

为什么是第三次而不是第二次？

- **第二次**很可能是巧合。两个地方长得像，只是因为你今天刚好写了相似的代码，它们的未来变化方向可能完全不同
- **第三次**出现了，就有了三个样本可以观察：它们**变化方向是否一致**？如果三次改动都来自同一个原因，那这就是一个真实的变化点，值得抽象；如果三次改动原因各异，那它们本来就该分开

有个对应的说法叫 **WET（Write Everything Twice）**——故意允许重复两次，用第三次来判断这是不是真的重复。它不是反对 DRY，而是给 DRY 加了一个**证据门槛**。

三次法则和本篇前九章的关系，可以这样收束：

```text
SRP  → 按「变化原因」切边界，不是按代码行数切
OCP  → 只对「已证实且高频」的变化点做关闭（三次法则在 OCP 上同样生效）
LSP  → 类型检查守住形状，语义契约靠人和测试守住
ISP  → 接口拆小后按需组合，不为了拆而拆
DIP  → 依赖朝抽象，抽象由高层定义
合成复用 → 默认组合，继承只留给稳定的 is-a
LoD  → 只和直接朋友交互
DRY  → 重复的是知识才抽，重复的是代码可留
KISS → 抽象的成本要小于它省下的成本
YAGNI → 不为「以后可能」付今天的钱
```

最后三条（DRY / KISS / YAGNI）本质上都在说同一件事：**所有原则都有成本，过度使用的原则会变成新的技术债。**

> 💬 **面试官**：DRY 原则被过度使用会导致什么问题？
>
> ✅ 标准答案：会导致过早抽象。DRY 的原始定义是「每一处**知识**在系统内只有唯一表达」，但很多人把它理解成「每一段**代码**只能出现一次」，于是把所有长得像的代码都合并了。问题在于，两段长得像的代码可能表达的是不同的业务知识，它们的未来变化方向也完全不同。一旦合并，任何一侧的变化都会迫使共享抽象增加分支参数，最终这个抽象会退化成一个装满开关的怪物——改动它需要同时考虑所有调用方，成本反而高于重复。这就是「DRY 违反 YAGNI」的具体过程。
>
> 🎁 加分答案：能补三点——① 判断标准是「重复的是知识还是代码」：同一个业务规则在多处表达（比如会员折扣率 0.8）应该抽；两段巧合相似的代码但服务于不同领域规则，不该抽。② 可操作的判据是三次法则：第一次直接写、第二次复制、第三次才抽，因为第三次才能观察到「它们的变化方向是否一致」。③ 能点出「过度 DRY 的最终产物就是 SRP 的反面」——把所有调用方捆进一个共享模块，等于让它们共享同一个变化容器，恰好违反了单一职责。

---

## 十一、原则与模式的关系：为什么必须先学原则

到这里，五条主原则 + 迪米特 + 合成复用 + 三条辅助原则都讲完了。但还有一个问题没回答：**这些原则和后面 15 篇的 23 种模式，到底是什么关系？**

一句话：**原则是判断标准，模式是这个标准在具体问题上的成熟解法。**

同一件事用两种视角看：

- 用**原则**的视角：「这段代码的变化点没被隔离，改一次要动三处」
- 用**模式**的视角：「这里该用策略模式」

模式比原则更具体、更容易照抄，所以初学者天然更爱模式。但只学模式的后果是：**你认识的是一堆孤立的形状，遇到形状相似但意图不同的场景就选错。**

具体的映射关系如下，这也是本篇到后续各篇的导航图：

| 原则 | 它约束什么 | 落到哪些模式 | 详见 |
|------|------|------|------|
| **SRP** 单一职责 | 一个变化原因一个容器 | 组合模式（统一接口下的职责分层）、职责链（每环一件事） | 第 08、12 篇 |
| **OCP** 开闭 | 变化发生在容器之外 | 策略、装饰器、工厂方法、观察者、职责链 | 第 11、06、03、10、12 篇 |
| **LSP** 里氏替换 | 替换后行为不变 | 所有基于继承/接口的体系（模板方法、工厂方法、组合） | 全系列 |
| **ISP** 接口隔离 | 依赖范围最小 | 适配器（只暴露需要的接口）、接口拆分 | 第 05 篇 |
| **DIP** 依赖倒置 | 依赖朝向抽象 | 策略（面向策略接口）、工厂（面向产品抽象）、桥接 | 第 11、03、08 篇 |
| **合成复用** | 优先组合而非继承 | 桥接（组合两维度）、组合模式、装饰器（包装而非继承） | 第 08、06 篇 |
| **LoD** 迪米特 | 只和直接朋友交互 | 外观（把子系统藏在一个朋友后面）、中介者、代理 | 第 05、16、07 篇 |
| **DRY/KISS/YAGNI** | 抽象的成本控制 | 所有模式的使用边界（不该为了用模式而用模式） | 全系列 |

看这张表会发现两个规律：

**规律一：一条原则通常对应多个模式。** 因为原则是「为什么」，模式是「在这个具体场景怎么做到」。同一个「对扩展开放」，在「同一功能多种算法」的场景下是策略，在「给对象动态加能力」的场景下是装饰器，在「创建哪种对象」的场景下是工厂方法。

**规律二：一个模式通常服务多条原则。** 桥接既是合成复用（组合两维度）又是 DIP（朝实现接口依赖）；外观既是 LoD（只认识门面）又是 ISP（对外只暴露需要的能力）。

所以「先原则后模式」的意义不是学习顺序上的礼节，而是：**原则是那张能让你在陌生场景里做判断的坐标系，模式只是坐标系里的已知点。** 只记已知点，遇到新点就懵；有了坐标系，新点也能定位。

---

## 十二、前端工程落地：三个可验证的重构

这一章把前文的抽象全部落回代码，三个改造分别对应第一章的三个反例——形成闭环。

### 落地一：React Hooks 的 SRP——API 设计层面的单一职责

`useState` 只做一件事：**管理一个状态值**。它不管副作用、不管 DOM、不管请求。

`useEffect` 只做一件事：**在渲染后同步副作用**。

对比 class 组件的形态：

```typescript
class DrugDetail extends React.Component<Props, State> {
  state = { drug: null, loading: false };

  // 生命周期：请求
  componentDidMount() { this.fetchDrug(); }
  componentDidUpdate(prev: Props) {
    if (prev.id !== this.props.id) this.fetchDrug();
  }
  // 逻辑：数据获取 + 竞态取消 + 错误处理，全塞在类里
  fetchDrug = async () => { /* 30 行 */ };
  // 渲染：UI
  render() { return this.state.loading ? <Skeleton /> : <Card />; }
}
```

一个类里同时住着**状态、副作用、生命周期时序、数据加载、渲染**。这就是第一章反例一在框架 API 层面的原型。

Hooks 的设计把它们拆成了正交的三件事：

```typescript
function DrugDetail({ id }: { id: string }) {
  const { drug, loading } = useDrugDetail(id);   // 数据
  const [tab, setTab] = useState('spec');         // 纯状态
  useTrackExposure(id);                           // 副作用
  return loading ? <Skeleton /> : <DrugCard drug={drug} tab={tab} />;
}
```

**关键洞察**：Hooks 不是因为「函数式写法更时髦」才拆开的，而是因为**把「状态、副作用、渲染」拆成独立 API，让每一层都只有一个变化原因**——这正好是 SRP 在 API 设计层面的体现。

顺带说清一个常被问到的点：为什么 Hooks 不能在 `if` 里调用？因为 React 依赖**调用顺序**来定位每个 Hook 的状态。顺序之所以是「可靠的定位符」，前提是**每次渲染的调用序列完全一致**——条件调用破坏了这一点，后面对应关系就全乱了。

### 落地二：TypeScript 的接口组合——ISP 的语言层支持

```typescript
interface Timestamps { createdAt: string; updatedAt: string; }
interface Auditable { createdBy: string; updatedBy: string; }

// 药品：有创建/更新时间，没有审计人
interface Drug extends Timestamps {
  id: string;
  name: string;
  spec: string;
}

// 处方：既有时间也有审计
interface Prescription extends Timestamps, Auditable {
  id: string;
  drugIds: string[];
}
```

`interface A extends B, C` 允许多接口组合，这是 ISP 的**语言层面直接支持**——你可以精确地表达「处方需要哪些能力」，而不必继承一个包含所有能力的大接口。

对比继承式写法：`class Prescription extends BaseEntity` 会让所有子类都背上 `BaseEntity` 的全部字段，即使大部分子类不需要。**接口组合是「我需要什么就拿什么」，继承是「父类有什么你就得全带上」**——这是 ISP 和合成复用原则在类型层的同一个表达。

### 落地三：支付方式 if-else → 策略模式（OCP 的完整闭环）

回到第一章的反例二：

```typescript
function handlePayment(order: Order, method: string) {
  if (method === 'alipay') {
    return alipaySdk.pay(order.amount);
  } else if (method === 'wechat') {
    return wechatSdk.pay(order.amount);
  } else if (method === 'balance') {
    return wallet.deduct(order.amount);
  }
  throw new Error('不支持的支付方式');
}
```

按第四章的思维，先问一句：**这里的「变化点」是什么？**

变化点是「**有哪些支付方式，各自怎么付**」。而这个变化点应该属于谁？不属于 `handlePayment` 这个编排函数，而属于「支付方式」本身——每种支付方式最清楚自己怎么付。

于是抽出一个策略接口：

```typescript
export interface PayStrategy {
  readonly code: string;
  pay(order: Order): Promise<PayResult>;
}
```

每种支付方式实现它：

```typescript
export class AlipayStrategy implements PayStrategy {
  readonly code = 'alipay';
  async pay(order: Order) {
    return alipaySdk.pay(order.amount);
  }
}

export class WechatStrategy implements PayStrategy {
  readonly code = 'wechat';
  async pay(order: Order) {
    return wechatSdk.pay(order.amount);
  }
}
```

```typescript
export class BalanceStrategy implements PayStrategy {
  readonly code = 'balance';
  async pay(order: Order) {
    return wallet.deduct(order.amount);
  }
}
```

用一个注册表把策略管起来：

```typescript
const registry = new Map<string, PayStrategy>();

export function registerPayStrategy(s: PayStrategy) {
  registry.set(s.code, s);
}

export function pay(order: Order, method: string): Promise<PayResult> {
  const strategy = registry.get(method);
  if (!strategy) throw new Error(`不支持的支付方式: ${method}`);
  return strategy.pay(order);
}
```

现在接入医保支付：

```typescript
// 新增一个文件，一行注册
registerPayStrategy(new MedicalInsuranceStrategy());
```

**`pay()` 函数一行没改，`handlePayment` 也一行没改。**

这就是第四章说的「对扩展开放，对修改关闭」的完整闭环。三个改造和第一章三个反例的对应关系，可以收成一张表：

| 第一章的反例 | 违反的原则 | 本章的改法 |
|------|------|------|
| 2000 行 UserProfile | SRP | 拆 Hook（数据 / 校验 / 视图 / 副作用）；`useState`/`useEffect` 本身就是 SRP 的 API 层示范 |
| handlePayment if-else | OCP | 策略模式 + 注册表，新增支付方式加一个文件 |
| useForm(options) | ISP | 拆成多个小 Hook 按需组合；接口用 `extends` 组合代替胖接口 |
| import axios | DIP | `DrugApi` 抽象 + Context 注入实现 |

> 策略模式的完整展开（Strategy 与 State 的辨析、函数式写法、前端工程案例）见第 11 篇。

---

## 收尾：好代码的七个标准

最后给一份检验清单，它比任何原则都更贴近日常判断——因为原则回答「为什么」，标准回答「看起来对不对」：

> - **可维护性**，BUG 是否好改
> - **可读性**，是否容易看懂
> - **可扩展性**，是否可以添加新功能
> - **灵活性**，添加新功能是否容易，老方法和接口是否容易复用
> - **简洁性**，代码是否简单清晰
> - **可复用性**，相同的代码不要写两遍
> - **可测试性**，是否方便写单元测试和集成测试

这七条其实是本篇所有原则的「体检指标」。而且它们内部也有张力——**可复用性和简洁性经常打架**（为了复用抽出的抽象会让代码不简洁），**可扩展性和可读性也经常打架**（留扩展点会让第一眼看不懂）。第十章讲的三次法则，本质就是在这些冲突里找平衡。

再看三条总结，它把最关键的关系收束得很准：

> - 开闭原则是核心，对修改关闭，对扩展开放是软件设计的基石
> - 单一职责要求我们设计接口和模块功能的时候尽量保证单一性和原子性，修改一条不影响全局和其它模块
> - 里氏替换原则和依赖倒置原则要求**面向接口和抽象类编程**，不要依赖具体实现，否则实现一改，上层调用者就要对应修改

补一句：SRP 和 OCP 是「结构」层面的一对（怎么切、怎么开），LSP 和 DIP 是「依赖」层面的一对（替换成不成立、依赖朝向谁），ISP 是「接口」层面的（依赖范围最小），LoD 和合成复用是「交互」层面的（怎么说话、怎么复用）。**六个维度各管一段，合起来才是完整的判断力。**

---

## 💡 一张图总结（面试速记表）

| 原则要点 | 一句话内核 | 考察频率 |
|------|------|------|
| SRP 的准确定义 | 不是「一个类只做一件事」，是「只有一个引起它变化的原因」 | ⭐⭐⭐ 必考 |
| OCP 与策略模式 | 策略是 OCP 最直接的落地；Context 稳定、Strategy 开放、Concrete 可无限加 | ⭐⭐⭐ 必考 |
| LSP 四大契约 | 前置不加严、后置不减弱、不变量保持、异常不放宽 | ⭐⭐⭐ 必考 |
| LSP 在 TS 的体现 | 返回值协变、参数逆变；方法参数双变；数组协变是不健全妥协 | ⭐⭐⭐ 必考 |
| DIP ≠ DI ≠ IoC | DIP 是原则（为什么）、DI 是手段（怎么做）、IoC 是更宽范畴 | ⭐⭐⭐ 必考 |
| ISP vs SRP | SRP 拆实现（变化原因），ISP 拆契约（依赖范围）；拆完不等于按需实现 | ⭐⭐ 高频 |
| 接口拆小 ≠ ISP 达成 | `implements` 一堆小接口 + 空方法应付，只是把胖接口变成静默失败 | ⭐⭐ 高频 |
| LoD vs 链式调用 | 判据是「链上对象有没有换人」，`.setA().setB()` 不违反，`a.b.c` 违反 | ⭐⭐ 高频 |
| 组合优于继承 | 编译期绑定 vs 运行期绑定、白盒 vs 黑盒、N×M vs N+M | ⭐⭐⭐ 必考 |
| DRY 过度使用的后果 | 过早抽象 → 抽象长满开关 → 改一处坏两处，反而违反 YAGNI | ⭐⭐⭐ 必考 |
| 三次法则 | 第一次写、第二次复制、第三次才抽——第三次才能验证「变化方向一致」 | ⭐⭐ 高频 |
| 原则到模式的映射 | 原则是坐标系，模式是已知点；只记点不建坐标系，遇到新点就懵 | ⭐⭐ 高频 |
| 好代码七标准 | 可维护/可读/可扩展/灵活/简洁/可复用/可测试，且内部互相张力 | ⭐ 中频 |

> 💡 记住这条主线：**代码变难改，不是因为它写错了，而是因为它没有边界。** SOLID 的每一条都在教你圈变化点——SRP 圈出一个变化原因，OCP 让圈子能从外面扩展，LSP 保证圈里的替换成立，ISP 让圈子只露必要的口，DIP 让依赖都指向圈子中心。

---

## 📝 留个问题

打开你项目里**被修改次数最多的那个函数**（可以用 `git log --follow -p <file> | grep -c "^@@"` 粗略看一下改动频次），做一次「变化原因盘点」：

1. 它过去半年被改过几次？
2. 每一次改动的 commit message 描述的是什么原因？
3. 这些原因能归成几类？是同一类，还是混杂了好几类？

如果答案超过 1 类，那它就是本篇第一章那个「2000 行组件」的某个缩影——而你现在已经有七把尺子（五条 SOLID + 迪米特法则 + 合成复用）能量它了。把你的盘点结果写在评论区，我们一起看看大家的代码里住着几个变化原因 👇

---

## 参考资料

https://refactoring.guru/design-patterns （refactoring.guru 设计模式图解站，含 SOLID 专章与每种模式的 UML 图）

https://developer.mozilla.org/zh-CN/docs/Web/JavaScript （MDN，JS 语言特性与原型链的权威参考）

https://www.typescriptlang.org/tsconfig#strictFunctionTypes （TypeScript 官方 `strictFunctionTypes` 配置说明，参数逆变检查的准确范围）

https://www.typescriptlang.org/docs/handbook/type-compatibility.html （TypeScript 官方手册：类型兼容性、协变与逆变）

https://en.wikipedia.org/wiki/Liskov_substitution_principle （LSP 的词条与 1987 年原始表述来源）

《敏捷软件开发：原则、模式与实践》 Robert C. Martin 著（SOLID 五原则的权威出处，SRP 的「axis of change」定义在这里）

《设计模式：可复用面向对象软件的基础》 Erich Gamma 等四人组著，1994（GoF 23 种模式的权威出处）

《Head First 设计模式》 Eric Freeman 等著（案例驱动，适合入门后查漏补缺）

《JavaScript 设计模式与开发实践》 曾探 著（前端场景化讲解，中文资料首选）

> 推荐搜索关键词：「SOLID 原则 前端 举例」「单一职责 axis of change」「里氏替换原则 协变 逆变 TypeScript」「strictFunctionTypes 方法参数 双变」「依赖倒置 DIP IoC DI 区别」「组合优于继承 原因」「三次法则 Rule of Three DRY」「迪米特法则 链式调用」。

---

> 🔖 这是「前端设计模式」系列第 02 篇。上一篇：《UML 与设计模式全景图：从软件生命周期到 23 种模式分类（面试收藏级）》；下一篇预告：《单例模式：从 ESM 模块缓存到全局状态管理》
