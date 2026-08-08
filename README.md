# Laravel Jump Controller

Native controller navigation for Laravel route files in VS Code.

Place the cursor on a controller or action and use Ctrl/Cmd-click, F12, or **Go to Definition**. The extension resolves the controller file through Composer PSR-4 and opens the requested method. Hover shows the resolved target.

## Supported route forms

```php
use App\Http\Controllers\OrderController;

Route::get('/orders', [OrderController::class, 'index']);
Route::post('/orders', OrderController::class); // __invoke
Route::match(['get', 'head'], '/orders/{order}', [OrderController::class, 'show']);
Route::apiResource('orders', OrderController::class);

Route::controller(OrderController::class)->group(function () {
    Route::get('/orders/{order}', 'show');
});
```

Multiline calls, imported aliases, legacy `Controller@method` / `Controller::method` strings, nested controller groups, resource and singleton variants are supported. Dynamic expressions, closures and user-defined route macros are not guessed.

## Configuration

Composer PSR-4 is preferred automatically. Existing Laravel layouts can override the fallback:

```json
{
  "laravel_jump_controller.pathController": "app/Http/Controllers",
  "laravel_jump_controller.pathNamespace": "App\\Http\\Controllers"
}
```

Settings are resource scoped and update without reloading VS Code. Nested Laravel projects use their nearest `composer.json`.

## Safety

The extension performs static PHP analysis and does not boot Laravel or execute `artisan`. An Artisan-backed dynamic-route index remains a future, explicitly initiated enhancement.

## Development

Requirements: Node.js 18.18.2 or newer and npm.

```bash
npm ci --ignore-scripts
npm run check
```

Node 18.18.2, 20 and 22 are covered by the CI matrix. See [design](docs/DESIGN.md), [compatibility](docs/COMPATIBILITY.md), and [roadmap](docs/ROADMAP.md).

## License

MIT
