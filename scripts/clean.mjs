import { rm } from 'node:fs/promises';

await Promise.all([
  rm('dist', { recursive: true, force: true }),
  rm('out-test', { recursive: true, force: true }),
]);
