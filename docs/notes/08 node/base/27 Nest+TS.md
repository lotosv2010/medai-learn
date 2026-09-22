# 一、Reflect
## Reflect
+ `Reflect` 对象与 `Proxy` 对象一样，也是 `ES6` 为了操作对象提供的新的 `API`。
+ `JS`. 的装饰器更多的是存在于对函数或者属性进行一些操作，比如修改它们的值，代理变量，自动绑定 `this`等等功能
+ 但是却无法实现通过反射来获取究竟有哪些装饰器添加到这个类/方法上，于是`Reflect Metadata`应运而生。

## Reflect Metadata
+ `Reflect Metadata` 简单来说，你可以通过装饰器来给类添加一些自定义的信息
+ 然后通过反射将这些信息提取出来

### defineMetadata
+ 安装插件
+ 在 `tsconfig.json` 里配置 `emitDecoratorMetadata` 选项。

```shell
npm i reflect-metadata -D 
```

+ 用法

```typescript
import 'reflect-metadata';
function metadata(): string {
  const target = {};
  Reflect.defineMetadata('name', 'hello', target);
  Reflect.defineMetadata('name', 'world', target, 'getName');
  const hello: string = Reflect.getOwnMetadata('name', target); // hello
  const world: string = Reflect.getMetadata('name', target, 'getName'); // world
  return `${hello} ${world}`; // hello world
}
```

### decorator
```typescript
import 'reflect-metadata';
@Reflect.metadata('name', 'Person') // 给类本身增加元数据
class Person {
  @Reflect.metadata('name', 'hello') // 给类的原型增加元数据
  hello(): string {
    return 'world';
  }
}
function decorator(): string {
  const name = Reflect.getMetadata('name', Person);
  const hello = Reflect.getMetadata('name', Person.prototype, 'hello');
  return `${name} ${hello}`; // Person hello
}
```

```typescript
// decorator
// 装饰器工厂
function classMetadata(key, value) {
  return function (target) {
    Reflect.defineMetadata(key, value, target);
  };
}
// 装饰器工厂
function methodMetadata(key, value) {
  return function (target, propertyKey) {
    Reflect.defineMetadata(key, value, target, propertyKey);
  };
}
// @Reflect.metadata('name', 'Person') // 给类本身增加元数据
@classMetadata('name', 'Person')
class Person {
  // @Reflect.metadata('name', 'hello') // 给类的原型增加元数据
  @methodMetadata('name', 'hello')
  hello(): string {
    return 'world';
  }
}
function decorator(): string {
  const name = Reflect.getMetadata('name', Person);
  const hello = Reflect.getMetadata('name', Person.prototype, 'hello');
  return `${name} ${hello}`;
}
```

### 参考
[Reflect Metadata | 深入理解 TypeScript](https://jkchao.github.io/typescript-book-chinese/tips/metadata.html#%E5%9F%BA%E7%A1%80)



[reflect-metadata](https://www.npmjs.com/package/reflect-metadata)

## tsconfig
### tsconfig.json
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "es2017",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true
  }
}
```

### tsconfig.build.json
```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

# 二、IOC和DI
## 类
### 问题
    - 无法创建不同的组件
    - 需要在类的内部手动创建组件

```typescript
interface Monitor {
  size: number;
}
class Monitor27inch implements Monitor {
  size: number;
}
interface Host {
  cpu: string;
}
class LegendHost implements Host {
  cpu: string;
}
/**
 * 问题：
 *  1.无法创建不同的组件
 *  2.需要在类的内部手动创建组件
 */
export class Computer {
  monitor: Monitor;
  host: Host;
  constructor() {
    this.monitor = new Monitor27inch();
    this.host = new LegendHost();
  }
  start() {
    console.log('组装好了，可以开机了!');
  }
}

const computer = new Computer();
computer.start();
```

### 解决方案
```typescript
interface Monitor {
  size: number;
}
export class Monitor27inch implements Monitor {
  size: number;
}
interface Host {
  cpu: string;
}
export class LegendHost implements Host {
  cpu: string;
}
export class Computer {
  monitor: Monitor;
  host: Host;
  constructor(monitor, host) {
    this.monitor = monitor;
    this.host = host;
  }
  start() {
    console.log('组装好了，可以开机了!');
  }
}

const monitor = new Monitor27inch();
const host = new LegendHost();
const computer = new Computer(monitor, host);
computer.start();
```

## IoC和DI
### IoC
+ `IoC: Inversion of Control`
+ `IoC`: 控制反转。
+ 在开发中，Ioc意味着你设计好的对象交给容器控制，而不是使用传统的方式，在对象内部直接控制。
+ **<font style="color:#F5222D;">谁控制谁，控制什么，为何反转，哪些方面反转了？</font>**
    - 谁控制谁，控制什么：在传统的程序设计中，我们直接在对象内部通过new的方式创建对象，是程序主动创建依赖对象；而IoC是有专门一个容器来创建这些对象，即由IoC容器控制对象的创建；谁控制？当然是IoC容器控制了对象；控制什么？主要是控制外部资源(依赖对象)获取。
    - 为何反转，哪些方面反转了：有反转就有正转，传统应用程序是由我们自己在程序中主动控制去获取依赖对象，也就是正转；而反转则是由容器来帮忙创建及注入依赖对象；为何反转？因为容器帮我们查找及注入以来对象，对象只是被动的接受依赖对象，所以是反转了；哪些方面反转了？依赖对象的获取被反转了。
+ IoC是一种思想，是面向对象编程中的一种设计原则，可以用来减低计算机代码之间的耦合度。
+ 传统应用程序都是由我们在类内部主动创建依赖对象，从而导致类与类之间高耦合，难于测试；有了IoC容器后，把创建和查找依赖对象的控制权交给了容器，由容器注入组合对象，所以对象之间是松散耦合。这样也便于测试，利于功能复用，更重要的是使得程序的整个体系结构变得非常灵活。
+ 其实IoC对编程带来的最大改变不是从代码上，而是思想，发生了主从换位的变化。应用程序本来是老大，要获取什么资源都是主动出击，但在IoC思想中，应用程序就变成被动了，被动的等待IoC容器来创建并注入它所需的资源了。

### DI
+ `DI: Dependency Injection`
+ `DI`: 依赖注入。
+ 对于控制反转来说，其中最常见饿方式叫做依赖注入。
+ 组件之间的依赖关系由容器在运行期决定，形象的说，即由容器动态的将某个依赖关系注入到组件中。
+ 通过依赖注入机制，我们只需要通过简单的配置，而无需任何代码就可指定目标需要的资源，完成自身的业务逻辑，而不需要关心具体的资源来自何处，由谁实现。
+ 理解DI的关键是：**<font style="color:#F5222D;">谁依赖了谁，为什么需要依赖，谁注入了谁，注入了什么？</font>**
    - 谁依赖了谁：当然是应用程序依赖IoC容器。
    - 为什么需要依赖：应用程序需要IoC容器来提供对象需要的外部资源(包括对象、资源、常量数据)。
    - 谁注入了谁：很明显是IoC容器注入应用程序依赖的对象。
    - 注入了什么：注入了某个对象所需的外部资源(包括对象、资源、常量数据)。
+ IoC 和 DI是同一个概念的不同角度描述，依赖注入明确描述了被注入对象依赖IoC容器配置依赖对象。



<!-- 这是一张图片，ocr 内容为：服务的使用者需要知道服务本身和其赖关系是如何创建的并且需要手工维护依赖关系 -1.买车 车子 依赖 女朋友 创建 3.创建 依赖 房子 2.买房 系统中的服务会统一注册到loc容路中如果服务有依赖其他服务时,也需要对依教进行明 当用户需要使用特定的服务时,loC容器会负责该服务及其依教对象的创建与管理工作 领取 国家 房子 车子 注册 注册 (loc容器) 声明依赖 女朋友 声明依赖 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1626155163468-685535c3-c218-44c2-a557-f2d514e5989f.png)



# 三、Nestjs
+ <font style="color:rgb(77, 77, 77);">Nest 是一个用于构建高效，可扩展的 </font>[Node.js](http://nodejs.cn/)<font style="color:rgb(77, 77, 77);"> 服务器端应用程序的框架。它使用渐进式 JavaScript，内置并完全支持 </font>[TypeScript](https://www.tslang.cn/)<font style="color:rgb(77, 77, 77);">（但仍然允许开发人员使用纯 JavaScript 编写代码）并结合了 OOP（面向对象编程），FP（函数式编程）和 FRP（函数式响应编程）的元素。</font>
+ <font style="color:rgb(77, 77, 77);">Nest 提供了一个开箱即用的应用程序架构，允许开发人员和团队创建高度可测试，可扩展，松散耦合且易于维护的应用程序。</font>

## 安装
```shell
$ npm i -g @nestjs/cli
$ nest new project-name
```

## 应用
### src
#### main.ts
`src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

#### app.module.ts
`src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  UseClassLoggerService,
  UseValueLoggerService,
  UseFactoryLoggerService,
  UseStringTokenLoggerService,
} from './logger.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    // 配置提供者的几种方式
    AppService,
    {
      provide: UseClassLoggerService, // token或者叫标识
      useClass: UseClassLoggerService, // 注册的是一个类
    },
    {
      provide: UseValueLoggerService,
      useValue: new UseValueLoggerService(),
    },
    {
      provide: UseFactoryLoggerService,
      useFactory: () => new UseFactoryLoggerService(),
    },
    // todo: 自定义token
    {
      provide: 'stringToken',
      useClass: UseStringTokenLoggerService,
    },
  ], // todo：注册
})
export class AppModule {}
```

#### app.controller.ts
`src/app.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  // todo：依赖注入，只要在构造函数里面声明依赖，IoC容器会自动注入实例，可以直接调用了，不需要手动创建
  constructor(private readonly appService: AppService) {}

  // 控制器一般是用来接受参数，返回响应，不做业务处理
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
```

#### app.service.ts
`src/app.service.ts`

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { metadata, decorator } from './Reflect';
import {
  UseClassLoggerService,
  UseValueLoggerService,
  UseFactoryLoggerService,
  UseStringTokenLoggerService,
} from './logger.service';

@Injectable() // 可被注入其他服务
export class AppService {
  constructor(
    private useClassLoggerService: UseClassLoggerService,
    private useValueLoggerService: UseValueLoggerService,
    private useFactoryLoggerService: UseFactoryLoggerService,
    @Inject('stringToken') // 注入token
    private useStringTokenLoggerService: UseStringTokenLoggerService,
  ) {}
  getHello(): string {

    this.useClassLoggerService.log('useClassLoggerService');
    this.useValueLoggerService.log('useValueLoggerService');
    this.useFactoryLoggerService.log('useFactoryLoggerService');
    this.useStringTokenLoggerService.log('useStringTokenLoggerService');

    return `res: ${res} 
      <br>
      res2:${res2}`;
  }
}
```

#### logger.service.ts
`src/logger.service.ts`

```typescript
export class UseClassLoggerService {
  log(message) {
    console.log(message);
  }
}

export class UseValueLoggerService {
  log(message) {
    console.log(message);
  }
}

export class UseFactoryLoggerService {
  log(message) {
    console.log(message);
  }
}

export class UseStringTokenLoggerService {
  log(message) {
    console.log(message);
  }
}
```

# 四、IoC实现
<!-- 这是一张图片，ocr 内容为：MapsTokencany>,Providercany>> ClassProvider 6.存储 8.获取ClassProvider和依 赖 5.注册 3.声明依赖 ValueProvider 1.注册 loc容器 4.声明依赖 9.注入依赖 2.注册 (alueProvider,FactoryProvider) 7.获取实例 FactoryProvider 10.创建ClassProvider实例 用户 -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1626171784701-300b0b7f-f4fc-4c48-9e92-3d1039c67f19.png)

## 装饰器
[05 类](https://www.yuque.com/lotosv2010/olve0m/pyha9c#2QvcY)

## __metadata
+ `__metadata`: 执行装饰器的函数，被执行的装饰器分为四类，类装饰器、参数装饰器、方法装饰器，还有一类特殊的装饰是 `TS` 编译选项 `emitDecoratorMedata` 生成的装饰器，用来定义一些特殊元数据 `design:paramtypes`等，这些特殊元数据可以获取编译之前的类型信息
    - 类类型元数据使用元数据键 `design:type`
    - 参数类型元数据使用元数据键 `design:paramtypes`
    - 返回值类型元数据使用元数据键 `design:returntype`
+ `__metadata`: 类装饰器工厂，获取的装饰器会将指定键值对与类关联起来
+ `__param`: 参数装饰器工厂，根据参数下标、参数装饰器、获取最终的装饰器，并且将参数下标传递给装饰器

<!-- 这是一张图片，ocr 内容为：classwife( constructort privatecar.Car @InjectCnewinjectiontokenfLogger)privateloggeserviceoggerSerice )0 编译 Wifeadecorate( param(.nject(newinjectionToken(Logger). metdata(desigiparamtypes.[carLoggerservice. functionInject(token:Tokencany>) var_param-function(paramindex.decorator retumtunction(argetany.propertyNametingmlim returnfuncition(target,key) REFFectDEneMeTADAta(INJECTMETADATAKEY.tken decorator(targetkey.paramindex): 'index-s(index)): returntarget J: Y -->
![](https://cdn.nlark.com/yuque/0/2021/png/738210/1626234452544-bfd74fde-8eb1-49be-8a8d-e18e8af14fd1.png)

## 实现IoC
### Ioc
#### index.ts
`ioc/index.ts`

```typescript
export * from './container';
```

#### Container.ts
`ioc/Container.ts`

```typescript
/**
 * @description 容器
 * @author gwb
 * @date 2021-07-14 09:39:23
 * @export
 * @class Container
 */
import {
  Token,
  Provider,
  isClassProvider,
  isValueProvider,
  isFactoryProvider,
  ClassProvider,
  ValueProvider,
  FactoryProvider,
  InjectionToken,
} from './provider';
import { Type } from './type';
import { getInjectionToken } from './inject';

type InjectableParams = Type<any>;

const DESIGN_PARAMTYPES = 'design:paramtypes';
export class Container {
  public providers = new Map<Token<any>, Provider<any>>();
  // 注册提供者
  addProvider<T>(provider: Provider<T>) {
    // provider 就是token或者是标识符
    this.providers.set(provider.provide, provider);
  }
  // 根据token创建对应的值
  inject(token: Token<any>) {
    const provider: Provider<any> = this.providers.get(token);
    console.log('token', token);
    return this.injectWithProvider(token, provider);
  }
  injectWithProvider<T>(token: Token<T>, provider: Provider<T>): T {
    if (provider == undefined) {
      throw new Error(`No provider for type of ${this.getTokenName(token)}`);
    }
    if (isClassProvider(provider)) {
      return this.injectClass(provider);
    } else if (isValueProvider(provider)) {
      return this.injectValue(provider);
    } else if (isFactoryProvider(provider)) {
      return this.injectFactory(provider);
    } else {
      throw new Error(`
        This provider ${provider},  
        token name ${this.getTokenName(token)}
        is not supported`);
    }
  }
  injectClass<T>(provider: ClassProvider<T>): T {
    // return new provider.useClass(); // 等价下面的方式
    // todo: 获取参数
    const target = provider.useClass;
    const params = this.getInjectedParams(target);
    return Reflect.construct(target, params);
  }
  injectValue<T>(provider: ValueProvider<T>): T {
    return provider.useValue;
  }
  injectFactory<T>(provider: FactoryProvider<T>): T {
    return provider.useFactory();
  }
  // 从类上获取到注入的参数
  getInjectedParams<T>(target: Type<T>) {
    const argTypes = <Array<InjectableParams> | undefined>(
      Reflect.getMetadata(DESIGN_PARAMTYPES, target)
    );
    if (argTypes === undefined) {
      return [];
    }
    // 把数组做一个转换，从type数组转换成对应的提供者的实例
    return argTypes.map((argType, index) => {
      const overrideToken = getInjectionToken(target, index);
      const actualToken = !overrideToken ? argType : overrideToken;
      const provider = this.providers.get(actualToken);
      return this.injectWithProvider(actualToken, provider);
    });
  }
  // token是一个类
  getTokenName<T>(token: Token<T>) {
    return token instanceof InjectionToken
      ? token.injectionIdentifier
      : token.name;
  }
}
```

#### provider.ts
`ioc/provider.ts`

```typescript
import { Type } from './type';

// 针对字符串类型的token，编写一个InjectionToken类
// 为什么不能直接用字符串当token，因为可能重名
export class InjectionToken {
  constructor(public injectionIdentifier: string) {}
}
// Type<T>等价于一个类
// todo: 如果有多个字符串类型的token的话，会实例话不同的类实例，例如Logger，Find两个。
// string Logger new InjectionToken('Logger')
// string Find new InjectionToken('Find')
export type Token<T> = Type<T> | InjectionToken;

export interface BaseProvider<T> {
  provide: Token<T>;
}
export interface ClassProvider<T> extends BaseProvider<T> {
  useClass: Type<T>;
}
export interface ValueProvider<T> extends BaseProvider<T> {
  useValue: T; // T 代表类的值
}
export interface FactoryProvider<T> extends BaseProvider<T> {
  useFactory: () => T;
}
export type Provider<T> =
  | ClassProvider<T>
  | ValueProvider<T>
  | FactoryProvider<T>;

// 自定义类型保护
export function isClassProvider<T>(
  provider: BaseProvider<T>,
): provider is ClassProvider<T> {
  return (provider as any).useClass !== undefined;
}

export function isValueProvider<T>(
  provider: BaseProvider<T>,
): provider is ValueProvider<T> {
  return (provider as any).useValue !== undefined;
}

export function isFactoryProvider<T>(
  provider: BaseProvider<T>,
): provider is FactoryProvider<T> {
  return (provider as any).useFactory !== undefined;
}
```

#### type.ts
`ioc/type.ts`

```typescript
export interface Type<T> {
  new (...args: any[]): T;
}
```

#### inject.ts
`ioc/inject.ts`

```typescript
import { Token } from './provider';

const METADATA_INJECT_KEY = 'METADATA_INJECT_KEY';
// 是一个参数装饰器工厂，会返回一个参数装饰器
export function Inject(token: Token<any>) {
  /**
   * target GirlFriend 类的
   * paramsIndex 此参数在参数列表中的索引
   * GirlFriend.prototype.index-1.METADATA_INJECT_KEY = token
   */
  return function (target: any, _methodName: string, paramsIndex: number) {
    // 定义了元数据之后有什么用？
    // 类的构造函数第几个参数上的token是什么
    // Reflect.getMetadata(METADATA_INJECT_KEY, target, `index-${paramsIndex}`);
    Reflect.defineMetadata(
      METADATA_INJECT_KEY,
      token,
      target,
      `index-${paramsIndex}`,
    );
    return target;
  };
}
export function getInjectionToken(target, index) {
  return Reflect.getMetadata(METADATA_INJECT_KEY, target, `index-${index}`);
}
```

#### index.spec.ts
`ioc/index.spec.ts`

```typescript
import { Token } from './provider';

const METADATA_INJECT_KEY = 'METADATA_INJECT_KEY';
// 是一个参数装饰器工厂，会返回一个参数装饰器
export function Inject(token: Token<any>) {
  /**
   * target GirlFriend 类的
   * paramsIndex 此参数在参数列表中的索引
   * GirlFriend.prototype.index-1.METADATA_INJECT_KEY = token
   */
  return function (target: any, _methodName: string, paramsIndex: number) {
    // 定义了元数据之后有什么用？
    // 类的构造函数第几个参数上的token是什么
    // Reflect.getMetadata(METADATA_INJECT_KEY, target, `index-${paramsIndex}`);
    Reflect.defineMetadata(
      METADATA_INJECT_KEY,
      token,
      target,
      `index-${paramsIndex}`,
    );
    return target;
  };
}
export function getInjectionToken(target, index) {
  return Reflect.getMetadata(METADATA_INJECT_KEY, target, `index-${index}`);
}
```

# 参考
[Nest.js 中文文档](https://docs.nestjs.cn/8/introduction)



[egg.js和nestjs使用场景对比](https://juejin.cn/post/6844903906028290061)

