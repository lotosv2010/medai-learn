# 前端设计模式系列公众号文章大纲

> 目标读者：5-10 年前端或全栈经验，系统补足设计模式体系、备战大厂面试
> 写作原则：使用与实践 → 设计与原理 → 工程落地参考 → 实践演示与验证 → 参考
> 背景：有 1 药网 10 年医疗电商前端经验，示例贴近医疗/电商场景
> 与其他系列的分工：本系列讲模式的通用抽象与识别能力，具体框架源码实现见对应系列（Vue3 响应式源码见《06 Vue 3 源码》系列，Koa 中间件源码见《09 Node.js 全栈》系列，ESM 模块加载机制见《03 工程化与构建工具》系列），避免重复

---

## 系列定位

**「前端设计模式」系列**

- 篇数：17 篇（导读 1 篇 + 设计原则 1 篇 + 创建型 3 篇 + 结构型 5 篇 + 行为型 7 篇）
- 核心主线：UML 图示能力 → SOLID 设计原则 → 创建型模式（对象怎么生产）→ 结构型模式（对象怎么组合）→ 行为型模式（对象怎么协作）
- 篇章编排原则：按信息密度重新分组，不是"1 个 GoF 模式 = 1 篇"。高频独立模式单独成篇（单例/装饰器/代理/观察者/策略/职责链/命令/迭代器），低密度或强关联的模式两两合并（工厂+建造者、适配器+外观、组合+桥接、状态+模板方法），最低频的四个模式合并进收官篇，覆盖全部 24 个知识点且不为凑篇数注水
- 内容结构：五段式（使用与实践 → 设计与原理 → 工程落地参考 → 实践演示与验证 → 参考）
- 特色：每篇 3-5 个「面试官会问」；代码示例统一用 TypeScript；场景命名贴近医疗/药品/处方业务；重点标注模式之间的易混淆辨析（原型链≠原型模式、观察者≠发布订阅、策略≠状态）

---

## 文章规划总览

| 编号 | 标题 | 核心主题 | 状态 |
|------|------|----------|------|
| 00 | 为什么前端要懂设计模式？UML 类图/序列图速查 | 导读 + UML | ⬜ 待写 |
| 01 | 设计原则：SOLID 与前端场景全解 | 设计原则 | ⬜ 待写 |
| 02 | 单例模式：从 ESM 模块单例到全局状态管理 | 单例模式 | ⬜ 待写 |
| 03 | 工厂方法与建造者模式：创建什么 vs 怎么创建 | 工厂/建造者 | ⬜ 待写 |
| 04 | 原型模式：JS 原型链是不是原型模式？ | 原型模式 | ⬜ 待写 |
| 05 | 适配器模式与外观模式：包一层改接口 | 适配器/外观 | ⬜ 待写 |
| 06 | 装饰器模式：从 TS Decorator 到 React HOC | 装饰器模式 | ⬜ 待写 |
| 07 | 代理模式：从 ES6 Proxy 到缓存/懒加载代理 | 代理模式 | ⬜ 待写 |
| 08 | 组合模式与桥接模式：树形结构与维度解耦 | 组合/桥接 | ⬜ 待写 |
| 09 | 享元模式：对象池与虚拟列表节点复用 | 享元模式 | ⬜ 待写 |
| 10 | 观察者模式与发布-订阅模式：谁才是真正的解耦 | 观察者/发布订阅 | ⬜ 待写 |
| 11 | 策略模式：从表单校验到 Hook 封装 | 策略模式 | ⬜ 待写 |
| 12 | 职责链模式：中间件的本质 | 职责链模式 | ⬜ 待写 |
| 13 | 命令模式：撤销重做与任务队列 | 命令模式 | ⬜ 待写 |
| 14 | 状态模式与模板方法模式：用结构取代 if-else | 状态/模板方法 | ⬜ 待写 |
| 15 | 迭代器模式：从 Iterator 协议到 Generator | 迭代器模式 | ⬜ 待写 |
| 16 | 收官篇：中介者/备忘录/访问者/解释器 | 冷门四模式 | ⬜ 待写 |

---

## 各篇详细大纲

### 第 00 篇：为什么前端要懂设计模式？UML 类图/序列图速查

**副标题**：不是背 23 种模式的定义，而是先学会看懂开源库源码里的结构图

#### 一、使用与实践

- 看不懂开源库文档里的架构图：Redux 官方文档的数据流图、React 官方的组件树图，本质都是简化版的 UML
- 面试白板题的沟通语言：面试官让你"画一下这个模块的类图"，用不规范的方框连线会显得不专业
- Code Review 时口头描述"这两个类是组合关系还是聚合关系"，说不清楚会让讨论低效

#### 二、设计与原理

- UML 图的两大分类：**结构图**（类图/对象图/组件图，描述"是什么"）与**行为图**（序列图/状态图/活动图，描述"怎么运作"）——前端最常用的是类图和序列图
- 类图六种关系（易混淆重点）：**继承**（is-a，实线空心三角）、**实现**（implements，虚线空心三角）、**关联**（普通引用，实线箭头）、**聚合**（has-a 但生命周期独立，空心菱形）、**组合**（has-a 且生命周期绑定，实心菱形）、**依赖**（临时使用，虚线箭头）
- 类图三段式结构：类名 / 属性（`+public -private #protected`）/ 方法——TypeScript 的 `interface`/`class` 天然对应
- 序列图的核心元素：生命线（竖线代表对象存在时间）、激活框（方框代表方法执行中）、消息箭头（实线同步调用/虚线返回）——用来画清楚 Promise 链或中间件调用顺序

#### 三、工程落地参考

- TypeScript 类型系统与 UML 的对应：`interface` 对应 UML 接口、`abstract class` 对应抽象类、泛型 `<T>` 对应 UML 参数化类型——理解这个对应关系后，看类图和写 TS 类型是同一种思维
- mermaid.js `classDiagram`/`sequenceDiagram` 语法：本项目笔记与文档均可用 mermaid 代码块直接渲染类图，无需额外画图工具

#### 四、实践演示与验证

用 mermaid 画一张 React 组件树的类图（父子组件的组合关系）；再画一张"用户发起请求 → axios 拦截器 → 后端 → 响应拦截器 → 组件渲染"的序列图，把本系列后续 16 篇要讲的模式先在图上找到对应位置（如 axios 适配器模式、拦截器职责链模式）。

#### 五、参考

- 《UML 精粹》（Martin Fowler 著）
- mermaid.js 官方文档：https://mermaid.js.org/

**面试核心问**：
- 类图里聚合和组合的区别是什么？举一个前端的例子。
- 序列图和流程图的本质区别是什么？
- 为什么设计模式的学习要先懂 UML？

---

### 第 01 篇：设计原则：SOLID 与前端场景全解

**副标题**：所有设计模式都是 SOLID 原则的具体实现，脱离原则死记模式没有意义

#### 一、使用与实践

- 一个 2000 行的 `UserProfile` 组件同时处理数据请求、表单校验、UI 渲染——违反单一职责原则（SRP）的典型前端反例
- 每次新增一种支付方式就要修改 `handlePayment` 函数内部的 `if-else`——违反开闭原则（OCP），应该对扩展开放、对修改关闭
- 自定义 Hook 的参数设计：`useForm(options)` 的 `options` 强迫所有调用者传入不需要的字段——违反接口隔离原则（ISP）
- 组件直接 `import axios` 发请求而不是依赖注入的 `httpClient`——违反依赖倒置原则（DIP），高层模块不应依赖低层实现细节

#### 二、设计与原理

- **SRP 单一职责**：一个类/模块/函数只负责一件事，只应有一个改变的理由——前端场景是"UI 与业务逻辑分离"（Hook 抽取逻辑，组件只管渲染）
- **OCP 开闭原则**：对扩展开放，对修改关闭——策略模式、装饰器模式都是 OCP 的直接实现，新增行为不改老代码
- **LSP 里氏替换原则**：子类必须能替换父类而不破坏程序——TS 中函数参数类型的协变/逆变规则本质是 LSP 的类型系统体现
- **ISP 接口隔离原则**：不强迫模块依赖它不需要的接口——大 `interface` 应拆分为多个小 `interface` 按需组合
- **DIP 依赖倒置原则**：高层模块不依赖低层模块，两者都依赖抽象——前端的"依赖注入 Context"、后端的"面向接口编程"都是 DIP
- 三个辅助原则：**DRY**（不要重复自己）、**KISS**（保持简单）、**YAGNI**（不要过度设计不需要的功能）——三者之间存在天然张力，过度追求 DRY 会导致过早抽象违反 YAGNI

#### 三、工程落地参考

- React Hooks 的设计哲学：`useState`/`useEffect` 每个 Hook 只做一件事，这是 SRP 在 API 设计层面的体现，对比 class 组件把状态/副作用/渲染全部塞进一个类
- TypeScript `interface` 的组合优于继承：`interface A extends B, C {}` 允许接口按需拆分组合，是 ISP 的语言层面支持

#### 四、实践演示与验证

拿一个违反 OCP 的支付方式 `if-else` 函数，用策略模式重构为"新增支付方式不改一行老代码"，直观体会开闭原则；再对比一个"上帝组件"拆分为多个单一职责 Hook 前后的代码。

#### 五、参考

- 《Clean Architecture》（Robert C. Martin 著）
- SOLID 原则维基百科条目

**面试核心问**：
- SOLID 五个原则分别是什么？举一个你在项目中违反过又修复的例子。
- 开闭原则和策略模式是什么关系？
- DRY 原则被过度使用会导致什么问题？

---


---

### 第 02 篇：单例模式：从 ESM 模块单例到全局状态管理

**副标题**：ESM 模块天然是单例，但"天然"不等于"有设计意图"

#### 一、使用与实践

- 医疗系统里全局唯一的消息提示（Toast）、权限配置（PermissionConfig）、WebSocket 连接管理器——每次 `new` 都会产生副作用，必须保证唯一实例
- Redux Store 是前端最典型单例：整个应用共享同一个 state 树，`createStore` 只调用一次
- axios 实例化一次后全局复用（baseURL、拦截器只配置一遍），多次 `new axios()` 会导致配置冲突

#### 二、设计与原理

- **意图**：确保一个类只有一个实例，并提供全局访问点
- 核心实现：私有构造函数 + 静态 `getInstance()` + 静态私有实例字段
- JavaScript 的单例天然性：ES Module 在运行时只被解析一次（Node.js `require` 缓存、浏览器 module graph），导出的对象默认引用唯一——但这是"无意图的单例"，与设计模式里"有意识封装唯一性"是两件事
- 懒汉式（首次调用才创建）vs 饿汉式（模块加载时立刻创建）——JS 单线程下无线程安全问题，但懒加载在浏览器中有性能意义

#### 三、工程落地参考

```typescript
class PrescriptionWsManager {
  private static instance: PrescriptionWsManager | null = null;
  private constructor() {}
  static getInstance(): PrescriptionWsManager {
    if (!PrescriptionWsManager.instance) {
      PrescriptionWsManager.instance = new PrescriptionWsManager();
    }
    return PrescriptionWsManager.instance;
  }
}
// ESM 版（更简洁）：直接导出实例，利用 module cache
export const wsManager = new PrescriptionWsManager();
```

#### 四、实践演示与验证

对比 Class 单例 vs ESM 直接导出实例：用 `===` 断言两次 `getInstance()` 返回同一引用；演示全局唯一 Toast 实例的使用场景；讨论单元测试中单例的状态污染陷阱及重置方案。

#### 五、参考

- Kyle Simpson《You Don't Know JS》模块章节
- Redux 官方文档 createStore

**面试核心问**：
- ESM 模块和单例模式有什么区别？什么时候用 Class 单例而不是直接导出对象？
- 单例模式在单元测试中会有什么问题？怎么解决？
- Redux Store 是单例模式吗？它和普通单例有什么不同？

---

### 第 03 篇：工厂方法与建造者模式：创建什么 vs 怎么创建

**副标题**：工厂负责"创建哪种对象"，建造者负责"按什么步骤组装复杂对象"

#### 一、使用与实践

- 医疗系统对接多家物流商（顺丰/京东/极兔），每家 SDK 接口不同，但上层只关心"给我一个快递下单器"——工厂方法模式：把实例化逻辑集中到子类，调用方只调用 `createShipper()`
- 药品详情页需要组装一个复杂 `ReportConfig` 对象（数十个字段，部分可选），直接 `new ReportConfig(field1, field2, ..., field20)` 可读性极差——建造者模式：链式 `.setTitle().setDrugId().setShowWarning().build()` 清晰且防止漏传必填字段

#### 二、设计与原理

- **工厂方法**：定义创建对象的接口（`createProduct()`），让子类决定实例化哪个具体类——解决的是"创建哪种对象"的变化点。对比简单工厂（switch/if 工厂函数）：简单工厂是函数，不满足 OCP；工厂方法把变化点封装进子类，新增产品只加子类，不改父类
- **抽象工厂**（简带）：生产一系列相关产品族（如 `MacUIFactory` 同时生产 `MacButton`/`MacInput`），与工厂方法区别在于产品族 vs 单一产品
- **建造者模式**：将复杂对象的构建与表示分离——`Builder` 分步骤设置属性，`Director` 控制构建顺序，`Product` 是最终结果。TypeScript 中常用链式调用版本（流式建造者），省略 `Director`

#### 三、工程落地参考

```typescript
// 工厂方法：物流商工厂
abstract class ShipperFactory {
  abstract createShipper(): Shipper;
  ship(order: Order) { return this.createShipper().ship(order); }
}
// 建造者：药品报告配置
class ReportConfigBuilder {
  private config: Partial<ReportConfig> = {};
  setDrugId(id: string) { this.config.drugId = id; return this; }
  setShowWarning(show: boolean) { this.config.showWarning = show; return this; }
  build(): ReportConfig {
    if (!this.config.drugId) throw new Error('drugId required');
    return this.config as ReportConfig;
  }
}
```

#### 四、实践演示与验证

新增一家物流商：工厂方法只加一个子类，调用方零改动；用建造者替换一个参数超过 5 个的构造函数，对比前后可读性和必填字段保障。

#### 五、参考

- 《设计模式》GoF 工厂方法章节
- TypeScript Builder Pattern in Practice

**面试核心问**：
- 工厂方法和简单工厂有什么区别？各自违反或遵守了哪条设计原则？
- 建造者模式和工厂模式的区别是什么？什么场景下选建造者？
- 抽象工厂和工厂方法的关系是什么？

---

### 第 04 篇：原型模式：JS 原型链是不是原型模式？

**副标题**：把这两件事搞清楚，一道高频辨析题就彻底解决了

#### 一、使用与实践

- 医疗后台需要复制一张"处方模板"生成新处方——复制已有对象比重新配置一个新对象更高效，用原型模式 `clone()` 而不是 `new Prescription()`
- 大量相似配置对象（如多种药品规格 `DrugSpec`）的批量创建：以一个基准对象为原型，按需浅/深克隆修改少数字段

#### 二、设计与原理

- **意图**：通过复制（克隆）一个已有对象来创建新对象，而不是通过实例化类——当对象创建代价高（复杂初始化、大量配置）时更高效
- **JavaScript 原型链 ≠ 原型模式**：原型链是 JS 的**继承机制**（对象通过 `[[Prototype]]` 共享方法），原型模式是一种**创建型设计模式**（克隆对象）。两者名字相同但完全不同概念——这是最高频的面试辨析点
- 浅克隆（`Object.assign`/对象展开符 `{...obj}`）vs 深克隆（`structuredClone`/`JSON.parse(JSON.stringify)`/lodash `cloneDeep`）的选择依据
- TypeScript 实现：`clone()` 方法返回 `this` 类型，结合泛型保证子类克隆类型正确

#### 三、工程落地参考

```typescript
interface Cloneable<T> { clone(): T; }
class PrescriptionTemplate implements Cloneable<PrescriptionTemplate> {
  constructor(public drugId: string, public dosage: string, public warnings: string[]) {}
  clone(): PrescriptionTemplate {
    return new PrescriptionTemplate(this.drugId, this.dosage, [...this.warnings]);
  }
}
// 原型注册表：按名称存储和检索原型
const registry = new Map<string, PrescriptionTemplate>();
```

#### 四、实践演示与验证

对比"每次 new + 重新配置"和"clone 后修改少数字段"的代码量；演示浅克隆在包含数组/对象引用时的陷阱（修改克隆体的数组会影响原型）；画类图说明原型模式和原型链在结构上完全无关。

#### 五、参考

- MDN Object.create() 和 structuredClone() 文档
- 《JavaScript 高级程序设计》原型链章节

**面试核心问**：
- JavaScript 的原型链和 GoF 原型模式是同一件事吗？分别解释。
- 浅克隆和深克隆的区别？`Object.assign` 是浅克隆还是深克隆，有什么坑？
- 什么场景下原型模式比工厂模式更合适？

---

### 第 05 篇：适配器模式与外观模式：包一层改接口

**副标题**：适配器解决"接口不兼容"，外观解决"接口太复杂"——都是包一层，但目的不同

#### 一、使用与实践

- 医疗系统同时对接支付宝（返回 `{code, msg}`）和微信支付（返回 `{errcode, errmsg}`）SDK，上层业务代码不想关心两套字段命名——用适配器统一成 `{success, message}` 再往上传
- 前端 axios 本身就是对 `XMLHttpRequest`/`fetch` 两种不同浏览器 API 的适配器，统一暴露 Promise 风格接口
- 初始化一次问诊页要调用 5 个子系统（用户认证、医生排班、IM 连接、订单、支付），业务组件不应逐个调用——用外观模式封装成一个 `initConsultation()` 方法

#### 二、设计与原理

- **适配器模式**：将一个接口转换成客户端期望的另一个接口，让不兼容的类可以协同工作——重点是"接口转换"，通常一对一包装
- **外观模式**：为子系统的一组接口提供一个统一的高层接口，简化复杂系统的使用——重点是"简化调用"，通常一对多聚合
- 区分标准：适配器改变的是**接口形态**（不改变复杂度），外观降低的是**使用复杂度**（不一定改变接口形态）
- 类适配器（继承实现，JS 少用）vs 对象适配器（组合实现，JS 主流写法）

#### 三、工程落地参考

```typescript
// 适配器：统一支付结果
interface PayResult { success: boolean; message: string; }
class AlipayAdapter implements PayResult {
  constructor(private raw: { code: number; msg: string }) {}
  get success() { return this.raw.code === 0; }
  get message() { return this.raw.msg; }
}
// 外观：问诊初始化聚合
class ConsultationFacade {
  async init(userId: string) {
    await authService.verify(userId);
    await scheduleService.checkDoctorAvailable();
    await imService.connect();
    return orderService.createDraft(userId);
  }
}
```

#### 四、实践演示与验证

用适配器统一两个格式不同的第三方支付 SDK 返回值，业务层代码零改动；用外观模式把一个 5 步初始化流程压缩成一次调用，对比重构前后调用方代码行数。

#### 五、参考

- axios 源码 adapters 目录（xhr.js / http.js）
- 《Head First 设计模式》适配器与外观章节

**面试核心问**：
- 适配器模式和外观模式的核心区别是什么？
- axios 为什么算适配器模式的应用？
- 外观模式和中介者模式有什么相似和不同？（为第 16 篇埋点）

---

### 第 06 篇：装饰器模式：从 TS Decorator 到 React HOC

**副标题**：不改源码给对象加能力，是 OCP 原则最直接的落地

#### 一、使用与实践

- 给问诊订单加日志埋点、加权限校验、加数据脱敏，三个需求分别对应三个装饰器，可以自由组合叠加，而不是在原函数里堆 if-else
- React 高阶组件（HOC）`withAuth(Component)`、`withLoading(Component)` 本质是装饰器模式：不修改原组件，包一层增强行为
- TypeScript `@Decorator` 语法（NestJS `@Controller`/`@Injectable`）在编译期给类/方法附加元信息或包装行为

#### 二、设计与原理

- **意图**：动态地给对象添加额外职责，且比继承更灵活——继承是编译期静态扩展，装饰器是运行时动态组合
- 装饰器 vs 继承：N 种基础功能 × M 种增强功能，继承需要 N×M 个子类（类爆炸），装饰器只需要 N+M 个类自由组合
- 装饰器 vs 代理模式（重点辨析，为第 07 篇埋点）：装饰器关注**增强职责**（加日志、加校验），代理关注**控制访问**（延迟加载、权限拦截）——意图不同，但实现结构几乎一样，因此常被面试官拿来互相追问
- TS/ES 提案 Decorator 语法糖的本质：编译期生成的高阶函数包装，与手写装饰器模式函数式实现是同一回事

#### 三、工程落地参考

```typescript
// 函数式装饰器：给请求函数加日志
function withLogging<T extends (...args: any[]) => any>(fn: T): T {
  return ((...args: any[]) => {
    console.log(`调用 ${fn.name}`, args);
    return fn(...args);
  }) as T;
}
// React HOC 装饰器
function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return (props: P) => (isLoggedIn() ? <Component {...props} /> : <LoginPage />);
}
```

#### 四、实践演示与验证

给一个订单提交函数依次叠加"日志装饰器"、"权限装饰器"、"防抖装饰器"，验证组合顺序对结果的影响；对比用继承实现同样三个组合功能需要写多少个子类。

#### 五、参考

- TC39 Decorators 提案
- NestJS 官方文档 Decorators 章节

**面试核心问**：
- 装饰器模式和代理模式的区别是什么？（结构相似，意图不同）
- React HOC 属于什么设计模式？还有哪些方案能替代 HOC？
- 装饰器模式如何避免继承的类爆炸问题？

---

### 第 07 篇：代理模式：从 ES6 Proxy 到缓存/懒加载代理

**副标题**：Vue3 响应式的 Proxy 只是代理模式的一种应用，代理模式本身的分类远不止这一种

> 本篇讲代理模式的通用分类和跨框架场景，Proxy 的 `track/trigger` 具体源码实现见《Vue 3 源码》系列响应式篇，避免重复

#### 一、使用与实践

- 处方图片首次访问才真正发起下载请求（虚拟代理/懒加载代理），而不是列表渲染时全部加载
- 药品价格接口调用频繁但结果短期不变，用代理模式在请求前拦截查缓存、缓存未命中才真正发请求（缓存代理）
- 医生只能查看自己患者的处方，护士只能查看但不能修改——用代理模式统一做权限拦截（保护代理），而不是在每个业务方法里判断权限

#### 二、设计与原理

- **意图**：为其他对象提供一种代理以控制对这个对象的访问——核心是"控制访问"，不改变原对象接口
- 代理模式的常见分类：**虚拟代理**（延迟创建开销大的对象）、**缓存代理**（拦截重复请求）、**保护代理**（权限控制）、**远程代理**（本地代理远程对象，如 RPC stub）
- ES6 `Proxy` + `Reflect` 是语言层面提供的通用代理能力：13 种 trap（get/set/has/deleteProperty 等）可以拦截几乎所有对象操作，比手写 `Object.defineProperty` 代理更彻底
- 代理模式 vs 装饰器模式（承接第 06 篇）：代理通常在构造时就决定代理谁（且可能控制客户端拿不到真实对象），装饰器在运行时包装已有对象且不限制访问

#### 三、工程落地参考

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

#### 四、实践演示与验证

用 `Proxy` 给一个药品查询 API 加缓存代理，验证短时间内重复调用不发真实请求；实现一个图片懒加载虚拟代理，占位图替代真实图直到进入视口。

#### 五、参考

- MDN Proxy 与 Reflect 文档
- Vue 3 源码 reactivity 包（仅做跨系列指引，不在本篇展开）

**面试核心问**：
- 代理模式有哪几种常见分类？分别对应什么场景？
- 代理模式和装饰器模式结构相似，怎么从意图上区分？
- ES6 Proxy 相比 `Object.defineProperty` 有什么优势？

---

### 第 08 篇：组合模式与桥接模式：树形结构与维度解耦

**副标题**：组合模式让单个节点和整棵树的接口一致，桥接模式让两个独立变化的维度不互相绑定

#### 一、使用与实践

- 医疗后台的科室-医生树：省级医院下有科室，科室下有医生，勾选"全院"等于勾选所有科室下所有医生——组合模式让"科室"和"医生"都响应 `getStaffCount()` 这同一个接口，遍历代码对两种节点一视同仁
- 药品销售报表支持"按地区"或"按药品类别"两个维度独立切换，且每个维度又有多种展示形式——如果用继承，需要 M×N 个子类（地区×报表类型）；桥接模式把两个维度分开，各自独立扩展

#### 二、设计与原理

- **组合模式**：将对象组合成树形结构，使单个对象（Leaf）和容器对象（Composite）都实现同一接口，客户端对树的操作与对叶节点的操作代码完全一致——核心是"统一接口"
- 前端天然案例：DOM 树（`element.children` 和 `element` 本身都能 `.querySelector`）、React 组件树（父组件和叶组件都渲染 JSX）
- **桥接模式**：将抽象部分与实现部分分离，使它们可以独立变化——用组合代替继承打破 M×N 类爆炸：`Abstraction` 持有 `Implementor` 引用，两者独立扩展
- 组合 vs 桥接区别：组合是"树形递归"结构关注，桥接是"两个维度解耦"关注，二者常同时出现

#### 三、工程落地参考

```typescript
// 组合模式：科室-医生树
interface StaffNode { getName(): string; getCount(): number; }
class Doctor implements StaffNode {
  constructor(private name: string) {}
  getName() { return this.name; }
  getCount() { return 1; }
}
class Department implements StaffNode {
  private children: StaffNode[] = [];
  constructor(private name: string) {}
  add(node: StaffNode) { this.children.push(node); }
  getName() { return this.name; }
  getCount() { return this.children.reduce((s, c) => s + c.getCount(), 0); }
}
```

#### 四、实践演示与验证

递归打印一棵医院科室树，叶节点（医生）和容器节点（科室）复用同一个遍历函数；再演示桥接模式：新增一种报表维度只加一个类，不修改任何现有代码。

#### 五、参考

- MDN DOM 树接口文档
- 《设计模式》GoF 组合模式 / 桥接模式章节

**面试核心问**：
- 组合模式的核心思想是什么？举一个前端中的天然例子。
- 桥接模式解决了什么问题？它和策略模式有什么区别？
- 什么情况下继承会导致类爆炸？桥接模式怎么解决？

---

### 第 09 篇：享元模式：对象池与虚拟列表节点复用

**副标题**：共享不变部分，隔离可变部分——理解这句话，享元模式就通了

#### 一、使用与实践

- 虚拟列表渲染 10 万条药品记录：只创建视口内可见数量（约 20 个）的 DOM 节点，滚动时复用节点、只更新数据——这是享元模式在前端最直接的工程案例
- Canvas 绘制大量医疗图表点位：每个数据点的"样式配置"共享同一个对象（享元），每个点的"坐标"各自存储（外部状态）
- 字符串常量池（V8 内部）、React Fiber 节点池：运行时层面的享元优化，理解原理后能更好解释"为什么 key 很重要"

#### 二、设计与原理

- **意图**：用共享技术有效支持大量细粒度对象，将对象状态划分为内部状态（不变，可共享）和外部状态（可变，不共享），只共享内部状态
- **内部状态 vs 外部状态**：虚拟列表中，节点的 HTML 结构和样式是内部状态（共享），渲染的数据内容（第 N 条记录）是外部状态（每次渲染时传入）
- 享元工厂：管理享元对象池，相同内部状态的对象只创建一次，后续直接从池中取
- 享元 vs 缓存代理（辨析）：享元强调"对象数量减少"（共享对象本身），缓存代理强调"调用次数减少"（缓存调用结果）——两者常被混淆

#### 三、工程落地参考

```typescript
// 享元工厂：药品列表节点池
class DrugListItemPool {
  private pool: HTMLElement[] = [];
  acquire(): HTMLElement {
    return this.pool.pop() ?? this.createItem();
  }
  release(el: HTMLElement) { this.pool.push(el); }
  private createItem() {
    const el = document.createElement('div');
    el.className = 'drug-list-item'; // 内部状态：结构和样式共享
    return el;
  }
}
// 外部状态：渲染时注入
function renderItem(el: HTMLElement, drug: Drug) {
  el.dataset.id = drug.id;
  el.textContent = drug.name; // 外部状态：每次不同
}
```

#### 四、实践演示与验证

不使用享元：创建 10 万个 `DrugItem` 对象，测量内存占用；使用享元池：只保持 50 个对象，滚动时复用，对比内存和帧率数据；同时演示"内部状态"和"外部状态"的分割边界。

#### 五、参考

- React 虚拟列表库 react-window 源码
- Chrome DevTools Memory 面板教程

**面试核心问**：
- 享元模式的核心是什么？什么是内部状态和外部状态？
- 虚拟列表的节点复用是享元模式吗？和对象池有什么区别？
- 享元模式和缓存代理的区别是什么？

---

### 第 10 篇：观察者模式与发布-订阅模式：谁才是真正的解耦

**副标题**：全系列最高频也最容易答错的一道题，这一篇彻底讲清楚

> 本篇讲两种模式的通用抽象和跨框架场景（EventEmitter、DOM 自定义事件、Redux subscribe），Vue3 `track/trigger/effect` 的具体源码实现见《Vue 3 源码》系列响应式篇，避免重复

#### 一、使用与实践

- 医生修改患者病历后，页面上的"病历摘要卡片"、"用药提醒"、"随访计划"三个互不相关的组件都要联动更新——如果让病历模块直接持有这三个组件的引用去逐个调用，耦合度极高
- Redux `store.subscribe(listener)`、DOM `addEventListener`、Node.js `EventEmitter.on` 表面都是"订阅-通知"，但底层结构并不完全相同
- 医患 IM 系统里，"新消息到达"这个事件需要被聊天窗口、未读计数、通知栏三个完全不知道彼此存在的模块响应——这正是发布订阅模式要解决的问题

#### 二、设计与原理

- **观察者模式**：定义一对多的依赖关系，一个 Subject 维护一个 Observer 列表，状态变化时**直接遍历调用**每个 Observer 的更新方法。Subject 知道 Observer 的存在（持有引用），是**双方耦合**（哪怕耦合度很低）
- **发布-订阅模式**：发布者和订阅者不直接认识，通过一个中介（Event Channel / Broker / EventBus）传递消息，发布者只管往 channel 发消息，订阅者只管往 channel 注册——是**完全解耦**，两者互不知道对方存在
- **核心区别**（面试必考）：观察者模式是 Subject 与 Observer **直接关联**（Subject.notify() 里遍历 this.observers），发布订阅模式**多了一层中介**（Publisher 和 Subscriber 都只认识 EventBus，不认识对方）
- Vue2 的 `Dep`/`Watcher` 更贴近观察者模式（Dep 直接持有 Watcher 列表并 notify）；Node.js `EventEmitter`、浏览器自定义事件、消息队列更贴近发布订阅模式（都经过一个中心化的事件通道）
- 两者共同解决的问题：解耦"状态变化"和"响应状态变化的逻辑"，让新增响应逻辑不需要修改状态产生方的代码（体现 OCP）

#### 三、工程落地参考

```typescript
// 观察者模式：Subject 直接持有 Observer
interface Observer { update(data: MedicalRecord): void; }
class MedicalRecordSubject {
  private observers: Observer[] = [];
  subscribe(o: Observer) { this.observers.push(o); }
  notify(data: MedicalRecord) { this.observers.forEach(o => o.update(data)); }
}

// 发布订阅模式：经过中介 EventBus 解耦
class EventBus {
  private events = new Map<string, Array<(...args: any[]) => void>>();
  on(event: string, cb: (...args: any[]) => void) {
    (this.events.get(event) ?? this.events.set(event, []).get(event)!).push(cb);
  }
  emit(event: string, ...args: any[]) {
    this.events.get(event)?.forEach(cb => cb(...args));
  }
}
const bus = new EventBus();
bus.on('record:updated', (record) => updateSummaryCard(record)); // 订阅方不认识发布方
```

#### 四、实践演示与验证

用观察者模式实现病历卡片联动，画序列图标出 Subject 直接调用 Observer；再用 EventBus 重写同样的场景，画序列图标出多了一层中介节点；对照两张图直观看出"直接引用"和"经过中介"的结构差异。

#### 五、参考

- Node.js EventEmitter 源码
- Vue 2 源码 Dep/Watcher 实现（跨系列指引）
- 《JavaScript 设计模式与开发实践》观察者模式章节

**面试核心问**：
- 观察者模式和发布订阅模式的本质区别是什么？（是否存在中介、是否互相知道对方）
- Vue 的响应式系统属于观察者模式还是发布订阅模式？
- Node.js 的 EventEmitter 算观察者模式吗？为什么？
- 观察者模式如何避免内存泄漏（忘记 unsubscribe）？

---

### 第 11 篇：策略模式：从表单校验到 Hook 封装

**副标题**：把"算法"封装成可互换的对象，让调用方不知道也不关心用的是哪一种

#### 一、使用与实践

- 医疗平台的药品搜索排序：可以按"价格升序"、"销量降序"、"综合评分"、"距离"排序，每种排序逻辑都是一个策略，用户切换时直接替换策略对象，排序函数本身不变
- 处方表单校验：普通处方、精神类处方、麻醉处方有不同的校验规则，用策略模式把校验规则从表单逻辑里剥离，各规则独立可测
- AB 测试：同一个推荐接口根据实验分组选不同的推荐算法——策略在运行时由配置决定，调用方代码完全不变

#### 二、设计与原理

- **意图**：定义一系列算法，将每一个封装起来，并使它们可以相互替换——调用方只面向策略接口编程，不依赖具体算法实现（DIP + OCP 的直接体现）
- 策略 vs if-else：`if (type === 'price') sort by price; else if ...` 每新增一种排序就要改函数内部——违反 OCP；策略模式新增排序只加一个策略类，调用方零改动
- 策略 vs 状态模式（辨析，为第 14 篇埋点）：策略模式的"策略"是由外部传入的（调用方决定用哪个），状态模式的"状态"是内部自主迁移的（对象自己管理自己用哪个）——意图不同，结构相似
- JavaScript 一等函数下的简化：策略不需要封装成 class，直接用函数对象 `Map<string, (data: T) => R>` 作为策略注册表，更简洁

#### 三、工程落地参考

```typescript
// 校验策略注册表（函数式版）
type ValidateStrategy = (value: string) => string | null;
const prescriptionValidators: Record<string, ValidateStrategy> = {
  normal: (v) => v.trim() ? null : '不能为空',
  controlled: (v) => /^[A-Z]{2}\d{6}$/.test(v) ? null : '格式不符合管制药品规范',
  anesthetic: (v) => v.length >= 20 ? null : '麻醉药品处方编号不足20位',
};
// 调用方不知道策略具体实现
function validate(type: string, value: string) {
  return prescriptionValidators[type]?.(value) ?? null;
}
```

#### 四、实践演示与验证

重构一个有 5 个 `if-else` 分支的校验函数：抽出策略注册表后，新增一种处方类型只加一行注册，调用方函数体不变；为每个策略单独写单元测试，对比重构前"测一个要 mock 整个分支结构"的痛点。

#### 五、参考

- 《Head First 设计模式》策略模式章节
- Zod / yup 等校验库的 schema 设计（策略模式的实际应用）

**面试核心问**：
- 策略模式和状态模式的区别是什么？（策略由外部注入，状态由内部迁移）
- 用 if-else 实现多种算法和用策略模式实现有什么本质区别？
- JavaScript 里不用 class 怎么实现策略模式？

---

### 第 12 篇：职责链模式：中间件的本质

**副标题**：Express/Koa 中间件、axios 拦截器、事件冒泡——全是职责链，只是形态不同

> 本篇讲职责链作为设计模式的通用形态，Koa `compose` 的具体源码手写实现见《Node.js 全栈》系列，避免重复

#### 一、使用与实践

- 处方提交前需要依次通过：参数校验 → 用药禁忌检查 → 库存校验 → 风控审核，任意一环失败就中断，通过才真正提交——用职责链把每个检查解耦成独立 Handler，顺序调用，随时可以插拔新检查项
- Express/Koa 的 `app.use(middleware)` 就是注册一个 Handler 进链；`next()` 就是把控制权传递给下一个
- axios 请求/响应拦截器：每个 `interceptors.request.use()` 注册一个处理器，请求发出前按注册顺序依次执行

#### 二、设计与原理

- **意图**：将请求的发送方和处理方解耦——沿着一条链传递请求，链上的 Handler 依次判断"我能不能处理"，能则处理，不能则传递给下一个
- 纯职责链（每个 Handler 只处理或只传递，不能两者都做）vs 变体（每个 Handler 都可处理且可以选择是否继续传递，即中间件模式）——Koa 是典型变体：每个中间件都能读写请求响应，调用 `await next()` 继续传递
- 洋葱模型（Koa）：中间件在 `next()` 前后都有代码，形成"进入-穿越-返回"的嵌套执行顺序，与简单职责链的单向传递不同
- 职责链 vs 策略模式：策略模式选一个执行，职责链全部依次通过（或某个中断）

#### 三、工程落地参考

```typescript
// 处方校验职责链
type Handler = (ctx: PrescriptionCtx, next: () => Promise<void>) => Promise<void>;
function compose(handlers: Handler[]) {
  return (ctx: PrescriptionCtx) => {
    let i = 0;
    const next = () => handlers[i] ? handlers[i++](ctx, next) : Promise.resolve();
    return next();
  };
}
const pipeline = compose([
  validateParams,
  checkContraindications,
  checkInventory,
  riskAudit,
]);
```

#### 四、实践演示与验证

构建一个 4 步处方校验链，演示某一步失败时链中断、后续步骤不执行；新增一步"医保资格校验"只需在数组中插入新 Handler，不改任何已有代码；对比"没有职责链时全部写在一个 async 函数里"的可扩展性。

#### 五、参考

- Koa 源码 `koa-compose` 包（约 50 行，是学习职责链变体的最佳范本）
- Express 中间件机制官方文档

**面试核心问**：
- 职责链模式和中间件模式有什么关系？它们是同一种模式吗？
- Koa 的洋葱模型和普通职责链有什么区别？
- 职责链、策略、命令模式都能解耦请求处理，区别在哪？

---

### 第 13 篇：命令模式：撤销重做与任务队列

**副标题**：把"请求"本身封装成对象，就能存储、排队、回放、撤销它

#### 一、使用与实践

- 医疗后台的病历编辑器需要支持 Ctrl+Z 撤销/Ctrl+Y 重做：每次编辑操作封装成一个 Command 对象，undo 栈存储历史，撤销时弹出并调用 `undo()`
- 批量操作队列：药品库存盘点时，审核员确认后一次性提交 50 条修改，失败可整体回滚——每条修改是一个命令对象，队列统一执行
- Redux action 本质是命令模式：`dispatch({ type: 'ADD_TO_CART', payload: drug })` 就是一个命令对象，reducer 是命令的执行器，action history 是命令队列

#### 二、设计与原理

- **意图**：将一个请求封装成对象，从而可以用不同的请求参数化客户端、对请求排队、记录请求日志、支持可撤销操作
- 四个角色：**Command**（封装请求的接口，有 `execute()`/`undo()`）、**ConcreteCommand**（具体命令，持有接收者引用）、**Invoker**（调用者，只认识 Command 接口，不关心具体操作）、**Receiver**（真正执行操作的对象）
- 撤销实现的两种策略：①保存操作前快照（备忘录，简单但内存大）；②保存逆操作（`undo()` 里写反向逻辑，节省内存但需要实现逆操作）
- 宏命令（MacroCommand）：组合多个命令为一个命令，`execute()` 里依次执行子命令——是组合模式在命令上的应用

#### 三、工程落地参考

```typescript
interface Command { execute(): void; undo(): void; }
class EditRecordCommand implements Command {
  private backup: string;
  constructor(private record: MedicalRecord, private newContent: string) {
    this.backup = record.content;
  }
  execute() { this.record.content = this.newContent; }
  undo() { this.record.content = this.backup; }
}
class CommandHistory {
  private stack: Command[] = [];
  execute(cmd: Command) { cmd.execute(); this.stack.push(cmd); }
  undo() { this.stack.pop()?.undo(); }
}
```

#### 四、实践演示与验证

实现一个带 undo/redo 的病历编辑器：连续执行 3 个编辑命令，然后连续撤销，验证每次 undo 后状态正确回退；再演示命令队列：批量排队 5 个命令，统一 `executeAll()`。

#### 五、参考

- Redux 官方文档（action 作为命令对象）
- Immer.js（基于快照实现 undo 的典型工具）

**面试核心问**：
- 命令模式和策略模式的区别是什么？（命令封装的是"请求"可撤销，策略封装的是"算法"可替换）
- Redux 的 action/reducer 架构体现了哪种设计模式？
- 撤销操作的两种实现方式各有什么优缺点？

---

### 第 14 篇：状态模式与模板方法模式：用结构取代 if-else

**副标题**：状态模式管理"状态怎么迁移"，模板方法固定"骨架不能改、细节可以改"

#### 一、使用与实践

- 处方订单有"待审核 → 已通过 → 已发药 → 已完成"或"待审核 → 已拒绝"等状态流转，每个状态下允许的操作和下一步跳转都不同——用一堆 `if (status === 'pending')` 判断会随状态增多迅速失控，用状态模式把每个状态封装成对象，各自管理自己能做什么、能跳到哪
- 三种问诊类型（图文/电话/视频）的接诊流程骨架完全一致（建档 → 候诊 → 接诊 → 开处方 → 结束），只有"接诊"这一步的具体实现不同——用模板方法固定骨架，子类只重写差异步骤

#### 二、设计与原理

- **状态模式**：允许对象在内部状态改变时改变它的行为，看起来就像改变了类——每个状态是一个类，包含"在此状态下可以做什么操作"和"操作后应该迁移到哪个状态"，状态迁移逻辑分散在各状态类中，而非集中在一个大 switch 里
- **模板方法模式**：在父类中定义一个算法的骨架（`template()` 方法固定步骤顺序），将某些步骤延迟到子类实现（抽象方法或可选的 `hook`）——是"继承"用于复用流程骨架的经典场景
- 状态模式 vs 策略模式（承接第 11 篇）：策略由外部调用方选择使用哪个，状态由对象自身根据当前状态决定行为并自主迁移到下个状态——**谁决定切换**是核心区分点
- 状态模式 vs 有限状态机（FSM）：状态模式是 FSM 的一种面向对象实现方式，FSM 是更抽象的数学模型（状态+事件+迁移表），XState 等状态机库把迁移表显式配置化，比手写状态模式类更易维护和可视化

#### 三、工程落地参考

```typescript
// 状态模式：处方订单状态
interface OrderState {
  approve(order: PrescriptionOrder): void;
  reject(order: PrescriptionOrder): void;
}
class PendingState implements OrderState {
  approve(order: PrescriptionOrder) { order.setState(new ApprovedState()); }
  reject(order: PrescriptionOrder) { order.setState(new RejectedState()); }
}
// 模板方法：三种问诊流程骨架
abstract class ConsultationFlow {
  run() { // 模板方法：骨架固定，不可被子类改变调用顺序
    this.createRecord();
    this.waitInQueue();
    this.consult(); // 唯一可变步骤
    this.issuePrescription();
  }
  protected abstract consult(): void;
  private createRecord() { /* 固定实现 */ }
  private waitInQueue() { /* 固定实现 */ }
  private issuePrescription() { /* 固定实现 */ }
}
class VideoConsultationFlow extends ConsultationFlow {
  protected consult() { /* 视频问诊特有逻辑 */ }
}
```

#### 四、实践演示与验证

用状态模式重构一个 4 状态订单流转的 if-else 判断，新增一个"已取消"状态只加一个类，不改其他状态类；用模板方法实现三种问诊流程复用同一骨架，只重写 `consult()` 一处。

#### 五、参考

- XState 官方文档（状态机可视化配置）
- 《设计模式》GoF 状态模式 / 模板方法模式章节

**面试核心问**：
- 状态模式和策略模式的区别是什么？（谁决定切换、是否自主迁移）
- 状态模式和有限状态机是什么关系？
- 模板方法模式如何体现"好莱坞原则"（父类调用子类，而非子类调用父类）？

---

### 第 15 篇：迭代器模式：从 Iterator 协议到 Generator

**副标题**：JavaScript 的 `for...of`、展开运算符、解构赋值背后都是同一个迭代器协议

#### 一、使用与实践

- 药品列表支持多种遍历方式：按字母顺序、按价格、按科室分组——迭代器模式把遍历逻辑从集合里剥离，不同遍历策略换一个迭代器即可，不改集合类本身
- 分页数据的懒加载遍历：用迭代器封装"当前页用完了就自动请求下一页"的逻辑，调用方只管 `for...of`，不关心何时发请求
- 树形科室结构的深度优先 / 广度优先遍历：两种遍历算法封装成两个迭代器，集合类本身不变

#### 二、设计与原理

- **意图**：提供一种方法顺序访问一个聚合对象中的各个元素，而不暴露该对象的内部表示——调用方不需要知道集合是数组、链表还是树
- **JavaScript 迭代器协议**：实现了 `[Symbol.iterator]()` 方法且返回有 `next(): { value, done }` 的对象，就是可迭代对象——语言层面的迭代器模式标准化
- `for...of`、展开运算符 `[...arr]`、解构赋值 `const [a, b] = iter`、`Array.from()`、`Map`/`Set`/字符串/`arguments` 全部基于这同一个协议
- **Generator 函数**（`function*`）：是实现迭代器的语法糖——`yield` 暂停并返回值，调用方 `next()` 继续执行，天然实现惰性求值（大数据集按需取，不一次全计算）
- 迭代器 vs `forEach`：`forEach` 无法中途 `break`（除非 `throw`），迭代器可以随时停止迭代；迭代器也支持异步（`async function*` + `for await...of`）

#### 三、工程落地参考

```typescript
// 自定义可迭代集合：分页药品列表
class PaginatedDrugList implements Iterable<Drug> {
  constructor(private pages: Drug[][]) {}
  [Symbol.iterator](): Iterator<Drug> {
    let pageIdx = 0, itemIdx = 0;
    const pages = this.pages;
    return {
      next() {
        if (pageIdx >= pages.length) return { value: undefined as any, done: true };
        const value = pages[pageIdx][itemIdx++];
        if (itemIdx >= pages[pageIdx].length) { pageIdx++; itemIdx = 0; }
        return { value, done: false };
      }
    };
  }
}
// Generator 版：惰性无限序列
function* drugIdGenerator(prefix: string) {
  let i = 1;
  while (true) yield `${prefix}-${String(i++).padStart(6, '0')}`;
}
```

#### 四、实践演示与验证

给树形科室数据结构实现深度优先迭代器，用 `for...of` 遍历全院所有医生，无需关心树的层级；再用 Generator 实现一个"按需翻页"的药品列表，验证不翻页则不触发接口请求。

#### 五、参考

- MDN Iterator 协议文档
- MDN Generator 函数文档

**面试核心问**：
- JavaScript 的迭代器协议是什么？哪些内置类型实现了它？
- Generator 和普通迭代器有什么关系？Generator 的惰性求值体现在哪里？
- `for...of` 和 `forEach` 的本质区别是什么？

---

### 第 16 篇：收官篇：中介者模式 / 备忘录模式 / 访问者模式 / 解释器模式

**副标题**：前端出现频率最低的四个模式，各用一个典型场景讲透，不为凑篇数注水

#### 一、使用与实践

- **中介者**：多个表单字段互相联动校验（选了"处方药"则"用药说明"必填，选了"进口药"则"海关备案号"必填），字段之间不直接引用对方，而是都通过一个 `FormMediator` 协调
- **备忘录**：病历编辑器的"保存历史快照"能力，与命令模式的 undo 栈配合，备忘录负责"存什么、怎么存"，命令模式负责"什么时候存、什么时候恢复"
- **访问者**：对一棵 AST（如富文本编辑器的文档树）做多种不同处理——导出为 HTML、导出为纯文本、统计字数——不修改节点类本身，而是把每种处理抽成一个 Visitor
- **解释器**：药品定价规则引擎（"满 200 减 20，会员再打 9 折"）用简单的自定义 DSL 描述规则，解释器负责解析和执行这个 DSL

#### 二、设计与原理

- **中介者模式**：用一个中介对象封装一系列对象的交互，使对象不需要显式地相互引用，从而降低耦合——与外观模式相似（都是"包一层"），区别是中介者关注**多个对象之间的双向交互协调**，外观关注**单向简化调用**（承接第 05 篇的辨析）
- **备忘录模式**：在不破坏封装性的前提下，捕获并外部化一个对象的内部状态，以便之后恢复——与命令模式常配合使用（命令模式的 undo 也可以直接用备忘录存快照，而非实现逆操作）
- **访问者模式**：将作用于某种数据结构的操作从数据结构中分离出来，封装成独立的 Visitor 类——数据结构提供 `accept(visitor)` 方法，双分发（double dispatch）让"数据结构类型"和"操作类型"两个维度独立扩展。前端最常见于 AST 处理（Babel 插件、ESLint 规则本质都是访问者模式）
- **解释器模式**：给定一个语言，定义它的语法表示，并定义一个解释器来解释该语言中的句子——前端场景多见于简化版规则引擎、模板引擎、表达式计算器，工业级场景通常不手写而是用现成解析库

#### 三、工程落地参考

```typescript
// 访问者模式：AST 节点统计字数 vs 导出 HTML，两种操作独立扩展
interface Visitor { visitText(node: TextNode): void; visitImage(node: ImageNode): void; }
interface ASTNode { accept(visitor: Visitor): void; }
class TextNode implements ASTNode {
  constructor(public content: string) {}
  accept(visitor: Visitor) { visitor.visitText(this); }
}
class WordCountVisitor implements Visitor {
  count = 0;
  visitText(node: TextNode) { this.count += node.content.length; }
  visitImage() {}
}
```

#### 四、实践演示与验证

用中介者模式重构一个 5 个字段互相依赖的表单校验逻辑，验证新增第 6 个联动字段不需要修改已有字段的代码；用访问者模式给一棵简化文档树同时实现"字数统计"和"导出 HTML"两种操作，验证新增第三种操作（如导出 Markdown）不需要修改节点类。

#### 五、参考

- Babel AST 与 Visitor 模式官方文档
- 《设计模式》GoF 中介者 / 备忘录 / 访问者 / 解释器章节

**面试核心问**：
- 中介者模式和外观模式有什么区别？（多向协调 vs 单向简化）
- 备忘录模式和命令模式的 undo 实现有什么关系？
- 访问者模式如何在不修改数据结构类的前提下新增操作？体现了什么原则？
- 你有没有在项目中见过解释器模式的应用（如规则引擎、模板引擎）？

---

## 面试高频专题

以下是本系列反复强调、容易混淆的辨析对比，建议整理成单独的速查笔记：

| 辨析对比 | 核心区别 | 对应篇章 |
|---------|---------|---------|
| JS 原型链 vs 原型模式 | 前者是继承机制，后者是克隆创建对象的设计模式，名字相同但完全不同概念 | 第 04 篇 |
| 适配器模式 vs 外观模式 | 适配器改变接口形态（一对一），外观简化调用复杂度（一对多） | 第 05 篇 |
| 装饰器模式 vs 代理模式 | 装饰器强调动态增强职责，代理强调控制访问，结构相似意图不同 | 第 06/07 篇 |
| 享元模式 vs 缓存代理 | 享元减少对象数量（共享对象本身），缓存代理减少调用次数（缓存结果） | 第 09 篇 |
| 观察者模式 vs 发布订阅模式 | 观察者 Subject 直接持有 Observer 列表（双方耦合），发布订阅经过中介 EventBus（完全解耦） | 第 10 篇 |
| 策略模式 vs 状态模式 | 策略由外部调用方选择使用哪个，状态由对象自身根据当前状态自主决定并迁移 | 第 11/14 篇 |
| 职责链模式 vs 中间件模式 | 中间件是职责链的变体：每个节点既可处理又可选择继续传递（洋葱模型），纯职责链是单向传递 | 第 12 篇 |
| 命令模式 vs 策略模式 | 命令封装"请求"（可撤销、可排队），策略封装"算法"（可互换执行） | 第 13 篇 |
| 中介者模式 vs 外观模式 | 中介者协调多个对象的双向交互，外观简化对一组子系统的单向调用 | 第 05/16 篇 |
| 状态模式 vs 有限状态机 | 状态模式是 FSM 的一种面向对象实现方式，FSM 是更抽象的数学模型 | 第 14 篇 |

---

## 各篇标准笔记模板

每篇文章发布前，先在 `docs/learning/notes/design-patterns/{knowledge-point}.md` 建立对应笔记，笔记结构与文章五段式一致：

```markdown
# {模式名称}

## 意图
一句话描述这个模式解决的问题

## 使用场景（医疗/电商业务）
- 场景 1
- 场景 2

## 核心实现
（TypeScript 代码 + 类图）

## 易混淆辨析
（如与本模式结构相似、意图不同的模式对比）

## 面试问答记录
- Q:
  A:
```

命名示例：`docs/learning/notes/design-patterns/observer-vs-pubsub.md`、`docs/learning/notes/design-patterns/singleton.md`

---

## 参考资源池

- 《设计模式：可复用面向对象软件的基础》（GoF 原著）
- 《Head First 设计模式》（案例更贴近实战，适合入门后查漏补缺）
- 《JavaScript 设计模式与开发实践》曾探 著（前端场景化讲解，中文资料首选）
- refactoring.guru 设计模式图解站（每种模式配 UML 图 + 多语言代码示例）
- MDN Proxy / Iterator / Generator 官方文档
- Vue 3、Redux、Koa、axios 源码（本系列多处引用，均为已在项目中实际使用的技术栈）

---

*规划时间：2026-09-11 | 目标读者：5-10 年前端/全栈，系统备战大厂设计模式面试*
