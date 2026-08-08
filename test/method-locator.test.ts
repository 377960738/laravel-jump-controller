import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { locateClass, locateMethod, parentClassName } from '../src/core/method-locator';

describe('locateMethod', () => {
  it('finds formatted methods and __invoke using PHP AST', () => {
    const source = `<?php class Controller {
      public function show (int $id): void {}
      public function
      __invoke(): void {}
    }`;
    assert.equal(source.slice(locateMethod(source, 'show'), locateMethod(source, 'show')! + 4), 'show');
    assert.equal(source.slice(locateMethod(source, '__invoke'), locateMethod(source, '__invoke')! + 8), '__invoke');
    assert.equal(source.slice(locateClass(source), locateClass(source)! + 10), 'Controller');
  });

  it('selects methods from the requested class when a file contains helpers', () => {
    const source = `<?php
      class Helper { public function show(): void {} }
      class UserController { public function show(): void {} }
    `;
    const classOffset = locateClass(source, 'UserController');
    const methodOffset = locateMethod(source, 'show', 'UserController');
    assert.equal(source.slice(classOffset, classOffset! + 14), 'UserController');
    assert.ok(methodOffset! > source.indexOf('UserController'));
  });
});

describe('parentClassName', () => {
  it('resolves imported parent aliases', () => {
    const source = `<?php
namespace App\\Http\\Controllers;
use App\\Http\\Controllers\\Base\\CrudController as BaseController;
final class OrderController extends BaseController {}`;
    assert.equal(parentClassName(source, 'OrderController'), 'App\\Http\\Controllers\\Base\\CrudController');
  });

  it('resolves namespace-relative and fully-qualified parents', () => {
    assert.equal(
      parentClassName('<?php namespace App\\Http; class Child extends BaseController {}', 'Child'),
      'App\\Http\\BaseController',
    );
    assert.equal(
      parentClassName('<?php namespace App\\Http; class Child extends \\Framework\\BaseController {}', 'Child'),
      'Framework\\BaseController',
    );
  });
});
