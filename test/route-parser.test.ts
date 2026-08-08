import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LaravelRouteParser } from '../src/core/route-parser';

const parser = new LaravelRouteParser();

describe('LaravelRouteParser', () => {
  it('parses multiline array actions and imported aliases', () => {
    const source = `<?php
use App\\Http\\Controllers\\UserProfileController as Profile;
Route::get(
    '/user/profile',
    [Profile::class, 'show'],
);`;
    const [target] = parser.parse(source).targets;
    assert.deepEqual(target, {
      controller: 'App\\Http\\Controllers\\UserProfileController',
      method: 'show',
      kind: 'action',
      controllerRange: offsets(source, 'Profile'),
      methodRange: offsets(source, 'show'),
    });
  });

  it('maps invokable controllers to __invoke', () => {
    const source = `<?php Route::post('/jobs', ProcessJob::class);`;
    assert.deepEqual(parser.parse(source).targets[0], {
      controller: 'ProcessJob',
      method: '__invoke',
      kind: 'invokable',
      controllerRange: offsets(source, 'ProcessJob'),
    });
  });

  it('inherits a controller through nested route groups', () => {
    const source = `<?php
use App\\Http\\Controllers\\OrderController;
Route::middleware('auth')->controller(OrderController::class)->group(function () {
    Route::prefix('orders')->group(function () {
        Route::get('/{order}', 'show');
    });
});`;
    const [target] = parser.parse(source).targets;
    assert.equal(target?.controller, 'App\\Http\\Controllers\\OrderController');
    assert.equal(target?.method, 'show');
    assert.equal(target?.kind, 'action');
  });

  it('parses match and resource variants', () => {
    const source = `<?php
Route::match(['get', 'post'], '/items', [ItemController::class, 'store']);
Route::apiResource('photos', PhotoController::class);
Route::singleton('profile', ProfileController::class);`;
    assert.deepEqual(parser.parse(source).targets.map(({ controller, method, kind }) => ({ controller, method, kind })), [
      { controller: 'ItemController', method: 'store', kind: 'action' },
      { controller: 'PhotoController', method: undefined, kind: 'resource' },
      { controller: 'ProfileController', method: undefined, kind: 'resource' },
    ]);
  });

  it('parses legacy string callables', () => {
    const source = `<?php
Route::get('/a', 'Admin\\UserController@show');
Route::post('/b', 'Admin\\UserController::store');`;
    assert.deepEqual(parser.parse(source).targets.map(({ controller, method }) => ({ controller, method })), [
      { controller: 'Admin\\UserController', method: 'show' },
      { controller: 'Admin\\UserController', method: 'store' },
    ]);
  });

  it('ignores closures and unrelated static calls', () => {
    const source = `<?php
Route::get('/health', fn () => 'ok');
Other::get('/x', [WrongController::class, 'index']);`;
    assert.deepEqual(parser.parse(source).targets, []);
  });

  it('recognizes an imported Route facade alias', () => {
    const source = `<?php
use Illuminate\\Support\\Facades\\Route as Router;
Router::get('/users', [UserController::class, 'index']);`;
    assert.equal(parser.parse(source).targets[0]?.controller, 'UserController');
  });
});

function offsets(source: string, text: string) {
  const start = source.lastIndexOf(text);
  return { start, end: start + text.length };
}
