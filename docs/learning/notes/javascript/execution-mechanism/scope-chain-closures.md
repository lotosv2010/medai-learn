# 作用域链 & 闭包（Scope Chain & Closures）

> 记录时间：2026-05-27
> 关联模块：apps/web（组件状态闭包）、apps/ai-engine（流式处理器工厂函数）、packages/shared（高阶工具函数）
> 重要程度：⭐⭐⭐（面试高频）

---

## 核心概念

### 作用域链（Scope Chain）

作用域链是 JS 引擎查找变量的**有序链表**，每个执行上下文都关联一条。

```
当前 EC 的词法环境 → 外层 EC 的词法环境 → ... → 全局词法环境 → null
```

**查找规则**：从当前作用域开始，沿链逐级向外查找，找到即停，全部找不到 → ReferenceError。

```javascript
const a = 'global'

function outer() {
  const b = 'outer'

  function middle() {
    const c = 'middle'

    function inner() {
      console.log(a)   // 沿链找到 global
      console.log(b)   // 沿链找到 outer
      console.log(c)   // 沿链找到 middle
      console.log(d)   // ReferenceError: d is not defined
    }

    inner()
  }

  middle()
}

outer()
```

inner 的作用域链：`inner-LE → middle-LE → outer-LE → G-LE → null`

### 作用域链是静态的（词法作用域）

```javascript
function foo() {
  const x = 10
  bar()
}

function bar() {
  console.log(x)  // ReferenceError!
}

foo()
```

bar 的作用域链是 `bar-LE → G-LE`，**不包含 foo**，即使 foo 调用了 bar。因为作用域链由**代码书写位置**决定，不是调用位置。

### 闭包（Closure）

闭包 = 函数 + 它能访问的外部词法环境。

当一个函数引用了外层作用域的变量，即使外层函数已执行完毕，那些变量仍然存活——这就是闭包。

```javascript
function createCounter() {
  let count = 0   // 外层变量

  return function increment() {
    count++        // 引用外层变量
    return count
  }
}

const counter = createCounter()
console.log(counter())  // 1
console.log(counter())  // 2
console.log(counter())  // 3
// createCounter 已执行完毕，但 count 仍然存活
```

### 闭包的本质

闭包不是"复制"变量，而是**引用**外层执行上下文的词法环境。

```
createCounter 执行完毕后：
  - createCounter 的 EC 从调用栈弹出
  - 但其词法环境被 increment 的 [[Environment]] 引用
  - GC 发现词法环境仍被引用 → 不回收 → count 存活
```

---

## 闭包的常见模式

### 1. 工厂函数

```javascript
function createMultiplier(factor) {
  return function(number) {
    return number * factor   // factor 来自外层
  }
}

const double = createMultiplier(2)
const triple = createMultiplier(3)

console.log(double(5))   // 10
console.log(triple(5))   // 15
// 每次调用 createMultiplier 创建独立的词法环境，factor 互不干扰
```

### 2. 私有变量（模块模式）

```javascript
function createBankAccount(initialBalance) {
  let balance = initialBalance   // 私有变量，外部无法直接访问

  return {
    deposit(amount) {
      balance += amount
      return balance
    },
    withdraw(amount) {
      if (amount > balance) throw new Error('Insufficient funds')
      balance -= amount
      return balance
    },
    getBalance() {
      return balance
    }
  }
}

const account = createBankAccount(100)
account.deposit(50)       // 150
account.getBalance()      // 150
// account.balance → undefined（无法直接访问）
```

### 3. 缓存 / 记忆化

```javascript
function memoize(fn) {
  const cache = {}   // 闭包变量，持久存在

  return function(arg) {
    if (arg in cache) {
      return cache[arg]
    }
    const result = fn(arg)
    cache[arg] = result
    return result
  }
}

const expensiveSquare = memoize(x => {
  console.log('computing...')
  return x * x
})

expensiveSquare(4)  // computing... → 16
expensiveSquare(4)  // 16（缓存命中，不再 computing）
```

### 4. 防抖 & 节流

```javascript
function debounce(fn, delay) {
  let timer = null   // 闭包变量

  return function(...args) {
    clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

const debouncedSearch = debounce(fetchResults, 300)
// timer 变量通过闭包在每次调用间共享
```

---

## 经典闭包陷阱

### 陷阱 1：循环中的闭包

```javascript
// ❌ 错误：所有回调共享同一个 i
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)
}
// 输出：3, 3, 3

// ✅ 方案 A：用 let（块级作用域）
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)
}
// 输出：0, 1, 2
// 每轮循环创建新的词法环境，i 互不干扰

// ✅ 方案 B：IIFE 创建独立作用域
for (var i = 0; i < 3; i++) {
  (function(j) {
    setTimeout(() => console.log(j), 100)
  })(i)
}
// 输出：0, 1, 2
```

**本质**：`var` 声明的 i 在函数作用域，所有回调引用同一个 i。`let` 声明的 i 在块级作用域，每轮循环创建新的词法环境。

### 陷阱 2：闭包中的 this

```javascript
const obj = {
  name: 'test',
  greet() {
    setTimeout(function() {
      console.log(this.name)   // undefined（this = window）
    }, 100)
  }
}

// ✅ 方案 A：箭头函数（继承外层 this）
const obj2 = {
  name: 'test',
  greet() {
    setTimeout(() => {
      console.log(this.name)   // 'test'
    }, 100)
  }
}

// ✅ 方案 B：闭包保存 this
const obj3 = {
  name: 'test',
  greet() {
    const self = this
    setTimeout(function() {
      console.log(self.name)   // 'test'
    }, 100)
  }
}
```

### 陷阱 3：闭包内存泄漏

```javascript
function setup() {
  const hugeData = new Array(1000000).fill('x')

  return function process() {
    // 即使 process 不引用 hugeData
    // 某些引擎仍可能保留整个词法环境
    console.log('processing')
  }
}

const process = setup()
// hugeData 可能仍然占用内存

// ✅ 解决：不再需要时置空引用
function setup() {
  let hugeData = new Array(1000000).fill('x')

  return function process() {
    console.log('processing')
    hugeData = null   // 主动释放
  }
}
```

现代 V8 引擎会做**词法环境裁剪**（Lexical Environment Pruning）：如果闭包函数没有引用某个变量，引擎会自动排除它。但显式释放更安全。

---

## 在本项目中的应用

### 1. React Hooks 的闭包本质

```typescript
// apps/web 中的组件
function DrugSearch() {
  const [query, setQuery] = useState('')

  // handleSearch 是闭包，引用了 query
  const handleSearch = useCallback(() => {
    fetchDrugs(query)   // query 来自闭包
  }, [query])           // query 变化时重新创建闭包

  // ❌ 常见 bug：闭包捕获了旧值
  const handleClick = () => {
    setTimeout(() => {
      console.log(query)   // 可能是旧值！
    }, 3000)
  }
}
```

**useCallback/useMemo 的本质**：控制闭包的创建时机，避免不必要的闭包重建。

### 2. AI 流式处理器工厂

```typescript
// apps/ai-engine 中的流式处理
function createStreamAccumulator() {
  const chunks: string[] = []      // 闭包变量
  let totalLength = 0               // 闭包变量

  return {
    append(chunk: string) {
      chunks.push(chunk)
      totalLength += chunk.length
    },
    getFullText() {
      return chunks.join('')
    },
    getStats() {
      return { chunkCount: chunks.length, totalLength }
    }
  }
}

const accumulator = createStreamAccumulator()
accumulator.append('Hello')
accumulator.append(' World')
accumulator.getFullText()   // 'Hello World'
accumulator.getStats()      // { chunkCount: 2, totalLength: 11 }
```

### 3. 高阶函数与柯里化

```typescript
// packages/shared 中的工具函数
function createValidator(rules: ValidationRule[]) {
  // rules 通过闭包保留
  return function validate(data: Record<string, unknown>) {
    const errors: string[] = []

    for (const rule of rules) {
      if (!rule.check(data[rule.field])) {
        errors.push(rule.message)
      }
    }

    return errors
  }
}

const validateDrug = createValidator([
  { field: 'name', check: v => !!v, message: '药品名必填' },
  { field: 'dosage', check: v => v > 0, message: '剂量必须大于 0' },
])

validateDrug({ name: '阿莫西林', dosage: 0 })
// ['剂量必须大于 0']
```

### 4. 事件处理与状态快照

```typescript
// apps/web 中的列表组件
function DrugList({ drugs }: { drugs: Drug[] }) {
  // ❌ 闭包陷阱：点击时 drug 可能已变化
  // drugs.map(drug => (
  //   <button onClick={() => console.log(drug.name)}>
  //     {drug.name}
  //   </button>
  // ))

  // ✅ 正确：每个回调捕获独立的 drug
  return drugs.map(drug => (
    <DrugCard
      key={drug.id}
      drug={drug}
      onSelect={() => viewDrugDetail(drug.id)}  // 闭包捕获当前 drug
    />
  ))
}
```

---

## 易混淆点

### 1. 闭包 ≠ 函数

```
闭包 = 函数 + 外部词法环境的引用
函数只是闭包的一部分

function foo() {}   // 这是函数
// 如果 foo 引用了外部变量，foo 才是闭包
```

### 2. 作用域链 ≠ 原型链

```
作用域链：变量查找，沿词法环境链
原型链：属性查找，沿 __proto__ 链

const arr = [1, 2, 3]
arr.toString()   // 先找 arr 自身 → 沿原型链找到 Array.prototype.toString
arr.x            // 先找作用域链 → 找不到 → ReferenceError（不走原型链）
```

### 3. 闭包不是"快照"

```javascript
function create() {
  let x = 1
  return {
    getX() { return x },
    setX(val) { x = val }
  }
}

const obj = create()
console.log(obj.getX())   // 1
obj.setX(5)
console.log(obj.getX())   // 5（引用，不是快照）
```

闭包引用的是变量本身（引用），不是创建时的值（快照）。

### 4. 块级作用域 vs 函数作用域

```javascript
// var → 函数作用域
function foo() {
  if (true) {
    var x = 1   // 属于 foo 的作用域
  }
  console.log(x)   // 1（穿透块级）
}

// let/const → 块级作用域
function bar() {
  if (true) {
    let y = 2   // 属于 if 块
  }
  console.log(y)   // ReferenceError
}
```

---

## 面试角度

### 高频问题

1. **"什么是闭包？"**
   - 函数 + 外部词法环境的引用
   - 外层函数执行完毕后，内部函数仍能访问外层变量
   - 本质：GC 不回收仍被引用的词法环境

2. **"闭包有什么应用场景？"**
   - 数据私有化（模块模式）
   - 函数工厂（柯里化、偏函数）
   - 缓存 / 记忆化
   - 防抖 / 节流
   - React Hooks 底层

3. **"闭包的内存问题怎么解决？"**
   - 不再需要时手动置 null
   - V8 的词法环境裁剪机制
   - 避免在循环中创建不必要的闭包

4. **"以下代码输出什么？"**（循环闭包经典题）
   - var + setTimeout → 全部输出最终值
   - let + setTimeout → 正确输出各轮值
   - IIFE → var 也能正确输出

5. **"作用域链和原型链的区别？"**
   - 作用域链：变量查找，词法作用域，静态
   - 原型链：属性查找，继承机制，动态（可修改）

### 加分回答

- 提到 **V8 的 Hidden Class** 和 **Inline Cache** 如何优化闭包访问
- 提到 **词法环境裁剪（Lexical Environment Pruning）** 的 GC 优化
- 提到 **闭包是函数式编程的基础**：高阶函数、柯里化、组合都依赖闭包
- 提到 **React Hooks 的闭包陷阱**：useEffect 中引用旧状态的问题

---

## 扩展阅读

1. **ECMAScript 规范中的闭包定义**
   - https://tc39.es/ecma262/#sec-ecmascript-function-objects
   - 理解 `[[Environment]]` 内部槽如何绑定词法环境

2. **V8 引擎的闭包优化**
   - 词法环境裁剪（Escape Analysis）
   - 栈上分配（Stack Allocation）vs 堆上分配
   - 理解为什么现代引擎的闭包性能开销很小

---

## 自测问题

**Q：以下代码输出什么？为什么？**

```javascript
function createFunctions() {
  const functions = []

  for (var i = 0; i < 3; i++) {
    functions.push(function() {
      return i
    })
  }

  return functions
}

const [f1, f2, f3] = createFunctions()
console.log(f1())
console.log(f2())
console.log(f3())

// 对比：
function createFunctions2() {
  const functions = []

  for (let i = 0; i < 3; i++) {
    functions.push(function() {
      return i
    })
  }

  return functions
}

const [g1, g2, g3] = createFunctions2()
console.log(g1())
console.log(g2())
console.log(g3())
```

<details>
<summary>点击查看答案</summary>

输出：
```
3
3
3
0
1
2
```

**var 版本分析**：
- `var i` 声明在 `createFunctions` 的函数作用域（变量环境）
- 三个函数闭包引用的是**同一个 i**
- 循环结束后 i = 3
- f1()、f2()、f3() 都返回 3

**let 版本分析**：
- `let i` 声明在块级作用域（词法环境）
- 每轮循环创建**新的块级词法环境**，i 互不干扰
- g1 闭包引用第 0 轮的 i（= 0）
- g2 闭包引用第 1 轮的 i（= 1）
- g3 闭包引用第 2 轮的 i（= 2）

**本质区别**：
- `var` → 函数作用域 → 所有闭包共享同一个变量
- `let` → 块级作用域 → 每轮循环创建新变量，闭包各自独立
</details>
