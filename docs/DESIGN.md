# Design

## Goals

The extension must resolve Laravel route actions to controller classes and methods accurately enough for day-to-day navigation, remain responsive in large route files, work in multi-root and remote-capable VS Code workspaces, and fail safely on incomplete PHP.

## Architecture

```text
PHP TextDocument
  -> LaravelRouteParser (PHP AST, source offsets)
  -> RouteTarget (controller, method, kind, exact ranges)
  -> project discovery (nearest composer.json within workspace)
  -> Composer PSR-4 + compatible controller-path fallback
  -> controller PHP AST method locator
  -> VS Code Definition + Hover
```

`src/core` is editor-independent and unit tested. `src/extension.ts` adapts offsets, URIs, configuration and cancellation to VS Code.

## Why DefinitionProvider

Controller navigation is a language definition operation, so `DefinitionProvider` provides the native Ctrl/Cmd-click, F12 and Peek Definition behavior. The old `DocumentLinkProvider` treated PHP syntax as a generic URL and required eager whole-document link construction. Definition lookup is demand-driven and semantically correct. Hover reuses the same resolver and never performs a separate path guess.

## Parsing decision

The old single-line regular expression cannot represent balanced calls, arrays, closures or nested groups. The new parser uses `php-parser`, a bundled pure JavaScript PHP parser. It produces exact offsets and requires no PHP, Java, Composer or platform-specific executable.

Supported action forms currently include:

- `[Controller::class, 'method']`, including multiline/trailing comma formatting;
- invokable `Controller::class` mapped to `__invoke`;
- legacy `'Controller@method'` and `'Controller::method'` strings;
- `get`, `post`, `put`, `patch`, `delete`, `options`, `any`, and `match`;
- `resource`, `apiResource`, `singleton`, and `apiSingleton` controller targets;
- `Route::controller(...)->group(...)`, including nesting inside other fluent groups;
- imported classes and aliases from PHP `use` declarations.

Middleware, prefix and name groups do not alter controller resolution and naturally preserve the inherited controller context. Fully dynamic expressions and user-defined route macros are intentionally not guessed.

## File resolution

The resolver walks from the route document toward its owning workspace root and selects the nearest `composer.json`. It merges `autoload.psr-4` and `autoload-dev.psr-4`, accepts string or array values, and tries longest namespaces first. Existing controller path/namespace settings remain as a compatibility fallback.

All workspace I/O uses `workspace.fs`. Parsed route documents and project discovery are cached; route caches are version keyed, configuration changes clear all caches, and saved Composer documents invalidate project discovery.

## Artisan boundary

`php artisan route:list` is useful for observing the application after service providers, packages, conditions and macros register routes. It is not a good default source-navigation engine:

- booting Laravel executes project and dependency code;
- environment, extensions, services and `.env` may be unavailable;
- output identifies registered actions but normally does not identify the route declaration source offset;
- repeated execution is too expensive for hover or definition requests.

Therefore static AST resolution is the default. Artisan remains an opt-in future index for dynamic-route discovery only. It must be triggered explicitly, show failures, enforce cancellation/timeout, run at the detected project root, and cache results. The current refresh command only clears safe static caches; it does not execute Artisan.

## Mago decision

Mago 1.46 is a fast single binary with formatter, linter and analyzer capabilities and no PHP/Composer runtime dependency. It is valuable as an optional repository quality tool, but requiring a platform binary for an editor extension would add installation, architecture, trust and remote-host complexity. It also does not replace the need to convert Laravel-specific call shapes into `RouteTarget` values. It is not a runtime dependency in this iteration. Reconsider it if a measured parser correctness or performance gap remains after the fixture suite expands.

## Error and security model

- Incomplete or unsupported PHP yields no target, never a provider crash.
- No project executable or Artisan command runs during activation, edits, hover or definition.
- Paths come from Composer/configuration and are tested for existence through the workspace API.
- Cancellation is checked around asynchronous project and filesystem resolution.

## Future work

- Namespace-scoped/grouped `use` fixtures and additional PHP syntax recovery tests.
- File watchers for Composer/controller changes and a bounded controller-content cache.
- Resource route CodeLens or selection UI for choosing a resource action.
- Optional, explicitly initiated Artisan dynamic-route index after a separate security/UX design review.
- VS Code Extension Host integration fixtures on Linux, Windows and remote workspaces.
