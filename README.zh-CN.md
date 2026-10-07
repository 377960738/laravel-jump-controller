# Laravel Jump Controller

[English](https://github.com/377960738/laravel-jump-controller/blob/master/README.md) | [简体中文](https://github.com/377960738/laravel-jump-controller/blob/master/README.zh-CN.md)

[![CI](https://github.com/377960738/laravel-jump-controller/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/377960738/laravel-jump-controller/actions/workflows/ci.yml)

基于 PHP 静态分析，为 Visual Studio Code 提供从 Laravel 路由到 Controller 的原生导航能力。

[Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=pgl.laravel-jump-controller) · [Demo 项目](https://github.com/377960738/laravel-jump-controller/tree/master/demo/laravel-app) · [更新日志](https://github.com/377960738/laravel-jump-controller/blob/master/CHANGELOG.md)

> 本项目 fork 自 [stef-k/laravel-goto-controller](https://github.com/stef-k/laravel-goto-controller)。感谢原作者与贡献者奠定了路由到 Controller 的导航体验，本项目在此基础上继续演进。

## ✨ 核心能力

- 为成功解析的 Controller 类和方法添加下划线。
- 支持 Ctrl/Cmd+点击、F12 或 **转到定义**，精确打开对应类或方法。
- Hover 时显示解析后的目标位置。
- 优先通过最近项目的 Composer PSR-4 映射发现类，并保留旧路径配置作为回退。
- 支持继承方法；Controller 保存后只刷新受影响的路由目标。

## 🧭 从 Fork 到 0.2.x

早期版本在原有正则匹配方案上持续扩展，增加了嵌套命名空间、显式方法、数组 callable、invokable Controller、多行声明、资源路由和更多传统字符串写法。

`0.2.x` 不再继续堆叠正则规则，而是完成了结构性升级：

- 使用 PHP AST 理解完整调用、导入、流式链、嵌套分组和精确源码偏移；
- 使用原生 Definition、Hover 和 Decoration API 代替文档级链接匹配；
- 使用 Composer PSR-4 与最近项目发现，适配现代、嵌套及多根目录 Laravel 项目；
- 通过方法级 AST 差异、反向依赖和单目标缓存减少无关计算，并原子提交 Decorations。

这些改变保留了上游项目快捷跳转的核心价值，同时让现代 Laravel 项目和大型路由文件中的行为更加稳定、可预测。

## 🚀 导航方式

将鼠标或光标放在带下划线的 Controller 类或方法上：

- Windows/Linux 使用 Ctrl+点击，macOS 使用 Cmd+点击；
- 按 F12 或执行 **转到定义**；
- 使用 Hover 预览目标位置。

![在 VS Code 中从路由跳转到 Controller](https://raw.githubusercontent.com/377960738/laravel-jump-controller/master/images/laravel-goto-controller.gif)

动图展示的是最初的传统字符串写法。当前版本继续支持这种形式，同时支持现代 Laravel callable。

## ✅ 支持的路由

### 现代 Callable 与分组

```php
use App\Http\Controllers\OrderController;

Route::get('/orders', [OrderController::class, 'index']);
Route::post('/orders', OrderController::class); // __invoke
Route::match(['get', 'head'], '/orders/{order}', [OrderController::class, 'show']);

Route::controller(OrderController::class)->group(function () {
    Route::get('/orders/{order}', 'show');
});
```

支持导入别名、分组导入、完全限定类名、嵌套 Controller 分组、多行调用和尾随逗号。`middleware()`、`name()`、`prefix()`、`withoutMiddleware()` 等流式包装不会遮蔽底层受支持的路由调用。

### 资源与 Singleton 路由

```php
Route::resource('orders', OrderController::class);
Route::apiResource('orders', OrderController::class)
    ->only(['index', 'show']);

Route::resources([
    'orders' => OrderController::class,
    'photos' => PhotoController::class,
]);

Route::singleton('profile', ProfileController::class);
Route::apiSingleton('profile', ProfileController::class);
```

可静态解析的 `only()` 方法名可以直接跳转到对应方法；其他资源和 Singleton 声明保留 Controller 类级导航。

### 传统写法

继续支持 `Controller@method`、`Controller::method`、字符串类名、字符串数组及带命名空间的 action：

```php
Route::any('/', 'Home\Index@index')->withoutMiddleware(VerifyCsrfToken::class);
Route::any('/', Home\Index::class)->withoutMiddleware(VerifyCsrfToken::class);
Route::any('/', App\Http\Controllers\Home\Index::class)->withoutMiddleware(VerifyCsrfToken::class);

Route::middleware(['throttle:5,1'])
    ->any('/', 'Home\Index')
    ->withoutMiddleware(VerifyCsrfToken::class);

Route::any('/', [Home\Index::class, 'index'])->withoutMiddleware(VerifyCsrfToken::class);
Route::any('/', ['Home\Index', 'index'])->withoutMiddleware(VerifyCsrfToken::class);
Route::match(['get', 'put'], '/', ['Home\Index', 'index'])->withoutMiddleware(VerifyCsrfToken::class);
```

### Lumen 与 Dingo API 路由器

除 Laravel 门面外，也支持常见的实例路由器变量：

```php
$router->get('/users', 'App\Http\Controllers\UserController@index');
$app->post('/users', [UserController::class, 'store']);
$api->get('/profile', 'App\Http\Controllers\ProfileController@show');
```

仅将 `$router`、`$app` 和 `$api` 识别为路由器实例，避免把 `$client->get()` 等无关对象方法误判为路由。

## ⚙️ Controller 发现

扩展读取最近 `composer.json` 中的 `autoload.psr-4` 和 `autoload-dev.psr-4`。支持字符串和多目录映射，并优先尝试最长的匹配命名空间。

对于传统或未使用 Composer 的目录结构，可以配置资源作用域的回退规则：

```json
{
  "laravel_jump_controller.pathController": "app/Http/Controllers",
  "laravel_jump_controller.pathNamespace": "App\\Http\\Controllers"
}
```

- `pathController` 是相对于检测到的 Laravel 项目根目录的路径，不要添加前导斜杠。
- `pathNamespace` 是该目录对应的 PHP 命名空间。
- Composer 映射优先，配置修改无需重载 VS Code 即可生效。

旧设置截图使用了已经过时的前导斜杠路径；其有效信息已由上述 JSON 取代。

## 🛡️ 行为与边界

- 优先在具体 Controller 中定位方法，随后递归检查父类。
- 缺失方法不会显示下划线，也不会产生误导性的类级回退跳转。
- Controller 文件保存后更新导航；未保存修改不会影响路由导航。
- 不推测 Trait 提供的方法、运行时 `__call`、动态表达式、闭包 action 或自定义路由宏。
- 当前只支持基于文件的 PHP 文档；远程 URI scheme 仍属于后续工作。
- 不会自动启动 Laravel 或 Artisan。激活、编辑、Hover 和定义请求均只进行静态源码分析。

## 🧰 开发

当前 `0.2.x` 源码要求 Node.js 24 或更新版本、任意兼容的 npm，以及 VS Code 1.85.0 或更新版本：

```bash
npm ci --ignore-scripts
npm run check
```

提交的 `package-lock.json` 用于固定依赖树；npm 自身不精确锁定。GitHub Actions 仅验证 Node 24。

更多文档：

- [从下载仓库到构建扩展](https://github.com/377960738/laravel-jump-controller/blob/master/docs/BUILDING.zh-CN.md)
- [测试与调试](https://github.com/377960738/laravel-jump-controller/blob/master/docs/DEBUGGING.md)
- [架构与设计](https://github.com/377960738/laravel-jump-controller/blob/master/docs/DESIGN.md)
- [兼容性边界](https://github.com/377960738/laravel-jump-controller/blob/master/docs/COMPATIBILITY.md)
- [路线图](https://github.com/377960738/laravel-jump-controller/blob/master/docs/ROADMAP.md)
- [仓库审计与历史架构对比](https://github.com/377960738/laravel-jump-controller/blob/master/docs/REPOSITORY-AUDIT.md)

## 许可证

MIT
