# 享元模式：从对象池到虚拟列表的节点复用（面试收藏级）

> **副标题**：共享不变部分，隔离可变部分

面试官问：「虚拟列表滚动十万条数据为什么不卡？」很多人会答「只渲染可见区域」。接着追问：「那剩下的数据对应的节点去哪了？滚动的时候是销毁重建，还是复用？」这时候很多人就答不上来了。缺口就在「复用」两个字上。享元模式讲的正是这件事：当大量对象里有一部分状态完全相同时，怎样只保留一份，并把会变化的部分交给调用方每次传入。

---

## 🎯 这篇文章解决什么问题

读完这篇，你应该能做到四件事：

- 给任意一个对象的状态做划分，说清哪部分是内部状态（可共享），哪部分是外部状态（必须外置）。
- 在前端代码里认出至少四处享元思想的落点，包括虚拟列表、样式配置、节点池等。
- 不看资料手写一个能跑的虚拟列表，并用 DevTools 证明它确实在复用节点，而不是销毁重建。
- 说清享元与对象池、缓存代理、单例、原型、memoize 之间的边界，不再把它们混为一谈。

---

## 一、十万条药品记录，为什么只创建二十个节点

假设一个药品目录页要展示 10 万条记录，每条记录一行，行高 48px，视口高 960px。视口内同时可见的行数是 960 ÷ 48 = 20 行。实际渲染时还会多挂几行作为缓冲，防止快速滚动时出现白屏。所以真正创建的 DOM 节点数大致是「视口行数 + 缓冲行数」，通常在二三十个量级。

这里有一个很关键的前提：**节点总数是常量，数据总量是变量**。数据从 1 万条增长到 10 万条，节点数量基本不变，变化的只是「节点当前显示哪一条数据」。

这正是享元能成立的第一个前提：大量逻辑上的「对象」（每条数据都是一个列表项），由少量可复用的物理对象（节点）承载。

再看一个更极端的场景。医疗地图上要标注十万个点位，每个点位都要用 Canvas 画一个圆。如果每个点位都创建一份样式对象（颜色、半径、线宽），内存里就会有十万份几乎相同的样式。这类问题同样可以用享元来治理。不过解法要从「把状态拆开」开始，所以下一节先给判据，第四节再看代码——到时我们会拿笔记里那个 Canvas 示例做一次严格体检，看看它到底算不算享元。

🔧 **真实场景**：药品搜索结果页、后台药品目录、库存盘点列表，这类页面的共同特点是数据量大、单项结构高度一致，滚动时只需要替换「显示哪条数据」，不需要为每条数据重新搭一套 DOM。

> 💬 **面试官**：只渲染可见区域就够了吗？
> ✅ **标准答案**：只渲染可见区域解决的是「节点数量不随数据量增长」的问题。滚动时通过计算起始索引，复用已有节点，只更新它们的内容。
> 🎁 **加分答案**：还要说明复用的是节点，数据是外部传入的。节点本身不持有业务数据，这样才能让同一个节点在不同时刻承载不同的药品记录，同时也保证了节点的样式和结构可以被所有项共享。

---

## 二、意图与本质：把状态切成「不变的」和「会变的」

享元模式的意图可以概括为一句话：运用共享技术，有效地支持大量细粒度的对象。笔记概述里的要点可以归纳为四条：

- 共享可以节约内存空间；
- 相同的数据可以被多个对象共享；
- 数据与方法可以分离后再共享；
- 内部状态可以共享，外部状态不能共享。

前两条说的是「能省内存」，后两条说的是「怎样省」。真正的难点在第四条：哪些状态能共享，哪些不能。

### 核心矛盾：对象数量 × 每份状态的内存

享元要解决的问题可以写成一个简单的乘法：**相似对象数量 × 每个对象独占的状态内存**。以十万个医疗点位为例，每个点位都有颜色、半径、线宽、坐标四个属性。坐标每个点都不同，必须逐个保存；颜色、半径、线宽在大多数点位上是相同的，如果也逐个保存，就是十万份重复数据。

![享元模式要解决的问题](https://refactoring.guru/images/patterns/diagrams/flyweight/problem-en.png)

图注：这张图画的是问题本身——每个粒子对象都各自保存了一份完全相同的图像、坐标和速度数据，对象数量一多，内存就按「对象数 × 每份完整状态」线性膨胀。它对应的正是本文这道乘法题，也是享元唯一值得出手的场合：**相同的那部分被存了太多遍**。

享元的做法是只把「真正不同」的部分逐个保存，把「重复」的部分收敛成少数几份。这个动作分两步走，refactoring.guru 用了两张图分别表示：

![共享相同的内部状态](https://refactoring.guru/images/patterns/diagrams/flyweight/solution1-en.png)

图注：第一步是让所有粒子改用同一个享元对象来提供图形、颜色这些相同数据——原来每个对象各存一份，现在所有对象指向同一份。图中共享出去的部分就是「内部状态」，注意它只保留了一份，实例数量并没有因此减少，减少的是重复状态的数量。

![外部状态集中存放](https://refactoring.guru/images/patterns/diagrams/flyweight/solution2-en.png)

图注：第二步是把真正每个对象都不同的部分（图中是坐标和速度）从对象里挪出去，改由外部集中存放一个「坐标/速度数组」，绘制时按索引取。这一步是很多人漏掉的：只做第一步只是共享了数据，必须再完成第二步才算享元——**内部状态留在享元里共享，外部状态搬到对象外面按需传入**。

这两张图的顺序不能颠倒。先合并相同的，再外置不同的；如果只做第一步，对象数量没变，只是字段没重复了，内存收益有限；如果只做第二步，共享就无从谈起。

### 内部状态与外部状态的判断标准

这是全文最重要的一张表。判断一段状态属于哪一边，可以从四个维度看：

| 判断维度 | 内部状态（可共享） | 外部状态（外置） |
|---|---|---|
| 是否随使用场景变化 | 不变 | 每次使用都可能变化 |
| 能否被多个对象共用 | 能 | 不能，只属于某一个使用位置 |
| 修改后会不会影响其他使用者 | 会，因此共享后只读 | 不会，只影响当前调用方 |
| 典型例子 | 颜色、字体、列表项的结构模板 | 坐标、当前行数据、选中状态 |

实际判断时，可以问自己三个问题：换一个使用场景，它还一样吗？多个对象能共用它吗？改了它，会不会影响别的使用者？三个都是「是」，它就是内部状态。只要有一个答案是「否」，它就应该外置。

下面用一段类型定义把两类状态拆开：

```typescript
// 内部状态：可共享、只读，多个节点共用同一份
interface DrugCardStyle {
  readonly background: string
  readonly fontSize: number
}

// 外部状态：每次渲染时由调用方传入，不被共享
interface DrugCardData {
  id: string
  name: string
  stock: number
}
```

### 享元不适用的边界

如果一个对象的所有状态都随使用变化，就没有可共享的部分。比如一个表单里每个输入框都有独立的用户输入值，内部状态几乎为空。这时硬套享元，只会拆出一堆「只有一个调用方」的对象，结构反而更脆弱。

所以在动手之前，先估算能共享的内部状态占比。占比低、对象数量也不大时，直接用普通对象更清晰。

> 💬 **面试官**：享元模式里，内部状态和外部状态怎么区分？
> ✅ **标准答案**：内部状态是不随使用场景变化、可以被共享的部分；外部状态是随每次使用变化、由调用方传入的部分。
> 🎁 **加分答案**：判断时不能只看「会不会变」，还要看「变了会不会影响其他使用者」。能共享的前提是修改不会波及别人，所以内部状态必须只读。

---

## 三、结构与角色：三个角色各管什么

享元模式通常由三个角色组成：

- **Flyweight（享元接口）**：声明享元对象能接收外部状态并完成操作的方法。
- **ConcreteFlyweight（具体享元）**：实现接口，保存内部状态。
- **FlyweightFactory（享元工厂）**：按 key 创建并缓存享元，调用方通过工厂获取对象，而不是直接 `new`。

![享元模式结构图](https://refactoring.guru/images/patterns/diagrams/flyweight/structure.png)

图注：这是享元模式的标准结构图，工厂负责按 key 返回已有的享元对象，具体享元只保存内部状态，外部状态由客户端在调用时传入。

把这三个角色映射到虚拟列表，可以得到下面的对应关系：

| 角色 | 职责 | 虚拟列表里的对应物 |
|---|---|---|
| Flyweight | 声明接收外部状态的操作 | 列表项的渲染函数，形如 `render(item, index)` |
| ConcreteFlyweight | 保存内部状态 | 节点的结构模板与样式 |
| FlyweightFactory | 按 key 管理共享对象 | 节点池，提供 acquire / release |
| 外部状态 | 每次使用时由调用方传入 | 当前这一行对应的那条药品数据 |

这里有一个容易被忽略的设计点：**工厂的 key 决定共享粒度**。以样式为例，如果 key 只用颜色和半径，相同样式就会共享一份；如果把点位 ID 也拼进 key，每个点位都是独立的 key，就等于没有共享。反过来，如果 key 漏掉了某个真正影响渲染的字段（比如线宽），就会错误地共享，导致不同样式显示成同一个。所以 key 应当包含所有影响渲染的内部状态字段，而且只包含这些字段。

---

## 四、核心实现（上）：从笔记的示例说起

这一节按「错的 → 对的」递进。先保留笔记里的原始示例，再逐一说明它们是否属于享元，最后给出改进版本。上一节给了判据、第三节给了角色表，这里就把每个角色填成代码——下面的每个示例，都可以对着那张角色映射表看：谁是 Flyweight、谁是 Factory、外部状态从哪里进来。

### 笔记的 Canvas 示例：它不是享元

笔记原样保留的 Canvas 示例如下：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>享元模式</title>
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
</head>
<body>
  <p>
    <input type="radio" name="color" value="red" checked>红色
    <input type="radio" name="color" value="yellow">黄色
    <input type="radio" name="color" value="blue">蓝色
    <button onclick="draw()">绘制</button>
    <canvas id="canvas" width="1000px" height="600px"></canvas>
  </p>
  <script>
    class Canvas{
      ctx = canvas.getContext('2d');
      constructor(color) {
        this.ctx .clearRect(0,0,canvas.width,canvas.height);
        this.ctx.beginPath();
        this.ctx.arc(200, 200, 100, 0, 2 * Math.PI);
        this.ctx.fillStyle = color;
        this.ctx.fill();
      }
      setColor(color) {
        this.ctx.fillStyle = color;
        this.ctx.fill();
      }
    }

    const c = new Canvas('red');

    function draw() {
      const radioElements = document.getElementsByName('color');
      const radios = Array.from(radioElements);
      const checkedRadio = radios.find(r => r.checked);
      const color = checkedRadio.value || 'red';
      c.setColor(color);
    }
  </script>
</body>
</html>
```

这段代码全页只创建了一个 `Canvas` 实例 `c`，切换颜色时只调用 `c.setColor(color)`，修改的是它自己的 `fillStyle`。它省掉了重复获取上下文的开销，属于**单实例复用**，但它**不是享元**，理由有两条：

- **没有「多个逻辑对象共享少数物理对象」的结构**。全页只有一个圆，没有大量相似对象需要共用。
- **没有内部状态与外部状态的拆分**。颜色既是调用方的选择，又是对象自身唯一的状态，无从区分哪部分可以共享。

所以正文把它明确标为「不是享元」。它像享元的地方在于「避免重复创建」，不同之处在于没有「共享」。

### 真正的 Canvas 享元版：样式共享，坐标外置

下面的版本把样式作为内部状态按 key 共享，把坐标作为外部状态每次传入。

```typescript
interface PointStyle {
  color: string
  radius: number
}

const styleCache = new Map<string, PointStyle>()

// 享元工厂：相同 key 只创建一次，之后直接复用
function getPointStyle(color: string, radius: number): PointStyle {
  const key = `${color}-${radius}`
  let style = styleCache.get(key)
  if (!style) {
    style = { color, radius }
    styleCache.set(key, style)
  }
  return style
}
```

```typescript
// 外部状态 x、y 由调用方每次传入，不保存在样式对象里
function renderPoint(ctx: CanvasRenderingContext2D, style: PointStyle, x: number, y: number) {
  ctx.beginPath()
  ctx.arc(x, y, style.radius, 0, 2 * Math.PI)
  ctx.fillStyle = style.color
  ctx.fill()
}
```

十万个点位经过 `getPointStyle` 之后，只会创建「颜色 × 半径」组合数量的样式对象，而不是十万份。坐标 `x`、`y` 每次绘制时由 `renderPoint` 传入，不被任何对象持有。

需要注意的是：这只演示了享元的**对象结构**。真实 Canvas 的性能主要来自批处理绘制与路径复用，享元的痕迹主要落在「配置对象」这一层。不要把它当成性能数字的来源。

如果想看到一个「更硬」的享元，可以把同一形状的 `Path2D` 也共享出去——同一个 `Path2D` 实例被无数个绘制调用共用，只改 `translate` 和 `fillStyle`，这个对象比样式配置更重、复用收益也更直接：

```typescript
// 半径为 4 的小圆路径，全局只描述一次，被所有点位共用
const dotPath = new Path2D()
dotPath.arc(0, 0, 4, 0, 2 * Math.PI)

function drawDots(ctx: CanvasRenderingContext2D, points: ReadonlyArray<readonly [number, number]>) {
  for (const [x, y] of points) {
    ctx.setTransform(1, 0, 0, 1, x, y) // 外部状态：坐标通过变换矩阵注入
    ctx.fill(dotPath)                    // 内部状态：路径本身只存一份
  }
}
```

这里 `dotPath` 是内部状态，坐标是外部状态——和标题那句「共享不变部分，隔离可变部分」完全是同一件事，只是换了一个更重的对象。

### 笔记的分页示例：固定容量的节点复用

笔记原样保留的分页示例如下：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>享元模式</title>
</head>
<body>
  <ul id="news"></ul>
  <button id="next" onclick="goNext()">下一页</button>
  <script>
    const list = [];
    for (let i = 0; i < 20; i++) {
      list.push({id: Math.floor(Math.random() * 100000000).toString().padEnd(8, 0), title: '新闻'})
    }
    let page = 0;
    const pageSize = 5;

    const getLi = (function() {
      const lis = [];
      return function() {
        let element;
        if(lis.length < 5) {
          element = document.createElement('li');
          lis.push(element);
        } else {
          element = lis.shift(); // 从左端删除
          lis.push(element); // 添加到右端
        }
        return element;
      }
    })();

    function goNext() {
      if(page * pageSize >= list.length) return;
      page++;
      const start = (page - 1) * pageSize;
      for (let i = 0; i < 5; i++) {
        const element = getLi();
        const data = list[start + i];
        element.innerHTML = `${data.title}${data.id}`;
        news.appendChild(element);
      }
    }
    goNext();
  </script>
</body>
</html>
```

`getLi` 是一个闭包里的固定容量池：不足 5 个时新建节点，满了之后把最早使用的节点从左端取出、放到右端重新使用。节点总数不随翻页增长，这正是享元的核心思路——**节点是共享的载体，数据每次外部注入**。

但它有两处问题：

- **容量写死为 5，与 `pageSize` 不一致**。`goNext` 里的循环同样写死了 5。一旦把 `pageSize` 改成 10，节点池只有 5 个，循环却要取 10 次，数据就会错位。
- **池的大小藏在闭包里**，外部无法知道它有多大，也无法验证它确实在复用。

改进版把池的容量参数化，并让 `goNext` 与 `pageSize` 保持一致：

```javascript
function createNodePool(size) {
  const nodes = [];
  return function acquire() {
    if (nodes.length < size) {
      const el = document.createElement('li');
      nodes.push(el);
      return el;
    }
    const el = nodes.shift(); // 取出最早使用的节点
    nodes.push(el);           // 放回末尾，等待下一次复用
    return el;
  };
}

const getLi = createNodePool(pageSize);
```

同时把 `goNext` 中的 `i < 5` 改为 `i < pageSize`。还要注意末页不足一页时，`list[start + i]` 可能是 `undefined`，循环里应先判断数据是否存在。

### DrugListItemPool：把池的语义补完整

前面的 `createNodePool` 只解决了「复用」，还缺少「归还」和「统计」。下面用一个药品列表项池把它补完整。先定义数据类型和池的状态：

```typescript
interface Drug { id: string; name: string; stock: number }

class DrugListItemPool {
  private free: HTMLLIElement[] = []  // 空闲节点，等待复用
  size = 0                            // 已创建过的节点总数

  constructor(private createItem: () => HTMLLIElement) {}
  // ...
}
```

再实现取出、归还两个动作。`acquire` 把外部状态（一条药品）注入节点，`release` 把节点清空后放回池中：

```typescript
  acquire(drug: Drug): HTMLLIElement {
    const el = this.free.pop() ?? this.createNode()  // 有空闲就复用，没有才新建
    el.textContent = `${drug.name} 库存 ${drug.stock}` // 外部状态在这里注入
    return el
  }

  release(el: HTMLLIElement) {
    el.textContent = ''  // 清掉上一条数据，避免残留
    this.free.push(el)
  }
```

最后补上创建与预热。`prewarm` 在首屏前提前创建节点，避免用户第一次滚动时同步创建大量 DOM：

```typescript
  prewarm(n: number) {
    for (let i = 0; i < n; i++) this.free.push(this.createNode())
  }

  private createNode(): HTMLLIElement {
    this.size++
    return this.createItem()
  }
```

这里的 `size` 很有用：如果列表有 10 万条数据，而 `size` 只有三十几，就能直接证明池在复用，而不是每条数据都新建了节点。

这一节的原则可以归结为：**外部状态都通过参数传入，不在节点上偷偷保存数据**。节点一旦保存了业务数据，就无法安全地被其他数据复用。

### 两个上线后才会暴露的坑

池写对不难，写错却很容易在压测阶段才暴露。下面两个坑，是对象池在真实项目里翻车最多的两处。

**第一个坑：监听器在复用节点上无限累积。** 如果 `acquire` 里顺手写一句 `el.addEventListener('click', handler)`，每次取出节点都会再加一个监听器，而节点本身不会被销毁，监听器就一直挂着。滚动几千次之后，一个节点上挂着几千个 handler，闭包全部无法回收——这是对象池最典型的隐性内存泄漏。

```typescript
// ❌ 每次 acquire 都新增监听器，节点复用次数 = 监听器数量
acquire(drug: Drug): HTMLLIElement {
  const el = this.free.pop() ?? this.createNode()
  el.addEventListener('click', () => console.log(drug.id)) // 闭包抓住 drug，永不释放
  return el
}
```

正解是**把监听器上移到容器，用事件委托，靠 `dataset` 反查数据**——监听器只有一份，节点上只留标识：

```typescript
// ✅ 监听器只挂一次，节点上只存外部状态的标识
list.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('.drug-list-item')
  if (el?.dataset.id) handleDrugClick(el.dataset.id)
})
// acquire 里只做数据注入，不碰事件
el.dataset.id = drug.id
```

顺便说一句：`el.replaceWith(el.cloneNode(true))` 这类「克隆重置」的写法虽然能清掉监听器，但也会丢掉你已经绑好的标识和状态，而且每次克隆都新建了一个节点，复用直接失效——不要用它当解药。

**第二个坑：池没有上限，释放变收藏。** `release` 无条件 `push` 回去，看上去很安全，实际上池会随着峰值并发量膨胀一次就再也不缩小。三种策略按场景选：

| 策略 | 行为 | 适用 |
|---|---|---|
| 固定容量 | 容量 = 视口行数 + 缓冲行数，满了就复用最老的 | 虚拟列表，节点数可控 |
| 预热带保底 | 启动时 `prewarm(n)` 先建好，运行期不再新建 | 首屏不能有卡顿的列表 |
| 上限淘汰 | `release` 时超过上限直接丢弃节点 | 并发峰值不可预测的通用池 |

`DrugListItemPool` 用的是第一种：容量由视口算出来，天然固定，这是它比通用对象池简单的地方。

---

## 五、核心实现（下）：从零手写一个虚拟列表

前面几节讲的都是「池」的零件。这一节把它们装成一台完整的机器：一个不依赖任何库、约六十行的虚拟列表。手写一遍的价值不在于重复造轮子，而在于——**面试让你手写时你能写出来，线上出问题时你知道该看哪一行**。

先看对外接口。它只有四个参数，每一个都直接对应第三节的角色表：

```typescript
interface VirtualListOptions {
  itemHeight: number                        // 每行固定高度（虚拟列表的前提：高度可预测）
  overscan: number                          // 视口外上下各多渲染几行，防止快速滚动露白
  getItemCount: () => number                // 数据总量，用函数而非数字，便于动态更新
  render: (index: number, el: HTMLElement) => void  // 外部状态注入点
}

function createVirtualList(container: HTMLElement, opts: VirtualListOptions) {
  const { itemHeight, overscan, getItemCount, render } = opts
  container.style.overflowY = 'auto'
  container.style.position = 'relative'
```

接着搭骨架。注意这里有两个层：外层 `container` 是滚动容器，高度固定；内层 `viewport` 是一个空的高度占位层，它的高度等于「数据总量 × 行高」，唯一的职责是把滚动条撑到正确长度。所有列表项都绝对定位在 `viewport` 里，**节点数量与数据总量完全无关**：

```typescript
  const viewport = document.createElement('div')   // 只负责撑出滚动条，不含内容
  viewport.style.position = 'relative'
  container.appendChild(viewport)

  const rowsInView = () => Math.ceil(container.clientHeight / itemHeight)
  const poolSize = () => rowsInView() + overscan * 2   // 节点总数：常量，与数据量无关

  const nodes: HTMLElement[] = []

  function createRow() {   // 节点的内部状态：结构 + 样式，建一次就够了
    const el = document.createElement('div')
    el.className = 'vl-item'
    el.style.cssText = 'position:absolute;left:0;right:0'
    el.style.height = `${itemHeight}px`
    viewport.appendChild(el)
    nodes.push(el)
    return el
  }

  function ensurePoolSize() {   // 容器变高就补齐；变矮时多余节点留着，下次还能用
    while (nodes.length < poolSize()) createRow()
  }
  ensurePoolSize()
```

核心只有 `paint` 一个函数。它把「滚到哪一行」换算成「哪些数据该显示」，然后把数据灌进已有的节点——**没有一次 `createElement`，也没有一次 `removeChild`**：

```typescript
  let paintedStart = -1

  function paint() {
    const firstVisible = Math.floor(container.scrollTop / itemHeight)
    const start = Math.max(0, firstVisible - overscan)
    if (start === paintedStart) return          // 没跨行就什么都不做，省掉整帧开销
    paintedStart = start

    const count = getItemCount()
    for (let i = 0; i < nodes.length; i++) {
      const index = start + i
      const el = nodes[i]
      if (index >= count) { el.style.display = 'none'; continue }  // 末页不足一屏
      el.style.display = ''
      el.style.transform = `translateY(${index * itemHeight}px)`   // 位置=外部状态
      render(index, el)                                          // 内容=外部状态
    }
  }
```

最后把事件挂上。滚动用 `requestAnimationFrame` 节流——`scroll` 事件在某些高频鼠标滚轮下会一帧触发多次，逐次执行 `paint` 是白做功；`ResizeObserver` 负责在容器高度变化时更新占位层高度，否则拖大窗口后滚动条长度会不对：

```typescript
  let ticking = false
  container.addEventListener('scroll', () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => { paint(); ticking = false })
  })

  const sync = () => {
    viewport.style.height = `${getItemCount() * itemHeight}px`
    ensurePoolSize()           // 容器高度变化时补节点
    paintedStart = -1          // 重画一次：数据或可见行数可能都变了
    paint()
  }
  new ResizeObserver(sync).observe(container)
  sync()

  return { sync }   // 数据变了，调一次 sync 即可
```

用起来是这样，注意 `render` 只拿数据、不持有节点：

```typescript
const drugs: Drug[] = await fetchDrugs()   // 十万条

const list = createVirtualList(document.querySelector('#list')!, {
  itemHeight: 48,
  overscan: 4,
  getItemCount: () => drugs.length,
  render: (index, el) => {
    const drug = drugs[index]
    el.dataset.id = drug.id           // 只留索引标识，不挂对象引用
    el.textContent = `${drug.name} 库存 ${drug.stock}`
  },
})

// 数据变了（比如搜索换了关键词），重新 sync 一次即可，节点不用重建
drugs.splice(0, drugs.length, ...moreDrugs)
list.sync()
```

现在把这段代码对回第三节的角色表，会发现它比前面所有示例都贴得更紧：

| 角色 | 在这段代码里 |
|---|---|
| ConcreteFlyweight | `createRow()` 建出来的那二三十个节点，结构样式只写一次 |
| FlyweightFactory | `nodes` 数组与 `ensurePoolSize()`，管数量、管补齐 |
| 内部状态 | `el.className` 和 `el.style` 里那套固定结构，从来没被改过 |
| 外部状态 | 每次 `paint` 传入的 `index`，以及 `render` 从 `drugs` 里取出的那一条 |

**唯一需要你自己判断的地方是：这份「共享」到底值不值。** 前面说过，享元的门槛是「内部状态占比要高、对象数量要大」。十万条数据、每行结构完全相同，内部状态占比极高——这是它最该用的场合；反过来，一个只有三十条数据、每行布局还不一样的列表，套虚拟列表只是给自己加复杂度。

### 四个「为什么」，每一个都是面试追问点

**为什么用 `transform: translateY` 而不是 `top`？** 改 `top` 会进入布局（layout）阶段，几十个节点同帧改 `top` 会触发重排；`transform` 只影响合成（composite），可以交给 GPU 单独处理，滚动时不会打断主线程。这也是 react-window 内部给每个 item 的 `style` 里写 `transform` 的原因。

**为什么不能把剩下九万多条节点 `display:none` 藏起来？** 因为「藏起来」不等于「不存在」。节点仍然在 DOM 树里，样式计算、内存、事件绑定全都照付，CSS 选择器匹配也仍然要遍历它们。虚拟列表的收益从来不是「视觉上省」，而是「树上根本没有」。

**为什么要 `overscan`？** 滚动事件是按帧采样的，一次大幅滚动（比如拖动滚动条、`scrollTop` 被程序直接赋值）会跨过好几行，如果只渲染可见行，那一瞬间新进入视口的行还没有内容——用户看到白条。缓冲行数是工程折中品，react-window 里它叫 `overscanCount`，默认值 1，快速滚动密集的场景通常调到 3~5。

**为什么节点上不能存 `drug` 对象？** 这是享元的底线。节点一旦持有某个业务对象的引用，它就成了「这一条数据专属的节点」，既不能安全地交给下一条数据复用，也会让被引用的数据无法回收。所以上面 `render` 里只写 `dataset.id`，业务对象始终留在外面的 `drugs` 数组里——**节点是载体，数据是外部状态，这个分工不能破**。

### 边界情况自查

手写完别急着交，下面五种情况是面试官最常用的追问，也是线上真实的坑：

| 情况 | 表现 | 处理 |
|---|---|---|
| 数据 0 条 | `viewport` 高度为 0，`paint` 里 `index >= count` 全部隐藏 | 上面 `index >= count` 分支已覆盖 |
| 数据 1 条 | 池子有二十几个节点，只有第一个可见 | 同上，多余节点 `display:none` |
| 末页不足一屏 | 最后几行之后是空白，滚动条不能拉到超长 | 占位层高度按总数据算，不用补齐空行 |
| 快速拖到底 | 出现一刹那白屏 | 加大 `overscan`；或在 `paint` 里只算一次布局 |
| 容器高度变化 | 滚动条比例错、可见行数算错 | `ResizeObserver` 里 `ensurePoolSize()` 补齐节点后重画 |

最后一行值得多说一句：节点数是按「创建时的视口高度」算的，如果窗口从 600px 拉到 1200px，可见行数翻倍而节点不够用，底部就会空出来。所以 `sync` 里先补节点再重画——补出来的节点依然是复用的，只是池子变大了；反过来窗口变矮时不能删节点，留着下次还能用，删了等于白建。这也是为什么真正的虚拟列表库代码会比上面多得多，但**骨架就是这些**。

---

## 六、证明复用：三个可以复跑的实验

「我用的是虚拟列表」是自我陈述，「节点数没变」才是证据。这一节给三个实验，在自己的项目里点几下就能复现，也是面试时能把「只渲染可见区域」说到有分量的话术来源。

| 实验 | 操作 | 期望结果 |
|---|---|---|
| 节点总数恒定 | 滚动前后各在控制台执行 `document.querySelectorAll('.vl-item').length` | 两次结果完全相同；作为对照，全量渲染的列表滚动后数量线性增长 |
| 无 GC 抖动 | DevTools Performance 录制 3 秒快速滚动 | 复用版几乎没有 GC 尖峰、Layout 时间接近 0；销毁重建版有大量 `Recalculate Style` 与 GC |
| 无游离节点 | Memory 面板前后两次堆快照，筛 `Detached DOM tree` | 复用版接近 0；有泄漏的实现会看到数量随滚动增长 |

三个实验分别证明了三件事：**节点数量守恒**（对应享元的「对象数量减少」）、**无销毁重建**（对应「复用实例」）、**无内存残留**（对应「外部状态没有偷偷挂在节点上」）。第三个实验尤其值得做——它能把第四节那个事件监听器的坑当场抓出来。

如果实现里带了 `DrugListItemPool.size` 这样的计数器，还有更简单的一招：十万条数据滚动到底，`size` 停在三十几不再增长。这个数字本身就是结论，比任何描述都有说服力。

> 💬 **面试官**：你怎么证明你的长列表真的做了节点复用，而不是性能恰好够用？
> ✅ **标准答案**：看节点数量是否守恒。滚动到任意位置，列表容器的子节点数都应该等于「可见行数 + 2 × 缓冲行数」，与数据总量无关。
> 🎁 **加分答案**：能再补两个维度——用 Performance 面板确认没有持续的 `Recalculate Style` 与 GC 尖峰，说明没有销毁重建；用堆快照确认 `Detached DOM tree` 接近 0，说明节点上没有残留旧的业务数据引用。能说出「用数据证明」，比说「我用了 react-window」有分量得多。

---

## 七、易混淆辨析：六组最容易答错的概念

这一节是全篇密度最高的地方。下面六组概念，每一组都能在面试里单独出一道辨析题；每组都给一条判据，记住判据比记住区别更有用。

### 共享方法 ≠ 享元

笔记里用 `Person` 构造函数演示了原型链上的共享。类图与代码如下：

![Person 原型链类图](https://cdn.nlark.com/yuque/0/2021/png/738210/1639545228396-0f985c7e-c890-44c4-880c-40cb045e603e.png)

图注：这张类图展示了 p1、p2、p3 三个实例共享同一个 `Person.prototype`，方法只有一份，而每个实例仍各自持有 `name` 与 `age`。

```javascript
function Person(name, age) {
  this.name = name;
  this.age = age;
}
Person.prototype.getName = function() {
  return this.name;
}
Person.prototype.getAge = function() {
  return this.age;
}

const p1 = new Person('p1', 18);
const p2 = new Person('p2', 28);
const p3 = new Person('p3', 38);
console.log(p1.getName());
console.log(p1.getAge());

console.log(p2.getName());
console.log(p2.getAge());

console.log(p3.getName());
console.log(p3.getAge());
```

这段代码共享的是**方法（行为）**：`getName` 和 `getAge` 只有一份，挂在 `Person.prototype` 上。但 p1、p2、p3 的 `name` 和 `age` 仍然各自独立，状态没有被共享。享元的收益是「状态只有一份」，而 `prototype` 的收益是「方法只有一份」，两者省的是不同层的内存。

还要纠正一个常见的误解：这里的原型链是 JavaScript 的**继承机制**，并不等于设计模式里的原型模式（Prototype，通过复制已有对象创建新对象）。它也不是享元。

### 享元 vs 缓存代理

两者都能减少重复工作，但减少的东西不同：**享元减少对象的数量，缓存代理减少调用的次数**。判断方法是问自己：被复用的是「对象」，还是「结果」？

- 享元：`getPointStyle` 返回同一个样式对象，被复用的是对象。
- 缓存代理：同一药品详情被多次查询时，直接返回上一次的结果，被复用的是结果。

代理模式的详细讲解见本系列第 08 篇。

### 享元 vs 对象池

对象池是**实现手段**，享元是**设计目标**。对象池的核心是复用实例、避免频繁创建与销毁；享元的核心是共享内部状态、压缩内存。两者可以同时出现，但不必同时出现：

- 对象池可以只包含可变状态。比如数据库连接池，连接归还时会被重置，但没有任何内部状态被多个使用者共享，所以它不叫享元。
- 享元也不一定需要池。`getPointStyle` 只负责按 key 返回共享对象，没有归还动作，依然是享元。

判断时可以问一句：有没有「内部状态被多个使用者共享」？有，才是享元。

### 享元 vs 单例 / 原型

- **单例**：全局只有一个对象。**享元**：多个逻辑对象共享少数物理对象，工厂可以按 key 管理多个共享对象。
- **原型**：通过复制已有对象创建新对象，每个副本彼此独立。**享元**：不复制，直接共用同一个内部状态对象。

### 享元 vs memoize（记忆化）

这一组常常因为「都叫缓存」被混为一谈，但两者省的完全是两种资源。

**memoize 缓存的是「函数输入到输出」的映射结果**，目的是**省计算**。它只服务于调用这个函数的地方，缓存出来的值是替调用方复用的，不是被别的对象「共同拥有」的。而**享元共享的是对象内部的只读状态**，目的是**省内存**，任何地方都可以拿去用，而且共享出去之后通常没人关心它是谁先创建的。

一句话判断：**被复用的是「一次运算的结果」，还是「一份被多个对象共同持有的状态」？** 前者是 memoize，后者是享元。

顺带说清楚一个连带问题：`React.memo` 和 `useMemo` 都不是享元。`React.memo` 跳过了重渲染的**计算**，`useMemo` 缓存了**计算结果**，两者都不减少对象数量，也都不涉及「内部状态被多方共享」的结构。

### 享元 vs 结构共享（Immer / 不可变更新）

这是眼下最容易混的一组，因为 React 生态里「不可变更新」无处不在，很多人一听「共享」就往 Immer 上联想。

**结构共享复用的是「没有被修改的那部分子结构」**，目的是让每次更新都能廉价地造出一个**新版本**——旧版本仍然完整存在，只是和新版本共用一部分节点。**享元复用的是「大量实例中相同的内部状态」**，目的是**压缩对象数量**，它根本不产生新版本，就是同一份被人人引用。

判据也很干脆：**产生了新的版本对象、旧版本依然可用**，是结构共享；**从头到尾就那一份，谁需要谁引用**，是享元。Immer 让每个状态版本都完整存活，享元恰恰是让「相同的部分」不必存活那么多份。

> 💬 **面试官**：享元、对象池、缓存代理有什么区别？
> ✅ **标准答案**：享元共享内部状态，减少对象数量；对象池复用实例，减少创建销毁；缓存代理缓存调用结果，减少调用次数。
> 🎁 **加分答案**：三者的判据不同。享元看「内部状态是否被共享」，对象池看「实例是否被归还再用」，缓存代理看「被复用的是对象还是结果」。对象池可以不是享元，享元也可以不需要池。能再补一句更好——memoize 和 Immer 的结构共享同样会被误认成享元，但它们一个省计算、一个造新版本，和「压缩相同状态的数量」都不是一回事。

---

## 八、前端工程落地：从手写池到框架里的复用

### react-window：按位置复用，不是显式对象池

虚拟列表只渲染可见区域的项。滚动时，它根据偏移量计算当前应该显示的起止索引，然后复用已有的列表项组件，通过更新 props 显示新的数据。React 在协调时按组件类型和位置比较，同类型的组件实例会被保留，只更新其 props。

先对齐一下 API。第五节手写的每个参数，在 react-window 里都有对应物：

```typescript
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}        // 对应第五节：container.clientHeight，视口高度
  itemSize={48}       // 对应第五节：itemHeight，每行固定高度
  itemCount={drugs.length}  // 对应第五节：getItemCount()，数据总量
  overscanCount={4}   // 对应第五节：overscan，视口外缓冲行数
  width="100%"
>
  {({ index, style }) => (        // style 里就有 translateY，定位由库算好
    <div style={style}>药品 {drugs[index].name}</div>
  )}
</FixedSizeList>
```

对照着看会发现：「只渲染可见区域」这句被无数人当成答案的话，其实只是结论。真正的机制是 `itemCount` 撑出滚动长度、`overscanCount` 决定缓冲、`style` 里的 `transform` 负责把复用出来的那一行挪到正确位置——三件事缺一不可。

现在回到判别。这个过程中没有 acquire / release，也没有按 key 共享的内部状态，所以严格说它是**位置复用**，不是 GoF 享元。把「虚拟列表 = 享元」直接划等号并不严谨。

但要补一句公允的话：**面试语境里说「虚拟列表用了享元思想」不算错**，因为它确实满足享元最核心的那条前提——少量物理对象承载大量逻辑对象。真正会被扣分的是把定义说死：「虚拟列表就是享元模式」和「虚拟列表的节点复用体现了享元思想，但它没有严格意义的享元工厂」这两句话，面试官听到的分量完全不同。

### React Fiber 双缓冲：运行时复用，不是享元

React 内部用 `current` 与 `workInProgress` 两棵 Fiber 树交替工作。更新时在 `workInProgress` 上修改，提交后切换指针，旧树随之变成下一次更新的草稿。这种机制让更新可以被中断、恢复，并复用已有的 Fiber 对象。

它是运行时的内部机制，没有工厂，也没有按 key 共享的内部状态，所以不是 GoF 享元。把它叫作「Fiber 节点池」容易误导，更准确的说法是**双缓冲复用**。

### key 的作用：身份可判定，才能复用

`key` 决定协调时「这一项是不是同一个逻辑节点」。`key` 稳定时，对应的 Fiber 与 DOM 可以被保留并复用；如果用数组下标作为 `key`，列表重排后节点会被错误复用，状态就会串位。

享元与 `key` 共享同一个前提：**身份可以判定，复用才是安全的**。但 `key` 本身不是享元实现，它只是让复用变得正确。

### V8 字符串驻留：相同内容只存一份

V8 会对字符串字面量等场景做 internalization（驻留），相同内容的字符串在很多情况下会指向同一份内部表示，比较和存储都更高效。这是引擎层的优化，开发者不应依赖它的具体实现细节，更不应据此设计业务逻辑。它体现的是「相同数据共享」的思想，但不是我们自己实现的享元。

### 回到笔记：getLi 是享元思想的最小示例

笔记里的 `getLi` 展示了享元的骨架：节点是共享的载体，数据每次由外部注入。但严格说，它更接近**对象池**，因为同一时刻一个节点只承载一条数据，内部状态并没有被多个使用者共享。这一点与第四节的判断保持一致。

🔧 **真实场景**：药品目录的分页列表、搜索结果的节点回收、长列表的滚动容器，都会遇到「节点数量要受控、数据要外部注入」的问题。

> 💬 **面试官**：React 的虚拟列表复用了什么？是享元吗？
> ✅ **标准答案**：复用的是按位置分配的列表项组件实例，通过更新 props 显示不同数据。它没有显式的享元工厂，严格说不是 GoF 享元。
> 🎁 **加分答案**：可以补充 `key` 的作用，说明复用的前提是身份可判定；也可以提到 Fiber 双缓冲是运行时的复用机制，但同样不是享元。

---

## 💡 一张图总结（面试速记表）

| 要点 | 一句话内核 | 考察频率 |
|---|---|---|
| 内部 / 外部状态划分 | 不变且可共享的留在对象里，随场景变化的外置 | 高 |
| 享元 vs 对象池 | 对象池是复用手段，享元是共享内部状态的目标 | 高 |
| 享元 vs 缓存代理 | 享元减少对象数量，缓存代理减少调用次数 | 高 |
| 共享方法 vs 享元 | prototype 共享的是行为，享元共享的是状态 | 中 |
| 虚拟列表算不算享元 | 按位置复用，严格说不是 GoF 享元，但符合享元思想 | 中 |
| key 与复用 | key 决定身份判定，身份可判定才能安全复用 | 高 |
| 节点复用的隐形坑 | 监听器与业务引用不能挂在复用的节点上 | 高 |
| 池容量策略 | 固定容量 / 预热带保底 / 上限淘汰，按并发可预测性选 | 高 |
| 怎么证明真的复用了 | 节点数守恒 + 无 GC 尖峰 + 无 Detached DOM | 中 |
| 享元 vs memoize / 结构共享 | 一个省内存，一个省计算，一个造新版本 | 中 |

> 💡 记住这条主线：**享元不是一个「代码模板」，而是一次状态分裂**——先把对象的状态切成「不变的」和「会变的」，再把不变的收敛成一份、把会变的交给调用方每次传入。判断一句话：**改了这份状态，会不会波及别人？** 不会，它就能被共享。

---

## 📝 留个问题

打开你的项目，找一找「大量相似对象」藏在哪里：列表项配置、图表样式、埋点字段映射、表格的单元格格式。对每一处，问自己三个问题：换个场景还一样吗？多个对象能共用吗？改了它会不会影响别人？能回答「是、是、是」的部分，就是可以抽出来共享的内部状态。

---

## 参考资料

- https://refactoring.guru/design-patterns/flyweight
- https://refactoring.guru/images/patterns/diagrams/flyweight/structure.png
- https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Map
- https://legacy.reactjs.org/docs/reconciliation.html
- https://github.com/bvaughn/react-window

搜索关键词：GoF flyweight pattern、intrinsic extrinsic state、V8 string internalization、React Fiber double buffering

> 🔖 这是「前端设计模式」系列第 10 篇。上一篇：《组合与桥接模式：树形结构统一接口 vs 双维度解耦》；下一篇预告：《观察者与发布订阅模式：有没有中介，是解耦的分水岭》
