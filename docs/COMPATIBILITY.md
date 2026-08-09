# Compatibility

## Declared baseline

| Component | Baseline | Policy |
| --- | --- | --- |
| Node.js build runtime | 24 | Sole supported local/CI build version for the current 0.2.x source tree |
| npm | Compatible with Node.js 24 | No exact-version pin or repository-specific install policy |
| VS Code extension host | 1.85.0 | API typings and `engines.vscode` baseline |
| TypeScript | 7.0.2 | Fixed in lock file |
| PHP source | PHP 8-era Laravel syntax | Parsed as source; no local PHP runtime required |
| Laravel route syntax | Fixture-covered controller route forms documented through Laravel 13 | Compatibility is fixture-driven, not dependent on installed Laravel |

VS Code 1.85 is intentionally chosen as a modern but not bleeding-edge runtime floor. It includes all stable APIs used here (`DefinitionProvider`, scoped configuration, `workspace.fs`, `Uri.joinPath`, cancellation tokens) while preserving several years of editor compatibility.

## Release lines

- `0.0.x`: unmaintained legacy implementation retained only as the `legacy/0.0.x` comparison branch.
- `0.2.x`: the only maintained package, buildable with Node.js 24+ and any compatible npm version, and installable on VS Code 1.85.0+.

The build runtime is not the runtime embedded in VS Code. Raising the source-build requirement does not require dropping VS Code 1.85 while the bundle continues to target Node 18 and the API types remain pinned to VS Code 1.85.

## Tool version policy

The Node 24 line accepts compatible npm versions rather than an exact npm pin or repository-specific npm policy, together with current TypeScript 7.x, VSCE 3.x and VS Code test-electron 3.x releases. Normal builds use the committed lock through `npm ci`; `npm install` remains available when intentionally creating or updating it. Runtime API types remain pinned to VS Code 1.85 rather than the newest API, preventing accidental use of APIs unavailable at the declared editor floor.

## Compatibility versus build environment

The Node version used to build the extension is not the same as the Node version embedded in every supported VS Code release. The bundled output targets Node 18 and uses only APIs available at the VS Code 1.85 floor, while current source and packaging are verified on Node 24.

The current document selector is limited to file-backed PHP documents. Multi-root and nested local projects are supported; remote URI schemes are not yet declared as supported even though filesystem access already uses `workspace.fs` and `Uri`.

## Verification record

The definitive commands for the current `0.2.x` source tree are:

```bash
npm ci --ignore-scripts
npm run check
```

The Linux Extension Host job additionally runs `xvfb-run -a npm run test:extension` in CI.

Record concrete Node matrix results here after each compatibility-affecting toolchain update.

### 2026-08-08 historical local isolated matrix

`npm run check` passed with official Node binaries extracted under `/tmp` (no system installation):

- Node 22.23.2
- Node 24.19.0

The maintained toolchain moved to Node 24 on 2026-08-09; Node 22 is no longer part of the supported build or CI matrix.

An npm official-registry audit reported zero known vulnerabilities. Packaging uses `--no-dependencies` because esbuild bundles the only runtime package (`php-parser`) into `dist/extension.js`.

The VS Code 1.85.2 test build downloaded successfully in the sandbox. Local launch was not possible because the host image lacks Electron's `libnss3.so`; the same fixture is retained as an `xvfb-run` CI job, where the runner supplies desktop libraries. This environmental failure is not recorded as a passing local integration run.
