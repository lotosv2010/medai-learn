# 01 概述
强类型与弱类型
● 类型安全
  ○ 强类型
    ■ 语言层面限制函数的实参类型与形参类型相同
    ■ 强类型有更强的类型约束
    ■ 强类型语言中不允许任意的隐式类型转换
    ■ 优势
      ● 错误更早暴露
      ● 代码更智能，编码更准确
      ● 重构更牢靠
      ● 减少不必要的类型判断
  ○ 弱类型
    ■ 弱类型语言层面不会限制实惨的类型
    ■ 弱类型中几乎没有什么约束
    ■ 弱类型语言中允许任意的隐式类型转换
    ■ 缺点
      ● 类型异常运行时才被抛出
      ● 类型不明确造成函数功能改变
      ● 对对象索引器的错误用法
静态类型与动态类型
● 类型检查
  ○ 静态类型
    ■ 一个变量声明时它的类型就是明确的
    ■ 声明类型后，它的类型就不允许再修改
  ○ 动态类型
    ■ 运行阶段才能明确变量类型
    ■ 变量的类型随时可以改变
    ■ 动态类型语言中的变量没有类型，而变量中存放的值是有类型的

JavaScript类型系统特征
● 任性
● 缺失了类型系统的可靠性
● JavaScript没有编译环节(编译阶段是做类型检查)
什么是Typescript


TypeScript 是 Javascript 的超集，遵循最新的 ES5/ES6 规范。Typescript 扩展了 Javascript 语法。
● Typescript 更像后端 JAVA ,让 JS 可以开发大型企业应用
● TS 提供的类型系统可以帮助我们在写代码时提供丰富的语法提示
● 在编写代码时会对代码进行类型检查从而避免很多线上错误

TypeScript不会取代JS, 尤雨溪： 我认为将类型添加到JS本身是一个漫长的过程 。让委员会设计一个类型系统是（根据TC39的经历来判断）不切实际的 。

环境配置
全局编译TS文件
全局安装 typescript 对 TS 进行编译

npm install typescript -g
tsc --init # 生成tsconfig.json

tsc # 可以将ts文件编译成js文件
tsc --watch # 监控ts文件变化生成js文件
配置rollup环境
● 安装依赖
pnpm add rollup typescript rollup-plugin-typescript2 @rollup/plugin-node-resolve rollup-plugin-serve -D

● 初始化TS配置文件
tsc --init

tsconfig.json 
{
  "compilerOptions": {
    /* Visit https://aka.ms/tsconfig.json to read more about this file */

    /* Basic Options */
    // "incremental": true,                   /* Enable incremental compilation */
    "target": "es5",                          /* Specify ECMAScript target version: 'ES3' (default), 'ES5', 'ES2015', 'ES2016', 'ES2017', 'ES2018', 'ES2019', 'ES2020', or 'ESNEXT'. */
    "module": "ESNext",                     /* Specify module code generation: 'none', 'commonjs', 'amd', 'system', 'umd', 'es2015', 'es2020', or 'ESNext'. */
    // "lib": [],                             /* Specify library files to be included in the compilation. */
    // "allowJs": true,                       /* Allow javascript files to be compiled. */
    // "checkJs": true,                       /* Report errors in .js files. */
    // "jsx": "preserve",                     /* Specify JSX code generation: 'preserve', 'react-native', or 'react'. */
    // "declaration": true,                   /* Generates corresponding '.d.ts' file. */
    // "declarationMap": true,                /* Generates a sourcemap for each corresponding '.d.ts' file. */
    "sourceMap": true,                     /* Generates corresponding '.map' file. */
    // "outFile": "./",                       /* Concatenate and emit output to single file. */
    // "outDir": "./",                        /* Redirect output structure to the directory. */
    // "rootDir": "./",                       /* Specify the root directory of input files. Use to control the output directory structure with --outDir. */
    // "composite": true,                     /* Enable project compilation */
    // "tsBuildInfoFile": "./",               /* Specify file to store incremental compilation information */
    // "removeComments": true,                /* Do not emit comments to output. */
    // "noEmit": true,                        /* Do not emit outputs. */
    // "importHelpers": true,                 /* Import emit helpers from 'tslib'. */
    // "downlevelIteration": true,            /* Provide full support for iterables in 'for-of', spread, and destructuring when targeting 'ES5' or 'ES3'. */
    // "isolatedModules": true,               /* Transpile each file as a separate module (similar to 'ts.transpileModule'). */

    /* Strict Type-Checking Options */
    "strict": false,                           /* Enable all strict type-checking options. */
    // "noImplicitAny": true,                 /* Raise error on expressions and declarations with an implied 'any' type. */
    // "strictNullChecks": true,              /* Enable strict null checks. */
    // "strictFunctionTypes": true,           /* Enable strict checking of function types. */
    // "strictBindCallApply": true,           /* Enable strict 'bind', 'call', and 'apply' methods on functions. */
    // "strictPropertyInitialization": true,  /* Enable strict checking of property initialization in classes. */
    // "noImplicitThis": true,                /* Raise error on 'this' expressions with an implied 'any' type. */
    // "alwaysStrict": true,                  /* Parse in strict mode and emit "use strict" for each source file. */

    /* Additional Checks */
    // "noUnusedLocals": true,                /* Report errors on unused locals. */
    // "noUnusedParameters": true,            /* Report errors on unused parameters. */
    // "noImplicitReturns": true,             /* Report error when not all code paths in function return a value. */
    // "noFallthroughCasesInSwitch": true,    /* Report errors for fallthrough cases in switch statement. */

    /* Module Resolution Options */
    // "moduleResolution": "node",            /* Specify module resolution strategy: 'node' (Node.js) or 'classic' (TypeScript pre-1.6). */
    // "baseUrl": "./",                       /* Base directory to resolve non-absolute module names. */
    // "paths": {},                           /* A series of entries which re-map imports to lookup locations relative to the 'baseUrl'. */
    // "rootDirs": [],                        /* List of root folders whose combined content represents the structure of the project at runtime. */
    // "typeRoots": [],                       /* List of folders to include type definitions from. */
    // "types": [],                           /* Type declaration files to be included in compilation. */
    // "allowSyntheticDefaultImports": true,  /* Allow default imports from modules with no default export. This does not affect code emit, just typechecking. */
    "esModuleInterop": true,                  /* Enables emit interoperability between CommonJS and ES Modules via creation of namespace objects for all imports. Implies 'allowSyntheticDefaultImports'. */
    // "preserveSymlinks": true,              /* Do not resolve the real path of symlinks. */
    // "allowUmdGlobalAccess": true,          /* Allow accessing UMD globals from modules. */

    /* Source Map Options */
    // "sourceRoot": "",                      /* Specify the location where debugger should locate TypeScript files instead of source locations. */
    // "mapRoot": "",                         /* Specify the location where debugger should locate map files instead of generated locations. */
    // "inlineSourceMap": true,               /* Emit a single file with source maps instead of having a separate file. */
    // "inlineSources": true,                 /* Emit the source alongside the sourcemaps within a single file; requires '--inlineSourceMap' or '--sourceMap' to be set. */

    /* Experimental Options */
    // "experimentalDecorators": true,        /* Enables experimental support for ES7 decorators. */
    // "emitDecoratorMetadata": true,         /* Enables experimental support for emitting type metadata for decorators. */

    /* Advanced Options */
    "skipLibCheck": true,                     /* Skip type checking of declaration files. */
    "forceConsistentCasingInFileNames": true  /* Disallow inconsistently-cased references to the same file. */
  }
}

● rollup 配置操作
rollup.config.js
import ts from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import serve from 'rollup-plugin-serve';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
  input: resolve(__dirname, 'src/index.ts'),
  output: {
    file: resolve(__dirname, 'dist/index.js'),
    format: 'iife',
    sourcemap: true
  },
  plugins: [
    nodeResolve({
      extensions: ['.ts', '.js']
    }),
    ts({
      tsconfig: resolve(__dirname, 'tsconfig.json'),
      check: false,
      clean: true
    }),
    serve({
      contentBase: ['dist', 'public'],
      open: true,
      openPage: '/index.html',
      port: 3300

    })
  ]
}

export default config;

● package.json 配置
{
  "name": "ts-demo",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "dev": "rollup -c -w",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "@rollup/plugin-node-resolve": "^11.0.0",
    "rollup": "^2.34.2",
    "rollup-plugin-serve": "^1.1.0",
    "rollup-plugin-typescript2": "^0.29.0",
    "typescript": "^4.1.2"
  }
}
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="../index.js"></script>
  <title>TypeScript</title>
</head>
<body>
  
</body>
</html>

我们可以通过npm run start启动服务来使用typescript啦~

目录结构

中文错误提示
pnpm tsc --locale zh-CN

# 02 基础类型
● TS中冒号后面的都为类型标识

布尔、数字、字符串类型
let bool:boolean = true
let num:number = 10
let str:string = 'hello ts'
元组类型
● 限制长度个数、类型一一对应
let tuple: [string, number, boolean] = ['ts', 10, true]
// 像元组中增加数据，只能增加元组中存放的类型
tuple.push('hello')
tuple.push(20)
数组
● 声明数组中元素数据类型
let ary1:number[] = [1, 2, 3]
let ary2:string[] = ['1', '2', '3']
let ary3:(number|string)[] = [1, '2', 3]
// 泛型方式来声明
let ary4:Array<number|string> = ['1', 2, '3']
枚举类型
● 枚举会浸入编译后的代码
enum USER_ROLE {
  USER, // 默认从0开始
  ADMIN,
  MANAGER
}
// 原理：{0: "USER", 1: "ADMIN", 2: "MANAGER", USER: 0, ADMIN: 1, MANAGER: 2}
● 可以枚举，也可以反举
// 编译后的结果
(function (USER_ROLE) {
    USER_ROLE[USER_ROLE["USER"] = 0] = "USER";
    USER_ROLE[USER_ROLE["ADMIN"] = 1] = "ADMIN";
    USER_ROLE[USER_ROLE["MANAGER"] = 2] = "MANAGER";
})(USER_ROLE || (USER_ROLE = {}));
● 异构枚举
enum USER_ROLE {
  USER = 'user',
  ADMIN = 1,
  MANAGER
}
● 常量枚举（推荐）
const enum USER_ROLE {
  USER,
  ADMIN,
  MANAGER 
}
console.log(USER_ROLE.USER)// console.log(0 /* USER */);
any类型
● 不进行类型检测
let arr: any = ['ts', true, { name: 'ts' }]
null 和 undefined
● 任何类型的子类型,如果 strictNullChecks 的值为 true ，则不能把 null  和 undefined 付给其他类型
let name:number | boolean
name = null
void类型
● 只能接受 null，undefined 。一般用于函数的返回值
● 严格模式下不能将 null 赋予给 void 
let a:void
a = undefined
never类型
● 任何类型的子类型, never 代表不会出现的值。不能把其他类型赋值给 never 
function error(message: string):never {
  throw new Error('error')
}
function loop(): never {
  while(true) {}
}
function fn(x:number | string) {
  if(typeof x === 'number') {}
  else if (typeof x === 'string') {}
  else {
    console.log(x) // never
  }
}

Symbol类型
● Symbol 表示独一无二
const s1 = Symbol('key')
const s2 = Symbol('key')
console.log(s1 === s2) // false
BigInt类型
● number 类型和 bigInt 类型是不兼容的
const num1 = Number.MAX_SAFE_INTEGER + 1
const num2 = Number.MIN_SAFE_INTEGER + 2
console.log(num1 == num2)
let max:bigint = BigInt(Number.MAX_SAFE_INTEGER)
console.log(max + BigInt(1) === max + BigInt(2))
object对象类型
● object表示非原始类型
let create = (obj:object):object => obj
let o1 = create({})
let o2 = create([])
let o3 = create(function() {})
总结
● never 是最新的类型
● 字面类型可以赋予给字面量的联合类型
● 字面量类型可以赋予给基础类型
● 基础类型是包装类型的子类型
● any unknwon 是最大类型
// ever < 字面量 < 字面量联合类型 | 字面量类型 < 原始类型 < 包装类型 < 0bject < any| unknown
type R1 = never extends '123' ? true : false;          // true
type R2 = '123' extends '123' | 'abc' ? true : false;  // true;
type R3 = '123' extends string ? true : false;         // true
type R4 = string extends String ? true : false;        // true
type R5 = String extends Object ? true : false;        // true
type R6 = Object extends any ? true : false;           // true
# 03 类型推导
类型推导(Type Derivation)
● 声明变量没有赋予值时默认变量是 any 类型
let name // 类型为any
name = 'ts'
name = 10
● 声明变量赋值时则以赋值类型为准
let age = 18 // age 被推导为数字类型
age = 30
// age = '123' // Type 'string' is not assignable to type 'number'
包装对象(Wrapper Object)
● 我们在使用基本数据类型时，调用基本数据类型上的方法，默认会将原始数据类型包装成对象类型
● boolean是基本数据类型 , Boolean是他的封装类
let bool1:boolean = true
let bool2:boolean = Boolean(1)
let bool3:Boolean = new Boolean(3)
联合类型(Union Type)
● 在使用联合类型时，没有赋值只能访问联合类型中共有的方法和属性
let u: string | number // 联合类型 
console.log(u!.toString()) // 公共方法
u = 10
console.log(u!.toFixed(2)) // number方
u = 'ts'
console.log(u!.toLowerCase()) // 字符串方法
● 这里的!表示此值非空
let ele: HTMLElement | null = document.getElementById('#app');
ele!.style.color = 'red'; // 断定ele元素一定有值
● 可辨识联合类型
type man = {
  wealthy: true;
  waste: string;
} | {
  wealthy: false;
  norality: string;
}
// 可以用联合类型做属性之间的互斥（可辨识联合类型）
const richMan: man = {
  wealthy: true,
  waste: '购物和消费'
} 

const poorMan: man = {
  wealthy: false,
  norality: '不消费'
}
类型断言(Type Asserts)
● 类型断言
// 尽量使用第一种类型断言因为在react中第二种方式会被认为是jsx语法
let a: string | number
(a! as number).toFixed(2)
((<number>a!).toFixed(2))
● 双重断言
// 尽量不要使用双重断言，会破坏原有类型关系，断言为any是因为any类型可以被赋值给其他类型
let a: string | boolean
((a! as any) as string)
字面量类型(Literal Type)
● 可以用字面量当做类型，同时也表明只能采用这几个值（限定值）。类似枚举。
type t = 'Up' | 'Down' | 'Left' | 'Right'
let t1:t = 'Down'
// let t2:t = 'up' // Type '"up"' is not assignable to type 't'.
# 04 函数类型
函数的两种声明方式
● 过function关键字来进行声明
● 可以用来限制函数的参数和返回值类型
function sum(a:string, b:string): string {
  return a + b
}
sum('a', 'b')
● 通过表达式方式声明
type Add = (a:string, b:string) => string
let add:Add = (a:string, b:string):string  => {
  return a + b
}
add('a', 'b')
可选参数
● 可选参数必须在其他参数的最后面
let minus = (a:number, b?:number):number => {
  return a - b
}
minus(10, 5)
默认参数
let getName = (first:string, last:string = 'li'): string => {
  return `${last} ${first}`
}
getName('si')
剩余参数
const max = (...args: number[]):number => {
  return Math.max(...args)
} 
let m = max(1, 2, 3, 4, 5)
console.log(m)
函数的重载
● 根据传入不同类型的数据 返回不同的结果
function toArray(value:number):number[]
function toArray(value:string):string[]
function toArray(value:number | string) {
  if(typeof value === 'string') {
    return value.split('')
  } else {
    return value.toString().split('').map(item => Number(item))
  }
}
const o1 = toArray(123)
const o2 = toArray('123')
console.log(o1)
console.log(o2)
# 05 类
TS中定义类
● 实例上的属性需要先声明在使用，构造函数中的参数可以使用可选参数和剩余参数
class Pointer {  
	x!: number
  y!: number
  constructor(x:number, y?:number, ...args:number[]) {
    this.x = x
    this.y = y as number
  }
}
let p = new Pointer(100, 200)
console.log(p)
类中的修饰符
public
● public 修饰符（谁都可以访问到）
class Animal {
  public name!:string // 不写public默认也是公开的
  public age!:number
  constructor(name:string, age:number) {
    this.name = name
    this.age = age
  }
}
class Cat extends Animal {
  constructor(name:string, age:number) {
    super(name, age)
    console.log(this.name, this.age)
  }
}

let c = new Cat('tom', 18)
console.log(c.name, c.age) // 外层访问
● 我们可以通过参数属性来简化父类中的代码
class Animal {
  constructor(public name:string, public age:number) {
    this.name = name
    this.age = age
  }
}
protected
● protected修饰符 (自己和子类可以访问到)
class Animal {
  constructor(protected name:string, protected age:number) {
    this.name = name
    this.age = age
  }
}

class Cat extends Animal {
  constructor(name:string, age:number){
    super(name, age)
    console.log(this.name, this.age)
  }
}
let c = new Cat('tom', 18)
// console.log(c.name, c.age) // 无法访问
private
● private修饰符 （除了自己都访问不到）
class Animal {
  constructor(private name:string, private age:number) {
    this.name = name
    this.age = age
  }
}

class Cat extends Animal {
  constructor(name:string, age:number){
    super(name, age)
    console.log(this.name, this.age) // 无法访问
  }
}
let c = new Cat('tom', 18)
console.log(c.name, c.age) // 无法访问 
// 单例模式
class Single {
  private static instance: Single;
  private constructor() {}
  static getInstance() {
    if (!Single.instance) {
      Single.instance = new Single();
    }
    return Single.instance;
  }
}

const s1 = Single.getInstance();
const s2 = Single.getInstance();
readonly
● readonly修饰符 （仅读修饰符）
class Animal {
  constructor(public readonly name:string, public age:number) {
    this.name = name
    this.age = age
  }
  changeName(name:string) {
    this.name = name // 仅读属性只能在constructor中被赋值
  }
}

class Cat extends Animal {
  constructor(name:string, age:number){
    super(name, age)
    console.log(this.name, this.age)
  }
}
let c = new Cat('tom', 18)
console.log(c.name, c.age)
静态属性和方法
● 静态属性和静态方法是可以被子类所继承的
class Animal {
  static type = '哺乳动物' // 静态属性
  static getName() { // 静态方法
    return '动物类'
  }
  private _name:string = 'Tom'
  get name() { // 属性访问器
    return this._name
  }
  set name(name:string) {
    this._name = name
  }
}
let animal = new Animal()
console.log(Animal.type)
console.log(Animal.getName())
console.log(animal.name)
Super属性
class Animal {
  say(message: string) {
    console.log(message)
  }
  static getType() {
    return '动物'
  }
}

class Cat extends Animal {
  say() { // 原型方法中的super指代的是父类的原型
    super.say('猫猫叫')
  }
  static getType() { // 静态方法中的super指代的是父类
    return super.getType()
  }
}
let c = new Cat()
console.log(Cat.getType())
console.log(c)
类的装饰器
● 装饰器是一种特殊的声明，它能够被附加到类声明、方法、属性或参数上，可以修改类的行为
● 常见的装饰器有类装饰器、属性装饰、方法装饰器和参数装饰器
● 装饰器的写法分为普通装饰器和装饰器工厂
装饰类
● 装饰类可以给类扩展功能,需要开启 experimentalDecorators:true 
function addSay(target:Function) {
	target.prototype.say = function() {
		console.log('say')
	}
}
@addSay
	class Person{
		say: Function
	}
let person = new Person
person.say()

// 装饰器工厂
function addSayFactory(name) {
	return addSay(target:Function) {
		target.prototype.say = function() {
			console.log(`say ${name}`)
		}
	}
}
@addSayFactory('hello')
	class Person{
		say: Function
	}
let person = new Person
person.say()

//还可以替换类,不过替换的类要与原类结构相同
function enhancer(constructor: Function) {
	return class {
		name: string = "jiagou";
		eat() {
			console.log("吃饭饭");
		}
	};
}
@enhancer
class Person {
	name!: string;
	eat!: Function;
	constructor() {}
}
let p: Person = new Person();
console.log(p.name);
p.eat();
装饰类中属性
● 装饰属性可以对属性的内容进行改写，装饰的是实例属性则 target 指向类的原型、装饰的是静态属性则 target 执行类本身~
/**
 * @param target 如果装饰的实例属性的话，target是构造函数的原型。
 */
function toUpperCase(target:any, key:string) {
  let value = target[key]
  const getter = () => value
  const setter = (newVal:string) => {value = newVal.toUpperCase()}
  if(delete target[key]) {
    Object.defineProperty(target, key, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true
    })
  }
}
/**
 * @param target 如果装饰的静态属性的话，target是构造函数。
 */
function double(target:any, key:string) {
  let value = target[key]
  Object.defineProperty(target, key, {
    get() {
      return value * 2
    },
    set(newValue) {
      value = newValue
    } 
  })
}

class Person {
  @toUpperCase
  name: string = 'TypeScript'
  @double
  static age:number = 10
  getName() {
    return this.name
  }
}
let person = new Person()
console.log(person.getName(), Person.age)
装饰类中方法
● 第一个参数对于静态成员来说是类的构造器，对于实例成员来说是类的原型对象
● 第二个参数是方法的名称
● 第三个参数是方法的描述符
function toUpperCase(target:any, key:string) {
  let value = target[key]
  Object.defineProperty(target, key, {
    get() {
      return value.toUpperCase()
    },
    set(newValue) {
      value = newValue
    }
  })
}
function double(target:any, key:string) {
  let value = target[key]
  Object.defineProperty(target, key, {
    get() {
      return value * 2
    },
    set(newValue) {
      value = newValue
    } 
  })
}
function noEnum(target:any, key:string, descriptor:PropertyDescriptor) {
  console.log(descriptor)
  descriptor.enumerable = false
}
function toNumber(target:any, key:string, descriptor:PropertyDescriptor) {
  const oldMethod = descriptor.value
  descriptor.value = function(...args: any[]) {
    const nums = args.map(item => parseFloat(item))
    return oldMethod(nums)
  }
}
class Person {
  @toUpperCase
  name: string = 'TypeScript'
  @double
  static age:number = 10
  @noEnum
  getName() {
    return this.name
  }
  @toNumber
  sum(...args: any[]) {
    return args.reduce((pre: number, value: numbre) => pre + value, 0)
  }
}
let person = new Person()
console.log(person) // getName 不可枚举

装饰属性访问器
// 装饰属性访问器
function toUpperCase(target:any, key:string, descriptor:PropertyDescriptor) {
  const originalSet = descriptor.set
  const originalGet = descriptor.get
  descriptor.set = function(val: string) {
    originalSet.call(this, val.toUpperCase())
  }
  descriptor.get = function() {
    return originalGet.call(this) + '!!!'
  }
}
class Person {
  private _name:string = ''

  get name() {
    return this._name
  }
  @toUpperCase
  set name(name:string) {
    this._name = name
  }
}
let person = new Person();
person.name = 'test';
console.log(person.name);
装饰参数
function toUpperCase(target:any, key:string) {
	let value = target[key]
	Object.defineProperty(target, key, {
		get() {
			return value.toUpperCase()
		},
		set(newValue) {
			value = newValue
		}
	})
}
function double(target:any, key:string) {
	let value = target[key]
	Object.defineProperty(target, key, {
		get() {
			return value * 2
		},
		set(newValue) {
			value = newValue
		} 
	})
}
function noEnum(target:any, key:string, descriptor:PropertyDescriptor) {
	descriptor.enumerable = false
}
function addPrefix(target:any, key:string, paramIndex:number) {
	console.log(target, key, paramIndex) // Person.prototype getName  0
}
class Person {
	@toUpperCase
	name: string = 'TypeScript'
	@double
	static age: number = 10;
	prefix!:string
	@noEnum
	getName(@addPrefix prefix:string) {
		return this.name;
	}
}

let person = new Person()
console.log(person.getName('test'))
装饰器的执行顺序
function Class1Decorator() {
  return function (target: any) {
      console.log("类1装饰器");
  }
}
function Class2Decorator() {
  return function (target: any) {
      console.log("类2装饰器");
  }
}
function MethodDecorator() {
  return function (target: any, methodName: string, descriptor: PropertyDescriptor) {
      console.log("方法装饰器");
  }
}
function Param1Decorator() {
  return function (target: any, methodName: string, paramIndex: number) {
      console.log("参数1装饰器");
  }
}
function Param2Decorator() {
  return function (target: any, methodName: string, paramIndex: number) {
      console.log("参数2装饰器");
  }
}
function PropertyDecorator(name: string) {
  return function (target: any, propertyName: string) {
      console.log(name + "属性装饰器");
  }
}

@Class1Decorator()
@Class2Decorator()
class Person {
  @PropertyDecorator('name')
  name: string = 'test';
  @PropertyDecorator('age')
  age: number = 10;
  @MethodDecorator()
  greet(@Param1Decorator() p1: string, @Param2Decorator() p2: string) { }
}

/**
name属性装饰器
age属性装饰器
参数2装饰器
参数1装饰器
方法装饰器
类2装饰器
类1装饰器
*/
● 执行顺序规律(一般是从内往外执行，先内后外)
  ○ 类装饰器是最后执行的，后写的类装饰器先执行
  ○ 方法和参数中的装饰器先执行参数装饰器，再执行方法装饰器
  ○ 属性装饰器，谁在前面先执行谁
抽象类
● 抽象类无法被实例化，只能被继承，抽象方法不能在抽象类中实现，只能在抽象类的具体子类中实现,而且必须实现。
● 定义类型时 void 表示函数的返回值为空（不关心返回值类型，所有在定义函数时也不关心函数返回值类型）
// 1.不能被new
// 2.抽象类中可以创建抽象属性和方法，让子类来实现，但是静态方法、属性不可以
// 3.抽象类中可以拥有具体的实现
abstract class Animal {
  constructor() {
    console.log("Animal");
  }
  abstract eat(): void; // 一般使用这种，一般描述的原型方法
  abstract sleep: () => void; // TS 中不做区分，但一般这种情况描述的是实例方法
  run() {
    console.log("run");
  }
}

class Dog extends Animal {
  public sleep = (): void => {
    console.log("dog sleep");
  };
  constructor() {
    super();
  }
  eat() {
    console.log("dog eat");
  }
  
}

const dog = new Dog();
console.dir(dog)
dog.eat();
dog.sleep();
dog.run();
反射元数据
基本用法
import 'reflect-metadata';
import "reflect-metadata/lite";

// 方式一
// class Animal {
//   static className = 'Animal'
//   eat() {}
// }

// Reflect.defineMetadata('Class', 'Animal Metadata', Animal);
// Reflect.defineMetadata('Class Property', 'Animal ClassName', Animal, 'className');
// Reflect.defineMetadata('Class Method', 'Animal Eat', Animal.prototype, 'eat');

// 方式二
@Reflect.metadata('Class', 'Animal Metadata')
class Animal {
  @Reflect.metadata('Class Property', 'Animal ClassName')
  static className = 'Animal'
  @Reflect.metadata('Class Method', 'Animal Eat')
  eat(): string {
    return '吃东西'
  }
}
console.log(Reflect.getMetadata('Class', Animal));
console.log(Reflect.getMetadata('Class Property', Animal, 'className'));
console.log(Reflect.getMetadata('Class Method', Animal.prototype, 'eat'));

// 开启tsconfig.json中的emitDecoratorMetadata
console.log(Reflect.getMetadata('design:type', Animal.prototype, 'eat'));
console.log(Reflect.getMetadata('design:paramtypes', Animal.prototype, 'eat'));
console.log(Reflect.getMetadata('design:returntype', Animal.prototype, 'eat'));

const animal = new Animal()
console.log(Reflect.getMetadata('design:type', animal, 'eat'));
console.log(Reflect.getMetadata('design:paramtypes', animal, 'eat'));
console.log(Reflect.getMetadata('design:returntype', animal, 'eat'));

console.dir(Animal);
案例
●  装饰器+ 反射元数据，可以做一些校验, 手机代码的逻辑后续统一处理。
const REQUIRED_METADATA_KEY = Symbol('required');
const VALIDATE_METADATA_KEY = Symbol('validate');
function Required() {
  return function(target: any, key: string) {
    //先记录那些属性是必填的,校验的时候来找这些属性是否有值
    //在记录的时候不要给属性添加，后续校验如果没有这个属性，那就找不到记录了
    const requiredKeys = Reflect.getMetadata(REQUIRED_METADATA_KEY, target) || [];
    Reflect.defineMetadata(REQUIRED_METADATA_KEY, [...requiredKeys, key], target);
  }
}

function validate(target: any) {
  const existsKeys: string[] = Object.keys(target);
  const requiredKeys: string[] = Reflect.getMetadata(REQUIRED_METADATA_KEY, target) || [];
  for (const key of requiredKeys) {
    const validateType = Reflect.getMetadata(VALIDATE_METADATA_KEY, target, key);
    // console.log('validateType' ,validateType, typeof target[key], target[key]);
    if(validateType) {
      if(typeof target[key] !== validateType) {
        throw new Error(`${key} is not ${validateType}`);
      }
    }
    if (!existsKeys.includes(key) && !target[key]) {
      throw new Error(`${key} is required`);
    }
  }
}

enum Types {
  String = 'string',
  Number = 'number'
}

function ValueType(type: Types) {
  return function(target: any, key: string) {
    // 记录属性的类型
    Reflect.defineMetadata(VALIDATE_METADATA_KEY, type, target, key);
  }
}

class Person {
  @ValueType(Types.String)
  @Required()
  name: string;
  @ValueType(Types.Number)
  @Required()
  age: number;
}

const p = new Person();
// @ts-expect-error
p.age = '10';
// p.name = 'TypeScript';

validate(p); // Uncaught Error: name is required
控制反转
● IoC: Inversion of Control
● IoC: 控制反转
● ioc 将所有的创建过程全部交给”容器“来做， 可以解决类之间的耦合问题
什么是控制正转， 控制权是交给自己的，自己来处理整个流程
什么是反转，我失去了控制权，全部在内部自己来做的
interface Monitor {}
interface Host {}

class Monitor27inch implements Monitor {}
class AppleHost implements Host {}

// 控制正转，Computer 依赖 Monitor 和 Host
class Computer {
  public monitor: Monitor = new Monitor27inch();
  public host: Host = new AppleHost();

  constructor() {
    console.log('Computer created !');
  }

  bootstrap() {
    console.log('Computer bootstrap !', this)
  }
}

const computer = new Computer();

computer.bootstrap(); 
interface Monitor {}
interface Host {}

class Monitor27inch implements Monitor {}
class AppleHost implements Host {}

// 反转控制，Computer 不再依赖 Monitor 和 Host
class Computer {
  public monitor: Monitor;
  public host: Host;

  constructor(monitor: Monitor, host: Host) {
    this.monitor = monitor;
    this.host = host;
    console.log('Computer created !');
  }

  bootstrap() {
    console.log('Computer bootstrap !', this)
  }
}

const monitor = new Monitor27inch();
const host = new AppleHost();
const computer = new Computer(monitor, host);

computer.bootstrap(); 
interface Monitor {}
interface Host {}

class Monitor27inch implements Monitor {}
class AppleHost implements Host {}
 
// 反转控制，Computer 不再依赖 Monitor 和 Host
// 控制反转将实例化的过程交给容器, 通过构造函数传入
class Computer {
  public monitor: Monitor;
  public host: Host;

  constructor(monitor: Monitor, host: Host) {
    this.monitor = monitor;
    this.host = host;
    console.log('Computer created !');
  }

  bootstrap() {
    console.log('Computer bootstrap !', this)
  }
}

class Container {
  private _map = new Map<string, any>();
  bind<T>(key: string, creator: () => T) {
    if(!this._map.has(key)) {
      this._map.set(key, creator());
    }
  }
  resolve(key: string) {
    if(this._map.has(key)) {
      return this._map.get(key);
    }
    throw new Error('unbound');
  }
}

const container = new Container();
container.bind<Monitor>('Monitor', () => new Monitor27inch());
container.bind<Host>('Host', () => new AppleHost());
container.bind<Computer>('Computer', () => new Computer(
  container.resolve('Monitor'),
  container.resolve('Host')
))
const computer = container.resolve('Computer');

computer.bootstrap();

export default {}
依赖注入
● DI: Dependency Injection
● DI: 依赖注入。
interface Monitor {}
interface Host {}

class Container {
  private _map = new Map<string, any>(); // 存放实例
  public _properties = new Map<string, any>(); // 存放属性
  bind<T>(key: string, creator: () => T) {
    if(!this._map.has(key)) {
      this._map.set(key, creator());
    }
  }
  resolve<T>(key: string): T {
    // 将记录的属性自动的注入到当前实例中
    const instance = this._map.get(key);
    this._properties.forEach((value, key) => {
      const [className, propertyKey] = key.split('-');
      if(className === instance.constructor.name) {
        // 找到对应的属性，注入到实例中
        instance[propertyKey] = this.resolve(value);
      }
    })
    return instance;
  }
}

const  container = new Container();
console.log(container);
function Provide(key: string) {
  return function(target: any) {
    container.bind(key, () => new target());
  }
}

function Inject(key: string) {
  return function(target: any, propertyKey: string) {
    // 绑定属性
    container._properties.set(`${target.constructor.name}-${propertyKey}`, key);
    // 关联就是哪个类，对应的哪个属性，用哪个标识找到实例来进行赋值
  }
}

// 提供到容器中，自动会创建实例在容器中
@Provide('Monitor')
class Monitor27inch implements Monitor {}
@Provide('Host')
class AppleHost implements Host {}

@Provide('Monitor32inch')
class Monitor32inch implements Monitor {}
@Provide('HpHost')
class HpHost implements Host {}

// DI 依赖注入，不需要在类中硬编码
@Provide('Computer')
class Computer {
  @Inject('Monitor')
  public monitor: Monitor27inch;
  @Inject('Host')
  public host: AppleHost;

  bootstrap() {
    console.log('Computer bootstrap !', this)
  }
}

const computer = container.resolve<Computer>('Computer'); 
computer.bootstrap();

@Provide('Computer2')
class Computer2 {
  @Inject('Monitor32inch')
  public monitor: Monitor32inch;
  @Inject('HpHost')
  public host: HpHost;
  bootstrap() {
    console.log('Computer2 bootstrap !', this)
  }
}

const computer2 = container.resolve<Computer2>('Computer2');
computer2.bootstrap();
综合案例
import 'reflect-metadata';

// 案例
function Controller(prefix: string = '') {
  return function (target: any) {
    Reflect.defineMetadata('prefix', `/${prefix}`, target)
  }
}

function MethodCreator(method: string) {
  return function(path: string) {
    return function (target: any, key: string, descriptor: PropertyDescriptor) {
      Reflect.defineMetadata('method', method, descriptor.value)
      Reflect.defineMetadata('route', `/${path}`, descriptor.value)
    }
  } 
}


const Post = MethodCreator('post'); 
const Get = MethodCreator('get');
const Put = MethodCreator('put');
const Delete = MethodCreator('delete');
@Controller('article')
class ArticleController {
  @Get('list')
  getArticleList() {
    console.log('获取文章列表')
  }
  @Get('detail')
  getArticleDetail() {
    console.log('获取文章详情')
  }
  @Post('add')
  addArticle() {
    console.log('添加文章')
  }
  @Put('update')
  updateArticle() {
    console.log('更新文章')
  }
  @Delete('delete')
  deleteArticle() {
    console.log('删除文章')
  }
}

const articleController = new ArticleController();

type MethodType = 'get' | 'post' | 'put' | 'delete';
interface  IRoute {
  path: string;
  method: MethodType;
  handler: () => void;
}
function createRoutes(target: any) {
  const routes: IRoute[] = [];
  const prefix = Reflect.getMetadata('prefix', target.constructor)
  const properties = Reflect.getPrototypeOf(target);
  const keys = Reflect.ownKeys(properties).filter(key => key !== 'constructor');
  keys.forEach(key => {
    const handler = properties[key];
    const methods = Reflect.getMetadata('method', properties[key])
    const path = Reflect.getMetadata('route', properties[key])
    routes.push({
      path: prefix + path,
      method: methods,
      handler
    })
  })
  return routes;
}

const routes = createRoutes(articleController);
// console.log(routes)
routes.forEach(route => {
  route.handler();
})
# 06 接口
接口可以在面向对象编程中表示行为的抽象，也可以描述对象的形状。 接口的作用就是为这些类型命名和为你的代码或第三方代码定义契约。 (接口中不能含有具体的实现逻辑)
type 和 interface的区别
1.如果只是用来描述结构我们采用interface
2.如果涉及到联合类型，则只能使用type来进行声明
3.type 不能被扩展， interface 是可以扩展
4.type 不能重名， interface 重名可以合并
5.type 在后续的学习中可以使用循环和条件， interface 不行
其他情况下无所谓，可以互换(函数类型一般采用type来声明)

函数接口参数
● 我们可以约束函数中的参数，但是类型无法复用
const fullName = ({ firstName, lastName}: {firstName: string, lastName:string}): string => {
  return firstName + lastName
}
console.log(fullName({firstName: 'li', lastName: 'si'}))
● 我们可以通过接口进行描述
interface IFullName {
  firstName:string
  lastName:string
}
const fullName = ({ firstName, lastName}: IFullName): string => {
  return firstName + lastName
}
console.log(fullName({firstName: 'li', lastName: 'si'}))
函数类型接口
● 通过接口限制函数的参数类型和返回值类型
interface IFillName {
  firstName:string
  lastName:string
}
interface IFn {
  (obj: IFillName):string
}
const fullName:IFn = ({firstName, lastName}) => {
  return firstName + lastName
}
console.log(fullName({firstName: 'li', lastName: 'si'}))

函数混合类型
interface ICounter {
  ():number // 限制函数类型
  count: 0 // 限制函数上的属性
}
let fn:any = () => {
  fn.count++
  return fn.count
}
fn.count = 0
let counter:ICounter = fn
console.log(counter())
console.log(counter())
对象接口
● 对象接口可以用来描述对象的形状结构
● ? 标识的属性为可选属性, readOnly 标识的属性则不能修改。多个同名的接口会自动合并
interface IVegetables {
  readonly color:string
  size:string
}
interface IVegetables {
  age?:number
  taste: 'sour' | 'sweet'
}
const tomato:IVegetables = {
  color: 'red',
  size: '10',
  taste: 'sour'
}
console.log(tomato)
// tomato.color = 'green' // 仅读属性不能进行修改 
● 多余的属性可以使用类型断言
interface IVegetables {
  readonly color:string
  size:string
}
interface IVegetables {
  age?:number
  taste: 'sour' | 'sweet'
}
const potato:IVegetables = {
  color: 'yellow',
  size: '50',
  taste: 'sweet',
  type: '蔬菜'
} as IVegetables
console.log(potato)
任意属性、可索引接口
● 任意属性可以对某一部分必填属性做限制，其余的可以随意增减
// 1.索引访问符
interface IPerson {
  name: string,
  [key:string]:any
}
let p: IPerson = {
  name: 'ts',
  age: 18,
  city: 'shanghai'
}

// 通过索引访问符，可以取值的类型
type PersonNameType = IPerson["name"];
type PersonAnyType = IPerson[string];

// keyof 取一个对象中key的集合
type KeyOf = keyof IPerson; // string | number

const name: PersonNameType = '123' // 此处name类型必须为string
const other: PersonAnyType = '123';
const v1: KeyOf = '123';
const v2: KeyOf = 123;

// 2.keyof
type AnimalKeys = keyof Animal; // keyof Animal & {};
class Animal {
  constructor(public name: string, public age: number) {}
  valueOf(k: AnimalKeys) {
    return this[k];
  }
}

const animal = new Animal('dog', 1);
console.log(animal.valueOf('name'));
console.log(animal.valueOf('age'));
// console.log(animal.valueOf('area')); // 报错

// 3.valueOf(自己实现)取值的类型集合
interface ICar {
  name: symbol;
  isNew: true;
  age: 10;
  color: 'red';
}
// 通过索引操作获取值的集合
type valueOf = ICar[keyof ICar]; // symbol | true | 10 | 'red'
const color: valueOf = 'red';
● 可索引接口可以用于标识数组
interface IArr {
  [key:number]: any
}
let a:IArr = {
  0: '1',
  1: '2',
  2: '3'
}
let arr:IArr = [1, 'd', 'c']
console.log(a)
console.log(arr)
类接口
● 这里先来强调一下抽象类和接口的区别,抽象类中可以包含具体方法实现。接口中不能包含实现
● 一个类可以实现多个接口，在类中必须实现接口中的方法和属性
interface ISpeakable {
  name:string
  speak():void
}
interface IChineseSpeakable {
  speakChinese():void
}
class Speak implements ISpeakable, IChineseSpeakable {
  name: string
  speak() {}
  speakChinese() {}
}
const s = new Speak
console.log(s)
接口继承
interface ISpeakable {
  speak():void
}
interface ISpeakChinese extends ISpeakable {
  speakChinese():void
}
class Speak implements ISpeakChinese {
  speakChinese():void {
    console.log("Method is speakChinese.")
  }
  speak():void {
    console.log("Method is speak.")
  }
}

const s = new Speak
s.speak()
s.speakChinese()
console.log(s)
构造函数类型
● 这里无法标识返回值类型
interface IClass {
  new (name:string):any
}
function createClass(target:IClass, name:string) {
  return new target(name) // 传入的是一个构造函数
}
class Animal {
  constructor(public name:string) {
    this.name = name
  }
}
let r = createClass(Animal, 'tom')
console.log(r)
● new()  表示当前是一个构造函数类型,这里捎带使用了下泛型。 在使用createClass时动态传入类型。
interface IClass<T> {
  new (name:string):T
}
function createClass<T>(target:IClass<T>, name:string):T {
  return new target(name) // 传入的是一个构造函数
}
class Animal {
  constructor(public name:string) {
    this.name = name
  }
}
let r = createClass(Animal, 'tom')
console.log(r)
抽象类 vs 接口
● 不同类之间公有的属性或方法，可以抽象成一个接口（Interfaces）
● 而抽象类是供其他类继承的基类，抽象类不允许被实例化。抽象类中的抽象方法必须在子类中被实现
● 抽象类本质是一个无法被实例化的类，其中能够实现方法和初始化属性，而接口仅能够用于描述,既不提供方法的实现，也不为属性进行初始化
● 一个类可以继承一个类或抽象类，但可以实现（implements）多个接口
● 抽象类也可以实现接口
abstract class Animal{
  name:string;
  constructor(name:string){
    this.name = name;
  }
  abstract speak():void;
}
interface Flying{
  fly():void
}
class Duck extends Animal implements Flying{
  speak(){
    console.log('汪汪汪');
  }
  fly(){
    console.log('我会飞');
  }
}
let duck = new Duck('zhufeng');
duck.speak();
duck.fly();

# 07 泛型
● 泛型( Generics )是指在定义函数、接口或类的时候，不预先指定具体的类型，而在使用的时候再指定类型的一种特性。
● 泛型( Generics ) T  作用域只限于函数内部使用
指定函数参数类型
● 单个泛型
const getArray = <T>(times:number, val:T):T[] => {
  let result:T[] = []
  for (let i = 0; i < times; i++) {
    result.push(val)
  }
  return result
}
console.log(getArray<number>(3, 3))
console.log(getArray<string>(3, '3'))
console.log(getArray<boolean>(3, true))
● 多个泛型
function swap<T, K>(tuple: [T, K]):[K, T] {
  return [tuple[1], tuple[0]]
}
console.log(swap<string, string>(['a','b']))
函数标注的方式
● 类型别名
  ○ 可以使用类型别名，但是类型别名不能被继承和实现。一般联合类型可以使用类型别名来声明
type TArray = <T, K>(tuple: [T, K]) => [K, T]
const getArray: TArray = <T, K>(tuple: [T, K]): [K, T] => {
  return [tuple[1], tuple[0]]
}
console.log(getArray(['a','b']))
● 接口
  ○ 能使用 interface 尽量使用 interface 
interface IArray {
  <T, K>(tuple: [T, K]):[K, T]
}
const getArray: IArray = <T, K>(tuple: [T, K]): [K, T] => {
  return [tuple[1], tuple[0]]
}
console.log(getArray(['a','b']))
泛型接口使用
// 这里的T是使用接口的时候传入
interface ISum<T> {
  (a:T, b:T):T
}
let sum:ISum<number> = (a:number, b:number):number => {
  return (a + b) 
} 
console.log(sum(1, 2))



interface ISum {
  // 这里的U是调用函数的时候传入
  <T>(a:T, b:T):T
}
let sum:ISum = <T>(a:T, b:T): T => {
  return (a + b) as any
} 
console.log(sum<number>(1, 2))



// 这里的T是使用接口的时候传入
interface ISum<T> {
  // 这里的U是调用函数的时候传入
  <U>(a:T, b:T):U
}
let sum:ISum<number> = <U>(a:number, b:number):U => {
  return (a + b) as any
} 
console.log(sum<number>(1, 2))
默认泛型
● 可以指定泛型的默认类型，方便使用
interface T2<T=string> {
  name: T
}
type T22 = T2
let n: T22 = {
  name: 'ts'
}
console.log(n)
类中的泛型
● 创建实例时提供类型

class MyArray<T> {
  arr: T[] = []
  add(num:T) {
    this.arr.push(num)
  }
  getMaxNum():T {
    let arr = this.arr
    let max = arr[0]
   for (let i = 0; i < arr.length; i++) {
     const current = arr[i]
     current > max ? max = current : null
   }
    return max
  }
}
let myArr = new MyArray<number>()
myArr.add(3)
myArr.add(1)
myArr.add(2)
console.log(myArr.getMaxNum())
● 校验构造函数类型
function create<T>(clazz: {new(): T; }): T {
    return new clazz();
}
class Animal {
    numLegs: number;
}
createClass<Animal>(Animal)


// 
const createClass = <T>(clazz: new(name:string, age:number)=> T, name:string, age:number):T => {
  return new clazz(name, age)
}
class Person {
  constructor(public name:string, public age:number) {}
}
createClass<Person>(Person, 'e', 2)
泛型约束
● 泛型必须包含某些属性
interface IWithLength {
  length:number
}
function getLen<T extends IWithLength>(val:T){
  return val.length
}
console.log(getLen('hello'))
const add = <T extends number>(a: T, b: T): T => {
  return (a + b) as T
}
let r = add<number>(1, 2)
console.log(r)
● 返回泛型中指定属性
const getVal = <T,K extends keyof T>(obj:T,key:K) : T[K]=>{
  return obj[key];
}
const o = {
  name: 'ts',
  age: 18
}
const v = getVal(o, 'name')
console.log(v)
● 通过泛型坑位占位置

interface IUser {
  id: number;
  name: string;
  age?: number;
  avatar: string;
  // [propName: string]: any;
}

interface ILoginData {
  token: string;
  user: IUser;
  roles: number[];
}

interface IResponse<T> {
  code: number;
  data: T;
  message: string;
}

function login(): IResponse<ILoginData> {
  return {
    code: 200,
    data: {
      token: '1234567890',
      user: {
        id: 1,
        name: 'admin',
        avatar: 'https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif'
      },
      roles: [1, 2, 3]
    },
    message: 'success'
  }
}

const res = login();
console.log(res);

function getUsers(): IResponse<IUser[]> {
  return {
    code: 200,
    data: [
      {
        id: 1,
        name: 'admin',
        avatar: 'https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif'
      },
      {
        id: 2,
        name: 'admin',
        avatar: 'https://wpimg.wallstcn.com/f778738c-e4f8'
      }
    ],
    message: 'success'
  }
}
const res2 = getUsers();
console.log(res2);

type IMap<T> = {
  [P in keyof T]: T[P]
}

type T = IMap<IUser> 
const t: T = {
  id: 1,
  name: 'test',
  age: 11,
  avatar: '1123'
  // ff: 111
}
console.log(t);
compose
import compose from '.'
// zero functions
console.log(compose()<string>('test'))

// one functions
interface F {
  (a: string): string
}
let f:F = (a:string):string => a + 'f'
console.log(compose<F>(f)('test'))

// two functions
type A = string
type R = string
type T = string[]
let f1 = (a: A):R => a + 'f1' 
let f2 = (...a: T):A => a + 'f2' 
console.log(compose<A, T, R>(f1, f2)('test'))
泛型类型别名
● 泛型类型别名可以表达更复杂的类型。
type Cart<T> = {list:T[]} | T[]
let c1: Cart<string> = {list: '1'}
let c2: Cart<number> = [1]
泛型接口VS泛型类型别名
● 接口创建了一个新的名字，它可以在其他任意地方被调用，而类型别名并不创建新的名字，例如报错信息就不会使用别名
● 类型别名不能被 extends 和 implements ，这时我们应该尽量使用接口代理类型别名
● 当我们需要使用联合类型或者元组类型的时候，类型别名会更适合
// 泛型写在类型前面就是表示使用类型的时候传参，写的函数的前面表示调用函数的时候传递参数
type ICallback<T> = (item: T, index: number) => void;
type IForEach = <T>(arr: T[], cb: ICallback<T>) => void;
const forEach: IForEach = (arr, cb) => {
  for (let i = 0; i < arr.length; i++) {
    cb(arr[i], i);
  }
}

forEach([1, 2, 3], (item, index) => {
  console.log(item, index);
})

forEach(['a', 'b', 'c'], (item, index) => {
  console.log(item, index);
})
# 08 兼容性
TS中的兼容性，主要看结构是否兼容。（核心是考虑安全性）
基本数据类型的兼容性
● 你要的我有就可以
let temp: string | number
let num!: number
temp = num
let num: {
  toString(): string
}
let str:string = 'ts'
num = str // 字符串中具备toString()方法，所以可以进行兼容
接口兼容性
● 接口的兼容性，只要满足接口中所需要的类型即可！
interface IAnimal {
  name: string
  age: number
}
interface IPerson {
  name: string,
  age: number,
  address: string
}
let animal:IAnimal
let person:IPerson = {
  name: 'ts',
  age: 18,
  address: 'sh'
}
animal = person
console.log(animal)
函数的兼容性
● 函数的兼容性主要是比较参数和返回值
  ○ 参数
let sum1 = (a:string, b:string) => a + b
let sum2 = (a:string) => a
sum1 = sum2
赋值函数的参数要少于等于被赋值的函数，与对象相反,例如:
type Func<T> = (item:T, index:number) => void
function forEach<T>(arr:T[], cb:Func<T>) {
  for (let i = 0; i < arr.length; i++) {
    cb(arr[i], i)
  }
}

forEach([1, 2, 3], item => {
  console.log(item)
})
  ○ 返回值
type sum1 = () => string | number
type sum2 = () => string
let fn1:sum1
let fn2:sum2
fn1 = fn2
函数的逆变与协变
● 函数的参数是逆变的，返回值是协变的 （在非严格模式下函数的参数是双向协变的）
● 通过这个案例可以说明，函数参数可以接收父类，返回值可以返回子类
class Parent {
  address:string = 'sh'
}
class Child extends Parent {
  money:number = 100
}
class Grandson extends Child {
  name:string = 'jim'
}
type Callback = (person:Child) => Child
function execCallback(cb:Callback) {}
let fn = (person:Parent) => new Grandson
execCallback(fn)
/ TypeScript 协变和逆变简明总结

// 基础类型定义
class Animal { name: string = ''; }
class Dog extends Animal { breed: string = ''; }

// ========== 协变 (Covariance) ==========
// 子类型关系保持相同方向

// 1. 数组协变
let dogs: Dog[] = [new Dog()];
let animals: Animal[] = dogs; // ✅ Dog[] → Animal[]

// 2. 函数返回类型协变
type AnimalFactory = () => Animal;
type DogFactory = () => Dog;
let animalFactory: AnimalFactory = (() => new Dog()) as DogFactory; // ✅

// ========== 逆变 (Contravariance) ==========
// 子类型关系方向相反

// 函数参数逆变
type AnimalHandler = (animal: Animal) => void;
type DogHandler = (dog: Dog) => void;
let dogHandler: DogHandler = ((animal: Animal) => {}) as AnimalHandler; // ✅

// ========== 关键理解 ==========

// 协变为什么安全？
// - 数组协变：Dog[] 可以当作 Animal[] 使用，因为所有 Dog 都是 Animal
// - 返回类型协变：返回 Dog 的函数可以当作返回 Animal 的函数，因为 Dog 是 Animal

// 逆变为什么安全？
// - 参数逆变：接受 Animal 的函数可以当作接受 Dog 的函数
// - 因为 AnimalHandler 能处理任何 Animal，当然也能处理 Dog（Animal 的子集）

// ========== 实际应用场景 ==========

// 1. 事件处理（逆变）
interface Event<T> { target: T; }
type GenericHandler<T> = (event: Event<T>) => void;
type ButtonHandler = (event: Event<HTMLButtonElement>) => void;

// GenericHandler<HTMLElement> 可以赋值给 ButtonHandler
// 因为能处理 HTMLElement 的函数一定能处理 HTMLButtonElement

// 2. 数据转换（协变）
type StringParser = () => string;
type NumberParser = () => number;

// NumberParser 不能赋值给 StringParser（除非 number 是 string 的子类型）
// 但 StringParser 可以赋值给更宽泛的类型

console.log('协变和逆变总结完成');
类的兼容性
● 这里要注意的是，只要有 private 或者 protected 关键字类型就会不一致;但是继承的类可以兼容
class Student {
  name:string = 'ts'
  age:number = 18
}
class Employee {
  name:string = 'js'
  age:number = 30
}
let p:Student = new Employee()
console.log(p)
class Student {
  protected name:string = 'ts'
  age:number = 18
}
class Employee extends Student {}
let s:Student = new Employee()
console.log(s)
泛型的兼容性
● 泛型再判断兼容性的时候会先判断具体的类型，然后再进行兼容性判断
interface IT<T>{}
let obj1:IT<string>
let obj2:IT<number>
obj1 = obj2
枚举的兼容性
● 不同的枚举类型不兼容
// 数字和枚举是兼容的
enum Colors {
  Red,
  Yellow
}
let c:Colors
c = Colors.Red
c = 1

// 不同的枚举类型不兼容
enum MANAGER {
  ROLE = 1
}
let color:Colors
let manager:MANAGER
color = manager // 错误语法
标称类型
● 在其他语言中存在标称类型(根据名称来区分类型)，通过交叉类型实现标称类型
ype Nominal<T, K extends string> = T & {__tag: K};
type BTC = Nominal<number, 'BTC'>;
type USD = Nominal<number, 'USD'>;
let btc: BTC = 10 as BTC;
let usd: USD = 20 as USD;

function getValue(val: BTC) {
  return val;
}

getValue(btc);
# 09 类型保护
通过判断识别所执行的代码块，自动识别变量属性和方法。
typeof类型保护
function double(val:number | string) {
  if(typeof val === 'number') {
    return val * 2
  } else {
    return parseFloat(val) * 2
  }
}
console.log(double(2))
console.log(double('2'))
instanceof类型保护
class Cat {}
class Dog {}
const getInstance = (clazz: { new(): Cat|Dog}) => {
  return new clazz()
}
let r = getInstance(Cat)
if(r instanceof Cat) {
  console.log(r)
} else {
  console.log(r)
}
in类型保护
interface Fish {
  swimming:string
}
interface Bird {
  fly:string
  leg:number
}
function getType(animal: Fish | Bird) {
  if('swimming' in animal) {
    console.log('fish', animal)
  } else {
    console.log('bird', animal)
  }
}
可辨识联合类型
interface WarningButton {
  type: 'warning'
}
interface DangerButton {
  type: 'danger'
}

function createButton(button: WarningButton | DangerButton) {
  if(button.type == 'warning') {
    console.log('warning')
  } else {
    console.log('danger')
  }
}
null保护
● 这里要注意的是 ts 无法检测内部函数变量类型
const addPrefix = (num?:number) => {
  num = num || 1.1
  function prefix(fix:string) {
    return fix + num?.toFixed()
  }
  return prefix('ts')
}
console.log(addPrefix())
自定义类型保护
interface Fish {
  swimming: string
}
interface Bird {
  fly: string
  leg: number
}
function isBird(animal: Fish | Bird):animal is Bird {
  return 'swimming' in animal
}
function getAnimal (animal:Fish | Bird){
  if(isBird(animal)){
      console.log('bird')
  }else{
    console.log('fish')
  }
}
完整性保护
interface ICircle {
  kind: 'circle'
  r: number
}
interface IRant {
  kind: 'rant'
  width: number
  height: number
}
interface ISquare {
  kind: 'square'
  width: number
}
type Area = ICircle | IRant | ISquare
const isAssertion = (obj: never) => {}
const getArea = (obj: Area) => {
  switch (obj.kind) {
      case 'circle':
          return 3.14 * obj.r ** 2
      default:
          return isAssertion(obj); // 必须实现所有逻辑
  }
}
# 10 类型推断
赋值推断
● 赋值时推断，类型从右像左流动,会根据赋值推断出变量类型
let str = 'ts'
let age = 11
let b = true
console.log(typeof str)
console.log(typeof age)
console.log(typeof b)

返回值推断
● 自动推断函数返回值类型
function sum (a:string, b:string) {
  return a + b
}
sum('a', 'b')
函数推断
● 函数从左到右进行推断
type Add = (a:number, b:number) => number
const add:Add = (a, b) => a + b
console.log(add(1, 2))
属性推断
● 可以通过属性值,推断出属性的类型
let person = {
  name: 'ts',
  age: 18
}
let { name, age } = person
console.log(typeof name)
console.log(typeof age)
类型反推
● 可以使用typeof关键字反推变量类型
let animal = {
  leg: 4,
  size: '10'
}
type Animal = typeof animal

索引访问操作符
interface IPerson {
  name:string
  age:number
  job: {
    address:string
  }
}
type job = IPerson['job']
类型映射
interface IPerson {
  name:string,
  age:number
}
type MapPerson = {[key in keyof IPerson]:IPerson[key]}
# 11 类型变换
typeof
● 可以获取一个变量的类型
//先定义类型，再定义变量
type People = {
  name:string,
  age:number,
  gender:string
}
let p1:People = {
  name:'zhufeng',
  age:10,
  gender:'male'
}
//先定义变量，再定义类型
let p1 = {
  name:'zhufeng',
  age:10,
  gender:'male'
}
type People = typeof p1;
function getName(p:People):string{
  return p.name;
}
getName(p1);
索引访问操作符
● 可以通过[]获取一个类型的子类型
interface Person{
  name:string;
  age:number;
  job:{
    name:string
  };
  interests:{name:string,level:number}[]
}
let FrontEndJob:Person['job'] = {
  name:'前端工程师'
}
let interestLevel:Person['interests'][0]['level'] = 2;
keyof
● 索引类型查询操作符
interface Person{
  name:string;
  age:number;
  gender:'male'|'female';
}
//type PersonKey = 'name'|'age'|'gender';
type PersonKey = keyof Person;

function getValueByKey(p:Person,key:PersonKey){
  return p[key];
}
let val = getValueByKey({name:'zhufeng',age:10,gender:'male'},'name');
console.log(val);
映射类型
● 在定义的时候用in操作符去批量定义类型中的属性
interface Person{
  name:string;
  age:number;
  gender:'male'|'female';
}
//批量把一个接口中的属性都变成可选的
type PartPerson = {
  [Key in keyof Person]?:Person[Key]
}

let p1:PartPerson={};
//也可以使用泛型
type Part<T> = {
  [key in keyof T]?:T[key]
}
let p2:Part<Person>={};
● 通过key的数组获取值的数组
function pick<T, K extends keyof T>(o: T, names: K[]): T[K][] {
  return names.map((n) => o[n]);
}
let user = { id: 1, name: 'zhufeng' };
type User = typeof user;
const res = pick<User, keyof User>(user, ["id", "name"]);
console.log(res);


# 12 交叉类型
概述
● 交叉类型(Intersection Types)是将多个类型合并为一个类型
  ○ 举例：我们提供两拨人，一拨人都很帅、另一拨人很高。我们希望找到他们的交叉部分 => 又高又帅的人
interface Person1 {
  handsome: string
}
interface Person2 {
  high: string
}
type P1P2 = Person1 & Person2
let p:P1P2 = {
  handsome: 'ts',
  high: '1'
}
交叉类型
function mixin<T, K>(a:T, b:K): T&K {
  return {
    ...a,
    ...b
  }
}
const x = mixin({ name: 'ts' }, { age: 11 })
console.log(x)

interface IPerson1 {
  name:string,
  age:number
}

interface IPerson2 {
  name:number
  age:number
}
type person = IPerson1 & IPerson2
let name!:never
let person:person = {name,age:11};  // 两个属性之间 string & number的值为never
console.log(person)
# 13 条件类型
条件类型基本使用
● 可以使用extends关键字和三元表达式，实现条件判断
interface Fish {
  name1: string
}
interface Water {
  name2: string
}
interface Bird {
  name3: string
}
interface Sky {
  name4: string
}
// 若 T 能够赋值给 Fish，那么类型是 Water,否则为 Sky
type Condition<T> = T extends Fish ? Water : Sky
let c:Condition<Fish> = { name2: 'water' }
console.log(c)
type ResStatusMessage<T extends number> = T extends 200 | 204 | 206 ? 'success' : 'error';

interface IResponse<T extends number> {
  code: T extends 200 | 204 | 206 ? number : string;
  data: T extends 200 ? any : null;
  message: ResStatusMessage<T>;
}

const res: IResponse<200> = {
  data: [],
  code: 200,
  message: 'success'
}
type Condition<T, U> = T extends U ? true : false;
type A = Condition<'string', number>; // false
type B = Condition<'string', string>; // true
type ForamtReturnValue<T> = T extends number ? string : number; 
function sum<T extends string | number>  (a: T, b: T): ForamtReturnValue<T> {
  // 泛型不能做数学运算
  return a + (b as any);
}

sum(1, 2);
条件类型分发
// 1.A类型是通过泛型传入的
// 2.A类型如果是联合类型会进行分发
// 3.泛型参数A 必须是完全裸露的，才具备分发的能力
// 4.只要A不是裸类型就会丧失分发能力

interface Fish {
    fish: string
}
interface Water {
    water: string
}
interface Bird {
    bird: string
}
interface Sky {
    sky: string
}

// 此情况并没有产生分发
// type Condition<T> = Fish | Bird extends Fish ? Water : Sky;

//naked type
type Condition<T> = T extends Fish ? Water : Sky;

type R1 = Condition<Fish>; // Water
type R2 = Condition<Bird>; // Sky
type R3 = Condition<Fish | Bird>; // Water | Sky, 将联合类型中的每一项单独的进行比较

//(Fish extends Fish ? Water : Sky) | (Bird extends Fish ? Water : Sky)
// Water|Sky
let condition1: Condition<Fish | Bird> = { water: '水' };
let condition2: Condition<Fish | Bird> = { sky: '天空' };
● 条件类型有一个特性,就是「分布式有条件类型」,但是分布式有条件类型是有前提的,条件类型里待检查的类型必须是naked type parameter
//none naked type
//type Condition<T> = [T] extends [Fish] ? Water : Sky;
● 默认情况下有些时候我们需要关闭这种分发能力，会造成判断不准确
// 默认情况下 有些时候我们需要关闭这种分发能力，会造成判断不准确
type Condition<T, U> = T extends U ? true : false;
type R1 = Condition<1 | 2, 1 | 2 | 3>; // true | true => true
type R2 = Condition<1 | 2, 1>; // true | false => boolean, 这里结果就不正确了
● 禁用分发
// 禁用分发
// 通过添加一个 & {} 来禁用分发
type NoDistribute<T> = T & {}; // 只是为了让这个T 产生一个类型而已
type Condition3<T, U> = NoDistribute<T> extends U ? true : false;
type R5 = Condition3<1 | 2, 1>; // false
// 通过添加一个 [] 来禁用分发
type Condition4<T, U> = [T] extends [U] ? true : false;
type R6 = Condition4<1 | 2, 1>; // false
● 条件判断还有一些注意事项
// 条件判断还有一些注意事项
// 我们在进行类型父子关系的比较时，默认情况下都应该关闭分发
type isNever<T> = T extends never ? true : false;
type R7 = isNever<never>; // never, never直接比较的时候无法返回正确的结果, 可以通过添加一个[]来解决
● 找出T类型中U不包含的部分
//never会被自动过滤
type Diff<T, U> = T extends U ? never : T;
type R = Diff<"a" | "b" | "c" | "d", "a" | "c" | "f">;  // "b" | "d"
● 找出T类型中U包含的部分
type Filter<T, U> = T extends U ? T : never;
type R1 = Filter<string | number | boolean, number>;
内置条件类型
● TS 在内置了一些常用的条件类型，可以在 lib.es5.d.ts 中查看：
● http://www.typescriptlang.org/docs/handbook/utility-types.html
Exclude
● Exclude排除类型，从 T 可分配给的类型中排除 U
type MyExclude = Exclude<'1' | '2' | '3', '1' | '2'>; // 3
const r: MyExclude = '3';

// 实现
type Exclude<T, U> = T extends U ? never: T
// T extends U ? never: T, 意思是T在U中的不要，不再U中的保留
Extract
● Extract抽取类型，从 T 可分配的类型中提取 U
type MyExtract = Extract<'1' | '2' | '3', '1' | '2'>; // 1 | 2
const r: MyExclude = '1';

// 实现
type Extract<T, U> = T extends U ? T : never;
NonNullable
● NoNullable 非空检测，从 T 中排除 null 和 undefined
type MyNone = NonNullable<'a' | null | undefined>
const r: MyExclude = 'a';

// 实现
type NonNullable<T> = T extends null | undefined ? never : T; // 老版
type NonNullable<T> = T & {}; // 新版
infer 类型推断
● infer最早出现在此 PR 中，表示在 extends 条件语句中待推断的类型变量
● infer 可以在条件类型中提取类型的某一个部分，在使用的时候想获取什么类型就将他写在什么“地方”加一个变量可以自动的来推导
● 类型推导都是基于位置的
ReturnType
● ReturnType返回值类型
function getUserInfo() {
	return { name: "zhufeng", age: 10 };
}

// 通过 ReturnType 将 getUserInfo 的返回值类型赋给了 UserInfo
type UserInfo = ReturnType<typeof getUserInfo>;

const userA: UserInfo = {
	name: "zhufeng",
	age: 10
};

// 实现
// 型约束的目的是限制泛型传入的，后面的条件是逻辑
// 使用infer 需要先创造一个条件才可以
type ReturnType<T extends (...args: any[]) => any> = T extends (...args: any[]) => infer R ? R : never;
Parameters
● Parameters 参数类型
● Constructs a tuple type of the types of the parameters of a function type T
● Parameters
function getUser (a:number, b:number) {
  return { name: 'ts', age: 18 }
}

type MyParams = Parameters<typeof getUser>

// 实现
type Parameters<T extends (...args: any[]) => any> = T extends (...args: infer R) => any ? R : never;
ConstructorParameters
● ConstructorParameters构造函数参数类型
class Person {
  constructor(name:string, age:string) {}
}
type MyConstructor = ConstructorParameters<typeof Person>;

// 实现
type ConstructorParameters<T extends new(...args: any[]) => any> = T extends {
  new(...args: infer R): any
} ? R : never;
InstanceType
● InstanceType 实例类型
● 获取构造函数类型的实例类型
● InstanceType
class Person {
  constructor(name:string, age:string) {}
}
type MyInstance = InstanceType<typeof Person>;

// 实现
type InstanceType<T extends new(...args: any[]) => any> = T extends new(...args: any) => infer R  ? R : any;
infer实践
● 两数交换
// 两数交换
type Swap<T> = T extends [infer A, infer B] ? [B , A] : never;
type R8 = Swap<[string, number]>;
const swap: (a: string, b: number) => R8 = (a: string, b: number) => {
  return [b, a]
}
console.log(swap('1', 2)); // [2, '1']
● 头尾交换
// 头尾交换
type First<T extends any[]> = T extends [infer F, ...infer M, infer L] ? [L, ...M, F] : never;
type R9 = First<[1, 2, 3, 4, 5]>;
● 通过infer来实现递归推导 
// 通过infer来实现递归推导
type PromiseReturnValue<T> = T extends Promise<infer P> ? PromiseReturnValue<P> : T;
type R10 = PromiseReturnValue<Promise<Promise<Promise<100>>>>
● 将数组类型转化为联合类型
type ElementOf<T> = T extends Array<infer E> ? E : never
type TupleToUnion = ElementOf<[string, number, boolean]>
● 将两个函数的参数转化为交叉类型
type T1 = { name: string }
type T2 = { age: number }
type ToIntersection<T> = T extends ([(x: infer U) => any, (x: infer U) => any]) ? U : never
type t3 = ToIntersection<[(x:T1)=>any,(x:T2)=>any]>

表示要把T1、T2赋予给x，那么x的值就是T1、T2的交集。（参数是逆变的可以传父类）
TS的类型：TS主要是为了代码的安全性来考虑。所以所有的兼容性问题都要从安全性来考虑!
应用
function createInstance<T extends new(...args: any[]) => any>(
  ctor: T,
  ...args: ConstructorParameters<T>
): InstanceType<T> {
  return new ctor(...args);
}

class Person2 {
  // 名字，年龄，性别
  constructor(public name: string, public age: number, gender: 'man' | 'women') {};
}

const person = createInstance(Person2, 'ts', 18, 'man');
# 14 内置类型

Partial转化可选属性
● 遍历所有的属性将属性设置为可选属性,但是无法实现深度转化!
interface Company {
  num: number
}
interface Person {
  name: string
  age: number
  company: Company
}
// 实现原理
// type Partial<T> = {
//   [K in keyof T]?: T[K]
// }
type PartialPerson = Partial<Person>
let p:PartialPerson = {
  name: 'ts'
}
console.log(p)
● 我们可以实现深度转化,如果值是对象继续深度转化
interface Company {
  num: number
}
interface Person {
  name: string
  age: number
  company: Company
}
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]>:T[K]
}
type DeepPartialPerson = DeepPartial<Person>
let dp:DeepPartialPerson = {
  name: 'ts',
  company: {} // 可以省略company中的属性
}
console.log(dp)
Required转化必填属性
● 将所有的属性转化成必填属性
interface Company {
  num: number
}
interface Person {
  name: string
  age: number
  company: Company
}
// 实现原理
// type Required<T> = {
//   [K in keyof T]-?: T[K]
// }
type RequiredPerson = Required<Person>
let r:RequiredPerson = {
  name: 'ts',
  age: 18,
  company: {
    num: 10
  }
}
console.log(r)
Readonly转化仅读属性
● 将所有属性变为仅读状态
interface Company {
  num: number
}
interface Person {
  name: string
  age: number
  company: Company
}
// 实现原理
// type Readonly<T> = {
//   readonly [K in keyof T]: T[K]
// }

type ReadonlyPerson = Readonly<Person>
let o:ReadonlyPerson = {
  name: 'ts',
  age: 18,
  company: {
    num: 10
  }
}
// o.name = 'ts2' // Cannot assign to 'name' because it is a read-only property.
console.log(o)

type Mutate<T> = {
  -readonly [K in keyof T] : T[K]
}

let o2: Mutate<ReadonlyPerson> = {
  name: 'ts',
  age: 18,
  company: {
    num: 10
  }
}
o2.name = 'ts2'
console.log(o2)
Pick挑选所需的属性
● 在已有类型中挑选所需属性
interface Company {
  num: number
}
interface Person {
  name: string
  age: number
  company: Company
}
// 实现原理
// type Pick<T, U extends keyof T> = {
//   [P in U]: T[P]
// }
type PickPerson = Pick<Person, 'age' | 'name'>
let k:PickPerson = {
  name: 'ts',
  age: 18
}
console.log(k)
Record记录类型
● 实现map方法，我们经常用record类型表示映射类型
interface Company {
  num: number
}
interface Person {
  name: string
  age: number
  company: Company
}
// 实现原理
// type Record<K extends keyof any, T> = {
//   [P in K]: T
// }
type RecordPerson = Record<string, string | number> 
let c:RecordPerson = {
  name: 'ts',
  age: 18,
  // company: {} // Type '{}' is not assignable to type 'string | number'.
}
console.log(c)
function map<T extends keyof any, K, U>(obj: Record<T, K>, callback: (item: K, key: T) => U) {
  let result = {} as Record<T, U>
  for (let key in obj) {
      result[key] = callback(obj[key], key)
  }
  return result
}
const m = map({ name: 'ts', age: 11 }, (item, key) => {
  return item
})
console.log(m)
Omit忽略属性
● 忽略person中的address属性 (先排除掉不需要的key，在通过key选出需要的属性)
let person = {
  name: 'ts',
  age: 18,
  address: 'sh'
}
// 实现原理
type Omit<T, K> = Pick<T, Exclude<keyof T, K>>
type OmitAddress = Omit<typeof person, 'address'>
let om:OmitAddress = {
  name: 'ts',
  age: 18
}
console.log(om)
应用
// 应用
type MixinReturn<T, U> = Omit<T, keyof U> & U;
function mixin<T extends Record<string, any>, U extends Record<string, any>>(a: T, b: U): MixinReturn<T, U> {
  return {...a, ...b};
}
const obj = mixin({name: 'ts', age: 18, a: 1}, { name: 11, age: 20, b: 2});
// 通过这种创建一个新对象的方式更直观的看结果
type ComputeType<T> = {
  [K in keyof T]: T[K]
} 
type objType = ComputeType<typeof obj>;
type nameType = (typeof obj)['name']; // number
console.log('mixin', obj);
# 15 自定义类型
● utility-types
Proxy
type Proxy<T> = {
  get(): T;
  set(value: T): void;
}
type Proxify<T> = {
  [P in keyof T]: Proxy<T[P]>
}
function proxify<T>(obj: T): Proxify<T> {
  let result = {} as Proxify<T>;
  for (const key in obj) {
    result[key] = {
      get: () => obj[key],
      set: (value) => obj[key] = value
    }
  }
  return result;
}
let props = {
  name: 'zhufeng',
  age: 10
}
let proxyProps = proxify(props);
console.log(proxyProps);

function unProxify<T>(t: Proxify<T>): T {
  let result = {} as T;
  for (const k in t) {
    result[k] = t[k].get();
  }
  return result;
}

let originProps = unProxify(proxyProps);
console.log(originProps);
SetDifference
● SetDifference (same as Exclude)
/**
 * SetDifference (same as Exclude)
 * @desc Set difference of given union types `A` and `B`
 * @example
 *   // Expect: "1"
 *   SetDifference<'1' | '2' | '3', '2' | '3' | '4'>;
 *
 *   // Expect: string | number
 *   SetDifference<string | number | (() => void), Function>;
 */
export type SetDifference<A, B> = A extends B ? never : A;
Omit
● Exclude 的作用是从 T 中排除出可分配给 U的元素.
● Omit<T, K>的作用是忽略T中的某些属性
● Omit = Exclude + Pick
/**
 * Omit (complements Pick)
 * @desc From `T` remove a set of properties by key `K`
 * @example
 *   type Props = { name: string; age: number; visible: boolean };
 *
 *   // Expect: { name: string; visible: boolean; }
 *   type Props = Omit<Props, 'age'>;
 */
export type Omit<T, K extends keyof any> = Pick<T, SetDifference<keyof T, K>>;
Diff实现
● 求两个对象不同的部分
let person1 = {
   name: 'ts',
   age: 11,
   address: 'sh'
 }
 let person2 = {
   address: 'bj'
 }
 type Diff<T extends object, K extends object> = Omit<T, keyof K>
 type DiffPerson = Diff<typeof person1, typeof person2>
 let p:DiffPerson = {
   name: 'ts',
   age: 18
 }
 console.log(p)
InterSection交集
let person1 = {
   name: 'ts',
   age: 11,
   address: 'sh'
 }
 let person2 = {
   address: 'bj'
 }
type InterSection<T extends object, K extends object> = Pick<T, Extract<keyof T, keyof K>>
type InterSectionPerson = InterSection<typeof person1, typeof person2>
let p:InterSectionPerson = {
  address: 'sh'
}
console.log(p)
Overwrite属性覆盖
● 如果存在已有属性则使用新属性类型进行覆盖操作
● Overwrite<T, U>顾名思义,是用U的属性覆盖T的相同属性.
● mapped-types
type OldProps = {
  name:string,
  age:number,
  visible:boolean
}
type NewProps = {
  age:string,
  other:string
}
type Diff<T extends object, K extends object> = Omit<T, keyof K>
type InterSection<T extends object, K extends object> = Pick<T, Extract<keyof T, keyof K>>
// Diff<T, K> ==> {name: string, visible:boolean}
// InterSection<K, T> ==> {age:string}
type Overwrite<T extends object, K extends object, I = Diff<T, K> & InterSection<K, T>> = Pick<I,keyof I>
type ReplaceProps = Overwrite<OldProps, NewProps>
let r:ReplaceProps = {
  name: 'ts',
  age: '10',
  visible: true
}
console.log(r)
Merge对象合并
● 将两个对象类型进行合并操作
● Merge<O1, O2>的作用是将两个对象的属性合并:
● Merge<O1, O2> = Compute + Omit<U, T>
type OldProps = {
  name:string,
  age:number,
  visible:boolean
}
type NewProps = {
  age:string,
  other:string
}
type Compute<A extends any> = { [K in keyof A]: A[K] }
type Merge<T, K> = Compute<Omit<T, keyof K> & K>
type MergeObj = Merge<OldProps,NewProps>
let m:MergeObj = {
  name: 'ts',
  age: '11',
  visible: true,
  other: 'other'
}
console.log(m)
Mutable
● 将 T 的所有属性的 readonly 移除
type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}
面试题综合实战
● infer 关键字就是声明一个类型变量,当类型系统给足条件的时候类型就会被推断出来
● typescript_zh
● codesandbox
interface Action<T> {
	payload?: T;
	type: string;
}

class EffectModule {
	count = 1;
	message = "hello!";

	delay(input: Promise<number>): Promise<Action<string>> {
		let action: Promise<Action<string>> =  input.then(i => ({
			payload: `hello ${i}!`,
			type: 'delay'
		}));
		return action;
	}

	setMessage(action: Action<Date>): Action<number> {
		let action2: Action<number> = {
			payload: action.payload!.getMilliseconds(),
			type: "set-message"
		};
		return action2;
	}
}
//把 EffectModule 中的方法名取出来
type methodsPick<T> = { [K in keyof T]: T[K] extends Function ? K : never }[keyof T];
//定义转换前后的方法
type asyncMethod<T, U> = (input: Promise<T>) => Promise<Action<U>> // 转换前
type asyncMethodConnect<T, U> = (input: T) => Action<U> // 转换后
type syncMethod<T, U> = (action: Action<T>) => Action<U> // 转换前
type syncMethodConnect<T, U> = (action: T) => Action<U> // 转换后
//条件类型+推断类型
type EffectModuleMethodsConnect<T> = T extends asyncMethod<infer U, infer V>
	? asyncMethodConnect<U, V>
	: T extends syncMethod<infer U, infer V>
	? syncMethodConnect<U, V>
	: never
type EffectModuleMethods = methodsPick<EffectModule>
//映射类型
type Connect = (module: EffectModule) => {
	[M in EffectModuleMethods]: EffectModuleMethodsConnect<EffectModule[M]>
} 
type Connected = {
	delay(input: number): Action<string>;
	setMessage(action: Date): Action<number>;
};
const connect: Connect = (m: EffectModule): Connected => ({
	delay: (input: number) => ({
		type: 'delay',
		payload: `hello 2`
	}),
	setMessage: (input: Date) => ({
		type: "set-message",
		payload: input.getMilliseconds()
	})
});

export const connected: Connected = connect(new EffectModule());
参考https://github.com/piotrwitek/utility-types
# 16 unknown
unknown
● TypeScript 3.0 引入了新的unknown 类型，它是 any 类型对应的安全类型
● unknown 和 any 的主要区别是 unknown 类型会更加严格：在对 unknown 类型的值执行大多数操作之前，我们必须进行某种形式的检查。而在对 any 类型的值执行操作之前，我们不必进行任何检查
any 类型
● 在 TypeScript 中，任何类型都可以被归为 any 类型。这让 any 类型成为了类型系统的 顶级类型 (也被称作 全局超级类型)。
● TypeScript允许我们对 any 类型的值执行任何操作，而无需事先执行任何形式的检查
let value: any;

value = true;             // OK
value = 42;               // OK
value = "Hello World";    // OK
value = [];               // OK
value = {};               // OK
value = Math.random;      // OK
value = null;             // OK
value = undefined;        // OK


let value: any;
value.foo.bar;  // OK
value.trim();   // OK
value();        // OK
new value();    // OK
unknown 类型 
● unknown类型，任何类型都可以赋值为unknown类型。 它是 any 类型对应的安全类型
● 不能访问unknown类型上的属性，不能作为函数、类来使用
let value: unknown;

value = true;             // OK
value = 42;               // OK
value = "Hello World";    // OK
value = [];               // OK
value = {};               // OK
value = Math.random;      // OK
value = null;             // OK
value = undefined;        // OK
value = new TypeError();  // OK
● unknown类型只能被赋值给any类型和unknown类型本身
let value: unknown;
let value1: unknown = value;   // OK
let value2: any = value;       // OK
let value3: boolean = value;   // Error
let value4: number = value;    // Error
let value5: string = value;    // Error
let value6: object = value;    // Error
let value7: any[] = value;     // Error
let value8: Function = value;  // Error
缩小 unknown 类型范围
● 如果没有类型断言或类型细化时，不能在unknown上面进行任何操作
● typeof
● instanceof
● 自定义类型保护函数
● 可以对 unknown 类型使用类型断言
const value: unknown = "Hello World";
const someString: string = value as string;
联合类型中的unknown
● 在联合类型中，unknown 类型会吸收任何类型。这就意味着如果任一组成类型是 unknown，联合类型也会相当于 unknown
type UnionType1 = unknown | null;       // unknown
type UnionType2 = unknown | undefined;  // unknown
type UnionType3 = unknown | string;     // unknown
type UnionType4 = unknown | number[];   // unknown
交叉类型中的unknown
● 在交叉类型中，任何类型都可以吸收 unknown 类型。这意味着将任何类型与 unknown 相交不会改变结果类型
type IntersectionType1 = unknown & null;       // null
type IntersectionType2 = unknown & undefined;  // undefined
type IntersectionType3 = unknown & string;     // string
type IntersectionType4 = unknown & number[];   // number[]
type IntersectionType5 = unknown & any;        // any
never是unknown的子类型
type isNever = never extends unknown ? true : false
keyof unknown 是never
type key = keyof unknown
unknown类型不能被遍历
type IMap<T> = {
  [P in keyof T]:number
}
type t = IMap<unknown>
unknown类型不能和number类型进行 +运算,可以用于等或不等操作
只能对unknown进行等或不等操作，不能进行其它操作
un1===un2;
un1!==un2;
un1 += un2;
不能做任何操作
● 不能访问属性
● 不能作为函数调用
● 不能当作类的构造函数不能创建实例
un.name
un();
new un();
映射属性
● 如果映射类型遍历的时候是unknown,不会映射属性
type getType<T> = {
  [P in keyof T]:number
}
type t = getType<unknown>;
# 17 模板字符串类型
基本使用
// 1.以将多个字符串类型进行组装
type name = 'ts'
type age = 18
type person = `${name} is ${age}`;

const p: person = 'ts is 18';
基本分发
// 2.模板字符串也是具备分发能力
type Direction = 'top' | 'bottom' | 'left' | 'right';
type AllMargin = `margin-${Direction}`;
type AllPadding = `padding-${Direction}`;

type IR = '1.0' | '2.0' | '3.0';
type IL = 10 | 20 | 30;
type AllSize = `${IR}-${IL}`;
范型分发
// 3.范型
// 放到字符串内的东西 需要约束，必须得能转化成字符串
type SayHello<T extends string | number | bigint | boolean> = `hello ${T}`;
// type SayHello<T> = `hello ${T & string}`; // 有的时候可以偷懒，直接采用此方案来解析 
type TS = SayHello<'ts'>;
type NUM = SayHello<10>;
// 以上都是字面量类型
// 下面是基本类型
type Str = SayHello<string>;

type IFag = TS extends Str ? true : false; // 所有的基本类型都是字面量类型的父类型
对象属性重命名
// 3.将对象的属性重命名
type Animal = {
  name: string;
  age: number;
  height: number;

}
type Rename<T> = {
  [K in keyof T as `r_${K & string}`]: T[K]
}
type RenameAnimal = Rename<Animal>;

内置类型
// 4.字符串支持的工具类型
class Circle {
  public area = `Area is ${Math.PI * 2}`
  public perimeter = `Perimeter is ${Math.PI * 2}`
}

type WithGetter<T> = {
  [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K]
}

type Compute<T> = {
  [K in keyof T]: T[K]
}
type CircleGetter = Compute<WithGetter<Circle>>;

const circle = new Circle();

const circleGetter: CircleGetter = {
  getArea: () => circle.area,
  getPerimeter: () => circle.perimeter
}
console.log(circleGetter.getArea())
console.log(circleGetter.getPerimeter())


模式匹配符
// 根据模式匹配符来取类型
// infer 可以进行位置推断T，还可以推断数组|元组 |string
type GetFirstName<T> = T extends `${infer F} ${infer L}` ? F : never;
type FirstName = GetFirstName<'zhang san'>;
参考
● https://ts.nodejs.cn/docs/handbook/2/template-literal-types.html
# 18 装包和拆包
装包
type Proxy<T> = {
  get():T,
  set(value:T):void
}
type Proxify<T> = {
  [P in keyof T]: Proxy<T[P]>
} 
let props = {
  name: 'zhufeng',
  age: 11
}
function proxify<T>(obj:T):Proxify<T>{
  let result = {} as Proxify<T>
  for(let key in obj){
      let value = obj[key]
      // result[key] = {
      //     get(){
      //         return value
      //     },
      //     set:(newValue)=>value = newValue
      // }
      Object.defineProperty(result, key, {
        get() {
          return value
        },
        set(newValue) {
          value = newValue
        }
      })
  }
  return result
}
let proxpProps = proxify(props)
console.log(proxpProps)
拆包
function unProxify<T>(proxpProps:Proxify<T>):T{
  let result = {} as T;
  for(let key in proxpProps){
      let value = proxpProps[key];
      result[key] = value.get()
  }
  return result
}
let proxy = unProxify(proxpProps)
console.log(proxy)
# 19 模块和命名空间
● 默认情况下 ,我们编写的代码处于全局命名空间中
● namespace-and-module
模块
全局模块
● 默认情况下，当你开始在一个新的TypeScript文件中写下代码时，他处于全局命名空间中
● 使用全局变量空间是危险的，因为它会与文件内部的代码命名冲突。我们推荐使用下文将要学到的文件模块。
const foo = 123;
const bar = foo; // allowed
文件模块
● 文件模块也称为外部模块。
● 如果在你的 TypeScript 文件的根级别位置含有 import 或者 export，那么它会在这个文件中创建一个本地的作用域 。
● 模块是TS中外部模块的简称，侧重于代码和复用。
● 模块在其自身的作用域里执行，而不是在全局作用域里。
● 一个模块里的变量、函数、类等在外部是不可见的，除非你把它导出。
● 如果想要使用一个模块里导出的变量，则需要导入。
// a.ts导出
export const a = 1;
export const b = 2;
export default 'TS';
// index.ts导入
import name, {a, b} from './a'
模块规范
● AMD：不要使用它，它仅在浏览器上使用。
● CMD：
● SystemJS：这是一个好的实验，已被ES模块代替。
● ES模块：
● commonjs：commonjs 选项来替代这些模式，将会是一个好的主意。
命名空间
● 命名空间可以用于组织代码，避免文件内命名冲突，可以将相似的类、函数、接口放置到命名空间内。
● 命名空间可以将代码包裹起来，只对外暴漏需要在外部访问的对象，命名空间内通过export向外导出。
● 命名空间是内部模块，主要用于组织代码，避免命名冲突。
内部划分
● 命名空间的使用
export namespace zoo {
    export class Dog { eat() { console.log('zoo dog'); } }
}
export namespace home {
    export class Dog { eat() { console.log('home dog'); } }
}
let dog_of_zoo = new zoo.Dog();
dog_of_zoo.eat();
let dog_of_home = new home.Dog();
dog_of_home.eat();
import { zoo } from './3';
let dog_of_zoo = new zoo.Dog();
dog_of_zoo.eat();
● 命名空间嵌套使用
export namespace zoo {
    export class Dog { eat() { console.log('zoo dog'); } }
    export namespace bear{
        export const name = '熊'
    } 
}
console.log(zoo.bear.name);

命名空间中导出的变量可以通过命名空间使用。
原理
● 其实命名空间本质上是一个对象，它的作用是将一系列相关的全局变量组织到一个对象的属性。
namespace Numbers {
  export let a = 1
  export let b = 2
  export let c = 3
}
var Numbers;
(function(Numbers) {
  Numbers.a = 1
  Numbers.b = 2
  Numbers.c = 3
})(Numbers || (Numbers = {}))
文件、模块与命名空间
文件和模块
● 每个module都不一样

export module Box {
  export class Book1{}
}
export module Box {
  export class Book1{}
}
export module Box {
  export class Book1{}
}
空间
● namespace 和 module 不一样，namespace 在全局空间中具有唯一性
namespace  Box{
  export class Book1{}
}
namespace  Box{
  export class Book1{}
}
namespace  Box{
  export class Book1{}
}
import './1'
import './2'
import './3'

new Box.Book1()
new Box.Book2()
new Box.Book3()
文件
● 每个文件是独立的
export class Book1 { }
export class Book1 { }
export class Book1 { }
# 20 类型声明
● 声明文件可以让我们不需要将JS重构为TS，只需要加上声明文件就可以使用系统
● 类型声明在编译的时候都会被删除，不会影响真正的代码
● 关键字 declare 表示声明的意思,我们可以用它来做出各种声明:
declare var 声明全局变量
declare function 声明全局方法
declare class 声明全局类
declare enum 声明全局枚举类型
declare namespace 声明(含有子属性的)全局对象
interface 和 type 声明全局类型
普通类型声明
declare let name: string;  //变量
declare let age: number;  //变量
declare function getName(): string;  //方法
declare class Animal { name: string }  //类
console.log(name, age);
getName();
new Animal();
export default {};
● 声明jQuery对象
declare const $: (selector: string) => { //变量
  click(): void;
  width(length: number): void;
};
$('#root').click();
console.log($('#root').width);
外部枚举
● 外部枚举是使用declare enum定义的枚举类型
● 外部枚举用来描述已经存在的枚举类型的形状
declare enum Seasons {
  Spring,
  Summer,
  Autumn,
  Winter
}

let seasons = [
  Seasons.Spring,
  Seasons.Summer,
  Seasons.Autumn,
  Seasons.Winter
];
● declare 定义的类型只会用于编译时的检查，编译结果中会被删除。上例的编译结果如下
var seasons = [
  Seasons.Spring,
  Seasons.Summer,
  Seasons.Autumn,
  Seasons.Winter
];
● 也可以同时使用declare 和 const
declare const enum Seasons {
  Spring,
  Summer,
  Autumn,
  Winter
}

let seasons = [
  Seasons.Spring,
  Seasons.Summer,
  Seasons.Autumn,
  Seasons.Winter
];
● 编译结果
var seasons = [
  0 /* Spring */,
  1 /* Summer */,
  2 /* Autumn */,
  3 /* Winter */
];
module
● mitt
declare module "mitt" {
  type EventType = string | symbol;
  type EventHandler = (payload?: any) => void;
  const on: (type: EventType, handler: EventHandler) => this;
  const emit: (type: EventType, payload?: any) => this;
  const off: (type: EventType, handler: EventHandler) => this;
}
import mitt from 'mitt';

mitt.on('test', (data) => {});
mitt.emit('test', 'test');
mitt.off('test', (data) => {});
● jpg
declare module "*.jpg" {
  const value: string;
  export default value;
}
import jpg from 'a.jpg';
jpg.toString();
jpg.substring(1, 2);
namespace
● 如果一个全局变量包括了很多子属性，可能使用namespace
● 在声明文件中的namespace表示一个全局变量包含很多子属性
● 在命名空间内部不需要使用 declare 声明属性或方法
declare namespace ${
  function ajax(url:string,settings:any):void;
  let name:string;
  namespace fn {
    function extend(object:any):void;
  }
}
$.ajax('/api/users',{});
$.fn.extend({
  log:function(message:any){
    console.log(message);
  }
});
export {};
类型声明文件
● 我们可以把类型声明放在一个单独的类型声明文件中
● 可以在类型声明文件中使用类型声明
● 文件命名规范为*.d.ts
● 观看类型声明文件有助于了解库的使用方式
jquery.d.ts
● typings\jquery.d.ts
// 定义 jQuery 元素接口，支持泛型传递元素类型
interface JQuery<T extends Node = HTMLElement> {
  // DOM 操作方法
  addClass(className: string): this;
  removeClass(className?: string): this;
  toggleClass(className: string, state?: boolean): this;
  html(htmlString?: string): this;
  
  // 事件处理
  on(eventName: string, handler: (event: Event) => void): this;
  off(eventName?: string, handler?: (event: Event) => void): this;
  
  // 属性操作
  attr(attributeName: string): string | undefined;
  attr(attributeName: string, value: string): this;
  
  // 值操作（针对表单元素）
  val(): string;
  val(value: string): this;
  
  // DOM 遍历
  find(selector: string): JQuery<HTMLElement>;
  children(selector?: string): JQuery<HTMLElement>;
  
  // 链式调用支持
  [index: number]: T;
  length: number;
}

// AJAX 相关接口
interface JQueryAjaxSettings {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  success?: (data: any, textStatus: string, jqXHR: JQueryXHR) => void;
  error?: (jqXHR: JQueryXHR, textStatus: string, errorThrown: string) => void;
}

interface JQueryXHR extends XMLHttpRequest {
  responseJSON?: any;
}

// jQuery 静态方法接口
interface JQueryStatic {
  (selector: string, context?: Element | Document): JQuery<HTMLElement>;
  (element: Element): JQuery<HTMLElement>;
  (html: string): JQuery<HTMLElement>;
  (callback: () => void): JQuery<HTMLElement>;
  
  // AJAX 方法
  ajax(settings: JQueryAjaxSettings): JQueryXHR;
  
  // 工具方法
  extend<T, U>(target: T, source: U): T & U;
  each<T>(
    collection: T[] | JQuery<T>,
    callback: (index: number, element: T) => void | boolean
  ): void;
}

// 全局声明
declare const $: JQueryStatic;
declare const jQuery: JQueryStatic;

// 模块化支持（UMD），当前模块可以不导入直接使用(在不是作用域的文件中可以直接使用，umd模块)
export as namespace jQuery;
// 写成模块后，就不能直接用了，需需要导入后再用
// export = jQuery;
 tsconfig.json
● tsconfig.json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2015",  
    "outDir":"lib"
  },
  "include": [
    "src/**/*",
    "typings/**/*"
  ]
}
 test.js
● src\test.ts
// JQuery
$('#app').html('hello');
$.ajax({
  url: 'http://localhost:3000/api/users',
  method: 'GET',
  success: (res) => {
    console.log(res);
  }
})
第三方声明文件
● 可以安装使用第三方的声明文件
● @types是一个约定的前缀，所有的第三方声明的类型库都会带有这样的前缀
● JavaScript 中有很多内置对象，它们可以在 TypeScript 中被当做声明好了的类型
● 内置对象是指根据标准在全局作用域（Global）上存在的对象。这里的标准是指 ECMAScript 和其他环境（比如 DOM）的标准
● 这些内置对象的类型声明文件，就包含在TypeScript 核心库的类型声明文件中
使用jquery
cnpm i jquery -S
// 对于common.js风格的模块必须使用 import * as 
import * as jQuery from 'jquery';
jQuery.ajax('/user/1');
安装声明文件
cnpm i @types/jquery -S
自己编写声明文件
● 模块查找规则
● node_modules\@types\jquery/index.d.ts
● 我们可以自己编写声明文件并配置tsconfig.json
index.d.ts
● types\jquery\index.d.ts
declare function jQuery(selector:string):HTMLElement;
declare namespace jQuery{
  function ajax(url:string):void
}
export default jQuery;
tsconfig.json
● 如果配置了paths,那么在引入包的的时候会自动去paths目录里找类型声明文件
● 在 tsconfig.json 中，我们通过 compilerOptions 里的 paths 属性来配置路径映射
● paths是模块名到基于baseUrl的路径映射的列表
{
  "compilerOptions": {
    "baseUrl": "./",// 使用 paths 属性的话必须要指定 baseUrl 的值
    "paths": {
      "*":["types/*"]
    }
  }
import $ from "jquery";
$.ajax('get');
npm声明文件可能的位置
● node_modules/jquery/package.json
  ○ "types":"types/xxx.d.ts"
● node_modules/jquery/index.d.ts
● node_modules/@types/jquery/index.d.ts
● typings\jquery\index.d.ts
查找声明文件
● 如果是手动写的声明文件，那么需要满足以下条件之一，才能被正确的识别
● 给 package.json 中的 types 或 typings 字段指定一个类型声明文件地址
● 在项目根目录下，编写一个 index.d.ts 文件
● 针对入口文件（package.json 中的 main 字段指定的入口文件），编写一个同名不同后缀的 .d.ts 文件
{
    "name": "myLib",
    "version": "1.0.0",
    "main": "lib/index.js",
    "types": "myLib.d.ts",
}
● 先找myLib.d.ts
● 没有就再找index.d.ts
● 还没有再找lib/index.d.js
● 还找不到就认为没有类型声明了
查找规范
● node_modules/jquery/package.json 中的types字段
● node_modules/jquery/index.d.ts
● node_modules/@types/jquery/index.d.ts
扩展全局变量的类型
扩展局部变量类型
declare var String: StringConstructor;
interface StringConstructor {
  new(value?: any): String;
  (value?: any): string;
  readonly prototype: String;
}
interface String {
  toString(): string;
}
// 扩展类的原型
interface String {
  double():string;
}

String.prototype.double = function(){
  return this+'+'+this;
}
console.log('hello'.double());

//扩展类的实例
interface Window{
  myname:string
}
console.log(window.myname);
// export {} 没有导出就是全局扩展
模块内全局扩展
● types\global\index.d.ts
declare global{
  interface String {
    double():string;
  }
  interface Window{
    myname:string
  }
}

export  {}
合并声明
● 同一名称的两个独立声明会被合并成一个单一声明
● 合并后的声明拥有原先两个声明的特性
关键字	作为类型使用	作为值使用
class	yes	yes
enum	yes	yes
interface	yes	no
type	yes	no
function	no	yes
var,let,const	no	yes
● 类既可以作为类型使用，也可以作为值使用，接口只能作为类型使用
class Person{
  name:string=''
}
let p1:Person; // 作为类型使用
let p2 = new Person(); // 作为值使用

interface Animal{
  name:string
}
let a1:Animal;
let a2 = Animal; // 接口类型不能用作值
合并类型声明
● 可以通过接口合并的特性给一个第三方为扩展类型声明
interface Animal{
  name:string
}
let a1:Animal={name:'zhufeng',age:10};
console.log(a1.name);
console.log(a1.age);
// 注意不要加export {} ,这是全局的
types\animal\index.d.ts
interface Animal{
  age:number
}
使用命名空间扩展类
● 我们可以使用 namespace 来扩展类，用于表示内部类
class Form {
  username: Form.Item='';
  password: Form.Item='';
}
//Item为Form的内部类
namespace Form {
  export class Item {}
}
let item:Form.Item = new Form.Item();
console.log(item);
使用命名空间扩展函数
● 我们也可以使用 namespace 来扩展函数
function greeting(name: string): string {
  return greeting.words+name;
}

namespace greeting {
  export let words = "Hello,";
}

console.log(greeting('zhufeng'))
使用命名空间扩展枚举类型
enum Color {
  red = 1,
  yellow = 2,
  blue = 3
}

namespace Color {
  export const green=4;
  export const purple=5;
}
console.log(Color.green)
扩展Store
import { createStore, Store } from 'redux';
type StoreExt = Store & {
  ext: string
}
let store: StoreExt = createStore(state => state);
store.ext = 'hello';
生成声明文件
● 把TS编译成JS后丢失类型声明，我们可以在编译的时候自动生成一份JS文件
{
  "compilerOptions": {
     "declaration": true, /* Generates corresponding '.d.ts' file.*/
  }
}
类型声明实战
● events
npm link
npm link zf-events
index.js
import { EventEmitter } from "zf-events";
console.log(EventEmitter.defaultMaxListeners);
var e = new EventEmitter();
e.on('message', function (text:string) {
  console.log(text)
})
e.emit('message', 'hello');
index.d.ts
export type Listener = (...args: any[]) => void;
export type Type = string | symbol

export class EventEmitter {
  static defaultMaxListeners: number;
  emit(type: Type, ...args: any[]): boolean;
  addListener(type: Type, listener: Listener): this;
  on(type: Type, listener: Listener): this;
  once(type: Type, listener: Listener): this;
}


# 21 扩展全局变量类型
扩展局部变量
可以直接使用接口对已有类型进行扩展

interface String {
    double():string
}
String.prototype.double = function () {
    return this as string + this;
}
let str = 'zhufeng';

interface Window {
    mynane:string
}
console.log(window.mynane)

模块内全局扩展
declare global{
    interface String {
        double():string;
    }
    interface Window{
        myname:string
    }
}

声明全局表示对全局进行扩展

声明合并
同一名称的两个独立声明会被合并成一个单一声明，合并后的声明拥有原先两个声明的特性。
同名接口合并
interface Animal {
    name:string
}
interface Animal {
    age:number
}
let a:Animal = {name:'zf',age:10};

命名空间的合并
● 扩展类
class Form {}
namespace Form {
    export const type = 'form'
}

● 扩展方法
function getName(){}
namespace getName {
    export const type = 'form'
}

● 扩展枚举类型
enum Seasons {
    Spring = 'Spring',
    Summer = 'Summer'
}
namespace Seasons{
    export let Autum = 'Autum';
    export let Winter = 'Winter'
}

交叉类型合并
import { createStore, Store } from 'redux';
type StoreWithExt = Store & {
    ext:string
}
let store:StoreWithExt

生成声明文件
配置tsconfig.json 为true 生成声明文件

"declaration": true
面试题
● 题目
// 问题定义
// 假设有一个叫 EffectModule 的类

class EffectModule {}

// 这个对象上的方法只可能有两种类型签名:

interface Action<T> {
  payload?: T
  type: string
}

asyncMethod<T, U>(input: Promise<T>): Promise<Action<U>>

syncMethod<T, U>(action: Action<T>): Action<U>

// 这个对象上还可能有一些任意的非函数属性：

interface Action<T> {
  payload?: T;
  type: string;
}

class EffectModule {
  count = 1;
  message = "hello!";

  delay(input: Promise<number>) {
    return input.then(i => ({
      payload: `hello ${i}!`,
      type: 'delay'
    }));
  }

  setMessage(action: Action<Date>) {
    return {
      payload: action.payload!.getMilliseconds(),
      type: "set-message"
    };
  }
}

// 现在有一个叫 connect 的函数，它接受 EffectModule 实例，将它变成另一个对象，这个对象上只有EffectModule 的同名方法，但是方法的类型签名被改变了:

asyncMethod<T, U>(input: Promise<T>): Promise<Action<U>>  // 变成了
asyncMethod<T, U>(input: T): Action<U> 
syncMethod<T, U>(action: Action<T>): Action<U>  // 变成了
syncMethod<T, U>(action: T): Action<U>

// 例子:

// EffectModule 定义如下:

interface Action<T> {
  payload?: T;
  type: string;
}

class EffectModule {
  count = 1;
  message = "hello!";

  delay(input: Promise<number>) {
    return input.then(i => ({
      payload: `hello ${i}!`,
      type: 'delay'
    }));
  }

  setMessage(action: Action<Date>) {
    return {
      payload: action.payload!.getMilliseconds(),
      type: "set-message"
    };
  }
}
// connect 之后:

type Connected = {
  delay(input: number): Action<string>
  setMessage(action: Date): Action<number>
}
const effectModule = new EffectModule()
const connected: Connected = connect(effectModule)
// 要求
// 在 题目链接 里面的 index.ts 文件中，有一个 type Connect = (module: EffectModule) => any，将 any 替换成题目的解答，让编译能够顺利通过，并且 index.ts 中 connected 的类型与:

type Connected = {
  delay(input: number): Action<string>;
  setMessage(action: Date): Action<number>;
}
// 完全匹配。
● 答案
interface Action<T> {
  payload?: T;
  type: string;
}

class EffectModule {
  count = 1;
  message = "hello!";

  delay(input: Promise<number>) {
    return input.then(i => ({
      payload: `hello ${i}!`,
      type: 'delay'
    }));
  }

  setMessage(action: Action<Date>) {
    return {
      payload: action.payload!.getMilliseconds(),
      type: "set-message"
    };
  }
}

type FunName<T> = {
  [P in keyof T]: T[P] extends Function ? P : never
}[keyof T]

// 修改 Connect 的类型，让 connected 的类型变成预期的类型
type Connect = (module: EffectModule) => {
  [T in FunName<EffectModule>]: T extends 'delay'
    ? (input: number) => Action<string>
      : (action: Date) => Action<number>
};

const connect: Connect = m => ({
  delay: (input: number) => ({
    type: 'delay',
    payload: `hello 2`
  }),
  setMessage: (input: Date) => ({
    type: "set-message",
    payload: input.getMilliseconds()
  })
});

type Connected = {
  delay(input: number): Action<string>;
  setMessage(action: Date): Action<number>;
};

export const connected: Connected = connect(new EffectModule());
● 测试
import { connected } from "./index";

describe("connect specs:", () => {
  it("should connect async method", () => {
    const timeToDelay = 2;
    expect(connected.delay(timeToDelay).payload).toBe(`hello ${timeToDelay}`);
  });

  it("should connect sync method", () => {
    const date = new Date();
    expect(connected.setMessage(date).payload).toBe(date.getMilliseconds());
  });
});https://github.com/runningdoubi/LeetCode-OpenSource-hire-TS

# 22 tsconfig.json 详解
核心配置结构
{
  // 编译选项 (核心)
  "compilerOptions": { 
    /* 所有编译配置项 */
  },

  // 文件控制
  "include": ["**/*.ts"],     // 包含的文件 (glob 模式)
  "exclude": ["node_modules"],// 排除的文件 
  "files": ["app.ts"],        // 显式指定文件 (优先级最高)
  "references": [],           // 项目引用 (用于 monorepo)
  "extends": "./base.json"    // 继承其他配置
}
compilerOptions 完整解析
工程引用
配置项	值类型	默认值	说明
incremental	boolean	false	启用增量编译
composite	boolean	false	启用工程引用编译优化
tsBuildInfoFile	string	./.tsbuildinfo	增量编译信息文件路径
disableSourceOfProjectReferenceRedirect	boolean	false	符合项目的时候 引用选用的是源文件而不是声明文件
disableSolutionSearching	boolean	false	引用其他项目时是否检测引用的项目
disableReferencedProjectLoad	boolean	false	禁用引用项目加载
语言与平台
配置项	值类型	默认值	说明
target	ES3/
ES6/
ESNext等	ES5	打包后的一个语法支持，默认会引入对应的 ts 的类型声明文件，可以在 ib 中自己定义所需的声明文件
lib	string[]	自动选择	指定包含的库类型声明 (如 DOM、ES2022.Promise )
jsx	preserve
/react
/react-js等	-	控制 JSX 编译方式，为了区分 jsx 是否需要转化 ，以及如何转化
experimentalDecorators	boolean	false	启用装饰器语法支持
emitDecoratorMetadata	boolean	false	为装饰器生成元数据 (需与 experimentalDecorators 配合)，如 design:type...，通过 reflect-metadata 拿到对应的信息

jsxFactory	string	React.createElement	区分创建虚拟 dom 所用的方法 h()，React.createElement()
jsxFragmentFactory	string	React.Fragment	文档碎片采用的是 React.Fragment 还是 Fragment
jsxImportSource	string	react	自动导入模块的时候 解析的路径名
reactNamespace	string	React	指定谁调用的 createElement 方法
noLib	boolean	false	没有任何lib库，和lib冲突
useDefineForClassFields	boolean	false	采用 0bject.defineProeprty 来定义类中的方法
moduleDetection	auto
/force
/legacy	auto	是否对我们的模块进行强制处理
模块系统
配置项	值类型	默认值	说明
module	commonjs
/AMD/UMD
/ESNext
/System等	commonjs	打包最终输出的模块化规范
rootDir	string	-	当前项目的根目录
moduleResolution	node10
/bundler
/classic等
	node10	模块解析策略
baseUrl	string	-	解析非相对模块的基准目录
paths	object	{}	模块路径别名 (需配合 baseUrl)
rootDirs	string[]	[]	将多个目录视为同一根目录，指定文件项目中哪些目录是共享的，可以用于合并声明文件
typeRoots	string[]	["node_modules/@types"]	类型声明文件的搜索路径，查找声明文件的存放路径，可以通过 types 字段指定哪些要加载
types	string[]	[]	显式包含的类型声明包名
allowUmdGlobalAccess	boolean	false	允许UMD全局访问，在模块中也能访问
moduleSuffixes	string[]	[]	导入模块时可以省略模块后缀
allowImportingTsExtensions	boolean	false	是否允许 TS 扩展名
resolvePackageJsonExports	boolean	false	解析 package.json 导出
resolvePackageJsonImports	boolean	false	解析 package.json 导入
customConditions	string[]	[]	自定义条件
resolveJsonModule	boolean	false	是否支持JSON的导入
allowArbitraryExtensions	boolean	false	允许任意扩展
noResolve	boolean	false	无解析
javascript支持
配置项	值类型	默认值	说明
allowJs	boolean	false	允许在 ts 中可以使用 js 文件
checkJs	boolean	false	允许检测 js
maxNodeModuleJsDepth	number	0	检查 node_modules 中 JS 文件的深度
输出控制
配置项	值类型	默认值	说明
declaration	boolean	false	生成 .d.ts 声明文件
declarationMap	boolean	false	为声明文件生成 SourceMap
emitDeclarationOnly	boolean	false	仅触发声明文件(.d.ts)，不触发 .js 文件
sourceMap	boolean	false	生成 .map 文件
inlineSourceMap	boolean	false	将 SourceMap 嵌入到 JS 文件中
outFile	string	-	合并输出为单个文件 (仅适用于 AMD / System模块)
outDir	string	-	输出目录 (默认与输入文件同级)
removeComments	boolean	false	删除注释
noEmit	boolean	false	不做文件发射
importHelpers	boolean	false	导入助手
importsNotUsedAsValues	error
/preserve
/remove	-	没用用到的导入作为值使用会被移除，已废弃⚠️，转而使用 verbatimModuleSyntax
downlevelIteration	boolean	false	更准确降级 ES6+ 迭代语法
sourceRoot	string	-	只是给 debugger 来用的 告诉他我们原文件目录位置
mapRoot	string	-	只是给 debugger 来用的 告诉他我们map 目录位置
inlineSources	boolean	false	在sourcemap中生成源文件，主要就是解决源文件被压缩的问题
emitBOM	boolean	false	给文件生成 bom 头
newLine	crlf/lf	-	换行符，crlf->window，lf->linux
stripInternal	boolean	false	不要触发 JSDoc 注释中带有 @internal 注释的代码的声明
noEmitHelpers	boolean	false	不生成 helper
noEmitOnError	boolean	false	有错误是否继续生成
preserveConstEnums	boolean	false	将常量枚举转化成对象
declarationDir	string	-	声明文件输出目录
preserveValueImports	boolean	false	保留导入值，已废弃⚠️，转而使用 verbatimModuleSyntax
互操作约束
配置项	值类型	默认值	说明
isolatedModules	boolean	false	严格模块导出， 如果类型需要增加 type 标识
verbatimModuleSyntax	boolean	false	替换 isolatedModules 和前面两个废弃选项
allowSyntheticDefaultImports	boolean	false	允许合成默认导入
esModuleInterop	boolean	false	改进 CommonJS/ESM 互操作
preserveSymlinks	boolean	false	保留符号链接（webpack 中有一个 symlink，nodejs 中的符号链）
forceConsistentCasingInFileNames	boolean	false	强制文件名大小写一致
类型检查
配置项	值类型	默认值	说明
strict	boolean	false	启用所有严格类型检查 (包含以下子项)
noImplicitAny	boolean	false	禁止隐式 any 类型
strictNullChecks	boolean	false	严格 null/undefined 检查
strictFunctionTypes	boolean	false	严格函数类型检查
strictBindCallApply	boolean	false	严格检查 bind/call/apply 参数
strictPropertyInitialization	boolean	false	类属性必须初始化
noImplicitThis	boolean	false	默认 this 是 any，需要避免 any
useUnknownInCatchVariables	boolean	false	catch 中的 error 类型是 unknown 不在是 any
alwaysStrict	boolean	false	打包的结果，保持严格模式
noUnusedLocals	boolean	false	如果变量未被使用会发生警告
noUnusedParameters	boolean	false	如果参数未被使用会发生警告
exactOptionalPropertyTypes	boolean	false	严格可选属性类型 ( undefined 必须显式声明)
noImplicitReturns	boolean	false	返回值是否保证每条路径都有
noFallthroughCasesInSwitch	boolean	false	防止 switch case 缺少 break 语句
noUncheckedIndexedAccess	boolean	false	对索引访问添加 undefined 类型
noImplicitOverride	boolean	false	让用户在使用的时候，必须重写方法前加 override
noPropertyAccessFromIndexSignature	boolean	false	只能通过[]来访问属性
allowUnusedLabels	boolean	false	循环的 label 未使用时报警告
allowUnreachableCode	boolean	false	代码未触达会发生异常
完整性
配置项	值类型	默认值	说明
skipDefaultLibCheck	boolean	false	是否跳过检测 TS 中的内置类型
skipLibCheck	boolean	true	是否跳过检测第三方类型

文件控制配置
配置项	说明	示例
include	包含文件的 glob 模式	["src/**/*.ts"]
exclude	排除文件的 glob 模式	["**/*.test.ts"]
files	显式文件列表 (优先级最高)	["app.ts", "core.ts"]
references	项目引用 (用于 monorepo)	[{ "path": "../utils" }]
extends	扩展	"./config/base"
完整配置示例
{
  "compilerOptions": {
    /* 语言与平台 */
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "jsx": "react-jsx",

    /* 模块系统 */
    "module": "ES2022",
    "moduleResolution": "node",
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    },
    "typeRoots": ["./types", "./node_modules/@types"],

    /* 类型检查 */
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,

    /* 输出控制 */
    "outDir": "dist",
    "rootDir": "src",
    "sourceMap": true,
    "declaration": true,

    /* JS 互操作 */
    "allowJs": true,
    "checkJs": true,

    /* 其他 */
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}

关键配置场景说明
浏览器项目
{
  "lib": ["ES2022", "DOM", "DOM.Iterable"],
  "module": "ES2022",
  "moduleResolution": "bundler" // 适用于 Vite/webpack 等打包工具
}
Node.js 项目
{
  "module": "CommonJS",
  "types": ["node"], // 包含 @types/node
  "outDir": "dist",
  "rootDir": "src"
}
库开发
{
  "declaration": true,
  "declarationMap": true,
  "composite": true // 支持工程引用
}
严格模式
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}

查看完整配置
- 查看当前生效的完整配置
tsc --showConfig

- 生成默认配置
tsc --init
● 官方完整文档：https://www.typescriptlang.org/tsconfig
参考https://www.npmjs.com/package/tsconfig.json
# 23 综合实例
内置类型
部分可选属性
/**
 * 定义包含部分可选属性的Person接口
 * - name 为必选属性
 * - age 和 address 后续将通过类型变换成为可选属性
 */
interface Person {
  name: string;
  age: number;
  address: string;
}

/**
 * 创建包含部分可选属性的类型
 * @template T - 原始对象类型
 * @template K - 需要设置为可选的属性键集合
 * @returns 新类型：保留非K属性为必选，K属性变为可选
 */
type PartialProperty<T extends object, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;

/**
 * 类型计算工具：将交叉类型转换为扁平化的对象类型
 * @template T - 需要转换的类型
 * @description 用于优化IDE的类型提示显示效果
 */
type Computed<T> = {
  [K in keyof T]: T[K];
}

/**
 * 应用类型变换后的Person类型
 * @description 将原始Person类型的age和address属性变为可选
 * @example
 * type Result = {
 *   name: string;
 *   age?: number | undefined;
 *   address?: string | undefined;
 * }
 */
type PartialPerson = Computed<PartialProperty<Person, 'age' | 'address'>>;

// 验证类型变换的示例对象
const p: PartialPerson = {
  name: '张三',
}
根据值类型(挑选/忽略)对象类型的属性
/**
 * 类型相等性检查工具类型
 * @template T - 待比较类型1
 * @template U - 待比较类型2
 * @template Success - 类型相等时返回的类型
 * @template Fail - 类型不相等时返回的类型
 */
type isEqual<T, U, Success, Fail> = [T] extends [U]
  ? [U] extends [T]
    ? Success
    : Fail
  : Fail;

/**
 * 属性值类型筛选器（核心工具类型）
 * @template T - 源对象类型
 * @template V - 目标值类型
 * @template O - 模式开关（true表示排除模式，false表示包含模式）
 * @description 遍历对象属性，根据值类型匹配结果返回保留/排除的键名
 */
type ExtractKeys<T, V, O = false> = {
  [K in keyof T]: isEqual<
    T[K],
    V,
    isEqual<O, true, never, K>,  // 包含模式时保留匹配键，排除模式时丢弃匹配键
    isEqual<O, true, K, never>   // 包含模式时丢弃不匹配键，排除模式时保留不匹配键
  >;
};

/**
 * 选取包含指定值类型的属性键
 * @template T - 源对象类型
 * @template V - 目标值类型
 */
type PickKeysByValue<T extends object, V> = ExtractKeys<T, V>[keyof T];

/**
 * 排除包含指定值类型的属性键
 * @template T - 源对象类型
 * @template V - 目标值类型
 */
type OmitKeysByValue<T extends object, V> = ExtractKeys<T, V, true>[keyof T];

/**
 * 基于映射类型实现属性键筛选（替代方案）
 * @template T - 源对象类型
 * @template V - 目标值类型
 * @description 通过条件类型和键名映射实现快速筛选
 */
type PickKeysByValue2<T extends object, V> = keyof {
  [P in keyof T as T[P] extends V ? P : never]: any;
};

/**
 * 基于映射类型实现属性键排除（替代方案）
 * @template T - 源对象类型
 * @template V - 目标值类型
 */
type OmitKeysByValue2<T extends object, V> = keyof {
  [P in keyof T as T[P] extends V ? never : P]: any;
};

// 类型测试样例（保留原始代码不变）
interface Person {
  name: string;
  age: number;
  address: string;
}

type t = isEqual<"a", string, "success", "fail">;

type PickTypes = PickKeysByValue<Person, string>;
type OmitTypes = OmitKeysByValue<Person, string>;

const pickType: PickTypes = "name";
const omitType: OmitTypes = "age";

type pickType2 = PickKeysByValue2<Person, string>;
type omitType2 = OmitKeysByValue2<Person, string>;

const pickType2: pickType2 = 'name';
const omitType2: omitType2 = 'age';
子类型互斥
/* 子类型互斥实现 */

/**
 * 工具类型：通过将非共有属性标记为never实现类型排除
 * @template T 需要排除属性的源类型
 * @template U 作为排除基准的目标类型
 */
type DiscardType<T, U> = {
  [K in Exclude<keyof T, keyof U>]?: never;
}

/**
 * 创建互斥联合类型工具
 * @template T 第一个候选类型
 * @template U 第二个候选类型
 * 实现原理：
 * - 通过交叉类型组合两个互斥形态
 * - 每个形态包含另一个类型的排除属性(设为never)
 * - 最终形成 T without U 或 U without T 的联合类型
 */
type OrType<T, U> = (DiscardType<T, U> & U) | (DiscardType<U, T> & T);

// 接口定义
interface Man1 {
  fortune: string;
}
interface Man2 {
  funny: string;
}
interface Man3 {
  foreign: string;
}

/**
 * 联合类型声明：
 * 实现Man1/Man2/Man3三个接口类型的互斥组合
 * 每个实例只能包含其中一种类型的属性
 */
type ManType = OrType<Man1, OrType<Man2, Man3>>;

// 合法对象（只能包含单一类型属性）
const man1: ManType = {
  fortune: 'fortune',
}
const man2: ManType = {
  funny: 'funny',
}
const man3: ManType = {
  foreign: 'foreign',
}
对象类型操作工具集（交、差、并、补）
/**
 * 4. 对象类型操作工具集（交、差、并、补）
 */

type A = {
  name: string;
  age: number;
  address: string;
};

type B = {
  name: string;
  address: number;
  phone: string;
  avatar: string;
};
// 1.交集
/**
 * 计算两个对象类型的交集
 * @template T - 第一个对象类型
 * @template U - 第二个对象类型
 * @returns 返回同时存在于T和U中的属性集合
 */
type ObjectIntersection<T extends object, U extends object> = Pick<T, Extract<keyof T, keyof U>>;

/** A与B的共有属性（name, address） */
type Inter = ObjectIntersection<A, B>;
/** 交集实例：必须包含name和address（注意B.address类型为number） */
const inter: Inter = {
  name: 'zhang san',
  address: 'beijing',
}

// 2.差集
/**
 * 计算对象类型的差集
 * @template T - 源对象类型
 * @template U - 要排除的属性集合对象
 * @returns 返回T中存在但U中不存在的属性集合
 */
type ObjectDiff<T extends object, U extends object> = Pick<T, Exclude<keyof T, keyof U>>;

/** A中存在但B没有的属性（age） */
type Diff = ObjectDiff<A, B>;
/** 差集实例：仅包含age属性 */
const diff: Diff = {
  age: 18,
}
/** B中存在但A没有的属性（phone, avatar） */
const dff2: ObjectDiff<B, A> = {
  phone: '123456789',
  avatar: 'avatar',
}

// 3.并集（重写）
/**
 * 对象类型并集（以第二个对象类型优先）
 * @template T - 第一个对象类型
 * @template U - 第二个对象类型（优先级更高）
 * @returns 返回合并后的类型，冲突属性以U的类型为准
 */
type ObjectOverwrite<T extends object, U extends object> = {
  [K in keyof T | keyof U]: K extends keyof U ? U[K] : K extends keyof T ? T[K] : never;
}

/** 合并A和B类型，冲突属性以B的类型为准（address变为number） */
type Overwrite= ObjectOverwrite<A, B>;
/** 联合类型实例：包含所有属性，address类型为number */
const overwrite: Overwrite = {
  name: 'zhang san',
  age: 18,
  address: 123,
  phone: '123456789',
  avatar: 'avatar'
}
/** 联合类型实例：以A为优先时address保持string类型 */
const overwrite2: ObjectOverwrite<B, A> = {
  name: 'zhang san',
  age: 18,
  address: 'beijing',
  phone: '123456789',
  avatar: 'avatar'
}

// 3.补集
/**
 * 补集实现（基于差集，要求存在父子类型关系）
 * @template T - 子类型（包含更多属性的类型）
 * @template U - 父类型（基础属性类型）
 * @returns 返回子类型特有属性的集合
 */
type C = {
  name: string;
  address: string;
};

type D = {
  name: string;
  address: string;
  phone: string;
};
type ObjectComplement<T extends object, U extends object> = Pick<T, Exclude<keyof T, keyof U>>;

/** D相对于C的补集（新增phone属性） */
type Complement = ObjectComplement<D, C>;
/** 补集实例：仅包含新增的phone属性 */
const complement: Complement = {
  phone: '123456789'
}
获取函数最后一个参数
/**
 * 示例函数用于类型测试
 * @param a - 第一个数字参数
 * @param b - 第二个数字参数
 * @param c - 第三个数字参数
 * @param d - 布尔类型参数（最后一个参数）
 * @returns 无返回值
 */
function sum(a: number, b: number, c: number, d: boolean) {}

/**
 * 模式匹配类型（方式一）：通过双重条件类型推断函数参数的最后一个参数类型
 * @template T - 被推断的函数类型
 * @description 1. 先匹配函数参数整体结构
 *             2. 再通过数组模式匹配提取最后一个元素
 */
type LastParameter<T extends (...args: any[]) => any> = T extends (
  ...args: infer P
) => any
  ? P extends [...infer X, infer Last]
    ? Last
    : never
  : never;

/**
 * 模式匹配类型（方式二）：优化后的单层条件类型推断
 * @template T - 被推断的函数类型
 * @description 直接在参数模式中解构，同时保留前面参数和最后一个参数
 */
type LastParameter2<T extends (...args: any[]) => any> = T extends (
  ...args: [...infer P, infer Last]
) => any
  ? Last
  : never;

/**
 * 模式匹配类型（方式三）：基于内置Parameters工具类型的实现
 * @template T - 被推断的函数类型
 * @description 使用Parameters获取参数元组后，进行数组解构模式匹配
 */
type LastParameter3<T extends (...args: any[]) => any> = Parameters<T> extends [
  ...infer P,
  infer Last
]
  ? Last
  : never;

// 测试类型推导结果
type Last = LastParameter<typeof sum>;
type Last2 = LastParameter2<typeof sum>;
type Last3 = LastParameter3<typeof sum>;

let r: Last = true;     // 正确推导为boolean类型
let r2: Last2 = true;   // 正确推导为boolean类型
let r3: Last3 = true;   // 正确推导为boolean类型
字符串
将字符串首字母转换为大写
/**
 * 6. 将字符串首字母转换为大写类型
 * @template S - 输入的原始字符串类型
 * @returns 首字母大写的字符串类型（若输入非字符串类型则返回原类型）
 */
type CapitalizeString<S> = S extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${R}`
  : S;

type capitalizeStr1 = CapitalizeString<"hello">;
type capitalizeStr12 = CapitalizeString<"world">;
type capitalizeStr13 = CapitalizeString<123>;
获取字符串字面量的第一个字符
/**
 * 7. 获取字符串字面量的第一个字符类型
 * @template S - 输入的字符串类型（需继承string类型）
 * @returns 字符串的第一个字符类型（空字符串返回never）
 */
type FirstChar<S extends string> = S extends `${infer F}${infer R}` ? F : never;

type FirstChar1 = FirstChar<"hello">;
type FirstChar2 = FirstChar<"World">;
type FirstChar3 = FirstChar<"">;
获取字符串最后一个字符
/**
 * 8.1 获取字符串最后一个字符类型（递归实现）
 * @template S - 输入的字符串类型
 * @returns 递归解析得到的最后一个字符类型（空字符串返回never）
 */
type LastChar<S extends string> = S extends `${infer L}${infer R}`
  ? R extends ""
    ? L
    : LastChar<R>
  : never;

/**
 * 8.2 获取字符串最后一个字符类型（尾递归优化实现）
 * @template S - 输入的字符串类型
 * @template F - 用于累积最后一个字符的辅助类型参数
 * @returns 最终累积得到的最后一个字符类型（空字符串返回never）
 */
type LastChar0<S extends string, F = never> = S extends `${infer L}${infer R}`
  ? LastChar0<R, L>
  : F;

type LastChar1 = LastChar<"hello">;
type LastChar2 = LastChar<"World">;
type LastChar3 = LastChar<"">;

type LastChar4 = LastChar0<"hello">;
type LastChar5 = LastChar0<"World">;
type LastChar6 = LastChar0<"">;
将字符串转换为字符元组
/**
 * 9.1 将字符串转换为字符元组类型（递归展开实现）
 * @template S - 输入的字符串类型
 * @returns 递归生成的字符元组类型
 */
type StringToTuple<S extends string> = S extends `${infer L}${infer R}`
  ? [L, ...StringToTuple<R>]
  : [];

/**
 * 9.2 将字符串转换为字符元组类型（尾递归优化实现）
 * @template S - 输入的字符串类型
 * @template F - 用于累积字符的元组类型参数
 * @returns 最终累积生成的字符元组类型
 */
type StringToTuple0<S extends string, F extends any[] = []> = S extends `${infer L}${infer R}`
  ? StringToTuple0<R, [...F, L]>
  : F;

type StringToTuple1 = StringToTuple<"hello">;
type StringToTuple2 = StringToTuple<"World">;
type StringToTuple3 = StringToTuple<"">;

type StringToTuple4 = StringToTuple0<"hello">;
type StringToTuple5 = StringToTuple0<"World">;
type StringToTuple6 = StringToTuple0<"">;
将字符串元组转换为字符串字面量
/**
 * 10.1 将字符串元组转换为字符串字面量类型（递归拼接实现）
 * @template T - 输入的字符串元组类型
 * @returns 递归拼接生成的字符串字面量类型
 */
type TupleToString<T extends any[]> = T extends [infer L extends string, ...infer R]
  ? `${L}${TupleToString<R>}`
  : '';

/**
 * 10.2 将字符串元组转换为字符串字面量类型（尾递归优化实现）
 * @template T - 输入的字符串元组类型
 * @template F - 用于累积结果的字符串类型参数
 * @returns 最终累积生成的完整字符串字面量类型
 */
type TupleToString0<T extends any[], F extends string = ''> = T extends [infer L extends string, ...infer R]
  ? TupleToString0<R, `${F}${L}`>
  : F;

type TupleToString1 = TupleToString<["h", "e", "l", "l", "o"]>;
type TupleToString2 = TupleToString<["W", "o", "r", "l", "d"]>;
type TupleToString3 = TupleToString<[]>;

type TupleToString4 = TupleToString0<["h", "e", "l", "l", "o"]>;
type TupleToString5 = TupleToString0<["W", "o", "r", "l", "d"]>;
type TupleToString6 = TupleToString0<[]>;
重复字符串
/**
 * 重复字符串类型构造器（方式一：通过数组长度计数）
 * 
 * @template T - 需要重复的原始字符串类型
 * @template N - 重复次数（数字字面量类型）
 * @template A - 用于递归计数的数组类型（默认空数组）
 * @returns 由T重复N次组成的字符串类型
 */
// 11.重复字符
// 方式一
type RepeatString<
  T extends string,
  N extends number,
  A extends any[] = []
> = A["length"] extends N ? "" : `${T}${RepeatString<T, N, [T, ...A]>}`;

/**
 * 重复字符串类型构造器（方式二：通过累积字符串构建）
 * 
 * @template T - 需要重复的原始字符串类型
 * @template N - 重复次数（数字字面量类型）
 * @template A - 用于递归计数的数组类型（默认空数组）
 * @template F - 用于累积结果的字符串类型（默认空字符串）
 * @returns 由T重复N次组成的字符串类型
 */
// 方式二
type RepeatString0<
  T extends string,
  N extends number,
  A extends any[] = [],
  F extends string = ''
> = A["length"] extends N
  ? F
  : RepeatString0<T, N, [null, ...A], `${F}${T}`>;

// 测试用例：使用方式一生成重复字符串类型
type RepeatString1 = RepeatString<"a", 5>;
type RepeatString2 = RepeatString<"b", 3>;
type RepeatString3 = RepeatString<"c", 11>;
type RepeatString4 = RepeatString<"d", 0>;

// 测试用例：使用方式二生成重复字符串类型
type RepeatString5 = RepeatString0<"a", 5>;
type RepeatString6 = RepeatString0<"b", 3>;
type RepeatString7 = RepeatString0<"c", 11>;
type RepeatString8 = RepeatString0<"d", 0>;
字符串字面量类型按照指定字符分割为元组
/**
 * 将字符串字面量类型按照指定字符分割为元组类型
 * 
 * @template S - 原始字符串字面量类型
 * @template C - 分割字符（要求为单字符字面量类型）
 * @returns 分割后的字符串元组类型，若无法分割则返回包含原字符串的单元素组
 * 
 * @example
 * type T = SplitString<"a-b-c", "-"> // 得到 ["a", "b", "c"]
 */
type SplitString<
  S extends string,
  C extends string
> = S extends `${infer L}${C}${infer R}` 
  // 递归分解字符串：提取分隔符左侧部分，继续处理右侧剩余字符串
  ? [L, ...SplitString<R, C>] 
  // 终止条件：当无法找到分隔符时返回包含剩余字符串的数组
  : [S];

/**
 * 带有累积器的字符串分割实现（尾递归优化版本）
 * 
 * @template S - 原始字符串字面量类型
 * @template C - 分割字符（要求为单字符字面量类型）
 * @template F - 累积数组，用于存储已分割的字符串片段
 * @returns 分割后的字符串元组类型，使用累积器优化递归过程
 */
type SplitString0<
  S extends string,
  C extends string,
  F extends any[] = []
> = S extends `${infer L}${C}${infer R}` 
  // 将当前分割结果存入累积器，继续处理剩余字符串
  ? SplitString0<R, C, [...F, L]> 
  // 最终合并累积器结果与最后一个字符串片段
  : [...F, S];

// 测试用例：验证基础分割功能
type SplitString1 = SplitString<"hello-world", "-">; // ["hello", "world"]
type SplitString2 = SplitString<"hello.world", ".">; // ["hello", "world"]
type SplitString3 = SplitString<"hello", ".">;        // ["hello"]

// 测试用例：验证累积器版本的分割功能
type SplitString4 = SplitString0<"hello-world", "-">; // ["hello", "world"]
type SplitString5 = SplitString0<"hello.world", ".">; // ["hello", "world"]
type SplitString6 = SplitString0<"hello", ".">;       // ["hello"]
计算字符串字面量类型的长度
/**
 * 计算字符串字面量类型的长度（递归实现）
 * 
 * 实现思路：
 * 1. 通过递归分解字符串，将每个字符存入元组中
 * 2. 利用元组的length属性统计最终长度
 * 
 * @template T - 需要计算长度的字符串字面量类型
 * @template A - 累积字符数组（用于递归计数，默认空数组）
 * @returns {number} 字符串的长度
 * 
 * @example
 * type Length2 = StringLength<"abc123">;      // 6
 * type Length3 = StringLength<"abc123!@#">;   // 9
 * type Length4 = StringLength<"">;            // 0
 */
type StringLength<
  T extends string,
  A extends any[] = []
> = T extends `${infer L}${infer R}` ? StringLength<R, [L, ...A]> : A["length"];

// 测试用例
type Length2 = StringLength<"abc123">;
type Length3 = StringLength<"abc123!@#">;
type Length4 = StringLength<"">;
将驼峰命名字符串类型转换为横杠连接命名
/**
 * 将驼峰命名字符串类型转换为横杠连接命名格式
 * 
 * @template T - 需要转换的原始驼峰命名字符串类型
 * @returns 转换后的横杠连接命名字符串类型
 * 
 * 实现逻辑：
 * 1. 通过模板字符串类型递归处理每个字符
 * 2. 将首字母转为小写后，检查剩余字符是否需要添加分隔符：
 *    - 如果剩余部分的首字母是小写，说明不需要添加横杠
 *    - 如果剩余部分的首字母是大写，需要先添加横杠再递归处理
 * 3. 最终递归处理后的结果即为横杠连接格式
 */
type CamelToKebab<T extends string> = T extends `${infer L}${infer R}`
    // 分解首字符L和剩余字符R，处理后递归拼接
    ? `${Lowercase<L>}${R extends Uncapitalize<R> ? '' : '-'}${CamelToKebab<Uncapitalize<R>>}`
    : T;

// 测试用例：
type CamelToKebab1 = CamelToKebab<'HelloWorld'>;      // 期望结果："hello-world"
type CamelToKebab2 = CamelToKebab<'HelloWorld2'>;     // 期望结果："hello-world2"
type CamelToKebab3 = CamelToKebab<'hello'>;           // 期望结果："hello"
type CamelToKebab4 = CamelToKebab<''>;                // 期望结果：""
将横杠命名格式的字符串字面量类型转换为驼峰命名
/**
 * 将横杠命名格式的字符串字面量类型转换为驼峰命名格式
 * 
 * 该类型通过递归处理字符串中的横杠分隔符，将每个单词首字母转为大写，
 * 最终生成大驼峰式(PascalCase)命名字符串类型
 * 
 * @template T - 需要转换的横杠命名字符串字面量类型
 * @returns {string} 转换后的驼峰命名字符串字面量类型
 */
// 横杠命名转化为驼峰命名
type CamelToKebab<T extends string> = T extends `${infer F}-${infer R}`
  ? `${Capitalize<F>}${CamelToKebab<R>}`  // 递归处理横杠分隔的字符串部分
  : Capitalize<T>;  // 基础情况：单个单词直接首字母大写

// 测试用例：
type CamelToKebab1 = CamelToKebab<"hello-world">;        // "HelloWorld"
type CamelToKebab2 = CamelToKebab<"helloWorld">;         // "HelloWorld"（注意原始格式非横杠的转换结果）
type CamelToKebab3 = CamelToKebab<"hello-world-world">;  // "HelloWorldWorld"
type CamelToKebab4 = CamelToKebab<"helloworld">;         // "Helloworld"
type CamelToKebab5 = CamelToKebab<"">;                   // ""
生成对象属性访问路径的联合类型
/**
 * 生成对象属性访问路径的联合类型（递归实现）
 * 
 * 通过递归遍历对象属性生成属性路径字符串联合类型，支持嵌套对象结构
 * 
 * @example
 * type Test = ObjectAccessPaths<{a: {b: string}}>  // "a.b"
 */
type ObjectAccessPaths<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? `${K}${T[K] extends object ? `.${ObjectAccessPaths<T[K]>}` : ""}`
        : never;
    }[keyof T]
  : never;


/**
 * 工具类型：移除字符串前缀
 * 
 * @template T - 原始字符串类型
 * @template U - 要移除的前缀字符串类型
 * 
 * @example
 * type Test = RemoveFirst<".a.b", ".">  // "a.b"
 */
type RemoveFirst<T, U extends string> = T extends `${U}${infer R}`
  ? R
  : never;

/**
 * 生成对象属性访问路径的联合类型（替代实现）
 * 
 * 使用辅助泛型参数累积路径字符串，处理嵌套对象结构
 * 
 * @template T - 当前处理的对象类型
 * @template F - 累积的路径字符串（默认空字符串）
 * @template K - 当前对象的键集合（自动推导为keyof T）
 * 
 * @example
 * type Test = ObjectAccessPaths0<{a: {b: string}}>  // "a.b"
 */
type ObjectAccessPaths0<
  T,
  F extends string = "",
  K = keyof T
> = K extends keyof T
  ? T[K] extends object
    ? ObjectAccessPaths0<T[K], `${F}.${K & string}`>
    : RemoveFirst<`${F}.${K & string}`, '.'>
  : never;

/**
 * 创建国际化函数工厂
 * 
 * @template Schema - 国际化配置对象的类型约束
 * 
 * @param {Schema} schema - 国际化配置对象，包含嵌套的文本配置
 * @returns {(path: ObjectAccessPaths0<Schema>) => void} 返回的函数接受合法路径参数
 * 
 * @example
 * const i18n = createI18n({home: {title: "首页"}})
 * i18n("home.title") // 合法调用
 */
function createI18n<Schema>(
  schema: Schema
): (path: ObjectAccessPaths<Schema>) => void {
  return (path) => {};
}

// 使用示例验证类型推导
const i18n = createI18n({
  home: {
    topBar: {
      title: "首页",
      welcome: "欢迎",
    },
    bottomBar: {
      notes: "xxx 备案",
    },
  },
  login: {
    name: "登录",
    pwd: "密码",
  },
});

// 验证路径参数的类型安全
i18n("home.topBar.title");
i18n("home.bottomBar.notes");
i18n("login.name");
判断传入的字符串字面量类型中是否含有某个字符串
// 判断传入的字符串字面量类型中是否含有某个字符串

/**
 * 判断字符串类型 S 中是否包含子字符串 U
 * 
 * @typeParam S - 被检测的原始字符串类型
 * @typeParam U - 要查找的目标字符串类型
 * 
 * @returns 如果 S 包含 U 返回 true，否则返回 false。特殊处理空字符串情况：
 *          - S 和 U 都为空时返回 true
 *          - 仅 U 为空时返回 false
 */
type Includes<
  S extends string,
  U extends string
> = 
  // 分解字符串为第一个字符 L 和剩余部分 R
  S extends `${infer L}${infer R}`
    ? L extends U // 检查首字符是否匹配目标
      ? true      // 匹配则直接返回 true
      : Includes<R, U> // 不匹配则递归检查剩余字符串
    : S extends "" // 处理空字符串的特殊情况
      ? U extends "" 
        ? true     // 两者都为空字符串时返回 true
        : false    // 仅 S 为空时返回 false
      : false;     // 普通不匹配情况

type Includes1 = Includes<"abc", "c">;
type Includes2 = Includes<"abc", "d">;
type Includes3 = Includes<"abc", "">;
type Includes4 = Includes<"", "abc">;
type Includes5 = Includes<"", "">;
去除首尾空格
/**
 * 去除字符串类型首尾空格
 * 
 * 通过递归方式检测并去除字符串类型开头和结尾的空格字符
 * @template T - 需要处理的原始字符串类型，必须继承自string类型
 * @returns 处理后的无首尾空格字符串类型
 */
type Trim<T extends string> = 
  // 递归检测首尾空格：如果匹配到开头或结尾存在空格，则继续处理剩余部分
  T extends ` ${infer R}` | `${infer R} ` ? Trim<R> : T;

/**
 * 去除字符串类型左侧空格
 * @template T - 需要处理的原始字符串类型，必须继承自string类型
 * @returns 处理后的无左侧空格字符串类型
 */
type TrimLeft<T extends string> = T extends ` ${infer R}` ? TrimLeft<R> : T;

/**
 * 去除字符串类型右侧空格
 * @template T - 需要处理的原始字符串类型，必须继承自string类型
 * @returns 处理后的无右侧空格字符串类型
 */
type TrimRight<T extends string> = T extends `${infer L} ` ? TrimRight<L> : T;

/**
 * 组合式去除首尾空格类型
 * 
 * 通过组合TrimLeft和TrimRight类型实现首尾空格去除
 * @template T - 需要处理的原始字符串类型，必须继承自string类型
 * @returns 先去除右侧空格再去除左侧空格的最终结果类型
 */
type Trim0<T extends string> = TrimLeft<TrimRight<T>>;

// 测试用例：
type trim = Trim<"  Hello World  ">;    // 结果："Hello World"
type trim2 = Trim<"Hello World  ">;     // 结果："Hello World"
type trim3 = Trim<"  Hello World">;     // 结果："Hello World"
type trim4 = Trim<"  ">;                // 结果：""
type trim5 = Trim<"">;                  // 结果：""

type trim6 = Trim0<"  Hello World  ">;    // 结果："Hello World"
type trim7 = Trim0<"Hello World  ">;     // 结果："Hello World"
type trim8 = Trim0<"  Hello World">;     // 结果："Hello World"
type trim9 = Trim0<"  ">;                // 结果：""
type trim0 = Trim0<"">; 
替换
// 替换
/**
 * 字符串替换工具类型（递归实现）
 * 
 * @template T - 原始输入字符串类型
 * @template C - 需要被替换的字符/子串类型
 * @template RC - 替换后的新字符/子串类型
 * @template F - 累积器，用于存储中间结果（默认空字符串）
 * @returns {string} 替换完成后的新字符串类型
 * 
 * 实现逻辑：
 * 1. 处理空替换字符串的特殊情况
 * 2. 通过模板字符串类型匹配进行递归替换
 * 3. 使用累积器逐步构建最终结果
 */
// 替换
type Replace<
  T extends string,
  C extends string,
  RC extends string,
  F extends string = ""
> = C extends ""
  // 处理替换空字符串的情况（在原始字符串首尾和每个字符间插入）
  ? T extends ""
    ? RC          // 原字符串和替换字符串均为空时返回替换内容
    : `${RC}${T}` // 在非空字符串前插入替换内容
  // 执行常规替换逻辑
  : T extends `${infer L}${C}${infer R}`
  ? Replace<R, C, RC, `${F}${L}${RC}`> // 发现匹配，递归处理剩余部分
  : `${F}${T}`; // 无匹配时返回累积结果

/**
 * 测试用例说明：
 * Replace1: 连续替换三次 "he" -> "ha"，结果为 "hahaha"
 * Replace2: 完全匹配替换 "jw" -> "jwt"
 * Replace3: 空替换符时在字符前插入，结果为 "jwa"（原"a"）
 * Replace4: 原字符串和替换符均为空时返回替换内容 "jwt"
 */
type Replace1 = Replace<"hehehe111", "he", "ha">;
type Replace2 = Replace<"jw", "jw", "jwt">;
type Replace3 = Replace<"a", "", "jwt">;
type Replace4 = Replace<"", "", "jwt">;
定义组件的监听事件类型
/**
 * 定义组件的事件监听类型集合
 * @property 'handle-open' - 控制打开状态的事件
 *               @param flag - 表示开启状态的布尔值
 *               @returns 固定返回true表示事件处理完成
 * @property 'preview-item' - 预览条目事件
 *               @param data - 包含预览条目的数据对象
 *               @param data.item - 任意类型的条目数据
 *               @param data.index - 条目的索引位置
 *               @returns 固定返回true表示事件处理完成
 * @property 'close-item' - 关闭条目事件
 *               @param data - 包含关闭条目的数据对象
 *               @param data.item - 任意类型的条目数据
 *               @param data.index - 条目的索引位置
 *               @returns 固定返回true表示事件处理完成
 */
type Events = {
  'handle-open': (flag: boolean) => true;
  'preview-item': (data: {item: any, index: number}) => true;
  'close-item': (data: {item: any, index: number}) => true;
}

/**
 * 将驼峰式字符串转换为连字符式并首字母大写的工具类型
 * @template T - 需要转换的原始字符串类型
 * @example
 * type Example = CamelToKebab<'handle-open'> // 返回'HandleOpen'
 */
type CamelToKebab<T extends string> = T extends `${infer F}-${infer R}`
  ? `${Capitalize<F>}${CamelToKebab<R>}`  // 递归处理剩余部分字符串
  : Capitalize<T>;  // 基础情况：处理最后一个单词段

/**
 * 将原始事件类型转换为组件事件发射器类型
 * @template T - 原始事件类型
 * @description 将事件名转换为on+大写开头的格式（如handle-open → onHandleOpen）
 *              并转换函数参数为事件监听器格式（保留参数但不强制返回值）
 */
type ComponentEmitsType<T> = {
  [K in keyof T as `on${CamelToKebab<K & string>}`]: 
    T[K] extends (...args: infer P) => any ? (...args: P) => void : never;
};

/**
 * 生成的组件事件类型
 * @description 基于原始Events类型转换后的最终事件类型，
 *              事件名格式为on+大写开头的驼峰式名称（如onHandleOpen）
 */
type ComponentEmits = ComponentEmitsType<Events>;
元组
获取元组的第一个元素
/**
 * 获取元组类型的第一个元素类型
 * @template T - 输入的元组类型
 * @returns 元组的第一个元素类型
 */
// 得到元组类型中的第一个元素
type FirstItem<T extends any[]> = T[0];

type FirstItem1 = FirstItem<[string, number, bigint]>;
type FirstItem2 = FirstItem<[1, 2, 3, 4]>;
获取元组的最后一个元素
/**
 * 获取元组类型的最后一个元素类型
 * @template T - 输入的元组类型
 * @returns 元组的最后一个元素类型（通过模式匹配推断）
 */
// 得到元组类型中的最后一个元素
type LastItem<T extends any[]> = T extends [...any, infer R] ? R : never;

type LastItem1 = LastItem<[string, number, bigint]>;
type LastItem2 = LastItem<[1, 2, 3, 4]>;
移除元组的第一个元素
/**
 * 移除元组的第一个元素，返回剩余元素组成的元组
 * @template T - 输入的元组类型
 * @returns 移除首元素后的新元组类型
 */
// Shift
type Shift<T extends any[]> = T extends [infer L, ...infer R] ? R : never;

type Shift1 = Shift<[string, number, bigint]>;
type Shift2 = Shift<[1, 2, 3, 4]>;
在元组末尾添加新元素
/**
 * 在元组末尾添加新元素
 * @template T - 原始元组类型
 * @template V - 要添加的新元素类型
 * @returns 包含新元素的扩展元组类型
 */
// Push
type Push<T extends any[], V> = [...T, V];

type Push1 = Push<[string, number, bigint], boolean>;
type Push2 = Push<[1, 2, 3, 4], 5>;
反转元组
/**
 * 递归反转元组元素顺序
 * @template T - 要反转的元组类型
 * @returns 元素顺序反转后的新元组类型
 */
// ReverseTuple
type ReverseTuple<T extends any[]> = T extends [infer L, ...infer R]
  ? [...ReverseTuple<R>, L]
  : [];

type ReverseTuple1 = ReverseTuple<[string, number, bigint]>;
type ReverseTuple2 = ReverseTuple<[1, 2, 3, 4]>;
拍平元组
/**
 * 递归展开嵌套的元组结构（扁平化）
 * @template T - 可能包含嵌套的元组类型
 * @returns 展开所有嵌套层级的平面元组类型
 */
// Flat
type Flat<T extends any[]> = T extends [infer L, ...infer R]
  ? L extends any[]
    ? [...Flat<L>, ...Flat<R>]
    : [L, ...Flat<R>]
  : [];

type Flat1 = Flat<[1, [2, 3, 4]]>;
type Flat2 = Flat<[1, [2, [3, 4]]]>;
type Flat3 = Flat<[1, [2, [3, [4, [5, [6, [7, [8, [9, [10]]]]]]]]]]>;
type Flat4 = Flat<[]>;
type Flat5 = Flat<[1]>
构造包含N个T类型元素的元组

/**
 * 构造包含N个T类型元素的元组类型
 * 
 * @template T - 需要重复的元素类型
 * @template N - 重复次数（必须为数字字面量类型）
 * @template F - 累积数组（内部递归使用，默认空数组）
 * @returns {T[]} 包含N个T类型元素的元组类型
 * 
 * @example
 * type Repeat1 = Repeat<number, 3>;  // 结果类型为 [number, number, number]
 * type Repeat2 = Repeat<string, 3>;  // 结果类型为 [string, string, string]
 */
// Repeat
type Repeat<T, N extends number, F extends any[] = []> = 
  // 递归终止条件：当累积数组长度等于目标值时返回结果
  F["length"] extends N
  ? F
  // 递归构建：将新元素添加到累积数组中继续递归
  : Repeat<T, N, [...F, T]>;

type Repeat1 = Repeat<number, 3>;
type Repeat2 = Repeat<string, 3>;
type Repeat3 = Repeat<1, 1>;
type Repeat4 = Repeat<0, 0>;
过滤出数组中符合指定类型的元素
/**
 * 过滤出数组中符合指定类型的元素（累积器方式实现）
 * 
 * @template T - 原始数组类型
 * @template U - 需要过滤的目标类型
 * @template F - 累积结果数组（内部递归使用，默认空数组）
 * @returns {U[]} 包含符合U类型元素的元组类型
 * 
 * @example
 * type Filter1 = Filter<[1, 'f', 2, true, 'd'], number>; // 结果类型为 [1, 2]
 * type Filter3 = Filter<[1, 'f', 2, any, 'd'], string>;  // 结果类型为 ['f', 'd']
 */
type Filter<T extends any[], U, F extends any[] = []> = T extends [
  infer L,
  ...infer R
]
  // 递归处理数组元素：通过条件类型判断元素类型是否匹配
  ? Filter<R, U, [L] extends [U] ? [...F, L] : F>
  : F;

/**
 * 过滤出数组中符合指定类型的元素（条件类型内联递归实现）
 * 
 * @template T - 原始数组类型
 * @template U - 需要过滤的目标类型
 * @returns {U[]} 包含符合U类型元素的元组类型
 * 
 * @example
 * type Filter4 = Filter0<[1, 'f', 2, true, 'd'], number>; // 结果类型为 [1, 2]
 * type Filter6 = Filter0<[1, 'f', 2, any, 'd'], string>;  // 结果类型为 ['f', any, 'd']
 */
type Filter0<T extends any[], U> = T extends [infer L, ...infer R]
  // 使用条件类型递归：匹配的元素保留，不匹配的跳过
  ? [L] extends [U]
    ? [L, ...Filter0<R, U>]
    : Filter0<R, U>
  : [];
查找指定类型在元组中的索引位置
/**
 * 判断两个类型是否严格相等，返回对应的结果类型
 * @template T - 待比较的第一个类型
 * @template U - 待比较的第二个类型
 * @template Success - 相等时返回的类型
 * @template Fail - 不相等时返回的类型
 * 
 * 实现原理：
 * 1. 双重extends约束确保双向兼容
 * 2. 通过keyof对比确保属性键完全一致
 * 3. 避免any的特殊情况（如any extends其他类型的情况）
 */
type IsEqual<T, U, Success, Fail> = [T] extends [U]
  ? [U] extends [T]
    ? keyof T extends keyof U
      ? keyof U extends keyof T
        ? Success  // 严格相等情况
        : Fail     // 属性键不完全匹配
      : Fail       // 属性键范围不一致
    : Fail         // 单向extends不成立
  : Fail;          // 基础类型不兼容

/**
 * 查找指定类型在元组中的索引位置
 * @template T - 要搜索的元组类型
 * @template U - 要查找的目标类型
 * @template F - 累计器元组（用于记录已遍历元素）
 * 
 * 实现原理：
 * 1. 通过递归解构元组：分解为第一个元素L和剩余元素R
 * 2. 使用累计器记录已遍历元素的数量
 * 3. 当找到匹配项时返回当前累计器长度作为索引
 */
export type FindIndex<T extends any[], U, F extends any[] = []> = T extends [
  infer L,
  ...infer R
]
  ? IsEqual<L, U, F["length"], FindIndex<R, U, [...F, L]>>  // 递归搜索剩余元素
  : -1;  // 遍历完成未找到目标

type Tuples = [any, never, 3, "4", true];

// 测试用例：
type FindIndex1 = FindIndex<Tuples, 3>;        // 预期结果：2
type FindIndex2 = FindIndex<Tuples, "4">;      // 预期结果：3
type FindIndex3 = FindIndex<Tuples, true>;     // 预期结果：4
type FindIndex4 = FindIndex<Tuples, never>;    // 预期结果：1
type FindIndex5 = FindIndex<Tuples, any>;      // 预期结果：0（注意any的特殊匹配行为）
将字符串元组类型转换为枚举对象类型
import { FindIndex } from "./index";
/**
 * 将字符串元组类型转换为枚举对象类型
 *
 * @template T - 输入字符串元组类型（必须为字符串字面量类型数组）
 * @template IsNumber - 布尔类型标记，决定枚举值类型：
 *                      true表示使用数字索引，false表示使用原始字符串值（默认false）
 *
 * @returns {{
 *   readonly [K in T[number]]: IsNumber extends true
 *     ? FindIndex<T, K>  // 当IsNumber为true时值为元素索引
 *     : K                // 当IsNumber为false时值为元素本身
 * }} 生成的枚举类型对象，属性为只读
 */
type TupleToEnum<T extends string[], IsNumber extends boolean = false> = {
  readonly [K in T[number]]: IsNumber extends true ? FindIndex<T, K> : K;
};

// 示例1：使用默认配置（字符串值枚举）
type TupleToEnumResult = TupleToEnum<["Mac", "Window", "Linux"]>;

// 示例2：启用数字索引枚举
type TupleToEnumResult2 = TupleToEnum<["Mac", "Window", "Linux"], true>;

实现类似数组slice方法的元组切片
/**
 * 实现类似数组slice方法的元组切片类型
 * 
 * @typeParam T - 原始元组类型
 * @typeParam S - 切片起始位置索引（包含）
 * @typeParam E - 切片结束位置索引（不包含），默认取元组长度
 * @typeParam SA - 【内部参数】记录已处理元素数量，用于判断起始位置
 * @typeParam SE - 【内部参数】记录已收集元素数量，用于判断结束位置
 * @typeParam F - 【内部参数】最终收集的结果元组
 * 
 * @returns 从T中提取[S,E)范围的子元组类型
 */
type Slice<
  T extends any[],
  S extends number,
  E extends number = T["length"],
  SA extends any[] = [],  // Start Accumulator
  SE extends any[] = [],  // Slice Elements
  F extends any[] = []    // Final Result
> = T extends [infer L, ...infer R]
  ? SA["length"] extends S  // 判断是否到达起始位置
    ? SE["length"] extends E  // 判断是否到达结束位置
      ? [...F, L] // 终止条件：返回结果
      : // 收集元素直到结束位置
        Slice<R, S, E, SA, [...SE, null], [...F, L]>
    : // 移动起始位置指针
      Slice<R, S, E, [...SA, null], [...SE, null], F>
  : F;  // 处理空元组时直接返回结果

type Tuples = [any, never, 3, "4", true, boolean];

type TuplesRes1 = Slice<Tuples, 0, 2>;
type TuplesRes2 = Slice<Tuples, 1, 3>;
type TuplesRes3 = Slice<Tuples, 1, 2>;
type TuplesRes4 = Slice<Tuples, 2>;
type TuplesRes5 = Slice<[any], 2>;
type TuplesRes6 = Slice<[], 0>;

实现类似数组splice方法
/**
 * 实现类似数组splice方法的类型操作，支持删除、插入和替换元组元素
 * 
 * @template T - 原始元组类型
 * @template S - 起始索引位置（从0开始）
 * @template E - 需要删除的元素数量
 * @template I - 要插入的新元素组成的元组（默认为空元组）
 * @template SA - 用于计数起始位置的累积数组（内部使用）
 * @template EA - 用于计数删除数量的累积数组（内部使用）
 * @template F - 最终结果的前半部分累积数组（内部使用）
 * 
 * @returns 处理后的新元组类型
 */
type Splice<
  T extends any[],
  S extends number,
  E extends number,
  I extends any[] = [],
  SA extends any[] = [],
  EA extends any[] = [],
  F extends any[] = []
> = T extends [infer L, ...infer R]
  ? SA["length"] extends S
    ? EA["length"] extends E
      // 当找到起始位置且完成删除数量时，合并结果
      ? [...F, ...I, ...T]
      // 处理删除操作，继续计数删除数量
      : Splice<R, S, E, I, SA, [...EA, null], F>
    // 寻找起始位置阶段，累积元素到F数组
    : Splice<R, S, E, I, [...SA, null], [...EA, null], [...F, L]>
  // 原始数组遍历完成后返回累积结果
  : F;

/**
 * 示例元组类型
 */
type Tuples = [string, number, boolean, null, undefined, never];

// 测试用例：
type TuplesRes1 = Splice<Tuples, 0, 2>;        // 从索引0删除2个元素
type TuplesRes2 = Splice<Tuples, 1, 3>;        // 从索引1删除3个元素
type TuplesRes3 = Splice<Tuples, 1, 2, [1, 2, 3]>; // 从索引1删除2个元素并插入新元素
结构型
提取对象类型中的可选属性键
/**
 * 提取对象类型中的可选属性键
 * 
 * 该类型通过映射类型和条件类型实现，会遍历对象所有属性键，
 * 判断哪些属性是可选属性，最终返回可选属性的键名联合类型
 * 
 * @typeParam T - 需要处理的对象类型，必须继承自 Record<string, any>
 * @returns 返回由可选属性键组成的联合类型（如果不存在可选属性则返回 never）
 */
type OptionalKeys<T extends Record<string, any>> = {
  // 使用映射类型遍历所有属性键，通过 -? 移除可选修饰符后比较类型差异
  // 当原始类型与 Required<T> 的对应属性类型不同时，保留当前键名 K
  [K in keyof T]-?: T[K] extends Required<T>[K] ? never : K ;
}[keyof T]; // 通过索引访问将对象值类型转换为联合类型

/**
 * 另一种实现方式的类型工具，用于提取对象可选属性键
 * 
 * 通过递归遍历属性键，利用 Omit 类型验证属性可选性：
 * 1. 当移除某个属性 K 后类型仍与原类型兼容，则 K 是可选属性
 * 2. 通过条件类型判断返回结果，最终收集所有符合条件的属性键
 * 
 * @typeParam T - 需要处理的对象类型
 * @typeParam K - 泛型参数，默认值为 keyof T（自动推导对象键集合）
 */
type OptionalKeys0<T extends object, K = keyof T> = K extends keyof T
  ? Omit<T, K> extends T  // 验证移除属性 K 后是否仍兼容原类型
    ? K                   // 兼容则说明 K 是可选属性
    : never               // 不兼容则为必选属性
  : never;

// =============== 测试用例 =============== 
// 常规可选属性测试
type OptionalKeys1 = OptionalKeys<{      // 预期类型：'bar' | 'flag'
  foo: number | undefined;
  bar?: string;
  flag?: boolean;
}>;

// 混合必选/可选属性测试
type OptionalKeys2 = OptionalKeys<{      // 预期类型：'bar'
  foo: number;
  bar?: string;
  flag: boolean;
}>;

// 全必选属性测试
type OptionalKeys3 = OptionalKeys<{      // 预期类型：never
  foo: number;
  bar: string;
  flag: boolean;
}>;

// 全可选属性测试
type OptionalKeys4 = OptionalKeys<{      // 预期类型：'foo' | 'bar' | 'flag'
  foo?: number;
  bar?: string;
  flag?: boolean;
}>;

// 空对象测试
type OptionalKeys5 = OptionalKeys<{}>;   // 预期类型：never

// =============== 替代实现的测试用例 =============== 
type OptionalKeys6 = OptionalKeys0<{     // 预期类型：'bar' | 'flag'
  foo: number | undefined;
  bar?: string;
  flag?: boolean;
}>;

type OptionalKeys7 = OptionalKeys0<{     // 预期类型：'bar'
  foo: number;
  bar?: string;
  flag: boolean;
}>;

type OptionalKeys8 = OptionalKeys0<{     // 预期类型：never
  foo: number;
  bar: string;
  flag: boolean;
}>;

type OptionalKeys9 = OptionalKeys0<{     // 预期类型：'foo' | 'bar' | 'flag'
  foo?: number;
  bar?: string;
  flag?: boolean;
}>;

type OptionalKeys10 = OptionalKeys0<{}>; // 预期类型：never
选取对象类型中所有可选属性
/**
 * 选取对象类型T中所有可选属性组成的新类型
 * 
 * @template T - 需要处理的对象类型
 * @returns 由T中所有可选属性组成的新对象类型
 * 
 * 实现原理：
 * 1. 通过映射类型遍历T的所有属性K
 * 2. 使用条件类型比较T[K]与Required<T>[K]的兼容性
 * 3. 如果T[K]是可选属性，则保留该属性，否则通过never过滤
 */
type PickOptional<T> = {
  [K in keyof T as T[K] extends Required<T>[K] ? never : K]: T[K];
};

/**
 * 备选实现方案：通过Pick和条件类型筛选可选属性
 * 
 * @template T - 需要处理的对象类型（必须继承object）
 * @returns 由T中所有可选属性组成的新对象类型
 * 
 * 实现差异：
 * 1. 使用Pick工具类型构造新类型
 * 2. 通过Record验证属性是否必需
 * 3. 最终通过索引类型[keyof T]获取所有符合条件的属性键
 */
type PickOptional0<T extends object> = Pick<T, {
  [K in keyof T]: T extends Record<K, T[K]> ? never : K
}[keyof T]>;

// 测试用例类型验证：
type PickOptional1 = PickOptional<{  // 期望得到 { bar?: number }
  foo: string;
  bar?: number;
  flag: boolean;
}>;

type PickOptional2 = PickOptional<{  // 期望得到 {}
  foo: string;
  bar: number;
  flag: boolean;
}>;

type PickOptional3 = PickOptional<{  // 期望得到 { foo?: string; bar?: number; flag?: boolean }
  foo?: string;
  bar?: number;
  flag?: boolean;
}>;
获取对象类型中所有必需属性
/**
 * 获取对象类型 T 中所有必需属性的键组成的联合类型
 * 
 * 实现原理：
 * 1. 使用映射类型遍历 T 的所有属性键 K
 * 2. 通过条件类型判断 T[K] 是否与 Required<T>[K] 相同
 * 3. 如果相同则保留该键，否则排除（转为 never）
 */
type RequiredKeys<T> = keyof {
  [K in keyof T as T[K] extends Required<T>[K] ? K : never]: T[K];
};

// 测试用例：包含可选属性的对象类型
type RequiredKeys1 = RequiredKeys<{
  foo: string;
  bar?: number;
  flag: boolean;
}>; // 期望结果："foo" | "flag"

// 测试用例：全部属性都是必需的对象类型
type RequiredKeys2 = RequiredKeys<{
  foo: string;
  bar: number;
  flag: boolean;
}>; // 期望结果："foo" | "bar" | "flag"

// 测试用例：全部属性都是可选的对象类型
type RequiredKeys3 = RequiredKeys<{
  foo?: string;
  bar?: number;
  flag?: boolean;
}>; // 期望结果：never

/**
 * 另一种实现方式：通过属性排除法判断必需属性
 * 
 * @template T - 原始对象类型
 * @template K - 待检查的属性键（默认所有键）
 * 
 * 实现逻辑：
 * 1. 使用条件类型遍历每个属性键 K
 * 2. 如果排除 K 后的类型可以扩展原始类型，说明 K 是可选的
 * 3. 否则 K 是必需的
 */
type RequiredKeys0<T extends object, K = keyof T> = K extends keyof T
? Omit<T, K> extends T  
  ? never                   // 当 K 是可选项时返回 never
  : K                       // 当 K 是必选项时返回 K
: never;

// 测试用例：包含可选属性的对象类型
type RequiredKey4 = RequiredKeys0<{
  foo: string;
  bar?: number;
  flag: boolean;
}>; // 期望结果："foo" | "flag"

// 测试用例：全部属性都是必需的对象类型
type RequiredKey5 = RequiredKeys0<{
  foo: string;
  bar: number;
  flag: boolean;
}>; // 期望结果："foo" | "bar" | "flag"

// 测试用例：全部属性都是可选的对象类型
type RequiredKey6 = RequiredKeys0<{
  foo?: string;
  bar?: number;
  flag?: boolean;
}>; // 期望结果：never
提取对象类型中的所有必选属性
/**
 * 提取对象类型 T 中的所有必选属性构成的新类型
 * @template T - 源对象类型（需继承 object）
 * @returns {object} 仅包含必选属性的新对象类型
 */
type PickRequired<T extends object> = {
  // 通过映射类型判断属性是否为必选：比较原始属性类型与 Required<T> 中对应属性类型
  // 当 T[K] 严格匹配 Required<T>[K] 时保留该属性，否则排除
  [K in keyof T as T[K] extends Required<T>[K] ? K : never]: T[K];
};

/**
 * 创建仅包含 T 中必选属性的对象类型（使用 Pick 工具类型的语法糖）
 * @template T - 源对象类型（需继承 object）
 * @returns {object} 通过 Pick 工具类型筛选后的对象类型
 */
type PickRequired0<T extends object> = Pick<T, keyof PickRequired<T>>;

type PickRequired1 = PickRequired<{
  foo: string;
  bar?: number;
  flag: boolean;
}>;
type PickRequired2 = PickRequired<{
  foo: string;
  bar: number;
  flag: boolean;
}>;
type PickRequired3 = PickRequired<{
  foo?: string;
  bar?: number;
  flag?: boolean;
}>;

type PickRequired4 = PickRequired0<{
  foo: string;
  bar?: number;
  flag: boolean;
}>;
type PickRequired5 = PickRequired0<{
  foo: string;
  bar: number;
  flag: boolean;
}>;
type PickRequired6 = PickRequired0<{
  foo?: string;
  bar?: number;
  flag?: boolean;
}>;
判断泛型类型是否为never类型
/**
 * 判断泛型类型T是否为never类型
 * 
 * 该类型通过将泛型T包装为单元素元组类型，避免条件类型在联合类型情况下的分布式特性
 * 从而准确检测never类型
 * 
 * @typeParam T - 需要判断的泛型类型
 * @returns 当T为never时返回true，否则返回false
 */
type IsNever<T> = [T] extends [never] ? true : false;

// 测试用例：
// 检测never类型应返回true
type IsNever1 = IsNever<never>;

// 常规类型应返回false
type IsNever2 = IsNever<string>;
type IsNever3 = IsNever<undefined>;
type IsNever4 = IsNever<null>;

// any类型不符合never定义，返回false
type IsNever5 = IsNever<any>;
判断泛型类型T是否为空对象类型
/**
 * 判断泛型类型T是否为空对象类型
 * 
 * 该类型通过双重条件检测：
 * 1. 首先验证T是否继承自object类型，过滤基础类型
 * 2. 然后检测T的键集合是否为空，通过keyof T extends never实现
 * 
 * @typeParam T - 需要判断的泛型类型
 * @returns 当T为空对象类型时返回true，否则返回false
 */
type IsEmpty<T> = T extends object 
  ? keyof T extends never 
    ? true 
    : false 
  : false;

// 测试用例：
type IsEmpty1 = IsEmpty<string>;        // false
type IsEmpty2 = IsEmpty<number>;        // false
type IsEmpty3 = IsEmpty<boolean>;       // false
type IsEmpty4 = IsEmpty<undefined>;     // false
type IsEmpty5 = IsEmpty<null>;          // false
type IsEmpty6 = IsEmpty<any>;           // false
type IsEmpty7 = IsEmpty<never>;         // false
type IsEmpty8 = IsEmpty<unknown>;       // false
type IsEmpty9 = IsEmpty<{}>;            // true
type IsEmpty10 = IsEmpty<[]>;           // false (数组有length等属性)
type IsEmpty11 = IsEmpty<{ a: 1 }>;     // false
type IsEmpty12 = IsEmpty<object>;       // false
type IsEmpty13 = IsEmpty<Object>;       // false
判断给定类型是否为 any 类型
/**
 * 判断给定类型 T 是否为 any 类型
 * 
 * @template T - 需要检查的目标类型
 * @returns {true | false} - 返回 true 当且仅当 T 是 any 类型，否则返回 false
 * 
 * @原理说明
 * 该类型检查利用 TypeScript 的交叉类型特性：
 * 1. 当 T 为 any 时，1 & T 会得到 any 类型（因为 any 具有"传染性"特性）
 * 2. 此时 0 extends any 成立（因为 any 可以视为所有类型的超类型）
 * 3. 当 T 不是 any 时，1 & T 会正常执行类型交叉运算，0 extends (...) 必然不成立
 */
type IsAny<T> = 0 extends (1 & T) ? true : false;

// 以下为测试用例，验证不同类型的行为：
type IsAny1 = IsAny<string>;        // false：明确类型
type IsAny2 = IsAny<number>;        // false：明确类型
type IsAny3 = IsAny<boolean>;       // false：明确类型
type IsAny4 = IsAny<undefined>;     // false：明确类型
type IsAny5 = IsAny<null>;          // false：明确类型
type IsAny6 = IsAny<any>;           // true：检测目标类型
type IsAny7 = IsAny<never>;         // false：特殊底部类型
type IsAny8 = IsAny<unknown>;       // false：安全顶层类型
type IsAny9 = IsAny<{}>;            // false：空对象类型
type IsAny10 = IsAny<[]>;           // false：数组类型
type IsAny11 = IsAny<{ a: 1 }>;     // false：结构类型
type IsAny12 = IsAny<object>;       // false：对象类型
type IsAny13 = IsAny<Object>;       // false：内置对象类型
将模块方法转换为新的连接器形式
/**
 * 表示一个带泛型载荷和类型标识的动作对象
 * @template T - 动作负载的数据类型
 */
interface Action<T> {
  payload: T;
  type: string;
}

/**
 * 表示包含状态和方法的模块结构
 */
interface Module {
  count: number;
  message: string;
  
  /**
   * 异步处理方法
   * @template T - 输入Promise的解析类型
   * @template U - 输出Action的负载类型
   * @param input - 接收的Promise输入
   * @returns 包装后的Promise动作
   */
  asyncMethod<T, U>(input: Promise<T>): Promise<Action<U>>;

  /**
   * 同步处理方法
   * @template T - 输入Action的负载类型
   * @template U - 输出Action的负载类型
   * @param action - 接收的动作对象
   * @returns 转换后的新动作对象
   */
  syncMethod<T, U>(action: Action<T>): Action<U>;
}

/**
 * 类型转换工具：将模块方法转换为新的连接器形式
 * @template T - 需要转换的原始模块类型
 * 
 * 转换规则：
 * 1. 筛选出所有函数类型属性
 * 2. 对异步方法：将输入Promise<T>转换为直接接收T，输出保持Action<U>
 * 3. 对同步方法：将输入Action<T>转换为直接接收T，输出保持Action<U>
 */
type Connect<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => any
    ? K
    : never]: T[K] extends (input: Promise<infer A>) => Promise<infer B>
    ? (input: A) => Action<B>
    : T[K] extends (action: Action<infer C>) => Action<infer D>
    ? (action: C) => Action<D>
    : never;
};

/**
 * 最终转换结果类型：
 * - 异步方法接收原始类型参数，返回包装后的动作
 * - 同步方法接收原始类型参数，返回转换后的动作
 */
type Result = Connect<Module>;

export default {};
将联合类型转换为交叉类型的工具类型
/**
 * 将联合类型转换为交叉类型的工具类型
 *
 * @template U - 需要转换的联合类型
 * @returns {I} - 转换后的交叉类型
 *
 * 实现原理：
 * 1. 通过分布式条件类型将联合类型拆分为函数参数类型
 * 2. 利用函数参数的逆变特性，将参数类型转换为交叉类型
 * 3. 通过条件类型推断最终的交集类型
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

/**
 * 测试用例：
 * 将 {a:string} | {b:string} | {c:string} 联合类型
 * 转换为 {a:string} & {b:string} & {c:string} 交叉类型
 */
type UnionToIntersection1 = UnionToIntersection<
  { a: string } | { b: string } | { c: string }
>;

将联合类型转换为元组类型的工具类型
/**
 * 辅助类型，用于提取联合类型中的单个类型元素
 * 
 * @typeParam T - 需要处理的联合类型
 * @returns 从联合类型中提取出的单个类型元素
 * 实现原理：
 * 1. 处理boolean类型的特殊情况
 * 2. 通过双重条件类型推断提取类型参数
 * 3. 利用函数参数逆变特性获取联合类型中的元素
 */
type Transform<T> = boolean extends T ? boolean : (
  T extends any ? (a: (P: T) => any) => any : never
) extends (a: infer P) => any
  ? P extends (a: infer R) => any
    ? R
    : never
  : never;

/**
 * 将联合类型转换为元组类型的工具类型
 * 
 * @typeParam T - 需要转换的联合类型
 * @typeParam A - 内部使用的辅助类型参数（自动推断）
 * @returns 转换后的元组类型，元素顺序遵循TypeScript的类型推断顺序
 */
type UnionToTuple<T, A = Transform<T>> = [T] extends [never]
  ? []  // 基础情况：当联合类型被完全分解后返回空数组
  : [...UnionToTuple<Exclude<T, A>>, A];  // 递归构建元组，每次提取一个类型元素


type UnionToTuple1 = UnionToTuple<1 | 2 | 3>;
type UnionToTuple2 = UnionToTuple<"a" | "b" | "c">;
type UnionToTuple3 = UnionToTuple<1 | 2 | boolean | string>;
type UnionToTuple4 = UnionToTuple<never>;

