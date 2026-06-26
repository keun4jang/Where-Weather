#!/usr/bin/env node
/**
 * Checks whether the "where-weather" name appears taken across common registries
 * and domains. Best-effort and network-dependent; failures are reported as
 * "unknown" rather than crashing. Writes a summary to docs/NAME_AVAILABILITY.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'where-weather';

async function check(label, url, okWhenNotFound = true) {
  try {
    const res = await fetch(url, { method: 'GET' });
    if (res.status === 404) {
      return { label, status: okWhenNotFound ? 'available' : 'taken', detail: '404' };
    }
    if (res.ok) {
      return { label, status: okWhenNotFound ? 'taken' : 'available', detail: `HTTP ${res.status}` };
    }
    return { label, status: 'unknown', detail: `HTTP ${res.status}` };
  } catch (err) {
    return { label, status: 'unknown', detail: String(err) };
  }
}

const results = await Promise.all([
  check('npm package', `https://registry.npmjs.org/${NAME}`),
  check('GitHub repo (org: where-weather)', `https://github.com/where-weather`),
]);

const lines = [
  '# Name Availability: "Where Weather"',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '| Check | Status | Detail |',
  '| --- | --- | --- |',
  ...results.map((r) => `| ${r.label} | ${r.status} | ${r.detail} |`),
  '',
  '> Status is best-effort and may be inaccurate. Verify trademarks and domains',
  '> manually before relying on this report. "unknown" means the check could not',
  '> complete (often due to network or rate limits).',
  '',
];

const outPath = path.join(root, 'docs/NAME_AVAILABILITY.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join('\n'));

for (const r of results) console.log(`${r.label}: ${r.status} (${r.detail})`);
console.log(`\nWrote ${path.relative(root, outPath)}`);
