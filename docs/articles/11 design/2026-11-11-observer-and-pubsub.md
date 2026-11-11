# 观察者与发布订阅模式：有没有中介，是解耦的分水岭（面试收藏级）

> **副标题**：全系列最高频也最容易答错的一道题，这一篇彻底讲清楚

面试官问：「观察者模式和发布订阅模式有什么区别？」你几乎不用想就能答：「观察者是一对多依赖，发布订阅是解耦。」他点点头，接着问了一句：「那观察者模式不也解耦了吗？它到底比发布订阅「少」在哪？」你愣住了。缺口就在这一个「中介」上——**观察者模式里，Subject 手里攥着所有 Observer 的名单，状态一变就挨个点名；发布订阅模式里，发布者和订阅者谁都不认识谁，中间隔着一个事件中心。** 有没有这个中介、双方是否互相知道对方存在，就是这道题的全部答案。这篇文章把这一个分水岭，从头拆到尾。

---

## 🎯 这篇文章解决什么问题

读完这篇，你应该能做到四件事：

- 一句话说清观察者与发布订阅的本质区别，且经得起「那观察者不也解耦了吗」这句追问。
- 手写两个东西：一个 Subject/Observer，一个带 `off`/`once` 的完整版 EventEmitter。
- 给 Vue 响应式、Redux subscribe、DOM addEventListener、Node EventEmitter 各自定性，不再把「订阅-通知」四个字一锅烩。
- 说清观察者如何靠 `unsubscribe` 避免内存泄漏，并认出五种最容易被混为一谈的概念。

全篇主线就一句：**有没有中介、双方是否互相知道对方存在。** 抓住这一句，这道全系列最高频的辨析题就永远答不错了。

---

## 一、场景切入：两个医疗信号，暴露两种耦合

先看两个你非常熟悉的业务场景，它们长得几乎一样，但底层结构完全不同。

**场景一：医生改病历，三个组件要联动。** 医生在病历编辑器里改完一段主诉，页面上的「病历摘要卡片」要刷新，「用药提醒」要重新计算，「随访计划」要更新时间线。如果让病历模块直接持有这三个组件的引用，改完数据后挨个调用它们的方法，耦合度极高——病历模块得知道「有哪三个组件、各自提供什么方法」，以后每加一个联动组件，都要回来改病历模块。

**场景二：医患 IM，新消息到达。** 一条新消息进来，聊天窗口要显示、未读计数要 +1、通知栏要弹提示。这三个模块**完全不知道彼此的存在**，它们各自只做一件事：向消息中心登记「有新消息时通知我」。消息到达时，也只有一个动作：往消息中心投递一条事件。至于谁在听、听了几个人，消息的发送方一概不知。

这两个场景，本质都是「一对多通知」，但区别在于：**场景一里，发出方认识每一个接收方；场景二里，发出方和接收方互不相识。** 前者是观察者模式，后者是发布订阅模式。下面把这个区别放大看。

🔧 **真实场景**：场景一常见于「模块内联动的表单/详情页」——发出方和接收方在同一个业务域里，彼此本就认识；场景二常见于「跨模块通信」——未读计数团队和聊天窗口团队可能根本不在一个仓库，谁都不该依赖谁。

> 💬 **面试官**：能举个你项目里同时用到这两种模式的例子吗？
> ✅ **标准答案**：模块内部的状态联动用观察者（一个模型变了，它名下的几个视图跟着刷新）；跨模块、跨团队的消息广播用发布订阅（各模块只依赖事件总线，不依赖彼此）。
> 🎁 **加分答案**：能点出「选择哪一种，取决于你希望双方耦合到什么程度」——如果接收方本来就是发出方自己管理的子模块，用观察者更直接；如果接收方随时可能被替换、删除、新增，且发出方不该感知，就必须走中介。

---

## 二、意图与本质：解耦「状态变化」与「响应逻辑」

先把两种模式的定义摆出来，再抽共同点。

### 观察者：Subject 直接持有 Observer 列表

观察者模式定义了一种**一对多的依赖关系**：一个目标对象（Subject）维护一个观察者（Observer）列表，当它的状态变化时，**直接遍历调用**每个 Observer 的更新方法。

关键在「直接」两个字：Subject 知道 Observer 的存在——它手里就攥着这份名单。所以这是一种**双方耦合**，哪怕耦合度很低（Subject 只依赖 Observer 接口，不依赖具体实现）。

### 发布订阅：经过中介，双方互不相识

发布订阅模式里，发布者（Publisher）和订阅者（Subscriber）**不直接认识**，通过一个中介（Event Channel / Broker / EventBus）传递消息。

发布者把事件丢给中介，中介把事件分发给所有订阅了这个事件的人。发布者不知道有没有人在听，订阅者也不知道是谁在发。这是**完全解耦**。

### 共同点：都体现了开闭原则

两种模式要解决的，其实是同一个问题：**把「状态变化」和「响应状态变化的逻辑」解耦**，让新增响应逻辑时，不需要修改状态产生方的代码。

这一点就是开闭原则（OCP）的直接落地——新增一个「用药提醒」组件，病历模块一行都不用改，这就是对扩展开放、对修改关闭。

> 💬 **面试官**：观察者模式和发布订阅模式的本质区别是什么？
> ✅ **标准答案**：有没有中介、双方是否互相知道对方。观察者模式的 Subject 直接持有 Observer 列表并逐个通知，双方是直接关联的；发布订阅模式里发布者和订阅者都只认识事件中心，互不知道对方存在。
> 🎁 **加分答案**：能补一句「区别不在『有没有解耦』，而在『解耦发生在哪个维度』」——观察者解耦的是「变化」和「响应」，但发出方仍持有接收方引用；发布订阅把「发出方对接收方的引用」也一并抽掉了，所以才能做到跨模块、跨进程、跨机器。

---

## 三、结构与角色：多一层中介，就是分水岭

把两种模式的角色摆在一起看，区别一目了然。

### 观察者模式的两个角色

笔记里用「老师提问，学霸举手、学渣逃跑」这个例子画了类图：`Teacher` 是 Subject，`Student`（以及它的两个子类 `XueBa`、`XueZha`）是 Observer。

![观察者模式类图](https://cdn.nlark.com/yuque/0/2021/png/738210/1638936868709-16ed1d42-8fa1-4ff5-b3af-1736471e6ea2.png)

图注：这张图里 `Teacher` 持有 `students: Array<Student>`，并通过 `notifyAllStudents()` 逐个调用学生的 `update()`；每个 `Student` 也反向持有 `teacher` 引用——**双方互相认识**，这正是观察者模式的标志。

角色只有两个：

- **Subject（主题/被观察者）**：维护观察者列表，提供 `attach` / `notify`，状态改变时通知所有登记过的观察者。
- **Observer（观察者）**：实现 `update` 接口，收到通知时自我更新。

### 发布订阅模式的三个角色

笔记里用「房东、中介、房客」画了类图：`Landlord`（房东）是发布者，`Agency`（中介）是事件中心，`Tenant`（房客）是订阅者。

![发布订阅模式类图](https://cdn.nlark.com/yuque/0/2021/png/738210/1638971024935-57418460-28fe-4822-9232-e00ce268565e.png)

图注：这张图里 `Landlord` 和 `Tenant` 都只持有 `agency`（中介）引用，房东不直接找房客、房客也不直接找房东——**双方都只认识中介**，这就是发布订阅的标志。

角色变成三个，多出来的那个就是中介：

- **Publisher（发布者）**：把事件发布到中介，不关心谁在订阅。
- **EventBus / Broker（中介/调度中心）**：维护「事件名 → 订阅者列表」的映射，负责接收发布、分发订阅。
- **Subscriber（订阅者）**：向中介登记自己关心的事件，事件到来时被中介回调。

标准结构图长这样（refactoring.guru 的 Observer 结构图，注意它的 `notify` 是 Subject 直接调用的）：

![观察者模式标准结构](https://refactoring.guru/images/patterns/diagrams/observer/structure.png)

图注：这是观察者模式的标准结构图——`ConcreteObserver` 实现 `Observer` 接口，`Subject` 通过 `notifyObservers()` 遍历调用每个 observer 的 `update()`。发布订阅模式则是在 `Publisher` 和 `Subscriber` 之间再加一层 `EventBus`。

### 一张表看透两种结构的差异

| 维度 | 观察者模式 | 发布订阅模式 |
|---|---|---|
| 角色数量 | 2 个（Subject + Observer） | 3 个（Publisher + EventBus + Subscriber） |
| Subject 是否持有 Observer 引用 | 持有 | 不持有（只持有 EventBus） |
| 双方是否互相认识 | 认识 | 互不认识 |
| 通知的发起者 | Subject 自己 | 中介中心 |

---

## 四、核心实现（观察者）：Subject 直接持有 Observer 列表

先看笔记里的完整实现——「老师提问」这个例子把观察者模式的骨架讲得最清楚。

```typescript
// 观察者 Observer
abstract class Student{
  constructor(public teacher: Teacher) {}
  // 每个观察者都有一个update方法，用来在被观察者对象更新的时候进行自我更新
  abstract update(): void;
}

class XueBa extends Student {
  update(): void {
    const state: string = this.teacher.getState()
    if(state.includes('提问')) {
      console.log(state, `🙋`);
    }
  }
}
class XueZha extends Student {
  update(): void {
    const state: string = this.teacher.getState()
    if(state.includes('提问')) {
      console.log(state, `🏃`);
    }
  }
}
```

下面是 Subject 一侧。注意 `notifyAllStudents()` 里那行 `this.students.forEach(s => s.update())`——**这就是「直接遍历调用」**：

```typescript
// 被观察者 Subject
class Teacher {
  public students: Array<Student> = [] ;
  private state: string = '讲课';
  // 收集依赖
  attach(student: Student){
    this.students.push(student);
  }
  // 通知更新
  notifyAllStudents(){
    this.students.forEach(s => s.update()); // 👈 直接遍历调用观察者
  }
  getState(){
    return this.state;
  }
  setState(state: string){
    this.state = state;
  }
  askQuestion() {
    this.setState('老师提问');
    this.notifyAllStudents();
  }
}
```

最后组装起来：

```typescript
const teacher = new Teacher();
teacher.attach(new XueBa(teacher));
teacher.attach(new XueZha(teacher));
teacher.askQuestion();
```

老师一提问，学霸举手、学渣逃跑——这就是观察者模式最朴素的样子。

### 推模型与拉模型：这个例子其实用的是「拉」

细看 `XueBa.update()`：它自己调 `this.teacher.getState()` 去拿状态。这种「观察者收到通知后，主动向 Subject 要数据」的方式，叫**拉模型（Pull）**。

还有一种**推模型（Push）**：Subject 在通知时直接把数据塞过去，`notify(state)`，观察者不用再回头取。下面用医疗场景写一个推模型的版本：

```typescript
// 观察者模式：Subject 直接持有 Observer（推模型）
interface Observer { update(data: MedicalRecord): void; }
class MedicalRecordSubject {
  private observers: Observer[] = [];
  subscribe(o: Observer) { this.observers.push(o); }
  notify(data: MedicalRecord) {
    this.observers.forEach(o => o.update(data)); // 👈 数据直接推给观察者
  }
}
```

两种模型的取舍很清楚：**推模型观察者拿数据方便，但被迫接收可能用不上的字段；拉模型观察者按需取数据，但 Subject 必须暴露 getter，且观察者知道得更多。** 面试里能说出「Teacher 例子是拉模型、`notify(data)` 是推模型」，是很有区分度的一点。

### 同步通知的陷阱：一个观察者挂了，全链崩

`notify` 里是同步 `forEach`，这埋着一个真实的生产事故：**如果某个 Observer 的 `update` 抛异常，遍历直接中断，排在它后面的 Observer 收不到通知。**

```typescript
notify(data: MedicalRecord) {
  this.observers.forEach(o => o.update(data));
  // ❌ o1.update() 抛异常 → o2、o3 收不到通知，且异常一路冒泡
}
```

两个常见对策：

```typescript
// 方案一：每个观察者单独 try/catch，隔离异常
notify(data: MedicalRecord) {
  this.observers.forEach(o => {
    try { o.update(data); } catch (e) { console.error('observer failed', e); }
  });
}

// 方案二：先拷贝再遍历，防止 notify 过程中 subscribe/unsubscribe 改变数组
notify(data: MedicalRecord) {
  [...this.observers].forEach(o => o.update(data)); // 👈 遍历的是快照
}
```

第二个坑更隐蔽：如果某个观察者的 `update` 里反过来 `subscribe` 或 `unsubscribe`，正在遍历的数组长度变了，轻则漏通知、重则越界。先拷贝一份快照再遍历，是最省事的防御。

> 💬 **面试官**：手写一个观察者模式，然后说说通知时要注意什么？
> ✅ **标准答案**：Subject 维护 `observers` 数组，`subscribe` 收集、`notify` 遍历调用。通知时要注意两点——单个观察者异常不应影响其他观察者，以及通知过程中列表可能被修改。
> 🎁 **加分答案**：能主动区分推模型和拉模型，并说清「遍历前先拷贝快照、单个 observer 套 try/catch」这两处工程细节，说明你不是背模板，而是真的上线用过。

---

## 五、核心实现（发布订阅）：从简版到完整手写 EventEmitter

发布订阅多了一层中介，实现上就是把「事件名」和「订阅者列表」挂在一张表上。先看笔记里的简版：

```typescript
// const EventEmitter = require('events');

class EventEmitter {
  _event: any = {};
  constructor() {}
  on(type: string, listener: Function) {
    if(!this._event[type]) {
      this._event[type] = [listener];
    } else {
      this._event[type].push(listener);
    };
  }
  emit(type: string, ...rest: any[]) {
    if(this._event[type]?.length) {
      this._event[type].forEach((l: Function) => l(...rest));
    }
  }
}
```

用法：

```typescript
const subject = new EventEmitter();

subject.on('click', (name: string, age: number) => {
  console.log(1, name, age)
});

subject.on('click', (name: string, age: number) => {
  console.log(2, name, age)
});
subject.emit('click', 'test', 18);
```

这个简版已经体现了核心：`on` 往 `_event[type]` 里塞回调，`emit` 按 type 取出回调逐个执行。但它少了三样面试必问的东西：`off`（取消订阅）、`once`（只触发一次）、以及 Node 里那些防御性细节。

### 完整版：把 off / once / 上限告警补上

面试手写 EventEmitter，下面这版基本是标准答案的骨架：

```typescript
class EventEmitter {
  private events = new Map<string, Array<(...args: any[]) => void>>();

  on(event: string, cb: (...args: any[]) => void) {
    const list = this.events.get(event) ?? [];
    list.push(cb);
    this.events.set(event, list);
    return this; // 👈 支持链式调用
  }

  once(event: string, cb: (...args: any[]) => void) {
    const wrapper = (...args: any[]) => { // 👈 用包装函数自动 off
      this.off(event, wrapper);
      cb(...args);
    };
    return this.on(event, wrapper);
  }

  off(event: string, cb: (...args: any[]) => void) {
    const list = this.events.get(event);
    if (!list) return this;
    this.events.set(event, list.filter(f => f !== cb)); // 👈 按引用移除
    return this;
  }

  emit(event: string, ...args: any[]) {
    const list = this.events.get(event);
    if (!list?.length) return false;
    [...list].forEach(cb => cb(...args)); // 👈 拷贝快照，防止中途增删
    return true;
  }
}
```

`once` 的实现最值得讲：它注册的不是原回调，而是一个**包装函数**——触发时先把包装函数自己 `off` 掉，再执行真正的回调。这样原回调只跑一次。

### Node 里那几处防御，是加分项

Node 原生 `EventEmitter` 比这多了两处防御，面试提到就是加分：

- **`maxListeners` 告警**：同一个事件注册超过 10 个监听器时，控制台打印警告——防止「每次渲染都 `on` 一次，监听器悄悄累积」的泄漏。
- **`error` 事件**：`emit('error', ...)` 时如果没有人监听 `error`，直接抛出异常——否则错误会被静默吞掉。

这两处都指向同一个主题：**订阅是累积的，必须有人为它负责清理。** 这也引出了第七节的内存泄漏。

### 房东中介房客：发布订阅的绝佳类比

笔记里这段「房东找中介、房客找中介」的代码，是理解「双方互不认识」最好的例子：

```typescript
// 房东
class Landlord {
  constructor(public agency: Agency) {}
  // topic：房子类型，area：面积，money：租金
  lend(topic: string, area: number, money: number) { // 出租房屋
    this.agency.publish(topic, area, money); // 让中介发布出租信息
  }
}

// 中介
class Agency {
  public topics: Record<string, any> = {};
  subscribe(topic: string, listener: Function) {
    let listeners: any[]|undefined = this.topics[topic];
    if(listeners) {
      listeners.push(listener);
    } else {
      this.topics[topic] = [listener];
    }
  }
  publish(topic: string, ...rest: any[]) {
    const listeners = this.topics[topic] || [];
    listeners.forEach((l: Function) => l(...rest) );
  }
}
```

房客只认中介，房东也只认中介：

```typescript
// 房客
class Tenant {
  constructor(public name: string,  public agency: Agency) {}
  // topic：房子类型
  order(topic: string) { // 租房
    this.agency.subscribe(topic, (area: number, money: number) => {
      console.log(`我是 ${this.name}，租房意愿为：房型：${topic}, 面积：${area}, 租金：${money}`);
    }); // 找中介租房子
  }
}

const agency = new Agency();
const landlord = new Landlord(agency);
const robin = new Tenant('robin', agency);
const tom = new Tenant('tom', agency);
robin.order('别墅');
robin.order('单间');
tom.order('单间');
landlord.lend('别墅', 500, 10000);
landlord.lend('单间', 30, 2000);
```

注意一个细节：房东发布「别墅」时，只有 robin 一个人订阅了别墅，所以只有 robin 收到；发布「单间」时 robin 和 tom 都收到了。**发布者完全不知道、也不关心谁在听**——这正是发布订阅和观察者最大的区别，在这个例子里被具象化了。

> 💬 **面试官**：手写一个 EventEmitter，实现 on、emit、off、once。
> ✅ **标准答案**：内部用一个 `Map<事件名, 回调数组>`，`on` 追加回调，`emit` 取出按序执行，`off` 按引用过滤移除，`once` 用一个包装函数在执行时先 off 自己再执行原回调。
> 🎁 **加分答案**：能补两点——`emit` 遍历前先拷贝快照（防止回调里再 on/off 改变数组），以及 `once` 的 `off` 要针对「包装函数」而非原回调（否则一次性语义失效）。

---

## 六、易混淆辨析：五组最容易答错的概念

这是全篇密度最高的地方。下面五组概念，每一组都能在面试里单独出一道题。

### 观察者 vs 发布订阅（核心中的核心）

笔记里这张对比图把两者并排画了出来：

![观察者与发布订阅对比](https://cdn.nlark.com/yuque/0/2021/png/738210/1638960508917-4a8bf2c0-efa6-4353-88d4-451539193dff.png)

图注：这张图对比了两种结构——左边观察者模式里 Subject 直接 FireEvent 给 Observer，右边发布订阅模式里 Publisher 和 Subscriber 都只连到 EventChannel，事件由频道统一分发。

一句话判据：**观察者模式是 Subject 与 Observer 直接关联（Subject 的 `notify` 里遍历 `this.observers`），发布订阅模式多了一层中介（Publisher 和 Subscriber 都只认识 EventBus，不认识对方）。**

判断时问自己三个问题：

- 发出方手里有没有接收方的引用？有 → 观察者；没有 → 发布订阅。
- 接收方知不知道是谁通知我的？知道 → 观察者；不知道 → 发布订阅。
- 两者之间有没有一个独立的事件中心？有 → 发布订阅；没有 → 观察者。

### Vue 响应式属于哪种

**Vue2 的 `Dep` / `Watcher` 更贴近观察者模式**：每个响应式属性有一个 `Dep` 实例，`Dep` 直接持有订阅它的 `Watcher` 列表，`setter` 触发时直接 `dep.notify()` 遍历通知——这就是「Subject 直接持有 Observer 列表」的结构。

**Vue3 的 `track` / `trigger` / `effect`** 做了重构，但它的 `targetMap → depsMap → dep` 仍然是「依赖收集 → 触发通知」的观察者骨架。这一块的源码级实现（Proxy、副作用函数、依赖清理）属于《Vue 3 源码》系列响应式篇的范畴，这里不展开——本篇只交付一个结论：**Vue 的响应式系统，本质是观察者模式，而不是发布订阅模式。**

### 发布订阅 vs 中介者

两者都「多了一个中间对象」，但方向完全不同：

- **发布订阅**：中介（EventBus）做的是**单向广播**——发布者 → 中介 → 订阅者，消息单向流动，订阅者之间互不交互。
- **中介者**：中介做的是**双向协调**——多个 Colleague 对象之间复杂的交互逻辑，全部收敛到 Mediator 里，由它编排谁该在什么时候做什么。

判据：这个中间对象是在「广播消息」，还是在「编排多个对象的交互」？前者是发布订阅，后者是中介者。中介者模式的完整讲解见本系列第 16 篇。

### 观察者 vs 回调

观察者模式维护的是一个**列表**（多个观察者，一对多）；回调是一个**单个函数**（一个调用方，一对一）。

所以 `fetch().then(cb)` 是回调，不是观察者；`emitter.on('data', cb)` 是观察者/发布订阅，因为 `data` 上可以挂多个 `cb`。**「能不能挂多个」是一个快速的区分线。**

### 框架生命周期钩子 ≠ 观察者

React 的 `componentDidMount`、Vue 的 `mounted`，名字上像「订阅了某个事件」，但它们不是观察者模式。

原因是：**这些钩子是框架在固定时机主动调用的，你没有「订阅」这个动作，也没有「取消订阅」这个动作，更没有「多个钩子挂在同一个事件上」的结构。** 它是框架在组件生命周期里预留的扩展点，不是观察者模式的实例。笔记里那几张 React / Vue 生命周期图，记录的是「框架在什么阶段调用你」，属于框架机制，不是模式。

> 💬 **面试官**：Vue 的响应式系统属于观察者模式还是发布订阅模式？Node 的 EventEmitter 算观察者吗？
> ✅ **标准答案**：Vue 响应式（尤其 Vue2 的 Dep/Watcher）是观察者模式——Dep 直接持有 Watcher 列表并 notify。EventEmitter 更贴近发布订阅——发布者和订阅者都只认识 emitter 这个中介，通过事件名解耦。
> 🎁 **加分答案**：能点出「EventEmitter 是边界案例」——它和观察者一样是「订阅-通知」，但多出了「事件名」这个中介维度，订阅者按事件名注册、发布者按事件名发布，双方互不感知，所以归发布订阅更准确。能主动辨析「回调 vs 观察者」「生命周期钩子 vs 观察者」，说明你的判断不是靠背名词。

---

## 七、前端工程落地：你天天在用，但结构归属不同

这一节把笔记里的工程案例逐个过一遍，重点说清**每个 API 背后的结构归属**——这是面试里「表面都是订阅，底层各不同」的考察点。

### DOM addEventListener：附着在具体对象上

原生 DOM 事件绑定是最典型的「订阅-通知」：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>观察者模式</title>
</head>
<body>
  <button id="btn">click</button>
  <script>
    const btn = document.getElementById('btn');
    const handler1 = () => console.log('handler1');
    const handler2 = () => console.log('handler2');
    const handler3 = () => console.log('handler3');
    btn.addEventListener('click', handler1);
    btn.addEventListener('click', handler2);
    btn.addEventListener('click', handler3);
  </script>
</body>
</html>
```

jQuery 时代也长一样：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>观察者模式</title>
  <script src="https://cdn.staticfile.org/jquery/1.10.2/jquery.js"></script>
</head>
<body>
  <button id="btn">click</button>
  <script>
    const btn = document.getElementById('btn');
    const handler1 = () => console.log('handler1');
    const handler2 = () => console.log('handler2');
    const handler3 = () => console.log('handler3');
    $('#btn').click(handler1).click(handler2).click(handler3);
    $('#btn').on('click', handler1).on('click', handler2).on('click', handler3);
  </script>
</body>
</html>
```

归属判断：`addEventListener` 的「事件目标」是一个具体的 DOM 对象，监听器挂在这个对象身上——它更接近**观察者**（目标对象直接持有监听器列表）。但它没有「Subject 主动通知」的业务语义，事件由浏览器事件系统派发，所以严格说它是「事件系统对观察者思想的落地」。

### Promise 的 then：手写简版里的观察者影子

笔记里有一个极简的 Promise 实现，值得一看——`resolve` 时遍历 `successes` 逐个执行，这恰好是观察者模式「收集回调 → 逐个通知」的结构：

```typescript
class Promise {
  successes: Array<Function> = [];
  constructor(task: Function) {
    const resolve = (...args: []) => {
      this.successes.forEach(success => success.apply(this, args));
    }
    task(resolve);
  }
  then(success: Function) {
    this.successes.push(success);
  }
}

const promise = new Promise((resolve: Function) => {
  setTimeout(() => {
    resolve('state success');
  }, 1000);
}).then((data: any) => console.log(data));
```

不过这只是「结构上的相似」。真正的 Promise 是状态机 + 微任务调度，和观察者模式解决的问题不同，别把「都有回调队列」当成「是同一个模式」。

### jQuery Callbacks：一个可管理的回调队列

jQuery 1.7 新增的 `jQuery.Callbacks()` 返回一个管理回调列表的对象，能增、删、触发、禁用回调。笔记里的手写版：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>观察者模式</title>
  <script src="https://cdn.staticfile.org/jquery/1.10.2/jquery.js"></script>
</head>
<body>
  <script>
    function Callbacks() {
      let observers = [];
      return {
        add(fn) {
          observers.push(fn);
        },
        remove(fn) {
          observers = observers.filter(f => f !== fn);
        },
        fire() {
          observers.forEach(fn => fn());
        }
      }
    }
    // const callbacks = $.Callbacks();
    const callbacks = Callbacks();
    const a1 = () => console.log('a1');
    const a2 = () => console.log('a2');
    const a3 = () => console.log('a3');
    callbacks.add(a1);
    callbacks.add(a2);
    callbacks.add(a3);
    callbacks.remove(a3);
    callbacks.fire();
  </script>
</body>
</html>
```

`Callbacks` 的本质就是一个**函数队列**，它同时是观察者（收集回调、逐个触发）和发布订阅（有 `add`/`remove`，像一个小型事件中心）的合体。这正是「模式是思想，API 是落地」的体现——一个工具可以同时体现多种模式。

### Redux createStore：subscribe 返回 unsubscribe

Redux 的 `createStore` 是最值得记住的前端案例，因为它同时演示了观察者模式和「如何避免内存泄漏」：

```typescript
/**
 * 永远只有一个仓库，状态也只有一个
 */
export default function createStore(reduce: any, preloadedState: any) {
  const currentReduce = reduce; // 当前的reduce
  let currentState = preloadedState; // 当前状态
  let currentListeners: any[] = []; // 订阅池

  // 派发动作，修改state
  const dispatch = (action: any) => {
    currentState = currentReduce(currentState, action);
    currentListeners.forEach(listener => listener())
    return action
  }

  // 获取当前的state
  const getState= () => {
    return currentState;
  }

  // 订阅
  const subscribe = (listener: Function) => {
    currentListeners.push(listener)
    return function unsubscribe() { // 👈 关键：返回取消订阅函数
      currentListeners = currentListeners.filter(l => l !== listener);
    }
  }
  dispatch({type: '@@redux/INIT'})

  return {
    dispatch,
    getState,
    subscribe
  }
}
```

`subscribe` 返回一个 `unsubscribe` 函数，这个设计是防内存泄漏的关键，后面专门讲。

### Node EventEmitter / 流 / HTTP 服务器

Node 的 `EventEmitter` 是发布订阅的典范，笔记里的流和 HTTP 服务器都是它的应用：

```typescript
const fs = require('fs');
const rs = fs.createReadStream('./02-dom.html', {highWaterMark: 15}); // 每次读取15个字节
rs.on('data', (data: Buffer) => {
  console.log(data.toString('utf8'))
});

rs.on('end', () => {
  console.log('end');
})
```

HTTP 服务器也是同一个东西：

```typescript
const http = require('http');

// const app = http.createServer((req: any, res: any) => {
//   res.end('8088');
// });

// 等同上面代码
const app = http.createServer();
app.on('request', (req: any, res: any) => {
  res.end('8088 2');
});
app.listen(8088);
```

归属判断：这些都属于**发布订阅**——`on` 按事件名注册、`emit` 按事件名派发，发布方和订阅方都只认识 emitter 这个中介。

### Vue EventBus：跨组件通信的发布订阅

Vue 2 里常拿一个空的 Vue 实例当事件总线：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Bus</title>
  <script src="https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.js"></script>
</head>
<body>
  <script>
    const EventBus = new Vue();
    EventBus.$on('customEvent', name => console.log(1, name));
    EventBus.$on('customEvent', name => console.log(2, name));
    EventBus.$emit('customEvent', 'test')
  </script>
</body>
</html>
```

`$on` 和 `$emit` 是标准的发布订阅。但 EventBus 有个致命问题——**`$on` 之后如果忘了 `$off`，组件销毁后监听器还挂在那儿，闭包里的组件引用无法回收**。这就是下一小节要解决的。

### Vue 响应式：Dep 直接 notify，是观察者

笔记里这段极简响应式实现，把观察者模式的核心暴露得最干净：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>观察者模式</title>
</head>
<body>
  <div id="name"></div>
  <div id="age"></div>
  <script>
    const name = document.getElementById('name');
    const age = document.getElementById('age');

    class Dep {
      subs = [];
      addSub(sub) {
        this.subs.push(sub);
      }
      notify() {
        this.subs.forEach(sub => sub());
      }
    }
    function observe(target) {
      const dep = new Dep();
      Object.keys(target).forEach(key => {
        let val = target[key];
        if(key === 'name') {
          name.innerHTML = val;
          dep.addSub(() => name.innerHTML = val);
        }
        if(key === 'age') {
          age.innerHTML = val;
          dep.addSub(() => age.innerHTML = val);
        }
        Object.defineProperty(target, key, {
          get() {
            return val;
          },
          set(newVal) {
            val = newVal;
            dep.notify();
          }
        });
      })
    }
    const data = {name: 'test', age: 18};
    observe(data);
    setTimeout(() => {
      data.name = 'robin';
    }, 2000);
    setTimeout(() => {
      data.age = 30;
    }, 4000);
  </script>
</body>
</html>
```

`Dep` 就是那个 Subject，它 `addSub` 收集更新函数、`notify` 逐个执行——**Dep 直接持有订阅列表，没有中介**，这是判断它属于观察者而非发布订阅的决定性证据。

Vue 官方文档里那张「Render → Collect as Dependency → Notify → Re-render」的图，画的也是这个循环：

![Vue 响应式依赖收集](https://cdn.nlark.com/yuque/0/2021/png/738210/1638958610477-6c8b3559-384c-4e17-a818-d678c8346d33.png)

图注：这张图是 Vue 响应式的核心循环——Render Function 触发 getter 收集依赖（Collect），数据 setter 触发通知（Notify），Watcher 收到通知后重新渲染（Re-render）。注意这里的 Notify 是 Watcher 直接收到的，没有中间商。

### 内存泄漏：subscribe 必须配 unsubscribe

观察者/发布订阅最大的工程风险，就是**订阅了但忘了取消**。订阅回调里通常抓着组件的闭包引用，回调不释放，组件就永远回收不了。

前端里三种标准解法：

- **Redux**：`subscribe` 返回 `unsubscribe` 函数，组件卸载时调用。
- **React**：`useEffect` 里订阅，返回的 cleanup 函数里取消订阅。

```typescript
useEffect(() => {
  const unsubscribe = store.subscribe(handleChange);
  return unsubscribe; // 👈 组件卸载时自动取消订阅
}, []);
```

- **Vue**：`$on` 配 `$off`，`beforeDestroy` 里把本组件注册的事件全部解绑。

```javascript
created() {
  EventBus.$on('refresh', this.onRefresh);
},
beforeDestroy() {
  EventBus.$off('refresh', this.onRefresh); // 👈 必须配对
}
```

判据就一句：**有 `subscribe` / `on` / `addEventListener` 的地方，就必须有对应的 `unsubscribe` / `off` / `removeEventListener`。** 少一个，就多一条泄漏。

> 💬 **面试官**：观察者模式如何避免内存泄漏？
> ✅ **标准答案**：`subscribe` 返回一个 `unsubscribe` 函数，组件/模块卸载时调用它，把监听器从列表里移除。否则 Subject 长期持有 Observer 的引用，Observer 无法被垃圾回收。
> 🎁 **加分答案**：能点出泄漏的根源——不是「列表没清」，而是「回调闭包里抓了组件的引用」，所以只要回调还挂在 Subject 上，组件就活着。React 的 `useEffect` cleanup、Vue 的 `$off` 配对，本质都是「订阅与取消订阅成对出现」这条纪律的框架化。

---

## 八、跨进程与消息队列：发布订阅的分布式形态

前面讲的 EventBus、EventEmitter，都是**同一个进程内**的内存事件。但发布订阅真正的威力，在于它能跨越进程、跨越机器。

### Redis 发布订阅：最直观的跨进程案例

Redis 的 pub/sub 是一种消息通信模式：发布者（publisher）向频道（channel）发消息，订阅者（subscriber）订阅频道后收到消息。笔记里给了两张图和一段代码。

单频道订阅：

![Redis 单频道订阅](https://cdn.nlark.com/yuque/0/2021/png/738210/1638971739703-6b672265-d558-443e-a2ae-b8a1ce8e4ce2.png)

图注：发布者向「hello 频道」发布消息，三个订阅者（redis-cli）都收到了这条 hello——一个发布，多个订阅，频道就是那个中介。

多频道订阅：

![Redis 多频道订阅](https://cdn.nlark.com/yuque/0/2021/png/738210/1638971763214-f028b65c-9efc-4a49-a485-ae0c14e15609.png)

图注：发布者可以向不同频道发布，订阅者也可以同时订阅多个频道——频道的维度让不同消息流互不干扰。

代码（注意 redis 版本为 redis@3.1.2 才可运行）：

```javascript
// 注意 redis 版本为 redis@3.1.2 下面代码才可运行
const redis = require('redis');
const client1 = redis.createClient(6379, '127.0.0.1');
const client2 = redis.createClient(6379, '127.0.0.1');
const client3 = redis.createClient(6379, '127.0.0.1');
const client4 = redis.createClient(6379, '127.0.0.1');

client1.subscribe('channel_a');
client2.subscribe('channel_a');
client2.subscribe('channel_b');
client3.subscribe('channel_a');
client3.subscribe('channel_b');
client1.on('message', (channel, message) => {
  console.log('client1', channel, message);
});
client2.on('message', (channel, message) => {
  console.log('client2', channel, message);
})
client3.on('message', (channel, message) => {
  console.log('client3', channel, message);
})
client4.publish('channel_a', 'a_hello');
client4.publish('channel_b', 'b_hello');
```

### 从内存 EventBus 到消息队列，中间隔着一个「进程边界」

同进程内的 EventBus 和 Redis/MQ，结构上都是发布订阅，但能力完全不同：

| 维度 | 内存 EventBus | Redis / 消息队列 |
|---|---|---|
| 作用范围 | 单个进程内 | 跨进程、跨机器 |
| 消息可靠性 | 进程挂了消息就丢 | 可持久化、可重试 |
| 订阅者离线 | 错过就错过 | 可消费组、可补投 |

Kafka、RabbitMQ 这类消息队列，本质就是**发布订阅在分布式系统里的放大版**——加了 topic 分区、消息持久化、消费组、顺序保证这些企业级能力。前端工程师不必深入 MQ，但要知道：**你手写 EventEmitter 的 `on/emit`，和 Kafka 的 `subscribe/publish`，是同一个设计思想在不同尺度上的两个名字。**

🔧 **真实场景**：医患 IM 系统里，一条「新消息到达」可能同时要写进聊天窗口（前端）、更新未读计数（另一个服务）、触发推送（又一个服务）。跨进程时，前端内存里的 EventBus 就够不着了，这时消息总线（Redis pub/sub 或 MQ）就是那个「中介」。

> 💬 **面试官**：浏览器里的 EventBus 和 Redis 发布订阅有什么本质区别？
> ✅ **标准答案**：结构上都是发布订阅（有中介、双方解耦），区别在作用域和可靠性——EventBus 是单进程内存事件，进程结束消息即消失；Redis/MQ 是跨进程、跨机器的消息通道，可以持久化、可以离线订阅。
> 🎁 **加分答案**：能点出「观察者/发布订阅的思想是不变的，变的是中介的能力」——同进程用内存 Map，跨进程用网络通道，跨机房用带持久化和消费组的消息队列。能把这个「尺度」说清楚，说明你理解的是模式本身，不是某个具体 API。

---

## 💡 一张图总结（面试速记表）

| 要点 | 一句话内核 | 考察频率 |
|---|---|---|
| 观察者 vs 发布订阅 | 看有没有中介、双方是否互相知道对方 | ⭐⭐⭐ 必考 |
| 推模型 vs 拉模型 | 通知时塞数据，还是通知后自己取 | ⭐⭐ 高频 |
| Vue 响应式归属 | Dep 直接持有 Watcher 列表，是观察者 | ⭐⭐⭐ 必考 |
| EventEmitter 归属 | 按事件名经中介分发，是发布订阅 | ⭐⭐ 高频 |
| EventEmitter 手写 | on/off/once/emit + 快照遍历 | ⭐⭐⭐ 必考 |
| once 的实现 | 包装函数执行时先 off 自己 | ⭐⭐ 高频 |
| 内存泄漏 | subscribe 必须配 unsubscribe | ⭐⭐⭐ 必考 |
| 同步通知陷阱 | 单个 observer 异常隔离 + 快照遍历 | ⭐ 中频 |
| 回调 vs 观察者 | 单个函数 vs 一个列表 | ⭐ 中频 |
| 生命周期钩子 | 框架主动调你，不是观察者 | ⭐ 中频 |
| Redis / 消息队列 | 发布订阅的跨进程放大版 | ⭐⭐ 高频 |

> 💡 记住这条主线：**观察者和发布订阅的区别，从头到尾就一句话——有没有中介、双方是否互相知道对方。** Subject 手里攥着名单逐个点名，是观察者；所有人都只对着中间那个事件中心说话，是发布订阅。记住这一句，全系列最高频的辨析题就永远答不错了。

---

## 📝 留个问题

打开你手头项目，找出你封装的 EventBus 或某处 `addEventListener`，回答两个问题：

第一，它是观察者还是发布订阅？发出方手里有没有接收方的引用？第二，它的每一次 `subscribe` / `on`，都有对应的 `unsubscribe` / `off` 吗？

你会发现一个有意思的现象——**很多项目的 EventBus 里，订阅者注册了几十次，取消订阅的代码一次都没有**。这些「忘了取消」的回调，正悄悄地攥着那些早已卸载的组件，让它们永远回收不掉。把你找到的「泄漏点」写在评论区，我们一起看看谁的项目里躺着最多的幽灵订阅 👇

---

## 参考资料

- https://refactoring.guru/design-patterns/observer
- https://refactoring.guru/images/patterns/diagrams/observer/structure.png
- https://nodejs.org/api/events.html
- https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/addEventListener
- https://redux.js.org/api/store#subscribe
- https://www.runoob.com/redis/redis-pub-sub.html
- 《设计模式：可复用面向对象软件的基础》 Erich Gamma 等四人组著，1994
- 《JavaScript 设计模式与开发实践》 曾探 著

搜索关键词：GoF observer pattern、publish subscribe vs observer、EventEmitter source code、Vue reactive Dep Watcher、Redis pub sub、Observer pattern memory leak unsubscribe

---

> 🔖 这是「前端设计模式」系列第 11 篇。上一篇：《享元模式：从对象池到虚拟列表的节点复用》；下一篇预告：《策略模式：从表单校验到 Hook 封装的算法替换术》
