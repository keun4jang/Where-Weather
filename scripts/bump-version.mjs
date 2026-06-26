#!/usr/bin/env node
// Bumps the semver version in package.json and re-syncs generated files.
// Usage: node scripts/bump-version.mjs [major|minor|patch]  (default: patch)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kind = (process.argv[2] ?? 'patch').toLowerCase();
if (!['major', 'minor', 'patch'].includes(kind)) {
  console.error(`Unknown bump type: ${kind}. Use major | minor | patch.`);
  process.exit(1);
}

const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map((n) => parseInt(n, 10));

let next;
if (kind === 'major') next = `${major + 1}.0.0`;
else if (kind === 'minor') next = `${major}.${minor + 1}.0`;
else next = `${major}.${minor}.${patch + 1}`;

pkg.version = next;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Bumped version to ${next}`);

execFileSync(process.execPath, [path.join(root, 'scripts/sync-version.mjs')], {
  stdio: 'inherit',
});
