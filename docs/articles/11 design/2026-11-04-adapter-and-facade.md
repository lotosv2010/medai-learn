# 适配器与外观模式：包一层，改接口还是简调用（面试收藏级）

> **副标题**：适配器解决「接口不兼容」，外观解决「接口太复杂」——都是包一层，但目的不同

> 面试官合上简历，问了一个看起来很简单的问题：「适配器和外观，有什么区别？」
>
> 你答得很顺：「适配器是兼容旧接口，外观是简化调用。」
>
> 他点点头：「那你项目里用 axios 吧？axios 算哪个？」
>
> 「适配器。」你答得挺肯定。
>
> 「适配了什么？」
>
> 「适配了浏览器和 Node 环境，一个是 XMLHttpRequest，一个是 http 模块。」
>
> 他笑了一下：「既然它是在浏览器和 Node 两套 API 上面包一层，让调用方少关心细节——那为什么不是外观？」
>
> 你卡住了。
>
> 这个问题你从来没想过，因为你背下来的一直是「适配器 vs 外观」的**结论**，而不是区分它们的**判据**。结论能对付一道题，判据才能对付一串追问。

---

## 🎯 这篇文章解决什么问题

「包一层」是前端最常用的手法，也是最容易说不清的三个字。

同一个动作——在 A 外面套一个 B——可能落在五种完全不同的模式上：适配器、外观、代理、装饰器、中介者。它们在代码里长得几乎一样，判据却各不相同。而面试官最擅长的事，就是拿一个你熟悉的库（axios、Redux、React），让你给它归类，再问「为什么不是另一个」。

这篇文章只讲两个模式，但它们恰好是「包一层」家族里**最容易被互相误认的一对**：

- **适配器**（Adapter）——把不兼容的接口翻译成你期望的形状，让你能跟一个原本对不上的东西配合
- **外观**（Facade）——把一堆繁琐的入口收敛成一个，让你不必知道内部有几个模块

主线只有一句：

> **「包一层」只是手段，动机才是身份：适配器动的是接口的「形状」，外观动的是入口的「数量」。**

读完你会拿到四样东西：

- **一条从零到落地的适配器实现线**：三角色、类适配器 vs 对象适配器、判断"这段代码算不算适配器"的三把尺子
- **一份外观的完整使用边界**：三个最常见的误解、最容易踩的上帝类陷阱、以及问诊初始化这种"失败了怎么办"的工程级写法
- **21 个前端真实案例**：适配器 9 个（axios、toAxiosAdaptor、promisify、统一存储、IM 双供应商、Sequelize、多端请求、DTO 适配、SDK 版本共存）+ 外观 12 个（压缩 open、Redux createStore、函数重载、React/Vue createElement、Buffer.slice、enhancer 重载、configureStore、react-dom 入口、聚合 Hook、barrel 导出、polyfill），全部展开逐行讲
- **一张「包一层」五兄弟全景表**：一次讲清适配器 / 外观 / 代理 / 装饰器 / 中介者的分界线，把后面几篇的辨析提前串起来

---

## 一、场景切入：同样叫「包一层」，动机完全不同

先看两个医疗系统里几乎一定发生过的场景。它们都会让你产生"包一层"的冲动，但冲动底下的需求完全不是一回事。

### 痛点一：支付结果两套字段，业务代码被字段名绑架

医疗平台接了两条支付通道：支付宝和微信。两家的 SDK 返回结构长这样：

```typescript
// 支付宝：code 为 0 表示成功
const alipayRaw = { code: 0, msg: '交易成功', tradeNo: '2026110400001' };

// 微信：errcode 为 0 表示成功，别的都是错
const wxpayRaw = { errcode: 0, errmsg: 'OK', transaction_id: '4200001' };
```

注意这里有三处不一样——**字段名不一样**（`code` vs `errcode`）、**成功判定不一样**（虽然都是 `0`，但语义上一个是"错误码为 0"、一个是"错误码为 0"）、**业务单号字段不一样**（`tradeNo` vs `transaction_id`）。

不加适配器，你的业务代码会变成这样：

```typescript
// 👈 每调用一次支付，业务层都要"认识"两家 SDK
async function handlePay(order: Order, channel: 'alipay' | 'wxpay') {
  if (channel === 'alipay') {
    const res = await alipaySdk.pay(order);
    if (res.code === 0) {
      await markPaid(order.id, res.tradeNo);
      return { success: true, message: res.msg };
    }
    return { success: false, message: res.msg };
  } else {
    const res = await wxpaySdk.pay(order);
    if (res.errcode === 0) {
      await markPaid(order.id, res.transaction_id);
      return { success: true, message: res.errmsg };
    }
    return { success: false, message: res.errmsg };
  }
}
```

问题是**这种 `if` 会随着通道数量线性增长**。加一个医保支付，就是第三个分支；加一个银联，就是第四个。而且每个分支里都藏着"字段名翻译"和"成功判定"两处细节，一处写错就是线上事故。

上层真正想要的是什么？**「不管谁家的，给我一个 `{ success, message, tradeNo }` 就行」。** 把每家的差异挡在一个专门的转换器里——这就是适配器模式要解决的问题。

### 痛点二：问诊页初始化要碰五个子系统

第二个场景看起来相关，但需求完全不同。

用户点开问诊页，页面要准备好五件事：验证登录态、检查医生是否可接诊、建立 IM 长连接、创建订单草稿、预拉起支付。这五件事分散在五个不同的 service 里。

如果业务组件自己调，代码长这样：

```typescript
// 👈 组件里"知道"了五个子系统的存在和调用顺序
useEffect(() => {
  (async () => {
    await authService.verify(userId);
    await scheduleService.checkDoctorAvailable(doctorId);
    await imService.connect(userId);
    const draft = await orderService.createDraft(userId, doctorId);
    await payService.prepare(draft.id);
  })();
}, [userId, doctorId]);
```

这段代码有三处难受的地方：

- **组件被污染**：一个只负责渲染的组件，被迫知道了认证、排班、IM、订单、支付五个模块的名字
- **顺序被写死**：这五个调用有严格依赖（没验证登录态就不能建 IM 连接），顺序一旦要调整，得去组件里改
- **复用不了**：电话问诊页、视频问诊页也要这套初始化，只能复制粘贴

上层真正想要的是什么？**「我调一个 `initConsultation()`，剩下的你安排」。** 把子系统的编排收拢到一个统一入口——这就是外观模式要解决的问题。

### 两个痛点，两个问题

并排放一下，分界线立刻出来了：

| | 痛点一：支付通道 | 痛点二：问诊初始化 |
| --- | --- | --- |
| 纠结的问题 | 两家返回结构对不上，怎么统一 | 一次要碰五个模块，怎么收口 |
| 变化点 | 「适配谁」在变（加通道） | 「里面有几个模块」在变 |
| 被包的东西 | 通常 **1 个**（一家 SDK） | 通常 **一组**（五个子系统） |
| 对应模式 | 适配器 | 外观 |
| 一句话 | 改接口的**形状** | 减入口的**数量** |

**这张表就是全文的分界线。** 后面每一章，都会反复回到这两列。

---

## 二、意图与本质：一句话分界「形状」与「数量」

把上一章的结论提成两个定义。

### 适配器：把接口翻译成客户端期望的形状

> **适配器模式（Adapter Pattern）**，又称包装器模式：将一个类的接口转换成客户期望的另一个接口，使原本接口不兼容、不能在一起工作的类可以协同工作。

注意定义里三个关键点，缺一个都不算：

- **接口不兼容**：两端原本连类型都对不上，不改就编译不过或运行必炸
- **转换而非重写**：适配器自己不做业务，它只是把调用翻译过去，再由被适配者做事
- **不改变对方**：被适配的 SDK 一行都不能动（通常你也动不了，那是第三方）

### 外观：把一组入口收敛成一个

> **外观模式（Facade Pattern）**，又叫门面模式：为子系统中的一组接口提供一个一致的高层接口，让子系统更容易使用。

同样有三个关键点：

- **一对多**：门面背后是一组子系统，不是一个
- **提升抽象层次**：门面提供的是"业务语义"的接口（`initConsultation`），不是"技术动作"的接口（`connect`）
- **不禁止直连**：外观是**多开了一个入口**，不是把原来的入口封死

### 真正的分界线：形状 vs 数量

把两个定义压成一句话：

| | 适配器 | 外观 |
| --- | --- | --- |
| 动的是 | 接口的**形状** | 入口的**数量** |
| 被包对象 | 通常 1 个 | 一组子系统 |
| 被包对象能改吗 | 不能（改了就不用适配了） | 能，只是懒得让客户端知道 |
| 复杂度 | **不变**，只是从 A 形状平移成 B 形状 | **被降低**，客户端看到的变少了 |
| 不用的后果 | 类型对不上、编译不过、运行时炸 | 调用方能跑，但知道得太多、耦合太深 |
| 典型信号 | 「这两个接口对不上」 | 「调一个功能要碰五个模块」 |

**这张表里最容易被忽略的是「复杂度」那一行。** 适配器不降低复杂度——它只是把"两套不同协议"变成"一套你习惯的协议"，工作量一点没少。外观才真正降低复杂度——客户端要做的事从五步变成一步。

🔧 **真实场景**：一次处方流转改造，团队争论"要不要写个 `prescriptionAdapter`"。支持的人说"统一了字段，后面好维护"，反对的人说"这不就是加了一层吗"。争论到半夜才想清楚——他们要做的其实是**把三家医院的处方格式统一成我们内部的 `Prescription`**，这是适配器；而有人提的另一个方案"写个 `submitPrescription()` 把校验、签名、提交、回执四步包起来"，那是外观。**两个需求都没错，混在一起讨论就永远吵不完。**

> 💬 **面试官**：适配器和外观，本质上是在回答哪两个不同的问题？
>
> ✅ 标准答案：适配器回答的是「**两个接口对不上时，怎么让它们能配合**」——它把一个已有的接口转换成客户端期望的形状，被适配方通常改不了，所以只能在外层做翻译；变化维度是「接口的形状」。外观回答的是「**一堆接口太繁琐时，怎么让调用方少操心**」——它把若干子系统的调用编排成一个高层入口，变化维度是「入口的数量」。所以适配器是**翻译层**，外观是**简化层**，前者不降低复杂度，后者才降低。
>
> 🎁 加分答案：能补一句判据——「看被包对象有几个，以及接口的形状变没变」。被包的是一个、且接口形状变了 → 适配器；被包的是一组、且提供了新的更高层入口 → 外观。再加一句更锋利的：**适配器存在的理由是"我不能改你"，外观存在的理由是"你不必懂我"**。这两句分别对应了两个模式的动机，比背定义有效得多。

---

## 三、适配器：三角色、两种实现与三把尺子

这一章把适配器从"概念"讲到"能自己判断对不对"。

### 三个角色，一张图看懂

![适配器基础结构示意：旧代码和新代码都不用改，中间插入一个适配器完成接口转换](https://cdn.nlark.com/yuque/0/2021/png/738210/1638689958099-dc71677c-934b-40a5-aef9-d6851b79e130.png)

这张图的核心信息只有一句：**旧代码不用改，新代码也不用改，中间多一个适配器。**

生活类比最直观——你去欧洲旅行，墙上插座是欧标两圆孔，你的充电器是三脚插头，直接插不进去。你不会去换酒店的墙，也不会砸掉自己的充电器，你买一个转换头：

![欧洲壁式插座、交流适配器与美国标准插头的对照图，说明适配器把一个接口转换成另一个接口](https://cdn.nlark.com/yuque/0/2021/png/738210/1638690460817-3c26b1cd-a32d-49fd-9abd-c481b49ad2b9.png)

**转换头就是适配器。** 它不发电、不储电，只负责把"欧标两圆孔"翻译成"美标三脚"，让原本对不上的两端能通上电。

对应到代码里，三个角色是：

| 角色 | 职责 | 前端里的对应 |
| --- | --- | --- |
| **Target**（目标接口） | 客户端期望看到的接口 | 你自己定义的 `PayResult` |
| **Adapter**（适配器） | 实现 Target，内部持有并调用 Adaptee | `AlipayAdapter` |
| **Adaptee**（被适配者） | 已存在的、接口不兼容的那一方 | 支付宝 SDK 的返回值 |

### 最朴素的一个例子

![适配器类图：Socket 是被适配者，PowerAdapter 继承 Power 并持有 Socket，客户端只认识 Power 的 charge 方法](https://cdn.nlark.com/yuque/0/2021/png/738210/1638690264442-267a2806-c01b-46af-a9f3-09127b39a5d8.png)

上面这张类图对应下面这段代码。**它短到只有 20 行，但三角色齐全**：

```typescript
// 被适配的类（Adaptee）：只有 output()，输出 220V
class Socket {
  output() {
    return '220V';
  }
}

// 目标接口（Target）：客户端只认 charge()
abstract class Power {
  abstract charge(): string;
}

// 适配器（Adapter）：继承 Target，持有 Adaptee，在中间做转换
class PowerAdapter extends Power {
  constructor(public socket: Socket) {
    super();
  }
  charge(): string {
    return this.socket.output() + ' 转换为 24V';   // 👈 翻译动作发生在这里
  }
}

const p = new PowerAdapter(new Socket());
console.log(p.charge());   // '220V 转换为 24V'
```

逐行看这段代码里的三个角色：

- `Socket` 是 **Adaptee**：它只会 `output()`，不知道什么叫 `charge()`
- `Power` 是 **Target**：客户端世界里只有 `charge()` 这一个方法名
- `PowerAdapter` 是 **Adapter**：它 `extends Power` 满足接口，`constructor(public socket: Socket)` 把被适配者存在自己身上

**注意一个细节，容易看错**：`PowerAdapter` 用了 `extends`，但这不是"类适配器"。真正的类适配器是**通过多继承同时继承 Target 和 Adaptee**（Java、C++ 可以），而 JavaScript 没有多继承，所以这里的 `extends Power` 只是"满足接口"，真正拿到 Adaptee 能力靠的是 `public socket: Socket` 这个组合字段。

**这就是 JS 里 99% 的适配器写法：继承一个抽象 + 组合一个实例。** 名字上它叫"类适配器"，实际上它是"对象适配器"——这一点能在面试里说清，说明你不是在背名词。

### 类适配器 vs 对象适配器

![标准对象适配器结构图：Adapter 实现 Target 接口，同时持有一个 Adaptee 实例并转发调用](https://refactoring.guru/images/patterns/diagrams/adapter/structure-object-adapter.png)

这张是 GoF 的标准对象适配器图，和上面那段代码完全对应：Adapter 实现 Target（虚线空心三角），同时用一条箭头指向 Adaptee（组合）。它比上文的写法更"标准"，区别只在于 Target 用的是 interface 而不是 abstract class。

| 维度 | 类适配器 | 对象适配器 |
| --- | --- | --- |
| 实现方式 | **多继承** Target + Adaptee | **继承** Target + **组合** Adaptee |
| 语言要求 | 支持多继承（C++ / Java 的接口 + 类） | 任意语言 |
| 覆盖 Adaptee 行为 | 可以（重写父类方法） | 不能（只能转发） |
| JS 可行性 | ❌ 无多继承 | ✅ 主流写法 |

**一句话记住：JS 里写不出真正的类适配器。** 所以看到任何说"JS 的类适配器"的资料，你都知道它其实是"继承接口 + 组合实例"的对象适配器。这个判断本身就是个不错的面试加分点。

### 适配器到底在翻译什么：三把尺子

这是全篇最重要的判据——**判断一段代码"算不算"适配器，看它有没有真的翻译东西。**

很多人口中的"适配器"，其实只是起了个别名。比如把 `res.code` 改名成 `res.status`，别的什么都没动——那不是适配器，那是重命名。

真正的适配器，至少要在下面三把尺子里动一把：

| 尺子 | 翻译的是什么 | 例子 |
| --- | --- | --- |
| **字段名** | 同一个概念的不同叫法 | `code` → `success`；`tradeNo` → `tradeNo` |
| **值域语义** | 同一个概念的不同取值约定 | `0` / `200` / `'SUCCESS'` 都表示成功 |
| **调用形态** | 同步 / 异步 / 回调 / Promise 的差异 | Node 错误优先回调 → Promise |

**判据很干脆：三把尺子一把都没动，就不是适配器。** 这条判据后面会反复用到——它会帮你把笔记里几个"长得像适配器、其实是数据变换"的例子摘出来，也帮你在面试里顶住"这段代码凭什么算适配器"的追问。

### 完整落地：医疗支付统一结果

现在把痛点一做成一份能直接用的实现。先定 Target，再写两个 Adapter，最后加一张注册表。

**第一步：定义目标接口（Target）**

```typescript
// 👈 这是"客户端期望的形状"，全篇唯一的真相
interface PayResult {
  success: boolean;
  message: string;
  tradeNo: string;
}

interface PayAdapter {
  pay(order: { id: string; amount: number }): Promise<PayResult>;
}
```

**第二步：为每家 SDK 写一个适配器**

```typescript
// 支付宝 SDK 的原始返回值（不可修改，是第三方）
type AlipayRaw = { code: number; msg: string; tradeNo: string };

class AlipayAdapter implements PayAdapter {
  async pay(order: { id: string; amount: number }): Promise<PayResult> {
    const raw: AlipayRaw = await alipaySdk.pay(order);
    return {
      success: raw.code === 0,        // 👈 尺子二：值域语义
      message: raw.msg,               // 👈 尺子一：字段名
      tradeNo: raw.tradeNo,
    };
  }
}

// 微信 SDK 的原始返回值：字段名全不一样
type WxpayRaw = { errcode: number; errmsg: string; transaction_id: string };

class WxpayAdapter implements PayAdapter {
  async pay(order: { id: string; amount: number }): Promise<PayResult> {
    const raw: WxpayRaw = await wxpaySdk.unifiedOrder(order);
    return {
      success: raw.errcode === 0,
      message: raw.errmsg,
      tradeNo: raw.transaction_id,    // 👈 同一个业务单号，三种叫法
    };
  }
}
```

**第三步：一张注册表，业务层按名字取**

```typescript
// 👈 注册表把"有哪些通道"这个变化点收拢到一处
const payAdapters: Record<string, PayAdapter> = {
  alipay: new AlipayAdapter(),
  wxpay: new WxpayAdapter(),
};

export function pay(channel: string, order: { id: string; amount: number }) {
  const adapter = payAdapters[channel];
  if (!adapter) throw new Error(`unsupported pay channel: ${channel}`);
  return adapter.pay(order);
}
```

**现在的业务层长这样：**

```typescript
// 👈 一行，且永远不会因为"加了新通道"而改
const result = await pay(userSelectedChannel, order);
if (result.success) {
  await markPaid(order.id, result.tradeNo);
}
```

对比一下开头那个 `if-else` 版本，收益非常具体：

- **业务层不知道有几家通道**：加医保、加银联，业务层零改动，只在注册表里加一行
- **每家的差异被关在一个类里**：`WxpayAdapter` 里出了 bug，你不需要去搜全项目，只看这一个文件
- **TypeScript 帮你兜底**：所有适配器都 `implements PayAdapter`，返回结构少一个字段直接编译报错

这就是适配器最朴素的收益：**把"每种实现各自的差异"从"所有调用点"收拢到"一个类"里。**

> 💬 **面试官**：你怎么判断一段代码到底算不算适配器模式？
>
> ✅ 标准答案：看它有没有真的做**接口翻译**。具体用三把尺子衡量——① 字段名改变了（`errcode` → `success`）；② 值域语义改变了（`0` / `200` / `'SUCCESS'` 统一成 boolean）；③ 调用形态改变了（回调风格 → Promise 风格）。三把尺子至少动一把，才叫适配器；一把都没动只是改了个名字，那是重命名包装，不是设计模式。另外还要满足两个前置条件：被适配方**不能改**（通常是第三方 SDK 或老代码），且两端需要**长期共存**。
>
> 🎁 加分答案：能补一句「适配器不减少工作量，只减少调用方的认知负担」——真正的协议差异还是要在适配器里逐条处理，所以适配器不是"消除复杂度"，而是"把复杂度集中到一个已知的地方"。再加一句实战判断：如果被适配方你能随便改，那应该直接改它，别引入适配器；如果只适配一次、以后再也不换，那写个转换函数就够了，也不必上类。**模式是给"会持续变化"的场景准备的。**

---

## 四、外观：门面到底「门」在哪

讲完适配器，进入它的孪生兄弟。它俩的共同点只有"包一层"，其余全部不同。

### 三个角色与一张结构图

![外观模式结构图：客户端只与 Facade 打交道，Facade 内部聚合模块 A、B、C 三个子系统](https://cdn.nlark.com/yuque/0/2021/png/738210/1638973493295-82e3259c-bcb5-415d-849d-eea8bdadc7c0.png)

角色只有三个，而且关系非常单向：

| 角色 | 职责 |
| --- | --- |
| **Facade**（门面） | 熟悉子系统功能，按客户需求组合出高层接口 |
| **Subsystem**（子系统） | 实现具体功能，**对 Facade 的存在完全无感** |
| **Client**（客户端） | 只认 Facade，不关心背后有几个模块 |

生活类比：遥控器、自动驾驶汽车、房屋中介。

![标准外观模式结构图：Facade 对外提供一个统一入口，客户端不需要知道子系统里有几个模块、各自怎么调用](https://refactoring.guru/images/patterns/diagrams/facade/structure.png)

这张是 GoF 的标准门面结构图，和上面的客户端视角完全一致：**客户端只有一条连线，指向 Facade；子系统各自独立，不知道 Facade 的存在。** 注意图里没有任何一条线连到"客户端 → 子系统"——这不是画漏了，而是门面要表达的正是「默认没有这条线」。

**自动驾驶是最贴切的一个**：你踩一下油门，车自己决定发动机怎么给油、变速箱怎么换挡、ESP 要不要介入。你不知道也不需要知道——**一个踏板就是门面，"踩下去"就是那个高层接口。**

### 案例一：计算器把四个运算器收成一个

![计算器外观类图：Calculator 作为门面聚合加法、减法、乘法、除法四个子系统](https://cdn.nlark.com/yuque/0/2021/png/738210/1639029247017-a7be353a-6dff-4ad6-af03-474f49adec88.png)

```typescript
// 子模块：每个只做一件事
class Sum {
  sum(a: number, b: number): number {
    return a + b;
  }
}
class Minus {
  minus(a: number, b: number): number {
    return a - b;
  }
}
class Multiply {
  multiply(a: number, b: number): number {
    return a * b;
  }
}
class Divide {
  divide(a: number, b: number): number {
    return a / b;
  }
}

// 外观模块：把四个子模块挡在自己身后
class Calculator {
  private sumObj: Sum;
  private minusObj: Minus;
  private multiplyObj: Multiply;
  private divideObj: Divide;
  constructor() {
    this.sumObj = new Sum();
    this.minusObj = new Minus();
    this.multiplyObj = new Multiply();
    this.divideObj = new Divide();
  }
  sum(a: number, b: number): number {
    return this.sumObj.sum(a, b);
  }
  minus(a: number, b: number): number {
    return this.minusObj.minus(a, b);
  }
  multiply(a: number, b: number): number {
    return this.multiplyObj.multiply(a, b);
  }
  divide(a: number, b: number): number {
    return this.divideObj.divide(a, b);
  }
}

// calculator 就是门面，负责跟客户端交互，会在内部按需调用子模块或者说子系统
const calculator = new Calculator();
console.log(calculator.sum(1, 2));        // 3
console.log(calculator.minus(1, 2));      // -1
console.log(calculator.multiply(1, 2));   // 2
console.log(calculator.divide(1, 2));     // 0.5
```

这个例子里门面做的其实是**委托**——它没有实现任何运算，只是把调用转发给对应的子系统。这引出一个重要认知：**门面可以是"零逻辑的转发"，也可以是"带编排的组合"，两种都算外观。**

### 案例二：计算机一键启动三个部件

![计算机外观类图：Computer 作为门面，一次 startup 依次启动 CPU、内存、硬盘](https://cdn.nlark.com/yuque/0/2021/png/738210/1639035056526-d67f0112-9243-4dce-b6ce-1a004d8b1cb0.png)

```typescript
// 子模块
class CPU {
  startup() { console.log('打开CPU'); }
  shutdown() { console.log('关闭CPU'); }
}
class Memory {
  startup() { console.log('打开内存'); }
  shutdown() { console.log('关闭内存'); }
}
class Disk {
  startup() { console.log('打开硬盘'); }
  shutdown() { console.log('关闭硬盘'); }
}

// 外观模块
class Computer {
  private cpu: CPU;
  private memory: Memory;
  private disk: Disk;
  constructor() {
    this.cpu = new CPU();
    this.memory = new Memory();
    this.disk = new Disk();
  }
  startup() {
    this.cpu.startup();
    this.memory.startup();
    this.disk.startup();
  }
  shutdown() {
    this.cpu.shutdown();
    this.memory.shutdown();
    this.disk.shutdown();
  }
}

// computer 就是门面，负责跟客户端交互，会在内部按需调用子模块或者说子系统
const computer = new Computer();
computer.startup();   // 打开CPU → 打开内存 → 打开硬盘
computer.shutdown();
```

**这个案例比计算器更能体现外观的价值。** 计算器的门面只是"转发"，而 `Computer.startup()` 是真正的**编排**——它规定了启动顺序，这个顺序本身是知识，客户端不该也不需要知道。

一句类比就通：你按下电脑电源键，不会先给 CPU 上电、再给内存上电、最后给硬盘上电。你只按一个键。

### 三个最常见的误解

外观是"好懂但容易想歪"的那种模式。下面三条误解，每一条都能在面试里被追问出来。

**误解一：外观必须是一个 class。**

错。一个聚合函数就是外观。下面这段 `initConsultation` 完全符合外观定义：

```typescript
// 👈 没有 class，也是标准的外观
async function initConsultation(userId: string, doctorId: string) {
  await authService.verify(userId);
  await scheduleService.checkDoctorAvailable(doctorId);
  await imService.connect(userId);
  return orderService.createDraft(userId, doctorId);
}
```

外观的定义约束的是"**提供一个更高层的统一入口**"，不是"必须是一个类"。JS 里用一个函数、一个对象字面量、一个 module 的导出，都完全成立。

**误解二：用了外观就不能直接调子系统。**

错。外观是**多开一个入口**，不是把原入口封死。上面 `Calculator` 存在的同时，你依然可以 `new Sum().sum(1, 2)`。

这个特性很重要，因为它决定了外观的**适用范围**：外观适合"95% 的场景走它，5% 的特殊需求绕过去"，而不是"所有人都必须走它"。如果某一类调用大量绕过外观，那不是调用方不守规矩，是你的外观设计得不够用。

**误解三：外观会让子系统解耦。**

错。外观**只让客户端**不必认识子系统；子系统之间原本怎么耦合，一点没变。

```typescript
// 外观内部：三个子系统互相直接引用，耦合照旧
async function initConsultation(userId: string) {
  const auth = await authService.verify(userId);
  const schedule = await scheduleService.checkDoctorAvailable(auth.doctorId);  // 👈 直接依赖
  await imService.connect(auth.token, schedule.roomId);                        // 👈 还是直接依赖
}
```

外观是**对外的单向简化**，不负责**内部的双向解耦**。想让子系统之间也不互相认识，那是中介者（Mediator）的活——第 16 篇会专门对比这两个。

### 外观的代价：上帝类与能力遮挡

只说好处不看代价，就是八股。外观有两个真实的坑：

**坑一：Facade 长成上帝类。**

外观天然是"什么都能加进去"的地方。一开始它只是 `initConsultation()`，半年后变成：

```typescript
class ConsultationFacade {
  init() {}
  refresh() {}
  cancel() {}
  reschedule() {}
  sendMessage() {}
  uploadImage() {}
  refund() {}
  rate() {}
  // ……第 40 个方法
}
```

这时它已经从"门面"退化成"什么都知道的上帝类"，任何需求变更都要改它，所有开发者都在这个文件上冲突。

**判断信号**：如果 Facade 的方法数超过子系统数量，且方法之间没有共享的编排逻辑，那它已经该拆了——按业务场景拆成多个小 Facade（`ConsultationInitFacade` / `ConsultationChatFacade` / `ConsultationRefundFacade`）。

**坑二：能力被全挡住，特殊需求无路可走。**

如果门面把子系统彻底私有化（`private` 且不暴露），遇到"某个页面需要单独重连 IM"这种特殊需求时，你只能往门面里加方法——又回到坑一。

**所以外观的正确姿势是：门面负责主流程，同时不阻止直连子系统。** 这两条同时做到，外观才是"简化"而不是"独裁"。

### 工程级实现：问诊初始化怎么写才扛得住追问

回到痛点二。面试官看到 `initConsultation` 一定会问：「其中一个失败了怎么办？」

一个能扛住追问的版本，要处理三件事——**依赖顺序、能并行的并行、失败降级**：

```typescript
interface InitResult {
  ok: boolean;
  orderDraft?: { id: string };
  degraded: string[];    // 👈 降级了的环节，前端据此提示，而不是整页失败
}

class ConsultationFacade {
  async init(userId: string, doctorId: string): Promise<InitResult> {
    const degraded: string[] = [];

    // 第 1 步：必须先验登录态，失败直接终止（后面全依赖它）
    await authService.verify(userId);

    // 第 2 步：排班和 IM 之间没有依赖，并行（省一半时间）
    const [schedule, im] = await Promise.allSettled([
      scheduleService.checkDoctorAvailable(doctorId),
      imService.connect(userId),
    ]);

    if (schedule.status === 'rejected') {
      // 👈 医生不可接诊是硬失败，必须中断
      throw new Error('医生当前不可接诊');
    }
    if (im.status === 'rejected') {
      // 👈 IM 连不上是软失败，可降级：页面能看，只是聊不了
      degraded.push('im');
    }

    // 第 3 步：建草稿依赖前两步成功
    const draft = await orderService.createDraft(userId, doctorId);
    return { ok: true, orderDraft: draft, degraded };
  }
}
```

这段代码里有三个设计决策，每一个都能拿来说：

- **硬失败 vs 软失败分开**：医生不可接诊就中断（业务不允许），IM 连不上只降级（体验受损但能用）。**把所有失败一视同仁地 throw，是新手做法**
- **`Promise.allSettled` 而不是 `Promise.all`**：`all` 只要有一个 reject 就整体 reject，拿不到另一个的结果；`allSettled` 能拿到每个的成败，才做得了分级降级
- **降级信息作为返回值传出去**：前端要据此在页面上提示"当前无法使用在线咨询"，而不是静默失败

**这就是外观在工程里的真实形态：它不只"收敛入口"，它还承担了"编排策略"和"失败分级"。** 客户端的代码从 5 步变 1 步，省下来的复杂度并没有消失，而是被门面吸收并集中管理了——这是好事，因为它有了一个明确的、可测试的归属。

> 💬 **面试官**：外观模式违反开闭原则吗？
>
> ✅ 标准答案：要分两种情况看。如果新增的是**子系统的能力**（比如排班系统多了一个"查询医生评价"的接口），客户端直接调子系统即可，Facade 一行都不用改——这符合 OCP，因为外观本来就不负责覆盖子系统的全部能力。但如果新增的是**一个业务场景**、且必须经由 Facade 编排（比如新增"复诊"流程），那就要往 Facade 里加方法——这确实是对修改开放，违反了 OCP。
>
> 🎁 加分答案：能补一句「所以外观的合理边界是『主流程入口』，不是『全能力入口』」——Facade 只应该收敛高频、需要编排的流程，低频或单模块的能力应该让客户端直连子系统。能说出这一点，说明你不仅知道外观是什么，还知道它在哪里会坏掉。再加一句：外观本身并不天然耦合子系统，它也可以在内部面向接口编程，成为 DIP 的落地点。

---

## 五、前端工程落地（上）：适配器的八个影子

抽象讲透了，现在落地。这一章的案例分三类：**笔记里原有的**、**被替换进来的**、**补充的市面常见案例**。

### axios：整个库就是一坨适配器

这是前端最有说服力的案例，因为几乎每个人都用过，但很少有人想过它的结构。

先看一段"手写版 axios"，它把适配器思想完整暴露出来了：

```typescript
axios({
  url: 'http://localhost:8088/user/01',
  method: 'GET'
}).then(res => console.log(res), error => console.error(error));

// 适配器一：浏览器端，基于 XMLHttpRequest
function xhr(config: Record<string, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(config.method, config.url, true);
    request.onreadystatechange = function () {
      if (request.readyState == 4) {
        if (request.status == 200) {
          resolve(request.responseText);
        } else {
          reject('Error');
        }
      }
    };
    request.send();
  });
}

// 适配器二：Node 端，基于 http 模块
function http(config: Record<string, any>): Promise<any> {
  const http = require('http');
  const urlObj = new URL(config.url);
  return new Promise((resolve, reject) => {
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: config.method
    };
    const req = http.request(options, (response: any) => {
      const chunks: any = [];
      response.on('data', (chunk: any) => {
        chunks.push(chunk);
      });
      response.on('end', () => {
        const result = Buffer.concat(chunks).toString();
        resolve(result);
      });
    });
    req.on('error', (error: any) => {
      console.log(error);
      reject(error);
    });
    req.end();
  });
}

// 选择器：按运行环境决定用哪个适配器
function getDefaultAdaptor(config: Record<string, any>): Promise<any> {
  let adaptor!: Promise<any>;
  if (typeof XMLHttpRequest != 'undefined') {
    adaptor = xhr(config);
  } else if (typeof process != 'undefined') {
    adaptor = http(config);
  }
  return adaptor;
}

// Target 接口：不管是浏览器端还是 node 端，都是传入一个 config 对象，返回一个 promise
function axios(config: Record<string, any>): Promise<any> {
  const adaptor = getDefaultAdaptor(config);
  return adaptor;
}
```

再看真实 axios 的源码结构，思路一模一样：

```javascript
// axios/lib/defaults/index.js（v1 之前的路径是 lib/defaults.js）
function getDefaultAdapter() {
  var adapter;
  if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = require('./adapters/xhr');
  } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
    // For node use HTTP adapter
    adapter = require('./adapters/http');
  }
  return adapter;
}
```

为了能把上面那段"手写版 axios"跑起来，笔记里还配了一个极简的服务端——**它同时扮演了"浏览器端"和"Node 端"共同的目标接口**：

```typescript
const express = require('express');
const fs = require('fs');

const cache: Map<string, any> = new Map();
const app = express();

app.get('/user/:id', (req: any, res: any) => {
  const id = req.params.id;
  const user = cache.get(id);
  if (user) {
    res.json(user);
  } else {
    // 👈 Node 端适配器最终调的就是这里，走的是 fs 回调 + http 流
    fs.readFile(`./users/${id}.json`, 'utf8', (error: any, data: any) => {
      console.log(error, data);
      const user = JSON.parse(data);
      cache.set(id, user);
      res.json(user);
    });
  }
});

app.listen(8088);
```

这段服务端代码看着和适配器无关，但它恰好证明了适配器的价值：**同一个 `axios({ url, method })` 调用，在浏览器里落到 `XMLHttpRequest`，在 Node 里落到 `http`，最后都打到这同一个 `GET /user/:id` 上。** 客户端代码完全不知道自己在哪一端跑。

两个文件 `lib/adapters/xhr.js` 和 `lib/adapters/http.js`，各自导出同一个签名的函数：`(config) => Promise<response>`。

**这就是适配器最干净的一课：**

| 角色 | 在 axios 里是谁 |
| --- | --- |
| Target | `(config) => Promise<Response>` 这个约定 |
| Adapter | `adapters/xhr.js` / `adapters/http.js` |
| Adaptee | `XMLHttpRequest` / Node 的 `http` 模块 |

调用方永远只写 `axios(config).then(...)`，不用管自己在浏览器还是在服务器。而 `XMLHttpRequest` 和 `http` 这两套 API 在字段名（`status` vs `statusCode`）、调用形态（事件回调 vs 流式）、返回类型（字符串 vs Buffer）上完全对不上——**三把尺子，三把全动。**

**一个补充证据**：axios v1 之后，`adapter` 变成了可配置项——

```typescript
axios.create({ adapter: 'fetch' });   // 👈 显式指定用哪个适配器
```
能显式指定适配器的库，等于自己承认了"这就是适配器模式"。这个细节在面试里说出来，比背定义有说服力得多。

> 💬 **面试官**：axios 为什么算适配器模式的应用，而不是外观模式？
>
> ✅ 标准答案：因为 axios 干的事是**把一个接口翻译成另一个接口**——它统一了 `XMLHttpRequest`（浏览器）和 `http` 模块（Node）两套完全不同的 API，让调用方无论在哪都能用 `axios(config)` 拿到 Promise。三把尺子全动了：字段名（`status` / `statusCode`）、值域（错误处理方式完全不同）、调用形态（事件回调 → Promise）。而外观是"把一组子系统的入口收敛成一个"，axios 的 adapters 目录下每一个适配器都只包**一个**被适配者，且都输出**同一个**接口——这完全符合适配器的定义。
>
> 🎁 加分答案：能补一句「axios 里同时住着好几个模式，别把它们混成一件事」——`adapters/` 是适配器（翻译环境差异）；请求/响应拦截器是职责链（第 12 篇）；`axios.create()` 返回的实例复用配置，接近单例思路（第 02 篇）。**面试官问"axios 用了哪些设计模式"，标准答法是分层列举，而不是笼统说一个。**

### toAxiosAdaptor：把 jQuery 的老调用接到 axios 上

这是一个"渐进式迁移"的经典写法——项目原来全用 `$.ajax`，想换成 axios，但几千处调用点改不动。

```typescript
// 原来项目里面用的 jQuery，$.ajax
const $ = require('jquery');
const axios = require('axios');

function toAxiosAdaptor(options: any) {
  return axios({
    url: options.url,
    method: options.type      // 👈 尺子一：jQuery 叫 type，axios 叫 method
  }).then(options.success, options.error);   // 👈 尺子三：Promise → 回调
}

$.ajax = function (options: any) {
  return toAxiosAdaptor(options);
};

// 老代码一行不改，照常跑
$.ajax({
  url: 'http://localhost:8088/user/01',
  type: 'GET',
  success(data) {
    console.log(data);
  },
  error(error) {
    console.error(error);
  }
});
```

这段 10 行代码里最值得注意的不是字段对齐，而是 **`.then(options.success, options.error)`**。

它把"Promise 风格"又反向翻译回了"回调风格"。**这是一个双向外壳**：对外保持 jQuery 的调用约定（老代码不用改），对内用 axios 实现（新基础设施）。三把尺子里，它动了"字段名"（`type` → `method`）和"调用形态"（Promise ↔ 回调）两把——**标准适配器。**

🔧 **真实场景**：这类适配器在技术栈迁移时特别值钱。一个跑了五年的医疗项目要从 jQuery 迁到 axios，全量重写至少两周且风险极高。用 `toAxiosAdaptor` 覆盖掉 `$.ajax`，先把底层悄悄换掉，业务代码零改动，等稳住之后再逐个模块改成原生 axios 写法。**适配器的价值从来不是"优雅"，而是"让两个时代的东西能同时活着"。**

### promisify：把 Node 回调风格翻译成 Promise

```typescript
const fs = require('fs');

const readFile = promisify(fs.readFile);

(async function () {
  const content = await readFile('./package.json', 'utf8');
  console.log(content);
})();

function promisify(fn: any) {
  return function (filename: string, encoding: string) {
    return new Promise((resolve, reject) => {
      // 👈 把「(err, data) 回调」翻译成「resolve / reject」
      fn(filename, encoding, (error: Error, data: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    });
  };
}
```

这段代码只翻译了一把尺子——**调用形态**。但这一把足够关键：Node 的错误优先回调（`callback(err, data)`）和 Promise 在"错误怎么传"这件事上根本对不上，不翻译就没法 `await`。

补两个现代事实：

- Node 18+ 内置了 `util.promisify`，不用自己写
- `fs` 模块自带 `fs.promises.readFile`，连 promisify 都省了

**但这两个"官方替你做了"的事实，恰恰证明了适配器模式的普适性**——连运行时都觉得这个翻译太常用了，干脆把它固化进标准库。

### 统一存储适配器（替换原笔记的 computed 案例）

原笔记把 Vue 的 `computed` 算作适配器。**这里需要做一个诚实的修正**：`computed` 做的是"把 `data.name` 变成一个可读的派生属性"，它改变了**数据的表现形式**，但没有翻译任何**不兼容的接口协议**——三把尺子一把都没动。所以它更接近"计算/派生"，不是标准适配器。

把它换成一个真正符合适配器的市面案例：**统一存储适配器**。

问题背景：同一个业务代码，要跑在四种完全不同的存储环境里：

```typescript
// 环境一：浏览器有 localStorage
// 环境二：浏览器有 sessionStorage
// 环境三：SSR（Node 环境，根本没有 window）
// 环境四：用户禁用了 cookie/storage，抛异常
```

四种环境的接口形状各不相同：`localStorage` 有 `getItem/setItem`，内存版没有，SSR 环境下直接 `ReferenceError`。用一个适配器抹平：

```typescript
interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// 适配器一：localStorage（最多的场景）
class LocalStorageAdapter implements StorageLike {
  getItem(key: string) {
    return localStorage.getItem(key);
  }
  setItem(key: string, value: string) {
    localStorage.setItem(key, value);
  }
  removeItem(key: string) {
    localStorage.removeItem(key);
  }
}

// 适配器二：内存兜底（SSR / 隐私模式 / 配额超限）
class MemoryStorageAdapter implements StorageLike {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
}

// 选择器：探测能力，决定用哪个适配器
export function createStorage(): StorageLike {
  if (typeof window === 'undefined') return new MemoryStorageAdapter();   // 👈 SSR
  try {
    localStorage.setItem('__probe__', '1');
    localStorage.removeItem('__probe__');
    return new LocalStorageAdapter();
  } catch {
    return new MemoryStorageAdapter();    // 👈 隐私模式 / 配额超限
  }
}
```

**为什么这个案例是标准适配器？** 因为三把尺子动了：

- **调用形态**：`localStorage` 在 SSR 下"不存在"，内存版"总是存在"——适配器让"可能不存在"变成"一定存在"
- **异常语义**：`localStorage.setItem` 可能抛 `QuotaExceededError`，适配器把它变成静默降级
- **值域**：`getItem` 返回 `null` vs `undefined`，不同实现不一致，适配器统一成 `null`

市面上的 `store2`、`vuex-persist`、`pinia-plugin-persistedstate` 内部都在做这件事——**它们的存在本身就是"存储接口不统一"的证据。**

### 医疗 IM 双供应商消息适配（替换原笔记的 tree flatten 案例）

原笔记里还有一个 `flattenAdaptor`（树转扁平数组）。同样需要诚实修正：这只是**数据形状变换**，没有一个"不兼容的第三方接口"要兼容，所以它是"数据适配"思路的近似应用，不是 GoF 适配器。

换成一个医疗业务里真实存在的场景：**IM 供应商切换**。

背景：问诊的实时消息原来用供应商 A（WebSocket 二进制帧），现在要迁到供应商 B（长轮询 JSON）。两边协议完全不同，但业务层的聊天组件不能改。

```typescript
// 👈 Target：业务层只认识这一个协议
interface ChatMessage {
  type: 'text' | 'image' | 'system';
  payload: { content: string; from: string };
  timestamp: number;
}

interface ChatAdapter {
  onMessage(cb: (msg: ChatMessage) => void): void;
  connect(userId: string): Promise<void>;
  disconnect(): void;
}

// 适配器一：供应商 A（WebSocket，二进制帧 + 自定义头）
class VendorAAdapter implements ChatAdapter {
  private ws?: WebSocket;
  async connect(userId: string) {
    this.ws = new WebSocket(`wss://a.example.com/ws?uid=${userId}`);
  }
  onMessage(cb: (msg: ChatMessage) => void) {
    this.ws!.onmessage = (ev) => {
      const frame = JSON.parse(ev.data);       // 👈 A 的帧结构：{ t, d, ts }
      cb({
        type: frame.t === 1 ? 'text' : frame.t === 2 ? 'image' : 'system',
        payload: { content: frame.d.c, from: frame.d.u },
        timestamp: frame.ts * 1000,            // 👈 A 用秒，B 用毫秒
      });
    };
  }
  disconnect() {
    this.ws?.close();
  }
}

// 适配器二：供应商 B（长轮询，扁平 JSON）
class VendorBAdapter implements ChatAdapter {
  private timer?: number;
  async connect(userId: string) {
    await fetch(`https://b.example.com/session?uid=${userId}`);
  }
  onMessage(cb: (msg: ChatMessage) => void) {
    const poll = async () => {
      const res = await fetch('https://b.example.com/poll').then(r => r.json());
      res.messages.forEach((m: any) => {
        cb({
          type: m.msgType,                      // 👈 B 直接用字符串，A 用数字
          payload: { content: m.body, from: m.sender },
          timestamp: m.createTime,              // 👈 已经是毫秒
        });
      });
      this.timer = setTimeout(poll, 1000) as any;
    };
    poll();
  }
  disconnect() {
    clearTimeout(this.timer);
  }
}
```

聊天组件这边完全无感：

```typescript
// 👈 换供应商只是换一个 new，组件一行不改
const adapter: ChatAdapter =
  provider === 'A' ? new VendorAAdapter() : new VendorBAdapter();

await adapter.connect(userId);
adapter.onMessage(msg => appendToChat(msg));   // 👈 永远是同一个协议
```

这个案例里三把尺子动了**三把**：

- **字段名**：`frame.d.c` → `payload.content`
- **值域**：`t: 1/2/3`（数字）→ `type: 'text'/'image'/'system'`（字符串）
- **调用形态**：`WebSocket.onmessage`（推送）→ `onMessage(cb)`（统一回调）+ 长轮询（拉取）被包装成同样的推送语义

**最值钱的是第三把**——长轮询本质上和 WebSocket 不是一回事，但适配器把"拉"伪装成了"推"，让业务层完全感知不到基础设施换了。这是适配器在前端最有威力的用法。

### Sequelize：ORM 是"对象语言"到"SQL 语言"的适配器

```typescript
// npm install --save sequelize sqlite3
const { Sequelize, Model, DataTypes } = require('sequelize');
const sequelize = new Sequelize('sqlite::memory:');

// 定义表模型
class User extends Model {}

// 定义表的字段名和类型
User.init({
  username: DataTypes.STRING,
  birthday: DataTypes.DATE
}, { sequelize, modelName: 'user' });

(async () => {
  await sequelize.sync();
  const jane = await User.create({
    username: 'janedoe',
    birthday: new Date(1980, 6, 20)
  });
  console.log('data', jane.toJSON());
})();

/*
Executing (default): CREATE TABLE IF NOT EXISTS `users` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `username` VARCHAR(255), `birthday` DATETIME, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL);
Executing (default): PRAGMA INDEX_LIST(`users`)
Executing (default): INSERT INTO `users` (`id`,`username`,`birthday`,`createdAt`,`updatedAt`) VALUES (NULL,$1,$2,$3,$4);
data {
  id: 1,
  username: 'janedoe',
  birthday: 1980-07-19T16:00:00.000Z,
  updatedAt: 2021-12-05T15:17:56.440Z,
  createdAt: 2021-12-05T15:17:56.440Z
}
 */
```

注意注释里那几行 `Executing (default): ...`——**这是整个案例的钥匙**。

你写的是 `User.create({ username, birthday })`（JS 对象语言），数据库收到的是 `INSERT INTO users (...) VALUES (...)`（SQL 语言）。中间那次翻译，就是 ORM 这个适配器干的。

为什么说它是最有说服力的行业级案例？因为**同一份 Model 代码，换个 dialect 就能跑 sqlite / mysql / postgresql**：

```typescript
new Sequelize('sqlite::memory:');                       // 换 Adaptee 一
new Sequelize('mysql://user:pass@host:3306/db');        // 换 Adaptee 二
new Sequelize('postgres://user:pass@host:5432/db');     // 换 Adaptee 三
```

业务代码一行不改。**这正是适配器存在的理由——不是我不能改你，而是我有一堆不同的你。**

### 多端请求适配：Taro / uni-app 的底层

跨端框架最核心的一层就是适配器。同一行业务代码：

```typescript
const res = await request({ url: '/api/drugs' });
```

要分别落到微信的 `wx.request`、支付宝的 `my.request`、H5 的 `fetch`、以及各种小程序的私有 API 上。它们的差异非常典型：

| 维度 | `wx.request` | `fetch` |
| --- | --- | --- |
| 调用方式 | 传 options 对象 | `fetch(url, init)` |
| 返回方式 | `success` 回调 | Promise |
| 错误语义 | HTTP 4xx 也走 `success` | 4xx 不 reject，5xx 也不 reject |
| 数据类型 | 自动 JSON.parse | 要手动 `.json()` |

这四行的差异，全是适配器要处理的。`uni.request` / `Taro.request` 就是这层适配器——**它不是"外观"，因为它不是把多个子系统收成一个入口，而是把四套不同形状的接口翻译成同一个形状。**

### DTO / 响应结构适配：后端两套分页，前端一套类型

后端微服务分裂之后，同一个"分页列表"会长出两种结构：

```typescript
// 老服务：{ list, total }
// 新服务：{ data: { nodes, pageInfo: { totalCount } } }
```

不加适配器，前端每个页面都要写 `res.list ?? res.data.nodes`——**这是典型的"把不兼容泄漏到调用方"**。

```typescript
interface PageResult<T> {
  items: T[];
  total: number;
}

// 适配器一：老服务
function adaptLegacyPage<T>(raw: { list: T[]; total: number }): PageResult<T> {
  return { items: raw.list, total: raw.total };
}

// 适配器二：新服务（GraphQL 风格）
function adaptGraphqlPage<T>(raw: {
  data: { nodes: T[]; pageInfo: { totalCount: number } };
}): PageResult<T> {
  return { items: raw.data.nodes, total: raw.data.pageInfo.totalCount };
}
```

顺带把 `snake_case` → `camelCase` 也放进来：

```typescript
// 👈 尺子一：字段名翻译，递归版
function camelize<T>(obj: unknown): T {
  if (Array.isArray(obj)) return obj.map(camelize) as T;
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
        camelize(v),
      ])
    ) as T;
  }
  return obj as T;
}
```

🔧 **真实场景**：这个适配器应该放在 API 层（`api/adapters/`），**而不是页面里**。理由是它属于"协议差异"，不属于"业务逻辑"——一旦有第二个页面要用同一个接口，页面里的转换代码就得复制一遍，之后就没人能说清"到底哪个字段是准的"。

### SDK 大版本共存：双适配器 + 灰度

最后一个适配器场景，也是最工程化的一个：**新老两版 SDK 必须同时存活**。

```typescript
interface UploadClient {
  upload(file: File): Promise<{ url: string }>;
}

// v1 的老客户端（回调风格）
class V1UploadAdapter implements UploadClient {
  upload(file: File) {
    return new Promise((resolve, reject) => {
      sdkV1.uploadFile({       // 👈 老 API 只支持回调
        file,
        success: (r: any) => resolve({ url: r.data.fileUrl }),
        fail: reject,
      });
    });
  }
}

// v2 的新客户端（已经是 Promise）
class V2UploadAdapter implements UploadClient {
  async upload(file: File) {
    const r = await sdkV2.files.create(file);
    return { url: r.location };   // 👈 字段名也变了
  }
}

// 注册表 + 灰度开关
const clients: Record<'v1' | 'v2', UploadClient> = {
  v1: new V1UploadAdapter(),
  v2: new V2UploadAdapter(),
};

function pickClient(userId: string): UploadClient {
  // 👈 按用户 ID 哈希灰度：10% 走新版
  const bucket = parseInt(userId.slice(-2), 16) % 100;
  return bucket < 10 ? clients.v2 : clients.v1;
}
```

这段代码里有一个非常重要的事实：**如果没有适配器，"两个版本共存"这件事根本做不了。**

你不可能在业务代码里写 `if (version === 'v1') { 回调 } else { await }`——那会把"调用形态差异"泄漏到每一个调用点，一周之后就没人删得掉。

### 一句话收口这一章

回头看这八个案例，它们的共同点不是"代码长什么样"，而是**同一个动机**：

> **有一个我改不了的、形状不对的东西，我要让它能被我的代码使用。**

改不了 + 形状不对 + 能接受长期共存——三个条件同时成立，才该上适配器。少一个，都不必。

> 💬 **面试官**：你在项目里用过适配器模式吗？举一个真实例子。
>
> ✅ 标准答案：讲一个"有痛点 → 有方案 → 有收益"的完整链条。比如：我们同时对接了支付宝和微信两条支付通道，两家的返回字段名、成功判定、业务单号字段都不一样，最初业务代码里是一个 `if (channel === 'alipay') {...} else {...}`，每加一条通道就要改这个函数。后来抽了 `PayAdapter` 接口，每家写一个适配器，业务层只认 `{ success, message, tradeNo }`，再配一张按名字取适配器的注册表。加医保支付时只新增一个类 + 注册表一行，业务代码零改动。
>
> 🎁 加分答案：能补上"为什么用类而不是函数"——如果只是字段重命名，一个 `adaptAlipay(raw)` 函数就够了；用类的场景是**适配器需要持有状态**（比如重试次数、连接实例、SDK 单例），或者**需要按名字注册成多态集合**。能区分"函数够用"和"必须上类"的边界，说明你不是为了用模式而用模式。

---

## 六、前端工程落地（下）：外观的那些影子

外观的影子比适配器更隐蔽——因为它太自然了，自然到你不觉得它是一种"设计"。

### 压缩：一个 open() 抹平三种解压方式

```typescript
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// 对外只暴露一个 zip
function zip(src: string) {
  const gzip = zlib.createGzip();                  // 创建压缩流
  const inputStream = fs.createReadStream(src);
  const outputStream = fs.createWriteStream(src + '.gz');
  inputStream.pipe(gzip).pipe(outputStream);
}
zip('source.json');

// 👈 门面：按扩展名分发，调用方只说"打开这个文件"
function open(input: string) {
  const ext = path.extname(input);
  switch (ext) {
    case '.gz':
      return unZip(input);
    case '.rar':
      return unRar(input);
    case '.7z':
      return un7z(input);
    default:
      break;
  }
}

function unZip(src: string) {
  const gunzip = zlib.createGunzip();
  const inputStream = fs.createReadStream(src);
  const outputStream = fs.createWriteStream(src.slice(0, -3));
  console.log('outputStream');
  inputStream.pipe(gunzip).pipe(outputStream);
}

function unRar(src: string) {
  console.log('Rar解压后的', src);
}

function un7z(src: string) {
  console.log('7z解压后的', src);
}

open('./source.json.gz');
```

注意 `open()` 做的事：**它先判断"这是哪种文件"，再决定调哪个子系统。** 这个分派逻辑本来应该由调用方承担（"我先看看后缀，再选个解压函数"），现在被门面接过去了。

**为什么这算外观而不是适配器？** 因为三个解压函数的**接口是完全一样的**（都是 `(src: string) => void`），不存在"接口不兼容"要翻译；门面只是把"选哪个"这件麻烦事收走了。**判据：接口一致 → 外观；接口不一致 → 适配器。**

### redux createStore：三个方法就是整个 store 的门面

```typescript
/**
 * 永远只有一个仓库，状态也只有一个
 */
export default function createStore(reduce: any, preloadedState: any) {
  const currentReduce = reduce;          // 当前的 reduce
  let currentState = preloadedState;     // 当前状态
  let currentListeners: any[] = [];      // 订阅池

  // 派发动作，修改state
  const dispatch = (action: any) => {
    currentState = currentReduce(currentState, action);
    currentListeners.forEach(listener => listener());
    return action;
  };

  // 获取当前的state
  const getState = () => {
    return currentState;
  };

  // 订阅
  const subscribe = (listener: Function) => {
    currentListeners.push(listener);
    return function unsubscribe() {
      currentListeners = currentListeners.filter(l => l !== listener);
    };
  };

  dispatch({ type: '@@redux/INIT' });

  return {
    dispatch,
    getState,
    subscribe
  };
}
```

这个例子的门面感很淡，因为 Redux 的子模块不是"三个服务"，而是"三块内部机制"。但结构上是标准外观：**内部的 `currentReduce`、`currentState`、`currentListeners` 全部是闭包私有的，外界能碰到的只有 `dispatch / getState / subscribe` 三个方法。**

这三个方法就是 Redux 的门面。Redux 想改内部实现（比如换成不可变数据结构、换成 Proxy 拦截），只要这三个方法的签名不变，全世界使用 Redux 的代码都不用动——**这正是外观带来的升级自由度。**

### 函数重载：门面在做"入参归一化"

```typescript
function sum(a: number, b: number): number | string;
function sum(a: string, b: string): number | string;
function sum(a: any, b: any): number | string {
  return a + b;
}
console.log(sum(1, 2));       // 3
console.log(sum('1', '2'));   // 12
```

函数重载是一个很容易被忽略的外观形态。**四组重载声明 + 一个实现，本质是"对外提供多个入口，对内只有一个子系统"。**

客户端看到的是"我可以用两种方式调 `sum`"，实际内部只有一份逻辑。这个"多入口归一"的形状，和 `open()` 按扩展名分派是同一件事，只是方向相反：`open` 是"多入口 → 多个子系统"，重载是"多入口 → 一个实现"。

### React createElement：可变参数归一化

```typescript
export function createElement(type: string, config: Record<string, any>, children: any) {
  const props: any = {};
  const childrenLength: number = arguments.length - 2;
  if (childrenLength === 1) {
    props.children = children;
  } else if (childrenLength > 1) {
    const childArray = Array(childrenLength);
    for (let i = 0; i < childrenLength; i++) {
      childArray[i] = arguments[i + 2];
    }
    props.children = childArray;
  } else {
    // 没有 children，保持空
  }
}
```

关键在 `childrenLength > 1` 那个分支：**React 允许你写任意多个 children，`createElement` 负责把它们统一成一个数组放进 `props.children`。**

调用方（JSX 编译器）因此可以永远不关心"我传了几个孩子"——传 0 个、1 个、10 个，`props.children` 的类型都收敛到一个可预测的形态。**这就是外观在参数层面的体现：把"可变长"的调用形态，归一成"固定形状"的数据。**

### Vue createElement：源码注释直接写着"wrapper"

这段是本节最重要的一段，因为 Vue 的源码注释**原文就承认了这是 wrapper**：

```typescript
// wrapper function for providing a more flexible interface
// without getting yelled at by flow
export function createElement(
  context: Component,
  tag: any,
  data: any,
  children: any,
  normalizationType: any,
  alwaysNormalize: boolean
): VNode | Array<VNode> {
  if (Array.isArray(data) || isPrimitive(data)) {
    // 👈 调用方把 children 传到了 data 的位置，这里自动纠正
    normalizationType = children;
    children = data;
    data = undefined;
  }
  if (isTrue(alwaysNormalize)) {
    normalizationType = ALWAYS_NORMALIZE;
  }
  return _createElement(context, tag, data, children, normalizationType);
}
```

请仔细看那句注释：**`wrapper function for providing a more flexible interface`**——"为提供一个更灵活的接口而做的包装函数"。

这不是外观模式的准确定义吗？

再看那个 `if`：调用方少传了 `data`、把 `children` 塞到了第三个参数的位置，`createElement` 会自动把参数往后挪一位。**这是一个"入口参数重排"的外观**——它在容忍调用方的偷懒写法，代价是自己多做一次判断。

**能在面试里读出这句源码注释，比背十遍"外观模式提供一个高层接口"都有用。** 因为它证明了：模式不是教科书造出来的东西，它是优秀代码在解决问题时自然长出来的形状。

### Buffer.prototype.slice：把负索引归一化

```typescript
Buffer.prototype.slice = function slice(start, end) {
  const srcLength = this.length;
  start = adjustOffset(start, srcLength);
  end = end !== undefined ? adjustOffset(end, srcLength) : srcLength;
  const newLength = end > start ? end - start : 0;
  return new FastBuffer(this.buffer, this.byteOffset + start, newLength);
};
```

`adjustOffset` 那两行在干一件非常典型的事：**把"调用方可能传的任意值"归一成"内部实现能处理的值"。**

- 传 `-1` → 应该理解为"最后一个"
- 传 `undefined` → 应该理解为"到结尾"
- 传越界值 → 应该截断到合法范围

调用方因此可以写 `buf.slice(-10)` 这种符合直觉的写法，而内部只需要处理合法索引。**门面在这里承担的职责是"宽容"——对外接受各种写法，对内只暴露一种约定。**

### createStore 的 enhancer 重载：参数位置本身就是入口

```typescript
import { createStore, applyMiddleware } from 'redux';
import logger from 'redux-logger';

const initialState = { number: 0 };
const reducer = (state = initialState) => state;

// const store = createStore(reducer, initialState, applyMiddleware(logger));
// 下面代码等同上面代码
const store = applyMiddleware(logger)(createStore)(reducer, initialState);

/*
function createStore(reducer: any, preloadedState: any, enhancer: any) {
  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState;
    preloadedState = undefined;
  }
  if (typeof enhancer !== 'undefined') {
    return enhancer(createStore)(reducer, preloadedState);
  }
}
*/
```

这段代码的妙处在注释里那句：**`createStore(reducer, initialState, applyMiddleware(logger))` 和 `applyMiddleware(logger)(createStore)(reducer, initialState)` 是等价的。**

Redux 允许两种写法，靠的是 `createStore` 内部那个判断：

```typescript
if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
  enhancer = preloadedState;      // 👈 第二个参数是函数？那它是 enhancer，不是 state
  preloadedState = undefined;
}
```

**这是"参数位置重载"形态的外观**——它让调用方可以用最自然的写法（中间件放第三个参数），而内部分别处理。上一节 Vue 的 `createElement` 在做同一件事（参数挪位），只是 Redux 挪的是"类型语义"，Vue 挪的是"位置"。

### configureStore：现代前端最常用的"三合一门面"

如果说 `createStore` 是外观，那 `@reduxjs/toolkit` 的 `configureStore` 就是它的**升级版门面**——它把四件事收成一个参数对象：

```typescript
import { configureStore } from '@reduxjs/toolkit';
import drugsReducer from './drugsSlice';

const store = configureStore({
  reducer: { drugs: drugsReducer },        // ① createStore
  middleware: (getDefault) => getDefault(), // ② applyMiddleware
  devTools: process.env.NODE_ENV !== 'production',  // ③ devtools 接入
  // ④ 默认内置了 redux-thunk
});
```

在 RTK 之前，等价的手写版本长这样：

```typescript
// 👈 老写法：调用方必须知道四个子系统怎么组装
const store = createStore(
  combineReducers({ drugs: drugsReducer }),
  applyMiddleware(thunk, logger),
);
// 还要自己接 devtools extension
```

**前后对比就是外观模式最好的诠释：**

| | 老写法 | `configureStore` |
| --- | --- | --- |
| 调用方要知道 | `createStore` / `combineReducers` / `applyMiddleware` / `thunk` / devtools | 一个 `reducer` 字段 |
| 默认行为 | 全要自己配 | 合理默认值都开好了 |
| 换内部实现 | 调用方跟着改 | 调用方零改动 |

这也解释了为什么 RTK 官方把它叫 "the Standard Way to Write Redux Logic"——**它不是在教你用 Redux，它是在教你"别关心 Redux 的内部有哪几个模块"。**

### react-dom 客户端入口：一棵树、一个根

```typescript
import { createRoot } from 'react-dom/client';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
```

看起来只有两行，背后被收敛了什么？

- **Reconciler**（协调器）：负责 diff Fiber 树、决定哪些节点要更新
- **Scheduler**（调度器）：负责优先级、时间切片、让出主线程
- **DOM 操作层**：负责把 Fiber 映射成真实的 `document.createElement` / `setAttribute`
- **事件系统**：合成事件、事件委托、事件优先级

四套系统，全部被 `createRoot(container).render(element)` 挡在门面后面。

React 18 之前是 `ReactDOM.render(<App />, container)`；18 之后改成 `createRoot(...).render(...)`。这个改动本身就是门面在演化——`createRoot` 是先"创建一个根"，再"往根里渲染"，把"挂载"和"更新"两个阶段显式分开了。**升级对外的接口形状是外观的常规操作，因为外观的职责本来就是"给客户端提供一个当前最合适的入口"。**

### 聚合 Hook：一个 useConsultation 拼四个 store

这是业务代码里外观最常见、也最不被当模式看的形态。

```typescript
// 👈 页面想要的：一个问诊上下文
export function useConsultation(consultationId: string) {
  const auth = useAuthStore();          // 子系统一
  const schedule = useScheduleStore();  // 子系统二
  const im = useImStore();              // 子系统三
  const order = useOrderStore();        // 子系统四

  // 门面做的事：编排 + 派生
  const canChat = auth.isLoggedIn && schedule.doctorOnline && im.connected;

  return {
    canChat,
    doctor: schedule.doctor,
    messages: im.messages,
    draft: order.draft,
    send: im.send,
    retryConnect: im.connect,
  };
}
```

对比不用的写法：

```typescript
// 👈 每个页面都重复这四行 + 一次派生计算
const { isLoggedIn } = useAuthStore();
const { doctorOnline, doctor } = useScheduleStore();
const { connected, messages, send } = useImStore();
const { draft } = useOrderStore();
const canChat = isLoggedIn && doctorOnline && connected;
```

区别在哪？**差别不在"少写几行"，而在"这段编排逻辑有且只有一个正确版本"。**

四个 store 之间的判断关系（登录 + 在线 + 已连接才能聊天）是**业务规则**，它不应该散落在五个页面里各写一遍——五个页面会有五个版本，其中四个迟早会写错。聚合 Hook 就是这个规则唯一的事实来源。

**为什么这算外观？** 因为页面（客户端）不再需要知道"有 auth / schedule / im / order 四个 store"，也不需要知道它们之间的判定关系——它只需要知道 `useConsultation()`。

### barrel 导出：团队里最不被当模式看的模块外观

```typescript
// packages/ui/index.ts
export { Button } from './button';       // 内部：button/index.tsx
export { Modal } from './modal';         // 内部：modal/Modal.tsx + ModalProvider.tsx + portal.ts
export { Table } from './table';         // 内部：table/Table.tsx + useTable.ts + column.ts
export { DateRangePicker } from './date-range-picker';
```

业务代码这样写：

```typescript
import { Button, Modal, Table } from '@medai/ui';
```

**这是最不被当模式看的一种外观，但它是最标准的：**

- 内部 `modal/` 目录里有三个文件（`Modal.tsx` / `ModalProvider.tsx` / `portal.ts`），业务方不知道
- 内部 `table/` 有 `Table.tsx` / `useTable.ts` / `column.ts`，业务方不知道
- 如果哪天 `Table` 从内部拆分重构，只要 `index.ts` 的导出不变，全公司几十个项目的 `import` 一行都不用改

**barrel 导出的本质就是"给一个目录树加一个门面"。** 你在团队里推行"统一从 `@medai/ui` 导入，不要深链到子路径"，其实就是在推外观模式——只不过你当时没这么叫它。

顺带一句：它也是外观代价的例证。门面一大，`index.ts` 会变成所有模块的汇合点，导致 tree-shaking 失效、循环依赖频发。这时该做的是**按子域拆多个 barrel**（`@medai/ui/form`、`@medai/ui/data`），也就是"拆 Facade"，回到上一章那个判据。

### 查漏补缺：polyfill 到底算哪个？

笔记里有一段 jQuery 的 `removeEvent`，它常被归到外观里，但**严格说它更接近适配器**：

```javascript
jQuery.removeEvent = document.removeEventListener ?
  function (elem, type, handle) {
    // 标准浏览器
    if (elem.removeEventListener) {
      elem.removeEventListener(type, handle);
    }
  } :
  function (elem, type, handle) {
    // IE6-8
    var name = 'on' + type;
    if (elem.detachEvent) {
      // #8545, #7054: 防止自定义事件在 IE6-8 中内存泄漏
      // 需要按事件名暴露属性，才能让 detachEvent 被 GC 正确回收
      if (typeof elem[name] === 'undefined') {
        elem[name] = null;
      }
      elem.detachEvent(name, handle);
    }
  };
```

**为什么更接近适配器？** 因为它做的是"把两套不兼容的浏览器 API（`removeEventListener` / `detachEvent`）翻译成同一个调用形状"，被适配的是两套 DOM 规范——**接口不一致 → 适配器**。

**为什么也可以勉强算外观？** 因为它在选择阶段也起了"屏蔽差异、给调用方一个统一入口"的作用，polyfill 通常被定义为"门面/垫片"。

**最准确的说法是：polyfill 是"适配器 + 环境探测选择器"的组合。** 在三把尺子上，它明确动了"调用形态"（`detachEvent('onclick', fn)` vs `removeEventListener('click', fn)`，连事件名格式都变）和"字段名"两把——所以它的主身份是适配器。

能在面试里把这个案例讲成"两个模式叠加"，比直接说"这是外观"要强得多。

> 💬 **面试官**：外观模式和「封装」是一回事吗？
>
> ✅ 标准答案：不是。封装是**隐藏实现细节**的通用手段，它面向一个模块；外观是封装的**一种具体形态**——它专门面向"一组子系统"，并且必须**提供一个更高层次的统一入口**。判断标准是：如果被包住的是"一个东西的内部细节"，那只是封装；如果被包住的是"多个东西的协作关系，并且对外新增了一个业务语义的接口"，那才是外观。举例来说，一个 class 把私有字段标成 `private` 是封装；`configureStore({ reducer })` 把 `createStore` / `applyMiddleware` / devtools 收成一个参数对象，那才是外观。
>
> 🎁 加分答案：能补一句「外观是唯一一个"客户端可直连子系统"的模式」——这是它和代理、中介者最大的区别。代理的目的就是不让客户端拿到真实对象，中介者的目的就是让同事对象只跟中介说话；而外观从不阻止你绕过去，它只是让绕过去变得不必要。能指出这一点，说明你不只记住了"外观简化调用"，还记住了它的边界。

---

## 七、易混淆辨析：「包一层」家族全景

这是全篇最重的一章，也是系列里最容易拿分的一章。

### 辨析一：适配器 vs 外观

先把两个模式的判据压成一张表：

| 维度 | 适配器 | 外观 |
| --- | --- | --- |
| 解决的问题 | 接口**不兼容** | 接口**太复杂** |
| 包的子系统数 | 通常 1 个 | 通常一组 |
| 接口形状 | **必须改变** | 不一定，但隐藏细节 |
| 调用方能直连原对象 | 能 | **能**（不阻止） |
| 复杂度 | 不变，平移 | **降低** |
| 典型信号 | 「这两个接口对不上」 | 「调一个功能要碰五个模块」 |
| 一句话动机 | **我不能改你** | **你不必懂我** |

**这张表里最关键的两行是「接口形状」和「复杂度」。**

适配器的存在前提是"形状不对"，所以它必须改形状；外观的前提是"太繁琐"，所以它必须降复杂度。**一个改形状、一个降复杂度——这不是两种手法，而是两个不同的目标。**

再把它们叠在一起看，你会发现真实项目里经常两个都要：

```typescript
// 👈 一个真实场景：门面 + 适配器同时存在
class OrderFacade {
  constructor(
    private alipay: AlipayAdapter,    // 👈 适配器：统一两家支付
    private wxpay: WxpayAdapter,
    private inventory: InventoryService,   // 👈 子系统：直接调用
    private logistics: LogisticsService,
  ) {}

  // 👈 门面：收敛下单的四步编排
  async placeOrder(order: Order, channel: string) {
    await this.inventory.lock(order.items);          // 锁库存
    const paid = await this.pay(order, channel);      // 走适配器支付
    if (!paid.success) {
      await this.inventory.unlock(order.items);       // 失败回滚
      throw new Error(paid.message);
    }
    await this.logistics.createShipment(order);       // 建运单
  }

  private pay(order: Order, channel: string) {
    return (channel === 'alipay' ? this.alipay : this.wxpay).pay(order);
  }
}
```

这个类里同时住了两种模式：**`OrderFacade` 是外观（收敛四步），`AlipayAdapter` 是适配器（统一支付结果）**。面试官问"这两个模式能一起用吗"，答案就是这段代码。

### 辨析二：fetch vs axios —— 外观与适配器最锋利的一组对照

这是本篇最值得带走的一个认知，因为它把两个模式放在**同一个领域、同一个问题**上做了对照。

先问一个问题：`fetch` 解决了什么问题？

在 `fetch` 出现之前，发一个请求要这样写：

```javascript
// 👈 原生 XMLHttpRequest：五步走，还要处理 readyState
const xhr = new XMLHttpRequest();
xhr.open('GET', '/api/drugs', true);
xhr.onreadystatechange = function () {
  if (xhr.readyState === 4 && xhr.status === 200) {
    console.log(JSON.parse(xhr.responseText));
  }
};
xhr.send();
```

`fetch` 把它变成了：

```javascript
// 👈 一行
const data = await fetch('/api/drugs').then(r => r.json());
```

**`fetch` 做了什么？** 它把 `open` / `send` / `onreadystatechange` / `readyState` 这四个繁琐的步骤，收敛成了一个函数调用 + 一个 Promise。

**它的接口形状变了吗？** 变了——但对谁变？**它对同一个被适配者（XHR）做的是"简化"，不是"翻译"。** 换句话说，`fetch` 背后只有 XHR 这一套机制，它没有在多个不兼容的 API 之间做统一，它只是让 XHR 变得容易调用。

**结论：`fetch` 更接近外观。**

再问：`axios` 解决了什么问题？

```typescript
// 👈 同一段代码，浏览器和 Node 都能跑
const res = await axios.get('/api/drugs');
```

`axios` 背后有两个 Adaptee：浏览器的 `XMLHttpRequest` 和 Node 的 `http` 模块。这两个东西在**字段名**（`status` / `statusCode`）、**调用形态**（事件 / 流）、**返回类型**（`responseText` / `Buffer`）三个维度上完全对不上。

**axios 做的是"翻译"，不是"简化"——它必须把两套 API 统一成同一个形状，才能做到"同一段代码跑两个环境"。**

**结论：`axios` 是适配器。**

把两者放一起看：

| | `fetch` | `axios` |
| --- | --- | --- |
| 背后有几套机制 | 1 套（XHR） | 2 套（XHR / http） |
| 干的活 | 简化同一套机制 | 统一不同机制 |
| 接口形状 | 简化（少几步） | **翻译**（换一套） |
| 归类 | **更接近外观** | **适配器** |
| 如果需要支持第三个环境 | 不用它选，它只管浏览器 | 加一个 adapter 文件 |

**这一组对照的价值在于：它把「简化」和「翻译」这两个词彻底分开了。**

面试时你如果能说出这句话——「fetch 是把 XHR 变简单了，axios 是把 XHR 和 http 变一致了，前者是外观，后者是适配器」——基本可以认为你对这两个模式的理解已经到位了。

> 💬 **面试官**：那 axios 里同时有 `fetch` adapter 和 `xhr` adapter，它到底是哪个模式？
>
> ✅ 标准答案：仍然是适配器。关键不在"有几个 adapter"，而在"调用方看到的接口是不是被翻译出来的"。`axios(config)` 这个接口既不是 XHR 的接口，也不是 http 的接口，它是 axios 自己定义的第三个形状，两个 adapter 负责把各自的机制翻译成它——这正是适配器的定义。而 `fetch` 的接口是"XHR 的思路，但写法更简单"，它没有跨机制统一的需求。
>
> 🎁 加分答案：能补一句「同一段代码可以同时是两种模式」——`axios` 整体是适配器，但它对用户的体验（`axios.get('/x')` 一行搞定）确实"简化"了原生写法，这个简化效果和外观是一样的。**模式是按动机分类的，不是按效果分类的**；效果相似不等于模式相同，这也是为什么必须用"判据"而不是"感觉"来归类。

### 辨析三：「包一层」五兄弟全景表

这一张表值得单独截图存下来——它把前端最常混的五个模式一次说清：

| 模式 | 包一层的目的 | 接口变不变 | 调用方能直连原对象 |
| --- | --- | --- | --- |
| **适配器** | 让不兼容的接口能配合 | **变** | 能 |
| **外观** | 收敛多个入口为一个 | 不一定 | **能**（不阻止） |
| **代理** | 控制对原对象的访问 | 不变 | **不能**（或不该） |
| **装饰器** | 动态增强原对象职责 | 不变（可扩展） | 能 |
| **中介者** | 协调多对象双向交互 | 变 | **不能**（必须走中介） |

**判断三问（可以直接背）：**

1. **接口的形状变了吗？** 变了（把 A 的形状翻译成 B）→ **适配器**
2. **包的是一堆吗？且目的是少调几次？** 是 → **外观**
3. **调用方还能直连原对象吗？** 不能，且这是为了控制 → **代理**

这三问的顺序很重要——**先看形状，再看数量，最后看访问控制**。因为大多数误判都发生在第一问：很多人一看到"包了一层"就归到外观，实际它改了接口形状。

补两句表里没写的：

- **装饰器**为什么"接口不变但可以扩展"？因为装饰器实现和原对象**相同的接口**，且在转发时可以选择额外做事（加日志、加校验），调用方感知不到差别。它和代理结构几乎一样，区别在意图——**代理是为了控制"能不能用"，装饰器是为了增强"用了之后多得到什么"**（第 06、07 篇展开）
- **中介者**为什么接口也变？因为同事对象不再直接调彼此，而是统一调 `mediator.notify()`，这个调用形状和原来"直接调用对方方法"完全不同

### 辨析四：外观 vs 中介者（为第 16 篇埋点）

这一组在面试里出现频率不低，但很多人都没想清楚。

**外观是单向的：**

```typescript
// 👈 客户端 → Facade → 子系统 A、B、C
// 子系统之间不认识 Facade，也不需要通过它互相通信
class ConsultationFacade {
  init() {
    this.auth.verify();
    this.im.connect();
  }
}
```

**中介者是双向的：**

```typescript
// 👈 同事对象之间靠 Mediator 互相通信
class FormMediator {
  notify(sender: string, event: string) {
    if (sender === 'drugType' && event === 'change') {
      this.usageNote.setRequired(this.drugType.value === 'prescription');
      this.archiveNo.setRequired(this.drugType.value === 'imported');
    }
  }
}
```

| | 外观 | 中介者 |
| --- | --- | --- |
| 方向 | **单向**（客户端 → 门面 → 子系统） | **双向**（同事 ↔ 中介 ↔ 同事） |
| 子系统之间的关系 | 不变，照旧耦合 | **被切断**，只能通过中介 |
| 门面/中介知道什么 | 知道子系统有哪些能力 | 知道所有同事的状态和规则 |
| 解决的问题 | 调用太繁琐 | 对象互相纠缠、改不动 |

**一句话记住：外观是"客户端少认识几个人"，中介者是"同事之间互相不认识"。**

### 辨析五：适配器 vs 代理（为第 07 篇埋点）

这一组结构上最像，因为两者都是"实现同一个接口 + 持有一个对象引用"。区别只有一条：

- **代理提供一模一样的接口**——客户端调的是 `subject.request()`，代理也是 `request()`，签名完全一致
- **适配器提供不同的接口**——客户端调 `charge()`，被适配者只有 `output()`

**判据：新接口和被包对象的接口长得一样吗？一样 → 代理；不一样 → 适配器。**

第 07 篇会展开讲代理的四种分类（虚拟 / 缓存 / 保护 / 远程），这里先记住这一条分界线即可。

---

## 八、面试高频问：三组核心题与追问链

前面散落的面试视角，这里收口。三道核心题，每道给「及格答法」和「加分答法」。

### 核心题一：适配器模式和外观模式的核心区别是什么？

**及格答法**：适配器是把一个接口转换成另一个接口，解决接口不兼容；外观是把一组子系统接口收敛成一个高层接口，简化调用。

**加分答法**：加上三条判据——

- **变化维度不同**：适配器变化的是「接口形状」，外观变化的是「入口数量」
- **包的子系统数不同**：适配器通常一对一，外观通常一对多
- **复杂度不同**：适配器不降低复杂度，只做平移；外观才真正降低客户端看到的复杂度

再补一句动机层面的概括收尾：**「适配器存在的理由是『我不能改你』，外观存在的理由是『你不必懂我』。」**

### 核心题二：axios 为什么算适配器模式的应用？

**及格答法**：axios 统一了浏览器端的 `XMLHttpRequest` 和 Node 端的 `http` 模块两套 API，让调用方在任何环境都能用 `axios(config)` 拿到 Promise。

**加分答法**：加上源码链路 + 三把尺子 + 追问预案——

- **源码链路**：`Axios.prototype.request` → `dispatchRequest` → `getDefaultAdapter()` → `adapters/xhr.js` 或 `adapters/http.js`
- **三把尺子全动**：字段名（`status` / `statusCode`）、调用形态（事件回调 / 流 → Promise）、返回类型（字符串 / Buffer）
- **追问预案**：面试官很可能接着问「那拦截器算什么模式」——答**职责链**（第 12 篇），和适配器是两个层的东西，一个是"翻译环境差异"，一个是"串联处理流程"
- **再加一刀**：`axios.create({ adapter })` 让适配器变成可配置项，这本身就是"库作者承认这是适配器模式"的证据

### 核心题三：外观模式和中介者模式有什么相似和不同？

**及格答法**：两者都是"引入一个中间层对象"，但外观是单向简化调用，中介者是双向协调交互。

**加分答法**：

| | 外观 | 中介者 |
| --- | --- | --- |
| 包的是一组子系统还是同事对象 | 子系统（能力提供方） | 同事（对等协作方） |
| 子系统/同事之间还互相认识吗 | **认识，关系不变** | **不认识，只能走中介** |
| 解决的是"调用繁琐"还是"对象纠缠" | 调用繁琐 | 对象纠缠 |

一句话收口：**外观是"客户端少认识几个人"，中介者是"同事之间互相不认识"。**

### 第一条追问链：新旧接口必须长期共存怎么办？

这是适配器最真实的工程问题——**不是"选哪个接口"，而是"两个都要活着"**。

标准答法分三步：

1. **抽 Target 接口**：定义你期望的形状，作为唯一真相
2. **写两个 Adapter**：老的、新的各一个，都实现 Target
3. **注册表 + 灰度**：按用户 / 租户 / 环境决定走哪个，`pickClient()` 里做哈希分流

再补一句"什么时候可以删掉一个"——**当灰度比例到 100% 且稳定观察一个版本周期后**，删掉旧适配器。**没有这一步，适配器就会永久留在代码里变成"技术债"。** 能主动说出清理条件，说明你考虑的是长期，不是本次上线。

### 第二条追问链：外观会不会变成上帝类？怎么拆？

**标准答法**：会。判断信号是「方法数超过子系统数量」且「方法之间没有共享编排逻辑」。

**拆分方法**：按**业务场景**拆，不按子系统拆——

- ❌ 错误拆法：`AuthFacade` / `ImFacade` / `OrderFacade`（这是把门面退回成子系统，等于没门面）
- ✅ 正确拆法：`ConsultationInitFacade` / `ConsultationChatFacade` / `ConsultationRefundFacade`（每个门面对应一个用户旅程）

**核心洞察：门面的粒度应该跟着"用户要完成的一件事"走，而不是跟着"系统里有几个模块"走。** 这句话说出来，比背"外观模式定义"有分量得多。

### 收尾：三个判断题，检验你是否真的懂了

给你三个真实的代码片段，说出它属于哪个模式：

1. **`uni.request({ url, method, success, fail })`** 内部会调用 `wx.request` / `my.request` / `fetch`，并把各自的错误码归一成 `{ errMsg }`
2. **`dayjs()`** 内部包装了原生 `Date`，提供 `format` / `add` / `diff` 等一百多个方法
3. **`useQuery({ queryKey, queryFn })`** 内部串起了缓存、请求去重、重试、轮询、状态管理

答案：

1. **适配器**——三套 API 形状对不上，要翻译成同一个（三把尺子全动）
2. **更接近外观**——`Date` 只有一套，`dayjs` 是把它变简单、变好用（不动不兼容翻译）
3. **外观**——`react-query` 把缓存/去重/重试/状态四套子系统收敛成一个 Hook（典型的一对多收敛）

三道里第 2 题最容易答错，很多人会说"适配器，因为它把 Date 适配成了不可变对象"。**但 `Date` 和 `dayjs` 之间不存在"两个不兼容的接口要共存"的问题——你完全可以只用 Date。动机是"让它更好用"，不是"让它能配合"。**

---

## 💡 一张图总结（面试速记表）

| 要点 | 一句话内核 | 考察频率 |
| --- | --- | --- |
| 适配器三角色 | Target（期望）/ Adapter（翻译）/ Adaptee（不兼容） | ⭐⭐⭐ 必考 |
| 外观三角色 | Facade（聚合）/ Subsystem（无感）/ Client（只认门面） | ⭐⭐⭐ 必考 |
| 核心区别 | 适配器改接口**形状**，外观减入口**数量** | ⭐⭐⭐ 必考 |
| 三把尺子 | 字段名 / 值域语义 / 调用形态，至少动一把才算适配器 | ⭐⭐⭐ 必考 |
| 复杂度差异 | 适配器不降复杂度只平移；外观才降复杂度 | ⭐⭐⭐ 必考 |
| axios 为什么是适配器 | 统一 XHR + http 两套 API，三把尺子全动 | ⭐⭐⭐ 必考 |
| fetch vs axios | fetch 简化一套机制（近外观），axios 统一两套（适配器） | ⭐⭐ 高频 |
| 「包一层」五兄弟 | 适配器改形状 / 外观减入口 / 代理控访问 / 装饰器加职责 / 中介者断耦合 | ⭐⭐⭐ 必考 |
| 外观 vs 中介者 | 外观单向简化，中介者双向协调；子系统是否互认是分界 | ⭐⭐ 高频 |
| 外观的三个误解 | 不必是 class / 不禁止直连 / 不解耦子系统 | ⭐⭐ 高频 |
| JS 无类适配器 | 无多继承，"继承 Target + 组合 Adaptee"就是对象适配器 | ⭐ 中频 |
| 外观的代价 | 易长成上帝类；按"用户旅程"拆，不按子系统拆 | ⭐⭐ 高频 |

> 💡 记住这条主线：**「包一层」只是手段，动机才是身份。** 适配器动的是接口的**形状**（我不能改你），外观动的是入口的**数量**（你不必懂我）。以后遇到任何"在 A 外面套了个 B"的代码，先问三句：**接口形状变了吗？包的是一堆吗？调用方还能直连吗？**——三个答案出来，模式也就出来了。

---

## 📝 留个问题

打开你的项目，找两类代码：

1. 一个函数里写满了 `if (source === 'xxx') { res.a } else { res.b }`——你在手工做字段翻译。它现在有几个分支？最近半年加过几个？
2. 一个 `useEffect` 或一个 store action 里连续 `await` 了 4 个以上模块——你在手工做编排。这段代码被复制到几个页面了？

然后各问一句：**接口形状对不上吗？那该抽适配器。一次要碰好几个人吗？那该抽外观。**

我的猜测是：你找到的第一坨代码已经悄悄变成"适配器"了，只是它长成了 `if-else` 的样子，没有类名，也没有接口；而你找到的第二坨代码已经被复制了至少三遍。把你找到的案例写在评论区，我们一起看看大家项目里藏着多少"该抽适配器却写了 if"和"该抽外观却复制粘贴"的代码 👇

---

## 参考资料

https://refactoring.guru/design-patterns/adapter （refactoring.guru 适配器页，含对象适配器与类适配器的 UML 图）

https://refactoring.guru/design-patterns/facade （refactoring.guru 外观页，含门面结构与真实世界类比）

https://github.com/axios/axios/blob/master/lib/core/Axios.js （axios 请求入口，`request` 方法里能看到 adapter 的调用位置）

https://github.com/axios/axios/blob/master/lib/core/dispatchRequest.js （`dispatchRequest` 是 adapter 实际被调用的地方）

https://github.com/axios/axios/blob/master/lib/defaults/index.js （`getDefaultAdapter()` 按运行环境选择 xhr / http 适配器）

https://github.com/axios/axios/tree/master/lib/adapters （两个适配器的源码目录，签名一致、实现完全不同）

https://github.com/facebook/react/blob/main/packages/react/src/jsx/ReactJSXElement.js （React `createElement` 所在文件，children 参数归一化）

https://github.com/vuejs/vue/blob/dev/src/core/vdom/create-element.js （Vue `createElement`，源码注释原文写着 `wrapper function for providing a more flexible interface`）

https://github.com/reduxjs/redux/blob/master/src/createStore.ts （Redux `createStore` 的 enhancer 参数重载）

https://github.com/reduxjs/redux-toolkit/blob/master/packages/toolkit/src/configureStore.ts （RTK `configureStore` 的三合一门面实现）

https://github.com/nodejs/node/blob/master/lib/buffer.js （`Buffer.prototype.slice` 的 `adjustOffset` 归一化处理）

https://github.com/jquery/jquery/blob/1.12-stable/src/event.js （jQuery `removeEvent` 的 polyfill 分支，`removeEventListener` 与 `detachEvent` 两种路径）

https://developer.mozilla.org/zh-CN/docs/Web/JavaScript （MDN，事件模型、Promise、Proxy 等语言机制参考）

《设计模式：可复用面向对象软件的基础》 Erich Gamma 等四人组著，1994（GoF 23 种模式的权威出处，适配器与外观的原始定义）

《JavaScript 设计模式与开发实践》 曾探 著（前端场景化讲解，中文资料首选）

> 推荐搜索关键词：「适配器模式 外观模式 区别」「适配器模式 三把尺子 字段名 语义 调用形态」「axios adapter 源码 适配器模式」「fetch 和 XMLHttpRequest 区别」「外观模式 中介者模式 区别」「门面模式 上帝类 拆分」「configureStore createStore 区别」「类适配器 对象适配器 多继承」。

---

> 🔖 这是「前端设计模式」系列第 05 篇。上一篇：《工厂与建造者模式：创建哪种对象 vs 怎么组装对象（面试收藏级）》；下一篇预告：《装饰器模式：从 TS Decorator 到 React HOC 的增强术》
