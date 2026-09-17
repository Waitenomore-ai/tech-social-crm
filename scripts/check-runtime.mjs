import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ignoreFile = resolve(root, '.assetsignore');

if (!existsSync(ignoreFile)) {
  console.error('Missing .assetsignore; cannot determine deployed runtime JavaScript.');
  process.exit(1);
}

const jsAssets = readFileSync(ignoreFile, 'utf8')
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line.startsWith('!') && line.endsWith('.js'))
  .map(line => line.slice(1));

if (!jsAssets.length) {
  console.error('No deployed JavaScript assets were found in .assetsignore.');
  process.exit(1);
}

const failures = [];
for (const relativePath of jsAssets) {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`${relativePath}: missing`);
    continue;
  }

  const result = spawnSync(process.execPath, ['--check', absolutePath], {
    cwd: root,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    failures.push(`${relativePath}: ${result.stderr || result.stdout || 'syntax check failed'}`.trim());
  }
}

if (failures.length) {
  console.error('Runtime syntax checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Runtime syntax checks passed for ${jsAssets.length} deployed JavaScript files.`);
