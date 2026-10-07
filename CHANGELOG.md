# Change Log

## Unreleased

## 0.2.5 - October 07, 2026

- Resolve controller actions in conventional Lumen and Dingo API instance routers (`$router`, `$app` and `$api`), fixing [#6](https://github.com/377960738/laravel-jump-controller/issues/6) without treating arbitrary object calls as routes.

## 0.2.4 - August 09, 2026

- Recompute only route targets affected by a saved Controller class or method, using PHP AST snapshots, method-level reverse dependencies and per-target resolution caches while retaining atomic decoration updates.

## 0.2.3 - August 08, 2026

- Invalidate navigation synchronously after Controller saves and validate cached files by modification time and size before definitions, preventing stale jumps during filesystem-watcher races.
- Resolve and underline individual resource methods named in chained `only([...])` or variadic `only(...)` constraints.

## 0.2.2 - August 08, 2026

- Remove stale method underlines and definitions when the referenced controller method no longer exists; class navigation remains available.
- Render successful matches with editor decorations instead of document links, allowing atomic refreshes without clearing and rebuilding the whole route document's underline state.
- Follow imported, namespace-relative and fully-qualified parent classes through Composer PSR-4 when a route method is inherited, and jump to the actual parent declaration.

## 0.2.1 - August 08, 2026

- Resolve legacy quoted controller class names in resource declarations, including fluent routes such as `Route::name(...)->resource(..., 'V1_1\\Api\\FoundFlow\\Collection')`.
- Cache fully resolved document links by URI and route contents so switching away from and back to an unchanged route file does not repeat controller discovery and symbol analysis.
- Refresh visible route links after saved controller and filesystem changes. Unsaved controller edits deliberately do not affect route links.

## 0.2.0 - August 08, 2026 — Node.js 22 build release

This is the recommended package for normal installation. Building from source now requires Node.js 22 or newer and uses the current TypeScript, VSCE, and VS Code test toolchain. VS Code runtime compatibility remains `1.85.0` or newer because the extension bundle deliberately targets the Node runtime embedded by that editor baseline.

The former experimental 0.1.x compatibility line has been retired. Version 0.2.x is the single maintained release line.

- Raise the minimum source-build runtime to Node.js 22.
- Upgrade TypeScript to 7.x, `@vscode/vsce` to 3.x, and `@vscode/test-electron` to 3.x.
- Remove legacy Node 18 packaging dependency overrides.
- Keep `@types/vscode` and the generated extension bundle compatible with VS Code 1.85.0.

## 0.0.34 - May, 12 2025

- Add some additional rules `apiResource` `singleton` `apiSingleton`
- match callback express like `'Class::action'` format [#4](https://github.com/377960738/laravel-jump-controller/issues/4#issue-1939487122)
- Multi-line content format support

  ```php
  // cover
  Route::get(
      '/user/profile',
      [UserProfileController::class, 'show']
  )->name('profile');

  // not covered  (There's no need. I guess you wouldn't do that either)
  Route::any(
      '/',
      [
          Home\Index::class,
          'index',
      ]
  );
  ```

## 0.0.33 - April, 20 2023

- Read the composer.json file and identify the PSR-4 autoload relationship

## 0.0.32 - March, 27 2023

- The route address can identify the short horizontal line [#2](https://github.com/377960738/laravel-jump-controller/issues/2#issue-1528608335)

## 0.0.31 - September, 02 2022

- Fix : When Configuration information is invalid. The default path information cannot be used

## 0.0.30 - September, 02 2022

- Increase accuracy (Routes with Parameters [#1](https://github.com/377960738/laravel-goto-controller/issues/1#issue-1357138344))

## 0.0.29 - August, 06 2022

- Increase accuracy
- Add namespace Settings

## 0.0.15 - September, 19 2021

- regression caused by v0.0.14

## 0.0.14 - September, 19 2021

- [link.js] Do not perform checks on undefined lines of text

## 0.0.12 - September, 05 2020

- Fixed a packaging issue made by the `vsce` tool as described at https://github.com/microsoft/vscode-vsce/issues/497

## September, 04 2020

- Support for Laravel 8.0 controllers PHP `Classname::class` notation
- Update npm packages - vulnerabilities fixes

## February, 15 2019

- Ignore vsix files
- read path to folder controllers from user config or default

Contributor: https://github.com/masterrjj24

## January, 17 2019, v0.0.5

- Npm packages vulnerabilities fixes
- Correction with resource controller detection, and controller with subfolder in name

Contributor: https://github.com/tnatanael

## July, 01 2018, v0.0.4

Correct package dependencies

Contributor: https://github.com/tiansin

## June, 29 2018, v0.0.3

The extension now will open the file containing the controller and go to the corresponding line where the function signature starts.

Fixes: https://github.com/stef-k/laravel-goto-controller/issues/1

Contributor: https://github.com/Smankusors

## Initial release
