# Roadmap

## Completed foundation

- Reproducible npm-only dependency graph and strict TypeScript configuration.
- esbuild extension bundle and isolated Node test runner.
- PHP AST route parsing with exact source ranges.
- Native Definition and shared Hover providers.
- Composer PSR-4 resolution, nested project discovery and scoped settings.
- Safe caches and configuration/save invalidation.
- Node 18.18.2/20/22 CI and a VS Code 1.85.2 Extension Host fixture job.

## Next hardening milestones

1. Expand fixtures for namespaces, grouped imports, malformed/in-progress source, route macros and Windows-sensitive paths.
2. Expand Extension Host fixtures and exercise Windows and remote workspaces.
3. Add bounded file-content caching and file watchers after profiling representative large projects.
4. Design the optional Artisan index as a separately consented command with timeout and diagnostic output.
5. Refresh Marketplace screenshots before release.
