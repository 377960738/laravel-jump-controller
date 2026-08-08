import * as esbuild from 'esbuild';
import { runTests } from '@vscode/test-electron';
import { resolve } from 'node:path';

const extensionDevelopmentPath = resolve('.');
const extensionTestsPath = resolve('out-test/suite.js');
const fixturePath = resolve('demo/laravel-app');

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
}
