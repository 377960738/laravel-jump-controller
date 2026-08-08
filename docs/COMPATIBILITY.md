# Compatibility

## Declared baseline

| Component | Baseline | Policy |
| --- | --- | --- |
| Node.js build runtime | 22 | Lowest supported local/CI build version for 0.2.0+ |
| Node.js additional validation | 24 | Detect current-LTS regressions |
| VS Code extension host | 1.85.0 | API typings and `engines.vscode` baseline |
| TypeScript | 5.9.3 | Fixed in lock file |
| PHP source | PHP 8-era Laravel syntax | Parsed as source; no local PHP runtime required |
| Laravel | Modern controller routing through Laravel 13 syntax | Compatibility is fixture-driven, not dependent on installed Laravel |

VS Code 1.85 is intentionally chosen as a modern but not bleeding-edge runtime floor. It includes all stable APIs used here (`DefinitionProvider`, scoped configuration, `workspace.fs`, `Uri.joinPath`, cancellation tokens) while preserving several years of editor compatibility.

## Release lines

- `0.1.0` / commit `2f28a0e`: frozen compatibility package, buildable with Node.js 18.18.2 and installable on VS Code 1.85.0+.
- `0.2.0+`: recommended package, buildable with Node.js 22+ and still installable on VS Code 1.85.0+.

The build runtime is not the runtime embedded in VS Code. Raising the source-build requirement does not require dropping VS Code 1.85 while the bundle continues to target Node 18 and the API types remain pinned to VS Code 1.85.

## Tool version policy

The Node 22 line uses current TypeScript 7.x, VSCE 3.x and VS Code test-electron 3.x releases. Runtime API types remain pinned to VS Code 1.85 rather than the newest API, preventing accidental use of APIs unavailable at the declared editor floor.

## Compatibility versus build environment

The Node version used to build the extension is not the same as the Node version embedded in every supported VS Code release. The bundled output targets Node 18 and uses only APIs available at the VS Code 1.85 floor. The frozen 0.1.x branch/package proves the Node 18.18.2 build path; current 0.2.x source is instead verified on Node 22 and Node 24.

## Verification record

The definitive commands for 0.2.0+ are:

```bash
npm ci --ignore-scripts
npm run typecheck
npm test
npm run compile
npm run package:check
```

Record concrete Node matrix results here after each compatibility-affecting toolchain update.

### 2026-08-08 local isolated matrix

`npm run check` passed with official Node binaries extracted under `/tmp` (no system installation):

- Node 18.18.2
- Node 20.19.4
- Node 22.23.2
- Node 24.19.0

The Node 18 run initially exposed an incompatible transitive `cheerio`/`undici` selected by the older VSCE dependency range. A package override now pins the Node 18-compatible `cheerio` line, and the full matrix passes type checking, unit tests, bundling and `vsce ls`.

The Node 18-compatible VSCE line also accepts an old `markdown-it` range. The project overrides it to a security-fixed current version; packaging and the Node matrix verify that the newer API remains compatible with VSCE's usage.

An npm official-registry audit reported zero known vulnerabilities after these overrides. The security override currently carries an `entities` package engine declaration newer than Node 18, so `npm ci` emits one engine warning there; nevertheless the complete packaging path has been executed successfully on Node 18.18.2. This is isolated to the development-only Markdown rendering dependency and is not shipped in the bundled extension.

Because VSCE 2.x predates npm 10's dependency-tree output, packaging explicitly uses `--no-dependencies`. This is correct for this extension because esbuild bundles the only runtime package (`php-parser`) into `dist/extension.js`.

The VS Code 1.85.2 test build downloaded successfully in the sandbox. Local launch was not possible because the host image lacks Electron's `libnss3.so`; the same fixture is retained as an `xvfb-run` CI job, where the runner supplies desktop libraries. This environmental failure is not recorded as a passing local integration run.
