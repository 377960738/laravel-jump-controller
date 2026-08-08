import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { classPathCandidates, parseComposerJson } from '../src/core/composer';
import { locateClass, locateMethod, parentClassName } from '../src/core/method-locator';
import { LaravelRouteParser } from '../src/core/route-parser';

const root = join(process.cwd(), 'demo', 'laravel-app');
const composer = parseComposerJson(readFileSync(join(root, 'composer.json'), 'utf8'));
const parser = new LaravelRouteParser();

describe('demo Laravel project', () => {
  for (const routeFile of ['web.php', 'api.php', 'shared.php', 'legacy.php']) {
    it(`resolves every target in routes/${routeFile}`, () => {
      const routePath = join(root, 'routes', routeFile);
      const result = parser.parse(readFileSync(routePath, 'utf8'), routePath);
      assert.deepEqual(result.errors, []);
      assert.ok(result.targets.length > 0);

      for (const target of result.targets) {
        const candidates = classPathCandidates(
          target.controller,
          composer,
          'App\\Http\\Controllers',
          'app/Http/Controllers',
        );
        const controllerPath = candidates.map((candidate) => join(root, candidate.relativePath)).find(existsSync);
        assert.ok(controllerPath, `controller file should resolve for ${target.controller}`);
        const controller = readFileSync(controllerPath, 'utf8');
        const className = basename(controllerPath, '.php');
        assert.notEqual(locateClass(controller, className), undefined);
        if (target.method) {
          assert.ok(methodExists(target.controller, target.method), `${target.controller}::${target.method} should exist`);
        }
      }
    });
  }
});

function methodExists(controllerClass: string, method: string, visited = new Set<string>()): boolean {
  if (visited.has(controllerClass.toLowerCase())) return false;
  visited.add(controllerClass.toLowerCase());
  const candidate = classPathCandidates(
    controllerClass,
    composer,
    'App\\Http\\Controllers',
    'app/Http/Controllers',
  ).map((item) => join(root, item.relativePath)).find(existsSync);
  if (!candidate) return false;
  const source = readFileSync(candidate, 'utf8');
  const className = basename(candidate, '.php');
  if (locateMethod(source, method, className) !== undefined) return true;
  const parent = parentClassName(source, className);
  return parent ? methodExists(parent, method, visited) : false;
}
