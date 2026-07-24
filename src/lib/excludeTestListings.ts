// Applies title-prefix exclusions so QA / test / demo listings never surface
// in customer-facing feeds, even if their status somehow flips back to published.
export const TEST_TITLE_PREFIXES = ['Demo%', 'QA %', 'QA_%', 'QA-%', 'Test %', 'E2E %', 'Smoke %'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function excludeTestListings<T extends { not: (...args: any[]) => T }>(query: T): T {
  let q = query;
  for (const pattern of TEST_TITLE_PREFIXES) {
    q = q.not('title', 'ilike', pattern);
  }
  return q;
}
