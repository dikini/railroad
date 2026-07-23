import { execFile } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { promisify } from 'node:util';
import { build } from 'esbuild';

const execFileAsync = promisify(execFile);
const librrdDirectory = new URL('../vendor/librrd-main/', import.meta.url);
const distDirectory = new URL('../dist/', import.meta.url);
const sbt = process.env.SBT_COMMAND ?? 'sbt';

await mkdir(new URL('api/', librrdDirectory), { recursive: true });
await mkdir(new URL('cli/', librrdDirectory), { recursive: true });
await mkdir(new URL('gui/', librrdDirectory), { recursive: true });
await execFileAsync(sbt, ['deploy'], { cwd: librrdDirectory.pathname, stdio: 'inherit' });

await rm(distDirectory, { recursive: true, force: true });
await mkdir(distDirectory, { recursive: true });

await build({
  entryPoints: ['src/extension.js'],
  bundle: true,
  external: ['vscode'],
  format: 'cjs',
  outfile: 'dist/extension.cjs',
  platform: 'node',
  target: 'node18'
});

await build({
  entryPoints: ['src/preview-entry.js'],
  bundle: true,
  format: 'iife',
  outfile: 'dist/preview.js',
  platform: 'browser',
  target: 'es2022'
});
