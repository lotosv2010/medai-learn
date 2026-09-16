# React Router 6/7: Data Router 预取数据范式与权限路由实战（生产收藏级）

> **副标题**：loader/action 数据预取、嵌套路由与 Outlet、约定式 vs 显式配置路由

---

## 🎯 这篇文章解决什么问题

上一篇讲完 Context 的依赖传播机制，面试官往下问的下一个问题往往会跳出 React 内核，落到工程实践上：**你们项目里的页面数据是什么时候拿的？**

大多数人的答案是"在页面组件里 `useEffect` 发请求"——这个答案能跑通，但经不起追问。面试官接着问："如果这个页面有三层嵌套路由，每一层都要请求数据，会发生什么？"答案是**请求瀑布**：外层组件先渲染完才挂载内层组件，内层的 `useEffect` 才开始发请求，一层套一层地串行等待，用户看着 loading 一个接一个地转。再追问一句："那权限路由怎么做？"很多人会说"用一个 `<ProtectedRoute>` 高阶组件包一层，组件内部判断权限"——这也能跑通，但没有回答"没权限的时候，那些本该被拦截的数据请求，是不是已经发出去了"。

React Router 6 引入的 Data Router（`createBrowserRouter` + `loader`/`action`）本质上是把这些问题的答案从"组件生命周期里自己处理"改成"路由配置里声明式地处理"——数据依赖变成路由的一等公民，父子路由的 `loader` 并行触发而不是串行等待，权限校验可以在数据真正开始加载之前就拦截。这一篇要讲透的，就是这套范式解决了什么问题、`Outlet` 和嵌套路由如何配合、路由匹配打分算法为什么这样设计，以及约定式路由（umi）和显式配置路由（React Router）在团队协作上的真实取舍。

读完之后，你会同时获得两种确定感：**懂原理**（Data Router 把数据获取提升到路由匹配层面的完整链路）和**会讲**（面试官顺着 loader、Outlet、打分算法、权限路由任意一个环节追问都能拆解回答）。

---

## 一、使用与实践

### 1. createBrowserRouter 与 RouterProvider：Data Router 的入口

用一个医生工作站的场景搭建整个 Data Router：顶层是工作站布局，子路由是患者列表和患者详情。

```jsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <DoctorWorkstation />,
    children: [
      {
        path: "patients",
        element: <PatientList />,
        loader: fetchPatientList,
      },
      {
        path: "patients/:patientId",
        element: <PatientDetail />,
        loader: fetchPatientDetail,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}
```

`createBrowserRouter` 接收的是一份**路由配置数组**而不是 JSX 树——这一点和 6.0 之前的 `<BrowserRouter><Routes><Route /></Routes></BrowserRouter>` 声明式写法有本质区别：配置数组可以在渲染之前就被完整地遍历、打分、匹配，`loader` 才有机会在组件渲染前跑起来。`RouterProvider` 拿到这个已经创建好的 router 实例后，只负责订阅它的状态变化并渲染当前匹配到的 UI。

> 💬 **面试官会问**：`createBrowserRouter` 和 `<BrowserRouter>` 有什么本质区别，为什么 Data Router 一定要用配置对象？
>
> ✅ **标准答案**：`<BrowserRouter>` 系的声明式路由是"渲染的时候才知道匹配到了哪个 `<Route>`"，数据请求只能等组件渲染完、`useEffect` 触发才开始；`createBrowserRouter` 是把整棵路由树以纯数据对象的形式一次性交给路由实例，路由实例可以在真正渲染任何组件之前，就先完成路径匹配、算出这次导航涉及哪些路由节点，进而在渲染前就把这些节点的 `loader` 全部触发。**数据请求提前到渲染之前**，这是配置对象形态存在的根本原因。

### 2. loader：路由级数据预取

`loader` 是挂在路由配置上的函数，在导航到这个路由**之前**触发。

```jsx
async function fetchPatientDetail({ params }) {
  const res = await fetch(`/api/patients/${params.patientId}`);
  if (!res.ok) {
    throw new Response("患者不存在", { status: 404 });
  }
  return res.json();
}
```

`loader` 接收的第一个参数里有 `params`（路径参数）、`request`（可以读取 query string、header）。它可以是异步函数，React Router 会在导航开始时调用它，并等待它 resolve 之后才把新页面渲染出来——如果需要"边导航边显示 loading"，可以配合 `useNavigation()` 读取导航状态，而不是像 `useEffect` 那样先渲染空页面再补数据。

> 💬 **面试官会问**：`loader` 抛出的错误会发生什么？
>
> ✅ **标准答案**：`loader` 里 `throw` 出的 `Response` 或普通 `Error` 会被路由配置里的 `errorElement`（v6）/ 路由级 `ErrorBoundary`（v7 框架模式）捕获渲染，不会导致白屏或未处理的 Promise rejection——这是 loader 报错处理和普通异步请求手写 try/catch 的本质区别，报错路径也是路由配置的一部分。

### 3. action：表单提交与数据变更

`action` 处理的是"写"操作，通常搭配 `<Form method="post">`。

```jsx
async function updatePatientNote({ request, params }) {
  const formData = await request.formData();
  const note = formData.get("note");
  await fetch(`/api/patients/${params.patientId}/note`, {
    method: "POST",
    body: JSON.stringify({ note }),
    headers: { "Content-Type": "application/json" },
  });
  return null;
}

// 路由配置里：{ path: "patients/:patientId", element: <PatientDetail />, loader: fetchPatientDetail, action: updatePatientNote }

function PatientNoteForm() {
  return (
    <Form method="post">
      <textarea name="note" />
      <button type="submit">保存病历备注</button>
    </Form>
  );
}
```

`<Form method="post">` 提交时不会触发浏览器默认的整页刷新，而是被 Data Router 拦截，找到当前路由匹配到的 `action` 执行；`action` 执行完之后，React Router 会**自动重新调用页面上所有活跃的 `loader`**（这个动作叫 revalidation），保证页面数据和刚才的写操作保持一致，不需要手写"提交成功后手动重新 fetch 一次"的逻辑。

> 💬 **面试官会问**：`action` 提交成功之后，页面数据为什么会自动更新？
>
> ✅ **标准答案**：React Router 有一套 revalidation 机制——只要一次导航里包含了 `action`（无论是表单提交还是 `useSubmit`），`action` 完成后会自动重新运行当前页面匹配到的所有 `loader`，重新获取最新数据并触发一次组件重渲染，开发者不需要手动调用 `refetch`。
>
> 🎁 **加分答案**：如果某个 `loader` 明确知道自己的数据这次不需要重新拉取（比如是一份几乎不变的静态字典），可以在路由配置里写 `shouldRevalidate` 函数手动跳过，避免不必要的重复请求。

### 4. useLoaderData：读取预取的数据

```jsx
import { useLoaderData } from "react-router-dom";

function PatientDetail() {
  const patient = useLoaderData();
  return (
    <div>
      <h2>{patient.name}</h2>
      <p>诊断：{patient.diagnosis}</p>
    </div>
  );
}
```

`useLoaderData()` 读到的正是这个组件对应路由配置里 `loader` 的返回值——这里没有 `loading`/`error` 状态需要手动管理，因为当这个组件真正开始渲染的时候，数据已经确定是可用的（`loader` 已经 resolve 过了），错误分支已经被 `errorElement` 接管。

### 5. 嵌套路由与 Outlet

```jsx
function DoctorWorkstation() {
  return (
    <div className="workstation">
      <NavHeader />
      <Outlet />
    </div>
  );
}
```

`<Outlet />` 渲染的是当前匹配到的子路由内容——路由配置里 `path: "/"` 的 `element` 是 `DoctorWorkstation`，它的 `children` 里 `path: "patients"` 匹配到时，`PatientList` 就会被塞进 `DoctorWorkstation` 渲染出的 `<Outlet />` 所在的位置。

> 💬 **面试官会问**：`<Outlet />` 和 `props.children` 有什么区别？
>
> ✅ **标准答案**：`props.children` 是父组件在 JSX 里显式传入的静态内容，而 `<Outlet />` 渲染的内容是**动态**的——它取决于当前 URL 匹配到路由树的哪一层子路由，同一个父组件在不同的子路径下，`<Outlet />` 位置渲染出来的东西完全不同，这个"取什么渲染"的逻辑是路由匹配算法算出来的，不是父组件自己决定的。

### 6. useParams / useNavigate / useRevalidator

```jsx
function PatientDetail() {
  const { patientId } = useParams();       // 读取路径参数
  const navigate = useNavigate();          // 命令式跳转
  const revalidator = useRevalidator();    // 手动触发 loader 重新执行

  return (
    <div>
      <button onClick={() => navigate(-1)}>返回列表</button>
      <button onClick={() => revalidator.revalidate()}>刷新病历数据</button>
      <p>当前患者 ID：{patientId}</p>
    </div>
  );
}
```

`useRevalidator` 是 Data Router 特有的：当页面数据可能已经在后端变化（比如另一个标签页改了数据、或者一个 WebSocket 推送提示有更新），可以调用 `revalidator.revalidate()` 主动重跑当前所有活跃的 `loader`，不需要绕回 `action` 或者手写一遍原来的 fetch 逻辑。

---

## 二、设计与原理

### 1. Data Router vs 组件内 useEffect 请求：解决请求瀑布

三级嵌套路由——工作站布局、患者列表、患者详情——如果各自在组件里用 `useEffect` 发请求，执行顺序是：布局组件先渲染 → 挂载完成触发布局自己的 `useEffect` → 渲染出列表组件 → 列表组件挂载后才触发它的 `useEffect` → 渲染出详情组件 → 详情组件挂载后才触发它的 `useEffect`。三层请求是**严格串行**的，每一层都要等上一层组件先挂载完毕，用户会看到 loading 状态一层套一层地转，总耗时是三层请求耗时的累加。

Data Router 把数据获取提升到"路由匹配"这一步，而不是"组件渲染完成"这一步。一次导航发生时，路由实例先算出这次导航会命中路由树的哪几层（工作站布局、患者列表、患者详情三个节点全部命中），然后把这三层的 `loader` **一次性并行触发**，等它们全部 resolve 之后，才把对应的组件树渲染出来。三层请求的总耗时从"累加"变成"取最慢的那一层"，这是 Data Router 相比 `useEffect` 请求瀑布的核心优势。

> 💬 **面试官会问**：Data Router 具体是怎么把请求瀑布问题解决的？
>
> ✅ **标准答案**：请求瀑布的根源是"渲染和请求绑在了组件生命周期上"——子组件必须等父组件先挂载完才能开始自己的请求。Data Router 把 loader 的调用时机从"组件挂载后"提前到"路由匹配完成后、组件渲染之前"，一次导航匹配到的所有路由节点的 loader 会通过 `Promise.all` 一起并行发出，不再依赖组件树的挂载顺序，等全部数据都齐了再统一渲染，从根上避免了瀑布。

### 2. 对比 Vue Router 4 的导航守卫：时机钩子 vs 一等公民

Vue Router 4 的 `beforeEnter` 本质上是一个"导航到某个路由之前会被调用"的时机钩子，它不规定数据应该放在哪里、怎么和组件对接——开发者可以在 `beforeEnter` 里发请求，但拿到的数据要自己想办法传给组件（存到 Vuex/Pinia，或者挂到 `to.meta` 上），路由系统本身不关心这份数据的生命周期。

React Router 的 `loader` 不是一个孤立的时机钩子，它是路由配置对象上的**一等字段**，和 `element`、`path` 平级；它的返回值有官方指定的消费方式（`useLoaderData`），错误有官方指定的处理路径（`errorElement`），revalidation 时机也是路由系统统一调度的。这就是"路由即数据依赖声明"范式——数据获取不再是开发者在某个钩子里自由发挥的副作用，而是路由配置本身就在声明"这个路径需要哪些数据"。

> 💬 **面试官会问**：Vue Router 的 `beforeEnter` 能不能实现和 `loader` 一样的效果？
>
> ✅ **标准答案**：功能上可以做到类似效果（导航前发请求、拿到数据再进入页面），但设计层次不同——`beforeEnter` 只提供"什么时候"，数据怎么存、怎么给组件用、出错怎么处理，都要开发者自己搭一套约定；`loader` 把这些环节都统一到路由配置和一组配套 API 里，成为框架层面的标准答案，团队协作时不需要每个人重新发明一套"路由钩子里的数据怎么传"的方案。

### 3. 嵌套路由与组件树的对应关系

路由配置本身就是一棵树，`children` 字段体现的父子关系，和最终渲染出来的组件树是**同构**的——路由树有多深，`<Outlet />` 嵌套渲染就有多深。这不是巧合，而是刻意的设计：路由匹配算法在一次导航里，会把从根到叶命中的所有节点收集成一个数组（比如 `[工作站布局, 患者列表]` 或 `[工作站布局, 患者详情]`），渲染时按顺序把这个数组"折叠"成嵌套的 `<Outlet />` 插槽——外层节点的 `element` 渲染出来，它内部的 `<Outlet />` 位置渲染下一个节点的 `element`，直到数组末尾。

📍**配图点**：左侧画一棵路由配置树（工作站布局 → 患者列表 / 患者详情两个子节点），右侧画对应的组件渲染树，中间用箭头一一对应，患者详情节点旁边标注"这一层的 `<Outlet/>` 插槽渲染的就是右侧对应层级的内容"。

### 4. 路由匹配算法：computeScore 打分规则

一个 URL 可能同时匹配多条路由规则（比如 `/patients/new` 既能匹配 `/patients/:action` 也能匹配 `/patients/new` 这条更具体的静态路径），React Router 用一个打分函数决定谁赢。核心思路是：**路径切成的每一段（segment）都打分，静态段分数最高，动态参数段次之，空段最低，通配符段倒扣分**，最后取总分最高的路由。

这样设计是为了保证匹配结果**唯一且符合直觉**——如果不打分，只按路由声明的顺序"先声明先匹配"，路由表一旦变大，写在后面的更具体路径永远匹配不到（会被前面某条宽泛的动态路由抢先命中），团队协作时谁的路由声明顺序稍微调整了一下，整个应用的路由行为就可能跟着变。打分算法把"谁应该赢"这件事从"声明顺序"变成"路径本身有多具体"，声明顺序不再重要，路由表可以任意顺序书写。

> 💬 **面试官会问**：路径匹配时，动态参数段和静态段谁的优先级更高？为什么这样设计？
>
> ✅ **标准答案**：静态段优先级更高。原因是静态段（比如 `/patients`）代表"精确匹配这个词"，信息量最大、歧义最小；动态段（比如 `/:id`）能匹配任意值，信息量小、容易和别的路由产生歧义。给静态段更高的分数，能保证"越具体的路径优先命中"，避免宽泛的动态路由抢走本该匹配到更精确静态路由的请求。
>
> 🎁 **加分答案**：通配符段（`*`）会让总分倒扣分，这是因为通配符本质上是"兜底"语义，任何东西都能匹配上，必须保证它的优先级低于所有其他具体声明的路由，否则通配符路由会抢在真正该匹配的路由之前生效。

### 5. History API 监听：基于 history 库监听 popstate

Data Router 的 `createBrowserHistory` 内部会监听浏览器原生的 `popstate` 事件——用户点击浏览器的前进/后退按钮时，URL 会变但页面不会重新加载，`popstate` 是唯一能感知到这次变化的信号。路由实例监听到 `popstate` 后，重新执行一次匹配、重新触发对应 `loader`，才能让"点后退键"这个动作也走一遍完整的 Data Router 数据预取流程，而不是只改了地址栏、页面内容却没跟上。

这一点在本篇「四、手写实现」里会看到一个真实的反例：手写版本一开始的 `createBrowserHistory` 只处理了 `pushState`，完全没有监听 `popstate`，导致点浏览器后退按钮 URL 变了但页面纹丝不动——这正是本篇要在手写实现里补上的第一个坑。

> 💬 **面试官会问**：为什么 Data Router 的 history 对象必须监听 `popstate`？
>
> ✅ **标准答案**：`pushState`/`replaceState` 是代码主动调用触发的，能被自己的调用点顺便通知路由系统；但浏览器前进/后退按钮改变 URL 时不会经过这两个方法，唯一会触发的是浏览器原生的 `popstate` 事件。如果不监听它，路由系统就无法感知到"用户通过浏览器按钮切换了地址"，会导致地址栏变了、组件树却没有跟着重新匹配渲染。

### 6. 权限路由的动态生成原理

权限路由的核心思路是：拿到用户角色后，**过滤**一份完整的路由配置数组，只保留这个角色有权访问的节点，再把过滤后的结果交给 `createBrowserRouter`。

```jsx
function buildRoutesByRole(role) {
  const allRoutes = [
    { path: "patients", element: <PatientList />, loader: fetchPatientList, roles: ["doctor", "nurse"] },
    { path: "billing", element: <Billing />, loader: fetchBillingData, roles: ["admin"] },
  ];
  return allRoutes.filter((route) => route.roles.includes(role));
}

const router = createBrowserRouter([
  { path: "/", element: <DoctorWorkstation />, children: buildRoutesByRole(currentUser.role) },
]);
```

这只解决了"没权限的路由不会出现在路由表里、Outlet 自然渲染不出来"，但更彻底的做法是把权限校验也塞进 `loader`——在数据真正开始请求之前就判断这次导航是否有权限，没权限直接 `throw redirect("/403")`，这样即使用户拿到了一个不该有的路由路径（比如直接改地址栏 URL），请求也不会真的发出去：

```jsx
async function fetchBillingData({ request }) {
  const user = await getCurrentUser();
  if (!user.roles.includes("admin")) {
    throw redirect("/403");
  }
  return fetch("/api/billing").then((res) => res.json());
}
```

这就是"数据加载层面的权限拦截"——权限校验不是在组件渲染出来之后才补一层判断（这时候数据可能已经发出去了），而是在 `loader` 执行的最开始就完成拦截，数据请求本身根本不会发生。

> 💬 **面试官会问**：权限路由一般怎么设计？
>
> ✅ **标准答案**：两层防护——一层是根据角色过滤路由配置数组，让没权限的路由压根不出现在路由树里，避免用户从导航菜单点进去；另一层是在 `loader` 内部做权限校验，即使用户直接改地址栏访问到了未授权路径，`loader` 也会在真正发起数据请求之前拦截并跳转，不给没权限的请求任何执行机会。
>
> 🎁 **加分答案**：只做路由过滤而不做 loader 校验是不够的——路由过滤只影响"渲染出的导航链接/是否匹配到该组件"，如果用户手动改 URL 直接命中某个节点，没有 loader 校验的话数据请求可能已经发出去了，这是纯前端路由拦截的天然局限，真正的权限边界永远要在后端接口层再校验一遍。

### 7. 约定式路由（umi）对比

umi 等框架采用的是**约定式路由**：扫描 `pages/` 目录结构，自动生成路由配置——`pages/patients/[id].tsx` 自动转成 `/patients/:id` 这样的动态参数路由，`pages/patients/_layout.tsx` 自动被识别为该目录下所有页面的嵌套布局，生成阶段直接在生成的路由代码里写入 `React.lazy(() => import(...))`，自动完成按路由的代码分割，开发者不需要手写任何路由配置。

这是"配置显式声明"（React Router）和"约定自动生成"（umi）两种方案的取舍：

| 维度 | 约定式路由（umi） | 显式配置路由（React Router） |
|------|------|------|
| 上手成本 | 低——新增页面只需按约定命名文件，路由自动生成 | 中——每条路由需要手工在配置数组里声明 |
| 可预测性 | 需要理解一套目录命名约定才能预判某文件生成什么路由 | 路由表就是代码，所见即所得，调试和迁移更直接 |
| 维护成本 | 目录结构规整时几乎零维护成本 | 路由表需要随页面增删手工同步 |
| 适用场景 | 大型多团队协作、页面数量巨大且结构规整的系统（后台管理系统矩阵） | 路由结构复杂多变、需要精细控制加载时机的 C 端产品 |

大型后台系统往往有成百上千个页面、多个团队并行开发，约定式路由让新成员"看目录结构就懂页面层级"，减少了大量手工同步路由表的心智负担；但代价是路由行为不够直观——一个文件改了名字，路由路径可能悄悄变了，需要熟悉这套约定才能预判。C 端产品的路由结构通常更少但更精细（比如某个路由需要自定义的加载策略、需要和 A/B 实验结合动态决定渲染哪个组件），显式配置能让这些细节都写在明面上，不需要绕开约定去做特殊处理。

> 💬 **面试官会问**：约定式路由（umi）和显式配置式路由（React Router）在团队协作和灵活性上各有什么取舍？
>
> ✅ **标准答案**：约定式路由用目录结构换取零配置和低维护成本，适合页面量大、结构规整的大型多团队系统，代价是路由行为需要理解一套命名约定才能预判；显式配置路由用手工维护路由表换取完全的可控性和可预测性，适合路由结构复杂多变、需要精细控制的场景，代价是路由表要跟着页面变化手工同步。
>
> 🎁 **加分答案**：两者并不互斥——umi 底层的路由渲染最终也是走 React Router（或类似的路由库），约定式只是在"生成路由配置"这一步做了自动化，本质上仍然是把一份配置数组交给运行时的路由系统去匹配渲染，理解了 React Router 的配置结构，才能看懂 umi 生成出来的路由代码究竟做了什么。

---

## 三、源码解析（重点代码，来源 GitHub 仓库，以 remix-run/react-router 仓库为准）

> React Router 源码地址：https://github.com/remix-run/react-router（本篇源码引用锁定 `react-router@6.26.0`，`packages/router/router.ts` 与 `packages/router/utils.ts`）

### 1. Data Router 创建：packages/react-router-dom/index.tsx — createBrowserRouter

```typescript
// createBrowserRouter（节选，标注了核心作用：把路由配置 + 浏览器 history 一起交给底层 createRouter）
export function createBrowserRouter(
  routes: RouteObject[],
  opts?: DOMRouterOpts,
): DataRouter {
  return createRouter({
    basename: opts?.basename,
    getContext: opts?.getContext,
    future: opts?.future,
    history: createBrowserHistory({ window: opts?.window }),
    hydrationData: opts?.hydrationData || parseHydrationData(),
    routes,
    mapRouteProperties: defaultMapRouteProperties,
    hydrationRouteProperties,
    dataStrategy: opts?.dataStrategy,
    patchRoutesOnNavigation: opts?.patchRoutesOnNavigation,
    window: opts?.window,
    instrumentations: opts?.instrumentations,
  }).initialize();
}
```

**关键点**

1. `createBrowserRouter` 本身不包含匹配、调度这些核心逻辑，它只是把"用浏览器 `history.pushState`/`popState` 管理地址"这件事（`createBrowserHistory`）和用户传入的路由配置 `routes` 一起塞进底层通用的 `createRouter`——`createHashRouter`/`createMemoryRouter` 的实现结构完全一样，只是 `history` 换一个实现
2. `hydrationData` 支持 SSR 场景下把服务端已经跑过的 `loader` 结果直接注入，避免客户端再发一次重复请求
3. 返回值调用了 `.initialize()`——这一步才真正触发路由实例开始监听 history 变化、执行首次匹配和 loader 调用，`createBrowserRouter` 函数本身只是"组装 + 启动"

### 2. 路由匹配与打分：packages/router/utils.ts — computeScore

```typescript
// computeScore（节选，路径打分核心算法）
const paramRe = /^:[\w-]+$/;
const dynamicSegmentValue = 3;
const indexRouteValue = 2;
const emptySegmentValue = 1;
const staticSegmentValue = 10;
const splatPenalty = -2;
const isSplat = (s: string) => s === "*";

function computeScore(path: string, index: boolean | undefined): number {
  let segments = path.split("/");
  let initialScore = segments.length;
  if (segments.some(isSplat)) {
    initialScore += splatPenalty;
  }

  if (index) {
    initialScore += indexRouteValue;
  }

  return segments
    .filter((s) => !isSplat(s))
    .reduce(
      (score, segment) =>
        score +
        (paramRe.test(segment)
          ? dynamicSegmentValue
          : segment === ""
          ? emptySegmentValue
          : staticSegmentValue),
      initialScore
    );
}
```

**关键点**

1. 每一段的基础分数差距很大：静态段 `staticSegmentValue = 10`，动态参数段只有 `dynamicSegmentValue = 3`，空段（比如路径开头的 `/`）只有 `emptySegmentValue = 1`——这就是「二、4」讲的"静态段优先级远高于动态段"在代码层面的直接体现，静态段的权重是动态段的三倍多，哪怕多出好几个动态段也很难反超一个静态段的优势
2. 通配符段（`*`）会被 `filter` 过滤掉不参与逐段累加，但会在 `initialScore` 上倒扣 `splatPenalty = -2` 分——保证通配符路由（兜底路由）的总分尽量低，不会抢在具体路由前面命中
3. `index` 路由（`{ index: true }`，即父路径本身不带任何额外 segment 的默认子路由）额外加 `indexRouteValue = 2` 分，用于在"父路径本身"和"父路径的其它具体子路由"之间做区分排序
4. 最终排序时会把每条候选路由分支的所有匹配节点的分数汇总比较，取总分最高的分支，这保证了排序结果只取决于路径本身有多"具体"，与路由声明在数组里的先后顺序无关

### 3. 导航状态机核心：packages/router/router.ts — startNavigation 并行触发链路上所有 loader

```typescript
// defaultDataStrategy（节选，默认的数据加载策略：并行 resolve 本次导航匹配到的所有路由节点）
function defaultDataStrategy(
  opts: DataStrategyFunctionArgs
): ReturnType<DataStrategyFunction> {
  return Promise.all(opts.matches.map((m) => m.resolve()));
}
```

**关键点**

1. `opts.matches` 是这次导航匹配到的路由节点数组（比如医生工作站场景下会是 `[工作站布局, 患者详情]` 两个节点），`m.resolve()` 内部真正调用的就是该节点的 `loader`——`Promise.all` 直接把数组里每个节点的 `resolve()` 一起发出去，不等前一个 resolve 完再发下一个
2. 这正是「二、1」讲的"父子路由的 loader 并行执行"在源码里的落地：`startNavigation` 内部完成路径匹配、算出 `matches` 之后，会调用这个默认策略（除非用户传了自定义 `dataStrategy`），一次性把整条匹配链路上的 loader 全部触发
3. React Router 也允许用户传入自定义 `dataStrategy` 替换这个默认实现——比如想要"某些路由节点串行执行、某些并行执行"的更精细控制，可以在这里插入自定义调度逻辑，这也是这个函数被设计成"可替换默认值"而不是硬编码在 `startNavigation` 内部的原因

### 4. loader/action 数据流：packages/router/router.ts — callLoaderOrAction

```typescript
// callLoaderOrAction（节选，单个路由节点的 loader/action 调用主链路，已省略 lazy() 相关分支）
async function callLoaderOrAction(
  type: "loader" | "action",
  request: Request,
  match: AgnosticDataRouteMatch,
  manifest: RouteManifest,
  mapRouteProperties: MapRoutePropertiesFunction,
  handlerOverride: Parameters<DataStrategyMatch["resolve"]>[0],
  staticContext?: unknown
): Promise<HandlerResult> {
  let result: HandlerResult;
  let onReject: (() => void) | undefined;

  let runHandler = (
    handler: AgnosticRouteObject["loader"] | AgnosticRouteObject["action"]
  ): Promise<HandlerResult> => {
    // 设置一个永不 resolve 的 abortPromise，配合 Promise.race 让 abort 信号能立刻短路掉还在等待的 handler
    let reject: () => void;
    let abortPromise = new Promise<HandlerResult>((_, r) => (reject = r));
    onReject = () => reject();
    request.signal.addEventListener("abort", onReject);

    let actualHandler = (ctx?: unknown) => {
      if (typeof handler !== "function") {
        return Promise.reject(new Error(`...`));
      }
      return handler(
        { request, params: match.params, context: staticContext },
        ...(ctx !== undefined ? [ctx] : [])
      );
    };

    let handlerPromise: Promise<HandlerResult> = (async () => {
      try {
        let val = await actualHandler();
        return { type: "data", result: val };
      } catch (e) {
        return { type: "error", result: e };
      }
    })();

    return Promise.race([handlerPromise, abortPromise]);
  };

  try {
    let handler = match.route[type];
    if (!handler) {
      throw getInternalRouterError(404, { pathname: new URL(request.url).pathname });
    }
    result = await runHandler(handler);
  } catch (e) {
    return { type: ResultType.error, result: e };
  } finally {
    if (onReject) request.signal.removeEventListener("abort", onReject);
  }

  return result;
}
```

**关键点**

1. `type` 参数决定这次调用的是 `loader` 还是 `action`——两者共用完全同一套调用链路（`runHandler`/异常捕获/abort 竞速），唯一区别是 `match.route[type]` 取到的是哪个字段，这也是为什么本篇「一、3」`action` 的报错处理、revalidation 触发方式和 `loader` 高度一致的源码层原因
2. `Promise.race([handlerPromise, abortPromise])` 是一个"竞速短路"模式：`abortPromise` 永远不会自己 resolve，只有当 `request.signal` 触发 `abort` 事件时才会被外部 `reject`——如果用户在 `loader` 还没跑完时又触发了一次新的导航，上一次导航会被取消，这个竞速机制保证了"过期的 loader 结果不会覆盖新导航的结果"
3. `try/catch` 把 handler 执行中的任何异常（包括本篇「二、6」权限校验里 `throw redirect(...)` 抛出的重定向）统一包装成 `{ type: ResultType.error, result: e }` 返回，交给上层统一处理，而不是让异常直接冒泡打断整个导航流程

### 5. Outlet 渲染子路由 与 useLoaderData 读取数据：packages/react-router/lib/hooks.tsx

```typescript
// useOutlet（节选，Outlet 组件底层依赖的 hook）
export function useOutlet(context?: unknown): React.ReactElement | null {
  let outlet = React.useContext(RouteContext).outlet;
  return React.useMemo(
    () =>
      outlet && (
        <OutletContext.Provider value={context}>
          {outlet}
        </OutletContext.Provider>
      ),
    [outlet, context],
  );
}

// Outlet 组件本身只是对 useOutlet 的一层包装
export function Outlet(props: { context?: unknown }): React.ReactElement | null {
  return useOutlet(props.context);
}
```

```typescript
// useLoaderData（节选，从当前路由 id 读取对应 loader 的返回值）
export function useLoaderData<T = any>(): SerializeFrom<T> {
  let data = useDataRouterData("useLoaderData");
  let routeId = useCurrentRouteId("useLoaderData");
  return data.loaderData[routeId] as SerializeFrom<T>;
}
```

**关键点**

1. `<Outlet />` 渲染的内容来自 `React.useContext(RouteContext).outlet`——`outlet` 这个值不是 `Outlet` 组件自己算出来的，而是路由匹配阶段算好之后，通过 `RouteContext.Provider` 从上层路由节点"喂"给下层的，`Outlet` 只是负责把 context 里已经算好的元素渲染出来，这也验证了「二、3」讲的"路由树驱动组件树，`Outlet` 只是插槽"
2. `useLoaderData` 通过 `useCurrentRouteId` 拿到"当前组件对应的是路由树里哪一个节点"，再用这个 id 去 `data.loaderData` 这个以路由 id 为 key 的映射里取值——不同层级的路由节点各自的 `loader` 结果互不干扰，即使父子路由的 loader 同时并行执行，取数据时也不会串
3. `useOutlet` 里额外包了一层 `OutletContext.Provider`，让父路由可以通过 `<Outlet context={...} />` 主动往下传一份数据（配合 `useOutletContext()` 读取），这是"父路由向子路由传递数据"的官方通道，和 `useLoaderData` 读取"当前节点自己的 loader 数据"是两条独立的数据流

---

## 四、手写实现（已有代码解读 + 新增 Outlet/嵌套路由/loader）

本节基于本地真实项目 `D:\github\react-router-source`（GitHub：https://github.com/lotosv2010/react-router-source）编写。需要先说明一件事：这份手写实现走的是 react-router **v5 时代**的 API 形态（`<Switch>`/`<Route>`/`<Redirect>` + Context 广播），`history` 层、`matchPath` 路径匹配、`Router`/`RouteContext` 这些都不是本篇新写的代码，是这个项目早期就已经落地的真实代码——本篇的任务是先把这些已经跑通的代码逐行讲透，然后在此基础上**新增本篇真正要讲的三样东西**：修复一个真实存在的 `popstate` 监听缺陷、补上嵌套路由配置 + `<Outlet />`、以及一个极简的 `loader` 机制，让这份 v5 风格的手写路由具备本篇「一、二」讲的 Data Router 核心能力。

### 1. history 层：createBrowserHistory（已有代码，逐行解读）

```javascript
// D:\github\react-router-source\src\lib\history\createBrowserHistory.js（已有代码，完整保留）
function createBrowserHistory() {
  const globalHistory = window.history;
  let listeners = []; // 监听路由变化
  let prompt;
  function go(delta) {
    globalHistory.go(delta);
  }
  function setState(nextState) {
    Object.assign(history, nextState);
    history.length = globalHistory.length;
    listeners.forEach(listen => listen(nextState));
  }
  function push(path) {
    const action = 'PUSH';
    let pathname, state;
    if (typeof path === 'string') {
      pathname = path;
    } else if (typeof path === 'object') {
      pathname = path.pathname;
      state = path.state;
    }
    if (prompt) {
      const message = prompt({ pathname, state });
      const result = window.confirm(message);
      if (!result) return;
    }
    const location = { pathname, state };
    globalHistory.pushState(state, null, pathname);
    setState({ action, location });
  }
  const history = {
    length: globalHistory.length,
    action: 'POP',
    location: { pathname: window.location.pathname, state: globalHistory.state },
    go,
    back() { go(-1); },
    forward() { go(1); },
    push,
    listen(listener) {
      listeners.push(listener);
      return function () {
        listeners = listeners.filter(item => item !== listener);
      }
    },
    block(message) {
      prompt = message;
      return () => prompt = null;
    }
  }
  return history;
}
export default createBrowserHistory;
```

**关键点**

1. `push` 调用 `globalHistory.pushState` 之后手动调用 `setState`——这是"代码主动导航"的路径，`listeners` 能感知到
2. `listen` 返回一个取消监听的函数，`Router` 组件在 `componentWillUnmount` 时调用它清理订阅，这是标准的发布订阅注册/反注册模式
3. **这里有本篇「二、5」提到的真实缺陷**：整个文件没有任何地方监听浏览器原生的 `popstate` 事件——用户点击浏览器后退/前进按钮时，`window.location.pathname` 会变，但 `listeners` 不会被触发，`Router` 组件的 `state.location` 也就不会更新，页面会停留在旧内容上，和地址栏显示的 URL 不一致

### 2. 本篇新增：修复 popstate 监听

这是本篇真正新写的代码，直接在 `createBrowserHistory` 里补上 `popstate` 监听，让浏览器前进/后退也能驱动路由重新渲染：

```javascript
// 本篇新增：在 history 对象创建之后，追加 popstate 监听
window.addEventListener('popstate', () => {
  // popstate 触发时，globalHistory.state 已经是浏览器自动帮我们恢复好的 state
  const location = {
    pathname: window.location.pathname,
    state: globalHistory.state,
  };
  // action 类型标记为 POP，区别于代码主动调用 push 触发的 PUSH，方便后续按需区分处理
  setState({ action: 'POP', location });
});
```

`popstate` 事件不会经过 `push`/`replace` 这两个方法，是浏览器在用户点击前进/后退按钮时**主动派发**的，唯一能拿到这次变化的地方就是全局事件监听。补上这段代码之后，`setState` 会像代码主动 `push` 时一样通知所有 `listeners`，`Router` 组件的 `state.location` 才会跟着浏览器按钮的操作同步更新。

### 3. matchPath 路径匹配（已有代码，逐行解读）

```javascript
// D:\github\react-router-source\src\lib\react-router\matchPath.js（已有代码，完整保留）
import { pathToRegexp } from 'path-to-regexp'

function compilePath(path, options) {
  const keys = [];
  const regexp = pathToRegexp(path, keys, options);
  return { regexp, keys };
}

function matchPath(pathname, options = {}) {
  const { path = "/", exact = false, strict = false, sensitive = false } = options;
  const { regexp, keys } = compilePath(path, { end: exact, strict, sensitive });
  const match = regexp.exec(pathname);
  if (!match) return null;
  const [url, ...values] = match;
  const isExact = pathname === url;
  if (exact && !isExact) return null;
  return {
    path,
    url,
    isExact,
    params: keys.reduce((memo, key, index) => {
      memo[key.name] = values[index];
      return memo;
    }, {})
  }
}

export default matchPath;
```

**关键点**

1. `pathToRegexp(path, keys, options)` 把 `/patients/:id` 这样的路径模板编译成正则表达式，同时把 `:id` 这类动态段记录进 `keys` 数组（每个 key 有 `name` 字段）
2. `regexp.exec(pathname)` 匹配成功后，`match` 数组第一项是完整匹配到的 URL，后面依次是各个动态段捕获到的值，`keys.reduce` 把 `keys` 和这些捕获值按下标一一对应，组装成 `{ id: "123" }` 这样的 `params` 对象
3. `exact` 对应 `pathToRegexp` 的 `end` 选项——`end: true` 时正则必须匹配到字符串末尾，否则 `/patients` 也能匹配上 `/patients/123` 这种更长的路径（只匹配前缀）

### 4. RouterContext 与 Router（已有代码，逐行解读）

```javascript
// D:\github\react-router-source\src\lib\react-router\Router.js（已有代码，完整保留）
import React, { Component } from 'react'
import RouterContext from './RouterContext'

class Router extends Component {
  constructor(props) {
    super(props)
    this.state = { location: props.history.location }
    this.unListen = this.props.history.listen(({ location }) => {
      this.setState({ location })
    })
  }
  componentWillUnmount() {
    this.unListen()
  }
  render() {
    const value = {
      history: this.props.history,
      location: this.state.location
    }
    return (
      <RouterContext.Provider value={value}>
        {this.props.children}
      </RouterContext.Provider>
    )
  }
}
export default Router
```

**关键点**

1. `constructor` 里立刻调用 `history.listen`，把 `history` 变化和组件自身 `setState` 绑在一起——`history` 对象本身不依赖 React，`Router` 只是"把 history 的变化事件转成 React 的 state 更新"这一层桥接
2. 整棵路由树共用同一个 `RouterContext.Provider value={{ history, location }}`，任何深度嵌套的子组件都能通过 `RouterContext.Consumer`（或 `useContext`）直接拿到最新的 `location`，这是本篇「二、3」"嵌套路由与组件树对应"能够成立的前提——数据能穿透任意层级传下去
3. `componentWillUnmount` 里调用 `unListen()`，配合「一、3」讲的 `push`/`popstate` 场景，避免组件卸载后 history 变化还在尝试给一个已经不存在的组件调用 `setState`

### 5. 本篇新增：嵌套路由配置的匹配函数 matchRoutes

已有的 `matchPath`（第 3 小节）一次只匹配一条独立路径，不理解"父子路由嵌套"这个概念。本篇新增一个 `matchRoutes` 函数，把路由配置树按父子路径拼接后逐层匹配，返回从根到叶的匹配链路数组：

```javascript
// 本篇新增：src/lib/react-router/matchRoutes.js
import matchPath from './matchPath'

function joinPath(parentPath, childPath) {
  if (!childPath) return parentPath
  return `${parentPath.replace(/\/$/, '')}/${childPath.replace(/^\//, '')}`
}

// 递归匹配路由配置树，返回从根到叶命中的节点数组：[{route, match}, {route, match}, ...]
function matchRoutes(routes, pathname, parentPath = '') {
  for (const route of routes) {
    const fullPath = joinPath(parentPath, route.path)
    // 没有 children 的节点才要求精确匹配（exact），有 children 的节点只需要匹配前缀
    const match = matchPath(pathname, { path: fullPath, exact: !route.children })
    if (!match) continue
    if (route.children) {
      const childMatches = matchRoutes(route.children, pathname, fullPath)
      if (childMatches) return [{ route, match }, ...childMatches]
      continue
    }
    return [{ route, match }]
  }
  return null
}

export default matchRoutes
```

**关键点**

1. `joinPath` 把父路由的 `path` 和子路由的 `path` 拼接成完整路径——路由配置里子路由只需要写相对片段（比如 `patients/:patientId`），不需要每层都写全 `/patients/:patientId`，这也是本篇「一、1」路由配置里 `children` 写法的匹配依据
2. 有 `children` 的节点用 `exact: false` 匹配（只要求前缀命中即可，因为真正决定"是否精确匹配"的是它的某个子节点），叶子节点（没有 `children`）用 `exact: true`，这是"匹配到父路由不代表匹配到了完整页面，必须一路匹配到叶子节点才算这次导航成立"的直接实现
3. 这是一个**按声明顺序匹配、命中第一个就返回**的简化实现，没有实现本篇「二、4」讲的 `computeScore` 打分排序——生产级实现里，如果同一层有多条可能同时匹配的路由，应该给每条候选路径打分后取分数最高的分支，而不是像这里一样"谁写在前面谁赢"；受篇幅限制这里只保留最核心的嵌套匹配逻辑，打分排序可以在这个函数的候选收集环节按「二、4」的算法自行补充

### 6. 本篇新增：Outlet 与 RouteContext

真正让"匹配链路数组"变成"嵌套渲染的组件树"的，是把 `matches` 数组从叶子往根**折叠**成一层套一层的 Context Provider：

```javascript
// 本篇新增：src/lib/react-router/RouteContext.js
import { createContext } from 'react'
// 每一层路由节点都会往下游提供一份新的 value：outlet 是下一层要渲染的元素，
// params/loaderData 是当前这一层自己的路径参数和 loader 结果
export const RouteContext = createContext({ outlet: null, params: {}, loaderData: undefined })
```

```javascript
// 本篇新增：src/lib/react-router/renderMatches.js
import React from 'react'
import { RouteContext } from './RouteContext'

// 从数组末尾（叶子节点）往前折叠：outlet 初始值是 null（叶子节点没有下一层可渲染），
// 每往前折叠一层，就把"上一轮折叠出来的结果"作为这一层的 outlet 值往下传
function renderMatches(matches, loaderDataMap) {
  return matches.reduceRight((outlet, { route, match }) => {
    const Component = route.component
    const value = {
      outlet,
      params: match.params,
      loaderData: loaderDataMap[route.id],
    }
    return (
      <RouteContext.Provider value={value}>
        <Component />
      </RouteContext.Provider>
    )
  }, null)
}

export default renderMatches
```

```javascript
// 本篇新增：src/lib/react-router/Outlet.js
import { useContext } from 'react'
import { RouteContext } from './RouteContext'

export default function Outlet() {
  const { outlet } = useContext(RouteContext)
  return outlet
}
```

**关键点**

1. `reduceRight` 从数组最后一项（叶子节点，比如患者详情）开始折叠，第一次折叠时 `outlet` 参数是初始值 `null`——叶子节点渲染的 `<Outlet />` 天然拿到 `null`，渲染不出任何东西，这是"叶子路由没有下一层子路由"的直接体现
2. 每往前折叠一层（比如从患者详情折到工作站布局），上一轮折叠出来的 `<RouteContext.Provider><PatientDetail/></RouteContext.Provider>` 整体会被塞进这一层的 `value.outlet` 里——`DoctorWorkstation` 组件内部渲染的 `<Outlet />` 读到的正是这个已经包好的元素，这正是本篇「二、3」"路由树驱动组件树，`Outlet` 是插槽"的完整实现路径
3. 这里的实现方式是刻意简化后便于理解的版本：真实 react-router 内部把"当前层级的 outlet"计算和 `RouteContext` 的传递逻辑拆得更细（配合 `DataRouterContext`、错误边界、`HydrateFallback` 等一整套机制），但"用递归/折叠的方式把 matches 数组变成嵌套 Provider，靠 Context 把下一层元素喂给上一层的 Outlet"这个核心思路是一致的，足以支撑本篇的教学场景

### 7. 本篇新增：极简 loader 机制

最后把 `matchRoutes` 算出来的匹配链路和 `loader` 字段接起来，导航发生时并行触发链路上所有节点的 `loader`：

```jsx
// 本篇新增：src/lib/react-router/DataRouter.js
import React, { useEffect, useState } from 'react'
import RouterContext from './RouterContext'
import matchRoutes from './matchRoutes'
import renderMatches from './renderMatches'

function collectLoaders(matches) {
  return matches.filter(({ route }) => typeof route.loader === 'function')
}

export default function DataRouter({ history, routes }) {
  const [state, setState] = useState(() => ({
    location: history.location,
    matches: matchRoutes(routes, history.location.pathname) || [],
    loaderDataMap: {},
  }))

  useEffect(() => {
    let cancelled = false

    async function runLoaders(location) {
      const matches = matchRoutes(routes, location.pathname) || []
      const toLoad = collectLoaders(matches)
      // 📚 关键点：Promise.all 一次性并行触发这条匹配链路上所有节点的 loader，
      // 不等前一个 resolve 完再发下一个——这是本篇「二、1」讲的核心优化点在手写版本里的落地
      const results = await Promise.all(
        toLoad.map(({ route, match }) => route.loader({ params: match.params }))
      )
      if (cancelled) return
      const loaderDataMap = {}
      toLoad.forEach(({ route }, i) => { loaderDataMap[route.id] = results[i] })
      setState({ location, matches, loaderDataMap })
    }

    runLoaders(history.location)
    const unlisten = history.listen(({ location }) => runLoaders(location))
    return () => {
      cancelled = true
      unlisten()
    }
  }, [history, routes])

  const value = { history, location: state.location }
  return (
    <RouterContext.Provider value={value}>
      {renderMatches(state.matches, state.loaderDataMap)}
    </RouterContext.Provider>
  )
}
```

```javascript
// 本篇新增：hooks.js 补充 useLoaderData（与已有的 useParams/useHistory/useLocation 并列）
import { useContext } from 'react'
import { RouteContext } from './RouteContext'

export function useLoaderData() {
  return useContext(RouteContext).loaderData
}
```

用"医生工作站 -> 患者列表 -> 患者详情"场景接起来：

```jsx
// 本篇新增：src/routes/index.tsx 里的路由配置（对照本篇「一、1」的 createBrowserRouter 写法）
const routes = [
  {
    id: 'workstation',
    path: '/',
    component: DoctorWorkstation,
    children: [
      {
        id: 'patients',
        path: 'patients',
        component: PatientList,
        loader: () => fetch('/api/patients').then(res => res.json()),
      },
      {
        id: 'patient-detail',
        path: 'patients/:patientId',
        component: PatientDetail,
        loader: ({ params }) =>
          fetch(`/api/patients/${params.patientId}`).then(res => res.json()),
      },
    ],
  },
]

function App() {
  const history = createBrowserHistory() // 已经在第 2 小节修复了 popstate 监听
  return <DataRouter history={history} routes={routes} />
}
```

导航到 `/patients/1` 时，`matchRoutes` 算出的链路是 `[{route: workstation}, {route: patient-detail, match: {params:{patientId:'1'}}}]`，`DataRouter` 里的 `useEffect` 会用 `Promise.all` 同时触发 `patient-detail` 节点的 `loader`（`workstation` 节点没有 `loader` 字段，被 `collectLoaders` 过滤掉不会被调用），等这一个 `loader` resolve 之后才更新 `state`、触发 `renderMatches` 把 `PatientDetail` 渲染进 `DoctorWorkstation` 的 `<Outlet />` 位置，`PatientDetail` 内部调用 `useLoaderData()` 就能直接拿到已经就位的数据，不需要自己管理 loading 状态。

**验证方式**：这几段新增代码可以直接放进 `D:\github\react-router-source` 项目对应的目录（`RouteContext.js`/`renderMatches.js`/`Outlet.js`/`matchRoutes.js`/`DataRouter.js` 放进 `src/lib/react-router/`），把 `src/routes/index.tsx` 换成上面的路由配置写法，执行 `pnpm dev` 启动本地调试，依次访问 `/patients` 和 `/patients/1`，预期能看到：① 直接改地址栏访问 `/patients/1` 能正确渲染出患者详情且数据已经就位，不会有一闪而过的空白态；② 点击浏览器后退按钮能正确回到患者列表（验证第 2 小节修复的 `popstate` 监听生效）；③ 在 `runLoaders` 函数里打断点，能看到 `Promise.all` 是把当前链路上所有带 `loader` 的节点一次性发出去，而不是一个等完了再发下一个。这套新增代码目前还没有在实际项目里跑过，建议按上述步骤本地验证一遍再合入正式仓库。

---

## 五、手写实现源码地址

- https://github.com/lotosv2010/react-router-source
- https://github.com/lotosv2010/connected-react-router-source

---

## 六、参考资料

- https://reactrouter.com/
- https://zh-hans.react.dev/
- https://umijs.org/
- https://jonny-wei.github.io/blog/react/
- https://react.iamkasong.com
- https://github.com/wbccb/Frontend-Articles

---

## 💡 面试核心问

- **Data Router 的 `loader` 解决了什么问题？**
- **React Router 的嵌套路由和 `<Outlet />` 是怎么配合工作的？**
- **路由路径匹配时，动态参数段和静态段谁的优先级更高？为什么这样设计？**
- **权限路由一般怎么设计？**
- **约定式路由（umi）和显式配置式路由（React Router）在团队协作和灵活性上各有什么取舍？**

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话核心 | 面试考察频率 |
|--------|-----------|-------------|
| Data Router vs useEffect | 数据获取提升到路由匹配层，父子 loader 并行执行，解决请求瀑布 | ⭐⭐⭐⭐⭐ |
| loader/action | loader 预取数据、action 处理写操作，配合 revalidation 自动刷新页面数据 | ⭐⭐⭐⭐⭐ |
| Outlet 与嵌套路由 | 路由树驱动组件树，Outlet 是子路由内容的插槽，靠 Context 从上层喂给下层 | ⭐⭐⭐⭐ |
| computeScore 打分 | 静态段 > 动态段 > 空段 > 通配符段，保证越具体的路径优先命中且与声明顺序无关 | ⭐⭐⭐⭐ |
| popstate 监听 | 浏览器前进/后退不经过 push/replace，必须单独监听 popstate 才能同步路由状态 | ⭐⭐⭐ |
| 权限路由 | 角色过滤路由配置数组 + loader 内权限校验，双层拦截，后端仍需再校验一遍 | ⭐⭐⭐⭐ |
| 约定式 vs 显式配置 | 约定式省配置成本适合大型规整后台，显式配置换灵活可控适合复杂多变的 C 端 | ⭐⭐⭐ |

---

## 📝 思考题

**留个问题**：本篇手写的 `matchRoutes` 是"按声明顺序匹配，命中第一个就返回"，没有实现 `computeScore` 打分排序。如果路由配置里同一层同时存在 `patients/new` 和 `patients/:action` 两条规则，声明顺序不同会导致匹配结果完全不同。想一想：如果要把「二、4」讲的打分算法接进 `matchRoutes`，应该在哪一步收集"候选匹配"而不是匹配到第一个就直接返回？收集到的候选又该怎么给每条候选路径算出一个可比较的总分？

答案留在评论区，或者后续状态管理篇（第 11 篇）讲 Redux/Zustand 的发布订阅模式时，会有类似"如何设计一个可扩展的候选收集+排序机制"的对照案例。

---

> 🔖 这是「React 18 全家桶深度拆解系列」第 10 篇。上一篇：《React 18 Context: 依赖传播机制与手写实现（面试收藏级）》；下一篇预告：《React 状态管理: Redux Toolkit 源码解析与 MobX/Zustand 选型对比（生产收藏级）》
