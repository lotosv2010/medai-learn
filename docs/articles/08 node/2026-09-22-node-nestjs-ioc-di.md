# NestJS 深度拆解：IoC/DI、装饰器元编程与模块化企业级架构（生产收藏级）

> **副标题**：控制反转与依赖注入容器、装饰器元数据反射、Module/Controller/Provider 三层架构、与 Express/Koa 底层适配层关系

> 面试官说「说说 NestJS 的依赖注入是怎么靠装饰器实现的」，多数人只能背一句「用了 reflect-metadata 反射」。能把 IoC 容器怎么读 `design:paramtypes` 元数据、怎么递归解析构造函数依赖、怎么把「类 → 实例」的映射表建起来讲清楚，才是真正理解了 NestJS 这套「装饰器 + 元数据反射 + DI」的玄学三件套。

---

## 🎯 这篇文章解决什么问题

你写过 `@Injectable()`、写过 `constructor(private readonly patientService: PatientService)`，运行起来确实自动注入了——但为什么？那个 `patientService` 是谁 `new` 出来的？装饰器到底往类上写了什么，让框架在启动时能「看」到你需要什么依赖？

前端转 Node 的第一个认知门槛，往往不是语法，而是 NestJS 这套和 Express/Koa 完全不同的心智模型：**Express/Koa 是「你手动控制一切」，NestJS 是「你声明，容器来装配」**。这套模型背后是一整套企业级架构思想。

这篇文章是「Node.js 全栈深度拆解」系列的第 9 篇，也是 Web 框架三选一（Express / Koa / NestJS）的终章。它要讲透四件事：

- IoC/DI 到底解决了什么问题（痛点：`new` 出来的高耦合）
- 元数据反射怎么支撑 IoC（地基：`Reflect Metadata` + `design:paramtypes`）
- NestJS 怎么用这套机制构建企业级架构（模块化 / 作用域 / 横切关注点 / 适配层）
- 手写验证（落地：手写 IoC/DI 容器）

读完之后，你既懂 IoC 思想，又会答面试 5 问，还能自己手写一个简化版容器。

---

## 一、使用与实践

### 1. 从 `nest new` 生成骨架开始

```shell
$ npm i -g @nestjs/cli
$ nest new project-name
```

生成的项目骨架里，`main.ts` 是入口——它只做一件事：用 `NestFactory` 创建应用实例，然后监听端口：

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

注意 `NestFactory.create(AppModule)` 传入的不是一个普通类，而是**根模块**。整个应用就是从这一个根模块出发，把所有的 Controller、Provider 装配起来的。

### 2. 三个核心装饰器各自的职责

NestJS 的三个核心装饰器，构成了「三层架构」的骨架：

| 装饰器 | 作用 | 类比 |
|--------|------|------|
| `@Module()` | 声明一个模块，组织代码的基本单元 | 一个「部门」 |
| `@Controller()` | 声明一个控制器，处理请求 | 部门的「前台」 |
| `@Injectable()` | 声明一个可注入的服务（Provider） | 部门的「干活的员工」 |

`app.module.ts` 把这三者串起来——它声明这个模块「有哪些控制器、有哪些服务」：

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
      provide: UseClassLoggerService, // token 或者叫标识
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
    // 自定义 token
    {
      provide: 'stringToken',
      useClass: UseStringTokenLoggerService,
    },
  ], // 注册
})
export class AppModule {}
```

### 3. Provider 四种注册方式

上面 `providers` 数组里藏着 NestJS 的四种 Provider 注册方式，这是理解 DI 容器「怎么建实例」的关键：

| 方式 | 写法 | 实例怎么来 |
|------|------|-----------|
| 简写（类） | `AppService` | 等价于 `{ provide: AppService, useClass: AppService }`，容器 `new` 一个（默认单例） |
| `useClass` | `{ provide: X, useClass: Y }` | 容器按 `useClass` 指定的类 `new` 一个实例；`Y` 可以和 `provide` 的 `X` 不同，实现「注入接口、换实现类」 |
| `useValue` | `{ provide: X, useValue: new X() }` | 直接用现成的值（实例、常量、配置对象） |
| `useFactory` | `{ provide: X, useFactory: () => new X() }` | 调用工厂函数生成实例（可带依赖参数） |

注意 `provide` 字段是 **token（标识）**，`useClass`/`useValue`/`useFactory` 才是「真正要注入的东西」。一个 token 可以有多种提供方式，这就是 DI 容器的灵活之处。

`app.controller.ts` 演示了最标准的构造注入——**你只要在构造函数里声明依赖，容器会自动注入实例，不需要手动创建**：

```typescript
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  // 依赖注入：构造函数里声明，IoC 容器自动注入实例，可直接调用
  constructor(private readonly appService: AppService) {}

  // 控制器只负责接收参数、返回响应，不做业务处理
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
```

`app.service.ts` 演示了**注入多种不同注册方式的 Provider**，以及用 `@Inject('stringToken')` 注入自定义字符串 token：

```typescript
import { Inject, Injectable } from '@nestjs/common';
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
    @Inject('stringToken') // 注入 token
    private useStringTokenLoggerService: UseStringTokenLoggerService,
  ) {}

  getHello(): string {
    // 依次调用四种不同注册方式的 Logger，验证都注入成功
    this.useClassLoggerService.log('useClassLoggerService');
    this.useValueLoggerService.log('useValueLoggerService');
    this.useFactoryLoggerService.log('useFactoryLoggerService');
    this.useStringTokenLoggerService.log('useStringTokenLoggerService');

    return 'Hello World!';
  }
}
```

`logger.service.ts` 是四个结构几乎一样、只用来演示不同注册方式的 Logger 类：

```typescript
export class UseClassLoggerService {
  log(message: string): void {
    console.log(message);
  }
}

export class UseValueLoggerService {
  log(message: string): void {
    console.log(message);
  }
}

export class UseFactoryLoggerService {
  log(message: string): void {
    console.log(message);
  }
}

export class UseStringTokenLoggerService {
  log(message: string): void {
    console.log(message);
  }
}
```

> 💬 **面试官**：`useClass`、`useValue`、`useFactory` 三种 Provider 有什么区别？什么时候用哪个？
>
> ✅ 标准答案：三者的区别在于「实例从哪来」。`useClass` 是容器 `new` 一个类实例（最常用，支持被注入依赖）；`useValue` 是直接使用一个现成的值（适合注入常量、配置对象、第三方库实例等不需要容器实例化的东西）；`useFactory` 是调用一个工厂函数生成实例，适合需要动态计算、或有条件地选择返回哪个实例的场景（比如根据环境变量决定用哪个实现）。
>
> 🎁 加分答案：能说出 `provide` 是 token、`useClass`/`useValue`/`useFactory` 是「实例来源」这两层概念分离——token 是「钥匙」，后面的才是「锁芯里真正装的东西」。再补一句：当要注入的东西和 token 类型不一致（比如接口注入实现类、或自定义字符串 token），就必须用 `{ provide: X, useClass: Y }` 这种显式对象形式，而不是简写 `X`。

### 4. 路由与参数装饰器

`@Get()`/`@Post()` 定义路由方法，`@Param()`/`@Body()` 提取请求参数。用医疗场景「患者模块」举例：

```typescript
import { Controller, Get, Post, Param, Body } from '@nestjs/common';

@Controller('patients')
export class PatientController {
  @Get(':id')
  getPatient(@Param('id') id: string) {
    return { id, name: '张三' };          // GET /patients/P10086
  }

  @Post()
  createPatient(@Body() body: { name: string; age: number }) {
    return { id: 'P10088', ...body };      // POST /patients
  }
}
```

`@Controller('patients')` 给这个控制器的所有路由加上了 `/patients` 前缀；`@Param('id')` 提取路径参数，`@Body()` 提取请求体。

### 5. Pipe：参数校验（补全）

上面 `@Body()` 拿到的 `body` 是「任何形状的 JS 对象」——如果客户端少传了 `age`、或者传了字符串 `"45"`，代码在运行时才会崩。Pipe 就是**在参数进入处理函数之前，先做转换和校验**。

标准做法是配合 `class-validator` + DTO（Data Transfer Object）：

```typescript
import { IsString, IsInt, Min, Max } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  @Max(150)
  age: number;
}
```

```typescript
import { Controller, Post, Body, ValidationPipe, UsePipes } from '@nestjs/common';
import { CreatePatientDto } from './dto/create-patient.dto';

@Controller('patients')
export class PatientController {
  @Post()
  @UsePipes(new ValidationPipe())
  createPatient(@Body() dto: CreatePatientDto) {
    // 到这里时，dto 已经通过校验且类型正确
    return { id: 'P10088', ...dto };
  }
}
```

`ValidationPipe` 拿到 `@Body()` 的原始对象后，用 `class-validator` 的装饰器规则校验——`age` 不是整数、或者超出 0~150，就直接抛出 400 错误，根本到不了 `createPatient` 里。

> 💬 **面试官**：NestJS 里怎么做参数校验？
>
> ✅ 标准答案：用 Pipe（管道）。配合 `class-validator` 在 DTO 类上声明校验规则，再用 `ValidationPipe` 装饰路由或全局应用——请求体在进入 handler 之前先经过 Pipe 做类型转换和校验，不通过直接抛 400，handler 里拿到的就是已验证的合法数据。
>
> 🎁 加分答案：能说出 Pipe 是「横切关注点四件套」之一，执行时机在 Interceptor 前置逻辑之后、handler 之前（顺序见「二、设计原理」第 7 节）。再补一句：Pipe 不仅能校验，还能做**转换**——比如把字符串 `"123"` 转成数字 `123`，这是「Pipe」这个名字（管道，数据流过被加工）的由来。

### 6. 四类横切关注点（补全）

除了 Pipe，NestJS 还有三个扩展点，合称「横切关注点四件套」。它们解决的是同一个问题：**把「和业务无关、但每个接口都要做」的逻辑（鉴权、日志、错误格式）从业务代码里抽出来**。

**Guard（守卫）**：在路由处理前决定「有没有权限继续」：

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return request.user?.role === 'doctor';  // 只有医生能继续
  }
}

@Controller('prescriptions')
@UseGuards(RolesGuard)
export class PrescriptionController {
  @Post()
  create() {
    // 到这里时，Guard 已确认权限通过
  }
}
```

**Interceptor（拦截器）**：包在 handler 外面，能在「进入前」和「返回后」做逻辑：

```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    return next.handle().pipe(
      tap(() => console.log(`耗时 ${Date.now() - start}ms`)),
    );
  }
}
```

**ExceptionFilter（异常过滤器）**：只在抛出异常时介入，捕获并格式化错误响应：

```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    response.status(exception.getStatus()).json({
      code: exception.getStatus(),
      message: exception.message,
    });
  }
}
```

这四类的执行顺序是面试必考，放到「二、设计原理」第 7 节统一讲透。

---

## 二、设计与原理

### 1. IoC 的痛点：`new` 出来的高耦合

先看一段「传统写法」——类要用到另一个类的实例，就得自己在内部 `new`：

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
 *  1. 无法创建不同的组件
 *  2. 需要在类的内部手动创建组件
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

这段代码的两个问题，正是 IoC 要解决的：

- **无法创建不同的组件**——`Computer` 把 `Monitor27inch`、`LegendHost` 写死了。想换一块 34 寸的显示器？得改 `Computer` 的源码。
- **需要在类内部手动创建组件**——`Computer` 不仅要「开机」，还要操心「显示器、主机从哪来」，职责混杂，也无法单独测试。

**解决方案**：把「创建依赖」这件事从 `Computer` 内部挪到外部，通过构造函数**注入**进去：

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

现在 `Computer` 不再关心显示器、主机具体是谁，只声明「我需要一个 Monitor 和一个 Host」。谁 `new`、`new` 什么型号，由外部决定。这就是**控制反转**的雏形。

### 2. IoC 与 DI：谁控制谁，谁依赖谁

**IoC（Inversion of Control，控制反转）**：在开发中，IoC 意味着你设计好的对象交给容器控制，而不是使用传统方式在对象内部直接控制。

要彻底理解 IoC，先回答四个问题——**谁控制谁，控制什么，为何反转，哪些方面反转了？**

- **谁控制谁，控制什么**：传统程序设计里，我们直接在对象内部用 `new` 创建对象，是程序主动创建依赖对象；而 IoC 有专门的容器来创建对象，由 IoC 容器控制对象的创建。谁控制？是 IoC 容器控制了对象；控制什么？主要是控制外部资源（依赖对象）的获取。
- **为何反转，哪些方面反转了**：有反转就有正转。传统应用是由我们自己主动控制去获取依赖对象（正转）；反转则是容器来帮忙创建及注入依赖对象（反转）。为何反转？因为容器帮我们查找并注入依赖对象，对象只是被动接受依赖对象。哪些方面反转了？依赖对象的获取被反转了。

一句话：**IoC 是一种思想、一种设计原则，用来降低代码之间的耦合度**。有了 IoC 容器后，创建和查找依赖对象的控制权交给了容器，对象之间松散耦合，便于测试、利于复用。

**DI（Dependency Injection，依赖注入）**：控制反转最常见的方式叫做依赖注入——组件之间的依赖关系由容器在运行期决定，由容器动态地把某个依赖关系注入到组件中。

理解 DI 的关键是回答——**谁依赖了谁，为什么需要依赖，谁注入了谁，注入了什么？**

- **谁依赖了谁**：应用程序依赖 IoC 容器。
- **为什么需要依赖**：应用程序需要 IoC 容器来提供对象需要的外部资源（对象、资源、常量数据）。
- **谁注入了谁**：是 IoC 容器注入应用程序依赖的对象。
- **注入了什么**：注入了某个对象所需的外部资源。

IoC 和 DI 是**同一个概念的不同角度描述**：IoC 强调「控制权从对象手里交到了容器手里」，DI 强调「容器把依赖主动塞给对象」。它们说的是同一件事。

下面这张图直观地对比了「传统方式自己 `new`」和「交给 IoC 容器」的差别——左边的服务使用方要自己维护依赖关系，右边则统一注册到 IoC 容器、由容器负责创建与管理：

![IoC 容器对比图：传统方式需要手工创建维护依赖，IoC 方式统一注册到容器由容器创建管理](https://cdn.nlark.com/yuque/0/2021/png/738210/1626155163468-685535c3-c218-44c2-a557-f2d514e5989f.png)

> 💬 **面试官**：什么是控制反转和依赖注入？它们解决了什么问题？
>
> ✅ 标准答案：IoC 是「把创建依赖对象的控制权从对象内部交给外部容器」的设计原则；DI 是 IoC 最常见的一种实现方式，通过构造函数/属性把依赖注入对象。它们解决的问题是**耦合**——传统写法里类自己 `new` 依赖，改实现要改类源码、也没法替换 mock 做单测；交给容器后，类只声明「我需要什么」，由容器注入，对象之间松耦合、易测试、易复用。
>
> 🎁 加分答案：能点出「IoC 和 DI 是同一概念的两个角度」——IoC 强调控制权反转，DI 强调注入动作。再补一个类比：IoC 好比「你从『自己做饭』变成『点外卖』」，你只声明「我要吃啥」（构造函数参数），不关心「谁做的、怎么做的」（容器负责创建）。

### 3. 装饰器元数据反射：支撑 IoC 的地基

IoC 容器怎么知道「`Computer` 的构造函数需要 Monitor 和 Host」？答案就是**装饰器 + 元数据反射**。这是 NestJS 整个 DI 体系的基石，必须先讲透。

**Reflect**：`Reflect` 对象和 `Proxy` 对象一样，是 ES6 为操作对象提供的新 API。JS 的装饰器更多是对函数或属性做一些操作（修改值、代理变量、自动绑定 `this` 等），但**无法通过反射获取「究竟有哪些装饰器添加到了这个类/方法上」**——于是 `Reflect Metadata` 应运而生。

**Reflect Metadata**：你可以通过装饰器给类添加一些自定义信息，然后通过反射把这些信息提取出来。

先看最基本的 `defineMetadata` 用法——给对象（或对象的方法）挂上一个键值对，再读回来：

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

注意第四个参数 `'getName'` 是「方法名」——元数据可以挂在类本身，也可以挂在类的某个方法上，两者互不干扰。

再看用 `@Reflect.metadata` 装饰器给类和方法加元数据：

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

**装饰器工厂**：上面的 `@Reflect.metadata('name', 'Person')` 等价于下面这种「装饰器工厂」写法——一个函数接收参数，返回一个真正的装饰器：

```typescript
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

你手写装饰器时，其实就是在写这样的「装饰器工厂」——外层函数收配置，内层函数在类/方法定义时执行 `Reflect.defineMetadata`。

### 4. `emitDecoratorMetadata`：类型信息的自动元数据

上面手动 `defineMetadata` 能挂「自定义信息」，但 IoC 需要的是**构造函数的参数类型**。这个信息不用手动写——TypeScript 编译器能自动生成。

`tsconfig.json` 里开启 `emitDecoratorMetadata` 和 `experimentalDecorators`：

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

开启后，TypeScript 编译器会在编译时，自动给带装饰器的类生成三类元数据（`__metadata` 是执行装饰器的函数）：

- **类类型元数据**：键 `design:type`
- **参数类型元数据**：键 `design:paramtypes`（IoC 的核心，记录构造函数每个参数的类型）
- **返回值类型元数据**：键 `design:returntype`

`__metadata` 是类装饰器工厂，把指定的键值对与类关联起来；`__param` 是参数装饰器工厂，根据参数下标和参数装饰器生成最终装饰器。

下面这张图展示了「一段带 `@Inject` 和构造参数的 TS 代码，编译成 JS 后长什么样」——关键看编译产物里的 `__metadata("design:paramtypes", [Car, LoggerService])`，它把构造函数参数的类型（编译前的类型信息）记录了下来：

![__metadata 编译产物图：TS 构造函数参数类型被编译为 design:paramtypes 元数据](https://cdn.nlark.com/yuque/0/2021/png/738210/1626234452544-bfd74fde-8eb1-49be-8a8d-e18e8af14fd1.png)

这就是 NestJS 依赖注入的**地基**：`@Injectable()` 标记「这是个可注入的类」，`emitDecoratorMetadata` 让编译器把「构造参数类型」写进 `design:paramtypes` 元数据——容器启动时读到这个元数据，就知道该注入什么。

> 💬 **面试官**：NestJS 的依赖注入是怎么依赖 TypeScript 装饰器和元数据反射实现的？
>
> ✅ 标准答案：核心链路是「装饰器标记 + 编译期类型元数据 + 运行时反射」。`@Injectable()` 装饰器调用 `Reflect.defineMetadata` 给类打上「可注入」标记；`emitDecoratorMetadata` 编译选项让 TS 编译器自动生成 `design:paramtypes` 元数据，记录构造函数每个参数的类型；NestJS 启动时扫描 `@Module` 声明的 `providers`，用 `Reflect.getMetadata('design:paramtypes', 类)` 读出参数类型，递归解析并注入对应实例。
>
> 🎁 加分答案：能说出「为什么注入类型只能是类、不能是接口」——接口在编译后被擦除，`design:paramtypes` 里拿不到接口类型，所以 NestJS 的注入 token 用的是「类」或「自定义 token（字符串/InjectionToken）」，而不是接口。再补一句 `@Inject()` 的作用：当注入的 token 和参数类型不一致（比如自定义字符串 token）时，用 `@Inject(token)` 显式覆盖默认的类型 token。

### 5. NestJS 的 DI 容器怎么工作

把地基拼起来，NestJS 的 DI 容器启动流程就清晰了：

- **第 1 步**：`@Injectable()` 给类打上 `__injectable__` 标记，`emitDecoratorMetadata` 生成 `design:paramtypes`（构造参数类型数组）。
- **第 2 步**：启动时扫描根模块及其 `imports` 的所有 `@Module`，把 `providers` 数组里的每个 Provider 注册进容器，构建一张「token（类或字符串）→ Provider」的映射表。
- **第 3 步**：实例化某个类时，读它的 `design:paramtypes`，得到构造参数类型数组，逐个在映射表里查对应的 Provider，**递归**解析——如果某个参数本身也是个 Provider，就先实例化它，再把它的实例注入。
- **第 4 步**：解析出的实例缓存起来（默认单例），下次再遇到同一个 token 直接复用。

`@Inject()` 在这里的职责是「覆盖默认 token」：默认 token 是参数的类型本身；当你要注入的是一个接口实现、或一个自定义字符串 token，参数类型对不上，就用 `@Inject(token)` 显式指定。

**循环依赖**：递归解析依赖时，会遇到一个经典边界情况——A 注入 B、B 又注入 A。容器实例化 A 时去解析 B，实例化 B 时又回来拿 A，此时 A 还没创建完，于是陷入死循环、抛错。

NestJS 的解法是 `forwardRef`——把「取另一个类的引用」这个动作，延迟到真正需要时才执行：

```typescript
import { Inject, forwardRef } from '@nestjs/common';

@Injectable()
export class PatientService {
  constructor(
    @Inject(forwardRef(() => PrescriptionService))  // 👈 传箭头函数，而不是类本身
    private prescriptionService: PrescriptionService,
  ) {}
}
```

`forwardRef(() => PrescriptionService)` 传的是一个「返回类的函数」而非类本身，容器解析到这一步才调用它取类，绕开了「类定义还没完成、互相拿不到」的时序问题。模块之间互相 `imports` 也会成环，同样用 `forwardRef(() => OtherModule)` 打破。

> 💬 **面试官**：NestJS 里两个 Service 互相注入会怎样？怎么解决？
>
> ✅ 标准答案：形成循环依赖，容器递归解析时死循环、抛错。用 `forwardRef` 打破——`@Inject(forwardRef(() => X))` 延迟取类引用，或模块级 `forwardRef(() => XxxModule)` 打破模块间的环。
>
> 🎁 加分答案：能说出「循环依赖本质是设计问题，`forwardRef` 是补救不是正解」——优先通过抽出公共 Service、或改为事件/回调解耦来消除环，`forwardRef` 只在确实无法避免时用。

### 6. 单例作用域：默认每个 Provider 只实例化一次

NestJS 里 Provider 的**默认作用域是单例（singleton）**——整个应用生命周期里，每个 Provider 只实例化一次，所有注入它的地方共享同一个实例。

除非显式声明 `REQUEST` 作用域，否则默认单例：

```typescript
@Injectable({ scope: Scope.REQUEST })  // 每次请求创建一个新实例
export class PatientService {}
```

理解默认单例，对「服务里能不能存状态」至关重要——**默认单例意味着不能把「请求相关的可变状态」存在服务实例的字段上**。比如下面的写法就是错的：

```typescript
@Injectable()
export class PatientService {
  private currentUserId: string;  // ❌ 单例字段，多个请求会互相覆盖

  getUser(userId: string) {
    this.currentUserId = userId;   // 请求 A 写，请求 B 覆盖，A 就读错了
  }
}
```

因为所有请求共享同一个 `PatientService` 实例，请求 A 写入 `currentUserId` 后，请求 B 一进来就覆盖了它，请求 A 再读就拿到了 B 的用户——**这就是经典的单例状态污染 bug**。

> 💬 **面试官**：NestJS 里 Provider 的默认作用域是什么？这对「能不能在服务里存状态」有什么影响？
>
> ✅ 标准答案：默认作用域是**单例（singleton）**，整个应用每个 Provider 只实例化一次、所有请求共享同一个实例。这意味着**不能在服务实例的字段上存请求相关的可变状态**——因为多请求并发时会互相覆盖。要存请求级状态，要么把状态放在请求作用域（`scope: Scope.REQUEST`）的 Provider 里，要么不存状态、每次通过参数传递。
>
> 🎁 加分答案：能说出「最佳实践是让服务尽量无状态（stateless）」——把状态存数据库/缓存/请求上下文，而不是服务字段。再补一句作用域的三种取值：`DEFAULT`（单例）、`REQUEST`（每次请求新建）、`TRANSIENT`（每次注入新建），并说明 `REQUEST` 作用域有性能代价（每次请求都要实例化并递归解析依赖树）。

### 7. 横切关注点的执行顺序

四类扩展点不是随机执行的，有严格的顺序。这是面试高频考点，用一个表记牢：

| 顺序 | 扩展点 | 职责 | 介入时机 |
|------|--------|------|---------|
| 1 | Guard | 权限校验，决定是否继续 | 路由处理前 |
| 2 | Interceptor（前置） | 进入 handler 前的逻辑 | handler 之前 |
| 3 | Pipe | 参数转换与校验 | handler 之前、Interceptor 之后 |
| 4 | Handler | 路由处理函数本身 | 核心业务 |
| 5 | Interceptor（后置） | 返回前的逻辑（可改返回值） | handler 之后 |
| 6 | ExceptionFilter | 捕获异常、格式化错误响应 | 只在抛异常时 |

完整链路一句话：**Guard（权限）→ Interceptor 前置（如计时开始）→ Pipe（校验）→ 路由处理函数 → Interceptor 后置（如计时结束、改返回值）→ ExceptionFilter（只在抛异常时）**。

注意两点：

- **Interceptor 是「环绕型」**——它能包住 handler，在前后都做逻辑（类似 Koa 洋葱模型里的 `await next()` 前后），所以它在顺序表里出现了两次。
- **ExceptionFilter 是「兜底型」**——它不在正常链路里，只有当链路中任意一环抛异常时才介入。

### 8. 模块化架构：Module 是组织代码的基本单元

`Module` 是 NestJS 组织代码的基本单元，用四个字段声明「这个模块有什么、依赖什么、暴露什么」：

| 字段 | 含义 |
|------|------|
| `controllers` | 该模块处理的请求入口（Controller） |
| `providers` | 该模块内部的业务逻辑与可注入服务 |
| `imports` | 依赖其他模块导出的 Provider |
| `exports` | 暴露给其他模块使用的 Provider |

这套**显式声明的边界**，相比 Express/Koa「自由组织文件」的方式，更适合大型团队协作的企业级项目——模块之间谁依赖谁、能注入谁，代码里一目了然，不会出现「跨模块偷偷用了别人的 Service」的隐式耦合。

### 9. 与 Express/Koa 的关系：NestJS 不是另一个 HTTP 框架

这是理解 NestJS 定位的关键——**NestJS 不是一个从零实现的 HTTP 框架，而是在 Express（默认）或 Fastify 之上构建的一层「架构框架」**。

`@nestjs/platform-express` 适配层负责把 NestJS 的路由/中间件概念，转换成底层框架（Express）的实际调用。这也是为什么 NestJS 里仍然能使用原生 Express 中间件：

```typescript
const app = await NestFactory.create(AppModule);
app.use(express.json());  // 直接挂原生 Express 中间件
```

所以三者的关系是：**Express/Koa 是「HTTP 层」的框架（怎么处理请求），NestJS 是「架构层」的框架（怎么组织代码），它默认站在 Express 之上**。这也是为什么从 Express/Koa 迁移到 NestJS，并不是「换了个 HTTP 框架」，而是「给代码加上了一套企业级架构约束」。

### 10. 对比 Angular：前端 DI 的同源设计

NestJS 的 DI 和 Angular 的 DI **高度同源**——NestJS 的架构设计明确借鉴了 Angular，两者都用「装饰器 + 元数据反射」实现依赖注入，Angular 的 `@Injectable()`、`constructor(private http: HttpClient)` 和 NestJS 的写法几乎一模一样。

这就是为什么「有 Angular 背景的前端开发者」上手 NestJS 特别快——**DI 的心智模型是同一套**。反过来，React 背景的开发者（React 生态里没有强制的 DI 框架）第一次接触 NestJS 会有一层「为什么要这么绕」的适应成本。

---

## 三、源码解析（重点代码，来源 nestjs/nest 仓库）

> NestJS 源码地址：https://github.com/nestjs/nest（本篇基于当前主分支 `packages/common` 与 `packages/core` 目录）

前面讲的都是「设计思路」，这一节贴出 NestJS 真实源码，验证每一处结论在代码里到底长什么样。

### 1. `injectable.decorator.ts`：`@Injectable()` 到底写了什么

`@Injectable()` 的本质，就是往类上 `Reflect.defineMetadata` 两个东西——一个「可注入」水印标记，一个作用域配置：

```typescript
import { uid } from 'uid';
import { INJECTABLE_WATERMARK, SCOPE_OPTIONS_METADATA } from '../../constants.js';
import { ScopeOptions } from '../../interfaces/scope-options.interface.js';
import { Type } from '../../interfaces/type.interface.js';

export type InjectableOptions = ScopeOptions;

export function Injectable(options?: InjectableOptions): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(INJECTABLE_WATERMARK, true, target);       // 👈 标记「可注入」
    Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, options, target);  // 👈 记录作用域
  };
}
```

`INJECTABLE_WATERMARK` 的值在 `constants.ts` 里定义为 `'__injectable__'`。容器启动时，就是靠 `Reflect.getMetadata('__injectable__', 类)` 判断「这个类是不是一个 Provider」。

### 2. `controller.decorator.ts`：`@Controller()` 写了什么

`@Controller()` 的逻辑更丰富——它写了水印、路径、作用域、版本四类元数据：

```typescript
import { CONTROLLER_WATERMARK, HOST_METADATA, PATH_METADATA,
  SCOPE_OPTIONS_METADATA, VERSION_METADATA } from '../../constants.js';

export function Controller(
  prefixOrOptions?: string | string[] | ControllerOptions,
): ClassDecorator {
  const defaultPath = '/';
  const [path, host, scopeOptions, versionOptions] = isUndefined(prefixOrOptions)
    ? [defaultPath, undefined, undefined, undefined]
    : isString(prefixOrOptions) || Array.isArray(prefixOrOptions)
      ? [prefixOrOptions, undefined, undefined, undefined]
      : [/* 从 options 对象解构 */];

  return (target: object) => {
    Reflect.defineMetadata(CONTROLLER_WATERMARK, true, target);   // 👈 标记「是控制器」
    Reflect.defineMetadata(PATH_METADATA, path, target);          // 👈 路由前缀
    Reflect.defineMetadata(HOST_METADATA, host, target);
    Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, scopeOptions, target);
    Reflect.defineMetadata(VERSION_METADATA, versionOptions, target);
  };
}
```

注意 `@Controller('patients')` 里的 `'patients'` 最终落到 `PATH_METADATA`（`'path'`）元数据里，后面路由注册时会拼到完整路径上。

### 3. `request-mapping.decorator.ts`：`@Get()`/`@Post()` 写了什么

`@Get()`/`@Post()` 都是同一个 `RequestMapping` 工厂生成的，做的事也很简单——把路径和方法写到**方法的 descriptor** 上：

```typescript
import { METHOD_METADATA, PATH_METADATA } from '../../constants.js';
import { RequestMethod } from '../../enums/request-method.enum.js';

export const RequestMapping = (
  metadata: RequestMappingMetadata = defaultMetadata,
): MethodDecorator => {
  const pathMetadata = metadata[PATH_METADATA];
  const path = pathMetadata && pathMetadata.length ? pathMetadata : '/';
  const requestMethod = metadata[METHOD_METADATA] || RequestMethod.GET;

  return (target: object, key: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    Reflect.defineMetadata(PATH_METADATA, path, descriptor.value);       // 👈 路径写到方法上
    Reflect.defineMetadata(METHOD_METADATA, requestMethod, descriptor.value); // 👈 方法写到方法上
    return descriptor;
  };
};

const createMappingDecorator = (method: RequestMethod) =>
  (path?: string | string[]): MethodDecorator => {
    return RequestMapping({ [PATH_METADATA]: path, [METHOD_METADATA]: method });
  };

export const Get = createMappingDecorator(RequestMethod.GET);   // 👈 @Get 就是固定 method=GET
export const Post = createMappingDecorator(RequestMethod.POST);
```

看懂了这三个装饰器源码，你会豁然开朗：**装饰器本身不做任何「注入」或「路由」的动作，它们只是用 `Reflect.defineMetadata` 往类/方法上「贴标签」**。真正干活的是后面的容器和路由扫描器——它们读这些标签来做装配。

### 4. `constants.ts`：所有元数据 key 的「字典」

NestJS 用到的所有元数据 key 都集中在 `constants.ts`，这是理解「容器靠什么 key 读元数据」的关键：

```typescript
export const PARAMTYPES_METADATA = 'design:paramtypes';          // 👈 TS 编译器生成，构造参数类型
export const SELF_DECLARED_DEPS_METADATA = 'self:paramtypes';     // 👈 @Inject 显式声明的 token
export const SCOPE_OPTIONS_METADATA = 'scope:options';            // 👈 作用域
export const PATH_METADATA = 'path';                              // 👈 路由路径
export const METHOD_METADATA = 'method';                          // 👈 HTTP 方法
export const ROUTE_ARGS_METADATA = '__routeArguments__';          // 👈 @Param/@Body 参数元数据
export const INJECTABLE_WATERMARK = '__injectable__';             // 👈 可注入标记
export const CONTROLLER_WATERMARK = '__controller__';             // 👈 控制器标记
export const PIPES_METADATA = '__pipes__';
export const GUARDS_METADATA = '__guards__';
export const INTERCEPTORS_METADATA = '__interceptors__';
export const EXCEPTION_FILTERS_METADATA = '__exceptionFilters__';
```

关键在 `PARAMTYPES_METADATA = 'design:paramtypes'`——它和 TS 编译器生成的元数据 key 完全一致，容器读它就能拿到构造参数类型。

### 5. `injector.ts`：DI 容器的核心——递归解析构造依赖

`Injector` 类是 NestJS 依赖注入的核心。先看它怎么读元数据——`reflectConstructorParams` 读 `design:paramtypes`，再用 `@Inject` 声明的 `self:paramtypes` 覆盖对应位置：

```typescript
public reflectConstructorParams(type: Type<unknown> | Function): any[] {
  const paramtypes = [
    ...(Reflect.getMetadata(PARAMTYPES_METADATA, type) || []),  // 👈 读 design:paramtypes
  ];
  const selfParams = this.reflectSelfParams(type);              // 👈 读 @Inject 声明的 self:paramtypes
  selfParams.forEach(({ index, param }) => (paramtypes[index] = param));  // 👈 用 @Inject 覆盖
  return Array.from(paramtypes);
}
```

这段印证了「二、5」的结论：默认 token 是参数类型（`design:paramtypes`），`@Inject()` 声明的 token（`self:paramtypes`）会按 `index` 覆盖默认值——这就是 `@Inject('stringToken')` 能覆盖「参数类型」这个默认 token 的原理。

再看 `resolveConstructorParams`——拿到依赖数组后，`Promise.all(dependencies.map(resolveParam))` 并发解析每个参数，每个参数递归走「查 token → 找 Provider → 加载实例」：

```typescript
public async resolveConstructorParams<T>(wrapper, moduleRef, inject, callback, ...) {
  // ...
  const [dependencies, optionalDependenciesIds] = isFactoryProvider
    ? this.getFactoryProviderDependencies(wrapper)
    : this.getClassDependencies(wrapper);          // 👈 读设计参数类型

  const paramBarrier = new Barrier(dependencies.length);
  const resolveParam = async (param: unknown, index: number) => {
    const paramWrapper = await this.resolveSingleParam(   // 👈 解析单个参数
      wrapper, param, { index, dependencies }, moduleRef, ...);
    const paramWrapperWithInstance = await this.resolveComponentHost(
      moduleRef, paramWrapper, ...);                      // 👈 递归加载实例
    return instanceHost?.instance;
  };
  const instances = await Promise.all(dependencies.map(resolveParam));  // 👈 并发递归解析
  isResolved && (await callback(instances, depth));
}
```

`resolveSingleParam` 里，`resolveParamToken` 处理 token，`resolveComponentWrapper` 查 Provider 注册表：

```typescript
public async resolveComponentWrapper<T>(moduleRef, token, dependencyContext, wrapper, ...) {
  const providers = moduleRef.providers;
  return this.lookupComponent(providers, moduleRef, { ...dependencyContext, name: token }, ...);
}
```

`lookupComponent` 会先在当前模块的 `providers` 里找，找不到再遍历 `imports` 里的父模块**递归查找**——这就是「模块化架构」里「imports 引入其他模块导出的 Provider」的底层实现。递归链条完整闭环：**读元数据 → 解析每个参数 → 查表 → 递归加载 → 注入**。

### 6. `router-execution-context.ts`：横切关注点的执行顺序

「二、7」讲的执行顺序，在这段源码里得到精确印证。看 handler 的组装——先 `fnCanActivate`（Guard），再用拦截器包住 handler，而 handler 内部先 `fnApplyPipes`（Pipe）再执行真正的 `callback`：

```typescript
const fnCanActivate = this.createGuardsFn(guards, instance, callback, contextType);  // 👈 Guard
const fnApplyPipes = this.createPipesFn(pipes, paramsOptions);                       // 👈 Pipe

const handler = (args, req, res, next) => async () => {
  fnApplyPipes && (await fnApplyPipes(args, req, res, next));  // 👈 先 Pipe 校验转换
  return callback.apply(instance, args);                       // 👈 再执行真正的 handler
};

return async (req, res, next) => {
  fnCanActivate && (await fnCanActivate([req, res, next]));    // 👈 1. Guard 最外层

  const resultOrDeferred = this.interceptorsConsumer.intercept( // 👈 2/5. Interceptor 环绕
    interceptors, [req, res, next], instance, callback,
    handler(args, req, res, next),                              // 👈 3/4. Pipe + handler 被包在里面
    contextType,
  );
  await (fnHandleResponse as HandlerResponseBasicFn)(result, res, req);
};
```

执行顺序从代码结构上一目了然：**Guard 在最外 → Interceptor 包裹 → Pipe 在 handler 前 → handler → Interceptor 后置 → 响应处理**。异常过滤器则在这条链之外单独兜底，只有抛异常才介入。

### 7. `express-adapter.ts`：NestJS 路由怎么变成 `app.get/post`

最后看适配层——NestJS 怎么把自己的「路由概念」翻译成 Express 的实际调用。`createMiddlewareFactory` 里的 `routerMethodFactory.get(this.instance, requestMethod)` 拿到的就是 Express 实例的 `get`/`post` 方法：

```typescript
import express from 'express';

export class ExpressAdapter extends AbstractHttpAdapter {
  constructor(instance?: any) {
    super(instance || express());   // 👈 内部就是一个 Express 实例
  }

  public createMiddlewareFactory(requestMethod: RequestMethod) {
    return (path: string, callback: Function) => {
      const convertedPath = LegacyRouteConverter.tryConvert(path);
      return this.routerMethodFactory
        .get(this.instance, requestMethod)   // 👈 取 express.get / express.post
        .call(this.instance, convertedPath, callback);  // 👈 调用 app.get(path, handler)
    };
  }

  public listen(port: string | number, callback?: () => void): Server {
    return this.httpServer.listen(port, callback);   // 👈 最终还是 Express 在监听
  }
}
```

这段印证了「二、9」的结论：**NestJS 内部持有一个 Express 实例，注册路由时最终调用的是 `express.get/post`，监听端口也是 Express 的 `httpServer.listen`**。NestJS 是「架构框架」，HTTP 的脏活累活还是 Express 在干。

---

## 四、手写 IoC/DI 容器

理解了原理，这一节把笔记里的 IoC 容器完整实现一遍——这是本篇「手写验证」的落地，只聚焦 IoC/DI 这一件事，不往上叠路由层（路由分发属于另一个正交维度，「三、源码解析」里的 `express-adapter.ts` 已经覆盖）。

一个 IoC 容器需要四样东西：Token 类型、Provider 类型、`@Inject` 装饰器、Container 容器类。下面完整给出。

**`type.ts`**：`Type<T>` 表示「一个类」——就是能被 `new` 的东西：

```typescript
export interface Type<T> {
  new (...args: any[]): T;
}
```

**`provider.ts`**：定义 Token、Provider 以及「判断 Provider 是哪种类型」的类型守卫。这里有个关键设计——**为什么要用 `InjectionToken` 类而不是直接拿字符串当 token？因为字符串可能重名**：

```typescript
import { Type } from './type';

// 针对字符串类型的 token，编写一个 InjectionToken 类
// 为什么不能直接用字符串当 token？因为可能重名
export class InjectionToken {
  constructor(public injectionIdentifier: string) {}
}
// Type<T> 等价于一个类
// 如果有多个字符串类型的 token 的话，会实例化不同的类实例，例如 Logger、Find 两个。
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

**`inject.ts`**：`@Inject()` 装饰器——把「构造函数第几个参数上是什么 token」记录到元数据里，key 是 `index-${参数下标}`：

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
    // 类的构造函数第几个参数上的 token 是什么
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

**`Container.ts`**：容器核心——`addProvider` 注册，`inject` 按 token 解析，`injectClass` 读 `design:paramtypes` 递归实例化：

```typescript
import {
  Token, Provider, isClassProvider, isValueProvider, isFactoryProvider,
  ClassProvider, ValueProvider, FactoryProvider, InjectionToken,
} from './provider';
import { Type } from './type';
import { getInjectionToken } from './inject';

type InjectableParams = Type<any>;

const DESIGN_PARAMTYPES = 'design:paramtypes';
export class Container {
  public providers = new Map<Token<any>, Provider<any>>();
  // 注册提供者
  addProvider<T>(provider: Provider<T>) {
    // provider 就是 token 或者是标识符
    this.providers.set(provider.provide, provider);
  }
  // 根据 token 创建对应的值
  inject(token: Token<any>) {
    const provider: Provider<any> = this.providers.get(token);
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
    // 获取参数
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
      Reflect.getMetadata(DESIGN_PARAMTYPES, target)  // 👈 读 design:paramtypes
    );
    if (argTypes === undefined) {
      return [];
    }
    // 把数组做一个转换，从 type 数组转换成对应的提供者的实例
    return argTypes.map((argType, index) => {
      const overrideToken = getInjectionToken(target, index);  // 👈 读 @Inject 覆盖
      const actualToken = !overrideToken ? argType : overrideToken;
      const provider = this.providers.get(actualToken);
      return this.injectWithProvider(actualToken, provider);   // 👈 递归解析
    });
  }
  // token 是一个类
  getTokenName<T>(token: Token<T>) {
    return token instanceof InjectionToken
      ? token.injectionIdentifier
      : token.name;
  }
}
```

**`index.ts`**：统一导出：

```typescript
export * from './container';
```

对照 NestJS 源码你会发现，这个手写 Container 的 `getInjectedParams` 和 NestJS `Injector.reflectConstructorParams` 是**同一套逻辑**：读 `design:paramtypes` 拿参数类型，读 `@Inject` 覆盖 token，递归 `injectWithProvider` 解析依赖。这就是 IoC 容器的核心机制，浓缩在这 40 行里。

下面这张图展示了 IoC 容器的完整工作流程——Provider 注册进容器，用户声明依赖，容器递归获取实例、注入依赖：

![IoC 实现流程图：Provider 注册、依赖声明、递归注入的完整链路](https://cdn.nlark.com/yuque/0/2021/png/738210/1626171784701-300b0b7f-f4fc-4c48-9e92-3d1039c67f19.png)

> 💬 **面试官**：手写一个简化版 IoC 容器，关键步骤是什么？
>
> ✅ 标准答案：三个关键步骤——① 用 `Map` 维护「token → Provider」的注册表，`addProvider` 注册；② 实例化时用 `Reflect.getMetadata('design:paramtypes', 类)` 读构造函数参数类型；③ 对每个参数类型递归查注册表、解析实例、用 `Reflect.construct` 构造。`@Inject` 装饰器则负责把「参数下标 → 自定义 token」的映射记到元数据里，覆盖默认的类型 token。
>
> 🎁 加分答案：能说出「为什么要区分 ClassProvider/ValueProvider/FactoryProvider 三种类型并用类型守卫判断」——不同类型实例化方式不同（`new` / 直接用值 / 调工厂函数），需要先判断再分发。再补一句「单例」的实现方式：解析出的实例缓存到 Map 里，下次同 token 直接返回，避免重复实例化。

上面的面试官 Q&A 已经点出手写容器的关键步骤。这里再用一个「患者模块」的最小验证收个尾——不引入路由层，只用 `container.inject()` 证明「你没 `new`，但依赖已注入」：

```typescript
// 验证：患者服务自动注入链路
class PatientService {
  getPatients() {
    return ['张三', '李四'];
  }
}

class PatientController {
  // 只声明需要 PatientService，不手动 new
  constructor(private readonly patientService: PatientService) {}
  list() {
    return this.patientService.getPatients();
  }
}

const container = new Container();
container.addProvider({ provide: PatientService, useClass: PatientService });
container.addProvider({ provide: PatientController, useClass: PatientController });

const controller = container.inject(PatientController); // 👈 自动注入 PatientService
controller.list(); // ['张三', '李四']
```

关键验证点：`container.inject(PatientController)` 这一行，容器读到了 `PatientController` 构造函数的 `design:paramtypes` 是 `[PatientService]`，自动实例化并注入了 `PatientService`——**你没有手动 `new PatientService()`，但 `controller.patientService` 已经可用了**。这就是 NestJS 依赖注入的完整链路，浓缩在这几十行手写容器里。

---

## 五、手写源码地址

- GitHub：https://github.com/...（`medai-node-source` 仓库，含手写 IoC/DI 容器的 `provider.ts`/`type.ts`/`inject.ts`/`container.ts`，地址待补充）

---

## 六、参考资料

- https://docs.nestjs.com/
- https://github.com/nestjs/nest
- https://www.typescriptlang.org/docs/handbook/decorators.html
- https://www.npmjs.com/package/reflect-metadata

---

## 💡 面试核心问

- **什么是控制反转和依赖注入？它们解决了什么问题？**（耦合：对象不再自己 `new` 依赖，交给容器注入）
- **NestJS 的依赖注入是怎么依赖 TypeScript 装饰器和元数据反射实现的？**（`@Injectable` 贴标记 + `emitDecoratorMetadata` 生成 `design:paramtypes` + 容器运行时反射递归注入）
- **NestJS 里 Provider 的默认作用域是什么？这对「能不能在服务里存状态」有什么影响？**（默认单例，不能存请求级可变状态）
- **Guard、Interceptor、Pipe、Exception Filter 各自的职责和执行顺序是什么？**（Guard→Interceptor 前置→Pipe→handler→Interceptor 后置→ExceptionFilter 兜底）
- **NestJS 和 Express 是什么关系？NestJS 是重新造了一个 HTTP 框架吗？**（不是，是构建在 Express/Fastify 之上的架构框架）
- **`useClass`、`useValue`、`useFactory` 三种 Provider 的区别是什么？**
- **为什么要用 `InjectionToken` 类而不是直接拿字符串当 token？**（字符串可能重名）
- **两个 Service 互相注入（循环依赖）会怎样？怎么解决？**（递归解析死循环，用 `forwardRef` 打破）

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 面试频率 |
|--------|-----------|---------|
| IoC / DI | 对象不自己 `new` 依赖，声明后由容器注入（降低耦合、易测试） | ⭐⭐⭐ 必考 |
| 元数据反射 | `emitDecoratorMetadata` 生成 `design:paramtypes`，容器 `Reflect.getMetadata` 读类型 | ⭐⭐⭐ 必考 |
| Provider 注册 | `useClass`（new）/ `useValue`（用值）/ `useFactory`（工厂）三种来源 | ⭐⭐⭐ 必考 |
| 默认作用域 | 单例，不能存请求级可变状态 | ⭐⭐⭐ 必考 |
| 执行顺序 | Guard→Interceptor 前置→Pipe→handler→Interceptor 后置→ExceptionFilter | ⭐⭐⭐ 必考 |
| 模块化 | Module 四字段（controllers/providers/imports/exports）显式声明边界 | ⭐⭐ 高频 |
| 适配层 | NestJS 是架构框架，内部持 Express/Fastify 实例，路由最终调 `app.get/post` | ⭐⭐ 高频 |
| 循环依赖 | 递归解析死循环，用 `forwardRef(() => X)` 延迟取引用打破 | ⭐⭐ 高频 |

> 💡 记住这条主线：**IoC（为什么）→ 元数据反射（怎么支撑）→ 装饰器贴标签 + 容器递归装配（怎么实现）→ 手写 IoC/DI 容器（验证落地）→ 模块化/作用域/横切关注点（怎么组织企业级代码）**。NestJS 的每一步，都在把「依赖的复杂性」从业务代码里抽出来，交给一个可控的容器。

---

## 📝 思考题

NestJS 默认单例意味着「服务里不能存请求级可变状态」，但业务里确实有些数据是「每个请求一份」的（比如当前登录用户、请求 traceId）。NestJS 提供了 `REQUEST` 作用域（`@Injectable({ scope: Scope.REQUEST })`）来支持这种需求。那么问题来了：**如果你要手写一个支持 `REQUEST` 作用域的容器，相比本篇的单例 Container，关键改动是什么？** 提示：单例容器是把实例缓存到 `Map<token, instance>` 里全局复用，REQUEST 作用域则需要「每个请求一份」，这个「每请求一份」的实例存在哪、由谁清理？想想 AsyncLocalStorage 能不能派上用场。

欢迎评论区写出你的答案 👇

---

> 🔖 这是「Node.js 全栈深度拆解」系列第 9 篇。上一篇：《Koa 深度：洋葱模型 + koa-compose 源码 + 对比 Express + 手写实现》；下一篇预告：《BFF 架构模式：API Gateway vs BFF / 多端数据聚合与裁剪 / Node.js 中间层实战》。
>
> 前置基础扩展阅读：搜索关键词「Express 中间件 路由 错误处理」「Koa 洋葱模型 koa-compose」「Reflect Metadata reflect-metadata」「TypeScript 装饰器 emitDecoratorMetadata」
