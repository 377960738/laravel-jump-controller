import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { locateClass, locateMethod } from '../src/core/method-locator';

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
});
