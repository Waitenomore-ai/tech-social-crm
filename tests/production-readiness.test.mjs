import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readText = path => readFile(join(root, path), 'utf8');
const readJson = async path => JSON.parse(await readText(path));

const REQUIRED_RUNTIME_ASSETS = [
  '_headers',
  'index.html',
  'app.js',
  'config.js',
  'styles.css',
  'sw.js',
  'manifest.webmanifest',
  'tech-social-mark.png',
  'version.json',
  'version-info.json',
  'version-manager.js',
  'marketing.js',
  'sidebar-redesign.css',
  'v10.4-dashboard-cleanup.css',
  'v10.5-dashboard-order.css',
  'v10.7-dashboard-intro.css',
  'v10.8-remove-upcoming.css',
  'v11-dashboard-layouts.css',
  'media-redesign.css',
  'v5-calendar.js',
  'v9-calendar-integration.js',
  'v5-media.js',
  'v10-media-integration.js',
  'v5-approval.js',
  'v5-integration.js',
  'lead-workflow.js',
  'discord-webhook.js',
  'v11-dashboard-layouts.js',
  'media-redesign.js',
  'vendor/supabase.js'
];

const BROWSER_SOURCE_FILES = [
  'config.js',
  'app.js',
  'marketing.js',
  'version-manager.js',
  'lead-workflow.js',
  'discord-webhook.js',
  'v5-integration.js'
];

test('Workers deploys the full CRM instead of the legacy site directory', async () => {
  const wrangler = await readText('wrangler.toml');
  assert.match(wrangler, /\[assets\][\s\S]*?directory\s*=\s*["']\.["']/,
    'wrangler.toml must deploy repository-root CRM assets');
  assert.doesNotMatch(wrangler, /directory\s*=\s*["']\.\/site["']/,
    'legacy site/ must not be the Workers asset directory');
});

test('Workers asset allowlist publishes every required CRM runtime file', async () => {
  const ignorePath = join(root, '.assetsignore');
  assert.ok(existsSync(ignorePath), '.assetsignore must exist at the static asset root');
  const rules = (await readText('.assetsignore'))
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  assert.ok(rules.includes('*'), '.assetsignore must default-deny repository files');
  for (const asset of REQUIRED_RUNTIME_ASSETS) {
    assert.ok(
      rules.includes(`!${asset}`) || (asset.startsWith('vendor/') && rules.includes('!vendor/**')),
      `.assetsignore must explicitly publish ${asset}`
    );
  }
});

test('release metadata agrees on the release-candidate version', async () => {
  const pkg = await readJson('package.json');
  const version = await readJson('version.json');
  const info = await readJson('version-info.json');
  const expected = '1.2.0-rc.1';

  assert.equal(pkg.version, expected, 'package.json version must match the RC');
  assert.equal(version.version, expected, 'version.json version must match the RC');
  assert.equal(info.current?.version, expected, 'version-info.json current version must match the RC');
  assert.match(version.title || '', /release candidate|rc/i, 'version.json title must identify an RC');
  assert.match(info.current?.summary || '', /release candidate|rc/i, 'current release summary must identify an RC');
});

test('package exposes repeatable test and runtime-check commands', async () => {
  const pkg = await readJson('package.json');
  assert.equal(pkg.scripts?.test, 'node --test tests/production-readiness.test.mjs');
  assert.equal(pkg.scripts?.check, 'node scripts/check-runtime.mjs');
  assert.ok(existsSync(join(root, 'scripts/check-runtime.mjs')), 'runtime syntax checker must exist');
});

test('browser-delivered source does not contain server secret values', async () => {
  const forbidden = [
    /sb_secret_[A-Za-z0-9._-]{8,}/,
    /service_role\s*[:=]\s*["'][^"']{8,}/i,
    /META_APP_SECRET\s*[:=]\s*["'][^"']{8,}/,
    /SUPABASE_ADMIN_KEY\s*[:=]\s*["'][^"']{8,}/
  ];

  for (const file of BROWSER_SOURCE_FILES) {
    const source = await readText(file);
    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, `${file} must not contain a server secret value`);
    }
  }
});

test('static responses retain the required browser security headers', async () => {
  const headers = await readText('_headers');
  for (const requirement of [
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy:',
    'Permissions-Policy:',
    'Content-Security-Policy:',
    "object-src 'none'",
    "frame-ancestors 'none'"
  ]) {
    assert.ok(headers.includes(requirement), `_headers must contain ${requirement}`);
  }
});
