# Mongoose是什么
+ Mongoose是MongoDB的一个对象模型工具；
+ 同时它也是针对MongoDB操作的一个对象模型库，封装了MongoDB对文档的一些增删改查等常用方法；
+ 让Nodejs操作MongoDB数据库变得更加灵活简单；
+ Mongoose因为封装了MongoDB对文档的常用方法，可以高效处理Mongoose，还提供了类似Schema的功能，如hook，plugin，virtual，populate等机制

# Mongoose基本使用
## 安装Mongoose
```shell
npm i mongoose -S
```

## 连接Mongodb
+ user：用户名
+ pass：密码
+ ip：IP地址
+ port：端口号
+ database：数据库

```javascript
const mongoose = require('mongoose');
const conn = mongoose.createConnection('mongodb://localhost:27017/demo');
```

## 使用Mongoose
```javascript
const mongoose = require('mongoose');
const conn = mongoose.createConnection('mongodb://localhost:27017/demo');
conn.on('error', (error) => console.log('数据库连接失败：' + error));
conn.on('open', () => console.log('数据库连接成功!'));
```

## Schema
+ Schema是数据库集合的模型骨架，定义了集合中的字段的名称和类型以及默认值等信息。

### Schema.Type
+ NodeJS中的基本数据类型都是属于Schema.Type，另外Mongoose还定义了自己的类型，基本属性类型有：
    - 字符串(String)
    - 日期型(Date)
    - 数值型(Number)
    - 布尔型(Boolean)
    - null
    - 数组([])
    - 内嵌文档

### Schema
```javascript
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  binary: Buffer, // 二机制
  living: Boolean, // 是否活着
  birthday: Date, // 生日
  age: Number, // 年龄
  _id: Schema.Types.ObjectId, // 主键
  _fk: Schema.Types.ObjectId, // 外键
  array: [], // 数组
  arrayOfString: [String], // 字符串数组
  arrayOfNumber: [Number], // 数字数组
  arrayOfData: [Date], // 日期数组
  arrayOfBuffer: [Buffer], // Buffer数组
  arrayOfBoolean: [Boolean], // 布尔值数组
  arrayOfObjectId: [Schema.Types.ObjectId], // 对象ID数组
  nested: { // 内嵌文档
    name: String
  }
})
```

+ 实例

```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");

// todo：2 连接数据库
const conn = mongoose.createConnection("mongodb://localhost:27017/demo");
conn.on("error", (error) => console.log("数据库连接失败：" + error));
conn.on("open", () => console.log("数据库连接成功!"));

// todo：3 Schema
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  age: {type: Number, max: 200, min: 0, required: true}, // 年龄
  createAt: {type: Date, default: Date.now()}
});

const StudentSchema = new Schema({
  name: String,
  age: Number,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher' 
  }
})
```

### Model
+ <font style="color:rgb(51, 51, 51);">Model是由通过Schema构造而成 除了具有Schema定义的数据库骨架以外，还可以操作数据库 </font>
+ <font style="color:rgb(51, 51, 51);">如何通过Schema来创建Model呢，如下:</font>

```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");

// todo：2 连接数据库
const conn = mongoose.createConnection("mongodb://localhost:27017/demo");
conn.on("error", (error) => console.log("数据库连接失败：" + error));
conn.on("open", () => console.log("数据库连接成功!"));

// todo：3 Schema
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  age: {type: Number, max: 200, min: 0, required: true}, // 年龄
  createAt: {type: Date, default: Date.now()}
});

const StudentSchema = new Schema({
  name: String,
  age: Number,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher' 
  }
})
// todo：3 Model
const Teacher = conn.model("Teacher", TeacherSchema);
const Student = conn.model('Student', StudentSchema);

(async function () {
  // todo：新增
  const teacher = await Teacher.create({
    name: 'test',
    age: 30
  })
  const _id = teacher.id;
  const student = await Student.create({
    name: 'student',
    age: 10,
    teacher: _id
  });
  console.log(teacher, student)
})()
```

> <font style="color:rgb(119, 119, 119);">拥有了Model，我们也就拥有了操作数据库的能力 在数据库中的集合名称等于 模型名转小写再转复数,比如 Person>person>people, Child>child>children</font>
>

### Entity
+ <font style="color:rgb(51, 51, 51);">通过Model创建的实体，它也可以操作数据库</font>
+ <font style="color:rgb(51, 51, 51);">使用Model创建Entity，如下示例</font>

```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");

// todo：2 连接数据库
const conn = mongoose.createConnection("mongodb://localhost:27017/demo");
conn.on("error", (error) => console.log("数据库连接失败：" + error));
conn.on("open", () => console.log("数据库连接成功!"));

// todo：3 Schema
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  age: {type: Number, max: 200, min: 0, required: true}, // 年龄
  createAt: {type: Date, default: Date.now()}
});

const StudentSchema = new Schema({
  name: String,
  age: Number,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher' 
  }
})
// todo：3 Model
const Teacher = conn.model("Teacher", TeacherSchema);
const Student = conn.model('Student', StudentSchema);

(async function () {
  // todo：Entity
  // 一个实体就是一个数据或者说是一个文档
  const teacher = new Teacher({
    name: 'test',
    age: 30
  });
  const t = await teacher.save();
  const _id = t.id;
  const student = new Student({
    name: 'student',
    age: 10,
    teacher: _id
  });
  const s = await student.save();
  console.log(t, s)
})()
```

> <font style="color:rgb(119, 119, 119);">Schema生成Model，Model创造Entity，Model和Entity都可对数据库操作,但Model比Entity可以实现的功能更多</font>
>

### ObjectId
+ <font style="color:rgb(51, 51, 51);">存储在mongodb集合中的每个文档都有一个默认的主键_id</font>
+ <font style="color:rgb(51, 51, 51);">这个主键名称是固定的，它可以是mongodb支持的任何数据类型，默认是ObjectId 该类型的值由系统自己生成，从某种意义上几乎不会重复</font>
+ <font style="color:rgb(51, 51, 51);">ObjectId使用12字节的存储空间，是一个由24个16进制数字组成的字符串（每个字节可以存储两个16进制数字）</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">5d9c70b3 f88966 4f24 d9caa5</font>`

| **<font style="color:rgb(51, 51, 51);">部分</font>** | **<font style="color:rgb(51, 51, 51);">值</font>** | **<font style="color:rgb(51, 51, 51);">含义</font>** |
| :--- | :--- | :--- |
| <font style="color:rgb(51, 51, 51);">4字节</font> | <font style="color:rgb(51, 51, 51);">5d9c70b3</font> | <font style="color:rgb(51, 51, 51);">时间戳是自 1970 年 1 月 1 日（08:00:00 GMT）至当前时间的总秒数，它也被称为 Unix 时间戳，单位为秒</font> |
| <font style="color:rgb(51, 51, 51);">3字节</font> | <font style="color:rgb(51, 51, 51);">f88966</font> | <font style="color:rgb(51, 51, 51);">所在主机的唯一标识符,通常是机器主机名的散列值(hash),可以确保不同主机生成不同的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">ObjectId</font>`<br/><font style="color:rgb(51, 51, 51);">不产生冲突</font> |
| <font style="color:rgb(51, 51, 51);">2字节</font> | <font style="color:rgb(51, 51, 51);">4f24</font> | <font style="color:rgb(51, 51, 51);">产生ObjectId的进程的进程标识符(PID)</font> |
| <font style="color:rgb(51, 51, 51);">3字节</font> | <font style="color:rgb(51, 51, 51);">d9caa5</font> | <font style="color:rgb(51, 51, 51);">由一个随机数开始的计数器生成的值</font> |


```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");

const id = mongoose.Types.ObjectId()
console.log(id)
```

> <font style="color:rgb(119, 119, 119);">前9个字节保证了同一秒钟不同机器不同进程产生的ObjectId是唯一的,最后3个字节是一个自动增加的计数器，确保相同进程同一秒产生的ObjectId也是不一样的,一秒钟最多允许每个进程拥有256的3次方(16777216)个不同的ObjectId 每一个文档都有一个特殊的键_id，这个键在文档所属的集合中是唯一的。</font>
>

# 基础操作
## 新增
### Model
```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");

// todo：2 连接数据库
const conn = mongoose.createConnection("mongodb://localhost:27017/demo");
conn.on("error", (error) => console.log("数据库连接失败：" + error));
conn.on("open", () => console.log("数据库连接成功!"));

// todo：3 Schema
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  age: {type: Number, max: 200, min: 0, required: true}, // 年龄
  createAt: {type: Date, default: Date.now()}
});

const StudentSchema = new Schema({
  name: String,
  age: Number,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher' 
  }
})
// todo：3 Model
const Teacher = conn.model("Teacher", TeacherSchema);
const Student = conn.model('Student', StudentSchema);

(async function () {
  // todo：新增
  const teacher = await Teacher.create({
    name: 'test',
    age: 30
  })
  const _id = teacher.id;
  const student = await Student.create({
    name: 'student',
    age: 10,
    teacher: _id
  });
  console.log(teacher, student)
})()
```

### Entity
```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");

// todo：2 连接数据库
const conn = mongoose.createConnection("mongodb://localhost:27017/demo");
conn.on("error", (error) => console.log("数据库连接失败：" + error));
conn.on("open", () => console.log("数据库连接成功!"));

// todo：3 Schema
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  age: {type: Number, max: 200, min: 0, required: true}, // 年龄
  createAt: {type: Date, default: Date.now()}
});

const StudentSchema = new Schema({
  name: String,
  age: Number,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher' 
  }
})
// todo：3 Model
const Teacher = conn.model("Teacher", TeacherSchema);
const Student = conn.model('Student', StudentSchema);

(async function () {
  // todo：Entity
  const teacher = new Teacher({
    name: 'test',
    age: 30
  });
  const t = await teacher.save();
  const _id = t.id;
  const student = new Student({
    name: 'student',
    age: 10,
    teacher: _id
  });
  const s = await student.save();
  console.log(t, s)
})()
```

### 批量添加
```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");

// todo：2 连接数据库
const conn = mongoose.createConnection("mongodb://localhost:27017/demo");
conn.on("error", (error) => console.log("数据库连接失败：" + error));
conn.on("open", () => console.log("数据库连接成功!"));

// todo：3 Schema
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  age: {type: Number, max: 200, min: 0, required: true}, // 年龄
  createAt: {type: Date, default: Date.now()}
});

const StudentSchema = new Schema({
  name: String,
  age: Number,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher' 
  }
})
// todo：3 Model
const Teacher = conn.model("Teacher", TeacherSchema);
const Student = conn.model('Student', StudentSchema);

(async function () {
  // todo：批量添加
  try {
    const teachers = [];
    for (let i = 0; i < 100; i++) {
      teachers.push({name: 'test', age: i+1});
    }
    const res = await Teacher.create(teachers)
    console.log(res)
  } catch (error) {
    console.log(error)
  }
})()
```

## 更新
### updateOne
```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");

// todo：2 连接数据库
const conn = mongoose.createConnection("mongodb://localhost:27017/demo");
conn.on("error", (error) => console.log("数据库连接失败：" + error));
conn.on("open", () => console.log("数据库连接成功!"));

// todo：3 Schema
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  age: {type: Number, max: 200, min: 0, required: true}, // 年龄
  createAt: {type: Date, default: Date.now()}
});

const StudentSchema = new Schema({
  name: String,
  age: Number,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher' 
  }
})
// todo：3 Model
const Teacher = conn.model("Teacher", TeacherSchema);
const Student = conn.model('Student', StudentSchema);

(async function () {
  // todo：更新
  try {
    const res = await Teacher.updateOne({age: 30}, {name: 'test 30'});
    console.log(res)
  } catch (error) {
    console.log(error)
  }
})()
```

### updateMany
```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");

// todo：2 连接数据库
const conn = mongoose.createConnection("mongodb://localhost:27017/demo");
conn.on("error", (error) => console.log("数据库连接失败：" + error));
conn.on("open", () => console.log("数据库连接成功!"));

// todo：3 Schema
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  age: {type: Number, max: 200, min: 0, required: true}, // 年龄
  createAt: {type: Date, default: Date.now()}
});

const StudentSchema = new Schema({
  name: String,
  age: Number,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher' 
  }
})
// todo：3 Model
const Teacher = conn.model("Teacher", TeacherSchema);
const Student = conn.model('Student', StudentSchema);

(async function () {
  // todo：更新
  try {
    const res = await Teacher.updateMany({age: 30}, {name: 'test 30'});
    console.log(res)
  } catch (error) {
    console.log(error)
  }
})()
```

## 删除
### deleteOne
```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");

// todo：2 连接数据库
const conn = mongoose.createConnection("mongodb://localhost:27017/demo");
conn.on("error", (error) => console.log("数据库连接失败：" + error));
conn.on("open", () => console.log("数据库连接成功!"));

// todo：3 Schema
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  age: {type: Number, max: 200, min: 0, required: true}, // 年龄
  createAt: {type: Date, default: Date.now()}
});

const StudentSchema = new Schema({
  name: String,
  age: Number,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher' 
  }
})
// todo：3 Model
const Teacher = conn.model("Teacher", TeacherSchema);
const Student = conn.model('Student', StudentSchema);

(async function () {
  // todo：删除
  try {
    const res = await Teacher.deleteOne({name: 'test'})
    console.log(res)
  } catch (error) {
    console.log(error)
  }
})()
```

### deleteMany
```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");

// todo：2 连接数据库
const conn = mongoose.createConnection("mongodb://localhost:27017/demo");
conn.on("error", (error) => console.log("数据库连接失败：" + error));
conn.on("open", () => console.log("数据库连接成功!"));

// todo：3 Schema
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  age: {type: Number, max: 200, min: 0, required: true}, // 年龄
  createAt: {type: Date, default: Date.now()}
});

const StudentSchema = new Schema({
  name: String,
  age: Number,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher' 
  }
})
// todo：3 Model
const Teacher = conn.model("Teacher", TeacherSchema);
const Student = conn.model('Student', StudentSchema);

(async function () {
  // todo：删除
  try {
    const res = await Teacher.deleteMany({name: 'test'})
    console.log(res)
  } catch (error) {
    console.log(error)
  }
})()
```

## 查询
+ <font style="color:rgb(51, 51, 51);">我们只需要把显示的属性设置为大于零的数就可以，当然1是最好理解的，_id是默认返回，如果不要显示加上("_id":0)</font>

### find
```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");

// todo：2 连接数据库
const conn = mongoose.createConnection("mongodb://localhost:27017/demo");
conn.on("error", (error) => console.log("数据库连接失败：" + error));
conn.on("open", () => console.log("数据库连接成功!"));

// todo：3 Schema
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  age: {type: Number, max: 200, min: 0, required: true}, // 年龄
  createAt: {type: Date, default: Date.now()}
});

const StudentSchema = new Schema({
  name: String,
  age: Number,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher' 
  }
})
// todo：3 Model
const Teacher = conn.model("Teacher", TeacherSchema);
const Student = conn.model('Student', StudentSchema);

(async function () {
  // todo：查询
  try {
    const res = await Teacher.find({}, {_id: 0,__v: 0});
    console.log(res)
  } catch (error) {
    console.log(error)
  }
})()
```

### findOne
+ <font style="color:rgb(51, 51, 51);">与find相同，但只返回单个文档，也就说当查询到即一个符合条件的数据时，将停止继续查询，并返回查询结果 语法</font>

```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");

// todo：2 连接数据库
const conn = mongoose.createConnection("mongodb://localhost:27017/demo");
conn.on("error", (error) => console.log("数据库连接失败：" + error));
conn.on("open", () => console.log("数据库连接成功!"));

// todo：3 Schema
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  age: {type: Number, max: 200, min: 0, required: true}, // 年龄
  createAt: {type: Date, default: Date.now()}
});

const StudentSchema = new Schema({
  name: String,
  age: Number,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher' 
  }
})
// todo：3 Model
const Teacher = conn.model("Teacher", TeacherSchema);
const Student = conn.model('Student', StudentSchema);

(async function () {
  // todo：查询
  try {
    const res = await Teacher.findOne({age: '30'}, {_id: 0,__v: 0});
    console.log(res)
  } catch (error) {
    console.log(error)
  }
})()
```

### findbyId
+ <font style="color:rgb(51, 51, 51);">与findOne相同，但它只接收文档的_id作为参数，返回单个文档 语法</font>

```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");

// todo：2 连接数据库
const conn = mongoose.createConnection("mongodb://localhost:27017/demo");
conn.on("error", (error) => console.log("数据库连接失败：" + error));
conn.on("open", () => console.log("数据库连接成功!"));

// todo：3 Schema
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  age: {type: Number, max: 200, min: 0, required: true}, // 年龄
  createAt: {type: Date, default: Date.now()}
});

const StudentSchema = new Schema({
  name: String,
  age: Number,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher' 
  }
})
// todo：3 Model
const Teacher = conn.model("Teacher", TeacherSchema);
const Student = conn.model('Student', StudentSchema);

(async function () {
  // todo：查询
  try {
    const res = await Teacher.findById('614aaf0467cde85179afa808', {_id: 0,__v: 0});
    console.log(res)
  } catch (error) {
    console.log(error)
  }
})()
```

### <font style="color:rgb(51, 51, 51);">$gt、$lt(大于、小于)</font>
+ <font style="color:rgb(51, 51, 51);">查询时我们经常会碰到要根据某些字段进行条件筛选查询，比如说Number类型，怎么办呢，我们就可以使用$gt(>)、$lt(<)、$lte(<=)、$gte(>=)操作符进行排除性的查询，如下示例：</font>

```javascript
Model.find({"age":{"$gt":6}},function(error,docs){
  //查询所有nage大于6的数据
});

Model.find({"age":{"$lt":6}},function(error,docs){
  //查询所有nage小于6的数据
});

Model.find({"age":{"$gt":6,"$lt":9}},function(error,docs){
  //查询所有nage大于6小于9的数据
});
```

### <font style="color:rgb(51, 51, 51);">$ne(不等于)</font>
+ <font style="color:rgb(51, 51, 51);">$ne(!=)操作符的含义相当于不等于、不包含，查询时我们可通过它进行条件判定，具体使用方法如下：</font>

```javascript
Model.find({ age:{ $ne:6}},function(error,docs){
  //查询age不等于6的所有数据
});
```

### <font style="color:rgb(51, 51, 51);">$in(包含)</font>
+ <font style="color:rgb(51, 51, 51);">和$ne操作符相反，$in相当于包含、等于，查询时查找包含于指定字段条件的数据</font>

```javascript
Model.find({ age:{ $in: 6}},function(error,docs){
  //查询age等于6的所有数据
});

Model.find({ age:{$in:[6,7]}},function(error,docs){
  //可以把多个值组织成一个数组
});
```

### <font style="color:rgb(51, 51, 51);">$or(或者)</font>
+ <font style="color:rgb(51, 51, 51);">可以查询多个键值的任意给定值，只要满足其中一个就可返回，用于存在多个条件判定的情况下使用，如下示例：</font>

```javascript
Model.find({"$or":[{"name":"zfpx"},{"age":6}]},function(error,docs){
  //查询name为zfpx或age为6的全部文档
});
```

### <font style="color:rgb(51, 51, 51);">$exists(是否存在)</font>
+ <font style="color:rgb(51, 51, 51);">$exists操作符，可用于判断某些关键字段是否存在来进行条件查询。如下示例：</font>

```javascript
Model.find({name: {$exists: true}},function(error,docs){
  //查询所有存在name属性的文档
});

Model.find({email: {$exists: false}},function(error,docs){
  //查询所有不存在email属性的文档
});
```

## <font style="color:rgb(51, 51, 51);">高级查询</font>
+ <font style="color:rgb(51, 51, 51);">可以限制结果的数量,跳过部分结果,根据任意键对结果进行各种排序</font>
+ <font style="color:rgb(51, 51, 51);">所有这些选项都要在查询被发送到服务器之前指定</font>

### <font style="color:rgb(51, 51, 51);">limit(限制数量)</font>
+ <font style="color:rgb(51, 51, 51);">在查询操作中,有时数据量会很大,这时我们就需要对返回结果的数量进行限制 那么我们就可以使用limit函数，通过它来限制结果数量。 </font>
+ <font style="color:rgb(51, 51, 51);">语法</font>

```javascript
find(Conditions,fields,options,callback);
```

+ <font style="color:rgb(51, 51, 51);">代码</font>

```javascript
Model.find({},null,{limit:20},function(err,docs){
  console.log(docs);
});
```

+ <font style="color:rgb(51, 51, 51);">如果匹配的结果不到20个，则返回匹配数量的结果，也就是说limit函数指定的是上限而非下限</font>

### <font style="color:rgb(51, 51, 51);">skip(跳过/略过的数量)</font>
+ <font style="color:rgb(51, 51, 51);">skip函数的功能是略过指定数量的匹配结果，返回余下的查询结果 </font>
+ <font style="color:rgb(51, 51, 51);">语法</font>

```javascript
find(Conditions,fields,options,callback);
```

+ <font style="color:rgb(51, 51, 51);">代码</font>

```javascript
Model.find({},null,{skip:4},function(err,docs){
  console.log(docs);
});
```

+ <font style="color:rgb(51, 51, 51);">如果查询结果数量中少于4个的话，则不会返回任何结果。</font>

### <font style="color:rgb(51, 51, 51);">sort函数</font>
+ <font style="color:rgb(51, 51, 51);">sort函数可以将查询结果数据进行排序操作 该函数的参数是一个或多个键/值对 键代表要排序的键名,值代表排序的方向,1是升序,-1是降序 </font>
+ <font style="color:rgb(51, 51, 51);">语法</font>

```javascript
find(Conditions,fields,options,callback)
```

+ <font style="color:rgb(51, 51, 51);">代码</font>

```javascript
Model.find({},null,{sort:{age:-1}},function(err,docs){
  //查询所有数据，并按照age降序顺序返回数据docs
});
```

+ <font style="color:rgb(51, 51, 51);">sort函数可根据用户自定义条件有选择性的来进行排序显示数据结果。</font>

### 分页查询
```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");

// todo：2 连接数据库
const conn = mongoose.createConnection("mongodb://localhost:27017/demo");
conn.on("error", (error) => console.log("数据库连接失败：" + error));
conn.on("open", () => console.log("数据库连接成功!"));

// todo：3 Schema
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  age: {
    type: Number,
    max: 200,
    min: 0,
    required: true
  }, // 年龄
  createAt: {
    type: Date,
    default: Date.now()
  }
});

const StudentSchema = new Schema({
  name: String,
  age: Number,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher'
  }
})
// todo：3 Model
const Teacher = conn.model("Teacher", TeacherSchema);
const Student = conn.model('Student', StudentSchema);

(async function () {
  // todo：查询
  try {
    const page = 2;
    const pageSize = 5;
    const res = await Teacher.find({}, {
        _id: 0,
        __v: 0,
      })
      .sort({
        age: 1,
      })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();
    console.log(res)
  } catch (error) {
    console.log(error)
  }
})()
```

### populate
```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");

// todo：2 连接数据库
const conn = mongoose.createConnection("mongodb://localhost:27017/demo");
conn.on("error", (error) => console.log("数据库连接失败：" + error));
conn.on("open", () => console.log("数据库连接成功!"));

// todo：3 Schema
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  age: {
    type: Number,
    max: 200,
    min: 0,
    required: true
  }, // 年龄
  createAt: {
    type: Date,
    default: Date.now()
  }
});

const StudentSchema = new Schema({
  name: String,
  age: Number,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher'
  }
})
// todo：3 Model
const Teacher = conn.model("Teacher", TeacherSchema);
const Student = conn.model('Student', StudentSchema);

(async function () {
  // todo：查询
  try {
    const res = await Student.find({}, {
      _id: 0,
      __v: 0,
    }).populate('teacher', {name: 1, age: 1, _id: 0}).exec();
    console.log(res)
  } catch (error) {
    console.log(error)
  }
})()
```

# 高级用法
## 扩展Mongoose模型
+ 业务分层
    - service(多个模型)-->dao单个模型-->model 模型定义
    - service(多个模型)-->dao单个模型-->model 模型定义+扩展方法

## statics对类进行扩展
+ 根据学生名查找学生文档

```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");

// todo：2 连接数据库
const conn = mongoose.createConnection("mongodb://localhost:27017/demo");
conn.on("error", (error) => console.log("数据库连接失败：" + error));
conn.on("open", () => console.log("数据库连接成功!"));

// todo：3 Schema
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  age: {
    type: Number,
    max: 200,
    min: 0,
    required: true
  }, // 年龄
  createAt: {
    type: Date,
    default: Date.now()
  }
});

const StudentSchema = new Schema({
  name: String,
  age: Number,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher'
  }
})

StudentSchema.statics.findByName = function(name) {
  console.log(this)
  return this.findOne({name})
}

// todo：3 Model
const Teacher = conn.model("Teacher", TeacherSchema);
const Student = conn.model('Student', StudentSchema);


(async function () {
  // todo：查询
  try {
    const res = await Student.findByName('student')
    console.log(res)
  } catch (error) {
    console.log(error)
  }
})()

```

## methods对实例进行扩展
```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");

// todo：2 连接数据库
const conn = mongoose.createConnection("mongodb://localhost:27017/demo");
conn.on("error", (error) => console.log("数据库连接失败：" + error));
conn.on("open", () => console.log("数据库连接成功!"));

// todo：3 Schema
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  age: {
    type: Number,
    max: 200,
    min: 0,
    required: true
  }, // 年龄
  createAt: {
    type: Date,
    default: Date.now()
  }
});

const StudentSchema = new Schema({
  name: String,
  age: Number,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher'
  }
})

// 在类上还是实例上扩展，关键看这个操作是针对的集合还是单个实例
StudentSchema.methods.findByName = function(model) {
  console.log(this);
  return this.model(model).findOne({name: this.name});
}

// todo：3 Model
const Teacher = conn.model("Teacher", TeacherSchema);
const Student = conn.model('Student', StudentSchema);


(async function () {
  // todo：查询
  try {
    const student = new Student({name: 'student'});
    const res = await student.findByName('Student');
    console.log(res)
  } catch (error) {
    console.log(error)
  }
})()

```

## virutal虚拟属性
+ <font style="color:rgb(51, 51, 51);">virtual是虚拟属性的意思，即原来Schema定义里是不存在该属性，后来通过virutal方法赋予的属性。</font>
+ <font style="color:rgb(51, 51, 51);">Schema中定义的属性是要保存到数据库里的，而virtual属性基于已有属性做的二次定义。</font>

> <font style="color:rgb(119, 119, 119);">模型属性 = Schema定义的属性+virtual属性</font>
>

```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");

// todo：2 连接数据库
const conn = mongoose.createConnection("mongodb://localhost:27017/demo");
conn.on("error", (error) => console.log("数据库连接失败：" + error));
conn.on("open", () => console.log("数据库连接成功!"));

// todo：3 Schema
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  age: {
    type: Number,
    max: 200,
    min: 0,
    required: true
  }, // 年龄
  phone: String,
  province: String,
  city: String,
  createAt: {
    type: Date,
    default: Date.now()
  }
});

const StudentSchema = new Schema({
  name: String,
  age: Number,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher'
  }
});

TeacherSchema.virtual('area').get(function() {
  console.log(this)
  return this.phone.split('-')[0];
})
TeacherSchema.virtual('address').get(function() {
  return this.province + this.city;
})

// todo：3 Model
const Teacher = conn.model("Teacher", TeacherSchema);
const Student = conn.model('Student', StudentSchema);


(async function () {
  // todo：查询
  try {
    // const res = await Teacher.create({name: 'virtual', age: 40, phone: '010-625588', province: '甘肃', city: '白银'});
    const res = await Teacher.findOne({name: 'virtual'}, {_id: 0, __v: 0});
    console.log(res, res.address, res.area)
  } catch (error) {
    console.log(error)
  }
})()

```

## hook
+ <font style="color:rgb(51, 51, 51);">在用户注册保存的时候，需要先把密码通过salt生成hash密码，并再次赋给password</font>

```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");
const crypto = require('crypto');

// todo：2 连接数据库
const conn = mongoose.createConnection("mongodb://localhost:27017/demo");
conn.on("error", (error) => console.log("数据库连接失败：" + error));
conn.on("open", () => console.log("数据库连接成功!"));

// todo：3 Schema
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  age: {
    type: Number,
    max: 200,
    min: 0,
    required: true
  }, // 年龄
  phone: String,
  province: String,
  city: String,
  password: String,
  createAt: {
    type: Date,
    default: Date.now()
  }
});

const StudentSchema = new Schema({
  name: String,
  age: Number,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher'
  }
});

// hooks
TeacherSchema.pre('save', function(next) {
  console.log(this);
  this.password = crypto.createHash('md5').update(this.password).digest('hex');
  next();
})

// todo：3 Model
const Teacher = conn.model("Teacher", TeacherSchema);
const Student = conn.model('Student', StudentSchema);


(async function () {
  // todo：查询
  try {
    const res = await Teacher.create({name: 'virtual', age: 40, phone: '010-625588', province: '甘肃', city: '白银', password: 'abc'});
    console.log(res)
  } catch (error) {
    console.log(error)
  }
})()

```

## schema插件
+ Schema是可插拔的，也就是说，它们提供在应用预先打包能力来扩展它们的功能。

```javascript
module.exports = exports = function lastModified(schema, options) {
  schema.add({lastModify: Date});
  schema.pre('save', function(next) {
    this.lastModify = new Date();
    next()
  });
  if(options && options.index) {
    schema.path('lastModify').index(options.index);
  }
}
```

```javascript
// todo：1 使用mongoose
const mongoose = require("mongoose");
const crypto = require('crypto');
const plugin = require('./plugin');

// todo：2 连接数据库
const conn = mongoose.createConnection("mongodb://localhost:27017/demo");
conn.on("error", (error) => console.log("数据库连接失败：" + error));
conn.on("open", () => console.log("数据库连接成功!"));

// todo：3 Schema
const Schema = mongoose.Schema;
const TeacherSchema = new Schema({
  name: String, // 姓名
  age: {
    type: Number,
    max: 200,
    min: 0,
    required: true
  }, // 年龄
  phone: String,
  province: String,
  city: String,
  password: String,
  createAt: {
    type: Date,
    default: Date.now()
  }
});

const StudentSchema = new Schema({
  name: String,
  age: Number,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher'
  }
});

// hooks
TeacherSchema.pre('save', function(next) {
  console.log(this);
  this.password = crypto.createHash('md5').update(this.password).digest('hex');
  next();
});

// plugin
TeacherSchema.plugin(plugin, {index: true});

// todo：3 Model
const Teacher = conn.model("Teacher", TeacherSchema);
const Student = conn.model('Student', StudentSchema);


(async function () {
  // todo：查询
  try {
    // const res = await Teacher.create({name: 'virtual', age: 40, phone: '010-625588', province: '甘肃', city: '白银', password: 'abc'});
    const res = await Teacher.findOne({name: 'virtual'}, {_id: 0, __v: 0});
    console.log(res)
  } catch (error) {
    console.log(error)
  }
})()
```

+ <font style="color:rgb(51, 51, 51);">Teacher 是用户自己定义的Schema</font>
+ <font style="color:rgb(51, 51, 51);">Teacher.plugin 是为Teacher增加plugin</font>
+ <font style="color:rgb(51, 51, 51);">plugin有2个参数</font>
    - <font style="color:rgb(51, 51, 51);">插件对象 plugin</font>
    - <font style="color:rgb(51, 51, 51);">配置项 {index:true}</font>

## MongoDB聚合
+ <font style="color:rgb(51, 51, 51);">MongoDB中聚合(aggregate)主要用于处理数据(诸如统计平均值,求和等)，并返回计算后的数据结果。有点类似sql语句中的 count(*)。</font>
+ <font style="color:rgb(51, 51, 51);">MongoDB中聚合的方法使用aggregate()。</font>

### 语法
+ <font style="color:rgb(51, 51, 51);">aggregate() 方法的基本语法格式如下所示：</font>

```shell
>db.COLLECTION_NAME.aggregate(AGGREGATE_OPERATION)
```

### <font style="color:rgb(51, 51, 51);">分组</font>
+ <font style="color:rgb(51, 51, 51);">现在我们通过以上集合计算每个作者所写的文章数，使用aggregate()计算结果如下：</font>

```shell
> db.article.insert({uid:1,content:'1',visit:1});
> db.article.insert({uid:2,content:'2',visit:2});
> db.article.insert({uid:1,content:'3',visit:3});
```

```shell
db.article.aggregate([{$group:{_id:'$uid',total:{$sum:1}}}]);
 { "_id" : 2, "total" : 1 }
{ "_id" : 1, "total" : 2 }
`
```

> <font style="color:rgb(119, 119, 119);">select uid, count(*) total from article group by uid</font>
>

### <font style="color:rgb(51, 51, 51);">聚合的表达式</font>
| **<font style="color:rgb(51, 51, 51);">表达式</font>** | **<font style="color:rgb(51, 51, 51);">描述</font>** | **<font style="color:rgb(51, 51, 51);">实例</font>** |
| :--- | :--- | :--- |
| <font style="color:rgb(51, 51, 51);">$sum</font> | <font style="color:rgb(51, 51, 51);">计算总和。</font> | <font style="color:rgb(51, 51, 51);">db.article.aggregate([{$group : {_id : "$uid", num_tutorial : {$sum : "$visit"}}}])</font> |
| <font style="color:rgb(51, 51, 51);">$avg</font> | <font style="color:rgb(51, 51, 51);">计算平均值</font> | <font style="color:rgb(51, 51, 51);">db.article.aggregate([{$group : {_id : "$uid", num_tutorial : {$avg : "$visit"}}}])</font> |
| <font style="color:rgb(51, 51, 51);">$min</font> | <font style="color:rgb(51, 51, 51);">获取集合中所有文档对应值得最小值。</font> | <font style="color:rgb(51, 51, 51);">db.article.aggregate([{$group : {_id : "$uid", num_tutorial : {$min : "$visit"}}}])</font> |
| <font style="color:rgb(51, 51, 51);">$max</font> | <font style="color:rgb(51, 51, 51);">获取集合中所有文档对应值得最大值。</font> | <font style="color:rgb(51, 51, 51);">db.article.aggregate([{$group : {_id : "$uid", num_tutorial : {$max : "$visit"}}}])</font> |
| <font style="color:rgb(51, 51, 51);">$push</font> | <font style="color:rgb(51, 51, 51);">把某列的所有值都放到一个数组中</font> | <font style="color:rgb(51, 51, 51);">db.article.aggregate([{$group : {_id : "$uid", url : {$push: "$url"}}}])</font> |
| <font style="color:rgb(51, 51, 51);">$addToSet</font> | <font style="color:rgb(51, 51, 51);">返回一组文档中所有文档所选字段的全部唯一值的数组</font> | <font style="color:rgb(51, 51, 51);">db.article.aggregate([{$group : {_id : "$uid", url : {$addToSet : "$url"}}}])</font> |
| <font style="color:rgb(51, 51, 51);">$first</font> | <font style="color:rgb(51, 51, 51);">根据资源文档的排序获取第一个文档数据,可能为null</font> | <font style="color:rgb(51, 51, 51);">db.article.aggregate([{$group : {_id : "$uid", first_url : {$first : "$url"}}}])</font> |
| <font style="color:rgb(51, 51, 51);">$last</font> | <font style="color:rgb(51, 51, 51);">根据资源文档的排序获取最后一个文档数据,可能为null</font> | <font style="color:rgb(51, 51, 51);">db.article.aggregate([{$group : {_id : "$uid", last_url : {$last : "$url"}}}])</font> |


```shell
db.article.insert({uid:1,content:'3',url:'url1'});
db.article.insert({uid:1,content:'4',url:'url1'});
db.article.insert({uid:1,content:'5',url:'url2'});
把某列的所有值都放到一个数组中
db.article.aggregate([{$group : {_id : "$uid", url : {$push: "$url"}}}])
{ "_id" : 1, "url" : [ "url1", "url1", "url2"] }
```

### <font style="color:rgb(51, 51, 51);">管道的概念</font>
+ <font style="color:rgb(51, 51, 51);">管道在Unix和Linux中一般用于将当前命令的输出结果作为下一个命令的参数。 MongoDB的聚合管道将MongoDB文档在一个管道处理完毕后将结果传递给下一个管道处理。管道操作是可以重复的。</font>
    - <font style="color:rgb(51, 51, 51);">$project：修改输入文档的结构。可以用来重命名、增加或删除字段，也可以用于创建计算结果以及嵌套文档。</font>
    - <font style="color:rgb(51, 51, 51);">$match：用于过滤数据，只输出符合条件的文档。$match使用MongoDB的标准查询操作</font>
    - <font style="color:rgb(51, 51, 51);">$limit：用来限制MongoDB聚合管道返回的文档数。</font>
    - <font style="color:rgb(51, 51, 51);">$skip：在聚合管道中跳过指定数量的文档，并返回余下的文档。</font>
    - <font style="color:rgb(51, 51, 51);">$unwind：将文档中的某一个数组类型字段拆分成多条，每条包含数组中的一个值。</font>
    - <font style="color:rgb(51, 51, 51);">$group：将集合中的文档分组，可用于统计结果。</font>
    - <font style="color:rgb(51, 51, 51);">$sort：将输入文档排序后输出。</font>

#### <font style="color:rgb(51, 51, 51);">过滤显示字段</font>
+ <font style="color:rgb(51, 51, 51);">修改输入文档的结构。可以用来重命名、增加或删除字段，也可以用于创建计算结果以及嵌套文档</font>

```shell
db.article.aggregate(
  { $project : {
    _id:0,
    content : 1 ,
  }}
);
```

#### 过滤文档
+ <font style="color:rgb(51, 51, 51);">用于过滤数据，只输出符合条件的文档。$match使用MongoDB的标准查询操作</font>

```shell
db.article.aggregate( [
  { $match : { visit : { $gt : 10, $lte : 200 } } },
  { $group: { _id: '$uid', count: { $sum: 1 } } }
]);
```

#### <font style="color:rgb(51, 51, 51);">跳过指定数量</font>
+ <font style="color:rgb(51, 51, 51);">在聚合管道中跳过指定数量的文档，并返回余下的文档。</font><font style="color:rgb(51, 51, 51);"> </font>

```javascript
var db = connect('school'); 
var vistors = []; 
for(var i=1; i<=20; i++){ 
  vistors.push({uid:i,visit:i}); 
} 
print(vistors.length); 
db.vistors.insert(vistors);
db.vistors.aggregate([ 
  { $match : { visit : { $gt : 10, $lte : 200 }}}, 
  { $group: { _id: '$uid', count: { $sum: 1 } }}, 
  { $skip : 1 }
]);
```

#### $unwind
+ 将文档中的某一个数组类型字段拆分成多条，每条包含数组中的一个值。
+ 使用$unwind可以将weekday中的每个数据都被分解成一个文档,并且除了weekday的值不同外,其他的值都是相同的

```javascript
db.vistors.aggregate( [
  { $project : {_id:1,uid:1,type:1,visit:1}},
  { $match : { visit : { $gte : 1, $lte : 10 } } },
  { $unwind:'$type'}
]);
```

#### <font style="color:rgb(51, 51, 51);">$group</font>
+ <font style="color:rgb(51, 51, 51);">将集合中的文档分组，可用于统计结果。</font>

```javascript
db.vistors.aggregate( [
  { $project : {_id:1,uid:1,type:1,visit:1}},
  { $match : { visit : { $gte : 1, $lte : 10 } } },
  { $unwind:'$type'},
  { $group: { _id: '$uid', count: { $sum: 1 } } },
  { $sort: {_id:1} },
  { $skip : 5 },
  { $limit: 5 }
]);
```

#### <font style="color:rgb(51, 51, 51);">Mongoose中使用</font>
```javascript
Article.aggregate([
  { $match : { visit : { $gt : 10, $lte : 200 } } },
  { $group: { _id: '$uid', count: { $sum: 1 } } },
  { $skip : 1 }
])
  .
```

# 参考
[mongoose](https://www.npmjs.com/package/mongoose)



[Mongoose ODM v6.0.7](https://mongoosejs.com/)



[Mongoose.js中文网](http://www.mongoosejs.net/)

