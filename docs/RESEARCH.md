# Technical research notes

## Sources reviewed

- VS Code API reference, extension testing guide and bundling guide.
- Laravel 13 routing documentation.
- Composer schema documentation for PSR-4 and `autoload-dev`.
- Mago 1.46 getting-started documentation.

The official references were reviewed on 2026-08-08; implementation decisions are captured in `DESIGN.md` so they remain actionable even if documentation URLs move.

## Findings

VS Code's definition API is the correct semantic primitive for controller navigation. Providers accept cancellation tokens and can return locations lazily. `workspace.fs` and URI-based operations provide a better path to remote workspace support than synchronous Node `fs` calls. Bundling reduces file count and avoids shipping an unbounded dependency tree.

Laravel 13 documents controller arrays, invokable controllers, controller groups, HTTP method matching, resource controllers, singleton resources and route listing. Controller groups establish context inherited by action strings inside a closure, which requires a structural syntax tree. Middleware/prefix/name groups merge route metadata but do not independently change the action class.

Composer PSR-4 values may be a path or list of paths. Namespace-prefix order matters, and development autoload mappings are distinct from production autoload mappings. The prior implementation's `autoload-dev` branch read the wrong object.

Mago is distributed as a single binary and covers formatting, linting and static analysis. Those strengths make it a possible development check, but not an automatic solution for Laravel-specific route semantics or a low-friction mandatory runtime dependency.

Artisan reflects registered runtime routes more completely than static source analysis, but bootstraps untrusted project code and lacks reliable declaration offsets. It is suitable only as an explicitly requested augmentation, never an automatic provider dependency.
