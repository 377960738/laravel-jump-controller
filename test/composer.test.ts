import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classPathCandidates, parseComposerJson, psr4Mappings } from '../src/core/composer';

describe('Composer PSR-4 resolution', () => {
  it('merges autoload and autoload-dev and supports path arrays', () => {
    const composer = parseComposerJson(JSON.stringify({
      autoload: { 'psr-4': { 'App\\': 'app/', 'Domain\\': ['src/', 'legacy/'] } },
      'autoload-dev': { 'psr-4': { 'Tests\\': 'tests/' } },
    }));
    assert.deepEqual(psr4Mappings(composer), [
      ['Domain\\', 'src/'], ['Domain\\', 'legacy/'], ['Tests\\', 'tests/'], ['App\\', 'app/'],
    ]);
  });

  it('uses the longest matching namespace and keeps configured fallback', () => {
    const candidates = classPathCandidates(
      'App\\Http\\Controllers\\Admin\\UserController',
      { autoload: { 'psr-4': { 'App\\': 'app/', 'App\\Http\\': 'http-src/' } } },
      'App\\Http\\Controllers',
      'app/Http/Controllers',
    );
    assert.deepEqual(candidates.map((item) => item.relativePath), [
      'http-src/Controllers/Admin/UserController.php',
      'app/Http/Controllers/Admin/UserController.php',
      'app/Http/Controllers/Admin/UserController.php',
    ].filter((value, index, values) => values.indexOf(value) === index));
  });

  it('resolves legacy controller names relative to the configured directory', () => {
    assert.deepEqual(
      classPathCandidates('Admin\\UserController', {}, 'App\\Http\\Controllers', 'app/Http/Controllers'),
      [{ relativePath: 'app/Http/Controllers/Admin/UserController.php', source: 'configuration' }],
    );
  });
});
