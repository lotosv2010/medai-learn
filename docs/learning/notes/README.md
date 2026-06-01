# 学习笔记索引

> 按技术领域分目录组织，每个知识点一个文档。

---

## JavaScript 深度

### 执行机制
- [事件循环（Event Loop）](javascript/execution-mechanism/event-loop.md) — 调用栈 + 宏任务 + 微任务 + 浏览器/Node.js 差异
- [宏任务与微任务（Macrotask & Microtask）](javascript/execution-mechanism/macrotask-microtask.md) — 设计意图 + 面试高频题 + Node.js nextTick
- [执行上下文与调用栈（Execution Context & Call Stack）](javascript/execution-mechanism/execution-context-call-stack.md) — 变量提升 + this 绑定 + 作用域链
- [作用域链 & 闭包（Scope Chain & Closures）](javascript/execution-mechanism/scope-chain-closures.md) — 词法作用域 + 闭包模式 + 经典陷阱
- [词法环境（Lexical Environment）](javascript/execution-mechanism/lexical-environment.md) — Environment Record + 暂时性死区 + V8 优化
- [变量提升 & TDZ（Hoisting & Temporal Dead Zone）](javascript/execution-mechanism/hoisting-tdz.md) — var/let/const 提升差异 + TDZ 本质 + 面试高频

### 原型与面向对象

- [原型链机制（Prototype Chain）](javascript/prototype-oop/prototype-chain.md) — __proto__/prototype/constructor 关系 + 属性查找 + 继承实现
- [继承的 6 种方式](javascript/prototype-oop/inheritance-6-ways.md) — 原型链 → 构造 → 组合 → 寄生组合式演进 + ES6 class 底层
- [new 操作符原理](javascript/prototype-oop/new-operator.md) — 4 步执行流程 + 手写实现 + 返回值特殊行为 + ECMA 规范
- [Object.create 深度解析](javascript/prototype-oop/object-create.md) — 显式控制原型链 + 手写实现 + 寄生组合式继承核心 + Object.create(null) 用途
- [Class 语法糖深度解析](javascript/prototype-oop/class-syntax.md) — 本质是原型链语法糖 + extends/super 机制 + 与 ES5 构造函数对比 + 私有字段
- [instanceof 原理](javascript/prototype-oop/instanceof.md) — 原型链遍历查找 + 手写实现 + Symbol.hasInstance + 跨 iframe 问题

### 异步编程

- [Promise 原理与手写实现](javascript/async/promise-handwrite.md) — 状态机 + 微任务调度 + Resolution Procedure + 手写 Promise/A+ 核心
- [Promise 组合子：all / race / allSettled / any](javascript/async/promise-combinators.md) — 并发控制策略 + 手写实现 + 并发限制器
- [async/await 底层原理](javascript/async/async-await.md) — Generator + 自动执行器 + Babel 编译 + 错误处理模式
- [Generator & Iterator 协议](javascript/async/generator-iterator.md) — Iterator/Iterable 协议 + yield 双向传值 + yield* 委托 + 惰性求值
- [并发控制（Concurrency Control）](javascript/async/concurrency-control.md) — Semaphore + 令牌桶 + 断路器 + 指数退避 + p-limit 源码
- [AbortController 与异步取消](javascript/async/abort-controller.md) — 取消机制 + 竞态条件 + 超时控制 + React 中的应用
---

## TypeScript 深度

### 类型体操
- [条件类型 & 映射类型](typescript/type-gymnastics/conditional-mapped-types.md) — 分布式条件类型 + infer + 键重映射 + 手写工具类型

### 泛型体系
- [泛型约束（Generic Constraints）](typescript/generics/constraints.md) — extends 约束 + keyof 约束 + 递归约束 + 手写 Pick/Omit

---

## React 深度

（待开始）

---

## Next.js

（待开始）

---

## AI 开发

（待开始）

---

## Node.js

（待开始）

---

## 工程化

（待开始）

---

## 算法

（待开始）

---

## 目录命名规范

```
docs/learning/notes/{领域}/{子领域}/{知识点}.md

示例：
docs/learning/notes/javascript/execution-mechanism/event-loop.md
docs/learning/notes/react/fiber/fiber-reconciler.md
docs/learning/notes/typescript/generics/constraints.md
```
