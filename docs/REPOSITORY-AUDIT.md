# Repository audit memo

Audit date: 2026-08-08. Audited branch: `develop`, based on stable 0.2.3 plus debugging documentation.

## Outcome

The repository is in a maintainable state. Source, tests, build scripts, VS Code configuration and release documentation agree on one maintained 0.2.x line. The pre-refactor 0.0.x code remains isolated on `legacy/0.0.x`; the former 0.1.x line, tags and artifacts are retired.

Verification completed during this audit:

- Node.js 22 / npm 10 lock-file synchronization;
- strict TypeScript check;
- 24 unit and Demo regression assertions;
- esbuild bundle and VSIX content inspection;
- official npm-registry audit: zero known vulnerabilities;
- `launch.json` and `tasks.json` JSON validation;
- dependency update review: only deliberately pinned `@types/vscode` 1.85 and `@types/node` 22 differ from latest majors.

## What was cleaned

- Added `.nvmrc` and an npm package-manager declaration for reproducible onboarding.
- Added an Unreleased section to the changelog.
- Updated the roadmap from the retired Node 18/20 matrix to Node 22/24.
- Marked `project-status-analysis.md` as a historical 0.0.34 snapshot.
- Changed README documentation links to absolute GitHub links so they work from an installed VSIX, where `docs/` is intentionally excluded.
- Excluded `.nvmrc` from VSIX contents.
- Removed obsolete ignore rules for old scaffold files (`out`, `src/demo.js`, `src/route.php`, `.prettierrc`).
- Added a VS Code task for cleaning reproducible `dist` and `out-test` output.

## Generated directories

| Path | Purpose | Policy |
| --- | --- | --- |
| `node_modules/` | Locked development dependencies | Keep while developing; recreate with `npm ci` |
| `.vscode-test/` | Downloaded VS Code/Electron integration-test cache | Keep to avoid a ~368 MB re-download; safe to delete when disk space matters |
| `dist/` | Bundled extension and source map | Recreate with `npm run compile`; clean with `npm run clean` |
| `out-test/` | Bundled Extension Host test entry | Recreate during integration tests; clean with `npm run clean` |
| `build/` | Local VSIX test/release artifacts | Keep intentional packages only; never commit |
| `.history/` | User/VS Code local history | Ignored and not packaged; do not delete automatically |

No generated directory is tracked by Git or included accidentally in the VSIX.

## Intentional pins

- `@types/vscode` remains 1.85.0 to prevent accidental use of APIs unavailable at the declared VS Code floor.
- `@types/node` remains on major 22 to match the supported build runtime.
- The output bundle still targets Node 18 because VS Code 1.85 embeds that runtime; this is independent of the Node 22 build requirement.

## Remaining engineering gaps

These are known scope boundaries, not current cleanup defects:

1. Trait-provided controller methods, Trait aliases and Trait conflict resolution are not followed yet.
2. Dynamic `__call`, container decoration and runtime route macros cannot be resolved safely through static source analysis.
3. Resource `except()` has no method tokens that correspond to registered routes, so it is intentionally not underlined like `only()`; additional Laravel constraints need fixture-driven decisions.
4. Multiple PHP namespaces in one Controller file need stronger scoped-import fixtures.
5. Windows, multi-root and remote workspace Extension Host coverage remains thinner than Linux coverage.
6. Cache size is unbounded; add eviction only after profiling representative large Laravel projects.
7. Local Electron integration still needs the documented Debian desktop libraries and Xvfb. CI remains the authoritative Extension Host run until those are installed.

## Maintenance rule

Normal work starts on `develop`, must pass `npm run check`, and should add the narrowest useful regression fixture. Verified releases merge through `release/0.2.x`, receive a `v0.2.x` tag, and fast-forward to `master`. Keep this memo, `DEBUGGING.md`, `DESIGN.md` and `ROADMAP.md` synchronized when that workflow or compatibility boundary changes.
