import type { FaqCategory, FaqEntry } from "@/data/faqContent";

export interface ScoredEntry {
  entry: FaqEntry;
  category: FaqCategory;
  score: number;
}

const normalize = (s: string) => s.toLowerCase().normalize("NFKD");

const tokenize = (s: string) =>
  normalize(s)
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length >= 2);

/** Score entry against tokens: title matches weigh most, then keywords, then body. */
export function scoreEntry(entry: FaqEntry, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const q = normalize(entry.question);
  const a = normalize(entry.answer);
  const kws = (entry.keywords ?? []).map(normalize);
  let score = 0;
  for (const t of tokens) {
    if (q.includes(t)) score += 5;
    if (kws.some((k) => k.includes(t))) score += 3;
    if (a.includes(t)) score += 1;
  }
  return score;
}

export function searchFaq(
  categories: FaqCategory[],
  query: string,
  opts: { categoryId?: string; limit?: number } = {},
): ScoredEntry[] {
  const tokens = tokenize(query);
  const results: ScoredEntry[] = [];
  for (const cat of categories) {
    if (opts.categoryId && cat.id !== opts.categoryId) continue;
    for (const entry of cat.entries) {
      const score = tokens.length ? scoreEntry(entry, tokens) : 0;
      if (tokens.length === 0 || score > 0) {
        results.push({ entry, category: cat, score });
      }
    }
  }
  results.sort((a, b) => b.score - a.score);
  return typeof opts.limit === "number" ? results.slice(0, opts.limit) : results;
}

/** Related entries: same category first, then keyword overlap across catalog. */
export function relatedEntries(
  categories: FaqCategory[],
  target: FaqEntry,
  limit = 4,
): ScoredEntry[] {
  const targetKws = new Set((target.keywords ?? []).map(normalize));
  const scored: ScoredEntry[] = [];
  for (const cat of categories) {
    for (const entry of cat.entries) {
      if (entry.id === target.id) continue;
      let score = 0;
      for (const k of entry.keywords ?? []) {
        if (targetKws.has(normalize(k))) score += 3;
      }
      if (target.related?.includes(entry.id)) score += 10;
      if (score > 0) scored.push({ entry, category: cat, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export const __test = { tokenize };
