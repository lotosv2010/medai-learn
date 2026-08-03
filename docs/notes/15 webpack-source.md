# <font style="color:rgb(51, 51, 51);">webpack打包过程</font>
## <font style="color:rgb(51, 51, 51);">初始化阶段</font>
+ <font style="color:rgb(51, 51, 51);">整理配置参数，创建基础对象如 Compiler 和 Compilation，初始化插件以及内置工厂和工具类。最后，根据 entry 配置，确定所有入口模块</font>

## <font style="color:rgb(51, 51, 51);"> 构建阶段</font>
+ <font style="color:rgb(51, 51, 51);">从 entry 文件开始，通过 loader 将模块转换为 JavaScript 代码，接着利用 Acorn 将代码解析为 AST 结构。遍历 AST 以找出模块的依赖项。接下来，递归遍历所有依赖模块及其依赖关系，直到所有项目资源被遍历完毕，从而构建出完整的模块依赖关系图</font>

## <font style="color:rgb(51, 51, 51);">生成阶段</font>
+ <font style="color:rgb(51, 51, 51);">根据 entry 配置，将各个模块组装成 Chunk 对象。接着，调用一系列 Template 工厂类将 Chunk 代码转换并封装为 Asset。最后，将 Asset 写入文件系统</font>

<!-- 这是一张图片，ocr 内容为：初始化阶段 构建阶段 生成阶段 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1747892512821-758e26dd-b356-4efd-bfb6-97b2aa1589f3.png)

# <font style="color:rgb(51, 51, 51);">流程钩子</font>
| **<font style="color:rgb(51, 51, 51);">对象</font>** | **<font style="color:rgb(51, 51, 51);">钩子</font>** | **<font style="color:rgb(51, 51, 51);">解释</font>** |
| :--- | :--- | :--- |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">environment</font> | <font style="color:rgb(51, 51, 51);">在设置编译器环境之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">afterEnvironment</font> | <font style="color:rgb(51, 51, 51);">设置编译器环境之后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">entryOption</font> | <font style="color:rgb(51, 51, 51);">在处理入口选项时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">afterPlugins</font> | <font style="color:rgb(51, 51, 51);">加载插件之后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">afterResolvers</font> | <font style="color:rgb(51, 51, 51);">初始化解析器后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">initialize</font> | <font style="color:rgb(51, 51, 51);">初始化编译器时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">beforeRun</font> | <font style="color:rgb(51, 51, 51);">在运行编译器之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">run</font> | <font style="color:rgb(51, 51, 51);">在运行编译器时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">infrastructureLog</font> | <font style="color:rgb(51, 51, 51);">记录编译器基础设施日志时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">readRecords</font> | <font style="color:rgb(51, 51, 51);">在读取构建记录时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">normalModuleFactory</font> | <font style="color:rgb(51, 51, 51);">创建普通模块工厂时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">contextModuleFactory</font> | <font style="color:rgb(51, 51, 51);">创建上下文模块工厂时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">beforeCompile</font> | <font style="color:rgb(51, 51, 51);">在编译之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">compile</font> | <font style="color:rgb(51, 51, 51);">在编译开始时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">thisCompilation</font> | <font style="color:rgb(51, 51, 51);">在当前编译之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">compilation</font> | <font style="color:rgb(51, 51, 51);">在新编译实例创建后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">make</font> | <font style="color:rgb(51, 51, 51);">在创建模块及代码块之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">addEntry</font> | <font style="color:rgb(51, 51, 51);">在添加入口点时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">NormalModuleFactory</font> | <font style="color:rgb(51, 51, 51);">beforeResolve</font> | <font style="color:rgb(51, 51, 51);">解析普通模块之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">NormalModuleFactory</font> | <font style="color:rgb(51, 51, 51);">factorize</font> | <font style="color:rgb(51, 51, 51);">在普通模块工厂创建模块之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">NormalModuleFactory</font> | <font style="color:rgb(51, 51, 51);">resolve</font> | <font style="color:rgb(51, 51, 51);">在普通模块工厂解析模块时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">NormalModuleFactory</font> | <font style="color:rgb(51, 51, 51);">afterResolve</font> | <font style="color:rgb(51, 51, 51);">解析普通模块之后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">NormalModuleFactory</font> | <font style="color:rgb(51, 51, 51);">createModule</font> | <font style="color:rgb(51, 51, 51);">在创建普通模块之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">NormalModuleFactory</font> | <font style="color:rgb(51, 51, 51);">module</font> | <font style="color:rgb(51, 51, 51);">在普通模块创建后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">buildModule</font> | <font style="color:rgb(51, 51, 51);">在构建模块时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">JavascriptParser</font> | <font style="color:rgb(51, 51, 51);">program</font> | <font style="color:rgb(51, 51, 51);">在解析JavaScript程序时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">JavascriptParser</font> | <font style="color:rgb(51, 51, 51);">preStatement</font> | <font style="color:rgb(51, 51, 51);">在处理JavaScript语句之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">JavascriptParser</font> | <font style="color:rgb(51, 51, 51);">blockPreStatement</font> | <font style="color:rgb(51, 51, 51);">在处理JavaScript块级语句之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">JavascriptParser</font> | <font style="color:rgb(51, 51, 51);">import</font> | <font style="color:rgb(51, 51, 51);">在解析import语句时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">JavascriptParser</font> | <font style="color:rgb(51, 51, 51);">importSpecifier</font> | <font style="color:rgb(51, 51, 51);">在解析import声明时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">JavascriptParser</font> | <font style="color:rgb(51, 51, 51);">statement</font> | <font style="color:rgb(51, 51, 51);">在处理JavaScript语句时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">JavascriptParser</font> | <font style="color:rgb(51, 51, 51);">finish</font> | <font style="color:rgb(51, 51, 51);">在完成JavaScript解析时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">succeedModule</font> | <font style="color:rgb(51, 51, 51);">在模块构建成功后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">NormalModuleFactory</font> | <font style="color:rgb(51, 51, 51);">beforeResolve</font> | <font style="color:rgb(51, 51, 51);">解析普通模块之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">NormalModuleFactory</font> | <font style="color:rgb(51, 51, 51);">factorize</font> | <font style="color:rgb(51, 51, 51);">在普通模块工厂创建模块之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">NormalModuleFactory</font> | <font style="color:rgb(51, 51, 51);">resolve</font> | <font style="color:rgb(51, 51, 51);">在普通模块工厂解析模块时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">NormalModuleFactory</font> | <font style="color:rgb(51, 51, 51);">afterResolve</font> | <font style="color:rgb(51, 51, 51);">解析普通模块之后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">NormalModuleFactory</font> | <font style="color:rgb(51, 51, 51);">createModule</font> | <font style="color:rgb(51, 51, 51);">在创建普通模块之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">NormalModuleFactory</font> | <font style="color:rgb(51, 51, 51);">module</font> | <font style="color:rgb(51, 51, 51);">在普通模块创建后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">buildModule</font> | <font style="color:rgb(51, 51, 51);">在构建模块时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">JavascriptParser</font> | <font style="color:rgb(51, 51, 51);">program</font> | <font style="color:rgb(51, 51, 51);">在解析JavaScript程序时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">JavascriptParser</font> | <font style="color:rgb(51, 51, 51);">preStatement</font> | <font style="color:rgb(51, 51, 51);">在处理JavaScript语句之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">JavascriptParser</font> | <font style="color:rgb(51, 51, 51);">blockPreStatement</font> | <font style="color:rgb(51, 51, 51);">在处理JavaScript块级语句之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">JavascriptParser</font> | <font style="color:rgb(51, 51, 51);">export</font> | <font style="color:rgb(51, 51, 51);">在解析export语句时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">JavascriptParser</font> | <font style="color:rgb(51, 51, 51);">exportExpression</font> | <font style="color:rgb(51, 51, 51);">在解析export表达式时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">JavascriptParser</font> | <font style="color:rgb(51, 51, 51);">finish</font> | <font style="color:rgb(51, 51, 51);">在完成JavaScript解析时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">succeedModule</font> | <font style="color:rgb(51, 51, 51);">在模块构建成功后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">succeedEntry</font> | <font style="color:rgb(51, 51, 51);">在入口模块构建成功后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">finishMake</font> | <font style="color:rgb(51, 51, 51);">在完成模块和代码块创建后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">finishModules</font> | <font style="color:rgb(51, 51, 51);">在完成模块构建后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">seal</font> | <font style="color:rgb(51, 51, 51);">在封闭编译之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">optimizeDependencies</font> | <font style="color:rgb(51, 51, 51);">在优化依赖关系之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">afterOptimizeDependencies</font> | <font style="color:rgb(51, 51, 51);">在优化依赖关系之后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">beforeChunks</font> | <font style="color:rgb(51, 51, 51);">在创建代码块之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">afterChunks</font> | <font style="color:rgb(51, 51, 51);">在创建代码块之后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">optimize</font> | <font style="color:rgb(51, 51, 51);">在优化编译过程中触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">optimizeModules</font> | <font style="color:rgb(51, 51, 51);">在优化模块时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">afterOptimizeModules</font> | <font style="color:rgb(51, 51, 51);">在优化模块之后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">optimizeChunks</font> | <font style="color:rgb(51, 51, 51);">在优化代码块时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">afterOptimizeChunks</font> | <font style="color:rgb(51, 51, 51);">在优化代码块之后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">optimizeTree</font> | <font style="color:rgb(51, 51, 51);">在优化模块和代码块关系树时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">afterOptimizeTree</font> | <font style="color:rgb(51, 51, 51);">在优化模块和代码块关系树之后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">optimizeChunkModules</font> | <font style="color:rgb(51, 51, 51);">在优化代码块模块时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">afterOptimizeChunkModules</font> | <font style="color:rgb(51, 51, 51);">在优化代码块模块之后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">shouldRecord</font> | <font style="color:rgb(51, 51, 51);">在决定是否记录编译过程中触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">reviveModules</font> | <font style="color:rgb(51, 51, 51);">在恢复模块时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">beforeModuleIds</font> | <font style="color:rgb(51, 51, 51);">在分配模块ID之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">moduleIds</font> | <font style="color:rgb(51, 51, 51);">在分配模块ID时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">optimizeModuleIds</font> | <font style="color:rgb(51, 51, 51);">在优化模块ID时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">afterOptimizeModuleIds</font> | <font style="color:rgb(51, 51, 51);">在优化模块ID之后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">reviveChunks</font> | <font style="color:rgb(51, 51, 51);">在恢复代码块时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">beforeChunkIds</font> | <font style="color:rgb(51, 51, 51);">在分配代码块ID之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">chunkIds</font> | <font style="color:rgb(51, 51, 51);">在分配代码块ID时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">optimizeChunkIds</font> | <font style="color:rgb(51, 51, 51);">在优化代码块ID时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">afterOptimizeChunkIds</font> | <font style="color:rgb(51, 51, 51);">在优化代码块ID之后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">recordModules</font> | <font style="color:rgb(51, 51, 51);">在记录模块时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">recordChunks</font> | <font style="color:rgb(51, 51, 51);">在记录代码块时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">optimizeCodeGeneration</font> | <font style="color:rgb(51, 51, 51);">在优化代码生成时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">beforeModuleHash</font> | <font style="color:rgb(51, 51, 51);">在模块哈希之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">afterModuleHash</font> | <font style="color:rgb(51, 51, 51);">在模块哈希之后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">beforeCodeGeneration</font> | <font style="color:rgb(51, 51, 51);">在代码生成之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">afterCodeGeneration</font> | <font style="color:rgb(51, 51, 51);">在代码生成之后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">beforeRuntimeRequirements</font> | <font style="color:rgb(51, 51, 51);">在处理运行时需求之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">additionalModuleRuntimeRequirements</font> | <font style="color:rgb(51, 51, 51);">在处理额外模块运行时需求时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">additionalChunkRuntimeRequirements</font> | <font style="color:rgb(51, 51, 51);">在处理额外代码块运行时需求时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">additionalTreeRuntimeRequirements</font> | <font style="color:rgb(51, 51, 51);">在处理额外依赖树运行时需求时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">runtimeModule</font> | <font style="color:rgb(51, 51, 51);">在运行时模块创建时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">afterRuntimeRequirements</font> | <font style="color:rgb(51, 51, 51);">在处理运行时需求之后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">beforeHash</font> | <font style="color:rgb(51, 51, 51);">在哈希计算之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">chunkHash</font> | <font style="color:rgb(51, 51, 51);">在代码块哈希计算时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">contentHash</font> | <font style="color:rgb(51, 51, 51);">在内容哈希计算时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">fullHash</font> | <font style="color:rgb(51, 51, 51);">在完整哈希计算时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">afterHash</font> | <font style="color:rgb(51, 51, 51);">在哈希计算之后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">recordHash</font> | <font style="color:rgb(51, 51, 51);">在记录哈希时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">beforeModuleAssets</font> | <font style="color:rgb(51, 51, 51);">在处理模块资源之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">shouldGenerateChunkAssets</font> | <font style="color:rgb(51, 51, 51);">在决定是否生成代码块资源时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">beforeChunkAssets</font> | <font style="color:rgb(51, 51, 51);">在处理代码块资源之前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">renderManifest</font> | <font style="color:rgb(51, 51, 51);">在渲染清单时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">assetPath</font> | <font style="color:rgb(51, 51, 51);">在处理资源路径时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">chunkAsset</font> | <font style="color:rgb(51, 51, 51);">在处理代码块资源时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">optimizeAssets</font> | <font style="color:rgb(51, 51, 51);">在优化资源时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">processAssets</font> | <font style="color:rgb(51, 51, 51);">在处理资源时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">afterOptimizeAssets</font> | <font style="color:rgb(51, 51, 51);">在优化资源之后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">afterProcessAssets</font> | <font style="color:rgb(51, 51, 51);">在处理资源之后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">record</font> | <font style="color:rgb(51, 51, 51);">在记录编译结果时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">needAdditionalSeal</font> | <font style="color:rgb(51, 51, 51);">在判断是否需要额外封装时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">afterSeal</font> | <font style="color:rgb(51, 51, 51);">在封装之后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">afterCompile</font> | <font style="color:rgb(51, 51, 51);">在编译完成后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">shouldEmit</font> | <font style="color:rgb(51, 51, 51);">在决定是否输出文件前触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">emit</font> | <font style="color:rgb(51, 51, 51);">在输出文件时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">assetPath</font> | <font style="color:rgb(51, 51, 51);">在处理资源路径时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">afterEmit</font> | <font style="color:rgb(51, 51, 51);">在输出文件之后触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">needAdditionalPass</font> | <font style="color:rgb(51, 51, 51);">在判断是否需要额外的编译过程时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">emitRecords</font> | <font style="color:rgb(51, 51, 51);">在输出记录时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">done</font> | <font style="color:rgb(51, 51, 51);">在编译完成时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compiler</font> | <font style="color:rgb(51, 51, 51);">shutdown</font> | <font style="color:rgb(51, 51, 51);">在编译器关闭时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">statsNormalize</font> | <font style="color:rgb(51, 51, 51);">在统计标准化时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">statsFactory</font> | <font style="color:rgb(51, 51, 51);">在统计工厂创建时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">statsPrinter</font> | <font style="color:rgb(51, 51, 51);">在统计打印机创建时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">processErrors</font> | <font style="color:rgb(51, 51, 51);">在处理错误时触发的钩子</font> |
| <font style="color:rgb(51, 51, 51);">Compilation</font> | <font style="color:rgb(51, 51, 51);">processWarnings</font> | <font style="color:rgb(51, 51, 51);">在处理警告时触发的钩子</font> |


# <font style="color:rgb(51, 51, 51);">初始化阶段</font>
## <font style="color:rgb(51, 51, 51);">工作流程</font>
+ <font style="color:rgb(51, 51, 51);">在Webpack 5的初始化阶段，主要的任务是对配置进行解析、校验和设置，创建编译器对象以及启动编译过程。以下是初始化阶段的流程：</font>
    - <font style="color:rgb(51, 51, 51);">1.读取和解析配置：Webpack首先读取配置文件（如：webpack.config.js），将配置文件中的参数解析成一个配置对象。如果没有指定配置文件，Webpack会使用默认配置</font>
    - <font style="color:rgb(51, 51, 51);">2.配置校验：Webpack使用schema-utils对解析得到的配置对象进行校验，确保配置参数正确无误</font>
    - <font style="color:rgb(51, 51, 51);">3.实例化Compiler：根据解析后的配置对象创建一个Compiler对象。Compiler对象是Webpack的核心，它负责管理整个构建过程</font>
    - <font style="color:rgb(51, 51, 51);">4.注册插件：将配置中的插件实例化并挂载到Compiler上。插件会在构建过程的各个阶段通过监听钩子来影响构建结果</font>
    - <font style="color:rgb(51, 51, 51);">5.初始化内置钩子：在初始化过程中，Webpack会初始化一些内置的钩子，用于在构建过程中触发一些事件</font>
    - <font style="color:rgb(51, 51, 51);">6.触发environment钩子：在环境准备好之前，Compiler触发environment钩子事件</font>
    - <font style="color:rgb(51, 51, 51);">7.触发afterEnvironment钩子：在环境准备好之后，Compiler触发afterEnvironment钩子事件</font>
    - <font style="color:rgb(51, 51, 51);">8.触发entryOption钩子：在解析入口选项前，Compiler触发entryOption钩子事件</font>
    - <font style="color:rgb(51, 51, 51);">9.解析入口文件：根据配置对象的entry属性解析入口文件。Webpack会为每个入口文件创建一个Chunk，并确定各个模块之间的依赖关系。</font>
    - <font style="color:rgb(51, 51, 51);">10.触发afterPlugins钩子：在插件注册完毕后，Compiler触发afterPlugins钩子事件</font>
    - <font style="color:rgb(51, 51, 51);">11.触发afterResolvers钩子：在解析器准备完毕后，Compiler触发afterResolvers钩子事件</font>
    - <font style="color:rgb(51, 51, 51);">12.开始编译：调用Compiler的run方法开始执行编译过程。此时，Compiler会进入到构建流程的各个阶段，包括构建模块、分析依赖、优化等</font>
+ <font style="color:rgb(51, 51, 51);">这些步骤构成了Webpack 5的初始化阶段流程。在这个阶段，Webpack主要是在准备好所有必要的资源，以便顺利地进入编译过程</font>

<!-- 这是一张图片，ocr 内容为：合并用户配置 校验配置 规范化配置文件并设置默认值 创建COMPLIER 注册用户插件 ENTRYOPTIONPLUGIN 注册默认插件 开始COMPILE构建 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1747893167851-21158ff9-1adf-4c59-b064-41e2e133b447.png)

<!-- 这是一张图片，ocr 内容为：WEBPACKOPTIONSAPPLY ENTRYOPTIONPLUGIN WEBPACK.JS ENTRYPLUGIN COMPILER COMPILATION PROCESS APPLY MAKE ADDENTRY -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1747908668784-fd2a8c76-8d9e-43af-90e1-64812908a99c.png)

## <font style="color:rgb(51, 51, 51);">初始化阶段</font>
### <font style="color:rgb(51, 51, 51);">debugger.js</font>
```javascript
const path = require('path');
// 引入自定义的webpack模块
const webpack = require('webpack');
// const webpack = require('../g-webpack-v2');
// 引入Node.js的文件系统模块，用于操作文件
const fs = require('fs');
// 引入webpack配置文件
const config = require('./webpack.config');

// 使用配置文件创建一个webpack编译器实例
const compiler = webpack(config);
// 运行编译器，开始构建过程
compiler.run((err, stats) => {
  // 打印构建错误信息（如果有的话）
  console.log(err);
  // 将构建统计数据转换为JSON字符串，包括模块、代码块和资源信息
  let statsString = JSON.stringify(stats.toJson({
    modules: true,
    chunks: true,
    assets: true
  }));
  // 将统计数据字符串写入文件myStats.json，用于分析构建过程
  // __dirname 代表当前文件所在目录
  fs.writeFileSync(path.resolve(__dirname, 'dist', 'myStats.json'), statsString);
});
```

### <font style="color:rgb(51, 51, 51);">webpack.config.js</font>
```javascript
const path = require("path");

module.exports = {
  mode: 'development',
  devtool: false,
  entry: path.resolve(__dirname, 'src/index.js'),
  output: {
    clean: true,
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  }
}
```

### <font style="color:rgb(51, 51, 51);">src</font>
```javascript
import title from './title.js';

console.log(title);
```

```javascript
export default "Hello g-webpack";
```

### 源码实现
#### <font style="color:rgb(51, 51, 51);">webpack.js</font>
```javascript

const { getNormalizedWebpackOptions } = require('./config/normalization');
const { applyWebpackOptionsBaseDefaults, applyWebpackOptionsDefaults } = require('./config/defaults');
const Compiler = require('./Compiler');
const NodeEnvironmentPlugin = require('./node/NodeEnvironmentPlugin');
const WebpackOptionsApply = require('./WebpackOptionsApply');

/**
 * 校验配置文件
 * @param {object} config 配置项
 * @return {object} 配置项
 */
const validateSchema = config => {
  return config;
}

/**
 * 创建编译器
 * @param {object} rawOptions webpack配置
 * @return {object} 创建的编译器实例
 */
const createCompiler = rawOptions => {
  // 获取配置项
  const options = getNormalizedWebpackOptions(rawOptions);
  // 配置项基础设置
  applyWebpackOptionsBaseDefaults(options);
  // 创建编译器实例
  const compiler = new Compiler(options.context, options);
  // 添加内置插件 
  new NodeEnvironmentPlugin().apply(compiler);
  //! 1.4.注册插件：将配置中的插件实例化并挂载到Compiler上。插件会在构建过程的各个阶段通过监听钩子来影响构建结果
  if (Array.isArray(options.plugins)) {
    for (const plugin of options.plugins) {
      plugin.apply(compiler);
    }
  }
  //! 1.5.初始化内置钩子：在初始化过程中，Webpack会初始化一些内置的钩子，用于在构建过程中触发一些事件
  applyWebpackOptionsDefaults(options);
  //! 1.6.触发environment钩子：在环境准备好之前，Compiler触发environment钩子事件
  compiler.hooks.environment.call();
  //! 1.7.触发afterEnvironment钩子：在环境准备好之后，Compiler触发afterEnvironment钩子事件
  compiler.hooks.afterEnvironment.call();
  // 挂载默认插件
  new WebpackOptionsApply().process(options, compiler);
  // 触发 initialize 钩子
  compiler.hooks.initialize.call();
  // console.dir(options, { depth: null });
  return compiler;
}

/**
 * 创建webpack
 * @param {object} config webpack配置
 * @return {object} 返回 Compiler 实例
 */
const webpack = config => {
  debugger
  //! 1.1.读取和解析配置：Webpack首先读取配置文件（如：webpack.config.js），将配置文件中的参数解析成一个配置对象。如果没有指定配置文件，Webpack会使用默认配置
  //! 1.2.配置校验：Webpack使用schema-utils对解析得到的配置对象进行校验，确保配置参数正确无误
  validateSchema(config);
  //! 1.3.实例化Compiler：根据解析后的配置对象创建一个Compiler对象。Compiler对象是Webpack的核心，它负责管理整个构建过程
  const compiler = createCompiler(config);
  return compiler;
}

module.exports = webpack;
```

#### <font style="color:rgb(51, 51, 51);">Compiler.js</font>
```javascript
const { SyncHook, SyncBailHook, AsyncParallelHook, AsyncSeriesHook } = require('tapable');
const NormalModuleFactory = require('./NormalModuleFactory');
const Compilation = require('./Compilation');

/**
 * 编译器类
 */
class Compiler {
  constructor(context, options) {
    this.context = context; // 项目根目录
    this.options = options; // 配置项
    this.hooks = { // 钩子
      environment: new SyncHook(),
      afterEnvironment: new SyncHook(),
      initialize: new SyncHook(), 
      entryOption: new SyncBailHook(["context", "entry"]),
      compilation: new SyncHook(["compilation", "params"]),
      make: new AsyncParallelHook(["compilation"]),
      afterPlugins: new SyncHook(["compiler"]),
      afterResolvers: new SyncHook(["compiler"]),
      beforeRun: new AsyncSeriesHook(["compiler"]),
      run: new AsyncSeriesHook(["compiler"]),
      normalModuleFactory: new SyncHook(["normalModuleFactory"]),
      beforeCompile: new AsyncSeriesHook(["params"]),
      compile: new SyncHook(["params"]),
      thisCompilation: new SyncHook(["compilation", "params"]),
      finishMake:  new AsyncSeriesHook(["compilation"]),
      afterCompile: new AsyncSeriesHook(["compilation"]), 
    };
  }
  run(callback) {
    const finalCallback = (err, stats) => {
      // 构建完成，调用回调函数
      callback(err, stats);
    };
    const onCompiled = (err, stats) => {
      finalCallback(err, stats);
    };
    // 在运行编译器之前出发的钩子
    this.hooks.beforeRun.callAsync(this, err => {
      if (err) return finalCallback(err);
      // 在运行编译器时出发的钩子
      this.hooks.run.callAsync(this, err => {
        if (err) return finalCallback(err);
        //! 1.12.开始编译：调用Compiler的run方法开始执行编译过程。此时，Compiler会进入到构建流程的各个阶段，包括构建模块、分析依赖、优化等
        this.compile(onCompiled);
      })
    });
  }
  compile(callback) {
    debugger;
    // 创建新的编译参数对象
    const params = this.newCompilationParams();
    // 在编译之前调用钩子，并传入编译参数对象
    this.hooks.beforeCompile.callAsync(params, err => { 
      // 开始编译
      this.hooks.compile.call(params);
      // 创建新的编译对象
      const compilation = this.newCompilation(params);
      // 在创建模块及代码块之前调用钩子，并传入编译对象
      this.hooks.make.callAsync(compilation, err => {
        this.hooks.finishMake.callAsync(compilation, err => {
          process.nextTick(() => {
            compilation.finish(err => {
              compilation.seal(err => {
                this.hooks.afterCompile.callAsync(compilation, err => {
                  return callback(null, compilation);
                });
              })
            })
          })
        });
      });
    });
  }
  /**
   * 创建compilation对象
   */
  newCompilationParams() {
    const params = {
      normalModuleFactory: this.createNormalModuleFactory(),
    }
    return params;
  }
  /**
   * 创建普通模块工厂
   */
  createNormalModuleFactory() {
    // 创建一个普通模块工厂
    const  normalModuleFactory = new NormalModuleFactory({
      context: this.options.context
    });
    // 当创建好一个普通模块工厂的时候，会触发normalModuleFactory钩子
    this.hooks.normalModuleFactory.call(normalModuleFactory);
    return normalModuleFactory;
  }
  /**
   * 创建编译对象
   */
  newCompilation(params) {
    const compilation = this.createCompilation(params);
    // 在当前编译之前，会触发thisCompilation钩子
    this.hooks.thisCompilation.call(compilation, params);
    // 在新的编译实例创建之后，会触发compilation钩子
    this.hooks.compilation.call(compilation, params);
    return compilation;
  }
  /**
   * 创建 compilation 对象
   */
  createCompilation(params) {
    return new Compilation(this, params);
  }
}

module.exports = Compiler;
```

#### NormalModuleFactory
```javascript
/**
 * 普通模块工厂
 */
class NormalModuleFactory {}

module.exports = NormalModuleFactory;
```

#### Compilation
```javascript
const { SyncHook } = require("tapable");

/**
 * 编译类
 */
class Compilation {
  constructor() {
    this.dependencyFactories = new Map();
    this.entries = new Map(); // 存放入口(key, name, entryData)
    this.hooks = {
      seal:  new SyncHook([]),
      addEntry: new SyncHook(['entry', 'options']),
    }
    this.modules = [];
    this.chunks = [];
    this.assets = {};
  }

  _addEntryItems(context, entry, target, optionsOrName, callback) {
    const  { name } = optionsOrName; // 获取入口名称
    // 创建入口数据对象
    const entryData = {
      dependencies: [],
      options: optionsOrName,
    };
    // 添加入口数据
    entryData[target].push(entry);
    // 添加入口数据到入口集合中
    this.entries.set(name, entryData);
    // 调用addEntry钩子
    this.hooks.addEntry.call(name, optionsOrName);

    // TODO
    callback();
  }
  
  /**
   * TODO 开始从入口编译
   * @param {string} context 根目录
   * @param {object} entry 入口
   * @param {object} optionsOrName 
   * @param {function} callback 回调
   */
  addEntry(context, entry, optionsOrName, callback) {
    this._addEntryItems(context, entry, 'dependencies', optionsOrName, callback);
  }

  finish(callback) {
    return callback();
  }
  /**
   * 封存，把模块封装成代码块
   */
  seal(callback) {
    this.hooks.seal.call();
    return callback();
  }
  toJson(options) {
    return {
      modules: this.modules.map((module) => module.toJson(options)),
      chunks: this.chunks.map((chunk) => chunk.toJson(options)),
      assets: Object.keys(this.assets).map((key) => ({
        name: key,
        source: this.assets[key].source(),
        size: this.assets[key].size(),
      })),
    };
  }
}

module.exports = Compilation;
```

#### <font style="color:rgb(51, 51, 51);">normalization.js</font>
```javascript
/**
 * 获取经过 normalization 的静态资源
 * @param {object} entry 静态资源
 * @return {object} 返回经过 normalization 的静态资源
 */
const getNormalizedStatic = entry => {
  if (typeof entry === 'string') {
    return {
      main: {
        import: [entry]
      }
    }
  } else if (Array.isArray(entry)) {
    return {
      main: {
        import: entry
      }
    };
  }
  return entry;
}

/**
 * 获取经过 normalization 的 webpack 配置
 * @param {object} config webpack 配置
 * @return {object} 返回经过 normalization 的 webpack 配置
 */
const getNormalizedWebpackOptions = config => {
  return {
    ...config,
    entry: getNormalizedStatic(config.entry)
  }
}

exports.getNormalizedWebpackOptions = getNormalizedWebpackOptions;
```

#### <font style="color:rgb(51, 51, 51);">defaults.js</font>
```javascript
/**
 * 创建一个属性 context 
 * @param {object} obj 源对象
 * @param {string} prop 属性名
 * @param {function} factory 创建属性值的工厂函数
 */
const F = (obj, prop, factory) => {
  if(obj[prop] === undefined) {
    obj[prop] = factory();
  }
}

/**
 * 应用 webpack 配置项的基础默认值
 * @param {object} options webpack 配置项
 */
const applyWebpackOptionsBaseDefaults = (options) => {
  F(options, 'context', () => process.cwd());
}

/**
 * 应用webpack配置项的默认值
 * @param {object} options webpack 配置项
 */
const applyWebpackOptionsDefaults = (options) => {
  F(options, 'context', () => process.cwd());
}

exports.applyWebpackOptionsBaseDefaults = applyWebpackOptionsBaseDefaults;
exports.applyWebpackOptionsDefaults = applyWebpackOptionsDefaults;
```

#### <font style="color:rgb(51, 51, 51);">WebpackOptionsApply.js</font>
```javascript
const EntryOptionPlugin = require("./EntryOptionPlugin");

/**
 * 挂载默认插件
 */
class WebpackOptionsApply {
  process(options, compiler) {
    //! 1.8.触发entryOption钩子：在解析入口选项前，Compiler触发entryOption钩子事件
    new EntryOptionPlugin().apply(compiler);
    //触发entryOption事件执行
    compiler.hooks.entryOption.call(options.context, options.entry);
    //! 1.10.触发afterPlugins钩子：在插件注册完毕后，Compiler触发afterPlugins钩子事件
    compiler.hooks.afterPlugins.call(compiler);
    //! 1.11.触发afterResolvers钩子：在解析器准备完毕后，Compiler触发afterResolvers钩子事件
    compiler.hooks.afterResolvers.call(compiler);
    return options;
  }
}

module.exports = WebpackOptionsApply;
```

#### <font style="color:rgb(51, 51, 51);">NodeEnvironmentPlugin.js</font>
```javascript
const fs = require("fs");

/**
 * 创建一个 NodeEnvironmentPlugin 插件
 */
class NodeEnvironmentPlugin {
  constructor(options) {
    this.options = options;
  }
  apply(compiler) {
    compiler.inputFileSystem = fs; // 指定读取文件的模块为 fs 模块
    compiler.outputFileSystem = fs; // 指定写入文件的模块为 fs 模块
  }
}

module.exports = NodeEnvironmentPlugin;
```

#### <font style="color:rgb(51, 51, 51);">EntryOptionPlugin.js</font>
```javascript
const EntryPlugin = require("./EntryPlugin");

/**
 * 获取入口配置
 */
class EntryOptionPlugin {
  apply(compiler) {
    // 监听 entryOption 事件
    compiler.hooks.entryOption.tap("EntryOptionPlugin", (context, entry) => {
      EntryOptionPlugin.applyEntryOption(compiler, context, entry);
      return true;
    });
  }
  /**
   * 获取入口配置
   * @param {object} compiler 解析器实例
   * @param {string} context 上下文
   * @param {array} entry 入口
   */
  static applyEntryOption(compiler, context, entry) {
    for (const [name, desc] of Object.entries(entry)) {
      const options = { name };
      for (const entry of desc.import) {
        new EntryPlugin(context, entry, options).apply(compiler);
      }
    }
  }
}

module.exports = EntryOptionPlugin;
```

#### <font style="color:rgb(51, 51, 51);">EntryPlugin.js</font>
```javascript
const  EntryDependency = require("./dependencies/EntryDependency");

/**
 * EntryPlugin 插件
 */
class EntryPlugin {
  constructor(context, entry, options) {
    this.context = context; // 根目录
    this.entry = entry; // 入口
    this.options = options || {}; // 配置项

  }
  apply(compiler) {
    // 注册compilation钩子, 当我们开始编译时，会触发compilation钩子，此时可以获取compilation对象
    // normalModuleFactory: 模块工厂对象
    compiler.hooks.compilation.tap("EntryPlugin", (compilation, { normalModuleFactory }) => {
      // 注册入口依赖和模块工厂的关联
      compilation.dependencyFactories.set(EntryDependency, normalModuleFactory); // EntryDependency: 入口依赖 要通过 EntryDependency 创建模块工厂对象，来生产对应的入口模块
    });
    //! 1.9.解析入口文件：根据配置对象的entry属性解析入口文件。Webpack会为每个入口文件创建一个Chunk，并确定各个模块之间的依赖关系。
    const { entry, options, context } = this;
    //  调用静态方法通过entry得到一个依赖实例
    const dep = EntryPlugin.createDependency(entry, options);
    // 注册make钩子，在make钩子中调用addEntry方法
    compiler.hooks.make.tapAsync("EntryPlugin", (compilation, callback) => {
      // TODO 此处时真正进入第二个流程，编译流程
      //! 2.1.addEntry方法用于向编译过程中添加入口点
      compilation.addEntry(context, dep, options, callback);
    });
  }

  static createDependency(entry, options) {
    return new EntryDependency(entry);
  }
}

module.exports = EntryPlugin;
```

#### <font style="color:rgb(51, 51, 51);">EntryDependency.js</font>
```javascript
const ModuleDependency = require("./ModuleDependency");

/**
 * EntryDependency是ModuleDependency的子类，
 * EntryDependency是入口模块的依赖
 */
class EntryDependency extends ModuleDependency {
  constructor(request) {
    super(request);
  }
  get type() {
    return "entry";
  }
  get category() {
    return "esm";
  }
}

module.exports = EntryDependency;
```

#### <font style="color:rgb(51, 51, 51);">ModuleDependency.js</font>
```javascript

const Dependency = require("../Dependency");
const DependencyTemplate = require("../DependencyTemplate");

/**
 * 所有模块依赖的父类
 */
class ModuleDependency extends Dependency {
  constructor(request) {
    super();
    this.request = request;
  }
}

ModuleDependency.Template = DependencyTemplate;
module.exports = ModuleDependency;
```

#### <font style="color:rgb(51, 51, 51);">Dependency.js</font>
```javascript
/**
 * 所有依赖的父类
 */
class Dependency {}

module.exports = Dependency;
```

#### <font style="color:rgb(51, 51, 51);">DependencyTemplate.js</font>
```javascript
class DependencyTemplate {
  apply(dependency, source, templateContext) {
    throw new Error('DependencyTemplate.apply() must be implemented'); // apply 方法必须由子类实现
  }
}

module.exports = DependencyTemplate;
```

# <font style="color:rgb(51, 51, 51);">构建阶段</font>
## <font style="color:rgb(51, 51, 51);">构建流程</font>
+ <font style="color:rgb(51, 51, 51);">1.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">addEntry</font>`<font style="color:rgb(51, 51, 51);">方法用于向编译过程中添加入口点</font>
+ <font style="color:rgb(51, 51, 51);">2.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">addModuleTree</font>`<font style="color:rgb(51, 51, 51);">方法用于向Compilation中添加整个模块树，并构建相应的依赖关系</font>
+ <font style="color:rgb(51, 51, 51);">3.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">handleModuleCreation</font>`<font style="color:rgb(51, 51, 51);">方法根据文件类型构建模块</font>
+ <font style="color:rgb(51, 51, 51);">4.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">factorizeModule</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">方法的作用是使用模块工厂生产对应的模块</font>
+ <font style="color:rgb(51, 51, 51);">5.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">create</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">方法用于创建一个新的 NormalModule 对象</font>
+ <font style="color:rgb(51, 51, 51);">6.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">factorize</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">用于生成模块</font>
+ <font style="color:rgb(51, 51, 51);">7.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">createModule</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">方法创建一个新的NormalModule实例，并设置模块的上下文、请求、解析器、工厂等属性</font>
+ <font style="color:rgb(51, 51, 51);">8.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">addModule</font>`<font style="color:rgb(51, 51, 51);">向编译器中添加一个新的模块</font>
+ <font style="color:rgb(51, 51, 51);">9.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">moduleGraph</font>`<font style="color:rgb(51, 51, 51);">记录模块依赖图</font>
+ <font style="color:rgb(51, 51, 51);">10.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">buildModule</font>`<font style="color:rgb(51, 51, 51);">方法编译构建指定的模块</font>
+ <font style="color:rgb(51, 51, 51);">11.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">NormalModule</font>`<font style="color:rgb(51, 51, 51);">的build方法是编译模块的过程，将模块的源代码转化为可在浏览器中执行的代码，并且会递归处理模块依赖</font>
+ <font style="color:rgb(51, 51, 51);">12.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">runLoaders</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">方法用于执行与模块相关的所有 loader，并将每个 loader 处理后的结果传递给下一个 loader 或者传递给后续流程处理</font>
+ <font style="color:rgb(51, 51, 51);">13.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">JavaScriptParser</font>`<font style="color:rgb(51, 51, 51);">的parse方法解析JavaScript代码，生成AST抽象语法树，并通过遍历AST树触发各种处理方法。</font>
+ <font style="color:rgb(51, 51, 51);">14.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">acorn</font>`<font style="color:rgb(51, 51, 51);">的</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">parse</font>`<font style="color:rgb(51, 51, 51);">方法是将源代码解析为抽象语法树（AST）的函数</font>
+ <font style="color:rgb(51, 51, 51);">15.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">blockPreWalkStatements</font>`<font style="color:rgb(51, 51, 51);">方法用于遍历语句块中的每个语句，并在遍历每个语句前调用一个回调函数，可以用于代码转换等操作</font>
+ <font style="color:rgb(51, 51, 51);">16.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">addDependency</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">方法将依赖资源添加为 Dependency 对象，并通过调用 module 对象的 addDependency 将 Dependency 对象转换为 Module 对象并添加到依赖数组中</font>
    - <font style="color:rgb(51, 51, 51);">16.1.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">HarmonyImportSideEffectDependency</font>`<font style="color:rgb(51, 51, 51);">用于处理 ES6 import 语句，当 import 的模块不会导出任何值时，会产生该依赖。它表示该依赖仅仅是一种副作用，不产生任何导出和导入，可以在构建过程中被忽略掉</font>
    - <font style="color:rgb(51, 51, 51);">16.2.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">HarmonyImportSpecifierDependency</font>`<font style="color:rgb(51, 51, 51);">是一个依赖项类型，它表示一个 JavaScript 模块导入另一个 JavaScript 模块中的特定部分（例如，变量、函数等）的依赖关系</font>
    - <font style="color:rgb(51, 51, 51);">16.3.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">HarmonyCompatibilityDependency</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">用于处理 Webpack 和 ES6 模块之间的兼容性问题。当使用 ES6 模块时，由于 ES6 模块默认是严格模式，而 CommonJS 模块是非严格模式，所以在使用 ES6 模块时，需要特殊处理，将 ES6 模块转换为 CommonJS 模块</font>
    - <font style="color:rgb(51, 51, 51);">16.4.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">ConstDependency</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">表示一个常量依赖关系，主要用于将源代码中的特定字符串替换为一个固定值（常量）。</font>
    - <font style="color:rgb(51, 51, 51);">16.5.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">HarmonyExportExpressionDependency</font>`<font style="color:rgb(51, 51, 51);">： HarmonyExportExpressionDependency 是一个表示 ES6 模块导出表达式的依赖类，用于处理模块中的 export 语句，以便在构建过程中正确解析和生成导出的代码。</font>
        * <font style="color:rgb(51, 51, 51);">16.6.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">HarmonyExportHeaderDependency</font>`<font style="color:rgb(51, 51, 51);">用于处理 ES6 模块导出依赖。当使用 export default foo 这样的语法导出模块时，会产生该依赖</font>
+ <font style="color:rgb(51, 51, 51);">17.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">handleParseResult</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">方法用于处理模块解析后的 AST 和依赖数组，进一步解析依赖并添加到模块对象的依赖数组中</font>
+ <font style="color:rgb(51, 51, 51);">18.</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">processModuleDependencies</font>`<font style="color:rgb(51, 51, 51);">方法用于处理模块依赖，包括分析依赖关系、创建依赖对象和处理循环依赖等</font>

<!-- 这是一张图片，ocr 内容为：牛肉饼 开门窗樵福来福 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1747920751324-ac52ef98-2333-426d-834e-a49e28a628cd.png)

## <font style="color:rgb(51, 51, 51);">ModuleGraph</font>
### 概述
+ <font style="color:rgb(51, 51, 51);">在</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Compilation</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">类中，维护一个全局唯一的</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">ModuleGraph</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">实例对象</font>
+ <font style="color:rgb(51, 51, 51);">每当解析出新模块时，将</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Module</font>`<font style="color:rgb(51, 51, 51);">、</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Dependency</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">以及模块间关系——</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">ModuleConnection</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">记录到</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">compilation.moduleGraph</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">对象中</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">_dependencyMap</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">属性：记录</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Dependency</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">对象与</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">ModuleGraphConnection</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">连接对象之间的映射关系。在后续处理中，可以基于这个映射快速找到</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Dependency</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">实例对应的引用者和被引用者</font>
    - `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">_moduleMap</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">属性：记录</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Module</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">与</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">ModuleGraphModule</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">之间的映射关系</font>

<font style="color:rgb(51, 51, 51);"> </font><!-- 这是一张图片，ocr 内容为：DEPENDENCY TYPE:ENTRY CATEGORY!ESM REQUEST://SRC/INDEX,IS COMPILATION MODULEGRAPH MODULEGRAPH DEPENDENCYMAPIKEAKMAP DEPENDENCY , MUDOLEGRAPHCONNECTIONZ MODULEMAP:MAP(MODULE ,MUDOLEGRAPHMODULE> MODULEGRAPHCONNECTION LEPENDENCY:引用依赖 ORIGINMODULE:引用模块 MODULE:被引用模块 MODULEGRAPHMODULE NORMALMODULE TYPE: JAVASCRIPT/AUTO {INCOMINGCONNECTIONS:SORTABLESET.(MODULEGRAPHCON)其他模块指向当前模块指向当前模块的连接 OUTGOINGCONNEETIONS:SORTABLESET<MODULEGRASHCONNECTION>当前模块指向其他模块的连接 -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1747972276694-a3ff8d4f-76fb-4902-8f6d-92e8d4624071.png)

```javascript
Map(3){
  {
    'EntryDependency'{request:'./src/index.js'}: ModuleGraphConnection{
      "originModule": null,
        "module": NormalModule["index.js"],
        "dependency": EntryDependency['index.js'],
        }
  },
  {
    'HarmonyImportSideEffectDependency'{request:'./src/title.js'}:ModuleGraphConnection{
      "originModule": NormalModule["index.js"],
        "module": NormalModule["title.js"],
        "dependency": HarmonyImportSideEffectDependency['title.js'],
        }
  }
}
```

```javascript
Map(3){
  {
    "NormalModule[index.js]": ModuleGraphModule{
      "incomingConnections": [
      ModuleGraphConnection{
        "originModule": null,
          "module": NormalModule["index.js"],
          "dependency": EntryDependency['index.js'],
          }
      ],
        "outgoingConnections": [
      ModuleGraphConnection{
        "originModule": NormalModule["index.js"],
          "module": NormalModule[name.js],
          "dependency": HarmonyImportSideEffectDependency['name.js'],
          },
          ModuleGraphConnection{
          "originModule": NormalModule["index.js"],
            "module": NormalModule["age.js"],
            "dependency": HarmonyImportSideEffectDependency['age.js'],
            }
        ]
      },
      "NormalModule[title.js]": ModuleGraphModule{
        "incomingConnections": [
        ModuleGraphConnection{
          "originModule": NormalModule["index.js"],
            "module": NormalModule["title.js"],
            "dependency": HarmonyImportSideEffectDependency['title.js'],
            }
        ],
          }
    }
  }
```

### 代码
#### <font style="color:rgb(51, 51, 51);">index.js</font>
```javascript
const NormalModule = require("./NormalModule");
const ModuleGraph = require("./ModuleGraph");
const EntryDependency = require("./EntryDependency");
const ModuleGraphConnection = require("./ModuleGraphConnection");
const ModuleGraphModule = require("./ModuleGraphModule");
const modules = new Set()
const moduleGraph = new ModuleGraph();
const indexEntry = new EntryDependency("./src/index.js");
let indexModule;
let titleModule;
//1.`addEntry`方法用于向编译过程中添加入口点
addEntry(indexEntry);
function addEntry() {
  //2.`addModuleTree`方法用于向Compilation中添加整个模块树，并构建相应的依赖关系
  addModuleTree();
}
function addModuleTree() {
  //3.`handleModuleCreation`方法根据文件类型构建模块
  handleModuleCreation();
}
function handleModuleCreation() {
  //4.`factorizeModule` 方法的作用是使用模块工厂生产对应的模块
  factorizeModule();
}
function factorizeModule() {
  //5.`create` 方法用于创建一个新的 NormalModule 对象
  create();
}
function create() {
  //6.`factorize` 用于生成模块
  factorize();
}
function factorize() {
  //7.`createParser` 用于创建一个新的 Parser 对象
  createModule();
}
function createModule() {
  indexModule = new NormalModule('./src/index.js');
  //8.`addModule`向编译器中添加一个新的模块
  addModule();
}
function addModule() {
  modules.add(indexModule);
  //9.moduleGraph记录模块依赖图
  const moduleGraphConnection = new ModuleGraphConnection(null, indexModule, indexEntry);
  moduleGraph._dependencyMap.set(indexEntry, moduleGraphConnection);
  const moduleGraphModule = new ModuleGraphModule(indexModule);
  moduleGraph._moduleMap.set(indexModule, moduleGraphModule);
  //10.buildModule方法编译构建指定的模块
  buildModule();
}
function buildModule() {
  //11.`build`方法用于编译构建模块
  build();
}
function build() {
  //12.runLoaders 方法用于执行与模块相关的所有 loader，并将每个 loader 处理后的结果传递给下一个 loader 或者传递给后续流程处理
  runLoaders();
}
function runLoaders() {
  //13.JavaScriptParser的parse方法解析JavaScript代码，生成AST抽象语法树，并通过遍历AST树触发各种处理方法。
  parse();
}
function parse() {
  //15.blockPreWalkStatements方法用于遍历语句块中的每个语句，并在遍历每个语句前调用一个回调函数，可以用于代码转换等操作
  blockPreWalkStatements();
}
function blockPreWalkStatements() {
  //16.addDependency 方法将依赖资源添加为 Dependency 对象，并通过调用 module 对象的 addDependency 将 Dependency 对象转换为 Module 对象并添加到依赖数组中
  addDependency();
}
const harmonyImportSideEffectDependency = new HarmonyImportSideEffectDependency()
function addDependency() {
  indexModule.addDependency(new HarmonyCompatibilityDependency());
  indexModule.addDependency(new HarmonyImportSideEffectDependency());
  indexModule.addDependency(new HarmonyCompatibilityDependency());
  indexModule.addDependency(new ConstDependency());
  //17.handleParseResult 方法用于处理模块解析后的 AST 和依赖数组，进一步解析依赖并添加到模块对象的依赖数组中
  handleParseResult();
}
function handleParseResult() {
  //18.processModuleDependencies方法用于处理模块依赖，包括分析依赖关系、创建依赖对象和处理循环依赖等
  processModuleDependencies();
}
function processModuleDependencies() {
  titleModule = new NormalModule('./src/title.js');
  titleModule.addDependency(new HarmonyCompatibilityDependency());
  titleModule.addDependency(new HarmonyExportHeaderDependency());
  titleModule.addDependency(new HarmonyExportExpressionDependency());
  const moduleGraphConnection = new ModuleGraphConnection(indexModule, titleModule, harmonyImportSideEffectDependency);
  moduleGraph._dependencyMap.set(harmonyImportSideEffectDependency, moduleGraphConnection);
  const moduleGraphModule = new ModuleGraphModule(titleModule);
  moduleGraph._moduleMap.set(titleModule, moduleGraphModule);
}
```

#### <font style="color:rgb(51, 51, 51);">NormalModule.js</font>
```javascript
class NormalModule {
  constructor(request) {
    this.request = request;
    this.dependencies = [];
  }
}
module.exports = NormalModule;
```

#### <font style="color:rgb(51, 51, 51);">ModuleGraph.js</font>
```javascript
class ModuleGraph {
  constructor() {
    this._dependencyMap = new Map();
    this._moduleMap = new Map();
  }

}
module.exports = ModuleGraph;
```

#### <font style="color:rgb(51, 51, 51);">EntryDependency.js</font>
```javascript
class EntryDependency {
  constructor(request) {
    this.request = request;
  }
}
module.exports = EntryDependency;
```

#### <font style="color:rgb(51, 51, 51);">ModuleGraphConnection.js</font>
```javascript
class ModuleGraphConnection {
  constructor(originModule, module, dependency) {
    this.originModule = originModule;
    this.module = module;
    this.dependency = dependency;
  }
}
module.exports = ModuleGraphConnection;
```

#### <font style="color:rgb(51, 51, 51);">ModuleGraphModule.js</font>
```javascript
class ModuleGraphModule {
  constructor(module) {
    this.module = module;
    this.incomingConnections = new Set();
    this.outgoingConnections = new Set();
  }
}
module.exports = ModuleGraphModule
```

## 构建阶段
### <font style="color:rgb(51, 51, 51);">webpack.config.js</font>
```javascript
const path = require("path");

module.exports = {
  mode: 'development',
  context: process.cwd(),
  devtool: false,
  entry: path.resolve(__dirname, 'src/index.js'),
  output: {
    clean: true,
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  }
}
```

### <font style="color:rgb(51, 51, 51);">src</font>
```javascript
import title from './title.js';

console.log(title);
```

```javascript
export default "Hello g-webpack";
```

### 源码实现
# <font style="color:rgb(51, 51, 51);">封装阶段</font>
## <font style="color:rgb(51, 51, 51);">工作流程</font>
+ <font style="color:rgb(51, 51, 51);">1.遍历入口模块列表</font>
+ <font style="color:rgb(51, 51, 51);">2.调用 addChunk 方法为每一个入口 创建 对应的 Chunk 对象（EntryPoint Chunk）</font>
+ <font style="color:rgb(51, 51, 51);">3.为每一个 entry 创建对应的 ChunkGroup 对象</font>
+ <font style="color:rgb(51, 51, 51);">4.关联 Chunk 与 ChunkGroup</font>
+ <font style="color:rgb(51, 51, 51);">5.遍历 该入口对应的 Dependency 集合，找到相应 Module 对象并 关联 到该 Chunk。</font>
+ <font style="color:rgb(51, 51, 51);">6.为每一个 EntryPoint 关联入口依赖对象，以便下一步从入口依赖开始遍历其它模块</font>
+ <font style="color:rgb(51, 51, 51);">7.判断如果 options 对象中不存在 dependOn 属性且不存在 runtime 属性时</font>
+ <font style="color:rgb(51, 51, 51);">8.设置 entrypoint 的 runtimeChunk 为 chunk</font>
+ <font style="color:rgb(51, 51, 51);">9.从 moduleGraph 中获取与 dep 相关联的模块</font>
+ <font style="color:rgb(51, 51, 51);">10.在 ChunkGraph 中记录入口模块与 Chunk 关系</font>
+ <font style="color:rgb(51, 51, 51);">11.从 chunkGraphInit 中获取与 entrypoint 相关联的模块列表)</font>
+ <font style="color:rgb(51, 51, 51);">12.如果是，则在 chunkGraphInit 中设置与 entrypoint 相关联的模块列表为 [module]</font>
+ <font style="color:rgb(51, 51, 51);">13.chunkGraphInit.set(entrypoint, [module])</font>
+ <font style="color:rgb(51, 51, 51);">14.调用buildChunkGraph方法，开始构建 ChunkGraph</font>
+ <font style="color:rgb(51, 51, 51);">15.遍历 ModuleGraph，将所有 Module 按照依赖关系分配给不同 Chunk 对象</font>
+ <font style="color:rgb(51, 51, 51);">16.建立 ChunkGroup 之间、Chunk 之间的依赖关系，生成完整的 ChunkGraph 对象</font>
+ <font style="color:rgb(51, 51, 51);">17.清除无用的ChunkGroup</font>

<!-- 这是一张图片，ocr 内容为：BULLDCHUNKGRAPH COMPILATION 遍历入口模块列表 FOR(ENTRY OF THIS.ENTRIES) 为每一个入口创建对应的CHUNK对象 ADDCHUNK 为每一个 ENTRY 创建对应的 CHUNKGROUP 对象 NEW ENTRYPOINT() 关联 CHUNK与 CHUNKGROUP CONNECTCHUNKGROUPANDCHUNK 设置ENTRYPOINT的 RUNTIMECHUNK SETRUNTIMECHUNK 在 CHUNKGRAPH 中记录入口模块与CHUNK 关系 CONNECTCHUNKANDENTRYMODULE CHUNKGRAPHINIT.SET(ENTRYPOINT,[MODULE]); 设置与ENTRYPOINT 相关联的模块列表为[MODULE] 开始构建CHUNKGRAPH BUILDCHUNKGRAPH 将所有MODULE按照依赖关系分配给不同CHUNK对象 VISITMODULES 建立 CHUNKGROUP 之间,CHUNK之间的依赖关系 CONNECTCHUNKGROUPS 酒理无效CHUNKGROUP CLEANUPUNCONNECTEDGROUPS -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1748011034130-1469af6c-e77e-4756-9c09-5f9c58de53ad.png)

## <font style="color:rgb(51, 51, 51);">数据结构</font>
+ <font style="color:rgb(51, 51, 51);">Chunk（代码块）是在构建过程中生成的代码单元，通常对应于一个输出文件。在前端构建过程中，例如使用Webpack，源代码会被拆分为一个个的Chunk。一个Chunk可能包含一个或多个模块（module）</font>
+ <font style="color:rgb(51, 51, 51);">ChunkGroup是一组相互关联的Chunk，可以理解为Chunk的容器。当构建工具（如Webpack）在构建过程中遇到入口点、懒加载或其他代码分割场景时，会创建一个新的ChunkGroup。ChunkGroup负责管理和处理这些场景中所涉及的Chunk。每个ChunkGroup可以有一个或多个关联的Chunk。通过对Chunk进行分组，可以更好地处理和优化代码输出，例如：共享代码抽取、按需加载等</font>
+ <font style="color:rgb(51, 51, 51);">ChunkGraph是构建过程中生成的一种数据结构，用于表示源代码中所有模块（module）与Chunk之间的关系。它主要用于跟踪、查询和操作Chunk与模块之间的依赖关系。ChunkGraph可以帮助构建工具（如Webpack）在构建过程中确定模块之间的依赖关系、共享代码以及按需加载等</font>

<!-- 这是一张图片，ocr 内容为：COMPILATION CHUNKGRAPH CHUNKGRAPHCHUNK CHUNKGRAPH | CHUNKS:WEAKMAP<CHUNK,CHUNKGRAPHCHUNK> MODULES:MODULE CHUNK ENTRYPOINT _GROUPS:SET<CHUNKGROUP> RUNTIMECHUNK:CHUNK 继承 CHUNKGROUP CHUNKS:CHUNK[ CHILDREN:SET<CHUNKGROUP> PARENTS:SET<CHUNKGROUP> -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1748012671802-6226d715-fb4b-4b18-ac2e-42afc27d83d1.png)

<!-- 这是一张图片，ocr 内容为：CHUNK ENTRY1 ENTRY1 SYNC SYNC ENTRY1 SYNC ENTRY1 SYNC SYNC ENTRY1 SYNC ENTRY1 SYNC COMMON ENTRY1 ENTRY1ASYNC SYNC ENTRY1 ASYNC CHUNK ENTRY1 ASYNC SYNC COMMON ENTRY1 ASYNC ENTRY1 ASYNC SYNC ENTRY2 SYNC SYNC ENTRY2 ENTRY2 SYNC CHUNK ENTRY2 ENTRY2 SYNC_SYNC ENTRY2 ENTRY2 SYNC SYNC COMMON ENTRY2 ASYNC SYNC ENTRY2 ASYNC CHUNK ENTRY2ASYNC ENTRY2 ASYNC SYNC ENTRY2 ASYNC -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1748011744563-893c62e7-0f33-4256-98c8-23705a2cc798.png)

<!-- 这是一张图片，ocr 内容为：ENTRY1 ENTRYPOINT CHUNK ENTRY1 ENTRY1 SYNC SYNC ENTRY1 SYNC ENTRY1 SYNC ENTRY1 SYNC SYNC ENTRY1 CHUNK COMMON ENTRY1 ENTRY1 ASYNC SYNC ENTRY1 ASYNC SYNC COMMON ENTRY2 ENTRYPOINT CHUNK ENTRY2 SYNC CEMMON ENTRY2 SYNC SYNC ENTRY2 ENTRY2 SYNC ENTRY2 SYNC SYNC ENTRY2 ENTRY2 SYNC ENTRY1ASYNC CHUNKGROUP CHUNK ENTRY1 ASYNC ENTRY2 ASYNC SYNC ENTRY2 ASYNC ENTRY1 ASYNC SYNC ENTRY1 ASYNC ENTRY2ASYNC CHUNKGROUP CHUNK ENTRY2 ASYNC ENTRY2 ASYNC ENTRY2 ASYNC SYNC -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1748050209850-5360b489-f034-42a9-9b64-3b0179d6f30c.png)

### <font style="color:rgb(51, 51, 51);">伪代码</font>
```javascript
let util = require('util');
class Chunk {
  constructor(name) {
    this.name = name;
    this._groups = new Set();
  }
}
class ChunkGraphChunk {
  constructor() {
    this.modules = new Set();
  }
}
class ChunkGroup {
  constructor(name) {
    this.name = name;
    this.chunks = new Set();
    this._children = new Set();
    this._parents = new Set();
  }
}
class EntryPoint extends ChunkGroup {
  constructor(name) {
    super();
  }
}
class NormalModule {
  constructor(id) {
    this.id = id;
  }
}
class ChunkGraph {
  constructor() {
    this.chunks = new Map();
  }
}
let chunkGraph = new ChunkGraph();
let entry1Chunk = new Chunk('entry1');
let entry1ChunkGraphChunk = new ChunkGraphChunk();
let entry1EntryPoint = new EntryPoint('entry1');
let entry1Module = new NormalModule('./src/entry1.js');
let entry1SyncModule = new NormalModule('./src/entry1_sync.js');
let entry1SyncSyncModule = new NormalModule('./src/entry1_sync_sync.js');
let syncCommonModule = new NormalModule('./src/sync_common.js');
entry1ChunkGraphChunk.modules.add(entry1Module);
entry1ChunkGraphChunk.modules.add(entry1SyncModule);
entry1ChunkGraphChunk.modules.add(entry1SyncSyncModule);
entry1ChunkGraphChunk.modules.add(syncCommonModule);
entry1EntryPoint.chunks.add(entry1Chunk);
entry1Chunk._groups.add(entry1EntryPoint);
chunkGraph.chunks.set(entry1Chunk, entry1ChunkGraphChunk);

let entry2Chunk = new Chunk('entry2');
let entry2ChunkGraphChunk = new ChunkGraphChunk();
let entry2EntryPoint = new EntryPoint('entry2');
let entry2Module = new NormalModule('./src/entry2.js');
let entry2SyncModule = new NormalModule('./src/entry2_sync.js');
let entry2SyncSyncModule = new NormalModule('./src/entry2_sync_sync.js');
entry2ChunkGraphChunk.modules.add(entry2Module);
entry2ChunkGraphChunk.modules.add(entry2SyncModule);
entry2ChunkGraphChunk.modules.add(entry2SyncSyncModule);
entry2ChunkGraphChunk.modules.add(syncCommonModule);
entry2EntryPoint.chunks.add(entry2Chunk);
entry2Chunk._groups.add(entry2EntryPoint);
chunkGraph.chunks.set(entry2Chunk, entry2ChunkGraphChunk);

let entry1AsyncChunk = new Chunk('entry1_async');
let entry1AsyncChunkGraphChunk = new ChunkGraphChunk();
let entry1AsyncModule = new NormalModule('./src/entry1_async.js');
let entry1AsyncSyncModule = new NormalModule('./src/entry1_async_sync.js');
entry1AsyncChunkGraphChunk.modules.add(entry1AsyncModule);
entry1AsyncChunkGraphChunk.modules.add(entry1AsyncSyncModule);
let entry1AsyncChunkGroup = new ChunkGroup('entry1_async');
entry1AsyncChunkGroup.chunks.add(entry1AsyncChunk);
entry1AsyncChunkGroup._parents.add(entry1EntryPoint);
entry1EntryPoint._children.add(entry1AsyncChunkGroup);
entry1AsyncChunk._groups.add(entry1AsyncChunkGroup);
chunkGraph.chunks.set(entry1AsyncChunk, entry1AsyncChunkGraphChunk);

let entry2AsyncChunk = new Chunk('entry2_async');
let entry2AsyncChunkGraphChunk = new ChunkGraphChunk();
let entry2AsyncModule = new NormalModule('./src/entry2_async.js');
let entry2AsyncSyncModule = new NormalModule('./src/entry2_async_sync.js');
entry2AsyncChunkGraphChunk.modules.add(entry2AsyncModule);
entry2AsyncChunkGraphChunk.modules.add(entry2AsyncSyncModule);
let entry2AsyncChunkGroup = new ChunkGroup('entry2_async');
entry2AsyncChunkGroup.chunks.add(entry2AsyncChunk);
entry2AsyncChunkGroup._parents.add(entry2EntryPoint);
entry2EntryPoint._children.add(entry2AsyncChunkGroup);
entry2AsyncChunk._groups.add(entry2AsyncChunkGroup);
chunkGraph.chunks.set(entry2AsyncChunk, entry2AsyncChunkGraphChunk);

console.log(util.inspect(chunkGraph, true, Infinity));
```

```javascript
ChunkGraph {
  chunks: Map(4) {
    Chunk {
      name: 'entry1',
        _groups: Set(1) {
        EntryPoint {
          name: undefined,
            chunks: Set(1) { [Circular *1] },
          _children: Set(1) {
            ChunkGroup {
              name: 'entry1_async',
                chunks: Set(1) {
                Chunk {
                  name: 'entry1_async',
                    _groups: Set(1) { [Circular *2] }
                }
              },
              _children: Set(0) {},
              _parents: Set(1) { [Circular *3] }
            }
          },
          _parents: Set(0) {}
        }
      }
    } => ChunkGraphChunk {
      modules: Set(4) {
        NormalModule { id: './src/entry1.js' },
        NormalModule { id: './src/entry1_sync.js' },
        NormalModule { id: './src/entry1_sync_sync.js' },
        NormalModule { id: './src/sync_common.js' }
      }
    },
    Chunk {
      name: 'entry2',
        _groups: Set(1) {
        EntryPoint {
          name: undefined,
            chunks: Set(1) { [Circular *4] },
          _children: Set(1) {
            ChunkGroup {
              name: 'entry2_async',
                chunks: Set(1) {
                Chunk {
                  name: 'entry2_async',
                    _groups: Set(1) { [Circular *5] }
                }
              },
              _children: Set(0) {},
              _parents: Set(1) { [Circular *6] }
            }
          },
          _parents: Set(0) {}
        }
      }
    } => ChunkGraphChunk {
      modules: Set(4) {
        NormalModule { id: './src/entry2.js' },
        NormalModule { id: './src/entry2_sync.js' },
        NormalModule { id: './src/entry2_sync_sync.js' },
        NormalModule { id: './src/sync_common.js' }
      }
    },
    Chunk {
      name: 'entry1_async',
        _groups: Set(1) {
        ChunkGroup {
          name: 'entry1_async',
            chunks: Set(1) { [Circular *7] },
          _children: Set(0) {},
          _parents: Set(1) {
            EntryPoint {
              name: undefined,
                chunks: Set(1) {
                Chunk {
                  name: 'entry1',
                    _groups: Set(1) { [Circular *3] }
                }
              },
              _children: Set(1) { [Circular *2] },
              _parents: Set(0) {}
            }
          }
        }
      }
    } => ChunkGraphChunk {
      modules: Set(2) {
        NormalModule { id: './src/entry1_async.js' },
        NormalModule { id: './src/entry1_async_sync.js' }
      }
    },
    Chunk {
      name: 'entry2_async',
        _groups: Set(1) {
        ChunkGroup {
          name: 'entry2_async',
            chunks: Set(1) { [Circular *8] },
          _children: Set(0) {},
          _parents: Set(1) {
            EntryPoint {
              name: undefined,
                chunks: Set(1) {
                Chunk {
                  name: 'entry2',
                    _groups: Set(1) { [Circular *6] }
                }
              },
              _children: Set(1) { [Circular *5] },
              _parents: Set(0) {}
            }
          }
        }
      }
    } => ChunkGraphChunk {
      modules: Set(2) {
        NormalModule { id: './src/entry2_async.js' },
        NormalModule { id: './src/entry2_async_sync.js' }
      }
    }
  }
}
```

### <font style="color:rgb(51, 51, 51);">提取公共代码</font>
```javascript
let commonChunk = new Chunk('common');
let commonChunkGraphChunk = new ChunkGraphChunk();
commonChunkGraphChunk.modules.add(syncCommonModule);
commonChunk._groups.add(entry1AsyncChunkGroup);
commonChunk._groups.add(entry2AsyncChunkGroup);
entry1AsyncChunkGroup.chunks.add(commonChunk);
entry2AsyncChunkGroup.chunks.add(commonChunk);
chunkGraph.chunks.set(commonChunk, commonChunkGraphChunk);
entry1ChunkGraphChunk.modules.delete(syncCommonModule)
entry2ChunkGraphChunk.modules.delete(syncCommonModule)
console.log(util.inspect(chunkGraph, true, Infinity));
```

### <font style="color:rgb(51, 51, 51);">src</font>
#### <font style="color:rgb(51, 51, 51);">entry1.js</font>
```javascript
import entry1_sync from './entry1_sync';
import sync_common from './sync_common';
console.log('entry1_sync', entry1_sync);
console.log('sync_common', sync_common);
import('./entry1_async').then(entry1_async => {
  console.log('entry1_async', entry1_async);
});
```

#### <font style="color:rgb(51, 51, 51);">entry1_sync.js</font>
```javascript
import entry1_sync_sync from './entry1_sync_sync';
console.log('entry1_sync_sync', entry1_sync_sync);
export default 'entry1_sync';
```

#### <font style="color:rgb(51, 51, 51);">entry1_sync_sync.js</font>
```javascript
export default 'entry1_sync_sync';
```

#### <font style="color:rgb(51, 51, 51);">sync_common.js</font>
```javascript
export default 'sync_common';
```

#### <font style="color:rgb(51, 51, 51);">entry1_async.js</font>
```javascript
import entry1_async_sync from './entry1_async_sync';
console.log('entry1_async_sync', entry1_async_sync);
export default 'entry1_async';
```

#### <font style="color:rgb(51, 51, 51);">entry1_async_sync.js</font>
```javascript
export default 'entry1_async_sync';
```

#### <font style="color:rgb(51, 51, 51);">entry2.js</font>
```javascript
import entry2_sync from './entry2_sync';
import sync_common from './sync_common';
console.log('entry2_sync', entry2_sync);
console.log('sync_common', sync_common);
import('./entry2_async').then(entry2_async => {
  console.log('entry2_async', entry2_async);
});
```

#### <font style="color:rgb(51, 51, 51);">entry2_sync.js</font>
```javascript
import entry2_sync_sync from './entry2_sync_sync';
console.log('entry2_sync_sync', entry2_sync_sync);
export default 'entry2_sync';
```

#### <font style="color:rgb(51, 51, 51);">entry2_sync_sync.js</font>
```javascript
export default 'entry2_sync_sync';
```

#### <font style="color:rgb(51, 51, 51);">entry2_async.js</font>
<font style="color:rgb(51, 51, 51);"></font>

```javascript
import entry1_async_sync from './entry2_async_sync';
console.log('entry2_async_sync', entry1_async_sync);
export default 'entry2_async';
```

#### <font style="color:rgb(51, 51, 51);">entry2_async_sync.js</font>
```javascript
export default 'entry2_async_sync';
```

# <font style="color:rgb(51, 51, 51);">代码生成</font>
## <font style="color:rgb(51, 51, 51);">生成流程</font>
+ `<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">codeGeneration</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">方法的主要任务是从一个模块实例生成代码。流程如下：</font>
+ <font style="color:rgb(51, 51, 51);">调用模块的</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">generator</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">生成模块的原始代码（source code）,这个步骤会将源代码从不同的资源或加载器转换为 JavaScript 代码</font>
+ <font style="color:rgb(51, 51, 51);">使用</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">dependencyTemplates</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">处理模块的依赖关系。遍历模块的所有依赖，使用相应的</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">dependencyTemplate</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">生成依赖相关的代码，并将其插入到原始代码中</font>
+ <font style="color:rgb(51, 51, 51);">将生成的代码包装为</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">CodeGenerationResult</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">对象并返回</font>
+ <font style="color:rgb(51, 51, 51);">调用</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">processRuntimeRequirements</font>`<font style="color:rgb(51, 51, 51);">处理与运行时有关的需求和生成相关的代码</font>
    - <font style="color:rgb(51, 51, 51);">首先，获取当前模块的运行时需求，这些需求是在模块解析和依赖解析过程中收集的</font>
    - <font style="color:rgb(51, 51, 51);">遍历运行时需求，根据需求的类型生成相应的代码</font>
    - <font style="color:rgb(51, 51, 51);">为每个需求调用</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">runtimeTemplate.generate</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">方法，生成与运行时相关的代码片段</font>
    - <font style="color:rgb(51, 51, 51);">将生成的代码片段插入到模块的代码中</font>
+ <font style="color:rgb(51, 51, 51);">createChunkAssets 方法是 Webpack 编译过程中生成 chunk 输出文件的关键步骤。它遍历所有 chunks，将关联的模块源代码渲染为一个代码字符串，然后将生成的源实例添加到</font><font style="color:rgb(51, 51, 51);"> </font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">Compilation.assets</font>`<font style="color:rgb(51, 51, 51);"> </font><font style="color:rgb(51, 51, 51);">中，以便在最后的输出阶段将其写入文件系统</font>

```json
{
  runtime: string, // 当前的运行时名称
  module: Module, // 当前正在处理的模块实例
  chunk: Chunk, // 当前的 chunk 实例
  runtimeRequirements: Set, // 运行时需求的集合
  runtimeTemplate: RuntimeTemplate, // 运行时模板，用于生成运行时相关的代码
  dependencyTemplates: DependencyTemplates, // 依赖模板映射
  moduleGraph: ModuleGraph, // 模块图，存储模块间的依赖关系
  chunkGraph: ChunkGraph, // chunk 图，存储 chunk 间的依赖关系
}
```

![]()

## <font style="color:rgb(51, 51, 51);">数据结构</font>
### <font style="color:rgb(51, 51, 51);">index.js</font>
```javascript
let NormalModule = require('./NormalModule');
let Chunk = require('./Chunk');
let ChunkGraphChunk = require('./ChunkGraphChunk');
let EntryPoint = require('./Entrypoint');
let HarmonyImportSideEffectDependency = require('./HarmonyImportSideEffectDependency');
let HarmonyImportSpecifierDependency = require('./HarmonyImportSpecifierDependency');
let ConstDependency = require('./ConstDependency');
let HarmonyCompatibilityDependency = require('./HarmonyCompatibilityDependency');
let HarmonyExportExpressionDependency = require('./HarmonyExportExpressionDependency');
let HarmonyExportHeaderDependency = require('./HarmonyExportHeaderDependency');
let JavascriptModulesPlugin = require('./JavascriptModulesPlugin');
let modules = new Set();
let mainChunk = new Chunk('main');
let mainChunkGraphChunk = new ChunkGraphChunk();
let mainEntryPoint = new EntryPoint('main');
mainChunk._groups.add(mainEntryPoint);
mainEntryPoint.chunks.add(mainChunk);
let indexModule = new NormalModule('./src/index.js',
    [
        `import title from './title';`,
        `console.log('hello', title);`
    ]
    , [
        new HarmonyImportSideEffectDependency(),
        new HarmonyImportSpecifierDependency(),
        new ConstDependency(),
        new HarmonyCompatibilityDependency()
    ]);
let titleModule = new NormalModule(
    './src/title.js',
    [`export default 'title';`]
    , [
        new HarmonyExportExpressionDependency(),
        new HarmonyCompatibilityDependency(),
        new HarmonyExportHeaderDependency()
    ]);
modules.add(indexModule);
modules.add(titleModule);
let chunks = new Map();
chunks.set(mainEntryPoint, mainChunkGraphChunk);
for (const module of modules) {
    let source = module.codeGeneration();
    module._source = source;
}
let javascriptModulesPlugin = new JavascriptModulesPlugin();
for (const chunk of chunks.values()) {
    let source = javascriptModulesPlugin.renderMain(chunk);
    console.log(source);
}
```

### <font style="color:rgb(51, 51, 51);">NormalModule.js</font>
```javascript
const JavascriptGenerator = require('./JavascriptGenerator');
class NormalModule {
  constructor(id, _source, dependencies) {
    this.id = id;
    this._source = _source;
    this.dependencies = dependencies;
    this.generator = new JavascriptGenerator();
  }
  codeGeneration() {
    const source = this.generator.generate(this);
    return source;
  }
}
module.exports = NormalModule;
```

### <font style="color:rgb(51, 51, 51);">Chunk.js</font>
```javascript
class Chunk {
  constructor(name) {
    this.name = name;
    this._groups = new Set();
  }
}
module.exports = Chunk;
```

### <font style="color:rgb(51, 51, 51);">ChunkGraphChunk.js</font>
```javascript
class ChunkGraphChunk {
  constructor() {
    this.modules = new Set();
  }
}
module.exports = ChunkGraphChunk;
```

### <font style="color:rgb(51, 51, 51);">EntryPoint</font>
```javascript
const ChunkGroup = require('./ChunkGroup.js');
class EntryPoint extends ChunkGroup {}
module.exports = EntryPoint;
```

### <font style="color:rgb(51, 51, 51);">HarmonyImportSideEffectDependency</font>
```javascript
const InitFragment = require('./InitFragment')
class HarmonyImportSideEffectDependency {

}
HarmonyImportSideEffectDependency.Template = class HarmonyImportSideEffectDependencyTemplate {
  apply(dependency, source, initFragments) {
    const importStatement = 'var _title__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/title.js");\n'
    initFragments.push(
      new InitFragment(importStatement)
    )
  }
}
module.exports = HarmonyImportSideEffectDependency;
```

### <font style="color:rgb(51, 51, 51);">HarmonyImportSpecifierDependency</font>
```javascript
class HarmonyImportSpecifierDependency {

}
HarmonyImportSpecifierDependency.Template = class HarmonyImportSpecifierDependencyTemplate {
  apply(dependency, source) {
    const exportExpr = `, _title__WEBPACK_IMPORTED_MODULE_0__["default"]`;
    source[0] = source[0].replace(`, title`, exportExpr);
  }
}
module.exports = HarmonyImportSpecifierDependency;
```

### <font style="color:rgb(51, 51, 51);">ConstDependency</font>
```javascript
class ConstDependency {

}
ConstDependency.Template = class ConstDependencyTemplate {
  apply(dependency, source, initFragments) {
    source[0] = source[0].replace(`import title from './title';\r\n`, '');
  }
}
module.exports = ConstDependency;
```

### <font style="color:rgb(51, 51, 51);">HarmonyCompatibilityDependency</font>
```javascript
const InitFragment = require("./InitFragment");
class HarmonyCompatibilityDependency {

}
HarmonyCompatibilityDependency.Template = class HarmonyExportDependencyTemplate {
  apply(dependency, source, initFragments) {
    const content = `__webpack_require__.r(__webpack_exports__);\n`;
    initFragments.push(
      new InitFragment(content)
    )
  }
}

module.exports = HarmonyCompatibilityDependency;
```

### <font style="color:rgb(51, 51, 51);">HarmonyExportExpressionDependency</font>
```javascript
class HarmonyExportExpressionDependency {

}

HarmonyExportExpressionDependency.Template = class HarmonyExportDependencyTemplate {
  apply(dependency, source, initFragments) {
    //runtimeRequirements.add(RuntimeGlobals.exports);
    /**
         *__webpack_require__.d(__webpack_exports__, {
                 "default": () => (__WEBPACK_DEFAULT_EXPORT__)
            });
         */
    //initFragments.push(new HarmonyExportInitFragment(exportsName, map));
    let content = `
         const __WEBPACK_DEFAULT_EXPORT__ = ();
        `
  }
};

module.exports = HarmonyExportExpressionDependency;
```

### <font style="color:rgb(51, 51, 51);">HarmonyExportHeaderDependency</font>
```javascript
class HarmonyExportHeaderDependency {

}

HarmonyExportHeaderDependency.Template = class HarmonyExportHeaderDependencyTemplate {
  apply(dependency, source, initFragments) {
    source[0].replace('export default', '');
  }
};

module.exports = HarmonyExportHeaderDependency;
```

### <font style="color:rgb(51, 51, 51);">JavascriptModulesPlugin</font>
```javascript
class JavascriptModulesPlugin {
  renderMain(chunk) {
    let code = `
        (() => {
            var webpackModules = {
                "./src/title.js": (unusedWebpackModule, webpackExports, webpackRequire) => {
                    webpackRequire.r(webpackExports);
                    webpackRequire.d(webpackExports, {
                        "default": () => webpackDefaultExport
                    });
                    const webpackDefaultExport = 'title';
                }
            };
            var webpackModuleCache = {};
            function webpackRequire(moduleId) {
                var cachedModule = webpackModuleCache[moduleId];
                if (cachedModule !== undefined) {
                    return cachedModule.exports;
                }
                var module = webpackModuleCache[moduleId] = {
                    exports: {}
                };
                webpackModules[moduleId](module, module.exports, webpackRequire);
                return module.exports;
            }
            (() => {
                webpackRequire.d = (exports, definition) => {
                    for (var key in definition) {
                        if (webpackRequire.o(definition, key) && !webpackRequire.o(exports, key)) {
                            Object.defineProperty(exports, key, {
                                enumerable: true,
                                get: definition[key]
                            });
                        }
                    }
                };
            })();
            (() => {
                webpackRequire.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
            })();
            (() => {
                webpackRequire.r = exports => {
                    if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
                        Object.defineProperty(exports, Symbol.toStringTag, {
                            value: 'Module'
                        });
                    }
                    Object.defineProperty(exports, 'esmodule', {
                        value: true
                    });
                };
            })();
            var webpackExports = {};
            (() => {
                webpackRequire.r(webpackExports);
                var _titlewebpackImportedModule0 = webpackRequire("./src/title.js");
                console.log('hello', _titlewebpackImportedModule0["default"]);
            })();
        })();
        `;
    return code;
  }
}
module.exports = JavascriptModulesPlugin;
```

### <font style="color:rgb(51, 51, 51);">InitFragment.js</font>
```javascript
class InitFragment {
  constructor(content, endContent) {
    this.content = content;
    this.endContent = endContent;
  }
  static addToSource(source, initFragments) {
    let concatSource = [];
    const endContents = [];
    for (const initFragment of initFragments) {
      concatSource.push(initFragment.content);
      if (initFragment.endContent)
        endContents.push(initFragment.endContent);
    }
    concatSource.push(source);
    for (const content of endContents.reverse()) {
      concatSource.push(content);
    }
    return concatSource;
  }
}
module.exports = InitFragment;
```

### <font style="color:rgb(51, 51, 51);">JavascriptGenerator.js</font>
```javascript
const InitFragment = require("./InitFragment");
class JavascriptGenerator {
  generate(module) {
    const source = module._source;
    const initFragments = [];
    for (const dependency of module.dependencies) {
      const template = new dependency.constructor.Template();
      template.apply(dependency, source, initFragments);
    }
    return InitFragment.addToSource(source, initFragments);
  }
}
module.exports = JavascriptGenerator;
```

### <font style="color:rgb(51, 51, 51);">JavascriptModulesPlugin.js</font>
```javascript
class JavascriptModulesPlugin {
  renderMain(chunk) {
    let code = `
        (() => {
            var webpackModules = {
                "./src/title.js": (unusedWebpackModule, webpackExports, webpackRequire) => {
                    webpackRequire.r(webpackExports);
                    webpackRequire.d(webpackExports, {
                        "default": () => webpackDefaultExport
                    });
                    const webpackDefaultExport = 'title';
                }
            };
            var webpackModuleCache = {};
            function webpackRequire(moduleId) {
                var cachedModule = webpackModuleCache[moduleId];
                if (cachedModule !== undefined) {
                    return cachedModule.exports;
                }
                var module = webpackModuleCache[moduleId] = {
                    exports: {}
                };
                webpackModules[moduleId](module, module.exports, webpackRequire);
                return module.exports;
            }
            (() => {
                webpackRequire.d = (exports, definition) => {
                    for (var key in definition) {
                        if (webpackRequire.o(definition, key) && !webpackRequire.o(exports, key)) {
                            Object.defineProperty(exports, key, {
                                enumerable: true,
                                get: definition[key]
                            });
                        }
                    }
                };
            })();
            (() => {
                webpackRequire.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
            })();
            (() => {
                webpackRequire.r = exports => {
                    if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
                        Object.defineProperty(exports, Symbol.toStringTag, {
                            value: 'Module'
                        });
                    }
                    Object.defineProperty(exports, 'esmodule', {
                        value: true
                    });
                };
            })();
            var webpackExports = {};
            (() => {
                webpackRequire.r(webpackExports);
                var _titlewebpackImportedModule0 = webpackRequire("./src/title.js");
                console.log('hello', _titlewebpackImportedModule0["default"]);
            })();
        })();
        `;
    return code;
  }
}
module.exports = JavascriptModulesPlugin;
```

# <font style="color:rgb(51, 51, 51);">实现html-webpack-plugin</font>
```javascript
const path = require('path');
const fs = require('fs');
class HtmlWebpackPlugin {
  constructor(options) {
    this.options = options;
  }
  apply(compiler) {
    compiler.hooks.emit.tapAsync('SimplifiedHtmlWebpackPlugin', (compilation, callback) => {
      // 读取模板文件
      fs.readFile(this.options.template, 'utf8', (err, data) => {
        if (err) throw err;
        // 替换模板中的占位符
        const scriptTags = Object.keys(compilation.assets)
          .filter(file => file.endsWith('.js'))
          .map(file => `<script defer src="${file}"></script>`)
          .join('\n');
        const html = data.replace('</head>', `${scriptTags}\n</head>`);
        // 将生成的 HTML 添加到 Webpack 的输出中
        compilation.assets['index.html'] = {
          source: () => html,
          size: () => html.length
        };

        callback();
      });
        });
    }
}
module.exports = HtmlWebpackPlugin;
```

# 源码
[GitHub - lotosv2010/g-webpack: webpack 简版源码以及 loader 和 plugin](https://github.com/lotosv2010/g-webpack)

