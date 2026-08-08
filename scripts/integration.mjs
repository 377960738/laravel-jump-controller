import * as esbuild from 'esbuild';
import { runTests } from '@vscode/test-electron';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolve } from 'node:path';

const extensionDevelopmentPath = resolve('.');
const extensionTestsPath = resolve('out-test/suite.js');
const fixtureRoot = await mkdtemp(join(tmpdir(), 'laravel-jump-controller-integration-'));
const fixturePath = join(fixtureRoot, 'laravel-app');
await cp(resolve('demo/laravel-app'), fixturePath, { recursive: true });

await esbuild.build({
  entryPoints: ['test/suite.ts'],
  bundle: true,
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  outfile: extensionTestsPath,
});

try {
  await runTests({
    version: '1.85.2',
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [fixturePath, '--disable-extensions'],
  });
} catch (error) {
  console.error('VS Code integration tests failed:', error);
  process.exitCode = 1;
} finally {
  await rm(fixtureRoot, { recursive: true, force: true });
}
