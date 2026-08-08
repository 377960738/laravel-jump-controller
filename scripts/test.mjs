import * as esbuild from 'esbuild';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const directory = await mkdtemp(join(tmpdir(), 'laravel-jump-controller-tests-'));
try {
  await esbuild.build({
    entryPoints: ['test/**/*.test.ts'],
    outdir: directory,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    sourcemap: true,
  });
  const files = (await readdir(directory))
    .filter((file) => file.endsWith('.test.js'))
    .map((file) => join(directory, file));
  const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
