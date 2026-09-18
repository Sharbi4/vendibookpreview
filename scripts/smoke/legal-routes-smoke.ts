/**
 * Legal suite smoke test.
 *
 * Verifies that every document in the client registry has a reachable route
 * and a non-empty version string, and that the generated legal sitemap covers
 * the same set. Run with: bun run scripts/smoke/legal-routes-smoke.ts
 */
import { readFileSync } from 'node:fs';
import { LEGAL_DOCUMENTS } from '../../src/lib/legal/versions';

const appSource = readFileSync('src/App.tsx', 'utf8');
const sitemap = readFileSync('public/sitemap-legal.xml', 'utf8');

const failures: string[] = [];

for (const doc of LEGAL_DOCUMENTS) {
  if (!doc.version || !doc.version.trim()) {
    failures.push(`${doc.slug}: missing version`);
  }
  if (!appSource.includes(`path="${doc.route}"`)) {
    failures.push(`${doc.slug}: no route registered for ${doc.route}`);
  }
  if (!sitemap.includes(doc.route)) {
    failures.push(`${doc.slug}: missing from public/sitemap-legal.xml`);
  }
}

if (failures.length > 0) {
  console.error('Legal smoke test FAILED:');
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log(`Legal smoke test OK — ${LEGAL_DOCUMENTS.length} documents routed and indexed.`);
