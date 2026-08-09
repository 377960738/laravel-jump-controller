# Repository working agreement

## Required checks

Run `npm run check` before committing behavior or dependency changes. New route syntax support requires a focused test fixture. Do not weaken strict TypeScript settings to make a change compile.

## Architecture boundaries

- Keep PHP/Laravel parsing and Composer mapping in `src/core`; core modules must not import `vscode`.
- VS Code providers belong in the adapter layer (`src/extension.ts` until it becomes large enough to split).
- Use PHP AST nodes and source offsets for route parsing. Do not add a document-wide route regular expression.
- Read configuration with the document URI as scope. Treat missing workspaces and malformed Composer files as normal, recoverable states.
- Prefer `workspace.fs` and `Uri` over Node filesystem APIs so remote workspaces remain viable.
- Project code must never execute automatically. Any Artisan integration must be opt-in, user-triggered, cancellable, time-bounded, and clearly disclose that it boots the application.

## Compatibility

- Build baseline: Node.js 24.0.0.
- Runtime baseline: VS Code 1.85.0. Do not use newer API without either raising `engines.vscode` deliberately or providing a guarded fallback.
- npm is the sole package manager. Use any npm version compatible with Node.js 24, commit `package-lock.json`, and do not add another lock file. The only maintained release line is 0.2.x on Node.js 24+.

## Git and generated files

Use focused Conventional Commit messages. Do not commit `node_modules`, `dist`, downloaded VS Code builds, temporary fixtures, or VSIX packages unless a release process explicitly requires the artifact.
