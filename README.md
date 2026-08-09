# Laravel Jump Controller

[English](https://github.com/377960738/laravel-jump-controller/blob/master/README.md) | [简体中文](https://github.com/377960738/laravel-jump-controller/blob/master/README.zh-CN.md)

[![CI](https://github.com/377960738/laravel-jump-controller/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/377960738/laravel-jump-controller/actions/workflows/ci.yml)

Laravel route-to-controller navigation for Visual Studio Code, powered by static PHP analysis.

[Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=pgl.laravel-jump-controller) · [Demo project](https://github.com/377960738/laravel-jump-controller/tree/master/demo/laravel-app) · [Changelog](https://github.com/377960738/laravel-jump-controller/blob/master/CHANGELOG.md)

> This project is a fork of [stef-k/laravel-goto-controller](https://github.com/stef-k/laravel-goto-controller). Thanks to its original author and contributors for establishing the route-to-controller navigation experience on which this project was built.

## ✨ What it does

- Underlines Controller classes and actions that can be resolved successfully.
- Opens the exact class or method with Ctrl/Cmd+click, F12, or **Go to Definition**.
- Shows the resolved destination on Hover.
- Discovers classes through the nearest Composer PSR-4 configuration, with legacy path settings as a fallback.
- Follows inherited Controller methods and refreshes only affected route targets after a saved change.

## 🧭 From the fork to 0.2.x

Early releases extended the original regular-expression matcher to cover nested namespaces, explicit methods, array callables, invokable Controllers, multiline declarations, resource routes and more legacy string forms.

The `0.2.x` line replaced that growing collection of patterns with a structural architecture:

- a PHP AST provides balanced calls, imports, fluent chains, nested groups and exact source offsets;
- native Definition, Hover and Decoration APIs replace document-wide link matching;
- Composer PSR-4 and nearest-project discovery support modern, nested and multi-root Laravel layouts;
- method-level AST differences, reverse dependencies and per-target caches avoid unnecessary recomputation while Decorations are committed atomically.

The result preserves the original quick-navigation idea while making it more predictable in modern Laravel projects and large route files.

## 🚀 Navigation

Place the pointer or cursor on an underlined Controller class or action:

- Ctrl+click on Windows/Linux or Cmd+click on macOS;
- press F12 or run **Go to Definition**;
- Hover to preview the destination.

![Route-to-controller navigation in VS Code](https://raw.githubusercontent.com/377960738/laravel-jump-controller/master/images/laravel-goto-controller.gif)

The animation shows the original legacy-string workflow. Those actions remain supported alongside modern Laravel callables.

## ✅ Supported routes

### Modern callables and groups

```php
use App\Http\Controllers\OrderController;

Route::get('/orders', [OrderController::class, 'index']);
Route::post('/orders', OrderController::class); // __invoke
Route::match(['get', 'head'], '/orders/{order}', [OrderController::class, 'show']);

Route::controller(OrderController::class)->group(function () {
    Route::get('/orders/{order}', 'show');
});
```

Imported aliases, grouped imports, fully qualified names, nested Controller groups, multiline calls and trailing commas are understood structurally. Fluent wrappers such as `middleware()`, `name()`, `prefix()` and `withoutMiddleware()` do not hide a supported route call.

### Resources and singletons

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

Statically resolvable `only()` action names navigate directly to their methods. Other resource and singleton declarations retain Controller class navigation.

### Legacy actions

Legacy `Controller@method`, `Controller::method`, string class, array-string and namespaced action forms remain supported:

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

## ⚙️ Controller discovery

The extension reads `autoload.psr-4` and `autoload-dev.psr-4` from the nearest `composer.json`. String and multi-directory mappings are supported, and the longest matching namespace is tried first.

For a legacy or non-Composer layout, configure this resource-scoped fallback:

```json
{
  "laravel_jump_controller.pathController": "app/Http/Controllers",
  "laravel_jump_controller.pathNamespace": "App\\Http\\Controllers"
}
```

- `pathController` is relative to the detected Laravel project root; do not add a leading slash.
- `pathNamespace` is the PHP namespace corresponding to that directory.
- Composer mappings take precedence, and configuration changes apply without reloading VS Code.

The former settings screenshot used an obsolete leading-slash path. Its useful information is represented by the maintained JSON above.

## 🛡️ Behavior and limits

- Methods are resolved in the concrete Controller and then through parent classes.
- Missing methods are not underlined and do not fall back to misleading class navigation.
- Navigation updates after Controller files are saved; unsaved Controller edits intentionally have no effect.
- Trait-provided methods, runtime `__call`, dynamic expressions, closure actions and custom route macros are not guessed.
- Only file-backed PHP documents are currently supported; remote URI schemes remain future work.
- Laravel and Artisan are never booted automatically. Activation, edits, Hover and definition requests use static source analysis only.

## 🧰 Development

The current `0.2.x` source requires Node.js 24 or newer, any compatible npm version, and VS Code 1.85.0 or newer:

```bash
npm ci --ignore-scripts
npm run check
```

The committed `package-lock.json` fixes the dependency tree; npm itself is deliberately not pinned. GitHub Actions verifies Node 24.

Further documentation:

- [Build from source (Chinese)](https://github.com/377960738/laravel-jump-controller/blob/master/docs/BUILDING.zh-CN.md)
- [Testing and debugging](https://github.com/377960738/laravel-jump-controller/blob/master/docs/DEBUGGING.md)
- [Architecture and design](https://github.com/377960738/laravel-jump-controller/blob/master/docs/DESIGN.md)
- [Compatibility](https://github.com/377960738/laravel-jump-controller/blob/master/docs/COMPATIBILITY.md)
- [Roadmap](https://github.com/377960738/laravel-jump-controller/blob/master/docs/ROADMAP.md)
- [Repository audit and legacy comparison](https://github.com/377960738/laravel-jump-controller/blob/master/docs/REPOSITORY-AUDIT.md)

## License

MIT
