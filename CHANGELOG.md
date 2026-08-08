# Change Log

## Unreleased

* Resolve legacy quoted controller class names in resource declarations, including fluent routes such as `Route::name(...)->resource(..., 'V1_1\\Api\\FoundFlow\\Collection')`.
* Cache fully resolved document links by URI and route contents so switching away from and back to an unchanged route file does not repeat controller discovery and symbol analysis.
* Refresh visible route links after saved controller and filesystem changes. Unsaved controller edits deliberately do not affect route links.
* Remove stale method underlines and definitions when the referenced controller method no longer exists; class navigation remains available.
* Render successful matches with editor decorations instead of document links, allowing atomic refreshes without clearing and rebuilding the whole route document's underline state.
* Follow imported, namespace-relative and fully-qualified parent classes through Composer PSR-4 when a route method is inherited, and jump to the actual parent declaration.
* Invalidate navigation synchronously after Controller saves and validate cached files by modification time and size before definitions, preventing stale jumps during filesystem-watcher races.

## 0.2.0 - August 08, 2026 — Node.js 22 build release

This is the recommended package for normal installation. Building from source now requires Node.js 22 or newer and uses the current TypeScript, VSCE, and VS Code test toolchain. VS Code runtime compatibility remains `1.85.0` or newer because the extension bundle deliberately targets the Node runtime embedded by that editor baseline.

Users installing a VSIX should normally choose `0.2.0`. Choose `0.1.0` only when the extension itself must be rebuilt or maintained using Node.js 18.18.2. Both packages contain the same Laravel navigation fixes listed below.

* Raise the minimum source-build runtime to Node.js 22.
* Upgrade TypeScript to 7.x, `@vscode/vsce` to 3.x, and `@vscode/test-electron` to 3.x.
* Remove legacy Node 18 packaging dependency overrides.
* Keep `@types/vscode` and the generated extension bundle compatible with VS Code 1.85.0.

## 0.1.0 - August 08, 2026 — VS Code 1.85 compatibility release

This is the final release built with Node.js 18.18.2 compatibility and supporting VS Code 1.85.0 or newer. Choose this package when an older VS Code 1.85+ development environment must be retained. The next feature release requires Node.js 22 to build, while extension runtime compatibility is declared separately.

* Replace the single-line route regular expression with structural PHP AST parsing.
* Use native Definition and Hover providers with exact source ranges, while retaining successful-match underlines through a shared Document Link provider.
* Support multiline actions, imports and aliases, invokable controllers, nested controller groups, resource/singleton variants, plural resources, fluent resource calls, and legacy callable strings.
* Fix fluent resource declarations such as `Route::name(...)->resource(...)`.
* Resolve the complete controller group chain reported in [Issue #3](https://github.com/377960738/laravel-jump-controller/issues/3).
* Correct Composer `autoload-dev` handling and support PSR-4 path arrays and nested projects.
* Replace synchronous Node filesystem scans with URI-based VS Code workspace I/O and caches.
* Modernize the npm-only Node 18.18.2+ / TypeScript / esbuild / VS Code toolchain.
* Add strict type checking, route/parser/resolver tests, package validation, and Node 18/20/22 CI.
* Add a comprehensive demo Laravel project covering supported navigation scenarios.

## 0.0.34 - May, 12 2025

* Add some additional rules `apiResource` `singleton` `apiSingleton`
* match callback express like `'Class::action'` format [#4](https://github.com/377960738/laravel-jump-controller/issues/4#issue-1939487122)
* Multi-line content format support

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

* Read the composer.json file and identify the psr-4 aotoload relationship

## 0.0.32 - March, 27 2023

* The route address can identify the short horizontal line [#2](https://github.com/377960738/laravel-jump-controller/issues/2#issue-1528608335)

## 0.0.31 - September, 02 2022

* Fix : When Configuration information is invalid. The default path information cannot be used

## 0.0.30 - September, 02 2022

* Increase accuracy (Routes with Parameters [#1](https://github.com/377960738/laravel-goto-controller/issues/1#issue-1357138344))

## 0.0.29 - August, 06 2022

* Increase accuracy
* Add namespace Settings

## 0.0.15 - September, 19 2021

* regression caused by v0.0.14

## 0.0.14 - September, 19 2021

* [link.js] Do not perform checks on undefined lines of text

## 0.0.12 - September, 05 2020

* Fixed a packaging issue made by the `vsce` tool as described at https://github.com/microsoft/vscode-vsce/issues/497

## September, 04 2020

* Support for Laravel 8.0 controllers PHP `Classname::class` notation
* Update npm packages - vulnerabilities fixes

## February, 15 2019

* Ignore vsix files
* read path to folder controllers from user config or default

Contributor: https://github.com/masterrjj24

## January, 17 2019, v0.0.5

* Npm packages vulnerabilities fixes
* Correction with resource controller detection, and controller with subfolder in name

Contributor: https://github.com/tnatanael

## July, 01 2018, v0.0.4

Correct package dependencies

Contributor: https://github.com/tiansin

## June, 29 2018, v0.0.3

The extension now will open the file containing the controller and go to the corresponding line where the function signature starts.

Fixes: https://github.com/stef-k/laravel-goto-controller/issues/1

Contributor: https://github.com/Smankusors

## Initial release
