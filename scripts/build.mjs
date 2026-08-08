import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const options = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  // VS Code 1.85 embeds Node 18. The build tool runs on Node 22+, while the
  // extension output intentionally retains the older runtime target.
  target: 'node18',
  outfile: 'dist/extension.js',
  sourcemap: true,
  minify: false,
  logLevel: 'info',
};

if (watch) {
  const context = await esbuild.context(options);
  await context.watch();
} else {
  await esbuild.build(options);
}
