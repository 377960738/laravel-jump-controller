# Laravel Jump Controller

Native controller navigation for Laravel route files in VS Code.

Successfully resolved controller and action symbols are underlined. Use Ctrl/Cmd-click, F12, or **Go to Definition** to navigate. The extension resolves the controller file through Composer PSR-4 and opens the requested class or method. Hover shows the resolved target.

## Supported route forms

```php
use App\Http\Controllers\OrderController;

Route::get('/orders', [OrderController::class, 'index']);
Route::post('/orders', OrderController::class); // __invoke
Route::match(['get', 'head'], '/orders/{order}', [OrderController::class, 'show']);
Route::apiResource('orders', OrderController::class);

Route::name('api.')->resource('dictionary', DictionaryController::class);

Route::controller(OrderController::class)->group(function () {
    Route::get('/orders/{order}', 'show');
});
```

Multiline calls, imported aliases, legacy `Controller@method` / `Controller::method` strings, nested controller groups, resource and singleton variants are supported. Dynamic expressions, closures and user-defined route macros are not guessed.

## Configuration

Composer PSR-4 is detected automatically and takes precedence. Existing or legacy Laravel layouts can configure the fallback:

```json
{
  "laravel_jump_controller.pathController": "app/Http/Controllers",
  "laravel_jump_controller.pathNamespace": "App\\Http\\Controllers"
}
```

Settings are resource scoped and update without reloading VS Code. Nested Laravel projects use their nearest `composer.json`.

For a broad set of runnable navigation examples, open the [demo Laravel application](https://github.com/377960738/laravel-jump-controller/tree/master/demo/laravel-app).

## Safety

The extension performs static PHP analysis and does not boot Laravel or execute `artisan`. An Artisan-backed dynamic-route index remains a future, explicitly initiated enhancement.

## Development

Requirements for the current source tree: Node.js 22 or newer and npm. The archived `0.1.0` compatibility VSIX is the final package that can be rebuilt with Node.js 18.18.2.

```bash
npm ci --ignore-scripts
npm run check
```

Node 22 and 24 are covered by the current CI matrix. See [design](docs/DESIGN.md), [compatibility](docs/COMPATIBILITY.md), and [roadmap](docs/ROADMAP.md).

## License

MIT
