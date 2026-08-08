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

  it('handles grouped imports inside a namespace', () => {
    const source = `<?php
namespace App\\Routes;
use App\\Http\\Controllers\\{UserController, AdminController as Admin};
Route::get('/users', [UserController::class, 'index']);
Route::get('/admin', [Admin::class, 'index']);`;
    assert.deepEqual(parser.parse(source).targets.map((target) => target.controller), [
      'App\\Http\\Controllers\\UserController',
      'App\\Http\\Controllers\\AdminController',
    ]);
  });

  it('parses a resource route after fluent name configuration', () => {
    const source = `<?php
Route::name('api_sy_dictionary.')->resource(
    'system/dictionary/index',
    V1_1\\Api\\System\\Dictonary::class
);`;
    const [target] = parser.parse(source).targets;
    assert.deepEqual(target, {
      controller: 'V1_1\\Api\\System\\Dictonary',
      kind: 'resource',
      controllerRange: offsets(source, 'V1_1\\Api\\System\\Dictonary'),
    });
  });

  it('parses a legacy string controller in a fluent resource route', () => {
    const source = `<?php
Route::name('api_collection')->resource('foundFlow/collection/index', 'V1_1\\Api\\FoundFlow\\Collection')->middleware('VerifyVip');`;
    const [target] = parser.parse(source).targets;
    assert.deepEqual(target, {
      controller: 'V1_1\\Api\\FoundFlow\\Collection',
      kind: 'resource',
      controllerRange: offsets(source, 'V1_1\\Api\\FoundFlow\\Collection'),
    });
  });

  it('parses plural resource declarations', () => {
    const source = `<?php
Route::apiResources([
    'photos' => PhotoController::class,
    'posts' => PostController::class,
]);`;
    assert.deepEqual(parser.parse(source).targets.map((target) => target.controller), [
      'PhotoController',
      'PostController',
    ]);
  });

  it('parses resource methods declared by only', () => {
    const source = `<?php
Route::resource('orders', OrderController::class)->only(['a', 'b']);
Route::apiResource('photos', PhotoController::class)->only('index', 'show')->middleware('auth');`;
    assert.deepEqual(parser.parse(source).targets.map(({ controller, method, kind }) => ({ controller, method, kind })), [
      { controller: 'OrderController', method: undefined, kind: 'resource' },
      { controller: 'OrderController', method: 'a', kind: 'resource' },
      { controller: 'OrderController', method: 'b', kind: 'resource' },
      { controller: 'PhotoController', method: undefined, kind: 'resource' },
      { controller: 'PhotoController', method: 'index', kind: 'resource' },
      { controller: 'PhotoController', method: 'show', kind: 'resource' },
    ]);
  });

  it('covers the complete fluent controller group from issue #3', () => {
    const source = `<?php
Route::name('shared.')->prefix('/shared')->middleware('auth')->controller(SharedController::class)->group(function () {
    Route::get('/states', 'states')->name('states');
    Route::get('/convenios', 'convenios')->name('convenios');
});`;
    assert.deepEqual(parser.parse(source).targets.map(({ controller, method }) => ({ controller, method })), [
      { controller: 'SharedController', method: 'states' },
      { controller: 'SharedController', method: 'convenios' },
    ]);
  });
});

function offsets(source: string, text: string) {
  const start = source.lastIndexOf(text);
  return { start, end: start + text.length };
}
