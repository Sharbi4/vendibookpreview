#!/usr/bin/env node
/**
 * Search ↔ database parity audit.
 *
 * Compares published listing counts per category (read straight from the
 * database via the public REST API) against what the `search-listings` edge
 * function returns for the equivalent category search. Any drift means the
 * search layer is hiding real inventory — the exact regression that made
 * "food truck" return a single listing.
 *
 * Usage:  node scripts/audit-search-parity.mjs
 * Exits non-zero on any mismatch so it can gate CI.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY in the environment.');
  process.exit(2);
}

const CATEGORIES = [
  { category: 'food_truck', queries: ['food truck', 'food trucks', 'truck', 'food truc'] },
  { category: 'food_trailer', queries: ['food trailer', 'food trailers', 'trailer'] },
  { category: 'ghost_kitchen', queries: ['shared kitchen', 'commercial kitchen', 'commissary kitchen', 'ghost kitchen', 'kitchen rental'] },
];

const MODES = ['sale', 'rent'];

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
};

/** Published, publicly visible rows — mirrors the edge function's base filters. */
async function dbCount(category, mode) {
  const params = new URLSearchParams({
    select: 'id',
    status: 'eq.published',
    published_at: 'not.is.null',
    deleted_at: 'is.null',
    moderation_status: 'eq.clear',
    title: 'not.ilike.Demo *',
    category: `eq.${category}`,
  });
  if (mode) params.set('mode', `eq.${mode}`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/listings?${params}`, {
    headers: { ...headers, Prefer: 'count=exact', Range: '0-0' },
  });
  if (!res.ok) throw new Error(`DB count failed: ${res.status} ${await res.text()}`);
  return Number(res.headers.get('content-range')?.split('/')[1] ?? 0);
}

async function searchCount(body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/search-listings`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ page_size: 1, ...body }),
  });
  if (!res.ok) throw new Error(`search failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.total_count ?? 0;
}

const failures = [];
const check = (label, expected, actual) => {
  const ok = expected === actual;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} expected ${expected}, got ${actual}`);
  if (!ok) failures.push(label);
};

for (const { category, queries } of CATEGORIES) {
  const total = await dbCount(category);
  check(`${category} · category pill`, total, await searchCount({ category }));
  for (const q of queries) {
    check(`${category} · query "${q}"`, total, await searchCount({ query: q }));
  }
  for (const mode of MODES) {
    const expected = await dbCount(category, mode);
    if (expected === 0) continue;
    check(`${category} · ${mode}`, expected, await searchCount({ category, mode }));
    check(`${category} · ${mode} via "${queries[0]}"`, expected, await searchCount({ query: queries[0], mode }));
  }
}

console.log('');
if (failures.length) {
  console.error(`${failures.length} parity mismatch(es):\n - ${failures.join('\n - ')}`);
  process.exit(1);
}
console.log('Search ↔ database parity: all categories and modes match.');
