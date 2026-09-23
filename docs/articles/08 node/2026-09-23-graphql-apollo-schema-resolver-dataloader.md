# GraphQL + Apollo：Schema 设计 / Resolver / DataLoader N+1 / Server 实战（生产收藏级）

> **副标题**：类型系统与 Schema First 设计、Resolver 执行机制、N+1 查询问题与 DataLoader 批处理、对比 RESTful

> 面试官问「RESTful 接口写得好好的，为什么要上 GraphQL？」——多数人只能答一句「按需查询」。能把「过度获取」和「获取不足」两个痛点对应到具体场景、把字段级 Resolver 为什么会放大成 N+1 讲透、再把 DataLoader 的批处理和去重两条机制说清楚，才说明你真的在生产里做过 GraphQL，而不是只会 `ApolloServer({ typeDefs, resolvers })`。

---

## 🎯 这篇文章解决什么问题

GraphQL 是 Node.js 全栈开发者面试里「拉开差距」的一道题。你写过 `query`、配过 `ApolloServer`、用过 `useQuery`，但被追问到底层——GraphQL 相比 RESTful 到底解决了什么？Schema 里那个 `!` 和 `[]` 分别意味着什么？为什么字段级 Resolver 天然会放大成 N+1？DataLoader 的批处理和去重分别是哪两段逻辑？——很多人就卡住了。

这篇文章是「Node.js 全栈深度拆解」系列的第 16 篇，也是数据库/API 范式板块的收官篇（MySQL → MongoDB → Redis → GraphQL）。它把 GraphQL 从「基本使用」到「生产最佳实践」完整串起来，三件事讲透：

- **基本使用**：GraphQL 是什么、类型系统怎么定义数据边界、Resolver 的字段级执行机制、Apollo Server 搭建、客户端按需查询与缓存
- **企业最佳实践**：GraphQL vs RESTful 的选型判断、Schema First 契约先行、N+1 问题与 DataLoader 的根治、Subscription 的取舍
- **注意事项**：深层嵌套放大 N+1、Schema 权限控制、缓存失效复杂化、Schema 演进与破坏性变更

**既讲怎么用，也讲面试怎么答。** 5-10 年 Node 开发者的简历上，GraphQL 这一栏从「会写 query」到「能讲清什么时候该上、什么时候不该上、N+1 怎么根治」，面试官的眼睛会不一样。

---

## 一、基本使用

### 1. GraphQL 是什么：一次请求，不多不少

GraphQL 这个名字，拆开看是 Graph（图）+ QL（Query Language，查询语言）。它**既是**一种用于 API 的查询语言，**也是**一个满足数据查询的运行时。

它和 RESTful 最核心的分野，可以用三句话概括：

- **请求所要的数据不多不少**——客户端要什么字段，服务端就返回什么字段，不掺杂任何冗余
- **只用一个请求获取多个资源**——把原本要多次请求才能拿全的关联数据，一次拿回来
- **对数据提供一套易于理解的完整描述**——Schema 把服务端「能提供什么」写成了强类型契约

先看它最基础的两个动作——**查询（Query）**和**变更（Mutation）**：

```graphql
# Query：查询患者信息（只取需要的字段）
query {
  getPatient(id: "P10086") {
    id
    name
    age
  }
}

# Mutation：新建处方（带参数，返回新建结果）
mutation {
  addPrescription(patientId: "P10086", drug: "阿莫西林", dose: "0.5g") {
    id
    drug
    dose
  }
}
```

除了查询和变更，GraphQL 还有第三种操作类型 **Subscription（订阅）**——它基于 WebSocket 做服务端推送，让客户端订阅某个事件的实时更新（比如「检验报告已出」）。这一点我们放到第二部分第 4 节展开，因为它涉及一个重要的工程取舍。

**三种操作类型的分工**，一句话记住：

| 操作类型 | 语义 | 医疗场景举例 |
|---------|------|-------------|
| Query | 只读查询，不改变服务端状态 | 查询患者信息、处方列表 |
| Mutation | 写操作，改变服务端状态 | 新建处方、更新检验状态 |
| Subscription | 服务端主动推送实时事件 | 订阅「检验报告实时更新」 |

这三类操作在 GraphQL 规范里统称**根类型**，是 Schema 的入口。

> 💬 **面试官**：GraphQL 相比 RESTful，核心解决了什么问题？
>
> ✅ 标准答案：解决 RESTful 的两大顽疾——**过度获取**（Over-fetching，服务端返回了客户端不需要的字段）和**获取不足**（Under-fetching，客户端要的数据分散在多个接口，需要多次请求再拼装）。GraphQL 通过「客户端自定义查询字段」，让一次请求恰好返回所需数据。
>
> 🎁 加分答案：能点出 GraphQL 的本质是「**服务端能力边界由 Schema 定义，客户端决定具体取什么**」——把「取哪些字段」的决定权从服务端交还给客户端。再补一句：这也是它和手写 BFF 的差异，BFF 是服务端为每个端写死一套裁剪逻辑，GraphQL 是声明式的，客户端自己声明。

### 2. 类型系统：Schema 定义数据的能力边界

GraphQL 的核心是一个**强类型系统**。服务端通过 Schema 声明「我能提供什么数据、每个字段是什么类型、哪些必填、哪些是列表」。这套类型定义，既是给客户端看的契约，也是运行时校验和「内省（introspection）」的依据。

**最基础的标量类型**有五种：

| 标量类型 | 含义 |
|---------|------|
| `ID` | 唯一标识符，序列化为字符串 |
| `String` | UTF-8 字符串 |
| `Int` | 32 位有符号整数 |
| `Float` | 双精度浮点数 |
| `Boolean` | 布尔值 |

在标量类型之上，有两个**类型修饰符**，用来表达「必填」和「列表」：

- `String!`：末尾的 `!` 表示**非空（Non-Null）**，这个字段一定不能返回 `null`
- `[Prescription!]!`：外层 `[]` 表示**列表**，内层 `Prescription!` 表示列表里每个元素都非空，最外层 `!` 表示列表本身非空

再看一个医疗场景的**对象类型**定义——把「患者」和「处方」两个实体关联起来：

```graphql
type Patient {
  id: ID!
  name: String!
  prescriptions: [Prescription!]!
}

type Prescription {
  id: ID!
  drug: String!
  dose: String!
}
```

这里 `Patient.prescriptions` 的类型是 `[Prescription!]!`，意思是「一位患者有零到多条处方，每条处方都是非空的 Prescription 对象」。

除了标量和对象类型，GraphQL 还支持三种进阶类型，让 Schema 的表达力更强（这是很多初级选手答不全的部分）：

- **枚举（enum）**：字段只能取一组预设值。比如药品的「处方类型」只能是「西药 / 中成药 / 中草药」：

```graphql
enum DrugCategory {
  WESTERN    # 西药
  PATENT     # 中成药
  HERBAL     # 中草药
}

type Drug {
  name: String!
  category: DrugCategory!  # 只能是上面三个值之一
}
```

- **接口（interface）**：定义一组共享字段，多个对象类型实现它，客户端可以用接口做「按需分派」。比如「检验项目」下细分成「血常规」「尿常规」：

```graphql
interface LabTest {
  id: ID!
  name: String!
  status: String!
}

type BloodTest implements LabTest {
  id: ID!
  name: String!
  status: String!
  wbcCount: Float   # 白细胞计数，血常规独有
}

type UrineTest implements LabTest {
  id: ID!
  name: String!
  status: String!
  protein: Boolean  # 尿蛋白，尿常规独有
}
```

- **联合（union）**：表示一个字段可以返回多种互斥类型之一（不要求共享字段），客户端用内联片段 `... on X` 区分。

理解这些类型后，重点来了：**Schema 有两种等价的定义写法**。

**写法一：SDL（Schema Definition Language）**——用字符串声明式地描述类型，这是 Apollo 生态（`@apollo/server`）推荐的主流方式：

```typescript
// 使用 Apollo Server 的步骤
//  1. 安装依赖 npm install @apollo/server graphql
//  2. 配置 TS 环境
//  3. 创建一个文件 index.ts
//  4. 定义 GraphQL 类型定义
//  5. 创建 mock 数据
//  6. 定义 GraphQL resolvers
//  7. 创建 Apollo Server 实例
//  8. 启动 Apollo Server
//  9. 访问 http://localhost:4000
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against your data.
const typeDefs = `#graphql
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  # This "Book" type defines the queryable fields for every book in our data source.
  type Book {
    title: String
    author: String
  }

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each.
  type Query {
    books: [Book]
  }
`;

const books = [
  { title: 'The Awakening', author: 'Kate Chopin' },
  { title: 'City of Glass', author: 'Paul Auster' },
];

// Resolvers define how to fetch the types defined in your schema.
const resolvers = {
  Query: {
    books: () => books,
  },
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`🚀  Server ready at: ${url}`);
```

**写法二：编程式（Programmatic）**——用 `GraphQLObjectType` 类一步步构建类型对象，这是 `express-graphql` 老项目的经典写法：

```javascript
const graphql = require('graphql');
const { StudentModel } = require('./model');

const { GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLNonNull, GraphQLSchema, GraphQLList } = graphql;

// ! 1.定义用户类型
const Student = new GraphQLObjectType({
  name: 'Student',
  fields: () => ({
    id: { type: GraphQLString },
    name: { type: GraphQLString },
    age: { type: GraphQLInt },
    hobbys: { type: new GraphQLList(GraphQLString) }
  })
})

// ! 2.定义根类型 query mutation
const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    student: {
      type: Student,
      args: {
        name: { type: GraphQLString }
      },
      async resolve(parentValue, args) {
        console.log('student', args);
        return await StudentModel.findOne({name: {$regex: args.name}});
      }
    },
    students: {
      type: new GraphQLList(Student),
      async resolve(parentValue, args) {
        console.log('students', args);
        return await StudentModel.find({});
      }
    }
  }
})

const RootMutation = new GraphQLObjectType({
  name: 'RootMutationType',
  fields: {
    student: {
      type: Student,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        age: { type: new GraphQLNonNull(GraphQLInt) },
      },
      async resolve(parentValue, args) {
        console.log('create', args, StudentModel.insertOne);
        return await StudentModel.create(args);
      }
    }
  }
})

// ! 3.定义 schema
module.exports = new GraphQLSchema({
  query: RootQuery,
  mutation: RootMutation
});
```

这段编程式 Schema 依赖两个配套文件才跑得起来：一个数据模型（`model.js`，schema.js 里 `require('./model')` 拿到 `StudentModel`），一个 HTTP 入口（`server.js`，把 Schema 挂成服务）。补上这两个，编程式写法就完整了。安装依赖：`pnpm add express cors mongoose graphql express-graphql`。

**model.js**——用 Mongoose 建数据模型：

```javascript
const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;  
const Schema = mongoose.Schema;

// 1. 创建连接
const conn = mongoose.createConnection('mongodb://localhost:27017/learn');
conn.on('open', () => console.log('mongodb connected'));
conn.on('error', (err) => console.log(err));

// 2. 创建集合
const StudentSchema = new Schema({
  name: String,
  age: Number,
  hobbys: [String]
});

// 3. 创建模型
const StudentModel = conn.model('Student', StudentSchema);

module.exports = {
  StudentModel
}
```

**server.js**——用 `express-graphql` 把 Schema 挂成 HTTP 服务（这是老项目的经典写法，`express-graphql` 现已弃用，第 4 节会讲现代替代方案）：

```javascript
const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const cors = require('cors');
const schema = require('./schema');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.use('/graphql', graphqlHTTP({
  schema,
  graphiql: true
}));

app.listen(3300, () => {
  console.log('Server is running on port 3300');
});
```

浏览器访问 http://localhost:3300/graphql 会打开 GraphiQL 调试工具，左侧写 query、右侧看结果、还能浏览 Schema 文档：

<!-- 这是一张图片，ocr 内容为：GRAPHIQL HISTORY MERGE COPY PRETTIFY DOCUMENTATION EXPLORER SEARCH SCHEMA QUERY QUERYSTUDENT 123456788 'DATA": STUDENTS A GRAPHQL SCHERMA PROVIDES A ROOT TYPE FOR EACH "STUDENTS": ID KIND OF OPERATION. AGE "ID": "67E3B4985B7529CB9CFC9C8E", NAME HOBBYS "AGE":28, ROOT TYPES 子 "NAME":"TEST-28". "HOBBYS":[ STUDENT(NAME:"TEST") QUERY:ROOTQUERYTYPE READING NAME 10 CODING AGE, MUTATION:ROOTMUTATIONTYPE 11 C HOBBYS 12 11 13 乃, 14 乃 15 MUTATION ACTIONSTUDENT  STUDENT(NAME: "TEST1", AGE: 19) { 16  17 "STUDENT": ID 18 "NAME": "TEST-28", NAME 19 "AGE":28, AGE 20 "HOBBYS": 江 READING CODING QUERY VARIABLES -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1743211947548-10cb113b-20fa-4ded-b5c2-968ca4283653.png)

两种写法**等价**，最终都编译成同一份「可执行 Schema」。区别在于：

- **SDL 更直观、可读性强**，尤其适合「先写 Schema 做契约、前后端并行开发」的 Schema First 协作模式（第二部分第 2 节展开）
- **编程式更「程序化」**，类型和 resolver 耦合在一起，适合用代码动态生成 Schema 的场景

现代项目（尤其配合 Apollo）**几乎都推荐 SDL**，这也是后面所有示例的主线写法。

> 💬 **面试官**：GraphQL 的类型系统里，`!` 和 `[]` 分别表达什么？`[Prescription!]!` 具体约束了哪些东西？
>
> ✅ 标准答案：`!` 是非空（Non-Null）修饰符，表示该字段不能返回 `null`；`[]` 是列表修饰符，表示该字段是一个数组。`[Prescription!]!` 三层含义：这是一个列表（`[]`），列表本身非空（最外层 `!`），列表里每个元素也非空（内层 `!`）。
>
> 🎁 加分答案：能点出「非空」是 GraphQL 校验系统的一部分——如果某个 resolver 意外返回了 `null` 给一个 `!` 字段，GraphQL 会把错误向上冒泡，而不是静默返回脏数据。再补一句进阶类型：枚举 `enum`、接口 `interface`、联合 `union` 各自解决什么场景（枚举限定值域、接口表达共享字段的多态、联合表达互斥类型）。

### 3. Resolver 执行机制：字段级的递归解析

理解了 Schema，接下来是 GraphQL 最核心的执行模型——**Resolver（解析器）**。

Resolver 是「如何取数据」的实现。GraphQL 里的**每个字段都可以有一个 resolver**，它的签名是四个参数：

```javascript
resolve(parent, args, context, info) {
  // parent: 父字段的返回值，用于向下传递关联数据
  // args:   客户端传入的参数
  // context:请求级共享上下文（如鉴权后的用户、DataLoader 实例）
  // info:   本次查询的 AST 信息（极少直接用）
}
```

关键是 `parent` 这个参数——它把**父字段的返回值**传给子字段，让嵌套的关联数据能一层层解析下去。看这个电商场景的字段级关联（`Category` 和 `Product` 两个类型互相引用）：

```javascript
const graphql = require('graphql');
const { 
	GraphQLObjectType,
	GraphQLString,
	GraphQLSchema,
	GraphQLList,
} = graphql;

const categories = [
	{ id: '1', name: '图书' },
	{ id: '2', name: '数码' },
	{ id: '3', name: '食品' }
]
const products = [
	{ id: '1', name: '红楼梦', category: '1' },
	{ id: '2', name: '西游记', category: '1' },
	{ id: '3', name: '水浒传', category: '1' },
	{ id: '4', name: '三国演义', category: '1' },
	{ id: '2', name: 'iPhone', category: '2' },
	{ id: '3', name: '', category: '3' }
]
// 定义用户自定义类型
// 类型的每个字段都必须是已定义的且最终都是 GraphQL 中定义的类型。
const Category = new GraphQLObjectType({
	name: 'Category',
	fields: () => (
		{
			id: { type: GraphQLString },
			name: { type: GraphQLString },
			products: {
				type: new GraphQLList(Product),
				resolve(parent) {
					return products.filter(item => item.category === parent.id);
				}
			}
		}
	)
});
const Product = new GraphQLObjectType({
	name: 'Product',
	fields: () => (
		{
			id: { type: GraphQLString },
			name: { type: GraphQLString },
			category: {
				type: Category,
				resolve(parent) {
					return categories.find(item => item.id === parent.category);
				}
			}
		}
	)
});

const RootQuery = new GraphQLObjectType({
	name: 'RootQuery',
	fields: {
		getCategory: {
			type: Category,
			args: {
				id: {
					type: GraphQLString
				}
			},
			resolve(parent, args) {
				return categories.find(item => item.id === args.id);
			}
		},
		getCategories: {
			type: new GraphQLList(Category),
			args: {
			},
			resolve(parent, args) {
				return categories;
			}
		},
		getProduct: {
			type: Product,
			args: {
				id: {
					type: GraphQLString
				}
			},
			resolve(parent, args) {
				return products.find(item => item.id === args.id);
			}
		},
		getProducts: {
			type: new GraphQLList(Product),
			args: {},
			resolve(parent, args) {
				return categories;
			}
		}
	}
});
// 定义 Schema，每一个 Schema 中允许出现三种根类型：query，mutation，subscription，其中至少要有 query
module.exports = new GraphQLSchema({
	query: RootQuery
})
```

看两个关键细节：

- `Category.products` 的 resolver 里，`parent` 就是**当前这条 Category**（比如 `{ id: '1', name: '图书' }`），所以能写 `products.filter(item => item.category === parent.id)` 拿到这个分类下的商品。
- `Product.category` 的 resolver 里，`parent` 是**当前这条 Product**，用 `parent.category`（存的是分类 id 字符串）去 `categories.find` 反查出分类对象——这就是注释里写的「字符串转成对象，1 => {name: '图书'}」。

**Resolver 的执行是「字段级、自顶向下、逐层递归」的**：先执行 Query 根字段的 resolver，拿到返回值后，再对返回值里的每个子字段递归执行它们各自的 resolver，直到所有字段都是标量（没有子字段）为止。

理解这个执行模型，是理解 N+1 问题的前提——因为**每个字段都可能独立触发一次数据访问**。这一点在第二部分第 3 节重点展开。

> 💬 **面试官**：GraphQL 的 Resolver 是怎么执行的？`parent` 参数是什么？
>
> ✅ 标准答案：GraphQL 执行是字段级递归的——先执行 Query 根字段的 resolver，返回值作为 `parent` 传给下一层字段的 resolver，逐层向下，直到所有字段都解析为标量。`parent` 就是父字段 resolver 的返回值，用来把关联数据一层层传下去。
>
> 🎁 加分答案：能点出「字段级递归」正是 N+1 的根源——因为每个字段独立执行，一个列表里的每个元素都会各自触发一次关联字段的 resolver，导致大量重复的单条查询（这正是第二部分第 3 节 DataLoader 要解决的）。再补一句：`context` 是请求级共享的，通常在这里挂鉴权用户和 DataLoader，因为它是同一次请求内所有 resolver 共用的。

### 4. Apollo Server 搭建：standalone 与 Express 集成

先厘清一个概念：**Apollo 是什么，和 GraphQL 什么关系**。

GraphQL 只是一个**规范/查询语言**，它规定了「怎么描述类型、怎么发查询、怎么解析」这套协议，但**不提供具体的服务端或客户端实现**。而 **Apollo GraphQL 是一整套构建、查询和管理 GraphQL API 的工具解决方案**，它包含两大组件：

- **Apollo Server**：基于 Node.js 的 GraphQL 服务器，负责定义 Schema、解析查询（Resolvers）、连接数据库、处理认证权限、提供 Subscription 订阅，可与 Express/Koa/Fastify 集成。
- **Apollo Client**：前端 GraphQL 客户端，支持 React/Vue/Angular，负责查询变更、缓存管理、本地状态管理、订阅、错误处理。

简单说：**GraphQL 是协议，Apollo 是这套协议最主流的一套实现工具**。本文前几节的 Schema/Resolver 是 GraphQL 协议本身，从这一节开始用的 `@apollo/server`、`@apollo/client` 就是 Apollo 的实现。

回到 Apollo Server。前面第 2 节的 SDL 示例，用了 Apollo Server 4 的 `startStandaloneServer` 快速起服务。standalone 模式下，配套一个 TypeScript 配置即可跑起来：

```json
{
  "compilerOptions": {
    "rootDirs": ["src"],
    "outDir": "dist",
    "lib": ["es2020"],
    "target": "es2020",
    "module": "esnext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "types": ["node"]
  },
  "ts-node": {
    "esm": true
  }
}
```

但在真实项目里，GraphQL 服务通常要和 Express 集成——因为你需要挂 CORS、body-parser、鉴权中间件、以及从请求里提取上下文。

先交代一个**版本坑**：早期的 GraphQL 项目（包括本文后面的「编程式实战」）用的是 `express-graphql` 这个包，它通过 `app.use('/graphql', graphqlHTTP({ schema, graphiql: true }))` 挂载。**`express-graphql` 已经处于弃用（deprecated）状态**，官方推荐迁移到 `@apollo/server` 4（或 `graphql-yoga` 等现代实现）。生产新项目，直接用 `@apollo/server`。

下面是 Apollo Server 4 结合 Express 的标准写法，注意两个关键点——`server.start()` 要先于挂载中间件，`expressMiddleware` 的 `context` 用来注入每次请求的鉴权信息：

```typescript
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import schema from './schema/index';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// 初始化 Apollo Server
const server = new ApolloServer({
  schema,
  introspection: true  // 生产环境应关闭
});

// 启动
const startServer = async () => {
  await server.start();

  app.use(
    '/graphql',
    bodyParser.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        // 获取请求头中的 token
        const token = req.headers.authorization || '';
        console.log('token:', token);
        return { token };
      }
    }) as any,
  );

  app.listen(4000, () => {
    console.log(`🚀 Server ready at http://localhost:4000/graphql`);
  });
};

startServer();
```

这里有几个值得记住的细节：

- **`introspection: true` 生产应关闭**——内省能让客户端探测整个 Schema（字段、类型、文档），是 GraphiQL / Apollo Sandbox 工具工作的基础，但在生产暴露整个 API 结构有信息泄露风险，所以开发开、生产关。
- **`context` 函数每次请求执行一次**，返回值会被注入到该请求所有 resolver 的第三个参数。上面把 `token` 注入进去，resolver 里就能拿到鉴权信息做权限校验（呼应第三部分第 2 节的越权风险）。
- **`server.start()` 必须先 `await`**，再挂 `expressMiddleware`——这是 Apollo Server 4 和 3 的一个破坏性变更，忘 `await` 会报错。

Schema 部分用 `makeExecutableSchema` 把 SDL 和 resolver 合成一份可执行 Schema：

```typescript
import { makeExecutableSchema } from '@graphql-tools/schema'
import { BookModel } from '../model/index'

const schema = makeExecutableSchema({
  typeDefs: `
    type Book {
      _id: ID!
      title: String!
      author: String!
      price: Float,
      is_hot: Boolean,
      pub_date: String,
    }

    input BookInput {
      title: String!
      author: String!
      price: Float,
      is_hot: Boolean,
      pub_date: String
    }

    type Query {
      books: [Book]
      book(id: ID!): Book
    }

    type Mutation {
      addBook(input: BookInput!): Book
    }
  `,
  resolvers: {
    Query: {
      books: async () => {
        const books = await BookModel.find();
        return books
      },
      book: async (_, { id }) => {
        return await BookModel.findById(id);
      }
    },
    Mutation: {
      addBook: async (_, { input }) => {
        const newBook = new BookModel(input);
        return await newBook.save();
      }
    }
  }
});

export default schema;
```

注意这里多了个 **`input` 类型**——`BookInput`。这是 GraphQL 的一个设计：**Mutation 的参数必须用 `input` 类型**（或标量），不能直接用 `type` 对象类型。因为 `type` 是用来描述**输出/查询**的，而 `input` 专门描述**输入参数**。这是新手常踩的坑：Mutation 里想传一个对象参数，必须 `input BookInput { ... }` 而不能 `type Book { ... }`。

数据层用 Mongoose 连 MongoDB：

```typescript
import mongoose from "mongoose";

const Schema = mongoose.Schema;

// 1.创建连接
const conn = mongoose.createConnection('mongodb://localhost:27017/apollo-demo');
conn.on('error', function (error) {
  console.error('数据库连接失败：' + error);
});
conn.once('open', function () {
  console.log('数据库连接成功');
});

// 2.创建Schema
const BookSchema = new Schema({
  title: String,
  author: String,
  price: Number,
  is_hot: Boolean,
  pub_date: Date
});

// 3.创建Model
const BookModel = conn.model('book', BookSchema);

export {
  BookModel
};
```

启动后访问 `http://localhost:4000/graphql`，会进入 Apollo Sandbox（内置的调试工具，替代老版的 GraphiQL），可以直接写查询、看 Schema 文档、测 Mutation：

<!-- 这是一张图片，ocr 内容为：A HTTP://LOCALHOST:4000/ PUBLISH SANDBOX 口 EXAMPLEQUERY DOCUMENTATION OPERATION 200 12.0MS  119B EXAMPLEQUERY RESPONSE QUERY ROOT 田 1234567 QUERY EXAMP LEQUERY "DATA" BOOK5 AUTHOR. BOOKS QUERY TITLE 山 "AUTHOR": KATE CHOPIN", "TITLE": "THE AWAKENING" FIELDS BOOKS:[BOOK] "PAUL AUSTER", "AUTHOR" TITLE": "CITY OF GLASS" HEADERS PRE-OPERATION SCRIPT POST-OPERATION SCRIPT VARIABLES JSON -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1743386409508-4d918d23-b0a9-4fd0-9619-fb239b007768.png)

上面这套 TypeScript + Express 集成的完整工程，依赖几个配置文件。先看它的项目结构（`src` 下分 `schema` / `model` / `index.ts` 三层）：

<!-- 这是一张图片，ocr 内容为：APOLLO O 出 APOLLO NODE_MODULES SIRC MODEL INDEX.TS E NODEMON.JSON PACKAGE .JSON PNPM-LOCK.YAML TSCONFIG.JSON 园NADE PROBLEMS OUTPUT DEBUG COMMENTS SPELL CHECKER G CONSOLE PORTS IS HOT:TRUE, PUB_DATE:2010-10-09T16:00:00.000Z, PUB DATE: '2010-10-09T16:00:00.0002' J RESTARTING DUE TO CHANGE5... G TS-NODE SRC/INDEX.TS L NODEMON  STARTING 1 数据库连接成功 SERVER READY AT HTTP://IOCATHOST:4000/GRAPHQL [NODEMON] RESTARTING DUE TO CHANGES... NOTEPADS [NODEMON] RESTARTING DUE TO CHANGES... OUTLINE [NODEMON] STARTING T5-NODE SRC/INDEX.TS TIMELINE 3 K TO GENERATE A COMMAND 0 #127.0.0.10BYSI LAUNCHPAD -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1743404519063-f34aa368-376d-4b72-b2e8-75a09e4a7c24.png)

补上几个配置文件，你就拿到了一个可以直接 `pnpm dev` 跑起来、连接 MongoDB 的 Apollo Server 4 骨架：

**package.json**——关键依赖是 `@apollo/server` + `@graphql-tools/schema` + `graphql` + `mongoose`：

```json
{
  "name": "apollo",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "dev": "nodemon",
    "compile": "tsc",
    "start": "npm run compile && node ./dist/index.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.5.2",
  "dependencies": {
    "@apollo/server": "^4.11.3",
    "@graphql-tools/schema": "^10.0.23",
    "body-parser": "^2.2.0",
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "graphql": "^16.10.0",
    "mongoose": "^8.13.1"
  },
  "devDependencies": {
    "@types/body-parser": "^1.19.5",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.1",
    "@types/node": "^22.13.14",
    "nodemon": "^3.1.9",
    "ts-node": "^10.9.2",
    "typescript": "^5.8.2"
  }
}
```

**tsconfig.json**——开启 `strict`，配合 `experimentalDecorators`（后文 NestJS 那套元编程会用到，这里先带上）：

```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "CommonJS",
    "lib": ["es2020"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"],
}
```

**nodemon.json**——监听 `src` 下 `.ts` 文件变化，自动用 `ts-node` 重启，开发时省去手动编译：

```json
{
  "watch": ["src"],
  "ext": "ts",
  "exec": "ts-node src/index.ts"
}
```

服务跑起来后，用一条 `mutation` 造数据、再用带变量的 `query` 查回来，验证整条链路：

```javascript
mutation Mutation($input: BookInput!) {
	addBook(input: $input) {
		title
		author
		price
	}
}

query Query($bookId: ID!) {
	books {
		title
		author
		price
		is_hot
		pub_date
		_id
	}
	book(id: $bookId) {
		title
		author
		price
		is_hot
		pub_date
		_id
	}
}
```

<!-- 这是一张图片，ocr 内容为：HTTP://LOCALHOST:4000/GR SANDBOX 补 PUBLISH R 中 人 MUTATION DOCUMENTATION OPERATION 画 QUERY 430B 200 20.0MS RESPONSE ROOT MUTATION MUTATION($INPUT: BOOKINPUT!) 中 23 "DATA"; ADDBOOK(INPUT: $INPUT) BOOKS": TITLE ROOT TYPE 456789 AUTHOR QUERY:QUERY "TITLE":"大话设计模式", PRICE "AUTHOR':"程杰", MUTATION:MUTATION PRICE':90. "IS HOT":TRUE, Y($BOOKID:ID!) "PUB  DATE":"13497984000". QUERY  QUERY($B 10 国 : '67EA3846CA29257A97E94021* BOOKS 11 TITLE 12 AUTHOR "TITLE" "大话数据结构" 13 PRICE "程杰" 14 "AUTHOR" IS HOT "PRICE":80, 15 PUB DATE 16 "IS_HOT":TRUE, 1D 国 17 "PUB_DATE*: "128664000000", _ID": "67EA38ALCA29257A97E94024" BOOK(ID:$BOOKID) ( 18 19 TITLE "BOOK": PRE-OPERATION SCRIPT POST-OPERATION SCRIPT VARIABLES HEADERS TITLE":大话数据结构", JSON 567890 "PRICE":80. "AUTHOR":"程杰", "IS_HOT":TRUE, "PRICE":80, "PUB DATE": "2010-10-10 00:00:00" IS HOT": "PUB_DATE":"128664000000". "BOOKID": '67EA38A1CA29257A97E94024" _ID": "67EA38ALCA29257A97E94024" ADD FILES 化 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1743404859266-bb0a4246-9299-4a41-9ba0-058ce28c3a78.png)

> 💬 **面试官**：Apollo Server 4 结合 Express 时，为什么要先 `await server.start()`？`context` 是干什么的？
>
> ✅ 标准答案：`server.start()` 必须 `await` 完成后再挂 `expressMiddleware`，这是 Apollo Server 4 的启动约定（3 到 4 的破坏性变更），否则会报错。`context` 函数每次请求执行一次，返回值注入到该请求所有 resolver 的第三个参数，常用来挂鉴权后的用户、token、DataLoader 实例等请求级共享数据。
>
> 🎁 加分答案：能点出 `context` 之所以放「请求级」共享数据，是因为它是同一次请求内所有 resolver 共用的（而 DataLoader 必须请求级隔离，避免跨请求串缓存）。再补一句：生产环境要关 `introspection`，避免把整个 Schema 结构暴露给外部，这是 GraphQL 的一个安全细节。

### 5. 客户端查询实践：按需查询 + Apollo Client 缓存

服务端就绪后，看客户端。GraphQL 的价值在客户端体现得最直观——**一次请求，按需拿全所需字段**。

举个医疗场景的对比：患者详情页需要「患者基本信息 + 最近三次处方」。RESTful 通常要调两个接口（`/patient/:id` 拿基本信息、`/patient/:id/prescriptions` 拿处方），还可能带一堆用不到的字段回来。GraphQL 则一次查询全拿：

```graphql
query PatientDetail($id: ID!) {
  patient(id: $id) {
    id
    name
    age
    prescriptions(limit: 3) {   # 最近三次处方
      id
      drug
      dose
    }
  }
}
```

客户端这边，先看 Vite + React + TypeScript 的项目结构：

<!-- 这是一张图片，ocr 内容为：CLIENT 8 CLIENT Y NODE MODULES PUBLIC APP.TSX VITE-ENV.D.TS .GITIGNORE ESLINT.CONFIG.JS GINDEX.HTML PACKAGE.JSON PNPM-LOCK.YAML README.MD TSCONFIG.APP.JSON TSCONFIG.JSON TSCONFIG.NODE.JSON VITE.CONFIG.TS NOTEPADS OUTLINE TIMELINE 公0 0020 LAUNCHPAD -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1743405417098-afed7b6b-d3a8-4392-879d-df9f6d8f03ae.png)

Apollo Client 提供了两个核心能力——**缓存**和 **React hooks**。

先初始化 `ApolloClient`，关键是配 `cache: new InMemoryCache()`（归一化缓存，后面第三部分第 3 节展开它的复杂性）：

```tsx
import { createRoot } from "react-dom/client";
import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";
import "./index.css";
import App from "./App.tsx";

const client = new ApolloClient({
	uri: "http://localhost:4000/graphql",
	cache: new InMemoryCache(),
});

createRoot(document.getElementById("root")!).render(
	<ApolloProvider client={client}>
		<App />
	</ApolloProvider>
);
```

在组件里，用 `useQuery` 发查询、`useMutation` 发变更。这是现代 Apollo Client 的 hooks 写法（`@apollo/client` 包）：

```tsx
import { useEffect, useState } from "react";
import { ApolloConsumer, ApolloClient } from "@apollo/client";
import { Button, Table } from "antd";
import dayjs from "dayjs";
import DetailModal from "./components/Detail";
import { Book } from "./types";
import { GET_BOOKS } from "./api";
import "./App.css";

interface IProps {
  client: ApolloClient<unknown>;
}

interface IRes {
  books: Book[];
}

function WithApolloClient() {
  return <ApolloConsumer>{(client) => <App client={client} />}</ApolloConsumer>;
}

function App(props: IProps) {
  const { client } = props;
  const [list, setList] = useState<Book[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [id, setId] = useState<string>("");

  const getList = async () => {
    const { data } = await client.query<IRes>({
      query: GET_BOOKS,
    });
    console.log(data);
    setList(data.books || []);
  };

  const open = () => {
    setIsModalOpen(true);
  };

  const close = () => {
    setIsModalOpen(false);
  };

  const columns = [
    {
      title: "书名",
      dataIndex: "title",
      key: "title",
    },
    {
      title: "作者",
      dataIndex: "author",
      key: "author",
    },
    {
      title: "价格",
      dataIndex: "price",
      key: "price",
    },
    {
      title: "是否热销",
      dataIndex: "is_hot",
      key: "is_hot",
      render: (text: string) => {
        return text ? "是" : "否";
      },
    },
    {
      title: "出版日期",
      dataIndex: "pub_date",
      key: "pub_date",
      render: (text: string) => {
        return dayjs(Number(text)).format("YYYY-MM-DD HH:mm:ss");
      },
    },
    {
      title: "操作",
      key: "action",
      render: (text: string, record: Book) => {
        return (
          <Button
            type="link"
            onClick={() => {
              setId(record._id!);
              open();
            }}
          >
            查看
          </Button>
        );
      },
    },
  ];

  useEffect(() => {
    getList();
  }, []);

  return (
    <>
      <Table
        columns={columns}
        dataSource={list}
        rowKey={"_id"}
        bordered
      ></Table>
      {isModalOpen && (
        <DetailModal isModalOpen={isModalOpen} close={close} id={id} />
      )}
    </>
  );
}

export default WithApolloClient;
```

查询用 `gql` 模板定义，`useQuery` 会自动根据变量和缓存做请求与缓存命中判断：

```typescript
import { gql } from "@apollo/client";

export const GET_BOOKS = gql`
  query {
    books {
      _id
      title
      author
      price
      is_hot
      pub_date
    }
  }
`;

export const GET_BOOK = gql`
  query Book($id: ID!) {
    book(id: $id) {
      _id
      title
      author
      price
      is_hot
      pub_date
    }
  }
`;
```

详情弹窗用 `useQuery` 拿单条数据，`loading`/`error` 两个状态交给 Apollo 管理，组件本身不用手写请求逻辑：

```tsx
import { Modal, Descriptions } from "antd";
import dayjs from "dayjs";
import { useQuery } from "@apollo/client";
import { GET_BOOK } from "../api";
import { Book } from "../types";

interface IDetailProps {
  isModalOpen: boolean;
  close: () => void;
  id: string;
}

interface IRes {
  book: Book;
}

function Detail(props: IDetailProps) {
  const { isModalOpen, close, id } = props;

  const { data, loading, error } = useQuery<IRes>(GET_BOOK, {
    variables: {
      id,
    },
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error : {error.message}</p>;

  return (
    <>
      <Modal
        title={`ID: ${id}`}
        open={isModalOpen}
        onOk={() => {
          close();
        }}
        onCancel={() => {
          close();
        }}
        footer={null}
      >
        <Descriptions bordered column={1}>
          <Descriptions.Item label="书名">
            {data?.book?.title}
          </Descriptions.Item>
          <Descriptions.Item label="作者">
            {data?.book?.author}
          </Descriptions.Item>
          <Descriptions.Item label="价格">
            {data?.book?.price}
          </Descriptions.Item>
          <Descriptions.Item label="是否热卖">
            {data?.book?.is_hot ? "是" : "否"}
          </Descriptions.Item>
          <Descriptions.Item label="出版日期">
            {dayjs(Number(data?.book?.pub_date)).format("YYYY-MM-DD HH:mm:ss")}
          </Descriptions.Item>
        </Descriptions>
      </Modal>
    </>
  );
}

export default Detail;
```

最终效果，前端表格展示列表、点「查看」弹详情：

<!-- 这是一张图片，ocr 内容为：书名 价格 作者 出版日期 是否热销 操作 2012-10-10 00:00:00 大话设计模式 程杰 90 是 查看 是 大话数据结构 程杰 查看 80 2010-10-10 00:00:00 1 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1743413620031-c0cd7d12-b7be-4d7b-9801-09fbe7881d41.png)<!-- 这是一张图片，ocr 内容为：作者 书名 价格 出版日期 是否热销 操作 大话设计模式 90 2012-10-10 00:00:00 程杰 查看 X ID:67EA38A1CA29257A97E94024 大话数据结构 查看 8 程杰 大话数据结构 书名 1 V 程杰 作者 价格 80 是 是否热卖 出版日期 2010-10-10 00:00:00 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1743413639380-66b107ec-352e-4d99-af1e-041a1c974146.png)

> 💬 **面试官**：Apollo Client 的 `InMemoryCache` 是什么？它和传统基于 URL 的 HTTP 缓存有什么本质不同？
>
> ✅ 标准答案：`InMemoryCache` 是 Apollo Client 的**规范化缓存（Normalized Cache）**——它把每个对象实体按 `id` 存成独立的记录，通过 `id` 引用关联，而不是按「整条请求的 URL + 响应体」来缓存。这样当某个实体更新时，所有引用它的查询都能同步拿到最新数据。
>
> 🎁 加分答案：能点出「规范化缓存」和「URL 级缓存」的差异正是 GraphQL 缓存复杂化的根源——因为 GraphQL 单 endpoint + 任意查询形状，同一个 URL 背后可以有无数种查询，传统按 URL 缓存会互相污染，所以必须下沉到字段/实体级。再补一句：这就是为什么 Apollo Client 需要 `__typename` 和 `id` 来构建规范化缓存（第三部分第 3 节展开）。

### 6. 完整项目实战：商品分类管理的 GraphQL 全栈

前面第 2~5 节把「类型系统、Resolver、Apollo Server、客户端」串成了一条线。这一节给一个**从头到尾的完整全栈项目**——后端用 `express-graphql` + Mongoose 做商品分类 CRUD，前端用 React + `apollo-boost` 做表格管理和增删改。把它跑通，你就对 GraphQL 全链路有了完整手感。

先看后端项目结构（`server` 目录，含 `model.js` / `schema.js` / `server.js`）：

<!-- 这是一张图片，ocr 内容为：graphql-demo EXPLORER OPENEDITORS 向 GRAPHQL-DEMO client server node_modules gitignore JS modeljs 中 package.json JS schemajjs JS serverjs README.md ShowAllCommands 我 GotoFile 我 FinDinFILeS F 我 StartDebugging F5 ToggleTerminaL TUnbound OUTPUT PROBLEMS DEBUGCONSOLE TERMINAL x node Abortinginstautation. yarnpkgadd--exactreactreact-domreact-scriptscatempate-tyes zsh cript--cwd7users/robin/Download/1qit/ahg/q-dem/n hasfailed. TODOS:TREE Deletinggeneratedfile...package.jo Deletinggeneratedfile...yarn.ock OUTLINE Done. TIMELINE graphql/v0.3*+0 gaowenbindeMacBook-Prographq-demog gitg [上证指数3607.09  (-1.34%) Quokka 0040 LiveShare GoLive 8 graphql/v0.3* 0 min Spell -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1631803125787-6a488f2d-7e90-4416-8ef1-cf74fa3ee1a9.png)

**接口实现**。server 用 `graphqlHTTP` 挂载，配置 CORS 允许前端（3000 端口）跨域访问：

```javascript
const express = require('express');
const {graphqlHTTP} = require('express-graphql');
const cors = require('cors');
const schema = require('./schema');

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  methods: 'GET,PUT,POST,DELETE,OPTIONS'
}));

app.use('/graphql', graphqlHTTP({
  schema, // 模型
  graphiql: true // 查询工具
}))

app.listen(4000, () => {
  console.log(`the port 4000 is started`)
})
```

model 里建「分类」和「商品」两个集合，商品的 `category` 字段用 `ObjectId` 外键关联到分类：

```javascript
const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;
const Schema = mongoose.Schema;
const conn = mongoose.createConnection('mongodb://localhost/graphql');
conn.on('open', () => console.log('数据库连接成功'));
conn.on('error', (error) => console.log(error));
const CategorySchema = new Schema({
  name: String
});
const CategoryModel = conn.model('Category', CategorySchema);
const ProductSchema = new Schema({
  name: String,
  category: {
    type: ObjectId,
    ref: 'Category'
  }
});
const ProductModel = conn.model('Product', ProductSchema);
module.exports = {
  CategoryModel,
  ProductModel
}
```

schema 里定义 Category/Product 两个类型（带字段级关联 resolver）、以及 Query/Mutation 的增删查：

```javascript
const graphql = require('graphql');
const {CategoryModel, ProductModel} = require('./model');

const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLSchema,
  GraphQLList,
  GraphQLNonNull
} = graphql;

// ! 1.定义产品类别类型
const Category = new GraphQLObjectType({
  name: 'Category',
  fields: () => ({
    id: {type: GraphQLString},
    name: {type: GraphQLString},
    products: {
      type: new GraphQLList(Product),
      resolve(parent) {
        return ProductModel.find({category: parent.id});
      }
    }
  })
});
const Product = new GraphQLObjectType({
  name: 'Product',
  fields: () => ({
    id: { type: GraphQLString },
    name: { type: GraphQLString },
    category: { // 字符串转成对象, 1 => {name: '图书'}
      type: Category,
      resolve(parent) {
        return CategoryModel.findById(parent.category);
      }
    }
  })
});

// ! 2.定义根类型 query mutation
const RootQuery = new GraphQLObjectType({
  name: 'RootQuery',
  fields: {
    getCategory: { // 根据分类id查询单个分类
      type: Category,
      args: {
        id: { type: GraphQLNonNull(GraphQLString) }
      },
      resolve(parent, args) {
        return CategoryModel.findById(args.id);
      }
    },
    getCategories: { // 查询所有的分类
      type: new GraphQLList(Category),
      args: {},
      resolve(parent, args) {
        return CategoryModel.find();
      }
    },
    getProduct: { // 根据商品id获取单个商品
      type: Product,
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) }
      },
      resolve(parent, args) {
        return ProductModel.findById(args.id);
      }
    },
    getProducts: { // 查询所有的产品
      type: new GraphQLList(Product),
      args: {},
      resolve(parent, args) {
        return ProductModel.find()
      }
    }
  }
});

const RootMutation = new GraphQLObjectType({
  name: 'RootMutation',
  fields: {
    addCategory: {
      type: Category,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) }
      },
      resolve(parent, args) {
        return CategoryModel.create(args);
      }
    },
    addProduct: {
      type: Product,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        category: {type: new GraphQLNonNull(GraphQLString) }
      },
      resolve(parent, args) {
        return ProductModel.create(args);
      }
    }
  }
});

// ! 3.定义 schema
module.exports = new GraphQLSchema({
  query: RootQuery,
  mutation: RootMutation
});
```

**操作步骤**：先用 mutation 造数据，再用 query 查回来，观察响应结构（每个 mutation/query 后面附了实际返回的 JSON）：

```javascript
mutation {
	addCategory(name:"书籍"){
		id,
		name
	}
}
// {
// 	"data": {
// 		"addCategory": {
// 			"id": "5dcfb188fe2d74a3543392ab",
// 			"name": "书籍"
// 		}
// 	}
// }


{
	getCategories {
		id
		name
	}
}
// {
// 	"data": {
// 		"getCategories": [
// 			{
// 				"id": "5dcfb188fe2d74a3543392ab",
// 				"name": "书籍"
// 			},
// 			{
// 				"id": "5dcfb1bdfe2d74a3543392ad",
// 				"name": "数码产品"
// 			},
// 			{
// 				"id": "5dcfb1c5fe2d74a3543392ae",
// 				"name": "食品"
// 			}
// 		]
// 	}
// }


mutation {
	addProduct(name: "西游记", category: "5dcfb188fe2d74a3543392ab") {
		id
		name
	}
}
// {
// 	"data": {
// 		"addProduct": {
// 			"id": "5dcfb341b2f03ea4906dd913",
// 			"name": "西游记"
// 		}
// 	}
// }

{
	getProducts {
		id
		name
	}
}
// {
// 	"data": {
// 		"getProducts": [
// 			{
// 				"id": "5dcfb341b2f03ea4906dd913",
// 				"name": "西游记"
// 			},
// 			{
// 				"id": "5dcfb354b2f03ea4906dd914",
// 				"name": "红楼梦"
// 			},
// 			{
// 				"id": "5dcfb36cb2f03ea4906dd915",
// 				"name": "水浒传"
// 			},
// 			{
// 				"id": "5dcfb37bb2f03ea4906dd916",
// 				"name": "三国演义"
// 			},
// 			{
// 				"id": "5dcfb393b2f03ea4906dd917",
// 				"name": "iPhone"
// 			},
// 			{
// 				"id": "5dcfb3a7b2f03ea4906dd918",
// 				"name": "面包"
// 			}
// 		]
// 	}
// }
```

再看前端项目结构（`client` 目录，React + TypeScript）：

<!-- 这是一张图片，ocr 内容为：graphql-demo OPENEDITORS E 向 GRAPHOL-DEMO client node_modules 511 public api Tayout page  components u App.tsx U 拍 columns.tx . types index.css M index.tsx  logo.svg Tsreact-app-env.d.ts ShowAllCommands gitignore GotoFile P 我 M Wpackage.json HI README.md FindinFiles 北 TStsconfig.json 器 yarn.lock StartDebugging F5 h server ToggleTerminal M README.Md TODOS:TREE 4 OUTPUT DEBUGCONSOLE TERMINAL PROBLEMS 人x >OUTLINE >TIMELINE node 数据库连接成功 NPMSCRIPTS 习node [上证指数!3607.09 graphql/0.4中?040 队s06Quokka Appworks (-1.34% LiveShare GoLive  > Spell 1hrs -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1631868967323-35dafae9-225b-446f-a7e2-70c422fb57a7.png)

前端生成项目并装依赖。注意这里的 `apollo-boost` 是老版 Apollo 的一站式客户端，`@apollo/client` 提供 React hooks 视图层，`graphql` 负责解析查询：

```shell
npx create-react-app client --template typescript
cd client
```

```shell
cnpm i apollo-boost -S
cnpm i @apollo/client -S
cnpm i graphql -S
cnpm i antd -S
cnpm i @ant-design/pro-table -S
```

| 模块名 | 含义 |
| --- | --- |
| apollo-boost | package containing everything you need to set up Apollo Client |
| @apollo/client | React hooks based view layer integration |
| graphql | Also parses you GraphQL queries |

链接接口——`ApolloClient` 是浏览器端查询 graphql 接口的工具，指向后端 4000 端口：

```javascript
import ApolloClient from 'apollo-boost';
// ApolloClient 是一个浏览器端查询graphql接口的工具

const client: any = new ApolloClient({
  uri: 'http://localhost:4000/graphql'
});
```

入口 `index` 用 `ApolloProvider` 把 client 注入整个应用，包裹布局和主页面：

```jsx
import React from 'react';
import ReactDOM from 'react-dom';
import ApolloClient from 'apollo-boost';
import {ApolloProvider} from '@apollo/client';
// ApolloClient 是一个浏览器端查询graphql接口的工具
import Layout from './layout';
import App from './page/App';
import './index.css';
import 'antd/dist/antd.css';
import '@ant-design/pro-table/dist/table.css';

const client: any = new ApolloClient({
  uri: 'http://localhost:4000/graphql'
});


ReactDOM.render(
  <ApolloProvider client={client} >
    <Layout>
      <App />
    </Layout>
  </ApolloProvider>,
  document.getElementById('root')
);
```

`layout` 是 Ant Design 的布局外壳：

```jsx
import {Layout} from 'antd';
const { Header, Content, Footer } = Layout;

interface IProps {
  children?: any;
}

const BaseLayout = (props: IProps) => {
  const {children} = props;
  return <Layout>
  <Header style={{ position: 'fixed', zIndex: 1, width: '100%' }}>
    <div style={{fontSize: 20, fontWeight: 'bolder', color: 'white'}}>GraphQL</div>
  </Header>
  <Content className="site-layout" style={{ padding: 0, marginTop: 64 }}>
    <div className="site-layout-background" style={{ padding: 24, height: 'calc(100vh - 112px)' }}>
      {children}
    </div>
  </Content>
  <Footer style={{ textAlign: 'center', height: 30 }}>Ant Design ©2018 Created by Ant UED</Footer>
</Layout>
}
export default BaseLayout;
```

主页面 `App` 用 `useQuery` 拉数据、`useMutation` 做增删改，配合 ProTable 的可编辑表格和 `refetchQueries` 在变更后重新拉取：

```jsx
import React, {useEffect, useState, useRef} from 'react';
import {useQuery, useMutation} from '@apollo/client';
import {CATEGORIES_PRODUCTS, DELETE_PRODUCT, PRODUCTS, UPDATE_PRODUCT} from '../api';
import ProTable from '@ant-design/pro-table';
import {message, Button} from 'antd';
import columns from './columns';
import {Product, Category} from '../types';
import AddModal from './components/AddModal';
import DetailModal from './components/DetailModal';

function App() {
  const [dataSource, setDataSource] = useState<Array<Product>>([]);
  const [categories, setCategories] = useState<Array<Category>>([]);
  const {data, error, loading} = useQuery(CATEGORIES_PRODUCTS);
  const [deleteProduct] =  useMutation(DELETE_PRODUCT);
  const [updateProduct] =  useMutation(UPDATE_PRODUCT);
  const actionRef = useRef<any>();
  useEffect(() => {
    if(error) {
      return message.error(error);
    }
    if(data) {
      const {getProducts, getCategories}= data;
      const products = getProducts.map((p: Product) => ({...p, categoryId: p.category!.id}))
      setDataSource(products);
      setCategories(getCategories);
    }
  }, [data, error]);

  const cols = columns.map(c => {
    if(c.dataIndex === 'categoryId') {
      if(categories.length > 0) {
        const map = new Map();
        for (const category of categories) {
          map.set(category.id, category.name);
        }
        c.valueEnum = map;
      }
    }
    if(c.valueType === 'option') {
      c.render = (text, record, _, action: any) => [
        <DetailModal key="view" record={record} />,
        <Button
          key="editable"
          type="link"
          onClick={() => {
            action?.startEditable?.(record.id);
          }}
        >
          编辑
        </Button>,
        <Button
          key="delete"
          type="link"
          danger
          onClick={async () => {
            const {id} = record;
            const {data} = await deleteProduct({variables: {id}, refetchQueries: [{
              query: PRODUCTS
            }]});
            if(data) {
              message.success('删除成功');
            }
          }}
        >
          删除
        </Button>
      ];
    }
    return c;
  })
  return (
    <div>
      <ProTable
        dataSource={dataSource}
        rowKey="id"
        loading={loading}
        columns={cols}
        actionRef={actionRef}
        headerTitle="产品列表"
        search={false}
        options={{
          setting: false
        }}
        editable={{
          type: 'multiple',
          actionRender: (row, config, dom) => [dom.save, dom.cancel],
          onSave: async (k, record, row) => {
            const {categoryId:category,  id, name} = record;
            const {data} = await updateProduct({variables: {category, id, name}, refetchQueries: [{
              query: PRODUCTS
            }]});
            if(data) {
              message.success('编辑成功');
            }
          }
        }}
        pagination={false}
        scroll={{
          y: 'calc(100vh - 250px)'
        }}
        toolBarRender={() => [
          <AddModal key="add" categories={categories} />
        ]}
      />
    </div>
  )
}

export default App;
```

`columns` 定义表格列（名称、分类、操作）：

```jsx
import {ProColumns} from '@ant-design/pro-table';
import {Product} from '../types';

const columns: ProColumns<Product>[] = [
  {
    dataIndex: 'index',
    valueType: 'indexBorder',
    width: 48,
  },
  {
    title: '名称',
    dataIndex: 'name',
    copyable: true,
    ellipsis: true,
  },
  {
    title: '分类',
    dataIndex: 'categoryId',
    filters: true,
    onFilter: true,
    valueType: 'select',
    valueEnum: {},
  },
  {
    title: '操作',
    valueType: 'option',
  },
];
export default columns;
```

`AddModal` 用 `ModalForm` + `useMutation` 新增产品，`onFinish` 里带 `refetchQueries` 在新增后刷新列表：

```jsx
import React from 'react';
import { Button, message } from 'antd';
import { ModalForm, ProFormText, ProFormSelect } from '@ant-design/pro-form';
import { useMutation } from '@apollo/client';
import { ADD_PRODUCT, PRODUCTS } from '../../api';

const AddModal = (props: any) => {
  const {categories} = props;
  const options = new Map();
  categories.map((p: any) => options.set(p.id, p.name));
  const [addProduct] =  useMutation(ADD_PRODUCT);

  return (
    <ModalForm
      title="新增产品"
      trigger={<Button type="primary">新增</Button>}
      submitter={{
        resetButtonProps: {
          type: 'dashed',
        },
        submitButtonProps: {
          style: {
            display: 'block',
          },
        },
      }}
      modalProps={{
        destroyOnClose: true
      }}
      onFinish={async (values) => {
        const {data} = await addProduct({variables: values, refetchQueries: [{
          query: PRODUCTS
        }]});
        if(data) {
          message.success('提交成功');
        }
        return true;
      }}
    >
      <ProFormText
        name="name"
        label="名称"
        tooltip="最长为 24 位"
        placeholder="请输入名称"
        rules={[{required: true}]}
      />
      <ProFormSelect
        valueEnum={options}
        name="categoryId"
        label="分类"
        placeholder="请选择分类"
        rules={[{required: true}]}
      />
    </ModalForm>
  );
};

export default AddModal;
```

`DetailModal` 展示产品详情，并列出「此分类下的所有产品」（利用 GraphQL 一次查询嵌套拿到的 `category.products`）：

```jsx
import React from 'react';
import { Button, Card, Avatar, Space, List } from 'antd';
import { ModalForm } from '@ant-design/pro-form';
const {Meta} = Card;
const AddModal = (props: any) => {
  const {record} = props;
  const {name: productName, category: {name: categoryName, products}} = record;
  return (
    <ModalForm
      title="产品详情"
      trigger={<Button type="link">详情</Button>}
      submitter={false}
    >
      <Space direction="horizontal" size="large" style={{width: '100%'}}>
        <Card
          style={{ width: 300 }}
          cover={
            <img
              alt="example"
              src="https://gw.alipayobjects.com/zos/rmsportal/JiqGstEfoWAOHiTxclqi.png"
            />
          }
          actions={[]}
        >
          <Meta
            avatar={<Avatar src="https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png" />}
            title={productName}
            description={`分类：${categoryName}`}
          />
        </Card>
        <Space direction="vertical" style={{width: '100%'}}>
          <h3 style={{textAlign: 'center'}}>此分类下的所有产品</h3>
          <List
            itemLayout="vertical"
            dataSource={products}
            renderItem={(p: any) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar src="https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png" />}
                  title={p.name}
                  description="作者：不详"
                />
              </List.Item>
            )}
          />
        </Space>
      </Space>
    </ModalForm>
  );
};

export default AddModal;
```

`types` 定义 TypeScript 类型：

```jsx
export interface Category {
  id?:string;
  name?:string;
}

export interface Product{
  id?:string;
  name?:string;
  category?: Category;
  categoryId?: string;
}
```

`api` 用 `gql` 定义所有查询/变更。注意 `CATEGORIES_PRODUCTS` 一次查询同时拿分类和商品（体现按需查询 + 一次多资源），`ADD_PRODUCT` 用 `$` 变量传参：

```jsx
import {gql} from 'apollo-boost';
export const CATEGORIES_PRODUCTS = gql`query{
  getCategories {
    id
    name
    products {
      id
      name
    }
  }
  getProducts {
    id
    name
    category {
      id
      name
      products {
        id
        name
      }
    }
  }
}
`;

export const ADD_PRODUCT = gql`
mutation($name:String!, $categoryId: String!){
  addProduct(name: $name, category: $categoryId) {
    id
    name
    category {
      id
      name
    }
  }
}
`;

export const DELETE_PRODUCT = gql`
mutation($id:String!){
  deleteProduct(_id: $id) {
    id
    name
    category {
      id
      name
    }
  }
}
`;

export const UPDATE_PRODUCT = gql`
mutation($id:String!, $name:String!, $category: String!){
  updateProduct(_id: $id, name: $name, category: $category) {
    id
    name
    category {
      id
      name
    }
  }
}
`;


export const PRODUCTS = gql`query{
  getProducts {
    id
    name
    category {
      id
      name
      products {
        id
        name
      }
    }
  }
}
`;
```

> 💬 **面试官**：`useMutation` 里的 `refetchQueries` 是干什么用的？为什么 mutation 后要手动触发重新查询？
>
> ✅ 标准答案：`refetchQueries` 在 mutation 完成后，自动重新执行指定的查询（这里指 `PRODUCTS` 列表查询），把服务端最新的数据拉回来刷新界面。因为 Apollo Client 的规范化缓存虽然能自动更新「已知实体」，但列表的增删改往往改变了集合内容，需要显式重新拉取保证列表与后端一致。
>
> 🎁 加分答案：能点出「规范化缓存能自动处理单实体更新、但列表增删需要 refetch 或手写 cache 更新」这个边界——Apollo Client 的缓存按 `id` 归一化，单个实体变了引用它的查询会自动更新，但「列表里多了一条/少了一条」这种集合变化，缓存自己不知道，所以要么 `refetchQueries` 重查，要么用 `update` 函数手动改缓存。

---

## 二、企业最佳实践

### 1. GraphQL vs RESTful 的选型

这是面试必问、也是最容易被问到「没想清楚」的题。先说清两种范式的本质差异。

**RESTful**：以**资源（URL）**组织接口，每个资源一个端点（`/patients`、`/patients/:id`、`/patients/:id/prescriptions`），**字段由服务端预先决定**。它天然带来两个问题：

- **过度获取（Over-fetching）**：客户端只想拿 `name` 和 `age`，服务端的 `/patient/:id` 却把整条患者记录（含病历、账单、一堆敏感字段）全返回了。
- **获取不足（Under-fetching）**：客户端需要「患者 + 处方 + 检验报告」三种数据，RESTful 要发三个请求，客户端自己拼装，多端重复写聚合逻辑。

**GraphQL**：**一个 endpoint**（`/graphql`）+ 客户端自定义查询，**把「取什么字段」的决定权交给客户端**。

两者的边界，用一张表对比：

| 维度 | RESTful | GraphQL |
|------|---------|---------|
| 组织方式 | 以资源 URL 组织，一资源多端点 | 单 endpoint，客户端自定义查询 |
| 字段决定权 | 服务端预先写死 | 客户端声明要什么 |
| 典型问题 | 过度获取 / 获取不足 | N+1 / 越权放大 / 缓存复杂化 |
| 缓存策略 | URL 级 HTTP 缓存天然可用 | 需字段级/规范化缓存 |
| 能力边界 | 隐式（靠文档约定） | 显式（Schema 强类型契约） |

**核心结论一句话**：**服务端能力边界由 Schema 定义，客户端决定具体取什么**。

那什么时候该上 GraphQL？关键判断标准是**「端」的数量和字段碎片化程度**：

- **端多、字段碎片化严重** → GraphQL 优势明显。比如医院 HIS 系统有 Web 管理后台、医生端 App、患者端小程序，三个端对「患者详情」要的字段完全不同，GraphQL 一个 Schema 让各端各取所需，不用为每端维护一套聚合接口。
- **端少、需求简单** → 手写 BFF REST 更直接。就一个 Web 端、字段需求稳定，GraphQL 带来的 N+1、缓存、权限这些额外复杂度得不偿失（呼应第 10 篇 BFF 的结论——中小型项目手写 BFF 更简单，端的数量多了 GraphQL 才划算）。

> 💬 **面试官**：什么场景适合上 GraphQL，什么场景不适合？你怎么做这个判断？
>
> ✅ 标准答案：核心看「端」的数量和字段碎片化程度。端多、各端字段需求差异大、字段碎片化严重时，GraphQL 的按需查询优势明显；端少、需求简单稳定时，手写 BFF REST 更直接，避免引入 N+1、缓存、权限这些额外复杂度。
>
> 🎁 加分答案：能点出「GraphQL 和 BFF 解决的是同一个问题（多端按需取数据）的两种解法」——BFF 是命令式（服务端为每端写死裁剪），GraphQL 是声明式（客户端自己声明）。再补一句选型锚点：「服务端能力边界由 Schema 定义，客户端决定取什么」这句话，正是 GraphQL 相比 RESTful 的本质差异。

### 2. Schema First 契约先行

GraphQL 带来的一个**协作模式**层面的价值，比技术本身更值得讲——**Schema First（Schema 优先）**。

传统前后端对接，通常是「后端先开发接口 → 出接口文档 → 前端照着文档联调」，前端往往要等后端，接口字段靠文档约定、容易对不上。

Schema First 把它反过来：**先共同设计 Schema 作为前后端契约**，然后用它驱动并行开发：

- **前端**：拿到 Schema 后，用 mock 数据（或 graphql-tools 的 mock）**并行开发**，不用等后端真实 Resolver 就绪
- **后端**：照 Schema **逐步实现**真实的 Resolver
- **契约即代码**：Schema 是强类型、可内省、可校验的，字段对不上编译/校验阶段就暴露，而不是联调时才发现

这其实是「**集成任何后端接口前，先确认接口结构**」这条通用工程规范，在 GraphQL 场景下的落地——只是把「确认接口结构」这一步，从「看一份可能过时的接口文档」升级成了「Schema 本身就是可执行的契约」。

医疗场景里，这份契约的价值尤其直观：患者、处方、检验报告这些实体的字段一旦在 Schema 里定死，前后端就围绕同一份类型定义协作，谁改字段、谁破坏契约，内省和类型校验立刻就能发现。

> 💬 **面试官**：Schema First 的协作模式，相比传统前后端接口对接有什么优势？
>
> ✅ 标准答案：Schema First 把「设计 Schema」前移为第一步，作为前后端共享的强类型契约——前端拿 Schema 用 mock 并行开发，后端照 Schema 逐步实现 Resolver。因为 Schema 是可执行、可内省、可校验的，字段不一致在开发期就暴露，而不是联调期才发现。
>
> 🎁 加分答案：能点出这是「集成接口前先确认接口结构」这条工程规范的 GraphQL 落地——把「确认接口结构」从「读一份可能过时的文档」升级为「Schema 本身就是可执行的契约」。再补一句：SDL 写法（而非编程式）正是为了让 Schema First 更顺畅，因为 SDL 可读、前后端都能一眼看懂、且可以独立于实现先行编写。

### 3. N+1 问题与 DataLoader（本篇重点）

这是 GraphQL 面试里**最有区分度**的一道题，也是生产上最容易踩的坑。

先看 N+1 是怎么产生的。假设你要查询「10 位患者，以及每位患者的处方」，Schema 是：

```graphql
type Patient {
  id: ID!
  name: String!
  prescriptions: [Prescription!]!
}

type Query {
  patients: [Patient!]!
}
```

resolver 写得很自然：

```javascript
const resolvers = {
  Query: {
    patients: async () => {
      return await PatientModel.find({});  // ① 查 1 次：拿到 10 位患者
    }
  },
  Patient: {
    prescriptions: async (parent) => {
      // ② 每位患者各查 1 次：10 次
      return await PrescriptionModel.find({ patientId: parent.id });
    }
  }
};
```

执行时发生了什么？

- 第 ① 步，`patients` resolver 查了 **1 次**数据库，拿到 10 位患者。
- 第 ② 步，`prescriptions` 是**字段级 resolver**，GraphQL 会为**每一位患者各自调用一次**——也就是 **10 次**数据库查询。

总共 **1 + 10 = 11 次**查询。这就是 **N+1 问题**：1 次主查询 + N 次关联查询。

它的根源，正是第 3 节讲的「字段级递归执行」——**每个字段独立触发一次数据访问**。查询的嵌套越深、列表越长，N+1 越严重：如果是「10 位患者 → 每人处方 → 每张处方的药品」，那查询次数会进一步爆炸。

**解法就是 DataLoader**。它的核心思想两条：

- **批处理（Batching）**：把同一请求内触发的多次「按 ID 查询」，合并成**一次** `WHERE id IN (...)` 批量查询。
- **去重（Deduplication）**：对重复的 ID 只查一次（比如同一个患者被两个字段同时请求，缓存一次结果复用）。

用 DataLoader 重写上面的 resolver，加载器长这样：

```javascript
const DataLoader = require('dataloader');

// 创建一个「按患者 ID 批量加载处方」的 loader
const createPrescriptionLoader = () => new DataLoader(async (patientIds) => {
  // ① 一次批量查询：WHERE patientId IN (...)
  const prescriptions = await PrescriptionModel.find({
    patientId: { $in: patientIds }
  });

  // ② 按 patientId 分组，保证返回顺序与传入的 patientIds 一致
  const map = new Map();
  for (const p of prescriptions) {
    if (!map.has(p.patientId)) map.set(p.patientId, []);
    map.get(p.patientId).push(p);
  }

  // ③ 必须按传入顺序返回，每位患者一个数组（没有处方就空数组）
  return patientIds.map(id => map.get(id) || []);
});
```

在 resolver 里用这个 loader（loader 必须**每个请求一个实例**，通过 `context` 注入）：

```javascript
const resolvers = {
  Query: {
    patients: async () => {
      return await PatientModel.find({});
    }
  },
  Patient: {
    prescriptions: (parent, args, context) => {
      // 交给 DataLoader 批量处理，不再每次单独查
      return context.loaders.prescriptions.load(parent.id);
    }
  }
};

// 每个请求创建独立的 loader，避免跨请求串缓存
const context = ({ req }) => ({
  loaders: {
    prescriptions: createPrescriptionLoader(),
  },
});
```

改造后，查询「10 位患者及处方」的数据库访问从 **11 次降到 2 次**：

| 方案 | 数据库查询次数 | 说明 |
|------|--------------|------|
| 不用 DataLoader | 1 + 10 = 11 次 | 1 次主查询 + 每位患者各 1 次 |
| 用 DataLoader | 1 + 1 = 2 次 | 1 次主查询 + 1 次 `IN (...)` 批量查询 |

为什么能合并？关键在于 DataLoader 的**微任务批处理机制**：同一个请求里，`prescriptions.load(parent.id)` 会被调用 10 次（每个患者一次），但 DataLoader 并不立即执行批量函数，而是把这些 ID **收集到一个队列里，等当前同步代码（更准确地说是当前事件循环 tick）结束、微任务队列刷新时，才一次性把所有 ID 交给批量函数**执行。于是 10 次 `load` 就合并成了 1 次 `IN (...)` 查询。

两个必须记住的细节：

- **去重同样重要**：如果同一个患者 ID 被 `load` 了多次（比如列表里重复出现、或两个字段都请求它），DataLoader 的缓存保证批量函数里这个 ID 只出现一次，避免 `IN` 子句里重复和重复查询。
- **loader 必须请求级隔离**：不能全局共享一个 DataLoader 实例，否则不同请求的缓存会互相串、还可能导致内存无限增长。所以 loader 一定在 `context` 里按请求创建。

> 💬 **面试官**：什么是 N+1 查询问题？它怎么在 GraphQL 的 Resolver 模型下产生？DataLoader 怎么解决？
>
> ✅ 标准答案：N+1 指「1 次主查询 + N 次关联查询」——查询 N 条记录及其关联字段时，关联字段是字段级 resolver，会为每条记录各触发一次查询，总共 N+1 次。DataLoader 通过**批处理**（把同一请求内多次按 ID 查询合并成一次 `WHERE id IN (...)`）和**去重**（重复 ID 只查一次）把 N+1 降到 2 次查询。
>
> 🎁 加分答案：能讲出 DataLoader 的**微任务批处理时机**——`load(id)` 不是立即查询，而是把 ID 收集进队列，等当前事件循环 tick 的同步代码跑完、微任务刷新时，才一次性执行批量函数。再补一句：**loader 必须按请求创建**（挂在 `context` 里），否则跨请求缓存串数据、内存泄漏。这是两个最容易漏的加分细节。

### 4. Subscription 的取舍

GraphQL 的第三种操作类型 **Subscription**，是基于 **WebSocket** 做的服务端推送——客户端订阅一个事件，服务端在事件发生时主动把数据推给客户端。

它的典型场景是**低延迟的实时通知**，比如医疗场景里的「检验报告实时更新」：检验科一出结果，医生端的界面立刻刷新，不用手动刷新页面、也不用轮询。

但 Subscription 不是免费的午餐。它引入了一整套**连接管理复杂度**：

- 需要维护 WebSocket 长连接（连接建立、心跳保活、断线重连、连接数上限）
- 需要处理 Pub/Sub 消息路由（哪个客户端订阅了哪个主题，事件发生时广播给谁）
- 部署形态受限（无状态扩缩容时，长连接如何跨实例路由，是比无状态 HTTP 复杂得多的问题）

所以结论是——**不是所有实时场景都值得上 Subscription**：

- 值得上：对**延迟极度敏感**、且事件频率适中的场景（检验报告出结果、处方审核状态变化这种「低频但重要」的推送）。
- 不值得上：事件频率低、或对「秒级延迟」不敏感的场景，**轮询 + 短 TTL 缓存**往往更简单可靠。轮询的代码简单、无状态、天然可水平扩展、不引入连接管理，代价只是「最多晚一个轮询周期才知道」。

这和第 10 篇 BFF、第 11 篇 Serverless 里反复出现的一个判断是一致的：**复杂的实时能力，只在你真正需要低延迟时才值得引入，否则简单方案更优**。

> 💬 **面试官**：GraphQL Subscription 是怎么实现服务端推送的？什么场景不值得引入 Subscription？
>
> ✅ 标准答案：Subscription 基于 WebSocket 建立长连接，服务端通过 Pub/Sub 机制在事件发生时把数据推给订阅的客户端，适合「检验报告实时更新」这类低延迟通知。但并非所有实时场景都值得上——低频、或对秒级延迟不敏感的场景，轮询 + 短 TTL 缓存更简单、无状态、易扩展。
>
> 🎁 加分答案：能点出 Subscription 引入的**连接管理复杂度**是主要代价——心跳保活、断线重连、连接数上限、多实例部署时长连接的路由问题。再补一句判断锚点：**「是否值得上 Subscription」取决于「事件频率 + 对延迟的敏感度」**，低频低敏场景用轮询更划算，这是工程师克制比炫技更重要的体现。

---

## 三、注意事项

### 1. Resolver 深层嵌套放大 N+1

第二部分第 3 节讲的是「一层关联」的 N+1。真实项目里，**关联往往不止一层**——「10 位患者 → 每人处方 → 每张处方的药品」就是两层嵌套，N+1 会从 11 次爆炸到更多。

所以生产上的教训是：**接入 DataLoader 前，先评估真实的查询次数，别只盯着表层字段**。越深的关联字段越容易产生 N+1，而开发者往往只注意到第一层（`patients → prescriptions`），忽略了第二层、第三层（`prescriptions → drugs`）。

正确的做法是：为**每一层关联**都建对应的 DataLoader（`prescriptionLoader`、`drugLoader`……），并确保每个 loader 都挂在请求级的 `context` 里。宁可一开始就为所有关联字段统一铺好 DataLoader，也不要等线上出现「查询一个列表数据库被打爆」才回头排查。

### 2. Schema 权限控制（越权风险）

GraphQL 把「取什么字段」交给客户端，这带来灵活性，也**放大了越权风险**。

RESTful 里，服务端每个端点返回什么字段是写死的，敏感字段可以只在特定端点返回。GraphQL 里，**客户端理论上可以请求 Schema 里的任意字段**（只要类型允许），这就意味着：**不能只靠「客户端不请求这个字段」来保护敏感数据**。

比如患者的「医生私人备注」（`doctorNote`）、「隐私信息」（身份证号、联系方式），如果只是「前端页面恰好没请求」，那恶意客户端直接手写一条包含 `doctorNote` 的 query，就能把它拉下来。

正确的做法是：**在 Resolver 层做角色校验**——敏感字段的 resolver 里检查 `context` 里的用户角色，医生角色才返回备注，患者角色返回 `null` 或直接抛权限错误：

```javascript
const resolvers = {
  Patient: {
    doctorNote: (parent, args, context) => {
      // 角色校验：只有医生能看私人备注
      if (context.user?.role !== 'doctor') {
        return null;  // 或 throw new ForbiddenError('无权限查看')
      }
      return parent.doctorNote;
    }
  }
};
```

关键原则：**权限校验放在 resolver 层（数据访问层），而不是客户端层**。因为客户端是不可信的——你永远不能假设客户端「会乖乖地不请求敏感字段」。

### 3. 缓存失效复杂化

GraphQL 的「单 endpoint + 任意查询形状」，把传统 HTTP 缓存彻底打乱了。

RESTful 里，缓存按 **URL** 组织——`GET /patients/123` 的响应体，配个 `Cache-Control` + `ETag`，就能被 CDN、浏览器、网关缓存。URL 唯一对应一份响应。

GraphQL 里，**所有查询都打在同一个 `/graphql` 端点上**，但请求体（query 字符串）各不相同——「查患者姓名」和「查患者完整病历」是同一个 URL 背后完全不同的查询。如果按 URL 缓存，这些查询会互相污染。

所以 GraphQL 需要**更细粒度的缓存**：

- **字段级缓存**：缓存到「某个实体对象的某个字段」，而不是整条响应。
- **规范化缓存（Normalized Cache）**：Apollo Client 的 `InMemoryCache` 就是这种——把每个实体按 `id` 存成独立记录，查询时按 id 拼装，实体更新时所有引用它的查询同步生效。

代价是：**这比 REST 缓存复杂得多**。REST 里一行 `Cache-Control` 能做的事，GraphQL 里要设计 `__typename` + `id` 的规范化存储、处理字段级失效、处理服务端的持久化查询（Persisted Queries）来配合 HTTP 缓存。这是上 GraphQL 前必须接受的复杂度成本。

### 4. Schema 演进与破坏性变更

GraphQL 的客户端**依赖具体字段**——前端 query 里写了 `patient.name`，服务端就不能随便把 `name` 字段删掉或改类型，否则所有依赖它的客户端立刻崩。

这和 RESTful 一样有「接口演进」问题，但 GraphQL 更尖锐：因为客户端是「精准声明字段」的，任何字段的删除/改名/改类型都是**破坏性变更（Breaking Change）**。

应对策略有三个层次：

- **字段废弃 `@deprecated`**：不直接删字段，先标记废弃，给客户端迁移时间。这是 GraphQL 内置的演进机制：

```graphql
type Patient {
  name: String!
  fullName: String! @deprecated(reason: "改用 name 字段")
}
```

- **版本化**：极端情况下（如大版本重构）用 `/graphql/v2` 或字段命名空间做版本隔离。
- **渐进演进**：核心原则是**「只加不删、先弃用后删除」**——新增字段是安全的（旧客户端不受影响），删除/改类型是破坏性的，必须先 `@deprecated` 观察一段时间再删。

> 💬 **面试官**：GraphQL 的安全风险和缓存策略相比 REST 有什么不同？
>
> ✅ 标准答案：安全上，GraphQL 把「取什么字段」交给客户端，放大了越权风险——敏感字段不能靠「客户端不请求」来保护，必须在 resolver 层做角色校验；还可能因复杂查询被滥用（深度/广度攻击）需要 query 复杂度限制。缓存上，单 endpoint + 任意查询形状让 URL 级 HTTP 缓存失效，必须下沉到字段级或规范化缓存，比 REST 复杂得多。
>
> 🎁 加分答案：能补出「Schema 演进」这条——客户端精准依赖字段，删字段/改类型都是破坏性变更，需要 `@deprecated` 废弃 + 渐进演进。再补一句安全细节：**权限校验放 resolver 层（数据访问层）而不是客户端层**，因为客户端不可信。

---

## 参考资料

- https://graphql.org/
- https://graphql.cn/
- https://spec.graphql.org/
- https://www.apollographql.com/docs/
- https://github.com/graphql/dataloader
- https://www.npmjs.com/package/graphql
- https://www.npmjs.com/package/express-graphql
- https://www.npmjs.com/package/apollo-boost
- https://www.npmjs.com/package/@apollo/client
- http://www.mongoosejs.net/docs/index.html

---

## 💡 面试核心问

- **GraphQL 相比 RESTful 解决了什么核心问题？分别对应「过度获取」和「获取不足」的哪种场景？**（过度获取=服务端返回不需要的字段；获取不足=客户端要多次请求拼装数据）
- **什么是 N+1 查询问题？它是怎么在 GraphQL 的 Resolver 模型下产生的？DataLoader 怎么解决？**（字段级递归执行 → 1 次主查询 + N 次关联查询；DataLoader 批处理合并 `IN` 查询 + 去重）
- **Schema First 的协作模式相比传统前后端接口对接方式有什么优势？**（Schema 作为强类型契约，前后端并行开发，字段不一致开发期暴露）
- **GraphQL 的安全风险和缓存策略相比 REST 有什么不同？**（越权风险放大、需 resolver 层鉴权；URL 缓存失效、需字段级/规范化缓存）
- **GraphQL Subscription 是怎么实现服务端推送的？什么场景不值得引入 Subscription？**（WebSocket 长连接 + Pub/Sub；低频低敏场景轮询 + 短 TTL 更简单）

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 面试频率 |
|--------|-----------|---------|
| GraphQL vs RESTful | 服务端边界由 Schema 定义，客户端决定取什么（解决过度/获取不足） | ⭐⭐⭐ 必考 |
| 类型修饰符 | `!` 非空、`[]` 列表，`[Prescription!]!` 三层含义 | ⭐⭐ 高频 |
| Resolver 执行 | 字段级递归，父字段返回值作为 `parent` 下传 | ⭐⭐⭐ 必考 |
| N+1 问题 | 字段级 resolver 为列表每个元素各查一次 → 1 + N 次 | ⭐⭐⭐ 必考 |
| DataLoader | 批处理（合并 `IN`）+ 去重，微任务时机，请求级隔离 | ⭐⭐⭐ 必考 |
| Schema First | Schema 先行作契约，前后端并行开发 | ⭐⭐ 高频 |
| Subscription | WebSocket + Pub/Sub 推送，低频低敏场景用轮询更划算 | ⭐⭐ 高频 |
| 越权风险 | 敏感字段 resolver 层做角色校验，不靠客户端「不请求」 | ⭐⭐ 高频 |

> 💡 记住这条主线：**GraphQL 用 Schema 定义能力边界 → Resolver 字段级递归取数 → 字段级递归放大成 N+1 → DataLoader 批处理 + 去重根治**。理解了这条链路，GraphQL 的「是什么、怎么运作、坑在哪、怎么解」，就都通了。

---

## 📝 思考题

DataLoader 有两条机制——**批处理（batching）**和**去重（deduplication）**。批处理好理解：把 10 次 `load(id)` 合并成 1 次 `IN` 查询。但**去重**为什么也必不可少？

提示：想一个场景——同一次请求里，`Patient.prescriptions` 和 `Patient.latestPrescription`（最近一次处方）两个字段都要用到「患者的处方数据」，它们可能 `load` 了同一个 `patientId`。如果没有去重，`IN` 子句里会出现重复 ID，批量函数也会重复查询。DataLoader 的缓存是怎么保证「同一个 ID 在一次批量里只出现一次」的？这个缓存又是怎么做到**请求级隔离、跨请求不串数据**的？

欢迎评论区写出你的答案 👇

---

> 🔖 这是「Node.js 全栈深度拆解」系列第 16 篇。上一篇：《Redis 深度：五大数据结构/持久化/缓存与分布式锁最佳实践/接口限流》；下一篇预告：《Node.js 测试与部署：测试分层/supertest/Docker 多阶段构建/PM2 与 Cluster 多进程》。
