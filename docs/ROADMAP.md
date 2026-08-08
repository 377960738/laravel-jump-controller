# Roadmap

## Completed foundation

- Reproducible npm-only dependency graph and strict TypeScript configuration.
- esbuild extension bundle and isolated Node test runner.
- PHP AST route parsing with exact source ranges.
- Native Definition and shared Hover providers.
- Atomic Decoration underlines with Controller-to-route reverse dependencies.
- Composer PSR-4 resolution, nested project discovery and scoped settings.
- Safe caches, saved-file invalidation and filesystem-signature validation.
- Inherited parent method navigation and resource `only()` method links.
- Node 22/24 CI and a VS Code 1.85.2 Extension Host fixture job.

## Next hardening milestones

1. Expand fixtures for malformed/in-progress source, Windows-sensitive paths, multiple namespaces per file and additional Laravel route constraints.
2. Add Trait method resolution with conflict/alias handling; keep runtime `__call` dispatch explicitly unsupported unless an evidence-backed design emerges.
3. Profile representative large Laravel projects and add cache bounds only when measurements justify an eviction policy.
4. Expand Extension Host fixtures and exercise Windows, multi-root and remote workspaces.
5. Design the optional Artisan index as a separately consented command with timeout and diagnostic output.
6. Refresh Marketplace screenshots and user-facing examples before publication.
