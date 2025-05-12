# Change Log

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
